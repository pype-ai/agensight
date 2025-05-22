from opentelemetry.sdk.trace.export import ConsoleSpanExporter
from .exporter_db import DBSpanExporter

# In-memory span collector for local visualizations
class SpanCollector(ConsoleSpanExporter):
    def __init__(self):
        super().__init__()
        self.spans = []

    def export(self, spans):
        self.spans.extend(spans)
        return super().export(spans)

# Used to persist memory exporter instance (for retrieval later)
_memory_exporter_instance = None

def get_exporter(exporter_type="console"):
    print(f"Creating exporter of type: {exporter_type}")
    if exporter_type == "db":
        print("Creating DBSpanExporter")
        return DBSpanExporter()
    elif exporter_type == "memory":
        print("Creating SpanCollector")
        return SpanCollector()
    else:
        print("Creating ConsoleSpanExporter")
        return ConsoleSpanExporter()

def get_collected_spans():
    """
    Return all spans collected by the memory exporter, if in use.
    """
    return _memory_exporter_instance.spans if _memory_exporter_instance else []
