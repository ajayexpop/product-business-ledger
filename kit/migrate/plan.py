#!/usr/bin/env python3
"""Build the pipeline database migration for spec v1 (§2 team, §3.3 one-line why, §3.4 driver).

Reads the live documents saved in db_live/ (all at version 1), writes one complete document per
row into migrate/out/ for an ArtifactData batch `set` pinned to that version, and writes
migrate/drivers.json, which compute_flow.py reads so flow rows carry the same driver and tier.
Nothing here guesses: team comes from the Jira ticket (customfield_10001), the driver is
pre-filled only where the row itself names a client, and the old Why text moves to Rationale
verbatim."""
import json, os, re, copy, glob

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = os.path.join(W, 'db_live')
OUT = os.path.join(W, 'migrate', 'out')
os.makedirs(os.path.join(OUT, 'pipeline'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'config'), exist_ok=True)

page = open(os.path.join(W, 'publish', 'index.html')).read()
dec = json.JSONDecoder()
L, _ = dec.raw_decode(page[re.search(r'window\.LEDGER\s*=\s*', page).end():])
H, _ = dec.raw_decode(page[re.search(r'window\.HYVE\s*=\s*', page).end():])
by_pd = {c['pd']: c for c in L['companies']}
teams_jira = json.load(open(os.path.join(W, 'flow', 'pipeline_teams.json')))['teams']

TODAY = '2026-09-22'
# The row text that names the client, quoted as the basis for each pre-filled driver (pp-driver-prefill)
PREFILL = {
    'p02': ('81808', 'why', 'DLG commitment'),
    'p03': ('81808', 'why', 'DLG commitment'),
    'p04': ('81808', 'why', 'DLG commitment'),
    'p05': ('81808', 'why', 'DLG commitment'),
    'p11': ('81808', 'why', 'DLG commitment'),
    'p09': ('26874', 'impact', 'Currently a major blocker for IMEX.'),
    'p10': ('26874', 'why', 'Critical for IMEX'),
}
FIELD_LABEL = {'why': 'Why it matters', 'impact': 'Impact'}

# ---------- config/pipeline: the column schema
cfg_path = os.path.join(LIVE, 'config', 'pipeline.json')
cfg = json.load(open(cfg_path))
cols = cfg['columns']
keys = [c['key'] for c in cols]
assert keys == ['month', 'area', 'owner', 'key', 'feature', 'why', 'impact', 'priority', 'deps', 'status', 'estimate', 'notes'], keys

team_opts = [t['key'] for t in L['teams'] if t['key'] != 'Not Clearly Specified']
if H['team'] not in team_opts:
    team_opts.append(H['team'])
active = sorted([c for c in L['companies'] if c.get('inPlanhatActive')], key=lambda c: c['name'].lower())
driver_opts = [c['pd'] for c in active] + ['Platform']
driver_labels = {c['pd']: c['name'] for c in active}
driver_labels['Platform'] = 'Platform'

new_cols = []
for c in cols:
    c = dict(c)
    if c['key'] == 'owner':
        c['label'] = 'Raised by'
        c['note'] = 'The person who wrote the item down. Kept on the row; it enters no total (pp-team-unit).'
    if c['key'] == 'why':
        c['label'] = 'Why'
        c['type'] = 'text'
        c['limit'] = 'pp-why-one-line'
        c['w'] = 260
        c['note'] = 'One line, hard limit set by the pp-why-one-line rule. Long prose goes in Rationale.'
    new_cols.append(c)
    if c['key'] == 'priority':
        new_cols.append({'key': 'driver', 'label': 'Driver', 'type': 'select', 'w': 170,
                         'opts': driver_opts, 'optLabels': driver_labels,
                         'note': 'Who the item is for: a client from the Planhat active list, or Platform. Tier derives from it (pp-driver).'})
        new_cols.append({'key': 'team', 'label': 'Team (no Jira ticket)', 'type': 'select', 'w': 150, 'opts': team_opts,
                         'note': 'Required only when the row has no Jira ticket, or the ticket carries no team (pp-team-source).'})
