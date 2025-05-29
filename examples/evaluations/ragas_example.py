import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.metrics.ragas import RagasMetric
from agensight.eval.test_case import ModelTestCase

# Example RAG evaluation scenario
actual_output = "The laptop has a 15.6-inch display and weighs 2.5kg."
expected_output = "This laptop features a 15.6-inch Full HD display and weighs 2.5 kilograms."
retrieval_context = [
    "Display: 15.6-inch Full HD (1920x1080) IPS panel",
    "Weight: 2.5kg",
    "Battery life: Up to 8 hours"
]

# Initialize the RagasMetric with a supported model (ensure your OPENAI_API_KEY is set in the environment)
metric = RagasMetric(threshold=0.5, model="gpt-4o-mini")

test_case = ModelTestCase(
    input="What are the display size and weight of this laptop?",
    actual_output=actual_output,
    expected_output=expected_output,
    retrieval_context=retrieval_context
)

score = metric.measure(test_case)
print(f"Ragas Score: {score}")
if hasattr(metric, 'score_breakdown'):
    print("Score Breakdown:")
    for k, v in metric.score_breakdown.items():
        print(f"  {k}: {v}")

