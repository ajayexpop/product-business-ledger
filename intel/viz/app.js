// ============ Product Demand Map ============
// One filter state drives all three views. Within a filter, values widen (OR); across filters, they narrow (AND).
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const short = (s, n) => (s || '').length > n ? s.slice(0, n - 1) + '…' : (s || '');
const plural = (n, a, b) => `${n.toLocaleString()} ${n === 1 ? a : (b || a + 's')}`;
const SRC = {F: {name: 'Feature Requests', one: 'Feature Request', note: 'every status except Rejected'}, S: {name: 'Open Stories', one: 'Open Story', note: 'status Open'}, I: {name: 'FIS intake', one: 'FIS page', note: 'in-scope intake requests'}};
const ORDER = ['F', 'S', 'I'];
const TIER_ORDER = ['T1', 'T2', 'T3', 'T4', 'Not in ledger', 'Internal only', 'No customer'];
const BUILT = {done: 'Already built', part: 'Partially built', none: 'Nothing built'};
const TW = {1: 8, 2: 4, 3: 2, 4: 1};
const tchip = t => `<span class="tchip t${t || 0}">${t ? 'T' + t : '—'}</span>`;
const TCOL = t => t ? `var(--tier${t})` : 'var(--tier0)';

// ---------- data prep ----------
const byItem = new Map(D.map(r => [r.i, r]));
const byCl = new Map(C.map(c => [c.id, c]));
const q2 = d => d ? d.slice(0, 4) + ' Q' + (Math.floor((+d.slice(5, 7) - 1) / 3) + 1) : '';
C.forEach(c => { c.m.forEach(m => { const r = byItem.get(m.i); if (r) { r.cl = c.id; r.role = m.r; } }); });
D.forEach(r => {
  r.kl = r.s === 'I' ? (/\d{3}$/.test(r.k || '') ? r.k : 'FIS draft') : r.k;
  r.q = q2(r.d);
  r.cuN = (r.cu || []).map(x => x[0]);
  const tiers = (r.cu || []).map(x => x[1]).filter(Boolean);
  r.ti = tiers.length ? Math.min(...tiers) : 0;
  r.tl = r.ti ? 'T' + r.ti : (r.cu || []).length ? 'Not in ledger' : r.in ? 'Internal only' : 'No customer';
  const cn = byCl.get(r.cl);
  r.h = [r.k, r.kl, r.t, r.cuN.join(' '), r.w, r.x, r.pr, cn ? cn.name : ''].join(' ').toLowerCase();
});
C.forEach(c => { c.size = c.m.length; c.bsAll = c.m.some(m => (byItem.get(m.i) || {}).bs === 'done') ? 'done' : c.m.some(m => (byItem.get(m.i) || {}).bs === 'part') ? 'part' : 'none'; });
const DOMS = [...new Set(Object.values(PROD))];

// ---------- facets ----------
const FACETS = [
  {k: 'pr', label: 'Product', vals: r => [r.pr], group: v => PROD[v] || 'Other', search: true},
  {k: 'tier', label: 'Tier', vals: r => [r.tl], order: TIER_ORDER},
  {k: 'cu', label: 'Customer', vals: r => r.cuN.length ? r.cuN : ['No customer named'], search: true, tier: true},
  {k: 'st', label: 'Status', vals: r => [r.st], group: v => v.startsWith('FIS') ? 'FIS intake' : 'Jira'},
  {k: 'built', label: 'Built today', vals: r => [BUILT[r.bs] || 'Nothing built'], order: ['Already built', 'Partially built', 'Nothing built']},
  {k: 'kind', label: 'Kind', vals: r => [r.kd || 'Not classified']},
  {k: 'tm', label: 'Team', vals: r => [r.tm || 'No team']},
  {k: 'comp', label: 'Component', vals: r => (r.c && r.c.length) ? r.c : ['No component'], search: true},
  {k: 'qt', label: 'Raised', vals: r => [r.q || 'Unknown'], group: v => v.slice(0, 4), sortDesc: true},
  {k: 'cls', label: 'FIS class', vals: r => r.s === 'I' ? [r.fc || 'Unscored'] : [], order: ['NOW', 'NEXT', 'LATER', 'TBD', 'Unscored']},
];
const FK = Object.fromEntries(FACETS.map(f => [f.k, f]));
const F = {src: new Set(ORDER), q: ''};
FACETS.forEach(f => F[f.k] = new Set());
const KEYQ = /^(ep|req)-\d+$/;
const custTier = new Map(); D.forEach(r => (r.cu || []).forEach(([n, t]) => { if (t && (!custTier.has(n) || t < custTier.get(n))) custTier.set(n, t); }));

function match(r, skip) {
  if (skip !== 'src' && !F.src.has(r.s)) return false;
  if (F.q && (KEYQ.test(F.q) ? (r.k || '').toLowerCase() !== F.q : !r.h.includes(F.q))) return false;
  for (const f of FACETS) {
    if (f.k === skip || !F[f.k].size) continue;
    if (!f.vals(r).some(v => F[f.k].has(v))) return false;
  }
  return true;
}
function counts(k) {
  const m = new Map();
  D.forEach(r => { if (!match(r, k)) return; FK[k].vals(r).forEach(v => m.set(v, (m.get(v) || 0) + 1)); });
  return m;
}
function toggle(k, v) { const s = F[k]; s.has(v) ? s.delete(v) : s.add(v); changed(); }

// ---------- derived views ----------
let ROWS = [], NEEDS = [];
function derive() {
  ROWS = D.filter(r => match(r));
  const hit = new Map();
  ROWS.forEach(r => { if (r.cl) (hit.get(r.cl) || hit.set(r.cl, []).get(r.cl)).push(r); });
  NEEDS = [];
  hit.forEach((rs, id) => {
    const c = byCl.get(id); const cu = new Map();
    rs.forEach(r => (r.cu || []).forEach(([n, t]) => { const e = cu.get(n) || {n, t, k: 0}; e.k++; cu.set(n, e); }));
    const cus = [...cu.values()].sort((a, b) => (a.t || 9) - (b.t || 9) || b.k - a.k || a.n.localeCompare(b.n));
    const tiers = cus.map(x => x.t).filter(Boolean);
    const tc = {}; [1, 2, 3, 4].forEach(t => tc[t] = cus.filter(x => x.t === t).length);
    NEEDS.push({c, rs, n: rs.length, dup: rs.filter(r => r.role === 'duplicate').length, cu: cus, tt: tiers.length ? Math.min(...tiers) : 0,
      t1: cus.filter(x => x.t === 1).map(x => x.n), tc, sig: cus.reduce((a, x) => a + (TW[x.t] || 0), 0),
      bs: rs.some(r => r.bs === 'done') ? 'done' : rs.some(r => r.bs === 'part') ? 'part' : 'none',
      fis: Math.max(-1, ...rs.map(r => r.op ?? -1))});
  });
  NEEDS.sort((a, b) => b.sig - a.sig || b.n - a.n || a.c.name.localeCompare(b.c.name));
  NEEDS.forEach((x, i) => x.rank = i + 1);
}
const needOf = id => NEEDS.find(x => x.c.id === id);

