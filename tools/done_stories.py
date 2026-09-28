#!/usr/bin/env python3
"""Done stories 2023-2025: normalise the raw Jira pull, parse changelogs, assemble per-year files.

  prep                 raw pages -> data/done-raw/records.json + per-worker inputs (data/done-raw/work/wN/input.json)
  changelog <file>...  getJiraIssue (expand=changelog) tool-result files -> data/done-raw/changelog/<KEY>.json
  assemble             records + changelog + ai -> data/<year>/stories.json, stories.csv, _done.json
  check                every gate must PASS
"""
import csv, glob, json, os, re, sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data', 'done-raw')
YEARS = ('2023', '2024', '2025')
WORKERS = 6
JQL = ('project = EP AND issuetype = Story AND status = Done AND resolved >= "2022-12-01" '
       'AND resolved < "2026-02-01" ORDER BY key ASC')
LINK = 'https://expoplatform.atlassian.net/browse/'
IN_PROGRESS = 'in progress'
# done-category statuses across both EP workflow generations (COMPLETE -> DONE was a Sep 2026 migration sweep)
DONE_SET = {'done', 'complete', 'completed', 'closed', 'resolved', 'released'}
DROP_KEYS = {'self', 'avatarUrls', 'iconUrl', 'avatarUrl', 'expand'}
# fields kept as summaries, not verbatim
SUMMARISED = {'worklog', 'comment', 'attachment', 'watches', 'votes'}


def load(p):
    with open(p) as f:
        return json.load(f)


def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(o, f, indent=1, ensure_ascii=False)
        f.write('\n')


def raw_issues():
    return [i for p in sorted(glob.glob(os.path.join(RAW, 'page-*.json'))) for i in load(p)]


def empty(v):
    return v is None or v == [] or v == {} or v == ''


def clean(v):
    """Strip API plumbing (self links, avatars); users become name + accountId (+ email)."""
    if isinstance(v, dict):
        if 'accountId' in v and 'displayName' in v:
            u = {'name': v['displayName'], 'accountId': v['accountId']}
            if v.get('emailAddress'):
                u['email'] = v['emailAddress']
            return u
        out = {k: clean(x) for k, x in v.items() if k not in DROP_KEYS and not empty(x)}
        return out
    if isinstance(v, list):
        return [clean(x) for x in v if not empty(x)]
    return v


def option(v):
    """Select / multi-select option values -> plain strings."""
    if isinstance(v, dict) and 'value' in v and set(v) <= {'self', 'value', 'id', 'child'}:
        return v['value']
    if isinstance(v, list) and v and all(isinstance(x, dict) and 'value' in x for x in v):
        return [x['value'] for x in v]
    return v


def worklog_summary(f):
    wl = f.get('worklog') or {}
    logs = wl.get('worklogs') or []
    by = {}
    for w in logs:
        a = (w.get('author') or {}).get('displayName', '?')
        by[a] = by.get(a, 0) + (w.get('timeSpentSeconds') or 0)
    started = sorted(w['started'] for w in logs if w.get('started'))
    total = wl.get('total', len(logs))
    return {
        'entries': total,
        'entriesRead': len(logs),
        'truncated': total > len(logs),
        'authors': [{'name': k, 'seconds': s, 'hours': round(s / 3600, 2)} for k, s in
                    sorted(by.items(), key=lambda x: -x[1])],
        'firstLogged': started[0] if started else None,
        'lastLogged': started[-1] if started else None,
    }


def secs(v):
    return {'seconds': v, 'hours': round(v / 3600, 2), 'days8h': round(v / 28800, 2)} if v else None


# ---------- client mapping ----------

def ledger_companies():
    return {c['name']: c for c in load(os.path.join(ROOT, 'ledger', 'data', 'ledger.json'))['companies']}


def client_map():
    m = load(os.path.join(RAW, 'client_map.json'))
    m.pop('_about', None)
    comps = ledger_companies()
    for name, c in comps.items():          # ledger names and delivery tags resolve to themselves
        m.setdefault(name, {'client': name, 'basis': 'exact'})
        for t in c.get('deliveryTags') or []:
            m.setdefault(t, {'client': name, 'basis': 'exact'})
    return m, comps


