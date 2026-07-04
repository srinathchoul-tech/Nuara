import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")
DOCS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "nexusbrain_architecture.md"))

def init_app_documentation():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS app_documentation")
    cursor.execute("""
    CREATE TABLE app_documentation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_index INTEGER,
        content TEXT
    )
    """)
    
    if not os.path.exists(DOCS_PATH):
        conn.close()
        return
        
    with open(DOCS_PATH, "r", encoding="utf-8") as f:
        text = f.read()
        
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    
    for idx, paragraph in enumerate(paragraphs):
        cursor.execute(
            "INSERT INTO app_documentation (chunk_index, content) VALUES (?, ?)",
            (idx, paragraph)
        )
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_app_documentation()
