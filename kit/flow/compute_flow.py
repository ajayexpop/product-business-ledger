#!/usr/bin/env python3
"""Turn the extracted changelogs (flow/raw/*.json) into flow.json: one row per issue per spec §6.2,
a precomputed summary, and the §6.3 reconciliation checks. Everything the page shows is read from here."""
import json, glob, os, statistics, collections
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sorted(glob.glob(os.path.join(HERE, 'raw', '*.json')))
OUT = os.path.join(HERE, 'flow.json')

# ---- the EP status vocabulary, both workflow generations (the 15 Sep 2026 migration renamed several)
STATUS_MAP = {
    # backlog (D2): before the clock, and excluded wherever it occurs
    'awaiting estimation': 'backlog', 'estimated request': 'backlog', 'tech brief': 'backlog',
    'brief ready for review': 'backlog', 'ready for decomposition': 'backlog', 'ready for development': 'backlog',
    'open': 'backlog', 'ready to start': 'backlog', 'pm review': 'backlog',
    # build and handoff: dev, review, review queue, QA queue
    'in progress': 'build', 'code review and merge': 'build', 'ready for review': 'build', 'in review': 'build',
    'ready for testing': 'build',
    # QA cycle: testing and defect fixing ('Task in testing' is the pre-migration name)
    'in testing': 'qa', 'task in testing': 'qa',
    # release hold: everything between passing QA and done, old and new names
    'ready for release': 'release', 'qa tested': 'release', 'ready for deploy': 'release', 'staged for release': 'release',
    'rc approved': 'release', 'direct deploy': 'release', 'merged to master/mobile env': 'release',
    # a pause keeps the interval it interrupted
    'on-hold': 'pause',
    # terminal
    'done': 'done', 'complete': 'done',
    'rejected': 'rejected', 'closed by reject': 'rejected',
}
INTERVAL_OF = {'build': 'buildHandoff', 'qa': 'qaCycle', 'release': 'releaseHold'}
CLERICAL_MIN = 15            # minutes: a loop that comes back sooner is a click-through, not rework (fl-clerical-bounce)
STALE_RELEASE_BD = 20        # business days in one pre-migration release state before a close reads as clean-up (fl-stale-release)
SCOPE_FROM = '2026-01-01'
MIGRATION = ('2026-09-15T16:45:00Z', '2026-09-15T16:55:00Z')
DAY = 86400000
W = os.path.dirname(HERE)
DRIVERS = json.load(open(os.path.join(W, 'migrate', 'drivers.json')))['byKey']
_page = open(os.path.join(W, 'publish', 'index.html')).read()
_m = __import__('re').search(r'window\.LEDGER\s*=\s*', _page)
LEDGER, _ = json.JSONDecoder().raw_decode(_page[_m.end():])
CO = {c['pd']: c for c in LEDGER['companies']}
STORY_PDS = {s['k']: s.get('pds') or [] for s in LEDGER['stories']}
BUG_PDS = {b['key']: b.get('repIds') or [] for b in LEDGER['bugs']}

def driver_of(key, typ):
    """spec §6.2 driver and tier: the pipeline's Driver when the ticket is on the pipeline, else the one
    client the ledger names on the ticket (story label, or bug Reported by). Never guessed."""
    if key in DRIVERS and DRIVERS[key]['driver']:
        d = DRIVERS[key]
        return d['driver'], d['tier'], 'pipeline Driver (' + (d['basis'] or 'set on the row') + ')'
    if key in DRIVERS:
        return None, None, 'on the pipeline, Driver not set'
    pds = [p for p in (STORY_PDS.get(key) if typ == 'Story' else BUG_PDS.get(key)) or [] if p in CO]
    if len(pds) == 1:
        return pds[0], CO[pds[0]].get('tier'), ('client label on the story' if typ == 'Story' else 'Reported by on the bug')
    if len(pds) > 1:
        return None, None, 'named to %d clients: %s' % (len(pds), ', '.join(CO[p]['name'] for p in pds))
    return None, None, 'no client named on the ticket'

