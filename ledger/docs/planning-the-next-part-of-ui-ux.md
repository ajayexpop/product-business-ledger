# Planning the next part of UI / UX

Status: **planning only — nothing here is built yet.** Owner: Ajay. Written 29 Sep 2026, from the read-only UX walk of the live ledger (all 11 tabs rendered locally via the QA harness, plus Client 360, Must-have board, phone width and the non-owner view) and the 29 Sep call with Ilaria.

The live ledger (https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d) stays the source of truth throughout; every step below is `src/` work published in place through the normal update cycle (CLAUDE.md). No new artifacts, no data-model changes.

**Diagram of this plan:** https://claude.ai/artifact/9QGLoezhu8tJYezDMRHhEq (source `docs/diagrams/next-ui-structure.html`) — Figure 1 the tab remap, Figure 2 the Home lenses, Figure 3 the intake pipeline, Figure 4 the drawer/deep-link layer.

---

## 1. What the walk found

**Keep:** the client-first data model, the wiring and provenance (refresh status, counts, "How to read this"), and the Client 360 — the best surface in the product. The problem is not content; no screen knows who it is talking to.

1. **The nav is organized by data source, not by question.** Requests / Demand / Delivery / Bugs / Incidents are five tabs because they are five pipelines. A TAM's question spans five tabs; Product's spans three; Engineering's spans two plus half of Overview.
2. **Overview is two personas fused.** Left column (What needs attention, Next 8 weeks, Event radar) is a great Operations landing page; right column (Team pressure, Oldest bugs) is an Engineering board. Side by side they produce the "a lot going on" feeling.
3. **The same question is answered in three vocabularies.** "What is the client asking for" = needs (Demand), requests/work items (Requests), "what they're asking for" (360). Five status vocabularies meet a new reader: feature-ledger stages, must-have statuses, raw Jira statuses, bug states, event flags.
4. **Every tab reinvents its filter bar** — same dimensions, different order and controls each time.
5. **The Clients table leads with expert jargon**: PlanHat Health, Quality penalty, Investment, Liability, Exposure — unexplained at first glance; 14 columns.
6. **Timeline is expert-grade density at top level** — a drill-down view sitting as a peer of Clients.
7. **The page already knows roles** (onboarding stores one; "My clients" exists) **but the IA ignores it.**
8. **The work-item form is ~20 fields across three sections.** The call was explicit: TAMs will not fill it. (See §5.)

## 2. Principles (apply to every step)

1. **Audience-first.** Every screen knows who it is for.
2. **One grammar.** One filter bar, one status ladder, one word per concept, one severity ramp, one legend — learned once, true everywhere.
3. **Visual first.** A fact appears as a mark readable at a glance — a bar, a dot trail, a step ladder, a countdown — with the number beside it. Never a bare figure or prose count. Text explains; it does not carry the data alone.
4. **Everything linkable.**
   - *Drill-through:* every stat tile, bar segment, chip and row opens its members. **If a number cannot be clicked to see what is inside it, it does not ship.**
   - *Addressable:* every tab, role lens, client, work item and need has a stable anchor (`#clients`, `#role-engineering`, `#client-hyve-group-plc`, `#item-le-2026-0001`, `#need-<id>`), and every drawer has a **Copy link** button. Artifact links carry plain anchor tokens only, so the whole state lives in one slug.
