from contextvars import ContextVar

trace_input = ContextVar("trace_input", default=None)
trace_output = ContextVar("trace_output", default=None)