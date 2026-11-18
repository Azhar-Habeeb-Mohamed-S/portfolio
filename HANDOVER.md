# Handover — Azhar portfolio clone

A one-page personal portfolio, rebuilt as a **1:1 static copy** of
<https://powerful-herring-025226.framer.app/>.

- **Live site** — <https://azhar-habeeb-mohamed-s.github.io/portfolio/>
- **Repository** — <https://github.com/Azhar-Habeeb-Mohamed-S/portfolio>

---

## 1. Stack — no framework; dev tooling only

| Question       | Answer                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework?     | **None.** No React, Vue, Svelte, Next, Astro, Tailwind, jQuery, etc.                                                                                                                           |
| Build tool?    | **None for the site.** npm is used only for local lint/format/test tooling (ESLint, Stylelint, html-validate, Prettier). No bundler, no compile step; none of it ships to the browser.         |
| What is it?    | Three hand-written files — `index.html`, `styles.css`, `script.js` — plus font and image assets.                                                                                               |
| Dependencies   | One optional external script: the ElevenLabs conversational-agent embed (`unpkg.com/@elevenlabs/convai-widget-embed`). The page works without it; only the “Talk to an agent” pill disappears. |
| Hosting        | GitHub Pages, deployed by `.github/workflows/deploy.yml` from `main`.                                                                                                                          |
| How to publish | `git push origin main` — CI runs, then Actions deploys to Pages.                                                                                                                               |

You can open `index.html` directly from disk, or serve the folder with any static
file server. There is no server-side code and no production database in this repo.

```
python -m http.server 8123 --bind 0.0.0.0
# → http://127.0.0.1:8123/index.html
```

---

## 2. File map

| Path                           | Size                | Role                                                                                                       |
| ------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `index.html`                   | ~29 KB              | All page content. One `<section>` per page section, every block commented.                                 |
| `styles.css`                   | ~35 KB / 1740 lines | All styling: 16 numbered base sections (fully inlined, no remote import), local overrides, reduced motion. |
| `script.js`                    | ~8 KB               | Three behaviours: live clock, rule reveal animation, footer like button (localStorage or Supabase).        |
| `supabase-config.js`           | —                   | Generated from env vars / repo secrets; tracked with empty values, gitignored when generated locally.      |
| `SUPABASE.md`                  | —                   | First-time setup, SQL, security notes and the read-only RLS/RPC audit query.                               |
| `fonts.css` / `fonts/`         | 42 files            | Local Inter subsets.                                                                                       |
| `images/`                      | 3 PNGs              | Grey poster and two favicons. The portrait slot is intentionally empty.                                    |
| `README.md`                    | —                   | Project overview, scripts, env setup and deployment.                                                       |
| `HANDOVER.md`                  | —                   | This document.                                                                                             |
| `tests/script.test.js`         | —                   | Dependency-free unit tests (`node --test`).                                                                |
| `scripts/verify.py`            | —                   | Structural sanity checks (HTML/CSS/assets).                                                                |
| `scripts/generate-config.js`   | —                   | Writes `supabase-config.js` from `.env` / environment.                                                     |
| `.github/workflows/ci.yml`     | —                   | Lint, format, tests and structure checks.                                                                  |
| `.github/workflows/deploy.yml` | —                   | Generates config from secrets and deploys to Pages.                                                        |
| `.gitattributes`               | —                   | Forces LF line endings and marks media as binary.                                                          |
| `.gitignore`                   | —                   | Editor/OS noise, `node_modules/`, `.env`, generated config.                                                |

`supabase-config.js` is the only generated file; it is not real source.

---

## 3. How the layout works

The whole page is **flexbox**, mirroring the original Framer export.

### Page shell

```html
<div id="main">
  <div class="site">          <!-- flex column, full width -->
    <header class="spacer">   <!-- 48vh empty space -->
    <header class="intro">
    <main class="works">      <!-- projects, side projects, misc -->
    <section class="info">    <!-- rule + bio + lists -->
    <section class="testimonials">
    <div class="info__rule">  <!-- rule above the clock -->
    <section class="timezone"> <!-- clock, digital time/date, note + like button -->
  </div>
</div>
```

