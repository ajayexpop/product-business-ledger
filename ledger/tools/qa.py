#!/usr/bin/env python3
"""Click-through QA for the built ledger page, run before every publish.

  python3 tools/qa.py [dist]      default dist; QA_WIDTH=1100 for a laptop-width run

Builds <dir>/qa_run.html = the page (qa.html) + a stand-in claude.ai runtime + tools/qa_probe.js, serves the folder,
runs it in headless Chrome and prints the report: JavaScript errors, escaped HTML shown as text, overflow, overlapping
or clipped grid cells, chart labels that collide or fall outside the chart, and clicks that changed nothing.

The stand-in runtime is seeded from the database snapshot in live/db (else the newest in backup/) (requests, column config, Jira refresh),
plus one feature-ledger item, so every tab has real data. Nothing is written anywhere but the test page.
Exit code 1 when there are errors or issues."""
import glob, http.server, json, os, re, socketserver, subprocess, sys, threading, functools

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

def seed():
    snaps = [J('live', 'db')] if os.path.isdir(J('live', 'db')) else sorted(glob.glob(J('backup', '*', 'live-db')))
    store = {}
    if snaps:
        root = snaps[-1]
        for f in glob.glob(os.path.join(root, '**', '*.json'), recursive=True):
            store[os.path.relpath(f, root)[:-5].replace(os.sep, '/')] = json.load(open(f))
    store['ledger/LE-2026-0001'] = {'id': 'LE-2026-0001', 'status': 'signed', 'loggedBy': 'u_test0000000000000000000', 'loggedAt': '2026-09-24T10:00:00Z',
        'raisedBy': {'id': 'u_test0000000000000000000'}, 'raisingLayer': 'sales', 'source': {'kind': 'intake-form'},
        'v': {'title': 'Offline badge scanning for lead retrieval', 'client': '81808', 'productArea': 'Mobile App', 'lever': 'increase-revenue', 'figureGBP': '100000',
              'figureComputedGBP': 100000, 'funded': {'yes': True, 'contributionGBP': '15000', 'agreedEstimateDays': '20'}, 'existingGrowing': {'yes': False},
              'customers': [{'client': '81808'}], 'whoFor': ['Exhibitor'], 'figureDetail': {}, 'related': ['EP-23544']},
        'signer': {'who': 'Chris', 'role': 'Funding approver', 'rule': 'fs-funded-approver'}, 'fundingApprover': {'who': 'Chris'}, 'signature': {'by': 'Chris'},
        'completeness': {'score': 55, 'missing': ['Risks']}, 'intakeCheck': {'glossary': 'pass', 'problemClarity': 'pass'}}
    # feedback: one note from a colleague (only Ajay may see it) and one from the QA viewer with a reply from Ajay
    ch, me = 'u_chris00000000000000000000', 'u_test0000000000000000000'
    store['feedback/' + ch] = {'by': ch, 'last': '2026-09-28T09:00:00Z', 'n': 1}
    store['feedback/' + ch + '/items/fqa1'] = {'mood': 'sad', 'text': 'QA-PRIVATE: the timeline zoom resets when I switch tabs', 'weight': 'important', 'where': {'tab': 'timeline', 'pop': ''}, 'at': '2026-09-28T09:00:00Z', 'by': ch}
    store['feedback/' + me] = {'by': me, 'last': '2026-09-27T09:00:00Z', 'n': 1}
    store['feedback/' + me + '/items/fqa0'] = {'mood': 'want', 'text': 'A weekly email digest of my clients', 'weight': 'nice', 'where': {'tab': 'overview', 'pop': ''}, 'at': '2026-09-27T09:00:00Z', 'by': me}
    store['feedback/' + me + '/replies/fqa0'] = {'status': 'planned', 'theme': 'Digests', 'msgs': [{'text': 'Thanks, this is planned.', 'at': '2026-09-28T08:00:00Z'}], 'at': '2026-09-28T08:00:00Z', 'by': me}
    store['activity/' + ch] = {'by': ch, 'last': '2026-09-28T09:00:00Z'}
    store['activity/' + ch + '/months/2026-09'] = {'by': ch, 'first': '2026-09-28T08:58:00Z', 'last': '2026-09-28T09:00:00Z', 'ev': {'eqa1': {'k': 'signin', 'x': '', 'at': '2026-09-28T08:58:00Z', 's': 'qa'}, 'eqa2': {'k': 'tab', 'x': 'timeline', 'at': '2026-09-28T09:00:00Z', 's': 'qa'}}}
    store['ledger-events/LE-2026-0001'] = {'e': {'e1': {'at': '2026-09-24T10:00:00Z', 'by': 'u_test0000000000000000000', 'k': 'log', 'from': 'draft', 'to': 'submitted'}}}
    return store

