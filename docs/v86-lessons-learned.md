# v86 lab edition — lessons learned

Notes from building `lessons/02a-ssh-vm.html`, `03a-ufw-vm.html`, and
`04a-user-audit-vm.html` — the lab editions that boot a real Linux VM
in the browser via [v86](https://github.com/copy/v86) and run the
canonical CIS audit/remediate/verify commands against it.

This is the rationale behind the shapes of `assets/v86-lab.js` and the
vendored `assets/v86/*` blobs. If you're adding another VM lesson, read
this first — most of the non-obvious decisions are documented here so
you don't re-discover them.

---

## 1. CORS is the silent killer

**Symptom:** the VM panel sits on "booting…" forever. Nothing in the
JS console screams. The `emulator-ready` event simply never fires.

**Cause:** the canonical v86 demo at `copy.sh/v86/` does **not** set
`Access-Control-Allow-Origin` on the `build/v86.wasm`, `bios/*.bin`, or
`images/*.iso` responses. When the page is loaded from another origin
(e.g. `evilsquid888.github.io`), the browser silently aborts the wasm
fetch — no error, no progress event, no rejection.

**Fix:** vendor the assets locally so everything is same-origin.
`assets/v86/` carries:

| file | size | source |
| --- | --- | --- |
| `libv86.js` | 331 KB | `npm v86@0.5.334` via jsDelivr |
| `v86.wasm` | 2.0 MB | same |
| `seabios.bin` | 128 KB | `gh/copy/v86@master/bios/` via jsDelivr |
| `vgabios.bin` | 36 KB | same |
| `linux4.iso` | 7.4 MB | `copy.sh/v86/images/` (one-time download) |

Total ~9.8 MB committed to git. Browser-cached after the first load,
so repeat visits are instant.

**How to confirm CORS is the issue when debugging a new image:**
```bash
curl -sI -H "Origin: https://your-pages-domain.github.io" \
  https://copy.sh/v86/build/v86.wasm | grep -i access-control
```
If you don't see an `access-control-allow-origin` header in the
response, you can't load it cross-origin. Period.

---

## 2. `keyboard_send_text` overruns the PS/2 buffer

**Symptom:** "Send to VM" buttons truncate long commands; the trailing
characters never make it into the shell.

**Cause:** `emulator.keyboard_send_text(s)` translates each character
to a keydown+keyup scancode pair and pushes it into v86's emulated PS/2
keyboard buffer. The Linux kernel drains this buffer at echo speed
(slower than you'd think — every char gets read, processed, echoed
back to the screen). Push faster than that and the buffer overruns and
later scancodes are lost.

A 75-char command (`sudo sshd -T | grep -iE '...'`) generates ~150
scancodes. Even that is enough to drop trailing chars on a slow guest.
The 3 KB staging script was much worse — it'd consistently lose ~30%
of its tail.

**Fix:** chunked send with a yield between chunks.
```js
async function sendToVm(text) {
  const CHUNK = 64;
  const DELAY_MS = 25;
  for (let i = 0; i < text.length; i += CHUNK) {
    emulator.keyboard_send_text(text.slice(i, i + CHUNK));
    if (i + CHUNK < text.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
}
```

Empirically, 64-char chunks at 25 ms intervals are reliable for
busybox-on-linux4. A 3 KB stage takes ~1.2 s — not instant but
acceptable.

**Don't shrink the chunks too much.** 8-char chunks at 5 ms feels
faster but the per-`setTimeout` overhead dominates and total time
actually goes up.

---

## 3. Auto-stage races user input

**Symptom:** users complain typing into the VM is laggy or their keys
"don't show up for a while."

**Cause:** the boot flow auto-stages the lesson scenario by typing
~3 KB of shell into the prompt. If the user clicks Boot and immediately
starts typing, their keystrokes interleave with the staging script and
both end up garbled. From the user's perspective: they typed 4 chars,
then the stage script ran for a second, then their chars showed up
mid-script.

**Fix:** make staging a *visible, gated* state.

- `vm-status` pill shows `staging…` while it's running
- All `▸ Send to VM` buttons and the fallback input are `disabled`
  during staging
- After staging completes, the VM screen gets `screenEl.focus()`
  programmatically so the user can immediately type

Now the user gets a clear ~5-second "VM is preparing" phase, then
"ready" status, and from that point typing works as expected.

---

## 4. Direct typing into the VM screen is finicky

**Symptom:** even after boot, users say their keys don't always reach
the VM. Sometimes they have to click the screen multiple times.

**Causes:**
1. v86's keyboard handler attaches to the `screen_container` element.
   If that element doesn't have keyboard focus, keys aren't captured.
2. There's no visible focus indicator by default — users can't tell
   whether they're typing into the VM or the surrounding page.
3. Other elements on the page (textareas, buttons) easily steal focus
   on a stray click.

**Fixes (all three required):**
1. `tabindex="0"` on the screen container + `mousedown` listener that
   force-focuses on click. mousedown beats `click` because it fires
   before focus moves elsewhere.
2. CSS `:focus` outline + a `.has-focus` class toggled via
   `focusin`/`focusout` for an obvious blue border when focused.
3. A fallback `<input>` row underneath the VM screen — type, hit
   Enter, the line gets piped into the VM with a newline. Always
   works regardless of focus state. Especially useful on touch devices.

---

## 5. Stub binaries are good enough to feel real

**Realization:** you don't need a real `sshd` to teach `sshd -T`. You
need a script that *parses* `/etc/ssh/sshd_config` and *prints the
effective config the way `sshd -T` does*, including the OpenSSH
compiled-in defaults for any directive that's commented or absent.

The stub `sshd` in `v86-lab.js` is ~30 lines of `awk` and produces
output that's byte-identical to real Ubuntu's `sshd -T` for the dozen
directives CIS audits. Same for `ufw` (state stored in
`/var/lib/ufw/state`), `passwd -l` (toggles a `!` prefix in `/etc/shadow`),
`usermod -s` (rewrites the shell field in `/etc/passwd`), `systemctl`
(prints what it would do), and so on.

This pattern lets a 6 MB Buildroot busybox image carry 6+ "real" CIS
lessons. The user types the canonical command, the stub responds the
way the real tool would, the file edit is what gets graded.

**When this stops being good enough:** if the lesson needs to actually
*observe* a daemon's runtime behavior — e.g. testing whether a real
brute-force attempt triggers `pam_faillock` — the stub can't help.
That's where you'd graduate to a real Alpine or Buildroot-with-sshd
image and pay the multi-hour build cost. Lessons 6 and 7 are kept
read-only for exactly that reason.

---

## 6. Auto-stage with heredocs over `printf`

Early version used `printf '%s' '...escaped content...'` to write each
file. This works but escaping single quotes in JS strings is a chore
and the resulting commands get long and unreadable in the typed echo.

Heredocs with a single-quoted delimiter (`<<'__LAB_END__'`) are far
cleaner:

```bash
cat > /usr/local/bin/sshd <<'__LAB_END__'
#!/bin/sh
... script body, no escaping needed ...
__LAB_END__
chmod +x /usr/local/bin/sshd
```

Single-quoted delimiter prevents `$var` and backtick expansion inside
the body, so script bodies ship verbatim. Use a unique delimiter
(`__LAB_END__` rather than `EOF`) so nested heredocs in the body
don't accidentally terminate the outer one. The shared `VmLab.writeFile()`
helper does this.

---

## 7. Linux 4 image has no real coreutils, dpkg, or apt

The default v86 `linux4.iso` is a tiny Buildroot Linux: BusyBox userland,
no package manager, no `dpkg`, no `apt`. So commands the lessons reference
(`apt install ufw`, `dpkg -l`, `systemctl reload ssh`) would normally
fail.

The shared scaffolding in `VmLab.commonScaffolding()` plants stub
versions of all of these in `/usr/local/bin` (added to `$PATH` ahead of
busybox). They produce believable output for the audit/remediate flow
without doing the real work.

If you need a real apt or systemd, you'll need a different base image
(Alpine + apk works in v86, with about 20 MB more weight; Debian works
but the boot time is closer to 30 seconds).

---

## 8. Diagnostics matter — invest in them once

The original boot path had a single `setStatus("booting")` and no further
updates until `emulator-ready`. When CORS broke the wasm load, the user
saw "booting" forever with no clue whether v86 was downloading, parsing,
or hung.

The current code listens for `download-progress`, `download-error`,
`emulator-loaded`, and `emulator-ready` and updates the status pill at
each step:

- `loading wasm…`
- `loading… 1.2 MB`
- `wasm loaded — booting kernel…`
- `kernel booting…`
- `staging lab…`
- `ready`

If a future image swap breaks loading, the status pill will tell you
*where* it broke without a console dive.

---

## When to add a new VM lesson

1. Create `lessons/NNa-slug-vm.html` modeled on `02a-ssh-vm.html`.
2. Source `assets/v86-lab.js` and the standard VM panel HTML
   (vm-toolbar / vm_screen / vm-input / vm-hint).
3. Provide a `stage()` function that returns a multi-line shell script:
   - Start with `VmLab.commonScaffolding()` for sudo/systemctl/apt/dpkg
   - Plant whatever extra config files + stub binaries the lesson needs
   - End with a `clear` and a friendly "Lab ready" echo
4. Provide `commandHandlers` for any multi-line `▸ Send to VM` blocks.
5. Add a cross-link from the read-only edition's `lesson-meta` row.
6. Add an entry to this doc if you hit a new gotcha.

The CIS series (lessons 2, 3, 4) costs less than 200 lines of
lesson-specific HTML each. The shared module is the reusable bit.
