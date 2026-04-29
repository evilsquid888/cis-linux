// ============================================================
//  CIS Linux Tutorial — shared shell
//  Loaded by every HTML page after lesson data + lessons.js
// ============================================================

const STORAGE_KEY = "cis-linux-tutorial";
const SCHEMA_VERSION = 1;
const SAVE_DEBOUNCE_MS = 500;

// ---- State factory ----

function blankState() {
  const now = new Date().toISOString();
  const lessons = {};
  for (const l of LESSONS) {
    lessons[l.id] = {
      visited: false,
      complete: false,
      visitedAt: null,
      completedAt: null,
      notes: "",
      checks: {}
    };
    for (const c of (l.checks || [])) {
      lessons[l.id].checks[c.id] = { ticked: false, finding: null };
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      assessorName: "",
      assessorOrg: "",
      customerName: "Acme Corp",
      startedAt: now,
      lastVisited: now
    },
    lessons,
    report: {
      generatedAt: null,
      customerNameSnapshot: null,
      executiveNote: ""
    }
  };
}

// ---- Load + migrate ----

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return blankState();
  let s;
  try { s = JSON.parse(raw); } catch { return blankState(); }
  if (!s || s.schemaVersion !== SCHEMA_VERSION) return blankState();

  // Reconcile lesson list — add missing lessons / checks since last save
  const fresh = blankState();
  for (const lid in fresh.lessons) {
    if (!s.lessons[lid]) s.lessons[lid] = fresh.lessons[lid];
    else {
      for (const cid in fresh.lessons[lid].checks) {
        if (!s.lessons[lid].checks[cid]) {
          s.lessons[lid].checks[cid] = fresh.lessons[lid].checks[cid];
        }
      }
    }
  }
  return s;
}

// ---- Debounced save ----

let saveTimer = null;
function saveState(state) {
  if (saveTimer) clearTimeout(saveTimer);
  showSaveStatus("saving");
  saveTimer = setTimeout(() => {
    state.metadata.lastVisited = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showSaveStatus("saved");
  }, SAVE_DEBOUNCE_MS);
}

function showSaveStatus(status) {
  const el = document.getElementById("save-status");
  if (!el) return;
  if (status === "saving") { el.textContent = "Saving…"; el.className = "save-status saving"; }
  else if (status === "saved") { el.textContent = "Saved";   el.className = "save-status saved"; }
  else el.textContent = "";
}

// ---- Single shared state instance ----

const STATE = loadState();
function persist() { saveState(STATE); }

// Reset
function resetState() {
  if (!confirm("Reset all assessment progress? This can't be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// Will be expanded in following tasks.

// ============================================================
//  Settings overlay — assessor / customer metadata
// ============================================================

function injectSettingsOverlay() {
  if (document.getElementById("settings-overlay")) return;
  const html = `
    <div class="overlay" id="settings-overlay">
      <div class="panel">
        <h3 style="margin-top:0">Assessment Settings</h3>
        <div class="form-group">
          <label for="setting-assessor">Assessor name</label>
          <input type="text" id="setting-assessor" placeholder="Jane Doe">
        </div>
        <div class="form-group">
          <label for="setting-org">Assessor organization (optional)</label>
          <input type="text" id="setting-org" placeholder="Contoso Consulting">
        </div>
        <div class="form-group">
          <label for="setting-customer">Customer name</label>
          <input type="text" id="setting-customer" placeholder="Acme Corp">
        </div>
        <div style="display:flex; justify-content:space-between; gap:8px; margin-top:24px;">
          <button class="btn danger-btn" id="btn-reset">Reset all progress</button>
          <div style="display:flex; gap:8px;">
            <button class="btn" id="btn-settings-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-settings-save">Save</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  document.getElementById("btn-settings-cancel").onclick = () => closeSettings();
  document.getElementById("btn-settings-save").onclick   = () => saveSettings();
  document.getElementById("btn-reset").onclick           = () => resetState();
}

function openSettings() {
  injectSettingsOverlay();
  document.getElementById("setting-assessor").value = STATE.metadata.assessorName;
  document.getElementById("setting-org").value      = STATE.metadata.assessorOrg;
  document.getElementById("setting-customer").value = STATE.metadata.customerName;
  document.getElementById("settings-overlay").classList.add("open");
}
function closeSettings() {
  const o = document.getElementById("settings-overlay");
  if (o) o.classList.remove("open");
}
function saveSettings() {
  STATE.metadata.assessorName = document.getElementById("setting-assessor").value.trim();
  STATE.metadata.assessorOrg  = document.getElementById("setting-org").value.trim();
  const customer = document.getElementById("setting-customer").value.trim();
  STATE.metadata.customerName = customer || "Acme Corp";
  persist();
  closeSettings();
}

// ============================================================
//  Header + sidebar rendering
// ============================================================

const SECTION_LABELS = {
  intro: "Getting Started",
  cis:   "CIS Hardening",
  stig:  "STIG Lessons",
  outro: "Wrap-Up"
};

function renderHeader(currentLessonId) {
  const host = document.getElementById("header-host");
  if (!host) return;
  const completed = LESSONS.filter(l => STATE.lessons[l.id]?.complete).length;
  const total = LESSONS.length;
  const pct = total ? Math.round((completed/total)*100) : 0;

  host.innerHTML = `
    <header class="header">
      <a href="${rootHref(currentLessonId)}index.html" class="header-title" style="color:inherit;text-decoration:none">CIS Linux Tutorial</a>
      <div class="header-progress">
        <div class="progress-text">${completed} of ${total} lessons complete</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="header-actions">
        <span class="save-status" id="save-status"></span>
        <button class="btn-icon" id="btn-settings" title="Settings">⚙</button>
      </div>
    </header>`;
  document.getElementById("btn-settings").onclick = openSettings;
}

function renderSidebar(currentLessonId) {
  const host = document.getElementById("sidebar-host");
  if (!host) return;

  const grouped = {};
  for (const l of LESSONS) {
    (grouped[l.section] = grouped[l.section] || []).push(l);
  }

  let html = `<nav class="sidebar">`;
  for (const sect of ["intro","cis","stig","outro"]) {
    if (!grouped[sect]) continue;
    html += `<div class="nav-section-label">${SECTION_LABELS[sect]}</div>`;
    for (const l of grouped[sect]) {
      const lst = STATE.lessons[l.id];
      const isCurrent = l.id === currentLessonId;
      const isComplete = lst?.complete;
      const num = LESSONS.indexOf(l);
      html += `
        <a class="nav-item${isCurrent ? " active" : ""}${isComplete ? " complete" : ""}"
           href="${rootHref(currentLessonId)}lessons/${num.toString().padStart(2,"0")}-${l.slug}.html">
          <span class="nav-item-num">${num}.</span>
          <span class="check">${isComplete ? "✓" : ""}</span>
          <span>${l.title}</span>
        </a>`;
    }
  }
  html += `</nav>`;
  host.innerHTML = html;
}

// rootHref returns "" if we are already at repo root (index.html, report.html),
// or "../" if we're inside lessons/.
function rootHref(currentLessonId) {
  // currentLessonId is null/undefined for index.html and report.html
  return currentLessonId ? "../" : "";
}
