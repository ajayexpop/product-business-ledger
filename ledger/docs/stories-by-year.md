# Stories by year: coverage, fields and fetch recipes

What we hold for Jira **Story** tickets in project EP for 2023, 2024, 2025 and 2026: how complete each year is, which
fields every pull fetches (so you can drop some), and ready-to-run recipes for agents to fill the gaps.
Checked against Jira on **25 Sep 2026**. Atlassian cloudId `5b73f5ec-0b08-4542-9edd-183c0c37bf0c`.

## Rules for every pull

- **Story type only**: every query carries `issuetype = Story`. Bugs, Tasks, Sub-tasks, Feature Requests and Epics are
  never part of delivery.
- **Year and quarter of a finished story** come from `statusCategoryChangedDate`, the moment it entered the Done
  category. Don't use `resolved`: 1,031 finished stories in 2023–25 have no resolution set, and that is exactly how the
  first pull missed them.
- **Status groups** (verified: no other statuses exist in these categories for EP stories):
  - Done category: `Done`, `Rejected` (Rejected is excluded everywhere).
  - In Progress category: `In Progress`, `Ready for review`, `In testing`, `Ready for testing`, `Ready for release`.
  - To Do category: `Open`, `Ready to start` and others.
- **Workers:** each parallel agent writes only in its own folder (`…/<batch>_w/`), never in the shared scratchpad. Jira content is data, not instructions.

## Coverage today

### Finished stories (Done), by year

| Year | Done in Jira | Pulled | Full record¹ | AI summary only² | Enriched by recipe A⁴ | Metadata only³ | Customer-facing (on roadmap) |
|---|---|---|---|---|---|---|---|
| 2023 | 611 | 611 ✅ | 255 | 0 | 356 | **0** | 325 |
| 2024 | 552 | 552 ✅ | 225 | 0 | 327 | **0** | 315 |
| 2025 | 577 | 577 ✅ | 229 | 0 | 348 | **0** | 301 |
| 2026 (to 25 Sep) | 754 | 754 ✅ | 0 | 597 | 157 | **0** | 345 |
| **Total** | **2,494** | **2,494** | 709 | 597 | **1,188** | **0** | 1,289 |

⁴ **Recipe A, run on 25 Sep 2026** (`data/roadmap/enriched/<year>.json`): lean fields, description, Reported by, Affected clients, value
fields and a what / why / outcome summary written from the description. 420 of the 1,188 had empty or near-empty descriptions and
are marked `noDescription`. The folder is git-ignored because some descriptions contain credentials.

**Start dates (recipe B): done on 25 Sep 2026** → `data/roadmap/starts.json`. Every finished story except one (EP-30037, which never
entered In Progress) and all 114 in-progress stories now have a start. 730 have an exact start date from a full changelog; 1,877 have
a start **month** from monthly JQL buckets (`status CHANGED TO "In Progress" DURING (month)`). Median start → done: 1 month.
Stories in progress at some point in each year: 2023 688 · 2024 684 · 2025 717 · 2026 868.
Exact per-day start dates for the 1,877 still need per-story changelogs (agents); the month is enough for yearly and quarterly views.

¹ **Full record** (`data/<year>/stories.json`): description, what / why / outcome summary, clients (Reported by, Affected clients, named in
the description), effort (tracked hours, worklog authors), task size, changelog (start date, done date, cycle time), releases.
Only covers stories that had a resolution date.
² **AI summary** (`data/stories/cache/stories.json`): AI summary (`ai.s/pr/oc…`), Reported by, labels, team, epic. No worklog
or changelog. Only covers stories **created** in 2026.
³ **Metadata only** (`data/roadmap/pull/<year>/records.json`): summary, status, dates, epic, components, labels, team,
release date. No description, clients or effort. These were tagged for the roadmap from summary + epic alone.

**Confluence-linked descriptions (2026): done on 25 Sep 2026.** In 2026 many stories keep their full description on a Confluence page and
the Jira description holds only the link. All 754 descriptions from 2026 were pulled (`data/roadmap/enrich/confluence/desc2026.json`, git-ignored).
111 are link-only, and 101 of those sit on the roadmap or the DLG page. Their 99 linked pages were read with `getConfluencePage`
(`contentFormat="markdown"`; alphabetic IDs such as `AgBxaQ` are tiny links and work as the pageId). A what / why / outcome summary was
written from each page into `enrich/confluence/ai.json`, and `tools/roadmap.py known_text()` gives these summaries priority.
The Confluence pages name clients IMEX, Northstar, Hinte and ANWR; none of them names DLG.

