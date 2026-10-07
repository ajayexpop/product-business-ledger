#!/usr/bin/env python3
"""Pack the owner-only How it works data into rewire/data/admin.json.

Reads, never writes:
  rewire/data/live-db/files/logic.json   the live ledger's rules file (Artifact read, path logic.json)
  rewire/data/live-db/{sync,refresh,refresh-req,pipeline,config}/   read-only export of the live ledger's database
  ../ledger/src/markup.html              the Method & sources panel text

Visits, activity and feedback are private in the ledger and are not read.
"""
import json, glob, os, re, html
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIVE = os.path.join(ROOT, 'data', 'live-db')
LEDGER = os.path.join(os.path.dirname(ROOT), 'ledger')

def load(p):
    d = json.load(open(p, encoding='utf-8'))
    return d.get('data', d) if isinstance(d, dict) and 'data' in d and len(d) <= 3 else d

SOURCES = [
    ('ep', 'Jira EP: bugs and stories', 'Bugs, delivery, client health flags', 4,
     'Tickets updated since the last pull, at least every 4 hours, by whoever has the ledger open. A done story is only re-read if Jira shows it changed.'),
    ('imp', 'Jira IMP: incidents', 'Incidents, client health', 4,
     'Incidents updated since the last pull. Status, priority and summary replace the built ones; a new incident joins its client by Pipedrive id.'),
    ('op', 'Jira OP: event dates', 'Timeline, next show, Client 360', 24,
     'Event tickets updated since the last pull. New dates, statuses and shows replace the built ones; test tickets are dropped.'),
    ('hv', 'Jira HV: Hyve dedicated team', 'Hyve bugs and delivery', 24,
     'Hyve project stories and bugs updated since the last pull.'),
    ('planhat', 'Planhat: tier, health and owners', 'Tiers and owners (health no longer read in the preview)', 24,
     'Every Active company, matched by Pipedrive id. Pulled from your view of the ledger only.'),
    ('workbook', 'Customer and event workbook (Drive)', 'Pipedrive ids, the join key', 168,
     'A modified-time check. A change queues a full re-read for Claude.'),
]

class MethodParser(HTMLParser):
    """Collect each .card in the Method panel as {title, blocks:[{t:'p'|'li'|'note', text}], links:[[text, href]]}."""
    def __init__(self):
        super().__init__(); self.cards = []; self.depth = 0; self.card = None; self.cur = None; self.buf = []; self.link = None; self.skip = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); cls = a.get('class', '') or ''
        if tag in ('table', 'thead', 'tbody'): self.skip += 1
        if tag == 'div' and 'card' in cls.split():
            self.card = {'title': '', 'blocks': [], 'links': []}; self.cards.append(self.card)
        if not self.card or self.skip: return
        if tag == 'h3': self.cur = 'h3'; self.buf = []
        elif tag in ('p', 'li') or (tag == 'div' and ({'note', 'callout'} & set(cls.split()))):
            self.cur = 'note' if tag == 'div' else tag; self.buf = []
        elif tag == 'div' and 'factor' in cls.split(): self.cur = 'p'; self.buf = []
        elif tag == 'a': self.link = [a.get('href', ''), []]
        elif tag == 'br' and self.cur: self.buf.append(' ')
    def handle_endtag(self, tag):
        if tag in ('table', 'thead', 'tbody'): self.skip = max(0, self.skip - 1)
        if not self.card or self.skip: return
        if tag == 'a' and self.link:
            txt = ''.join(self.link[1]).strip()
            if txt and self.link[0].startswith('http'): self.card['links'].append([txt, self.link[0]])
            self.link = None
        if self.cur and ((tag == 'h3' and self.cur == 'h3') or (tag in ('p', 'li') and self.cur == tag) or (tag == 'div' and self.cur in ('note', 'p'))):
            text = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
            if text:
                if self.cur == 'h3':
                    if not self.card['title']: self.card['title'] = text
                    else: self.card['blocks'].append({'t': 'h', 'text': text})
                else: self.card['blocks'].append({'t': self.cur, 'text': text})
            self.cur = None; self.buf = []
    def handle_data(self, data):
        if self.skip: return
        if self.cur: self.buf.append(data)
        if self.link is not None: self.link[1].append(data)

def method_cards():
    mk = open(os.path.join(LEDGER, 'src', 'markup.html'), encoding='utf-8').read()
    m = re.search(r'<section class="panel" id="panel-method".*?</section>', mk, re.S)
    if not m: return []
    p = MethodParser(); p.feed(m.group(0))
    return [c for c in p.cards if c['title']]

