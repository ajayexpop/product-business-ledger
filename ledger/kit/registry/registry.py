#!/usr/bin/env python3
"""Logic registry v4 -> v5: spec v1 (Risk, Flow and Investment), 22 Sep 2026.

Adds the spec's 34 rules plus the ones the build needed (each marked 'added in build' in its source),
retires the give/pain/balance rules into one reference rule that keeps their formulas verbatim,
and rewrites the text of existing rules that still described the retired model.
Writes registry/logic.v5.json; the page build embeds the same rules as the seed and publishes it as logic.json."""
import json, os, copy

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(W, 'site', 'logic.json')
OUT = os.path.join(W, 'registry', 'logic.v5.json')
FLOW = json.load(open(os.path.join(W, 'flow', 'flow.json')))
fs = FLOW['summary']

L = json.load(open(SRC))
assert L['version'] == 4 and len(L['rules']) == 152, (L['version'], len(L['rules']))
R = {r['id']: r for r in L['rules']}
SPEC = 'Spec v1, Risk, Flow and Investment, 22 Sep 2026'

def ref(id, group, name, value, why, source, typ=None, drives=None):
    typ = typ or ('longtext' if '\n' in value else 'text')
    r = {'id': id, 'group': group, 'name': name, 'kind': 'reference', 'type': typ, 'value': value, 'why': why, 'source': source}
    if drives: r['drives'] = drives
    return r

def live(id, group, name, value, unit, why, source, drives, mn=None, mx=None, step=None):
    r = {'id': id, 'group': group, 'name': name, 'kind': 'live', 'type': 'number', 'value': value, 'unit': unit,
         'why': why, 'source': source, 'drives': drives}
    if mn is not None: r['min'] = mn
    if mx is not None: r['max'] = mx
    if step is not None: r['step'] = step
    return r

RK, IL, FL, PPG = 'Risk and exposure', 'Investment and liability', 'Flow and rework', 'Pipeline ledger'
MATRIX = 'Risk matrix on the Timeline tab, the Exposure column on the ledger'

