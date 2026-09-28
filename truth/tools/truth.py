#!/usr/bin/env python3
"""Product Truth: one store, one client identity, one product map, two signals.

Reads the existing sources (read-only), joins them into truth/spine/, computes the signals and builds the hub page.
Every step fingerprints its inputs; `run` redoes only the steps whose inputs changed, so the whole chain follows
any upstream refresh on its own.

  python3 truth/tools/truth.py status          sources, freshness, step state, open decisions
  python3 truth/tools/truth.py run [--force]   rebuild what is stale, then check
  python3 truth/tools/truth.py check           every gate; non-zero exit on any FAIL
  python3 truth/tools/truth.py explain <id>    one client (Pipedrive id or name), story, request or cluster, with provenance
  python3 truth/tools/truth.py decisions       open decisions and what they default to
  python3 truth/tools/truth.py decide <D#> <option#> [note]   record an owner decision locally
  python3 truth/tools/truth.py import-decisions <file>        take decisions answered on the page (ArtifactData list dump)
"""
import datetime as dt, glob, hashlib, json, os, re, sys, collections as C

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = os.path.join(ROOT, 'truth')
SPINE, STATE, DIST = (os.path.join(T, d) for d in ('spine', 'state', 'dist'))
CFG = json.load(open(os.path.join(T, 'config.json')))
TODAY = dt.date.today()


def rp(p): return os.path.join(ROOT, p)
def load(p): return json.load(open(rp(p) if not os.path.isabs(p) else p))
def save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f: json.dump(obj, f, ensure_ascii=False, indent=1 if path.endswith(('manifest.json', 'decisions.json')) else None)
    os.replace(tmp, path)
def sp(name): return os.path.join(SPINE, name)
def norm(s): return re.sub(r'[^a-z0-9]', '', str(s or '').lower())
def day(s):
    try: return dt.date.fromisoformat(str(s)[:10])
    except Exception: return None
def now_iso(): return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


# ---------------------------------------------------------------- decisions
def decisions():
    path = os.path.join(STATE, 'decisions.json')
    have = json.load(open(path)) if os.path.exists(path) else {}
    out = {}
    for d in CFG['decisions']:
        r = have.get(d['id'], {})
        out[d['id']] = {'choice': r.get('choice', d['default']), 'decided': bool(r.get('decided')), 'note': r.get('note', ''),
                        'by': r.get('by'), 'at': r.get('at'), 'h': r.get('h', [])}
    return out
def choice(did): return decisions()[did]['choice']


# ---------------------------------------------------------------- step 1: identity
LEDGER_PARENTS = {'82918'}   # Informa group parent (D1)

def step_identity():
    L = load('ledger/data/ledger.json')
    cmap = load('data/done-raw/client_map.json')
    rcust = load('requests/db/customers.json')
    d1 = choice('D1')
    clients, alias = [], {}
    byname = {}
    for c in L['companies']:
        pd = str(c['pd'])
        kind = 'client'
        if pd in LEDGER_PARENTS: kind = 'group-parent'
        elif not c.get('inPlanhatActive') or c.get('tier') is None: kind = 'inactive'
        if pd in LEDGER_PARENTS and d1 == 1: continue
        if pd in LEDGER_PARENTS and d1 == 2: kind = 'client'
        short = re.split(r'\s[-(]|,', c['name'])[0].strip()
        rec = {'id': pd, 'name': c['name'], 'short': short if len(short) >= 3 else c['name'], 'kind': kind, 'tier': c.get('tier'),
               'type': c.get('type'), 'owner': c.get('owner'), 'health': c.get('health'), 'sentiment': c.get('sentiment'),
               'renewal': c.get('renewal'), 'customerSince': c.get('customerSince'), 'lastTouch': c.get('lastTouch'),
               'bugHistory': c.get('jiraBugsTotal'), 'healthBreakdown': c.get('breakdown'), 'aliases': [],
               'src': {'record': 'ledger companies (Planhat)', 'asOf': L.get('asOf')}}
        clients.append(rec); byname[norm(c['name'])] = rec
        for a in [c['name'], short] + list(c.get('deliveryTags') or []):
            if norm(a): alias.setdefault(norm(a), (pd, 'ledger'))
    for tok, v in cmap.items():
        if not isinstance(v, dict): continue
        if v.get('client') and norm(v['client']) in byname:
            alias.setdefault(norm(tok), (byname[norm(v['client'])]['id'], 'client_map:' + v.get('basis', '')))
    for r in rcust:
        if r.get('client') and norm(r['client']) in byname:
            alias.setdefault(norm(r['name']), (byname[norm(r['client'])]['id'], 'requests:' + r.get('basis', '')))
        if r.get('pipedriveId') and r.get('client') and norm(r['client']) in byname:
            alias.setdefault(norm(r['pipedriveId']), (byname[norm(r['client'])]['id'], 'pipedrive'))
    for c in clients: alias.setdefault(norm(c['id']), (c['id'], 'pipedrive'))
    # organisations outside the ledger: named in requests or stories, not a current client
    unresolved = {k for k, v in cmap.items() if isinstance(v, dict) and v.get('basis') == 'unresolved'}
    orgs = {}
    def outside(name, how, n=1):
        k = norm(name)
        if not k or k == 'internal' or k in alias: return
        o = orgs.setdefault(k, {'id': 'org:' + k, 'name': name, 'kind': 'unresolved' if name in unresolved or name.startswith('Informa') else 'outside',
                                'tier': None, 'mentions': 0, 'via': set()})
        o['mentions'] += n; o['via'].add(how)
    for r in rcust:
        if not r.get('client') and r.get('basis') != 'internal':
            outside(r['name'], 'requests', sum((r.get('items') or {}).values()) or 1)
    for s in load('analysis/stories.json')['stories']:
        for cn in s.get('customers') or []: outside(cn['name'] if isinstance(cn, dict) else cn, 'stories')
    for c in clients: c['aliases'] = sorted({a for a, v in alias.items() if v[0] == c['id']})
    org_list = sorted(({**o, 'via': sorted(o['via'])} for o in orgs.values()), key=lambda o: -o['mentions'])
    save(sp('clients.json'), {'builtAt': now_iso(), 'decisions': {'D1': d1}, 'clients': clients, 'organisations': org_list,
                              'alias': {k: v[0] for k, v in alias.items()}, 'aliasBasis': {k: v[1] for k, v in alias.items()}})
    return {'clients': len(clients), 'aliases': len(alias), 'outsideOrganisations': len(org_list)}