MOCK = r'''<script>
(function(){ const store=%s, subs=[];
 const ME='u_test0000000000000000000', OWN=()=>window.__QA_AS!=='other';
 const hid=p=>{ const s=p.split('/'); return (s[0]==='feedback'||s[0]==='activity')&&!OWN()&&s[1]!==ME; };
 const snap=p=>({exists:(p in store)&&!hid(p),data:()=>JSON.parse(JSON.stringify(store[p]||{})),id:p.split('/').pop()});
 const notify=()=>subs.forEach(s=>s());
 const merge=(a,b)=>{for(const k in b){ if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object') merge(a[k],b[k]); else a[k]=JSON.parse(JSON.stringify(b[k])); } return a;};
 const db={doc:p=>({id:p.split('/').pop(),path:p,get:async()=>snap(p),set:async d=>{if(hid(p)) throw {code:'invalid_argument'}; store[p]=JSON.parse(JSON.stringify(d));setTimeout(notify,0)},
   update:async d=>{if(!(p in store)) throw {code:'invalid_argument'}; merge(store[p],d);setTimeout(notify,0)},delete:async()=>{ if(hid(p)) throw {code:'invalid_argument'}; delete store[p]; setTimeout(notify,0); },acquire:async()=>({acquired:true}),
   onSnapshot:n=>{const f=()=>n(snap(p));subs.push(f);setTimeout(f,0);return()=>{}}}),
  collection:c=>{ const q=()=>({docs:Object.keys(store).filter(k=>k.split('/').length===c.split('/').length+1&&k.startsWith(c+'/')&&!hid(k)).map(k=>({id:k.split('/').pop(),data:()=>JSON.parse(JSON.stringify(store[k]))}))});
    return {get:async()=>q(),onSnapshot:n=>{const f=()=>n(q());subs.push(f);setTimeout(f,0);return()=>{}}}; }};
 window.__QA_STORE=store;
 window.__QA_AS='%s'; const user={me:async()=>({id:'u_test0000000000000000000',name:'QA Tester',avatarUrl:'',color:'#333',email:null,canEdit:true}),isOwner:async()=>window.__QA_AS!=='other',canEdit:async()=>true,can:async()=>true,id:async()=>'u_test0000000000000000000',
   profiles:async ids=>Object.fromEntries([].concat(ids).map(i=>[i,{id:i,name:'QA Tester'}])),search:async q=>[{id:'u_chris00000000000000000000',name:'Chris Sales'},{id:'u_susan00000000000000000000',name:'Susan Ops'}].filter(h=>!q||h.name.toLowerCase().includes(String(q).toLowerCase()))};
 const sample=Object.assign(async(p,o)=>{ let x='QA guide answer: open Requests and press + Log a new work item.';
   // Beta: stand-in answers in each prompt's JSON shape
   if(/JSON shape: \{"clients"/.test(p)) x=JSON.stringify({clients:[],what:{text:'Exhibitors want visitors to sort the marketplace so the newest products show first.',cites:[/\ns1 \[/.test(p)?'s1':'raw']},why:{text:'Visitors scroll the whole list today and miss new products.',cites:['guess']},outcome:{text:'',cites:[]}});
   else if(/Tidy this request/.test(p)) x=JSON.stringify({what:'Exhibitors want visitors to sort the marketplace so that the newest products show first.',why:'',outcome:'',title:'Sort the marketplace by newest',question:'Which parts of the platform: web, app or both?'});
   else if(/piece of work for the ledger/.test(p)) x=JSON.stringify({matches:[{id:'c1',pct:88,why:'The same sorting need as c1'}],verdict:'duplicate',draft:{what:{text:'Exhibitors want the marketplace sorted by newest first.',cites:['tam']},why:{text:'Visitors miss new products because they scroll the whole list.',cites:['c1']},outcome:{text:'',cites:[]},surfaces:{list:['Web frontend'],cites:['c1']}},questions:['Which platforms need it?'],lever:'increase revenue'});
   else if(/Return this JSON object exactly/.test(p)) x='{"ok": true}';
   if(o&&o.onText) o.onText({text:x,delta:x}); return {text:x,truncated:false}; },{json:async p=>{ const ids=[...p.matchAll(/"id":"(CL-[^"]+)"/g)].map(m=>m[1]); return {summary:'QA stand-in answer.',productArea:'',matches:ids.slice(0,2).map((id,i)=>({id,verdict:i?'related':'duplicate',reason:'QA'}))}; }});
 const imp321={key:'IMP-321',fields:{summary:'Busworld Plaza 2200 products got deactivated, could we please fix bug &amp; activate',status:{name:'Done'},priority:{name:'Urgent'},created:'2026-09-16T12:07:21.269+0100',updated:'2026-09-18T14:54:11.567+0100',customfield_12108:'42089',customfield_10145:[{value:'Kortrijk Xpo'}],customfield_10253:'Busworld Plaza'}};
 const ph=[{_id:'c1',name:'Mercator Media Limited',externalId:'5209',h:6,csmScore:4,sentimentScore:31,owner:'u1',updatedAt:'2026-09-28T03:15:07Z',custom:{'Sales Tier (Won TCV band)':2,'RM Score':5,'Incident Score':0,'Open Client Bug Weight':2,'Client Bug Score':40,'Health Factors Breakdown':'<p>Total: -1.2 of -7.5.</p><p>Last run 28 Sep.</p>'}},{_id:'c2',name:'Test New Client',externalId:'87831',h:6,owner:'u1',custom:{'Sales Tier (Won TCV band)':4}}];
 const mcp={callTool:async(s,tool,input)=>{
   if(s==='Fathom') return tool==='get_recording_by_url'?{payload:[{type:'text',text:'Resolved meeting:\n- title: QA call\n- date: 2026-09-29\n- recording_id: 42\n- url: https://fathom.video/calls/42'}]}
     :{payload:[{type:'text',text:'[00:00](https://fathom.video/calls/42?timestamp=0) Organiser: exhibitors want visitors to sort the marketplace so the newest products show first\n[00:12](https://fathom.video/calls/42?timestamp=12) Account manager: today visitors scroll the whole list and miss new products'}]};
   if(s==='Planhat') return {payload:input.MODEL==='User'?[{_id:'u1',firstName:'Barry',nickName:'Barry'}]:ph};
   if(s==='Google Drive') return {payload:tool==='get_file_metadata'?{id:input.fileId,title:'Customer & Event Data, August 2026.xlsx',modifiedTime:'2026-09-16T23:46:30.313Z',owner:'s.merola@expoplatform.com'}:{files:[]}};
   const q=String(input&&input.jql||''); return {payload:{issues:{nodes:/project = IMP/.test(q)?[imp321]:[],pageInfo:{hasNextPage:false}}}}; }};
 window.claude={use:async n=>n==='db'?db:n==='user'?user:n==='sample'?sample:n==='mcp'&&window.__QA_AS!=='nomcp'?mcp:null}; })();
</script>'''

