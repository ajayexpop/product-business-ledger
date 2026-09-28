#!/usr/bin/env python3
"""save_page.py <dir> <n> <tool-result-file>: copy one JQL page into requests/raw/<dir>/page-NN.json, print cursor."""
import json, sys, os, shutil
d, n, src = sys.argv[1], int(sys.argv[2]), sys.argv[3]
o = json.load(open(src))
nodes = o['issues']['nodes']
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw', d, 'page-%02d.json' % n)
json.dump(o, open(dst, 'w'), ensure_ascii=False)
tr = sum(1 for i in nodes if (i['fields'].get('comment') or {}).get('total', 0) > len((i['fields'].get('comment') or {}).get('comments', [])))
print(d, n, 'issues', len(nodes), nodes[0]['key'], '->', nodes[-1]['key'], 'commentsTruncated', tr)
print('NEXT', o['issues'].get('pageInfo', {}).get('endCursor') if o['issues'].get('pageInfo', {}).get('hasNextPage') else None)
