/* Agent UI — MVP
   - Chat + Task board + Logs
   - LocalStorage persistence
   - Mock agent execution (rule-based) to demonstrate flow
*/

const STORAGE_KEY = "agent_ui_state_v1";

const els = {
  navBtns: document.querySelectorAll(".navBtn"),
  tabs: {
    ops: document.getElementById("tab-ops"),
    tools: document.getElementById("tab-tools"),
    settings: document.getElementById("tab-settings"),
  },

  chat: document.getElementById("chat"),
  chatForm: document.getElementById("chatForm"),
  chatText: document.getElementById("chatText"),

  colBacklog: document.getElementById("colBacklog"),
  colDoing: document.getElementById("colDoing"),
  colDone: document.getElementById("colDone"),

  logs: document.getElementById("logs"),

  kpiTasks: document.getElementById("kpiTasks"),
  kpiPending: document.getElementById("kpiPending"),
  kpiDone: document.getElementById("kpiDone"),
  kpiLogs: document.getElementById("kpiLogs"),

  btnNewTask: document.getElementById("btnNewTask"),
  btnRunAgent: document.getElementById("btnRunAgent"),
  btnExport: document.getElementById("btnExport"),
  btnClearLogs: document.getElementById("btnClearLogs"),
  btnReset: document.getElementById("btnReset"),

  modal: document.getElementById("modal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskPriority: document.getElementById("taskPriority"),
  taskNotes: document.getElementById("taskNotes"),

  toolCalendar: document.getElementById("toolCalendar"),
  toolSheets: document.getElementById("toolSheets"),
  toolPDF: document.getElementById("toolPDF"),
  toolWhatsApp: document.getElementById("toolWhatsApp"),

  agentName: document.getElementById("agentName"),
  agentBrief: document.getElementById("agentBrief"),
  agentAutoRun: document.getElementById("agentAutoRun"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),

  agentStatusChip: document.getElementById("agentStatusChip"),
};

const state = loadState() ?? {
  settings: {
    agentName: "Oasis Agent",
    agentBrief: "Directo, técnico, orientado a resultados.",
    autoRun: "off",
  },
  tools: {
    calendar: true,
    sheets: true,
    pdf: true,
    whatsapp: false,
  },
  chat: [
    { role: "agent", text: "Online. Dame un objetivo y lo convierto en tareas ejecutables. (Sin drama, con métricas.)" }
  ],
  tasks: [],
  logs: [],
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function nowISO() {
  return new Date().toISOString();
}

function log(type, message, meta = {}) {
  state.logs.unshift({ ts: nowISO(), type, message, meta });
  // keep logs bounded
  state.logs = state.logs.slice(0, 300);
  saveState();
  renderLogs();
  renderKPIs();
}

function addChat(role, text) {
  state.chat.push({ role, text });
  // keep bounded
  state.chat = state.chat.slice(-120);
  saveState();
  renderChat();
}

function createTask({ title, priority = "P3", notes = "" }) {
  const task = {
    id: uid(),
    title: title.trim(),
    priority,
    notes: notes.trim(),
    status: "backlog", // backlog | doing | done
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  state.tasks.unshift(task);
  saveState();
  renderBoard();
  renderKPIs();
  log("TASK_CREATE", `Tarea creada: ${task.title}`, { id: task.id, priority: task.priority });
  return task;
}

function moveTask(id, status) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.status = status;
  t.updatedAt = nowISO();
  saveState();
  renderBoard();
  renderKPIs();
  log("TASK_MOVE", `Tarea movida: ${t.title} → ${status}`, { id: t.id });
}

function deleteTask(id) {
  const idx = state.tasks.findIndex(x => x.id === id);
  if (idx === -1) return;
  const t = state.tasks[idx];
  state.tasks.splice(idx, 1);
  saveState();
  renderBoard();
  renderKPIs();
  log("TASK_DELETE", `Tarea eliminada: ${t.title}`, { id: t.id });
}

function renderChat() {
  els.chat.innerHTML = "";
  for (const m of state.chat) {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "agent"}`;
    div.textContent = m.text;
    els.chat.appendChild(div);
  }
  els.chat.scrollTop = els.chat.scrollHeight;
}

function taskCard(task) {
  const div = document.createElement("div");
  div.className = "task";

  const top = document.createElement("div");
  top.className = "taskTop";

  const title = document.createElement("div");
  title.className = "taskTitle";
  title.textContent = task.title;

  const badge = document.createElement("div");
  badge.className = `badge ${task.priority.toLowerCase()}`;
  badge.textContent = task.priority;

  top.appendChild(title);
  top.appendChild(badge);

  const notes = document.createElement("div");
  notes.className = "taskNotes";
  notes.textContent = task.notes || "—";

  const actions = document.createElement("div");
  actions.className = "taskActions";

  const btnBacklog = mkBtn("Backlog", () => moveTask(task.id, "backlog"));
  const btnDoing = mkBtn("Progreso", () => moveTask(task.id, "doing"));
  const btnDone = mkBtn("Hecho", () => moveTask(task.id, "done"));
  const btnDel = mkBtn("Eliminar", () => deleteTask(task.id));

  actions.append(btnBacklog, btnDoing, btnDone, btnDel);

  div.append(top, notes, actions);
  return div;
}

function mkBtn(label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function renderBoard() {
  els.colBacklog.innerHTML = "";
  els.colDoing.innerHTML = "";
  els.colDone.innerHTML = "";

  const backlog = state.tasks.filter(t => t.status === "backlog");
  const doing = state.tasks.filter(t => t.status === "doing");
  const done = state.tasks.filter(t => t.status === "done");

  for (const t of backlog) els.colBacklog.appendChild(taskCard(t));
  for (const t of doing) els.colDoing.appendChild(taskCard(t));
  for (const t of done) els.colDone.appendChild(taskCard(t));
}

function renderLogs() {
  els.logs.textContent = state.logs
    .map(l => `[${l.ts}] ${l.type} — ${l.message}`)
    .join("\n");
}

function renderKPIs() {
  const total = state.tasks.length;
  const pending = state.tasks.filter(t => t.status !== "done").length;
  const done = state.tasks.filter(t => t.status === "done").length;
  const logs = state.logs.length;

  els.kpiTasks.textContent = String(total);
  els.kpiPending.textContent = String(pending);
  els.kpiDone.textContent = String(done);
  els.kpiLogs.textContent = String(logs);
}

function applySettingsToUI() {
  els.agentName.value = state.settings.agentName;
  els.agentBrief.value = state.settings.agentBrief;
  els.agentAutoRun.value = state.settings.autoRun;

  els.toolCalendar.checked = state.tools.calendar;
  els.toolSheets.checked = state.tools.sheets;
  els.toolPDF.checked = state.tools.pdf;
  els.toolWhatsApp.checked = state.tools.whatsapp;
}

function showModal(show) {
  els.modal.classList.toggle("show", !!show);
}

/* ---------- Mock Agent Logic ----------
   Convierte mensajes a acciones:
   - Si detecta "cotización" o "quote" -> crea tarea PDF
   - Si detecta "cita" -> crea tarea Calendar
   - Si detecta "registro" -> tarea Sheets
   - Si detecta "whatsapp" -> tarea WhatsApp
*/
function runAgentOnce() {
  // pick next backlog task and "execute" to move to done (simulation)
  const next = state.tasks.find(t => t.status === "backlog") || state.tasks.find(t => t.status === "doing");
  if (!next) {
    addChat("agent", "No hay tareas para ejecutar. Dame un objetivo o crea tareas. (El agente no hace magia sin backlog.)");
    log("AGENT_IDLE", "Sin tareas disponibles");
    return;
  }

  moveTask(next.id, "doing");
  addChat("agent", `Ejecutando: "${next.title}"…`);

  // simulate execution delay
  setTimeout(() => {
    // tool gating
    const needs = inferToolNeed(next.title + " " + next.notes);
    if (needs && !state.tools[needs]) {
      moveTask(next.id, "backlog");
      addChat("agent", `Bloqueado: esa tarea requiere herramienta "${needs}" y está desactivada. Actívala en Herramientas.`);
      log("AGENT_BLOCKED", "Tool desactivada", { taskId: next.id, tool: needs });
      return;
    }

    moveTask(next.id, "done");
    addChat("agent", `Listo. Resultado: completé "${next.title}". Siguiente.`);
    log("AGENT_DONE", "Tarea completada (simulada)", { taskId: next.id });

    if (state.settings.autoRun === "on") {
      setTimeout(runAgentOnce, 350);
    }
  }, 450);
}

function inferToolNeed(text) {
  const t = text.toLowerCase();
  if (t.includes("cita") || t.includes("agenda") || t.includes("calendar")) return "calendar";
  if (t.includes("sheet") || t.includes("registro") || t.includes("kpi")) return "sheets";
  if (t.includes("pdf") || t.includes("reporte") || t.includes("cotización") || t.includes("quote")) return "pdf";
  if (t.includes("whatsapp") || t.includes("mensaje")) return "whatsapp";
  return null;
}

function parseChatCommand(text) {
  const raw = text.trim();
  if (!raw.startsWith("/")) return null;

  const [cmd, ...rest] = raw.split(" ");
  const payload = rest.join(" ").trim();

  if (cmd === "/clear") return { type: "CLEAR" };
  if (cmd === "/task") return { type: "TASK", payload };
  if (cmd === "/done") return { type: "DONE", payload };
  return { type: "UNKNOWN", cmd };
}

function smartTaskFromText(text) {
  const t = text.toLowerCase();

  // priority guess
  let priority = "P3";
  if (t.includes("urgente") || t.includes("emergencia") || t.includes("ahora")) priority = "P1";
  else if (t.includes("hoy") || t.includes("rápido")) priority = "P2";

  // title guess
  let title = text.trim();
  if (title.length > 70) title = title.slice(0, 70) + "…";

  // notes guess: include tool hint
  const tool = inferToolNeed(text);
  const notes = tool ? `Requiere tool: ${tool}` : "";

  return { title, priority, notes };
}

/* ---------- Events ---------- */
els.navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    els.navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;

    Object.values(els.tabs).forEach(t => t.classList.remove("active"));
    els.tabs[tab].classList.add("active");
  });
});

els.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.chatText.value.trim();
  if (!text) return;
  els.chatText.value = "";

  addChat("user", text);

  const cmd = parseChatCommand(text);
  if (cmd) {
    if (cmd.type === "CLEAR") {
      state.chat = [{ role: "agent", text: "Chat limpio. Nuevo sprint, nuevas victorias." }];
      saveState();
      renderChat();
      log("CHAT_CLEAR", "Chat limpiado");
      return;
    }

    if (cmd.type === "TASK") {
      if (!cmd.payload) {
        addChat("agent", "Uso: /task <título de la tarea>");
        return;
      }
      const task = createTask(smartTaskFromText(cmd.payload));
      addChat("agent", `Task creada: ${task.title} (${task.priority}).`);
      if (state.settings.autoRun === "on") runAgentOnce();
      return;
    }

    if (cmd.type === "DONE") {
      const needle = (cmd.payload || "").toLowerCase();
      const candidate = state.tasks.find(t => t.title.toLowerCase().includes(needle) && t.status !== "done");
      if (!candidate) {
        addChat("agent", "No encontré una tarea que coincida. Tip: /done <palabra del título>");
        return;
      }
      moveTask(candidate.id, "done");
      addChat("agent", `Marcada como hecha: "${candidate.title}".`);
      return;
    }

    addChat("agent", `Comando no reconocido: ${cmd.cmd}. Prueba /task, /done, /clear`);
    return;
  }

  // Non-command: convert intention into tasks + response
  const suggestion = smartTaskFromText(text);
  const task = createTask(suggestion);

  const toolNeed = inferToolNeed(text);
  const toolText = toolNeed ? `Herramienta detectada: ${toolNeed}.` : "No veo herramienta obligatoria.";
  addChat("agent",
    `Entendido. Lo bajé a tarea y lo metí al pipeline.\n` +
    `${toolText}\n` +
    `Si quieres ejecución automática, activa Auto-ejecución en Ajustes.`
  );

  if (state.settings.autoRun === "on") runAgentOnce();
});

els.btnNewTask.addEventListener("click", () => showModal(true));
els.btnCloseModal.addEventListener("click", () => showModal(false));
els.modal.addEventListener("click", (e) => {
  if (e.target === els.modal) showModal(false);
});

els.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = els.taskTitle.value.trim();
  if (!title) return;

  createTask({
    title,
    priority: els.taskPriority.value,
    notes: els.taskNotes.value,
  });

  els.taskTitle.value = "";
  els.taskNotes.value = "";
  els.taskPriority.value = "P3";
  showModal(false);

  addChat("agent", "Tarea creada. Ahora sí: a ejecutar, no a contemplar.");
  if (state.settings.autoRun === "on") runAgentOnce();
});

els.btnRunAgent.addEventListener("click", () => {
  addChat("agent", "Modo ejecución: ON. (Simulación, pero con actitud de producción.)");
  log("AGENT_RUN", "Ejecución iniciada");
  runAgentOnce();
});

els.btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "agent-ui-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
  log("EXPORT", "Estado exportado a JSON");
});

els.btnClearLogs.addEventListener("click", () => {
  state.logs = [];
  saveState();
  renderLogs();
  renderKPIs();
  log("LOGS_RESET", "Logs reiniciados");
});

els.btnReset.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// tools
function syncToolsFromUI() {
  state.tools.calendar = !!els.toolCalendar.checked;
  state.tools.sheets = !!els.toolSheets.checked;
  state.tools.pdf = !!els.toolPDF.checked;
  state.tools.whatsapp = !!els.toolWhatsApp.checked;
  saveState();
  log("TOOLS_UPDATE", "Herramientas actualizadas", { tools: state.tools });
}

[els.toolCalendar, els.toolSheets, els.toolPDF, els.toolWhatsApp].forEach(x => {
  x.addEventListener("change", syncToolsFromUI);
});

// tool simulation buttons
document.querySelectorAll("[data-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    const map = {
      "simulate-calendar": "Calendar: cita simulada creada.",
      "simulate-sheet": "Sheets: registro simulado guardado.",
      "simulate-pdf": "PDF: reporte simulado generado.",
      "simulate-whatsapp": "WhatsApp: mensaje simulado enviado.",
    };
    addChat("agent", map[action] || "Acción simulada.");
    log("TOOL_CALL", map[action] || "Acción simulada.", { action });
  });
});

// settings
els.btnSaveSettings.addEventListener("click", () => {
  state.settings.agentName = els.agentName.value.trim() || "Agent";
  state.settings.agentBrief = els.agentBrief.value.trim() || "";
  state.settings.autoRun = els.agentAutoRun.value;

  saveState();
  log("SETTINGS_SAVE", "Ajustes guardados", { settings: state.settings });
  addChat("agent", `Ajustes guardados. Agente: "${state.settings.agentName}". Auto-ejecución: ${state.settings.autoRun.toUpperCase()}.`);
});

/* ---------- Init ---------- */
function init() {
  applySettingsToUI();
  renderChat();
  renderBoard();
  renderLogs();
  renderKPIs();

  // tiny status
  els.agentStatusChip.textContent = "● Online";
  addChat("agent", `Panel listo. KPI arriba, ejecución al lado. Esto no es terapia, es operación.`);
}

init();
