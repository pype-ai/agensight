import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..','..')))
from agensight.eval.metrics import MultimodalFaithfulnessMetric
from agensight.eval.test_case import MLLMTestCase
from agensight.eval.test_case import MLLMImage

input_data = ["Describe the image of a cat on a windowsill."]
actual_output = ["A cat is sitting on a windowsill, looking outside."]
retrieval_context = ["A photo shows a cat sitting on a windowsill."]

metric = MultimodalFaithfulnessMetric(model="gpt-4o", threshold=0.5)
test_case = MLLMTestCase(input=input_data, actual_output=actual_output, retrieval_context=retrieval_context)

metric.measure(test_case)
print(f"Score: {metric.score}")
print(f"Reason: {metric.reason}") 