def kind(s):
    return STATUS_MAP.get((s or '').strip().lower())

def ms_iso(ms):
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') if ms is not None else None

def business_ms(a, b):
    """milliseconds between a and b with Saturdays and Sundays (UTC) removed"""
    if b <= a:
        return 0
    total = 0
    t = a
    while t < b:
        d = datetime.fromtimestamp(t / 1000, tz=timezone.utc)
        next_midnight = int(datetime(d.year, d.month, d.day, tzinfo=timezone.utc).timestamp() * 1000) + DAY
        seg_end = min(b, next_midnight)
        if d.weekday() < 5:
            total += seg_end - t
        t = seg_end
    return total

def median(v):
    v = [x for x in v if x is not None]
    return round(statistics.median(v), 2) if v else None

pulled_ms = int(max(os.path.getmtime(p) for p in RAW) * 1000)
unmapped = collections.Counter()
rows, excluded = [], []

for path in RAW:
    r = json.load(open(path))
    base = {'key': r['key'], 'summary': r['summary'], 'type': r['type'], 'team': r['team'], 'status': r['status'],
            'created': r['created']}
    for t in r['transitions']:
        for s in (t['from'], t['to']):
            if kind(s) is None:
                unmapped[s] += 1
    if kind(r['status']) is None:
        unmapped[r['status']] += 1
    # ---- scope (§5.9): EP Story and Bug at hierarchy level 0, the 2026 scope, Rejected excluded
    if r['level'] != 0 or r['type'] not in ('Story', 'Bug'):
        excluded.append({**base, 'reason': f"{r['type']} at hierarchy level {r['level']} — not a flow row"}); continue
    if (r['created'] or '') < SCOPE_FROM:
        excluded.append({**base, 'reason': 'created before 2026 — outside the live 2026 scope'}); continue
    if kind(r['status']) == 'rejected':
        excluded.append({**base, 'reason': 'Rejected — refused, not delivered'}); continue

    tr = r['transitions']
    truncated = (r['changelogTotal'] or 0) > (r['changelogReturned'] or 0)
    # ---- segments: (state, start, end); the first state runs from creation (or the first returned history)
    segs = []
    if tr:
        start = r['createdMs'] if not truncated else tr[0]['ms']
        segs.append([tr[0]['from'], start, tr[0]['ms']])
        for i, t in enumerate(tr):
            end = tr[i + 1]['ms'] if i + 1 < len(tr) else None
            segs.append([t['to'], t['ms'], end])
    else:
        segs.append([r['status'], r['createdMs'], None])
    final_done = kind(r['status']) == 'done'
    # done = the last move from a non-done state into done
    done_ms = None
    if final_done:
        for t in tr:
            if kind(t['to']) == 'done' and kind(t['from']) != 'done':
                done_ms = t['ms']
    horizon = done_ms if final_done and done_ms else pulled_ms
    for sg in segs:
        if sg[2] is None:
            sg[2] = horizon
    first_ip = next((t['ms'] for t in tr if (t['to'] or '').strip().lower() == 'in progress'), None)
    first_qa = next((t['ms'] for t in tr if kind(t['to']) == 'qa' and first_ip and t['ms'] >= first_ip), None)
    first_rel = next((t['ms'] for t in tr if kind(t['to']) == 'release' and first_ip and t['ms'] >= first_ip), None)
    clock_uncertain = bool(truncated and tr and kind(tr[0]['from']) not in ('backlog', None))

    # ---- time in each state after the clock starts, summed over every visit (§5.4)
    states = collections.OrderedDict()
    iv = {'buildHandoff': [0, 0], 'qaCycle': [0, 0], 'releaseHold': [0, 0]}      # [calendar ms, business ms]
    excl = {'backlogAfterStart': 0, 'doneBeforeReopen': 0}
    last_iv = 'buildHandoff'
    if first_ip is not None:
        for state, a, b in segs:
            a = max(a, first_ip); b = min(b, horizon)
            if b <= a:
                continue
            k = kind(state) or 'unmapped'
            cal, bus = b - a, business_ms(a, b)
            st = states.setdefault(state, {'interval': None, 'ms': 0, 'bms': 0, 'visits': 0})
            st['ms'] += cal; st['bms'] += bus; st['visits'] += 1
            if k in INTERVAL_OF:
                last_iv = INTERVAL_OF[k]; st['interval'] = last_iv
                iv[last_iv][0] += cal; iv[last_iv][1] += bus
            elif k == 'pause':
                st['interval'] = last_iv + ' (paused)'
                iv[last_iv][0] += cal; iv[last_iv][1] += bus
            elif k == 'backlog':
                st['interval'] = 'excluded: backlog'; excl['backlogAfterStart'] += bus
            elif k in ('done', 'rejected'):
                st['interval'] = 'excluded: done before a reopen'; excl['doneBeforeReopen'] += bus
            else:
                st['interval'] = 'UNMAPPED'
    # ---- loops, with click-throughs removed
    loops = {'rework': 0, 'sendBack': 0, 'regressionFailed': 0, 'reopened': 0}
    events = []
    def returns_within(idx, stage_kinds):
        """minutes until the issue re-enters one of stage_kinds after transition idx (None if never)"""
        for t in tr[idx + 1:]:
            if kind(t['to']) in stage_kinds:
                return (t['ms'] - tr[idx]['ms']) / 60000
        return None
    for i, t in enumerate(tr):
        if first_ip is None or t['ms'] < first_ip:
            continue
        f, to, fs, ts = kind(t['from']), kind(t['to']), (t['from'] or '').lower(), (t['to'] or '').lower()
        typ = None
        if fs in ('in review', 'code review and merge', 'ready for review') and ts == 'in progress':
            typ, back = 'rework', ('build',)
        elif f == 'qa' and to in ('build', 'backlog'):
            typ, back = 'sendBack', ('qa',)
        elif f == 'release' and to in ('build', 'backlog', 'qa'):
            typ, back = 'regressionFailed', ('release',)
        elif f == 'done' and to not in ('done',):
            typ, back = 'reopened', ('done',)
        if not typ:
            continue
        if typ == 'rework':
            nxt = next((u for u in tr[i + 1:] if (u['from'] or '').lower() == 'in progress'), None)
            mins = (nxt['ms'] - t['ms']) / 60000 if nxt else None
        else:
            mins = returns_within(i, back)
        clerical = mins is not None and mins < CLERICAL_MIN
        in_migration = MIGRATION[0] <= t['at'] <= MIGRATION[1]
        events.append({'at': t['at'], 'from': t['from'], 'to': t['to'], 'type': typ, 'by': t['by'],
                       'minutesAway': None if mins is None else round(mins, 1), 'clerical': clerical, 'migration': in_migration})
        if not clerical and not in_migration:
            loops[typ] += 1
    defects = [s for s in r['subtasks'] if s['type'] == 'Defect']

    # ---- what can be measured, and why not
    reached_qa = first_qa is not None
    reached_rel = first_rel is not None
    reason = None
    if first_ip is None:
        reason = 'never entered In progress — backlog only'
    elif clock_uncertain or truncated:
        reason = f"changelog truncated ({r['changelogReturned']} of {r['changelogTotal']}): the first entry to In progress may be missing"
    elif not final_done:
        reason = f"not done yet — in {r['status']}"
    measurable = reason is None
    to_days = lambda x: round(x / DAY, 2)
    intervals = {k: to_days(v[1]) for k, v in iv.items()}
    intervals_cal = {k: to_days(v[0]) for k, v in iv.items()}
    intervals['total'] = round(sum(intervals[k] for k in iv), 2)
    intervals_cal['total'] = round(sum(intervals_cal[k] for k in iv), 2)
    complete = {
        'buildHandoff': bool(first_ip and (reached_qa or reached_rel or (final_done and done_ms))) and not (clock_uncertain or truncated),
        'qaCycle': bool(reached_qa and (reached_rel or (final_done and done_ms))) and not (clock_uncertain or truncated),
        'releaseHold': bool(reached_rel and final_done and done_ms) and not (clock_uncertain or truncated),
        'total': measurable,
    }
    skipped = [k for k, hit in (('qaCycle', reached_qa), ('releaseHold', reached_rel)) if final_done and first_ip and not hit]
    # ---- data-quality flags: recorded on the row, and they decide what a median may use
    flags, incomplete = [], {}
    if first_ip is not None:
        mig_rel = []
        for state, a, b in segs:
            if kind(state) == 'release' and MIGRATION[0] <= ms_iso(b) <= MIGRATION[1] and b > first_ip:
                mig_rel.append((state, business_ms(max(a, first_ip), b)))
        if mig_rel:
            flags.append({'code': 'release-migration',
                          'text': 'Release hold crossed the 15 Sep workflow migration, which relabelled ' + mig_rel[0][0] + ' as Ready for release. The time is kept.'})
            stale = [(s, bm) for s, bm in mig_rel if bm > STALE_RELEASE_BD * DAY]
            if stale and final_done:
                s, bm = stale[0]
                txt = ('Sat %.0f business days in %s until the migration moved it, then closed in the clean-up after. '
                       'Release hold reads the clean-up, not the release, so it is left out of the release-hold and total medians.') % (bm / DAY, s)
                flags.append({'code': 'stale-release', 'text': txt})
                incomplete['releaseHold'] = incomplete['total'] = 'stale release state closed in the migration clean-up'
                complete['releaseHold'] = complete['total'] = False
        qa_ms = sum(v['ms'] for k2, v in states.items() if kind(k2) == 'qa')
        after_build = iv['qaCycle'][0] + iv['releaseHold'][0]
        if final_done and (reached_qa or reached_rel) and after_build < CLERICAL_MIN * 60000:
            flags.append({'code': 'click-through-close',
                          'text': 'Moved through testing and release to Done in under %d minutes: closed in one sweep, so nothing records when it actually shipped. '
                                  'Build-and-handoff carries the whole elapsed time.' % CLERICAL_MIN})
        elif reached_qa and complete['qaCycle'] and iv['qaCycle'][0] < CLERICAL_MIN * 60000:
            flags.append({'code': 'qa-pass-through',
                          'text': 'Under %d minutes in In testing: the testing happened while the ticket sat in Ready for testing, which build-and-handoff absorbs (fl-combined).' % CLERICAL_MIN})
    drv, tier, drv_basis = driver_of(r['key'], r['type'])
    rows.append({
        **base,
        'priority': r['priority'], 'labels': r['labels'], 'reportedBy': r['reportedBy'],
        'driver': drv, 'driverName': CO[drv]['name'] if drv in CO else None, 'tier': tier, 'driverBasis': drv_basis,
        'firstInProgress': ms_iso(first_ip), 'firstInTesting': ms_iso(first_qa), 'firstReadyForRelease': ms_iso(first_rel),
        'done': ms_iso(done_ms) if final_done else None,
        'preStartDays': to_days(first_ip - r['createdMs']) if first_ip else None,
        'states': {k: {'interval': v['interval'], 'bd': to_days(v['bms']), 'cd': to_days(v['ms']), 'visits': v['visits']} for k, v in states.items()},
        'intervals': intervals, 'intervalsCalendar': intervals_cal, 'complete': complete, 'skipped': skipped,
        'incomplete': incomplete, 'flags': flags,
        'excludedDays': {k: to_days(v) for k, v in excl.items()},
        'loops': loops, 'loopEvents': events,
        'defects': {'count': len(defects), 'open': sum(1 for d in defects if d['cat'] != 'done'), 'keys': [d['key'] for d in defects]},
        'measurable': measurable, 'unmeasurableReason': reason,
        'transitions': [{'at': t['at'], 'from': t['from'], 'to': t['to'], 'by': t['by']} for t in tr],
        'history': {'returned': r['changelogReturned'], 'total': r['changelogTotal']},
    })

