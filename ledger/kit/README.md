# Client Ledger build kit — 22 Sep 2026

The scripts that produced Version 3 of the Client Ledger and its stored JSON. The artifact itself is the
source of truth: `logic.json` (the registry), `flow.json` (the flow extract) and the shared database
(the pipeline). These scripts are how those files were made, so the next refresh can be run the same way.

| Script | Input | Output | Run when |
| --- | --- | --- | --- |
| `flow/extract.py` | A saved `getJiraIssue` response read with `expand=changelog` | `flow/raw/<KEY>.json`: one compacted record per issue, with every status transition and an integrity list | Once per issue read |
| `flow/compute_flow.py` | `flow/raw/*.json`, `migrate/drivers.json`, and the published page (`publish/index.html`, for the clients the Ledger names on each ticket) | `flow/flow.json`: rows, summary, rules and the six reconciliation checks | After every pull; publish the result beside the page as `flow.json` |
| `migrate/plan.py` | The pipeline documents read from the artifact's database | `migrate/out/`: schema-2 documents for a batch write pinned to version 1; `migrate/drivers.json` | Already applied on 22 Sep 2026; kept as the record of the migration |
| `registry/registry.py` | Registry v4 (`site/logic.json`) and `flow/flow.json` | `registry/logic.v5.json` | Already applied; kept as the record of v4 to v5 |
| `build2.py` | The published Version 2 page and the edited sources | The Version 3 page, plus a local QA copy | Already applied |

`flow/raw/` holds the 71 compacted changelogs of the 22 Sep sample, so `compute_flow.py` can be re-run
without touching Jira. `flow.json` itself also carries every transition of every in-scope issue.

## The full flow batch

1. List every EP Story and Bug created on or after 2026-01-01 that is not Rejected (about 1,200).
2. Read each one's changelog **with paging** (`/rest/api/3/issue/{key}/changelog`, `startAt`), because
   a single `expand=changelog` read returns only the newest 100 history entries.
3. Write one compacted record per issue in the shape `extract.py` produces.
4. Run `compute_flow.py`. **Stop if "Unmapped states" is not zero**: add the new status to the script's
   `STATUS_MAP` and to the registry rule `fl-status-map` first.
5. Publish `flow.json` beside the page. The Flow tab reads it as it is; no page rebuild is needed.

All times are UTC. Business days strip Saturdays and Sundays; public holidays are kept.
