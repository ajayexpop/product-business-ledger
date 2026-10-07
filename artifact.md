# Artifacts

One place for every artifact in this workstream: what it is, who it's for, where it comes from, and how to update it.
All links are private claude.ai artifacts: only you, plus anyone you share with from the page's Share menu, can open them.
Last updated 28 Sep 2026 (the ledger moved to WS7mJG…, the old link shows a moved page; the ledger project is now `ledger/`).

## At a glance

| Artifact | Audience | Status | Link |
|---|---|---|---|
| Internal Product Business Ledger | Internal (product, CS, leadership) | **Live, source of truth** since 28 Sep 2026 (v23, 6 Oct 2026: Method & sources open to everyone, read-only, with Definitions; v22: Timeline tab removed, code kept in `ledger/deprecated/timeline/`; v21: Beta logging with Claude for Settings viewers; Must-have ledger open to everyone). Project: `ledger/` | https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d |
| Ledger Rewire Preview | Internal (owner, Ilaria; then Product, Sales, Ops, Engineering) | New 29 Sep 2026: working preview of the planned restructure on live data, read-only. Project: `rewire/` | https://claude.ai/artifact/BUv7s6D31RAuodnBFsqJ7o |
| ~~Department Lens~~ | Internal | Superseded 29 Sep 2026 by the Rewire Preview; `deptlens/` removed. Owner to delete it from `/artifacts` (the delete needs their confirmation) | ~~https://claude.ai/artifact/8fbYFs6yCseVTq6Yy7By8b~~ |
| Ledger Rewire Map | Internal (owner, Ilaria) | New 29 Sep 2026: planning diagram of the ledger restructure (tab remap, Home lenses, intake pipeline, link layer). Source: `ledger/docs/diagrams/next-ui-structure.html`; plan: `ledger/docs/planning-the-next-part-of-ui-ux.md` | https://claude.ai/artifact/9QGLoezhu8tJYezDMRHhEq |
| Product Demand Map | Internal | Kept as is; its data is also the Demand tab of the ledger | https://claude.ai/artifact/NfBA41XSVuf4cCJaaEAkzH |
| ~~Old Business Ledger~~ | Internal | Retired 28 Sep 2026: shows a “moved” page linking to the ledger (v7). Final page and database in `ledger/backup/2026-09-28/` | https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G |
| ExpoPlatform Product Journey | **Customers** (any client) | Review draft, not approved for sharing | https://claude.ai/artifact/8VKK3M2dKZ3KgDRtfALuLD |
| DLG Product Journey | **DLG** (DLG Markets GmbH) | Review draft, not approved for sharing | https://claude.ai/artifact/WyaoHjtdggStN5xrNTcwaX |
| Product Journey Review | **Internal only** (head of product) | Working review copy | https://claude.ai/artifact/8ut25xL9zrhJsWYVdLD85b |
| Story Value Roadmap | Internal only (product, CS, leadership) | Live, v3 (status filter; Done + In Progress category only) | https://claude.ai/artifact/SGNUmh5QxcfuULj1U2yn3d |
| ~~Product Demand Map~~ | Internal (whole business: product, CS, leadership) | Deleted 28 Sep 2026 after v3; source kept in `intel/viz/` (republish creates a new link) | ~~https://claude.ai/artifact/NfBA41XSVuf4cCJaaEAkzH~~ |
| ~~Product Truth~~ | Internal | Gone as of 27 Sep 2026 (deleted or unshared); rebuild from `truth/` and publish as a new artifact if wanted | ~~https://claude.ai/artifact/AUY6eCqXX1fPoHEA3a6rLT~~ |
| ~~Product Truth Map~~ | Internal | Gone as of 27 Sep 2026 (deleted or unshared); source kept in `docs/diagrams/product-truth-map.html` | ~~https://claude.ai/artifact/BV21bZbFArWnodFekbfv45~~ |
| ~~Product Demand Explorer~~ | Internal | Deleted 26 Sep 2026; its Requests view now lives inside the Product Demand Map | ~~https://claude.ai/artifact/SAdNszqYvdRzsLqXNa2H2v~~ |

---

## Internal Product Business Ledger

**Link:** https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d since 28 Sep 2026 (the old link https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G, formerly "Client Ledger", now shows a moved page). Project folder: `ledger/`