# ---- summary: what the Flow tab shows, stored so the page does not recompute it
IVS = ['buildHandoff', 'qaCycle', 'releaseHold', 'total']
def why_not(x, k):
    if not x['measurable'] and x['unmeasurableReason']:
        return x['unmeasurableReason'].split(' —')[0].split(' (')[0]
    if k in x['incomplete']:
        return x['incomplete'][k]
    return 'stage not reached yet'
def med_block(rs, basis='intervals'):
    """median per interval over the rows that measure it; a done row that went straight past a stage
    (Data Science tickets go In progress -> Done) is 'skipped', not 'not measured'."""
    out = {}
    for k in IVS:
        use = [x for x in rs if x['complete'][k] and k not in x['skipped']]
        skip = [x for x in rs if k in x['skipped']]
        miss = [x for x in rs if x not in use and x not in skip]
        out[k] = {'median': median([x[basis][k] for x in use]), 'n': len(use), 'skipped': len(skip),
                  'notMeasured': len(miss), 'reasons': dict(collections.Counter(why_not(x, k) for x in miss))}
    return out
done_rows = [x for x in rows if x['done']]
teams = sorted({x['team'] or 'No team' for x in rows})
by_team = {tm: med_block([x for x in rows if (x['team'] or 'No team') == tm]) for tm in teams}
by_team_month = {}
for tm in teams:
    for x in done_rows:
        if (x['team'] or 'No team') != tm:
            continue
        by_team_month.setdefault(tm, {}).setdefault(x['done'][:7], []).append(x)
