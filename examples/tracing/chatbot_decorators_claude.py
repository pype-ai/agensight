import os
from anthropic import Anthropic
import agensight
from agensight.tracing.decorators import trace, span

# Init tracing and Claude instrumentation
agensight.init(name="claude-chatbot")

client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))# your anthropic key

# Tool implementations
def get_weather(location: str) -> str:
    return f"Weather in {location}: Sunny, 25°C"

def get_news(topic: str) -> str:
    return f"Latest news about {topic}: Everything is great!"

class ClaudeAgent:
    def __init__(self, name, role):
        self.name = name
        self.role = role

    @span(name="llm")
    def call_llm(self, messages):
        response = client.messages.create(
            model="claude-3-opus-20240229",
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )
        return response.content[0].text.strip()

@trace("multi_agent_chat")
def main():
    planner = ClaudeAgent("Planner", "Plans things")
    scheduler = ClaudeAgent("Scheduler", "Schedules plans")
    presenter = ClaudeAgent("Presenter", "Formats final output")

    plan = planner.call_llm([
        {"role": "user", "content": "What's the weather in Bangalore and latest AI news?"}
    ])

    # Add tool outputs manually (Claude doesn't support tool calling natively)
    weather = get_weather("Bangalore")
    news = get_news("AI")

    schedule = scheduler.call_llm([
        {"role": "user", "content": f"Schedule activities based on:\n{plan}\n\n{weather}\n{news}"}
    ])

    final = presenter.call_llm([
        {"role": "user", "content": f"Present this nicely: {schedule}"}
    ])

    print("\nFinal Output:\n", final)

if __name__ == "__main__":
    main()