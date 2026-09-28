#!/usr/bin/env python3
"""Product intelligence layer over the requests DB (requests/db/items.json). Spec: intel/SPEC.md.

  kb         extract the KB's mapped (built) stories -> intel/kb/built_stories.json
  prep       chunks for the enrichment agents -> intel/work/chunks/cNN.json (with built-story and
             similar-request candidates per item)
  merge      intel/work/out/cNN.json + prior analysis -> intel/db/items.json
  cprep      per-product inputs for the clustering agents -> intel/work/clusters_in/<slug>.json
  build      items + intel/work/clusters_out/*.json -> intel/db/clusters.json, graph.json, summary.json
  check      every gate must PASS
"""
import glob, json, math, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTEL = os.path.join(ROOT, 'intel')
WORK = os.path.join(INTEL, 'work')
# the synced skill folder name changes between syncs: find it
SKILL = next(iter(sorted(glob.glob(os.path.expanduser(
    '~/.claude/skills/synced/*/product-intelligence-graph-architect')), key=os.path.getmtime, reverse=True)), '')
MASTER = os.path.join(SKILL, 'references', 'knowledge', 'master-extraction.md')
CHUNK = 48
PRODUCTS = json.load(open(os.path.join(ROOT, 'ledger', 'data', 'stories', 'pa', 'kb_products.json')))['products']
DOMAIN = {p: v['domain'] for p, v in PRODUCTS.items()}
DOMAIN['Unassigned / Cross-cutting'] = 'Cross-cutting'
# products in the hierarchy (pa SPEC v2, MASTER Ecosystem Map §3-4) that have no feature lines in kb_products.json
for _p, _d in (('Profile', 'Identity & Community'), ('Community', 'Identity & Community')):
    DOMAIN.setdefault(_p, _d)


def load(p):
    with open(p) as f:
        return json.load(f)


def dump(p, o, indent=1):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(o, f, indent=indent, ensure_ascii=False)
        f.write('\n')


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


# ---------- KB built stories ----------

def product_at(line_no):
    for p, v in PRODUCTS.items():
        a, b = v['lines']
        if a <= line_no <= b:
            return p
    return None


def kb():
    out, seen = [], set()
    for n, line in enumerate(open(MASTER), 1):
        m = re.match(r'^\|\s*(EP-\d+)\s*\|(.*)\|\s*$', line)
        if not m:
            continue
        cells = [c.strip() for c in re.split(r'(?<!\\)\|', m.group(2))]
        key = m.group(1)
        prod = product_at(n)
        if (key, prod) in seen:
            continue
        seen.add((key, prod))
        out.append({'k': key, 'title': cells[0] if cells else '', 'intent': cells[1] if len(cells) > 1 else '',
                    'outcome': cells[2] if len(cells) > 2 else '', 'feature': cells[3] if len(cells) > 3 else '',
                    'status': cells[4] if len(cells) > 4 else '', 'product': prod, 'line': n,
                    'ref': f'[MASTER {prod or "cross-product"} §5 User Stories Mapping :{n}]'})
    dump(os.path.join(INTEL, 'kb', 'built_stories.json'), out)
    print(len(out), 'built-story rows;', len({x['k'] for x in out}), 'unique keys')


# ---------- similarity (tf-idf, no dependencies) ----------

STOP = set('''a an the and or of to for in on at by with from as is are be been this that these those it its into via per
not no can should would will we our you your they their them user users event events platform expoplatform ep
new add allow able need needs want wants option options ability feature request requests story please also when
which who what why how so than then there here more most all any each other only just like use using used be etc'''.split())


def toks(s):
    s = re.sub(r'<[^>]+>|https?://\S+|!\[[^\]]*\]\([^)]*\)', ' ', s or '').lower()
    return [w for w in re.findall(r'[a-z][a-z0-9]{2,}', s) if w not in STOP]


