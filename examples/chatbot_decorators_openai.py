import os
from openai import OpenAI
import agensight
from agensight.tracing.decorators import trace, span

# Init tracing and instrumentation
agensight.init(name="chatbot-with-tools")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Tool implementations
def get_weather(location: str) -> str:
    return f"Weather in {location}: Sunny, 25°C"

def get_news(topic: str) -> str:
    return f"Latest news about {topic}: Everything is great!"

# Define tools
weather_tool = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Returns weather information for a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The location to check weather for"
                }
            },
            "required": ["location"]
        }
    }
}

news_tool = {
    "type": "function",
    "function": {
        "name": "get_news",
        "description": "Returns news for a given topic",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic to check news about"
                }
            },
            "required": ["topic"]
        }
    }
}

class Agent:
    def __init__(self, name, role, tools=None):
        self.name = name
        self.role = role
        self.tools = tools or []

    @span(name='llm')
    def call_llm(self, messages):
        kwargs = {
            "model": "gpt-3.5-turbo-1106",
            "messages": messages,
            "temperature": 0.7
        }

        if self.tools:
            kwargs["tools"] = self.tools
            kwargs["tool_choice"] = "auto"

        response = client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        # Tool call handling
        if choice.finish_reason == "tool_calls":
            tool_call = choice.message.tool_calls[0]
            tool_name = tool_call.function.name
            arguments = eval(tool_call.function.arguments)  # safe for demo

            if tool_name == "get_weather":
                tool_output = get_weather(**arguments)
            elif tool_name == "get_news":
                tool_output = get_news(**arguments)
            else:
                tool_output = f"Unknown tool {tool_name}"

            followup = client.chat.completions.create(
                model="gpt-3.5-turbo-1106",
                messages=[
                    *messages,
                    {"role": "assistant", "tool_calls": [tool_call]},
                    {"role": "tool", "tool_call_id": tool_call.id, "content": tool_output}
                ]
            )
            return followup.choices[0].message

        return choice.message

@trace("multi_agent_chat")
def main():
    planner = Agent("Planner", "Plans things", tools=[weather_tool, news_tool])
    scheduler = Agent("Scheduler", "Schedules plans")
    presenter = Agent("Presenter", "Formats final output")

    plan = planner.call_llm([
        {"role": "user", "content": "What's the weather in Bangalore and latest AI news?"}
    ])

    schedule = scheduler.call_llm([
        {"role": "user", "content": f"Schedule activities based on: {plan.content}"}
    ])

    final = presenter.call_llm([
        {"role": "user", "content": f"Present this nicely: {schedule.content}"}
    ])

    print("\nFinal Output:\n", final.content)

if __name__ == "__main__":
    main()
