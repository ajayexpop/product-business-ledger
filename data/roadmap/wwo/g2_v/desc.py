import json,sys
a=json.load(open('wwo/input/g2.json'))
i=int(sys.argv[1]); j=int(sys.argv[2]) if len(sys.argv)>2 else None
for n,st in enumerate(a[i]['stories']):
    if j is None or n==j: print('--',n,st['summary']); print(st.get('desc','')[800:1600])
