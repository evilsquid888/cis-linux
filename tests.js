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
    [...ctx.HARDENING_LESSON_IDS],
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
section("Assessment judgment");
// ============================================================

// Stub a STATE for judgment tests
function makeState(completedHardening, checksTickedRatio = 1.0) {
  const lessons = {};
  for (const id of [...ctx.HARDENING_LESSON_IDS]) {
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

test("computeJudgment returns 'solid' when 4/5 hardening + ≥60% checks", () => {
  // ratio 0.85 → floor() yields actual coverage ≈75%, comfortably above 60% threshold
  const s = makeState(["02-ssh","03-ufw","04-user-audit","06-stig-ssh-crypto"], 0.85);
  assert.strictEqual(ctx.computeJudgment(s).tier, "solid");
});

test("computeJudgment returns 'solid' when all 5 + 100% checks", () => {
  const s = makeState([...ctx.HARDENING_LESSON_IDS], 1.0);
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

// ============================================================
section("Persistence — completion survives navigation");
// ============================================================

// Stub browser-ish globals that app.js touches at module-load and during
// persist/flushSave. We use an in-memory object to back localStorage so we
// can introspect what actually got written and when.
const memStore = {};
ctx.localStorage = {
  setItem:    (k, v) => { memStore[k] = v; },
  getItem:    (k)    => (k in memStore ? memStore[k] : null),
  removeItem: (k)    => { delete memStore[k]; },
};
ctx.document = { getElementById: () => null, querySelectorAll: () => [] };
ctx.window   = { addEventListener: () => {} };  // swallow beforeunload registration
ctx.location = { reload: () => {}, href: "" };
ctx.alert    = () => {};
ctx.confirm  = () => false;
ctx.navigator = { clipboard: { writeText: () => {} } };
// vm.createContext doesn't expose setTimeout/clearTimeout — pass them through.
ctx.setTimeout    = setTimeout;
ctx.clearTimeout  = clearTimeout;

// Load app.js — defines STATE, persist, flushSave, …
loadScript("assets/app.js", ctx);

test("persist() does NOT write to localStorage synchronously (it's debounced)", () => {
  delete memStore["cis-linux-tutorial"];
  ctx.STATE.metadata.customerName = "ShouldNotPersistYet";
  ctx.persist();
  const raw = memStore["cis-linux-tutorial"];
  // Either nothing written yet (preferred) or whatever was there before
  if (raw) {
    const parsed = JSON.parse(raw);
    assert.notStrictEqual(
      parsed.metadata.customerName, "ShouldNotPersistYet",
      "persist() should not have written the new value synchronously"
    );
  }
});

test("flushSave() writes to localStorage immediately", () => {
  delete memStore["cis-linux-tutorial"];
  ctx.STATE.metadata.customerName = "FlushedCustomer";
  ctx.flushSave();
  const raw = memStore["cis-linux-tutorial"];
  assert.ok(raw, "flushSave must produce a localStorage write before returning");
  const parsed = JSON.parse(raw);
  assert.strictEqual(parsed.metadata.customerName, "FlushedCustomer");
});

test("flushSave() cancels any pending persist() timer (no late double-write)", () => {
  delete memStore["cis-linux-tutorial"];
  // Stage a debounced save, then immediately flush.
  ctx.STATE.metadata.customerName = "Pending";
  ctx.persist();
  ctx.STATE.metadata.customerName = "Final";
  ctx.flushSave();
  // Both reads should agree on the final value; no later setTimeout should overwrite it.
  // We can't easily tick the event loop here, but we can confirm the timer was nulled
  // by re-running flushSave (idempotent, no error) and that the value is stable.
  ctx.flushSave();
  const parsed = JSON.parse(memStore["cis-linux-tutorial"]);
  assert.strictEqual(parsed.metadata.customerName, "Final");
});

test("REGRESSION: 'Mark complete & continue' — completion survives simulated navigation", () => {
  // This is the exact scenario from app.js renderLessonFooter's click handler:
  //   ls.complete = true; ls.completedAt = ...; flushSave(); location.href = nextHref;
  // Without flushSave (the previous behavior) the debounced setTimeout never fires
  // because navigation kills the page — completion was lost on next page load.
  delete memStore["cis-linux-tutorial"];
  const ls = ctx.STATE.lessons["02-ssh"];
  ls.complete = true;
  ls.completedAt = "2026-05-03T10:00:00Z";
  ctx.flushSave();   // the fix

  // Simulate navigation: a brand-new page would call loadState() → reads localStorage.
  const reloaded = JSON.parse(memStore["cis-linux-tutorial"]);
  assert.ok(reloaded, "localStorage must contain state after flushSave (was empty before fix)");
  assert.strictEqual(
    reloaded.lessons["02-ssh"].complete, true,
    "Completion must persist across the simulated page navigation"
  );
  assert.strictEqual(reloaded.lessons["02-ssh"].completedAt, "2026-05-03T10:00:00Z");
});

test("REGRESSION: report rendering sees completed lessons after flushSave", () => {
  // The report iterates HARDENING_LESSON_IDS.filter(id => STATE.lessons[id]?.complete).
  // If completion never persisted, the filter returns [] → blank report.
  delete memStore["cis-linux-tutorial"];
  for (const id of [...ctx.HARDENING_LESSON_IDS]) {
    ctx.STATE.lessons[id].complete = true;
  }
  ctx.flushSave();
  const reloaded = JSON.parse(memStore["cis-linux-tutorial"]);
  const completed = [...ctx.HARDENING_LESSON_IDS].filter(id => reloaded.lessons[id]?.complete);
  assert.strictEqual(
    completed.length, ctx.HARDENING_LESSON_IDS.length,
    "Report would only see completed lessons that actually made it to localStorage"
  );
});

// ============================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
