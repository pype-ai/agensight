# Evaluation System Documentation

This evaluation system is built on top of the [deepeval](https://github.com/confident-ai/deepeval) framework, providing a robust and extensible way to evaluate AI model outputs, especially for code generation, technical support, and tool usage scenarios.

---

## Directory Structure

```
agensight/eval/
├── metrics/                # All metric classes (GEval, TaskCompletionMetric, etc.)
│   ├── geval.py
│   ├── task_completion.py
│   ├── tool_correctness.py
│   └── ... (other metrics)
├── test_case.py            # Test case class definitions
├── utils.py                # Utility functions for evaluation
└── ... (other helpers)

examples/evaluations/
├── geval.py                # Example: General evaluation metrics
├── conversational_geval.py # Example: Conversation-specific evaluations
├── task_completion.py      # Example: Task completion evaluations
├── tool_correctness.py     # Example: Tool usage evaluations
└── ... (add your own examples here)
```

---

## Core Components

### 1. Metric Definitions (`agensight/eval/metrics/`)
- **GEvalEvaluator**: General-purpose evaluation metric.
- **TaskCompletionMetric**: Evaluates if a task is completed successfully.
- **ToolCorrectnessMetric**: Checks if the right tools were used.
- **(Add your own metrics here!)**

### 2. Test Case Classes (`agensight/eval/test_case.py`)
- **ModelTestCase**: For single-turn evaluations.
- **ConversationalTestCase**: For multi-turn conversations.
- **(Add your own test case types as needed.)**

### 3. Example Scripts (`examples/evaluations/`)
- Each file demonstrates how to use a metric with a test case.
- Use these as templates for your own evaluations.

---

## How to Add a New Evaluation Metric

1. **Create a New Metric Class**
   - Go to `agensight/eval/metrics/`.
   - Create a new file, e.g., `my_new_metric.py`.
   - Inherit from a base metric class (e.g., `BaseMetric` or `GEvalEvaluator`).
   - Implement the required methods: `measure`, `score`, etc.
   - Add docstrings and comments for clarity.

   ```python
   # agensight/eval/metrics/my_new_metric.py
   from agensight.eval.metrics.base import BaseMetric

   class MyNewMetric(BaseMetric):
       def __init__(self, ...):
           super().__init__(...)
           # Your initialization

       def measure(self, test_case):
           # Your evaluation logic
           return score, reason
   ```

2. **Register the Metric (if needed)**
   - If there is a registry or factory for metrics, add your new metric there.

3. **Write Example Usage**
   - In `examples/evaluations/`, create a new file, e.g., `my_new_metric_example.py`.
   - Show how to use your metric with a test case.

   ```python
   from agensight.eval.metrics.my_new_metric import MyNewMetric
   from agensight.eval.test_case import ModelTestCase

   metric = MyNewMetric(...)
   test_case = ModelTestCase(input=..., actual_output=...)
   metric.measure(test_case)
   print(metric.score, metric.reason)
   ```

4. **Document Your Metric**
   - Add a section to your documentation describing your metric, its purpose, and usage.
   - Include example code and expected outputs.

5. **Testing**
   - Add unit tests in the appropriate test directory (e.g., `tests/eval/metrics/`).
   - Cover edge cases and typical usage.

---

## How to Add a New Test Case Type

1. **Edit or Add to `test_case.py`**
   - Define your new test case class, inheriting from `BaseTestCase` if available.
   - Document the fields and intended use.

2. **Update Example Scripts**
   - Show how to use your new test case type in the `examples/evaluations/` directory.

---

## Best Practices

- **Follow Existing Patterns**: Use the same class structure and naming conventions as existing metrics and test cases.
- **Documentation**: Every class and method should have a clear docstring. Update the main documentation with new features and examples.
- **Testing**: Add test cases for new metrics and test case types. Cover edge cases and real-world scenarios.
- **Examples**: Always provide a minimal, working example for new features in `examples/evaluations/`.
- **Integration**: Ensure compatibility with existing metrics and test cases. Maintain consistent error handling.

---

## Example: Adding a Custom Evaluation Metric

Suppose you want to add a metric for "Code Efficiency":

1. Create `agensight/eval/metrics/code_efficiency.py`:

   ```python
   from agensight.eval.metrics.base import BaseMetric

   class CodeEfficiencyMetric(BaseMetric):
       def __init__(self, threshold=0.8):
           super().__init__(name="Code Efficiency")
           self.threshold = threshold

       def measure(self, test_case):
           # Example: check if code runs within a time limit
           # (Pseudo-code, replace with real logic)
           efficiency_score = run_efficiency_check(test_case.actual_output)
           reason = "Code runs efficiently" if efficiency_score > self.threshold else "Code is slow"
           return efficiency_score, reason
   ```

2. Add an example in `examples/evaluations/code_efficiency_example.py`:

   ```python
   from agensight.eval.metrics.code_efficiency import CodeEfficiencyMetric
   from agensight.eval.test_case import ModelTestCase

   metric = CodeEfficiencyMetric(threshold=0.9)
   test_case = ModelTestCase(input="Write a fast sort function", actual_output="def sort(arr): ...")
   metric.measure(test_case)
   print(metric.score, metric.reason)
   ```

---

## Support and Resources

- [deepeval Documentation](https://github.com/confident-ai/deepeval)
- Example implementations in the `examples/evaluations/` directory
- Team communication channels for questions

---

## Getting Started

1. Review the example implementations in the `examples/evaluations/` directory.
2. Study the code and docstrings in `agensight/eval/`.
3. Start with simple test cases and metrics.
4. Gradually add more complex evaluations.
5. Document your work for the benefit of the team.

---

**For any questions or improvements, please reach out to the team or refer to the deepeval documentation. Happy evaluating!** 