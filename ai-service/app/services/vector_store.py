import os
import joblib
import numpy as np
from typing import List, Dict, Any
from app.config.settings import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

STORE_FILE = os.path.join(settings.VECTOR_DB_DIR, "vector_store.joblib")

# Global in-memory registry of indexed chunks
# Structure: List of dicts -> {"file_name": str, "category": str, "text": str, "embedding": np.ndarray or None}
_chunk_registry: List[Dict[str, Any]] = []
_encoder_model = None

def load_encoder():
    """Tries to load sentence-transformers encoder. If not installed, falls back to TF-IDF."""
    global _encoder_model
    if _encoder_model is not None:
        return _encoder_model
        
    try:
        from sentence_transformers import SentenceTransformer
        # Load small, high-performance model
        logger_info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        _encoder_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger_info("SentenceTransformer model successfully loaded.")
    except Exception as e:
        logger_info(f"SentenceTransformer not available ({e}). Using scikit-learn TF-IDF matching fallback.")
        _encoder_model = "TFIDF"
    return _encoder_model

def load_store():
    """Loads indexed chunks from local joblib file."""
    global _chunk_registry
    if os.path.exists(STORE_FILE):
        try:
            _chunk_registry = joblib.load(STORE_FILE)
            logger_info(f"Loaded {_chunk_registry} chunks from local vector store registry.")
        except Exception as e:
            logger_info(f"Failed to load vector store file: {e}. Starting with empty registry.")
            _chunk_registry = []
    else:
        _chunk_registry = []

def save_store():
    """Saves indexed chunks to local joblib file."""
    try:
        joblib.dump(_chunk_registry, STORE_FILE)
    except Exception as e:
        print(f"Failed to persist vector store file: {e}")

def index_document_chunks(file_name: str, category: str, chunks: List[str]):
    """Embeds and indexes a list of text chunks for a document."""
    global _chunk_registry
    # Remove existing chunks for this file if any
    delete_document_chunks(file_name)
    
    encoder = load_encoder()
    
    new_entries = []
    for chunk in chunks:
        embedding = None
        if encoder != "TFIDF" and encoder is not None:
            try:
                embedding = encoder.encode(chunk)
            except Exception as e:
                print(f"Failed to generate sentence embedding: {e}")
                
        new_entries.append({
            "file_name": file_name,
            "category": category,
            "text": chunk,
            "embedding": embedding
        })
        
    _chunk_registry.extend(new_entries)
    save_store()
    logger_info(f"Indexed {len(chunks)} chunks for document: {file_name}")

def delete_document_chunks(file_name: str):
    """Deletes all chunks associated with a document name."""
    global _chunk_registry
    before_len = len(_chunk_registry)
    _chunk_registry = [entry for entry in _chunk_registry if entry["file_name"] != file_name]
    if len(_chunk_registry) != before_len:
        save_store()
        logger_info(f"Deleted chunks for document: {file_name} from vector store.")

def search_knowledge(query: str, top_k: int = settings.TOP_K_RESULTS) -> List[Dict[str, Any]]:
    """Performs semantic search across indexed chunks using cosine similarity."""
    global _chunk_registry
    load_store()
    
    if not _chunk_registry:
        return []
        
    encoder = load_encoder()
    
    # Mode 1: Sentence Transformers Cosine Similarity
    if encoder != "TFIDF" and encoder is not None:
        try:
            query_vector = encoder.encode(query).reshape(1, -1)
            scores = []
            for entry in _chunk_registry:
                if entry["embedding"] is not None:
                    chunk_vector = entry["embedding"].reshape(1, -1)
                    score = float(cosine_similarity(query_vector, chunk_vector)[0][0])
                    scores.append((score, entry))
                else:
                    scores.append((0.0, entry))
                    
            scores.sort(key=lambda x: x[0], reverse=True)
            results = []
            for score, entry in scores[:top_k]:
                if score >= 0.35: # Cosine similarity threshold for relevance
                    results.append({
                        "text": entry["text"],
                        "file_name": entry["file_name"],
                        "category": entry["category"],
                        "score": round(score, 4)
                    })
            return results
        except Exception as e:
            print(f"Error doing sentence vector search: {e}. Falling back to TF-IDF.")
            
    # Mode 2: Fallback TF-IDF Cosine Similarity
    try:
        texts = [entry["text"] for entry in _chunk_registry]
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(texts)
        query_vector = vectorizer.transform([query])
        
        scores = cosine_similarity(query_vector, tfidf_matrix)[0]
        ranked_indices = np.argsort(scores)[::-1]
        
        results = []
        for idx in ranked_indices[:top_k]:
            score = float(scores[idx])
            if score >= 0.05: # Lower threshold for sparse vector TF-IDF overlap
                entry = _chunk_registry[idx]
                results.append({
                    "text": entry["text"],
                    "file_name": entry["file_name"],
                    "category": entry["category"],
                    "score": round(score, 4)
                })
        return results
    except Exception as e:
        print(f"Error during TF-IDF search fallback: {e}")
        return []

def logger_info(msg: str):
    print(f"[Vector Store] {msg}")

# Initial load of store on import
load_store()
