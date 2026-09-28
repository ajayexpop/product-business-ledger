# Product-area classification spec (v2, 25 Sep 2026; v1 24 Sep)

Every story in the cache gets one **product** from the ExpoPlatform product catalogue, and through it one
**domain** (the top of the hierarchy). The catalogue, the domains and the assignment rule are not invented here:
they are the ones the product knowledge base (product-intelligence-graph-architect, `master-extraction.md`) used
to map its 521 in-scope stories.

## Hierarchy (Observed: MASTER Product Ecosystem Map §3 and §4, lines 153-230)

| Domain (top level) | Products |
| --- | --- |
| Provisioning & Platform Core | Client Manager · Admin / Platform Core · Integrations |
| Acquisition & Commerce | Event Website · Online Registration · Transactions & Purchasing · User Engagement |
| Identity & Community | Profile · Community |
| Engagement & Matchmaking | Networking & Interactions · Meetings & Matchmaking · Sessions & Speakers · Mobile App |
| Exhibitor & Sponsor | Exhibitor Portal · Exhibitor Marketplace · Sponsorship · Floor Plan · Hosted Buyer Management · Lead Intelligence |
| Onsite | Onsite & Kiosks |
| Insight | Organiser Analytics |
| Cross-cutting | Unassigned / Cross-cutting (the KB's own bucket, §12) — infrastructure, CI, tech debt, test coverage, work that serves no single product |

Use these product names exactly. `data/stories/pa/kb_products.json` lists each product's documented features with
their MASTER line numbers.

## Assignment rule (Observed: MASTER Product Ecosystem Map §12, line 483)

Apply in order; the first that decides wins:

1. **component** — the story's Jira `components`, when a component is product-aligned. Component → product, from
   the KB's §12 table:
   Website → Event Website · Online Registration → Online Registration · Payments → Transactions & Purchasing ·
   Marketing → User Engagement · Networking → Networking & Interactions · Reporting → Organiser Analytics ·
   Floor Plan → Floor Plan · Lead Intelligence → Lead Intelligence · Sponsorship → Sponsorship ·
   Hosted Buyer Management → Hosted Buyer Management · Mobile App → Mobile App · Admin Interface → Admin / Platform Core ·
   Exhibitor Manual → Exhibitor Portal · Exhibitor Marketplace → Exhibitor Marketplace ·
   Online Meetings & Webinars / Schedule Management / Session & Speaker Management → Sessions & Speakers ·
   Membership Management → Community · Profile → Profile.
   **Curated Meeting** is ambiguous in the KB (Meetings & Matchmaking, Exhibitor Marketplace, Mobile App,
   Hosted Buyer Management): use it only together with rule 2 or 3 to pick among those four; default Meetings & Matchmaking.
   A component not in this list does not decide; go to rule 2.
2. **epic** — keywords in the parent epic's name that name a product or one of its documented features.
3. **summary** — the story's summary, and its `ai` text (s, pr, oc), matched to a product's documented features in
   `kb_products.json`.
4. **none** — Unassigned / Cross-cutting.

Mobile-only work (the story is about the native app) is Mobile App even when the feature belongs to another product;
name the other product in `evidence`.

**Content override (v2, 25 Sep 2026, owner decision).** A product-aligned component decides only when the story's
content is consistent with it. When the summary / `ai` text / epic clearly show the work belongs to a different
product (a mis-tagged component, e.g. "Kiosk Badge Export" tagged Session & Speaker Management), or to no product
(team chores, SLO definitions, test-coverage or tooling work → Unassigned / Cross-cutting), the content wins:
set `basis` to the rule that decided (epic / summary / none), write `overrides component <name>` in `evidence`,
and set confidence at most Medium. The **Admin Interface** component names a surface, not a product: work on another
product's admin settings (e.g. Meeting Formats → Meetings & Matchmaking, Lead Capture settings → Lead Intelligence,
New Client Manager → Client Manager) goes to that product. Genuine platform-core admin work stays Admin / Platform Core.

**Consistency choices (v2).** Speed Networking → Meetings & Matchmaking (KB 4.4 :7577; 4.13 :6727 noted).
Global / AI search ("Search Anatomy", Qdrant) → Exhibitor Marketplace "Search and Filters" (:11925) for user-facing
search, Unassigned / Cross-cutting for search infrastructure with no user-facing surface.
`kbRef` may cite `[MASTER <Product> product section :<line>]` when no documented feature matches.

## Output (one record per story)

```json
{"k": "EP-47792", "product": "Networking & Interactions", "domain": "Engagement & Matchmaking",
 "basis": "component" | "epic" | "summary" | "none",
 "evidence": "component Networking" | "epic 'Communication Channels — Email, Chat & Notifications' → Messenger" | "…",
 "kbRef": "[MASTER Networking & Interactions §4 Feature Inventory :6480]" | null,
 "confidence": "High" | "Medium" | "Low",
 "components": ["Networking"]}
```

`kbRef` cites the feature line in `kb_products.json` that the story matched (null for basis none). Confidence:
High = component decides, or an unambiguous feature match; Medium = epic or summary match with one plausible
product; Low = two products equally plausible (pick the one owning the user-facing surface, say so in evidence).
Never invent a product outside the table.
