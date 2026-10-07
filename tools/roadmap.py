#!/usr/bin/env python3
"""Product evolution roadmap: the full set of done stories 2023-2026, tagged to themes, grouped into highlights.

  ingest <year> <file>...   searchJiraIssuesUsingJql result files -> data/roadmap/pull/<year>/records.json (merged)
  status                    per-year record counts against the Jira totals in data/roadmap/SCOPE.json
  prep                      pull records + existing ai text -> data/roadmap/tag/input-<batch>.json for the taggers
  gaps                      per-year key lists still missing enrichment / changelog -> data/roadmap/gaps/
  enrich-prep               gaps -> data/roadmap/enrich/wN/keys.json (8 workers)
  enrich-ingest wN <file>…  getJiraIssue results -> wN/records.json + data/done-raw/changelog/<KEY>.json
  enrich-status             progress across workers
  check                     every gate must PASS
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RM = os.path.join(ROOT, 'data', 'roadmap')
YEARS = ('2023', '2024', '2025', '2026')
FIELDS = ['summary', 'status', 'created', 'statuscategorychangedate', 'resolutiondate', 'parent', 'components',
          'labels', 'customfield_10001', 'fixVersions']


def load(p):
    with open(p) as f:
        return json.load(f)


def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(o, f, indent=1, ensure_ascii=False)
        f.write('\n')


def nodes_of(path):
    """A saved tool result: the raw JSON, or a list of content blocks whose text is that JSON."""
    d = load(path)
    if isinstance(d, list):
        d = json.loads(''.join(b.get('text', '') for b in d if isinstance(b, dict)))
    if isinstance(d, dict) and 'text' in d and 'issues' not in d:
        d = json.loads(d['text'])
    iss = d.get('issues', d)
    return iss.get('nodes') or iss.get('issues') or [], (iss.get('pageInfo') or {})


def norm(n):
    f = n.get('fields') or {}
    p = f.get('parent') or {}
    pf = p.get('fields') or {}
    epic = ({'k': p.get('key'), 'summary': pf.get('summary')}
            if (pf.get('issuetype') or {}).get('name') == 'Epic' else None)
    rel = [v.get('releaseDate') for v in f.get('fixVersions') or [] if v.get('releaseDate')]
    return {
        'k': n['key'],
        'summary': f.get('summary'),
        'status': (f.get('status') or {}).get('name'),
        'created': f.get('created'),
        'doneAt': f.get('statuscategorychangedate'),
        'resolved': f.get('resolutiondate'),
        'epic': epic,
        'parent': None if epic or not p else {'k': p.get('key'), 'type': (pf.get('issuetype') or {}).get('name')},
        'components': [c.get('name') for c in f.get('components') or []],
        'labels': f.get('labels') or [],
        'team': (f.get('customfield_10001') or {}).get('name'),
        'releaseDate': max(rel) if rel else None,
    }


def ingest(year, paths):
    out_p = os.path.join(RM, 'pull', year, 'records.json')
    recs = load(out_p) if os.path.exists(out_p) else {}
    for p in paths:
        nodes, info = nodes_of(p)
        for n in nodes:
            recs[n['key']] = norm(n)
        print(os.path.basename(p), len(nodes), 'hasNextPage=%s' % info.get('hasNextPage'),
              'endCursor=%s' % info.get('endCursor'))
    dump(out_p, dict(sorted(recs.items(), key=lambda x: int(x[0].split('-')[1]))))
    print(year, 'records', len(recs))


def status():
    scope = load(os.path.join(RM, 'SCOPE.json'))
    for y in YEARS:
        p = os.path.join(RM, 'pull', y, 'records.json')
        n = len(load(p)) if os.path.exists(p) else 0
        print(y, n, '/', scope['totals'].get(y))


def known_text():
    """Existing what/why/outcome (709 resolved stories) and AI summaries (2026 cache), keyed by story.
    Summaries written from linked Confluence pages (2026 link-only descriptions) take priority."""
    out = {}
    cp = os.path.join(RM, 'enrich', 'confluence', 'ai.json')
    if os.path.exists(cp):
        for k, a in load(cp).items():
            t = ' '.join(x for x in (a.get('what'), a.get('outcome')) if x)
            if t:
                out[k] = t
    for y in ('2023', '2024', '2025'):
        for s in load(os.path.join(ROOT, 'data', y, 'stories.json')):
            w = s.get('wwo') or {}
            t = ' '.join(x for x in (w.get('what'), w.get('outcome')) if x)
            if t:
                out.setdefault(s['k'], t)
    for y in YEARS:
        p = os.path.join(RM, 'enriched', y + '.json')
        if os.path.exists(p):
            for k, r in load(p).items():
                w = r.get('wwo') or {}
                t = ' '.join(x for x in (w.get('what'), w.get('outcome')) if x)
                if t:
                    out.setdefault(k, t)
    for k, s in load(os.path.join(ROOT, 'ledger', 'data', 'stories', 'cache', 'stories.json')).items():
        a = s.get('ai') or {}
        t = ' '.join(x for x in (a.get('s'), a.get('oc')) if x)
        if t:
            out.setdefault(k, t)
    return out


BATCH = 320


def records(year):
    p = os.path.join(RM, 'pull', year, 'records.json')
    return load(p) if os.path.exists(p) else {}


def prep():
    text = known_text()
    rows = []
    for y in YEARS:
        for r in records(y).values():
            rows.append({'k': r['k'], 'summary': r['summary'], 'epic': (r['epic'] or {}).get('summary'),
                         'components': r['components'], 'labels': r['labels'], 'doneAt': r['doneAt'],
                         'text': text.get(r['k'])})
    rows.sort(key=lambda x: x['doneAt'] or '')
    n = 0
    for i in range(0, len(rows), BATCH):
        n += 1
        dump(os.path.join(RM, 'tag', 'input-b%02d.json' % n), rows[i:i + BATCH])
    print('stories', len(rows), 'with text', sum(1 for r in rows if r['text']), 'batches', n)


THEMES = ['web', 'reg', 'meet', 'formats', 'sessions', 'comms', 'exhib', 'onsite', 'mobile', 'analytics', 'ai',
          'integ', 'platform']
EXCLUDE = {'bugfix', 'test', 'internal', 'refactor', 'thin'}


def quarter(ts):
    return '%s-Q%d' % (ts[:4], (int(ts[5:7]) - 1) // 3 + 1) if ts else None


def all_records():
    out = {}
    for y in YEARS:
        out.update(records(y))
    return out


def merge():
    """Tagger outputs -> data/roadmap/tags.json, plus per-theme highlight inputs (data/roadmap/hl/input-<theme>.json)."""
    recs, text = all_records(), known_text()
    tags = {}
    for p in sorted(glob.glob(os.path.join(RM, 'tag', 'b*_w', 'tags.json'))):
        for t in load(p):
            tags[t['k']] = t
    ov = load(os.path.join(RM, 'overrides.json'))
    for k, fix in ov['stories'].items():
        if k in tags:
            tags[k].update({f: v for f, v in fix.items() if f != 'why'})
            tags[k]['override'] = fix['why']
    for t in tags.values():
        t['feature'] = ov['features'].get(t.get('feature'), t.get('feature'))
    dump(os.path.join(RM, 'tags.json'), dict(sorted(tags.items(), key=lambda x: int(x[0].split('-')[1]))))
    by = {th: [] for th in THEMES}
    for k, t in tags.items():
        if t.get('include') and t.get('theme') in by and k in recs:
            r = recs[k]
            by[t['theme']].append({'k': k, 'q': quarter(r['doneAt']), 'feature': t['feature'], 'tags': t.get('tags', []),
                                   'summary': r['summary'], 'epic': (r['epic'] or {}).get('summary'),
                                   'text': text.get(k)})
    for th, rows in by.items():
        rows.sort(key=lambda x: (x['feature'].lower(), x['q'] or ''))
        dump(os.path.join(RM, 'hl', 'input-%s.json' % th), rows)
    print('tags', len(tags), 'of', len(recs), 'included', sum(len(v) for v in by.values()))
    for th in THEMES:
        print(' ', th, len(by[th]), 'features', len({r['feature'] for r in by[th]}))


def check():
    ok = True

    def gate(name, cond, detail=''):
        nonlocal ok
        ok &= bool(cond)
        print('PASS' if cond else 'FAIL', name, detail)

    recs = all_records()
    tags = load(os.path.join(RM, 'tags.json'))
    scope = load(os.path.join(RM, 'SCOPE.json'))
    gate('pull complete', all(len(records(y)) == scope['totals'][y] for y in YEARS))
    gate('every story tagged', set(tags) == set(recs), str(len(set(recs) - set(tags))) + ' missing')
    bad = [k for k, t in tags.items() if t.get('theme') not in THEMES]
    gate('themes valid', not bad, str(bad[:5]))
    bad = [k for k, t in tags.items() if t.get('include') and not t.get('feature')]
    gate('included have a feature', not bad, str(bad[:5]))
    bad = [k for k, t in tags.items() if not t.get('include') and t.get('exclude') not in EXCLUDE]
    gate('excluded have a reason', not bad, str(bad[:5]))
    hp = os.path.join(RM, 'highlights.json')
    if os.path.exists(hp):
        hl = load(hp)
        inc = {k for k, t in tags.items() if t.get('include')}
        used = [k for h in hl for k in h['stories']]
        gate('highlight stories are included stories', set(used) <= inc, str(sorted(set(used) - inc)[:5]))
        gate('every included story in one highlight', set(used) == inc and len(used) == len(set(used)),
             '%d included, %d used, %d unique' % (len(inc), len(used), len(set(used))))
    W, fixes = wwo()
    ids = [h['id'] for h in load(hp)] if os.path.exists(hp) else []
    nx = load(os.path.join(RM, 'coming-next.json'))
    ids += ['next-%d' % i for i, n in enumerate(nx) if not n.get('removed')]
    dlg = load(os.path.join(RM, 'dlg', 'dlg.json'))
    ids += ['dlg-item-%d' % i for i in range(len(dlg['items']))] + ['dlg-next-%d' % i for i in range(len(dlg['next']))]
    miss = [i for i in ids if not all(W.get(i, {}).get(f) for f in ('what', 'why', 'outcome', 'who'))]
    gate('every page item has what, why, outcome and who', not miss, str(miss[:5]))
    lim = {'what': 240, 'why': 220, 'outcome': 220, 'benefit': 160, 'detail': 400}
    bad = [(i, f) for i in ids for f, n in lim.items() if len(W.get(i, {}).get(f) or '') > n]
    gate('copy within length limits', not bad, str(bad[:5]))
    bad = [i for i in ids if set(W.get(i, {}).get('who') or []) - WHO]
    gate('who values valid', not bad, str(bad[:5]))
    pub = lambda i: ' '.join(str(W.get(i, {}).get(f) or '') for f in ('title', 'benefit', 'detail', 'what', 'why', 'outcome'))
    bad = [i for i in ids if re.search(r'EP-\d+', pub(i)) or any(b in pub(i).lower() for b in BANNED)
           or any(re.search(r'\b%s\b' % c.strip(), pub(i)) for c in CLIENTS) or (not i.startswith('dlg-') and re.search(r'\bDLG\b|Agritechnica|EuroTier', pub(i)))]
    gate('no keys, client names, em dashes or marketing words in public copy', not bad, str(bad[:5]))
    gate('removed items stay off the pages', all(n.get('removed') for n in nx if n['title'] in ('Meeting scheduling upgrades', 'Next-generation speed networking')))
    print('fact-check fixes applied', len(fixes))
    print('ALL PASS' if ok else 'FAILURES')
    return ok


def gaps():
    """Per-year key lists of what is still missing -> data/roadmap/gaps/<year>-{enrich,changelog}.txt"""
    full = set()
    for y in ('2023', '2024', '2025'):
        full |= {s['k'] for s in load(os.path.join(ROOT, 'data', y, 'stories.json'))}
    cache = load(os.path.join(ROOT, 'ledger', 'data', 'stories', 'cache', 'stories.json'))
    ai = {k for k, v in cache.items() if v.get('ai')}
    for y in YEARS:
        p = os.path.join(RM, 'enriched', y + '.json')
        if os.path.exists(p):
            full |= set(load(p))
    cl = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(ROOT, 'data', 'done-raw', 'changelog'))}
    out = os.path.join(RM, 'gaps')
    os.makedirs(out, exist_ok=True)
    for y in YEARS:
        ks = sorted(records(y), key=lambda k: int(k.split('-')[1]))
        enrich = [k for k in ks if k not in full and k not in ai]
        chlog = [k for k in ks if k not in cl]
        for name, lst in (('enrich', enrich), ('changelog', chlog)):
            with open(os.path.join(out, '%s-%s.txt' % (y, name)), 'w') as fh:
                fh.write('\n'.join(lst) + '\n')
        print(y, 'done', len(ks), 'need enrichment', len(enrich), 'need changelog', len(chlog))


LEAN = ['summary', 'status', 'issuetype', 'created', 'statuscategorychangedate', 'parent', 'components', 'labels',
        'customfield_10145', 'customfield_12190', 'customfield_10197', 'customfield_10198', 'description']
ENRICH = os.path.join(RM, 'enrich')
WORKERS = 8


def enrich_prep():
    """gaps -> data/roadmap/enrich/wN/keys.json: [{k, a: needs enrichment, b: needs changelog}], balanced by call count."""
    rows = []
    for y in YEARS:
        a = set(open(os.path.join(RM, 'gaps', y + '-enrich.txt')).read().split())
        b = set(open(os.path.join(RM, 'gaps', y + '-changelog.txt')).read().split())
        rows += [{'k': k, 'y': y, 'a': k in a, 'b': k in b} for k in sorted(a | b, key=lambda k: int(k.split('-')[1]))]
    for w in range(WORKERS):
        part = rows[w::WORKERS]
        dump(os.path.join(ENRICH, 'w%d' % (w + 1), 'keys.json'), part)
    print('keys', len(rows), 'A', sum(r['a'] for r in rows), 'B', sum(r['b'] for r in rows),
          'per worker', [len(rows[w::WORKERS]) for w in range(WORKERS)])


def _text(v):
    if isinstance(v, str):
        return v
    return json.dumps(v, ensure_ascii=False) if v else ''


def enrich_ingest(worker, paths):
    """getJiraIssue result files -> wN/records.json (lean fields) + data/done-raw/changelog/<KEY>.json."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import done_stories
    out_p = os.path.join(ENRICH, worker, 'records.json')
    recs = load(out_p) if os.path.exists(out_p) else {}
    for p in paths:
        d = load(p)
        if isinstance(d, list):  # content blocks
            d = json.loads(''.join(b.get('text', '') for b in d if isinstance(b, dict)))
        node = d['issues']['nodes'][0] if 'issues' in d else d
        f = node.get('fields') or {}
        if (f.get('issuetype') or {}).get('name') not in (None, 'Story'):
            print(node['key'], 'SKIPPED: not a Story')
            continue
        opt = lambda v: [x.get('value') for x in v or [] if isinstance(x, dict)]
        desc = _text(f.get('description'))
        recs[node['key']] = {
            'k': node['key'], 'summary': f.get('summary'), 'status': (f.get('status') or {}).get('name'),
            'doneAt': f.get('statuscategorychangedate'),
            'reportedBy': opt(f.get('customfield_10145')), 'affectedClients': opt(f.get('customfield_12190')),
            'whoFor': _text(f.get('customfield_10197')) or None, 'value': _text(f.get('customfield_10198')) or None,
            'components': [c.get('name') for c in f.get('components') or []], 'labels': f.get('labels') or [],
            'description': desc, 'descChars': len(desc.strip()),
        }
        cl = node.get('changelog')
        if cl is not None:
            done_stories.parse_changelog(p)
        print(node['key'], 'desc', len(desc), 'changelog', 'yes' if cl is not None else 'MISSING')
    dump(out_p, recs)
    print(worker, 'records', len(recs))


