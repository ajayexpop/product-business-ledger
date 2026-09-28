# Story cache — pull and enrichment spec (v1, 24 Sep 2026)

This is the documented generator for the story feed (runbook Source 3, "the generator … is not documented anywhere").
Every story in scope has one JSON record in the cache. Later runs pull only the delta: stories whose Jira
`updated` is newer than the record's `updated`, plus stories new to the scope.

## Scope

`project = EP AND issuetype = Story AND created >= "2026-01-01" AND status != Rejected` (1,192 on 24 Sep 2026).
The Atlassian cloudId is `5b73f5ec-0b08-4542-9edd-183c0c37bf0c`.

## Record (one per story)

```json
{
  "k": "EP-47792",
  "link": "https://expoplatform.atlassian.net/browse/EP-47792",
  "summary": "Jira summary, verbatim",
  "status": "Done", "statusCategory": "done",
  "priority": "Medium",
  "created": "2026-01-07T10:12:00.000+0000",
  "updated": "2026-09-15T17:47:02.931+0100",
  "resolved": "2026-02-03T…" | null,
  "team": "Visitor team" | null,                 // customfield_10001.name
  "labels": ["IMEX"],
  "reportedBy": ["IMEX"],                         // customfield_10145[].value, [] if empty
  "epic": {"k": "EP-54526", "summary": "…", "status": "In Progress", "statusCategory": "indeterminate"} | null,   // fields.parent when its issuetype is Epic
  "parent": null | {"k": "…", "type": "…"},       // only if the parent is NOT an epic
  "descChars": 1834,                              // length of the markdown description, 0 if empty
  "ai": { "s": "…", "pr": "…", "wy": "…", "oc": "…", "lens": "EXP", "pa": "…", "cf": "Medium",
          "rg": "Grow", "bv": "Medium", "im": ["Retention"] } | null,
  "aiSource": "generated" | "inherited",
  "pulledAt": "2026-09-24T…Z"
}
```

Fields to request from Jira: `summary, status, priority, created, updated, resolutiondate, customfield_10001,
labels, customfield_10145, parent, issuetype` and, only for stories that need enrichment, `description`
(`responseContentFormat: "markdown"`).

## Enrichment (`ai`) — only for stories NOT in `existing_keys.json`

Stories in `existing_keys.json` (the 650 inherited from the Delivery Timeline) keep their inherited AI text:
write `"ai": null, "aiSource": "inherited"` and do not fetch their description.

For every other story, read the summary, description, epic name, labels and team, and write:

| Field | What | Length / vocabulary |
| --- | --- | --- |
| `s` | What was delivered, as one plain sentence starting from the user-visible change and the benefit. Present/past tense, no marketing | ~140 chars (median of the inherited set) |
| `pr` | The problem: what was wrong or missing before | ~170 chars |
| `wy` | Why it was done: the business or client reason (a client commitment, product vision, compliance, cost …) | ~120 chars |
| `oc` | The outcome: what now exists or changed, concretely | ~150 chars |
| `lens` | Exactly one of `vocab.json` → `lens` (the key only, e.g. `INTEG`) | |
| `pa` | Product area, one of `vocab.json` → `pa`; `Not Clearly Specified` when the ticket does not say | |
| `rg` | Run / Grow / Transform (or `Organization`, `Not Clearly Specified`) | |
| `bv` | Business value High / Medium / Low | |
| `im` | 0–3 impact tags from `vocab.json` → `im` | |
| `cf` | Your confidence in the text: `High` when the description states problem and outcome; `Medium` when you inferred part of it; `Low` when the description is empty or near-empty and you worked from the summary alone | |

Rules: never invent a client, a number or a result the ticket does not support. If the description is empty,
write from the summary and epic only and set `cf: "Low"`. British English, as in `examples.json`.
Match the voice of `examples.json`.

## Output files

Write records as a JSON array per page of results: `data/stories/pull/<batch>/page-NN.json`.
Write each page as soon as it is done (resumable: on restart, skip keys already present in that folder).
When the batch is finished, write `data/stories/pull/<batch>/_done.json`:
`{"batch": "…", "jql": "…", "expected": N, "written": N, "generated": N, "inherited": N, "noDescription": N, "missing": [], "finishedAt": "…"}`.
