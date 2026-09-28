# Business Ledger Preview (redesign, 26 Sep 2026)

Preview artifact: https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d (separate from the live ledger, its own database).

- `src/` is the full source of the redesign (rebuilt Timeline, one button system, explanations tucked away,
  quadrant labels removed, new severity colours). It equals the repo's `src/` at the time the preview was published.
- The preview build is `tools/ledger.py build` plus one line injected after `<title>` (see below), which makes
  Requests and Rules read-only and adds the "Preview" ribbon. The live build never carries it.
- `live-preview.html` is the preview as published (version 3, 1790447215-a5e0).
- The preview also carries the rebuilt event layer (`data/ledger.json` events, from `tools/events.py`); promoting it means publishing that data too.

## Why this folder exists
`tools/ledger.py check` re-splits the LIVE ledger into `src/`, which would overwrite the redesign. Until the owner
chooses, restore with `rm -rf src && cp -R preview/src src` after any check.

## To promote the preview to the live ledger
1. Re-read the live ledger (update cycle step 1); confirm nothing changed since v6 (1790390142-29fe), or merge.
2. `cp -R preview/src/. src/`, then retire the quadrant wording in `live/logic.json` (il-quadrant-lines and the
   "drives" lines that name the quadrant or the Neglected tile), then `python3 tools/ledger.py build`.
3. Publish `dist/index.html` (no preview line) to https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G with
   `files` = `logic.json`; omit `capabilities`.

Preview line: `<script>window.LEDGER_PREVIEW={live:"https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G"}</script>`

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