def _owner():
    own = {}
    for w in range(1, WORKERS + 1):
        for r in load(os.path.join(ENRICH, 'w%d' % w, 'keys.json')):
            own[r['k']] = 'w%d' % w
    return own


def enrich_batch_keys(n=50):
    """A-keys not yet fetched, in JQL batches -> data/roadmap/enrich/batches.json"""
    own, done = _owner(), set()
    for w in set(own.values()):
        p = os.path.join(ENRICH, w, 'records.json')
        if os.path.exists(p):
            done |= set(load(p))
    a = [r['k'] for w in range(1, WORKERS + 1) for r in load(os.path.join(ENRICH, 'w%d' % w, 'keys.json')) if r['a'] and r['k'] not in done]
    a.sort(key=lambda k: int(k.split('-')[1]))
    b = [a[i:i + n] for i in range(0, len(a), n)]
    dump(os.path.join(ENRICH, 'batches.json'), b)
    print('A keys to fetch', len(a), 'batches', len(b))


def enrich_ingest_batch(paths):
    """searchJiraIssuesUsingJql result files (lean fields, many issues) -> owning worker's records.json. No changelog."""
    own = _owner()
    per = {}
    for p in paths:
        nodes, _ = nodes_of(p)
        for node in nodes:
            f = node.get('fields') or {}
            if (f.get('issuetype') or {}).get('name') not in (None, 'Story'):
                print(node['key'], 'SKIPPED: not a Story')
                continue
            opt = lambda v: [x.get('value') for x in v or [] if isinstance(x, dict)]
            desc = _text(f.get('description'))
            per.setdefault(own.get(node['key'], 'w0'), {})[node['key']] = {
                'k': node['key'], 'summary': f.get('summary'), 'status': (f.get('status') or {}).get('name'),
                'doneAt': f.get('statuscategorychangedate'),
                'reportedBy': opt(f.get('customfield_10145')), 'affectedClients': opt(f.get('customfield_12190')),
                'whoFor': _text(f.get('customfield_10197')) or None, 'value': _text(f.get('customfield_10198')) or None,
                'components': [c.get('name') for c in f.get('components') or []], 'labels': f.get('labels') or [],
                'description': desc, 'descChars': len(desc.strip())}
    for w, recs in per.items():
        out_p = os.path.join(ENRICH, w, 'records.json')
        cur = load(out_p) if os.path.exists(out_p) else {}
        cur.update(recs)
        dump(out_p, cur)
    print('ingested', sum(len(v) for v in per.values()), {w: len(v) for w, v in sorted(per.items())})


