import os

config = {
    "exporter": os.getenv("TRACE_EXPORTER", "console"),
    "session_tracking": os.getenv("TRACE_SESSION_ENABLED", "false").lower() == "true"
}

def configure_tracing(**kwargs):
    config.update(kwargs)
