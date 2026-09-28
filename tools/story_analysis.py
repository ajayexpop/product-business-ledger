#!/usr/bin/env python3
"""Story analysis: every Jira Story we hold (2023-2026, done + in flight + backlog) in one table, with the
customers each story names, their Sales Tier, and one business value driver per story.

  prep     all sources -> analysis/work/input.json + analysis/work/chunks/cNN.json (agent inputs)
  merge    analysis/work/out/cNN.json (agent output) + fields -> analysis/stories.json, stories.csv, summary.json
  check    every gate must PASS
  page     stories.json -> analysis/roadmap/data.json for the roadmap artifact

Spec: analysis/SPEC.md. Raw Jira text stays in analysis/raw and analysis/work (git-ignored: descriptions
contain credentials pasted into tickets).
"""
import csv, glob, json, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from done_stories import client_map, resolve, surface_forms, find_candidates  # noqa: E402

A = os.path.join(ROOT, 'analysis')
WORK = os.path.join(A, 'work')
LINK = 'https://expoplatform.atlassian.net/browse/'
CHUNK = 40
DRIVERS = ['Increase revenue', 'Protect churn', 'Reduce cost', 'Avoid cost']
IN_PROGRESS = {'In Progress', 'Ready for review', 'In testing', 'Ready for testing', 'Ready for release'}


def load(p):
    with open(p) as f:
        return json.load(f)


def dump(p, o, indent=1):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(o, f, indent=indent, ensure_ascii=False)
        f.write('\n')


def P(*a):
    return os.path.join(ROOT, *a)


SECRET = re.compile(r'(?i)(pass(word)?|pwd|secret|token|api[_ -]?key|client[_ -]?secret|bearer|authori[sz]ation)'
                    r'(\s*[:=]\s*|\s+)\S+')
URL = re.compile(r'https?://\S+')


def adf_text(v):
    if isinstance(v, dict):
        return (v.get('text') or '') + ('\n' if v.get('type') in ('paragraph', 'heading', 'listItem') else '') + \
            ''.join(adf_text(c) for c in v.get('content') or [])
    if isinstance(v, list):
        return ''.join(adf_text(c) for c in v)
    return v or ''


def clean_desc(t, n=2000):
    if not t:
        return ''
    if not isinstance(t, str):
        t = adf_text(t)
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', t)
    t = re.sub(r'<custom[^>]*>.*?</custom>', '[link]', t, flags=re.S)
    t = re.sub(r'<[^>]+>', '', t)
    t = SECRET.sub(r'\1: [redacted]', t)
    t = URL.sub('[url]', t)
    t = re.sub(r'[​‌‍﻿]', '', t)
    t = re.sub(r'\n\s*\n+', '\n', t)
    t = re.sub(r'[ \t]+', ' ', t).strip()
    return t[:n] + (' …[cut]' if len(t) > n else '')


def sources():
    full = {r['k']: r for y in ('2023', '2024', '2025') for r in load(P('data', y, 'stories.json'))}
    enr = {}
    for y in ('2023', '2024', '2025', '2026'):
        enr.update(load(P('data', 'roadmap', 'enriched', f'{y}.json')))
    d26 = load(P('data', 'roadmap', 'enrich', 'confluence', 'desc2026.json'))
    conf = load(P('data', 'roadmap', 'enrich', 'confluence', 'ai.json'))
    cache = load(P('ledger', 'data', 'stories', 'cache', 'stories.json'))
    nxt = load(P('data', 'roadmap', 'pull', 'next', 'records.json'))
    meta = {}
    for y in ('2023', '2024', '2025', '2026'):
        d = load(P('data', 'roadmap', 'pull', y, 'records.json'))
        meta.update(d if isinstance(d, dict) else {r['k']: r for r in d})
    nd = load(os.path.join(A, 'raw', 'notdone', 'records.json'))
    page = {s['k']: s for s in load(P('ledger', 'data', 'ledger.json'))['stories']}
    return dict(full=full, enr=enr, d26=d26, conf=conf, cache=cache, nxt=nxt, meta=meta, nd=nd, page=page)


def txt(v):
    return v if isinstance(v, str) else adf_text(v) if v else ''


