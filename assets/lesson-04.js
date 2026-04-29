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
