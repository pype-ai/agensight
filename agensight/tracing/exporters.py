from opentelemetry.sdk.trace.export import ConsoleSpanExporter
from .exporter_db import DBSpanExporter

class SpanCollector(ConsoleSpanExporter):
    def __init__(self):
        super().__init__()
        self.spans = []

    def export(self, spans):
        self.spans.extend(spans)
        return super().export(spans)

_memory_exporter_instance = None

def get_exporter(exporter_type: str):
    global _memory_exporter_instance

    if exporter_type == "console":
        return ConsoleSpanExporter()

    elif exporter_type == "memory":
        _memory_exporter_instance = SpanCollector()
        return _memory_exporter_instance

    elif exporter_type == "db":
        return DBSpanExporter()

    elif exporter_type == "prod":
        from .exporter_prod import ProdSpanExporter
        return ProdSpanExporter()

    else:
        print("Creating ConsoleSpanExporter")
        return ConsoleSpanExporter()

def get_collected_spans():
    return _memory_exporter_instance.spans if _memory_exporter_instance else []
