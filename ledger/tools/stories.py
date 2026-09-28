#!/usr/bin/env python3
"""Story cache: merge agent pulls into one cache, and plan the delta for the next run.

  python3 tools/stories.py merge            data/stories/pull/*/page-*.json + data/stories/epics/* -> data/stories/cache/
  python3 tools/stories.py plan KEYS.json    KEYS.json = [{"k","updated","summary"}...] from a metadata-only scope pull;
                                             prints what the next run must fetch (new, changed, left scope)
  python3 tools/stories.py check            reconciliation checks over the cache

Cache layout (data/stories/cache/):
  stories.json  {key: record}   record shape: data/stories/SPEC.md; inherited AI text is folded in from data/ledger.json
  epics.json    {key: record}   EP epics and every level above them (hierarchyLevel >= 1)
  state.json    {scopeJql, lastRunAt, counts}

Delta rule: a story is re-read when Jira's `updated` is newer than the cached `updated`. Its `ai` block is regenerated
only when the summary or the description length changed (descChars), or when the story is new; otherwise the
existing text is kept. A story no longer returned by the scope query is marked `leftScope` with the date, never deleted."""
import glob, html, json, os, sys
from datetime import datetime, timezone

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
C = J('data', 'stories', 'cache')
SCOPE = 'project = EP AND issuetype = Story AND created >= "2026-01-01" AND status != Rejected'
BATCHES = {'janfeb': ('2026-01-01', '2026-03-01'), 'mar': ('2026-03-01', '2026-04-01'), 'apr': ('2026-04-01', '2026-05-01'),
           'mayjun': ('2026-05-01', '2026-07-01'), 'julsep': ('2026-07-01', '2099-01-01')}   # created-date range per pull batch
AI_KEYS = ('s', 'pr', 'wy', 'oc', 'lens', 'pa', 'cf', 'rg', 'bv', 'im')

