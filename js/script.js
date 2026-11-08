/**
 * TaskFlow – script.js
 * =====================================================================
 * A fully-featured To-Do List application demonstrating:
 *   • CRUD operations (Create, Read, Update, Delete)
 *   • DOM manipulation with native JS methods
 *   • Event handling (click, keydown, change, delegation)
 *   • State management via a centralized tasks array
 *   • LocalStorage persistence with JSON serialization
 *   • Light / Dark theme toggle
 * =====================================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────
   SECTION 1 – State
   The tasks array is the single source of truth for all task data.
   currentFilter tracks which filter tab is active.
   ───────────────────────────────────────────────────────────────────── */

/** @type {Array<{id: string, title: string, completed: boolean, createdAt: number}>} */
let tasks = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

/* ─────────────────────────────────────────────────────────────────────
   SECTION 2 – DOM References
   ───────────────────────────────────────────────────────────────────── */
const taskInput        = document.getElementById('taskInput');
const addTaskBtn       = document.getElementById('addTaskBtn');
const taskList         = document.getElementById('taskList');
const emptyState       = document.getElementById('emptyState');
const emptyTitle       = document.getElementById('emptyTitle');
const emptyDesc        = document.getElementById('emptyDesc');
const statTotal        = document.getElementById('statTotal');
const statActive       = document.getElementById('statActive');
const statCompleted    = document.getElementById('statCompleted');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggleBtn   = document.getElementById('themeToggle');
const currentDateEl    = document.getElementById('currentDate');
const footerYearEl     = document.getElementById('footerYear');
const toast            = document.getElementById('toast');
const modalOverlay     = document.getElementById('modalOverlay');
const modalClose       = document.getElementById('modalClose');
const modalCancel      = document.getElementById('modalCancel');
const modalSave        = document.getElementById('modalSave');
const editInput        = document.getElementById('editInput');
const filterButtons    = document.querySelectorAll('.filter-btn');

/* ─────────────────────────────────────────────────────────────────────
   SECTION 3 – Local Storage helpers
   ───────────────────────────────────────────────────────────────────── */
const LS_TASKS_KEY = 'taskflow_tasks';
const LS_THEME_KEY = 'taskflow_theme';

/**
 * Persist the current tasks array to LocalStorage.
 */
function saveTasks() {
  try {
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn('TaskFlow: could not save to LocalStorage.', err);
  }
}

/**
 * Load tasks from LocalStorage on startup.
 * Gracefully handles missing or malformed data.
 * @returns {Array} Parsed tasks array or empty array.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate: must be an array of objects with expected shape
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) => t && typeof t.id === 'string' && typeof t.title === 'string'
    );
  } catch (err) {
    console.warn('TaskFlow: could not parse LocalStorage data.', err);
    return [];
  }
}

/**
 * Persist the active theme to LocalStorage.
 * @param {'light'|'dark'} theme
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(LS_THEME_KEY, theme);
  } catch (_) {}
}

/**
 * Load saved theme preference.
 * Falls back to OS preference if nothing is stored.
 * @returns {'light'|'dark'}
 */
function loadTheme() {
  try {
    const saved = localStorage.getItem(LS_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) {}
  // OS preference fallback
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 4 – ID Generator
   ───────────────────────────────────────────────────────────────────── */

/**
 * Generate a unique ID string.
 * @returns {string}
 */
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 5 – CRUD Operations
   ───────────────────────────────────────────────────────────────────── */

/**
 * CREATE – Add a new task.
 * Trims whitespace and prevents empty submissions.
 */
function addTask() {
  const title = taskInput.value.trim();

  // Validation: reject empty / whitespace-only input
  if (!title) {
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () => {
      taskInput.classList.remove('shake');
    }, { once: true });
    showToast('Please enter a task title.', 'error');
    taskInput.focus();
    return;
  }

  /** @type {{id:string, title:string, completed:boolean, createdAt:number}} */
  const newTask = {
    id: generateId(),
    title,
    completed: false,
    createdAt: Date.now(),
  };

  // 1. Update state
  tasks.unshift(newTask); // new tasks appear at the top

  // 2. Persist to LocalStorage
  saveTasks();

  // 3. Re-render list
  renderTasks();

  // 4. Update statistics
  updateStats();

  // 5. User feedback
  showToast('Task added successfully!', 'success');

  // 6. Reset input
  taskInput.value = '';
  taskInput.focus();
}

/**
 * UPDATE – Toggle the completed status of a task.
 * @param {string} id  Task ID to toggle.
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // 1. Update state
  task.completed = !task.completed;

  // 2. Persist
  saveTasks();

  // 3. Re-render (preserves scroll by updating in-place where possible)
  renderTasks();

  // 4. Stats
  updateStats();
}

/**
 * UPDATE – Save edited task title from the modal.
 * @param {string} id        Task ID to update.
 * @param {string} newTitle  New title string.
 */
function saveTaskEdit(id, newTitle) {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    showToast('Task title cannot be empty.', 'error');
    editInput.focus();
    return;
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // 1. Update state
  task.title = trimmed;

  // 2. Persist
  saveTasks();

  // 3. Re-render
  renderTasks();

  // 4. Stats
  updateStats();

  // 5. Close modal & feedback
  closeModal();
  showToast('Task updated successfully!', 'success');
}

/**
 * DELETE – Remove a single task after confirmation.
 * @param {string} id  Task ID to delete.
 */
function deleteTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // Confirmation dialog before deletion
  const confirmed = window.confirm(
    `Delete task?\n\n"${task.title}"\n\nThis action cannot be undone.`
  );
  if (!confirmed) return;

  // 1. Update state
  tasks = tasks.filter((t) => t.id !== id);

  // 2. Persist
  saveTasks();

  // 3. Re-render
  renderTasks();

  // 4. Stats
  updateStats();

  // 5. Feedback
  showToast('Task deleted.', 'success');
}

