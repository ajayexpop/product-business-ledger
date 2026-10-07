#!/usr/bin/env python3
"""Pack the Ledger Rewire Preview's data into rewire/data/data.json.

Reads, never writes:
  ../ledger/data/ledger.json, ../ledger/data/hyve.json, ../ledger/data/demand/demand.json
  rewire/data/live-db/  (a read-only export of the live ledger's database: pipeline, jira, refresh)

The live Jira, incident, event and Hyve refreshes are laid over the built data the same way the
ledger's page does it (applyDelta and rfApply in ledger/src/main.js).
"""
import json, glob, os, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LEDGER = os.path.join(os.path.dirname(ROOT), 'ledger')
LIVE = os.path.join(ROOT, 'data', 'live-db')

def load(p):
    return json.load(open(p, encoding='utf-8'))

def live_doc(path):
    p = os.path.join(LIVE, path)
    return load(p) if os.path.exists(p) else {}

def norm(t):
    return re.sub(r'[^a-z0-9]', '', str(t or '').lower())

def short_name(n):
    return re.sub(r'\s+(GmbH|Ltd|Limited|Plc|PLC|Inc|LLC|S\.?A\.?|AG|eG|Co KG|& Co KG)\b.*$', '', n).strip()

def slug(t):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', str(t).lower())).strip('-')[:60]

PRI = {'urgent': 'Urgent', 'highest': 'Urgent', 'blocker': 'Urgent', 'critical': 'Urgent', 'high': 'High',
       'medium': 'Medium', 'low': 'Low', 'lowest': 'Low', 'trivial': 'Low', 'minor': 'Low'}

