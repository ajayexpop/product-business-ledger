# Flow: where a story's time goes (parked exploration)

**Status:** the Flow tab was taken off the ledger on 26 Sep 2026 at the owner's request ("remove the flow tab for now"). This file keeps its logic so it can come back without re-deriving it. Nothing here is on the page any more, apart from the one-line flow summary on a story card (see "What still uses it").

**Data:** `live/flow.json` (version 2, pulled 22 Sep 2026 21:47 UTC, computed 22:26 UTC). It holds the Jira EP changelog for a **sample of 64 issues**: 50 EP stories and bugs that reached Done between 2 and 22 Sep 2026 (35 stories, 15 bugs), plus 15 pipeline tickets still in flight. Seven more were pulled and excluded with a reason. It was read with `expand=changelog` through the Atlassian connector. The full scope, about 1,200 EP stories and bugs created in 2026, is a scheduled batch, not a chat task (`fl-sample`).

**Rules:** the `fl-*` rules stay in the registry (`live/logic.json`, Rules tab). They are quoted below.

---

## 1. The question it answered

When a story takes long, is the time in build, in QA, or waiting for release, and where do tickets pile up? It is not time-to-customer.

## 2. The clock

- **The clock starts at the first entry to In progress** (`fl-clock-start`). Everything earlier is backlog and is never counted. That covers Awaiting Estimation, Estimated request, Tech Brief, Brief ready for review, Ready for decomposition, Ready for development, Open, Ready to start and PM Review. On the two tickets the spec sampled, the largest single delay sat in Awaiting Estimation, before this clock starts. In the sample, the median ticket waited **3.9 days** between creation and its first In progress.
- **Time in a state is summed over every visit** (`fl-multiple-visits`). Done means the last move into Done; any time spent Done before a reopen is excluded.
- **Weekends are stripped, in UTC** (`fl-business-days` = 1, live). `flow.json` stores both business-day and calendar figures, so switching the rule recomputes nothing. Public holidays are not stripped (`fl-holidays`): the teams span four national calendars.
- **Parent level only** (`fl-split-stories`). Sub-tasks and Defects are never rows of their own; they are read as children of their parent.

## 3. The three intervals (`fl-intervals`, `fl-status-map`)

Every EP status maps to exactly one interval, so the three intervals always add up to the total.

| Interval | From → to | States |
|---|---|---|
| **Build and handoff** | first In progress → first In testing | In progress, Code review and merge, Ready for review, In review, Ready for testing |
| **QA cycle** | In testing → Ready for release | In testing (before 15 Sep: Task in testing) |
| **Release hold** | Ready for release → Done | Ready for release (before 15 Sep also QA Tested, Ready for deploy, Staged for Release, RC approved, Direct Deploy, Merged to Master/Mobile env) |
| **Total flow** | In progress → Done | the three summed |

- **On-hold** keeps the interval it interrupted.
- **Done** means Done or COMPLETE. **Rejected** means Rejected or Closed by reject, which is out of scope.
- A status mapped to nothing loses time silently. The unmapped-states check must return zero before a rebuild ships, so a new EP status has to be added to the map before the next pull.

**Why build and handoff is one number** (`fl-combined`). On EP-57014 the developer never moved the ticket out of In progress. The QA engineer made both transitions two seconds apart, so In progress silently absorbed the whole handoff. In the sample, **22 of 46** measured QA cycles lasted under 15 minutes: the ticket was clicked through In testing after the testing was done. Splitting dev time from the QA queue would publish a number known to be wrong.

**The QA cycle includes fixing** (`fl-qa-cycle-contains-rework`). A story stays In testing while its Defects are fixed, so this is testing plus fixing. Calling it "QA time" would charge QA with developer rework.

## 4. Rework: volume and severity, never summed (`fl-loop-ladder`)

| Signal | Definition | Reads as |
|---|---|---|
| **Defects** (volume) | Defect sub-tasks under the item (`fl-defect-count`) | QA found N problems. The primary quality signal. The sample has 55 Defects under 8 items |
| **Rework** | In review → In progress | Caught at review: cheap and healthy |
| **Send back** | In testing → In progress | Rare by design, because the normal path is a Defect |
| **Regression failed** | Ready for release → In progress | Passed QA and still broke; the release window restarts |
| **Reopened** | Done → back into the chain | Escaped to production |

