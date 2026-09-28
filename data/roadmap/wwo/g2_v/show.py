import json,sys
a=json.load(open('wwo/input/g2.json'));b=json.load(open('wwo/g2_w/wwo.json'))
s,e=int(sys.argv[1]),int(sys.argv[2])
for i in range(s,min(e,len(a))):
    r=a[i];w=b[i]
    print('=====',i,r['id'],'|',w['id'],r.get('kind'),r.get('q'),r.get('level'))
    for k in ('title','benefit','detail'): print(k.upper()+':',r.get(k))
    for k in ('what','why','outcome','who','basis','evidence'): print(' >'+k+':',w.get(k))
    for st in r['stories']:
        print('  --',st.get('summary'))
        for k in ('wwo_a','wwo_b','confluence','ai','whoFor','value','jiraStatus'):
            if st.get(k): print('    '+k+':',json.dumps(st[k],ensure_ascii=False)[:450])
        if st.get('desc'): print('    desc:',st['desc'][:450])
