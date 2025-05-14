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

def get_exporter(exporter_type: str):
    """
    Return the appropriate exporter instance based on the configured type.
    """
    global _memory_exporter_instance

    if exporter_type == "console":
        return ConsoleSpanExporter()
    
    elif exporter_type == "memory":
        _memory_exporter_instance = SpanCollector()
        return _memory_exporter_instance
    
    elif exporter_type == "db":
        return DBSpanExporter()
    
    else:
        raise ValueError(f"Unsupported exporter: {exporter_type}")

def get_collected_spans():
    """
    Return all spans collected by the memory exporter, if in use.
    """
    return _memory_exporter_instance.spans if _memory_exporter_instance else []
