import functools
import json
import time
import uuid
import contextvars
from typing import Callable, Optional, Dict, Any, List, Union
from agensight.tracing.session import enable_session_tracking, set_session_id

from opentelemetry import trace as ot_trace
from opentelemetry.trace.status import Status, StatusCode

from agensight.tracing import get_tracer
from agensight.tracing.session import is_session_enabled, get_session_id
from agensight.tracing.context import trace_input, trace_output
from agensight.tracing.db import get_db
from agensight.eval.metrics.base import BaseMetric
import time, json
# Global contextvars
current_trace_id = contextvars.ContextVar("current_trace_id", default=None)
current_trace_name = contextvars.ContextVar("current_trace_name", default=None)


def trace(name: Optional[str] = None, session: Optional[Union[str, dict]] = None, **default_attributes):
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            trace_name = name or func.__name__
            trace_id = str(uuid.uuid4())

            if isinstance(session, dict):
                session_id = session.get("id")
                session_name = session.get("name")
                user_id = session.get("user_id")
            else:
                session_id = session
                session_name = None
                user_id = None

            if session_id:
                enable_session_tracking()
                set_session_id(session_id)
                try:
                    conn = get_db()
                    conn.execute(
                        "INSERT OR IGNORE INTO sessions (id, started_at, session_name, user_id, metadata) VALUES (?, ?, ?, ?, ?)",
                        (session_id, time.time(), session_name, user_id, json.dumps({}))
                    )
                    conn.commit()
                except Exception:
                    pass

            current_trace_id.set(trace_id)
            current_trace_name.set(trace_name)

            started_at = time.time()
            result = func(*args, **kwargs)
            ended_at = time.time()

            try:
                conn = get_db()
                metadata = json.dumps(default_attributes or {})
                session_id = get_session_id() if is_session_enabled() else None
                conn.execute(
                    "INSERT OR IGNORE INTO traces (id, name, started_at, ended_at, session_id, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                    (trace_id, trace_name, started_at, ended_at, session_id, metadata)
                )
                conn.commit()
            except Exception:
                pass

            trace_input.set(None)
            trace_output.set(None)
            return result
        return wrapper
    return decorator


def _extract_usage_from_result(result: Any) -> Optional[Dict[str, int]]:
    if result is None:
        return None
    if isinstance(result, dict) and isinstance(result.get("usage"), dict):
        return result["usage"]

    usage = getattr(result, "usage", None)
    if usage:
        if hasattr(usage, "to_dict"):
            return usage.to_dict()
        if isinstance(usage, dict):
            return usage
        return {
            "total_tokens": getattr(usage, "total_tokens", None),
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
        }
    return None


def normalize_input_output(
    explicit_input: Optional[Any],
    explicit_output: Optional[Any],
    fallback_input: Optional[Any],
    fallback_output: Optional[Any],
    extra_attributes: Optional[Dict[str, Any]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    result = {"prompts": [], "completions": []}
    extra = extra_attributes or {}

    def _safe_stringify(value):
        try:
            if hasattr(value, "content") and isinstance(value.content, str):
                return value.content
            if isinstance(value, (list, tuple)):
                for item in value:
                    val = _safe_stringify(item)
                    if val:
                        return val
                return str(value)
            if isinstance(value, dict) and "content" in value:
                return value["content"]
            if "<" in str(type(value)) and "object at" in str(value):
                return ""
            return str(value)
        except Exception:
            return str(value)

    if explicit_input is not None:
        result["prompts"].append({"role": "user", "content": _safe_stringify(explicit_input)})
    elif fallback_input:
        result["prompts"].append({"role": "user", "content": _safe_stringify(fallback_input)})

    if explicit_output is not None or fallback_output is not None:
        content = explicit_output or fallback_output
        result["completions"].append({
            "role": "assistant",
            "content": _safe_stringify(content),
            "finish_reason": extra.get("gen_ai.completion.0.finish_reason"),
            "completion_tokens": extra.get("gen_ai.usage.completion_tokens"),
            "prompt_tokens": extra.get("gen_ai.usage.prompt_tokens"),
            "total_tokens": extra.get("llm.usage.total_tokens"),
        })

    return result




def span(
    name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    input: Optional[Any] = None,
    output: Optional[Any] = None,
    metrics: Optional[List[BaseMetric]] = None,
):
    tracer = ot_trace.get_tracer("default")
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            span_name = name or func.__name__
            attributes = metadata.copy() if metadata else {}

            trace_id = current_trace_id.get()
            trace_name = current_trace_name.get()
            if trace_id:
                attributes["trace_id"] = trace_id
            if trace_name:
                attributes["trace.name"] = trace_name
            if is_session_enabled():
                attributes["session.id"] = get_session_id()
            
            # add metrics configs to attributes
            if metrics:
                metric_configs = {}
                for i, metric in enumerate(metrics):
                    metric_name = getattr(metric, "name", f"metric_{i}")
                    config = {
                        "type": metric.__class__.__name__,
                        "name": metric_name,
                    }
                    
                    # Add specific GEvalEvaluator attributes
                    if hasattr(metric, "criteria"):
                        config["criteria"] = metric.criteria
                    if hasattr(metric, "model"):
                        config["model"] = metric.model.get_model_name()
                    if hasattr(metric, "threshold"):
                        config["threshold"] = metric.threshold
                    if hasattr(metric, "strict_mode"):
                        config["strict_mode"] = metric.strict_mode
                    if hasattr(metric, "verbose_mode"):
                        config["verbose_mode"] = metric.verbose_mode
                    
                    # Skip complex objects that might not serialize well
                    # But add their presence as metadata
                    if hasattr(metric, "evaluation_params"):
                        config["has_evaluation_params"] = True
                    if hasattr(metric, "evaluation_steps"):
                        config["has_evaluation_steps"] = True
                        
                    metric_configs[metric_name] = config
                    
                attributes["metrics.configs"] = json.dumps(metric_configs)

            
            # start span
            with tracer.start_as_current_span(span_name, attributes=attributes) as span_obj:

                fallback_input = args or kwargs
                try:
                    result = func(*args, **kwargs)
                    if trace_input.get() is None:
                        trace_input.set(input or fallback_input)
                    trace_output.set(output or result)
                except Exception as e:
                    span_obj.set_status(Status(StatusCode.ERROR, str(e)))
                    io_data = normalize_input_output(input, output, fallback_input, None, span_obj.attributes)
                    span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))
                    raise

                usage = _extract_usage_from_result(result)
                if usage:
                    span_obj.set_attribute("llm.usage.total_tokens", usage.get("total_tokens"))
                    span_obj.set_attribute("gen_ai.usage.prompt_tokens", usage.get("prompt_tokens"))
                    span_obj.set_attribute("gen_ai.usage.completion_tokens", usage.get("completion_tokens"))

                io_data = normalize_input_output(input, output, fallback_input, result, span_obj.attributes)
                span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))



                return result
        return wrapper
    return decorator