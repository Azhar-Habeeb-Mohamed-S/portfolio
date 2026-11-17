# Azhar — Portfolio (Hong Kong Client Project)

A pixel-accurate recreation of <https://powerful-herring-025226.framer.app/>
built as plain HTML, CSS and JavaScript. No framework, no build step.

Live: **<https://azhar-habeeb-mohamed-s.github.io/portfolio/>**

## Stack

| File | Purpose |
| --- | --- |
| `index.html` | Semantic markup; every section is commented. |
| `styles.css` | Hand-written CSS in 16 numbered sections, matching the original Framer values and breakpoints. |
| `fonts.css` | 42 local `Inter` `@font-face` subsets (no external font requests). |
| `script.js` | Live clock, scroll-triggered hairline rules, footer like button. |
| `supabase-config.js` | Blank URL/anon key for the optional shared like counter. |
| `SUPABASE.md` | First-time Supabase setup guide + SQL. |
| `HANDOVER.md` | Full architecture and editing guide. |
| `fonts/` | 42 `.woff2` subsets. |
| `images/` | Favicons and the grey poster used for project media. |

## Run locally

Opening `index.html` directly works. For a closer test:

```bash
python -m http.server 8123 --bind 0.0.0.0
# http://127.0.0.1:8123/index.html
```

## Behaviour

* **Live clock** — digital time/date plus the analogue hands, in the visitor's
  own timezone (`GMT+8` is only a label). The digital block sits directly under
  the analogue clock.
* **Hairline rules** — the 1 px separators above `He/him` and above the clock draw
  themselves in from left to right (`scaleX(0) → scaleX(1)`, 2 s ease-in-out)
  when they reach 80% of the viewport height. The class is toggled as the rule
  enters and leaves the viewport, so the line **redraws every time** you scroll
  back to it.
* **Like button** — a single heart + counter sitting directly under the
  `xxx xxx` note, left edges aligned. Your own like is remembered per browser
  in `localStorage`; fill in
  `supabase-config.js` (see `SUPABASE.md`) to share the count with everyone.
* **Media** — all videos/GIFs were removed at the client's request; project
  cards show the original grey poster image instead.

## Breakpoints (same as the original)

| Range | Layout |
| --- | --- |
| ≥ 1200 px | desktop |
| 600 – 1199.98 px | tablet |
| ≤ 599.98 px | mobile |

`1rem` is pinned to 15 px (`html { font-size: 93.75% }`) and the same
fractional flex values as the original are used, so the column distribution
matches the Framer source.

## Notes

* The "Made in Framer" badge was removed on request; no Framer branding remains.
* The ElevenLabs "Talk to an agent" widget is part of the original page and is
  kept.
* `xxx` blocks are the original's own placeholders (kept as content). The
  timezone note holds exactly two, on the right side of the clock row.
* The portrait slot above the bio is intentionally empty — the client will add
  their own photo there.
