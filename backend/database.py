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
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS documents")
    cursor.execute("DROP TABLE IF EXISTS nodes")
    cursor.execute("DROP TABLE IF EXISTS edges")
    cursor.execute("DROP TABLE IF EXISTS audit_logs")
    cursor.execute("DROP TABLE IF EXISTS agent_steps")
    cursor.execute("DROP TABLE IF EXISTS onboarding_chats")
    cursor.execute("DROP TABLE IF EXISTS companies")
    cursor.execute("DROP TABLE IF EXISTS otp_verifications")
    cursor.execute("DROP TABLE IF EXISTS roles")
    cursor.execute("DROP TABLE IF EXISTS role_permissions")
    
    cursor.execute("""
    CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        industry TEXT,
        branch TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE otp_verifications (
        email TEXT PRIMARY KEY,
        code TEXT,
        verified INTEGER,
        created_at INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE roles (
        company_name TEXT,
        role_name TEXT,
        PRIMARY KEY (company_name, role_name)
    )
    """)

    cursor.execute("""
    CREATE TABLE role_permissions (
        company_name TEXT,
        role_name TEXT,
        folder_name TEXT,
        PRIMARY KEY (company_name, role_name, folder_name)
    )
    """)

    cursor.execute("""
    CREATE TABLE users (
        email TEXT PRIMARY KEY,
        password TEXT,
        first_name TEXT,
        middle_name TEXT,
        last_name TEXT,
        phone TEXT,
        company_name TEXT,
        branch TEXT,
        role TEXT,
        assigned_role TEXT,
        clearance_level TEXT,
        status TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        name TEXT,
        content TEXT,
        source_type TEXT,
        access_level TEXT,
        url TEXT,
        company_name TEXT
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
    
    cursor.execute("""
    CREATE TABLE onboarding_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        sender TEXT,
        message TEXT
    )
    """)
    
    cursor.execute("INSERT INTO companies VALUES (?, ?, ?, ?)", ("c1", "Nuara", "AI Tech", "Main Branch"))
    
    cursor.executemany("INSERT INTO roles VALUES (?, ?)", [
        ("Nuara", "Standard_Eng"),
        ("Nuara", "HR_Manager"),
        ("Nuara", "Executive"),
        ("Nuara", "Surgeon")
    ])

    cursor.executemany("INSERT INTO role_permissions VALUES (?, ?, ?)", [
        ("Nuara", "Standard_Eng", "Drive"),
        ("Nuara", "Standard_Eng", "Wiki"),
        ("Nuara", "HR_Manager", "Drive"),
        ("Nuara", "HR_Manager", "Wiki"),
        ("Nuara", "HR_Manager", "Tickets"),
        ("Nuara", "Executive", "Drive"),
        ("Nuara", "Executive", "Wiki"),
        ("Nuara", "Executive", "Tickets"),
        ("Nuara", "Executive", "Chat"),
        ("Nuara", "Surgeon", "Drive"),
        ("Nuara", "Surgeon", "Wiki")
    ])
    
    cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        ("engineer@nexusbrain.com", "password123", "Srinath", "", "Choul", "1234567890", "Nuara", "Main Branch", "EMPLOYEE", "Standard_Eng", "ENG", "APPROVED"),
        ("hr@nexusbrain.com", "password123", "Sarah", "", "Connor", "2345678901", "Nuara", "Main Branch", "EMPLOYEE", "HR_Manager", "HR", "APPROVED"),
        ("ceo@nexusbrain.com", "password123", "John", "", "Connor", "3456789012", "Nuara", "Main Branch", "EMPLOYEE", "Executive", "EXEC", "APPROVED"),
        ("admin@nexusbrain.com", "password123", "Admin", "", "User", "9999999999", "Nuara", "Main Branch", "ADMIN", "", "EXEC", "APPROVED")
    ])
    
    cursor.executemany("INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?)", [
        ("doc_q3", "Q3_Report.pdf", "The company achieved record growth in Q3. Enterprise knowledge graphs were adopted by 40% of target clients. Transition to hybrid semantic RAG model was successfully completed, reducing latency to under 2 seconds.", "Drive", "PUBLIC", "https://nexus.internal/docs/Q3_Report.pdf", "Nuara"),
        ("doc_arch", "Architecture_v2.docx", "Nuara core architecture uses hybrid retrieval (BM25 + dense vector embeddings). Rerankers are utilized to improve synthesis. Pre-retrieval IAM filters ensure no unauthorized access to documents. Latency is kept low through caching.", "Drive", "ENG", "https://nexus.internal/docs/Architecture_v2.docx", "Nuara"),
        ("chat_slack_eng", "slack_#eng_leads", "Node_02: We finished testing the vector DB. RAG latency is 1.8s. CEO_Alpha: Great, verify that the permissions gateway is fully blocking non-authorized users. Standard_Eng: Yes, verified.", "Chat", "ENG", "https://nexus.internal/chat/slack_eng_leads", "Nuara"),
        ("doc_hr_salary", "HR_Salaries_FY24", "Executive bonus pool: CEO_Alpha - $250k, CTO_Beta - $180k. Software Engineer salaries range from $120k to $190k. Average bonus for L5 engineers is $15k. All database details are restricted to HR and Executive clearance.", "Tickets", "HR", "https://nexus.internal/hr/salary_sheet_fy24", "Nuara")
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
