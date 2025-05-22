from agensight.eval.metrics import GEvalEvaluator
from agensight.eval.test_case import ModelTestCaseParams

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