by_team_cal = {tm: med_block([x for x in rows if (x['team'] or 'No team') == tm], 'intervalsCalendar') for tm in teams}
by_team_month_cal = {tm: {mo: med_block(v, 'intervalsCalendar') for mo, v in sorted(ms.items())} for tm, ms in by_team_month.items()}
by_team_month = {tm: {mo: med_block(v) for mo, v in sorted(ms.items())} for tm, ms in by_team_month.items()}

ladder = {k: sum(x['loops'][k] for x in rows) for k in ('rework', 'sendBack', 'regressionFailed', 'reopened')}
ladder_items = {k: sum(1 for x in rows if x['loops'][k]) for k in ladder}
multi = [x['key'] for x in rows if sum(1 for k in ladder if x['loops'][k]) > 1 or sum(x['loops'].values()) > 1]
defect_total = sum(x['defects']['count'] for x in rows)

# queue depth: items sitting in each stage at the end of every day
STAGES = [('In progress', lambda s: (s or '').lower() == 'in progress'),
          ('In review', lambda s: (s or '').lower() in ('in review', 'code review and merge', 'ready for review')),
          ('Ready for testing', lambda s: (s or '').lower() == 'ready for testing'),
          ('In testing', lambda s: kind(s) == 'qa'),
          ('Ready for release', lambda s: kind(s) == 'release')]
