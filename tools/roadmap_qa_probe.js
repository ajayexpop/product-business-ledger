// In-page QA probe for the Product Journey pages (tools/roadmap_qa.py injects it). In light and dark: checks text contrast
// (WCAG AA) on every visible text element, horizontal page overflow, escaped HTML or undefined values, clicks every
// filter chip and toggle, both views, opens every feature card, list row, pill, coming-next and client card and checks the
// sheet shows title, benefit, What, Why, Outcome and who, walks Previous / Next, and confirms removed items never appear.
(async () => {
  const R = {errors: [], steps: 0, issues: [], opened: 0, notes: []};
  let cur = 'load';
  addEventListener('error', e => R.errors.push({step: cur, msg: String(e.message) + ' @' + e.lineno}));
  addEventListener('unhandledrejection', e => R.errors.push({step: cur, msg: 'rejection ' + String(e.reason && (e.reason.message || e.reason.code) || e.reason)}));
  const W = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const desc = el => { const c = (el.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 2).join('.'); const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '') + (t ? ' «' + t + '»' : ''); };
  const seen = new Set();
  const issue = o => { const k = o.kind + '|' + (o.el || '') + '|' + (o.text || '') + '|' + (o.theme || ''); if (seen.has(k)) return; seen.add(k); R.issues.push(o); };
  const REMOVED = ['Meeting scheduling upgrades', 'Next-generation speed networking'];

  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const blend = (top, bot) => ({r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1});
  function bgOf(el) {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let base = {r: 255, g: 255, b: 255, a: 1}; if (stack.length && stack[stack.length - 1].a >= 1) base = stack.pop();
    while (stack.length) base = blend(stack.pop(), base);
    return base;
  }
  function contrast(theme) {
    const els = $$('body *').filter(e => !e.closest('script,style,#__qa,.dots,.legend i,.chap .num') && [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()) && vis(e));
    let checked = 0;
    els.forEach(e => {
      const cs = getComputedStyle(e); const fg = parse(cs.color); if (!fg) return;
      const bg = bgOf(e); if (!bg) return;
      const f = blend(fg, bg); const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const need = (size >= 24 || (size >= 18.6 && bold)) ? 3 : 4.5;
      checked++;
      if (ratio < need) issue({kind: 'contrast', theme, el: desc(e), text: ratio.toFixed(2) + ' < ' + need});
    });
    R.notes.push(theme + ': contrast checked on ' + checked + ' text elements');
  }
  function check(label) {
    cur = label; R.steps++;
    if (document.documentElement.scrollWidth > innerWidth + 1) issue({kind: 'page-scrolls-sideways', el: label, text: document.documentElement.scrollWidth + ' > ' + innerWidth});
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) {
      const t = n.nodeValue, el = n.parentElement;
      if (!el || el.closest('script,style,#__qa') || !vis(el)) continue;
      if (/<\/?(br|b|i|span|div|p|a|small|strong|em|li|ul|h\d)\b[^>]*>|&(lt|gt|amp|quot|nbsp|#\d+);/i.test(t)) issue({step: label, kind: 'escaped-html', el: desc(el), text: t.trim().slice(0, 60)});
      if (/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/.test(t) && !el.closest('#excluded,.src')) issue({step: label, kind: 'bad-value', el: desc(el), text: t.trim().slice(0, 60)});
      if (REMOVED.some(x => t.includes(x)) && !el.closest('#excluded')) issue({step: label, kind: 'removed-item-visible', el: desc(el), text: t.trim().slice(0, 60)});
    }
    $$('.card,.ncard,.ccard,.w,.list button,.chapters a').forEach(el => { if (vis(el) && el.scrollWidth > el.clientWidth + 3) issue({step: label, kind: 'overflow', el: desc(el), text: String(el.scrollWidth - el.clientWidth)}); });
  }
  const sheetOk = (label) => {
    const s = $('#sheet'); if (s.hidden) { issue({kind: 'sheet-did-not-open', el: label}); return false; }
    const t = $('#pTitle').textContent.trim(), b = $('#pBenefit').textContent.trim();
    const k = [...$$('#pWWO .w h4')].map(h => h.textContent.trim()).join('/');
    if (!t) issue({kind: 'sheet-no-title', el: label});
    if (!b) issue({kind: 'sheet-no-benefit', el: label + ' ' + t});
    if (k !== 'What/Why/Outcome') issue({kind: 'sheet-missing-wwo', el: label + ' ' + t, text: k});
    if (!$('#pWho').textContent.trim()) issue({kind: 'sheet-missing-who', el: label + ' ' + t});
    if (REMOVED.includes(t)) issue({kind: 'removed-item-visible', el: label, text: t});
    s.getAnimations({subtree: true}).forEach(a => a.finish()); const sr = s.getBoundingClientRect(); if (sr.right > innerWidth + 1 || sr.left < -1) issue({kind: 'sheet-off-screen', el: label});
    return true;
  };
  const close = async () => { $('#pClose').click(); await W(20); };
  async function openAll(sel, label) {
    const btns = $$(sel).filter(vis); let n = 0;
    for (const b of btns) { b.click(); await W(10); if (sheetOk(label)) n++; if (n === 1) check(label + ' sheet'); await close(); }
    R.opened += n; return n;
  }

  await W(300);
  // onboarding (internal page): welcome on first visit, every role's tour walked step by step
  for (let i = 0; i < 20 && $('#welcome') && $('#welcome').hidden && $('#tourBtn') && !$('#tourBtn').hidden; i++) await W(100);
  if ($('#tourBtn') && !$('#tourBtn').hidden) {
    if ($('#welcome').hidden) issue({kind: 'welcome-not-shown-on-first-visit'});
    check('welcome'); contrast('welcome');
    const roles = $$('#wRoles .wrole').map(b => b.dataset.r); R.notes.push('tour roles ' + roles.length);
    if ($('#wStart').disabled !== true) issue({kind: 'start-enabled-before-role'});
    for (const r of roles) {
      if ($('#welcome').hidden) { $('#tourBtn').click(); await W(80); }
      $$('#wRoles .wrole').find(b => b.dataset.r === r).click(); await W(20);
      $('#wStart').click(); await W(150);
      let n = 0;
      for (let guard = 0; guard < 12 && !$('#coach').hidden; guard++) {
        await W(80); n++;
        const c = $('#coach').getBoundingClientRect(), sp = $('#tourSpot').getBoundingClientRect();
        if (c.left < -1 || c.right > innerWidth + 1 || c.top < -1 || c.bottom > innerHeight + 1) issue({kind: 'coach-off-screen', el: r + ' step ' + n, text: Math.round(c.left) + ',' + Math.round(c.top) + ' ' + Math.round(c.right) + 'x' + Math.round(c.bottom)});
        if (sp.width < 10 || sp.height < 10) issue({kind: 'spotlight-empty', el: r + ' step ' + n});
        if (!$('#cTitle').textContent.trim() || !$('#cBody').textContent.trim()) issue({kind: 'coach-empty', el: r + ' step ' + n});
        if (n === 1) { check('tour ' + r); contrast('tour ' + r); }
        if (n === 2) { $('#cBack').click(); await W(80); if (!/Step 1 of/.test($('#cStep').textContent)) issue({kind: 'tour-back-broken', el: r}); $('#cNext').click(); await W(80); }
        $('#cNext').click();
      }
      if (!$('#coach').hidden) issue({kind: 'tour-did-not-finish', el: r});
      if (n < 4) issue({kind: 'tour-too-short', el: r, text: String(n)});
      R.notes.push('tour ' + r + ' ' + n + ' steps');
    }
    // escape ends the tour; skip closes the welcome
    $('#tourBtn').click(); await W(80); $$('#wRoles .wrole')[0].click(); $('#wStart').click(); await W(150);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); await W(50); if (!$('#coach').hidden) issue({kind: 'escape-does-not-end-tour'});
    $('#tourBtn').click(); await W(80); $('#wSkip').click(); await W(50); if (!$('#welcome').hidden || !$('#tourShade').hidden) issue({kind: 'skip-does-not-close-welcome'});
    if ($('#clientBar') && !$('#clientBar').hidden) $('#clientBar button').click();
    scrollTo(0, 0); await W(50);
  } else if ($('#welcome') && !$('#welcome').hidden) issue({kind: 'welcome-on-customer-page'});
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') { $('#themeBtn').click(); await W(80); if (document.documentElement.getAttribute('data-theme') !== 'dark') issue({kind: 'theme-toggle-failed'}); }
    else if (document.documentElement.getAttribute('data-theme') !== 'light') issue({kind: 'not-light-by-default', text: String(document.documentElement.getAttribute('data-theme'))});
    check(theme + ' load'); contrast(theme);
    // open a first card and check sheet contrast too
    const c0 = $$('.card').find(vis); if (c0) { c0.click(); await W(30); sheetOk(theme + ' first card'); contrast(theme + ' sheet'); await close(); }
  }
  $('#themeBtn').click(); await W(50);  // back to light

  // every card, list row, coming-next card and client card
  const counts = {};
  counts.cards = await openAll('#timeline .card', 'card');
  counts.rows = await openAll('#timeline .list button', 'list row');
  counts.next = await openAll('#next .ncard', 'coming next');
  counts.client = await openAll('#forclient .ccard', 'client card');
  R.notes.push('opened ' + JSON.stringify(counts));
  // prev / next walks
  const f = $$('#timeline .card').find(vis); if (f) { f.click(); await W(20); let steps = 0; while (!$('#pNext').disabled && steps < 5) { $('#pNext').click(); await W(10); sheetOk('next-walk'); steps++; } if (!steps) issue({kind: 'sheet-next-disabled'}); $('#pPrev').click(); await W(10); sheetOk('prev-walk'); await close(); }
  // filters
  // filters: every option's shown count must equal what the page then shows; chips, groups, clear all, empty state
  const shownN = () => $$('#timeline .card,#timeline .list button').filter(vis).length;
  const fOpen = async () => { if ($('#fPanel').hidden) { $('#fOpen').click(); await W(40); } };
  const clr = async () => { $('#fClear').click(); await W(40); };
  await fOpen(); check('filter panel'); contrast('filter panel');
  const opts = () => $$('#fpBody input[data-f], #fpBody button[data-f]');
  const nOpts = opts().length; R.notes.push('filter options ' + nOpts);
  for (let k = 0; k < nOpts; k++) {
    await clr(); await fOpen();
    const o = opts()[k]; const lab = (o.closest('label') || o).textContent.trim().replace(/\s+/g, ' ');
    const want = +((o.closest('label') || o).querySelector('.n') || {}).textContent;
    o.click(); await W(40);
    if ($('#fPanel').hidden) issue({kind: 'filter-panel-closed-on-select', el: lab});
    const got = shownN();
    if (!Number.isNaN(want) && want !== got && !$('#timeline .empty')) issue({kind: 'filter-count-mismatch', el: lab, text: 'says ' + want + ', shows ' + got});
    if (!want && !$('#timeline .empty')) issue({kind: 'filter-zero-without-empty-state', el: lab});
    if ($('#activeF').hidden) issue({kind: 'active-chip-missing', el: lab});
    const cnt = $('#count').textContent; if (!new RegExp('^' + got + ' of ').test(cnt) && got) issue({kind: 'count-text-wrong', el: lab, text: cnt});
  }
  await clr(); check('filters cleared'); if (!$('#activeF').hidden) issue({kind: 'clear-all-left-chips'});
  // combination, chip removal and group chips
  await fOpen(); const t1 = $$('#fpBody input[data-f="theme"]'); t1[0].click(); await W(30); t1[1] = $$('#fpBody input[data-f="theme"]')[1]; t1[1].click(); await W(30);
  const w1 = $$('#fpBody button[data-f="who"]')[0]; if (w1) { w1.click(); await W(30); }
  check('filter combination'); const combo = shownN();
  const ach = $$('#activeF .achip'); if (ach.length < 3) issue({kind: 'combo-chips-missing', text: String(ach.length)});
  if (ach[0]) { ach[0].querySelector('button').click(); await W(40); if ($$('#activeF .achip').length !== ach.length - 1) issue({kind: 'chip-remove-failed'}); }
  $('#fDone').click(); await W(30); if (!$('#fPanel').hidden) issue({kind: 'panel-not-closed'});
  await clr(); $('#fDone').click();
  for (const g of $$('#groupChips .gchip')) { g.click(); await W(40); check('group ' + g.textContent); if (g.getAttribute('aria-pressed') !== 'true' && !$$('#groupChips .gchip').some(x => x.getAttribute('aria-pressed') === 'true')) issue({kind: 'group-chip-not-pressed', el: g.textContent}); if (!shownN()) issue({kind: 'group-shows-nothing', el: g.textContent}); }
  await clr(); $('#fDone').click(); await W(20);
  $('#fOpen').click(); await W(30); document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await W(30); if (!$('#fPanel').hidden) issue({kind: 'escape-does-not-close-filters'});
  $('#fOpen').click(); await W(30); document.body.click(); await W(30); if (!$('#fPanel').hidden) issue({kind: 'outside-click-does-not-close-filters'});
  R.notes.push('combo shows ' + combo);
  // lanes
  $('#vLanes').click(); await W(40); check('lanes');
  const pills = $$('#lanes .pill').filter(vis); R.notes.push('pills ' + pills.length);
  for (const p of pills.slice(0, 60)) { p.click(); await W(8); sheetOk('pill'); await close(); }
  const np = $$('#lanes .pill.nx').filter(vis); for (const p of np) { p.click(); await W(8); sheetOk('next pill'); await close(); }
  $('#vTimeline').click(); await W(40); check('back to timeline');
  // search (internal only)
  const q = $('#q'); if (q && !q.hidden) { q.value = 'EP-7417'; q.dispatchEvent(new Event('input')); await W(400); check('search'); if (!$$('#timeline .card,#timeline .list button').some(vis)) issue({kind: 'search-found-nothing', text: 'EP-7417'}); q.value = ''; q.dispatchEvent(new Event('input')); await W(400); }
  // internal only: platform today, persona, Ask the roadmap (with the QA stand-in runtime)
  if ($('#vPlatform') && !$('#vPlatform').hidden) {
    for (let i = 0; i < 40 && !window.__QA_GOLD_RESULT; i++) await W(100);
    const G = window.__QA_GOLD_RESULT;
    if (!G) issue({kind: 'golden-not-run'}); else {
      G.res.filter(r => !r.ok).forEach(r => issue({kind: 'golden-retrieval-miss', el: r.q, text: 'rm ' + r.rm.join(',') + ' | pf ' + r.pf.join(',')}));
      R.notes.push('golden retrieval ' + G.res.filter(r => r.ok).length + '/' + G.res.length + ' · made-up feature hits ' + G.fakeHits);
      if (G.fakeHits) issue({kind: 'made-up-feature-found', text: String(G.fakeHits)});
    }
    $('#vPlatform').click(); await W(400); check('platform view');
    const pc = $$('#platform .pcard').filter(vis); R.notes.push('platform areas ' + pc.length); if (!pc.length) issue({kind: 'platform-no-areas'});
    for (const theme of ['light', 'dark']) { if (theme === 'dark') { $('#themeBtn').click(); await W(60); } contrast(theme + ' platform'); }
    $('#themeBtn').click(); await W(60);
    if (pc[0]) { pc[0].click(); await W(150); check('platform area'); const cb = $$('#platform .clist button').filter(vis); if (!cb.length) issue({kind: 'platform-no-claims'});
      if (cb[0]) { cb[0].click(); await W(30); if ($('#sheet').hidden || !$('#pMeta .vd')) issue({kind: 'claim-sheet-missing-verdict'}); check('claim sheet'); contrast('claim sheet'); $('#pNext').click(); await W(20); if (!$('#pMeta .vd')) issue({kind: 'claim-sheet-next-broken'}); await close(); } }
    const qi = $('#platQ'); if (qi) { qi.value = 'speed networking'; qi.dispatchEvent(new Event('input')); await W(500); check('platform search'); if (!$$('#platform .clist button').filter(vis).length) issue({kind: 'platform-search-empty'}); }
    $('#vTimeline').click(); await W(80);
    const opt = $('#clientList option'); if (!opt) issue({kind: 'persona-no-clients'}); else {
      $('#pClient').value = opt.value; $('#pClient').dispatchEvent(new Event('change')); await W(200); check('client filter');
      if ($('#clientBar').hidden) issue({kind: 'client-filter-bar-hidden'});
      if (!$$('#timeline .card,#timeline .list button').filter(vis).length) issue({kind: 'client-filter-shows-nothing', el: opt.value});
      const s1 = $$('#timeline .card').find(vis); if (s1) { s1.click(); await W(200); if (!/Clients on these stories/.test($('#pSrc').textContent)) issue({kind: 'sheet-no-client-line'}); check('internal sheet enriched'); await close(); }
      $('#persona').requestSubmit(); await W(600); check('briefing');
      if ($('#ask').hidden) issue({kind: 'ask-panel-not-open'});
      if (!$$('#askLog .blk').length) issue({kind: 'briefing-no-blocks'});
      $('#clientBar button').click(); await W(100);
    }
    $('#askClear').click(); await W(20);
    $$('#askStarters button')[0].click(); await W(600); check('ask answer');
    const blks = $$('#askLog .a .blk'); R.notes.push('ask blocks ' + blks.length + ' · dropped note ' + !!$('#askLog .warn'));
    if (blks.length < 1) issue({kind: 'ask-no-blocks'});
    if (!$('#askLog .warn')) issue({kind: 'unbacked-statement-not-dropped'});
    if (/Unbacked statement/.test($('#askLog').textContent)) issue({kind: 'unbacked-statement-shown'});
    const ct = $$('#askLog .cite')[0]; if (ct) { ct.click(); await W(200); if ($('#sheet').hidden) issue({kind: 'cite-does-not-open'}); await close(); } else issue({kind: 'ask-no-cites'});
    for (const theme of ['light', 'dark']) { if (theme === 'dark') { $('#themeBtn').click(); await W(60); } contrast(theme + ' ask panel'); }
    $('#themeBtn').click(); await W(60);
    $('#askClose').click(); await W(20);
  }
  if ($('#pdfBtn') && !$('#pdfBtn').hidden) {
    $('#pdfBtn').click(); await W(100); check('pdf dialog'); contrast('pdf dialog');
    if ($('#pdfDlg').hidden) issue({kind: 'pdf-dialog-not-open'});
    $('#pdfGo').click(); await W(100); if (!/Choose at least one/.test($('#pdfMsg').textContent)) issue({kind: 'pdf-no-product-guard-missing'});
    const cb = $$('#pdfThemes input'); ['exhib', 'meet'].forEach(v => { const i = cb.find(x => x.value === v); if (i) i.checked = true; });
    $('#pdfAud').value = 'internal'; $('#pdfAud').dispatchEvent(new Event('change'));
    $('#pdfGo').click();
    for (let i = 0; i < 150 && !window.__QA_SAVED; i++) await W(100);
    if (!window.__QA_SAVED) issue({kind: 'pdf-not-saved', text: $('#pdfMsg').textContent}); else R.notes.push('pdf saved ' + window.__QA_SAVED.filename + ' ' + Math.round(window.__QA_SAVED.size / 1024) + ' KB');
    await W(300); $('#pdfClose').click(); await W(50);
  }
  // keyboard: escape closes
  const c1 = $$('.card').find(vis); if (c1) { c1.click(); await W(20); document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); await W(20); if (!$('#sheet').hidden) issue({kind: 'escape-does-not-close'}); }
  const pre = document.createElement('pre'); pre.id = '__qa'; pre.textContent = JSON.stringify(R); document.body.append(pre);
  if (parent !== window) parent.postMessage({__qa: pre.textContent}, '*');
})();
