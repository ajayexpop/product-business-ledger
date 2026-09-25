
(function(){
const D=window.LEDGER, TODAY=new Date(D.asOf+'T00:00:00Z');
const PRI=['Urgent','High','Medium','Low'];

// ===== logic registry: every tunable rule, embedded in this page =====
let LOGIC = JSON.parse(JSON.stringify(window.LOGIC_SEED));
const SEED = JSON.parse(JSON.stringify(window.LOGIC_SEED));
const LVMAP = {};
let SEV = {};
function applyLogic(){
  LOGIC.rules.forEach(r => LVMAP[r.id] = r.value);
  SEV = {Urgent:+LV('sev-urgent'), High:+LV('sev-high'), Medium:+LV('sev-medium'), Low:+LV('sev-low')};
}
function LV(id){ const v = LVMAP[id]; return v === undefined ? 0 : v; }
function seedOf(id){ const r = SEED.rules.find(x => x.id === id); return r ? r.value : undefined; }
function isChanged(r){ const s = seedOf(r.id); return s === undefined ? true : String(s) !== String(r.value); }
applyLogic();
const byId={}; D.companies.forEach(c=>byId[c.pd]=c);
const storyByKey={}; D.stories.forEach(s=>storyByKey[s.k]=s);

// ----- Hyve dedicated team (HV project). Rules hv-* in the Logic tab.
const HV=window.HYVE||null;
let hvExclude=false, hvPreQ2=false;   // both derived from the registry — see applyHyve
if(HV){
  if(!D.lenses.some(l=>l.key==='HV')) D.lenses.push({key:'HV',full:'Hyve team \u2014 not theme-classified',color:'#7C3AED',colorDark:'#A78BFA'});
  if(D.teams&&!D.teams.some(t=>t.key===HV.team)) D.teams.push({key:HV.team,color:'#7C3AED',colorDark:'#A78BFA'});
}
const hvCompany=()=>HV?D.companies.find(c=>c.pd===HV.pd):null;
function hvBugs(){ return !HV||hvExclude?[]:HV.bugs.filter(b=>hvPreQ2||!b.pre); }
function hvStories(){ return !HV||hvExclude?[]:HV.stories; }
function applyHyve(){
  if(!HV) return;
  hvExclude = String(LV('hv-exclude'))==='1';
  hvPreQ2   = String(LV('hv-preq2-bugs'))==='1';
  D.bugs=D.bugs.filter(b=>!b.hv);
  D.stories=D.stories.filter(s=>!s.hv);
  Object.keys(storyByKey).forEach(k=>{ if(storyByKey[k]&&storyByKey[k].hv) delete storyByKey[k]; });
  const co=hvCompany();
  if(co) co.storyKeys=(co.storyKeys||[]).filter(k=>!/^HV-/.test(String(k)));
  const bs=hvBugs(), ss=hvStories();
  if(!bs.length&&!ss.length) return;
  D.bugs=D.bugs.concat(bs);
  D.stories=D.stories.concat(ss);
  ss.forEach(s=>{storyByKey[s.k]=s});
  if(co) co.storyKeys=(co.storyKeys||[]).concat(ss.map(s=>s.k));
}
applyHyve();
const LENS={}; D.lenses.forEach(l=>LENS[l.key]=l);
const jira=k=>'https://expoplatform.atlassian.net/browse/'+k;
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const days=d=>d?Math.round((TODAY-new Date(d+'T00:00:00Z'))/86400000):null;
const fmtDate=d=>{if(!d)return'';const x=new Date(d+'T00:00:00Z');return x.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})};
const fmtMo=m=>{if(!m)return'';const [y,mm]=m.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mm-1]+' '+y};
const SHORT={'Frankfurter Buchmesse GmbH':'Frankfurter Buchmesse','Dubai World Trade Centre DWTC/ DXB Live':'DWTC / DXB Live','Tampereen Messut (Tampere Trade Fairs)':'Tampere Trade Fairs','BeautyIstanbul (Ipekyolu International Exhibitions)':'BeautyIstanbul','Airports Council International - ACI Asia-Pacific':'ACI Asia-Pacific','Association for Advancing Automation - A3':'A3','FOCUS - The Meeting Place for International Production':'FOCUS','Messe Dortmund - Westfalenhallen Unternehmensgruppe GmbH':'Messe Dortmund','Verband der Automobilindustrie e.V. (VDA) - (German Association Of Automotive Industry)':'VDA','K5 GmbH - Future Retail':'K5 Future Retail','Arabian Research Bureau LLC (OITE)':'Arabian Research Bureau','HINTE Expo & Conference GmbH':'HINTE','Kortrijk Xpo (Busworld)':'Kortrijk Xpo'};
const shortName=n=>SHORT[n]||n;
const isDark=()=>{const t=document.documentElement.getAttribute('data-theme');return t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)};
const LENS_ORDER=D.lenses.map(l=>l.key);
const lensColor=k=>{const i=LENS_ORDER.indexOf(k);return i<0?'var(--muted)':C.theme[i%C.theme.length]};
const lensName=k=>LENS[k]?LENS[k].full:k;
let scope='both', balFilter='';

// ----- aggregation: one client, both sides of the ledger
function agg(c){
  const rep=D.bugs.filter(b=>b.repIds.includes(c.pd));
  const aff=D.bugs.filter(b=>b.affIds.includes(c.pd));
  const all=scope==='rep'?rep:rep.concat(aff);
  const cnt={Urgent:0,High:0,Medium:0,Low:0}; all.forEach(b=>cnt[b.p]=(cnt[b.p]||0)+1);
  const inc=D.incidents.filter(i=>i.ids.includes(c.pd));
  const live=inc.filter(i=>i.st!=='Cancelled');
  const pen=c.incScore==null?null:penTotal(c);
  const sev=all.reduce((a,b)=>a+SEV[b.p],0);
  const st=(c.storyKeys||[]).map(k=>storyByKey[k]).filter(Boolean);
  const ship=st.filter(s=>s.sf==='Shipped'), prog=st.filter(s=>s.sf!=='Shipped');
  // liability (il-liability-formula): severity x age multiplier, plus points per non-cancelled incident
  const bugW=all.reduce((s,b)=>s+SEV[b.p]*ageMult(days(b.cr)),0);
  const liab=Math.round((bugW+live.length*LV('incident-points'))*10)/10;
  // investment (il-investment-unit): named stories shipped or in progress, plus pipeline items driven by them, counted once
  const named=new Set(st.map(s=>s.k));
  const pipe=pipeFor(c.pd), pipeNew=pipe.filter(r=>!named.has(String((r.v||{}).key||'').trim()));
  const inv=ship.length+prog.length+pipeNew.length;
  const oldest=all.length?Math.max(...all.map(b=>days(b.cr)||0)):null;
  return {c,rep,aff,all,cnt,inc,live,pen,sev,st,ship,prog,liab,inv,pipe,pipeNew,oldest,exp:exposure(c,cnt,all,pipe)};
}
function penParts(c){return c.incScore==null?null:[Math.min(c.incScore/LV('range-incident'),1)*LV('cap-incident'),Math.min(c.ocbw/LV('range-ocbw'),1)*LV('cap-ocbw'),Math.min(c.cbs/LV('range-cbs'),1)*LV('cap-cbs')]}
function penTotal(c){const p=penParts(c);return p?p[0]+p[1]+p[2]:null}
const healthCls=h=>h==null?'na':h<=3?'bad':h<=6?'mid':'good';

// ===== spec v1 §4 and §1: investment and liability (never netted), exposure to the next show =====
let PIPE=[];   // pipeline rows, pushed in through the CL bridge once the shared database answers
let PIPE_READY=false;
let FLOW=null, FLOWIX={}, FLOW_ERR=null;   // flow.json: the stored changelog read (src-stored-json), fetched once
function ageMult(d){
  if(d==null||d<=30) return +LV('il-age-mult-30');
  return d<=90?+LV('il-age-mult-90'):d<=180?+LV('il-age-mult-180'):+LV('il-age-mult-older');
}
const pipeDone=r=>{const v=r.v||{},j=r.j||{};return v.status==='Done'||j.canon==='Done'};
const pipeFor=pd=>PIPE.filter(r=>String((r.v||{}).driver||'')===String(pd));
const fmt1=n=>n==null?'—':(Math.round(n*10)/10).toString();
const eom=m=>{const p=String(m||'').split('-').map(Number);return p.length===2&&p[0]&&p[1]?new Date(Date.UTC(p[0],p[1],0)).toISOString().slice(0,10):null};
// the window a client sits in: days to the start of its next dated show (rk-window-*)
function winOf(n){
  if(n==null) return 'none';
  return n<=+LV('rk-window-30')?'w30':n<=+LV('rk-window-60')?'w60':n<=+LV('rk-window-90')?'w90':'none';
}
const WINS=[
  {k:'w30',l:()=>'≤'+LV('rk-window-30')+' days',s:()=>'≤'+LV('rk-window-30')+'d'},
  {k:'w60',l:()=>(+LV('rk-window-30')+1)+'–'+LV('rk-window-60')+' days',s:()=>(+LV('rk-window-30')+1)+'–'+LV('rk-window-60')+'d'},
  {k:'w90',l:()=>(+LV('rk-window-60')+1)+'–'+LV('rk-window-90')+' days',s:()=>(+LV('rk-window-60')+1)+'–'+LV('rk-window-90')+'d'},
  {k:'none',l:()=>'none / over '+LV('rk-window-90'),s:()=>'none'}
];
const winLabel=k=>(WINS.find(w=>w.k===k)||WINS[3]).s();
// the red and amber rules (rk-*). Every flag names the rule that fired and says why, in words.
function exposure(c,cnt,bugs,pipe){
  const n=c.nextEvent||null, dn=n?(n.now?0:n.in):null, w=winOf(dn), flags=[];
  const pl=(k,one,many)=>k+' '+(k===1?one:many);
  if(n){
    if((c.tier===1||c.tier===2)&&dn<=+LV('rk-urgent-t12')&&cnt.Urgent)
      flags.push({lv:'red',id:'rk-urgent-t12',t:pl(cnt.Urgent,'Urgent','Urgents')+' open on a Tier '+c.tier+' client, show in '+dn+(dn===1?' day':' days')});
    if(dn<=+LV('rk-high-days')&&cnt.High)
      flags.push({lv:'red',id:'rk-high-days',t:pl(cnt.High,'High','Highs')+' open, show in '+dn+(dn===1?' day':' days')});
    const broken=pipe.filter(r=>!pipeDone(r)&&eom((r.v||{}).month)&&eom(r.v.month)>n.s);
    if(broken.length)
      flags.push({lv:'red',id:'rk-promise-broken',items:broken,t:pl(broken.length,'must-have','must-haves')+' committed to land after the show starts ('+broken.map(r=>r.v.key||r.v.feature).join(', ')+')'});
    const aged=bugs.filter(b=>(days(b.cr)||0)>+LV('rk-ageing-days'));
    if(dn<=+LV('rk-window-60')&&aged.length)
      flags.push({lv:'amber',id:'rk-ageing-days',t:pl(aged.length,'open bug','open bugs')+' raised over '+LV('rk-ageing-days')+' days ago, show in '+dn+(dn===1?' day':' days')});
  } else {
    const oldHigh=bugs.filter(b=>b.p==='High'&&(days(b.cr)||0)>+LV('rk-always-on-days'));
    if(cnt.Urgent||oldHigh.length)
      flags.push({lv:'amber',id:'rk-always-on-days',t:'no dated show, and '+[cnt.Urgent?pl(cnt.Urgent,'Urgent','Urgents')+' open':'',oldHigh.length?pl(oldHigh.length,'High','Highs')+' open over '+LV('rk-always-on-days')+' days':''].filter(Boolean).join(' and ')});
  }
  return {next:n,days:dn,win:w,flags,lv:flags.some(f=>f.lv==='red')?'red':flags.length?'amber':''};
}
// quadrant lines: the running median across the Planhat-Active clients (il-quadrant-lines)
const scoredA=a=>a.c.inPlanhatActive!==false;
function ilLines(aggs){
  const sc=aggs.filter(scoredA);
  const med=v=>{const s=v.slice().sort((x,y)=>x-y),h=s.length>>1;return !s.length?0:s.length%2?s[h]:(s[h-1]+s[h])/2};
  return {inv:med(sc.map(a=>a.inv)),liab:med(sc.map(a=>a.liab)),n:sc.length};
}
const QUAD={healthy:'healthy partner',expensive:'expensive and still broken',quiet:'quiet',neglected:'neglected',unscored:'not scored'};
function quad(a,L){
  if(!scoredA(a)) return {k:'unscored',t:QUAD.unscored};
  const hi=a.inv>L.inv, hl=a.liab>L.liab;
  const k=hi&&hl?'expensive':hi?'healthy':hl?'neglected':'quiet';
  return {k,t:QUAD[k]};
}

// ----- tooltip
const tip=document.getElementById('tip');
function showTip(e,html){tip.innerHTML=html;tip.style.display='block';moveTip(e)}
function moveTip(e){const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-10;if(y+h>innerHeight-8)y=e.clientY-h-10;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){tip.style.display='none'}

// ----- horizontal stacked bars
function hbars(el,rows,opts){
  opts=opts||{};
  const W=opts.w||560,LW=opts.lw||158,RH=22,GAP=8,PAD=6; const H=rows.length*(RH+GAP)+PAD*2+16;
  const max=Math.max(opts.max||0,...rows.map(r=>r.total))||1; const PW_=W-LW-60;
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria||'')}">`;
  s+=`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--card)"/><rect width="3" height="6" fill="currentColor"/></pattern></defs>`;
  const ticks=opts.ticks||4; s+='<g class="grid">';
  for(let i=0;i<=ticks;i++){const x=LW+PW_*i/ticks;s+=`<line x1="${x}" y1="${PAD}" x2="${x}" y2="${H-14}"/><text x="${x}" y="${H-2}" text-anchor="middle" class="val">${opts.fmt?opts.fmt(max*i/ticks):Math.round(max*i/ticks)}</text>`}
  s+='</g>';
  rows.forEach((r,i)=>{
    const y=PAD+i*(RH+GAP); let x=LW;
    s+=`<text x="${LW-8}" y="${y+RH/2+4}" text-anchor="end" class="lbl">${esc(r.label.length>(opts.ml||20)?r.label.slice(0,(opts.ml||20)-1)+'…':r.label)}</text>`;
    r.segs.forEach((g,j)=>{ if(!g.v)return; const w=PW_*g.v/max; const last=j===r.segs.length-1||!r.segs.slice(j+1).some(z=>z.v);
      s+=`<rect class="seg" x="${x}" y="${y}" width="${Math.max(w,0)}" height="${RH}" rx="${last?4:0}" fill="${g.fill}" data-i="${i}"/>`;
      if(g.hatch) s+=`<rect class="seg" x="${x}" y="${y}" width="${Math.max(w,0)}" height="${RH}" rx="${last?4:0}" fill="url(#hatch)" style="color:${g.fill}" data-i="${i}" opacity=".9"/>`;
      x+=w;});
    s+=`<text x="${x+6}" y="${y+RH/2+4}" class="val">${opts.fmt?opts.fmt(r.total):r.total}</text>`;
    s+=`<rect class="bar-hit" x="${LW}" y="${y}" width="${PW_}" height="${RH}" data-i="${i}" ${r.onclick?'style="cursor:pointer"':''}/>`;
  });
  s+='</svg>'; el.innerHTML=s;
  const svg=el.firstElementChild;
  svg.addEventListener('mousemove',e=>{const t=e.target.closest('[data-i]');if(!t){hideTip();return}const r=rows[+t.dataset.i];showTip(e,`<b>${esc(r.label)}</b>${r.tipHtml||''}`)});
  svg.addEventListener('mouseleave',hideTip);
  svg.addEventListener('click',e=>{const t=e.target.closest('[data-i]');if(t&&rows[+t.dataset.i].onclick)rows[+t.dataset.i].onclick()});
}
const PFILL={Urgent:'var(--sev-urgent)',High:'var(--sev-high)',Medium:'var(--sev-medium)',Low:'var(--sev-low)'};
const C={inc:'var(--inc)',incSoft:'var(--inc-soft)',ship:'var(--del-ship)',prog:'var(--del-prog)',
         penInc:'var(--pen-inc)',penOpen:'var(--pen-open)',penHist:'var(--pen-hist)',
         theme:['var(--th1)','var(--th2)','var(--th3)','var(--th4)','var(--th5)','var(--th6)']};

// ----- diverging give/get chart
function diverge(el,rows,opts){
  opts=opts||{};
  const W=560,LW=146,RH=20,GAP=9,PAD=8; const H=rows.length*(RH+GAP)+PAD*2+18;
  const half=(W-LW-16)/2, CX=LW+half;
  const maxL=Math.max(1,...rows.map(r=>r.left)), maxR=Math.max(1,...rows.map(r=>r.rightTotal));
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria||'')}">`;
  s+=`<g class="grid"><line x1="${CX}" y1="${PAD-4}" x2="${CX}" y2="${H-16}" stroke="var(--line)"/></g>`;
  s+=`<text x="${CX-6}" y="${H-3}" text-anchor="end" class="val">${maxL} open severity</text>`;
  s+=`<text x="${CX+6}" y="${H-3}" class="val">${maxR} stories</text>`;
  rows.forEach((r,i)=>{
    const y=PAD+i*(RH+GAP);
    s+=`<text x="${LW-8}" y="${y+RH/2+4}" text-anchor="end" class="lbl">${esc(r.label.length>16?r.label.slice(0,15)+'…':r.label)}</text>`;
    if(r.left){const w=(half-14)*r.left/maxL;s+=`<rect class="seg" x="${CX-w}" y="${y}" width="${w}" height="${RH}" rx="4" fill="var(--sev-high)" data-i="${i}"/>`;
      s+=`<text x="${CX-w-5}" y="${y+RH/2+4}" text-anchor="end" class="val">${r.left}</text>`;}
    let x=CX;
    [[r.ship,C.ship],[r.prog,C.prog]].forEach(([v,f])=>{if(!v)return;const w=(half-14)*v/maxR;s+=`<rect class="seg" x="${x}" y="${y}" width="${w}" height="${RH}" rx="4" fill="${f}" data-i="${i}"/>`;x+=w});
    if(r.rightTotal) s+=`<text x="${x+5}" y="${y+RH/2+4}" class="val">${r.rightTotal}</text>`;
    else s+=`<text x="${CX+5}" y="${y+RH/2+4}" class="val" style="fill:var(--muted)">none named</text>`;
    s+=`<rect class="bar-hit" x="${LW}" y="${y}" width="${W-LW-8}" height="${RH}" data-i="${i}" style="cursor:pointer"/>`;
  });
  s+='</svg>'; el.innerHTML=s;
  const svg=el.firstElementChild;
  svg.addEventListener('mousemove',e=>{const t=e.target.closest('[data-i]');if(!t){hideTip();return}const r=rows[+t.dataset.i];showTip(e,`<b>${esc(r.label)}</b>${r.tipHtml||''}`)});
  svg.addEventListener('mouseleave',hideTip);
  svg.addEventListener('click',e=>{const t=e.target.closest('[data-i]');if(t&&rows[+t.dataset.i].onclick)rows[+t.dataset.i].onclick()});
}

// ----- KPIs
function renderKPIs(){
  const t1=D.companies.filter(c=>c.tier===1);
  const t1crit=t1.filter(c=>D.bugs.some(b=>(b.repIds.includes(c.pd)||b.affIds.includes(c.pd))&&(b.p==='Urgent'||b.p==='High')));
  const epStories=D.stories.filter(s=>!s.hv), hvS=D.stories.filter(s=>s.hv), hvB=D.bugs.filter(b=>b.hv);
  const shipped=epStories.filter(s=>s.sf==='Shipped').length;
  const aggsK=D.companies.map(agg), LK=ilLines(aggsK);
  const neglected=aggsK.filter(a=>quad(a,LK).k==='neglected').sort((x,y)=>y.liab-x.liab);
  const openInc=D.incidents.filter(i=>i.st!=='Done'&&i.st!=='Cancelled');
  const atCap=D.companies.filter(c=>c.incScore!=null&&penTotal(c)>=LV('at-cap-threshold'));
  const urgent=D.bugs.filter(b=>b.p==='Urgent').length;
  const soon=(D.events||[]).filter(e=>e.kind==='event'&&e.pd&&e.s&&dnum(e.s)>=0&&dnum(e.s)<=90);
  const soonPd=[...new Set(soon.map(e=>e.pd))];
  const exposed=soonPd.filter(pd=>D.bugs.some(b=>(b.repIds.includes(pd)||b.affIds.includes(pd))&&(b.p==='Urgent'||b.p==='High')));
  const k=[
    {n:D.companies.length,l:'Active clients',d:t1.length+' Tier 1 · '+D.companies.filter(c=>c.tier===2).length+' Tier 2',tab:'ledger'},
    {n:epStories.length,l:'Stories in 2026',d:shipped+' shipped · '+(epStories.length-shipped)+' in progress · '+D.namedCount+' named to a client'+(hvS.length?' · +'+hvS.length+' Hyve team':''),tab:'delivery'},
    {n:neglected.length,l:'Neglected — high liability, low investment',d:neglected.length?neglected.slice(0,3).map(a=>shortName(a.c.name)).join(', ')+(neglected.length>3?' +'+(neglected.length-3)+' more':''):'no client above the liability median with no investment',tab:'ledger',bal:'neglected',warn:true},
    {n:exposed.length+' / '+soonPd.length,l:'Shows in 90 days with Urgent or High open',d:soon.length+' shows across '+soonPd.length+' clients'+(exposed.length?' · '+exposed.slice(0,2).map(pd=>shortName((byId[pd]||{}).name||'')).join(', '):''),tab:'timeline',warn:true},
    {n:D.bugs.length,l:'Open client bugs',d:urgent+' Urgent · '+D.bugs.filter(b=>b.p==='High').length+' High'+(hvB.length?' · '+hvB.length+' from the Hyve team':''),tab:'bugs',warn:true},
    {n:t1crit.length+' / '+t1.length,l:'Tier 1 with Urgent or High',d:t1crit.slice(0,3).map(c=>shortName(c.name)).join(', ')+(t1crit.length>3?' +'+(t1crit.length-3)+' more':''),tab:'ledger',tier:'1'},
    {n:openInc.length,l:'Open incidents',d:openInc.map(i=>i.key+' '+shortName((byId[i.ids[0]]||{}).name||'')).join(', ')||'none',tab:'incidents',warn:true},
    {n:atCap.length,l:'At the -'+LV('cap-total')+' quality cap',d:atCap.length?atCap.slice(0,3).map(c=>shortName(c.name)).join(', ')+(atCap.length>3?' +'+(atCap.length-3)+' more':''):'their health score still tells you something',tab:'method'}
  ];
  document.getElementById('kpis').innerHTML=k.map(x=>`<button class="kpi${x.warn&&Number(String(x.n).split(' ')[0])>0?' warn':''}" data-tab="${x.tab}" ${x.tier?`data-tier="${x.tier}"`:''} ${x.bal?`data-bal="${x.bal}"`:''}><div class="n">${x.n}</div><div class="l">${x.l}</div><div class="d">${esc(x.d)}</div></button>`).join('');
  document.querySelectorAll('.kpi').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.tier){document.getElementById('f-tier').value=b.dataset.tier}
    if(b.dataset.bal){balFilter=b.dataset.bal;document.querySelectorAll('#f-bal button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===balFilter)))}
    showTab(b.dataset.tab); renderLedger();
  }));
  const pct=Math.round(D.platformCount/epStories.length*100);
  document.getElementById('band-pct').textContent=pct+'%';
  document.getElementById('band-text').textContent=`Only ${D.namedCount} of ${epStories.length} stories delivered in 2026 carry a client label — the other ${D.platformCount} are platform or internal work.`;
}

// ----- the Hyve dedicated team bar
function renderHvBar(){
  const el=document.getElementById('hvbar'); if(!el) return;
  if(!HV){ el.hidden=true; return; }
  el.hidden=false;
  const nS=hvStories().length, nB=hvBugs().length, c=HV.counts;
  el.className='hvbar'+(hvExclude?' off':'');
  const on=`<b>Hyve dedicated team is counted in.</b> ${nS} delivery items and ${nB} open bugs from the HV project are attributed to Hyve Group Plc by project membership, not by label.
     No other client on this board has a dedicated team feeding it, so <b>Hyve is not like-for-like comparable with the other 48 rows</b> while this is on. Closed HV bugs (${c.bugsClosed}) and rejected items (${c.storiesRejected+c.bugsRejected}) are counted nowhere.`;
  const off=`<b>Hyve dedicated team is excluded.</b> Hyve Group Plc is shown on EP work only, so every client on this board is counted the same way. ${HV.stories.length} delivery items and ${HV.bugs.filter(b=>hvPreQ2||!b.pre).length} open bugs are hidden. This is the <b>hv-exclude</b> rule — save it on the Logic tab to make it the default for everyone who opens this page.`;
  el.innerHTML=`<span class="dot"></span><span class="tx">${hvExclude?off:on}</span>`+
    `<button class="hvbtn" id="hv-toggle" type="button">${hvExclude?'Include the team':'Exclude the team'}</button>`;
  document.getElementById('hv-toggle').addEventListener('click',()=>{
    const r=LOGIC.rules.find(x=>x.id==='hv-exclude');
    if(r){ r.value = String(r.value)==='1' ? 0 : 1; lgTouch(); }
  });
}

// ----- tabs
function showTab(t){
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  document.querySelectorAll('.panel').forEach(p=>p.hidden=(p.id!=='panel-'+t));
  fitDetail(); try{if(typeof ppFit==='function')ppFit()}catch(e){}
  try{localStorage.setItem('ep-ledger-tab',t)}catch(e){}
}
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)showTab(b.dataset.tab)});

// ----- ledger charts
// the investment x liability quadrant (il-quadrant-lines). Replaces the give-and-get chart (decision O2).
const QFILL={neglected:'var(--inc)',expensive:'var(--sev-high)',healthy:'var(--give-ink)',quiet:'var(--muted)'};
function chartQuadrant(list,L){
  const el=document.getElementById('chart-quadrant'); if(!el) return;
  const pts=list.filter(scoredA).map(a=>({a,q:quad(a,L)}));
  const W=560,H=372,ML=46,MR=16,MT=24,MB=40, PW=W-ML-MR, PH=H-MT-MB;
  const maxL=Math.max(1,L.liab*2,...pts.map(p=>p.a.liab)), maxI=Math.max(2,...pts.map(p=>p.a.inv));
  // square-root scales: most clients sit near zero on both axes and would stack on a linear one
  const sx=v=>ML+Math.sqrt(Math.max(0,v)/maxL)*PW, sy=v=>MT+PH-Math.sqrt(Math.max(0,v)/maxI)*PH;
  const tickSet=(max,cands)=>cands.filter(v=>v<=max*1.001);
  const tx=tickSet(maxL,[0,5,10,25,50,100,200,400]), ty=tickSet(maxI,[0,1,2,5,10,20,40,80]);
  if(ty[ty.length-1]<maxI*0.8) ty.push(Math.round(maxI));
  if(tx[tx.length-1]<maxL*0.8) tx.push(Math.round(maxL));
  // investment is a count, so "above the median" starts at the next whole item: draw the line half way there
  const lx=sx(L.liab), ly=sy(Math.floor(L.inv)+0.5);
  let s=`<svg class="chart qd" viewBox="0 0 ${W} ${H}" role="img" aria-label="Investment against liability for ${pts.length} scored clients">`;
  s+='<g class="grid">'+tx.map(v=>`<line x1="${sx(v)}" y1="${MT}" x2="${sx(v)}" y2="${MT+PH}"/><text x="${sx(v)}" y="${MT+PH+15}" text-anchor="middle" class="val">${v}</text>`).join('')
    +ty.map(v=>`<line x1="${ML}" y1="${sy(v)}" x2="${ML+PW}" y2="${sy(v)}"/><text x="${ML-7}" y="${sy(v)+4}" text-anchor="end" class="val">${v}</text>`).join('')+'</g>';
  s+=`<rect x="${lx}" y="${MT}" width="${ML+PW-lx}" height="${ly-MT}" class="qd-zone exp"/><rect x="${lx}" y="${ly}" width="${ML+PW-lx}" height="${MT+PH-ly}" class="qd-zone neg"/>`;
  s+=`<line x1="${lx}" y1="${MT}" x2="${lx}" y2="${MT+PH}" class="qd-line"/><line x1="${ML}" y1="${ly}" x2="${ML+PW}" y2="${ly}" class="qd-line"/>`;
  s+=`<text x="${ML+6}" y="${MT+13}" class="qd-lab">Healthy partner</text><text x="${ML+PW-6}" y="${MT+13}" text-anchor="end" class="qd-lab exp">Expensive and still broken</text>`
    +`<text x="${ML+40}" y="${MT+PH-7}" class="qd-lab">Quiet</text><text x="${ML+PW-6}" y="${MT+PH-7}" text-anchor="end" class="qd-lab neg">Neglected</text>`;
  s+=`<text x="${ML+PW/2}" y="${H-4}" text-anchor="middle" class="qd-ax">Liability → open bugs by severity and age, plus incidents</text>`
    +`<text transform="translate(12 ${MT+PH/2}) rotate(-90)" text-anchor="middle" class="qd-ax">Investment → items named to them</text>`;
  const order=pts.slice().sort((x,y)=>(x.q.k==='neglected'||x.q.k==='expensive')-(y.q.k==='neglected'||y.q.k==='expensive'));
  order.forEach((p,i)=>{const cx=sx(p.a.liab),cy=sy(p.a.inv);
    s+=`<circle cx="${cx}" cy="${cy}" r="${p.a.c.tier===1?6:4.6}" fill="${QFILL[p.q.k]}" class="qd-pt" data-i="${pts.indexOf(p)}"/>`});
  // name the dangerous corners, worst liability first, skipping labels that would collide
  const boxes=[], lab=pts.filter(p=>p.q.k==='neglected'||p.q.k==='expensive').sort((x,y)=>y.a.liab-x.a.liab).slice(0,12);
  lab.forEach(p=>{const nm=shortName(p.a.c.name), w=Math.min(118,nm.length*5.6+4), cx=sx(p.a.liab), cy=sy(p.a.inv);
    let x=cx+8, anchor='start'; if(x+w>ML+PW){x=cx-8;anchor='end'}
    const bx=anchor==='start'?x:x-w, by=cy-11;
    if(boxes.some(b=>bx<b.x+b.w&&bx+w>b.x&&by<b.y+13&&by+13>b.y)) return;
    boxes.push({x:bx,y:by,w}); s+=`<text x="${x}" y="${cy+4}" text-anchor="${anchor}" class="qd-name">${esc(nm.length>22?nm.slice(0,21)+'…':nm)}</text>`});
  const stack={}; pts.forEach(p=>{const k=Math.round(sx(p.a.liab)/4)+'|'+Math.round(sy(p.a.inv)/4);(stack[k]=stack[k]||[]).push(p)});
  Object.values(stack).filter(g=>g.length>1).forEach(g=>{const cx=sx(g[0].a.liab),cy=sy(g[0].a.inv);
    s+=`<text x="${cx+7}" y="${cy-7}" class="qd-stack">\u00d7${g.length}</text>`});
  pts.forEach((p,i)=>{s+=`<circle cx="${sx(p.a.liab)}" cy="${sy(p.a.inv)}" r="10" class="bar-hit" data-i="${i}" style="cursor:pointer"/>`});
  s+='</svg>';
  const cnt={};pts.forEach(p=>cnt[p.q.k]=(cnt[p.q.k]||0)+1);
  el.innerHTML=s+`<div class="legend qd-legend" style="margin-top:6px">`
    +['neglected','expensive','healthy','quiet'].map(k=>`<span><i style="background:${QFILL[k]}"></i>${esc(QUAD[k][0].toUpperCase()+QUAD[k].slice(1))} ${cnt[k]||0}</span>`).join('')
    +`<span class="qd-med">Lines: medians across ${L.n} Planhat-Active clients — investment above ${fmt1(L.inv)}, liability above ${fmt1(L.liab)}${PIPE_READY?'':'. The pipeline ledger has not loaded in this view, so investment counts named stories only'}</span></div>`;
  const svg=el.querySelector('svg');
  svg.addEventListener('mousemove',e=>{const t=e.target.closest('[data-i]');if(!t){hideTip();return}const p=pts[+t.dataset.i],a=p.a;
    showTip(e,`<b>${esc(shortName(a.c.name))}</b>Tier ${a.c.tier??'—'} · ${esc(p.q.t)}<br>Investment ${a.inv}: ${a.ship.length} shipped, ${a.prog.length} in progress${a.pipeNew.length?', '+a.pipeNew.length+' pipeline':''}<br>Liability ${fmt1(a.liab)}: ${a.all.length} open bugs, ${a.live.length} incidents${a.oldest!=null?'<br>Oldest open bug '+a.oldest+' days':''}${a.exp.lv?'<br>Exposure: '+a.exp.lv:''}`)});
  svg.addEventListener('mouseleave',hideTip);
  svg.addEventListener('click',e=>{const t=e.target.closest('[data-i]');if(t)openClient(pts[+t.dataset.i].a.c.pd)});
}
function chartPenalty(){
  const rows=D.companies.filter(c=>c.incScore!=null).map(c=>{const p=penParts(c);return{c,p,t:p[0]+p[1]+p[2]}}).sort((a,b)=>b.t-a.t).slice(0,LV('top-penalty')).map(x=>({
    label:shortName(x.c.name),total:x.t,segs:[{v:x.p[0],fill:C.penInc},{v:x.p[1],fill:C.penOpen},{v:x.p[2],fill:C.penHist}],
    tipHtml:`<br>Incidents -${x.p[0].toFixed(1)} · Open bug weight -${x.p[1].toFixed(1)} · History -${x.p[2].toFixed(1)}<br>Health ${x.c.health} · Tier ${x.c.tier}`,onclick:()=>openClient(x.c.pd)}));
  hbars(document.getElementById('chart-penalty'),rows,{aria:'Quality penalty by client',max:LV('cap-total'),ticks:7,fmt:v=>'-'+v.toFixed(1)});
}