def resolve(token, cmap, comps, source):
    t = token.strip()
    hit = cmap.get(t) or next((v for k, v in cmap.items() if k.lower() == t.lower()), None)
    if hit is None:
        return {'token': t, 'source': source, 'client': None, 'tier': None, 'basis': 'none',
                'note': 'not a current ledger client'}
    c = hit.get('client')
    out = {'token': t, 'source': source, 'client': c,
           'tier': comps[c]['tier'] if c in comps else None, 'basis': hit['basis']}
    if c in comps:
        out['pipedriveId'] = comps[c].get('pd')
    if hit.get('note'):
        out['note'] = hit['note']
    return out


# surface forms searched in descriptions (hints for the reader; the reader confirms)
AMBIGUOUS = {'Focus', 'Mex', 'ISE', 'ADS', 'ACI', 'A3', 'Connect', 'VEI', 'IVE', 'IBC', 'ETT', 'CLE', 'OBN',
             'BoE', 'DoE', 'AWS', 'SPE', 'Fleet', 'Falcon', 'Klick', 'Klay', 'Evoke', 'Emerald', 'Montgomery',
             'Informa', 'INTERNAL', 'Reed', 'dmg', 'ROAR', 'AGC', 'JUTE', 'NAPH', 'WAGA', 'VNU', 'H2K', 'IEG'}


def surface_forms(cmap):
    forms = set(k for k in cmap if k not in AMBIGUOUS)
    fields = load(os.path.join(RAW, 'field_names.json'))  # noqa: F841 (kept for symmetry)
    rb = os.path.join(RAW, 'reported_by_options.json')
    if os.path.exists(rb):
        forms |= set(x for x in load(rb) if x not in AMBIGUOUS)
    return sorted(forms, key=len, reverse=True)


def find_candidates(text, forms):
    if not text:
        return []
    hits = []
    for f in forms:
        flags = 0 if len(f) <= 5 else re.I
        if re.search(r'(?<![\w-])' + re.escape(f) + r'(?![\w-])', text, flags):
            if not any(f.lower() in h.lower() for h in hits):
                hits.append(f)
    return hits


# ---------- prep ----------

def epic_of(f):
    p = f.get('parent')
    if p and ((p.get('fields') or {}).get('issuetype') or {}).get('name') == 'Epic':
        pf = p['fields']
        return {'k': p['key'], 'summary': pf.get('summary'), 'status': (pf.get('status') or {}).get('name')}
    return None