### The `.rt` ratio system

Every column inside a horizontal row is an `.rt` element. Instead of fixed
widths, the original distributes space with **fractional `flex-grow` values**,
for example:

```css
.rt--bio {
  flex: 0.35 0 0;
  width: 1px;
}
.rt--year {
  flex: 0.25 0 0;
  width: 1px;
}
.rt--meta {
  flex: 0.25 0 0;
  width: 1px;
}
```

`width: 1px` is deliberate — it collapses the flex-basis to 1 px so the grow
factor alone decides the final width. Change a fraction and the columns resize.
`.rt--*` modifiers (`--bio`, `--title`, `--body`, `--year`, `--meta`,
`--quote`, `--attribution`, `--lists`, `--note`) are defined in **section 4** of
`styles.css`.

`flex: none` is used wherever an element must keep its natural size (the clock
column, the footer brand).

### Breakpoints

Identical to the original Framer project:

| Range            | Name    | Where                       |
| ---------------- | ------- | --------------------------- |
| ≥ 1200 px        | desktop | base rules (no media query) |
| 600 – 1199.98 px | tablet  | `styles.css` section 15     |
| ≤ 599.98 px      | mobile  | `styles.css` section 16     |

Some content only exists on mobile in the original (section headings for side
projects and misc, the grey `©2027`) and is hidden/shown inside those media
queries. Aspect ratios also change per breakpoint (see section 8).

---

## 4. Page sections, one by one

### 4.1 Spacer — `header.spacer`

Empty head room above the fold. Height is **48vh** desktop / **40vh** tablet /
**32vh** mobile. It exists purely to push the intro down; it has no content.

### 4.2 Intro — `header.intro`

Two columns:

- `.intro__left` → the name `Azhar` (`.label` preset).
- `.intro__right` → `.intro__row` containing:
  - `.rt--bio` — the two-line bio (includes `香港`).
  - `.rt--year` — `©2027` in the body colour (desktop/tablet).
  - `.rt--year.rt--year-mobile` — `©2027` in grey (mobile only).

Both year blocks are in the markup; CSS decides which one is visible.

### 4.3 Works — `main.works`

A vertical stack (96 px gap) of three groups.

**Projects** (`section.projects`, 48 px gap) — three `article.project` cards:

1. 2026 — work-in-progress card ("New work is in progress…" / "In progress · Independent").
2. 2024 — Rubay Wines, with three paragraphs and a meta list
   (`1 Founder` / `Extension` / `Design`).
3. 2023 — Cathay / Expedia / Uxcel, four paragraphs and
   (`Growth` / `Strategy` / `Design`).

Card anatomy:

```html
<article class="project">
  <div class="project__inner">
    <div class="project__content">
      <div class="project__media">…poster image…</div>
      <header class="project__meta">
        <div class="project__year">2026</div>
        <div class="project__info">
          <div class="project__info-row">
            <div class="rt rt--body">…copy + links…</div>
            <div class="rt rt--meta">…meta list…</div>
          </div>
        </div>
      </header>
    </div>
  </div>
</article>
```

Media aspect ratio: **1.93333** desktop, **1.425** tablet, **0.831111** mobile.

**Side projects** (`section.side-projects`) — two `.project--side` cards. They
reuse the same card structure but put a title and media side by side in
`.project__top`, use a wider media ratio (**1.508** / **1.235** tablet) and have
an empty year cell. The “Side projects” heading is hidden on desktop.

**Misc** (`section.miscs`) — two `.misc` blocks: a cover (grey poster layer +
empty image layer), a paragraph, and a short meta list. Cover ratio
**0.876667** desktop / **0.8975** tablet.

### 4.4 Info — `section.info`

