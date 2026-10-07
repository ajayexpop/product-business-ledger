#!/usr/bin/env python3
"""Click-through check of the Ledger Rewire Preview in headless Chrome.

  python3 rewire/tools/probe.py <staged dir> [width]

Serves the staged folder (index.html + data.json + img/), injects a probe that visits every tab, role,
view and drawer kind, and reports script errors, text showing undefined/NaN, clicks that changed nothing,
and anything wider than the viewport. Exit 1 on any error or issue."""
import sys, os, json, re, html, subprocess, threading, functools, http.server, socketserver

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
# a stand-in viewer: the owner, with the user capability (names resolve to a placeholder); sample stays absent
MOCK = r'''<script>(function(){const OWNER=window.__OWNER=!/other/.test(location.search);window.__DB={};const DB=window.__DB,subs=[];
const clone=x=>JSON.parse(JSON.stringify(x));const snapOf=p=>({id:p.split('/').pop(),exists:p in DB,data:()=>p in DB?clone(DB[p]):undefined,metadata:{}});
const notify=()=>subs.forEach(f=>f());
const docRef=p=>({id:p.split('/').pop(),path:p,get:async()=>snapOf(p),set:async d=>{DB[p]=clone(d);setTimeout(notify,0)},update:async d=>{if(!(p in DB))throw{code:'invalid_argument'};Object.assign(DB[p],clone(d));setTimeout(notify,0)},delete:async()=>{delete DB[p];setTimeout(notify,0)},onSnapshot:n=>{const f=()=>n(snapOf(p));subs.push(f);setTimeout(f,0);return()=>{}},collection:s=>coll(p+'/'+s)});
const coll=c=>{const q={path:c,get:async()=>{const docs=Object.keys(DB).filter(k=>k.startsWith(c+'/')&&k.split('/').length===c.split('/').length+1).map(snapOf);return{docs,size:docs.length,empty:!docs.length,docChanges:()=>docs.map(d=>({type:'added',doc:d})),metadata:{}}},
 onSnapshot:n=>{let prev=new Set();const f=async()=>{const s=await q.get();const cur=new Set(s.docs.map(d=>d.id));const ch=s.docs.map(d=>({type:'modified',doc:d}));prev.forEach(id=>{if(!cur.has(id))ch.push({type:'removed',doc:{id}})});prev=cur;s.docChanges=()=>ch;n(s)};subs.push(f);setTimeout(f,0);return()=>{}},
 where:()=>q,orderBy:()=>q,limit:()=>q,doc:id=>docRef(c+'/'+(id||('d'+Math.random().toString(36).slice(2,10)))),add:async d=>{const r=q.doc();await r.set(d);return r}};return q};
const user={isOwner:async()=>OWNER,canEdit:async()=>OWNER,can:async()=>true,id:async()=>OWNER?'u_admin0000000000000000000':'u_tam000000000000000000000',profiles:async ids=>Object.fromEntries([].concat(ids).map(i=>[i,{name:'Test Person'}])),search:async q=>[{id:'u_chris0000000000000000000',name:'Chris Sales'}].filter(x=>!q||x.name.toLowerCase().includes(String(q).toLowerCase()))};
const AIM=(location.search.match(/ai=(\w+)/)||[])[1]||'on';window.__AICALLS=[];
const sample=async(prompt,opts)=>{window.__AICALLS.push(prompt.slice(0,60));await new Promise(r=>setTimeout(r,150));
 if(AIM==='deny')throw{code:'not_granted',message:'declined'};
 let out;
 if(/\{"ok": true\}/.test(prompt))out='{"ok": true}';
 else if(/From the source below/.test(prompt)){if(AIM==='bad')out='Sure! Here is what the client wants: they want sorting.';else{const raw=(prompt.split('(cite it as "raw"):\n')[1]||'').split('\n\nJSON shape')[0];const first=raw.split(/[.\n]/)[0].replace(/^.*?\d{1,2}:\d{2}:?\s*/,'').trim();
   out=JSON.stringify({clients:/imex/i.test(raw)?['IMEX']:[],what:{text:first+'.',cites:['raw']},why:{text:'They lose time today because the list is not ordered.',cites:['guess']},outcome:{text:'',cites:[]}});}}
 else if(/Tidy this feature request/.test(prompt)){const body=prompt.split('THE TEXT TO TIDY')[1]||prompt;const g=k=>((body.match(new RegExp('\n'+k+': (.*)'))||[])[1]||'').replace('(not given)','');out=JSON.stringify({what:g('what').replace(/^./,c=>c.toUpperCase()).replace(/\.?$/,'.'),why:g('why')?g('why').replace(/\.?$/,'.'):'',outcome:'',title:'Sort marketplace listings',question:'Is this needed in the mobile app too?'});}
 else if(/piece of work for analysis/.test(prompt)){out='```json\n'+JSON.stringify({matches:[{id:'c1',pct:88,why:'Same ask as c1.'},{id:'c2',pct:40,why:'Related.'}],verdict:'extends',draft:{what:{text:'Let exhibitors sort marketplace listings by newest and most viewed.',cites:['tam','c1']},why:{text:'Visitors miss new products during the show.',cites:['guess']},outcome:{text:'Newest and most viewed products show first.',cites:['c1']},surfaces:{list:['web front end'],cites:['c1']}},questions:['Should it match c2 on mobile (c1, c2)?'],lever:'retain revenue'})+'\n```';}
 else out='{}';
 if(opts&&opts.onText)opts.onText({text:out,delta:out});return{text:out,truncated:false,modelTierApplied:(opts&&opts.modelTier)||'default'}};
window.claude={use:async n=>n==='user'?user:n==='db'?{doc:docRef,collection:coll}:n==='sample'&&AIM!=='off'?sample:null};})();</script>'''
PROBE = r'''<script>
(async()=>{const R={errors:[],issues:[],steps:0,notes:[]};window.__AIMODE=(location.search.match(/ai=(\w+)/)||[])[1]||'on';let cur='load';
addEventListener('error',e=>R.errors.push(cur+': '+e.message+' @'+e.lineno));
addEventListener('unhandledrejection',e=>R.errors.push(cur+': rejection '+(e.reason&&e.reason.message||e.reason)+' | '+String(e.reason&&e.reason.stack||'').split('\n').slice(0,4).join(' / ')));
const W=ms=>new Promise(r=>setTimeout(r,ms)),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
function check(label){cur=label;R.steps++;
 const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while((n=tw.nextNode())){if(/\bundefined\b|\bNaN\b|\[object Object\]/.test(n.nodeValue)){const el=n.parentElement;if(el&&vis(el)&&!el.closest('script,style'))R.issues.push(label+': bad value «'+n.nodeValue.trim().slice(0,60)+'»');}}
 if(document.documentElement.scrollWidth>innerWidth+1)R.issues.push(label+': page scrolls sideways by '+(document.documentElement.scrollWidth-innerWidth)+'px');
 $$('.stat,.row,.mhc,.card,.step').forEach(el=>{if(!vis(el))return;const cs=getComputedStyle(el);if(cs.overflowX==='visible'&&el.scrollWidth>el.clientWidth+3&&!el.querySelector('.twrap,.board'))R.issues.push(label+': overflow in '+el.className.split(' ')[0]+' «'+(el.innerText||'').trim().slice(0,40)+'» by '+(el.scrollWidth-el.clientWidth));});
}
async function click(sel,label,opts){const els=$$(sel).filter(vis);if(!els.length){if(!(opts&&opts.optional))R.issues.push(label+': nothing to click ('+sel+')');return false;}
 const el=els[(opts&&opts.i)||0];const before=document.body.innerHTML.length+'|'+location.hash+'|'+$('#overlay').hidden;el.click();await W(120);
 const after=document.body.innerHTML.length+'|'+location.hash+'|'+$('#overlay').hidden;if(before===after&&!(opts&&opts.nochange))R.issues.push(label+': click changed nothing');check(label);return true;}
const pickClient=async(id,name)=>{const i=$('#'+id+'-in');if(!i){R.issues.push('picker '+id+' missing');return;}i.focus();i.value=name;i.dispatchEvent(new Event('input',{bubbles:true}));await W(80);const o=document.querySelector('#'+id+'-list .cp-opt');if(o){o.click();await W(80);}else R.issues.push('picker '+id+': no option for '+name);};
const close=async()=>{if(!$('#overlay').hidden){$('[data-close]').click();await W(60);}};
await W(1500);if(document.querySelector('[data-ob="later"]')){document.querySelector('[data-ob="later"]').click();await W(100);}check('home');
for(const r of ['ops','engineering','product','sales','leadership']){await click('[data-role="'+r+'"]','role '+r,{nochange:r==='ops'});
 for(let i=0;i<4;i++){await click('.band .stat','role '+r+' stat '+i,{i});await close();await click('.tab[data-tab="home"]','back home',{nochange:true});await click('[data-role="'+r+'"]','role '+r,{nochange:true});}
 await click('.card .row, .card .hbar','role '+r+' first row',{optional:true});await close();}
await click('.tab[data-tab="clients"]','clients');
await click('[data-csort="health"]','sort health');await click('#expert','expert on');
await click('tbody tr','client 360');await click('.strip button','360 month',{i:8});await click('[data-open^="client:"]','month to 360');
await click('.drawer [data-go^="bugs-client"]','360 bugs stat',{optional:true});
await click('.tab[data-tab="clients"]','clients again',{nochange:true});
await click('[data-cview="timeline"]','timeline');await click('.tl-cell','timeline cell',{i:8});await close();
await click('.tab[data-tab="work"]','work');
await click('.step','ladder logged',{i:0});await click('.step','ladder building',{i:3});await click('.mhc','must-have card');await close();
await click('[data-wview="built"]','built view');await click('[data-bmonth]','built month',{i:6});await click('.card .row[data-open^="item:"]','story drawer');await close();
if(window.__OWNER){await click('[data-wview="asks"]','asks view');void('DBG2 own='+OWN.is+' col='+TEST.asColleague+' tab='+S.tab+' view='+S.work.view+' drop='+!!$('[data-drop]')+' share='+!!$('[data-share]')+' main='+(($('#main')||{}).innerText||'').slice(0,200).replace(/\s+/g,' '));await click('[data-drop]','drop drawer');
if(!$('[data-dnav="next"][disabled]')||!$('.miss'))R.issues.push('step 1: continue should be disabled with a reason before filling');
await pickClient('drc','imex');
const w=$('#dr-what');if(w){w.value='Exhibitors want to sort marketplace listings by newest and most viewed';w.dispatchEvent(new Event('input',{bubbles:true}));}
await W(500);check('step 1 filled');if($('[data-dnav="next"][disabled]'))R.issues.push('step 1: continue still disabled after filling');
const fu=$('#dr-furl');if(fu){fu.value='https://fathom.video/share/abc';await click('#dr-fetch','fetch call without connector');if(!$('#dr-fbox .note-act'))R.issues.push('fathom: no message without the connection');}
await click('[data-dnav="next"]','to step 2');
for(let t=0;t<30&&!document.querySelector('.kchip.k-b,.kchip.k-p');t++)await W(200);await W(200);check('step 2');
const rows=$$('#dr-matches .mrow');if(!rows.length)R.issues.push('step 2: no matches');R.notes.push('HEAD: '+(($('#dr-head')||{}).innerText||'').replace(/\s+/g,' ').slice(0,220));
if(!$('[data-dnav="next"][disabled]'))R.issues.push('step 2: continue should wait for a choice');
await click('#dr-matches [data-link]','link a match');if(!$('[data-decide="builds"][aria-pressed="true"]'))R.issues.push('step 2: linking should choose "builds"');
await click('#dr-matches .mtitle','open a match');await click('[data-back]','back to the ask');if(!$('#dr-decide'))R.issues.push('step 2: lost after going back');
R.notes.push('FOOT2: '+(($('#dr-foot')||{}).innerText||'').replace(/\s+/g,' '));
await click('[data-dnav="next"]','to step 3');check('step 3');if(!$('#dr-dwhat')||$('#dr-dwhat').value.length<8)R.issues.push('step 3: draft not carried over');
if(window.__AIMODE!=='off'){await click('#dr-ai','draft with AI');for(let t=0;t<20&&!$('#sg-why .sg,#sg-why .t-cap');t++)await W(150);
  if(window.__AIMODE==='deny'){if(!/permission/i.test(($('#dr-aiwrap')||{}).innerText||''))R.issues.push('draft: no permission message when AI declined');}else if(!$('#sg-why .sg'))R.issues.push('draft: no why suggestion after AI'); await click('[data-accept="why"]','use the why suggestion',{optional:true});
  if(/\bc\d\b/.test(($('#dr-aiwrap')||{}).innerText||''))R.issues.push('draft: candidate ids leaked into the text');
  R.notes.push('DRAFT: '+(($('#dr-aiwrap')||{}).innerText||'').replace(/\s+/g,' ').slice(0,200));}
const why=$('#dr-dwhy');if(why&&why.value.length<8){why.value='Visitors cannot find new products quickly';why.dispatchEvent(new Event('input',{bubbles:true}));await W(300);}
await click('[data-dnav="next"]','to step 4');check('step 4');if(!$('#dr-summary'))R.issues.push('step 4: no summary');
const sq=$('#dr-sq');if(sq){sq.value='Chris';sq.dispatchEvent(new Event('input',{bubbles:true}));await W(500);await click('[data-sales]','pick a colleague',{optional:true});}
R.notes.push('FOOT4: '+(($('#dr-foot')||{}).innerText||'').replace(/\s+/g,' '));
await click('[data-dnav="next"]','send');await W(400);if($('.tchoice')){await click('[data-dnav="next"]','send after tidy');await W(300);}check('done');if(!document.querySelector('.done-hero'))R.issues.push('send: no confirmation');
await click('[data-go-asks]','see it in asks');await W(400);if(!$$('.row').some(r=>/Logged/.test(r.innerText)))R.issues.push('asks in flow: ask missing');
 await click('.card .row[data-open^="ask:"]','ask: open');await W(300);if(!(drawerKey||'').startsWith('ask:'))R.issues.push('ask: drawer did not open');
 if(!$$('#drawer .row').some(r=>/Unlink/.test(r.innerText)))R.issues.push('ask: linked items not shown');
 await click('[data-ak="edit"]','ask: edit');{const w=$('#ak-why');if(w){w.value='Visitors miss new products on busy show days.';}}await click('[data-ak="save"]','ask: save');await W(300);
 if(!/Changed why/i.test(($('#drawer')||{}).innerText||''))R.issues.push('ask: edit not in history');
 {const inp=document.querySelector('[data-lv="increase|amount"]');if(inp){inp.value='120000';inp.dispatchEvent(new Event('change',{bubbles:true}));await W(200);}else R.issues.push('ask: no value levers');}
 {const inp=document.querySelector('[data-lv="reduce|hours"]');if(inp){inp.value='200';inp.dispatchEvent(new Event('change',{bubbles:true}));await W(200);}}
 if(!/£130,000/.test(($('#drawer')||{}).innerText||''))R.issues.push('ask: value total not £130,000 (120,000 + 200h x £50)');
 await click('[data-ak="sign"]','ask: sign');await W(300);if(!/Signed by/.test(($('#drawer')||{}).innerText||''))R.issues.push('ask: not signed');
 await click('[data-akstep="Shipped"]','ask: move to shipped');await W(300);
 await click('[data-ak="closechain"]','ask: close the chain');await W(300);if(!/Closed by/.test(($('#drawer')||{}).innerText||''))R.issues.push('ask: chain not closed');
 {const q=$('#ak-q');if(q){q.value='sort marketplace';q.dispatchEvent(new Event('input',{bubbles:true}));await W(600);}}
 const nLinks=$$('#drawer [data-akunlink]').length;await click('[data-aklink]','ask: link one more');await W(300);if($$('#drawer [data-akunlink]').length!==nLinks+1)R.issues.push('ask: link did not add');
 await click('[data-akunlink]','ask: unlink one');await W(300);if($$('#drawer [data-akunlink]').length!==nLinks)R.issues.push('ask: unlink did not remove');
 R.notes.push('ASK HISTORY: '+$$('#drawer .dr-sec').map(s=>s.innerText).find(t=>/^HISTORY/i.test(t)||/History/.test(t.split('\n')[0]))?.replace(/\s+/g,' ').slice(0,300));
 await click('#drawer .row .mtitle[data-open^="need:"]','ask: open a linked request',{optional:true});await W(300);if((drawerKey||'').startsWith('need:')&&!/In the pipeline/i.test(($('#drawer')||{}).innerText||''))R.issues.push('request: no In the pipeline section');
 await click('[data-back]','back to the ask',{optional:true});await W(200);
 await click('[data-ak="del"]','ask: delete');await click('[data-ak="delyes"]','ask: delete yes');await W(400);if((drawerKey||'').startsWith('ask:'))R.issues.push('ask: still open after delete');
 await click('[data-speak]','speak help',{optional:true});
await click('[data-drop]','drop again');if(($('#dr-what')||{}).value)R.issues.push('drop again: form not reset');}

await close();
await click('.tab[data-tab="demand"]','demand');await click('[data-dprod]','demand product');await click('#d-t1','demand t1');await click('.card .row[data-open^="need:"]','need drawer');await click('.drawer [data-open^="client:"]','need to client',{optional:true});await close();
await click('.tab[data-tab="quality"]','quality');await click('[data-bugs]','team filter');await click('.track i[data-bugs]','segment filter');await click('tbody tr','bug drawer');await close();
await click('[data-qview="incidents"]','incidents');await click('[data-incclient]','incident client');
await click('[data-qview="pressure"]','pressure');await click('[data-win="60"]','pressure 60');await click('.card .row','pressure row');await close();
if(window.__OWNER){await W(400);
 await click('#share-fab','share: open');if(!$('#sh-go[disabled]')||!$('#sh-foot .miss'))R.issues.push('share: button should be disabled with a reason');
 await pickClient('shc','imex');await pickClient('shc','dlg');if($$('[data-cp="shc"] .cchip').length!==2)R.issues.push('share: two clients not tagged');
 await click('[data-speak="sh-raw"]','speak instead');if(!$('#speak-sh-raw')||$('#speak-sh-raw').hidden)R.issues.push('speak: no help shown');
 {const r=$('#sh-raw');r.value='Exhibitors want to sort marketplace listings by newest and most viewed';r.dispatchEvent(new Event('input',{bubbles:true}));}
 await click('#sh-fillgo','fill it in');for(let t=0;t<25&&!(($('#sh-what')||{}).value);t++)await W(200);
 R.notes.push('FILL('+window.__AIMODE+'): what='+(($('#sh-what')||{}).value||'')+' | why='+(($('#sh-why')||{}).value||'')+' | msg='+(($('#sh-fill')||{}).innerText||'').replace(/\s+/g,' ').slice(0,160));
 if(window.__AIMODE==='on'){if(!$('#shs-why .sg.guess'))R.issues.push('share: why guess not offered');await click('[data-shuse="why"]','use the why guess',{optional:true});}
 if(window.__AIMODE==='deny'&&!/permission/i.test(($('#sh-fill')||{}).innerText||''))R.issues.push('share: no permission message when AI declined');
 for(let t=0;t<30&&!document.querySelector('.pick');t++)await W(200);check('share: filled');
 if(!($('#sh-what')||{}).value)R.issues.push('share: what not filled from the text');
 await click('[data-shpick^="a:"]','share: pick a match');if(!/Add my client/.test(($('#sh-go')||{}).textContent||''))R.issues.push('share: button label should say add my client');
 await click('#sh-go','share: submit');await W(400);if($('.tchoice')){R.notes.push('TIDY: '+(($('#sh-tidy')||{}).innerText||'').replace(/\s+/g,' ').slice(0,160));await click('#sh-go','share: submit after tidy');await W(400);}check('share: done');
 {const m=Object.entries(window.__DB).find(([k])=>/\/mentions\//.test(k));if(m&&(!m[1].clients||m[1].clients.length!==2))R.issues.push('share: mention does not carry both clients');}if(!$('.done-hero'))R.issues.push('share: no confirmation');
 R.notes.push('SHARE DONE: '+(($('.done-hero')||{}).innerText||'').replace(/\s+/g,' ').slice(0,240));
 if(!Object.keys(window.__DB).some(k=>/\/mentions\//.test(k)))R.issues.push('share: nothing saved');
 await click('.drawer [data-open^="need:"]','share: see the request');R.notes.push('DBG db='+Object.keys(window.__DB).length+' mentions='+STORE.mentions.length+' users='+Object.keys(USERDATA).join(',')+' me='+STORE.me+' drawer='+drawerKey+' n='+((IX.needById.get((drawerKey||'').slice(5))||{}).mentions||[]).length);await W(300);if(!/Shared on this page/i.test(($('#drawer')||{}).innerText||''))R.issues.push('share: request does not show the new mention');
 await close();await click('.tab[data-tab="demand"]','voices: requests tab');
 {const cnt=s=>+((($(`[data-voices="${s}"]`)||{}).textContent||'').replace(/\D+/g,'')||0);const allN=cnt('all'),mineN=cnt('mine');if(!allN||!mineN)R.issues.push('voices: counts missing (everyone '+allN+', mine '+mineN+')');
 await click('[data-voices="mine"]','voices: mine filter',{nochange:true});if(($('[data-voices="mine"]')||{}).getAttribute('aria-pressed')!=='true')R.issues.push('voices: mine not pressed');
 await click('#main .row[data-open^="voice:"]','voices: open one');if(!/^voice:/.test(drawerKey||''))R.issues.push('voices: drawer did not open');
 await click('[data-ve="edit"]','voices: edit');const wy=$('#ve-why');if(!wy)R.issues.push('voices: no why box');else{wy.value='They lose track of sessions across days.';}
 const vq=$('#ve-q');if(vq){vq.value='calendar sync';vq.dispatchEvent(new Event('input',{bubbles:true}));await W(500);if(($('#ve-why')||{}).value!=='They lose track of sessions across days.')R.issues.push('voices: search wiped the why box');await click('[data-vemove]','voices: move here',{optional:true});}
 await click('[data-ve="save"]','voices: save');await W(300);if(!/lose track of sessions/.test(($('#drawer')||{}).innerText||''))R.issues.push('voices: saved why not shown');
 {const m=Object.entries(window.__DB).find(([k,v])=>/\/mentions\//.test(k)&&v&&v.edited);if(!m)R.issues.push('voices: edit not stored');}
 await click('[data-ve="del"]','voices: delete');await click('[data-ve="delno"]','voices: keep it');await click('[data-ve="del"]','voices: delete again');
 const nBefore=Object.keys(window.__DB).filter(k=>/\/mentions\//.test(k)).length;await click('[data-ve="delyes"]','voices: yes delete');await W(700);
 if(Object.keys(window.__DB).filter(k=>/\/mentions\//.test(k)).length!==nBefore-1)R.issues.push('voices: not deleted from the store');
 if(!$('#overlay').hidden)R.issues.push('voices: drawer stayed open after delete');
 if(cnt('all')!==allN-1)R.issues.push('voices: everyone count did not drop ('+cnt('all')+' vs '+allN+')');
 location.hash='voice-nobody~nothing';await W(300);check('voices: dead link');await close();}
 await click('.tab[data-tab="how"]','lab tab');await click('[data-hview="lab"]','lab view',{nochange:true});
 await click('[data-scenario="new"]','scenario: brand new');for(let t=0;t<25&&!(($('#sh-what')||{}).value);t++)await W(200);for(let t=0;t<20&&!$('[data-shpick="none"]');t++)await W(200);
 await click('[data-shpick="none"]','scenario: none of these');await click('#sh-go','scenario: submit');await W(400);if($('.tchoice')){await click('#sh-go','scenario: submit after tidy');await W(400);}if(!/new feature request/i.test(($('.done-hero')||{}).innerText||''))R.issues.push('scenario: not shared as new');
 await close();await click('.tab[data-tab="how"]','lab again',{nochange:true});await W(300);
 if(/Nothing new yet/.test(($('#main')||{}).innerText||'')||!$('#main [data-open^="need:r-"]'))R.issues.push('lab: new request missing from the unmatched queue');
 await click('[data-test-del="ask"]','lab: delete ask');await click('[data-test-del="yes"]','lab: delete yes');await W(600);
 if(Object.entries(window.__DB).some(([k,v])=>v&&v.test))R.issues.push('lab: test data not deleted');
 await click('[data-ai-check]','check the AI');await W(400);R.notes.push('AICHECK: '+(($('#main .teaser.ok, #main .note-act')||{}).innerText||'').slice(0,140));
 await click('[data-as-colleague]','view as colleague');if(!$('.tab[data-tab="how"]').hidden)R.issues.push('as colleague: admin tab still visible');await click('[data-as-admin]','back to admin');

 await click('.tab[data-tab="how"]','how tab',{nochange:true});await click('[data-hview="rules"]','rules view');await W(400);check('how rules');
 if(!document.querySelector('.rule'))R.issues.push('how: no rules listed');
 await click('.rule','rule drawer');await close();await click('[data-hkind]','live filter');
 await click('[data-hview="method"]','method');await click('[data-hview="sync"]','sync');
 if(!document.querySelector('.spark i'))R.issues.push('sync: no run history bars');
 await click('[data-hsync="history"]','history');await click('#h-more','history all',{optional:true});await click('button.hrow','history item',{optional:true});await close();
 await click('[data-theme-set="dark"]','theme dark');if(document.documentElement.dataset.theme!=='dark')R.issues.push('theme: dark not applied');
 await click('[data-theme-set="light"]','theme light');if(document.documentElement.dataset.theme!=='light')R.issues.push('theme: light not applied');
 await click('.tab[data-tab="home"]','home again');}
else { if(document.querySelector('.tab[data-tab="how"]')&&!document.querySelector('.tab[data-tab="how"]').hidden)R.issues.push('how tab visible to a non-owner');
 await click('.tab[data-tab="work"]','colleague: work');if($('[data-drop]'))R.issues.push('colleague: Add work is visible');if(!$('[data-share]'))R.issues.push('colleague: no share button on Work');
 location.hash='drop';await W(300);if(drawerKey!=='share')R.issues.push('colleague: #drop did not open sharing');await close();
 await click('#share-fab','colleague: share');await pickClient('shc','hinte');{const r=$('#sh-raw');r.value='Visitors want to save sessions to their phone calendar. Right now they copy them by hand. They would stop missing talks.';r.dispatchEvent(new Event('input',{bubbles:true}));}
 await click('#sh-fillgo','colleague: fill');for(let t=0;t<25&&!(($('#sh-what')||{}).value);t++)await W(200);if(!($('#sh-what')||{}).value)R.issues.push('colleague: what not filled');
 for(let t=0;t<20&&!$('[data-shpick="none"]');t++)await W(200);await click('[data-shpick="none"]','colleague: new');await click('#sh-go','colleague: submit');await W(400);if($('.tchoice')){await click('#sh-go','colleague: submit after tidy');await W(400);}
 if(!$('.done-hero'))R.issues.push('colleague: share did not finish');R.notes.push('COLLEAGUE: '+(($('.done-hero')||{}).innerText||'').replace(/\s+/g,' ').slice(0,160));await close();
 await click('.tab[data-tab="demand"]','colleague: requests');await click('[data-voices="mine"]','colleague: my voices',{nochange:true});const vr=$('#main .row[data-open^="voice:"]');if(!vr)R.issues.push('colleague: own voice not listed');else{vr.click();await W(300);if(!$('[data-ve="edit"]'))R.issues.push('colleague: cannot edit own voice');const nr=$('#drawer [data-open^="need:r-"]');if(!nr)R.issues.push('colleague: voice does not link its new request');else{nr.click();await W(300);if($('[data-pipeline]'))R.issues.push('colleague: sees Take it to the pipeline');}await close();} location.hash='how';await W(200);if(document.querySelector('.rule'))R.issues.push('non-owner reached How it works by address'); }
await close();if(window.__OWNER){await click('#guide-btn','guide');await click('[data-tour="intake"]','intake tour');}
for(let s=0;s<12&&document.querySelector('[data-ob="next"]');s++){document.querySelector('[data-ob="next"]').click();await W(700);check('tour step '+s);}
if(document.querySelector('#ob-layer'))R.issues.push('tour: layer left behind');
await click('#guide-btn','guide 2');await click('[data-tour="engineering"]','eng tour');for(let s=0;s<8&&document.querySelector('[data-ob="next"]');s++){document.querySelector('[data-ob="next"]').click();await W(400);check('eng tour '+s);}
await click('.tab[data-tab="home"]','home after tours',{nochange:true});
for(const h of ['client-hyve-group','story-ep-19784','need-'+(window.__firstNeed||''),'item-ep-57335','quality','role-sales']){location.hash=h;await W(200);check('hash '+h);}
const pre=document.createElement('pre');pre.id='__probe';pre.textContent=JSON.stringify(R);document.body.appendChild(pre);})();
</script>'''

