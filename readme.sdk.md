# Agensight SDK

A simple SDK for tracing and evaluating AI agent workflows.

## Installation

```bash
pip install --upgrade agensight
```

## Quick Start

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

## Key Features

### 1. Tracing
- Auto-instrumented tracing of LLM calls
- Function execution tracking
- Agent interaction monitoring
- Performance metrics and token usage analytics

### 2. Evaluation
```python
from agensight.eval.metrics import GEvalEvaluator

# Create custom evaluator
accuracy = GEvalEvaluator(
    name="Accuracy",
    criteria="Evaluate response accuracy",
    threshold=0.7
)

# Use in your code
@span(metrics=[accuracy])
def my_function():
    # Your code here
    pass
```

### 3. Local Storage
- All data stored locally in `.agensight`
- No external data uploads
- Complete privacy and control

## Dashboard

Start the dashboard to view traces and metrics:
```bash
agensight view
```
Visit http://localhost:5001 in your browser

## Documentation

For detailed documentation, visit our [docs](https://pype-db52d533.mintlify.app/introduction).

## Support

Join our [GitHub Discussions](https://github.com/pype-ai/agensight/discussions) for support and feature requests.

## License

MIT License • © 2025 agensight contributors 