from anthropic._types import NOT_GIVEN
from anthropic import Anthropic
from anthropic.resources.messages import Messages
from opentelemetry import trace
import functools

_is_patched = False
tracer = trace.get_tracer("claude")

def _wrap_create(original_create):
    @functools.wraps(original_create)
    def wrapper(self, *args, **kwargs):
        model = kwargs.get("model", "claude-3")
        messages = kwargs.get("messages", [])
        max_tokens = kwargs.get("max_tokens", None)

        with tracer.start_as_current_span("claude.chat") as span:
            span.set_attribute("gen_ai.system", "Anthropic")
            span.set_attribute("gen_ai.request.model", model)

            if messages:
                prompt = messages[0]
                span.set_attribute("gen_ai.prompt.0.role", prompt.get("role"))
                span.set_attribute("gen_ai.prompt.0.content", prompt.get("content"))

            response = original_create(self, *args, **kwargs)

            usage = getattr(response, "usage", None)
            if usage:
                total_tokens = getattr(usage, "total_tokens", None)
                prompt_tokens = getattr(usage, "input_tokens", None)
                completion_tokens = getattr(usage, "output_tokens", None)

                if total_tokens is not None:
                    span.set_attribute("llm.usage.total_tokens", total_tokens)
                if prompt_tokens is not None:
                    span.set_attribute("gen_ai.usage.prompt_tokens", prompt_tokens)
                if completion_tokens is not None:
                    span.set_attribute("gen_ai.usage.completion_tokens", completion_tokens)



            # Claude 3 structure: response.content = [ContentBlock]
            if hasattr(response, "content") and isinstance(response.content, list) and response.content:
                span.set_attribute("gen_ai.completion.0.role", "assistant")
                span.set_attribute("gen_ai.completion.0.content", response.content[0].text)

            return response

    return wrapper


def instrument_anthropic():
    global _is_patched
    if _is_patched:
        return
    try:
        Messages.create = _wrap_create(Messages.create)
        _is_patched = True
    except Exception:
        pass