# The Ledger — Task Management System

A full-stack task management (CRUD) application built with **Python (Flask)**, **MySQL**, and **vanilla HTML/CSS/JavaScript**. Access is restricted to a single manager role — there is no public sign-up.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Default Login Credentials](#default-login-credentials)
- [API Reference](#api-reference)
- [Security Notes](#security-notes)
- [Deploying to GitHub](#deploying-to-github)
- [Author](#author)

---

## Overview

The Ledger is a single-page task manager styled as a paper ledger/register. A manager signs in, then creates, edits, completes, and deletes tasks from one screen with no page reloads — every action goes through a REST API backed by MySQL.

## Features

- **Manager-only authentication.** The `users` table's `role` column is a MySQL `ENUM('manager')`, so no other role can ever exist in that table, and the login route explicitly checks `role == 'manager'` before starting a session. There is no sign-up page.
- Full CRUD on tasks: create, read, update, delete.
- Priority levels (`low` / `medium` / `high`) with color-coded rows.
- Due dates, with overdue tasks visually highlighted.
- Mark tasks complete/incomplete with a single click.
- Inline editing — no page reloads, all via the `fetch` API.
- Session-based auth: every task route (and the main page) redirects to `/login`, or returns `401` for API calls, if there's no active session.

## Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Backend    | Python 3, Flask                               |
| Database   | MySQL 8.x, `mysql-connector-python`           |
| Auth       | Flask sessions, `werkzeug.security` password hashing |
| Frontend   | HTML5, CSS3, vanilla JavaScript (`fetch` API) |

No frontend frameworks, no ORM — deliberately simple and easy to explain in a viva/interview.

## Project Structure

```
task-manager/
├── app.py                  # Flask backend + REST API
├── schema.sql               # MySQL schema + seed data
├── requirements.txt         # Python dependencies
├── README.md
├── .gitignore
├── templates/
│   ├── index.html            # Main task board (authenticated)
│   └── login.html            # Manager sign-in page
└── static/
    ├── css/
    │   └── style.css          # All styling
    └── js/
        └── script.js          # Frontend logic (fetch-based CRUD)
```

## Prerequisites

Install these before you start:

1. **Python 3.9+**
   Check with: `python3 --version`
   Download: https://www.python.org/downloads/

2. **MySQL Server 8.x**
   Check with: `mysql --version`
   Download: https://dev.mysql.com/downloads/mysql/

3. **Git**
   Check with: `git --version`
   Download: https://git-scm.com/downloads

4. **A GitHub account** — https://github.com/join

## Local Setup

> These steps assume you've downloaded/unzipped the project folder `task-manager/` onto your computer.

### 1. Open a terminal in the project folder

- **Windows:** open the `task-manager` folder in File Explorer, then right-click inside it and choose **"Open in Terminal"** (or open Command Prompt/PowerShell and `cd` into it).
- **macOS/Linux:** open Terminal and run:
  ```bash
  cd path/to/task-manager
  ```

### 2. (Recommended) Create a virtual environment

This keeps this project's Python packages separate from the rest of your system.

```bash
python3 -m venv venv
```

Activate it:

- **macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows (PowerShell):**
  ```powershell
  venv\Scripts\Activate.ps1
  ```
- **Windows (cmd.exe):**
  ```cmd
  venv\Scripts\activate.bat
  ```

You'll know it worked because your terminal prompt will now start with `(venv)`.

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Start MySQL and create the database

Make sure your MySQL server is running:
- **Windows:** open "Services", find "MySQL80", make sure it's "Running" (or start it from MySQL Workbench / XAMPP).
- **macOS:** `brew services start mysql` (if installed via Homebrew).
- **Linux:** `sudo service mysql start`

Then load the schema (this creates the database, tables, and 3 sample tasks):

```bash
mysql -u root -p < schema.sql
```

You'll be prompted for your MySQL root password. Type it and press Enter (nothing will appear on screen as you type — that's normal).

### 5. Point the app at your database

Open `app.py` in any text editor and find this line:

```python
"password": os.environ.get("DB_PASSWORD", "your_mysql_password"),
```

**Option A — quickest:** replace `"your_mysql_password"` with your actual MySQL password and save the file.

**Option B — safer, recommended:** leave `app.py` untouched and instead set an environment variable in your terminal before running the app:

- **macOS/Linux:**
  ```bash
  export DB_PASSWORD=your_actual_mysql_password
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:DB_PASSWORD="your_actual_mysql_password"
  ```
- **Windows (cmd.exe):**
  ```cmd
  set DB_PASSWORD=your_actual_mysql_password
  ```

(Environment variables set this way only last for the current terminal session — you'll need to set it again if you close and reopen the terminal.)

### 6. Run the app

```bash
python app.py
```

You should see output ending in:
```
* Running on http://127.0.0.1:5000
```

### 7. Open it in your browser

Go to **http://127.0.0.1:5000**

You'll be redirected to the login page automatically — this is expected, it means the auth is working.

### 8. Log in

Use the [default credentials](#default-login-credentials) below. After logging in you'll land on the main task board with 3 sample tasks already loaded.

### 9. Stop the app when you're done

Go back to the terminal and press **Ctrl + C**.

---

## Default Login Credentials

| Username | Password    |
|----------|-------------|
| manager  | changeme123 |

⚠️ **Change this password before submitting or deploying anywhere public.** Generate a new hash:

```bash
python3 -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your_new_password'))"
```

Then update the database:

```sql
UPDATE users SET password_hash = '<paste hash here>' WHERE username = 'manager';
```

## API Reference

All `/api/*` routes require an active manager session (a valid login cookie) or they return `401 Unauthorized`.

| Method | Endpoint            | Description          | Auth required |
|--------|----------------------|----------------------|----------------|
| GET/POST | `/login`             | Manager sign-in form | No             |
| GET    | `/logout`             | Sign out              | Yes            |
| GET    | `/api/tasks`          | List all tasks       | Yes            |
| POST   | `/api/tasks`          | Create a task        | Yes            |
| PUT    | `/api/tasks/<id>`     | Update a task        | Yes            |
| DELETE | `/api/tasks/<id>`     | Delete a task        | Yes            |

**Example — create a task:**
```bash
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Buy groceries","priority":"medium","due_date":"2026-07-20"}'
```

## Security Notes

- Passwords are hashed with `werkzeug.security` (scrypt) — never stored in plain text.
- Sessions are signed using Flask's `secret_key`. Set a real random value in production via the `SECRET_KEY` environment variable:
  ```bash
  export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  ```
- The `role` column is a MySQL `ENUM('manager')`, so it is physically impossible to insert a row with any other role — this is enforced by the database itself, not just the application code.
- SQL queries use parameterized statements (`%s` placeholders) throughout, not string concatenation, to prevent SQL injection.
- Don't commit real database passwords or a production `SECRET_KEY` to GitHub. Use environment variables instead (see `.gitignore`, which already excludes `.env` files).

## Deploying to GitHub

See the step-by-step guide in the accompanying chat message. In short:

```bash
cd task-manager
git init
git add .
git commit -m "Task management system - full stack CRUD"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

## Author

Rupanjan Paul  
GitHub: [@sevastopaul2047](https://github.com/sevastopaul2047)
