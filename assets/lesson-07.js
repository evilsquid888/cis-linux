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
