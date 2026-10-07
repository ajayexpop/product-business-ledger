// Timeline tab code, removed from src/main.js on 6 Oct 2026 (published version 1790786519-79a4).
// Part 1 sat after the MODEL table block (`tb-model` click listener) and before "// ----- cell popup".
// TIERS and tlRisk stayed in main.js and are not repeated here, apart from where part 1 shows them in place.

// ---- part 1 (was lines 662-882)
// ===== TIMELINE: client x month =====
const TLM=['pre'].concat(D.months);
// what the Timeline shows: a time range (zoom in time), a zoom level (zoom in size), and which marks and risks are on
let tlRange='year', tlZoom=(()=>{ try{ const z=+localStorage.getItem('ep-tl-zoom'); return z>=1&&z<=5?z:2; }catch(e){ return 2; } })();
const tlShow={del:true,bugs:true,inc:true,shows:true,other:true}, tlRiskOn=new Set();
function tlM(){
  const y=NOW_S.slice(0,4), ms=D.months.filter(m=>m.startsWith(y)), q=n=>ms.filter(m=>Math.ceil(+m.slice(5,7)/3)===n);
  const nowI=D.months.indexOf(NOW_S.slice(0,7));
  const pick={year:['pre'].concat(D.months), now:D.months.slice(Math.max(0,nowI-2),nowI+4), h1:['pre'].concat(ms.filter(m=>+m.slice(5,7)<=6)), h2:ms.filter(m=>+m.slice(5,7)>6),
    q1:['pre'].concat(q(1)), q2:q(2), q3:q(3), q4:q(4)}[tlRange];
  return pick&&pick.length?pick:TLM;
}
const TL_COLW=[56,74,104,146,204], TL_ROWH=[46,56,68,84,104];
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
  return D.companies.filter(c=>myOk(c.pd)&&(!tier||String(c.tier)===tier)&&(!owner||c.owner===owner)&&(!q||c.name.toLowerCase().includes(q))
    &&(tlRows==='all'||EVIX[c.pd]||tlM().some(m=>{const x=(TLIX[c.pd]||{})[m];if(!x)return false;const k=cellCounts(x);return k.give+k.pain>0}))
    &&(!tlRiskOn.size||tlRiskOn.has(tlRisk(c).st)));
}
function strip(segs,total,max,cls){
  if(!total) return `<div class="strip nil"></div>`;
  const w=Math.max(12,Math.round(total/max*100));
  return `<div class="strip" style="width:${w}%">`+segs.filter(s=>s.v).map(s=>`<b style="background:${s.f};flex:${s.v}"></b>`).join('')+`</div>`;
}
// ----- the Timeline, redrawn 25 Sep 2026: one clear mark per cell, show flags, risk chips, sorted by next show
let tlSort='show';
const TL_OPEN=new Set(['1']);   // tier bands open in the tier sort; the rest show their total row only
const NOW_M=NOW_S.slice(0,7);
const worstSev=cnt=>PRI.find(p=>cnt[p])||null;
function tlRisk(c){
  const a=agg(c), lv=a.exp.lv, quiet=!a.all.length&&!openPipeFor(c.pd).length;
  return {a, st:lv||(quiet?'clear':'open'), t:lv==='red'?'Act now':lv==='amber'?'Watch':quiet?'Clear':'No flag'};
}
function tlCell(c,m){
  const cell=(TLIX[c.pd]||{})[m], k=cellCounts(cell);
  const evs=m==='pre'?[]:evOf(c.pd,m), sh=evs.filter(isShow);
  const cnt={Urgent:0,High:0,Medium:0,Low:0}; if(cell&&tlTypes!=='give') cell.bugs.forEach(b=>cnt[b.p]=(cnt[b.p]||0)+1);
  let inc=cell&&tlTypes!=='give'?cell.inc.length:0, bugsN=k.pain-inc, ws=worstSev(cnt);
  if(!tlShow.inc) inc=0; if(!tlShow.bugs) bugsN=0; const give=tlShow.del?k.give:0;
  const long=tlZoom>=3, cut=(t,n)=>long?t:(t.length>n?t.slice(0,n-1)+'…':t);
  const showNm=sh.length?sh.map(x=>x.n).join(', '):'';
  let body='';
  if(sh.length&&tlShow.shows) body+=`<span class="tv-flag" title="${esc(showNm)}">&#9873;<span>${esc(sh.length>1&&!long?sh.length+' shows':sh.map(x=>cut(x.n,16)).join(' · '))}</span></span>`;
  const other=tlShow.other?evs.filter(x=>!isShow(x)):[];
  if(other.length) body+=`<span class="tv-evk k-${esc(other[0].kind)}" title="${esc(other.map(x=>(EVK[x.kind]||x.kind)+': '+x.n).join(', '))}">&#9670; ${esc(EVK[other[0].kind]||other[0].kind)}${other.length>1?' +'+(other.length-1):''}</span>`;
  body+='<span class="tv-marks">';
  if(give) body+=`<span class="tv-g" title="${give} delivered">&#9650;${give}</span>`;
  if(bugsN>0) body+=`<span class="tv-b ${ws}" title="${bugsN} open bug${bugsN===1?'':'s'}, worst ${ws}">${bugsN}</span>`;
  if(inc) body+=`<span class="tv-i" title="${inc} incident${inc===1?'':'s'}">${inc}</span>`;
  body+='</span>';
  const has=give+Math.max(0,bugsN)+inc>0||(sh.length&&tlShow.shows)||other.length>0;
  return `<div class="cell tv${has?' has':''}${sh.length?' show':''}${m===NOW_M?' now':''}${m>NOW_M&&m!=='pre'?' fut':''}${m==='pre'?' pre':''}" ${has?`data-pd="${c.pd}" data-m="${m}" tabindex="0" role="button" aria-label="${esc(shortName(c.name))} ${TLLAB[m]}: ${k.give} delivered, ${bugsN>0?bugsN:0} open bugs, ${inc} incidents${sh.length?', show '+esc(showNm):''}"`:''}>${has?body:''}</div>`;
}
function tlLabel(c,rail){
  const r=tlRisk(c), n=c.nextEvent;
  return `<div class="cname tvn" data-c360="${esc(c.pd)}" role="button" tabindex="0" title="Open Client 360"><span class="rail" style="background:${rail}"></span>
    <span class="tvn-t"><span class="nm">${esc(shortName(c.name))}</span>
    <span class="tvn-m">${c.tier?`<span class="tierpill t${c.tier<=2?c.tier:''}">T${c.tier}</span>`:''}${c.health!=null?`<span class="hdot ${healthCls(c.health)}" title="Planhat health ${c.health} of 10">${Math.round(c.health)}</span>`:''}<span class="rchip ${r.st}">${n?(n.now?'show now':'show '+n.in+'d'):'no show'} · ${r.t}</span></span></span></div>`;
}
function tlTotals(rows,label,rail,key,open){
  const TLM=tlM();
  const cells=TLM.map(m=>{let g=0,p=0;rows.forEach(c=>{const k=cellCounts((TLIX[c.pd]||{})[m]);g+=k.give;p+=k.pain});
    return `<div class="cell tv tot${m===NOW_M?' now':''}"><span class="tv-marks">${g?`<span class="tv-g">&#9650;${g}</span>`:''}${p?`<span class="tv-b tot">${p}</span>`:''}</span></div>`;}).join('');
  return `<button type="button" class="cname tvband" data-tlband="${key}" aria-expanded="${open}"><span class="rail" style="background:${rail}"></span><span class="tvn-t"><span class="nm">${esc(label)}</span><span class="tvn-m">${rows.length} client${rows.length===1?'':'s'}</span></span><span class="tvb-arw">&rsaquo;</span></button>`+cells;
}
function renderTimeline(){
  const list=tlClients();
  const el=document.getElementById('tl'); el.classList.add('tlv');
  document.getElementById('t-count').textContent=list.length+' of '+D.companies.length+' clients';
  const TLM=tlM();
  el.dataset.zoom=tlZoom;
  const zl=document.getElementById('t-zoomlbl'); if(zl) zl.textContent=['Smallest','Small','Medium','Large','Largest'][tlZoom-1];
  document.querySelectorAll('#t-zoom [data-z]').forEach(b=>b.disabled=(b.dataset.z==='-1'&&tlZoom<=1)||(b.dataset.z==='1'&&tlZoom>=5));
  document.querySelectorAll('#tv-filters [data-tlshow]').forEach(b=>b.setAttribute('aria-pressed',String(tlShow[b.dataset.tlshow])));
  document.querySelectorAll('#tv-filters [data-tlrisk]').forEach(b=>b.setAttribute('aria-pressed',String(tlRiskOn.has(b.dataset.tlrisk))));
  let h=`<div class="hd first">Client · next show</div>`+TLM.map(m=>`<div class="hd${m==='pre'?' pre':''}${m===NOW_M?' now':''}${m>NOW_M&&m!=='pre'?' fut':''}">${m===NOW_M?TLLAB[m]+' · now':TLLAB[m]}</div>`).join('');
  const railOf=c=>(TIERS.find(t=>t.k===(c.tier==null?null:c.tier))||TIERS[4]).c;
  const pain=c=>TLM.reduce((a,m)=>a+cellCounts((TLIX[c.pd]||{})[m]).pain,0);
  if(tlSort==='tier'){
    TIERS.forEach(t=>{
      const rows=list.filter(c=>(c.tier==null?null:c.tier)===t.k).sort((a,b)=>pain(b)-pain(a)||shortName(a.name).localeCompare(shortName(b.name)));
      if(!rows.length)return;
      const key=String(t.k), open=TL_OPEN.has(key);
      h+=tlTotals(rows,t.l,t.c,key,open);
      if(open) rows.forEach(c=>{ h+=tlLabel(c,t.c)+TLM.map(m=>tlCell(c,m)).join(''); });
    });
  } else {
    const byShow=(a,b)=>{const x=a.nextEvent,y=b.nextEvent;return (x.now?-1:x.in)-(y.now?-1:y.in)||(a.tier||9)-(b.tier||9)};
    const rows=tlSort==='bugs'?list.slice().sort((a,b)=>pain(b)-pain(a)||shortName(a.name).localeCompare(shortName(b.name)))
      :list.filter(c=>c.nextEvent).sort(byShow);
    rows.forEach(c=>{ h+=tlLabel(c,railOf(c))+TLM.map(m=>tlCell(c,m)).join(''); });
    if(tlSort==='show'){
      const rest=list.filter(c=>!c.nextEvent).sort((a,b)=>pain(b)-pain(a));
      if(rest.length){ h+=`<div class="band tvsep">No show booked from today · ${rest.length} client${rest.length===1?'':'s'}</div>`;
        rest.forEach(c=>{ h+=tlLabel(c,railOf(c))+TLM.map(m=>tlCell(c,m)).join(''); }); }
    }
  }
  el.style.gridTemplateColumns=`minmax(${tlZoom>=4?250:210}px,${tlZoom>=4?290:240}px) repeat(${TLM.length},minmax(${TL_COLW[tlZoom-1]}px,1fr))`;
  el.style.setProperty('--tlrow',TL_ROWH[tlZoom-1]+'px');
  el.innerHTML=list.length?h:'<div class="empty" style="padding:30px">No client matches these filters.</div>';
  tlPortfolio(list);
}
// the month chart, mirrored: what we delivered rises from the centre line, what broke hangs below it
function tlPortfolio(list){
  const host=document.getElementById('chart-tlmonths'); if(!host) return;
  const TLM=tlM();
  const rows=TLM.map(m=>{
    const r={m,ship:0,prog:0,inc:0,shows:0,cnt:{Urgent:0,High:0,Medium:0,Low:0}};
    list.forEach(c=>{const x=(TLIX[c.pd]||{})[m];if(x){r.ship+=x.ship.length;r.prog+=x.prog.length;r.inc+=x.inc.length;x.bugs.forEach(b=>r.cnt[b.p]++)}
      if(m!=='pre') r.shows+=evOf(c.pd,m).filter(isShow).length;});
    if(tlTypes==='pain'){r.ship=0;r.prog=0} if(tlTypes==='give'){r.inc=0;r.cnt={Urgent:0,High:0,Medium:0,Low:0}}
    r.up=r.ship+r.prog; r.down=PRI.reduce((a,p)=>a+r.cnt[p],0)+r.inc; return r;
  });
  const W=1100, H=300, L=34, R=10, T=24, B=46, mid=T+(H-T-B)/2;
  const maxU=Math.max(1,...rows.map(r=>r.up)), maxD=Math.max(1,...rows.map(r=>r.down)), mx=Math.max(maxU,maxD);
  const half=(H-T-B)/2-4, sc=v=>v/mx*half, cw=(W-L-R)/rows.length, bw=Math.min(46,cw*.56);
  let s=`<svg class="chart mir" viewBox="0 0 ${W} ${H}" role="img" aria-label="Delivered above the line, bugs and incidents below, by month">`;
  const nowI=rows.findIndex(r=>r.m===NOW_M);
  if(nowI>=0) s+=`<rect x="${L+nowI*cw}" y="${T-14}" width="${cw}" height="${H-T-B+22}" fill="var(--accent-soft)" rx="8"/><text x="${L+nowI*cw+cw/2}" y="${T-3}" text-anchor="middle" class="mir-now">now</text>`;
  [...new Set([0.5,1].map(f=>Math.round(mx*f)).filter(v=>v>0))].forEach(v=>{[mid-sc(v),mid+sc(v)].forEach(y=>{s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line2)" stroke-dasharray="3 4"/>`});
    s+=`<text x="${L-6}" y="${mid-sc(v)+4}" text-anchor="end" class="val">${v}</text><text x="${L-6}" y="${mid+sc(v)+4}" text-anchor="end" class="val">${v}</text>`;});
  // a clickable column behind each month, then every segment clickable on top of it
  rows.forEach((r,i)=>{ s+=`<rect class="bar-hit mir-col" x="${L+i*cw}" y="${T}" width="${cw}" height="${H-T-B}" data-i="${i}" data-m="${r.m}" data-k="" tabindex="0" role="button" aria-label="${esc(TLLAB[r.m])}: open everything"/>`; });
  rows.forEach((r,i)=>{
    const x=L+i*cw+(cw-bw)/2; let y=mid;
    [[r.ship,'var(--del-ship)','ship'],[r.prog,'var(--del-prog)','prog']].forEach(([v,f,k])=>{if(!v)return;const hh=sc(v);y-=hh;s+=`<rect class="mir-seg" x="${x}" y="${y}" width="${bw}" height="${Math.max(1,hh-1)}" fill="${f}" rx="3" data-i="${i}" data-m="${r.m}" data-k="${k}"/>`});
    if(r.up) s+=`<text x="${x+bw/2}" y="${y-5}" text-anchor="middle" class="mir-n up">${r.up}</text>`;
    y=mid;
    PRI.map(p=>[r.cnt[p],PFILL[p],p]).concat([[r.inc,'var(--inc)','inc']]).forEach(([v,f,k])=>{if(!v)return;const hh=sc(v);s+=`<rect class="mir-seg" x="${x}" y="${y+1}" width="${bw}" height="${Math.max(1,hh-1)}" fill="${f}" rx="3" data-i="${i}" data-m="${r.m}" data-k="${k}"/>`;y+=hh});
    if(r.down) s+=`<text x="${x+bw/2}" y="${y+14}" text-anchor="middle" class="mir-n dn">${r.down}</text>`;
    s+=`<text x="${L+i*cw+cw/2}" y="${H-24}" text-anchor="middle" class="lbl">${TLLAB[r.m]}</text>`;
    if(r.shows) s+=`<text x="${L+i*cw+cw/2}" y="${H-8}" text-anchor="middle" class="mir-sh mir-shc" data-i="${i}" data-m="${r.m}" data-k="shows">&#9873; ${r.shows}</text>`;
  });
  s+=`<line x1="${L}" x2="${W-R}" y1="${mid}" y2="${mid}" stroke="var(--ink2)" stroke-width="1.5"/>`;
  s+=`</svg>`;
  host.innerHTML=s;
  const KL={ship:'shipped',prog:'in progress',Urgent:'Urgent still open',High:'High still open',Medium:'Medium still open',Low:'Low still open',inc:'incidents',shows:'shows'};
  host.querySelectorAll('.bar-hit,.mir-seg,.mir-shc').forEach(el=>{const r=rows[+el.dataset.i], k=el.dataset.k;
    el.addEventListener('mousemove',e=>{ el.classList.add('hov'); showTip(e,`<b>${r.m==='pre'?'Raised before 2026':fmtMo(r.m)}${k?' · '+KL[k]:''}</b>${r.ship} shipped · ${r.prog} in progress<br>${PRI.map(p=>r.cnt[p]+' '+p.toLowerCase()).join(' · ')} still open<br>${r.inc} incident${r.inc===1?'':'s'}${r.shows?'<br>'+r.shows+' show'+(r.shows===1?'':'s')+' this month':''}<br><span style="opacity:.75">click for ${k?'these':'everything'}</span>`); });
    el.addEventListener('mouseleave',()=>{ el.classList.remove('hov'); hideTip(); });
    el.addEventListener('click',()=>{ hideTip(); tlMonthModal(r.m,k,list); });
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); tlMonthModal(r.m,k,list); } });});
}
// everything behind one month of the chart, for the clients in the current filter; the chips switch the kind
function tlMonthModal(m,kind,list){
  const ship=new Map(), prog=new Map(), bugs=new Map(), inc=new Map(), shows=[];
  list.forEach(c=>{ const x=(TLIX[c.pd]||{})[m];
    if(x){ x.ship.forEach(s=>{ const e=ship.get(s.k)||{s,cs:[]}; e.cs.push(c); ship.set(s.k,e); }); x.prog.forEach(s=>{ const e=prog.get(s.k)||{s,cs:[]}; e.cs.push(c); prog.set(s.k,e); });
      x.bugs.forEach(b=>{ const e=bugs.get(b.key)||{b,cs:[]}; e.cs.push(c); bugs.set(b.key,e); }); x.inc.forEach(i=>{ const e=inc.get(i.key)||{i,cs:[]}; e.cs.push(c); inc.set(i.key,e); }); }
    if(m!=='pre') evOf(c.pd,m).filter(isShow).forEach(e=>shows.push({e,c})); });
  const B=[...bugs.values()].sort((a,b)=>SEV[b.b.p]-SEV[a.b.p]);
  const cnt={ship:ship.size,prog:prog.size,Urgent:B.filter(x=>x.b.p==='Urgent').length,High:B.filter(x=>x.b.p==='High').length,Medium:B.filter(x=>x.b.p==='Medium').length,Low:B.filter(x=>x.b.p==='Low').length,inc:inc.size,shows:shows.length};
  const L={ship:'Shipped',prog:'In progress',Urgent:'Urgent',High:'High',Medium:'Medium',Low:'Low',inc:'Incidents',shows:'Shows'};
  const cn=cs=>cs.map(c=>`<button type="button" class="linkbtn" data-rkopen-c="${esc(c.pd)}">${esc(shortName(c.name))}</button>`).join(', ');
  const paint=k=>{
    const want=x=>!k||k===x;
    let h=`<div class="mm-chips">${['',...Object.keys(L)].filter(x=>!x||cnt[x]).map(x=>`<button type="button" class="mm-chip${x===k?' on':''} k-${x||'all'}" data-mmk="${x}">${x?L[x]:'Everything'} <b>${x?cnt[x]:''}</b></button>`).join('')}</div>`;
    if(want('shows')&&shows.length) h+=`<div class="seclabel"><i style="background:var(--ev-show)"></i>Shows this month<span class="c">${shows.length}</span></div><div class="dlist">${shows.sort((a,b)=>a.e.s.localeCompare(b.e.s)).map(({e,c})=>{const w=evWhen(e);return `<div class="evrow ${w.cls}"><div class="k"><a href="${jira(e.k)}" target="_blank" rel="noopener">${esc(e.k)}</a></div><div class="s">${esc(e.n)}<div class="m">${cn([c])} · ${esc(evDates(e))}</div></div><div class="st">${esc(w.t)}</div></div>`}).join('')}</div>`;
    ['ship','prog'].forEach(t=>{ const src=t==='ship'?ship:prog; if(!want(t)||!src.size) return;
      h+=`<div class="seclabel"><i style="background:var(--del-${t==='ship'?'ship':'prog'})"></i>${t==='ship'?'Shipped':'In progress'}<span class="c">${src.size}</span></div><div class="dlist">${[...src.values()].map(x=>`<div class="mm-for">for ${cn(x.cs)}</div>`+storyFull(x.s)).join('')}</div>`; });
    const bl=B.filter(x=>!k||k===x.b.p);
    if((!k||PRI.includes(k))&&bl.length) h+=`<div class="seclabel"><i style="background:var(--sev-urgent)"></i>Bugs raised ${m==='pre'?'before 2026':'this month'}, still open<span class="c">${bl.length}</span></div><div class="dlist">${bl.map(({b,cs})=>`<div class="bug"><div class="k"><a href="${jira(b.key)}" target="_blank" rel="noopener">${esc(b.key)}</a><br><span class="pr ${b.p}">${b.p}</span></div><div class="s">${esc(b.s)}<div class="m">${cn(cs)} · ${esc(b.team||'no team')}</div></div><div class="st">${esc(b.st)}<div class="m">${days(b.cr)}d old</div></div></div>`).join('')}</div>`;
    if(want('inc')&&inc.size) h+=`<div class="seclabel"><i style="background:var(--inc)"></i>Incidents<span class="c">${inc.size}</span></div><div class="dlist">${[...inc.values()].map(({i,cs})=>`<div class="bug"><div class="k"><a href="${jira(i.key)}" target="_blank" rel="noopener">${esc(i.key)}</a><br><span class="pr ${i.p}">${i.p}</span></div><div class="s">${esc(i.s)}<div class="m">${cn(cs)} · ${esc(i.ev||'')}</div></div><div class="st">${esc(i.st)}<div class="m">${fmtDate(i.cr)}</div></div></div>`).join('')}</div>`;
    document.getElementById('modal-body').innerHTML=h;
    document.getElementById('modal-body').querySelectorAll('[data-mmk]').forEach(b=>b.onclick=()=>paint(b.dataset.mmk));
  };
  openInfoModal((m==='pre'?'Raised before 2026':fmtMo(m))+(kind?' · '+L[kind]:''),`<span>${list.length} client${list.length===1?'':'s'} in the current filter</span><span>${cnt.ship} shipped · ${cnt.prog} in progress · ${B.length} still open · ${cnt.inc} incidents · ${cnt.shows} shows</span>`,'',
    '<span>Choose a kind above; click a client for Client 360.</span>');
  paint(kind||'');
  const box=document.querySelector('#modal .box'); if(box) box.classList.add('fe-wide');
}
document.getElementById('modal-body').addEventListener('click',e=>{ const b=e.target.closest('[data-rkopen-c]'); if(!b) return; closeModal(); openC360(b.dataset.rkopenC); });
function tlSetZoom(z){ tlZoom=Math.max(1,Math.min(5,z)); try{ localStorage.setItem('ep-tl-zoom',tlZoom); }catch(e){} renderTimeline(); }
document.getElementById('t-zoom').addEventListener('click',e=>{ const b=e.target.closest('[data-z]'); if(b) tlSetZoom(tlZoom+ +b.dataset.z); });
document.getElementById('t-range').addEventListener('change',e=>{ tlRange=e.target.value; renderTimeline(); });
document.getElementById('tv-filters').addEventListener('click',e=>{ let b;
  if((b=e.target.closest('[data-tlshow]'))){ const k=b.dataset.tlshow; tlShow[k]=!tlShow[k]; renderTimeline(); return; }
  if((b=e.target.closest('[data-tlrisk]'))){ const k=b.dataset.tlrisk; tlRiskOn.has(k)?tlRiskOn.delete(k):tlRiskOn.add(k); renderTimeline(); return; }
  if(e.target.closest('[data-tlreset]')){ Object.keys(tlShow).forEach(k=>tlShow[k]=true); tlRiskOn.clear(); renderTimeline(); }
});
document.querySelector('#panel-timeline .tlwrap').addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey)) return; e.preventDefault(); tlSetZoom(tlZoom+(e.deltaY<0?1:-1)); },{passive:false});
document.getElementById('panel-timeline').addEventListener('keydown',e=>{ if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return; if(e.key==='+'||e.key==='='){ e.preventDefault(); tlSetZoom(tlZoom+1); } else if(e.key==='-'||e.key==='_'){ e.preventDefault(); tlSetZoom(tlZoom-1); } });
document.getElementById('t-sort').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tlSort=b.dataset.v;
  document.querySelectorAll('#t-sort button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTimeline()});
document.getElementById('tl').addEventListener('click',e=>{
  const band=e.target.closest('[data-tlband]'); if(band){const k=band.dataset.tlband; TL_OPEN.has(k)?TL_OPEN.delete(k):TL_OPEN.add(k); renderTimeline(); return;}
  const n=e.target.closest('.tvn[data-c360]'); if(n){ openC360(n.dataset.c360); }
});
document.getElementById('tl').addEventListener('keydown',e=>{ if(e.key!=='Enter')return; const n=e.target.closest('.tvn[data-c360]'); if(n){e.preventDefault();openC360(n.dataset.c360);} });

// ---- part 2 (was lines 890-925): openModal, the client-month pop-up; it sat after `const modal=document.getElementById('modal');`
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

// ---- part 3 (was lines 935-953): grid listeners; they sat after the `modal-open-client` click listener, before "// ===== DELIVERY TIMELINE"
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
