import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..','..')))
from agensight.eval.metrics import TextToImageMetric
from agensight.eval.test_case import MLLMTestCase
from agensight.eval.test_case import MLLMImage

# Dummy image and prompt for demonstration
prompt = ["A cat sitting on a windowsill."]
actual_output = [MLLMImage(url="/Users/deepeshagrawal/pype/examples/evaluations/multi_model/cat.jpeg")]

metric = TextToImageMetric(model="gpt-4o", threshold=0.5)
test_case = MLLMTestCase(input=prompt, actual_output=actual_output)

metric.measure(test_case)
print(f"Score: {metric.score}")
print(f"Reason: {metric.reason}") 