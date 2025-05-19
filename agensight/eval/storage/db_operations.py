import sqlite3
import uuid
from typing import Dict, List, Optional, Any
from pathlib import Path
from .db import get_db
import json


def insert_evaluation(
    metric_name: str,
    score: float,
    reason: str,
    parent_id: Optional[str] = None,
    parent_type: Optional[str] = None,
    project_id: Optional[str] = None,
    version: Optional[str] = None,
    human_feedback: Optional[str] = None,
    human_feedback_reason: Optional[str] = None,
    source: Optional[str] = None,
    model: Optional[str] = None,
    model_version: Optional[str] = None,
    eval_type: Optional[str] = None,
    tags: Optional[List[str]] = None,
    meta: Optional[Dict[str, Any]] = None,
    is_metric_annotation: bool = False
) -> str:
    """
    Insert evaluation data into the database.
    
    Returns:
        str: The ID of the inserted evaluation
    """
    conn = get_db()
    cursor = conn.cursor()
    eval_id = str(uuid.uuid4())
    
    # Convert tags list to string representation if provided
    tags_str = "{" + ",".join(f'"{tag}"' for tag in tags) + "}" if tags else None
    
    # Convert meta dict to JSON string if provided
    meta_json = json.dumps(meta) if meta else "{}"
    
    cursor.execute('''
    INSERT INTO evaluations (
        id, parentId, parentType, projectId, metricName, score, reason,
        version, humanFeedback, humanFeedbackReason, source, model,
        modelVersion, type, tags, meta, isMetricAnnotation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        eval_id, parent_id, parent_type, project_id, metric_name, score, reason,
        version, human_feedback, human_feedback_reason, source, model,
        model_version, eval_type, tags_str, meta_json, is_metric_annotation
    ))
    
    conn.commit()
    conn.close()
    
    return eval_id

def get_evaluation_by_id(eval_id: str) -> Optional[Dict[str, Any]]:
    """
    Get evaluation data by ID.
    
    Returns:
        Optional[Dict[str, Any]]: The evaluation data as a dictionary, or None if not found
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM evaluations WHERE id = ?', (eval_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return dict(row)
    return None

def update_evaluation(
    eval_id: str,
    **kwargs
) -> bool:
    """
    Update an existing evaluation.
    
    Returns:
        bool: True if the update was successful, False otherwise
    """
    if not kwargs:
        return False
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Build SET clause for SQL update
    set_clause = ', '.join(f'{k} = ?' for k in kwargs.keys())
    values = list(kwargs.values())
    values.append(eval_id)
    
    # Update the record
    cursor.execute(f'''
    UPDATE evaluations
    SET {set_clause}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
    ''', values)
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def delete_evaluation(eval_id: str) -> bool:
    """
    Delete an evaluation by ID.
    
    Returns:
        bool: True if the deletion was successful, False otherwise
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM evaluations WHERE id = ?', (eval_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def get_evaluations(
    project_id: Optional[str] = None,
    parent_id: Optional[str] = None,
    metric_name: Optional[str] = None,
    limit: int = 100, 
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get evaluations with optional filtering.
    
    Returns:
        List[Dict[str, Any]]: List of evaluations as dictionaries
    """
    conn = get_db()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM evaluations WHERE 1=1'
    params = []
    
    if project_id:
        query += ' AND projectId = ?'
        params.append(project_id)
    
    if parent_id:
        query += ' AND parentId = ?'
        params.append(parent_id)
    
    if metric_name:
        query += ' AND metricName = ?'
        params.append(metric_name)
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    conn.close()
    
    return [dict(row) for row in rows]