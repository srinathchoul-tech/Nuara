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

def get_user_role(email):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT role, assigned_role, clearance_level, company_name, first_name || ' ' || last_name as username FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                r = dict(row)
                return {
                    "role": r["assigned_role"] if r["role"] == "EMPLOYEE" else r["role"],
                    "username": r["username"],
                    "clearance_level": r["clearance_level"]
                }
        else:
            cursor.execute("SELECT role, assigned_role, clearance_level, company_name, first_name, last_name FROM users WHERE email = %s", (email,))
            row = cursor.fetchone()
            if row:
                r_type = row[1] if row[0] == "EMPLOYEE" else row[0]
                return {"role": r_type, "username": f"{row[4]} {row[5]}", "clearance_level": row[2]}
        return None
    finally:
        conn.close()

def get_user_by_email(email):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            return dict(row) if row else None
        else:
            cursor.execute("SELECT email, password, first_name, middle_name, last_name, phone, company_name, branch, role, assigned_role, clearance_level, status FROM users WHERE email = %s", (email,))
            row = cursor.fetchone()
            if row:
                return {
                    "email": row[0], "password": row[1], "first_name": row[2], "middle_name": row[3],
                    "last_name": row[4], "phone": row[5], "company_name": row[6], "branch": row[7],
                    "role": row[8], "assigned_role": row[9], "clearance_level": row[10], "status": row[11]
                }
            return None
    finally:
        conn.close()

def add_company(company_id, name, industry, branch):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("INSERT INTO companies VALUES (?, ?, ?, ?)", (company_id, name, industry, branch))
        else:
            cursor.execute("INSERT INTO companies VALUES (%s, %s, %s, %s)", (company_id, name, industry, branch))
        conn.commit()
    finally:
        conn.close()

def get_companies_list():
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM companies")
        rows = cursor.fetchall()
        return [row[0] if not is_sqlite else row["name"] for row in rows]
    finally:
        conn.close()

def create_otp(email, code):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("INSERT OR REPLACE INTO otp_verifications (email, code, verified) VALUES (?, ?, 0)", (email, code))
        else:
            cursor.execute("INSERT INTO otp_verifications (email, code, verified) VALUES (%s, %s, 0) ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, verified = 0", (email, code))
        conn.commit()
    finally:
        conn.close()

def check_otp(email, code):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT code FROM otp_verifications WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row and row["code"] == code:
                cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE email = ?", (email,))
                conn.commit()
                return True
        else:
            cursor.execute("SELECT code FROM otp_verifications WHERE email = %s", (email,))
            row = cursor.fetchone()
            if row and row[0] == code:
                cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE email = %s", (email,))
                conn.commit()
                return True
        return False
    finally:
        conn.close()

def create_user_profile(email, password, first_name, middle_name, last_name, phone, company_name, branch, role, assigned_role, clearance_level, status):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute(
                "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (email, password, first_name, middle_name, last_name, phone, company_name, branch, role, assigned_role, clearance_level, status)
            )
        else:
            cursor.execute(
                "INSERT INTO users VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (email, password, first_name, middle_name, last_name, phone, company_name, branch, role, assigned_role, clearance_level, status)
            )
        conn.commit()
    finally:
        conn.close()

def get_pending_members(company_name):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("SELECT email, first_name, middle_name, last_name, phone, branch FROM users WHERE company_name = ? AND status = 'PENDING'", (company_name,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        else:
            cursor.execute("SELECT email, first_name, middle_name, last_name, phone, branch FROM users WHERE company_name = %s AND status = 'PENDING'", (company_name,))
            rows = cursor.fetchall()
            return [{"email": r[0], "first_name": r[1], "middle_name": r[2], "last_name": r[3], "phone": r[4], "branch": r[5]} for r in rows]
    finally:
        conn.close()

def approve_member_role(email, assigned_role, clearance_level):
    conn, is_sqlite = get_postgres_connection()
    cursor = conn.cursor()
    try:
        if is_sqlite:
            cursor.execute("UPDATE users SET status = 'APPROVED', assigned_role = ?, clearance_level = ? WHERE email = ?", (assigned_role, clearance_level, email))
        else:
            cursor.execute("UPDATE users SET status = 'APPROVED', assigned_role = %s, clearance_level = %s WHERE email = %s", (assigned_role, clearance_level, email))
        conn.commit()
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