/**
 * DELETE (batch) – Remove all completed tasks.
 */
function clearCompleted() {
  const completedCount = tasks.filter((t) => t.completed).length;
  if (completedCount === 0) {
    showToast('No completed tasks to clear.', 'error');
    return;
  }

  const confirmed = window.confirm(
    `Clear ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`
  );
  if (!confirmed) return;

  // 1. Update state
  tasks = tasks.filter((t) => !t.completed);

  // 2. Persist
  saveTasks();

  // 3. Re-render
  renderTasks();

  // 4. Stats
  updateStats();

  // 5. Feedback
  showToast(`${completedCount} task${completedCount > 1 ? 's' : ''} cleared.`, 'success');
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 6 – DOM Rendering
   ───────────────────────────────────────────────────────────────────── */

/**
 * Get the filtered subset of tasks based on currentFilter.
 * @returns {Array}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter((t) => !t.completed);
    case 'completed': return tasks.filter((t) =>  t.completed);
    default:          return tasks; // 'all'
  }
}

/**
 * Build a single task <li> element using DOM methods.
 * Uses textContent for user-entered data to prevent XSS.
 * @param {{id:string, title:string, completed:boolean}} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  // <li class="task-item [task-item--completed]" data-id="...">
  const li = document.createElement('li');
  li.classList.add('task-item');
  if (task.completed) li.classList.add('task-item--completed');
  li.dataset.id = task.id;

  // --- Checkbox wrapper ---
  const checkboxWrapper = document.createElement('div');
  checkboxWrapper.classList.add('task-item__checkbox-wrapper');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.classList.add('task-item__checkbox');
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
  // Change event handled via delegation on taskList
  checkbox.dataset.action = 'toggle';
  checkbox.dataset.id = task.id;

  checkboxWrapper.appendChild(checkbox);

  // --- Task title ---
  const titleEl = document.createElement('span');
  titleEl.classList.add('task-item__title');
  titleEl.textContent = task.title; // textContent prevents HTML injection

  // --- Action buttons ---
  const actions = document.createElement('div');
  actions.classList.add('task-item__actions');

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.classList.add('task-item__btn', 'task-item__btn--edit');
  editBtn.setAttribute('aria-label', `Edit task: ${task.title}`);
  editBtn.dataset.action = 'edit';
  editBtn.dataset.id = task.id;
  editBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('task-item__btn', 'task-item__btn--delete');
  deleteBtn.setAttribute('aria-label', `Delete task: ${task.title}`);
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.id = task.id;
  deleteBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>`;

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  // Assemble
  li.appendChild(checkboxWrapper);
  li.appendChild(titleEl);
  li.appendChild(actions);

  return li;
}

/**
 * Re-render the entire task list based on current state + filter.
 * Clears the list and rebuilds it using appendChild / createTaskElement.
 */
function renderTasks() {
  const filtered = getFilteredTasks();

  // Clear existing list items
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    // Show appropriate empty state
    taskList.hidden = true;
    emptyState.hidden = false;
    updateEmptyState();
  } else {
    taskList.hidden = false;
    emptyState.hidden = true;

    // Build and append each task element
    const fragment = document.createDocumentFragment();
    filtered.forEach((task) => {
      fragment.appendChild(createTaskElement(task));
    });
    taskList.appendChild(fragment); // Single DOM write
  }
}

/**
 * Update the empty state title and description based on the current filter.
 */
