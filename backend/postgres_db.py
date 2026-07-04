import os
import psycopg2
from datetime import datetime
from backend.database import get_db_connection as get_sqlite_conn

POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5432/nuara")

def get_postgres_connection():
    try:
        conn = psycopg2.connect(POSTGRES_URI)
        return conn, False
    except Exception:
        return get_sqlite_conn(), True

def get_user_role(user_id):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT role, username, clearance_level FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        else:
            cursor.execute("SELECT role, username, clearance_level FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            if row:
                return {"role": row[0], "username": row[1], "clearance_level": row[2]}
        return None
    finally:
        conn.close()

def write_audit_log(level, component, msg):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat() + "Z"
    try:
        if is_sqlite:
            cursor.execute(
                "INSERT INTO audit_logs (timestamp, level, component, msg) VALUES (?, ?, ?, ?)",
                (timestamp, level, component, msg)
            )
        else:
            cursor.execute(
                "INSERT INTO audit_logs (timestamp, level, component, msg) VALUES (%s, %s, %s, %s)",
                (timestamp, level, component, msg)
            )
        conn.commit()
    finally:
        conn.close()

def read_audit_logs(limit=30):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        else:
            cursor.execute("SELECT id, timestamp, level, component, msg FROM audit_logs ORDER BY id DESC LIMIT %s", (limit,))
            rows = cursor.fetchall()
            return [{"id": r[0], "timestamp": r[1], "level": r[2], "component": r[3], "msg": r[4]} for r in rows]
    finally:
        conn.close()

def get_all_documents():
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT * FROM documents")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        else:
            cursor.execute("SELECT id, name, content, source_type, access_level, url FROM documents")
            rows = cursor.fetchall()
            return [{"id": r[0], "name": r[1], "content": r[2], "source_type": r[3], "access_level": r[4], "url": r[5]} for r in rows]
    finally:
        conn.close()

def add_document(doc_id, name, content, source_type, access_level, url):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute(
                "INSERT INTO documents (id, name, content, source_type, access_level, url) VALUES (?, ?, ?, ?, ?, ?)",
                (doc_id, name, content, source_type, access_level, url)
            )
            cursor.execute("INSERT INTO nodes (id, label, type) VALUES (?, ?, ?)", (doc_id, name, "Document"))
            cursor.execute("INSERT INTO edges (source_id, target_id, relationship) VALUES (?, ?, ?)", ("query", doc_id, "MENTIONS"))
        else:
            cursor.execute(
                "INSERT INTO documents (id, name, content, source_type, access_level, url) VALUES (%s, %s, %s, %s, %s, %s)",
                (doc_id, name, content, source_type, access_level, url)
            )
            cursor.execute("INSERT INTO nodes (id, label, type) VALUES (%s, %s, %s)", (doc_id, name, "Document"))
            cursor.execute("INSERT INTO edges (source_id, target_id, relationship) VALUES (%s, %s, %s)", ("query", doc_id, "MENTIONS"))
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

def update_document_permission(doc_id, access_level):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("UPDATE documents SET access_level = ? WHERE id = ?", (access_level, doc_id))
        else:
            cursor.execute("UPDATE documents SET access_level = %s WHERE id = %s", (access_level, doc_id))
        conn.commit()
    finally:
        conn.close()