def first(*vals):
    for v in vals:
        if v not in (None, '', [], {}):
            return v
    return None


def listify(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def build_base(S):
    keys = set(S['meta']) | set(S['cache']) | set(S['nxt']) | set(S['nd'])
    out = {}
    for k in sorted(keys, key=lambda x: int(x.split('-')[1])):
        fu, en, d2, cf = S['full'].get(k, {}), S['enr'].get(k, {}), S['d26'].get(k, {}), S['conf'].get(k, {})
        ca, nx, me, nd, pg = S['cache'].get(k, {}), S['nxt'].get(k, {}), S['meta'].get(k, {}), S['nd'].get(k, {}), S['page'].get(k, {})
        status = first(nd.get('status'), me.get('status'), ca.get('status'), nx.get('status'))
        done = k in S['meta']
        stage = 'Done' if done else ('In progress' if status in IN_PROGRESS else 'Not started')
        doneAt = me.get('doneAt') if done else None
        epic = first(me.get('epic'), ca.get('epic'), nx.get('epic'), nd.get('epic'), fu.get('epic'))
        desc = txt(first(fu.get('description'), en.get('description'), d2.get('description'), nd.get('description')))
        wwo = first(fu.get('wwo'), en.get('wwo')) or {}
        ai = ca.get('ai') or {}
        summ = {}
        if cf and not cf.get('noDescription'):
            summ = {'what': cf.get('what'), 'why': cf.get('why'), 'outcome': cf.get('outcome'), 'src': 'confluence'}
        elif wwo and not wwo.get('noDescription') and wwo.get('what'):
            summ = {'what': wwo.get('what'), 'why': wwo.get('why'), 'outcome': wwo.get('outcome'), 'src': 'description'}
        elif ai.get('s'):
            summ = {'what': ai.get('s'), 'problem': ai.get('pr'), 'why': ai.get('wy'), 'outcome': ai.get('oc'), 'src': 'story-cache'}
        elif pg.get('s'):
            summ = {'what': pg.get('s'), 'problem': pg.get('pr'), 'why': pg.get('wy'), 'outcome': pg.get('oc'), 'src': 'ledger-page'}
        cv = fu.get('clientValue') or {}
        out[k] = {
            'k': k, 'link': LINK + k,
            'summary': first(nd.get('summary'), me.get('summary'), ca.get('summary'), nx.get('summary'), fu.get('summary')),
            'status': status, 'stage': stage,
            'created': (first(nd.get('created'), me.get('created'), ca.get('created'), nx.get('created'), fu.get('created')) or '')[:10] or None,
            'doneDate': doneAt[:10] if doneAt else None,
            'doneYear': int(doneAt[:4]) if doneAt else None,
            'doneQuarter': f"{doneAt[:4]}-Q{(int(doneAt[5:7]) - 1) // 3 + 1}" if doneAt else None,
            'team': first(me.get('team'), ca.get('team'), nx.get('team'), fu.get('team')),
            'epic': ({'k': epic.get('k'), 'summary': epic.get('summary')} if isinstance(epic, dict) else None),
            'labels': first(nd.get('labels'), me.get('labels'), ca.get('labels'), nx.get('labels')) or [],
            'components': first(nd.get('components'), me.get('components'), en.get('components'), nx.get('components')) or [],
            'reportedBy': first(nd.get('reportedBy'), fu.get('reportedBy'), en.get('reportedBy'), ca.get('reportedBy')) or [],
            'affectedClients': first(nd.get('affectedClients'), fu.get('affectedClients'), en.get('affectedClients')) or [],
            'whoFor': txt(first(nd.get('whoFor'), cv.get('whoFor'), en.get('whoFor'))).strip() or None,
            'valueField': txt(first(nd.get('value'), cv.get('value'), en.get('value'))).strip() or None,
            'descChars': len(desc),
            'hasDescription': len(clean_desc(desc, 10**6)) >= 60,
            'textSummary': summ,
            'prior': {'lens': first(pg.get('lens'), ai.get('lens')), 'bv': first(pg.get('bv'), ai.get('bv')),
                      'im': first(pg.get('im'), ai.get('im')) or [], 'rg': first(pg.get('rg'), ai.get('rg'))},
            'onLedgerPage': k in S['page'],
            'productArea': first(pg.get('pp')), 'productDomain': first(pg.get('pdm')),
            '_desc': desc,
        }
    return out


def prep():
    S = sources()
    base = build_base(S)
    cmap, comps = client_map()
    forms = surface_forms(cmap)
    inputs = []
    for k, r in base.items():
        text = '\n'.join(x for x in [r['summary'] or '', (r['epic'] or {}).get('summary') or '', r['_desc'],
                                     r['whoFor'] or '', r['valueField'] or '',
                                     ' '.join(str(v) for v in r['textSummary'].values() if v)] if x)
        hints = find_candidates(text, forms)
        inputs.append({
            'k': k, 'stage': r['stage'], 'status': r['status'], 'doneYear': r['doneYear'],
            'summary': r['summary'], 'epic': (r['epic'] or {}).get('summary'), 'team': r['team'],
            'labels': r['labels'], 'components': r['components'],
            'reportedBy': r['reportedBy'], 'affectedClients': r['affectedClients'],
            'whoFor': r['whoFor'], 'valueField': r['valueField'],
            'summaryText': {kk: vv for kk, vv in r['textSummary'].items() if vv and kk != 'src'},
            'description': clean_desc(r['_desc']),
            'clientNameHints': hints,
        })
    base_out = {k: {kk: vv for kk, vv in r.items() if kk != '_desc'} for k, r in base.items()}
    dump(os.path.join(WORK, 'base.json'), base_out)
    dump(os.path.join(WORK, 'input.json'), inputs)
    for f in glob.glob(os.path.join(WORK, 'chunks', 'c*.json')):
        os.remove(f)
    n = 0
    for i in range(0, len(inputs), CHUNK):
        n += 1
        dump(os.path.join(WORK, 'chunks', f'c{n:02d}.json'), inputs[i:i + CHUNK])
    print('stories', len(inputs), 'chunks', n, Counter(r['stage'] for r in base.values()),
          'with description', sum(r['hasDescription'] for r in base.values()),
          'with hints', sum(1 for x in inputs if x['clientNameHints']))


# Event names seen by the analysis that the client map lacks. Evidence: ledger events carry the organiser's Pipedrive id.
EXTRA_ALIASES = {
    'Shoptalk': 'Hyve Group Plc', 'ShopTalk': 'Hyve Group Plc', 'Shoptalk Europe': 'Hyve Group Plc',
    'Shoptalk Spring': 'Hyve Group Plc',          # ledger events ShopTalk Spring/Europe/Fall 2026: pd 4121 (Hyve)
    'MRO Europe': 'Informa North America',        # ledger event MRO Europe 2024 / bug EP-35632: Informa- MRO, pd 57878
    'CPNA': 'Informa North America',              # Cosmoprof North America (client map note)
    'Agritechnica': 'DLG Markets GmbH', 'Agritechnica 2025': 'DLG Markets GmbH',
    'EuroTier': 'DLG Markets GmbH', 'EuroTier 2026': 'DLG Markets GmbH',   # EP-57360 'DLG for EuroTier 2026'
}

# Spellings of the same non-ledger client folded to one name (no tier: Informa entity not evidenced, runbook rule).
RENAME = {'Premiere': 'Informa- Premiere', 'Premier': 'Informa- Premiere', 'Premiere Orlando': 'Informa- Premiere'}

TIER_GROUPS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Named, not in ledger', 'Platform (no customer)']


def canon(name, cmap, comps):
    t = (name or '').strip()
    if not t or t.upper() == 'INTERNAL':
        return None
    if t.lower() in ('informa', 'informa- plc', 'informa plc'):
        # runbook sv-informa-halt: bare Informa is never resolved to an entity; the ledger "Informa" row is the
        # group parent / a prospect record, not the customer, so it carries no tier here.
        return {'name': 'Informa (entity not stated)', 'tier': None, 'inLedger': False}
    if t in comps:
        return {'name': t, 'tier': comps[t]['tier'], 'inLedger': True}
    t = RENAME.get(t, t)
    if t in EXTRA_ALIASES:
        c = EXTRA_ALIASES[t]
        return {'name': c, 'tier': comps[c]['tier'], 'inLedger': True}
    hit = cmap.get(t) or next((v for kk, v in cmap.items() if kk.lower() == t.lower()), None)
    if hit is None:
        hit = next((v for kk, v in cmap.items() if kk.lower().replace(' ', '') == t.lower().replace(' ', '')), None)
    if hit and hit.get('basis') == 'internal':
        return None
    if hit and hit.get('client') in comps:
        c = hit['client']
        return {'name': c, 'tier': comps[c]['tier'], 'inLedger': True}
    return {'name': t, 'tier': None, 'inLedger': False}


def outputs():
    out = {}
    for f in sorted(glob.glob(os.path.join(WORK, 'out', 'c*.json'))):
        for r in load(f):
            out[r['k']] = r
    return out


def merge():
    base = load(os.path.join(WORK, 'base.json'))
    hints = {r['k']: r['clientNameHints'] for r in load(os.path.join(WORK, 'input.json'))}
    out = outputs()
    cmap, comps = client_map()
    L = load(P('ledger', 'data', 'ledger.json'))
    stories = []
    for k, b in base.items():
        o = out.get(k)
        if o is None:
            raise SystemExit(f'missing agent output for {k}')
        cust = {}
        for tok in list(b['reportedBy']) + list(b['affectedClients']):
            c = canon(tok, cmap, comps)
            if c:
                cust.setdefault(c['name'], dict(c, sources=set()))['sources'].add('field')
        for tok in o.get('customersNamed') or []:
            c = canon(tok, cmap, comps)
            if c:
                cust.setdefault(c['name'], dict(c, sources=set()))['sources'].add('text')
        if 'Informa (entity not stated)' in cust and any(n.startswith('Informa') and n != 'Informa (entity not stated)' for n in cust):
            del cust['Informa (entity not stated)']      # a specific Informa entity is already on the story
        cl = sorted(cust.values(), key=lambda c: (c['tier'] or 9, c['name']))
        for c in cl:
            c['sources'] = sorted(c['sources'])
        possible = []
        for tok in hints.get(k) or []:
            c = canon(tok, cmap, comps)
            if c and c['name'] not in cust and c['name'] not in possible:
                possible.append(c['name'])
        tiers = sorted({c['tier'] for c in cl if c['tier']})
        group = (f'Tier {tiers[0]}' if tiers else ('Named, not in ledger' if cl else 'Platform (no customer)'))
        rec = {
            'k': k, 'link': b['link'], 'summary': b['summary'],
            'stage': b['stage'], 'status': b['status'],
            'created': b['created'], 'doneDate': b['doneDate'], 'doneYear': b['doneYear'], 'doneQuarter': b['doneQuarter'],
            'team': b['team'], 'epicKey': (b['epic'] or {}).get('k'), 'epic': (b['epic'] or {}).get('summary'),
            'labels': b['labels'], 'components': b['components'],
            'productArea': b['productArea'], 'productDomain': b['productDomain'],
            'reportedBy': [x for x in b['reportedBy'] if x], 'affectedClients': [x for x in b['affectedClients'] if x],
            'customers': [{'name': c['name'], 'tier': c['tier'], 'inLedger': c['inLedger'], 'sources': c['sources']} for c in cl],
            'customersCsv': ', '.join(c['name'] for c in cl),
            'customersNamedInText': o.get('customersNamed') or [],
            'customerEvidence': o.get('customerEvidence'),
            'possibleCustomers': possible,
            'tiers': tiers, 'tiersCsv': ', '.join(f'Tier {t}' for t in tiers),
            'topTier': tiers[0] if tiers else None, 'tierGroup': group,
            'valueDriver': o['valueDriver'], 'secondaryDriver': o.get('secondaryDriver'),
            'driverRationale': o.get('driverRationale'), 'driverConfidence': o.get('driverConfidence'),
            'what': b['textSummary'].get('what'), 'why': b['textSummary'].get('why'),
            'outcome': b['textSummary'].get('outcome'), 'textSource': b['textSummary'].get('src'),
            'hasDescription': b['hasDescription'], 'onLedgerPage': b['onLedgerPage'],
        }
        stories.append(rec)
    meta = {
        'title': 'Story analysis: customers, tiers and value drivers',
        'builtAt': __import__('datetime').datetime.now().strftime('%Y-%m-%d'),
        'ledgerAsOf': L.get('asOf'), 'count': len(stories),
        'scope': 'Every EP Story held locally: finished 2023 to Sep 2026 (statusCategoryChangedDate), In Progress category, '
                 'Ready to start backlog, and Open stories created in 2026. Rejected excluded.',
        'spec': 'analysis/SPEC.md', 'tool': 'tools/story_analysis.py',
        'valueDrivers': DRIVERS, 'tierGroups': TIER_GROUPS,
        'fields': {
            'customers': 'Reported by + Affected clients + customers named in the story text, canonical ledger names',
            'customersCsv': 'the same, comma separated (highest tier first)',
            'tiers': 'distinct Sales Tiers of ledger customers on the story', 'topTier': 'highest tier (1 is top)',
            'tierGroup': 'Tier 1-4 by topTier; "Named, not in ledger"; or "Platform (no customer)"',
            'valueDriver': 'one of valueDrivers, judged from the description', 'secondaryDriver': 'optional second driver',
            'possibleCustomers': 'names a text scan found that the analyst did not confirm (example data, text past the '
                                 'reading cut, ambiguous tokens). Not counted in customers or tiers',
        },
    }
    dump(os.path.join(A, 'stories.json'), {'_meta': meta, 'stories': stories})
    cols = ['k', 'link', 'summary', 'stage', 'status', 'created', 'doneDate', 'doneYear', 'doneQuarter', 'team',
            'epicKey', 'epic', 'productArea', 'productDomain', 'customersCsv', 'tiersCsv', 'topTier', 'tierGroup',
            'valueDriver', 'secondaryDriver', 'driverConfidence', 'driverRationale', 'customerEvidence', 'possibleCustomers',
            'reportedBy', 'affectedClients', 'labels', 'components', 'what', 'why', 'outcome', 'hasDescription', 'onLedgerPage']
    with open(os.path.join(A, 'stories.csv'), 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in stories:
            w.writerow([', '.join(r[c]) if isinstance(r[c], list) else ('' if r[c] is None else r[c]) for c in cols])
    # summaries
    def xtab(key):
        t = defaultdict(Counter)
        for r in stories:
            t[str(r[key])][r['valueDriver']] += 1
        return {kk: dict(v, total=sum(v.values())) for kk, v in sorted(t.items())}
    byCust = defaultdict(lambda: {'tier': None, 'inLedger': False, 'stories': [], 'drivers': Counter(), 'stages': Counter()})
    for r in stories:
        for c in r['customers']:
            e = byCust[c['name']]
            e['tier'], e['inLedger'] = c['tier'], c['inLedger']
            e['stories'].append(r['k'])
            e['drivers'][r['valueDriver']] += 1
            e['stages'][r['stage']] += 1
    customers = sorted(({'name': n, 'tier': e['tier'], 'inLedger': e['inLedger'], 'storyCount': len(e['stories']),
                         'drivers': dict(e['drivers']), 'stages': dict(e['stages']), 'storyKeys': e['stories']}
                        for n, e in byCust.items()), key=lambda c: (c['tier'] or 9, -c['storyCount'], c['name']))
    summary = {
        'builtAt': meta['builtAt'], 'count': len(stories),
        'byDriver': dict(Counter(r['valueDriver'] for r in stories)),
        'byTierGroupAndDriver': xtab('tierGroup'),
        'byStageAndDriver': xtab('stage'),
        'byDoneYearAndDriver': xtab('doneYear'),
        'byConfidence': dict(Counter(r['driverConfidence'] for r in stories)),
        'withCustomer': sum(1 for r in stories if r['customers']),
        'customers': customers,
    }
    dump(os.path.join(A, 'summary.json'), summary)
    print('stories', len(stories), summary['byDriver'], 'with customer', summary['withCustomer'])
    print({g: v['total'] for g, v in summary['byTierGroupAndDriver'].items()})


def check():
    ok = True

    def gate(name, cond, detail=''):
        nonlocal ok
        ok &= bool(cond)
        print(('PASS ' if cond else 'FAIL ') + name + (f'  {detail}' if detail and not cond else ''))
    base = load(os.path.join(WORK, 'base.json'))
    d = load(os.path.join(A, 'stories.json'))
    st = d['stories']
    gate('one record per story held', len(st) == len(base) == len({r['k'] for r in st}), f'{len(st)} vs {len(base)}')
    gate('every driver valid', all(r['valueDriver'] in DRIVERS for r in st))
    gate('secondary valid and different', all(r['secondaryDriver'] in (None, *DRIVERS) and r['secondaryDriver'] != r['valueDriver'] for r in st))
    gate('confidence set', all(r['driverConfidence'] in ('High', 'Medium', 'Low') for r in st))
    gate('rationale present', all(r['driverRationale'] for r in st))
    gate('tier group consistent', all((r['tierGroup'] == f"Tier {r['topTier']}") if r['topTier'] else r['tierGroup'] in TIER_GROUPS[4:] for r in st))
    gate('fields clients carried', all(any(c['name'] for c in r['customers']) for r in st
                                       if [x for x in r['reportedBy'] + r['affectedClients'] if x.upper() != 'INTERNAL']))
    blob = json.dumps(d, ensure_ascii=False)
    leak = [m.group(0)[:40] for m in re.finditer(r'(?i)(password|passwd|pwd|api[_-]?key|secret|token)\s*[:=]\s*\S{4,}', blob)]
    gate('no credentials in output', not leak, str(leak[:5]))
    gate('no emails in output', not re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', blob), str(re.findall(r'[\w.+-]+@[\w-]+\.[\w.]+', blob)[:5]))
    print('ALL PASS' if ok else 'SOME FAILED')
    return ok


def page():
    """analysis/stories.json -> analysis/roadmap/data.json (slim rows for the roadmap artifact) + fonts."""
    import shutil
    d = load(os.path.join(A, 'stories.json'))
    DI = {v: i for i, v in enumerate(DRIVERS)}
    rows = []
    excluded = 0
    for r in d['stories']:
        if r['stage'] == 'Not started':      # owner decision 25 Sep 2026: the page shows In Progress and beyond only
            excluded += 1
            continue
        rows.append([
            r['k'], r['summary'], {'Done': 0, 'In progress': 1, 'Not started': 2}[r['stage']],
            r['doneQuarter'] or '', r['team'] or '', r['epic'] or '',
            [[c['name'], c['tier'] or 0] for c in r['customers']],
            DI[r['valueDriver']], DI[r['secondaryDriver']] if r['secondaryDriver'] else -1,
            {'High': 2, 'Medium': 1, 'Low': 0}[r['driverConfidence']],
            r['driverRationale'] or '', r['what'] or '', r['why'] or '', r['outcome'] or '',
            r['doneDate'] or '', r['status'] or '', r['productArea'] or '',
        ])
    meta = {'builtAt': d['_meta']['builtAt'], 'ledgerAsOf': d['_meta']['ledgerAsOf'], 'drivers': DRIVERS,
            'excludedNotStarted': excluded,
            'scope': 'Done (2023 to Sep 2026) and In Progress category (In Progress, Ready for review, In testing, '
                     'Ready for testing, Ready for release). Not-started stories are excluded.',
            'cols': ['k', 'summary', 'stage', 'quarter', 'team', 'epic', 'customers', 'driver', 'secondary',
                     'confidence', 'rationale', 'what', 'why', 'outcome', 'doneDate', 'status', 'productArea']}
    out = os.path.join(A, 'roadmap')
    os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
    with open(os.path.join(out, 'data.json'), 'w') as f:
        json.dump({'meta': meta, 'rows': rows}, f, ensure_ascii=False, separators=(',', ':'))
    for fn in ('Guton-SemiBold.ttf', 'Guton-Bold.ttf', 'Inter-Regular.ttf', 'Inter-SemiBold.ttf'):
        shutil.copy(P('ledger', 'live', 'fonts', fn), os.path.join(out, 'fonts', fn))
    print('rows', len(rows), 'excluded not started', excluded, 'bytes', os.path.getsize(os.path.join(out, 'data.json')))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    {'prep': prep, 'merge': merge, 'check': check, 'page': page}.get(cmd, lambda: print(__doc__))()
