import sqlite3
import uuid
import json
import datetime
from pathlib import Path

DB_FILE = Path(__file__).parent / "eval.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_evals_schema():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript('''                         
        CREATE TABLE IF NOT EXISTS evaluations(
            id TEXT PRIMARY KEY,
            parentId TEXT,
            parentType TEXT,
            projectId TEXT,
            metricName TEXT,
            score REAL,
            reason TEXT,
            version TEXT,
            humanFeedback TEXT,
            humanFeedbackReason TEXT,
            source TEXT,
            model TEXT,
            modelVersion TEXT,
            type TEXT,
            tags TEXT,
            meta TEXT DEFAULT '{}',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            isMetricAnnotation INTEGER
        );                          
    ''')
    conn.commit()
    conn.close()