import re
from backend.postgres_db import get_user_role, write_audit_log, get_all_documents
from backend.neo4j_db import get_graph_for_documents
from backend.qdrant_db import search_vectors

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

def is_authorized(user_role, doc_access):
    user_clearance = ROLE_CLEARANCE.get(user_role, "PUBLIC")
    return CLEARANCE_HIERARCHY.get(user_clearance, 0) >= CLEARANCE_HIERARCHY.get(doc_access, 0)

def search_rag(query_text, email):
    from backend.postgres_db import get_user_by_email
    user = get_user_by_email(email)
    if not user:
        return {"status": "denied", "reason": "User not found"}
        
    user_role = user["assigned_role"] if user["role"] == "EMPLOYEE" else user["role"]
    user_company = user["company_name"]
    
    write_audit_log("INFO", "API Gateway", f"Query request received from {email} ({user_role} at {user_company})")
    write_audit_log("DEBUG", "PermissionFilter", f"Validating permissions for user {email}")

    query_terms = set(re.findall(r"\w+", query_text.lower()))
    is_sensitive_query = any(term in ["salary", "salaries", "bonus", "compensation", "hr_salaries", "pool"] for term in query_terms)
    
    if is_sensitive_query:
        user_clearance = ROLE_CLEARANCE.get(user_role, "PUBLIC")
        if CLEARANCE_HIERARCHY.get(user_clearance, 0) < CLEARANCE_HIERARCHY.get("HR", 0):
            write_audit_log("WARN", "IAM_VAULT", f"DENY: Read access to node cluster 'HR_Salaries' missing for role '{user_role}'")
            write_audit_log("WARN", "Agent_Planner", f"Halt execution. Purging context memory. Initiating audit trace.")
            return {
                "status": "breach",
                "reason": "SECURITY_CRITICAL: UNAUTHORIZED ACCESS ATTEMPT. Violation Code: 0x403_STRICT_IAM. User terminated request."
            }

    vector_hits = search_vectors(query_text, limit=10)
    hit_ids = {hit["id"] for hit in vector_hits}
    
    all_docs = get_all_documents()
    matched_docs = []
    
    for doc in all_docs:
        if doc["id"] in hit_ids:
            doc_comp = doc.get("company_name", "Nuara")
            if doc_comp == user_company:
                if is_authorized(user_role, doc["access_level"]):
                    matched_docs.append(doc)
                
    write_audit_log("INFO", "Retrieval", f"Retrieval completed. Found {len(matched_docs)} documents.")
    
    matched_ids = [doc["id"] for doc in matched_docs]
    graph_data = get_graph_for_documents(matched_ids)
    
    return {
        "status": "success",
        "documents": matched_docs,
        "graph": graph_data
    }
