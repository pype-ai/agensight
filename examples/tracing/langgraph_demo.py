import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from dotenv import load_dotenv
load_dotenv()

from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display
from agensight import init
from agensight import trace, span
from openai import OpenAI
import logging
from agensight.eval.metrics import GEvalEvaluator

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Setup tracing and OpenAI ===
try:
    init(name="langgraph-joke", auto_instrument_llms=False)  # Disable auto instrumentation
    logger.info("Tracing initialized successfully")
except Exception as e:
    logger.warning(f"Failed to initialize tracing: {e}")
    # Continue without tracing

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# === LangGraph State ===
class State(TypedDict):
    topic: str
    joke: str
    improved_joke: str
    final_joke: str

# === Nodes ===

factual_accuracy = GEvalEvaluator(
        name="Factual Accuracy",
        criteria="Evaluate whether the actual output contains factually accurate information based on the expected output.",
        threshold=0.7,
        verbose_mode=True,
        model="gpt-4o-mini"
)

helpfulness = GEvalEvaluator(
        name="Helpfulness",
        criteria="Evaluate whether the output is helpful and addresses the user's input question.",
        threshold=1,
        verbose_mode=True,
        model="gpt-4o-mini"
)



@span(name="generate_joke",metrics=[factual_accuracy,helpfulness])
def generate_joke(state: State):
    msg = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": f"Write a short joke about {state['topic']}"}]
    )
    return {"joke": msg.choices[0].message.content}

@span(name="check_punchline",metrics=[factual_accuracy,helpfulness])
def check_punchline(state: State):
    if "?" in state["joke"] or "!" in state["joke"]:
        return "Fail"
    return "Pass"

@span(name="improve_joke",metrics=[factual_accuracy,helpfulness])
def improve_joke(state: State):
    msg = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": f"Make this joke funnier by adding wordplay: {state['joke']}"}]
    )
    return {"improved_joke": msg.choices[0].message.content}

@span(name="polish_joke",metrics=[factual_accuracy])
def polish_joke(state: State):
    msg = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": f"Add a surprising twist to this joke: {state['improved_joke']}"}]
    )
    return {"final_joke": msg.choices[0].message.content}

# === Build and Compile Graph ===

workflow = StateGraph(State)
workflow.add_node("generate_joke", generate_joke)
workflow.add_node("improve_joke", improve_joke)
workflow.add_node("polish_joke", polish_joke)

workflow.add_edge(START, "generate_joke")
workflow.add_conditional_edges("generate_joke", check_punchline, {"Fail": "improve_joke", "Pass": END})
workflow.add_edge("improve_joke", "polish_joke")
workflow.add_edge("polish_joke", END)

chain = workflow.compile()
display(Image(chain.get_graph().draw_mermaid_png()))

# === Run with full trace ===


@trace(name="joke_chain")
def run_joke_chain():
    return chain.invoke({"topic": "cats"})

state = run_joke_chain()

# === Output ===

print("Initial joke:\n", state["joke"])
if "improved_joke" in state:
    print("\nImproved joke:\n", state["improved_joke"])
    print("\nFinal joke:\n", state["final_joke"])
else:
    print("Joke failed quality gate - no punchline detected!")