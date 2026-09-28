# How Product Truth keeps itself true

Three loops, each cheap on its own, so the hub is never more than a few hours behind Jira and never silently wrong.

```
 LOOP 1  sources refresh            LOOP 2  build                        LOOP 3  page, for every viewer
 (agents, per source recipe)        (truth.py run)                       (live Jira layer + decisions)

 Jira EP / IMP / OP ─┐              identity ─┐                          snapshot data (inline)
 Confluence FIS ─────┤  delta pull  taxonomy ─┤ fingerprints:              + Jira changes since the snapshot
 Planhat ────────────┼────────────► stories  ─┤ a step reruns only        (every 4 h, one viewer refreshes
 Ledger db ──────────┤  enrich to   demand   ─┤ when an input changed      for all, stored in the page db)
 KB catalogue ───────┘  each SPEC   health   ─┤                          + decisions answered on the page
                                    signals  ─┤ 15 gates, refuse on FAIL   (stored with who and when)
                                    quality  ─┤                                   │
                                    page     ─┘──── publish in place ──────►      │
                                        ▲                                         │
                                        └──────── decisions read back at the next build ◄──┘
```

## Loop 1: sources refresh

Each source in `config.json` has an as-of field, a freshness limit and its refresh recipe (the upstream tool's own
command sequence). `truth.py status` lists the stale ones with their recipe. An agent follows `REFRESH.md`: it runs
the delta for each stale source (metadata pull → plan → enrich only new and changed items → merge → check), never a
full re-pull. Parallel agents each get their own working folder.

## Loop 2: the build

`truth.py run` walks eight steps. Each step's fingerprint covers its input files (content hashes), the pipeline's
own code, the decisions and, for date-sensitive steps, today's date. A step is skipped when its fingerprint matches
the last run, so a refresh of one source rebuilds only what depends on it. After the steps, every gate runs:

- one record per client and per story key
- stories, requests, clusters and bugs reconcile with their sources
- every client reference resolves to a ledger client or a named outside organisation
- every story, request and need lands on one catalogue product
- no credential patterns in the store or the page
- warnings (not failures): a source past its freshness limit, an owner decision still open

Each run is appended to `state/runs.jsonl`; the page shows the last ones on its System view.

## Loop 3: the page

The page is the snapshot plus a live layer:

- **Jira changes since the snapshot.** On open, if the last refresh is older than 4 hours, the page takes a lease
  on `live/lock` in its database and asks Jira (through the viewer's Atlassian connector) for EP Bugs, Stories and
  Feature Requests, and every IMP ticket, updated since then. Each issue is compared with the snapshot and kept only
  when it means something: a story shipped or started, a new client bug, a bug closed, a new or moved incident, a new,
  moved or closed request. Kept changes go into `live/b00..b07`; `live/state` records when and how many. Every viewer
  sees them, on Today and in each client's panel. A viewer without Atlassian, or with view-only access, still reads
  what others stored.
- **Decisions.** Editors answer the open decisions on the System view. Each answer is stored in `decisions/<D#>`
  with who and when (only editors can write there). The next build imports them (`truth.py import-decisions`) and
  applies them, and `DECISIONS.md` regenerates.

## What makes it zero to one

Before: nine tools, seven pages, four story sets, three product vocabularies, clients matched in six places,
and a refresh that meant remembering every command. After: one command rebuilds a joined store, proves it, and
publishes a page that keeps itself current between builds and collects the decisions it needs.
