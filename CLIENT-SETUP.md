# Client setup guide

Everything in this repository is finished and verified locally. The steps below
are the **only** remaining actions, and they all happen outside the repo — in
the Supabase dashboard, in GitHub settings, and in your terminal. They require
the project owner's access.

Do them in order.

---

## 1. Rotate the old Supabase key (5 minutes)

The old publishable key was committed to this repository in the past. Even
though current files are clean, **old commits still contain it**, so it must be
rotated.

1. Open <https://supabase.com/dashboard> and select the project.
2. Go to **Project Settings → API**.
3. Under **Project API keys**, find the `anon` / `publishable` key and click
   **Rotate** (or "Reset").
4. Copy the **new** `publishable` key and the **Project URL** (they look like
   `https://xxxxxxxx.supabase.co` and `sb_publishable_...`).
5. Keep them handy for step 3. Do **not** paste them into the repository or into
   a chat message.

> The key is public by design — it is safe in browser code. Rotation is needed
> only because the old value is preserved in git history.

---

## 2. Run the read-only security audit (2 minutes)

This confirms the like counter cannot be abused. It changes nothing.

1. In Supabase, open **SQL Editor → New query**.
2. Paste the query from [`SUPABASE.md`](SUPABASE.md#security-notes) (section
   "Security notes") and click **Run**.
3. Check the results:
   - `rls_enabled` = **true**
   - exactly one policy called `Anyone can read the like count`, with `cmd` =
     `SELECT`
   - `anon` and `authenticated` have **SELECT only** — no INSERT, UPDATE,
     DELETE or ALL
   - `adjust_site_likes` shows `security_definer` = **true**, both
     `anon_can_execute` and `auth_can_execute` = **true**, and the definition
     contains `greatest(0, count + delta)`

If anything differs, re-run the setup SQL in `SUPABASE.md` section 3 before
continuing.

---

## 3. Add the GitHub repository secrets (3 minutes)

These let the deploy workflow generate `supabase-config.js` at build time,
instead of committing the key.

1. Open <https://github.com/Azhar-Habeeb-Mohamed-S/portfolio>.
2. Go to **Settings → Secrets and variables → Actions → New repository secret**.
3. Create these two secrets:

   | Name                | Value                               |
   | ------------------- | ----------------------------------- |
   | `SUPABASE_URL`      | The Project URL from step 1         |
   | `SUPABASE_ANON_KEY` | The new publishable key from step 1 |

4. Save both.

---

## 4. Switch GitHub Pages to GitHub Actions (1 minute)

1. In the same repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. No other Pages settings need to change.

---

## 5. Push the finished work (1 minute)

The developer has already committed everything on branch `main`. From the
project folder:

```powershell
git status          # should say "working tree clean"
git push origin main
```

If `git status` still lists modified files, stop and contact the developer —
do not push a partial state.

---

## 6. Verify the deployment (3 minutes)

1. Open the repository's **Actions** tab. The **CI** workflow should pass
   (lint, formatting, 12 tests, structure checks).
2. The **Deploy to GitHub Pages** workflow should also pass.
3. Open <https://azhar-habeeb-mohamed-s.github.io/portfolio/> and hard-reload
   with `Ctrl+F5` (GitHub Pages caches for a few minutes).
4. Check on the live site:
   - the name, bio and `©2027` appear near the top;
   - project cards show real copy, not `xxx`;
   - the two hairlines animate in when you scroll;
   - the clock shows the current local time and the hands move;
   - the heart button under the note toggles and survives a reload (a count
     above 0 confirms the Supabase secrets are wired up correctly).

---

## 7. Optional: run the site locally

```powershell
npm ci
Copy-Item .env.example .env      # then fill in the two values from step 1
npm run config                   # writes supabase-config.js
python -m http.server 8123
```

Open <http://127.0.0.1:8123/index.html>. The `.env` file is gitignored.

Useful commands:

```powershell
npm run check        # lint + format check + tests + structure checks
npm run format       # auto-format all source files
```

---

## Quick reference — what changed

- All client code-quality recommendations are implemented (tooling, CI, env
  config, Supabase audit, real copy, alt text, local CSS, tests, a11y, docs).
- `npm run check` passes: ESLint, Stylelint, html-validate, Prettier,
  `node --check`, 12/12 tests, and the structure verifier.
- The published site is still a static site — npm is **development tooling
  only**, not a runtime dependency.
- The old key is no longer in any source file, but is still in git history —
  step 1 is not optional.

@216@
