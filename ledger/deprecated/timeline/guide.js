// Guide entries removed from src/main.js on 6 Oct 2026.
// In OB_TOURS, after the ledger entry:
  timeline:[['#t-range','Pick the months','The whole year, around now, halves or quarters.'],
    ['#t-zoom','Zoom','Make columns and text bigger or smaller. Ctrl or ⌘ + scroll works too.'],
    ['#chart-tlmonths','Delivering or firefighting','Each month: what shipped, what is in progress, bugs by severity and incidents. Click a bar or a segment to see what is behind it.'],
    ['#tv-filters','Filters','Turn marks on or off, and show only clients at Act now, Watch or Clear.'],
    ['#tl','Client by month','One row per client, one cell per month. A flag marks a show. Click a cell for that month’s detail.']],
// In OB_WHAT, after the ledger entry:
  timeline:'Month by month for each client: shows, delivery and problems, so you can see what is landing before a show.',
// OB_TOURS.overview, first step, said: 'Client health (Overview, Clients, Timeline) shows every client from their side. ...'
// The Overview KPI 'Shows in 90 days with Urgent or High open' had tab:'timeline' (now 'ledger').
// The Jira OP source card said feeds:'Timeline, next show, Client 360'.
// renderTimeline() was called in renderAll(), the refresh re-render, init and the dark-mode listener;
// TLIX=tlIndex() ran in the #f-scope listener (with renderTimeline()) and after applyDelta's story merge;
// init filled #t-owner: document.getElementById('t-owner').innerHTML='<option value="">All</option>'+owners.map(o=>`<option>${esc(o)}</option>`).join('');
