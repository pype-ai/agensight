from opentelemetry.instrumentation.openai import OpenAIInstrumentor
from opentelemetry import trace

def wrap_openai_with_tool_extraction():
    """Monkey patch OpenAI to extract tool calls"""
    try:
        import openai
        original_chat_create = None

        if hasattr(openai, "ChatCompletion"):
            original_chat_create = openai.ChatCompletion.create

            def patched_create(*args, **kwargs):
                response = original_chat_create(*args, **kwargs)
                current_span = trace.get_current_span()

                if hasattr(response, "choices") and response.choices:
                    message = response.choices[0].message
                    if hasattr(message, "tool_calls") and message.tool_calls:
                        for i, tool_call in enumerate(message.tool_calls):
                            current_span.set_attribute(f"gen_ai.completion.0.tool_calls.{i}.name", 
                                                       tool_call.function.name)
                            current_span.set_attribute(f"gen_ai.completion.0.tool_calls.{i}.arguments", 
                                                       tool_call.function.arguments)
                return response

            openai.ChatCompletion.create = patched_create

        elif hasattr(openai, "OpenAI"):
            from openai._client import OpenAI
            original_method = OpenAI.chat.completions.create

            def patched_method(self, *args, **kwargs):
                response = original_method(self, *args, **kwargs)
                current_span = trace.get_current_span()

                if hasattr(response, "choices") and response.choices:
                    choice = response.choices[0]
                    if hasattr(choice, "message") and hasattr(choice.message, "tool_calls") and choice.message.tool_calls:
                        for i, tool_call in enumerate(choice.message.tool_calls):
                            if hasattr(tool_call, "function"):
                                current_span.set_attribute(f"gen_ai.completion.0.tool_calls.{i}.name", 
                                                           tool_call.function.name)
                                current_span.set_attribute(f"gen_ai.completion.0.tool_calls.{i}.arguments", 
                                                           tool_call.function.arguments)

                                if hasattr(choice, "finish_reason"):
                                    current_span.set_attribute("gen_ai.completion.0.finish_reason", choice.finish_reason)
                return response

            from types import MethodType
            OpenAI.chat.completions.create = MethodType(patched_method, OpenAI.chat.completions)

    except Exception as e:
        print(f"[agensight] Failed to patch OpenAI for tool extraction: {e}")

def instrument_openai():
    """
    Instruments the OpenAI client for tracing.
    Automatically adds span context to OpenAI API calls.
    """
    try:
        OpenAIInstrumentor().instrument()
        wrap_openai_with_tool_extraction()
    except Exception as e:
        print(f"[agensight] OpenAI instrumentation failed: {e}")
