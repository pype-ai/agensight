import os
import openai
from agensight import init, trace, span 

# Initialize with prod mode and project ID
init(
    name="chatbot-with-tools",
    mode="prod",  # Ensure we're in prod mode
    token="385ee1e6"  # Required for prod mode
)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: Please set the OPENAI_API_KEY environment variable.")
    exit(1)

openai.api_key = api_key
system_prompt = "You are a helpful assistant."

@span()
def call_openai(messages):
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    return response.choices[0].message.content.strip()

# Session info will be handled by the trace decorator
@trace("chat_interaction", session={"id": "11-22-33-44", "user_id": "user123", "name": "chatbot-cloud-demo"})
def process_single_interaction(messages, user_input):
    messages.append({"role": "user", "content": user_input})
    reply = call_openai(messages)
    messages.append({"role": "assistant", "content": reply})
    return reply

def chat_loop():
    print("Simple OpenAI CLI Chatbot. Type 'exit' or 'quit' to stop.")
    messages = [
        {"role": "system", "content": system_prompt}
    ]
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
            reply = process_single_interaction(messages, user_input)
            print(f"Bot: {reply}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    chat_loop()