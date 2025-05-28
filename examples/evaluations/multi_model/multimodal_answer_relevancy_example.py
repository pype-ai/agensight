import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..','..')))
from agensight.eval.metrics import MultimodalAnswerRelevancyMetric
from agensight.eval.test_case import MLLMTestCase
from agensight.eval.test_case import MLLMImage

input_data = ["What is in the image?"]
actual_output = ["A cat is sitting on a windowsill."]

metric = MultimodalAnswerRelevancyMetric(model="gpt-4o", threshold=0.5)
test_case = MLLMTestCase(input=input_data, actual_output=actual_output)

metric.measure(test_case)
print(f"Score: {metric.score}")
print(f"Reason: {metric.reason}") 