// ----- ledger table
let sortK='liab',sortDir=-1,openPd=null;
function currentClients(){
  const tier=document.getElementById('f-tier').value, owner=document.getElementById('f-owner').value, q=document.getElementById('f-search').value.trim().toLowerCase();
  const aggs=D.companies.map(agg), L=ilLines(aggs);
  const list=aggs.filter(a=>(!tier||String(a.c.tier)===tier)&&(!owner||a.c.owner===owner)&&(!q||a.c.name.toLowerCase().includes(q))
    &&(balFilter!=='neglected'||quad(a,L).k==='neglected')
    &&(balFilter!=='active'||a.liab>0||a.st.length>0||a.pipe.length>0));
  list.L=L;
  return list;
}
// the three lenses that replaced the Balance column (spec v1 §4.5)
function invCell(a){
  const bits=[];
  if(a.ship.length+a.prog.length) bits.push((a.ship.length+a.prog.length)+' named');
  if(a.pipeNew.length) bits.push(a.pipeNew.length+' pipeline');
  return `${a.inv?`<b class="il-n">${a.inv}</b>`:'<span class="zero">0</span>'}${bits.length?`<div class="small">${bits.join(' · ')}</div>`:''}`;
}
function liabCell(a,L){
  const q=quad(a,L);
  return `${a.liab?`<b class="il-n">${fmt1(a.liab)}</b>`:'<span class="zero">0</span>'}<div class="small"><span class="qtag ${q.k}">${esc(q.t)}</span></div>`;
}
function expCell(a){
  const e=a.exp, w=e.next?`<span class="win ${e.win}">${esc(winLabel(e.win))}</span>`:'<span class="win nodate">no dated show</span>';
  const lv=e.lv?` <span class="rk ${e.lv}">${e.lv}</span>`:'';
  const why=e.flags.map(f=>f.t+' ('+f.id+')').join('; ');
  return `<span title="${esc(why||(e.next?'show in '+e.days+' days, no rule fired':'no dated show, no rule fired'))}">${w}${lv}</span>${e.next?`<div class="small">show in ${e.days}d</div>`:''}`;
}
const expRank=a=>(a.exp.lv==='red'?2e6:a.exp.lv==='amber'?1e6:0)+(a.exp.days==null?0:1e5-a.exp.days);
function renderLedger(){
  const list=currentClients(), L=list.L;
  const key={name:a=>a.c.name.toLowerCase(),tier:a=>a.c.tier==null?9:a.c.tier,health:a=>a.c.health==null?-1:a.c.health,ship:a=>a.ship.length,prog:a=>a.prog.length,
    themes:a=>a.st.length,open:a=>a.all.length,sev:a=>a.sev,inc:a=>a.inc.length,penalty:a=>a.pen==null?-1:a.pen,
    inv:a=>a.inv,liab:a=>a.liab,exp:expRank,next:a=>a.c.nextEvent?a.c.nextEvent.s:'9999'}[sortK]||(a=>a.liab);
  list.sort((x,y)=>{const A=key(x),B=key(y);return (A<B?-1:A>B?1:0)*sortDir || (x.c.tier||9)-(y.c.tier||9)});
  document.getElementById('c-count').textContent=list.length+' of '+D.companies.length+' clients';
  document.querySelectorAll('#t-ledger th').forEach(th=>{th.removeAttribute('aria-sort');if(th.dataset.k===sortK)th.setAttribute('aria-sort',sortDir===1?'ascending':'descending')});
  const rows=list.map(a=>{
    const c=a.c;
    const themes=a.st.length?`<span class="thset">${[...new Set(a.st.map(s=>s.lens))].map(l=>`<i style="background:${lensColor(l)}" title="${esc(lensName(l))}"></i>`).join('')}</span>`:'<span class="zero">—</span>';
    const mix=a.all.length?`<span class="prbar">${PRI.map(p=>a.cnt[p]?`<span class="${p}" style="width:${6+a.cnt[p]*5}px" title="${p} ${a.cnt[p]}"></span>`:'').join('')}</span>`:'<span class="zero">—</span>';
    const tr=`<tr class="row${c.tier===1?' tier1':''}${openPd===c.pd?' open':''}" data-pd="${c.pd}">
      <td><span class="name">${esc(shortName(c.name))}</span>${HV&&!hvExclude&&c.pd===HV.pd?' <span class="hvtag">+ dedicated team</span>':''}<div class="small">${esc(c.owner||'no owner')}${c.inPlanhatActive===false?' · not active in Planhat':''}</div></td>
      <td class="num">${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">T${c.tier}</span>`:'<span class="tierpill na">—</span>'}</td>
      <td class="num"><span class="health ${healthCls(c.health)}">${c.health==null?'—':Math.round(c.health)}</span></td>
      <td class="num thin">${a.ship.length||'<span class="zero">0</span>'}</td>
      <td class="num thin">${a.prog.length||'<span class="zero">0</span>'}</td>
      <td>${themes}</td>
      <td class="num thin">${a.all.length||'<span class="zero">0</span>'}</td>
      <td>${mix}</td>
      <td class="num thin">${a.inc.length||'<span class="zero">0</span>'}</td>
      <td class="num thin">${a.pen==null?'<span class="zero">—</span>':'-'+a.pen.toFixed(1)}</td>
      <td class="num thin">${invCell(a)}</td>
      <td class="num thin">${liabCell(a,L)}</td>
      <td>${expCell(a)}</td>
      <td>${c.nextEvent?`${esc(c.nextEvent.n.length>26?c.nextEvent.n.slice(0,25)+'…':c.nextEvent.n)}<div class="small">${fmtDate(c.nextEvent.s)}</div>`:'<span class="zero">—</span>'}</td></tr>`;
    return tr+(openPd===c.pd?detailRow(a,L):'');
  }).join('');
  document.getElementById('tb-ledger').innerHTML=rows||'<tr><td colspan="14" class="empty">No clients match these filters.</td></tr>';
  fitDetail();
  chartQuadrant(list,L);
}
// the table scrolls sideways; its expanded record stays pinned to the visible width
function fitDetail(){
  const w=document.querySelector('#panel-ledger .tablewrap'), d=document.querySelector('#tb-ledger tr.detail .dgrid');
  if(w&&d&&w.clientWidth) d.style.width=(w.clientWidth-38)+'px';
}
addEventListener('resize',()=>{fitDetail();try{if(typeof ppFit==='function')ppFit()}catch(e){}});

// ----- expanded client detail: both sides side by side
function storyCard(s,compact){
  const col=lensColor(s.lens);
  return `<div class="story${s.sf!=='Shipped'?' prog':''}">
    <div class="k"><a href="${esc(s.link||jira(s.k))}" target="_blank" rel="noopener">${esc(s.k)}</a></div>
    <div class="s">${esc(s.s)}
      <div class="m"><span class="th"><i style="background:${col}"></i>${esc(lensName(s.lens))}</span>
      <span>${esc(s.team||'—')}</span>${s.pa&&s.pa!=='Not Clearly Specified'?`<span>${esc(s.pa)}</span>`:''}
      ${s.cf==='Low'?'<span class="lowconf">low confidence</span>':''}
      ${!compact&&s.tags&&s.tags.length?`<span>labelled ${esc(s.tags.join(', '))}</span>`:''}</div>
    </div>
    <div class="r">${s.sf==='Shipped'?fmtMo(s.mo):'<span class="status progress">In progress</span>'}<div style="margin-top:3px">${s.bv==='High'?'<span class="vpill">High value</span>':esc(s.bv||'')}</div></div>
  </div>`;
}

// ----- the full story analysis: every field the dataset holds, collapsed until asked for
const RGN={Grow:'Grow revenue',Keep:'Keep revenue',Save:'Save cost'};
function cycText(s){
  if(s.cyc!=null)return s.cyc+' days';
  return 'not measurable';
}
function clientNames(s){
  return (s.pds||[]).map(pd=>byId[pd]?shortName(byId[pd].name):pd).filter(Boolean);
}
function storyFull(s){
  const col=lensColor(s.lens), cn=clientNames(s);
  const drift=s.js&&s.sf&&((s.sf==='Shipped')!==(s.js==='Done'));
  const kv=[
    ['Status', esc(s.js||s.sf)+(drift?` <span class="sx-warn">snapshot said ${esc(s.sf)}</span>`:'')],
    ['Raised', s.cd?fmtDate(s.cd):'—'],
    ['Resolved', s.rd?fmtDate(s.rd):'<span class="sx-dim">no resolution date in Jira</span>'],
    ['Time to deliver', s.cyc!=null?`<b>${s.cyc} days</b>`:'<span class="sx-dim">not measurable</span>'],
    ['Placed in', fmtMo(s.mo)+(s.mb==='created'?' <span class="sx-warn">by raised date</span>':' <span class="sx-dim">by resolution date</span>')],
    ['Theme', `<span class="th"><i style="background:${col}"></i>${esc(lensName(s.lens))}</span>`],
    ['Product area', esc(s.pa||'—')],
    ['Team', esc(s.team||'—')],
    ['Epic', epicCell(s)],
    ['Business value', esc(s.bv||'—')],
    ['Revenue goal', esc(RGN[s.rg]||s.rg||'—')],
    ['Impact', (s.im&&s.im.length)?s.im.map(x=>esc(x)).join(', '):'—'],
    ['Confidence', esc(s.cf||'—')+(s.cf==='Low'?' <span class="sx-warn">summary is a pointer, not a statement of fact</span>':'')],
    ['Named to', cn.length?cn.map(n=>esc(n)).join(', '):'<span class="sx-dim">nobody — platform work</span>']
  ];
  const fr=FLOWIX[s.k];
  if(fr) kv.push(['Flow (changelog)', flowLine(fr)+` <button type="button" class="linkbtn" data-flrow="${esc(s.k)}">every state</button>`]);
  const se=(typeof storyEvent==='function')?storyEvent(s):null;
  if(se) kv.push(['Next show after it', `${esc(se.e.n)} <span class="sx-dim">${esc(evDates(se.e))}</span><br>` +
    (s.rd?`landed <b>${se.gap} days</b> before it`:`still open, show ${se.gap>=0?'in '+se.gap+' days from that month':'already run'}`)]);
  else if(cn.length) kv.push(['Next show after it','<span class="sx-dim">no show recorded for this client after that date</span>']);
  const prose=s.hv
    ?[['Carried unenriched','This item comes from the HV project \u2014 the Hyve dedicated team. It has no AI summary, theme, business value or confidence rating, because the Delivery Timeline generator has never run over HV. The line above is the Jira ticket\u2019s own summary.']]
    :[['The problem',s.pr],['Why it was done',s.wy],['What changed',s.oc]].filter(x=>x[1]);
  return `<div class="sx${s.sf!=='Shipped'?' prog':''}">
    <button class="sx-top" type="button" data-sxt aria-expanded="false">
      <span class="k">${esc(s.k)}</span>
      <span class="s">${esc(s.s)}
        <span class="m">${s.hv?'<span class="hvtag">Hyve team</span>':''}<span class="th"><i style="background:${col}"></i>${esc(lensName(s.lens))}</span><span>${esc(s.team||'no team')}</span>${s.cf==='Low'?'<span class="lowconf">low confidence</span>':''}</span>
      </span>
      <span class="r">${s.sf==='Shipped'?esc(fmtMo(s.mo)):'<span class="status progress">In progress</span>'}<span class="cyc">${esc(cycText(s))}</span></span>
      <span class="arw">&rsaquo;</span>
    </button>
    <div class="sx-body" hidden>
      <dl class="sx-kv">${kv.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${prose.map(([h,t])=>`<div class="sx-p"><b>${h}</b>${esc(t)}</div>`).join('')}
      <a class="sx-link" href="${esc(s.link||jira(s.k))}" target="_blank" rel="noopener">Open ${esc(s.k)} in Jira</a>
    </div>
  </div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-sxt]'); if(!b)return;
  const open=b.getAttribute('aria-expanded')==='true';
  b.setAttribute('aria-expanded',String(!open));
  b.parentElement.querySelector('.sx-body').hidden=open;
});
function ilDetail(a,L){
  const q=quad(a,L), e=a.exp;
  const bands=[[0,30,'il-age-mult-30','0–30 days'],[31,90,'il-age-mult-90','31–90'],[91,180,'il-age-mult-180','91–180'],[181,1e9,'il-age-mult-older','over 180']];
  const byBand=bands.map(([lo,hi,id,l])=>{const bs=a.all.filter(b=>{const d=days(b.cr)||0;return d>=lo&&d<=hi});
    return bs.length?`${bs.length} at ${l} ×${+LV(id)}`:''}).filter(Boolean);
  const pipeList=a.pipe.map(r=>{const v=r.v||{};return `${v.key?`<a href="${jira(v.key)}" target="_blank" rel="noopener">${esc(v.key)}</a>`:'no ticket'} ${esc(String(v.feature||'').slice(0,48))} <span class="small">${esc(fmtMo(v.month))}${a.pipeNew.includes(r)?'':' · already a named story'}</span>`}).join('<br>');
  return `<div class="eyebrow">Investment, liability, exposure</div>
        <dl class="kv">
          <dt>Investment</dt><dd><b>${a.inv}</b> <span class="small">${a.ship.length} shipped + ${a.prog.length} in progress named to them + ${a.pipeNew.length} pipeline item${a.pipeNew.length===1?'':'s'} they drive · counts, not days (il-investment-unit)</span>${pipeList?'<div class="small" style="margin-top:3px">'+pipeList+'</div>':''}</dd>
          <dt>Liability</dt><dd><b>${fmt1(a.liab)}</b> <span class="small">${a.all.length} open bug${a.all.length===1?'':'s'}${byBand.length?' ('+byBand.join(', ')+')':''} + ${a.live.length} incident${a.live.length===1?'':'s'} × ${LV('incident-points')}</span></dd>
          <dt>Quadrant</dt><dd><span class="qtag ${q.k}">${esc(q.t)}</span> <span class="small">${scoredA(a)?'lines at the medians: investment above '+fmt1(L.inv)+', liability above '+fmt1(L.liab):'not Planhat-Active, so not placed on the quadrant'}</span></dd>
          <dt>Exposure</dt><dd>${e.next?`${esc(e.next.n)} <span class="small">${fmtDate(e.next.s)} · ${e.next.now?'running now':'in '+e.days+' days'} · window ${esc(winLabel(e.win))}</span>`:'<span class="small">no dated show — read by the always-on rule</span>'}
            ${e.flags.length?'<div style="margin-top:4px">'+e.flags.map(f=>`<div class="small"><span class="rk ${f.lv}">${f.lv}</span> ${esc(f.t)} <span class="sx-dim">${esc(f.id)}</span></div>`).join('')+'</div>':'<div class="small">no red or amber rule fired</div>'}</dd>
        </dl>`;
}
function detailRow(a,L){
  const c=a.c;
  L=L||ilLines(D.companies.map(agg));
  const bug=b=>`<div class="bug${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' aff':''}">
    <div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div>
    <div class="s">${esc(b.s)}${b.hv?' <span class="hvtag">HV</span>':''}<div class="m">${esc(b.team||'no team')}${b.ev?' · '+esc(b.ev):''}${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' · affected only':''}</div></div>
    <div class="st">${esc(b.st)}<div class="m">${days(b.cr)}d old</div></div></div>`;
  const inc=i=>`<div class="bug"><div class="k"><a href="${jira(i.key)}" target="_blank" rel="noopener">${esc(i.key)}</a><br><span class="pr ${i.p}">${i.p}</span></div>
    <div class="s">${esc(i.s)}<div class="m">${esc(i.ev||'')}</div></div><div class="st">${esc(i.st)}<div class="m">${fmtDate(i.cr)}</div></div></div>`;
  const sorted=a.all.slice().sort((x,y)=>SEV[y.p]-SEV[x.p]||days(y.cr)-days(x.cr));
  const stories=a.st.slice().sort((x,y)=>(y.sf==='Shipped')-(x.sf==='Shipped')||String(y.mo).localeCompare(String(x.mo)));
  return `<tr class="detail"><td colspan="14">
    <div class="dgrid">
      <div>
        <div class="eyebrow">Shipped and in flight for ${esc(shortName(c.name))} · ${a.st.length} named ${a.st.length===1?'story':'stories'}</div>
        <div class="dlist">${stories.length?stories.map(s=>storyFull(s)).join(''):'<div class="empty" style="padding:14px">No 2026 story carries this client’s label. They still received the '+D.platformCount+' platform stories, none of which are recorded against them.</div>'}</div>
        <div class="eyebrow">Open bugs · ${a.all.length}${scope==='both'?' ('+a.rep.length+' reported by them, '+a.aff.length+' affected only)':''}</div>
        <div class="dlist">${sorted.length?sorted.map(bug).join(''):'<div class="empty" style="padding:14px">Nothing open.</div>'}</div>
        ${a.inc.length?`<div class="eyebrow">Incidents, last 180 days · ${a.inc.length}</div><div class="dlist">${a.inc.map(inc).join('')}</div>`:''}
      </div>
      <div>
        <div class="eyebrow">Account</div>
        <dl class="kv">
          <dt>Tier</dt><dd>${c.tier?'Tier '+c.tier:'—'}</dd>
          <dt>Owner</dt><dd>${esc(c.owner||'—')}</dd>
          <dt>Health</dt><dd>${c.health==null?'—':c.health}${c.sentiment!=null?' · sentiment '+c.sentiment:''}</dd>
          <dt>Renewal</dt><dd>${esc(c.renewal||'—')}</dd>
          <dt>Customer since</dt><dd>${esc(c.customerSince||'—')}</dd>
          <dt>Last touch</dt><dd>${esc(c.lastTouch||'—')}</dd>
          <dt>Events booked</dt><dd>${c.eventCount||0}${c.nextEvent?' · next '+esc(c.nextEvent.n)+' '+fmtDate(c.nextEvent.s):''}</dd>
          <dt>Jira labels</dt><dd>${c.deliveryTags&&c.deliveryTags.length?esc(c.deliveryTags.join(', ')):'<span class="zero">none on the delivery side</span>'}</dd>
        </dl>
        ${ilDetail(a,L)}
        <div class="eyebrow">Health factors</div>
        ${c.incScore==null?'<div class="small" style="color:var(--muted)">Not computed: company is not Phase = Active in Planhat.</div>':`<dl class="kv">
          <dt>Incident Score</dt><dd>${c.incScore} <span class="small">of ${LV('range-incident')} → -${penParts(c)[0].toFixed(1)}</span></dd>
          <dt>Open Bug Weight</dt><dd>${c.ocbw} <span class="small">of ${LV('range-ocbw')} → -${penParts(c)[1].toFixed(1)}</span></dd>
          <dt>Client Bug Score</dt><dd>${c.cbs} <span class="small">of ${LV('range-cbs')} → -${penParts(c)[2].toFixed(1)}</span></dd>
          <dt>Total penalty</dt><dd><b>-${a.pen.toFixed(1)}</b> of -${LV('cap-total')} <span class="fac"><b class="i" style="width:${penParts(c)[0]/LV('cap-total')*100}%"></b><b class="o" style="width:${penParts(c)[1]/LV('cap-total')*100}%"></b><b class="h" style="width:${penParts(c)[2]/LV('cap-total')*100}%"></b></span></dd>
        </dl>${c.breakdown?`<p class="small" style="font-size:12px;color:var(--muted);margin-top:8px">${esc(c.breakdown)}</p>`:''}`}
      </div>
    </div></td></tr>`;
}
function openClient(pd){
  openPd=openPd===pd?null:pd;
  if(openPd){balFilter='';document.querySelectorAll('#f-bal button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v==='')));
    document.getElementById('f-tier').value='';document.getElementById('f-owner').value='';document.getElementById('f-search').value='';}
  showTab('ledger');renderLedger();
  if(openPd){const r=document.querySelector(`#tb-ledger tr[data-pd="${openPd}"]`);if(r)r.scrollIntoView({block:'center',behavior:'smooth'})}
}
document.getElementById('tb-ledger').addEventListener('click',e=>{const r=e.target.closest('tr.row');if(r&&!e.target.closest('a'))openClient(r.dataset.pd)});
document.querySelectorAll('#t-ledger th').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;if(!k)return;if(sortK===k)sortDir*=-1;else{sortK=k;sortDir=-1}renderLedger()}));
['f-tier','f-owner','f-search'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{openPd=null;renderLedger()}));
document.getElementById('f-scope').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;scope=b.dataset.v;
  document.querySelectorAll('#f-scope button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));TLIX=tlIndex();renderLedger();renderTimeline()});
document.getElementById('f-bal').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;balFilter=b.dataset.v;openPd=null;
  document.querySelectorAll('#f-bal button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLedger()});

// ----- DELIVERY tab
let pinnedMonth='';
function deliveryFiltered(){
  const cl=document.getElementById('d-client').value, ln=document.getElementById('d-lens').value,
        tm=document.getElementById('d-team').value, st=document.getElementById('d-status').value,
        bv=document.getElementById('d-bv').value, q=document.getElementById('d-search').value.trim().toLowerCase();
  return D.stories.filter(s=>(!cl||s.pds.includes(cl))&&(!ln||s.lens===ln)&&(!tm||s.team===tm)&&(!st||s.sf===st)&&(!bv||s.bv===bv)
    &&(!pinnedMonth||s.mo===pinnedMonth)
    &&(!q||(s.s||'').toLowerCase().includes(q)||s.k.toLowerCase().includes(q)||(s.ep||'').toLowerCase().includes(q)||(s.ek||'').toLowerCase().includes(q)));
}
function chartMonths(list){
  const counts=D.months.map(m=>list.filter(s=>s.mo===m).length);
  const max=Math.max(1,...counts);
  const el=document.getElementById('chart-months');
  el.innerHTML='<div class="spark">'+D.months.map((m,i)=>{
    const peak=counts[i]===max&&max>0;
    return `<div class="col${peak?' peak':''}${pinnedMonth===m?' sel':''}" data-m="${m}" title="${D.monthLabels[i]}: ${counts[i]} stories">
      <span class="n">${counts[i]}</span><div class="bw"><div class="b" style="height:${Math.max(2,counts[i]/max*96)}px"></div></div><span class="l">${D.monthLabels[i]}</span></div>`;
  }).join('')+'</div>';
  el.querySelectorAll('.col').forEach(c=>c.addEventListener('click',()=>{pinnedMonth=pinnedMonth===c.dataset.m?'':c.dataset.m;renderDelivery()}));
}
function chartLens(list){
  const rows=D.lenses.map(l=>{
    const named=list.filter(s=>s.lens===l.key&&s.pds.length).length;
    const plat=list.filter(s=>s.lens===l.key&&!s.pds.length).length;
    return {label:l.full,total:named+plat,segs:[{v:named,fill:C.ship},{v:plat,fill:C.ship,hatch:true}],
      tipHtml:`<br>${named} named to a client · ${plat} platform`,
      onclick:()=>{document.getElementById('d-lens').value=l.key;renderDelivery()}};
  }).filter(r=>r.total).sort((a,b)=>b.total-a.total);
  hbars(document.getElementById('chart-lens'),rows,{aria:'Stories by theme',ticks:4,lw:210,ml:26});
}
function renderDelivery(){
  const list=deliveryFiltered();
  document.getElementById('d-count').textContent=list.length+' of '+D.stories.length+' stories'+(pinnedMonth?' · '+fmtMo(pinnedMonth)+' pinned':'');
  if(dview==='tl'){ renderDeliveryTL(list); return; }
  if(dview==='ep'){ renderDeliveryEpics(list); return; }
  const named=list.filter(s=>s.pds.length).sort((a,b)=>(b.sf==='Shipped')-(a.sf==='Shipped')||String(b.mo).localeCompare(String(a.mo)));
  const plat=list.filter(s=>!s.pds.length).sort((a,b)=>String(b.mo).localeCompare(String(a.mo)));
  const nel=document.getElementById('d-named');
  nel.innerHTML=named.length?named.map(s=>storyFull(s)).join(''):'<div class="empty">No client-named story matches these filters.</div>';
  const pel=document.getElementById('d-platform');
  const cap=LV('platform-cap');
  pel.innerHTML=plat.length?plat.slice(0,cap).map(s=>storyFull(s)).join('')+(plat.length>cap?`<div class="empty">Showing the ${cap} most recent of ${plat.length}. Filter to narrow.</div>`:''):'<div class="empty">No platform story matches these filters.</div>';
  document.getElementById('d-platform-sub').textContent=plat.length+' stories, not named to any client';
  chartMonths(list); chartLens(list);
}
document.getElementById('d-platform-toggle').addEventListener('click',function(){
  const open=this.getAttribute('aria-expanded')==='true';
  this.setAttribute('aria-expanded',String(!open));
  document.getElementById('d-platform').hidden=open;
});
['d-client','d-lens','d-team','d-status','d-bv','d-search'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{renderDelivery()}));

// ----- BUGS tab
let bSortK='p',bSortDir=-1;
function bugsFiltered(){
  const pr=document.getElementById('b-pr').value,team=document.getElementById('b-team').value,cl=document.getElementById('b-client').value,
        st=document.getElementById('b-status').value,t12=document.getElementById('b-t12').checked,q=document.getElementById('b-search').value.trim().toLowerCase();
  return D.bugs.filter(b=>(!pr||b.p===pr)&&(!team||(b.team||'No team')===team)&&(!cl||b.repIds.includes(cl)||b.affIds.includes(cl))&&(!st||b.sc===st)
    &&(!q||(b.s||'').toLowerCase().includes(q)||b.key.toLowerCase().includes(q))
    &&(!t12||b.repIds.concat(b.affIds).some(id=>byId[id]&&byId[id].tier<=2)));
}
function clientsOf(b){
  const ids=[...new Set(b.repIds.concat(b.affIds))];
  return ids.map(id=>shortName((byId[id]||{}).name||id));
}
function renderBugs(){
  const list=bugsFiltered();
  const key={key:b=>b.key,p:b=>SEV[b.p]||0,s:b=>(b.s||'').toLowerCase(),client:b=>clientsOf(b)[0]||'zz',team:b=>b.team||'zz',st:b=>b.st,age:b=>days(b.cr),eid:b=>b.eid||''}[bSortK];
  list.sort((x,y)=>{const A=key(x),B=key(y);return (A<B?-1:A>B?1:0)*bSortDir});
  document.getElementById('b-count').textContent=list.length+' of '+D.bugs.length+' bugs';
  document.querySelectorAll('#t-bugs th').forEach(th=>{th.removeAttribute('aria-sort');if(th.dataset.k===bSortK)th.setAttribute('aria-sort',bSortDir===1?'ascending':'descending')});
  document.getElementById('tb-bugs').innerHTML=list.map(b=>{
    const cls=clientsOf(b), t1=b.repIds.concat(b.affIds).some(id=>byId[id]&&byId[id].tier===1);
    return `<tr${t1?' class="tier1"':''}><td><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a></td>
      <td><span class="pr ${b.p}">${b.p}</span></td>
      <td>${esc(b.s)}${b.ev?`<div class="small">${esc(b.ev)}</div>`:''}</td>
      <td>${esc(cls.join(', ')||'—')}</td><td>${esc(b.team||'—')}</td>
      <td><span class="status ${b.sc==='new'?'new':'progress'}">${esc(b.st)}</span></td>
      <td class="num thin">${days(b.cr)}</td><td>${esc(b.eid||'')||'<span class="zero">—</span>'}</td></tr>`;
  }).join('')||'<tr><td colspan="8" class="empty">No bugs match these filters.</td></tr>';
  chartBugClients(list); chartAge(list);
}
function chartBugClients(bugs){
  const m={};
  bugs.forEach(b=>{b.repIds.forEach(id=>{m[id]=m[id]||{rep:{Urgent:0,High:0,Medium:0,Low:0},aff:{Urgent:0,High:0,Medium:0,Low:0}};m[id].rep[b.p]++});
    b.affIds.forEach(id=>{m[id]=m[id]||{rep:{Urgent:0,High:0,Medium:0,Low:0},aff:{Urgent:0,High:0,Medium:0,Low:0}};m[id].aff[b.p]++})});
  const rows=Object.entries(m).map(([id,c])=>{
    const segs=[];PRI.forEach(p=>{if(c.rep[p])segs.push({v:c.rep[p],fill:PFILL[p]});if(c.aff[p])segs.push({v:c.aff[p],fill:PFILL[p],hatch:true})});
    const tot=PRI.reduce((a,p)=>a+c.rep[p]+c.aff[p],0);
    return {label:shortName((byId[id]||{}).name||id),total:tot,segs,sev:PRI.reduce((a,p)=>a+SEV[p]*(c.rep[p]+c.aff[p]),0),
      tipHtml:'<br>'+PRI.map(p=>`${p} ${c.rep[p]+c.aff[p]}`).join(' · '),onclick:()=>openClient(id)};
  }).sort((a,b)=>b.sev-a.sev).slice(0,LV('top-bugclients'));
  hbars(document.getElementById('chart-bugclients'),rows,{aria:'Open bugs by client',ticks:4});
}
function chartAge(bugs){
  const b1=+LV('age-b1'),b2=+LV('age-b2'),b3=+LV('age-b3'),b4=+LV('age-b4');
  const bins=[['< '+b1+' days',0,b1],[b1+' to '+b2,b1,b2],[b2+' to '+b3,b2,b3],[b3+' to '+b4,b3,b4],['over '+b4,b4,1e9]];
  const rows=bins.map(([l,a,z])=>{const c={Urgent:0,High:0,Medium:0,Low:0};bugs.forEach(b=>{const d=days(b.cr);if(d>=a&&d<z)c[b.p]++});
    return{label:l,total:PRI.reduce((s,p)=>s+c[p],0),segs:PRI.map(p=>({v:c[p],fill:PFILL[p]})),tipHtml:'<br>'+PRI.map(p=>`${p} ${c[p]}`).join(' · ')}});
  hbars(document.getElementById('chart-age'),rows,{aria:'Age of open client bugs',ticks:4,lw:110});
}
['b-pr','b-team','b-client','b-status','b-search'].forEach(id=>document.getElementById(id).addEventListener('input',renderBugs));
document.getElementById('b-t12').addEventListener('change',renderBugs);
document.querySelectorAll('#t-bugs th').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;if(!k)return;if(bSortK===k)bSortDir*=-1;else{bSortK=k;bSortDir=-1}renderBugs()}));

// ----- INCIDENTS tab
function chartInc(){
  const m={};D.incidents.forEach(i=>i.ids.forEach(id=>{m[id]=m[id]||{live:0,canc:0};if(i.st==='Cancelled')m[id].canc++;else m[id].live++}));
  const rows=Object.entries(m).map(([id,c])=>({label:shortName((byId[id]||{}).name||id),total:c.live+c.canc,
    segs:[{v:c.live,fill:C.inc},{v:c.canc,fill:C.incSoft}],tipHtml:`<br>${c.live} counted · ${c.canc} cancelled`,
    onclick:()=>openClient(id)})).sort((a,b)=>b.total-a.total).slice(0,LV('top-incidents'));
  hbars(document.getElementById('chart-inc'),rows,{aria:'Incidents per client',ticks:4});
}
function renderInc(){
  const rows=D.incidents.slice().sort((a,b)=>String(b.cr).localeCompare(String(a.cr)));
  document.getElementById('tb-inc').innerHTML=rows.map(i=>`<tr><td><a href="${jira(i.key)}" target="_blank" rel="noopener">${esc(i.key)}</a></td>
    <td><span class="pr ${i.p}">${i.p}</span></td><td>${esc(i.s)}</td>
    <td>${esc(i.ids.map(id=>shortName((byId[id]||{}).name||id)).join(', ')||'—')}</td>
    <td>${esc(i.ev||'')||'<span class="zero">—</span>'}</td><td><span class="status">${esc(i.st)}</span></td><td class="thin">${fmtDate(i.cr)}</td></tr>`).join('');
  chartInc();
}

// ----- MODEL table
function renderModel(){
  const rows=D.companies.filter(c=>c.incScore!=null).map(c=>({c,p:penParts(c)})).sort((a,b)=>(b.p[0]+b.p[1]+b.p[2])-(a.p[0]+a.p[1]+a.p[2]));
  document.getElementById('tb-model').innerHTML=rows.map(({c,p})=>`<tr class="row${c.tier===1?' tier1':''}" data-pd="${c.pd}" style="cursor:pointer">
    <td><span class="name">${esc(shortName(c.name))}</span></td><td class="num">${c.tier||'—'}</td>
    <td class="num"><span class="health ${healthCls(c.health)}">${c.health==null?'—':Math.round(c.health)}</span></td>
    <td class="num thin">${c.incScore}</td><td class="num thin">${c.ocbw}</td><td class="num thin">${c.cbs}</td>
    <td class="small">${esc(c.breakdown||'')}</td></tr>`).join('');
}
document.getElementById('tb-model').addEventListener('click',e=>{const r=e.target.closest('tr.row');if(r)openClient(r.dataset.pd)});


// ===== TIMELINE: client x month =====
const TLM=['pre'].concat(D.months);
const TLLAB={pre:'Pre-2026'}; D.months.forEach((m,i)=>TLLAB[m]=D.monthLabels[i]);
const moOf=d=>d?d.slice(0,7):null;
const bucket=d=>{const m=moOf(d);if(!m)return null;return D.months.indexOf(m)>=0?m:(m<'2026-01'?'pre':null)};
const TIERS=[{k:1,l:'Tier 1',c:'var(--tier1)'},{k:2,l:'Tier 2',c:'var(--tier2)'},{k:3,l:'Tier 3',c:'var(--tier3)'},{k:4,l:'Tier 4',c:'var(--tier4)'},{k:null,l:'No tier in Planhat',c:'var(--tier0)'}];
let tlTypes='all', tlRows='active';

// index every dated item into client x month buckets
function tlIndex(){
  const ix={};
  const put=(pd,b,kind,item)=>{if(!pd||!b)return;ix[pd]=ix[pd]||{};ix[pd][b]=ix[pd][b]||{ship:[],prog:[],bugs:[],inc:[]};ix[pd][b][kind].push(item)};
  D.companies.forEach(c=>{
    (c.storyKeys||[]).forEach(k=>{const s=storyByKey[k];if(!s)return;const b=bucket(s.mo+'-01');
      put(c.pd,b,s.sf==='Shipped'?'ship':'prog',s)});
  });
  D.bugs.forEach(b=>{const bk=bucket(b.cr);
    const ids=scope==='rep'?b.repIds:[...new Set(b.repIds.concat(b.affIds))];
    ids.forEach(id=>put(id,bk,'bugs',b))});
  D.incidents.forEach(i=>{const bk=bucket(i.cr);i.ids.forEach(id=>put(id,bk,'inc',i))});
  return ix;
}
let TLIX=tlIndex();
function cellCounts(cell){
  if(!cell)return{give:0,pain:0,segsG:[],segsP:[]};
  const useG=tlTypes!=='pain', useP=tlTypes!=='give';
  const g=useG?cell.ship.length+cell.prog.length:0;
  const p=useP?cell.bugs.length+cell.inc.length:0;
  const segsG=useG?[{v:cell.ship.length,f:C.ship},{v:cell.prog.length,f:C.prog}]:[];
  const cnt={Urgent:0,High:0,Medium:0,Low:0}; cell.bugs.forEach(b=>cnt[b.p]=(cnt[b.p]||0)+1);
  const segsP=useP?[{v:cnt.Urgent,f:PFILL.Urgent},{v:cnt.High,f:PFILL.High},{v:cnt.Medium,f:PFILL.Medium},{v:cnt.Low,f:PFILL.Low},{v:cell.inc.length,f:C.inc}]:[];
  return {give:g,pain:p,segsG,segsP};
}
function tlClients(){
  const tier=document.getElementById('t-tier').value, owner=document.getElementById('t-owner').value,
        q=document.getElementById('t-search').value.trim().toLowerCase();
  return D.companies.filter(c=>(!tier||String(c.tier)===tier)&&(!owner||c.owner===owner)&&(!q||c.name.toLowerCase().includes(q))
    &&(tlRows==='all'||EVIX[c.pd]||TLM.some(m=>{const x=(TLIX[c.pd]||{})[m];if(!x)return false;const k=cellCounts(x);return k.give+k.pain>0})));
}
function strip(segs,total,max,cls){
  if(!total) return `<div class="strip nil"></div>`;
  const w=Math.max(12,Math.round(total/max*100));
  return `<div class="strip" style="width:${w}%">`+segs.filter(s=>s.v).map(s=>`<b style="background:${s.f};flex:${s.v}"></b>`).join('')+`</div>`;
}
function renderTimeline(){
  const list=tlClients();
  const el=document.getElementById('tl');
  // scale against the busiest visible cell
  let max=1;
  list.forEach(c=>TLM.forEach(m=>{const k=cellCounts((TLIX[c.pd]||{})[m]);max=Math.max(max,k.give,k.pain)}));
  document.getElementById('t-count').textContent=list.length+' of '+D.companies.length+' clients';
  let h=`<div class="hd first">Client</div>`+TLM.map(m=>`<div class="hd${m==='pre'?' pre':''}">${TLLAB[m]}</div>`).join('');
  TIERS.forEach(t=>{
    const rows=list.filter(c=>(c.tier==null?null:c.tier)===t.k).map(c=>{
      let g=0,p=0;TLM.forEach(m=>{const k=cellCounts((TLIX[c.pd]||{})[m]);g+=k.give;p+=k.pain});
      return {c,g,p,act:g+p};
    }).sort((a,b)=>b.p-a.p||b.g-a.g||shortName(a.c.name).localeCompare(shortName(b.c.name))).map(x=>x.c);
    if(!rows.length)return;
    // band header with per-tier totals
    const tot={};TLM.forEach(m=>{tot[m]={give:0,pain:0}});
    rows.forEach(c=>TLM.forEach(m=>{const k=cellCounts((TLIX[c.pd]||{})[m]);tot[m].give+=k.give;tot[m].pain+=k.pain}));
    const tg=TLM.reduce((a,m)=>a+tot[m].give,0), tp=TLM.reduce((a,m)=>a+tot[m].pain,0);
    h+=`<div class="band"><span class="rail" style="background:${t.c}"></span><span>${esc(t.l)}</span><span class="n">${rows.length} client${rows.length===1?'':'s'} · ${tg} delivered · ${tp} open</span></div>`;
    let tmax=1;TLM.forEach(m=>{tmax=Math.max(tmax,tot[m].give,tot[m].pain)});
    h+=`<div class="cname totrow" style="grid-column:1"><span class="rail" style="background:${t.c}"></span><span class="nm" style="font-weight:700">${esc(t.l)} total</span></div>`;
    TLM.forEach(m=>{const g=tot[m].give,p=tot[m].pain;
      h+=`<div class="cell totrow">${strip([{v:g,f:C.ship}],g,tmax)}${strip([{v:p,f:'var(--sev-high)'}],p,tmax)}<div class="cnt">${g?`<span class="g">${g}</span>`:''}${g&&p?' / ':''}${p?`<span class="p">${p}</span>`:''}${!g&&!p?'·':''}</div></div>`});
    rows.forEach(c=>{
      h+=`<div class="cname"><span class="rail" style="background:${t.c}"></span><span style="min-width:0"><span class="nm">${esc(shortName(c.name))}</span><div class="sub">${c.health==null?'no health':'health '+Math.round(c.health)}${c.owner?' · '+esc(c.owner):''} ${nextEvLabel(c)}</div></span></div>`;
      TLM.forEach(m=>{
        const cell=(TLIX[c.pd]||{})[m], k=cellCounts(cell);
        const evs=m==='pre'?[]:evOf(c.pd,m), sh=evs.filter(isShow);
        const has=k.give+k.pain>0||evs.length>0;
        h+=`<div class="cell${has?' has':''}${evs.length?' ev':''}${m==='2026-09'?' now':''}" ${has?`data-pd="${c.pd}" data-m="${m}" tabindex="0" role="button" aria-label="${esc(shortName(c.name))} ${TLLAB[m]}: ${k.give} delivered, ${k.pain} open${sh.length?', '+sh.length+' event':''}"`:''}>
          ${strip(k.segsG,k.give,max)}${strip(k.segsP,k.pain,max)}
          <div class="cnt">${evs.length?`<span class="e" title="${esc(evs.map(x=>x.n).join(', '))}">${sh.length?'\u25c6':'\u25c7'}</span>`:''}${k.give?`<span class="g">${k.give}</span>`:''}${k.give&&k.pain?' / ':''}${k.pain?`<span class="p">${k.pain}</span>`:''}${!has?'&nbsp;':''}</div></div>`;
      });
    });
  });
  el.style.gridTemplateColumns=`minmax(186px,215px) repeat(${TLM.length},minmax(58px,1fr))`;
  el.innerHTML=h||'<div class="empty" style="padding:30px">No client matches these filters.</div>';
  tlPortfolio(list);
}
function tlPortfolio(list){
  const rows=TLM.map(m=>{
    let ship=0,prog=0,cnt={Urgent:0,High:0,Medium:0,Low:0},inc=0;
    list.forEach(c=>{const x=(TLIX[c.pd]||{})[m];if(!x)return;ship+=x.ship.length;prog+=x.prog.length;inc+=x.inc.length;x.bugs.forEach(b=>cnt[b.p]++)});
    const segs=[];
    if(tlTypes!=='pain'){segs.push({v:ship,fill:C.ship},{v:prog,fill:C.prog})}
    if(tlTypes!=='give'){PRI.forEach(p=>segs.push({v:cnt[p],fill:PFILL[p]}));segs.push({v:inc,fill:'var(--h-bad)'})}
    const total=segs.reduce((a,s)=>a+s.v,0);
    return {label:TLLAB[m],total,segs,
      tipHtml:`<br>${ship} shipped · ${prog} in progress<br>${cnt.Urgent} urgent · ${cnt.High} high · ${cnt.Medium} medium · ${cnt.Low} low bugs raised<br>${inc} incidents`};
  });
  hbars(document.getElementById('chart-tlmonths'),rows,{aria:'Delivery and open issues by month',ticks:6,lw:110,w:1300});
}

