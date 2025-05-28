import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..','..')))

from agensight.eval.metrics import MultimodalToolCorrectnessMetric
from agensight.eval.test_case import ModelTestCase, ToolCall
from agensight.eval.test_case import MLLMImage

input_data = ["Draw a cat and then describe it."]
actual_output = ["Image generated and described."]
tools_called = [ToolCall(name="draw_image"), ToolCall(name="describe_image")]
expected_tools = [ToolCall(name="s"), ToolCall(name="w")]

metric = MultimodalToolCorrectnessMetric()
test_case = ModelTestCase(input=input_data, actual_output=actual_output, tools_called=tools_called, expected_tools=expected_tools)

metric.measure(test_case)
print(f"Score: {metric.score}")
print(f"Reason: {metric.reason}") 