from .tracing.setup import setup_tracing
from .tracing.session import enable_session_tracking, set_session_id
from agensight.tracing.config import configure_tracing, get_mode, set_mode, set_project_id
from .integrations import instrument_openai
from .integrations import instrument_anthropic 
from .tracing.decorators import trace, span
from . import tracing
from . import eval
import json
from .eval.setup import setup_eval

import json
import time
import requests

def init(name="default", mode="local", auto_instrument_llms=True, session=None, project_id=None):
    set_mode(mode)
    mode_to_exporter = {
        "local": "db",
        "console": "console",
        "memory": "memory",
        "db": "db",
        "prod": "prod",
        "dev": "dev"
    }
    exporter_type = mode_to_exporter.get(mode, "console")

    if mode == "prod" and not project_id:
        raise ValueError("'project_id' is required when using prod mode")

    configure_tracing(mode=mode, project_id=project_id)

    setup_tracing(service_name=name, exporter_type=exporter_type)
    setup_eval(exporter_type=exporter_type)

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

        if get_mode() in ["prod", "dev"]:
            try:
                requests.post(
                    "https://1vrnlwnych.execute-api.ap-south-1.amazonaws.com/prod/api/v1/logs/create/session",
                    # "https://vqes5twkl5.execute-api.ap-south-1.amazonaws.com/dev/api/v1/logs/create/session",
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {project_id}" },
                    data=json.dumps({
                        "data": {
                            "id": session_id,
                            "project_id": project_id,
                            "started_at": time.time(),
                            "session_name": session_name,
                            "user_id": user_id,
                            "metadata": json.dumps({}),
                            "mode": get_mode()
                        }
                    }),
                    timeout=2
                )
            except Exception:
                pass
        else:
            try:
                from agensight.tracing.db import get_db
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