def main():
    led = load(os.path.join(LEDGER, 'data', 'ledger.json'))
    hyve = load(os.path.join(LEDGER, 'data', 'hyve.json'))
    dem = load(os.path.join(LEDGER, 'data', 'demand', 'demand.json'))

    companies = led['companies']
    comp_pd = {c['pd'] for c in companies if c.get('pd')}

    base_bugs = led['bugs'] + [b for b in hyve.get('bugs', []) if b.get('sc') != 'done']
    base_stories = led['stories'] + hyve.get('stories', [])

    # the Reported-by label dictionary, learned from how the built data resolved each label
    lbl = {}
    def put(label, pd):
        k = norm(label)
        if k and k != 'internal' and pd:
            lbl.setdefault(k, set()).add(str(pd))
    for b in base_bugs:
        if b.get('rb') and b.get('repIds') and len(b['rb']) == len(b['repIds']):
            for l, pd in zip(b['rb'], b['repIds']): put(l, pd)
        if b.get('ac') and b.get('affIds') and len(b['ac']) == len(b['affIds']):
            for l, pd in zip(b['ac'], b['affIds']): put(l, pd)
    for i in led['incidents']:
        if i.get('rb') and i.get('ids') and len(i['rb']) == len(i['ids']):
            for l, pd in zip(i['rb'], i['ids']): put(l, pd)
    for c in companies:
        for t in c.get('deliveryTags') or []: put(t, c['pd'])
        put(c['name'], c['pd']); put(short_name(c['name']), c['pd'])

    def map_labels(vals):
        out = []
        for v in vals or []:
            k = norm(v)
            if not k or k == 'internal': continue
            if k in lbl:
                out += [p for p in lbl[k] if p not in out]; continue
            if len(k) >= 4:
                for c in companies:
                    if norm(c['name']).startswith(k) or norm(short_name(c['name'])) == k:
                        if c['pd'] not in out: out.append(c['pd'])
                        break
        return out

    # ---- Jira bugs and stories overlay
    recs = {}
    for f in sorted(glob.glob(os.path.join(LIVE, 'jira', '*.json'))):
        d = load(f); d = d.get('data', d)
        recs.update(d.get('r') or {})
    hv = (live_doc('refresh/hv.json').get('data') or live_doc('refresh/hv.json')).get('recs') or {}
    base_bug_keys = {b['key'] for b in base_bugs}
    base_story_keys = {s['k'] for s in base_stories}

    bugs = []
    for b in base_bugs:
        r = recs.get(b['key'])
        if b['key'].startswith('HV-') and b['key'] in hv:
            h = hv[b['key']]
            if h.get('st') in ('Done', 'Rejected', 'Closed', 'Cancelled'): continue
            b = dict(b, st=h.get('st') or b['st'], live=True)
        if not r or r.get('t') != 'B':
            bugs.append(b); continue
        if r.get('gone'): continue
        bugs.append(dict(b, st=r.get('st') or b['st'], p=PRI.get(str(r.get('p', '')).lower(), b['p']) if r.get('p') else b['p'],
                         s=r.get('s') or b['s'], live=True))
    for r in recs.values():
        if r.get('t') != 'B' or r.get('gone') or r['k'] in base_bug_keys: continue
        rep = map_labels([x for x in (r.get('rb') or []) if x != 'INTERNAL'])
        aff = [x for x in map_labels(r.get('ac')) if x not in rep]
        if not rep and not aff: continue
        bugs.append({'key': r['k'], 's': r.get('s', ''), 'st': r.get('st', ''), 'p': PRI.get(str(r.get('p', '')).lower(), 'Medium'),
                     'cr': r.get('cr'), 'team': r.get('team') or '', 'ev': '', 'rb': r.get('rb') or [], 'repIds': rep, 'affIds': aff,
                     'nw': True, 'live': True})

    months = led['months']
    stories = []
    for s in base_stories:
        r = recs.get(s['k'])
        if s['k'].startswith('HV-') and s['k'] in hv:
            h = hv[s['k']]
            if h.get('st') == 'Done' and s.get('sf') != 'Shipped':
                s = dict(s, sf='Shipped', mo=(h.get('up') or '')[:7] or s.get('mo'))
        if not r or r.get('t') != 'S':
            stories.append(s); continue
        if r.get('rej'): continue
        o = dict(s, js=r.get('st') or s.get('js'), live=True)
        if r.get('sc') == 'done' and s.get('sf') != 'Shipped':
            o['sf'] = 'Shipped'; o['mo'] = (r.get('scd') or r.get('up') or '')[:7] or s.get('mo')
        elif r.get('sc') and r['sc'] != 'done' and s.get('sf') == 'Shipped':
            o['sf'] = 'In Progress'
        stories.append(o)
    for r in recs.values():
        if r.get('t') != 'S' or r.get('rej') or r['k'] in base_story_keys or r.get('sc') in (None, '', 'new') or str(r.get('cr')) < '2026-01-01':
            continue
        done = r['sc'] == 'done'
        mo = str(r.get('scd') or r.get('up') or '')[:7] if done else str(r.get('cr'))[:7]
        if mo not in months: continue
        pds = map_labels([x for x in (r.get('rb') or []) if x != 'INTERNAL'])
        stories.append({'k': r['k'], 's': r.get('s', ''), 'team': r.get('team') or '', 'lens': '', 'sf': 'Shipped' if done else 'In Progress',
                        'mo': mo, 'pds': pds, 'internal': not pds, 'nw': True, 'live': True})

    # ---- incidents and events overlay
    imp = (live_doc('refresh/imp.json').get('data') or live_doc('refresh/imp.json')).get('recs') or {}
    op = (live_doc('refresh/op.json').get('data') or live_doc('refresh/op.json')).get('recs') or {}
    inc_keys = {i['key'] for i in led['incidents']}
    incidents = []
    for i in led['incidents']:
        r = imp.get(i['key'])
        incidents.append(dict(i, s=r.get('s') or i['s'], st=r.get('st') or i['st'], p=r.get('p') or i.get('p')) if r else i)
    for r in imp.values():
        if r['k'] in inc_keys or r.get('pd') not in comp_pd: continue
        incidents.append({'key': r['k'], 's': r.get('s', ''), 'st': r.get('st', ''), 'p': r.get('p'), 'cr': r.get('cr'),
                          'pd': r.get('pd'), 'rb': r.get('rb') or [], 'ev': r.get('ev') or '', 'ids': [r['pd']]})

    ev_keys = {e['k'] for e in led['events']}
    events = []
    for e in led['events']:
        r = op.get(e['k'])
        if r and r.get('gone'): continue
        if r:
            e = dict(e, n=r.get('n') or e['n'], s=r.get('s') or e['s'], e=r.get('e') or e['e'], st=r.get('st') or e.get('st'),
                     pd=r['pd'] if r.get('pd') in comp_pd else e.get('pd'), kind=r.get('kind') or e.get('kind'))
        events.append(e)
    for r in op.values():
        if r.get('gone') or r['k'] in ev_keys: continue
        events.append({'k': r['k'], 'n': r.get('n', ''), 's': r.get('s'), 'e': r.get('e') or r.get('s'),
                       'pd': r['pd'] if r.get('pd') in comp_pd else None, 'st': r.get('st'), 'kind': r.get('kind'), 'ctry': r.get('ctry')})
    events = [e for e in events if e.get('st') != 'Cancelled' and e.get('s') and e.get('pd') in comp_pd
              and e.get('kind') in ('event', 'community', None) and '2025-12-01' <= e['s'] <= '2027-06-30']
    events.sort(key=lambda e: e['s'])

    # ---- must-haves from the live database
    musthave = []
    for f in sorted(glob.glob(os.path.join(LIVE, 'pipeline', '*.json'))):
        d = load(f); d = d.get('data', d)
        v = d.get('v') or {}
        if not v.get('feature') or d.get('deleted') or d.get('del'): continue
        j = d.get('j') or {}; fl = d.get('flags') or {}
        musthave.append({'id': os.path.basename(f)[:-5], 'feature': v['feature'], 'key': v.get('key') or '', 'month': v.get('month') or '',
                         'status': v.get('status') or '', 'area': v.get('area') or '', 'priority': v.get('priority') or '',
                         'owner': v.get('owner') or '', 'why': v.get('why') or v.get('rationale') or '', 'impact': v.get('impact') or '',
                         'deps': v.get('deps') or '', 'notes': v.get('notes') or '', 'driver': v.get('driver') or '',
                         'team': j.get('team') or v.get('team') or '', 'jStatus': j.get('status') or '', 'due': j.get('due'),
                         'days': (d.get('n') or {}).get('days'), 'spent': j.get('spentDays'),
                         'forShow': str(v.get('forShow') or '').strip(),
                         'funded': str(v.get('funded') or '').strip().lower() in ('yes', 'true', 'funded'),
                         'overdue': bool(fl.get('overdue')) and not str(v.get('forShow') or '').strip(),
                         'noEstimate': bool(fl.get('noEstimate')), 'shipped': bool(fl.get('shipped'))})
    musthave.sort(key=lambda m: (m['month'] or '9999', m['feature']))

    # ---- demand needs (every need, for ranking and the intake duplicate search)
    items = {it['i']: it for it in dem['items']}
    TW = {1: 5, 2: 3, 3: 2, 4: 1}
    needs = []
    for cl in dem['clusters']:
        cus = {}; keys = []
        for m in cl.get('m') or []:
            it = items.get(m.get('i'))
            if not it: continue
            keys.append(it['k'])
            for cu in it.get('cu') or []:
                name, tier, pd = cu[0], (cu[1] if len(cu) > 1 else None), (cu[2] if len(cu) > 2 else None)
                prev = cus.get(name)
                if prev is None or (tier or 9) < (prev[0] or 9): cus[name] = (tier, pd)
        bo = cl.get('bo') or ''
        built = 'none' if (not bo or bo.startswith('None found')) else 'part'
        needs.append({'id': slug(cl['id'].replace('CL-', ''))[:48], 'name': cl['name'], 'product': cl.get('product') or 'Unassigned',
                      'what': cl.get('what') or '', 'why': cl.get('why') or '', 'outcome': cl.get('outcome') or '', 'built': built, 'bo': bo,
                      'cus': sorted([[n, t, pd] for n, (t, pd) in cus.items()], key=lambda x: (x[1] or 9, x[0])),
                      'signal': sum(TW.get(t, 1) for t, _ in cus.values()), 'keys': keys[:12], 'n': len(keys)})
    seen = set()
    for n in needs:
        base, i = n['id'], 2
        while n['id'] in seen: n['id'] = f'{base}-{i}'; i += 1
        seen.add(n['id'])
    needs.sort(key=lambda n: (-n['signal'], -n['n'], n['name']))

    # ---- companies
    out_co = []
    for c in companies:
        out_co.append({'pd': c['pd'], 'slug': slug(short_name(c['name'])), 'name': c['name'], 'short': short_name(c['name']),
                       'tier': c.get('tier'), 'owner': c.get('owner') or '', 'renewal': c.get('renewal') or '', 'since': c.get('customerSince') or '',
                       'themes': c.get('themes') or [], 'type': c.get('type') or ''})
    slugs = set()
    for c in out_co:
        base, i = c['slug'], 2
        while c['slug'] in slugs: c['slug'] = f'{base}-{i}'; i += 1
        slugs.add(c['slug'])

    def refresh_at(n):
        d = live_doc(f'refresh/{n}.json'); d = d.get('data', d)
        return d.get('lastRun')
    jira_at = max([(load(f).get('data', load(f)).get('at') or '') for f in glob.glob(os.path.join(LIVE, 'jira', '*.json'))] or [''])

    out = {
        'meta': {'packed': datetime.date.today().isoformat(), 'builtAsOf': led.get('asOf'), 'jiraAt': jira_at,
                 'impAt': refresh_at('imp'), 'opAt': refresh_at('op'), 'hvAt': refresh_at('hv'), 'demandAsOf': dem.get('asOf'),
                 'demandCounts': dem.get('counts'), 'tierWeights': TW},
        'companies': out_co,
        'bugs': [{'key': b['key'], 's': b['s'], 'st': b['st'], 'p': b['p'], 'cr': b.get('cr'), 'team': b.get('team') or 'No team',
                  'ev': b.get('ev') or '', 'pds': list(dict.fromkeys((b.get('repIds') or []) + (b.get('affIds') or []))),
                  'nw': bool(b.get('nw'))} for b in bugs],
        'incidents': [{'key': i['key'], 's': i['s'], 'st': i['st'], 'p': i.get('p') or '', 'cr': i.get('cr'), 'ev': i.get('ev') or '',
                       'pds': [p for p in (i.get('ids') or [i.get('pd')]) if p]} for i in incidents],
        'events': [{'k': e['k'], 'n': e['n'], 's': e['s'], 'e': e.get('e') or e['s'], 'pd': e['pd'], 'ctry': e.get('ctry') or ''} for e in events],
        'stories': [{'k': s['k'], 's': s.get('s', ''), 'team': s.get('team') or '', 'lens': s.get('lens') or '', 'sf': s.get('sf'),
                     'mo': s.get('mo') or '', 'pds': s.get('pds') or [], 'internal': bool(s.get('internal')),
                     'pp': s.get('pp') or s.get('pa') or '', 'pr': s.get('pr') or '', 'oc': s.get('oc') or ''} for s in stories],
        'musthave': musthave,
        'needs': needs,
        'lenses': led.get('lenses'),
        'teams': led.get('teams'),
    }
    dst = os.path.join(ROOT, 'data', 'data.json')
    json.dump(out, open(dst, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    open_bugs = len(out['bugs'])
    print(f"wrote {dst} {os.path.getsize(dst)/1024:.0f} KB")
    print(f"companies {len(out_co)} | open bugs {open_bugs} | incidents {len(out['incidents'])} | events {len(out['events'])} "
          f"| stories {len(out['stories'])} | must-haves {len(musthave)} | needs {len(needs)}")
    print('jira overlay at', jira_at, '| imp', out['meta']['impAt'], '| op', out['meta']['opAt'])

if __name__ == '__main__':
    main()
