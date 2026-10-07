# Internal Product Business Ledger

**Open it:** https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d

The ledger shows every ExpoPlatform client from the client's side: what is broken for them (bugs, incidents), what we promised (the must-have ledger), what is being built (delivery), what they are asking for (the demand map), and how close their next show is. New work is logged in the feature ledger, which carries each item from logging to done with one value lever, one £ figure and a named signer.

This folder holds the whole project. Open it in Claude Code and read `CLAUDE.md` first: it has the update cycle, the rules for publishing, and the data-refresh routine.

## What is in the page

| Tab | What it shows |
| --- | --- |
| Overview | A greeting with what changed since your last visit, what needs attention, the next 8 weeks of shows, the event radar, team pressure |
| Clients | Every client with health, problems and promises; Client 360 for each |
| Timeline | Client by month: shows, delivery, bugs, incidents; zoom, ranges, filters, clickable month chart |
| Requests | The Feature ledger (work items, their flow, sample walkthrough, hand-offs; logging new items with Claude is in Beta for the Settings viewers) and the Must-have ledger |
| Demand | The Product Demand Map with instant and AI search |
| Delivery, Bugs, Incidents | What is built and being built; open client bugs; production incidents |
| Rules, Method & sources, Sync & logs | Settings: Ajay and Bartosz |
| Feedback (header button) | Everyone: Happy / Sad / Want notes to Ajay, with replies. Ajay: the Feedback inbox and Roadmap |

Everyone gets onboarding (a welcome card, a tour for every tab, one-time hints) and the Guide (tours, glossary, Ask, personal settings such as My clients).

## Where the data is

| What | File |
| --- | --- |
| The built page data (companies, bugs, incidents, events, stories, epics, product areas) | `data/ledger.json` |
| The Hyve dedicated team | `data/hyve.json` |
| The demand map (requests, needs, built stories) | `data/demand/demand.json` |
| The story cache and product-area classification | `data/stories/` |
| Raw Jira OP event pulls | `data/events/raw/` |
| The rules (every threshold and weight) | `live/logic.json` |
| The flow read | `live/flow.json` |
| The shared database (must-have items, column settings, Jira refresh, data-refresh pulls, visits, work items) | `live/db/<collection>/<doc>.json` |
| Feedback (private to Ajay) and its roadmap | `live/db/feedback/`, `docs/feedback-roadmap.md` (`tools/feedback.py build`) |
| What is published right now | `live/index.html`, `live/MANIFEST.json` |

All of it is JSON. `live/db` is refreshed from the published ledger at the start of every change (update cycle step 1).

## Working with it

```sh
cd ledger
python3 tools/ledger.py check      # the published page splits back into src/ and data/ and rebuilds byte for byte
python3 tools/ledger.py build      # src/ + data/ + live/ -> dist/
python3 tools/qa.py                # the click-through QA (also QA_WIDTH=1100, QA_AS=other, QA_AS=nomcp)
python3 tools/demand.py build      # rebuild the demand map from ../intel and ../requests
python3 tools/events.py build      # rebuild events from data/events/raw
python3 tools/stories.py check     # the story cache
python3 tools/product_areas.py check
python3 tools/feedback.py build    # the feedback roadmap from live/db/feedback
```

## Documents

- `CLAUDE.md`: how to work on the ledger (read first)
- `docs/methods-runbook.md`: every source, method and rule, and the change log
- `docs/version-history.md`: every published version
- `docs/stories-by-year.md`: story coverage and pull recipes
- `exploring/`: the feature ledger design (entry schema, lifecycle, approvals, ranking, pickup, checks, open decisions)
- `exploration/`: parked ideas
