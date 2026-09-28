#!/usr/bin/env python3
"""Product Demand Map artifact: intel/viz/app.html + app.js + data -> intel/viz/index.html.

Data: requests/db/items.json (facts) and intel/db/items.json + clusters.json (KB product, what / why / outcome,
built overlap, needs). Everything is inlined; ticket text is clipped and redacted for credentials and emails.
"""
import json, os, re
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
load = lambda p: json.load(open(os.path.join(ROOT, p)))
SRC = {'jira_fr': 'F', 'jira_story_open': 'S', 'fis': 'I'}

# a credential keyword followed by a separator (: = - – or "under") and a value; the value goes, the keyword stays
# a credential keyword, a real separator (": ", "=", " - ", " under ", " is ") and a value that looks like a secret
# (has a digit or a symbol). Hyphenated words such as user-friendly or password-reset are left alone.
SECRET = re.compile(r'(?i)\b(pass(?:word)?|pwd|passcode|creds?|credentials?|log-?in(?:\s+under)?|user(?:name)?|token|api[_ -]?key|secret)\b'
                    r'(\s*[:=]\s*|\s+[-–]\s+|\s+under\s+|\s+is\s+)(\S+(?:\s*/\s*\S+)?)')
_T = r'[^\s,;()<>\[\]"\'/?=&]'
PWLIKE = re.compile(rf'(?<![\w@/?=&.-])(?={_T}*[A-Za-z])(?={_T}*\d)(?={_T}*[!@#$%^]){_T}{{6,40}}(?!{_T})')
URL = re.compile(r'https?://\S+')
EMAIL = re.compile(r'\[?[\w.+-]+@[\w-]+(?:\.[\w-]+)+\]?(?:\(mailto:[^)]*\))?')


# capability tokens in links (share/invite/sign/auth parameters) are dropped from any URL in ticket text
TOKEN_PARAM = re.compile(r'(?i)([?&])(invitationId|invite|token|access_token|auth|key|sig|signature|code|share_key|pwd)=[^&\s)\]"]*&?')


def clip(s, n):
    s = s if isinstance(s, str) else ''
    s = TOKEN_PARAM.sub(lambda m: m.group(1), s)
    s = re.sub(r'<custom[^>]*>|</custom>', '', s)
    s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', s)
    s = SECRET.sub(lambda m: m.group(1) + ': [redacted]' if re.search(r'[\d!@#$%^&/]', m.group(3)) and not re.fullmatch(r'\**(EP|REQ)-\d+\**[.,;:]?', m.group(3)) else m.group(0), s)
    s = URL.sub(lambda m: '\x00' + m.group(0).replace(' ', '') + '\x00', s)
    s = ''.join(p if i % 2 else PWLIKE.sub('[redacted]', p) for i, p in enumerate(s.split('\x00')))
    s = EMAIL.sub('[email]', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0] + '…'


def ym(v, fallback=None):
    v = str(v or '').strip()
    if re.fullmatch(r'\d{12,14}', v):
        return datetime.fromtimestamp(int(v) / 1000, timezone.utc).strftime('%Y-%m')
    m = re.search(r'(20\d\d)-(\d\d)', v)
    if m:
        return m.group(1) + '-' + m.group(2)
    if fallback:
        try:
            return datetime.strptime(fallback, '%d %b, %Y').strftime('%Y-%m')
        except ValueError:
            pass
    return ''


def fis_status(r):
    s = (r.get('status') or '').lower()
    if 'pending' in s:
        return 'FIS · Pending analysis'
    if 'analys' in s or 'analyz' in s:
        return 'FIS · Analysed'
    return 'FIS · No status on page'


def built(e):
    v = [b.get('verdict') for b in e.get('builtOverlap') or []]
    return 'done' if 'Already built' in v else 'part' if 'Partially built' in v else 'none'