class Ident:
    def __init__(self):
        d = json.load(open(sp('clients.json')))
        self.alias = d['alias']; self.clients = {c['id']: c for c in d['clients']}
        self.orgs = {o['id']: o for o in d['organisations']}
    def resolve(self, name):
        k = norm(name)
        if not k or k == 'internal': return None
        if k in self.alias: return self.alias[k]
        oid = 'org:' + k
        return oid if oid in self.orgs else None
    def tier(self, cid):
        c = self.clients.get(cid); return c['tier'] if c and c['kind'] in ('client', 'group-parent') else None


# ---------------------------------------------------------------- step 2: taxonomy (the product map)
COMPONENT_PRODUCT = {
    'Website': 'Event Website', 'Online Registration': 'Online Registration', 'Payments': 'Transactions & Purchasing',
    'Marketing': 'User Engagement', 'Networking': 'Networking & Interactions', 'Reporting': 'Organiser Analytics',
    'Floor Plan': 'Floor Plan', 'Lead Intelligence': 'Lead Intelligence', 'Sponsorship': 'Sponsorship',
    'Hosted Buyer Management': 'Hosted Buyer Management', 'Mobile App': 'Mobile App', 'Admin Interface': 'Admin / Platform Core',
    'Exhibitor Manual': 'Exhibitor Portal', 'Exhibitor Marketplace': 'Exhibitor Marketplace',
    'Online Meetings & Webinars': 'Sessions & Speakers', 'Schedule Management': 'Sessions & Speakers',
    'Session & Speaker Management': 'Sessions & Speakers', 'Membership Management': 'Community', 'Profile': 'Profile',
}   # data/stories/pa/SPEC.md v2, rule 1 (KB §12). Curated Meeting is ambiguous and never decides alone here.
THEME_NAMES = {'web': 'Event Websites & Content', 'reg': 'Registration, Ticketing & Payments', 'meet': 'Meetings & Matchmaking',
               'netfmt': 'Networking Formats', 'sess': 'Sessions & Agenda', 'comm': 'Community & Communications',
               'exh': 'Exhibitor & Sponsor Success', 'onsite': 'Onsite, Badges & Floor Plans', 'mobile': 'Mobile App',
               'analytics': 'Analytics & Reporting', 'ai': 'AI & Smart Discovery', 'integ': 'Integrations & Open API',
               'platform': 'Platform, Security & Admin'}

def component_product(comps):
    ps = {COMPONENT_PRODUCT[c] for c in comps or [] if c in COMPONENT_PRODUCT}
    return ps.pop() if len(ps) == 1 else None

def step_taxonomy():
    kb = load('ledger/data/stories/pa/kb_products.json')['products']
    L = load('ledger/data/ledger.json')
    cls = {r['k']: r for r in load('ledger/data/stories/pa/classification.json')['stories']}
    tags = load('data/roadmap/tags.json')
    theme_ids = sorted({t['theme'] for t in tags.values() if t.get('theme')})
    cross = C.defaultdict(C.Counter)
    for k, r in cls.items():
        t = tags.get(k)
        if t and t.get('theme'): cross[t['theme']][r['product']] += 1
    themes = []
    for tid in theme_ids:
        cnt = cross.get(tid, C.Counter()); n = sum(cnt.values())
        top = cnt.most_common(1)[0] if n else (None, 0)
        themes.append({'id': tid, 'name': THEME_NAMES.get(tid, tid), 'evidence': n,
                       'products': [{'product': p, 'stories': c, 'share': round(c / n, 3)} for p, c in cnt.most_common()],
                       'mainProduct': top[0] if n and top[1] / n >= 0.5 else None, 'mainShare': round(top[1] / n, 3) if n else 0})
    products = []
    area_of = {p: a['d'] for a in L['productAreas'] for p in a['products']}
    for name, p in kb.items():
        products.append({'id': name, 'name': name, 'domain': p.get('domain') or area_of.get(name), 'features': len(p.get('features') or []),
                         'featureList': [f[1] for f in (p.get('features') or [])][:40], 'kbLines': p.get('lines'),
                         'themes': sorted([{'theme': t['id'], 'name': t['name'], 'stories': next(x['stories'] for x in t['products'] if x['product'] == name)}
                                           for t in themes if any(x['product'] == name for x in t['products'])], key=lambda x: -x['stories'])})
    if 'Unassigned / Cross-cutting' not in kb:
        products.append({'id': 'Unassigned / Cross-cutting', 'name': 'Unassigned / Cross-cutting', 'domain': 'Cross-cutting', 'features': 0,
                         'featureList': [], 'kbLines': None, 'themes': []})
    domains = []
    for a in L['productAreas']:
        domains.append({'id': a['d'], 'products': a['products']})
    save(sp('products.json'), {'builtAt': now_iso(), 'rule': 'KB product is the base axis (SPEC v2); roadmap themes map by co-occurrence on 2026 stories',
                               'domains': domains, 'products': products, 'themes': themes, 'componentRule': COMPONENT_PRODUCT})
    return {'products': len(products), 'domains': len(domains), 'themes': len(themes), 'themesMapped': sum(1 for t in themes if t['mainProduct'])}


