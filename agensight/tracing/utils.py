import json
import re
from typing import List, Dict, Any
from agensight.eval.test_case import ModelTestCase

TOKEN_PATTERNS = [
    r'"total_tokens":\s*(\d+)',
    r'"completion_tokens":\s*(\d+)',
    r'"prompt_tokens":\s*(\d+)',
    r"'total_tokens':\s*(\d+)",
    r"'completion_tokens':\s*(\d+)",
    r"'prompt_tokens':\s*(\d+)"
]

def transform_trace_to_agent_view(spans, span_details_by_id):
    agents = []
    span_map = {s["id"]: s for s in spans}

    trace_input = None
    trace_output = None

    spans_with_tools = []
    for span_id, details in span_details_by_id.items():
        if 'tools' in details and details['tools']:
            spans_with_tools.append(span_id)

    for s in spans:
        details = span_details_by_id.get(s["id"], {})
        last_user_message = None
        for p in details.get("prompts", []):
            if p["role"] == "user":
                last_user_message = p["content"]
        if last_user_message:
            trace_input = last_user_message
            break

    for s in reversed(spans):
        details = span_details_by_id.get(s["id"], {})
        for c in details.get("completions", []):
            if c["role"] == "assistant":
                trace_output = c["content"]
                break
        if trace_output:
            break

    for span in spans:
        if span["kind"] != "SpanKind.INTERNAL":
            continue

        attributes = json.loads(span["attributes"])
        children = [s for s in spans if s["parent_id"] == span["id"]]
        has_llm_child = any("openai.chat" in c["name"] for c in children)
        has_io = "gen_ai.normalized_input_output" in attributes
        has_tools = span["id"] in span_details_by_id and span_details_by_id[span["id"]].get("tools", [])

        if not (has_llm_child or has_io or has_tools):
            continue

        agent_name = attributes.get("agent.name") or span["name"] or f"Agent {len(agents) + 1}"
        tools_called = []

        if span["id"] in span_details_by_id and "tools" in span_details_by_id[span["id"]]:
            for tool in span_details_by_id[span["id"]]["tools"]:
                try:
                    args = json.loads(tool["arguments"]) if tool["arguments"] else {}
                except (json.JSONDecodeError, TypeError):
                    args = tool["arguments"]
                if not any(t["name"] == tool["name"] and str(t["args"]) == str(args) for t in tools_called):
                    tools_called.append({
                        "name": tool["name"],
                        "args": args,
                        "output": None,
                        "duration": 0,
                        "span_id": span["id"]
                    })

        agent = {
            "span_id": span["id"],
            "name": agent_name,
            "duration": round(span["duration"], 2),
            "start_time": round(span["started_at"], 2),
            "end_time": round(span["ended_at"], 2),
            "tools_called": tools_called.copy(),
            "final_completion": None,
            "model_used": span.get("model_used", "unknown")
        }

        if span["id"] in span_details_by_id and "completions" in span_details_by_id[span["id"]]:
            for comp in span_details_by_id[span["id"]]["completions"]:
                agent["final_completion"] = comp.get("content")
                break

        for child in children:
            child_attrs = json.loads(child["attributes"])

            for i in range(5):
                tool_name = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                args_json = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                if not tool_name:
                    break

                try:
                    args = json.loads(args_json) if args_json else None
                except Exception:
                    args = None

                if not any(t["name"] == tool_name and str(t["args"]) == str(args) for t in agent["tools_called"]):
                    tool_output = None
                    child_details = span_details_by_id.get(child["id"], {})
                    for tool in child_details.get("tools", []):
                        if tool["name"] == tool_name:
                            try:
                                tool_output = json.loads(tool.get("arguments", "{}"))
                            except Exception:
                                tool_output = tool.get("arguments")
                            break

                    agent["tools_called"].append({
                        "name": tool_name,
                        "args": args,
                        "output": tool_output,
                        "duration": round(child["duration"], 2),
                        "span_id": child["id"]
                    })

            if "completions" in span_details_by_id.get(child["id"], {}):
                for comp in span_details_by_id[child["id"]]["completions"]:
                    if agent["final_completion"] is None:
                        agent["final_completion"] = comp.get("content")

        agents.append(agent)

    return {
        "trace_input": trace_input,
        "trace_output": trace_output,
        "agents": agents
    }

