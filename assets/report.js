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