// ----- cell popup: every issue type for one client-month
let modalPd=null;
// the review dialog borrows the modal's button through this action, never through onclick: closeModal ran
// first and cleared onclick, so Confirm and save used to do nothing
let modalAction=null;
const modal=document.getElementById('modal');
function openModal(pd,m){
  const c=byId[pd], cell=(TLIX[pd]||{})[m]||{ship:[],prog:[],bugs:[],inc:[]}; if(!c)return;
  modalPd=pd;
  const cnt={Urgent:0,High:0,Medium:0,Low:0}; cell.bugs.forEach(b=>cnt[b.p]=(cnt[b.p]||0)+1);
  document.getElementById('modal-title').textContent=shortName(c.name)+' · '+(m==='pre'?'raised before 2026':fmtMo(m));
  document.getElementById('modal-meta').innerHTML=
    `${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">Tier ${c.tier}</span>`:'<span class="tierpill na">no tier</span>'}`
    +`<span>Health ${c.health==null?'—':Math.round(c.health)}</span>`
    +`<span>${esc(c.owner||'no owner')}</span>`
    +`<span>${cell.ship.length+cell.prog.length} delivered · ${cell.bugs.length} bugs still open · ${cell.inc.length} incidents</span>`;
  let h=m==='pre'?'':evSection(pd,m);
  if(cell.ship.length||cell.prog.length){
    h+=`<div class="seclabel"><i style="background:var(--del-ship)"></i>Delivered<span class="c">${cell.ship.length} shipped${cell.prog.length?', '+cell.prog.length+' in progress':''}</span></div><div class="dlist">`
      +cell.ship.concat(cell.prog).map(s=>storyFull(s)).join('')+'</div>';
  }
  if(cell.bugs.length){
    const sorted=cell.bugs.slice().sort((a,b)=>SEV[b.p]-SEV[a.p]);
    h+=`<div class="seclabel"><i style="background:var(--sev-urgent)"></i>Bugs raised ${m==='pre'?'before 2026':'this month'}, still open<span class="c">`
      +PRI.filter(p=>cnt[p]).map(p=>cnt[p]+' '+p.toLowerCase()).join(' · ')+`</span></div><div class="dlist">`
      +sorted.map(b=>`<div class="bug${b.affIds.includes(pd)&&!b.repIds.includes(pd)?' aff':''}">
        <div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div>
        <div class="s">${esc(b.s)}<div class="m">${esc(b.team||'no team')}${b.ev?' · '+esc(b.ev):''}${b.affIds.includes(pd)&&!b.repIds.includes(pd)?' · affected only, reported elsewhere':''}</div></div>
        <div class="st">${esc(b.st)}<div class="m">${days(b.cr)}d old</div></div></div>`).join('')+'</div>';
  }
  if(cell.inc.length){
    h+=`<div class="seclabel"><i style="background:var(--inc)"></i>Incidents<span class="c">${cell.inc.length}</span></div><div class="dlist">`
      +cell.inc.map(i=>`<div class="bug"><div class="k"><a href="${jira(i.key)}" target="_blank" rel="noopener">${esc(i.key)}</a><br><span class="pr ${i.p}">${i.p}</span></div>
        <div class="s">${esc(i.s)}<div class="m">${esc(i.ev||'no event')}</div></div><div class="st">${esc(i.st)}<div class="m">${fmtDate(i.cr)}</div></div></div>`).join('')+'</div>';
  }
  document.getElementById('modal-open-client').hidden=false;
  document.getElementById('modal-body').innerHTML=h||'<div class="empty">Nothing recorded.</div>';
  const nq=D.bugs.filter(b=>(scope==='rep'?b.repIds:b.repIds.concat(b.affIds)).includes(pd)).length;
  document.getElementById('modal-foot').textContent=`${nq} open in total across all months`;
  modal.setAttribute('open','');
  document.querySelector('.modal .x').focus();
}
function closeModal(){modal.removeAttribute('open');modalPd=null;modalAction=null;
  // the review dialog borrows this button; hand it back so the next client popup is not a save button
  const b=document.getElementById('modal-open-client'); if(b){b.textContent='Open the full client record';}}
modal.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.hasAttribute('open'))closeModal()});
document.getElementById('modal-open-client').addEventListener('click',()=>{
  if(modalAction){const f=modalAction;closeModal();f();return}
  const pd=modalPd;closeModal();if(pd){openPd=null;openClient(pd)}});
document.getElementById('tl').addEventListener('click',e=>{const c=e.target.closest('.cell.has');if(c)openModal(c.dataset.pd,c.dataset.m)});
document.getElementById('tl').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const c=e.target.closest('.cell.has');if(c){e.preventDefault();openModal(c.dataset.pd,c.dataset.m)}});
document.getElementById('tl').addEventListener('mousemove',e=>{
  const c=e.target.closest('.cell.has'); if(!c){hideTip();return}
  const cell=(TLIX[c.dataset.pd]||{})[c.dataset.m]; if(!cell){hideTip();return}
  const cnt={Urgent:0,High:0,Medium:0,Low:0}; cell.bugs.forEach(b=>cnt[b.p]=(cnt[b.p]||0)+1);
  const bits=[];
  if(cell.ship.length)bits.push(cell.ship.length+' shipped');
  if(cell.prog.length)bits.push(cell.prog.length+' in progress');
  PRI.forEach(p=>{if(cnt[p])bits.push(cnt[p]+' '+p.toLowerCase())});
  if(cell.inc.length)bits.push(cell.inc.length+' incident'+(cell.inc.length>1?'s':''));
  showTip(e,`<b>${esc(shortName((byId[c.dataset.pd]||{}).name||''))} · ${c.dataset.m==='pre'?'pre-2026':fmtMo(c.dataset.m)}</b>${bits.join('<br>')}<br><span style="opacity:.75">click for the tickets</span>`);
});
document.getElementById('tl').addEventListener('mouseleave',hideTip);
['t-tier','t-owner','t-search'].forEach(id=>document.getElementById(id).addEventListener('input',renderTimeline));
document.getElementById('t-rows').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tlRows=b.dataset.v;
  document.querySelectorAll('#t-rows button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTimeline()});
document.getElementById('t-types').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tlTypes=b.dataset.v;
  document.querySelectorAll('#t-types button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTimeline()});

// ===== DELIVERY TIMELINE: tier band > client > month, every story behind the cell =====
let dview='tl', dModalRow=null, dModalM=null;
const DM=D.months;
const DMLAB={}; D.months.forEach((m,i)=>DMLAB[m]=D.monthLabels[i]);
const NCS='Not Clearly Specified';
const teamOf=s=>s.team||NCS;
const medianOf=a=>{if(!a.length)return null;const v=a.slice().sort((x,y)=>x-y);const h=v.length>>1;return v.length%2?v[h]:Math.round((v[h-1]+v[h])/2)};
function cycOf(list){return medianOf(list.map(s=>s.cyc).filter(v=>v!=null))}

// one story lands in a client row per client label, or in its team's platform row
function dlIndex(list){
  const ix={};
  const put=(row,m,s)=>{ix[row]=ix[row]||{};ix[row][m]=ix[row][m]||{ship:[],prog:[]};ix[row][m][s.sf==='Shipped'?'ship':'prog'].push(s)};
  list.forEach(s=>{
    if(DM.indexOf(s.mo)<0)return;
    if(s.pds&&s.pds.length)s.pds.forEach(pd=>{if(byId[pd])put('c'+pd,s.mo,s)});
    else put('t:'+teamOf(s),s.mo,s);
  });
  return ix;
}
function dlCell(ix,row,m){return (ix[row]||{})[m]}
function dlN(cell){return cell?cell.ship.length+cell.prog.length:0}
function dlStories(cell){return cell?cell.ship.concat(cell.prog):[]}

// bands: the four tiers, then no-tier, then platform work split by team
const c_pd=r=>r.pd;
function dlBands(ix){
  const out=[];
  TIERS.forEach(t=>{
    const rows=D.companies.filter(c=>(c.tier==null?null:c.tier)===t.k)
      .map(c=>({id:'c'+c.pd,label:shortName(c.name),sub:(c.health==null?'no health':'health '+Math.round(c.health))+(c.owner?' · '+c.owner:''),pd:c.pd,c}))
      .filter(r=>ix[r.id]||EVIX[c_pd(r)])
      .map(r=>{r.n=DM.reduce((a,m)=>a+dlN(dlCell(ix,r.id,m)),0);return r})
      .sort((a,b)=>b.n-a.n||a.label.localeCompare(b.label));
    if(rows.length)out.push({key:'t'+t.k,label:t.l,colour:t.c,unit:'client',rows});
  });
  const teams=[...new Set(D.stories.filter(s=>!(s.pds&&s.pds.length)).map(teamOf))]
    .map(t=>({id:'t:'+t,label:t,sub:'platform work'}))
    .filter(r=>ix[r.id])
    .map(r=>{r.n=DM.reduce((a,m)=>a+dlN(dlCell(ix,r.id,m)),0);return r})
    .sort((a,b)=>b.n-a.n||a.label.localeCompare(b.label));
  if(teams.length)out.push({key:'plat',label:'Platform work — named to no client',colour:'var(--tier0)',unit:'team',rows:teams});
  return out;
}
function dstrip(ship,prog,max){
  const t=ship+prog;
  if(!t)return '<div class="strip nil"></div>';
  const w=Math.max(12,Math.round(t/max*100));
  return `<div class="strip" style="width:${w}%">`+[{v:ship,f:C.ship},{v:prog,f:C.prog}].filter(s=>s.v)
    .map(s=>`<b style="background:${s.f};flex:${s.v}"></b>`).join('')+'</div>';
}
function renderDeliveryTL(list){
  const ix=dlIndex(list); DLIX=ix;
  const bands=dlBands(ix);
  const el=document.getElementById('dtl');
  let max=1;
  bands.forEach(b=>b.rows.forEach(r=>DM.forEach(m=>{max=Math.max(max,dlN(dlCell(ix,r.id,m)))})));
  let h=`<div class="hd first">Client / team</div>`+DM.map(m=>`<div class="hd">${DMLAB[m]}</div>`).join('');
  bands.forEach(b=>{
    const tot={};DM.forEach(m=>tot[m]=0);
    let all=[];
    b.rows.forEach(r=>DM.forEach(m=>{const c=dlCell(ix,r.id,m);tot[m]+=dlN(c);if(c)all=all.concat(dlStories(c))}));
    const bn=DM.reduce((a,m)=>a+tot[m],0), bc=cycOf(all);
    h+=`<div class="band"><span class="rail" style="background:${b.colour}"></span><span>${esc(b.label)}</span>`
     +`<span class="n">${b.rows.length} ${b.unit}${b.rows.length===1?'':'s'} · ${bn} stor${bn===1?'y':'ies'}${bc!=null?' · median '+bc+'d to deliver':''}</span></div>`;
    let tmax=1;DM.forEach(m=>{tmax=Math.max(tmax,tot[m])});
    h+=`<div class="cname totrow" style="grid-column:1"><span class="rail" style="background:${b.colour}"></span><span class="nm" style="font-weight:700">${esc(b.label.split(' — ')[0])} total</span></div>`;
    DM.forEach(m=>{h+=`<div class="cell totrow">${dstrip(tot[m],0,tmax)}<div class="cnt">${tot[m]?`<span class="g">${tot[m]}</span>`:'·'}</div></div>`});
    b.rows.forEach(r=>{
      h+=`<div class="cname"><span class="rail" style="background:${b.colour}"></span><span style="min-width:0"><span class="nm">${esc(r.label)}</span><div class="sub">${esc(r.sub)}${r.c?' '+nextEvLabel(r.c):''}</div></span></div>`;
      DM.forEach(m=>{
        const cell=dlCell(ix,r.id,m), ship=cell?cell.ship.length:0, prog=cell?cell.prog.length:0, n=ship+prog;
        const evs=r.pd?evOf(r.pd,m):[], sh=evs.filter(isShow);
        const hit=n||evs.length;
        h+=`<div class="cell${hit?' has':''}${evs.length?' ev':''}${m==='2026-09'?' now':''}" ${hit?`data-row="${esc(r.id)}" data-m="${m}" data-label="${esc(r.label)}" tabindex="0" role="button" aria-label="${esc(r.label)} ${DMLAB[m]}: ${n} stories${sh.length?', '+sh.length+' event':''}"`:''}>
          ${dstrip(ship,prog,max)}
          <div class="cnt">${evs.length?`<span class="e" title="${esc(evs.map(x=>x.n).join(', '))}">${sh.length?'\u25c6':'\u25c7'}</span>`:''}${n?`<span class="g">${n}</span>`:(evs.length?'':'&nbsp;')}</div></div>`;
      });
    });
  });
  el.style.gridTemplateColumns=`minmax(186px,215px) repeat(${DM.length},minmax(58px,1fr))`;
  el.innerHTML=h||'<div class="empty" style="padding:30px">No story matches these filters.</div>';
  dlPortfolio(list);
  const meas=list.filter(s=>s.cyc!=null), med=cycOf(list);
  document.getElementById('d-cyc-key').innerHTML=med!=null
    ? `Median <b>${med} days</b> from raised to resolved, measurable on ${meas.length} of ${list.length}`
    : 'No delivery time measurable in this filter';
  document.getElementById('d-band-n').textContent=list.length;
  const byCreated=list.filter(s=>s.mb==='created').length;
  const nHv=list.filter(s=>s.hv).length;
  const parts=[];
  if(nHv) parts.push(`${list.length-nHv} EP stories plus ${nHv} Hyve dedicated team items — two separate populations, which is why the tile above counts the ${list.length-nHv} only.`);
  if(byCreated) parts.push(`${byCreated} of these ${list.length} have no resolution date in Jira, so they sit in the month they were raised, not delivered.`);
  document.getElementById('d-band-caveat').textContent=parts.join(' ');
}
function dlPortfolio(list){
  const rows=DM.map(m=>{
    const inM=list.filter(s=>s.mo===m);
    const ship=inM.filter(s=>s.sf==='Shipped').length, prog=inM.length-ship, c=cycOf(inM);
    return {label:DMLAB[m],total:inM.length,segs:[{v:ship,fill:C.ship},{v:prog,fill:C.prog}],
      tipHtml:`<br>${ship} shipped · ${prog} in progress${c!=null?'<br>median '+c+' days to deliver':''}`};
  });
  hbars(document.getElementById('chart-dlmonths'),rows,{aria:'Stories by month',ticks:6,lw:110,w:1300});
}
let DLIX={};

// ----- the cell popup: every story, each expandable to its full analysis
function openDModal(row,m){
  const cell=dlCell(DLIX,row,m)||{ship:[],prog:[]};
  dModalRow=row; dModalM=m;
  const isC=row.charAt(0)==='c'&&row.slice(1).match(/^\d+$/);
  const c=isC?byId[row.slice(1)]:null;
  const name=c?shortName(c.name):row.replace(/^t:/,'');
  const st=dlStories(cell), cyc=cycOf(st);
  document.getElementById('modal-title').textContent=name+' · '+fmtMo(m);
  document.getElementById('modal-meta').innerHTML=
    (c?`${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">Tier ${c.tier}</span>`:'<span class="tierpill na">no tier</span>'}<span>Health ${c.health==null?'—':Math.round(c.health)}</span><span>${esc(c.owner||'no owner')}</span>`
       :'<span class="tierpill na">platform work</span>')
    +`<span>${cell.ship.length} shipped${cell.prog.length?' · '+cell.prog.length+' in progress':''}</span>`
    +(cyc!=null?`<span>median ${cyc}d to deliver</span>`:'<span>no delivery time measurable</span>');
  const evh=c?evSection(c.pd,m):'';
  document.getElementById('modal-body').innerHTML=
    evh
    +(st.length?`<div class="seclabel"><i style="background:var(--del-ship)"></i>Stories<span class="c">click any story for its full analysis</span></div>`
      +`<div class="dlist">`+st.sort((a,b)=>(b.sf==='Shipped')-(a.sf==='Shipped')||a.k.localeCompare(b.k)).map(s=>storyFull(s)).join('')+`</div>`:'')
    ||'<div class="empty">Nothing recorded.</div>';
  const tot=D.stories.filter(s=>isC?(s.pds||[]).includes(row.slice(1)):(!(s.pds&&s.pds.length)&&teamOf(s)===row.slice(2))).length;
  document.getElementById('modal-foot').textContent=`${tot} stories in 2026 for ${name}`;
  document.getElementById('modal-open-client').hidden=!c;
  modalPd=c?c.pd:null;
  modal.setAttribute('open','');
  document.querySelector('.modal .x').focus();
}
document.getElementById('dtl').addEventListener('click',e=>{const c=e.target.closest('.cell.has');if(c)openDModal(c.dataset.row,c.dataset.m)});
document.getElementById('dtl').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const c=e.target.closest('.cell.has');if(c){e.preventDefault();openDModal(c.dataset.row,c.dataset.m)}});
document.getElementById('dtl').addEventListener('mousemove',e=>{
  const el=e.target.closest('.cell.has'); if(!el){hideTip();return}
  const cell=dlCell(DLIX,el.dataset.row,el.dataset.m); if(!cell){hideTip();return}
  const st=dlStories(cell), cyc=cycOf(st), bits=[];
  if(cell.ship.length)bits.push(cell.ship.length+' shipped');
  if(cell.prog.length)bits.push(cell.prog.length+' in progress');
  if(cyc!=null)bits.push('median '+cyc+' days to deliver');
  const raised=st.filter(s=>s.mb==='created').length;
  if(raised)bits.push(raised+' placed by raised date');
  const pd=el.dataset.row.charAt(0)==='c'?el.dataset.row.slice(1):null;
  if(pd)evOf(pd,el.dataset.m).forEach(x=>bits.push('\u25c6 '+x.n+' \u00b7 '+evWhen(x).t));
  showTip(e,`<b>${esc(el.dataset.label||'')} · ${esc(DMLAB[el.dataset.m])}</b>${bits.join('<br>')}<br><span style="opacity:.75">click for every story</span>`);
});
document.getElementById('dtl').addEventListener('mouseleave',hideTip);
// ----- EPICS view: story -> epic from the Jira parent field (dl-epic-hierarchy)
const EPICS=D.epics||{};
let openEpic=null;
function epicCell(s){
  const e=s.ek&&EPICS[s.ek];
  if(!e) return '<span class="sx-dim">no epic in Jira</span>';
  const sib=D.stories.filter(x=>x.ek===s.ek).length;
  return `<a href="${esc(jira(s.ek))}" target="_blank" rel="noopener">${esc(s.ek)}</a> ${esc(e.s)} <span class="sx-dim">· ${sib} ${sib===1?'story':'stories'} in the ledger</span>`;
}
function renderDeliveryEpics(list){
  const g={};
  list.forEach(s=>{const k=s.ek&&EPICS[s.ek]?s.ek:'';(g[k]=g[k]||[]).push(s)});
  const keys=Object.keys(g).filter(k=>k).sort((a,b)=>g[b].length-g[a].length||a.localeCompare(b));
  if(g['']) keys.push('');
  const withEp=list.filter(s=>s.ek&&EPICS[s.ek]).length;
  document.getElementById('d-ep-n').textContent=keys.filter(k=>k).length;
  document.getElementById('d-ep-caveat').textContent=`${withEp} of ${list.length} stories in the filter sit under an epic; ${list.length-withEp} have none.`;
  const el=document.getElementById('d-epics');
  el.innerHTML=keys.length?keys.map(k=>{
    const ss=g[k].slice().sort((a,b)=>String(b.mo).localeCompare(String(a.mo)));
    const ship=ss.filter(s=>s.sf==='Shipped').length, prog=ss.length-ship;
    const mos=ss.map(s=>s.mo).filter(Boolean).sort();
    const span=mos.length?(mos[0]===mos[mos.length-1]?fmtMo(mos[0]):fmtMo(mos[0])+' – '+fmtMo(mos[mos.length-1])):'';
    const lenses=[...new Set(ss.map(s=>s.lens))];
    const e=EPICS[k], named=ss.filter(s=>s.pds.length).length;
    const jst=e?(e.sc==='done'&&prog?' <span class="sx-warn">Jira marks it done, '+prog+' still in progress</span>':e.sc!=='done'&&!prog?' <span class="sx-warn">every story shipped, Jira still says '+esc(e.st)+'</span>':' <span class="sx-dim">Jira: '+esc(e.st)+'</span>'):'';
    const open=openEpic===k;
    return `<div class="sx">
      <button class="sx-top" type="button" data-ept="${esc(k)}" aria-expanded="${open}">
        <span class="k">${k?esc(k):'—'}</span>
        <span class="s">${k?esc(e.s):'<b>No epic</b> — stories with no parent in Jira'}
          <span class="m"><span class="thset">${lenses.map(l=>`<i style="background:${lensColor(l)}" title="${esc(lensName(l))}"></i>`).join('')}</span>${e&&e.team?`<span>${esc(e.team)}</span>`:''}${named?`<span>${named} named to a client</span>`:''}${jst}</span>
        </span>
        <span class="r"><span class="cyc">${ss.length} ${ss.length===1?'story':'stories'}</span>${ship} shipped${prog?' · '+prog+' in progress':''}<span>${esc(span)}</span></span>
        <span class="arw">&rsaquo;</span>
      </button>
      <div class="sx-body"${open?'':' hidden'}>${k?`<a class="sx-link" href="${esc(jira(k))}" target="_blank" rel="noopener">Open ${esc(k)} in Jira</a>`:''}
        <div class="dlist" style="margin-top:10px">${open?ss.map(s=>storyFull(s)).join(''):''}</div></div>
    </div>`;
  }).join(''):'<div class="empty">No story matches these filters.</div>';
}
document.getElementById('d-epics').addEventListener('click',e=>{
  const b=e.target.closest('[data-ept]'); if(!b)return;
  const k=b.dataset.ept; openEpic=openEpic===k?null:k; renderDeliveryEpics(deliveryFiltered());
});
document.getElementById('d-view').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  dview=b.dataset.v;
  document.querySelectorAll('#d-view button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  document.getElementById('d-tl-view').hidden=dview!=='tl';
  document.getElementById('d-list-view').hidden=dview!=='list';
  document.getElementById('d-ep-view').hidden=dview!=='ep';
  renderDelivery();
});

// ===== EVENTS: the deadline layer on both timelines =====
const EVK={event:'Show',community:'Community',other:'Engagement',eplite:'EP Lite'};
const EVENTS=D.events||[];
const TODAY_S=D.eventsAsOf||D.asOf;
const dnum=s=>s?Math.round((new Date(s+'T00:00:00Z')-new Date(TODAY_S+'T00:00:00Z'))/86400000):null;
// a show is a dated deadline; community and engagement records run for a year and are not
const isShow=e=>e.kind==='event'&&!e.bad;
// index events by client and by month touched (an event spanning a month boundary marks both)
const EVIX={};
EVENTS.forEach(e=>{
  if(!e.pd||!e.s)return;
  const a=e.s.slice(0,7), b=(e.e||e.s).slice(0,7);
  const ms=new Set([a,b]);
  ms.forEach(m=>{(EVIX[e.pd]=EVIX[e.pd]||{})[m]=((EVIX[e.pd]||{})[m]||[]).concat([e])});
});
const evOf=(pd,m)=>((EVIX[pd]||{})[m]||[]);
const showsOf=(pd,m)=>evOf(pd,m).filter(isShow);
function evWhen(e){
  const a=dnum(e.s), b=dnum(e.e);
  if(a<=0&&b>=0)return{cls:'now',t:'running now'};
  if(a>0)return{cls:'soon',t:'in '+a+(a===1?' day':' days')};
  return{cls:'past',t:Math.abs(b)+(Math.abs(b)===1?' day':' days')+' ago'};
}
function evDates(e){
  return e.s===e.e?fmtDate(e.s):fmtDate(e.s)+' to '+fmtDate(e.e);
}
// the story-to-event read: the client's first show starting on or after the story landed
function storyEvent(s){
  if(!s.pds||!s.pds.length)return null;
  const when=s.rd||(s.mo+'-28');
  let best=null;
  s.pds.forEach(pd=>EVENTS.forEach(e=>{
    if(e.pd!==pd||!isShow(e)||!e.s||e.s<when)return;
    if(!best||e.s<best.e.s)best={e,pd,gap:Math.round((new Date(e.s+'T00:00:00Z')-new Date(when+'T00:00:00Z'))/86400000)};
  }));
  return best;
}
function evChips(list,max){
  return list.slice(0,max||3).map(e=>{const w=evWhen(e);
    return `<span class="evchip ${w.cls}"><i></i>${esc(e.n)}<b>${w.t}</b></span>`}).join('')
    +(list.length>(max||3)?`<span class="evchip more">+${list.length-(max||3)} more</span>`:'');
}
function evSection(pd,m){
  const list=evOf(pd,m); if(!list.length)return '';
  return `<div class="seclabel"><i style="background:var(--evt)"></i>Events this month<span class="c">${list.length}</span></div>`
   +`<div class="dlist">`+list.map(e=>{const w=evWhen(e);
      return `<div class="evrow ${w.cls}">
        <div class="k"><a href="${jira(e.k)}" target="_blank" rel="noopener">${esc(e.k)}</a><br><span class="evkind">${esc(EVK[e.kind]||e.kind)}</span></div>
        <div class="s">${esc(e.n)}<div class="m">${esc(evDates(e))}${e.reg?' · '+esc(e.reg):''}${e.ctry?' · '+esc(e.ctry):''}${e.drift?' · <span class="sx-warn">workbook said '+esc(e.drift.s)+'</span>':''}</div></div>
        <div class="st">${esc(w.t)}<div class="m">${esc(e.st)}</div></div></div>`}).join('')+`</div>`;
}
// the row sub-label: what is next for this client
function nextEvLabel(c){
  const n=c.nextEvent; if(!n)return '';
  return n.now?'<span class="nev now" title="'+esc(n.n)+'">show on now</span>'
    :`<span class="nev${n.in<=30?' soon':''}" title="${esc(n.n)} \u00b7 ${esc(fmtDate(n.s))}">show ${n.in}d</span>`;
}

// ===== shared: a plain information modal (risk cells, pipeline cells, flow rows) =====
function openInfoModal(title,metaHtml,bodyHtml,footHtml){
  modalPd=null;
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-meta').innerHTML=metaHtml||'';
  document.getElementById('modal-body').innerHTML=bodyHtml||'<div class="empty">Nothing recorded.</div>';
  document.getElementById('modal-open-client').hidden=true;
  document.getElementById('modal-foot').innerHTML=footHtml||'';
  modal.setAttribute('open','');
  document.querySelector('.modal .x').focus();
}
document.getElementById('modal-body').addEventListener('click',e=>{
  const b=e.target.closest('[data-rkopen]'); if(!b)return;
  const pd=b.dataset.rkopen; closeModal(); openPd=null; openClient(pd);
});

// ===== RISK: tier x next-show window (spec v1 §1, rules rk-*) =====
const RK_TIERS=[{k:1,l:'Tier 1',c:'var(--tier1)'},{k:2,l:'Tier 2',c:'var(--tier2)'},{k:3,l:'Tier 3',c:'var(--tier3)'},{k:4,l:'Tier 4',c:'var(--tier4)'},{k:null,l:'No tier',c:'var(--tier0)'}];
const tierKey=c=>c.tier==null?'n':String(c.tier);
// dated shows starting inside a window for one client; a show already running counts in the first window
function showsIn(pd,w){
  const lo={w30:-1e9,w60:+LV('rk-window-30'),w90:+LV('rk-window-60')}[w], hi={w30:+LV('rk-window-30'),w60:+LV('rk-window-60'),w90:+LV('rk-window-90')}[w];
  if(lo===undefined) return 0;
  return EVENTS.filter(e=>e.pd===pd&&isShow(e)&&e.s&&dnum(e.e||e.s)>=0&&dnum(e.s)>lo&&dnum(e.s)<=hi).length;
}
function cellStats(list,w){
  return {
    n:list.length,
    shows:w==='none'?null:list.reduce((s,a)=>s+Math.max(1,showsIn(a.c.pd,w)),0),
    uh:list.reduce((s,a)=>s+a.cnt.Urgent+a.cnt.High,0),
    old:list.reduce((m,a)=>a.oldest!=null&&a.oldest>m?a.oldest:m,-1),
    red:list.filter(a=>a.exp.lv==='red').length,
    amber:list.filter(a=>a.exp.lv==='amber').length,
    nodate:list.filter(a=>!a.exp.next).length
  };
}
function renderRisk(){
  const el=document.getElementById('risk'); if(!el) return;
  const aggs=D.companies.map(agg), cells={}, tierN={};
  aggs.forEach(a=>{const k=tierKey(a.c)+'|'+a.exp.win;(cells[k]=cells[k]||[]).push(a);tierN[tierKey(a.c)]=(tierN[tierKey(a.c)]||0)+1});
  let g=`<div class="rk-h rk-corner">Tier, then days to the next show</div>`+WINS.map(w=>`<div class="rk-h">${esc(w.l())}</div>`).join('');
  RK_TIERS.forEach(t=>{
    const tk=t.k==null?'n':String(t.k), tn=tierN[tk]||0;
    g+=`<div class="rk-t" style="--rail:${t.c}"><b>${t.l}</b><span>${tn} client${tn===1?'':'s'}</span></div>`;
    WINS.forEach(w=>{
      const list=cells[tk+'|'+w.k]||[];
      if(!list.length){g+=`<div class="rk-c empty" role="gridcell" aria-label="${t.l}, ${esc(w.l())}: no clients"><span>·</span></div>`;return}
      const s=cellStats(list,w.k);
      const lead=w.k==='none'
        ?`<span class="rk-n">${s.n}</span><span class="rk-u">client${s.n===1?'':'s'}</span>`
        :`<span class="rk-n">${s.shows}</span><span class="rk-u">show${s.shows===1?'':'s'}</span>`;
      const sub=w.k==='none'?`${s.nodate} with no dated show`:`${s.n} client${s.n===1?'':'s'}`;
      const flags=(s.red?`<span class="rk red">${s.red} red</span>`:'')+(s.amber?`<span class="rk amber">${s.amber} amber</span>`:'');
      g+=`<button type="button" class="rk-c${s.red?' lv-red':s.amber?' lv-amber':''}" data-rkt="${tk}" data-rkw="${w.k}" aria-label="${t.l}, ${esc(w.l())}: ${w.k==='none'?s.n+' clients':s.shows+' shows'}, ${s.uh} Urgent or High open${s.red?', '+s.red+' red':''}${s.amber?', '+s.amber+' amber':''}">
        <span class="rk-top">${lead}</span>
        <span class="rk-l"><b>${s.uh}</b> Urgent + High open</span>
        <span class="rk-l">${s.old>=0?'oldest open bug <b>'+s.old+'d</b>':'no open bug'}</span>
        ${flags?`<span class="rk-f">${flags}</span>`:''}
        <span class="rk-cl">${sub}</span></button>`;
    });
  });
  const fired={}; aggs.forEach(a=>a.exp.flags.forEach(f=>{fired[f.id]=(fired[f.id]||0)+1}));
  const reds=aggs.filter(a=>a.exp.lv==='red').length, ambers=aggs.filter(a=>a.exp.lv==='amber').length;
  const driven=PIPE.filter(r=>/^\d+$/.test(String((r.v||{}).driver||''))), unset=PIPE.filter(r=>!String((r.v||{}).driver||'').trim());
  const broken=aggs.reduce((s,a)=>s+((a.exp.flags.find(f=>f.id==='rk-promise-broken')||{}).items||[]).length,0);
  const placed=RK_TIERS.reduce((s,t)=>s+(tierN[t.k==null?'n':String(t.k)]||0),0);
  const promise=!PIPE_READY
    ?'<b>Promise-versus-show: awaiting data.</b> The pipeline ledger has not loaded in this view, so the rule cannot run. It reads nothing here rather than zero.'
    :`<b>Promise-versus-show:</b> ${broken} broken of ${driven.length} pipeline item${driven.length===1?'':'s'} with a client Driver. `
      +(unset.length?`<b>${unset.length} of ${PIPE.length}</b> have no Driver and cannot be checked; set it on the Pipeline tab.`:'Every pipeline item has a Driver.');
  el.innerHTML=`<h3>Risk by tier and next show</h3>
    <div class="note">Every client sits in exactly one cell: Planhat tier down, days to the start of its next dated show across (rk-window-*). A cell counts the shows starting in its window, the Urgent and High bugs open on its clients, and the oldest open bug. Red and amber are rules invented here (rk-*); every flag says in words which rule fired. Tier is never blended into a score, open stories are not counted (rk-stories-excluded), and bugs follow the Ledger tab's “Bugs counted” setting. Click a cell for its clients.</div>
    <div class="rk-wrap"><div class="rk-grid" role="grid" aria-label="Clients by tier and days to their next show">${g}</div></div>
    <div class="rk-foot">
      <div><span class="rk red">red</span> <b>${reds}</b> client${reds===1?'':'s'} · Urgent on Tier 1–2 within ${LV('rk-urgent-t12')} days: ${fired['rk-urgent-t12']||0} · High within ${LV('rk-high-days')} days: ${fired['rk-high-days']||0} · broken promise: ${fired['rk-promise-broken']||0}</div>
      <div><span class="rk amber">amber</span> <b>${ambers}</b> client${ambers===1?'':'s'} · open bug older than ${LV('rk-ageing-days')} days with a show within ${LV('rk-window-60')}: ${fired['rk-ageing-days']||0} · no dated show, with an Urgent or a High older than ${LV('rk-always-on-days')} days: ${fired['rk-always-on-days']||0}</div>
      <div>${promise}</div>
      <div><b>Tier coverage:</b> ${placed} of ${D.companies.length} clients in exactly one row${placed===D.companies.length?'':' <b class="rk-bad">check failed</b>'} (rk-no-tier-row).</div>
    </div>`;
}
function openRiskModal(tk,wk){
  const list=D.companies.map(agg).filter(a=>tierKey(a.c)===String(tk)&&a.exp.win===wk).sort((x,y)=>expRank(y)-expRank(x)||y.liab-x.liab);
  const t=RK_TIERS.find(x=>(x.k==null?'n':String(x.k))===String(tk)), w=WINS.find(x=>x.k===wk);
  const s=cellStats(list,wk);
  const body=list.map(a=>{const e=a.exp;
    return `<div class="rkrow${e.lv?' '+e.lv:''}">
      <div class="k"><button type="button" class="linkbtn" data-rkopen="${a.c.pd}">${esc(shortName(a.c.name))}</button><div class="m">${a.c.tier?'Tier '+a.c.tier:'no tier'} · liability ${fmt1(a.liab)} · investment ${a.inv}</div></div>
      <div class="s">${e.next?`${esc(e.next.n)} <span class="m">${fmtDate(e.next.s)} · ${e.next.now?'running now':'in '+e.days+' days'}</span>`:'<span class="m">no dated show</span>'}
        <div class="m">${a.cnt.Urgent} Urgent · ${a.cnt.High} High · ${a.cnt.Medium} Medium · ${a.cnt.Low} Low open${a.oldest!=null?' · oldest '+a.oldest+'d':''} · ${a.live.length} incident${a.live.length===1?'':'s'}</div>
        ${e.flags.map(f=>`<div class="m rkwhy"><span class="rk ${f.lv}">${f.lv}</span> ${esc(f.t)} <span class="sx-dim">${esc(f.id)}</span></div>`).join('')}</div>
      <div class="st">${e.lv?`<span class="rk ${e.lv}">${e.lv}</span>`:'<span class="m">no rule fired</span>'}</div></div>`}).join('');
  openInfoModal((t?t.l:'No tier')+' · '+(w?w.l():wk),
    `<span>${s.n} client${s.n===1?'':'s'}</span>${s.shows!=null?`<span>${s.shows} show${s.shows===1?'':'s'} in the window</span>`:''}<span>${s.uh} Urgent + High open</span>${s.red?`<span class="rk red">${s.red} red</span>`:''}${s.amber?`<span class="rk amber">${s.amber} amber</span>`:''}`,
    `<div class="dlist">${body}</div>`, 'Click a client for its full record. Counts follow the Ledger tab’s “Bugs counted” setting.');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rkt]');if(b&&b.closest('#risk'))openRiskModal(b.dataset.rkt,b.dataset.rkw)});

// ===== FLOW: where a story's time goes, read from the stored changelog (spec v1 §5, rules fl-*) =====
const FL_IVS=[
  {k:'buildHandoff',l:'Build and handoff',d:'first In progress to first In testing: dev, review and both queues, one number (fl-combined)'},
  {k:'qaCycle',l:'QA cycle',d:'In testing to Ready for release: testing and defect fixing, not QA time (fl-qa-cycle-contains-rework)'},
  {k:'releaseHold',l:'Release hold',d:'Ready for release to Done: the release train'},
  {k:'total',l:'Total flow',d:'In progress to Done, the three summed. Not time-to-customer (fl-clock-start)'}];
