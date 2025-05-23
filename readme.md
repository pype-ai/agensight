![Screenshot 2025-05-23 at 3 38 12 PM](https://github.com/user-attachments/assets/62fcd28d-0f65-4557-af6e-afb9fbd80960)


<div align="center">
   <div>
      <h3>
         <a href="https://app.pypeai.com/">
            <strong>Cloud</strong>
         </a> · 
         <a href="https://www.youtube.com/watch?v=eunL3IFSIB8">
            <strong>Demo</strong>
         </a> .
        <a href="https://pype-db52d533.mintlify.app/introduction"><strong>Docs</strong></a>
      </h3>
   </div>
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
   <a href="https://pypi.org/project/agensight/0.4.8/">
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







## Features

- Auto-instrumented tracing for LLM calls
- Local development mode for offline trace inspection
- Customizable trace and span naming
- Token usage tracking
- Experimental prompt playground
- Maintain the prompt versions

## Security & Local Storage

- All data stored locally inside the SDK
- No data uploaded or tracked externally
- Prompts versions stored locally in `.agensight` file
- Recommended: Run in isolated virtual environments

## Quick Start

Requires Python ≥3.10

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install package
pip install agensight
agensight view 
```

Your dashboard will open at localhost:5001.



## Agent Observability Setup

<A line about traces and spans>
<A picture of the session view>

```python
from agensight import init, trace, span
import openai

init(name="my-llm-app")  # Optional project name

@trace("plan_generation")
def main():
    @span()
    def call_llm():
        return openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Tell me a joke"}]
        )
    response = call_llm()
    print(response.choices[0].message.content)

if __name__ == "__main__":
    main()
```

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



## Playground Setup

To set up the agent playground, we provide an MCP server that, when integrated with Cursor or Windsurf, visually maps your agent workflows. It explores your codebase using Cursor or Windsurf and generates an editable agent workflow configuration (JSON file). You can then visualize your agent workflows in the studio by simply running `agensight view` in your terminal.

```bash
# One time setup for agensight MCP
# Clone the repository
git clone https://github.com/pype-ai/agensight_mcpserver.git
cd agensight_mcpserver

# Create a virtual environment
python -m venv mcp-env
source mcp-env/bin/activate  # On Windows: mcp-env\Scripts\activate

# Install dependencies
pip install requirements.txt
```

### MCP Server Configuration (for Claude/Cursor)

```json
{
  "mcpServers": {
    "sqlite-server": {
      "command": "/path/to/agensight_mcpserver/mcp-env/bin/python",
      "args": [
        "/path/to/agensight_mcpserver/server.py"
      ],
      "description": "tool to generate agensight config"
    }
  }
}
```

In your Cursor chatbot, enter:

```
Please analyze this codebase using the generateAgensightConfig MCP tool
```

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
