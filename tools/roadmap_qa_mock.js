// QA stand-in for the claude.ai runtime on the internal journey page: a fake `sample` that runs the page's own
// tools the way Claude would (search roadmap + platform, read one item) and returns blocks, including one citing an
// id no tool returned, which the page must drop. Also records the golden-question retrieval check.
window.__QA_GOLD = [
  {q: 'exhibitor product profile page', pf: ['14_exhibitor_marketplace:78']},
  {q: 'Can exhibitors share brochures and marketing content?', pf: ['14_exhibitor_marketplace:81', '14_exhibitor_marketplace:192']},
  {q: 'Do we have speed networking?', rm: ['formats-speed-networking'], pf: ['09_meetings_and_matchmaking:129', '08_networking_and_interactions:102']},
  {q: 'AI meeting notes', rm: ['meet-ai-meeting-notes', 'meet-personalised-meeting-notes', 'meet-ai-notes-add-on']},
  {q: 'self check-in kiosk', pf: ['04_onsite_and_kiosks:235', '11_community:90', '04_onsite_and_kiosks:112', '04_onsite_and_kiosks:114']},
  {q: 'Can visitors request product samples?', pf: ['11_community:82', '14_exhibitor_marketplace:78']},
  {q: 'Do we have group chat?', pf: ['08_networking_and_interactions:100', '08_networking_and_interactions:143']},
  {q: 'Scheduled push notifications', pf: ['12_user_engagement:123', '19_mobile_app:88']},
  {q: 'Offline floor plan in the app', rm: ['onsite-offline-expofp']},
  {q: 'Passwordless login', rm: ['platform-passwordless-login']},
  {q: 'Can organisers export news?', pf: ['14_exhibitor_marketplace:177', '14_exhibitor_marketplace:80']},
  {q: 'Lead capture badge scanning for exhibitors', rm: ['exhib-colocated-scans', 'exhib-lead-capture-pro', 'exhib-leads-2024q2', 'exhib-custom-lead-questions', 'exhib-lead-app-2026q1'], pf: ['04_onsite_and_kiosks:147']},
];
window.__QA_TOOLS = async (tools, loadAsk) => {
  await loadAsk();
  const T = n => tools.find(t => t.name === n);
  const res = [];
  for (const g of window.__QA_GOLD) {
    const rm = (await T('search_roadmap').execute({query: g.q})).map(x => x.id);
    const pf = (await T('search_platform').execute({query: g.q})).map(x => x.id);
    const okR = !g.rm || g.rm.some(i => rm.includes(i)), okP = !g.pf || g.pf.some(i => pf.includes(i));
    res.push({q: g.q, ok: okR && okP, rm: rm.slice(0, 3), pf: pf.slice(0, 3)});
  }
  const fake = (await T('search_roadmap').execute({query: 'teleport attendees to mars'})).length + (await T('search_platform').execute({query: 'teleport attendees to mars'})).length;
  window.__QA_GOLD_RESULT = {res, fakeHits: fake};
};
(function () {
  const mock = async function () { return {text: 'x', truncated: false, modelTierApplied: 'default'}; };
  mock.limits = async () => ({maxPromptBytes: 65536, tools: {maxCount: 8}});
  mock.json = async (turns, opts) => {
    const q = turns[turns.length - 1].content;
    const T = n => opts.tools.find(t => t.name === n);
    if (/briefing/i.test(q)) {
      const m = q.match(/client "([^"]+)"/); const o = await T('client_overview').execute({client: m ? m[1] : ''});
      return {blocks: [{status: 'client', text: 'Built with them.', cites: o.builtWithThem.slice(0, 3).map(x => x.id)}], followups: ['What is next for them?']};
    }
    const rm = await T('search_roadmap').execute({query: q}); const pf = await T('search_platform').execute({query: q});
    if (rm[0]) await T('get_roadmap_item').execute({id: rm[0].id});
    const blocks = [];
    if (pf[0]) blocks.push({status: pf[0].verdict === 'CONFIRMED' ? 'platform' : 'partial', text: 'Exhibitors have product pages with a slider, categories, rich text, video, marketing content and sample requests. This is part of the platform today, checked against the code.', cites: pf.slice(0, 2).map(x => x.id)});
    if (rm[0]) blocks.push({status: rm[0].kind === 'new' ? 'new' : 'improved', text: 'Shipped ' + rm[0].when + ': ' + rm[0].title + '. ' + (rm[0].benefit || ''), cites: rm.slice(0, 3).map(x => x.id)});
    blocks.push({status: 'not-found', text: 'I found nothing about bulk product approval in the roadmap or the verified baseline. The product team can confirm.', cites: []});
    blocks.push({status: 'improved', text: 'Unbacked statement that must be dropped.', cites: ['EP-0']});
    return {blocks, followups: ['Follow-up one?']};
  };
  const dl = {save: async ({filename, data}) => { window.__QA_SAVED = {filename, size: data.size || data.length}; const r = new FileReader(); r.onload = () => { const p = document.createElement('pre'); p.id = '__pdf'; p.hidden = true; p.textContent = String(r.result).split(',')[1]; document.body.append(p); }; r.readAsDataURL(data); return 'saved'; }};
  window.claude = {use: async n => n === 'sample' ? mock : n === 'downloads' ? dl : null};
})();
