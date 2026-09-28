import json,sys
a=json.load(open('/Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash/data/roadmap/wwo/input/g6.json'))
b=json.load(open('/Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash/data/roadmap/wwo/g6_w/wwo.json'))
s,e=int(sys.argv[1]),int(sys.argv[2]); D=int(sys.argv[3]) if len(sys.argv)>3 else 500
for i in range(s,min(e,len(a))):
    r=a[i]; w=b[i]
    print(f"=== [{i}] {r['id']} | {r.get('theme')} {r.get('q')} {r.get('kind','')} {r.get('level','')}")
    print("T:",r.get('title')); print("B:",r.get('benefit')); print("D:",r.get('detail'))
    assert w['id']==r['id']
    for k in ['what','why','outcome','who','basis','evidence']: print(f"  {k}: {w.get(k)}")
    for st in r['stories']:
        print(f" - {st.get('k')} {st.get('summary')} [{st.get('jiraStatus','')}]")
        for k in ['wwo_a','wwo_b','confluence','ai']:
            v=st.get(k)
            if v and (not isinstance(v,dict) or any(v.values())): print(f"    {k}: {json.dumps(v,ensure_ascii=False)[:700]}")
        for k in ['whoFor','value']:
            v=st.get(k)
            if v and 'null, \"value\": null, \"keyAccount\": null' not in str(v): print(f"    {k}: {str(v)[:300]}")
        if st.get('desc'): print("    desc:",st['desc'][:D].replace('\n',' '))