# ---------------------------------------------------------------- step 3: stories (one list, every population)
def step_stories():
    I = Ident()
    A = load('analysis/stories.json')['stories']
    cls = {r['k']: r for r in load('ledger/data/stories/pa/classification.json')['stories']}
    tags = load('data/roadmap/tags.json')
    feat = {}
    for h in load('data/roadmap/highlights.json'):
        for k in h.get('stories') or []: feat[k] = {'id': h['id'], 'title': h['title'], 'q': h.get('q')}
    starts = load('data/roadmap/starts.json')
    L = load('ledger/data/ledger.json'); led = {s['k']: s for s in L['stories']}
    theme_main = {t['id']: t['mainProduct'] for t in json.load(open(sp('products.json')))['themes']}
    d4 = choice('D4')
    out = []
    for s in A:
        k = s['k']; c = cls.get(k); t = tags.get(k) or {}
        if c: prod, basis, conf, ev = c['product'], 'classified', c.get('confidence'), c.get('evidence')
        elif s.get('productArea'): prod, basis, conf, ev = s['productArea'], 'classified', 'Medium', 'ledger story product'
        else:
            prod = component_product(s.get('components'))
            if prod: basis, conf, ev = 'component', 'Medium', 'component ' + ', '.join(s.get('components') or []) + ' (rule 1 only, content not checked)'
            elif t.get('theme') and theme_main.get(t['theme']):
                prod, basis, conf, ev = theme_main[t['theme']], 'theme', 'Low', 'roadmap theme ' + THEME_NAMES.get(t['theme'], t['theme']) + ' → most common product'
            else: prod, basis, conf, ev = 'Unassigned / Cross-cutting', 'none', 'Low', 'no component, classification or mapped theme'
        cids = []
        for cn in s.get('customers') or []:
            cid = I.resolve(cn['name'] if isinstance(cn, dict) else cn)
            if cid and cid not in cids: cids.append(cid)
        tiers = sorted({I.tier(x) for x in cids if I.tier(x)})
        st = starts.get(k) or {}
        ls = led.get(k)
        out.append({'k': k, 'summary': s.get('summary'), 'stage': s.get('stage'), 'status': s.get('status'),
                    'created': s.get('created'), 'done': s.get('doneDate'), 'year': s.get('doneYear'), 'q': s.get('doneQuarter'),
                    'start': (st.get('startExact') or '')[:10] or st.get('startMonth'), 'team': s.get('team'), 'epic': s.get('epic'), 'epicKey': s.get('epicKey'),
                    'components': s.get('components') or [], 'product': prod, 'productBasis': basis, 'productConfidence': conf, 'productEvidence': ev,
                    'theme': t.get('theme'), 'customerFacing': bool(t.get('include')), 'feature': (feat.get(k) or {}).get('title'),
                    'clients': cids, 'tiers': tiers, 'topTier': tiers[0] if tiers else None,
                    'driver': s.get('valueDriver'), 'driver2': s.get('secondaryDriver'), 'driverWhy': s.get('driverRationale'), 'driverConfidence': s.get('driverConfidence'),
                    'what': s.get('what'), 'why': s.get('why'), 'outcome': s.get('outcome'),
                    'onLedger': bool(s.get('onLedgerPage') or ls), 'lens': (ls or {}).get('lens'),
                    'src': {'record': 'analysis/stories.json', 'product': basis, 'theme': 'data/roadmap/tags.json' if t else None}})
    save(sp('stories.json'), {'builtAt': now_iso(), 'decisions': {'D4': d4}, 'stories': out})
    return {'stories': len(out), 'byStage': dict(C.Counter(s['stage'] for s in out)), 'byProductBasis': dict(C.Counter(s['productBasis'] for s in out)),
            'withClient': sum(1 for s in out if any(not c.startswith('org:') for c in s['clients']))}


# ---------------------------------------------------------------- step 4: demand (requests and clusters)
def built_state(s):
    s = str(s or '')
    if s.startswith('Already built'): return 'built'
    if s.startswith('Partially built'): return 'partial'
    if s.startswith('Related'): return 'related'
    return 'none'

def step_demand():
    I = Ident()
    items = load('intel/db/items.json'); clusters = load('intel/db/clusters.json')
    tw = {int(k): v for k, v in CFG['tierWeights'].items() if k.isdigit()}
    reqs = []
    for i in items:
        cids = []
        for cu in i.get('customers') or []:
            cid = I.resolve(cu.get('client') or cu.get('name'))
            if cid and cid not in cids: cids.append(cid)
        reqs.append({'id': i['id'], 'key': i.get('key'), 'link': i.get('link'), 'source': i['source'], 'title': i.get('title'), 'status': i.get('status'),
                     'created': (i.get('created') or '')[:10] if re.match(r'\d{4}-\d{2}-\d{2}', str(i.get('created') or '')) else None, 'team': i.get('team'), 'product': i.get('product'), 'domain': i.get('domain'),
                     'kind': i.get('requestKind'), 'what': i.get('what'), 'why': i.get('why'), 'outcome': i.get('outcome'),
                     'clients': cids, 'topTier': i.get('topTier'), 'cluster': i.get('clusterId'), 'textQuality': i.get('textQuality'),
                     'built': sorted({built_state(b.get('verdict')) for b in i.get('builtOverlap') or []} - {'none'}),
                     'fisScore': i.get('fisScore'), 'votes': i.get('votes'), 'comments': i.get('commentCount'), 'internal': i.get('internal')})
    rq = {r['id']: r for r in reqs}
    out = []
    for c in clusters:
        mem = [m for m in c.get('members') or []]
        cids = []
        for m in mem:
            for x in (rq.get(m['id']) or {}).get('clients', []):
                if x not in cids: cids.append(x)
        for cu in c.get('customers') or []:
            x = I.resolve(cu.get('client') or cu.get('name'))
            if x and x not in cids: cids.append(x)
        ledger_ids = [x for x in cids if not x.startswith('org:')]
        created = sorted(d for d in ((rq.get(m['id']) or {}).get('created') for m in mem) if d)
        tiers = [I.tier(x) for x in ledger_ids if I.tier(x)]
        out.append({'id': c['id'], 'name': c['name'], 'product': c.get('product'), 'domain': c.get('domain'),
                    'what': c.get('what'), 'why': c.get('why'), 'outcome': c.get('outcome'),
                    'members': [{'id': m['id'], 'role': m.get('role'), 'note': m.get('note')} for m in mem],
                    'asks': c.get('uniqueAsks') or len(mem), 'items': c.get('itemCount') or len(mem), 'duplicates': c.get('duplicates', 0),
                    'clients': cids, 'ledgerClients': ledger_ids, 'topTier': min(tiers) if tiers else c.get('topTier'),
                    'tierCounts': c.get('tierCounts') or {}, 't1': c.get('t1Customers') or [],
                    'tierSignal': c.get('tierSignal') if c.get('tierSignal') is not None else sum(tw.get(t, 0) for t in tiers),
                    'built': built_state(c.get('builtOverlap')), 'builtNote': c.get('builtOverlap'),
                    'oldest': created[0] if created else None, 'newest': created[-1] if created else None,
                    'sources': c.get('sources') or {}, 'internalOnly': c.get('internalOnly'), 'fisBest': c.get('fisBest')})
    save(sp('requests.json'), {'builtAt': now_iso(), 'requests': reqs})
    save(sp('clusters.json'), {'builtAt': now_iso(), 'clusters': out})
    return {'requests': len(reqs), 'clusters': len(out), 'clustersNotBuilt': sum(1 for c in out if c['built'] in ('none', 'related'))}