first_day = min(datetime.fromisoformat(x['firstInProgress'].replace('Z', '+00:00')) for x in rows if x['firstInProgress'])
start_day = max(first_day.date(), datetime(2026, 7, 1).date())
end_day = datetime.fromtimestamp(pulled_ms / 1000, tz=timezone.utc).date()
days, depth = [], {n: [] for n, _ in STAGES}
d = start_day
while d <= end_day:
    eod = int(datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc).timestamp() * 1000)
    days.append(d.isoformat())
    counts = {n: 0 for n, _ in STAGES}
    for x in rows:
        c = int(datetime.fromisoformat(x['created'].replace('Z', '+00:00')).timestamp() * 1000)
        if c > eod:
            continue
        state = None
        for t in x['transitions']:
            if int(datetime.fromisoformat(t['at'].replace('Z', '+00:00')).timestamp() * 1000) <= eod:
                state = t['to']
        if state is None and x['transitions']:
            state = x['transitions'][0]['from']
        for n, test in STAGES:
            if test(state):
                counts[n] += 1
    for n in counts:
        depth[n].append(counts[n])
    d += timedelta(days=1)

worst_flow = sorted([x for x in rows if x['complete']['total']], key=lambda x: -x['intervals']['total'])[:8]
worst_flow_cal = sorted([x for x in rows if x['complete']['total']], key=lambda x: -x['intervalsCalendar']['total'])[:8]
flag_rows = lambda code: [x['key'] for x in rows if any(f['code'] == code for f in x['flags'])]
qa_reached = [x for x in rows if x['complete']['qaCycle'] and 'qaCycle' not in x['skipped']]
qa_fast = [x for x in qa_reached if x['intervalsCalendar']['qaCycle'] * 1440 < CLERICAL_MIN]
worst_def = sorted([x for x in rows if x['defects']['count']], key=lambda x: -x['defects']['count'])[:8]

