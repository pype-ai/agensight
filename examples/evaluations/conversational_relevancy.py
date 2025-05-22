from agensight.eval.test_case import ModelTestCase, ConversationalTestCase
from agensight.eval.metrics import ConversationRelevancyMetric

convo_test_case = ConversationalTestCase(
    turns=[ModelTestCase(input="...", actual_output="...")]
)
metric = ConversationRelevancyMetric(threshold=0.5)

metric.measure(convo_test_case)
print(metric.score, metric.reason)

