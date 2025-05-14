"""
Pydantic models for FastAPI endpoints
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

# Trace models
class ToolCall(BaseModel):
    """Tool call model"""
    args: Dict[str, str]
    duration: int
    name: str
    output: str
    span_id: str

class Prompt(BaseModel):
    """Prompt model"""
    content: str
    id: int
    message_index: int
    role: str
    span_id: str

class Completion(BaseModel):
    """Completion model"""
    completion_tokens: int
    content: str
    finish_reason: str
    id: int
    prompt_tokens: int
    role: str
    span_id: str
    total_tokens: int

class SpanDetails(BaseModel):
    """Span details model"""
    span_id: str
    prompts: List[Dict[str, Any]]
    completions: List[Dict[str, Any]]
    tools: List[Dict[str, Any]]

class Span(BaseModel):
    duration: float
    end_time: float
    final_completion: str
    name: str
    span_id: str
    start_time: float
    tools_called: List[ToolCall]
    details: Optional[SpanDetails] = None

class Trace(BaseModel):
    id: Union[int, str]
    name: str
    session_id: str
    started_at: str
    ended_at: str
    metadata: str

class TraceResponse(BaseModel):
    trace: Trace
    trace_input: Optional[str] = None
    trace_output: Optional[str] = None
    agents: List[Span] = []

# Config models
class ConfigVersion(BaseModel):
    """Configuration version model"""
    version: str
    commit_message: str
    timestamp: str
    is_current: Optional[bool] = False

class CommitRequest(BaseModel):
    """Request model for creating a new configuration version"""
    commit_message: str
    sync_to_main: bool = False
    source_version: str

class SyncRequest(BaseModel):
    """Request model for syncing a configuration version to main"""
    version: str

class UpdateAgentRequest(BaseModel):
    """Request model for updating an agent"""
    agent: Dict[str, Any]
    config_version: Optional[str] = None

class UpdatePromptRequest(BaseModel):
    """Request model for updating a prompt"""
    prompt: Dict[str, Any]
    sync_to_main: Optional[bool] = False
    config_version: Optional[str] = None

class ApiResponse(BaseModel):
    """Standard API response model"""
    success: bool
    message: str
    version: Optional[str] = None
    synced_to_main: Optional[bool] = False 