facts = {r['id']: r for r in load('requests/db/items.json')}
intel = load('intel/db/items.json')
items = []
for e in intel:
    r = facts[e['id']]
    rq = r.get('request') or {}
    rec = {
        'i': e['id'], 's': SRC[r['source']], 'k': r.get('key') or '', 'u': r.get('link'), 't': r['title'],
        'st': fis_status(r) if r['source'] == 'fis' else r.get('status') or '', 'tm': r.get('team') or '',
        'c': r.get('components') or [], 'pr': e['product'],
        'cu': [[c['name'], c.get('tier') or 0] for c in e['customers']], 'in': e.get('internal') or False,
        'd': ym(r.get('created'), r.get('updated') if r['source'] == 'fis' else None),
        'cm': r.get('commentCount') or 0, 'v': r.get('votes') or 0,
        'ep': (r.get('epic') or {}).get('key') or '', 'es': clip((r.get('epic') or {}).get('summary'), 80),
        'w': clip(e.get('what'), 420), 'y': clip(e.get('why'), 420), 'o': clip(e.get('outcome'), 420),
        'x': clip(rq.get('value') or r.get('description') or r.get('problemStatement'), 300),
        'bs': built(e), 'kd': e.get('requestKind') or '',
    }
    if r['source'] == 'fis':
        rec.update({'op': (r.get('scores') or {}).get('totalOpportunity'), 'fc': r.get('recommendedClassification') or '',
                    'ef': clip(r.get('estimatedEffort'), 40), 'ds': clip(r.get('decisionStatus'), 60), 'ev': clip(r.get('eventsImpacted'), 140)})
    items.append({k: v for k, v in rec.items() if v not in ('', [], None, False, 0) or k in ('s', 'cu')})

clusters = []
for c in load('intel/db/clusters.json'):
    bo = c.get('builtOverlap')
    clusters.append({'id': c['id'], 'name': c['name'], 'product': c['product'],
                     'what': clip(c.get('what'), 700), 'why': clip(c.get('why'), 700), 'outcome': clip(c.get('outcome'), 700),
                     'bo': clip(bo if isinstance(bo, str) else json.dumps(bo, ensure_ascii=False), 600),
                     'also': c.get('alsoIn') or [],
                     'm': [{k: v for k, v in {'i': m['id'], 'r': m['role'], 'no': clip(m.get('note'), 150)}.items() if v} for m in c['members']]})

kbp = load('ledger/data/stories/pa/kb_products.json')['products']
DOMAIN = {p: v['domain'] for p, v in kbp.items()}
DOMAIN['Unassigned / Cross-cutting'] = 'Cross-cutting'
DOMAIN = {p: d for p, d in DOMAIN.items() if p in {c['product'] for c in clusters}}


def js(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


page = open(os.path.join(HERE, 'app.html')).read()
app = open(os.path.join(HERE, 'app.js')).read()
for a, b in (('/*__ITEMS__*/[]', js(items)), ('/*__CLUSTERS__*/[]', js(clusters)), ('/*__PRODUCTS__*/{}', js(DOMAIN)), ('/*__APP__*/', app)):
    assert a in page, a
    page = page.replace(a, b, 1)
assert not re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', page), 'an email address survived redaction'
assert not re.search(r'(?i)[?&](invitationId|access_token|signature|share_key)=', page), 'a link token survived'
for leak in ('Qwerty1@', 'Tes@123!', 'Test@123', '1Y#Zv%Opb0'):                     # known test credentials (QA 27 Sep 2026)
    assert leak not in page, 'a known credential survived redaction: ' + leak[:3] + '…'
texts = [r.get(k, '') for r in items for k in ('t', 'w', 'y', 'o', 'x', 'es', 'ds', 'ev')] + \
        [c.get(k, '') for c in clusters for k in ('what', 'why', 'outcome', 'bo')] + [m.get('no', '') for c in clusters for m in c['m']]
left = [m.group(0) for t in texts for m in PWLIKE.finditer(URL.sub(' ', t))]
assert not left, f'{len(left)} password-shaped tokens left in the data'
open(os.path.join(HERE, 'index.html'), 'w').write(page)
print(len(items), 'tickets,', len(clusters), 'needs,', round(len(page) / 1e6, 2), 'MB')