def enrich_merge():
    """Worker records + ai -> data/roadmap/enriched/<year>.json (recipe A output, one file per year)."""
    rec, ai = {}, {}
    for w in range(1, WORKERS + 1):
        d = os.path.join(ENRICH, 'w%d' % w)
        if os.path.exists(os.path.join(d, 'records.json')):
            rec.update(load(os.path.join(d, 'records.json')))
        if os.path.exists(os.path.join(d, 'ai.json')):
            ai.update({r['k']: r for r in load(os.path.join(d, 'ai.json'))})
    for y in YEARS:
        ks = [k for k in records(y) if k in rec]
        out = {}
        for k in sorted(ks, key=lambda k: int(k.split('-')[1])):
            r = dict(rec[k]); a = ai.get(k) or {}
            r['wwo'] = {f: a.get(f) for f in ('what', 'why', 'outcome', 'cf', 'noDescription')} if a else None
            r['clientsInDescription'] = a.get('clientsInDescription', [])
            r['clientEvidence'] = a.get('clientEvidence')
            out[k] = r
        dump(os.path.join(RM, 'enriched', y + '.json'), out)
        print(y, 'enriched', len(out), 'with summary', sum(1 for r in out.values() if r['wwo'] and r['wwo'].get('what')))


def enrich_status():
    tot = {'keys': 0, 'A': 0, 'Adone': 0, 'Aai': 0, 'B': 0, 'Bdone': 0}
    cl = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(ROOT, 'data', 'done-raw', 'changelog'))}
    for w in range(1, WORKERS + 1):
        d = os.path.join(ENRICH, 'w%d' % w)
        ks = load(os.path.join(d, 'keys.json'))
        rec = load(os.path.join(d, 'records.json')) if os.path.exists(os.path.join(d, 'records.json')) else {}
        ai = {r['k'] for r in load(os.path.join(d, 'ai.json'))} if os.path.exists(os.path.join(d, 'ai.json')) else set()
        a = [r['k'] for r in ks if r['a']]
        b = [r['k'] for r in ks if r['b']]
        row = (len(ks), len(a), sum(k in rec for k in a), sum(k in ai for k in a), len(b), sum(k in cl for k in b))
        print('w%d keys %d | A %d fetched %d written %d | B %d changelog %d' % ((w,) + row))
        for k, v in zip(tot, row):
            tot[k] += v
    print('TOTAL', tot)


