import os
import re
import ollama

os.environ.setdefault("OLLAMA_HOST", "http://127.0.0.1:11434")


def classify_question(question):

    question_lower = question.lower()

    # -------------------------
    # FAST TOOL DETECTION
    # -------------------------

    tool_pattern = re.compile(
        r"(\d+\s*[\+\-\*/]\s*\d+)"
        r"|(\badd\b)"
        r"|(\bplus\b)"
        r"|(\bsum\b)"
        r"|(\bsubtract\b)"
        r"|(\bminus\b)"
        r"|(\bmultiply\b)"
        r"|(\btimes\b)"
        r"|(\bdivide\b)"
        r"|(\bcalculate\b)",
        re.IGNORECASE
    )

    if tool_pattern.search(question):
        return "TOOL"

    # -------------------------
    # FAST DOCUMENT DETECTION
    # -------------------------

    if any(word in question_lower for word in [

        "pdf",
        "document",
        "file",
        "certificate",
        "worksheet",
        "chapter",
        "resume",
        "cv",
        "uploaded"

    ]):
        return "DOCUMENT"

    # -------------------------
    # Otherwise ask the LLM
    # -------------------------

    prompt = f"""
You are the routing engine of Cosmic Relic AI.

Return ONLY ONE WORD.

Possible answers:

CHAT
DOCUMENT
TOOL

Question:

{question}
"""

    response = ollama.chat(

        model="llama3.2:3b",

        messages=[

            {
                "role": "user",
                "content": prompt
            }

        ]

    )

    return response["message"]["content"].strip().upper()