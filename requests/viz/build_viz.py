#!/usr/bin/env python3
"""requests/db/items.json -> requests/viz/index.html (the Requests Explorer artifact). Data is embedded inline."""
import json, os, re
from datetime import datetime, timezone
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, '..', 'db')
items = json.load(open(os.path.join(DB, 'items.json')))
SRC = {'jira_fr': 'F', 'jira_story_open': 'S', 'fis': 'I'}

SECRET = re.compile(r'(?i)\b(pass(?:word)?|pwd|creds?|credentials|login|token|api[_ -]?key|secret)\b\s*[:=]\s*\S+')
EMAIL = re.compile(r'\[?[\w.+-]+@[\w-]+(?:\.[\w-]+)+\]?(?:\(mailto:[^)]*\))?')


def redact(s):
    s = SECRET.sub(lambda m: m.group(1) + ': [redacted]', s)
    return EMAIL.sub('[email]', s)


def clip(s, n):
    s = redact(re.sub(r'<custom[^>]*>|</custom>', '', s or ''))
    s = re.sub(r'!\[\]\([^)]*\)', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0] + '…'

def ym(v, fallback=None):
    v = str(v or '').strip()
    if re.fullmatch(r'\d{12,14}', v):                          # ADF date node: epoch milliseconds
        return datetime.fromtimestamp(int(v) / 1000, timezone.utc).strftime('%Y-%m')
    m = re.search(r'(20\d\d)-(\d\d)', v)
    if m:
        return m.group(1) + '-' + m.group(2)
    if fallback:
        try:
            return datetime.strptime(fallback, '%d %b, %Y').strftime('%Y-%m')
        except ValueError:
            return ''
    return ''

out = []
for r in items:
    if r['source'] == 'fis' and r['excluded']:
        continue
    cl = [c for c in r.get('customers') or []]
    names, tiers, internal = [], [], False
    for c in cl:
        if c['token'] == 'INTERNAL':
            internal = True; continue
        n = c['client'] or c['token']
        if c['source'] == 'Pipedrive Company ID' and not c['client']:
            continue                                   # a bare Pipedrive id is not a readable name
        if n not in names:
            names.append(n)
        if c.get('tier'):
            tiers.append(int(c['tier']))
    rq = r.get('request') or {}
    pa = (r.get('jiraProductArea') or {}).get('level1') or r.get('fisProductArea')
    rec = {
        'i': r['id'], 's': SRC[r['source']], 'k': r.get('key') or '', 'u': r.get('link'),
        't': r['title'], 'st': r.get('status') or '', 'tm': r.get('team') or '',
        'c': r.get('components') or [], 'pa': (pa or '').split(',')[0].split('/')[0].strip(),
        'cu': names, 'in': internal, 'ti': min(tiers) if tiers else 0,
        'd': ym(r.get('created'), r.get('updated') if r['source'] == 'fis' else None), 'cm': r.get('commentCount') or 0, 'v': r.get('votes') or 0,
        'ep': (r.get('epic') or {}).get('key') or '', 'es': clip((r.get('epic') or {}).get('summary'), 80),
        'x': clip(rq.get('value') or rq.get('whoFor') or r.get('description') or r.get('problemStatement') or '', 360),
    }
    if r['source'] == 'fis':
        rec.update({'op': (r.get('scores') or {}).get('totalOpportunity'), 'cl': r.get('recommendedClassification') or '',
                    'ef': clip(r.get('estimatedEffort'), 40), 'ds': clip(r.get('decisionStatus'), 60),
                    'ek': r.get('epKeysMentioned') or [], 'ev': clip(r.get('eventsImpacted'), 140)})
    if r['source'] == 'jira_fr' and r.get('fis'):
        rec['fp'] = r['fis']
    out.append({k: v for k, v in rec.items() if v not in ('', [], None, 0, False) or k in ('s', 'ti')})
data = json.dumps(out, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
tpl = open(os.path.join(HERE, 'template.html')).read()
cust = json.load(open(os.path.join(DB, 'customers.json')))
tiers = {c['client']: int(c['tier']) for c in cust if c.get('client') and c.get('tier')}
html = tpl.replace('/*__DATA__*/[]', data).replace('/*__TIERS__*/{}', json.dumps(tiers, ensure_ascii=False))
open(os.path.join(HERE, 'index.html'), 'w').write(html)
print(len(out), 'items', round(len(html) / 1e6, 2), 'MB')