**What it is:** the internal business ledger of ExpoPlatform's clients. It covers companies, tiers, health, renewal dates, bugs and incidents, the stories delivered for each client, and the sales pipeline. Co-writers edit it too (Logic saves, Pipeline edits), and it has a shared database (`pipeline`, `config`).

**Version 6 (25 Sep 2026):** opens on an Overview (event radar, promises at risk, changes from Jira); Client 360 panel and Find a client (`/`); sign-in gate on every visit; Requests (formerly Pipeline) need every required field and record who added, edited or removed what. Bugs and stories refresh from Jira at least every 4 hours through the viewer's Atlassian connector (capabilities: `artifact`, `db`, `user` profile, `mcp` Atlassian). The shared database now also holds `jira/b00..b15`, `sync/state` and `sync/lock`.

**Who it's for:** internal teams only.

**Source and how to update:** this repo (`live/`, `src/`, `data/`, `tools/ledger.py`). Follow the update cycle in `CLAUDE.md`: re-read the live artifact first, `check`, edit, `build`, QA, then publish **in place with this URL**. Never publish without `url`, because that creates a new artifact.

**Not the source of truth:** three older copies exist from earlier work. Don't use or update them:
- Client Ledger (Copy): https://claude.ai/artifact/Bi283GmERvsCg4bJSHcZ8D
- Client Ledger (Copy) (Copy): https://claude.ai/artifact/6VVJaZfF6eN3SfFLMeR5Xr
- Client Ledger (Copy) (Copy) (Copy): https://claude.ai/artifact/HZyVgzGo2Lg8hTzAYWoadr

---

## Ledger Rewire Preview

**Link:** https://claude.ai/artifact/BUv7s6D31RAuodnBFsqJ7o (created 29 Sep 2026). Project folder: `rewire/` (start with `rewire/README.md`).

**What it is:** the restructure from `ledger/docs/planning-the-next-part-of-ui-ux.md`, built end to end on the ledger's real data so it can be clicked through and reviewed. Home with role views, then Clients (table and timeline), Work (ladder, must-have board, built and shipped, short intake form), Demand and Quality. Every number opens its list; every client, need, item and month has a linkable drawer. Design follows `docs/design.md`.

**Who it's for:** the owner and Ilaria first, then the departments.

