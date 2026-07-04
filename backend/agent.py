import time
from backend.database import get_db_connection
from backend.postgres_db import write_audit_log

def simulate_agent_chain(query_text, search_result, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM agent_steps")
    conn.commit()
    
    if search_result["status"] == "breach":
        cursor.execute(
            "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, 1, "Planner Agent", "SUCCESS", 12, "Deconstructed query into 2 sub-tasks. Security context resolved.")
        )
        cursor.execute(
            "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, 2, "Knowledge Graph Retrieval Engine", "FAILED", 4, "Traversing graph edges... Access Denied: User role lack clearance.")
        )
        cursor.execute(
            "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, 3, "Synthesis Agent", "TERMINATED", 0, "Execution halted due to security violation exception.")
        )
        conn.commit()
        conn.close()
        return
        
    cursor.execute(
        "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, 1, "Planner Agent", "SUCCESS", 12, "Deconstructed query into 3 sub-tasks. Required sources identified.")
    )
    conn.commit()
    
    write_audit_log("INFO", "Planner", "Sub-task generation complete")
    
    time.sleep(0.1)
    
    doc_names = [doc["name"] for doc in search_result["documents"]]
    source_msg = f"Traversing graph edges. Found nodes in category: {', '.join(doc_names) if doc_names else 'None'}."
    cursor.execute(
        "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, 2, "Knowledge Graph Retrieval Engine", "SUCCESS", 450, source_msg)
    )
    conn.commit()
    
    write_audit_log("INFO", "Retrieval", "Streaming vectors...")
    
    time.sleep(0.1)
    
    citations = [f"[{doc['name']}]" for doc in search_result["documents"]]
    synthesis_msg = f"Compiled response based on retrieved data. Citations appended: {', '.join(citations) if citations else 'None'}."
    cursor.execute(
        "INSERT INTO agent_steps (session_id, step_number, role, status, duration_ms, message) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, 3, "Synthesis Agent", "SUCCESS", 180, synthesis_msg)
    )
    conn.commit()
    
    write_audit_log("INFO", "Synthesis", "Final response generated with citations")
    
    conn.close()
