# TaskFlow – Interactive To-Do List Application

> **A modern, professional task management dashboard built with Vanilla JavaScript, HTML5 & CSS3.**

---

## 📌 Project Overview

TaskFlow is a fully-featured, single-page task management web application that demonstrates core JavaScript fundamentals: DOM manipulation, event handling, CRUD operations, state management and browser Local Storage persistence. It is designed to look and feel like a premium productivity tool.

---

## 🎯 Project Objectives

- Demonstrate complete **CRUD** functionality using Vanilla JavaScript
- Show real-world **DOM manipulation** using native browser APIs
- Implement thorough **event handling** including keyboard events and event delegation
- Manage application **state** with a centralized JavaScript array as the single source of truth
- Persist data across page refreshes using **browser Local Storage**
- Deliver a **responsive, accessible, premium UI** without frameworks or libraries

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🆕 Add Tasks | Input field + button, Enter-key support, empty-task validation |
| ✏️ Edit Tasks | Inline modal dialog with pre-filled text, Escape/Enter shortcuts |
| ✅ Complete Tasks | Custom animated circular checkboxes with visual feedback |
| 🗑️ Delete Tasks | Per-task delete with confirmation dialog |
| 🧹 Clear Completed | Batch-remove all completed tasks with one click |
| 📊 Live Stats | Total / Active / Completed counters update in real time |
| 🔍 Filters | All · Active · Completed tab filters update instantly |
| 💾 Persistence | Tasks auto-saved to and loaded from Local Storage |
| 🌙 Dark Mode | Light / Dark theme toggle, persisted across sessions |
| 📅 Date Display | Current date shown in header |
| 📱 Responsive | Mobile-first, works from 375 px to 1440 px+ |
| ♿ Accessible | ARIA labels, keyboard navigation, focus management |
| 🎉 Toast Alerts | Non-blocking success/error notifications |
| 🌀 Animations | Slide-in cards, shake validation, smooth transitions |

---

## 🛠️ Technologies Used

| Technology | Purpose |
|-----------|---------|
| **HTML5** | Semantic markup, ARIA accessibility attributes |
| **CSS3** | Custom Properties (variables), Flexbox, CSS Grid, animations |
| **Vanilla JavaScript (ES6+)** | Application logic, DOM manipulation, state management |
| **Web Storage API** | `localStorage` for persistence |
| **Google Fonts – Inter** | Modern, readable typography |

> No frameworks, build tools, or external JavaScript libraries are used.

---

## 📂 Project Structure

```
taskflow-todo/
│
├── index.html              # Application shell & semantic HTML
├── css/
│   └── style.css           # All styles with CSS custom properties
├── js/
│   └── script.js           # Complete JavaScript application
├── assets/
│   └── images/             # (Reserved for screenshots/icons)
└── README.md               # This file
```

---

## 🔄 CRUD Functionality

### Create
```js
function addTask() {
  const title = taskInput.value.trim();
  if (!title) { /* validation */ return; }
  tasks.unshift({ id: generateId(), title, completed: false, createdAt: Date.now() });
  saveTasks();   // → LocalStorage
  renderTasks(); // → DOM
  updateStats(); // → counters
}
```

### Read
```js
function renderTasks() {
  const filtered = getFilteredTasks();  // apply current filter
  taskList.innerHTML = '';
  filtered.forEach(task => {
    taskList.appendChild(createTaskElement(task)); // createElement + appendChild
  });
}
```

### Update
```js
function toggleTask(id)           { /* flip task.completed */ saveTasks(); renderTasks(); }
function saveTaskEdit(id, title)  { /* update task.title   */ saveTasks(); renderTasks(); }
```

### Delete
```js
function deleteTask(id) {
  if (!window.confirm('Delete task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(); renderTasks(); updateStats();
}
```

---

## 🖥️ DOM Manipulation

The application dynamically generates every task element using native DOM methods — no HTML strings or template literals for user data:

```js
const li       = document.createElement('li');
const checkbox = document.createElement('input');
const titleEl  = document.createElement('span');
titleEl.textContent = task.title;  // XSS-safe, no innerHTML for user data
li.classList.add('task-item');
li.dataset.id = task.id;
li.appendChild(checkbox);
li.appendChild(titleEl);
taskList.appendChild(li);
```

