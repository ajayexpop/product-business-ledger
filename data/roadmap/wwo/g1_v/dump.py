import json,sys
a=json.load(open('input/g1.json'));b=json.load(open('g1_w/wwo.json'))
s,e=int(sys.argv[1]),int(sys.argv[2])
for i in range(s,min(e,len(a))):
    r=a[i];w=b[i]
    print('='*20,i,r['id'],'|',r.get('theme'),r.get('q'),r.get('kind'),r.get('level'))
    for k in ['title','benefit','detail']:
        if r.get(k): print(k.upper()+':',r[k])
    for k in ['what','why','outcome','who','basis','evidence']:
        print('  W.'+k+':',w.get(k))
    for st in r['stories']:
        print('  --',st.get('k',''),st.get('summary'),'|',st.get('jiraStatus',''))
        for k in ['wwo_a','wwo_b','confluence','ai']:
            if st.get(k): print('    '+k+':',json.dumps(st[k],ensure_ascii=False)[:700])
        for k in ['whoFor','value']:
            if st.get(k): print('    '+k+':',str(st[k])[:400])
        if st.get('desc'): print('    desc:',st['desc'][:1100])
