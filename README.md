# EDITH AI

> **Even Dead, I Am The Hero**

A modern Local AI Operating System built using **Python, Flask, LangGraph, Ollama, Retrieval-Augmented Generation (RAG), and Llama 3.2**.

EDITH is designed to function as a private desktop AI assistant capable of intelligent conversations, document understanding, tool execution, and local inference without relying on cloud APIs.

---

## Preview

<img width="100%" src="assets/edith-preview.png">

---

# Features

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

### Modern UI

Inspired by Marvel's EDITH AI.

Features

- Futuristic holographic interface
- Animated AI Core
- Boot sequence
- Productivity mode
- Streaming response animation
- Responsive layout
- Cyberpunk visual effects

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

# Author

## Rajab Ghufran

Robotics & AI Engineering Student

University of Management & Technology (UMT)

Lahore, Pakistan

LinkedIn

https://linkedin.com/in/rajab-ghufran

GitHub

https://github.com/Rajab381

---

# Inspiration

Inspired by Marvel's **EDITH** system from Iron-Man while combining modern AI engineering practices including LangGraph, Retrieval-Augmented Generation, and Local LLM deployment.

---

# License

MIT License