from enum import Enum
from typing import List, Optional, Any, Dict, Union

class ModelTestCaseParams(Enum):
    INPUT = "input"
    ACTUAL_OUTPUT = "actual_output"
    EXPECTED_OUTPUT = "expected_output"
    CONTEXT = "context"
    RETRIEVAL_CONTEXT = "retrieval_context"
    EXPECTED_TOOLS = "expected_tools"
    TOOLS_CALLED = "tools_called"

class ToolExecution:
    def __init__(self, name: str, args: Dict[str, Any]):
        self.name = name
        self.args = args
    
    def __repr__(self):
        return f"ToolExecution(name={self.name}, args={self.args})"

class ModelTestCase:
    def __init__(
        self,
        input: str = "",
        actual_output: str = "",
        expected_output: str = "",
        context: List[str] = None,
        retrieval_context: List[str] = None,
        expected_tools: List[ToolExecution] = None,
        tools_called: List[ToolExecution] = None,
    ):
        self.input = input
        self.actual_output = actual_output
        self.expected_output = expected_output
        self.context = context or []
        self.retrieval_context = retrieval_context or []
        self.expected_tools = expected_tools or []
        self.tools_called = tools_called or [] 