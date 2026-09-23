### AI Chat

- Local Llama 3.2 inference
- Streaming responses
- Markdown rendering
- Code syntax highlighting

---

### Document Intelligence (RAG)

- Upload PDF files
- Semantic search
- Resume analysis
- Certificate evaluation
- Cover letter review
- Question answering from uploaded documents

---

### AI Routing

Automatically determines whether a request should be handled by

- General LLM
- Document Search (RAG)
- Tool Execution

using LangGraph.

---

### Built-in Tools

Current tools include

- Calculator
- Arithmetic operations

Tool architecture is modular and easily extendable.

---

### Memory

Conversation history is stored during runtime to maintain context.

---

# Tech Stack

Frontend

- HTML
- CSS
- JavaScript

Backend

- Flask
- Python

AI

- Ollama
- Llama 3.2
- LangGraph
- Sentence Transformers
- FAISS
- RAG Pipeline

Libraries

- Highlight.js
- Marked.js

---

# Architecture

```
User

↓

Flask API

↓

LangGraph Router

├── Chat

├── RAG

└── Tools

↓

Llama 3.2 (Ollama)

↓

Streaming Response

↓

Frontend
```

---

# Project Structure

```
Edith-AI/

├── ai/
│   ├── graph.py
│   ├── graph_stream.py
│   ├── rag.py
│   ├── router.py
│   ├── llm.py
│   ├── memory.py
│   └── tools/
│
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
├── templates/
│   └── index.html
│
├── uploads/
│
├── app.py
│
└── README.md
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/edith-ai.git
```

Open the project

```bash
cd edith-ai
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run Ollama

```bash
ollama run llama3.2:3b
```

Start Flask

```bash
python app.py
```

Open

```
http://127.0.0.1:5000
```

---

# Current Capabilities

- Local LLM Chat
- PDF Upload
- Resume Review
- Cover Letter Analysis
- Certificate Evaluation
- RAG Search
- LangGraph Routing
- Streaming Responses
- Tool Calling
- Runtime Memory

---

# Roadmap

## Version 1.1

- Voice Input
- Speech-to-Text

## Version 2

- Long-term Memory
- Vision Model
- Image Understanding
- Multi-document Chat
- Internet Search
- Agentic Tool Calling
- Calendar
- Email Assistant
- Local Automation

---


---

# License

MIT License