# ---------------------------------------------------------------- step 5: health, events, promises
def step_health():
    I = Ident()
    L = load('ledger/data/ledger.json')
    bugs = []
    for b in L['bugs']:
        ids = [str(x) for x in (b.get('repIds') or []) + (b.get('affIds') or [])] or ([str(b['pd'])] if b.get('pd') else [])
        cids = []
        for x in ids:
            cid = I.resolve(x)
            if cid and cid not in cids: cids.append(cid)
        bugs.append({'k': b['key'], 'summary': b['s'], 'status': b['st'], 'cat': b['sc'], 'priority': b['p'], 'created': b['cr'], 'updated': b.get('up'),
                     'components': b.get('comp') or [], 'product': component_product(b.get('comp')) or 'Unassigned / Cross-cutting',
                     'team': b.get('team'), 'event': b.get('ev'), 'clients': cids})
    incs = []
    for i in L['incidents']:
        cids = [c for c in (I.resolve(x) for x in (i.get('ids') or [])) if c]
        incs.append({'k': i['key'], 'summary': i['s'], 'status': i['st'], 'priority': i['p'], 'created': i['cr'], 'event': i.get('ev'), 'clients': cids})
    evs = []
    for e in L['events']:
        evs.append({'k': e['k'], 'name': e['n'], 'start': e.get('s'), 'end': e.get('e'), 'status': e.get('st'), 'kind': e.get('kind'),
                    'country': e.get('ctry'), 'client': I.resolve(e['pd']) if e.get('pd') else None})
    proms = []
    for f in sorted(glob.glob(rp('live/db/pipeline/*.json'))):
        p = json.load(open(f))
        if p.get('deleted'): continue
        v = p.get('v') or {}; j = p.get('j') or {}
        proms.append({'id': os.path.basename(f)[:-5], 'key': v.get('key') or None, 'feature': v.get('feature') or j.get('summary'),
                      'month': v.get('month'), 'status': v.get('status'), 'jiraStatus': j.get('status'), 'due': j.get('due'),
                      'team': v.get('team') or j.get('team'), 'client': I.resolve(v['driver']) if v.get('driver') else None,
                      'priority': v.get('priority'), 'impact': v.get('impact'), 'flags': [k for k, x in (p.get('flags') or {}).items() if x]})
    save(sp('health.json'), {'builtAt': now_iso(), 'asOf': L.get('asOf'), 'eventsAsOf': L.get('eventsAsOf'), 'bugs': bugs, 'incidents': incs, 'events': evs, 'promises': proms})
    return {'openClientBugs': len(bugs), 'incidents': len(incs), 'events': len(evs), 'promises': len(proms),
            'promisesWithClient': sum(1 for p in proms if p['client'])}