THEME_META = [  # id, public name, short label, colour group (CSS var)
    ('web', 'Event Websites & Content', 'Websites', '--g-exp'),
    ('reg', 'Registration, Ticketing & Payments', 'Registration', '--g-exp'),
    ('comms', 'Community & Communications', 'Communications', '--g-exp'),
    ('mobile', 'Mobile App', 'Mobile app', '--g-exp'),
    ('meet', 'Meetings & Matchmaking', 'Meetings', '--g-net'),
    ('formats', 'Networking Formats', 'Networking formats', '--g-net'),
    ('sessions', 'Sessions & Agenda', 'Sessions', '--g-net'),
    ('exhib', 'Exhibitor & Sponsor Success', 'Exhibitors', '--g-exh'),
    ('onsite', 'Onsite, Badges & Floor Plans', 'Onsite', '--g-exh'),
    ('analytics', 'Analytics & Reporting', 'Analytics', '--g-exh'),
    ('ai', 'AI & Smart Discovery', 'AI & search', '--g-plat'),
    ('integ', 'Integrations & Open API', 'Integrations', '--g-plat'),
    ('platform', 'Platform, Security & Admin', 'Platform', '--g-plat'),
]
PUBLIC = ('id', 'theme', 'q', 'title', 'benefit', 'detail', 'level', 'tags', 'what', 'why', 'outcome', 'who')
WWO_FIELDS = ('title', 'benefit', 'detail', 'what', 'why', 'outcome', 'who', 'basis', 'evidence')
WHO = {'Organisers', 'Exhibitors', 'Sponsors', 'Attendees', 'Speakers', 'Registrants', 'App users'}
BANNED = ('seamless', 'powerful', 'revolutionary', 'game-changing', 'effortless', 'cutting-edge', '\u2014')
CLIENTS = ('IMEX', 'DWTC', 'Hyve', 'Informa', 'Vinexposium', 'FBF', 'Gulfood', 'InfoSalons', 'Messe ')


