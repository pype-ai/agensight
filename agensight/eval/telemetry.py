from contextlib import contextmanager
import logging
import os
import socket
import sys
from threading import Event
import uuid
import sentry_sdk
from enum import Enum
from typing import List, Dict, Any, Optional, Callable
import requests
from agensight.eval.constants import LOGIN_PROMPT, HIDDEN_DIR, KEY_FILE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Minimal stub implementation - all functions do nothing

class Feature:
    REDTEAMING = "redteaming"
    SYNTHESIZER = "synthesizer"
    EVALUATION = "evaluation"
    GUARDRAIL = "guardrail"
    BENCHMARK = "benchmark"
    CONVERSATION_SIMULATOR = "conversation_simulator"
    UNKNOWN = "unknown"


TELEMETRY_DATA_FILE = ".agensight_telemetry.txt"
TELEMETRY_PATH = os.path.join(HIDDEN_DIR, TELEMETRY_DATA_FILE)


if os.path.exists(KEY_FILE) and not os.path.isdir(HIDDEN_DIR):
    temp_deepeval_file_name = ".deepeval_temp"
    os.rename(KEY_FILE, temp_deepeval_file_name)
    os.makedirs(HIDDEN_DIR, exist_ok=True)
    os.rename(temp_deepeval_file_name, os.path.join(HIDDEN_DIR, KEY_FILE))

os.makedirs(HIDDEN_DIR, exist_ok=True)

if os.path.exists(TELEMETRY_DATA_FILE):
    os.rename(TELEMETRY_DATA_FILE, TELEMETRY_PATH)

if os.path.exists(".agensight-cache.json"):
    os.rename(".agensight-cache.json", f"{HIDDEN_DIR}/.agensight-cache.json")

if os.path.exists("temp_test_run_data.json"):
    os.rename(
        ".temp_test_run_data.json", f"{HIDDEN_DIR}/.temp_test_run_data.json"
    )

#########################################################
### Telemetry Config ####################################
#########################################################


def telemetry_opt_out():
    return os.getenv("DEEPEVAL_TELEMETRY_OPT_OUT") == "YES"


def blocked_by_firewall():
    try:
        socket.create_connection(("www.google.com", 80))
        return False
    except OSError:
        return True


def get_anonymous_public_ip():
    try:
        response = requests.get("https://api.ipify.org", timeout=5)
        if response.status_code == 200:
            return response.text
    except requests.RequestException:
        pass
    return None


anonymous_public_ip = None

if not telemetry_opt_out():
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
        OTLPSpanExporter,
    )

    anonymous_public_ip = get_anonymous_public_ip()
    sentry_sdk.init(
        dsn="https://5ef587d58109ee45d6544f3657efdd1f@o4506098477236224.ingest.sentry.io/4506098479136768",
        profiles_sample_rate=1.0,
        traces_sample_rate=1.0,  # For performance monitoring
        send_default_pii=False,  # Don't send personally identifiable information
        attach_stacktrace=False,  # Don't attach stack traces to messages
        default_integrations=False,  # Disable Sentry's default integrations
    )

    # Set up the Tracer Provider
    trace.set_tracer_provider(TracerProvider())
    tracer_provider = trace.get_tracer_provider()

    # New Relic License Key and OTLP Endpoint
    NEW_RELIC_LICENSE_KEY = "1711c684db8a30361a7edb0d0398772cFFFFNRAL"
    NEW_RELIC_OTLP_ENDPOINT = "https://otlp.nr-data.net:4317"
    otlp_exporter = OTLPSpanExporter(
        endpoint=NEW_RELIC_OTLP_ENDPOINT,
        headers={"api-key": NEW_RELIC_LICENSE_KEY},
    )

    # Add the OTLP exporter to the span processor
    span_processor = BatchSpanProcessor(otlp_exporter)
    tracer_provider.add_span_processor(span_processor)

    logging.getLogger("opentelemetry.exporter.otlp").setLevel(logging.CRITICAL)

    # Create a tracer for your application
    tracer = trace.get_tracer(__name__)

if (
    os.getenv("ERROR_REPORTING") == "YES"
    and not blocked_by_firewall()
    and not os.getenv("TELEMETRY_OPT_OUT")
):

    def handle_exception(exc_type, exc_value, exc_traceback):
        print({"exc_type": exc_type, "exc_value": exc_value})
        sentry_sdk.capture_exception(exc_value)
        sys.__excepthook__(exc_type, exc_value, exc_traceback)

    sys.excepthook = handle_exception


def is_running_in_jupyter_notebook():
    try:
        from IPython import get_ipython

        if "IPKernelApp" in get_ipython().config:
            return True
    except Exception:
        pass
    return False


IS_RUNNING_IN_JUPYTER = (
    "jupyter" if is_running_in_jupyter_notebook() else "other"
)

#########################################################
### Context Managers ####################################
#########################################################


# Empty context managers
@contextmanager
def capture_metric_type(metric_name: str, async_mode: bool, in_component: bool, _track: bool = True):
    yield

@contextmanager
def capture_evaluation_run(type: str):
    yield

@contextmanager
def capture_recommend_metrics():
    yield

@contextmanager
def capture_synthesizer_run(method: str, max_generations: int, num_evolutions: int, evolutions: Dict):
    yield

@contextmanager
def capture_conversation_simulator_run(num_conversations: int):
    yield

@contextmanager
def capture_red_teamer_run(attacks_per_vulnerability_type: int, vulnerabilities: List[str], attack_enhancements: Dict):
    yield

@contextmanager
def capture_guardrails(guards: List[str]):
    yield

@contextmanager
def capture_benchmark_run(benchmark: str, num_tasks: int):
    yield

@contextmanager
def capture_login_event():
    yield

@contextmanager
def capture_pull_dataset():
    yield

@contextmanager
def capture_send_trace():
    yield

#########################################################
### Helper Functions ####################################
#########################################################


def read_telemetry_file() -> dict:
    """Reads the telemetry data file and returns the key-value pairs as a dictionary."""
    if not os.path.exists(TELEMETRY_PATH):
        return {}
    with open(TELEMETRY_PATH, "r") as file:
        lines = file.readlines()
    data = {}
    for line in lines:
        key, _, value = line.strip().partition("=")
        data[key] = value
    return data


def write_telemetry_file(data: dict):
    """Writes the given key-value pairs to the telemetry data file."""
    with open(TELEMETRY_PATH, "w") as file:
        for key, value in data.items():
            file.write(f"{key}={value}\n")


# Empty functions
def get_status() -> str:
    return "active"

def get_unique_id() -> str:
    return "disabled-telemetry"

def get_last_feature():
    return Feature.UNKNOWN

def set_last_feature(feature):
    pass

def get_feature_status(feature) -> str:
    return "disabled"

def set_logged_in_with(logged_in_with: str):
    pass

def get_logged_in_with():
    return "disabled"
