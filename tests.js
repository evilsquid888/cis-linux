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
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
