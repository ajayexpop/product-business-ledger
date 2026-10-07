// In-page QA probe for the ledger (tools/qa.py injects it). Visits every tab and sub-view, every zoom level and range,
// clicks every kind of chart mark, cell, row and card, and after each step checks the page for: JavaScript errors,
// escaped HTML shown as text, content spilling out of cards, overlapping or clipped grid cells, chart labels that collide
// or fall outside the chart, and clicks that do nothing. The report is written into <pre id="__qa">.
(async () => {
  const R = {errors: [], steps: 0, issues: [], clicks: {ok: 0, none: []}, notes: []};
  let cur = 'load';
  addEventListener('error', e => R.errors.push({step: cur, msg: String(e.message) + ' @' + e.lineno}));
  addEventListener('unhandledrejection', e => R.errors.push({step: cur, msg: 'rejection ' + String(e.reason && (e.reason.message || e.reason.code) || e.reason)}));
  const W = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const desc = el => { const id = el.id ? '#' + el.id : ''; const c = (el.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 2).join('.'); const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50); return el.tagName.toLowerCase() + id + (c ? '.' + c : '') + (t ? ' «' + t + '»' : ''); };
  const seen = new Set();
  const issue = (o) => { const k = o.kind + '|' + (o.el || '') + '|' + (o.text || '') + '|' + (o.a || '') + '|' + (o.b || ''); if (seen.has(k)) return; seen.add(k); R.issues.push(o); };
  function check(label) {
    cur = label; R.steps++;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) {
      const t = n.nodeValue;
      if (/<\/?(br|b|i|span|div|p|a|small|strong|em|li|ul)\b[^>]*>|&(lt|gt|amp|quot|nbsp|#\d+);/i.test(t)) {
        const el = n.parentElement; if (el && vis(el) && !el.closest('script,style,textarea,input,#__qa,title')) issue({step: label, kind: 'escaped-html', el: desc(el), text: t.trim().slice(0, 80)});
      }
      if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(t)) { const el = n.parentElement; if (el && vis(el) && !el.closest('script,style,textarea,input,#__qa')) issue({step: label, kind: 'bad-value', el: desc(el), text: t.trim().slice(0, 80)}); }
    }
    $$('.card,.pp-stat,.ov-stat,.rd,.cal-w,.dm-hit,.fe-stamp,.kpi,.tp-row,.ag-row,.rc-row,.rq,.pr-row,.find-row,.fe-sec2,.dm-rr').forEach(el => {
      if (!vis(el)) return; const cs = getComputedStyle(el);
      if (cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 3) issue({step: label, kind: 'overflow', el: desc(el), by: el.scrollWidth - el.clientWidth});
    });
    $$('.card,.fe-sec2').forEach(card => {
      if (!vis(card)) return; const cr = card.getBoundingClientRect();
      card.querySelectorAll('svg,.dm-bars,.tp,.cal,.dm-heat,.dm-rl,.legend,.dm-sbar,.fe-levers').forEach(ch => {
        if (!vis(ch) || ch.closest('.pp-wrap,.tlwrap,.fe-flowwrap,.tablewrap')) return;
        const r = ch.getBoundingClientRect(); if (r.right > cr.right + 3) issue({step: label, kind: 'spills-out-of-card', el: desc(ch), by: Math.round(r.right - cr.right)});
      });
    });
    $$('.pp-tl .cell,#tl .cell,#dtl .cell,.pp-tl .cname,#tl .cname,#dtl .cname').forEach(cell => {
      if (!vis(cell)) return; const kids = [...cell.children].filter(vis);
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) { issue({step: label, kind: 'overlap-in-cell', el: desc(cell)}); return; }
      }
      const cs = getComputedStyle(cell);
      if ((cs.overflow === 'hidden' || cs.overflowY === 'hidden') && cell.scrollHeight > cell.clientHeight + 4) issue({step: label, kind: 'clipped-cell', el: desc(cell), by: cell.scrollHeight - cell.clientHeight});
    });
    $$('svg.chart,svg.dm-qchart,svg.fe-flow').forEach(svg => {
      if (!vis(svg)) return;
      const ts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim()).map(t => ({t, r: t.getBoundingClientRect()}));
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].r, b = ts[j].r;
        if (a.width && b.width && a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) issue({step: label, kind: 'chart-text-overlap', el: desc(svg).slice(0, 40), a: ts[i].t.textContent.slice(0, 30), b: ts[j].t.textContent.slice(0, 30)});
      }
      const sr = svg.getBoundingClientRect();
      svg.querySelectorAll('rect,text,circle,path').forEach(x => {
        const r = x.getBoundingClientRect();
        if (r.width && (r.left < sr.left - 3 || r.right > sr.right + 3 || r.top < sr.top - 3 || r.bottom > sr.bottom + 3)) issue({step: label, kind: 'chart-outside', el: desc(svg).slice(0, 40), text: (x.textContent || x.getAttribute('class') || x.tagName).slice(0, 30)});
      });
    });
    // text inside a flow node must stay inside its box
    $$('svg.fe-flow .fe-callout').forEach(c => { if (!vis(c)) return; const r = c.querySelector('rect').getBoundingClientRect(), x = c.querySelector('text').getBoundingClientRect(); if (x.width && (x.left < r.left - 1 || x.right > r.right + 1)) issue({step: label, kind: 'text-outside-callout', el: 'fe-callout', text: c.textContent.slice(0, 40)}); });
    $$('svg.fe-flow .fe-callout rect').forEach(c => { if (!vis(c)) return; const cr = c.getBoundingClientRect();
      c.ownerSVGElement.querySelectorAll('g.fe-node rect').forEach(n => { const r = n.getBoundingClientRect(); if (cr.left < r.right - 1 && r.left < cr.right - 1 && cr.top < r.bottom - 1 && r.top < cr.bottom - 1) issue({step: label, kind: 'callout-over-node', el: 'fe-callout', text: c.nextElementSibling ? c.nextElementSibling.textContent.slice(0, 40) : ''}); }); });
    $$('svg.fe-flow g.fe-node').forEach(g => { if (!vis(g)) return; const box = g.querySelector('rect'); if (!box) return; const br = box.getBoundingClientRect();
      g.querySelectorAll('text').forEach(t => { const r = t.getBoundingClientRect(); if (r.width && (r.right > br.right + 1 || r.left < br.left - 1)) issue({step: label, kind: 'text-outside-node', el: 'fe-node', text: t.textContent.slice(0, 30)}); }); });
  }
  // what a click changed: a dialog, a panel, the view or the host content
  const hash = str => { let h = 0; for (let i = 0; i < str.length; i += 7) h = (h * 31 + str.charCodeAt(i)) | 0; return h + ':' + str.length; };
  const sig = () => { const q = $('#__qa'); return hash(document.body.innerHTML) + '|' + Math.round(scrollY) + '|' + document.querySelectorAll('.modal[open]').length + '|' + (($('#find') && !$('#find').hidden) ? 'find' : ''); };
  async function closeAll() {
    for (let k = 0; k < 3; k++) {
      const d = $('.ui-dlg [data-uino]'); if (d) { d.click(); await W(80); }
      const e = $('#pp-edm [data-edclose]'); if (e) { e.click(); await W(80); const d2 = $('.ui-dlg [data-uiyes]'); if (d2) { d2.click(); await W(80); } }
      const f = $('.fe-m [data-feclose]'); if (f) { f.click(); await W(80); }
      if ($('#modal') && $('#modal').hasAttribute('open')) { $('#modal .x').click(); await W(80); }
      if ($('#c360') && !$('#c360').hidden) { $('#c360 [data-c360close]').click(); await W(80); }
      if ($('#find') && !$('#find').hidden) { $('#find [data-findclose]').click(); await W(80); }
      if ($('#ob-card')) { $('#ob-card [data-obtend]').click(); await W(60); }
      if ($('#ob-guide')) { $('#ob-guide [data-obclose]').click(); await W(60); }
      if ($('#fb-in')) { $('#fb-in .x').click(); await W(60); }
      if ($('#bt-m')) { const c = $('#bt-m [data-btclose]'); if (c) c.click(); else btClose(); await W(80); }
    }
  }
  async function tab(t) { const b = $('.tab[data-tab="' + t + '"]'); if (b) { b.click(); await W(350); } }
  async function clicks(sel, n, label, opt) {
    opt = opt || {};
    const els = $$(sel).filter(vis).slice(0, n);
    if (!els.length && !opt.optional) R.notes.push('nothing to click: ' + label + ' (' + sel + ')');
    for (let i = 0; i < els.length; i++) {
      const el = opt.fresh ? $$(sel).filter(vis)[i] : els[i]; if (!el || !el.isConnected) continue;
      const d = desc(el);
      if (el.getAttribute('aria-pressed') === 'true' || el.classList.contains('on')) { R.clicks.skipped = (R.clicks.skipped || 0) + 1; continue; }
      const before = sig();
      el.scrollIntoView({block: 'center'});
      el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
      await W(opt.wait || 260);
      const after = sig();
      if (before === after) R.clicks.none.push(label + ': ' + d); else R.clicks.ok++;
      check(label + ' → ' + d.slice(0, 50));
      if (!opt.keep) await closeAll();
      if (opt.after) await opt.after();
    }
  }
  const setVal = (sel, v) => { const el = $(sel); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; };

  const AJ = window.__QA_AS !== 'other';
  const keysOf = pre => Object.keys(window.__QA_STORE).filter(k => k.startsWith(pre));
  async function pickClient(id) { const i = $('#' + id + '-in'); if (!i) return; i.click(); setVal('#' + id + '-in', ''); await W(150); const o = $('#bt-m [data-btcpadd^="' + id + '|"]:not([data-btcpadd$="|Platform"])'); if (o) { o.click(); await W(200); } }
  async function betaProbe() {
    const NOMCP = window.__QA_AS === 'nomcp';
    check('beta: open'); if (!$('#bt-m .bt-beta')) R.issues.push({step: 'beta', kind: 'beta-tag-missing'});
    if (!BT.test) { $('#bt-test').click(); await W(300); } if (!/Test mode is on/.test($('#bt-m').textContent)) R.issues.push({step: 'beta', kind: 'test-bar-missing'});
    await dmLoad(); await W(200);
    // 1. quick share that joins a need already asked for
    await pickClient('shc'); if (!BT.s.clients.length) R.issues.push({step: 'beta', kind: 'client-picker'});
    setVal('#bt-raw', 'Exhibitors want visitors to be able to sort the marketplace so the newest products show first'); $('#bt-m [data-btfill]').click(); await W(900); check('beta: filled');
    if (!/newest/.test(($('#bt-what') || {}).value || '')) R.issues.push({step: 'beta', kind: 'fill-did-not-fill'});
    if (!$('#bt-m .bt-cite')) R.issues.push({step: 'beta', kind: 'no-source-chips'});
    const pickA = $('#bt-m [data-btpick^="a:"]'); if (!pickA) R.issues.push({step: 'beta', kind: 'no-need-match'});
    else { pickA.click(); await W(200); const nV = keysOf('ledger-voices/').length;
      $('#bt-m [data-btgo]').click(); await W(900); check('beta: tidy'); if ($('#bt-m [data-bttidy]')) { $('#bt-m [data-bttidy$="|mine"]').click(); await W(100); }
      if ($('#bt-m [data-btgo]')) { $('#bt-m [data-btgo]').click(); await W(900); }
      if (!vis($('#bt-m .bt-done'))) R.issues.push({step: 'beta', kind: 'share-not-saved'}); else check('beta: joined');
      if (keysOf('ledger-voices/').length !== nV + 1) R.issues.push({step: 'beta', kind: 'voice-not-written'});
      else { const v = window.__QA_STORE[keysOf('ledger-voices/').pop()]; if (!v.test || v.kind !== 'join' || !v.sig) R.issues.push({step: 'beta', kind: 'voice-shape', text: JSON.stringify(v).slice(0, 120)}); }
      if ($('#bt-ans')) { setVal('#bt-ans', 'Web and app'); $('#bt-m [data-btans]').click(); await W(500); if (!/Added, thank you/.test($('#bt-m').textContent)) R.issues.push({step: 'beta', kind: 'answer-not-saved'}); }
      $('#bt-m [data-btnew]').click(); await W(300); }
    // 2. quick share as a new work item (test)
    await pickClient('shc'); setVal('#bt-raw', 'Organisers want an estimate of each attendee travel carbon footprint shown on their event dashboard'); $('#bt-m [data-btfill]').click(); await W(900);
    const none = $('#bt-m [data-btpick="none"]'); if (none) { none.click(); await W(150); }
    if (!BT.s.area) { const a = $('#bt-area'); if (a && a.options.length > 1) { a.value = a.options[1].value; a.dispatchEvent(new Event('change', {bubbles: true})); } }
    const nL = keysOf('ledger/LE-TEST-').length; $('#bt-m [data-btgo]').click(); await W(900); if ($('#bt-m [data-btgo]')) { $('#bt-m [data-btgo]').click(); await W(1200); }
    const newIds = keysOf('ledger/LE-TEST-'); if (newIds.length !== nL + 1) R.issues.push({step: 'beta', kind: 'item-not-written', text: ($('#bt-foot') || {}).textContent});
    else { const it = window.__QA_STORE[newIds[newIds.length - 1]]; if (!it.test || !it.v.beta || it.status !== 'submitted' || !it.v.title || !it.v.productArea) R.issues.push({step: 'beta', kind: 'item-shape', text: JSON.stringify(it).slice(0, 160)}); check('beta: logged'); }
    if (keysOf('config/ledger-seq').length && window.__QA_STORE['config/ledger-seq'] && /TEST/.test(window.__QA_STORE['config/ledger-seq'].lastId || '')) R.issues.push({step: 'beta', kind: 'test-used-a-number'});
    // 3. from a call recording
    $('#bt-m [data-btnew]').click(); await W(300); $('#bt-m [data-btsrc="call"]').click(); await W(200); setVal('#bt-url', 'https://fathom.video/share/qa'); $('#bt-m [data-btfetch]').click(); await W(1500); check('beta: call');
    if (NOMCP) { if (!vis($('#bt-m .bt-note.bad'))) R.issues.push({step: 'beta', kind: 'no-connector-message-missing'}); }
    else { if (!vis($('#bt-m .bt-call'))) R.issues.push({step: 'beta', kind: 'call-not-read'}); if (!$('#bt-m .bt-cite.call')) R.issues.push({step: 'beta', kind: 'call-cite-missing'}); }
    // 4. the full review, from step 1 to a logged item with the value handed to sales
    $('#bt-m [data-btmode="drop"]').click(); await W(300); check('beta: review step 1');
    if (!BT.d.clients.length) await pickClient('drc'); if (!BT.d.what) setVal('#bd-what', 'Exhibitors want visitors to sort the marketplace so the newest products show first');
    $('#bt-m [data-btnav="next"]').click(); await W(500); check('beta: review step 2');
    const lk = $('#bt-m [data-btlink]'); if (!lk) R.issues.push({step: 'beta', kind: 'review-no-matches'}); else { lk.click(); await W(200); }
    const dec = $('#bt-m [data-btdecide="builds"]'); if (dec && BT.d.links.length) { dec.click(); await W(150); } else if ($('#bt-m [data-btdecide="new"]')) { $('#bt-m [data-btdecide="new"]').click(); await W(150); }
    $('#bt-m [data-btnav="next"]').click(); await W(400); check('beta: review step 3');
    $('#bt-m [data-btai]').click(); await W(900); check('beta: draft'); if (!$('#bt-m .bt-air')) R.issues.push({step: 'beta', kind: 'draft-missing'});
    const acc = $('#bt-m [data-btaccept]'); if (acc) { acc.click(); await W(150); }
    if (!BT.d.draft.why || BT.d.draft.why.length < 8) setVal('#bd-dwhy', 'Visitors scroll the whole list and miss the newest products.');
    $('#bt-m [data-btnav="next"]').click(); await W(400); check('beta: review step 4');
    const ar = $('#bd-area'); if (ar && ar.options.length > 1) { ar.value = ar.options[1].value; ar.dispatchEvent(new Event('change', {bubbles: true})); }
    const sq = $('#bd-sq'); if (sq) { sq.focus(); setVal('#bd-sq', 'Chris'); await W(500); const sb = $('#bt-m [data-btsales]'); if (sb) { sb.click(); await W(300); } else R.issues.push({step: 'beta', kind: 'sales-search-empty'}); }
    const n2 = keysOf('ledger/LE-TEST-').length;
    $('#bt-m [data-btnav="next"]').click(); await W(900); if ($('#bt-m [data-btdtidy]')) { $('#bt-m [data-btnav="next"]').click(); await W(1200); }
    const ids2 = keysOf('ledger/LE-TEST-'); if (ids2.length !== n2 + 1) R.issues.push({step: 'beta', kind: 'review-item-not-written', text: ($('#bt-foot') || {}).textContent + ' | ' + JSON.stringify({step: BT.d.step, dec: BT.d.decision, links: BT.d.links, area: BT.d.area, w: BT.d.draft.what.length, y: BT.d.draft.why.length, sales: BT.d.sales, tidy: !!BT.d.tidy, saving: BT.d.saving})});
    else { const it = window.__QA_STORE[ids2[ids2.length - 1]]; if (!((it.v.handoff || {}).lever || {}).to) R.issues.push({step: 'beta', kind: 'value-not-handed-to-sales'}); if (!(it.v.beta.links || []).length) R.issues.push({step: 'beta', kind: 'links-not-saved'}); check('beta: review logged'); }
    // 5. the item: the Beta section, link more, then test items drop out when test mode goes off
    const op = $('#bt-m [data-btopenitem]'); if (op) { op.click(); await W(900); if (!vis($('#modal .bt-entry'))) R.issues.push({step: 'beta', kind: 'entry-section-missing'}); else check('beta: item');
      const lq = $('#modal .bt-lq'); if (lq) { setVal('#modal .bt-lq', 'marketplace newest products sort'); await W(600); const l2 = $('#modal [data-btilink]'); if (l2) { l2.click(); await W(900); check('beta: linked more'); } }
      await closeAll(); } else R.issues.push({step: 'beta', kind: 'open-item-missing'});
    await closeAll();
    btSetTest(false); await W(300); if (FE.rows.some(r => r.test)) R.issues.push({step: 'beta', kind: 'test-items-counted'}); if (/LE-TEST-/.test(($('#fl-host') || {}).textContent || '')) R.issues.push({step: 'beta', kind: 'test-items-shown'});
    btSetTest(true); await W(200);
    if (!hsAll().some(x => x.src === 'beta')) R.issues.push({step: 'beta', kind: 'history-missing-beta'});
    // clear the tests from the lab
    showTab('refresh'); await W(300); HS.sub = 'beta'; hsShow(); await W(200);
    const del = $('#bt-lab [data-btlab="del"]'); if (!del) R.issues.push({step: 'beta lab', kind: 'delete-missing'}); else { del.click(); await W(150); $('#bt-lab [data-btlab="delyes"]').click(); await W(900);
      if (keysOf('ledger/LE-TEST-').length || keysOf('ledger-voices/').some(k => window.__QA_STORE[k].test)) R.issues.push({step: 'beta lab', kind: 'tests-not-deleted'}); else check('beta lab: cleared'); }
    btSetTest(false); HS.sub = 'refresh'; hsShow(); showTab('pipeline'); await W(300); feSetView('fl'); await W(200);
  } R.notes.push('viewer: ' + (AJ ? 'Ajay' : 'someone else') + (window.EP_ACCESS ? ', page access check present' : ''));
  async function tourWalk(label) {
    for (let k = 0; k < 12; k++) {
      const card = $('#ob-card'), spot = $('#ob-spot'); if (!card) break;
      // measure against the target itself: the spotlight's CSS transition does not advance under headless virtual time
      const tg = OB.tour && document.querySelector(OB.tour.steps[OB.tour.i][0]), c = card.getBoundingClientRect(), sp = tg ? tg.getBoundingClientRect() : spot ? spot.getBoundingClientRect() : null;
      if (c.left < 0 || c.top < 0 || c.right > innerWidth || c.bottom > innerHeight) issue({step: label + ' ' + (k + 1), kind: 'tour-card-off-screen'});
      if (!sp || !sp.width || !sp.height) issue({step: label + ' ' + (k + 1), kind: 'tour-target-missing'});
      else if (c.left < sp.right - 2 && sp.left < c.right - 2 && c.top < sp.bottom - 2 && sp.top < c.bottom - 2 && sp.height < innerHeight * 0.6) issue({step: label + ' ' + (k + 1), kind: 'tour-card-covers-target', text: card.querySelector('h4').textContent});
      check(label + ' step ' + (k + 1));
      const before = sig(); card.querySelector('[data-obtnext]').click(); await W(450); // the spotlight moves for 0.25 s if (sig() === before) R.clicks.none.push(label + ' next ' + k); else R.clicks.ok++;
    }
  }
  await W(1500); const g = $('#gate-go'); if (g) { g.click(); await W(400); }
  // ONBOARDING: first visit
  await W(700);
  if (!vis($('#ob-welcome'))) R.issues.push({step: 'welcome', kind: 'welcome-missing'});
  if (!vis($('#ob-pill'))) R.issues.push({step: 'welcome', kind: 'guide-pill-missing'});
  check('welcome card');
  await clicks('#ob-welcome [data-obrole="pe"]', 1, 'welcome: role', {keep: true});
  await clicks('#ob-welcome [data-obgo]', 1, 'welcome: take the tour', {keep: true, wait: 600});
  await tourWalk('overview tour');
  if ($('#ob-card') || $('#ob-spot')) R.issues.push({step: 'tour', kind: 'tour-left-behind'});
  if (!vis($('#ob-greet'))) R.issues.push({step: 'greeting', kind: 'greeting-missing'});
  // OVERVIEW
  await tab('overview'); check('overview');
  await clicks('#ov-win button', 3, 'overview window', {keep: true});
  await clicks('.cal-w:not(:disabled)', 4, 'next 8 weeks');
  await clicks('.tp-row', 4, 'team pressure');
  await clicks('.ag-row .linkbtn', 3, 'oldest bugs → client');
  await clicks('.rc-row', 3, 'recent shows');
  await clicks('#ov-radar .rd', 3, 'event radar');
  await clicks('#risk [data-rk], #risk .rk-cell, #risk td button, #risk button', 4, 'risk matrix', {optional: true});
  await clicks('.ov-stat', 4, 'overview tiles', {after: () => tab('overview')});
  await tab('overview'); await clicks('.kpi', 7, 'headline numbers', {after: () => tab('overview')});
  // CLIENTS
  await tab('ledger'); check('clients');
  await clicks('#t-ledger thead tr:not(.grp-h) th', 14, 'clients sort', {keep: true});
  await clicks('#f-bal button, #f-scope button', 4, 'clients filters', {keep: true});
  await clicks('#tb-ledger tr.row', 3, 'clients row', {keep: true, fresh: true});
  await clicks('.c360-open', 1, 'client 360 button');
  // TIMELINE: the tab was removed on 6 Oct 2026 (its checks are in deprecated/timeline/qa_probe.js); an old #timeline link opens the Overview
  if ($('.tab[data-tab="timeline"]') || $('#panel-timeline')) R.issues.push({step: 'timeline removed', kind: 'still-on-page'});
  if (window.CL && window.CL.showTab) { window.CL.showTab('timeline'); await W(300); if (!vis($('#panel-overview'))) R.issues.push({step: 'timeline link', kind: 'no-overview-fallback'}); check('timeline link falls back to overview'); }
  // FEEDBACK: the reply notice, sending Happy / Sad / Want, privacy for everyone else, and Ajay's inbox and roadmap
  { const AJ = window.__QA_AS !== 'other', PRIV = 'QA-PRIVATE';
    await closeAll(); await tab('overview'); await W(300);
    if (!vis($('#fb-open'))) R.issues.push({step: 'feedback', kind: 'feedback-button-missing'});
    if (vis($('#fb-nudge'))) { check('feedback reply notice'); await clicks('#fb-nudge [data-fbread]', 1, 'feedback: read the reply', {keep: true}); if (!vis($('#ob-guide .fb-reply'))) R.issues.push({step: 'feedback', kind: 'reply-not-shown'}); await closeAll(); }
    else R.issues.push({step: 'feedback', kind: 'reply-notice-missing'});
    if (!AJ && vis($('#fb-badge'))) R.issues.push({step: 'feedback', kind: 'unread-badge-not-cleared'});
    await clicks('#ob-pill', 1, 'guide: open (feedback)', {keep: true});
    await clicks('#ob-guide [data-obpane="tours"][aria-selected="false"]', 1, 'guide: tours', {keep: true, optional: true});
    await clicks('#ob-guide [data-obpane="fb"]', 1, 'guide: feedback', {keep: true});
    await clicks('#ob-guide [data-fbmood]', 3, 'feedback: mood', {keep: true, fresh: true});
    await clicks('#ob-guide [data-fbw]', 1, 'feedback: weight', {keep: true});
    setVal('#fb-text', 'The Guide is really handy on calls'); await W(100);
    await clicks('#ob-guide [data-fbsend]', 1, 'feedback: send', {keep: true, wait: 500});
    if (!vis($('#ob-guide .fb-thanks'))) R.issues.push({step: 'feedback', kind: 'not-sent', text: (($('#ob-guide .ob-err') || {}).textContent || '')});
    if ($$('#ob-guide .fb-item').length < 2) R.issues.push({step: 'feedback', kind: 'own-list-missing', text: String($$('#ob-guide .fb-item').length)});
    const saved = Object.keys(window.__QA_STORE || {}).filter(k => /^feedback\/u_test0+\/items\//.test(k) && k !== 'feedback/u_test0000000000000000000/items/fqa0');
    if (saved.length !== 1) R.issues.push({step: 'feedback', kind: 'not-stored', text: String(saved.length)});
    await clicks('#ob-guide [data-fbmore]', 1, 'feedback: send more', {keep: true});
    if (AJ !== !!$('#ob-guide [data-fbinbox]')) R.issues.push({step: 'feedback', kind: AJ ? 'inbox-link-missing' : 'inbox-link-shown-to-others'});
    await closeAll();
    if (!AJ) {
      $('#fb-open').click(); await W(300);
      if ($('#fb-in')) R.issues.push({step: 'feedback', kind: 'inbox-opened-for-others'});
      if (!vis($('#ob-guide [data-fbmood]'))) R.issues.push({step: 'feedback', kind: 'header-button-no-form'});
      { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, hit = null;
        while ((n = tw.nextNode())) if (n.nodeValue.includes(PRIV) && !n.parentElement.closest('script,style')) { hit = n.parentElement; break; }
        if (hit) R.issues.push({step: 'feedback', kind: 'others-feedback-visible', el: desc(hit)}); }
      if (JSON.stringify(FB.inbox.items).includes(PRIV) || JSON.stringify(FB.mine).includes(PRIV)) R.issues.push({step: 'feedback', kind: 'others-feedback-loaded'});
      check('feedback as someone else'); await closeAll();
      R.notes.push('feedback: sent, own list, reply notice; nobody else\'s feedback visible');
    } else {
      if (!vis($('#fb-badge'))) R.issues.push({step: 'feedback', kind: 'inbox-badge-missing'});
      await clicks('#fb-open', 1, 'feedback inbox', {keep: true, wait: 400});
      if (!vis($('#fb-in .fb-box'))) R.issues.push({step: 'feedback', kind: 'inbox-missing'});
      if (!($('#fb-in') || {}).textContent || !$('#fb-in').textContent.includes(PRIV)) R.issues.push({step: 'feedback', kind: 'colleague-feedback-missing'});
      await clicks('#fb-in [data-fbfm]', 4, 'inbox: mood filter', {keep: true, fresh: true});
      await clicks('#fb-in [data-fbfm=""]', 1, 'inbox: all moods', {keep: true, optional: true});
      setVal('#fb-fs', 'all'); await W(200); check('inbox: all statuses');
      setVal('#fb-fq', 'zoom'); await W(200); check('inbox: search'); if ($$('#fb-in .fb-row').length !== 1) R.issues.push({step: 'feedback', kind: 'search', text: String($$('#fb-in .fb-row').length)});
      setVal('#fb-fq', ''); await W(200);
      const row = $$('#fb-in [data-fbrow]').find(b => b.textContent.includes(PRIV)); if (row) { row.click(); await W(250); R.clicks.ok++; } check('inbox: open a note');
      await clicks('#fb-in [data-fbst="planned"]', 1, 'inbox: status planned', {keep: true, wait: 400});
      if (!String(($('#fb-rt') || {}).value || '').includes('planned')) R.issues.push({step: 'feedback', kind: 'reply-not-drafted'});
      setVal('#fb-th', 'Timeline zoom'); await clicks('#fb-in [data-fbthsave]', 1, 'inbox: save theme', {keep: true, wait: 400});
      await clicks('#fb-in [data-fbreply]', 1, 'inbox: send reply', {keep: true, wait: 400});
      const rep = (window.__QA_STORE || {})['feedback/u_chris00000000000000000000/replies/fqa1'] || {};
      if (rep.status !== 'planned' || rep.theme !== 'Timeline zoom' || !(rep.msgs || []).length) R.issues.push({step: 'feedback', kind: 'reply-not-stored', text: JSON.stringify(rep).slice(0, 120)});
      if (!vis($('#fb-in .fb-thread'))) R.issues.push({step: 'feedback', kind: 'thread-missing'});
      await clicks('#fb-in [data-fbview="road"]', 1, 'inbox: roadmap', {keep: true});
      if ($$('#fb-in .fb-card').length < 2) R.issues.push({step: 'feedback', kind: 'roadmap-cards', text: String($$('#fb-in .fb-card').length)});
      await clicks('#fb-in .fb-card[data-fbth]', 1, 'roadmap: theme card', {keep: true});
      await clicks('#fb-in [data-fbth=""]', 1, 'inbox: clear theme', {keep: true, optional: true});
      await clicks('#fb-in [data-fbview="road"]', 1, 'inbox: roadmap again', {keep: true});
      await clicks('#fb-in .fb-card[data-fbgo]', 1, 'roadmap: single note', {keep: true, optional: true});
      await clicks('#fb-in [data-fbinx].x', 1, 'inbox: close', {keep: true});
      await clicks('#ob-pill', 1, 'guide: open (you)', {keep: true}); await clicks('#ob-guide [data-obpane="me"]', 1, 'guide: you', {keep: true});
      await clicks('#ob-guide [data-fbinbox]', 1, 'guide: feedback inbox', {keep: true, wait: 300}); if (!vis($('#fb-in .fb-box'))) R.issues.push({step: 'feedback', kind: 'inbox-from-profile'});
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await W(150); if ($('#fb-in')) R.issues.push({step: 'feedback', kind: 'escape-does-not-close'});
      await closeAll();
      R.notes.push('feedback: sent, own list, reply notice; inbox, filters, status, theme, reply, roadmap');
    }
  }
  // ONBOARDING: a tab nudge, the Guide and My clients
  await tab('bugs'); await W(450);
  if (!vis($('#ob-nudge'))) { R.issues.push({step: 'nudge', kind: 'nudge-missing'}); try { R.notes.push('onboarding state: ' + JSON.stringify({ready: OB.ready, skipped: OB.prefs.skipped, welcomed: OB.prefs.welcomed, tours: OB.prefs.tours, nudged: OB.prefs.nudged, tour: !!OB.tour, steps: obSteps('bugs').length, cur: obCurTab()})); } catch (e) { R.notes.push('state: ' + e.message); } }
  await clicks('#ob-nudge [data-obtour]', 1, 'nudge: tour', {keep: true, wait: 600}); await tourWalk('bugs tour');
  await clicks('#ob-pill', 1, 'guide: open', {keep: true});
  for (const pn of ['terms', 'ask', 'me', 'tours']) {
    await clicks('#ob-guide [data-obpane="' + pn + '"]', 1, 'guide: ' + pn, {keep: true});
    if (pn === 'terms') { setVal('#ob-gq', 'tier'); await W(200); check('guide glossary search'); }
    if (pn === 'ask') { setVal('#ob-aq', 'How do I log a work item?'); await clicks('#ob-guide [data-obask]', 1, 'guide: ask', {keep: true, wait: 800}); if (!vis($('#ob-ans'))) R.issues.push({step: 'guide', kind: 'ask-no-answer'}); }
    if (pn === 'me') { await clicks('#ob-guide [data-obmy]', 3, 'guide: my client', {keep: true, fresh: true}); }
  }
  await clicks('#ob-guide [data-obclose]', 1, 'guide: close', {keep: true});
  await tab('overview'); await W(300);
  const cnt0 = $('#c-count') ? $('#c-count').textContent : '';
  await clicks('#ob-greet [data-obscope="my"]', 1, 'my clients on', {keep: true, wait: 400});
  await tab('ledger'); await W(300); if ($('#c-count') && $('#c-count').textContent === cnt0) R.issues.push({step: 'my clients', kind: 'filter-not-applied', text: cnt0}); check('clients, my clients');
  await tab('overview'); await W(300); await clicks('#ob-greet [data-obscope="all"]', 1, 'my clients off', {keep: true, wait: 400});
  // REQUESTS
  await tab('pipeline'); check('requests feature ledger');
  await clicks('[data-feflow]', 1, 'whole flow');
  await clicks('#fl-host [data-feopen]', 2, 'work item');
  // the sample walkthrough: every moment, the rail, the steps on the flow, the arrow keys, the entry points in the pop-ups
  await clicks('#fl-host [data-fewalk]', 1, 'sample walkthrough', {keep: true});
  $('#fe-wk .fe-wk-m') && $('#fe-wk .fe-wk-m').click(); await W(150);
  for (let k = 0; k < 20; k++) { const b = $('#fe-wk [data-fewk="1"]'); if (!b || b.disabled) break; const before = sig(); b.click(); await W(150); if (sig() === before) R.clicks.none.push('walkthrough next ' + k); else R.clicks.ok++; check('walkthrough moment ' + (k + 2)); }
  if (/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(($('#fe-wk') || {}).textContent || '')) R.issues.push({step: 'walkthrough', kind: 'date-shown'});
  await clicks('#fe-wk .fe-wk-m', 15, 'walkthrough rail', {keep: true, fresh: true, wait: 150});
  await clicks('#fe-wk [data-fewstep]', 11, 'walkthrough flow step', {keep: true, fresh: true, wait: 150});
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) { const before = sig(); document.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true})); await W(150); if (sig() === before) R.clicks.none.push('walkthrough key ' + key); else R.clicks.ok++; check('walkthrough key ' + key); }
  await clicks('#modal-foot [data-fewkto="0"]', 1, 'walkthrough start again', {keep: true});
  await clicks('#modal-foot [data-fewkcopy]', 1, 'walkthrough copy', {keep: true, wait: 2400});
  await closeAll();
  await clicks('[data-feflow]', 1, 'whole flow (for its walkthrough button)', {keep: true});
  await clicks('#modal-foot [data-fewalk]', 1, 'walkthrough from the whole flow', {keep: true}); await closeAll();
  await clicks('#fl-host [data-feopen]', 1, 'work item (for its walkthrough button)', {keep: true});
  await clicks('#modal-foot [data-fewalk]', 1, 'walkthrough from a work item', {keep: true});
  await clicks('#modal-foot [data-feflow2]', 1, 'whole flow from the walkthrough', {keep: true}); await closeAll();
  // logging a new work item: Settings viewers get Beta (Claude), everyone else the placeholder card
  await clicks('#fl-new', 1, 'log a new work item', {keep: true, wait: 700});
  if (EP_ACCESS.how) {
    if (!vis($('#bt-m'))) R.issues.push({step: 'beta', kind: 'beta-did-not-open'});
    if (vis($('#modal .fe-skill'))) R.issues.push({step: 'beta', kind: 'placeholder-shown-to-settings-viewer'});
    try { await betaProbe(); } catch (err) { R.errors.push({step: 'beta', msg: String(err && err.message || err)}); }
    await clicks('#fl-new', 1, 'log again (classic form)', {keep: true, wait: 600});
    if ($('#bt-m [data-btold]')) { $('#bt-m [data-btold]').click(); await W(900); R.clicks.ok++; } else { R.issues.push({step: 'beta', kind: 'classic-form-link-missing'}); await closeAll(); }
  } else {
    if (!vis($('#modal .fe-skill'))) R.issues.push({step: 'log', kind: 'skill-placeholder-missing'});
    if ($('#modal [data-feold]')) R.issues.push({step: 'log', kind: 'old-form-link-shown-to-others'});
    if ($('#bt-m')) R.issues.push({step: 'log', kind: 'beta-shown-to-others'});
    await closeAll();
  }
  if ($('.fe-m')) { setVal('#fe-title', 'Alphabetical sort on exhibitor marketplace listings'); setVal('#fe-problem', 'Visitors cannot sort the exhibitor marketplace listing alphabetically so they scroll the whole list before the show.'); await W(300);
    setVal('#fe-dq', 'sort exhibitors alphabetically on the marketplace'); await W(500); check('form search');
    await clicks('.fe-m input[data-f="lever"]', 4, 'form lever', {keep: true});
    await clicks('.fe-m [data-dmmore]', 1, 'form show all', {keep: true, optional: true});
    await closeAll(); }
  // log with only the five fields, hand one "before signing" field to a colleague, then fill it in from the item
  await clicks('#fl-new', 1, 'log again (hand-off)', {keep: true, wait: 500}); if ($('#bt-m [data-btold]')) { $('#bt-m [data-btold]').click(); await W(900); } else await closeAll();
  if ($('.fe-m')) {
    $('.fe-m [data-fediscard]') && $('.fe-m [data-fediscard]').click(); await W(300);
    setVal('#fe-title', 'Offline badge scanning for lead retrieval'); setVal('#fe-problem', 'Exhibitors lose badge scans on show floors with no signal, so leads are missing after the event and they cannot follow up.');
    setVal('#fe-productArea', 'Not sure'); setVal('#fe-client', 'Platform'); await W(300);
    const later = $$('.fe-m .fe-fld.later').filter(vis).length; if (!later) R.issues.push({step: 'form', kind: 'no-before-signing-fields'});
    if ($$('.fe-m .fe-fld:not(.later) label .req').length !== 5) R.issues.push({step: 'form', kind: 'log-required-count', text: String($$('.fe-m .fe-fld:not(.later) label .req').length)});
    await clicks('.fe-m [data-fld="existingGrowing"] [data-fehand]', 1, 'hand off: open picker', {keep: true, wait: 500});
    await clicks('.fe-m #fe-handhits [data-fehandto]', 1, 'hand off: choose colleague', {keep: true, wait: 400});
    if (!vis($('.fe-m [data-fld="existingGrowing"] .fe-hand.on'))) R.issues.push({step: 'form', kind: 'handoff-not-shown'});
    check('form with a hand-off');
    await clicks('.fe-m #fe-log', 1, 'log with details owed', {keep: true, wait: 1500});
    if ($('.ui-dlg [data-uiyes]')) { $('.ui-dlg [data-uiyes]').click(); await W(1500); check('logged anyway after the duplicate check'); }
    if ($('.fe-m')) { R.issues.push({step: 'form', kind: 'did-not-log', text: (($('.ui-dlg') || ($('#ui-toast') && !$('#ui-toast').hidden && $('#ui-toast')) || $('#fe-msg') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 160)}); await closeAll(); }
    else {
      if (!vis($('#modal .fe-owedbox'))) R.issues.push({step: 'entry', kind: 'owed-box-missing'});
      check('entry with details owed');
      await clicks('#modal [data-fefill]', 1, 'fill in the details', {keep: true, wait: 700});
      if ($('.fe-m.fe-edit')) { await clicks('.fe-m [data-f="existingGrowing.yes"][value="no"]', 1, 'fill: not growing', {keep: true}); await clicks('.fe-m #fe-log', 1, 'save details', {keep: true, wait: 1200}); check('after saving details'); }
      else R.issues.push({step: 'entry', kind: 'fill-form-did-not-open'});
      await closeAll();
    }
  }
  if (!AJ) try {
    await clicks('#rq-switch [data-v="fl"]', 1, 'feature ledger (days check)', {keep: true, optional: true});
    if ($$('#fl-host .fe-stage .small').some(e => /\bdays?\b/.test(e.textContent))) R.issues.push({step: 'feature ledger', kind: 'day-count-shown-to-others'});
    // someone other than Ajay: the Must-have ledger is open (since 30 Sep 2026), the Settings tabs are not
    await clicks('#rq-switch [data-v="pp"]', 1, 'must-have ledger (others)', {keep: true, wait: 500}); check('must-have for others');
    if ($('#pp-host .ep-lock')) R.issues.push({step: 'must-have', kind: 'still-locked'});
    if (!vis($('#pp-host .pp-board'))) R.issues.push({step: 'must-have', kind: 'board-not-shown-to-others'});
    await clicks('#pp-host .pp-bc', 2, 'must-have card (others)', {fresh: true});
    await clicks('#rq-switch [data-v="fl"]', 1, 'feature ledger (others)', {keep: true});
    // since 6 Oct 2026 Method & sources is read-only for everyone; Rules and Sync & logs stay private
    if (vis($('.tab[data-tab="logic"]')) || vis($('.tab[data-tab="refresh"]'))) R.issues.push({step: 'tabs', kind: 'how-it-works-visible-to-others'});
    if (!vis($('#tg-how')) || !vis($('.tab[data-tab="method"]'))) R.issues.push({step: 'tabs', kind: 'method-hidden-from-others'});
    showTab('method'); await W(250); if (!vis($('#panel-method')) || !vis($('#def-signal'))) R.issues.push({step: 'tabs', kind: 'method-not-open-to-others'}); else check('method for others');
    if ($('#panel-method #hs-host, #panel-method #rf-host, #panel-method #fb-in, #panel-method .lg')) R.issues.push({step: 'tabs', kind: 'private-content-in-method'});
    showTab('refresh'); await W(200); if (vis($('#panel-refresh'))) R.issues.push({step: 'tabs', kind: 'data-refresh-open-to-others'});
    // a How it works viewer (EP_HOW_IDS): the three tabs open, the Must-have ledger stays locked, the feedback inbox stays Ajay's
    if (!EP_HOW_IDS.includes('u_0KCjQDtQxEOgVhmNzuV5SQ')) R.issues.push({step: 'how access', kind: 'bartosz-not-listed'});
    EP_ACCESS.how = true; applyAccess(); await W(150);
    if (!vis($('.tab[data-tab="logic"]')) || !vis($('.tab[data-tab="refresh"]'))) R.issues.push({step: 'how access', kind: 'how-tabs-hidden'});
    for (const t of ['logic', 'method', 'refresh']) { showTab(t); await W(250); if (!vis($('#panel-' + t))) R.issues.push({step: 'how access', kind: 'tab-not-open', text: t}); else check('how access: ' + t); }
    if (!vis($('#rf-host .rf-tab'))) R.issues.push({step: 'how access', kind: 'data-refresh-empty'});
    await clicks('#sl-sub [data-slsub="history"]', 1, 'how access: history', {keep: true, wait: 500}); if (!$$('#hs-host .hs-row').length) R.issues.push({step: 'how access', kind: 'history-empty'});
    await clicks('#sl-sub [data-slsub="refresh"]', 1, 'how access: data refresh', {keep: true});
    // a Settings viewer logs with Beta
    showTab('pipeline'); await W(200); feSetView('fl'); await W(200); $('#fl-new').click(); await W(600); if (!vis($('#bt-m'))) R.issues.push({step: 'how access', kind: 'beta-not-open-for-settings-viewer'}); await closeAll();
    showTab('refresh'); await W(200); $('#sl-sub [data-slsub="beta"]').click(); await W(300); if (!vis($('#bt-lab .bt-lab'))) R.issues.push({step: 'how access', kind: 'beta-lab-missing'}); else check('how access: beta lab');
    $('#sl-sub [data-slsub="refresh"]').click(); await W(200);
    if (vis($('#fb-in'))) R.issues.push({step: 'how access', kind: 'feedback-inbox-opened'});
    EP_ACCESS.how = false; applyAccess(); showTab('overview'); await W(200);
    if (vis($('.tab[data-tab="logic"]')) || vis($('.tab[data-tab="refresh"]'))) R.issues.push({step: 'how access', kind: 'how-tabs-not-hidden-again'});
    location.hash = 'rules'; showTab('logic'); await W(300); if (vis($('#panel-logic'))) R.issues.push({step: 'tabs', kind: 'rules-open-to-others'}); check('rules refused');

  } catch (err) { R.errors.push({step: 'locked view', msg: String(err && err.message || err)}); }
  try { await tab('pipeline'); await clicks('#rq-switch [data-v="pp"]', 1, 'must-have ledger', {keep: true}); check('requests must-have board');
  // the Board (default): cards open the item, every grouping, the attention line filters and clears
  if (!vis($('#pp-host .pp-board'))) R.issues.push({step: 'must-have', kind: 'board-not-default'});
  if ($$('#pp-host .pp-bc').length < 20) R.issues.push({step: 'must-have', kind: 'board-cards', text: String($$('#pp-host .pp-bc').length)});
  $$('#pp-host .pp-bc').forEach(c => { if (c.scrollWidth > c.clientWidth + 2) issue({step: 'board', kind: 'card-overflow', el: desc(c)}); });
  await clicks('#pp-host .pp-bc', 3, 'board card', {fresh: true});
  for (const g of ['driver', 'team', 'status', 'month']) { await clicks('#pp-bgroup [data-v="' + g + '"]', 1, 'board by ' + g, {keep: true}); $$('#pp-host .pp-bc').forEach(c => { if (c.scrollWidth > c.clientWidth + 2) issue({step: 'board ' + g, kind: 'card-overflow', el: desc(c)}); }); }
  const nAll = $$('#pp-host .pp-bc').length;
  await clicks('#pp-host .pp-att-c', 1, 'attention: filter', {keep: true});
  if ($$('#pp-host .pp-bc').length >= nAll) R.issues.push({step: 'must-have', kind: 'attention-did-not-filter'});
  await clicks('#pp-host .pp-att-x', 1, 'attention: show everything', {keep: true});
  if ($$('#pp-host .pp-bc').length !== nAll) R.issues.push({step: 'must-have', kind: 'attention-did-not-clear'});
  const more = $('#pp-host .pp-more'); if (more) { more.open = true; await W(150); check('board effort charts'); }
  await clicks('#pp-view [data-v="grid"]', 1, 'requests grid view', {keep: true}); check('requests must-have grid');
  for (let z = 1; z <= 5; z++) { for (let k = 0; k < 5; k++) { const b = $('[data-ppz="-1"]'); if (b && !b.disabled) { b.click(); await W(60); } } for (let k = 1; k < z; k++) { $('[data-ppz="1"]').click(); await W(60); } await W(200); check('requests grid zoom ' + z); }
  await clicks('.pp-tl [data-ppedit]', 3, 'requests grid item', {fresh: true});
  await clicks('#pp-view [data-v="table"]', 1, 'requests table', {keep: true}); check('requests table');
  await clicks('#pp-view [data-v="board"]', 1, 'requests board', {keep: true});
  await clicks('#pp-hist', 1, 'requests change log'); } catch (err) { R.errors.push({step: 'must-have ledger', msg: String(err && err.message || err)}); await closeAll(); }
  await clicks('#rq-switch [data-v="fl"]', 1, 'feature ledger', {keep: true});
  // SYNC & LOGS: the renamed tab, its two sub-tabs, and History (Ajay only)
  if (AJ) { await tab('refresh'); await W(300);
    if (!/Sync/.test(($('.tab[data-tab="refresh"]') || {}).textContent || '')) R.issues.push({step: 'sync & logs', kind: 'tab-not-renamed'});
    if (!vis($('#rf-host .rf-tab'))) R.issues.push({step: 'sync & logs', kind: 'data-refresh-missing'});
    await clicks('#sl-sub [data-slsub="history"]', 1, 'sync & logs: history', {keep: true, wait: 700}); check('history');
    const nH = $$('#hs-host .hs-row').length; if (nH < 5) R.issues.push({step: 'history', kind: 'history-rows', text: String(nH)});
    const txt = ($('#hs-host') || {}).textContent || '';
    if (!/signed in/.test(txt)) R.issues.push({step: 'history', kind: 'activity-missing'});
    await clicks('#hs-host [data-hsspan]', 4, 'history: period', {keep: true, fresh: true});
    await clicks('#hs-host [data-hssrc]', 6, 'history: source', {keep: true, fresh: true, after: async () => { const b = $('#hs-host [data-hssrc][aria-pressed="true"]'); if (b) { b.click(); await W(150); } }});
    setVal('#hs-q', 'must'); await W(400); check('history search'); setVal('#hs-q', ''); await W(400);
    await clicks('#hs-host [data-hsopen^="pp:"]', 1, 'history: open a must-have item', {optional: true});
    await clicks('#sl-sub [data-slsub="beta"]', 1, 'sync & logs: beta lab', {keep: true, wait: 400}); check('beta lab');
    if (!vis($('#bt-lab .bt-lab'))) R.issues.push({step: 'beta lab', kind: 'lab-missing'});
    await clicks('#bt-lab [data-btlab="check"]', 1, 'beta lab: check Claude', {keep: true, wait: 600});
    if (!/Claude works here/.test(($('#bt-lab') || {}).textContent || '')) R.issues.push({step: 'beta lab', kind: 'ai-check-failed'});
    await clicks('#bt-lab [data-btscen="new"]', 1, 'beta lab: run a case', {keep: true, wait: 1200}); if (!vis($('#bt-m'))) R.issues.push({step: 'beta lab', kind: 'case-did-not-open'}); check('beta case'); await closeAll();
    await clicks('#bt-lab details.bt-ailog summary', 1, 'beta lab: AI log', {keep: true, optional: true});
    await clicks('#sl-sub [data-slsub="refresh"]', 1, 'sync & logs: data refresh', {keep: true});
    if (!vis($('#rf-host .rf-tab'))) R.issues.push({step: 'sync & logs', kind: 'data-refresh-not-back'}); }
  else { if (vis($('.tab[data-tab="refresh"]'))) R.issues.push({step: 'sync & logs', kind: 'visible-to-others'});
    try { hsShow(); } catch (e) {} if ($$('#hs-host .hs-row').length) R.issues.push({step: 'history', kind: 'history-shown-to-others'});
    if (JSON.stringify(HS.act).includes('u_chris')) R.issues.push({step: 'history', kind: 'others-activity-loaded'}); }
  // DEMAND
  await tab('demand'); await W(2500); check('demand');
  for (let z = 1; z <= 5; z++) { for (let k = 0; k < 5; k++) { const b = $('[data-dmz="-1"]'); if (b && !b.disabled) { b.click(); await W(120); } } for (let k = 1; k < z; k++) { $('[data-dmz="1"]').click(); await W(120); } check('demand zoom ' + z); }
  await clicks('.dm-hc:not(:disabled)', 3, 'demand heat cell', {keep: true, fresh: true, after: async () => { $('#dm-clear') && $('#dm-clear').click(); await W(200); $('#dm-view [data-v="rank"]').click(); await W(200); }});
  // the signal: the explanation adds up, and a need's pop-up shows its own sum
  { const d = $('.dm-sighow'); if (!d) R.issues.push({step: 'demand', kind: 'signal-explainer-missing'}); else { d.querySelector('summary').click(); await W(150); check('demand signal explained');
      const ex = $('.dm-sigex .dm-eq'), top = $('.dm-rr .dm-sig'); if (ex && top && ex.textContent.replace(/\D/g, '') !== top.textContent.replace(/\D/g, '')) R.issues.push({step: 'demand', kind: 'signal-example-mismatch', text: ex.textContent + ' vs ' + top.textContent});
      d.querySelector('summary').click(); await W(100); } }
  // the definition lives once in Method & sources (6 Oct 2026): the weights there come from DM_TW, and Demand's links land on it
  { const w = $('#def-signal-w'), want = [1, 2, 3, 4].map(t => 'T' + t + ' ' + DM_TW[t]).join(' · ');
    if (!w || !w.textContent.startsWith(want)) R.issues.push({step: 'definitions', kind: 'weights-differ-from-code', text: w ? w.textContent : 'missing'});
    if (/T1 8 · T2 4/.test($('#panel-demand').textContent)) R.issues.push({step: 'definitions', kind: 'weights-restated-on-demand'});
    const d = $('.dm-sighow'); if (d) { d.querySelector('summary').click(); await W(150); const l = d.querySelector('[data-def="signal"]');
      if (!l) R.issues.push({step: 'definitions', kind: 'demand-link-missing'}); else { l.click(); await W(400); const e = $('#def-signal'), r = e && e.getBoundingClientRect();
        const bar = $('.tabs').getBoundingClientRect().bottom; if (!vis($('#panel-method')) || !r || r.top < bar - 2 || r.top > innerHeight * 0.6) R.issues.push({step: 'definitions', kind: 'link-not-landing', el: 'panel ' + vis($('#panel-method')) + ' top ' + (r ? Math.round(r.top) : 'none') + ' bar ' + Math.round(bar) + ' h ' + innerHeight + ' y ' + Math.round(scrollY)}); else check('definitions from demand'); }
      await tab('demand'); await W(400); const d2 = $('.dm-sighow'); if (d2 && d2.open) { d2.querySelector('summary').click(); await W(100); } } }
  await clicks('.dm-rr', 3, 'demand ranked need', {after: async () => {}});
  { const r = $('.dm-rr'); if (r) { r.click(); await W(300); if (!vis($('#modal .dm-sigsum'))) R.issues.push({step: 'demand', kind: 'need-signal-breakdown-missing'});
      const l = $('#modal .dm-signote [data-def="signal"]'); if (!l) R.issues.push({step: 'definitions', kind: 'need-link-missing'}); else { l.click(); await W(700);
        if ($('#modal[open]') || !vis($('#def-signal'))) R.issues.push({step: 'definitions', kind: 'need-link-not-landing'}); else check('definitions from a need'); }
      await closeAll(); await tab('demand'); await W(400); } }
  $('#dm-view [data-v="needs"]').click(); await W(300); check('demand needs');
  await clicks('[data-dmsort]', 5, 'demand needs sort', {keep: true, fresh: true});
  await clicks('table.dm-tab tr.r', 3, 'demand needs row', {fresh: true});
  await clicks('[data-dmpage="1"]', 1, 'demand needs next page', {keep: true, optional: true});
  $('#dm-view [data-v="requests"]').click(); await W(300); check('demand requests');
  await clicks('.dm-qchart .qb', 3, 'demand quarter bar', {keep: true, fresh: true, after: async () => { $('#dm-clear') && $('#dm-clear').click(); await W(250); }});
  await clicks('.dm-bar', 4, 'demand bar', {keep: true, fresh: true, after: async () => { $('#dm-clear') && $('#dm-clear').click(); await W(250); }});
  await clicks('table.dm-tab tr.r', 3, 'demand request row', {fresh: true});
  await clicks('#dm-src button', 4, 'demand source', {keep: true, fresh: true});
  setVal('#dm-q', 'badge scanning offline lead retrieval'); await W(500); check('demand search');
  await clicks('#dm-host [data-dmneed]', 2, 'demand search result', {fresh: true});
  await clicks('#dm-host [data-dmmore]', 1, 'demand show all', {keep: true, optional: true});
  // DELIVERY
  await tab('delivery'); check('delivery timeline');
  for (let z = 1; z <= 5; z++) { for (let k = 0; k < 5; k++) { const b = $('#d-zoom [data-z="-1"]'); if (b && !b.disabled) b.click(); } for (let k = 1; k < z; k++) $('#d-zoom [data-z="1"]').click(); await W(250); check('delivery zoom ' + z); }
  await clicks('#dtl .cell.has', 4, 'delivery cell');
  await clicks('#d-plat button', 2, 'delivery platform rows', {keep: true});
  await clicks('#d-view [data-v="list"]', 1, 'delivery list', {keep: true}); check('delivery list');
  await clicks('#chart-months .col', 3, 'delivery month', {keep: true, optional: true});
  await clicks('#d-view [data-v="ep"]', 1, 'delivery epics', {keep: true}); check('delivery epics');
  await clicks('#d-view [data-v="tl"]', 1, 'delivery back to timeline', {keep: true});
  // BUGS, INCIDENTS, RULES, METHOD
  await tab('bugs'); check('bugs'); await clicks('#t-bugs th', 8, 'bugs sort', {keep: true});
  await tab('incidents'); check('incidents');
  if (AJ) {
    await tab('refresh'); await W(600); check('data refresh');
    if (!vis($('#rf-host .rf-tab'))) R.issues.push({step: 'data refresh', kind: 'refresh-table-missing'});
    await clicks('#rf-host [data-rfpull="imp"]', 1, 'pull IMP delta', {keep: true, wait: 1500});
    await clicks('#rf-host [data-rfpull="planhat"]', 1, 'pull Planhat', {keep: true, wait: 1200});
    await clicks('#rf-host [data-rfpull="workbook"]', 1, 'pull Drive workbook', {keep: true, wait: 1200});
    if (window.__QA_AS !== 'nomcp') { const t = ($('#rf-host .rf-tab') || {}).textContent || ''; if (!/Active in Planhat, not yet on the ledger: Test New Client/.test(t)) R.issues.push({step: 'data refresh', kind: 'planhat-note-missing'}); if (!/Unchanged since/.test(t)) R.issues.push({step: 'data refresh', kind: 'workbook-note-missing'}); }
    await clicks('#rf-host [data-rfreq]', 1, 'ask Claude to pull', {keep: true, wait: 600});
    await clicks('#rf-host [data-rfall]', 1, 'pull all deltas', {keep: true, wait: 2500});
    const inc = (window.D || {}).incidents; check('data refresh after pulls');
    await tab('incidents'); await W(300); const row = $$('#tb-inc tr').find(e => /IMP-321/.test(e.textContent));
    if (!row) R.notes.push('IMP-321 not visible on the Incidents tab'); else { const tr = row.closest('tr,.bug,.evrow,div'); if (tr && window.__QA_AS !== 'nomcp' && !/Done/.test(tr.textContent)) R.issues.push({step: 'incidents', kind: 'delta-not-applied', text: tr.textContent.slice(0, 80)}); }
  }
  if (AJ) { await tab('logic'); check('rules'); await tab('method'); check('method'); if (!vis($('#tg-how'))) R.issues.push({step: 'tabs', kind: 'how-it-works-hidden-from-ajay'}); }
  // FIND A CLIENT
  await clicks('#find-open', 1, 'find a client', {keep: true}); setVal('#find-q', 'dlg'); await W(250); check('find'); await clicks('#find [data-find]', 1, 'find result');
  await closeAll();
  const p = document.createElement('pre'); p.id = '__qa'; p.textContent = JSON.stringify(R); document.body.prepend(p); document.title = 'QA DONE';
})();
