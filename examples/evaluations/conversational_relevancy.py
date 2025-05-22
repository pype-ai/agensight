import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase, ConversationalTestCase
from agensight.eval.metrics import ConversationRelevancyMetric

convo_test_case = ConversationalTestCase(
    turns=[
        ModelTestCase(input="What is the weather like today?", actual_output="The weather is sunny with a high of 25 degrees."),
        ModelTestCase(input="Great, should I wear a jacket?", actual_output="No, a light sweater should be fine.")
    ]
)
metric = ConversationRelevancyMetric(threshold=0.5)

metric.measure(convo_test_case)
print(metric.score, metric.reason)

