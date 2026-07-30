from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models import KnowledgeChunk

class VectorStore:
    def search_similar_chunks(self, db: Session, query: str, top_k: int = 3):
        # Fetch all chunks from database
        chunks = db.query(KnowledgeChunk).all()
        if not chunks:
            return []
            
        corpus = [chunk.chunk_text for chunk in chunks]
        
        try:
            # Fit TF-IDF Vectorizer
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(corpus)
            query_vector = vectorizer.transform([query])
            
            # Compute cosine similarity
            similarities = cosine_similarity(query_vector, tfidf_matrix)[0]
            
            # Rank similarity
            ranked_indices = similarities.argsort()[::-1]
            
            results = []
            for idx in ranked_indices:
                if similarities[idx] < 0.05: # Minimum threshold match
                    continue
                chunk = chunks[idx]
                results.append({
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "file_name": chunk.document.file_name if chunk.document else "Unknown Document",
                    "text": chunk.chunk_text,
                    "score": float(similarities[idx])
                })
                if len(results) >= top_k:
                    break
            return results
        except Exception as e:
            print(f"Error performing TF-IDF vector search: {e}")
            return []

vector_store = VectorStore()
