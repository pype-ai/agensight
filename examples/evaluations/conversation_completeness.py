from agensight.eval.test_case import ModelTestCase, ConversationalTestCase
from agensight.eval.metrics import ConversationCompletenessMetric

convo_test_case = ConversationalTestCase(
    turns=[ModelTestCase(input="...", actual_output="...")]
)
metric = ConversationCompletenessMetric(threshold=0.5)

metric.measure(convo_test_case)
print(metric.score, metric.reason)