new = [
    # ---------------- 7.1 Risk and exposure (11) + 2 the build needed
    live('rk-window-30', RK, 'First risk window', 30, 'days',
         "A bug's severity is not fixed: proximity to the client's next show is a multiplier. A Medium 90 days out is a backlog item; the same Medium five days out is an incident that has not happened yet. The first column holds clients whose next show starts within this many days.",
         'Invented by this dashboard. ' + SPEC + ' §1.3', MATRIX, mn=1),
    live('rk-window-60', RK, 'Second risk window', 60, 'days',
         'The second column: next show after the first window and within this many days. Must sit above the first window and below the third.',
         'Invented by this dashboard. ' + SPEC + ' §1.3', MATRIX, mn=1),
    live('rk-window-90', RK, 'Third risk window', 90, 'days',
         'The third column. Beyond it, and for a client with no dated show at all, the client sits in the none column.',
         'Invented by this dashboard. ' + SPEC + ' §1.3', MATRIX, mn=1),
    ref('rk-window-source', RK, "The window comes from the client's next show, not the bug's event",
        "Client-level: days from the snapshot date to the start of the client's next dated show (ev-next-show). The event a bug names (its ev field) is not used.",
        'Bug-level event attribution exists on some rows but not reliably; client-level is complete. Recorded as a known limitation, not hidden.',
        SPEC + ' §1.3'),
    ref('rk-no-show-clients', RK, 'Clients with no dated show get their own column and an always-on rule',
        'The none column holds clients whose next show is beyond the third window, and clients with no dated show at all. The ones with no dated show have no countdown, so the always-on rule (rk-always-on-days) reads them instead.',
        '9 of the 271 event records are (COMMUNITY), (OTHER) or (EP LITE): year-round engagements running 364 to 1,099 days, where a countdown is meaningless. Without the always-on rule a continuous-service client silently drops out of the risk view.',
        SPEC + ' §1.3'),
    ref('rk-no-tier-row', RK, 'Untiered clients get their own row',
        'Tier 1, Tier 2, Tier 3, Tier 4, then No tier. Every client sits in exactly one row, and the matrix states the count so the check can be read off the page.',
        'K5 GmbH is in Jira and the contract sheet but no longer Phase = Active, so it carries no tier. It must not vanish.',
        SPEC + ' §1.4'),
    ref('rk-no-blend', RK, 'Tier is reported, never blended into a score',
        'Tier and window stay two axes. No figure on the page multiplies or adds them together.',
        'Two Urgents on a Tier 1 client at 20 days and the same on a Tier 4 client are different situations. A blended score would rank them by an exchange rate nobody agreed.',
        SPEC + ' §1.2, principle 4'),
    ref('rk-stories-excluded', RK, 'Open stories are not counted as risk',
        'Counted: open client bugs by severity, non-cancelled incidents, must-haves committed to land after the client\'s show. Not counted: open stories, closed bugs, cancelled incidents.',
        'An open story is work in flight, not a risk. Counting it inverts the signal: a client with twenty stories in flight would rank worse than a client with none, when the client with none is the neglected one. The delivery-side risk signal is the broken-promise rule and nothing else.',
        SPEC + ' §1.5'),
    live('rk-urgent-t12', RK, 'Red: Urgent open, Tier 1-2, show within N days', 30, 'days',
         'Any Urgent open on a Tier 1 or Tier 2 client whose next show starts within this many days turns the client red. Invented here; no upstream authority computes it, so it will need arguing exactly as the severity weights did.',
         'Invented by this dashboard. ' + SPEC + ' §1.6', 'Red flags in the risk matrix and the Exposure column', mn=0),
    live('rk-high-days', RK, 'Red: any High open with a show within N days', 14, 'days',
         'Any High open on any client, any tier, whose next show starts within this many days turns the client red. Spec §1.6 names it rk-high-14.',
         'Invented by this dashboard. ' + SPEC + ' §1.6', 'Red flags in the risk matrix and the Exposure column', mn=0),
    live('rk-ageing-days', RK, 'Amber: bug older than N days with a show inside the second window', 90, 'days',
         'An open bug raised more than this many days ago, on a client whose next show starts inside the second window (rk-window-60), turns the client amber: it is not getting fixed by accident. Spec §1.6 names it rk-ageing.',
         'Invented by this dashboard. ' + SPEC + ' §1.6', 'Amber flags in the risk matrix and the Exposure column', mn=0),
    ref('rk-promise-broken', RK, "Red: a must-have committed to land after the client's show",
        "broken := the pipeline item's Driver is a client\n       AND the item is not Done\n       AND the last day of the item's month falls after that client's next show starts",
        'The sharpest flag here, and binary rather than weighted: an item sitting in October for a client whose show is in September is a broken commitment before anyone reads a number, and the client has already been told. Red at any tier. It can only fire on items with a Driver, so the count of items without one is printed next to it rather than read as zero.',
        SPEC + ' §1.7. Added in build: §1.6 names the rule, §7.1 did not list it', typ='code', drives=MATRIX + ', the month x team grid'),
    live('rk-always-on-days', RK, 'Amber: no dated show, and a High open more than N days', 30, 'days',
         'A client with no dated show gets no countdown, so this reads it instead: any Urgent open, or any High open longer than this many days, turns it amber. Spec §1.6 names it rk-always-on; §7.1 did not list it, so its threshold had no home.',
         'Invented by this dashboard. ' + SPEC + ' §1.6. Added in build', 'Amber flags for clients with no dated show', mn=0),

    # ---------------- 7.2 Investment and liability (9) + the retired rules kept verbatim
    ref('il-not-commensurable', IL, 'Investment and liability are never netted',
        'Investment and liability sit side by side in the ledger and on the two axes of the quadrant. No figure subtracts one from the other, and the word balance is retired.',
        'Custom build is chosen: someone decided to spend those days. A bug is incurred: nobody chose it. A client with heavy delivery and heavy bugs is not balanced; they are getting a lot of attention and a lot of breakage, which is a third story a single line cannot express.',
        SPEC + ' §4.1'),
    ref('il-denominators', IL, 'The two axes have incomparable coverage',
        'Bugs attribute to a client almost completely. Stories attribute at 61 of 650.',
        'One axis is near-complete and the other is 9% complete. A shared chart implies a parity that does not exist, so each axis states its own coverage.',
        SPEC + ' §4.1'),
    ref('il-investment-unit', IL, 'Investment is counts, not days, in v1',
        "What we chose to spend on this client: 2026 stories carrying the client's Jira label, shipped or in progress, plus pipeline items whose Driver is the client. A pipeline item whose ticket is already one of those stories is counted once.",
        'Estimate coverage is 193 of 1,201 stories, so a person-days axis cannot be fed (decision D1).',
        'Decision D1, Ajay, 22 Sep 2026. ' + SPEC + ' §4.2'),
    ref('il-liability-formula', IL, 'Liability = severity x age multiplier + incident points',
        'liability := sum over open bugs of severity_weight x age_multiplier\n           + incident_points x non-cancelled incidents',
        "The old pain figure treated a 400-day-old open bug and a 4-day-old one identically. The shape matters more than the values: a bug open for a year is a worse liability than the same bug raised last week. Severity weights are the sev-* rules; points per incident is incident-points; age is days from creation to the snapshot date.",
        SPEC + ' §4.3', typ='code', drives='Liability column, the quadrant, the Neglected tile'),
    live('il-age-mult-30', IL, 'Age multiplier, 0-30 days', 1.0, 'x',
         'An open bug raised in the last 30 days counts at its plain severity weight.',
         'Invented by this dashboard. ' + SPEC + ' §4.3', 'Liability column, the quadrant, the Neglected tile', mn=0, step=0.05),
    live('il-age-mult-90', IL, 'Age multiplier, 31-90 days', 1.25, 'x',
         'A bug that has survived a month is starting to look structural.',
         'Invented by this dashboard. ' + SPEC + ' §4.3', 'Liability column, the quadrant, the Neglected tile', mn=0, step=0.05),
    live('il-age-mult-180', IL, 'Age multiplier, 91-180 days', 1.5, 'x',
         'A quarter or more open. The same boundary where the Client Bug Score half-life bites.',
         'Invented by this dashboard. ' + SPEC + ' §4.3', 'Liability column, the quadrant, the Neglected tile', mn=0, step=0.05),
    live('il-age-mult-older', IL, 'Age multiplier, over 180 days', 2.0, 'x',
         '29 of the 84 EP open bugs were raised before January 2026; the oldest is from September 2023. A year-old open bug is a worse liability than the same bug raised last week.',
         'Invented by this dashboard. ' + SPEC + ' §4.3', 'Liability column, the quadrant, the Neglected tile', mn=0, step=0.05),
    ref('il-quadrant-lines', IL, 'Quadrant thresholds are the running median, not fixed',
        'High investment and high liability each mean above the median across the Planhat-Active clients, recomputed from the stored data every time the page draws. Healthy partner: high investment, low liability. Expensive and still broken: high on both. Quiet: low on both. Neglected: high liability, low investment.',
        "So nobody reads the lines as absolutes. With most clients carrying no named delivery the investment median is 0, so high investment means at least one item. The two dangerous cells share the high-liability side, one above the other, and need completely different conversations: one is getting a lot of attention and still breaking, the other is breaking and getting none.",
        SPEC + ' §4.4'),
    ref('il-retired', IL, 'Retired 22 Sep 2026: pain, give, balance and the give-and-get chart',
        'pain-formula: sum(severity weight of each open bug) + points-per-incident x non-cancelled incidents\n'
        "give-formula: count of 2026 stories carrying that client's Jira label; shipped and in-progress counted separately\n"
        'top-balance: 14 clients in the give-and-get chart\n'
        'balState: no activity / nothing open / no named delivery / N shipped vs N open\n'
        'Pain, no named delivery (KPI): pain above 0, nothing shipped or in progress',
        'Replaced by investment, liability and exposure (spec v1 §4; decision O2, replace rather than keep both). Two charts answering the same question in contradictory ways is worse than either alone. The formulas stay here verbatim so an old figure can still be reconstructed.',
        'Decision O2, Ajay, 22 Sep 2026. ' + SPEC + ' §4.5'),

    # ---------------- 7.3 Flow and rework (10) + the extraction rules the build needed
    ref('fl-clock-start', FL, 'The flow clock starts at first entry to In progress',
        'Everything earlier is backlog (D2): Awaiting Estimation, Estimated request, Tech Brief, Brief ready for review, Ready for decomposition, Ready for development, Open, Ready to start and PM Review. Backlog time after the clock has started is excluded too.',
        'Consequence: total flow is NOT time-to-customer. On both tickets the spec sampled, the largest single delay sat in Awaiting Estimation, before this clock starts; across the flow sample the median ticket waited %s days between creation and first In progress. Any figure from the Flow tab quoted against a show date must be read that way, and the tab labels it so.' % fs['preStartMedian'],
        'Decision D2, Ajay, 22 Sep 2026. ' + SPEC + ' §5.3'),
    ref('fl-combined', FL, 'Build and handoff is one number, not dev time and QA queue',
        'Build and handoff runs from the first entry to In progress to the first entry to In testing: dev, review, the review queue and the QA queue together.',
        'The deciding rule. On EP-57014 the developer never moved the ticket out of In progress; the QA made both transitions two seconds apart, so In progress silently absorbed the whole handoff. In the flow sample %d of the %d measured QA cycles lasted under 15 minutes: the ticket was moved through In testing after the testing was done. Publishing a split would publish a number known to be wrong.' % (fs['qaPassThrough']['n'], fs['qaPassThrough']['of']),
        'Decision D3, Ajay, 22 Sep 2026. ' + SPEC + ' §5.2'),
    ref('fl-intervals', FL, 'The three measured intervals and their boundaries',
        'Build and handoff: In progress, Code review and merge, Ready for review, In review, Ready for testing.\n'
        'QA cycle: In testing (Task in testing before 15 Sep).\n'
        'Release hold: Ready for release; before 15 Sep also QA Tested, Ready for deploy, Staged for Release, RC approved, Direct Deploy, Merged to Master/Mobile env.\n'
        'Total flow: the three summed. On-hold keeps the interval it interrupted.',
        'Every state belongs to exactly one interval, so the three always sum to the total and a loop back to In progress re-enters build time instead of vanishing. On a first pass the boundaries read In progress, then In testing, then Ready for release, then Done. No hotfix path is split out (D4).',
        SPEC + ' §5.3; decision D4, Ajay, 22 Sep 2026'),
    ref('fl-multiple-visits', FL, 'Time in a state sums across every visit',
        'Time in a state is summed across every visit, not taken from the first. Done is the last move into Done; time spent Done before a reopen is excluded.',
        'A regression loop re-enters In progress; taking the first visit understates it. The incident method documents the same trap: IMP-321 went Testing, Done, Testing, Done, and taking the first done transition understated MTTR by a day.',
        SPEC + ' §5.4'),
    ref('fl-split-stories', FL, 'Parent-level intervals are correct for split stories',
        'Intervals are read at parent level. For a split story the parent sits In progress while sub-tasks do the work, which is the true elapsed build window.',
        'No sub-task roll-up in v1. Defects and Sub-tasks are never rows of their own; they are read as children of their parent.',
        SPEC + ' §5.3 and §5.9'),
    ref('fl-qa-cycle-contains-rework', FL, 'QA cycle contains defect-fix time and is not called QA time',
        'The story stays In testing while its Defects are fixed, so the QA cycle is testing plus fixing.',
        'Calling it QA time would charge QA with developer rework.',
        SPEC + ' §5.3 and §5.5'),
    ref('fl-defect-count', FL, 'Defect sub-task count is the rework volume signal',
        'The Defect sub-tasks under an item. Volume: QA found N problems. The primary quality signal.',
        'A count, not an inferred loop, and it names the developer. EP-57014 carries two live Defects (EP-57602, EP-57658). In the flow sample %d Defects sit under %d items.' % (fs['ladder']['defects'], fs['ladder']['defectItems']),
        SPEC + ' §5.5'),
    ref('fl-loop-ladder', FL, 'The four loop types are reported separately, never summed',
        'Rework: In review to In progress. Caught at review; cheap and healthy.\n'
        'Send back: In testing to In progress. Rare by design, because the normal path is a Defect.\n'
        'Regression failed: Ready for release to In progress. Passed QA and still broke; the release window restarts.\n'
        'Reopened: Done back into the chain. Escaped to production.',
        'Five Defects and no send-back is QA doing its job; one send-back is something else. They read completely differently and must not be summed into a rework score.',
        SPEC + ' §5.5'),
    live('fl-business-days', FL, 'Strip weekends from every flow figure', 1, '1 = on, 0 = calendar days',
         'A story entering In progress at 17:00 on a Friday and worked on Monday would otherwise show three days of build, none of it work: a 60% error on a five-day story. Weekends are stripped in UTC. flow.json stores both, so switching this recomputes nothing.',
         SPEC + ' §5.8', 'Every duration on the Flow tab', mn=0, mx=1),
    ref('fl-holidays', FL, 'Public holidays are not stripped',
        'Weekends only.',
        'The teams span Kyiv, Warsaw, Helsinki and Calcutta with four different calendars, and four holiday tables is more machinery than the accuracy is worth. Recorded as a known overstatement rather than silently absorbed.',
        SPEC + ' §5.8'),
    ref('fl-status-map', FL, 'Every EP status maps to exactly one interval',
        'backlog: Awaiting Estimation, Estimated request, Tech Brief, Brief ready for review, Ready for decomposition, Ready for development, Open, Ready to start, PM Review\n'
        'build: In progress, Code review and merge, Ready for review, In review, Ready for testing\n'
        'qa: In testing, Task in testing\n'
        'release: Ready for release, QA Tested, Ready for deploy, Staged for Release, RC approved, Direct Deploy, Merged to Master/Mobile env\n'
        'pause: On-hold (keeps the interval it interrupted)\n'
        'done: Done, COMPLETE\n'
        'rejected: Rejected, Closed by reject (out of scope)',
        'A status mapped to nothing is time lost silently, so the unmapped-states check must return zero before a rebuild ships. The map covers both workflow generations, because the 15 Sep 2026 migration renamed several states. A new EP status must be added here before the next pull.',
        'Read from the changelogs of the flow sample, 22 Sep 2026. Added in build', typ='code'),
    ref('fl-migration-15sep', FL, 'The 15 Sep 2026 workflow migration',
        'Between 16:45 and 16:55 UTC on 15 Sep 2026 every open EP ticket was bulk-moved to the new workflow: COMPLETE became DONE; RC approved, Staged for Release, QA Tested and Direct Deploy moved to Ready for release; Ready for deploy was renamed QA Tested.',
        'A loop inside that window is the migration, not rework, and is never counted. %d of the sampled rows crossed it inside their release hold; their time is kept, because the migration only relabelled the state.' % fs['migrationTouched']['n'],
        'Read from the changelogs of the flow sample, 22 Sep 2026. Added in build'),
    ref('fl-stale-release', FL, 'A months-old release state closed in the clean-up is not a release hold',
        'A done row that sat more than 20 business days in one pre-migration release state, until the migration moved it, is flagged and left out of the release-hold and total medians. It stays on the Flow tab with its flag.',
        'EP-48822 sat 223 days in RC approved and was closed the day after the migration: its release hold reads the clean-up, not the release train. %d sampled rows match. Principle: a number known to be wrong is not published, and the rows it drops are counted.' % fs['staleRelease']['n'],
        'Read from the changelogs of the flow sample, 22 Sep 2026. Added in build'),
    live('fl-clerical-bounce', FL, 'A loop that comes back within N minutes is a click-through', 15, 'minutes',
         'Moving a ticket back and forth within minutes is a correction, not rework. Loops faster than this are kept on the row, with their timing, but not counted on the ladder. The ladder is recounted from the stored loop events, so changing this needs no new pull.',
         'Invented by this dashboard. Added in build', 'The rework ladder on the Flow tab', mn=0),
    ref('fl-sample', FL, 'The flow figures are a sample until the batch runs',
        FLOW['sample']['design'] + ' The full scope is ' + FLOW['sample']['fullScope'] + '.',
        'Two tickets is not a sample (spec §10); 64 is enough to see the shape and too few to quote a median to a client. The page reads whatever flow.json holds and says which it is, so the batch replaces the sample without a rebuild.',
        'Pulled through the Atlassian connector, 22 Sep 2026. Added in build'),

    # ---------------- 7.4 Pipeline ledger (4) + 3 the build needed
    ref('pp-team-unit', PPG, 'Team is the ledger\'s unit; the person is Raised by and enters no total',
        'Owner is relabelled Raised by. It stays on the row and appears in no roll-up; effort rolls up by team only.',
        'Kavi is a PO; he is not doing 58 days of work. The owner roll-up measured who filled in the form, not who does the work.',
        SPEC + ' §2', drives='Effort by team, the Team filter and grouping'),
    ref('pp-team-source', PPG, 'Team comes from the Jira ticket, else it is a required field',
        "1. The row has a Jira key and the ticket carries a team (customfield_10001): that team.\n2. Otherwise the row's own Team field.\n3. Neither: badged no team, left out of the team roll-ups and counted in the unassigned line beneath them.",
        "One PO spans several teams: Alex's items cross Global Search, Sessions and Networking, so a person-to-team map would not hold. Two rows sit in rule 3 on 22 Sep 2026: the Iyzico migration has no ticket, and EP-57297 is an epic whose ticket carries no team.",
        SPEC + ' §2.2', drives='The Team column, Effort by team, the month x team grid'),
    ref('pp-driver', PPG, 'Driver is a named client or Platform; Tier derives from it',
        "Driver: a client from the Planhat active list, or Platform. Tier: that client's Sales Tier; blank for Platform. Driver is distinct from Priority: Priority says why it is a must-have, Driver says who it is for.",
        'Many must-haves have no client; re-architecting session search is platform work. Forcing it into a tier band would be a lie with a colour on it. Driver unlocks the tier on a row, promise-versus-show, the event overlay and investment per client.',
        SPEC + ' §3.4 and §3.5', drives='Tier, the broken-promise rule, the event overlay, investment'),
    live('pp-why-one-line', PPG, 'Why is one line with a hard limit; long prose moves to Rationale', 140, 'characters',
         "A field that is sometimes a sentence and sometimes an essay cannot be read in a table. The editor enforces the limit. On migration the old text moved to Rationale verbatim and Why started empty, so nothing was lost and nobody's wording was truncated by a machine.",
         SPEC + ' §3.3', 'The Why editor on the Pipeline tab and its over-limit badge', mn=20),
    ref('pp-driver-prefill', PPG, 'Driver was pre-filled only where the row names a client',
        '22 Sep 2026: DLG Markets GmbH (Pipedrive 81808) on the five rows whose Why read "DLG commitment"; IMEX (26874) on EP-57221 ("Critical for IMEX") and EP-57297 (Impact: "Currently a major blocker for IMEX."). The other eleven rows were left blank and badged Driver not set.',
        "A driver guessed from a PO's name or a product area would put a tier on a commitment nobody made. The quoted text is stored on each pre-filled row and shown on its expanded record.",
        'Product decision, Ajay, 22 Sep 2026. Added in build'),
    ref('pp-grid-months', PPG, "The month x team grid runs on the pipeline's own months",
        'Columns are the months the pipeline commits to (Sep 2026 to Jan 2027). Rows are teams, banded by Driver: one band per client with its show dates drawn on the same axis, then Platform, then Driver not set. A cell is the count of committed items and their day total; a click opens them.',
        "The spec asked for the Delivery grid's month set so the two read alike. Those months are all past and the pipeline is all future, so the same set would draw an empty grid; the shape, cells and banding are kept instead.",
        SPEC + ' §3.1 and §3.2. Added in build'),
    ref('pp-grid-overload', PPG, 'Overload is an arithmetic fact, not a capacity model',
        "A team's committed person-days in a month are compared with the weekdays in that month. Above it, the team's cells for that month are marked over.",
        'It says only that the committed days are more than one person could work in that month. Team size and availability are not recorded, so it is not a capacity calculation and must not be read as one.',
        SPEC + ' §3.1. Added in build'),
    ref('src-stored-json', 'Source queries', 'Computed once, stored as JSON, never re-pulled on page load',
        'LEDGER and HYVE, inline JSON in the page: the Jira, Planhat, Drive and OP pulls.\n'
        'logic.json: this registry.\n'
        'The shared database: the pipeline ledger and its column schema.\n'
        'flow.json: the changelog read, every transition and per-state duration, and the summary the Flow tab draws.',
        'The changelog read is one call per issue and takes minutes; it must not run on every view. The page only does arithmetic over stored values and live rules, so a changed rule recomputes instantly and a refresh is a deliberate step with a date on it.',
        'Product decision, Ajay, 22 Sep 2026. Added in build'),
]

