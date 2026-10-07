#!/usr/bin/env python3
"""Refresh the must-have ledger (database collection `pipeline`) from its Confluence page and Jira.

  python3 tools/pipeline_pull.py <page.json> <jira.json> [<jira-spent.json>] --date 2026-09-28

<page.json>   the getConfluencePage result in HTML (contentFormat "html"), page 2155872263
<jira.json>   searchJiraIssuesUsingJql over every key on the page, fields summary, status, issuetype, priority, assignee,
              duedate, timeoriginalestimate, aggregatetimeoriginalestimate, resolutiondate, customfield_10001
<jira-spent>  the same keys with the field aggregatetimespent (Logged = aggregate time spent / 8 h)

Reads live/db/pipeline, writes live/db/pipeline-pull/<doc>.json (the documents to write, whole) and prints a report.
Rules: rows are matched by Jira key, else by feature text; key, month, status, area, priority, owner and estimate follow the
page; prose (feature, why it matters, impact, dependencies, notes) is only filled where the ledger has none, because the
first import condensed the page's wording and the ledger is edited from the page since; every change carries an `h` entry by
"claude" with k "import" in one batch `b`; the owner's wording is kept in `raw` wherever it is normalised (pp-normalise);
Driver is pre-filled only where the row names a client (pp-driver-prefill); Jira columns go into `j` only (no history).
Nothing is deleted: an item that left the page is reported, not removed."""
import html, json, os, re, sys, glob

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
MONTHS = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}
CANON = [('open', 'Planned'), ('backlog', 'Planned'), ('ready to start', 'Planned'), ('to do', 'Planned'), ('planned', 'Planned'), ('discovery', 'Discovery'),
         ('investigation', 'Discovery'), ('in progress', 'In Progress'), ('in testing', 'In Testing'), ('ready for release', 'Ready for Release'),
         ('ready for deploy', 'Ready for Release'), ('done', 'Done'), ('blocked', 'Blocked'), ('at risk', 'At Risk')]
AREA_FIX = {'session': 'Sessions', 'netwokring': 'Networking', 'lead intelligence': 'Lead Intelligence', 'search': 'Search'}
# Planhat clients a row can name (pp-driver-prefill): pattern -> (Pipedrive id, name)
CLIENTS = [(r'\bDLG\b', '81808', 'DLG Markets GmbH'), (r'\bIMEX\b', '26874', 'IMEX'), (r'\bFESPA\b', '44021', 'FESPA'),
           (r'\bACI\b', '58938', 'Airports Council International - ACI Asia-Pacific')]


def canon(s):
    t = str(s or '').lower().strip()
    for k, v in CANON:
        if t.startswith(k): return v
    for k, v in CANON:
        if k in t: return v
    return str(s or '').strip()


