import os
import sys

# Add the project root to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

# Use simplified imports
from agensight.eval.gval import GEvalEvaluator
from agensight.eval.services.evaluator import evaluate_with_metrics

def test_evaluate_with_multiple_metrics():
    """Example of using evaluate_with_metrics function with multiple evaluation metrics."""
    factual_accuracy = GEvalEvaluator(
        name="Factual Accuracy",
        criteria="Evaluate whether the actual output contains factually accurate information based on the expected output.",
        threshold=0.7,
        verbose_mode=True,
    )
    
    helpfulness = GEvalEvaluator(
        name="Helpfulness",
        criteria="Evaluate whether the output is helpful and addresses the user's input question.",
        threshold=0.6,
        verbose_mode=True
    )
    
    clarity = GEvalEvaluator(
        name="Clarity",
        criteria="Evaluate whether the output is clear, concise, and easy to understand.",
        threshold=0.5,
        verbose_mode=True
    )
    
    # Input, expected output, and actual output for evaluation
    input_text = "What is the orbital period of Earth?"
    expected_output = "The Earth orbits the Sun and takes approximately 365.25 days to complete one orbit."
    actual_output = "The Earth orbits the Sun and completes one orbit every 365.25 days."
    
    # Evaluate with multiple metrics
    results = evaluate_with_metrics(
        input_text=input_text,
        actual_output=actual_output,
        metrics=[factual_accuracy, helpfulness, clarity],
        parent_id="test-parent-123",
        expected_output=expected_output
    )
    
    # You can also check if all metrics passed their thresholds
    if results:
        all_successful = all(result['success'] for result in results)
        print(f"\nOverall Success: {all_successful}")
        
        # Calculate average score across all metrics
        avg_score = sum(result['score'] for result in results) / len(results) if results else 0
        print(f"Average Score: {avg_score:.2f}")
    else:
        print("\nNo evaluation results were returned.")
    
    return results

if __name__ == "__main__":
    # Run the multi-metric test
    test_evaluate_with_multiple_metrics()