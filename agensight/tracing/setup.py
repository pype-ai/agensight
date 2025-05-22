import os
from agensight.tracing.exporters import get_exporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry import trace
from agensight.tracing.token_propagator import TokenPropagator

def setup_tracing(service_name="default", exporter_type=None):
    if exporter_type is None:
        exporter_type = os.getenv("TRACE_EXPORTER", "console")
        print(f"Using default exporter_type: {exporter_type}")
    
    from agensight.tracing.db import init_schema
    if exporter_type == "db":
        print("Initializing database schema...")
        init_schema()
    else:
        print(f"Using {exporter_type} exporter, DB not initialized")

    print("Getting exporter...")
    exporter = get_exporter(exporter_type)
    print(f"Got exporter: {type(exporter)}")
    
    print("Setting up span processor...")
    processor = BatchSpanProcessor(exporter)
    provider = TracerProvider()
    provider.add_span_processor(TokenPropagator())   
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    print("=== Tracing setup complete ===")
    return trace.get_tracer(service_name)