def ns_to_seconds(nanoseconds: int) -> float:
    return nanoseconds / 1e9

def extract_token_counts_from_attrs(attrs, span_id, span_name):
    tokens = {
        "total": attrs.get("llm.usage.total_tokens") or attrs.get("gen_ai.usage.total_tokens"),
        "prompt": attrs.get("gen_ai.usage.prompt_tokens"),
        "completion": attrs.get("gen_ai.usage.completion_tokens")
    }

    for key, value in attrs.items():
        if isinstance(value, (int, float)) and 'token' in key.lower():
            if 'prompt' in key and tokens["prompt"] is None:
                tokens["prompt"] = value
            elif 'compl' in key and tokens["completion"] is None:
                tokens["completion"] = value
            elif 'total' in key and tokens["total"] is None:
                tokens["total"] = value

    for key, value in attrs.items():
        if isinstance(value, str):
            try:
                parsed = json.loads(value) if '{' in value or '[' in value else None
                if isinstance(parsed, dict):
                    for k, v in parsed.items():
                        if 'token' in k.lower() and isinstance(v, (int, float)):
                            if 'prompt' in k.lower() and tokens["prompt"] is None:
                                tokens["prompt"] = v
                            elif 'compl' in k.lower() and tokens["completion"] is None:
                                tokens["completion"] = v
                            elif 'total' in k.lower() and tokens["total"] is None:
                                tokens["total"] = v
            except Exception:
                pass

            for pattern in TOKEN_PATTERNS:
                match = re.search(pattern, value)
                if match:
                    val = int(match.group(1))
                    if 'prompt' in pattern and tokens["prompt"] is None:
                        tokens["prompt"] = val
                    elif 'compl' in pattern and tokens["completion"] is None:
                        tokens["completion"] = val
                    elif 'total' in pattern and tokens["total"] is None:
                        tokens["total"] = val

    if tokens["total"] is None and tokens["prompt"] is not None and tokens["completion"] is not None:
        tokens["total"] = tokens["prompt"] + tokens["completion"]
    elif tokens["prompt"] is None and tokens["total"] is not None and tokens["completion"] is not None:
        tokens["prompt"] = tokens["total"] - tokens["completion"]
    elif tokens["completion"] is None and tokens["total"] is not None and tokens["prompt"] is not None:
        tokens["completion"] = tokens["total"] - tokens["prompt"]

    return tokens

def _make_io_from_openai_attrs(attrs, span_id, span_name):
    prompts, completions = [], []
    i = 0
    while f"gen_ai.prompt.{i}.role" in attrs or f"gen_ai.prompt.{i}.content" in attrs:
        prompts.append({
            "role": attrs.get(f"gen_ai.prompt.{i}.role", "user"),
            "content": attrs.get(f"gen_ai.prompt.{i}.content", "")
        })
        i += 1

    if not prompts:
        fallback = attrs.get("gen_ai.input") or next(
            (attrs[k] for k in attrs if "prompt" in k.lower()), "[Input not found]"
        )
        prompts = [{"role": "user", "content": str(fallback)}]

    output = next(
        (attrs.get(k) for k in attrs if "completion" in k.lower() and ".content" in k),
        attrs.get("gen_ai.completion.0.content", "")
    )

    tokens = extract_token_counts_from_attrs(attrs, span_id, span_name)

    completions.append({
        "role": attrs.get("gen_ai.completion.0.role", "assistant"),
        "content": output,
        "finish_reason": attrs.get("gen_ai.completion.0.finish_reason"),
        "completion_tokens": tokens["completion"],
        "prompt_tokens": tokens["prompt"],
        "total_tokens": tokens["total"]
    })

    return json.dumps({
        "prompts": [dict(p, span_id=span_id) for p in prompts],
        "completions": [dict(c, span_id=span_id) for c in completions]
    })

