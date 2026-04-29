# CIS Linux Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-hour, GitHub-Pages-hosted vanilla HTML/CSS/JS tutorial that teaches blue-team defenders to perform a basic CIS Ubuntu 24.04 LTS assessment, framed as an Acme Corp engagement, ending with a generated customer-facing HTML report.

**Architecture:** Multi-page static site. Each lesson is its own HTML file. Per-lesson data files (`lesson-NN.js`) expose globals; a small assembler (`lessons.js`) combines them into a `LESSONS` registry. Shared shell (header / sidebar / footer prev-next) rendered by `app.js` on every page. State held in `localStorage` under key `cis-linux-tutorial`. No build step, no frameworks, no npm dependencies.

**Tech Stack:** Vanilla HTML5, CSS3, ES2017+ JavaScript (browser globals). Node.js built-ins (`assert`, `vm`, `fs`) for regression tests — no test framework, no transpiler.

**Reference spec:** `docs/superpowers/specs/2026-04-28-cis-linux-tutorial-design.md`

---

## File structure (built bottom-up)

```
cis-linux/
├── index.html                          # course landing
├── lessons/
│   ├── 00-lab-setup.html
│   ├── 01-welcome.html
│   ├── 02-ssh.html
│   ├── 03-ufw.html
│   ├── 04-user-audit.html
│   ├── 05-stig-primer.html
│   ├── 06-stig-ssh-crypto.html
│   ├── 07-stig-password-lockout.html
│   ├── 08-assessment.html
│   └── 09-next-steps.html
├── report.html                         # opens in new tab from Lesson 8
├── 404.html
├── _config.yml                         # theme: null
├── .nojekyll
├── assets/
│   ├── style.css
│   ├── app.js                          # state, autosave, sidebar, settings, prev/next
│   ├── assessment.js                   # Lesson 8 review + judgment
│   ├── report.js                       # report.html rendering
│   ├── lessons.js                      # assembler — exposes LESSONS = [LESSON_00, ...]
│   ├── lesson-00.js
│   ├── lesson-01.js
│   ├── lesson-02.js
│   ├── lesson-03.js
│   ├── lesson-04.js
│   ├── lesson-05.js
│   ├── lesson-06.js
│   ├── lesson-07.js
│   ├── lesson-08.js
│   └── lesson-09.js
├── pdfs/
│   └── DISA_STIG_Ubuntu_24.04.pdf
├── tests.js                            # node tests.js — pure-JS regression tests
├── README.md
└── CLAUDE.md
```

The two source PDFs already in the repo root (`CIS_Ubuntu_Linux_24.04_LTS_Benchmark_v1.0.0.pdf` and `CIS_Ubuntu_Linux_24.04_LTS_STIG_Benchmark_v1.0.0 (1).pdf`) are reference material, not site assets. Only the STIG PDF is published (copied into `pdfs/`); the CIS PDF is referenced via cisecurity.org link. Both source files stay untracked.

---

## Phase 1 — Foundation

### Task 1: Repo bootstrap files

**Files:**
- Create: `.gitignore`
- Create: `_config.yml`
- Create: `.nojekyll`
- Create: `README.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `.gitignore`**

```
# editor
.vscode/
.idea/
*.swp
.DS_Store

# source PDFs (kept locally for reference, not published)
CIS_Ubuntu_Linux_24.04_LTS_Benchmark_v1.0.0.pdf
CIS_Ubuntu_Linux_24.04_LTS_STIG_Benchmark_v1.0.0 (1).pdf

# claude harness
.claude/
```

- [ ] **Step 2: Create `_config.yml`**

```yaml
theme: null
```

- [ ] **Step 3: Create empty `.nojekyll`**

```bash
touch .nojekyll
```

- [ ] **Step 4: Create `README.md`**

```markdown
# CIS Linux Tutorial

A one-hour tutorial that teaches blue-team defenders to perform a basic CIS-style
assessment and hardening pass on an Ubuntu 24.04 LTS server. Framed as an
"Acme Corp" engagement; ends with a generated customer-facing HTML report.

## Live site

https://<USER>.github.io/cis-linux/

## Run locally

Open `index.html` in any modern browser. No build step, no dependencies.

## Run tests

```bash
node tests.js
```

## What's covered

| # | Lesson | Source |
|---|---|---|
| 0 | Lab Setup (Multipass / BYO / Class Lab) | — |
| 1 | Welcome | — |
| 2 | SSH hardening | CIS §5.2 |
| 3 | UFW host firewall | CIS §3.5 |
| 4 | User account audit | CIS §5.3 + §5.4 |
| 5 | STIG primer | DISA STIG |
| 6 | STIG: stricter SSH crypto | DISA STIG |
| 7 | STIG: password complexity + lockout | DISA STIG |
| 8 | Final assessment + customer report | — |
| 9 | Next steps | — |

## Architecture

See [`docs/superpowers/specs/2026-04-28-cis-linux-tutorial-design.md`](docs/superpowers/specs/2026-04-28-cis-linux-tutorial-design.md).
```

- [ ] **Step 5: Create `CLAUDE.md`**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

CIS Linux Tutorial — self-contained, GitHub-Pages-hosted HTML/CSS/JS tutorial.
No frameworks, no build tools, no dependencies. Opens directly from filesystem.

## Architecture

Multi-page site. Each lesson is its own HTML file in `lessons/`. Per-lesson
data files in `assets/lesson-NN.js` expose `LESSON_NN` globals. The assembler
`assets/lessons.js` combines them into a `LESSONS` registry consumed by
`assets/app.js` (shared shell), `assets/assessment.js` (Lesson 8), and
`assets/report.js` (`report.html`).

```
lesson-00.js …  ──>  lessons.js (assembler)  ──>  LESSONS global
                                                  │
                                                  ├── app.js (sidebar, progress, nav)
                                                  ├── assessment.js (Lesson 8 review + judgment)
                                                  └── report.js (customer report)
```

### Data Schema

```javascript
const LESSON_02 = {
  id: "02-ssh",
  slug: "ssh",
  title: "SSH Hardening",
  section: "cis",                              // "intro" | "cis" | "stig" | "outro"
  controls: ["CIS §5.2"],
  estimatedMinutes: 10,
  checks: [                                    // omit for concept-only lessons
    {
      id: "ssh.permit_root_login",
      label: "PermitRootLogin disabled",
      severity: "critical",                    // "critical" | "high" | "medium"
      controlRef: "CIS §5.2.7",
      recommendation: "Set PermitRootLogin no in /etc/ssh/sshd_config"
    }
  ]
};
```

### State (localStorage)

Key: `cis-linux-tutorial`. Auto-saved with 500 ms debounce.

```javascript
{
  schemaVersion: 1,
  metadata: { assessorName, assessorOrg, customerName, startedAt, lastVisited },
  lessons: { "02-ssh": { visited, complete, visitedAt, completedAt, notes,
                         checks: { "ssh.permit_root_login": { ticked, finding } } } },
  report: { generatedAt, customerNameSnapshot, executiveNote }
}
```

## Run Commands

```bash
# regression tests
node tests.js

# open site locally
xdg-open index.html        # Linux
open index.html            # macOS
start index.html           # Windows
```

## Adding a New Lesson

1. Create `assets/lesson-NN.js` defining `LESSON_NN` with the schema above
2. Add `<script src="../assets/lesson-NN.js"></script>` to every lesson HTML page (and the script blocks in `index.html` + `report.html`)
3. Add `typeof LESSON_NN !== "undefined" ? LESSON_NN : null` to the array in `assets/lessons.js`
4. Author `lessons/NN-slug.html` following the five-block shape (Concept / Audit / Remediate / Verify / Notes)
5. `app.js` picks it up automatically — sidebar nav, progress bar, etc.

## Source Material

- `CIS_Ubuntu_Linux_24.04_LTS_Benchmark_v1.0.0.pdf` (gitignored — local reference)
- `CIS_Ubuntu_Linux_24.04_LTS_STIG_Benchmark_v1.0.0 (1).pdf` (gitignored — local reference)
- Published copy: `pdfs/DISA_STIG_Ubuntu_24.04.pdf`
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore _config.yml .nojekyll README.md CLAUDE.md
git commit -m "feat: repo bootstrap (gitignore, GH Pages config, README, CLAUDE.md)"
```

---

### Task 2: Stylesheet skeleton

**Files:**
- Create: `assets/style.css`

- [ ] **Step 1: Write CSS with full base layout**

Create `assets/style.css`:

```css
/* ============================================================
   CIS Linux Tutorial — base styles
   ============================================================ */

:root {
  --bg:               #0f1419;
  --surface:          #1a2028;
  --surface-2:        #232b36;
  --border:           #2d3845;
  --text:             #e6edf3;
  --text-muted:       #8b9ba8;
  --accent:           #4fc3f7;
  --accent-dim:       #2a8db5;
  --success:          #4caf50;
  --warn:             #ffb74d;
  --danger:           #ef5350;
  --critical:         #d32f2f;
  --high:             #f57c00;
  --medium:           #fbc02d;
  --code-bg:          #0a0e13;
  --radius:           6px;
  --gap:              16px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  background: var(--bg);
  color: var(--text);
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre, .mono { font-family: "SF Mono", Menlo, Consolas, monospace; }

/* ---- Layout ---- */

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: calc(100vh - 56px);
}
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 16px 0;
  overflow-y: auto;
}
.main {
  padding: 32px 48px;
  max-width: 920px;
}

/* ---- Header ---- */

.header {
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-title { font-weight: 600; font-size: 16px; }
.header-progress { flex: 1; display: flex; align-items: center; gap: 12px; max-width: 400px; }
.progress-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--surface-2);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}
.header-actions { display: flex; align-items: center; gap: 8px; }
.btn-icon {
  background: none; border: none; color: var(--text-muted);
  font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: var(--radius);
}
.btn-icon:hover { background: var(--surface-2); color: var(--text); }

/* ---- Sidebar nav ---- */

.nav-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 12px 16px 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  border-left: 3px solid transparent;
}
.nav-item:hover { background: var(--surface-2); color: var(--text); }
.nav-item.active {
  background: var(--surface-2);
  color: var(--text);
  border-left-color: var(--accent);
}
.nav-item .check {
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.nav-item.complete .check {
  background: var(--success);
  border-color: var(--success);
  color: white;
}
.nav-item-num { font-size: 11px; color: var(--text-muted); min-width: 16px; }

/* ---- Main content ---- */

h1 { font-size: 28px; margin: 0 0 8px; }
h2 { font-size: 20px; margin: 32px 0 12px; }
h3 { font-size: 16px; margin: 20px 0 8px; }
p  { margin: 0 0 12px; }

.lesson-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.lesson-meta span:not(:last-child)::after { content: "·"; margin-left: 12px; }

.lesson-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin: 16px 0;
}
.lesson-block .block-icon {
  display: inline-block;
  margin-right: 8px;
  font-size: 18px;
}
.lesson-block h2 { margin-top: 0; }

/* ---- Code blocks ---- */

pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  overflow-x: auto;
  margin: 8px 0;
  position: relative;
}
pre code { font-size: 13px; color: var(--text); white-space: pre; }
.copy-btn {
  position: absolute;
  top: 8px; right: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
}
.copy-btn:hover { color: var(--text); }
code:not(pre code) {
  background: var(--code-bg);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 13px;
}

/* ---- Callouts ---- */

.callout {
  border-left: 4px solid var(--accent);
  padding: 12px 16px;
  margin: 16px 0;
  background: var(--surface-2);
  border-radius: 4px;
}
.callout.warn   { border-left-color: var(--warn); }
.callout.danger { border-left-color: var(--danger); }
.callout-title  { font-weight: 600; margin-bottom: 4px; }

details.refresher { margin: 12px 0; }
details.refresher > summary {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
  padding: 6px 0;
}
details.refresher[open] > summary { color: var(--text); margin-bottom: 8px; }

/* ---- Checks ---- */

.check-list { list-style: none; padding: 0; margin: 8px 0; }
.check-list li {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.check-list li:last-child { border-bottom: none; }
.check-list input[type=checkbox] {
  margin-top: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}
.check-list .severity {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 8px;
  vertical-align: middle;
}
.severity-critical { background: var(--critical); color: white; }
.severity-high     { background: var(--high);     color: white; }
.severity-medium   { background: var(--medium);   color: black; }

/* ---- Notes ---- */

textarea {
  width: 100%;
  min-height: 80px;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

/* ---- Footer / Prev-Next ---- */

.lesson-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  gap: 12px;
}
.btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 18px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover { background: var(--accent-dim); color: white; border-color: var(--accent-dim); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--bg); font-weight: 600; }
.btn-primary:hover { background: var(--accent-dim); color: white; }
.btn[disabled], .btn.disabled { opacity: 0.5; cursor: not-allowed; }

/* ---- Settings overlay ---- */

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.overlay.open { display: flex; }
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  max-width: 480px;
  width: 90%;
}
.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--text-muted);
}
.form-group input {
  width: 100%;
  padding: 8px 12px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 14px;
}
.danger-btn {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}
.danger-btn:hover { background: var(--danger); color: white; }

/* ---- Lab path cards (Lesson 0) ---- */

.path-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.path-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
}
.path-card:hover { border-color: var(--accent); }
.path-card.recommended { border-color: var(--accent); }
.path-card .pill {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  background: var(--accent);
  color: var(--bg);
  padding: 2px 6px;
  border-radius: 3px;
  margin-bottom: 8px;
}

/* ---- Findings table (report) ---- */

table.findings {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 16px 0;
}
table.findings th, table.findings td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
table.findings th { background: var(--surface-2); font-weight: 600; font-size: 13px; }
.status-pass { color: var(--success); font-weight: 600; }
.status-fail { color: var(--danger);  font-weight: 600; }
.status-na   { color: var(--text-muted); font-weight: 600; }

/* ---- Narrow / mobile ---- */

@media (max-width: 800px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .main { padding: 20px; }
  .header-progress { display: none; }
}

/* ---- Save status ---- */
.save-status {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: right;
}
.save-status.saving { color: var(--warn); }
.save-status.saved  { color: var(--success); }
```

