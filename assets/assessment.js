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
  if (completedCount >= 4 && checkRatio >= 0.55)      tier = "solid";
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
