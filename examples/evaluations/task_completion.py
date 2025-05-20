import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase, ToolCall
from agensight.eval.metrics import TaskCompletionMetric

metric = TaskCompletionMetric(
    threshold=0.7,
    model="gpt-4o-mini",
    include_reason=True
)
test_case = ModelTestCase(
    input="Plan a 3-day itinerary for Paris with cultural landmarks and local cuisine.",
    actual_output=(
        "Day 1: Eiffel Tower, dinner at Le Jules Verne. "
        "Day 2: Louvre Museum, lunch at Angelina Paris. "
        "Day 3: Montmartre, evening at a wine bar."
    ),
    tools_called=[
        ToolCall(
            name="Itinerary Generator",
            description="Creates travel plans based on destination and duration.",
            input_parameters={"destination": "Paris", "days": 3},
            output=[
                "Day 1: Eiffel Tower, Le Jules Verne.",
                "Day 2: Louvre Museum, Angelina Paris.",
                "Day 3: Montmartre, wine bar.",
            ],
        ),
        ToolCall(
            name="Restaurant Finder",
            description="Finds top restaurants in a city.",
            input_parameters={"city": "Paris"},
            output=["Le Jules Verne", "Angelina Paris", "local wine bars"],
        ),
    ],
)

# To run metric as a standalone
metric.measure(test_case)
print(metric.score, metric.reason)