5. **Evidence or empty.** Anything AI-produced carries its source (KB verdict, story key, need id) or stays blank. Value figures are entered by named humans only. (Carried over from the KB skill's fail-closed design; governs §5.)

## 3. The structure: 11 tabs → Home + 5

| Tab | What it becomes |
| --- | --- |
| **Home** (replaces Overview) | Role-aware: Product / Sales / Ops·CS / Engineering / Leadership. Uses the role onboarding already stores + a visible switcher (a view, not permissions — the permission matrix stays deferred, as agreed with Ilaria). Each lens: 3–4 stat tiles + top 5 "act on this" rows, all deep-linking into the tabs below. **No revenue figures on the Leadership lens (Tanya's rule).** |
| **Clients** | Absorbs Timeline as a `Table \| Timeline` toggle. Health circle switches from PlanHat to the bugs+incidents score already computed. Investment / Liability / Exposure behind an "expert columns" toggle. Default row: client, tier, owner, open problems, delivered, next show. |
| **Work** | Feature ledger + Must-have + Delivery as `Asks in flow \| Must-have \| Being built & shipped`. One lifecycle in one place. Intake lives here (§5). |
| **Demand** | As is — already the strongest surface. |
| **Quality** | Bugs + Incidents merged; receives Team pressure and Oldest bugs from Overview. Views: `Open bugs \| Incidents \| Pressure before shows`. |
| **How it works** | Unchanged, Ajay-only. |

Home lens per department: **Ops·CS** = today's Overview left column unchanged; **Engineering** = Team pressure + Oldest bugs + open incidents; **Product** = top demand signals + must-have load by month + delivery in flight; **Sales** = renewals coming up (with each client's open bugs/asks), tier-1 asks, client-driven must-haves.

## 4. The visual layer and the linkable layer

### Visual, surface by surface

| Surface | Today | Becomes |
| --- | --- | --- |
| Home tiles | — (new) | Stat tiles with an inline mark: "101 open bugs" carries a small severity-split bar; "13 of 19 shows" a filled-fraction bar. Every tile clicks through to its pre-filtered tab. |
| Home role rows | — (new) | Reuse existing blocks unchanged: radar cards (Ops), pressure bars + age list (Eng), signal bars (Product), renewal rows with countdown bars (Sales). |
| Clients table | 14 columns, 4 unexplained scores | Every count becomes a mark: severity mix stays; health = derived score dot on the shared ramp; renewal = countdown bar; next show = proximity chip (Act now / Watch / Clear — exists); delivery = shipped·in-progress split bar. Score columns hidden by default. |
| Timeline (inside Clients) | dense mirrored chart + grid | Kept for experts; "How to read this" becomes one annotated example row, not prose. |
| Client 360 | mostly lists | Add a one-line **year strip** at the top (12 months: delivery above, problems below — the Timeline cell language in one row) and a countdown bar to the next show. |
| Work | KPI strip + table/board | The **status ladder is the visual spine**: the step-dot progress on each row is promoted to the section header (items per step, clickable segments). Must-have month columns get load bars (committed days) instead of bare "37d". The swimlane flow pop-up is linked from the ladder. |
| Demand | heat table + ranked bars | Customer chips in a need open that client's 360; tier legend becomes the shared tier chip. |
| Quality | two bar charts + tables | Add the age waterfall (the 90+ days story told visually); every bar segment filters the table below it. |
| Everywhere | varied legends | One legend component: severity ramp, tier chips, status ladder, event flags — same colours, same order. |

### Linkable, concretely

- One canonical opener per entity: client → 360; work item / must-have → item drawer (same pattern as the 360); need → need drawer; bug/incident → row expand + Jira; event → the client's 360 scrolled to shows.
- Cross-links close today's dead ends: need's customers → each 360; 360's asks → Demand filtered to that client; must-have's driver → the client; bug row's client + show → the 360; Home tile → its tab pre-filtered to exactly that count.
- **Copy link** on every drawer and addressable view state.
- QA enforces it — two new checks in `qa_probe.js`: **no dead number** (every `.kpi`, `.ov-stat`, chart segment and chip navigates or filters; promote the existing "clicks that changed nothing" note to a failure for these elements) and **link round-trip** (every generated anchor, loaded fresh, lands on the right view).

## 5. Intake: from a 20-field form to an evidence-grounded AI drop

**Problem.** The "Log a new work item" form does three jobs at once: *capture* (what the TAM knows), *grounding* (duplicate? already built? what does the platform do today?), and *valuation* (the four levers + figure). Only capture belongs to the TAM. The call (29 Sep): TAMs won't fill long forms, they lose trust in workarounds, and the shortest viable ask is **what / why / outcome (+ client)** with value explicitly *not* mandatory for them.

**Design: split the three jobs.**

1. **Drop (TAM, ~30 seconds).** One to three lines + the client. Optionally a transcript, screenshot or Fathom link. Two doors, same engine:
   - **In the ledger** (Requests tab): a "Drop a feature" box on the page's existing `sample` capability — the Ask-AI duplicate search in the form already proves the mechanic in-page.
   - **In Claude chat**: the same skill for TAMs who live in Slack/Claude or have rich inputs; its confirmed output is written into the ledger's database so everything lands in one place. The ledger stays the single source of truth.
2. **Grounding (AI, automatic, evidence or empty).** A new thin **`feature-intake` skill** that *composes* (not rewrites) the existing evidence assets:
   - `expoplatform-current-platform` (KB `kb/legacy/`, verdict-carrying, fail-closed) → *"what does the platform do today?"* — kills requests that are really configuration questions;
   - the roadmap/built index (`analysis/stories.json`, journey built features, demand's 558 built stories) → *"already built or started?"*;
   - the demand map (1,122 needs, duplicate marks) → *"already asked?"*.
   Output: a verdict (**duplicate / extends existing / new**, with the ids), and a draft what / why / outcome / who's affected / surfaces touched (admin, web, app, API, reports — the checklist from the call). Every filled field carries its citation; every unknown field stays blank and is listed as a question.
3. **Questions (AI, max 3).** The question set = the intake field list Ilaria owes with importance ratings (her action item from the call). The skill asks only the top gaps, never the whole list.
4. **Human loop 1 — TAM confirms** the draft (edit or approve, ~2 minutes).
5. **Human loop 2 — Value (never AI).** Routed to sales or a named colleague through the feature ledger's existing hand-off: the four levers, the figure, funded / not funded, existing-revenue-growing. AI may *suggest which lever fits* with its reasoning, but a human enters every figure and signs it.
6. **Lands as a logged work item** with evidence attached, stage set, and the completeness meter (already on every row) showing honestly what is still missing — instead of a wall of required fields up front.

**Why this route over the alternatives considered:**
- *Just shorten the form* — loses the grounding entirely; the dump grows back.
- *Confluence Feature Intake Staging only* — already exists and feeds Demand; keep it as a source, but it is outside the single source of truth and its output still needs the same grounding.
- *A separate intake chatbot product* — a new tool to distrust; the ledger + a skill reuses what people already open.

**Acceptance for intake:** TAM time-to-log under 3 minutes; zero AI-invented values (spot-check: every filled field has a citation); duplicate catch demonstrated on 5 real past requests replayed through the skill and compared with what actually happened to them; value fields only ever carry a named human's entry.

## 6. Migration steps — each independently publishable

Normal cycle every time: re-read live → `check` → edit `src/` → `build` → QA (1440 + 1100, as owner and `QA_AS=other`) → publish in place.

1. **Quality tab.** Merge Bugs + Incidents; move Team pressure + Oldest bugs off Overview; age waterfall; segment-filters-table wiring.
2. **Clients absorbs Timeline.** View toggle; derived health score replaces the PlanHat circle; expert-columns toggle; countdown/proximity marks.
3. **Home role lenses.** Compose existing blocks per role behind the switcher; stat tiles with inline marks; every tile deep-links; Leadership lens carries no revenue figures.
4. **Work unification.** Delivery folds in; status ladder as the visual spine; month load bars; item drawer with Copy link.
5. **Grammar + link pass.** Shared filter bar; reader-facing status ladder (Logged → Signed → Scheduled → Building → Shipped; raw status on hover); naming pass (Asks / Promises / Delivery / Problems); anchor scheme + Copy link; the two new QA checks on.
6. **Intake, part 1 — the short form.** The in-page form collapses to what / why / outcome / client + optional attachments; everything else moves behind the draft-confirm flow; value stays a hand-off.
7. **Intake, part 2 — the `feature-intake` skill.** Build the composing skill; replay 5 real past requests as the test; freeze the question set with Ilaria's field list; wire the in-page "Drop a feature" box (`sample` capability) and the chat route's write-back into the ledger database (with history entries, `by` recorded).
8. **Retire the PlanHat pull** once step 2 has survived a week — its last consumer is gone.

Steps 1–5 are pure `src/`; 6 is `src/`; 7 adds a skill and one publish; 8 removes code. Order of 6–7 can swap after 1 if intake is the hotter pain.

## 7. Acceptance tests — the definition of "cohesive"

- **The Chris test:** each Home lens and each tab is understandable with zero explanation — every score names itself, every mark uses the shared legend.
- **The no-dead-number test:** QA reports zero unclickable stats.
- **The link test:** any state worth discussing in a meeting can be pasted as one link.
- **The Ilaria test:** big numbers first, drill-down second, on every view — no tab opens on a wall of rows.
- **The intake test:** §5 acceptance — under 3 minutes, evidence or empty, value human-only.

## 8. Decisions still open

- Final tab names (Asks / Promises / Delivery / Problems vs today's words) — decide at step 5.
- Whether Leadership is a fifth lens or a variant of Product — decide at step 3.
- The intake question set — waiting on Ilaria's field list with importance ratings (her action item, 29 Sep call).
- Who the named value-enterers are per client (sales owner mapping) — needed for step 6's hand-off routing.
- Whether the chat route writes items as `draft` needing TAM confirmation in-page, or as fully logged — decide at step 7.

## 9. Intake matching, linking, call evidence and onboarding (agreed 29 Sep 2026, built in the Rewire Preview)

Working in the preview (https://claude.ai/artifact/BUv7s6D31RAuodnBFsqJ7o, v4). The future feature-intake skill uses the same sources and rules.

**Four sources for every match**, each labelled on screen:
- Asked: the 1,122 demand needs, with the customers behind each.
- Built: the 2,494 stories finished since January 2023, named by their Product Journey feature and quarter (`analysis/stories.json`, `data/roadmap/tags.json`).
- Being built: the 114 in-progress and 720 not-started stories, plus open must-haves.
- Platform today: the 1,828 platform statements the code study confirmed fully or partly (`kb/legacy` baseline via `ask.json`).

**Match percentage.** Worked out as the TAM types: the share of the important words in their ask found in each item (title words count more), lifted when the same client is behind the item. It is a similarity score, not a probability, and says so on hover. "Match and draft with AI" re-scores the top candidates with a reason for each; the AI figure then leads.

**Business messages.** Worded by source and percentage, for example: "You’re thinking what 11 other clients are thinking. This is a 92% match with a need already raised by …; add your client and it moves up the queue"; "Your client is already one of the 11 asking for this"; "Good news: we may have built this already, 88% match with a feature shipped in Q2 2024"; "This looks new. Nothing close in three years of requests and delivery". A summary line counts the other clients whose asks match.

**Linking.** Asked and not-started items: "Add to my ask" (same thing, part of it, related); their clients join the ask's combined signal, and on "same thing" their tickets are listed to close when the ask ships. Built items: "Extend this feature" (logged as an enhancement with the shipped feature as its base; its original clients show as context but add no signal) or "Already exists" (no new ask; still counts as evidence of demand). Platform statements: "Already exists". In-flight work: "Follow it". The live ledger's work items already carry a related-items field for this.

**Call evidence (Fathom).** The TAM pastes a Fathom link; the page uses that viewer's own Fathom connection (`get_recording_by_url`, `get_meeting_transcript`) to fetch the transcript, shows the moments that match the ask, and the AI draft cites moments by timestamp with a link that opens the recording there. Declaring the connector means the page cannot be shared by public link.

**Voice.** The claude.ai frame blocks the microphone, so there is no record button. Device dictation into the fields works today (hint under the field); the Fathom call is the richer route; voice mode in the Claude app comes with the skill.

**Onboarding for everyone.** First-visit welcome with a role choice, a spotlight tour per role, a walkthrough of dropping a feature on a marked example, one-time hints per tab, and a Guide button (bottom right) to replay any of it. Progress is kept in the viewer's browser.

**The journey (revised 29 Sep 2026 after review).** Four steps with a progress bar, one visible at a time: 1 Describe (client and what required), 2 Check matches (link, then choose: new need, builds on what I linked, already built), 3 Review (AI suggestions under each editable field with "Use this"; questions become answer boxes; never internal labels), 4 Send (summary card, colleague who adds the value, "Log and hand off to sales" or "Record as already built"), then a confirmation that says what happens next. A disabled button always names what is missing.

## 10. Feature requests as ideas anyone can share (agreed 29 Sep 2026, built in the Rewire Preview v6)

- **Names.** Demand is now **Feature requests** everywhere. A feature request is one idea; each time someone raises it is a mention.
- **Share a feature request** is separate from taking a request to the pipeline. Anyone shares in under a minute: choose the client, then speak or type, paste a Fathom link or paste a chat. AI fills what, why and outcome (people can add to it, replace it or speak over it), and can pick the client from a call. "Is this it?" offers one-tap joins with the closest requests, or "already built". Before saving, AI tidies the wording and the person chooses which version to keep. A duplicate is never wasted: the confirmation shows the client count and signal before and after, plus at most one question that fills a real gap.
- **Stored, not logged in Jira.** Shares go into the preview's own store and strengthen existing requests; new ideas become new requests that later shares can join. An admin queue suggests merges. When the rewire moves into the live ledger, the store moves with it.
- **Take it to the pipeline** starts from any feature request and runs the four steps, with the same tidy before sending.
- **Admins** are the owner plus anyone with edit access. The Test lab gives test mode, scenarios, view as a colleague, signal before and after, the merge queue and an AI inspector.
- **Skill.** A feature-request skill for Claude chat and voice mode comes after this flow settles, with the same two modes and rules. Check the "ExpoPlatform Intake" claude.ai connector first as the way for the skill to write into the store.
