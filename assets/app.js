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
