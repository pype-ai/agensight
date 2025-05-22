import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase, ConversationalTestCase
from agensight.eval.metrics import ConversationCompletenessMetric

convo_test_case = ConversationalTestCase(
    turns=[ModelTestCase(input="...", actual_output="...")]
)
metric = ConversationCompletenessMetric(threshold=0.5)

metric.measure(convo_test_case)
print(metric.score, metric.reason)

