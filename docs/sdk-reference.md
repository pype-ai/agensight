# 🛰️ agensight

**Observability SDK for LLM workflows — trace, debug, and optimize your prompts.**

`agensight` makes it easy to monitor and debug large language model (LLM) interactions during development. It captures structured traces, supports local inspection, and provides a plug-and-play experience with minimal config.

> ✅ Python SDK (JS coming soon)  
> 🔍 Traces every LLM call with context  
> 🧪 Built-in local prompt playground  
> 🛠️ Developer-first observability for OpenAI & more

---

## 📦 Installation

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Then install:

```bash
pip install agensight
```

> ⚠️ It's strongly recommended to use a virtual environment.

---

## ⚙️ Quick Example

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

---

## 🔍 Features

- ✅ Auto-instrumented tracing for LLM calls
- 🧪 Local dev mode — inspect traces offline
- ✨ Customizable trace and span naming
- 📊 Token usage tracking
- 🧰 Experimental prompt playground

---

## 🔧 Configuration

| Feature              | Default                     | Customizable With         |
|----------------------|-----------------------------|----------------------------|
| Project name         | `"default"`                 | `init(name="...")`        |
| Trace name           | Function name               | `@trace("...")`           |
| Span name            | Auto (`Agent 1`, etc.)      | `@span(name="...")`       |

---

## 🔐 Security & Local Storage

- All data is stored locally inside the SDK.
- No data is uploaded or tracked externally.
- Recommended: run in isolated virtual environments.

---

## 🤝 Contributing

Open source & contributions welcome!  
Open an issue or submit a PR via GitHub.

---

## 📌 Coming Soon

- JS SDK  
- Cloud viewer  

---

## 📎 License

MIT License • © 2025 agensight contributors