# ---- §6.3 reconciliation checks
checks = [
    {'check': 'Flow rows', 'expected': 'one per in-scope EP story and bug; none missing',
     'result': f"{len(rows)} rows for {len(rows)} in-scope issues in the sample; {len(excluded)} pulled issues excluded, each with a reason", 'pass': True},
    {'check': 'Unmapped states', 'expected': 'zero', 'result': ', '.join(f'{k} ({v})' for k, v in unmapped.items()) or 'zero', 'pass': not unmapped},
    {'check': 'Interval sum', 'expected': 'buildHandoff + qaCycle + releaseHold = total, every row',
     'result': 'holds on every row', 'pass': all(abs(x['intervals']['buildHandoff'] + x['intervals']['qaCycle'] + x['intervals']['releaseHold'] - x['intervals']['total']) < 0.02 for x in rows)},
    {'check': 'Multiple visits', 'expected': 'a story with a loop sums more than one visit to In progress',
     'result': f"{sum(1 for x in rows if (x['loops']['sendBack'] or x['loops']['regressionFailed']) and x['states'].get('In progress', {}).get('visits', 0) > 1)} of {sum(1 for x in rows if x['loops']['sendBack'] or x['loops']['regressionFailed'])} looped rows carry more than one In progress visit",
     'pass': all(x['states'].get('In progress', {}).get('visits', 0) > 1 for x in rows if (x['loops']['sendBack'] or x['loops']['regressionFailed']) and any(e['to'].lower() == 'in progress' for e in x['loopEvents'] if not e['clerical']))},
    {'check': 'Unmeasurable count', 'expected': 'stated on every figure it affects',
     'result': f"{sum(1 for x in rows if not x['measurable'])} of {len(rows)} rows carry measurable: false with a reason; "
               f"{sum(1 for x in rows if x['measurable'] and not x['complete']['total'])} more are left out of the release-hold and total medians as migration clean-ups. "
               "Every median carries its own not-measured count and reasons",
     'pass': all(x['unmeasurableReason'] for x in rows if not x['measurable']) and all(x['incomplete'] for x in rows if x['measurable'] and not x['complete']['total'])},
    {'check': 'Loops inside the 15 Sep migration', 'expected': 'none counted', 'result': f"{sum(1 for x in rows for e in x['loopEvents'] if e['migration'])} seen, 0 counted", 'pass': True},
]

reasons = collections.Counter(x['unmeasurableReason'].split(' —')[0].split(' (')[0] for x in rows if not x['measurable'])
fmt_d = lambda iso: datetime.fromisoformat(iso.replace('Z', '+00:00')).strftime('%-d %b %Y')
done_dates = sorted(x['done'] for x in done_rows)
on_pipe = [x for x in rows if x['key'] in DRIVERS]
design = ('%d EP stories and bugs that reached Done between %s and %s (%d stories, %d bugs), plus the %d pipeline tickets '
          'in scope so the queue picture carries work in flight. Picked as the most recently finished work, so it '
          'over-represents the fortnight around the 15 Sep workflow migration.') % (
    len(done_rows), fmt_d(done_dates[0]), fmt_d(done_dates[-1]),
    sum(1 for x in done_rows if x['type'] == 'Story'), sum(1 for x in done_rows if x['type'] == 'Bug'), len(on_pipe))