**Not the source of truth:** a read-only snapshot. The data is the ledger's built data with the live ledger's Jira, incident, event and Hyve refreshes laid over it (exported 29 Sep 2026). It never writes to the ledger or its database. Capabilities: `sample` (the intake AI draft, run on each viewer's own account) and `user` with scope `profile` (shows the How it works tab to the owner only and resolves names in its history). Light / Dark / System switch, Light by default (v3, 29 Sep 2026). v4 (29 Sep 2026): intake matching with percentages across demand, delivery since 2023, in-flight work and the platform baseline; linking matches into an ask; Fathom call evidence (capability `mcp`, Fathom `get_recording_by_url` and `get_meeting_transcript`, so no public-link sharing); onboarding tours, tab hints and a Guide button. v5 (29 Sep 2026): Drop a feature as four guided steps (Describe, Check matches, Review, Send) with a named reason on every disabled button, editable AI suggestions, answerable AI questions, a colleague picker for the value hand-off and a confirmation screen. v6 (29 Sep 2026): Demand renamed Feature requests; anyone can share a feature request (voice or typing, Fathom call, chat snippet) with AI auto-fill, "Is this it?" one-tap joins, an AI wording tidy before saving and signal before and after; the preview's own shared store (capability `db`, rules `fr` read view / write admin, `fr/{self}` write interact); admin means owner or editor; Test lab with test mode, scenarios, view as a colleague, merge queue and AI inspector. v7 (29 Sep 2026): AI calls rebuilt (plain call with lenient JSON reading, named errors with codes for admins, progress, a Check the AI button in the Test lab), a built-in fill when the AI is unavailable, marked AI guesses for why and outcome, Speak instead with device dictation steps, several clients per request, and Add work visible to admins only; QA now runs with a stand-in AI in four modes. v8 (29 Sep 2026): every ask opens with edit, delete, history, the four value levers with figures and signing, linking and unlinking, and Close the chain; feature requests show In the pipeline or Delivered; voice help with correct dictation steps and a phone QR code. v9 (29 Sep 2026): Voices shared here on the Feature requests tab, with an Everyone / Mine filter; each voice opens its own panel (`#voice-<id>`) to view, edit (clients, wording, move to another feature request) or delete with confirmation; AI placeholders such as "Not stated" are no longer saved.

**Update:** see `rewire/README.md` (export, `tools/pack.py`, `tools/probe.py`, republish with `files` = `data.json`; omit `icon` and `capabilities`).

---

## ExpoPlatform Product Journey (general customer roadmap)

**Link:** https://claude.ai/artifact/8VKK3M2dKZ3KgDRtfALuLD

**What it is:** a customer-facing roadmap showing how the product evolved from Q1 2023 to Q3 2026, quarter by quarter.
- 407 features in 13 themes, with 3–6 headlines per quarter.
- A "year in review" for each year.
- Two views: Timeline, and Theme lanes (themes as rows, quarters as columns).
- Filters for theme, headlines only, AI features and features in the app.
- An undated "Coming next" section.
- ExpoPlatform branding with Montserrat headings (not Guton, which is internal-only), in light and dark mode.
- Design (redesigned 25 Sep 2026): a dark hero with a "journey strip" where every shipped feature is a dot, stacked by quarter and coloured by theme group (select a quarter to jump to it). Each year is a chapter with a large year numeral and review; each quarter sits on a timeline spine with headline cards (the first one large) and an "Also shipped" list. Any feature opens a side sheet (a bottom sheet on phones).

**Who it's for:** any customer.
- It contains **no** client names, Jira keys, effort, team names or numbers.
- The build refuses to produce it if a Jira key gets into the data.

**Status:** review draft with a yellow banner. Before sharing, you need to approve the 13 "Coming next" items and the feature wording (`data/roadmap/REVIEW.md`). Then build without `--draft` and republish.

**Source:** 2,494 finished Jira **Story** tickets (2023 to Sep 2026). Of those, 1,289 are customer-facing and every one sits in exactly one feature.
- Wording is checked against each story's description. For the 101 stories from 2026 whose Jira description is just a Confluence link, it's checked against the linked Confluence page (`data/roadmap/enrich/confluence/ai.json`).
- Data and specs: `data/roadmap/` (`THEMES.md`, `TAG_SPEC.md`, `HIGHLIGHT_SPEC.md`, `highlights.json`, `copy.json`, `coming-next.json`, `overrides.json`).

**27 Sep 2026 (v4):** every feature, coming-next item and DLG item now carries **What / Why / Outcome** and **who it helps**, written only from the source stories (`data/roadmap/WWO_SPEC.md`, copy in `data/roadmap/wwo/g*_w/`) and checked row by row by independent fact-checkers (`g*_v/verdicts.json`, 174 corrections, including existing card text that overstated). Light mode is the default for everyone, with a Dark mode toggle. New "Helps" filter, Previous / Next in the side sheet. "Meeting scheduling upgrades" and "Next-generation speed networking" were removed from Coming next by the owner (`removed` in `coming-next.json`).

**Update (all three pages):** `tools/journey_build.sh` (runs `check`, then the draft, DLG and internal builds into `dist-journey/`, which the ledger build does not wipe), then `python3 tools/roadmap_qa.py` with `QA_WIDTH` 1440, 1100 and 400: it must report errors 0 · issues 0 (it clicks every filter, opens every feature, checks WCAG contrast in light and dark and sideways scroll). `python3 tools/roadmap_qa.py --shots` for screenshots. Then publish `dist-journey/roadmap/index.html` to this URL.

---

## DLG Product Journey (client-specific roadmap)

**Link:** https://claude.ai/artifact/WyaoHjtdggStN5xrNTcwaX

**What it is:** the general roadmap personalised for DLG Markets GmbH, who complained that "we do nothing for them".
- **"What we built at your request":** 23 features by year, naming their events (Agritechnica, EuroTier, DLG-Feldtage and others).
- **"In development for DLG":** 7 items. The epic-based item was removed because the page uses Story tickets only.
- **The full platform timeline**, with a "Requested by DLG" badge and filter on 18 features. The badge only appears where DLG drove at least a third of a feature's stories.
- No numbers, and product features only (no services or bug fixes).

**Who it's for:** DLG, once approved.

**Status:** review draft, with open decisions:
- **Rated W, "not a DLG request":** remove or reword the six items, EP-26093, EP-47929, EP-51701, EP-52820, EP-57471 and EP-57098.
- **Rated S, shared with other clients:** relabel as "requested by DLG and other organisers".
- **Rated C, "Reported by" field only:** confirm with the account manager.
- **"In development" items:** sign each one off.

**Evidence (internal, never share):**
- `data/roadmap/dlg/EVIDENCE.md` and `evidence.csv`: every DLG claim with its Jira link, who created the ticket, the "Reported by" field, quotes and an evidence rating (A/B/C/S/W).
- `data/roadmap/dlg/REVIEW.md`: account findings, including 65 unanswered DLG feature requests and the rejected bugs.

**Update:** edit `data/roadmap/dlg/dlg.json` (What / Why / Outcome live in `data/roadmap/wwo/g7_*`), then `tools/journey_build.sh` and the QA above. Publish `dist-journey/roadmap-dlg/index.html` to this URL. The fact-check reworded items 16 and 18 (a live test and an investigation, not shipped features) and dropped unsupported "you asked" wording on items 0 and 10.

---

## Product Journey Review (internal, Jira-linked)

**Link:** https://claude.ai/artifact/8ut25xL9zrhJsWYVdLD85b

**What it is:** the same roadmap, for review by the head of product.
- **Jira sources:** every feature lists its source stories as clickable Jira links, with story title and finish date.
- **DLG ratings:** stories tied to DLG show their evidence rating.
- **"Coming next":** each item shows the in-flight Jira stories behind it, marked "awaiting your sign-off".
- **"Left out":** all 1,205 excluded stories with Jira links, grouped by reason.
- **Search** by feature, Jira key or story title.

**Who it's for:** internal only. It has a red banner and contains internal story titles and client names. Never share it with customers.

**v8 (28 Sep 2026):** new filters on all three journey pages: one Filters panel (products by group, who it helps, year, highlights, and on this page New capability / Improvement), each option with a live count; quick product-group chips; removable chips for everything that is on, with Clear all. Onboarding on this page: a first-visit welcome asks the viewer's role (Account Manager, Sales, Customer Success, Product, Leadership, Support) and optionally a client, then runs a spotlight tour of the parts that matter for that role; replay it from **Guide** in the top bar. The choice is remembered in the viewer's browser only.

**v7 (28 Sep 2026):** the DLG evidence section and the "Requested by DLG" filter are removed from this page (owner request; `dlg_evidence()` kept in `tools/roadmap.py`). Chat: a citation now opens its source beside the panel, each status label explains itself when clicked, and the label follows the strongest cited verdict. New **Roadmap PDF** button (capability `downloads`): pick products, years, coming next and audience (customer-safe without Jira keys or clients, or internal with them plus "Platform today"); built in the browser with jsPDF.

**Ask the roadmap beta (v6, 28 Sep 2026):** internal only, capability `sample` (answers run on each viewer's own Claude account).
- **"I work at [client] as a [role]":** choosing a client filters the page to what we built with them (from `analysis/stories.json`); *Build my briefing* asks the AI for a role-specific briefing.
- **Ask the roadmap panel:** answers only through page tools (search roadmap, read an item, search the verified platform baseline, search open requests, client overview). Every statement carries a status (New since 2023, Improved, Part of the platform, Partly, Documented not built, In development, Asked for not built, Not found) and citations; the page sets the status from the source, and drops any statement without a valid citation. It never says "we don't have it".
- **Platform today view:** the verified baseline, 2,238 claims from the knowledge base's code reconciliation study (`kb/legacy/platform/init/kb`, snapshot Sep 2026), never Source A. Built by `tools/platform_baseline.py`; companion data `ask.json` by `tools/journey_ask.py` (published beside the page).
- **Feature sheets** show New capability / Improvement and "Builds on" claims (AI-classified from the stories, `data/roadmap/wwo/map/`, not yet reviewed).
- QA: `tools/roadmap_qa.py` runs a stand-in runtime (`tools/roadmap_qa_mock.js`) with 12 known questions (12/12 retrieved) and a made-up feature (no hits). Live answers can only be tested in a Claude viewer.

**DLG evidence (v5, 27 Sep 2026):** a "Done for DLG · internal evidence" section at the top lists every item the DLG page presents as built or in development for DLG, each with its strongest evidence rating (A named as asking, B DLG case in the ticket, C Reported-by field only, S shared with other clients, W not a DLG request). Open an item for its What / Why / Outcome and, per Jira story, where it says this was for DLG: the evidence note, the Reported-by field, who created it and when, labels, and the quote from the ticket (links and tokens stripped). The timeline also carries the "Requested by DLG" badges and filter. Source: `data/roadmap/dlg/evidence.csv` (pulled from Jira 25 Sep 2026); built by `dlg_evidence()` in `tools/roadmap.py`. None of this reaches the customer or DLG pages.

**Also shows** whether each Why is stated in the stories or implied, with the evidence line, and the items the owner removed from Coming next.

**Update:** `tools/journey_build.sh` and the QA above, then publish `dist-journey/roadmap-internal/index.html` to this URL with `files` = `ask.json`; omit `capabilities` to keep `sample` and `downloads`.

---

## Data behind the roadmap

`docs/stories-by-year.md` covers the Story coverage per year, what each pull fetches (and what can be dropped), and agent recipes to fill gaps.

## Rules that apply to all roadmap artifacts

- **Story type only.** Only Jira `issuetype = Story` counts as delivery. Bugs, Tasks, Sub-tasks, Feature Requests and Epics are never used. The build refuses any key that isn't in the Story-only pulls or `data/roadmap/verified-stories.json`.
- **Dates:** a story's quarter is the date it moved into the Done category (Jira `statusCategoryChangedDate`).
- **Customer versions:**
  - never show client names (except the client's own version), Jira keys, effort, team or person names, or counts;
  - only name integration partners (ExpoFP, Klipso, Map Your Show, Aditus…);
  - never publish "Coming next" items until you've signed them off.
- **Update in place:** always republish the same file to the same link. Publishing without it creates a duplicate artifact.

## Other artifacts in your gallery

Other workstreams, listed here so you can find them. I haven't reviewed their content in this project; ask me to read one and I'll add a proper description here.

| Artifact | Link | Last updated |
|---|---|---|
| Feature Request Intake & Prioritisation Model | https://claude.ai/artifact/RuJjEkyWQjG4bLjFCnffYX | 25 Sep 2026 |
| Customer and Participant Journeys | https://claude.ai/artifact/7BvnwKW29voSLwHq5j3bEJ | 25 Sep 2026 |
| Platform Model Atlas v6 | https://claude.ai/artifact/SfMAE6ek6Zgz15QjKWmqAi | 25 Sep 2026 |
| Platform Model Atlas v3 | https://claude.ai/artifact/QZEA5yBFqqnevYxpE4uaxY | 24 Sep 2026 |
| Platform Model Atlas v2 | https://claude.ai/artifact/4G2zTsNsYjPcWY9ZdDu3xo | 24 Sep 2026 |
| Access Journey Atlas | https://claude.ai/artifact/FSiHdj6AKnZcDQqZkhbV46 | 24 Sep 2026 |
| The Phoenix Platform | https://claude.ai/artifact/97a3gSMssrWbnMnWXZEZnR | 24 Sep 2026 |
| Phoenix Platform Map | https://claude.ai/artifact/VopjQ7X9beEFm3o8BTcRrV | 24 Sep 2026 |
| Helix — Customer Overview | https://claude.ai/artifact/Cjqib8bqdZdLdht3GYpvMg | 24 Sep 2026 |
| Helix Build Status | https://claude.ai/artifact/79RV7NWNWggCQr1dMHM8K9 | 24 Sep 2026 |
| Helix — Sales Story | https://claude.ai/artifact/8PMn1FPWzku7SVTCr5VRpq | 24 Sep 2026 |
| Delivery Timeline | https://claude.ai/artifact/26EDqoU1tUM9jQw2cHjZL5 | 22 Sep 2026 |
| Delivery Timeline (older) | https://claude.ai/artifact/Row4MYizvXaoUhwHsecBZT | 16 Sep 2026 |
| Ep Impact Map (pinned) | https://claude.ai/artifact/6FtmCqqBkwPBTMQGj1Lq1a | 15 Sep 2026 |
| Ep Impact Map | https://claude.ai/artifact/EePLa8wrhGMv8o7NnH8Sm8 | 16 Sep 2026 |
| Ep Impact Map | https://claude.ai/artifact/VSt7WkXDGUxVdimj3zt5x3 | 15 Sep 2026 |
| The Phoenix Vision Machine | https://claude.ai/artifact/WZ6J8Nu1YAmuJtZ45fGQep | 14 Sep 2026 |
| Phoenix Repository Atlas | https://claude.ai/artifact/Xe1XdBdGbAtWk4WZTRAjvv | 1 Sep 2026 |
| Fidelity Upgrade Evidence | https://claude.ai/artifact/GEX7YXebwuPHXnxPnqAUTM | 23 Aug 2026 |
| The PhoenixBuilder Brain | https://claude.ai/artifact/RA58hS8oKReJrJeNqUj21Z | 16 Aug 2026 |
| PhoenixBuilder Operator's Reference | https://claude.ai/artifact/55tm1fV36HnkNUNwMGsyMZ | 16 Aug 2026 |
| Film Ops — Meeting Program | https://claude.ai/artifact/ARskh6QTquNFXC7bsJSVNo | 15 Aug 2026 |
| Exhibitor directory: the walkthrough | https://claude.ai/artifact/4nvmVUZokaWJNJXaZU7vTH | 14 Aug 2026 |

In the terminal, `/artifacts` lists everything you own (press `o` to open, `c` to copy a link). On the web, go to claude.ai/code/artifacts.

---

## Story Value Roadmap

**Link:** https://claude.ai/artifact/SGNUmh5QxcfuULj1U2yn3d

**What it is:** a light-theme business dashboard over the Jira Stories that are Done (2023 to Sep 2026) or in the In Progress
category (In Progress, Ready for review, In testing, Ready for testing, Ready for release): 2,608 stories. Not-started stories
(Ready to start, Open) are excluded by owner decision (25 Sep 2026); `analysis/stories.json` still holds them as stage "Not started". Four sections: Overview (KPI tiles and charts: stories by quarter stacked by value driver, tier groups, top customers,
delivered versus planned, teams), Roadmap (quarter grid, rows by value driver or tier), Customers (sortable table with driver split
and delivery by quarter) and Stories (flat sortable, paged list). One filter bar scopes every section: period presets, status, driver
chips, tier, customer, team, search and confidence, with removable active-filter tags. Every bar, row and cell opens a side panel
listing the stories with customers, tier, driver rationale and a Jira link.

**Who it's for:** internal teams only. It names customers and tiers.

**Source:** `analysis/` (`stories.json`, rule `analysis/SPEC.md`). Page: `analysis/roadmap/index.html` + `data.json` + `fonts/`.

**Update:** `python3 tools/story_analysis.py merge && python3 tools/story_analysis.py check && python3 tools/story_analysis.py page`,
then publish `analysis/roadmap/index.html` to this URL with `files` = `data.json` (and fonts only if they changed).

---

## Business Ledger Preview (became the ledger on 28 Sep 2026)

**Link:** https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d (created 26 Sep 2026)

**What it is:** the redesigned ledger, published separately so the owner can compare it with the live one:
- a rebuilt Timeline: mirrored month chart; one mark per cell (delivered, worst open severity, incidents, show flag); sorted by next show; collapsible tier bands;
- one button system and navy toggles;
- explanations behind "How to read this" or an i button;
- quadrant labels, the Neglected filter and the Neglected tile removed;
- severity colours dark red, orange, amber and sand, with incidents in fuchsia.

**Version 2 (26 Sep 2026):** events re-pulled from Jira OP and linked to clients by Pipedrive ID (DLG's 2026 shows now appear), every month view spans the whole year, Flow tab parked (`exploration/flow.md`), larger tabs with counts, event types coloured.

**Version 4 (27 Sep 2026):** the Requests tab holds the new Feature ledger with the full "Log a new work item" form from `exploring/` (collections `ledger`, `ledger-events`, `config/ledger-seq` in the preview's database).

**Version 5 (27 Sep 2026):** Demand tab (the Product Demand Map inside the ledger, instant and AI search) and the duplicate search in the work-item form. Publishes `demand.json`; capabilities add `sample` for Ask AI.

**Versions 6–7 (27 Sep 2026):** the feature ledger flow as a swimlane pop-up, clickable month chart, zoom on Timeline, Delivery, Demand and the Requests grid, and fixes from the click-through QA (`tools/qa.py`).

**Version 8 (27 Sep 2026, 1790556914-bb4f):** *Sample walkthrough*: a made-up item stepped through all 15 moments of the flow, for business calls and self-serve learning.

**Versions 9–12 (28 Sep 2026):** Must-have ledger and How it works private to Ajay, with a countdown for others (v9); five fields to log, hand-off to a colleague, stages without dates, day counts for Ajay only (v10); Data refresh tab with delta pulls of IMP and OP in the page (v11); personal layer, onboarding tours, the Guide and Ask (v12, 1790564600-a345).

**Not the source of truth.** It has its own database: requests were copied from the live ledger on 26 Sep 2026 and are read-only here. Its Jira refresh runs on its own.

**Source and promotion:** `preview/` (see `preview/README.md`). If the owner picks it, publish it to the live URL and leave this as a spare, or delete it on request.

---

## Product Demand Map

**Link:** ~~https://claude.ai/artifact/NfBA41XSVuf4cCJaaEAkzH~~ (deleted 28 Sep 2026 after v3; `intel/viz/index.html` is the last published build)

**What it is:** the one view of open demand. 1,781 tickets and intake pages (822 EP Feature Requests, 839 Open Stories, 120 FIS requests) are enriched against the product knowledge base (KB product, what / why / outcome, built overlap) and merged into 1,122 distinct needs, with 151 duplicates folded in. Three tabs:
- **Tier map:** a product graph with KB products as hubs, needs shaded by the best Sales Tier asking, and customers as diamonds. The lens switches between Tier 1, Tier 1–2, all tiers and all demand, and there is a ranking of where Tier 1 is asking.
- **Needs:** the deduplicated table, with members, duplicates and built state.
- **Requests:** the original explorer.

**Who it's for:** internal teams, business-wide, to pick the next most important thing. The ranking is the tier signal only until the scoring criteria are agreed (`score` is null).

**Source and how to update:** `requests/` (facts), then `intel/` (`SPEC.md`, `tools/intel.py kb / prep / merge / cprep / build / check`), then `python3 intel/viz/build.py` (sources `intel/viz/app.html` + `app.js`; the build refuses to write the page if an email, a known credential, a password-shaped token or a link token survives redaction), then republish `intel/viz/index.html` with this URL. Omit `icon`. v3 (27 Sep 2026) passed four QA rounds: filter counts match `intel/db/items.json`, light theme is the default, 400px has no side scroll.

---

## Product Truth Map

**Link:** https://claude.ai/artifact/BV21bZbFArWnodFekbfv45 (created 27 Sep 2026)

**What it is:** the diagram of `future-plan.md`: sources → pull and enrich → join (shared store, client ID table, product map) → signals → pages, with the agent loop underneath. Built, partly built, missing and owner-decision nodes are colour-coded. It also has a today-versus-target comparison and the missing pieces in build order.

**Who it's for:** internal (owner, product). It names no customers except DLG.

**Source and update:** `docs/diagrams/product-truth-map.html`. Edit it and republish with this URL. Omit `icon`.

---

## Product Truth (the hub)

**Link:** https://claude.ai/artifact/AUY6eCqXX1fPoHEA3a6rLT (created 27 Sep 2026)

**What it is:** the joined view that `future-plan.md` asks for. Today opens by role (Leadership, Product, Engineering, Customer Success) and there is a Guide (the ? button). Views, v2 of 27 Sep 2026 also adds **Shows** (next weeks, bugs per show, promises before it) and **Quality** (bugs, incidents, load by team):
- **Today:** clients to act on before their show, the best-signal needs and Jira changes since the snapshot.
- **Clients:** every client, with a **Client 360** panel (past / now / next).
- **Products:** built, asked and broken for each product.
- **Demand:** the 1,122 needs.
- **Delivery:** all 3,328 stories, with value mix by quarter.
- **System:** sources, checks, coverage and the owner decisions.

The page refreshes Jira itself every 4 hours for every viewer (capabilities `db` with `decisions` writable by editors only, `user` profile, `mcp` Atlassian `searchJiraIssuesUsingJql`), and editors can answer the decisions on the page.

**Who it's for:** internal only. It names clients and tiers.

**Source and how to update:** `truth/` (see `truth/README.md`, `truth/REFRESH.md`). Run `python3 truth/tools/truth.py run` (it rebuilds only stale steps and checks everything), then republish `truth/dist/index.html` to this URL. Omit `icon` and `capabilities`; pass `files` (fonts) only if they changed.