new_cols.append({'key': 'rationale', 'label': 'Rationale', 'type': 'long', 'w': 320,
                 'note': 'The long form of Why. Shown on the expanded record, not in the table.'})

derived = [{'key': '_team', 'label': 'Team', 'type': 'txt', 'w': 130},
           {'key': '_tier', 'label': 'Tier', 'type': 'txt', 'w': 70}] + [d for d in cfg['derived']]
cfg_new = copy.deepcopy(cfg)
cfg_new['columns'] = new_cols
cfg_new['derived'] = derived
cfg_new['schema'] = 2
cfg_new['migrated'] = {'at': TODAY, 'by': 'Claude', 'spec': 'Client Ledger — Risk, Flow and Investment, spec v1, §2 and §3',
                       'what': 'Owner relabelled Raised by and removed from every total; Team added (from the Jira ticket, else the row); '
                               'Driver added (a Planhat active client or Platform); Why cut to one line with its old text moved verbatim to Rationale'}
cfg_new['teamsAsOf'] = teams_jira and TODAY
cfg_new['updatedAt'] = TODAY
json.dump(cfg_new, open(os.path.join(OUT, 'config', 'pipeline.json'), 'w'), indent=1, ensure_ascii=False)

# ---------- rows
drivers = {}
summary = []
for p in sorted(glob.glob(os.path.join(LIVE, 'pipeline', '*.json'))):
    doc_id = os.path.basename(p)[:-5]
    d = json.load(open(p))
    v = dict(d['v'])
    old_why = v.get('why') or ''
    v['rationale'] = old_why            # verbatim (spec §3.3)
    v['why'] = ''                       # starts empty: nobody's wording is truncated by a machine
    v['team'] = ''                      # the row's own team: only needed when Jira has none
    v['driver'] = ''
    nd = copy.deepcopy(d)
    key = (v.get('key') or '').strip()
    if nd.get('j') is not None:
        nd['j'] = dict(nd['j'])
        nd['j']['team'] = teams_jira.get(key)          # None where the ticket carries no team
        nd['j']['teamField'] = 'customfield_10001'
    pf = PREFILL.get(doc_id)
    if pf:
        pd, field, quote = pf
        assert quote in (d['v'].get(field) or ''), (doc_id, field, quote)
        v['driver'] = pd
        nd['prefill'] = {'driver': {'value': pd, 'name': by_pd[pd]['name'], 'field': FIELD_LABEL[field],
                                    'quote': quote, 'at': TODAY, 'by': 'Claude',
                                    'basis': f'{FIELD_LABEL[field]} names the client: "{quote}"'}}
    nd['v'] = v
    nd['updatedAt'] = TODAY
    nd['migrated'] = {'schema': 2, 'at': TODAY}
    json.dump(nd, open(os.path.join(OUT, 'pipeline', doc_id + '.json'), 'w'), indent=1, ensure_ascii=False)
    team = (nd.get('j') or {}).get('team') or v['team'] or None
    tier = by_pd[v['driver']]['tier'] if v['driver'] and v['driver'] in by_pd else None
    if key:
        drivers[key] = {'row': doc_id, 'driver': v['driver'] or None,
                        'driverName': by_pd[v['driver']]['name'] if v['driver'] in by_pd else None,
                        'tier': tier, 'basis': nd.get('prefill', {}).get('driver', {}).get('basis'), 'team': team}
    summary.append((doc_id, key or '-', team or 'NO TEAM', v['driver'] or '—', len(old_why)))

json.dump({'asOf': TODAY, 'source': 'pipeline database after the spec v1 migration', 'byKey': drivers},
          open(os.path.join(W, 'migrate', 'drivers.json'), 'w'), indent=1, ensure_ascii=False)
for s in summary:
    print(*s)
print('driver opts', len(driver_opts), '| team opts', team_opts)
