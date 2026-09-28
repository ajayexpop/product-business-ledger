# Roadmap highlight spec (v1, 25 Sep 2026)

Turns one theme's included stories into customer-facing **highlights** placed on a quarter timeline (2023-Q1 → 2026).
Every highlight is backed by its source stories; every included story ends up in exactly one highlight.

## Input (`data/roadmap/hl/input-<theme>.json`)

One row per included story: `k, q (e.g. "2024-Q3", the quarter it was done), feature (tagger's name), tags, summary,
epic, text`. Rows are sorted by feature. Tagger feature names came from 8 parallel batches, so near-duplicates exist
("Speed networking" / "Speed networking MVP") — normalise them.

## Output (`data/roadmap/hl/<theme>_w/highlights.json`, a JSON array)

```json
{"id": "formats-speed-networking-launch", "theme": "formats", "q": "2024-Q2",
 "title": "Speed networking",
 "benefit": "Run timed, table-based networking rounds where attendees are matched automatically and see who to meet next.",
 "detail": "Organisers set up rounds, tables and timings; the platform proposes matches, notifies participants, shows a live timeline and lets organisers adjust meetings by hand.",
 "level": "headline" | "standard",
 "tags": ["AI", "Mobile"],
 "stories": ["EP-26000", "EP-26001"]}
```

- **Grouping.** A highlight is one capability delivered in one wave. When a capability is built across several
  quarters, make a highlight for each distinct wave customers would notice (launch, then a significant expansion,
  e.g. "Speed networking" 2024-Q2 → "Opt-in speed networking" 2024-Q3), and put its `q` at the quarter where that wave's
  work finished (the latest `q` of the wave's main stories). Fold small follow-up tweaks into the nearest wave rather
  than making tiny highlights. Small unrelated improvements in the same quarter and area may be combined into one
  "…improvements" highlight (e.g. "Meeting scheduling improvements") that names the concrete changes in `detail`.
- **level** — `headline` for launches or major upgrades a customer would care about most (roughly 1 in 4 highlights,
  at most 2 per quarter for this theme); otherwise `standard`.
- **title** — 2–6 words, sentence case, customer language. **benefit** — one sentence, ≤ 160 chars, what customers
  can now do. **detail** — 1–3 sentences, ≤ 400 chars, concrete capabilities, drawn only from the stories' summary and
  text. Don't invent results, numbers, dates or behaviour the stories don't support. No marketing superlatives.
- **Never** on the page: client or event names (IMEX, DWTC, Hyve, Informa, Vinexposium, FBF, GES, Gulfood, InfoSalons…),
  people, team names, Jira keys, internal code names or ticket prefixes, effort or counts. Integration partners may be
  named (ExpoFP, Klipso, Map Your Show, Reach5, Aditus, Crowd Connected, InVisual, PayPal…). British English.
- **stories** — every input key appears in exactly one highlight of your theme.
- `tags` — union of the stories' tags that genuinely characterise the highlight.

Verify with Python at the end: every input key used exactly once, all fields present, lengths within limits, no key
or client name in title/benefit/detail.
