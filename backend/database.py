import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS documents")
    cursor.execute("DROP TABLE IF EXISTS nodes")
    cursor.execute("DROP TABLE IF EXISTS edges")
    cursor.execute("DROP TABLE IF EXISTS audit_logs")
    cursor.execute("DROP TABLE IF EXISTS agent_steps")
    
    cursor.execute("""
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT,
        role TEXT,
        clearance_level TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        name TEXT,
        content TEXT,
        source_type TEXT,
        access_level TEXT,
        url TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        label TEXT,
        type TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE edges (
        source_id TEXT,
        target_id TEXT,
        relationship TEXT,
        PRIMARY KEY (source_id, target_id, relationship)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        level TEXT,
        component TEXT,
        msg TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE agent_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        step_number INTEGER,
        role TEXT,
        status TEXT,
        duration_ms INTEGER,
        message TEXT
    )
    """)
    
    cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?)", [
        ("Node_02", "Software Engineer", "Standard_Eng", "ENG"),
        ("ENGR_77X", "Standard_Eng", "Standard_Eng", "ENG"),
        ("HR_Lead", "HR Manager", "HR_Manager", "HR"),
        ("CEO_Alpha", "Executive Director", "Executive", "EXEC")
    ])
    
    cursor.executemany("INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?)", [
        ("doc_q3", "Q3_Report.pdf", "The company achieved record growth in Q3. Enterprise knowledge graphs were adopted by 40% of target clients. Transition to hybrid semantic RAG model was successfully completed, reducing latency to under 2 seconds.", "Drive", "PUBLIC", "https://nexus.internal/docs/Q3_Report.pdf"),
        ("doc_arch", "Architecture_v2.docx", "Nuara core architecture uses hybrid retrieval (BM25 + dense vector embeddings). Rerankers are utilized to improve synthesis. Pre-retrieval IAM filters ensure no unauthorized access to documents. Latency is kept low through caching.", "Drive", "ENG", "https://nexus.internal/docs/Architecture_v2.docx"),
        ("chat_slack_eng", "slack_#eng_leads", "Node_02: We finished testing the vector DB. RAG latency is 1.8s. CEO_Alpha: Great, verify that the permissions gateway is fully blocking non-authorized users. Standard_Eng: Yes, verified.", "Chat", "ENG", "https://nexus.internal/chat/slack_eng_leads"),
        ("doc_hr_salary", "HR_Salaries_FY24", "Executive bonus pool: CEO_Alpha - $250k, CTO_Beta - $180k. Software Engineer salaries range from $120k to $190k. Average bonus for L5 engineers is $15k. All database details are restricted to HR and Executive clearance.", "Tickets", "HR", "https://nexus.internal/hr/salary_sheet_fy24")
    ])
    
    cursor.executemany("INSERT INTO nodes VALUES (?, ?, ?)", [
        ("query", "Query", "Query"),
        ("concept_rag", "RAG", "Concept"),
        ("concept_hybrid", "Hybrid Retrieval", "Concept"),
        ("concept_security", "Security Gate", "Concept"),
        ("concept_salary", "Salary Sheet", "Concept"),
        ("doc_arch", "Architecture_v2.docx", "Document"),
        ("chat_slack_eng", "slack_#eng_leads", "Document"),
        ("doc_q3", "Q3_Report.pdf", "Document"),
        ("doc_hr_salary", "HR_Salaries_FY24", "Document")
    ])
    
    cursor.executemany("INSERT INTO edges VALUES (?, ?, ?)", [
        ("query", "concept_rag", "MENTIONS"),
        ("concept_rag", "concept_hybrid", "RELATES_TO"),
        ("concept_hybrid", "doc_arch", "DESCRIBED_IN"),
        ("doc_arch", "chat_slack_eng", "REFERENCED_BY"),
        ("concept_rag", "doc_q3", "MENTIONS"),
        ("concept_security", "doc_arch", "ENFORCED_ON"),
        ("concept_salary", "doc_hr_salary", "CONTAINS"),
        ("doc_hr_salary", "concept_security", "BLOCKED_BY")
    ])
    
    cursor.executemany("INSERT INTO audit_logs (timestamp, level, component, msg) VALUES (?, ?, ?, ?)", [
        ("2026-07-04T12:00:00Z", "INFO", "Database", "Database initialized with clean schema"),
        ("2026-07-04T12:00:01Z", "INFO", "IAM_Gateway", "Default roles (Standard_Eng, HR_Manager, Executive) registered")
    ])
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
