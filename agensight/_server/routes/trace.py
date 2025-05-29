from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from flask import Blueprint, jsonify, request
from opentelemetry.trace import SpanKind

from agensight.tracing.db import get_db
from agensight.tracing.utils import transform_trace_to_agent_view
import sqlite3
import json

from ..data_source import data_source
from ..models import SpanDetails
import logging

trace_router = APIRouter(tags=["traces"])
trace_bp = Blueprint('trace', __name__)
logger = logging.getLogger(__name__)


@trace_router.get("/sessions", tags=["sessions"])
def list_sessions(
    user_id: Optional[str] = Query(None),
    session_name: Optional[str] = Query(None),
):
    try:
        conn = get_db()
        query = "SELECT * FROM sessions WHERE 1=1"
        params = []

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if session_name:
            query += " AND session_name LIKE ?"
            params.append(f"%{session_name}%")

        query += " ORDER BY started_at DESC"
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@trace_router.get("/sessions/{session_id}", tags=["sessions"])
def get_session(session_id: str):
    try:
        conn = get_db()
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        return dict(row)
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@trace_router.get("/sessions/{session_id}/traces", tags=["sessions"])
def get_traces_for_session(session_id: str):
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM traces WHERE session_id = ? ORDER BY started_at DESC", (session_id,)).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@trace_router.get("/traces")
def list_traces():
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM traces ORDER BY started_at DESC").fetchall()
        return [dict(row) for row in rows]
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


import logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s [%(name)s] %(message)s"
)

@trace_router.get("/span/{span_id}/details")
def get_span_details(span_id: str):
    try:
        conn = get_db()

        # Get the current span with rowid
        span_row = conn.execute("SELECT rowid, * FROM spans WHERE id = ?", (span_id,)).fetchone()
        if not span_row:
            raise HTTPException(status_code=404, detail="Span not found")

        span = dict(span_row)
        rowid = span["rowid"]
        span_kind = span.get("kind")

        # Fetch current span data
        prompts = conn.execute("SELECT * FROM prompts WHERE span_id = ?", (span_id,)).fetchall()
        completions = conn.execute("SELECT * FROM completions WHERE span_id = ?", (span_id,)).fetchall()
        tools = conn.execute("SELECT * FROM tools WHERE span_id = ?", (span_id,)).fetchall()

        if span_kind == str(SpanKind.INTERNAL):
            prev_span_row = conn.execute("SELECT * FROM spans WHERE rowid = ?", (rowid - 1,)).fetchone()
            if prev_span_row:
                prev_span = dict(prev_span_row)
                prev_span_id = prev_span["id"]

                prev_prompts = conn.execute("SELECT * FROM prompts WHERE span_id = ?", (prev_span_id,)).fetchall()
                prev_completions = conn.execute("SELECT * FROM completions WHERE span_id = ?", (prev_span_id,)).fetchall()
                prev_tools = conn.execute("SELECT * FROM tools WHERE span_id = ?", (prev_span_id,)).fetchall()


                if prev_prompts or prev_completions or prev_tools:
                    prompts = prev_prompts or prompts
                    completions = prev_completions or completions
                    tools = prev_tools or tools


        return {
            "prompts": [dict(p) for p in prompts],
            "completions": [dict(c) for c in completions],
            "tools": [dict(t) for t in tools]
        }

    except sqlite3.DatabaseError as e:     
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@trace_router.get("/traces/{trace_id}/spans")
def get_structured_trace(trace_id: str):
    try:
        conn = get_db()
        spans = conn.execute("SELECT rowid, * FROM spans WHERE trace_id = ? ORDER BY started_at", (trace_id,)).fetchall()
        spans = [dict(s) for s in spans]

        span_details_by_id = {}
        span_id_replacements = {}

        for idx, span in enumerate(spans):
            original_span_id = span["id"]
            rowid = span["rowid"]
            kind = span.get("kind")

            if kind == str(SpanKind.INTERNAL):
                logger.info(f"🔁 INTERNAL span → Checking previous row for span ID {original_span_id}")
                prev_span_row = conn.execute(
                    "SELECT * FROM spans WHERE rowid < ? ORDER BY rowid DESC LIMIT 1", (rowid,)
                ).fetchone()
                if prev_span_row:
                    prev_span_id = prev_span_row["id"]
                    spans[idx]["id"] = prev_span_id  # ✅ Replace early
                    logger.info(f"   ↪ Replacing span ID {original_span_id} with previous span ID {prev_span_id}")

                    # Extract model
                    try:
                        prev_attrs = json.loads(prev_span_row["attributes"])
                        model = (
                            prev_attrs.get("gen_ai.request.model") or
                            prev_attrs.get("gen_ai.anthropic.model") or
                            prev_attrs.get("gen_ai.request.model_name") or
                            "unknown"
                        )
                    except Exception:
                        model = "unknown"

                    logger.info(f"🧠 Model used for INTERNAL span {original_span_id} (from {prev_span_id}): {model}")
                    span["model_used"] = model


        for span in spans:
            effective_span_id = span_id_replacements.get(span["id"], span["id"])
            prompts = conn.execute("SELECT * FROM prompts WHERE span_id = ?", (effective_span_id,)).fetchall()
            completions = conn.execute("SELECT * FROM completions WHERE span_id = ?", (effective_span_id,)).fetchall()
            tools = conn.execute("SELECT * FROM tools WHERE span_id = ?", (effective_span_id,)).fetchall()

            span_details_by_id[span["id"]] = {
                "prompts": [dict(p) for p in prompts],
                "completions": [dict(c) for c in completions],
                "tools": [dict(t) for t in tools],
            }

        structured = transform_trace_to_agent_view(spans, span_details_by_id)
        return JSONResponse(content=structured)

    except sqlite3.DatabaseError as e:
        logger.error(f"❌ SQLite error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"❌ Unexpected error in get_structured_trace")
        raise HTTPException(status_code=500, detail=str(e))