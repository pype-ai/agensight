from .tracing.setup import setup_tracing
from .tracing.session import enable_session_tracking, set_session_id
from .integrations import instrument_openai
from .integrations import instrument_anthropic 
from .tracing.decorators import trace, span
from .eval.setup import setup_eval
import os

def init(name="default", mode="dev", auto_instrument_llms=False, session=None, disable_telemetry=True):
    # Set telemetry opt-out environment variable
    if disable_telemetry:
        os.environ["DEEPEVAL_TELEMETRY_OPT_OUT"] = "YES"
    
    mode_to_exporter = {
        "dev": "db",
        "console": "console",
        "memory": "memory",
        "db": "db",  # also accept direct db
    }
    exporter_type = mode_to_exporter.get(mode, "console")
    
    # Setup tracing only if not opted out
    if not disable_telemetry:
        setup_tracing(service_name=name, exporter_type=exporter_type)
    
    # Always setup eval since it doesn't involve telemetry
    setup_eval(exporter_type=exporter_type)

    if session:
        enable_session_tracking()
        set_session_id(session)
    
    if auto_instrument_llms and not disable_telemetry:
        instrument_openai()
        instrument_anthropic()