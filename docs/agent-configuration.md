# Agent Configuration

This document explains how to configure and track your agents with Agensight.

## Configuration File

Agensight uses a configuration file to define agents, their connections, and parameters. By default, it looks for `agensight.config.json` in your project root.

### Basic Structure

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

## Agent Properties

Each agent in the configuration has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier for the agent |
| `prompt` | string | Base prompt template |
| `variables` | array | List of input variables |
| `modelParams` | object | Parameters for the LLM model |
| `metadata` | object | Optional metadata |

### Model Parameters

The `modelParams` object can include:

- `model`: The model to use (e.g., "gpt-4o", "claude-3-opus")
- `temperature`: Sampling temperature (0.0-2.0)
- `maxTokens`: Maximum tokens in the response
- `topP`: Nucleus sampling parameter
- `frequencyPenalty`: Penalty for token frequency
- `presencePenalty`: Penalty for token presence

## Connections

Connections define how agents interact with each other:

```json
{
  "connections": [
    {
      "from": "AgentA",
      "to": "AgentB",
      "variable": "result"
    }
  ]
}
```

This means the output from `AgentA` will be passed to `AgentB` as the variable `result`.

```