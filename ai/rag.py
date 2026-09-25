from pathlib import Path

from pypdf import PdfReader

from sentence_transformers import util

from ai.embeddings import create_embeddings
from ai.embeddings import create_query_embedding


class RAGEngine:

    def __init__(self):

        self.text = ""

        self.chunks = []

        self.embeddings = None

        self.loaded = False


    def load_document(self):

        upload_folder = Path("Uploads" if Path("Uploads").is_dir() else "uploads")

        pdf_files = list(upload_folder.glob("*.pdf"))

        if not pdf_files:
            print("[!] No PDF Found")

            self.loaded = False

            return False

        pdf_path = max(

            pdf_files,

            key=lambda f: f.stat().st_mtime

        )

        if not pdf_path.exists():
            print("[!] PDF NOT FOUND")

            print(pdf_path)

            return False

        reader = PdfReader(pdf_path)

        self.text = ""

        for page in reader.pages:

            extracted = page.extract_text()

            if extracted:

                self.text += extracted + "\n"

        self.chunk_text()

        self.embeddings = create_embeddings(self.chunks)

        self.loaded = True

        print("[+] PDF Loaded")

        return True


    def chunk_text(self):

        chunk_size = 500

        overlap = 100

        start = 0

        self.chunks = []

        while start < len(self.text):

            end = start + chunk_size

            self.chunks.append(

                self.text[start:end]

            )

            start += chunk_size - overlap


    def search(self, question):

        if not self.loaded:

            return None

        query_embedding = create_query_embedding(question)

        scores = util.cos_sim(

            query_embedding,

            self.embeddings

        )[0]
        best_score = scores.max().item()

        print(f"Best Similarity: {best_score:.3f}")

        k = min(3, len(self.chunks))

        if k == 0:
            return None

        if best_score < 0.40:
            print("❌ No relevant document context found")

            return None

        top_indices = scores.topk(3).indices.tolist()

        context = ""

        for index in top_indices:
            context += self.chunks[index]

            context += "\n\n"
        print("=" * 60)
        print("TOP CHUNKS RETRIEVED")
        print("=" * 60)

        for index in top_indices:
            print(f"\nChunk {index}\n")

            print(self.chunks[index][:300])

        print("=" * 60)
        return context


rag = RAGEngine()