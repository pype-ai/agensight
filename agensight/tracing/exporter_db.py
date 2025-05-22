import json
import re
import uuid
from collections import defaultdict
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from agensight.tracing.db import get_db
from agensight.tracing.utils import parse_normalized_io_for_span
from agensight.eval.metrics.geval.evaluate_gval import evaluate_with_gval

TOKEN_PATTERNS = [
    r'"total_tokens":\s*(\d+)',
    r'"completion_tokens":\s*(\d+)',
    r'"prompt_tokens":\s*(\d+)',
    r"'total_tokens':\s*(\d+)",
    r"'completion_tokens':\s*(\d+)",
    r"'prompt_tokens':\s*(\d+)"
]

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

    return json.dumps({"prompts": prompts, "completions": completions})

class DBSpanExporter(SpanExporter):
    def export(self, spans):            
        conn = get_db()
        total_tokens_by_trace = defaultdict(int)
        span_map = {format(span.get_span_context().span_id, "016x"): span for span in spans}


        for span in spans: 
            ctx = span.get_span_context()
            attrs = dict(span.attributes)
            trace_id = attrs.get("trace_id") or str(uuid.uuid4())
            span_id = str(uuid.uuid4())
            parent_id = str(uuid.uuid4()) if span.parent else None 
            start = span.start_time / 1e9
            end = span.end_time / 1e9
            duration = end - start


            is_llm = any(k in str(attrs) or k in span.name.lower() for k in ["llm", "openai", "gen_ai", "completion"])
            if "gen_ai.normalized_input_output" not in attrs and is_llm:
                attrs["gen_ai.normalized_input_output"] = _make_io_from_openai_attrs(attrs, span_id, span.name)

            try:
                if parent_id is None:
                    conn.execute(
                        "INSERT OR IGNORE INTO traces (id, name, started_at, ended_at, session_id, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                        (trace_id, attrs.get("trace.name", span.name), start, end, attrs.get("session.id"), json.dumps({}))
                    )

                conn.execute(
                    "INSERT INTO spans (id, trace_id, parent_id, name, started_at, ended_at, duration, kind, status, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        span_id, trace_id, parent_id, span.name, start, end, duration,
                        str(span.kind), str(span.status.status_code), json.dumps(attrs)
                    )
                )
            except Exception:
                continue

            try:
                nio = attrs.get("gen_ai.normalized_input_output")
                if nio:
                    prompts, completions = parse_normalized_io_for_span(span_id, nio)
                    for p in prompts:
                        conn.execute("INSERT INTO prompts (span_id, role, content, message_index) VALUES (?, ?, ?, ?)",
                                     (p["span_id"], p["role"], p["content"], p["message_index"]))
                    for c in completions:
                        conn.execute("INSERT INTO completions (span_id, role, content, finish_reason, total_tokens, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                     (
                                         c["span_id"], c["role"], c["content"], c["finish_reason"],
                                         c["total_tokens"], c["prompt_tokens"], c["completion_tokens"]
                                     ))
                        if c["total_tokens"]:
                            total_tokens_by_trace[trace_id] += int(c["total_tokens"])
            except Exception:
                pass


            try:

                # Use the metrics configuration from the span
                metrics_configs_str = attrs.get("metrics.configs")

                if metrics_configs_str and "gen_ai.normalized_input_output" in attrs:
                    # Parse metrics configuration
                    metrics_configs = json.loads(metrics_configs_str)
                    
                    # Extract input and output from normalized IO
                    nio_data = json.loads(attrs.get("gen_ai.normalized_input_output"))
                    input_text = nio_data.get("prompts", [{}])[0].get("content", "")
                    output_text = nio_data.get("completions", [{}])[0].get("content", "")
                    
                    if input_text and output_text:
                        
                        # Evaluate based on each metric in the config
                        for metric_name, config in metrics_configs.items():
                            # Extract parameters from the config
                            criteria = config.get("criteria")
                            model = config.get("model", "gpt-4o-mini")
                            threshold = config.get("threshold", 0.5)
                            strict_mode = config.get("strict_mode", False)
                            verbose_mode = config.get("verbose_mode", False)
                            
                            if criteria:
                                # Call evaluate_with_gval with parameters from the config
                                evaluate_with_gval(
                                    input_text=input_text,
                                    output_text=output_text,
                                    name=metric_name,
                                    criteria=criteria,
                                    parent_id=span_id,
                                    parent_type="span",
                                    model=model,
                                    threshold=threshold,
                                    strict_mode=strict_mode,
                                    verbose_mode=verbose_mode,
                                    save_to_db=True,
                                    source="automatic",
                                    meta={"trace_id": trace_id, "span_name": span.name}
                                )

            except Exception as e:
                print(f"Error in direct evaluation using configs for span {span_id}: {e}")
                pass

            try:
                has_tool_calls = False
                for i in range(5):
                    name = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                    if not name:
                        break
                    has_tool_calls = True
                    args = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                    cursor = conn.execute("SELECT id FROM tools WHERE span_id = ? AND name = ?", (span_id, name))
                    existing = cursor.fetchone()
                    if not existing:
                        conn.execute("INSERT INTO tools (span_id, name, arguments) VALUES (?, ?, ?)",
                                     (span_id, name, args))

                if has_tool_calls and parent_id and parent_id in span_map:
                    parent_span = span_map[parent_id]
                    if "llm" in parent_span.name.lower() or "completion" in parent_span.name.lower():
                        for i in range(5):
                            name = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                            if not name:
                                break
                            args = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                            cursor = conn.execute("SELECT id FROM tools WHERE span_id = ? AND name = ?", (parent_id, name))
                            existing = cursor.fetchone()
                            if not existing:
                                conn.execute("INSERT INTO tools (span_id, name, arguments) VALUES (?, ?, ?)",
                                             (parent_id, name, args))
            except Exception:
                pass

        for span in spans:
            ctx = span.get_span_context()
            attrs = dict(span.attributes)
            span_id = format(ctx.span_id, "016x")
            trace_id = attrs.get("trace_id") or format(ctx.trace_id, "032x")

            if "openai.chat" in span.name.lower() and span.parent:
                parent_id = format(span.parent.span_id, "016x")
                cursor = conn.execute("SELECT name, arguments FROM tools WHERE span_id = ?", (span_id,))
                tools = cursor.fetchall()
                for name, args in tools:
                    cursor = conn.execute("SELECT id FROM tools WHERE span_id = ? AND name = ?", (parent_id, name))
                    if not cursor.fetchone():
                        conn.execute("INSERT INTO tools (span_id, name, arguments) VALUES (?, ?, ?)",
                                     (parent_id, name, args))

        try:
            for trace_id, total in total_tokens_by_trace.items():
                conn.execute("UPDATE traces SET total_tokens=? WHERE id=?", (total, trace_id))
            conn.commit()
        except Exception:
            pass

        return SpanExportResult.SUCCESS