const flBiz=()=>String(LV('fl-business-days'))!=='0';
const flUnit=()=>flBiz()?'business days':'calendar days';
const flD=v=>v==null?'—':(v>0&&v<1?(Math.round(v*24*10)/10)+'h':(Math.round(v*10)/10)+'d');
const flIv=r=>flBiz()?r.intervals:r.intervalsCalendar;
const flMed=k=>((FLOW.summary[flBiz()?'medians':'mediansCalendar']||{})[k])||{median:null,n:0,notMeasured:0,skipped:0,reasons:{}};
const ivName=i=>{const k=String(i||'').split(' ')[0];const m={buildHandoff:'Build and handoff',qaCycle:'QA cycle',releaseHold:'Release hold'}[k];return m?m+(String(i).includes('paused')?' (paused)':''):String(i||'—')};
const FL_LOOPS=[
  {k:'rework',l:'Rework',d:'In review → In progress. Caught at review; cheap and healthy.'},
  {k:'sendBack',l:'Send back',d:'In testing → In progress. Rare by design: the normal path is a Defect.'},
  {k:'regressionFailed',l:'Regression failed',d:'Ready for release → In progress. Passed QA and still broke.'},
  {k:'reopened',l:'Reopened',d:'Done → back into the chain. Escaped to production.'}];
// the ladder is recounted from the stored loop events, so the live click-through threshold applies (fl-clerical-bounce)
function flLadder(){
  const th=+LV('fl-clerical-bounce'), out={rework:0,sendBack:0,regressionFailed:0,reopened:0}, items={}, per={};
  FLOW.rows.forEach(r=>(r.loopEvents||[]).forEach(e=>{
    if(e.migration) return;
    if(e.minutesAway!=null&&e.minutesAway<th) return;
    out[e.type]++; (items[e.type]=items[e.type]||new Set()).add(r.key); per[r.key]=(per[r.key]||0)+1;
  }));
  return {out,items:Object.fromEntries(FL_LOOPS.map(x=>[x.k,(items[x.k]||new Set()).size])),multi:Object.keys(per).filter(k=>per[k]>1)};
}
function flowLine(r){
  const iv=flIv(r), bits=FL_IVS.slice(0,3).filter(x=>!r.skipped.includes(x.k)&&(r.complete[x.k]||iv[x.k])).map(x=>x.l.split(' ')[0]+' '+flD(iv[x.k]));
  const fin=r.complete.total?'':' <span class="sx-dim">(not final: '+esc((r.unmeasurableReason||'').split(' —')[0]||(r.incomplete||{}).total||'in flight')+')</span>';
  return `${bits.join(' · ')}${bits.length?' · ':''}<b>total ${flD(iv.total)}</b>${fin}${r.defects.count?' · '+r.defects.count+' Defect'+(r.defects.count===1?'':'s'):''} <span class="sx-dim">${flUnit()}</span>`;
}
function flowMini(key){
  const r=FLOWIX[key];
  if(!r) return FLOW?'<span class="pp-empty">not in the flow sample</span>':'<span class="pp-empty">flow.json not loaded in this view</span>';
  return flowLine(r)+(r.flags.length?'<div class="small" style="margin-top:4px">'+r.flags.map(f=>`<span class="fl-flag ${f.code}">${esc(f.code.replace(/-/g,' '))}</span> ${esc(f.text)}`).join('<br>')+'</div>':'')
    +`<div style="margin-top:4px"><button type="button" class="linkbtn" data-flrow="${esc(key)}">Every state and transition</button></div>`;
}
function openFlowRow(key){
  const r=FLOWIX[key]; if(!r) return;
  const iv=flIv(r);
  const loops=(r.loopEvents||[]).map(e=>`<div class="small">${esc(e.at.replace('T',' ').slice(0,16))} ${esc(e.from)} → ${esc(e.to)} · <b>${esc(e.type)}</b>${e.minutesAway!=null?' · back in '+e.minutesAway+' min':''}${e.migration?' · <span class="fl-flag">migration, not counted</span>':e.minutesAway!=null&&e.minutesAway<+LV('fl-clerical-bounce')?' · <span class="fl-flag">click-through, not counted</span>':''} <span class="sx-dim">${esc(e.by||'')}</span></div>`).join('');
  const body=`<div class="seclabel" style="margin-top:0">Intervals<span class="c">${flUnit()}</span></div>
    <dl class="sx-kv">${FL_IVS.map(x=>`<dt>${x.l}</dt><dd><b>${flD(iv[x.k])}</b>${r.skipped.includes(x.k)?' <span class="sx-dim">stage skipped</span>':r.complete[x.k]?'':' <span class="sx-dim">not final</span>'}</dd>`).join('')}
      <dt>Before the clock</dt><dd>${r.preStartDays==null?'—':flD(r.preStartDays)+' <span class="sx-dim">calendar, creation to first In progress: backlog, never counted</span>'}</dd>
      <dt>Driver</dt><dd>${r.driverName?esc(r.driverName)+(r.tier?' · Tier '+r.tier:''):'—'} <span class="sx-dim">${esc(r.driverBasis||'')}</span></dd>
      ${r.unmeasurableReason?`<dt>Not measured</dt><dd>${esc(r.unmeasurableReason)}</dd>`:''}</dl>
    ${r.flags.length?'<div class="seclabel">Flags</div>'+r.flags.map(f=>`<div class="sx-p" style="margin-top:4px"><span class="fl-flag ${f.code}">${esc(f.code.replace(/-/g,' '))}</span> ${esc(f.text)}</div>`).join(''):''}
    <div class="seclabel">Time in each state<span class="c">summed over every visit (fl-multiple-visits)</span></div>
    <div class="tablewrap" style="box-shadow:none"><table class="fl-t"><thead><tr><th>State</th><th>Counts toward</th><th class="num">Business</th><th class="num">Calendar</th><th class="num">Visits</th></tr></thead><tbody>
    ${Object.entries(r.states).map(([s,v])=>`<tr><td>${esc(s)}</td><td>${esc(ivName(v.interval))}</td><td class="num">${flD(v.bd)}</td><td class="num">${flD(v.cd)}</td><td class="num">${v.visits}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">The clock never started.</td></tr>'}</tbody></table></div>
    ${loops?'<div class="seclabel">Loops</div>'+loops:''}
    ${r.defects.count?`<div class="seclabel">Defects<span class="c">${r.defects.count}, ${r.defects.open} open</span></div><div class="small">${r.defects.keys.map(k=>`<a href="${jira(k)}" target="_blank" rel="noopener">${esc(k)}</a>`).join(', ')}</div>`:''}
    <div class="seclabel">Transitions<span class="c">${r.transitions.length} · ${r.history.returned} of ${r.history.total} history entries read</span></div>
    <div class="fl-tr">${r.transitions.map(t=>`<div><span class="sx-dim">${esc(t.at.replace('T',' ').slice(0,16))}</span> ${esc(t.from)} → <b>${esc(t.to)}</b> <span class="sx-dim">${esc(t.by||'')}</span></div>`).join('')}</div>`;
  openInfoModal(r.key+' · '+r.summary,`<span>${esc(r.type)}</span><span>${esc(r.team||'no team')}</span><span>${esc(r.status)}</span>${r.priority?`<span>${esc(r.priority)}</span>`:''}`,body,
    `<a href="${jira(r.key)}" target="_blank" rel="noopener">Open ${esc(r.key)} in Jira</a>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-flrow]');if(b){e.preventDefault();openFlowRow(b.dataset.flrow)}});

const FLQ={'In progress':{c:'var(--sky-mark)',d:'',w:2.2},'In review':{c:'var(--th2)',d:'5 3',w:2},'Ready for testing':{c:'var(--sev-high)',d:'',w:3},'In testing':{c:'var(--th1)',d:'2 3',w:2.4},'Ready for release':{c:'var(--th6)',d:'8 4',w:2}};
function flQueue(){
  const Q=FLOW.summary.queue, days=Q.days, keys=Object.keys(Q.depth);
  const W=560,H=260,ML=30,MR=118,MT=12,MB=26,PW=W-ML-MR,PH=H-MT-MB;
  const max=Math.max(1,...keys.flatMap(k=>Q.depth[k]));
  const step=max<=6?1:max<=12?2:max<=30?5:10;
  const sx=i=>ML+(days.length>1?i/(days.length-1):0)*PW, sy=v=>MT+PH-v/max*PH;
  let s=`<svg class="chart fl-q" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sampled tickets in each stage at the end of each day, ${days[0]} to ${days[days.length-1]}">`;
  s+='<g class="grid">';
  for(let v=0;v<=max;v+=step) s+=`<line x1="${ML}" y1="${sy(v)}" x2="${ML+PW}" y2="${sy(v)}"/><text x="${ML-6}" y="${sy(v)+4}" text-anchor="end" class="val">${v}</text>`;
  days.forEach((d,i)=>{if(d.slice(8)==='01') s+=`<line x1="${sx(i)}" y1="${MT}" x2="${sx(i)}" y2="${MT+PH}"/><text x="${sx(i)+3}" y="${H-8}" class="val">${fmtMo(d.slice(0,7))}</text>`});
  const mig=days.indexOf('2026-09-15'); if(mig>=0) s+=`<line x1="${sx(mig)}" y1="${MT}" x2="${sx(mig)}" y2="${MT+PH}" class="fl-mig"/><text x="${sx(mig)-3}" y="${MT+10}" text-anchor="end" class="val">15 Sep migration</text>`;
  s+='</g>';
  keys.forEach(k=>{const st=FLQ[k]||{c:'var(--ink2)',d:'',w:2};
    s+=`<polyline fill="none" stroke="${st.c}" stroke-width="${st.w}" ${st.d?`stroke-dasharray="${st.d}"`:''} stroke-linejoin="round" points="${Q.depth[k].map((v,i)=>sx(i).toFixed(1)+','+sy(v).toFixed(1)).join(' ')}"/>`});
  // end labels, nudged apart so none overlap
  const ends=keys.map(k=>({k,v:Q.depth[k][days.length-1],y:sy(Q.depth[k][days.length-1])})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<12) ends[i].y=ends[i-1].y+12;
  ends.forEach(e=>{const st=FLQ[e.k]||{c:'var(--ink2)'};s+=`<line x1="${ML+PW+2}" y1="${sy(e.v)}" x2="${ML+PW+8}" y2="${e.y}" stroke="${st.c}" stroke-width="1.5"/><text x="${ML+PW+11}" y="${e.y+4}" class="lbl" style="font-size:10.5px">${esc(e.k)} ${e.v}</text>`});
  s+=`<line class="fl-guide" x1="0" y1="${MT}" x2="0" y2="${MT+PH}" style="display:none"/><rect class="bar-hit" x="${ML}" y="${MT}" width="${PW}" height="${PH}"/></svg>`;
  const el=document.getElementById('fl-queue'); el.innerHTML=s;
  const svg=el.firstElementChild, guide=svg.querySelector('.fl-guide');
  svg.addEventListener('mousemove',e=>{
    const r=svg.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*W;
    if(x<ML||x>ML+PW){hideTip();guide.style.display='none';return}
    const i=Math.max(0,Math.min(days.length-1,Math.round((x-ML)/PW*(days.length-1))));
    guide.setAttribute('x1',sx(i));guide.setAttribute('x2',sx(i));guide.style.display='';
    showTip(e,`<b>${esc(fmtDate(days[i]))}</b>`+keys.map(k=>`${esc(k)} <b style="display:inline;color:var(--head)">${Q.depth[k][i]}</b>`).join('<br>'));
  });
  svg.addEventListener('mouseleave',()=>{hideTip();guide.style.display='none'});
}
let flRowsOpen=false;
function renderFlow(){
  const el=document.getElementById('panel-flow'); if(!el) return;
  if(!FLOW){
    el.innerHTML=FLOW_ERR
      ?`<div class="pp-ro"><b>flow.json could not be loaded (${esc(FLOW_ERR)}).</b> The Flow tab reads the changelog extraction stored with this page; nothing is pulled from Jira here, so there is nothing to show until the file is published alongside it.</div>`
      :'<div class="empty">Loading flow.json…</div>';
    return;
  }
  const F=FLOW, S=F.summary, sm=F.sample, biz=flBiz();
  const tile=x=>{const m=flMed(x.k), rs=Object.entries(m.reasons||{}).map(([k,v])=>v+' '+k).join(', ');
    return `<div class="pp-stat fl-stat"><div class="n">${flD(m.median)}</div><div class="l">${esc(x.l)}</div>
      <div class="d">median of ${m.n} · <b>${m.notMeasured} not measured</b>${m.skipped?' · '+m.skipped+' skipped the stage':''}</div>
      <div class="d fl-why">${esc(x.d)}${rs?'<br><span class="fl-nm">Not measured: '+esc(rs)+'</span>':''}</div></div>`};
  const lad=flLadder(), qp=S.qaPassThrough, th=+LV('fl-clerical-bounce'), thStored=(F.computedWith||{}).clericalMinutes;
  const bt=S[biz?'byTeam':'byTeamCalendar']||{}, teams=Object.keys(bt).sort((a,b)=>bt[b].total.n-bt[a].total.n||a.localeCompare(b));
  const months=[...new Set(Object.values(S.byTeamMonth||{}).flatMap(o=>Object.keys(o)))].sort();
  const worst=(biz?S.worstFlow:S.worstFlowCalendar)||S.worstFlow;
  const flagChips=r=>(r.flags||[]).map(f=>`<span class="fl-flag ${f.code}" title="${esc(f.text)}">${esc(f.code.replace(/-/g,' '))}</span>`).join(' ');
  const rows=F.rows.slice().sort((a,b)=>(!!b.done)-(!!a.done)||(flIv(b).total-flIv(a).total));
  el.innerHTML=`
    <div class="banner"><span class="ic">${sm.inScope}</span><span><b>A sample, not a census.</b> ${esc(sm.design)} The full scope is ${esc(sm.fullScope)}. Total flow is <b>not time-to-customer</b>: the clock starts at the first entry to In progress, and the median sampled ticket had already waited ${flD(S.preStartMedian)} before that (fl-clock-start). Every duration is in <b>${flUnit()}</b> (fl-business-days).</span></div>
    <div class="pp-stats fl-stats">${FL_IVS.map(tile).join('')}
      <div class="pp-stat fl-stat mid"><div class="n">${qp.n} / ${qp.of}</div><div class="l">QA cycles under ${th} minutes</div><div class="d">The ticket was moved through In testing after the testing was done. This is why build and handoff stays one number (fl-combined).</div></div>
    </div>
    <div class="grid two" style="margin-bottom:14px">
      <div class="card"><h3>Queue depth over time</h3>
        <div class="note">How many sampled tickets sat in each stage at the end of each day. This is what proves a bottleneck, and it works without any change in how people move tickets. The sample was picked from recently finished work, so the right-hand end is the most complete.</div>
        <div id="fl-queue"></div>
        <table class="fl-read"><thead><tr><th>Pattern</th><th>Diagnosis</th><th>Fix</th></tr></thead><tbody>
          <tr><td>Ready for testing deep, In testing shallow</td><td><b>QA capacity</b></td><td>hire or reallocate</td></tr>
          <tr><td>Ready for testing deep, In testing also deep</td><td><b>Arrival rate</b>: QA is working, dev is over-feeding</td><td>cap work in progress</td></tr></tbody></table>
      </div>
      <div class="card"><h3>Rework ladder</h3>
        <div class="note">Volume and severity are different signals and are never summed (fl-loop-ladder). A loop that comes back within ${th} minutes is a click-through and is not counted (fl-clerical-bounce)${thStored!=null&&th!==thStored?`; the stored extract used ${thStored}, so this ladder is recounted from the stored loop events`:''}. Loops inside the 15 Sep migration are never counted.</div>
        <div class="fl-lad">
          <div class="fl-rung vol"><div class="n">${S.ladder.defects}</div><div><b>Defects</b> · volume, the primary quality signal<div class="small">Defect sub-tasks under ${S.ladder.defectItems} item${S.ladder.defectItems===1?'':'s'}; QA found a problem and the story stayed In testing (fl-defect-count)</div></div></div>
          ${FL_LOOPS.map(x=>`<div class="fl-rung"><div class="n">${lad.out[x.k]}</div><div><b>${x.l}</b> · ${lad.items[x.k]} item${lad.items[x.k]===1?'':'s'}<div class="small">${esc(x.d)}</div></div></div>`).join('')}
        </div>
        <div class="small" style="margin-top:8px">${lad.multi.length?'More than one counted loop: '+lad.multi.map(k=>`<button type="button" class="linkbtn" data-flrow="${esc(k)}">${esc(k)}</button>`).join(', '):'No sampled ticket carries more than one counted loop.'}</div>
      </div>
    </div>
    <div class="grid two" style="margin-bottom:14px">
      <div class="card"><h3>Per-team medians</h3>
        <div class="note">Median ${flUnit()} per interval; the small figure is how many tickets it rests on, then how many it could not measure. ${months.length>1?'':'Every sampled ticket finished in '+esc(months.map(m=>fmtMo(m)).join(', ')||'one month')+', so the by-month split has one column until the full batch runs.'}</div>
        <div class="tablewrap" style="box-shadow:none"><table class="fl-t"><thead><tr><th>Team</th>${FL_IVS.map(x=>`<th class="num">${esc(x.l)}</th>`).join('')}</tr></thead><tbody>
          ${teams.map(t=>`<tr><td>${esc(t)}</td>${FL_IVS.map(x=>{const m=bt[t][x.k];return `<td class="num">${m.n?'<b>'+flD(m.median)+'</b>':'—'}<div class="small">${m.n} · ${m.notMeasured} n/m${m.skipped?' · '+m.skipped+' skip':''}</div></td>`}).join('')}</tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card"><h3>Worst offenders</h3>
        <div class="note">By total flow (tickets whose total is final), and by defect count. Flags say when the number is a clean-up artefact rather than a delivery fact.</div>
        <div class="eyebrow" style="margin-top:4px">Longest total flow</div>
        <div class="dlist">${worst.map(w=>{const r=FLOWIX[w.key];return `<div class="bug"><div class="k"><button type="button" class="linkbtn" data-flrow="${esc(w.key)}">${esc(w.key)}</button></div><div class="s">${esc(w.summary)}<div class="m">${esc(w.team||'no team')} · build ${flD(w.intervals.buildHandoff)} · QA ${flD(w.intervals.qaCycle)} · release ${flD(w.intervals.releaseHold)} ${r?flagChips(r):''}</div></div><div class="st"><b>${flD(w.total)}</b></div></div>`}).join('')}</div>
        <div class="eyebrow">Most Defects</div>
        <div class="dlist">${S.worstDefects.map(w=>`<div class="bug"><div class="k"><button type="button" class="linkbtn" data-flrow="${esc(w.key)}">${esc(w.key)}</button></div><div class="s">${esc(w.summary)}<div class="m">${esc(w.team||'no team')} · ${w.defects.open} still open</div></div><div class="st"><b>${w.defects.count}</b> Defects</div></div>`).join('')}</div>
      </div>
    </div>
    <button class="disc" id="fl-rows-toggle" aria-expanded="${flRowsOpen}"><span>Every sampled ticket</span><span class="sub">${F.rows.length} rows in scope, ${F.excluded.length} pulled and excluded with a reason</span><span class="arw">›</span></button>
    <div id="fl-rows"${flRowsOpen?'':' hidden'}><div class="tablewrap"><table class="fl-t fl-all"><thead><tr><th>Key</th><th>Summary</th><th>Team</th><th>Status</th>${FL_IVS.map(x=>`<th class="num">${esc(x.l.split(' ')[0])}</th>`).join('')}<th class="num">Defects</th><th>Flags</th></tr></thead><tbody>
      ${rows.map(r=>{const iv=flIv(r);return `<tr class="row" data-flrow="${esc(r.key)}"><td><b>${esc(r.key)}</b></td><td>${esc(r.summary)}</td><td>${esc(r.team||'—')}</td><td>${esc(r.status)}${r.measurable?'':`<div class="small">${esc((r.unmeasurableReason||'').split(/ —|:| \(/)[0])}</div>`}</td>${FL_IVS.map(x=>`<td class="num${r.complete[x.k]&&!r.skipped.includes(x.k)?'':' fl-nf'}">${r.skipped.includes(x.k)?'skip':flD(iv[x.k])}</td>`).join('')}<td class="num">${r.defects.count||''}</td><td>${flagChips(r)}</td></tr>`}).join('')}
      ${F.excluded.map(x=>`<tr class="fl-ex"><td>${esc(x.key)}</td><td>${esc(x.summary)}</td><td>${esc(x.team||'—')}</td><td colspan="${FL_IVS.length+3}">excluded: ${esc(x.reason)}</td></tr>`).join('')}
    </tbody></table></div><p class="small" style="color:var(--muted);margin-top:6px">Greyed figures are not final: the ticket is still in flight, or the figure is left out of the medians for the reason on its flag.</p></div>
    <div class="card" style="margin-top:14px"><h3>Reconciliation checks</h3><div class="note">Spec §6.3. Every one must pass before a rebuild ships; they are computed with the extract and stored in flow.json.</div>
      <div class="fl-checks">${F.checks.map(c=>`<div class="fl-check"><span class="fl-pass ${c.pass?'ok':'bad'}">${c.pass?'pass':'fail'}</span><div><b>${esc(c.check)}</b> <span class="small">expected ${esc(c.expected)}</span><div class="small">${esc(c.result)}</div></div></div>`).join('')}</div>
    </div>
    <p class="small" style="color:var(--muted);font-size:12px;margin-top:10px">Pulled ${esc(F.pulledAt.replace('T',' ').replace('Z',' UTC'))} through the Atlassian connector (${esc(F.source)}). Computed ${esc(String(F.computedAt||'').replace('T',' ').replace('Z',' UTC'))} by ${esc((F.computedWith||{}).script||'the flow script')}, and stored in flow.json, which this tab reads as it is (src-stored-json). Nothing on this tab calls Jira.</p>`;
  flQueue();
  document.getElementById('fl-rows-toggle').addEventListener('click',function(){flRowsOpen=!flRowsOpen;this.setAttribute('aria-expanded',String(flRowsOpen));document.getElementById('fl-rows').hidden=!flRowsOpen});
}

// ===== impact engine: what a change actually does to the reporting =====
function withValue(id, v, fn){
  const r = LOGIC.rules.find(x => x.id === id);
  if(!r) return fn();
  const old = r.value; r.value = v; applyLogic();
  try { return fn(); } finally { r.value = old; applyLogic(); }
}
function withRules(rules, fn){
  const keep = LOGIC.rules; LOGIC.rules = rules; applyLogic();
  try { return fn(); } finally { LOGIC.rules = keep; applyLogic(); }
}
const METRIC=[
  {k:'liabTotal', l:'Total liability across all clients', hint:'open bugs weighted by severity and age, plus incident points'},
  {k:'topLiab',   l:'Largest liability'},
  {k:'top5',      l:'Top 5 by liability', hint:'who the ops review looks at first'},
  {k:'neglected', l:'Neglected: high liability, low investment', hint:'the Neglected tile and filter'},
  {k:'expensive', l:'Expensive and still broken'},
  {k:'lines',     l:'Quadrant lines: median investment / liability'},
  {k:'red',       l:'Clients flagged red', hint:'risk matrix and the Exposure column'},
  {k:'amber',     l:'Clients flagged amber'},
  {k:'windows',   l:'Clients by window, first / second / third / none'},
  {k:'broken',    l:'Must-haves committed to land after the client’s show'},
  {k:'atCap',     l:'Clients at the quality cap', hint:'accounts whose health score can no longer tell you how bad it is'},
  {k:'penSum',    l:'Total quality penalty across clients'},
  {k:'worstPen',  l:'Largest single quality penalty'},
  {k:'bins',      l:'Age buckets (oldest last)'},
  {k:'flowTotal', l:'Median total flow on the Flow tab'},
  {k:'ladder',    l:'Rework ladder: rework / send back / regression failed / reopened'},
  {k:'whyLong',   l:'Pipeline items whose Why is over the limit'},
  {k:'drawn',     l:'Rows drawn in charts and lists'}
];
function snapshot(){
  const aggs = D.companies.map(agg), L = ilLines(aggs);
  const scored = D.companies.filter(c => c.incScore != null);
  const ranked = aggs.slice().sort((a,b) => b.liab - a.liab);
  const pens = scored.map(penTotal);
  const b=[+LV('age-b1'),+LV('age-b2'),+LV('age-b3'),+LV('age-b4')];
  const edges=[[0,b[0]],[b[0],b[1]],[b[1],b[2]],[b[2],b[3]],[b[3],1e9]];
  const inQ=k=>aggs.filter(a=>quad(a,L).k===k).sort((x,y)=>y.liab-x.liab);
  const names=l=>l.length+(l.length?': '+l.slice(0,4).map(a=>shortName(a.c.name)).join(', ')+(l.length>4?' +'+(l.length-4):''):'');
  const driven=PIPE.filter(r=>/^\d+$/.test(String((r.v||{}).driver||''))).length;
  const lad=FLOW?flLadder():null, ft=FLOW?flMed('total'):null;
  return {
    liabTotal: fmt1(aggs.reduce((a,x) => a + x.liab, 0)),
    topLiab: ranked.length ? shortName(ranked[0].c.name)+' ('+fmt1(ranked[0].liab)+')' : '—',
    top5: ranked.slice(0,5).map(a => shortName(a.c.name)).join(' › '),
    neglected: names(inQ('neglected')),
    expensive: names(inQ('expensive')),
    lines: fmt1(L.inv)+' / '+fmt1(L.liab),
    red: aggs.filter(a=>a.exp.lv==='red').length+' clients',
    amber: aggs.filter(a=>a.exp.lv==='amber').length+' clients',
    windows: WINS.map(w=>aggs.filter(a=>a.exp.win===w.k).length).join(' / '),
    broken: PIPE_READY ? aggs.reduce((s,a)=>s+((a.exp.flags.find(f=>f.id==='rk-promise-broken')||{}).items||[]).length,0)+' of '+driven+' driven items' : 'pipeline not loaded',
    atCap: scored.filter(c => penTotal(c) >= LV('at-cap-threshold')).length + ' of ' + scored.length,
    penSum: '-' + pens.reduce((a,x) => a+x, 0).toFixed(1),
    worstPen: '-' + (pens.length ? Math.max.apply(null, pens).toFixed(1) : '0'),
    bins: edges.map(([a,z]) => D.bugs.filter(x => {const d = days(x.cr); return d >= a && d < z}).length).join(' / '),
    flowTotal: ft ? flD(ft.median)+' '+flUnit()+' over '+ft.n : 'flow.json not loaded',
    ladder: lad ? FL_LOOPS.map(x=>lad.out[x.k]).join(' / ') : 'flow.json not loaded',
    whyLong: PIPE_READY ? PIPE.filter(r=>String((r.v||{}).why||'').length>+LV('pp-why-one-line')).length+' of '+PIPE.length : 'pipeline not loaded',
    drawn: [LV('top-penalty'),LV('top-bugclients'),LV('top-incidents')].join(' / ') + ' + ' + LV('platform-cap') + ' stories'
  };
}
function diffSnap(a, b){
  return METRIC.filter(m => String(a[m.k]) !== String(b[m.k]))
               .map(m => ({l:m.l, hint:m.hint, from:a[m.k], to:b[m.k]}));
}

// ---- soundness assessment. Honest heuristics, not a score.
function assess(changes, before, after){
  const out = [];
  const R = id => LOGIC.rules.find(x => x.id === id);
  const num = id => { const r = R(id); return r ? +r.value : null; };
  const touched = new Set(changes.map(c => c.id));

  changes.forEach(c => {
    const r = R(c.id); if(!r) return;
    const nv = +c.to, ov = +c.from;
    if(r.kind === 'live'){
      if(Number.isNaN(nv)) out.push({lv:'bad', t:`"${r.name}" is not a number.`, w:'The dashboard will read it as 0.'});
      else if(nv < 0) out.push({lv:'bad', t:`"${r.name}" is negative.`, w:'Nothing here is meaningful below zero; totals will subtract instead of add.'});
      if(r.min != null && nv < r.min) out.push({lv:'bad', t:`"${r.name}" is below its sensible minimum of ${r.min}.`, w:''});
      if(r.max != null && nv > r.max) out.push({lv:'check', t:`"${r.name}" is above the range this rule was designed for (${r.max}).`, w:'Not forbidden, but nothing was tested up here.'});
      if(ov && nv && (nv/ov > 3 || ov/nv > 3)) out.push({lv:'check', t:`"${r.name}" changed by more than 3x.`, w:'Large jumps re-order the charts rather than nudge them — check the ordering below actually reads the way you want.'});
    }
    if(String(r.source).indexOf('OPKL') === 0){
      out.push({lv:'bad', t:`"${r.name}" comes from Planhat, which is the system of record.`,
        w:'Changing it here makes this page disagree with the Health Score panel in Planhat and with the nightly n8n job. To change it for real, three places must move together: the Planhat Health Score Profile, the Compute Health Factors node in jpuksPy0UTJJHO6D, and the QUALITY array in 3hyLMUGOn21IctQt. Use this as a what-if, not as a decision.'});
    }
  });

  // severity coherence
  if(['sev-urgent','sev-high','sev-medium','sev-low'].some(id => touched.has(id))){
    const u=num('sev-urgent'), h=num('sev-high'), m=num('sev-medium'), l=num('sev-low');
    if([u,h,m,l].every(x => x != null)){
      if(!(u >= h && h >= m && m >= l)) out.push({lv:'bad', t:'Severity weights are no longer in order.',
        w:`Urgent ${u}, High ${h}, Medium ${m}, Low ${l}. A lower-priority bug now counts for more than a higher one, so every liability figure, the quadrant and the Neglected tile become misleading.`});
      else if(u === h && h === m && m === l) out.push({lv:'bad', t:'Every severity now weighs the same.',
        w:'Severity stops discriminating entirely — liability becomes an age-weighted bug count and the severity mix bar carries no information.'});
      else if(l === 0) out.push({lv:'check', t:'Low bugs now count for nothing.',
        w:'This matches what Planhat does, so it is defensible — but a client sitting on fifteen Low bugs will read as having no liability at all, which was the reason this dashboard weighted Low at 1.'});
    }
  }
  // age buckets must ascend
  if(['age-b1','age-b2','age-b3','age-b4'].some(id => touched.has(id))){
    const b=[num('age-b1'),num('age-b2'),num('age-b3'),num('age-b4')];
    if(!(b[0] < b[1] && b[1] < b[2] && b[2] < b[3])) out.push({lv:'bad', t:'Age bucket boundaries no longer ascend.',
      w:`${b.join(', ')} — buckets will overlap or come out empty, and the age chart will be nonsense.`});
    else if(b[2] !== 180) out.push({lv:'check', t:'The third boundary is no longer 180 days.',
      w:'180 is where a bug stops counting in the Client Bug Score decay, so that boundary lines the chart up with the health model. Moving it breaks that correspondence.'});
  }
  // cap / threshold coherence
  if(touched.has('at-cap-threshold') || touched.has('cap-total')){
    const t=num('at-cap-threshold'), cap=num('cap-total');
    if(t != null && cap != null){
      if(t > cap) out.push({lv:'bad', t:'The at-cap threshold is above the total cap.',
        w:`Nothing can ever reach ${t} when the maximum penalty is ${cap}, so that KPI will read 0 for ever.`});
      else if(t <= 0) out.push({lv:'bad', t:'The at-cap threshold is zero or below.',
        w:'Every scored client counts as "at the cap", so the KPI stops identifying anyone.'});
      else if(t < cap*0.5) out.push({lv:'check', t:'The at-cap threshold is now less than half the cap.',
        w:'The tile will flag a large share of the book. It is meant to pick out accounts whose score has saturated, not most of them.'});
    }
  }
  // ranges cannot be zero
  ['range-incident','range-ocbw','range-cbs'].forEach(id => {
    if(touched.has(id) && num(id) <= 0) out.push({lv:'bad', t:`"${R(id).name}" is zero or below.`,
      w:'Dividing by it makes every client saturate instantly — the whole book will show the maximum penalty.'});
  });
  // display limits
  ['top-penalty','top-bugclients','top-incidents','platform-cap'].forEach(id => {
    if(!touched.has(id)) return;
    const v = num(id), ch = changes.find(c => c.id === id);
    if(v < 3) out.push({lv:'check', t:`"${R(id).name}" is down to ${v}.`, w:'Almost everything is hidden. This changes what people see, not what anything measures.'});
    else if(+ch.to > +ch.from) out.push({lv:'ok', t:`"${R(id).name}" raised to ${v}.`, w:'Shows more without changing any measure — no effect on liability, penalties or ordering.'});
  });
  // risk windows must ascend (rk-window-*)
  if(['rk-window-30','rk-window-60','rk-window-90'].some(id => touched.has(id))){
    const w=[num('rk-window-30'),num('rk-window-60'),num('rk-window-90')];
    if(!(w[0] < w[1] && w[1] < w[2])) out.push({lv:'bad', t:'The risk windows no longer ascend.',
      w:`${w.join(', ')} days — columns will overlap or come out empty, and a client can no longer be read off one cell.`});
  }
  // the red and amber thresholds against the windows they sit in
  if(touched.has('rk-urgent-t12') && num('rk-urgent-t12') > num('rk-window-90')) out.push({lv:'check', t:'The Urgent red rule now reaches past the last window.',
    w:'Clients in the none column can turn red on it. Legitimate, but the matrix will show red where the spec expected only a countdown.'});
  if(touched.has('rk-high-days') && num('rk-high-days') > num('rk-urgent-t12')) out.push({lv:'check', t:'The High rule now reaches further out than the Urgent rule.',
    w:'A High bug turns a client red earlier than an Urgent does on a Tier 3 or 4 client. Coherent only if that is deliberate.'});
  // age multipliers must not fall with age (il-age-mult-*)
  if(['il-age-mult-30','il-age-mult-90','il-age-mult-180','il-age-mult-older'].some(id => touched.has(id))){
    const m=[num('il-age-mult-30'),num('il-age-mult-90'),num('il-age-mult-180'),num('il-age-mult-older')];
    if(!(m[0] <= m[1] && m[1] <= m[2] && m[2] <= m[3])) out.push({lv:'bad', t:'An older bug now counts for less than a newer one.',
      w:`Multipliers ${m.join(', ')}. The point of ageing liability is that a year-old bug is worse than last week's; this reverses it.`});
    else if(m[0] !== 1) out.push({lv:'check', t:'Fresh bugs no longer count at their plain severity weight.',
      w:'Every liability moves together, so the ranking barely changes, but the figures stop reading as severity points.'});
  }
  if(touched.has('pp-why-one-line') && num('pp-why-one-line') > 200) out.push({lv:'check', t:'Why is no longer one line.',
    w:'Above about 200 characters the column stops fitting a table row, which is the reason the limit exists (pp-why-one-line).'});
  if(touched.has('fl-business-days') && ![0,1].includes(num('fl-business-days'))) out.push({lv:'bad', t:'Business days is a switch.',
    w:'Use 1 for business days or 0 for calendar days; anything else is read as business days.'});
  if(touched.has('fl-clerical-bounce') && num('fl-clerical-bounce') > 240) out.push({lv:'check', t:'The click-through threshold is over four hours.',
    w:'Real rework that came back the same afternoon stops counting on the ladder.'});
  // reordering matters even when every value is coherent
  if(before && after){
    if(String(before.top5)!==String(after.top5)) out.push({lv:'check', t:'The top five by liability changes.',
      w:`The clients the ops review looks at first go from ${before.top5} to ${after.top5}. Coherent, but it changes who gets attention — make sure the new order is the one you would defend in the meeting.`});
    if(String(before.topLiab)!==String(after.topLiab)) out.push({lv:'check', t:'The largest liability changes hands.',
      w:`${before.topLiab} → ${after.topLiab}. If that reads wrong, the weights are wrong rather than the data.`});
    if(String(before.neglected)!==String(after.neglected)) out.push({lv:'check', t:'Who reads as neglected changes.',
      w:`${before.neglected} → ${after.neglected}. The Neglected tile and filter follow it.`});
  }
  return out;
}
function impactHTML(changes, before, after, opts){
  opts = opts || {};
  const d = diffSnap(before, after), a = assess(changes, before, after);
  const bad = a.filter(x => x.lv === 'bad'), chk = a.filter(x => x.lv === 'check'), ok = a.filter(x => x.lv === 'ok');
  let verdict, vclass;
  if(bad.length){ verdict = 'This degrades the reporting'; vclass = 'bad'; }
  else if(chk.length){ verdict = 'Defensible, but worth a look'; vclass = 'check'; }
  else if(d.length){ verdict = 'Sound change'; vclass = 'ok'; }
  else { verdict = 'No measurable effect'; vclass = 'none'; }
  let h = `<div class="imp imp-${vclass}">
    <div class="imp-v"><span class="imp-dot"></span>${esc(verdict)}</div>`;
  if(!d.length){
    h += `<p class="imp-none">Nothing the dashboard reports moves. ${changes.length===1&&LOGIC.rules.find(x=>x.id===changes[0].id)?.kind==='reference'?'This is a reference rule — it records how something is done rather than driving a calculation.':'The value changed but no chart, table or KPI depends on it at these numbers.'}</p>`;
  } else {
    h += `<div class="imp-h">What moves</div><div class="imp-rows">` + d.map(x => {
      const long = String(x.from).length > 34 || String(x.to).length > 34;
      return `<div class="imp-row${long?' long':''}">
        <div class="m">${esc(x.l)}${x.hint?`<span class="hint">${esc(x.hint)}</span>`:''}</div>
        <div class="v"><span class="f">${esc(x.from)}</span><span class="ar">\u2192</span><b class="t">${esc(x.to)}</b></div>
      </div>`;
    }).join('') + `</div>`;
  }
  if(a.length){
    h += `<div class="imp-h">Assessment</div><ul class="imp-a">` + bad.concat(chk, ok).map(x =>
      `<li class="l-${x.lv}"><b>${esc(x.t)}</b>${x.w?` ${esc(x.w)}`:''}</li>`).join('') + `</ul>`;
  }
  h += `</div>`;
  return h;
}