- **Click-throughs are not rework** (`fl-clerical-bounce` = 15 minutes, live). A loop that comes back within 15 minutes is kept on the row with its timing, but not counted. The ladder is recounted from the stored loop events, so changing the threshold needs no new pull.
- **The 15 Sep 2026 migration** (`fl-migration-15sep`). Between 16:45 and 16:55 UTC every open EP ticket was bulk-moved to the new workflow. Loops inside that window are the migration, not rework, and are never counted. The time is kept, because the migration only relabelled states; 24 sampled rows crossed it inside their release hold.
- **Stale release states** (`fl-stale-release`). A Done row that sat more than 20 business days in one pre-migration release state, until the migration moved it, is flagged and left out of the release-hold and total medians. For example, EP-48822 sat 223 days in RC approved. Four sampled rows match.

## 5. What the tab drew

1. **Median tiles** for each interval, each with how many tickets it rests on, how many could not be measured and why, and how many skipped the stage. A fifth tile gave "QA cycles under 15 minutes: n of N".
2. **Queue depth over time:** sampled tickets in each stage at the end of each day, one line per stage, with the 15 Sep migration marked. How to read it:

   | Pattern | Diagnosis | Fix |
   |---|---|---|
   | Ready for testing deep, In testing shallow | QA capacity | hire or reallocate |
   | Ready for testing deep, In testing also deep | Arrival rate: QA is working, dev is over-feeding | cap work in progress |

3. **Rework ladder:** Defects first, then the four loop types, each with its item count, plus the tickets with more than one counted loop.
4. **Per-team medians** for each interval, with n, not-measured and skipped counts.
5. **Worst offenders:** longest total flow (final totals only) and most Defects, each with its flags.
6. **Every sampled ticket:** a table of all 64 rows plus the 7 excluded with a reason. Figures that aren't final are greyed.
7. **Reconciliation checks:** six checks from spec §6.3, stored in `flow.json`. Every one must pass before a rebuild ships.

Clicking any ticket opened its full record: intervals, time before the clock, driver and tier, flags, time in each state (business, calendar, visits), loops, Defects, and every transition with who made it.

## 6. `flow.json` shape

`{version, pulledAt, computedAt, source, computedWith, sample, rules, summary, checks[6], rows[64], excluded[7]}`

- **Each row:** `key, summary, type, team, status, priority, done, measurable, unmeasurableReason, intervals{buildHandoff,qaCycle,releaseHold,total}, intervalsCalendar{...}, complete{...}, skipped[], incomplete{}, preStartDays, states{<state>:{interval,bd,cd,visits}}, loopEvents[{at,from,to,type,minutesAway,migration}], defects{count,open,keys[]}, flags[{code,text}], transitions[{at,from,to,by}], history{returned,total}, driverName, driverBasis, tier`.
- **`summary`:** `medians, mediansCalendar, byTeam, byTeamCalendar, byTeamMonth, queue{days[],depth{<stage>:[...]}}, ladder{defects,defectItems}, qaPassThrough{n,of}, preStartMedian, worstFlow, worstFlowCalendar, worstDefects`.

## 7. What still uses it

- **Story cards** (Delivery tab, Client 360) still show a "Flow (changelog)" line for the 64 sampled stories, which opens the per-ticket record above. It reads `flow.json` and the same `fl-*` rules.
- **The renderer is left in `src/main.js`** as `renderFlow()` and `flQueue()`. It does nothing while `#panel-flow` is absent. Restoring the tab means adding back one tab button and one empty `<section class="panel" id="panel-flow" role="tabpanel" hidden></section>`.

## 8. Before it comes back

- Run the full batch (about 1,200 issues) so medians rest on more than a fortnight around the migration.
- Add any EP status created since 22 Sep to `fl-status-map`.
- Split medians by month once the batch spans more than one month (`byTeamMonth` is already stored).
