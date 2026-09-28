#!/usr/bin/env python3
"""Rebuild the ledger's event layer from the Jira OP project (Ops Project Tracking), the source of truth for events.

  python3 tools/events.py build   data/events/raw/op-page*.json -> data/ledger.json "events" (+ eventsAsOf)
  python3 tools/events.py check   report attribution coverage and what changed

Pull (Atlassian connector, searchJiraIssuesUsingJql, 100 a page, save each page to data/events/raw/op-pageN.json):
  project = OP AND issuetype = 10080 AND (duedate >= "2026-01-01" OR cf[10015] >= "2026-01-01") ORDER BY key ASC
  fields: summary, status, labels, duedate, customfield_10015, customfield_11906, customfield_11840, customfield_10201, customfield_10330

Attribution (ev-attribution, 26 Sep 2026): customfield_11906 is the Pipedrive Company ID, the ledger's join key.
It is set on every event ticket, so it replaces the label and alias matching used before, which left 56 events,
among them all four DLG shows of 2026, attached to nobody. Start is customfield_10015, last day is duedate.
Test tickets (summary says test or fake) are dropped. Fields the old build carried (drift, xhb, val, vis, cur) are
kept by key. Writes data/ledger.json in place with the same compact JSON the split step produced."""
import glob, json, os, re, sys

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
KIND = {'(EVENT)': 'event', '(COMMUNITY)': 'community', '(OTHER)': 'other', '(EP LITE)': 'eplite'}
TEST = re.compile(r'\b(test|testing|fake)\b', re.I)

def nodes():
    out = []
    for p in sorted(glob.glob(J('data', 'events', 'raw', 'op-page*.json'))):
        out += json.load(open(p))['issues']['nodes']
    return out

def load_ledger():
    raw = open(J('data', 'ledger.json'), encoding='utf-8').read()
    return raw, json.loads(raw)

def rebuild(L):
    comp = {c['pd'] for c in L['companies']}
    old = {e['k']: e for e in L['events']}
    events, dropped = [], []
    for n in nodes():
        f = n['fields']; summ = (f.get('summary') or '').strip()
        m = re.match(r'\s*(\([^)]*\))\s*', summ); pre = m.group(1).upper() if m else None
        name = summ[m.end():].strip() if m else summ
        if TEST.search(summ): dropped.append((n['key'], summ, 'test ticket')); continue
        pd = str(f.get('customfield_11906') or '').strip()
        o = old.get(n['key'], {})
        s, e = f.get('customfield_10015'), f.get('duedate')
        ev = {'k': n['key'], 'n': name, 's': s, 'e': e or s,
              'pd': pd if pd in comp else (o.get('pd') if o.get('pd') in comp else None),
              'tok': o.get('tok') or ((f.get('customfield_10201') or [None])[0]),
              'map': 'pipedrive id (OP)' if pd in comp else ('earlier alias; OP pipedrive id '+pd+' is not a ledger client' if o.get('pd') in comp else ('pipedrive id not a ledger client' if pd else 'no pipedrive id')),
              'st': (f.get('status') or {}).get('name'), 'reg': o.get('reg'),
              'kind': KIND.get(pre, 'event')}
        ctry = f.get('customfield_10330')
        if ctry: ev['ctry'] = ctry[0] if isinstance(ctry, list) else ctry
        for k in ('drift', 'xhb', 'val', 'vis', 'cur'):
            if k in o: ev[k] = o[k]
        if s and e and s > e: ev['bad'] = True
        events.append(ev)
    gone = [k for k in old if k not in {e['k'] for e in events} and k not in {d[0] for d in dropped}]
    return events, dropped, gone

def build():
    raw, L = load_ledger()
    events, dropped, gone = rebuild(L)
    before = {e['k']: e.get('pd') for e in L['events']}
    L['events'] = events
    L['eventsAsOf'] = '2026-09-26'
    # the page data is stored compact, exactly as split wrote it (separators without spaces, non-ASCII kept)
    compact = (',', ':') if '": ' not in raw[:2000] else None
    txt = json.dumps(L, ensure_ascii=False, separators=compact) if compact else json.dumps(L, ensure_ascii=False)
    open(J('data', 'ledger.json'), 'w', encoding='utf-8', newline='').write(txt)
    newly = [e for e in events if e['pd'] and not before.get(e['k'])]
    print(f'{len(events)} events written; {len(newly)} newly attributed; {len(dropped)} test tickets dropped; {len(gone)} no longer in Jira: {", ".join(gone)}')

def check():
    raw, L = load_ledger()
    ev = L['events']; n = len(ev)
    att = sum(1 for e in ev if e.get('pd'))
    print(f'{n} events, {att} attributed to a ledger client ({att*100//max(n,1)}%)')
    dlg = [e for e in ev if e.get('pd') == '81808']
    print('DLG:', ', '.join(f"{e['n']} {e['s']}" for e in sorted(dlg, key=lambda e: e['s'] or '')))
    un = [e for e in ev if not e.get('pd')]
    for e in un: print('  unattributed', e['k'], e['map'], e['n'])

if __name__ == '__main__':
    {'build': build, 'check': check}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