# ---------------------------------------------------------------- step 6: signals
def step_signals():
    cl = json.load(open(sp('clients.json'))); S = json.load(open(sp('stories.json')))['stories']
    R = json.load(open(sp('requests.json')))['requests']; K = json.load(open(sp('clusters.json')))['clusters']
    H = json.load(open(sp('health.json'))); P = json.load(open(sp('products.json')))
    a = CFG['attention']
    per = {c['id']: {'id': c['id'], 'flags': [], 'delivered': C.Counter(), 'deliveredByYear': C.Counter(), 'inProgress': 0, 'lastDelivered': None,
                     'openAsks': 0, 'openClusters': 0, 'asksBuilt': 0, 'oldestAsk': None, 'severeBugs': 0, 'openBugs': 0, 'recentIncidents': 0,
                     'promises': 0, 'promisesAtRisk': 0, 'nextShow': None, 'showsNext90': 0} for c in cl['clients']}
    for s in S:
        for cid in s['clients']:
            p = per.get(cid)
            if not p: continue
            if s['stage'] == 'Done':
                p['delivered'][s['driver'] or 'Unknown'] += 1; p['deliveredByYear'][str(s['year'])] += 1
                if s['done'] and (not p['lastDelivered'] or s['done'] > p['lastDelivered']): p['lastDelivered'] = s['done']
            elif s['stage'] == 'In progress': p['inProgress'] += 1
    for r in R:
        for cid in r['clients']:
            p = per.get(cid)
            if p:
                p['openAsks'] += 1
                if r['created'] and (not p['oldestAsk'] or r['created'] < p['oldestAsk']): p['oldestAsk'] = r['created']
    for k in K:
        for cid in k['ledgerClients']:
            p = per.get(cid)
            if p:
                if k['built'] in ('none', 'related'): p['openClusters'] += 1
                else: p['asksBuilt'] += 1
    for b in H['bugs']:
        for cid in b['clients']:
            p = per.get(cid)
            if p:
                p['openBugs'] += 1
                if b['priority'] in a['severeBugPriorities']: p['severeBugs'] += 1
    for i in H['incidents']:
        d = day(i['created'])
        for cid in i['clients']:
            p = per.get(cid)
            if p and d and (TODAY - d).days <= a['incidentWindowDays'] and i['status'] != 'Cancelled': p['recentIncidents'] += 1
    for pr in H['promises']:
        p = per.get(pr['client'] or '')
        if p and 'shipped' not in pr['flags']:
            p['promises'] += 1
            if {'overdue', 'dueSoon', 'drift'} & set(pr['flags']): p['promisesAtRisk'] += 1
    for e in H['events']:
        p = per.get(e['client'] or ''); d = day(e['start'])
        if not p or not d or e['status'] == 'Cancelled' or d < TODAY: continue
        if not p['nextShow'] or e['start'] < p['nextShow']['start']: p['nextShow'] = {'k': e['k'], 'name': e['name'], 'start': e['start'], 'days': (d - TODAY).days}
        if (d - TODAY).days <= 90: p['showsNext90'] += 1
    cmeta = {c['id']: c for c in cl['clients']}
    for cid, p in per.items():
        c = cmeta[cid]; f = p['flags']
        ns = p['nextShow']
        if ns and ns['days'] <= a['showWindowDays']: f.append({'id': 'show', 'text': f"{ns['name']} starts in {ns['days']} days"})
        if p['severeBugs']: f.append({'id': 'bugs', 'text': f"{p['severeBugs']} Urgent or High open bug{'s' if p['severeBugs'] > 1 else ''}"})
        if p['recentIncidents']: f.append({'id': 'incident', 'text': f"{p['recentIncidents']} incident{'s' if p['recentIncidents'] > 1 else ''} in {a['incidentWindowDays']} days"})
        if p['promisesAtRisk']: f.append({'id': 'promise', 'text': f"{p['promisesAtRisk']} promise{'s' if p['promisesAtRisk'] > 1 else ''} overdue, due soon or drifting"})
        if p['openAsks'] >= a['manyAsks']: f.append({'id': 'asks', 'text': f"{p['openAsks']} open requests, oldest {p['oldestAsk'][:7] if p['oldestAsk'] else '?'}"})
        ld = day(p['lastDelivered'])
        if not ld or (TODAY - ld).days > a['quietDeliveryDays']:
            f.append({'id': 'quiet', 'text': 'nothing delivered for them in ' + (f"{(TODAY - ld).days} days" if ld else 'the stories we hold')})
        if c.get('health') is not None and c['health'] <= a['lowHealthAtOrBelow']: f.append({'id': 'health', 'text': f"Planhat health {c['health']}"})
        p['delivered'] = dict(p['delivered']); p['deliveredByYear'] = dict(p['deliveredByYear'])
        p['ranked'] = c['kind'] == 'client'
        p['attention'] = len(f) + (1 if (ns and ns['days'] <= a['showWindowDays'] and len(f) > 1) else 0)
        p['level'] = 'act' if p['ranked'] and ns and ns['days'] <= a['showWindowDays'] and len(f) >= 3 else ('watch' if p['ranked'] and len(f) >= 2 else 'calm')
    ranking = sorted([p for p in per.values() if p['ranked']], key=lambda p: (-p['attention'], cmeta[p['id']]['tier'] or 9, (p['nextShow'] or {}).get('days', 999)))
    # product rollup: built, asked, broken
    prods = {}
    for pr in P['products']:
        prods[pr['id']] = {'id': pr['id'], 'domain': pr['domain'], 'doneByYear': C.Counter(), 'done': 0, 'inProgress': 0, 'notStarted': 0,
                           'drivers': C.Counter(), 'asks': 0, 'clusters': 0, 'clustersOpen': 0, 'tierSignalOpen': 0, 'clientsAsking': set(), 't1Asking': set(),
                           'bugs': 0, 'severeBugs': 0, 'lowConfidenceStories': 0}
    for s in S:
        p = prods.get(s['product'])
        if not p: continue
        if s['stage'] == 'Done': p['done'] += 1; p['doneByYear'][str(s['year'])] += 1; p['drivers'][s['driver'] or 'Unknown'] += 1
        elif s['stage'] == 'In progress': p['inProgress'] += 1
        else: p['notStarted'] += 1
        if s['productConfidence'] == 'Low': p['lowConfidenceStories'] += 1
    for r in R:
        p = prods.get(r['product'])
        if p: p['asks'] += 1
    for k in K:
        p = prods.get(k['product'])
        if not p: continue
        p['clusters'] += 1
        if k['built'] in ('none', 'related'):
            p['clustersOpen'] += 1; p['tierSignalOpen'] += k['tierSignal'] or 0
            for cid in k['ledgerClients']:
                if (cmeta.get(cid) or {}).get('kind') != 'client': continue   # group parent and inactive stay out of rollups (D1)
                p['clientsAsking'].add(cid)
                if (cmeta.get(cid) or {}).get('tier') == 1: p['t1Asking'].add(cid)
    for b in H['bugs']:
        p = prods.get(b['product'])
        if p: p['bugs'] += 1; p['severeBugs'] += b['priority'] in a['severeBugPriorities']
    prod_out = []
    for p in prods.values():
        prod_out.append({**p, 'doneByYear': dict(p['doneByYear']), 'drivers': dict(p['drivers']), 'clientsAsking': sorted(p['clientsAsking']),
                         't1Asking': sorted(p['t1Asking'])})
    # demand signal per cluster: components only, sorted by tier signal (D2 default)
    bug_by = C.defaultdict(int)
    for b in H['bugs']:
        for cid in b['clients']: bug_by[(cid, b['product'])] += 1
    dem = []
    for k in K:
        pain = sum(bug_by[(cid, k['product'])] for cid in k['ledgerClients'])
        age = (TODAY - day(k['oldest'])).days if day(k['oldest']) else None
        shows = sorted(((per[c]['nextShow'] or {}).get('days', 999) for c in k['ledgerClients'] if c in per))
        dem.append({'id': k['id'], 'tierSignal': k['tierSignal'] or 0, 't1': len([c for c in k['ledgerClients'] if (cmeta.get(c) or {}).get('tier') == 1]),
                    'ledgerClients': len(k['ledgerClients']), 'allClients': len(k['clients']), 'asks': k['asks'], 'built': k['built'],
                    'ageDays': age, 'bugsSameProduct': pain, 'nearestShowDays': shows[0] if shows and shows[0] < 999 else None,
                    'bestFor': [c for c in k['ledgerClients'] if (cmeta.get(c) or {}).get('tier') == 1 and bug_by[(c, k['product'])] > 0
                                and c in per and (per[c]['nextShow'] or {}).get('days', 999) <= a['showWindowDays']] if k['built'] in ('none', 'related') else []})
        dem[-1]['best'] = bool(dem[-1]['bestFor'])
    dem.sort(key=lambda d: (d['built'] in ('built', 'partial'), -d['tierSignal'], -d['t1'], -(d['ageDays'] or 0)))
    save(sp('signals.json'), {'builtAt': now_iso(), 'today': TODAY.isoformat(), 'thresholds': a, 'decisions': {'D2': choice('D2'), 'D3': choice('D3')},
                              'rule': {'client': 'attention = number of flags raised, +1 when a show is inside the window and another flag is up; level act = show inside window and 3+ flags; watch = 2+ flags',
                                       'demand': 'sorted by: not yet built first, then tier signal (T1 8, T2 4, T3 2, T4 1 per distinct customer), then Tier 1 clients, then age. Best signal = not built, a Tier 1 client asks, that client has open bugs in the same product, and a show inside the window'},
                              'clients': per, 'ranking': [p['id'] for p in ranking], 'products': prod_out, 'demand': dem})
    return {'act': sum(1 for p in per.values() if p['level'] == 'act'), 'watch': sum(1 for p in per.values() if p['level'] == 'watch'),
            'bestSignal': sum(1 for d in dem if d['best'])}


# ---------------------------------------------------------------- step 7: quality (coverage, gaps, freshness)
def get_path(obj, path):
    for part in path.split('.'): obj = obj.get(part) if isinstance(obj, dict) else None
    return obj

def source_status():
    out = []
    for s in CFG['sources']:
        p = rp(s['path']); exists = os.path.exists(p); asof = None
        try:
            if s.get('asOfMtime'): asof = dt.datetime.fromtimestamp(os.path.getmtime(p)).date().isoformat()
            elif s.get('asOfFile'): asof = str(get_path(load(s['asOfFile']), s['asOf']))[:10]
            else: asof = str(get_path(load(s['path']), s['asOf']))[:10]
        except Exception: asof = None
        age = (TODAY - day(asof)).days if day(asof) else None
        out.append({**s, 'exists': exists, 'asOfDate': asof, 'ageDays': age,
                    'state': 'missing' if not exists else ('unknown' if age is None else ('stale' if age > s['maxAgeDays'] else 'fresh'))})
    return out

