from agensight.tracing.setup import setup_tracing
from agensight.tracing.session import enable_session_tracking
from agensight.integrations import instrument_openai
from agensight.integrations import instrument_anthropic 
from agensight.tracing.decorators import trace, span


def init(name="default", exporter_type=None, auto_instrument_llms=True):
    setup_tracing(service_name=name, exporter_type=exporter_type)
    enable_session_tracking()
    if auto_instrument_llms:
        instrument_openai()
        instrument_anthropic()
