#!/usr/bin/env python3
"""Pack the intake matching sources into rewire/data/corpus.json (loaded when the intake form opens).

Reads, never writes:
  ../analysis/stories.json                     every Story since 2023: Done, In progress, Not started, with what / why / outcome
  ../data/roadmap/tags.json                    the Product Journey feature and theme each delivered story belongs to
  ../dist-journey/roadmap-internal/ask.json    the verified platform baseline (claims with a code-study verdict)

Demand needs are already in data.json. Kinds: b = built (Done), f = in flight (In progress / Not started), p = platform today.
"""
import json, os, ast

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)

def lit(v):
    if isinstance(v, (list, dict)): return v
    try: return ast.literal_eval(v) if isinstance(v, str) and v[:1] in '[{' else v
    except (ValueError, SyntaxError): return v

def clean(v):
    return '' if v in (None, 'None', 'nan') else str(v).strip()

def main():
    L = json.load(open(os.path.join(REPO, 'analysis', 'stories.json'), encoding='utf-8'))
    L = L if isinstance(L, list) else L.get('stories')
    tags = json.load(open(os.path.join(REPO, 'data', 'roadmap', 'tags.json'), encoding='utf-8'))
    base = json.load(open(os.path.join(REPO, 'dist-journey', 'roadmap-internal', 'ask.json'), encoding='utf-8'))['baseline']

    items = []
    for s in L:
        cus = [[c.get('name'), c.get('tier')] for c in (lit(s.get('customers')) or []) if isinstance(c, dict) and c.get('name')]
        t = tags.get(s['k']) or {}
        rec = {'k': s['k'], 's': clean(s.get('summary')), 'w': clean(s.get('what')), 'y': clean(s.get('why'))[:400], 'o': clean(s.get('outcome'))[:400],
               'pa': clean(s.get('productArea')), 'cus': cus[:8]}
        if s['stage'] == 'Done':
            rec.update(t='b', q=clean(s.get('doneQuarter')), f=clean(t.get('feature')) if t.get('include') is not False else '', th=clean(t.get('theme')))
        else:
            rec.update(t='f', st=s['stage'], cr=clean(s.get('created'))[:7])
        items.append({k: v for k, v in rec.items() if v not in ('', [], None)})

    keep = {'CONFIRMED': 'Confirmed in the code', 'PARTIAL': 'Partly in the code', 'CODE-ONLY': 'In the code, not documented'}
    claims = 0
    for c in base.get('claims', []):
        if c.get('verdict') not in keep: continue
        items.append({'t': 'p', 'id': c['id'], 's': clean(c.get('claim'))[:300], 'pa': clean(c.get('product')), 'v': c['verdict']})
        claims += 1

    out = {'asOf': {'stories': '2026-09-25', 'baseline': base.get('snapshot', '')}, 'verdicts': keep, 'items': items}
    dst = os.path.join(ROOT, 'data', 'corpus.json')
    json.dump(out, open(dst, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    n = lambda k: sum(1 for i in items if i['t'] == k)
    print(f"wrote {dst} {os.path.getsize(dst)/1024:.0f} KB | built {n('b')} | in flight {n('f')} | platform {claims}")

if __name__ == '__main__':
    main()