1. `.info__rule` → `.rule` → `.rule__line`: the 1 px hairline that draws itself in.
2. `.info__row`, two columns:
   - `.info__label` — `He/him`.
   - `.info__right` — an empty 85 x 95 portrait slot (`.info__avatar`, kept
     ready for the client's own photo), the biography + Socials links, then
     the long reference lists (Experiences, Recognitions, Credentials, Skills,
     Explorations, Communities, Podcasts).

The section has `scroll-margin-top: 56px` so anchor jumps clear the top edge.

### 4.5 Testimonials — `section.testimonials`

`Testimonials` label on the left; five `.testimonial` entries on the right. Each
entry is a quote (`.rt--quote`) plus an attribution (`.rt--attribution`).

### 4.6 Second rule

An identical `.info__rule` block sits after the testimonials and before the
clock. Both rules animate the same way.

### 4.7 Timezone & clock — `section.timezone`

Two columns: `.timezone__label` on the left (only `GMT+8`) and
`.timezone__right` on the right, which is a **row** flex container split 75 / 25:

1. `.timezone__inner` (75 %) is a **column** flex container holding:
   - `.timezone__clock-col` → `.clock` — 120 px analogue face with three hands
     (`.clock__hand--hour`, `--minute`, `--second`) and an accent centre pin.
     The face keeps the 120 px size but shrinks (`max-width: 100%;
aspect-ratio: 1 / 1`) on very narrow phones.
     Hands are rotated by CSS custom property `--angle`, written by `script.js`.
   - `.timezone__datetime` → digital `#clock-time` (`7:30 PM`) and `#clock-date`
     (`Nov 17, 2026`), stacked directly beneath the analogue clock.
2. `.timezone__right > .rt--note` holds two short lines of real copy
   ("Available for select projects" / "Based in Hong Kong · GMT+8"), replacing
   the original's `xxx` placeholders. Its width is **25 %** on desktop
   (x = 1194 px at 1425 px wide) and **35 %** on tablet, where it matches the
   testimonial attribution column so the note starts at the same x-position as
   `Fion Leung / Time Auction` above the rule. On mobile it stacks at the left
   edge.

Stack spacing comes from the `.timezone__inner` gap: **24 px** desktop /
**20 px** tablet / **16 px** mobile. On mobile `.timezone__right` becomes a
column again with an **8 px** gap, so the note follows the time/date closely.
The note's markup has no stray indentation text nodes (the container uses
`white-space: pre`).

### 4.8 Like button — `.like-button`

The single like button (heart + count) is the last child of the `.rt--note`
column, directly under the note copy with a 24 px top margin. It inherits the
note's left edge at every width, so it lines up on desktop, tablet and mobile.
There are **no** per-project like buttons and no separate footer element. The
heart SVG has a **2.5** stroke width. A global `button` reset plus the
`.like-button` rules in the local override block of `styles.css` keep the native
grey "box" from appearing; there are no inline `style=` attributes left in the
HTML. Keyboard focus underlines the count instead of drawing an outline box.
The number uses the same font, size, weight and OpenType features as the body
copy preset.

---

## 5. JavaScript — three behaviours

`script.js` is one IIFE in strict mode. It never renders content; all text is in
the HTML.

### 5.1 Live clock (section 1)

- Two `Intl.DateTimeFormat` instances for the visible text: `7:30 PM` and
  `Nov 17, 2026`. No `timeZone` option is passed, so each visitor sees **their
  own local time** (the `GMT+8` label is only a label, as in the original).
  Formatter construction is guarded; plain `Date` fallbacks keep the clock
  working even where `Intl` is missing or throws.
- The analogue hands read the hour/minute/second directly from the same `Date`;
  `updateHands()` converts them to degrees and sets `--angle` on each hand.
  (The old `formatToParts` round-trip was removed because a missing part could
  throw.)
- `updateClock()` runs once immediately and then every 1000 ms.
- The digital block is `role="timer" aria-live="off"`: assistive tech can read it
  on demand, but the time is not announced every second.

### 5.2 Hairline rules (section 2)

Each `.rule__line` starts at `transform: scaleX(0)` and transitions to
`scaleX(1)` (origin left) when its `.rule` parent gets `.is-visible`. Using a
transform instead of an animated `width` keeps the growth off the layout path.

The rule is **1 px thick**: `.info__rule`, `.rule` and `.rule__line` all set
`height: 1px`, matching the original page.

