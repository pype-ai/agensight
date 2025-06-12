from typing import Dict, List, Optional, Any, Union

from agensight.eval.test_case import ModelTestCase, ModelTestCaseParams
from agensight.eval.metrics.contextual_recall.contextual_recall import ContextualRecallMetric
from agensight.eval.metrics.contextual_relevancy.contextual_relevancy import ContextualRelevancyMetric
from agensight.eval.metrics.contextual_precision.contextual_precision import ContextualPrecisionMetric
from agensight.eval.metrics.geval.g_eval import GEvalEvaluator
from agensight.eval.storage.db_operations import insert_evaluation
import json
import ast
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError


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
    async_mode: bool = False,
    threshold: float = 0.5,
    strict_mode: bool = False,
    verbose_mode: bool = False,
    evaluation_steps: Optional[List[str]] = None,
    save_to_db: bool = True,
    project_id: Optional[str] = None,
    source: str = "manual",
    eval_type: str = "geval",
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
    print("starting geval calculation.....")


    evaluator = GEvalEvaluator(
        name=name,
        criteria=criteria,
        evaluation_params=evaluation_params,
        evaluation_steps=evaluation_steps,
        model=model,
        threshold=threshold,
        async_mode=async_mode,
        strict_mode=strict_mode,
        verbose_mode=verbose_mode,
    )

    
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

    print("test case created" , test_case)
    
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



