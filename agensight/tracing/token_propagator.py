# agentsight/tracing/token_propagator.py
"""
TokenPropagator — bubble token-usage numbers from child LLM spans
(e.g. `openai.chat`) up to their parent span so the exporter can write
complete rows for higher-level spans like `generate_joke`, `improve_joke`, …
"""

from __future__ import annotations

from typing import Dict, Tuple
from opentelemetry.sdk.trace import SpanProcessor, ReadableSpan
from opentelemetry.trace import get_current_span, Span
from opentelemetry.util.types import Attributes

_USAGE_KEYS: Tuple[str, ...] = (
    "llm.usage.total_tokens",
    "gen_ai.usage.prompt_tokens",
    "gen_ai.usage.completion_tokens",
)


class TokenPropagator(SpanProcessor):
    """
    SpanProcessor that – when a child span ends – immediately adds its
    token-usage attributes onto the parent span *if* that parent is still
    recording.

    No state has to be kept beyond the current stack of running spans, so
    there’s nothing to flush/shutdown.
    """

    # ─────────────────────────── SpanProcessor hooks ──────────────────────────

    # Accept the new 1.26+ signature      ↓
    def on_start(self, span: Span, parent_context=None):  # noqa: D401, N802
        # We don’t need to do anything on span start.
        return

    def on_end(self, span: ReadableSpan) -> None:  # noqa: D401, N802
        """
        When *any* span ends, check if it has token counters; if so, add them
        onto its (still-recording) parent span.
        """
        attrs: Attributes = span.attributes
        if "llm.usage.total_tokens" not in attrs:
            return  # Nothing to propagate.

        # The current span at this moment is the *parent* (because the child
        # just ended and popped off the context stack).
        parent = get_current_span()
        if parent is None or not parent.is_recording():
            return

        # Defensive: make sure relationship is correct
        if span.parent is None or span.parent.span_id != parent.context.span_id:
            return

        _merge_usage(parent, attrs)  # ← do the in-place update

    # Optional no-ops (SpanProcessor requires them)
    def shutdown(self) -> None:  # noqa: D401, N802
        return

    def force_flush(self, *_, **__) -> bool:  # noqa: D401, N802
        return True


# ───────────────────────────── helper function ───────────────────────────────


def _merge_usage(parent_span: Span, child_attrs: Attributes) -> None:
    """
    Add the child’s usage numbers onto the parent span’s attributes,
    *incrementing* existing totals if they’re already present.
    """
    for key in _USAGE_KEYS:
        child_val = child_attrs.get(key)
        if child_val is None:
            continue

        current_val = parent_span.attributes.get(key)
        if current_val is None:
            parent_span.set_attribute(key, int(child_val))
        else:
            parent_span.set_attribute(key, int(current_val) + int(child_val))
