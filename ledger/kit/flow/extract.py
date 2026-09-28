#!/usr/bin/env python3
"""Compact a saved getJiraIssue(expand=changelog) response into one flow/raw/<KEY>.json record.
usage: extract.py <saved-result-file> [...]"""
import json, sys, os
from datetime import datetime, timezone

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw')
os.makedirs(OUT, exist_ok=True)

def iso_utc(s):
    if not s:
        return None, None
    d = datetime.strptime(s, '%Y-%m-%dT%H:%M:%S.%f%z')
    ms = int(d.timestamp() * 1000)
    return d.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')[:-4] + 'Z', ms

def compact(node):
    f = node['fields']
    cl = node.get('changelog') or {}
    trans = []
    for h in cl.get('histories', []):
        at, ms = iso_utc(h['created'])
        for it in h.get('items', []):
            if it.get('field') == 'status':
                trans.append({'at': at, 'ms': ms, 'from': it.get('fromString'), 'to': it.get('toString'),
                              'by': (h.get('author') or {}).get('displayName')})
    trans.sort(key=lambda t: t['ms'])
    created, created_ms = iso_utc(f.get('created'))
    resolved, resolved_ms = iso_utc(f.get('resolutiondate'))
    team = f.get('customfield_10001')
    st = f.get('status') or {}
    it = f.get('issuetype') or {}
    rep = f.get('customfield_10145') or []
    rec = {
        'key': node['key'], 'summary': f.get('summary'),
        'type': it.get('name'), 'level': it.get('hierarchyLevel'),
        'status': st.get('name'), 'statusCategory': (st.get('statusCategory') or {}).get('key'),
        'created': created, 'createdMs': created_ms, 'resolved': resolved, 'resolvedMs': resolved_ms,
        'priority': (f.get('priority') or {}).get('name'),
        'team': team.get('name') if isinstance(team, dict) else None,
        'labels': f.get('labels') or [],
        'reportedBy': [r.get('value') for r in rep if isinstance(r, dict)],
        'parent': (f.get('parent') or {}).get('key'),
        'subtasks': [{'key': s['key'], 'type': s['fields']['issuetype']['name'], 'status': s['fields']['status']['name'],
                      'cat': s['fields']['status']['statusCategory']['key']} for s in (f.get('subtasks') or [])],
        'changelogTotal': cl.get('total'), 'changelogReturned': len(cl.get('histories', [])), 'changelogStartAt': cl.get('startAt'),
        'transitions': trans,
    }
    # integrity: the status chain must be continuous and end on the current status
    issues = []
    for a, b in zip(trans, trans[1:]):
        if (a['to'] or '').lower() != (b['from'] or '').lower():
            issues.append(f"chain break {a['to']} -> {b['from']} at {b['at']}")
    if trans and (trans[-1]['to'] or '').lower() != (rec['status'] or '').lower():
        issues.append(f"last transition {trans[-1]['to']} != current {rec['status']}")
    if (cl.get('total') or 0) > len(cl.get('histories', [])):
        issues.append(f"changelog truncated: {len(cl.get('histories', []))} of {cl.get('total')}")
    rec['integrity'] = issues
    return rec

if __name__ == '__main__':
    for p in sys.argv[1:]:
        d = json.load(open(p))
        for node in d['issues']['nodes']:
            r = compact(node)
            json.dump(r, open(os.path.join(OUT, r['key'] + '.json'), 'w'), indent=1)
            print(r['key'], r['type'], r['status'], 'team=' + str(r['team']), 'transitions=%d' % len(r['transitions']),
                  'defects=%d' % sum(1 for s in r['subtasks'] if s['type'] == 'Defect'), ('INTEGRITY: ' + '; '.join(r['integrity'])) if r['integrity'] else 'ok')
