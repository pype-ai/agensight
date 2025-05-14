from opentelemetry import trace
from opentelemetry.trace import Tracer
from .session import is_session_enabled, get_session_id

def get_tracer(name: str) -> Tracer:
    return trace.get_tracer(name)

def start_span(tracer: Tracer, name: str, attributes: dict = None):
    attributes = attributes or {}
    if is_session_enabled():
        attributes.setdefault("session.id", get_session_id())
    return tracer.start_as_current_span(name, attributes=attributes)
