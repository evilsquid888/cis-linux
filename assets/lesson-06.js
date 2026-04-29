const LESSON_06 = {
  id: "06-stig-ssh-crypto",
  slug: "stig-ssh-crypto",
  title: "STIG: Stricter SSH Crypto",
  section: "stig",
  estimatedMinutes: 8,
  controls: ["DISA STIG: V-260547, V-260548, V-260549"],
  checks: [
    {
      id: "stig.ssh.ciphers",
      label: "SSH Ciphers restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260547",
      recommendation: "Add `Ciphers aes256-ctr,aes192-ctr,aes128-ctr` to /etc/ssh/sshd_config."
    },
    {
      id: "stig.ssh.macs",
      label: "SSH MACs restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260548",
      recommendation: "Add `MACs hmac-sha2-512,hmac-sha2-256` to /etc/ssh/sshd_config."
    },
    {
      id: "stig.ssh.kex",
      label: "SSH KexAlgorithms restricted to FIPS-approved set",
      severity: "high",
      controlRef: "STIG V-260549",
      recommendation: "Add `KexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group16-sha512,diffie-hellman-group-exchange-sha256` to /etc/ssh/sshd_config."
    }
  ]
};