# ---------------- retire
RETIRE = ['pain-formula', 'give-formula', 'top-balance']
rules = [copy.deepcopy(r) for r in L['rules'] if r['id'] not in RETIRE]
ids = {r['id'] for r in rules}
for r in new:
    assert r['id'] not in ids, r['id']
    ids.add(r['id'])

# ---------------- rewrite rules that still described the retired model
def patch(id, **kw):
    r = next(x for x in rules if x['id'] == id)
    r.update(kw)
    return r

for sid in ('sev-urgent', 'sev-high', 'sev-medium', 'sev-low'):
    patch(sid, group='Severity weights',
          drives='Liability (with the age multiplier), severity mix, bugs-by-client chart, timeline lower strip, bug sort order')
patch('incident-points', group='Severity weights', drives='Liability on the ledger, the quadrant and the Neglected tile')
patch('story-attribution', why='Much weaker than the bug side, and the asymmetry is the point: it is why investment and liability are never netted (il-not-commensurable) and why the Investment column is a question to ask, not an answer.')
patch('hv-exclude', drives="Every view. Hyve's Shipped, In progress, Investment, Open bugs, Severity mix and Liability; the open-client-bugs tile; the timeline, delivery and bugs tabs")
patch('hv-bugs-pain-only', name='HV bugs are liability, never delivery',
      value='An open HV bug joins Hyve\'s liability and the lower timeline strip exactly like an EP client bug. A closed HV bug counts nowhere: 26 fixed bugs in scope appear on no figure here.',
      why='This keeps Hyve comparable with the other 48 clients on both axes, because that is precisely how EP bugs already work: open bugs are liability, bug fixes are not counted as investment. The cost is that the team\'s bug-fixing throughput is invisible on this board. That number belongs on the HV delivery board, not here.',
      drives="Hyve's liability, severity mix and open bug count")