- [ ] **Step 2: Commit**

```bash
git add assets/style.css
git commit -m "feat: base stylesheet with dark theme, layout, callouts, code blocks"
```

---

### Task 3: Lessons assembler + first data file

**Files:**
- Create: `assets/lessons.js`
- Create: `assets/lesson-00.js`

- [ ] **Step 1: Create `assets/lesson-00.js`**

```javascript
// Lesson 0 — Lab Setup (concept-only, no checks)
const LESSON_00 = {
  id: "00-lab-setup",
  slug: "lab-setup",
  title: "Lab Setup",
  section: "intro",
  estimatedMinutes: 5,
  controls: [],
  checks: []   // no stateful checks
};
```

- [ ] **Step 2: Create `assets/lessons.js`**

```javascript
// Assembler — combines per-lesson data files into the LESSONS registry.
// Each LESSON_NN global is loaded by its own <script> tag before this file.
// Missing lessons are silently skipped (graceful degradation).

const LESSONS = [
  typeof LESSON_00 !== "undefined" ? LESSON_00 : null,
  typeof LESSON_01 !== "undefined" ? LESSON_01 : null,
  typeof LESSON_02 !== "undefined" ? LESSON_02 : null,
  typeof LESSON_03 !== "undefined" ? LESSON_03 : null,
  typeof LESSON_04 !== "undefined" ? LESSON_04 : null,
  typeof LESSON_05 !== "undefined" ? LESSON_05 : null,
  typeof LESSON_06 !== "undefined" ? LESSON_06 : null,
  typeof LESSON_07 !== "undefined" ? LESSON_07 : null,
  typeof LESSON_08 !== "undefined" ? LESSON_08 : null,
  typeof LESSON_09 !== "undefined" ? LESSON_09 : null
].filter(Boolean);

// Convenience lookup
const LESSONS_BY_ID = LESSONS.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

// Hardening lessons used by judgment thresholds (Section 7 of spec)
const HARDENING_LESSON_IDS = ["02-ssh", "03-ufw", "04-user-audit", "06-stig-ssh-crypto", "07-stig-password-lockout"];
```

- [ ] **Step 3: Commit**

```bash
git add assets/lessons.js assets/lesson-00.js
git commit -m "feat: lessons assembler + lesson-00 (lab setup) data"
```

---

### Task 4: Test bootstrap

**Files:**
- Create: `tests.js`

- [ ] **Step 1: Write the failing tests**

Create `tests.js`:

```javascript
#!/usr/bin/env node
// CIS Linux Tutorial — regression tests
// Run: node tests.js
// Uses only Node.js built-ins (assert, vm, fs, path).

const assert = require("assert");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; failures.push({ name, error: e.message }); console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
function section(name) { console.log(`\n${name}\n${"-".repeat(name.length)}`); }

// Load a script into a shared VM context, transforming top-level const/let → var
// so declarations attach to the context (mirrors browser <script> globals).
function loadScript(filename, ctx) {
  let code = fs.readFileSync(path.join(DIR, filename), "utf-8");
  code = code.replace(/^const /gm, "var ").replace(/^let /gm, "var ");
  vm.runInContext(code, ctx, { filename });
}

const ctx = vm.createContext({});

// ============================================================
section("Lesson data files parse");
// ============================================================

const lessonFiles = [
  "assets/lesson-00.js",
  "assets/lesson-01.js",
  "assets/lesson-02.js",
  "assets/lesson-03.js",
  "assets/lesson-04.js",
  "assets/lesson-05.js",
  "assets/lesson-06.js",
  "assets/lesson-07.js",
  "assets/lesson-08.js",
  "assets/lesson-09.js"
];

for (const f of lessonFiles) {
  test(`${f} parses (or is missing — that's OK during build-up)`, () => {
    if (!fs.existsSync(path.join(DIR, f))) return;     // graceful during build
    loadScript(f, ctx);
  });
}

// ============================================================
section("Assembler builds LESSONS");
// ============================================================

test("lessons.js loads and exposes LESSONS array", () => {
  loadScript("assets/lessons.js", ctx);
  assert.ok(Array.isArray(ctx.LESSONS), "LESSONS should be an array");
});

test("LESSONS contains lesson-00 (lab setup) at minimum", () => {
  const lab = ctx.LESSONS.find(l => l && l.id === "00-lab-setup");
  assert.ok(lab, "lesson-00 should be in LESSONS");
  assert.strictEqual(lab.title, "Lab Setup");
});

test("LESSONS_BY_ID maps id → lesson", () => {
  assert.ok(ctx.LESSONS_BY_ID, "LESSONS_BY_ID should exist");
  assert.strictEqual(ctx.LESSONS_BY_ID["00-lab-setup"].slug, "lab-setup");
});

test("HARDENING_LESSON_IDS lists the 5 hardening lessons", () => {
  assert.deepStrictEqual(
    ctx.HARDENING_LESSON_IDS,
    ["02-ssh", "03-ufw", "04-user-audit", "06-stig-ssh-crypto", "07-stig-password-lockout"]
  );
});

// ============================================================
section("Lesson schema integrity (for any present lesson)");
// ============================================================

for (const lesson of ctx.LESSONS) {
  if (!lesson) continue;
  test(`${lesson.id} has required fields`, () => {
    assert.ok(lesson.id, "id required");
    assert.ok(lesson.title, "title required");
    assert.ok(["intro", "cis", "stig", "outro"].includes(lesson.section), "valid section");
    assert.ok(Array.isArray(lesson.checks), "checks must be array (may be empty)");
  });
  if (lesson.checks.length > 0) {
    test(`${lesson.id} checks have required fields`, () => {
      for (const c of lesson.checks) {
        assert.ok(c.id,                                         "check.id required");
        assert.ok(c.label,                                      "check.label required");
        assert.ok(["critical","high","medium"].includes(c.severity), "valid severity");
        assert.ok(c.controlRef,                                 "check.controlRef required");
        assert.ok(c.recommendation,                             "check.recommendation required");
      }
    });
  }
}

// ============================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run tests — they should pass with just lesson-00 + assembler**

```bash
node tests.js
```

Expected: all tests pass (lessons 01-09 are skipped due to "graceful during build" check; lesson-00 parses; assembler runs; LESSONS contains lesson-00).

- [ ] **Step 3: Commit**

```bash
git add tests.js
git commit -m "test: regression test bootstrap (data file parsing + schema integrity)"
```

---

## Phase 2 — Core app

### Task 5: State model + autosave

**Files:**
- Create: `assets/app.js`

- [ ] **Step 1: Write the state core**

