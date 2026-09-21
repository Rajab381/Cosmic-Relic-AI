from typing import TypedDict

from langgraph.graph import StateGraph, END
from ai.router import classify_question
from ai.rag import rag
from ai.llm import ask_llm, ask_llm_stream
from ai.memory import add_message, get_history

from ai.tools.tool_router import detect_tool
from ai.tools.calculator import add, multiply


class AgentState(TypedDict):
    question: str
    answer: str
    context: str | None
    route: str


def router_node(state):

    # No PDF loaded
    if not rag.loaded:

        route = classify_question(state["question"])

        return {

            "question": state["question"],

            "route": route.lower(),

            "context": None

        }

    # PDF loaded → search it
    context = rag.search(state["question"])

    # Relevant context found
    if context:

        return {

            "question": state["question"],

            "route": "document",

            "context": context

        }

    # No relevant document context
    route = classify_question(state["question"])

    return {

        "question": state["question"],

        "route": route.lower(),

        "context": None

    }
# -----------------------------
# Chat Node
# -----------------------------
def chat_node(state):

    add_message("user", state["question"])

    history = get_history()

    response = ask_llm(history)

    add_message("assistant", response)

    return {
        "answer": response
    }


# -----------------------------
# Tool Node
# -----------------------------
def tool_node(state):

    tool = detect_tool(state["question"])

    if tool["tool"] == "add":
        result = add(tool["a"], tool["b"])

    elif tool["tool"] == "multiply":
        result = multiply(tool["a"], tool["b"])

    else:
        result = "Unknown Tool"

    return {
        "answer": str(result)
    }


# -----------------------------
# Document Node
# -----------------------------
def document_node(state):

    add_message("user", state["question"])

    messages = [

        {

            "role": "user",

            "content": state["question"]

        }

    ]

    response = ask_llm(

        messages,

        context=state["context"]

    )

    add_message("assistant", response)

    return {

        "answer": response

    }
# -----------------------------
# Build Graph
# -----------------------------
builder = StateGraph(AgentState)

builder.add_node("router", router_node)
builder.add_node("chat", chat_node)
builder.add_node("document", document_node)
builder.add_node("tool", tool_node)

builder.set_entry_point("router")


# -----------------------------
# Route Selector
# -----------------------------
def choose_route(state):
    return state["route"]


builder.add_conditional_edges(
    "router",
    choose_route,
    {
        "chat": "chat",
        "document": "document",
        "tool": "tool"
    }
)

builder.add_edge("chat", END)
builder.add_edge("document", END)
builder.add_edge("tool", END)

graph = builder.compile()

def stream_graph(question):

    # -----------------------------
    # Decide route
    # -----------------------------

    if not rag.loaded:

        history = get_history()

        history.append({

            "role": "user",

            "content": question

        })

        for chunk in ask_llm_stream(history):

            yield chunk

        return

    # -----------------------------
    # Search document
    # -----------------------------

    context = rag.search(question)

    # Document found
    if context:

        prompt = [

            {

                "role": "user",

                "content": question

            }

        ]

        for chunk in ask_llm_stream(prompt, context):

            yield chunk

    else:

        messages = get_history() + [

            {

                "role": "user",

                "content": question

            }

        ]

        full_response = ""

        for chunk in ask_llm_stream(messages):
            full_response += chunk

            yield chunk

        add_message("user", question)

        add_message("assistant", full_response)