-- Task Management System — Database Schema
-- Run this once in MySQL to set up the database:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS task_manager;
USE task_manager;

-- Only a manager account may log in. There is no self-registration --
-- the role column exists specifically so the login check can refuse
-- any account that is not 'manager', even if the users table later
-- grows more rows.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('manager') NOT NULL DEFAULT 'manager'
);

-- Default manager account: username "manager", password "changeme123"
-- CHANGE THIS PASSWORD before submitting/deploying -- see README.
INSERT INTO users (username, password_hash, role) VALUES
('manager', 'scrypt:32768:8:1$orlffUj0MW4itOjn$6b64e451efb25e79b3117f06add71a8c993296908416f091a10614e8bde2f7160dfb3c55fdc2b5f8d18fc72799b381e00e2f1909096e6259950e8d709407b988', 'manager');

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    due_date DATE,
    status ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A few sample rows so the app isn't empty on first run
INSERT INTO tasks (title, description, priority, due_date, status) VALUES
('Finish DBMS assignment', 'Normalize the schema to 3NF and submit on MP Online', 'high', '2026-07-10', 'pending'),
('Revise GATE aptitude', 'Clock problems and calendar arithmetic', 'medium', '2026-07-12', 'pending'),
('Push code to GitHub', 'Commit and push the task manager repo', 'low', '2026-07-09', 'completed');
