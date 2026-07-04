from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from backend.database import init_db, get_db_connection
from backend.search import search_rag, log_audit
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (req.user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    session_state["user_id"] = user["id"]
    session_state["role"] = user["username"]
    session_state["clearance"] = user["clearance_level"]
    session_state["is_locked"] = False
    
    log_audit("INFO", "IAM_Gateway", f"Session switched to {user['id']} with role {user['username']}")
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 30")
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

@app.post("/api/reset")
def reset_alert():
    session_state["is_locked"] = False
    log_audit("INFO", "SecurityEnforcer", "Lockdown cleared. Normal operations restored.")
    return {"status": "cleared"}

@app.get("/api/admin/gap-analysis")
def gap_analysis():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT msg FROM audit_logs WHERE level = 'WARN'")
    warnings = [row["msg"] for row in cursor.fetchall()]
    conn.close()
    
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