def main():
    logic = load(os.path.join(LIVE, 'files', 'logic.json'))
    rules = [{k: r.get(k) for k in ('id', 'group', 'name', 'kind', 'type', 'value', 'unit', 'min', 'max', 'why', 'source', 'drives', 'ref') if r.get(k) not in (None, '')}
             for r in logic.get('rules', [])]

    sources = []
    sync = load(os.path.join(LIVE, 'sync', 'state.json'))
    for sid, name, feeds, target, rule in SOURCES:
        if sid == 'ep':
            doc = sync
            runs = [{'at': r.get('at'), 'by': r.get('by'), 'seen': r.get('seen'), 'changed': (r.get('bugsNew', 0) + r.get('bugsClosed', 0) + r.get('storiesNew', 0) + r.get('storiesShipped', 0)),
                     'detail': f"{r.get('bugsNew', 0)} new bugs, {r.get('bugsClosed', 0)} closed, {r.get('storiesShipped', 0)} stories shipped, {r.get('storiesNew', 0)} new", 'manual': bool(r.get('manual'))}
                    for r in doc.get('runs', [])]
        else:
            p = os.path.join(LIVE, 'refresh', sid + '.json')
            doc = load(p) if os.path.exists(p) else {}
            runs = [{'at': r.get('at'), 'by': r.get('by'), 'seen': r.get('seen'), 'changed': r.get('changed'), 'detail': '', 'manual': bool(r.get('manual'))} for r in doc.get('runs', [])]
        sources.append({'id': sid, 'name': name, 'feeds': feeds, 'target': target, 'rule': rule,
                        'lastRun': doc.get('lastRun'), 'lastBy': doc.get('lastBy'), 'note': doc.get('note') or '', 'runs': runs[-20:]})

    requests = []
    for f in glob.glob(os.path.join(LIVE, 'refresh-req', '*.json')):
        d = load(f)
        requests.append({'src': d.get('src'), 'name': d.get('name'), 'at': d.get('at'), 'by': d.get('by'), 'status': d.get('status'), 'why': d.get('why') or '', 'doneAt': d.get('doneAt')})

    history = []
    for f in glob.glob(os.path.join(LIVE, 'pipeline', '*.json')):
        d = load(f); v = d.get('v') or {}
        feat = v.get('feature') or os.path.basename(f)[:-5]
        for h in (d.get('h') or {}).values():
            history.append({'at': h.get('at'), 'by': h.get('by'), 'src': 'must-have', 'kind': h.get('k'), 'what': feat, 'field': h.get('f') or '',
                            'from': str(h.get('from') or '')[:240], 'to': str(h.get('to') or '')[:240], 'note': h.get('note') or '', 'item': v.get('key') or 'mh-' + os.path.basename(f)[:-5]})
    cfg = load(os.path.join(LIVE, 'config', 'pipeline.json'))
    for h in (cfg.get('h') or {}).values():
        history.append({'at': h.get('at'), 'by': h.get('by'), 'src': 'columns', 'kind': h.get('op') or h.get('k'), 'what': 'Must-have columns', 'field': '', 'from': '', 'to': '', 'note': h.get('note') or ''})
    for l in logic.get('log', []):
        history.append({'at': l.get('at'), 'by': l.get('by'), 'src': 'rules', 'kind': 'version ' + str(l.get('v')), 'what': 'Rules', 'field': '', 'from': '', 'to': '',
                        'note': l.get('note') or '', 'changes': [{'name': c.get('name'), 'kind': c.get('kind')} for c in (l.get('changes') or [])][:12]})
    for s in sources:
        for r in s['runs']:
            history.append({'at': r['at'], 'by': r['by'], 'src': 'pull', 'kind': 'manual pull' if r['manual'] else 'scheduled pull', 'what': s['name'], 'field': '', 'from': '', 'to': '',
                            'note': f"{r.get('seen') or 0} checked, {r.get('changed') or 0} changed" + (f" ({r['detail']})" if r['detail'] else '')})
    for q in requests:
        history.append({'at': q['at'], 'by': q['by'], 'src': 'pull request', 'kind': q['status'], 'what': q['name'], 'field': '', 'from': '', 'to': '', 'note': q['why']})
    history = [h for h in history if h.get('at')]
    history.sort(key=lambda h: str(h['at']), reverse=True)

    out = {'packed': __import__('datetime').date.today().isoformat(), 'logicVersion': logic.get('version'), 'logicUpdated': logic.get('updated'),
           'rules': rules, 'rulesLog': logic.get('log', []), 'method': method_cards(), 'sources': sources, 'requests': requests, 'history': history,
           'syncEvery': sync.get('everyHours'), 'syncBaseline': sync.get('baseline')}
    dst = os.path.join(ROOT, 'data', 'admin.json')
    json.dump(out, open(dst, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    print(f"wrote {dst} {os.path.getsize(dst)/1024:.0f} KB | rules {len(rules)} | method cards {len(out['method'])} | sources {len(sources)} | history {len(history)}")

if __name__ == '__main__':
    main()
