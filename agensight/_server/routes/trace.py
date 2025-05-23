from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from flask import Blueprint, jsonify, request

from agensight.tracing.db import get_db
from agensight.tracing.utils import transform_trace_to_agent_view
import sqlite3

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


@trace_router.get("/span/{span_id}/details")
def get_span_details(span_id: str):
    try:
        conn = get_db()
        prompts = conn.execute("SELECT * FROM prompts WHERE span_id = ? ORDER BY message_index", (span_id,)).fetchall()
        completions = conn.execute("SELECT * FROM completions WHERE span_id = ?", (span_id,)).fetchall()
        tools = conn.execute("SELECT * FROM tools WHERE span_id = ?", (span_id,)).fetchall()

        return {
            "prompts": [dict(p) for p in prompts],
            "completions": [dict(c) for c in completions],
            "tools": [dict(t) for t in tools]
        }
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@trace_router.get("/traces/{trace_id}/spans")
def get_structured_trace(trace_id: str):
    try:
        conn = get_db()
        spans = conn.execute("SELECT * FROM spans WHERE trace_id = ? ORDER BY started_at", (trace_id,)).fetchall()
        spans = [dict(s) for s in spans]

        span_details_by_id = {}
        for span in spans:
            span_id = span["id"]
            prompts = conn.execute("SELECT * FROM prompts WHERE span_id = ?", (span_id,)).fetchall()
            completions = conn.execute("SELECT * FROM completions WHERE span_id = ?", (span_id,)).fetchall()
            tools = conn.execute("SELECT * FROM tools WHERE span_id = ?", (span_id,)).fetchall()

            span_details_by_id[span_id] = {
                "prompts": [dict(p) for p in prompts],
                "completions": [dict(c) for c in completions],
                "tools": [dict(t) for t in tools],
            }

        structured = transform_trace_to_agent_view(spans, span_details_by_id)
        return JSONResponse(content=structured)
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
