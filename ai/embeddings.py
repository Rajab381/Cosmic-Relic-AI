from sentence_transformers import SentenceTransformer

embedding_model = None


def get_model():

    global embedding_model

    if embedding_model is None:

        print("Loading Embedding Model...")

        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

        print("Embedding Model Loaded")

    return embedding_model


def create_embeddings(chunks):

    model = get_model()

    return model.encode(chunks)


def create_query_embedding(query):

    model = get_model()

    return model.encode(query)