def wwo():
    """What / why / outcome per page item (data/roadmap/wwo/g*_w/wwo.json), with the fact-checkers' fixes
    (g*_v/verdicts.json) applied. Keyed by highlight id, next-<i> (coming-next.json index), dlg-item-<i>, dlg-next-<i>.
    A fix may also correct the existing title, benefit or detail. Spec: data/roadmap/WWO_SPEC.md."""
    out, fixes = {}, {}
    for p in sorted(glob.glob(os.path.join(RM, 'wwo', 'g*_w', 'wwo.json'))):
        for r in load(p):
            out[r['id']] = {f: r.get(f) for f in WWO_FIELDS if r.get(f) is not None}
    for p in sorted(glob.glob(os.path.join(RM, 'wwo', 'g*_v', 'verdicts.json'))):
        for v in load(p):
            if v.get('verdict') == 'fix' and v.get('fix'):
                out.setdefault(v['id'], {}).update({f: x for f, x in v['fix'].items() if f in WWO_FIELDS})
                fixes[v['id']] = v.get('reason')
    return out, fixes


def retag_prep():
    """Stories first tagged from title + epic alone that now have a description-based summary -> review batches."""
    text, recs, tags = known_text(), all_records(), load(os.path.join(RM, 'tags.json'))
    fresh = set(load(os.path.join(RM, 'enrich', 'confluence', 'ai.json')))
    for y in YEARS:
        p = os.path.join(RM, 'enriched', y + '.json')
        if os.path.exists(p):
            fresh |= {k for k, r in load(p).items() if (r.get('wwo') or {}).get('what')}
    rows = []
    for k in sorted(fresh & set(tags), key=lambda k: (tags[k].get('theme') or '', int(k.split('-')[1]))):
        t, r = tags[k], recs.get(k, {})
        rows.append({'k': k, 'summary': r.get('summary'), 'epic': (r.get('epic') or {}).get('summary'),
                     'theme': t.get('theme'), 'include': t.get('include'), 'exclude': t.get('exclude'),
                     'feature': t.get('feature'), 'text': text.get(k)})
    for f in glob.glob(os.path.join(RM, 'tag', 'review-r*.json')):
        os.remove(f)
    n = 0
    for i in range(0, len(rows), 120):
        n += 1
        dump(os.path.join(RM, 'tag', 'review-r%02d.json' % n), rows[i:i + 120])
    print('review', len(rows), 'batches', n)


