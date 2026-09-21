import re


def detect_tool(question):

    question = question.lower()

    # Addition

    match = re.search(

        r"add (\d+) and (\d+)",

        question

    )

    if match:

        return {

            "tool": "add",

            "a": float(match.group(1)),

            "b": float(match.group(2))

        }

    # Multiplication

    match = re.search(

        r"multiply (\d+) by (\d+)",

        question

    )

    if match:

        return {

            "tool": "multiply",

            "a": float(match.group(1)),

            "b": float(match.group(2))

        }

    return None