function updateEmptyState() {
  switch (currentFilter) {
    case 'active':
      emptyTitle.textContent = 'No active tasks';
      emptyDesc.textContent  = 'All caught up! Add a new task above.';
      break;
    case 'completed':
      emptyTitle.textContent = 'No completed tasks yet';
      emptyDesc.textContent  = 'Complete a task to see it here.';
      break;
    default:
      emptyTitle.textContent = 'No tasks yet';
      emptyDesc.textContent  = 'Add your first task above to get started!';
  }
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 7 – Statistics
   ───────────────────────────────────────────────────────────────────── */

/**
 * Recalculate and update the stats counters in the DOM.
 */
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active    = total - completed;

  statTotal.textContent     = total;
  statActive.textContent    = active;
  statCompleted.textContent = completed;
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 8 – Filter Management
   ───────────────────────────────────────────────────────────────────── */

/**
 * Set the active filter and re-render the task list.
 * @param {'all'|'active'|'completed'} filter
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update aria-pressed and CSS class on filter buttons
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('filter-btn--active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  renderTasks();
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 9 – Modal (Edit Dialog)
   ───────────────────────────────────────────────────────────────────── */
let editingTaskId = null; // Tracks which task is currently being edited

/**
 * Open the edit modal pre-filled with the task's current title.
 * @param {string} id  Task ID to edit.
 */
function openModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId = id;
  editInput.value = task.title;
  modalOverlay.hidden = false;
  editInput.focus();
  editInput.select(); // Select all text for quick replacement
}

/**
 * Close the edit modal and reset state.
 */
function closeModal() {
  modalOverlay.hidden = true;
  editingTaskId = null;
  editInput.value = '';
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 10 – Toast Notifications
   ───────────────────────────────────────────────────────────────────── */
let toastTimer = null;

/**
 * Show a brief toast notification.
 * @param {string} message  Text to display.
 * @param {'success'|'error'|''} type  Visual variant.
 * @param {number} [duration=2800]  Auto-hide delay in ms.
 */
function showToast(message, type = '', duration = 2800) {
  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.className = 'toast'; // Reset classes
  if (type) toast.classList.add(`toast--${type}`);
  toast.classList.add('toast--show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--show');
  }, duration);
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 11 – Theme Toggle
   ───────────────────────────────────────────────────────────────────── */

/**
 * Apply a theme to the document root and persist it.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
}

/**
 * Toggle between light and dark themes.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 12 – Date Display
   ───────────────────────────────────────────────────────────────────── */

/**
 * Render the current date in the header.
 */
function renderDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDateEl.textContent = now.toLocaleDateString(undefined, options);
  footerYearEl.textContent  = now.getFullYear();
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION 13 – Event Listeners
   ───────────────────────────────────────────────────────────────────── */

// --- Add Task ---

/** Click event on Add Task button */
addTaskBtn.addEventListener('click', addTask);

/**
 * Keyboard event: submit task with Enter key.
 * Uses keydown for responsiveness.
 */
taskInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTask();
  }
});

// --- Task List (Event Delegation) ---
// A single listener on the parent handles all dynamically generated task buttons.

taskList.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const { action, id } = target.dataset;

  switch (action) {
    case 'edit':   openModal(id);  break;
    case 'delete': deleteTask(id); break;
    default: break;
  }
});

/** Change event delegation for checkboxes */
taskList.addEventListener('change', (event) => {
  const target = event.target.closest('[data-action="toggle"]');
  if (!target) return;
  toggleTask(target.dataset.id);
});

// --- Filters ---

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
  });
});

// --- Clear Completed ---

clearCompletedBtn.addEventListener('click', clearCompleted);

// --- Theme Toggle ---

themeToggleBtn.addEventListener('click', toggleTheme);

// --- Modal Events ---

/** Close modal when clicking the X button */
modalClose.addEventListener('click', closeModal);

/** Close modal when clicking Cancel */
modalCancel.addEventListener('click', closeModal);

/** Save changes from modal */
modalSave.addEventListener('click', () => {
  if (editingTaskId !== null) {
    saveTaskEdit(editingTaskId, editInput.value);
  }
});

/** Save on Enter key within the edit input */
editInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (editingTaskId !== null) {
      saveTaskEdit(editingTaskId, editInput.value);
    }
  }
  if (event.key === 'Escape') {
    closeModal();
  }
});

/** Close modal by clicking the backdrop */
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

/** Global Escape key closes modal */
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.hidden) {
    closeModal();
  }
});

/* ─────────────────────────────────────────────────────────────────────
   SECTION 14 – CSS Animation Helper
   Add a quick shake animation via CSS class (defined inline to avoid
   adding non-essential styles to the stylesheet).
   ───────────────────────────────────────────────────────────────────── */
(function injectShakeAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
    .shake { animation: shake 0.4s ease; }
  `;
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────────────────────────────────
   SECTION 15 – Initialization
   Bootstrap the application on DOMContentLoaded.
   ───────────────────────────────────────────────────────────────────── */
function init() {
  // 1. Load persisted tasks from LocalStorage
  tasks = loadTasks();

  // 2. Apply saved / preferred theme
  applyTheme(loadTheme());

  // 3. Render the current date
  renderDate();

  // 4. Render task list
  renderTasks();

  // 5. Update stats counters
  updateStats();

  // 6. Focus input for immediate interaction
  taskInput.focus();
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', init);
