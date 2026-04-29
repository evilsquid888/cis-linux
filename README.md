# CIS Linux Tutorial

A one-hour tutorial that teaches blue-team defenders to perform a basic CIS-style
assessment and hardening pass on an Ubuntu 24.04 LTS server. Framed as an
"Acme Corp" engagement; ends with a generated customer-facing HTML report.

## Live site

https://evilsquid888.github.io/cis-linux/

## Run locally

Open `index.html` in any modern browser. No build step, no dependencies.

## Run tests

```bash
node tests.js
```

## What's covered

| # | Lesson | Source |
|---|---|---|
| 0 | Lab Setup (Multipass / BYO / Class Lab) | — |
| 1 | Welcome | — |
| 2 | SSH hardening | CIS §5.2 |
| 3 | UFW host firewall | CIS §3.5 |
| 4 | User account audit | CIS §5.3 + §5.4 |
| 5 | STIG primer | DISA STIG |
| 6 | STIG: stricter SSH crypto | DISA STIG |
| 7 | STIG: password complexity + lockout | DISA STIG |
| 8 | Final assessment + customer report | — |
| 9 | Next steps | — |

## Architecture

See [`docs/superpowers/specs/2026-04-28-cis-linux-tutorial-design.md`](docs/superpowers/specs/2026-04-28-cis-linux-tutorial-design.md).
