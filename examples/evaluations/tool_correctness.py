import sys
import os

# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from agensight.eval.test_case import ModelTestCase, ToolCall
from agensight.eval.metrics import ToolCorrectnessMetric

# Define a new test case
test_case = ModelTestCase(
    input="Analyze this Python code for potential security vulnerabilities and suggest improvements.",
    actual_output="I've analyzed the code and found several security concerns that need to be addressed.",
    tools_called=[
        ToolCall(
            name="CodeAnalyzer",
            description="Static code analysis tool for security vulnerabilities"
        ),
        ToolCall(
            name="DependencyChecker",
            description="Checks for outdated or vulnerable dependencies"
        )
    ],
    expected_tools=[
        ToolCall(
            name="SecurityLinter",
            description="Advanced security-focused code linter"
        )
    ],
)

# Initialize the metric
metric = ToolCorrectnessMetric()

# Evaluate the tool correctness
metric.measure(test_case=test_case)

print(metric.score, metric.reason)

