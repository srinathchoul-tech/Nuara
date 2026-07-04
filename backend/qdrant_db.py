import os
import re
from qdrant_client import QdrantClient
from backend.database import get_db_connection as get_sqlite_conn

QDRANT_HOST = os.getenv("QDRANT_HOST", "http://localhost:6333")

def get_qdrant_client():
    try:
        client = QdrantClient(url=QDRANT_HOST)
        return client, False
    except Exception:
        return None, True

def search_vectors(query_text, limit=10):
    client, is_sqlite = get_qdrant_client()
    if is_sqlite:
        return search_vectors_sqlite(query_text, limit)
        
    try:
        results = client.search(
            collection_name="nexus_documents",
            query_vector=[0.1] * 384,
            limit=limit
        )
        return [{"id": hit.id, "score": hit.score} for hit in results]
    except Exception:
        return search_vectors_sqlite(query_text, limit)

def search_vectors_sqlite(query_text, limit=10):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, content FROM documents")
        docs = cursor.fetchall()
        
        query_terms = set(re.findall(r"\w+", query_text.lower()))
        matched = []
        for doc in docs:
            score = sum(1 for term in query_terms if term in doc["content"].lower())
            if score > 0 or query_text.strip() == "":
                matched.append({"id": doc["id"], "score": float(score)})
                
        matched = sorted(matched, key=lambda x: x["score"], reverse=True)
        return matched[:limit]
    finally:
        conn.close()
