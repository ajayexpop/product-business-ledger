# What / Why / Outcome spec (v1, 27 Sep 2026)

Every feature on the three Product Journey pages carries **What / Why / Outcome**: what we built, why it was needed,
and how it helps event organisers, exhibitors, sponsors, speakers or attendees. Customers read this copy, so every
word must be supported by the source stories. **Wrong information is worse than less information.**

## Input (`data/roadmap/wwo/input/<group>.json`, git-ignored: descriptions may hold pasted credentials)

One row per page item: `id, theme, q, title, benefit, detail` (highlights) or `id, kind, title, benefit` (coming next,
DLG items), plus `stories`: every source Story with `summary` and whatever text exists: `wwo_a` / `wwo_b` / `confluence`
(earlier what/why/outcome summaries written from the description), `ai` (summary, problem, why, outcome), `desc`
(description, links and secrets stripped, first 1,500 characters), `whoFor` and `value` (Jira fields filled by the
product team), `jiraStatus` (in-development items only).

## Output (`data/roadmap/wwo/<group>_w/wwo.json`, a JSON array, one object per input row, same order)

```json
{"id": "reg-language-preference",
 "what": "…", "why": "…", "outcome": "…",
 "who": ["Organisers", "Attendees"],
 "basis": "stated" | "implied",
 "evidence": "EP-7417: description says emails went out in the event language only"}
```

- **what** (≤ 240 chars): what we built, concretely. For highlights, condense `detail` (already verified); for other
  items, write it from the stories. Present tense for shipped ("Registration forms have…"), "will" for in development.
- **why** (≤ 220 chars): the problem or need it answers, for the people who use the platform. Take it from a stated
  problem or reason (`why`, `problem`, `whoFor`, `value`, description). If no source states one, write only the need
  that the capability itself plainly answers (a filter answers "finding X in a long list was slow") and set
  `basis: "implied"`. Never claim a past failure, complaint, request or pain the sources do not mention.
- **outcome** (≤ 220 chars): how it helps them day to day: what they can now do, save or avoid. No numbers,
  percentages, revenue, "increases engagement by", or results the stories do not show. No superlatives.
- **who**: 1–3 of `Organisers`, `Exhibitors`, `Sponsors`, `Attendees`, `Speakers`, `Registrants`, `App users`,
  in order of who benefits most, from the stories.
- **evidence**: internal only (never published): the key(s) and the source line that supports `why`.

## Rules

- Never on the customer pages: client or event names (except DLG and its events on DLG items), people, team names,
  Jira keys, internal code names, effort, counts. Partners may be named (ExpoFP, Klipso, Map Your Show, Aditus…).
- British English. Plain, direct sentences. No em dashes, no "not X but Y", no marketing words (seamless, powerful,
  revolutionary, game-changing, effortless, cutting-edge).
- Do not repeat `benefit` word for word: benefit is the one-line card text; what/why/outcome are the detail.
- In-development items: describe only the scope in the stories; say nothing about dates.

## Verification

A second, independent reader checks every row against the stories and marks `ok` / `fix` with the reason; fixes are
applied before the build. `tools/roadmap.py check` gates presence, lengths and banned words.
