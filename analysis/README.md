# Story analysis: customers, tiers and value drivers

Every Jira **Story** we hold for project EP, in one table, with three analysed fields: the customers the story names,
their Sales Tier, and the business value driver. Built 25 Sep 2026. Rule: `SPEC.md`. Tool: `tools/story_analysis.py`.

## Files

| File | What |
| --- | --- |
| `stories.json` | The table. `_meta` (scope, field notes) + `stories[]`, one record per story (3,328) |
| `stories.csv` | The same table flat, for a spreadsheet (lists joined with ", ") |
| `summary.json` | Cross-tabs: driver by tier group, by stage, by done year; one row per customer with story keys and driver counts |
| `SPEC.md` | How customers, tiers and drivers are decided, plus the canonical customer and tier table |
| `roadmap/` | The Story Value Roadmap artifact page (`index.html`, `data.json`, `fonts/`). `data.json` holds Done and In Progress category stories only (2,608); not-started stories are excluded from the page by owner decision |
| `raw/`, `work/` | Jira pulls and agent working files. Git-ignored: raw descriptions contain credentials |

## Scope

| Stage | Stories |
| --- | --- |
| Done (2023 to 25 Sep 2026, by done date) | 2,494 |
| In progress (In Progress, review, testing, release) | 114 |
| Not started (Ready to start backlog; Open stories created in 2026) | 720 |
| **Total** | **3,328** |

Rejected stories are excluded. Descriptions were read for 2,519 stories; the rest were judged from summary, epic and
the existing what / why / outcome text and carry lower confidence.

## Key fields

| Field | Meaning |
| --- | --- |
| `customers` | Objects `{name, tier, inLedger, sources}`. Union of Reported by, Affected clients and the customers named in the story text, as canonical ledger names. `sources`: `field`, `text` or both |
| `customersCsv` | The same names, comma separated, highest tier first |
| `tiers`, `tiersCsv`, `topTier` | Distinct Sales Tiers of the ledger customers on the story; `topTier` is the highest (1 is top) |
| `tierGroup` | `Tier 1`–`Tier 4` by `topTier`; `Named, not in ledger` (a customer is named but is not a ledger client, e.g. an Informa entity); `Platform (no customer)` |
| `valueDriver` | Exactly one of **Increase revenue**, **Protect churn**, **Reduce cost**, **Avoid cost**, judged from the description |
| `secondaryDriver` | A second driver when clearly material, else null |
| `driverRationale`, `driverConfidence` | One-sentence reason; High (text states the reason), Medium (inferred), Low (summary only) |
| `customerEvidence` | Short quote showing where the story names each customer |
| `possibleCustomers` | Names a text scan found but the analyst did not confirm (example data, text beyond the reading cut). Not counted |
| `stage`, `status`, `doneDate`, `doneYear`, `doneQuarter`, `team`, `epic`, `productArea` | Jira facts; `productArea` only for stories on the ledger page |

## Headline

| Tier group | Stories | Increase revenue | Protect churn | Reduce cost | Avoid cost |
| --- | --- | --- | --- | --- | --- |
| Tier 1 | 536 | 70 | 431 | 5 | 30 |
| Tier 2 | 57 | 1 | 52 | 1 | 3 |
| Tier 3 | 11 | 0 | 11 | 0 | 0 |
| Tier 4 | 13 | 10 | 3 | 0 | 0 |
| Named, not in ledger | 72 | 3 | 62 | 0 | 7 |
| Platform (no customer) | 2,639 | 126 | 1,080 | 222 | 1,211 |
| **All** | **3,328** | **210** | **1,639** | **228** | **1,251** |

## How it was made

1. `prep` joins every local source (full records 2023–25, enriched descriptions, 2026 descriptions and Confluence
   summaries, story cache, roadmap pulls) and a fresh Jira pull of the 834 unfinished stories (description, Reported
   by, Affected clients, value fields). It cleans each description (secrets redacted, cut at 2,000 chars),
   pre-scans for client names and writes 84 chunks of 40.
2. Parallel analyst agents read every story and wrote customers named, driver, secondary, rationale and confidence
   to `work/out/`.
3. `merge` resolves names to the ledger (client map plus verified event aliases: ShopTalk → Hyve, MRO Europe →
   Informa North America, Agritechnica / EuroTier → DLG), adds the Jira client fields, derives tiers and writes
   the outputs. A bare "Informa" never takes a tier (runbook rule). `check` gates the result.

Rebuild: `python3 tools/story_analysis.py prep && … agents … && python3 tools/story_analysis.py merge && python3 tools/story_analysis.py check`.

## Known limits

- Tiers are the ledger's current Sales Tier (`data/ledger.json`), not the tier at the time of the work.
- Customer names in descriptions beyond the 2,000-character reading cut are listed in `possibleCustomers`, not in `customers`.
- Judgement calls held consistently: sponsorship, ticketing, payment and paid add-ons are Increase revenue; migrating
  existing V2 API endpoints, tests and refactors are Avoid cost; new modules built under a client contract (Hyve
  Meeting Program core build) are Increase revenue, their admin refinements Protect churn.
