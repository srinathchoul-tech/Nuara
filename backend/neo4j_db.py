import os
from neo4j import GraphDatabase
from backend.database import get_db_connection as get_sqlite_conn

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def get_neo4j_driver():
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        return driver, False
    except Exception:
        return None, True

def get_graph_for_documents(doc_ids):
    driver, is_sqlite = get_neo4j_driver()
    if is_sqlite:
        return get_graph_for_documents_sqlite(doc_ids)
        
    nodes = []
    edges = []
    
    query = """
    MATCH (n)-[r]->(m)
    WHERE n.id IN $doc_ids OR m.id IN $doc_ids
    RETURN n, r, m
    """
    try:
        with driver.session() as session:
            result = session.run(query, doc_ids=doc_ids)
            seen_nodes = set()
            for record in result:
                n = record["n"]
                m = record["m"]
                r = record["r"]
                
                for node in (n, m):
                    if node.id not in seen_nodes:
                        seen_nodes.add(node.id)
                        nodes.append({
                            "id": node.get("id"),
                            "label": node.get("label"),
                            "type": list(node.labels)[0] if node.labels else "Unknown"
                        })
                edges.append({
                    "source": n.get("id"),
                    "target": m.get("id"),
                    "relationship": r.type
                })
        return {"nodes": nodes, "edges": edges}
    except Exception:
        return get_graph_for_documents_sqlite(doc_ids)
    finally:
        if driver:
            driver.close()

def get_graph_for_documents_sqlite(doc_ids):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
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
        return {"nodes": serialized_nodes, "edges": serialized_edges}
    finally:
        conn.close()