def main():
    d = sys.argv[1]; width = sys.argv[2] if len(sys.argv) > 2 else '1440'
    page = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
    mock = MOCK
    open(os.path.join(d, 'probe.html'), 'w', encoding='utf-8').write(mock + page + PROBE)
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=d); h.log_message = lambda *a: None
    with socketserver.TCPServer(('127.0.0.1', 0), h) as srv:
        port = srv.server_address[1]; threading.Thread(target=srv.serve_forever, daemon=True).start()
        out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', f'--window-size={width},1000', '--virtual-time-budget=120000',
                              '--dump-dom', f'http://127.0.0.1:{port}/probe.html?ai=' + os.environ.get('PROBE_AI', 'on') + ('&other' if os.environ.get('PROBE_AS') == 'other' else '')], capture_output=True, text=True, timeout=240).stdout
        srv.shutdown()
    os.remove(os.path.join(d, 'probe.html'))
    m = re.search(r'<pre id="__probe">(.*?)</pre>', out, re.S)
    if not m: print('probe did not finish'); sys.exit(2)
    R = json.loads(html.unescape(m.group(1)))
    print(f"width {width} · steps {R['steps']} · errors {len(R['errors'])} · issues {len(R['issues'])}")
    for e in R['errors']: print('  ERROR', e)
    for i in R['issues']: print('  ISSUE', i)
    for n in R.get('notes', []): print('  NOTE', n)
    sys.exit(1 if R['errors'] or R['issues'] else 0)

if __name__ == '__main__':
    main()
