"""Build the Product Truth hub page from truth/spine/ into truth/dist/index.html (data inline, fonts beside it)."""
import datetime as dt, glob, json, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.dirname(HERE); ROOT = os.path.dirname(T)
SPINE, STATE, DIST, SITE = (os.path.join(T, d) for d in ('spine', 'state', 'dist', 'site'))
LEDGER_URL = 'https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G'


def j(name): return json.load(open(os.path.join(SPINE, name)))
def cut(s, n):
    s = re.sub(r'\s+', ' ', str(s or '')).strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


def renewal_date(s):
    try: return dt.datetime.strptime(str(s), '%b %d, %Y').date().isoformat()
    except Exception: return None


def data():
    sys_path = os.path.join(HERE); import sys; sys.path.insert(0, sys_path)
    import truth as TR
    cl = j('clients.json'); P = j('products.json'); S = j('stories.json')['stories']
    R = j('requests.json')['requests']; K = j('clusters.json')['clusters']; H = j('health.json')
    G = j('signals.json'); Q = j('quality.json')
    man = TR.manifest()
    runs = []
    rp = os.path.join(STATE, 'runs.jsonl')
    if os.path.exists(rp):
        for line in open(rp).read().splitlines()[-8:]:
            try:
                r = json.loads(line); runs.append({'at': r['at'], 'built': [s['step'] for s in r['steps'] if s['did'] == 'built'], 'checks': r.get('checks')})
            except Exception: pass
    prods = [p['id'] for p in P['products']]
    pix = {p: i for i, p in enumerate(prods)}
    stage = {'Done': 'D', 'In progress': 'P', 'Not started': 'N'}
    drv = {'Increase revenue': 'R', 'Protect churn': 'C', 'Reduce cost': 'X', 'Avoid cost': 'A'}
    today = dt.date.fromisoformat(G['today'])
    stories = [{'k': s['k'], 'sa': s.get('start'), 's': cut(s['summary'], 160), 'g': stage.get(s['stage'], 'N'), 'st': s['status'], 'd': s['done'], 'y': s['year'], 'q': s['q'],
                'cr': s['created'], 'p': pix.get(s['product']), 'pb': s['productBasis'][0], 'th': s['theme'], 'cf': 1 if s['customerFacing'] else 0,
                'c': s['clients'], 'v': drv.get(s['driver'], ''), 'vw': cut(s['driverWhy'], 220), 'tm': s['team'], 'ep': cut(s['epic'], 80),
                'w': cut(s['what'], 320), 'wy': cut(s['why'], 260), 'o': cut(s['outcome'], 240), 'f': s['feature'], 'l': 1 if s['onLedger'] else 0}
               for s in S]
    reqs = [{'id': r['id'], 'src': {'jira_fr': 'FR', 'jira_story_open': 'OS', 'fis': 'FIS'}[r['source']], 't': cut(r['title'], 160), 'st': r['status'],
             'cr': r['created'], 'p': pix.get(r['product']), 'kd': r['kind'], 'c': r['clients'], 'cl': r['cluster'], 'l': r['link'],
             'w': cut(r['what'], 300), 'wy': cut(r['why'], 260), 'o': cut(r['outcome'], 220), 'tq': r['textQuality'], 'tm': r['team']} for r in R]
    dem = {d['id']: d for d in G['demand']}
    order = {d['id']: i for i, d in enumerate(G['demand'])}
    clusters = []
    for k in sorted(K, key=lambda k: order.get(k['id'], 1e9)):
        d = dem.get(k['id'], {})
        clusters.append({'id': k['id'], 'n': k['name'], 'p': pix.get(k['product']), 'w': cut(k['what'], 360), 'wy': cut(k['why'], 420), 'o': cut(k['outcome'], 300),
                         'm': [[m['id'], (m['role'] or '')[:1]] for m in k['members']], 'c': k['clients'], 'lc': k['ledgerClients'],
                         'ts': k['tierSignal'] or 0, 'tt': k['topTier'], 'b': k['built'], 'bn': cut(k['builtNote'], 200), 'old': k['oldest'],
                         'a': k['asks'], 'dup': k['duplicates'], 't1': d.get('t1', 0), 'best': 1 if d.get('best') else 0, 'bf': d.get('bestFor', []),
                         'pain': d.get('bugsSameProduct', 0), 'io': 1 if k.get('internalOnly') else 0})
    events = [e for e in H['events'] if e['client'] and e['start'] and e['status'] != 'Cancelled'
              and (dt.date.fromisoformat(e['start'][:10]) - today).days >= -120]
    clients = []
    for c in cl['clients']:
        g = G['clients'][c['id']]
        clients.append({'id': c['id'], 'n': c['name'], 'sh': c['short'], 'k': c['kind'], 't': c['tier'], 'ow': c['owner'], 'h': c['health'],
                        'rn': c['renewal'], 'rnd': renewal_date(c['renewal']), 'se': c.get('sentiment'), 'since': c['customerSince'], 'lt': c['lastTouch'], 'hb': c['healthBreakdown'], 'bh': c['bugHistory'],
                        'g': {k: g[k] for k in ('level', 'attention', 'flags', 'delivered', 'deliveredByYear', 'inProgress', 'lastDelivered', 'openAsks',
                                                'openClusters', 'asksBuilt', 'oldestAsk', 'severeBugs', 'openBugs', 'recentIncidents', 'promises',
                                                'promisesAtRisk', 'nextShow', 'showsNext90')}})
    ch = os.path.join(STATE, 'changes.json')
    changes = json.load(open(ch)) if os.path.exists(ch) else {'baselineAt': None, 'diffs': []}
    decisions = TR.decisions()
    D = {
        'meta': {'builtAt': TR.now_iso(), 'today': G['today'], 'ledgerUrl': LEDGER_URL, 'thresholds': G['thresholds'], 'rules': G['rule'],
                 'tierWeights': TR.CFG['tierWeights'], 'live': TR.CFG['live'], 'snapshot': {'ledger': H['asOf'], 'events': H['eventsAsOf']},
                 'steps': [{'step': n, **{k: v for k, v in (man['steps'].get(n) or {}).items() if k in ('at', 'ms', 'result')}} for n, *_ in TR.STEPS],
                 'lastChecks': man.get('lastChecks'), 'runs': runs,
                 'decisions': [{**d, 'state': decisions[d['id']]} for d in TR.CFG['decisions']]},
        'changes': changes, 'quality': Q, 'products': prods,
        'productInfo': [{'id': p['id'], 'dom': p['domain'], 'nf': p['features'], 'fl': p['featureList'][:14], 'th': p['themes'][:4]} for p in P['products']],
        'domains': P['domains'], 'themes': [{'id': t['id'], 'n': t['name'], 'mp': t['mainProduct'], 'ms': t['mainShare'], 'ev': t['evidence']} for t in P['themes']],
        'productRoll': G['products'], 'ranking': G['ranking'], 'clients': clients,
        'orgs': [{'id': o['id'], 'n': o['name'], 'k': o['kind'], 'm': o['mentions']} for o in cl['organisations']],
        'alias': cl['alias'], 'stories': stories, 'requests': reqs, 'clusters': clusters,
        'bugs': [{'k': b['k'], 's': cut(b['summary'], 150), 'st': b['status'], 'pr': b['priority'], 'cr': b['created'], 'p': pix.get(b['product']),
                  'c': b['clients'], 'ev': b['event'], 'tm': b['team']} for b in H['bugs']],
        'incidents': [{'k': i['k'], 's': cut(i['summary'], 150), 'st': i['status'], 'pr': i['priority'], 'cr': i['created'], 'c': i['clients'], 'ev': i['event']} for i in H['incidents']],
        'events': [{'k': e['k'], 'n': e['name'], 's': e['start'], 'e': e['end'], 'st': e['status'], 'c': e['client'], 'kd': e['kind']} for e in events],
        'promises': [{'id': p['id'], 'k': p['key'], 'f': cut(p['feature'], 140), 'mo': p['month'], 'st': p['status'], 'js': p['jiraStatus'], 'due': p['due'],
                      'tm': p['team'], 'c': p['client'], 'fl': p['flags'], 'im': cut(p['impact'], 140)} for p in H['promises']],
    }
    return D