class TfIdf:
    def __init__(self, docs):
        self.df = Counter()
        for d in docs:
            self.df.update(set(d))
        self.n = len(docs)
        self.vecs = [self.vec(d) for d in docs]

    def vec(self, d):
        tf = Counter(d)
        v = {w: (1 + math.log(c)) * math.log((self.n + 1) / (self.df.get(w, 0) + 1)) for w, c in tf.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1
        return {w: x / norm for w, x in v.items()}

    @staticmethod
    def cos(a, b):
        if len(a) > len(b):
            a, b = b, a
        return sum(x * b.get(w, 0) for w, x in a.items())


def item_text(r, long=True):
    rq = r.get('request') or {}
    parts = [r['title'], r['title'], rq.get('whoFor'), rq.get('value'), rq.get('differsFromToday'), rq.get('userStory')]
    if long:
        parts += [(r.get('description') or '')[:1500], (r.get('problemStatement') or '')[:1500]]
    return ' '.join(p for p in parts if p)


def clean(s, n):
    s = re.sub(r'<custom[^>]*>|</custom>', '', s or '')
    s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s).strip()
    return s if len(s) <= n else s[:n] + ' …[cut]'


def in_scope():
    R = load(os.path.join(ROOT, 'requests', 'db', 'items.json'))
    return [r for r in R if not (r['source'] == 'fis' and r['excluded'])]


def prior_ids():
    cls = {x['k']: x for x in load(os.path.join(ROOT, 'ledger', 'data', 'stories', 'pa', 'classification.json'))['stories']}
    return cls


