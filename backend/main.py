from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from backend.database import init_db, get_db_connection
from backend.postgres_db import get_user_role, write_audit_log, read_audit_logs
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

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
