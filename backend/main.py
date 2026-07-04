from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from backend.database import init_db, get_db_connection
from backend.postgres_db import get_user_role, write_audit_log, read_audit_logs, add_document, update_document_permission, get_all_documents
from backend.search import search_rag
from backend.agent import simulate_agent_chain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_state = {
    "user_id": "Node_02",
    "role": "Standard_Eng",
    "clearance": "ENG",
    "is_locked": False
}

class QueryRequest(BaseModel):
    query: str

class SwitchRoleRequest(BaseModel):
    user_id: str

class CreateDocRequest(BaseModel):
    name: str
    content: str
    source_type: str
    access_level: str
    url: str

class UpdatePermRequest(BaseModel):
    doc_id: str
    access_level: str

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/session")
def get_session():
    return session_state

@app.post("/api/session/switch")
def switch_role(req: SwitchRoleRequest):
    user = get_user_role(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    session_state["user_id"] = req.user_id
    session_state["role"] = user["role"]
    session_state["clearance"] = user["clearance_level"]
    session_state["is_locked"] = False
    
    write_audit_log("INFO", "IAM_Gateway", f"Session switched to {req.user_id} with role {user['role']}")
    return session_state

@app.post("/api/query")
def execute_query(req: QueryRequest):
    if session_state["is_locked"]:
        return {
            "status": "breach",
            "reason": "SECURITY_CRITICAL: SYSTEM IS IN LOCKDOWN MODE. OVERRIDE REQUIRED."
        }
        
    result = search_rag(req.query, session_state["user_id"])
    
    if result["status"] == "breach":
        session_state["is_locked"] = True
        simulate_agent_chain(req.query, result, session_state["user_id"])
        return result
        
    simulate_agent_chain(req.query, result, session_state["user_id"])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agent_steps ORDER BY id ASC")
    steps = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    result["agent_steps"] = steps
    return result

@app.get("/api/logs")
def get_logs():
    return read_audit_logs(30)

@app.post("/api/reset")
def reset_alert():
    session_state["is_locked"] = False
    write_audit_log("INFO", "SecurityEnforcer", "Lockdown cleared. Normal operations restored.")
    return {"status": "cleared"}

@app.get("/api/admin/gap-analysis")
def gap_analysis():
    logs = read_audit_logs(100)
    warnings = [log["msg"] for log in logs if log["level"] == "WARN"]
    
    gaps = []
    for warn in warnings:
        if "missing for role" in warn:
            parts = warn.split("cluster '")
            if len(parts) > 1:
                cluster = parts[1].split("'")[0]
                gaps.append(f"Clearance GAP: standard users requesting restricted cluster '{cluster}'")
                
    if not gaps:
        gaps.append("No active knowledge gaps detected. Vector database contains coverage for current operations.")
        
    return {"gaps": gaps}

@app.post("/api/admin/documents")
def api_add_document(req: CreateDocRequest):
    import uuid
    doc_id = "doc_" + str(uuid.uuid4())[:8]
    add_document(doc_id, req.name, req.content, req.source_type, req.access_level, req.url)
    write_audit_log("INFO", "AdminConsole", f"Document '{req.name}' successfully added (Level: {req.access_level})")
    return {"status": "success", "doc_id": doc_id}

@app.put("/api/admin/documents/permissions")
def api_update_permission(req: UpdatePermRequest):
    update_document_permission(req.doc_id, req.access_level)
    write_audit_log("INFO", "AdminConsole", f"Document ID '{req.doc_id}' clearance updated to '{req.access_level}'")
    return {"status": "success"}

@app.get("/api/admin/documents")
def api_get_documents():
    return get_all_documents()

class OnboardingChatRequest(BaseModel):
    message: str

def query_app_documentation(query_text: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT content FROM app_documentation")
        rows = cursor.fetchall()
        chunks = [row["content"] for row in rows]
    except Exception:
        chunks = []
    finally:
        conn.close()
        
    import re
    stop_words = {
        "how", "many", "there", "in", "this", "website", "is", "are", "the", 
        "a", "an", "of", "and", "or", "to", "for", "with", "about", "what", 
        "why", "where", "who", "can", "you", "your", "my", "me", "do", "does", 
        "did", "have", "has", "had", "we", "us", "our", "it", "its", "on", "at"
    }
    
    query_terms = set(re.findall(r"\w+", query_text.lower()))
    meaningful_terms = query_terms - stop_words
    
    if not meaningful_terms:
        meaningful_terms = query_terms
        
    scored_chunks = []
    for chunk in chunks:
        score = sum(2 if term in chunk.lower() else 0 for term in meaningful_terms)
        if score > 0:
            scored_chunks.append((chunk, score))
            
    scored_chunks = sorted(scored_chunks, key=lambda x: x[1], reverse=True)
    return [item[0] for item in scored_chunks]

def save_onboarding_chat(sender: str, message: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    import datetime
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        cursor.execute(
            "INSERT INTO onboarding_chats (timestamp, sender, message) VALUES (?, ?, ?)",
            (timestamp, sender, message)
        )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

def generate_architect_response(query_text: str, context_chunks: list):
    query_lower = query_text.lower()
    
    if any(k in query_lower for k in ["role", "roles", "user", "users", "switcher"]):
        return (
            "We have three registered roles in our system security model: Software Engineer (Standard_Eng), "
            "HR Manager (HR_Manager), and Executive Director (Executive). These roles determine the clearance level "
            "granted to the user session, and you can see them listed in the Role Switcher panel on the left sidebar."
        )

    if any(k in query_lower for k in ["clearance", "clearances", "access", "level", "levels", "authorized", "clearance_level"]):
        return (
            "Access clearances are divided into four hierarchical levels: PUBLIC, ENG, HR, and EXEC. "
            "Standard Software Engineers have ENG clearance, HR Managers have HR clearance, and Executive Directors "
            "have EXEC clearance. Clearance constraints are checked at query time to prevent unauthorized access."
        )

    if any(k in query_lower for k in ["document", "documents", "vault", "drive", "wiki", "ticket", "chat"]):
        return (
            "Our Data Source Vault organizes company records into Drives (containing PUBLIC resources), "
            "Wikis (containing ENG level engineering specifications), Tickets (containing HR level salary resources), "
            "and Chat Logs (containing EXEC level sensitive chat archives)."
        )

    if any(k in query_lower for k in ["reset", "lockdown", "alert", "dispatch", "breach", "enforcer"]):
        return (
            "When a user attempts to access a document that exceeds their clearance level, the system triggers a "
            "security breach and enters lockdown mode. During a lockdown, query operations are suspended. "
            "You can clear this state by clicking the reset button in the Compliance Enforcer panel."
        )

    if any(k in query_lower for k in ["security", "permission", "leak", "acl", "clearance", "restrict"]):
        return (
            "As the Lead Technical Architect, I designed our security model around Permission-Integrated Intelligence. "
            "Every RAG traversal checks the user's IAM clearance context (PUBLIC, ENG, HR, EXEC) "
            "against the target document ACL. This pre-retrieval authorization check prevents data leaks before "
            "RAG synthesis occurs."
        )
        
    if any(k in query_lower for k in ["tech stack", "stack", "technology", "db", "database", "neo4j", "qdrant", "langgraph", "react", "fastapi"]):
        return (
            "Our core tech stack unifies React (Vite/Tailwind CSS) on the frontend, FastAPI for backend RAG routers, "
            "Qdrant/pgvector for text embedding search, Neo4j for mapping entity graph relations, and LangGraph "
            "for executing multi-agent validation chains."
        )
        
    if any(k in query_lower for k in ["logs", "transparency", "steps", "audit"]):
        return (
            "We enforce Auditable Agent Transparency by leveraging LangGraph. As a query flows through the pipeline, "
            "execution steps (Planning, Graph Search, Synthesis) and durations are tracked. These logs are saved "
            "to the audit database and pushed directly to the UI logs terminal for real-time visibility."
        )
        
    if any(k in query_lower for k in ["decision", "graph", "relational", "historical", "citation", "citation"]):
        return (
            "We've created an Org-Wide Decision Memory mapping layer using Neo4j. By representing concepts, files, "
            "and communication history as graph nodes and edges, we trace why key product decisions were made, "
            "linking technical drafts directly to past discussions."
        )
        
    if context_chunks:
        import re
        cleaned_chunks = []
        for chunk in context_chunks:
            c = re.sub(r"#+\s*", "", chunk)
            c = re.sub(r"\s+", " ", c).strip()
            if c:
                cleaned_chunks.append(c)
        if cleaned_chunks:
            summary = " ".join(cleaned_chunks[:2])
            if len(summary) > 260:
                summary = summary[:260] + "..."
            return (
                f"Regarding your query, here is how NexusBrain is designed: {summary} "
                "Let me know if you would like me to dive deeper into any specific component of our architecture."
            )
        
    return (
        "Hello! I am the Lead Technical Architect of NexusBrain. I can help explain our GraphRAG pipeline, "
        "permission-integrated intelligence check, or LangGraph agent logs. What would you like to know about our system?"
    )

@app.post("/api/onboarding/chat")
def onboarding_chat(req: OnboardingChatRequest):
    chunks = query_app_documentation(req.message)
    response_text = generate_architect_response(req.message, chunks)
    save_onboarding_chat("user", req.message)
    save_onboarding_chat("system", response_text)
    return {"response": response_text}

@app.get("/api/onboarding/chats")
def get_onboarding_chats():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT sender, message FROM onboarding_chats ORDER BY id ASC")
        rows = cursor.fetchall()
        chats = [{"sender": row[0], "text": row[1]} for row in rows]
    except Exception:
        chats = []
    finally:
        conn.close()
    return chats


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