Create `assets/app.js`:

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add assets/app.js
git commit -m "feat: state model with localStorage persistence and 500ms debounced autosave"
```

---

### Task 6: Settings overlay

**Files:**
- Modify: `assets/app.js` (append)

- [ ] **Step 1: Append to `assets/app.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add assets/app.js
git commit -m "feat: settings overlay for assessor/customer metadata + reset"
```

---

### Task 7: Sidebar nav + progress bar

**Files:**
- Modify: `assets/app.js` (append)

- [ ] **Step 1: Append to `assets/app.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add assets/app.js
git commit -m "feat: header + grouped sidebar nav with progress bar"
```

---

### Task 8: Page initialization + prev/next + check binding

**Files:**
- Modify: `assets/app.js` (append)

- [ ] **Step 1: Append to `assets/app.js`**

```javascript
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
      persist();
    }
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
```

- [ ] **Step 2: Commit**

```bash
git add assets/app.js
git commit -m "feat: page init, lesson check/note binding, prev-next footer, copy buttons"
```

---

## Phase 3 — Lesson data files

Each lesson data file exposes a single `LESSON_NN` global. Concept-only lessons have `checks: []`; hardening lessons populate `checks` per the spec.

### Task 9: Concept-only lesson data (01, 05, 09)

**Files:**
- Create: `assets/lesson-01.js`
- Create: `assets/lesson-05.js`
- Create: `assets/lesson-09.js`

- [ ] **Step 1: Create `assets/lesson-01.js`**

```javascript
const LESSON_01 = {
  id: "01-welcome",
  slug: "welcome",
  title: "Welcome",
  section: "intro",
  estimatedMinutes: 3,
  controls: [],
  checks: []
};
```

- [ ] **Step 2: Create `assets/lesson-05.js`**

```javascript
const LESSON_05 = {
  id: "05-stig-primer",
  slug: "stig-primer",
  title: "STIG Primer",
  section: "stig",
  estimatedMinutes: 3,
  controls: [],
  checks: []
};
```

- [ ] **Step 3: Create `assets/lesson-09.js`**

```javascript
const LESSON_09 = {
  id: "09-next-steps",
  slug: "next-steps",
  title: "Next Steps",
  section: "outro",
  estimatedMinutes: 5,
  controls: [],
  checks: []
};
```

- [ ] **Step 4: Run tests**

```bash
node tests.js
```

Expected: all tests pass; LESSONS now contains 4 lessons.

- [ ] **Step 5: Commit**

```bash
git add assets/lesson-01.js assets/lesson-05.js assets/lesson-09.js
git commit -m "feat: concept-only lesson data (welcome, STIG primer, next steps)"
```

---

### Task 10: Lesson 02 (SSH) data

**Files:**
- Create: `assets/lesson-02.js`

- [ ] **Step 1: Create `assets/lesson-02.js`**

```javascript
const LESSON_02 = {
  id: "02-ssh",
  slug: "ssh",
  title: "SSH Hardening",
  section: "cis",
  estimatedMinutes: 10,
  controls: ["CIS §5.2"],
  checks: [
    {
      id: "ssh.permit_root_login",
      label: "PermitRootLogin disabled",
      severity: "critical",
      controlRef: "CIS §5.2.7",
      recommendation: "Set `PermitRootLogin no` in /etc/ssh/sshd_config and reload sshd."
    },
    {
      id: "ssh.password_auth",
      label: "Password authentication off (key-based only)",
      severity: "high",
      controlRef: "CIS §5.2.8",
      recommendation: "Set `PasswordAuthentication no` in /etc/ssh/sshd_config (after confirming a working SSH key)."
    },
    {
      id: "ssh.max_auth_tries",
      label: "MaxAuthTries set to 4",
      severity: "medium",
      controlRef: "CIS §5.2.5",
      recommendation: "Set `MaxAuthTries 4` in /etc/ssh/sshd_config."
    },
    {
      id: "ssh.idle_timeout",
      label: "Idle session timeout configured",
      severity: "medium",
      controlRef: "CIS §5.2.16",
      recommendation: "Set `ClientAliveInterval 300` and `ClientAliveCountMax 2` in /etc/ssh/sshd_config."
    }
  ]
};
```

- [ ] **Step 2: Run tests**

```bash
node tests.js
```

Expected: PASS — LESSON_02 schema validation passes.

- [ ] **Step 3: Commit**

```bash
git add assets/lesson-02.js
git commit -m "feat: lesson-02 (SSH hardening) data"
```

---

### Task 11: Lesson 03 (UFW) data

**Files:**
- Create: `assets/lesson-03.js`

- [ ] **Step 1: Create `assets/lesson-03.js`**

```javascript
const LESSON_03 = {
  id: "03-ufw",
  slug: "ufw",
  title: "UFW Host Firewall",
  section: "cis",
  estimatedMinutes: 7,
  controls: ["CIS §3.5"],
  checks: [
    {
      id: "ufw.installed",
      label: "ufw package installed",
      severity: "high",
      controlRef: "CIS §3.5.1.1",
      recommendation: "Run `sudo apt install -y ufw`."
    },
    {
      id: "ufw.enabled",
      label: "ufw service enabled and running",
      severity: "critical",
      controlRef: "CIS §3.5.1.2",
      recommendation: "Run `sudo ufw --force enable` and `sudo systemctl enable ufw`."
    },
    {
      id: "ufw.default_deny",
      label: "Default policy is deny incoming",
      severity: "critical",
      controlRef: "CIS §3.5.1.4",
      recommendation: "Run `sudo ufw default deny incoming`."
    },
    {
      id: "ufw.ssh_allowed",
      label: "SSH port allowed",
      severity: "high",
      controlRef: "CIS §3.5.1.5",
      recommendation: "Run `sudo ufw allow 22/tcp` BEFORE enabling deny — or you'll lock yourself out."
    }
  ]
};
```

- [ ] **Step 2: Commit**

```bash
git add assets/lesson-03.js
git commit -m "feat: lesson-03 (UFW firewall) data"
```

---

### Task 12: Lesson 04 (User audit) data

**Files:**
- Create: `assets/lesson-04.js`

- [ ] **Step 1: Create `assets/lesson-04.js`**

```javascript
const LESSON_04 = {
  id: "04-user-audit",
  slug: "user-audit",
  title: "User Account Audit",
  section: "cis",
  estimatedMinutes: 10,
  controls: ["CIS §5.3", "CIS §5.4"],
  checks: [
    {
      id: "users.no_extra_uid0",
      label: "Only root has UID 0",
      severity: "critical",
      controlRef: "CIS §5.4.2.1",
      recommendation: "`awk -F: '($3==0){print}' /etc/passwd` should return exactly one line: root. Investigate any others."
    },
    {
      id: "users.no_empty_passwords",
      label: "No accounts have empty passwords",
      severity: "critical",
      controlRef: "CIS §5.4.2.4",
      recommendation: "`sudo awk -F: '($2==\"\"){print $1}' /etc/shadow` should return nothing. Lock any returned accounts: `sudo passwd -l <user>`."
    },
    {
      id: "users.system_accounts_nologin",
      label: "System accounts have nologin shells",
      severity: "high",
      controlRef: "CIS §5.4.2.6",
      recommendation: "Verify with `awk -F: '($3<1000 && $1!=\"root\"){print $1,$7}' /etc/passwd`. Set non-root system accounts to /usr/sbin/nologin."
    },
    {
      id: "users.password_aging",
      label: "Password aging policy set in /etc/login.defs",
      severity: "medium",
      controlRef: "CIS §5.4.1.1",
      recommendation: "Set PASS_MAX_DAYS 365, PASS_MIN_DAYS 1, PASS_WARN_AGE 7 in /etc/login.defs."
    },
    {
      id: "users.lastlog_reviewed",
      label: "Last-login activity reviewed (lastlog / last)",
      severity: "medium",
      controlRef: "CIS §5.4.1.5",
      recommendation: "Run `lastlog | grep -v 'Never logged in'` and `last -a | head -20` and document anything anomalous."
    }
  ]
};
```

- [ ] **Step 2: Commit**

```bash
git add assets/lesson-04.js
git commit -m "feat: lesson-04 (user account audit) data"
```

---

### Task 13: Lessons 06, 07 (STIG), 08 data

**Files:**
- Create: `assets/lesson-06.js`
- Create: `assets/lesson-07.js`
- Create: `assets/lesson-08.js`

- [ ] **Step 1: Create `assets/lesson-06.js`**

```javascript
const LESSON_06 = {
  id: "06-stig-ssh-crypto",
  slug: "stig-ssh-crypto",
  title: "STIG: Stricter SSH Crypto",
  section: "stig",
  estimatedMinutes: 8,
  controls: ["DISA STIG: V-260547, V-260548, V-260549"],
  checks: [
    {
      id: "stig.ssh.ciphers",
      label: "SSH Ciphers restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260547",
      recommendation: "Add `Ciphers aes256-ctr,aes192-ctr,aes128-ctr` to /etc/ssh/sshd_config."
    },
    {
      id: "stig.ssh.macs",
      label: "SSH MACs restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260548",
      recommendation: "Add `MACs hmac-sha2-512,hmac-sha2-256` to /etc/ssh/sshd_config."
    },
    {
      id: "stig.ssh.kex",
      label: "SSH KexAlgorithms restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260549",
      recommendation: "Add `KexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group16-sha512,diffie-hellman-group-exchange-sha256` to /etc/ssh/sshd_config."
    }
  ]
};
```

- [ ] **Step 2: Create `assets/lesson-07.js`**

```javascript
const LESSON_07 = {
  id: "07-stig-password-lockout",
  slug: "stig-password-lockout",
  title: "STIG: Password Complexity + Lockout",
  section: "stig",
  estimatedMinutes: 8,
  controls: ["DISA STIG: V-260572, V-260573, V-260554"],
  checks: [
    {
      id: "stig.pw.minlen_15",
      label: "Password minimum length 15 (pwquality)",
      severity: "high",
      controlRef: "STIG V-260572",
      recommendation: "Set `minlen = 15` in /etc/security/pwquality.conf."
    },
    {
      id: "stig.pw.complexity",
      label: "Password complexity: ucredit, lcredit, dcredit, ocredit each ≤ -1",
      severity: "high",
      controlRef: "STIG V-260573",
      recommendation: "Set `ucredit=-1`, `lcredit=-1`, `dcredit=-1`, `ocredit=-1` in /etc/security/pwquality.conf."
    },
    {
      id: "stig.pw.faillock",
      label: "Account lockout after 3 failed attempts (faillock)",
      severity: "critical",
      controlRef: "STIG V-260554",
      recommendation: "Add pam_faillock to /etc/pam.d/common-auth and /etc/pam.d/common-account with `deny=3 unlock_time=900`."
    }
  ]
};
```

- [ ] **Step 3: Create `assets/lesson-08.js`**

```javascript
const LESSON_08 = {
  id: "08-assessment",
  slug: "assessment",
  title: "Final Assessment & Customer Report",
  section: "outro",
  estimatedMinutes: 12,
  controls: [],
  checks: []        // no own checks — reads other lessons' state
};
```

- [ ] **Step 4: Run tests**

```bash
node tests.js
```

Expected: all 10 lesson data files present; all schema tests PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/lesson-06.js assets/lesson-07.js assets/lesson-08.js
git commit -m "feat: STIG lessons + assessment lesson data"
```

---

## Phase 4 — HTML pages

A reusable lesson HTML template is established in Task 14 (the index page) and Task 16 (Lesson 0 — first to use the lesson layout). Subsequent lesson tasks describe content deltas.

### Task 14: index.html (course landing)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CIS Linux Tutorial</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div id="header-host"></div>
  <div class="layout">
    <div id="sidebar-host"></div>
    <main class="main">
      <h1>CIS Linux Tutorial</h1>
      <p style="font-size:17px; color:var(--text-muted);">
        A one-hour, hands-on introduction to assessing and hardening an Ubuntu 24.04 LTS server using the CIS Benchmark and a taste of DISA STIG.
      </p>

      <div class="callout">
        <div class="callout-title">Your engagement</div>
        You've been engaged by <strong>Acme Corp</strong> to perform a quick CIS-style audit on one of their Ubuntu servers. Work through the lessons in order — each one walks you through a real audit step you'd run on the box. At the end you'll generate a customer-facing report.
      </div>

      <h2>Course outline</h2>
      <div id="lesson-list"></div>

      <h2>Before you start</h2>
      <p>Open <a href="lessons/00-lab-setup.html">Lesson 0 — Lab Setup</a> to get a working Ubuntu 24.04 sandbox. Three paths supported: Multipass, bring-your-own, or class lab.</p>
      <p>Set your assessor name and customer name in <a href="#" onclick="openSettings(); return false;">Settings (⚙)</a> — they appear on your final customer report.</p>

      <p style="margin-top:48px;"><a class="btn btn-primary" href="lessons/00-lab-setup.html">Start: Lab Setup →</a></p>
    </main>
  </div>

  <script src="assets/lesson-00.js"></script>
  <script src="assets/lesson-01.js"></script>
  <script src="assets/lesson-02.js"></script>
  <script src="assets/lesson-03.js"></script>
  <script src="assets/lesson-04.js"></script>
  <script src="assets/lesson-05.js"></script>
  <script src="assets/lesson-06.js"></script>
  <script src="assets/lesson-07.js"></script>
  <script src="assets/lesson-08.js"></script>
  <script src="assets/lesson-09.js"></script>
  <script src="assets/lessons.js"></script>
  <script src="assets/app.js"></script>
  <script>
    initPage(null);
    // Render lesson outline
    const list = document.getElementById("lesson-list");
    list.innerHTML = LESSONS.map((l, i) => `
      <div style="padding:8px 0; border-bottom:1px solid var(--border); display:flex; gap:12px; align-items:center;">
        <span style="color:var(--text-muted); min-width:20px;">${i}.</span>
        <a href="lessons/${i.toString().padStart(2,"0")}-${l.slug}.html" style="flex:1;">${l.title}</a>
        <span style="color:var(--text-muted); font-size:12px;">${l.estimatedMinutes} min</span>
      </div>`).join("");
  </script>
</body>
</html>
```

- [ ] **Step 2: Open in browser, smoke test**

```bash
xdg-open index.html  # or `open index.html` on macOS, `start index.html` on Windows
```

Verify:
- Header renders with title and progress bar (0 of 10)
- Sidebar lists all 10 lessons grouped by section
- Course outline renders
- Settings gear opens overlay
- Settings save persists across reload

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: index.html landing page with course outline"
```

---

### Task 15: Lesson template — `lessons/00-lab-setup.html`

This task establishes the canonical lesson page structure. **All subsequent lesson HTML files use this same shell** — header host, sidebar host, main content, scripts, footer host.

**Files:**
- Create: `lessons/00-lab-setup.html`