// ---------- filter bar ----------
let openFacet = null, popQuery = '';
function placePop() {
  const p = document.querySelector('.pop'); if (!p) return;
  p.style.left = '0px'; const r = p.getBoundingClientRect(), pr = p.parentNode.getBoundingClientRect();
  let left = 0; if (r.right > innerWidth - 12) left = innerWidth - 12 - r.width - pr.left; if (pr.left + left < 12) left = 12 - pr.left;
  p.style.left = left + 'px';
}
function renderFacets() {
  $('facets').innerHTML = FACETS.map(f => { const n = F[f.k].size;
    return `<div class="facet"><button type="button" class="fbtn${n ? ' on' : ''}" data-facet="${f.k}" aria-haspopup="true" aria-expanded="${openFacet === f.k}">${f.label}${n ? `<span class="cnt">${n}</span>` : ''}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>${openFacet === f.k ? popHtml(f) : ''}</div>`; }).join('');
  if (openFacet) { const inp = document.querySelector('.pop input[type=search]'); if (inp) { inp.value = popQuery; } placePop(); }
}
function popHtml(f) {
  const cnt = counts(f.k); const sel = F[f.k];
  let vals = [...new Set([...cnt.keys(), ...sel])];
  if (f.order) vals.sort((a, b) => (f.order.indexOf(a) + 99 * (f.order.indexOf(a) < 0)) - (f.order.indexOf(b) + 99 * (f.order.indexOf(b) < 0)));
  else if (f.sortDesc) vals.sort((a, b) => a < b ? 1 : -1);
  else if (f.tier) vals.sort((a, b) => (custTier.get(a) || 9) - (custTier.get(b) || 9) || (cnt.get(b) || 0) - (cnt.get(a) || 0) || a.localeCompare(b));
  else vals.sort((a, b) => (cnt.get(b) || 0) - (cnt.get(a) || 0) || a.localeCompare(b));
  if (f.group && !f.sortDesc) vals.sort((a, b) => { const ga = f.group(a), gb = f.group(b); return ga === gb ? 0 : (f.k === 'pr' ? DOMS.indexOf(ga) - DOMS.indexOf(gb) : ga < gb ? 1 : -1); });
  const qq = popQuery.trim().toLowerCase();
  if (qq) vals = vals.filter(v => v.toLowerCase().includes(qq));
  let html = '', g = null;
  vals.forEach(v => {
    if (f.group) { const gg = f.group(v); if (gg !== g) { g = gg; html += `<div class="grp">${esc(gg)}</div>`; } }
    const n = cnt.get(v) || 0, on = sel.has(v);
    const t = f.tier ? custTier.get(v) : 0;
    html += `<label class="opt${n || on ? '' : ' zero'}"><input type="checkbox" data-fv="${esc(v)}"${on ? ' checked' : ''}><span class="ol">${f.tier ? tchip(t) : ''}<span>${esc(v)}</span></span><span class="on">${n}</span></label>`;
  });
  return `<div class="pop" role="dialog" aria-label="${f.label} filter">
    ${f.search || vals.length > 12 ? `<div class="ph"><input type="search" placeholder="Find ${f.label.toLowerCase()}…" aria-label="Find ${f.label}" data-popq></div>` : ''}
    <div class="pl">${html || '<div class="empty">No values match.</div>'}</div>
    <div class="pf"><button type="button" class="lnk" data-fclear="${f.k}">Clear</button><span class="hint">${sel.size ? sel.size + ' selected · any of them' : 'Pick one or more'}</span><button type="button" class="lnk" data-fclose>Done</button></div></div>`;
}
function refreshPop() {
  const fv = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fv : null;
  const fac = document.querySelector(`.facet button[data-facet="${openFacet}"]`); if (!fac) return;
  const pl = fac.parentNode.querySelector('.pop'); if (!pl) return;
  const tmp = document.createElement('div'); tmp.innerHTML = popHtml(FK[openFacet]);
  pl.querySelector('.pl').replaceWith(tmp.querySelector('.pl'));
  pl.querySelector('.pf').replaceWith(tmp.querySelector('.pf'));
  const b = fac; const n = F[openFacet].size; b.classList.toggle('on', !!n);
  b.innerHTML = `${FK[openFacet].label}${n ? `<span class="cnt">${n}</span>` : ''}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>`;
  if (fv != null) { const el = [...pl.querySelectorAll('[data-fv]')].find(x => x.dataset.fv === fv); if (el) el.focus(); }
}
function renderChips() {
  const out = [];
  if (F.src.size < 3) out.push(`<span class="chip"><b>Source</b> ${esc([...F.src].map(s => SRC[s].one).join(', '))}<button type="button" data-chipsrc aria-label="Show all sources">×</button></span>`);
  if (F.q) out.push(`<span class="chip"><b>Search</b> “${esc(F.q)}”<button type="button" data-chipq aria-label="Clear search">×</button></span>`);
  FACETS.forEach(f => { const s = [...F[f.k]]; if (!s.length) return;
    if (s.length > 3) out.push(`<span class="chip"><b>${f.label}</b> ${s.length} selected<button type="button" data-fclear="${f.k}" aria-label="Clear ${f.label}">×</button></span>`);
    else s.forEach(v => out.push(`<span class="chip"><b>${f.label}</b> ${esc(v)}<button type="button" data-chip="${f.k}" data-v="${esc(v)}" aria-label="Remove ${esc(v)}">×</button></span>`)); });
  if (out.length) out.push(`<button type="button" class="lnk" id="clear-all">Clear all</button>`);
  $('chips').innerHTML = out.join('') || '<span class="hint">No filters. Showing everything.</span>';
  $('result').textContent = `${plural(ROWS.length, 'ticket')} · ${plural(NEEDS.length, 'need')}`;
}

// ---------- KPIs ----------
function renderKpis() {
  const t1 = NEEDS.filter(x => x.tt === 1);
  const t1c = new Set(t1.flatMap(x => x.t1)).size;
  const dups = NEEDS.reduce((a, x) => a + x.dup, 0);
  $('kpis').innerHTML = [
    [ROWS.length.toLocaleString(), 'tickets and intake pages', ''],
    [NEEDS.length.toLocaleString(), `distinct needs, ${dups.toLocaleString()} duplicates folded in`, ''],
    [t1.length.toLocaleString(), 'needs a Tier 1 customer is asking for', 'hl'],
    [t1c.toLocaleString(), 'Tier 1 customers with open asks', ''],
    [t1.filter(x => x.bs === 'none').length.toLocaleString(), 'Tier 1 needs with nothing built yet', ''],
  ].map(([b, s, c]) => `<div class="kpi ${c}"><b>${b}</b><span>${s}</span></div>`).join('');
}