def parse_normalized_io_for_span(span_id: str, attribute_json: str):
    try:
        parsed = json.loads(attribute_json)
        if not isinstance(parsed, dict):
            return [], []

        prompt_records = []
        completion_records = []

        for idx, prompt in enumerate(parsed.get("prompts", [])):
            prompt_records.append({
                "span_id": span_id,
                "role": prompt.get("role", "user"),
                "content": prompt.get("content", ""),
                "message_index": idx
            })

        for idx, completion in enumerate(parsed.get("completions", [])):
            completion_records.append({
                "span_id": span_id,
                "role": completion.get("role", "assistant"),
                "content": completion.get("content", ""),
                "message_index": idx,
                "finish_reason": completion.get("finish_reason", None),
                "completion_tokens": completion.get("completion_tokens", None),
                "prompt_tokens": completion.get("prompt_tokens", None),
                "total_tokens": completion.get("total_tokens", None)
            })

        return prompt_records, completion_records

    except json.JSONDecodeError:
        return [], []

def extract_test_case_from_io_data(io_data):
    try:
        metric_input = None
        metric_output = None

        def extract_text_from_content(content):
            if not content:
                return None
            if (content.startswith('{') and content.endswith('}')) or \
               (content.startswith("{'") and content.endswith("'}")):
                try:
                    content = content.replace("'", '"')
                    parsed = json.loads(content)
                    for field in ['input_text', 'actual_output', 'content', 'text', 'input', 'output', 'prompt', 'completion', 'joke']:
                        if field in parsed and parsed[field]:
                            return parsed[field]
                    return str(parsed)
                except:
                    pass
            return content

        if "prompts" in io_data and io_data["prompts"]:
            prompt = io_data["prompts"][0]
            if "content" in prompt:
                metric_input = extract_text_from_content(prompt["content"])

        if "completions" in io_data and io_data["completions"]:
            completion = io_data["completions"][0]
            if "content" in completion:
                metric_output = extract_text_from_content(completion["content"])

        if not metric_input and "input" in io_data:
            metric_input = extract_text_from_content(io_data["input"])
        if not metric_output and "output" in io_data:
            metric_output = extract_text_from_content(io_data["output"])

        if metric_input and metric_output:
            return ModelTestCase(input=metric_input, actual_output=metric_output)
    except Exception:
        pass

    return None

def calculate_metrics(metrics, test_case, span_obj):
    if not test_case or not metrics:
        return

    metrics_results = {}
    successful_metrics = 0
    failed_metrics = 0

    for metric in metrics:
        try:
            metric_name = getattr(metric, "name", metric.__class__.__name__)
            for param_name in ["expected_output", "context", "retrieval_context", "expected_tools", "tools_called", "criteria"]:
                if hasattr(metric, param_name):
                    param_value = getattr(metric, param_name)
                    if param_value is not None:
                        setattr(test_case, param_name, param_value)
            if hasattr(metric, 'measure'):
                metric_result = metric.measure(test_case)
            elif hasattr(metric, 'compute'):
                kwargs = {
                    'input': test_case.input,
                    'actual_output': test_case.actual_output
                }
                for param in ['expected_output', 'context', 'retrieval_context', 'expected_tools', 'tools_called', 'criteria']:
                    if hasattr(test_case, param):
                        kwargs[param] = getattr(test_case, param)
                metric_result = metric.compute(**kwargs)
            else:
                raise ValueError(f"Metric {metric_name} has no compatible interface")

            metrics_results[metric_name] = metric_result

            if isinstance(metric_result, dict):
                for key, value in metric_result.items():
                    span_obj.set_attribute(f"metric.{metric_name}.{key}", str(value))
            else:
                span_obj.set_attribute(f"metric.{metric_name}", str(metric_result))

            successful_metrics += 1

        except Exception as e:
            span_obj.set_attribute(f"metric.error.{getattr(metric, 'name', 'unknown')}", str(e))
            failed_metrics += 1

    span_obj.set_attribute("metrics.successful", successful_metrics)
    span_obj.set_attribute("metrics.failed", failed_metrics)

    if metrics_results:
        span_obj.set_attribute("metrics.results", json.dumps(metrics_results))
        span_obj.set_attribute("metrics.status", "success")
