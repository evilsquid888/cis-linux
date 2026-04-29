const LESSON_03 = {
  id: "03-ufw",
  slug: "ufw",
  title: "UFW Host Firewall",
  section: "cis",
  estimatedMinutes: 7,
  controls: ["CIS §3.5"],
  checks: [
    {
      id: "ufw.installed",
      label: "ufw package installed",
      severity: "high",
      controlRef: "CIS §3.5.1.1",
      recommendation: "Run `sudo apt install -y ufw`."
    },
    {
      id: "ufw.enabled",
      label: "ufw service enabled and running",
      severity: "critical",
      controlRef: "CIS §3.5.1.2",
      recommendation: "Run `sudo ufw --force enable` and `sudo systemctl enable ufw`."
    },
    {
      id: "ufw.default_deny",
      label: "Default policy is deny incoming",
      severity: "critical",
      controlRef: "CIS §3.5.1.4",
      recommendation: "Run `sudo ufw default deny incoming`."
    },
    {
      id: "ufw.ssh_allowed",
      label: "SSH port allowed",
      severity: "high",
      controlRef: "CIS §3.5.1.5",
      recommendation: "Run `sudo ufw allow 22/tcp` BEFORE enabling deny — or you'll lock yourself out."
    }
  ]
};