// ---------- TIER MAP ----------
const ms = {lens: 1, sel: null, dirty: true};
try { const v = +localStorage.getItem('pdm-lens'); if ([1, 2, 4, 9].includes(v)) ms.lens = v; } catch (e) {}
const inLens = x => ms.lens === 9 || (x.tt && x.tt <= ms.lens);
let sim, zoomer, gRoot, nodeSel, linkSel, lblSel, hubSel, NODES = [], LINKS = [], curK = 1, dcT;
// labels keep a readable screen size at any zoom; customer labels that collide with a product box or a
// higher-priority label are hidden (T1 first, then by number of needs)
const inv = () => 1 / Math.max(0.55, Math.min(curK, 2.2));   // labels hold ~11px down to 55% zoom
function declutter() {
  if (!lblSel || !hubSel) return;
  const boxes = hubSel.nodes().map(n => n.getBoundingClientRect());
  const hit = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  const order = lblSel.nodes().map(n => ({n, d: d3.select(n).datum()})).sort((a, b) => (a.d.t || 9) - (b.d.t || 9) || b.d.deg - a.d.deg);
  order.forEach(o => { o.n.style.display = '';
    if (o.n.classList.contains('dim')) { o.n.style.display = 'none'; return; }          // outside the selection
    const r = o.n.getBoundingClientRect(); const pad = {left: r.left - 2, right: r.right + 2, top: r.top - 1, bottom: r.bottom + 1};
    if (o.d.t !== 1) { if (boxes.some(b => hit(pad, b))) o.n.style.display = 'none'; else boxes.push(pad); return; }
    let box = pad, tries = [0, -14, 14, -28, 28, -42, 42]; o.n.setAttribute('dy', 0);          // Tier 1 names always show: nudge until clear
    for (const dy of tries) { o.n.setAttribute('dy', dy); const q = o.n.getBoundingClientRect(); box = {left: q.left - 2, right: q.right + 2, top: q.top - 1, bottom: q.bottom + 1}; if (!boxes.some(b => hit(box, b))) break; }
    boxes.push(box); });
}
const declutterSoon = () => { clearTimeout(dcT); dcT = setTimeout(declutter, 60); };
function drawGraph() {
  ms.dirty = false;
  document.querySelectorAll('#lens button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lens === ms.lens)));
  const svg = d3.select('#graph'); const box = svg.node().getBoundingClientRect(), W = box.width || 900, H = box.height || 640;
  svg.attr('viewBox', [-W / 2, -H / 2, W, H]); svg.selectAll('*').remove();
  gRoot = svg.append('g');
  zoomer = d3.zoom().scaleExtent([0.2, 6]).on('zoom', e => { gRoot.attr('transform', e.transform); curK = e.transform.k; if (NODES.length) { tick(); declutterSoon(); } });
  svg.call(zoomer).on('dblclick.zoom', null);
  svg.on('click', e => { if (e.target === svg.node()) select(null); });
  const needs = NEEDS.filter(inLens);
  const prods = [...new Set(needs.map(x => x.c.product))].sort((a, b) => DOMS.indexOf(PROD[a]) - DOMS.indexOf(PROD[b]) || a.localeCompare(b));
  const nodes = [], links = [], seen = new Map(), R = Math.max(Math.min(W, H) * 0.42, prods.length * (W < 640 ? 120 : 170) / (2 * Math.PI));   // room for every product label
  prods.forEach((p, i) => { const a = (i / prods.length) * Math.PI * 2 - Math.PI / 2; const n = {id: 'P:' + p, type: 'p', name: p, ax: Math.cos(a) * R, ay: Math.sin(a) * R, items: 0}; nodes.push(n); seen.set(n.id, n); });
  needs.forEach(x => { const hub = seen.get('P:' + x.c.product); hub.items += x.n;
    const n = {id: x.c.id, type: 'c', x0: x, name: x.c.name, r: 4 + Math.sqrt(x.n) * 2.6, t: x.tt}; nodes.push(n); seen.set(n.id, n);
    links.push({source: hub.id, target: n.id, k: 'pc'});
    x.cu.filter(u => u.t && (ms.lens === 9 || u.t <= ms.lens)).forEach(u => { let cn = seen.get('C:' + u.n);
      if (!cn) { cn = {id: 'C:' + u.n, type: 'u', name: u.n, t: u.t, deg: 0}; nodes.push(cn); seen.set(cn.id, cn); }
      cn.deg++; links.push({source: n.id, target: cn.id, k: 'cu'}); }); });
  nodes.filter(n => n.type === 'u').forEach(n => n.r = 5 + Math.sqrt(n.deg) * 2.2 + (n.t === 1 ? 3 : 0));
  NODES = nodes; LINKS = links;
  $('g-note').textContent = `${plural(needs.length, 'need')} · ${plural(nodes.filter(n => n.type === 'u').length, 'ledger customer')} · ${plural(prods.length, 'product')} · drag to pan, scroll to zoom, click anything`;
  if (!needs.length) { gRoot.append('text').attr('class', 'nl').attr('text-anchor', 'middle').text(ms.lens === 9 ? 'No needs match these filters.' : 'No needs at this tier match these filters. Try a wider lens.'); side(); return; }
  linkSel = gRoot.append('g').selectAll('line').data(links).join('line').attr('class', 'l').attr('stroke-width', d => d.k === 'cu' ? 0.8 : 0.6);
  nodeSel = gRoot.append('g').selectAll('g').data(nodes.filter(n => n.type !== 'p')).join('g').attr('class', 'gn')
    .attr('aria-label', d => d.type === 'u' ? `${d.name}, Tier ${d.t}` : `${d.name}, ${d.x0.n} tickets`);
  nodeSel.filter(d => d.type === 'c').append('circle').attr('r', d => d.r).attr('fill', d => TCOL(d.t));
  nodeSel.filter(d => d.type === 'u').append('path').attr('d', d => `M0,${-d.r * 1.25}L${d.r * 1.25},0L0,${d.r * 1.25}L${-d.r * 1.25},0Z`).attr('fill', d => TCOL(d.t));
  const lbl = nodes.filter(n => n.type === 'u' && (n.t === 1 || n.deg >= 4));
  lblSel = gRoot.append('g').selectAll('text').data(lbl).join('text').attr('class', 'nl').attr('text-anchor', 'middle').text(d => short(d.name, 26));
  hubSel = gRoot.append('g').selectAll('g').data(nodes.filter(n => n.type === 'p')).join('g').attr('class', 'gn hubg');
  hubSel.each(function (d) { const g = d3.select(this); const w = Math.min(190, d.name.length * 6.5 + 18);
    g.append('rect').attr('x', -w / 2).attr('y', -11).attr('width', w).attr('height', 22).attr('rx', 5); g.append('text').attr('text-anchor', 'middle').attr('dy', 4).text(d.name); });
  nodeSel = d3.selectAll([...nodeSel.nodes(), ...hubSel.nodes()]);
  nodeSel.on('click', (e, d) => { e.stopPropagation(); select(d); })
    .on('mousemove', (e, d) => showTip(e, nodeTip(d))).on('mouseleave', hideTip);
  if (sim) sim.stop();
  sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.k === 'pc' ? 36 + d.target.r : 70).strength(d => d.k === 'pc' ? 0.9 : 0.05))
    .force('charge', d3.forceManyBody().strength(d => d.type === 'p' ? -280 : d.type === 'u' ? -90 : -22))
    .force('collide', d3.forceCollide().radius(d => d.type === 'p' ? 38 : d.r + 2))
    .force('x', d3.forceX(d => d.type === 'p' ? d.ax : 0).strength(d => d.type === 'p' ? 0.7 : 0.02))
    .force('y', d3.forceY(d => d.type === 'p' ? d.ay : 0).strength(d => d.type === 'p' ? 0.7 : 0.02))
    .alphaDecay(0.04).on('tick', tick);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { sim.stop(); for (let i = 0; i < 260; i++) sim.tick(); tick(); fit(false); declutterSoon(); }
  else { sim.on('end', () => { fit(true); setTimeout(declutter, 400); }); setTimeout(() => fit(false), 700); }
  const keep = ms.sel && nodes.find(n => n.id === ms.sel);
  if (keep) { highlight(keep); side(keep); } else { ms.sel = null; side(); }
}
function tick() {
  linkSel.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  const k = inv();
  nodeSel.attr('transform', d => d.type === 'p' ? `translate(${d.x},${d.y}) scale(${k})` : `translate(${d.x},${d.y})`);
  lblSel.attr('x', d => d.x).attr('y', d => d.y - d.r * 1.25 - 5 * k).style('font-size', (11 * k) + 'px').style('stroke-width', (3.5 * k) + 'px');
}
function fit(anim) {
  if (!NODES.length || !zoomer) return;
  const svg = d3.select('#graph'); const b = svg.node().getBoundingClientRect(); if (!b.width) return;
  const xs = NODES.map(n => n.x), ys = NODES.map(n => n.y);
  const x0 = Math.min(...xs) - 90, x1 = Math.max(...xs) + 90, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
  const k = Math.min(2.5, 0.96 / Math.max((x1 - x0) / b.width, (y1 - y0) / b.height));
  const t = d3.zoomIdentity.scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  (anim ? svg.transition().duration(350) : svg).call(zoomer.transform, t);
}
function nodeTip(d) {
  if (d.type === 'p') return `<b>${esc(d.name)}</b><div class="r"><span>${esc(PROD[d.name] || '')}</span></div><div class="r"><span>Tickets in view</span><span class="mono">${d.items}</span></div>`;
  if (d.type === 'u') return `<b>${esc(d.name)}</b><div class="r"><span>Sales Tier</span><span class="mono">T${d.t}</span></div><div class="r"><span>Needs in view</span><span class="mono">${d.deg}</span></div>`;
  const x = d.x0; return `<b>${esc(x.c.name)}</b><div class="r"><span>${esc(x.c.product)}</span></div><div class="r"><span>Tickets</span><span class="mono">${x.n}</span></div><div class="r"><span>Tier 1 customers</span><span class="mono">${x.t1.length}</span></div><div class="r"><span>Built today</span><span>${BUILT[x.bs]}</span></div>`;
}
function highlight(d) {
  if (!nodeSel) return;
  const keep = new Set([d.id]);
  LINKS.forEach(l => { if (l.source.id === d.id) keep.add(l.target.id); if (l.target.id === d.id) keep.add(l.source.id); });
  if (d.type === 'u') LINKS.forEach(l => { if (keep.has(l.target.id) && l.source.type === 'p') keep.add(l.source.id); });
  nodeSel.classed('dim', n => !keep.has(n.id)).classed('sel', n => n.id === d.id);
  lblSel.classed('dim', n => !keep.has(n.id));
  linkSel.classed('hi', l => l.source.id === d.id || l.target.id === d.id).classed('dim', l => !(keep.has(l.source.id) && keep.has(l.target.id)));
}
function select(d) {
  ms.sel = d ? d.id : null;
  if (!d) { declutterSoon(); if (nodeSel) { nodeSel.classed('dim', false).classed('sel', false); lblSel.classed('dim', false); linkSel.classed('hi', false).classed('dim', false); } side(); return; }
  highlight(d); side(d); declutter();
}
function side(d) {
  const el = $('side');
  if (!d) {
    const top = NEEDS.filter(inLens).slice(0, 8);
    const cus = NODES.filter(n => n.type === 'u').sort((a, b) => a.t - b.t || b.deg - a.deg).slice(0, 24);
    const prs = NODES.filter(n => n.type === 'p').sort((a, b) => b.items - a.items);
    el.innerHTML = `<h3>Pick a need, a customer or a product</h3><p class="hint">${innerWidth < 640 ? 'Pinch or scroll to zoom in and read labels. ' : ''}Circles are needs: tickets asking for the same thing, with duplicates folded in. Size shows how many tickets; shade shows the best Sales Tier asking. Diamonds are ledger customers, placed between the needs they ask for. Boxed labels are KB products. Press Escape to come back here.</p>${top.length ? `<div class="lbl">Top of this view</div><ul>${top.map(x => `<li>${tchip(x.tt)}<button class="linkbtn" data-open="${x.c.id}">${esc(x.c.name)}</button></li>`).join('')}</ul>` : ''}${cus.length ? `<div class="lbl">Customers in view</div><ul>${cus.map(n => `<li>${tchip(n.t)}<button class="linkbtn" data-node="${esc(n.id)}">${esc(n.name)}</button><span class="mono muted">${n.deg}</span></li>`).join('')}</ul>` : ''}${prs.length ? `<div class="lbl">Products in view</div><ul>${prs.map(n => `<li><button class="linkbtn" data-node="${esc(n.id)}">${esc(n.name)}</button><span class="mono muted">${n.items}</span></li>`).join('')}</ul>` : ''}`;
    return;
  }
  if (d.type === 'c') { el.innerHTML = needHtml(d.x0, true); el.scrollTop = 0; focusSide(); return; }
  if (d.type === 'u') {
    const xs = NEEDS.filter(x => x.cu.some(u => u.n === d.name)).sort((a, b) => b.n - a.n);
    const byP = {}; xs.forEach(x => (byP[x.c.product] = byP[x.c.product] || []).push(x));
    const own = x => (x.cu.find(u => u.n === d.name) || {k: 0}).k;
    el.innerHTML = `<h3>${esc(d.name)}</h3><div class="meta">${tchip(d.t)}<span>${plural(xs.length, 'need')} · ${plural(xs.reduce((a, x) => a + own(x), 0), 'ticket')} naming them, in view</span></div><p><button class="btn" type="button" data-addcu="${esc(d.name)}">Filter everything to ${esc(short(d.name, 30))}</button></p>` +
      Object.entries(byP).sort((a, b) => b[1].length - a[1].length).map(([p, list]) => `<div class="lbl">${esc(p)}</div><ul>${list.map(x => `<li><span class="mono muted">${own(x)}</span><button class="linkbtn" data-open="${x.c.id}">${esc(x.c.name)}</button></li>`).join('')}</ul>`).join('');
    el.scrollTop = 0; focusSide(); return;
  }
  const xs = NEEDS.filter(x => x.c.product === d.name && inLens(x));
  setTimeout(focusSide);
  el.innerHTML = `<h3>${esc(d.name)}</h3><div class="meta"><span>${esc(PROD[d.name] || '')}</span><span>· ${plural(xs.length, 'need')} in view</span></div><p><button class="btn" type="button" data-addpr="${esc(d.name)}">Filter everything to this product</button></p><ul>${xs.slice(0, 60).map(x => `<li>${tchip(x.tt)}<button class="linkbtn" data-open="${x.c.id}">${esc(x.c.name)}</button><span class="mono muted">${x.n}</span></li>`).join('')}</ul>`;
  el.scrollTop = 0;
}
let wantFocus = false;
function focusSide() { if (!wantFocus) return; wantFocus = false; const h = $('side').querySelector('h3'); if (h) { h.tabIndex = -1; h.focus({preventScroll: true}); } }
function needHtml(x, withTitle) {
  const c = x.c;
  const mem = c.m.map(m => { const r = byItem.get(m.i); if (!r) return ''; const inView = x.rs.includes(r);
    return `<li${inView ? '' : ' class="muted"'}><span class="role ${m.r}">${m.r}</span><span><a href="${esc(r.u)}" target="_blank" rel="noopener" class="mono">${esc(r.kl || 'FIS')}</a> ${esc(short(r.t, 96))}${m.no ? `<span class="muted"> · ${esc(m.no)}</span>` : ''}${inView ? '' : ' <span class="muted">(outside filters)</span>'}</span></li>`; }).join('');
  const cu = x.cu.map(u => `<li>${tchip(u.t)}<span>${esc(u.n)}</span><span class="muted mono">${u.k}</span></li>`).join('');
  const also = (c.also || []).filter(p => PROD[p]).map(p => `<button class="linkbtn" data-addpr="${esc(p)}">${esc(p)}</button>`).join(', ');
  return `${withTitle ? `<h3>${esc(c.name)}</h3>` : ''}
    <div class="meta">${tchip(x.tt)}<span>${esc(c.product)}</span><span>· ${plural(x.n, 'ticket')}${x.dup ? `, ${x.dup} duplicate${x.dup === 1 ? '' : 's'}` : ''}${c.size > x.n ? ` (of ${c.size})` : ''}</span><span>· ${BUILT[x.bs]}</span>${x.fis >= 0 ? `<span>· FIS score ${Math.round(x.fis)}</span>` : ''}</div>
    <div class="lbl">What</div><p>${esc(c.what)}</p>
    <div class="lbl">Why</div><p>${esc(c.why)}</p>
    <div class="lbl">Outcome</div><p>${esc(c.outcome)}</p>
    <div class="lbl">Built today</div><p>${esc(c.bo || 'None found among built features.')}</p>
    ${also ? `<div class="lbl">Also asked in</div><p>${also}</p>` : ''}
    <div class="lbl">Customers asking</div>${cu ? `<ul>${cu}</ul>` : '<p class="muted">No customer named on these tickets.</p>'}
    <div class="lbl">Tickets</div><ul>${mem}</ul>`;
}
function renderRank() {
  const list = NEEDS.filter(inLens).slice(0, 30);
  $('rank-title').textContent = ms.lens === 1 ? 'Where Tier 1 is asking' : ms.lens === 2 ? 'Where Tier 1 and 2 are asking' : ms.lens === 4 ? 'Needs by tier signal' : 'All needs by tier signal';
  $('rank').innerHTML = list.length ? list.map((x, i) => `<button type="button" class="r" data-open="${x.c.id}"><span class="num">${i + 1}</span><span><span class="nm">${esc(x.c.name)}</span><span class="sb"> · ${esc(x.c.product)} · ${plural(x.n, 'ticket')}${x.dup ? ` (${x.dup} duplicate${x.dup === 1 ? '' : 's'})` : ''} · ${BUILT[x.bs]}</span><br><span class="sb">${esc((x.t1.length ? x.t1 : x.cu.filter(u => u.t).map(u => u.n)).slice(0, 6).join(', ') || 'No ledger customer named')}</span></span><span class="right">${tbars(x)}${tchip(x.tt)}</span></button>`).join('') : '<div class="empty">No needs match these filters at this tier.</div>';
}
const tbars = x => `<span class="tbars" aria-hidden="true">${[1, 2, 3, 4].map(t => x.tc[t] ? `<i style="width:${Math.min(60, 6 * x.tc[t])}px;background:var(--tier${t})"></i>` : '').join('')}</span>`;
function openNeed(id) {
  const x = needOf(id); if (!x) return;
  if (!inLens(x)) { ms.lens = 9; }
  showView('map'); if (ms.dirty || !NODES.some(n => n.id === id)) drawGraph();
  const d = NODES.find(n => n.id === id); if (d) select(d); else { $('side').innerHTML = needHtml(x, true); }
  renderRank();
  $('side').scrollIntoView({block: 'nearest', behavior: 'smooth'});
}

