import sqlite3
import re
from datetime import datetime
from backend.database import get_db_connection

CLEARANCE_HIERARCHY = {
    "PUBLIC": 0,
    "ENG": 1,
    "HR": 2,
    "EXEC": 3
}

ROLE_CLEARANCE = {
    "Standard_Eng": "ENG",
    "HR_Manager": "HR",
    "Executive": "EXEC"
}

def log_audit(level, component, msg):
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat() + "Z"
    cursor.execute(
        "INSERT INTO audit_logs (timestamp, level, component, msg) VALUES (?, ?, ?, ?)",
        (timestamp, level, component, msg)
    )
    conn.commit()
    conn.close()

def is_authorized(user_role, doc_access):
    user_clearance = ROLE_CLEARANCE.get(user_role, "PUBLIC")
    return CLEARANCE_HIERARCHY.get(user_clearance, 0) >= CLEARANCE_HIERARCHY.get(doc_access, 0)

def search_rag(query_text, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return {"status": "denied", "reason": "User not found"}
        
    user_role = user["role"]
    log_audit("INFO", "API Gateway", f"Query request received from {user_id} ({user_role})")
    log_audit("DEBUG", "PermissionFilter", f"Validating permissions for user {user_id}")

    cursor.execute("SELECT * FROM documents")
    all_docs = cursor.fetchall()
    
    query_terms = set(re.findall(r"\w+", query_text.lower()))
    
    is_sensitive_query = any(term in ["salary", "salaries", "bonus", "compensation", "hr_salaries", "pool"] for term in query_terms)
    
    if is_sensitive_query:
        user_clearance = ROLE_CLEARANCE.get(user_role, "PUBLIC")
        if CLEARANCE_HIERARCHY.get(user_clearance, 0) < CLEARANCE_HIERARCHY.get("HR", 0):
            log_audit("WARN", "IAM_VAULT", f"DENY: Read access to node cluster 'HR_Salaries' missing for role '{user_role}'")
            log_audit("WARN", "Agent_Planner", f"Halt execution. Purging context memory. Initiating audit trace.")
            conn.close()
            return {
                "status": "breach",
                "reason": "SECURITY_CRITICAL: UNAUTHORIZED ACCESS ATTEMPT. Violation Code: 0x403_STRICT_IAM. User terminated request."
            }

    matched_docs = []
    for doc in all_docs:
        if not is_authorized(user_role, doc["access_level"]):
            continue
            
        doc_content = doc["content"].lower()
        score = sum(1 for term in query_terms if term in doc_content)
        
        if score > 0 or query_text.strip() == "":
            matched_docs.append({
                "id": doc["id"],
                "name": doc["name"],
                "content": doc["content"],
                "source_type": doc["source_type"],
                "access_level": doc["access_level"],
                "url": doc["url"],
                "score": score
            })
            
    matched_docs = sorted(matched_docs, key=lambda x: x["score"], reverse=True)
    
    log_audit("INFO", "Retrieval", f"Retrieval completed. Found {len(matched_docs)} documents.")
    
    graph_data = build_graph_for_results(matched_docs, conn)
    
    conn.close()
    return {
        "status": "success",
        "documents": matched_docs,
        "graph": graph_data
    }

def build_graph_for_results(docs, conn):
    cursor = conn.cursor()
    doc_ids = [doc["id"] for doc in docs]
    
    if not doc_ids:
        return {"nodes": [], "edges": []}
        
    placeholders = ",".join("?" for _ in doc_ids)
    cursor.execute(f"SELECT * FROM edges WHERE source_id IN ({placeholders}) OR target_id IN ({placeholders})", doc_ids + doc_ids)
    edges = cursor.fetchall()
    
    node_ids = set()
    serialized_edges = []
    for edge in edges:
        node_ids.add(edge["source_id"])
        node_ids.add(edge["target_id"])
        serialized_edges.append({
            "source": edge["source_id"],
            "target": edge["target_id"],
            "relationship": edge["relationship"]
        })
        
    serialized_nodes = []
    if node_ids:
        node_placeholders = ",".join("?" for _ in node_ids)
        cursor.execute(f"SELECT * FROM nodes WHERE id IN ({node_placeholders})", list(node_ids))
        nodes = cursor.fetchall()
        for node in nodes:
            serialized_nodes.append({
                "id": node["id"],
                "label": node["label"],
                "type": node["type"]
            })
            
    return {
        "nodes": serialized_nodes,
        "edges": serialized_edges
    }