- [ ] **Step 1: Create `lessons/00-lab-setup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lab Setup — CIS Linux Tutorial</title>
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <div id="header-host"></div>
  <div class="layout">
    <div id="sidebar-host"></div>
    <main class="main">
      <h1>Lesson 0 — Lab Setup</h1>
      <div class="lesson-meta"><span>Pre-class</span><span>~5 min</span></div>
      <p>You need an Ubuntu 24.04 LTS sandbox you can break, fix, and reset. Pick the path that fits your environment. <strong>Don't use Docker</strong> — see why below.</p>

      <div class="path-cards">
        <div class="path-card recommended">
          <span class="pill">Recommended</span>
          <h3>1. Multipass</h3>
          <p>Canonical's free tool — one command, full Ubuntu VM, snapshot/restore built in.</p>
          <pre><code># macOS:    brew install --cask multipass
# Windows:  winget install Canonical.Multipass
# Linux:    sudo snap install multipass

multipass launch 24.04 --name cis-lab
multipass shell cis-lab
# inside the VM:
sudo apt update &amp;&amp; sudo apt -y install ufw libpam-pwquality

# snapshot a clean state to roll back to
multipass stop cis-lab
multipass snapshot cis-lab --name clean
multipass start cis-lab</code></pre>
          <p>To roll back: <code>multipass restore cis-lab.clean</code>. Cleanup: <code>multipass delete cis-lab &amp;&amp; multipass purge</code>.</p>
        </div>

        <div class="path-card">
          <h3>2. Bring your own</h3>
          <p>Already have an Ubuntu 24.04 box? Use it. Minimums:</p>
          <ul>
            <li>Ubuntu Server or Desktop 24.04 LTS</li>
            <li>sudo access</li>
            <li>You can break it without consequences (don't use prod)</li>
            <li>Cloud (AWS/Azure/GCP), bare metal, or pre-existing VM all fine</li>
          </ul>
          <p>WSL2 works for most lessons but skip the UFW lesson — Windows Defender Firewall handles inbound.</p>
        </div>

        <div class="path-card">
          <h3>3. Class lab</h3>
          <p>Doing this as part of a class? Your instructor's slides have the join URL, credentials, and any class-specific setup notes.</p>
          <p>If you can't find them, ask in the class chat or open <code>uname -a</code> on your handout's lab box and verify it's Ubuntu 24.04.</p>
        </div>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify your lab</h2>
        <p>Whichever path you chose, run these and confirm the output:</p>
        <pre><code>uname -a
# Linux ... 6.8.0-... #... Ubuntu ... aarch64/x86_64 GNU/Linux

lsb_release -a
# Distributor ID: Ubuntu
# Description:    Ubuntu 24.04 LTS
# Release:        24.04
# Codename:       noble</code></pre>
        <p>If anything looks off, fix it before moving on — every following lesson assumes a working Ubuntu 24.04 LTS shell with sudo.</p>
      </div>

      <div class="callout warn">
        <div class="callout-title">Why not Docker?</div>
        Containers share the host kernel. Many CIS controls — kernel sysctls, mount options, AppArmor profiles, auditd rules, partition layout — either don't apply or behave very differently inside a container. You'd be teaching yourself habits that don't transfer to real servers. Use a real VM.
      </div>

      <div id="lesson-footer-host"></div>
    </main>
  </div>

  <script src="../assets/lesson-00.js"></script>
  <script src="../assets/lesson-01.js"></script>
  <script src="../assets/lesson-02.js"></script>
  <script src="../assets/lesson-03.js"></script>
  <script src="../assets/lesson-04.js"></script>
  <script src="../assets/lesson-05.js"></script>
  <script src="../assets/lesson-06.js"></script>
  <script src="../assets/lesson-07.js"></script>
  <script src="../assets/lesson-08.js"></script>
  <script src="../assets/lesson-09.js"></script>
  <script src="../assets/lessons.js"></script>
  <script src="../assets/app.js"></script>
  <script>initPage("00-lab-setup");</script>
</body>
</html>
```

- [ ] **Step 2: Smoke test in browser**

Open `lessons/00-lab-setup.html`. Verify:
- Header + sidebar render; Lesson 0 highlighted in sidebar
- Path cards display side-by-side
- "Mark complete" button works → returns to Lesson 1 link / completes lesson
- After completion, sidebar shows ✓ on Lesson 0, progress bar advances

- [ ] **Step 3: Commit**

```bash
git add lessons/00-lab-setup.html
git commit -m "feat: lessons/00-lab-setup with three lab paths and verify block"
```

---

### Task 16: `lessons/01-welcome.html`

**Files:**
- Create: `lessons/01-welcome.html`

- [ ] **Step 1: Create `lessons/01-welcome.html`**

Use the same outer shell as `lessons/00-lab-setup.html` (DOCTYPE, head with `<title>Welcome — CIS Linux Tutorial</title>`, body containing `#header-host`, `.layout`, `#sidebar-host`, `<main class="main">`, all script tags identical to Task 15, ending with `<script>initPage("01-welcome");</script>`).

The `<main>` body content:

```html
      <h1>Lesson 1 — Welcome</h1>
      <div class="lesson-meta"><span>Intro</span><span>~3 min</span></div>

      <p>You've been brought in by <strong>Acme Corp</strong> to do a quick CIS-style audit on one of their Ubuntu 24.04 servers. By the end of this short course you'll have run a real audit, applied a few high-impact remediations, and produced a customer-facing report.</p>

      <h2>What is CIS?</h2>
      <p>The Center for Internet Security publishes free hardening benchmarks for OSes, applications, and cloud services. The full Ubuntu 24.04 benchmark contains ~250 controls. We'll cover the highest-impact slice — SSH, host firewall, user accounts — plus a taste of DISA STIG (the DoD's stricter cousin).</p>

      <details class="refresher">
        <summary>Refresher: what does "hardening" mean?</summary>
        <p>Hardening means reducing a system's attack surface by changing default-permissive settings to secure ones. A fresh Ubuntu install is reasonable but optimized for ease, not security. Hardening tightens those defaults: disable services you don't need, restrict who can log in, lock down crypto algorithms, force password complexity, etc.</p>
      </details>

      <h2>The audit → remediate → verify loop</h2>
      <p>Every lesson follows the same rhythm:</p>
      <ul>
        <li><strong>Concept</strong> — what the control is and why it matters</li>
        <li><strong>Audit</strong> — run a command to find the current state</li>
        <li><strong>Remediate</strong> — apply the fix</li>
        <li><strong>Verify</strong> — re-run the audit to confirm the fix worked, then tick the check</li>
      </ul>
      <p>Tick a check only when you've actually run the verification on your lab. Those ticks become the findings in your customer report.</p>

      <h2>Set your details</h2>
      <p>The customer report uses these. You can edit them any time via Settings (⚙).</p>
      <div class="lesson-block">
        <div class="form-group">
          <label for="welcome-assessor">Your name (assessor)</label>
          <input type="text" id="welcome-assessor" placeholder="Jane Doe">
        </div>
        <div class="form-group">
          <label for="welcome-org">Your organization (optional)</label>
          <input type="text" id="welcome-org" placeholder="Contoso Consulting">
        </div>
        <div class="form-group">
          <label for="welcome-customer">Customer name</label>
          <input type="text" id="welcome-customer" placeholder="Acme Corp">
        </div>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Add an inline script just before the existing `<script>initPage("01-welcome");</script>` line**

Replace `<script>initPage("01-welcome");</script>` with:

```html
  <script>
    initPage("01-welcome");
    // Wire welcome form to STATE.metadata
    const a = document.getElementById("welcome-assessor");
    const o = document.getElementById("welcome-org");
    const c = document.getElementById("welcome-customer");
    a.value = STATE.metadata.assessorName;
    o.value = STATE.metadata.assessorOrg;
    c.value = STATE.metadata.customerName;
    a.addEventListener("input", () => { STATE.metadata.assessorName = a.value.trim(); persist(); });
    o.addEventListener("input", () => { STATE.metadata.assessorOrg  = o.value.trim(); persist(); });
    c.addEventListener("input", () => { STATE.metadata.customerName = c.value.trim() || "Acme Corp"; persist(); });
  </script>
```

- [ ] **Step 3: Smoke test**

Open `lessons/01-welcome.html`. Type a name; reload — name persists. Click "Mark complete & continue →" → moves to Lesson 2 (or Home if Lesson 2 doesn't exist yet, fine).

- [ ] **Step 4: Commit**

```bash
git add lessons/01-welcome.html
git commit -m "feat: lessons/01-welcome with assessor/customer name form"
```

---

### Task 17: `lessons/02-ssh.html` (canonical hardening lesson)

This is the first hardening lesson — it locks in the five-block shape used by Lessons 3, 4, 6, 7.

**Files:**
- Create: `lessons/02-ssh.html`

- [ ] **Step 1: Create `lessons/02-ssh.html`**

Use the same outer shell as `lessons/00-lab-setup.html` (`<title>SSH Hardening — CIS Linux Tutorial</title>`, identical script block, `initPage("02-ssh")`).

The `<main>` body content:

```html
      <h1>Lesson 2 — SSH Hardening</h1>
      <div class="lesson-meta"><span>CIS §5.2</span><span>~10 min</span><span>4 controls</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎯</span> Why this matters</h2>
        <p>SSH is the door to the box. The default OpenSSH config on Ubuntu permits root login, password authentication, and unlimited idle sessions — every one of those is an attacker's best friend. Brute-force scanning of port 22 happens constantly; a weak password on a root account is game-over.</p>
        <p>This lesson tightens four CIS controls: disable root SSH login, disable password auth in favor of keys, drop MaxAuthTries from 6 to 4, and add an idle-session timeout. Each is one or two lines in <code>/etc/ssh/sshd_config</code>.</p>

        <details class="refresher">
          <summary>Refresher: what is sshd_config?</summary>
          <p><code>/etc/ssh/sshd_config</code> configures the SSH <em>server</em> daemon (sshd). Edits take effect after <code>systemctl reload ssh</code>. The companion file <code>/etc/ssh/ssh_config</code> configures the SSH <em>client</em> — leave that alone.</p>
        </details>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔍</span> Audit — find current state</h2>
        <p>Use <code>sshd -T</code> to see the <strong>effective</strong> running config (file + defaults merged):</p>
        <pre><code>sudo sshd -T | grep -iE 'permitrootlogin|passwordauth|maxauthtries|clientalive'</code></pre>
        <p>Note each value. CIS-recommended targets:</p>
        <ul>
          <li><code>permitrootlogin</code> = <strong>no</strong></li>
          <li><code>passwordauthentication</code> = <strong>no</strong> (only after a working SSH key is in place)</li>
          <li><code>maxauthtries</code> = <strong>4</strong></li>
          <li><code>clientaliveinterval</code> = <strong>300</strong>, <code>clientalivecountmax</code> = <strong>2</strong></li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔧</span> Remediate</h2>

        <div class="callout warn">
          <div class="callout-title">Before you run this — don't lock yourself out</div>
          <ol>
            <li>Open a <strong>second terminal</strong> SSH'd into the lab. Keep this session alive while you change settings.</li>
            <li>Confirm SSH key auth works <em>before</em> disabling passwords: <code>ssh -o PasswordAuthentication=no user@host echo OK</code>.</li>
            <li>If you're on Multipass and don't have a key set up, skip the <code>passwordauthentication no</code> line — Multipass uses key auth by default for the <code>multipass shell</code> command, but local password access on the box itself can still be useful for recovery.</li>
          </ol>
        </div>

        <p>Edit <code>/etc/ssh/sshd_config</code>:</p>
        <pre><code>sudo sed -i \
  -e 's/^#*PermitRootLogin .*/PermitRootLogin no/' \
  -e 's/^#*PasswordAuthentication .*/PasswordAuthentication no/' \
  -e 's/^#*MaxAuthTries .*/MaxAuthTries 4/' \
  -e 's/^#*ClientAliveInterval .*/ClientAliveInterval 300/' \
  -e 's/^#*ClientAliveCountMax .*/ClientAliveCountMax 2/' \
  /etc/ssh/sshd_config

# Append any directive that wasn't already in the file
grep -q '^PermitRootLogin'        /etc/ssh/sshd_config || echo 'PermitRootLogin no'         | sudo tee -a /etc/ssh/sshd_config
grep -q '^PasswordAuthentication' /etc/ssh/sshd_config || echo 'PasswordAuthentication no'  | sudo tee -a /etc/ssh/sshd_config
grep -q '^MaxAuthTries'           /etc/ssh/sshd_config || echo 'MaxAuthTries 4'              | sudo tee -a /etc/ssh/sshd_config
grep -q '^ClientAliveInterval'    /etc/ssh/sshd_config || echo 'ClientAliveInterval 300'     | sudo tee -a /etc/ssh/sshd_config
grep -q '^ClientAliveCountMax'    /etc/ssh/sshd_config || echo 'ClientAliveCountMax 2'       | sudo tee -a /etc/ssh/sshd_config

sudo systemctl reload ssh</code></pre>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify — confirm it stuck</h2>
        <p>Re-run the audit:</p>
        <pre><code>sudo sshd -T | grep -iE 'permitrootlogin|passwordauth|maxauthtries|clientalive'

# Expected:
# permitrootlogin no
# passwordauthentication no
# maxauthtries 4
# clientaliveinterval 300
# clientalivecountmax 2</code></pre>
        <p>Then tick each check below to record your finding:</p>
        <ul class="check-list" id="checks-host"></ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">📋</span> Assessor notes (optional)</h2>
        <textarea id="lesson-notes" placeholder="What did you observe? Any anomalies? These notes appear under the SSH findings in the customer report."></textarea>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Append an inline script that renders the checks**

Just before `<script>initPage("02-ssh");</script>`, replace it with:

```html
  <script>
    initPage("02-ssh");
    // Render this lesson's checks into #checks-host
    const checks = LESSONS_BY_ID["02-ssh"].checks;
    document.getElementById("checks-host").innerHTML = checks.map(c => `
      <li>
        <input type="checkbox" class="check-toggle" id="chk-${c.id}" data-check-id="${c.id}">
        <label for="chk-${c.id}">
          <strong>${c.label}</strong>
          <span class="severity severity-${c.severity}">${c.severity}</span>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${c.controlRef}</div>
        </label>
      </li>`).join("");
    bindLessonChecks("02-ssh");
  </script>
```

- [ ] **Step 3: Smoke test**

