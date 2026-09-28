# Product intelligence layer: spec (v1, 26 Sep 2026)

The requests DB (`requests/db/items.json`) holds the facts. This layer adds meaning, reasoned with the
product-intelligence-graph-architect knowledge base (KB: `master-extraction.md`, `entity-graph.json`,
`story-refinement-engine.md`):

1. **Product area**: every request gets one KB product and its domain.
2. **What / why / outcome**, written from the request's own text.
3. **Built overlap**: whether the KB's built stories (521 mapped, 554 unique keys in its story tables)
   already cover the ask.
4. **Demand clusters**: requests asking for the same need are grouped per product, with duplicates marked,
   so one need counts once however many tickets it has.
5. **Tier signal**: who is asking, by Sales Tier. Tier 1 asks are the strongest signal.

No prioritisation score is computed yet (`score: null`). The scoring criteria come from the owner next.

Pipeline: `python3 tools/intel.py kb` → `prep` → enrichment agents write `intel/work/out/cNN.json` → `merge`
→ `cprep` → clustering agents write `intel/work/clusters_out/<product>.json` → `build` → `check`.

Scope: the 1,781 in-scope requests (822 Feature Requests, 839 Open Stories, 120 FIS pages). 347 Open Stories
already have a KB product (`data/stories/pa/classification.json`, SPEC v2) and what / why / outcome
(`analysis/stories.json`), so they are reused and not re-enriched. The other 1,434 are enriched here.

## A. Enrichment (one record per request)

Input: `intel/work/chunks/cNN.json`. Each item has its Jira/FIS fields and text, plus two helpers that are hints,
not answers: `builtCandidates` (the most similar KB built stories by text) and `similarRequests` (the most
similar other requests).

Output: `intel/work/out/cNN.json`, a JSON array with one object per input item, in the same order:

```json
{"id": "EP-57418",
 "product": "Mobile App", "domain": "Engagement & Matchmaking",
 "basis": "component", "evidence": "components Meeting Program, Mobile App; app-only parity work → Mobile App (feature: Meetings & Matchmaking)",
 "kbRef": "[MASTER Mobile App §4 Feature Inventory :10454 …]", "confidence": "High",
 "what": "Bring the mobile app's meeting request flow up to web parity: edit attendees, reschedule, pick a team member by availability, and let admins manage app meetings from the backend.",
 "why": "SNAC's meetings programme is the core of SNX 2026, and on-site attendees work from the app, where the older flow creates gaps and support load.",
 "outcome": "A meeting started on either platform can be managed on the other with the same capabilities, and admins handle both from one backend flow.",
 "needKey": "mobile meetings flow parity with web",
 "requestKind": "parity",
 "entities": ["MEETING", "MEETING_REQUEST"],
 "customersNamedInText": ["SNAC International"],
 "builtOverlap": [{"k": "EP-45278", "verdict": "Related", "ref": "[MASTER … :line]", "note": "aligns team-member display, not the request flow"}],
 "textQuality": "clear"}
```

Rules:

- **product**: apply `data/stories/pa/SPEC.md` (v2) exactly: the 23 KB products and the Unassigned / Cross-cutting
  bucket; rule order component → epic → summary → none; the content override; Mobile-only work → Mobile App;
  Speed Networking → Meetings & Matchmaking; Admin Interface names a surface, not a product. For FIS pages, the
  page's own Product Area is a hint, not a decision. `domain` follows from the product. `evidence` says what
  decided; `kbRef` cites the matched feature line from `data/stories/pa/kb_products.json`, or null.
- **what / why / outcome**: one or two plain sentences each, in the platform's own terms, written only from the
  request's title, form fields, description, evidence and comments. **what** = the change asked for. **why** = the
  problem or pain, and who raised it, as stated. **outcome** = the observable result for the user once it ships.
  Never invent platform behaviour. When the text does not say why, write `Not stated in the request.` and set
  `textQuality` to `thin`. When the ask itself is unclear, say what can be read and set `textQuality: unclear`.