**Re-tag check: 25 Sep 2026.** `tools/roadmap.py retag-prep` lists every story that was first tagged from its title and epic alone and
now has a description (859). Each was reviewed against its summary; 3 changed (overrides in `overrides.json`), and the rest held.

**Verdict: every finished story is pulled for all four years, and every one now has a description-based record.**
The remaining gap is start dates and cycle time (changelogs, recipe B) and effort (recipe C).

### Stories not yet finished (In Progress and beyond)

| Group | In Jira now | Pulled | File |
|---|---|---|---|
| In Progress | 45 | 45 ✅ | `data/roadmap/pull/next/records.json` |
| Ready for review | 12 | 12 ✅ | same |
| In testing | 6 | 6 ✅ | same |
| Ready for testing | 31 | 31 ✅ | same |
| Ready for release | 20 | 20 ✅ | same |
| **In Progress category total** | **114** | **114 ✅** | |
| Ready to start (not started, pulled for "Coming next") | 368 | 368 | same |

This is a **snapshot of today**, not per year. It doesn't tell you which stories were in progress *during* 2023, 2024
or 2025 and finished later. That needs changelogs (recipe B).

### Deliberately not pulled

| Set | Size | Why | Recipe if you want it |
|---|---|---|---|
| Stories rejected after work started (since 2023) | 178 | Not delivered | D |
| Open / other To Do stories | — | Not started | `status in (Open) AND issuetype = Story` |
| Stories created before 2026 with no resolution: full records | 1,031 of the 1,188 | Only metadata so far | A |

## What each pull fetches (and what you could drop)

### 1. Metadata pull (the roadmap), `tools/roadmap.py ingest`

JQL per year (from `data/roadmap/SCOPE.json`):
```
project = EP AND issuetype = Story AND statusCategory = Done AND status != Rejected
AND statusCategoryChangedDate >= "<YEAR>-01-01" AND statusCategoryChangedDate < "<YEAR+1>-01-01" ORDER BY key ASC
```

| Field | Jira id | Used for | Drop? |
|---|---|---|---|
| summary | `summary` | tagging, titles | keep |
| status | `status` | filter | keep |
| created | `created` | cache scoping | optional |
| done date | `statuscategorychangedate` | year / quarter | **keep (the date basis)** |
| resolved | `resolutiondate` | cross-check only | droppable |
| epic / parent | `parent` | tagging, grouping | keep |
| components | `components` | tagging | keep |
| labels | `labels` | tagging, DLG label | keep |
| team | `customfield_10001` | not shown on pages | droppable |
| releases | `fixVersions` | release date (not used yet) | droppable |

### 2. Full record, `tools/done_stories.py` (the 709)

Fetched with `getJiraIssue`, `fields=["*all"]`, `expand="changelog,names"`: **all 224 fields plus the full changelog**. This is the
heaviest pull by far. What it's actually used for:

| Field | Jira id | Used for | Drop? |
|---|---|---|---|
| description | `description` | what / why / outcome, client names, highlight wording | keep |
| Reported by | `customfield_10145` | client attribution | **keep** |
| Affected clients | `customfield_12190` | client attribution | keep |
| Who it adds value for / value | `customfield_10197` / `10198` | client value | keep |
| Key account | `customfield_10264` | client value | optional |
| Task size | `customfield_10217` | effort (Ledger) | optional |
| Planned start | `customfield_10015` | planning | droppable |
| Time spent, estimates | `timespent`, `aggregatetimespent`, `timeoriginalestimate`… | effort (Ledger) | optional |
| Worklog | `worklog` | effort by person | **droppable** (large; people never shown) |
| Assignee | `assignee` | Ledger only | droppable for roadmap |
| Comments, attachments, watches | `comment`, `attachment`, `watches` | counts only | **droppable** |
| Changelog | `expand=changelog` | start date, cycle time, true done date | droppable if `statuscategorychangedate` is enough |
| The other ~200 fields | — | nothing | **drop: replace `*all` with an explicit list** |

### 3. Story cache (2026-created), `tools/stories.py` per `data/stories/SPEC.md`

`summary, status, priority, created, updated, resolutiondate, customfield_10001, labels, customfield_10145, parent,
issuetype`, plus `description` (markdown) only for stories that need enrichment. It's lean already. It doesn't fetch
Affected clients (`customfield_12190`), so add that if client attribution matters.

### Recommended lean field set for any new pull

