from flask import Flask, render_template, request, jsonify, Response, stream_with_context

from ai.graph import graph
from werkzeug.utils import secure_filename
import os
from ai.rag import rag

app = Flask(__name__)


@app.route("/")
def home():

    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():

    user_message = request.json["message"]

    result = graph.invoke({

        "question": user_message

    })

    ai_response = result["answer"]

    return jsonify(

        {

            "response": ai_response

        }

    )

@app.route("/upload", methods=["POST"])
def upload():

    file = request.files["file"]

    filename = secure_filename(file.filename)

    upload_folder = "uploads"

    os.makedirs(upload_folder, exist_ok=True)

    # Remove previous PDFs

    for f in os.listdir(upload_folder):

        if f.endswith(".pdf"):
            os.remove(os.path.join(upload_folder, f))

    save_path = os.path.join(

        upload_folder,

        filename

    )

    file.save(save_path)

    rag.load_document()

    return {

        "message": "PDF uploaded successfully!"
    }
@app.route("/chat_stream", methods=["POST"])
def chat_stream():

    user_message = request.json["message"]

    def generate():

        from ai.graph import stream_graph

        for chunk in stream_graph(user_message):

            yield chunk

    return Response(

        stream_with_context(generate()),

        mimetype="text/plain"

    )
if __name__ == "__main__":

    print("1. Starting Edith...")

    print("2. Loading PDF...")

    if rag.load_document():

        print("3. PDF Loaded")

    else:

        print("⚠ No PDF loaded. Edith will still work without documents.")

    print("4. Starting Flask...")
    app.run(debug=False)