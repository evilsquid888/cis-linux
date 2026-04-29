# CIS Linux Tutorial — Design Spec

**Date:** 2026-04-28
**Status:** Approved for implementation planning

## 1. Overview

A self-contained, GitHub-Pages-hosted tutorial website that teaches blue-team defenders to perform a basic CIS-style assessment and hardening pass on an Ubuntu 24.04 LTS server. Roughly one hour of content, framed as a fictional engagement with "Acme Corp." At the end the learner reviews their work, gets a verdict on the quality of their assessment, and generates a customer-facing HTML report.

The tutorial draws its content from the CIS Ubuntu Linux 24.04 LTS Benchmark v1.0.0 with a brief excursion into the DISA STIG to show how DoD-grade hardening differs from CIS.

## 2. Audience

Mixed (audiences A through C):

- **A — Total newcomer:** comfortable with `ls`/`cd`, never administered Linux. Concepts taught alongside commands; "refresher" callouts collapsible.
- **B — Junior blue teamer / SOC analyst:** comfortable on the command line, never hardened a server.
- **C — Experienced sysadmin new to security:** runs Linux daily, doesn't know why CIS or STIG exist.

The same lesson body serves all three. Concept-level callouts are collapsible so audience C can skip them.

## 3. Curriculum

Total runtime ≈ 65 minutes. Ten pages: one pre-class lab setup, one welcome, five hardening lessons (three CIS + two STIG), one STIG primer, one final assessment, one next-steps closer.

| # | Lesson | Source | Time |
|---|---|---|---|
| 0 | Lab Setup — Multipass / Bring-Your-Own / Class Lab (no Docker) | — | pre-class |
| 1 | Welcome — what CIS is, what hardening is, the audit→remediate→verify loop, framing as Acme Corp engagement | intro | 3 min |
| 2 | SSH hardening | CIS §5.2 | 10 min |
| 3 | UFW host firewall | CIS §3.5 | 7 min |
| 4 | User account audit (UID 0 hunt, empty passwords, sudoers, password aging, last logins) | CIS §5.3 + §5.4 | 10 min |
| 5 | STIG primer | STIG | 3 min |
| 6 | STIG: stricter SSH crypto (FIPS-approved Ciphers/MACs/KexAlgorithms) | STIG | 8 min |
| 7 | STIG: password complexity + account lockout (`pwquality.conf`, `faillock`) | STIG | 8 min |
| 8 | Final Assessment + Customer Report | — | 12 min |
| 9 | Next Steps | — | 5 min |

### Lab choice

Three documented paths in Lesson 0; learner picks one. Lab choice is **not** persisted in state.

1. **Multipass (recommended)** — full walkthrough with install + `multipass launch 24.04 --name cis-lab` + snapshot guidance.
2. **Bring-your-own Ubuntu 24.04** — minimum requirements stated; cloud / existing VM / bare metal all valid.
3. **Class lab** — "see the slides for join instructions."

