# Contributing to Agensight

Thank you for your interest in contributing to Agensight! We appreciate your help in making the project better.

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to foster an inclusive and respectful community.

---

## 🚀 Getting Started

### Development Environment

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install the package in development mode**:
   ```bash
   # Install development dependencies
   pip install -e ".[dev]"
   
   # Install pre-commit hooks
   pre-commit install
   ```

### Branching

Please create branches following this naming convention:

```
<prefix>/<issue-number>-short-description
```

Where `<prefix>` is one of:

- `feat` — for new features  
- `fix` — for bug fixes  
- `chore` — maintenance and config  
- `docs` — documentation changes  
- `refactor` — code restructuring  
- `test` — adding or updating tests  
- `ci` — continuous integration related

Example branch names:

```
feat/42-login-flow
fix/105-typo-on-dashboard
```

---

## 🐛 Issues

We use the following issue types (labels):

- `bug` — Something isn't working  
- `feature` — New feature requests  
- `enhancement` — Improvements to existing features  
- `documentation` — Documentation updates  
- `question` — General questions  
- `good first issue` — Great for newcomers  
- `help wanted` — Needs community assistance  
- `needs discussion` — Requires further input  

Please use the provided issue templates when opening new issues to help us understand and triage them quickly.

---

## 💡 Before Starting Work

If you want to work on a **large or complex change**, please open an issue first or start a discussion. This helps avoid duplicated work and ensures alignment with project goals.

---

## 🧪 Running Tests

Run the test suite:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=agensight tests/
```

---

## 🔧 Pull Requests

### PR Title

Make sure your PR title is **clear and descriptive**, explaining what the change does.

Examples:

- `Fix: Evaluation page layout`  
- `Add: onboarding flow for new users`  
- `Improve: loading speed of traces table`

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

### PR Template

When creating a PR, please use the following template:

```md
## 🔗 Issue

Closes #<issue-number>

---

## ✨ Summary

<!-- Provide a short summary of the changes -->

---

## 🖼️ Screenshots (if UI changes)

<!-- Add before/after screenshots -->

---

## 🧪 Steps to Test

1. Go to '...'
2. Click on '...'
3. Verify that '...'

---

## ✅ Checklist

- [ ] My code builds and runs locally
- [ ] I added/updated tests
- [ ] I updated relevant documentation
- [ ] I linked the issue correctly (`Closes #issue-id`)
```

This template will be automatically applied to all new pull requests.

---

## 🛠 Code Quality

- Please run linting and formatting checks locally before submitting your code (e.g., `npm run lint`).
- Write tests for your changes where applicable.
- Follow these code style guidelines:
  - **Python**: Follow PEP 8, use snake_case for functions and variables, add type annotations
  - **React/TypeScript**: Use PascalCase for component names

---

## 📋 Project Structure

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

---

## 📚 Documentation

We use Markdown for documentation. To build the docs locally:

```bash
cd docs
pip install -r requirements.txt
mkdocs serve
```

Then visit http://localhost:8000 to see the documentation site.

---

## 📦 Releases and Changelogs

Maintainers handle changelog updates, version bumps, and major documentation changes. Contributors do not need to worry about this.

---

## 📋 Future Improvements (TODOs)

- Enforce **conventional commit messages** for better changelog generation  
- Add **CI checks** for automated linting and tests  
- Update **Code of Conduct** to ensure a welcoming community  

---

## 📄 License

By contributing to Agensight, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

Thank you for contributing to Agensight!  
We appreciate your time and effort.

---

*— The Agensight Team*