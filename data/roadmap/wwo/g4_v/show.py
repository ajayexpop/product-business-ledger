import json,sys
B='/Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash/data/roadmap/wwo/'
d=json.load(open(B+'input/g4.json'));w=json.load(open(B+'g4_w/wwo.json'))
a,b=int(sys.argv[1]),int(sys.argv[2]);L=int(sys.argv[3]) if len(sys.argv)>3 else 600
for i in range(a,min(b,len(d))):
    r=d[i];c=w[i]
    print(f"\n######## {i} {r['id']} (copy id {c['id']}) theme={r.get('theme')} q={r.get('q')} kind={r.get('kind')} level={r.get('level')}")
    for k in ('title','benefit','detail'): print(f"  {k.upper()}: {r.get(k)}")
    for k in ('what','why','outcome','who','basis','evidence'): print(f"  >{k}: {c.get(k)}")
    for s in r['stories']:
        print(f"  -- {s.get('key')} [{s.get('jiraStatus','')}] {s.get('summary')}")
        for k,v in s.items():
            if k in('key','summary','jiraStatus') or not v: continue
            t=json.dumps(v,ensure_ascii=False) if not isinstance(v,str) else v
            print(f"     {k}: {t[:L]}")
