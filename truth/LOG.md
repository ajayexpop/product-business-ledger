# Change log

Rules first, rebuild second, record third. Build runs are logged automatically in `state/runs.jsonl`; this file
records changes to rules, sources and the page.

| Date | Change | Why | By |
| --- | --- | --- | --- |
| 27 Sep 2026 | **Product Truth v1.** New folder `truth/`: one store (49 clients with 181 aliases, 127 outside organisations; 22 products with the 13 roadmap themes mapped by co-occurrence; 3,328 stories; 1,781 requests in 1,122 needs; 84 open client bugs, 39 incidents, 264 events, 18 promises), client and product signals, 15 gates, incremental fingerprinted build, and the hub page with a live Jira layer and on-page decisions | `future-plan.md`: stop building islands; one join everything reads from | Claude, for Ajay |
| 27 Sep 2026 | Client attention flags defined (show inside 56 days, Urgent or High bug, incident in 30 days, promise overdue / due soon / drifting, 10+ open asks, nothing delivered in 180 days, Planhat health 4 or lower). Level Act = show inside the window and 3+ flags; Watch = 2+ flags | Rule-based and explainable until the owner sets weights (D2, D3) | Claude |
| 27 Sep 2026 | Best signal defined per need: not built, a Tier 1 client asks, that client has open bugs in the same product, and a show inside the window | The plan's best signal, made computable | Claude |
| 27 Sep 2026 | Stories before 2026 placed on a product by Jira component (SPEC v2 rule 1 only, Medium) or by roadmap theme (Low), else Unassigned | Only 2026 stories carry a classified product; D4 decides whether to classify the rest | Claude |
| 27 Sep 2026 | Informa (82918) kept as a group parent, out of rankings | D1 default | Claude |
| 27 Sep 2026 | **Hub v2 after two QA agents** (visual QA: 1 critical, 6 high, 12 medium, 9 low; role walkthrough across CEO, CTO, Head of Engineering, Head of Product, PO, EM, CS). Role front door on Today (Leadership, Product, Engineering, Customer Success, with owner pick); new Shows view (next 4/8/13 weeks, bugs tied to each show, promises due before or after it) and Quality view (open client bugs with priority, team, product, show, age; incidents; load by team); team, owner and renewal filters; renewal chips and column; build-to-build change list (`changes` step, `state/changes.json`); glossary; shareable links to clients, products, needs and stories; plain wording (demand score, top priority, requests, shipped / open bugs / open needs); stale-data banner; contrast, scale, clipping and copy fixes | Every role needs an obvious place to start; the QA found the hub served CS and the CEO only | Claude, for Ajay |
| 27 Sep 2026 | Group parent and inactive clients left out of product rollups (who is asking) | D1 default applied consistently | Claude |