patch('hv-comparability',
      value='With HV counted, Hyve is the largest row on this board on both axes. Investment goes from 21 to 75 against IMEX at 17; liability goes from 12 to 67.8 against Frankfurter Buchmesse at 66.5 (measured 22 Sep 2026 with the default rules).',
      drives='How every ranking, the quadrant and the Neglected tile should be read')
patch('hv-preq2-bugs',
      why=next(x for x in rules if x['id']=='hv-preq2-bugs')['why'].replace("add 7 to Hyve's pain", "add three bugs, 7 severity points before the age multiplier, to Hyve's liability"),
      drives="Hyve's open bug count, severity mix and liability; the open-client-bugs tile; the timeline's Pre-2026 and March columns")
patch('hv-delivered',
      why='Backlog items are not delivery and do not enter investment. Rejected items are counted nowhere at all: not as delivered, not as in flight, not as liability.')
patch('gap-story-labels', why='The investment axis is thin by construction (il-denominators). The platform band keeps the unattributed work visible without inventing attribution.')
patch('ev-exposure', why='The forward indicator the KPI row carries: 13 of the 18 clients with a show inside 90 days go into it with an Urgent or High still open. It is binary, so the risk matrix on the Timeline tab (rk-*) is the fuller reading: it splits the same book by tier and by window and says which rule fired.')
patch('pp-source', value='Rows and the column schema live in this artifact\'s shared database. The Confluence page is a snapshot of 18 Sep 2026 and now points here. Schema 2 (22 Sep 2026) added Team, Driver and Rationale and cut Why to one line.')

rules.extend(new)
out = {'version': 5, 'updated': '2026-09-22', 'rules': rules}
json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
from collections import Counter
print('rules', len(rules), '| added', len(new), '| retired', len(RETIRE))
print(Counter(r['group'] for r in rules))
print('live', sum(1 for r in rules if r['kind'] == 'live'))
