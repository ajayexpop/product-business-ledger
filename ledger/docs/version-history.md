# Version history

The ledger at **https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d**. Versions 1 to 12 were published while it was the
"preview" of the redesign (a separate artifact beside the old ledger, with its own database). On 28 Sep 2026 it became the
ledger (version 13) and the old link got a "moved" page.

## Version 22 (6 Oct 2026): published, 1791343920-6e67 — Timeline tab removed
The **Timeline** tab is gone from Client health, which now holds Overview and Clients. Its "Delivering or firefighting, month by
month" chart went with it. Ilaria's phase 4 review (feedback of 1 Oct) marked the tab as cut, and Ajay deprecated the chart on
6 Oct. The code is kept in `deprecated/timeline/` with a README that says how to put it back. `TIERS` and `tlRisk` stay in
`main.js` because Delivery and the Overview use them. Any tab without a panel, such as an old `#timeline` link or a saved last tab,
now opens the Overview. The "Shows in 90 days" KPI opens Clients. The Guide, the "My clients" text and the Jira OP source card
no longer mention the Timeline. QA: the Timeline checks moved to the deprecated folder; new checks confirm the tab is gone and
that an old link lands on the Overview, and "My clients" is checked on the Clients count.

## Version 21 (30 Sep 2026): published, 1790786519-79a4 — Beta: logging with Claude; Must-have ledger open to everyone
**Beta** replaces the logging placeholder for the Settings viewers (Ajay, Bartosz); everyone else still sees the card, now marked
*In testing*. Two ways in, one window: **Quick share** (clients, then Speak or type / Chat snippet / Call recording; Claude fills in
what, why and outcome with a source chip on each, finds the clients named, and asks "Is this it?" against the needs asked for,
what is built, the Must-have ledger and the Feature ledger; join a need, record it as already built, follow work on its way, or
log it new; Claude tidies the wording and asks one question) and **Full review** (Describe, Check matches, Review, Send: match
percentages and relations, the combined signal and the tickets it would close, Claude's draft with sources, up to 3 questions,
the platform surfaces, the product area and the sales colleague who adds the value). New items go into `ledger` / `ledger-events`
through the same writer as the form (`feWriteNew`, `via: "beta"`); joins and the rest are voices in a new `ledger-voices`
collection that add their clients to the need's signal. Test mode tags everything and keeps it out of every count. The item gains
a Beta section (what the client said, quotes, clients and signal, links and Link more, Close the chain, Sign and move it along for
Settings viewers). New sub-tab **Sync & logs → Beta lab** (test mode, cases, clear my tests, Check Claude, the session's AI log);
History gains a Beta intake source, including one line per call to Claude. Capabilities: the Fathom connector
(`get_recording_by_url`, `get_meeting_transcript`) added. The **Must-have ledger is open to everyone**: the lock, the countdown
and the access code are gone. QA: 0 errors, 0 issues in all five runs.

## Version 20 (30 Sep 2026): published, 1790774512-be2c — Product delivery, Settings, logging placeholder
Tab groups renamed: **Work → Product delivery** (Requests, Demand, Delivery, Bugs, Incidents) and **How it works → Settings**
(Rules, Method & sources, Sync & logs). Logging a new work item is moving to a Claude skill: every Log entry point opens an
*In progress* card saying so; Ajay and Bartosz get "Use the old form" on it; filling in owed details on an existing item still
opens the form. Tours and the Guide's Ask say the same. The Must-have countdown reached zero (30 Sep, 13:12 UTC); the ledger
stays locked until the owner decides. QA: 0 errors, 0 issues in all five runs.

## Version 19 (30 Sep 2026): published, 1790768830-d89c — How it works for Bartosz
The whole How it works section (Rules, Method & sources, Sync & logs with Data refresh and History) now opens to the ids in
`EP_HOW_IDS` as well as Ajay: Bartosz (bartosz@expoplatform.com, `u_0KCjQDtQxEOgVhmNzuV5SQ`, found from his visit record). Tours,
the Guide's Ask and landing follow the same access. The Must-have ledger, the Feedback inbox, day counts, and the visits and
feedback in History stay Ajay's (the last two by `db` rule). QA: 0 errors, 0 issues in all five runs, with a new check that a
How it works viewer gets the three tabs and nothing else.

## Version 18 (29 Sep 2026): published, 1790691879-0d2c — Must-have access code
While the countdown runs, the Must-have ledger's lock card has a small key icon (bottom right). It opens an access code box;
the right code opens the Must-have ledger, and only it (Rules, Method & sources and Sync & logs stay Ajay's), for that viewer,
remembered in their browser; a wrong code is refused. Only the code's SHA-256 is in the page, and each unlock is recorded in
the viewer's activity (History). A soft gate, not a security boundary. QA: 0 errors, 0 issues in all five runs, with checks
that a wrong code is refused, the right one opens the ledger, and nothing else opens.

## Version 17 (28 Sep 2026): published, 1790620458-ecec — status follows Jira; IMEX Frankfurt 2027; funded
**Must-have status is Jira's.** Every item with a ticket shows the ticket's own status (Ready for release, In testing, Ready to
start, Open…) on the board, the grid, the table and the form (read-only there), placed in the column that status maps to;
the 13 items whose ledger status disagreed were set to Jira's with a history entry, and every Jira refresh now re-reads
every must-have ticket, so the ledger matches every board. The "status differs from Jira" flag is gone. **For show**: the four
open IMEX items (EP-57297, EP-55779, EP-57914, EP-57918) are for IMEX Frankfurt 2027 (18-20 May 2027) with delivery this year,
so they are checked against that show and not flagged overdue. **Funded**: all Hyve dedicated team work (Hyve bar and every HV
tag), the IMEX AI Search project (EP-55779, EP-57914, EP-57918) and Vinexposium's required custom filters (EP-56915), with a
badge, a filter and a Funded field. QA: 0 errors, 0 issues in all five runs.

## Version 16 (28 Sep 2026): published, 1790619040-9c09 — Sync & logs with History; must-have items complete
**Must-have items filled in from their sources** (database writes): every item's Jira description and comments, and the 16
Confluence pages they link, were read (four agents, one batch each, every value with its source); the empty Why, Impact,
Rationale, Priority, Dependencies, Estimate and Notes were filled where a source supports them, and nothing already written was
replaced. Drivers follow Jira's Reported by and Pipedrive id: DLG on the four Session Calendar stories and EP-57107 (split from
DLG's EP-57014), Vinexposium on EP-56915 and EP-48716, BeautyIstanbul on EP-55900, HINTE on EP-56170; Platform on the internal
tickets that name no client. Ajay's own edits made meanwhile (EP-55432: Why and Driver Informa; EP-56170: HINTE) were kept.
EP-48716's estimate follows the 28 Sep comments (BE 21-22d). Each item's pop-up shows **Where the details came from**: the
source of every field, the pages read and what the sources did not say. **Data refresh is now Sync & logs** with two sub-tabs,
**Data refresh** and **History**: one timeline of every change anyone made (must-have items and columns, work-item events, rule
saves, data pulls and requests, feedback) and every visit, filterable by period, source, person and text, each line opening its
item. Visits come from a new private **activity log** (`activity/<id>/months/<yyyy-mm>`: sign-ins, tabs and pop-ups opened),
readable only by the owner under two new `db` rules (checked live: a regular viewer's write into someone else's folder is
refused); the sign-in notice says so. Tour cards now also look beside a tall target. QA: 0 errors, 0 issues in all five runs.

## Version 15 (28 Sep 2026): published, 1790617311-ceb0 — Must-have Board, signal explained
**Must-have ledger refreshed and redesigned.** The Confluence page was read again with its Jira keys and folded in by the new
`tools/pipeline_pull.py` (database write, no page change needed): 26 items, 8 new, the Iyzico row's ticket (EP-55900), one
estimate and one month changed, every item's Jira columns re-read. The ledger opens on a new **Board**: a column per month
(plus *No month yet*), every item a card with key, status, feature, client and tier, team, days and its flags, each client's
show marked in its month; columns switch to Client, Team or Status. Nine figure tiles became five figures and one
**Needs attention** line whose parts filter the board. The grid and table stay one click away; the effort charts sit under
the board. **Demand: the signal score explained**: a panel above the ranked list and the Needs table (formula, weights,
worked example from the top need, what it does and does not count), each need's pop-up shows its own sum customer by
customer, every signal number explains itself on hover, and the Guide's glossary has the term. QA: 0 errors, 0 issues in all
five runs, with new checks that the board is the default, its cards fit, every grouping renders, the attention line filters
and clears, and the worked example adds up to the top need's signal.

## Version 14 (28 Sep 2026): published, 1790600716-0bb8 — Feedback
**Feedback: Happy / Sad / Want.** A Feedback button in the header and a Feedback pane in the Guide: pick a mood, write one
line, optionally say how much it matters (nice to have, important, blocking); where the viewer was (tab and open pop-up) is
attached unless they untick it. Senders see their own notes, the status and Ajay's replies in the Guide, a dot on the Feedback
tab and a one-time "Ajay replied" notice. For Ajay the header button is the **Feedback inbox** (also Guide → You): mood counts,
filters (mood, status, theme, search), per note a status (New, Planned, Building, Shipped, Won't do), a theme to group related
notes, a reply thread (changing the status drafts a reply), and a **Roadmap** board of themes by status with people and mood
counts. Privacy is enforced by two new `db` rules: `feedback` is readable and writable only by the owner, and `feedback/{self}`
by each person as well (checked live: a regular viewer's write into someone else's folder is refused). `tools/feedback.py`
builds `docs/feedback-roadmap.md` from the export. QA: 0 errors, 0 issues as Ajay, as someone else (both widths) and without
connectors, including "nobody else's feedback visible".

## Version 13 (28 Sep 2026): published, 1790565657-42b7 — the ledger
Preview mode removed: no ribbon, no read-only Requests or Rules, no "preview test entry" labels; the page title is
"Internal Product Business Ledger". Data refresh gains in-page **Planhat** (every Active company: tier, health, CSM and RM
scores, sentiment, the three quality factors, breakdown and owner, laid over the built companies by Pipedrive id) and the
**Drive workbook** (modified-time check and a search for a newer workbook; a change queues the full re-read for Claude),
both for Ajay only. Capabilities: artifact, db, user (profile), sample, mcp Atlassian + Planhat + Google Drive.
Database: must-have items and column settings were identical in both ledgers on 28 Sep, so nothing needed copying; the
old ledger's final page and database are kept in `backup/2026-09-28/`.
The old link https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G is version 7 (1790565699-7cdf): the "moved" page, capabilities cleared.

## Versions 1 to 3 (26 Sep 2026)
Redesigned Timeline, one button system, explanations tucked away, quadrant labels removed, new severity colours; events
re-pulled from Jira OP and attributed by Pipedrive id; the whole year on every month view; the Flow tab parked.

## Version 4 (27 Sep 2026): published, 1790542757-3d80
Adds the full "Log a new work item" form (the Feature ledger in the Requests tab, from `exploring/`). `live-preview.html` is this version.

## Version 5 (27 Sep 2026): published, 1790545411-7b57
Adds the **Demand** tab (the Product Demand Map inside the ledger, with instant and AI search) and the duplicate search in
"Log a new work item" (step 0, a side panel of possible duplicates, Link / Same need / Use its details, a check before Log).
Publishes `demand.json` beside the page (`python3 tools/demand.py build`, copied by `tools/ledger.py build`).
Capabilities now: artifact, db, user (profile), mcp Atlassian, **sample** (Ask AI). Restate all five if ever restated.

## Version 6 (27 Sep 2026): published, 1790552594-793f
Feature ledger flow as a swimlane diagram (a "See the whole flow" pop-up, and on every item with its current step lit);
the Timeline's month chart is clickable (a column opens everything in that month, a segment opens that kind, with chips to switch);
the Timeline has zoom 1 to 5 (buttons, Ctrl/⌘ + scroll, + and − keys), a Months range, and legend chips that filter marks and risk rows;
the Delivery timeline has the same zoom.

## Version 7 (27 Sep 2026): published, 1790553402-2d4b
Fixes from a full click-through QA; zoom on Demand and on the Requests grid.
**Before every publish from now on:** `python3 tools/ledger.py build && python3 tools/preview.py && python3 tools/qa.py`
(and `QA_WIDTH=1100 python3 tools/qa.py`). Publish only on "errors 0 · issues 0".

## Version 8 (27 Sep 2026): published, 1790556914-bb4f
**Sample walkthrough** of the feature ledger flow (Requests → "▶ Sample walkthrough", also from "See the whole flow" and from every item's pop-up).
Example A from `exploring/08-worked-example.md` in 15 moments (28 Sep 2026 to 15 Jan 2027): Previous / Next, a moment rail, ← → Home End keys,
click any step (or the "Needs details" arrow) on the flow to jump there. Each moment shows who acts and what they do, why it matters, the rule,
what the ledger shows (stage bar, stamps, figure, funding, estimate, net, tier, dates, check), and the history so far. "Copy as text" for notes.
Works without the database (nothing is saved). Also fixes flow labels running past their boxes and the "Now here" callout covering the next step.
QA additions: `text-outside-node` and `callout-over-node` checks; the probe steps through every moment. 258 checks, 210 clicks, 0 errors, 0 issues at 1440 and 1100.

## Version 9 (28 Sep 2026): published, 1790559008-f21a
**Must-have ledger and "How it works" (Rules, Method & sources) private to Ajay.** Everyone else sees the Must-have ledger as a
countdown ("Going live in" hours : minutes : seconds, to 30 Sep 2026 13:12 UTC, 60 hours from the request), with a way to the
Feature ledger and the sample walkthrough; the How it works tab group is not shown, and links into it or into a must-have item
land on the lock. Ajay = the artifact's owner, or a claude.ai account id listed in `EP_AJAY_IDS` (src/main.js). The organisation
does not let pages read emails (the `email` user scope is refused), so ajay@expoplatform.com cannot be checked directly.
It hides views; it is not a vault: the page source, logic.json and the database are still readable by people with access.
The countdown does not unlock anything by itself: opening it is a republish (remove the lock).
QA: `QA_AS=other python3 tools/qa.py` checks the locked view (lock shown, ledger absent, clock ticking, tabs hidden, Rules refused);
the default run is as Ajay. Run both, at 1440 and 1100.

## Version 10 (28 Sep 2026): published, 1790562675-dd3b
Phase 1 of the owner's approved plan (28 Sep): the sample walkthrough shows stages only (no dates or day counts); on real items the
days in a stage and the amber/red warning are shown to Ajay only; the work-item form needs only five fields to log (raised by, title,
client, product area with "Not sure", problem) and marks the rest "before signing", each of which can be handed to a colleague
(`fs-log-minimum`, `fs-handoff` in exploring/rules.proposed.json; exploring/02 updated). A logged item with owed details sits at step 2
"Awaiting details", waiting on whoever owes them; its pop-up lists them with "Fill in the details" (fill mode of the form, event "fill").
QA adds the hand-off path end to end, no days for others, no dates in the walkthrough, and text inside callouts.

## Version 11 (28 Sep 2026): published, 1790563206-7daa
Phase 2: **Data refresh** tab in How it works (Ajay only). One row per source with freshness (fresh / due / stale against a target),
last pull, who pulled, checked and changed counts, and what a pull fetches. In-page delta pulls through the Atlassian connector:
EP (the existing 4-hour refresh), **IMP incidents** and **OP events** (laid over the built data by key: status, priority, dates, new
items by Pipedrive id, `customfield_12108` on IMP and `customfield_11906` on OP), **HV** (listed, folded in at the next build). Any
signed-in viewer's visit pulls IMP (4 h) and OP / HV (24 h) when due, like EP. Planhat, the Drive workbook, the demand map and story
enrichment have "Ask Claude to pull", which writes `refresh-req/<source>` for the next Claude Code session. New collections:
`refresh/<source>` (lastRun, lastBy, recs, runs), `refresh-lock/<source>`, `refresh-req/<source>`, `visits/<uid>` (n, first, last;
the sign-in screen says visits are recorded). The Incidents tab's "Open now" is live. QA: `QA_AS=nomcp` covers a viewer with no connector.
First live check found IMP-321 shown In Progress while Jira has it Done since 18 Sep; the IMP pull fixes that on the first visit.

## Version 12 (28 Sep 2026): published, 1790564600-a345
Phase 3: **personal layer, onboarding and the Guide.** Per-viewer preferences in the private `data/users/<id>/prefs` document
(browser fallback): role, My clients, tours done, hints seen, last tab, last visit. A greeting on the Overview by first name with
what changed since the last visit (client bugs, incidents, work-item updates; for My clients when set), "N waiting on you" (items
where the viewer owes details or an item came back to them) and an All clients / My clients switch that filters Overview, Clients
and Timeline (suggested from the Planhat owner matching the viewer's first name). One welcome card on a first visit (role, my
clients, "Take the 60-second tour", Later, Skip). Spotlight tours for every tab (3 to 6 steps; private tabs only for Ajay), a
one-time floating nudge per tab, a one-line hint the first time each kind of pop-up opens, and the Guide pill (Tours with "What am
I looking at?", Glossary, Ask, You). Ask answers from the page's own help through `sample` (quick tier); for others it is told the
private tabs are private. Feature ledger gains a "Waiting on me" filter. Returning viewers land on their last tab (or their role's).