def evaluate_with_contextual_relevancy(
    input_text: str,
    output_text: str,
    retrieval_context: List[str],
    name: str = "Contextual Relevancy",
    parent_id: Optional[str] = None,
    parent_type: Optional[str] = None,
    model: str = "gpt-4o-mini",
    threshold: float = 0.5,
    strict_mode: bool = False,
    verbose_mode: bool = False,
    include_reason: bool = True,
    async_mode: bool = False,
    save_to_db: bool = True,
    project_id: Optional[str] = None,
    source: str = "manual",
    eval_type: str = "contextual_relevancy",
    tags: Optional[List[str]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluate using Contextual Relevancy metric.
    Measures how relevant the retrieval context is to the input query.
    """
    # Create evaluator
    evaluator = ContextualRelevancyMetric(
        threshold=threshold,
        model=model,
        async_mode=async_mode,
        include_reason=include_reason,
        strict_mode=strict_mode,
        verbose_mode=verbose_mode,
    )
    
    # Create test case
    test_case = ModelTestCase(
        input=input_text,
        actual_output=output_text,
        retrieval_context=retrieval_context
    )

    print("test case created" , test_case)
    
    try:
        print("evaluator", evaluator.measure(test_case))
        score = evaluator.measure(test_case)
        reason = getattr(evaluator, 'reason', 'No reason provided')
        
        # Save to database if requested
        if save_to_db and parent_id:
            evaluation_meta = {
                "input": input_text,
                "output": output_text,
                "retrieval_context": retrieval_context,
                "threshold": threshold,
            }
            
            if meta:
                evaluation_meta.update(meta)
                
            insert_evaluation(
                metric_name=name,
                score=score,
                reason=reason,
                parent_id=parent_id,
                parent_type=parent_type or "span",
                project_id=project_id,
                source=source,
                model=model,
                eval_type=eval_type,
                tags=tags,
                meta=evaluation_meta
            )
            
        return {
            "score": score,
            "reason": reason,
            "success": score >= threshold
        }
        
    except Exception as e:
        return {
            "score": 0.0,
            "reason": f"Evaluation failed: {str(e)}",
            "error": str(e),
            "success": False
        }


def evaluate_with_contextual_precision(
    input_text: str,
    output_text: str,
    retrieval_context: List[str],
    expected_output:Optional[str] = None,
    name: str = "Contextual Precision",
    parent_id: Optional[str] = None,
    parent_type: Optional[str] = None,
    model: str = "gpt-4o-mini",
    threshold: float = 0.5,
    strict_mode: bool = False,
    verbose_mode: bool = False,
    include_reason: bool = True,
    async_mode: bool = False,
    save_to_db: bool = True,
    project_id: Optional[str] = None,
    source: str = "manual",
    eval_type: str = "contextual_precision",
    tags: Optional[List[str]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluate using Contextual Precision metric.
    Measures the precision of retrieved context in relation to the expected output.
    """
    
    # Create evaluator
    evaluator = ContextualPrecisionMetric(
        threshold=threshold,
        model=model,
        strict_mode=strict_mode,
        async_mode=async_mode,
        verbose_mode=verbose_mode,
        include_reason=include_reason,
    )

    
    # Create test case
    test_case = ModelTestCase(
        input=input_text,
        actual_output="",
        expected_output=output_text,
        retrieval_context=retrieval_context
    )

    print("test case created" , test_case)

    
    try:

        score = evaluator.measure(test_case)
        reason = evaluator.reason;
        
        print("score" , score)
        print("reason" , evaluator.reason)
        # Save to database if requested
        if save_to_db and parent_id:
            evaluation_meta = {
                "input": input_text,
                "output": output_text,
                "expected_output": expected_output,
                "retrieval_context": retrieval_context,
                "threshold": threshold,
            }
            
            if meta:
                evaluation_meta.update(meta)
                
            insert_evaluation(
                metric_name=name,
                score=score,
                reason=reason,
                parent_id=parent_id,
                parent_type=parent_type or "span",
                project_id=project_id,
                source=source,
                model=model,
                eval_type=eval_type,
                tags=tags,
                meta=evaluation_meta
            )
            
        return {
            "score": score,
            "reason": reason,
            "success": score >= threshold
        }
        
    except Exception as e:
        return {
            "score": 0.0,
            "reason": f"Evaluation failed: {str(e)}",
            "error": str(e),
            "success": False
        }



# Updated dynamic processor with all metric types
def process_all_metrics_dynamically(attrs: Dict[str, Any], span_id: str, trace_id: str, span_name: str):
    """
    Universal dynamic metrics processor that handles all metric types
    """
    metrics_configs_str = attrs.get("metrics.configs")
    
    if metrics_configs_str and "gen_ai.normalized_input_output" in attrs:
        try:
            metrics_configs = json.loads(metrics_configs_str)
            nio_data = json.loads(attrs.get("gen_ai.normalized_input_output"))
            input_text = nio_data.get("prompts", [{}])[0].get("content", "")
            output_text = nio_data.get("completions", [{}])[0].get("content", "")
            
            if input_text and output_text:
                for metric_name, config in metrics_configs.items():
                    try:
                        metric_type = config.get("type")
                        
                        # Route to appropriate evaluator based on metric type
                        if metric_type == "GEvalEvaluator":
                            evaluate_with_gval(
                                input_text=input_text,
                                output_text=output_text,
                                name=metric_name,
                                criteria=config.get("criteria"),
                                parent_id=span_id,
                                async_mode=config.get("async_mode", False),
                                parent_type="span",
                                model=config.get("evaluation_model", "gpt-4o-mini"),
                                threshold=config.get("threshold", 0.5),
                                strict_mode=config.get("strict_mode", False),
                                verbose_mode=config.get("verbose_mode", False),
                                save_to_db=True,
                                source="automatic",
                                meta={"trace_id": trace_id, "span_name": span_name}
                            )
                        
                        elif metric_type == "ContextualRelevancyMetric":
                            retrieval_context_raw = config.get("retrieval_context", [])

                            if isinstance(retrieval_context_raw, list):
                                retrieval_context = retrieval_context_raw
                            elif isinstance(retrieval_context_raw, str):
                                try:
                                    retrieval_context = ast.literal_eval(retrieval_context_raw)
                                except (ValueError, SyntaxError):
                                    print(f"Failed to parse: {retrieval_context_raw}")
                                    retrieval_context = []
                            else:
                                retrieval_context = []

                            evaluate_with_contextual_relevancy(
                                input_text=input_text,
                                output_text=output_text,
                                retrieval_context=retrieval_context,
                                name=metric_name,
                                parent_id=span_id,
                                async_mode=config.get("async_mode", False),
                                parent_type="span",
                                model=config.get("evaluation_model", "gpt-4o-mini"),
                                threshold=config.get("threshold", 0.5),
                                strict_mode=config.get("strict_mode", False),
                                verbose_mode=config.get("verbose_mode", False),
                                include_reason=config.get("include_reason", True),
                                save_to_db=True,
                                source="automatic",
                                meta={"trace_id": trace_id, "span_name": span_name}
                            )
                        
                        elif metric_type == "ContextualPrecisionMetric":

                            retrieval_context_raw = config.get("retrieval_context", [])

                            if isinstance(retrieval_context_raw, list):
                                retrieval_context = retrieval_context_raw
                            elif isinstance(retrieval_context_raw, str):
                                try:
                                    retrieval_context = ast.literal_eval(retrieval_context_raw)
                                except (ValueError, SyntaxError):
                                    print(f"Failed to parse: {retrieval_context_raw}")
                                    retrieval_context = []
                            else:
                                retrieval_context = []

                            evaluate_with_contextual_precision(
                                input_text=input_text,
                                output_text=output_text,
                                retrieval_context=retrieval_context,
                                expected_output="",
                                async_mode=config.get("async_mode", False),
                                name=metric_name,
                                parent_id=span_id,
                                parent_type="span",
                                model=config.get("evaluation_model", "gpt-4o-mini"),
                                threshold=config.get("threshold", 0.5),
                                strict_mode=config.get("strict_mode", False),
                                verbose_mode=config.get("verbose_mode", False),
                                include_reason=config.get("include_reason", True),
                                save_to_db=True,
                                source="automatic",
                                meta={"trace_id": trace_id, "span_name": span_name}
                            )
                        
                        else:
                            print(f"Unknown metric type: {metric_type}. Skipping {metric_name}")
                            
                    except Exception as e:
                        print(f"Error evaluating metric {metric_name}: {e}")
                        
        except Exception as e:
            print(f"Error processing metrics: {e}")


# Usage in your code:
"""
# Replace your current metrics processing with:
process_all_metrics_dynamically(attrs, span_id, trace_id, span.name)
"""