#!/usr/bin/env python3
"""Attach the product-area classification to the page stories.

    python3 tools/product_areas.py apply   # writes pp/pdm/pab/pac/pae/pak on data/ledger.json stories + productAreas
    python3 tools/product_areas.py check   # every page story classified, names valid, fields in sync

Source: data/stories/pa/classification.json (SPEC: data/stories/pa/SPEC.md). Rule: dl-product-area.
The story's older `pa` field (the AI enrichment's product tag) is left untouched.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / 'data' / 'ledger.json'
CLS = ROOT / 'data' / 'stories' / 'pa' / 'classification.json'
KB = ROOT / 'data' / 'stories' / 'pa' / 'kb_products.json'
CROSS = 'Unassigned / Cross-cutting'

# SPEC order (MASTER Product Ecosystem Map §3-§4); Cross-cutting last
DOMAINS = [
    ('Provisioning & Platform Core', ['Client Manager', 'Admin / Platform Core', 'Integrations']),
    ('Acquisition & Commerce', ['Event Website', 'Online Registration', 'Transactions & Purchasing', 'User Engagement']),
    ('Identity & Community', ['Profile', 'Community']),
    ('Engagement & Matchmaking', ['Networking & Interactions', 'Meetings & Matchmaking', 'Sessions & Speakers', 'Mobile App']),
    ('Exhibitor & Sponsor', ['Exhibitor Portal', 'Exhibitor Marketplace', 'Sponsorship', 'Floor Plan',
                             'Hosted Buyer Management', 'Lead Intelligence']),
    ('Onsite', ['Onsite & Kiosks']),
    ('Insight', ['Organiser Analytics']),
    ('Cross-cutting', [CROSS]),
]


def load(p):
    return json.loads(p.read_text())


def fields(r):
    return {'pp': r['product'], 'pdm': r['domain'], 'pab': r['basis'], 'pac': r['confidence'],
            'pae': r['evidence'], 'pak': r['kbRef']}


def check_names():
    kb = load(KB)['products']
    dom_of = {p: d for d, ps in DOMAINS for p in ps}
    assert set(dom_of) == set(kb) | {CROSS}, 'DOMAINS out of step with kb_products.json'
    for p, v in kb.items():
        assert v['domain'] == dom_of[p], p
    return dom_of


def apply():
    dom_of = check_names()
    cls = {r['k']: r for r in load(CLS)['stories']}
    led = load(LEDGER)
    miss = []
    for s in led['stories']:
        r = cls.get(s['k'])
        if not r:
            miss.append(s['k'])
            continue
        assert dom_of[r['product']] == r['domain'], r['k']
        s.update(fields(r))
    led['productAreas'] = [{'d': d, 'products': ps} for d, ps in DOMAINS]
    led['productAreasAsOf'] = load(CLS).get('classifiedAt')
    LEDGER.write_text(json.dumps(led, separators=(',', ':')))   # the file's own style: compact, ASCII-escaped
    print(f"applied to {len(led['stories']) - len(miss)} stories; unclassified: {miss}")
    return not miss


def check():
    dom_of = check_names()
    cls = {r['k']: r for r in load(CLS)['stories']}
    led = load(LEDGER)
    bad = [s['k'] for s in led['stories']
           if s['k'] not in cls or {k: s.get(k) for k in fields(cls[s['k']])} != fields(cls[s['k']])
           or dom_of.get(s.get('pp')) != s.get('pdm')]
    ok = not bad and led.get('productAreas') == [{'d': d, 'products': ps} for d, ps in DOMAINS]
    print('PASS' if ok else f'FAIL {bad[:10]}')
    return ok


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    sys.exit(0 if {'apply': apply, 'check': check}[cmd]() else 1)