def prep():
    items = in_scope()
    built = load(os.path.join(INTEL, 'kb', 'built_stories.json'))
    cls = prior_ids()
    docs = [toks(item_text(r)) for r in items] + [toks(' '.join([b['title'], b['intent'], b['outcome'], b['feature']]))
                                                  for b in built]
    tf = TfIdf(docs)
    iv, bv = tf.vecs[:len(items)], tf.vecs[len(items):]
    todo = []
    for i, r in enumerate(items):
        prior = r['source'] == 'jira_story_open' and r['key'] in cls and (r.get('priorAnalysis') or {}).get('what')
        if prior:
            continue
        cb = sorted(((tf.cos(iv[i], bv[j]), j) for j in range(len(built))), reverse=True)[:5]
        cs = sorted(((tf.cos(iv[i], iv[j]), j) for j in range(len(items)) if j != i), reverse=True)[:5]
        rq = r.get('request') or {}
        todo.append({
            'id': r['id'], 'source': r['source'], 'key': r.get('key'), 'title': r['title'], 'status': r.get('status'),
            'components': r.get('components') or [], 'jiraProductArea': (r.get('jiraProductArea') or {}).get('path'),
            'fisProductArea': r.get('fisProductArea'), 'epic': (r.get('epic') or {}).get('summary'),
            'team': r.get('team'), 'labels': r.get('labels') or [],
            'customersFromFields': sorted({c['client'] or c['token'] for c in r.get('customers') or []
                                           if c['source'] != 'Pipedrive Company ID' or c['client']}),
            'request': {k: clean(v, 700) for k, v in rq.items() if v},
            'text': clean(r.get('description') or r.get('problemStatement') or '', 2200),
            'evidencePack': clean(r.get('evidencePack'), 700) if r['source'] == 'fis' else None,
            'eventsImpacted': r.get('eventsImpacted'),
            'comments': [clean(c['body'], 300) for c in (r.get('comments') or [])[-4:]],
            'builtCandidates': [{'k': built[j]['k'], 'product': built[j]['product'], 'title': built[j]['title'][:140],
                                 'ref': built[j]['ref'], 'sim': round(s, 2)} for s, j in cb if s > 0.12],
            'similarRequests': [{'id': items[j]['id'], 'title': items[j]['title'][:120], 'sim': round(s, 2)}
                                for s, j in cs if s > 0.25],
        })
    d = os.path.join(WORK, 'chunks')
    for p in glob.glob(os.path.join(d, '*.json')):
        os.remove(p)
    for n in range(0, len(todo), CHUNK):
        dump(os.path.join(d, 'c%02d.json' % (n // CHUNK)), todo[n:n + CHUNK])
    print(len(todo), 'items to enrich in', math.ceil(len(todo) / CHUNK), 'chunks;',
          len(items) - len(todo), 'reuse prior analysis')


# ---------- merge ----------

FIELDS = ('product', 'domain', 'basis', 'evidence', 'kbRef', 'confidence', 'what', 'why', 'outcome', 'needKey',
          'requestKind', 'entities', 'customersNamedInText', 'builtOverlap', 'textQuality')


def client_map():
    m = load(os.path.join(ROOT, 'data', 'done-raw', 'client_map.json'))
    m.pop('_about', None)
    comps = {c['name']: c for c in load(os.path.join(ROOT, 'ledger', 'data', 'ledger.json'))['companies']}
    for name, c in comps.items():
        m.setdefault(name, {'client': name, 'basis': 'exact'})
        for t in c.get('deliveryTags') or []:
            m.setdefault(t, {'client': name, 'basis': 'exact'})
    low = {k.lower(): v for k, v in m.items()}
    return m, low, comps


# one customer, one name: spellings that differ only in case or punctuation merge; a variant that is a ledger
# client gives the group its name and tier. Aliases and exclusions below were confirmed by QA on 27 Sep 2026.
ALIAS = {'tampere': 'Tampereen Messut (Tampere Trade Fairs)', 'tamperemessut': 'Tampereen Messut (Tampere Trade Fairs)',
         'tampereenmessut': 'Tampereen Messut (Tampere Trade Fairs)', 'vinexposiumconnect': 'Vinexposium',
         'omanconnect': 'CONNECT Oman', 'connectoman': 'CONNECT Oman'}
NOT_CUSTOMERS = {'adamparry', 'adssecuritypolicy', 'google', 'aws'}   # a person, a policy, vendors


def ckey(n):
    return re.sub(r'[^a-z0-9]', '', n.lower())


CANON = {}
OUT = {}


def canon_customers(cust, comps):
    out = {}
    for n, x in cust.items():
        k = ckey(n)
        if k in NOT_CUSTOMERS:
            continue
        name = ALIAS.get(k) or CANON.get(k) or n
        if name in comps:
            x['client'], x['tier'] = name, comps[name]['tier']
        e = out.get(name)
        if e:
            e['via'] |= set(x['via'])
            e['client'] = e['client'] or x['client']
            e['tier'] = e['tier'] or x['tier']
        else:
            out[name] = {**x, 'name': name, 'via': set(x['via'])}
    return out


def build_canon(items, comps):
    """Pick one display name per spelling group: the ledger client if any variant is one, else the most used."""
    seen = defaultdict(Counter)
    m, low, _ = client_map()
    for r in items:
        for c in r.get('customers') or []:
            if c['token'] == 'INTERNAL':
                continue
            n = c['client'] or (c['token'] if c['source'] != 'Pipedrive Company ID' else None)
            if n:
                seen[ckey(n)][n] += 1
    for e in OUT.values():                                # names found in text count towards the spelling too
        for n in e.get('customersNamedInText') or []:
            seen[ckey(n)][n] += 1
    for k, cnt in seen.items():
        led = [n for n in cnt if n in comps]
        CANON[k] = led[0] if led else cnt.most_common(1)[0][0]
    for k, v in ALIAS.items():
        CANON[k] = v


def merge():
    items = {r['id']: r for r in in_scope()}
    cls = prior_ids()
    out = {}
    for p in sorted(glob.glob(os.path.join(WORK, 'out', 'c*.json'))):
        for e in load(p):
            out[e['id']] = e
    m, low, comps = client_map()
    OUT.update(out)
    build_canon(items.values(), comps)
    recs, missing = [], []
    for iid, r in items.items():
        e = out.get(iid)
        pa = r.get('priorAnalysis') or {}
        if not e and r['source'] == 'jira_story_open' and r['key'] in cls and pa.get('what'):
            c = cls[r['key']]
            e = {'product': c['product'], 'domain': c.get('domain') or DOMAIN.get(c['product']), 'basis': c['basis'],
                 'evidence': c['evidence'], 'kbRef': c.get('kbRef'), 'confidence': c['confidence'],
                 'what': pa['what'], 'why': pa['why'], 'outcome': pa['outcome'], 'needKey': None,
                 'requestKind': None, 'entities': [], 'customersNamedInText': [], 'builtOverlap': [],
                 'textQuality': None, 'enrichedBy': 'prior: data/stories/pa/classification.json + analysis/stories.json'}
        if not e:
            missing.append(iid)
            continue
        e['domain'] = DOMAIN.get(e.get('product'), e.get('domain'))
        # customers: structured fields + names found in text, resolved to ledger
        cust = {}
        for c in r.get('customers') or []:
            if c['token'] == 'INTERNAL':
                continue
            n = c['client'] or (c['token'] if c['source'] != 'Pipedrive Company ID' else None)
            if n:
                cust.setdefault(n, {'name': n, 'client': c['client'], 'tier': c.get('tier'), 'via': set()})['via'].add(c['source'])
        for t in e.get('customersNamedInText') or []:
            hit = m.get(t) or low.get(t.lower())
            cl = hit.get('client') if hit else None
            n = cl or t
            x = cust.setdefault(n, {'name': n, 'client': cl, 'tier': comps[cl]['tier'] if cl in comps else None, 'via': set()})
            x['via'].add('text')
        cust = canon_customers(cust, comps)
        for x in cust.values():
            x['via'] = sorted(x['via'])
            x['tier'] = int(x['tier']) if x.get('tier') else None
        tiers = [x['tier'] for x in cust.values() if x['tier']]
        recs.append({
            'id': iid, 'source': r['source'], 'key': r.get('key'), 'link': r.get('link'), 'title': r['title'],
            'status': r.get('status'), 'created': r.get('created'), 'team': r.get('team'),
            'components': r.get('components') or [],
            'internal': any(c['token'] == 'INTERNAL' for c in r.get('customers') or []),
            'customers': sorted(cust.values(), key=lambda x: (x['tier'] or 9, x['name'])),
            'topTier': min(tiers) if tiers else None,
            'fisScore': (r.get('scores') or {}).get('totalOpportunity') if r['source'] == 'fis' else None,
            'fisClass': r.get('recommendedClassification') if r['source'] == 'fis' else None,
            'votes': r.get('votes') or 0, 'commentCount': r.get('commentCount') or 0,
            **{k: e.get(k) for k in FIELDS},
            'enrichedBy': e.get('enrichedBy') or 'agent: intel/work/out',
        })
    dump(os.path.join(INTEL, 'db', 'items.json'), recs)
    print(len(recs), 'merged;', len(missing), 'missing', missing[:10])


# ---------- clustering input ----------

def cprep():
    recs = load(os.path.join(INTEL, 'db', 'items.json'))
    by = defaultdict(list)
    for r in recs:
        by[r['product'] or 'Unassigned / Cross-cutting'].append(r)
    d = os.path.join(WORK, 'clusters_in')
    for p in glob.glob(os.path.join(d, '*.json')):
        os.remove(p)
    for prod, rs in sorted(by.items(), key=lambda x: -len(x[1])):
        tf = TfIdf([toks(' '.join(filter(None, [r['title'], r['what'], r.get('needKey')]))) for r in rs])
        rows = []
        for i, r in enumerate(rs):
            near = sorted(((tf.cos(tf.vecs[i], tf.vecs[j]), j) for j in range(len(rs)) if j != i), reverse=True)[:4]
            rows.append({'id': r['id'], 'source': r['source'], 'status': r['status'], 'title': r['title'],
                         'what': r['what'], 'why': r['why'], 'needKey': r.get('needKey'),
                         'customers': [f"{c['name']} (T{c['tier']})" if c['tier'] else c['name'] for c in r['customers']],
                         'topTier': r['topTier'], 'builtOverlap': [b.get('k') for b in r.get('builtOverlap') or []
                                                                    if b.get('verdict') in ('Already built', 'Partially built')],
                         'near': [rs[j]['id'] for s, j in near if s > 0.3]})
        dump(os.path.join(d, slug(prod) + '.json'), {'product': prod, 'domain': DOMAIN.get(prod), 'items': rows})
        print(f'{len(rs):4d}  {prod}')


# ---------- build ----------

TIER_W = {1: 8, 2: 4, 3: 2, 4: 1}


def build():
    recs = load(os.path.join(INTEL, 'db', 'items.json'))
    by_id = {r['id']: r for r in recs}
    clusters = []
    for p in sorted(glob.glob(os.path.join(WORK, 'clusters_out', '*.json'))):
        d = load(p)
        for c in d['clusters']:
            c['product'] = d['product']
            c['domain'] = DOMAIN.get(d['product'])
            clusters.append(c)
    member_of = {}
    for c in clusters:
        c['id'] = 'CL-' + slug(c['product'])[:12] + '-' + slug(c['name'])[:32]
        ms = [m for m in c['members'] if m['id'] in by_id]
        c['members'] = ms
        cust = {}
        for m in ms:
            r = by_id[m['id']]
            member_of[m['id']] = c['id']
            for x in r['customers']:
                e = cust.setdefault(x['name'], {'name': x['name'], 'client': x['client'], 'tier': x['tier'], 'items': 0})
                e['items'] += 1
        c['customers'] = sorted(cust.values(), key=lambda x: (x['tier'] or 9, -x['items'], x['name']))
        tiers = [x['tier'] for x in cust.values() if x['tier']]
        c['topTier'] = min(tiers) if tiers else None
        c['tierCounts'] = {f'T{t}': sum(1 for x in cust.values() if x['tier'] == t) for t in (1, 2, 3, 4)}
        c['t1Customers'] = [x['name'] for x in cust.values() if x['tier'] == 1]
        c['itemCount'] = len(ms)
        c['uniqueAsks'] = sum(1 for m in ms if m['role'] in ('canonical', 'distinct', 'related'))
        c['duplicates'] = sum(1 for m in ms if m['role'] == 'duplicate')
        c['sources'] = dict(Counter(by_id[m['id']]['source'] for m in ms))
        c['internalOnly'] = bool(ms) and not cust and all(by_id[m['id']]['internal'] for m in ms)
        c['fisBest'] = max([by_id[m['id']]['fisScore'] for m in ms if by_id[m['id']]['fisScore'] is not None], default=None)
        # tier signal: descriptive weight only, not the prioritisation score (criteria come later)
        c['tierSignal'] = sum(TIER_W.get(x['tier'], 0) for x in cust.values())
        c['score'] = None
    unclustered = [r['id'] for r in recs if r['id'] not in member_of]
    for r in recs:
        r['clusterId'] = member_of.get(r['id'])
    clusters.sort(key=lambda c: (-(c['tierSignal']), -c['itemCount']))
    dump(os.path.join(INTEL, 'db', 'clusters.json'), clusters)
    dump(os.path.join(INTEL, 'db', 'items.json'), recs)
    graph(clusters, recs)
    s = {
        'items': len(recs), 'clusters': len(clusters), 'unclustered': len(unclustered),
        'duplicates': sum(c['duplicates'] for c in clusters),
        'clustersWithT1': sum(1 for c in clusters if c['topTier'] == 1),
        'byProduct': Counter(r['product'] for r in recs).most_common(),
        'byDomain': Counter(r['domain'] for r in recs).most_common(),
        'topT1Clusters': [(c['product'], c['name'], c['itemCount'], c['t1Customers']) for c in clusters if c['topTier'] == 1][:25],
    }
    dump(os.path.join(INTEL, 'db', 'summary.json'), s)
    print(json.dumps({k: v for k, v in s.items() if k in ('items', 'clusters', 'unclustered', 'duplicates', 'clustersWithT1')}))


def graph(clusters, recs):
    """domain -> product -> cluster -> customer (tiered). Weights are item counts."""
    nodes, links = {}, []

    def node(i, **kw):
        nodes.setdefault(i, {'id': i, **kw})
    for c in clusters:
        node('D:' + c['domain'], type='domain', name=c['domain'])
        node('P:' + c['product'], type='product', name=c['product'], domain=c['domain'])
        node(c['id'], type='cluster', name=c['name'], product=c['product'], items=c['itemCount'], topTier=c['topTier'],
             tierSignal=c['tierSignal'], t1=len(c['t1Customers']))
        for x in c['customers']:
            if not x['client']:
                continue
            node('C:' + x['name'], type='customer', name=x['name'], tier=x['tier'])
            links.append({'s': c['id'], 't': 'C:' + x['name'], 'w': x['items']})
        links.append({'s': 'P:' + c['product'], 't': c['id'], 'w': c['itemCount']})
    for p in {n['name']: n for n in nodes.values() if n['type'] == 'product'}.values():
        links.append({'s': 'D:' + p['domain'], 't': p['id'], 'w': 1})
    dump(os.path.join(INTEL, 'db', 'graph.json'), {'nodes': list(nodes.values()), 'links': links})


# ---------- check ----------

def check():
    recs = load(os.path.join(INTEL, 'db', 'items.json'))
    scope = in_scope()
    gates = []

    def gate(n, ok, d=''):
        gates.append((n, ok, d))
    gate('every in-scope request enriched', len(recs) == len(scope), f'{len(recs)} of {len(scope)}')
    badp = [r['id'] for r in recs if r['product'] not in DOMAIN]
    gate('product is a KB catalogue product', not badp, badp[:10])
    nw = [r['id'] for r in recs if not (r.get('what') and r.get('why') and r.get('outcome'))]
    gate('what / why / outcome present', not nw, nw[:10])
    nb = [r['id'] for r in recs if r['basis'] in ('component', 'epic', 'summary') and not r.get('evidence')]
    gate('assignment evidence present', not nb, nb[:10])
    bo = [r['id'] for r in recs for b in r.get('builtOverlap') or [] if b.get('verdict') in ('Already built', 'Partially built') and not b.get('ref')]
    gate('built-overlap verdicts cite the KB', not bo, bo[:10])
    cl = os.path.exists(os.path.join(INTEL, 'db', 'clusters.json'))
    if cl:
        cs = load(os.path.join(INTEL, 'db', 'clusters.json'))
        un = [r['id'] for r in recs if not r.get('clusterId')]
        gate('every item sits in exactly one cluster', not un, f'{len(un)} unclustered: {un[:8]}')
        dup = Counter(m['id'] for c in cs for m in c['members'])
        gate('no item in two clusters', not [k for k, v in dup.items() if v > 1])
        nc = [c['id'] for c in cs if not any(m['role'] == 'canonical' for m in c['members'])]
        gate('every cluster has a canonical ask', not nc, nc[:5])
        nwc = [c['id'] for c in cs if not (c.get('what') and c.get('why') and c.get('outcome'))]
        gate('cluster what / why / outcome present', not nwc, nwc[:5])
    fail = 0
    for n, ok, d in gates:
        print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if not ok and d else ''))
        fail += not ok
    print(f'{len(gates) - fail}/{len(gates)} PASS')
    sys.exit(1 if fail else 0)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    {'kb': kb, 'prep': prep, 'merge': merge, 'cprep': cprep, 'build': build, 'check': check}.get(cmd, lambda: print(__doc__))()
