from setuptools import setup, find_packages
import os
import sys
from pathlib import Path

# Read version from version.py or environment
def get_version():
    version_file = Path(__file__).parent / "agensight" / "_version.py"
    if version_file.exists():
        exec(open(version_file).read())
        return locals()['__version__']
    else:
        return os.getenv('PACKAGE_VERSION', '0.5.4')

# Read long description
def get_long_description():
    readme_path = Path(__file__).parent / "readme.sdk.md"
    if readme_path.exists():
        with open(readme_path, "r", encoding="utf-8") as fh:
            return fh.read()
    return "A Python SDK for logging and visualizing OpenAI agent interactions"

# Read requirements from requirements.txt if it exists
def get_requirements():
    requirements_path = Path(__file__).parent / "requirements.txt"
    if requirements_path.exists():
        with open(requirements_path, "r") as f:
            return [line.strip() for line in f if line.strip() and not line.startswith("#")]
    
    # Fallback to hardcoded requirements
    return [
        "openai",
        "requests",
        "flask",
        "nest_asyncio",
        "flask_cors",
        "fastapi",
        "uvicorn",
        "ragas",
        "sqlalchemy",
        "pydantic",
        "starlette",
        "typing-extensions",
        "python-multipart",
        "werkzeug",
        "jinja2",
        "aiofiles",
        "click",
        "opentelemetry-sdk",
        "opentelemetry-api",
        "opentelemetry-instrumentation",
        "opentelemetry-instrumentation-openai",
        "anthropic",
        "scikit-learn>=1.0.0",
        "pandas>=1.3.0",
        "numpy>=1.20.0",
        "google-generativeai",  # For Gemini model support
        "anthropic",  # For Claude model support
        "retry",  # For retry functionality
        "rich", 
    ]

# Ensure UI is built
def ensure_ui_built():
    ui_build_path = Path(__file__).parent / "agensight" / "_ui" / "build"
    if not ui_build_path.exists():
        print("Warning: UI build directory not found. Run 'npm run build' in agensight/_ui first.")

ensure_ui_built()

setup(
    name="agensight",
    version=get_version(),
    author="Pype",
    author_email="deepesh@pypeai.com",
    description="A Python SDK for logging and visualizing OpenAI agent interactions, with a built-in CLI and web dashboard.",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    url="https://github.com/pype-ai/agensight",
    license="MIT",  # Use this instead of license-file
    project_urls={
        "Bug Tracker": "https://github.com/pype-ai/agensight/issues",
        "Documentation": "https://pype-db52d533.mintlify.app/introduction",
        "Source Code": "https://github.com/pype-ai/agensight",
    },
    packages=find_packages(),
    install_requires=get_requirements(),
    entry_points={
        "console_scripts": [
            "agensight=cli.main:main",
        ],
    },
    python_requires=">=3.10",
    include_package_data=True,
    package_data={
        "agensight": [
            "_ui/build/**/*",
            "templates/**/*",
            "static/**/*",
        ],
    },
    extras_require={
        'dev': [
            'pytest>=7.0.0',
            'pytest-cov>=4.0.0',
            'black>=23.0.0',
            'isort>=5.12.0',
            'flake8>=6.0.0',
            'mypy>=1.0.0',
        ],
        'optional': [
            'Dbias',
            'allennlp',
        ],
        'test': [
            'pytest>=7.0.0',
            'pytest-asyncio>=0.21.0',
            'pytest-mock>=3.10.0',
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="openai, ai, agents, logging, visualization, sdk, cli, dashboard",
    zip_safe=False,
)