Open the page. Tick a check; reload; the tick persists. Mark complete; sidebar shows ✓ on Lesson 2.

- [ ] **Step 4: Commit**

```bash
git add lessons/02-ssh.html
git commit -m "feat: lessons/02-ssh — canonical hardening lesson with five-block shape"
```

---

### Task 18: `lessons/03-ufw.html`

**Files:**
- Create: `lessons/03-ufw.html`

- [ ] **Step 1: Create using the same outer shell as Task 15** (title `UFW Host Firewall — CIS Linux Tutorial`, `initPage("03-ufw")`).

The `<main>` body:

```html
      <h1>Lesson 3 — UFW Host Firewall</h1>
      <div class="lesson-meta"><span>CIS §3.5</span><span>~7 min</span><span>4 controls</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎯</span> Why this matters</h2>
        <p>A host firewall is your last line of defense if something else goes wrong — an exposed service binds 0.0.0.0 by accident, a config drifts, a teammate runs <code>nc -lp 4444</code> for "just a minute." UFW (Uncomplicated Firewall) is Ubuntu's friendly nftables/iptables wrapper. CIS wants it installed, enabled, set to default-deny, with explicit allow rules only for what you actually need.</p>
        <details class="refresher">
          <summary>Refresher: default-deny vs default-allow</summary>
          <p>Default-deny means "drop anything not explicitly allowed." Default-allow means "permit anything not explicitly denied." Default-deny is safer because new services don't accidentally become reachable.</p>
        </details>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔍</span> Audit</h2>
        <pre><code>dpkg -l ufw | tail -1
sudo ufw status verbose
ss -tlnp        # what's listening, totally separate from ufw — sanity check</code></pre>
        <p>You're looking for: <code>ufw</code> installed, <code>Status: active</code>, default deny incoming, only port 22 (SSH) allowed.</p>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔧</span> Remediate</h2>
        <div class="callout danger">
          <div class="callout-title">Order matters — allow SSH FIRST</div>
          If you enable default-deny before allowing SSH, you instantly lose your remote session. Run the <code>ufw allow 22/tcp</code> line first.
        </div>
        <pre><code>sudo apt install -y ufw
sudo ufw allow 22/tcp                  # &lt;-- BEFORE the deny
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw --force enable
sudo systemctl enable ufw</code></pre>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify</h2>
        <pre><code>sudo ufw status verbose
# Expected:
#   Status: active
#   Logging: on (low)
#   Default: deny (incoming), allow (outgoing), disabled (routed)
#   To              Action      From
#   --              ------      ----
#   22/tcp          ALLOW IN    Anywhere</code></pre>
        <ul class="check-list" id="checks-host"></ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">📋</span> Assessor notes (optional)</h2>
        <textarea id="lesson-notes" placeholder="What did you observe? Were there other open ports?"></textarea>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Add the same checks-rendering inline script as Task 17** but bound to `"03-ufw"` (replace `02-ssh` with `03-ufw` in both the `LESSONS_BY_ID[...]` lookup and `bindLessonChecks(...)` call, and `initPage("03-ufw")`).

- [ ] **Step 3: Smoke test + Commit**

```bash
git add lessons/03-ufw.html
git commit -m "feat: lessons/03-ufw with order-matters-allow-first warning"
```

---

### Task 19: `lessons/04-user-audit.html`

**Files:**
- Create: `lessons/04-user-audit.html`

- [ ] **Step 1: Create with same outer shell, `initPage("04-user-audit")`**

The `<main>` body:

```html
      <h1>Lesson 4 — User Account Audit</h1>
      <div class="lesson-meta"><span>CIS §5.3 + §5.4</span><span>~10 min</span><span>5 controls</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎯</span> Why this matters</h2>
        <p>The first thing any defender does on a new box is "who has access here?" A forgotten service account with a UID-0 alias, an empty-password row in /etc/shadow, a cron user with a valid login shell — these are some of the most common findings in real engagements. This is mostly read-only — you're auditing, not breaking.</p>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔍</span> Audit — five quick checks</h2>

        <h3>1. Anyone else with UID 0?</h3>
        <pre><code>awk -F: '($3==0){print}' /etc/passwd
# Expected: exactly one line — root</code></pre>

        <h3>2. Any empty passwords?</h3>
        <pre><code>sudo awk -F: '($2==""){print $1}' /etc/shadow
# Expected: nothing</code></pre>

        <h3>3. System accounts (UID&lt;1000) — should have nologin shells</h3>
        <pre><code>awk -F: '($3&lt;1000 &amp;&amp; $1!="root"){print $1, $7}' /etc/passwd | grep -vE '/(usr/)?sbin/nologin|/bin/false'
# Expected: empty (or only special entries you can justify)</code></pre>

        <h3>4. Password aging policy</h3>
        <pre><code>grep -E '^PASS_(MAX|MIN|WARN)_' /etc/login.defs
# Expected:
# PASS_MAX_DAYS  365
# PASS_MIN_DAYS  1
# PASS_WARN_AGE  7</code></pre>

        <h3>5. Last-login activity</h3>
        <pre><code>lastlog | grep -v 'Never logged in'
last -a | head -20
# Document anything anomalous</code></pre>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔧</span> Remediate (only what's broken)</h2>
        <p>Findings dictate fixes. Common ones:</p>
        <pre><code># Lock an empty-password account
sudo passwd -l alice

# Change a system account's shell to nologin
sudo usermod -s /usr/sbin/nologin svc-batch

# Apply password aging defaults
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS  365/'  /etc/login.defs
sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS  1/'    /etc/login.defs
sudo sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE  7/'    /etc/login.defs</code></pre>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify</h2>
        <p>Re-run the five audit commands. Tick each check below as you confirm it's in good state:</p>
        <ul class="check-list" id="checks-host"></ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">📋</span> Assessor notes (optional)</h2>
        <textarea id="lesson-notes" placeholder="Document any unusual accounts, login activity, or aging policy gaps."></textarea>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Add checks-rendering inline script** identical to Task 17, with `"04-user-audit"` substituted.

- [ ] **Step 3: Smoke test + Commit**

```bash
git add lessons/04-user-audit.html
git commit -m "feat: lessons/04-user-audit with 5 read-only assessor checks"
```

---

### Task 20: `lessons/05-stig-primer.html`

**Files:**
- Create: `lessons/05-stig-primer.html`

- [ ] **Step 1: Create with the same outer shell, `initPage("05-stig-primer")`**

The `<main>` body (concept-only, no checks block):

```html
      <h1>Lesson 5 — STIG Primer</h1>
      <div class="lesson-meta"><span>DISA STIG</span><span>~3 min</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">📘</span> What is a STIG?</h2>
        <p><strong>STIG</strong> = Security Technical Implementation Guide. STIGs are published by DISA (the U.S. Defense Information Systems Agency) and are the hardening standard the Department of Defense uses for everything from Windows servers to F-35 avionics consoles. Where CIS is "industry best practice," STIG is "DoD policy with audit findings attached."</p>

        <p>If you work for a defense contractor, federal civilian agency that's adopted STIG, or a vendor selling into them, you'll be required to ship STIG-compliant systems and produce STIG-compliant evidence.</p>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">⚖️</span> STIG vs. CIS — what's the difference?</h2>
        <p>Mostly: STIG is stricter, more prescriptive, and more crypto-focused. Examples we'll see:</p>
        <ul>
          <li><strong>SSH crypto:</strong> CIS allows a broad set of ciphers; STIG restricts to a FIPS-approved subset.</li>
          <li><strong>Passwords:</strong> CIS recommends minlen 14; STIG mandates 15 with explicit complexity classes.</li>
          <li><strong>Lockout:</strong> CIS suggests lockout policy; STIG specifies 3 failed attempts.</li>
          <li><strong>Audit / banner:</strong> STIG mandates the DoD warning banner verbatim; CIS doesn't care about wording.</li>
        </ul>
        <p>Many controls are identical. Where they differ, STIG is almost always the stricter side.</p>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🛠</span> How STIGs are distributed</h2>
        <p>DISA publishes STIGs as XCCDF/SCAP XML datastreams plus human-readable PDFs at <a href="https://public.cyber.mil/stigs/downloads/" target="_blank">public.cyber.mil</a>. The Ubuntu 24.04 STIG is freely downloadable; you'll find a copy in this repo at <code>/pdfs/DISA_STIG_Ubuntu_24.04.pdf</code>. Every control has a <strong>V-ID</strong> (e.g., <code>V-260547</code>) — when you cite STIG findings to a customer, you cite the V-ID.</p>
      </div>

      <p>The next two lessons walk through specific STIG controls so you can see the difference firsthand.</p>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Smoke test + Commit**

```bash
git add lessons/05-stig-primer.html
git commit -m "feat: lessons/05-stig-primer — concept-only STIG introduction"
```

---

### Task 21: `lessons/06-stig-ssh-crypto.html`

**Files:**
- Create: `lessons/06-stig-ssh-crypto.html`

- [ ] **Step 1: Create with the same outer shell, `initPage("06-stig-ssh-crypto")`**

The `<main>` body:

```html
      <h1>Lesson 6 — STIG: Stricter SSH Crypto</h1>
      <div class="lesson-meta"><span>DISA STIG</span><span>~8 min</span><span>3 controls</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎯</span> Why this matters</h2>
        <p>OpenSSH's defaults negotiate from a wide menu of ciphers, MACs, and key-exchange algorithms — including some that are old, weak, or not FIPS-approved. STIG locks the menu down to a FIPS 140-3-approved subset. Concretely: AES-CTR only (no CBC, no CHACHA20), HMAC-SHA2-256/512 only (no MD5 or SHA1 variants), modern ECDH or DH-group-exchange-SHA256 only.</p>
        <p>This pairs with Lesson 2 — same file, same reload command. You're hardening the same surface, deeper.</p>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔍</span> Audit</h2>
        <pre><code>sudo sshd -T | grep -iE '^(ciphers|macs|kexalgorithms)'</code></pre>
        <p>Compare to STIG-required values:</p>
        <ul>
          <li><code>ciphers aes256-ctr,aes192-ctr,aes128-ctr</code></li>
          <li><code>macs hmac-sha2-512,hmac-sha2-256</code></li>
          <li><code>kexalgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group16-sha512,diffie-hellman-group-exchange-sha256</code></li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔧</span> Remediate</h2>
        <pre><code>sudo tee -a /etc/ssh/sshd_config &gt;/dev/null &lt;&lt;'EOF'

# DISA STIG — restrict SSH crypto to FIPS-approved subset
Ciphers aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512,hmac-sha2-256
KexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group16-sha512,diffie-hellman-group-exchange-sha256
EOF

sudo systemctl reload ssh</code></pre>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify</h2>
        <pre><code>sudo sshd -T | grep -iE '^(ciphers|macs|kexalgorithms)'</code></pre>
        <ul class="check-list" id="checks-host"></ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">📋</span> Assessor notes (optional)</h2>
        <textarea id="lesson-notes" placeholder="Note the original cipher list — useful evidence for the report."></textarea>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Add checks-rendering inline script** identical to Task 17 with `"06-stig-ssh-crypto"`.

- [ ] **Step 3: Smoke test + Commit**

```bash
git add lessons/06-stig-ssh-crypto.html
git commit -m "feat: lessons/06-stig-ssh-crypto with FIPS-approved cipher/MAC/Kex"
```

---

### Task 22: `lessons/07-stig-password-lockout.html`

**Files:**
- Create: `lessons/07-stig-password-lockout.html`

- [ ] **Step 1: Create with same outer shell, `initPage("07-stig-password-lockout")`**

The `<main>` body:

```html
      <h1>Lesson 7 — STIG: Password Complexity + Lockout</h1>
      <div class="lesson-meta"><span>DISA STIG</span><span>~8 min</span><span>3 controls</span></div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎯</span> Why this matters</h2>
        <p>Pairs with Lesson 4 (User Account Audit). STIG mandates stricter password rules and an explicit account-lockout policy via PAM. This is one of the clearest "STIG &gt; CIS defaults" examples — same files, just stricter values.</p>
        <p>Two configs touch this:</p>
        <ul>
          <li><code>/etc/security/pwquality.conf</code> — what counts as a "good enough" new password</li>
          <li><code>/etc/pam.d/common-auth</code> + <code>common-account</code> — what happens after N failed logins (faillock)</li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔍</span> Audit</h2>
        <pre><code># Password rules
grep -E '^(minlen|ucredit|lcredit|dcredit|ocredit)\s' /etc/security/pwquality.conf

# Lockout (PAM)
grep -E 'pam_faillock' /etc/pam.d/common-auth /etc/pam.d/common-account</code></pre>
        <p>STIG-required values:</p>
        <ul>
          <li><code>minlen = 15</code></li>
          <li><code>ucredit = -1</code> (≥1 uppercase required)</li>
          <li><code>lcredit = -1</code> (≥1 lowercase required)</li>
          <li><code>dcredit = -1</code> (≥1 digit required)</li>
          <li><code>ocredit = -1</code> (≥1 special char required)</li>
          <li><code>pam_faillock</code> with <code>deny=3 unlock_time=900</code> in both common-auth and common-account</li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔧</span> Remediate</h2>
        <pre><code>sudo apt install -y libpam-pwquality

sudo tee -a /etc/security/pwquality.conf &gt;/dev/null &lt;&lt;'EOF'

# DISA STIG password complexity
minlen = 15
ucredit = -1
lcredit = -1
dcredit = -1
ocredit = -1
EOF

# Faillock — Ubuntu 24.04 ships pam_faillock; enable via pam-auth-update or directly
sudo sed -i '/pam_unix.so/i auth required pam_faillock.so preauth deny=3 unlock_time=900' /etc/pam.d/common-auth
sudo sed -i '/pam_unix.so/a auth [default=die] pam_faillock.so authfail deny=3 unlock_time=900' /etc/pam.d/common-auth
sudo sed -i '/pam_unix.so/i account required pam_faillock.so' /etc/pam.d/common-account</code></pre>

        <div class="callout warn">
          <div class="callout-title">Test in a second session</div>
          PAM mistakes can lock you out of all logins. Keep a privileged shell open while you test, and try logging in fresh from another terminal before moving on.
        </div>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">✅</span> Verify</h2>
        <pre><code>grep -E '^(minlen|ucredit|lcredit|dcredit|ocredit)\s' /etc/security/pwquality.conf
grep -E 'pam_faillock' /etc/pam.d/common-auth /etc/pam.d/common-account

# Test lockout (use a throwaway account!):
# sudo useradd -m testlock; sudo passwd testlock
# Try ssh testlock@localhost with a wrong password 3 times — 4th attempt should be locked
# Unlock: sudo faillock --user testlock --reset</code></pre>
        <ul class="check-list" id="checks-host"></ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">📋</span> Assessor notes (optional)</h2>
        <textarea id="lesson-notes" placeholder="Note current vs target values, anything you couldn't enforce."></textarea>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Add checks-rendering inline script** with `"07-stig-password-lockout"`.

- [ ] **Step 3: Smoke test + Commit**

```bash
git add lessons/07-stig-password-lockout.html
git commit -m "feat: lessons/07-stig-password-lockout with pwquality + faillock"
```

---

### Task 23: `lessons/09-next-steps.html`

**Files:**
- Create: `lessons/09-next-steps.html`

- [ ] **Step 1: Create with the same outer shell, `initPage("09-next-steps")`**

The `<main>` body:

```html
      <h1>Lesson 9 — Next Steps</h1>
      <div class="lesson-meta"><span>Wrap-up</span><span>~5 min</span></div>

      <p>You just did a real assessment in miniature. Here's where to go from here.</p>

      <div class="lesson-block">
        <h2><span class="block-icon">📚</span> The full benchmarks</h2>
        <ul>
          <li><a href="https://www.cisecurity.org/benchmark/ubuntu_linux" target="_blank">CIS Ubuntu Linux 24.04 LTS Benchmark v1.0.0</a> — free with email signup. ~250 controls; we covered ~12.</li>
          <li><a href="../pdfs/DISA_STIG_Ubuntu_24.04.pdf">DISA STIG Ubuntu 24.04</a> (PDF, hosted with this site) — DoD's stricter cousin. Reading the V-IDs you missed is a fast way to find your weak spots.</li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🛠</span> Automate this audit</h2>
        <ul>
          <li><strong><a href="https://www.open-scap.org/" target="_blank">OpenSCAP / oscap</a></strong> — official open-source SCAP scanner. Runs CIS or STIG profiles against a host and emits HTML reports. Quick start:
            <pre><code>sudo apt install -y libopenscap8 ssg-debderived
sudo oscap xccdf eval --profile cis_level1_server \
  --results /tmp/results.xml --report /tmp/report.html \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2404-ds.xml</code></pre>
          </li>
          <li><strong><a href="https://cisofy.com/lynis/" target="_blank">Lynis</a></strong> — lightweight, no datastreams needed: <code>sudo lynis audit system</code>. Best for "give me a quick second opinion."</li>
          <li><strong><a href="https://www.cisecurity.org/cybersecurity-tools/cis-cat-pro" target="_blank">CIS-CAT Pro</a></strong> — CIS's official scanner, members-only.</li>
          <li><strong><a href="https://wazuh.com/" target="_blank">Wazuh</a></strong> — open-source SIEM with built-in CIS policy monitoring across many hosts.</li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🎓</span> Where to learn more about defensive assessments</h2>
        <ul>
          <li><a href="https://www.sans.org/cyber-security-courses/continuous-monitoring-security-operations/" target="_blank">SANS SEC511</a> — Continuous Monitoring &amp; Security Ops. The blue-team gold standard.</li>
          <li><a href="https://www.giac.org/certifications/continuous-monitoring-gmon/" target="_blank">GIAC GMON</a> / <a href="https://www.giac.org/certifications/certified-enterprise-defender-gced/" target="_blank">GCED</a> — paired certifications.</li>
          <li><a href="https://www.offsec.com/courses/sec-200/" target="_blank">OffSec OSDA</a> — hands-on defensive analyst cert.</li>
          <li><a href="https://www.comptia.org/certifications/cybersecurity-analyst" target="_blank">CompTIA CySA+</a> — entry-level blue-team cert; good vocabulary builder.</li>
          <li><a href="https://training.linuxfoundation.org/certification/linux-foundation-certified-system-administrator-lfcs/" target="_blank">LFCS</a> / <a href="https://www.redhat.com/en/services/certification/rhcsa" target="_blank">RHCSA</a> — Linux depth that pays for itself in every assessment.</li>
        </ul>
      </div>

      <div class="lesson-block">
        <h2><span class="block-icon">🔭</span> What a real engagement looks like</h2>
        <p>This course was a taste. A real engagement covers the <em>full</em> ~250 controls of the benchmark, requires evidence collection (screenshots, command output, file hashes) for every finding, includes attestations from the system owners on accepted risks, and re-tests after remediation. The hard part isn't running the commands — it's the conversation with the customer about which findings they'll fix vs. accept, the documentation discipline that makes the report reproducible six months later, and the scoping conversation where you decide what's in and out before you ever ssh in.</p>
        <p>Most assessor tooling can be learned in a weekend. The judgment to use it well is what gets paid for.</p>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Smoke test + Commit**

```bash
git add lessons/09-next-steps.html
git commit -m "feat: lessons/09-next-steps with tooling, learning paths, and reality check"
```

---

## Phase 5 — Final Assessment + Customer Report

### Task 24: Assessment judgment logic + tests (TDD)

**Files:**
- Create: `assets/assessment.js`
- Modify: `tests.js` (append assessment tests)

- [ ] **Step 1: Append to `tests.js` — write the failing tests first**

Append this block to `tests.js` BEFORE the `console.log(`\n${passed}...` line (i.e., before the final summary):

```javascript
// ============================================================
section("Assessment judgment");
// ============================================================

// Stub a STATE for judgment tests
function makeState(completedHardening, checksTickedRatio = 1.0) {
  const lessons = {};
  for (const id of ctx.HARDENING_LESSON_IDS) {
    const lesson = ctx.LESSONS_BY_ID[id];
    const checks = {};
    const totalChecks = lesson.checks.length;
    const tickedCount = Math.floor(totalChecks * checksTickedRatio);
    lesson.checks.forEach((c, i) => {
      checks[c.id] = { ticked: i < tickedCount, finding: i < tickedCount ? "pass" : "fail" };
    });
    lessons[id] = {
      visited: true,
      complete: completedHardening.includes(id),
      visitedAt: "x", completedAt: completedHardening.includes(id) ? "x" : null,
      notes: "",
      checks
    };
  }
  return { schemaVersion: 1, metadata: {}, lessons, report: {} };
}

// Load assessment.js
loadScript("assets/assessment.js", ctx);

test("computeJudgment returns 'solid' when 4/5 hardening + 60% checks", () => {
  const s = makeState(["02-ssh","03-ufw","04-user-audit","06-stig-ssh-crypto"], 0.7);
  assert.strictEqual(ctx.computeJudgment(s).tier, "solid");
});

test("computeJudgment returns 'solid' when all 5 + 100% checks", () => {
  const s = makeState(ctx.HARDENING_LESSON_IDS, 1.0);
  assert.strictEqual(ctx.computeJudgment(s).tier, "solid");
});

test("computeJudgment returns 'reasonable' when 3/5 hardening", () => {
  const s = makeState(["02-ssh","03-ufw","04-user-audit"], 0.5);
  assert.strictEqual(ctx.computeJudgment(s).tier, "reasonable");
});

test("computeJudgment returns 'needs-work' when 2/5 hardening", () => {
  const s = makeState(["02-ssh","03-ufw"], 1.0);
  assert.strictEqual(ctx.computeJudgment(s).tier, "needs-work");
});

test("computeJudgment 4/5 with low check coverage drops to 'reasonable'", () => {
  const s = makeState(["02-ssh","03-ufw","04-user-audit","06-stig-ssh-crypto"], 0.2);
  assert.strictEqual(ctx.computeJudgment(s).tier, "reasonable");
});
```

- [ ] **Step 2: Run tests — they should fail (`computeJudgment` not defined)**

```bash
node tests.js
```

Expected: assessment tests FAIL with `computeJudgment is not a function`.

- [ ] **Step 3: Create `assets/assessment.js`**

```javascript
// ============================================================
//  Lesson 8 — Final Assessment review + judgment
//  Loaded only by lessons/08-assessment.html
// ============================================================

// Pure judgment logic — exported for tests via global.
function computeJudgment(state) {
  const hardeningIds = HARDENING_LESSON_IDS;
  const completedCount = hardeningIds.filter(id => state.lessons[id]?.complete).length;

  let totalChecks = 0, tickedChecks = 0;
  for (const id of hardeningIds) {
    if (!state.lessons[id]?.complete) continue;
    const checks = LESSONS_BY_ID[id]?.checks || [];
    for (const c of checks) {
      totalChecks++;
      if (state.lessons[id].checks[c.id]?.ticked) tickedChecks++;
    }
  }
  const checkRatio = totalChecks ? tickedChecks / totalChecks : 0;
  const notedCount = hardeningIds.filter(id => (state.lessons[id]?.notes || "").trim().length > 0).length;

  let tier;
  if (completedCount >= 4 && checkRatio >= 0.6)       tier = "solid";
  else if (completedCount >= 3)                       tier = "reasonable";
  else                                                tier = "needs-work";

  return { tier, completedCount, totalChecks, tickedChecks, checkRatio, notedCount };
}

const TIER_COPY = {
  "solid":       { headline: "Solid assessor — you'd hand Acme Corp a defensible report.",
                   detail:   "Strong coverage and check completion. Polish the notes, fire off the report." },
  "reasonable":  { headline: "Reasonable first pass. Review the missed controls before delivery.",
                   detail:   "You've got the bones of a report. Either complete the remaining hardening lessons or call out the scope cut explicitly in the executive summary." },
  "needs-work":  { headline: "Don't ship this report yet — your scope is too thin.",
                   detail:   "Fewer than 3 hardening lessons complete. Go back, do the audit, then come back here." }
};

// Templated per-lesson feedback for the "what's missing" panel.
const MISSING_LESSON_FEEDBACK = {
  "02-ssh":                    "You skipped SSH hardening (CIS §5.2) — the #1 attack surface on a Linux server. Acme will ask why this wasn't reviewed.",
  "03-ufw":                    "You skipped UFW (CIS §3.5) — without a host firewall posture review, your report has no defense-in-depth answer.",
  "04-user-audit":             "You skipped the user account audit (CIS §5.3-5.4). Empty passwords and stray UID 0 accounts are the most common findings in real engagements.",
  "06-stig-ssh-crypto":        "You skipped the STIG SSH crypto lesson — fine if Acme isn't a DoD shop, but flag it in scope notes.",
  "07-stig-password-lockout":  "You skipped the STIG password/lockout lesson — pair with the user account audit if you go back."
};