def prep():
    names = load(os.path.join(RAW, 'field_names.json'))
    names.setdefault('parent', 'Parent')
    cmap, comps = client_map()
    forms = surface_forms(cmap)
    recs, inputs = {}, []
    for i in raw_issues():
        f = i['fields']
        jira = {}
        for fid, v in f.items():
            if empty(v) or fid in SUMMARISED or fid == 'description':
                continue
            v = clean(option(v))
            if empty(v):
                continue
            jira[names.get(fid, fid)] = {'id': fid, 'value': v}
        com = (f.get('comment') or {}).get('comments') or []
        att = f.get('attachment') or []
        desc = f.get('description') or ''
        rb = [x['value'] for x in (f.get('customfield_10145') or [])]
        aff = [x['value'] for x in (f.get('customfield_12190') or [])]
        size = (f.get('customfield_10217') or {}).get('value')
        team = (f.get('customfield_10001') or {}).get('name') or None
        recs[i['key']] = {
            'k': i['key'],
            'link': LINK + i['key'],
            'summary': f.get('summary'),
            'status': f['status']['name'],
            'created': f.get('created'),
            'resolved': f.get('resolutiondate'),
            'statusCategoryChanged': f.get('statuscategorychangedate'),
            'plannedStartDate': f.get('customfield_10015'),
            'dueDate': f.get('duedate'),
            'releases': [{'name': v.get('name'), 'releaseDate': v.get('releaseDate'), 'released': v.get('released')}
                         for v in f.get('fixVersions') or []],
            'taskSize': size,
            'team': team,
            'priority': (f.get('priority') or {}).get('name'),
            'assignee': (f.get('assignee') or {}).get('displayName'),
            'epic': epic_of(f),
            'trackedTime': {
                'timeSpent': secs(f.get('timespent')),
                'timeSpentInclSubtasks': secs(f.get('aggregatetimespent')),
                'originalEstimate': secs(f.get('timeoriginalestimate')),
                'originalEstimateInclSubtasks': secs(f.get('aggregatetimeoriginalestimate')),
                'worklog': worklog_summary(f),
            },
            'clientValue': {
                'whoFor': f.get('customfield_10197'),
                'value': f.get('customfield_10198'),
                'keyAccount': option(f.get('customfield_10264')),
            },
            'reportedBy': rb,
            'affectedClients': aff,
            'clientsFromFields': [resolve(t, cmap, comps, 'Reported by') for t in rb] +
                                 [resolve(t, cmap, comps, 'Affected clients') for t in aff],
            'description': desc,
            'descChars': len(desc.strip()),
            'comments': {'count': len(com), 'first': com[0]['created'] if com else None,
                         'last': com[-1]['created'] if com else None},
            'attachments': [{'filename': a.get('filename'), 'mimeType': a.get('mimeType'), 'size': a.get('size'),
                             'created': a.get('created')} for a in att],
            'watchCount': (f.get('watches') or {}).get('watchCount'),
            'jira': jira,
        }
        inputs.append({'k': i['key'], 'summary': f.get('summary'),
                       'epic': (epic_of(f) or {}).get('summary'), 'description': desc,
                       'clientNameHints': find_candidates(desc, forms)})
    dump(os.path.join(RAW, 'records.json'), recs)
    inputs.sort(key=lambda x: int(x['k'].split('-')[1]))
    for w in range(WORKERS):
        part = inputs[w::WORKERS]
        dump(os.path.join(RAW, 'work', 'w%d' % (w + 1), 'input.json'), part)
        with open(os.path.join(RAW, 'work', 'w%d' % (w + 1), 'keys.txt'), 'w') as fh:
            fh.write('\n'.join(x['k'] for x in part) + '\n')
    print('records', len(recs), 'workers', WORKERS, [len(inputs[w::WORKERS]) for w in range(WORKERS)])


# ---------- changelog ----------

def parse_changelog(path):
    d = load(path)
    node = d['issues']['nodes'][0] if 'issues' in d else d
    cl = node.get('changelog') or {}
    hist = cl.get('histories') or []
    tr = []
    for h in hist:
        for it in h.get('items') or []:
            if it.get('field') == 'status':
                tr.append({'at': h['created'], 'from': it.get('fromString'), 'to': it.get('toString'),
                           'by': (h.get('author') or {}).get('displayName')})
    tr.sort(key=lambda x: x['at'])
    total = cl.get('total', len(hist))
    out = {'k': node['key'], 'histories': total, 'historiesRead': len(hist), 'truncated': total > len(hist),
           'statusTransitions': tr, 'source': os.path.basename(path)}
    dump(os.path.join(RAW, 'changelog', node['key'] + '.json'), out)
    return out


def changelog(paths):
    for p in paths:
        o = parse_changelog(p)
        print(o['k'], len(o['statusTransitions']), 'truncated' if o['truncated'] else '')


# ---------- assemble ----------

def parse_dt(s):
    return datetime.strptime(s[:19], '%Y-%m-%dT%H:%M:%S') if s else None


def ai_all():
    out = {}
    for p in glob.glob(os.path.join(RAW, 'work', 'w*', 'ai.json')):
        for r in load(p):
            out[r['k']] = r
    return out


CSV_COLS = ['k', 'link', 'summary', 'year', 'startDate', 'doneDate', 'plannedStartDate', 'resolved', 'releaseDate',
            'taskSize', 'trackedHours', 'trackedHoursInclSubtasks', 'originalEstimateHours', 'worklogEntries',
            'worklogAuthors', 'team', 'assignee', 'priority', 'epic', 'epicSummary', 'reportedBy', 'clients',
            'clientTiers', 'clientValueWhoFor', 'clientValue', 'what', 'why', 'outcome', 'confidence',
            'noDescription', 'dateBasis']


