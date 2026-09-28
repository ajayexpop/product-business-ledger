# Requests DB: spec (v1, 26 Sep 2026)

One database of product demand, built to be themed later by tier, region, product area and more.
It holds facts only: nothing here is classified or themed yet. The theming fields exist on every
record and are empty (`theme`, `region`, `tierFocus`, `productArea`, `valueDriver`).

Build: `python3 tools/requests.py build`, then `python3 tools/requests.py check` (every gate must PASS).
Raw pulls in `raw/` are never edited; everything in `db/` is regenerated from them.

## Scope

| Source | Query | Pulled 26 Sep 2026 |
| --- | --- | --- |
| `jira_fr` | `project = EP AND issuetype = "Feature Request" AND status != Rejected` (every other status) | 822 (Incoming request 404, Ready to spec 238, Triage 180) |
| `jira_story_open` | `project = EP AND issuetype = Story AND status = Open` | 839 |
| `fis` | Confluence space FIS (Feature Intake Staging), every page: `space = FIS AND type = page` | 132 pages |

Out of scope: bugs and defects (any type), Rejected feature requests, stories in any status other than Open,
and FIS pages whose Decision Log records a rejection. Susan's German-customer sheet is a bug analysis, so none
of its rows are imported; it is the reference for how the theming step should present customers
(one column per customer, grouped areas).

FIS pages are all kept as records, but `excluded: true` takes them out of scope for theming:
space furniture (`pageKind: other`: overview, glossary, instructions, analyses, spikes), the `[TEMPLATE]` page,
and unnumbered drafts (`REQ-YYYY-NNN`) that have a numbered page with the same title. Clones
(`[REQ-…-cloned]`) and unnumbered drafts without a numbered twin stay in scope: they can carry a different
customer. Reused REQ ids (two different pages both numbered 091 and so on) are kept apart by `id = FIS-<pageId>`,
and `reqIdShared` lists the other pages that share the number.

## Files

| Path | What |
| --- | --- |
| `raw/jira_fr/page-NN.json`, `raw/jira_open_stories/page-NN.json` | JQL pages, 100 issues each, `ORDER BY key ASC`, markdown bodies, verbatim tool output |
| `raw/jira_comments/<KEY>.json` | Full comment threads for the 6 issues where search returned only 20 of the comments |
| `raw/fis_list.json` | The CQL listing of all FIS pages |
| `raw/fis_pages/<pageId>.json` | Each page in ADF (verbatim `getConfluencePage` output); `<pageId>.comments.json` its footer comments |
| `save_page.py` | Copies one saved JQL tool-result into `raw/<dir>/page-NN.json` and prints the next-page cursor |
| `raw/field_names.json`, `raw/meta_*.txt` | Custom-field id → name for Feature Request and Story |
| `db/items.json` | **The database**: one record per item, all three sources |
| `db/items.csv` | Flat view for Sheets and Excel (long text cut at 1,500 to 3,000 characters; full text is in items.json) |
| `db/comments.csv` | One row per comment: item id, author, date, body |
| `db/links.json` | Edges: story → epic (`parent`), Jira issue links (relation as Jira names it), FIS → EP keys it mentions (`mentions`, or `similar` when listed under Similar Requests), FIS ↔ FIS (`same REQ id`) |
| `db/customers.json` | Every customer token seen, its ledger client and Sales Tier where it is one, sources, item ids. `region` is empty |
| `db/summary.json` | Counts by source, status, team, component, request type, FIS classification and product area |

## Record

Shared by every source: `id`, `source`, `key`, `link`, `title`, `status`, `created`, `updated`, `comments`
(`id`, `author`, `created`, `body`), `commentCount`, `customers`, `priorAnalysis`, and the five empty theming fields.

