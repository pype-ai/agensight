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

def validate_token(token):
    """
    Validates the provided token by making a request to the authentication lambda.
    Returns the project ID if token is valid, otherwise raises ValueError.
    """
    try:
        response = requests.post(
            # "http://localhost:4000/dev/api/v1/auth/validate",
            "https://1vrnlwnych.execute-api.ap-south-1.amazonaws.com/prod/api/v1/auth/validate",
            # "https://vqes5twkl5.execute-api.ap-south-1.amazonaws.com/dev/api/v1/auth/validate",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"token": token}),
            timeout=5
        )

        print(response.status_code);
        
        if response.status_code == 200:
            data = response.json()
            print(data);
            if "project_id" in data:
                return data["project_id"]
            raise ValueError("Invalid response format - missing project_id")
        else:
            raise ValueError(f"Token validation failed: {response.text}")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to validate token: {str(e)}")

def init(name="default", mode="local", auto_instrument_llms=True, session=None, token=None):
    if mode in ["prod", "dev"]:
        if token:
            try:
                project_id = validate_token(token)
            except ValueError as e:
                raise ValueError(f"Token validation failed: {str(e)}")
        else:
            raise ValueError("token is required when using prod/dev mode")

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
                    # "http://localhost:4000/dev/api/v1/logs/create/session",
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