Docker is explicitly excluded with a one-paragraph explanation (containers share the host kernel; CIS controls covering kernel, mount options, `auditd`, AppArmor, partitions, and many `/etc` files don't apply or behave differently).

## 4. Architecture

Vanilla HTML / CSS / JavaScript. No build step, no frameworks, no npm. Multi-page (one HTML file per lesson) for bookmarkable URLs, native browser back/forward, and clean GitHub Pages serving.

### Repo layout

```
cis-linux/
├── index.html                          # course landing / table of contents
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
├── report.html                         # customer report — opens in new tab
├── 404.html
├── _config.yml                         # theme: null  (bypass Jekyll)
├── .nojekyll
├── assets/
│   ├── style.css
│   ├── app.js                          # state, nav, autosave, settings, sidebar render
│   ├── assessment.js                   # Lesson 8 review + judgment
│   ├── report.js                       # report.html rendering
│   ├── lessons.js                      # assembler — exposes LESSONS = [LESSON_00, ...]
│   ├── lesson-00.js                    # LESSON_00 = { id, title, section, controls, checks }
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
├── README.md
└── CLAUDE.md
```

### Inheritance from `cis-aws`

- Vanilla stack, zero-dependency
- localStorage with debounced autosave (500 ms)
- Per-lesson data files exposing globals + an assembler (`lessons.js` parallels cis-aws's `data.js`)
- Settings overlay for assessor / customer metadata
- "Generate report" pattern (in-app button → opens `report.html` in new tab)

### Differences from `cis-aws`

- Multi-page (cis-aws is single-page)
- Tutorial / linear progression (cis-aws is a checklist)
- Lessons authored by hand (no PRD + Ralph Loop scripts)
- No Export / Import JSON
- No print CSS / PDF export — the report is a styled HTML page only

## 5. Page anatomy

### Shared shell on every page

- **Header:** course title, progress bar (X of 9 lessons complete), settings gear icon
- **Sidebar:** numbered lesson list, ✓ on completed, current page highlighted, collapses to hamburger on narrow screens
- **Main:** lesson content
- **Footer:** "← Prev" and "Mark complete & continue →" buttons

### Hardening-lesson five-block shape (Lessons 2, 3, 4, 6, 7)

1. **Concept** — *Why this matters.* 2-3 short paragraphs. Collapsible "Refresher?" callouts for audience-A explanations.
2. **Audit** — *Find the current state.* Copy-pasteable commands with copy buttons; expected output shown alongside.
3. **Remediate** — *Fix it.* Numbered steps with full before/after diffs of edited files. Yellow "Before you run this" callouts where commands can lock the user out (notably SSH and UFW).
4. **Verify** — *Confirm it stuck.* Re-run the audit; show new expected output. **One checkbox per named check** — the user ticks each check to confirm it's in good state on their lab.
5. **Notes** — optional free-form textarea per lesson. Flows into the customer report.

The Audit and Remediate blocks contain commands and instructions but no stateful checkboxes; the only stateful UI is the per-check checkboxes in the Verify block (and the lesson's "Mark complete" button at the footer).

### Special lesson shapes

- **Lesson 0 (Lab Setup):** three side-by-side path cards; learner picks one and the path expands. Verification step only (`uname -a`, `lsb_release -a`).
- **Lesson 1 (Welcome):** concept-only, with assessor name + customer name form (defaults to "Acme Corp"). Writes to `metadata` via the same path as the settings overlay.
- **Lesson 5 (STIG primer):** concept-only — no audit / remediate / verify.
- **Lesson 8 (Final Assessment):** review UI — see Section 7.
- **Lesson 9 (Next Steps):** content-only — see Section 8.

### Per-lesson "checks" — the unit of progress

Each hardening lesson defines a small set of named checks in its data file:

```javascript
checks: [
  { id: "ssh.permit_root_login", label: "PermitRootLogin disabled", severity: "critical", controlRef: "CIS §5.2.7" },
  { id: "ssh.password_auth",      label: "Password authentication off", severity: "high",   controlRef: "CIS §5.2.8" },
  // ...
]
```

Each check has a single checkbox in the lesson page's Verify block. When the learner ticks one, state updates. "Mark complete" finalizes the lesson's state. The Lesson 8 review and the customer report both read from this data — the report reflects exactly what the learner did.

`finding` per check (Pass / Fail / N/A) is derived mechanically from the `ticked` state: ticked → Pass; not ticked → Fail. The user can override any finding to N/A on the Lesson 8 review screen.

## 6. State model (localStorage)

**Key:** `cis-linux-tutorial`.
**Save policy:** debounced autosave on every change (500 ms). Single-tab assumption; multi-tab is best-effort.

```javascript
{
  schemaVersion: 1,
  metadata: {
    assessorName: "",
    assessorOrg: "",
    customerName: "Acme Corp",
    startedAt:   "ISO-8601",
    lastVisited: "ISO-8601"
  },
  lessons: {
    "01-welcome": { visited: true, complete: true, visitedAt: "...", completedAt: "...", notes: "" },
    "02-ssh": {
      visited: true,
      complete: false,
      visitedAt: "...",
      completedAt: null,
      notes: "Lab was Ubuntu 24.04.2; PermitRootLogin was 'yes' on first audit.",
      checks: {
        "ssh.permit_root_login": { ticked: true, finding: "fail" },
        "ssh.password_auth":     { ticked: true, finding: "fail" },
        "ssh.max_auth_tries":    { ticked: false, finding: null },
        "ssh.idle_timeout":      { ticked: false, finding: null }
      }
    }
    // ...one entry per lesson
  },
  report: {
    generatedAt: null,
    customerNameSnapshot: null,
    executiveNote: ""
  }
}
```

### Settings overlay (gear icon, every page)

- Assessor name
- Assessor org (optional — appears on report)
- Customer name (defaults to "Acme Corp")
- Reset assessment (with confirmation)

No three-dot menu. No Export / Import JSON. No lab choice tracking.

### Schema versioning

`schemaVersion: 1` is included so future schema changes can migrate existing learners' state. No migration logic exists in v1.

## 7. Lesson 8 — Final Assessment + Customer Report

Three phases on a single page. No quiz — the assessment is the work the learner already did.

### Phase 1 — Engagement review

Scrollable summary of every lesson's state:

- Coverage: lessons complete out of total
- Findings rollup: controls audited / pass / fail
- Per-lesson section showing each check (ticked, finding, severity)
- Inline editable notes textarea per lesson
- Final **Executive note** textarea at the bottom (in addition to per-lesson notes; appears at the top of the report's executive summary)

Both per-lesson notes and the executive note feed the report.

### Phase 2 — Assessor judgment

Computed from the work itself. Three signals:

- **Coverage** — % lessons complete
- **Thoroughness** — % checks ticked across completed lessons
- **Documentation** — number of lessons with non-empty notes (reported, not gating)

There are five hardening lessons total: Lesson 2 (SSH), Lesson 3 (UFW), Lesson 4 (User audit), Lesson 6 (STIG SSH crypto), Lesson 7 (STIG password / lockout). The thresholds count those five; concept-only lessons (0, 1, 5, 9) are not gated.

| Tier | Rule | Headline |
|---|---|---|
| **Solid** | ≥ 4 of 5 hardening lessons complete AND ≥ 60% of total checks across them ticked | *"Solid assessor — you'd hand Acme Corp a defensible report."* |
| **Reasonable** | ≥ 3 of 5 hardening lessons complete | *"Reasonable first pass. Review the missed controls before delivery."* |
| **Needs more scope** | fewer than 3 hardening lessons complete | *"Don't ship this report yet — your scope is too thin."* |

Plus pre-written templated feedback per missing lesson — for example, *"You skipped UFW (CIS §3.5) — Acme will ask why their firewall posture wasn't reviewed."* No runtime LLM calls.

### Phase 3 — Customer report (`report.html`)

Opens in a new tab. Reads from localStorage. Pure styled HTML — no print CSS.

**Sections:**

1. **Cover** — Customer name, Assessor name + org, Assessment date, "CIS Ubuntu 24.04 LTS — Quick Audit"
2. **Executive Summary** — pass/fail rollup, severity counts, the executive note textarea content
3. **Methodology** — auto-generated from completed lessons (e.g., *"We assessed the target against CIS Ubuntu 24.04 §5.2 (SSH), §3.5 (UFW), §5.3-5.4 (Users), and selected DISA STIG controls."*)
4. **Findings Summary Table** — one row per ticked check across all completed lessons: Control ID | Title | Status | Severity | One-line recommendation
5. **Detailed Findings** — for each `fail`, full block: control reference, what was found, why it matters, remediation steps (pulled from the lesson data), per-lesson assessor notes if any
6. **References** — CIS Ubuntu 24.04 LTS Benchmark v1.0.0 (link to cisecurity.org), DISA STIG Ubuntu 24.04 (local PDF link)
7. **Footer disclaimer** — *"Generated as part of a CIS hardening tutorial. This is a training exercise — not a substitute for a full assessment by a qualified consultant."*

The report is a pure projection of `metadata` + `lessons` + `report.executiveNote` from localStorage. No new data is created during generation; only `report.generatedAt` and `report.customerNameSnapshot` are written back.

## 8. Lesson 9 — Next Steps

Pure content page. No checks, no state interaction. Four buckets:

1. **The full benchmarks** — link out to cisecurity.org for the CIS PDF (free with email signup); local link to the DISA STIG PDF (`/pdfs/DISA_STIG_Ubuntu_24.04.pdf`).
2. **Automate this audit** — OpenSCAP / `oscap` (with one-line install + run hint), Lynis, CIS-CAT Pro, Wazuh.
3. **Where to learn more** — SANS SEC511, GIAC GMON / GCED, OffSec OSDA, CompTIA CySA+, Linux Foundation LFCS / Red Hat RHCSA.
4. **What a real engagement looks like** — one paragraph on full scope, evidence collection, attestations, retesting cadence.

Every link gets a one-sentence "why a learner would click this" annotation. No bookmark-wall vibe.

Footer: prev = Lesson 8, next disabled with text "Course complete 🎉".

## 9. Hosting & deployment

### GitHub Pages

- **Source:** repo's `main` branch, root directory. No GitHub Actions workflow.
- **Bypass Jekyll:** `_config.yml` containing `theme: null` and an empty `.nojekyll` file at root.
- **Base URL:** `https://<username>.github.io/cis-linux/`. All internal links are repo-relative (e.g., `lessons/02-ssh.html`, `assets/style.css`) — works equally well opened from filesystem.
- **`404.html`** at root with link back to `index.html`.

### Manual one-time setup

1. Push repo to GitHub.
2. Settings → Pages → Source: deploy from branch `main`, folder `/ (root)`.
3. Wait ~30 s for first deploy.
4. Visit `https://<user>.github.io/cis-linux/`.

### PDF hosting strategy

- **DISA STIG PDF:** hosted at `/pdfs/DISA_STIG_Ubuntu_24.04.pdf` (publicly licensed DoD doc).
- **CIS PDF:** *not* hosted; Lesson 9 links out to cisecurity.org where users sign up for a free copy. Avoids the CIS license gray area for redistribution.

## 10. Script load order on every page

Every lesson HTML file (and `index.html`, `report.html`) loads the same scripts in the same order, so any page can render the sidebar with full lesson metadata:

```html
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
<script src="../assets/lessons.js"></script>      <!-- assembler -->
<script src="../assets/app.js"></script>          <!-- shared shell + nav -->
```

Pages at repo root (`index.html`, `report.html`, `404.html`) use `assets/...` rather than `../assets/...`. `report.html` additionally loads `assets/report.js`. `lessons/08-assessment.html` additionally loads `assets/assessment.js`.

The assembler (`lessons.js`) does:

```javascript
const LESSONS = [
  typeof LESSON_00 !== "undefined" ? LESSON_00 : null,
  typeof LESSON_01 !== "undefined" ? LESSON_01 : null,
  // ...
].filter(Boolean);
```

Missing data files degrade gracefully (the page still renders, just without that lesson in the sidebar).

## 11. Out of scope (explicit non-goals)

- Quiz / multiple-choice testing of any kind
- Print CSS or PDF export of the report
- Export / Import JSON
- Lab choice persistence
- Three-dot menu / dropdown actions header
- Multi-tab / multi-device state synchronization
- Account-based auth — all state is browser-local
- Any backend, server, or API
- Localization — English only
- Accessibility beyond reasonable defaults (semantic HTML, keyboard navigation; no formal WCAG audit)
- Telemetry of any kind

## 12. Open questions

None at sign-off. All design questions resolved during brainstorming.

## 13. Glossary

- **CIS** — Center for Internet Security; publishes hardening benchmarks.
- **STIG** — Security Technical Implementation Guide; DoD's hardening standard.
- **Hardening** — reducing a system's attack surface by applying secure-by-default configurations.
- **Audit** — checking the current state of a control without changing it.
- **Remediate** — applying a change to bring a control into compliance.
- **Verify** — re-checking after remediation to confirm the change took effect.
- **Multipass** — Canonical's free tool for spinning up Ubuntu VMs with one command.
