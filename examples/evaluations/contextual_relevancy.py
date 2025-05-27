import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))


from agensight.eval.test_case import ModelTestCase
from agensight.eval.metrics import ContextualRelevancyMetric

# Example 1: Simple product query
print("\nExample 1: Product Query")
actual_output_1 = "The laptop has a 15.6-inch display and weighs 2.5kg."
retrieval_context_1 = [
    "Display: 15.6-inch Full HD (1920x1080) IPS panel",
    "Weight: 2.5kg",
    "Battery life: Up to 8 hours",
    "Processor: Intel Core i7-1165G7",
    "Memory: 16GB DDR4"
]

test_case_1 = ModelTestCase(
    input="What are the display size and weight of this laptop?",
    actual_output=actual_output_1,
    retrieval_context=retrieval_context_1
)

# Example 2: Complex policy query with mixed relevance
print("\nExample 2: Policy Query")
actual_output_2 = "You can return items within 30 days if they're unused and in original packaging."
retrieval_context_2 = [
    "Return Policy: Items must be returned within 30 days of purchase",
    "Condition: Products must be unused and in original packaging",
    "Requirements: Original receipt must be presented",
    "Shipping Policy: Free shipping on orders over $50",
    "Warranty: 1-year manufacturer warranty",
    "Payment Methods: We accept all major credit cards"
]

test_case_2 = ModelTestCase(
    input="What is your return policy?",
    actual_output=actual_output_2,
    retrieval_context=retrieval_context_2
)

# Example 3: Technical query with highly specific context
print("\nExample 3: Technical Query")
actual_output_3 = "The smartphone has a 6.1-inch OLED display and supports 5G networks."
retrieval_context_3 = [
    "Display: 6.1-inch OLED (2532x1170)",
    "Connectivity: 5G, Wi-Fi 6, Bluetooth 5.2",
    "Battery: 3240mAh, supports fast charging",
    "Camera: Triple camera system (12MP main, 12MP ultra-wide, 12MP telephoto)",
    "Processor: A15 Bionic chip",
    "Storage: 128GB internal, non-expandable",
    "Operating System: iOS 15",
    "Water Resistance: IP68 rating"
]

test_case_3 = ModelTestCase(
    input="What are the display type and network capabilities?",
    actual_output=actual_output_3,
    retrieval_context=retrieval_context_3
)

# Initialize the metric
metric = ContextualRelevancyMetric(
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

