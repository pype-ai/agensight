import os

config = {
    "exporter": os.getenv("TRACE_EXPORTER", "console"),
    "session_tracking": os.getenv("TRACE_SESSION_ENABLED", "false").lower() == "true",
    "mode": "dev",
    "project_id": None
}

def configure_tracing(**kwargs):
    config.update(kwargs)

def get_mode():
    return config.get("mode", "dev")

def set_mode(value):
    config["mode"] = value

def get_project_id():
    return config.get("project_id")

def set_project_id(value):
    config["project_id"] = value
