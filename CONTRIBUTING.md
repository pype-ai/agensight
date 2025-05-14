# Contributing to Agensight

Thank you for your interest in contributing to Agensight! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to foster an inclusive and respectful community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment**:
   ```bash
   # Install development dependencies
   pip install -e ".[dev]"
   
   # Install pre-commit hooks
   pre-commit install
   ```

## Development Workflow

### Environment Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the package in development mode:
   ```bash
   pip install -e .
   ```

### Running Tests

Run the test suite:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=agensight tests/
```

### Development Guidelines

#### Code Style

- Follow PEP 8 for Python code
- Use snake_case for Python functions and variables
- Use PascalCase for component names in React/TypeScript
- Add type annotations to all Python functions

#### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and write tests if applicable

3. **Ensure all tests pass**:
   ```bash
   pytest
   ```

4. **Update documentation** if necessary

5. **Commit your changes** with meaningful commit messages:
   ```bash
   git commit -m "feat: Add new feature for xyz"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a pull request** to the main repository's `main` branch

## Project Structure

```
agensight/
├── agensight/         # Main package code
│   ├── cli/           # Command line interface
│   ├── server/        # Backend API server
│   ├── ui/            # Frontend UI code
│   └── utils/         # Utility functions and helpers
├── docs/              # Documentation
├── examples/          # Example implementations
└── tests/             # Test suite
```

## Adding New Features

When adding new features, please:

1. **Discuss first** by opening an issue to discuss your proposed feature
2. **Add tests** that verify your feature works as expected
3. **Update documentation** to reflect your changes
4. **Follow the package structure** and code style guidelines

## Reporting Issues

When reporting issues, please include:

- **A descriptive title** and clear description
- **Steps to reproduce** the issue
- **Expected behavior** vs. actual behavior
- **Your environment** (OS, Python version, package versions)

## Documentation

We use Markdown for documentation. To build the docs locally:

```bash
cd docs
pip install -r requirements.txt
mkdocs serve
```

Then visit http://localhost:8000 to see the documentation site.

## License

By contributing to Agensight, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

Thank you for contributing to Agensight! 