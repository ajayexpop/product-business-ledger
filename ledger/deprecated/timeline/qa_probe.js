// Timeline checks removed from tools/qa_probe.js on 6 Oct 2026.
// Block 1 sat after the Clients checks (`.c360-open`) and before "// FEEDBACK":
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

// Block 2, in the Guide checks: "My clients" was checked on the Timeline count (#t-count):
  const cnt0 = $('#t-count') ? $('#t-count').textContent : '';
  await clicks('#ob-greet [data-obscope="my"]', 1, 'my clients on', {keep: true, wait: 400});
  await tab('timeline'); await W(300); if ($('#t-count') && $('#t-count').textContent === cnt0) R.issues.push({step: 'my clients', kind: 'filter-not-applied', text: cnt0}); check('timeline, my clients');
