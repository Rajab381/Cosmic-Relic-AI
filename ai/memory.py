conversation = []


def add_message(role, content):

    conversation.append({

        "role": role,

        "content": content

    })


def get_history():

    return conversation