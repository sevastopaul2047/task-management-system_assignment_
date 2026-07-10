/* The Ledger — frontend logic
   Talks to the Flask REST API with fetch(). No page reloads. */

const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskForm = document.getElementById("task-form");
const countPending = document.getElementById("count-pending");
const countDone = document.getElementById("count-done");

let tasks = [];

// ---- Helpers ----
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDue(dueDate) {
  if (!dueDate) return "—";
  const [y, m, d] = dueDate.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function isOverdue(task) {
  return task.status !== "completed" && task.due_date && task.due_date < todayISO();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    return null;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

// ---- Load + render ----
async function loadTasks() {
  try {
    tasks = await apiFetch("/api/tasks");
    if (tasks) render();
  } catch (err) {
    console.error(err);
    alert("Could not load tasks: " + err.message);
  }
}

function render() {
  taskList.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    tasks.forEach((task) => taskList.appendChild(buildRow(task)));
  }

  const pending = tasks.filter((t) => t.status !== "completed").length;
  const done = tasks.filter((t) => t.status === "completed").length;
  countPending.textContent = pending;
  countDone.textContent = done;
}

function buildRow(task) {
  const row = document.createElement("div");
  row.className = `task-row priority-${task.priority}${task.status === "completed" ? " completed" : ""}`;
  row.dataset.id = task.id;

  const overdue = isOverdue(task);

  row.innerHTML = `
    <input type="checkbox" class="task-check" ${task.status === "completed" ? "checked" : ""} title="Mark ${task.status === "completed" ? "incomplete" : "complete"}">
    <div class="task-title-wrap">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
    </div>
    <span class="pill pill-${task.priority}">${task.priority}</span>
    <span class="task-due${overdue ? " overdue" : ""}">${formatDue(task.due_date)}</span>
    <div class="task-actions">
      <button type="button" class="icon-btn btn-edit" title="Edit">✎</button>
      <button type="button" class="icon-btn btn-delete" title="Delete">🗑</button>
    </div>
    ${task.status === "completed" ? `<span class="stamp">Closed</span>` : ""}
  `;

  row.querySelector(".task-check").addEventListener("change", () => toggleStatus(task));
  row.querySelector(".btn-delete").addEventListener("click", () => deleteTask(task));
  row.querySelector(".btn-edit").addEventListener("click", () => enterEditMode(row, task));

  return row;
}

// ---- Create ----
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    priority: document.getElementById("priority").value,
    due_date: document.getElementById("due_date").value || null,
  };

  if (!payload.title) return;

  try {
    await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    taskForm.reset();
    document.getElementById("priority").value = "medium";
    await loadTasks();
  } catch (err) {
    alert("Could not create task: " + err.message);
  }
});

// ---- Toggle complete/incomplete ----
async function toggleStatus(task) {
  const newStatus = task.status === "completed" ? "pending" : "completed";
  try {
    await apiFetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    await loadTasks();
  } catch (err) {
    alert("Could not update task: " + err.message);
  }
}

// ---- Delete ----
async function deleteTask(task) {
  if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    await loadTasks();
  } catch (err) {
    alert("Could not delete task: " + err.message);
  }
}

// ---- Inline edit ----
function enterEditMode(row, task) {
  row.classList.add("editing");
  const titleWrap = row.querySelector(".task-title-wrap");
  const priorityPill = row.querySelector(".pill");
  const dueSpan = row.querySelector(".task-due");
  const actions = row.querySelector(".task-actions");

  titleWrap.innerHTML = `
    <input type="text" class="edit-title" value="${escapeHtml(task.title)}">
    <input type="text" class="edit-desc" placeholder="Optional detail" value="${escapeHtml(task.description || "")}">
  `;

  priorityPill.outerHTML = `
    <select class="edit-priority">
      <option value="low" ${task.priority === "low" ? "selected" : ""}>Low</option>
      <option value="medium" ${task.priority === "medium" ? "selected" : ""}>Medium</option>
      <option value="high" ${task.priority === "high" ? "selected" : ""}>High</option>
    </select>
  `;

  dueSpan.outerHTML = `<input type="date" class="edit-due" value="${task.due_date || ""}">`;

  actions.innerHTML = `
    <button type="button" class="icon-btn btn-save" title="Save">✔</button>
    <button type="button" class="icon-btn btn-cancel" title="Cancel">✕</button>
  `;

  row.querySelector(".btn-save").addEventListener("click", () => saveEdit(row, task));
  row.querySelector(".btn-cancel").addEventListener("click", () => render());
}

async function saveEdit(row, task) {
  const title = row.querySelector(".edit-title").value.trim();
  if (!title) {
    alert("Title can't be empty.");
    return;
  }

  const payload = {
    title,
    description: row.querySelector(".edit-desc").value.trim(),
    priority: row.querySelector(".edit-priority").value,
    due_date: row.querySelector(".edit-due").value || null,
  };

  try {
    await apiFetch(`/api/tasks/${task.id}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadTasks();
  } catch (err) {
    alert("Could not save task: " + err.message);
  }
}

// ---- Init ----
loadTasks();
