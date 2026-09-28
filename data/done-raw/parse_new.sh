#!/bin/sh
# parse every saved getJiraIssue tool result of this session that carries a changelog, then list remaining keys for w3+w5
cd /Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash
T=/Users/admin/.claude/projects/-Users-admin-orca-workspaces-Crossteamdash-CrossTeamDash/da292648-b87f-4dac-92be-712786453f36/tool-results
python3 - "$T" <<'PY'
import sys,glob,os,json
sys.path.insert(0,'tools'); import done_stories as d
done=set(open('data/done-raw/parsed.txt').read().split()) if os.path.exists('data/done-raw/parsed.txt') else set()
n=0
for p in sorted(glob.glob(sys.argv[1]+'/mcp-claude_ai_Atlassian-getJiraIssue-*.txt')+glob.glob(sys.argv[1]+'/toolu_*.txt')):
    if p in done: continue
    try:
        node=json.load(open(p))['issues']['nodes'][0]
        if 'changelog' in node: d.parse_changelog(p); n+=1
    except Exception as e: print('ERR',p,e)
    done.add(p)
open('data/done-raw/parsed.txt','w').write('\n'.join(sorted(done)))
left=[k for w in ('w3','w5') for k in open('data/done-raw/work/%s/keys.txt'%w).read().split() if not os.path.exists('data/done-raw/changelog/%s.json'%k)]
print('parsed',n,'| w3+w5 left',len(left)); print(' '.join(left[:16]))
PY