`script.js` toggles `.is-visible` based on the rule’s position: it is added
once the rule’s top passes **80 % of the viewport height** and removed as soon
as the rule leaves the viewport (above or below). Because the class is removed
again, the line resets to `scaleX(0)` and **draws itself in every time the
visitor scrolls back to it**, rather than only once per page load. This also
replaces an `IntersectionObserver`: a rule that is already above the viewport
(restored scroll position, anchor jump) would never intersect.

Scroll events are batched with `requestAnimationFrame` (one layout read per
frame).

### 5.3 Footer like (section 3)

- Key: `azhar-site-like` in `localStorage`, shape
  `{"liked": true, "count": 1}`. It remembers **this browser's** like; the
  count can come from Supabase instead.
- `render()` — writes the count, toggles `.is-liked`, updates `aria-pressed`
  and `aria-label` (“Like this site” / “Unlike this site”).
- `readCount()` / `adjustCount(delta)` — with `supabase-config.js` filled in,
  the count is read from the single `site_likes` row and changed through the
  `adjust_site_likes` RPC. The server response is authoritative.
- The click handler flips `.is-liked`, updates optimistically, persists the
  liked flag, then reconciles with the server. If Supabase is unreachable it
  falls back to the local count for the session; clicks are ignored while a
  request is in flight.
- All storage access is wrapped in `try/catch` so private mode or corrupt data
  cannot break the button. On a failed RPC the exact pre-click count is restored
  (an arithmetic undo is wrong when the optimistic increment was clamped at 0).
- Timers and listeners are registered, then suspended on `pagehide` and
  re-registered on `pageshow`, so browser back/forward-cache restoration keeps
  a live clock. Setup: see `SUPABASE.md`.

---

## 6. Editing guide

### Change text or links

Edit `index.html` only. Keep the surrounding classes — they drive the layout.
`&amp;` is used for `&`, `&nbsp;` keeps words together where the original did.
The original site's `xxx` placeholders were replaced with real copy; the grey
cover image is the remaining deliberate placeholder from the original design.

### Add a project

Copy one `<div class="project-row">…</div>` block inside `section.projects` and
edit the year, paragraphs, meta list and poster. Nothing in CSS or JS needs to
change — the list is laid out by the flex gap.

### Replace a poster / add media

The five media slots are plain `<img class="video" src="images/SJCvb3fap5nW9LnMleHN23RfwrA.png">`.
Replace the `src` with a new file in `images/` (keep `object-fit: cover`).
If real videos are ever wanted again, swap the `<img>` for a
`<video src="…" autoplay loop muted playsinline poster="…">`; the original
played them automatically when scrolled into view, which would need the
observer code restored.

### Change the clock

- Timezone: add `timeZone: "Asia/Hong_Kong"` to the three `Intl.DateTimeFormat`
  options in `script.js`; the label in `index.html` is separate text.
- 24-hour display: set `hour12: false` on `timeFormatter`.
- Face size/colour: `.clock` and `.clock__hand*` in `styles.css` section 13.

### Change the rule animation

