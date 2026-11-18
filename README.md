# Portfolio

A one-page personal portfolio — a hand-built static clone of
<https://powerful-herring-025226.framer.app/> for Azhar Habeeb Mohamed S.

**Live site:** <https://azhar-habeeb-mohamed-s.github.io/portfolio/>

---

## Overview

The **published site is fully static**: plain HTML, CSS and JavaScript, with no
framework, no build step and no runtime dependencies. Local tooling (lint,
format, tests) uses npm packages, but none of it ships to the browser.

| File                           | Purpose                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `index.html`                   | All page content, one commented section per page section.                                               |
| `styles.css`                   | All styling, including the local overrides and the reduced-motion rule at the end. No remote `@import`. |
| `script.js`                    | Clock, scroll-drawn rules, and the like button.                                                         |
| `fonts.css` / `fonts/`         | Local Inter font subsets (42 `.woff2` files).                                                           |
| `images/`                      | Project cover poster and favicons.                                                                      |
| `supabase-config.js`           | Generated at build time from environment variables (empty by default).                                  |
| `SUPABASE.md`                  | Supabase setup, SQL, security notes and the read-only audit query.                                      |
| `HANDOVER.md`                  | Full design/implementation reference.                                                                   |
| `tests/script.test.js`         | Unit tests for the clock, rules and like button.                                                        |
| `scripts/verify.py`            | Structural sanity checks (HTML, CSS, local assets).                                                     |
| `scripts/generate-config.js`   | Generates `supabase-config.js` from env vars / `.env`.                                                  |
| `.github/workflows/ci.yml`     | Lint, format check, tests and structure checks on push/PR.                                              |
| `.github/workflows/deploy.yml` | Builds `supabase-config.js` from secrets and deploys to Pages.                                          |

All asset paths are relative, so the page works from disk, from any static
server, and from the GitHub Pages site root.

---

## Local development

```powershell
npm ci                 # install dev tooling once
npm run config         # generate supabase-config.js from .env (or leave empty)

python -m http.server 8123 --bind 0.0.0.0
# then open http://127.0.0.1:8123/index.html
```

Opening `index.html` directly from disk also works, but a local server is
recommended so network behaviour matches production.

### Scripts

| Command                    | What it does                                                           |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run lint`             | ESLint (JS), Stylelint (CSS), html-validate (HTML).                    |
| `npm run format`           | Prettier — apply formatting.                                           |
| `npm run format:check`     | Prettier — verify formatting.                                          |
| `npm test`                 | `node --test tests/` (Node's built-in test runner, no test framework). |
| `npm run config`           | Write `supabase-config.js` from `.env` / environment.                  |
| `python scripts/verify.py` | HTML structure, CSS braces, local assets, no inline styles/remote CSS. |
| `npm run check`            | lint + format:check + test.                                            |

CI runs all of these on every push and pull request to `main`.

`tests/script.test.js` boots the real `script.js` in a `vm` context with a small
DOM/fetch stub. It covers the clock (including the no-`Intl` fallback), the
scroll rules, the like button (success, unlike, exact rollback, zero clamp,
local-only, corrupt storage) and the pagehide/pageshow lifecycle.

---

## Supabase likes (optional, environment-driven)

Likes are stored per browser in `localStorage` by default. To make the count
shared by everyone:

1. Create the free Supabase project and run the SQL in [`SUPABASE.md`](SUPABASE.md).
2. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and
   `SUPABASE_ANON_KEY`. **Do not commit `.env`** — it is gitignored.
3. Locally run `npm run config` to generate `supabase-config.js`.
4. For production, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository
   secrets (Settings → Secrets and variables → Actions). The deploy workflow
   generates the config file at build time from those secrets.

The key was moved **out of the repository**: `supabase-config.js` is generated
and gitignored (only an empty placeholder is tracked), and no real key remains
in the current files. **It is still present in git history** from before this
change — rotate the Supabase publishable key (Project Settings → API → Rotate)
and update the secrets.

A publishable key is public by design; security is enforced by RLS and the
`adjust_site_likes` RPC. See the audit checklist and read-only audit query in
[`SUPABASE.md`](SUPABASE.md). If the values are blank or Supabase is down, the
site quietly falls back to the per-browser counter.

---

## Deployment

Deployment is handled by GitHub Actions. **One-time setup:** in
**Settings → Pages → Build and deployment**, set **Source: GitHub Actions**.

After that, every push to `main`:

1. Runs CI (lint, format, tests, structure checks).
2. Generates `supabase-config.js` from the repository secrets.
3. Stages only the published files and deploys them to Pages via
   `actions/deploy-pages`.

> GitHub Pages and browsers cache HTML/CSS for a few minutes. Hard-reload
> (`Ctrl+F5`) when verifying a deployment.

---

## Design and accessibility notes

The layout is flexbox throughout, mirroring the original Framer export. The
`.rt--*` classes use fractional `flex-grow` values (with `width: 1px`) to divide
columns exactly as the original does. Breakpoints are desktop ≥ 1200px,
tablet 600–1199.98px, mobile ≤ 599.98px.

- Images have descriptive `alt` text; the clock face is a labelled `role="img"`.
- The digital clock uses `role="timer" aria-live="off"` so assistive tech can
  read it on demand **without** announcing the time every second.
- The hairline rules skip their transition under `prefers-reduced-motion`.
- Timers and listeners are suspended on `pagehide` and restored on `pageshow`
  (so browser back/forward-cache restoration still works).
- The grey cover image is the original design's placeholder. Earlier `xxx`
  copy placeholders were replaced with real text; see
  [`HANDOVER.md`](HANDOVER.md) for the remaining deliberate differences.