def step_quality():
    cl = json.load(open(sp('clients.json'))); S = json.load(open(sp('stories.json')))['stories']
    R = json.load(open(sp('requests.json')))['requests']; K = json.load(open(sp('clusters.json')))['clusters']
    rc = load('requests/db/customers.json')
    named = [r for r in rc if r.get('basis') != 'internal']
    resolved = [r for r in named if norm(r['name']) in cl['alias']]
    story_names = C.Counter((n['name'] if isinstance(n, dict) else n) for s in load('analysis/stories.json')['stories'] for n in s.get('customers') or [])
    story_res = sum(v for n, v in story_names.items() if norm(n) in cl['alias'])
    gaps = [{'name': o['name'], 'kind': o['kind'], 'mentions': o['mentions'], 'via': o['via']} for o in cl['organisations'][:60]]
    q = {'builtAt': now_iso(), 'sources': source_status(),
         'identity': {'requestCustomers': len(named), 'requestCustomersResolved': len(resolved),
                      'storyMentions': sum(story_names.values()), 'storyMentionsResolved': story_res,
                      'outsideOrganisations': len(cl['organisations']), 'unresolved': sum(1 for o in cl['organisations'] if o['kind'] == 'unresolved'), 'topGaps': gaps},
         'products': {'stories': dict(C.Counter(s['productBasis'] for s in S)), 'storiesLowConfidence': sum(1 for s in S if s['productConfidence'] == 'Low'),
                      'requestsWithProduct': sum(1 for r in R if r['product']), 'requests': len(R)},
         'text': {'requestsThin': sum(1 for r in R if r['textQuality'] in ('thin', 'unclear')), 'storiesNoWhy': sum(1 for s in S if not s['why'])},
         'knownGaps': [
             {'id': 'incident-timing', 'text': 'Incident response and fix times (MTTA / MTTR) are not computed; the ledger quotes a hand-typed baseline.', 'phase': 'Phase 6'},
             {'id': 'flow', 'text': 'Flow rests on a 64-issue changelog sample; the full batch of about 1,200 is not run.', 'phase': 'Phase 6'},
             {'id': 'incident-clients', 'text': '8 of 39 incidents carry no client, so they are in no client view.', 'phase': 'Phase 6'},
             {'id': 'promise-driver', 'text': 'Promises without a client (Driver) cannot raise a client flag.', 'phase': 'Phase 6'},
             {'id': 'older-products', 'text': 'Stories before 2026 are placed on a product by rule, not by the SPEC v2 classification (D4).', 'phase': 'Phase 1'},
             {'id': 'estimates', 'text': '939 of 1,201 stories in the 2026 scope carry no estimate, so no effort view is offered.', 'phase': 'later'}]}
    save(sp('quality.json'), q)
    return {'requestCustomersResolved': f"{len(resolved)}/{len(named)}", 'staleSources': sum(1 for s in q['sources'] if s['state'] != 'fresh')}


# ---------------------------------------------------------------- step 8: page
def step_changes():
    """What moved since the previous build: client levels, bugs, incidents, stories shipped or started, top needs, promises.
    Compares a small fact snapshot with the last one in state/facts.json and keeps the last 12 non-empty diffs."""
    G = json.load(open(sp('signals.json'))); H = json.load(open(sp('health.json')))
    S = json.load(open(sp('stories.json')))['stories']; K = json.load(open(sp('clusters.json')))['clusters']
    dem = {d['id']: d for d in G['demand']}
    facts = {'at': now_iso(),
             'levels': {cid: p['level'] for cid, p in G['clients'].items() if p['ranked']},
             'bugs': {b['k']: b['priority'] for b in H['bugs']},
             'incidents': {i['k']: i['status'] for i in H['incidents']},
             'stages': {s['k']: s['stage'] for s in S},
             'top': sorted(k['id'] for k in K if dem.get(k['id'], {}).get('best')),
             't1open': sorted(k['id'] for k in K if k['built'] in ('none', 'related') and dem.get(k['id'], {}).get('t1')),
             'promiseFlags': {p['id']: sorted(p['flags']) for p in H['promises']}}
    fpath = os.path.join(STATE, 'facts.json'); cpath = os.path.join(STATE, 'changes.json')
    prev = json.load(open(fpath)) if os.path.exists(fpath) else None
    hist = json.load(open(cpath)) if os.path.exists(cpath) else {'baselineAt': facts['at'], 'diffs': []}
    items = []
    if prev:
        rank = {'calm': 0, 'watch': 1, 'act': 2}
        for cid, lv in facts['levels'].items():
            was = prev['levels'].get(cid)
            if was and was != lv: items.append({'t': 'level', 'id': cid, 'from': was, 'to': lv, 'up': rank[lv] > rank[was]})
        for k, pr in facts['bugs'].items():
            if k not in prev['bugs']: items.append({'t': 'bug-new', 'id': k, 'p': pr})
        for k in prev['bugs']:
            if k not in facts['bugs']: items.append({'t': 'bug-gone', 'id': k})
        for k, st in facts['incidents'].items():
            if k not in prev['incidents']: items.append({'t': 'inc-new', 'id': k})
            elif prev['incidents'][k] != st: items.append({'t': 'inc-moved', 'id': k, 'from': prev['incidents'][k], 'to': st})
        for k, st in facts['stages'].items():
            was = prev['stages'].get(k)
            if st == 'Done' and was and was != 'Done': items.append({'t': 'shipped', 'id': k})
            elif st == 'In progress' and was == 'Not started': items.append({'t': 'started', 'id': k})
            elif not was: items.append({'t': 'story-new', 'id': k})
        for k in set(facts['top']) - set(prev['top']): items.append({'t': 'top-new', 'id': k})
        for k in set(prev['top']) - set(facts['top']): items.append({'t': 'top-gone', 'id': k})
        for k in set(facts['t1open']) - set(prev['t1open']): items.append({'t': 't1-new', 'id': k})
        for k, fl in facts['promiseFlags'].items():
            new = set(fl) - set(prev['promiseFlags'].get(k, [])) - {'noEstimate'}
            if new & {'overdue', 'dueSoon', 'drift'}: items.append({'t': 'promise-risk', 'id': k, 'flags': sorted(new)})
    if items:
        hist['diffs'] = ([{'from': prev['at'], 'to': facts['at'], 'items': items[:400], 'total': len(items)}] + hist['diffs'])[:12]
    if not prev or items: save(fpath, facts)
    save(cpath, hist)
    return {'changes': len(items), 'baseline': hist['baselineAt']}


def step_page():
    sys.path.insert(0, os.path.join(T, 'tools'))
    import page
    return page.build()