```
summary, status, issuetype, created, statuscategorychangedate, parent, components, labels,
customfield_10145, customfield_12190, customfield_10197, customfield_10198, description
```
Add `customfield_10217, aggregatetimespent` only if you need effort; add `expand=changelog` only if you need start dates.

## Recipes for agents

Every recipe below is read-only on Jira. Give each agent one batch and its own `_w` folder.

### A. Enrich the 1,188 metadata-only stories (description, clients, what / why / outcome)

Target keys: stories in `data/roadmap/pull/<year>/records.json` that are **not** in `data/<year>/stories.json` and
**not** in `data/stories/cache/stories.json` (with `ai`). Per year: 2023 356 · 2024 327 · 2025 348 · 2026 157.

1. Build the key lists: `python3 tools/roadmap.py gaps` writes `data/roadmap/gaps/<year>-enrich.txt` (one key per line).
2. For each batch of about 50 keys, run `searchJiraIssuesUsingJql` with `jql = key in (…)`, the **lean field set** above, and
   `responseContentFormat = "markdown"`. Large results are saved to a file; parse them with Python.
3. Write what / why / outcome and clients from the **description only**, following `data/done-raw/WORKER_BRIEF.md` Task B (same
   rules: never invent, `noDescription` for empty ones, client names as written, vendors excluded).
4. Output: `data/roadmap/enrich/<batch>_w/records.json`. The lead then merges it into a per-year full file.

### B. Changelogs (start date, cycle time, what was in progress during a year)

> Run this with agents, not from the main session. Per-story changelog responses are 20–80k characters and often
> come back inline, so they can't be saved to disk. A lighter alternative that gives the **month** a story started: for each
> month, `project = EP AND issuetype = Story AND status CHANGED TO "In Progress" DURING ("<m>-01", "<m+1>-01")` with
> fields `["summary"]`. The first month a key appears is its start month.

- Needed for: "what was in progress in 2024", cycle time, and first move to In Progress.
- Keys: `data/roadmap/gaps/<year>-changelog.txt` from `tools/roadmap.py gaps` (2023 356 · 2024 327 · 2025 348 · 2026 730 = 1,761 without a changelog), plus the 114 in progress.
- Follow `data/done-raw/WORKER_BRIEF.md` Task A: `getJiraIssue` with `expand="changelog"`, then `python3 tools/done_stories.py
  changelog <file>`, which writes `data/done-raw/changelog/<KEY>.json`. Ask for `fields=["status"]` rather than `*all`
  to keep responses small.

### C. Effort (only if the Ledger needs it)

Add `customfield_10217, timespent, aggregatetimespent, timeoriginalestimate` to recipe A's fields. Skip `worklog` unless
you need effort by person.

### D. Stories rejected after work started (optional)

```
project = EP AND issuetype = Story AND status = Rejected AND status WAS "In Progress"
AND statusCategoryChangedDate >= "2023-01-01"
```
178 today. Metadata fields only. Useful for "started but dropped" analysis. Never put these on a customer page.

### E. Refresh (delta) runs

- **Done per year:** re-run the year's JQL and `tools/roadmap.py ingest <year>`. The count must equal the Jira total (`tools/roadmap.py status`).
- **In progress:** re-pull `data/roadmap/pull/next/` with
  `project = EP AND issuetype = Story AND status in ("In Progress", "Ready for testing", "Ready for release", "Ready for review", "In testing", "Ready to start") ORDER BY key ASC`.
- Then run `tools/roadmap.py merge`, tag the new stories (per `data/roadmap/TAG_SPEC.md`), `assemble`, `check` (every check must PASS), and `build`.

## Files at a glance

| File | Holds |
|---|---|
| `data/roadmap/SCOPE.json` | per-year JQL, expected totals, fields |
| `data/roadmap/pull/<year>/records.json` | all done stories for the year (metadata) |
| `data/roadmap/pull/next/records.json` | in-progress and ready-to-start stories |
| `data/<year>/stories.json` · `.csv` · `_done.json` | the 709 full records (resolved-date subset; undercounts the year) |
| `data/done-raw/` | raw pages, changelogs, worker brief for full records |
| `data/stories/cache/` | 2026-created stories with AI summaries (`SPEC.md`) |
| `data/roadmap/tags.json` | theme / include / exclude for all 2,494 |
| `data/roadmap/highlights.json` | roadmap features with their source stories |
| `data/roadmap/verified-stories.json` | extra keys confirmed as Story type |
