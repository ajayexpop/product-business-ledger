# Timeline tab (deprecated 6 Oct 2026)

The Timeline tab sat in the Client health group, after Overview and Clients. It showed one row per client and one column per month, with what we delivered, bugs raised that month and still open, incidents and show flags in each cell. Above the grid, the "Delivering or firefighting, month by month" chart put delivered stories above a centre line and open bugs and incidents below it.

It was removed from the published ledger on 6 Oct 2026. The last version that had it is **1790786519-79a4**.

## Why

Ilaria's phase 4 review of the ledger (feedback of 1 Oct 2026) marked the Timeline as cut: the client 360 and the event calendar already answer what lands before a show. The one chart she thought might survive, delivering or firefighting by month, was only worth keeping if Bartosz planned capacity with it. Ajay decided on 6 Oct 2026 to deprecate it as well, so the whole tab went. The code is kept here so it can be put back if anyone needs it.

## What is in this folder

| File | What it holds | Where it came from |
| --- | --- | --- |
| `markup.html` | The tab button and the `#panel-timeline` section | `src/markup.html` |
| `timeline.js` | The tab's code in three parts: state, indexing, grid, chart and month pop-up (part 1); `openModal`, the client-month pop-up (part 2); the grid listeners (part 3) | `src/main.js` |
| `guide.js` | The Guide tour and "What am I looking at?" text for the tab, and every one-line call or label that was changed elsewhere | `src/main.js` |
| `qa_probe.js` | The Timeline checks from the click-through QA | `tools/qa_probe.js` |

Left in place in `src/`:

- `TIERS` (the Delivery tab's tier bands use it) and `tlRisk` (the Overview show risk uses it), under a short comment where part 1 used to be.
- The `timeline` entry in `OB_TABN`, so older feedback, visits and History entries that point at the tab still show its name.
- All CSS. The Timeline rules are spread through `src/style.css` and some are shared with the Overview (`.tv-b`, `.tv-i`, `.tv-ch`), so nothing was cut. The rules only the Timeline used start with `.tlv`, `.tv-key`, `.tv-kc`, `.tvt`, `.tv-hint`, `.tv-chart`, `.tvn`, `.tvband`, `.tvb-arw`, `.tvsep`, `.chart.mir`, `.mir-cap` and `.mm-`.
- The Timeline group of rules in `logic.json` (bucketing and scaling of the grid). They no longer drive anything on the page.

`showTab` now opens the Overview for any tab that has no panel, so an old `#timeline` link or a saved last tab lands there.

## How to restore it

1. `src/markup.html`: put the button from `markup.html` back in `#tabs`, in the Client health group, after the Clients button. Put the `<!-- TIMELINE -->` section back between the OVERVIEW and DEMAND panels.
2. `src/main.js`:
   - Replace the stub comment, `TIERS` and `tlRisk` (search for `TIMELINE tab: removed 6 Oct 2026`) with part 1 of `timeline.js`, which already contains both.
   - Put part 2 (`openModal`) back right after `const modal=document.getElementById('modal');`.
   - Put part 3 back after the `modal-open-client` click listener, before `// ===== DELIVERY TIMELINE`.
   - Re-add the calls listed in `guide.js`: `renderTimeline()` in `renderAll()`, in the refresh re-render, at init and in the dark-mode listener; `TLIX=tlIndex();` and `renderTimeline()` in the `#f-scope` listener; `try{ TLIX=tlIndex(); }catch(e){}` at the end of the story merge (after `D.stories.forEach(s=>{ storyByKey[s.k]=s; });`); the `#t-owner` fill at init.
   - Re-add the `timeline` entries in `OB_TOURS` and `OB_WHAT`, put "Timeline" back in the Overview tour's first step, and set the "Shows in 90 days" KPI back to `tab:'timeline'` if you want it to land there.
   - Change the Jira OP source card's `feeds` back to `'Timeline, next show, Client 360'`, and the "My clients" text to "Overview, Clients and Timeline".
3. `tools/qa_probe.js`: replace the "TIMELINE: the tab was removed" lines with block 1 of `qa_probe.js`, and the "My clients" check with block 2.
4. Run the update cycle in `ledger/CLAUDE.md`: build, all five QA runs at 0 errors and 0 issues, publish in place, records.
