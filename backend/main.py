from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()
from backend.database import init_db, get_db_connection
from backend.postgres_db import (
    get_user_role, write_audit_log, read_audit_logs, add_document, 
    update_document_permission, get_all_documents, get_user_by_email, 
    add_company, get_companies_list, create_otp, check_otp, 
    create_user_profile, get_pending_members, approve_member_role,
    get_roles, add_role, delete_role, get_role_permissions, update_role_permissions
)
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
    "user_id": "engineer@nexusbrain.com",
    "role": "Standard_Eng",
    "clearance": "ENG",
    "company_name": "Nuara",
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

class RegisterCompanyRequest(BaseModel):
    email: str
    password: str
    first_name: str
    middle_name: str
    last_name: str
    phone: str
    company_name: str
    industry: str
    branch: str

class EmployeeSignupRequest(BaseModel):
    email: str
    password: str
    first_name: str
    middle_name: str
    last_name: str
    phone: str
    company_name: str
    branch: str

class SendOtpRequest(BaseModel):
    email: str
    type: str
    company_name: Optional[str] = ""

class VerifyOtpRequest(BaseModel):
    email: str
    code: str

class CompanyLoginRequest(BaseModel):
    email: str
    password: str
    company_name: str
    role: str

class ApproveMemberRequest(BaseModel):
    email: str
    assigned_role: str

@app.post("/api/auth/register-company")
def register_company(req: RegisterCompanyRequest):
    import uuid
    comp_id = "comp_" + str(uuid.uuid4())[:8]
    try:
        add_company(comp_id, req.company_name, req.industry, req.branch)
    except Exception:
        raise HTTPException(status_code=400, detail="Company name already registered")
        
    create_user_profile(
        email=req.email,
        password=req.password,
        first_name=req.first_name,
        middle_name=req.middle_name,
        last_name=req.last_name,
        phone=req.phone,
        company_name=req.company_name,
        branch=req.branch,
        role="ADMIN",
        assigned_role="",
        clearance_level="EXEC",
        status="APPROVED"
    )
    
    from backend.postgres_db import add_role, update_role_permissions
    for r in ["Standard_Eng", "HR_Manager", "Executive", "Surgeon"]:
        try:
            add_role(req.company_name, r)
        except Exception:
            pass
            
    update_role_permissions(req.company_name, "Standard_Eng", ["Drive", "Wiki"])
    update_role_permissions(req.company_name, "HR_Manager", ["Drive", "Wiki", "Tickets"])
    update_role_permissions(req.company_name, "Executive", ["Drive", "Wiki", "Tickets", "Chat"])
    update_role_permissions(req.company_name, "Surgeon", ["Drive", "Wiki"])

    write_audit_log("INFO", "IAM_Gateway", f"Registered new tenant company: {req.company_name} by admin {req.email}")
    return {"status": "success"}

