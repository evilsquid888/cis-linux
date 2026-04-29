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
