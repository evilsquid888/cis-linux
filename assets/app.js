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
    saveTimer = null;
    showSaveStatus("saved");
  }, SAVE_DEBOUNCE_MS);
}

// ---- Synchronous flush ----
// Cancels any pending debounced save and writes immediately. Call this
// before any navigation that would otherwise lose the pending write
// (e.g. clicking "Mark complete & continue" sets ls.complete = true,
// then navigates — without flushSave the timeout never fires and the
// completion is lost on next page load).
function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  STATE.metadata.lastVisited = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  showSaveStatus("saved");
}

// Safety net: catch every navigation path (link click, back button,
// tab close, hard refresh) and flush any pending save. localStorage
// writes inside beforeunload are reliable in modern browsers.
//
// `resetting` is checked inside the listener so that resetState() can
// suppress the flush — otherwise a pending debounce timer would write
// STATE back to localStorage moments after we just removed it.
let resetting = false;
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (resetting) return;
    if (saveTimer) flushSave();
  });
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
  // Cancel any pending debounced save AND mark resetting=true so the
  // beforeunload safety net doesn't undo us by writing STATE back.
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  resetting = true;
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

// ============================================================
//  Page init + lesson interactions
// ============================================================

// Called by every lesson page. lessonId may be null for index/report.
function initPage(lessonId) {
  renderHeader(lessonId);
  renderSidebar(lessonId);

  if (lessonId) {
    markVisited(lessonId);
    bindLessonChecks(lessonId);
    bindLessonNotes(lessonId);
    renderLessonFooter(lessonId);
    bindCopyButtons();
  }
}

function markVisited(lessonId) {
  const ls = STATE.lessons[lessonId];
  if (!ls.visited) {
    ls.visited = true;
    ls.visitedAt = new Date().toISOString();
    persist();
  }
}

// Each <input class="check-toggle" data-check-id="ssh.permit_root_login"> is
// bound to STATE.lessons[lessonId].checks[id].ticked.
function bindLessonChecks(lessonId) {
  const ls = STATE.lessons[lessonId];
  document.querySelectorAll(".check-toggle").forEach(box => {
    const cid = box.dataset.checkId;
    if (!cid || !ls.checks[cid]) return;
    box.checked = ls.checks[cid].ticked;
    box.addEventListener("change", () => {
      ls.checks[cid].ticked = box.checked;
      ls.checks[cid].finding = box.checked ? "pass" : "fail";
      persist();
    });
  });
}

function bindLessonNotes(lessonId) {
  const ta = document.getElementById("lesson-notes");
  if (!ta) return;
  ta.value = STATE.lessons[lessonId].notes || "";
  ta.addEventListener("input", () => {
    STATE.lessons[lessonId].notes = ta.value;
    persist();
  });
}

function renderLessonFooter(lessonId) {
  const host = document.getElementById("lesson-footer-host");
  if (!host) return;
  const idx = LESSONS.findIndex(l => l.id === lessonId);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  const isComplete = STATE.lessons[lessonId].complete;
  const prevHref = prev
    ? `${LESSONS.indexOf(prev).toString().padStart(2,"0")}-${prev.slug}.html`
    : "../index.html";
  const nextHref = next
    ? `${LESSONS.indexOf(next).toString().padStart(2,"0")}-${next.slug}.html`
    : null;

  host.innerHTML = `
    <div class="lesson-footer">
      <a class="btn" href="${prevHref}">${prev ? "← " + prev.title : "← Home"}</a>
      ${nextHref
        ? `<button class="btn btn-primary" id="btn-mark-next">${isComplete ? "Continue →" : "Mark complete & continue →"}</button>`
        : `<button class="btn btn-primary" id="btn-mark-next">${isComplete ? "Course complete 🎉" : "Mark complete 🎉"}</button>`}
    </div>`;

  document.getElementById("btn-mark-next").onclick = () => {
    const ls = STATE.lessons[lessonId];
    if (!ls.complete) {
      ls.complete = true;
      ls.completedAt = new Date().toISOString();
    }
    flushSave();   // sync — must happen before location.href steals control
    if (nextHref) location.href = nextHref;
    else alert("Course complete! Open Lesson 8 to generate your customer report.");
  };
}

function bindCopyButtons() {
  document.querySelectorAll("pre").forEach(pre => {
    if (pre.querySelector(".copy-btn")) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.querySelector("code")?.textContent || pre.textContent);
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = "Copy", 1500);
    };
    pre.appendChild(btn);
  });
}