def month(s):
    """'October 2026' -> 2026-10; a range ('October-November 2026') -> its last month, the promise date; TBD -> ''."""
    t = str(s or '').lower()
    yr = re.findall(r'(20\d\d)', t); ms = [MONTHS[m[:3]] for m in re.findall(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*', t)]
    if not yr or not ms: return ''
    return f'{yr[-1]}-{ms[-1]:02d}'


def area(s):
    t = str(s or '').strip(); t = t.split('(')[0].strip() or t  # 'Communication Channels (Email, …)' -> the name before the brackets
    t = re.sub(r'[()*]', ' ', t).split('/')[0].strip()
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s*&.*$', '', t) if t.lower().startswith('sessions &') else t
    return AREA_FIX.get(t.lower(), t)


def days(t):
    """Estimate text -> person-days; mirrors ppDays in the page (pp-estimate-parse)."""
    if not t or not str(t).strip(): return {'days': None, 'daysKind': 'none'}
    s = str(t).lower()
    m = re.search(r'total:\s*([\d.]+)\s*person-days', s)
    if m: return {'days': float(m.group(1)), 'daysKind': 'point'}
    m = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*d\b', s)
    if m: return {'days': round((float(m.group(1)) + float(m.group(2))) / 2, 2), 'daysKind': 'range'}
    nums = [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*d\b', s)]
    if nums:
        partial = bool(re.search(r'pending|required|rough', s))
        return {'days': round(sum(nums), 2) if len(nums) > 1 else nums[0], 'daysKind': 'partial' if partial else 'point'}
    return {'days': None, 'daysKind': 'none'}


def num(x):
    return int(x) if isinstance(x, float) and x.is_integer() else x


def cell_text(c):
    c = re.sub(r'<br\s*/?>', '\n', c); c = re.sub(r'</(p|li)>\s*', '\n', c)
    t = html.unescape(re.sub(r'<[^>]+>', '', c))
    t = '\n'.join(re.sub(r'[ \t ]+', ' ', l).strip() for l in t.split('\n'))
    return re.sub(r'\n{2,}', '\n', t).strip()


def estimate_text(c):
    # the three-line Dev / QA / Total estimate reads as one sentence each, as the first import stored it
    t = cell_text(c).replace('\n', ' ')
    t = re.sub(r'\s*(QA:|Total:)', r'. \1', t) if 'Dev:' in t else t
    return re.sub(r'\s+', ' ', t).strip(' .') if t else ''


def same(a, b):
    k = lambda s: re.sub(r'[^a-z0-9]+', '', str(s or '').lower())
    return k(a) == k(b)


def page_rows(path):
    b = json.load(open(path))['content']['nodes'][0]['body']
    t = re.findall(r'<table.*?</table>', b, re.S)[0]
    out = []
    for r in re.findall(r'<tr.*?</tr>', t, re.S)[2:]:  # header and the example row
        cs = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S)
        if len(cs) < 11: continue
        key = (re.findall(r'\b(EP-\d+)\b', cs[3]) or [''])[0]
        feat = '' if key else cell_text(cs[3])
        out.append({'month': cell_text(cs[0]), 'area': cell_text(cs[1]), 'owner': cell_text(cs[2]), 'key': key, 'feature': feat,
                    'rationale': cell_text(cs[4]).replace('\n', ' '), 'impact': cell_text(cs[5]).replace('\n', ' '), 'priority': cell_text(cs[6]),
                    'deps': cell_text(cs[7]).replace('\n', ' '), 'status': cell_text(cs[8]).replace('\n', ' '), 'estimate': estimate_text(cs[9]),
                    'notes': cell_text(cs[10]).replace('\n', ' ')})
    return out


def jira(path, spent_path):
    js = {n['key']: n['fields'] for n in json.load(open(path))['issues']['nodes']}
    sp = {n['key']: n['fields'].get('aggregatetimespent') for n in json.load(open(spent_path))['issues']['nodes']} if spent_path else {}
    d = lambda s: None if s is None else num(round(s / 28800, 2))
    out = {}
    for k, f in js.items():
        st = (f.get('status') or {}).get('name')
        out[k] = {'aggOrigDays': d(f.get('aggregatetimeoriginalestimate')), 'assignee': (f.get('assignee') or {}).get('displayName'),
                  'canon': canon(st), 'due': f.get('duedate'), 'origDays': d(f.get('timeoriginalestimate')),
                  'priority': (f.get('priority') or {}).get('name'), 'resolved': (f.get('resolutiondate') or '')[:10] or None,
                  'spentDays': d(sp.get(k)) if k in sp else None, 'status': st, 'summary': f.get('summary'),
                  'team': (f.get('customfield_10001') or {}).get('name'), 'teamField': 'customfield_10001', 'type': (f.get('issuetype') or {}).get('name')}
    return out


def prefill(row):
    for fld in ('rationale', 'impact', 'notes'):
        txt = row.get(fld) or ''
        for pat, pd, nm in CLIENTS:
            if re.search(pat, txt):
                q = re.search(r'[^.]*' + pat + r'[^.]*\.?', txt).group(0).strip()
                label = {'rationale': 'Why it matters', 'impact': 'Impact', 'notes': 'Notes'}[fld]
                return {'at': DATE, 'basis': f'{label} names the client: "{q}"', 'by': 'Claude', 'field': label, 'name': nm, 'quote': q, 'value': pd}
    return None


DATE = '2026-09-28'


def main():
    global DATE
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    if '--date' in sys.argv: DATE = sys.argv[sys.argv.index('--date') + 1]; a = [x for x in a if x != DATE]
    rows = page_rows(a[0]); jj = jira(a[1], a[2] if len(a) > 2 else None)
    db = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(J('live', 'db', 'pipeline', '*.json'))}
    live = {i: d for i, d in db.items() if not (d.get('deleted') or {}).get('at')}
    by_key = {d['v'].get('key'): i for i, d in live.items() if d['v'].get('key')}
    by_feat = {re.sub(r'[^a-z0-9]', '', d['v'].get('feature', '').lower()): i for i, d in live.items()}
    b = 'b' + DATE.replace('-', '')[2:] + 'conf'; note = f'From the Must-Have Product Pipeline Ledger page in Confluence, as it stood on {DATE}.'
    out, report, seen, n_new = {}, [], set(), 0
    nxt = max(int(m.group(1)) for m in (re.match(r'p(\d+)$', i) for i in db) if m) + 1
    for pos, r in enumerate(rows):
        jr = jj.get(r['key'])
        feat = r['feature'] or (jr or {}).get('summary') or ''
        i = by_key.get(r['key']) if r['key'] else None
        if i is None:
            i = by_feat.get(re.sub(r'[^a-z0-9]', '', feat.lower()))
        # the Iyzico row had no key on 18 Sep: match it by its Jira summary
        if i is None and jr: i = by_feat.get(re.sub(r'[^a-z0-9]', '', (jr.get('summary') or '').lower()))
        want = {'month': month(r['month']), 'area': area(r['area']), 'owner': r['owner'], 'key': r['key'], 'feature': feat,
                'rationale': r['rationale'], 'impact': r['impact'], 'priority': r['priority'], 'deps': r['deps'],
                # the status follows Jira wherever there is a ticket (owner, 28 Sep 2026); the page's wording stays in raw
                'status': jr['canon'] if jr and jr.get('canon') else canon(r['status']),
                'estimate': r['estimate'], 'notes': r['notes']}
        raw = {'area': r['area'], 'month': r['month'], 'status': r['status']}
        if i is None:
            i = f'p{nxt:02d}'; nxt += 1; n_new += 1
            v = dict(want, driver='', team='', why='')
            doc = {'createdAt': DATE, 'h': {}, 'j': jr, 'migrated': {'at': DATE, 'schema': 2}, 'n': {k: num(x) for k, x in days(v['estimate']).items()},
                   'order': (pos + 1) * 10, 'raw': raw, 'source': 'confluence-2155872263', 'updatedAt': DATE, 'v': v}
            doc['h']['h' + b + 'add'] = {'at': DATE, 'b': b, 'by': 'claude', 'k': 'import', 'note': note}
            for f in ('month', 'area', 'status'):
                if raw[f] and raw[f] != v[f]:
                    doc['h'][f'h{b}-{f}'] = {'at': DATE, 'b': b, 'by': 'claude', 'f': f, 'from': raw[f], 'k': 'import', 'to': v[f],
                                             'note': 'normalised so the ledger can be totalled (pp-normalise)' + (' ; a range counts at its last month, the promise date' if f == 'month' and '-' in raw[f] else '')}
            pf = prefill(r)
            if pf:
                v['driver'] = pf['value']; doc['prefill'] = {'driver': pf}
                doc['h'][f'h{b}-driver'] = {'at': DATE, 'b': b, 'by': 'claude', 'f': 'driver', 'from': '', 'k': 'import', 'to': pf['value'], 'note': 'pre-filled: ' + pf['basis'] + ' (pp-driver-prefill)'}
            out[i] = doc; report.append(f'NEW  {i} {r["key"] or "(no ticket)"} {feat[:60]} · {v["month"] or "no month"} · {v["status"]}' + (f' · driver {pf["name"]}' if pf else ''))
        else:
            d = json.loads(json.dumps(db[i])); v = d['v']; ch = []
            for f, x in want.items():
                cur = v.get(f, '')
                if f in ('month', 'status', 'area', 'key', 'priority', 'owner', 'estimate'):
                    if not x or x == cur or (f == 'estimate' and same(cur, x)): continue
                # prose: the first import condensed the page's wording, so prose is only filled where it was empty,
                # and never with a copy of another field (EP-57237's Notes repeat its Impact word for word)
                elif cur or not x or any(same(x, want[o]) for o in want if o != f): continue
                ch.append((f, cur, x)); v[f] = x
            for f, (fr, to) in [(f, (cur, x)) for f, cur, x in ch]:
                d['h'][f'h{b}-{f}'] = {'at': DATE, 'b': b, 'by': 'claude', 'f': f, 'from': fr, 'k': 'import', 'to': to, 'note': note}
            if any(f == 'estimate' for f, _, _ in ch): d['n'] = {k: num(x) for k, x in days(v['estimate']).items()}
            if raw != d.get('raw'): d['raw'] = raw
            if not v.get('driver'):
                pf = prefill(r)
                if pf:
                    v['driver'] = pf['value']; d['prefill'] = {'driver': pf}
                    d['h'][f'h{b}-driver'] = {'at': DATE, 'b': b, 'by': 'claude', 'f': 'driver', 'from': '', 'k': 'import', 'to': pf['value'], 'note': 'pre-filled: ' + pf['basis'] + ' (pp-driver-prefill)'}
                    ch.append(('driver', '', pf['value']))
            d['order'] = (pos + 1) * 10
            if jr: d['j'] = jr
            if ch: d['updatedAt'] = DATE
            if d != db[i]: out[i] = d
            report.append(f'{"EDIT" if ch else "same"} {i} {r["key"]} ' + '; '.join(f'{f}: {str(a_)[:40]!r} → {str(b_)[:40]!r}' for f, a_, b_ in ch))
        seen.add(i)
    gone = [i for i in live if i not in seen]
    od = J('live', 'db', 'pipeline-pull'); os.makedirs(od, exist_ok=True)
    for f in glob.glob(os.path.join(od, '*.json')): os.remove(f)
    for i, d in out.items(): json.dump(d, open(os.path.join(od, i + '.json'), 'w'), indent=1, ensure_ascii=False)
    print('\n'.join(report))
    print(f'\n{len(rows)} rows on the page · {n_new} new · {sum(1 for x in report if x.startswith("EDIT"))} changed · {len(out)} documents to write · left the page: {gone or "none"}')


if __name__ == '__main__':
    main()