@app.post("/api/auth/employee-signup")
def employee_signup(req: EmployeeSignupRequest):
    user = get_user_by_email(req.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    create_user_profile(
        email=req.email,
        password=req.password,
        first_name=req.first_name,
        middle_name=req.middle_name,
        last_name=req.last_name,
        phone=req.phone,
        company_name=req.company_name,
        branch=req.branch,
        role="EMPLOYEE",
        assigned_role="",
        clearance_level="PUBLIC",
        status="PENDING"
    )
    
    write_audit_log("INFO", "IAM_Gateway", f"New employee request registered for {req.email} at {req.company_name} (PENDING APPROVAL)")
    return {"status": "success"}

@app.post("/api/auth/send-otp")
def send_otp(req: SendOtpRequest):
    import random
    import os
    code = str(random.randint(100000, 999999))
    create_otp(req.email, code)
    
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
    sg_key = os.getenv("SENDGRID_API_KEY")
    sg_sender = os.getenv("SENDGRID_SENDER_EMAIL")
    
    if req.type == "email":
        if sg_key and sg_sender:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail
                sg = SendGridAPIClient(sg_key)
                message = Mail(
                    from_email=sg_sender,
                    to_emails=req.email,
                    subject="Nuara Secure OTP Code",
                    plain_text_content=f"Your Nuara security code is: {code}. It will expire in 5 minutes."
                )
                sg.send(message)
                write_audit_log("INFO", "OTPGateway", f"Real email OTP code sent to {req.email}")
            except Exception as e:
                write_audit_log("ERROR", "OTPGateway", f"Failed to deliver real email to {req.email}: {str(e)}")
        else:
            write_audit_log("INFO", "OTPGateway", f"Dispatched simulated email OTP code: {code} to {req.email}")
            
    elif req.type == "phone":
        if twilio_sid and twilio_token and twilio_phone:
            try:
                from twilio.rest import Client
                client = Client(twilio_sid, twilio_token)
                client.messages.create(
                    body=f"Nuara Security Code: {code}. Expires in 5 minutes.",
                    from_=twilio_phone,
                    to=req.email
                )
                write_audit_log("INFO", "OTPGateway", f"Real SMS OTP code sent to {req.email}")
            except Exception as e:
                write_audit_log("ERROR", "OTPGateway", f"Failed to deliver real SMS to {req.email}: {str(e)}")
        else:
            write_audit_log("INFO", "OTPGateway", f"Dispatched simulated SMS OTP code: {code} to {req.email}")
            
    return {"status": "success", "code": code}

@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    success = check_otp(req.email, req.code)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    return {"status": "success"}

@app.post("/api/auth/company-login")
def company_login(req: CompanyLoginRequest):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if user["company_name"].lower() != req.company_name.lower():
        raise HTTPException(status_code=401, detail="Credentials mismatch for selected company")
        
    if user["role"] != req.role:
        raise HTTPException(status_code=401, detail="Invalid role selection")
        
    if user["status"] != "APPROVED":
        raise HTTPException(status_code=403, detail="Your account registration is currently pending administrator approval.")
        
    session_state["user_id"] = user["email"]
    session_state["company_name"] = user["company_name"]
    session_state["is_locked"] = False
    
    if user["role"] == "ADMIN":
        session_state["role"] = "ADMIN"
        session_state["clearance"] = "EXEC"
    else:
        role_map = {
            "Executive": "EXEC",
            "HR_Manager": "HR",
            "Standard_Eng": "ENG"
        }
        session_state["role"] = user["assigned_role"]
        session_state["clearance"] = role_map.get(user["assigned_role"], "ENG")
        
    write_audit_log("INFO", "IAM_Gateway", f"User {req.email} successfully logged in to {user['company_name']}")
    return {
        "status": "success",
        "session": session_state
    }

@app.get("/api/admin/pending-members")
def api_pending_members(company_name: str):
    return get_pending_members(company_name)

@app.post("/api/admin/approve-member")
def approve_member(req: ApproveMemberRequest):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="Requester not found")
        
    clearance_map = {
        "Executive": "EXEC",
        "HR_Manager": "HR",
        "Standard_Eng": "ENG"
    }
    clearance = clearance_map.get(req.assigned_role, "ENG")
    approve_member_role(req.email, req.assigned_role, clearance)
    
    write_audit_log("INFO", "AdminConsole", f"Employee {req.email} approved by admin. Assigned: {req.assigned_role}")
    return {"status": "success"}
class RoleRequest(BaseModel):
    company_name: str
    role_name: str

class AclRequest(BaseModel):
    company_name: str
    role_name: str
    folders: list

@app.get("/api/admin/roles")
def api_get_roles(company_name: str):
    return get_roles(company_name)

@app.post("/api/admin/roles")
def api_add_role(req: RoleRequest):
    add_role(req.company_name, req.role_name)
    write_audit_log("INFO", "AdminConsole", f"Role '{req.role_name}' registered for {req.company_name}")
    return {"status": "success"}

@app.delete("/api/admin/roles")
def api_delete_role(company_name: str, role_name: str):
    delete_role(company_name, role_name)
    write_audit_log("INFO", "AdminConsole", f"Role '{role_name}' deleted for {company_name}")
    return {"status": "success"}

@app.get("/api/admin/acls")
def api_get_acls(company_name: str):
    return get_role_permissions(company_name)

@app.post("/api/admin/acls")
def api_update_acls(req: AclRequest):
    update_role_permissions(req.company_name, req.role_name, req.folders)
    write_audit_log("INFO", "AdminConsole", f"Permissions updated for role '{req.role_name}' in {req.company_name}")
    return {"status": "success"}
@app.get("/api/companies")
def get_companies():
    return get_companies_list()

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

class IngestSimulateRequest(BaseModel):
    name: str
    content: str
    source_type: str
    access_level: str

@app.post("/api/admin/ingest-simulate")
def api_ingest_simulate(req: IngestSimulateRequest):
    import uuid
    import random
    import re
    
    doc_id = "doc_" + str(uuid.uuid4())[:8]
    add_document(doc_id, req.name, req.content, req.source_type, req.access_level, "")
    
    paragraphs = [p.strip() for p in req.content.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [req.content.strip()]
        
    chunks = []
    embeddings = []
    for p in paragraphs:
        chunks.append(p)
        coords = [round(random.uniform(-1.0, 1.0), 4) for _ in range(5)]
        embeddings.append(coords)
        
    words = re.findall(r"\b[A-Za-z]{4,}\b", req.content)
    stop_words = {"this", "that", "with", "from", "your", "they", "have", "were", "been"}
    filtered_words = [w for w in words if w.lower() not in stop_words]
    entities = list(set(filtered_words))[:6]
    
    write_audit_log("INFO", "VectorizerStudio", f"Simulated ingestion for '{req.name}' complete. Chunks: {len(chunks)}, Entities: {len(entities)}")
    return {
        "status": "success",
        "doc_id": doc_id,
        "chunks": chunks,
        "embeddings": embeddings,
        "entities": entities,
        "access_level": req.access_level
    }

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