def main():
    d = J(sys.argv[1] if len(sys.argv) > 1 else 'dist')
    RUN = 'qa_run_%d.html' % os.getpid()  # one file per run, so passes can run side by side
    page = open(os.path.join(d, 'qa.html'), encoding='utf-8').read()
    probe = open(J('tools', 'qa_probe.js'), encoding='utf-8').read()
    run = page.replace('<body>', '<body>' + MOCK % (json.dumps(seed()), os.environ.get('QA_AS','ajay')) + '<script>' + probe + '</script>', 1)
    open(os.path.join(d, RUN), 'w', encoding='utf-8').write(run)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=d)
    handler.log_message = lambda *a: None
    with socketserver.TCPServer(('127.0.0.1', 0), handler) as srv:
        port = srv.server_address[1]
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        # headless Chrome very rarely hangs on start-up (about 1 run in 20); give it 7 minutes (a full run takes about 4) and retry once
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--window-size=' + os.environ.get('QA_WIDTH', '1440') + ',1000', '--virtual-time-budget=400000',
               '--dump-dom', f'http://127.0.0.1:{port}/'+RUN]
        for attempt in (1, 2):
            try:
                out = subprocess.run(cmd, capture_output=True, text=True, timeout=420).stdout; break
            except subprocess.TimeoutExpired:
                print('Chrome did not finish in 7 minutes' + ('; retrying once' if attempt == 1 else ''))
                out = ''
        srv.shutdown()
    os.remove(os.path.join(d, RUN))
    m = re.search(r'<pre id="__qa">(\{.*?)</pre>', out, re.S)  # the report is JSON; the probe's own comment names the tag too
    if not m:
        print('QA did not finish (no report in the page).'); sys.exit(2)
    import html
    R = json.loads(html.unescape(m.group(1)))
    print(f"steps checked {R['steps']} · clicks that changed something {R['clicks']['ok']} · clicks that changed nothing {len(R['clicks']['none'])}")
    print(f"errors {len(R['errors'])} · issues {len(R['issues'])}")
    for e in R['errors'][:40]: print('  ERROR', e['step'], '—', e['msg'])
    kinds = {}
    for i in R['issues']: kinds.setdefault(i['kind'], []).append(i)
    for k, lst in kinds.items():
        print(f'  {k}: {len(lst)}')
        for i in lst[:12]: print('    ', i.get('step', '')[:60], '|', i.get('el', ''), '|', i.get('text', '') or (str(i.get('a', '')) + ' ⟂ ' + str(i.get('b', ''))) if i.get('a') else i.get('by', ''))
    for c in R['clicks']['none'][:40]: print('  NO EFFECT', c)
    for n in R['notes']: print('  NOTE', n)
    json.dump(R, open(os.path.join(d, 'qa_report_%s_%s.json' % (os.environ.get('QA_AS', 'ajay'), os.environ.get('QA_WIDTH', '1440'))), 'w'), indent=1)
    sys.exit(1 if R['errors'] or R['issues'] else 0)

if __name__ == '__main__':
    main()
