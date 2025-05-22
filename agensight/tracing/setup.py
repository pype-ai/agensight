import os
from agensight.tracing.exporters import get_exporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry import trace
from agensight.tracing.token_propagator import TokenPropagator

def setup_tracing(service_name="default", exporter_type=None):
    if exporter_type is None:
        exporter_type = os.getenv("TRACE_EXPORTER", "console")

    from agensight.tracing.db import init_schema
    if exporter_type == "db":
        init_schema()

    exporter = get_exporter(exporter_type)
    processor = BatchSpanProcessor(exporter)
    provider = TracerProvider()
    provider.add_span_processor(TokenPropagator())
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer(service_name)
    return tracer