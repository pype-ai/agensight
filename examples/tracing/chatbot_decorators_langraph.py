import os
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from agensight import init, trace, span

# Initialize Agensight with prod mode and project ID
init(
    name="langraph-chatbot-with-tools",
    mode="prod",  # Ensure we're in prod mode
    project_id="773b7798"  # Required for prod mode
)

# Check for OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: Please set the OPENAI_API_KEY environment variable.")
    exit(1)

# Define the state for our graph
class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Initialize the LLM
llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=api_key)

# System prompt
SYSTEM_PROMPT = "You are a helpful assistant."

@span()
def call_model(state: State):
    """Call the LLM with the current state messages"""
    # Add system message if not present
    messages = state["messages"]
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)
    
    response = llm.invoke(messages)
    return {"messages": [response]}

@span()
def should_continue(state: State):
    """Determine if we should continue the conversation"""
    messages = state["messages"]
    last_message = messages[-1]
    
    # Continue if the last message is from human
    if isinstance(last_message, HumanMessage):
        return "continue"
    else:
        return "end"

# Create the graph
def create_chat_graph():
    workflow = StateGraph(State)
    
    # Add nodes
    workflow.add_node("agent", call_model)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "agent",
            "end": END,
        }
    )
    
    # Compile the graph
    app = workflow.compile()
    return app

@trace("langraph_chat_interaction", 
       session={
           "id": "123-123-123", 
           "user_id": "user1234",
           "name": "langraph-chatbot-demo"
       })
def process_interaction(app, state: State, user_input: str):
    """Process a single user interaction through the LangGraph"""
    # Add user message to state
    state["messages"].append(HumanMessage(content=user_input))
    
    # Run the graph
    result = app.invoke(state)
    
    # Extract the assistant's response
    last_message = result["messages"][-1]
    if isinstance(last_message, AIMessage):
        return last_message.content, result
    else:
        return "I'm sorry, I couldn't generate a response.", result

def chat_loop():
    """Main chat loop"""
    print("LangGraph OpenAI CLI Chatbot. Type 'exit' or 'quit' to stop.")
    
    # Create the chat graph
    app = create_chat_graph()
    
    # Initialize state with system message
    state = State(messages=[SystemMessage(content=SYSTEM_PROMPT)])
    
    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break
            
        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break
            
        if not user_input:
            continue
        
        try:
            reply, state = process_interaction(app, state, user_input)
            print(f"Bot: {reply}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    chat_loop()