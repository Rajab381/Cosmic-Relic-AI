from ai.router import classify_question

while True:

    question = input("> ")

    print(classify_question(question))