// ---------- NEEDS ----------
const ns = {multi: false, sort: {k: 'rank', dir: 1}, page: 0, open: null};
function renderNeeds() {
  let xs = NEEDS.filter(x => !ns.multi || x.c.size > 1);
  const {k, dir} = ns.sort;
  const val = x => ({rank: x.rank, name: x.c.name, product: x.c.product, tier: x.tt || 9, t1: x.t1.length, items: x.n, dups: x.dup, built: ['done', 'part', 'none'].indexOf(x.bs)}[k]);
  xs = xs.slice().sort((a, b) => { const p = val(a), q = val(b); return ((p < q ? -1 : p > q ? 1 : 0) * dir) || a.rank - b.rank; });
  const per = 50, pages = Math.max(1, Math.ceil(xs.length / per)); ns.page = Math.min(ns.page, pages - 1);
  $('n-title').textContent = `${plural(xs.length, 'need')} · ${plural(xs.reduce((a, x) => a + x.n, 0), 'ticket')}`;
  $('n-pager').innerHTML = pager(ns.page, pages, 'npg');
  document.querySelectorAll('th[data-nk]').forEach(th => th.setAttribute('aria-sort', th.dataset.nk === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
  $('n-rows').innerHTML = xs.slice(ns.page * per, ns.page * per + per).map(x => `<tr class="rw${ns.open === x.c.id ? ' open' : ''}" tabindex="0" data-nrow="${x.c.id}" aria-expanded="${ns.open === x.c.id}"><td class="mono">${x.rank}</td><td><b>${esc(x.c.name)}</b><span class="sb">${esc(short(x.c.what, 190))}</span></td><td>${esc(x.c.product)}</td><td>${tchip(x.tt)}</td><td class="cust">${esc(x.t1.slice(0, 4).join(', '))}${x.t1.length > 4 ? ` +${x.t1.length - 4}` : ''}</td><td class="mono">${x.n}${x.c.size > x.n ? `<span class="muted"> of ${x.c.size}</span>` : ''}</td><td class="mono">${x.dup || ''}</td><td>${BUILT[x.bs]}</td></tr>` +
    (ns.open === x.c.id ? `<tr class="detail"><td colspan="8"><div class="det"><div>${needHtml(x, false)}</div><div><button class="btn" type="button" data-open="${x.c.id}">Show on the tier map</button></div></div></td></tr>` : '')).join('') || '<tr><td colspan="8" class="empty">No needs match these filters. Remove a filter above to widen the view.</td></tr>';
}
const pager = (p, n, key) => n > 1 ? `<button class="btn" type="button" data-${key}="-1"${p ? '' : ' disabled'}>Previous</button><span class="mono">${p + 1} / ${n}</span><button class="btn" type="button" data-${key}="1"${p < n - 1 ? '' : ' disabled'}>Next</button>` : '';

// ---------- REQUESTS ----------
const rs = {sort: {k: 'd', dir: -1}, page: 0, open: null};
function tally(rows, fn) { const m = new Map(); rows.forEach(r => { const ks = fn(r); (Array.isArray(ks) ? ks : [ks]).forEach(k => { if (!k) return; let e = m.get(k); if (!e) { e = {k, F: 0, S: 0, I: 0, n: 0}; m.set(k, e); } e[r.s]++; e.n++; }); }); return [...m.values()].sort((a, b) => b.n - a.n); }
function tipHtml(title, e) { return `<b>${esc(title)}</b>` + ORDER.filter(s => e[s]).map(s => `<div class="r"><span><i class="sw" style="background:var(--s-${s});width:8px;height:8px"></i>${SRC[s].name}</span><span class="mono">${e[s]}</span></div>`).join('') + `<div class="r"><span>Total</span><span class="mono">${e.n}</span></div>`; }
function segs(e, max) { return ORDER.filter(s => e[s]).map(s => `<span class="seg" style="flex-grow:${e[s]};background:var(--s-${s})"></span>`).join('') + `<span style="flex-grow:${Math.max(0, max - e.n)}"></span>`; }
function hbars(el, list, key, limit, label) {
  const shown = list.slice(0, limit), max = shown.length ? Math.max(...shown.map(e => e.n)) : 1;
  el.innerHTML = shown.length ? shown.map(e => `<button type="button" class="bar${F[key].has(e.k) ? ' on' : ''}" data-tog="${key}" data-v="${esc(e.k)}" aria-pressed="${F[key].has(e.k)}" data-tip="${esc(tipHtml(e.k, e))}"><span class="lab">${label ? label(e) : `<span class="t">${esc(e.k)}</span>`}</span><span class="track">${segs(e, max)}</span><span class="n mono">${e.n}</span></button>`).join('') : '<div class="empty">Nothing matches these filters.</div>';
}
function renderRequests() {
  $('sources').innerHTML = ORDER.map(s => { const all = D.filter(r => r.s === s).length, f = D.filter(r => r.s === s && match(r, 'src')).length;
    return `<button type="button" class="src" data-src="${s}" aria-pressed="${F.src.size < 3 && F.src.has(s)}" data-dim="${!F.src.has(s)}"><i class="sw" style="background:var(--s-${s})"></i><span><b>${f === all ? all : f + ' / ' + all}</b><span class="l">${SRC[s].name} · ${SRC[s].note}</span></span></button>`; }).join('');
  hbars($('c-prod'), tally(D.filter(r => match(r, 'pr')), r => r.pr), 'pr', 24);
  hbars($('c-cust'), tally(D.filter(r => match(r, 'cu')), r => r.cuN), 'cu', 18, e => `${tchip(custTier.get(e.k))}<span class="t">${esc(e.k)}</span>`);
  const tiers = tally(D.filter(r => match(r, 'tier')), r => r.tl).sort((a, b) => TIER_ORDER.indexOf(a.k) - TIER_ORDER.indexOf(b.k));
  hbars($('c-tier'), tiers, 'tier', 10);
  const comp = tally(D.filter(r => match(r, 'comp')), r => (r.c && r.c.length) ? r.c : ['No component']);
  const none = comp.find(e => e.k === 'No component');
  hbars($('c-comp'), comp.filter(e => e.k !== 'No component'), 'comp', 14);
  $('h-comp').textContent = `A ticket can sit in several · ${(none ? none.n : 0).toLocaleString()} have none`;
  timeChart(D.filter(r => match(r, 'qt')));
  const fis = D.filter(r => r.s === 'I' && match(r, 'cls')); const co = ['NOW', 'NEXT', 'LATER', 'TBD', 'Unscored'];
  const cc = Object.fromEntries(co.map(k => [k, 0])); fis.forEach(r => cc[r.fc || 'Unscored']++);
  $('c-cls').innerHTML = F.src.has('I') ? co.map(k => `<button type="button" class="clsb ${k}${F.cls.has(k) ? ' on' : ''}" data-tog="cls" data-v="${k}" aria-pressed="${F.cls.has(k)}"><span>${k}</span><b>${cc[k]}</b></button>`).join('') : '<div class="empty" style="grid-column:1/-1">Turn on the FIS intake source to see scoring.</div>';
  $('c-top').innerHTML = fis.filter(r => r.op != null).sort((a, b) => b.op - a.op).slice(0, 7).map(r => `<a href="${esc(r.u)}" target="_blank" rel="noopener"><span class="mono">${Math.round(r.op)}</span><span>${esc(r.t.replace(/^\s*\[[^\]]*\]\s*/, ''))}</span>${r.fc ? `<span class="badge ${r.fc}">${r.fc}</span>` : '<span></span>'}</a>`).join('');
  table();
}
function timeChart(rows) {
  const t = tally(rows, r => r.q).filter(e => e.k).sort((a, b) => a.k < b.k ? -1 : 1); const el = $('c-time');
  if (!t.length) { el.innerHTML = '<div class="empty">Nothing matches these filters.</div>'; $('h-time').textContent = ''; return; }
  const qs = []; let y = +t[0].k.slice(0, 4), q = +t[0].k.slice(-1); const last = t[t.length - 1].k;
  for (let i = 0; i < 80; i++) { const k = y + ' Q' + q; qs.push(k); if (k === last) break; q++; if (q > 4) { q = 1; y++; } }
  const m = new Map(t.map(e => [e.k, e])); const series = qs.map(k => m.get(k) || {k, F: 0, S: 0, I: 0, n: 0});
  const W = 720, H = 220, L = 38, R = 8, T = 10, B = 26, pw = W - L - R, ph = H - T - B;
  const max = Math.max(...series.map(e => e.n)); const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const step = [1, 2, 5, 10].map(x => x * p).find(x => x >= raw) || p; const top = Math.ceil(max / step) * step || 1;
  const bw = pw / series.length, gap = Math.min(4, bw * .25); let g = '';
  for (let v = 0; v <= top; v += step) { const yy = T + ph - (v / top) * ph; g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${v}</text>`; }
  series.forEach((e, i) => { const x = L + i * bw + gap / 2, w = Math.max(1, bw - gap); let yb = T + ph;
    ORDER.forEach((s, si) => { if (!e[s]) return; const h = (e[s] / top) * ph; const isTop = !ORDER.slice(si + 1).some(z => e[z]); const hh = Math.max(0, h - (isTop ? 0 : 1.5));
      g += isTop && hh > 4 && w > 6 ? `<path d="M${x},${yb} v${-(hh - 3)} q0,-3 3,-3 h${w - 6} q3,0 3,3 v${hh - 3} z" fill="var(--s-${s})"/>` : `<rect x="${x}" y="${yb - hh}" width="${w}" height="${hh}" fill="var(--s-${s})"/>`; yb -= h; });
    if (e.k.endsWith('Q1')) g += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${e.k.slice(0, 4)}</text>`;
    g += `<rect class="hit${F.qt.has(e.k) ? ' on' : ''}" x="${L + i * bw}" y="${T}" width="${bw}" height="${ph}" data-tog="qt" data-v="${e.k}" data-tip="${esc(tipHtml(e.k, e))}"/>`; });
  g += `<line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" stroke="var(--rule)"/>`;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tickets raised per quarter">${g}</svg>`;
  const peak = series.reduce((a, b) => b.n > a.n ? b : a); $('h-time').textContent = `By created date · peak ${peak.k} (${peak.n}) · click a quarter to filter`;
}
function table() {
  const {k, dir} = rs.sort;
  const rows = ROWS.slice().sort((a, b) => { let x = a[k], y = b[k]; if (k === 'cu') { x = (a.cu || []).length; y = (b.cu || []).length; } if (k === 'ti') { x = a.ti || 9; y = b.ti || 9; } x = x ?? ''; y = y ?? ''; return (typeof x === 'string' ? x.localeCompare(y, undefined, {numeric: true, sensitivity: 'base'}) : (x < y ? -1 : x > y ? 1 : 0)) * dir; });
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per)); rs.page = Math.min(rs.page, pages - 1);
  $('l-title').textContent = plural(rows.length, 'ticket');
  $('pager').innerHTML = pager(rs.page, pages, 'pg');
  document.querySelectorAll('th[data-k]').forEach(th => th.setAttribute('aria-sort', th.dataset.k === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
  $('rows').innerHTML = rows.slice(rs.page * per, rs.page * per + per).map(r => { const cu = r.cuN;
    return `<tr class="rw${rs.open === r.i ? ' open' : ''}" tabindex="0" data-row="${esc(r.i)}" aria-expanded="${rs.open === r.i}"><td class="key"><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.kl || 'FIS')}</a></td><td>${esc(r.t)}${r.role && r.role !== 'canonical' ? ` <span class="role ${r.role}">${r.role}</span>` : ''}</td><td>${esc(r.pr)}</td><td><span class="srcdot"><i style="background:var(--s-${r.s})"></i>${SRC[r.s].one}</span></td><td>${esc(r.st)}</td><td class="cust">${cu.length ? esc(cu.slice(0, 3).join(', ')) + (cu.length > 3 ? ` +${cu.length - 3}` : '') : (r.in ? '<span class="muted">Internal</span>' : '<span class="muted">—</span>')}</td><td>${r.ti ? tchip(r.ti) : '<span class="muted">—</span>'}</td><td class="mono">${esc(r.d || '')}</td><td class="mono">${r.cm || 0}</td></tr>` + (rs.open === r.i ? rowDetail(r) : ''); }).join('') || '<tr><td colspan="9" class="empty">No tickets match these filters. Remove a filter above or turn a source back on.</td></tr>';
}
function rowDetail(r) {
  const dl = []; const add = (a, b) => { if (b) dl.push(`<dt>${a}</dt><dd>${b}</dd>`); };
  const x = needOf(r.cl);
  add('Need', r.cl ? `<button class="linkbtn" data-open="${esc(r.cl)}">${esc(byCl.get(r.cl).name)}</button> <span class="muted">(${esc(r.role || '')})</span>` : '');
  add('KB product', esc(r.pr)); add('Status', esc(r.st)); add('Kind', esc(r.kd)); add('Built today', BUILT[r.bs]); add('Components', esc((r.c || []).join(', ')));
  add('Team', esc(r.tm)); add('Epic', r.ep ? `<span class="mono">${esc(r.ep)}</span> ${esc(r.es || '')}` : '');
  add('Customers', (r.cu || []).map(([n, t]) => `${tchip(t)} ${esc(n)}`).join('<br>') + (r.in ? '<br><span class="muted">Also raised internally</span>' : ''));
  if (r.s === 'I') { add('Total Opportunity', r.op != null ? `<span class="mono">${Math.round(r.op)}</span>` : 'Not yet analysed'); add('Classification', esc(r.fc)); add('Effort', esc(r.ef)); add('Decision', esc(r.ds)); add('Events', esc(r.ev)); }
  add('Votes', r.v ? String(r.v) : ''); add('Comments', String(r.cm || 0));
  return `<tr class="detail"><td colspan="9"><div class="det"><div>${r.w ? `<div class="lbl">What</div><p>${esc(r.w)}</p><div class="lbl">Why</div><p>${esc(r.y || '')}</p><div class="lbl">Outcome</div><p>${esc(r.o || '')}</p>` : `<p>${esc(r.x || 'No text on the ticket.')}</p>`}<p style="margin-top:10px"><a href="${esc(r.u)}" target="_blank" rel="noopener">Open in ${r.s === 'I' ? 'Confluence' : 'Jira'} ↗</a>${x ? ` · <button class="linkbtn" data-open="${esc(r.cl)}">Show its need on the tier map</button>` : ''}</p></div><dl>${dl.join('')}</dl></div></td></tr>`;
}

// ---------- tooltip ----------
const tip = $('tip');
function showTip(e, html) { tip.innerHTML = html; tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px'; }
function hideTip() { tip.hidden = true; }
document.addEventListener('mousemove', e => { if (e.target.closest('#graph')) return; const t = e.target.closest('[data-tip]'); if (!t) { hideTip(); return; } showTip(e, t.dataset.tip); });
addEventListener('scroll', hideTip, {passive: true});

// ---------- views & render ----------
let view = 'map';
function showView(v) {
  view = v;
  ['map', 'needs', 'requests'].forEach(x => { $('v-' + x).hidden = x !== v; $('t-' + x).setAttribute('aria-selected', String(x === v)); $('t-' + x).tabIndex = x === v ? 0 : -1; });
  try { history.replaceState(null, '', '#' + v); } catch (e) {}
  renderView();
}
function renderView() {
  if (view === 'map') { if (ms.dirty) drawGraph(); renderRank(); }
  else if (view === 'needs') renderNeeds();
  else renderRequests();
}
function changed() {
  derive(); ms.dirty = true; rs.page = 0; ns.page = 0;
  if (openFacet) refreshPop(); else renderFacets();
  renderChips(); renderKpis(); renderView();
}
function theme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('pdm-theme', t); } catch (e) {}
  const dark = t === 'dark';
  $('theme').innerHTML = dark ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span class="tl">Light</span>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span class="tl">Dark</span>';
  $('theme').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}

