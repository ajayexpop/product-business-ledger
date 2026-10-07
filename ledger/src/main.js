
(function(){
const D=window.LEDGER;
// the page reads against today, not against the day its data was built: ages, countdowns and
// the month columns move with the calendar, and the live Jira refresh keeps the tickets current
const NOW_S=(()=>{ const t=new Date().toISOString().slice(0,10); return t>D.asOf?t:D.asOf; })();
const TODAY=new Date(NOW_S+'T00:00:00Z');
(function extendMonths(){
  const ML=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let last=D.months[D.months.length-1];
  // the whole calendar year is always on show: months still to come carry their shows, and fill in as they happen
  while(last && last<NOW_S.slice(0,4)+'-12'){
    let [y,m]=last.split('-').map(Number); m++; if(m>12){m=1;y++;}
    last=y+'-'+String(m).padStart(2,'0'); D.months.push(last); D.monthLabels.push(ML[m-1]);
  }
})();
// the data as built, kept apart so the live Jira changes can be laid over it again at every refresh
const BASE={bugs:D.bugs.slice(), stories:D.stories.slice(), sk:{}};
D.companies.forEach(c=>{ BASE.sk[c.pd]=(c.storyKeys||[]).slice(); });
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
  const openInc=D.incidents.filter(i=>i.st!=='Done'&&i.st!=='Cancelled');
  const atCap=D.companies.filter(c=>c.incScore!=null&&penTotal(c)>=LV('at-cap-threshold'));
  const urgent=D.bugs.filter(b=>b.p==='Urgent').length;
  const soon=(D.events||[]).filter(e=>e.kind==='event'&&e.pd&&e.s&&dnum(e.s)>=0&&dnum(e.s)<=90);
  const soonPd=[...new Set(soon.map(e=>e.pd))];
  const exposed=soonPd.filter(pd=>D.bugs.some(b=>(b.repIds.includes(pd)||b.affIds.includes(pd))&&(b.p==='Urgent'||b.p==='High')));
  const k=[
    {n:D.companies.length,l:'Active clients',d:t1.length+' Tier 1 · '+D.companies.filter(c=>c.tier===2).length+' Tier 2',tab:'ledger'},
    {n:epStories.length,l:'Stories in 2026',d:shipped+' shipped · '+(epStories.length-shipped)+' in progress · '+D.namedCount+' named to a client'+(hvS.length?' · +'+hvS.length+' Hyve team':''),tab:'delivery'},
    {n:exposed.length+' / '+soonPd.length,l:'Shows in 90 days with Urgent or High open',d:soon.length+' shows across '+soonPd.length+' clients'+(exposed.length?' · '+exposed.slice(0,2).map(pd=>shortName((byId[pd]||{}).name||'')).join(', '):''),tab:'ledger',warn:true},
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
  const on=`<b>Hyve dedicated team is counted in.</b> The whole team is funded by Hyve, so every item it works on is funded. ${nS} delivery items and ${nB} open bugs from the HV project are attributed to Hyve Group Plc by project membership, not by label.
     No other client on this board has a dedicated team feeding it, so <b>Hyve is not like-for-like comparable with the other 48 rows</b> while this is on. Closed HV bugs (${c.bugsClosed}) and rejected items (${c.storiesRejected+c.bugsRejected}) are counted nowhere.`;
  const off=`<b>Hyve dedicated team is excluded.</b> Hyve Group Plc is shown on EP work only, so every client on this board is counted the same way. ${HV.stories.length} delivery items and ${HV.bugs.filter(b=>hvPreQ2||!b.pre).length} open bugs are hidden. This is the <b>hv-exclude</b> rule — save it on the Logic tab to make it the default for everyone who opens this page.`;
  const wasOpen=!!(el.querySelector('details')||{}).open;
  const body=(hvExclude?off:on).replace(/^<b>[^<]*<\/b>\s*/,'');
  el.innerHTML=`<span class="dot"></span><details class="hvd"${wasOpen?' open':''}><summary><b>${hvExclude?'Hyve dedicated team is excluded':'Hyve dedicated team is counted in'}</b> <span class="hvtag" title="Every item the Hyve dedicated team works on is funded by Hyve (Ajay, 28 Sep 2026)">funded</span><span class="linkq">details</span></summary><div class="hvtx">${body}</div></details>`+
    `<button class="ibtn" id="hv-toggle" type="button">${hvExclude?'Include the team':'Exclude the team'}</button>`;
  document.getElementById('hv-toggle').addEventListener('click',()=>{
    const r=LOGIC.rules.find(x=>x.id==='hv-exclude');
    if(r){ r.value = String(r.value)==='1' ? 0 : 1; lgTouch(); }
  });
}

// ----- tabs
function showTab(t){
  const AC=window.EP_ACCESS||{ajay:false,checked:false};
  if((t==='logic'||t==='refresh')&&!AC.how){
    if(!AC.checked){ AC.want=t; t='overview'; }
    else { uiToast('Rules and Sync & logs are private for now.'); return; } }
  // a tab that no longer exists (the Timeline, removed 6 Oct 2026) or a mistyped link opens the Overview
  if(!document.getElementById('panel-'+t)) t='overview';
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  document.querySelectorAll('.panel').forEach(p=>p.hidden=(p.id!=='panel-'+t));
  fitDetail(); try{if(typeof ppFit==='function')ppFit()}catch(e){}
  try{ const a=Object.keys(TAB_ALIAS).find(k=>TAB_ALIAS[k]===t)||t; history.replaceState(null,'','#'+a); }catch(e){}
  if(t==='refresh') try{ rfRender(); if(window.hsShow) window.hsShow(); }catch(e){}
  const tb=document.querySelector('.tab[aria-selected="true"]'); if(tb&&tb.scrollIntoView) try{tb.scrollIntoView({block:'nearest',inline:'nearest'})}catch(e){}
}
const TAB_ALIAS={clients:'ledger',requests:'pipeline',rules:'logic'};
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)showTab(b.dataset.tab)});

// ----- ledger charts (the investment x liability quadrant was retired on 25 Sep 2026 at the owner's request)
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
  const list=aggs.filter(a=>myOk(a.c.pd)&&(!tier||String(a.c.tier)===tier)&&(!owner||a.c.owner===owner)&&(!q||a.c.name.toLowerCase().includes(q))
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
  return a.liab?`<b class="il-n">${fmt1(a.liab)}</b>`:'<span class="zero">0</span>';
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
    ['Product area', s.pdm?`<b>${esc(s.pdm)}</b> › ${esc(s.pp)}`:'<span class="sx-dim">not classified</span>'],
    ...(s.pdm?[['Classified by', esc({component:'Jira component',epic:'epic',summary:'story text',none:'no product matched'}[s.pab]||s.pab)+' · '+esc(s.pac)+' confidence<br><span class="sx-dim">'+esc(s.pae||'')+(s.pak?' '+esc(s.pak):'')+'</span>']]:[]),
    ['AI product tag', esc(s.pa||'—')],
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
    :s.nw?[['Not analysed yet','Added by the live Jira refresh. The line above is the Jira ticket’s own summary; theme, value and product area are written at the next rebuild.']]
    :[['The problem',s.pr],['Why it was done',s.wy],['What changed',s.oc]].filter(x=>x[1]);
  return `<div class="sx${s.sf!=='Shipped'?' prog':''}">
    <button class="sx-top" type="button" data-sxt aria-expanded="false">
      <span class="k">${esc(s.k)}</span>
      <span class="s">${esc(s.s)}
        <span class="m">${s.hv?'<span class="hvtag" title="Funded by Hyve">Hyve team · funded</span>':''}<span class="th"><i style="background:${col}"></i>${esc(lensName(s.lens))}</span>${s.pp?`<span class="vpill" title="${esc(s.pdm)}">${esc(s.pp)}</span>`:''}<span>${esc(s.team||'no team')}</span>${s.cf==='Low'?'<span class="lowconf">low confidence</span>':''}</span>
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
  const e=a.exp;
  const bands=[[0,30,'il-age-mult-30','0–30 days'],[31,90,'il-age-mult-90','31–90'],[91,180,'il-age-mult-180','91–180'],[181,1e9,'il-age-mult-older','over 180']];
  const byBand=bands.map(([lo,hi,id,l])=>{const bs=a.all.filter(b=>{const d=days(b.cr)||0;return d>=lo&&d<=hi});
    return bs.length?`${bs.length} at ${l} ×${+LV(id)}`:''}).filter(Boolean);
  const pipeList=a.pipe.map(r=>{const v=r.v||{};return `${v.key?`<a href="${jira(v.key)}" target="_blank" rel="noopener">${esc(v.key)}</a>`:'no ticket'} ${esc(String(v.feature||'').slice(0,48))} <span class="small">${esc(fmtMo(v.month))}${a.pipeNew.includes(r)?'':' · already a named story'}</span>`}).join('<br>');
  return `<div class="eyebrow">Investment, liability, exposure</div>
        <dl class="kv">
          <dt>Investment</dt><dd><b>${a.inv}</b> <span class="small">${a.ship.length} shipped + ${a.prog.length} in progress named to them + ${a.pipeNew.length} pipeline item${a.pipeNew.length===1?'':'s'} they drive · counts, not days (il-investment-unit)</span>${pipeList?'<div class="small" style="margin-top:3px">'+pipeList+'</div>':''}</dd>
          <dt>Liability</dt><dd><b>${fmt1(a.liab)}</b> <span class="small">${a.all.length} open bug${a.all.length===1?'':'s'}${byBand.length?' ('+byBand.join(', ')+')':''} + ${a.live.length} incident${a.live.length===1?'':'s'} × ${LV('incident-points')}</span></dd>
          <dt>Exposure</dt><dd>${e.next?`${esc(e.next.n)} <span class="small">${fmtDate(e.next.s)} · ${e.next.now?'running now':'in '+e.days+' days'} · window ${esc(winLabel(e.win))}</span>`:'<span class="small">no dated show — read by the always-on rule</span>'}
            ${e.flags.length?'<div style="margin-top:4px">'+e.flags.map(f=>`<div class="small"><span class="rk ${f.lv}">${f.lv}</span> ${esc(f.t)} <span class="sx-dim">${esc(f.id)}</span></div>`).join('')+'</div>':'<div class="small">no red or amber rule fired</div>'}</dd>
        </dl>`;
}
function detailRow(a,L){
  const c=a.c;
  L=L||ilLines(D.companies.map(agg));
  const bug=b=>`<div class="bug${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' aff':''}">
    <div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div>
    <div class="s">${esc(b.s)}${b.hv?' <span class="hvtag" title="Hyve dedicated team, funded by Hyve">HV · funded</span>':''}<div class="m">${esc(b.team||'no team')}${b.ev?' · '+esc(b.ev):''}${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' · affected only':''}</div></div>
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
        <button class="ibtn primary c360-open" type="button" data-c360="${esc(c.pd)}">Open Client 360</button>
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
  document.querySelectorAll('#f-scope button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLedger()});
document.getElementById('f-bal').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;balFilter=b.dataset.v;openPd=null;
  document.querySelectorAll('#f-bal button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLedger()});

// ----- DELIVERY tab
let pinnedMonth='';
function deliveryFiltered(){
  const pa=document.getElementById('d-pa').value;
  const cl=document.getElementById('d-client').value, ln=document.getElementById('d-lens').value,
        tm=document.getElementById('d-team').value, st=document.getElementById('d-status').value,
        bv=document.getElementById('d-bv').value, q=document.getElementById('d-search').value.trim().toLowerCase();
  return D.stories.filter(s=>paMatch(s,pa)&&(!cl||s.pds.includes(cl))&&(!ln||s.lens===ln)&&(!tm||s.team===tm)&&(!st||s.sf===st)&&(!bv||s.bv===bv)
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
['d-pa','d-client','d-lens','d-team','d-status','d-bv','d-search'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{renderDelivery()}));

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
  const on=document.getElementById('inc-open-now'), op=D.incidents.filter(i=>i.st!=='Done'&&i.st!=='Cancelled');
  if(on) on.textContent=op.length?op.length+' ('+op.slice(0,3).map(i=>i.key+' '+(i.ev||'')+', '+i.p).join('; ')+(op.length>3?'; …':'')+')':'None';
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


// ===== TIMELINE tab: removed 6 Oct 2026; the code is kept in deprecated/timeline/ (see its README) =====
// still used: TIERS by the Delivery tier bands, tlRisk by the Overview show risk
const TIERS=[{k:1,l:'Tier 1',c:'var(--tier1)'},{k:2,l:'Tier 2',c:'var(--tier2)'},{k:3,l:'Tier 3',c:'var(--tier3)'},{k:4,l:'Tier 4',c:'var(--tier4)'},{k:null,l:'No tier in Planhat',c:'var(--tier0)'}];
function tlRisk(c){
  const a=agg(c), lv=a.exp.lv, quiet=!a.all.length&&!openPipeFor(c.pd).length;
  return {a, st:lv||(quiet?'clear':'open'), t:lv==='red'?'Act now':lv==='amber'?'Watch':quiet?'Clear':'No flag'};
}

// ----- cell popup: every issue type for one client-month
let modalPd=null;
// the review dialog borrows the modal's button through this action, never through onclick: closeModal ran
// first and cleared onclick, so Confirm and save used to do nothing
let modalAction=null;
const modal=document.getElementById('modal');
function closeModal(){modal.removeAttribute('open');modalPd=null;modalAction=null;
  const mb=modal.querySelector('.box'); if(mb) mb.classList.remove('fe-wide','fe-xwide');
  // the review dialog borrows this button; hand it back so the next client popup is not a save button
  const b=document.getElementById('modal-open-client'); if(b){b.textContent='Open the full client record';}}
modal.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.hasAttribute('open'))closeModal()});
document.getElementById('modal-open-client').addEventListener('click',()=>{
  if(modalAction){const f=modalAction;closeModal();f();return}
  const pd=modalPd;closeModal();if(pd){openPd=null;openClient(pd)}});

// ===== DELIVERY TIMELINE: tier band > client > month, every story behind the cell =====
let dview='tl', dModalRow=null, dModalM=null;
let dlZoom=(()=>{ try{ const z=+localStorage.getItem('ep-dl-zoom'); return z>=1&&z<=5?z:2; }catch(e){ return 2; } })();
function dlSetZoom(z){ dlZoom=Math.max(1,Math.min(5,z)); try{ localStorage.setItem('ep-dl-zoom',dlZoom); }catch(e){} renderDelivery(); }
const DM=D.months;
const DMLAB={}; D.months.forEach((m,i)=>DMLAB[m]=D.monthLabels[i]);
const NCS='Not Clearly Specified';
const teamOf=s=>s.team||NCS;
// product area = the product catalogue's top level (domain), from data/stories/pa (rule dl-product-area)
const PAS=D.productAreas||[], NOPA='Not classified';
const domOf=s=>s.pdm||NOPA;
let dPlatRows='pa';
const platRow=s=>dPlatRows==='pa'?'a:'+domOf(s):'t:'+teamOf(s);
const rowName=row=>row.replace(/^[ta]:/,'');
function paMatch(s,v){
  if(!v)return true;
  if(v==='-')return !s.pdm;
  return v.charAt(0)==='d'?s.pdm===v.slice(2):s.pp===v.slice(2);
}
const medianOf=a=>{if(!a.length)return null;const v=a.slice().sort((x,y)=>x-y);const h=v.length>>1;return v.length%2?v[h]:Math.round((v[h-1]+v[h])/2)};
function cycOf(list){return medianOf(list.map(s=>s.cyc).filter(v=>v!=null))}

// one story lands in a client row per client label, or in its team's platform row
function dlIndex(list){
  const ix={};
  const put=(row,m,s)=>{ix[row]=ix[row]||{};ix[row][m]=ix[row][m]||{ship:[],prog:[]};ix[row][m][s.sf==='Shipped'?'ship':'prog'].push(s)};
  list.forEach(s=>{
    if(DM.indexOf(s.mo)<0)return;
    if(s.pds&&s.pds.length)s.pds.forEach(pd=>{if(byId[pd])put('c'+pd,s.mo,s)});
    else put(platRow(s),s.mo,s);
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
  const byPa=dPlatRows==='pa', plat=D.stories.filter(s=>!(s.pds&&s.pds.length));
  const teams=[...new Set(plat.map(s=>platRow(s).slice(2)))]
    .map(t=>({id:(byPa?'a:':'t:')+t,label:t,sub:'platform work'}))
    .filter(r=>ix[r.id])
    .map(r=>{
      let all=[];DM.forEach(m=>{all=all.concat(dlStories(dlCell(ix,r.id,m)))});r.n=all.length;
      if(byPa){const pc={};all.forEach(s=>{if(s.pp)pc[s.pp]=(pc[s.pp]||0)+1});
        r.sub=Object.keys(pc).sort((a,b)=>pc[b]-pc[a]).slice(0,2).map(k=>k+' '+pc[k]).join(' · ')||'platform work';}
      return r})
    .sort((a,b)=>{const w=r=>r.label===NOPA?2:(byPa&&r.label==='Cross-cutting'?1:0);return w(a)-w(b)||b.n-a.n||a.label.localeCompare(b.label)});
  if(teams.length)out.push({key:'plat',label:'Platform work — named to no client, by '+(byPa?'product area':'team'),colour:'var(--tier0)',unit:byPa?'product area':'team',rows:teams});
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
  el.style.gridTemplateColumns=`minmax(${dlZoom>=4?240:186}px,${dlZoom>=4?280:215}px) repeat(${DM.length},minmax(${[50,64,92,130,180][dlZoom-1]}px,1fr))`;
  el.dataset.zoom=dlZoom; el.style.setProperty('--tlrow',[40,48,60,74,92][dlZoom-1]+'px');
  const dz=document.getElementById('d-zoomlbl'); if(dz) dz.textContent=['Smallest','Small','Medium','Large','Largest'][dlZoom-1];
  document.querySelectorAll('#d-zoom [data-z]').forEach(b=>b.disabled=(b.dataset.z==='-1'&&dlZoom<=1)||(b.dataset.z==='1'&&dlZoom>=5));
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
  const name=c?shortName(c.name):rowName(row);
  const st=dlStories(cell), cyc=cycOf(st);
  document.getElementById('modal-title').textContent=name+' · '+fmtMo(m);
  document.getElementById('modal-meta').innerHTML=
    (c?`${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">Tier ${c.tier}</span>`:'<span class="tierpill na">no tier</span>'}<span>Health ${c.health==null?'—':Math.round(c.health)}</span><span>${esc(c.owner||'no owner')}</span>`
       :'<span class="tierpill na">platform work'+(row.charAt(0)==='a'?' · product area':'')+'</span>')
    +`<span>${cell.ship.length} shipped${cell.prog.length?' · '+cell.prog.length+' in progress':''}</span>`
    +(cyc!=null?`<span>median ${cyc}d to deliver</span>`:'<span>no delivery time measurable</span>');
  const evh=c?evSection(c.pd,m):'';
  document.getElementById('modal-body').innerHTML=
    evh
    +(st.length?`<div class="seclabel"><i style="background:var(--del-ship)"></i>Stories<span class="c">click any story for its full analysis</span></div>`
      +`<div class="dlist">`+st.sort((a,b)=>(row.charAt(0)==='a'?String(a.pp||'').localeCompare(String(b.pp||'')):0)||(b.sf==='Shipped')-(a.sf==='Shipped')||a.k.localeCompare(b.k)).map(s=>storyFull(s)).join('')+`</div>`:'')
    ||'<div class="empty">Nothing recorded.</div>';
  const tot=D.stories.filter(s=>isC?(s.pds||[]).includes(row.slice(1)):(!(s.pds&&s.pds.length)&&(row.charAt(0)==='a'?domOf(s):teamOf(s))===row.slice(2))).length;
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
  document.getElementById('d-plat-wrap').hidden=dview!=='tl';
  renderDelivery();
});
document.getElementById('d-plat').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  dPlatRows=b.dataset.v;
  document.querySelectorAll('#d-plat button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  try{localStorage.setItem('ep-ledger-platrows',dPlatRows)}catch(e){}
  renderDelivery();
});

// ===== EVENTS: the deadline layer on both timelines =====
const EVK={event:'Show',community:'Community',other:'Engagement',eplite:'EP Lite'};
const EVENTS=D.events||[];
const TODAY_S=NOW_S;
const dnum=s=>s?Math.round((new Date(s+'T00:00:00Z')-new Date(TODAY_S+'T00:00:00Z'))/86400000):null;
// a show is a dated deadline; community and engagement records run for a year and are not
const isShow=e=>e.kind==='event'&&!e.bad;
// each client's next dated show, from today: a show already running counts, a cancelled one does not
function nextShowOf(pd){
  let best=null;
  EVENTS.forEach(e=>{ if(e.pd!==pd||!isShow(e)||!e.s||e.st==='Cancelled')return;
    if((e.e||e.s)<TODAY_S)return; if(!best||e.s<best.s)best=e; });
  return best?{k:best.k,n:best.n,s:best.s,e:best.e||best.s,in:Math.max(0,dnum(best.s)),now:best.s<=TODAY_S}:null;
}
D.companies.forEach(c=>{ c.nextEvent=nextShowOf(c.pd); });
// index events by client and by month touched (an event spanning a month boundary marks both)
const EVIX={};
EVENTS.forEach(e=>{
  if(!e.pd||!e.s)return;
  const a=e.s.slice(0,7), b=(e.e||e.s).slice(0,7);
  const ms=new Set([a,b]);
  ms.forEach(m=>{(EVIX[e.pd]=EVIX[e.pd]||{})[m]=((EVIX[e.pd]||{})[m]||[]).concat([e])});
});
// (rebuilt by evIndex() when the OP delta changes events)
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
  const driven=PIPE.filter(r=>/^\d+$/.test(String((r.v||{}).driver||''))).length;
  const lad=FLOW?flLadder():null, ft=FLOW?flMed('total'):null;
  return {
    liabTotal: fmt1(aggs.reduce((a,x) => a + x.liab, 0)),
    topLiab: ranked.length ? shortName(ranked[0].c.name)+' ('+fmt1(ranked[0].liab)+')' : '—',
    top5: ranked.slice(0,5).map(a => shortName(a.c.name)).join(' › '),
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
function renderAll(){ applyDelta(); applyHyve(); renderHvBar(); renderKPIs(); renderLedger(); renderRisk(); renderDelivery(); renderBugs(); renderInc(); renderModel(); chartPenalty(); renderFlow(); renderLogic(); renderPipe(); renderOverview(); }

// --- interactions
document.getElementById('lg-body').addEventListener('input',e=>{
  const n=e.target.closest('[data-lgnum]'); if(!n)return;
  const r=LOGIC.rules.find(x=>x.id===n.dataset.lgnum); if(!r)return;
  const v=parseFloat(n.value); if(Number.isNaN(v)){showImpact(r,n.value);return}
  r.value=v; applyLogic();
  lgDirty=true;
  renderKPIs(); renderLedger(); renderRisk(); renderDelivery(); renderBugs(); renderInc(); chartPenalty(); renderFlow(); renderPipe();
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
  if(window.LEDGER_PREVIEW){ lgReadOnly('This is a preview copy of the ledger; rules are saved in the live ledger.'); return; }
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
// ================= Explanations tucked away: open on request, remembered per viewer =================
const tkLS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem('ep-tk-'+k); if(v) localStorage.setItem('ep-tk-'+k,'1'); else localStorage.removeItem('ep-tk-'+k); }catch(e){} return null; };
function tkKey(el,kind){ const p=el.closest('.panel'); const all=[...(p||document).querySelectorAll('[data-tk="'+kind+'"]')]; return (p?p.id:'page')+':'+kind+':'+all.indexOf(el); }
function tuck(){
  document.querySelectorAll('.panel .banner:not([data-tk])').forEach(b=>{
    b.dataset.tk='about';
    const d=document.createElement('details'); d.className='about';
    d.innerHTML='<summary><span class="ib" aria-hidden="true">i</span>How to read this</summary>';
    b.parentNode.insertBefore(d,b); d.appendChild(b);
    const k=tkKey(b,'about'); if(tkLS(k)) d.open=true; d.addEventListener('toggle',()=>tkLS(k,d.open));
  });
  document.querySelectorAll('.panel p.small:not([data-tk])').forEach(n=>{
    n.dataset.tk='notes';
    const d=document.createElement('details'); d.className='about notes';
    d.innerHTML='<summary><span class="ib" aria-hidden="true">i</span>Notes on this view</summary>';
    n.parentNode.insertBefore(d,n); d.appendChild(n);
    const k=tkKey(n,'notes'); if(tkLS(k)) d.open=true; d.addEventListener('toggle',()=>tkLS(k,d.open));
  });
  document.querySelectorAll('.card > .note:not([data-tk])').forEach(n=>{
    n.dataset.tk='note';
    const card=n.parentNode, h=card.querySelector(':scope > h3, :scope > .ov-h > h3, :scope > .tv-ch > h3');
    const b=document.createElement('button'); b.type='button'; b.className='infob'; b.setAttribute('aria-expanded','false');
    b.setAttribute('aria-label','About this'); b.textContent='i';
    if(h) h.appendChild(b); else card.insertBefore(b,n);
    const k=tkKey(n,'note'), set=o=>{ card.classList.toggle('note-open',o); b.setAttribute('aria-expanded',String(o)); };
    set(!!tkLS(k) || card.classList.contains('note-open'));
    b.addEventListener('click',()=>{ const o=!card.classList.contains('note-open'); set(o); tkLS(k,o); });
  });
}
let TK_T=0;
new MutationObserver(()=>{ if(TK_T) return; TK_T=requestAnimationFrame(()=>{ TK_T=0; tuck(); }); }).observe(document.body,{childList:true,subtree:true});

// ================= Sign-in: who is using the ledger (rule pp-signin) =================
// Identity comes from the viewer's claude.ai account in the ExpoPlatform organisation. The gate asks on every
// visit, and nothing is written to the shared database until the viewer has continued as themselves.
const GATE={ok:false, uid:null, name:'', avatar:'', user:null, canWrite:null, done:false};
window.GATE=GATE;

// ===== Settings (was "How it works"): Rules and Sync & logs open only to Ajay and the Settings viewers. Method & sources is read-only for
// everyone since 6 Oct 2026 (owner: definitions are shared, never private). The Must-have ledger opened to everyone on 30 Sep 2026 =====
// Ajay (ajay@expoplatform.com) is recognised as the artifact's owner, or by a claude.ai account id listed in EP_AJAY_IDS
// (the organisation does not share emails with pages, so the email itself cannot be checked). This hides the views; it is
// not a vault: the page source and logic.json still carry the rules.
const EP_AJAY_IDS=[];
var ACCESS={ajay:false, how:false, checked:false, want:null}; window.EP_ACCESS=ACCESS;
// who else sees the private Settings tabs (Rules, Sync & logs), by claude.ai account id (the page cannot read
// email addresses). 30 Sep 2026, owner: Bartosz (bartosz@expoplatform.com).
const EP_HOW_IDS=['u_0KCjQDtQxEOgVhmNzuV5SQ'];
function isPrivateTab(t){ return t==='logic'||t==='refresh'; }
function applyAccess(){
  document.body.classList.toggle('ep-ajay',ACCESS.ajay);
  // Method & sources is read-only for everyone since 6 Oct 2026; Rules and Sync & logs stay with Ajay and the Settings viewers
  document.querySelectorAll('#tg-how [data-how]').forEach(b=>{ b.hidden=!ACCESS.how; });
  const cur=document.querySelector('.tab[aria-selected="true"]');
  if(ACCESS.how&&ACCESS.want){ const w=ACCESS.want; ACCESS.want=null; showTab(w); }
  else if(cur&&isPrivateTab(cur.dataset.tab)&&!ACCESS.how) showTab('overview');
  if(!ACCESS.how){ ['hs-host','rf-host','bt-lab'].forEach(id=>{ const e=document.getElementById(id); if(e) e.innerHTML=''; }); }
  ACCESS.want=null;
  try{ if(typeof ppRender==='function') ppRender(); }catch(e){}
}
window.showTab=showTab; window.applyAccess=applyAccess; window.EP_HOW_IDS=EP_HOW_IDS;
// Definitions (Method & sources, 6 Oct 2026): a number is defined once there; any [data-def] link closes what is open and lands on its entry
function openDef(k){
  try{ if(typeof btClose==='function') btClose(); }catch(e){}
  if(modal.hasAttribute('open')) closeModal();
  const c=document.getElementById('c360'); if(c&&!c.hidden) closeC360();
  showTab('method');
  setTimeout(()=>{ const e=document.getElementById('def-'+k); if(!e) return;
    const bar=document.querySelector('.tabs'), below=bar?bar.getBoundingClientRect().bottom:0; // the tab bar is sticky: land just under it
    window.scrollTo(0,Math.max(0,scrollY+e.getBoundingClientRect().top-below-12)); try{ e.focus({preventScroll:true}); }catch(_){}
    e.classList.add('def-hit'); setTimeout(()=>e.classList.remove('def-hit'),1800); },30);
}
window.openDef=openDef;
document.addEventListener('click',e=>{ const b=e.target.closest('[data-def]'); if(!b) return; e.preventDefault(); e.stopPropagation(); openDef(b.dataset.def); },true);
const TAB_ID=Math.random().toString(36).slice(2,8);
function gateEl(tag,cls,text){ const e=document.createElement(tag); if(cls)e.className=cls; if(text!=null)e.textContent=text; return e; }
async function gateBoot(){
  const gate=document.getElementById('gate'), who=document.getElementById('gate-who'), go=document.getElementById('gate-go'), fine=document.getElementById('gate-fine');
  const wrap=document.querySelector('.wrap'); if(wrap) wrap.inert=true;
  const u=await useCap('user'); GATE.user=u;
  if(u){
    try{ const me=await u.me(); GATE.uid=me.id||null; GATE.name=me.name||''; GATE.avatar=me.avatarUrl||'';
      ACCESS.ajay=EP_AJAY_IDS.includes(GATE.uid); if(!ACCESS.ajay){ try{ ACCESS.ajay=!!(await u.isOwner()); }catch(e){} }
      ACCESS.how=ACCESS.ajay||EP_HOW_IDS.includes(GATE.uid); }catch(e){}
    try{ GATE.canWrite=await u.can('data.write'); }catch(e){ GATE.canWrite=null; }
  }
  ACCESS.checked=true; applyAccess();
  who.textContent='';
  if(GATE.uid){
    const img=gateEl('img','gate-av'); img.src=GATE.avatar; img.alt='';
    const t=gateEl('span','gate-nm'); t.appendChild(gateEl('b',null,GATE.name||'Your account')); t.appendChild(gateEl('small',null,'Signed in to claude.ai · ExpoPlatform'));
    who.append(img,t);
    go.textContent='Continue as '+((GATE.name||'').split(' ')[0]||'yourself');
    fine.textContent = GATE.canWrite===false
      ? 'Your access to this page is view-only, so you can read everything but not log requests. Ask the owner for “Can interact” to log them.'
      : 'Requests you add, change or remove are recorded under this name with the date and time. Your visits and the sections you open are recorded for the ledger owner.';
  } else {
    who.appendChild(gateEl('span','gate-anon','We could not confirm who you are. You can read the ledger, but logging or changing a request needs you signed in to claude.ai with your ExpoPlatform account.'));
    go.textContent='Continue without signing in';
    fine.textContent='Open this page from claude.ai while signed in to log requests.';
  }
  go.disabled=false; go.focus();
  go.onclick=()=>{
    GATE.ok=!!GATE.uid; GATE.done=true;
    gate.hidden=true; if(wrap) wrap.inert=false;
    paintWho(); window.dispatchEvent(new Event('ep-gate')); if(GATE.ok) rfVisit();
    syncPaint(); syncMaybe();
  };
}
function paintWho(){
  const el=document.getElementById('who'); if(!el) return;
  el.textContent=''; el.hidden=false;
  if(GATE.ok){
    const img=gateEl('img','who-av'); img.src=GATE.avatar; img.alt='';
    el.append(img, gateEl('span','who-nm',GATE.name||'Signed in'));
    el.title='Signed in: requests you log are recorded under this name';
  } else {
    el.append(gateEl('span','who-nm','Not signed in · read-only'));
    el.classList.add('anon');
  }
}

// ================= Live Jira refresh: bugs and stories, at least every 4 hours =================
// The page asks Jira, through the Atlassian connector of whoever has it open, for EP bugs and stories changed
// since the last refresh; the answer goes into the shared database (collection jira, 16 bucket documents)
// so every viewer sees it, and is laid over the built data by applyDelta. One viewer refreshes at a time
// (a lease on sync/lock); sync/state records when, by whom, and what moved.
const JIRA_SERVER='Atlassian', JIRA_TOOL='searchJiraIssuesUsingJql', JIRA_SITE='expoplatform.atlassian.net';
const SYNC_H=4, SYNC_MIN_MANUAL_MIN=10;
const SYNC_BASE=D.deliveryAsOf<D.asOf?D.deliveryAsOf:D.asOf;
const JIRA_FIELDS=['summary','status','priority','issuetype','created','updated','statuscategorychangedate','customfield_10145','customfield_12190','customfield_10001'];
const SYNC={db:null, mcp:null, recs:{}, buckets:{}, state:null, running:false, err:null, stop:false, ready:false, note:''};
const BASE_BUG=new Set(BASE.bugs.map(b=>b.key)), BASE_STORY=new Set(BASE.stories.map(s=>s.k));

// ================= Data refresh (How it works, Ajay only; 28 Sep 2026) =================
// Every source, how fresh it is, and a delta pull. Nothing complete is pulled twice: each pull asks only for what changed
// since the last one (Jira "updated >="), a Done story is re-read only if Jira shows it changed, and what comes back is laid
// over the built data in the page (incidents by key, events by key), the same way the EP refresh is. Sources the page
// cannot reach itself are pulled by a Claude Code run: the button files a request that Claude picks up.
const RF={docs:{}, running:{}, err:{}, visits:{}, reqs:{}, names:{}, baseInc:null, baseEv:null, subs:false, booted:false};
const RF_KIND={'(EVENT)':'event','(COMMUNITY)':'community','(OTHER)':'other','(EP LITE)':'eplite'};
const RF_SRC=[
  {id:'ep', n:'Jira EP · bugs and stories', feeds:'Bugs, Delivery, client health flags', target:4, built:SYNC_BASE, live:true,
   rule:'Tickets updated since the last pull, at least every 4 hours, by whoever has the page open. A Done story is never re-read unless Jira shows it changed (reopened or edited).'},
  {id:'imp', n:'Jira IMP · incidents', feeds:'Incidents, client health, Overview', target:4, built:D.asOf, live:true,
   rule:'Incidents updated since the last pull. Status, priority and summary replace the built ones; a new incident joins its client by Pipedrive id.',
   jql:s=>'project = IMP AND updated >= '+s+' ORDER BY updated ASC', fields:['summary','status','priority','created','updated','customfield_12108','customfield_10145','customfield_10253'],
   map:n=>{ const f=n.fields||{}; return {k:n.key, s:unent(f.summary||''), st:(f.status||{}).name||'', p:(f.priority||{}).name||'', cr:String(f.created||'').slice(0,10), up:f.updated||'',
     pd:String(f.customfield_12108||'').trim(), rb:(f.customfield_10145||[]).map(o=>o&&o.value).filter(Boolean), ev:String(f.customfield_10253||'').trim()}; }},
  {id:'op', n:'Jira OP · event dates', feeds:'Overview, next show, Client 360', target:24, built:D.eventsAsOf||D.asOf, live:true,
   rule:'Event tickets updated since the last pull. New dates, statuses and new shows replace the built ones; test tickets are dropped.',
   jql:s=>'project = OP AND issuetype = 10080 AND updated >= '+s+' ORDER BY updated ASC', fields:['summary','status','duedate','customfield_10015','customfield_11906','customfield_10330','updated'],
   map:n=>{ const f=n.fields||{}, summ=unent(String(f.summary||'').trim()), m=summ.match(/^\s*(\([^)]*\))\s*/), pre=m?m[1].toUpperCase():null;
     if(/\b(test|testing|fake)\b/i.test(summ)) return {k:n.key, gone:true};
     const s=f.customfield_10015||null, e=f.duedate||s, c=f.customfield_10330;
     return {k:n.key, n:m?summ.slice(m[0].length).trim():summ, s, e, pd:String(f.customfield_11906||'').trim(), st:(f.status||{}).name||'', kind:RF_KIND[pre]||'event', ctry:Array.isArray(c)?c[0]:(c||''), up:f.updated||''}; }},
  {id:'hv', n:'Jira HV · Hyve dedicated team', feeds:'Hyve bar and counts', target:24, built:(HV&&HV.asOf)||D.asOf, live:true,
   rule:'Tickets updated since the last pull are listed here; the Hyve counts take them at the next build.',
   jql:s=>'project = HV AND updated >= '+s+' ORDER BY updated ASC', fields:['summary','status','issuetype','updated'],
   map:n=>{ const f=n.fields||{}; return {k:n.key, s:unent(f.summary||''), st:(f.status||{}).name||'', t:(f.issuetype||{}).name||'', up:f.updated||''}; }},
  {id:'planhat', n:'Planhat · tier, health and owners', feeds:'Tier bands, health scores, quality factors, owners', target:24, built:D.asOf, live:true, ajayOnly:true,
   rule:'Every Active company (about 50; Planhat’s nightly job touches them all, so “changed since” cannot narrow it). Tier, health, CSM and RM scores, sentiment, the three quality factors and the owner replace the built values by Pipedrive id. Only you run it.',
   pull:async()=>rfPlanhat()},
  {id:'workbook', n:'Customer & Event workbook (Drive)', feeds:'Pipedrive ids of record (the join key)', target:168, built:'2026-09-16T23:46:30Z', live:true, ajayOnly:true,
   rule:'Checks the file’s modified time, and looks for a newer version of the workbook. Only if something changed is the full re-read (a large spreadsheet) queued for Claude. Only you run it.',
   pull:async()=>rfWorkbook()},
  {id:'demand', n:'Demand map · FIS pages and EP feature requests', feeds:'Demand tab, duplicate search', target:168, built:'2026-09-26',
   rule:'Only pages and requests changed since the last pull are re-read and re-classified. Run by Claude Code.'},
  {id:'enrich', n:'Story enrichment · product areas and summaries', feeds:'Delivery product areas, story analysis', target:168, built:D.productAreasAsOf||D.asOf,
   rule:'Only new or changed stories are classified; Done stories already classified are never redone. Run by Claude Code.'}];
const rfAt=src=>{ const d=RF.docs[src.id]; if(src.id==='ep') return SYNC.state&&Date.parse(SYNC.state.lastRun)||null; return d&&Date.parse(d.lastRun)||null; };
const rfBy=src=>src.id==='ep'?(SYNC.state||{}).lastBy:(RF.docs[src.id]||{}).lastBy;
function rfAge(src){ const t=rfAt(src)||Date.parse(src.built+'T00:00:00Z'); return t?Date.now()-t:Infinity; }
function rfState(src){ const a=rfAge(src), h=src.target*3600e3; return a<=h?'fresh':a<=2*h?'due':'stale'; }
function evIndex(){ Object.keys(EVIX).forEach(k=>delete EVIX[k]); EVENTS.forEach(e=>{ if(!e.pd||!e.s) return; new Set([e.s.slice(0,7),(e.e||e.s).slice(0,7)]).forEach(m=>{ (EVIX[e.pd]=EVIX[e.pd]||{})[m]=((EVIX[e.pd]||{})[m]||[]).concat([e]); }); }); }
// lay the pulled deltas over the built incidents and events
function rfApply(){
  if(!RF.baseInc){ RF.baseInc=D.incidents.map(x=>Object.assign({},x)); RF.baseEv=EVENTS.map(x=>Object.assign({},x)); }
  const comp=new Set(D.companies.map(c=>c.pd)), imp=(RF.docs.imp||{}).recs||{}, op=(RF.docs.op||{}).recs||{};
  const incKeys=new Set(RF.baseInc.map(i=>i.key)), evKeys=new Set(RF.baseEv.map(e=>e.k));
  const inc=RF.baseInc.map(i=>{ const r=imp[i.key]; return r?Object.assign({},i,{s:r.s||i.s, st:r.st||i.st, p:r.p||i.p, live:true}):i; });
  Object.values(imp).forEach(r=>{ if(incKeys.has(r.k)||!comp.has(r.pd)) return; inc.push({key:r.k, s:r.s, st:r.st, p:r.p, cr:r.cr, pd:r.pd, rb:r.rb||[], ev:r.ev||'', ids:[r.pd], live:true, nw:true}); });
  D.incidents=inc;
  const ev=RF.baseEv.filter(e=>!(op[e.k]&&op[e.k].gone)).map(e=>{ const r=op[e.k]; if(!r) return e;
    return Object.assign({},e,{n:r.n||e.n, s:r.s||e.s, e:r.e||e.e, st:r.st||e.st, pd:comp.has(r.pd)?r.pd:e.pd, kind:r.kind||e.kind, bad:!!(r.s&&r.e&&r.s>r.e), live:true}); });
  Object.values(op).forEach(r=>{ if(r.gone||evKeys.has(r.k)) return; ev.push({k:r.k, n:r.n, s:r.s, e:r.e||r.s, pd:comp.has(r.pd)?r.pd:null, st:r.st, kind:r.kind, ctry:r.ctry||undefined, map:'pipedrive id (OP, live)', live:true, nw:true}); });
  EVENTS.length=0; ev.forEach(e=>EVENTS.push(e)); evIndex();
  const ph=(RF.docs.planhat||{}).recs||{}, PHF=['tier','health','csm','rm','sentiment','incScore','ocbw','cbs','scoreGap','breakdown','owner'];
  if(!RF.baseCo){ RF.baseCo={}; D.companies.forEach(c=>{ RF.baseCo[c.pd]={}; PHF.forEach(f=>RF.baseCo[c.pd][f]=c[f]); }); }
  D.companies.forEach(c=>{ const b=RF.baseCo[c.pd]||{}, r=ph[c.pd]; PHF.forEach(f=>{ c[f]=r&&r[f]!=null&&r[f]!==''?r[f]:b[f]; }); c.livePh=!!r; });
  D.companies.forEach(c=>{ c.nextEvent=nextShowOf(c.pd); });
}
const RF_PH_SERVER='Planhat', RF_GD_SERVER='Google Drive', RF_WB_ID='1O2N9kDzvDZbPRzhtTy-FlHyeOSrwevIt';
async function rfTool(server, tool, input){
  const res=await SYNC.mcp.callTool(server, tool, input, {cache:false}); let p=res&&res.payload;
  if(typeof p==='string'){ try{ p=JSON.parse(p); }catch(e){ throw {code:'tool_error', message:server+' answered in a format this page does not read.'}; } }
  return p;
}
const rfArr=p=>Array.isArray(p)?p:Array.isArray(p&&p.records)?p.records:Array.isArray(p&&p.data)?p.data:Array.isArray(p&&p.files)?p.files:[];
const rfTxt=h=>{ const d=document.createElement('div'); d.innerHTML=String(h||'').split(/<\/p>/i)[0]; return (d.textContent||'').trim(); };
async function rfPlanhat(){
  const sel=['name','externalId','h','csmScore','sentimentScore','owner','renewalDate','updatedAt','custom.RM Score','custom.Sales Tier (Won TCV band)','custom.Incident Score','custom.Open Client Bug Weight','custom.Client Bug Score','custom.Health Factors Breakdown','custom.Score Gap'];
  const co=rfArr(await rfTool(RF_PH_SERVER,'list_model_records',{MODEL:'Company', FILTER:{'phase[equal to]':'Active'}, LIMIT:200, SELECT:sel}));
  if(!co.length) throw {code:'tool_error', message:'Planhat returned no Active companies.'};
  const us=rfArr(await rfTool(RF_PH_SERVER,'list_model_records',{MODEL:'User', LIMIT:200, SELECT:['firstName','nickName']})), un={}; us.forEach(u=>{ un[u._id]=u.nickName||u.firstName||''; });
  const num=v=>v==null||v===''||isNaN(+v)?null:+v, recs={}, known=new Set(D.companies.map(c=>c.pd));
  co.forEach(c=>{ const pd=String(c.externalId||'').trim(); if(!pd) return; const x=c.custom||{};
    recs[pd]={k:pd, name:c.name||'', tier:num(x['Sales Tier (Won TCV band)']), health:num(c.h), csm:num(c.csmScore), rm:num(x['RM Score']), sentiment:num(c.sentimentScore),
      incScore:num(x['Incident Score']), ocbw:num(x['Open Client Bug Weight']), cbs:num(x['Client Bug Score']), scoreGap:num(x['Score Gap']), breakdown:rfTxt(x['Health Factors Breakdown']),
      owner:un[c.owner]||'', renewalDate:String(c.renewalDate||'').slice(0,10), up:c.updatedAt||''}; });
  const extra=Object.values(recs).filter(r=>!known.has(r.k)).map(r=>r.name), gone=D.companies.filter(c=>c.inPlanhatActive!==false&&!recs[c.pd]).map(c=>shortName(c.name));
  return {recs, seen:co.length, note:[extra.length?'Active in Planhat, not yet on the ledger: '+extra.slice(0,6).join(', ')+(extra.length>6?' …':''):'', gone.length?'On the ledger, no longer Active: '+gone.slice(0,6).join(', '):''].filter(Boolean).join(' · ')};
}
async function rfWorkbook(){
  const m=await rfTool(RF_GD_SERVER,'get_file_metadata',{fileId:RF_WB_ID, excludeContentSnippets:true}); const f=(m&&m.file)||m||{};
  const s=rfArr(await rfTool(RF_GD_SERVER,'search_files',{query:"title contains 'Customer & Event Data' and modifiedTime > '2026-09-17T00:00:00Z'", pageSize:10, excludeContentSnippets:true}));
  const built=Date.parse('2026-09-16T23:46:30Z'), changed=Date.parse(f.modifiedTime||'')>built+60000, newer=s.filter(x=>x.id!==RF_WB_ID).map(x=>({id:x.id, title:x.title||x.name||'', modifiedTime:x.modifiedTime||''}));
  if(changed||newer.length){ try{ await SYNC.db.doc('refresh-req/workbook').set({src:'workbook', name:'Customer & Event workbook (Drive)', by:GATE.uid, at:new Date().toISOString().replace(/\.\d{3}Z$/,'Z'), status:'open', auto:true, why:changed?'the workbook changed on '+String(f.modifiedTime).slice(0,10):'a newer workbook: '+newer[0].title}); }catch(e){} }
  return {recs:{file:{k:'file', id:RF_WB_ID, title:f.title||'', modifiedTime:f.modifiedTime||'', owner:f.owner||''}, newer:{k:'newer', list:newer}}, seen:1+newer.length,
    note:changed?'Changed on '+rfWhen(f.modifiedTime)+(f.owner?' by '+f.owner.split('@')[0]:'')+'; the re-read is queued for Claude.':newer.length?'A newer workbook exists: '+newer[0].title+'; the re-read is queued for Claude.':'Unchanged since '+rfWhen(f.modifiedTime)+'.'};
}
async function rfJql(jql, fields, lock, holder){
  const got=[]; let token=null, pages=0;
  do{
    const input={cloudId:JIRA_SITE, jql, fields, maxResults:100}; if(token) input.nextPageToken=token;
    const res=await SYNC.mcp.callTool(JIRA_SERVER, JIRA_TOOL, input, {cache:false});
    let p=res&&res.payload; if(typeof p==='string'){ try{ p=JSON.parse(p); }catch(e){ throw {code:'tool_error', message:'Jira answered in a format this page does not read.'}; } }
    const iss=p&&p.issues; let nodes=[];
    if(Array.isArray(iss)){ nodes=iss; token=p.isLast===false||p.nextPageToken?p.nextPageToken||null:null; }
    else if(iss&&Array.isArray(iss.nodes)){ nodes=iss.nodes; token=iss.pageInfo&&iss.pageInfo.hasNextPage?iss.pageInfo.endCursor:null; }
    else throw {code:'tool_error', message:'Jira returned no issue list.'};
    nodes.forEach(n=>got.push(n)); pages++;
    if(pages%4===0) await lock.acquire({holder, ttlMs:240000});
  }while(token&&pages<30);
  return got;
}
async function rfPull(id, quiet){
  const src=RF_SRC.find(x=>x.id===id); if(!src) return;
  if(!src.live) return rfRequest(src);
  if(src.ajayOnly&&!ACCESS.how) return;
  if(id==='ep'){ await runSync(true); rfRender(); return; }
  if(RF.running[id]) return;
  if(!GATE.ok||!SYNC.mcp||!SYNC.db){ if(!quiet) uiToast(!GATE.ok?'Sign in to pull.':'Connectors are not available in this view of the page.',{bad:true}); return; }
  RF.running[id]=true; RF.err[id]=null; rfRender();
  const holder=(GATE.uid||'anon')+':'+TAB_ID, lock=SYNC.db.doc('refresh-lock/'+id);
  try{
    const l=await lock.acquire({holder, ttlMs:240000}); if(!l.acquired){ if(!quiet) uiToast('A colleague is pulling '+src.n+' right now.'); return; }
    const cur=RF.docs[id]||null, t=cur&&Date.parse(cur.lastRun), age=t?Date.now()-t:Infinity;
    const since=isFinite(age)?'"-'+(Math.ceil(age/3600e3)+1)+'h"':'"'+src.built+'"';
    let recs, changed=0, seen=0, note='';
    if(src.pull){ const out=await src.pull(); const prev=(cur&&cur.recs)||{}; recs=out.recs; seen=out.seen; note=out.note||'';
      Object.keys(recs).forEach(k=>{ if(JSON.stringify(prev[k])!==JSON.stringify(recs[k])) changed++; }); }
    else { const got=await rfJql(src.jql(since), src.fields, lock, holder); seen=got.length;
      recs=Object.assign({}, (cur&&cur.recs)||{});
      got.forEach(n=>{ const r=src.map(n); if(!r) return; if(JSON.stringify(recs[r.k])!==JSON.stringify(r)) changed++; recs[r.k]=r; }); }
    const keep=Object.keys(recs).sort((a,b)=>String(recs[b].up||'').localeCompare(String(recs[a].up||''))).slice(0,900), small={}; keep.forEach(k=>small[k]=recs[k]);
    const iso=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
    const runs=((cur&&cur.runs)||[]).concat([{at:iso, by:GATE.uid, seen, changed, since:src.pull?'':since.replace(/"/g,''), manual:!quiet}]).slice(-20);
    await SYNC.db.doc('refresh/'+id).set({lastRun:iso, lastBy:GATE.uid, recs:small, runs, note});
    if(!quiet) uiToast(src.n+': '+seen+' checked, '+changed+' changed.'+(note?' '+note:''));
  }catch(e){ RF.err[id]={code:(e&&e.code)||'upstream_error', message:(e&&e.message)||''}; if(!quiet) uiToast(syncCodeText(RF.err[id]),{bad:true,ms:9000}); }
  finally{ RF.running[id]=false; rfRender(); }
}
async function rfRequest(src){
  if(!GATE.ok||!SYNC.db){ uiToast('Sign in to ask for a pull.',{bad:true}); return; }
  const iso=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  try{ await SYNC.db.doc('refresh-req/'+src.id).set({src:src.id, name:src.n, by:GATE.uid, at:iso, status:'open'}); uiToast('Asked for a pull of '+src.n+'. Claude picks it up in the next working session.'); }
  catch(e){ uiToast('Not sent ('+((e&&e.code)||'error')+').',{bad:true}); }
}
async function rfPullAll(){ for(const s of RF_SRC.filter(x=>x.live&&(!x.ajayOnly||ACCESS.how))) await rfPull(s.id); }
// the other in-page sources follow the EP refresh: whoever has the page open pulls them when they are due
function rfMaybe(){ if(!GATE.ok||!SYNC.mcp||!SYNC.db||GATE.canWrite===false||!RF.booted) return; RF_SRC.filter(s=>s.live&&s.id!=='ep'&&(!s.ajayOnly||ACCESS.how)&&rfAge(s)>=s.target*3600e3&&!RF.running[s.id]&&!RF.err[s.id]).forEach(s=>rfPull(s.id,true)); }
async function rfBoot(){
  const db=SYNC.db||await useCap('db'); if(!db) return;
  db.collection('refresh').onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data()||{}; });
    const was=JSON.stringify(['imp','op','planhat'].map(k=>(RF.docs[k]||{}).lastRun)), now=JSON.stringify(['imp','op','planhat'].map(k=>(m[k]||{}).lastRun));
    RF.docs=m; RF.booted=true; if(was!==now){ renderAll(); if(C360.pd) paintC360(); } rfRender(); rfMaybe(); },()=>{ RF.booted=true; });
}
// who opened the page: one write per visit (ids only), read on this tab
async function rfVisit(){
  const db=SYNC.db||await useCap('db'); if(!db||!GATE.uid||GATE.canWrite===false) return;
  try{ const ref=db.doc('visits/'+GATE.uid), g=await ref.get(), now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z'), o=g.exists?g.data():{};
    await ref.set({n:(o.n||0)+1, first:o.first||now, last:now}); }catch(e){}
}
function rfWatch(){
  if(RF.subs||!ACCESS.how||!SYNC.db) return; RF.subs=true;
  SYNC.db.collection('visits').onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data()||{}; }); RF.visits=m; rfNames(); rfRender(); },()=>{});
  SYNC.db.collection('refresh-req').onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data()||{}; }); RF.reqs=m; rfRender(); },()=>{});
}
async function rfNames(){
  const u=GATE.user; if(!u||!u.profiles) return;
  const acts=rfActivity(), ids=[...new Set(Object.keys(RF.visits).concat(acts.map(a=>a.by)).concat(RF_SRC.map(rfBy)).filter(x=>x&&x!=='claude'&&!(x in RF.names)))];
  if(!ids.length) return; try{ const ps=await u.profiles(ids); ids.forEach(i=>{ RF.names[i]=(ps[i]&&ps[i].name)||''; }); rfRender(); }catch(e){}
}
const rfName=id=>!id?'someone':id==='claude'?'Claude':id===GATE.uid?'you':(RF.names[id]||'a colleague');
// what people put in: feature ledger events, must-have ledger history, refreshes
function rfActivity(){
  const out=[], KV={migrate:'carried over a must-have item',log:'logged a work item',fill:'filled in details',handoff:'handed details to a colleague',create:'added a must-have item',update:'edited a must-have item',delete:'removed a must-have item'};
  try{ Object.entries(FE.ev||{}).forEach(([id,m])=>Object.values(m||{}).forEach(e=>out.push({at:e.at, by:e.by, t:(KV[e.k]||e.k)+' · '+id}))); }catch(e){}
  try{ (PIPE||[]).forEach(r=>Object.values(r.h||{}).forEach(h=>out.push({at:h.at, by:h.by, t:(KV[h.k]||h.k||'changed')+' · '+((r.v||{}).feature||r.id)}))); }catch(e){}
  ((SYNC.state||{}).runs||[]).forEach(r=>out.push({at:r.at, by:r.by, t:'refreshed Jira EP'}));
  Object.entries(RF.docs).forEach(([k,d])=>(d.runs||[]).forEach(r=>out.push({at:r.at, by:r.by, t:'pulled '+((RF_SRC.find(s=>s.id===k)||{}).n||k)+(r.changed?' · '+r.changed+' changed':'')})));
  return out.filter(a=>a.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,40);
}
function rfWhen(t){ if(!t) return '—'; const d=new Date(t); return isNaN(d)?'—':d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
function rfRender(){
  const host=document.getElementById('rf-host'); if(!host||!ACCESS.how) return;
  if(!document.getElementById('panel-refresh')||document.getElementById('panel-refresh').hidden) return;
  rfWatch();
  const st=RF_SRC.map(s=>({s, k:rfState(s)})), stale=st.filter(x=>x.k==='stale'), due=st.filter(x=>x.k==='due');
  const L={fresh:'Fresh',due:'Due',stale:'Stale'};
  const row=({s,k})=>{ const at=rfAt(s), by=rfBy(s), d=s.id==='ep'?null:RF.docs[s.id], last=d&&d.runs&&d.runs[d.runs.length-1], run=s.id==='ep'?SYNC.running:RF.running[s.id], err=s.id==='ep'?SYNC.err:RF.err[s.id], req=RF.reqs[s.id];
    return `<tr><td><b>${esc(s.n)}</b><div class="small">${esc(s.feeds)}</div></td>
      <td><span class="rf-b ${k}">${L[k]}</span><div class="small">target ${s.target<48?'every '+s.target+' h':'every '+Math.round(s.target/24)+' days'}</div></td>
      <td>${at?esc(rfWhen(at))+'<div class="small">by '+esc(rfName(by))+'</div>':'<span class="small">built '+esc(fmtDate(s.built))+'</span>'}${last?'<div class="small">'+last.seen+' checked · '+last.changed+' changed</div>':''}${d&&d.note?'<div class="small rf-note2">'+esc(d.note)+'</div>':''}${err?'<div class="small rf-err">'+esc(syncCodeText(err))+'</div>':''}</td>
      <td class="rf-rule">${esc(s.rule)}</td>
      <td class="rf-act">${s.live?`<button type="button" class="ibtn${k!=='fresh'?' primary':''}" data-rfpull="${s.id}"${run?' disabled':''}>${run?'Pulling…':'Pull delta now'}</button>`
        :`<button type="button" class="ibtn" data-rfreq="${s.id}">${req&&req.status==='open'?'Asked · ask again':'Ask Claude to pull'}</button>${req&&req.status==='open'?'<div class="small">asked '+esc(rfWhen(req.at))+'</div>':''}`}</td></tr>`; };
  const vis=Object.entries(RF.visits).sort((a,b)=>String(b[1].last).localeCompare(String(a[1].last)));
  const acts=rfActivity();
  host.innerHTML=`<div class="rf-top"><div><h3>Data refresh</h3><p class="small">Every source behind the ledger, how fresh it is, and a pull of only what changed. Private to you.</p></div>
    <div class="rf-sum ${stale.length?'stale':due.length?'due':'fresh'}">${stale.length?stale.length+' source'+(stale.length===1?'':'s')+' stale: '+stale.map(x=>esc(x.s.n.split(' · ')[0])).join(', '):due.length?due.length+' due soon':'All sources fresh'}</div>
    <button type="button" class="ibtn primary" data-rfall>Pull all deltas</button></div>
    <div class="pp-wrap"><table class="pp rf-tab"><thead><tr><th>Source</th><th>Freshness</th><th>Last pull</th><th>What a pull fetches</th><th></th></tr></thead><tbody>${st.map(row).join('')}</tbody></table></div>
    <div class="rf-note"><b>Nothing complete is pulled twice.</b> Each pull asks only for what changed since the last one. A Done story stays as it is unless Jira shows it changed. The Jira pulls run in the page with the connector of whoever has it open, so rows can differ by that person’s Jira access. Anything marked “Ask Claude to pull” is picked up in the next Claude Code session and folded into the build.</div>
    <div class="grid two rf-grid"><div class="card"><h3>Who opened the ledger</h3><div class="note">Recorded at sign-in: who and when, by account id. Everyone is told on the sign-in screen.</div>
      ${vis.length?`<div class="rf-list">${vis.slice(0,40).map(([id,v])=>`<div><b>${esc(rfName(id))}</b><span class="small">${esc(rfWhen(v.last))} · ${v.n||1} visit${(v.n||1)===1?'':'s'}</span></div>`).join('')}</div>`:'<div class="small">No visits recorded yet.</div>'}</div>
    <div class="card"><h3>What people put in</h3><div class="note">Work items logged and filled in, must-have edits, and data pulls, newest first.</div>
      ${acts.length?`<div class="rf-list">${acts.map(a=>`<div><b>${esc(rfName(a.by))}</b> ${esc(a.t)}<span class="small">${esc(rfWhen(a.at))}</span></div>`).join('')}</div>`:'<div class="small">Nothing yet.</div>'}</div></div>`;
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-rfpull],[data-rfreq],[data-rfall]'); if(!b||!ACCESS.how) return;
  if(b.dataset.rfpull) rfPull(b.dataset.rfpull); else if(b.dataset.rfreq) rfRequest(RF_SRC.find(s=>s.id===b.dataset.rfreq)); else rfPullAll(); });
const bucketOf=k=>{ let h=0; for(const ch of String(k)) h=(h*31+ch.charCodeAt(0))>>>0; return 'b'+String(h%16).padStart(2,'0'); };

// the Reported-by label dictionary, learned from how the built data already resolved each label
const normL=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const LBL=(function(){
  const m={}; const put=(l,pd)=>{ const k=normL(l); if(k&&k!=='internal'&&pd) (m[k]=m[k]||new Set()).add(String(pd)); };
  BASE.bugs.forEach(b=>{ if(b.rb&&b.repIds&&b.rb.length===b.repIds.length) b.rb.forEach((l,i)=>put(l,b.repIds[i]));
    if(b.ac&&b.affIds&&b.ac.length===b.affIds.length) b.ac.forEach((l,i)=>put(l,b.affIds[i])); });
  D.incidents.forEach(i=>{ if(i.rb&&i.ids&&i.rb.length===i.ids.length) i.rb.forEach((l,k)=>put(l,i.ids[k])); });
  D.companies.forEach(c=>{ (c.deliveryTags||[]).forEach(t=>put(t,c.pd)); put(c.name,c.pd); put(shortName(c.name),c.pd); });
  return m;
})();
function mapLabels(vals){
  const out=new Set();
  (vals||[]).forEach(v=>{
    const k=normL(v); if(!k||k==='internal') return;
    if(LBL[k]){ LBL[k].forEach(pd=>out.add(pd)); return; }
    if(k.length>=4){ const c=D.companies.find(c=>normL(c.name).startsWith(k)||normL(shortName(c.name))===k); if(c) out.add(String(c.pd)); }
  });
  return [...out];
}
const PRI_MAP={urgent:'Urgent',highest:'Urgent',blocker:'Urgent',critical:'Urgent',high:'High',medium:'Medium',low:'Low',lowest:'Low',trivial:'Low',minor:'Low'};
const mapPri=p=>PRI_MAP[String(p||'').toLowerCase()]||'Medium';
// the Atlassian connector returns summaries HTML-escaped (&amp;); decode them once so the page does not escape them twice
const unent=x=>{ const t=String(x??''); if(!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(t)) return t; const el=document.createElement('textarea'); el.innerHTML=t; return el.value; };
const qOf=m=>m?m.slice(0,4)+'-Q'+(Math.floor((+m.slice(5,7)-1)/3)+1):'';

// lay the Jira changes over the data as built. Runs before every render, so it is always from BASE.
function applyDelta(){
  const R=SYNC.recs, has=Object.keys(R).length;
  D.bugs=BASE.bugs.slice(); D.stories=BASE.stories.slice();
  D.companies.forEach(c=>{ c.storyKeys=(BASE.sk[c.pd]||[]).slice(); });
  if(has){
    const bugs=[];
    BASE.bugs.forEach(b=>{ const r=R[b.key];
      if(!r||r.t!=='B'){ bugs.push(b); return; }
      if(r.gone) return;
      bugs.push(Object.assign({},b,{st:r.st||b.st, sc:r.sc||b.sc, p:r.p?mapPri(r.p):b.p, s:r.s||b.s, up:r.up||b.up, live:true}));
    });
    Object.values(R).forEach(r=>{
      if(r.t!=='B'||r.gone||BASE_BUG.has(r.k)) return;
      const rep=mapLabels((r.rb||[]).filter(x=>x!=='INTERNAL')), aff=mapLabels(r.ac).filter(x=>!rep.includes(x));
      if(!rep.length&&!aff.length) return;
      bugs.push({key:r.k, s:r.s, st:r.st, sc:r.sc, p:mapPri(r.p), cr:r.cr, up:r.up, comp:[], rb:r.rb||[], ac:r.ac||[],
        pd:rep[0]||aff[0], ev:'', team:r.team||'', eid:'', wa:'', as:'', repIds:rep, affIds:aff, nw:true, live:true});
    });
    D.bugs=bugs;
    const stories=[];
    BASE.stories.forEach(s=>{ const r=R[s.k];
      if(!r||r.t!=='S'){ stories.push(s); return; }
      if(r.rej) return;
      const o=Object.assign({},s,{js:r.st||s.js, live:true});
      if(r.sc==='done'&&s.sf!=='Shipped'){ const m=(r.scd||r.up||'').slice(0,7)||s.mo; o.sf='Shipped'; o.mo=m; o.q=qOf(m); o.mb='resolved'; o.rd=(r.scd||'').slice(0,10)||s.rd; }
      else if(r.sc&&r.sc!=='done'&&s.sf==='Shipped'){ o.sf='In Progress'; }
      stories.push(o);
    });
    Object.values(R).forEach(r=>{
      if(r.t!=='S'||r.rej||BASE_STORY.has(r.k)||r.sc==='new'||!r.sc||String(r.cr)<'2026-01-01') return;
      const done=r.sc==='done', mo=done?String(r.scd||r.up||'').slice(0,7):String(r.cr).slice(0,7);
      if(!D.months.includes(mo)) return;
      const pds=mapLabels((r.rb||[]).filter(x=>x!=='INTERNAL'));
      const st={k:r.k, s:r.s, ep:'', team:r.team||'', lens:'', pa:NCS, rg:'', bv:'', im:[], sf:done?'Shipped':'In Progress', mo, q:qOf(mo), v:0,
        link:jira(r.k), cf:'', pds, tags:[], internal:!pds.length, cd:r.cr, rd:done?String(r.scd||'').slice(0,10)||null:null, js:r.st, cyc:null,
        mb:done?'resolved':'created', nw:true, live:true};
      stories.push(st);
      pds.forEach(pd=>{ const c=byId[pd]; if(c&&!c.storyKeys.includes(r.k)) c.storyKeys.push(r.k); });
    });
    D.stories=stories;
  }
  if(typeof rfApply==='function') rfApply();
  Object.keys(storyByKey).forEach(k=>delete storyByKey[k]);
  D.stories.forEach(s=>{ storyByKey[s.k]=s; });
}

async function syncBoot(){
  SYNC.db=await useCap('db');
  if(!SYNC.db){ syncPaint(); return; }
  SYNC.db.doc('sync/state').onSnapshot(s=>{ SYNC.state=s.exists?s.data():null; syncPaint(); renderOverviewChanges(); },
    e=>{ SYNC.err={code:(e&&e.code)||'unavailable', where:'db'}; syncPaint(); });
  SYNC.db.collection('jira').onSnapshot(s=>{
    const recs={}; SYNC.buckets={};
    s.docs.forEach(d=>{ SYNC.buckets[d.id]=true; const r=(d.data()||{}).r||{}; Object.keys(r).forEach(k=>{ if(r[k]&&typeof r[k]==='object'){ r[k].s=unent(r[k].s); r[k].st=unent(r[k].st); recs[k]=r[k]; } }); });
    const changed=JSON.stringify(Object.keys(recs).sort().map(k=>[k,recs[k].up,recs[k].st]))!==JSON.stringify(Object.keys(SYNC.recs).sort().map(k=>[k,SYNC.recs[k].up,SYNC.recs[k].st]));
    SYNC.recs=recs; SYNC.ready=true;
    if(changed){ renderAll(); if(C360.pd) paintC360(); }
    syncPaint();
  }, e=>{ SYNC.err={code:(e&&e.code)||'unavailable', where:'db'}; syncPaint(); });
  SYNC.mcp=await useCap('mcp');
  rfBoot();
  syncPaint(); syncMaybe();
  setInterval(syncMaybe, 15*60*1000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) syncMaybe(); });
}
const syncAge=()=>{ const t=SYNC.state&&Date.parse(SYNC.state.lastRun); return t?Date.now()-t:Infinity; };
const syncDue=()=>syncAge()>=SYNC_H*3600e3;
function syncMaybe(){
  if(SYNC.running||SYNC.stop||!GATE.ok||!SYNC.mcp||!SYNC.db||GATE.canWrite===false||!SYNC.ready) return;
  if(syncDue()) runSync(false);
  rfMaybe();
}
function syncCodeText(e){
  const c=e&&e.code;
  return ({
    needs_reauth:'Your Atlassian connection has expired. Reconnect Atlassian in claude.ai Settings → Connectors, then reload.',
    server_not_connected:'Atlassian is not connected to your claude.ai account. Add it in Settings → Connectors so the page can refresh Jira for everyone.',
    selection_required:'You have more than one Atlassian connector. Choose one when claude.ai asks, then reload.',
    not_in_manifest:'Jira access was declined for this page. Allow Atlassian for this artifact to refresh, or let a colleague open it.',
    blocked_by_policy:'Your organisation blocks this Jira search for you. Another viewer can refresh it.',
    approval_required:'Your organisation needs each Jira call approved, which pages cannot ask for yet.',
    server_unavailable:'Jira did not answer in time. The page will try again on its next check.',
    tool_error:'Jira refused the search: '+String((e&&e.message)||'no reason given').slice(0,160),
    invalid_argument:'Your access to this page is view-only, so you cannot store a refresh for others.',
    not_granted:'Connectors are not available in this view of the page.',
    capability_disabled:'Connectors are not available in this view of the page.'
  })[c] || ('The Jira refresh failed ('+(c||'unknown')+'). The page will try again later.');
}
const STOP_CODES=new Set(['needs_reauth','server_not_connected','selection_required','not_in_manifest','blocked_by_policy','approval_required','not_granted','capability_disabled','capability_removed','invalid_argument','bad_request']);
async function runSync(manual){
  if(SYNC.running) return;
  SYNC.running=true; SYNC.err=null; SYNC.note=''; syncPaint();
  const holder=(GATE.uid||'anon')+':'+TAB_ID, lock=SYNC.db.doc('sync/lock');
  try{
    const l=await lock.acquire({holder, ttlMs:240000});
    if(!l.acquired){ SYNC.note='A colleague is refreshing Jira right now; their result appears here when it lands.'; return; }
    const cur=await SYNC.db.doc('sync/state').get(), st=cur.exists?cur.data():null;
    const age=st&&Date.parse(st.lastRun)?Date.now()-Date.parse(st.lastRun):Infinity;
    if(!manual&&age<SYNC_H*3600e3){ SYNC.state=st; return; }
    const started=new Date(), iso=started.toISOString().replace(/\.\d{3}Z$/,'Z');
    // relative hours avoid any time-zone mismatch between the page and the Jira site; one hour of overlap
    const since=isFinite(age)?'"-'+(Math.ceil(age/3600e3)+1)+'h"':'"'+SYNC_BASE+'"';
    const jql='project = EP AND issuetype in (Bug, Story) AND updated >= '+since+' ORDER BY updated ASC';
    const got=[]; let token=null, pages=0;
    do{
      const input={cloudId:JIRA_SITE, jql, fields:JIRA_FIELDS, maxResults:100}; if(token) input.nextPageToken=token;
      const res=await SYNC.mcp.callTool(JIRA_SERVER, JIRA_TOOL, input, {cache:false});
      let p=res&&res.payload; if(typeof p==='string'){ try{ p=JSON.parse(p); }catch(e){ throw {code:'tool_error', message:'Jira answered in a format this page does not read.'}; } }
      const iss=p&&p.issues; let nodes=[];
      if(Array.isArray(iss)){ nodes=iss; token=p.isLast===false||p.nextPageToken?p.nextPageToken||null:null; }
      else if(iss&&Array.isArray(iss.nodes)){ nodes=iss.nodes; token=iss.pageInfo&&iss.pageInfo.hasNextPage?iss.pageInfo.endCursor:null; }
      else throw {code:'tool_error', message:'Jira returned no issue list.'};
      nodes.forEach(n=>got.push(n)); pages++;
      if(pages%4===0) await lock.acquire({holder, ttlMs:240000});
    }while(token&&pages<40);
    const vals=v=>Array.isArray(v)?v.map(x=>x&&typeof x==='object'?(x.value||x.name||''):String(x||'')).filter(Boolean)
      :(v&&typeof v==='object'?[v.value||v.name].filter(Boolean):(v?[String(v)]:[]));
    const recs={}, cnt={bugsNew:0,bugsClosed:0,storiesShipped:0,storiesNew:0};
    got.forEach(n=>{
      const f=n.fields||{}, stt=f.status||{}, sc=(stt.statusCategory||{}).key||'', stn=stt.name||'';
      const t=((f.issuetype||{}).name||'')==='Bug'?'B':'S';
      const r={k:n.key, t, s:unent(f.summary).slice(0,240), st:unent(stn), sc, p:(f.priority||{}).name||'', cr:String(f.created||'').slice(0,10),
        up:String(f.updated||'').slice(0,16), scd:String(f.statuscategorychangedate||'').slice(0,10), rb:vals(f.customfield_10145), ac:vals(f.customfield_12190),
        team:(f.customfield_10001&&(f.customfield_10001.name||f.customfield_10001.title))||'', at:iso};
      const rej=/reject|cancel|won.?t|duplicate|invalid/i.test(stn), prev=SYNC.recs[r.k];
      if(t==='B'){
        r.gone=sc==='done'||rej;
        const client=r.rb.some(x=>x!=='INTERNAL')||r.ac.length>0;
        if(!BASE_BUG.has(r.k)&&!prev&&(!client||r.gone)) return;
        if(r.gone&&(BASE_BUG.has(r.k)||(prev&&!prev.gone))) cnt.bugsClosed++;
        if(!r.gone&&!BASE_BUG.has(r.k)&&!prev) cnt.bugsNew++;
      } else {
        r.rej=rej;
        if(!BASE_STORY.has(r.k)&&!prev&&(r.cr<'2026-01-01'||sc==='new'||!sc||rej)) return;
        const wasShipped=prev?prev.sc==='done':BASE_STORY.has(r.k)&&(storyByKey[r.k]||{}).sf==='Shipped';
        if(sc==='done'&&!wasShipped) cnt.storiesShipped++;
        if(!BASE_STORY.has(r.k)&&!prev) cnt.storiesNew++;
      }
      recs[r.k]=r;
    });
    const byB={}; Object.values(recs).forEach(r=>{ (byB[bucketOf(r.k)]=byB[bucketOf(r.k)]||{})[r.k]=r; });
    for(const b of Object.keys(byB).sort()){
      const ref=SYNC.db.doc('jira/'+b);
      let exists=!!SYNC.buckets[b]; if(!exists){ const g=await ref.get(); exists=g.exists; }
      if(exists) await ref.update({r:byB[b], at:iso}); else await ref.set({r:byB[b], at:iso});
      SYNC.buckets[b]=true;
    }
    const run=Object.assign({at:iso, by:GATE.uid, seen:got.length, kept:Object.keys(recs).length, since:since.replace(/"/g,''), manual:!!manual}, cnt);
    const runs=((st&&Array.isArray(st.runs))?st.runs:[]).concat([run]).slice(-30);
    await SYNC.db.doc('sync/state').set({lastRun:iso, lastBy:GATE.uid, baseline:SYNC_BASE, site:JIRA_SITE, everyHours:SYNC_H, runs});
    try{ if(window.ppJiraRefresh) await window.ppJiraRefresh(SYNC.mcp); }catch(e){}
    if(manual) uiToast('Jira refreshed: '+syncRunText(run)+'.');
  }catch(e){
    SYNC.err={code:(e&&e.code)||'upstream_error', message:(e&&e.message)||''};
    if(STOP_CODES.has(SYNC.err.code)) SYNC.stop=true;
    if(manual) uiToast(syncCodeText(SYNC.err),{bad:true,ms:9000});
  }finally{
    SYNC.running=false; syncPaint();
  }
}
function syncRunText(r){
  const bits=[r.bugsNew?r.bugsNew+' new client bug'+(r.bugsNew===1?'':'s'):'', r.bugsClosed?r.bugsClosed+' closed':'',
    r.storiesShipped?r.storiesShipped+' stor'+(r.storiesShipped===1?'y':'ies')+' shipped':'', r.storiesNew?r.storiesNew+' new stor'+(r.storiesNew===1?'y':'ies'):''].filter(Boolean);
  return bits.length?bits.join(', '):(r.kept?r.kept+' tickets checked, nothing moved on the client side':'nothing changed');
}
function agoText(ms){
  if(!isFinite(ms)) return '';
  const m=Math.round(ms/60000); if(m<1) return 'just now'; if(m<60) return m+' min ago';
  const h=Math.round(m/60); if(h<48) return h+' h ago'; return Math.round(h/24)+' days ago';
}
function syncPaint(){
  const pill=document.getElementById('sync-pill'), tx=document.getElementById('sync-text'); if(!pill) return;
  let cls='', t='';
  const age=syncAge();
  if(SYNC.running){ cls='run'; t='Refreshing from Jira…'; }
  else if(isFinite(age)){
    const next=new Date(Date.parse(SYNC.state.lastRun)+SYNC_H*3600e3);
    cls=age>(SYNC_H+1)*3600e3?'stale':'ok';
    t='Jira refreshed '+agoText(age)+(cls==='ok'?' · next by '+next.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):' · due now');
  } else t='Jira: data as built on '+fmtDate(SYNC_BASE)+' · first live refresh pending';
  if(SYNC.err&&!SYNC.running){ cls='err'; t+=' · refresh failed'; }
  pill.className='syncpill '+cls; tx.textContent=t;
  pill.title=SYNC.err?syncCodeText(SYNC.err):'Bug and story changes are pulled from Jira at least every '+SYNC_H+' hours. Click for details.';
}
async function openSyncInfo(){
  const st=SYNC.state, runs=(st&&st.runs||[]).slice().reverse();
  let names={};
  if(GATE.user&&GATE.user.profiles){ const ids=[...new Set(runs.map(r=>r.by).filter(Boolean))]; if(ids.length) try{ names=await GATE.user.profiles(ids); }catch(e){} }
  const nm=id=>id&&id===GATE.uid?'you':((names[id]&&names[id].name)||'a colleague');
  const age=syncAge();
  const canRun=GATE.ok&&SYNC.mcp&&SYNC.db&&!SYNC.running&&GATE.canWrite!==false&&age>SYNC_MIN_MANUAL_MIN*60000;
  const why=!GATE.ok?'Sign in to refresh.':!SYNC.mcp?'Connectors are not available in this view.':GATE.canWrite===false?'Your access is view-only.':
    age<=SYNC_MIN_MANUAL_MIN*60000?'Refreshed less than '+SYNC_MIN_MANUAL_MIN+' minutes ago.':'';
  const body=`<div class="sy-now ${SYNC.err?'err':''}">
      <p><b>${isFinite(age)?'Last refresh '+esc(agoText(age))+(st.lastBy?' by '+esc(nm(st.lastBy)):''):'No live refresh has run yet.'}</b>
      ${isFinite(age)?' Next one is due '+esc(new Date(Date.parse(st.lastRun)+SYNC_H*3600e3).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'}))+'.':''}</p>
      ${SYNC.err?`<p class="sy-err">${esc(syncCodeText(SYNC.err))}</p>`:''}
      ${SYNC.note?`<p>${esc(SYNC.note)}</p>`:''}
    </div>
    <div class="seclabel">How it stays current</div>
    <ol class="steps">
      <li>When anyone signed in opens this page and the last refresh is ${SYNC_H} hours old or more, the page asks Jira for EP bugs and stories updated since then, using that person's Atlassian connector. While the page stays open it checks again every 15 minutes.</li>
      <li>The result is stored in this artifact's shared database, so everyone sees it at once, including people without the connector. Only one person refreshes at a time.</li>
      <li>Closed or rejected bugs leave every count; new bugs with a client in Reported by or Affected clients join that client; stories that reach Done move to Shipped in the month they finished. New stories keep Jira's own summary until the next rebuild analyses them.</li>
      <li>Planhat health scores, incidents and event dates are not in this refresh; they change when the page is rebuilt.</li>
    </ol>
    <div class="seclabel">Recent refreshes<span class="c">${runs.length}</span></div>
    ${runs.length?`<div class="sy-runs">${runs.slice(0,12).map(r=>`<div class="sy-run"><span class="w">${esc(new Date(r.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</span><span>${esc(syncRunText(r))}</span><span class="b">${esc(nm(r.by))}${r.manual?' · by hand':''}</span></div>`).join('')}</div>`:'<div class="empty" style="padding:12px">None yet.</div>'}`;
  openInfoModal('Live Jira refresh','<span>Every '+SYNC_H+' hours at most · Atlassian connector · shared with every viewer</span>',body,
    `<button type="button" class="ibtn primary" id="sy-run" ${canRun?'':'disabled'}>Refresh now</button><span>${esc(why)}</span>`);
  const b=document.getElementById('sy-run'); if(b) b.onclick=async()=>{ b.disabled=true; await runSync(true); closeModal(); };
}
document.getElementById('sync-pill').addEventListener('click',openSyncInfo);

// ================= Overview: the story, soonest risk first =================
let ovWin=60;
document.getElementById('ov-win').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; ovWin=+b.dataset.v;
  document.querySelectorAll('#ov-win button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); renderOverview(); });
function sevBar(cnt){
  const tot=PRI.reduce((a,p)=>a+(cnt[p]||0),0); if(!tot) return '<span class="ov-clear">Nothing open</span>';
  return `<span class="ov-sev">${PRI.filter(p=>cnt[p]).map(p=>`<span class="pr ${p}">${cnt[p]} ${p}</span>`).join('')}</span>`;
}
function openPipeFor(pd){ return PIPE.filter(r=>String((r.v||{}).driver||'')===String(pd)&&!pipeDone(r)); }
function pipeFlagsOf(r){ try{ return typeof ppFlags==='function'?ppFlags(r):(r.flags||{}); }catch(e){ return r.flags||{}; } }
function renderOverview(){
  const host=document.getElementById('ov-radar'); if(!host) return;
  const aggs=D.companies.filter(c=>myOk(c.pd)).map(agg);
  const soon=aggs.filter(a=>a.c.nextEvent&&(a.c.nextEvent.now||a.c.nextEvent.in<=ovWin))
    .sort((x,y)=>(x.c.nextEvent.now?-1:x.c.nextEvent.in)-(y.c.nextEvent.now?-1:y.c.nextEvent.in)||(x.c.tier||9)-(y.c.tier||9));
  const risky=soon.filter(a=>a.exp.lv);
  const openInc=D.incidents.filter(i=>i.st!=='Done'&&i.st!=='Cancelled');
  const prom=PIPE.filter(r=>!pipeDone(r)).map(r=>({r,f:pipeFlagsOf(r)})).filter(x=>x.f.brokenPromise||x.f.overdue||x.f.drift);
  const urgent=D.bugs.filter(b=>b.p==='Urgent').length, high=D.bugs.filter(b=>b.p==='High').length;
  const newB=D.bugs.filter(b=>b.nw).length;
  document.getElementById('ov-strip').innerHTML=[
    {n:risky.length+' of '+soon.length, l:'Shows in the next '+ovWin+' days that need action', d:risky.length?risky.slice(0,3).map(a=>shortName(a.c.name)).join(', ')+(risky.length>3?' +'+(risky.length-3):''):'every upcoming show is clear', go:'ov-radar', warn:risky.length},
    {n:D.bugs.length, l:'Open client bugs', d:urgent+' Urgent · '+high+' High'+(newB?' · '+newB+' new since the build':''), tab:'bugs', warn:urgent},
    {n:prom.length, l:'Promises at risk', d:prom.length?prom.filter(x=>x.f.brokenPromise).length+' after the show · '+prom.filter(x=>x.f.overdue).length+' overdue':'nothing overdue or after a show', tab:'pipeline', warn:prom.length},
    {n:openInc.length, l:'Open incidents', d:openInc.slice(0,2).map(i=>i.key+' '+shortName((byId[i.ids[0]]||{}).name||'')).join(', ')||'none open', tab:'incidents', warn:openInc.length}
  ].map(x=>`<button class="ov-stat${x.warn?' warn':''}" type="button" ${x.tab?`data-tab="${x.tab}"`:`data-go="${x.go}"`}><span class="n">${esc(x.n)}</span><span class="l">${esc(x.l)}</span><span class="d">${esc(x.d)}</span></button>`).join('');
  host.innerHTML=soon.length?`<div class="rd-list">${soon.map(a=>{
    const c=a.c, n=c.nextEvent, dt=new Date(n.s+'T00:00:00Z'), lv=a.exp.lv, pipe=openPipeFor(c.pd);
    const broken=pipe.filter(r=>pipeFlagsOf(r).brokenPromise).length, late=pipe.filter(r=>pipeFlagsOf(r).overdue).length;
    const incOpen=a.inc.filter(i=>i.st!=='Done'&&i.st!=='Cancelled').length;
    const quiet=!a.all.length&&!incOpen&&!pipe.length, st=lv||(quiet?'clear':'open');
    return `<button class="rd ${st}" type="button" data-c360="${esc(c.pd)}">
      <span class="rd-date"><b>${dt.getUTCDate()}</b>${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]}</span>
      <span class="rd-main">
        <span class="rd-nm">${esc(shortName(c.name))} ${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">T${c.tier}</span>`:''}</span>
        <span class="rd-ev">${esc(n.n)}</span>
        <span class="rd-open">${sevBar(a.cnt)}${incOpen?`<span class="rd-tag inc">${incOpen} incident open</span>`:''}${broken?`<span class="rd-tag over">${broken} request${broken===1?'':'s'} after the show</span>`:''}${late?`<span class="rd-tag over">${late} overdue</span>`:''}${pipe.length&&!broken&&!late?`<span class="rd-tag">${pipe.length} request${pipe.length===1?'':'s'} in flight</span>`:''}</span>
        ${lv?`<span class="rd-why">${esc(a.exp.flags[0].t)}${a.exp.flags.length>1?' · +'+(a.exp.flags.length-1)+' more':''}</span>`:''}
      </span>
      <span class="rd-cd"><b>${n.now?'Now':n.in}</b>${n.now?'running':n.in===1?'day':'days'}<i class="rd-lv">${lv==='red'?'Act now':lv==='amber'?'Watch':quiet?'Clear':'No flag'}</i></span>
    </button>`;}).join('')}</div>`
    :`<div class="empty">No dated show in the next ${ovWin} days.</div>`;
  renderOvCal(); renderOvTeam(aggs); renderOvAge(); renderOvRecent();
  renderOverviewChanges();
  tabBadges({overview:[risky.length,'warn','shows that need action'], pipeline:[PIPE_READY?PIPE.filter(r=>!pipeDone(r)).length:null,'','open requests'],
    bugs:[D.bugs.length,urgent?'warn':'','open client bugs'], incidents:[openInc.length,openInc.length?'warn':'','open incidents']});
}
// a count on the tab says what is waiting behind it, before anyone clicks
function tabBadges(map){
  Object.keys(map).forEach(k=>{
    const t=document.querySelector('.tab[data-tab="'+k+'"]'); if(!t) return;
    let b=t.querySelector('.tbadge'); const [n,cls,lbl]=map[k];
    if(n==null){ if(b) b.remove(); return; }
    if(!b){ b=document.createElement('span'); t.appendChild(b); }
    b.className='tbadge'+(cls&&n?' '+cls:''); b.textContent=n; b.setAttribute('aria-label',n+' '+lbl);
  });
}
function renderOverviewChanges(){
  const el=document.getElementById('ov-chg'); if(!el) return;
  const rs=Object.values(SYNC.recs).filter(r=>{
    if(r.t==='B') return BASE_BUG.has(r.k)?true:(!r.gone&&(D.bugs.some(b=>b.key===r.k)));
    return BASE_STORY.has(r.k)?r.sc==='done'&&(BASE.stories.find(s=>s.k===r.k)||{}).sf!=='Shipped':!!storyByKey[r.k];
  }).sort((a,b)=>String(b.up).localeCompare(String(a.up))).slice(0,10);
  const note=document.getElementById('ov-chg-note');
  if(note) note.textContent=isFinite(syncAge())?'Client bugs and stories that moved in Jira since the page was built on '+fmtDate(SYNC_BASE)+'.':'Once the first live refresh runs, client bugs and stories that moved in Jira show here.';
  el.innerHTML=rs.length?`<div class="chg-list">${rs.map(r=>{
    const b=r.t==='B', what=b?(r.gone?'closed':BASE_BUG.has(r.k)?'updated':'new bug'):(BASE_STORY.has(r.k)?'shipped':'new story');
    const pds=b?((D.bugs.find(x=>x.key===r.k)||BASE.bugs.find(x=>x.key===r.k)||{}).repIds||[]):((storyByKey[r.k]||{}).pds||[]);
    return `<div class="chg"><a href="${jira(r.k)}" target="_blank" rel="noopener">${esc(r.k)}</a><span class="chg-w ${what.replace(' ','-')}">${esc(what)}</span>
      <span class="chg-s">${esc(r.s)}</span><span class="chg-m">${pds.map(pd=>esc(shortName((byId[pd]||{}).name||pd))).join(', ')||(b?'':'platform')}${pds.length||!b?' · ':''}${esc(r.st)}</span></div>`}).join('')}</div>`
    :`<div class="empty" style="padding:12px">${isFinite(syncAge())?'Nothing client-facing has moved since the build.':'No refresh yet.'}</div>`;
}
document.getElementById('panel-overview').addEventListener('click',e=>{
  let b;
  if((b=e.target.closest('[data-c360]'))){ openC360(b.dataset.c360); return; }
  if((b=e.target.closest('[data-ppopen]'))){ showTab('pipeline'); if(typeof ppOpenEditor==='function') ppOpenEditor(b.dataset.ppopen); return; }
  if((b=e.target.closest('.ov-stat'))){ if(b.dataset.tab) showTab(b.dataset.tab); else { const t=document.getElementById(b.dataset.go); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); } }
});


// ----- Overview panels (26 Sep 2026): the next 8 weeks, team pressure, oldest Urgent and High, how recent shows went
const ovDay=d=>new Date(d+'T00:00:00Z');
const ovISO=d=>d.toISOString().slice(0,10);
const ovAdd=(s,n)=>{const d=ovDay(s);d.setUTCDate(d.getUTCDate()+n);return ovISO(d);};
const ovShort=s=>{const d=ovDay(s);return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];};
// the risk a show carries: the client's own risk when this is their next show, otherwise read from what is open for them
function showRisk(e){
  const c=byId[e.pd]; if(!c) return {st:'open',t:'No client'};
  const r=tlRisk(c);
  if(c.nextEvent&&c.nextEvent.k===e.k) return r;
  const u=r.a.cnt.Urgent, h=r.a.cnt.High;
  return u?{st:'amber',t:'Watch',a:r.a}:(h||r.a.all.length)?{st:'open',t:'No flag',a:r.a}:{st:'clear',t:'Clear',a:r.a};
}
const RANK={red:0,amber:1,open:2,clear:3};
function ovCalWeeks(){
  const t=ovDay(TODAY_S), dow=(t.getUTCDay()+6)%7, mon=ovAdd(TODAY_S,-dow);
  return Array.from({length:8},(_,i)=>{const a=ovAdd(mon,i*7), b=ovAdd(a,6);
    const shows=EVENTS.filter(e=>isShow(e)&&e.st!=='Cancelled'&&e.pd&&byId[e.pd]&&e.s&&e.s>=a&&e.s<=b).sort((x,y)=>x.s.localeCompare(y.s)).map(e=>({e,r:showRisk(e)}));
    const worst=shows.reduce((w,x)=>RANK[x.r.st]<RANK[w]?x.r.st:w,'clear');
    return {a,b,i,shows,worst:shows.length?worst:'none'};});
}
function renderOvCal(){
  const el=document.getElementById('ov-cal'); if(!el) return;
  const W=ovCalWeeks(), max=Math.max(1,...W.map(w=>w.shows.length));
  el.innerHTML=`<div class="cal">${W.map(w=>`<button type="button" class="cal-w ${w.worst}${w.i===0?' this':''}" data-calw="${w.i}" ${w.shows.length?'':'disabled'}>
      <span class="cal-d">${w.i===0?'This week':'w/c '+ovShort(w.a)}</span>
      <span class="cal-n">${w.shows.length}<small>${w.shows.length===1?'show':'shows'}</small></span>
      <span class="cal-bar"><i style="width:${w.shows.length/max*100}%"></i></span>
      <span class="cal-who">${w.shows.slice(0,3).map(x=>esc(shortName(byId[x.e.pd].name))).join(', ')}${w.shows.length>3?' +'+(w.shows.length-3):''}</span>
      ${w.shows.length?`<span class="rchip ${w.worst}">${w.worst==='red'?'Act now':w.worst==='amber'?'Watch':w.worst==='open'?'No flag':'Clear'}</span>`:''}
    </button>`).join('')}</div>`;
  el.onclick=e=>{const b=e.target.closest('[data-calw]'); if(!b) return; const w=W[+b.dataset.calw];
    openInfoModal((w.i===0?'This week':'Week of '+ovShort(w.a))+' · '+w.shows.length+' show'+(w.shows.length===1?'':'s'),`<span>${esc(fmtDate(w.a))} to ${esc(fmtDate(w.b))}</span>`,
      `<div class="dlist">${w.shows.map(({e,r})=>{const c=byId[e.pd], a=r.a||agg(c);
        return `<button type="button" class="rd ${r.st}" data-c360="${esc(e.pd)}"><span class="rd-date"><b>${ovDay(e.s).getUTCDate()}</b>${ovShort(e.s).split(' ')[1]}</span>
          <span class="rd-main"><span class="rd-nm">${esc(shortName(c.name))} ${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">T${c.tier}</span>`:''}</span><span class="rd-ev">${esc(e.n)} · ${esc(evDates(e))}</span><span class="rd-open">${sevBar(a.cnt)}</span></span>
          <span class="rd-cd"><i class="rd-lv">${esc(r.t)}</i></span></button>`}).join('')}</div>`);};
}
function renderOvTeam(aggs){
  const el=document.getElementById('ov-team'); if(!el) return;
  const soon=aggs.filter(a=>a.c.nextEvent&&(a.c.nextEvent.now||a.c.nextEvent.in<=60));
  const T={}, seen={};
  soon.forEach(a=>a.all.filter(b=>b.p==='Urgent'||b.p==='High').forEach(b=>{
    const k=b.team||'No team'; T[k]=T[k]||{Urgent:0,High:0,bugs:[]};
    const id=k+'|'+b.key; if(!seen[id]){ seen[id]=1; T[k][b.p]++; }
    T[k].bugs.push({b,c:a.c});
  }));
  const rows=Object.keys(T).map(k=>({k,u:T[k].Urgent,h:T[k].High,n:T[k].Urgent+T[k].High,bugs:T[k].bugs})).sort((x,y)=>y.u-x.u||y.n-x.n);
  if(!rows.length){ el.innerHTML='<div class="empty" style="padding:12px">No Urgent or High bug is open for a client with a show in the next 60 days.</div>'; return; }
  const max=Math.max(...rows.map(r=>r.n));
  el.innerHTML=`<div class="tp">${rows.map((r,i)=>`<button type="button" class="tp-row" data-tp="${i}"><span class="tp-k">${esc(r.k)}</span>
    <span class="tp-bar"><i class="u" style="width:${r.u/max*100}%"></i><i class="h" style="width:${r.h/max*100}%"></i></span>
    <span class="tp-n">${r.u?`<b class="tv-b Urgent">${r.u}</b>`:''}${r.h?`<b class="tv-b High">${r.h}</b>`:''}</span></button>`).join('')}</div>
    <div class="tp-foot">${soon.length} client${soon.length===1?'':'s'} with a show in 60 days · a bug open for two such clients counts once per team</div>`;
  el.onclick=e=>{const b=e.target.closest('[data-tp]'); if(!b) return; const r=rows[+b.dataset.tp];
    const list=r.bugs.slice().sort((x,y)=>SEV[y.b.p]-SEV[x.b.p]||(x.c.nextEvent.now?0:x.c.nextEvent.in)-(y.c.nextEvent.now?0:y.c.nextEvent.in));
    openInfoModal(r.k+' · '+r.n+' Urgent and High before a show','<span>'+r.u+' Urgent · '+r.h+' High · clients with a show in 60 days</span>',
      `<div class="dlist">${list.map(({b,c})=>`<div class="bug"><div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div>
        <div class="s">${esc(b.s)}<div class="m"><button type="button" class="linkbtn" data-c360="${esc(c.pd)}">${esc(shortName(c.name))}</button> · show ${c.nextEvent.now?'running now':'in '+c.nextEvent.in+'d'}: ${esc(c.nextEvent.n)}</div></div>
        <div class="st">${esc(b.st)}<div class="m">${days(b.cr)}d old</div></div></div>`).join('')}</div>`);};
}
function renderOvAge(){
  const el=document.getElementById('ov-age'); if(!el) return;
  const list=D.bugs.filter(b=>b.p==='Urgent'||b.p==='High').sort((x,y)=>(days(y.cr)||0)-(days(x.cr)||0)).slice(0,8);
  if(!list.length){ el.innerHTML='<div class="empty" style="padding:12px">No Urgent or High client bug is open.</div>'; return; }
  const maxD=Math.max(...list.map(b=>days(b.cr)||0));
  el.innerHTML=`<div class="ag">${list.map(b=>{const ids=[...new Set(b.repIds.concat(b.affIds))], c=byId[ids[0]], n=c&&c.nextEvent;
    return `<div class="ag-row"><span class="ag-age"><b>${days(b.cr)}</b>days</span>
      <span class="ag-main"><span class="ag-t"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a> <span class="pr ${b.p}">${b.p}</span> ${esc(b.s)}</span>
        <span class="ag-m">${c?`<button type="button" class="linkbtn" data-c360="${esc(c.pd)}">${esc(shortName(c.name))}</button>`:'no client'}${ids.length>1?' +'+(ids.length-1):''} · ${esc(b.team||'no team')}${n?` · <span class="nev${n.now?' now':n.in<=30?' soon':''}">show ${n.now?'now':n.in+'d'}</span>`:''}</span>
        <span class="ag-bar"><i style="width:${(days(b.cr)||0)/maxD*100}%"></i></span></span></div>`}).join('')}</div>`;
}
function renderOvRecent(){
  const el=document.getElementById('ov-rec'); if(!el) return;
  const from=ovAdd(TODAY_S,-30);
  const shows=EVENTS.filter(e=>isShow(e)&&e.st!=='Cancelled'&&e.pd&&byId[e.pd]&&(e.e||e.s)>=from&&(e.e||e.s)<TODAY_S).sort((x,y)=>(y.e||y.s).localeCompare(x.e||x.s));
  if(!shows.length){ el.innerHTML='<div class="empty" style="padding:12px">No show ended in the last 30 days.</div>'; return; }
  const rows=shows.map(e=>{
    const end=e.e||e.s, iA=ovAdd(e.s,-7), iB=ovAdd(end,7), bA=ovAdd(e.s,-14);
    const inc=D.incidents.filter(i=>i.ids.includes(e.pd)&&i.cr>=iA&&i.cr<=iB);
    const bugs=D.bugs.filter(b=>(b.repIds.includes(e.pd)||b.affIds.includes(e.pd))&&b.cr>=bA&&b.cr<=iB);
    const cnt={Urgent:0,High:0,Medium:0,Low:0}; bugs.forEach(b=>cnt[b.p]++);
    return {e,inc,bugs,cnt,clean:!inc.length&&!bugs.length};
  });
  const clean=rows.filter(r=>r.clean).length;
  el.innerHTML=`<div class="rc-sum"><b>${rows.length}</b> show${rows.length===1?'':'s'} ended in the last 30 days · <b class="ok">${clean}</b> with nothing still open · <b class="bad">${rows.length-clean}</b> with incidents or open bugs from show week</div>
    <div class="rc">${rows.map(r=>{const c=byId[r.e.pd];
      return `<button type="button" class="rc-row${r.clean?' clean':''}" data-c360="${esc(r.e.pd)}">
        <span class="rc-d">${esc(ovShort(r.e.s))}${r.e.e&&r.e.e!==r.e.s?'–'+esc(ovShort(r.e.e)):''}</span>
        <span class="rc-main"><span class="rc-nm">${esc(shortName(c.name))}</span><span class="rc-ev">${esc(r.e.n)}</span></span>
        <span class="rc-out">${r.inc.length?`<span class="tv-i">${r.inc.length}</span><span class="rc-l">incident${r.inc.length===1?'':'s'}</span>`:''}
          ${r.bugs.length?PRI.filter(p=>r.cnt[p]).map(p=>`<span class="tv-b ${p}">${r.cnt[p]}</span>`).join('')+'<span class="rc-l">still open</span>':''}
          ${r.clean?'<span class="rchip clear">Nothing still open</span>':''}</span></button>`}).join('')}</div>`;
}
document.getElementById('modal-body').addEventListener('click',e=>{ const b=e.target.closest('[data-c360]'); if(!b) return; closeModal(); openC360(b.dataset.c360); });
// ================= Client 360: everything about one client, from anywhere =================
const C360={pd:null, prev:null};
function openC360(pd){
  if(!byId[pd]) return;
  if(modal.hasAttribute('open')) closeModal();
  C360.prev=C360.pd?C360.prev:document.activeElement; C360.pd=pd;
  const el=document.getElementById('c360'); el.hidden=false; document.body.classList.add('noscroll');
  paintC360();
  setTimeout(()=>{ const x=el.querySelector('.x'); if(x) x.focus(); },0);
}
function closeC360(){
  const el=document.getElementById('c360'); if(el.hidden) return;
  el.hidden=true; C360.pd=null; document.body.classList.remove('noscroll');
  try{ if(C360.prev) C360.prev.focus(); }catch(e){} C360.prev=null;
}
function paintC360(){
  const c=byId[C360.pd]; if(!c) return;
  const a=agg(c), e=a.exp, n=c.nextEvent;
  document.getElementById('c360-title').textContent=shortName(c.name);
  document.getElementById('c360-meta').innerHTML=[c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">Tier ${c.tier}</span>`:'<span class="tierpill na">No tier</span>',
    c.health!=null?`<span class="health ${healthCls(c.health)}" title="Planhat health, 0 to 10">${c.health}</span><span>health</span>`:'',
    c.owner?`<span>Owner <b>${esc(c.owner)}</b></span>`:'', c.renewal?`<span>Renewal <b>${esc(c.renewal)}</b></span>`:'', c.customerSince?`<span>Customer since ${esc(c.customerSince)}</span>`:''].filter(Boolean).join('');
  const shows=EVENTS.filter(x=>x.pd===c.pd&&isShow(x)&&x.s&&x.st!=='Cancelled'&&(x.e||x.s)>=TODAY_S).sort((x,y)=>x.s.localeCompare(y.s)).slice(0,5);
  const pipe=a.pipe.slice().sort((x,y)=>String((x.v||{}).month).localeCompare(String((y.v||{}).month)));
  const bugs=a.all.slice().sort((x,y)=>SEV[y.p]-SEV[x.p]||(days(y.cr)||0)-(days(x.cr)||0));
  const before=n?bugs.length:0;
  const bugRow=b=>`<div class="bug${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' aff':''}">
    <div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div>
    <div class="s">${esc(b.s)}${b.nw?' <span class="newtag">New</span>':''}<div class="m">${esc(b.team||'no team')}${b.ev?' · '+esc(b.ev):''}${b.affIds.includes(c.pd)&&!b.repIds.includes(c.pd)?' · affected, reported elsewhere':''}</div></div>
    <div class="st">${esc(b.st)}<div class="m">${days(b.cr)}d old</div></div></div>`;
  const reqRow=r=>{ const v=r.v||{}, f=pipeFlagsOf(r), done=pipeDone(r);
    return `<button class="rq" type="button" data-ppopen="${esc(r.id)}"><span class="rq-t">${esc(v.feature||'Untitled')}</span>
      <span class="rq-m">${esc(fmtMo(v.month))} · ${esc(done?'Done':v.status||'Planned')}${v.key?' · '+esc(v.key):''}</span>
      <span class="rq-f">${f.brokenPromise&&!done?'<span class="pp-tag over">After the show</span>':''}${f.overdue&&!done?'<span class="pp-tag over">Overdue</span>':''}${done?'<span class="pp-tag ship">Shipped</span>':''}</span></button>`; };
  const quiet=!a.all.length&&!a.pipe.filter(r=>!pipeDone(r)).length, verdict=e.lv==='red'?'Act now':e.lv==='amber'?'Watch':quiet?'Clear':'No flag';
  document.getElementById('c360-body').innerHTML=`
    <section class="c3-ready ${e.lv||(quiet?'clear':'open')}">
      <div class="c3-cd">${n?`<b>${n.now?'Now':n.in}</b><span>${n.now?'show running':n.in===1?'day to the show':'days to the show'}</span>`:'<b>—</b><span>no dated show</span>'}</div>
      <div class="c3-rt">
        <div class="c3-v">${verdict}</div>
        <div class="c3-ev">${n?esc(n.n)+' · '+esc(evDates(n)):'No show recorded in Jira OP from today on.'}</div>
        ${e.flags.length?`<ul class="c3-flags">${e.flags.map(f=>`<li class="${f.lv}">${esc(f.t)} <span class="c3-rule">${esc(f.id)}</span></li>`).join('')}</ul>`
          :`<p class="c3-ok">${quiet?'Nothing open for this client.':n?'Work is open, but none of it trips a risk rule yet for this show. Check it before the show gets closer.':'No show to measure against; open work is listed below.'}</p>`}
      </div>
    </section>
    <div class="c3-nums">
      <div><b>${bugs.length}</b><span>open bugs</span></div>
      <div><b>${a.inc.filter(i=>i.st!=='Done'&&i.st!=='Cancelled').length}</b><span>incidents open</span></div>
      <div><b>${pipe.filter(r=>!pipeDone(r)).length}</b><span>requests in flight</span></div>
      <div><b>${a.ship.length}</b><span>stories shipped in ${esc(NOW_S.slice(0,4))}</span></div>
    </div>
    <div class="c3-grid">
      <div>
        <div class="seclabel">Open bugs<span class="c">${bugs.length}${n&&before?' · all open before the show':''}</span></div>
        <div class="dlist">${bugs.length?bugs.map(bugRow).join(''):'<div class="empty" style="padding:12px">Nothing open.</div>'}</div>
        <div class="seclabel">Requests for ${esc(shortName(c.name))}<span class="c">${pipe.length}</span></div>
        <div class="rq-list">${pipe.length?pipe.map(reqRow).join(''):'<div class="empty" style="padding:12px">No request is logged for this client.</div>'}</div>
        <button class="ibtn primary" type="button" data-c3log="${esc(c.pd)}" ${GATE.ok&&GATE.canWrite!==false?'':'disabled'}>+ Log a work item for ${esc(shortName(c.name))}</button>
        ${GATE.ok?'':'<span class="c3-hint">Sign in to log a request.</span>'}
        <div class="seclabel">Delivered and in progress<span class="c">${a.st.length}</span></div>
        <div class="dlist">${a.st.length?a.st.slice().sort((x,y)=>(y.sf==='Shipped')-(x.sf==='Shipped')||String(y.mo).localeCompare(String(x.mo))).map(s=>storyFull(s)).join('')
          :'<div class="empty" style="padding:12px">No story carries this client’s label. They still received the platform work, which is named to nobody.</div>'}</div>
      </div>
      <div>
        <div class="seclabel">What they're asking for<span class="c">demand map</span></div><div id="c3-demand"><div class="small">Loading…</div></div>
        <div class="seclabel">Upcoming shows<span class="c">${shows.length}</span></div>
        <div class="dlist">${shows.length?shows.map(x=>{const w=evWhen(x);return `<div class="evrow ${w.cls}"><div class="k"><a href="${jira(x.k)}" target="_blank" rel="noopener">${esc(x.k)}</a></div><div class="s">${esc(x.n)}<div class="m">${esc(evDates(x))}</div></div><div class="st">${esc(w.t)}</div></div>`}).join(''):'<div class="empty" style="padding:12px">None recorded.</div>'}</div>
        ${a.inc.length?`<div class="seclabel">Incidents, last 180 days<span class="c">${a.inc.length}</span></div><div class="dlist">${a.inc.map(i=>`<div class="bug"><div class="k"><a href="${jira(i.key)}" target="_blank" rel="noopener">${esc(i.key)}</a><br><span class="pr ${i.p}">${i.p}</span></div><div class="s">${esc(i.s)}<div class="m">${esc(i.ev||'')}</div></div><div class="st">${esc(i.st)}<div class="m">${fmtDate(i.cr)}</div></div></div>`).join('')}</div>`:''}
        <div class="seclabel">Health factors</div>
        ${c.incScore==null?'<p class="c3-hint">Not computed: the company is not Phase = Active in Planhat.</p>':`<dl class="kv">
          <dt>Planhat health</dt><dd>${c.health==null?'—':c.health} of 10${c.sentiment!=null?' · sentiment '+c.sentiment:''}</dd>
          <dt>Quality penalty</dt><dd><b>-${a.pen.toFixed(1)}</b> of -${LV('cap-total')}</dd>
          <dt>Liability</dt><dd>${fmt1(a.liab)}</dd>
          <dt>Last touch</dt><dd>${esc(c.lastTouch||'—')}</dd></dl>`}
        <button class="ibtn" type="button" data-c3table="${esc(c.pd)}" style="margin-top:12px">Show in the Clients table</button>
      </div>
    </div>`;
  c3Demand(C360.pd);
}
function c3Demand(pd){ const el=document.getElementById('c3-demand'); if(!el||!window.DMC) return; window.DMC.load().then(()=>{ const x=document.getElementById('c3-demand'); if(x&&C360.pd===pd) x.innerHTML=window.DMC.client(pd); }).catch(()=>{ const x=document.getElementById('c3-demand'); if(x) x.innerHTML='<div class="small">The demand map could not load.</div>'; }); }
document.getElementById('c360').addEventListener('click',e=>{
  let b;
  if(e.target.closest('[data-c360close]')){ closeC360(); return; }
  if((b=e.target.closest('[data-ppopen]'))){ closeC360(); showTab('pipeline'); if(typeof ppOpenEditor==='function') ppOpenEditor(b.dataset.ppopen); return; }
  if((b=e.target.closest('[data-c3log]'))){ const pd=b.dataset.c3log; closeC360(); showTab('pipeline');
    if(typeof window.feOpenForm==='function') window.feOpenForm({client:pd}); return; }
  if((b=e.target.closest('[data-c3table]'))){ const pd=b.dataset.c3table; closeC360(); openPd=null; openClient(pd); }
});
document.addEventListener('click',e=>{ const b=e.target.closest('.c360-open'); if(b){ e.stopPropagation(); openC360(b.dataset.c360); } },true);

// ================= Find a client: press / from anywhere =================
const FIND={sel:0, list:[]};
function openFind(){
  const f=document.getElementById('find'); if(!f.hidden) return;
  f.hidden=false; const q=document.getElementById('find-q'); q.value=''; FIND.sel=0; paintFind(); q.focus();
}
function closeFind(){ document.getElementById('find').hidden=true; }
function paintFind(){
  const q=normL(document.getElementById('find-q').value);
  const rank=c=>{ const a=agg(c); return (a.exp.lv==='red'?0:a.exp.lv==='amber'?1:2)*1000+(c.nextEvent?Math.min(c.nextEvent.in,999):999); };
  FIND.list=D.companies.filter(c=>!q||normL(c.name).includes(q)||normL(shortName(c.name)).includes(q)||normL(c.owner).includes(q)||(c.deliveryTags||[]).some(t=>normL(t).includes(q)))
    .map(c=>({c,r:rank(c)})).sort((x,y)=>x.r-y.r||shortName(x.c.name).localeCompare(shortName(y.c.name))).slice(0,12).map(x=>x.c);
  if(FIND.sel>=FIND.list.length) FIND.sel=Math.max(0,FIND.list.length-1);
  document.getElementById('find-list').innerHTML=FIND.list.length?FIND.list.map((c,i)=>{ const a=agg(c), n=c.nextEvent;
    return `<button type="button" class="find-row${i===FIND.sel?' sel':''} ${a.exp.lv}" role="option" aria-selected="${i===FIND.sel}" data-find="${esc(c.pd)}">
      <span class="fr-n">${esc(shortName(c.name))}${c.tier?` <span class="tierpill t${c.tier<=2?c.tier:''}">T${c.tier}</span>`:''}</span>
      <span class="fr-m">${esc(c.owner||'')}${n?' · show '+(n.now?'running now':'in '+n.in+'d'):''} · ${a.all.length} open bug${a.all.length===1?'':'s'}</span>
      <span class="fr-lv">${a.exp.lv==='red'?'Act now':a.exp.lv==='amber'?'Watch':''}</span></button>`; }).join('')
    :'<div class="empty">No client matches.</div>';
}
document.getElementById('find-open').addEventListener('click',openFind);
document.getElementById('find-q').addEventListener('input',()=>{ FIND.sel=0; paintFind(); });
document.getElementById('find').addEventListener('click',e=>{
  if(e.target.closest('[data-findclose]')){ closeFind(); return; }
  const b=e.target.closest('[data-find]'); if(b){ closeFind(); openC360(b.dataset.find); }
});
document.getElementById('find-q').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); FIND.sel=Math.max(0,Math.min(FIND.list.length-1,FIND.sel+(e.key==='ArrowDown'?1:-1))); paintFind(); }
  else if(e.key==='Enter'){ e.preventDefault(); const c=FIND.list[FIND.sel]; if(c){ closeFind(); openC360(c.pd); } }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if(!document.getElementById('find').hidden){ e.preventDefault(); closeFind(); return; }
    if(!document.getElementById('c360').hidden&&!document.querySelector('.modal[open]')){ e.preventDefault(); closeC360(); return; } }
  if(!GATE.done) return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||'')||(e.target&&e.target.isContentEditable);
  if((e.key==='/'&&!typing)||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){ e.preventDefault(); openFind(); }
});

// ----- the bridge between this ledger and the pipeline code below it (the CL bridge)
// read-only views of the stores kept inside this block, for Sync & logs → History
window.EP_LOGS={sync:()=>SYNC.state, rf:()=>({docs:RF.docs, reqs:RF.reqs, visits:RF.visits}), logic:()=>(LOGIC&&LOGIC.log)||[]};
window.CL={
  LV:id=>LV(id), esc, shortName, fmtDate, fmtMo, days, asOf:D.asOf, eventsAsOf:TODAY_S,
  company:pd=>byId[pd]||null,
  activeClients:()=>D.companies.filter(c=>c.inPlanhatActive!==false),
  teams:()=>(D.teams||[]).map(t=>t.key),
  nextShow:pd=>((byId[pd]||{}).nextEvent)||null,
  showsOf:pd=>EVENTS.filter(e=>e.pd===pd&&isShow(e)&&e.s),
  allShows:()=>EVENTS.filter(e=>isShow(e)&&e.s),
  flowRow:k=>FLOWIX[k]||null,
  flowHtml:k=>flowMini(k),
  modal:openInfoModal,
  openClient:pd=>{closeModal();openPd=null;openClient(pd)},
  pipelineChanged:rows=>{PIPE=(rows||[]).slice();PIPE_READY=true;renderKPIs();renderLedger();renderRisk();renderOverview();if(C360.pd)paintC360();},
  openC360:pd=>openC360(pd),
  productAreas:()=>(D.productAreas||[]),
  events:()=>EVENTS,
  me:()=>({uid:GATE.uid,name:GATE.name,ok:GATE.ok,canWrite:GATE.canWrite,user:GATE.user}),
  rerender:()=>{ renderAll(); if(C360.pd) paintC360(); }, bugs:()=>D.bugs, incidents:()=>D.incidents, showTab:t=>showTab(t)
};
// "My clients" (the viewer's own list, from the Guide): Overview and Clients show only them while it is on
function myOk(pd){ const m=window.EP_MY; return !m||!m.on||!m.set.size||m.set.has(pd); }
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
  const pcount=v=>D.stories.filter(s=>paMatch(s,v)).length;
  document.getElementById('d-pa').innerHTML='<option value="">All product areas</option>'+PAS.filter(a=>pcount('d:'+a.d)).map(a=>
    `<optgroup label="${esc(a.d)}"><option value="d:${esc(a.d)}">${esc(a.d)} — all (${pcount('d:'+a.d)})</option>`
    +a.products.filter(p=>pcount('p:'+p)).map(p=>`<option value="p:${esc(p)}">${esc(p)} (${pcount('p:'+p)})</option>`).join('')+'</optgroup>').join('')
    +(pcount('-')?`<option value="-">${NOPA} (${pcount('-')})</option>`:'');
  try{const pr=localStorage.getItem('ep-ledger-platrows');if(pr==='team'||pr==='pa'){dPlatRows=pr;document.querySelectorAll('#d-plat button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===pr)))}}catch(e){}
  const dteams=[...new Set(D.stories.map(s=>s.team).filter(Boolean))].sort();
  document.getElementById('d-team').innerHTML='<option value="">All</option>'+dteams.map(t=>`<option>${esc(t)}</option>`).join('');
  renderHvBar(); renderKPIs(); renderLedger(); renderRisk(); renderDelivery(); renderBugs(); renderInc(); renderModel(); chartPenalty(); renderFlow(); renderLogic(); renderOverview();
  // every visit opens on the Overview; a link ending #clients, #requests and so on opens that section instead
  const h=String(location.hash||'').replace('#',''), t=TAB_ALIAS[h]||h;
  showTab(t&&document.getElementById('panel-'+t)?t:'overview');
  if(window.LEDGER_PREVIEW){ const r=document.createElement('div'); r.className='preview-rib';
    r.innerHTML='<b>Preview of the redesigned ledger.</b> Compare it with the live one; requests and rules are read-only here. <a href="'+esc(window.LEDGER_PREVIEW.live)+'" target="_blank" rel="noopener">Open the live ledger</a>';
    document.querySelector('.wrap').prepend(r); }
  document.getElementById('d-zoom').addEventListener('click',e=>{ const b=e.target.closest('[data-z]'); if(b) dlSetZoom(dlZoom+ +b.dataset.z); });
  document.querySelector('#d-tl-view .tlwrap').addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey)) return; e.preventDefault(); dlSetZoom(dlZoom+(e.deltaY<0?1:-1)); },{passive:false});
  tuck(); gateBoot(); syncBoot();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{renderLedger();renderDelivery()});
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
  view:'board', bgroup:'month', names:{}, subs:[], zoom:(()=>{ try{ const z=+localStorage.getItem('ep-pp-zoom'); return z>=1&&z<=5?z:2; }catch(e){ return 2; } })()
};
// the viewer's own view settings (pp-default-view): the grid unless they chose the table
(function ppPrefs(){
  // the Board is the default since 28 Sep 2026 (the Month × team grid read too sparse); only a choice made since counts
  const v=ppLS('ep-pp-view2'); if(v==='board'||v==='grid'||v==='table') PP.view=v;
  const bg=ppLS('ep-pp-bgroup'); if(['month','driver','team','status'].includes(bg)) PP.bgroup=bg;
  const g=ppLS('ep-pp-group'); if(g!==null && ['month','team','driver','area',''].includes(g)) PP.group=g;
  try{ const h=JSON.parse(ppLS('ep-pp-hidden')||'null'); if(Array.isArray(h)) PP.hidden=new Set(h); }catch(e){}
})();
function ppSavePrefs(){ ppLS('ep-pp-view2',PP.view); ppLS('ep-pp-bgroup',PP.bgroup); ppLS('ep-pp-group',PP.group); ppLS('ep-pp-hidden',JSON.stringify([...PP.hidden])); }
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
  const n=ppShowFor(r); if(!n) return null;
  const v=r.v||{}; if(ppStatus(r)==='Done') return null;
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

const PP_CANON = [['open','Planned'],['planned','Planned'],['backlog','Planned'],['ready to start','Planned'],['to do','Planned'],['selected for development','Planned'],['discovery','Discovery'],['investigation','Discovery'],['in design','Discovery'],['in review','In Testing'],['code review','In Progress'],
  ['in progress','In Progress'],['in testing','In Testing'],['ready for release','Ready for Release'],
  ['ready for deploy','Ready for Release'],['done','Done'],['blocked','Blocked'],['at risk','At Risk']];
function ppCanon(s){ const t=String(s||'').toLowerCase().trim();
  for(const [k,v] of PP_CANON) if(t.startsWith(k)) return v;
  if(t.includes('discovery')) return 'Discovery';
  return String(s||'').trim(); }

// Status follows Jira wherever the item has a ticket (28 Sep 2026, owner: "must reflect every board"): the board column is Jira's status
// mapped to a column (ppCanon), and the label is Jira's own status name. The stated status only counts for items with no ticket.
const ppStatus = r => { const j=r&&r.j; return j&&j.status?(j.canon||ppCanon(j.status)):((r&&r.v&&r.v.status)||'Planned'); };
const ppStatusName = r => { const j=r&&r.j; return j&&j.status?j.status:((r&&r.v&&r.v.status)||'No status'); };
// the show an item is for: its own target show when set (v.forShow, an OP key), else the driver's next show
function ppShowFor(r){ const d=ppDriver(r), cl=CLB(); if(!d.c||!cl) return null; const k=String((r.v||{}).forShow||'').trim();
  if(k){ const e=(cl.showsOf(d.k)||[]).find(x=>x.k===k); if(e) return {k:e.k,n:e.n,s:e.s,e:e.e||e.s,target:true}; }
  const n=cl.nextShow(d.k); return n?Object.assign({},n,{target:false}):null; }
const ppFunded = r => /^(yes|funded|part)/i.test(String((r&&r.v&&r.v.funded)||''));
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
    drift: false,
    overdue: !!(j && j.due && j.due<today && j.canon!=='Done' && !String(v.forShow||'').trim()),
    funded: ppFunded(r),
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
const PPFLAG=[['brokenPromise','over','After the show'],['overdue','over','Overdue'],['funded','ship','Funded'],['shipped','ship','Shipped'],
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
// a change is recorded under the person who made it, so nothing is written until they have signed in (pp-signin)
const ppSigned = () => !!(window.GATE && window.GATE.ok && window.GATE.uid);
// a preview copy of the page shows the requests but never takes them: they belong in the live ledger
const ppPreview = () => !!window.LEDGER_PREVIEW;
const ppRO = () => PP.canWrite===false || !ppSigned() || ppPreview();
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
  area:'Area',owner:'Raised by',estimate:'Estimate',forShow:'For show',funded:'Funded',impact:'Impact',deps:'Dependencies / Risks',notes:'Notes',rationale:'Rationale'};
function ppFldLabel(k){ if(k==='team') return 'Team'; const c=ppCols().find(x=>x.key===k); return c?c.label:(PP_FLD[k]||k); }
function ppFmtVal(k,v){
  const s=String(v??'').trim(); if(!s) return '';
  if(k==='month') return ppMo(s);
  if(k==='forShow'){ const cl=CLB(); const e=cl&&(cl.allShows?cl.allShows():[]).find(x=>x.k===s); return e?e.n:s; }
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
  if(ppPreview()){ uiToast('This is a preview copy. Log and edit requests in the live ledger.',{bad:true}); return false; }
  if(!ppSigned()){ uiToast('Sign in first: every request is recorded under your name. Reload the page and choose Continue.',{bad:true}); return false; }
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
    if(f.status&& ppStatus(r)!==f.status) return false;
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
  if(g==='status') return ppStatus(r);
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
  const host=document.getElementById('pp-host'); if(!host) return;
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
    ppBanner() + ppSummary(all) + ppDraftsHtml() + ppHead() + ppToolbar(rows,all) +
    (PP.view==='board' ? ppBoard(rows,all) + '<details class="pp-more"'+(PP.moreOpen?' open':'')+'><summary>Effort by month, team and area</summary>'+ppRollups(all)+'</details>'
      : (PP.view==='grid' ? ppTL(rows,all) : ppGrid(rows)) + ppAlerts(all) + ppRollups(all));
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
function ppToView(){ const h=document.querySelector('#pp-host .pp-head'); if(h) try{ h.scrollIntoView({block:'start',behavior:'smooth'}); }catch(e){} }

function ppBanner(){
  const s=(PP.meta&&PP.meta.source)||{};
  const ro = ppRO();
  return '<details class="about pp-about"'+(PP.aboutOpen?' open':'')+'><summary><span class="ib" aria-hidden="true">i</span>How the requests ledger works</summary><div class="pp-note">'+
    '<b>Client requests and what we have committed to build.</b> One item per must-have feature per target month, kept in this artifact&rsquo;s shared database: '+
    'add or change an item here and everyone with access sees it at once. Every change is recorded in <b>History</b> with who made it and when, and can be undone.'+
    '<details class="pp-how"><summary>How the ledger works</summary><div>'+
      'Imported from <a href="'+ppE(s.url||'#')+'" target="_blank" rel="noopener">the Confluence ledger</a> as it stood on '+ppE(s.lastModified||'18 Sep 2026')+'; that page now points here. '+
      'Month, Area and Status are normalised so the ledger can be totalled &mdash; the wording each owner originally used is kept on every item. '+
      '<b>Effort rolls up by team</b>, read from the Jira ticket; Raised by is whoever wrote the item down and enters no total (pp-team-unit). '+
      '<b>Driver</b> says who an item is for &mdash; a client or Platform &mdash; and gives it a tier (pp-driver). '+
      'The <b>Board</b> shows every item as a card in its month (or by client, team or status), with each client&rsquo;s next show marked in its month; the line above it counts what needs attention and filters the board when clicked. '+
      'On the <b>Month × team</b> grid, click an item to open it, or <b>+ Add</b> in any cell to add one there with its month, team and driver filled in. '+
      'In the <b>Table</b>, click a cell to change it in place, or <b>Open</b> for the whole item. '+
      'Nothing in the item form is saved until you press Save. Removing an item keeps it, with its history, under <b>Removed</b>, where it can be restored (pp-history). '+
      'Grey table columns are read from Jira or derived, and cannot be typed into.'+
    '</div></details></div></details>' +
    (ppPreview()?'<div class="pp-ro"><b>Preview copy.</b> These are the requests as they stood when the preview was made, read-only. <a href="'+ppE(window.LEDGER_PREVIEW.live)+'" target="_blank" rel="noopener">Log or change requests in the live ledger</a>.</div>':
     ro&&!ppSigned()?'<div class="pp-ro"><b>You are not signed in</b>, so you can read every request and its history but not add or change one. Each request is recorded under the name of whoever logs it; reload the page and sign in with your ExpoPlatform claude.ai account to log one.</div>':
     ro?'<div class="pp-ro"><b>You have read-only access to this artifact</b>, so you can open items and read their history but not change them. '+
        'Ask the owner for &ldquo;Can interact&rdquo; or higher to edit.</div>':'');
}

// the summary: five figures and one line of what needs attention; each part of that line filters the view (28 Sep 2026)
function ppSummary(all){
  const fl=all.map(ppFlags), c=k=>fl.filter(f=>f[k]).length, miss=c('noEstimate'), mo=ppBy(all,'month');
  const cur=ppToday().slice(0,7), nx=(()=>{ const [y,m]=cur.split('-').map(Number); return m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'); })();
  const at=k=>(mo.find(([x])=>x===k)||[k,{d:0,n:0,miss:0}])[1];
  const fig=(n,l,d,cls)=>'<div class="pp-fig'+(cls?' '+cls:'')+'"><b>'+n+'</b><span>'+l+'</span>'+(d?'<small>'+d+'</small>':'')+'</div>';
  const load=k=>{ const x=at(k); return fig(ppD(x.d),ppMo(k)+' load',x.n+' item'+(x.n===1?'':'s')+(x.miss?' · '+x.miss+' unestimated':'')); };
  const att=[['brokenPromise','bad','due after the client’s show'],['overdue','bad','past their Jira due date'],
    ['noEstimate','mid','no estimate'],['noDriver','mid','no client set'],['noTeam','mid','no team'],['dueSoon','mid','due within a week'],['shipped','ok','shipped, still listed'],['funded','ok','funded']]
    .map(([k,cls,l])=>[k,cls,l,c(k)]).filter(x=>x[3]);
  const bp=c('brokenPromise');
  return '<div class="pp-sum">'+fig(all.length,'must-have items',(()=>{ const ms=all.map(r=>(r.v||{}).month).filter(m=>/^\d{4}-\d{2}$/.test(m||'')).sort(); const nm=all.length-ms.length; return ms.length?ppMo(ms[0])+' to '+ppMo(ms[ms.length-1])+(nm?' · '+nm+' with no month':''):''; })())+
    fig(ppD(ppSum(all)),'committed effort',miss?miss+' without an estimate':'every item estimated')+load(cur)+load(nx)+
    fig(bp,'due after the client’s show',bp?'the client expects them before':'none',bp?'bad':'')+'</div>'+
    (att.length?'<div class="pp-att" role="group" aria-label="Needs attention"><span class="pp-att-l">Needs attention</span>'+
      att.map(([k,cls,l,n])=>'<button type="button" class="pp-att-c '+cls+'" data-ppflag="'+k+'" aria-pressed="'+(PP.f.flag===k)+'"><b>'+n+'</b> '+l+'</button>').join('')+
      (PP.f.flag?'<button type="button" class="linkbtn pp-att-x" data-ppflag="">Show everything</button>':'')+'</div>':'');
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
      [['board','Board'],['grid','Month × team'],['table','Table']].map(([k,l])=>'<button type="button" data-v="'+k+'" aria-pressed="'+(PP.view===k)+'">'+l+'</button>').join('')+
    '</span>'+
    (ro?'':'<button class="pp-btn" id="pp-add" type="button">+ Log a request</button>')+
    '<button class="pp-btn ghost" id="pp-hist" type="button">Change log: who added, edited or removed what</button>'+
    (rm?'<button class="pp-btn ghost" id="pp-removed" type="button">Removed ('+rm+')</button>':'')+
    '<span class="pp-hint">'+(ro?'Open any item to read it and its history.'
      : PP.view==='board'?'Click an item to open and edit it.'
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
    opts('area',PP.f.area,'Area')+opts('status',PP.f.status,'Status',null,ppStatus)+flagSel+
    '<input type="search" id="pp-q" placeholder="Search the ledger" aria-label="Search the ledger" value="'+ppE(PP.f.q)+'">'+
    (ppAnyFilter()?'<button class="pp-btn ghost" id="pp-clear" type="button">Clear filters</button>':'')+
    (PP.view==='board'?'<label>Columns by <span class="seg" id="pp-bgroup">'+[['month','Month'],['driver','Client'],['team','Team'],['status','Status']].map(([g,l])=>'<button type="button" data-v="'+g+'" aria-pressed="'+(PP.bgroup===g)+'">'+l+'</button>').join('')+'</span></label>':
     PP.view==='grid'?'':'<label>Group <span class="seg" id="pp-group">'+
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
  if(c.key==='forShow') return v?'<span class="pp-cv one">'+ppE(ppFmtVal('forShow',v))+'</span>':'<span class="pp-empty">next show</span>';
  if(c.key==='status' && r.j && r.j.status) return '<span class="pp-cv one" title="Jira status">'+ppE(r.j.status)+'</span> <span class="pp-tag der">Jira</span>';
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
      cols.map(c=>(c.key==='status'&&r.j&&r.j.status)?'<td class="der">'+ppCellHtml(r,c)+'</td>':'<td class="cell" data-ppcell="'+r.id+'|'+c.key+'"'+(ro?'':' title="Click to change"')+'>'+ppCellHtml(r,c)+'</td>').join('')+
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
  if(ppFunded(r)) tags.push('<span class="pp-tag ship">funded</span>');
  return '<button type="button" class="pp-chip '+(PP_ST[ppStatus(r)]||'st-plan')+'" data-ppedit="'+r.id+'" title="'+ppE(ppTitle(r))+'">'+
    '<span class="ck">'+(v.key?ppE(v.key):'<span class="nk">no ticket</span>')+'</span>'+
    '<span class="ct">'+ppE(v.feature)+'</span>'+
    '<span class="cm"><span class="st">'+ppE(ppStatusName(r))+'</span><span>'+(r.n&&r.n.days!=null?ppD(r.n.days):'no estimate')+'</span>'+tags.join('')+'</span>'+
  '</button>';
}
// ---- every must-have ticket re-read from Jira at each Jira refresh, so the ledger's status, due date, team and logged time match
// every board. Jira columns only (no history, pp-jira-derived); run by whoever's view does the Jira refresh.
async function ppJiraRefresh(mcp){
  if(!PP.db||!mcp||ppRO()) return;
  const rows=ppLive().filter(r=>/^EP-\d+$/.test(String((r.v||{}).key||'').trim())), keys=[...new Set(rows.map(r=>r.v.key.trim()))]; if(!keys.length) return;
  const res=await mcp.callTool('Atlassian','searchJiraIssuesUsingJql',{cloudId:'expoplatform.atlassian.net', jql:'key in ('+keys.join(',')+')',
    fields:['summary','status','issuetype','priority','assignee','duedate','timeoriginalestimate','aggregatetimeoriginalestimate','aggregatetimespent','resolutiondate','customfield_10001'], maxResults:100},{cache:false});
  let p=res&&res.payload; if(typeof p==='string'){ try{ p=JSON.parse(p); }catch(e){ return; } }
  const nodes=(p&&p.issues&&(Array.isArray(p.issues)?p.issues:p.issues.nodes))||[]; if(!nodes.length) return;
  const d=x=>x==null?null:Math.round(x/28800*100)/100, by={};
  nodes.forEach(n=>{ const f=n.fields||{}, st=unentPP((f.status||{}).name||'');
    by[n.key]={aggOrigDays:d(f.aggregatetimeoriginalestimate), assignee:(f.assignee||{}).displayName||null, canon:ppCanon(st), due:f.duedate||null, origDays:d(f.timeoriginalestimate),
      priority:(f.priority||{}).name||null, resolved:String(f.resolutiondate||'').slice(0,10)||null, spentDays:d(f.aggregatetimespent), status:st, summary:unentPP(f.summary||''),
      team:(f.customfield_10001&&(f.customfield_10001.name||f.customfield_10001.title))||null, teamField:'customfield_10001', type:(f.issuetype||{}).name||null}; });
  const at=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  for(const r of rows){ const j=by[r.v.key.trim()]; if(!j) continue; const old=r.j||{};
    if(['status','due','team','spentDays','assignee','resolved','origDays','aggOrigDays','priority'].some(k=>String(old[k]??'')!==String(j[k]??''))){
      try{ await PP.db.doc('pipeline/'+r.id).update({j, jAt:at}); }catch(e){} } }
  try{ await PP.db.doc('config/pipeline').update({asOf:at.slice(0,10)}); }catch(e){}
}
const unentPP=x=>{ const t=String(x??''); if(!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(t)) return t; const el=document.createElement('textarea'); el.innerHTML=t; return el.value; };
window.ppJiraRefresh=ppJiraRefresh;
// ---- the Board (default since 28 Sep 2026): one column per month (or client, team, status), every item a small card
const PP_ORDER=['In Progress','In Testing','Ready for Release','Discovery','Planned','Blocked','At Risk','Done'];
function ppBCard(r,g){
  const v=r.v||{}, fl=ppFlags(r), br=ppBroken(r), d=ppDriver(r), tm=ppTeam(r).t, tags=[];
  if(br) tags.push('<span class="pp-tag over" title="'+ppE('Committed for '+ppMo(v.month)+'; '+d.label+'’s show starts '+br.s)+'">after '+ppE(d.label)+'’s show</span>');
  else if(fl.overdue) tags.push('<span class="pp-tag over">overdue in Jira</span>');
  if(fl.shipped) tags.push('<span class="pp-tag ship">shipped</span>');
  if(fl.funded) tags.push('<span class="pp-tag ship" title="'+ppE((r.v||{}).funded)+'">funded</span>');
  { const tg=ppShowFor(r); if(tg&&tg.target) tags.push('<span class="pp-tag soon" title="'+ppE(tg.n)+'">for '+ppE(tg.n)+'</span>'); }
  const who=d.k?(d.k==='Platform'?'<span class="pp-bwho plat">Platform</span>':'<span class="pp-bwho">'+ppTierPill(d.tier)+'<span>'+ppE(d.label)+'</span></span>'):'<span class="pp-bwho none">No client set</span>';
  return '<button type="button" class="pp-bc '+(PP_ST[ppStatus(r)]||'st-plan')+'" data-ppedit="'+r.id+'" title="'+ppE(ppTitle(r))+'">'+
    '<span class="pp-bt"><span class="ck">'+(v.key?ppE(v.key):'<span class="nk">no ticket</span>')+'</span><span class="pp-bst" title="'+(r.j&&r.j.status?'Jira status':'Stated status (no Jira ticket)')+'">'+ppE(ppStatusName(r))+'</span></span>'+
    '<span class="ct">'+ppE(v.feature)+'</span>'+
    '<span class="pp-bm">'+(g==='driver'?'':who)+(g==='team'?'':'<span class="pp-bteam">'+ppE(tm||'No team')+'</span>')+(g==='month'?'':'<span>'+ppE(v.month?ppMo(v.month):'No month')+'</span>')+
      '<span class="pp-bd'+(r.n&&r.n.days!=null?'':' none')+'">'+(r.n&&r.n.days!=null?ppD(r.n.days):'no estimate')+'</span></span>'+
    (tags.length?'<span class="pp-btags">'+tags.join('')+'</span>':'')+'</button>';
}
function ppBoard(rows,all){
  const ro=ppRO(), cl=CLB();
  if(!all.length) return '<div class="pp-emptygrid"><b>No items on the ledger yet.</b>'+(ro?'':' <button class="pp-btn" type="button" data-ppnew="none||">+ Add the first item</button>')+'</div>';
  if(!rows.length) return '<div class="pp-emptygrid">Nothing matches these filters. <button class="pp-btn ghost" type="button" id="pp-clear">Clear filters</button></div>';
  const g=PP.bgroup, cur=ppToday().slice(0,7), okM=m=>/^\d{4}-\d{2}$/.test(m||'');
  let cols=[];
  if(g==='month'){
    cols=ppMonths().map(m=>({k:m,label:ppMo(m),rows:rows.filter(r=>(r.v||{}).month===m)})).filter(c=>c.rows.length||c.k>=cur);
    const nm=rows.filter(r=>!okM((r.v||{}).month)); if(nm.length) cols.push({k:'',label:'No month yet',rows:nm,note:'Timing not agreed'});
  } else if(g==='status'){
    cols=PP_ORDER.map(st=>({k:st,label:st,rows:rows.filter(r=>ppStatus(r)===st),st})).filter(c=>c.rows.length);
    const other=rows.filter(r=>!PP_ORDER.includes(ppStatus(r))); if(other.length) cols.push({k:'?',label:'Other status',rows:other});
  } else if(g==='driver'){
    cols=ppBands(rows).map(b=>({k:b.k,label:b.k==='none'?'No client set':b.k==='plat'?'Platform':b.d.label,tier:b.d.tier,rows:b.rows,pd:b.d.c?b.d.k:null}));
  } else {
    const m=new Map(); rows.forEach(r=>{ const t=ppTeamName(r); if(!m.has(t)) m.set(t,[]); m.get(t).push(r); });
    cols=[...m.entries()].sort((a,b)=>(a[0]==='No team')-(b[0]==='No team')||ppSum(b[1])-ppSum(a[1])).map(([t,rs])=>({k:t,label:t,rows:rs}));
  }
  const rank=r=>{ const f=ppFlags(r); return (ppBroken(r)?0:f.overdue?1:3)*100+Math.max(0,PP_ORDER.indexOf(ppStatus(r)))*10+(ppDriver(r).tier||9); };
  const drivers=[]; { const seen=new Set(); all.forEach(r=>{ const d=ppDriver(r); if(d.c&&!seen.has(d.k)){ seen.add(d.k); drivers.push(d); } }); }
  const day=s=>{ const p=String(s||'').split('-').map(Number); return p.length===3?p[2]+' '+PP_MONTHS[p[1]-1]:s; };
  const html=cols.map(c=>{
    const d=ppSum(c.rows), miss=c.rows.filter(r=>!r.n||r.n.days==null).length;
    let shows='';
    if(g==='month'&&c.k&&cl) shows=drivers.map(dr=>({dr,n:cl.nextShow(dr.k)})).filter(x=>x.n&&String(x.n.s).slice(0,7)===c.k).sort((a,b)=>String(a.n.s).localeCompare(String(b.n.s)))
      .map(x=>'<div class="pp-bshow" title="'+ppE(x.n.n)+'"><i aria-hidden="true"></i><span><b>'+ppE(x.dr.label)+'</b> show '+ppE(day(x.n.s))+'</span></div>').join('');
    if(g==='driver'&&c.pd&&cl){ const n=cl.nextShow(c.pd); if(n) shows='<div class="pp-bshow" title="'+ppE(n.n)+'"><i aria-hidden="true"></i><span>Next show '+ppE(day(n.s)+' '+String(n.s).slice(0,4))+'</span></div>'; }
    return '<section class="pp-bcol'+(g==='month'&&c.k===cur?' now':'')+(c.st?' '+(PP_ST[c.st]||''):'')+'" aria-label="'+ppE(c.label)+'">'+
      '<header><div class="pp-bh">'+(c.tier?ppTierPill(c.tier):'')+'<b>'+ppE(c.label)+'</b>'+(g==='month'&&c.k===cur?'<span class="pp-now">this month</span>':'')+'</div>'+
      '<div class="pp-bsub">'+c.rows.length+' item'+(c.rows.length===1?'':'s')+' · <b>'+ppD(d)+'</b>'+(miss?' · '+miss+' unestimated':'')+(c.note?' · '+ppE(c.note):'')+'</div>'+shows+'</header>'+
      '<div class="pp-bcards">'+(c.rows.slice().sort((a,b)=>rank(a)-rank(b)||(a.order||0)-(b.order||0)).map(r=>ppBCard(r,g)).join('')||'<div class="pp-bnone">Nothing committed</div>')+'</div></section>';
  }).join('');
  return '<div class="pp-boardwrap"><div class="pp-board" style="--cols:'+cols.length+'">'+html+'</div></div>';
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
    '<div class="pp-zoomrow"><span class="zoomctl" role="group" aria-label="Zoom"><button type="button" class="ibtn" data-ppz="-1" aria-label="Zoom out"'+(PP.zoom<=1?' disabled':'')+'>&minus;</button><span>'+['Smallest','Small','Medium','Large','Largest'][PP.zoom-1]+'</span><button type="button" class="ibtn" data-ppz="1" aria-label="Zoom in"'+(PP.zoom>=5?' disabled':'')+'>+</button></span></div>'+
    '<div class="tlwrap"><div class="tl pp-tl" data-zoom="'+PP.zoom+'" style="grid-template-columns:minmax('+[150,170,200,230,260][PP.zoom-1]+'px,'+[190,210,240,270,300][PP.zoom-1]+'px) repeat('+months.length+',minmax('+[120,150,190,240,300][PP.zoom-1]+'px,1fr))">'+h+'</div></div>';
}

// ---------- the item form (pp-editor): one place to add, finish, change and remove an item ----------
const PP_ED_SECTIONS=[
  {t:'Who it is for and what they need', keys:['driver','feature','why','impact']},
  {t:'When and by whom', keys:['month','forShow','key','team','priority','area','funded']},
  {t:'Status and detail', keys:['status','owner','estimate','deps','notes','rationale']}
];
const PP_HELP={
  feature:'Required. What the client needs, in words everyone will recognise.',
  key:'Optional. With a Jira ticket, team, status and due date are read from Jira at each refresh.',
  why:'Required. One line on why it must ship. The long form goes in Rationale.',
  impact:'Required. What happens for the client, or their show, if it is not delivered on time.',
  priority:'Required. The kind of priority: customer, compliance, revenue, operational or strategic.',
  area:'Required. The product area it touches.',
  month:'Required. The month it is committed to: its column on the grid.',
  team:'Who does the work. Set it here when the item has no Jira ticket, or the ticket carries no team.',
  driver:'Required. Who it is for: a client on the Planhat active list, or Platform. Tier and the next-show check come from it.',
  owner:'Optional: the person who asked for it, if not you. Who logged it is recorded automatically from your sign-in.',
  estimate:'Person-days: 5d, 3-5d, or Total: 12 person-days.',
  rationale:'The long form of Why.',
  forShow:'Optional: the show this is promised for, when it is not the client\u2019s next one. The after-the-show check and the overdue flag use it.',
  funded:'Whether the client pays towards it: Yes, Part, or leave empty.'
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
  const id='ppf-'+k.replace(/[^a-z0-9_-]/gi,'_'), req=!!PP_REQ[k] || (k==='team' && ed.isNew && !String(ed.cur.key||'').trim());
  let help=PP_HELP[k]!==undefined?PP_HELP[k]:(c.note||''), input='', extra='';
  if(k==='month'){
    input='<select id="'+id+'" data-f="month" aria-required="true"'+dis+'><option value="">Choose a month</option>'+
      ppMonthOpts(val).map(m=>'<option value="'+m+'"'+(m===val?' selected':'')+'>'+ppMo(m)+'</option>').join('')+'</select>';
  } else if(k==='driver'){
    input='<select id="'+id+'" data-f="driver" aria-required="true"'+dis+'>'+(val?'':'<option value="" selected>Choose the client</option>')+ppDriverOpts(val)+'</select>';
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
  } else if(k==='forShow'){
    const cl=CLB(), drv=String((ed.v||{}).driver||(ed.row&&ed.row.v&&ed.row.v.driver)||''), shows=cl&&drv&&drv!=='Platform'?(cl.showsOf(drv)||[]).slice().sort((a,b)=>String(a.s).localeCompare(String(b.s))):[];
    input='<select id="'+id+'" data-f="forShow"'+dis+'><option value="">The client\u2019s next show</option>'+shows.map(e=>'<option value="'+ppE(e.k)+'"'+(e.k===val?' selected':'')+'>'+ppE(e.n+' · '+cl.fmtDate(e.s))+'</option>').join('')+(val&&!shows.some(e=>e.k===val)?'<option value="'+ppE(val)+'" selected>'+ppE(val)+'</option>':'')+'</select>';
  } else if(k==='status'){
    const j=ed.row&&ed.row.j;
    if(j&&j.status){ input='<select id="'+id+'" disabled aria-describedby="'+id+'-j"><option>'+ppE(j.status)+'</option></select>';
      extra='<div class="fh" id="'+id+'-j">From Jira, refreshed with every Jira pull: the ledger always shows the ticket&rsquo;s own status. Change it in Jira.</div>'; help=''; }
    else input='<select id="'+id+'" data-f="status"'+dis+'>'+ppOpts(c,val)+'</select>';
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
  const ns=ppShowFor(r), br=ppBroken(r);
  let h='<div class="seclabel">Who it is for, and who does it<span class="c">derived</span></div><div class="pp-kvs">'+
    f('Driver', dr.k ? ppE(dr.label)+(dr.tier?' '+ppTierPill(dr.tier):'')+(pf&&pf.value===String((r.v||{}).driver||'')?'<div class="pp-sub">Pre-filled by Claude on '+ppE(ppWhenDay(pf.at))+': '+ppE(pf.basis)+' (pp-driver-prefill).</div>':'') : '<span class="pp-tag noest">not set</span>')+
    (ns&&ns.target?f('For show','<b>'+ppE(ns.n)+'</b> '+ppE(cl.fmtDate(ns.s))+' <span class="pp-tag soon">target</span><div class="pp-sub">Checked against this show, not the next one.</div>'):'')+
    (ppFunded(r)?f('Funded','<span class="pp-tag ship">funded</span> '+ppE((r.v||{}).funded)):'')+
    f('Promise vs show', !dr.c ? '<span class="pp-empty">'+(dr.k==='Platform'?'platform work has no show':'needs a client Driver')+'</span>'
      : !ns ? '<span class="pp-empty">'+ppE(dr.label)+' has no dated show</span>'
      : (br ? '<span class="pp-tag over">broken</span> '+ppE(ppMo((r.v||{}).month))+' ends after '+ppE(ns.n)+' starts '+ppE(cl.fmtDate(ns.s))
            : '<span class="pp-tag ship">holds</span> '+ppE(ppMo((r.v||{}).month))+' ends before '+ppE(ns.n)+' starts '+ppE(cl.fmtDate(ns.s))))+
    f('Team', tm.t ? ppE(tm.t)+' <span class="pp-tag der">from '+(tm.src==='Jira'?'Jira':'this item')+'</span>' : '<span class="pp-tag over">no team</span>')+
    '</div>';
  if(j){
    h+='<div class="seclabel">From Jira<span class="c">refreshed '+ppE(PP.meta&&PP.meta.asOf?ppWhenDay(PP.meta.asOf):'—')+'</span></div><div class="pp-kvs">'+
      f('Status',ppE(j.status)+' <span class="pp-tag der">shown everywhere</span>')+
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
  // where Claude's filled-in fields came from (28 Sep 2026): the ticket, its comments and the Confluence pages it links
  const en=r.enrich; if(en&&(Object.keys(en.fields||{}).length||(en.pages||[]).length)){
    const live=Object.entries(en.fields||{}).filter(([k])=>String((r.v||{})[k]||'').trim());
    h+='<div class="seclabel">Where the details came from<span class="c">'+ppE(ppWhenDay(en.at))+'</span></div><div class="pp-src">'+
      live.map(([k,src])=>'<div><b>'+ppE(ppFldLabel(k))+'</b> <span>'+ppE(src)+'</span></div>').join('')+
      ((en.pages||[]).length?'<div class="pp-srcp"><b>Pages read</b> '+en.pages.map(pg=>'<a href="'+ppE(pg.url)+'" target="_blank" rel="noopener">'+ppE(pg.title||pg.url)+'</a>').join(' · ')+'</div>':'')+
      ((en.gaps||[]).length?'<details class="pp-gaps"><summary>What the sources did not say ('+en.gaps.length+')</summary><ul>'+en.gaps.map(g=>'<li>'+ppE(g)+'</li>').join('')+'</ul></details>':'')+'</div>';
  }
  return h;
}
function ppEdSideHtml(){
  const ed=PP.ed, r=ed.row;
  if(ed.isNew){
    const p=ed.preset||{}, bits=[p.month?'Month '+ppMo(p.month):'', p.team?'Team '+p.team:'', p.driver?'Driver '+ppFmtVal('driver',p.driver):''].filter(Boolean);
    return '<div class="pp-sidehelp"><div class="seclabel">Adding an item</div>'+
      '<p class="pp-loggedby">Logged by <b>'+ppE((window.GATE&&window.GATE.name)||'you')+'</b>, '+ppE(ppWhen(ppNow()))+'. This is recorded with the request and cannot be changed.</p>'+
      '<p>Nothing is saved until you press <b>Log request</b>. Every field marked <b>*</b> is required: the client, what they need, why, the impact if it slips, the month, the priority and the product area. With no Jira ticket, the team is required too.</p>'+
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
    '<button type="button" class="ibtn primary" id="pp-ed-save">'+(ed.isNew?'Log request':'Save changes')+'</button></div>';
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
// what a request must carry before it is logged (pp-required). A new request needs all of it; an older
// item cannot have a required field emptied, and its missing ones are named without blocking the save.
const PP_REQ={feature:'Give the request a name.', driver:'Choose the client it is for, or Platform.', why:'Say in one line why it is needed.',
  impact:'Describe what happens for the client if it is not delivered.', priority:'Choose the kind of priority.', area:'Choose the product area.',
  month:'Choose the month it is committed to.'};
function ppReqMissing(c){ return Object.keys(PP_REQ).filter(k=>ppCols().some(x=>x.key===k) && !String(c[k]||'').trim()); }
function ppEdErrors(){
  const ed=PP.ed, c=ed.cur, e={};
  Object.keys(PP_REQ).forEach(k=>{
    if(!ppCols().some(x=>x.key===k)) return;
    const empty=!String(c[k]||'').trim();
    if(empty && (ed.isNew || k==='feature' || k==='month' || String(ed.orig[k]||'').trim())) e[k]=PP_REQ[k];
  });
  if(ed.isNew && !String(c.key||'').trim() && !String(c.team||'').trim() && ppCols().some(x=>x.key==='team')) e.team='With no Jira ticket, say which team will do the work.';
  if(ppCols().some(x=>x.key==='month') && c.month && !/^\d{4}-\d{2}$/.test(c.month||'')) e.month='Choose the month it is committed to.';
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
  const nErr=Object.keys(err).length, c0=ed.cur;
  save.disabled=!!ed.saving || (!ed.isNew && !ppIsDraft(ed.row) && !ch.length);   // a draft's Save says what is missing
  msg.textContent = ed.saving ? 'Saving…'
    : ed.isNew ? (nErr ? nErr+' required field'+(nErr===1?'':'s')+' still empty.' : 'Ready to log.')
    : (!nErr && ppReqMissing(c0).length && ch.length) ? ch.length+' unsaved change'+(ch.length===1?'':'s')+' · still missing: '+ppReqMissing(c0).map(ppFldLabel).join(', ')
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
    if(PP_REQ[key] && !val && cur){ uiToast(ppFldLabel(key)+' is required on every request, so it cannot be emptied.',{bad:true}); return; }
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
  const host=document.getElementById('pp-host'); if(!host) return;
  const q0=document.getElementById('pp-q');
  if(q0) q0.addEventListener('input',ppSearch);
  if(host.dataset.ppbound) return;
  host.dataset.ppbound='1';
  host.addEventListener('click',e=>{
    const t=e.target;
    let b;
    if((b=t.closest('[data-ppz]'))){ PP.zoom=Math.max(1,Math.min(5,PP.zoom+ +b.dataset.ppz)); ppLS('ep-pp-zoom',String(PP.zoom)); ppRender(); return; }
    if((b=t.closest('[data-ppedit]'))){ ppOpenEditor(b.dataset.ppedit); return; }
    if((b=t.closest('[data-ppnew]'))){ ppNewFrom(b.dataset.ppnew); return; }
    if((b=t.closest('[data-ppdel]'))){ const r=PP.rows.find(x=>x.id===b.dataset.ppdel); if(r) ppRemoveWithUndo(r); return; }
    if((b=t.closest('[data-ppcol]'))){ ppColMenu(b); return; }
    if((b=t.closest('[data-ppsort]'))){ const k=b.dataset.ppsort;
      PP.sort = PP.sort.k===k ? {k, dir:-PP.sort.dir} : {k, dir:1}; ppRender(); return; }
    if((b=t.closest('[data-ppflag]'))){ const v=b.dataset.ppflag; PP.f.flag=PP.f.flag===v?'':v; ppRender(); if(b.closest('.pp-alerts')) ppToView(); return; }
    if((b=t.closest('#pp-bgroup button'))){ PP.bgroup=b.dataset.v; ppSavePrefs(); ppRender(); return; }
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

// ================= Demand: the Product Demand Map inside the ledger, and the search the work-item form uses =================
// Data: demand.json (tools/demand.py), packed exactly as the Product Demand Map artifact packs it, plus the KB's
// built stories and each customer's Pipedrive id. Loaded once, only when the Demand tab or the form's search opens.
const DM = {data:null, loading:null, err:null, idx:null, byItem:new Map(), byCl:new Map(), needs:[], rows:[],
  f:{src:'',tier:'',pr:'',cu:'',built:'',yr:'',q:''}, zoom:(()=>{ try{ const z=+localStorage.getItem('ep-dm-zoom'); return z>=1&&z<=5?z:2; }catch(e){ return 2; } })(), view:'rank', sort:{k:'rank',dir:1}, page:0, rpage:0, q:'', res:null, ai:null, aiBusy:false, sample:undefined};
const dmE = uiEsc;
const DM_SRC={F:'Feature request',S:'Open story',I:'FIS intake'};
const DM_TW={1:8,2:4,3:2,4:1};
// the signal (intel/SPEC.md, Tier signal): Σ over the DISTINCT customers asking of their tier weight. Who is asking, not a priority score.
const DM_SIG_TIP='Signal: who is asking, weighted by Sales Tier. Not a priority score. The rule is in Method & sources, Definitions.';
// the one link to the definition (Method & sources → Definitions → Demand signal); the weights there are written from DM_TW
const dmDefLink=(txt)=>`<button type="button" class="linkbtn" data-def="signal">${txt||'How the signal is worked out'}</button>`;
(function(){ const e=document.getElementById('def-signal-w'); if(e) e.textContent=[1,2,3,4].map(t=>'T'+t+' '+DM_TW[t]).join(' · ')+'. A customer not on the ledger (no tier) adds 0.'; })();
function dmSigParts(cus,max){ const named=cus.filter(x=>DM_TW[x.t]), rest=cus.length-named.length, show=named.slice(0,max||99);
  const sum=named.reduce((a,x)=>a+DM_TW[x.t],0);
  return {sum, html:(show.map(x=>`<span class="dm-sp">${dmE(x.n)} <span class="dm-spt t${x.t}">T${x.t} = ${DM_TW[x.t]}</span></span>`).join('<span class="dm-plus">+</span>')||'<span class="small">No customer on the ledger</span>')+
    (named.length>show.length?`<span class="dm-plus">+</span><span class="small">${named.length-show.length} more</span>`:'')+`<span class="dm-eq">= ${sum}</span>`+
    (rest?`<span class="small dm-sp0">${rest} customer${rest===1?'':'s'} not on the ledger add 0</span>`:'')}; }
function dmSigHow(){
  const top=DM.needs[0], filt=Object.values(DM.f).some(Boolean);
  const ex=top?dmSigParts(top.cu,6):null;
  return `<details class="about dm-sighow"${DM.sigOpen?' open':''}><summary><span class="ib" aria-hidden="true">i</span>What is the signal score?</summary><div class="dm-sigbody">
    <p><b>The signal says who is asking for a need, weighted by each customer&rsquo;s Sales Tier.</b> It is not a priority score. The rule, with the weights, is defined once in Method &amp; sources: ${dmDefLink('Definitions, Demand signal')}.</p>
    ${ex?`<div class="dm-sigex"><div class="small">Worked example: the top need${filt?' with your filters':''}, <b>${dmE(top.c.name)}</b></div><div class="dm-sigsum">${ex.html}</div></div>`:''}
    </div></details>`;
}
const DM_BUILT={done:'Already built',part:'Partially built',none:'Nothing built'};
const DM_STOP=new Set('a an and are as at be but by can for from has have how i if in into is it its of on or our so that the their them then there these they this to too us was we were what when where which who why will with would should could able allow allows need needs want wants add adding make using use new also only just more than via per each all any other some like get set see show'.split(' '));
const dmTok=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>1&&!DM_STOP.has(w)).map(w=>w.length>4?w.replace(/(ings|ing|ed|es|s)$/,''):w);
const dmTier=t=>t?`<span class="tierpill t${t<=2?t:''}">T${t}</span>`:'<span class="tierpill na">—</span>';
async function dmLoad(){
  if(DM.data) return DM.data;
  if(DM.loading) return DM.loading;
  DM.loading=(async()=>{
    const r=await fetch('demand.json'); if(!r.ok) throw new Error('demand.json '+r.status);
    const d=await r.json(); dmPrep(d); DM.data=d; return d;
  })().catch(e=>{ DM.err=String(e&&e.message||e); DM.loading=null; throw e; });
  return DM.loading;
}
function dmPrep(d){
  const q2=x=>x?x.slice(0,4)+' Q'+(Math.floor((+x.slice(5,7)-1)/3)+1):'';
  d.items.forEach(r=>DM.byItem.set(r.i,r)); d.clusters.forEach(c=>DM.byCl.set(c.id,c));
  d.clusters.forEach(c=>c.m.forEach(m=>{ const r=DM.byItem.get(m.i); if(r){ r.cl=c.id; r.role=m.r; } }));
  d.items.forEach(r=>{ r.q=q2(r.d); const ts=(r.cu||[]).map(x=>x[1]).filter(Boolean); r.ti=ts.length?Math.min(...ts):0;
    r.tl=r.ti?'T'+r.ti:(r.cu||[]).length?'Not in ledger':r.in?'Internal only':'No customer'; });
  d.clusters.forEach(c=>{ const rs=c.m.map(m=>DM.byItem.get(m.i)).filter(Boolean); c.rs=rs;
    c.bs=rs.some(r=>r.bs==='done')?'done':rs.some(r=>r.bs==='part')?'part':'none'; });
  // the search index: every need, every request and every built story, one document each
  const docs=[];
  d.clusters.forEach(c=>docs.push({t:'need',id:c.id,txt:[c.name,c.name,c.name,c.what,c.why,c.outcome,c.product,c.rs.map(r=>r.t+' '+(r.nk||'')).join(' '),c.rs.flatMap(r=>(r.cu||[]).map(x=>x[0])).join(' ')].join(' ')}));
  d.items.forEach(r=>docs.push({t:'req',id:r.i,txt:[r.t,r.t,r.w,r.y,r.nk,r.nk,r.pr,(r.cu||[]).map(x=>x[0]).join(' '),r.k].join(' ')}));
  d.built.forEach(b=>docs.push({t:'built',id:b.k,txt:[b.t,b.t,b.i,b.o,b.f,b.p,b.k].join(' ')}));
  const df=new Map(); let tot=0;
  docs.forEach(x=>{ const tf=new Map(); dmTok(x.txt).forEach(w=>tf.set(w,(tf.get(w)||0)+1)); x.tf=tf; x.len=[...tf.values()].reduce((a,b)=>a+b,0); tot+=x.len; tf.forEach((v,w)=>df.set(w,(df.get(w)||0)+1)); });
  DM.idx={docs,df,N:docs.length,avg:tot/Math.max(1,docs.length)};
}
const dmIdf=w=>{ const n=DM.idx.df.get(w)||0; return Math.log(1+(DM.idx.N-n+.5)/(n+.5)); };
// BM25, plus how much of the query a document covers (idf-weighted), which is what the page calls the match
function dmSearch(q,opt){
  opt=opt||{}; if(!DM.idx) return {needs:[],built:[],terms:[]};
  const key=String(q||'').trim().toUpperCase().match(/\b(EP|FIS|HV|IMP|REQ)-\d+\b/g)||[];
  const terms=[...new Set(dmTok(q))]; if(!terms.length&&!key.length) return {needs:[],built:[],terms};
  const idf=Object.fromEntries(terms.map(w=>[w,dmIdf(w)])), all=terms.reduce((a,w)=>a+idf[w],0)||1, k1=1.4, b=.75;
  const hits=[];
  DM.idx.docs.forEach(x=>{
    let s=0, cov=0;
    terms.forEach(w=>{ const f=x.tf.get(w); if(!f) return; s+=idf[w]*f*(k1+1)/(f+k1*(1-b+b*x.len/DM.idx.avg)); cov+=idf[w]; });
    if(key.length&&key.some(k=>x.id.toUpperCase()===k||x.txt.toUpperCase().includes(k))){ s+=20; cov=all; }
    if(s>0) hits.push({t:x.t,id:x.id,s,cov:cov/all});
  });
  const needs=new Map();
  hits.forEach(h=>{
    const cid=h.t==='need'?h.id:h.t==='req'?(DM.byItem.get(h.id)||{}).cl:null; if(!cid) return;
    const e=needs.get(cid)||{id:cid,s:0,cov:0,via:[]};
    e.s=Math.max(e.s,h.s*(h.t==='req'?.92:1)); e.cov=Math.max(e.cov,h.cov); if(h.t==='req'&&e.via.length<3) e.via.push(h.id);
    needs.set(cid,e);
  });
  // rank by relevance weighted by how much of the description a need covers; strong = close to the best and covering most of it
  const blend=h=>h.s*(.4+h.cov);
  const nl=[...needs.values()].sort((a,b)=>blend(b)-blend(a)).slice(0,opt.limit||12);
  const top=nl.length?blend(nl[0]):0; nl.forEach(h=>{ h.strong=h.cov>=.7&&blend(h)>=.6*top&&terms.length>=3; });
  const bl=hits.filter(h=>h.t==='built').sort((a,b)=>blend(b)-blend(a)).slice(0,opt.builtLimit||5);
  return {needs:nl,built:bl,terms};
}
const dmPct=x=>Math.round((x||0)*100);
const dmStrong=h=>!!(h&&h.strong);
function dmNeedCard(h,ctx){
  const c=DM.byCl.get(h.id); if(!c) return '';
  const cus=[...new Map(c.rs.flatMap(r=>(r.cu||[])).map(x=>[x[0],x])).values()].sort((a,b)=>(a[1]||9)-(b[1]||9)).slice(0,4);
  const ai=DM.ai&&DM.ai.byId&&DM.ai.byId[c.id];
  return `<div class="dm-hit${dmStrong(h)?' strong':''}${ai?' v-'+dmE(ai.verdict):''}">
    <div class="dm-hh"><button type="button" class="linkbtn dm-hn" data-dmneed="${dmE(c.id)}">${dmE(c.name)}</button>
      <span class="dm-pct" title="Share of your words this need covers">${dmPct(h.cov)}% match</span></div>
    <div class="dm-hm">${dmE(c.product)} · ${c.rs.length} ticket${c.rs.length===1?'':'s'} · ${cus.map(x=>dmTier(x[1])+' '+dmE(x[0])).join(', ')||'no customer named'} · <span class="dm-b ${c.bs}">${DM_BUILT[c.bs]}</span></div>
    ${ai?`<div class="dm-ai"><b>${dmE(({duplicate:'Duplicate','overlap':'Overlaps','related':'Related','already-built':'Already built','not-related':'Not related'})[ai.verdict]||ai.verdict)}</b> · ${dmE(ai.reason||'')}</div>`:''}
    <div class="dm-hw">${dmE(c.what)}</div>
    ${ctx==='form'?`<div class="dm-acts"><button type="button" class="ibtn" data-dmact="link" data-dmid="${dmE(c.id)}">Link as related</button><button type="button" class="ibtn" data-dmact="same" data-dmid="${dmE(c.id)}">This is the same need</button><button type="button" class="ibtn primary" data-dmact="use" data-dmid="${dmE(c.id)}">Use its details</button></div>`
      :`<div class="dm-acts"><button type="button" class="ibtn" data-dmneed="${dmE(c.id)}">Open the need</button><button type="button" class="ibtn primary" data-dmlog="${dmE(c.id)}">Log a work item from it</button></div>`}
  </div>`;
}
function dmBuiltCard(h){
  const b=DM.data.built.find(x=>x.k===h.id); if(!b) return '';
  const ai=DM.ai&&DM.ai.byId&&DM.ai.byId[b.k];
  return `<div class="dm-hit built${ai?' v-'+dmE(ai.verdict):''}"><div class="dm-hh"><a href="https://expoplatform.atlassian.net/browse/${dmE(b.k)}" target="_blank" rel="noopener">${dmE(b.k)}</a> <span class="dm-b done">Built</span> <b>${dmE(b.t)}</b><span class="dm-pct">${dmPct(h.cov)}% match</span></div>
    <div class="dm-hm">${dmE(b.p)} · ${dmE(b.f)} · ${dmE(b.st)}</div>${ai?`<div class="dm-ai"><b>${ai.verdict==='already-built'?'Already built':dmE(ai.verdict)}</b> · ${dmE(ai.reason||'')}</div>`:''}<div class="dm-hw">${dmE(b.i)}</div></div>`;
}
function dmResultsHtml(res,ctx){
  if(!res) return '';
  if(!res.needs.length&&!res.built.length) return `<div class="dm-none">Nothing in the demand map matches these words. It looks like a new need.</div>`;
  const strong=res.needs.filter(dmStrong).length;
  return `<div class="dm-rsum">${strong?`<b class="warn">${strong} need${strong===1?'':'s'} match most of your words.</b> Check them before logging a new one.`:'Closest needs already asked for, and what is already built.'}</div>`+
    res.needs.slice(0,res.all?99:6).map(h=>dmNeedCard(h,ctx)).join('')+
    (res.needs.length>6&&!res.all?`<button type="button" class="linkbtn dm-more" data-dmmore>Show all ${res.needs.length} needs</button>`:'')+
    (res.built.length?'<div class="seclabel">Already built (knowledge base)</div>'+res.built.slice(0,res.all?5:3).map(dmBuiltCard).join(''):'');
}
// Ask AI: the closest 30 candidates go to Claude with the description; it says which are the same need and why
async function dmAskAI(q,res,host,ctx){
  if(DM.sample===undefined){ try{ DM.sample=await claude.use('sample'); }catch(e){ DM.sample=null; } }
  if(!DM.sample){ uiToast('AI search is not available in this view. The instant results below still work.',{bad:true}); return; }
  if(DM.aiBusy) return; DM.aiBusy=true;
  const cand=res.needs.slice(0,22).map(h=>{ const c=DM.byCl.get(h.id); return {id:c.id,kind:'need',name:c.name,product:c.product,what:c.what,why:String(c.why).slice(0,300),builtToday:DM_BUILT[c.bs],tickets:c.rs.length}; })
    .concat(res.built.slice(0,8).map(h=>{ const b=DM.data.built.find(x=>x.k===h.id); return {id:b.k,kind:'built',name:b.t,product:b.p,what:b.i,outcome:b.o}; }));
  const box=host.querySelector('.dm-aibox'); if(box) box.innerHTML='<div class="dm-think"><span class="gate-spin"></span> Claude is reading the '+cand.length+' closest items…</div>';
  const prompt='You check a new product request against existing demand at ExpoPlatform (an event-management platform).\n\nNEW REQUEST:\n'+q+
    '\n\nCANDIDATES (existing needs already asked for, and features already built), as JSON:\n'+JSON.stringify(cand)+
    '\n\nFor each candidate that is relevant, judge by business intent, not shared words: "duplicate" (the same ask), "overlap" (a large part of the same ask), "related" (same area, a different need), "already-built" (a built feature that delivers the ask). Leave out candidates that are not related.'+
    '\nReply with only JSON: {"summary":"one sentence for the requester","productArea":"the product of the best match, or empty","matches":[{"id":"...","verdict":"duplicate|overlap|related|already-built","reason":"one short sentence"}]}. Order matches from the closest. Use only ids from the candidates.';
  try{
    const out=await DM.sample.json(prompt,{modelTier:'default'});
    const ms=(out&&Array.isArray(out.matches)?out.matches:[]).filter(m=>m&&cand.some(c=>c.id===m.id));
    DM.ai={q, summary:String(out&&out.summary||''), productArea:String(out&&out.productArea||''), matches:ms, byId:Object.fromEntries(ms.map(m=>[m.id,m]))};
    const order=Object.fromEntries(ms.map((m,i)=>[m.id,i]));
    res.needs.sort((a,b)=>((order[a.id]??99)-(order[b.id]??99))||b.s-a.s); res.built.sort((a,b)=>((order[a.id]??99)-(order[b.id]??99))||b.s-a.s);
    if(box) box.innerHTML=`<div class="dm-aisum"><span class="dm-ailbl">AI check</span> ${dmE(DM.ai.summary||'Done.')}${ms.length?'':' No candidate is the same need.'}</div>`;
    const list=host.querySelector('.dm-list'); if(list) list.innerHTML=dmResultsHtml(res,ctx);
    if(ctx==='form'&&FE.form){ FE.form.dup.ai={summary:DM.ai.summary, matches:ms.slice(0,8)}; }
  }catch(e){
    const c=e&&e.code;
    const msg={not_granted:'AI search was not allowed for this page. Allow Claude for this artifact to use it.',sampling_disabled:'Claude is not available for your account here.',rate_limited:'Too many AI searches just now. Try again in a minute.',session_expired:'Sign in to claude.ai again to use AI search.',invalid_json:'The AI answer could not be read. Try again.',refused:'Claude declined this search. Reword the description.',prompt_too_large:'The description is too long for AI search. Shorten it.'}[c]||('AI search failed ('+(c||'error')+').');
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(c)) DM.sample=null;
    if(box) box.innerHTML='<div class="dm-aisum bad">'+dmE(msg)+'</div>';
  }finally{ DM.aiBusy=false; }
}

// ---------- the Demand tab ----------
function dmFiltered(){
  const f=DM.f;
  return DM.data.items.filter(r=>(!f.src||r.s===f.src)&&(!f.tier||r.tl===f.tier)&&(!f.pr||r.pr===f.pr)&&(!f.cu||(r.cu||[]).some(x=>x[0]===f.cu))&&(!f.built||r.bs===f.built)&&(!f.yr||String(r.d||'').startsWith(f.yr))&&(!f.q||r.q===f.q));
}
function dmDerive(){
  DM.rows=dmFiltered(); const hit=new Map();
  DM.rows.forEach(r=>{ if(r.cl){ if(!hit.has(r.cl)) hit.set(r.cl,[]); hit.get(r.cl).push(r); } });
  DM.needs=[];
  hit.forEach((rs,id)=>{ const c=DM.byCl.get(id), cu=new Map();
    rs.forEach(r=>(r.cu||[]).forEach(([n,t,pd])=>{ const e=cu.get(n)||{n,t,pd,k:0}; e.k++; cu.set(n,e); }));
    if(!DM.f.src&&window.btVoiceCus) window.btVoiceCus(id).forEach(([n,t,pd])=>{ if(![...cu.values()].some(x=>x.n===n||(pd&&String(x.pd)===String(pd)))) cu.set(n,{n,t,pd,k:1,voice:true}); });
    const cus=[...cu.values()].sort((a,b)=>(a.t||9)-(b.t||9)||b.k-a.k||a.n.localeCompare(b.n)), ts=cus.map(x=>x.t).filter(Boolean);
    const tc={}; [1,2,3,4].forEach(t=>tc[t]=cus.filter(x=>x.t===t).length);
    DM.needs.push({c,rs,n:rs.length,dup:rs.filter(r=>r.role==='duplicate').length,cu:cus,tt:ts.length?Math.min(...ts):0,tc,
      sig:cus.reduce((a,x)=>a+(DM_TW[x.t]||0),0),bs:rs.some(r=>r.bs==='done')?'done':rs.some(r=>r.bs==='part')?'part':'none',fis:Math.max(-1,...rs.map(r=>r.op??-1))}); });
  DM.needs.sort((a,b)=>b.sig-a.sig||b.n-a.n||a.c.name.localeCompare(b.c.name)); DM.needs.forEach((x,i)=>x.rank=i+1);
}
function dmTierBars(x){ return `<span class="dm-tb">${[1,2,3,4].map(t=>x.tc[t]?`<i style="width:${Math.min(56,7*x.tc[t])}px;background:var(--tier${t})" title="${x.tc[t]} Tier ${t}"></i>`:'').join('')}</span>`; }
async function dmRender(){
  const host=document.getElementById('dm-host'); if(!host) return;
  if(!DM.data){
    host.innerHTML='<div class="empty"><span class="gate-spin"></span> Loading the demand map…</div>';
    try{ await dmLoad(); }catch(e){ host.innerHTML='<div class="pp-ro"><b>The demand data could not load.</b> '+dmE(DM.err||'')+'</div>'; return; }
  }
  dmDerive();
  const d=DM.data, f=DM.f, prods=Object.entries(d.products).reduce((a,[p,dm])=>{(a[dm]=a[dm]||[]).push(p);return a},{});
  const custs=[...new Map(d.items.flatMap(r=>(r.cu||[]).map(x=>[x[0],x[1]]))).entries()].sort((a,b)=>(a[1]||9)-(b[1]||9)||a[0].localeCompare(b[0]));
  const yrs=[...new Set(d.items.map(r=>String(r.d||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const sel=(k,opts,label)=>`<label>${label} <select data-dmf="${k}"><option value="">All</option>${opts}</select></label>`;
  const o=(v,l,cur)=>`<option value="${dmE(v)}"${String(cur)===String(v)?' selected':''}>${dmE(l)}</option>`;
  const n=DM.needs, rows=DM.rows, t1=new Set(rows.flatMap(r=>(r.cu||[]).filter(x=>x[1]===1).map(x=>x[0])));
  host.innerHTML=`
    <div class="dm-search card">
      <div class="dm-sh"><h3>Search the demand map</h3><span class="small">${d.counts.items.toLocaleString()} requests · ${d.counts.clusters.toLocaleString()} needs · ${d.counts.built} built stories · data as of ${dmE(fmtD(d.asOf))}</span></div>
      <div class="dm-sbar"><input type="search" id="dm-q" value="${dmE(DM.q)}" placeholder="Describe the need in your own words, or search a Jira key, customer or product" autocomplete="off">
        <button type="button" class="ibtn" id="dm-go">Search</button><button type="button" class="ibtn primary" id="dm-ai">&#10022; Ask AI</button></div>
      <div class="dm-aibox"></div><div class="dm-list">${DM.res?dmResultsHtml(DM.res,'tab'):'<div class="small dm-tip">Instant search runs as you type. <b>Ask AI</b> has Claude read the closest 30 and say which are the same need.</div>'}</div>
    </div>
    <div class="toolbar dm-f">
      <span class="seg" id="dm-src">${[['','All sources'],['F','Feature requests'],['S','Open stories'],['I','FIS intake']].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${f.src===k}">${l}</button>`).join('')}</span>
      ${sel('tier',['T1','T2','T3','T4','Not in ledger','Internal only','No customer'].map(x=>o(x,x,f.tier)).join(''),'Tier')}
      ${sel('pr',Object.entries(prods).map(([dm,ps])=>`<optgroup label="${dmE(dm)}">${ps.sort().map(p=>o(p,p,f.pr)).join('')}</optgroup>`).join(''),'Product')}
      ${sel('cu',custs.map(([c,t])=>o(c,(t?'T'+t+' · ':'')+c,f.cu)).join(''),'Customer')}
      ${sel('built',Object.entries(DM_BUILT).map(([k,l])=>o(k,l,f.built)).join(''),'Built today')}
      ${sel('yr',yrs.map(y=>o(y,y,f.yr)).join(''),'Raised')}
      ${Object.values(f).some(Boolean)?'<button type="button" class="linkbtn" id="dm-clear">Clear filters</button>':''}
    </div>
    <div class="dm-kpis">${[[n.length,'needs'],[rows.length,'requests'],[n.reduce((a,x)=>a+x.dup,0),'duplicates marked'],[t1.size,'Tier 1 customers asking'],[n.filter(x=>x.bs!=='none').length,'needs partly or fully built']].map(([v,l])=>`<div class="pp-stat"><div class="n">${v.toLocaleString()}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="dm-vtop"><span class="seg" id="dm-view">${[['rank','Where Tier 1 is asking'],['needs','Needs'],['requests','Requests']].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${DM.view===k}">${l}</button>`).join('')}</span>
      ${f.q?`<span class="pp-tag soon">Raised in ${dmE(f.q)} <button type="button" class="linkbtn" data-dmq="${dmE(f.q)}">clear</button></span>`:''}
      <span class="zoomctl" role="group" aria-label="Zoom"><button type="button" class="ibtn" data-dmz="-1" aria-label="Zoom out"${DM.zoom<=1?' disabled':''}>&minus;</button><span>${['Smallest','Small','Medium','Large','Largest'][DM.zoom-1]}</span><button type="button" class="ibtn" data-dmz="1" aria-label="Zoom in"${DM.zoom>=5?' disabled':''}>+</button></span></div>
    ${DM.view!=='req'?dmSigHow():''}<div id="dm-view-host" data-zoom="${DM.zoom}">${DM.view==='rank'?dmRankHtml():DM.view==='needs'?dmNeedsHtml():dmReqHtml()}</div>`;
  dmBindTab(host);
}
const fmtD=s=>{ try{ return new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}); }catch(e){ return s; } };
function dmRankHtml(){
  const d=DM.data, prods=Object.keys(d.products), cols=['T1','T2','T3','T4','Not in ledger'];
  const grid={}; DM.needs.forEach(x=>{ const k=x.c.product, t=x.tt?'T'+x.tt:'Not in ledger'; (grid[k]=grid[k]||{})[t]=((grid[k]||{})[t]||0)+1; });
  const rowsP=prods.filter(p=>grid[p]).sort((a,b)=>((grid[b].T1||0)-(grid[a].T1||0))||(Object.values(grid[b]).reduce((x,y)=>x+y,0)-Object.values(grid[a]).reduce((x,y)=>x+y,0)));
  const max=Math.max(1,...rowsP.flatMap(p=>cols.map(c=>grid[p][c]||0)));
  const top=DM.needs.slice(0,25);
  return `<div class="dm-rank"><div class="card"><h3>Needs by product and the best tier asking</h3><div class="note">Each need counts once, at the best Sales Tier among its customers. Click a cell to filter.</div>
    <div class="dm-heat"><div class="dm-hr hd"><span></span>${cols.map(c=>`<span>${c==='Not in ledger'?'Not in ledger':c}</span>`).join('')}</div>
    ${rowsP.map(p=>`<div class="dm-hr"><span class="dm-hp">${dmE(p)}</span>${cols.map(c=>{const v=grid[p][c]||0; const tn=c[0]==='T'?c[1]:0; return `<button type="button" class="dm-hc" data-dmheat="${dmE(p)}|${c}" ${v?'':'disabled'} style="--a:${v/max};--c:${tn?'var(--tier'+tn+')':'var(--tier0)'}">${v||''}</button>`;}).join('')}</div>`).join('')}</div></div>
    <div class="card"><h3>Where Tier 1 is asking</h3><div class="note">Ranked by signal, the tier-weighted count of customers asking. Hover a number for how it adds up. ${dmDefLink()}.</div>
    <ol class="dm-rl">${top.map(x=>`<li><button type="button" class="dm-rr" data-dmneed="${dmE(x.c.id)}"><span class="dm-rn">${x.rank}</span><span class="dm-rm"><b>${dmE(x.c.name)}</b><span class="small">${dmE(x.c.product)} · ${x.n} ticket${x.n===1?'':'s'}${x.dup?' · '+x.dup+' duplicate'+(x.dup===1?'':'s'):''} · ${x.cu.filter(c=>c.t===1).slice(0,3).map(c=>dmE(c.n)).join(', ')||'no Tier 1'}</span></span>${dmTierBars(x)}<span class="dm-b ${x.bs}">${DM_BUILT[x.bs]}</span><span class="dm-sig" title="${dmE(x.cu.filter(c=>DM_TW[c.t]).map(c=>c.n+' T'+c.t+' '+DM_TW[c.t]).join(' + ')+' = '+x.sig)}">${x.sig}</span></button></li>`).join('')||'<li class="empty">No need matches these filters.</li>'}</ol></div></div>`;
}
function dmNeedsHtml(){
  const S=DM.sort, list=DM.needs.slice().sort((a,b)=>{ const k=S.k; const va=k==='rank'?a.rank:k==='n'?-a.n:k==='tier'?(a.tt||9):k==='sig'?-a.sig:k==='fis'?-a.fis:a.c.name.localeCompare(b.c.name); const vb=k==='rank'?b.rank:k==='n'?-b.n:k==='tier'?(b.tt||9):k==='sig'?-b.sig:k==='fis'?-b.fis:0; return (k==='name'?va:va-vb)*S.dir; });
  const per=25, pages=Math.max(1,Math.ceil(list.length/per)); DM.page=Math.min(DM.page,pages-1);
  const th=(k,l,cls)=>`<th class="${cls||''}"><button type="button" class="sortb" data-dmsort="${k}">${l}${S.k===k?(S.dir>0?' ↑':' ↓'):''}</button></th>`;
  return `<div class="pp-wrap"><table class="pp dm-tab"><thead><tr>${th('rank','#','num')}${th('name','Need')}<th>Product</th>${th('n','Tickets','num')}<th>Customers</th>${th('tier','Top tier')}${th('sig','<span title="'+DM_SIG_TIP+'">Signal ⓘ</span>','num')}<th>Built today</th>${th('fis','FIS best','num')}</tr></thead>
    <tbody>${list.slice(DM.page*per,DM.page*per+per).map(x=>`<tr class="r" data-dmneed="${dmE(x.c.id)}"><td class="num">${x.rank}</td><td><b class="fe-t">${dmE(x.c.name)}</b><div class="small">${dmE(String(x.c.what).slice(0,140))}${String(x.c.what).length>140?'…':''}</div></td><td>${dmE(x.c.product)}</td><td class="num">${x.n}${x.dup?`<div class="small">${x.dup} dup</div>`:''}</td><td>${x.cu.slice(0,3).map(c=>dmTier(c.t)+' '+dmE(c.n)).join('<br>')}${x.cu.length>3?`<div class="small">+${x.cu.length-3} more</div>`:''}</td><td>${dmTier(x.tt)}</td><td class="num" title="${dmE(x.cu.filter(c=>DM_TW[c.t]).map(c=>c.n+' T'+c.t+' '+DM_TW[c.t]).join(' + ')+' = '+x.sig)}">${x.sig}</td><td><span class="dm-b ${x.bs}">${DM_BUILT[x.bs]}</span></td><td class="num">${x.fis>=0?x.fis:'—'}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No need matches these filters.</td></tr>'}</tbody></table></div>
    <div class="dm-pager">${pages>1?`<button type="button" class="ibtn" data-dmpage="-1"${DM.page?'':' disabled'}>Previous</button><span>${DM.page+1} / ${pages}</span><button type="button" class="ibtn" data-dmpage="1"${DM.page<pages-1?'':' disabled'}>Next</button>`:''}</div>`;
}
function dmBars(list,key,limit){ const max=Math.max(1,...list.map(x=>x.n)); return `<div class="dm-bars">${list.slice(0,limit).map(x=>`<button type="button" class="dm-bar" ${key?`data-dmbar="${key}|${dmE(x.k)}"`:''}><span class="lb">${dmE(x.l||x.k)}</span><span class="tr">${['F','S','I'].map(s=>x[s]?`<i class="s${s}" style="width:${x[s]/max*100}%"></i>`:'').join('')}</span><span class="vv">${x.n}</span></button>`).join('')}</div>`; }
function dmTally(rows,fn){ const m=new Map(); rows.forEach(r=>{ const ks=fn(r); (Array.isArray(ks)?ks:[ks]).forEach(k=>{ if(!k) return; let e=m.get(k); if(!e){ e={k,F:0,S:0,I:0,n:0}; m.set(k,e); } e[r.s]++; e.n++; }); }); return [...m.values()].sort((a,b)=>b.n-a.n); }
function dmQChart(byQ,qmax){
  if(!byQ.length) return '<div class="empty">Nothing raised in the current filter.</div>';
  const W=420, H=Math.round(230*(DM.zoom>=4?1.25:1)), L=6, R=6, T=20, B=38, cw=(W-L-R)/byQ.length, bw=Math.min(30,cw*.62), ph=H-T-B;
  let s=`<svg class="dm-qchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Requests raised per quarter">`;
  byQ.forEach((x,i)=>{ const cx=L+i*cw, bx=cx+(cw-bw)/2; let y=T+ph;
    s+=`<g class="qb${DM.f.q===x.k?' sel':''}" data-dmq="${dmE(x.k)}" tabindex="0" role="button" aria-label="${x.n} raised in ${dmE(x.k)}"><title>${x.n} raised in ${dmE(x.k)}: ${x.F} feature requests, ${x.S} open stories, ${x.I} FIS pages</title><rect class="bg" x="${cx+1}" y="${T-14}" width="${cw-2}" height="${ph+14}" rx="6" fill="transparent"/>`;
    [['F','var(--sF)'],['S','var(--sS)'],['I','var(--sI)']].forEach(([k,col])=>{ if(!x[k]) return; const hh=x[k]/qmax*ph; y-=hh; s+=`<rect x="${bx}" y="${y}" width="${bw}" height="${Math.max(1,hh-.5)}" fill="${col}" rx="2"/>`; });
    s+=`<text x="${cx+cw/2}" y="${y-4}" text-anchor="middle" class="qv">${x.n}</text>`;
    const [yr,qq]=x.k.split(' ');
    s+=`<text x="${cx+cw/2}" y="${H-19}" text-anchor="middle" class="ql">${dmE(qq||'')}</text><text x="${cx+cw/2}" y="${H-6}" text-anchor="middle" class="ql">${dmE(yr)}</text></g>`; });
  return s+'</svg>';
}
function dmReqHtml(){
  const rows=DM.rows, byQ=dmTally(rows,r=>r.q).sort((a,b)=>a.k.localeCompare(b.k)).slice(-12), qmax=Math.max(1,...byQ.map(x=>x.n));
  const cls=dmTally(rows.filter(r=>r.s==='I'),r=>r.fc||'Unscored'), fisTop=rows.filter(r=>r.s==='I'&&r.op!=null).sort((a,b)=>b.op-a.op).slice(0,6);
  const per=30, list=rows.slice().sort((a,b)=>String(b.d||'').localeCompare(String(a.d||''))), pages=Math.max(1,Math.ceil(list.length/per)); DM.rpage=Math.min(DM.rpage,pages-1);
  return `<div class="dm-legend"><span><i class="sF"></i>Feature requests</span><span><i class="sS"></i>Open stories</span><span><i class="sI"></i>FIS intake</span></div>
   <div class="dm-grid">
    <div class="card"><h3>KB products</h3><div class="note">Click a bar to filter.</div>${dmBars(dmTally(rows,r=>r.pr),'pr',14)}</div>
    <div class="card"><h3>Customers asking</h3><div class="note">Tier from the ledger; — means not a ledger client.</div>${dmBars(dmTally(rows,r=>(r.cu||[]).map(x=>x[0])).map(x=>Object.assign(x,{l:(()=>{const it=rows.find(r=>(r.cu||[]).some(c=>c[0]===x.k)); const t=it&&(it.cu.find(c=>c[0]===x.k)||[])[1]; return (t?'T'+t:'—')+' · '+x.k;})()})),'cu',14)}</div>
    <div class="card"><h3>Raised per quarter</h3><div class="note">The last 12 quarters in the current filter. Click a bar to see only that quarter.</div>${dmQChart(byQ,qmax)}</div>
    <div class="card"><h3>Sales tier asking</h3><div class="note">A ticket counts once, at its best tier.</div>${dmBars(dmTally(rows,r=>r.tl),'tier',8)}</div>
    <div class="card"><h3>FIS intake scoring</h3><div class="note">Recommended classification, and the top Total Opportunity.</div><div class="dm-cls">${cls.map(x=>`<span class="pp-tag soon">${dmE(x.k)} ${x.n}</span>`).join(' ')||'<span class="small">No FIS page in the filter.</span>'}</div>
      <div class="dm-fis">${fisTop.map((r,i)=>`<div class="dm-fr"><span class="dm-fn">${i+1}</span><span><button type="button" class="linkbtn" data-dmreq="${dmE(r.i)}">${dmE(r.t)}</button><span class="small"> · total opportunity ${r.op} · ${dmE(r.fc||'')}</span></span></div>`).join('')}</div></div>
   </div>
   <div class="pp-wrap" style="margin-top:14px"><table class="pp dm-tab"><thead><tr><th>Key</th><th>Request</th><th>Product</th><th>Source</th><th>Status</th><th>Customers</th><th>Tier</th><th>Raised</th><th class="num">Comments</th></tr></thead>
    <tbody>${list.slice(DM.rpage*per,DM.rpage*per+per).map(r=>`<tr class="r" data-dmreq="${dmE(r.i)}"><td><b>${dmE(r.k||'FIS')}</b></td><td>${dmE(r.t)}</td><td>${dmE(r.pr)}</td><td>${DM_SRC[r.s]}</td><td>${dmE(r.st)}</td><td>${(r.cu||[]).slice(0,2).map(c=>dmE(c[0])).join(', ')}${(r.cu||[]).length>2?' +'+((r.cu.length)-2):''}</td><td>${dmTier(r.ti)}</td><td>${dmE(r.q||'')}</td><td class="num">${r.cm||0}</td></tr>`).join('')}</tbody></table></div>
   <div class="dm-pager">${pages>1?`<button type="button" class="ibtn" data-dmrpage="-1"${DM.rpage?'':' disabled'}>Previous</button><span>${DM.rpage+1} / ${pages} · ${list.length} requests</span><button type="button" class="ibtn" data-dmrpage="1"${DM.rpage<pages-1?'':' disabled'}>Next</button>`:''}</div>`;
}
function dmBindTab(host){
  const q=host.querySelector('#dm-q');
  const run=()=>{ DM.q=q.value; DM.ai=null; DM.res=DM.q.trim()?dmSearch(DM.q):null; host.querySelector('.dm-list').innerHTML=DM.res?dmResultsHtml(DM.res,'tab'):''; host.querySelector('.dm-aibox').innerHTML=''; };
  let t; q.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(run,220); });
  q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); run(); } });
  host.querySelector('#dm-go').onclick=run;
  host.querySelector('#dm-ai').onclick=()=>{ if(!q.value.trim()){ uiToast('Describe the need first.'); q.focus(); return; } if(!DM.res||DM.q!==q.value) run(); dmAskAI(q.value,DM.res,host,'tab'); };
}
function dmOpenNeed(id){
  const c=DM.byCl.get(id); const cl=CLB(); if(!c||!cl) return;
  const cus=[...new Map(c.rs.flatMap(r=>(r.cu||[]).map(x=>[x[0],x]))).values()];
  if(window.btVoiceCus) window.btVoiceCus(id).forEach(x=>{ if(!cus.some(y=>y[0]===x[0]||(x[2]&&String(y[2])===String(x[2])))) cus.push(x); });
  cus.sort((a,b)=>(a[1]||9)-(b[1]||9));
  const ROLE={canonical:'Canonical',duplicate:'Duplicate',overlap:'Overlap',related:'Related'};
  const body=`<div class="fe-cols"><div>
      <div class="seclabel">What is asked</div><p class="dm-p">${dmE(c.what)}</p>
      <div class="seclabel">Why</div><p class="dm-p">${dmE(c.why)}</p>
      <div class="seclabel">Outcome</div><p class="dm-p">${dmE(c.outcome)}</p>
      <div class="seclabel">Built today</div><p class="dm-p"><span class="dm-b ${c.bs}">${DM_BUILT[c.bs]}</span> ${dmE(c.bo||'')}</p>
      ${c.also&&c.also.length?`<div class="seclabel">Also asked in</div><p class="dm-p">${c.also.map(dmE).join(', ')}</p>`:''}
    </div><div>
      <div class="seclabel">Tickets<span class="c">${c.m.length}</span></div>
      <div class="dm-mem">${c.m.map(m=>{const r=DM.byItem.get(m.i)||{};return `<div class="dm-mr"><span class="pp-tag ${m.r==='canonical'?'ship':m.r==='duplicate'?'over':'noest'}">${ROLE[m.r]||m.r}</span> ${r.u?`<a href="${dmE(r.u)}" target="_blank" rel="noopener">${dmE(r.k||'FIS page')}</a>`:dmE(r.k||'')} <span>${dmE(r.t||'')}</span><div class="small">${dmE(DM_SRC[r.s]||'')} · ${dmE(r.st||'')}${m.no?' · '+dmE(m.no):''}</div></div>`}).join('')}</div>
      <div class="seclabel">Signal<span class="c">${dmSigParts(cus.map(x=>({n:x[0],t:x[1]}))).sum}</span></div>
      <div class="dm-sigsum sm">${dmSigParts(cus.map(x=>({n:x[0],t:x[1]}))).html}</div>
      ${(()=>{ const f=DM.needs.find(x=>x.c.id===id), all=dmSigParts(cus.map(x=>({n:x[0],t:x[1]}))).sum; return f&&f.sig!==all?`<div class="small">With your filters it reads ${f.sig}: only the matching tickets count.</div>`:''; })()}
      <div class="small dm-signote">Who is asking, not a priority score. ${dmDefLink()}.</div>
      ${window.btNeedVoicesHtml?window.btNeedVoicesHtml(id):''}
      <div class="seclabel">Customers asking<span class="c">${cus.length}</span></div>
      <div class="small">${cus.map(x=>dmTier(x[1])+' '+(x[2]?`<button type="button" class="linkbtn" data-c360="${dmE(x[2])}">${dmE(x[0])}</button>`:dmE(x[0]))).join('<br>')||'none named'}</div>
    </div></div>`;
  cl.modal(c.name,`<span>${dmE(c.product)}</span><span>${c.m.length} ticket${c.m.length===1?'':'s'}</span><span>${dmE((DM.data.products||{})[c.product]||'')}</span>`,body,
    `<button type="button" id="dm-logneed">Log a work item from this need</button><span>Opens the form with this need's details filled in.</span>`);
  const b=document.getElementById('dm-logneed'); if(b) b.onclick=()=>{ document.querySelector('#modal .x').click(); dmLogFrom(id); };
}
function dmOpenReq(id){
  const r=DM.byItem.get(id), cl=CLB(); if(!r||!cl) return;
  const c=DM.byCl.get(r.cl);
  cl.modal((r.k?r.k+' · ':'')+r.t,`<span>${DM_SRC[r.s]}</span><span>${dmE(r.st)}</span><span>${dmE(r.pr)}</span>`,
    `<div class="seclabel">What</div><p class="dm-p">${dmE(r.w||'')}</p><div class="seclabel">Why</div><p class="dm-p">${dmE(r.y||'')}</p><div class="seclabel">Outcome</div><p class="dm-p">${dmE(r.o||'')}</p>
     ${(r.bo||[]).length?`<div class="seclabel">Built overlap</div>${r.bo.map(b=>`<div class="small"><b>${dmE(b[1])}</b> <a href="https://expoplatform.atlassian.net/browse/${dmE(b[0])}" target="_blank" rel="noopener">${dmE(b[0])}</a> · ${dmE(b[2]||'')}</div>`).join('')}`:''}
     <div class="seclabel">Customers</div><div class="small">${(r.cu||[]).map(x=>dmTier(x[1])+' '+dmE(x[0])).join('<br>')||'none named'}</div>
     ${c?`<div class="seclabel">Part of the need</div><button type="button" class="linkbtn" data-dmneed-m="${dmE(c.id)}">${dmE(c.name)}</button> <span class="small">${r.role||''}</span>`:''}`,
    r.u?`<a href="${dmE(r.u)}" target="_blank" rel="noopener">Open in ${r.s==='I'?'Confluence':'Jira'}</a>`:'');
}
// open the form with a need's details, from the Demand tab
async function dmLogFrom(id){
  if(typeof feOpenForm!=='function') return;
  if(window.EP_ACCESS&&window.EP_ACCESS.how&&window.btFromNeed){ window.btFromNeed(id); return; }
  showTabGlobal('pipeline'); feSetView('fl'); feOpenForm();
  if(FE.form){ FE.form.dup.decision='used'; FE.form.dup.choice=id; FE.form.dq=DM.byCl.get(id).name; await dmUse(id,true); }
}
const showTabGlobal=t=>{ const b=document.querySelector('.tab[data-tab="'+t+'"]'); if(b) b.click(); };
// "Use its details": fills the empty fields; asks before replacing anything the requester wrote
async function dmUse(id,silent){
  const f=FE.form, c=DM.byCl.get(id); if(!f||!c) return;
  const v=f.v, cl=CLB(), keys=c.rs.map(r=>r.k).filter(Boolean);
  const areas=(cl&&cl.productAreas?cl.productAreas():[]).flatMap(a=>a.products);
  const ledCus=[...new Map(c.rs.flatMap(r=>(r.cu||[]).filter(x=>x[2]).map(x=>[x[2],x]))).values()];
  const prop={
    productArea: areas.includes(c.product)?c.product:'',
    problem: c.why||'',
    evidence: 'Existing demand: '+c.name+' ('+c.rs.length+' ticket'+(c.rs.length===1?'':'s')+'). '+c.rs.slice(0,12).map(r=>(r.k||'FIS')+(r.u?' '+r.u:'')).join('; '),
    differsFromToday: c.bo?('Built today: '+c.bo):'',
    successMeasure: c.outcome||''};
  const clash=Object.keys(prop).filter(k=>prop[k]&&String(v[k]||'').trim()&&String(v[k]).trim()!==prop[k]);
  let replace=false;
  if(clash.length){
    const L={productArea:'Product area',problem:'Problem statement',evidence:'Evidence',differsFromToday:'How it differs from today',successMeasure:'Success measure'};
    replace=await uiConfirm({title:'Replace what you wrote?',body:'<p>You have already written in: <b>'+clash.map(k=>L[k]).join(', ')+'</b>.</p><p>Replace it with the details from <b>'+dmE(c.name)+'</b>, or keep yours? The empty fields are filled either way.</p>',ok:'Replace',cancel:'Keep mine'});
  }
  Object.keys(prop).forEach(k=>{ if(!prop[k]) return; if(!String(v[k]||'').trim()||(replace&&clash.includes(k))) v[k]=prop[k]; });
  if(!(v.customers||[]).some(x=>x.client)&&ledCus.length) v.customers=ledCus.slice(0,6).map(x=>({client:x[2],contact:'',how:'',note:''}));
  v.related=[...new Set((v.related||[]).filter(x=>String(x).trim()).concat(keys.slice(0,15)))];
  if(!v.related.length) v.related=[''];
  f.dup.decision='used'; f.dup.choice=id; fePaint();
  if(!silent) uiToast('Filled from “'+c.name+'”. Check each field, then add what is new about your request.');
}
function dmClient(pd){
  if(!DM.data) return '';
  const ns=DM.data.clusters.filter(c=>c.rs.some(r=>(r.cu||[]).some(x=>x[2]===String(pd)))).map(c=>({c,n:c.rs.filter(r=>(r.cu||[]).some(x=>x[2]===String(pd))).length})).sort((a,b)=>b.n-a.n||b.c.rs.length-a.c.rs.length);
  if(!ns.length) return '<div class="empty" style="padding:12px">No open request names this client in the demand map.</div>';
  return `<div class="dm-c3">${ns.slice(0,8).map(x=>`<button type="button" class="rq" data-dmneed-c="${dmE(x.c.id)}"><span class="rq-t">${dmE(x.c.name)}</span><span class="rq-m">${dmE(x.c.product)} · ${x.n} of their ticket${x.n===1?'':'s'} · ${x.c.rs.length} in all</span><span class="rq-f"><span class="dm-b ${x.c.bs}">${DM_BUILT[x.c.bs]}</span></span></button>`).join('')}${ns.length>8?`<div class="small">+${ns.length-8} more needs in the Demand tab</div>`:''}</div>`;
}
window.DMC={load:dmLoad, client:dmClient, openNeed:dmOpenNeed};
(function dmWire(){
  document.addEventListener('click',e=>{ let b;
    if((b=e.target.closest('[data-dmneed],[data-dmneed-m],[data-dmneed-c]'))){ if(!DM.data) return; e.preventDefault(); const id=b.dataset.dmneed||b.dataset.dmneedM||b.dataset.dmneedC; if(b.dataset.dmneedM||b.dataset.dmneedC){ const x=document.querySelector('#modal[open] .x'); if(x&&b.dataset.dmneedM) x.click(); } dmOpenNeed(id); return; }
    if((b=e.target.closest('[data-dmreq]'))){ if(DM.data) dmOpenReq(b.dataset.dmreq); return; }
    if((b=e.target.closest('[data-dmlog]'))){ dmLogFrom(b.dataset.dmlog); return; }
    if((b=e.target.closest('[data-dmmore]'))){ const inForm=!!b.closest('#fe-sec0'), r=inForm?(FE.form&&FE.form.dres):DM.res; if(!r) return; r.all=true; const list=b.closest('.dm-list'); if(list) list.innerHTML=dmResultsHtml(r,inForm?'form':'tab'); return; }
  });
  const host=document.getElementById('dm-host'); if(!host) return;
  host.addEventListener('click',e=>{ let b;
    if((b=e.target.closest('#dm-src button'))){ DM.f.src=b.dataset.v; DM.page=0; DM.rpage=0; dmRender(); return; }
    if((b=e.target.closest('#dm-view button'))){ DM.view=b.dataset.v; dmRender(); return; }
    if(e.target.closest('#dm-clear')){ DM.f={src:'',tier:'',pr:'',cu:'',built:'',yr:'',q:''}; dmRender(); return; }
    if((b=e.target.closest('[data-dmz]'))){ DM.zoom=Math.max(1,Math.min(5,DM.zoom+ +b.dataset.dmz)); try{ localStorage.setItem('ep-dm-zoom',DM.zoom); }catch(_){} dmRender(); return; }
    if((b=e.target.closest('[data-dmq]'))){ DM.f.q=DM.f.q===b.dataset.dmq?'':b.dataset.dmq; DM.rpage=0; dmRender(); return; }
    if((b=e.target.closest('[data-dmheat]'))){ const [p,t]=b.dataset.dmheat.split('|'); DM.f.pr=p; DM.view='needs'; DM.sort={k:'rank',dir:1}; DM.page=0; DM.f.tier=t; dmRender(); return; }
    if((b=e.target.closest('[data-dmbar]'))){ const [k,val]=b.dataset.dmbar.split('|'); DM.f[k]=DM.f[k]===val?'':val; DM.rpage=0; dmRender(); return; }
    if((b=e.target.closest('[data-dmsort]'))){ const k=b.dataset.dmsort; DM.sort=DM.sort.k===k?{k,dir:-DM.sort.dir}:{k,dir:1}; dmRender(); return; }
    if((b=e.target.closest('[data-dmpage]'))){ DM.page+= +b.dataset.dmpage; dmRender(); return; }
    if((b=e.target.closest('[data-dmrpage]'))){ DM.rpage+= +b.dataset.dmrpage; dmRender(); return; }
  });
  host.addEventListener('change',e=>{ const s=e.target.closest('[data-dmf]'); if(!s) return; DM.f[s.dataset.dmf]=s.value; DM.page=0; DM.rpage=0; dmRender(); });
  const tab=document.querySelector('.tab[data-tab="demand"]');
  if(tab) tab.addEventListener('click',()=>{ if(!host.dataset.done){ host.dataset.done='1'; dmRender(); } });
  if(String(location.hash).replace('#','')==='demand'){ host.dataset.done='1'; dmRender(); }
})();

// ================= Feature ledger: log a new work item (exploring/, Feature Scoring Model of 25 Sep 2026) =================
// The whole intake form of exploring/02-entry-schema.md, in the Requests tab. A logged item is a ledger entry
// (ledger/<LE id>) with its append-only event log (ledger-events/<LE id>). Signing, review, estimate, approval and
// pickup follow exploring/03-lifecycle.md and are the next build step once the open decisions are answered.
const FE = {db:null, rows:[], ev:{}, ready:false, err:null, names:{}, form:null, mine:false, subs:[]};
const feE = uiEsc;
const FE_LEVERS=[
  {k:'increase-revenue', l:'Increase revenue', q:'New or expansion revenue: by how much?', fig:'Revenue gained (£)', owner:'sales', kind:'revenue'},
  {k:'retain-revenue', l:'Retain revenue', q:'How much revenue is at risk of churn if we do not do it?', fig:'Contract value at risk (£)', owner:'sales', kind:'revenue'},
  {k:'reduce-cost', l:'Reduce cost', q:'Time we spend today that goes away', fig:'Hours saved × rate', owner:'operations', kind:'hours'},
  {k:'avoid-cost', l:'Avoid cost', q:'Mistakes, incidents or rework we stop paying for', fig:'Hours avoided × rate', owner:'operations', kind:'hours'}];
const FE_LAYERS=[['sales','Sales'],['relationship','Relationship: account management, customer success, TAMs'],['operations','Operations'],['product-engineering','Product & Engineering'],['other','Other']];
const FE_SOURCES=[['intake-form','Intake form (this form)'],['fis','FIS page'],['jira-fr','Jira feature request'],['meeting','Meeting']];
const FE_WHO=['Organiser admin','Exhibitor','Visitor / attendee','Speaker','Sponsor','Internal (TAM, support, finance)'];
const FE_SURF=[['admin','Admin panel'],['web','Web frontend'],['app','Mobile app'],['api','API'],['reports','Reports / statistics']];
const FE_HOW=['Call','Email','Ticket','QBR','Meeting','Other'];
const FE_STAGES=['Draft','Awaiting signature','Awaiting review','Awaiting estimate','Awaiting approval','On the ledger · not scheduled','Picked up · scheduled','In delivery','Delivered · check due','Done'];
const FE_STEP={draft:1,submitted:2,signed:3,reviewed:4,estimated:5,approved:6,parked:6,'picked-up':7,'in-delivery':8,delivered:9,checked:10,closed:10};
const FE_ASSUMPTION_MAX=140;
const feLS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; };
const feNow=()=>new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
const feGBP=n=>n==null||n===''||isNaN(+n)?'—':'£'+Math.round(+n).toLocaleString('en-GB');
const feNum=x=>{ const n=parseFloat(String(x??'').replace(/[£,\s]/g,'')); return isFinite(n)?n:null; };
const feFilled=x=>Array.isArray(x)?x.some(y=>feFilled(y)):(x&&typeof x==='object')?Object.values(x).some(feFilled):String(x??'').trim()!=='';
const feMe=()=>{ const cl=CLB(); return cl&&cl.me?cl.me():{uid:null,ok:false}; };
function feBlank(){
  const me=feMe();
  return {raisedBy:{id:me.uid||null}, raisingLayer:'', source:{kind:'intake-form',ref:''}, title:'', client:'', productArea:'', problem:'', evidence:'',
    neededBy:'', urgencyReason:'', customers:[{client:'',contact:'',how:'',note:''}], whoFor:[], userStory:'', currentWorkaround:'', differsFromToday:'',
    userJourneyImpact:'', surfaces:{on:[],notes:{}}, acceptanceCriteria:[''], successMeasure:'', eventsImpacted:[], attachments:[''], related:[''],
    dependencies:'', risks:'', alternativesConsidered:'',
    lever:'', figureGBP:'', figureBasis:{hours:'',rateGBP:'',rateSource:''}, figureText:'', assumption:'', figureDetail:{},
    funded:{yes:null,contributionGBP:'',agreedEstimateDays:'',dealRef:'',termsNote:'',paymentTerms:''},
    existingGrowing:{yes:null,currentARRGBP:'',growthGBP:'',sizingNote:''}};
}
const feLever=v=>FE_LEVERS.find(x=>x.k===v.lever)||null;
// hours behind a cost figure: hours per event × events a year, or incidents a year × hours each (02-entry-schema §3 figureDetail)
function feHours(v){
  const d=v.figureDetail||{};
  const a=feNum(d.hoursPerEvent), b=feNum(d.eventsPerYear), c=feNum(d.incidentsPerYear), e=feNum(d.hoursEach);
  if(a!=null&&b!=null) return a*b;
  if(c!=null&&e!=null) return c*e;
  return feNum((v.figureBasis||{}).hours);
}
function feFigure(v){
  const lv=feLever(v); if(!lv) return null;
  if(lv.kind==='revenue') return feNum(v.figureGBP);
  const h=feHours(v), r=feNum((v.figureBasis||{}).rateGBP);
  return h!=null&&r!=null?h*r:null;
}
// who signs the figure (fs-signer) and who confirms the funding (fs-funded-approver), shown from the moment it is logged
function feSigner(v){
  const lv=feLever(v); if(!lv) return null;
  const onlyChris=['sales','relationship'].includes(v.raisingLayer);
  const fundedBy=v.funded&&v.funded.yes?(onlyChris?'Chris':'Chris or Ajay'):null;
  let who, role, rule='fs-signer';
  if(lv.owner==='sales'){ who=fundedBy||'Chris'; role=fundedBy?'Funding approver (signs the figure too)':'Sales'; if(fundedBy) rule='fs-funded-approver'; }
  else if(v.raisingLayer==='product-engineering'){ who='Bartosz or Ajay'; role='Product & Engineering (engineering hours)'; }
  else { who='Susan or Ilaria'; role='Operations'; }
  return {who, role, rule, fundedBy, fundedRule:fundedBy?(onlyChris?'raised by '+(v.raisingLayer==='sales'?'Sales':'the relationship team')+': Chris only':'not raised by Sales or the relationship team: Chris or Ajay'):''};
}
// Two levels (28 Sep 2026, owner): five fields are needed to LOG an item; every other required field is needed
// BEFORE SIGNING. It can be left for later or handed to the colleague who knows it (v.handoff), and the item waits on them.
const FE_LOG_REQ=new Set(['raisedBy','title','client','productArea','problem']);
const FE_HAND_HINT={existingGrowing:['Chris','Sales sizes the growth'],funded:['Chris','Sales confirms the funding'],figureDetail:['Chris','Sales holds the deal and contract details'],
  figureGBP:['Chris','Sales owns revenue figures'],rateGBP:['Susan','Operations sets the rate'],rateSource:['Susan','Operations sets the rate'],hours:['',''],raisingLayer:['',''],evidence:['',''],customers:['','']};
function feLogErrors(v){ const e=feErrors(v), o={}; Object.keys(e).forEach(k=>{ if(FE_LOG_REQ.has(k)) o[k]=e[k]; }); return o; }
function feOwed(v){ const e=feErrors(v), o={}; Object.keys(e).forEach(k=>{ if(!FE_LOG_REQ.has(k)) o[k]=e[k]; }); return o; }
const FE_OWED_L={raisingLayer:'Raising layer',source:'Source',evidence:'Evidence',urgencyReason:'Why by then',customers:'Customers',whoFor:'Users affected',userStory:'User story',
  currentWorkaround:'How it is handled today',lever:'Value lever',figureGBP:'The £ figure',hours:'Hours',rateGBP:'Hourly rate',rateSource:'Where the rate comes from',figureText:'The figure in words',
  assumption:'Assumption',figureDetail:'Deal or contract details',funded:'Funding',existingGrowing:'Existing revenue and growth'};
// who an item's owed details wait on: the colleagues they were handed to, and the requester for the rest
function feOwedWho(r){ const v=r.v||{}, ow=Object.keys(feOwed(v)); if(!ow.length) return null; const hf=v.handoff||{};
  const to=[...new Set(ow.map(k=>(hf[k]||{}).to||(r.raisedBy||{}).id||r.loggedBy).filter(Boolean))]; return {keys:ow, to}; }
// required when the item is logged (the S fields of 02-entry-schema.md); each names what is missing
function feErrors(v){
  const e={}, lv=feLever(v), d=v.figureDetail||{};
  const need=(k,msg,ok)=>{ if(!ok) e[k]=msg; };
  need('raisingLayer','Say which layer raised it. It decides who approves a funded item.',v.raisingLayer);
  need('source','Say where the request came from.',v.source&&v.source.kind);
  if(v.source&&v.source.kind&&v.source.kind!=='intake-form') need('source','Give the page, Jira key or meeting date it came from.',String(v.source.ref||'').trim());
  need('raisedBy','Choose who the request comes from.',v.raisedBy&&v.raisedBy.id);
  need('title','Give the work item a name.',String(v.title).trim());
  if(String(v.title).length>90) e.title='Keep the name to 90 characters.';
  need('client','Choose the client it is for, or Platform.',v.client);
  need('productArea','Choose the product area.',v.productArea);
  need('problem','Describe what is wrong today, and for whom.',String(v.problem).trim());
  need('evidence','Add the tickets, calls, emails or data behind the problem.',String(v.evidence).trim());
  if(String(v.neededBy).trim()) need('urgencyReason','Say why it is needed by that date: a contract clause, an event, a renewal.',String(v.urgencyReason).trim());
  need('customers','Name at least one customer asking for it.',(v.customers||[]).some(c=>c.client));
  need('whoFor','Choose the users it affects.',(v.whoFor||[]).length);
  need('userStory','Write it as “As a …, I want …, so that …”.',String(v.userStory).trim());
  need('currentWorkaround','Say how it is handled today and what that costs.',String(v.currentWorkaround).trim());
  need('lever','Choose exactly one value lever.',lv);
  if(lv){
    if(lv.kind==='revenue') need('figureGBP','State the £ figure; it must be more than 0.',feNum(v.figureGBP)>0);
    else {
      need('hours','Give the hours: per event × events a year, or incidents a year × hours each.',feHours(v)>0);
      need('rateGBP','Give the hourly rate in £.',feNum((v.figureBasis||{}).rateGBP)>0);
      need('rateSource','Say where the rate comes from.',String((v.figureBasis||{}).rateSource||'').trim());
    }
    need('figureText','Say the figure in your own words, e.g. “100 hours = £20k of TAM time”.',String(v.figureText).trim());
    need('assumption','One line on what the figure rests on.',String(v.assumption).trim());
    if(String(v.assumption).length>FE_ASSUMPTION_MAX||/\n/.test(v.assumption)) e.assumption='Keep the assumption to one line of '+FE_ASSUMPTION_MAX+' characters.';
    if(lv.k==='increase-revenue') need('figureDetail','Give the deal: reference, stage, expected close, new or expansion.',d.dealRef&&d.dealStage&&d.expectedClose&&d.kind);
    if(lv.k==='retain-revenue') need('figureDetail','Give the contract value, renewal date, the churn signal and where it came from.',feNum(d.contractValueGBP)>0&&d.renewalDate&&d.churnSignal&&d.signalSource);
    if(lv.kind==='hours') need('figureDetail','Say who spends the hours (team, role) and where the count comes from.',d.whoSpends&&d.countSource);
  }
  need('funded','Say whether the customer pays towards it.',v.funded&&v.funded.yes!==null);
  if(v.funded&&v.funded.yes){ need('funded','Give the contribution and the agreed estimate in days.',feNum(v.funded.contributionGBP)>0&&feNum(v.funded.agreedEstimateDays)>0); }
  need('existingGrowing','Say whether this is revenue we already earn that will grow.',v.existingGrowing&&v.existingGrowing.yes!==null);
  if(v.existingGrowing&&v.existingGrowing.yes){ need('existingGrowing','Give the current ARR and the growth in £.',feNum(v.existingGrowing.currentARRGBP)>0&&feNum(v.existingGrowing.growthGBP)>0); }
  return e;
}
// details % (fs-completeness): the share of the detail and value fields filled, with the missing ones named
const FE_DETAIL=[['customers','Customers',v=>(v.customers||[]).some(c=>c.client&&(c.contact||c.how))],['whoFor','Who it is for',v=>(v.whoFor||[]).length],
  ['userStory','User story',v=>v.userStory],['currentWorkaround','Current workaround',v=>v.currentWorkaround],['differsFromToday','How it differs from today',v=>v.differsFromToday],
  ['userJourneyImpact','User journey impact',v=>v.userJourneyImpact],['surfaces','Surfaces',v=>(v.surfaces.on||[]).length],
  ['acceptanceCriteria','Acceptance criteria',v=>(v.acceptanceCriteria||[]).filter(x=>String(x).trim()&&!/^\s*\d*\s*(…|\.\.\.)\s*$/.test(x)).length],
  ['successMeasure','Success measure',v=>v.successMeasure],['eventsImpacted','Events impacted',v=>(v.eventsImpacted||[]).length],
  ['attachments','Attachments',v=>(v.attachments||[]).some(x=>String(x).trim())],['related','Related items',v=>(v.related||[]).some(x=>String(x).trim())],
  ['dependencies','Dependencies',v=>v.dependencies],['risks','Risks',v=>v.risks],['alternativesConsidered','Alternatives considered',v=>v.alternativesConsidered],
  ['lever','Value lever',v=>v.lever],['figure','Figure',v=>feFigure(v)>0],['figureText','Figure in words',v=>v.figureText],['assumption','Assumption',v=>v.assumption],
  ['figureDetail','Working behind the figure',v=>feFilled(v.figureDetail)],['funded','Funded',v=>v.funded.yes!==null],['existingGrowing','Existing and growing',v=>v.existingGrowing.yes!==null]];
function feCompleteness(v){
  const miss=FE_DETAIL.filter(([k,l,f])=>!f(v)).map(([k,l])=>l);
  return {score:Math.round((FE_DETAIL.length-miss.length)/FE_DETAIL.length*100), missing:miss};
}
// the basic intake check, run in the page before Log. The intake agent replaces it at go-live (exploring/02 §2 intakeCheck)
function feIntake(v){
  const notes=[], lv=feLever(v), words=String(v.problem).trim().split(/\s+/).filter(Boolean).length;
  const ph=/\b(tbd|tbc|todo|lorem|xxx)\b|^\s*(…|\.\.\.)\s*$/i;
  let glossary='pass', clarity='pass';
  // no lever yet is fine at logging: the lever is needed before signing (FE_LOG_REQ), not to log
  if(lv&&lv.kind==='hours'&&/£\s?\d/.test(v.figureText)&&!/h(ou)?rs?\b/i.test(v.figureText)){ glossary='fail'; notes.push('A cost lever is stated in hours × rate; the figure text should name the hours.'); }
  if(lv&&String(v.assumption).trim()&&String(v.assumption).trim()===String(v.figureText).trim()){ glossary='fail'; notes.push('The assumption repeats the figure; say what the figure rests on.'); }
  if(words<12){ clarity='fail'; notes.push('The problem statement is '+words+' words; say what is wrong today and for whom in at least 12.'); }
  if(ph.test(v.problem)||ph.test(v.userStory)){ clarity='fail'; notes.push('The problem or user story still has placeholder text.'); }
  if(String(v.userStory).trim()&&!/\bas an?\b[\s\S]*\bi want\b[\s\S]*\bso that\b/i.test(v.userStory)){ clarity='fail'; notes.push('The user story does not follow “As a …, I want …, so that …”.'); }
  if(String(v.problem).trim()&&String(v.problem).trim().toLowerCase()===String(v.title).trim().toLowerCase()){ clarity='fail'; notes.push('The problem repeats the title.'); }
  return {glossary, problemClarity:clarity, notes, at:feNow(), by:'page-check'};
}

// ---------- the shared database ----------
async function feBoot(){
  try{ FE.db=await claude.use('db'); }catch(e){ FE.db=null; }
  if(!FE.db){ FE.ready=true; feRender(); return; }
  const onErr=e=>{ FE.err=(e&&e.code)||'unavailable'; FE.ready=true; feRender(); };
  FE.subs.push(FE.db.collection('ledger').onSnapshot(s=>{ FE.all=s.docs.map(d=>Object.assign({_id:d.id},d.data())); feSeen(); FE.ready=true; feRender(); feNames(); if(window.btOnRows) window.btOnRows();
    if(FE.pendingOpen&&FE.rows.some(x=>x._id===FE.pendingOpen)){ const id=FE.pendingOpen; FE.pendingOpen=null; feOpenEntry(id); } },onErr));
  FE.subs.push(FE.db.collection('ledger-events').onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=(d.data()||{}).e||{}; }); FE.ev=m; if(FE.openId) feOpenEntry(FE.openId,true); },()=>{}));
}
// Beta test items (test:true) count only for a viewer with test mode on (Settings → Sync & logs → Beta lab)
function feSeen(){ FE.rows=(FE.all||[]).filter(r=>!r.test||!!(window.BT&&window.BT.test)); }
async function feNames(){
  const me=feMe(); if(!me.user||!me.user.profiles) return;
  const ids=[...new Set(FE.rows.flatMap(r=>[r.loggedBy,(r.raisedBy||{}).id].concat(Object.values((r.v||{}).handoff||{}).map(h=>h.to))).concat(Object.values(FE.ev).flatMap(m=>Object.values(m).map(e=>e.by))).filter(x=>x&&x!=='claude'))];
  if(!ids.length) return;
  try{ const ps=await me.user.profiles(ids); let ch=false; ids.forEach(i=>{ const n=(ps[i]&&ps[i].name)||''; if(FE.names[i]!==n){ FE.names[i]=n; ch=true; } }); if(ch){ feRender(); if(FE.form) fePaintSide(); } }catch(e){}
}
const feName=id=>!id?'someone':id==='claude'?'Claude':id===feMe().uid?'you':(FE.names[id]||'a colleague');
// days in a stage (and the amber / red warning) are shown to Ajay only; everyone else sees the stage and who it waits on
const feSeesDays=()=>!!(window.EP_ACCESS&&window.EP_ACCESS.ajay);
const feDays=(g,tail)=>g.dayText===''?'':' · '+g.days+' day'+(g.days===1?'':'s')+(tail||'');
function feStage(r){ const g=feStage1(r); if(!feSeesDays()){ g.dayText=''; if(g.cls!=='stop') g.cls=''; } return g; }
function feStage1(r){
  const st=r.status, last=Object.values(FE.ev[r._id]||{}).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0];
  const since=(last&&last.at)||r.loggedAt, days=since?Math.max(0,Math.floor((Date.now()-Date.parse(since))/864e5)):0;
  if(st==='returned') return {step:FE_STEP[r.returnedFrom]||2, label:'Needs details', waiting:feName((r.infoRequest||{}).assignedTo||r.loggedBy), days, cls:'amber'};
  if(['rejected','withdrawn','merged'].includes(st)) return {step:0, label:'Stopped · '+st, waiting:'nobody', days, cls:'stop'};
  const step=FE_STEP[st]||1, s=r.signer||{};
  if(st==='submitted'){ const ow=feOwedWho(r); if(ow) return {step, label:'Awaiting details', waiting:ow.to.map(feName).join(', '), days, cls:days>10?'red':days>5?'amber':'', owed:ow}; }
  const waiting={submitted:s.who||'the signer',signed:'Ajay',reviewed:'Bartosz',estimated:'Ajay',approved:'the product-business meeting',parked:'the product-business meeting','picked-up':'the delivery team','in-delivery':'the delivery team',delivered:s.who||'the signer'}[st]||'nobody';
  return {step, label:FE_STAGES[step-1], waiting, days, cls:days>10?'red':days>5?'amber':''};
}


// ---------- the whole flow, as a swimlane diagram (exploring/03-lifecycle.md). With a stage, that step is lit. ----------
const FE_LANES=['Requester','Lever owner (signs)','Product & Engineering','Product-business meeting','Delivery team'];
const FE_FLOW=[
  {lane:0,l:'Draft',w:'Requester',d:'Fills the form, searches for duplicates, logs it'},
  {lane:1,l:'Awaiting signature',w:'Chris · Susan / Ilaria · funding approver',d:'Signs the £ figure; confirms funding or growth'},
  {lane:2,l:'Awaiting review',w:'Ajay',d:'Weekly review of quality and value'},
  {lane:2,l:'Awaiting estimate',w:'Bartosz',d:'Build effort in person-days'},
  {lane:2,l:'Awaiting approval',w:'Ajay',d:'Tier, net value and rank'},
  {lane:3,l:'On the ledger · not scheduled',w:'Product-business meeting',d:'Pick up, park or reject'},
  {lane:3,l:'Picked up · scheduled',w:'Meeting; dates by Bartosz',d:'Team, expected start and due'},
  {lane:4,l:'In delivery',w:'Delivery team (Jira)',d:'First In progress to deploy'},
  {lane:1,l:'Delivered · check due',w:'The signer',d:'Did the figure hold?'},
  {lane:2,l:'Done',w:'Ajay closes it',d:'The signer’s track record is kept'}];
function feWrap(t,n){ const out=[]; let cur=''; String(t).split(' ').forEach(w=>{ if((cur+' '+w).trim().length>n&&cur){ out.push(cur); cur=w; } else cur=(cur+' '+w).trim(); }); if(cur) out.push(cur); return out; }
function feFlowSvg(st,opt){
  const pick=!!(opt&&opt.pick);
  const W=1220, LW=150, H0=34, LH=100, NW=98, NH=84, cw=(W-LW)/10, Hh=H0+LH*5+54;
  const cur=st?st.step:0, back=st&&st.label==='Needs details', stop=st&&st.step===0;
  const pos=i=>({x:LW+i*cw+(cw-NW)/2, y:H0+FE_FLOW[i].lane*LH+(LH-NH)/2});
  let s=`<svg class="fe-flow" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="The feature ledger flow: ten steps across five lanes${st?', currently at step '+cur:''}"><defs><marker id="fe-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ctl)"/></marker><marker id="fe-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c98a00"/></marker></defs>`;
  FE_LANES.forEach((l,i)=>{ const y=H0+i*LH; s+=`<rect x="0" y="${y}" width="${W}" height="${LH}" class="fe-lane${i%2?' alt':''}"/><text x="12" y="${y+LH/2+4}" class="fe-ll">${feE(l)}</text>`; });
  // approval is not a commitment: the line between step 6 and step 7
  const xc=LW+6*cw;
  s+=`<line x1="${xc}" y1="${H0-6}" x2="${xc}" y2="${H0+LH*5}" class="fe-commit"/><text x="${xc-8}" y="${H0-12}" text-anchor="end" class="fe-ct">Approved: on the ledger, no dates</text><text x="${xc+8}" y="${H0-12}" class="fe-ct b">Picked up: the commitment to build</text>`;
  for(let i=0;i<9;i++){ const a=pos(i), b=pos(i+1), x1=a.x+NW, y1=a.y+NH/2, x2=b.x, y2=b.y+NH/2, mx=(x1+x2)/2;
    s+=`<path d="M${x1} ${y1} H${mx} V${y2} H${x2-2}" class="fe-edge${cur&&i+1<cur?' done':''}" marker-end="url(#fe-ar)"/>`; }
  // needs details: from the review lane back to the requester, and back to the same step
  const r0=pos(2);
  const d0=pos(0);
  s+=`<path d="M${r0.x+NW/2} ${r0.y} C ${r0.x+NW/2} ${d0.y+NH/2}, ${d0.x+NW+60} ${d0.y+NH/2}, ${d0.x+NW+4} ${d0.y+NH/2}" class="fe-back${back?' on':''}${pick?' fe-pick':''}" marker-end="url(#fe-ar2)"${pick?' data-fewstep="back"':''}/>`;
  s+=`<text x="${r0.x+NW/2+10}" y="${d0.y+20}" class="fe-bt">Needs details: back to the requester,</text><text x="${r0.x+NW/2+10}" y="${d0.y+34}" class="fe-bt">then returns to the same step</text>`;
  FE_FLOW.forEach((n,i)=>{ const p=pos(i), k=i+1, isCur=k===cur, done=cur&&k<cur, cls='fe-node'+(isCur?(back?' back':' cur'):done?' done':'')+(stop&&!isCur?' dim':'');
    const lab=feWrap(n.l.replace(' · ',' '),11).slice(0,3), who=feWrap(n.w,18).slice(0,2);
    s+=`<g class="${cls}${pick?' fe-pick':''}"${pick?` data-fewstep="${k}" role="button" tabindex="0" aria-pressed="${isCur&&!back}" aria-label="${feE('Go to step '+k+', '+n.l)}"`:''}><rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="10"/><circle cx="${p.x+13}" cy="${p.y+13}" r="9" class="fe-nc"/><text x="${p.x+13}" y="${p.y+17}" text-anchor="middle" class="fe-nn">${done?'✓':k}</text>
      ${lab.map((t,j)=>`<text x="${p.x+27}" y="${p.y+17+j*13}" class="fe-nl">${feE(t)}</text>`).join('')}
      ${who.map((t,j)=>`<text x="${p.x+8}" y="${p.y+NH-18+j*11}" class="fe-nw">${feE(t)}</text>`).join('')}<title>${feE('Step '+k+' · '+n.l+' — '+n.w+'. '+n.d)}</title></g>`;
    if(isCur&&st){ const tx=[back?'Needs details':'Now here','waiting on '+st.waiting,st.dayText!=null?st.dayText:st.days+' day'+(st.days===1?'':'s')].filter(Boolean).join(' · '), tw=Math.min(W-8,Math.max(120,tx.length*6.2+22));
      // put the callout where it covers no other step, no label and no header: below, above, then shifted either way
      const obs=FE_FLOW.map((_,j)=>j).filter(j=>j!==i).map(j=>{ const q=pos(j); return [q.x-4,q.y-4,q.x+NW+4,q.y+NH+4]; }).concat([[r0.x+NW/2+6,d0.y+8,r0.x+NW/2+250,d0.y+38],[xc-260,0,xc+260,H0-2]]);
      const cl=x=>Math.max(4,Math.min(W-tw-4,x)), ok=(x,y)=>!obs.some(o=>x<o[2]&&x+tw>o[0]&&y<o[3]&&y+20>o[1])&&y>=2&&y+20<=Hh-24;
      const cand=[[cl(p.x+NW/2-tw/2),p.y+NH+6],[cl(p.x+NW/2-tw/2),p.y-26],[cl(p.x+NW-tw),p.y+NH+6],[cl(p.x),p.y+NH+6],[cl(p.x+NW-tw),p.y-26],[cl(p.x),p.y-26]];
      const [bx,by]=cand.find(c=>ok(c[0],c[1]))||cand[0];
      s+=`<g class="fe-callout${back?' back':''}"><rect x="${bx}" y="${by}" width="${tw}" height="20" rx="10"/><text x="${bx+tw/2}" y="${by+14}" text-anchor="middle">${feE(tx)}</text></g>`; }
  });
  s+=`<text x="${LW}" y="${Hh-14}" class="fe-foot">Side exits: Parked (on the ledger, “not now”, with a date to look again) · Rejected (with a reason) · Withdrawn (by the requester) · Merged (a duplicate of another item).</text></svg>`;
  return `<div class="fe-flowwrap">${s}</div>`;
}
function feOpenFlow(){
  const cl=CLB(); if(!cl||!cl.modal) return;
  cl.modal('How a work item moves through the feature ledger','<span>Ten steps, five owners</span><span>Every step is recorded: who, when, and what changed</span>',
    feFlowSvg(null)+`<div class="fe-rules">
      <div><b>Every action is recorded.</b> Who logged it, signed it, approved it and decided to pick it up, each with a time and the values before and after.</div>
      <div><b>Approval is not pickup.</b> Approved puts an item on the ranked ledger. Only the product-business meeting commits to build, with a team and expected dates.</div>
      <div><b>One figure, one signature.</b> Changing the lever, the figure or the assumption voids the signature and sends the item back to be signed.</div>
      <div><b>Who approves a funded item depends on who raised it.</b> Sales or the relationship team: Chris only. Any other route: Chris or Ajay.</div>
      <div><b>Everyone sees the current stage.</b> Ajay can send an item back for details at any step before pickup; it returns to the same step once answered.</div>
      <div><b>Search before you log.</b> The form checks the demand map for the same need, so effort is not duplicated.</div></div>`,'<span>Open any item on the ledger to see where it is on this flow.</span><button type="button" class="ibtn primary" data-fewalk>&#9654; Walk through a sample item</button>');
  const box=document.querySelector('#modal .box'); if(box) box.classList.add('fe-wide','fe-xwide');
}
// ---------- a sample item, step by step (exploring/08-worked-example.md, example A). Made-up client; nothing is saved. ----------
const FE_WALK=[
  {at:'2026-09-28',step:1,label:'Draft',waiting:'the TAM',who:'The TAM',role:'Requester',k:'create',st:'draft',ev:'started a draft',
   act:'Opens “Log a new work item” and searches the demand map first: no existing need covers offline scanning, so it is new. Fills the problem, evidence, customers, user story and today’s workaround. Lever: increase revenue, £100,000, on the assumption “Client A’s 2027 renewal adds the lead-retrieval module, from the renewal call”. Funded: yes, Client A pays £15,000 towards it and has agreed to 20 days. Raised by: Chris (Sales).',
   why:'The page names the signer from the lever and from who raised it. Funded and raised by Sales, so only Chris can sign the figure and confirm the funding.',rule:'fs-signer · fs-funded-approver',set:{details:70}},
  {at:'2026-09-28',step:1,label:'Draft',waiting:'the TAM (ready to log)',who:'The intake check',role:'In the page',k:'check',st:'draft',ev:'intake check: glossary pass, problem clarity pass',
   act:'Checks the wording against the glossary, and that the problem is stated as a problem rather than a solution. Both pass.',
   why:'A request that fails either check cannot be logged until it is fixed, so nobody downstream has to decode it.',rule:'intake check',set:{intake:true}},
  {at:'2026-09-28',step:2,label:'Awaiting signature',waiting:'Chris',who:'The TAM',role:'Requester',k:'log',st:'submitted',ev:'logged it',
   act:'Presses Log. The item gets its id, LE-2026-0001. Logged by: the TAM. Raised by: Chris. Both names are kept.',
   why:'From this moment everyone sees it on the ledger, with its stage, who it is waiting on, and for how long.',rule:'T2 · draft → submitted',set:{id:'LE-2026-0001',logged:true}},
  {at:'2026-09-29',step:3,label:'Awaiting review',waiting:'Ajay',who:'Chris',role:'Sales · funding approver',k:'sign',st:'signed',ev:'confirmed the funding and signed £100,000',
   act:'Confirms the funding (deal reference and terms) and signs £100,000. Chris raised it and is the only Sales signer, so the item is flagged self-signed.',
   why:'One figure, one signature. If the lever, the figure or the assumption changes later, the signature is void and the item goes back to be signed.',rule:'T3 · fs-void-on-change',set:{signed:true,funded:true,self:true}},
  {at:'2026-10-01',step:3,label:'Needs details',waiting:'the TAM',who:'Ajay',role:'P&E · weekly review',k:'return',st:'returned',ev:'sent it back for details (3 questions)',back:true,
   act:'Sends it back with three questions: the acceptance criteria are still the template placeholders, there is no success measure, and it does not say what the admin panel needs.',
   why:'Sending back is not rejecting. The item keeps its place at step 3, shows who it waits on and by when, and returns to the same step once answered.',rule:'T6 · fs-info-due',set:{questions:3}},
  {at:'2026-10-02',step:3,label:'Awaiting review',waiting:'Ajay',who:'The TAM',role:'Requester',k:'resubmit',st:'signed',ev:'answered all three and resubmitted',
   act:'Answers all three: five acceptance criteria; the success measure “Client A signs the expansion, and zero lost scans at their next show”; and the admin settings needed. Resubmits.',
   why:'No signed value changed, so Chris’s signature still holds. Details rise from 70% to 95%.',rule:'T17 · back to the step it came from',set:{questions:0,details:95}},
  {at:'2026-10-02',step:4,label:'Awaiting estimate',waiting:'Bartosz',who:'Ajay',role:'P&E · weekly review',k:'review',st:'reviewed',ev:'reviewed it: quality pass, value pass',
   act:'Quality: pass. Value: pass. Notes “self-signed accepted: Chris is the only Sales signer”.',
   why:'The self-sign is flagged and accepted in the open, never hidden.',rule:'T5',set:{reviewed:true}},
  {at:'2026-10-05',step:5,label:'Awaiting approval',waiting:'Ajay',who:'Bartosz',role:'P&E · delivery',k:'estimate',st:'estimated',ev:'estimated 24 person-days, Mobile team',
   act:'Estimates 24 person-days for the Mobile team, confidence medium.',
   why:'Build cost and net value appear: 24 days × £400 = £9,600, so net £90,400. 24 days is more than the 20 Client A agreed, and that shows before anyone commits.',rule:'T7 · fs-build-cost',set:{days:24,cost:9600,net:90400,over:true}},
  {at:'2026-10-06',step:6,label:'On the ledger · not scheduled',waiting:'the product-business meeting',who:'Ajay',role:'P&E',k:'approve',st:'approved',ev:'approved it to the ledger: Tier 2, rank #3',
   act:'Approves it to the ledger: Tier 2 (increase revenue, funded, confirmed and estimated), ranked #3.',
   why:'Approval is not a commitment to build. It carries no team and no dates, and the page says so: “On the ledger · not scheduled”.',rule:'T8 · fs-tier',set:{approved:true,tier:2,rank:3}},
  {at:'2026-10-12',step:7,label:'Picked up · scheduled',waiting:'the delivery team',who:'The product-business meeting',role:'Ajay records · Bartosz confirms dates',k:'pickup',st:'picked-up',ev:'picked it up: Mobile team, 2 FTE',
   act:'Picks it up: Mobile team, 2 FTE, Jira item EP-60001. The over-estimate is noted, and Sales will tell Client A.',
   why:'Only this meeting commits to build. The schedule comes from the estimate: 24 days ÷ 2 FTE + 3 days QA + 2 days release = 17 business days of build, starting when the Mobile team is next free. The start and due dates are set here, and that baseline is frozen.',rule:'T12 · fs-pickup-lead',set:{picked:true,team:'Mobile · 2 FTE',jira:'EP-60001',sched:'set at pickup',baseline:'frozen'}},
  {at:'2026-10-20',step:8,label:'In delivery',waiting:'the delivery team',who:'The Jira sync',role:'Automatic',k:'start',st:'in-delivery',ev:'EP-60001 first In progress',
   act:'EP-60001 moves to In progress for the first time.',
   why:'Work started within the grace period after the expected start, so it stays on time.',rule:'T13',set:{started:true}},
  {at:'2026-10-27',step:8,label:'In delivery',waiting:'the delivery team',who:'Bartosz',role:'P&E · delivery',k:'re-estimate',st:'in-delivery',ev:'re-estimated: 28 person-days',
   act:'Re-estimates the work at 28 person-days.',
   why:'The cost becomes £11,200 and the net £88,800. The due date moves by 2 business days; the baseline stays where it was, and the drift is shown. It is not re-approved.',rule:'re-estimate · baseline kept',set:{days:28,cost:11200,net:88800,drift:'+2 business days'}},
  {at:'2026-11-12',step:9,label:'Delivered · check due',waiting:'Chris',who:'The Jira sync',role:'Automatic',k:'deliver',st:'delivered',ev:'EP-60001 Done and deployed',
   act:'EP-60001 is Done and deployed.',
   why:'The post-delivery check is now due, at Client A’s expansion date: did the £100,000 hold?',rule:'T14 · 07-post-delivery-check',set:{delivered:true}},
  {at:'2027-01-15',step:10,label:'Done',waiting:'nobody',who:'Chris answers, Ajay records',role:'Signer · P&E',k:'check',st:'checked',ev:'recorded the check: £85,000 booked',
   act:'The expansion is booked at £85,000.',
   why:'Verdict: partly. £85,000 is 85% of the signed figure, under the illustrative 90% threshold. It compares like with like: revenue booked against revenue signed.',rule:'T15',set:{actual:85000,verdict:'Partly (85%)'}},
  {at:'2027-01-15',step:10,label:'Done',waiting:'nobody',who:'Ajay',role:'P&E',k:'close',st:'closed',ev:'closed it',
   act:'Closes the item.',
   why:'Chris’s track record now reads 1 checked, 0 held, 1 partly. Over time this shows how far each signer’s figures can be relied on.',rule:'T16',set:{closed:true,track:'1 checked · 0 held · 1 partly'}}];
const FE_WK_SHORT=['Draft','Signature','Review','Estimate','Approval','On ledger','Picked up','Delivery','Delivered','Done'];
const feWkLab=x=>x.back?'Details':FE_WK_SHORT[x.step-1];
const feWkDate=(s,y)=>{ const d=new Date(s+'T12:00:00Z'); return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+(y?' '+d.getUTCFullYear():''); };
function feWkState(i){ const s={}; for(let k=0;k<=i;k++) Object.assign(s,FE_WALK[k].set); return s; }
function feWkStage(i){ return feWkStage0(i); }
function feWkStage0(i){ const m=FE_WALK[i]; let j=i+1; while(j<FE_WALK.length&&FE_WALK[j].step===m.step&&!!FE_WALK[j].back===!!m.back) j++;
  return {step:m.step,label:m.label,waiting:m.waiting,days:0,dayText:'',cls:''}; }
function feWkBody(i){
  const m=FE_WALK[i], s=feWkState(i), g=feWkStage(i), N=FE_WALK.length;
  const kv=rows=>'<dl class="sx-kv">'+rows.filter(x=>x[1]).map(([k,v])=>`<dt>${feE(k)}</dt><dd>${v}</dd>`).join('')+'</dl>';
  const stamps=[['Logged',s.logged],['Figure signed',s.signed],['Funding confirmed',s.funded],['Reviewed',s.reviewed],['Estimated',s.days!=null],['Approved to ledger',s.approved],['Picked up',s.picked],['Delivered',s.delivered],['Checked',s.verdict]];
  const rail=FE_WALK.map((x,k)=>`<button type="button" class="fe-wk-m${k<i?' done':''}${x.back?' back':''}" data-fewkto="${k}" aria-pressed="${k===i}" title="${feE((k+1)+' · '+x.who+' '+x.ev)}"><b>${k+1}</b><span>${feE(feWkLab(x))}</span></button>`).join('');
  const hist=FE_WALK.slice(0,i+1).map((x,k)=>`<div${k===i?' class="cur"':''}><span class="sx-dim">${feE(x.back?'Needs details':x.label)}</span> · <b>${feE(x.who)}</b> ${feE(x.ev)}</div>`).reverse().join('');
  return `<div id="fe-wk" class="fe-wk" data-i="${i}">
    <div class="fe-wk-note"><b>Sample item.</b> Client A is made up. The £400 day rate, the QA and release allowances and the 90% check threshold are placeholders until the open decisions are agreed. Nothing here is saved.</div>
    <div class="fe-wk-bar"><button type="button" class="ibtn" data-fewk="-1"${i?'':' disabled'}>&#8592; Previous</button>
      <div class="fe-wk-pos"><b>Moment ${i+1} of ${N}</b><span>${m.back?'Step '+m.step+' · Needs details':'Step '+m.step+' of 10 · '+feE(m.label)}</span></div>
      <button type="button" class="ibtn primary" data-fewk="1"${i<N-1?'':' disabled'}>Next &#8594;</button></div>
    <div class="fe-wk-rail" role="group" aria-label="Moments">${rail}</div>
    ${feFlowSvg(g,{pick:true})}
    <div class="fe-wk-cols"><div class="fe-wk-now">
      <div class="seclabel">What happens</div>
      <div class="fe-wk-who"><b>${feE(m.who)}</b><span>${feE(m.role)}</span></div>
      <p class="fe-wk-act">${feE(m.act)}</p>
      <div class="fe-wk-why"><b>Why it matters</b>${feE(m.why)}</div>
      <div class="small sx-dim">Rule: ${feE(m.rule)} · status after: <b>${feE(m.st)}</b></div>
    </div><div>
      <div class="seclabel">What everyone sees on the ledger</div>
      <div class="fe-stage fe-wk-row${m.back?' amber':''}"><span class="fe-steps">${Array.from({length:10},(_,k)=>`<i class="${k<m.step?'on':''}${k===m.step-1?' cur':''}"></i>`).join('')}</span>
        <span class="fe-sl">Step ${m.step} · ${feE(m.label)}</span><span class="small">waiting on ${feE(m.waiting)}</span></div>
      <div class="fe-stamps">${stamps.map(([l,ok])=>`<div class="fe-stamp${ok?' ok':''}"><b>${ok?'✓':'○'} ${feE(l)}</b></div>`).join('')}</div>
      ${kv([['ID',s.id?'<b>'+s.id+'</b>':'<span class="sx-dim">given when logged</span>'],
        ['Figure','<b>£100,000</b> · increase revenue'+(s.signed?' · signed by Chris'+(s.self?' <span class="pp-tag noest">self-signed</span>':''):' <span class="sx-warn">unsigned</span>')],
        ['Funding','£15,000 from Client A · 20 days agreed'+(s.funded?' · confirmed by Chris':' · <span class="sx-dim">to be confirmed by Chris</span>')],
        ['Details',s.details+'%'+(s.questions?' · <span class="sx-warn">'+s.questions+' questions open</span>':'')],
        ['Estimate',s.days!=null?s.days+' person-days · Mobile · build cost '+feGBP(s.cost)+(s.over?' <span class="sx-warn">over the 20 days agreed</span>':''):''],
        ['Net value',s.net!=null?'<b>'+feGBP(s.net)+'</b>':''],
        ['On the ledger',s.approved?'Tier '+s.tier+' · rank #'+s.rank+(s.picked?'':' · <b>not scheduled</b>'):''],
        ['Picked up',s.picked?feE(s.team)+' · '+feE(s.jira):''],
        ['Schedule',s.sched?'start and due '+feE(s.sched)+' · baseline '+feE(s.baseline)+(s.started?' · <b>work started</b>':'')+(s.drift?' · drift '+feE(s.drift):''):''],
        ['Delivered',s.delivered?'Deployed':''],
        ['Check',s.verdict?feGBP(s.actual)+' booked · '+feE(s.verdict):''],
        ['Signer record',s.track?'Chris: '+feE(s.track):'']])}
      <div class="seclabel">History so far<span class="c">${i+1} event${i?'s':''}</span></div>
      <div class="fe-hist fe-wk-hist">${hist}</div>
    </div></div></div>`;
}
function feWkText(){
  return ['Feature ledger, sample walkthrough (made-up Client A; rates and thresholds are placeholders)','LE-2026-0001 · Offline badge scanning for lead retrieval · increase revenue £100,000 · funded £15,000, 20 days',''].concat(
    FE_WALK.map((m,k)=>`${k+1}. ${m.back?'Step '+m.step+' · Needs details':'Step '+m.step+' · '+m.label} · waiting on ${m.waiting}\n   ${m.who} (${m.role}): ${m.act}\n   Why it matters: ${m.why}`)).join('\n');
}
function feWkGo(i){
  i=Math.max(0,Math.min(FE_WALK.length-1,i)); FE.walk=i; feLS('ep-fe-walk',String(i));
  const b=document.getElementById('modal-body'); if(!b||!document.getElementById('fe-wk')) return;
  const sc=b.closest('.box')||b, top=sc.scrollTop; b.innerHTML=feWkBody(i); sc.scrollTop=top;
  const r=b.querySelector('.fe-wk-m[aria-pressed="true"]'); if(r&&r.scrollIntoView) r.scrollIntoView({block:'nearest',inline:'center'});
}
function feOpenWalk(start){
  const cl=CLB(); if(!cl||!cl.modal) return;
  const saved=parseInt(feLS('ep-fe-walk'),10), i=start!=null?start:(saved>=0&&saved<FE_WALK.length?saved:0);
  FE.walk=i;
  cl.modal('Sample walkthrough · LE-2026-0001 · Offline badge scanning for lead retrieval','<span>Client A (made up)</span><span>£100,000 · increase revenue · funded</span><span>15 moments, from logged to done</span>',
    feWkBody(i),'<span class="small">Use &#8592; and &#8594; to step through, or click any step on the flow to jump to it.</span><span class="fe-wk-foot"><button type="button" class="ibtn" data-fewkto="0">Start again</button><button type="button" class="ibtn" data-fewkcopy>Copy as text</button><button type="button" class="ibtn" data-feflow2>The whole flow</button></span>');
  const mo=document.getElementById('modal'), box=mo&&mo.querySelector('.box'); if(box) box.classList.add('fe-wide','fe-xwide');
}
(function feWkWire(){
  const mo=document.getElementById('modal'); if(!mo) return;
  mo.addEventListener('click',e=>{ let b;
    if(e.target.closest('[data-close]')){ FE.walk=null; const box=mo.querySelector('.box'); if(box) box.classList.remove('fe-wide','fe-xwide'); return; }
    if(e.target.closest('[data-fewalk]')){ feOpenWalk(); return; }
    if((b=e.target.closest('[data-fefill]'))){ const id=b.dataset.fefill, x=mo.querySelector('.x'); if(x) x.click(); feOpenForm({edit:id}); return; }
    if(e.target.closest('[data-feflow2]')){ FE.walk=null; feOpenFlow(); return; }
    if(FE.walk==null) return;
    if((b=e.target.closest('[data-fewk]'))&&!b.disabled){ feWkGo(FE.walk+(+b.dataset.fewk)); return; }
    if((b=e.target.closest('[data-fewkto]'))){ feWkGo(+b.dataset.fewkto); return; }
    if((b=e.target.closest('[data-fewstep]'))){ const k=b.dataset.fewstep, j=k==='back'?FE_WALK.findIndex(x=>x.back):FE_WALK.findIndex(x=>x.step===+k&&!x.back); if(j>=0) feWkGo(j); return; }
    if((b=e.target.closest('[data-fewkcopy]'))){ const t=feWkText(), btn=b; let settled=false; btn.textContent='Copying…';
      const done=()=>{ if(settled) return; settled=true; btn.textContent='Copy as text'; uiToast('Copied the whole walkthrough as text.'); };
      const fall=()=>{ if(settled) return; settled=true; btn.textContent='Copy as text'; const b2=document.getElementById('modal-body'); b2.innerHTML='<p class="small">Your browser did not allow copying. Select the text below and copy it.</p><textarea class="fe-wk-txt" readonly>'+feE(t)+'</textarea>'; const ta=b2.querySelector('textarea'); ta.focus(); ta.select(); FE.walk=null; };
      setTimeout(fall,2000);
      try{ navigator.clipboard.writeText(t).then(done,fall); }catch(err){ fall(); } }
  });
  mo.addEventListener('keydown',e=>{ if(e.target.closest&&e.target.closest('[data-fewstep]')&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click',{bubbles:true})); } });
  document.addEventListener('keydown',e=>{ if(FE.walk==null||!mo.hasAttribute('open')||!document.getElementById('fe-wk')) { if(!mo.hasAttribute('open')) FE.walk=null; return; }
    if(/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||'')) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); feWkGo(FE.walk+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); feWkGo(FE.walk-1); } else if(e.key==='Home'){ feWkGo(0); } else if(e.key==='End'){ feWkGo(FE_WALK.length-1); } });
})();
// ---------- the list ----------
function feSetView(v){
  FE.view=v; feLS('ep-rq-view',v);
  document.querySelectorAll('#rq-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
  const a=document.getElementById('fl-host'), b=document.getElementById('pp-host');
  if(a) a.hidden=v!=='fl'; if(b) b.hidden=v!=='pp';
  const n=document.getElementById('fl-new'); if(n) n.hidden=false;
}
function feRender(){
  const host=document.getElementById('fl-host'); if(!host) return;
  const pv=window.LEDGER_PREVIEW?'<div class="pp-ro"><b>Preview.</b> Work items logged here are test entries in the preview’s own database. They do not reach the live ledger.</div>':'';
  const about='<details class="about"><summary><span class="ib" aria-hidden="true">i</span>How the feature ledger works</summary><div class="pp-note">'+
    '<b>Every new work item becomes a ledger entry</b>: one value lever, one £ figure signed by the layer that owns it, a build cost and a net value (Feature Scoring Model, 25 Sep 2026). '+
    'Log it here with as much detail as you have; the fields marked * are needed to log, and the details % says what is still missing. '+
    'The page names who signs the figure from the lever, and who confirms funding from who raised it: only Chris when Sales or the relationship team raised it, Chris or Ajay otherwise. '+
    '<b>Approval puts an item on the ranked ledger; it is not a commitment to build.</b> Only the product-business meeting picks an item up, with a team and expected start and due dates. '+
    'Everyone sees each item’s current stage, who it is waiting on and for how long. Every action is recorded with who did it and when, and nothing is overwritten without a trace.</div></details>';
  const feFlowBtns='<span class="fe-flowbtns"><button type="button" class="ibtn fe-flowbtn" data-feflow>&#8674; See the whole flow</button><button type="button" class="ibtn fe-flowbtn" data-fewalk>&#9654; Sample walkthrough</button></span>', hrow='<div class="fe-hrow">'+about+feFlowBtns+'</div>';
  if(!FE.ready){ host.innerHTML=hrow+'<div class="empty">Loading the feature ledger…</div>'; return; }
  if(!FE.db){ host.innerHTML=pv+hrow+'<div class="pp-ro"><b>The shared database is not available in this view.</b> Open the page in claude.ai, signed in with your ExpoPlatform account, to log or read work items.</div>'; return; }
  if(FE.err){ host.innerHTML=pv+hrow+'<div class="pp-ro"><b>The feature ledger could not load ('+feE(FE.err)+').</b> Reload the page.</div>'; return; }
  const me=feMe(), rows=FE.rows.filter(r=>(!FE.mine||r.loggedBy===me.uid)&&(!FE.waitMine||feWaitsOn(r,me.uid))).slice().sort((a,b)=>String(b.loggedAt).localeCompare(String(a.loggedAt)));
  const pipe=rows.filter(r=>['submitted','returned','signed','reviewed','estimated'].includes(r.status));
  const ranked=rows.filter(r=>['approved','parked','picked-up','in-delivery','delivered'].includes(r.status));
  const arch=rows.filter(r=>!pipe.includes(r)&&!ranked.includes(r));
  const draft=(()=>{ try{ return JSON.parse(feLS('ep-fe-draft')||'null'); }catch(e){ return null; } })();
  const stats=[[FE.rows.length,'logged'],[FE.rows.filter(r=>r.status==='submitted').length,'awaiting signature'],[FE.rows.filter(r=>r.status==='returned').length,'need details'],
    [ranked.filter(r=>r.status==='approved'||r.status==='parked').length,'on the ledger, not scheduled'],[ranked.filter(r=>['picked-up','in-delivery'].includes(r.status)).length,'picked up']];
  const row=r=>{ const v=r.v||{}, g=feStage(r), lv=feLever(v), c=CLB()&&CLB().company(v.client), fig=feFigure(v), cp=(r.completeness||{}).score;
    return `<tr class="r" data-feopen="${feE(r._id)}"><td><b>${feE(r.id||r._id)}</b></td>
      <td><div class="fe-t">${feE(v.title)}</div><div class="small">${c?feE(CLB().shortName(c.name)):v.client==='Platform'?'Platform':'—'} · ${feE(v.productArea||'')}</div></td>
      <td><div class="fe-stage ${g.cls}"><span class="fe-steps">${Array.from({length:10},(_,i)=>`<i class="${i<g.step?'on':''}${i===g.step-1?' cur':''}"></i>`).join('')}</span>
        <span class="fe-sl">${g.step?'Step '+g.step+' · ':''}${feE(g.label)}</span><span class="small">waiting on ${feE(g.waiting)}${feDays(g)}</span></div></td>
      <td>${lv?feE(lv.l):'—'}</td><td class="num">${fig!=null?feGBP(fig):'—'}${r.signature?'':'<div class="small">unsigned</div>'}</td>
      <td>${feE((r.signer||{}).who||'—')}${v.funded&&v.funded.yes?'<div><span class="pp-tag soon">Funded</span></div>':''}</td>
      <td class="num"><span class="fe-pct" style="--p:${cp||0}">${cp==null?'—':cp+'%'}</span></td>
      <td>${feE(feName(r.loggedBy))}<div class="small">${feE(ppWhen(r.loggedAt,true))}</div></td></tr>`; };
  const table=(list,title,note)=>list.length?`<div class="fe-sec"><div class="fe-sh"><h3>${title}</h3><span class="small">${note}</span></div>
    <div class="pp-wrap"><table class="pp fe-tab"><thead><tr><th>ID</th><th>Work item</th><th>Current stage</th><th>Lever</th><th class="num">Figure</th><th>Signs · funding</th><th class="num">Details</th><th>Logged by</th></tr></thead>
    <tbody>${list.map(row).join('')}</tbody></table></div></div>`:'';
  host.innerHTML=pv+`<div class="fe-hrow">${about}${feFlowBtns}</div>`+
    `<div class="pp-stats fe-stats">${stats.map(([n,l])=>`<div class="pp-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('')}</div>`+
    (draft&&draft.v&&feFilled(draft.v.title)?`<div class="pp-note fe-draft"><b>You have a draft:</b> ${feE(draft.v.title)} <span class="small">saved in this browser ${feE(ppWhen(draft.at))}</span> <button type="button" class="ibtn primary" data-fedraft>Continue it</button></div>`:'')+
    `<div class="toolbar fe-tools"><label><input type="checkbox" id="fe-mine"${FE.mine?' checked':''}> Only items I logged</label><label><input type="checkbox" id="fe-wait"${FE.waitMine?' checked':''}> Waiting on me${(()=>{ const n=FE.rows.filter(r=>feWaitsOn(r,me.uid)).length; return n?' <b class="fe-waitn">'+n+'</b>':''; })()}</label><span class="count">${rows.length} work item${rows.length===1?'':'s'}</span></div>`+
    (rows.length?table(pipe,'Pipeline','Logged and collecting signatures, review and an estimate. Not ranked yet.')+
      table(ranked,'Ranked ledger','Approved, costed and ranked. Approval is not a commitment to build.')+table(arch,'Archive','Checked, closed or stopped.')
      :`<div class="fe-empty"><h3>No work item logged yet</h3><p>Log the first one: the form asks for the problem, who it is for, the value lever and the £ figure, and names who signs it.</p><button type="button" class="ibtn primary" data-fenew>+ Log a new work item</button></div>`);
}

// ---------- the form ----------
function feSkillCard(preset){
  FE._pend=preset||null; const cl=window.CL; if(!cl||!cl.modal) return;
  const how=!!(window.EP_ACCESS&&window.EP_ACCESS.how);
  cl.modal('Log a new work item','<span class="fe-skill-pill">In testing</span>',
    `<div class="fe-skill"><div class="fe-skill-ic" aria-hidden="true">&#10022;</div><div><h4>Logging work items with Claude is in testing.</h4>
      <p>You will share what a client said, in your own words, from a chat or from a call recording. Claude fills in the request, checks who else asked for it and what is already built, and puts it here with you as the person who logged it.</p>
      <p class="fe-skill-now">It is in Beta with a small group first. Until it opens to you, ask Ajay to log it. Every item already on the ledger still opens, and details handed to you can still be filled in from the item.</p></div></div>`,
    how?'<button type="button" data-feold>Use the old form</button><span>Only you and Bartosz see this while the skill is built.</span>':'<span>Thanks for your patience while this moves.</span>');
}
document.addEventListener('click',e=>{ if(!e.target.closest('[data-feold]')) return; const x=document.querySelector('#modal .x'); if(x) x.click(); feOpenForm(Object.assign({},FE._pend||{},{_old:true})); });
function feOpenForm(preset){
  const me=feMe(), editR=preset&&preset.edit?FE.rows.find(x=>x._id===preset.edit):null;
  if(!me.ok){ uiToast('Sign in first: every work item is recorded under the name of whoever logs it. Reload the page and choose Continue.',{bad:true}); return; }
  if(me.canWrite===false){ uiToast('Your access to this page is view-only, so you cannot log work items. Ask the owner for “Can interact”.',{bad:true}); return; }
  // logging a new work item is moving to a Claude skill (30 Sep 2026): a placeholder, except when filling in owed details, and an
  // "old form" link for the How it works viewers (Ajay, Bartosz) while the skill is built
  // Beta (30 Sep 2026): Settings viewers log with Claude; everyone else still sees the placeholder while it is tested
  if(!(preset&&(preset.edit||preset._old))){ if(window.EP_ACCESS&&window.EP_ACCESS.how&&window.btOpen){ window.btOpen(preset||{}); return; } feSkillCard(preset); return; }
  let v=feBlank();
  try{ const d=JSON.parse(feLS('ep-fe-draft')||'null'); if(d&&d.v&&!preset) v=Object.assign(feBlank(),d.v); }catch(e){}
  if(preset&&preset.client){ v.client=preset.client; v.customers=[{client:preset.client,contact:'',how:'',note:''}]; }
  if(editR) v=Object.assign(feBlank(),JSON.parse(JSON.stringify(editR.v||{})));
  if(!v.raisedBy||!v.raisedBy.id) v.raisedBy={id:me.uid};
  const d=document.createElement('div');
  d.className='modal fe-m'; d.id='fe-m'; d.setAttribute('open',''); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','fe-m-t');
  FE.form={v, el:d, showErr:false, saving:false, prev:document.activeElement, hits:[], dq:'', dres:null, dup:{decision:null, choice:null, ai:null}, editId:editR?editR._id:null};
  d.innerHTML=`<div class="scrim" data-feclose></div><div class="box fe-box"><div class="top"><div><h3 id="fe-m-t">Log a new work item</h3>
    <div class="meta" id="fe-m-meta">Only the five fields marked <b>*</b> are needed to log it. Fields marked <b>before signing</b> can wait, or be handed to the colleague who knows them. Your draft is kept in this browser until you log it.</div></div>
    <button class="x" type="button" data-feclose aria-label="Close">&#215;</button></div>
    <div class="fe-body"><form class="fe-form" id="fe-form" novalidate></form><aside class="fe-side" id="fe-side"></aside></div>
    <div class="foot fe-foot"><button type="button" class="ibtn danger" data-fediscard>Discard draft</button><span class="fe-msg" id="fe-msg" aria-live="polite"></span>
    <button type="button" class="ibtn" data-feclose>Save draft and close</button><button type="button" class="ibtn primary" id="fe-log">Log work item</button></div></div>`;
  document.body.appendChild(d);
  if(editR){ d.querySelector('#fe-m-t').textContent='Fill in the details · '+(editR.id||editR._id); d.querySelector('#fe-m-meta').textContent='Fill in what you know. Anything still empty stays owed, and it is signed once everything is there. Every change is recorded with your name.';
    d.querySelector('#fe-log').textContent='Save details'; const dd=d.querySelector('[data-fediscard]'); if(dd) dd.hidden=true; const sd=d.querySelector('.fe-foot [data-feclose]'); if(sd) sd.textContent='Close without saving'; d.classList.add('fe-edit'); }
  fePaint();
  dmLoad().then(()=>{ if(FE.form){ fePaintSide(); } }).catch(()=>{ if(FE.form) fePaintSide(); });
  d.addEventListener('input',feInput); d.addEventListener('change',feInput);
  d.addEventListener('click',feClick);
  d.addEventListener('submit',e=>e.preventDefault());
  document.addEventListener('keydown',feKey,true);
  setTimeout(()=>{ const f=d.querySelector('#fe-title'); if(f) f.focus(); },0);
}
function feKey(e){ if(e.key==='Escape'&&FE.form&&!document.querySelector('.ui-dlg')&&!document.querySelector('.find:not([hidden])')){ e.preventDefault(); e.stopPropagation(); feClose(true); } }
function feClose(keep){
  const f=FE.form; if(!f) return;
  if(keep) feSaveDraft();
  f.el.remove(); document.removeEventListener('keydown',feKey,true); FE.form=null; feRender();
  try{ if(f.prev) f.prev.focus(); }catch(e){}
}
function feSaveDraft(){ const f=FE.form; if(f&&f.editId) return; if(f&&feFilled(f.v.title)||(f&&feFilled(f.v.problem))) feLS('ep-fe-draft',JSON.stringify({at:feNow(),v:f.v})); }
// read and write a value by its dotted path, e.g. funded.contributionGBP or customers.0.client
function feGet(o,p){ return p.split('.').reduce((a,k)=>a==null?a:a[k],o); }
function feSet(o,p,val){ const ks=p.split('.'); let a=o; ks.slice(0,-1).forEach(k=>{ if(a[k]==null) a[k]={}; a=a[k]; }); a[ks[ks.length-1]]=val; }
const FE_STRUCT=new Set(['lever','raisingLayer','funded.yes','existingGrowing.yes','source.kind','client','neededBy']);
function feInput(e){
  const t=e.target, f=FE.form; if(!f) return;
  if(t.id==='fe-person'){ fePersonSearch(t.value); return; }
  if(t.id==='fe-handq'){ if(f.hand){ f.hand.q=t.value; clearTimeout(f._hq); f._hq=setTimeout(()=>feHandSearch(t.value),180); } return; }
  if(t.id==='fe-dq'){ f.dq=t.value; clearTimeout(f._dq); f._dq=setTimeout(feDemandRun,220); return; }
  const p=t.dataset&&t.dataset.f; if(!p) return;
  let val=t.type==='checkbox'?null:t.value;
  if(t.dataset.kind==='multi'){ const cur=new Set(feGet(f.v,p)||[]); t.checked?cur.add(t.value):cur.delete(t.value); val=[...cur]; }
  else if(t.dataset.kind==='bool'){ val=t.value==='yes'; }
  else if(t.dataset.kind==='surf'){ const s=f.v.surfaces; const on=new Set(s.on); t.checked?on.add(t.value):on.delete(t.value); s.on=[...on]; val=undefined; }
  if(val!==undefined) feSet(f.v,p,val);
  if(p==='client'&&val&&!(f.v.customers||[]).some(c=>c.client)) f.v.customers=[{client:val,contact:'',how:'',note:''}].concat((f.v.customers||[]).filter(c=>c.client));
  clearTimeout(f._t); f._t=setTimeout(feSaveDraft,500);
  if(e.type==='change'&&(FE_STRUCT.has(p)||t.dataset.kind==='surf'||/^customers\.\d+\.client$/.test(p))) fePaint(); else { fePaintSide(); feLive(); }
}
function feClick(e){
  const t=e.target, f=FE.form; if(!f) return; let b;
  if(t.closest('[data-feclose]')){ feClose(true); return; }
  if(t.closest('[data-fediscard]')){ feLS('ep-fe-draft',null); f.v=feBlank(); fePaint(); uiToast('Draft discarded.'); return; }
  if(t.closest('#fe-log')){ if(f.editId) feSaveOwed(); else feLog(); return; }
  if(t.closest('#fe-dgo')){ feDemandRun(); return; }
  if(t.closest('#fe-dai')){ const q=f.dq||[f.v.title,f.v.problem].filter(Boolean).join('. '); if(!String(q).trim()){ uiToast('Describe the need first.'); return; } f.dq=q; if(!f.dres) feDemandRun(); if(f.dres) dmAskAI(q,f.dres,f.el.querySelector('#fe-sec0'),'form'); return; }
  if((b=t.closest('[data-dmact]'))){ feDemandAct(b.dataset.dmact,b.dataset.dmid); return; }
  if((b=t.closest('[data-fedup]'))){ f.dq=[f.v.title,f.v.problem].filter(Boolean).join('. '); feDemandRun(); const s0=f.el.querySelector('#fe-sec0'); if(s0) s0.scrollIntoView({block:'start',behavior:'smooth'}); return; }
  if((b=t.closest('[data-feadd]'))){ const p=b.dataset.feadd, arr=feGet(f.v,p)||[]; arr.push(p==='customers'?{client:'',contact:'',how:'',note:''}:''); feSet(f.v,p,arr); fePaint(); return; }
  if((b=t.closest('[data-ferm]'))){ const [p,i]=b.dataset.ferm.split('|'), arr=feGet(f.v,p)||[]; arr.splice(+i,1); if(!arr.length) arr.push(p==='customers'?{client:'',contact:'',how:'',note:''}:''); fePaint(); return; }
  if((b=t.closest('[data-fehit]'))){ f.v.raisedBy={id:b.dataset.fehit}; FE.names[b.dataset.fehit]=b.dataset.name||FE.names[b.dataset.fehit]; f.hits=[]; fePaint(); return; }
  if(t.closest('[data-feme]')){ f.v.raisedBy={id:feMe().uid}; fePaint(); return; }
  if((b=t.closest('[data-fehand]'))){ const k=b.dataset.fehand, hint=(FE_HAND_HINT[k]||[''])[0]; f.hand={k, q:hint, hits:[]}; fePaint(); feHandSearch(hint); setTimeout(()=>{ const i=f.el.querySelector('#fe-handq'); if(i) i.focus(); },0); return; }
  if(t.closest('[data-fehandcancel]')){ f.hand=null; fePaint(); return; }
  if((b=t.closest('[data-fehandx]'))){ const hf=Object.assign({},f.v.handoff||{}); delete hf[b.dataset.fehandx]; f.v.handoff=hf; fePaint(); return; }
  if((b=t.closest('[data-fehandto]'))&&f.hand){ const hit=(f.hand.hits||[]).find(x=>x.id===b.dataset.fehandto); if(hit) FE.names[hit.id]=hit.name||FE.names[hit.id];
    f.v.handoff=Object.assign({},f.v.handoff||{},{[f.hand.k]:{to:b.dataset.fehandto}}); const lab=FE_OWED_L[f.hand.k]||f.hand.k; f.hand=null; fePaint(); feSaveDraft();
    uiToast('Handed “'+lab+'” to '+(hit&&hit.name||'your colleague')+'. It waits for them before it is signed.'); return; }
  if((b=t.closest('[data-fegoto]'))){ const el=f.el.querySelector('[data-fld="'+b.dataset.fegoto+'"]'); if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); const i=el.querySelector('input,select,textarea'); if(i) setTimeout(()=>i.focus(),250); } return; }
}
async function fePersonSearch(q){
  const f=FE.form, me=feMe(); if(!f||!me.user||!me.user.search) return;
  let hits=[]; try{ hits=await me.user.search(q||''); }catch(e){}
  if(!FE.form) return;
  f.hits=hits.slice(0,6).map(h=>({id:h.id,name:h.name}));
  const box=f.el.querySelector('#fe-hits'); if(!box) return;
  box.innerHTML=f.hits.map(h=>'<button type="button" class="fe-hit" data-fehit="'+feE(h.id)+'" data-name="'+feE(h.name)+'"></button>').join('');
  [...box.children].forEach((b,i)=>{ b.textContent=f.hits[i].name; });
}
function fePaint(){
  const f=FE.form; if(!f) return;
  const form=f.el.querySelector('#fe-form'), st=form.parentElement.scrollTop;
  form.innerHTML=feFormHtml(f.v);
  form.parentElement.scrollTop=st;
  fePaintSide(); feLive();
}
// field markup helpers
const feReq=(k,on)=>on?' <span class="req" aria-hidden="true">*</span>':'';
function feFld(k,label,input,opt){ opt=opt||{}; const later=opt.req&&!FE_LOG_REQ.has(k);
  return `<div class="pp-fld fe-fld${opt.wide?' wide':''}${later?' later':''}" data-fld="${k}"><label${opt.for?` for="${opt.for}"`:''}>${feE(label)}${feReq(k,opt.req&&!later)}${later?' <span class="fe-latertag">before signing</span>':''}</label>${input}${opt.help?`<div class="fh">${opt.help}</div>`:''}${later?feHandHtml(k):''}<div class="fe-err" data-err="${k}" hidden></div></div>`; }
function feHandHtml(k){
  const f=FE.form; if(!f) return ''; const h=(f.v.handoff||{})[k], open=f.hand&&f.hand.k===k, hint=FE_HAND_HINT[k]||['',''];
  if(h&&h.to&&!open) return `<div class="fe-hand on"><span class="fe-handchip">&#8618; Handed to <b>${feE(feName(h.to)==='you'?(feMe().name||'you'):feName(h.to))}</b></span><button type="button" class="linkbtn" data-fehand="${k}">Change</button><button type="button" class="linkbtn" data-fehandx="${k}">Undo</button><span class="small">They fill it in before it is signed.</span></div>`;
  if(!open) return `<div class="fe-hand"><button type="button" class="linkbtn" data-fehand="${k}">Don’t know? Hand this to a colleague</button></div>`;
  return `<div class="fe-hand open"><div class="fe-handq"><input id="fe-handq" placeholder="Search a colleague" autocomplete="off" value="${feE(f.hand.q||'')}"><button type="button" class="linkbtn" data-fehandcancel>Cancel</button></div>
    ${hint[0]?`<div class="small">Suggested: ${feE(hint[1])}.</div>`:''}<div class="fe-hits" id="fe-handhits"></div></div>`;
}
async function feHandSearch(q){
  const f=FE.form, me=feMe(); if(!f||!f.hand||!me.user||!me.user.search) return;
  let hits=[]; try{ hits=await me.user.search(q||''); }catch(e){}
  if(!FE.form||!f.hand) return;
  f.hand.hits=hits.slice(0,6).map(h=>({id:h.id,name:h.name}));
  const box=f.el.querySelector('#fe-handhits'); if(!box) return;
  box.innerHTML=f.hand.hits.map(h=>'<button type="button" class="fe-hit" data-fehandto="'+feE(h.id)+'"></button>').join('')||(q?'<span class="small">No one found by that name.</span>':'');
  [...box.querySelectorAll('button')].forEach((b,i)=>{ b.textContent=f.hand.hits[i].name; });
}
const feIn=(p,val,attrs)=>`<input id="fe-${p.replace(/\./g,'-')}" data-f="${p}" value="${feE(val??'')}" autocomplete="off" ${attrs||''}>`;
const feTa=(p,val,rows,ph)=>`<textarea id="fe-${p.replace(/\./g,'-')}" data-f="${p}" rows="${rows||3}"${ph?` placeholder="${feE(ph)}"`:''}>${feE(val??'')}</textarea>`;
const feSel=(p,val,opts,blank)=>`<select id="fe-${p.replace(/\./g,'-')}" data-f="${p}">${blank!==false?`<option value="">${feE(blank||'Choose…')}</option>`:''}${opts.map(o=>{const [k,l]=Array.isArray(o)?o:[o,o];return `<option value="${feE(k)}"${String(val)===String(k)?' selected':''}>${feE(l)}</option>`}).join('')}</select>`;
function feBool(p,val,yes,no){ const n=p.replace(/\./g,'-'); return `<span class="seg fe-bool" role="radiogroup">${[['yes',yes||'Yes'],['no',no||'No']].map(([k,l])=>`<label class="fe-rb"><input type="radio" name="fe-${n}" data-f="${p}" data-kind="bool" value="${k}"${(val===true&&k==='yes')||(val===false&&k==='no')?' checked':''}><span>${feE(l)}</span></label>`).join('')}</span>`; }
function feClients(){ const cl=CLB(); return cl?cl.activeClients().slice().sort((a,b)=>cl.shortName(a.name).localeCompare(cl.shortName(b.name))).map(c=>[c.pd,cl.shortName(c.name)]):[]; }
function feAreas(){ const cl=CLB(); return cl&&cl.productAreas?cl.productAreas().flatMap(a=>a.products.map(p=>[p,a.d+' › '+p])):[]; }
function feFormHtml(v){
  const cl=CLB(), lv=feLever(v), sg=feSigner(v), clients=feClients(), d=v.figureDetail||{};
  const pd=[...new Set((v.customers||[]).map(c=>c.client).concat([v.client]).filter(x=>x&&x!=='Platform'))];
  const evs=cl&&cl.events?cl.events().filter(e=>pd.includes(e.pd)&&e.kind==='event'&&(e.e||e.s)>=new Date().toISOString().slice(0,10)).sort((a,b)=>String(a.s).localeCompare(String(b.s))).slice(0,24):[];
  const rb=v.raisedBy&&v.raisedBy.id;
  const sec=(n,t,sub,body)=>`<fieldset class="pp-sec fe-sec2"><legend><span class="fe-n">${n}</span>${t}</legend>${sub?`<p class="fe-sub">${sub}</p>`:''}<div class="pp-frow">${body}</div></fieldset>`;
  const list=(p,arr,ph,label,req,help)=>feFld(p,label,`<div class="fe-list">${(arr||['']).map((x,i)=>`<div class="fe-li"><span class="fe-ln">${i+1}</span>${feIn(p+'.'+i,x,`placeholder="${feE(ph)}"`)}<button type="button" class="pp-x" data-ferm="${p}|${i}" aria-label="Remove">&#215;</button></div>`).join('')}<button type="button" class="linkbtn" data-feadd="${p}">+ Add another</button></div>`,{wide:true,req,help});
  let h='';
  const F0=FE.form||{dq:'',dres:null,dup:{}}, dc=F0.dup&&F0.dup.choice&&DM.byCl.get(F0.dup.choice);
  h+=`<fieldset class="pp-sec fe-sec2 fe-sec0" id="fe-sec0"><legend><span class="fe-n">0</span>Search before you log</legend>
    <p class="fe-sub">Describe the need in a sentence. If it is already asked for, link to it or pull its details in, so the effort is not duplicated. Instant results appear as you type; <b>Ask AI</b> has Claude judge the closest ones.</p>
    <div class="dm-sbar"><input id="fe-dq" value="${feE(F0.dq||'')}" placeholder="e.g. exhibitors lose badge scans when there is no signal" autocomplete="off"><button type="button" class="ibtn" id="fe-dgo">Search</button><button type="button" class="ibtn primary" id="fe-dai">&#10022; Ask AI</button></div>
    ${dc?`<div class="dm-chosen">${F0.dup.decision==='same'?'Marked as the same need as':F0.dup.decision==='linked'?'Linked as related to':'Details pulled from'} <b>${feE(dc.name)}</b>.</div>`:''}
    <div class="dm-aibox">${F0.dup&&F0.dup.ai?`<div class="dm-aisum"><span class="dm-ailbl">AI check</span> ${feE(F0.dup.ai.summary||'')}</div>`:''}</div>
    <div class="dm-list">${!DM.data?'<div class="small">Loading the demand map…</div>':F0.dres?dmResultsHtml(F0.dres,'form'):''}</div></fieldset>`;
  h+=sec(1,'Who is raising it','',
    feFld('raisedBy','Raised by',`<div class="fe-person">${rb?`<span class="fe-pchip">${feE(feName(rb)==='you'?(feMe().name||'You'):feName(rb))}${rb===feMe().uid?' <span class="small">(you)</span>':''}</span>`:''}<input id="fe-person" placeholder="Search a colleague if you log it for someone else" autocomplete="off">${rb!==feMe().uid?'<button type="button" class="linkbtn" data-feme>It is me</button>':''}<div class="fe-hits" id="fe-hits"></div></div>`,{req:true,help:'Logged by is always you, from your sign-in. Raised by is who the request comes from.'})+
    feFld('raisingLayer','Raising layer',feSel('raisingLayer',v.raisingLayer,FE_LAYERS),{req:true,help:'It never changes the lever. It decides who approves a funded item: only Chris when Sales or the relationship team raised it.'})+
    feFld('source','Source',feSel('source.kind',v.source.kind,FE_SOURCES,false)+(v.source.kind!=='intake-form'?feIn('source.ref',v.source.ref,`placeholder="${v.source.kind==='jira-fr'?'EP-12345':v.source.kind==='meeting'?'Meeting date':'FIS page link or id'}"`):''),{req:true}));
  h+=sec(2,'The request','What is needed, for which client, and why.',
    feFld('title','Name of the work item',feIn('title',v.title,'maxlength="90" placeholder="e.g. Offline badge scanning for lead retrieval"'),{req:true,wide:true,for:'fe-title'})+
    feFld('client','Client',feSel('client',v.client,[['Platform','Platform (every client)']].concat(clients)),{req:true})+
    feFld('productArea','Product area',feSel('productArea',v.productArea,[['Not sure','Not sure yet: the review will place it']].concat(feAreas())),{req:true})+
    feFld('problem','Problem statement',feTa('problem',v.problem,4,'What is wrong today, and for whom?'),{req:true,wide:true,help:'At least 12 words: what is wrong today, for whom, and what it costs them.'})+
    feFld('evidence','Evidence',feTa('evidence',v.evidence,3,'Tickets, calls, emails, data. Paste links.'),{req:true,wide:true})+
    feFld('neededBy','Needed by',`<input type="month" id="fe-neededBy" data-f="neededBy" value="${feE(v.neededBy)}">`,{help:'Only if the customer needs it by a set time.'})+
    (String(v.neededBy).trim()?feFld('urgencyReason','Why by then',feIn('urgencyReason',v.urgencyReason,'placeholder="A contract clause, an event date, a renewal"'),{req:true}):''));
  h+=sec(3,'Who it is for','',
    feFld('customers','Customers asking for it',`<div class="fe-cust">${(v.customers||[]).map((c,i)=>{const co=cl&&cl.company(c.client);return `<div class="fe-crow">
      ${feSel('customers.'+i+'.client',c.client,[['Platform','Platform-wide']].concat(clients),'Customer…')}
      <span class="fe-tier">${co&&co.tier?'<span class="tierpill t'+(co.tier<=2?co.tier:'')+'">Tier '+co.tier+'</span>':co?'<span class="tierpill na">no tier</span>':''}</span>
      ${feIn('customers.'+i+'.contact',c.contact,'placeholder="Contact at the customer"')}
      ${feSel('customers.'+i+'.how',c.how,FE_HOW,'How they asked…')}
      <button type="button" class="pp-x" data-ferm="customers|${i}" aria-label="Remove">&#215;</button></div>`}).join('')}<button type="button" class="linkbtn" data-feadd="customers">+ Add a customer</button></div>`,{req:true,wide:true,help:'Every customer asking for it. The Sales Tier comes from the ledger.'})+
    feFld('whoFor','Users affected',`<div class="fe-chips">${FE_WHO.map(w=>`<label class="fe-chip"><input type="checkbox" data-f="whoFor" data-kind="multi" value="${feE(w)}"${(v.whoFor||[]).includes(w)?' checked':''}><span>${feE(w)}</span></label>`).join('')}</div>`,{req:true,wide:true})+
    feFld('userStory','User story',feTa('userStory',v.userStory,2,'As a …, I want …, so that …'),{req:true,wide:true})+
    feFld('currentWorkaround','How it is handled today',feTa('currentWorkaround',v.currentWorkaround,3,'Manual steps, who does them, how often, and what that costs'),{req:true,wide:true}));
  h+=sec(4,'The detail','Not needed to log, but the weekly review asks for it. Each one raises the details %.',
    feFld('differsFromToday','How it differs from today',feTa('differsFromToday',v.differsFromToday,2),{wide:true})+
    feFld('userJourneyImpact','Where it sits in the user journey',feTa('userJourneyImpact',v.userJourneyImpact,2,'What happens before and after it'),{wide:true})+
    feFld('surfaces','Surfaces',`<div class="fe-surf">${FE_SURF.map(([k,l])=>{const on=(v.surfaces.on||[]).includes(k);return `<div class="fe-srow"><label class="fe-chip"><input type="checkbox" data-f="surfaces" data-kind="surf" value="${k}"${on?' checked':''}><span>${feE(l)}</span></label>${on?feIn('surfaces.notes.'+k,(v.surfaces.notes||{})[k],'placeholder="What is needed here"'):''}</div>`}).join('')}</div>`,{wide:true})+
    list('acceptanceCriteria',v.acceptanceCriteria,'A testable statement','Acceptance criteria',false,'Numbered and testable. Placeholders such as “1 …” do not count.')+
    feFld('successMeasure','Success measure',feIn('successMeasure',v.successMeasure,'placeholder="How we will know it worked"'),{wide:true,help:'It is what the figure is checked against after delivery.'})+
    feFld('eventsImpacted','Events it is needed for',evs.length?`<div class="fe-chips">${evs.map(e=>{const key=e.k+' · '+e.n+' · '+e.s;return `<label class="fe-chip ev"><input type="checkbox" data-f="eventsImpacted" data-kind="multi" value="${feE(key)}"${(v.eventsImpacted||[]).includes(key)?' checked':''}><span>&#9873; ${feE(e.n)} <small>${feE(e.s)}</small></span></label>`}).join('')}</div>`:'<div class="fh">Choose a customer above to pick from their upcoming shows (Jira OP).</div>',{wide:true})+
    list('attachments',v.attachments,'Link to a screenshot, mock-up, recording or notes','Attachments (links)')+
    list('related',v.related,'EP key, FIS page or request id','Related items')+
    feFld('dependencies','Dependencies',feTa('dependencies',v.dependencies,2,'Other features, integrations or third parties it relies on'),{wide:true})+
    feFld('risks','Risks',feTa('risks',v.risks,2,'Compliance, security, GDPR, performance'),{wide:true})+
    feFld('alternativesConsidered','Alternatives considered',feTa('alternativesConsidered',v.alternativesConsidered,2,'Existing features or configuration ruled out, and why'),{wide:true}));
  // value
  let val=feFld('lever','Value lever',`<div class="fe-levers">${FE_LEVERS.map(x=>`<label class="fe-lever${v.lever===x.k?' on':''}"><input type="radio" name="fe-lever" data-f="lever" value="${x.k}"${v.lever===x.k?' checked':''}><b>${feE(x.l)}</b><span>${feE(x.q)}</span><small>${feE(x.fig)} · signed by ${x.owner==='sales'?'Sales (Chris)':'Operations (Susan / Ilaria)'}</small></label>`).join('')}</div>`,{req:true,wide:true,help:'Exactly one. The function raising the item does not change the lever: an engineering refactor is a reduced or avoided cost.'});
  if(lv){
    if(lv.kind==='revenue') val+=feFld('figureGBP',lv.fig,feIn('figureGBP',v.figureGBP,'inputmode="decimal" placeholder="e.g. 100000"'),{req:true,help:'Over 12 months (proposed figure horizon, fs-figure-horizon). Always positive: the lever gives the direction.'});
    else val+=feFld('hours','Hours',`<div class="fe-calc">${feIn('figureDetail.hoursPerEvent',d.hoursPerEvent,'inputmode="decimal" placeholder="Hours per event"')}<span>×</span>${feIn('figureDetail.eventsPerYear',d.eventsPerYear,'inputmode="decimal" placeholder="Events a year"')}<span class="fe-or">or</span>${feIn('figureDetail.incidentsPerYear',d.incidentsPerYear,'inputmode="decimal" placeholder="Incidents a year"')}<span>×</span>${feIn('figureDetail.hoursEach',d.hoursEach,'inputmode="decimal" placeholder="Hours each"')}</div>`,{req:true,wide:true})+
      feFld('rateGBP','Hourly rate (£)',feIn('figureBasis.rateGBP',v.figureBasis.rateGBP,'inputmode="decimal" placeholder="e.g. 200"'),{req:true,help:'The operations rate is still to be set by Susan / Ilaria (fs-ops-rate); say which rate you used.'})+
      feFld('rateSource','Where the rate comes from',feIn('figureBasis.rateSource',v.figureBasis.rateSource,'placeholder="e.g. TAM blended rate, finance 2026"'),{req:true})+
      `<div class="pp-fld wide fe-result" data-fld="figure"><label>Figure</label><div class="fe-big" id="fe-fig"></div></div>`;
    val+=feFld('figureText','The figure in your words',feIn('figureText',v.figureText,`placeholder="${lv.kind==='revenue'?'e.g. +£100k expansion':'e.g. 100 hours = £20k of TAM time'}"`),{req:true})+
      feFld('assumption','Assumption (one line)',feIn('assumption',v.assumption,`maxlength="${FE_ASSUMPTION_MAX}" placeholder="Which customer, which contract, how many hours per event"`)+`<div class="fc" id="fe-acount">${String(v.assumption).length} / ${FE_ASSUMPTION_MAX}</div>`,{req:true,wide:true,help:'Changing the lever, figure or assumption after signing voids the signature.'});
    if(lv.k==='increase-revenue') val+=feFld('figureDetail','The deal',`<div class="fe-grid4">${feIn('figureDetail.dealRef',d.dealRef,'placeholder="Pipedrive deal link or id"')}${feIn('figureDetail.dealStage',d.dealStage,'placeholder="Deal stage"')}<input type="month" data-f="figureDetail.expectedClose" value="${feE(d.expectedClose||'')}" aria-label="Expected close">${feSel('figureDetail.kind',d.kind,[['new','New revenue'],['expansion','Expansion']],'New or expansion…')}</div>`,{req:true,wide:true});
    if(lv.k==='retain-revenue') val+=feFld('figureDetail','The contract at risk',`<div class="fe-grid4">${feIn('figureDetail.contractValueGBP',d.contractValueGBP,'inputmode="decimal" placeholder="Contract value (£)"')}<input type="date" data-f="figureDetail.renewalDate" value="${feE(d.renewalDate||'')}" aria-label="Renewal date">${feIn('figureDetail.churnSignal',d.churnSignal,'placeholder="The churn signal"')}${feIn('figureDetail.signalSource',d.signalSource,'placeholder="Where it came from"')}</div>`,{req:true,wide:true});
    if(lv.kind==='hours') val+=feFld('figureDetail','Who spends the hours',`<div class="fe-grid4">${feIn('figureDetail.whoSpends',d.whoSpends,'placeholder="Team and role"')}${feIn('figureDetail.countSource',d.countSource,'placeholder="Where the count comes from"')}</div>`,{req:true,wide:true});
  }
  val+=feFld('funded','Does the customer pay towards it?',feBool('funded.yes',v.funded.yes,'Yes, funded','No')+(v.funded.yes?`<div class="fe-grid4 fe-sub2">${feIn('funded.contributionGBP',v.funded.contributionGBP,'inputmode="decimal" placeholder="Contribution (£)"')}${feIn('funded.agreedEstimateDays',v.funded.agreedEstimateDays,'inputmode="decimal" placeholder="Agreed estimate (days)"')}${feIn('funded.dealRef',v.funded.dealRef,'placeholder="Deal reference"')}${feIn('funded.paymentTerms',v.funded.paymentTerms,'placeholder="Payment terms"')}</div>${feIn('funded.termsNote',v.funded.termsNote,'placeholder="Terms note"')}`:''),{req:true,wide:true,help:sg&&sg.fundedBy?'Funding is confirmed by <b>'+feE(sg.fundedBy)+'</b> ('+feE(sg.fundedRule)+').':'Funded + increase revenue is tier 2, the top of the ledger after the must-haves.'})+
    feFld('existingGrowing','Is this revenue we already earn that will grow?',feBool('existingGrowing.yes',v.existingGrowing.yes,'Yes','No')+(v.existingGrowing.yes?`<div class="fe-grid4 fe-sub2">${feIn('existingGrowing.currentARRGBP',v.existingGrowing.currentARRGBP,'inputmode="decimal" placeholder="Current ARR (£)"')}${feIn('existingGrowing.growthGBP',v.existingGrowing.growthGBP,'inputmode="decimal" placeholder="Growth (£)"')}${feIn('existingGrowing.sizingNote',v.existingGrowing.sizingNote,'placeholder="Sizing note"')}</div>`:''),{req:true,wide:true,help:'Sales (Chris) sizes the growth.'});
  h+=sec(5,'The value','One lever, one £ figure, one signature.',val);
  return h;
}
function feLive(){
  const f=FE.form; if(!f) return;
  const fig=f.el.querySelector('#fe-fig'), v=f.v, lv=feLever(v);
  if(fig&&lv&&lv.kind==='hours'){ const h=feHours(v), r=feNum(v.figureBasis.rateGBP); fig.innerHTML=h!=null&&r!=null?`${h.toLocaleString('en-GB')} hours × £${r.toLocaleString('en-GB')} = <b>${feGBP(h*r)}</b>`:'<span class="small">Give the hours and the rate; the figure is computed, not typed.</span>'; }
  const ac=f.el.querySelector('#fe-acount'); if(ac) ac.textContent=String(v.assumption).length+' / '+FE_ASSUMPTION_MAX;
  const err=feLogErrors(v), owed=Object.keys(feOwed(v)), handed=owed.filter(k=>((v.handoff||{})[k]||{}).to).length;
  f.el.querySelectorAll('[data-err]').forEach(x=>{ const k=x.dataset.err, show=!!(err[k]&&f.showErr); x.hidden=!show; x.textContent=show?err[k]:''; x.parentElement.classList.toggle('bad',show); });
  const n=Object.keys(err).length, msg=f.el.querySelector('#fe-msg');
  if(msg) msg.textContent=f.saving?(f.editId?'Saving…':'Logging…'):n?n+' field'+(n===1?'':'s')+' needed to '+(f.editId?'save':'log'):(f.editId?'Ready to save':'Ready to log')+(owed.length?' · '+owed.length+' to fill before signing'+(handed?' ('+handed+' handed on)':''):'');
}
// the demand search inside the form
function feDemandRun(){
  const f=FE.form; if(!f) return;
  if(!DM.data){ dmLoad().then(feDemandRun).catch(()=>{}); return; }
  const q=String(f.dq||'').trim()||[f.v.title,f.v.problem].filter(Boolean).join('. ');
  f.dres=q?dmSearch(q):null; DM.ai=null; f.dup.ai=null; f.dup.query=q; f.dup.shown=(f.dres?f.dres.needs.slice(0,8).map(h=>h.id):[]);
  const box=f.el.querySelector('#fe-sec0 .dm-list'); if(box) box.innerHTML=f.dres?dmResultsHtml(f.dres,'form'):'';
  const ai=f.el.querySelector('#fe-sec0 .dm-aibox'); if(ai) ai.innerHTML='';
}
function feDupBox(v){
  if(!DM.data) return '<div class="fe-sb"><div class="seclabel">Possible duplicates</div><div class="small">Loading the demand map…</div></div>';
  const q=[v.title,v.problem].filter(x=>String(x||'').trim()).join('. ');
  if(dmTok(q).length<3) return '<div class="fe-sb"><div class="seclabel">Possible duplicates</div><div class="small">Type a name and a problem statement, and the closest needs already asked for show here.</div></div>';
  const r=dmSearch(q,{limit:3,builtLimit:1}); FE.form._dupTop=r.needs[0]||null;
  return `<div class="fe-sb fe-dups"><div class="seclabel">Possible duplicates<span class="c">${r.needs.filter(dmStrong).length?'check these':''}</span></div>
    ${r.needs.map(h=>{const c=DM.byCl.get(h.id);return `<div class="fe-dup${dmStrong(h)?' strong':''}"><b>${feE(c.name)}</b><span class="small">${feE(c.product)} · ${c.rs.length} ticket${c.rs.length===1?'':'s'} · ${dmPct(h.cov)}% match</span></div>`;}).join('')||'<div class="small">No close match yet.</div>'}
    ${r.needs.length?'<button type="button" class="linkbtn" data-fedup>Review them in step 0</button>':''}</div>`;
}
function feDemandAct(act,id){
  const f=FE.form, c=DM.byCl.get(id); if(!f||!c) return;
  const keys=c.rs.map(r=>r.k).filter(Boolean);
  if(act==='use'){ dmUse(id); return; }
  f.v.related=[...new Set((f.v.related||[]).filter(x=>String(x).trim()).concat(keys.slice(0,15)))];
  if(act==='same'){ f.v.dupOf={id:c.id, name:c.name, keys:keys.slice(0,15)}; f.dup.decision='same'; uiToast('Marked as the same need as “'+c.name+'”. The weekly review can merge it.'); }
  else { f.dup.decision='linked'; uiToast('Linked '+Math.min(keys.length,15)+' ticket'+(keys.length===1?'':'s')+' from “'+c.name+'” as related.'); }
  f.dup.choice=id; fePaint();
}
function fePaintSide(){
  const f=FE.form; if(!f) return;
  const v=f.v, sg=feSigner(v), cp=feCompleteness(v), err=feLogErrors(v), owed=feOwed(v), fig=feFigure(v), lv=feLever(v), me=feMe();
  const ek=Object.keys(err), ok=Object.keys(owed), hf=v.handoff||{};
  f.el.querySelector('#fe-side').innerHTML=`
    <div class="fe-ring" style="--p:${cp.score}"><b>${cp.score}%</b><span>details</span></div>
    <div class="fe-sb"><div class="seclabel">Where it goes next</div>
      <div class="fe-next"><span class="fe-steps">${Array.from({length:10},(_,i)=>`<i class="${i<2?'on':''}${i===1?' cur':''}"></i>`).join('')}</span>
      <div>Once logged: <b>step 2 · ${ok.length?'Awaiting details':'Awaiting signature'}</b>, waiting on <b>${ok.length?feE([...new Set(ok.map(k=>feName((hf[k]||{}).to||v.raisedBy.id)))].join(', ')):feE(sg?sg.who:'the lever owner')}</b>${ok.length?', then '+feE(sg?sg.who:'the lever owner')+' signs':''}.</div></div></div>
    ${feDupBox(v)}
    <div class="fe-sb"><div class="seclabel">Signs the figure</div><div>${sg?`<b>${feE(sg.who)}</b> <span class="small">${feE(sg.role)} · ${feE(sg.rule)}</span>`:'<span class="small">Choose a lever to see who signs.</span>'}</div>
      ${sg&&sg.fundedBy?`<div class="fe-fa">Funding confirmed by <b>${feE(sg.fundedBy)}</b><div class="small">${feE(sg.fundedRule)}</div></div>`:''}
      ${fig!=null&&lv?`<div class="fe-figline">${feE(lv.l)} · <b>${feGBP(fig)}</b></div>`:''}</div>
    <div class="fe-sb"><div class="seclabel">Needed to ${f.editId?'save':'log'}<span class="c">${ek.length?ek.length+' left':'all there'}</span></div>
      ${ek.length?`<ul class="fe-miss">${ek.map(k=>`<li><button type="button" class="linkbtn" data-fegoto="${feE(k)}">${feE(err[k])}</button></li>`).join('')}</ul>`:'<div class="small ok">Everything needed to log is filled in.</div>'}</div>
    <div class="fe-sb"><div class="seclabel">Before signing<span class="c">${ok.length?ok.length+' to fill':'all there'}</span></div>
      ${ok.length?`<ul class="fe-miss fe-owed">${ok.map(k=>`<li><button type="button" class="linkbtn" data-fegoto="${feE(k)}">${feE(FE_OWED_L[k]||k)}</button>${(hf[k]||{}).to?` <span class="fe-handchip sm">&#8618; ${feE(feName(hf[k].to))}</span>`:''}</li>`).join('')}</ul><div class="small">Not needed to log. Fill them now, or hand each to the colleague who knows it.</div>`:'<div class="small ok">Ready for signing.</div>'}</div>
    <div class="fe-sb"><div class="seclabel">Would still raise the details %</div>${cp.missing.length?`<div class="small">${cp.missing.map(feE).join(' · ')}</div>`:'<div class="small ok">Nothing missing.</div>'}</div>
    <div class="fe-sb fe-logged">Logged by <b>${feE(me.name||'you')}</b>, recorded from your sign-in. The log keeps who did what, and when, for every later step.</div>`;
}
// write a new work item (T2, draft → submitted): the LE id comes from a counter held under a short lease, so two people never get the
// same one. Used by the classic form and by Beta; test items (Beta test mode) get an LE-TEST id and use no number.
async function feWriteNew(v0,opt){
  opt=opt||{}; const me=feMe();
  let id;
  if(opt.test) id='LE-TEST-'+Date.now().toString(36).toUpperCase();
  else {
    const lock=FE.db.doc('config/ledger-seq');
    let got=null;
    for(let i=0;i<5&&!got;i++){ const l=await lock.acquire({holder:me.uid+':'+Date.now(),ttlMs:15000}); if(l.acquired) got=l; else await new Promise(r=>setTimeout(r,800+Math.random()*700)); }
    if(!got) throw {code:'busy',message:'Someone else is logging an item at this moment. Try again in a few seconds.'};
    const cur=await lock.get(), yr=new Date().getUTCFullYear(), data=cur.exists?cur.data():{};
    const seq=(data.year===yr?(data.seq||0):0)+1; id='LE-'+yr+'-'+String(seq).padStart(4,'0');
    if(cur.exists) await lock.update({seq, year:yr, lastId:id}); else await lock.set({seq, year:yr, lastId:id});
  }
  const at=feNow(), v=JSON.parse(JSON.stringify(v0)), sg=feSigner(v), cp=feCompleteness(v), fig=feFigure(v);
  v.acceptanceCriteria=(v.acceptanceCriteria||[]).filter(x=>String(x).trim()); v.attachments=(v.attachments||[]).filter(x=>String(x).trim()); v.related=(v.related||[]).filter(x=>String(x).trim());
  v.customers=(v.customers||[]).filter(c=>c.client); v.figureComputedGBP=fig;
  if(opt.dup) v.dupCheck=opt.dup(at);
  const lvv=feLever(v); if(lvv&&lvv.kind==='hours') v.figureBasis=Object.assign({},v.figureBasis,{kind:'hours',hours:feHours(v)}); else if(lvv) v.figureBasis={kind:'revenue'};
  const eid='e'+Date.now()+'-'+Math.random().toString(36).slice(2,6), b='b'+Date.now().toString(36);
  const owedK=Object.keys(feOwed(v)), hf={}; owedK.forEach(k=>{ const h=(v.handoff||{})[k]; if(h&&h.to) hf[k]={to:h.to, by:me.uid, at}; }); v.handoff=hf;
  const ic=opt.ic||feIntake(v), via=opt.via||'form';
  const doc={id, status:'submitted', owed:owedK, loggedBy:me.uid, loggedAt:at, raisedBy:{id:v.raisedBy.id}, raisingLayer:v.raisingLayer, source:v.source, v,
    intakeCheck:ic, signer:sg?{who:sg.who, role:sg.role, rule:sg.rule}:null, fundingApprover:sg&&sg.fundedBy?{who:sg.fundedBy, rule:'fs-funded-approver'}:null,
    completeness:cp, preview:!!window.LEDGER_PREVIEW, updatedAt:at, updatedBy:me.uid,
    h:{[eid]:{at, by:me.uid, k:'log', from:'draft', to:'submitted', b, via}}};
  if(opt.test) doc.test=true;
  await FE.db.doc('ledger/'+id).set(doc);
  const evs={[eid]:{id:eid, at, by:me.uid, role:'requester', k:'log', from:'draft', to:'submitted', b, via, raisedBy:v.raisedBy.id, owed:owedK, intakeCheck:{glossary:ic.glossary, problemClarity:ic.problemClarity}}};
  [...new Set(Object.values(hf).map(h=>h.to))].forEach((to,i)=>{ const e2=eid+'-h'+i; evs[e2]={id:e2, at, by:me.uid, role:'requester', k:'handoff', to, fields:Object.keys(hf).filter(k=>hf[k].to===to), b}; });
  await FE.db.doc('ledger-events/'+id).set({e:evs});
  return {id, owedK, hf, sg, v};
}
// Log from the classic form: the checks, then feWriteNew
async function feLog(){
  const f=FE.form; if(!f||f.saving) return;
  const err=feLogErrors(f.v);
  if(Object.keys(err).length){ f.showErr=true; feLive(); const k=Object.keys(err)[0], el=f.el.querySelector('[data-fld="'+k+'"]'); if(el) el.scrollIntoView({block:'center',behavior:'smooth'}); return; }
  const top=f._dupTop;
  if(top&&dmStrong(top)&&!f.dup.decision){
    const c=DM.byCl.get(top.id);
    const go=await uiConfirm({title:'Possible duplicate',body:'<p><b>'+feE(c.name)+'</b> ('+feE(c.product)+', '+c.rs.length+' ticket'+(c.rs.length===1?'':'s')+') matches '+dmPct(top.cov)+'% of your words.</p><p>Go back to link it or pull its details in, or log this as a new need.</p>',ok:'Log anyway',cancel:'Go back'});
    if(!go){ f.dq=[f.v.title,f.v.problem].filter(Boolean).join('. '); feDemandRun(); const s0=f.el.querySelector('#fe-sec0'); if(s0) s0.scrollIntoView({block:'start',behavior:'smooth'}); return; }
    f.dup.decision='logged-anyway'; f.dup.choice=top.id;
  }
  const ic=feIntake(f.v);
  if(ic.glossary!=='pass'||ic.problemClarity!=='pass'){
    uiAlert({title:'The intake check did not pass',body:'<p>Fix these and log again:</p><ul>'+ic.notes.map(n=>'<li>'+feE(n)+'</li>').join('')+'</ul><p class="small">This is the basic check in the page. The intake agent replaces it at go-live.</p>'});
    return;
  }
  const me=feMe(); if(!me.ok||!me.uid){ uiToast('Sign in first.',{bad:true}); return; }
  if(!FE.db){ uiToast('The shared database is not available in this view.',{bad:true}); return; }
  f.saving=true; feLive();
  try{
    const {id, owedK, hf, sg, v}=await feWriteNew(f.v,{ic, dup:at=>({query:String(f.dup.query||'').slice(0,400), shown:(f.dup.shown||[]).slice(0,8), decision:f.dup.decision||(f._dupTop?'none':'no-match'), choice:f.dup.choice||null, ai:f.dup.ai||null, at})});
    feLS('ep-fe-draft',null);
    feClose(false);
    const owedTo=[...new Set(owedK.map(k=>(hf[k]||{}).to||v.raisedBy.id))].map(feName);
    uiToast('Logged '+id+'. '+(owedK.length?owedK.length+' detail'+(owedK.length===1?' is':'s are')+' owed by '+owedTo.join(', ')+' before '+(sg?sg.who:'the lever owner')+' signs.':'It now waits for '+(sg?sg.who:'the lever owner')+' to sign the figure.'));
    if(FE.rows.some(x=>x._id===id)) feOpenEntry(id); else FE.pendingOpen=id;
  }catch(e){
    f.saving=false; feLive();
    const c=e&&e.code;
    uiToast(c==='invalid_argument'?'Not logged: your access to this page is read-only.':c==='busy'?e.message:'Not logged ('+(c||'error')+'). Your draft is kept; try again.',{bad:true});
  }
}

// Fill in owed details on a logged item (before signing). Writes the new values, what is still owed, and one "fill" event.
// an item waits on this person when they owe details on it, or it was sent back to them
function feWaitsOn(r,uid){ if(!uid) return false; const ow=feOwedWho(r); return (!!ow&&ow.to.includes(uid)&&['submitted','returned'].includes(r.status))||(r.status==='returned'&&r.loggedBy===uid); }
function feCanFill(r){ const me=feMe(); if(!me.ok||!me.uid||!['submitted','returned'].includes(r.status)) return false; const ow=feOwedWho(r);
  return feSeesDays()||r.loggedBy===me.uid||(r.raisedBy||{}).id===me.uid||!!(ow&&ow.to.includes(me.uid)); }
async function feSaveOwed(){
  const f=FE.form; if(!f||f.saving||!f.editId) return; const r=FE.rows.find(x=>x._id===f.editId); if(!r) return;
  const err=feLogErrors(f.v); if(Object.keys(err).length){ f.showErr=true; feLive(); return; }
  const me=feMe(); if(!me.ok||!me.uid||!FE.db){ uiToast('Sign in first.',{bad:true}); return; }
  f.saving=true; feLive();
  try{
    const at=feNow(), v=JSON.parse(JSON.stringify(f.v)), before=r.v||{}, sg=feSigner(v);
    v.acceptanceCriteria=(v.acceptanceCriteria||[]).filter(x=>String(x).trim()); v.attachments=(v.attachments||[]).filter(x=>String(x).trim()); v.related=(v.related||[]).filter(x=>String(x).trim());
    v.customers=(v.customers||[]).filter(c=>c.client); v.figureComputedGBP=feFigure(v);
    if(feLever(v)&&feLever(v).kind==='hours') v.figureBasis=Object.assign({},v.figureBasis,{kind:'hours',hours:feHours(v)}); else if(feLever(v)) v.figureBasis={kind:'revenue'};
    const changed=Object.keys(Object.assign({},before,v)).filter(k=>k!=='handoff'&&JSON.stringify(before[k])!==JSON.stringify(v[k]));
    const owedK=Object.keys(feOwed(v)), hf={}; owedK.forEach(k=>{ const h=(v.handoff||{})[k]; if(h&&h.to) hf[k]=h.at?h:{to:h.to, by:me.uid, at}; }); v.handoff=hf;
    if(!changed.length&&JSON.stringify(before.handoff||{})===JSON.stringify(hf)){ f.saving=false; feClose(false); uiToast('Nothing changed.'); return; }
    const eid='e'+Date.now()+'-'+Math.random().toString(36).slice(2,6), b='b'+Date.now().toString(36);
    const ev={id:eid, at, by:me.uid, k:'fill', fields:changed, owed:owedK, b};
    await FE.db.doc('ledger/'+r._id).update({v, owed:owedK, completeness:feCompleteness(v), signer:sg?{who:sg.who, role:sg.role, rule:sg.rule}:null,
      fundingApprover:sg&&sg.fundedBy?{who:sg.fundedBy, rule:'fs-funded-approver'}:null, updatedAt:at, updatedBy:me.uid, h:Object.assign({},r.h||{},{[eid]:{at, by:me.uid, k:'fill', fields:changed, b}})});
    await FE.db.doc('ledger-events/'+r._id).set({e:Object.assign({},FE.ev[r._id]||{},{[eid]:ev})});
    const id=r._id; feClose(false);
    uiToast(owedK.length?'Saved. '+owedK.length+' detail'+(owedK.length===1?' is':'s are')+' still owed before signing.':'Saved. Everything is there: it now waits for '+(sg?sg.who:'the lever owner')+' to sign.');
    feOpenEntry(id);
  }catch(e){ f.saving=false; feLive(); const c=e&&e.code; uiToast(c==='invalid_argument'?'Not saved: your access to this page is read-only.':'Not saved ('+(c||'error')+'). Try again.',{bad:true}); }
}

// ---------- one entry ----------
function feOpenEntry(id,refresh){
  const r=FE.rows.find(x=>x._id===id); if(!r){ if(!refresh) uiToast('That item is not loaded yet.'); return; }
  const cl=CLB(); if(!cl||!cl.modal) return;
  if(refresh&&FE.openId!==id) return;
  FE.openId=id;
  const v=r.v||{}, g=feStage(r), lv=feLever(v), fig=v.figureComputedGBP!=null?v.figureComputedGBP:feFigure(v), cp=r.completeness||feCompleteness(v), co=cl.company(v.client);
  const kv=(rows)=>{ const r=rows.filter(x=>x[1]!==''&&x[1]!=null); return r.length?'<dl class="sx-kv">'+r.map(([k,val])=>`<dt>${feE(k)}</dt><dd>${val}</dd>`).join('')+'</dl>':'<p class="sx-dim" style="margin:0">Not given yet. It raises the details % when added.</p>'; };
  const t=x=>x?feE(x):'<span class="sx-dim">not given</span>';
  const ev=Object.values(FE.ev[id]||{}).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const KW={unsign:'removed the signature',move:'moved it on',chain:'closed the chain',link:'linked',unlink:'unlinked',answer:'answered a question',fill:'filled in details',handoff:'handed details to',log:'logged it',sign:'signed the figure','decline-sign':'declined to sign',return:'sent it back for details',resubmit:'answered and resubmitted',review:'reviewed it',estimate:'estimated it',approve:'approved it to the ledger',pickup:'picked it up',edit:'edited it',withdraw:'withdrew it'};
  const stamps=[['Logged',true,feName(r.loggedBy)+', '+ppWhen(r.loggedAt)],['Figure signed',!!r.signature,r.signature?'':'waiting on '+((r.signer||{}).who||'the lever owner')],
    ...(v.funded&&v.funded.yes?[['Funding confirmed',!!r.fundedConfirmation,r.fundedConfirmation?'':'waiting on '+((r.fundingApprover||{}).who||'')]]:[]),
    ['Reviewed',!!r.review,''],['Estimated',!!r.estimate,''],['Approved to ledger',!!r.approval,'not a commitment to build'],['Picked up',!!r.pickup,'only the product-business meeting']];
  const body=feFlowSvg(g)+`
    <div class="fe-now ${g.cls}"><b>${g.step?'Step '+g.step+' of 10 · ':''}${feE(g.label)}</b> · waiting on <b>${feE(g.waiting)}</b>${feDays(g,' in this stage')}</div>
    ${(()=>{ const ow=feOwedWho(r); if(!ow||!['submitted','returned'].includes(r.status)) return ''; const hf=v.handoff||{};
      return `<div class="fe-owedbox"><div><b>Before it can be signed</b>, these details are owed:<ul>${ow.keys.map(k=>`<li>${feE(FE_OWED_L[k]||k)} <span class="small">· ${feE(feName((hf[k]||{}).to||(r.raisedBy||{}).id||r.loggedBy))}</span></li>`).join('')}</ul></div>
        ${feCanFill(r)?`<button type="button" class="ibtn primary" data-fefill="${feE(r._id)}">Fill in the details</button>`:'<span class="small">The people named fill them in from here.</span>'}</div>`; })()}
    <div class="fe-stamps">${stamps.map(([l,ok,sub])=>`<div class="fe-stamp${ok?' ok':''}"><b>${ok?'✓':'○'} ${feE(l)}</b><span>${feE(sub)}</span></div>`).join('')}</div>
    ${window.btEntryHtml?window.btEntryHtml(r):''}
    <div class="fe-cols"><div>
      <div class="seclabel">The request</div>${kv([['Client',co?feE(cl.shortName(co.name)):t(v.client)],['Product area',t(v.productArea)],['Problem',t(v.problem)],['Evidence',t(v.evidence)],['Needed by',v.neededBy?feE(v.neededBy)+(v.urgencyReason?' · '+feE(v.urgencyReason):''):''],['Raised by',feE(feName((r.raisedBy||{}).id))+' · '+feE((FE_LAYERS.find(x=>x[0]===r.raisingLayer)||[,''])[1])],['Source',feE((FE_SOURCES.find(x=>x[0]===(r.source||{}).kind)||[,''])[1])+((r.source||{}).ref?' · '+feE(r.source.ref):'')]])}
      <div class="seclabel">Who it is for</div>${kv([['Customers',(v.customers||[]).map(c=>{const x=cl.company(c.client);return feE(x?cl.shortName(x.name):c.client)+(x&&x.tier?' (T'+x.tier+')':'')+(c.contact?' · '+feE(c.contact):'')+(c.how?' · '+feE(c.how):'')}).join('<br>')],['Users',feE((v.whoFor||[]).join(', '))],['User story',t(v.userStory)],['Today',t(v.currentWorkaround)]])}
      <div class="seclabel">The detail</div>${kv([['Differs from today',v.differsFromToday?feE(v.differsFromToday):''],['User journey',v.userJourneyImpact?feE(v.userJourneyImpact):''],['Surfaces',(v.surfaces&&v.surfaces.on||[]).map(k=>feE((FE_SURF.find(x=>x[0]===k)||[,k])[1])+((v.surfaces.notes||{})[k]?': '+feE(v.surfaces.notes[k]):'')).join('<br>')],['Acceptance criteria',(v.acceptanceCriteria||[]).length?'<ol class="fe-ol">'+v.acceptanceCriteria.map(x=>'<li>'+feE(x)+'</li>').join('')+'</ol>':''],['Success measure',v.successMeasure?feE(v.successMeasure):''],['Events',(v.eventsImpacted||[]).map(feE).join('<br>')],['Attachments',(v.attachments||[]).map(x=>/^https?:/.test(x)?`<a href="${feE(x)}" target="_blank" rel="noopener">${feE(x)}</a>`:feE(x)).join('<br>')],['Related',(v.related||[]).map(x=>/^[A-Z][A-Z0-9]+-\d+$/.test(x)?`<a href="https://expoplatform.atlassian.net/browse/${feE(x)}" target="_blank" rel="noopener">${feE(x)}</a>`:feE(x)).join(', ')],['Dependencies',v.dependencies?feE(v.dependencies):''],['Risks',v.risks?feE(v.risks):''],['Alternatives',v.alternativesConsidered?feE(v.alternativesConsidered):'']])}
    </div><div>
      <div class="seclabel">The value</div>${kv([['Lever',lv?'<b>'+feE(lv.l)+'</b>':''],['Figure',fig!=null?'<b>'+feGBP(fig)+'</b>'+(r.signature?'':' <span class="sx-warn">unsigned</span>'):''],['In words',t(v.figureText)],['Assumption',t(v.assumption)],['Working',feE(Object.entries(v.figureDetail||{}).filter(([k,x])=>String(x??'').trim()).map(([k,x])=>k.replace(/([A-Z])/g,' $1').toLowerCase()+': '+x).join(' · '))+(v.figureBasis&&v.figureBasis.kind==='hours'?'<br>'+feE(v.figureBasis.hours)+' h × £'+feE(v.figureBasis.rateGBP)+' ('+feE(v.figureBasis.rateSource)+')':'')],['Signs',feE((r.signer||{}).who)+' <span class="sx-dim">'+feE((r.signer||{}).rule)+'</span>'],['Funded',v.funded&&v.funded.yes?feGBP(v.funded.contributionGBP)+' contribution · '+feE(v.funded.agreedEstimateDays)+' days agreed · confirmed by '+feE((r.fundingApprover||{}).who):'No'],['Existing and growing',v.existingGrowing&&v.existingGrowing.yes?feGBP(v.existingGrowing.currentARRGBP)+' ARR, +'+feGBP(v.existingGrowing.growthGBP):'No'],['Build cost','<span class="sx-dim">at estimate</span>'],['Net value','<span class="sx-dim">at estimate</span>']])}
      <div class="seclabel">Details<span class="c">${cp.score}%</span></div><div class="small">${cp.missing.length?'Missing: '+cp.missing.map(feE).join(' · '):'Nothing missing.'}</div>
      <div class="seclabel">Duplicate check</div><div class="small">${v.dupCheck?feE({same:'Marked as the same need as ',linked:'Linked as related to ',used:'Details pulled from ','logged-anyway':'Logged as new despite a close match with ',none:'Searched; logged as new',  'no-match':'No close match in the demand map'}[v.dupCheck.decision]||v.dupCheck.decision)+(v.dupCheck.choice&&DM.byCl.get(v.dupCheck.choice)?'“'+feE(DM.byCl.get(v.dupCheck.choice).name)+'”':''):'<span class="sx-dim">not run</span>'}</div>
      <div class="seclabel">Intake check</div><div class="small">Glossary <b>${feE((r.intakeCheck||{}).glossary)}</b> · problem clarity <b>${feE((r.intakeCheck||{}).problemClarity)}</b> <span class="sx-dim">(basic check in the page)</span></div>
      <div class="seclabel">History<span class="c">${ev.length} event${ev.length===1?'':'s'}</span></div>
      <div class="fe-hist">${ev.map(e=>`<div><span class="sx-dim">${feE(ppWhen(e.at))}</span> <b>${feE(feName(e.by))}</b> ${feE(KW[e.k]||e.k)}${e.k==='handoff'&&e.to?' <b>'+feE(feName(e.to))+'</b>: '+feE((e.fields||[]).map(k=>FE_OWED_L[k]||k).join(', ')):''}${e.k==='fill'&&(e.fields||[]).length?' <span class="sx-dim">'+feE(e.fields.slice(0,6).join(', '))+'</span>':''}${e.from?' <span class="sx-dim">'+feE(e.from)+' → '+feE(e.to)+'</span>':''}</div>`).join('')||'<span class="sx-dim">Loading the log…</span>'}</div>
    </div></div>
    <p class="fe-next-note">Signing, review, estimate, approval and pickup are the next build step. They follow exploring/03-lifecycle.md once the open decisions (owners, rates, stage limits) are answered.</p>`;
  cl.modal((r.id||id)+' · '+(v.title||''),`<span>${feE(lv?lv.l:'')}</span><span>${fig!=null?feGBP(fig):''}</span><span>logged by ${feE(feName(r.loggedBy))}</span>${r.preview&&window.LEDGER_PREVIEW?'<span class="pp-tag noest">preview test entry</span>':''}`,body,'<span class="small">New to this flow? See a sample item go through every step.</span><button type="button" class="ibtn" data-fewalk>&#9654; Sample walkthrough</button>');
  const mo=document.getElementById('modal'); if(mo){ const box=mo.querySelector('.box'); if(box) box.classList.add('fe-wide'); const x=()=>{ FE.openId=null; if(box) box.classList.remove('fe-wide'); }; mo.addEventListener('click',function h(e){ if(e.target.closest('[data-close]')){ x(); mo.removeEventListener('click',h); } }); }
}

// ---------- wiring ----------
(function feWire(){
  const sw=document.getElementById('rq-switch');
  if(sw) sw.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) feSetView(b.dataset.v); });
  const nb=document.getElementById('fl-new'); if(nb) nb.addEventListener('click',()=>feOpenForm());
  const host=document.getElementById('fl-host');
  if(host){
    host.addEventListener('click',e=>{ let b;
      if(e.target.closest('[data-fenew]')||e.target.closest('[data-fedraft]')){ feOpenForm(); return; }
      if(e.target.closest('[data-feflow]')){ feOpenFlow(); return; }
      if(e.target.closest('[data-fewalk]')){ feOpenWalk(); return; }
      if((b=e.target.closest('[data-feopen]'))){ feOpenEntry(b.dataset.feopen); } });
    host.addEventListener('change',e=>{ if(e.target.id==='fe-mine'){ FE.mine=e.target.checked; feRender(); } if(e.target.id==='fe-wait'){ FE.waitMine=e.target.checked; feRender(); } });
  }
  const v=feLS('ep-rq-view'); feSetView(v==='pp'?'pp':'fl');
  window.feOpenForm=feOpenForm;
  window.addEventListener('ep-gate',()=>{ feRender(); feNames(); });
})();
feBoot();

document.addEventListener('toggle',e=>{ const t=e.target; if(t&&t.classList&&t.classList.contains('pp-about')) PP.aboutOpen=t.open; if(t&&t.classList&&t.classList.contains('pp-more')) PP.moreOpen=t.open; if(t&&t.classList&&t.classList.contains('dm-sighow')) DM.sigOpen=t.open; },true);
window.addEventListener('ep-gate',()=>{ ppRender(); ppEdSync(true); });
ppBoot();

// ================= Personal layer, onboarding and the Guide (28 Sep 2026) =================
// Everything here is per viewer: preferences live in the viewer's private data/users/<id>/prefs document (ids only), with
// the browser as a fallback. Nothing opens by itself except one welcome card on a first visit; the Guide stays a small pill.
const OB={prefs:null, db:null, uid:null, ready:false, tour:null, nudgeT:0, open:false, pane:'tours', ask:{q:'',a:'',busy:false,err:''}, myq:''};
const EP_MY=window.EP_MY={on:false, set:new Set()};
const OB_ROLES=[['sales','Sales'],['tam','TAM / customer success'],['pe','Product & engineering'],['delivery','Delivery'],['lead','Leadership']];
const OB_LAND={sales:'overview',tam:'overview',pe:'pipeline',delivery:'delivery',lead:'overview'};
// timeline stays in the names: older feedback, visits and History entries still point at it
const OB_TABN={overview:'Overview',ledger:'Clients',timeline:'Timeline',pipeline:'Requests',demand:'Demand',delivery:'Delivery',bugs:'Bugs',incidents:'Incidents',logic:'Rules',method:'Method & sources',refresh:'Sync & logs'};
const OB_PRIV=new Set(['logic','refresh']);
const obE=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const obAjay=()=>!!(window.EP_ACCESS&&window.EP_ACCESS.ajay);
const obHow=()=>!!(window.EP_ACCESS&&window.EP_ACCESS.how);
// ---- the tours: a few steps per tab, each pointing at one thing
const OB_TOURS={
  overview:[['#tabs','Sections','Client health (Overview, Clients) shows every client from their side. Product delivery holds requests, demand, delivery, bugs and incidents.'],
    ['#ov-strip','What needs attention','The strip sums up today: clients to act on, open incidents and shows coming up. Click a tile to jump to it.'],
    ['#ov-cal','The next 8 weeks of shows','Every show, coloured by risk: Act now, Watch, No flag, Clear. Click a show to open that client.'],
    ['#ov-radar','Shows at risk','Clients with a show inside the window, riskiest first. Change the window with 30, 60 or 90 days.'],
    ['#find-open','Find a client','Jump to any client from anywhere. Press / to open it.'],
    ['#fb-open','Feedback','Happy, sad, or want something? Tell Ajay in two clicks. Only Ajay sees it, and replies come back to you here.'],
    ['#sync-pill','Always current','Jira refreshes itself at least every 4 hours for everyone. Click it to see when, and by whom.']],
  ledger:[['#f-tier','Filter the clients','Narrow by tier, owner or name. The count shows how many match.'],
    ['#t-ledger','One row per client','Health, what is broken for them and what we promised. Click a row to open the client.'],
    ['#chart-penalty','Where quality hurts','Which clients lose the most health to incidents and bugs. Click a bar to open the client.']],
  pipeline:[['#rq-switch','Two ledgers','The Feature ledger holds new work items; the Must-have ledger holds what we promised clients.'],
    ['#fl-new','Log a work item','Logging is moving to a Claude skill (in progress): the button explains what happens meanwhile. Details handed to you can still be filled in from the item.'],
    ['#fl-host .fe-tab','Where each item is','Every item shows its step, and who it is waiting on. Click one to see it on the flow.'],
    ['#fl-host [data-fewalk]','See it end to end','A sample item walked through every step, for calls or on your own.']],
  demand:[['#dm-q','Search in your own words','Describe a need; the closest asks, needs and built stories appear as you type.'],
    ['#dm-ai','Ask AI','Claude judges the closest matches: duplicate, overlap, related or already built.'],
    ['#dm-view','Three views','Where Tier 1 is asking, the needs, and every request with its tickets.']],
  delivery:[['#d-view','Views','A timeline of stories by client, epics, or a list with charts.'],
    ['#d-zoom','Zoom','Bigger or smaller columns and text.'],
    ['#dtl','Stories by month','Click a cell to see the stories behind it.']],
  bugs:[['#b-pr','Filter bugs','By priority, client, team or status.'],['#t-bugs','Sort','Click a column heading to sort.']],
  incidents:[['#chart-inc','Incidents by month','Production incidents from Jira IMP, kept current by the refresh.'],['#t-inc','Every incident','Newest first, with the client, event and status.']],
  logic:[['#lg-group','The rules','Every rule behind the page, grouped. Only you see this tab.']],
  method:[['#defs','Definitions','What a number on this page means, defined once. Other tabs link here instead of repeating the rule.'],['#t-model','How health is scored','The model and its sources. Everyone can read this tab; nothing on it can be edited.']],
  refresh:[['#sl-sub','Two views','Data refresh keeps every source current; History lists every change anyone made, with who and when.'],['#rf-host .rf-tab','Every source','How fresh each one is, and a pull of only what changed.'],['#rf-host [data-rfall]','Pull all deltas','Pull every source the page can reach in one go.']]};
const OB_WHAT={overview:'Today at a glance: which clients have a show coming, how risky it looks, and what is open for them.',
  ledger:'Every client, with health, open problems and promises. Click a client for everything about them.',
  pipeline:'Requests. The Feature ledger tracks new work items from logging to done; the Must-have ledger tracks client promises.',
  demand:'What clients are asking for, grouped into needs, so the same request is not logged twice.',
  delivery:'What was built and is being built, by client, month and product area.',
  bugs:'Open client bugs from Jira EP, with priority and age.', incidents:'Production incidents from Jira IMP.',
  logic:'The rules and thresholds behind every number. Private to you.', method:'Definitions of the numbers (the Demand signal first), how the health score works, and every source. Read-only, open to everyone.', refresh:'Sync & logs: freshness of every source with delta pulls (Data refresh), and every change anyone made, with who and when (History). Private to you.'};
const OB_GLOSS=[['Tier','Sales Tier from Planhat: 1 is the most valuable client, 4 the least.'],['Health','Planhat health score, 0 to 10; bugs and incidents lower it.'],
  ['Act now · Watch · No flag · Clear','The risk before a client’s next show: Act now means something open trips a risk rule; Clear means nothing is open.'],
  ['Show','A client event from Jira OP, with its dates.'],['Must-have ledger','What we promised a client, with the month it should land.'],
  ['Feature ledger','New work items, from logging to done, each with one value lever and one £ figure.'],
  ['Value lever','Why an item is worth doing: increase revenue, retain revenue, reduce cost or avoid cost. Exactly one.'],
  ['Signer','The person who stands behind the £ figure: Sales (Chris) for revenue, Operations (Susan or Ilaria) for cost.'],
  ['Funded','The client pays towards the item. Funded on 28 Sep 2026: all Hyve dedicated team work, the IMEX AI Search project, and Vinexposium’s required custom filters.'],['Build cost · Net value','Build cost is the estimate in days × the day rate; net value is the figure minus the build cost.'],
  ['Before signing','A field that is not needed to log but must be filled before the figure is signed. It can be handed to a colleague.'],
  ['Needs details','An item sent back to the requester with questions; it keeps its place and returns to the same step.'],
  ['On the ledger · not scheduled','Approved and ranked, but not yet a commitment to build. Only the product-business meeting picks items up.'],
  ['Need','A group of requests asking for the same thing, in the demand map.'],
  ['Signal (Demand)','Who is asking for a need, weighted by each customer\'s Sales Tier. Not a priority score. The full rule, with the weights, is in Method & sources under Definitions.'],['Incident','A production problem logged in Jira IMP.'],
  ['Bug priority','Urgent, High, Medium, Low, from Jira EP.'],['Hyve dedicated team','A team working only for Hyve; its tickets live in Jira HV.'],
  ['Delta refresh','Pulling only what changed since the last pull, never everything again.'],
  ['Feedback','Happy, Sad or Want: tell Ajay what works, what does not and what you would like. Only Ajay sees it; replies come back in the Guide, under Feedback.']];
// ---- preferences
function obLS(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} return null; }
async function obLoad(){
  const g=window.GATE||{}; OB.uid=g.uid||null;
  let p=null; try{ p=JSON.parse(obLS('ep-ob-prefs')||'null'); }catch(e){}
  if(OB.uid){ try{ OB.db=await window.claude.use('db'); if(OB.db){ const d=await OB.db.doc('data/users/'+OB.uid+'/prefs').get(); if(d.exists) p=Object.assign({},p||{},d.data()); } }catch(e){} }
  OB.prefs=Object.assign({role:'', my:[], myOn:false, skipped:false, welcomed:false, tours:{}, hints:{}, nudged:{}, lastSeen:null, prevSeen:null, lastTab:''}, p||{});
  OB.prefs.prevSeen=OB.prefs.lastSeen; OB.prefs.lastSeen=new Date().toISOString();
  EP_MY.set=new Set(OB.prefs.my||[]); EP_MY.on=!!OB.prefs.myOn&&EP_MY.set.size>0;
  OB.ready=true; obSave();
}
let OB_SAVE_T=0;
function obSave(){ clearTimeout(OB_SAVE_T); OB_SAVE_T=setTimeout(async()=>{ const p=OB.prefs; if(!p) return; obLS('ep-ob-prefs',JSON.stringify(p));
  if(OB.db&&OB.uid){ try{ await OB.db.doc('data/users/'+OB.uid+'/prefs').set(JSON.parse(JSON.stringify(p))); }catch(e){} } },300); }
const obFirst=()=>String(((window.GATE||{}).name||'').trim().split(/\s+/)[0]||'');
function obSuggestMine(){ const f=obFirst().toLowerCase(), cl=CLB(); if(!f||!cl) return []; return cl.activeClients().filter(c=>String(c.owner||'').trim().toLowerCase()===f).map(c=>c.pd); }
function obRerender(){ const cl=CLB(); if(cl&&cl.rerender) cl.rerender(); obGreet(); }
// ---- the greeting: by name, what changed since the last visit, what is waiting on you, and my clients
function obWaiting(){ const uid=OB.uid; if(!uid||typeof FE==='undefined') return [];
  return (FE.rows||[]).filter(r=>{ try{ const ow=feOwedWho(r); return (ow&&ow.to.includes(uid)&&['submitted','returned'].includes(r.status))||(r.status==='returned'&&r.loggedBy===uid); }catch(e){ return false; } }); }
function obSince(){
  const p=OB.prefs, cl=CLB(); if(!p||!p.prevSeen||!cl||!cl.bugs) return null; const since=String(p.prevSeen).slice(0,10), mine=EP_MY.set;
  const inScope=ids=>!mine.size||ids.some(id=>mine.has(id));
  const bugs=cl.bugs().filter(b=>String(b.cr||'')>since&&inScope((b.repIds||[]).concat(b.affIds||[])));
  const inc=cl.incidents().filter(i=>String(i.cr||'')>since&&inScope(i.ids||[]));
  let moved=0; try{ Object.values(FE.ev||{}).forEach(m=>Object.values(m||{}).forEach(e=>{ if(String(e.at)>p.prevSeen&&e.by!==OB.uid) moved++; })); }catch(e){}
  return {bugs:bugs.length, inc:inc.length, moved, scope:mine.size?'your clients':'all clients'};
}
function obGreet(){
  const host=document.getElementById('panel-overview'); if(!host||!OB.ready||!(window.GATE||{}).ok) return;
  let el=document.getElementById('ob-greet'); if(!el){ el=document.createElement('div'); el.id='ob-greet'; el.className='ob-greet'; host.insertBefore(el,host.firstChild); }
  const h=new Date().getHours(), hi=h<12?'Good morning':h<18?'Good afternoon':'Good evening', n=obFirst(), s=obSince(), w=obWaiting(), my=EP_MY.set.size;
  const bits=s?[s.bugs?s.bugs+' new client bug'+(s.bugs===1?'':'s'):'', s.inc?s.inc+' new incident'+(s.inc===1?'':'s'):'', s.moved?s.moved+' work-item update'+(s.moved===1?'':'s'):''].filter(Boolean):[];
  el.innerHTML=`<div class="ob-hi"><b>${obE(hi)}${n?', '+obE(n):''}.</b> <span>${s?(bits.length?'Since your last visit, for '+obE(s.scope)+': '+obE(bits.join(', '))+'.':'Nothing new for '+obE(s.scope)+' since your last visit.'):'Here is where every client stands today.'}</span></div>
    ${w.length?`<button type="button" class="ob-wait" data-obwait>${w.length} waiting on you</button>`:''}
    <span class="seg ob-scope" role="group" aria-label="Which clients">${[['all','All clients'],['my','My clients'+(my?' ('+my+')':'')]].map(([k,l])=>`<button type="button" data-obscope="${k}" aria-pressed="${(k==='my')===EP_MY.on}">${obE(l)}</button>`).join('')}</span>`;
}
// ---- welcome card: once, on a first visit
function obWelcome(){
  if(document.getElementById('ob-welcome')||!OB.prefs||OB.prefs.welcomed) return;
  const sug=obSuggestMine(), cl=CLB();
  const d=document.createElement('div'); d.id='ob-welcome'; d.className='ob-welcome'; d.setAttribute('role','dialog'); d.setAttribute('aria-labelledby','ob-w-h');
  d.innerHTML=`<button type="button" class="ob-x" data-oblater aria-label="Close">&#215;</button>
    <div class="ob-w-eyebrow">Welcome${obFirst()?', '+obE(obFirst()):''}</div>
    <h3 id="ob-w-h">This ledger shows every client from their side.</h3>
    <p>What is broken for them, what we promised, and how close their next show is. It takes a minute to learn.</p>
    <div class="ob-w-l">What is your role? <span class="small">It sets where you land and what the tours show first.</span></div>
    <div class="ob-roles">${OB_ROLES.map(([k,l])=>`<button type="button" class="ob-role" data-obrole="${k}" aria-pressed="${OB.prefs.role===k}">${obE(l)}</button>`).join('')}</div>
    ${sug.length?`<label class="ob-mine"><input type="checkbox" id="ob-mine" checked> Show my clients first: ${obE(sug.slice(0,4).map(pd=>cl.shortName((cl.company(pd)||{}).name||pd)).join(', '))}${sug.length>4?' and '+(sug.length-4)+' more':''} <span class="small">(you own them in Planhat)</span></label>`:''}
    <div class="ob-w-acts"><button type="button" class="ibtn primary" data-obgo>Take the 60-second tour</button><button type="button" class="ibtn" data-oblater>Later</button><button type="button" class="linkbtn" data-obskip>Skip, I know my way around</button></div>`;
  document.body.appendChild(d);
}
function obCloseWelcome(){ const d=document.getElementById('ob-welcome'); if(!d) return; const m=d.querySelector('#ob-mine'), sug=obSuggestMine();
  if(m&&m.checked&&sug.length&&!(OB.prefs.my||[]).length){ OB.prefs.my=sug; OB.prefs.myOn=true; EP_MY.set=new Set(sug); EP_MY.on=true; obRerender(); }
  OB.prefs.welcomed=true; obSave(); d.remove(); }
// ---- tours: spotlight + card
function obSteps(tab){ return (OB_TOURS[tab]||[]).filter(([sel])=>{ const el=document.querySelector(sel); if(!el) return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }); }
function obStartTour(tab){
  tab=tab||obCurTab(); if(OB_PRIV.has(tab)&&!obHow()) return;
  obNudgeHide(); const d=document.getElementById('ob-welcome'); if(d) obCloseWelcome(); obGuide(false);
  if(obCurTab()!==tab){ const cl=CLB(); if(cl&&cl.showTab) cl.showTab(tab); }
  setTimeout(()=>{ const st=obSteps(tab); if(!st.length){ uiToast('Nothing to show on this tab yet.'); return; } OB.tour={tab, steps:st, i:0}; obPaintTour(); },120);
}
function obEndTour(done){ const t=OB.tour; OB.tour=null; ['ob-spot','ob-card'].forEach(id=>{ const e=document.getElementById(id); if(e) e.remove(); });
  if(t&&done){ OB.prefs.tours[t.tab]=true; obSave(); const nx=obNextTour(); uiToast(obTabName(t.tab)+' tour done.'+(nx?'':' You have seen every tour.'),nx?{action:'Next: '+obTabName(nx),onAction:()=>obStartTour(nx)}:{}); } }
const obTabName=t=>OB_TABN[t]||t;
function obNextTour(){ const order=Object.keys(OB_TOURS).filter(t=>!OB_PRIV.has(t)||obHow()); return order.find(t=>!OB.prefs.tours[t]&&document.querySelector('.tab[data-tab="'+t+'"]'))||null; }
function obPaintTour(){
  const t=OB.tour; if(!t) return; const [sel,title,text]=t.steps[t.i], el=document.querySelector(sel); if(!el){ obEndTour(false); return; }
  { const r=el.getBoundingClientRect(); if(r.top<70||r.bottom>innerHeight-190) el.scrollIntoView({block:r.height>innerHeight-260?'start':'center',behavior:'auto'}); }
  let spot=document.getElementById('ob-spot'); if(!spot){ spot=document.createElement('div'); spot.id='ob-spot'; spot.className='ob-spot'; spot.setAttribute('aria-hidden','true'); document.body.appendChild(spot); }
  let card=document.getElementById('ob-card'); if(!card){ card=document.createElement('div'); card.id='ob-card'; card.className='ob-card'; card.setAttribute('role','dialog'); card.setAttribute('aria-live','polite'); document.body.appendChild(card); }
  card.innerHTML=`<div class="ob-c-top"><span class="ob-c-tab">${obE(obTabName(t.tab))} tour</span><span class="ob-c-n">${t.i+1} of ${t.steps.length}</span></div>
    <h4>${obE(title)}</h4><p>${obE(text)}</p>
    <div class="ob-dots">${t.steps.map((_,k)=>`<i class="${k===t.i?'on':k<t.i?'done':''}"></i>`).join('')}</div>
    <div class="ob-c-acts"><button type="button" class="linkbtn" data-obtend>Skip tour</button><span></span>${t.i?'<button type="button" class="ibtn" data-obtprev>Back</button>':''}<button type="button" class="ibtn primary" data-obtnext>${t.i<t.steps.length-1?'Next':'Done'}</button></div>`;
  obPlace(el,spot,card); requestAnimationFrame(()=>obPlace(el,spot,card));
  const b=card.querySelector('[data-obtnext]'); if(b) b.focus({preventScroll:true});
}
function obPlace(el,spot,card){
  const r=el.getBoundingClientRect(), pad=6, vw=innerWidth, vh=innerHeight;
  const x=Math.max(4,r.left-pad), y=Math.max(4,r.top-pad), w=Math.min(vw-8,r.width+2*pad), h=Math.min(vh-8,r.height+2*pad);
  Object.assign(spot.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
  const cw=card.offsetWidth, ch=card.offsetHeight, gap=12;
  const opts=[[r.left,r.bottom+gap],[r.left,r.top-gap-ch],[r.right+gap,r.top],[r.left-gap-cw,r.top]];
  const fits=([cx,cy])=>cy>=8&&cy+ch<=vh-8&&cx>=8-cw&&true;
  const clear=([a,b2])=>{ const x=Math.max(8,Math.min(vw-cw-8,a)); return b2>=8&&b2+ch<=vh-8&&!(x<r.right&&x+cw>r.left&&b2<r.bottom&&b2+ch>r.top); };
  // a tall target (taller than the room left): try beside it at the top of the viewport, then either lower corner
  const side=[[r.right+gap,Math.max(8,r.top)],[r.left-gap-cw,Math.max(8,r.top)],[r.right+gap,vh-ch-8],[r.left-gap-cw,vh-ch-8],[vw-cw-8,vh-ch-8],[8,vh-ch-8]].filter(([a])=>a>=8&&a+cw<=vw-8);
  let [cx,cy]=opts.find(clear)||side.find(clear)||[vw-cw-16,vh-ch-16];
  cx=Math.max(8,Math.min(vw-cw-8,cx)); cy=Math.max(8,Math.min(vh-ch-8,cy));
  if(cx<r.right&&cx+cw>r.left&&cy<r.bottom&&cy+ch>r.top){ // still covering the target: move to the side with more room
    cy=(r.top>vh-r.bottom)?Math.max(8,r.top-gap-ch):Math.min(vh-ch-8,r.bottom+gap); }
  Object.assign(card.style,{left:cx+'px',top:cy+'px'});
}
// ---- a first-visit nudge per tab (floating, never in the layout)
function obNudge(tab){
  if(!OB.ready||!OB.prefs||OB.prefs.skipped||!OB.prefs.welcomed||OB.tour||document.getElementById('fb-nudge')||OB.prefs.tours[tab]||OB.prefs.nudged[tab]||!OB_TOURS[tab]||(OB_PRIV.has(tab)&&!obHow())) return;
  if(!obSteps(tab).length) return;
  OB.prefs.nudged[tab]=true; obSave(); obNudgeHide();
  const n=document.createElement('div'); n.id='ob-nudge'; n.className='ob-nudge'; n.setAttribute('role','status');
  n.innerHTML=`<span>New to <b>${obE(obTabName(tab))}</b>?</span><button type="button" class="ibtn primary" data-obtour="${tab}">30-second tour</button><button type="button" class="linkbtn" data-obnudgex>Not now</button>`;
  document.body.appendChild(n); clearTimeout(OB.nudgeT); OB.nudgeT=setTimeout(obNudgeHide,15000);
}
function obNudgeHide(){ const n=document.getElementById('ob-nudge'); if(n) n.remove(); }
// ---- one-line hints, the first time each kind of pop-up opens
const OB_HINTS={walk:'Step with ← and →, or click any step on the flow.',entry:'Where this item is and who it waits on. Owed details can be filled in from here.',
  flow:'The whole path of a work item. Each box is a step; hover for who does it.',client:'Everything for this client in one place. Esc closes.',
  c360:'This client’s shows, open work and what they ask for. Esc closes.',form:'Only the five * fields are needed to log. Hand anything you do not know to a colleague.',
  month:'Click a chip to switch what you see for this month. Links open the Jira ticket.'};
function obHintScan(){
  if(!OB.ready||!OB.prefs||OB.prefs.skipped) return;
  const mo=document.getElementById('modal'), open=mo&&mo.hasAttribute('open'), b=document.getElementById('modal-body');
  let k=null, host=null;
  if(document.getElementById('fe-m')){ k='form'; host=document.querySelector('#fe-m .fe-form'); }
  else if(open&&b){ host=b; k=b.querySelector('.fe-wk')?'walk':b.querySelector('.fe-rules')?'flow':b.querySelector('.fe-now')?'entry':b.querySelector('.mir-chips,.tm-chips')?'month':'client'; }
  else { const c=document.getElementById('c360'); if(c&&!c.hidden){ k='c360'; host=document.getElementById('c360-body'); } }
  if(!k||!host||OB.prefs.hints[k]||host.querySelector('.ob-hint')) return;
  OB.prefs.hints[k]=true; obSave();
  const h=document.createElement('div'); h.className='ob-hint'; h.innerHTML=`<span class="ob-hint-i" aria-hidden="true">i</span><span>${obE(OB_HINTS[k])}</span><button type="button" class="ob-hint-x" aria-label="Dismiss">&#215;</button>`;
  h.querySelector('button').onclick=()=>h.remove(); host.insertBefore(h,host.firstChild);
}
// ---- the Guide: a pill, and a panel with tours, glossary, my settings and Ask the guide
function obCurTab(){ const t=document.querySelector('.tab[aria-selected="true"]'); return t?t.dataset.tab:'overview'; }
function obGuide(open){
  OB.open=open; let p=document.getElementById('ob-guide');
  const pill=document.getElementById('ob-pill'); if(pill) pill.setAttribute('aria-expanded',String(open));
  if(!open){ if(p) p.remove(); return; }
  if(!p){ p=document.createElement('div'); p.id='ob-guide'; p.className='ob-guide'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Guide'); document.body.appendChild(p); }
  obPaintGuide();
}
function obPaintGuide(){
  const p=document.getElementById('ob-guide'); if(!p) return; const tab=obCurTab(), pr=OB.prefs||{tours:{}}, cl=CLB();
  const tours=Object.keys(OB_TOURS).filter(t=>(!OB_PRIV.has(t)||obHow())&&document.querySelector('.tab[data-tab="'+t+'"]'));
  const done=tours.filter(t=>pr.tours[t]).length;
  let body='';
  if(OB.pane==='tours') body=`<div class="ob-what"><b>What am I looking at?</b> ${obE(OB_WHAT[tab]||'')}</div>
      <div class="ob-prog"><span style="width:${Math.round(done/Math.max(1,tours.length)*100)}%"></span></div><div class="small">${done} of ${tours.length} tours done</div>
      <div class="ob-tl">${tours.map(t=>`<button type="button" class="ob-tt${t===tab?' here':''}" data-obtour="${t}"><span class="ob-tick${pr.tours[t]?' on':''}">${pr.tours[t]?'✓':''}</span><b>${obE(obTabName(t))}</b><span class="small">${(OB_TOURS[t]||[]).length} steps</span></button>`).join('')}</div>`;
  else if(OB.pane==='terms') body=`<input type="search" id="ob-gq" class="ob-in" placeholder="Find a term" value="${obE(OB.gq||'')}" autocomplete="off">
      <dl class="ob-gl">${OB_GLOSS.filter(([t,d])=>!OB.gq||(t+' '+d).toLowerCase().includes(String(OB.gq).toLowerCase())).map(([t,d])=>`<dt>${obE(t)}</dt><dd>${obE(d)}</dd>`).join('')||'<dd class="small">No term matches.</dd>'}</dl>`;
  else if(OB.pane==='ask') body=`<p class="small">Ask how to do something on this page. The answer comes from the page’s own help and rules.</p>
      <textarea id="ob-aq" class="ob-in" rows="3" placeholder="e.g. How do I log a request for a funded client?">${obE(OB.ask.q)}</textarea>
      <div class="ob-ask-acts"><button type="button" class="ibtn primary" data-obask${OB.ask.busy?' disabled':''}>${OB.ask.busy?'Thinking…':'Ask'}</button></div>
      ${OB.ask.err?`<div class="small ob-err">${obE(OB.ask.err)}</div>`:''}<div class="ob-ans" id="ob-ans"${OB.ask.a?'':' hidden'}></div>`;
  else if(OB.pane==='fb') body=fbPane();
  else { const mine=EP_MY.set, all=cl?cl.activeClients().slice().sort((a,b)=>cl.shortName(a.name).localeCompare(cl.shortName(b.name))):[], q=String(OB.myq||'').toLowerCase();
    body=`${obAjay()?fbInboxCta():''}<div class="ob-set"><div class="ob-w-l">Your role</div><div class="ob-roles sm">${OB_ROLES.map(([k,l])=>`<button type="button" class="ob-role" data-obrole="${k}" aria-pressed="${pr.role===k}">${obE(l)}</button>`).join('')}</div>
      <div class="ob-w-l">My clients <span class="small">${mine.size} chosen · filters Overview and Clients</span></div>
      <input type="search" id="ob-myq" class="ob-in" placeholder="Find a client" value="${obE(OB.myq||'')}" autocomplete="off">
      <div class="ob-myl">${all.filter(c=>!q||c.name.toLowerCase().includes(q)).map(c=>`<label><input type="checkbox" data-obmy="${obE(c.pd)}"${mine.has(c.pd)?' checked':''}> ${obE(cl.shortName(c.name))}<span class="small">${c.owner?obE(c.owner):''}</span></label>`).join('')}</div>
      <div class="ob-set-acts"><button type="button" class="linkbtn" data-obrestart>Start onboarding again</button></div></div>`; }
  p.innerHTML=`<div class="ob-g-top"><b>Guide</b><button type="button" class="ob-x" data-obclose aria-label="Close the guide">&#215;</button></div>
    <div class="ob-g-tabs" role="tablist">${[['tours','Tours'],['terms','Glossary'],['ask','Ask'],['fb','Feedback'],['me','You']].map(([k,l])=>`<button type="button" role="tab" data-obpane="${k}" aria-selected="${OB.pane===k}">${l}${k==='fb'&&fbUnread()?'<i class="fb-dot" aria-label="new reply"></i>':''}</button>`).join('')}</div>
    <div class="ob-g-body">${body}</div>`;
  if(OB.pane==='ask'&&OB.ask.a){ const a=p.querySelector('#ob-ans'); if(a) a.textContent=OB.ask.a; }
  if(OB.pane==='fb') fbMarkSeen();
}
function obCorpus(){
  const lines=['PAGE SECTIONS:'].concat(Object.keys(OB_WHAT).filter(t=>!OB_PRIV.has(t)||obHow()).map(t=>'- '+obTabName(t)+': '+OB_WHAT[t]));
  lines.push('HOW TO USE EACH SECTION:'); Object.keys(OB_TOURS).filter(t=>!OB_PRIV.has(t)||obHow()).forEach(t=>OB_TOURS[t].forEach(([,h,x])=>lines.push('- '+obTabName(t)+' / '+h+': '+x)));
  lines.push('TERMS:'); OB_GLOSS.forEach(([t,d])=>lines.push('- '+t+': '+d));
  lines.push('FEATURE LEDGER FLOW: 1 Draft (requester) → 2 Awaiting signature (lever owner signs the £ figure; Chris for revenue, Susan or Ilaria for cost; funded items raised by Sales or the relationship team: Chris only) → 3 Awaiting review (Ajay, weekly) → 4 Awaiting estimate (Bartosz, person-days) → 5 Awaiting approval (Ajay) → 6 On the ledger · not scheduled → 7 Picked up (only the product-business meeting commits, with team and dates) → 8 In delivery (Jira) → 9 Delivered · check due (did the figure hold?) → 10 Done. Needs details sends an item back to the requester; it returns to the same step. Approval is not a commitment to build.');
  lines.push('LOGGING NOW: logging a new work item is moving to a Claude skill and is in progress; the Log button shows a placeholder, so until then people ask Ajay to log it. Filling in details handed to you still works from the item.');
  lines.push('LOGGING (the form, for reference): only raised by, title, client (or Platform), product area ("Not sure" allowed) and the problem are needed to log. Other fields are needed before signing and can be handed to a colleague with "Don\'t know? Hand this to a colleague"; they fill them in from the item with "Fill in the details". Search the demand map first (step 0) so the same need is not logged twice.');
  lines.push('FEEDBACK: the Feedback button in the header (or the Guide, Feedback) sends Ajay a Happy, Sad or Want note about the page. Only Ajay sees it; Ajay can reply, and replies show in the Guide under Feedback.');
  lines.push('DATA: Jira bugs and stories refresh at least every 4 hours for everyone; incidents and events refresh on visits too.');
  if(!obHow()) lines.push('PRIVATE: Rules and Sync & logs are open only to Ajay and the Settings viewers; say so if asked and do not describe their rules. Method & sources (definitions, the health model, the sources) and the Must-have ledger are open to everyone.');
  return lines.join('\n');
}
async function obAsk(){
  const q=String(OB.ask.q||'').trim(); if(!q||OB.ask.busy) return;
  let s=null; try{ s=await window.claude.use('sample'); }catch(e){}
  if(!s){ OB.ask.err='Ask is not available in this view of the page.'; obPaintGuide(); return; }
  OB.ask.busy=true; OB.ask.err=''; OB.ask.a=''; obPaintGuide();
  const prompt='You are the guide inside the ExpoPlatform Internal Product Business Ledger, a dashboard page. Answer the user\'s question in at most 5 short sentences, in plain British English, using ONLY the help below. Name the tab and the button to use. If the help does not cover it, say you do not know and suggest asking Ajay. Do not invent features.\n\nHELP:\n'+obCorpus()+'\n\nThe user is on the '+obTabName(obCurTab())+' tab.\n\nQUESTION: '+q;
  try{ const r=await s(prompt,{modelTier:'quick', onText:({text})=>{ OB.ask.a=text; const a=document.getElementById('ob-ans'); if(a){ a.hidden=false; a.textContent=text; } }}); OB.ask.a=(r&&r.text)||OB.ask.a; }
  catch(e){ const c=e&&e.code; OB.ask.err=c==='not_granted'?'Ask needs your permission to use Claude; allow it when asked.':c==='rate_limited'?'Too many questions just now. Try again in a minute.':'No answer ('+(c||'error')+').'; if(e&&e.text) OB.ask.a=e.text; }
  OB.ask.busy=false; obPaintGuide();
}
// ---- wiring
function obBoot(){
  if(OB.booted) return; OB.booted=true;
  const pill=document.createElement('button'); pill.type='button'; pill.id='ob-pill'; pill.className='ob-pill'; pill.setAttribute('aria-expanded','false'); pill.setAttribute('aria-controls','ob-guide');
  pill.innerHTML='<span aria-hidden="true">?</span> Guide'; document.body.appendChild(pill);
  obLoad().then(()=>{
    obGreet();
    const p=OB.prefs, h=String(location.hash||'').replace('#','');
    if(!h&&p.welcomed){ const land=p.lastTab||OB_LAND[p.role]; if(land&&land!=='overview'&&(!OB_PRIV.has(land)||obHow())){ const cl=CLB(); if(cl&&cl.showTab) cl.showTab(land); } }
    if(!p.welcomed&&!p.skipped) obWelcome();
    if(EP_MY.on) obRerender();
  });
  new MutationObserver(()=>{ clearTimeout(OB.hintT); OB.hintT=setTimeout(obHintScan,60); }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
}
document.addEventListener('click',e=>{ const t=e.target; let b;
  if(t.closest('#ob-pill')){ obGuide(!OB.open); return; }
  if(t.closest('[data-obclose]')){ obGuide(false); return; }
  if((b=t.closest('[data-obpane]'))){ OB.pane=b.dataset.obpane; if(OB.pane==='fb') fbStartDraft(); obPaintGuide(); return; }
  if((b=t.closest('[data-obrole]'))){ OB.prefs.role=b.dataset.obrole; obSave(); document.querySelectorAll('[data-obrole]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.obrole===OB.prefs.role))); return; }
  if(t.closest('[data-obgo]')){ obCloseWelcome(); obStartTour('overview'); return; }
  if(t.closest('[data-oblater]')){ obCloseWelcome(); uiToast('The Guide is in the corner whenever you want it.'); return; }
  if(t.closest('[data-obskip]')){ OB.prefs.skipped=true; obCloseWelcome(); uiToast('Onboarding skipped. The Guide stays in the corner.'); return; }
  if((b=t.closest('[data-obtour]'))){ obStartTour(b.dataset.obtour); return; }
  if(t.closest('[data-obnudgex]')){ obNudgeHide(); return; }
  if(t.closest('[data-obtnext]')){ const o=OB.tour; if(!o) return; if(o.i<o.steps.length-1){ o.i++; obPaintTour(); } else obEndTour(true); return; }
  if(t.closest('[data-obtprev]')){ const o=OB.tour; if(o&&o.i){ o.i--; obPaintTour(); } return; }
  if(t.closest('[data-obtend]')){ obEndTour(false); return; }
  if((b=t.closest('[data-obscope]'))){ const on=b.dataset.obscope==='my'; if(on&&!EP_MY.set.size){ OB.pane='me'; obGuide(true); uiToast('Choose your clients first.'); return; } EP_MY.on=on; OB.prefs.myOn=on; obSave(); obRerender(); return; }
  if(t.closest('[data-obwait]')){ const cl=CLB(); if(cl&&cl.showTab) cl.showTab('pipeline'); if(typeof feSetView==='function') feSetView('fl'); FE.waitMine=true; if(typeof feRender==='function') feRender(); return; }
  if(t.closest('[data-obask]')){ obAsk(); return; }
  if(t.closest('[data-obrestart]')){ Object.assign(OB.prefs,{skipped:false,welcomed:false,tours:{},hints:{},nudged:{}}); obSave(); obGuide(false); obWelcome(); return; }
  if((b=t.closest('.tab'))&&OB.ready){ const tab=b.dataset.tab; OB.prefs.lastTab=tab; obSave(); setTimeout(()=>{ obNudge(tab); if(OB.open) obPaintGuide(); if(tab==='overview') obGreet(); },250); }
});
document.addEventListener('input',e=>{ const t=e.target;
  if(t.id==='ob-gq'){ OB.gq=t.value; const pos=t.selectionStart; obPaintGuide(); const n=document.getElementById('ob-gq'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } }
  if(t.id==='ob-aq') OB.ask.q=t.value;
  if(t.id==='ob-myq'){ OB.myq=t.value; const pos=t.selectionStart; obPaintGuide(); const n=document.getElementById('ob-myq'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } }
});
document.addEventListener('change',e=>{ const t=e.target; if(t.dataset&&t.dataset.obmy){ const s=new Set(EP_MY.set); t.checked?s.add(t.dataset.obmy):s.delete(t.dataset.obmy); EP_MY.set=s; OB.prefs.my=[...s]; if(!s.size){ EP_MY.on=false; OB.prefs.myOn=false; } obSave(); obRerender(); const sc=document.querySelector('#ob-guide .ob-myl'), top=sc?sc.scrollTop:0; obPaintGuide(); const n=document.querySelector('#ob-guide .ob-myl'); if(n) n.scrollTop=top; } });
document.addEventListener('keydown',e=>{
  if(OB.tour){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); obEndTour(false); } else if(e.key==='ArrowRight'){ e.preventDefault(); const b=document.querySelector('[data-obtnext]'); if(b) b.click(); } else if(e.key==='ArrowLeft'){ e.preventDefault(); const b=document.querySelector('[data-obtprev]'); if(b) b.click(); } return; }
  if(e.key==='Escape'&&OB.open&&!document.querySelector('.modal[open],#fe-m')){ obGuide(false); }
},true);
addEventListener('resize',()=>{ if(OB.tour) obPaintTour(); });
window.addEventListener('ep-gate',()=>{ if((window.GATE||{}).ok) obBoot(); else obBoot(); });

// ================= Feedback: Happy / Sad / Want (28 Sep 2026) =================
// Each person's feedback lives in their own subtree: feedback/<id> (a marker the inbox lists), feedback/<id>/items/<fid> (written by them)
// and feedback/<id>/replies/<fid> (written by Ajay: status, theme, messages). The database rules make feedback/ readable and writable only
// by the artifact's owner, and each feedback/<id> by that person as well, so nobody else can read anyone's feedback. Ids only, never names.
const FB={db:null, uid:null, mine:{}, rep:{}, draft:{mood:'',text:'',weight:'',where:null,attach:true}, busy:false, err:'', sent:false, booted:false,
  inbox:{users:{}, items:{}, rep:{}, watch:{}, names:{}, loaded:false, busy:false, err:'', view:'list', open:null, dr:{}, dirty:false, f:{mood:'',status:'open',q:'',theme:''}}};
const FB_MOODS=[['happy','Happy','Something works well'],['sad','Sad','Confusing, wrong or slow'],['want','Want','Something you would like']];
const FB_PH={happy:'What works well for you? What should we keep?',sad:'What went wrong, or what was confusing? What did you expect to happen?',want:'What should it do? What would it help you with?'};
const FB_W=[['nice','Nice to have'],['important','Important'],['blocking','Blocking me']], FB_WN=Object.fromEntries(FB_W);
const FB_ST=[['new','New'],['planned','Planned'],['building','Building'],['shipped','Shipped'],['wont','Won’t do']], FB_STN=Object.fromEntries(FB_ST);
const FB_OPEN=new Set(['new','planned','building']);
const FB_ST_REPLY={planned:'Thanks for this. It is now planned.',building:'Thanks for this. We are building it now.',shipped:'This has shipped. Have a look and tell me what you think.',wont:'Thanks for this. We are not doing it for now, because '};
const fbP=(uid,sub,id)=>'feedback/'+uid+(sub?'/'+sub+(id?'/'+id:''):'');
const fbWhen=t=>{ if(!t) return ''; const d=new Date(t); if(isNaN(d)) return ''; const days=Math.floor((Date.now()-d)/864e5);
  return days<1&&new Date().toDateString()===d.toDateString()?'today':days<2?'yesterday':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };
const fbWhereTxt=w=>!w?'':(OB_TABN[w.tab]||w.tab||'')+(w.pop?' › '+w.pop:'');
function fbFace(k,s){
  const mouth=k==='happy'?'<path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0"/>':'<path d="M8.5 16.4c1.9-2.2 5.1-2.2 7 0"/>';
  const inner=k==='want'?'<path class="fb-fill" d="M12 6.2l1.6 3.9 4.2.3-3.2 2.7 1 4.1L12 15l-3.6 2.2 1-4.1-3.2-2.7 4.2-.3z"/>':'<circle cx="8.8" cy="9.8" r="1.2" class="fb-fill"/><circle cx="15.2" cy="9.8" r="1.2" class="fb-fill"/>'+mouth;
  return `<svg class="fb-face m-${k}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/>${inner}</svg>`; }
// where the viewer is when they start: the tab, and the open pop-up or client if any
function fbWhere(){ const tab=obCurTab(); let pop='';
  const mo=document.getElementById('modal'); if(mo&&mo.hasAttribute('open')){ const h=mo.querySelector('.top h3'); pop=h?h.textContent.trim():''; }
  if(!pop){ const c=document.getElementById('c360'); if(c&&!c.hidden){ const h=c.querySelector('h2,h3'); pop=h?h.textContent.trim():''; } }
  if(!pop&&document.getElementById('fe-m')) pop='Log a work item';
  return {tab, pop:pop.replace(/\s+/g,' ').slice(0,90)}; }
function fbStartDraft(){ if(FB.sent) FB.sent=false; if(!FB.draft.text) FB.draft.where=fbWhere(); }
// ---- the viewer's own feedback and Ajay's replies
async function fbBoot(){
  const g=window.GATE||{}; if(FB.booted||!g.ok||!g.uid) return; FB.booted=true; FB.uid=g.uid;
  try{ FB.db=await window.claude.use('db'); }catch(e){ FB.db=null; }
  const b=document.getElementById('fb-open'); if(b){ b.hidden=false; if(obAjay()){ document.getElementById('fb-open-l').textContent='Feedback inbox'; b.setAttribute('aria-label','Feedback inbox, only you see it'); } }
  if(!FB.db) return;
  FB.db.collection(fbP(FB.uid,'items')).onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data()||{}; }); FB.mine=m; fbRefresh(); },()=>{});
  FB.db.collection(fbP(FB.uid,'replies')).onSnapshot(s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data()||{}; }); FB.rep=m; fbRefresh(); fbReplyNudge(); },()=>{});
  if(obAjay()) fbInboxLoad();
}
const fbLastReply=id=>{ const ms=(FB.rep[id]||{}).msgs||[]; return ms.length?String(ms[ms.length-1].at||''):''; };
function fbUnread(){ const seen=(OB.prefs&&OB.prefs.fbSeen)||{}; return Object.keys(FB.rep).filter(id=>FB.mine[id]&&fbLastReply(id)&&fbLastReply(id)>(seen[id]||'')).length; }
function fbMarkSeen(){ if(!OB.prefs) return; const seen=OB.prefs.fbSeen=OB.prefs.fbSeen||{}; let ch=false;
  Object.keys(FB.rep).forEach(id=>{ const l=fbLastReply(id); if(l&&l>(seen[id]||'')){ seen[id]=l; ch=true; } });
  if(ch){ obSave(); setTimeout(()=>{ fbBadge(); const n=document.getElementById('fb-nudge'); if(n) n.remove(); },0); } }
function fbBadge(){ const b=document.getElementById('fb-badge'); if(!b) return; const n=obAjay()?fbInboxNew():fbUnread();
  b.hidden=!n; b.textContent=n; b.setAttribute('aria-label',obAjay()?n+' new':n+' new repl'+(n===1?'y':'ies')); }
function fbTyping(){ const a=document.activeElement; return !!(a&&(a.id==='fb-text'||a.id==='fb-rt'||a.id==='fb-th')); }
function fbRefresh(){ fbBadge(); if(OB.open&&!fbTyping()) obPaintGuide(); }
function fbReplyNudge(){
  if(!OB.ready||!OB.prefs){ setTimeout(fbReplyNudge,1500); return; }
  if((OB.open&&OB.pane==='fb')||document.getElementById('fb-nudge')||OB.tour) return;
  const nd=OB.prefs.fbNudged=OB.prefs.fbNudged||{}, seen=OB.prefs.fbSeen||{};
  const fresh=Object.keys(FB.rep).filter(id=>{ const l=fbLastReply(id); return FB.mine[id]&&l&&l>(seen[id]||'')&&l>(nd[id]||''); });
  if(!fresh.length) return; fresh.forEach(id=>{ nd[id]=fbLastReply(id); }); obSave(); obNudgeHide();
  const n=document.createElement('div'); n.id='fb-nudge'; n.className='ob-nudge fb-nudge'; n.setAttribute('role','status');
  n.innerHTML=`${fbFace('happy',18)}<span><b>Ajay replied</b> to your feedback.</span><button type="button" class="ibtn primary" data-fbread>Read</button><button type="button" class="linkbtn" data-fbnx>Later</button>`;
  document.body.appendChild(n); }
async function fbSend(){
  const d=FB.draft, t=String(d.text||'').trim();
  if(!d.mood){ FB.err='Pick Happy, Sad or Want first.'; obPaintGuide(); return; }
  if(t.length<3){ FB.err='Write a line about it first.'; obPaintGuide(); const x=document.getElementById('fb-text'); if(x) x.focus(); return; }
  if(!FB.db||!FB.uid){ FB.err='Feedback cannot be saved in this view of the page.'; obPaintGuide(); return; }
  FB.busy=true; FB.err=''; obPaintGuide();
  const id='f'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), at=new Date().toISOString();
  const doc={mood:d.mood, text:t.slice(0,2000), weight:d.weight||'', where:d.attach&&d.where?d.where:null, at, by:FB.uid};
  try{ await FB.db.doc(fbP(FB.uid,'items',id)).set(doc);
    await FB.db.doc(fbP(FB.uid)).set({by:FB.uid, last:at, n:Object.keys(FB.mine).length+(FB.mine[id]?0:1)});
    FB.mine[id]=doc; FB.draft={mood:'',text:'',weight:'',where:null,attach:true}; FB.sent=true; }
  catch(e){ const c=e&&e.code; FB.err=c==='invalid_argument'||c==='permission_denied'||c==='not_granted'?'Your access to this page cannot save feedback. Ask Ajay to give you “Can interact”.':'Not sent ('+(c||'error')+'). Try again.'; }
  FB.busy=false; obPaintGuide(); fbBadge(); }
function fbInboxCta(){ const n=fbInboxNew(), all=fbInboxAll().length;
  return `<button type="button" class="fb-inboxcta" data-fbinbox><span class="fb-ic">${fbFace('want',22)}</span><span class="fb-it"><b>Feedback inbox</b><span class="small">${n?n+' new · ':''}${all} in all · only you see it</span></span><span class="arw" aria-hidden="true">›</span></button>`; }
function fbPane(){
  const d=FB.draft, mine=Object.entries(FB.mine).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at)));
  let h=obAjay()?fbInboxCta():'';
  if(FB.sent) h+=`<div class="fb-thanks">${fbFace('happy',26)}<div><b>Thank you.</b> Ajay reads every one, and replies show up here.<div><button type="button" class="linkbtn" data-fbmore>Send more feedback</button></div></div></div>`;
  else {
    h+=`<div class="fb-q"><b>How is the ledger working for you?</b><span class="small">Only Ajay sees what you send.</span></div>
      <div class="fb-moods" role="group" aria-label="Your feedback is">${FB_MOODS.map(([k,l,s])=>`<button type="button" class="fb-mood m-${k}" data-fbmood="${k}" aria-pressed="${d.mood===k}">${fbFace(k,28)}<b>${l}</b><span>${s}</span></button>`).join('')}</div>`;
    if(d.mood) h+=`<textarea id="fb-text" class="ob-in" rows="4" maxlength="2000" placeholder="${obE(FB_PH[d.mood])}" aria-label="Your feedback">${obE(d.text)}</textarea>
      <div class="fb-w"><span class="small">How much does it matter?</span><span class="seg" role="group" aria-label="How much it matters">${FB_W.map(([k,l])=>`<button type="button" data-fbw="${k}" aria-pressed="${d.weight===k}">${l}</button>`).join('')}</span></div>
      ${d.where&&d.where.tab?`<label class="fb-where"><input type="checkbox" id="fb-attach"${d.attach?' checked':''}> <span>About <b>${obE(fbWhereTxt(d.where))}</b></span></label>`:''}
      ${FB.err?`<div class="small ob-err" role="alert">${obE(FB.err)}</div>`:''}
      <div class="fb-acts"><button type="button" class="linkbtn" data-fbcancel>Cancel</button><button type="button" class="ibtn primary" data-fbsend${FB.busy?' disabled':''}>${FB.busy?'Sending…':'Send to Ajay'}</button></div>`;
    else if(FB.err) h+=`<div class="small ob-err" role="alert">${obE(FB.err)}</div>`;
  }
  if(mine.length){ const seen=(OB.prefs&&OB.prefs.fbSeen)||{};
    h+=`<div class="ob-w-l">Your feedback <span class="small">${mine.length} sent · status and replies from Ajay</span></div><div class="fb-list">${mine.map(([id,f])=>{ const r=FB.rep[id]||{}, st=r.status||'new', ms=r.msgs||[], un=fbLastReply(id)>(seen[id]||'');
      return `<div class="fb-item${un?' unread':''}"><div class="fb-ih">${fbFace(f.mood,18)}<span class="fb-st s-${st}">${st==='new'?'Sent':obE(FB_STN[st]||st)}</span>${un?'<span class="fb-new">New reply</span>':''}<span class="small">${obE(fbWhen(f.at))}</span></div>
        <div class="fb-tx">${obE(f.text)}</div>${ms.map(m=>`<div class="fb-reply"><div class="fb-rb"><b>Ajay</b><span class="small">${obE(fbWhen(m.at))}</span></div><div>${obE(m.text)}</div></div>`).join('')}</div>`; }).join('')}</div>`; }
  return h; }
// ---- Ajay's inbox and roadmap
function fbInboxLoad(){ const I=FB.inbox; if(I.sub||!FB.db) return;
  I.sub=FB.db.collection('feedback').onSnapshot(s=>{ s.docs.forEach(d=>{ const uid=d.id; I.users[uid]=d.data()||{}; if(I.watch[uid]) return; I.watch[uid]=true;
      FB.db.collection(fbP(uid,'items')).onSnapshot(x=>{ const m={}; x.docs.forEach(q=>{ m[q.id]=q.data()||{}; }); I.items[uid]=m; fbInboxChanged(); },()=>{});
      FB.db.collection(fbP(uid,'replies')).onSnapshot(x=>{ const m={}; x.docs.forEach(q=>{ m[q.id]=q.data()||{}; }); I.rep[uid]=m; fbInboxChanged(); },()=>{}); });
    I.loaded=true; fbInboxChanged(); },()=>{ I.loaded=true; I.err='The inbox could not be read.'; fbInboxChanged(); }); }
function fbInboxAll(){ const I=FB.inbox, out=[];
  Object.entries(I.items).forEach(([uid,m])=>Object.entries(m||{}).forEach(([id,f])=>{ const r=(I.rep[uid]||{})[id]||{}; out.push(Object.assign({},f,{_id:id,_u:uid,_r:r,_st:r.status||'new',_th:r.theme||''})); }));
  return out.sort((a,b)=>String(b.at).localeCompare(String(a.at))); }
const fbInboxNew=()=>obAjay()?fbInboxAll().filter(x=>x._st==='new').length:0;
const fbName=uid=>uid===FB.uid?'You':(FB.inbox.names[uid]||'Someone');
const fbThemes=()=>[...new Set(fbInboxAll().map(x=>x._th).filter(Boolean))].sort();
async function fbNames(){ const I=FB.inbox, u=(window.GATE||{}).user, ids=Object.keys(I.items).filter(id=>!(id in I.names)&&id!==FB.uid);
  if(!u||!u.profiles||!ids.length) return; ids.forEach(i=>{ I.names[i]=''; });
  try{ const ps=await u.profiles(ids); ids.forEach(i=>{ I.names[i]=(ps[i]&&ps[i].name)||''; }); fbInboxChanged(true); }catch(e){} }
function fbInboxChanged(noNames){ fbBadge(); if(!noNames) fbNames();
  if(document.getElementById('fb-in')){ if(fbTyping()) FB.inbox.dirty=true; else fbPaintInbox(); }
  if(OB.open&&(OB.pane==='me'||OB.pane==='fb')&&!fbTyping()) obPaintGuide(); }
function fbOpenInbox(){ if(!obAjay()) return; obGuide(false); fbInboxLoad();
  let el=document.getElementById('fb-in'); if(!el){ el=document.createElement('div'); el.id='fb-in'; el.className='modal fb-in'; el.setAttribute('open',''); document.body.appendChild(el); }
  fbPaintInbox(); const x=el.querySelector('.x'); if(x) x.focus({preventScroll:true}); }
function fbCloseInbox(){ const el=document.getElementById('fb-in'); if(el) el.remove(); const b=document.getElementById('fb-open'); if(b) b.focus({preventScroll:true}); }
function fbPaintInbox(){
  const el=document.getElementById('fb-in'); if(!el) return; const I=FB.inbox, all=fbInboxAll(), f=I.f; I.dirty=false;
  const sc=el.querySelector('.fb-body'), top=sc?sc.scrollTop:0, nNew=fbInboxNew();
  const list=all.filter(x=>(!f.mood||x.mood===f.mood)&&(f.status==='all'||(f.status==='open'?FB_OPEN.has(x._st):x._st===f.status))&&(!f.theme||x._th===f.theme)
    &&(!f.q||[x.text,x._th,fbName(x._u),fbWhereTxt(x.where)].join(' ').toLowerCase().includes(f.q.toLowerCase())));
  const body=I.view==='road'?fbRoad(all):(list.length?list.map(fbInRow).join(''):`<div class="empty">${all.length?'Nothing matches these filters.':I.err?obE(I.err):I.loaded?'No feedback yet. When someone sends some, it shows up here.':'Loading…'}</div>`);
  el.innerHTML=`<div class="scrim" data-fbinx></div><div class="box fb-box" role="dialog" aria-modal="true" aria-labelledby="fb-in-h">
    <div class="top"><div class="fb-toph"><h3 id="fb-in-h">Feedback inbox</h3><div class="meta"><span>${all.length} in all</span>${FB_MOODS.map(([k,l])=>`<span class="fb-mc">${fbFace(k,14)}${l} <b>${all.filter(x=>x.mood===k).length}</b></span>`).join('')}<span>Only you see this</span></div></div>
      <span class="seg fb-view" role="group" aria-label="View">${[['list','Inbox'],['road','Roadmap']].map(([k,l])=>`<button type="button" data-fbview="${k}" aria-pressed="${I.view===k}">${l}${k==='list'&&nNew?` <span class="fb-badge in">${nNew}</span>`:''}</button>`).join('')}</span>
      <button type="button" class="x" data-fbinx aria-label="Close">&#215;</button></div>
    ${I.view==='list'?`<div class="toolbar fb-tools"><span class="seg" role="group" aria-label="Mood">${[['','All']].concat(FB_MOODS.map(m=>[m[0],m[1]])).map(([k,l])=>`<button type="button" data-fbfm="${k}" aria-pressed="${f.mood===k}">${l}</button>`).join('')}</span>
      <label>Status <select id="fb-fs">${[['open','Open'],...FB_ST,['all','All']].map(([k,l])=>`<option value="${k}"${f.status===k?' selected':''}>${l}</option>`).join('')}</select></label>
      ${f.theme?`<button type="button" class="fb-thchip" data-fbth="">Theme: ${obE(f.theme)} <span aria-hidden="true">&#215;</span></button>`:''}
      <input type="search" id="fb-fq" placeholder="Search feedback, people, themes" value="${obE(f.q)}" autocomplete="off" aria-label="Search feedback"><span class="count">${list.length} shown</span></div>`:''}
    <div class="body fb-body">${body}</div></div>`;
  const nb=el.querySelector('.fb-body'); if(nb) nb.scrollTop=top; }
function fbInRow(x){ const k=x._u+'/'+x._id, open=FB.inbox.open===k, ms=(x._r.msgs||[]);
  return `<div class="fb-row${open?' open':''}${x._st==='new'?' isnew':''}">
    <button type="button" class="fb-rh" data-fbrow="${obE(k)}" aria-expanded="${open}">${fbFace(x.mood,22)}
      <span class="fb-rm"><span class="fb-rt">${obE(x.text)}</span><span class="small">${obE(fbName(x._u))} · ${obE(fbWhen(x.at))}${x.where?' · '+obE(fbWhereTxt(x.where)):''}${x.weight?' · '+obE(FB_WN[x.weight]||''):''}${ms.length?' · '+ms.length+(ms.length===1?' reply':' replies'):''}</span></span>
      ${x._th?`<span class="fb-thtag">${obE(x._th)}</span>`:''}<span class="fb-st s-${x._st}">${obE(FB_STN[x._st]||x._st)}</span></button>
    ${open?fbInDetail(x,k):''}</div>`; }
function fbInDetail(x,k){ const I=FB.inbox, ms=x._r.msgs||[], dr=I.dr[k]||{}, nm=fbName(x._u);
  return `<div class="fb-det"><div class="fb-full">${obE(x.text)}</div>
    <div class="fb-drow"><span class="fb-dl">Status</span><span class="seg" role="group" aria-label="Status">${FB_ST.map(([s,l])=>`<button type="button" data-fbst="${s}" data-fbk="${obE(k)}" aria-pressed="${x._st===s}">${l}</button>`).join('')}</span></div>
    <div class="fb-drow"><span class="fb-dl">Theme</span><input class="ob-in fb-thin" id="fb-th" data-fbk="${obE(k)}" list="fb-thl" placeholder="Group it with related feedback, e.g. Timeline filters" value="${obE(dr.theme!=null?dr.theme:x._th)}" autocomplete="off" aria-label="Theme"><datalist id="fb-thl">${fbThemes().map(t=>`<option value="${obE(t)}">`).join('')}</datalist><button type="button" class="ibtn" data-fbthsave="${obE(k)}">Save theme</button></div>
    ${ms.length?`<div class="fb-thread">${ms.map(m=>`<div class="fb-reply"><div class="fb-rb"><b>You replied</b><span class="small">${obE(fbWhen(m.at))}</span></div><div>${obE(m.text)}</div></div>`).join('')}</div>`:''}
    <div class="fb-drow col"><span class="fb-dl">Reply to ${obE(nm==='Someone'?'them':nm)} <span class="small">Only they see it, in their Feedback list.</span></span>
      <textarea class="ob-in" id="fb-rt" data-fbk="${obE(k)}" rows="3" maxlength="2000" placeholder="e.g. Thanks, this is planned for the next version." aria-label="Reply">${obE(dr.reply||'')}</textarea>
      <div class="fb-acts">${I.err?`<span class="small ob-err" role="alert">${obE(I.err)}</span>`:'<span></span>'}<button type="button" class="ibtn primary" data-fbreply="${obE(k)}"${I.busy?' disabled':''}>${I.busy?'Saving…':'Send reply'}</button></div></div></div>`; }
function fbRoad(all){
  const group=xs=>{ const g={}; xs.forEach(x=>{ const key=x._th||('·'+x._u+'/'+x._id); (g[key]=g[key]||[]).push(x); }); return Object.entries(g).sort((a,b)=>b[1].length-a[1].length||String(b[1][0].at).localeCompare(String(a[1][0].at))); };
  const card=([key,xs])=>{ const th=key[0]==='·'?'':key, ppl=new Set(xs.map(x=>x._u)).size, moods=FB_MOODS.map(([k])=>[k,xs.filter(x=>x.mood===k).length]).filter(m=>m[1]), blk=xs.filter(x=>x.weight==='blocking').length;
    return `<button type="button" class="fb-card" ${th?`data-fbth="${obE(th)}"`:`data-fbgo="${obE(key.slice(1))}"`}><b>${obE(th||xs[0].text)}</b>
      <span class="small">${th?xs.length+(xs.length===1?' item · ':' items · '):'No theme yet · '}${ppl} ${ppl===1?'person':'people'}${blk?' · '+blk+' blocking':''}</span><span class="fb-cm">${moods.map(([k,n])=>`<span>${fbFace(k,14)}${n}</span>`).join('')}</span></button>`; };
  const wont=all.filter(x=>x._st==='wont').length;
  return `<p class="small fb-roadnote">Feedback by status, grouped by theme. Give related feedback the same theme in the inbox and it groups here. Click a card to see what is behind it.</p>
    <div class="fb-road">${FB_ST.filter(([s])=>s!=='wont').map(([s,l])=>{ const g=group(all.filter(x=>x._st===s));
      return `<div class="fb-col"><div class="fb-colh"><span class="fb-st s-${s}">${l}</span><span class="small">${g.length}</span></div>${g.map(card).join('')||'<div class="small fb-none">Nothing here yet</div>'}</div>`; }).join('')}</div>
    ${wont?`<div class="small fb-wont">${wont} marked Won’t do. <button type="button" class="linkbtn" data-fbwont>See them</button></div>`:''}`; }
async function fbSaveRep(k,patch){
  const [uid,id]=k.split('/'), I=FB.inbox, cur=(I.rep[uid]||{})[id]||{};
  const doc=Object.assign({status:'new',theme:'',msgs:[]},cur,patch,{at:new Date().toISOString(),by:FB.uid});
  I.busy=true; I.err=''; fbPaintInbox();
  try{ await FB.db.doc(fbP(uid,'replies',id)).set(JSON.parse(JSON.stringify(doc))); (I.rep[uid]=I.rep[uid]||{})[id]=doc; I.busy=false; fbPaintInbox(); fbBadge(); return true; }
  catch(e){ I.busy=false; I.err='Not saved ('+((e&&e.code)||'error')+'). Try again.'; fbPaintInbox(); return false; } }
// ---- wiring
document.addEventListener('click',e=>{ const t=e.target; let b;
  if(t.closest('#fb-open')){ if(obAjay()) fbOpenInbox(); else { FB.sent=false; fbStartDraft(); OB.pane='fb'; obGuide(true); } return; }
  if((b=t.closest('[data-fbmood]'))){ const d=FB.draft; d.mood=b.dataset.fbmood; if(!d.where) d.where=fbWhere(); FB.err=''; obPaintGuide(); const x=document.getElementById('fb-text'); if(x) x.focus(); return; }
  if((b=t.closest('[data-fbw]'))){ const w=b.dataset.fbw; FB.draft.weight=FB.draft.weight===w?'':w; obPaintGuide(); return; }
  if(t.closest('[data-fbsend]')){ fbSend(); return; }
  if(t.closest('[data-fbcancel]')){ FB.draft={mood:'',text:'',weight:'',where:null,attach:true}; FB.err=''; obPaintGuide(); return; }
  if(t.closest('[data-fbmore]')){ FB.sent=false; FB.draft.where=fbWhere(); obPaintGuide(); return; }
  if(t.closest('[data-fbinbox]')){ fbOpenInbox(); return; }
  if(t.closest('[data-fbread]')){ const n=document.getElementById('fb-nudge'); if(n) n.remove(); OB.pane='fb'; obGuide(true); return; }
  if(t.closest('[data-fbnx]')){ const n=document.getElementById('fb-nudge'); if(n) n.remove(); return; }
  if(!t.closest('#fb-in')) return;
  const I=FB.inbox;
  if(t.closest('[data-fbinx]')){ fbCloseInbox(); return; }
  if((b=t.closest('[data-fbview]'))){ I.view=b.dataset.fbview; fbPaintInbox(); return; }
  if((b=t.closest('[data-fbfm]'))){ I.f.mood=b.dataset.fbfm; fbPaintInbox(); return; }
  if((b=t.closest('[data-fbth]'))){ I.f.theme=b.dataset.fbth; if(I.f.theme){ I.f.status='all'; I.view='list'; } fbPaintInbox(); return; }
  if((b=t.closest('[data-fbgo]'))){ Object.assign(I.f,{mood:'',status:'all',q:'',theme:''}); I.view='list'; I.open=b.dataset.fbgo; fbPaintInbox(); return; }
  if(t.closest('[data-fbwont]')){ Object.assign(I.f,{mood:'',status:'wont',q:'',theme:''}); I.view='list'; fbPaintInbox(); return; }
  if((b=t.closest('[data-fbrow]'))){ const k=b.dataset.fbrow; I.open=I.open===k?null:k; I.err=''; fbPaintInbox(); return; }
  if((b=t.closest('[data-fbst]'))){ const k=b.dataset.fbk, s=b.dataset.fbst, dr=I.dr[k]=I.dr[k]||{};
    fbSaveRep(k,{status:s}).then(ok=>{ if(ok&&FB_ST_REPLY[s]&&!String(dr.reply||'').trim()){ dr.reply=FB_ST_REPLY[s]; fbPaintInbox(); const r=document.getElementById('fb-rt'); if(r){ r.focus(); r.setSelectionRange(r.value.length,r.value.length); } uiToast('Status saved. A reply is drafted: edit it and press Send reply, or leave it.'); } else if(ok) uiToast('Status saved.'); }); return; }
  if((b=t.closest('[data-fbthsave]'))){ const k=b.dataset.fbthsave, dr=I.dr[k]||{}; const th=String(dr.theme!=null?dr.theme:'').trim();
    fbSaveRep(k,{theme:th.slice(0,60)}).then(ok=>{ if(ok){ delete dr.theme; uiToast(th?'Theme saved: '+th+'.':'Theme cleared.'); } }); return; }
  if((b=t.closest('[data-fbreply]'))){ const k=b.dataset.fbreply, dr=I.dr[k]=I.dr[k]||{}, txt=String(dr.reply||'').trim(); if(!txt){ I.err='Write the reply first.'; fbPaintInbox(); return; }
    const [uid,id]=k.split('/'), cur=((I.rep[uid]||{})[id]||{}).msgs||[];
    fbSaveRep(k,{msgs:cur.concat([{text:txt.slice(0,2000),at:new Date().toISOString()}])}).then(ok=>{ if(ok){ dr.reply=''; fbPaintInbox(); uiToast('Reply sent. They see it next time they open the page.'); } }); return; }
});
document.addEventListener('input',e=>{ const t=e.target;
  if(t.id==='fb-text'){ FB.draft.text=t.value; return; }
  if(t.id==='fb-rt'||t.id==='fb-th'){ const dr=FB.inbox.dr[t.dataset.fbk]=FB.inbox.dr[t.dataset.fbk]||{}; dr[t.id==='fb-rt'?'reply':'theme']=t.value; return; }
  if(t.id==='fb-fq'){ FB.inbox.f.q=t.value; const pos=t.selectionStart; fbPaintInbox(); const n=document.getElementById('fb-fq'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } } });
document.addEventListener('change',e=>{ const t=e.target;
  if(t.id==='fb-attach'){ FB.draft.attach=t.checked; return; }
  if(t.id==='fb-fs'){ FB.inbox.f.status=t.value; fbPaintInbox(); } });
document.addEventListener('focusout',e=>{ const t=e.target; if((t.id==='fb-rt'||t.id==='fb-th'||t.id==='fb-text')&&FB.inbox.dirty) setTimeout(()=>{ if(!fbTyping()) fbPaintInbox(); },0); });
document.addEventListener('keydown',e=>{
  if(document.getElementById('fb-in')&&e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fbCloseInbox(); return; }
  if(e.target&&e.target.id==='fb-th'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-fbthsave]'); if(b) b.click(); }
  if(e.target&&e.target.id==='fb-text'&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); fbSend(); }
},true);
window.addEventListener('ep-gate',()=>{ fbBoot(); });
if((window.GATE||{}).ok) fbBoot();

// ================= Sync & logs → History, and the activity log (28 Sep 2026) =================
// History reads every record the ledger already keeps (must-have item and column histories, feature-ledger events, rule saves,
// data pulls and pull requests, feedback) and one new one: activity/<id>/months/<yyyy-mm>, each person's sign-ins and the
// sections and pop-ups they open. The db rules make activity/ readable only by the owner and each activity/<id> by that person.
const ACT={db:null, uid:null, sid:null, q:[], t:0, last:'', marked:false, lastPop:''};
async function actBoot(){
  const g=window.GATE||{}; if(ACT.uid||!g.ok||!g.uid) return; ACT.uid=g.uid;
  try{ ACT.db=await window.claude.use('db'); }catch(e){ ACT.db=null; } if(!ACT.db) return;
  ACT.sid=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  actLog('signin',''); const t=document.querySelector('.tab[aria-selected="true"]'); if(t) actLog('tab',t.dataset.tab);
  const mo=document.getElementById('modal');
  if(mo) new MutationObserver(()=>{ if(!mo.hasAttribute('open')){ ACT.lastPop=''; return; } const h=mo.querySelector('.top h3'); const x=h?h.textContent.trim():''; if(x&&x!==ACT.lastPop){ ACT.lastPop=x; actLog('open',x); } }).observe(mo,{attributes:true,attributeFilter:['open'],subtree:true,childList:true});
}
function actLog(k,x){
  if(!ACT.db||!ACT.uid) return; x=String(x||'').replace(/\s+/g,' ').slice(0,90);
  if(k==='tab'){ if(x===ACT.last) return; ACT.last=x; }
  ACT.q.push({k,x,at:new Date().toISOString(),s:ACT.sid}); clearTimeout(ACT.t); ACT.t=setTimeout(actFlush,k==='signin'?0:2500);
}
async function actFlush(){
  const q=ACT.q.splice(0); if(!q.length||!ACT.db) return;
  const ev={}; q.forEach((e,i)=>{ ev['e'+Date.parse(e.at).toString(36)+i+Math.random().toString(36).slice(2,4)]=e; });
  const last=q[q.length-1].at, ref=ACT.db.doc('activity/'+ACT.uid+'/months/'+last.slice(0,7));
  try{ await ref.update({ev,last}); }
  catch(e){ try{ const d=await ref.get(); if(d.exists) await ref.update({ev,last}); else await ref.set({by:ACT.uid,first:q[0].at,last,ev}); }catch(e2){} }
  try{ await ACT.db.doc('activity/'+ACT.uid).set({by:ACT.uid,last}); }catch(e){}
}
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.tab'); if(b&&b.dataset.tab) setTimeout(()=>actLog('tab',b.dataset.tab),0); },true);
addEventListener('pagehide',()=>{ if(ACT.q.length) actFlush(); });
window.addEventListener('ep-gate',()=>{ actBoot(); });

const HS={sub:'refresh', src:'', who:'', span:'7', q:'', lim:150, act:{}, actSub:null, actWatch:{}, names:{}, lastPaint:0};
const HS_SRC=[['pp','Must-have ledger'],['fe','Feature ledger'],['beta','Beta intake'],['rules','Rules'],['pull','Data pulls'],['visit','Visits'],['fb','Feedback']];
const HS_TABN=t=>(typeof OB_TABN!=='undefined'&&OB_TABN[t])||t;
const hsE=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const hsChange=(a,b)=>{ a=String(a??'').trim(); b=String(b??'').trim(); return !a?'set to '+hsCut(b,110):!b?'cleared (was '+hsCut(a,60)+')':hsCut(a,60)+' → '+hsCut(b,60); };
const hsCut=(v,n)=>{ const t=String(v??'').replace(/\s+/g,' '); return t.length>(n||80)?t.slice(0,(n||80)-1)+'…':t; };
function hsShow(){ const r=document.getElementById('rf-host'), h=document.getElementById('hs-host'); if(!r||!h) return;
  if(!obHow()){ h.innerHTML=''; r.innerHTML=''; return; }
  document.querySelectorAll('#sl-sub [data-slsub]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.slsub===HS.sub)));
  const bl=document.getElementById('bt-lab'); if(bl){ bl.hidden=HS.sub!=='beta'; if(HS.sub==='beta'&&window.btLabPaint) window.btLabPaint(); }
  r.hidden=HS.sub!=='refresh'; h.hidden=HS.sub!=='history'; if(HS.sub==='history'){ hsLoad(); hsPaint(); } }
window.hsShow=hsShow;
function hsLoad(){
  if(HS.actSub||!obAjay()) return; const db=ACT.db||(FB&&FB.db); if(!db) return;
  HS.actSub=db.collection('activity').onSnapshot(s=>{ s.docs.forEach(d=>{ const uid=d.id; if(HS.actWatch[uid]) return; HS.actWatch[uid]=true;
    db.collection('activity/'+uid+'/months').onSnapshot(x=>{ const m={}; x.docs.forEach(q=>{ Object.assign(m,(q.data()||{}).ev||{}); }); HS.act[uid]=m; hsSoon(); },()=>{}); }); },()=>{});
  if(typeof fbInboxLoad==='function') fbInboxLoad();
}
function hsSoon(){ clearTimeout(HS.t); HS.t=setTimeout(()=>{ if(HS.sub==='history'&&!document.getElementById('hs-host').hidden) hsPaint(); },300); }
// every record, as {at, by, src, what, detail, open}
function hsAll(){
  const out=[], add=(at,by,src,what,detail,open)=>{ if(at) out.push({at:String(at),by:by||'',src,what,detail:detail||'',open:open||''}); };
  try{ (PP.rows||[]).forEach(r=>{ const t=ppTitle(r); Object.values(r.h||{}).forEach(e=>{ if(!e||typeof e!=='object') return;
      const K={add:'added',edit:'changed',revert:'reverted',remove:'removed',restore:'restored',import:'imported from Confluence',migrate:'migrated'};
      add(e.at,e.by,'pp',(K[e.k]||e.k)+(e.f?' '+ppFldLabel(e.f):'')+' · '+t,e.f?hsChange(ppFmtVal(e.f,e.from),ppFmtVal(e.f,e.to)):hsCut(e.note,120),'pp:'+r.id); }); });
    Object.values((PP.meta&&PP.meta.h)||{}).forEach(e=>{ if(e&&typeof e==='object') add(e.at,e.by,'pp','changed the columns'+(e.f?' ('+e.f+')':''),hsCut(e.note||e.op,120)); }); }catch(e){}
  try{ const T={}; (FE.rows||[]).forEach(r=>{ T[r._id]=(r.id||r._id)+' · '+((r.v||{}).title||'Untitled'); });
    Object.entries(FE.ev||{}).forEach(([id,m])=>Object.values(m||{}).forEach(e=>{ add(e.at,e.by,e.via==='beta'?'beta':'fe',(e.k||'updated')+' · '+(T[id]||id),e.from?e.from+' → '+e.to:(e.fields||[]).join(', '),'fe:'+id); })); }catch(e){}
  try{ (window.EP_LOGS.logic()||[]).forEach(e=>add(e.at,e.by,'rules','saved the rules (version '+e.v+')',(e.changes||[]).slice(0,4).map(c=>c.name+': '+hsCut(c.from,24)+' → '+hsCut(c.to,24)).join('; ')+((e.changes||[]).length>4?'; and '+(e.changes.length-4)+' more':''),'rules')); }catch(e){}
  try{ const st=window.EP_LOGS.sync()||{}; (st.runs||[]).forEach(r=>add(r.at,r.by,'pull',(r.manual?'pulled':'refreshed (automatic)')+' Jira EP bugs and stories',[r.bugsNew!=null?r.bugsNew+' new bugs':'',r.bugsClosed?r.bugsClosed+' closed':'',r.storiesShipped?r.storiesShipped+' stories shipped':'',r.seen!=null?r.seen+' read':''].filter(Boolean).join(' · ')));
    const rf=window.EP_LOGS.rf(), NM={imp:'IMP incidents',op:'OP events',hv:'Hyve dedicated team (HV)',planhat:'Planhat',workbook:'the Drive workbook'};
    Object.entries(rf.docs||{}).forEach(([k,d])=>(d.runs||[]).forEach(r=>add(r.at,r.by,'pull',(r.manual?'pulled ':'refreshed (automatic) ')+(NM[k]||k),[r.changed!=null?r.changed+' changed':'',r.seen!=null?r.seen+' read':'',r.since?'since '+r.since:''].filter(Boolean).join(' · '))));
    Object.entries(rf.reqs||{}).forEach(([k,d])=>{ add(d.at,d.by,'pull',(d.auto?'queued':'asked Claude for')+' a pull of '+(d.name||k),hsCut(d.why,120)); if(d.doneAt) add(d.doneAt,'claude','pull','pulled '+(d.name||k),d.note||''); });
    Object.entries(rf.visits||{}).forEach(([uid,v])=>{ if(!Object.keys(HS.act[uid]||{}).length&&v.first) add(v.first,uid,'visit','first visit',(v.n||1)+' visit'+(v.n===1?'':'s')+' in all, the last '+(v.last||'').slice(0,16).replace('T',' ')); }); }catch(e){}
  Object.entries(HS.act).forEach(([uid,m])=>Object.values(m||{}).forEach(e=>{ if(e.k==='ai'){ add(e.at,uid,'beta','asked Claude: '+hsCut(e.x,80),''); return; } add(e.at,uid,'visit',e.k==='signin'?'signed in':e.k==='tab'?'opened '+HS_TABN(e.x):'opened '+hsCut(e.x,70),''); }));
  try{ if(window.btHistory) window.btHistory(add); }catch(e){}
  try{ if(obAjay()) fbInboxAll().forEach(x=>{ add(x.at,x._u,'fb','sent '+(x.mood==='happy'?'a Happy':x.mood==='sad'?'a Sad':'a Want')+' note',hsCut(x.text,120),'fb');
      ((x._r||{}).msgs||[]).forEach(m=>add(m.at,(x._r||{}).by||FB.uid,'fb','replied to a note',hsCut(m.text,120),'fb')); }); }catch(e){}
  return out.sort((a,b)=>b.at.localeCompare(a.at));
}
async function hsNames(ids){ const u=(window.GATE||{}).user, need=ids.filter(i=>i&&i!=='claude'&&!(i in HS.names)); if(!u||!u.profiles||!need.length) return;
  need.forEach(i=>{ HS.names[i]=''; }); try{ const ps=await u.profiles(need.slice(0,64)); need.forEach(i=>{ HS.names[i]=(ps[i]&&ps[i].name)||''; }); hsSoon(); }catch(e){} }
const hsWho=id=>!id?'Someone':id==='claude'?'Claude':id===((window.GATE||{}).uid)?'You':(HS.names[id]||'Someone');
function hsDay(k){ const d=new Date(k+'T12:00:00'); if(isNaN(d)) return k; const t=new Date(); const y=new Date(Date.now()-864e5);
  const same=(a,b)=>a.toDateString()===b.toDateString(); return same(d,t)?'Today':same(d,y)?'Yesterday':d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function hsPaint(){
  const host=document.getElementById('hs-host'); if(!host) return;
  if(!obHow()){ host.innerHTML=''; return; }
  const all=hsAll(); hsNames([...new Set(all.map(x=>x.by))]);
  const now=Date.now(), cut=HS.span==='all'?'':new Date(now-(+HS.span)*864e5).toISOString(), q=HS.q.toLowerCase();
  const list=all.filter(x=>(!cut||x.at>=cut)&&(!HS.src||x.src===HS.src)&&(!HS.who||x.by===HS.who)&&(!q||(x.what+' '+x.detail+' '+hsWho(x.by)).toLowerCase().includes(q)));
  const people=[...new Set(all.map(x=>x.by).filter(Boolean))].sort((a,b)=>hsWho(a).localeCompare(hsWho(b)));
  const cnt=k=>all.filter(x=>(!cut||x.at>=cut)&&x.src===k).length, shown=list.slice(0,HS.lim);
  let day='', rows='';
  shown.forEach(x=>{ const d=x.at.length<=10?x.at:(()=>{ const t=new Date(x.at); return isNaN(t)?x.at.slice(0,10):t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); })();
    if(d!==day){ day=d; rows+=`<div class="hs-day">${hsE(hsDay(d))}</div>`; }
    const tm=x.at.length<=10?'—':new Date(x.at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    rows+=`<div class="hs-row"><span class="hs-t">${hsE(tm)}</span><span class="hs-src s-${x.src}">${hsE((HS_SRC.find(s=>s[0]===x.src)||[])[1]||x.src)}</span><span class="hs-m"><span><b>${hsE(hsWho(x.by))}</b> ${hsE(x.what)}</span>${x.detail?`<span class="hs-d">${hsE(x.detail)}</span>`:''}</span>${x.open?`<button type="button" class="ibtn" data-hsopen="${hsE(x.open)}">Open</button>`:'<span></span>'}</div>`; });
  const sc=host.querySelector('.hs-list'), top=sc?sc.scrollTop:0, a=document.activeElement, focusQ=a&&a.id==='hs-q', pos=focusQ?a.selectionStart:0;
  host.innerHTML=`<div class="hs-head"><div><h3>History</h3><p class="hs-sub">Every change anyone made on the ledger${obAjay()?', and every visit,':''} with who and when. Kept in the ledger's own database, so nothing is lost.${obAjay()?'':' Visits and feedback are visible to Ajay only.'}</p></div>
    <div class="hs-sum">${HS_SRC.map(([k,l])=>`<button type="button" class="hs-chip s-${k}" data-hssrc="${k}" aria-pressed="${HS.src===k}"><b>${cnt(k)}</b> ${hsE(l)}</button>`).join('')}</div></div>
    <div class="toolbar hs-tools"><span class="seg" role="group" aria-label="Period">${[['1','Today'],['7','7 days'],['30','30 days'],['all','All']].map(([k,l])=>`<button type="button" data-hsspan="${k}" aria-pressed="${HS.span===k}">${l}</button>`).join('')}</span>
      <label>Person <select id="hs-who"><option value="">Everyone</option>${people.map(p=>`<option value="${hsE(p)}"${HS.who===p?' selected':''}>${hsE(hsWho(p))}</option>`).join('')}</select></label>
      <input type="search" id="hs-q" placeholder="Search the history" value="${hsE(HS.q)}" autocomplete="off" aria-label="Search the history">
      ${HS.src||HS.who||HS.q?'<button type="button" class="linkbtn" data-hsclear>Clear filters</button>':''}<span class="count">${list.length} of ${all.length}</span></div>
    <div class="hs-list">${rows||'<div class="empty">Nothing recorded for these filters.</div>'}${list.length>HS.lim?`<button type="button" class="ibtn hs-more" data-hsmore>Show ${Math.min(150,list.length-HS.lim)} more</button>`:''}</div>`;
  const nl=host.querySelector('.hs-list'); if(nl) nl.scrollTop=top;
  if(focusQ){ const n=document.getElementById('hs-q'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } }
}
document.addEventListener('click',e=>{ const t=e.target; let b;
  if((b=t.closest('#sl-sub [data-slsub]'))){ HS.sub=b.dataset.slsub; hsShow(); return; }
  if(!t.closest('#hs-host')) return;
  if((b=t.closest('[data-hssrc]'))){ HS.src=HS.src===b.dataset.hssrc?'':b.dataset.hssrc; HS.lim=150; hsPaint(); return; }
  if((b=t.closest('[data-hsspan]'))){ HS.span=b.dataset.hsspan; HS.lim=150; hsPaint(); return; }
  if(t.closest('[data-hsclear]')){ HS.src=''; HS.who=''; HS.q=''; hsPaint(); return; }
  if(t.closest('[data-hsmore]')){ HS.lim+=150; hsPaint(); return; }
  if((b=t.closest('[data-hsopen]'))){ const [k,id]=b.dataset.hsopen.split(':');
    if(k==='pp'&&typeof ppOpenEditor==='function') ppOpenEditor(id);
    else if(k==='fe'&&typeof feOpenEntry==='function') feOpenEntry(id);
    else if(k==='fb'&&typeof fbOpenInbox==='function') fbOpenInbox();
    else if(k==='rules'){ const cl=CLB(); if(cl&&cl.showTab) cl.showTab('logic'); } return; }
});
document.addEventListener('input',e=>{ if(e.target.id==='hs-q'){ HS.q=e.target.value; clearTimeout(HS.qt); HS.qt=setTimeout(hsPaint,200); } });
document.addEventListener('change',e=>{ if(e.target.id==='hs-who'){ HS.who=e.target.value; hsPaint(); } });

// ================= Beta: log a work item with Claude (30 Sep 2026, owner) =================
// In testing with the Settings viewers (Ajay, Bartosz; btAcc().how); everyone else still sees the placeholder card (feSkillCard).
// Two ways in, one modal: Quick share (clients, a source, Claude fills the request in, "Is this it?", tidy, save) and Full review
// (Describe, Check matches, Review, Send). New items go straight into the ledger's own `ledger` / `ledger-events` (feWriteNew,
// via "beta"); a share that joins an existing need, points at something already built or follows work already on its way is a
// voice in `ledger-voices`. Test mode tags everything test:true, and test records count only for a viewer with test mode on.
// From a call recording only the quoted moments are kept, never the transcript. The classic form stays behind a link.
const btAcc=()=>window.EP_ACCESS||{};
const BT={el:null, mode:'share', test:false, sample:undefined, mcp:undefined, aiOk:false, ailog:[], vAll:[], voices:[], vsub:null, s:null, d:null, fa:null, lab:{confirm:false, check:null, q:''}, eq:{}};
window.BT=BT;
try{ BT.test=localStorage.getItem('ep-bt-test')==='1'; }catch(e){}
const btE=uiEsc, btN=n=>Number(n||0).toLocaleString('en-GB'), btPl=(n,w,p)=>btN(n)+' '+(n===1?w:(p||w+'s'));
const btCut=(t,n)=>{ t=String(t??'').replace(/\s+/g,' ').trim(); return t.length>n?t.slice(0,n-1).replace(/\s\S*$/,'')+'…':t; };
const BT_SRC={type:'Speak or type', chat:'Chat snippet', call:'Call recording'};
const BT_REL={same:'Same thing', part:'Part of it', related:'Related', extends:'Extends this feature', exists:'Already exists', follow:'Already on its way'};
const BT_KIND={a:'Asked', b:'Built', m:'Must-have', l:'On the ledger'};
const BT_LEDGER_URL='https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d';
const BT_STEPS=[['describe','Describe'],['check','Check matches'],['review','Review'],['send','Send']];
const BT_DECIDE={new:'It’s a new work item', builds:'It builds on what I linked', exists:'It’s already built'};
const BT_VALUE_KEYS=['lever','figureGBP','hours','rateGBP','rateSource','figureText','assumption','figureDetail','funded','existingGrowing'];
const btSeen=x=>!(x&&x.test)||BT.test; window.btSeen=btSeen;
const btPh=t=>/^\s*(not (stated|given|mentioned|specified|provided|known|clear)( in the (request|source|text|chat|call))?|n\/?a|none|unknown|tbd|tbc|-+)\s*\.?\s*$/i.test(String(t||''));
const btNorm=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const btNewId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
async function btUse(n){ try{ return await claude.use(n); }catch(e){ return null; } }
function btResetShare(){ BT.s={clients:[], clientAuto:false, src:'type', raw:'', url:'', name:'', area:'', what:'', why:'', outcome:'', auto:{}, cites:{}, sugg:{}, pick:null, none:false,
  filling:false, fillErr:'', fillNote:'', progress:0, stage:'form', tidy:null, tidyBusy:false, tidyDone:false, tidyChoice:{}, tidyNote:'', result:null, answer:'', answered:false, saving:false, err:''}; }
function btResetDrop(){ BT.d={step:1, clients:[], what:'', why:'', outcome:'', links:[], decision:null, draft:{what:'', why:'', outcome:''}, ai:null, busy:false, err:'', progress:0,
  answers:{}, sales:null, area:'', name:'', fromNeed:'', tidy:null, tidyBusy:false, tidyDone:false, tidyChoice:{}, result:null, saving:false}; }
function btResetCall(){ BT.fa={url:'', state:'idle', title:'', date:'', callUrl:'', segs:[], err:''}; }
btResetShare(); btResetDrop(); btResetCall();

// ---------- clients, signal ----------
function btCo(pd){ if(pd==='Platform') return {pd:'Platform', short:'Platform', tier:0}; const cl=CLB(), c=cl&&cl.company(pd); return c?{pd:String(c.pd), short:cl.shortName(c.name), name:c.name, tier:+c.tier||0}:null; }
const btCu=pd=>{ const c=btCo(pd); return c&&c.pd!=='Platform'?[c.short,c.tier,c.pd]:null; };
const btSig=cus=>cus.reduce((a,x)=>a+(DM_TW[x[1]]||0),0);
const btClientsTxt=list=>(list||[]).map(pd=>(btCo(pd)||{short:pd}).short).join(', ');
const btTierPill=t=>t?`<span class="tierpill t${t<=2?t:''}">T${t}</span>`:'';
// the clients a need has picked up in the ledger: voices that joined it, and Beta items linked to it as the same thing or part of it
function btVoiceCus(id){
  const out=[], add=pd=>{ const c=btCu(pd); if(c&&!out.some(x=>x[2]===c[2])) out.push(c); };
  BT.voices.filter(v=>v.kind==='join'&&v.target&&v.target.k==='a'&&v.target.id===id).forEach(v=>(v.clients||[]).forEach(add));
  (FE.rows||[]).forEach(r=>{ const b=(r.v||{}).beta; if(b&&(b.links||[]).some(l=>l.k==='a'&&l.id===id&&(l.rel==='same'||l.rel==='part'))) ((r.v||{}).customers||[]).forEach(c=>add(c.client)); });
  return out;
}
window.btVoiceCus=btVoiceCus;
function btNeedCus(c){ const m=new Map(); c.rs.forEach(r=>(r.cu||[]).forEach(x=>{ if(!m.has(x[0])) m.set(x[0],[x[0],+x[1]||0,x[2]?String(x[2]):'']); }));
  btVoiceCus(c.id).forEach(x=>{ if(![...m.values()].some(y=>y[0]===x[0]||(x[2]&&y[2]===x[2]))) m.set(x[0],x); }); return [...m.values()]; }
window.btNeedVoicesHtml=id=>{ const vs=BT.voices.filter(v=>v.target&&v.target.k==='a'&&v.target.id===id); if(!vs.length) return '';
  return `<div class="seclabel">Shared in the ledger<span class="c">${vs.length}</span></div><div class="bt-vl">${vs.slice(0,6).map(v=>`<div class="bt-v"><b>${btE(btClientsTxt(v.clients))}</b> <span class="small">${btE(BT_SRC[v.src]||'')} · ${btE(ppWhen(v.at))} · ${btE(feName(v.by))}${v.test?' · Test':''}</span><div class="small">${btE(btCut(v.what,160))}</div></div>`).join('')}</div>`; };
function btVoicesBoot(){ if(BT.vsub||!FE.db) return; BT.vsub=FE.db.collection('ledger-voices').onSnapshot(s=>{ BT.vAll=s.docs.map(d=>Object.assign({_id:d.id},d.data())); btVoicesApply(); },()=>{}); }
function btVoicesApply(){ BT.voices=BT.vAll.filter(btSeen); if(DM.data){ try{ dmDerive(); }catch(e){} } if(HS.sub==='beta') btLabPaint(); }
window.btOnRows=()=>{ btVoicesBoot(); if(FE.openId) setTimeout(()=>{ if(FE.openId) feOpenEntry(FE.openId,true); },0); if(HS.sub==='beta') btLabPaint(); };
function btSetTest(on){ BT.test=!!on; try{ localStorage.setItem('ep-bt-test',on?'1':'0'); }catch(e){} feSeen(); feRender(); btVoicesApply(); if(BT.el) btPaint(); btLabPaint(); }

// ---------- what the request might match: needs asked for, built stories, must-have items, work items on the ledger ----------
function btCands(text, clients, limit){
  const out=[]; if(!DM.idx||dmTok(text).length<2) return out;
  const r=dmSearch(text,{limit:12,builtLimit:5}), mine=new Set((clients||[]).map(String));
  r.needs.forEach(h=>{ const c=DM.byCl.get(h.id); if(c) out.push(Object.assign(btNeedCand(c),{pct:dmPct(h.cov)})); });
  r.built.forEach(h=>{ const b=(DM.data.built||[]).find(x=>x.k===h.id); if(b) out.push(Object.assign(btBuiltCand(b),{pct:dmPct(h.cov)})); });
  const terms=[...new Set(dmTok(text))], w=Object.fromEntries(terms.map(t=>[t,dmIdf(t)])), all=terms.reduce((a,t)=>a+w[t],0)||1;
  const cover=t=>{ const s=new Set(dmTok(t)); return Math.round(terms.reduce((a,x)=>a+(s.has(x)?w[x]:0),0)/all*100); };
  (PP.rows||[]).forEach(p=>{ const c=btMhCand(p); if(!c) return; const pct=cover([c.title,c.body,c.pa].join(' ')); if(pct>=30) out.push(Object.assign(c,{pct})); });
  (FE.rows||[]).forEach(x=>{ const c=btLeCand(x), pct=cover([c.title,c.title,c.body,c.pa].join(' ')); if(pct>=30) out.push(Object.assign(c,{pct})); });
  out.forEach(m=>{ m.mine=m.cus.some(c=>mine.has(String(c[2]))); if(m.mine) m.pct=Math.min(99,m.pct+6); });
  return out.filter(m=>m.pct>=30).sort((a,b)=>b.pct-a.pct||(b.signal||0)-(a.signal||0)).slice(0,limit||12);
}
function btNeedCand(c){ const cus=btNeedCus(c); return {k:'a', id:c.id, title:c.name, pa:c.product, cus, signal:btSig(cus), keys:c.rs.map(x=>x.k).filter(Boolean), body:c.what, why:c.why, outcome:c.outcome, bs:c.bs}; }
function btBuiltCand(b){ return {k:'b', id:b.k, title:b.t, sub:b.f||'', pa:b.p||'', cus:[], body:b.i||''}; }
function btMhCand(p){ const v=(p&&p.v)||{}; if(!v.feature||ppStatus(p)==='Done') return null; const cu=btCu(v.driver);
  return {k:'m', id:p.id, title:v.feature, pa:v.area||'', key:v.key||'', month:v.month||'', cus:cu?[cu]:[], body:[v.why,v.impact].filter(Boolean).join(' ')}; }
function btLeCand(x){ const v=x.v||{}; return {k:'l', id:x._id, le:x.id||x._id, title:v.title||'', pa:v.productArea||'', cus:(v.customers||[]).map(c=>btCu(c.client)).filter(Boolean), body:v.problem||''}; }
function btFind(key){ const i=String(key||'').indexOf(':'), k=key.slice(0,i), id=key.slice(i+1);
  if(k==='a'){ const c=DM.byCl&&DM.byCl.get(id); return c?btNeedCand(c):null; }
  if(k==='b'){ const b=DM.data&&(DM.data.built||[]).find(x=>x.k===id); return b?btBuiltCand(b):null; }
  if(k==='m'){ const p=(PP.rows||[]).find(x=>x.id===id); return p?(btMhCand(p)||{k:'m', id, title:(p.v||{}).feature||id, pa:'', cus:[], key:(p.v||{}).key||''}):null; }
  if(k==='l'){ const x=(FE.all||[]).find(r=>r._id===id); return x?btLeCand(x):null; } return null; }
const btKey=m=>m.k+':'+m.id;
function btKindChip(m){ const t=m.k==='m'?'Must-have'+(m.month?' · '+m.month:''):m.k==='l'?'On the ledger · '+(m.le||''):m.k==='b'?'Built'+(m.sub?' · '+m.sub:''):'Asked · signal '+(m.signal||0);
  return `<span class="bt-kc k-${m.k}">${btE(btCut(t,48))}</span>`; }
function btCandTitle(m){ return `<button type="button" class="linkbtn bt-mt" data-btcand="${btE(btKey(m))}">${btE(m.title)}</button>`; }
function btOpenCand(key){ const m=btFind(key); if(!m) return;
  if(m.k==='a') dmOpenNeed(m.id); else if(m.k==='l') feOpenEntry(m.id); else if(m.k==='m'&&typeof ppOpenEditor==='function') ppOpenEditor(m.id);
  else if(m.k==='b'){ const a=document.createElement('a'); a.href='https://expoplatform.atlassian.net/browse/'+encodeURIComponent(m.id); a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); } }
function btMatchMsg(m, clients){
  const own=new Set((clients||[]).map(String)), others=m.cus.filter(x=>!own.has(String(x[2])));
  if(m.k==='a'){ const t1=others.filter(x=>x[1]===1).length, names=others.slice(0,2).map(x=>x[0]).join(', ')+(others.length>2?' and '+(others.length-2)+' more':'');
    if(m.pct>=85) return others.length?`${btPl(others.length,'other client')} asked for this already: a ${m.pct}% match with a need raised by ${names}${t1?', '+t1+' of them Tier 1':''}. Add your client and its signal goes up.`:`Your client already asked for this: a ${m.pct}% match with a need they raised before.`;
    if(others.length<m.cus.length) return `Your client is already one of the ${m.cus.length} asking for this (${m.pct}% match). Link it so this builds on theirs instead of starting a new queue.`;
    return `Close to what others have asked (${m.pct}%). Link it and your client’s voice adds to ${m.cus.length===1?'theirs':'the '+m.cus.length+' already asking'}.`; }
  if(m.k==='b') return m.pct>=85?`We may have built this already: a ${m.pct}% match with ${m.sub?'“'+m.sub+'”':'a delivered story'} (${m.id}). Check it with the client before logging.`:`Related to something already built (${m.pct}%). If the client needs more than it does, extend it.`;
  if(m.k==='m') return `Already on its way: a ${m.pct}% match with a must-have item${m.month?' planned for '+m.month:''}.`;
  return `Already on the ledger: a ${m.pct}% match with ${m.le}.`;
}

// ---------- the call recording (Fathom): resolve the link, read the transcript, keep only the moments quoted ----------
const BT_FA_ERR={server_not_connected:'Connect Fathom in claude.ai (Settings, Connectors), then fetch again.', needs_reauth:'Reconnect Fathom in claude.ai (Settings, Connectors), then fetch again.',
  not_in_manifest:'Fathom is not switched on for this page yet.', not_granted:'Fathom was not allowed for this page. Allow it when claude.ai asks, then fetch again.',
  tool_error:'Fathom could not find that recording. Check the link is from a call you can open in Fathom.', selection_required:'Choose which Fathom account to use when claude.ai asks, then fetch again.',
  blocked_by_policy:'Your organisation blocks this Fathom action.', rate_limited:'Fathom is busy. Wait a minute and fetch again.'};
const btTextOf=r=>{ if(!r) return ''; const p=r.payload!==undefined?r.payload:r; if(typeof p==='string') return p; if(Array.isArray(p)) return p.map(c=>c&&(c.text||'')).join('\n');
  if(Array.isArray(r.content)) return r.content.map(c=>c&&c.text||'').join('\n'); if(p&&typeof p==='object'){ if(Array.isArray(p.content)) return p.content.map(c=>c&&c.text||'').join('\n'); return JSON.stringify(p); } return String(p); };
async function btFetchCall(){
  const F=BT.fa, inp=BT.el&&BT.el.querySelector('#bt-url'); if(inp) F.url=inp.value.trim();
  if(!/fathom\.video\//i.test(F.url)){ Object.assign(F,{state:'error', err:'Paste a Fathom link. It looks like https://fathom.video/share/…'}); return btPaintCall(); }
  if(BT.mcp===undefined) BT.mcp=await btUse('mcp');
  if(!BT.mcp){ Object.assign(F,{state:'error', err:'Reading calls needs the Fathom connection, which this view of the page does not have. Type or paste what was said instead.'}); return btPaintCall(); }
  Object.assign(F,{state:'loading', err:''}); btPaintCall();
  try{
    const r1=btTextOf(await BT.mcp.callTool('Fathom','get_recording_by_url',{url:F.url}));
    const rid=(r1.match(/recording_id\W+(\d+)/)||[])[1], curl=(r1.match(/\burl\W+(https?:\/\/[^\s"',}]+)/)||[])[1];
    if(!rid) throw {code:'tool_error'};
    F.title=((r1.match(/title\W+([^\n"]+)/)||[])[1]||'').trim(); F.date=(r1.match(/date\W+([0-9]{4}-[0-9]{2}-[0-9]{2})/)||[])[1]||''; F.callUrl=curl||'';
    const inp2={recording_id:+rid}; if(curl) inp2.url=curl;
    const r2=btTextOf(await BT.mcp.callTool('Fathom','get_meeting_transcript',inp2)), segs=[];
    r2.split(/\n/).forEach(line=>{ const m=line.match(/^\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\((https?:[^)]+)\)\s*([^:]{1,60}):\s*(.*)$/); if(m) segs.push({i:segs.length+1, t:m[1], link:m[2], speaker:m[3].trim(), text:m[4].replace(/\\\*/g,'*').trim()}); });
    if(!segs.length) throw {code:'tool_error'};
    Object.assign(F,{state:'ready', segs});
    try{ actLog('open','Read a call recording for Beta'); }catch(e){}
  }catch(e){ Object.assign(F,{state:'error', err:BT_FA_ERR[e&&e.code]||'The call could not be read just now. Try again in a moment.'}); }
  btPaintCall();
  if(BT.mode==='share'&&F.state==='ready') btFill(false);
}
const btSeg=id=>/^s\d+$/.test(id)?BT.fa.segs[+id.slice(1)-1]:null;
function btQuotes(ids){ return [...new Set(ids)].filter(x=>/^s\d+$/.test(x)).slice(0,5).map(btSeg).filter(Boolean).map(s=>({t:s.t, link:s.link, speaker:s.speaker, text:s.text.slice(0,300)})); }
function btPaintCall(){
  const b=BT.el&&BT.el.querySelector('#bt-fbox'); if(!b) return; const F=BT.fa;
  if(F.state==='loading'){ b.innerHTML='<div class="bt-teaser">Reading the recording and its transcript from Fathom…</div>'; return; }
  if(F.state==='error'){ b.innerHTML=`<div class="bt-note bad">${btE(F.err)}</div>`; return; }
  if(F.state!=='ready'){ b.innerHTML=''; return; }
  const text=BT.mode==='share'?btText(BT.s)||'':btText(BT.d), q=[...new Set(dmTok(text))], qs=q.reduce((a,w)=>a+(DM.idx?dmIdf(w):1),0)||1;
  const moments=q.length?F.segs.map(s=>{ const st=new Set(dmTok(s.text)); return {s, sc:q.reduce((a,w)=>a+(st.has(w)?(DM.idx?dmIdf(w):1):0),0)/qs}; }).filter(x=>x.sc>.15).sort((a,b)=>b.sc-a.sc).slice(0,3):[];
  const speakers=[...new Set(F.segs.map(s=>s.speaker))];
  b.innerHTML=`<div class="bt-call"><b>${btE(F.title||'Call')}</b><span class="small">${btE(F.date)} · ${btPl(F.segs.length,'moment')} · ${btE(speakers.slice(0,4).join(', '))}</span>
    ${moments.length?`<div class="bt-sl">Moments that match</div>${moments.map(x=>btQuoteHtml(x.s)).join('')}`:'<div class="small">Once the request is filled in, the moments that match it show here.</div>'}
    <div class="small">Only the moments quoted in the request are kept. The transcript itself is not saved.</div></div>`;
}
function btQuoteHtml(s){ return `<a class="bt-quote" href="${btE(s.link)}" target="_blank" rel="noopener"><span class="bt-qt">${btE(s.t)}</span> <b>${btE(s.speaker)}:</b> ${btE(btCut(s.text,220))}</a>`; }

// ---------- Claude (the page's sample capability) ----------
const BT_AI_ERR={not_granted:'Claude needs your permission for this page. Allow it when claude.ai asks, then try again.', sampling_disabled:'Claude is not available for your account or organisation here.',
  not_declared:'This version of the page cannot use Claude.', capability_disabled:'Claude is not available in this view of the page.', capability_removed:'Your Claude app is too old for this. Update it or open the page in a browser.',
  rate_limited:'Too many requests to Claude just now, or your usage limit is reached. Wait a minute and try again.', session_expired:'Your claude.ai session ended. Sign in again, then try again.',
  refused:'Claude declined this text. Rephrase it and try again.', empty_completion:'Claude returned nothing. Add a little more detail and try again.', invalid_json:'Claude’s answer came back in the wrong shape. Try again.',
  prompt_too_large:'There is too much text for Claude at once. Shorten it and try again.', cancelled:'Stopped.', upstream_error:'Claude did not answer just now. Try again in a moment.'};
const btAiMsg=e=>{ const c=(e&&e.code)||'upstream_error'; return (BT_AI_ERR[c]||BT_AI_ERR.upstream_error)+(btAcc().ajay?' (code: '+c+')':''); };
function btParse(t){ t=String(t||'').trim(); try{ return JSON.parse(t); }catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/); if(f){ try{ return JSON.parse(f[1]); }catch(e){} }
  const a=t.indexOf('{'), b=t.lastIndexOf('}'); if(a>=0&&b>a){ try{ return JSON.parse(t.slice(a,b+1)); }catch(e){} }
  throw {code:'invalid_json', message:'no JSON object in the reply', text:t}; }
async function btAI(kind,prompt,o){
  o=o||{}; if(BT.sample===undefined) BT.sample=await btUse('sample'); if(!BT.sample) throw {code:'capability_disabled'};
  const opts={modelTier:o.tier||'default'}; if(o.signal) opts.signal=o.signal; if(o.fresh) opts.cache=false; if(o.onText) opts.onText=o.onText;
  const t0=Date.now(); let res;
  try{ res=await BT.sample(prompt+'\n\nReply with only the JSON object, no other text.',opts); }
  catch(e){ const c=e&&e.code; btLog(kind,prompt,{code:c, message:e&&e.message},null,[],c||'error'); if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(c)) BT.sample=null; throw e; }
  let data; try{ data=btParse(res.text); }catch(e){ btLog(kind,prompt,res.text,null,[],'invalid_json'); throw e; }
  BT.aiOk=true; return {data, text:res.text, ms:Date.now()-t0};
}
// the AI log: every call this session in the Beta lab, and one line per call in the History (the viewer's own activity log)
function btLog(kind,prompt,raw,used,dropped,code){ BT.ailog.unshift({at:new Date(), kind, prompt, raw, used, dropped:dropped||[], code:code||''}); if(BT.ailog.length>30) BT.ailog.pop();
  try{ actLog('ai',kind+(code?' (failed: '+code+')':'')+(dropped&&dropped.length?' · left out '+dropped.join(', '):'')); }catch(e){} if(HS.sub==='beta') btLabPaint(); }
// without Claude: split the text into what, why and outcome by its words
function btHeuristic(raw){
  const lines=String(raw||'').split(/\n+|(?<=[.!?])\s+/).map(x=>x.replace(/^\s*[^:\n]{1,40}?\b\d{1,2}:\d{2}\b\s*:?\s*/,'').replace(/^\s*[A-Z][\w .()'-]{0,30}:\s+/,'').trim()).filter(x=>x.length>3);
  if(!lines.length) return {what:'', why:'', outcome:''};
  const isWant=x=>/\b(wants?|needs?|ask(s|ing|ed)?|would like|should|can we|could we|request(s|ed)?|looking for)\b/i.test(x);
  const isWhy=x=>/\b(because|currently|today|right now|at the moment|can'?t|cannot|never|problem|issue|without|manual(ly)?|have to|half of|by hand|struggl\w*)\b/i.test(x);
  const isOut=x=>/\b(so that|so they|would|will|then they|same day|faster|easier|instead|stop|no longer)\b/i.test(x);
  let wi=lines.findIndex(x=>isWant(x)&&!isWhy(x)); if(wi<0) wi=lines.findIndex(isWant); if(wi<0) wi=0;
  let what=lines[wi]; const rest=lines.filter((_,k)=>k!==wi); let why=rest.find(isWhy)||'', out=rest.find(x=>x!==why&&isOut(x))||'';
  const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s; let m;
  if(!out&&(m=what.match(/^(.*?)\s*,?\s*\b(so that|so they can)\b\s*(.+)$/i))){ what=m[1]; out=cap(m[3]); }
  if(!why&&(m=what.match(/^(.*?)\s*,?\s*\bbecause\b\s*(.+)$/i))){ what=m[1]; why=cap(m[2]); }
  return {what:cap(what.replace(/[,;]\s*$/,'')), why, outcome:out};
}
function btCallLines(){ let n=0; return BT.fa.segs.filter(s=>(n+=s.text.length)<28000).map(s=>`s${s.i} [${s.t}] ${s.speaker}: ${s.text}`).join('\n'); }
function btAreaGuess(cands){ const areas=feAreas().map(x=>x[0]); const a=(cands||[]).find(m=>m.pa&&areas.includes(m.pa)); return a?a.pa:''; }

// ---------- Quick share: fill it in ----------
function btApplyFill(vals,cites){ const S=BT.s;
  ['what','why','outcome'].forEach(k=>{ const t=String(vals[k]||'').trim(); if(!t||btPh(t)) return; const guess=(cites[k]||[]).includes('guess');
    if(!guess&&(!S[k].trim()||S.auto[k])){ S[k]=t; S.auto[k]=true; S.cites[k]=cites[k]||[]; delete S.sugg[k]; }
    else if(t!==S[k].trim()) S.sugg[k]={text:t, cites:cites[k]||[]}; }); }
async function btFill(auto){
  const S=BT.s, call=S.src==='call', hasSrc=call?BT.fa.state==='ready':S.raw.trim().length>=12;
  if(!hasSrc){ if(!auto){ S.fillErr=call?'Read the call first, then Claude can fill it in.':'Type or say a sentence or two first, then Claude can fill it in.'; btPaintFill(); } return; }
  if(auto&&!BT.aiOk&&!call) return;
  const local=()=>{ if(call) return; applyLocal(); };
  const applyLocal=()=>{ btApplyFill(btHeuristic(S.raw),{what:['raw'],why:['raw'],outcome:['raw']}); S.fillNote='Filled in from your text. Check each field.'; };
  if(BT.sample===undefined) BT.sample=await btUse('sample');
  if(!BT.sample){ local(); btRepaintShare(); return; }
  const src=call?'Call transcript (each line starts with its id):\n'+btCallLines():(S.src==='chat'?'Chat snippet':'What the person said or typed')+' (cite it as "raw"):\n'+S.raw.slice(0,8000);
  const names=feClients().map(x=>x[1]).join('; ');
  const prompt=`From the source below, write the request a client is making to ExpoPlatform (an event technology platform). Use only what the source says.

Rules:
- what: one or two sentences, what the client wants. why: what goes wrong today without it. outcome: what changes when it exists.
- Each field has "cites": ${call?'transcript line ids such as "s12"':'["raw"]'}. If the source does not state why or outcome, you may write a short best guess and cite ["guess"]. Never guess what.
- Never invent customers, dates or money.
- clients: the names of any of these clients that the source clearly names, written exactly as in this list, otherwise an empty list: ${names}
- If the source contains several requests, pick the one stated most clearly.

${src}

JSON shape: {"clients":[],"what":{"text":"","cites":[]},"why":{"text":"","cites":[]},"outcome":{"text":"","cites":[]}}`;
  S.filling=true; S.fillErr=''; S.fillNote=''; S.progress=0; btPaintFill(); btPaintFoot();
  try{
    const r=await btAI('Fill in from '+BT_SRC[S.src].toLowerCase(),prompt,{fresh:!auto, onText:({text})=>{ S.progress=text.length; btPaintFill(); }});
    const d=r.data||{}, ok=id=>id==='guess'||(id==='raw'?!call:!!btSeg(id)), vals={}, cites={}, dropped=[];
    ['what','why','outcome'].forEach(k=>{ const x=d[k]||{}, cs=(Array.isArray(x.cites)?x.cites:[]).map(String).filter(ok), t=String(x.text||'').trim();
      if(t&&(cs.length||k!=='what')){ vals[k]=t; cites[k]=cs.length?cs:['guess']; } else if(t) dropped.push(k); });
    if(!vals.what&&!call){ vals.what=btHeuristic(S.raw).what; cites.what=['raw']; }
    btApplyFill(vals,cites);
    const cl=feClients(), found=(Array.isArray(d.clients)?d.clients:[]).map(n=>cl.find(c=>btNorm(c[1])===btNorm(n))).filter(Boolean).map(c=>c[0]).filter(pd=>!S.clients.includes(pd));
    if(found.length){ S.clients=S.clients.concat(found); S.clientAuto=true; }
    S.fillNote='Filled in for you. Check each field and change anything.';
    btLog('Fill in from '+BT_SRC[S.src].toLowerCase(),prompt,r.text,{vals,cites,clients:found.map(btClientsTxt)},dropped);
  }catch(e){ S.fillErr=btAiMsg(e)+(call?'':' The fields were filled from your text instead.'); local(); }
  finally{ S.filling=false; btRepaintShare(); }
}
async function btTidy(fields, related){
  const prompt=`Tidy this request for ExpoPlatform (an event technology platform). Fix spelling, grammar and clarity. Keep the meaning, the client's terms and every fact. Do not add anything new. Keep each field about the same length or shorter.
Also write "title": a short name for the request, at most 8 words, in sentence case.
${related?'Also write "question": one short question to the person sharing that would add information the existing request below lacks (for example which parts of the platform, how often, which users), or empty if nothing important is missing.':'Also write "question": one short question that would make the request clearer, or empty if it is already clear.'}

THE TEXT TO TIDY (tidy only this):
what: ${fields.what}
why: ${fields.why||'(not given)'}
outcome: ${fields.outcome||'(not given)'}
${related?`
EXISTING REQUEST, for context only (never copy from it):
its what: ${related.body||''}
its why: ${related.why||''}
its outcome: ${related.outcome||''}
`:''}
JSON shape: {"what":"","why":"","outcome":"","title":"","question":""}`;
  try{ const r=await btAI('Tidy before saving',prompt,{tier:'quick'}), d=r.data||{};
    const out={what:String(d.what||'').trim(), why:String(d.why||'').trim(), outcome:String(d.outcome||'').trim(), title:String(d.title||'').trim().slice(0,90), question:String(d.question||'').trim().slice(0,240)};
    ['why','outcome'].forEach(k=>{ if(!fields[k]||btPh(out[k])) out[k]=''; }); btLog('Tidy before saving',prompt,r.text,out); return out; }
  catch(e){ return {failed:btAiMsg(e)}; }
}
const btText=o=>[o.what,o.why,o.outcome].filter(Boolean).join(' ').trim()||(o.raw||'');
function btShareMatches(){ const t=btText(BT.s); return t.length<8?[]:btCands(t,BT.s.clients,4); }
function btShareMode(){ const p=BT.s.pick; if(!p) return 'new'; return p.startsWith('a:')?'join':p.startsWith('b:')?'exists':'follow'; }
function btShareMissing(){ const S=BT.s;
  if(!S.clients.length) return 'Choose at least one client, or Platform.';
  if(S.what.trim().length<8) return S.filling?'Filling in what they want…':S.raw.trim().length>=12?'Press “Fill it in for me”, or type what they want under The request.':S.src==='call'&&BT.fa.state!=='ready'?'Paste the Fathom link and press “Read the call”.':'Say what the client wants.';
  if(btShareMode()==='new'&&!S.area) return 'Choose the product area.';
  return ''; }

// ---------- the modal ----------
function btOpen(preset){
  preset=preset||{}; const me=feMe();
  if(!me.ok){ uiToast('Sign in first: every work item is recorded under the name of whoever logs it. Reload the page and choose Continue.',{bad:true}); return; }
  if(me.canWrite===false){ uiToast('Your access to this page is view-only, so you cannot log work items. Ask the owner for “Can interact”.',{bad:true}); return; }
  if(BT.s.stage==='done') btResetShare(); if(BT.d.step==='done') btResetDrop();
  if(preset.client&&!BT.s.clients.includes(preset.client)){ BT.s.clients=[preset.client]; BT.d.clients=[preset.client]; }
  if(preset.mode) BT.mode=preset.mode;
  if(BT.el) BT.el.remove();
  const d=document.createElement('div'); d.className='modal bt-m'; d.id='bt-m'; d.setAttribute('open',''); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','bt-m-t');
  BT.el=d; BT.prev=document.activeElement; document.body.appendChild(d); document.body.classList.add('bt-open');
  d.addEventListener('click',btClick); d.addEventListener('input',btInput); d.addEventListener('change',btChange); d.addEventListener('paste',btPasteEv,true); d.addEventListener('keydown',btKeyIn);
  document.addEventListener('keydown',btEsc,true);
  btPaint(); dmLoad().then(()=>{ if(BT.el) btPaintParts(); }).catch(()=>{});
  if(BT.sample===undefined) btUse('sample').then(x=>{ if(BT.sample===undefined) BT.sample=x; if(BT.el) btPaintFoot(); });
  try{ actLog('open','Beta: log a new work item'); }catch(e){}
  setTimeout(()=>{ const f=d.querySelector('#bt-raw,#bd-what,#shc-in'); if(f) f.focus(); },0);
}
window.btOpen=btOpen;
function btClose(){ if(!BT.el) return; BT.el.remove(); BT.el=null; document.body.classList.remove('bt-open'); document.removeEventListener('keydown',btEsc,true); if(BT.prev&&BT.prev.focus) try{ BT.prev.focus(); }catch(e){} }
function btEsc(e){ if(e.key==='Escape'&&BT.el&&!document.querySelector('.ui-dlg')&&!(document.getElementById('modal')||{}).hasAttribute?.('open')){ e.preventDefault(); e.stopPropagation(); btClose(); } }
function btKeyIn(e){ if(e.key==='Enter'&&e.target&&(e.target.id==='bt-url'||e.target.id==='bd-furl')){ e.preventDefault(); btFetchCall(); } }
window.btFromNeed=id=>{ const c=DM.byCl.get(id); if(!c) return; btResetDrop(); const D=BT.d;
  const cl=[...new Set(c.rs.flatMap(r=>(r.cu||[]).map(x=>x[2]).filter(Boolean).map(String)))].filter(pd=>btCo(pd)).slice(0,6);
  Object.assign(D,{what:c.what||c.name, why:c.why||'', outcome:c.outcome||'', clients:cl, links:[{k:'a', id:c.id, rel:'same'}], decision:'builds', fromNeed:c.id, area:feAreas().some(a=>a[0]===c.product)?c.product:''});
  btOpen({mode:'drop'}); };
function btPaint(){
  const d=BT.el; if(!d) return; const how=!!btAcc().how;
  d.innerHTML=`<div class="scrim" data-btclose></div><div class="box bt-box"><div class="top"><div><h3 id="bt-m-t">Log a new work item <span class="bt-beta">Beta</span></h3>
    <div class="meta">Share what the client said. Claude fills in the request, shows who else asked for it and what already exists, and logs it with you as the person who logged it.</div></div>
    <button class="x" type="button" data-btclose aria-label="Close">&#215;</button></div>
    <div class="bt-bar"><span class="seg" role="group" aria-label="How to log it"><button type="button" data-btmode="share" aria-pressed="${BT.mode==='share'}">Quick share</button><button type="button" data-btmode="drop" aria-pressed="${BT.mode==='drop'}">Full review · 4 steps</button></span>
      <label class="bt-testsw"><input type="checkbox" id="bt-test"${BT.test?' checked':''}> Test mode</label>
      ${how?'<button type="button" class="linkbtn" data-btold>Use the classic form</button>':''}</div>
    ${BT.test?'<div class="bt-testbar">Test mode is on. What you log is tagged <b>Test</b> and left out of every count, board and signal. Only viewers with test mode on see it.</div>':''}
    <div class="bt-body" id="bt-body">${BT.mode==='share'?btShareBody():btDropBody()}</div>
    <div class="foot bt-foot" id="bt-foot"></div></div>`;
  btPaintParts();
}
function btPaintParts(){ if(!BT.el) return; if(BT.mode==='share'){ if(BT.s.stage!=='done'){ btPaintCall(); btPaintFill(); btPaintMatch(); btPaintTidy(); } }
  else { const s=BT.d.step; if(s===1){ btPaintCall(); btPaintTeaser(); } if(s===2){ btPaintMatches(); btPaintLinked(); } if(s===3){ btPaintSugg(); btPaintAi(); } if(s===4) btPaintDTidy(); }
  btPaintFoot(); }
const btQ=s=>BT.el?BT.el.querySelector(s):null;

// ---------- pickers and dictation ----------
function btPicker(id,sel){
  return `<div class="bt-cp" data-cp="${id}"><div class="bt-cpc">${sel.map(pd=>{ const c=btCo(pd); return c?`<span class="bt-chip">${btE(c.short)}${c.tier?' <small>T'+c.tier+'</small>':''}<button type="button" data-btcpx="${id}|${btE(pd)}" aria-label="Remove ${btE(c.short)}">&#215;</button></span>`:''; }).join('')}</div>
    <input class="bt-in" id="${id}-in" data-btcpin="${id}" type="search" autocomplete="off" placeholder="${sel.length?'Add another client':'Type a client name'}" aria-label="${sel.length?'Add another client':'Choose a client'}"><div class="bt-cpl" id="${id}-list" hidden></div></div>`; }
const btCpState=id=>id==='shc'?BT.s:BT.d;
function btCpList(id){ const i=btQ('#'+id+'-in'), l=btQ('#'+id+'-list'); if(!i||!l) return; const q=btNorm(i.value), st=btCpState(id);
  const all=[['Platform','Platform (no single client)']].concat(feClients()).filter(([pd,n])=>!st.clients.includes(pd)&&(!q||btNorm(n).includes(q)));
  const hits=all.sort((a,b)=>(btNorm(a[1]).startsWith(q)?0:1)-(btNorm(b[1]).startsWith(q)?0:1)).slice(0,8);
  l.innerHTML=hits.map(([pd,n],k)=>{ const c=btCo(pd); return `<button type="button" class="bt-cpo${k===0?' first':''}" data-btcpadd="${id}|${btE(pd)}">${btE(n)}${c&&c.tier?' <small>Tier '+c.tier+'</small>':''}</button>`; }).join('')||'<div class="small bt-cpn">No client matches</div>'; l.hidden=false; }
function btCpSet(id,list){ const st=btCpState(id); st.clients=[...new Set(list)]; const w=btQ('[data-cp="'+id+'"]'); if(w){ w.outerHTML=btPicker(id,st.clients); const i=btQ('#'+id+'-in'); if(i) i.focus(); }
  if(id==='shc'){ BT.s.clientAuto=false; const cs=btQ('#bt-csug'); if(cs) cs.innerHTML=''; btPaintMatch(); } btPaintFoot(); }
const BT_DEV=/iPhone|iPad|iPod/.test(navigator.userAgent)?'ios':/Android/.test(navigator.userAgent)?'android':/Mac/.test(navigator.platform||navigator.userAgent)?'mac':/Win/.test(navigator.platform||navigator.userAgent)?'win':'other';
const BT_SPEAK={ios:'<ol><li>Tap in the box.</li><li>Tap the microphone on your keyboard and talk.</li><li>Tap it again when you are done.</li></ol>',
  android:'<ol><li>Tap in the box.</li><li>Tap the microphone on your keyboard and talk.</li><li>Tap it again when you are done.</li></ol>',
  mac:'<ol><li>The first time only: Apple menu, System Settings, Keyboard, and switch Dictation on. Note the shortcut it shows.</li><li>Click in the box and press that shortcut (on most Macs the microphone key, F5, or Control twice).</li><li>Talk. The words appear as you speak. Press the shortcut again to stop.</li></ol>',
  win:'<ol><li>Click in the box.</li><li>Press the Windows key and H together, then talk.</li><li>If nothing opens: Settings, Time &amp; language, Speech, and switch voice typing on.</li></ol>',
  other:'<ol><li>Click in the box.</li><li>Start your device’s dictation (voice typing) and talk.</li></ol>'};
let BT_QR=null;
function btLoadQR(){ if(window.QRCode) return Promise.resolve(); if(!BT_QR) BT_QR=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); return BT_QR; }
function btSpeak(target){
  const el=btQ('#'+target); if(el){ el.focus(); const n=el.value.length; try{ el.setSelectionRange(n,n); }catch(e){} }
  const box=btQ('#speak-'+target); if(!box) return; const phone=BT_DEV==='ios'||BT_DEV==='android'; box.hidden=false;
  box.innerHTML=`<b>Speak into the box</b>${BT_SPEAK[BT_DEV]}${phone?'':`<div class="bt-qrbox"><div class="bt-qr" id="qr-${target}" aria-label="QR code that opens the ledger on your phone"></div><div><b>Easier on your phone.</b><br>Scan this with your phone’s camera to open the ledger there, then tap the microphone on your keyboard and talk.</div></div>`}
    <span class="small">Pages inside claude.ai cannot use the microphone directly, so your device turns your voice into text.</span>`;
  if(!phone) btLoadQR().then(()=>{ const q=btQ('#qr-'+target); if(q&&window.QRCode&&!q.firstChild){ try{ new QRCode(q,{text:BT_LEDGER_URL+'#log', width:124, height:124, colorDark:'#0D0D28', colorLight:'#ffffff'}); }catch(e){} } })
    .catch(()=>{ const q=btQ('#qr-'+target); if(q) q.outerHTML='<div class="small">The QR code could not load. Open the ledger on your phone from claude.ai instead.</div>'; });
}

// ---------- Quick share: the view ----------
function btShareBody(){
  const S=BT.s; if(S.stage==='done') return btShareDone();
  const areas=feAreas();
  return `${(S.raw||S.what||S.clients.length)?'<div class="bt-restart"><button type="button" class="linkbtn" data-btnew>Start over</button></div>':''}
    <div class="bt-f"><label for="shc-in">Clients asking <span class="req">at least one</span></label><span class="bt-h">Type a name and pick it. Add every client asking for this, or Platform when it is for everyone.</span>${btPicker('shc',S.clients)}<div id="bt-csug">${S.clientAuto&&S.clients.length?'<span class="small">Picked from what you shared. Remove any that are wrong.</span>':''}</div></div>
    <div class="bt-f"><label>How are you sharing it?</label><span class="seg" role="group" aria-label="Source">${Object.entries(BT_SRC).map(([k,l])=>`<button type="button" data-btsrc="${k}" aria-pressed="${S.src===k}">${l}</button>`).join('')}</span></div>
    <div id="bt-src">${btShareSrc()}</div><div id="bt-fill"></div>
    <div class="bt-fh"><b>The request</b><span class="small">Filled in from what you shared. You can also type here.</span></div>
    <div id="bt-fields">${btShareFields()}</div>
    <div class="bt-f"><label for="bt-area">Product area <span class="req">for a new item</span></label><span class="bt-h">Filled in from the closest match. Not needed when you add to something that already exists.</span>
      <select class="bt-in" id="bt-area"><option value="">Choose…</option>${areas.map(([k,l])=>`<option value="${btE(k)}"${S.area===k?' selected':''}>${btE(l)}</option>`).join('')}</select></div>
    <div class="bt-sec" id="bt-match"></div><div id="bt-tidy"></div>
    <div class="bt-full"><button type="button" class="linkbtn" data-btfull>Need more detail? Continue in the full review &#8594;</button></div>`;
}
function btShareSrc(){ const S=BT.s;
  if(S.src==='call') return `<div class="bt-f"><label for="bt-url">Fathom link</label><span class="bt-h">From your call with the client. Claude reads the transcript and fills in the request; only the quoted moments are kept.</span>
    <div class="bt-row"><input class="bt-in" id="bt-url" type="url" placeholder="https://fathom.video/share/…" value="${btE(S.url||BT.fa.url)}"><button type="button" class="ibtn" data-btfetch>Read the call</button></div><div id="bt-fbox"></div></div>`;
  const fill=`<button type="button" class="ibtn primary" data-btfill${S.filling?' disabled':''}>Fill it in for me</button>`;
  if(S.src==='chat') return `<div class="bt-f"><label for="bt-raw">Chat snippet</label><span class="bt-h">Paste from Slack, Teams, email or WhatsApp. Claude fills in the request as soon as you paste. Leave out personal details such as phone numbers.</span><textarea class="bt-in" id="bt-raw" rows="5" placeholder="Paste the messages here">${btE(S.raw)}</textarea><div class="bt-acts">${fill}</div></div>`;
  return `<div class="bt-f"><label for="bt-raw">Tell us in your own words</label><span class="bt-h">Type or speak a few sentences: what they want, why, and what would change. Then press “Fill it in for me”.</span><textarea class="bt-in" id="bt-raw" rows="4" placeholder="The client told me their exhibitors…">${btE(S.raw)}</textarea>
    <div class="bt-acts"><button type="button" class="ibtn" data-btspeak="bt-raw">Speak instead</button>${fill}</div><div class="bt-speak" id="speak-bt-raw" hidden></div></div>`; }
function btShareFields(){ const S=BT.s;
  const f=(k,label,req,rows)=>`<div class="bt-f"><label for="bt-${k}">${label}${req?' <span class="req">required</span>':''}</label><textarea class="bt-in" id="bt-${k}" rows="${rows}">${btE(S[k])}</textarea><div class="bt-sugg" id="bts-${k}">${btShareSugg(k)}</div></div>`;
  return f('what','What do they want?',true,3)+f('why','Why do they need it?',false,2)+f('outcome','What changes when it exists?',false,2)+
    `<div class="bt-f"><label for="bt-name">Name <span class="opt">optional</span></label><span class="bt-h">Leave it empty and Claude names it when it tidies the wording.</span><input class="bt-in" id="bt-name" maxlength="90" value="${btE(S.name)}"></div>`; }
function btCites(cs,src){ return (cs||[]).map(id=>{ const s=btSeg(id); if(s) return `<a class="bt-cite call" href="${btE(s.link)}" target="_blank" rel="noopener">Call ${btE(s.t)}, ${btE(s.speaker)}</a>`;
  if(id==='raw'||id==='tam') return `<span class="bt-cite you">${src==='chat'?'From the chat':'From your words'}</span>`; if(id==='guess') return '<span class="bt-cite guess">Claude’s guess: confirm with the client</span>';
  const m=btFind(id); return m?`<button type="button" class="bt-cite" data-btcand="${btE(id)}">${btE(btCut(m.title,60))}</button>`:''; }).join(''); }
function btShareSugg(k){ const S=BT.s, sg=S.sugg[k];
  if(sg&&sg.text&&sg.text.trim()!==S[k].trim()){ const gs=(sg.cites||[]).includes('guess'); return `<div class="bt-sg${gs?' guess':''}"><span class="small">${gs?'Claude’s guess: the source does not say this':'Suggested from the '+(S.src==='call'?'call':S.src==='chat'?'chat':'text above')}</span><p>${btE(sg.text)}</p><div>${btCites(sg.cites,S.src)}</div><button type="button" class="ibtn" data-btuse="${k}">Use this</button></div>`; }
  if(S.auto[k]&&S.cites[k]) return `<span class="small">Filled in for you. Change anything you like.</span> ${btCites(S.cites[k],S.src)}`; return ''; }
function btPaintFill(){ const b=btQ('#bt-fill'), S=BT.s; if(!b) return;
  b.innerHTML=S.filling?`<div class="bt-teaser"><span class="gate-spin"></span> ${S.progress?'Writing it up…':'Reading the '+(S.src==='call'?'call':S.src==='chat'?'chat':'text')+'…'} <span class="small">${S.progress?'':'Up to a minute. The first time, claude.ai asks you to allow Claude for this page.'}</span></div>`
    :S.fillErr?`<div class="bt-note bad">${btE(S.fillErr)}</div>`:S.fillNote?`<div class="bt-teaser ok">${btE(S.fillNote)}</div>`:''; }
function btRepaintShare(){ const S=BT.s; const f=btQ('#bt-fields'); if(f) f.innerHTML=btShareFields();
  const pk=btQ('[data-cp="shc"]'); if(pk) pk.outerHTML=btPicker('shc',S.clients);
  const cs=btQ('#bt-csug'); if(cs) cs.innerHTML=S.clientAuto&&S.clients.length?'<span class="small">Picked from what you shared. Remove any that are wrong.</span>':'';
  const fb=btQ('[data-btfill]'); if(fb) fb.disabled=!!S.filling;
  btPaintFill(); btPaintMatch(); btPaintCall(); }
function btPaintMatch(){ const w=btQ('#bt-match'), S=BT.s; if(!w) return;
  const ms=btShareMatches();
  if(!S.area){ const g=btAreaGuess(ms); if(g){ S.area=g; const a=btQ('#bt-area'); if(a) a.value=g; } }
  if(!ms.length){ w.innerHTML=btText(S).length>=8?`<h4>Is this it?</h4><div class="small">${DM.data?'Nothing close yet. It will be logged as a new work item.':'Loading the demand map…'}</div>`:''; btPaintFoot(); return; }
  w.innerHTML=`<h4>Is this it?</h4><div class="small">If one of these is the same idea, pick it. That adds your client’s voice in one tap instead of starting a new item.</div>
    ${ms.map(m=>{ const key=btKey(m), on=S.pick===key, act=m.k==='a'?'Yes, add my client’s voice':m.k==='b'?'Yes, it’s already built':'Yes, it’s already on its way';
      return `<div class="bt-pick${on?' on':''}">${btPct(m.pct)}<div class="bt-mm">${btCandTitle(m)}<div class="small">${btKindChip(m)} ${btE(m.pa||'')}${m.cus.length?' · '+btPl(m.cus.length,'client')+' asking':''}${m.mine?' · <b>your client</b>':''}</div>
        <div class="bt-macts">${on?'<span class="bt-state ok">Picked</span><button type="button" class="linkbtn" data-btpick="">Undo</button>':`<button type="button" class="ibtn${m.k==='a'?' primary':''}" data-btpick="${btE(key)}">${act}</button>`}</div></div></div>`; }).join('')}
    <button type="button" class="bt-dcard" data-btpick="none" aria-pressed="${!!(S.none&&!S.pick)}"><b>None of these, it’s new</b><span>It becomes a new work item that others can add to.</span></button>`;
  btPaintFoot(); }
function btPct(p){ return `<div class="bt-pct" title="Share of the important words in the request found in this item, lifted when the same client is behind it. A similarity score, not a probability."><b>${p}%</b><span class="bt-meter"><i style="width:${p}%" class="${p>=85?'hi':p>=60?'md':''}"></i></span></div>`; }
function btPaintTidy(){ const w=btQ('#bt-tidy'), S=BT.s; if(!w) return;
  if(S.tidyBusy){ w.innerHTML='<div class="bt-ai"><b>Tidying the wording…</b><div class="small">Spelling and clarity only. Nothing new is added.</div></div>'; return; }
  const t=S.tidy; if(!t){ w.innerHTML=S.tidyNote?`<div class="bt-note">The wording could not be tidied: ${btE(S.tidyNote)} Your own words are saved as they are.</div>`:''; return; }
  const ch=['what','why','outcome'].filter(k=>t[k]&&t[k].trim()&&t[k].trim()!==S[k].trim());
  w.innerHTML=`<div class="bt-ai"><b>${ch.length?'We tidied the wording':'The wording looks good'}</b>${ch.length?'<div class="small">Pick the version to keep for each field, then save.</div>'+ch.map(k=>{ const ai=S.tidyChoice[k]!=='mine';
    return `<div class="bt-sl">${{what:'What',why:'Why',outcome:'Outcome'}[k]}</div><button type="button" class="bt-tc${ai?' on':''}" data-bttidy="${k}|ai"><span class="small">Tidied</span>${btE(t[k])}</button><button type="button" class="bt-tc${!ai?' on':''}" data-bttidy="${k}|mine"><span class="small">Your words</span>${btE(S[k])}</button>`; }).join(''):'<div class="small">Nothing to change. Save when you are ready.</div>'}</div>`; }
function btPaintFoot(){ const f=btQ('#bt-foot'); if(!f) return;
  if(BT.mode==='share'){ const S=BT.s; if(S.stage==='done'){ f.innerHTML=''; f.hidden=true; return; } f.hidden=false;
    const miss=btShareMissing(), mode=btShareMode(), label=S.tidy&&!S.tidyBusy?'Save':mode==='join'?'Add my client’s voice':mode==='exists'?'Record as already built':mode==='follow'?'Add my client to it':'Log it as a new work item';
    f.innerHTML=`<span class="small bt-fn">${BT.sample?'Claude tidies the wording before it is saved.':BT.sample===null?'Claude is not available in this view: your own words are saved.':''}</span>${miss?`<span class="bt-miss" role="status">${btE(miss)}</span>`:''}<button type="button" class="ibtn primary" data-btgo${miss||S.saving||S.tidyBusy?' disabled':''}>${S.saving?'Saving…':S.tidyBusy?'Tidying…':label}</button>`; return; }
  const D=BT.d; if(D.step==='done'){ f.innerHTML=''; f.hidden=true; return; } f.hidden=false;
  const s=D.step, miss=btStepMissing(s), ex=D.decision==='exists';
  const label=s===4&&D.tidyBusy?'Tidying…':s===4&&D.saving?'Saving…':s===4&&D.tidy&&D.tidyDone?(ex?'Record as already built':D.sales?'Log it and hand the value to '+feName(D.sales.id):'Log it'):s===1?'Continue to matches':s===2?(ex?'Continue to record it':D.decision==='builds'?'Continue with '+btPl(D.links.filter(l=>l.rel!=='exists').length,'linked item'):'Continue to review'):s===3?'Continue to send':ex?'Record as already built':D.sales?'Log it and hand the value to '+feName(D.sales.id):'Log it';
  f.innerHTML=`${s>1?'<button type="button" class="ibtn" data-btnav="back">Back</button>':'<span></span>'}<span class="bt-fgo">${miss?`<span class="bt-miss" role="status">${btE(miss)}</span>`:''}<button type="button" class="ibtn primary" data-btnav="next"${miss||D.saving||D.tidyBusy?' disabled':''}>${btE(label)}</button></span>`; }

// ---------- Quick share: save ----------
async function btShareGo(){
  const S=BT.s; if(btShareMissing()||S.saving) return;
  const mode=btShareMode(), pick=S.pick?btFind(S.pick):null;
  if(BT.sample&&!S.tidy&&!S.tidyDone){
    S.tidyBusy=true; btPaintTidy(); btPaintFoot();
    S.tidy=await btTidy({what:S.what, why:S.why, outcome:S.outcome}, mode==='join'&&pick?pick:null);
    S.tidyBusy=false; S.tidyDone=true;
    if(S.tidy&&S.tidy.failed){ S.tidyNote=S.tidy.failed; S.tidy=null; }
    if(S.tidy&&['what','why','outcome'].some(k=>S.tidy[k]&&S.tidy[k]!==S[k].trim())){ btPaintTidy(); btPaintFoot(); const t=btQ('#bt-tidy'); if(t) t.scrollIntoView({block:'center'}); return; }
  }
  const fin={what:S.what.trim(), why:btPh(S.why)?'':S.why.trim(), outcome:btPh(S.outcome)?'':S.outcome.trim()};
  if(S.tidy) ['what','why','outcome'].forEach(k=>{ if(S.tidy[k]&&S.tidy.hasOwnProperty(k)&&S.tidyChoice[k]!=='mine'&&fin[k]) fin[k]=S.tidy[k]; });
  const call=S.src==='call', quotes=call?btQuotes(['what','why','outcome'].flatMap(k=>S.cites[k]||[])):[];
  const base={clients:S.clients.slice(), src:S.src, what:fin.what, why:fin.why, outcome:fin.outcome, excerpt:call?'':S.raw.trim().slice(0,600),
    call:call?{title:BT.fa.title, date:BT.fa.date, url:BT.fa.callUrl||S.url}:null, quotes, question:S.tidy?S.tidy.question:''};
  S.saving=true; btPaintFoot();
  try{ S.result=mode==='new'?await btSaveItem(Object.assign({mode:'share', name:S.name||(S.tidy&&S.tidy.title)||'', area:S.area, links:[], decision:'new', matches:btShareMatches()},base)):await btSaveVoice(mode,pick,base);
    S.stage='done'; }
  catch(e){ S.err=e&&e.code==='invalid_argument'?'Not saved: your access to this page is read-only.':e&&e.code==='busy'?e.message:'It could not be saved just now ('+((e&&e.code)||'error')+'). Your text is still here; try again.'; uiToast(S.err,{bad:true}); }
  S.saving=false; btPaint();
}
async function btSaveVoice(mode,m,base){
  const me=feMe(); if(!FE.db||!me.uid) throw {code:'unavailable'};
  const at=feNow(), vid=btNewId('v'), doc=Object.assign({kind:mode==='exists'?'exists':mode, target:{k:m.k, id:m.id, name:m.title}, by:me.uid, at, beta:true},base);
  let res={mode, name:m.title, key:btKey(m)};
  if(mode==='join'){ const before={c:m.cus.length, s:btSig(m.cus)}, fresh=base.clients.map(btCu).filter(Boolean).filter(x=>!m.cus.some(y=>y[0]===x[0]||(y[2]&&y[2]===x[2])));
    const after={c:before.c+fresh.length, s:before.s+btSig(fresh)}; doc.sig={before, after, had:!fresh.length}; Object.assign(res,{before, after, had:!fresh.length, top:before.c>=5}); }
  if(BT.test) doc.test=true;
  doc.h={['e'+Date.now().toString(36)]:{at, by:me.uid, k:'share', to:doc.kind}};
  await FE.db.doc('ledger-voices/'+vid).set(doc);
  res.vid=vid; res.question=base.question; return res;
}
// a new work item from Beta, in the ledger's own schema: the five fields to log, the rest owed (and the value handed to the sales colleague if one was chosen)
async function btSaveItem(o){
  const me=feMe(); if(!FE.db||!me.uid) throw {code:'unavailable'};
  const v=feBlank(), cls=o.clients.filter(x=>x!=='Platform'), c0=cls[0]||'Platform';
  v.raisedBy={id:me.uid}; v.client=c0; v.customers=cls.length?cls.map(pd=>({client:pd,contact:'',how:o.src==='call'?'Call':o.src==='chat'?'Other':'',note:''})):[{client:'',contact:'',how:'',note:''}];
  v.title=btCut(String(o.name||'').trim()||o.what.split(/(?<=[.!?])\s/)[0],90); v.productArea=o.area;
  v.problem=[o.what,o.why].filter(Boolean).join(' '); v.successMeasure=o.outcome||'';
  const keys=[]; (o.links||[]).forEach(l=>{ const m=btFind(l.k+':'+l.id); if(!m||l.rel==='related') return; if(m.k==='a') keys.push(...(m.keys||[]).slice(0,15)); if(m.k==='m'&&m.key) keys.push(m.key); });
  v.related=[...new Set(keys)].slice(0,30); if(!v.related.length) v.related=[''];
  const same=(o.links||[]).find(l=>l.k==='a'&&l.rel==='same'); if(same){ const m=btFind('a:'+same.id); if(m) v.dupOf={id:m.id, name:m.title, keys:(m.keys||[]).slice(0,15)}; }
  v.source=o.src==='call'&&o.call&&o.call.url?{kind:'meeting', ref:o.call.url}:{kind:'intake-form', ref:''};
  v.evidence=['Shared with Beta ('+BT_SRC[o.src]+(o.call&&o.call.title?': “'+o.call.title+'”'+(o.call.date?', '+o.call.date:''):'')+').'].concat((o.quotes||[]).map(q=>'['+q.t+'] '+q.speaker+': '+q.text)).concat(v.related.filter(Boolean).length?['Linked tickets: '+v.related.filter(Boolean).join(', ')]:[]).join('\n');
  if(o.surfaces&&o.surfaces.length){ const map=[['admin',/admin/i],['web',/web|front/i],['app',/app|mobile/i],['api',/\bapi\b|integration/i],['reports',/report|stat|analytic/i]]; v.surfaces.on=map.filter(([k,re])=>o.surfaces.some(s=>re.test(s))).map(([k])=>k); }
  if(o.sales&&o.sales.id){ v.handoff={}; BT_VALUE_KEYS.forEach(k=>{ v.handoff[k]={to:o.sales.id}; }); }
  const cb=btCombined(o.clients,o.links||[]);
  v.beta={v:1, mode:o.mode, src:o.src, what:o.what, why:o.why, outcome:o.outcome, excerpt:o.excerpt||'', call:o.call||null, quotes:o.quotes||[], links:(o.links||[]).map(l=>({k:l.k, id:l.id, rel:l.rel, name:(btFind(l.k+':'+l.id)||{}).title||''})),
    decision:o.decision||'new', signal:{clients:cb.list.length, signal:cb.signal}, close:cb.close, questions:o.questions||[], question:o.question||'', answer:'', verdict:o.verdict||'', lever:o.lever||'', sales:o.sales?{id:o.sales.id}:null, test:!!BT.test};
  const ms=(o.matches||[]).slice(0,8);
  const {id, owedK, sg}=await feWriteNew(v,{via:'beta', test:!!BT.test,
    dup:at=>({query:btCut(btText(o),400), shown:ms.filter(m=>m.k==='a').map(m=>m.id), decision:same?'same':(o.links||[]).length?'linked':ms.length?'none':'no-match', choice:same?same.id:null, ai:null, at})});
  return {mode:'new', id, name:v.title, owed:owedK.length, signer:sg?sg.who:'', sales:o.sales?o.sales.id:'', question:o.question||'', signal:cb, close:cb.close};
}
function btShareDone(){
  const r=BT.s.result||{}; let head, body;
  if(r.mode==='join'){ head=r.had?'Your client was already asking for this':r.top?'This is one of the most asked needs':'Added to a need already asked for';
    body=r.had?`The new evidence was added to their voice on “${btE(r.name)}”. Its signal stays at ${r.after.s}.`:`“${btE(r.name)}”: ${btPl(r.before.c,'client')} ${r.before.c===1?'was':'were'} asking, and you made it ${r.after.c}. Its signal went from ${r.before.s} to ${r.after.s}.`; }
  else if(r.mode==='exists'){ head='Recorded as already built'; body=`“${btE(r.name)}” already exists. Tell the client how to use it. Their ask still counts as demand for it, so product sees how often it comes up.`; }
  else if(r.mode==='follow'){ head='Added to work already on its way'; body=`Your client now follows “${btE(r.name)}”. It shows on that item, and nothing new is logged.`; }
  else { head='Logged as '+btE(r.id); body=`“${btE(r.name)}” is on the Feature ledger at step 2. ${r.owed?btPl(r.owed,'detail')+' '+(r.owed===1?'is':'are')+' still owed before '+btE(r.signer||'the lever owner')+' signs; fill them in from the item.':'It now waits for '+btE(r.signer||'the lever owner')+' to sign the figure.'}`; }
  return `<div class="bt-done"><div class="bt-tick" aria-hidden="true"></div><h4>${head}</h4><p>${body}</p></div>
    ${r.mode==='join'&&!r.had?`<div class="bt-sigbar"><div><span class="small">Signal before</span><b>${r.before.s}</b></div><span class="bt-meter big"><i style="width:${Math.min(100,r.before.s/Math.max(r.after.s,1)*100)}%" class="lo"></i><i style="width:${Math.min(100,(r.after.s-r.before.s)/Math.max(r.after.s,1)*100)}%" class="hi"></i></span><div><span class="small">After</span><b>${r.after.s}</b></div></div>`:''}
    ${BT.test?'<div class="bt-note">Saved as test data. Only viewers with test mode on count it.</div>':''}
    ${r.question?`<div class="bt-sec"><h4>One question, if you know</h4><p>${btE(r.question)}</p><textarea class="bt-in" id="bt-ans" rows="2">${btE(BT.s.answer)}</textarea><div class="bt-acts"><button type="button" class="ibtn" data-btans${BT.s.answered?' disabled':''}>${BT.s.answered?'Added, thank you':'Add my answer'}</button></div></div>`:''}
    <div class="bt-acts">${r.id?`<button type="button" class="ibtn primary" data-btopenitem="${btE(r.id)}">Open ${btE(r.id)}</button>`:r.key?`<button type="button" class="ibtn primary" data-btcand="${btE(r.key)}">${r.mode==='exists'?'See what exists':r.mode==='join'?'Open the need':'Open it'}</button>`:''}<button type="button" class="ibtn" data-btnew>Share another</button></div>`;
}
async function btAnswer(){
  const S=BT.s, r=S.result||{}, a=String((btQ('#bt-ans')||{}).value||'').trim(); if(!a||S.answered) return; S.answer=a;
  try{ if(r.vid) await FE.db.doc('ledger-voices/'+r.vid).update({answer:a, answeredAt:feNow()});
    else if(r.id) await btItemUpdate(r.id,v=>{ v.beta=Object.assign({},v.beta,{answer:a}); },{k:'answer', fields:['question']});
    S.answered=true; btPaint(); uiToast('Answer added.'); }
  catch(e){ uiToast('The answer could not be saved just now. Try again.',{bad:true}); }
}

// ---------- Full review: 4 steps ----------
function btCombined(clients,links){
  const cus=new Map(); (clients||[]).map(btCu).filter(Boolean).forEach(c=>cus.set(c[0],[c[0],c[1],c[2],true]));
  const close=[]; (links||[]).forEach(l=>{ const m=btFind(l.k+':'+l.id); if(!m) return;
    if(m.k==='a'&&(l.rel==='same'||l.rel==='part')) m.cus.forEach(x=>{ if(![...cus.values()].some(y=>y[0]===x[0]||(x[2]&&y[2]===x[2]))) cus.set(x[0],[x[0],x[1],x[2],false]); });
    if(l.rel==='same'&&m.k==='a') close.push(...(m.keys||[])); });
  const list=[...cus.values()]; return {list, signal:btSig(list), close:[...new Set(close)]};
}
const btLinked=(k,id)=>BT.d.links.find(l=>l.k===k&&l.id===id);
const btRelOpts=k=>k==='a'?['same','part','related']:k==='b'?['extends','exists','related']:['follow','related'];
function btDropMatches(){ const D=BT.d, t=[D.what,D.why,D.outcome].join(' '), ms=btCands(t,D.clients,12);
  if(D.ai){ ms.forEach(m=>{ const a=D.ai.pcts[btKey(m)]; if(a){ m.ai=a.pct; m.why=a.why; } }); Object.entries(D.ai.pcts).forEach(([k,a])=>{ if(!ms.some(m=>btKey(m)===k)){ const m=btFind(k); if(m) ms.push(Object.assign(m,{pct:a.text||0, ai:a.pct, why:a.why})); } });
    ms.sort((a,b)=>(b.ai??b.pct)-(a.ai??a.pct)); }
  return ms.slice(0,12); }
function btStepMissing(s){ const D=BT.d;
  if(s===1){ if(!D.clients.length) return 'Choose at least one client, or Platform.'; if(D.what.trim().length<8) return 'Say what the client wants.'; return ''; }
  if(s===2){ if(!D.decision) return 'Choose what this is.'; if(D.decision==='builds'&&!D.links.some(l=>l.rel!=='exists')) return 'Link at least one match, or choose another option.';
    if(D.decision==='exists'&&!D.links.some(l=>l.rel==='exists')) return 'Mark the built feature with “Already exists”, or choose another option.'; return ''; }
  if(s===3){ if(D.decision==='exists') return ''; if(D.draft.what.trim().length<8) return 'Fill in what the client wants.'; if(D.draft.why.trim().length<8) return 'Fill in why they need it.'; return ''; }
  if(s===4){ if(D.decision!=='exists'&&!D.area) return 'Choose the product area.'; } return ''; }
function btDropBody(){
  const D=BT.d; if(D.step==='done') return btDropDone(); const s=D.step;
  return `<ol class="bt-prog" aria-label="Progress">${BT_STEPS.map(([k,l],i)=>`<li class="${i+1<s?'done':i+1===s?'now':''}"><button type="button" data-btstep="${i+1}"${i+1<s?'':' disabled'} aria-current="${i+1===s?'step':'false'}"><i>${i+1}</i><span>${l}</span></button></li>`).join('')}</ol>
    <div id="bd-body">${s===1?btStep1():s===2?btStep2():s===3?btStep3():btStep4()}</div>`; }
function btStep1(){ const D=BT.d;
  return `<p class="bt-lead">Tell us what the client wants, in a few lines. Next you see who else asked for it and what already exists.</p>
    <div class="bt-f"><label for="drc-in">Clients <span class="req">at least one</span></label><span class="bt-h">Type a name and pick it. Add every client this is for.</span>${btPicker('drc',D.clients)}</div>
    <div class="bt-f"><label for="bd-what">What do they want? <span class="req">required</span></label><span class="bt-h">One or two lines, in the client’s words.</span><textarea class="bt-in" id="bd-what" rows="4" placeholder="Exhibitors want to sort marketplace listings by newest and most viewed">${btE(D.what)}</textarea><div class="bt-acts"><button type="button" class="ibtn" data-btspeak="bd-what">Speak instead</button></div><div class="bt-speak" id="speak-bd-what" hidden></div></div>
    <div class="bt-f"><label for="bd-why">Why do they need it?</label><span class="bt-h">What goes wrong today without it. You can add this later.</span><textarea class="bt-in" id="bd-why" rows="3">${btE(D.why)}</textarea></div>
    <div class="bt-f"><label for="bd-outcome">What changes when it exists?</label><textarea class="bt-in" id="bd-outcome" rows="2">${btE(D.outcome)}</textarea></div>
    <div class="bt-f"><label for="bt-url">Call recording <span class="opt">optional</span></label><span class="bt-h">Paste the Fathom link from your call with the client. The draft can then quote their own words, with a link to the exact moment.</span>
      <div class="bt-row"><input class="bt-in" id="bt-url" type="url" placeholder="https://fathom.video/share/…" value="${btE(BT.fa.url)}"><button type="button" class="ibtn" data-btfetch>Read the call</button></div><div id="bt-fbox"></div></div>
    <div id="bd-teaser"></div>`; }
function btPaintTeaser(){ const t=btQ('#bd-teaser'), D=BT.d; if(!t) return; if((D.what+D.why).trim().length<8){ t.innerHTML=''; return; }
  const ms=btCands([D.what,D.why,D.outcome].join(' '),D.clients,12), strong=ms.filter(m=>m.pct>=60);
  t.innerHTML=`<div class="bt-teaser">${ms.length?`<b>${btPl(ms.length,'possible match','possible matches')}</b>${strong.length?', '+strong.length+' of them close':''}. You check them in the next step.`:DM.data?'No close match so far. It may be new.':'Loading the demand map…'}</div>`; }
function btStep2(){ return `<p class="bt-lead">Checked against every need asked for, what is already built, the Must-have ledger and the work items on this ledger. Link anything that fits, then say what this is.</p>
    <div id="bd-head"></div><div class="bt-sec"><h4>Matches <span class="small" id="bd-mcount"></span></h4><div id="bd-matches"></div></div><div class="bt-sec" id="bd-linked"></div><div class="bt-sec" id="bd-decide">${btDecideInner()}</div>`; }
function btDecideInner(){ const D=BT.d, sug=D.links.some(l=>l.rel==='exists')?'exists':D.links.length?'builds':'new';
  return `<h4>So, this is…</h4><div class="bt-dcards">${Object.entries(BT_DECIDE).map(([k,l])=>`<button type="button" class="bt-dcard" data-btdecide="${k}" aria-pressed="${D.decision===k}"><b>${l}</b><span>${{new:'Nothing above covers it. It starts its own item.', builds:'It joins or extends what you linked, and their clients add to its signal.', exists:'The client can already do this. Nothing new is logged: you tell the client, and it still counts as demand.'}[k]}</span>${sug===k&&D.decision!==k?'<em>Suggested</em>':''}</button>`).join('')}</div>`; }
function btActions(m){ const l=btLinked(m.k,m.id), key=btKey(m), pct=m.ai??m.pct;
  if(l) return `<span class="bt-state ok">Linked: ${btE(BT_REL[l.rel])}</span><button type="button" class="linkbtn" data-btunlink="${btE(key)}">Remove</button>`;
  if(m.k==='a') return `<button type="button" class="ibtn primary" data-btlink="${btE(key)}|${pct>=85?'same':'part'}">Add to my request</button>`;
  if(m.k==='b') return `<button type="button" class="ibtn" data-btlink="${btE(key)}|extends">Extend this feature</button><button type="button" class="ibtn" data-btlink="${btE(key)}|exists">Already exists</button>`;
  return `<button type="button" class="ibtn" data-btlink="${btE(key)}|follow">Follow it</button>`; }
function btPaintMatches(){ const box=btQ('#bd-matches'), D=BT.d; if(!box) return; const head=btQ('#bd-head'), mc=btQ('#bd-mcount');
  if((D.what+D.why+D.outcome).trim().length<8){ box.innerHTML='<div class="small">Describe what they want to see matches.</div>'; if(head) head.innerHTML=''; if(mc) mc.textContent=''; return; }
  if(!DM.data){ box.innerHTML='<div class="small">Loading the demand map…</div>'; return; }
  const ms=btDropMatches(); if(mc) mc.textContent=ms.length?btPl(ms.length,'match','matches'):'';
  const best=ms[0];
  if(head) head.innerHTML=best&&(best.ai??best.pct)>=50?`<div class="bt-mhead"><div>${btE(btMatchMsg(Object.assign({},best,{pct:best.ai??best.pct}),D.clients))}</div><div class="small">${btKindChip(best)} ${best.ai!=null?'Claude’s match':'Text match'}</div></div>`:`<div class="bt-mhead"><div>This looks new: nothing close among the needs asked for, what is built, or what is on its way.</div></div>`;
  box.innerHTML=ms.length?ms.map(m=>`<div class="bt-mrow">${btPct(m.ai??m.pct)}<div class="bt-mm">${btCandTitle(m)}<div class="small">${btKindChip(m)} ${btE(m.pa||'')}${m.cus.length?' · '+btE(m.cus.slice(0,3).map(x=>x[0]).join(', '))+(m.cus.length>3?' +'+(m.cus.length-3):''):''}${m.mine?' · <b>your client</b>':''}</div>${m.why?`<div class="small bt-why">${btE(m.why)}</div>`:''}<div class="bt-macts">${btActions(m)}</div></div></div>`).join(''):'<div class="small">No close match yet. Add a little more detail, or log it as new.</div>'; }
function btPaintLinked(){ const w=btQ('#bd-linked'), D=BT.d; if(!w) return; if(!D.links.length){ w.innerHTML=''; return; }
  const cb=btCombined(D.clients,D.links);
  w.innerHTML=`<h4>Linked <span class="small">${D.links.length}</span></h4>${D.links.some(l=>l.rel==='exists')?'<div class="bt-note">You marked a match as already built. Choose “It’s already built” below to record it without a new item.</div>':''}
    ${D.links.map(l=>{ const m=btFind(l.k+':'+l.id); if(!m) return ''; const key=btKey(m); return `<div class="bt-lrow"><span class="bt-mm">${btCandTitle(m)} ${btKindChip(m)}</span><span class="bt-lact"><select class="bt-in bt-rel" data-btrel="${btE(key)}" aria-label="How it relates">${btRelOpts(m.k).map(r=>`<option value="${r}"${l.rel===r?' selected':''}>${BT_REL[r]}</option>`).join('')}</select><button type="button" class="linkbtn" data-btunlink="${btE(key)}">Remove</button></span></div>`; }).join('')}
    <div class="bt-stats"><div><b>${cb.list.length}</b><span>clients behind it</span><span class="small">${btE(cb.list.slice(0,4).map(x=>x[0]).join(', '))}${cb.list.length>4?' and '+(cb.list.length-4)+' more':''}</span></div><div><b>${cb.signal}</b><span>combined signal</span><span class="small">each client once at its tier weight</span></div></div>
    ${cb.close.length?`<div class="small">When this ships, ${btPl(cb.close.length,'ticket')} can close: ${btE(cb.close.slice(0,10).join(', '))}${cb.close.length>10?' …':''}</div>`:''}`; }
function btStep3(){ const D=BT.d; if(D.decision==='exists') return '<p class="bt-lead">Nothing to draft: you marked this as already built. Continue to record it and see what to tell the client.</p>';
  return `<p class="bt-lead">Check the words that go on the item. Let Claude draft it from your text${BT.fa.state==='ready'?', the call':''} and the matches, then keep, edit or ignore each suggestion.</p>
    <div class="bt-f"><label for="bd-dwhat">What <span class="req">required</span></label><textarea class="bt-in" id="bd-dwhat" rows="3">${btE(D.draft.what)}</textarea><div class="bt-sugg" id="bg-what"></div></div>
    <div class="bt-f"><label for="bd-dwhy">Why <span class="req">required</span></label><textarea class="bt-in" id="bd-dwhy" rows="3">${btE(D.draft.why)}</textarea><div class="bt-sugg" id="bg-why"></div></div>
    <div class="bt-f"><label for="bd-dout">Outcome</label><textarea class="bt-in" id="bd-dout" rows="2">${btE(D.draft.outcome)}</textarea><div class="bt-sugg" id="bg-outcome"></div></div>
    <div id="bd-ai"></div>`; }
function btPaintSugg(){ const a=BT.d.ai;
  ['what','why','outcome'].forEach(k=>{ const el=btQ('#bg-'+k); if(!el) return; const f=a&&a.draft[k];
    if(!f||!f.text||BT.d.draft[k].trim()===f.text.trim()){ el.innerHTML=f&&f.text?'<span class="small">Using Claude’s suggestion.</span> '+btCites(f.cites):''; return; }
    const gs=(f.cites||[]).includes('guess'); el.innerHTML=`<div class="bt-sg${gs?' guess':''}"><span class="small">${gs?'Claude’s guess from similar requests':'Claude suggests'}</span><p>${btE(f.text)}</p><div>${btCites(f.cites)}</div><button type="button" class="ibtn" data-btaccept="${k}">Use this</button></div>`; }); }
function btPaintAi(){ const w=btQ('#bd-ai'), D=BT.d; if(!w) return;
  if(BT.sample===null){ w.innerHTML='<div class="bt-ai"><div class="small">Claude is not available in this view. Edit the fields above in your own words.</div></div>'; return; }
  let inner='';
  if(D.busy) inner=`<b>${D.progress?'Writing the draft…':'Thinking…'}</b><div class="small">${D.progress?'Almost there.':'Up to a minute. It runs on your own Claude account; the first time, claude.ai asks you to allow it.'}</div><button type="button" class="ibtn" data-btstop>Stop</button>`;
  else if(D.err) inner=`<div class="bt-note bad">${btE(D.err)}</div>`;
  else if(D.ai) inner=btAiResult(D.ai);
  w.innerHTML=`<div class="bt-ai"><div class="bt-aih"><div><b>Claude’s draft</b><div class="small">Suggestions appear under each field, with their sources. Nothing changes until you choose “Use this”.</div></div><button type="button" class="ibtn${D.ai?'':' primary'}" data-btai${D.busy?' disabled':''}>${D.ai?'Draft again':'Draft with Claude'}</button></div>${inner?'<div class="bt-air">'+inner+'</div>':''}</div>`; }
function btAiResult(r){ const VL={duplicate:'Claude thinks this was already asked for', extends:'Claude thinks this extends something that exists or was asked for', new:'Claude thinks this is new'};
  return `<b>${btE(VL[r.verdict]||VL.new)}</b>
    ${r.questions.length?`<div class="bt-qs"><div class="bt-sl">A few questions to make it clearer</div><div class="small">Answers go with the item to product and sales. Skip any you cannot answer.</div>${r.questions.map((q,i)=>`<div class="bt-f"><label for="bd-ans-${i}">${btE(q)}</label><textarea class="bt-in" id="bd-ans-${i}" data-btans2="${i}" rows="2">${btE(BT.d.answers[i]||'')}</textarea></div>`).join('')}</div>`:''}
    ${r.draft.surfaces&&r.draft.surfaces.list.length?`<div class="bt-sl">Parts of the platform touched</div><div class="bt-chips">${r.draft.surfaces.list.map(s=>`<span class="bt-chip">${btE(s)}</span>`).join('')}</div><div>${btCites(r.draft.surfaces.cites)}</div>`:''}
    ${r.lever?`<div class="small">Suggested lever for sales to confirm: <b>${btE(r.lever)}</b>. No figure is entered.</div>`:''}`; }
let btAbort=null;
async function btRunAi(){ const D=BT.d; if(D.busy) return; if(BT.sample===undefined) BT.sample=await btUse('sample'); if(!BT.sample){ btPaintAi(); return; }
  if((D.draft.what||D.what).trim().length<8){ D.err='Write at least a line about what the client wants first.'; btPaintAi(); return; }
  const ms=btCands([D.draft.what||D.what,D.draft.why||D.why,D.draft.outcome||D.outcome].join(' '),D.clients,12);
  D.links.forEach(l=>{ const m=btFind(l.k+':'+l.id); if(m&&!ms.some(x=>btKey(x)===btKey(m))) ms.push(Object.assign(m,{pct:0})); });
  const cmap={}, cands=ms.map((m,i)=>{ const cid='c'+(i+1); cmap[cid]=m; return {id:cid, kind:{a:'need asked for by clients', b:'built and delivered', m:'must-have item being built', l:'work item already on the ledger'}[m.k],
    title:m.k==='b'&&m.sub?m.sub+': '+m.title:m.title, detail:String(m.body||'').slice(0,360), product:m.pa||'', customers:m.cus.map(x=>x[0]+(x[1]?' (T'+x[1]+')':'')).slice(0,6), text_match:m.pct}; });
  const call=BT.fa.state==='ready'?btCallLines():'', cl=D.clients.map(btCo).filter(Boolean);
  const prompt=`You help product and business at ExpoPlatform (an event technology platform) write up a piece of work for the ledger. Use only the evidence given here.

Rules:
- For every candidate, give a match percentage (0 to 100) for how closely it covers what is asked for, and one short reason. Built candidates count as matches when they already deliver what is asked.
- Draft what, why and outcome. Each field has "cites": "tam" for the user's own words, candidate ids such as "c3"${call?', or call transcript line ids such as "s12"':''}.
- If nothing supports why or outcome, you may write a short best guess based on the candidates and cite ["guess"]. Never guess what.
- Never invent customers, dates or money. Do not produce any value figure.
- In questions and reasons, refer to candidates by their title, never by id (never write c1, c2 or s12 in prose).
- verdict: "duplicate" if a need or work item candidate is the same thing, "extends" if a candidate covers part of it or it builds on something built, otherwise "new".
- questions: at most 3, only for real gaps (for example which parts of the platform: admin panel, web front end, mobile app, API, reports).
- lever: optionally one of "increase revenue", "retain revenue", "reduce cost", "avoid cost", only if the evidence implies it; otherwise empty.

The request:
clients: ${cl.map(c=>c.short+(c.tier?' (tier '+c.tier+')':'')).join('; ')||'(none chosen)'}
what: ${D.draft.what||D.what}
why: ${D.draft.why||D.why||'(not given)'}
outcome: ${D.draft.outcome||D.outcome||'(not given)'}${D.ai&&D.ai.questions.some((q,i)=>D.answers[i])?'\nanswers to earlier questions:\n'+D.ai.questions.map((q,i)=>D.answers[i]?'- '+q+' '+D.answers[i]:'').filter(Boolean).join('\n'):''}

Candidates (JSON):
${JSON.stringify(cands)}
${call?'\nCall transcript (each line starts with its id):\n'+call+'\n':''}
JSON shape: {"matches":[{"id":"c1","pct":0,"why":""}],"verdict":"duplicate|extends|new","draft":{"what":{"text":"","cites":[]},"why":{"text":"","cites":[]},"outcome":{"text":"","cites":[]},"surfaces":{"list":[],"cites":[]}},"questions":[],"lever":""}`;
  D.busy=true; D.err=''; D.progress=0; btPaintAi(); btAbort=new AbortController();
  try{ const r=await btAI('Draft for the ledger',prompt,{signal:btAbort.signal, fresh:!!D.ai, onText:({text})=>{ D.progress=text.length; if(D.progress%40<8) btPaintAi(); }});
    D.ai=btCleanAi(r.data,cmap); btLog('Draft for the ledger',prompt,r.text,D.ai,['what','why','outcome'].filter(k=>r.data&&r.data.draft&&r.data.draft[k]&&r.data.draft[k].text&&!D.ai.draft[k].text)); }
  catch(e){ D.err=btAiMsg(e); }
  finally{ D.busy=false; btAbort=null; btPaintSugg(); btPaintAi(); } }
function btCleanAi(r,cmap){
  const toKey=id=>id==='tam'||id==='guess'?id:cmap[id]?btKey(cmap[id]):btSeg(id)?id:null, cites=cs=>[...new Set((Array.isArray(cs)?cs:[]).map(toKey).filter(Boolean))];
  const nameOf=id=>{ const cm=cmap[id]; if(cm) return '“'+btCut((cm.k==='b'&&cm.sub)||cm.title,60)+'”'; const sg=btSeg(id); return sg?'the call at '+sg.t:id; };
  const unId=t=>String(t||'').replace(/\(?\b[cs]\d+(?:\s*(?:,|and)\s*[cs]\d+)*\b\)?/g,m=>{ const ids=m.match(/[cs]\d+/g)||[]; const ns=ids.map(nameOf).filter(n=>!/^[cs]\d+$/.test(n)); return ns.length?(m.startsWith('(')?'('+ns.join(', ')+')':ns.join(', ')):''; }).replace(/\s+([,.?)])/g,'$1').replace(/\(\s*\)/g,'').trim();
  const f=x=>{ const c=cites(x&&x.cites), t=unId((x&&x.text)||''); return c.length&&t&&!btPh(t)?{text:t, cites:c}:{text:'', cites:[]}; };
  const d=(r&&r.draft)||{}, surf=d.surfaces||{}, sc=cites(surf.cites), pcts={};
  ((r&&r.matches)||[]).forEach(m=>{ const cm=m&&cmap[m.id], p=Math.round(+m.pct); if(cm&&p>=0&&p<=100) pcts[btKey(cm)]={pct:p, why:unId(m.why).slice(0,200), text:cm.pct}; });
  return {pcts, verdict:['duplicate','extends','new'].includes(r&&r.verdict)?r.verdict:'new',
    draft:{what:f(d.what), why:f(d.why), outcome:f(d.outcome), surfaces:sc.length||(surf.list||[]).length?{list:(surf.list||[]).map(String).slice(0,6), cites:sc}:null},
    questions:((r&&r.questions)||[]).map(unId).filter(Boolean).slice(0,3),
    lever:['increase revenue','retain revenue','reduce cost','avoid cost'].includes(String((r&&r.lever)||'').toLowerCase())?String(r.lever).toLowerCase():''}; }
function btStep4(){ const D=BT.d, cls=D.clients.map(btCo).filter(Boolean), cb=btCombined(D.clients,D.links), ex=D.decision==='exists', areas=feAreas();
  const moments=BT.fa.state==='ready'&&D.ai?[...new Set(['what','why','outcome'].flatMap(f=>(D.ai.draft[f]&&D.ai.draft[f].cites)||[]).filter(x=>/^s\d+$/.test(x)))]:[];
  const linked=D.links.map(l=>{ const m=btFind(l.k+':'+l.id); return m?`<li>${btCandTitle(m)} ${btKindChip(m)} <span class="small">${btE(BT_REL[l.rel])}</span></li>`:''; }).join('');
  return `<p class="bt-lead">${ex?'Check the record below. Nothing new goes on the ledger; the demand is kept against what already exists.':'Check the item, choose who adds the value, and log it.'}</p>
    <div class="bt-sum"><div class="bt-sumh">${cls.map(c=>btTierPill(c.tier)+' <b>'+btE(c.short)+'</b>').join(' ')} <span class="bt-kc">${btE(BT_DECIDE[D.decision]||'')}</span></div>
      ${ex?`<p>${btE(D.what)}</p>`:`<dl class="sx-kv"><dt>What</dt><dd>${btE(D.draft.what)}</dd><dt>Why</dt><dd>${btE(D.draft.why)}</dd>${D.draft.outcome?`<dt>Outcome</dt><dd>${btE(D.draft.outcome)}</dd>`:''}</dl>`}
      ${linked?`<div class="bt-sl">Linked</div><ul class="bt-lk">${linked}</ul>`:''}
      ${!ex?`<div class="bt-stats"><div><b>${cb.list.length}</b><span>clients behind it</span><span class="small">${btE(cb.list.slice(0,3).map(x=>x[0]).join(', '))}${cb.list.length>3?' +'+(cb.list.length-3):''}</span></div><div><b>${cb.signal}</b><span>signal</span><span class="small">each client once at its tier weight</span></div></div>`:''}
      ${moments.length?`<div class="bt-sl">Evidence from the call</div>${moments.map(id=>{ const sg=btSeg(id); return sg?btQuoteHtml(sg):''; }).join('')}`:''}
      ${Object.values(D.answers).some(Boolean)?`<div class="bt-sl">Your answers</div>${(D.ai?D.ai.questions:[]).map((q,i)=>D.answers[i]?`<p class="small"><b>${btE(q)}</b><br>${btE(D.answers[i])}</p>`:'').join('')}`:''}
      ${cb.close.length&&!ex?`<div class="small">When it ships, ${btPl(cb.close.length,'ticket')} can close: ${btE(cb.close.slice(0,8).join(', '))}${cb.close.length>8?' …':''}</div>`:''}</div>
    <div id="bd-tidy"></div>
    ${ex?'':`<div class="bt-f"><label for="bd-area">Product area <span class="req">required</span></label><select class="bt-in" id="bd-area"><option value="">Choose…</option>${areas.map(([k,l])=>`<option value="${btE(k)}"${D.area===k?' selected':''}>${btE(l)}</option>`).join('')}</select></div>
      <div class="bt-f"><label for="bd-name">Name <span class="opt">optional</span></label><input class="bt-in" id="bd-name" maxlength="90" value="${btE(D.name)}" placeholder="Claude names it when it tidies the wording"></div>
      <div class="bt-f" id="bd-sales"><label for="bd-sq">Who adds the value?</label><span class="bt-h">The sales colleague who enters the lever, the £ figure and the funding. The value details are handed to them and the item waits on them. Optional: leave it empty and they stay with you.</span>
      ${D.sales?`<div class="bt-picked"><b>${btE(feName(D.sales.id))}</b><button type="button" class="linkbtn" data-btsalesx>Change</button></div>`:`<input class="bt-in" id="bd-sq" type="search" autocomplete="off" placeholder="Search for a colleague"><div id="bd-sres"></div>`}</div>`}`; }
function btPaintDTidy(){ const w=btQ('#bd-tidy'), D=BT.d; if(!w) return;
  if(D.tidyBusy){ w.innerHTML='<div class="bt-ai"><b>Tidying the wording…</b><div class="small">Spelling and clarity only. Nothing new is added.</div></div>'; return; }
  const t=D.tidy; if(!t){ w.innerHTML=''; return; } const ch=['what','why','outcome'].filter(k=>t[k]&&t[k].trim()&&t[k].trim()!==D.draft[k].trim());
  w.innerHTML=ch.length?`<div class="bt-ai"><b>We tidied the wording</b><div class="small">Pick the version to keep for each field, then log it.</div>${ch.map(k=>{ const ai=D.tidyChoice[k]!=='mine'; return `<div class="bt-sl">${{what:'What',why:'Why',outcome:'Outcome'}[k]}</div><button type="button" class="bt-tc${ai?' on':''}" data-btdtidy="${k}|ai"><span class="small">Tidied</span>${btE(t[k])}</button><button type="button" class="bt-tc${!ai?' on':''}" data-btdtidy="${k}|mine"><span class="small">Your words</span>${btE(D.draft[k])}</button>`; }).join('')}</div>`:''; }
async function btSalesSearch(q){ const box=btQ('#bd-sres'); if(!box) return; const u=feMe().user; let hits=[];
  if(u&&u.search){ try{ hits=await u.search(q)||[]; }catch(e){} }
  box.innerHTML=hits.slice(0,6).map(h=>{ if(h.id&&h.name) FE.names[h.id]=h.name; return `<button type="button" class="bt-cpo" data-btsales="${btE(h.id)}">${btE(h.name||'Someone')}</button>`; }).join('')||(q.trim()?'<div class="small">Nobody by that name. The page can only hand details to colleagues in the organisation.</div>':''); }
function btGoStep(n){ const D=BT.d; if(n===3&&D.decision!=='exists') ['what','why','outcome'].forEach(k=>{ if(!D.draft[k]) D.draft[k]=D[k]; });
  if(n===4&&!D.area){ const ls=D.links.map(l=>btFind(l.k+':'+l.id)).filter(Boolean); D.area=btAreaGuess(ls.concat(btDropMatches())); } D.step=n; btPaint(); const b=btQ('.bt-body'); if(b) b.scrollTop=0; }
async function btDropNext(){ const D=BT.d, s=D.step; if(btStepMissing(s)) return;
  if(s<4){ btGoStep(s+1); return; }
  if(D.decision!=='exists'&&BT.sample&&!D.tidyDone){ D.tidyBusy=true; btPaintDTidy(); btPaintFoot();
    const same=D.links.find(l=>l.k==='a'&&(l.rel==='same'||l.rel==='part'));
    D.tidy=await btTidy({what:D.draft.what, why:D.draft.why, outcome:D.draft.outcome}, same?btFind('a:'+same.id):null); D.tidyBusy=false; D.tidyDone=true;
    if(D.tidy&&D.tidy.failed) D.tidy=null;
    if(D.tidy&&['what','why','outcome'].some(k=>D.tidy[k]&&D.tidy[k]!==D.draft[k].trim())){ btPaintDTidy(); btPaintFoot(); const w=btQ('#bd-tidy'); if(w) w.scrollIntoView({block:'center'}); return; } }
  if(D.tidy) ['what','why','outcome'].forEach(k=>{ if(D.tidy[k]&&D.tidyChoice[k]!=='mine'&&D.draft[k]) D.draft[k]=D.tidy[k]; });
  const call=BT.fa.state==='ready', quotes=call&&D.ai?btQuotes(['what','why','outcome'].flatMap(k=>(D.ai.draft[k]&&D.ai.draft[k].cites)||[])):[];
  const base={clients:D.clients.slice(), src:call?'call':'type', what:D.decision==='exists'?D.what:D.draft.what, why:D.draft.why||D.why, outcome:D.draft.outcome||D.outcome, excerpt:'',
    call:call?{title:BT.fa.title, date:BT.fa.date, url:BT.fa.callUrl||BT.fa.url}:null, quotes, question:D.tidy?D.tidy.question:''};
  D.saving=true; btPaintFoot();
  try{
    if(D.decision==='exists'){ const l=D.links.find(x=>x.rel==='exists'), m=l&&btFind(l.k+':'+l.id); D.result=await btSaveVoice('exists',m,base); }
    else D.result=await btSaveItem(Object.assign({mode:'review', name:D.name||(D.tidy&&D.tidy.title)||'', area:D.area, links:D.links, decision:D.decision, matches:btDropMatches(), sales:D.sales,
      questions:D.ai?D.ai.questions.map((q,i)=>({q, a:D.answers[i]||''})):[], verdict:D.ai?D.ai.verdict:'', lever:D.ai?D.ai.lever:'', surfaces:D.ai&&D.ai.draft.surfaces?D.ai.draft.surfaces.list:[]},base));
    D.step='done'; }
  catch(e){ uiToast(e&&e.code==='invalid_argument'?'Not saved: your access to this page is read-only.':e&&e.code==='busy'?e.message:'It could not be saved just now ('+((e&&e.code)||'error')+'). Try again.',{bad:true}); }
  D.saving=false; btPaint(); }
function btDropDone(){ const r=BT.d.result||{}, ex=r.mode==='exists';
  return `<div class="bt-done"><div class="bt-tick" aria-hidden="true"></div><h4>${ex?'Recorded as already built':'Logged as '+btE(r.id)}</h4><p>${btE(ex?r.name:r.name)}</p></div>
    ${BT.test?'<div class="bt-note">Saved as test data. Only viewers with test mode on count it.</div>':''}
    <div class="bt-sec"><h4>What happens next</h4><ol class="bt-next">${ex?`<li>Tell the client how to use what already exists: <b>${btE(r.name)}</b>.</li><li>The request is kept as demand against it, so product sees how often it is asked for.</li>`
      :`<li>It is on the Feature ledger at step 2 of 10.</li><li>${r.sales?`<b>${btE(feName(r.sales))}</b> is asked`:'You are asked'} to add the lever, the £ figure and the funding. Then <b>${btE(r.signer||'the lever owner')}</b> signs the figure.</li><li>It is reviewed, estimated and approved onto the ranked ledger; only the product-business meeting picks it up.</li>${r.close&&r.close.length?`<li>When it ships, ${btPl(r.close.length,'linked ticket')} can close from the item.</li>`:''}`}</ol></div>
    <div class="bt-acts">${r.id?`<button type="button" class="ibtn primary" data-btopenitem="${btE(r.id)}">Open ${btE(r.id)}</button>`:r.key?`<button type="button" class="ibtn primary" data-btcand="${btE(r.key)}">See what exists</button>`:''}<button type="button" class="ibtn" data-btnew>Log another</button></div>`; }

// ---------- events ----------
let btT=0; const btSoon=(fn,ms)=>{ clearTimeout(btT); btT=setTimeout(fn,ms||180); };
function btInput(e){ const t=e.target, id=t.id, S=BT.s, D=BT.d;
  if(t.dataset.btcpin){ btCpList(t.dataset.btcpin); return; }
  if(id==='bt-raw'){ S.raw=t.value; S.fillErr=''; clearTimeout(BT.fillT); BT.fillT=setTimeout(()=>btFill(true),1800); return; }
  if(id==='bt-url'){ S.url=t.value; BT.fa.url=t.value; return; }
  if(id==='bt-name'){ S.name=t.value; return; }
  if(['bt-what','bt-why','bt-outcome'].includes(id)){ const k=id.slice(3); S[k]=t.value; S.auto[k]=false; S.tidy=null; S.tidyDone=false; btPaintTidy(); btPaintFoot(); btSoon(()=>{ btPaintMatch(); btPaintCall(); }); return; }
  if(['bd-what','bd-why','bd-outcome'].includes(id)){ D[id.slice(3)]=t.value; btPaintFoot(); btSoon(()=>{ btPaintTeaser(); btPaintCall(); }); return; }
  if(['bd-dwhat','bd-dwhy','bd-dout'].includes(id)){ const k={'bd-dwhat':'what','bd-dwhy':'why','bd-dout':'outcome'}[id]; D.draft[k]=t.value; D.tidy=null; D.tidyDone=false; btPaintFoot(); btSoon(()=>btPaintSugg()); return; }
  if(t.dataset.btans2!=null){ D.answers[+t.dataset.btans2]=t.value; return; }
  if(id==='bd-name'){ D.name=t.value; return; }
  if(id==='bd-sq'){ btSoon(()=>btSalesSearch(t.value),200); return; } }
function btChange(e){ const t=e.target, id=t.id;
  if(id==='bt-test'){ btSetTest(t.checked); return; }
  if(id==='bt-area'){ BT.s.area=t.value; btPaintFoot(); return; }
  if(id==='bd-area'){ BT.d.area=t.value; btPaintFoot(); return; }
  if(t.dataset.btrel){ const l=BT.d.links.find(x=>x.k+':'+x.id===t.dataset.btrel); if(l){ l.rel=t.value; btPaintLinked(); const dd=btQ('#bd-decide'); if(dd) dd.innerHTML=btDecideInner(); btPaintFoot(); } } }
function btPasteEv(e){ if(e.target&&e.target.id==='bt-raw') setTimeout(()=>{ BT.s.raw=e.target.value; clearTimeout(BT.fillT); btFill(false); },50); }
function btClick(e){ const t=e.target, S=BT.s, D=BT.d; let b;
  if(t.closest('[data-btclose]')){ btClose(); return; }
  if(!t.closest('[data-cp]')) BT.el.querySelectorAll('.bt-cpl').forEach(l=>l.hidden=true);
  if((b=t.closest('[data-btcpin]'))){ btCpList(b.dataset.btcpin); return; }
  if((b=t.closest('[data-btcpadd]'))){ const [id,pd]=b.dataset.btcpadd.split('|'); btCpSet(id,btCpState(id).clients.concat(pd)); if(id==='drc'){ btPaintTeaser(); } return; }
  if((b=t.closest('[data-btcpx]'))){ const [id,pd]=b.dataset.btcpx.split('|'); btCpSet(id,btCpState(id).clients.filter(x=>x!==pd)); return; }
  if((b=t.closest('[data-btmode]'))){ const m=b.dataset.btmode; if(m===BT.mode) return;
    if(m==='drop'&&D.step===1&&!D.what&&S.stage!=='done'){ Object.assign(D,{clients:S.clients.slice(), what:S.what, why:S.why, outcome:S.outcome, area:S.area, name:S.name}); if(S.pick){ const k=S.pick.split(':')[0]; D.links=[{k, id:S.pick.slice(2), rel:k==='a'?'same':k==='b'?'exists':'follow'}]; D.decision=k==='b'?'exists':'builds'; } }
    if(m==='share'&&S.stage!=='done'&&!S.what&&D.step!=='done'){ Object.assign(S,{clients:D.clients.slice(), what:D.draft.what||D.what, why:D.draft.why||D.why, outcome:D.draft.outcome||D.outcome, area:D.area, name:D.name}); }
    BT.mode=m; btPaint(); return; }
  if(t.closest('[data-btfull]')){ Object.assign(D,{step:1, clients:S.clients.slice(), what:S.what, why:S.why, outcome:S.outcome, area:S.area, name:S.name}); if(S.pick){ const k=S.pick.split(':')[0]; D.links=[{k, id:S.pick.slice(2), rel:k==='a'?'same':k==='b'?'exists':'follow'}]; D.decision=k==='b'?'exists':'builds'; } BT.mode='drop'; btPaint(); return; }
  if(t.closest('[data-btold]')){ const pre={_old:true}; const c=(BT.mode==='share'?S.clients:D.clients).find(x=>x!=='Platform'); if(c) pre.client=c; btClose(); feOpenForm(pre); return; }
  if((b=t.closest('[data-btcand]'))){ btOpenCand(b.dataset.btcand); return; }
  if((b=t.closest('[data-btopenitem]'))){ const id=b.dataset.btopenitem; btClose(); if(FE.rows.some(x=>x._id===id)) feOpenEntry(id); else FE.pendingOpen=id; return; }
  if(t.closest('[data-btnew]')){ if(BT.mode==='share') btResetShare(); else btResetDrop(); btResetCall(); btPaint(); return; }
  if((b=t.closest('[data-btspeak]'))){ btSpeak(b.dataset.btspeak); return; }
  if(t.closest('[data-btfetch]')){ btFetchCall(); return; }
  // quick share
  if((b=t.closest('[data-btsrc]'))){ S.src=b.dataset.btsrc; const w=btQ('#bt-src'); if(w) w.innerHTML=btShareSrc(); btPaintCall(); btPaintFoot(); return; }
  if(t.closest('[data-btfill]')){ btFill(false); return; }
  if((b=t.closest('[data-btuse]'))){ const k=b.dataset.btuse, sg=S.sugg[k]; if(sg){ S[k]=sg.text; S.auto[k]=true; S.cites[k]=sg.cites; delete S.sugg[k]; S.tidy=null; S.tidyDone=false; btRepaintShare(); } return; }
  if((b=t.closest('[data-btpick]'))){ const v=b.dataset.btpick; if(v==='none'){ S.pick=null; S.none=true; } else { S.pick=v||null; S.none=false; } S.tidy=null; S.tidyDone=false; btPaintMatch(); btPaintTidy(); return; }
  if((b=t.closest('[data-bttidy]'))){ const [k,c]=b.dataset.bttidy.split('|'); S.tidyChoice[k]=c; btPaintTidy(); return; }
  if(t.closest('[data-btgo]')){ btShareGo(); return; }
  if(t.closest('[data-btans]')){ btAnswer(); return; }
  // full review
  if((b=t.closest('[data-btstep]'))){ btGoStep(+b.dataset.btstep); return; }
  if((b=t.closest('[data-btnav]'))){ if(b.dataset.btnav==='back') btGoStep(Math.max(1,D.step-1)); else btDropNext(); return; }
  if((b=t.closest('[data-btlink]'))){ const [key,rel]=b.dataset.btlink.split('|'), i=key.indexOf(':'); const k=key.slice(0,i), id=key.slice(i+1); if(!btLinked(k,id)) D.links.push({k,id,rel});
    if(!D.decision) D.decision=rel==='exists'?'exists':'builds'; btPaintMatches(); btPaintLinked(); const dd=btQ('#bd-decide'); if(dd) dd.innerHTML=btDecideInner(); btPaintFoot(); return; }
  if((b=t.closest('[data-btunlink]'))){ const key=b.dataset.btunlink; D.links=D.links.filter(l=>l.k+':'+l.id!==key); btPaintMatches(); btPaintLinked(); const dd=btQ('#bd-decide'); if(dd) dd.innerHTML=btDecideInner(); btPaintFoot(); return; }
  if((b=t.closest('[data-btdecide]'))){ D.decision=b.dataset.btdecide; const dd=btQ('#bd-decide'); if(dd) dd.innerHTML=btDecideInner(); btPaintFoot(); return; }
  if(t.closest('[data-btai]')){ btRunAi(); return; }
  if(t.closest('[data-btstop]')){ if(btAbort) btAbort.abort(); return; }
  if((b=t.closest('[data-btaccept]'))){ const k=b.dataset.btaccept, f=D.ai&&D.ai.draft[k]; if(f&&f.text){ D.draft[k]=f.text; const el=btQ('#'+{what:'bd-dwhat',why:'bd-dwhy',outcome:'bd-dout'}[k]); if(el) el.value=f.text; btPaintSugg(); btPaintFoot(); } return; }
  if((b=t.closest('[data-btdtidy]'))){ const [k,c]=b.dataset.btdtidy.split('|'); D.tidyChoice[k]=c; btPaintDTidy(); return; }
  if((b=t.closest('[data-btsales]'))){ D.sales={id:b.dataset.btsales}; const w=btQ('#bd-sales'); if(w){ btPaint(); } return; }
  if(t.closest('[data-btsalesx]')){ D.sales=null; btPaint(); return; }
}
document.addEventListener('focusin',e=>{ if(e.target&&e.target.id==='bd-sq') btSalesSearch(e.target.value); });

// ---------- the item: what Beta recorded, the signal, the chain, and moving it along ----------
async function btItemUpdate(id,fn,ev,extra){
  let r=null; for(let i=0;i<15&&!r;i++){ r=(FE.all||[]).find(x=>x._id===id); if(!r) await new Promise(res=>setTimeout(res,200)); }
  if(!r) throw {code:'not_found'}; const me=feMe(), at=feNow(), v=JSON.parse(JSON.stringify(r.v||{}));
  const patch=Object.assign({},fn(v,r)||{}), eid='e'+Date.now()+'-'+Math.random().toString(36).slice(2,6), e=Object.assign({id:eid, at, by:me.uid, via:'beta'},ev);
  await FE.db.doc('ledger/'+id).update(Object.assign({v, updatedAt:at, updatedBy:me.uid, h:Object.assign({},r.h||{},{[eid]:{at, by:me.uid, k:ev.k, from:ev.from, to:ev.to, via:'beta'}})},patch,extra||{}));
  await FE.db.doc('ledger-events/'+id).set({e:Object.assign({},FE.ev[id]||{},{[eid]:e})});
}
const BT_NEXT={signed:'reviewed', reviewed:'estimated', estimated:'approved', approved:'picked-up', 'picked-up':'in-delivery', 'in-delivery':'delivered', delivered:'checked'};
const BT_STAMP={reviewed:'review', estimated:'estimate', approved:'approval', 'picked-up':'pickup'};
const BT_STN={submitted:'Awaiting signature', signed:'Signed', reviewed:'Reviewed', estimated:'Estimated', approved:'On the ledger', 'picked-up':'Picked up', 'in-delivery':'In delivery', delivered:'Delivered', checked:'Checked'};
window.btEntryHtml=r=>{
  const v=r.v||{}, b=v.beta; if(!b) return '';
  const me=feMe(), how=!!btAcc().how, mine=r.loggedBy===me.uid, sales=b.sales&&b.sales.id;
  const links=b.links||[], follows=BT.voices.filter(x=>x.target&&x.target.k==='l'&&x.target.id===r._id);
  const clients=(v.customers||[]).map(c=>c.client).filter(Boolean).concat(follows.flatMap(x=>x.clients||[]));
  const cb=btCombined([...new Set(clients)],links);
  const tickets=[...new Set((v.related||[]).filter(Boolean).concat(cb.close))];
  const canSign=r.status==='submitted'&&!(r.owed||[]).length&&(how||sales===me.uid), canUnsign=r.status==='signed'&&(how||(r.signature||{}).by===me.uid), nx=BT_NEXT[r.status];
  const owedNote=r.status==='submitted'&&(r.owed||[]).length?`<span class="small">It can be signed once the ${btPl((r.owed||[]).length,'detail')} owed ${(r.owed||[]).length===1?'is':'are'} filled in.</span>`:'';
  const found=(how||mine)&&BT.eq[r._id]&&BT.eq[r._id].trim().length>=3?btCands(BT.eq[r._id],clients,6).filter(m=>!(m.k==='l'&&m.id===r._id)&&!links.some(l=>l.k===m.k&&l.id===m.id)):[];
  return `<div class="bt-entry" data-btent="${btE(r._id)}"><div class="bt-eh"><span class="bt-beta">Beta</span><b>Logged with Claude</b><span class="small">${btE(BT_SRC[b.src]||'')} · ${b.mode==='review'?'full review':'quick share'}</span>${r.test?'<span class="pp-tag noest">Test</span>':''}</div>
    <div class="bt-eg"><div>
      <div class="bt-sl">What the client said</div><dl class="sx-kv"><dt>What</dt><dd>${btE(b.what)}</dd>${b.why?`<dt>Why</dt><dd>${btE(b.why)}</dd>`:''}${b.outcome?`<dt>Outcome</dt><dd>${btE(b.outcome)}</dd>`:''}</dl>
      ${b.call&&b.call.url?`<div class="small">From the call <a href="${btE(b.call.url)}" target="_blank" rel="noopener">${btE(b.call.title||'recording')}</a>${b.call.date?' · '+btE(b.call.date):''}</div>`:''}
      ${(b.quotes||[]).map(q=>btQuoteHtml(q)).join('')}
      ${b.excerpt&&b.excerpt!==b.what?`<div class="small bt-exc">“${btE(btCut(b.excerpt,240))}”</div>`:''}
      ${(b.questions||[]).filter(x=>x.a).map(x=>`<p class="small"><b>${btE(x.q)}</b><br>${btE(x.a)}</p>`).join('')}
      ${b.question?`<p class="small"><b>${btE(b.question)}</b><br>${b.answer?btE(b.answer):'<span class="sx-dim">not answered yet</span>'}</p>`:''}
      ${sales?`<div class="small">Value handed to <b>${btE(feName(sales))}</b></div>`:''}
    </div><div>
      <div class="bt-stats"><div><b>${cb.list.length}</b><span>clients behind it</span><span class="small">${btE(cb.list.slice(0,4).map(x=>x[0]).join(', '))}${cb.list.length>4?' +'+(cb.list.length-4):''}</span></div><div><b>${cb.signal}</b><span>signal</span><span class="small"><button type="button" class="linkbtn" data-def="signal">tier-weighted</button></span></div></div>
      <div class="bt-sl">Linked<span class="c">${links.length}</span></div>
      ${links.length?links.map(l=>{ const m=btFind(l.k+':'+l.id); return `<div class="bt-lrow"><span class="bt-mm">${m?btCandTitle(m)+' '+btKindChip(m):btE(l.name||l.id)}</span><span class="bt-lact"><span class="small">${btE(BT_REL[l.rel]||l.rel)}</span>${(how||mine)?`<button type="button" class="linkbtn" data-btiunlink="${btE(l.k+':'+l.id)}">Unlink</button>`:''}</span></div>`; }).join(''):'<div class="small">Nothing linked. Link the needs this work delivers, so they close together.</div>'}
      ${follows.length?`<div class="bt-sl">Clients following it</div><div class="small">${btE(follows.map(x=>btClientsTxt(x.clients)).join(', '))}</div>`:''}
      ${(how||mine)?`<input class="bt-in bt-lq" type="search" data-btlq="${btE(r._id)}" placeholder="Link more: search needs, built work and the ledger" value="${btE(BT.eq[r._id]||'')}" aria-label="Link more">
        <div class="bt-lres">${found.map(m=>`<div class="bt-lrow"><span class="bt-mm">${btCandTitle(m)} ${btKindChip(m)} <span class="small">${m.pct}%</span></span><button type="button" class="ibtn" data-btilink="${btE(btKey(m))}">Link</button></div>`).join('')}${BT.eq[r._id]&&BT.eq[r._id].trim().length>=3&&!found.length?'<div class="small">Nothing matches yet.</div>':''}</div>`:''}
    </div></div>
    <div class="bt-sl">Close the chain<span class="c">${btPl(tickets.length,'ticket')}</span></div>
    ${b.chainClosed?`<div class="bt-teaser ok">Closed by ${btE(feName(b.chainClosed.by))} ${btE(ppWhen(b.chainClosed.at))}: ${btPl((b.chainClosed.needs||[]).length,'need')} marked delivered, ${btPl((b.chainClosed.tickets||[]).length,'ticket')} to close in Jira.</div>`
      :['delivered','checked'].includes(r.status)?`<div class="small">This work is delivered. Close everything it delivers in one go: the linked needs are marked delivered, and you get the Jira tickets to close.</div>${how?`<button type="button" class="ibtn primary" data-btiact="chain"${tickets.length||links.length?'':' disabled'}>Close the chain</button>`:''}`
      :'<div class="small">When it is delivered, the linked needs and tickets close together from here.</div>'}
    ${tickets.length?`<div class="bt-chips">${tickets.slice(0,30).map(k=>/^[A-Z]+-\d+$/.test(k)?`<a class="bt-chip" href="https://expoplatform.atlassian.net/browse/${btE(k)}" target="_blank" rel="noopener">${btE(k)}</a>`:`<span class="bt-chip">${btE(k)}</span>`).join('')}</div><button type="button" class="linkbtn" data-btcopy="${btE(tickets.join(', '))}">Copy the ticket list</button>`:''}
    <div class="bt-eacts">${canSign?`<button type="button" class="ibtn primary" data-btiact="sign">Sign the figure${r.signer&&r.signer.who?' ('+btE(r.signer.who)+')':''}</button>`:''}${canUnsign?'<button type="button" class="ibtn" data-btiact="unsign">Unsign to change it</button>':''}
      ${how&&nx&&r.status!=='submitted'?`<button type="button" class="ibtn" data-btiact="move">Move to ${btE(BT_STN[nx])}</button>`:''}${owedNote}
      ${how?'<span class="small">Beta: Settings viewers move a Beta item along by hand while the rest of the lifecycle is built. Every move is recorded.</span>':''}</div></div>`;
};
async function btItemAct(id,act,arg){
  const r=(FE.all||[]).find(x=>x._id===id); if(!r) return; const me=feMe(), at=feNow();
  try{
    if(act==='sign'){ await btItemUpdate(id,()=>({status:'signed', signature:{by:me.uid, at, who:(r.signer||{}).who||'', via:'beta'}}),{k:'sign', from:r.status, to:'signed'}); uiToast('Signed. It now waits for review.'); }
    else if(act==='unsign'){ await btItemUpdate(id,()=>({status:'submitted', signature:null}),{k:'unsign', from:'signed', to:'submitted'}); uiToast('Signature removed. Change the value, then sign again.'); }
    else if(act==='move'){ const nx=BT_NEXT[r.status]; if(!nx) return; const st=BT_STAMP[nx]; await btItemUpdate(id,()=>Object.assign({status:nx},st?{[st]:{by:me.uid, at, via:'beta'}}:{}),{k:'move', from:r.status, to:nx}); uiToast('Moved to '+BT_STN[nx]+'.'); }
    else if(act==='chain'){ const b=(r.v||{}).beta||{}, cb=btCombined([],b.links||[]), tickets=[...new Set(((r.v||{}).related||[]).filter(Boolean).concat(cb.close))], needs=(b.links||[]).filter(l=>l.k==='a'&&l.rel!=='related').map(l=>l.id);
      await btItemUpdate(id,v=>{ v.beta=Object.assign({},v.beta,{chainClosed:{by:me.uid, at, needs, tickets}, links:(v.beta.links||[]).map(l=>needs.includes(l.id)?Object.assign({},l,{closed:true, closedAt:at}):l)}); },{k:'chain', fields:tickets.slice(0,30)}); uiToast('Chain closed: '+btPl(needs.length,'need')+' delivered, '+btPl(tickets.length,'ticket')+' to close in Jira.'); }
    else if(act==='link'){ const m=btFind(arg); if(!m) return; const rel=m.k==='a'?'part':m.k==='b'?'extends':'follow';
      await btItemUpdate(id,v=>{ v.beta=Object.assign({},v.beta,{links:(v.beta.links||[]).concat({k:m.k, id:m.id, rel, name:m.title})}); const ks=m.k==='a'?(m.keys||[]).slice(0,15):m.k==='m'&&m.key?[m.key]:[]; v.related=[...new Set((v.related||[]).filter(Boolean).concat(ks))]; },{k:'link', fields:[m.title]}); BT.eq[id]=''; }
    else if(act==='unlink'){ await btItemUpdate(id,v=>{ v.beta=Object.assign({},v.beta,{links:(v.beta.links||[]).filter(l=>l.k+':'+l.id!==arg)}); },{k:'unlink', fields:[(btFind(arg)||{}).title||arg]}); }
  }catch(e){ uiToast(e&&e.code==='invalid_argument'?'Not saved: your access to this page is read-only.':'It could not be saved just now ('+((e&&e.code)||'error')+'). Try again.',{bad:true}); }
}
document.addEventListener('click',e=>{ const t=e.target; if(!t.closest||!t.closest('.bt-entry')) return; const ent=t.closest('.bt-entry').dataset.btent; let b;
  if((b=t.closest('[data-btiact]'))){ btItemAct(ent,b.dataset.btiact); return; }
  if((b=t.closest('[data-btilink]'))){ btItemAct(ent,'link',b.dataset.btilink); return; }
  if((b=t.closest('[data-btiunlink]'))){ btItemAct(ent,'unlink',b.dataset.btiunlink); return; }
  if((b=t.closest('[data-btcand]'))){ const m=btFind(b.dataset.btcand); if(m&&m.k==='l'&&m.id===ent) return; btOpenCand(b.dataset.btcand); return; }
  if((b=t.closest('[data-btcopy]'))){ const x=b.dataset.btcopy; try{ navigator.clipboard.writeText(x).then(()=>uiToast('Ticket list copied.'),()=>uiToast('Copy it from here: '+x)); }catch(err){ uiToast('Copy it from here: '+x); } } });
document.addEventListener('input',e=>{ const t=e.target; if(!t.dataset||!t.dataset.btlq) return; const id=t.dataset.btlq; BT.eq[id]=t.value; clearTimeout(BT.lqT);
  BT.lqT=setTimeout(()=>{ const ent=document.querySelector('.bt-entry[data-btent="'+CSS.escape(id)+'"]'), r=(FE.all||[]).find(x=>x._id===id); if(!ent||!r) return; const w=document.createElement('div'); w.innerHTML=window.btEntryHtml(r);
    const a=ent.querySelector('.bt-lres'), n=w.querySelector('.bt-lres'); if(a&&n) a.innerHTML=n.innerHTML; },250); });

// ---------- History: voices shared with Beta ----------
window.btHistory=add=>{ BT.vAll.forEach(v=>{ const K={join:'added a client’s voice to',exists:'recorded as already built:',follow:'added a client to work on its way:'};
  add(v.at,v.by,'beta',(K[v.kind]||'shared')+' '+btCut((v.target||{}).name,70)+(v.test?' (test)':''),btClientsTxt(v.clients)+(v.sig&&!v.sig.had?' · signal '+v.sig.before.s+' → '+v.sig.after.s:'')+' · '+(BT_SRC[v.src]||''),
    v.target&&v.target.k==='l'?'fe:'+v.target.id:''); }); };

// ---------- Settings → Sync & logs → Beta lab (Settings viewers) ----------
const BT_SCEN=[
  {id:'dup', title:'Already asked for by many', body:'A request many clients already made. Expect “Is this it?” and a jump in the signal.', src:'type', raw:'Exhibitors want visitors to be able to sort the marketplace so the newest products show first'},
  {id:'built', title:'Already built', body:'A request the platform already covers. Expect a Built match and “Record as already built”.', src:'type', raw:'Registrants should be able to pick their preferred language when they sign up, so all emails arrive in that language'},
  {id:'new', title:'A new idea', body:'Nothing like it exists. Expect “None of these, it’s new” and a new work item.', src:'type', raw:'Organisers want an estimate of each attendee’s travel carbon footprint shown on their event dashboard'},
  {id:'chat', title:'From a chat snippet', body:'An example chat thread. Expect the fields to fill themselves from the chat.', src:'chat', raw:'Organiser 10:42: our exhibitors keep asking if scanned leads can go straight into Salesforce\nOrganiser 10:43: right now they export a CSV after the show and half of them never do it\nOrganiser 10:44: if it synced live they would follow up the same day'},
  {id:'review', title:'The full review', body:'Opens the four steps with the top need linked as the same thing.'}];
function btRunScen(id){ const sc=BT_SCEN.find(x=>x.id===id); if(!sc) return; if(!BT.test) btSetTest(true);
  if(id==='review'){ const top=(DM.needs||[])[0]; if(top) window.btFromNeed(top.c.id); else btOpen({mode:'drop'}); return; }
  btResetShare(); btResetCall(); Object.assign(BT.s,{src:sc.src, raw:sc.raw}); btOpen({mode:'share'}); setTimeout(()=>btFill(false),200); }
function btLabPaint(){
  const host=document.getElementById('bt-lab'); if(!host) return; if(!btAcc().how){ host.innerHTML=''; return; } if(host.hidden) return;
  const me=feMe(), mineT=x=>x.test&&(x.loggedBy===me.uid||x.by===me.uid), ti=(FE.all||[]).filter(mineT), tv=BT.vAll.filter(mineT), L=BT.lab;
  const items=(FE.all||[]).filter(r=>(r.v||{}).beta&&btSeen(r)).sort((a,b)=>String(b.loggedAt).localeCompare(String(a.loggedAt))).slice(0,12);
  const voices=BT.voices.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,12);
  host.innerHTML=`<div class="bt-lab"><div class="bt-lh"><h3>Beta lab</h3><div class="bt-p">Logging with Claude is in Beta with the Settings viewers. Test it here: switch test mode on, run a case, look at what Claude sent and got back, then clear your tests.</div></div>
    <div class="bt-lgrid"><div class="card"><h3>Test mode</h3><div class="bt-p">While it is on, everything you log or share with Beta is tagged Test and left out of every count, board and signal. Only viewers with test mode on see it.</div>
      <div class="bt-acts"><button type="button" class="ibtn${BT.test?'':' primary'}" data-btlab="test">${BT.test?'Turn test mode off':'Turn test mode on'}</button><span class="bt-state${BT.test?' ok':''}">${BT.test?'On':'Off'}</span></div>
      <div class="small">Your test data: ${btPl(ti.length,'work item')}, ${btPl(tv.length,'shared voice')}.</div>
      ${ti.length+tv.length?(L.confirm?`<div class="bt-note">Delete ${btPl(ti.length+tv.length,'test record')}? This cannot be undone.<div class="bt-acts"><button type="button" class="ibtn primary" data-btlab="delyes">Yes, delete them</button><button type="button" class="ibtn" data-btlab="delno">Cancel</button></div></div>`:'<button type="button" class="ibtn" data-btlab="del">Delete my test data</button>'):''}</div>
      <div class="card"><h3>Check Claude</h3><div class="bt-p">Makes one tiny call to Claude from this page and says exactly what happened. The first time, claude.ai asks you to allow it.</div>
      <button type="button" class="ibtn" data-btlab="check"${L.check&&L.check.busy?' disabled':''}>${L.check&&L.check.busy?'Checking…':'Check Claude'}</button>
      ${L.check&&!L.check.busy?(L.check.ok?`<div class="bt-teaser ok">Claude works here (${Math.round(L.check.ms/100)/10} s).</div>`:`<div class="bt-note bad">${btE(L.check.msg||'It did not work.')}</div>`):''}
      <h3>Open Beta</h3><div class="bt-p">The same window every “Log a new work item” button opens for you.</div><div class="bt-acts"><button type="button" class="ibtn primary" data-btlab="open">Log a new work item</button></div></div></div>
    <div class="card"><h3>Cases</h3><div class="bt-p">One tap sets up a case in test mode; then run the flow yourself.</div><div class="bt-scen">${BT_SCEN.map(s=>`<div class="bt-sc"><b>${btE(s.title)}</b><span class="small">${btE(s.body)}</span><button type="button" class="ibtn" data-btscen="${s.id}">Run</button></div>`).join('')}</div></div>
    <div class="card"><h3>Logged with Beta</h3><div class="bt-p">The newest work items and shared voices${BT.test?', test ones included':''}.</div>
      <div class="bt-rec">${items.map(r=>`<button type="button" class="bt-recr" data-btlabopen="${btE(r._id)}"><b>${btE(r.id||r._id)}</b><span>${btE(btCut((r.v||{}).title,80))}</span><span class="small">${btE(BT_SRC[(r.v.beta||{}).src]||'')} · ${btE(ppWhen(r.loggedAt))} · ${btE(feName(r.loggedBy))}${r.test?' · Test':''}</span></button>`).join('')}
        ${voices.map(v=>`<div class="bt-recr"><b>${btE({join:'Joined',exists:'Already built',follow:'Following'}[v.kind]||v.kind)}</b><span>${btE(btCut((v.target||{}).name,80))}</span><span class="small">${btE(btClientsTxt(v.clients))}${v.sig&&!v.sig.had?' · signal '+v.sig.before.s+' → '+v.sig.after.s:''} · ${btE(ppWhen(v.at))}${v.test?' · Test':''}</span></div>`).join('')}
        ${items.length+voices.length?'':'<div class="empty">Nothing logged with Beta yet.</div>'}</div></div>
    <div class="card"><h3>What Claude was asked</h3><div class="bt-p">Every call to Claude in this session: what was sent, what came back, and what was left out for having no source. Each call is also a line in History.</div>
      ${BT.ailog.length?BT.ailog.map(l=>`<details class="bt-ailog"><summary><b>${btE(l.kind)}</b> <span class="small">${btE(l.at.toLocaleTimeString('en-GB'))}${l.code?' · failed: '+btE(l.code):''}${l.dropped.length?' · left out: '+btE(l.dropped.join(', ')):''}</span></summary>
        <div class="bt-sl">Sent</div><pre class="bt-code">${btE(String(l.prompt).slice(0,6000))}</pre><div class="bt-sl">Came back</div><pre class="bt-code">${btE((typeof l.raw==='string'?l.raw:JSON.stringify(l.raw,null,2)||'').slice(0,4000))}</pre>${l.used?`<div class="bt-sl">Used</div><pre class="bt-code">${btE(JSON.stringify(l.used,null,2).slice(0,3000))}</pre>`:''}</details>`).join(''):'<div class="empty">No calls yet in this session.</div>'}</div></div>`;
}
window.btLabPaint=btLabPaint;
async function btLabDelete(){ const me=feMe(), mineT=x=>x.test&&(x.loggedBy===me.uid||x.by===me.uid); let n=0;
  for(const r of (FE.all||[]).filter(mineT)){ try{ await FE.db.doc('ledger/'+r._id).delete(); try{ await FE.db.doc('ledger-events/'+r._id).delete(); }catch(e){} n++; }catch(e){} }
  for(const v of BT.vAll.filter(mineT)){ try{ await FE.db.doc('ledger-voices/'+v._id).delete(); n++; }catch(e){} }
  BT.lab.confirm=false; btLabPaint(); uiToast('Deleted '+btPl(n,'test record')+'.'); }
async function btLabCheck(){ BT.lab.check={busy:true}; btLabPaint(); const t0=Date.now();
  try{ const r=await btAI('Connection check','Return this JSON object exactly: {"ok": true}',{tier:'quick', fresh:true}); BT.lab.check={ok:!!(r.data&&r.data.ok===true), ms:Date.now()-t0}; btLog('Connection check','Return {"ok": true}',r.text,r.data); }
  catch(e){ BT.lab.check={ok:false, msg:btAiMsg(e)}; } btLabPaint(); }
document.addEventListener('click',e=>{ const t=e.target; if(!t.closest||!t.closest('#bt-lab')) return; let b;
  if((b=t.closest('[data-btscen]'))){ btRunScen(b.dataset.btscen); return; }
  if((b=t.closest('[data-btlabopen]'))){ feOpenEntry(b.dataset.btlabopen); return; }
  if((b=t.closest('[data-btlab]'))){ const a=b.dataset.btlab;
    if(a==='test') btSetTest(!BT.test); else if(a==='del'){ BT.lab.confirm=true; btLabPaint(); } else if(a==='delno'){ BT.lab.confirm=false; btLabPaint(); } else if(a==='delyes') btLabDelete();
    else if(a==='check') btLabCheck(); else if(a==='open') btOpen({}); } });
// the QR code opens the ledger at #log: a Settings viewer lands straight in Beta
window.addEventListener('ep-gate',()=>{ setTimeout(()=>{ if(location.hash==='#log'&&btAcc().how) btOpen({}); },400); });
