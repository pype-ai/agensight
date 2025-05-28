import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase
from agensight.eval.metrics import ContextualRecallMetric

# Example 1: Simple product description
print("\nExample 1: Product Description")
actual_output_1 = "The laptop has a 15.6-inch display and weighs 2.5kg."
expected_output_1 = "This laptop features a 15.6-inch Full HD display and weighs 2.5 kilograms."
retrieval_context_1 = [
    "Display: 15.6-inch Full HD (1920x1080) IPS panel",
    "Weight: 2.5kg",
    "Battery life: Up to 8 hours"
]

test_case_1 = ModelTestCase(
    input="What are the display size and weight of this laptop?",
    actual_output=actual_output_1,
    expected_output=expected_output_1,
    retrieval_context=retrieval_context_1
)

# Example 2: Complex policy information
print("\nExample 2: Policy Information")
actual_output_2 = "You can return items within 30 days if they're unused and in original packaging."
expected_output_2 = "Our return policy allows returns within 30 days for unused items in original packaging, with receipt required."
retrieval_context_2 = [
    "Return Policy: Items must be returned within 30 days of purchase",
    "Condition: Products must be unused and in original packaging",
    "Requirements: Original receipt must be presented",
    "Exceptions: Custom-made items and software are non-returnable"
]

test_case_2 = ModelTestCase(
    input="What is your return policy?",
    actual_output=actual_output_2,
    expected_output=expected_output_2,
    retrieval_context=retrieval_context_2
)

# Example 3: Multiple features and specifications
print("\nExample 3: Multiple Features")
actual_output_3 = "The smartphone has a 6.1-inch screen, 128GB storage, and 5G capability."
expected_output_3 = "This smartphone features a 6.1-inch OLED display, 128GB internal storage, and supports 5G networks."
retrieval_context_3 = [
    "Display: 6.1-inch OLED (2532x1170)",
    "Storage: 128GB internal, non-expandable",
    "Connectivity: 5G, Wi-Fi 6, Bluetooth 5.2",
    "Battery: 3240mAh, supports fast charging",
    "Camera: Triple camera system (12MP main, 12MP ultra-wide, 12MP telephoto)"
]

test_case_3 = ModelTestCase(
    input="What are the main features of this phone?",
    actual_output=actual_output_3,
    expected_output=expected_output_3,
    retrieval_context=retrieval_context_3
)

# Initialize the metric
metric = ContextualRecallMetric(
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

