from .tracing.setup import setup_tracing
from .tracing.session import enable_session_tracking, set_session_id
from .integrations import instrument_openai
from .integrations import instrument_anthropic 
from .tracing.decorators import trace, span
from . import tracing
from . import eval
import json
from .eval.setup import setup_eval

def init(name="default", mode="dev", auto_instrument_llms=True, session=None):
    mode_to_exporter = {
        "dev": "db",
        "console": "console",
        "memory": "memory",
        "db": "db",  # also accept direct db
    }
    exporter_type = mode_to_exporter.get(mode, "console")
    setup_tracing(service_name=name, exporter_type=exporter_type)
    setup_eval(exporter_type=exporter_type)

    # Normalize session input (dict or str)
    if isinstance(session, dict):
        session_id = session.get("id")
        session_name = session.get("name")
        user_id = session.get("user_id")
    else:
        session_id = session
        session_name = None 
        user_id = None

    if session_id:
        enable_session_tracking()
        set_session_id(session_id)

        try:
            from agensight.tracing.db import get_db
            import time
            conn = get_db()
            conn.execute(
                "INSERT OR IGNORE INTO sessions (id, started_at, session_name, user_id, metadata) VALUES (?, ?, ?, ?, ?)",
                (session_id, time.time(), session_name, user_id, json.dumps({}))
            )
            conn.commit()
        except Exception:
            pass

    if auto_instrument_llms:
        instrument_openai()
        instrument_anthropic()