import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))
from agensight.eval.test_case import ModelTestCase
from agensight.eval.metrics import ContextualPrecisionMetric

# Example 1: Simple refund policy case
print("\nExample 1: Simple Refund Policy")
actual_output_1 = "We offer a 30-day full refund at no extra cost."
expected_output_1 = "You are eligible for a 30 day full refund at no extra cost."
retrieval_context_1 = ["All customers are eligible for a 30 day full refund at no extra cost."]

test_case_1 = ModelTestCase(
    input="What if these shoes don't fit?",
    actual_output=actual_output_1,
    expected_output=expected_output_1,
    retrieval_context=retrieval_context_1
)

# Example 2: Product specifications with complex context
print("\nExample 2: Product Specifications")
actual_output_2 = "The laptop has 16GB RAM and 512GB SSD storage."
expected_output_2 = "This model comes with 16GB of RAM and 512GB of SSD storage capacity."
retrieval_context_2 = [
    "Technical specifications: RAM: 16GB DDR4, Storage: 512GB NVMe SSD",
    "The laptop supports up to 32GB RAM but comes with 16GB by default",
    "Storage options include 256GB, 512GB, and 1TB SSD variants"
]

test_case_2 = ModelTestCase(
    input="What are the memory and storage specs?",
    actual_output=actual_output_2,
    expected_output=expected_output_2,
    retrieval_context=retrieval_context_2
)

# Example 3: Multiple context items with conflicting information
print("\nExample 3: Multiple Context Items")
actual_output_3 = "The store is open from 9 AM to 6 PM on weekdays."
expected_output_3 = "Our store hours are 9:00 AM to 6:00 PM Monday through Friday."
retrieval_context_3 = [
    "Regular hours: Monday-Friday 9AM-6PM",
    "Weekend hours: Saturday 10AM-4PM, Sunday closed",
    "Holiday hours may vary",
    "Extended hours during summer: 8AM-8PM"
]

test_case_3 = ModelTestCase(
    input="What are your weekday hours?",
    actual_output=actual_output_3,
    expected_output=expected_output_3,
    retrieval_context=retrieval_context_3
)

# Initialize the metric
metric = ContextualPrecisionMetric(
    threshold=0.7,
    model="gpt-4o",
    include_reason=True
)

# Run evaluations for all examples
for i, test_case in enumerate([test_case_1, test_case_2, test_case_3], 1):
    print(f"\nEvaluating Example {i}:")
    metric.measure(test_case)
    print(f"Score: {metric.score}")
    print(f"Reason: {metric.reason}")