Key DOM APIs used:
- `document.createElement()` / `createDocumentFragment()`
- `element.appendChild()` / `innerHTML` (safe static SVG icons only)
- `element.textContent` (user data, XSS-safe)
- `element.classList.add()` / `.remove()` / `.toggle()`
- `element.dataset`
- `document.querySelector()` / `document.getElementById()`
- `element.addEventListener()`

---

## ⚡ Event Handling

| Event Type | Handler | Purpose |
|-----------|---------|---------|
| `click` | `addTaskBtn` | Add a task |
| `keydown` (`Enter`) | `taskInput` | Add task on Enter |
| `click` (delegated) | `taskList` | Edit / Delete via `data-action` |
| `change` (delegated) | `taskList` | Toggle checkbox completion |
| `click` | Filter buttons | Switch filter tabs |
| `click` | `clearCompletedBtn` | Clear completed tasks |
| `click` | `themeToggleBtn` | Switch theme |
| `click` | `modalSave/Close/Cancel` | Modal controls |
| `keydown` (`Enter`/`Escape`) | `editInput` | Modal keyboard shortcuts |
| `click` | `modalOverlay` | Close modal on backdrop click |
| `keydown` (`Escape`) | `document` | Global modal close |

**Event Delegation** is used for the task list so a single listener handles all dynamically generated task buttons efficiently.

---

## 💾 Local Storage Implementation

```js
const LS_TASKS_KEY = 'taskflow_tasks';
const LS_THEME_KEY = 'taskflow_theme';

// Save
function saveTasks() {
  localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks));
}

// Load (with validation & error handling)
function loadTasks() {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string');
  } catch (err) {
    return []; // graceful fallback for corrupt data
  }
}
```

- Uses `JSON.stringify()` to serialize the tasks array
- Uses `JSON.parse()` to deserialize with structural validation
- Handles empty storage, malformed JSON, and type mismatches
- Theme preference is also persisted separately

---

## 🗺️ State Management

```
User Action
    │
    ▼
1. Update tasks[] array  ← Single source of truth
    │
    ▼
2. saveTasks()           ← Persist to LocalStorage
    │
    ▼
3. renderTasks()         ← Re-render DOM from state
    │
    ▼
4. updateStats()         ← Sync statistics counters
```

- `tasks` — master array of all task objects
- `currentFilter` — `'all' | 'active' | 'completed'`
- `editingTaskId` — ID of the task currently open in the modal

---

## 🚀 How to Run

No installation or build step required.

1. **Clone or download** this repository.
2. Open the `taskflow-todo/` folder.
3. **Double-click `index.html`** to open it in your browser.

That's it! The application runs entirely in the browser.

> Works in all modern browsers: Chrome, Firefox, Edge, Safari.

---

## 📸 Screenshots

> _Add screenshots of the application here._

Place screenshot images in `assets/images/` and reference them:

```md
![TaskFlow Light Mode](assets/images/screenshot-light.png)
![TaskFlow Dark Mode](assets/images/screenshot-dark.png)
![TaskFlow Mobile](assets/images/screenshot-mobile.png)
```

---

## 🧪 Testing Checklist

- [x] Add tasks with the button and the Enter key
- [x] Empty / whitespace-only tasks are rejected with feedback
- [x] Edit existing tasks via modal
- [x] Delete tasks with confirmation prompt
- [x] Toggle task completion (complete & uncomplete)
- [x] All / Active / Completed filters work correctly
- [x] Clear Completed button removes only completed tasks
- [x] Tasks survive a browser refresh (Local Storage persistence)
- [x] Stats update automatically for every action
- [x] Responsive layout on mobile (375 px), tablet (768 px), desktop (1440 px)
- [x] No JavaScript console errors
- [x] Dark / Light mode toggle and persistence

---

## 👤 Author

**TaskFlow** – Built as a Vanilla JavaScript demonstration project.

- Language: JavaScript (ES6+)
- Styling: CSS3 with custom properties
- Storage: Web Storage API (localStorage)

---

*TaskFlow © 2026 – Built with ❤️ using Vanilla JavaScript & Local Storage*
