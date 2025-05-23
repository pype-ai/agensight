import os
import openai
from agensight import init, trace, span 

init(name="chatbot-with-tools")

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: Please set the OPENAI_API_KEY environment variable.")
    exit(1)

openai.api_key = api_key
system_prompt = "You are a helpful assistant."

from agensight import trace, span

@span()
def call_openai(messages):
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    return response.choices[0].message.content.strip()

@trace("chatbot_cli_session", session='abc123')
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
        messages.append({"role": "user", "content": user_input})
        try:
            reply = call_openai(messages)
            print(f"Bot: {reply}")
            messages.append({"role": "assistant", "content": reply})
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    chat_loop()