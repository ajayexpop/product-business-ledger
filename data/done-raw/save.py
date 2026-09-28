import json,sys,os,glob
# usage: save.py <tool-result-file>  -> copies to next page-NN.json, prints count + nextPageToken
src=sys.argv[1]; d=json.load(open(src)); iss=d['issues']
here=os.path.dirname(os.path.abspath(__file__))
n=len(glob.glob(os.path.join(here,'page-*.json')))+1
out=os.path.join(here,'page-%02d.json'%n)
json.dump(iss['nodes'],open(out,'w'))
pi=iss.get('pageInfo',{})
print(out, len(iss['nodes']), iss['nodes'][0]['key'], iss['nodes'][-1]['key'], 'next:', pi.get('hasNextPage'))
open(os.path.join(here,'next.txt'),'w').write(pi.get('endCursor') or '')