// ===== LOGIC tab: the registry, editable, embedded in this artifact =====
let lgKind='', lgDirty=false, lgCanWrite=null, lgSaving=false, lgAddOpen=false;
const GROUP_NOTE={
  'Severity weights':'Invented by this dashboard. No upstream authority computes these, which makes them the most arguable numbers here. They feed liability (il-liability-formula), the severity mix and the timeline strips.',
  'Risk and exposure':'How a client’s next show turns open work into risk. Read the window rule before reading the matrix, and the excluded-signals rule before asking why open stories are not counted.',
  'Investment and liability':'What replaced give and take. Nothing here nets an investment against a liability — read the not-commensurable rule first.',
  'Flow and rework':'Where a story’s time goes between starting and shipping, read from the Jira changelog and stored in flow.json. Read the combined-interval rule before asking why dev time and QA queue are one number.',
  'Health model':'From the OPKL design guide. These mirror Planhat — changing one here changes this page, NOT Planhat.',
  'Attribution':'Which client an item belongs to. The rules a number cannot express.',
  'Source queries':'How each feed is pulled, and what the published queries get wrong.',
  'Timeline':'How the client-by-month grid buckets and scales.',
  'Display':'Limits on what is drawn. Not rules about the data.',
  'Traps':'Failures that produce wrong numbers with no error.',
  'Known gaps':'What this dashboard cannot see, recorded so nobody rediscovers it.',
  'Delivery timeline':'How the Delivery grid is built, what attaches to a client, and how long stories take. Read the month-basis rule before reading the grid.',
  'Events and deadlines':'When each client\'s shows actually run, pulled live from the OP project. This is the layer that turns a month column into a deadline: what was needed when, what went in still broken, and what is coming.',
  'Pipeline ledger':'The must-have commitments for the months ahead, held in this artifact\u2019s shared database and edited on the Pipeline tab. Read the estimate-parsing rule before trusting any effort total, and the unestimated rule before reading a month as capacity.',
  'Hyve dedicated team':'The HV project \u2014 a dedicated team standing up work for one client, formed after Q1 2026. Every item in it belongs to Hyve Group Plc by project membership. The two live rules at the top decide whether that work is counted at all; read the Rejected-is-a-status rule before trusting any delivered figure from HV.',
  'Story value and effort':'The v1 story model, 19 Sep 2026, recorded in full so a clone carries it without the spec. Nothing here drives a number on this page yet: it needs twelve story fields the inherited dataset does not have, and the Delivery tab still shows the model this one replaces.'
};
function lgRules(){
  const g=document.getElementById('lg-group').value,
        q=document.getElementById('lg-search').value.trim().toLowerCase(),
        ch=document.getElementById('lg-changed').checked;
  return LOGIC.rules.filter(r=>(!g||r.group===g)&&(!lgKind||r.kind===lgKind)&&(!ch||isChanged(r))
    &&(!q||[r.name,r.why,r.source,r.drives,String(r.value),r.group].join(' ').toLowerCase().includes(q)));
}
function lgStats(){
  const live=LOGIC.rules.filter(r=>r.kind==='live').length;
  const ch=LOGIC.rules.filter(isChanged).length;
  const s=[{n:LOGIC.rules.length,l:'Rules carried'},{n:live,l:'Live parameters'},
           {n:LOGIC.rules.length-live,l:'Reference rules'},{n:ch,l:'Changed from default'},
           {n:new Set(LOGIC.rules.map(r=>r.group)).size,l:'Groups'}];
  document.getElementById('lg-total').textContent=LOGIC.rules.length;
  document.getElementById('lg-stats').innerHTML=s.map(x=>`<div class="lg-stat"><div class="n">${x.n}</div><div class="l">${esc(x.l)}</div></div>`).join('');
}
function lgCard(r){
  const changed=isChanged(r), ed=true;
  let val;
  if(r.kind==='live'&&r.type==='number'){
    val=`<div class="lg-val">
      <input type="number" data-lgnum="${esc(r.id)}" value="${esc(r.value)}" ${r.min!=null?`min="${r.min}"`:''} ${r.max!=null?`max="${r.max}"`:''} step="${r.step||1}"  aria-label="${esc(r.name)}">
      ${r.unit?`<span class="unit">${esc(r.unit)}</span>`:''}
      ${changed&&seedOf(r.id)!==undefined?`<span class="was">default <b>${esc(seedOf(r.id))}</b></span>`:''}
    </div>`;
  } else {
    val=`<div class="lg-txt${r.type==='code'?' code':''}" data-lgtxt="${esc(r.id)}">${esc(r.value)}</div>`;
  }
  return `<div class="lg${changed?(r.custom?' isnew':' edited'):''}" data-lgid="${esc(r.id)}">
    <div class="lg-top">
      <span class="lg-name">${esc(r.name)}</span>
      <span class="kind ${r.kind}">${r.kind}</span>
      ${r.custom?'<span class="lg-flag">added here</span>':(changed?'<span class="lg-flag">changed</span>':'')}
      <span class="lg-acts">
        ${ed&&r.kind!=='live'?`<button class="ibtn" data-lgedit="${esc(r.id)}">Edit</button>`:''}
        ${ed&&changed&&!r.custom?`<button class="ibtn" data-lgrevert="${esc(r.id)}">Revert</button>`:''}
        ${ed?`<button class="ibtn danger" data-lgdel="${esc(r.id)}">Delete</button>`:''}
      </span>
    </div>
    ${val}
    ${r.drives?`<div class="lg-drives">Drives <b>${esc(r.drives)}</b></div>`:''}
    <div class="lg-why">${esc(r.why)}</div>
    <div class="lg-imp" data-lgimp="${esc(r.id)}"></div>
    <div class="lg-meta"><span><b>Source</b> ${esc(r.source)}</span>${r.ref?`<span><a href="${esc(r.ref)}" target="_blank" rel="noopener">open the source</a></span>`:''}<span><b>id</b> ${esc(r.id)}</span></div>
  </div>`;
}
function renderLogic(){
  const rules=lgRules();
  document.getElementById('lg-count').textContent=rules.length+' of '+LOGIC.rules.length+' rules';
  const groups=[...new Set(LOGIC.rules.map(r=>r.group))];
  const sel=document.getElementById('lg-group');
  if(sel.options.length<=1) sel.innerHTML='<option value="">All groups</option>'+groups.map(g=>`<option>${esc(g)}</option>`).join('');
  let h='';
  groups.forEach(g=>{
    const rs=rules.filter(r=>r.group===g); if(!rs.length)return;
    h+=`<div class="lg-group"><h3>${esc(g)}<span class="c">${rs.length}</span></h3>
      ${GROUP_NOTE[g]?`<div class="gnote">${esc(GROUP_NOTE[g])}</div>`:''}
      <div class="lg-list">${rs.map(lgCard).join('')}</div></div>`;
  });
  document.getElementById('lg-body').innerHTML=h||'<div class="empty">No rule matches these filters.</div>';
  lgStats();
  const bar=document.getElementById('lg-savebar');
  bar.hidden=!lgDirty;
  if(lgDirty){
    const n=LOGIC.rules.filter(isChanged).length;
    document.getElementById('lg-savemsg').innerHTML = lgSaving ? 'Saving…'
      : lgCanWrite===false
        ? `<b>${n}</b> rule${n===1?'':'s'} changed in this browser only — export them to keep them.`
        : `<b>${n}</b> rule${n===1?'':'s'} differ from the version saved in this artifact. The dashboard already reflects them — saving writes them into the artifact so they travel with it.`;
  }
}
function lgTouch(){ applyLogic(); lgDirty=true; renderAll(); }
function renderPipe(){ try{ if(typeof ppRender==='function') ppRender(); }catch(e){} }
function renderAll(){ applyHyve(); renderHvBar(); renderKPIs(); renderLedger(); renderRisk(); renderTimeline(); renderDelivery(); renderBugs(); renderInc(); renderModel(); chartPenalty(); renderFlow(); renderLogic(); renderPipe(); }

// --- interactions
document.getElementById('lg-body').addEventListener('input',e=>{
  const n=e.target.closest('[data-lgnum]'); if(!n)return;
  const r=LOGIC.rules.find(x=>x.id===n.dataset.lgnum); if(!r)return;
  const v=parseFloat(n.value); if(Number.isNaN(v)){showImpact(r,n.value);return}
  r.value=v; applyLogic();
  lgDirty=true;
  renderKPIs(); renderLedger(); renderRisk(); renderTimeline(); renderDelivery(); renderBugs(); renderInc(); chartPenalty(); renderFlow(); renderPipe();
  lgStats(); showImpact(r,v);
  const bar=document.getElementById('lg-savebar'); bar.hidden=false;
  const c=LOGIC.rules.filter(isChanged).length;
  document.getElementById('lg-savemsg').innerHTML = lgCanWrite===false
    ? `<b>${c}</b> rule${c===1?'':'s'} changed in this browser only \u2014 export them to keep them.`
    : `<b>${c}</b> rule${c===1?'':'s'} changed. Review the impact before saving \u2014 nothing is written until you do.`;
  const card=n.closest('.lg'); if(card)card.classList.toggle('edited',isChanged(r)&&!r.custom);
});
// per-rule impact, computed against the value this artifact currently holds
function showImpact(r,newVal){
  const host=document.querySelector(`[data-lgimp="${CSS.escape(r.id)}"]`); if(!host)return;
  const savedRule=(SAVED.rules||[]).find(x=>x.id===r.id);
  const base = savedRule ? savedRule.value : (seedOf(r.id)!==undefined?seedOf(r.id):r.value);
  if(String(base)===String(newVal)){host.innerHTML='';return}
  const before = withValue(r.id, base, snapshot);
  const after  = withValue(r.id, newVal, snapshot);
  host.innerHTML = impactHTML([{id:r.id, from:base, to:newVal}], before, after);
}
document.getElementById('lg-body').addEventListener('click',e=>{
  const del=e.target.closest('[data-lgdel]'), rev=e.target.closest('[data-lgrevert]'), edt=e.target.closest('[data-lgedit]');
  if(del){
    const r=LOGIC.rules.find(x=>x.id===del.dataset.lgdel); if(!r)return;
    uiConfirm({title:'Delete “'+r.name+'”?',body:'<p>'+(r.kind==='live'?'This is a live parameter: the dashboard falls back to 0 for it, which visibly changes the numbers. ':'')+'Nothing is saved into the artifact until you press Save.</p>',ok:'Delete rule',danger:true})
      .then(ok=>{ if(!ok)return; LOGIC.rules=LOGIC.rules.filter(x=>x.id!==r.id); lgTouch(); });
    return;
  }
  if(rev){
    const r=LOGIC.rules.find(x=>x.id===rev.dataset.lgrevert); if(!r)return;
    const s=SEED.rules.find(x=>x.id===r.id); if(!s)return;
    Object.assign(r,JSON.parse(JSON.stringify(s))); lgTouch(); return;
  }
  if(edt){
    const r=LOGIC.rules.find(x=>x.id===edt.dataset.lgedit); if(!r)return;
    const host=document.querySelector(`[data-lgtxt="${CSS.escape(r.id)}"]`); if(!host)return;
    const ta=document.createElement('textarea'); ta.value=r.value; ta.rows=Math.min(14,String(r.value).split('\n').length+2);
    const acts=document.createElement('div'); acts.className='lg-acts'; acts.style.marginTop='8px';
    acts.innerHTML='<button class="ibtn primary" data-lgok>Apply</button><button class="ibtn" data-lgcancel>Cancel</button>';
    host.replaceWith(ta); ta.after(acts); ta.focus();
    acts.addEventListener('click',ev=>{
      if(ev.target.closest('[data-lgok]')){ const prev=r.value; r.value=ta.value; lgTouch(); showImpact(r,ta.value); }
      else if(ev.target.closest('[data-lgcancel]')){ renderLogic(); }
    });
  }
});
['lg-group','lg-search'].forEach(id=>document.getElementById(id).addEventListener('input',renderLogic));
document.getElementById('lg-changed').addEventListener('change',renderLogic);
document.getElementById('lg-kind').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;lgKind=b.dataset.v;
  document.querySelectorAll('#lg-kind button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLogic()});

// --- add a rule: a guided flow, not a bare form
const KIND_HELP={
  live:{t:'A number the dashboard calculates with',
    d:'Weights, caps, thresholds, limits — anything the page multiplies, compares or counts with. Changing one recomputes the charts in front of you.',
    eg:'Urgent bug weight · Points per incident · At-the-cap threshold'},
  reference:{t:'A rule written in words',
    d:'How something is decided, a query, a trap to avoid, a known gap. The page cannot execute it, but it carries it so nobody has to rediscover it.',
    eg:'Which client gets a bug · The IMP noise filter · Planhat returns 200 for a missing field'}
};
const FIELD_HELP={
  name:'Name it as the thing itself, not a question. "Urgent bug weight", not "How much is an Urgent bug worth?"',
  group:'Which section it files under. Pick the one where someone would go looking for it.',
  value_live:'Just the number. Units go in the field below so the number stays clean.',
  value_ref:'The rule itself, in plain words. Several lines are fine — write it as you would explain it to the next person.',
  unit:'Optional. What the number is counted in: points, days, clients, rows.',
  why:'The most valuable field. Write the reasoning someone will need in six months when they wonder why it is this and not something else. A rule with no reason gets changed by the first person who disagrees with it.',
  source:'Where this came from. "Invented here" is a perfectly good answer and an honest one — it tells the reader there is no upstream authority to check against.',
  drives:'Which parts of the page this affects, in plain words. Shown on the card so nobody has to guess what breaks.',
  ref:'Optional link to the page, ticket or guide this came from.'
};
function nfPreview(){
  const kind=document.querySelector('#nf-kindwrap [aria-pressed="true"]')?.dataset.v||'reference';
  const raw=(document.getElementById('nf-value')?.value||'').trim();
  const r={id:'preview',group:'',name:document.getElementById('nf-name').value.trim()||'Your rule’s name',
    kind,type:kind==='live'?'number':(raw.includes('\n')?'longtext':'text'),
    value:kind==='live'?(raw===''?0:(parseFloat(raw)||0)):(raw||'What the rule says will appear here.'),
    unit:document.getElementById('nf-unit')?.value.trim()||'',
    why:document.getElementById('nf-why').value.trim()||'The reasoning will appear here.',
    source:document.getElementById('nf-source').value.trim()||'Where it came from',
    drives:document.getElementById('nf-drives')?.value.trim()||'',custom:true};
  const host=document.getElementById('nf-preview'); if(host) host.innerHTML=lgCard(r);
}
document.getElementById('lg-add').addEventListener('click',()=>{
  if(lgAddOpen)return; lgAddOpen=true;
  const groups=[...new Set(LOGIC.rules.map(r=>r.group))];
  document.getElementById('lg-formhost').innerHTML=`<div class="lg-form">
    <div class="nf-step"><span class="nf-num">1</span>What kind of rule is this?</div>
    <div class="nf-kinds" id="nf-kindwrap">
      ${Object.entries(KIND_HELP).map(([k,v],i)=>`<button class="nf-kind" data-v="${k}" aria-pressed="${i===1}">
        <span class="kind ${k}">${k}</span><b>${esc(v.t)}</b><span class="d">${esc(v.d)}</span><span class="eg">e.g. ${esc(v.eg)}</span>
      </button>`).join('')}
    </div>
    <div class="nf-live-note" id="nf-livenote" hidden>A live rule added here is recorded and travels with the artifact, but <b>nothing computes from it until the page is wired to read it</b>. Ask Claude to wire it up and it becomes a real parameter.</div>

    <div class="nf-step"><span class="nf-num">2</span>Describe it</div>
    <div class="row">
      <div><label>Name</label><input id="nf-name" placeholder="Urgent bug weight"><span class="fh">${esc(FIELD_HELP.name)}</span></div>
      <div><label>Group</label><select id="nf-group">${groups.map(g=>`<option>${esc(g)}</option>`).join('')}<option value="__new">New group…</option></select><span class="fh">${esc(FIELD_HELP.group)}</span></div>
      <div id="nf-newgwrap" hidden><label>New group name</label><input id="nf-newg" placeholder="Group name"></div>
    </div>
    <div class="row">
      <div id="nf-valwrap"><label>Value</label><input id="nf-value" placeholder="4"><span class="fh" id="nf-valhelp">${esc(FIELD_HELP.value_live)}</span></div>
      <div id="nf-unitwrap"><label>Unit <span class="opt">optional</span></label><input id="nf-unit" placeholder="points"><span class="fh">${esc(FIELD_HELP.unit)}</span></div>
      <div id="nf-driveswrap"><label>What it drives <span class="opt">optional</span></label><input id="nf-drives" placeholder="Liability, severity mix, the quadrant"><span class="fh">${esc(FIELD_HELP.drives)}</span></div>
    </div>
    <div style="margin-bottom:10px"><label>Why — the reasoning</label><textarea id="nf-why" placeholder="Why this is what it is, and what breaks if someone changes it"></textarea><span class="fh">${esc(FIELD_HELP.why)}</span></div>
    <div class="row">
      <div><label>Source</label><input id="nf-source" placeholder="Invented here"><span class="fh">${esc(FIELD_HELP.source)}</span></div>
      <div><label>Reference link <span class="opt">optional</span></label><input id="nf-ref" placeholder="https://"><span class="fh">${esc(FIELD_HELP.ref)}</span></div>
    </div>

    <div class="nf-step"><span class="nf-num">3</span>How it will look</div>
    <div id="nf-preview" class="nf-preview"></div>
    <div id="nf-err" class="nf-err" hidden></div>
    <div class="acts"><button class="ibtn" id="nf-cancel">Cancel</button><button class="ibtn primary" id="nf-save">Add this rule</button></div>
  </div>`;

  const sync=()=>{
    const kind=document.querySelector('#nf-kindwrap [aria-pressed="true"]').dataset.v;
    document.getElementById('nf-livenote').hidden = kind!=='live';
    document.getElementById('nf-unitwrap').hidden = kind!=='live';
    document.getElementById('nf-driveswrap').hidden = kind!=='live';
    document.getElementById('nf-valhelp').textContent = kind==='live'?FIELD_HELP.value_live:FIELD_HELP.value_ref;
    const vw=document.getElementById('nf-valwrap'), cur=document.getElementById('nf-value');
    if(kind!=='live' && cur.tagName!=='TEXTAREA'){
      const ta=document.createElement('textarea'); ta.id='nf-value'; ta.placeholder='Write the rule as you would explain it'; ta.value=cur.value;
      cur.replaceWith(ta); ta.addEventListener('input',nfPreview);
    } else if(kind==='live' && cur.tagName==='TEXTAREA'){
      const inp=document.createElement('input'); inp.id='nf-value'; inp.placeholder='4'; inp.value=cur.value;
      cur.replaceWith(inp); inp.addEventListener('input',nfPreview);
    }
    nfPreview();
  };
  document.getElementById('nf-kindwrap').addEventListener('click',e=>{
    const b=e.target.closest('.nf-kind'); if(!b)return;
    document.querySelectorAll('#nf-kindwrap .nf-kind').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    sync();
  });
  document.getElementById('nf-group').addEventListener('change',e=>{
    document.getElementById('nf-newgwrap').hidden = e.target.value!=='__new';
  });
  ['nf-name','nf-value','nf-why','nf-source','nf-unit','nf-drives'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.addEventListener('input',nfPreview);
  });
  sync();
  document.getElementById('nf-cancel').addEventListener('click',()=>{lgAddOpen=false;document.getElementById('lg-formhost').innerHTML=''});
  document.getElementById('nf-save').addEventListener('click',()=>{
    const err=document.getElementById('nf-err'); const problems=[];
    const name=document.getElementById('nf-name').value.trim();
    const kind=document.querySelector('#nf-kindwrap [aria-pressed="true"]').dataset.v;
    const raw=document.getElementById('nf-value').value.trim();
    const why=document.getElementById('nf-why').value.trim();
    if(!name) problems.push('Give the rule a name — it is how anyone will find it again.');
    if(!raw) problems.push(kind==='live'?'Give it a number.':'Write what the rule actually says.');
    if(kind==='live' && Number.isNaN(parseFloat(raw))) problems.push('"'+raw+'" is not a number. Either enter a number, or make this a rule written in words.');
    if(!why) problems.push('Write the reasoning. A rule with no reason is the one the next person deletes.');
    if(problems.length){ err.hidden=false; err.innerHTML='<b>Not ready yet</b><ul>'+problems.map(p=>`<li>${esc(p)}</li>`).join('')+'</ul>'; return }
    err.hidden=true;
    let group=document.getElementById('nf-group').value;
    if(group==='__new') group=document.getElementById('nf-newg').value.trim()||'Uncategorised';
    const source=document.getElementById('nf-source').value.trim()||'Added in this artifact';
    const ref=document.getElementById('nf-ref').value.trim();
    const unit=(document.getElementById('nf-unit')||{}).value?.trim()||'';
    const drives=(document.getElementById('nf-drives')||{}).value?.trim()||'';
    let base=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'rule';
    let id=base,i=2; while(LOGIC.rules.some(r=>r.id===id)){id=base+'-'+(i++)}
    const r={id,group,name,kind,type:kind==='live'?'number':(raw.includes('\n')?'longtext':'text'),
             value:kind==='live'?parseFloat(raw):raw,why,source,custom:true};
    if(unit)r.unit=unit; if(drives)r.drives=drives; if(ref)r.ref=ref;
    LOGIC.rules.push(r);
    lgAddOpen=false; document.getElementById('lg-formhost').innerHTML='';
    document.getElementById('lg-group').innerHTML='';
    lgTouch();
    setTimeout(()=>{const el=document.querySelector(`[data-lgid="${CSS.escape(id)}"]`);if(el)el.scrollIntoView({block:'center',behavior:'smooth'})},60);
  });
});

// --- export / import / reset
document.getElementById('lg-export').addEventListener('click',()=>{
  const txt=JSON.stringify({version:LOGIC.version,updated:D.asOf,rules:LOGIC.rules},null,1);
  const show=()=>uiPrompt({title:'Copy the registry JSON',body:'<p>Select all and copy. '+LOGIC.rules.length+' rules.</p>',value:txt,multiline:true,select:true,ok:'Done',cancel:false});
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(()=>uiToast('The full logic registry is on your clipboard as JSON: '+LOGIC.rules.length+' rules.'),show);
  else show();
});
document.getElementById('lg-import').addEventListener('click',()=>{
  uiPrompt({title:'Import a logic registry',body:'<p>Paste a logic registry JSON export. It replaces every rule currently in the page; nothing is saved into the artifact until you press Save.</p>',multiline:true,ok:'Import'}).then(txt=>{
    if(!txt)return;
    try{
      const p=JSON.parse(txt);
      const rules=Array.isArray(p)?p:p.rules;
      if(!Array.isArray(rules)||!rules.length||!rules[0].id)throw 0;
      LOGIC.rules=rules; document.getElementById('lg-group').innerHTML=''; lgTouch();
      uiToast('Imported '+rules.length+' rules. Review them, then Save to keep them.');
    }catch(e){uiToast('That did not parse as a logic registry export. Nothing changed.',{bad:true})}
  });
});
document.getElementById('lg-reset').addEventListener('click',()=>{
  uiConfirm({title:'Reset every rule?',body:'<p>Every rule goes back to the value this artifact was built with, and rules added here are removed. Nothing is saved into the artifact until you press Save.</p>',ok:'Reset all',danger:true}).then(ok=>{
    if(!ok)return;
    const log=LOGIC.log; LOGIC=JSON.parse(JSON.stringify(SEED)); if(log) LOGIC.log=log;
    document.getElementById('lg-group').innerHTML=''; lgTouch();
  });
});
document.getElementById('lg-discard').addEventListener('click',()=>{
  if(!lgDirty) return;   // after a save this button reads Close and only hides the bar
  uiConfirm({title:'Discard unsaved changes?',body:'<p>The rules go back to what is saved in this artifact.</p>',ok:'Discard',danger:true}).then(ok=>{
    if(!ok)return;
    LOGIC=JSON.parse(JSON.stringify(SAVED)); lgDirty=false; document.getElementById('lg-group').innerHTML=''; applyLogic(); renderAll();
  });
});

// --- save into the artifact itself
const useCap=async n=>{try{return (window.claude&&window.claude.use)?await window.claude.use(n):null}catch(e){return null}};
let SAVED=JSON.parse(JSON.stringify(window.LOGIC_SEED));
function lgReadOnly(msg){
  lgCanWrite=false;
  document.getElementById('lg-ro').innerHTML=`<div class="ro-note"><b>Changes here stay in your browser.</b> ${esc(msg)} Every rule is still fully editable and the dashboard recomputes as you go — use <b>Export JSON</b> to hand the registry on, or reload to get back to what the artifact holds.</div>`;
  const btn=document.getElementById('lg-save');
  if(btn){btn.textContent='Review changes';}
  renderLogic();
}
function changeSet(){
  const saved=SAVED.rules||[], out=[];
  LOGIC.rules.forEach(r=>{
    const s=saved.find(x=>x.id===r.id);
    if(!s) out.push({id:r.id,name:r.name,kind:'added',from:'\u2014',to:r.value});
    else if(String(s.value)!==String(r.value)) out.push({id:r.id,name:r.name,kind:'changed',from:s.value,to:r.value});
  });
  saved.forEach(s=>{ if(!LOGIC.rules.some(r=>r.id===s.id)) out.push({id:s.id,name:s.name,kind:'removed',from:s.value,to:'\u2014'}); });
  return out;
}
function openReview(){
  const ch=changeSet();
  if(!ch.length){uiToast('Nothing has changed.');return}
  const after=snapshot();
  const before=withRules(JSON.parse(JSON.stringify(SAVED.rules||[])),snapshot);
  const applicable=ch.filter(c=>c.kind!=='removed'&&LOGIC.rules.some(r=>r.id===c.id));
  const body=`<div class="rv-list">${ch.map(c=>`<div class="rv-row rv-${c.kind}">
      <span class="rv-k">${c.kind}</span>
      <span class="rv-n">${esc(c.name)}</span>
      <span class="rv-v">${esc(String(c.from).slice(0,60))} <span class="ar">\u2192</span> <b>${esc(String(c.to).slice(0,60))}</b></span>
    </div>`).join('')}</div>
    ${impactHTML(applicable,before,after)}`;
  document.getElementById('modal-title').textContent='Review '+ch.length+' change'+(ch.length===1?'':'s');
  document.getElementById('modal-meta').innerHTML='<span>Nothing is written until you confirm. The dashboard above already shows these values \u2014 confirming makes them part of the artifact so they travel with it.</span>';
  document.getElementById('modal-body').innerHTML=body;
  const foot=document.getElementById('modal-foot');
  const btn=document.getElementById('modal-open-client');
  btn.hidden=false;
  btn.textContent = lgCanWrite===false ? 'Export JSON instead' : 'Confirm and save';
  modalAction = lgCanWrite===false
    ? ()=>document.getElementById('lg-export').click()
    : ()=>doSave();
  const bad=assess(applicable,before,after).filter(x=>x.lv==='bad').length;
  foot.innerHTML = bad
    ? `<b style="color:var(--h-bad)">${bad} problem${bad===1?'':'s'} flagged above.</b> You can still save \u2014 the assessment is advice, not a gate.`
    : 'You can undo any of this with Revert on each rule, or Reset all to defaults.';
  modal.setAttribute('open','');
  document.querySelector('.modal .x').focus();
}
// every save appends who, when and what changed to logic.json (lg-history); the last 200 saves are kept
async function doSave(){
  if(lgSaving)return;
  const art=await useCap('artifact');
  if(!art){lgReadOnly('The artifact runtime is not available here.');return}
  lgSaving=true; renderLogic();
  let uid=null; try{ const u=await useCap('user'); if(u) uid=await u.id(); }catch(e){}
  const ver=(LOGIC.version||1)+1, at=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const cut=v=>{ const t=String(v??''); return t.length>300?t.slice(0,297)+'…':t; };
  const entry={v:ver, at, by:uid, changes:changeSet().map(c=>({id:c.id,name:c.name,kind:c.kind,from:cut(c.from),to:cut(c.to)}))};
  const log=((SAVED&&SAVED.log)||LOGIC.log||[]).concat([entry]).slice(-200);
  const payload=JSON.stringify({version:ver,updated:at.slice(0,10),updatedBy:uid,rules:LOGIC.rules,log},null,1);
  try{
    await art.publish({'logic.json':{content:payload,contentType:'application/json'}});
    LOGIC.version=ver; LOGIC.log=log; LOGIC.updatedBy=uid; SAVED=JSON.parse(JSON.stringify(LOGIC));
    lgDirty=false; lgSaving=false; renderAll();
    const bar=document.getElementById('lg-savebar');
    bar.hidden=false; bar.querySelector('.msg').innerHTML='Saved into this artifact. These rules now travel with it.';
    bar.querySelector('.save').style.display='none'; bar.querySelector('.discard').textContent='Close';
    bar.querySelector('.discard').onclick=()=>{bar.hidden=true;bar.querySelector('.save').style.display='';bar.querySelector('.discard').textContent='Discard';bar.querySelector('.discard').onclick=null;renderLogic()};
  }catch(err){
    lgSaving=false;
    const code=err&&err.code;
    if(code==='not_writer'||code==='not_granted'||code==='not_declared'||code==='capability_disabled'||code==='capability_removed'){
      lgReadOnly('You have read access to this artifact but not write access.');
    } else if(code==='conflict'){ uiToast('Someone saved this artifact at the same moment; the page reloads to their version.',{bad:true}); renderLogic(); }
    else if(code==='rate_limited'){ uiToast('Saving too often \u2014 wait a moment and save again.',{bad:true}); renderLogic(); }
    else { uiToast('Could not save: '+((err&&err.message)||'unknown error')+'. Your changes are still here; Export JSON if you want to keep them.',{bad:true,ms:12000}); renderLogic(); }
  }
}
document.getElementById('lg-save').addEventListener('click',openReview);
// --- the registry's own history (lg-history): who saved what, read from logic.json's log
const lgCut=v=>{ const t=String(v??''); return t.length>60?t.slice(0,58)+'\u2026':t; };
async function openLogicHistory(){
  const log=((LOGIC&&LOGIC.log)||[]).slice().reverse();
  let names={};
  try{ const u=await useCap('user'); const ids=[...new Set(log.map(e=>e.by).filter(b=>b&&b!=='claude'))];
    if(u&&ids.length){ const ps=await u.profiles(ids); ids.forEach(i=>{ names[i]=(ps[i]&&ps[i].name)||''; }); } }catch(e){}
  const who=b=>b==='claude'?'Claude':b?(names[b]||'Someone'):'Someone';
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const when=a=>{ const s=String(a||''); if(s.length<=10){ const q=s.split('-').map(Number); return q.length===3&&q[0]?q[2]+' '+MO[q[1]-1]+' '+q[0]:s; }
    const d=new Date(s); return isNaN(d)?s:d.getDate()+' '+MO[d.getMonth()]+' '+d.getFullYear()+', '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); };
  const body=log.length?'<div class="rv-list">'+log.map(e=>`<div class="lg-hrow"><div class="lg-hh"><b>${esc(who(e.by))}</b> saved version ${esc(e.v)}<span>${esc(when(e.at))}</span></div>`+
      (e.note?`<div class="lg-hn">${esc(e.note)}</div>`:'')+
      ((e.changes||[]).length?'<div class="lg-hc">'+e.changes.slice(0,40).map(c=>`<div class="rv-row rv-${esc(c.kind)}"><span class="rv-k">${esc(c.kind)}</span><span class="rv-n">${esc(c.name)}</span><span class="rv-v">${esc(lgCut(c.from))} <span class="ar">\u2192</span> <b>${esc(lgCut(c.to))}</b></span></div>`).join('')+
        (e.changes.length>40?`<div class="lg-hn">and ${e.changes.length-40} more</div>`:'')+'</div>':'')+'</div>').join('')+'</div>'
    :'<div class="empty">No save is recorded yet. From now on every save lists who made it, when, and what changed.</div>';
  openInfoModal('Logic history',`<span>${log.length} recorded save${log.length===1?'':'s'}, newest first. Kept inside logic.json, so the history travels with the artifact (lg-history).</span>`,body,'Revert on a rule card undoes one rule; Reset all goes back to the values the artifact was built with.');
}
document.getElementById('lg-history').addEventListener('click',openLogicHistory);

// --- load any saved registry, then settle the read-only state
(async function lgBoot(){
  try{
    const res=await fetch('logic.json',{cache:'no-store'});
    if(res.ok){
      const p=await res.json();
      if(p&&Array.isArray(p.rules)&&p.rules.length){
        LOGIC=p; SAVED=JSON.parse(JSON.stringify(p));
        document.getElementById('lg-group').innerHTML='';
        applyLogic(); renderAll();
      }
    }
  }catch(e){/* no saved overlay: the embedded seed stands */}
  try{
    const art=await useCap('artifact');
    if(!art){lgReadOnly('This page is not running as a published artifact, so there is nothing to save into.');return}
    lgCanWrite=true; renderLogic();
  }catch(e){lgReadOnly('The artifact runtime did not load in this view.')}
})();
// --- flow.json: the stored changelog read (src-stored-json). Fetched once; nothing here calls Jira.
(async function flowBoot(){
  try{
    const res=await fetch('flow.json',{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const p=await res.json();
    if(!p||!Array.isArray(p.rows)) throw new Error('not a flow extract');
    FLOW=p; FLOWIX={}; p.rows.forEach(r=>{FLOWIX[r.key]=r});
  }catch(e){ FLOW_ERR=(e&&e.message)||'unavailable'; }
  renderFlow(); renderDelivery(); renderPipe();
})();
// ----- the bridge between this ledger and the pipeline code below it (the CL bridge)
window.CL={
  LV:id=>LV(id), esc, shortName, fmtDate, fmtMo, days, asOf:D.asOf, eventsAsOf:TODAY_S,
  company:pd=>byId[pd]||null,
  activeClients:()=>D.companies.filter(c=>c.inPlanhatActive!==false),
  teams:()=>(D.teams||[]).map(t=>t.key),
  nextShow:pd=>((byId[pd]||{}).nextEvent)||null,
  showsOf:pd=>EVENTS.filter(e=>e.pd===pd&&isShow(e)&&e.s),
  flowRow:k=>FLOWIX[k]||null,
  flowHtml:k=>flowMini(k),
  modal:openInfoModal,
  openClient:pd=>{closeModal();openPd=null;openClient(pd)},
  pipelineChanged:rows=>{PIPE=(rows||[]).slice();PIPE_READY=true;renderKPIs();renderLedger();renderRisk();}
};
// ----- init
(function init(){
  const owners=[...new Set(D.companies.map(c=>c.owner).filter(Boolean))].sort();
  document.getElementById('f-owner').innerHTML='<option value="">All</option>'+owners.map(o=>`<option>${esc(o)}</option>`).join('');
  const teams=[...new Set(D.bugs.map(b=>b.team||'No team'))].sort();
  document.getElementById('b-team').innerHTML='<option value="">All</option>'+teams.map(o=>`<option>${esc(o)}</option>`).join('');
  const bcl=D.companies.filter(c=>D.bugs.some(b=>b.repIds.includes(c.pd)||b.affIds.includes(c.pd))).sort((a,b)=>shortName(a.name).localeCompare(shortName(b.name)));
  document.getElementById('b-client').innerHTML='<option value="">All</option>'+bcl.map(c=>`<option value="${c.pd}">${esc(shortName(c.name))}</option>`).join('');
  const dcl=D.companies.filter(c=>(c.storyKeys||[]).length).sort((a,b)=>shortName(a.name).localeCompare(shortName(b.name)));
  document.getElementById('d-client').innerHTML='<option value="">All named clients</option>'+dcl.map(c=>`<option value="${c.pd}">${esc(shortName(c.name))} (${c.storyKeys.length})</option>`).join('');
  document.getElementById('d-lens').innerHTML='<option value="">All</option>'+D.lenses.map(l=>`<option value="${l.key}">${esc(l.full)}</option>`).join('');
  const dteams=[...new Set(D.stories.map(s=>s.team).filter(Boolean))].sort();
  document.getElementById('d-team').innerHTML='<option value="">All</option>'+dteams.map(t=>`<option>${esc(t)}</option>`).join('');
  document.getElementById('t-owner').innerHTML='<option value="">All</option>'+owners.map(o=>`<option>${esc(o)}</option>`).join('');
  renderHvBar(); renderKPIs(); renderLedger(); renderRisk(); renderTimeline(); renderDelivery(); renderBugs(); renderInc(); renderModel(); chartPenalty(); renderFlow(); renderLogic();
  let t=null; try{t=localStorage.getItem('ep-ledger-tab')}catch(e){}
  if(t&&document.getElementById('panel-'+t))showTab(t);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{renderLedger();renderDelivery();renderTimeline()});
})();
})();