def build():
    D = data()
    shell = open(os.path.join(SITE, 'shell.html')).read()
    css = open(os.path.join(SITE, 'style.css')).read()
    js = open(os.path.join(SITE, 'app.js')).read()
    payload = json.dumps(D, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = (shell.replace('/*CSS*/', css).replace('/*DATA*/', payload).replace('/*APP*/', js))
    os.makedirs(os.path.join(DIST, 'fonts'), exist_ok=True)
    for f in glob.glob(os.path.join(ROOT, 'live', 'fonts', '*.ttf')):
        shutil.copy(f, os.path.join(DIST, 'fonts', os.path.basename(f)))
    out = os.path.join(DIST, 'index.html')
    with open(out, 'w') as fh: fh.write(html)
    # local QA copy: the publish wrapper's charset and viewport, plus a hook that opens a panel from the hash (#qa=client:81808)
    qa = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html +
          '<script>(function(){var m=location.hash.match(/^#qa=(.+)$/);if(m){setTimeout(function(){openItem(decodeURIComponent(m[1]),false)},50)}})()</script></body></html>')
    with open(os.path.join(DIST, 'qa.html'), 'w') as fh: fh.write(qa)
    return {'page': 'truth/dist/index.html', 'bytes': len(html.encode()), 'stories': len(D['stories']), 'clusters': len(D['clusters'])}
