import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..')))

from agensight.eval.test_case import ModelTestCase, ToolCall
from agensight.eval.metrics import TaskCompletionMetric

metric = TaskCompletionMetric(
    threshold=0.8,
    model="gpt-4o-mini",
    include_reason=True
)

test_case = ModelTestCase(
    input="Create a Python script that implements a REST API endpoint for user authentication with JWT tokens.",
    actual_output=(
        "Here's a Flask-based implementation of a JWT authentication endpoint:\n\n"
        "from flask import Flask, request, jsonify\n"
        "import jwt\n"
        "import datetime\n\n"
        "app = Flask(__name__)\n"
        "app.config['SECRET_KEY'] = 'your-secret-key'\n\n"
        "@app.route('/auth/login', methods=['POST'])\n"
        "def login():\n"
        "    auth = request.get_json()\n"
        "    if not auth or not auth.get('username') or not auth.get('password'):\n"
        "        return jsonify({'message': 'Invalid credentials'}), 401\n"
        "    # Add your user verification logic here\n"
        "    token = jwt.encode({'user': auth['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)},\n"
        "                       app.config['SECRET_KEY'])\n"
        "    return jsonify({'token': token})\n"
    ),
    tools_called=[
        ToolCall(
            name="Code Generator",
            description="Generates secure authentication code with best practices.",
            input_parameters={"framework": "Flask", "auth_type": "JWT"},
            output=[
                "Flask application setup",
                "JWT token generation",
                "Login endpoint implementation"
            ],
        ),
        ToolCall(
            name="Security Validator",
            description="Validates security best practices in authentication code.",
            input_parameters={"code_type": "authentication"},
            output=[
                "Secret key configuration",
                "Input validation",
                "Token expiration"
            ],
        ),
    ],
)

# To run metric as a standalone
metric.measure(test_case)
print(metric.score, metric.reason)