def assemble():
    """Per-theme highlight files -> data/roadmap/highlights.json (internal: keeps the source stories)."""
    out = []
    for th in THEMES:
        p = os.path.join(RM, 'hl', th + '_w', 'highlights.json')
        if not os.path.exists(p):
            print('missing', th)
            continue
        for h in load(p):
            h['theme'] = th
            out.append(h)
    fixes = load(os.path.join(RM, 'overrides.json')).get('highlights', {})
    for h in out:
        h.update({f: v for f, v in fixes.get(h['id'], {}).items() if f != 'why'})
    out.sort(key=lambda h: (h['q'], THEMES.index(h['theme']), h['level'] != 'headline', h['title']))
    dump(os.path.join(RM, 'highlights.json'), out)
    print('highlights', len(out), 'headlines', sum(h['level'] == 'headline' for h in out))


TIER_ORDER = 'ABCSW'  # strongest first, as in data/roadmap/dlg/EVIDENCE.md
TIER_TEXT = {'A': 'DLG named as asking', 'B': 'DLG case in the ticket', 'C': 'Reported-by field only',
             'S': 'Shared with other clients', 'W': 'Not a DLG request'}


def _quote(q):
    """An evidence quote made safe to show internally: no links, tokens or raw JSON."""
    import re
    if not q or '": "' in q:
        return None
    q = re.sub(r'https?://\S+', '[link]', q)
    q = re.sub(r'\S+@\S+\.\w+', '[email]', q)
    q = re.sub(r'\b[A-Za-z0-9_-]{24,}\b', '[token]', q)
    q = re.sub(r'\s+', ' ', q).strip()
    return q[:320] + ('…' if len(q) > 320 else '')


def dlg_evidence(W, tiers):
    """The internal review's DLG section: every item the DLG page presents as done or in development for DLG,
    with each source story's evidence (data/roadmap/dlg/evidence.csv, pulled from Jira 25 Sep 2026)."""
    import csv
    ev = {r['key']: r for r in csv.DictReader(open(os.path.join(RM, 'dlg', 'evidence.csv'), encoding='utf-8'))}
    cd = load(os.path.join(RM, 'dlg', 'dlg.json'))

    def row(kind, i, x):
        x = dict(x); x.update({f: v for f, v in W.get('dlg-%s-%d' % (kind, i), {}).items() if f in ('title', 'benefit', 'what', 'why', 'outcome', 'who')})
        stories = []
        for k in x['stories']:
            r = ev.get(k, {}); t = (r.get('tier') or tiers.get(k) or '?')[0]
            stories.append({'k': k, 's': r.get('summary'), 't': t, 'tt': TIER_TEXT.get(t, 'Not rated'), 'why': r.get('reason'),
                            'rep': r.get('reportedByField'), 'by': r.get('createdBy'), 'd': r.get('created'), 'st': r.get('status'),
                            'lab': r.get('labels'), 'q': [q for q in (_quote(r.get('quote1')), _quote(r.get('quote2'))) if q][:1 if r.get('quote1') == r.get('quote2') else 2]})
        best = min((s['t'] for s in stories), key=lambda t: TIER_ORDER.index(t) if t in TIER_ORDER else 9)
        return {**{f: x.get(f) for f in ('q', 'theme', 'title', 'benefit', 'what', 'why', 'outcome', 'who', 'stories')},
                'tags': [], 'tier': best, 'tierText': TIER_TEXT.get(best), 'ev': stories}
    return {'name': 'DLG', 'eyebrow': 'Done for DLG · internal evidence',
            'title': 'What the DLG page claims, and where the proof is',
            'intro': 'Every item the DLG Product Journey presents as built or in development for DLG Markets GmbH, with each Jira story, its evidence rating and the line in Jira that ties it to DLG. A = DLG named as asking, B = DLG case in the ticket, C = Reported-by field only (set by our team; confirm with the account manager), S = shared with other clients, W = not a DLG request (remove or reword). Source: data/roadmap/dlg/EVIDENCE.md.',
            'nextTitle': 'In development for DLG',
            'items': [row('item', i, x) for i, x in enumerate(cd['items'])],
            'next': [row('next', i, x) for i, x in enumerate(cd['next'])]}