STEPS = [
    ('identity', ['ledger/data/ledger.json', 'data/done-raw/client_map.json', 'requests/db/customers.json', 'analysis/stories.json', 'state:decisions'], step_identity, ['clients.json']),
    ('taxonomy', ['ledger/data/stories/pa/kb_products.json', 'ledger/data/ledger.json', 'ledger/data/stories/pa/classification.json', 'data/roadmap/tags.json'], step_taxonomy, ['products.json']),
    ('stories', ['analysis/stories.json', 'ledger/data/stories/pa/classification.json', 'data/roadmap/tags.json', 'data/roadmap/highlights.json',
                 'data/roadmap/starts.json', 'ledger/data/ledger.json', 'spine:clients.json', 'spine:products.json', 'state:decisions'], step_stories, ['stories.json']),
    ('demand', ['intel/db/items.json', 'intel/db/clusters.json', 'spine:clients.json', 'truth/config.json'], step_demand, ['requests.json', 'clusters.json']),
    ('health', ['ledger/data/ledger.json', 'ledger/live/db/pipeline', 'spine:clients.json'], step_health, ['health.json']),
    ('signals', ['spine:clients.json', 'spine:stories.json', 'spine:requests.json', 'spine:clusters.json', 'spine:health.json', 'spine:products.json',
                 'truth/config.json', 'state:decisions', 'date'], step_signals, ['signals.json']),
    ('quality', ['spine:clients.json', 'spine:stories.json', 'spine:requests.json', 'spine:clusters.json', 'requests/db/customers.json',
                 'truth/config.json', 'date'], step_quality, ['quality.json']),
    ('changes', ['spine:*', 'date'], step_changes, []),
    ('page', ['spine:*', 'state:changes', 'truth/site', 'truth/tools/page.py', 'state:decisions', 'truth/config.json'], step_page, []),
]


def fp_path(p):
    h = hashlib.sha256()
    if os.path.isdir(p):
        for f in sorted(glob.glob(os.path.join(p, '**', '*'), recursive=True)):
            if os.path.isfile(f): h.update(f.encode()); h.update(open(f, 'rb').read())
    elif os.path.exists(p): h.update(open(p, 'rb').read())
    else: h.update(b'missing')
    return h.hexdigest()

def fingerprint(inputs):
    h = hashlib.sha256()
    h.update(fp_path(os.path.abspath(__file__)).encode())   # a change to the rules re-runs every step
    for i in inputs:
        if i == 'date': h.update(TODAY.isoformat().encode())
        elif i == 'state:decisions': h.update(fp_path(os.path.join(STATE, 'decisions.json')).encode())
        elif i == 'state:changes': h.update(fp_path(os.path.join(STATE, 'changes.json')).encode())
        elif i == 'spine:*':
            for f in sorted(glob.glob(os.path.join(SPINE, '*.json'))): h.update(fp_path(f).encode())
        elif i.startswith('spine:'): h.update(fp_path(sp(i[6:])).encode())
        else: h.update(fp_path(rp(i)).encode())
    return h.hexdigest()[:16]

def manifest():
    p = os.path.join(STATE, 'manifest.json')
    return json.load(open(p)) if os.path.exists(p) else {'steps': {}}

def cmd_run(force=False):
    os.makedirs(SPINE, exist_ok=True); os.makedirs(STATE, exist_ok=True)
    m = manifest(); run = {'at': now_iso(), 'steps': []}
    for name, inputs, fn, outs in STEPS:
        f = fingerprint(inputs); prev = m['steps'].get(name, {})
        fresh = prev.get('fp') == f and all(os.path.exists(sp(o)) for o in outs) and (name != 'page' or os.path.exists(os.path.join(DIST, 'index.html')))
        if fresh and not force:
            run['steps'].append({'step': name, 'did': 'skip'}); print(f'  {name:<9} fresh, skipped'); continue
        t0 = dt.datetime.now(); res = fn(); ms = int((dt.datetime.now() - t0).total_seconds() * 1000)
        m['steps'][name] = {'fp': fingerprint(inputs) if name != 'page' else f, 'at': now_iso(), 'ms': ms, 'result': res}
        run['steps'].append({'step': name, 'did': 'built', 'ms': ms, 'result': res})
        print(f'  {name:<9} built in {ms} ms  {json.dumps(res, ensure_ascii=False)[:150]}')
    ok, results = cmd_check(quiet=True)
    run['checks'] = {'pass': sum(1 for r in results if r[0] == 'PASS'), 'fail': [r[1] for r in results if r[0] == 'FAIL'], 'warn': [r[1] for r in results if r[0] == 'WARN']}
    write_decisions_md()
    m['lastRun'] = run['at']; m['lastChecks'] = run['checks']
    save(os.path.join(STATE, 'manifest.json'), m)
    with open(os.path.join(STATE, 'runs.jsonl'), 'a') as fh: fh.write(json.dumps(run, ensure_ascii=False) + '\n')
    print(f"checks: {run['checks']['pass']} pass, {len(run['checks']['warn'])} warn, {len(run['checks']['fail'])} fail")
    for f in run['checks']['fail']: print('  FAIL', f)
    return ok


def write_decisions_md():
    """truth/DECISIONS.md: the owner's to-do list, regenerated on every run from config + state."""
    ds = decisions(); lines = ['# Decisions', '',
        'Generated by `truth.py run` from `truth/config.json` and `truth/state/decisions.json`. Do not edit by hand:',
        'answer on the hub page (System → Decisions), or run `python3 truth/tools/truth.py decide <D#> <option#> "<note>"`.',
        'Until a decision is taken, the default below is applied and the hub marks it.', '']
    open_n = sum(1 for d in CFG['decisions'] if not ds[d['id']]['decided'])
    lines += [f'**{open_n} of {len(CFG["decisions"])} open.**', '']
    for d in CFG['decisions']:
        v = ds[d['id']]
        lines += [f"## {d['id']} · {d['title']}  ({'decided ' + (v['at'] or '')[:10] + ' by ' + str(v['by']) if v['decided'] else 'OPEN'})", '',
                  d['why'], '', f"Affects: {d['affects']}.", '']
        for i, o in enumerate(d['options']):
            mark = '[x]' if i == v['choice'] else '[ ]'
            lines.append(f"- {mark} {o}{' (default)' if i == d['default'] else ''}")
        if v['note']: lines += ['', f"Note: {v['note']}"]
        lines.append('')
    with open(os.path.join(T, 'DECISIONS.md'), 'w') as f: f.write('\n'.join(lines))


