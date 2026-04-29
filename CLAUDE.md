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
