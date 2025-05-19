#!/usr/bin/env python
"""
Test runner script that adds the correct paths to PYTHONPATH
and runs the tests.
"""
import os
import sys

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.append(project_root)

# Import and run tests
from agensight.eval.tests.test_geval import test_evaluate_with_multiple_metrics

if __name__ == "__main__":
    print("Running evaluation tests...")
    test_evaluate_with_multiple_metrics()
    print("\nAll tests completed.") 