def cmd_check(quiet=False):
    res = []
    def gate(ok, name, level='FAIL'): res.append(('PASS' if ok else level, name))
    try:
        cl = json.load(open(sp('clients.json'))); S = json.load(open(sp('stories.json')))['stories']
        R = json.load(open(sp('requests.json')))['requests']; K = json.load(open(sp('clusters.json')))['clusters']
        H = json.load(open(sp('health.json'))); G = json.load(open(sp('signals.json')))
    except FileNotFoundError as e:
        print('spine not built:', e); return False, [('FAIL', 'spine exists')]
    ids = [c['id'] for c in cl['clients']]
    gate(len(ids) == len(set(ids)), 'one record per client id')
    known = set(ids) | {o['id'] for o in cl['organisations']}
    gate(len(S) == len({s['k'] for s in S}), 'one record per story key')
    gate(len(S) == load('analysis/stories.json')['_meta']['count'], f'stories reconcile with analysis ({len(S)})')
    gate(len(R) == len(load('intel/db/items.json')), f'requests reconcile with intel ({len(R)})')
    gate(len(K) == len(load('intel/db/clusters.json')), f'clusters reconcile with intel ({len(K)})')
    gate(len(H['bugs']) == len(load('ledger/data/ledger.json')['bugs']), f"bugs reconcile with ledger ({len(H['bugs'])})")
    gate(all(c in known for s in S for c in s['clients']), 'every story client resolves')
    gate(all(c in known for r in R for c in r['clients']), 'every request client resolves')
    rid = {r['id'] for r in R}
    gate(all(m['id'] in rid for k in K for m in k['members']), 'every cluster member is a request')
    gate(all(r['cluster'] in {k['id'] for k in K} for r in R if r['cluster']), 'every request cluster exists')
    prods = {p['id'] for p in json.load(open(sp('products.json')))['products']}
    gate(all(s['product'] in prods for s in S), 'every story lands on one catalogue product')
    gate(all((r['product'] in prods) for r in R if r['product']), 'every request product is in the catalogue')
    gate(all(k['product'] in prods for k in K if k['product']), 'every cluster product is in the catalogue')
    gate(set(G['ranking']) <= set(ids), 'ranking names only clients')
    secret = re.compile(r'(password\s*[:=]|api[_-]?key\s*[:=]|secret\s*[:=]|bearer\s+[a-z0-9._-]{20,}|AKIA[0-9A-Z]{16})', re.I)
    hits = [f for f in glob.glob(os.path.join(SPINE, '*.json')) + glob.glob(os.path.join(DIST, '*.html')) if secret.search(open(f).read())]
    gate(not hits, 'no credential patterns in spine or page' + (': ' + ', '.join(os.path.basename(h) for h in hits) if hits else ''))
    stale = [s['id'] for s in source_status() if s['state'] != 'fresh']
    gate(not stale, 'sources within their freshness limit' + (': stale ' + ', '.join(stale) if stale else ''), 'WARN')
    open_d = [d for d, v in decisions().items() if not v['decided']]
    gate(not open_d, 'owner decisions taken' + (': open ' + ', '.join(open_d) if open_d else ''), 'WARN')
    if not quiet:
        for r in res: print(f'{r[0]:<5} {r[1]}')
    return not any(r[0] == 'FAIL' for r in res), res


def cmd_status():
    m = manifest()
    print('Sources')
    for s in source_status():
        print(f"  {s['state']:<8} {s['name']:<34} as of {s['asOfDate'] or '?':<10} (limit {s['maxAgeDays']} d)")
        if s['state'] != 'fresh': print(f"           refresh: {s['refresh']}")
    print('Steps')
    for name, inputs, fn, outs in STEPS:
        prev = m['steps'].get(name)
        state = 'never built' if not prev else ('fresh' if prev['fp'] == fingerprint(inputs) else 'STALE')
        print(f"  {name:<9} {state:<11} {prev['at'] if prev else ''}")
    print('Decisions')
    for d in CFG['decisions']:
        v = decisions()[d['id']]
        print(f"  {d['id']} {'decided' if v['decided'] else 'OPEN   '} {d['title']}  → {d['options'][v['choice']]}")
    if m.get('lastChecks'): print('Last checks:', m['lastChecks'])


def cmd_explain(q):
    cl = json.load(open(sp('clients.json')))
    cid = cl['alias'].get(norm(q))
    if cid:
        c = next(c for c in cl['clients'] if c['id'] == cid); g = json.load(open(sp('signals.json')))['clients'][cid]
        print(json.dumps({'client': c, 'signal': g}, indent=1, ensure_ascii=False)[:6000]); return
    for f, key in (('stories.json', 'stories'), ('requests.json', 'requests'), ('clusters.json', 'clusters')):
        for r in json.load(open(sp(f)))[key]:
            if r.get('k') == q or r.get('id') == q:
                print(json.dumps(r, indent=1, ensure_ascii=False)); return
    print('not found:', q)


def record_decision(did, ch, note='', by='owner (local)'):
    path = os.path.join(STATE, 'decisions.json')
    have = json.load(open(path)) if os.path.exists(path) else {}
    d = next(x for x in CFG['decisions'] if x['id'] == did)
    assert 0 <= ch < len(d['options']), 'option out of range'
    r = have.get(did, {'h': []}); at = now_iso()
    r['h'] = (r.get('h') or []) + [{'at': at, 'by': by, 'from': r.get('choice', d['default']), 'to': ch, 'note': note}]
    r.update({'choice': ch, 'decided': True, 'note': note, 'by': by, 'at': at}); have[did] = r
    save(path, have)


def main():
    a = sys.argv[1:] or ['status']
    if a[0] == 'run': sys.exit(0 if cmd_run('--force' in a) else 1)
    if a[0] == 'check': ok, _ = cmd_check(); sys.exit(0 if ok else 1)
    if a[0] == 'status': return cmd_status()
    if a[0] == 'explain': return cmd_explain(' '.join(a[1:]))
    if a[0] == 'decisions':
        for d in CFG['decisions']:
            v = decisions()[d['id']]
            print(f"{d['id']} [{'decided' if v['decided'] else 'open'}] {d['title']}\n   {d['why']}")
            for i, o in enumerate(d['options']): print(f"   {'→' if i == v['choice'] else ' '} {i}. {o}")
        return
    if a[0] == 'decide':
        record_decision(a[1], int(a[2]), ' '.join(a[3:])); print('recorded', a[1], '→', a[2]); return
    if a[0] == 'import-decisions':
        rows = json.load(open(a[1])); rows = rows.get('docs', rows) if isinstance(rows, dict) else rows
        n = 0
        for r in rows:
            data = r.get('data', r); did = (r.get('id') or data.get('id') or '').split('/')[-1]
            if did in {d['id'] for d in CFG['decisions']} and isinstance(data.get('choice'), int):
                record_decision(did, data['choice'], data.get('note', ''), 'page:' + str(data.get('by', '?'))); n += 1
        print('imported', n, 'decisions'); return
    print(__doc__)


if __name__ == '__main__':
    main()
