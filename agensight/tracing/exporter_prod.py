import json
import requests
import uuid
from collections import defaultdict
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from agensight.tracing.utils import parse_normalized_io_for_span
from agensight.tracing.utils import _make_io_from_openai_attrs
from agensight.tracing.config import get_project_id, get_mode
from agensight.tracing.decorators import current_trace_id, current_trace_name

# BASE_URL = "https://vqes5twkl5.execute-api.ap-south-1.amazonaws.com/dev/api/v1/logs/create"
BASE_URL = "https://1vrnlwnych.execute-api.ap-south-1.amazonaws.com/prod/api/v1/logs/create"

def post_to_lambda(endpoint: str, data: dict):
    try:
        url = f"{BASE_URL}/{endpoint}"
        response = requests.post(
            url,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {get_project_id()}"},
            data=json.dumps({"data": data}),
            timeout=2
        )
        return response.status_code == 200
    except Exception as e:
        return False

class ProdSpanExporter(SpanExporter):
    project_id = get_project_id()

    def export(self, spans):
        trace_inserted = set()
        total_tokens_by_trace = defaultdict(int)
        span_map = {}

        span_parent_map = {
            format(span.get_span_context().span_id, "016x"): (
                format(span.parent.span_id, "016x") if span.parent else None
            )
            for span in spans
        }

        def get_depth(span):
            sid = format(span.get_span_context().span_id, "016x")
            depth = 0
            while sid and span_parent_map.get(sid):
                sid = span_parent_map.get(sid)
                depth += 1
            return depth

        otel_to_uuid_map = {
            format(span.get_span_context().span_id, "016x"): str(uuid.uuid4())
            for span in spans
        }

        sorted_spans = sorted(spans, key=get_depth)

        for span in sorted_spans:
            try:
                ctx = span.get_span_context()
                attrs = dict(span.attributes)
                trace_id = current_trace_id.get() or attrs.get("trace_id") or format(ctx.trace_id, "032x")

                if trace_id == "00000000000000000000000000000000":
                    trace_id = format(ctx.trace_id, "032x")

                otel_span_id = format(ctx.span_id, "016x")
                span_id = otel_to_uuid_map[otel_span_id]
                parent_id = (
                    otel_to_uuid_map.get(format(span.parent.span_id, "016x"))
                    if span.parent else None
                )
                trace_name = attrs.get("trace.name") or current_trace_name.get() or span.name

                start = span.start_time / 1e9
                end = span.end_time / 1e9
                duration = end - start

                span_map[otel_span_id] = {
                    "name": span.name,
                    "attrs": attrs,
                    "parent_id": parent_id,
                    "trace_id": trace_id
                }

                session_id = attrs.get("session.id")
                if session_id:
                    if not hasattr(self, "_session_inserted"):
                        self._session_inserted = set()
                    if session_id not in self._session_inserted:
                        post_to_lambda("session", {
                            "id": session_id,
                            "project_id": self.project_id,
                            "started_at": start,
                            "session_name": attrs.get("session.name"),
                            "user_id": attrs.get("session.user_id"),
                            "metadata": json.dumps({}),
                            "mode": get_mode()
                        })
                        self._session_inserted.add(session_id)

                if trace_id not in trace_inserted and span.parent is None:
                    try:
                        trace_success = post_to_lambda("trace", {
                            "id": trace_id,
                            "project_id": self.project_id,
                            "name": trace_name,
                            "started_at": start,
                            "ended_at": end,
                            "session_id": attrs.get("session.id"),
                            "metadata": json.dumps({}),
                            "mode": get_mode()
                        })
                        if not trace_success:
                            continue
                        trace_inserted.add(trace_id)
                    except Exception:
                        continue

                try:
                    if (
                        "gen_ai.system" in attrs and
                        span.parent and
                        trace_id not in trace_inserted
                    ):
                        parent_span_id = format(span.parent.span_id, "016x")
                        parent_trace_id = span_map.get(parent_span_id, {}).get("trace_id") or trace_id
                        trace_id = parent_trace_id
                        attrs["trace_id"] = trace_id
                        span_map[otel_span_id]["trace_id"] = trace_id

                    span_success = post_to_lambda("span", {
                        "id": span_id,
                        "project_id": self.project_id,
                        "trace_id": trace_id,
                        "parent_id": parent_id,
                        "name": span.name,
                        "started_at": start,
                        "ended_at": end,
                        "duration": duration,
                        "kind": str(span.kind),
                        "status": str(span.status.status_code),
                        "attributes": json.dumps(attrs),
                        "mode": get_mode()
                    })
                    if not span_success:
                        continue
                except Exception:
                    continue

                try:
                    is_llm = any(k in str(attrs) or k in span.name.lower() for k in ["llm", "openai", "gen_ai", "completion"])
                    if "gen_ai.normalized_input_output" not in attrs and is_llm:
                        attrs["gen_ai.normalized_input_output"] = _make_io_from_openai_attrs(attrs, span_id, span.name)

                    nio = attrs.get("gen_ai.normalized_input_output")
                    if nio:
                        prompts, completions = parse_normalized_io_for_span(span_id, nio)

                        for p in prompts:
                            try:
                                post_to_lambda("prompt", {
                                    "span_id": p["span_id"],
                                    "role": p["role"],
                                    "content": p["content"],
                                    "message_index": p["message_index"]
                                })
                            except Exception:
                                continue

                        for c in completions:
                            try:
                                post_to_lambda("completion", {
                                    "span_id": c["span_id"],
                                    "role": c["role"],
                                    "content": c["content"],
                                    "finish_reason": c["finish_reason"],
                                    "total_tokens": c["total_tokens"],
                                    "prompt_tokens": c["prompt_tokens"],
                                    "completion_tokens": c["completion_tokens"]
                                })
                                if c["total_tokens"]:
                                    total_tokens_by_trace[trace_id] += int(c["total_tokens"])
                            except Exception:
                                continue
                except Exception:
                    continue

                try:
                    for i in range(5):
                        name = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                        if not name:
                            break
                        args = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                        post_to_lambda("tool", {
                            "span_id": span_id,
                            "name": name,
                            "arguments": args
                        })
                except Exception:
                    continue

            except Exception:
                continue

        for trace_id, total in total_tokens_by_trace.items():
            try:
                post_to_lambda("trace/update", {
                    "id": trace_id,
                    "total_tokens": total
                })
            except Exception:
                continue

        return SpanExportResult.SUCCESS