// ================= Shared: questions and notices asked inside the page =================
// The artifact frame can block window.confirm, prompt and alert (a sandboxed frame without modals
// answers them silently), which would turn Remove, Import and Add column into silent no-ops. Every
// question and every notice on this page is asked in the page instead (trap-browser-dialogs).
function uiEsc(s){ return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
let UI_DLG_N=0;
function uiDialog(opt){
  opt=opt||{};
  return new Promise(res=>{
    const id='ui-dlg-'+(++UI_DLG_N), prev=document.activeElement;
    const d=document.createElement('div');
    d.className='modal ui-dlg'; d.setAttribute('open','');
    d.setAttribute('role',opt.input?'dialog':'alertdialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby',id+'-t');
    d.innerHTML='<div class="scrim" data-uino></div><div class="box">'+
      '<div class="top"><div><h3 id="'+id+'-t">'+uiEsc(opt.title||'')+'</h3></div><button class="x" type="button" data-uino aria-label="Close">&#215;</button></div>'+
      '<div class="body">'+(opt.body||'')+
        (opt.input?(opt.multiline?'<textarea class="ui-in" rows="9" aria-label="'+uiEsc(opt.title||'')+'"></textarea>':'<input class="ui-in" aria-label="'+uiEsc(opt.title||'')+'">'):'')+'</div>'+
      '<div class="ui-acts">'+(opt.cancel===false?'':'<button type="button" class="ibtn" data-uino>'+uiEsc(opt.cancel||'Cancel')+'</button>')+
        '<button type="button" class="ibtn '+(opt.danger?'dangerfill':'primary')+'" data-uiyes>'+uiEsc(opt.ok||'OK')+'</button></div>'+
    '</div>';
    document.body.appendChild(d);
    const inp=d.querySelector('.ui-in'); if(inp) inp.value=opt.value||'';
    const done=v=>{ document.removeEventListener('keydown',kd,true); d.remove(); try{ if(prev&&prev.focus) prev.focus(); }catch(e){} res(v); };
    const kd=e=>{
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(opt.input?null:false); return; }
      if(e.key==='Enter' && inp && inp.tagName==='INPUT'){ e.preventDefault(); done(inp.value); return; }
      if(e.key==='Tab'){ uiTrap(e,d); }
    };
    document.addEventListener('keydown',kd,true);
    d.addEventListener('click',e=>{
      if(e.target.closest('[data-uiyes]')) done(opt.input?inp.value:true);
      else if(e.target.closest('[data-uino]')) done(opt.input?null:false);
    });
    setTimeout(()=>{ const f=inp||d.querySelector('[data-uiyes]'); f.focus(); if(inp&&opt.select) inp.select(); },0);
  });
}
function uiConfirm(o){ return uiDialog(o); }
function uiPrompt(o){ return uiDialog(Object.assign({input:true},o)); }
function uiAlert(o){ return uiDialog(Object.assign({cancel:false,ok:'Close'},o)); }
// keep Tab inside an open dialog
function uiTrap(e,box){
  const f=[...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);
  if(!f.length) return;
  const first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
}
let UI_TOAST_T=null;
function uiToastHide(){ const t=document.getElementById('ui-toast'); if(t) t.hidden=true; }
function uiToast(msg,opt){
  opt=opt||{};
  let t=document.getElementById('ui-toast');
  if(!t){ t=document.createElement('div'); t.id='ui-toast'; t.className='ui-toast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
  const hide=()=>{ t.hidden=true; };
  t.innerHTML='<span class="m"></span>'+(opt.action?'<button type="button" class="a"></button>':'')+'<button type="button" class="x" aria-label="Dismiss">&#215;</button>';
  t.querySelector('.m').textContent=msg;
  if(opt.action){ const a=t.querySelector('.a'); a.textContent=opt.action; a.onclick=()=>{ hide(); if(opt.onAction) opt.onAction(); }; }
  t.querySelector('.x').onclick=hide;
  t.classList.toggle('bad',!!opt.bad);
  t.classList.toggle('top',!!document.querySelector('.modal[open]'));   // never over a form's buttons
  t.hidden=false;
  clearTimeout(UI_TOAST_T); UI_TOAST_T=setTimeout(hide,opt.ms||8000);
}

// ================= Pipeline ledger =================
const ppE=uiEsc;
const ppLS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} return null; };
// Rows and the column schema live in the artifact's shared database, so an edit here is an edit
// everyone sees. Every change is written together with its history entry (pp-history). Rules pp-*.
const PP = {
  db:null, user:null, uid:null, ready:false, canWrite:null, err:null,
  meta:null, rows:[], pop:null, ed:null, hm:null, flash:null,
  f:{month:'',team:'',driver:'',area:'',status:'',flag:'',q:''},
  group:'month', sort:{k:'',dir:1}, hidden:new Set(['impact','notes','rationale','team']),
  view:'grid', names:{}, subs:[]
};
// the viewer's own view settings (pp-default-view): the grid unless they chose the table
(function ppPrefs(){
  const v=ppLS('ep-pp-view'); if(v==='grid'||v==='table') PP.view=v;
  const g=ppLS('ep-pp-group'); if(g!==null && ['month','team','driver','area',''].includes(g)) PP.group=g;
  try{ const h=JSON.parse(ppLS('ep-pp-hidden')||'null'); if(Array.isArray(h)) PP.hidden=new Set(h); }catch(e){}
})();
function ppSavePrefs(){ ppLS('ep-pp-view',PP.view); ppLS('ep-pp-group',PP.group); ppLS('ep-pp-hidden',JSON.stringify([...PP.hidden])); }
// ---- spec v1 §2 and §3: team from the work, driver = who it is for, tier from the driver (rules pp-*)
const CLB = () => window.CL || null;
function ppTeam(r){
  const j=r.j, v=r.v||{};
  if(j && j.team) return {t:j.team, src:'Jira'};
  if(v.team) return {t:v.team, src:'row'};
  return {t:null, src:null};
}
function ppDriver(r){
  const d=String((r.v||{}).driver||'').trim();
  if(!d) return {k:'', label:null, tier:null, c:null};
  if(d==='Platform') return {k:'Platform', label:'Platform', tier:null, c:null};
  const cl=CLB(), c=cl?cl.company(d):null;
  const labels=((ppCols().find(x=>x.key==='driver')||{}).optLabels)||{};
  return {k:d, label:c?cl.shortName(c.name):(labels[d]||d), tier:c?c.tier:null, c};
}
function ppLV(id,dflt){ const cl=CLB(); const v=cl?cl.LV(id):undefined; return (v===undefined||v===null||v===0)?dflt:+v; }
const ppWhyMax = () => ppLV('pp-why-one-line',140);
const ppEom = m => { const p=String(m||'').split('-').map(Number); return p.length===2&&p[0]&&p[1]?new Date(Date.UTC(p[0],p[1],0)).toISOString().slice(0,10):null; };
// promise-versus-show (rk-promise-broken): the month ends after the driver's next show starts
function ppBroken(r){
  const d=ppDriver(r); if(!d.c) return null;
  const cl=CLB(), n=cl?cl.nextShow(d.k):null; if(!n) return null;
  const v=r.v||{}, j=r.j||{}; if(v.status==='Done'||j.canon==='Done') return null;
  const e=ppEom(v.month); if(!e) return null;
  return e>n.s ? n : null;
}
function ppWeekdays(m){ const p=String(m||'').split('-').map(Number); if(p.length!==2||!p[0]) return null;
  let n=0; const last=new Date(Date.UTC(p[0],p[1],0)).getUTCDate();
  for(let d=1; d<=last; d++){ const w=new Date(Date.UTC(p[0],p[1]-1,d)).getUTCDay(); if(w>0&&w<6) n++; }
  return n; }
const ppTeamName = r => ppTeam(r).t || 'No team';
const ppDriverName = r => { const d=ppDriver(r); return d.k ? d.label : 'Driver not set'; };
const PPDAY = 8;
const PP_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ppMo = m => /^\d{4}-\d{2}$/.test(m||'') ? PP_MONTHS[+m.slice(5,7)-1]+' '+m.slice(0,4) : (m||'—');
const ppD  = n => n==null ? '—' : (Math.round(n*10)/10).toString().replace(/\.0$/,'')+'d';
const ppToday = () => new Date().toISOString().slice(0,10);
const ppNow = () => new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
let PP_SEQ=0;
const ppHid = () => 'h'+Date.now().toString(36)+(PP_SEQ++%1296).toString(36).padStart(2,'0')+Math.random().toString(36).slice(2,5);

const PP_CANON = [['open','Planned'],['planned','Planned'],['discovery','Discovery'],
  ['in progress','In Progress'],['in testing','In Testing'],['ready for release','Ready for Release'],
  ['ready for deploy','Ready for Release'],['done','Done'],['blocked','Blocked'],['at risk','At Risk']];
function ppCanon(s){ const t=String(s||'').toLowerCase().trim();
  for(const [k,v] of PP_CANON) if(t.startsWith(k)) return v;
  if(t.includes('discovery')) return 'Discovery';
  return String(s||'').trim(); }

// Estimate text -> person-days. Mirrors the rule in the Logic tab (pp-estimate-parse).
function ppDays(t){
  if(!t || !String(t).trim()) return {days:null, daysKind:'none'};
  const s=String(t).toLowerCase();
  let m=s.match(/total:\s*([\d.]+)\s*person-days/); if(m) return {days:+m[1], daysKind:'point'};
  m=s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*d\b/);
  if(m) return {days:Math.round(((+m[1]+ +m[2])/2)*100)/100, daysKind:'range'};
  const nums=[...s.matchAll(/(\d+(?:\.\d+)?)\s*d\b/g)].map(x=>+x[1]);
  if(nums.length){
    const partial=/pending|required|rough/.test(s);
    const total=Math.round(nums.reduce((a,b)=>a+b,0)*100)/100;
    return {days: nums.length>1?total:nums[0], daysKind: partial?'partial':'point'};
  }
  return {days:null, daysKind:'none'};
}

function ppFlags(r){
  const j=r.j, v=r.v||{}, n=r.n||{}, today=ppToday();
  const wk=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
  return {
    drift: !!(j && j.canon && j.canon!==v.status),
    overdue: !!(j && j.due && j.due<today && j.canon!=='Done'),
    dueSoon: !!(j && j.due && j.due>=today && j.due<=wk && j.canon!=='Done'),
    shipped: !!(j && j.canon==='Done'),
    noEstimate: n.days==null,
    noJira: !j,
    overEstimate: !!(j && j.spentDays && n.days && j.spentDays > n.days*1.15),
    brokenPromise: !!ppBroken(r),
    noDriver: !String(v.driver||'').trim(),
    noTeam: !ppTeam(r).t,
    whyLong: String(v.why||'').length > ppWhyMax()
  };
}
const PPFLAG=[['brokenPromise','over','After the show'],['overdue','over','Overdue'],['drift','drift','Drift'],['shipped','ship','Shipped'],
  ['dueSoon','soon','Due ≤7d'],['overEstimate','drift','Over estimate'],['noEstimate','noest','No estimate'],
  ['noDriver','noest','Driver not set'],['noTeam','noest','No team'],['whyLong','drift','Why over limit']];

function ppCols(){ return (PP.meta&&PP.meta.columns)||[]; }
function ppDer(){ return (PP.meta&&PP.meta.derived)||[]; }
function ppVisible(){ return ppCols().filter(c=>!PP.hidden.has(c.key)); }

