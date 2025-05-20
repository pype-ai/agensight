import sys
import os

# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from agensight.eval.test_case import ModelTestCase, ToolCall
from agensight.eval.metrics import ToolCorrectnessMetric

# Define a new test case
test_case = ModelTestCase(
    input="Can you help me book a hotel in Paris for next weekend?",
    actual_output="Sure! I found a few great hotels in Paris for next weekend.",
    tools_called=[ToolCall(name="HotelSearch"), ToolCall(name="FlightLookup")],
    expected_tools=[ToolCall(name="PhoneCall")],
)

# Initialize the metric
metric = ToolCorrectnessMetric()

# Evaluate the tool correctness
metric.measure(test_case=test_case)

print(metric.score, metric.reason)