**Jira** (`jira_fr`, `jira_story_open`): `issueType`, `statusCategory`, `priority`, `resolved`,
`statusCategoryChanged`, `team`, `components`, `labels`, `jiraProductArea` (Product Area cascading field),
`pillars`, `rgto` (RGT+O), `requestType`, `workClass`, `taskSize`, `blockedReason`, `keyAccount`, `sprints`,
`startDate`, `dueDate`, `fixVersions`, `storyPoints`, `epic` (`key`, `summary`, `status`, `type`), `reporter`,
`creator`, `assignee`, `contactPersons`, `reportedBy`, `affectedClients`, `pipedriveIds`, `description`, `votes`,
`watchers`, `attachments` (name, type, date), `links` (`key`, `relation`, `linkType`, `summary`, `status`, `issuetype`).
Feature requests also carry `request`, the intake form:
`whoFor`, `value`, `differsFromToday`, `userJourneyImpact`, `userStory`, `adminInterface`, `frontendInterface`,
`appInterface`, `suggestion`, `api`, `statistic`, `acceptanceCriteria` (template placeholders such as `1 ... 2 ...`
become null). `fis` lists the FIS pages that mention the request.

**FIS**: `pageId`, `pageKind` (`request`, `clone`, `draft-unnumbered`, `template`, `other`), `excluded`,
`excludedReason`, `author`, `createdBy`, `fisProductArea`, `eventsImpacted`, `problemStatement`, `evidencePack`,
`aiAnalysed`, `scores` (`frequency`, `businessImpact`, `urgency`, `sponsorMultiplier`, `totalOpportunity`,
`glossaryCompliance`, `problemClarity`, `evidenceQuality`), `scoresParsed`, `percentileRank`, `estimatedEffort`,
`recommendedClassification` (NOW / NEXT / LATER / TBD), `decisionLog`, `decisionStatus`, `epKeysMentioned`,
`similarEpKeys`, `reqIdShared`, `sameTitleAs`, and `body` (the whole page as text, tables as `| a | b |` rows).
The pages follow the template loosely (`## x`, `h2. x` and bare `2️⃣ x` headings all occur), so every field
is parsed from the text and `body` stays the source of truth. Pages whose metadata says "Not yet analyzed"
have `aiAnalysed: false` and null scores. That means nobody scored them; no values are missing from the pull.

## Customers

`customers[]` on each Jira record: one entry per token, with `source` (`Reported by`, `Affected clients`,
`Pipedrive Company ID`), `client` (the ledger company, or null), `basis` (`exact`, `alias`, `pipedrive`,
`internal`, `none`) and `tier` (ledger Sales Tier). Tokens resolve through `data/done-raw/client_map.json`
(the map the story analysis uses) plus the ledger's own names and delivery tags; Pipedrive ids join on the
ledger's `pd`. The ledger holds 49 companies, so a token that is not one of them has `client: null`,
`tier: null`. That makes it a non-ledger customer; it is not an error. `INTERNAL` is a Reported-by value
meaning raised internally. Customer names on FIS pages are free text (the Evidence Pack, Events Impacted) and are
left for the theming step. `priorAnalysis` copies customers, tiers, value driver and product area from
`analysis/stories.json` for the 347 Open stories it already covered.

## Theming phase (next)

Fill the reserved fields, never the facts: `region` (customer country from Planhat), `tierFocus` (from the
customer tiers, widened beyond the ledger's 49), `productArea` (the product-area SPEC v2 in
`data/stories/pa/SPEC.md`), `valueDriver` (the four drivers in `analysis/SPEC.md`), `theme` (clusters across all
three sources, using `links.json` so a FIS page and its EP request count once).

## Refresh

Re-run the three pulls into fresh `raw/` pages (same JQL, `ORDER BY key ASC`, 100 per page, the field list in
`tools/requests.py`), refetch any issue whose comment `total` exceeds the comments returned, refetch FIS pages in
ADF, then `build` and `check`. Update `EXPECTED` in `tools/requests.py` to the new live totals first.
