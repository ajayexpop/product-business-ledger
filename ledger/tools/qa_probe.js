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

  const AJ = window.__QA_AS !== 'other'; R.notes.push('viewer: ' + (AJ ? 'Ajay' : 'someone else') + (window.EP_ACCESS ? ', page access check present' : ''));
  async function tourWalk(label) {
    for (let k = 0; k < 12; k++) {
      const card = $('#ob-card'), spot = $('#ob-spot'); if (!card) break;
      const c = card.getBoundingClientRect(), sp = spot ? spot.getBoundingClientRect() : null;
      if (c.left < 0 || c.top < 0 || c.right > innerWidth || c.bottom > innerHeight) issue({step: label + ' ' + (k + 1), kind: 'tour-card-off-screen'});
      if (!sp || !sp.width || !sp.height) issue({step: label + ' ' + (k + 1), kind: 'tour-target-missing'});
      else if (c.left < sp.right - 2 && sp.left < c.right - 2 && c.top < sp.bottom - 2 && sp.top < c.bottom - 2 && sp.height < innerHeight * 0.6) issue({step: label + ' ' + (k + 1), kind: 'tour-card-covers-target', text: card.querySelector('h4').textContent});
      check(label + ' step ' + (k + 1));
      const before = sig(); card.querySelector('[data-obtnext]').click(); await W(260); if (sig() === before) R.clicks.none.push(label + ' next ' + k); else R.clicks.ok++;
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
  // TIMELINE
  await tab('timeline'); check('timeline');
  for (let z = 1; z <= 5; z++) { const b = $('#t-zoom [data-z="-1"]'); for (let k = 0; k < 5; k++) { if (b && !b.disabled) b.click(); } for (let k = 1; k < z; k++) $('#t-zoom [data-z="1"]').click(); await W(250); check('timeline zoom ' + z); }
  for (const r of ['now', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4', 'year']) { setVal('#t-range', r); await W(250); check('timeline range ' + r); }
  await clicks('#t-sort button', 3, 'timeline sort', {keep: true});
  await clicks('#t-types button', 3, 'timeline show', {keep: true}); $('#t-types [data-v="all"]').click(); await W(200);
  await clicks('#t-rows button', 2, 'timeline rows', {keep: true});
  await clicks('#tv-filters [data-tlshow]', 5, 'timeline mark filter', {keep: true});
  await clicks('#tv-filters [data-tlshow]', 5, 'timeline mark filter back on', {keep: true});
  await clicks('#tv-filters [data-tlrisk]', 4, 'timeline risk filter', {keep: true});
  await clicks('#tv-filters [data-tlreset]', 1, 'timeline reset', {keep: true});
  for (const k of ['ship', 'prog', 'Urgent', 'High', 'Medium', 'Low', 'inc']) await clicks('.mir-seg[data-k="' + k + '"]', 2, 'chart segment ' + k);
  await clicks('.mir-col', 4, 'chart month column');
  await clicks('.mir-shc', 2, 'chart shows count');
  if ($('#modal')) { $$('.mir-col').filter(vis)[1] && $$('.mir-col').filter(vis)[1].dispatchEvent(new MouseEvent('click', {bubbles: true})); await W(250); await clicks('#modal .mm-chip', 8, 'month pop-up chips', {keep: true}); await closeAll(); }
  await clicks('#tl .cell.has', 6, 'timeline cell');
  await clicks('#tl .tvn', 2, 'timeline client name');
  $('#t-sort [data-v="tier"]').click(); await W(250); await clicks('#tl [data-tlband]', 3, 'timeline tier band', {keep: true}); check('timeline tier bands'); $('#t-sort [data-v="show"]').click(); await W(250);
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
  const cnt0 = $('#t-count') ? $('#t-count').textContent : '';
  await clicks('#ob-greet [data-obscope="my"]', 1, 'my clients on', {keep: true, wait: 400});
  await tab('timeline'); await W(300); if ($('#t-count') && $('#t-count').textContent === cnt0) R.issues.push({step: 'my clients', kind: 'filter-not-applied', text: cnt0}); check('timeline, my clients');
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
  await clicks('#fl-new', 1, 'log a new work item', {keep: true, wait: 900});
  if ($('.fe-m')) { setVal('#fe-title', 'Alphabetical sort on exhibitor marketplace listings'); setVal('#fe-problem', 'Visitors cannot sort the exhibitor marketplace listing alphabetically so they scroll the whole list before the show.'); await W(300);
    setVal('#fe-dq', 'sort exhibitors alphabetically on the marketplace'); await W(500); check('form search');
    await clicks('.fe-m input[data-f="lever"]', 4, 'form lever', {keep: true});
    await clicks('.fe-m [data-dmmore]', 1, 'form show all', {keep: true, optional: true});
    await closeAll(); }
  // log with only the five fields, hand one "before signing" field to a colleague, then fill it in from the item
  await clicks('#fl-new', 1, 'log again (hand-off)', {keep: true, wait: 900});
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
    // someone other than Ajay: the Must-have ledger shows the countdown, the How it works tabs are gone, the editor links land on the lock
    await clicks('#rq-switch [data-v="pp"]', 1, 'must-have ledger (locked)', {keep: true}); check('must-have lock');
    if (!vis($('#pp-host .ep-lock'))) R.issues.push({step: 'must-have lock', kind: 'lock-missing'});
    if ($('#pp-host table.pp, #pp-host .pp-tl')) R.issues.push({step: 'must-have lock', kind: 'ledger-visible-to-others'});
    const s1 = $('#ep-cd [data-cd="s"]').textContent; await W(1300); if ($('#ep-cd [data-cd="s"]').textContent === s1) R.issues.push({step: 'countdown', kind: 'countdown-not-ticking'});
    const hh = +$('#ep-cd [data-cd="h"]').textContent; if (!(hh >= 0 && hh <= 60)) R.issues.push({step: 'countdown', kind: 'countdown-hours-out-of-range', text: String(hh)});
    await clicks('#pp-host [data-eplockgo="walk"]', 1, 'lock: walkthrough'); await clicks('#rq-switch [data-v="pp"]', 1, 'must-have ledger again', {keep: true});
    await clicks('#pp-host [data-eplockgo="fl"]', 1, 'lock: feature ledger', {keep: true});
    if (vis($('#tg-how')) || vis($('.tab[data-tab="logic"]')) || vis($('.tab[data-tab="method"]'))) R.issues.push({step: 'tabs', kind: 'how-it-works-visible-to-others'});
    showTab('refresh'); await W(200); if (vis($('#panel-refresh'))) R.issues.push({step: 'tabs', kind: 'data-refresh-open-to-others'});
    location.hash = 'rules'; showTab('logic'); await W(300); if (vis($('#panel-logic')) || vis($('#panel-method'))) R.issues.push({step: 'tabs', kind: 'rules-open-to-others'}); check('rules refused');

  } catch (err) { R.errors.push({step: 'locked view', msg: String(err && err.message || err)}); }
  if (AJ) { await clicks('#rq-switch [data-v="pp"]', 1, 'must-have ledger', {keep: true}); check('requests must-have grid');
  for (let z = 1; z <= 5; z++) { for (let k = 0; k < 5; k++) { const b = $('[data-ppz="-1"]'); if (b && !b.disabled) { b.click(); await W(60); } } for (let k = 1; k < z; k++) { $('[data-ppz="1"]').click(); await W(60); } await W(200); check('requests grid zoom ' + z); }
  await clicks('.pp-tl [data-ppedit]', 3, 'requests grid item', {fresh: true});
  await clicks('#pp-view [data-v="table"]', 1, 'requests table', {keep: true}); check('requests table');
  await clicks('#pp-view [data-v="grid"]', 1, 'requests grid', {keep: true});
  await clicks('#pp-hist', 1, 'requests change log'); }
  await clicks('#rq-switch [data-v="fl"]', 1, 'feature ledger', {keep: true});
  // DEMAND
  await tab('demand'); await W(2500); check('demand');
  for (let z = 1; z <= 5; z++) { for (let k = 0; k < 5; k++) { const b = $('[data-dmz="-1"]'); if (b && !b.disabled) { b.click(); await W(120); } } for (let k = 1; k < z; k++) { $('[data-dmz="1"]').click(); await W(120); } check('demand zoom ' + z); }
  await clicks('.dm-hc:not(:disabled)', 3, 'demand heat cell', {keep: true, fresh: true, after: async () => { $('#dm-clear') && $('#dm-clear').click(); await W(200); $('#dm-view [data-v="rank"]').click(); await W(200); }});
  await clicks('.dm-rr', 3, 'demand ranked need');
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
