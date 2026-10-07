#!/usr/bin/env python3
"""Companion data for the internal Product Journey's AI (Ask the roadmap) and Platform today view.

  python3 tools/journey_ask.py    -> dist-journey/roadmap-internal/ask.json

Holds: the verified platform baseline (data/roadmap/platform/baseline.json, from the knowledge base's
reconciliation study), the client index (analysis/stories.json: which clients each story was for, joined to
roadmap features and in-development items) and the open demand clusters (intel/db/clusters.json).
Internal only: it names clients."""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import roadmap as R

L = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


def main():
    base = L('data/roadmap/platform/baseline.json')
    hl = L('data/roadmap/highlights.json')
    nx = L('data/roadmap/coming-next.json')
    st = L('analysis/stories.json')['stories']
    item_of = {k: h['id'] for h in hl for k in h['stories']}
    next_of = {k: 'next-%d' % i for i, n in enumerate(nx) if not n.get('removed') for k in n.get('stories', [])}
    maps = {}
    for p in glob.glob(os.path.join(ROOT, 'data/roadmap/wwo/map/m*_w/map.json')):
        maps.update({x['id']: x for x in json.load(open(p))})
    changed = {}
    for iid, m in maps.items():
        for c in m.get('buildsOn') or []:
            changed.setdefault(c, []).append(iid)
    clients = {}
    for s in st:
        for c in s.get('customers') or []:
            name = c['name'] if isinstance(c, dict) else c
            e = clients.setdefault(name, {'name': name, 'tier': (c.get('tier') if isinstance(c, dict) else None), 'rm': [], 'nx': [], 'stories': [], 'dm': []})
            e['stories'].append({'k': s['k'], 's': s['summary'], 'stage': s.get('stage'), 'q': s.get('doneQuarter'), 'rm': item_of.get(s['k']) or next_of.get(s['k'])})
            if s['k'] in item_of and item_of[s['k']] not in e['rm']:
                e['rm'].append(item_of[s['k']])
            if s['k'] in next_of and next_of[s['k']] not in e['nx']:
                e['nx'].append(next_of[s['k']])
    dm = []
    for c in L('intel/db/clusters.json'):
        cust = [{'n': x.get('client') or x.get('name'), 't': x.get('tier')} for x in c.get('customers') or []]
        dm.append({'id': c['id'], 'name': c['name'], 'what': c.get('what'), 'why': (c.get('why') or '')[:400], 'product': c.get('product'),
                   'built': c.get('builtOverlap'), 'n': len(c.get('members') or []), 'cust': cust})
        for x in cust:
            if x['n'] in clients:
                clients[x['n']]['dm'].append(c['id'])
    for e in clients.values():
        e['stories'].sort(key=lambda x: x['q'] or '9999')
    claims = [{k: c[k] for k in ('id', 'file', 'line', 'product', 'section', 'claim', 'verdict', 'evidence', 'note')} | {'rm': changed.get(c['id'], [])}
              for c in base['claims']]
    out = {'baseline': {'source': base['source'], 'snapshot': base['snapshot'], 'products': base['products'], 'claims': claims},
           'clients': sorted(clients.values(), key=lambda e: ((e['tier'] or 9), -len(e['stories']))), 'demand': dm}
    dst = os.path.join(ROOT, 'dist-journey', 'roadmap-internal', 'ask.json')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    json.dump(out, open(dst, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('ask.json', os.path.getsize(dst) // 1024, 'KB · claims', len(claims), '· clients', len(clients), '· demand', len(dm),
          '· claims linked to roadmap', sum(1 for c in claims if c['rm']))


if __name__ == '__main__':
    main()