def build(draft, client=None, internal=False):
    """highlights + copy + coming-next -> dist/roadmap/index.html. Public fields only; no story keys."""
    import base64, re
    hl = load(os.path.join(RM, 'highlights.json'))
    copy = load(os.path.join(RM, 'copy.json'))
    W, _ = wwo()
    allnext = load(os.path.join(RM, 'coming-next.json'))
    for i, n in enumerate(allnext):
        n['id'] = 'next-%d' % i
        n.update({f: v for f, v in W.get(n['id'], {}).items() if f != 'detail'})
    removed = [{'title': n['title'], 'why': n['removed']['why'], 'on': n['removed']['on'], 'stories': n.get('stories', [])}
               for n in allnext if n.get('removed')]
    nxt = [n for n in allnext if not n.get('removed') and (draft or internal or n.get('approved'))]
    for h in hl:
        h.update(W.get(h['id'], {}))
    # Story-type guard: every key behind a page item must come from the Story-only pulls or the verified list
    ok_keys = set(all_records()) | set(records('next')) | set(load(os.path.join(RM, 'verified-stories.json'))['stories'])
    used = {k for h in hl for k in h['stories']} | {k for n in nxt for k in n.get('stories', [])}
    if client:
        cd0 = load(os.path.join(RM, client, client + '.json'))
        used |= {k for i in cd0['items'] + cd0['next'] for k in i['stories']}
    bad = sorted(used - ok_keys)
    if bad:
        sys.exit('refusing to build: not confirmed as Story type: %s' % bad)
    items = [{k: h.get(k) for k in PUBLIC} for h in hl]
    qs = sorted({h['q'] for h in items})
    years = []
    for y in sorted({q[:4] for q in qs}):
        c = copy['years'][y]
        years.append({'year': y, 'label': c['label'], 'title': c['title'], 'review': c['review'],
                      'quarters': [q for q in qs if q.startswith(y)]})
    data = {'themes': [{'id': i, 'name': n, 'short': s, 'color': c} for i, n, s, c in THEME_META],
            'items': items, 'years': years,
            'next': [{k: n.get(k) for k in ('id', 'theme', 'title', 'benefit', 'tags', 'what', 'why', 'outcome', 'who')} | {'level': 'standard', 'q': 'next', 'detail': ''}
                     for n in nxt],
            'copy': dict(copy['page'])}
    if client:
        cd = load(os.path.join(RM, client, client + '.json'))
        for i, x in enumerate(cd['items']):
            x.update({f: v for f, v in W.get('%s-item-%d' % (client, i), {}).items() if f in ('title', 'benefit', 'what', 'why', 'outcome', 'who')})
        for i, x in enumerate(cd['next']):
            x.update({f: v for f, v in W.get('%s-next-%d' % (client, i), {}).items() if f in ('title', 'benefit', 'what', 'why', 'outcome', 'who')})
        keys = {k for i in cd['items'] for k in i['stories']}
        for it, h in zip(items, hl):
            it['client'] = len(keys & set(h['stories'])) * 3 >= len(h['stories'])  # DLG drove at least a third
        data['copy'].update(cd['copy']['page'])
        data['client'] = {'name': cd['client']['name'], **cd['copy']['section'],
                          'items': [{k: i.get(k) for k in ('q', 'theme', 'title', 'benefit', 'what', 'why', 'outcome', 'who')} | {'tags': []} for i in cd['items']],
                          'next': [{k: n.get(k) for k in ('theme', 'title', 'benefit', 'what', 'why', 'outcome', 'who')} | {'tags': []} for n in cd['next'] if draft or n.get('approved')]}
    if internal:
        recs, tags = all_records(), load(os.path.join(RM, 'tags.json'))
        nrec = records('next')
        tiers = load(os.path.join(RM, 'dlg', 'tiers.json'))
        day = lambda r: (r.get('doneAt') or '')[:10]
        src = lambda k, r: {'k': k, 's': r['summary'], 'd': day(r), 'st': r.get('status'), 'dlg': tiers.get(k)}
        MP = {}
        for mp in glob.glob(os.path.join(RM, 'wwo', 'map', 'm*_w', 'map.json')):
            MP.update({x['id']: x for x in load(mp)})
        for mp in glob.glob(os.path.join(RM, 'wwo', 'map', 'm*_v', 'verdicts.json')):
            for v in load(mp):
                if v.get('verdict') == 'fix' and v.get('fix'):
                    MP.setdefault(v['id'], {}).update(v['fix'])
        for it, h in zip(items, hl):
            m = MP.get(h['id'], {})
            it['kind'], it['kindWhy'], it['buildsOn'] = m.get('kind'), m.get('kindWhy'), m.get('buildsOn') or []
            it['basis'], it['evidence'] = h.get('basis'), h.get('evidence')
            it['src'] = sorted((src(k, recs[k]) for k in h['stories']), key=lambda x: x['d'])
        for it, n in zip(data['next'], nxt):
            it['src'] = [src(k, nrec[k]) for k in n.get('stories', []) if k in nrec]
            it['approved'] = bool(n.get('approved'))
            it['basis'], it['evidence'] = n.get('basis'), n.get('evidence')
        data['removed'] = removed
        data['excluded'] = sorted(({'k': k, 's': recs[k]['summary'], 'd': day(recs[k]), 'r': t['exclude'], 'theme': t['theme'],
                                    'why': t.get('override')} for k, t in tags.items() if not t.get('include')), key=lambda x: x['d'])
        # 28 Sep 2026: the owner removed the DLG evidence section and its filter from the internal page (dlg_evidence kept for reuse)
        data['internal'] = {'jira': 'https://expoplatform.atlassian.net/browse/'}
        data['copy'].update({'heroTitle': 'Product journey: review with Jira sources',
                             'heroLede': 'Internal. The full customer roadmap with every feature traced to its Jira stories, plus the stories left off the page and why. Select a feature to see its sources.',
                             'footNote': 'Internal review build. Contains Jira links and internal story titles: do not share outside ExpoPlatform.'})
    blob = json.dumps(data, ensure_ascii=False)
    if not internal and re.search(r'EP-\d+', blob):
        sys.exit('refusing to build: a Jira key is in the public data')
    tpl = open(os.path.join(RM, 'page', 'template.html')).read()

    def logo(v):
        return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(RM, 'page', 'logo-%s.png' % v), 'rb').read()).decode()
    html = (tpl.replace('__DATA__', blob.replace('</', '<\\/'))
            .replace('__LOGO_COLOUR__', logo('colour')).replace('__LOGO_WHITE__', logo('white')))
    if client:
        html = html.replace('<title>ExpoPlatform Product Journey</title>', '<title>%s Product Journey</title>' % data['client']['name'], 1)
    if draft:
        html = html.replace('<header class="top">', '<div style="background:#FFDF41;color:#041167;text-align:center;'
                            'font:600 13px/1.4 Inter,system-ui,sans-serif;padding:8px 16px">Review draft: not approved '
                            'for sharing yet. Coming next items are unconfirmed.</div>\n<header class="top">', 1)
    if internal:
        html = html.replace('<title>ExpoPlatform Product Journey</title>', '<title>Product Journey Review</title>', 1)
        html = html.replace('<header class="top">', '<div style="background:#B42318;color:#fff;text-align:center;font:600 13px/1.4 Inter,system-ui,sans-serif;padding:8px 16px">Internal review: contains Jira links and internal story titles. Do not share with customers.</div>\n<header class="top">', 1)
    out = os.path.join(ROOT, 'dist-journey', 'roadmap' + ('-' + client if client else '') + ('-internal' if internal else ''), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(html)
    print('built', out, len(html) // 1024, 'KB', 'items', len(items), 'next', len(data['next']), 'draft' if draft else 'final',
          'client items %d, badged %d' % (len(data['client']['items']), sum(i.get('client', False) for i in items)) if client else '')


if __name__ == '__main__':
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('', [])
    if cmd == 'ingest':
        ingest(args[0], args[1:])
    elif cmd == 'status':
        status()
    elif cmd == 'prep':
        prep()
    elif cmd == 'merge':
        merge()
    elif cmd == 'enrich-prep':
        enrich_prep()
    elif cmd == 'enrich-ingest':
        enrich_ingest(args[0], args[1:])
    elif cmd == 'enrich-batches':
        enrich_batch_keys()
    elif cmd == 'enrich-ingest-batch':
        enrich_ingest_batch(args)
    elif cmd == 'enrich-merge':
        enrich_merge()
    elif cmd == 'enrich-status':
        enrich_status()
    elif cmd == 'gaps':
        gaps()
    elif cmd == 'retag-prep':
        retag_prep()
    elif cmd == 'assemble':
        assemble()
    elif cmd == 'build':
        cl = next((a.split('=', 1)[1] for a in args if a.startswith('--client=')), None)
        build('--draft' in args, cl, '--internal' in args)
    elif cmd == 'check':
        sys.exit(0 if check() else 1)
    else:
        print(__doc__)
