from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, List, Optional, Any, Union
import json
import sqlite3

from agensight.eval.storage.db import get_db
from agensight.eval.storage.db_operations import get_evaluations, get_evaluation_by_id

metrics_router = APIRouter(tags=["metrics"])

@metrics_router.get("/metrics")
def list_metrics(
    parent_id: Optional[str] = None,
    parent_type: Optional[str] = None,
    metric_name: Optional[str] = None,
    source: Optional[str] = None,
    project_id: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
):
    """
    Fetch metrics/evaluations with optional filtering.
    
    Parameters:
    - parent_id: Filter by parent ID (e.g., span ID)
    - parent_type: Filter by parent type (e.g., span, trace)
    - metric_name: Filter by metric name
    - source: Filter by source (e.g., automatic, manual)
    - project_id: Filter by project ID
    - limit: Maximum number of results to return (default: 100)
    - offset: Number of results to skip (default: 0)
    
    Returns:
    - List of evaluation objects
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # First check if evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        table_exists = cursor.fetchone()
        if not table_exists:
            return {"metrics": [], "total": 0}
            
        # Build query conditionally
        query = 'SELECT * FROM evaluations WHERE 1=1'
        count_query = 'SELECT COUNT(*) FROM evaluations WHERE 1=1'
        
        # Handle each filter separately
        if parent_id:
            query += f" AND parentId = '{parent_id}'"
            count_query += f" AND parentId = '{parent_id}'"
        
        if parent_type:
            query += f" AND parentType = '{parent_type}'"
            count_query += f" AND parentType = '{parent_type}'"
        
        if metric_name:
            query += f" AND metricName = '{metric_name}'"
            count_query += f" AND metricName = '{metric_name}'"
        
        if source:
            query += f" AND source = '{source}'"
            count_query += f" AND source = '{source}'"
        
        if project_id:
            query += f" AND projectId = '{project_id}'"
            count_query += f" AND projectId = '{project_id}'"
                
        # Get total count
        cursor.execute(count_query)
        total = cursor.fetchone()[0]
        
        # Add sorting and pagination
        query += f" ORDER BY createdAt DESC LIMIT {limit} OFFSET {offset}"
        
        # Execute main query
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        metrics = []
        for row in rows:
            metric = dict(row)
            # Parse any JSON fields if needed
            if 'meta' in metric and isinstance(metric['meta'], str):
                try:
                    metric['meta'] = json.loads(metric['meta'])
                except:
                    pass
            metrics.append(metric)
        
        return {
            "metrics": metrics,
            "total": total
        }
        
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@metrics_router.get("/metrics/{metric_id}")
def get_metric(metric_id: str = Path(..., description="The ID of the metric to retrieve")):
    """
    Fetch a specific metric/evaluation by ID.
    
    Parameters:
    - metric_id: The ID of the metric to retrieve
    
    Returns:
    - Evaluation object
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # First check if evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Evaluations table not found")
        
        # Use direct string formatting for simple queries
        cursor.execute(f"SELECT * FROM evaluations WHERE id = '{metric_id}'")
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Metric with ID {metric_id} not found")
        
        result = dict(row)
        
        # Parse JSON fields
        if result.get('meta'):
            try:
                result['meta'] = json.loads(result['meta'])
            except json.JSONDecodeError:
                result['meta'] = {}
        
        # Parse tags if they exist
        if result.get('tags'):
            try:
                # Remove curly braces and quotes
                tags_str = result['tags'].strip('{}')
                if tags_str:
                    # Split by comma and remove quotes
                    result['tags'] = [tag.strip('"\'') for tag in tags_str.split(',')]
                else:
                    result['tags'] = []
            except:
                result['tags'] = []
        else:
            result['tags'] = []
            
        return result
        
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@metrics_router.get("/span/{span_id}/metrics")
def get_span_metrics(
    span_id: str = Path(..., description="The span ID to get metrics for"),
    metric_name: Optional[str] = None
):
    """
    Fetch all metrics for a specific span.
    
    Parameters:
    - span_id: The span ID to get metrics for
    - metric_name: Optional filter by metric name
    
    Returns:
    - List of evaluation objects for the span
    """
    try:
        print(f"Fetching metrics for span ID: {span_id}")
        # Directly call list_metrics with the parameters
        result = list_metrics(
            parent_id=span_id,
            parent_type="span",
            metric_name=metric_name
        )
        
        # Ensure we return an object with metrics array and total count
        if isinstance(result, dict) and "metrics" in result:
            return result
        elif isinstance(result, list):
            return {"metrics": result, "total": len(result)}
        else:
            return {"metrics": [], "total": 0}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@metrics_router.get("/metrics/summary")
def get_metrics_summary(
    metric_name: Optional[str] = None,
    source: Optional[str] = None,
    project_id: Optional[str] = None,
    parent_type: Optional[str] = None
):
    """
    Get a summary of metrics including average scores.
    
    Parameters:
    - metric_name: Filter by metric name
    - source: Filter by source
    - project_id: Filter by project ID
    - parent_type: Filter by parent type
    
    Returns:
    - Summary of metrics with average scores
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # First check if evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        if not cursor.fetchone():
            return []  # Return empty list if table doesn't exist
        
        query = '''
            SELECT 
                metricName, 
                COUNT(*) as count, 
                AVG(score) as average_score,
                MIN(score) as min_score,
                MAX(score) as max_score
            FROM evaluations 
            WHERE 1=1
        '''
        
        # Handle each filter separately with string formatting
        if metric_name:
            query += f" AND metricName = '{metric_name}'"
        
        if source:
            query += f" AND source = '{source}'"
        
        if project_id:
            query += f" AND projectId = '{project_id}'"
            
        if parent_type:
            query += f" AND parentType = '{parent_type}'"
        
        query += ' GROUP BY metricName ORDER BY metricName'
        
        # Execute without parameters
        cursor.execute(query)
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]
        
    except sqlite3.DatabaseError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