// ---- which rows count: removed rows are kept for history and restore; an item with no Feature is a draft (pp-draft)
const ppIsDel = r => !!(r && r.deleted && r.deleted.at);
const ppIsDraft = r => !ppIsDel(r) && !String((r.v||{}).feature||'').trim();
const ppLive = () => PP.rows.filter(r=>!ppIsDel(r) && !ppIsDraft(r));
const ppDrafts = () => PP.rows.filter(ppIsDraft);
const ppRemoved = () => PP.rows.filter(ppIsDel).sort((a,b)=>String(b.deleted.at).localeCompare(String(a.deleted.at)));
const ppRO = () => PP.canWrite===false;
function ppShort(r){ const v=(r&&r.v)||{}; const f=String(v.feature||'').trim(); return (v.key?v.key+' ':'')+(f?'“'+(f.length>48?f.slice(0,46)+'…':f)+'”':'the draft'); }
function ppTitle(r){ const v=(r&&r.v)||{}; return (v.key?v.key+' · ':'')+(String(v.feature||'').trim()||'Untitled draft'); }
function ppName(id,mid){
  if(!id) return mid?'someone':'Someone';
  if(id==='claude') return 'Claude';
  if(PP.uid && id===PP.uid) return mid?'you':'You';
  return PP.names[id] || (mid?'someone':'Someone');
}
// a stored time as the viewer reads it; a date with no time says so rather than inventing one
function ppWhen(at,short){
  const s=String(at||''); if(!s) return '—';
  const p=s.slice(0,10).split('-').map(Number); if(p.length!==3||!p[0]) return s;
  const day=p[2]+' '+PP_MONTHS[p[1]-1]+' '+p[0];
  if(s.length<=10) return short?day:day+', time not recorded';
  const d=new Date(s); if(isNaN(d)) return day;
  const t=d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  return short ? t : d.getDate()+' '+PP_MONTHS[d.getMonth()]+' '+d.getFullYear()+', '+t;
}
// a date alone reads as the date; a timestamp as date and time
function ppWhenDay(at){ const s=String(at||''); return s.length<=10 ? ppWhen(s,true) : ppWhen(s); }
function ppDayKey(at){ const s=String(at||''); if(s.length<=10) return s;
  const d=new Date(s); if(isNaN(d)) return s.slice(0,10);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function ppDayLabel(k){ const p=String(k).split('-').map(Number); if(p.length!==3||!p[0]) return k;
  const d=new Date(p[0],p[1]-1,p[2]); return d.toLocaleDateString(undefined,{weekday:'long'})+' '+p[2]+' '+PP_MONTHS[p[1]-1]+' '+p[0]; }
const PP_FLD={feature:'Feature',key:'Jira',why:'Why',month:'Month',team:'Team',driver:'Driver',status:'Status',priority:'Priority',
  area:'Area',owner:'Raised by',estimate:'Estimate',impact:'Impact',deps:'Dependencies / Risks',notes:'Notes',rationale:'Rationale'};
function ppFldLabel(k){ if(k==='team') return 'Team'; const c=ppCols().find(x=>x.key===k); return c?c.label:(PP_FLD[k]||k); }
function ppFmtVal(k,v){
  const s=String(v??'').trim(); if(!s) return '';
  if(k==='month') return ppMo(s);
  if(k==='driver'){ if(s==='Platform') return 'Platform';
    const cl=CLB(), c=cl?cl.company(s):null, labels=((ppCols().find(x=>x.key==='driver')||{}).optLabels)||{};
    return c?cl.shortName(c.name):(labels[s]||s); }
  return s;
}

// ---------- data access ----------
async function ppBoot(){
  try{ PP.db = await claude.use('db'); }catch(e){ PP.db=null; }
  try{ PP.user = await claude.use('user'); }catch(e){ PP.user=null; }
  if(PP.user){
    try{ PP.canWrite = await PP.user.can('data.write'); }catch(e){ PP.canWrite=null; }
    try{ PP.uid = await PP.user.id(); }catch(e){ PP.uid=null; }
  }
  if(!PP.db){ PP.ready=true; ppRender(); return; }
  const onErr = e => { PP.err = (e&&e.code)||'unavailable'; PP.ready=true; ppRender(); };
  PP.subs.push(PP.db.doc('config/pipeline').onSnapshot(s=>{
    PP.meta = s.exists ? s.data() : null; PP.ready=true; ppRender(); ppHmSync();
  }, onErr));
  PP.subs.push(PP.db.collection('pipeline').onSnapshot(s=>{
    PP.rows = s.docs.map(d=>Object.assign({id:d.id}, d.data()));
    PP.rows.sort((a,b)=>(a.order||0)-(b.order||0));
    PP.ready=true; ppRender(); ppNames(); ppEdSync(); ppHmSync();
    // the ledger reads the pipeline for investment, the risk matrix and promise-versus-show: live items only
    const cl=CLB(); if(cl&&cl.pipelineChanged) cl.pipelineChanged(ppLive());
  }, onErr));
}
// store only ids; names are resolved for this viewer each time the state changes
function ppIdsInState(){
  const s=new Set(), add=i=>{ if(i && i!=='claude') s.add(i); };
  PP.rows.forEach(r=>{ add(r.updatedBy); add(r.createdBy); if(r.deleted) add(r.deleted.by); Object.values(r.h||{}).forEach(e=>add(e&&e.by)); });
  Object.values((PP.meta&&PP.meta.h)||{}).forEach(e=>add(e&&e.by));
  return [...s];
}
async function ppNames(){
  if(!PP.user||!PP.user.profiles) return;
  const ids=ppIdsInState(); if(!ids.length) return;
  try{
    const ps=await PP.user.profiles(ids); let changed=false;
    ids.forEach(i=>{ const n=(ps[i]&&ps[i].name)||''; if(PP.names[i]!==n){ PP.names[i]=n; changed=true; } });
    if(changed){ ppRender(); ppEdSync(true); ppHmSync(); }
  }catch(e){}
}
function ppSay(msg,cls){ const el=document.getElementById('pp-saving'); if(!el)return;
  el.className='pp-saving '+(cls||''); el.textContent=msg||'';
  if(msg) setTimeout(()=>{ if(el.textContent===msg){el.textContent='';el.className='pp-saving';} },2600); }

async function ppWrite(fn,label){
  if(!PP.db) return false;
  ppSay('Saving…');
  try{ await fn(); ppSay(label||'Saved','ok'); return true; }
  catch(e){
    const c=(e&&e.code)||'unavailable';
    if(c==='invalid_argument' && PP.canWrite!==true){
      PP.canWrite=false; ppSay('Read-only','err'); ppRender();
      uiToast('Not saved: your access to this artifact is read-only. Ask the owner for “Can interact” or higher.',{bad:true});
    } else if(c==='invalid_argument'){
      ppSay('Not saved','err'); uiToast('Not saved: someone may have removed this item a moment ago. Reload and try again.',{bad:true});
    } else if(c==='quota_exceeded'){
      ppSay('Not saved','err'); uiToast('Not saved: the ledger’s database is full. Ask Claude to archive old history.',{bad:true});
    } else {
      ppSay('Not saved ('+c+')','err'); uiToast('Not saved ('+c+'). Nothing was lost on the page; try again in a moment.',{bad:true});
    }
    return false;
  }
}
// The one write path for field changes: the values and their history entries go in the same update,
// so a change can never land without its record (pp-history). Returns the batch id, or null.
async function ppCommit(id,changes,opt){
  opt=opt||{};
  const r=PP.rows.find(x=>x.id===id); if(!r||!changes.length) return null;
  const at=ppNow(), by=PP.uid||null, b=ppHid();
  const patch={v:{}, h:{}, updatedAt:at, updatedBy:by};
  changes.forEach(c=>{
    let to=c.to==null?'':c.to;
    if(c.f==='status') to=ppCanon(to);
    if(c.f==='key') to=String(to).trim().toUpperCase();
    patch.v[c.f]=to;
    if(c.f==='estimate') patch.n=ppDays(to);
    const e={at, by, k:opt.k||'edit', f:c.f, from:c.from==null?'':c.from, to, b};
    if(opt.rev) e.rev=opt.rev;
    patch.h[ppHid()]=e;
  });
  const ok=await ppWrite(()=>PP.db.doc('pipeline/'+id).update(patch), opt.label);
  return ok?b:null;
}
async function ppCreate(vals){
  const id='p'+Date.now().toString(36);
  const order=Math.max(0,...PP.rows.map(r=>r.order||0))+10;
  const v={}; ppCols().forEach(c=>v[c.key]='');
  Object.keys(vals).forEach(k=>{ v[k]=vals[k]; });
  v.status=ppCanon(v.status||'Planned'); if(!v.priority) v.priority='Customer';
  if(v.key) v.key=String(v.key).trim().toUpperCase();
  const at=ppNow(), by=PP.uid||null, init={};
  Object.keys(v).forEach(k=>{ if(String(v[k]??'').trim()) init[k]=v[k]; });
  const doc={order, v, raw:{}, n:ppDays(v.estimate), j:null, createdAt:at, createdBy:by, updatedAt:at, updatedBy:by,
    source:'added-here', h:{[ppHid()]:{at, by, k:'add', vals:init, b:ppHid()}}};
  const ok=await ppWrite(()=>PP.db.doc('pipeline/'+id).set(doc),'Item added');
  return ok?id:null;
}
// Remove hides the item and keeps it, with its history, restorable from History (pp-history)
async function ppRemove(id){
  const at=ppNow(), by=PP.uid||null;
  return ppWrite(()=>PP.db.doc('pipeline/'+id).update({deleted:{at,by}, updatedAt:at, updatedBy:by, h:{[ppHid()]:{at,by,k:'remove',b:ppHid()}}}),'Item removed');
}
async function ppRestore(id){
  const at=ppNow(), by=PP.uid||null;
  return ppWrite(()=>PP.db.doc('pipeline/'+id).update({deleted:null, updatedAt:at, updatedBy:by, h:{[ppHid()]:{at,by,k:'restore',b:ppHid()}}}),'Item restored');
}
async function ppRemoveWithUndo(r){
  if(!r) return;
  if(PP.flash===r.id) PP.flash=null;
  const ok=await ppRemove(r.id); if(!ok) return;
  uiToast('Removed '+ppShort(r)+'. It is kept in History → Removed.',{action:'Undo',onAction:async()=>{ if(await ppRestore(r.id)){ PP.flash=r.id; ppRender(); } }});
}
async function ppSaveCols(cols,desc){
  const at=ppNow(), by=PP.uid||null, hid=ppHid();
  const ok=await ppWrite(()=>PP.db.doc('config/pipeline').update({columns:cols, updatedAt:at, h:{[hid]:Object.assign({at,by,k:'columns',b:hid},desc)}}),'Columns saved');
  if(ok && desc && desc.op!=='revert') uiToast(ppColText(desc)+'.',{action:'Undo',onAction:()=>ppUndoCols(hid)});
  return ok;
}

// ---------- history (pp-history) ----------
function ppHistCmp(a,b){ const A=String(a.at||''), B=String(b.at||''); return A<B?1:A>B?-1:(a.id<b.id?1:a.id>b.id?-1:0); }
function ppHistOf(r){ const h=(r&&r.h)||{}; return Object.keys(h).filter(id=>h[id]&&typeof h[id]==='object').map(id=>Object.assign({id},h[id])).sort(ppHistCmp); }
function ppCfgHist(){ const h=(PP.meta&&PP.meta.h)||{}; return Object.keys(h).filter(id=>h[id]&&typeof h[id]==='object').map(id=>Object.assign({id,cfg:true},h[id])).sort(ppHistCmp); }
// entries saved together share a batch id: one save, one line in the history
function ppBatches(list){
  const m=new Map();
  list.forEach(e=>{ const k=e.b||e.id;
    if(!m.has(k)) m.set(k,{k, at:e.at, by:e.by, kind:e.k, es:[]});
    const g=m.get(k); g.es.push(e); if(String(e.at||'')>String(g.at||'')) g.at=e.at; });
  return [...m.values()].sort((a,b)=>{ const A=String(a.at||''), B=String(b.at||''); return A<B?1:A>B?-1:0; });
}
function ppColText(d){
  const q=s=>'“'+s+'”';
  if(!d) return 'Columns changed';
  if(d.op==='rename') return d.fromLabel!==d.toLabel ? 'Renamed the column '+q(d.fromLabel)+' to '+q(d.toLabel) : 'Changed the column '+q(d.toLabel)+' to '+({text:'short text',long:'long text',select:'a list'}[d.toType]||d.toType);
  if(d.op==='move') return 'Moved the column '+q(d.label||d.key)+' '+(d.to<d.from?'left':'right');
  if(d.op==='add') return 'Added the column '+q(d.label);
  if(d.op==='remove') return 'Removed the column '+q((d.col&&d.col.label)||d.key);
  if(d.op==='revert') return 'Undid: '+String(d.what||'a column change');
  return d.note || 'Changed the columns';
}
async function ppUndoCols(hid){
  const e=((PP.meta&&PP.meta.h)||{})[hid]; if(!e) return;
  const cols=ppCols().slice(), i=cols.findIndex(c=>c.key===e.key);
  if(e.op==='rename' && i>=0) cols[i]=Object.assign({},cols[i],{label:e.fromLabel,type:e.fromType});
  else if(e.op==='move' && i>=0){ const c=cols.splice(i,1)[0]; cols.splice(Math.min(e.from,cols.length),0,c); }
  else if(e.op==='add' && i>=0) cols.splice(i,1);
  else if(e.op==='remove' && i<0 && e.col) cols.splice(Math.min(e.index,cols.length),0,e.col);
  else { uiToast('That column change cannot be undone any more: the column has changed since.',{bad:true}); return; }
  await ppSaveCols(cols,{op:'revert', rev:hid, key:e.key, what:ppColText(e)});
}
// undo one saved batch on one item; a field that changed again since is only set back when asked
async function ppUndoBatch(rowId,b){
  const r=PP.rows.find(x=>x.id===rowId); if(!r) return;
  const es=ppHistOf(r).filter(e=>(e.b||e.id)===b); if(!es.length) return;
  const k=es[0].k;
  if(k==='add'){ return ppRemoveWithUndo(r); }
  if(k==='remove'){ if(await ppRestore(r.id)){ PP.flash=r.id; ppRender(); uiToast('Restored '+ppShort(r)+'.'); } return; }
  if(k==='restore'){ return ppRemoveWithUndo(r); }
  const fields=es.filter(e=>e.f);
  if(!fields.length) return;
  const stale=fields.filter(e=>String((r.v||{})[e.f]??'')!==String(e.to??''));
  if(stale.length){
    const ok=await uiConfirm({title:'Changed again since',
      body:'<p>'+stale.map(e=>'<b>'+ppE(ppFldLabel(e.f))+'</b> is now “'+ppE(ppFmtVal(e.f,(r.v||{})[e.f])||'empty')+'”').join('; ')+
        '. Undoing sets '+(fields.length===1?'it':'these fields')+' back to what '+(fields.length===1?'it was':'they were')+' before that save and overwrites the newer value.</p>',
      ok:'Undo anyway'});
    if(!ok) return;
  }
  const nb=await ppCommit(r.id, fields.map(e=>({f:e.f, from:(r.v||{})[e.f]??'', to:e.from??''})), {k:'revert', rev:b, label:'Undone'});
  if(nb){ PP.flash=r.id; ppRender(); uiToast('Undone on '+ppShort(r)+'.',{action:'Redo',onAction:()=>ppUndoBatch(r.id,nb)}); }
}
async function ppRevertEntry(rowId,eid){
  const r=PP.rows.find(x=>x.id===rowId); if(!r) return;
  const e=ppHistOf(r).find(x=>x.id===eid); if(!e||!e.f) return;
  const cur=String((r.v||{})[e.f]??'');
  if(cur===String(e.from??'')){ uiToast(ppFldLabel(e.f)+' already has that value.'); return; }
  if(cur!==String(e.to??'')){
    const ok=await uiConfirm({title:'Changed again since',
      body:'<p><b>'+ppE(ppFldLabel(e.f))+'</b> is now “'+ppE(ppFmtVal(e.f,cur)||'empty')+'”. Set it back to “'+ppE(ppFmtVal(e.f,e.from)||'empty')+'” anyway?</p>',
      ok:'Set it back'});
    if(!ok) return;
  }
  const nb=await ppCommit(r.id,[{f:e.f, from:cur, to:e.from??''}],{k:'revert', rev:e.id, label:'Reverted'});
  if(nb){ PP.flash=r.id; ppRender(); uiToast(ppFldLabel(e.f)+' set back on '+ppShort(r)+'.',{action:'Undo',onAction:()=>ppUndoBatch(r.id,nb)}); }
}

// ---------- filtering + grouping ----------
function ppFiltered(){
  const f=PP.f, q=f.q.toLowerCase();
  let rows=ppLive().filter(r=>{
    const v=r.v||{}, fl=ppFlags(r);
    if(f.month && v.month!==f.month) return false;
    if(f.team  && ppTeamName(r)!==f.team) return false;
    if(f.driver&& ppDriverName(r)!==f.driver) return false;
    if(f.area  && v.area!==f.area)  return false;
    if(f.status&& v.status!==f.status) return false;
    if(f.flag  && !fl[f.flag]) return false;
    if(q && !Object.values(v).some(x=>String(x||'').toLowerCase().includes(q))) return false;
    return true;
  });
  if(PP.group && !PP.sort.k){
    const g=PP.group;
    rows=rows.slice().sort((a,b)=>{
      const A=ppGroupSort(a,g), B=ppGroupSort(b,g);
      return A<B?-1:A>B?1:(a.order||0)-(b.order||0);
    });
  }
  if(PP.sort.k){ const k=PP.sort.k, d=PP.sort.dir;
    rows=rows.slice().sort((a,b)=>{
      const A = k==='_days' ? (a.n&&a.n.days!=null?a.n.days:-1) : String((a.v||{})[k]||'').toLowerCase();
      const B = k==='_days' ? (b.n&&b.n.days!=null?b.n.days:-1) : String((b.v||{})[k]||'').toLowerCase();
      return (A<B?-1:A>B?1:0)*d;
    });
  }
  return rows;
}
const ppAnyFilter = () => Object.values(PP.f).some(Boolean);
function ppSum(rows){ return rows.reduce((a,r)=>a+((r.n&&r.n.days)||0),0); }
// the value a row groups under: team and driver are derived, everything else is the cell
function ppGroupKey(r,g){
  if(g==='team') return ppTeamName(r);
  if(g==='driver') return ppDriverName(r);
  return (r.v||{})[g]||'—';
}
// unassigned buckets sort last so the named groups read first
function ppGroupSort(r,g){ const k=ppGroupKey(r,g); return (k==='No team'||k==='Driver not set'||k==='—')?'~'+k:k; }
function ppBy(rows,key){
  const m=new Map();
  rows.forEach(r=>{ const k=ppGroupKey(r,key);
    const e=m.get(k)||{d:0,n:0,miss:0}; e.d+=(r.n&&r.n.days)||0; e.n++;
    if(!r.n||r.n.days==null) e.miss++; m.set(k,e); });
  return [...m.entries()].sort((a,b)=>b[1].d-a[1].d || a[0].localeCompare(b[0]));
}

// ---------- render ----------
function ppRender(){
  const host=document.getElementById('panel-pipeline'); if(!host) return;
  if(!PP.ready){ host.innerHTML='<div class="empty">Loading the pipeline ledger…</div>'; return; }
  if(!PP.db){
    host.innerHTML='<div class="pp-ro"><b>The shared pipeline database is not available in this view.</b> '+
      'It needs a signed-in viewer inside the ExpoPlatform organisation. Everything else on this page still works.</div>';
    return;
  }
  if(PP.err){
    host.innerHTML='<div class="pp-ro"><b>The pipeline ledger could not load ('+ppE(PP.err)+').</b> '+
      'Reload the page; if it persists the database grant was withdrawn for this view.</div>';
    return;
  }
  if(!PP.meta){
    host.innerHTML='<div class="pp-note"><b>The pipeline ledger is empty.</b> Its column schema and rows live in this '+
      'artifact&rsquo;s shared database, seeded from the Confluence page. Ask Claude to seed it and it appears here for everyone.</div>';
    return;
  }
  // every save re-renders; keep the grid's and the table's own scroll where the reader left it
  const keep=[...host.querySelectorAll('.tlwrap,.pp-wrap')].map(e=>[e.classList.contains('tlwrap')?'.tlwrap':'.pp-wrap',e.scrollTop,e.scrollLeft]);
  const rows=ppFiltered(), all=ppLive();
  host.innerHTML =
    ppBanner() + ppStats(all) + ppDraftsHtml() + ppHead() + ppToolbar(rows,all) +
    (PP.view==='grid' ? ppTL(rows,all) : ppGrid(rows)) + ppAlerts(all) + ppRollups(all);
  keep.forEach(([sel,t,l])=>{ const e=host.querySelector(sel); if(e){ e.scrollTop=t; e.scrollLeft=l; } });
  ppBind(); ppDoFlash(host);
}
function ppDoFlash(host){
  if(!PP.flash) return;
  const id=PP.flash; PP.flash=null;
  const el=host.querySelector('.pp-chip[data-ppedit="'+id+'"], tr[data-pprow="'+id+'"]');
  if(!el) return;
  el.classList.add('pp-flash');
  try{ el.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
  setTimeout(()=>el.classList.remove('pp-flash'),2600);
}
function ppToView(){ const h=document.querySelector('#panel-pipeline .pp-head'); if(h) try{ h.scrollIntoView({block:'start',behavior:'smooth'}); }catch(e){} }

function ppBanner(){
  const s=(PP.meta&&PP.meta.source)||{};
  const ro = ppRO();
  return '<div class="pp-note">'+
    '<b>What we have committed to build.</b> One item per must-have feature per target month, kept in this artifact&rsquo;s shared database: '+
    'add or change an item here and everyone with access sees it at once. Every change is recorded in <b>History</b> with who made it and when, and can be undone.'+
    '<details class="pp-how"><summary>How the ledger works</summary><div>'+
      'Imported from <a href="'+ppE(s.url||'#')+'" target="_blank" rel="noopener">the Confluence ledger</a> as it stood on '+ppE(s.lastModified||'18 Sep 2026')+'; that page now points here. '+
      'Month, Area and Status are normalised so the ledger can be totalled &mdash; the wording each owner originally used is kept on every item. '+
      '<b>Effort rolls up by team</b>, read from the Jira ticket; Raised by is whoever wrote the item down and enters no total (pp-team-unit). '+
      '<b>Driver</b> says who an item is for &mdash; a client or Platform &mdash; and gives it a tier (pp-driver). '+
      'On the <b>Month × team</b> grid, click an item to open it, or <b>+ Add</b> in any cell to add one there with its month, team and driver filled in. '+
      'In the <b>Table</b>, click a cell to change it in place, or <b>Open</b> for the whole item. '+
      'Nothing in the item form is saved until you press Save. Removing an item keeps it, with its history, under <b>Removed</b>, where it can be restored (pp-history). '+
      'Grey table columns are read from Jira or derived, and cannot be typed into.'+
    '</div></details></div>' +
    (ro?'<div class="pp-ro"><b>You have read-only access to this artifact</b>, so you can open items and read their history but not change them. '+
        'Ask the owner for &ldquo;Can interact&rdquo; or higher to edit.</div>':'');
}

function ppStats(all){
  const days=ppSum(all), mo=ppBy(all,'month');
  const fl=all.map(ppFlags);
  const c=k=>fl.filter(f=>f[k]).length;
  const miss=c('noEstimate');
  const t=(n,l,d,cls)=>'<div class="pp-stat'+(cls?' '+cls:'')+'"><div class="n">'+n+'</div><div class="l">'+l+'</div><div class="d">'+d+'</div></div>';
  return '<div class="pp-stats">'+
    t(all.length,'Must-have items',mo.map(([k,v])=>ppMo(k)+' '+v.n).join(' · ')||'—')+
    t(ppD(days),'Committed effort', miss? miss+' of '+all.length+' carry no estimate':'every item estimated','mid')+
    mo.slice(0,2).map(([k,v])=>t(ppD(v.d),ppMo(k)+' load',v.n+' items'+(v.miss?' · '+v.miss+' unestimated':''))).join('')+
    t(c('drift'),'Stated status drifted','vs live Jira', c('drift')?'warn':'')+
    t(c('overdue'),'Past their Jira due date', c('overdue')?all.filter((r,i)=>fl[i].overdue).map(r=>r.v.key).join(', '):'none', c('overdue')?'warn':'')+
    t(c('shipped'),'Already shipped','still listed here', c('shipped')?'mid':'')+
    t((all.length-c('noDriver'))+' / '+all.length,'Have a Driver', c('noDriver')? c('noDriver')+' badged Driver not set':'every item says who it is for', c('noDriver')?'mid':'')+
    t(c('brokenPromise'),'Due after the show', c('brokenPromise')?all.filter((r,i)=>fl[i].brokenPromise).map(r=>r.v.key||r.v.feature).join(', '):'none among driven items', c('brokenPromise')?'warn':'')+
    '</div>';
}

// drafts: items with no Feature (the old Add button wrote blank rows straight away) — pp-draft
function ppDraftsHtml(){
  const ds=ppDrafts(); if(!ds.length) return '';
  const ro=ppRO(), one=ds.length===1;
  return '<div class="pp-drafts"><div class="t"><b>'+ds.length+' draft'+(one?'':'s')+' with no Feature.</b> '+
    (one?'It counts':'They count')+' in no total and '+(one?'sits':'sit')+' on no grid until '+(one?'it has':'they have')+' a Feature'+
    (ro?'.':' &mdash; finish or remove '+(one?'it':'them')+'.')+'</div><div class="l">'+
    ds.map(r=>{ const v=r.v||{}, hs=ppHistOf(r), first=hs[hs.length-1], by=(first&&first.by)||r.createdBy||r.updatedBy;
      const bits=[v.month?ppMo(v.month):'', v.team||''].filter(Boolean).join(' · ');
      return '<span class="pp-dchip"><span class="tx"><b>Untitled draft</b>'+(bits?' · '+ppE(bits):'')+
        '<span class="m">added '+ppE(ppWhenDay(r.createdAt))+(by?' by '+ppE(ppName(by,true)):'')+'</span></span>'+
        '<button type="button" class="ibtn primary" data-ppedit="'+r.id+'">'+(ro?'Open':'Finish')+'</button>'+
        (ro?'':'<button type="button" class="ibtn danger" data-ppdel="'+r.id+'">Remove</button>')+'</span>'; }).join('')+
    '</div></div>';
}

function ppHead(){
  const ro=ppRO(), rm=ppRemoved().length;
  return '<div class="pp-head">'+
    '<span class="seg pp-viewseg" id="pp-view" role="group" aria-label="View">'+
      [['grid','Month × team'],['table','Table']].map(([k,l])=>'<button type="button" data-v="'+k+'" aria-pressed="'+(PP.view===k)+'">'+l+'</button>').join('')+
    '</span>'+
    (ro?'':'<button class="pp-btn" id="pp-add" type="button">+ New item</button>')+
    '<button class="pp-btn ghost" id="pp-hist" type="button">History</button>'+
    (rm?'<button class="pp-btn ghost" id="pp-removed" type="button">Removed ('+rm+')</button>':'')+
    '<span class="pp-hint">'+(ro?'Open any item to read it and its history.'
      : PP.view==='grid'?'Click an item to open and edit it. <b>+ Add</b> in a cell adds one there.'
      :'Click a cell to change it in place, or <b>Open</b> for the whole item.')+'</span>'+
    '<span class="pp-saving" id="pp-saving" aria-live="polite"></span>'+
    '</div>';
}

function ppAlerts(all){
  const rows=[];
  const add=(cls,n,html,flag)=>{ if(n) rows.push('<div class="pp-al '+cls+'"><span class="c">'+n+'</span>'+
    '<span class="t">'+html+'</span><button class="go" type="button" data-ppflag="'+flag+'">Show</button></div>'); };
  const f=k=>all.filter(r=>ppFlags(r)[k]);
  const ks=rs=>rs.map(r=>'<b>'+ppE(r.v.key||String(r.v.feature||'').slice(0,20))+'</b>').join(', ');
  const od=f('overdue'), dr=f('drift'), sh=f('shipped'), ne=f('noEstimate'), oe=f('overEstimate'), ds=f('dueSoon');
  const bp=f('brokenPromise'), nd=f('noDriver'), nt=f('noTeam'), wl=f('whyLong');
  add('bad',bp.length,'committed to a month that ends after their Driver&rsquo;s next show starts &mdash; '+ks(bp)+'. The client has already been told (rk-promise-broken).','brokenPromise');
  add('bad',od.length,'past the due date in Jira and not done &mdash; '+ks(od)+'.','overdue');
  add('mid',nd.length,'with no Driver, so their tier, the broken-promise check and the event overlay cannot run for them &mdash; '+ks(nd)+'.','noDriver');
  add('mid',nt.length,'with no team: no Jira team on the ticket and none on the item, so they sit in the unassigned line &mdash; '+ks(nt)+'.','noTeam');
  add('mid',wl.length,'whose Why is longer than the '+ppWhyMax()+'-character limit &mdash; '+ks(wl)+'.','whyLong');
  add('mid',dr.length,'where the stated status and Jira disagree &mdash; '+ks(dr)+'. The ledger shows both.','drift');
  add('mid',ds.length,'due within a week &mdash; '+ks(ds)+'.','dueSoon');
  add('mid',ne.length,'with no estimate at all, so they contribute nothing to the effort totals above &mdash; '+ks(ne)+'.','noEstimate');
  add('mid',oe.length,'where logged time already exceeds the estimate by more than 15% &mdash; '+ks(oe)+'.','overEstimate');
  add('ok',sh.length,'already resolved in Jira and still on the pipeline &mdash; '+ks(sh)+'. Remove them or mark them Done.','shipped');
  return rows.length? '<div class="seclabel pp-seclabel">Needs attention<span class="c">Show filters the view above</span></div><div class="pp-alerts">'+rows.join('')+'</div>' : '';
}

function ppRollups(all){
  const card=(title,note,key,skip)=>{
    const data=ppBy(all,key).filter(([k])=>!skip||k!==skip), max=Math.max(1,...data.map(d=>d[1].d));
    const un=skip?all.filter(r=>ppGroupKey(r,key)===skip):[];
    return '<div class="card"><h3>'+title+'</h3><div class="note">'+note+'</div><div class="pp-bars">'+
      data.map(([k,v])=>'<div class="pp-bar" data-ppfilter="'+key+'" data-ppval="'+ppE(k)+'">'+
        '<span class="lb" title="'+ppE(k)+'">'+ppE(key==='month'?ppMo(k):k)+'</span>'+
        '<span class="tr"><span class="fl" style="width:'+(v.d/max*100)+'%"></span></span>'+
        '<span class="vv">'+ppD(v.d)+' <span style="color:var(--muted);font-weight:400">· '+v.n+(v.miss?', '+v.miss+' n/e':'')+'</span></span></div>').join('')+
      '</div>'+(un.length?'<div class="pp-unassigned" data-ppfilter="'+key+'" data-ppval="'+ppE(skip)+'"><b>Unassigned:</b> '+un.length+' item'+(un.length===1?'':'s')+
        ' · '+ppD(ppSum(un))+' &mdash; '+un.map(r=>ppE(r.v.key||String(r.v.feature||'').slice(0,24))).join(', ')+'. Not in any team total (pp-team-source).</div>':'')+'</div>';
  };
  return '<div class="pp-roll">'+
    card('Effort by month','Person-days of committed must-have work. Click a bar to filter.','month')+
    card('Effort by team','Who does the work, read from the Jira ticket (pp-team-source). Grey shows the item count, then how many carry no estimate. The person who raised an item enters no total.','team','No team')+
    card('Effort by area','Where the investment lands across the product.','area')+
    '</div>';
}

function ppToolbar(rows,all){
  const opts=(k,cur,label,fmt,valFn)=>{
    const vals=[...new Set(all.map(r=>valFn?valFn(r):(r.v||{})[k]).filter(Boolean))].sort((a,b)=>(/^(No team|Driver not set)$/.test(a)?1:0)-(/^(No team|Driver not set)$/.test(b)?1:0)||String(a).localeCompare(String(b)));
    return '<label>'+label+' <select data-ppf="'+k+'"><option value="">All</option>'+
      vals.map(v=>'<option value="'+ppE(v)+'"'+(cur===v?' selected':'')+'>'+ppE(fmt?fmt(v):v)+'</option>').join('')+'</select></label>';
  };
  const flagSel='<label>Flag <select data-ppf="flag"><option value="">All</option>'+
    PPFLAG.map(([k,,l])=>'<option value="'+k+'"'+(PP.f.flag===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label>';
  const G={month:'Month',team:'Team',driver:'Driver',area:'Area','':'None'};
  return '<div class="toolbar pp-filters">'+
    opts('month',PP.f.month,'Month',ppMo)+opts('team',PP.f.team,'Team',null,ppTeamName)+opts('driver',PP.f.driver,'Driver',null,ppDriverName)+
    opts('area',PP.f.area,'Area')+opts('status',PP.f.status,'Status')+flagSel+
    '<input type="search" id="pp-q" placeholder="Search the ledger" aria-label="Search the ledger" value="'+ppE(PP.f.q)+'">'+
    (ppAnyFilter()?'<button class="pp-btn ghost" id="pp-clear" type="button">Clear filters</button>':'')+
    (PP.view==='grid'?'':'<label>Group <span class="seg" id="pp-group">'+
      Object.keys(G).map(g=>'<button type="button" data-v="'+g+'" aria-pressed="'+(PP.group===g)+'">'+G[g]+'</button>').join('')+
    '</span></label><button class="pp-btn ghost" id="pp-colbtn" type="button">Columns ▾</button>')+
    '<span class="count">'+rows.length+' of '+all.length+' · '+ppD(ppSum(rows))+'</span>'+
    '</div>';
}

function ppTierPill(t){ return t?'<span class="tierpill t'+(t<=2?t:'')+'">T'+t+'</span>':''; }
function ppCellHtml(r,c){
  const v=(r.v||{})[c.key];
  if(c.key==='key' && v) return '<a href="https://expoplatform.atlassian.net/browse/'+ppE(v)+'" target="_blank" rel="noopener">'+ppE(v)+'</a>';
  if(c.key==='month') return ppE(ppMo(v));
  if(c.key==='driver'){
    const d=ppDriver(r);
    if(!d.k) return '<span class="pp-tag noest">not set</span>';
    return '<span class="pp-cv one" title="'+ppE(d.c?d.c.name:d.label)+'">'+ppE(d.label)+(d.tier?' '+ppTierPill(d.tier):'')+(d.k==='Platform'?' <span class="pp-tag der">no tier</span>':'')+'</span>';
  }
  if(c.key==='why' && v && String(v).length>ppWhyMax())
    return '<span class="pp-cv one">'+ppE(v)+'</span> <span class="pp-tag drift">over '+ppWhyMax()+'</span>';
  if(!v) return '<span class="pp-empty">—</span>';
  const one = c.type!=='long';
  return '<span class="pp-cv'+(one?' one':'')+'">'+ppE(v)+'</span>';
}
function ppDerHtml(r,d){
  const j=r.j, n=r.n||{}, fl=ppFlags(r);
  if(d.key==='_team'){
    const t=ppTeam(r);
    return t.t ? ppE(t.t)+' <span class="pp-tag der">'+t.src+'</span>' : '<span class="pp-tag over">no team</span>';
  }
  if(d.key==='_tier'){
    const dr=ppDriver(r);
    if(!dr.k) return '<span class="pp-empty">—</span>';
    if(dr.k==='Platform') return '<span class="pp-tag der">Platform</span>';
    return dr.tier?ppTierPill(dr.tier):'<span class="tierpill na">no tier</span>';
  }
  if(d.key==='_days'){
    if(n.days==null) return '<span class="pp-tag noest">none</span>';
    const k=n.daysKind;
    return '<b>'+ppD(n.days)+'</b>'+(k==='range'?' <span class="pp-tag der">mid</span>':k==='partial'?' <span class="pp-tag der">partial</span>':'');
  }
  if(!j) return '<span class="pp-empty">no ticket</span>';
  if(d.key==='_jstatus') return ppE(j.status)+(fl.drift?' <span class="pp-tag drift">drift</span>':'');
  if(d.key==='_jdue')    return j.due? ppE(j.due)+(fl.overdue?' <span class="pp-tag over">late</span>':fl.dueSoon?' <span class="pp-tag soon">soon</span>':'') : '<span class="pp-empty">none</span>';
  if(d.key==='_jspent')  return j.spentDays!=null? ppD(j.spentDays)+(fl.overEstimate?' <span class="pp-tag drift">over</span>':'') : '<span class="pp-empty">—</span>';
  if(d.key==='_flags'){
    const t=PPFLAG.filter(([k])=>fl[k]).map(([,cls,l])=>'<span class="pp-tag '+cls+'">'+l+'</span>');
    return t.join(' ')||'<span class="pp-empty">—</span>';
  }
  return '';
}

// the table: scan and change cells in place; Open shows the whole item
function ppGrid(rows){
  const cols=ppVisible(), der=ppDer(), ro=ppRO();
  const span=cols.length+der.length+2;
  let h='<div class="pp-wrap"><table class="pp"><thead><tr><th style="width:62px"><span class="pp-vh">Open</span></th>'+
    cols.map(c=>'<th style="min-width:'+(c.w||140)+'px"><span class="hd">'+
      '<button class="sortb" type="button" data-ppsort="'+c.key+'">'+ppE(c.label)+(PP.sort.k===c.key?(PP.sort.dir>0?' ↑':' ↓'):'')+'</button>'+
      (ro?'':'<button class="cog" type="button" data-ppcol="'+c.key+'" title="Column options" aria-label="Options for the '+ppE(c.label)+' column">⋮</button>')+'</span></th>').join('')+
    der.map(d=>'<th class="derived" style="min-width:'+(d.w||110)+'px">'+
      (d.key==='_days'?'<button class="sortb" type="button" data-ppsort="_days">'+ppE(d.label)+(PP.sort.k==='_days'?(PP.sort.dir>0?' ↑':' ↓'):'')+'</button>':ppE(d.label))+'</th>').join('')+
    '<th style="width:40px"><span class="pp-vh">Remove</span></th></tr></thead><tbody>';

  if(!rows.length) h+='<tr><td colspan="'+span+'" class="empty">'+(ppLive().length?'Nothing matches these filters.':'No items yet.')+'</td></tr>';

  let last=null;
  rows.forEach(r=>{
    if(PP.group){
      const g=ppGroupKey(r,PP.group);
      if(g!==last){ last=g;
        const grp=rows.filter(x=>ppGroupKey(x,PP.group)===g);
        const miss=grp.filter(x=>!x.n||x.n.days==null).length;
        h+='<tr class="grp"><td colspan="'+span+'"><span class="gl">'+
           '<span class="gn">'+ppE(PP.group==='month'?ppMo(g):g)+'</span>'+
           '<span class="sub"><b>'+ppD(ppSum(grp))+'</b> across '+grp.length+' item'+(grp.length===1?'':'s')+
           (miss?' · '+miss+' unestimated':'')+'</span></span></td></tr>';
      }
    }
    h+='<tr class="r" data-pprow="'+r.id+'"><td><button class="pp-open" type="button" data-ppedit="'+r.id+'" aria-label="Open '+ppE(ppTitle(r))+'">Open</button></td>'+
      cols.map(c=>'<td class="cell" data-ppcell="'+r.id+'|'+c.key+'"'+(ro?'':' title="Click to change"')+'>'+ppCellHtml(r,c)+'</td>').join('')+
      der.map(d=>'<td class="der">'+ppDerHtml(r,d)+'</td>').join('')+
      (ro?'<td></td>':'<td><button class="pp-x" type="button" data-ppdel="'+r.id+'" title="Remove this item (it can be restored)" aria-label="Remove '+ppE(ppTitle(r))+'">×</button></td>')+'</tr>';
  });
  return h+'</tbody></table></div>';
}

// ---------- month x team grid (spec v1 §3.1 and §3.2, rules pp-grid-months, pp-grid-overload, rk-promise-broken, pp-default-view) ----------
function ppMonths(){
  const col=ppCols().find(c=>c.key==='month')||{};
  const ok=m=>/^\d{4}-\d{2}$/.test(m||'');
  return [...new Set([...(col.opts||[]), ...ppLive().map(r=>(r.v||{}).month)].filter(ok))].sort();
}
const ppBandKey = r => { const d=ppDriver(r); return d.c ? 'c'+d.k : (d.k==='Platform' ? 'plat' : (d.k ? 'c'+d.k : 'none')); };
function ppBands(rows){
  const by=new Map();
  rows.forEach(r=>{ const k=ppBandKey(r); if(!by.has(k)) by.set(k,{k,d:ppDriver(r),rows:[]}); by.get(k).rows.push(r); });
  const rank=b=>b.k==='none'?3:b.k==='plat'?2:1;
  return [...by.values()].sort((a,b)=>rank(a)-rank(b)||(a.d.tier||9)-(b.d.tier||9)||String(a.d.label).localeCompare(String(b.d.label)));
}
const PP_ST={'Planned':'st-plan','Discovery':'st-disc','In Progress':'st-prog','In Testing':'st-test','Ready for Release':'st-ready','Done':'st-done','Blocked':'st-block','At Risk':'st-risk'};
function ppChip(r){
  const v=r.v||{}, fl=ppFlags(r), br=ppBroken(r), tags=[];
  if(br) tags.push('<span class="pp-tag over">after show</span>');
  else if(fl.overdue) tags.push('<span class="pp-tag over">overdue</span>');
  if(fl.drift) tags.push('<span class="pp-tag drift">Jira: '+ppE((r.j||{}).status||'')+'</span>');
  if(fl.shipped) tags.push('<span class="pp-tag ship">shipped</span>');
  return '<button type="button" class="pp-chip '+(PP_ST[v.status]||'st-plan')+'" data-ppedit="'+r.id+'" title="'+ppE(ppTitle(r))+'">'+
    '<span class="ck">'+(v.key?ppE(v.key):'<span class="nk">no ticket</span>')+'</span>'+
    '<span class="ct">'+ppE(v.feature)+'</span>'+
    '<span class="cm"><span class="st">'+ppE(v.status||'no status')+'</span><span>'+(r.n&&r.n.days!=null?ppD(r.n.days):'no estimate')+'</span>'+tags.join('')+'</span>'+
  '</button>';
}
function ppTL(rows,all){
  const months=ppMonths(), cl=CLB(), ro=ppRO();
  if(!all.length) return '<div class="pp-emptygrid"><b>No items on the ledger yet.</b>'+(ro?'':' <button class="pp-btn" type="button" data-ppnew="none||">+ Add the first item</button>')+'</div>';
  if(!months.length) return '<div class="empty">No item carries a month.</div>';
  if(!rows.length) return '<div class="pp-emptygrid">Nothing matches these filters. <button class="pp-btn ghost" type="button" id="pp-clear">Clear filters</button></div>';
  const bands=ppBands(rows);
  // team load across every band: committed person-days against the weekdays in the month (pp-grid-overload)
  const load={};
  rows.forEach(r=>{ const t=ppTeamName(r), m=(r.v||{}).month; if(!m) return;
    const e=(load[t]=load[t]||{})[m]=(load[t][m]||{d:0,n:0,miss:0});
    e.d+=(r.n&&r.n.days)||0; e.n++; if(!r.n||r.n.days==null) e.miss++; });
  const over=(t,m)=>{ const e=(load[t]||{})[m], wd=ppWeekdays(m); return e&&wd&&e.d>wd?{d:e.d,wd}:null; };
  let h='<div class="hd first">Driver, then team</div>'+months.map(m=>'<div class="hd">'+ppE(ppMo(m))+'<div class="pp-wd">'+ppWeekdays(m)+' weekdays</div></div>').join('');
  bands.forEach(b=>{
    const ns=b.d.c&&cl?cl.nextShow(b.d.k):null, showM=ns?ns.s.slice(0,7):null;
    const teams=[...new Set(b.rows.map(ppTeamName))].sort((x,y)=>(x==='No team')-(y==='No team')||x.localeCompare(y));
    const bMiss=b.rows.filter(r=>!r.n||r.n.days==null).length, brokenN=b.rows.filter(r=>ppBroken(r)).length;
    const colour=b.k==='none'?'var(--ctl)':b.k==='plat'?'var(--tier0)':'var(--tier'+(b.d.tier||0)+')';
    const title=b.k==='none'?'Driver not set':b.k==='plat'?'Platform — no client driver':b.d.label;
    const meta=b.k==='none'?'tier, the show overlay and the broken-promise check cannot run for these'
      :b.k==='plat'?'no tier and no show to miss'
      :(b.d.tier?'Tier '+b.d.tier:'no tier')+' · '+(ns?'next show '+ns.n+', '+cl.fmtDate(ns.s)+(showM>months[months.length-1]?', after every month on this grid':''):'no dated show, so no promise can be checked');
    h+='<div class="band"><span class="rail" style="background:'+colour+'"></span><span>'+ppE(title)+'</span><span class="n">'+b.rows.length+' item'+(b.rows.length===1?'':'s')+
      ' · '+ppD(ppSum(b.rows))+(bMiss?' · '+bMiss+' unestimated':'')+' · '+ppE(meta)+(brokenN?' · <b class="pp-bad">'+brokenN+' after the show</b>':'')+'</span>'+
      (ro?'':'<button type="button" class="pp-badd" data-ppnew="'+ppE(b.k)+'||" aria-label="Add an item'+(b.k==='none'?' with no driver':' for '+ppE(title))+'">+ Add'+(b.k==='none'?'':' for '+ppE(b.k==='plat'?'Platform':title))+'</button>')+'</div>';
    // the client's show, drawn on the same month axis (spec §3.2)
    if(ns && showM<=months[months.length-1]){
      h+='<div class="cname totrow" style="grid-column:1"><span class="rail" style="background:'+colour+'"></span><span class="nm" style="font-weight:700">Next show</span></div>';
      months.forEach(m=>{ const hit=m===showM;
        h+='<div class="cell totrow'+(hit?' ev':'')+'"><div class="cnt '+(hit?'pp-show':m>showM?'pp-aftertxt':'')+'">'+
          (hit?'<span class="e">◆</span> '+ppE(cl.fmtDate(ns.s)):m>showM?'after the show':'&nbsp;')+'</div></div>'; });
    }
    teams.forEach(t=>{
      h+='<div class="cname"><span class="rail" style="background:'+colour+'"></span><span style="min-width:0"><span class="nm">'+ppE(t)+'</span><div class="sub">'+
        (t==='No team'?'no team on the ticket or the item':'team')+'</div></span></div>';
      months.forEach(m=>{
        const items=b.rows.filter(r=>ppTeamName(r)===t&&(r.v||{}).month===m);
        const n=items.length, d=ppSum(items), miss=items.filter(r=>!r.n||r.n.days==null).length;
        const brk=items.filter(r=>ppBroken(r)).length, ov=n?over(t,m):null;
        const cls='cell pp-gc'+(showM===m?' ev':'')+(brk?' pp-after':'')+(ov?' pp-over':'');
        h+='<div class="'+cls+'">'+
          (n?'<div class="pp-ghd"><b>'+n+'</b> · '+ppD(d)+(miss?' · <span class="pp-ne">'+miss+' n/e</span>':'')+
             (ov?' · <b class="pp-bad" title="The team’s committed days across every driver exceed the weekdays in this month">team over</b>':'')+'</div>':'')+
          items.map(ppChip).join('')+
          (ro?'':'<button type="button" class="pp-add" data-ppnew="'+ppE(b.k)+'|'+ppE(t)+'|'+m+'" aria-label="Add an item for '+ppE(t)+' in '+ppE(ppMo(m))+(b.k==='none'?'':', for '+ppE(title))+'">+ Add</button>')+
          '</div>';
      });
    });
  });
  const lteams=Object.keys(load).sort((x,y)=>(x==='No team')-(y==='No team')||x.localeCompare(y));
  h+='<div class="band"><span class="rail" style="background:var(--ink2)"></span><span>Team load, every driver</span><span class="n">committed person-days against the weekdays in the month; over means more than one person could work in it (pp-grid-overload)</span></div>';
  lteams.forEach(t=>{
    h+='<div class="cname totrow"><span class="rail" style="background:var(--ink2)"></span><span class="nm">'+ppE(t)+'</span></div>';
    months.forEach(m=>{ const e=(load[t]||{})[m], ov=over(t,m);
      h+='<div class="cell totrow'+(ov?' pp-over':'')+'"><div class="cnt">'+(e?'<span class="g">'+ppD(e.d)+'</span> of '+ppWeekdays(m)+'d'+(e.miss?' <span class="pp-ne">'+e.miss+' n/e</span>':'')+(ov?' <b class="pp-bad">over</b>':''):'·')+'</div></div>'; });
  });
  return '<div class="pp-tlnote">What we promised, on the same grid shape as what we shipped on the Delivery tab, run on the pipeline’s own months (pp-grid-months). '+
    'Rows are teams, banded by Driver. A client band draws its next show on the same axis, and an item whose month ends after that show starts is marked <b class="pp-bad">after show</b> (rk-promise-broken). '+
    'A cell reads items · person-days; n/e counts items with no estimate, which add nothing to the days. The coloured edge on an item is its status.</div>'+
    '<div class="pp-stkey" aria-hidden="true">'+Object.entries(PP_ST).map(([s,c])=>'<span class="'+c+'"><i></i>'+ppE(s)+'</span>').join('')+'</div>'+
    '<div class="tlwrap"><div class="tl pp-tl" style="grid-template-columns:minmax(170px,210px) repeat('+months.length+',minmax(150px,1fr))">'+h+'</div></div>';
}

// ---------- the item form (pp-editor): one place to add, finish, change and remove an item ----------
const PP_ED_SECTIONS=[
  {t:'The item', keys:['feature','key','why']},
  {t:'Where it sits on the grid', keys:['month','team','driver']},
  {t:'Status', keys:['status','priority','area','owner']},
  {t:'Effort and detail', keys:['estimate','impact','deps','notes','rationale']}
];
const PP_HELP={
  feature:'Required. What will be built, in the words everyone will recognise.',
  key:'Optional. With a Jira ticket, team, status and due date are read from Jira at each refresh.',
  why:'One line on why it must ship. The long form goes in Rationale.',
  month:'Required. The month it is committed to: its column on the grid.',
  team:'Who does the work. Set it here when the item has no Jira ticket, or the ticket carries no team.',
  driver:'Who it is for: a client on the Planhat active list, or Platform. Tier and the next-show check come from it.',
  owner:'Who wrote it down. Shown on the item; enters no total.',
  estimate:'Person-days: 5d, 3-5d, or Total: 12 person-days.',
  rationale:'The long form of Why.'
};
const PP_WIDE={feature:1,why:1,impact:1,deps:1,notes:1,rationale:1};
function ppMonthOpts(cur){
  const set=new Set(ppMonths()), t=new Date();
  for(let i=0;i<15;i++){ const d=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+i,1)); set.add(d.toISOString().slice(0,7)); }
  if(cur) set.add(cur);
  return [...set].filter(m=>/^\d{4}-\d{2}$/.test(m)).sort();
}
function ppOpts(c,cur){
  const labels=c.optLabels||{};
  return [...new Set([...(c.opts||[]), cur].filter(Boolean))].map(o=>'<option value="'+ppE(o)+'"'+(o===cur?' selected':'')+'>'+ppE(labels[o]||o)+'</option>').join('');
}
function ppDriverOpts(cur){
  const col=ppCols().find(c=>c.key==='driver')||{}, cl=CLB(), labels=col.optLabels||{};
  const opts=[...new Set([...(col.opts||[]), cur].filter(Boolean))];
  const comp=o=>cl?cl.company(o):null;
  const lab=o=>{ if(o==='Platform') return 'Platform (no client)'; const c=comp(o); return c?cl.shortName(c.name):(labels[o]||o); };
  const tier=o=>{ const c=comp(o); return c?c.tier:null; };
  const groups=[['Platform',o=>o==='Platform'],['Tier 1',o=>tier(o)===1],['Tier 2',o=>tier(o)===2],['Tier 3',o=>tier(o)===3],['Tier 4',o=>tier(o)===4],
    ['No tier',o=>o!=='Platform'&&![1,2,3,4].includes(tier(o))]];
  return '<option value="">Not set</option>'+groups.map(([g,fn])=>{
    const os=opts.filter(fn).sort((a,b)=>lab(a).localeCompare(lab(b)));
    return os.length?'<optgroup label="'+g+'">'+os.map(o=>'<option value="'+ppE(o)+'"'+(o===cur?' selected':'')+'>'+ppE(lab(o))+'</option>').join('')+'</optgroup>':'';
  }).join('');
}
function ppEstPreview(t){
  if(!String(t||'').trim()) return 'No estimate yet: the item adds nothing to the effort totals until it has one.';
  const d=ppDays(t);
  if(d.days==null) return 'No number of days found, so it adds nothing to the totals. Write it as 5d, 3-5d or Total: 12 person-days.';
  return 'Counts as '+ppD(d.days)+(d.daysKind==='range'?', the middle of the range':d.daysKind==='partial'?', partial: the text says more is to come':'')+'.';
}
function ppEdDisabled(){ const ed=PP.ed; return ppRO() || !!(ed && ed.row && ppIsDel(ed.row)) || !!(ed && ed.gone); }
function ppEdField(c){
  const ed=PP.ed, k=c.key, val=String(ed.cur[k]??''), dis=ppEdDisabled()?' disabled':'';
  const id='ppf-'+k.replace(/[^a-z0-9_-]/gi,'_'), req=(k==='feature'||k==='month');
  let help=PP_HELP[k]!==undefined?PP_HELP[k]:(c.note||''), input='', extra='';
  if(k==='month'){
    input='<select id="'+id+'" data-f="month" aria-required="true"'+dis+'><option value="">Choose a month</option>'+
      ppMonthOpts(val).map(m=>'<option value="'+m+'"'+(m===val?' selected':'')+'>'+ppMo(m)+'</option>').join('')+'</select>';
  } else if(k==='driver'){
    input='<select id="'+id+'" data-f="driver"'+dis+'>'+ppDriverOpts(val)+'</select>';
  } else if(k==='team'){
    const jt=ed.row&&ed.row.j&&ed.row.j.team;
    input='<select id="'+id+'" data-f="team"'+(jt?' disabled':dis)+'><option value="">'+(jt?'From the Jira ticket':'No team yet')+'</option>'+ppOpts(c,val)+'</select>';
    if(jt){ help=''; extra='<div class="fh"><b>'+ppE(jt)+'</b>, from the Jira ticket. The ticket’s team always wins, so there is nothing to set here.</div>'; }
  } else if(k==='owner'){
    const os=[...new Set([...(c.opts||[]),...PP.rows.map(x=>(x.v||{}).owner).filter(Boolean)])];
    input='<input id="'+id+'" data-f="owner" list="pp-owner-dl" value="'+ppE(val)+'" autocomplete="off"'+dis+'>'+
      '<datalist id="pp-owner-dl">'+os.map(o=>'<option value="'+ppE(o)+'">').join('')+'</datalist>';
  } else if(k==='why'){
    const max=ppWhyMax();
    input='<input id="'+id+'" data-f="why" maxlength="'+max+'" value="'+ppE(val)+'" autocomplete="off"'+dis+'>';
    extra='<div class="fc" data-cnt="why">'+val.length+' / '+max+'</div>'+
      (val.length>max?'<div class="fh warnh">Longer than the '+max+'-character limit (it came from the old ledger). Shorten it; the full text can go in Rationale.</div>':'');
  } else if(k==='key'){
    input='<input id="'+id+'" data-f="key" value="'+ppE(val)+'" placeholder="EP-12345" spellcheck="false" autocomplete="off"'+dis+'>';
    if(val && /^[A-Z][A-Z0-9_]+-\d+$/.test(val)) extra='<div class="fh"><a href="https://expoplatform.atlassian.net/browse/'+ppE(val)+'" target="_blank" rel="noopener">Open '+ppE(val)+' in Jira</a></div>';
  } else if(k==='feature'){
    input='<input id="'+id+'" data-f="feature" value="'+ppE(val)+'" maxlength="240" placeholder="e.g. Session calendar date strip" autocomplete="off" aria-required="true"'+dis+'>';
  } else if(k==='estimate'){
    input='<input id="'+id+'" data-f="estimate" value="'+ppE(val)+'" placeholder="e.g. 5d or 3-5d" autocomplete="off"'+dis+'>';
    extra='<div class="fh est" data-est>'+ppE(ppEstPreview(val))+'</div>'; help='';
  } else if(k==='status'){
    input='<select id="'+id+'" data-f="status"'+dis+'>'+ppOpts(c,val)+'</select>';
    const j=ed.row&&ed.row.j;
    if(j&&j.status) extra='<div class="fh">Jira says <b>'+ppE(j.status)+'</b>'+(j.canon&&j.canon!==val?' <span class="pp-tag drift">differs</span>':'')+'</div>';
  } else if(c.type==='select'){
    input='<select id="'+id+'" data-f="'+ppE(k)+'"'+dis+'><option value="">—</option>'+ppOpts(c,val)+'</select>';
  } else if(c.type==='long'){
    input='<textarea id="'+id+'" data-f="'+ppE(k)+'" rows="3"'+dis+'>'+ppE(val)+'</textarea>';
  } else {
    input='<input id="'+id+'" data-f="'+ppE(k)+'" value="'+ppE(val)+'" autocomplete="off"'+dis+'>';
  }
  if(dis) input=input.replace(/ placeholder="[^"]*"/g,'');   // a field that cannot be typed into shows no example
  const lab=k==='team'?'Team':c.label;
  return '<div class="pp-fld'+(PP_WIDE[k]||c.type==='long'?' wide':'')+'" data-fld="'+ppE(k)+'">'+
    '<label for="'+id+'">'+ppE(lab)+(req?' <span class="req" aria-hidden="true">*</span>':'')+'<span class="pp-edited">edited</span></label>'+
    input.replace(/^<(input|select|textarea) /,'<$1 aria-describedby="'+id+'-err" ')+extra+(help?'<div class="fh">'+ppE(help)+'</div>':'')+'<div class="fe" id="'+id+'-err" data-err="'+ppE(k)+'" hidden></div></div>';
}
function ppEdFormHtml(){
  const cols=ppCols(), byKey={}, used=new Set(); cols.forEach(c=>{ byKey[c.key]=c; });
  let h='';
  PP_ED_SECTIONS.forEach(s=>{
    const cs=s.keys.filter(k=>byKey[k]).map(k=>{ used.add(k); return byKey[k]; }); if(!cs.length) return;
    h+='<fieldset class="pp-sec"><legend>'+ppE(s.t)+'</legend><div class="pp-frow">'+cs.map(ppEdField).join('')+'</div></fieldset>';
  });
  const rest=cols.filter(c=>!used.has(c.key));
  if(rest.length) h+='<fieldset class="pp-sec"><legend>Other columns</legend><div class="pp-frow">'+rest.map(ppEdField).join('')+'</div></fieldset>';
  return h;
}
// ---- history on the item
function ppValHtml(k,v){
  const s=ppFmtVal(k,v);
  if(!s) return '<span class="pp-hv none">empty</span>';
  const t=s.length>140?s.slice(0,137)+'…':s;
  return '<span class="pp-hv" title="'+ppE(s)+'">'+ppE(t)+'</span>';
}
function ppChangeLine(e,r,canRevert){
  const ok=canRevert && r && !ppRO() && !ppIsDel(r) && e.f && ['edit','revert','migrate'].includes(e.k) && !(e.f==='why' && String(e.from||'').length>ppWhyMax());
  return '<div class="pp-hc"><span class="f">'+ppE(ppFldLabel(e.f))+'</span> '+ppValHtml(e.f,e.from)+' <span class="ar" aria-label="to">→</span> '+ppValHtml(e.f,e.to)+
    (ok?' <button type="button" class="ibtn sm" data-pprevert="'+r.id+'|'+e.id+'" title="Set '+ppE(ppFldLabel(e.f))+' back to the earlier value">Revert</button>':'')+
    (e.note?'<div class="pp-hn">'+ppE(e.note)+'</div>':'')+'</div>';
}
function ppItemLi(g,r){
  const e0=g.es.find(e=>!e.f)||g.es[0], k=e0.k, who=ppName(e0.by), fields=g.es.filter(e=>e.f);
  let head='<b>'+ppE(who)+'</b> ', body='';
  if(k==='add'){
    head+='added this item';
    const vs=e0.vals||{}, ks=Object.keys(vs).filter(x=>x!=='status'&&x!=='priority');
    if(ks.length) body+='<div class="pp-hn">with '+ks.map(x=>ppE(ppFldLabel(x))).join(', ')+'</div>';
    if(e0.note) body+='<div class="pp-hn">'+ppE(e0.note)+'</div>';
  } else if(k==='remove'){ head+='removed this item'; }
  else if(k==='restore'){ head+='restored this item'; }
  else if(k==='import'){
    head+='imported this item from the Confluence ledger';
    if(e0.note) body+='<div class="pp-hn">'+ppE(e0.note)+'</div>';
    body+=fields.map(e=>ppChangeLine(e,r,false)).join('');
  } else if(k==='migrate'){
    head+=ppE(e0.note||'migrated this item');
    body+=fields.map(e=>ppChangeLine(e,r,true)).join('');
  } else {
    head+=(k==='revert'?'set back ':'changed ')+fields.map(e=>'<b>'+ppE(ppFldLabel(e.f))+'</b>').join(', ');
    body+=fields.map(e=>ppChangeLine(e,r,true)).join('');
  }
  return '<li class="pp-h pp-h-'+ppE(k)+'"><div class="w">'+head+'</div>'+body+'<div class="t">'+ppE(ppWhen(g.at))+'</div></li>';
}
function ppItemHist(r){
  const bs=ppBatches(ppHistOf(r));
  if(!bs.length) return '<div class="pp-hnone">No changes recorded for this item yet. Every save from now on is listed here.</div>';
  return '<ol class="pp-hist">'+bs.map(g=>ppItemLi(g,r)).join('')+'</ol>';
}
// what the item's Jira ticket, driver and flow say: read-only
function ppSideInfo(r){
  const f=(lab,val)=>'<div class="pp-kv"><span class="k">'+lab+'</span><span class="v">'+val+'</span></div>';
  const j=r.j, fl=ppFlags(r), dr=ppDriver(r), tm=ppTeam(r), pf=(r.prefill||{}).driver, cl=CLB();
  const ns=dr.c&&cl?cl.nextShow(dr.k):null, br=ppBroken(r);
  let h='<div class="seclabel">Who it is for, and who does it<span class="c">derived</span></div><div class="pp-kvs">'+
    f('Driver', dr.k ? ppE(dr.label)+(dr.tier?' '+ppTierPill(dr.tier):'')+(pf&&pf.value===String((r.v||{}).driver||'')?'<div class="pp-sub">Pre-filled by Claude on '+ppE(ppWhenDay(pf.at))+': '+ppE(pf.basis)+' (pp-driver-prefill).</div>':'') : '<span class="pp-tag noest">not set</span>')+
    f('Promise vs show', !dr.c ? '<span class="pp-empty">'+(dr.k==='Platform'?'platform work has no show':'needs a client Driver')+'</span>'
      : !ns ? '<span class="pp-empty">'+ppE(dr.label)+' has no dated show</span>'
      : (br ? '<span class="pp-tag over">broken</span> '+ppE(ppMo((r.v||{}).month))+' ends after '+ppE(ns.n)+' starts '+ppE(cl.fmtDate(ns.s))
            : '<span class="pp-tag ship">holds</span> '+ppE(ppMo((r.v||{}).month))+' ends before '+ppE(ns.n)+' starts '+ppE(cl.fmtDate(ns.s))))+
    f('Team', tm.t ? ppE(tm.t)+' <span class="pp-tag der">from '+(tm.src==='Jira'?'Jira':'this item')+'</span>' : '<span class="pp-tag over">no team</span>')+
    '</div>';
  if(j){
    h+='<div class="seclabel">From Jira<span class="c">refreshed '+ppE(PP.meta&&PP.meta.asOf?ppWhenDay(PP.meta.asOf):'—')+'</span></div><div class="pp-kvs">'+
      f('Status',ppE(j.status)+(fl.drift?' <span class="pp-tag drift">ledger says '+ppE((r.v||{}).status)+'</span>':''))+
      f('Due',j.due?ppE(ppWhenDay(j.due))+(fl.overdue?' <span class="pp-tag over">overdue</span>':''):'<span class="pp-empty">none set</span>')+
      f('Logged',j.spentDays!=null?ppD(j.spentDays)+(fl.overEstimate?' <span class="pp-tag drift">over the estimate</span>':''):'<span class="pp-empty">none</span>')+
      f('Assignee',j.assignee?ppE(j.assignee):'<span class="pp-empty">unassigned</span>')+
      f('Type',ppE(j.type)+' · '+ppE(j.priority))+
      '</div>';
  }
  const key=String((r.v||{}).key||'').trim();
  if(key && cl && cl.flowRow(key)) h+='<div class="seclabel">Flow, from the Jira changelog<span class="c">flow.json</span></div><div class="pp-flow">'+cl.flowHtml(key)+'</div>';
  const raw=r.raw||{}, orig=Object.keys(raw).filter(k=>raw[k]!=null&&String(raw[k])!==String((r.v||{})[k]||''));
  if(orig.length) h+='<div class="pp-sub" style="margin-top:10px">As first written on the Confluence page: '+orig.map(k=>ppE(ppFldLabel(k))+' “'+ppE(raw[k])+'”').join(', ')+'.</div>';
  return h;
}
function ppEdSideHtml(){
  const ed=PP.ed, r=ed.row;
  if(ed.isNew){
    const p=ed.preset||{}, bits=[p.month?'Month '+ppMo(p.month):'', p.team?'Team '+p.team:'', p.driver?'Driver '+ppFmtVal('driver',p.driver):''].filter(Boolean);
    return '<div class="pp-sidehelp"><div class="seclabel">Adding an item</div>'+
      '<p>Nothing is saved until you press <b>Add item</b>. <b>Feature</b> and <b>Month</b> are required; everything else can be filled in later.</p>'+
      (bits.length?'<p>Filled in from where you clicked: '+bits.map(ppE).join(', ')+'. Change any of them if they are wrong.</p>':'')+
      '<p>The item appears on the grid in its month and team, and History records that you added it. Every later change is recorded too, and can be undone.</p></div>';
  }
  let h='';
  if(ed.gone) h+='<div class="pp-rmnote">This item was deleted from the database while it was open. Nothing more can be saved to it.</div>';
  else if(ppIsDel(r)) h+='<div class="pp-rmnote">Removed by '+ppE(ppName(r.deleted.by,true))+', '+ppE(ppWhen(r.deleted.at))+'. '+
    (ppRO()?'':'<button type="button" class="ibtn primary" data-edrestore="'+r.id+'">Restore it</button>')+'</div>';
  const n=ppBatches(ppHistOf(r)).length;
  h+='<div class="seclabel">History<span class="c">'+n+' recorded change'+(n===1?'':'s')+'</span></div>'+ppItemHist(r);
  h+=ppSideInfo(r);
  return h;
}
function ppEdFootHtml(){
  const ed=PP.ed;
  if(ppRO()) return '<div class="pp-edfoot"><span class="pp-edmsg">Read-only: you can read this item and its history.</span><button type="button" class="ibtn" data-edclose>Close</button></div>';
  if(ed.gone || (ed.row && ppIsDel(ed.row))) return '<div class="pp-edfoot"><span class="pp-edmsg">'+(ed.gone?'Deleted from the database.':'Removed items are read-only until restored.')+'</span><button type="button" class="ibtn" data-edclose>Close</button></div>';
  return '<div class="pp-edfoot">'+
    (!ed.isNew?'<button type="button" class="ibtn danger" id="pp-ed-remove">'+(ppIsDraft(ed.row)?'Remove draft':'Remove item')+'</button>':'')+
    '<span class="pp-edmsg" id="pp-ed-msg" aria-live="polite"></span>'+
    '<button type="button" class="ibtn" data-edclose>Cancel</button>'+
    '<button type="button" class="ibtn primary" id="pp-ed-save">'+(ed.isNew?'Add item':'Save changes')+'</button></div>';
}
function ppEdPaint(){
  const ed=PP.ed; if(!ed) return; const r=ed.row;
  const title=ed.isNew?'New item':ppIsDel(r)?'Removed item':ppIsDraft(r)?'Finish this draft':ppRO()?'Item':'Edit item';
  const meta=ed.isNew?'<span>It goes onto the grid in its month and team.</span>'
    :'<span>'+ppE(ppTitle(r))+'</span><span>added '+ppE(ppWhenDay(r.createdAt))+'</span>'+(r.updatedAt?'<span>last changed '+ppE(ppWhenDay(r.updatedAt))+(r.updatedBy?' by '+ppE(ppName(r.updatedBy,true)):'')+'</span>':'');
  ed.el.innerHTML='<div class="scrim" data-edclose></div><div class="box pp-edbox">'+
    '<div class="top"><div><h3 id="pp-edm-t">'+title+'</h3><div class="meta">'+meta+'</div></div><button class="x" type="button" data-edclose aria-label="Close">&#215;</button></div>'+
    '<div class="pp-edgrid"><form class="pp-edform" novalidate autocomplete="off">'+ppEdFormHtml()+'</form>'+
    '<aside class="pp-edside" aria-label="History and details">'+ppEdSideHtml()+'</aside></div>'+ppEdFootHtml()+'</div>';
  ppEdState();
}
function ppEdChanges(){
  const ed=PP.ed; if(!ed) return [];
  return Object.keys(ed.cur).filter(k=>String(ed.cur[k]??'').trim()!==String(ed.orig[k]??'').trim())
    .map(k=>({f:k, from:ed.orig[k]??'', to:String(ed.cur[k]??'').trim()}));
}
function ppEdErrors(){
  const c=PP.ed.cur, e={};
  if(!String(c.feature||'').trim()) e.feature='Give the item a name.';
  if(ppCols().some(x=>x.key==='month') && !/^\d{4}-\d{2}$/.test(c.month||'')) e.month='Choose the month it is committed to.';
  const k=String(c.key||'').trim(); if(k && !/^[A-Z][A-Z0-9_]+-\d+$/.test(k)) e.key='Use the ticket key, like EP-55432.';
  return e;
}
function ppEdState(){
  const ed=PP.ed; if(!ed) return;
  const ch=ppEdChanges(), err=ppEdErrors(), d=ed.el;
  d.querySelectorAll('.pp-fld').forEach(f=>{
    const k=f.dataset.fld, show=!!(err[k] && (ed.showErr || ed.touched.has(k)));
    f.classList.toggle('changed', !ed.isNew && ch.some(c=>c.f===k));
    f.classList.toggle('bad', show);
    const fe=f.querySelector('[data-err]'); if(fe){ fe.hidden=!show; fe.textContent=show?err[k]:''; }
    const inp=f.querySelector('[data-f]'); if(inp) inp.setAttribute('aria-invalid',show?'true':'false');
  });
  const save=d.querySelector('#pp-ed-save'), msg=d.querySelector('#pp-ed-msg');
  if(!save||!msg) return;
  const nErr=Object.keys(err).length;
  save.disabled=!!ed.saving || (!ed.isNew && !ppIsDraft(ed.row) && !ch.length);   // a draft's Save says what is missing
  msg.textContent = ed.saving ? 'Saving…'
    : ed.isNew ? (nErr ? 'Feature and Month are required.' : 'Ready to add.')
    : ch.length ? ch.length+' unsaved change'+(ch.length===1?'':'s')+(nErr&&(ed.showErr||ppIsDraft(ed.row))?' · '+Object.values(err)[0]:'')
    : (ppIsDraft(ed.row)?'Give it a Feature to finish it.':'No changes yet.');
  msg.classList.toggle('bad', !!(nErr && ed.showErr));
}
function ppOpenEditor(id,preset){
  if(PP.ed) ppEdClose();
  uiToastHide();
  const r=id?PP.rows.find(x=>x.id===id):null;
  if(id && !r) return;
  const v={}; ppCols().forEach(c=>{ v[c.key]=r?String((r.v||{})[c.key]??''):''; });
  if(!r){ v.status='Planned'; v.priority='Customer'; Object.keys(preset||{}).forEach(k=>{ if(preset[k]) v[k]=preset[k]; }); }
  const d=document.createElement('div');
  d.className='modal pp-edm'; d.id='pp-edm'; d.setAttribute('open',''); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','pp-edm-t');
  PP.ed={id:r?r.id:null, row:r, isNew:!r, orig:Object.assign({},v), cur:Object.assign({},v), showErr:false, touched:new Set(),
    prev:document.activeElement, preset:preset||null, el:d, saving:false, gone:false};
  document.body.appendChild(d);
  ppEdPaint();
  d.addEventListener('input',ppEdInput);
  d.addEventListener('change',ppEdInput);
  d.addEventListener('focusout',e=>{ const el=e.target.closest&&e.target.closest('[data-f]'); if(el&&PP.ed){ PP.ed.touched.add(el.dataset.f); ppEdState(); } });
  d.addEventListener('submit',e=>e.preventDefault());
  d.addEventListener('click',e=>{
    const t=e.target; let b;
    if(t.closest('[data-edclose]')){ ppEdTryClose(); return; }
    if(t.closest('#pp-ed-save')){ ppEdSave(); return; }
    if(t.closest('#pp-ed-remove')){ ppEdRemove(); return; }
    if((b=t.closest('[data-pprevert]'))){ const [rid,eid]=b.dataset.pprevert.split('|'); ppRevertEntry(rid,eid); return; }
    if((b=t.closest('[data-edrestore]'))){ ppEdRestore(b.dataset.edrestore); return; }
  });
  document.addEventListener('keydown',ppEdKey,true);
  setTimeout(()=>{ const f=d.querySelector(r&&!ppIsDraft(r)?'[data-f]:not([disabled])':'#ppf-feature'); if(f) f.focus(); else { const x=d.querySelector('.x'); if(x) x.focus(); } },0);
}
function ppEdInput(e){
  const el=e.target.closest&&e.target.closest('[data-f]'); if(!el||!PP.ed) return;
  const k=el.dataset.f; let v=el.value;
  if(k==='key'){ const up=v.toUpperCase(); if(up!==v){ const p=el.selectionStart; el.value=up; try{ el.setSelectionRange(p,p); }catch(_){} } v=up; }
  PP.ed.cur[k]=v;
  if(e.type==='change') PP.ed.touched.add(k);
  if(k==='why'){ const c=PP.ed.el.querySelector('[data-cnt="why"]'); if(c) c.textContent=v.length+' / '+ppWhyMax(); }
  if(k==='estimate'){ const p=PP.ed.el.querySelector('[data-est]'); if(p) p.textContent=ppEstPreview(v); }
  ppEdState();
}
function ppEdKey(e){
  if(!PP.ed) return;
  if(document.querySelector('.ui-dlg')) return;   // a question asked on top of the form owns the keys
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); ppEdTryClose(); }
  else if(e.key==='Enter' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); ppEdSave(); }
  else if(e.key==='Enter' && e.target.matches && e.target.matches('.pp-edform input')){ e.preventDefault(); }
  else if(e.key==='Tab'){ const box=PP.ed.el.querySelector('.box'); if(box) uiTrap(e,box); }
}
async function ppEdTryClose(){
  const ed=PP.ed; if(!ed) return;
  const n=ppEdChanges().length;
  if(n && !ppEdDisabled()){
    const ok=await uiConfirm({title:'Discard your changes?',
      body:'<p>'+n+' unsaved change'+(n===1?'':'s')+' to '+ppE(ed.isNew?'this new item':ppShort(ed.row))+' will be lost.</p>',
      ok:'Discard', cancel:'Keep editing', danger:true});
    if(!ok) return;
  }
  ppEdClose();
}
function ppEdClose(){
  const ed=PP.ed; if(!ed) return;
  document.removeEventListener('keydown',ppEdKey,true);
  ed.el.remove(); PP.ed=null;
  try{ if(ed.prev && ed.prev.isConnected) ed.prev.focus(); }catch(e){}
}
// a snapshot arrived while the form is open: keep what the reader typed, refresh history and details
function ppEdSync(){
  const ed=PP.ed; if(!ed||ed.isNew) return;
  const r=PP.rows.find(x=>x.id===ed.id);
  if(!r){ if(!ed.gone){ ed.gone=true; ppEdPaint(); } return; }
  const was=ed.row; ed.row=r;
  if(ppIsDel(r)!==ppIsDel(was)){ ppEdPaint(); return; }
  const side=ed.el.querySelector('.pp-edside'); if(side){ const st=side.scrollTop; side.innerHTML=ppEdSideHtml(); side.scrollTop=st; }
}
async function ppEdSave(){
  const ed=PP.ed; if(!ed||ed.saving||ppEdDisabled()) return;
  const err=ppEdErrors();
  if(Object.keys(err).length){
    ed.showErr=true; ppEdState();
    const f=ed.el.querySelector('.pp-fld.bad [data-f]'); if(f) f.focus();
    return;
  }
  if(ed.isNew){
    const vals={}; Object.keys(ed.cur).forEach(k=>{ const s=String(ed.cur[k]??'').trim(); if(s) vals[k]=s; });
    ed.saving=true; ppEdState();
    const id=await ppCreate(vals);
    if(PP.ed!==ed) return;
    ed.saving=false;
    if(!id){ ppEdState(); return; }
    ppEdClose();
    PP.flash=id; ppRender();
    const shown=ppFiltered().some(x=>x.id===id);
    uiToast('Added '+ppShort({v:vals})+' to '+ppMo(vals.month)+(vals.team?' · '+vals.team:'')+(shown?'':' (your filters hide it)')+'.',
      {action:'Undo',onAction:()=>{ const rr=PP.rows.find(x=>x.id===id); if(rr) ppRemoveWithUndo(rr); }});
    return;
  }
  const ch=ppEdChanges(); if(!ch.length){ ppEdClose(); return; }
  ed.saving=true; ppEdState();
  const id=ed.row.id, b=await ppCommit(id,ch,{label:'Saved'});
  if(PP.ed!==ed) return;
  ed.saving=false;
  if(!b){ ppEdState(); return; }
  ppEdClose();
  PP.flash=id; ppRender();
  const r=PP.rows.find(x=>x.id===id)||ed.row;
  uiToast('Saved '+ch.map(c=>ppFldLabel(c.f)).slice(0,3).join(', ')+(ch.length>3?' and '+(ch.length-3)+' more':'')+' on '+ppShort(r)+'.',
    {action:'Undo',onAction:()=>ppUndoBatch(id,b)});
}
async function ppEdRemove(){
  const ed=PP.ed; if(!ed||ed.isNew) return;
  const n=ppEdChanges().length;
  if(n){
    const ok=await uiConfirm({title:'Remove this item?', body:'<p>Your '+n+' unsaved change'+(n===1?'':'s')+' will be discarded. The item is kept under Removed and can be restored.</p>', ok:'Remove', danger:true});
    if(!ok) return;
  }
  const r=ed.row; ppEdClose(); await ppRemoveWithUndo(r);
}
async function ppEdRestore(id){
  const r=PP.rows.find(x=>x.id===id); if(!r) return;
  if(await ppRestore(id)){ PP.flash=id; ppRender(); uiToast('Restored '+ppShort(r)+'.'); }
}
function ppDefaultPreset(){
  const ms=ppMonthOpts(''), now=ppToday().slice(0,7);
  const month=PP.f.month || (ms.includes(now)?now:(ms[0]||''));
  const team=PP.f.team && PP.f.team!=='No team' ? PP.f.team : '';
  return {month, team};
}
function ppNewFrom(key){
  if(ppRO()) return;
  const p=String(key||'').split('|'), bk=p[0]||'none', m=p.length>1?p[p.length-1]:'', t=p.slice(1,-1).join('|');
  const preset={month:m||ppDefaultPreset().month, team:(t && t!=='No team')?t:'', driver: bk==='plat'?'Platform':(bk.charAt(0)==='c'?bk.slice(1):'')};
  ppOpenEditor(null,preset);
}

