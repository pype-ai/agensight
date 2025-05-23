from typing import Dict, List, Optional, Any, Union

from agensight.eval.test_case import ModelTestCase, ModelTestCaseParams
from agensight.eval.metrics.geval.g_eval import GEvalEvaluator
from agensight.eval.storage.db_operations import insert_evaluation


def evaluate_with_gval(
    input_text: str,
    output_text: str,
    criteria: str,
    name: str = "Evaluation",
    expected_output: Optional[str] = None,
    parent_id: Optional[str] = None,
    parent_type: Optional[str] = None,
    context: Optional[str] = None,
    retrieval_context: Optional[str] = None,
    model: str = "gpt-4o-mini",
    threshold: float = 0.5,
    strict_mode: bool = False,
    verbose_mode: bool = False,
    evaluation_steps: Optional[List[str]] = None,
    save_to_db: bool = True,
    project_id: Optional[str] = None,
    source: str = "manual",
    eval_type: str = "metric",
    tags: Optional[List[str]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluate output text using GEvalEvaluator directly with option to save to database.
    
    Args:
        input_text: The input/prompt text
        output_text: The actual output/response text to evaluate
        criteria: The evaluation criteria
        name: Name of the evaluation metric
        expected_output: Optional reference answer or expected output
        parent_id: Optional parent ID for storing in database
        parent_type: Optional parent type for storing in database
        context: Optional background context information
        retrieval_context: Optional retrieved data for RAG evaluation
        model: The LLM model to use for evaluation
        threshold: Threshold score for success
        strict_mode: Whether to use strict evaluation mode
        verbose_mode: Whether to include verbose logging
        evaluation_steps: Optional custom evaluation steps
        save_to_db: Whether to save results to database
        project_id: Optional project ID for database storage
        source: Source of the evaluation (manual, automatic, etc.)
        eval_type: Type of evaluation (metric, human, etc.)
        tags: Optional tags for the evaluation
        meta: Optional metadata for the evaluation
        
    Returns:
        Dictionary containing evaluation results with score and reason
    """
    # Initialize the evaluator
    evaluation_params = [ModelTestCaseParams.INPUT, ModelTestCaseParams.ACTUAL_OUTPUT]
    
    # Add optional params if provided
    if expected_output is not None:
        evaluation_params.append(ModelTestCaseParams.EXPECTED_OUTPUT)
    if context is not None:
        evaluation_params.append(ModelTestCaseParams.CONTEXT)
    if retrieval_context is not None:
        evaluation_params.append(ModelTestCaseParams.RETRIEVAL_CONTEXT)
    
    # Create evaluator with provided parameters
    evaluator = GEvalEvaluator(
        name=name,
        criteria=criteria,
        evaluation_params=evaluation_params,
        evaluation_steps=evaluation_steps,
        model=model,
        threshold=threshold,
        strict_mode=strict_mode,
        verbose_mode=verbose_mode,
    )

    print(evaluator , "calculate evaluator")
    
    # Create test case with all available information
    test_case_kwargs = {
        "input": input_text,
        "actual_output": output_text,
    }
    
    if expected_output is not None:
        test_case_kwargs["expected_output"] = expected_output
    if context is not None:
        test_case_kwargs["context"] = context
    if retrieval_context is not None:
        test_case_kwargs["retrieval_context"] = retrieval_context
    
    test_case = ModelTestCase(**test_case_kwargs)
    
    # Measure and return results
    try:
        score = evaluator.measure(test_case)
        
        # Save to database if requested
        if save_to_db and parent_id:
            evaluation_meta = {
                "input": input_text,
                "output": output_text,
                "criteria": criteria,
                "threshold": threshold,
            }
            
            if expected_output:
                evaluation_meta["expected_output"] = expected_output
                
            # Merge with provided meta if any
            if meta:
                evaluation_meta.update(meta)
                
            eval_id = insert_evaluation(
                metric_name=name,
                score=score,
                reason=evaluator.reason,
                parent_id=parent_id,
                parent_type=parent_type or "span",
                project_id=project_id,
                source=source,
                model=model,
                eval_type=eval_type,
                tags=tags,
                meta=evaluation_meta
            )
            
            
        return score
    except Exception as e:
        return {
            "score": 0.0,
            "reason": f"Evaluation failed: {str(e)}",
            "error": str(e)
        }
