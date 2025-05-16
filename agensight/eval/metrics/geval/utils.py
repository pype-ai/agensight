import re
from typing import List, Dict, Any, Optional, Tuple, Union
from ..test_case import ModelTestCase, ModelTestCaseParams

def validate_test_case_params(test_case: ModelTestCase, params: List[ModelTestCaseParams], metric=None):
    """Verify that the test case contains all required parameters."""
    for param in params:
        value = getattr(test_case, param.value)
        if not value and value != 0:  # Allow 0 as a valid value
            metric_name = getattr(metric, "name", "This metric") if metric else "This metric"
            raise ValueError(
                f"{metric_name} requires '{param.value}' to be set in the test case."
            )

def parse_score_and_explanation(text: str) -> Tuple[float, str]:
    """Extract numerical score and explanation from evaluation text."""
    # Extract score
    score_match = re.search(r"Score:\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    if score_match:
        score = float(score_match.group(1))
    else:
        # Fallback: try to find a numeric score anywhere in the text
        numbers = re.findall(r"(\d+(?:\.\d+)?)", text)
        score = float(numbers[0]) if numbers else 5.0  # Default to middle score if nothing found
    
    # Extract explanation
    reason_match = re.search(r"Reason:\s*(.*?)(?:$|(?=\n\n))", text, re.IGNORECASE | re.DOTALL)
    explanation = reason_match.group(1).strip() if reason_match else "No explicit explanation provided."
    
    return score, explanation

def format_list(items: List[str]) -> str:
    """Format a list of strings as a numbered list."""
    if not items:
        return ""
    return "\n".join([f"{i+1}. {item}" for i, item in enumerate(items)])

def build_evaluation_logs(metric, steps=None):
    """Create detailed logs for metric evaluation results."""
    log_entries = []
    if hasattr(metric, "name"):
        log_entries.append(f"Metric: {metric.name}")
    if hasattr(metric, "criteria") and metric.criteria:
        log_entries.append(f"Criteria: {metric.criteria}")
    if steps:
        log_entries.extend(steps)
    return "\n\n".join(log_entries) 