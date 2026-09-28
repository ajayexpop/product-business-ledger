#!/usr/bin/env python3
"""Demand data for the ledger's Demand tab and the work-item form's duplicate search.

  python3 tools/demand.py build   intel/db + requests/db + intel/kb -> data/demand/demand.json
  python3 tools/demand.py check   counts, redaction, and the join to ledger clients

It packs exactly what the Product Demand Map artifact packs (intel/viz/build.py: same fields, same clipping and
the same redaction of credentials, emails and link tokens), and adds two things the ledger needs:
  - the KB's built stories (intel/kb/built_stories.json), so a search can say "already built";
  - each customer's Pipedrive id from the ledger (data/ledger.json companies), so Client 360 can show a client's asks.
The page loads demand.json only when the Demand tab or the form's search is opened."""
import importlib.util, json, os, re, sys

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
R = lambda *a: os.path.join(os.path.dirname(W), *a)   # the repo root: intel/ and requests/ are their own projects
OUT = J('data', 'demand', 'demand.json')

def viz():
    """The Demand Map's own helpers (clip, ym, fis_status, built), read from intel/viz/build.py without running its page build."""
    src = open(R('intel', 'viz', 'build.py'), encoding='utf-8').read()
    cut = src.index("facts = {r['id']: r")          # everything above this line is definitions only
    ns = {'__file__': R('intel', 'viz', 'build.py')}
    exec(compile(src[:cut], 'intel/viz/build.py', 'exec'), ns)
    return ns

def build():
    v = viz(); clip, ym, fis_status, built, SRC = v['clip'], v['ym'], v['fis_status'], v['built'], v['SRC']
    load = lambda p: json.load(open(J(p) if p.startswith(('data/', 'live/')) else R(p), encoding='utf-8'))
    facts = {r['id']: r for r in load('requests/db/items.json')}
    led = load('data/ledger.json')
    pd_of = {c['name']: c['pd'] for c in led['companies']}
    items = []
    for e in load('intel/db/items.json'):
        r = facts[e['id']]; rq = r.get('request') or {}
        rec = {'i': e['id'], 's': SRC[r['source']], 'k': r.get('key') or '', 'u': r.get('link'), 't': r['title'],
               'st': fis_status(r) if r['source'] == 'fis' else r.get('status') or '', 'tm': r.get('team') or '',
               'c': r.get('components') or [], 'pr': e['product'],
               'cu': [[c['name'], c.get('tier') or 0, pd_of.get(c.get('client') or '', '')] for c in e['customers']],
               'in': e.get('internal') or False,
               'd': ym(r.get('created'), r.get('updated') if r['source'] == 'fis' else None),
               'cm': r.get('commentCount') or 0, 'v': r.get('votes') or 0,
               'w': clip(e.get('what'), 420), 'y': clip(e.get('why'), 420), 'o': clip(e.get('outcome'), 420),
               'x': clip(rq.get('value') or r.get('description') or r.get('problemStatement'), 300),
               'nk': e.get('needKey') or '', 'bs': built(e), 'kd': e.get('requestKind') or '',
               'bo': [[b.get('k'), b.get('verdict'), clip(b.get('note'), 160)] for b in (e.get('builtOverlap') or [])]}
        if r['source'] == 'fis':
            rec.update({'op': (r.get('scores') or {}).get('totalOpportunity'), 'fc': r.get('recommendedClassification') or ''})
        items.append({k: x for k, x in rec.items() if x not in ('', [], None, False, 0) or k in ('s', 'cu')})
    clusters = []
    for c in load('intel/db/clusters.json'):
        bo = c.get('builtOverlap')
        clusters.append({'id': c['id'], 'name': c['name'], 'product': c['product'],
                         'what': clip(c.get('what'), 700), 'why': clip(c.get('why'), 700), 'outcome': clip(c.get('outcome'), 700),
                         'bo': clip(bo if isinstance(bo, str) else json.dumps(bo, ensure_ascii=False), 600),
                         'also': c.get('alsoIn') or [],
                         'm': [{k: x for k, x in {'i': m['id'], 'r': m['role'], 'no': clip(m.get('note'), 150)}.items() if x} for m in c['members']]})
    kbp = load('data/stories/pa/kb_products.json')['products']
    dom = {p: x['domain'] for p, x in kbp.items()}; dom['Unassigned / Cross-cutting'] = 'Cross-cutting'
    dom = {p: d for p, d in dom.items() if p in {c['product'] for c in clusters}}
    kb = [{'k': b['k'], 't': clip(b.get('title'), 160), 'i': clip(b.get('intent'), 260), 'o': clip(b.get('outcome'), 260),
           'p': b.get('product') or '', 'f': b.get('feature') or '', 'st': b.get('status') or ''} for b in load('intel/kb/built_stories.json')]
    summ = load('intel/db/summary.json')
    doc = {'asOf': '2026-09-26', 'source': 'intel/db (Product Demand Map), requests/db, intel/kb',
           'counts': {'items': len(items), 'clusters': len(clusters), 'built': len(kb), 'duplicates': summ.get('duplicates')},
           'items': items, 'clusters': clusters, 'products': dom, 'built': kb}
    txt = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
    assert not re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', txt), 'an email address survived redaction'
    assert not re.search(r'(?i)[?&](invitationId|access_token|signature|share_key)=', txt), 'a link token survived'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(txt)
    print(f"demand.json: {len(items)} requests, {len(clusters)} needs, {len(kb)} built stories, {len(txt)/1e6:.2f} MB")

def check():
    d = json.load(open(OUT, encoding='utf-8'))
    ids = {r['i'] for r in d['items']}
    members = [m['i'] for c in d['clusters'] for m in c['m']]
    miss = [m for m in members if m not in ids]
    cu = [c for r in d['items'] for c in r['cu']]
    joined = sum(1 for c in cu if c[2])
    print(f"{len(d['items'])} requests · {len(d['clusters'])} needs · {len(d['built'])} built · cluster members not found: {len(miss)}")
    print(f"customers named {len(cu)}, joined to a ledger client {joined}")
    assert not miss, miss[:5]

if __name__ == '__main__':
    {'build': build, 'check': check}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
