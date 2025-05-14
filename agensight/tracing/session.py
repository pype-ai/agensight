import uuid
import contextvars
from .config import config

_session_id_var = contextvars.ContextVar("session_id", default=str(uuid.uuid4()))
_session_enabled = False

def enable_session_tracking():
    global _session_enabled
    _session_enabled = True

def is_session_enabled() -> bool:
    return _session_enabled or config.get("session_tracking", False)

def get_session_id() -> str:
    return _session_id_var.get()

def set_session_id(session_id: str):
    _session_id_var.set(session_id)
