from typing import List, Optional, Tuple, Union, Dict, Any
import re
import os
from openai import OpenAI

from ..base import BaseMetric
from ..test_case import ModelTestCase, ModelTestCaseParams, ToolExecution
from .template import ResponseEvalTemplate
from .utils import validate_test_case_params, parse_score_and_explanation, format_list, build_evaluation_logs

EVAL_PARAMS_MAPPING = {
    ModelTestCaseParams.INPUT: "Prompt",
    ModelTestCaseParams.ACTUAL_OUTPUT: "Response",
    ModelTestCaseParams.EXPECTED_OUTPUT: "Reference Answer",
    ModelTestCaseParams.CONTEXT: "Background Info",
    ModelTestCaseParams.RETRIEVAL_CONTEXT: "Retrieved Data",
    ModelTestCaseParams.EXPECTED_TOOLS: "Expected Tool Usage",
    ModelTestCaseParams.TOOLS_CALLED: "Actual Tool Usage",
}

def build_params_description_string(
    model_test_case_params: List[ModelTestCaseParams],
):
    param_labels = [EVAL_PARAMS_MAPPING[param] for param in model_test_case_params]

    if len(param_labels) == 1:
        formatted_str = param_labels[0]
    elif len(param_labels) == 2:
        formatted_str = " and ".join(param_labels)
    else:
        formatted_str = (
            ", ".join(param_labels[:-1]) + ", and " + param_labels[-1]
        )

    return formatted_str

class GEvalEvaluator(BaseMetric):
    def __init__(
        self,
        name: str,
        evaluation_params: Optional[List[ModelTestCaseParams]] = None,
        criteria: Optional[str] = None,
        evaluation_steps: Optional[List[str]] = None,
        model: str = "gpt-4o-mini",
        threshold: float = 0.5,
        strict_mode: bool = False,
        verbose_mode: bool = False,
    ):
        super().__init__(threshold, strict_mode, verbose_mode)
        self.name = name
        self.evaluation_params = evaluation_params or [
            ModelTestCaseParams.INPUT,
            ModelTestCaseParams.ACTUAL_OUTPUT
        ]        
        # Check if both criteria and evaluation_steps are not None at the same time
        if criteria is None and evaluation_steps is None:
            raise ValueError(
                "Either 'criteria' or 'evaluation_steps' must be provided."
            )

        # Check if criteria is provided, it cannot be an empty string
        if criteria is not None and not criteria.strip():
            raise ValueError("Criteria provided cannot be an empty string.")

        # Check if evaluation_steps is provided, it cannot be an empty list
        if evaluation_steps is not None and len(evaluation_steps) == 0:
            raise ValueError(
                "'evaluation_steps' must not be an empty list. Either omit evaluation steps or include a non-empty list of steps."
            )

        self.criteria = criteria
        self.model = model
        self.evaluation_steps = evaluation_steps or self._create_evaluation_steps()
        
    def measure(self, test_case: ModelTestCase) -> float:
        validate_test_case_params(test_case, self.evaluation_params, self)
        raw_score, explanation = self.assess(test_case)
        self.reason = explanation
        self.score = float(raw_score) / 10
        self.score = 0 if self.strict_mode and self.score < self.threshold else self.score
        self.success = self.score >= self.threshold
        
        if self.verbose_mode:
            self.verbose_logs = build_evaluation_logs(
                self,
                steps=[
                    f"Evaluation Steps:\n{format_list(self.evaluation_steps)}",
                    f"Score: {self.score}\nReason: {self.reason}",
                ],
            )
            
        return {
            "score":self.score,
            "reason":self.reason
        }
    
    def _create_evaluation_steps(self) -> List[str]:
        if not self.criteria:
            return []
            
        # Default to some standard evaluation steps based on criteria
        return [
            f"Review the criteria: {self.criteria}",
            "Examine all provided information in the test case",
            "Evaluate how well the response fulfills the criteria",
            "Assign a numerical rating from 0-10",
            "Provide a concise explanation for your rating"
        ]
    
    def assess(self, test_case: ModelTestCase) -> Tuple[Union[int, float], str]:
        """Generate an evaluation score using LLM"""
        openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Construct the test case string with only the relevant parameters
        test_case_str = self.format_test_case(test_case)
        
        # Construct the evaluation parameters string
        params_description = build_params_description_string(self.evaluation_params)
        
        # Generate the prompt using the template
        prompt = ResponseEvalTemplate.get_template(
            self.criteria, params_description, self.evaluation_steps
        )
        
        # Call the LLM to assess
        response = openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": test_case_str}
            ],
            temperature=0,
        )
        
        response_text = response.choices[0].message.content
        
        # Extract score and reason
        score, reason = parse_score_and_explanation(response_text)
        
        return score, reason
    
    def format_test_case(self, test_case: ModelTestCase) -> str:
        text = """"""
        for param in self.evaluation_params:
            value = getattr(test_case, param.value)
            if isinstance(value, ToolExecution):
                value = repr(value)
            elif isinstance(value, list):
                if all(isinstance(item, ToolExecution) for item in value):
                    value = "\n".join([repr(item) for item in value])
                else:
                    value = "\n".join(value)
            text += f"{EVAL_PARAMS_MAPPING[param]}:\n{value}\n\n"
        return text 