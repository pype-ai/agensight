import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase, ModelTestCaseParams, ConversationalTestCase
from agensight.eval.metrics import ConversationalGEval

convo_test_case = ConversationalTestCase(
    turns=[
        ModelTestCase(
            input="I need help debugging my Python code that's throwing a TypeError",
            actual_output="I'll help you debug that TypeError. Could you please share the error message and the relevant code snippet?"
        ),
        ModelTestCase(
            input="Here's the error: TypeError: unsupported operand type(s) for +: 'int' and 'str'",
            actual_output="I see the issue. This error occurs when trying to concatenate an integer and a string. Let's fix this by converting the integer to a string using str() or using string formatting."
        )
    ]
)

professionalism_metric = ConversationalGEval(
    name="Technical Support Professionalism",
    criteria="""Evaluate whether the AI assistant maintains professional and helpful communication
    while providing technical support, ensuring clear and constructive responses.""",
    evaluation_steps=[
        "Check if responses are clear, concise, and focused on solving the technical problem",
        "Verify that the assistant asks for necessary information in a polite manner",
        "Ensure explanations are technical yet accessible, avoiding unnecessary jargon",
        "Confirm that the assistant maintains a helpful and patient tone throughout the conversation"
    ],
    evaluation_params=[ModelTestCaseParams.INPUT, ModelTestCaseParams.ACTUAL_OUTPUT],
)

professionalism_metric.measure(convo_test_case)
print(professionalism_metric.score, professionalism_metric.reason)