// ---- Render Phase 1 (review) ----

function renderEngagementReview() {
  const host = document.getElementById("review-host");
  if (!host) return;
  const judgment = computeJudgment(STATE);
  const totalControls = HARDENING_LESSON_IDS.reduce((acc, id) => acc + (LESSONS_BY_ID[id]?.checks.length || 0), 0);

  let html = `
    <div class="lesson-block">
      <h2><span class="block-icon">📊</span> Engagement Review — ${escapeHtml(STATE.metadata.customerName || "Acme Corp")}</h2>
      <p>
        <strong>Coverage:</strong> ${judgment.completedCount} of ${HARDENING_LESSON_IDS.length} hardening lessons complete<br>
        <strong>Findings:</strong> ${judgment.tickedChecks} pass · ${totalControls - judgment.tickedChecks} fail (out of ${totalControls} reviewable controls)<br>
        <strong>Notes:</strong> ${judgment.notedCount} of ${HARDENING_LESSON_IDS.length} lessons documented
      </p>
    </div>`;

  for (const id of HARDENING_LESSON_IDS) {
    const lesson = LESSONS_BY_ID[id];
    const ls = STATE.lessons[id];
    if (!ls) continue;
    html += `<div class="lesson-block">
      <h3>${escapeHtml(lesson.title)} ${ls.complete ? '<span class="severity severity-medium" style="background:var(--success);color:white;">complete</span>' : '<span class="severity severity-high">incomplete</span>'}</h3>`;
    html += `<ul class="check-list">`;
    for (const c of lesson.checks) {
      const cs = ls.checks[c.id] || { ticked: false, finding: null };
      const findingClass = cs.finding === "pass" ? "status-pass" : (cs.finding === "na" ? "status-na" : "status-fail");
      const findingLabel = cs.finding === "pass" ? "PASS" : (cs.finding === "na" ? "N/A" : "FAIL");
      html += `<li>
        <span style="flex:1">${escapeHtml(c.label)} <span class="severity severity-${c.severity}">${c.severity}</span></span>
        <span class="${findingClass}">${findingLabel}</span>
        <select class="finding-override" data-lesson="${id}" data-check="${c.id}" style="margin-left:8px;background:var(--code-bg);color:var(--text);border:1px solid var(--border);">
          <option value="">— set —</option>
          <option value="pass" ${cs.finding==="pass"?"selected":""}>Pass</option>
          <option value="fail" ${cs.finding==="fail"?"selected":""}>Fail</option>
          <option value="na" ${cs.finding==="na"?"selected":""}>N/A</option>
        </select>
      </li>`;
    }
    html += `</ul>
      <label style="font-size:13px;color:var(--text-muted);">Notes for the report:</label>
      <textarea data-edit-notes="${id}" placeholder="(none)">${escapeHtml(ls.notes || "")}</textarea>
    </div>`;
  }

  html += `
    <div class="lesson-block">
      <h2><span class="block-icon">📝</span> Executive note (appears at top of the report)</h2>
      <textarea id="exec-note" placeholder="Optional — set the tone for Acme: scope, context, headline message.">${escapeHtml(STATE.report.executiveNote || "")}</textarea>
    </div>`;

  host.innerHTML = html;

  // Wire overrides + notes
  document.querySelectorAll(".finding-override").forEach(sel => {
    sel.addEventListener("change", () => {
      const lid = sel.dataset.lesson, cid = sel.dataset.check;
      STATE.lessons[lid].checks[cid].finding = sel.value || null;
      persist();
    });
  });
  document.querySelectorAll("textarea[data-edit-notes]").forEach(ta => {
    ta.addEventListener("input", () => {
      STATE.lessons[ta.dataset.editNotes].notes = ta.value;
      persist();
    });
  });
  const exec = document.getElementById("exec-note");
  if (exec) exec.addEventListener("input", () => {
    STATE.report.executiveNote = exec.value;
    persist();
  });
}

// ---- Render Phase 2 (judgment) ----