`styles.css` section 10: `.rule__line` holds `transform: scaleX(0)`,
`transform-origin: left center`, `transition: transform 2s
cubic-bezier(0.65, 0, 0.35, 1)` (slow, symmetric ease-in-out, matching the
original's deliberate draw) and the
`.rule.is-visible .rule__line { transform: scaleX(1) }` end state. Change
duration or easing there; the trigger logic (80 % of the viewport, toggled so
the draw replays on every scroll) is in `script.js` section 2. Both rules -
above `He/him` and above the clock - use the same class and the same timing.

### Turn on shared likes

Follow `SUPABASE.md`: create the free project, run the SQL once, then put the
Project URL and publishable key in `.env` (locally) or repository secrets (for
deploys). `supabase-config.js` is generated by `npm run config` / the deploy
workflow — do not edit it by hand. The markup, CSS and localStorage fallback
stay the same.

### Adjust breakpoints

Media queries are at the bottom of `styles.css` (sections 15 and 16). The
page has no JS breakpoints, so editing the queries is enough.

### Design tokens

`styles.css` section 1:

| Token      | Value       | Used for                 |
| ---------- | ----------- | ------------------------ |
| `--bg`     | `#ffffff`   | page background          |
| `--label`  | `#888888`   | muted labels, clock face |
| `--copy`   | `#3d3d3d`   | body text                |
| `--accent` | `#ea644b`   | clock centre pin         |
| `--rule`   | `#d1d1d1`   | hairline rules           |
| `--font`   | Inter stack | everything               |

`html { font-size: 93.75% }` makes `1rem = 15px`, matching the original.

---

## 7. Deliberate differences from the original

These are client-approved changes; do not “fix” them back without asking.

1. **Framer badge removed** — the “Made in Framer” pill, its CSS and its two SVG
   files are gone. No reference to `framer.com` remains.
2. **Media removed** — the two project videos and two GIFs were deleted. Every
   media slot now shows the original grey poster image.
3. **Digital time/date moved** — it sits directly **below** the analogue clock
   (24/20/16 px gap) instead of the original right-hand position.
4. **One like button only** — a single heart + count directly below the note
   copy, left edges aligned. The three per-project like buttons added in the
   first client round are gone.
5. **Real note copy** — the original's three `xxx` lines were replaced with two
   lines of real text, in the last quarter of the timezone row at the same
   x-position as the original's note. The other `xxx` copy placeholders were
   likewise replaced with real project text.
6. **Empty portrait slot** — the old avatar image was removed; `.info__avatar`
   keeps an empty 85 x 95 frame for the client’s own photo.

Also kept on purpose: the **ElevenLabs “Talk to an agent”** widget — it is the
site owner’s own agent, not third-party advertising.

Because of items 3–5 the total document height is taller than the original’s
(~8990 px vs ~8934 px at 1440/1425 px wide). That is expected.

---

## 8. Local preview and deployment

### Preview

```powershell
cd C:\path\to\hongkong
python -m http.server 8123 --bind 0.0.0.0
```

Open <http://127.0.0.1:8123/index.html>. Do not open via `file://` if you need
media autoplay or network behaviour to behave exactly like production — and note
that GitHub Pages is served from `/`, so all asset paths are relative and work
either way.

### Deploy

Deployment is handled by `.github/workflows/deploy.yml`. One-time setup:
**Settings → Pages → Build and deployment → Source: GitHub Actions.**

After that, each push to `main` runs CI and then deploys generated static files.
Check the build:

```powershell
gh api repos/Azhar-Habeeb-Mohamed-S/portfolio/pages/builds/latest --jq '{status, commit}'
```

The deploy workflow reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from repository
secrets; without them `supabase-config.js` is generated empty and likes stay
local.

**Cache gotcha:** GitHub Pages and browsers cache HTML/CSS for several minutes.
When verifying a deploy, hard-reload (`Ctrl+F5`) or disable cache in DevTools,
otherwise you may review the previous build.

---

## 9. QA checklist before pushing

1. `npm run check` — ESLint, Stylelint, html-validate, Prettier and the unit
   tests (plus `node --check script.js` and `python scripts/verify.py`).
2. `python scripts/verify.py` — HTML structure, CSS braces, local asset refs,
   no inline styles and no remote stylesheet imports.
3. Check the page at **1440×900**, **768×1024** and **390×844**:
   - hero name, bio and `©2027` placement;
   - project media at the right aspect ratio;
   - rule above `He/him` and rule above the clock both animate in (instant under
     `prefers-reduced-motion`);
   - clock shows local time, hands move, date below the clock;
   - footer like toggles and persists after reload;
   - no Framer badge, no dead video/GIF requests (favicon path correct).
4. Confirm the pushed files are identical to the tested ones
   (`.gitattributes` keeps LF endings).

---

## 10. Conventions used in the code

- `index.html` — one section per page section, block-level comments; no inline
  styles; all links `target="_blank" rel="noopener"`.
- `styles.css` — 16 numbered sections, a comment above every rule group; base
  styles first, then components, then footer, then the two media queries.
  Desktop-first (mobile queries override).
- `script.js` — one IIFE, `"use strict"`, three clearly numbered sections, no
  globals, defensive `if (element)` checks, `requestAnimationFrame` batching,
  `try/catch` around `localStorage`.

If you add a component, follow the same order: markup → comment → base rule →
tablet override → mobile override.