const refocus = sel => { const el = document.querySelector(sel); if (el) el.focus({preventScroll: true}); };
// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target;
  if (openFacet && !t.closest('.facet')) { openFacet = null; renderFacets(); }
  const tabb = t.closest('[data-view]'); if (tabb) { showView(tabb.dataset.view); return; }
  if (t.closest('#theme')) { theme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); return; }
  const fb = t.closest('[data-facet]');
  if (fb) { const k = fb.dataset.facet; openFacet = openFacet === k ? null : k; popQuery = ''; renderFacets(); const inp = document.querySelector('.pop input[type=search]'); (inp || document.querySelector('.pop input[type=checkbox]'))?.focus(); return; }
  if (t.closest('[data-fclose]')) { const k = openFacet; openFacet = null; renderFacets(); document.querySelector(`[data-facet="${k}"]`)?.focus(); return; }
  const fc = t.closest('[data-fclear]'); if (fc) { F[fc.dataset.fclear].clear(); changed(); return; }
  const ch = t.closest('[data-chip]'); if (ch) { F[ch.dataset.chip].delete(ch.dataset.v); changed(); return; }
  if (t.closest('[data-chipsrc]')) { F.src = new Set(ORDER); changed(); return; }
  if (t.closest('[data-chipq]')) { F.q = ''; $('q').value = ''; changed(); return; }
  if (t.closest('#clear-all')) { FACETS.forEach(f => F[f.k].clear()); F.src = new Set(ORDER); F.q = ''; $('q').value = ''; changed(); return; }
  const tg = t.closest('[data-tog]'); if (tg) { toggle(tg.dataset.tog, tg.dataset.v); hideTip(); return; }
  const sb = t.closest('[data-src]'); if (sb) { const k = sb.dataset.src;
    if (F.src.size === 3) F.src = new Set([k]); else if (F.src.has(k)) { F.src.delete(k); if (!F.src.size) F.src = new Set(ORDER); } else F.src.add(k);
    changed(); return; }
  const lb = t.closest('[data-lens]'); if (lb) { ms.lens = +lb.dataset.lens; try { localStorage.setItem('pdm-lens', ms.lens); } catch (_) {} ms.dirty = true; renderView(); return; }
  const op = t.closest('[data-open]'); if (op) { e.preventDefault(); wantFocus = true; openNeed(op.dataset.open); return; }
  const nd = t.closest('[data-node]'); if (nd) { const d = NODES.find(n => n.id === nd.dataset.node); if (d) { wantFocus = true; select(d); } return; }
  const ac = t.closest('[data-addcu]'); if (ac) { F.cu.add(ac.dataset.addcu); changed(); return; }
  const ap = t.closest('[data-addpr]'); if (ap) { F.pr.add(ap.dataset.addpr); changed(); return; }
  const np = t.closest('[data-npg]'); if (np) { ns.page += +np.dataset.npg; renderNeeds(); $('n-title').scrollIntoView({block: 'start'}); return; }
  const pg = t.closest('[data-pg]'); if (pg) { rs.page += +pg.dataset.pg; table(); $('l-title').scrollIntoView({block: 'start'}); return; }
  const nth = t.closest('th[data-nk]'); if (nth) { const k = nth.dataset.nk; ns.sort = {k, dir: ns.sort.k === k ? -ns.sort.dir : (['name', 'product', 'rank', 'tier', 'built'].includes(k) ? 1 : -1)}; renderNeeds(); return; }
  const th = t.closest('th[data-k]'); if (th) { const k = th.dataset.k; rs.sort = {k, dir: rs.sort.k === k ? -rs.sort.dir : (['t', 'k', 'pr', 'st'].includes(k) ? 1 : -1)}; table(); return; }
  if (t.closest('a')) return;
  const nr = t.closest('tr[data-nrow]'); if (nr) { const id = nr.dataset.nrow; ns.open = ns.open === id ? null : id; renderNeeds(); refocus(`tr[data-nrow="${CSS.escape(id)}"]`); return; }
  const rr = t.closest('tr[data-row]'); if (rr) { const id = rr.dataset.row; rs.open = rs.open === id ? null : id; table(); refocus(`tr[data-row="${CSS.escape(id)}"]`); return; }
});
document.addEventListener('change', e => {
  const cb = e.target.closest('[data-fv]'); if (cb && openFacet) { toggle(openFacet, cb.dataset.fv); return; }
  if (e.target.id === 'n-multi') { ns.multi = e.target.checked; ns.page = 0; renderNeeds(); }
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-popq]')) { popQuery = e.target.value; refreshPop(); return; }
});
let qt; $('q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { F.q = e.target.value.trim().toLowerCase(); changed(); }, 180); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && openFacet) { const k = openFacet; openFacet = null; renderFacets(); document.querySelector(`[data-facet="${k}"]`)?.focus(); return; }
  if (e.key === 'Escape' && !openFacet && view === 'map' && ms.sel) { select(null); const f = $('side').querySelector('button'); if (f) f.focus(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-row],tr[data-nrow]')) { e.preventDefault(); e.target.click(); }
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.matches('.tab')) { const tabs = [...document.querySelectorAll('.tab')]; const i = tabs.indexOf(e.target) + (e.key === 'ArrowRight' ? 1 : -1); const nx = tabs[(i + tabs.length) % tabs.length]; nx.focus(); showView(nx.dataset.view); }
});
$('g-fit').addEventListener('click', () => fit(true));
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['map', 'needs', 'requests'].includes(v) && v !== view) showView(v); });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { ms.dirty = true; if (view === 'map') renderView(); }, 250); });

// ---------- boot ----------
theme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
derive(); renderFacets(); renderChips(); renderKpis();
showView(['map', 'needs', 'requests'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'map');
