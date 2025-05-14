from .tracing.setup import setup_tracing
from .tracing.session import enable_session_tracking, set_session_id
from .integrations import instrument_openai
from .integrations import instrument_anthropic 
from .tracing.decorators import trace, span


def init(name="default", mode="dev", auto_instrument_llms=True, session=None):
    mode_to_exporter = {
        "dev": "db",
        "console": "console",
        "memory": "memory",
        "db": "db",  # also accept direct db
    }
    exporter_type = mode_to_exporter.get(mode, "console")
    setup_tracing(service_name=name, exporter_type=exporter_type)

    if session:
        enable_session_tracking()
        set_session_id(session)
    
    if auto_instrument_llms:
        instrument_openai()
        instrument_anthropic()