import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).parent / "traces.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_schema():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript('''
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at REAL,
        metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        name TEXT,
        started_at REAL,
        ended_at REAL,
        metadata TEXT,
        total_tokens INTEGER
    );

    CREATE TABLE IF NOT EXISTS spans (
        id TEXT PRIMARY KEY,
        trace_id TEXT,
        parent_id TEXT,
        name TEXT,
        started_at REAL,
        ended_at REAL,
        duration REAL,
        kind TEXT,
        status TEXT,
        attributes TEXT
    );

    CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        span_id TEXT,
        role TEXT,
        content TEXT,
        message_index INTEGER,
        FOREIGN KEY(span_id) REFERENCES spans(id)
    );

    CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        span_id TEXT,
        role TEXT,
        content TEXT,
        finish_reason TEXT,
        total_tokens INTEGER,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        FOREIGN KEY(span_id) REFERENCES spans(id)
    );

    CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        span_id TEXT,
        name TEXT,
        arguments TEXT,
        FOREIGN KEY(span_id) REFERENCES spans(id)
    );
    ''')
    conn.commit()
    conn.close()