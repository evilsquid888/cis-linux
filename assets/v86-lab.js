/* ============================================================
   v86-lab.js — shared boot / staging / I/O plumbing for
   lessons/NNa-*-vm.html pages.

   Each lesson page provides:
     - the standard VM panel DOM (vm-boot, vm-stage, vm-clear,
       vm-status, vm_screen, vm-input-line)
     - a scenario { stage, commandHandlers, postBootDelayMs }

   This module handles:
     - V86 instantiation against vendored ../assets/v86/* assets
     - chunked keyboard_send_text (avoids PS/2 buffer overrun)
     - staging-state gating (no input races the auto-stage)
     - focus management + a fallback input line
     - per-code-block "▸ Send to VM" buttons

   See docs/v86-lessons-learned.md for why this is shaped the way it is.
   ============================================================ */
(function () {
  "use strict";

  const V86_BASE = "../assets/v86";

  // ─── Stub binaries shared across lessons ─────────────────────────
  // Tiny shell scripts that mimic real Ubuntu commands enough for the
  // lesson's audit/remediate/verify flow to work end-to-end against the
  // 6 MB Buildroot image (which has no real sshd, ufw, systemctl, etc.).

  const STUB_SUDO = `#!/bin/sh
exec "$@"
`;

  const STUB_SYSTEMCTL = `#!/bin/sh
svc="\${2:-ssh}"
case "$1" in
  reload|restart)
    echo "[lab] $svc \${1}ed — would re-read service config"
    ;;
  status)
    echo "● $svc.service - $svc daemon (lab stub)"
    echo "     Loaded: loaded (/etc/init.d/$svc; enabled)"
    echo "     Active: active (running) since boot"
    ;;
  is-active)  echo "active" ;;
  is-enabled) echo "enabled" ;;
  enable)     echo "[lab] $svc enabled (stub — no-op)" ;;
  disable)    echo "[lab] $svc disabled (stub)" ;;
  *)          echo "[lab] systemctl $* (stub — no-op)" ;;
esac
`;

  // Minimal apt stub. Pretends every package is already installed.
  const STUB_APT = `#!/bin/sh
case "$1" in
  install)
    shift
    [ "$1" = "-y" ] && shift
    for pkg; do echo "[lab] $pkg is already the newest version (lab stub)"; done
    ;;
  update)   echo "[lab] (stub) Reading package lists... Done" ;;
  list)     echo "[lab] (stub) listing not implemented" ;;
  *)        echo "[lab] apt $* (stub)" ;;
esac
`;

  // dpkg -l <pkg> reports installed-with-version — used by audit commands.
  const STUB_DPKG = `#!/bin/sh
case "$1" in
  -l)
    shift
    pkg="\${1:-?}"
    printf 'Desired=Unknown/Install/Remove/Purge/Hold\\n'
    printf '| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\\n'
    printf '|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\\n'
    printf '||/ Name           Version       Architecture Description\\n'
    printf '+++-==============-=============-============-====================================\\n'
    printf 'ii  %-14s %-13s %-12s %s (lab stub)\\n' "$pkg" "1.0.0-lab" "amd64" "$pkg"
    ;;
  *) echo "[lab] dpkg $* (stub)" ;;
esac
`;

  // ─── Public helpers exposed to lesson pages ──────────────────────

  // Build a heredoc-based file write. Single-quoted delimiter prevents
  // shell expansion of $vars / backticks inside the body.
  function writeFile(path, body) {
    return [
      `cat > ${path} <<'__LAB_END__'`,
      String(body).replace(/\n$/, ""),  // body, trailing-newline-stripped
      "__LAB_END__",
    ].join("\n");
  }

  function writeExecutable(path, body) {
    return writeFile(path, body) + `\nchmod +x ${path}`;
  }

  // Standard scaffolding every lab needs: dirs, sudo, systemctl, apt, dpkg
  // on PATH. Lessons can opt out per-binary via opts.skip.
  function commonScaffolding(opts) {
    opts = opts || {};
    const skip = opts.skip || {};
    const lines = [
      "mkdir -p /etc/ssh /usr/local/bin /var/lib/ufw",
    ];
    if (!skip.sudo)      lines.push(writeExecutable("/usr/local/bin/sudo",      STUB_SUDO));
    if (!skip.systemctl) lines.push(writeExecutable("/usr/local/bin/systemctl", STUB_SYSTEMCTL));
    if (!skip.apt)       lines.push(writeExecutable("/usr/local/bin/apt",       STUB_APT));
    if (!skip.aptget)    lines.push(writeExecutable("/usr/local/bin/apt-get",   STUB_APT));
    if (!skip.dpkg)      lines.push(writeExecutable("/usr/local/bin/dpkg",      STUB_DPKG));
    lines.push("export PATH=/usr/local/bin:$PATH");
    lines.push("grep -q '/usr/local/bin' /etc/profile 2>/dev/null || echo 'export PATH=/usr/local/bin:$PATH' >> /etc/profile");
    return lines.join("\n");
  }

  // ─── Initialization ──────────────────────────────────────────────

  function init(opts) {
    if (!opts || typeof opts.stage !== "function") {
      throw new Error("VmLab.init({ stage }) is required");
    }

    const bootBtn   = document.getElementById("vm-boot");
    const stageBtn  = document.getElementById("vm-stage");
    const clearBtn  = document.getElementById("vm-clear");
    const statusEl  = document.getElementById("vm-status");
    const screenEl  = document.getElementById("vm_screen");
    const inputEl   = document.getElementById("vm-input-line");

    let emulator = null;
    let staging  = false;

    function setStatus(s, label) {
      statusEl.className = "vm-status s-" + s;
      statusEl.textContent = label || s;
    }

    function setSendButtonsEnabled(on) {
      document.querySelectorAll(".send-cmd").forEach(b => { b.disabled = !on; });
      if (inputEl) inputEl.disabled = !on;
    }

    // Chunked PS/2 keyboard injection. v86's keyboard buffer overruns
    // when fed faster than the kernel echo loop drains, dropping keys.
    // 64 chars / 25 ms is empirically reliable for busybox in linux4.iso.
    async function sendToVm(text) {
      if (!emulator) return false;
      const CHUNK = 64;
      const DELAY_MS = 25;
      for (let i = 0; i < text.length; i += CHUNK) {
        emulator.keyboard_send_text(text.slice(i, i + CHUNK));
        if (i + CHUNK < text.length) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }
      return true;
    }

    async function runStage(reason) {
      staging = true;
      setStatus("staging", reason || "staging…");
      setSendButtonsEnabled(false);
      await sendToVm(opts.stage() + "\n");
      staging = false;
      setStatus("ready", "ready");
      setSendButtonsEnabled(true);
      stageBtn.disabled = false;
      clearBtn.disabled = false;
      screenEl.focus();
    }

    bootBtn.addEventListener("click", () => {
      if (emulator) return;
      setStatus("booting", "loading wasm…");
      bootBtn.disabled = true;

      // Default V86 config = vendored Buildroot Linux 4 (~7 MB).
      // Lessons can fully replace this via opts.v86Config (e.g. for Arch
      // Linux booted from a state snapshot at i.copy.sh).
      const defaultConfig = {
        wasm_path:        V86_BASE + "/v86.wasm",
        memory_size:      64 * 1024 * 1024,
        vga_memory_size:  2 * 1024 * 1024,
        bios:     { url: V86_BASE + "/seabios.bin" },
        vga_bios: { url: V86_BASE + "/vgabios.bin" },
        cdrom:    { url: V86_BASE + "/linux4.iso" },
        autostart: true,
      };
      const config = Object.assign({}, opts.v86Config || defaultConfig, {
        screen_container: screenEl,
      });

      try {
        emulator = new V86(config);
      } catch (e) {
        console.error("[lab] V86 constructor threw:", e);
        setStatus("error", "init failed (see console)");
        bootBtn.disabled = false;
        return;
      }

      emulator.add_listener("download-progress", (info) => {
        if (info && typeof info.loaded === "number") {
          const mb = (info.loaded / (1024 * 1024)).toFixed(1);
          setStatus("booting", `loading… ${mb} MB`);
        }
      });
      emulator.add_listener("download-error", (info) => {
        console.error("[lab] v86 download error:", info);
        setStatus("error", "asset failed (see console)");
      });
      emulator.add_listener("emulator-loaded", () => {
        setStatus("booting", "wasm loaded — preparing OS…");
      });
      emulator.add_listener("emulator-ready", () => {
        setStatus("booting", "almost ready…");
        const wait = typeof opts.postBootDelayMs === "number" ? opts.postBootDelayMs : 4500;
        setTimeout(async () => {
          // For Buildroot we send Enter to dismiss "press enter for console";
          // for state-restored boots (Arch) it's a no-op (just an extra newline).
          if (opts.dismissPrompt !== false) {
            await sendToVm("\n");
            await new Promise(r => setTimeout(r, 500));
          }
          await runStage("staging lab…");
        }, wait);
      });
    });

    stageBtn.addEventListener("click", () => {
      if (!emulator || staging) return;
      runStage("re-staging…");
    });

    clearBtn.addEventListener("click", () => {
      if (!emulator || staging) return;
      sendToVm("clear\n");
      screenEl.focus();
    });

    // ▸ Send to VM buttons next to instruction code blocks
    document.querySelectorAll(".send-cmd").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!emulator) {
          alert("Boot the VM first (▶ Boot VM, top-right).");
          return;
        }
        if (staging) return;
        const direct = btn.getAttribute("data-cmd");
        if (direct) {
          await sendToVm(direct + "\n");
          screenEl.focus();
          return;
        }
        const key = btn.getAttribute("data-cmd-key");
        const handler = opts.commandHandlers && opts.commandHandlers[key];
        if (typeof handler === "function") {
          const text = handler();
          await sendToVm(text.endsWith("\n") ? text : text + "\n");
          screenEl.focus();
        } else if (key) {
          console.warn("[lab] no handler registered for command-key:", key);
        }
      });
    });

    // Fallback input — always works regardless of where focus is.
    if (inputEl) {
      inputEl.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter" || staging || !emulator) return;
        e.preventDefault();
        const text = inputEl.value;
        inputEl.value = "";
        await sendToVm(text + "\n");
      });
    }

    // Focus management — visible blue outline when the screen has focus.
    screenEl.addEventListener("mousedown", () => screenEl.focus());
    screenEl.addEventListener("focusin",  () => screenEl.classList.add("has-focus"));
    screenEl.addEventListener("focusout", () => screenEl.classList.remove("has-focus"));
  }

  // Public API
  window.VmLab = {
    init,
    writeFile,
    writeExecutable,
    commonScaffolding,
  };
})();