// ---------- History: every change on the pipeline, newest first (pp-history) ----------
function ppOpenHistory(tab){
  if(PP.hm) ppHmClose();
  uiToastHide();
  const d=document.createElement('div');
  d.className='modal pp-hm'; d.setAttribute('open',''); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','pp-hm-t');
  PP.hm={el:d, tab:tab||'all', who:'', q:'', claude:true, prev:document.activeElement};
  d.innerHTML='<div class="scrim" data-hmclose></div><div class="box pp-hmbox">'+
    '<div class="top"><div><h3 id="pp-hm-t">Pipeline history</h3><div class="meta"><span>Every add, change, removal and restore, newest first. It is stored on each item in the shared database, so everyone sees the same record (pp-history).</span></div></div>'+
    '<button class="x" type="button" data-hmclose aria-label="Close">&#215;</button></div>'+
    '<div class="pp-hmbar"><span class="seg" role="group" aria-label="Show">'+
      '<button type="button" data-hmtab="all">All changes</button><button type="button" data-hmtab="removed">Removed</button></span>'+
      '<label class="pp-hmf" data-hmfilters>Who <select data-hmwho></select></label>'+
      '<input type="search" class="pp-hmf" data-hmq placeholder="Search items, fields and values" aria-label="Search the history">'+
      '<label class="pp-hmf pp-chk2"><input type="checkbox" data-hmclaude checked> Include Claude’s import and migration</label></div>'+
    '<div class="body" data-hmlist></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',e=>{
    const t=e.target; let b;
    if(t.closest('[data-hmclose]')){ ppHmClose(); return; }
    if((b=t.closest('[data-hmtab]'))){ PP.hm.tab=b.dataset.hmtab; ppHmPaint(); return; }
    if((b=t.closest('[data-ppedit]'))){ const id=b.dataset.ppedit; ppHmClose(); ppOpenEditor(id); return; }
    if((b=t.closest('[data-hmundo]'))){ const p=b.dataset.hmundo.split('|'); ppUndoBatch(p[0],p.slice(1).join('|')); return; }
    if((b=t.closest('[data-hmcolundo]'))){ ppUndoCols(b.dataset.hmcolundo); return; }
    if((b=t.closest('[data-hmrestore]'))){ const r=PP.rows.find(x=>x.id===b.dataset.hmrestore);
      ppRestore(b.dataset.hmrestore).then(ok=>{ if(ok&&r){ PP.flash=r.id; ppRender(); uiToast('Restored '+ppShort(r)+'.'); } }); return; }
  });
  d.addEventListener('input',e=>{ if(e.target.matches('[data-hmq]')){ PP.hm.q=e.target.value; ppHmList(); } });
  d.addEventListener('change',e=>{
    if(e.target.matches('[data-hmwho]')){ PP.hm.who=e.target.value; ppHmList(); }
    if(e.target.matches('[data-hmclaude]')){ PP.hm.claude=e.target.checked; ppHmList(); }
  });
  document.addEventListener('keydown',ppHmKey,true);
  ppHmPaint();
  setTimeout(()=>{ const b=d.querySelector('[data-hmtab][aria-pressed="true"]'); if(b) b.focus(); },0);
}
function ppHmKey(e){
  if(!PP.hm || PP.ed || document.querySelector('.ui-dlg')) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); ppHmClose(); }
  else if(e.key==='Tab'){ const box=PP.hm.el.querySelector('.box'); if(box) uiTrap(e,box); }
}
function ppHmClose(){
  const hm=PP.hm; if(!hm) return;
  document.removeEventListener('keydown',ppHmKey,true);
  hm.el.remove(); PP.hm=null;
  try{ if(hm.prev && hm.prev.isConnected) hm.prev.focus(); }catch(e){}
}
function ppHmSync(){ if(PP.hm) ppHmPaint(); }
function ppAllEntries(){
  const list=[];
  PP.rows.forEach(r=>ppHistOf(r).forEach(e=>list.push(Object.assign({row:r},e))));
  ppCfgHist().forEach(e=>list.push(e));
  return list;
}
function ppHmPaint(){
  const hm=PP.hm; if(!hm) return; const d=hm.el;
  d.querySelectorAll('[data-hmtab]').forEach(b=>{
    const on=b.dataset.hmtab===hm.tab; b.setAttribute('aria-pressed',String(on));
    if(b.dataset.hmtab==='removed') b.textContent='Removed ('+ppRemoved().length+')';
  });
  d.querySelectorAll('.pp-hmf').forEach(x=>{ x.hidden = hm.tab!=='all'; });
  const sel=d.querySelector('[data-hmwho]');
  if(sel){
    const ids=[...new Set(ppAllEntries().map(e=>e.by||''))];
    const opts=[['','Everyone']].concat(ids.map(i=>[i,i?ppName(i):'Unknown'])).sort((a,b)=>a[0]===''?-1:b[0]===''?1:a[1].localeCompare(b[1]));
    if(hm.who && !ids.includes(hm.who)) hm.who='';
    sel.innerHTML=opts.map(([v,l])=>'<option value="'+ppE(v)+'"'+(v===hm.who?' selected':'')+'>'+ppE(l)+'</option>').join('');
  }
  ppHmList();
}
function ppHmList(){
  const hm=PP.hm; if(!hm) return;
  const host=hm.el.querySelector('[data-hmlist]'); if(!host) return;
  const st=host.scrollTop;
  host.innerHTML = hm.tab==='removed' ? ppHmRemovedHtml() : ppHmAllHtml();
  host.scrollTop=st;
}
function ppHmRemovedHtml(){
  const rs=ppRemoved(), ro=ppRO();
  if(!rs.length) return '<div class="empty">Nothing has been removed. A removed item waits here, with its history, until someone restores it.</div>';
  return '<div class="pp-hday">'+rs.map(r=>{ const v=r.v||{};
    const bits=[v.month?ppMo(v.month):'', ppTeam(r).t||'', ppIsDraft(r)?'draft':''].filter(Boolean).join(' · ');
    return '<div class="pp-rmrow"><div class="tx"><button type="button" class="pp-lnk" data-ppedit="'+r.id+'">'+ppE(ppTitle(r))+'</button>'+
      '<div class="m">'+(bits?ppE(bits)+' · ':'')+'removed by '+ppE(ppName(r.deleted.by,true))+', '+ppE(ppWhen(r.deleted.at))+'</div></div>'+
      (ro?'':'<button type="button" class="ibtn primary" data-hmrestore="'+r.id+'">Restore</button>')+'</div>'; }).join('')+'</div>';
}
function ppHmAllHtml(){
  const hm=PP.hm;
  let list=ppAllEntries();
  if(!hm.claude) list=list.filter(e=>e.by!=='claude');
  if(hm.who) list=list.filter(e=>(e.by||'')===hm.who);
  if(hm.q){ const q=hm.q.toLowerCase();
    list=list.filter(e=>[e.row?ppTitle(e.row):'columns', e.f?ppFldLabel(e.f):'', ppFmtVal(e.f,e.from), ppFmtVal(e.f,e.to), e.note, e.cfg?ppColText(e):'', ppName(e.by)]
      .some(x=>String(x||'').toLowerCase().includes(q))); }
  const bs=ppBatches(list);
  if(!bs.length) return '<div class="empty">No recorded change matches.</div>';
  const days=new Map();
  bs.forEach(g=>{ const k=ppDayKey(g.at); if(!days.has(k)) days.set(k,[]); days.get(k).push(g); });
  return [...days.entries()].sort((a,b)=>a[0]<b[0]?1:a[0]>b[0]?-1:0).map(([k,gs])=>{
    const timed=gs.filter(g=>String(g.at||'').length>10), untimed=gs.filter(g=>String(g.at||'').length<=10);
    return '<div class="pp-hday"><h4>'+ppE(ppDayLabel(k))+'</h4>'+timed.map(ppHmRow).join('')+
      (untimed.length?'<div class="pp-hsub">Time of day not recorded</div>'+untimed.map(ppHmRow).join(''):'')+'</div>';
  }).join('');
}
function ppHmRow(g){
  const e0=g.es.find(e=>!e.f)||g.es[0], k=e0.k, who='<b>'+ppE(ppName(e0.by))+'</b>', ro=ppRO();
  const rows=[...new Map(g.es.filter(e=>e.row).map(e=>[e.row.id,e.row])).values()];
  const time=String(g.at||'').length>10?ppWhen(g.at,true):'';
  let text='', detail='', act='';
  if(e0.cfg){
    text=who+' '+ppE(ppColText(e0).replace(/^./,c=>c.toLowerCase()));
    if(!ro && ['rename','move','add','remove'].includes(e0.op)) act='<button type="button" class="ibtn sm" data-hmcolundo="'+ppE(e0.id)+'">Undo</button>';
  } else if(rows.length>1){
    text=who+' '+(k==='import'?'imported '+rows.length+' items from the Confluence ledger, as it stood on 18 Sep 2026':k==='migrate'?'migrated '+rows.length+' items to schema 2 (spec v1 §2 and §3)':'changed '+rows.length+' items');
    const n=g.es.filter(e=>e.f).length;
    detail='<details class="pp-hdet"><summary>'+(n?'Show the '+n+' field change'+(n===1?'':'s')+' on '+rows.length+' items':'Show the '+rows.length+' items')+'</summary>'+
      rows.map(r=>{ const fs=g.es.filter(e=>e.row&&e.row.id===r.id&&e.f);
        return '<div class="pp-hitem"><button type="button" class="pp-lnk" data-ppedit="'+r.id+'">'+ppE(ppTitle(r))+'</button>'+fs.map(e=>ppChangeLine(e,r,false)).join('')+'</div>'; }).join('')+
      '</details>';
  } else {
    const r=rows[0], fields=g.es.filter(e=>e.f);
    const item=r?'<button type="button" class="pp-lnk" data-ppedit="'+r.id+'">'+ppE(ppTitle(r))+'</button>':'an item';
    if(k==='add') text=who+' added '+item;
    else if(k==='remove') text=who+' removed '+item;
    else if(k==='restore') text=who+' restored '+item;
    else if(k==='import') text=who+' imported '+item;
    else if(k==='migrate') text=who+' migrated '+item;
    else text=who+' '+(k==='revert'?'set back ':'changed ')+fields.map(e=>ppE(ppFldLabel(e.f))).join(', ')+' on '+item;
    detail=fields.map(e=>ppChangeLine(e,r,false)).join('')+(k==='add'&&e0.note?'<div class="pp-hn">'+ppE(e0.note)+'</div>':'');
    if(r && !ro && ['add','edit','revert','remove','restore'].includes(k) && !(k!=='restore'&&k!=='remove'&&ppIsDel(r)))
      act='<button type="button" class="ibtn sm" data-hmundo="'+r.id+'|'+ppE(g.k)+'" title="'+(k==='add'?'Remove the item again':k==='remove'?'Restore the item':k==='restore'?'Remove the item again':'Set these fields back')+'">Undo</button>';
  }
  return '<div class="pp-hrow"><div class="tm">'+ppE(time)+'</div><div class="tx">'+text+detail+'</div><div class="ac">'+act+'</div></div>';
}

// ---------- interaction ----------
function ppClosePop(){ if(PP.pop){ PP.pop.remove(); PP.pop=null; document.removeEventListener('mousedown',ppOutside,true); document.removeEventListener('keydown',ppPopKey,true); } }
function ppOutside(e){ if(PP.pop && !PP.pop.contains(e.target)) ppClosePop(); }
function ppPopKey(e){ if(e.key==='Escape' && PP.pop){ e.preventDefault(); e.stopPropagation(); const b=PP.pop._btn; ppClosePop(); try{ if(b) b.focus(); }catch(_){} } }
function ppPopAt(el,html){
  ppClosePop();
  const d=document.createElement('div'); d.className='pp-pop'; d.innerHTML=html; d._btn=el;
  document.body.appendChild(d);
  const r=el.getBoundingClientRect();
  d.style.top=(window.scrollY+r.bottom+6)+'px';
  d.style.left=Math.max(8,Math.min(window.innerWidth-d.offsetWidth-8, window.scrollX+r.left))+'px';
  PP.pop=d; setTimeout(()=>{ document.addEventListener('mousedown',ppOutside,true); document.addEventListener('keydown',ppPopKey,true); },0);
  const f=d.querySelector('input,select,button'); if(f) setTimeout(()=>f.focus(),0);
  return d;
}

// in-place table editing: a quick change, saved when the cell is left, recorded like any other (pp-history)
function ppEditCell(td){
  if(ppRO()) return;
  const [id,key]=td.dataset.ppcell.split('|');
  const r=PP.rows.find(x=>x.id===id); if(!r) return;
  const col=ppCols().find(c=>c.key===key); if(!col) return;
  const cur=String((r.v||{})[key]??'');
  let el, counter=null;
  if(col.type==='select' || key==='month' || key==='driver'){
    el=document.createElement('select'); el.className='pp-ed';
    if(key==='driver') el.innerHTML=ppDriverOpts(cur);
    else if(key==='month') el.innerHTML=ppMonthOpts(cur).map(m=>'<option value="'+m+'"'+(m===cur?' selected':'')+'>'+ppMo(m)+'</option>').join('');
    else el.innerHTML='<option value="">—</option>'+ppOpts(col,cur);
  } else if(key==='why' || col.limit){
    // one line with a hard limit (pp-why-one-line): the editor enforces it
    const max=ppWhyMax();
    el=document.createElement('input'); el.className='pp-ed'; el.type='text'; el.maxLength=max; el.value=cur;
    counter=document.createElement('span'); counter.className='pp-cnt';
    const upd=()=>{counter.textContent=el.value.length+' / '+max;}; upd(); el.addEventListener('input',upd);
  } else if(col.type==='long'){
    el=document.createElement('textarea'); el.className='pp-ed'; el.value=cur;
  } else {
    el=document.createElement('input'); el.className='pp-ed'; el.type='text'; el.value=cur;
  }
  el.setAttribute('aria-label',ppFldLabel(key)+' for '+ppTitle(r));
  const prev=td.innerHTML; td.innerHTML=''; td.appendChild(el); if(counter) td.appendChild(counter); el.focus();
  if(el.select) el.select();
  let done=false;
  const commit=async ok=>{ if(done)return; done=true;
    let val=ok?String(el.value).trim():null;
    td.innerHTML=prev;
    if(!ok) return;
    if(key==='why' && val.length>ppWhyMax()) val=val.slice(0,ppWhyMax());
    if(key==='key') val=val.toUpperCase();
    if(val===cur) return;
    if(key==='feature' && !val){ uiToast('Feature cannot be empty. To take an item off the ledger, use × to remove it.',{bad:true}); return; }
    if(key==='key' && val && !/^[A-Z][A-Z0-9_]+-\d+$/.test(val)){ uiToast('“'+val+'” is not a Jira key. Use the ticket key, like EP-55432.',{bad:true}); return; }
    const b=await ppCommit(id,[{f:key,from:cur,to:val}],{label:'Saved'});
    if(b) uiToast(ppFldLabel(key)+' saved on '+ppShort(PP.rows.find(x=>x.id===id)||r)+'.',{action:'Undo',onAction:()=>ppUndoBatch(id,b)});
  };
  el.addEventListener('blur',()=>commit(true));
  el.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); commit(false); }
    else if(e.key==='Enter' && (el.tagName!=='TEXTAREA' || e.metaKey || e.ctrlKey)){ e.preventDefault(); commit(true); }
  });
  if(el.tagName==='SELECT') el.addEventListener('change',()=>commit(true));
}

// the columns every total, the grid and the form depend on can be hidden, not removed
const PP_CORE={feature:1,month:1,status:1,driver:1,team:1,key:1,estimate:1};
function ppColMenu(btn){
  const key=btn.dataset.ppcol, cols=ppCols(), i=cols.findIndex(c=>c.key===key), c=cols[i]; if(!c) return;
  const core=!!PP_CORE[key];
  const d=ppPopAt(btn,
    '<div class="hdl">Column</div>'+
    '<input id="pp-cname" value="'+ppE(c.label)+'" placeholder="Column name" aria-label="Column name">'+
    '<select id="pp-ctype" aria-label="Column type">'+['text','long','select'].map(t=>'<option value="'+t+'"'+(c.type===t?' selected':'')+'>'+
      (t==='long'?'Long text':t==='select'?'Pick from a list':'Short text')+'</option>').join('')+'</select>'+
    '<button type="button" data-ppact="rename">Save name and type</button>'+
    '<div class="sep"></div>'+
    '<button type="button" data-ppact="left"'+(i<=0?' disabled':'')+'>← Move left</button>'+
    '<button type="button" data-ppact="right"'+(i>=cols.length-1?' disabled':'')+'>Move right →</button>'+
    '<button type="button" data-ppact="hide">Hide from my table</button>'+
    '<div class="sep"></div>'+
    '<div class="hdl">Add a column after this one</div>'+
    '<input id="pp-newcol" placeholder="New column name" aria-label="New column name">'+
    '<button type="button" data-ppact="addafter">+ Add the column</button>'+
    '<div class="sep"></div>'+
    (core?'<div class="hdl pp-popnote">The grid and the totals use this column, so it can be hidden but not removed.</div>'
      :'<button type="button" class="danger" data-ppact="remove">Remove this column…</button>'));
  const act=async name=>{
    const next=cols.slice(); let desc=null;
    if(name==='rename'){
      const nm=d.querySelector('#pp-cname').value.trim()||c.label, ty=d.querySelector('#pp-ctype').value;
      if(nm===c.label && ty===c.type){ ppClosePop(); return; }
      next[i]=Object.assign({},c,{label:nm,type:ty}); desc={op:'rename',key,fromLabel:c.label,toLabel:nm,fromType:c.type||'text',toType:ty};
    }
    else if(name==='left'){ next.splice(i-1,0,next.splice(i,1)[0]); desc={op:'move',key,label:c.label,from:i,to:i-1}; }
    else if(name==='right'){ next.splice(i+1,0,next.splice(i,1)[0]); desc={op:'move',key,label:c.label,from:i,to:i+1}; }
    else if(name==='hide'){ PP.hidden.add(key); ppSavePrefs(); ppClosePop(); ppRender(); uiToast('“'+c.label+'” is hidden from your table only. Columns ▾ brings it back.'); return; }
    else if(name==='addafter'){
      const inp=d.querySelector('#pp-newcol'), nm=inp.value.trim(); if(!nm){ inp.focus(); inp.placeholder='Type a name first'; return; }
      const k='c'+Date.now().toString(36); next.splice(i+1,0,{key:k,label:nm,type:'text',w:160}); desc={op:'add',key:k,label:nm};
    }
    else if(name==='remove'){
      const b=d.querySelector('[data-ppact="remove"]');
      if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Remove “'+c.label+'” for everyone? Click again'; return; }
      next.splice(i,1); desc={op:'remove',key,index:i,col:c};
    }
    ppClosePop(); await ppSaveCols(next,desc);
  };
  d.addEventListener('click',e=>{ const b=e.target.closest('[data-ppact]'); if(b && !b.disabled) act(b.dataset.ppact); });
  d.addEventListener('keydown',e=>{ if(e.key!=='Enter') return;
    if(e.target.id==='pp-newcol'){ e.preventDefault(); act('addafter'); }
    else if(e.target.id==='pp-cname'){ e.preventDefault(); act('rename'); } });
}

function ppColChooser(btn){
  const cols=ppCols();
  const d=ppPopAt(btn,'<div class="hdl">Show these columns in my table</div>'+
    cols.map(c=>'<label class="pp-chk"><input type="checkbox" data-ppvis="'+c.key+'"'+(PP.hidden.has(c.key)?'':' checked')+'> '+ppE(c.label)+'</label>').join('')+
    '<div class="sep"></div><button type="button" data-ppall="1">Show every column</button>'+
    '<div class="hdl" style="padding-top:8px">Only your view changes. Jira columns are always shown and never editable.</div>');
  d.addEventListener('change',e=>{
    const cb=e.target.closest('[data-ppvis]'); if(!cb) return;
    if(cb.checked) PP.hidden.delete(cb.dataset.ppvis); else PP.hidden.add(cb.dataset.ppvis);
    ppSavePrefs(); ppRender();
  });
  d.addEventListener('click',e=>{ if(e.target.closest('[data-ppall]')){ PP.hidden.clear(); ppSavePrefs(); ppClosePop(); ppRender(); } });
}

function ppBind(){
  const host=document.getElementById('panel-pipeline'); if(!host) return;
  const q0=document.getElementById('pp-q');
  if(q0) q0.addEventListener('input',ppSearch);
  if(host.dataset.ppbound) return;
  host.dataset.ppbound='1';
  host.addEventListener('click',e=>{
    const t=e.target;
    let b;
    if((b=t.closest('[data-ppedit]'))){ ppOpenEditor(b.dataset.ppedit); return; }
    if((b=t.closest('[data-ppnew]'))){ ppNewFrom(b.dataset.ppnew); return; }
    if((b=t.closest('[data-ppdel]'))){ const r=PP.rows.find(x=>x.id===b.dataset.ppdel); if(r) ppRemoveWithUndo(r); return; }
    if((b=t.closest('[data-ppcol]'))){ ppColMenu(b); return; }
    if((b=t.closest('[data-ppsort]'))){ const k=b.dataset.ppsort;
      PP.sort = PP.sort.k===k ? {k, dir:-PP.sort.dir} : {k, dir:1}; ppRender(); return; }
    if((b=t.closest('[data-ppflag]'))){ PP.f.flag=b.dataset.ppflag; ppRender(); ppToView(); return; }
    if((b=t.closest('[data-ppfilter]'))){ const k=b.dataset.ppfilter;
      PP.f[k] = PP.f[k]===b.dataset.ppval ? '' : b.dataset.ppval; ppRender(); ppToView(); return; }
    if(t.closest('#pp-colbtn')){ ppColChooser(t.closest('#pp-colbtn')); return; }
    if(t.closest('#pp-add')){ ppOpenEditor(null,ppDefaultPreset()); return; }
    if(t.closest('#pp-hist')){ ppOpenHistory('all'); return; }
    if(t.closest('#pp-removed')){ ppOpenHistory('removed'); return; }
    if(t.closest('#pp-clear')){ PP.f={month:'',team:'',driver:'',area:'',status:'',flag:'',q:''}; ppRender(); return; }
    if((b=t.closest('#pp-group button'))){
      PP.group=b.dataset.v; PP.sort={k:'',dir:1}; ppSavePrefs(); ppRender(); return; }
    if((b=t.closest('#pp-view button'))){ PP.view=b.dataset.v; ppSavePrefs(); ppRender(); return; }
    if(t.closest('a')) return;
    if((b=t.closest('td[data-ppcell]')) && !b.querySelector('.pp-ed')) ppEditCell(b);
  });
  host.addEventListener('change',e=>{
    const s=e.target.closest('[data-ppf]'); if(!s) return;
    const k=s.dataset.ppf; if(k==='flag') PP.f.flag=s.value; else PP.f[k]=s.value; ppRender();
  });
}
function ppSearch(e){
  const q=e.target; PP.f.q=q.value;
  clearTimeout(PP._t); PP._t=setTimeout(()=>{ const pos=q.selectionStart; ppRender();
    const n=document.getElementById('pp-q'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} } },220);
}

ppBoot();