function renderJudgment() {
  const host = document.getElementById("judgment-host");
  if (!host) return;
  const j = computeJudgment(STATE);
  const copy = TIER_COPY[j.tier];
  const missingIds = HARDENING_LESSON_IDS.filter(id => !STATE.lessons[id]?.complete);
  const missingFeedback = missingIds.map(id => MISSING_LESSON_FEEDBACK[id]).filter(Boolean);

  host.innerHTML = `
    <div class="lesson-block">
      <h2><span class="block-icon">⚖️</span> Assessor Judgment</h2>
      <p style="font-size:18px;"><strong>${escapeHtml(copy.headline)}</strong></p>
      <p>${escapeHtml(copy.detail)}</p>
      <p style="font-size:13px; color:var(--text-muted);">
        Coverage: ${j.completedCount}/${HARDENING_LESSON_IDS.length} hardening lessons ·
        Check completion: ${Math.round(j.checkRatio*100)}% ·
        Documented: ${j.notedCount}/${HARDENING_LESSON_IDS.length}
      </p>
      ${missingFeedback.length ? `
        <div class="callout warn">
          <div class="callout-title">Specific gaps</div>
          <ul>${missingFeedback.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
        </div>` : ""}
    </div>`;
}

// ---- Phase 3 — open report.html in new tab ----

function generateReport() {
  STATE.report.generatedAt = new Date().toISOString();
  STATE.report.customerNameSnapshot = STATE.metadata.customerName || "Acme Corp";
  persist();
  // Navigate after a short delay to ensure persist has flushed
  setTimeout(() => window.open("../report.html", "_blank"), SAVE_DEBOUNCE_MS + 50);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
```

- [ ] **Step 4: Run tests — they should now pass**

```bash
node tests.js
```

Expected: all 5 assessment tests PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/assessment.js tests.js
git commit -m "feat: assessment judgment logic with TDD-driven tier rules"
```

---

### Task 25: `lessons/08-assessment.html`

**Files:**
- Create: `lessons/08-assessment.html`

- [ ] **Step 1: Create with same outer shell as Task 15 BUT add `assets/assessment.js` to the script block**

Use identical script tags as Task 15, with one addition right before `<script>initPage("08-assessment");...</script>`:

```html
  <script src="../assets/assessment.js"></script>
  <script>
    initPage("08-assessment");
    renderEngagementReview();
    renderJudgment();
    document.getElementById("btn-generate-report").addEventListener("click", generateReport);
  </script>
```

The `<main>` body:

```html
      <h1>Lesson 8 — Final Assessment &amp; Customer Report</h1>
      <div class="lesson-meta"><span>Wrap-up</span><span>~12 min</span></div>

      <p>You've done the work — now it's time to review what you produced and ship a deliverable.</p>

      <h2>Phase 1 — Review your engagement</h2>
      <div id="review-host"></div>

      <h2>Phase 2 — Assessor's verdict</h2>
      <div id="judgment-host"></div>

      <h2>Phase 3 — Generate the customer report</h2>
      <div class="lesson-block">
        <p>The report opens in a new tab as a stand-alone HTML page. You can show it on screen, share the URL on the local network, or save it via your browser. Customer name and assessor identity come from your settings — confirm them before generating.</p>
        <button class="btn btn-primary" id="btn-generate-report">📄 Generate Customer Report →</button>
      </div>

      <div id="lesson-footer-host"></div>
```

- [ ] **Step 2: Smoke test**

Open `lessons/08-assessment.html` after completing several other lessons. Verify:
- Engagement review lists every hardening lesson with its checks
- Judgment headline matches the spec tiers
- Override dropdowns change the displayed status
- Notes editing persists
- Generate button opens `report.html` in a new tab (404 OK for now — built next task)

- [ ] **Step 3: Commit**

```bash
git add lessons/08-assessment.html
git commit -m "feat: lessons/08-assessment with three-phase review/judgment/generate"
```

---

### Task 26: `report.js` + `report.html`

**Files:**
- Create: `assets/report.js`
- Create: `report.html`

- [ ] **Step 1: Create `assets/report.js`**

```javascript
// ============================================================
//  Customer report — pure projection of localStorage
//  Loaded by report.html (which opens in its own tab)
// ============================================================

function escapeHtmlR(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function fmtDate(iso) {
  if (!iso) return "(date pending)";
  return new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"long", day:"numeric" });
}

function renderReport() {
  const m = STATE.metadata;
  const customer = STATE.report.customerNameSnapshot || m.customerName || "Acme Corp";
  const date = fmtDate(STATE.report.generatedAt || new Date().toISOString());

  // Roll up findings
  const findings = [];
  const completedHardening = HARDENING_LESSON_IDS.filter(id => STATE.lessons[id]?.complete);
  for (const id of completedHardening) {
    const lesson = LESSONS_BY_ID[id];
    for (const c of lesson.checks) {
      const cs = STATE.lessons[id].checks[c.id] || { finding: "fail" };
      findings.push({
        lessonId: id,
        lessonTitle: lesson.title,
        controlRef: c.controlRef,
        label: c.label,
        severity: c.severity,
        finding: cs.finding || "fail",
        recommendation: c.recommendation,
        notes: STATE.lessons[id].notes || ""
      });
    }
  }
  const passes = findings.filter(f => f.finding === "pass").length;
  const fails  = findings.filter(f => f.finding === "fail").length;
  const nas    = findings.filter(f => f.finding === "na").length;
  const sevCounts = { critical: 0, high: 0, medium: 0 };
  for (const f of findings) if (f.finding === "fail") sevCounts[f.severity]++;

  const sectionsCovered = completedHardening.map(id => {
    const ctrls = LESSONS_BY_ID[id].controls;
    return ctrls.length ? ctrls.join(", ") : LESSONS_BY_ID[id].title;
  });

  document.getElementById("report-host").innerHTML = `
    <article style="max-width:880px; margin:0 auto; padding:48px 32px;">
      <header style="border-bottom:2px solid var(--border); padding-bottom:24px; margin-bottom:32px;">
        <div style="font-size:13px; color:var(--text-muted); letter-spacing:0.08em; text-transform:uppercase;">CIS Ubuntu 24.04 LTS — Quick Audit</div>
        <h1 style="margin:8px 0 16px; font-size:32px;">${escapeHtmlR(customer)}</h1>
        <div style="display:flex; gap:32px; font-size:14px; color:var(--text-muted);">
          <div><strong style="color:var(--text);">Assessor:</strong> ${escapeHtmlR(m.assessorName || "(unset)")}${m.assessorOrg ? ", " + escapeHtmlR(m.assessorOrg) : ""}</div>
          <div><strong style="color:var(--text);">Date:</strong> ${date}</div>
        </div>
      </header>

      <section>
        <h2>Executive Summary</h2>
        ${STATE.report.executiveNote ? `<p style="font-style:italic; border-left:3px solid var(--accent); padding-left:12px;">${escapeHtmlR(STATE.report.executiveNote)}</p>` : ""}
        <p>We assessed ${escapeHtmlR(customer)}'s Ubuntu 24.04 LTS host against a quick-audit subset of the CIS Benchmark and DISA STIG. ${findings.length} controls were reviewed: <strong style="color:var(--success);">${passes} pass</strong>, <strong style="color:var(--danger);">${fails} fail</strong>${nas ? `, ${nas} N/A` : ""}.</p>
        ${fails ? `<p>Severity rollup of failed controls: <strong style="color:var(--critical);">${sevCounts.critical} critical</strong>, <strong style="color:var(--high);">${sevCounts.high} high</strong>, <strong style="color:var(--medium);">${sevCounts.medium} medium</strong>.</p>` : `<p>No failures recorded — the system passes the quick-audit profile.</p>`}
      </section>

      <section>
        <h2>Methodology</h2>
        <p>Audit performed against ${escapeHtmlR(customer)}'s host using the CIS Ubuntu 24.04 LTS Benchmark v1.0.0 (selected sections) plus targeted DISA STIG controls. Controls covered:</p>
        <ul>${sectionsCovered.map(s => `<li>${escapeHtmlR(s)}</li>`).join("")}</ul>
        <p>Each control was audited via direct command output on the live system. Pass/fail findings are recorded below; remediations are included for every failed control.</p>
      </section>

      <section>
        <h2>Findings Summary</h2>
        <table class="findings">
          <thead><tr><th>Control</th><th>Title</th><th>Status</th><th>Severity</th><th>Recommendation</th></tr></thead>
          <tbody>
            ${findings.map(f => `<tr>
              <td><code>${escapeHtmlR(f.controlRef)}</code></td>
              <td>${escapeHtmlR(f.label)}</td>
              <td class="status-${f.finding === "pass" ? "pass" : (f.finding === "na" ? "na" : "fail")}">${f.finding.toUpperCase()}</td>
              <td><span class="severity severity-${f.severity}">${f.severity}</span></td>
              <td>${escapeHtmlR(f.recommendation)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </section>

      ${fails ? `
      <section>
        <h2>Detailed Findings</h2>
        ${findings.filter(f => f.finding === "fail").map(f => `
          <div style="margin:24px 0; padding:16px 20px; border-left:3px solid var(--danger); background:var(--surface);">
            <h3 style="margin-top:0;"><code>${escapeHtmlR(f.controlRef)}</code> — ${escapeHtmlR(f.label)}</h3>
            <p style="font-size:13px; color:var(--text-muted);">
              Severity: <span class="severity severity-${f.severity}">${f.severity}</span> ·
              Lesson: ${escapeHtmlR(f.lessonTitle)}
            </p>
            <p><strong>Recommendation:</strong> ${escapeHtmlR(f.recommendation)}</p>
            ${f.notes ? `<p><strong>Assessor notes:</strong> ${escapeHtmlR(f.notes)}</p>` : ""}
          </div>`).join("")}
      </section>` : ""}

      <section>
        <h2>References</h2>
        <ul>
          <li><a href="https://www.cisecurity.org/benchmark/ubuntu_linux" target="_blank">CIS Ubuntu Linux 24.04 LTS Benchmark v1.0.0</a> (cisecurity.org — free with email signup)</li>
          <li><a href="pdfs/DISA_STIG_Ubuntu_24.04.pdf">DISA STIG Ubuntu 24.04</a> (local PDF)</li>
        </ul>
      </section>

      <footer style="margin-top:48px; padding-top:24px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted);">
        Generated as part of a CIS hardening tutorial. This is a training exercise — not a substitute for a full assessment by a qualified consultant.
        Generated ${date} for ${escapeHtmlR(customer)}.
      </footer>
    </article>`;
}
```

- [ ] **Step 2: Create `report.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Audit Report</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div id="report-host"></div>

  <script src="assets/lesson-00.js"></script>
  <script src="assets/lesson-01.js"></script>
  <script src="assets/lesson-02.js"></script>
  <script src="assets/lesson-03.js"></script>
  <script src="assets/lesson-04.js"></script>
  <script src="assets/lesson-05.js"></script>
  <script src="assets/lesson-06.js"></script>
  <script src="assets/lesson-07.js"></script>
  <script src="assets/lesson-08.js"></script>
  <script src="assets/lesson-09.js"></script>
  <script src="assets/lessons.js"></script>
  <script src="assets/app.js"></script>
  <script src="assets/report.js"></script>
  <script>renderReport();</script>
</body>
</html>
```

- [ ] **Step 3: Smoke test**

From Lesson 8, click "Generate Customer Report." A new tab opens with a styled report — customer name, assessor name, executive summary with pass/fail counts, findings table, detailed remediation for failed controls, references.

- [ ] **Step 4: Commit**

```bash
git add assets/report.js report.html
git commit -m "feat: customer report — projection of localStorage into a styled HTML deliverable"
```

---

## Phase 6 — Final wiring

### Task 27: 404 page + STIG PDF

**Files:**
- Create: `404.html`
- Create: `pdfs/DISA_STIG_Ubuntu_24.04.pdf` (copy)

- [ ] **Step 1: Create `404.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not found — CIS Linux Tutorial</title>
  <link rel="stylesheet" href="/cis-linux/assets/style.css">
</head>
<body>
  <main class="main" style="text-align:center; padding-top:120px;">
    <h1 style="font-size:48px; margin:0;">404</h1>
    <p style="color:var(--text-muted); font-size:18px;">That page doesn't exist.</p>
    <p style="margin-top:24px;"><a class="btn btn-primary" href="/cis-linux/index.html">← Back to course home</a></p>
  </main>
</body>
</html>
```

(The `/cis-linux/` paths assume the GH Pages project URL; if the repo is renamed, update this file to match.)

- [ ] **Step 2: Copy STIG PDF into `pdfs/`**

```bash
mkdir -p pdfs
cp "CIS_Ubuntu_Linux_24.04_LTS_STIG_Benchmark_v1.0.0 (1).pdf" pdfs/DISA_STIG_Ubuntu_24.04.pdf
ls -lh pdfs/
```

Expected: `pdfs/DISA_STIG_Ubuntu_24.04.pdf` exists, ~3.4 MB.

- [ ] **Step 3: Commit**

```bash
git add 404.html pdfs/DISA_STIG_Ubuntu_24.04.pdf
git commit -m "feat: 404 page + ship the DISA STIG PDF"
```

---

### Task 28: End-to-end smoke test

**Files:**
- None (verification only)

- [ ] **Step 1: Run regression tests**

```bash
node tests.js
```

Expected: all tests PASS.

- [ ] **Step 2: Open `index.html` in a browser and walk the full course**

Verify each item:

- [ ] Index page renders, sidebar shows all 10 lessons
- [ ] Lesson 0 — three path cards, "Mark complete" advances to Lesson 1
- [ ] Lesson 1 — assessor / customer name fields persist across reload
- [ ] Lesson 2 — five-block shape, all 4 checks tick + persist, "Before you run this" callout visible
- [ ] Lesson 3 — UFW, "order matters" warning displays, all 4 checks work
- [ ] Lesson 4 — User audit, all 5 checks work
- [ ] Lesson 5 — STIG primer, concept-only, no check block
- [ ] Lesson 6 — STIG SSH crypto, all 3 checks work
- [ ] Lesson 7 — STIG password lockout, all 3 checks work
- [ ] Lesson 8 — Engagement review lists every hardening lesson; judgment tier matches expected; finding override dropdowns change displayed status; executive note saves
- [ ] Lesson 8 → "Generate Customer Report" opens `report.html` in new tab
- [ ] Report — customer name, assessor name, executive summary pass/fail counts match Lesson 8; findings table includes one row per ticked check; detailed-findings section shows only fails; reference links work
- [ ] Lesson 9 — links to CIS site (cisecurity.org), STIG PDF, learning resources all present
- [ ] Settings overlay works on every page; reset confirms then clears state
- [ ] Sidebar progress bar updates live as lessons are completed
- [ ] Browser back/forward works between lessons
- [ ] Reload any page — state preserved

- [ ] **Step 3: Open browser dev tools, verify zero console errors on every page**

- [ ] **Step 4: Test localStorage reset**

```javascript
// in DevTools console:
localStorage.removeItem("cis-linux-tutorial");
location.reload();
```

Verify the site loads cleanly with empty state — no errors, no broken layout.

- [ ] **Step 5: Commit (verification artifact only — no file changes expected)**

If any defects found in steps 2-4, fix them and commit fixes. If clean, this task closes without a commit.

---

## Phase 7 — Publish to GitHub

### Task 29: Create remote repo and push

**Files:**
- None (operational only)

- [ ] **Step 1: Confirm `gh` is authenticated**

```bash
gh auth status
```

If not authenticated, run `gh auth login` and follow prompts.

- [ ] **Step 2: Create the remote repo**

```bash
gh repo create cis-linux --public --source=. --description "One-hour CIS Ubuntu 24.04 hardening tutorial for blue-team defenders. Standalone HTML/JS, GitHub Pages."
```

This creates the remote repo, sets `origin`, but does not push.

- [ ] **Step 3: Push**

```bash
git push -u origin main
```

Expected: all commits pushed to GitHub. Verify via `gh repo view --web` (opens the repo in browser).

- [ ] **Step 4: Enable GitHub Pages**

```bash
gh api -X POST "/repos/:owner/cis-linux/pages" \
  -f "source[branch]=main" \
  -f "source[path]=/"
```

Or via web: Settings → Pages → Source: deploy from branch `main`, folder `/ (root)` → Save.

- [ ] **Step 5: Wait ~30 s, then verify**

```bash
gh repo view --json url --jq .url
# Construct the Pages URL: https://<USER>.github.io/cis-linux/
```

Open the URL in a browser. Repeat the smoke-test checklist from Task 28 against the live URL — verify all internal links resolve (no broken `assets/` or `lessons/` paths), localStorage persistence still works (origin is now `<user>.github.io` rather than `file://`), and the customer report still opens in a new tab.

- [ ] **Step 6: Update `README.md` with the live URL**

Replace `https://<USER>.github.io/cis-linux/` in README.md with your actual GitHub username.

```bash
# Edit README.md to substitute the actual username, then:
git add README.md
git commit -m "docs: link the live GitHub Pages URL in README"
git push
```

- [ ] **Step 7: Done**

The site is live. Share the URL.

---

## Self-review

**1. Spec coverage:**

| Spec section | Implemented in |
|---|---|
| §1 Overview | Plan goal + README |
| §2 Audience | Lesson 1 collapsible refresher pattern (Task 16) |
| §3 Curriculum (10 lessons) | Tasks 9-23 (data + HTML for each lesson 0-9) |
| §3 Lab choice (3 paths, no Docker) | Task 15 path cards + warning callout |
| §4 Architecture / repo layout | Task 1 + every subsequent task |
| §4 cis-aws inheritance | State model (Task 5) and assembler (Task 3) match cis-aws |
| §5 Five-block shape | Task 17 (canonical) + Tasks 18, 19, 21, 22 |
| §5 Concept-only / special shapes | Tasks 15 (path cards), 16 (form), 20 (primer) |
| §5 Per-lesson checks | Lesson data files (Tasks 10-13) + check rendering inline scripts |
| §6 State model schema | Task 5 |
| §6 Settings overlay | Task 6 |
| §6 No three-dot menu, no Export/Import, no lab tracking | Task 6 (settings only contains assessor/customer + reset) |
| §6 schemaVersion | Task 5 (`SCHEMA_VERSION = 1`, blank state on mismatch) |
| §7 Phase 1 review | Task 24 (`renderEngagementReview`) |
| §7 Phase 2 judgment | Task 24 (`computeJudgment` with TDD tests) |
| §7 Final thresholds (≥4/5, ≥60%, ≥3/5) | Task 24 — note: spec final thresholds are 4/5 + 60% for solid; ≥3/5 for reasonable; <3 for needs-work. Task 24 implements exactly these values. |
| §7 Phase 3 customer report | Task 26 (`renderReport` + `report.html`) |
| §7 Report sections (cover/exec/method/table/details/refs/footer) | Task 26 |
| §8 Lesson 9 four buckets | Task 23 |
| §9 GitHub Pages config (`_config.yml`, `.nojekyll`, `404.html`) | Task 1 + Task 27 |
| §9 PDF strategy: STIG hosted, CIS link-out | Task 23 (links) + Task 27 (PDF copy) |
| §10 Script load order | Every HTML page in Tasks 14-23, 25, 26 follows the same order |
| §11 Out of scope (no quiz, no print CSS, no export, no lab tracking) | Plan honors all |

All spec sections covered.

**2. Placeholder scan:**

Searching for the forbidden patterns:
- "TBD", "TODO", "implement later" — none in plan
- "Add appropriate error handling" / "add validation" — none
- "Write tests for the above" — Task 24 has actual test code
- "Similar to Task N" — Tasks 18, 19, 21, 22 reference Task 15's outer shell + Task 17's check-rendering inline script; both are explicit ("identical to Task 17, replacing `02-ssh` with `03-ufw`") with the variation called out, not silent. Acceptable per the "boilerplate repetition" tradeoff.

**3. Type consistency:**

- `LESSON_NN` schema fields used identically across Tasks 9-13 ✓
- `STATE.lessons[id].checks[cid].ticked` / `.finding` referenced consistently in Tasks 5, 8, 24, 26 ✓
- `LESSONS_BY_ID` and `HARDENING_LESSON_IDS` defined in Task 3, used in Tasks 7, 24, 26 ✓
- `escapeHtml` defined in `assessment.js` (Task 24); `escapeHtmlR` in `report.js` (Task 26) — different names because they're loaded together on Lesson 8 page (avoid duplicate declaration). Intentional ✓
- `initPage(lessonId)`, `bindLessonChecks(lessonId)`, `persist()`, `STATE` all exported from Task 5/7/8 and used by every lesson page consistently ✓
- `computeJudgment` returns `{ tier, completedCount, totalChecks, tickedChecks, checkRatio, notedCount }` — used the same way in Task 24 (renderJudgment) and the test expectations ✓

No type drift.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-cis-linux-tutorial.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