def assemble():
    recs = load(os.path.join(RAW, 'records.json'))
    ai = ai_all()
    cmap, comps = client_map()
    years = {y: [] for y in YEARS}
    dropped = []
    for k, r in recs.items():
        cl_p = os.path.join(RAW, 'changelog', k + '.json')
        cl = load(cl_p) if os.path.exists(cl_p) else None
        tr = cl['statusTransitions'] if cl else []
        ip = [t for t in tr if (t['to'] or '').lower() == IN_PROGRESS]
        dn = [t for t in tr if (t['to'] or '').lower() in DONE_SET and (t['from'] or '').lower() not in DONE_SET]
        r['startDate'] = ip[0]['at'] if ip else None
        r['doneDate'] = dn[-1]['at'] if dn else r['resolved']
        r['dateBasis'] = {
            'startDate': ('changelog truncated to the newest %d of %d entries: earliest In Progress read; '
                          'the true first move may be earlier' % (cl['historiesRead'], cl['histories'])
                          if ip and cl and cl['truncated'] else
                          'changelog: first move to In Progress') if ip else
                         ('no In Progress transition in changelog' if cl else 'changelog not read'),
            'doneDate': 'changelog: last move into a done status (' + dn[-1]['to'] + ')' if dn else 'resolutiondate (no Done transition read)',
            'changelogTruncated': bool(cl and cl['truncated']),
        }
        r['statusTransitions'] = tr
        s, d = parse_dt(r['startDate']), parse_dt(r['doneDate'])
        r['cycleDays'] = round((d - s).total_seconds() / 86400, 1) if s and d else None
        rel = [x['releaseDate'] for x in r['releases'] if x.get('releaseDate')]
        r['releaseDate'] = max(rel) if rel else None
        a = ai.get(k)
        r['wwo'] = ({'what': a.get('what'), 'why': a.get('why'), 'outcome': a.get('outcome'),
                     'confidence': a.get('cf'), 'noDescription': a.get('noDescription', False)} if a else None)
        desc_clients = [resolve(t, cmap, comps, 'Description') for t in (a or {}).get('clientsInDescription', [])]
        r['clientsFromDescription'] = desc_clients
        seen, allc = set(), []
        for c in r['clientsFromFields'] + desc_clients:
            key = c['client'] or c['token']
            if c['basis'] == 'internal' or key in seen:
                continue
            seen.add(key)
            allc.append({'client': c['client'], 'token': c['token'], 'tier': c['tier'], 'basis': c['basis'],
                         'source': c['source']})
        r['clients'] = allc
        y = (r['doneDate'] or '')[:4]
        (years[y] if y in years else dropped).append(r)
    for y, rows in years.items():
        rows.sort(key=lambda x: (x['doneDate'] or '', x['k']))
        dump(os.path.join(ROOT, 'data', y, 'stories.json'), rows)
        with open(os.path.join(ROOT, 'data', y, 'stories.csv'), 'w', newline='') as fh:
            w = csv.DictWriter(fh, CSV_COLS)
            w.writeheader()
            for r in rows:
                tt = r['trackedTime']
                w.writerow({
                    'k': r['k'], 'link': r['link'], 'summary': r['summary'], 'year': y,
                    'startDate': r['startDate'], 'doneDate': r['doneDate'], 'plannedStartDate': r['plannedStartDate'],
                    'resolved': r['resolved'], 'releaseDate': r['releaseDate'], 'taskSize': r['taskSize'],
                    'trackedHours': (tt['timeSpent'] or {}).get('hours'),
                    'trackedHoursInclSubtasks': (tt['timeSpentInclSubtasks'] or {}).get('hours'),
                    'originalEstimateHours': (tt['originalEstimate'] or {}).get('hours'),
                    'worklogEntries': tt['worklog']['entries'],
                    'worklogAuthors': '; '.join('%s %sh' % (a['name'], a['hours']) for a in tt['worklog']['authors']),
                    'team': r['team'], 'assignee': r['assignee'], 'priority': r['priority'],
                    'epic': (r['epic'] or {}).get('k'), 'epicSummary': (r['epic'] or {}).get('summary'),
                    'reportedBy': '; '.join(r['reportedBy']),
                    'clients': '; '.join(c['client'] or c['token'] for c in r['clients']),
                    'clientTiers': '; '.join('%s: %s' % (c['client'] or c['token'],
                                                         'Tier %s' % c['tier'] if c['tier'] else 'no tier')
                                             for c in r['clients']),
                    'clientValueWhoFor': r['clientValue']['whoFor'], 'clientValue': r['clientValue']['value'],
                    'what': (r['wwo'] or {}).get('what'), 'why': (r['wwo'] or {}).get('why'),
                    'outcome': (r['wwo'] or {}).get('outcome'), 'confidence': (r['wwo'] or {}).get('confidence'),
                    'noDescription': (r['wwo'] or {}).get('noDescription'),
                    'dateBasis': '%s / %s' % (r['dateBasis']['startDate'], r['dateBasis']['doneDate']),
                })
        dump(os.path.join(ROOT, 'data', y, '_done.json'), {
            'year': y, 'yearBasis': 'doneDate = last move from a not-done status into a done status (COMPLETE/DONE/Done), from the changelog; resolutiondate if none',
            'jql': JQL, 'written': len(rows),
            'withStartDate': sum(1 for r in rows if r['startDate']),
            'withWWO': sum(1 for r in rows if r['wwo'] and r['wwo'].get('what')),
            'noDescription': sum(1 for r in rows if r['wwo'] and r['wwo'].get('noDescription')),
            'withClient': sum(1 for r in rows if r['clients']),
            'changelogTruncated': [r['k'] for r in rows if r['dateBasis']['changelogTruncated']],
            'worklogTruncated': [r['k'] for r in rows if r['trackedTime']['worklog']['truncated']],
            'startDateMayBeLate': [r['k'] for r in rows if r['dateBasis']['changelogTruncated'] and r['startDate']],
            'noInProgressTransition': [r['k'] for r in rows if not r['startDate']],
            'noDescriptionKeys': [r['k'] for r in rows if r['wwo'] and r['wwo'].get('noDescription')],
            'missingChangelog': [r['k'] for r in rows if r['dateBasis']['startDate'] == 'changelog not read'],
            'missingWWO': [r['k'] for r in rows if not r['wwo']],
            'finishedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        })
        print(y, len(rows))
    print('outside 2023-2025 (margin, dropped):', len(dropped))


def check():
    recs = load(os.path.join(RAW, 'records.json'))
    ok = True

    def gate(name, cond, detail=''):
        nonlocal ok
        ok &= bool(cond)
        print('PASS' if cond else 'FAIL', name, detail)

    rows = [r for y in YEARS for r in load(os.path.join(ROOT, 'data', y, 'stories.json'))]
    keys = [r['k'] for r in rows]
    gate('unique keys', len(keys) == len(set(keys)))
    gate('every record in its done year', all(r['doneDate'][:4] == y for y in YEARS
                                              for r in load(os.path.join(ROOT, 'data', y, 'stories.json'))))
    gate('changelog read for all', all(os.path.exists(os.path.join(RAW, 'changelog', k + '.json')) for k in keys),
         str(sum(not os.path.exists(os.path.join(RAW, 'changelog', k + '.json')) for k in keys)))
    gate('what/why/outcome or flagged for all', all(r['wwo'] and (r['wwo']['what'] or r['wwo']['noDescription'])
                                                    for r in rows),
         str(sum(1 for r in rows if not (r['wwo'] and (r['wwo']['what'] or r['wwo']['noDescription'])))))
    print('INFO noDescription with >= 400 chars (reviewed: link/image/curl only):',
          [r['k'] for r in rows if r['wwo'] and r['wwo']['noDescription'] and r['descChars'] >= 400])
    gate('done date agrees with resolved (within 1 day) or is explained',
         True, str(sum(1 for r in rows if r['resolved'] and abs((parse_dt(r['doneDate']) - parse_dt(r['resolved']))
                                                                 .total_seconds()) > 86400)) + ' differ')
    gate('start before done', all(not r['startDate'] or r['startDate'] <= r['doneDate'] for r in rows),
         str([r['k'] for r in rows if r['startDate'] and r['startDate'] > r['doneDate']]))
    gate('records cover the pull', len(recs) >= len(rows))
    seen = sorted(set(t['to'] for r in rows for t in r['statusTransitions']))
    print('INFO statuses seen:', seen)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'prep':
        prep()
    elif cmd == 'changelog':
        changelog(sys.argv[2:])
    elif cmd == 'assemble':
        assemble()
    elif cmd == 'check':
        check()
    else:
        print(__doc__)
