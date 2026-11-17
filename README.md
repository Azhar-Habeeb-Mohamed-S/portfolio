# Azhar — Portfolio (Hong Kong Client Project)

A pixel-accurate recreation of <https://powerful-herring-025226.framer.app/>
built as plain HTML, CSS and JavaScript. No framework, no build step.

Live: **<https://mithun-srinivasan.github.io/hong-kong-client-project/>**

## Stack

| File | Purpose |
| --- | --- |
| `index.html` | Semantic markup; every section is commented. |
| `styles.css` | Hand-written CSS in 15 numbered sections, matching the original Framer values and breakpoints. |
| `fonts.css` | 42 local `Inter` `@font-face` subsets (no external font requests). |
| `script.js` | Live clock, scroll-triggered hairline rules, footer like button. |
| `fonts/` | 42 `.woff2` subsets. |
| `images/` | Avatar, favicons and the grey poster used for project media. |

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
* **Hairline rules** — the separators above `He/him` and above the clock draw
  themselves in from 0 → 100% width when scrolled into view. The reveal is
  scroll-based so it also works after instant jumps or a restored scroll
  position.
* **Footer like button** — a single heart + counter at the bottom left
  (`V7` brand at the right), persisted per browser in `localStorage`.
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
* `xxx` blocks are the original's own placeholders (kept as content).
