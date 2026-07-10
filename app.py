"""
Task Management System — Flask Backend
Full CRUD REST API backed by MySQL.

Setup:
    1. pip install -r requirements.txt
    2. mysql -u root -p < schema.sql
    3. Set your MySQL password below (or via the DB_PASSWORD env var)
    4. python app.py
    5. Open http://127.0.0.1:5000
"""

import os
import functools
from datetime import date
from flask import Flask, jsonify, request, render_template, session, redirect, url_for
import mysql.connector
from mysql.connector import Error
from werkzeug.security import check_password_hash

app = Flask(__name__)

# Required for session cookies. Set a real random value via env var in production:
#   export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-this-secret-key")

# ---- Database configuration ----
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", "your_mysql_password"),  # <-- change this
    "database": os.environ.get("DB_NAME", "task_manager"),
}


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ---- Auth: only an account with role='manager' may ever be logged in ----
def login_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


@app.route("/login", methods=["GET", "POST"])
def login():
    # If already logged in, skip straight to the app.
    if session.get("user_id"):
        return redirect(url_for("index"))

    error = None
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""

        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            cursor.close()
            conn.close()
        except Error as e:
            return render_template("login.html", error=f"Database error: {e}")

        # Two checks, both required: valid password, AND role is exactly 'manager'.
        # No other role is ever permitted to authenticate, by design.
        if user and check_password_hash(user["password_hash"], password) and user["role"] == "manager":
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("index"))

        error = "Invalid username or password."

    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


def row_to_dict(row):
    """Convert a DB row (dict cursor) into a JSON-safe dict."""
    if row.get("due_date") is not None:
        row["due_date"] = row["due_date"].isoformat()
    if row.get("created_at") is not None:
        row["created_at"] = row["created_at"].isoformat()
    return row


# ---- Frontend ----
@app.route("/")
@login_required
def index():
    return render_template("index.html", username=session.get("username"))


# ---- API: list + create ----
@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM tasks ORDER BY status, FIELD(priority,'high','medium','low'), due_date")
        tasks = [row_to_dict(r) for r in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify(tasks), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task():
    data = request.get_json(force=True)
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    description = data.get("description", "")
    priority = data.get("priority", "medium")
    due_date = data.get("due_date") or None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO tasks (title, description, priority, due_date, status) VALUES (%s, %s, %s, %s, 'pending')",
            (title, description, priority, due_date),
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({"id": new_id, "message": "Task created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500


# ---- API: update (edit fields or toggle status) ----
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    data = request.get_json(force=True)

    fields = []
    values = []
    for key in ("title", "description", "priority", "due_date", "status"):
        if key in data:
            fields.append(f"{key} = %s")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(task_id)

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s", values)
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        if affected == 0:
            return jsonify({"error": "Task not found"}), 404
        return jsonify({"message": "Task updated"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# ---- API: delete ----
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        if affected == 0:
            return jsonify({"error": "Task not found"}), 404
        return jsonify({"message": "Task deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