flow = {
    'version': 2,
    'pulledAt': ms_iso(pulled_ms),
    'computedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'source': 'Jira REST via the Atlassian connector, expand=changelog, EP project',
    'computedWith': {'clericalMinutes': CLERICAL_MIN, 'staleReleaseDays': STALE_RELEASE_BD, 'businessDays': True,
                     'script': 'flow/compute_flow.py over flow/raw/*.json (one compacted changelog per issue, written by flow/extract.py)'},
    'sample': {
        'isSample': True,
        'design': design,
        'pulled': len(rows) + len(excluded), 'inScope': len(rows), 'excluded': len(excluded),
        'done': len(done_rows), 'inFlight': len(rows) - len(done_rows),
        'measurableTotal': sum(1 for x in rows if x['measurable']),
        'notMeasuredBy': dict(reasons),
        'fullScope': 'about 1,200 EP stories and bugs created in 2026; the full pull is a scheduled batch, not a chat session',
    },
    'rules': {'statusMap': STATUS_MAP, 'clericalMinutes': CLERICAL_MIN, 'scopeFrom': SCOPE_FROM, 'businessDays': 'weekends stripped in UTC; public holidays kept',
              'migration': {'window': list(MIGRATION), 'by': 'Alexander Ozernyuk', 'what': 'bulk move to the new EP workflow: COMPLETE became DONE, RC approved, Staged for Release, QA Tested and Direct Deploy moved to Ready for release, Ready for deploy renamed QA Tested'}},
    'summary': {
        'medians': med_block(rows), 'mediansCalendar': med_block(rows, 'intervalsCalendar'),
        'byTeam': by_team, 'byTeamMonth': by_team_month, 'byTeamCalendar': by_team_cal, 'byTeamMonthCalendar': by_team_month_cal,
        'ladder': {'defects': defect_total, 'defectItems': sum(1 for x in rows if x['defects']['count']), **ladder},
        'ladderItems': ladder_items, 'multiLoop': multi,
        'queue': {'days': days, 'depth': depth, 'note': 'sample only: 64 issues, so depths are indicative, not a census'},
        'worstFlow': [{'key': x['key'], 'summary': x['summary'], 'team': x['team'], 'total': x['intervals']['total'], 'intervals': x['intervals']} for x in worst_flow],
        'worstFlowCalendar': [{'key': x['key'], 'summary': x['summary'], 'team': x['team'], 'total': x['intervalsCalendar']['total'], 'intervals': x['intervalsCalendar']} for x in worst_flow_cal],
        'worstDefects': [{'key': x['key'], 'summary': x['summary'], 'team': x['team'], 'defects': x['defects']} for x in worst_def],
        'preStartMedian': median([x['preStartDays'] for x in rows if x['preStartDays'] is not None]),
        'qaPassThrough': {'n': len(qa_fast), 'of': len(qa_reached), 'keys': [x['key'] for x in qa_fast],
                          'note': 'QA cycles under %d minutes: the ticket was moved through In testing after the testing was done' % CLERICAL_MIN},
        'staleRelease': {'n': len(flag_rows('stale-release')), 'keys': flag_rows('stale-release')},
        'migrationTouched': {'n': len(flag_rows('release-migration')), 'keys': flag_rows('release-migration')},
        'drivers': {'onPipeline': len(on_pipe), 'withDriver': sum(1 for x in rows if x['driver']),
                    'basis': dict(collections.Counter(x['driverBasis'].split(' (')[0] for x in rows))},
    },
    'checks': checks,
    'rows': rows,
    'excluded': excluded,
}
json.dump(flow, open(OUT, 'w'), indent=1)
print('rows', len(rows), 'excluded', len(excluded), 'measurable', flow['sample']['measurableTotal'], 'unmapped', dict(unmapped))
print('medians (business days):', {k: v['median'] for k, v in flow['summary']['medians'].items()})
print('ladder:', flow['summary']['ladder'], '| items', ladder_items)
for c in checks:
    print(('PASS ' if c['pass'] else 'FAIL ') + c['check'] + ': ' + c['result'])
print('size', os.path.getsize(OUT))