def load(p, default=None):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default
def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(o, open(p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False, sort_keys=True)
def now(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def shift(d, n):
    from datetime import date, timedelta
    return (date.fromisoformat(d) + timedelta(days=n)).isoformat()

def unesc(o):
    """Jira summaries sometimes arrive HTML-escaped (&amp;); the page escapes on render, so store plain text."""
    if isinstance(o, dict):
        for k, v in o.items(): o[k] = html.unescape(v) if isinstance(v, str) else unesc(v)
    elif isinstance(o, list): return [html.unescape(v) if isinstance(v, str) else unesc(v) for v in o]
    return o

def merge():
    ledger = {s['k']: s for s in load(J('data', 'ledger.json'))['stories']}
    stories = load(J(C, 'stories.json'), {})
    seen, dup = set(), []
    wrong = []
    for p in sorted(glob.glob(J('data', 'stories', 'pull', '*', 'page-*.json'))):
        batch = os.path.basename(os.path.dirname(p))
        if batch not in BATCHES: continue          # *_w working folders are not output
        lo, hi = BATCHES[batch]
        for r in load(p):
            # Jira filters `created` in the pulling user's time zone, so a story can sit a day either side of its batch
            if not (shift(lo, -1) <= r['created'][:10] < shift(hi, 1)): wrong.append((batch, r['k'])); continue
            unesc(r)
            if r['k'] in seen: dup.append(r['k'])
            seen.add(r['k'])
            if r.get('aiSource') == 'inherited' or r['k'] in ledger:
                s = ledger.get(r['k'])
                if s: r['ai'] = {k: s[k] for k in AI_KEYS}; r['aiSource'] = 'inherited'
            prev = stories.get(r['k'])
            if prev and not r.get('ai') and prev.get('ai'):
                r['ai'], r['aiSource'] = prev['ai'], prev.get('aiSource')
            r.pop('leftScope', None)
            stories[r['k']] = r
    epics = load(J(C, 'epics.json'), {})
    for p in sorted(glob.glob(J('data', 'stories', 'epics', 'page-*.json'))) + [J('data', 'stories', 'epics', 'above.json'), J('data', 'stories', 'epics', 'foreign.json')]:
        for r in load(p, []): unesc(r); epics[r['k']] = r
    # page stories that have left the scope (rejected, or no longer a Story): kept, marked, with their epic
    ls = load(J('data', 'stories', 'pull', 'left_scope.json'), {'stories': {}})
    for k, v in ls['stories'].items():
        s = ledger.get(k); e = epics.get(v['epic']) if v.get('epic') else None
        base = stories.get(k) or {'k': k, 'link': 'https://expoplatform.atlassian.net/browse/' + k, 'summary': None,
                                  'ai': {x: s[x] for x in AI_KEYS} if s else None, 'aiSource': 'inherited' if s else None}
        base.update({'leftScope': {'at': ls['checkedAt'], 'reason': v['reason'], 'type': v['type']}, 'updated': v['updated'],
                     'epic': {'k': e['k'], 'summary': e['summary'], 'status': e['status'], 'statusCategory': e['statusCategory']} if e else None})
        stories[k] = base
    dump(J(C, 'stories.json'), stories); dump(J(C, 'epics.json'), epics)
    st = load(J(C, 'state.json'), {})
    st.update({'scopeJql': SCOPE, 'lastRunAt': now(),
               'counts': {'stories': len(stories), 'inherited': sum(1 for r in stories.values() if r.get('aiSource') == 'inherited'),
                          'generated': sum(1 for r in stories.values() if r.get('aiSource') == 'generated'),
                          'noAi': sum(1 for r in stories.values() if not r.get('ai')),
                          'withEpic': sum(1 for r in stories.values() if r.get('epic')), 'epics': len(epics)}})
    dump(J(C, 'state.json'), st)
    print(json.dumps(st['counts']), 'duplicates across pages:', dup or 'none', '| outside their batch range:', wrong or 'none')

def plan(keys_path):
    stories = load(J(C, 'stories.json'), {})
    cur = {r['k']: r for r in load(keys_path)}
    new = sorted(k for k in cur if k not in stories)
    changed = sorted(k for k in cur if k in stories and cur[k]['updated'] > stories[k]['updated'])
    text = sorted(k for k in changed if cur[k].get('summary') not in (None, stories[k].get('summary')))
    gone = sorted(k for k in stories if k not in cur and not stories[k].get('leftScope'))
    out = {'new': new, 'changed': changed, 'summaryChanged': text, 'leftScope': gone,
           'fetchDescriptions': sorted(set(new) | set(text)),
           'note': 'Re-read metadata for new+changed; fetch descriptions for fetchDescriptions, plus any changed story whose descChars differs; regenerate ai only for those.'}
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in out.items()}))
    dump(J(C, 'delta-plan.json'), out)

def check():
    stories, epics = load(J(C, 'stories.json'), {}), load(J(C, 'epics.json'), {})
    ledger = {s['k'] for s in load(J('data', 'ledger.json'))['stories']}
    live = {k: r for k, r in stories.items() if not r.get('leftScope')}
    fails = []
    def chk(name, ok, detail=''):
        print(('PASS ' if ok else 'FAIL ') + name + (': ' + detail if detail else '')); ok or fails.append(name)
    chk('every story has ai text', all(r.get('ai') for r in live.values()), str(sum(1 for r in live.values() if not r.get('ai'))) + ' without')
    miss = sorted(ledger - set(stories))
    chk('every page story is in the cache', not miss, f'{len(miss)} missing {miss[:5]}' if miss else f'{len(ledger)} of {len(ledger)}')
    bad = [r['k'] for r in live.values() if r.get('ai') and any(k not in r['ai'] for k in AI_KEYS)]
    chk('ai blocks complete', not bad, f'{len(bad)} incomplete {bad[:5]}')
    orphan = sorted({r['epic']['k'] for r in live.values() if r.get('epic')} - set(epics))
    chk('every story epic is in epics.json', not orphan, f'{len(orphan)} missing {orphan[:5]}')
    up = sorted({e['parent']['k'] for e in epics.values() if e.get('parent')} - set(epics))
    chk('every epic parent is in epics.json', not up, f'{len(up)} missing {up[:5]}')
    print(f'{len(live)} stories in scope, {sum(1 for r in live.values() if r.get("epic"))} with an epic, {len(epics)} epics and above')
    return not fails

if __name__ == '__main__':
    a = sys.argv[1:] or ['check']
    {'merge': lambda: merge(), 'plan': lambda: plan(a[1]), 'check': lambda: sys.exit(0 if check() else 1)}[a[0]]()
