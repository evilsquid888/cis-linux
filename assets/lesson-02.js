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