- **needKey**: 3 to 8 words naming the underlying need, independent of the ticket's wording, so the same need
  gets the same phrase in different tickets (e.g. `exhibitor list export to pdf/excel`,
  `speaker academic title display`).
- **requestKind**: one of `new capability`, `extension`, `parity` (web / app / admin), `configuration`,
  `integration`, `ux`, `reporting`, `data / import-export`, `compliance / security`, `performance`, `tech`.
- **entities**: `entity-graph.json` node ids the ask touches (check with `graph.py find`); an empty list is allowed.
  Never invent an id.
- **customersNamedInText**: customer organisations named in the title, text, evidence or comments that are not
  already in `customersFromFields`. Write the name as the text writes it. Never the internal team, never
  ExpoPlatform, and never a person's name.
- **builtOverlap**: judge each relevant `builtCandidates` entry (and any KB story found with `kb.py stories`) on
  business intent, not title words. The verdict is one of `Already built` (the ask is delivered as asked),
  `Partially built` (the base exists and the ask extends it), or `Related` (same area, different need). Every entry
  cites `ref`. Leave out candidates that are not related. An empty list means none found among built features,
  since the KB holds delivered work only.
- **confidence**: High, Medium or Low, as in the product-area SPEC.

## B. Clustering (per product)

Input: `intel/work/clusters_in/<product>.json`: every request in the product with its what / why, needKey,
customers with tiers, built overlaps, and `near` (text neighbours, a hint).

Output: `intel/work/clusters_out/<product>.json`:

```json
{"product": "Sessions & Speakers",
 "clusters": [
  {"name": "Academic title and salutation next to names",
   "what": "…", "why": "…", "outcome": "…",
   "members": [{"id": "FIS-1542127618", "role": "canonical"},
               {"id": "EP-46465", "role": "duplicate", "note": "same ask, DLG / HINTE"},
               {"id": "EP-46255", "role": "related", "note": "display gap on the speaker card only"}],
   "builtOverlap": "Partially built: Salutation field exists [MASTER … :line]" ,
   "alsoIn": ["Mobile App"],
   "notes": "…"}]}
```

Rules: a cluster is one user need that one piece of product work could answer. Every request in the file is in
exactly one cluster; a need asked once is a cluster of one. Roles: exactly one `canonical` (the clearest or most
complete statement of the need; prefer the FIS page or the FR with the most evidence), `duplicate` (the same ask
again), `overlap` (a large part of the same ask, plus something else), `related` (the same need from a different
angle, counted as its own ask). Cluster what / why / outcome are written across the members, from their texts
only. The cluster name is a short noun phrase a product manager would use. Do not merge two needs because they
share a screen. Do not split one need because the tickets are worded differently. `alsoIn` names other
products where the same need visibly recurs (for example the web half of an app-parity ask), so the view can
link the clusters across products; leave it empty when unsure.

## Tier signal

Customers come from the requests DB (Reported by, Affected clients, Pipedrive id) plus `customersNamedInText`,
resolved to the ledger through `data/done-raw/client_map.json`. `topTier` is the best tier among a
request's or a cluster's customers. `tierSignal` = Σ over distinct customers of (T1 8, T2 4, T3 2, T4 1). It shows
who is asking and is not the priority score. The scoring criteria come next and will fill `score`.

## Outputs

| Path | What |
| --- | --- |
| `intel/kb/built_stories.json` | KB built-story rows: key, title, intent, outcome, feature, status, product, MASTER line |
| `intel/db/items.json` | One record per request: facts summary + product, domain, what / why / outcome, needKey, kind, entities, customers with tiers, built overlap, clusterId |
| `intel/db/clusters.json` | Demand clusters: name, product, domain, what / why / outcome, members with roles, customers with tiers, topTier, tierCounts, t1Customers, tierSignal, built overlap, `score: null` |
| `intel/db/graph.json` | Domain → product → cluster → customer graph for the artifact |
| `intel/db/summary.json` | Counts |
