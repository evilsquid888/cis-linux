// Browser smoke test — opens every page locally and checks for runtime errors.
// Usage: npx playwright install chromium  (one-time)
//        node smoke-test.mjs

import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = (p) => "file://" + resolve(__dirname, p);

const PAGES = [
  { url: "index.html",                          expect: ["CIS Linux Tutorial", "Course outline", "Lab Setup"] },
  { url: "lessons/00-lab-setup.html",           expect: ["Lab Setup", "Multipass", "Why not Docker"] },
  { url: "lessons/01-welcome.html",             expect: ["Welcome", "audit", "remediate"] },
  { url: "lessons/02-ssh.html",                 expect: ["SSH Hardening", "PermitRootLogin", "MaxAuthTries"] },
  { url: "lessons/03-ufw.html",                 expect: ["UFW Host Firewall", "ufw allow 22/tcp"] },
  { url: "lessons/04-user-audit.html",          expect: ["User Account Audit", "/etc/passwd"] },
  { url: "lessons/05-stig-primer.html",         expect: ["STIG Primer", "DISA"] },
  { url: "lessons/06-stig-ssh-crypto.html",     expect: ["Stricter SSH Crypto", "FIPS"] },
  { url: "lessons/07-stig-password-lockout.html", expect: ["Password Complexity", "faillock"] },
  { url: "lessons/08-assessment.html",          expect: ["Final Assessment", "Generate Customer Report"] },
  { url: "lessons/09-next-steps.html",          expect: ["Next Steps", "OpenSCAP", "SANS"] },
  { url: "report.html",                         expect: ["CIS Ubuntu", "Acme Corp", "Findings Summary"] }
];

let totalPass = 0, totalFail = 0;
const failureLog = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
const networkFails = [];
page.on("console",  m => { if (m.type() === "error") consoleErrors.push(`[${m.location().url}] ${m.text()}`); });
page.on("pageerror", e => consoleErrors.push(`PAGE-ERROR ${e.message}`));
page.on("requestfailed", r => networkFails.push(`${r.url()} — ${r.failure()?.errorText}`));

function check(name, ok, detail) {
  if (ok) { totalPass++; console.log(`  PASS  ${name}`); }
  else    { totalFail++; failureLog.push({ name, detail }); console.log(`  FAIL  ${name}\n        ${detail}`); }
}

async function smokePage(p) {
  console.log(`\n--- ${p.url} ---`);
  consoleErrors.length = 0;
  networkFails.length = 0;

  await page.goto(fileUrl(p.url), { waitUntil: "load" });
  await page.waitForTimeout(200);   // let any post-load script settle

  check(`${p.url} — no page errors`, consoleErrors.length === 0, consoleErrors.join("\n"));
  check(`${p.url} — no network failures`, networkFails.length === 0, networkFails.join("\n"));

  const html = await page.content();
  for (const phrase of p.expect) {
    check(`${p.url} — contains "${phrase}"`, html.includes(phrase), `not found in ${html.length} bytes`);
  }

  // Header + sidebar rendered (every page except 404)
  if (p.url !== "404.html") {
    const headerCount = await page.$$eval(".header", e => e.length);
    const sidebarCount = await page.$$eval(".sidebar", e => e.length);
    if (p.url === "report.html") {
      // report.html intentionally renders no header/sidebar
    } else {
      check(`${p.url} — header rendered`,  headerCount  >= 1, `found ${headerCount}`);
      check(`${p.url} — sidebar rendered`, sidebarCount >= 1, `found ${sidebarCount}`);
      const navItems = await page.$$eval(".nav-item", e => e.length);
      check(`${p.url} — sidebar has 10 lesson links`, navItems === 10, `found ${navItems}`);
    }
  }
}

// 1. Walk every page
for (const p of PAGES) await smokePage(p);

// 2. Lesson 2 — interactive checkbox test
console.log(`\n--- Interactive: tick a check on Lesson 2, reload, verify persistence ---`);
await page.goto(fileUrl("lessons/02-ssh.html"), { waitUntil: "load" });
await page.waitForTimeout(200);
const checksBefore = await page.$$eval(".check-toggle", els => els.map(e => ({ id: e.dataset.checkId, checked: e.checked })));
check("Lesson 2 — 4 checkboxes rendered", checksBefore.length === 4, JSON.stringify(checksBefore));

// Tick the first one
await page.locator(".check-toggle").first().check();
await page.waitForTimeout(700);   // wait for debounced save (500ms + buffer)
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(200);
const firstAfter = await page.$eval(".check-toggle", e => e.checked);
check("Lesson 2 — tick persists across reload", firstAfter === true, `firstAfter=${firstAfter}`);

// 3. Lesson 8 with state — judgment + report generation
console.log(`\n--- Lesson 8: simulate completed lessons + generate report ---`);
await page.goto(fileUrl("lessons/08-assessment.html"), { waitUntil: "load" });
await page.waitForTimeout(200);
// Inject a state with all 5 hardening lessons complete and 100% checks
await page.evaluate(() => {
  const HARD = ["02-ssh","03-ufw","04-user-audit","06-stig-ssh-crypto","07-stig-password-lockout"];
  const s = JSON.parse(localStorage.getItem("cis-linux-tutorial"));
  for (const id of HARD) {
    s.lessons[id].complete = true;
    s.lessons[id].notes = "Test note for " + id;
    for (const cid in s.lessons[id].checks) {
      s.lessons[id].checks[cid] = { ticked: true, finding: "pass" };
    }
  }
  s.metadata.assessorName = "Smoke Tester";
  s.metadata.customerName = "Test Corp";
  localStorage.setItem("cis-linux-tutorial", JSON.stringify(s));
});
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(300);

const judgmentText = await page.locator("#judgment-host").innerText().catch(() => "");
check("Lesson 8 — judgment renders 'Solid' tier", judgmentText.includes("Solid assessor"), `got: ${judgmentText.slice(0,200)}`);

const reviewText = await page.locator("#review-host").innerText().catch(() => "");
check("Lesson 8 — review shows 5 of 5 lessons complete", reviewText.includes("5 of 5"), `got: ${reviewText.slice(0,200)}`);

// 4. Open report.html in same context (shares localStorage), verify it renders
console.log(`\n--- report.html with state ---`);
await page.goto(fileUrl("report.html"), { waitUntil: "load" });
await page.waitForTimeout(300);
const reportHtml = await page.content();
check("report.html — shows customer name 'Test Corp'", reportHtml.includes("Test Corp"), "missing customer name");
check("report.html — shows assessor 'Smoke Tester'", reportHtml.includes("Smoke Tester"), "missing assessor name");
check("report.html — shows finding rows", reportHtml.match(/<tr>[\s\S]*?CIS §/g)?.length > 0, "no findings rows");
check("report.html — no failures (100% ticked)", reportHtml.includes("No failures recorded"), "expected zero-fail summary");

await browser.close();

console.log(`\n${totalPass} passed, ${totalFail} failed`);
if (totalFail > 0) {
  console.log("\nFailures:");
  for (const f of failureLog) console.log(`  - ${f.name}\n      ${f.detail.slice(0,300)}`);
  process.exit(1);
}
