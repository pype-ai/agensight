![Screenshot 2025-05-23 at 3 38 12 PM](https://github.com/user-attachments/assets/62fcd28d-0f65-4557-af6e-afb9fbd80960)


<div align="center">
   <div>
         <a href="https://app.pypeai.com/">
         <strong>Cloud</strong>
         </a> ·
         <a href="https://www.youtube.com/watch?v=eunL3IFSIB8">
         <strong>Demo</strong>
         </a> ·
         <a href="https://pype-db52d533.mintlify.app/introduction">
            <strong>Docs</strong>
         </a>
   </div>
   <br/>
   <span>Agensight uses <a href="https://github.com/pype-ai/agensight/discussions"><strong>Github Discussions</strong></a>  for Support and Feature Requests.</span>
   <br/>
   <br/>
   <br/>
   <div>
   </div>
</div>

<p align="center">
   <a href="https://github.com/pype-ai/agensight/blob/update-readme/LICENSE">
   <img src="https://img.shields.io/badge/License-MIT-E11311.svg" alt="MIT License">
   </a>
   <a href="https://pypi.org/project/agensight/0.5.3/">
      <img alt="PyPI Downloads" src="https://img.shields.io/pypi/dm/agensight?logo=python&logoColor=white&label=pypi%20agensight&color=blue">
   </a>
   <a href="https://www.linkedin.com/company/pype-ai/posts/?feedView=all" target="_blank">
   <img src="https://custom-icon-badges.demolab.com/badge/LinkedIn-0A66C2?logo=linkedin-white&logoColor=fff"
      alt="follow on LinkedIn"></a>
   <a href="https://github.com/pype-ai/agensight/graphs/commit-activity" target="_blank">
     <img alt="Commits last month" src="https://img.shields.io/github/commit-activity/m/pype-ai/agensight?labelColor=%2332b583&color=%2312b76a">
   </a>
   <a href="https://github.com/pype-ai/agensight/issues?q=is%3Aissue%20state%3Aclosed" target="_blank">
      <img alt="Issues closed" src="https://img.shields.io/github/issues-search?query=repo%3Apype-ai%2Fagensight%20is%3Aclosed&label=issues%20closed&labelColor=%237d89b0&color=%235d6b98">
   </a>
</p>


Pype AI's Agensight is an open-source experimentation studio built for conversational AI agents. It is similar to LangGraph but supports any agentic framework (likes of Autogen, LangGraph etc) or modality (voice, image & text). With minimal code changes, Pype AI provides complete observability to help you trace agentic workflows for entire sessions or user conversations.

> It features a plug & play playground for editing prompts and tools. It uses an MCP server that if used via cursor or whindsurf can explore your code and generate a playground synced to your code. You can do any edits to your prompts or tools in this playground. Changes made in the playground sync directly to your code, allowing you to effortlessly run, replay, and evaluate experiments.

> It provides Conversational Replays that help you visit any session, replay the conversation with any multiple versions of the agents (created by editing the agents (model, prompt, rag, tools) and Evaluate to help you improve your customer interactions.

`Agensight` empowers you to quickly iterate, build evaluations, and improve agent conversations.


<div align="center">
  <video src="https://github.com/user-attachments/assets/fe89d1e7-6a68-4e03-9f57-c4b79fce28fc" width="650" autoplay loop muted></video>
</div>







## Core Features
![3](https://github.com/user-attachments/assets/58352598-4fb8-4477-a71c-e76b27dd632c)


#### Agent Observability 
Agensight provides comprehensive observability for your AI agents through auto-instrumented tracing of all LLM calls, function executions, and agent interactions. The local development mode enables offline trace inspection with detailed performance metrics and token usage analytics. Customize your traces and spans with meaningful names and organize them for better debugging and analysis of your agent workflows.

#### Interactive Playground
The interactive playground offers a visual workflow editor for designing and modifying agent workflows through an intuitive interface. All changes made in the playground automatically sync with your codebase, ensuring seamless integration between development and experimentation. The platform maintains version control for your prompts and agent configurations, allowing you to track and revert changes as needed.

#### LLM Evaluations
Evaluate your agent's performance with custom metrics tailored to your specific use cases. Agensight's evaluation framework provides automated scoring of agent responses using predefined or custom criteria, giving you instant feedback on performance. Track improvements over time with detailed evaluation reports and analytics, helping you continuously enhance your agent's capabilities.

#### Conversational Replay
Access and replay any past conversation with your agents through the session history feature. Compare different versions of your agents (model, prompt, tools) side by side to identify improvements and regressions. The interactive debugging capabilities allow you to step through conversations, making it easier to identify and fix issues in your agent's behavior.

#### Security & Local Storage
All data is stored locally inside the SDK, ensuring complete privacy and control over your information. No data is uploaded or tracked externally, and all prompt versions are stored locally in the `.agensight` file. We recommend running Agensight in isolated virtual environments for enhanced security.


## Quick Start

### 1. Go to Your Project Directory

If you already have a project:
```bash
cd path/to/your/project
```

Or, to try an example from our repo, use:
examples/tracing/langgraph_demo.py

### 2. Create and Activate a Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Agensight

**Note:** Agensight requires Python 3.10 or higher. Check your Python version with:

```bash
python --version
```
then ,
```bash
pip install --upgrade agensight
```

### 4. Start the Dashboard
```bash
agensight view
```
Visit http://localhost:5001 in your browser

### Setup Tracing

1. **Add to your Python code**
```python
from agensight import init, trace, span

# Initialize Agensight
init(name="my-agent")

# Add tracing to your functions
@trace("my_workflow")
def my_function():
    @span()
    def my_subtask():
        # Your code here
        pass
    return my_subtask()
```

### Setup Playground

1. **Install MCP Server**
```bash
# Clone the MCP server
git clone https://github.com/pype-ai/agensight_mcpserver.git
cd agensight_mcpserver

# Setup MCP server
python -m venv mcp-env
source mcp-env/bin/activate  # On Windows: mcp-env\Scripts\activate
pip install -r requirements.txt
```

2. **Configure Cursor/Windsurf**
Add this to your Cursor/Windsurf settings:
```json
{
  "mcpServers": {
    "agensight": {
      "command": "/path/to/agensight_mcpserver/mcp-env/bin/python",
      "args": ["/path/to/agensight_mcpserver/server.py"],
      "description": "Agensight Playground Generator"
    }
  }
}
```

3. **Generate Playground**
- Open your project in Cursor/Windsurf
- Type in chat: "Please analyze this codebase using the generateAgensightConfig MCP tool"
- Your config will be automatically generated

That's it! You now have both tracing and playground features set up. The dashboard at http://localhost:5001 will show your traces and allow you to edit your agents in the playground.

## Agent Observability

### 🛰️ Overview

Agensight provides first-class support for tracing your agent workflows using just two decorators: `@trace` for high-level operations and `@span` for finer-grained steps like LLM calls or tool executions. This gives you powerful visibility into your agent's behavior across sessions, tools, and models.

### 🧭 Initialize Tracing

Before you use any tracing features, initialize Agensight at the start of your application:

```python
import agensight

agensight.init(
    name="chatbot-with-tools",
    mode="prod",  # Use "local" for local development
    token="abc12345",  # Required token for prod/dev
    session="user_123"      # Optional: can be an ID or full session dict
)
```

Parameters:
- **name**: Your app or service name
- **mode**: One of "local", "dev", or "prod"
- **token**: Required in cloud modes to associate logs
- **session**: Optional session ID or metadata (str or {id, name, user_id})

> ℹ️ If both init() and @trace() specify a session, @trace() takes precedence for that specific trace.

### 📍 Create Traces with @trace

The @trace decorator marks a top-level user workflow (e.g. a request handler, multi-agent loop, or RAG pipeline). All nested spans are automatically tied to this trace.

```python
from agensight import trace

@trace(name="multi_agent_chat", session={"id": "xyz123", "name": "multi agent chat", "user_id": "123"})
def main():
    ...
```

- Automatically generates a unique trace_id
- Associates child spans to the trace
- Inherits or overrides session metadata

### 📌 Add Spans with @span

Use the @span decorator to capture individual operations like LLM calls, tool executions, or preprocessing steps. It records execution time, input/output, token usage, and more.

```python
from agensight import span

@span(name="llm")
def call_llm(messages):
    return client.chat.completions.create(messages=messages)
```

- Captures LLM usage details (e.g. model, token count)
- Works with OpenAI, Claude, or custom models
- Tool calls inside spans are automatically detected if tool_choice="auto"

### ✨ Features of Tracing

- ✅ **Structured Trace Data**: Includes input/output, tokens used, and timing for each step
- 🎯 **Session-Aware**: Group all traces and spans by user/session automatically
- 🧠 **LLM-Aware**: Automatically captures model usage, prompts, completions, and costs
- 🧰 **Tool Logging**: Captures tool invocations inside spans, no manual work needed
- ☁️ **Cloud Compatible**: In prod/dev mode, all traces are sent to your Supabase backend

### 🧪 Example

```python
from agensight import init, trace, span

init(name="chat-service", mode="prod", token="abc12345", session="user_456")

@span(name="llm")
def call_llm(messages):
    return {"content": "Mock response", "tool_used": "get_weather"}

@trace(name="multi_agent_chat", session="user_789")
def main():
    plan = call_llm([{"role": "user", "content": "Weather in Paris?"}])
    summary = call_llm([{"role": "user", "content": f"Summarize: {plan['content']}"}])
    print("Final Output:", summary["content"])

main()
```

This example shows two @span-wrapped LLM calls under a single @trace. The session metadata ensures everything is tied to the correct user and session in your dashboard.

## LLM Evaluations

### GEval: Custom Evaluation Metrics for LLM Applications

You can automatically evaluate any component of your LLM application by attaching custom evaluation metrics to a span using the @span decorator. This allows you to assess agent responses  with metrics such as factual accuracy, helpfulness, or any custom criteria you define.


```python
# Define evaluation metrics
from agensight.eval.g_eval import GEvalEvaluator

factual_accuracy = GEvalEvaluator(
    name="Factual Accuracy",
    criteria="Evaluate whether the actual output contains factually accurate information based on the expected output.",
    threshold=0.7,
    verbose_mode=True
)

helpfulness = GEvalEvaluator(
    name="Helpfulness",
    criteria="Evaluate whether the output is helpful and addresses the user's input question.",
    threshold=0.6,
    verbose_mode=True,
)

# Attach metrics to your span
@span(name="improve_joke", metrics=[factual_accuracy, helpfulness])
def improve_joke(actual_output, expected_output):
    # ... your logic here ...
    return actual_output

```


Agensight offers a variety of evaluation metrics tailored to different use cases. Our metrics include Task Completion, Tool Correctness, Conversation Completeness, and Conversation Relevancy, each designed to provide specific insights into LLM performance. For more details, visit our [documentation page](https://pype-db52d533.mintlify.app/evaluations/geval).



## Playground

Once your playground is generated, you'll have access to these features:

1. **Agent Configuration**
   - Edit agent prompts and system messages
   - Configure model parameters (temperature, max tokens, etc.)
   - Set up tools and function calls
   - Define agent variables and connections

2. **Workflow Visualization**
   - View your agent workflow as a visual graph
   - Drag and drop to modify agent connections
   - Add or remove agents from the workflow
   - Configure input/output relationships

3. **Prompt Management**
   - Create and edit prompts in real-time
   - Save different versions of prompts
   - Test prompts with sample inputs
   - Compare prompt performance

4. **Tool Configuration**
   - Add or modify tools for your agents
   - Configure tool parameters
   - Test tool functionality
   - Monitor tool usage and performance

Example playground configuration:
```json
{
  "agents": [
    {
      "name": "ResearchAgent",
      "prompt": "You are a research assistant...",
      "modelParams": {
        "model": "gpt-4",
        "temperature": 0.7
      },
      "tools": ["web_search", "document_reader"]
    },
    {
      "name": "SummaryAgent",
      "prompt": "Summarize the following information...",
      "modelParams": {
        "model": "gpt-3.5-turbo",
        "temperature": 0.3
      }
    }
  ],
  "connections": [
    {"from": "ResearchAgent", "to": "SummaryAgent"}
  ]
}
```

All changes made in the playground automatically sync with your codebase, allowing you to:
- Test changes before committing them
- Version control your agent configurations
- Collaborate with team members
- Maintain consistency across environments

## Configuration

### Trace Configuration

| Feature      | Default            | Customizable With  |
|--------------|--------------------|--------------------|
| Project name | `"default"`        | `init(name="...")` |
| Trace name   | Function name      | `@trace("...")`    |
| Span name    | Auto (`Agent 1`, etc.) | `@span(name="...")`|


### Playground Configuration

Agensight uses a configuration file (`agensight.config.json` by default) to define agents, their connections, and parameters.

#### Basic Structure

```json
{
  "agents": [
    {
      "name": "AnalysisAgent",
      "prompt": "You are an expert analysis agent...",
      "variables": ["input_data"],
      "modelParams": {
        "model": "gpt-4o",
        "temperature": 0.2
      }
    },
    {
      "name": "SummaryAgent",
      "prompt": "Summarize the following information...",
      "variables": ["analysis_result"],
      "modelParams": {
        "model": "gpt-3.5-turbo",
        "temperature": 0.7
      }
    }
  ],
  "connections": [
    {"from": "AnalysisAgent", "to": "SummaryAgent"}
  ]
}

```


## Contributing

Open source contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started, coding standards, and our development workflow.

### Development Workflow

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the package in development mode:
   ```bash
   pip install -e .
   ```

### Development Guidelines

- Follow PEP 8 for Python code
- Use snake_case for Python functions and variables
- Use PascalCase for component names in React/TypeScript
- Add type annotations to all Python functions
- Follow Conventional Commits for commit messages

## Roadmap

- JavaScript SDK
- Cloud viewer

## License

MIT License • © 2025 agensight contributors
