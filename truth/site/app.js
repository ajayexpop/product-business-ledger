'use strict';
// Product Truth hub. Data is built by truth/tools/truth.py and embedded below the page. The live layer lays Jira
// changes since the snapshot over it (shared database, one viewer refreshes for everyone), and decisions answered on
// the page are stored for the next build. Views are organised so each role has an obvious place to start.
const D = JSON.parse(document.getElementById('truth-data').textContent);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en-GB');
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fdate = s => { if (!s) return ''; const d = String(s).slice(0, 10).split('-'); return d.length < 3 ? String(s) : (+d[2]) + ' ' + MON[+d[1] - 1] + ' ' + d[0]; };
const fdt = s => { const d = new Date(s); return isNaN(d) ? '' : d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fmonth = s => { if (!s) return ''; const d = String(s).split('-'); return MON[+d[1] - 1] + ' ' + d[0]; };
const TODAY = Date.parse(D.meta.today + 'T00:00:00Z');
const daysSince = s => s ? Math.round((TODAY - Date.parse(String(s).slice(0, 10) + (String(s).length === 7 ? '-01' : '') + 'T00:00:00Z')) / 864e5) : null;
const daysTo = s => { const n = daysSince(s); return n == null ? null : -n; };
const ago = s => { const n = daysSince(s); if (n == null) return ''; if (n < 45) return n + ' days ago'; if (n < 540) return Math.round(n / 30.4) + ' months ago'; return (n / 365).toFixed(1).replace('.0', '') + ' years ago'; };
const plural = (n, a, b) => fmt(n) + ' ' + (n === 1 ? a : (b || a + 's'));
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const store = { get(k, d) { try { const v = localStorage.getItem('truth:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem('truth:' + k, JSON.stringify(v)); } catch (e) {} } };
const TH = D.meta.thresholds;

// ------------------------------------------------------------------ indexes
const P = D.products;
const PINFO = Object.fromEntries(D.productInfo.map(p => [p.id, p]));
const PROLL = Object.fromEntries(D.productRoll.map(p => [p.id, p]));
const CL = Object.fromEntries(D.clients.map(c => [c.id, c]));
const ORG = Object.fromEntries(D.orgs.map(o => [o.id, o]));
const SBY = Object.fromEntries(D.stories.map(s => [s.k, s]));
const RBY = Object.fromEntries(D.requests.map(r => [r.id, r]));
const KBY = Object.fromEntries(D.clusters.map(k => [k.id, k]));
const RBYKEY = Object.fromEntries(D.requests.filter(r => r.src !== 'FIS').map(r => [r.id, r]));
const BUGS = Object.fromEntries(D.bugs.map(b => [b.k, b]));
const INCS = Object.fromEntries(D.incidents.map(i => [i.k, i]));
const PROM = Object.fromEntries(D.promises.map(p => [p.id, p]));
const by = (list, f) => { const m = {}; list.forEach(x => (f(x) || []).forEach(id => (m[id] = m[id] || []).push(x))); return m; };
const S_BY_C = by(D.stories, s => s.c), R_BY_C = by(D.requests, r => r.c), K_BY_C = by(D.clusters, k => k.c);
const B_BY_C = by(D.bugs, b => b.c), I_BY_C = by(D.incidents, i => i.c), E_BY_C = by(D.events, e => e.c ? [e.c] : []), PR_BY_C = by(D.promises, p => p.c ? [p.c] : []);
const B_BY_EV = by(D.bugs, b => b.ev ? [norm(b.ev)] : []);
const nameOf = id => CL[id] ? CL[id].sh : ORG[id] ? ORG[id].n : id;
const fullName = id => CL[id] ? CL[id].n : ORG[id] ? ORG[id].n : id;
const tierOf = id => CL[id] ? CL[id].t : null;
const isClient = id => CL[id] && CL[id].k === 'client';
const DRV = {R: 'Increase revenue', C: 'Protect churn', X: 'Reduce cost', A: 'Avoid cost'};
const DRV_HINT = {R: 'new money: sell, upsell or win a deal', C: 'keep existing clients: their asks, pain and live events', X: 'remove cost we pay today: manual work, support, infrastructure', A: 'prevent future cost: tech debt, maintenance, security, risk'};
const STAGE = {D: 'Done', P: 'In progress', N: 'Not started'};
const BUILT = {none: 'Not built', related: 'Related work only', partial: 'Partly built', built: 'Already built'};
const BUILT_HINT = {none: 'Nothing delivered covers it', related: 'Delivered work sits in the same area but answers a different need', partial: 'The base exists; the ask extends it', built: 'Delivered as asked'};
const BASIS = {c: 'classified from its content', o: 'placed by its Jira component', t: 'placed by its roadmap theme (low confidence)', n: 'no product signal'};
const THEME = Object.fromEntries(D.themes.map(t => [t.id, t.n]));
const SEV = ['Urgent', 'High', 'Medium', 'Low'];
const sevRank = p => { const i = SEV.indexOf(p); return i < 0 ? 9 : i; };
const isSevere = p => TH.severeBugPriorities.includes(p);
const jiraUrl = k => 'https://expoplatform.atlassian.net/browse/' + k;
const shipped12 = id => (S_BY_C[id] || []).filter(s => s.g === 'D' && s.d && daysSince(s.d) <= 365).length;
const isOpenNeed = k => k.b === 'none' || k.b === 'related';
const openNeeds = id => (K_BY_C[id] || []).filter(isOpenNeed);
const renewalDays = c => c.rnd ? daysTo(c.rnd) : null;
const incOpen = i => !/done|cancel|closed|resolved/i.test(i.st || '');
const TEAMS = [...new Set([].concat(D.stories.map(s => s.tm), D.bugs.map(b => b.tm), D.promises.map(p => p.tm)).filter(Boolean))].sort();
const OWNERS = [...new Set(D.clients.filter(c => c.k === 'client').map(c => c.ow).filter(Boolean))].sort();
const RANKPOS = Object.fromEntries(D.ranking.map((id, i) => [id, i]));
const staleSources = D.quality.sources.filter(s => s.state !== 'fresh');
const promiseDue = p => p.due || (p.mo ? p.mo + '-28' : null);
function upcomingShows(weeks) {
  return D.events.filter(e => isClient(e.c) && e.s && daysTo(e.s) >= 0 && (weeks == null || daysTo(e.s) <= weeks * 7) && !/cancel/i.test(e.st || ''))
    .sort((a, b) => a.s.localeCompare(b.s));
}
function showRisk(e) {
  const tagged = (B_BY_EV[norm(e.n)] || []).filter(b => (b.c || []).includes(e.c));
  const other = (B_BY_C[e.c] || []).filter(b => !tagged.includes(b));
  const proms = (PR_BY_C[e.c] || []).filter(p => !p.fl.includes('shipped'));
  const before = proms.filter(p => { const d = promiseDue(p); return d && d <= e.s; });
  const after = proms.filter(p => { const d = promiseDue(p); return d && d > e.s; });
  const teams = [...new Set(tagged.concat(other).map(b => b.tm).filter(Boolean))];
  return {tagged, other, proms, before, after, teams, severe: tagged.concat(other).filter(b => isSevere(b.pr)).length};
}

// ------------------------------------------------------------------ icons
const IC = {
  show: '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>',
  bugs: '<rect x="5" y="5" width="6" height="8" rx="3"/><path d="M8 5V3M3 8h2M11 8h2M3.5 12l2-1M12.5 12l-2-1M3.5 4.5l2 1.5M12.5 4.5l-2 1.5"/>',
  incident: '<path d="M9 1.8 3.5 9h4l-1 5.2L12.5 7h-4z"/>',
  promise: '<path d="M3.5 14V2.5M3.5 3h8l-1.8 2.8 1.8 2.7h-8"/>',
  asks: '<path d="M2.5 9.5 4.5 3h7l2 6.5v3.5h-11z"/><path d="M2.5 9.5h3l1 1.5h3l1-1.5h3"/>',
  quiet: '<circle cx="8" cy="8" r="5.5"/><path d="M6.5 6v4M9.5 6v4"/>',
  health: '<path d="M8 13.5S2.5 10 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10 8 13.5 8 13.5z"/>',
  renewal: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3"/>',
  ship: '<path d="M3 8.5 6.5 12 13 4.5"/>', start: '<path d="M5 3.5v9l7-4.5z"/>', up: '<path d="M8 13V3M4 7l4-4 4 4"/>', down: '<path d="M8 3v10M4 9l4 4 4-4"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>', back: '<path d="M10 3 5 8l5 5"/>', ext: '<path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5"/>',
  help: '<circle cx="8" cy="8" r="6"/><path d="M6.3 6.3a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.1v.4M8 11.6v.1"/>'
};
const ico = n => '<svg viewBox="0 0 16 16" aria-hidden="true">' + (IC[n] || '') + '</svg>';
const FLAG_LABEL = {show: 'A show inside ' + TH.showWindowDays + ' days', bugs: 'Urgent or High open client bugs', incident: 'An incident in the last ' + TH.incidentWindowDays + ' days', promise: 'A promise overdue, due soon or drifting', asks: TH.manyAsks + ' or more open requests', quiet: 'Nothing delivered for them in ' + TH.quietDeliveryDays + ' days', health: 'Health score ' + TH.lowHealthAtOrBelow + ' or lower'};
const flagChip = f => '<span class="chip f-' + f.id + '" title="' + esc(FLAG_LABEL[f.id] || '') + '">' + ico(f.id) + esc(f.text.replace(/^Planhat health/, 'Health score')) + '</span>';
const renewChip = c => { const d = renewalDays(c); if (d == null || d > 90) return '';
  return '<span class="chip f-renewal" title="Renewal date ' + esc(c.rn) + '">' + ico('renewal') + (d < 0 ? 'Renewal date passed ' + fdate(c.rnd) : 'Renews in ' + d + ' days') + '</span>'; };
const tierB = t => '<span class="tier ' + (t ? 't' + t : 't0') + '" title="' + (t ? 'Sales Tier ' + t + (t === 1 ? ' (our largest clients)' : '') : 'No Sales Tier') + '">' + (t ? 'T' + t : '–') + '</span>';
const LVL_HINT = {act: 'Act: a show inside ' + TH.showWindowDays / 7 + ' weeks and 3 or more flags', watch: 'Watch: 2 or more flags', calm: 'Calm: fewer than 2 flags'};
const lvlB = l => '<span class="lvl ' + l + '" title="' + esc(LVL_HINT[l] || '') + '">' + ({act: 'Act', watch: 'Watch', calm: 'Calm'}[l] || l) + '</span>';
const builtB = b => '<span class="built b-' + b + '" title="' + esc(BUILT_HINT[b] || '') + '">' + esc(BUILT[b] || b) + '</span>';
const drvB = v => v ? '<span class="drv ' + v + '" title="' + esc(DRV_HINT[v]) + '">' + DRV[v] + '</span>' : '<span class="muted small">No driver</span>';
const jiraA = k => /^[A-Z]+-\d+$/.test(k) ? '<a class="jira" href="' + jiraUrl(k) + '" target="_blank" rel="noopener">' + esc(k) + '</a>' : '<span class="jira">' + esc(String(k).replace(/^FIS-/, 'FIS ')) + '</span>';
const jiraS = k => '<span class="jira">' + esc(String(k).replace(/^FIS-/, 'FIS ')) + '</span>';
const tdot = t => t ? '<i class="tdot t' + t + '" aria-hidden="true"></i><b class="tl">T' + t + '</b> ' : '';
const clientChip = id => CL[id] ? '<button class="chip cchip" data-open="client:' + esc(id) + '">' + tdot(CL[id].t) + esc(nameOf(id)) + '</button>'
  : '<span class="chip" title="Not a ledger client">' + esc(nameOf(id)) + '</span>';
const clientTag = id => '<span class="chip">' + tdot(tierOf(id)) + esc(nameOf(id)) + '</span>';
const scoreHint = 'Demand score: for each distinct customer asking, Tier 1 counts 8, Tier 2 4, Tier 3 2, Tier 4 1';

// ------------------------------------------------------------------ state
const TABS = [
  {id: 'today', label: 'Today'}, {id: 'clients', label: 'Clients'}, {id: 'shows', label: 'Shows'}, {id: 'quality', label: 'Quality'},
  {id: 'products', label: 'Products'}, {id: 'demand', label: 'Demand'}, {id: 'delivery', label: 'Delivery'}, {id: 'system', label: 'System'}];
const ROLES = {
  lead: {label: 'Leadership', intro: 'Which key accounts are at risk, what we are building for, and what changed.'},
  product: {label: 'Product', intro: 'What to build next and why, demand by product, and what we promised.'},
  eng: {label: 'Engineering', intro: 'Shows at risk from open bugs, load by team, and what is in progress.'},
  cs: {label: 'Customer Success', intro: 'Your clients: who to call before their show, renewals coming, and what they asked for.'}
};
const DEF = {
  clients: {q: '', tier: 'all', level: 'all', owner: '', renew: 'all', all: false, sort: 'attention', dir: 1},
  shows: {weeks: '8', tier: 'all', risk: false},
  quality: {sub: 'bugs', pr: 'severe', tm: '', p: '', soon: false, openInc: true},
  demand: {q: '', p: '', b: 'open', tier: 'all', best: false, multi: false, sort: 'score', limit: 50},
  delivery: {q: '', y: 'all', g: 'D', p: '', tm: '', v: '', who: 'all', cf: false, limit: 60, sort: 'd', dir: -1},
  products: {sort: 'domain'}
};
const clone = o => JSON.parse(JSON.stringify(o));
const saved = store.get('prefs', {});
const S = Object.assign(clone(DEF), {tab: 'today', role: saved.role || 'lead', myOwner: saved.myOwner || ''});
if (saved.products) S.products = saved.products;
const savePrefs = () => store.set('prefs', {role: S.role, myOwner: S.myOwner, products: S.products});
const isDefault = tab => JSON.stringify(Object.assign({}, S[tab], {limit: 0})) === JSON.stringify(Object.assign({}, DEF[tab], {limit: 0}));

// ------------------------------------------------------------------ live layer (Jira changes since the snapshot)
const LIVE = {db: null, mcp: null, user: null, recs: {}, state: null, running: false, err: null, stop: false, ready: false, canWrite: null, note: ''};
const LV = D.meta.live, BASELINE = D.meta.snapshot.ledger || D.meta.today;
const liveFor = id => Object.values(LIVE.recs).filter(r => (r.c || []).includes(id)).sort((a, b) => String(b.up).localeCompare(String(a.up)));
const liveList = () => Object.values(LIVE.recs).sort((a, b) => String(b.up).localeCompare(String(a.up)));
const EVT = {
  'ship': {ico: 'ship', cls: 'ship', txt: 'Story shipped'}, 'start': {ico: 'start', cls: '', txt: 'Story started'},
  'bug-new': {ico: 'bugs', cls: 'bug', txt: 'New client bug'}, 'bug-closed': {ico: 'ship', cls: 'ship', txt: 'Client bug closed'},
  'inc-new': {ico: 'incident', cls: 'inc', txt: 'New incident'}, 'inc-moved': {ico: 'incident', cls: 'inc', txt: 'Incident updated'},
  'ask-new': {ico: 'asks', cls: 'ask', txt: 'New request'}, 'ask-moved': {ico: 'asks', cls: 'ask', txt: 'Request moved'},
  'ask-closed': {ico: 'asks', cls: '', txt: 'Request closed'}
};
function mapLabels(vals) {
  const out = [];
  (vals || []).forEach(v => { const k = norm(v); if (!k || k === 'internal') return; const id = D.alias[k]; if (id && !out.includes(id)) out.push(id); });
  return out;
}
function classify(n) {
  const f = n.fields || {}, st = f.status || {}, sc = (st.statusCategory || {}).key || '', stn = st.name || '';
  const type = /^IMP-/.test(n.key) ? 'I' : ({Bug: 'B', Story: 'S', 'Feature Request': 'F'}[(f.issuetype || {}).name] || '');
  const vals = v => Array.isArray(v) ? v.map(x => x && typeof x === 'object' ? (x.value || x.name || '') : String(x || '')).filter(Boolean)
    : (v && typeof v === 'object' ? [v.value || v.name].filter(Boolean) : (v ? [String(v)] : []));
  const labels = vals(f.customfield_10145).concat(vals(f.customfield_12190));
  const cr = String(f.created || '').slice(0, 10), up = String(f.updated || '').slice(0, 16);
  const rej = /reject|cancel|won.?t|duplicate|invalid/i.test(stn);
  let kind = null, c = mapLabels(labels);
  if (type === 'B') {
    const base = BUGS[n.key];
    if (base) { c = base.c.length ? base.c : c; if (sc === 'done' || rej) kind = 'bug-closed'; }
    else if (c.length && sc !== 'done' && !rej && cr >= BASELINE) kind = 'bug-new';
  } else if (type === 'I') {
    const base = INCS[n.key];
    if (base) { c = base.c.length ? base.c : c; if (stn !== base.st) kind = 'inc-moved'; }
    else if (cr >= BASELINE) kind = 'inc-new';
  } else if (type === 'S') {
    const base = SBY[n.key];
    if (base) { c = base.c.length ? base.c : c; if (sc === 'done' && !rej && base.g !== 'D') kind = 'ship'; else if (sc === 'indeterminate' && base.g === 'N') kind = 'start'; }
  } else if (type === 'F') {
    const base = RBYKEY[n.key];
    if (base) { c = base.c.length ? base.c : c; if (rej || sc === 'done') kind = 'ask-closed'; else if (stn !== base.st) kind = 'ask-moved'; }
    else if (cr >= BASELINE && !rej) kind = 'ask-new';
  }
  if (!kind) return null;
  return {k: n.key, t: type, kind, s: String(f.summary || '').slice(0, 200), st: stn, sc, p: (f.priority || {}).name || '', cr, up, c, lab: labels.slice(0, 6)};
}
const bucketOf = k => { let h = 0; for (const ch of String(k)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'b' + String(h % 8).padStart(2, '0'); };
const TAB_ID = Math.random().toString(36).slice(2, 10);
async function useCap(n) { try { return (window.claude && window.claude.use) ? await window.claude.use(n) : null; } catch (e) { return null; } }
async function liveBoot() {
  [LIVE.db, LIVE.user] = await Promise.all([useCap('db'), useCap('user')]);
  if (LIVE.user) { try { LIVE.canWrite = await LIVE.user.can('data.write'); } catch (e) { LIVE.canWrite = null; } }
  decisionsBoot();
  if (!LIVE.db) { livePaint(); return; }
  LIVE.db.doc('live/state').onSnapshot(s => { LIVE.state = s.exists ? s.data() : null; livePaint(); }, e => { LIVE.err = {code: (e && e.code) || 'unavailable'}; livePaint(); });
  LIVE.db.collection('live').onSnapshot(s => {
    const recs = {};
    s.docs.forEach(d => { if (!/^b\d\d$/.test(d.id)) return; const r = (d.data() || {}).r || {}; Object.keys(r).forEach(k => { if (r[k] && typeof r[k] === 'object') recs[k] = r[k]; }); });
    const changed = Object.keys(recs).length !== Object.keys(LIVE.recs).length || Object.keys(recs).some(k => !LIVE.recs[k] || LIVE.recs[k].up !== recs[k].up || LIVE.recs[k].kind !== recs[k].kind);
    LIVE.recs = recs; LIVE.ready = true;
    if (changed) { render(); if (DR.stack.length) paintDrawer(); }
    livePaint(); liveMaybe();
  }, e => { LIVE.err = {code: (e && e.code) || 'unavailable'}; livePaint(); });
  LIVE.mcp = await useCap('mcp');
  livePaint(); liveMaybe();
  setInterval(liveMaybe, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) liveMaybe(); });
}
const liveAge = () => { const t = LIVE.state && Date.parse(LIVE.state.lastRun); return t ? Date.now() - t : Infinity; };
function liveMaybe() {
  if (LIVE.running || LIVE.stop || !LIVE.mcp || !LIVE.db || !LIVE.ready || LIVE.canWrite === false) return;
  if (liveAge() >= LV.everyHours * 3600e3) liveRun(false);
}
const LIVE_ERR = {
  needs_reauth: 'Your Atlassian connection has expired. Reconnect Atlassian in claude.ai Settings → Connectors, then reload.',
  server_not_connected: 'Atlassian is not connected to your claude.ai account. Add it in Settings → Connectors so this page can refresh Jira for everyone.',
  selection_required: 'You have more than one Atlassian connector. Choose one when claude.ai asks, then reload.',
  not_in_manifest: 'Jira access was declined for this page. Allow Atlassian for it to refresh, or let a colleague open it.',
  blocked_by_policy: 'Your organisation blocks this Jira search for you. Another viewer can refresh it.',
  approval_required: 'Your organisation needs each Jira call approved, which pages cannot ask for yet.',
  server_unavailable: 'Jira did not answer in time. The page tries again on its next check.',
  invalid_argument: 'Your access to this page is view-only, so you cannot store a refresh for others.',
  not_granted: 'Connectors are not available in this view of the page.', capability_disabled: 'Connectors are not available in this view of the page.'
};
const liveErrText = e => LIVE_ERR[e && e.code] || ('Jira refused the search' + (e && e.message ? ': ' + String(e.message).slice(0, 140) : '') + '. The page tries again later.');
const STOP = new Set(['needs_reauth', 'server_not_connected', 'selection_required', 'not_in_manifest', 'blocked_by_policy', 'approval_required', 'not_granted', 'capability_disabled', 'invalid_argument', 'bad_request']);
async function liveRun(manual) {
  if (LIVE.running) return;
  LIVE.running = true; LIVE.err = null; LIVE.note = ''; livePaint();
  const holder = 'tab:' + TAB_ID, lock = LIVE.db.doc('live/lock');
  try {
    const l = await lock.acquire({holder, ttlMs: 240000});
    if (!l.acquired) { LIVE.note = 'A colleague is refreshing Jira right now; their result appears here when it lands.'; return; }
    const cur = await LIVE.db.doc('live/state').get(), st = cur.exists ? cur.data() : null;
    const age = st && Date.parse(st.lastRun) ? Date.now() - Date.parse(st.lastRun) : Infinity;
    if (!manual && age < LV.everyHours * 3600e3) { LIVE.state = st; return; }
    const iso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const since = isFinite(age) ? '"-' + (Math.ceil(age / 3600e3) + 1) + 'h"' : '"' + BASELINE + '"';
    const jql = LV.jql + ' AND updated >= ' + since + ' ORDER BY updated ASC';
    const fields = ['summary', 'status', 'priority', 'issuetype', 'created', 'updated', 'customfield_10145', 'customfield_12190'];
    let token = null, pages = 0, seen = 0; const recs = {};
    do {
      const input = {cloudId: LV.site, jql, fields, maxResults: 100}; if (token) input.nextPageToken = token;
      const res = await LIVE.mcp.callTool(LV.server, LV.tool, input, {cache: false});
      let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { throw {code: 'tool_error', message: 'Jira answered in a format this page does not read'}; } }
      const iss = p && p.issues; let nodes = [];
      if (Array.isArray(iss)) { nodes = iss; token = p.isLast === false || p.nextPageToken ? p.nextPageToken || null : null; }
      else if (iss && Array.isArray(iss.nodes)) { nodes = iss.nodes; token = iss.pageInfo && iss.pageInfo.hasNextPage ? iss.pageInfo.endCursor : null; }
      else throw {code: 'tool_error', message: 'Jira returned no issue list'};
      nodes.forEach(n => { seen++; const r = classify(n); if (r) recs[r.k] = r; else if (LIVE.recs[n.key]) recs[n.key] = Object.assign({}, LIVE.recs[n.key], {gone: 1, up: String((n.fields || {}).updated || '').slice(0, 16)}); });
      pages++; if (pages % 4 === 0) await lock.acquire({holder, ttlMs: 240000});
    } while (token && pages < 40);
    const byB = {};
    Object.values(recs).forEach(r => { if (r.gone) return; (byB[bucketOf(r.k)] = byB[bucketOf(r.k)] || {})[r.k] = r; });
    const removed = Object.values(recs).filter(r => r.gone);
    removed.forEach(r => { const b = bucketOf(r.k); byB[b] = byB[b] || {}; });
    for (const b of Object.keys(byB).sort()) {
      const ref = LIVE.db.doc('live/' + b), g = await ref.get(), cur = g.exists ? ((g.data() || {}).r || {}) : {};
      const next = Object.assign({}, cur, byB[b]); removed.filter(r => bucketOf(r.k) === b).forEach(r => delete next[r.k]);
      await ref.set({r: next, at: iso});
    }
    const cnt = {}; Object.values(recs).forEach(r => { if (!r.gone) cnt[r.kind] = (cnt[r.kind] || 0) + 1; });
    const me = LIVE.user && LIVE.user.id ? await Promise.resolve(LIVE.user.id()).catch(() => null) : null;
    const run = {at: iso, by: me, seen, kept: Object.keys(recs).length, since: since.replace(/"/g, ''), manual: !!manual, cnt};
    const runs = ((st && Array.isArray(st.runs)) ? st.runs : []).concat([run]).slice(-20);
    await LIVE.db.doc('live/state').set({lastRun: iso, lastBy: me, baseline: BASELINE, everyHours: LV.everyHours, runs});
    if (manual) toast('Jira refreshed: ' + plural(seen, 'issue') + ' read, ' + plural(Object.keys(recs).length, 'change') + ' kept.');
  } catch (e) {
    LIVE.err = {code: (e && e.code) || 'upstream_error', message: (e && e.message) || ''};
    if (STOP.has(LIVE.err.code)) LIVE.stop = true;
    if (manual) toast(liveErrText(LIVE.err), true);
  } finally {
    LIVE.running = false; livePaint();
  }
}
function livePaint() {
  const el = $('#livePill'); if (!el) return;
  const n = Object.keys(LIVE.recs).length;
  el.className = 'pill'; let t;
  if (LIVE.running) { el.classList.add('busy'); t = 'Reading Jira…'; }
  else if (!LIVE.db) { el.classList.add('off'); t = 'Snapshot only'; }
  else if (LIVE.err && !n) { el.classList.add('off'); t = 'Jira: not refreshed'; }
  else if (LIVE.state) { el.classList.add('live'); t = 'Jira live · ' + plural(n, 'change'); }
  else { el.classList.add('off'); t = 'Jira: waiting'; }
  el.textContent = t;
  el.title = !LIVE.db ? 'Outside claude.ai the page shows the built snapshot only. Inside claude.ai it lays Jira changes over it.' : LIVE.state ? 'Last Jira refresh ' + fdt(LIVE.state.lastRun) + '. Changes since the ' + fdate(BASELINE) + ' snapshot.' : (LIVE.err ? liveErrText(LIVE.err) : 'The first Jira refresh runs when someone with Atlassian connected opens the page.');
  const feed = $('#liveFeed'); if (feed) feed.innerHTML = feedHTML(8);
}

// ------------------------------------------------------------------ decisions on the page
const DEC = {rows: {}, names: {}, canEdit: false};
async function decisionsBoot() {
  if (LIVE.user) { try { DEC.canEdit = !!(await LIVE.user.canEdit()); } catch (e) {} }
  if (S.tab === 'system') renderSystemDecisions();
  if (!LIVE.db) return;
  LIVE.db.collection('decisions').onSnapshot(async s => {
    const rows = {}; s.docs.forEach(d => { rows[d.id] = d.data(); }); DEC.rows = rows;
    const ids = [...new Set(Object.values(rows).map(r => r.by).filter(Boolean))];
    if (ids.length && LIVE.user && LIVE.user.profiles) { try { const ps = await LIVE.user.profiles(ids); ids.forEach(i => { DEC.names[i] = (ps[i] && ps[i].name) || 'Someone'; }); } catch (e) {} }
    if (S.tab === 'system') renderSystemDecisions();
    paintTabs();
  }, () => {});
}
const openDecisions = () => D.meta.decisions.filter(d => !d.state.decided && !DEC.rows[d.id]).length;
const decTitle = id => { const d = D.meta.decisions.find(x => x.id === id); return d ? d.title : id; };
const decLink = id => '<button class="link" data-go="system:decisions" title="' + esc(decTitle(id)) + '">decision ' + id + '</button>';
async function saveDecision(id, choice, note) {
  if (!LIVE.db) return toast('Decisions can be saved only inside claude.ai.', true);
  const prev = DEC.rows[id] || {}; const me = LIVE.user && LIVE.user.id ? await Promise.resolve(LIVE.user.id()).catch(() => null) : null;
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const h = (Array.isArray(prev.h) ? prev.h : []).concat([{at, by: me, from: prev.choice ?? null, to: choice, note}]).slice(-20);
  try { await LIVE.db.doc('decisions/' + id).set({id, choice, note, by: me, at, h}); toast('Saved. It applies at the next build.'); }
  catch (e) { toast(e && (e.code === 'not_granted' || e.code === 'invalid_argument') ? 'Only editors of this page can decide.' : 'Could not save the decision (' + ((e && e.code) || 'error') + ').', true); }
}

// ------------------------------------------------------------------ shell
function paintTabs() {
  const act = D.clients.filter(c => c.g.level === 'act' && c.k === 'client').length;
  const shows = upcomingShows(TH.showWindowDays / 7).length;
  const severe = D.bugs.filter(b => isSevere(b.pr)).length;
  const dec = openDecisions();
  const badge = {clients: [act, 'hot', 'Clients to act on'], shows: [shows, '', 'Shows in the next ' + TH.showWindowDays / 7 + ' weeks'], quality: [severe, '', 'Urgent or High open client bugs'], system: [dec, '', 'Open decisions']};
  $('#tabs').innerHTML = TABS.map(t => { const b = badge[t.id];
    return '<button class="tab" role="tab" id="tab-' + t.id + '" aria-controls="main" aria-selected="' + (S.tab === t.id) + '" data-tab="' + t.id + '">' + t.label +
      (b && b[0] ? '<span class="n ' + b[1] + '" title="' + b[2] + '">' + b[0] + '</span>' : '') + '</button>'; }).join('');
  const sel = $('#tab-' + S.tab), bar = $('#tabs');
  if (sel && bar && bar.scrollWidth > bar.clientWidth + 30 && (sel.offsetLeft < bar.scrollLeft || sel.offsetLeft + sel.offsetWidth > bar.scrollLeft + bar.clientWidth - 30)) bar.scrollLeft = Math.max(0, sel.offsetLeft - bar.clientWidth / 2 + sel.clientWidth / 2);
}
function setTab(t, opts = {}) {
  S.tab = t;
  if (!opts.fromHash) history.replaceState(null, '', '#' + t);
  paintTabs(); render(); if (!opts.keepScroll) window.scrollTo({top: 0});
  $('#main').focus({preventScroll: true});
}
function render() {
  const m = $('#main');
  const fn = {today: vToday, clients: vClients, shows: vShows, quality: vQuality, products: vProducts, demand: vDemand, delivery: vDelivery, system: vSystem}[S.tab] || vToday;
  m.innerHTML = '<div class="view">' + fn() + '</div>';
  if (S.tab === 'system') renderSystemDecisions();
  if (S.tab === 'delivery') paintDeliveryChart();
  livePaint();
}
const lede = (h, p, extra = '') => '<div class="lede"><div><h1>' + h + '</h1>' + (p ? '<p>' + p + '</p>' : '') + '</div>' + extra + '</div>';
const asofLine = () => '<div class="asof" title="Client data: the ledger and Planhat as read on ' + fdate(D.meta.snapshot.ledger) + '. Shows: the OP event project as read on ' + fdate(D.meta.snapshot.events) + '. Built: when this page was generated.">Client data <b>' + fdate(D.meta.snapshot.ledger) + '</b> · shows <b>' + fdate(D.meta.snapshot.events) + '</b> · built <b>' + fdate(D.meta.builtAt) + '</b></div>';
const staleBanner = () => staleSources.length ? '<div class="banner" role="note">' + ico('renewal') + '<span><b>' + staleSources.map(s => s.name).join(', ') + '</b> ' + (staleSources.length > 1 ? 'are' : 'is') + ' ' + staleSources.map(s => s.ageDays + ' days old').join(', ') + ' (limit ' + staleSources.map(s => s.maxAgeDays).join(', ') + '). Bugs, health and shows may have moved since. <button class="link" data-go="system:sources">See sources</button></span></div>' : '';
const activeLine = tab => isDefault(tab) ? '' : '<div class="active">Filters are on <button class="reset" data-reset="' + tab + '">Clear all</button></div>';
const segF = (path, val, opts, label) => '<div class="seg" role="group" aria-label="' + esc(label) + '">' + opts.map(([v, l, t]) => '<button data-f="' + path + '" data-v="' + v + '" aria-pressed="' + (String(val) === v) + '"' + (t ? ' title="' + esc(t) + '"' : '') + '>' + l + '</button>').join('') + '</div>';
const selF = (path, val, opts, label, id) => '<span class="fld"><label class="field" for="' + id + '">' + label + '</label><select class="inp" id="' + id + '" data-select="' + path + '">' + opts.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></span>';
const chkF = (path, val, label, title) => '<label class="toggle"' + (title ? ' title="' + esc(title) + '"' : '') + '><input type="checkbox" data-check="' + path + '"' + (val ? ' checked' : '') + '> ' + label + '</label>';
const th = (tab, k, l, cls = '', title = '') => { const f = S[tab]; return '<th class="' + cls + '" aria-sort="' + (f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '><button data-sort="' + tab + ':' + k + '">' + l + '</button></th>'; };

// ------------------------------------------------------------------ Today (one front door per role)
const stat = (k, v, d, go, cls = '', title = '') => '<button class="stat" data-go="' + go + '"' + (title ? ' title="' + esc(title) + '"' : '') + '><span class="k">' + k + '</span><span class="v ' + cls + '">' + v + '</span><span class="d">' + d + '</span></button>';
function vToday() {
  const r = S.role, R = ROLES[r];
  let h = '<div class="lede"><div><h1>Where to look this week</h1><p>' + esc(R.intro) + ' Every number opens its evidence. Terms are explained under <button class="link" data-guide>How to read this</button>.</p></div>' + asofLine() + '</div>';
  h += '<div class="rolebar"><span class="field">Show me what matters to</span>' + segF('role', r, Object.entries(ROLES).map(([k, v]) => [k, v.label]), 'Role') +
    (r === 'cs' ? selF('myOwner', S.myOwner, [['', 'All owners']].concat(OWNERS.map(o => [o, o])), 'Owner', 'own') : '') + '</div>';
  h += staleBanner();
  h += ({lead: todayLead, product: todayProduct, eng: todayEng, cs: todayCS}[r])();
  return h;
}
function changedBlock() {
  return '<section class="sec" id="feed"><div class="sec-h"><h2>What changed</h2></div>' +
    '<div class="card block"><h3>Since the last build<small>' + (D.changes.diffs.length ? fdt(D.changes.diffs[0].to) : 'baseline ' + fdate(D.changes.baselineAt)) + '</small></h3><div class="list feed">' + buildDiffHTML(8) + '</div></div>' +
    '<div class="card block"><h3>In Jira since the snapshot<small>' + (LIVE.mcp && LIVE.db && LIVE.canWrite !== false ? '<button class="link" id="refreshNow">Refresh now</button>' : 'live in claude.ai') + '</small></h3><div class="list feed" id="liveFeed">' + feedHTML(8) + '</div></div>' +
    (LIVE.note ? '<div class="prov">' + esc(LIVE.note) + '</div>' : '') + '</section>';
}
const DIFF = {
  level: x => ({ico: x.up ? 'up' : 'down', cls: x.up ? 'bug' : 'ship', t: esc(fullName(x.id)) + ' moved from ' + x.from + ' to ' + x.to, ref: 'client:' + x.id}),
  'bug-new': x => ({ico: 'bugs', cls: 'bug', t: 'New client bug ' + esc(x.id) + (BUGS[x.id] ? ': ' + esc(BUGS[x.id].s) : ''), href: jiraUrl(x.id)}),
  'bug-gone': x => ({ico: 'ship', cls: 'ship', t: 'Client bug ' + esc(x.id) + ' closed', href: jiraUrl(x.id)}),
  'inc-new': x => ({ico: 'incident', cls: 'inc', t: 'New incident ' + esc(x.id), href: jiraUrl(x.id)}),
  'inc-moved': x => ({ico: 'incident', cls: 'inc', t: 'Incident ' + esc(x.id) + ' moved to ' + esc(x.to), href: jiraUrl(x.id)}),
  shipped: x => ({ico: 'ship', cls: 'ship', t: 'Shipped: ' + esc((SBY[x.id] || {}).s || x.id), ref: 'story:' + x.id}),
  started: x => ({ico: 'start', cls: '', t: 'Started: ' + esc((SBY[x.id] || {}).s || x.id), ref: 'story:' + x.id}),
  'story-new': x => ({ico: 'start', cls: '', t: 'New story: ' + esc((SBY[x.id] || {}).s || x.id), ref: 'story:' + x.id}),
  'top-new': x => ({ico: 'asks', cls: 'ask', t: 'New top priority: ' + esc((KBY[x.id] || {}).n || x.id), ref: 'need:' + x.id}),
  'top-gone': x => ({ico: 'asks', cls: '', t: 'No longer top priority: ' + esc((KBY[x.id] || {}).n || x.id), ref: 'need:' + x.id}),
  't1-new': x => ({ico: 'asks', cls: 'ask', t: 'New Tier 1 need: ' + esc((KBY[x.id] || {}).n || x.id), ref: 'need:' + x.id}),
  'promise-risk': x => ({ico: 'promise', cls: 'bug', t: 'Promise now ' + x.flags.join(', ') + ': ' + esc((PROM[x.id] || {}).f || x.id)})
};
function buildDiffHTML(limit) {
  const d = D.changes.diffs[0];
  if (!d) return '<div class="empty"><b>Nothing to compare yet</b>The hub took its baseline on ' + fdate(D.changes.baselineAt) + '. From the next rebuild, clients changing level, bugs opened and closed, stories shipped and new top priorities appear here.</div>';
  const order = ['level', 'promise-risk', 'bug-new', 'inc-new', 'top-new', 't1-new', 'shipped', 'bug-gone', 'inc-moved', 'started', 'top-gone', 'story-new'];
  const items = d.items.slice().sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
  return items.slice(0, limit).map(x => { const v = (DIFF[x.t] || (() => ({ico: 'asks', cls: '', t: x.t})))(x);
    const inner = '<span class="ico ' + v.cls + '">' + ico(v.ico) + '</span><span><span class="t">' + v.t + '</span></span>';
    return v.href ? '<a class="li" href="' + v.href + '" target="_blank" rel="noopener">' + inner + '</a>' : v.ref ? '<button class="li" data-open="' + esc(v.ref) + '">' + inner + '</button>' : '<div class="li">' + inner + '</div>'; }).join('') +
    (d.total > limit ? '<div class="more"><span class="muted small">' + plural(d.total - limit, 'more change') + ' between ' + fdt(d.from) + ' and ' + fdt(d.to) + '.</span></div>' : '');
}
function actCards(list, empty) {
  return list.length ? '<div class="cards">' + list.map(actCard).join('') + '</div>' : '<div class="card empty">' + empty + '</div>';
}
const rankedClients = () => D.ranking.map(id => CL[id]);
function mixByYear() {
  const ys = ['2023', '2024', '2025', '2026'], m = {};
  ys.forEach(y => { m[y] = {R: 0, C: 0, X: 0, A: 0, t: 0}; });
  D.stories.forEach(s => { if (s.g === 'D' && m[s.y] && s.v) { m[s.y][s.v]++; m[s.y].t++; } });
  return '<div class="card pad mix"><div class="sec-h"><h2 style="font-size:15px">What we build for, by year</h2><span class="hint">Share of finished stories by value driver</span></div>' +
    ys.map(y => '<div class="mixrow"><span class="y">' + y + (y === D.meta.today.slice(0, 4) ? '<small>to date</small>' : '') + '</span><div class="stack">' + ['R', 'C', 'X', 'A'].map(v => '<i style="width:' + (m[y][v] / (m[y].t || 1) * 100) + '%;background:var(--d-' + v + ')" title="' + DRV[v] + ': ' + m[y][v] + '"></i>').join('') + '</div><span class="pct">' + Math.round(m[y].R / (m[y].t || 1) * 100) + '% revenue</span></div>').join('') +
    '<div class="legend">' + ['R', 'C', 'X', 'A'].map(v => '<span class="drv ' + v + '" title="' + esc(DRV_HINT[v]) + '">' + DRV[v] + '</span>').join('') + '</div>' +
    '<div class="prov">Avoid cost is mostly tech debt, maintenance and security. The target mix is yours to set (' + decLink('D2') + ').</div></div>';
}
function todayLead() {
  const cl = rankedClients(), act = cl.filter(c => c.g.level === 'act'), watch = cl.filter(c => c.g.level === 'watch');
  const ren = D.clients.filter(c => c.k === 'client' && renewalDays(c) != null && renewalDays(c) <= 90), passed = ren.filter(c => renewalDays(c) < 0);
  const q4 = D.stories.filter(s => s.g === 'D' && s.d && daysSince(s.d) <= 365 && s.v), rev = q4.filter(s => s.v === 'R').length;
  const t1 = D.clusters.filter(k => isOpenNeed(k) && k.t1 > 0 && !k.io).length;
  const severe = D.bugs.filter(b => isSevere(b.pr)).length;
  let h = '<div class="strip">' +
    stat('Key accounts to act on', act.length, plural(watch.length, 'more client') + ' to watch', 'clients:act', 'act', LVL_HINT.act) +
    stat('Renewals within 90 days', ren.length, passed.length ? passed.length + ' renewal date' + (passed.length > 1 ? 's' : '') + ' already passed' : 'none passed', 'clients:renew', passed.length ? 'act' : '') +
    stat('Built for revenue, last 12 months', Math.round(rev / (q4.length || 1) * 100) + '%', 'of ' + fmt(q4.length) + ' finished stories; the rest protects clients or cuts cost', 'delivery:year') +
    stat('Open Tier 1 needs', fmt(t1), 'asked by our largest clients, not built yet', 'demand:t1') +
    stat('Severe open bugs', severe, 'Urgent or High, reported by clients', 'quality:severe', severe ? 'act' : '') + '</div>';
  h += '<section class="sec"><div class="sec-h"><h2>Key accounts to act on before their show</h2><span class="hint">A show inside ' + TH.showWindowDays / 7 + ' weeks and 3 or more flags. Each card: stories shipped for them in 12 months, open bugs, open needs.</span></div>' +
    actCards(act, '<b>No account needs action before a show.</b>') + '</section>';
  h += '<div class="grid2"><div class="sec">' + mixByYear() + topNeeds(5) + '</div>' + changedBlock() + '</div>';
  return h;
}
function topNeeds(n) {
  const best = D.clusters.filter(k => k.best && !k.io);
  const list = (best.length ? best : D.clusters.filter(isOpenNeed)).slice(0, n);
  return '<section class="sec"><div class="sec-h"><h2>What to build next</h2><button class="link" data-go="demand:best">All ' + best.length + ' top priorities →</button></div>' +
    '<div class="card list">' + list.map(k => needRow(k, D.clusters.indexOf(k) + 1)).join('') + '</div>' +
    '<div class="prov">Top priority: not built, a Tier 1 client asks for it, that client has open bugs in the same product and a show inside ' + TH.showWindowDays / 7 + ' weeks. Ranked by demand score; the number is its rank in Demand.</div></section>';
}
function todayProduct() {
  const best = D.clusters.filter(k => k.best && !k.io), multi = best.filter(k => k.a > 1).length;
  const t1 = D.clusters.filter(k => isOpenNeed(k) && k.t1 > 0 && !k.io).length;
  const top = D.productRoll.filter(p => p.id !== 'Unassigned / Cross-cutting').sort((a, b) => b.tierSignalOpen - a.tierSignalOpen)[0];
  const due30 = D.promises.filter(p => !p.fl.includes('shipped') && promiseDue(p) && daysTo(promiseDue(p)) <= 30).length;
  let h = '<div class="strip">' +
    stat('Top priorities', best.length, multi + ' asked more than once, ' + (best.length - multi) + ' on a single request', 'demand:best') +
    stat('Open Tier 1 needs', fmt(t1), 'not built yet', 'demand:t1') +
    stat('Most asked product', esc(top ? top.id : '–'), top ? 'demand score ' + fmt(top.tierSignalOpen) + ' across ' + top.clustersOpen + ' open needs' : '', 'products:asked', 'txt') +
    stat('Promises due in 30 days', due30, 'commitments to named clients', 'shows:promises') + '</div>';
  const prods = D.productRoll.filter(p => p.id !== 'Unassigned / Cross-cutting').sort((a, b) => b.tierSignalOpen - a.tierSignalOpen).slice(0, 6);
  const tbl = '<section class="sec"><div class="sec-h"><h2>Products most asked for</h2><button class="link" data-go="products:asked">All products →</button></div><div class="card tw"><table class="t compact"><thead><tr><th>Product</th><th class="num" title="' + esc(scoreHint) + '">Demand score</th><th class="num">Open needs</th><th class="num">Shipped</th><th class="num">Open bugs</th></tr></thead><tbody>' +
    prods.map(p => '<tr class="r" tabindex="0" data-open="product:' + P.indexOf(p.id) + '"><td class="nm">' + esc(p.id) + '</td><td class="num">' + fmt(p.tierSignalOpen) + '</td><td class="num">' + p.clustersOpen + '</td><td class="num">' + fmt(p.done) + '</td><td class="num">' + p.bugs + '</td></tr>').join('') + '</tbody></table></div></section>';
  h += '<div class="grid2"><div class="sec">' + topNeeds(8) + tbl + '</div>' + changedBlock() + '</div>';
  return h;
}
function teamRoll() {
  const m = {}; const g = t => (m[t || '(no team)'] = m[t || '(no team)'] || {tm: t || '', prog: 0, done90: 0, bugs: 0, severe: 0, prom: 0, due30: 0});
  D.stories.forEach(s => { if (s.g === 'P') g(s.tm).prog++; if (s.g === 'D' && s.d && daysSince(s.d) <= 90) g(s.tm).done90++; });
  D.bugs.forEach(b => { const x = g(b.tm); x.bugs++; if (isSevere(b.pr)) x.severe++; });
  D.promises.forEach(p => { if (p.fl.includes('shipped')) return; const x = g(p.tm); x.prom++; if (promiseDue(p) && daysTo(promiseDue(p)) <= 30) x.due30++; });
  return Object.entries(m).map(([k, v]) => Object.assign({name: k}, v)).sort((a, b) => (b.severe - a.severe) || (b.bugs - a.bugs) || (b.prog - a.prog));
}
function teamTable(limit) {
  const rows = teamRoll().slice(0, limit || 99);
  return '<div class="card tw"><table class="t compact"><thead><tr><th>Team</th><th class="num">Open client bugs</th><th class="num">Urgent or High</th><th class="num">In progress</th><th class="num">Shipped, 90 days</th><th class="num">Open promises</th><th class="num">Due in 30 days</th></tr></thead><tbody>' +
    rows.map(t => '<tr class="r" tabindex="0" data-go="quality:team:' + esc(t.tm) + '" title="Open this team’s bugs"><td class="nm">' + esc(t.name) + '</td><td class="num">' + t.bugs + '</td><td class="num">' + (t.severe ? '<b class="bad">' + t.severe + '</b>' : 0) + '</td><td class="num">' + t.prog + '</td><td class="num">' + t.done90 + '</td><td class="num">' + t.prom + '</td><td class="num">' + t.due30 + '</td></tr>').join('') +
    '</tbody></table></div><div class="prov">Team comes from Jira. ' + fmt(D.stories.filter(s => !s.tm).length) + ' stories have no team set, so load per team is a floor, not a total.</div>';
}
function todayEng() {
  const severe = D.bugs.filter(b => isSevere(b.pr)), teams = new Set(severe.map(b => b.tm).filter(Boolean));
  const shows = upcomingShows(TH.showWindowDays / 7).map(e => ({e, r: showRisk(e)})).filter(x => x.r.tagged.length || x.r.severe);
  const prog = D.stories.filter(s => s.g === 'P'), ages = prog.map(s => daysSince(s.sa)).filter(x => x != null).sort((a, b) => a - b), med = ages.length ? ages[Math.floor(ages.length / 2)] : null;
  const risk = D.promises.filter(p => !p.fl.includes('shipped') && p.fl.some(f => ['overdue', 'dueSoon', 'drift'].includes(f)));
  let h = '<div class="strip">' +
    stat('Severe open client bugs', severe.length, 'Urgent or High, across ' + plural(teams.size, 'team'), 'quality:severe', severe.length ? 'act' : '') +
    stat('Shows at risk', shows.length, 'in the next ' + TH.showWindowDays / 7 + ' weeks with open bugs for that client', 'shows:risk', shows.length ? 'act' : '') +
    stat('Stories in progress', prog.length, med != null ? 'half of them started more than ' + med + ' days ago' : '', 'delivery:progress') +
    stat('Promises at risk', risk.length, 'overdue, due soon or drifting', 'shows:promises', risk.length ? 'act' : '') + '</div>';
  const tbl = '<section class="sec"><div class="sec-h"><h2>Shows at risk</h2><button class="link" data-go="shows:risk">All ' + shows.length + ' shows at risk →</button></div>' + showsTable(shows.slice(0, 8), false) + '</section>';
  h += tbl + '<div class="grid2"><section class="sec"><div class="sec-h"><h2>Load by team</h2><button class="link" data-go="quality:teams">Open Quality →</button></div>' + teamTable(8) + '</section>' + changedBlock() + '</div>';
  return h;
}
function todayCS() {
  const mine = c => c.k === 'client' && (!S.myOwner || c.ow === S.myOwner);
  const cl = rankedClients().filter(mine), act = cl.filter(c => c.g.level === 'act'), watch = cl.filter(c => c.g.level === 'watch');
  const ren = D.clients.filter(c => mine(c) && renewalDays(c) != null && renewalDays(c) <= 90).sort((a, b) => renewalDays(a) - renewalDays(b));
  const drift = D.promises.filter(p => p.c && mine(CL[p.c] || {}) && !p.fl.includes('shipped') && p.fl.some(f => ['overdue', 'dueSoon', 'drift'].includes(f)));
  const needs = cl.reduce((a, c) => a + c.g.openClusters, 0);
  const who = S.myOwner ? S.myOwner + '’s' : 'All';
  let h = '<div class="strip">' +
    stat(who + ' clients to act on', act.length, plural(watch.length, 'more') + ' to watch', 'clients:act', 'act') +
    stat('Renewals within 90 days', ren.length, ren.filter(c => renewalDays(c) < 0).length + ' already passed', 'clients:renew') +
    stat('Promises drifting', drift.length, 'commitments overdue, due soon or drifting', 'shows:promises', drift.length ? 'act' : '') +
    stat('Open needs', fmt(needs), 'asked by ' + (S.myOwner ? 'these' : 'all') + ' clients', 'demand') + '</div>';
  h += '<section class="sec"><div class="sec-h"><h2>Call before their show</h2><span class="hint">Open a card for the full Client 360: what we shipped, what is broken, what they asked for and what we promised.</span></div>' +
    actCards(act.concat(watch.filter(c => c.g.nextShow && c.g.nextShow.days <= TH.showWindowDays)), '<b>No client needs a call before a show.</b>') + '</section>';
  const renList = '<section class="sec"><div class="sec-h"><h2>Renewals coming</h2></div><div class="card list">' + (ren.length ? ren.map(c => '<button class="li" data-open="client:' + esc(c.id) + '"><span class="t">' + tdot(c.t) + esc(c.n) + '</span><span class="m">' + renewChip(c) + lvlB(c.g.level) + '<span>' + esc(c.ow || '') + '</span></span></button>').join('') : '<div class="empty">No renewal inside 90 days.</div>') + '</div></section>';
  h += '<div class="grid2"><div class="sec">' + renList + '</div>' + changedBlock() + '</div>';
  return h;
}
function actCard(c) {
  const g = c.g, ns = g.nextShow, flags = g.flags.filter(f => f.id !== 'show');
  const nl = liveFor(c.id).length, rc = renewChip(c);
  return '<button class="acard ' + g.level + '" data-open="client:' + esc(c.id) + '">' +
    '<div class="row1"><span class="nm">' + esc(c.n) + '</span>' + tierB(c.t) + '</div>' +
    (ns ? '<div class="count"><span class="big' + (ns.days <= 14 ? ' soon' : '') + '">' + ns.days + '</span><span class="lbl">days to<br>' + esc(ns.name) + '</span></div>' : '') +
    '<div class="chips">' + rc + flags.slice(0, 4).map(flagChip).join('') + (flags.length > 4 ? '<span class="chip">+' + (flags.length - 4) + ' more</span>' : '') + (nl ? '<span class="chip live">' + nl + ' live</span>' : '') + '</div>' +
    '<div class="gba"><div title="Stories finished for them in the last 12 months"><span class="k">Shipped</span><span class="v">' + shipped12(c.id) + ' <small>12 mo</small></span></div>' +
    '<div title="Open client bugs they reported or are affected by"><span class="k">Open bugs</span><span class="v">' + g.openBugs + ' <small>' + g.severeBugs + ' severe</small></span></div>' +
    '<div title="Open needs they asked for, not built yet"><span class="k">Open needs</span><span class="v">' + g.openClusters + '</span></div></div>' +
    (c.ow ? '<div class="owner">Owner ' + esc(c.ow) + '</div>' : '') + '</button>';
}
function needRow(k, rank) {
  const mx = Math.max(D.clusters[0] ? D.clusters[0].ts : 1, 1);
  const t1 = k.lc.filter(id => tierOf(id) === 1 && isClient(id));
  return '<button class="li need" data-open="need:' + esc(k.id) + '"><span class="rk" title="Rank in Demand">' + (rank || '') + '</span><span><span class="t">' + esc(k.n) + '</span>' +
    '<span class="m"><span>' + esc(P[k.p] || 'No product') + '</span><span class="' + (k.a === 1 ? 'one' : '') + '" title="' + (k.a === 1 ? 'Rests on a single request' : 'Distinct requests behind this need') + '">' + plural(k.a, 'request') + '</span>' + (k.old ? '<span>since ' + fmonth(k.old.slice(0, 7)) + '</span>' : '') + builtB(k.b) + (k.best ? '<span class="star" title="Not built, a Tier 1 client asks, that client has open bugs in this product and a show soon">Top priority</span>' : '') + '</span>' +
    (t1.length ? '<span class="chips" style="margin-top:5px">' + t1.slice(0, 4).map(clientTag).join('') + (t1.length > 4 ? '<span class="chip">+' + (t1.length - 4) + '</span>' : '') + '</span>' : '') + '</span>' +
    '<span class="sig" title="' + esc(scoreHint) + '"><span class="num">' + k.ts + ' <small>demand score</small></span><span class="meter"><i style="width:' + Math.min(100, Math.round(k.ts / mx * 100)) + '%"></i></span></span></button>';
}
function feedHTML(limit, list) {
  const L = list || liveList();
  if (!L.length) {
    const why = LIVE.running ? 'Reading Jira now…' : !LIVE.db ? 'Outside claude.ai this page shows the snapshot only. Open it in claude.ai to see Jira changes since ' + fdate(BASELINE) + '.' : LIVE.err ? esc(liveErrText(LIVE.err)) : LIVE.state ? 'Nothing in the tracked scope changed since ' + fdate(BASELINE) + '.' : 'The first Jira refresh runs when someone with Atlassian connected opens the page.';
    return '<div class="empty"><b>No live changes</b>' + why + '</div>';
  }
  return L.slice(0, limit).map(r => { const e = EVT[r.kind] || {ico: 'asks', cls: '', txt: r.kind};
    return '<a class="li" href="' + jiraUrl(r.k) + '" target="_blank" rel="noopener"><span class="ico ' + e.cls + '">' + ico(e.ico) + '</span><span><span class="t">' + esc(r.s) + '</span><span class="m"><b>' + e.txt + (r.kind === 'ask-moved' ? ' to ' + esc(r.st) : '') + '</b><span class="jira">' + esc(r.k) + '</span>' +
      (r.c || []).slice(0, 3).map(id => '<span>' + esc(nameOf(id)) + '</span>').join('') + '<span>' + fdate(r.up) + '</span></span></span></a>'; }).join('') +
    (L.length > limit ? '<div class="more"><span class="muted small">' + plural(L.length - limit, 'more change') + '. Each client panel lists its own.</span></div>' : '');
}

// ------------------------------------------------------------------ Clients
function clientRows() {
  const f = S.clients, q = norm(f.q);
  return D.clients.filter(c => (f.all || c.k === 'client') && (f.tier === 'all' || String(c.t) === f.tier) && (f.level === 'all' || c.g.level === f.level) &&
    (!f.owner || c.ow === f.owner) && (f.renew === 'all' || (renewalDays(c) != null && (f.renew === 'passed' ? renewalDays(c) < 0 : renewalDays(c) <= 90))) &&
    (!q || norm(c.n).includes(q) || norm(c.ow).includes(q)));
}
const CSORT = {
  name: c => c.n.toLowerCase(), tier: c => c.t || 9, attention: c => RANKPOS[c.id] ?? 999, show: c => c.g.nextShow ? c.g.nextShow.days : 9999,
  renewal: c => renewalDays(c) ?? 9999, health: c => c.h ?? 99,
  shipped: c => shipped12(c.id), bugs: c => c.g.openBugs * 100 + c.g.severeBugs, needs: c => c.g.openClusters, promises: c => c.g.promises * 10 + c.g.promisesAtRisk
};
function vClients() {
  const f = S.clients; const rows = clientRows().slice();
  const key = CSORT[f.sort] || CSORT.attention; rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * f.dir; });
  let h = lede('Clients', 'Every ledger client: what we shipped for them, what is broken, what they ask for, what we promised and when they renew. Sorted by how much needs attention.', asofLine());
  h += staleBanner();
  h += '<div class="card filters"><label class="sr" for="cq">Find a client</label><input class="inp" id="cq" type="search" placeholder="Find a client" value="' + esc(f.q) + '" data-input="clients.q">' +
    segF('clients.tier', f.tier, [['all', 'All tiers'], ['1', 'T1'], ['2', 'T2'], ['3', 'T3'], ['4', 'T4']], 'Tier') +
    segF('clients.level', f.level, [['all', 'Any level'], ['act', 'Act', LVL_HINT.act], ['watch', 'Watch', LVL_HINT.watch], ['calm', 'Calm', LVL_HINT.calm]], 'Level') +
    selF('clients.owner', f.owner, [['', 'Any owner']].concat(OWNERS.map(o => [o, o])), 'Owner', 'cown') +
    segF('clients.renew', f.renew, [['all', 'Any renewal'], ['90', 'Within 90 days'], ['passed', 'Date passed']], 'Renewal') +
    chkF('clients.all', f.all, 'Include group parent and inactive') + '<span class="count-line">' + plural(rows.length, 'client') + '</span></div>' + activeLine('clients');
  h += '<div class="card tw"><table class="t"><thead><tr>' + th('clients', 'name', 'Client') + th('clients', 'tier', 'Tier') + th('clients', 'attention', 'Level', '', 'Ranked by attention flags') + th('clients', 'show', 'Next show') + th('clients', 'renewal', 'Renewal') + th('clients', 'health', 'Health', 'num', 'Health score out of 10 (ledger model, written to Planhat)') + '<th>Flags</th>' +
    th('clients', 'shipped', 'Shipped 12 mo', 'num') + th('clients', 'bugs', 'Open bugs', 'num') + th('clients', 'needs', 'Open needs', 'num') + th('clients', 'promises', 'Promised', 'num') + '</tr></thead><tbody>' +
    (rows.length ? rows.map(c => { const g = c.g, ns = g.nextShow, nl = liveFor(c.id).length, rd = renewalDays(c);
      return '<tr class="r" tabindex="0" data-open="client:' + esc(c.id) + '"><td><div class="nm">' + esc(c.n) + '</div><div class="sub">' + esc(c.ow || 'no owner') + (c.k !== 'client' ? ' · ' + (c.k === 'group-parent' ? 'group parent' : 'inactive') : '') + '</div></td>' +
        '<td>' + tierB(c.t) + '</td><td>' + lvlB(g.level) + '</td>' +
        '<td>' + (ns ? '<div class="nm">' + ns.days + ' days</div><div class="sub">' + esc(ns.name) + '</div>' : '<span class="dim">none booked</span>') + '</td>' +
        '<td>' + (rd == null ? '<span class="dim">' + esc(c.rn || '–') + '</span>' : '<div class="nm' + (rd < 0 ? ' bad' : '') + '">' + fdate(c.rnd) + '</div><div class="sub">' + (rd < 0 ? 'passed' : 'in ' + rd + ' days') + '</div>') + '</td>' +
        '<td class="num">' + (c.h ?? '–') + '</td>' +
        '<td><div class="chips">' + g.flags.filter(x => x.id !== 'show').map(flagChip).join('') + (nl ? '<span class="chip live">' + nl + ' live</span>' : '') + '</div></td>' +
        '<td class="num">' + shipped12(c.id) + '</td><td class="num">' + g.openBugs + (g.severeBugs ? '<div class="sub">' + g.severeBugs + ' severe</div>' : '') + '</td>' +
        '<td class="num">' + g.openClusters + '<div class="sub">' + plural(g.openAsks, 'request') + '</div></td><td class="num">' + g.promises + (g.promisesAtRisk ? '<div class="sub">' + g.promisesAtRisk + ' at risk</div>' : '') + '</td></tr>'; }).join('')
      : '<tr><td colspan="11"><div class="empty"><b>No client matches.</b><button class="reset" data-reset="clients">Clear the filters</button></div></td></tr>') + '</tbody></table></div>';
  h += '<div class="prov">Flags: ' + Object.values(FLAG_LABEL).join(' · ') + '. Thresholds are defaults until decided (' + decLink('D3') + ').</div>';
  return h;
}

// ------------------------------------------------------------------ Shows (next weeks) and commitments
function showsTable(list, compact) {
  if (!list.length) return '<div class="card empty"><b>No show matches.</b></div>';
  return '<div class="card tw"><table class="t' + (compact ? ' compact' : '') + '"><thead><tr><th>Show</th><th>Client</th><th class="num">Days to go</th><th class="num" title="Open bugs Jira ties to this show">Bugs for this show</th><th class="num">Other open bugs</th><th class="num" title="Promises to this client due before the show starts">Promises due before</th>' + (compact ? '' : '<th>Teams on the bugs</th>') + '</tr></thead><tbody>' +
    list.map(({e, r}) => { const c = CL[e.c], dd = daysTo(e.s);
      return '<tr class="r" tabindex="0" data-open="client:' + esc(e.c) + '"><td><div class="nm">' + esc(e.n) + '</div><div class="sub">' + fdate(e.s) + (e.e && e.e !== e.s ? ' to ' + fdate(e.e) : '') + '</div></td>' +
        '<td>' + tierB(c.t) + ' <span class="nm">' + esc(c.sh) + '</span> ' + lvlB(c.g.level) + '</td><td class="num"><b' + (dd <= 14 ? ' class="bad"' : '') + '>' + dd + '</b></td>' +
        '<td class="num">' + (r.tagged.length ? '<b class="bad">' + r.tagged.length + '</b>' + (r.tagged.some(b => isSevere(b.pr)) ? '<div class="sub">' + r.tagged.filter(b => isSevere(b.pr)).length + ' severe</div>' : '') : '0') + '</td>' +
        '<td class="num">' + r.other.length + '</td><td class="num">' + (r.before.length ? r.before.length : 0) + (r.after.length ? '<div class="sub bad">' + r.after.length + ' due after the show</div>' : '') + '</td>' +
        (compact ? '' : '<td class="sub">' + esc(r.teams.join(', ')) + '</td>') + '</tr>'; }).join('') + '</tbody></table></div>';
}
function vShows() {
  const f = S.shows;
  let list = upcomingShows(f.weeks === 'all' ? null : +f.weeks).map(e => ({e, r: showRisk(e)}));
  if (f.tier !== 'all') list = list.filter(x => String(CL[x.e.c].t) === f.tier);
  if (f.risk) list = list.filter(x => x.r.tagged.length || x.r.severe);
  let h = lede('Shows', 'Client shows coming up, with the open bugs Jira ties to each show, the client’s other open bugs, and what we promised before it starts. The engineering view of risk before a live event.', asofLine());
  h += staleBanner();
  h += '<div class="card filters">' + segF('shows.weeks', f.weeks, [['4', 'Next 4 weeks'], ['8', 'Next 8 weeks'], ['13', 'Next 13 weeks'], ['all', 'All booked']], 'Window') +
    segF('shows.tier', f.tier, [['all', 'All tiers'], ['1', 'T1'], ['2', 'T2'], ['3', 'T3'], ['4', 'T4']], 'Tier') + chkF('shows.risk', f.risk, 'Only shows with open bugs') +
    '<span class="count-line">' + plural(list.length, 'show') + '</span></div>' + activeLine('shows');
  h += showsTable(list, false);
  const proms = D.promises.slice().sort((a, b) => String(promiseDue(a)).localeCompare(String(promiseDue(b))));
  h += '<section class="sec" id="promises"><div class="sec-h"><h2>Promises</h2><span class="hint">Commitments recorded on the Business Ledger’s Requests tab. A promise due after the client’s next show is marked.</span></div>' +
    '<div class="card tw"><table class="t"><thead><tr><th>Promise</th><th>Client</th><th>Team</th><th>Due</th><th>Jira</th><th>Status</th><th>Next show</th></tr></thead><tbody>' +
    proms.map(p => { const c = CL[p.c], ns = c && c.g.nextShow, due = promiseDue(p), after = ns && due && due > ns.start;
      const fl = p.fl.filter(x => x !== 'noEstimate' && x !== 'noJira').map(x => '<span class="chip f-promise">' + esc({dueSoon: 'due soon', overEstimate: 'over estimate', drift: 'drifting', overdue: 'overdue', shipped: 'shipped'}[x] || x) + '</span>').join('');
      return '<tr' + (c ? ' class="r" tabindex="0" data-open="client:' + esc(p.c) + '"' : '') + '><td><div class="nm">' + esc(p.f || '(no title)') + '</div>' + (p.im ? '<div class="sub">' + esc(p.im) + '</div>' : '') + '</td>' +
        '<td>' + (c ? tdot(c.t) + esc(c.sh) : '<span class="dim">no client named</span>') + '</td><td class="sub">' + esc(p.tm || '–') + '</td>' +
        '<td>' + (p.due ? fdate(p.due) : fmonth(p.mo)) + '</td><td>' + (p.k ? jiraS(p.k) + '<div class="sub">' + esc(p.js || '') + '</div>' : '<span class="dim">no ticket</span>') + '</td>' +
        '<td><div class="chips">' + (fl || '<span class="dim">on track</span>') + '</div></td><td>' + (ns ? esc(ns.name) + '<div class="sub' + (after ? ' bad' : '') + '">' + fdate(ns.start) + (after ? ' · due after the show' : '') + '</div>' : '<span class="dim">–</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  return h;
}

// ------------------------------------------------------------------ Quality (bugs, incidents, teams)
function vQuality() {
  const f = S.quality;
  let h = lede('Quality', 'Open client bugs and incidents: how severe, how old, which product and team, and which show they threaten. Engineering’s starting point.', asofLine());
  h += staleBanner();
  h += '<div class="card filters">' + segF('quality.sub', f.sub, [['bugs', 'Open client bugs'], ['incidents', 'Incidents'], ['teams', 'By team']], 'Section');
  if (f.sub === 'bugs') {
    h += segF('quality.pr', f.pr, [['all', 'Any priority'], ['severe', 'Urgent or High'], ['Urgent', 'Urgent'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']], 'Priority') +
      selF('quality.tm', f.tm, [['', 'Any team']].concat(TEAMS.map(t => [t, t])), 'Team', 'qtm') +
      selF('quality.p', f.p, [['', 'Any product']].concat(P.map((p, i) => [String(i), p])), 'Product', 'qp') +
      chkF('quality.soon', f.soon, 'Client has a show inside ' + TH.showWindowDays / 7 + ' weeks');
  } else if (f.sub === 'incidents') h += chkF('quality.openInc', f.openInc, 'Hide done and cancelled');
  h += '</div>' + activeLine('quality');
  if (f.sub === 'bugs') {
    const rows = D.bugs.filter(b => (f.pr === 'all' || (f.pr === 'severe' ? isSevere(b.pr) : b.pr === f.pr)) && (!f.tm || b.tm === f.tm) && (f.p === '' || String(b.p) === f.p) &&
      (!f.soon || b.c.some(id => CL[id] && CL[id].g.nextShow && CL[id].g.nextShow.days <= TH.showWindowDays)))
      .sort((a, b) => sevRank(a.pr) - sevRank(b.pr) || String(a.cr).localeCompare(String(b.cr)));
    const med = rows.length ? rows.map(b => daysSince(b.cr)).sort((a, b) => a - b)[Math.floor(rows.length / 2)] : 0;
    h += '<div class="prov">' + plural(rows.length, 'open client bug') + ', median age ' + med + ' days. Only bugs a client reported or is affected by are held; internal bugs are out of scope.</div>';
    h += '<div class="card tw"><table class="t"><thead><tr><th>Priority</th><th>Bug</th><th>Client</th><th>Product</th><th>Team</th><th>Show</th><th class="num">Age</th></tr></thead><tbody>' +
      (rows.length ? rows.map(b => '<tr><td class="nowrap"><span class="sev ' + esc(b.pr) + '"></span>' + esc(b.pr) + '</td><td><div class="nm">' + esc(b.s) + '</div><div class="sub">' + jiraA(b.k) + ' · ' + esc(b.st) + '</div></td>' +
        '<td><div class="chips">' + b.c.map(clientChip).join('') + '</div></td><td class="sub">' + esc(P[b.p] || '') + '</td><td class="sub">' + esc(b.tm || '–') + '</td><td class="sub">' + esc(b.ev || '') + '</td><td class="num">' + daysSince(b.cr) + ' d</td></tr>').join('')
        : '<tr><td colspan="7"><div class="empty"><b>No bug matches.</b><button class="reset" data-reset="quality">Clear the filters</button></div></td></tr>') + '</tbody></table></div>';
  } else if (f.sub === 'incidents') {
    const rows = D.incidents.filter(i => !f.openInc || incOpen(i)).sort((a, b) => String(b.cr).localeCompare(String(a.cr)));
    const noClient = D.incidents.filter(i => !i.c.length).length;
    h += '<div class="prov">' + plural(D.incidents.length, 'incident') + ' in the window, ' + noClient + ' with no client named. Response and fix times are not computed yet (the incident changelog pull is a known gap).</div>';
    h += '<div class="card tw"><table class="t"><thead><tr><th>Incident</th><th>Client</th><th>Priority</th><th>Status</th><th>Raised</th><th>Show</th></tr></thead><tbody>' +
      (rows.length ? rows.map(i => '<tr class="' + (incOpen(i) ? '' : 'dimrow') + '"><td><div class="nm">' + esc(i.s) + '</div><div class="sub">' + jiraA(i.k) + '</div></td><td><div class="chips">' + (i.c.length ? i.c.map(clientChip).join('') : '<span class="dim">no client</span>') + '</div></td>' +
        '<td>' + esc(i.pr) + '</td><td>' + esc(i.st) + '</td><td>' + fdate(i.cr) + '</td><td class="sub">' + esc(i.ev || '') + '</td></tr>').join('')
        : '<tr><td colspan="6"><div class="empty"><b>No open incident.</b>Every incident in the window is done or cancelled. Untick the filter to see them.</div></td></tr>') + '</tbody></table></div>';
  } else {
    h += teamTable();
  }
  return h;
}

// ------------------------------------------------------------------ Products
function vProducts() {
  const rolls = P.map((p, i) => ({i, p, r: PROLL[p] || {}}));
  const real = rolls.filter(x => x.p !== 'Unassigned / Cross-cutting');
  const mx = {done: Math.max(...real.map(x => x.r.done || 0), 1), ask: Math.max(...real.map(x => x.r.tierSignalOpen || 0), 1), bug: Math.max(...real.map(x => x.r.bugs || 0), 1)};
  const ys = ['2023', '2024', '2025', '2026'], ymx = Math.max(...real.map(x => Math.max(...ys.map(y => (x.r.doneByYear || {})[y] || 0))), 1);
  const sorts = {domain: null, asked: x => -(x.r.tierSignalOpen || 0), broken: x => -((x.r.bugs || 0) * 100 + (x.r.severeBugs || 0)), built: x => -(x.r.done || 0)};
  const row = x => { const r = x.r;
    const spark = '<svg class="spark" viewBox="0 0 110 32" role="img" aria-label="Stories finished per year 2023 to 2026: ' + ys.map(y => ((r.doneByYear || {})[y] || 0)).join(', ') + '">' +
      ys.map((y, j) => { const v = (r.doneByYear || {})[y] || 0, hgt = Math.max(v ? 1 : 0, Math.min(22, Math.round(v / ymx * 22))); return '<rect x="' + (4 + j * 27) + '" y="' + (23 - hgt) + '" width="20" height="' + hgt + '" rx="2"' + (v > ymx ? ' class="cap"' : '') + '><title>' + y + ': ' + v + '</title></rect><text x="' + (14 + j * 27) + '" y="31" text-anchor="middle">' + y.slice(2) + '</text>'; }).join('') + '</svg>';
    const cell = (v, max, color, sub, t) => { const cap = (v || 0) > max;
      return '<span class="bcell" title="' + esc(t) + '"><span class="b"><i style="width:' + Math.min(100, Math.round((v || 0) / max * 100)) + '%;background:' + color + '"></i>' + (cap ? '<span class="capm" aria-hidden="true">›</span>' : '') + '</span><span class="n">' + fmt(v) + '<small>' + sub + '</small></span></span>'; };
    return '<button class="mx-r" data-open="product:' + x.i + '"><span class="nm">' + esc(x.p) + (x.p === 'Unassigned / Cross-cutting' ? '<small class="sub" style="display:block;font-weight:400">platform work and stories with no product signal</small>' : '') + '</span>' +
      cell(r.done, mx.done, 'var(--bar-built)', (r.inProgress || 0) + ' in progress', 'Stories finished 2023 to now') +
      cell(r.tierSignalOpen, mx.ask, 'var(--bar)', (r.clustersOpen || 0) + ' open needs', scoreHint) +
      cell(r.bugs, mx.bug, 'var(--bar-broken)', (r.severeBugs || 0) + ' severe', 'Open client bugs') + spark + '</button>'; };
  let h = lede('Products', 'For each product: what we built (stories finished 2023 to now), what is asked (demand score of open needs) and what is broken (open client bugs). Product owners start here.', asofLine());
  h += '<div class="card filters"><span class="field">Order</span>' + segF('products.sort', S.products.sort, [['domain', 'By domain'], ['asked', 'Most asked'], ['broken', 'Most broken'], ['built', 'Most built']], 'Order') +
    '<span class="count-line">' + plural(P.length, 'product') + ' in ' + D.domains.length + ' domains</span></div>';
  h += '<div class="card tw"><div class="matrix"><div class="mx-h"><span>Product</span><span class="c-built">Built · stories finished</span><span class="c-ask" title="' + esc(scoreHint) + '">Asked · demand score</span><span class="c-bug">Broken · open client bugs</span><span>Per year, shared scale</span></div>';
  if (S.products.sort === 'domain') {
    D.domains.forEach(d => { const xs = rolls.filter(x => (PINFO[x.p] || {}).dom === d.id); if (!xs.length) return;
      h += '<div class="mx-d">' + esc(d.id) + '</div>' + xs.map(row).join(''); });
  } else h += rolls.slice().sort((a, b) => sorts[S.products.sort](a) - sorts[S.products.sort](b)).map(row).join('');
  h += '</div></div>';
  const q = D.quality.products.stories;
  h += '<div class="prov">A › at the end of a bar means it runs past the scale. Stories from 2026 are placed on a product from their content. Earlier stories are placed by their Jira component (' + fmt(q.component || 0) + ') or roadmap theme (' + fmt(q.theme || 0) + ', lower confidence); ' + fmt(q.none || 0) + ' carry no product signal and sit in Unassigned (' + decLink('D4') + ').</div>';
  return h;
}

// ------------------------------------------------------------------ Demand
function needRows() {
  const f = S.demand, q = norm(f.q);
  const rows = D.clusters.filter(k => (f.b === 'all' || (f.b === 'open' ? isOpenNeed(k) : k.b === f.b)) &&
    (f.p === '' || String(k.p) === f.p) && (f.tier === 'all' || (f.tier === '1' ? k.t1 > 0 : k.lc.some(id => (tierOf(id) || 9) <= 2))) && (!f.best || k.best) && (!f.multi || k.a > 1) &&
    (!q || norm(k.n).includes(q) || norm(k.w).includes(q) || k.c.some(id => norm(fullName(id)).includes(q)) || k.m.some(m => norm(m[0]) === q)));
  const srt = {score: null, old: (a, b) => String(a.old || '9').localeCompare(String(b.old || '9')), asks: (a, b) => b.a - a.a || b.ts - a.ts, clients: (a, b) => b.lc.length - a.lc.length || b.ts - a.ts}[f.sort];
  return srt ? rows.slice().sort(srt) : rows;
}
function vDemand() {
  const f = S.demand, rows = needRows();
  let h = lede('Demand', 'Open requests (Feature Requests, open stories and intake pages) grouped into needs, so one need counts once however many tickets ask for it. Ranked by demand score among needs not built yet.', asofLine());
  h += '<div class="card filters"><label class="sr" for="dq">Search needs</label><input class="inp" id="dq" type="search" placeholder="Search a need, a client or a key" value="' + esc(f.q) + '" data-input="demand.q">' +
    selF('demand.p', f.p, [['', 'All products']].concat(P.map((p, i) => [String(i), p])), 'Product', 'dp') +
    segF('demand.b', f.b, [['open', 'Not built'], ['partial', 'Partly built'], ['built', 'Built'], ['all', 'All']], 'Built') +
    segF('demand.tier', f.tier, [['all', 'Any tier'], ['1', 'Tier 1 asks'], ['2', 'Tier 1 or 2 asks']], 'Tier') +
    chkF('demand.best', f.best, 'Top priority only', 'Not built, a Tier 1 client asks, that client has open bugs in the product and a show soon') + chkF('demand.multi', f.multi, 'Asked more than once') +
    selF('demand.sort', f.sort, [['score', 'Demand score'], ['asks', 'Most requests'], ['clients', 'Most clients'], ['old', 'Oldest first']], 'Sort', 'ds') +
    '<span class="count-line">' + plural(rows.length, 'need') + ' · ' + plural(rows.reduce((a, k) => a + k.a, 0), 'request') + '</span></div>' + activeLine('demand');
  h += rows.length ? '<div class="card list">' + rows.slice(0, f.limit).map(k => needRow(k, D.clusters.indexOf(k) + 1)).join('') + '</div>' +
    (rows.length > f.limit ? '<div class="more"><button class="btn" data-more="demand">Show ' + Math.min(100, rows.length - f.limit) + ' more</button></div>' : '')
    : '<div class="card empty"><b>No need matches.</b><button class="reset" data-reset="demand">Clear the filters</button></div>';
  h += '<div class="prov">' + esc(scoreHint) + '. A request count in amber means the need rests on a single ticket. Built status comes from the product knowledge base, which records delivered work only.</div>';
  return h;
}

// ------------------------------------------------------------------ Delivery
function storyRows() {
  const f = S.delivery, q = norm(f.q);
  return D.stories.filter(s => (f.g === 'all' || s.g === f.g) &&
    (f.y === 'all' || (f.y === '90' ? (s.g === 'D' ? daysSince(s.d) <= 90 : daysSince(s.sa || s.cr) <= 90) : (String(s.y) === f.y || (s.g !== 'D' && f.y === String(s.cr || '').slice(0, 4))))) &&
    (f.p === '' || String(s.p) === f.p) && (!f.tm || s.tm === f.tm) && (f.v === '' || s.v === f.v) && (!f.cf || s.cf) &&
    (f.who === 'all' || (f.who === 'named' ? s.c.some(id => CL[id]) : !s.c.length)) &&
    (!q || norm(s.k) === q || norm(s.s).includes(q) || norm(s.w).includes(q) || s.c.some(id => norm(fullName(id)).includes(q))));
}
function vDelivery() {
  const f = S.delivery, rows = storyRows().slice();
  const key = {d: s => s.d || s.sa || s.cr || '', k: s => +String(s.k).split('-')[1], p: s => P[s.p] || '', v: s => s.v || 'Z', tm: s => s.tm || 'zz'}[f.sort] || (s => s.d || '');
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * f.dir; });
  const dc = {R: 0, C: 0, X: 0, A: 0, '': 0}; rows.forEach(s => dc[s.v || '']++);
  const tot = rows.length || 1;
  let h = lede('Delivery', 'Every EP Story we hold: finished 2023 to now, in progress, and the backlog we pulled. Each carries the clients it names, their tier and one value driver.', asofLine());
  h += '<div class="card filters"><label class="sr" for="sq">Search stories</label><input class="inp" id="sq" type="search" placeholder="Search a story, a client or a key" value="' + esc(f.q) + '" data-input="delivery.q">' +
    segF('delivery.g', f.g, [['D', 'Done'], ['P', 'In progress'], ['N', 'Not started'], ['all', 'All']], 'Stage') +
    segF('delivery.y', f.y, [['all', 'Any time'], ['90', 'Last 90 days'], ['2023', '2023'], ['2024', '2024'], ['2025', '2025'], ['2026', '2026']], 'Period') +
    selF('delivery.p', f.p, [['', 'All products']].concat(P.map((p, i) => [String(i), p])), 'Product', 'sp') +
    selF('delivery.tm', f.tm, [['', 'Any team']].concat(TEAMS.map(t => [t, t])), 'Team', 'stm') +
    segF('delivery.v', f.v, [['', 'Any driver'], ['R', 'Revenue', DRV_HINT.R], ['C', 'Churn', DRV_HINT.C], ['X', 'Reduce cost', DRV_HINT.X], ['A', 'Avoid cost', DRV_HINT.A]], 'Value driver') +
    segF('delivery.who', f.who, [['all', 'Anyone'], ['named', 'For a named client'], ['platform', 'Platform work']], 'Who for') +
    chkF('delivery.cf', f.cf, 'Customer-facing') + '<span class="count-line">' + plural(rows.length, 'story', 'stories') + '</span></div>' + activeLine('delivery');
  h += '<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="sec-h"><h2 style="font-size:15px">Value mix</h2><span class="hint">Share of the stories shown, by the one value driver each carries</span></div>' +
    '<div class="stack">' + ['R', 'C', 'X', 'A'].map(v => '<i style="width:' + (dc[v] / tot * 100) + '%;background:var(--d-' + v + ')" title="' + DRV[v] + ' ' + dc[v] + '"></i>').join('') + '</div>' +
    '<div class="legend">' + ['R', 'C', 'X', 'A'].map(v => '<span class="drv ' + v + '" title="' + esc(DRV_HINT[v]) + '">' + DRV[v] + ' <b>' + fmt(dc[v]) + '</b> <span class="muted">' + Math.round(dc[v] / tot * 100) + '%</span></span>').join('') + '</div>' +
    (f.g === 'D' || f.g === 'all' ? '<div id="qchart"></div>' : '') + '</div>';
  const dateHead = f.g === 'D' ? 'Finished' : f.g === 'P' ? 'Started' : 'Date';
  h += '<div class="card tw"><table class="t"><thead><tr>' + th('delivery', 'k', 'Key') + '<th>Story</th>' + th('delivery', 'p', 'Product') + th('delivery', 'tm', 'Team') + th('delivery', 'v', 'Driver') + '<th>Clients</th>' + th('delivery', 'd', dateHead, 'num') + '</tr></thead><tbody>' +
    (rows.length ? rows.slice(0, f.limit).map(s => '<tr class="r" tabindex="0" data-open="story:' + esc(s.k) + '"><td class="jira">' + esc(s.k) + '</td><td><div class="nm">' + esc(s.s) + '</div>' + (s.f ? '<div class="sub">Roadmap: ' + esc(s.f) + '</div>' : '') + '</td>' +
      '<td>' + esc(P[s.p] || '') + (s.pb === 't' || s.pb === 'n' ? '<div class="sub">' + (s.pb === 't' ? 'by theme' : 'no signal') + '</div>' : '') + '</td><td class="sub">' + esc(s.tm || '–') + '</td><td>' + drvB(s.v) + '</td>' +
      '<td><div class="chips">' + s.c.slice(0, 3).map(clientTag).join('') + (s.c.length > 3 ? '<span class="chip">+' + (s.c.length - 3) + '</span>' : '') + '</div></td>' +
      '<td class="num">' + (s.g === 'D' ? fdate(s.d) : s.g === 'P' ? (s.sa ? fdate(s.sa) + '<div class="sub">' + daysSince(s.sa) + ' days · ' + esc(s.st) + '</div>' : '<span class="sub">' + esc(s.st) + '</span>') : '<span class="sub">created ' + fdate(s.cr) + '</span>') + '</td></tr>').join('')
      : '<tr><td colspan="7"><div class="empty"><b>No story matches.</b><button class="reset" data-reset="delivery">Clear the filters</button></div></td></tr>') + '</tbody></table></div>' +
    (rows.length > f.limit ? '<div class="more"><button class="btn" data-more="delivery">Show ' + Math.min(120, rows.length - f.limit) + ' more</button></div>' : '');
  return h;
}
function paintDeliveryChart() {
  const el = $('#qchart'); if (!el) return;
  const rows = storyRows().filter(s => s.g === 'D' && s.q);
  const curQ = D.meta.today.slice(0, 4) + '-Q' + (Math.floor((+D.meta.today.slice(5, 7) - 1) / 3) + 1);
  const qs = []; for (let y = 2023; y <= 2026; y++) for (let q = 1; q <= 4; q++) { const k = y + '-Q' + q; if (k <= curQ) qs.push(k); }
  const cnt = Object.fromEntries(qs.map(q => [q, {R: 0, C: 0, X: 0, A: 0, '': 0}])); rows.forEach(s => { if (cnt[s.q]) cnt[s.q][s.v || '']++; });
  const tot = q => Object.values(cnt[q]).reduce((a, b) => a + b, 0);
  const max = Math.max(...qs.map(tot), 1), step = max > 200 ? 100 : max > 80 ? 50 : max > 30 ? 20 : 10, nice = Math.ceil(max / step) * step;
  const W = 60, H = 150, L = 40, B = 30, width = L + qs.length * W + 8;
  let s = '<svg viewBox="0 0 ' + width + ' ' + (H + B + 14) + '" role="img" aria-label="Finished stories per quarter by value driver" style="width:100%;height:auto;display:block">' +
    '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="transparent"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--card)" stroke-width="2.4" opacity=".55"/></pattern></defs>';
  for (let t = 0; t <= nice; t += step) { const y = 10 + H - t / nice * H; s += '<line x1="' + L + '" x2="' + (width - 4) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line2)"/><text x="' + (L - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + t + '</text>'; }
  qs.forEach((q, i) => { let y = 10 + H; const x = L + i * W + 10, bw = W - 20;
    ['C', 'A', 'X', 'R', ''].forEach(v => { const n = cnt[q][v]; if (!n) return; const hgt = n / nice * H; y -= hgt;
      s += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + hgt.toFixed(1) + '" fill="' + (v ? 'var(--d-' + v + ')' : 'var(--faint)') + '"><title>' + q + ' ' + (DRV[v] || 'No driver') + ': ' + n + '</title></rect>'; });
    if (q === curQ && tot(q)) s += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + (10 + H - y).toFixed(1) + '" fill="url(#hatch)"><title>' + q + ' is still in progress</title></rect>';
    const t = tot(q); if (t) s += '<text x="' + (x + bw / 2) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle" font-size="11" fill="var(--ink2)">' + t + (q === curQ ? '*' : '') + '</text>';
    s += '<text x="' + (x + bw / 2) + '" y="' + (10 + H + 15) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + q.slice(5) + '</text>';
    if (q.endsWith('Q1')) s += '<text x="' + (x - 4) + '" y="' + (10 + H + 29) + '" font-size="11.5" font-weight="600" fill="var(--ink2)">' + q.slice(0, 4) + '</text>'; });
  el.innerHTML = s + '</svg><div class="prov">* ' + curQ + ' is still in progress (hatched).</div>';
}

// ------------------------------------------------------------------ System
function vSystem() {
  const st = D.meta.steps, lc = D.meta.lastChecks || {pass: 0, warn: [], fail: []}, Q = D.quality;
  const res = r => { if (!r) return ''; return Object.entries(r).filter(([k, v]) => typeof v === 'number' && k !== 'bytes').slice(0, 2).map(([k, v]) => fmt(v) + ' ' + k.replace(/([A-Z])/g, ' $1').toLowerCase()).join(' · '); };
  let h = lede('How this stays true', 'Three loops keep the hub current: agents refresh each source, the build redoes only what changed and checks everything, and this page lays Jira changes over the snapshot for every viewer.', asofLine());
  h += '<section class="sec"><div class="sec-h"><h2>The build</h2><span class="hint">Each step fingerprints its inputs. <code>python3 truth/tools/truth.py run</code> rebuilds only the steps whose inputs changed, then runs every check and refuses on a failure.</span></div>' +
    '<div class="card flow"><div class="st ok"><b>' + Q.sources.length + ' sources</b><span>ledger, stories, requests, demand, catalogue</span></div>' + st.map(s => '<div class="st ' + (s.at ? 'ok' : '') + '"><b>' + esc(s.step[0].toUpperCase() + s.step.slice(1)) + '</b><span>' + esc(res(s.result)) + '</span><span>' + (s.at ? fdt(s.at) : 'never built') + '</span></div>').join('') +
    '<div class="st ok"><b>Live Jira layer</b><span>every ' + LV.everyHours + ' hours, shared by all viewers</span></div></div></section>';
  h += '<div class="grid2"><section class="sec" id="sources"><div class="sec-h"><h2>Sources</h2><span class="hint">A source past its limit shows how to refresh it.</span></div><div class="card tw"><table class="t" style="min-width:600px"><thead><tr><th>State</th><th>Source</th><th>As of</th><th>Feeds</th></tr></thead><tbody>' +
    Q.sources.map(s => '<tr><td><span class="state ' + s.state + '">' + s.state + '</span></td><td><div class="nm">' + esc(s.name) + '</div><div class="sub"><code>' + esc(s.path) + '</code></div>' + (s.state !== 'fresh' ? '<div class="sub" style="margin-top:4px">Refresh: ' + esc(s.refresh).replace(/`([^`]+)`/g, '<code>$1</code>') + '</div>' : '') + '</td><td>' + fdate(s.asOfDate) + '<div class="sub">' + (s.ageDays != null ? s.ageDays + ' days old · limit ' + s.maxAgeDays : '') + '</div></td><td class="sub">' + esc(s.feeds) + '</td></tr>').join('') +
    '</tbody></table></div></section>';
  h += '<section class="sec"><div class="sec-h"><h2>Checks</h2><span class="hint">Last build</span></div><div class="card"><ul class="checks">' +
    '<li><span class="r PASS">PASS</span><span>' + lc.pass + ' gates: one record per client and story, every count reconciles with its source, every client and product resolves, no credential patterns</span></li>' +
    (lc.warn || []).map(w => '<li><span class="r WARN">WARN</span><span>' + esc(w) + '</span></li>').join('') + (lc.fail || []).map(w => '<li><span class="r FAIL">FAIL</span><span>' + esc(w) + '</span></li>').join('') + '</ul></div>' +
    '<div class="sec-h" style="margin-top:8px"><h2>Recent builds</h2></div><div class="card list">' + (D.meta.runs || []).slice().reverse().slice(0, 5).map(r => '<div class="li"><span class="t">' + fdt(r.at) + '</span><span class="m">' + (r.built.length ? 'rebuilt ' + r.built.join(', ') : 'nothing stale') + (r.checks ? ' · ' + r.checks.pass + ' pass, ' + (r.checks.fail || []).length + ' fail' : '') + '</span></div>').join('') + '</div></section></div>';
  const id = Q.identity, ps = Q.products.stories, psT = Object.values(ps).reduce((a, b) => a + b, 0) || 1;
  h += '<section class="sec"><div class="sec-h"><h2>Coverage</h2><span class="hint">What the joins can and cannot see yet</span></div><div class="cov">' +
    '<div class="card"><h3>Who is asking</h3><span class="big">' + id.requestCustomersResolved + ' of ' + id.requestCustomers + '</span><span class="small muted">customers named in requests are ledger clients. ' + fmt(id.outsideOrganisations) + ' organisations sit outside the ledger (prospects, former clients, subsidiaries), ' + id.unresolved + ' of them unresolved (' + decLink('D5') + ').</span>' +
      '<div class="chips">' + id.topGaps.slice(0, 8).map(g => '<span class="chip" title="' + esc(g.via.join(', ')) + '">' + esc(g.name) + ' · ' + g.mentions + '</span>').join('') + '</div></div>' +
    '<div class="card"><h3>Stories on a product</h3><div class="stack">' + [['classified', 'var(--good)'], ['component', 'var(--bar)'], ['theme', 'var(--bar2)'], ['none', 'var(--faint)']].map(([k, c]) => '<i style="width:' + ((ps[k] || 0) / psT * 100) + '%;background:' + c + '"></i>').join('') + '</div>' +
      '<div class="legend">' + [['classified', 'From content'], ['component', 'By component'], ['theme', 'By theme'], ['none', 'No signal']].map(([k, l]) => '<span>' + l + ' <b>' + fmt(ps[k] || 0) + '</b></span>').join('') + '</div></div>' +
    '<div class="card"><h3>Text behind each record</h3><span class="big">' + fmt(Q.text.requestsThin) + '</span><span class="small muted">requests say too little to know why they were raised. ' + fmt(Q.text.storiesNoWhy) + ' stories have no why.</span></div>' +
    '<div class="card"><h3>Known gaps</h3><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:13px">' + Q.knownGaps.map(g => '<li>' + esc(g.text.replace(/\s*\(D\d\)/, '')) + '</li>').join('') + '<li>No contract value or ARR is held anywhere, so revenue at risk cannot be shown.</li></ul></div></div></section>';
  h += '<section class="sec" id="decisions"><div class="sec-h"><h2>Decisions</h2><span class="hint">Until you decide, the default is applied and marked. A choice saved here is stored with who and when, and applies at the next build.</span></div><div class="card" id="decList"></div></section>';
  return h;
}
function renderSystemDecisions() {
  const el = $('#decList'); if (!el) return;
  el.innerHTML = D.meta.decisions.map(d => { const built = d.state, sv = DEC.rows[d.id];
    const cur = sv ? sv.choice : built.choice;
    const tag = sv ? '<span class="tag done">Saved ' + fdate(sv.at) + ' by ' + esc(DEC.names[sv.by] || 'an editor') + (sv.choice !== built.choice ? ' · applies at next build' : '') + '</span>'
      : built.decided ? '<span class="tag done">Decided ' + fdate(built.at) + '</span>' : '<span class="tag">Default applied</span>';
    return '<div class="dec"><h3><span class="id">' + d.id + '</span>' + esc(d.title) + tag + '</h3><p>' + esc(d.why) + '</p><p class="small muted">Affects: ' + esc(d.affects) + '</p>' +
      '<div class="opts" role="radiogroup" aria-label="' + esc(d.title) + '">' + d.options.map((o, i) => '<label><input type="radio" name="dec-' + d.id + '" value="' + i + '"' + (i === cur ? ' checked' : '') + (DEC.canEdit ? '' : ' disabled') + '> <span>' + esc(o) + (i === d.default ? ' <span class="muted small">(default)</span>' : '') + '</span></label>').join('') + '</div>' +
      (DEC.canEdit ? '<div class="row"><label class="sr" for="note-' + d.id + '">Note</label><textarea class="inp" id="note-' + d.id + '" placeholder="Optional note: the reason, or the detail an option asks for">' + esc((sv && sv.note) || '') + '</textarea><button class="btn primary" data-decide="' + d.id + '">Save decision</button></div>'
        : '<p class="small muted">' + (LIVE.db ? 'Only editors of this page can decide.' : 'Open the page in claude.ai to decide here.') + '</p>') + '</div>'; }).join('');
}

// ------------------------------------------------------------------ guide
const GLOSS = [
  ['Act · Watch · Calm', 'How much a client needs attention. Act: a show inside ' + TH.showWindowDays / 7 + ' weeks and 3 or more flags. Watch: 2 or more flags. Calm: fewer.'],
  ['Flags', Object.values(FLAG_LABEL).join('; ') + '. Renewal inside 90 days is shown too.'],
  ['Shipped · Open bugs · Open needs', 'The three numbers on a client card: stories finished for them in 12 months, open client bugs they reported or are affected by, and open needs they asked for that are not built.'],
  ['Request', 'One ticket asking for something: a Feature Request, an open Story or a Feature Intake page.'],
  ['Need', 'One underlying customer need. Several requests can ask for the same need; it counts once.'],
  ['Demand score', 'How strongly our clients ask for a need: for each distinct customer asking, Tier 1 counts 8, Tier 2 4, Tier 3 2, Tier 4 1.'],
  ['Top priority', 'A need that is not built, that a Tier 1 client asks for, where that client also has open bugs in the same product and a show inside ' + TH.showWindowDays / 7 + ' weeks.'],
  ['Built status', 'Not built; Related work only (same area, different need); Partly built (the base exists); Already built. From the product knowledge base.'],
  ['Value driver', 'Why a story was built: ' + Object.entries(DRV).map(([k, v]) => v + ' (' + DRV_HINT[k] + ')').join('; ') + '.'],
  ['Sales Tier', 'T1 are our largest clients, T4 the smallest, from Planhat.'],
  ['Health score', 'Out of 10, from the ledger’s health model (bugs and incidents), written to Planhat nightly.'],
  ['Platform work', 'Stories that name no client: infrastructure, tech debt, product vision.'],
  ['Dates on every page', 'Client data: when the ledger and Planhat were read. Shows: when the event project was read. Built: when this page was generated. In claude.ai, Jira changes since the client-data date are laid on top.']
];
function openGuide() { openItem('guide:all', false); }
function dGuide() {
  const roles = [['Leadership', 'Today (Leadership) → key accounts to act on, renewals, what we build for. Then Clients.'], ['Product', 'Today (Product) → what to build next. Then Demand and Products.'], ['Engineering', 'Today (Engineering) → shows at risk and load by team. Then Quality and Shows.'], ['Customer Success', 'Today (Customer Success), pick your name → clients to call, renewals. Open a card for its Client 360.'], ['Product owner', 'Products → your product → its needs, bugs and delivery.'], ['Engineering manager', 'Quality → By team, or Delivery with your team selected.']];
  const body = '<section class="card block"><h3>Where each role starts</h3><div class="list">' + roles.map(([r, t]) => '<div class="li"><span class="t">' + r + '</span><span class="m">' + esc(t) + '</span></div>').join('') + '</div></section>' +
    '<section class="card block"><h3>Terms</h3><dl class="kv gloss">' + GLOSS.map(([t, d]) => '<dt>' + esc(t) + '</dt><dd>' + esc(d) + '</dd>').join('') + '</dl></section>' +
    '<section class="card block"><h3>Keys</h3><dl class="kv"><dt><kbd>/</kbd></dt><dd>Search clients, products, needs and stories</dd><dt><kbd>Esc</kbd></dt><dd>Close a panel, or go back one level</dd></dl></section>' +
    '<div class="prov">Links to a client, product or need can be copied from the address bar and shared.</div>';
  return {kind: 'Guide', title: 'How to read this hub', body};
}

// ------------------------------------------------------------------ drawer
const DR = {stack: [], opener: null, pushed: false};
const REF_RX = /^(client|product|need|story|request|guide)-(.+)$/;
const refToHash = ref => ref.replace(':', '-');
function openItem(ref, nested, fromHash) {
  if (!DR.stack.length) DR.opener = document.activeElement;
  if (nested && DR.stack.length) DR.stack.push(ref); else DR.stack = [ref];
  if (!fromHash) { if (!DR.pushed) { history.pushState({drawer: 1}, '', '#' + refToHash(ref)); DR.pushed = true; } else history.replaceState({drawer: 1}, '', '#' + refToHash(ref)); }
  paintDrawer();
}
function closeDrawer(fromHash) {
  if (!DR.stack.length && $('#drawer').hidden) return;
  DR.stack = []; $('#drawer').hidden = true; $('#scrim').hidden = true; document.body.style.overflow = '';
  if (!fromHash) { if (DR.pushed) { DR.pushed = false; history.back(); } else history.replaceState(null, '', '#' + S.tab); }
  DR.pushed = false;
  if (DR.opener && DR.opener.focus) DR.opener.focus();
}
function paintDrawer() {
  const ref = DR.stack[DR.stack.length - 1]; if (!ref) return closeDrawer();
  const [kind, ...rest] = ref.split(':'); const id = rest.join(':');
  const fn = {client: dClient, product: dProduct, need: dNeed, story: dStory, request: dRequest, guide: dGuide}[kind];
  const out = fn ? fn(id) : null; if (!out) { toast('That item is not in this build.', true); return closeDrawer(); }
  const dr = $('#drawer');
  dr.innerHTML = '<div class="dr-h"><div class="dr-top">' + (DR.stack.length > 1 ? '<button class="icon-btn" data-back aria-label="Back" title="Back">' + ico('back') + '</button>' : '') +
    '<span class="kind">' + out.kind + '</span><span class="sp"></span>' + (out.link ? '<a class="icon-btn" href="' + out.link + '" target="_blank" rel="noopener" aria-label="Open in Jira" title="Open in Jira">' + ico('ext') + '</a>' : '') +
    '<button class="icon-btn" data-close aria-label="Close" title="Close (Esc)">' + ico('close') + '</button></div><h2 id="drawerTitle">' + out.title + '</h2>' + (out.meta ? '<div class="meta">' + out.meta + '</div>' : '') + '</div><div class="dr-b">' + out.body + '</div>';
  dr.hidden = false; $('#scrim').hidden = false; document.body.style.overflow = 'hidden';
  dr.querySelector('.dr-b').scrollTop = 0; (dr.querySelector('[data-close]')).focus();
}
const block = (title, sub, inner) => '<section class="card block"><h3>' + title + (sub ? '<small>' + sub + '</small>' : '') + '</h3>' + inner + '</section>';
const subh = t => '<div class="subh">' + t + '</div>';
const liStory = s => '<button class="li" data-open="story:' + esc(s.k) + '"><span class="t">' + esc(s.s) + '</span><span class="m"><span class="jira">' + esc(s.k) + '</span><span>' + (s.g === 'D' ? fdate(s.d) : STAGE[s.g]) + '</span><span>' + esc(P[s.p] || '') + '</span>' + (s.tm ? '<span>' + esc(s.tm) + '</span>' : '') + drvB(s.v) + '</span></button>';
const liNeed = k => '<button class="li" data-open="need:' + esc(k.id) + '"><span class="t">' + esc(k.n) + '</span><span class="m"><span>' + esc(P[k.p] || '') + '</span><span class="' + (k.a === 1 ? 'one' : '') + '">' + plural(k.a, 'request') + '</span><span title="' + esc(scoreHint) + '">demand score ' + k.ts + '</span>' + builtB(k.b) + (k.best ? '<span class="star">Top priority</span>' : '') + '</span></button>';
const liBug = b => '<a class="li" href="' + jiraUrl(b.k) + '" target="_blank" rel="noopener"><span class="t"><span class="sev ' + esc(b.pr) + '"></span>' + esc(b.s) + '</span><span class="m"><span class="jira">' + esc(b.k) + '</span><span>' + esc(b.pr) + '</span><span>' + esc(b.st) + '</span><span>' + daysSince(b.cr) + ' days old</span>' + (b.tm ? '<span>' + esc(b.tm) + '</span>' : '') + (b.ev ? '<span>' + esc(b.ev) + '</span>' : '') + '</span></a>';
const liInc = i => '<a class="li" href="' + jiraUrl(i.k) + '" target="_blank" rel="noopener"><span class="t"><span class="sev" style="background:var(--inc)"></span>' + esc(i.s) + '</span><span class="m"><span class="jira">' + esc(i.k) + '</span><span>' + esc(i.pr) + '</span><span>' + esc(i.st) + '</span><span>' + fdate(i.cr) + '</span></span></a>';
const liProm = (p, show) => { const due = promiseDue(p), after = show && due && due > show.start;
  return '<div class="li"><span class="t">' + esc(p.f) + '</span><span class="m">' + (p.k ? '<span class="jira">' + esc(p.k) + '</span>' : '') + '<span>due ' + (p.due ? fdate(p.due) : esc(fmonth(p.mo))) + '</span>' + (after ? '<span class="bad">after ' + esc(show.name) + '</span>' : '') + '<span>' + esc(p.js || p.st) + '</span>' + (p.tm ? '<span>' + esc(p.tm) + '</span>' : '') + p.fl.filter(x => ['overdue', 'dueSoon', 'drift'].includes(x)).map(x => '<span class="chip f-promise">' + ({dueSoon: 'due soon', drift: 'drifting', overdue: 'overdue'}[x]) + '</span>').join('') + '</span></div>'; };
const bars = byYear => { const ys = ['2023', '2024', '2025', '2026'], mx = Math.max(...ys.map(y => byYear[y] || 0), 1);
  return '<svg class="ybars" viewBox="0 0 320 92" role="img" aria-label="Finished per year: ' + ys.map(y => y + ' ' + (byYear[y] || 0)).join(', ') + '">' + ys.map((y, i) => { const v = byYear[y] || 0, h = Math.max(v ? 2 : 0, Math.round(v / mx * 56)), x = 20 + i * 76;
    return '<rect x="' + x + '" y="' + (70 - h) + '" width="52" height="' + h + '" rx="3" fill="var(--bar-built)"/><text x="' + (x + 26) + '" y="' + (64 - h) + '" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink2)">' + v + '</text><text x="' + (x + 26) + '" y="86" text-anchor="middle" font-size="11" fill="var(--muted)">' + y + '</text>'; }).join('') + '<line x1="10" x2="310" y1="70.5" y2="70.5" stroke="var(--line)"/></svg>'; };
const drvStack = counts => { const t = Object.values(counts).reduce((a, b) => a + b, 0) || 1; const m = {'Increase revenue': 'R', 'Protect churn': 'C', 'Reduce cost': 'X', 'Avoid cost': 'A'};
  return '<div style="padding:4px 16px 14px;display:flex;flex-direction:column;gap:8px"><div class="stack">' + Object.entries(m).map(([n, v]) => '<i style="width:' + ((counts[n] || counts[v] || 0) / t * 100) + '%;background:var(--d-' + v + ')"></i>').join('') + '</div><div class="legend">' +
    Object.entries(m).map(([n, v]) => '<span class="drv ' + v + '">' + n + ' <b>' + (counts[n] || counts[v] || 0) + '</b></span>').join('') + '</div></div>'; };
function more(list, n, fn, label) {
  if (list.length <= n) return list.map(fn).join('');
  const id = 'm' + Math.random().toString(36).slice(2, 8);
  return list.slice(0, n).map(fn).join('') + '<div id="' + id + '" hidden>' + list.slice(n).map(fn).join('') + '</div><div class="more"><button class="btn" data-expand="' + id + '">Show all ' + list.length + ' ' + label + '</button></div>';
}
const jump = (label, go) => '<button class="btn small-btn" data-go="' + esc(go) + '">' + label + ' →</button>';
function dClient(id) {
  const c = CL[id]; if (!c) return null; const g = c.g;
  const stories = (S_BY_C[id] || []);
  const done = stories.filter(s => s.g === 'D').sort((a, b) => String(b.d).localeCompare(String(a.d))), prog = stories.filter(s => s.g === 'P');
  const needs = (K_BY_C[id] || []).slice().sort((a, b) => (isOpenNeed(a) ? 0 : 1) - (isOpenNeed(b) ? 0 : 1) || b.ts - a.ts);
  const open = needs.filter(isOpenNeed), builtN = needs.length - open.length;
  const bugs = (B_BY_C[id] || []).slice().sort((a, b) => sevRank(a.pr) - sevRank(b.pr));
  const incs = (I_BY_C[id] || []).filter(incOpen).sort((a, b) => String(b.cr).localeCompare(String(a.cr)));
  const evs = (E_BY_C[id] || []).filter(e => daysTo(e.s) >= 0 && !/cancel/i.test(e.st || '')).sort((a, b) => a.s.localeCompare(b.s));
  const proms = (PR_BY_C[id] || []).filter(p => !p.fl.includes('shipped')); const live = liveFor(id);
  const reqs = R_BY_C[id] || [];
  const byYear = {}; done.forEach(s => { byYear[s.y] = (byYear[s.y] || 0) + 1; });
  const dv = {}; done.forEach(s => { if (s.v) dv[s.v] = (dv[s.v] || 0) + 1; });
  const ns = g.nextShow, rd = renewalDays(c);
  let body = '<div class="chips">' + renewChip(c) + g.flags.map(flagChip).join('') + (live.length ? '<span class="chip live">' + live.length + ' live changes</span>' : '') + '</div>';
  body += '<div class="pnf"><div class="card col now"><span class="k">Now · what is broken</span><span class="v">' + bugs.length + '</span><span class="d">open client bugs (' + g.severeBugs + ' severe), ' + plural(incs.length, 'open incident') + ', ' + plural(proms.length, 'open promise') + '</span></div>' +
    '<div class="card col next"><span class="k">Next · what they ask</span><span class="v">' + open.length + '</span><span class="d">open needs from ' + plural(reqs.length, 'request') + (g.oldestAsk ? ', the oldest from ' + fmonth(g.oldestAsk.slice(0, 7)) : '') + '</span></div>' +
    '<div class="card col past"><span class="k">Past · what we shipped</span><span class="v">' + fmt(done.length) + '</span><span class="d">stories finished, ' + shipped12(id) + ' in the last 12 months' + (g.lastDelivered ? ', latest ' + fdate(g.lastDelivered) : '') + '</span></div></div>';
  body += block('Now: what is broken', plural(bugs.length, 'bug') + ' · ' + plural(incs.length, 'incident') + ' · ' + plural(proms.length, 'promise'), '<div class="list">' +
    (bugs.length ? subh('Open client bugs') + more(bugs, 6, liBug, 'bugs') : '') + (incs.length ? subh('Open incidents') + incs.map(liInc).join('') : '') +
    (proms.length ? subh('Promises') + proms.map(p => liProm(p, ns ? {name: ns.name, start: ns.start} : null)).join('') : '') +
    (!bugs.length && !incs.length && !proms.length ? '<div class="empty">No open client bugs, incidents or promises recorded.</div>' : '') + '</div>');
  if (evs.length) body += block('Shows coming', plural(evs.length, 'booked'), '<div class="list">' + evs.slice(0, 5).map(e => { const r = showRisk(e);
    return '<div class="li"><span class="t">' + esc(e.n) + '</span><span class="m"><span>' + fdate(e.s) + (e.e && e.e !== e.s ? ' to ' + fdate(e.e) : '') + '</span><span>in ' + daysTo(e.s) + ' days</span>' + (r.tagged.length ? '<span class="bad">' + plural(r.tagged.length, 'open bug') + ' for this show</span>' : '') + '<span class="jira">' + esc(e.k) + '</span></span></div>'; }).join('') + '</div>');
  if (live.length) body += block('In Jira since the snapshot', 'live', '<div class="list feed">' + feedHTML(12, live) + '</div>');
  body += block('Next: what they ask for', plural(open.length, 'open need') + (builtN ? ' · ' + builtN + ' built or partly built' : ''), '<div class="list">' + (needs.length ? more(needs, 8, liNeed, 'needs, built ones included') : '<div class="empty">No request names them.</div>') + '</div>' +
    (needs.length ? '<div class="more">' + jump('All their needs in Demand', 'demand:client:' + id) + '</div>' : ''));
  const shown = prog.concat(done);
  body += block('Past: what we shipped', plural(done.length, 'story', 'stories') + ' finished · ' + prog.length + ' in progress', done.length || prog.length ? bars(byYear) + drvStack(dv) + '<div class="list">' + more(shown, 8, liStory, 'stories') + '</div><div class="more">' + jump('All their stories in Delivery', 'delivery:client:' + id) + '</div>' : '<div class="empty">No story we hold names them. That is what the Quiet flag means.</div>');
  if (c.hb) body += block('Health score', (c.h ?? '–') + ' of 10', '<div class="prose"><p>' + esc(c.hb.replace(/^Total:/, 'Quality penalty:')) + '</p><p class="small muted">From the ledger’s health model (bugs and incidents), written to Planhat nightly.</p></div>');
  body += '<div class="prov">Client data from the ledger and Planhat, ' + fdate(D.meta.snapshot.ledger) + ' · Pipedrive id ' + esc(c.id) + ' · <a href="' + D.meta.ledgerUrl + '" target="_blank" rel="noopener">Open the Business Ledger</a></div>';
  return {kind: 'Client 360', title: esc(c.n), meta: tierB(c.t) + ' ' + lvlB(g.level) + (c.ow ? '<span>Owner <b>' + esc(c.ow) + '</b></span>' : '') + '<span>Renewal <b class="' + (rd != null && rd < 0 ? 'bad' : '') + '">' + (c.rnd ? fdate(c.rnd) + (rd < 0 ? ' (passed)' : '') : esc(c.rn || '–')) + '</b></span>' + (c.h != null ? '<span>Health <b>' + c.h + '/10</b></span>' : '') + (c.since ? '<span>Client since <b>' + esc(c.since) + '</b></span>' : '') + (ns ? '<span>Next show <b>' + esc(ns.name) + ', ' + ns.days + ' days</b></span>' : ''), body};
}
function dProduct(i) {
  i = +i; const name = P[i]; if (name == null) return null; const r = PROLL[name] || {}, info = PINFO[name] || {};
  const needs = D.clusters.filter(k => k.p === i);
  const open = needs.filter(isOpenNeed);
  const bugs = D.bugs.filter(b => b.p === i).sort((a, b) => sevRank(a.pr) - sevRank(b.pr));
  const prog = D.stories.filter(s => s.p === i && s.g === 'P');
  const recent = D.stories.filter(s => s.p === i && s.g === 'D').sort((a, b) => String(b.d).localeCompare(String(a.d)));
  let body = '<div class="pnf"><div class="card col now"><span class="k">Broken</span><span class="v">' + fmt(r.bugs) + '</span><span class="d">open client bugs, ' + (r.severeBugs || 0) + ' Urgent or High</span></div>' +
    '<div class="card col next"><span class="k">Asked</span><span class="v">' + fmt(r.clustersOpen) + '</span><span class="d">open needs, demand score ' + fmt(r.tierSignalOpen) + ', ' + plural((r.clientsAsking || []).length, 'client') + ' asking</span></div>' +
    '<div class="card col past"><span class="k">Built</span><span class="v">' + fmt(r.done) + '</span><span class="d">stories finished 2023 to now, ' + (r.inProgress || 0) + ' in progress</span></div></div>';
  if (bugs.length) body += block('Open client bugs', plural(bugs.length, 'bug'), '<div class="list">' + more(bugs, 6, liBug, 'bugs') + '</div><div class="more">' + jump('All in Quality', 'quality:product:' + i) + '</div>');
  body += block('Top open needs', plural(open.length, 'need'), '<div class="list">' + (open.length ? more(open, 8, liNeed, 'needs') : '<div class="empty">No open need.</div>') + '</div>' + (open.length ? '<div class="more">' + jump('All in Demand', 'demand:product:' + i) + '</div>' : ''));
  body += block('Who is asking', plural((r.t1Asking || []).length, 'Tier 1 client'), '<div class="prose"><div class="chips">' + (r.clientsAsking || []).slice().sort((a, b) => (tierOf(a) || 9) - (tierOf(b) || 9)).map(clientChip).join('') + '</div></div>');
  body += block('Built', 'per year and value driver', bars(r.doneByYear || {}) + drvStack(r.drivers || {}) + '<div class="list">' + more(prog.concat(recent), 6, liStory, 'stories') + '</div><div class="more">' + jump('All in Delivery', 'delivery:product:' + i) + '</div>');
  body += block('Catalogue', info.nf + ' documented features', '<div class="prose">' + (info.fl && info.fl.length ? '<div class="chips">' + info.fl.map(f => '<span class="chip">' + esc(f) + '</span>').join('') + '</div>' : '') +
    (info.th && info.th.length ? '<p class="small muted">Customer roadmap themes this product feeds: ' + info.th.map(t => esc(t.name) + ' (' + t.stories + ')').join(', ') + '.</p>' : '') + '</div>');
  if (r.lowConfidenceStories) body += '<div class="prov">' + plural(r.lowConfidenceStories, 'story', 'stories') + ' reach this product only through their roadmap theme (lower confidence, ' + decLink('D4') + ').</div>';
  return {kind: 'Product · ' + esc(info.dom || ''), title: esc(name), meta: '', body};
}
function dNeed(id) {
  const k = KBY[id]; if (!k) return null;
  const led = k.lc.slice().sort((a, b) => (tierOf(a) || 9) - (tierOf(b) || 9)), other = k.c.filter(x => !CL[x]);
  let body = '<div class="chips">' + builtB(k.b) + (k.best ? '<span class="star">Top priority</span>' : '') + '<span class="chip" title="' + esc(scoreHint) + '">demand score ' + k.ts + '</span><span class="chip' + (k.a === 1 ? ' one' : '') + '">' + plural(k.a, 'distinct request') + '</span>' + (k.dup ? '<span class="chip">' + plural(k.dup, 'duplicate') + '</span>' : '') + (k.old ? '<span class="chip">first asked ' + fmonth(k.old.slice(0, 7)) + ' · ' + ago(k.old) + '</span>' : '') + '</div>';
  body += '<section class="card"><div class="prose"><p><span class="lab">What</span>' + esc(k.w) + '</p><p><span class="lab">Why</span>' + esc(k.wy) + '</p><p><span class="lab">Outcome</span>' + esc(k.o) + '</p></div></section>';
  if (k.bf && k.bf.length) body += block('Why it is a top priority', '', '<div class="prose"><p>' + k.bf.map(x => esc(fullName(x))).join(', ') + (k.bf.length > 1 ? ' are' : ' is') + ' Tier 1, ' + (k.bf.length > 1 ? 'have' : 'has') + ' open bugs in ' + esc(P[k.p]) + ', and a show inside ' + TH.showWindowDays / 7 + ' weeks.' + (k.a === 1 ? ' It rests on a single request, so confirm the need before committing.' : '') + '</p></div>');
  body += block('Who asks', plural(led.length, 'ledger client') + (other.length ? ' · ' + other.length + ' other' : ''), '<div class="prose"><div class="chips">' + led.map(clientChip).join('') + other.slice(0, 30).map(clientChip).join('') + (other.length > 30 ? '<span class="chip">+' + (other.length - 30) + '</span>' : '') + '</div></div>');
  const role = {c: 'Main request', d: 'Duplicate', o: 'Overlaps', r: 'Related'};
  body += block('The requests behind it', plural(k.m.length, 'request'), '<div class="list">' + k.m.map(([mid, r]) => { const q = RBY[mid] || {};
    return '<button class="li" data-open="request:' + esc(mid) + '"><span class="t">' + esc(q.t || mid) + '</span><span class="m"><b>' + (role[r] || '') + '</b>' + jiraS(mid) + '<span>' + esc(q.st || '') + '</span>' + (q.cr ? '<span>' + fdate(q.cr) + '</span>' : '') + '</span></button>'; }).join('') + '</div>');
  if (k.bn) body += '<div class="prov">Built overlap: ' + esc(k.bn) + '</div>';
  return {kind: 'Need · ' + esc(P[k.p] || ''), title: esc(k.n), meta: '', body};
}
function dStory(key) {
  const s = SBY[key]; if (!s) return null;
  let body = '<dl class="card kv"><dt>Stage</dt><dd>' + (s.st && s.st !== STAGE[s.g] ? STAGE[s.g] + ' · ' + esc(s.st) : STAGE[s.g]) + '</dd>' + (s.d ? '<dt>Finished</dt><dd>' + fdate(s.d) + ' (' + esc(s.q) + ')</dd>' : '') + (s.sa && s.g !== 'N' ? '<dt>Started</dt><dd>' + fdate(s.sa) + (s.g === 'P' ? ' · ' + daysSince(s.sa) + ' days ago' : '') + '</dd>' : '') + '<dt>Created</dt><dd>' + fdate(s.cr) + '</dd>' +
    '<dt>Product</dt><dd><button class="link" data-open="product:' + s.p + '">' + esc(P[s.p] || '') + '</button> <span class="muted small">' + BASIS[s.pb] + '</span></dd>' +
    (s.th ? '<dt>Roadmap theme</dt><dd>' + esc(THEME[s.th] || s.th) + (s.cf ? '' : ' <span class="muted small">(not customer-facing)</span>') + (s.f ? '<div class="small muted">Feature: ' + esc(s.f) + '</div>' : '') + '</dd>' : '') +
    (s.tm ? '<dt>Team</dt><dd>' + esc(s.tm) + '</dd>' : '') + (s.ep ? '<dt>Epic</dt><dd>' + esc(s.ep) + '</dd>' : '') +
    '<dt>Value driver</dt><dd>' + drvB(s.v) + (s.vw ? '<div class="small muted">' + esc(s.vw) + '</div>' : '') + '</dd>' +
    '<dt>Clients</dt><dd>' + (s.c.length ? '<div class="chips">' + s.c.map(clientChip).join('') + '</div>' : '<span class="muted">Platform work, no client named</span>') + '</dd></dl>';
  if (s.w || s.wy || s.o) body += '<section class="card"><div class="prose">' + (s.w ? '<p><span class="lab">What</span>' + esc(s.w) + '</p>' : '') + (s.wy ? '<p><span class="lab">Why</span>' + esc(s.wy) + '</p>' : '') + (s.o ? '<p><span class="lab">Outcome</span>' + esc(s.o) + '</p>' : '') + '</div></section>';
  return {kind: 'Story · ' + esc(s.k), title: esc(s.s), link: jiraUrl(s.k), meta: '', body};
}
function dRequest(id) {
  const r = RBY[id]; if (!r) return null; const k = r.cl && KBY[r.cl];
  const src = {FR: 'Feature Request', OS: 'Open story', FIS: 'Feature intake page'}[r.src];
  const kind = r.kd ? r.kd.charAt(0).toUpperCase() + r.kd.slice(1) : '';
  let body = '<dl class="card kv"><dt>Source</dt><dd>' + src + ' · ' + jiraA(r.id) + '</dd><dt>Status</dt><dd>' + esc(r.st) + '</dd>' + (r.cr ? '<dt>Raised</dt><dd>' + fdate(r.cr) + ' · ' + ago(r.cr) + '</dd>' : '') +
    '<dt>Product</dt><dd>' + (r.p != null ? '<button class="link" data-open="product:' + r.p + '">' + esc(P[r.p]) + '</button>' : '–') + '</dd>' + (kind ? '<dt>Kind of ask</dt><dd>' + esc(kind === 'Ux' ? 'UX' : kind) + '</dd>' : '') + (r.tm ? '<dt>Team</dt><dd>' + esc(r.tm) + '</dd>' : '') +
    (k ? '<dt>Need</dt><dd><button class="link" data-open="need:' + esc(k.id) + '">' + esc(k.n) + '</button></dd>' : '') +
    '<dt>Who asks</dt><dd>' + (r.c.length ? '<div class="chips">' + r.c.map(clientChip).join('') + '</div>' : '<span class="muted">No customer named</span>') + '</dd></dl>';
  body += '<section class="card"><div class="prose"><p><span class="lab">What</span>' + esc(r.w) + '</p><p><span class="lab">Why</span>' + esc(r.wy) + '</p><p><span class="lab">Outcome</span>' + esc(r.o) + '</p></div></section>';
  if (r.tq && r.tq !== 'clear') body += '<div class="prov">The request text is ' + esc(r.tq) + ', so what and why are read as far as it allows.</div>';
  return {kind: 'Request', title: esc(r.t), link: /^[A-Z]+-\d+$/.test(r.id) ? jiraUrl(r.id) : null, meta: '', body};
}

// ------------------------------------------------------------------ search palette
const PAL = {items: [], sel: 0};
function openPalette() { $('#palette').hidden = false; const q = $('#q'); q.value = ''; runSearch(''); q.focus(); }
function closePalette() { $('#palette').hidden = true; }
function runSearch(q) {
  const n = norm(q), res = [];
  if (n) {
    D.clients.forEach(c => { if (norm(c.n).includes(n) || (c.k === 'client' && norm(c.sh).startsWith(n)) || norm(c.ow) === n) res.push({g: 'Clients', t: c.n, m: 'T' + (c.t || '–') + ' · ' + c.g.level + (c.ow ? ' · ' + c.ow : ''), ref: 'client:' + c.id}); });
    P.forEach((p, i) => { if (norm(p).includes(n)) res.push({g: 'Products', t: p, m: (PINFO[p] || {}).dom || '', ref: 'product:' + i}); });
    const km = q.trim().match(/^([a-zA-Z]+)[-\s]?(\d+)$/), key = km ? (km[1] + '-' + km[2]).toUpperCase() : null;
    if (key && SBY[key]) res.push({g: 'Stories', t: SBY[key].s, m: key, ref: 'story:' + key});
    if (key && RBY[key]) res.push({g: 'Requests', t: RBY[key].t, m: key, ref: 'request:' + key});
    let k = 0; for (const c of D.clusters) { if (k >= 8) break; if (norm(c.n).includes(n)) { res.push({g: 'Needs', t: c.n, m: (P[c.p] || '') + ' · score ' + c.ts, ref: 'need:' + c.id}); k++; } }
    k = 0; for (const s of D.stories) { if (k >= 8) break; if (norm(s.s).includes(n)) { res.push({g: 'Stories', t: s.s, m: s.k, ref: 'story:' + s.k}); k++; } }
  } else {
    D.ranking.slice(0, 6).forEach(id => res.push({g: 'Clients to act on', t: CL[id].n, m: 'T' + (CL[id].t || '–') + ' · ' + CL[id].g.level, ref: 'client:' + id}));
  }
  PAL.items = res.slice(0, 40); PAL.sel = 0; paintPalette();
}
function paintPalette() {
  let h = '', g = null;
  PAL.items.forEach((it, i) => { if (it.g !== g) { g = it.g; h += '<div class="grp">' + esc(g) + '</div>'; }
    h += '<div class="it" role="option" id="opt' + i + '" aria-selected="' + (i === PAL.sel) + '" data-pick="' + i + '"><span class="t">' + esc(it.t) + '</span><span class="m">' + esc(it.m) + '</span></div>'; });
  $('#qres').innerHTML = h || '<div class="empty">Nothing matches.</div>';
  const el = $('#opt' + PAL.sel); if (el) el.scrollIntoView({block: 'nearest'});
}
function pick(i) { const it = PAL.items[i]; if (!it) return; closePalette(); openItem(it.ref, false); }

// ------------------------------------------------------------------ toast
let toastT = null;
function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, bad ? 8000 : 4000); }

// ------------------------------------------------------------------ navigation from tiles and drawer buttons
function go(spec) {
  const [tab, what, arg] = spec.split(':');
  const wasOpen = !$('#drawer').hidden;
  if (wasOpen) { DR.stack = []; $('#drawer').hidden = true; $('#scrim').hidden = true; document.body.style.overflow = ''; DR.pushed = false; }
  if (tab === 'system') { setTab('system'); if (what) setTimeout(() => { const d = document.getElementById(what); if (d) d.scrollIntoView(); }, 30); return; }
  if (tab === 'today' && what === 'feed') { const f = $('#feed'); if (f) f.scrollIntoView({behavior: 'smooth'}); return; }
  if (S[tab] && DEF[tab] && tab !== 'products') Object.assign(S[tab], clone(DEF[tab]));
  if (tab === 'clients') { if (what === 'act') S.clients.level = 'act'; if (what === 'renew') { S.clients.renew = '90'; S.clients.sort = 'renewal'; S.clients.dir = 1; } }
  if (tab === 'demand') { if (what === 'best') S.demand.best = true; if (what === 't1') S.demand.tier = '1'; if (what === 'product') S.demand.p = arg; if (what === 'client') S.demand.q = fullName(arg); }
  if (tab === 'delivery') { if (what === 'progress') { S.delivery.g = 'P'; S.delivery.sort = 'd'; S.delivery.dir = 1; } if (what === 'product') { S.delivery.p = arg; S.delivery.g = 'all'; } if (what === 'client') { S.delivery.q = fullName(arg); S.delivery.g = 'all'; } }
  if (tab === 'quality') { if (what === 'severe') S.quality.pr = 'severe'; if (what === 'teams') S.quality.sub = 'teams'; if (what === 'team') { S.quality.pr = 'all'; S.quality.tm = arg || ''; } if (what === 'product') { S.quality.pr = 'all'; S.quality.p = arg; } }
  if (tab === 'shows') { if (what === 'risk') S.shows.risk = true; }
  if (tab === 'products' && what) { S.products.sort = what; savePrefs(); }
  setTab(tab);
  if (tab === 'shows' && what === 'promises') setTimeout(() => { const d = $('#promises'); if (d) d.scrollIntoView(); }, 30);
}

// ------------------------------------------------------------------ events
const setPath = (path, v) => { const [a, b] = path.includes('.') ? path.split('.') : [null, path]; if (a) { S[a][b] = v; if ('limit' in S[a]) S[a].limit = DEF[a].limit; if (a === 'products') savePrefs(); } else { S[b] = v; savePrefs(); } };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab],[data-open],[data-go],[data-f],[data-sort],[data-more],[data-reset],[data-close],[data-back],[data-expand],[data-pick],[data-decide],[data-guide],#refreshNow,#openSearch,#openGuide,#livePill');
  if (!t) { if (e.target.id === 'scrim') closeDrawer(); if (e.target.id === 'palette') closePalette(); return; }
  if (t.dataset.tab) { if (!$('#drawer').hidden) closeDrawer(); return setTab(t.dataset.tab); }
  if (t.dataset.open) { e.preventDefault(); return openItem(t.dataset.open, !$('#drawer').hidden); }
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.f) { setPath(t.dataset.f, t.dataset.v); return render(); }
  if (t.dataset.sort) { const [tab, k] = t.dataset.sort.split(':'); const f = S[tab]; if (f.sort === k) f.dir *= -1; else { f.sort = k; f.dir = (['name', 'tier', 'show', 'p', 'attention', 'renewal', 'health', 'tm'].includes(k)) ? 1 : -1; } return render(); }
  if (t.dataset.more) { S[t.dataset.more].limit += t.dataset.more === 'demand' ? 100 : 120; return render(); }
  if (t.dataset.reset) { Object.assign(S[t.dataset.reset], clone(DEF[t.dataset.reset])); return render(); }
  if (t.hasAttribute('data-close')) return closeDrawer();
  if (t.hasAttribute('data-back')) { DR.stack.pop(); history.replaceState({drawer: 1}, '', '#' + refToHash(DR.stack[DR.stack.length - 1])); return paintDrawer(); }
  if (t.dataset.expand) { const x = document.getElementById(t.dataset.expand); if (x) { x.hidden = false; t.parentElement.remove(); } return; }
  if (t.dataset.pick) return pick(+t.dataset.pick);
  if (t.hasAttribute('data-guide') || t.id === 'openGuide') return openGuide();
  if (t.dataset.decide) { const id = t.dataset.decide, r = $('input[name="dec-' + id + '"]:checked'); if (!r) return toast('Choose an option first.', true); return saveDecision(id, +r.value, ($('#note-' + id) || {}).value || ''); }
  if (t.id === 'refreshNow') return LIVE.running ? null : liveRun(true);
  if (t.id === 'openSearch') return openPalette();
  if (t.id === 'livePill') { if (S.tab !== 'today') setTab('today'); setTimeout(() => { const f = $('#feed'); if (f) f.scrollIntoView({behavior: 'smooth'}); }, 30); }
});
let inT = null;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') return runSearch(t.value);
  if (t.dataset.input) { clearTimeout(inT); const path = t.dataset.input, v = t.value, id = t.id; inT = setTimeout(() => { setPath(path, v); render(); const n = document.getElementById(id); if (n) { n.focus(); n.setSelectionRange(v.length, v.length); } }, 160); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.select) { setPath(t.dataset.select, t.value); render(); }
  if (t.dataset.check) { setPath(t.dataset.check, t.checked); render(); }
});
document.addEventListener('keydown', e => {
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName);
  if (!$('#palette').hidden) {
    if (e.key === 'Escape') return closePalette();
    if (e.key === 'ArrowDown') { e.preventDefault(); PAL.sel = Math.min(PAL.items.length - 1, PAL.sel + 1); return paintPalette(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); PAL.sel = Math.max(0, PAL.sel - 1); return paintPalette(); }
    if (e.key === 'Enter') { e.preventDefault(); return pick(PAL.sel); }
    return;
  }
  if (e.key === 'Escape' && !$('#drawer').hidden) { if (DR.stack.length > 1) { DR.stack.pop(); history.replaceState({drawer: 1}, '', '#' + refToHash(DR.stack[DR.stack.length - 1])); paintDrawer(); } else closeDrawer(); return; }
  if ((e.key === '/' && !inField) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); return openPalette(); }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('tr.r[data-open],tr.r[data-go]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Tab' && !$('#drawer').hidden) {
    const f = $$('#drawer button, #drawer a[href], #drawer [tabindex="0"]').filter(x => !x.closest('[hidden]'));
    if (f.length) { const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }
});
function fromHash() {
  const h = decodeURIComponent(location.hash.replace('#', '')), m = h.match(REF_RX);
  if (m) { openItem(m[1] + ':' + m[2], false, true); return true; }
  if (TABS.some(t => t.id === h)) { if (!$('#drawer').hidden) closeDrawer(true); if (h !== S.tab) setTab(h, {fromHash: true}); return true; }
  if (!$('#drawer').hidden) closeDrawer(true);
  return false;
}
window.addEventListener('popstate', () => { DR.pushed = false; fromHash(); });

// ------------------------------------------------------------------ boot
const h0 = decodeURIComponent(location.hash.replace('#', ''));
if (TABS.some(t => t.id === h0)) S.tab = h0;
paintTabs(); render();
if (REF_RX.test(h0)) fromHash();
liveBoot();
