import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from agensight.eval.metrics import GEvalEvaluator
from agensight.eval.test_case import ModelTestCase

correctness_metric = GEvalEvaluator(
    name="Code Correctness",
    criteria="Evaluate whether the generated code correctly implements the specified requirements and follows best practices.",
    evaluation_steps=[
        "Verify that the code implements all required functionality without errors",
        "Check if the code follows language-specific best practices and conventions",
        "Ensure proper error handling and input validation is implemented",
        "Verify that the code is well-documented with clear comments"
    ],
)


# Define a test case
test_case = ModelTestCase(
    input="def add(a, b): return a + b",
    actual_output="Correctly implements addition function",
)

# Evaluate the test case
result = correctness_metric.measure(test_case=test_case)

# Print the evaluation result
print(result)