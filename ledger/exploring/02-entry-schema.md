# Ledger entry: schema

One document per entry in a new shared-database collection, `ledger/<id>`. It follows the pattern the Requests (`pipeline`) collection already uses: current values in `v`, Jira columns in `j` (written by the sync, with no history), and history in `h`. The full event log sits alongside it in `ledger-events` (see `04-approvals-and-audit.md`).

**Required at** names the first status where the field must be filled. From that status on, the field can be changed but never emptied (the same rule as `pp-required`).

> **Change, 28 Sep 2026 (owner, `fs-log-minimum`, `fs-handoff`):** only five fields block logging: `raisedBy`, `title`, `client`, `productArea` ("Not sure" allowed) and `problem`. Every other field marked **S** below is now required at **G** (before signing): the entry logs as "Awaiting details" and cannot be signed until they are filled. Each of them can be handed to a named colleague (`handoff.<field> = {to, by, at}`), who fills it in from the entry. `intakeCheck` no longer fails for a missing lever at logging.

Stages: **S** Submitted · **G** Signed · **R** Reviewed · **E** Estimated · **A** Approved · **P** Picked up · **D** Delivered · **C** Checked.

## 1. Identity and logging (who logged it)

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `id` | text | `LE-YYYY-NNNN`, assigned when the entry is logged and never reused | system | S |
| `loggedBy` | person | The signed-in claude.ai profile that pressed **Log** (name + email). It cannot be typed in or edited | system | S |
| `loggedAt` | timestamp | UTC, set when the entry is logged | system | S |
| `raisedBy` | person | The person the request comes from, if someone else logs it for them (for example a TAM logging for Operations). Defaults to `loggedBy` | requester | S |
| `raisingLayer` | enum | `sales`, `relationship` (account management, customer success, TAMs acting for a client relationship), `operations`, `product-engineering`, `other`. It never changes the lever (model: "the function raising the entry does not change the lever"). It **does** decide who approves a funded entry (`fs-funded-approver`, section 3) | requester | S |
| `source` | enum + ref | `intake-form`, `fis` (+ page id), `jira-fr` (+ EP key), `meeting` (+ date). Links the entry back to the Requests DB (`requests/db/items.json`) when it came from there | requester | S |

## 2. Intake basics (today's intake fields)

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `title` | text ≤ 90 | The feature name | requester | S |
| `client` | client or `Platform` | The ledger company it is for, or Platform. Joins on the ledger's client list, like `driver` on Requests | requester | S |
| `productArea` | enum | KB product and area, using the product-area classification (`data/stories/pa/SPEC.md`) | requester | S |
| `problem` | long text | The problem statement: what is wrong today, for whom | requester | S |
| `evidence` | long text + links | Tickets, calls, emails, data behind the problem | requester | S |
| `neededBy` | month or date | When the customer needs it, if they need it by a set time. Optional | requester | — |
| `intakeCheck` | object | `{glossary: pass/fail, problemClarity: pass/fail, notes, at, by}`. Written by the intake agent. Both must pass before the entry can be Submitted | intake agent | S |

## 2a. Detail (as much as the requester can give)

The owner's rule: as much detail as possible. The fields below take the Jira Feature Request intake form (`requests/SPEC.md`, `request.*`) and the FIS template, and add what the value, pickup and check steps need later. Fields marked **S** block logging. The others do not block, but each one counts towards `completeness` (section 7), and Ajay can send the entry back for any of them (`03-lifecycle.md`, T6).

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `customers[]` | list | Every customer asking for it: ledger company, Sales Tier (joined from the ledger), contact person at the customer, and how they asked (call, email, ticket, QBR). One entry for Platform-wide requests | requester | S (at least one) |
| `whoFor` | multi-select | The users affected: organiser admin, exhibitor, visitor/attendee, speaker, sponsor, internal (TAM, support, finance) | requester | S |
| `userStory` | text | "As a …, I want …, so that …" | requester | S |
| `currentWorkaround` | long text | How it is handled today, and what that costs (manual steps, who does them, how often) | requester | S |
| `differsFromToday` | long text | What changes compared with today's product | requester | R |
| `userJourneyImpact` | long text | Where in the journey it sits, and what happens before and after it | requester | R |
| `surfaces` | multi-select + notes | Admin panel, web frontend, mobile app, API, reports/statistics: what is needed on each (the intake form's `adminInterface`, `frontendInterface`, `appInterface`, `api`, `statistic`) | requester | R |
| `acceptanceCriteria[]` | list | Numbered, testable statements. Template placeholders ("1 … 2 …") do not count | requester | R |
| `successMeasure` | text | How we will know it worked. It feeds the post-delivery check (`07-post-delivery-check.md`) | requester | R |
| `eventsImpacted[]` | list | Event names and dates it is needed for (from the ledger's event radar where known) | requester | — |
| `urgencyReason` | text | Why `neededBy` is that date: a contract clause, an event date, a renewal | requester | with `neededBy` |
| `attachments[]` | files / links | Screenshots, mock-ups, recordings, call notes, emails | requester | — |
| `related[]` | links | Related EP keys, FIS pages, Requests DB ids, demand cluster (`intel/db/clusters.json`), and possible duplicates the form suggests | requester, P&E | — |
| `dependencies` | text | Other features, integrations or third parties it relies on | requester, P&E | R |
| `risks` | text | Compliance, security, data protection (GDPR), performance, or other risks the requester knows of | requester | — |
| `alternativesConsidered` | text | Existing features or configuration that were ruled out, and why | requester | — |

## 3. Value (the lever and its figure)

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `lever` | enum | `increase-revenue`, `retain-revenue`, `reduce-cost`, `avoid-cost`. Exactly one | requester | S |
| `figureGBP` | number | The £ amount, stated over the figure horizon (see `fs-figure-horizon`). Always positive: the lever supplies the direction | requester | S |
| `figureBasis` | object | Revenue levers: `{kind: "revenue"}`. Cost levers: `{kind: "hours", hours, rateGBP, rateSource}`, with `figureGBP = hours × rateGBP` computed and not typed | requester | S |
| `figureText` | text | The figure as the requester says it, for example "100 hours = £20k of TAM time" | requester | S |
| `assumption` | text, one line | What the figure rests on: which customer, which contract, how many hours per event | requester | S |
| `figureDetail` | object | The working behind the figure, by lever. **Increase revenue:** deal or opportunity ref (Pipedrive), deal stage, expected close date, new or expansion. **Retain revenue:** contract value, renewal date, churn signal and where it came from. **Reduce / avoid cost:** hours per event × events per year (or incidents per year × hours each), who spends the hours (team, role), and where the count comes from | requester | S (the lever's part) |
| `signer` | person | Who must sign, derived from the lever and, for funded entries, from `raisingLayer` (see `fs-signer`, `fs-funded-approver`). Shown on the entry from the moment it is logged | system | S |
| `signature` | signature | `{by, role, at, figureGBP, lever, assumptionHash}`. The figure exactly as signed. It is void if any of the three change | lever owner | G |
| `funded` | object | `{yes: false}` or `{yes: true, contributionGBP, agreedEstimateDays, dealRef, termsNote, paymentTerms, contributionStatus: proposed / agreed / invoiced / paid}` | requester proposes, the funding approver confirms | S (yes/no) |
| `fundedConfirmation` | signature | The **funding approver** confirms the deal and its terms (`fs-funded-approver`). Required only when `funded.yes`. See the rule below | Chris, or Chris / Ajay | G |
| `existingGrowing` | object | `{yes: false}` or `{yes: true, currentARRGBP, growthGBP, sizingNote}` | requester proposes, Sales sizes | S (yes/no) |
| `growthSizing` | signature | Sales (Chris) sizes the growth. Required only when `existingGrowing.yes` | Sales | G |

### Who approves a funded entry (`fs-funded-approver`)

A funded feature can come through any route, not only Sales. Who confirms it depends on who raised it:

| `raisingLayer` | Funding approver | Also signs the figure when the lever is revenue |
| --- | --- | --- |
| `sales` or `relationship` | **Chris** only | yes, Chris |
| anything else (for example raised by Ajay or through Product & Engineering, Operations, or a customer asking directly) | **Chris or Ajay**, whichever takes it | yes, the same person who confirms the funding |

So a funded entry keeps exactly one figure signature, and the person who confirms the funding is the person who signs it. A non-funded entry follows `fs-signer` as before (Chris for revenue, Susan / Ilaria for operations hours). When Ajay both raises and approves a funded entry, that is allowed. It is flagged `self-signed` on the entry and shown at pickup (`fs-no-self-sign`).

## 4. Review, cost and rank (Product & Engineering)

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `review` | object | `{quality: pass/fail, value: pass/fail, notes, at, by, weekOf}`. From the weekly review | P&E (Ajay) | R |
| `estimate` | object | `{effortDays, team, confidence: low/medium/high, method, at, by}`. The engineering estimate in person-days | P&E (Bartosz) | E |
| `buildCostGBP` | number | `effortDays × day rate` (`fs-day-rate`). Computed, not typed. For a funded entry the agreed estimate is shown next to it, and a gap is flagged | system | E |
| `netValueGBP` | number | `figureGBP − buildCostGBP`. Can be negative, and a negative value is shown in red | system | E |
| `tier` | 1–4 | Derived (see `05-ranking.md`). Tier 1 only through `mustHave` | system | A |
| `mustHave` | object | `{yes: true, meetingDate, minuteRef}`: agreed at a product-business meeting | P&E (Ajay) records it | — |
| `rank` | integer | Position within the whole ledger, recomputed on every change | system | A |
| `approval` | signature | Approve to ledger: `{by, at, tier, netValueGBP}` | P&E (Ajay) | A |

## 5. Delivery (only after the pickup decision)

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `pickup` | object | `{decidedAt, meetingDate, decidedBy[], recordedBy, team, allocationFTE, jiraKey, dependsOn[]}` | the meeting, recorded by Ajay | P |
| `schedule` | object | `{expectedStart, expectedDue, basis, derivedAt}`. Derived from the estimate (see `06-pickup-and-scheduling.md`) | system, confirmed by Bartosz | P |
| `baseline` | object | The first `schedule` at pickup, frozen. Every later re-plan is compared to it (drift) | system | P |
| `startedAt` | date | The first move to In progress in Jira (the flow clock start, `fl-clock-start`) | Jira sync | — |
| `deliveredAt` | date | The deploy date: Jira Done or release date | Jira sync / Bartosz | D |

## 6. Post-delivery check

| Field | Type | What goes in | Provided by | Required at |
| --- | --- | --- | --- | --- |
| `check` | object | `{dueAt, actualGBP, verdict: held / partly / did-not-hold / too-early, evidence, answeredBy, at}` | the signer answers, Ajay records | C |

## 7. Status and current stage

| Field | Type | What goes in |
| --- | --- | --- |
| `status` | enum | `draft`, `submitted`, `returned`, `signed`, `reviewed`, `estimated`, `approved`, `parked`, `picked-up`, `in-delivery`, `delivered`, `checked`, `closed`, `rejected`, `withdrawn`, `merged` |
| `stage` | object | **The current stage, shown to everyone on every view** (`fs-stage`): `{label, step: n of 10, waitingOn: {name, role}, nextAction, since, daysInStage, overdue}`. Derived from `status` and the latest event, never typed. For example "Awaiting estimate · step 4 of 10 · waiting on Bartosz · 3 days" |
| `statusReason` | text | Required for `returned`, `parked`, `rejected`, `withdrawn` and `merged` |
| `infoRequest` | object | Set when Ajay (or a signer) sends the entry back for details: `{requestedBy, at, assignedTo, dueBy, items: [{field, question, answer, answeredAt}], note}`. `assignedTo` is the requester (`raisedBy`, or `loggedBy` if different and chosen) |
| `returnedFrom` | status | The status the entry was in when it was sent back. When every item is answered and it is resubmitted, it goes back **to that stage**, not to the start, unless a signed value changed (`fs-void-on-change`) |
| `completeness` | object | `{score: 0–100, missing: [field]}`. The share of the section 2a and 3 fields filled. Recomputed on every save and shown next to the stage, so gaps are visible before anyone has to ask |
| `mergedInto` | entry id | Only when `merged` |
| `parkedUntil` | date | Only when `parked`: the date it comes back to the weekly review |

## Validation (checked on every save)

- Exactly one lever. `figureGBP` is greater than 0. `assumption` is one line (same limit as `pp-why-one-line`).
- A cost lever needs `hours` and `rateGBP`, and `figureGBP` must equal their product.
- `signature` is valid only while `lever`, `figureGBP` and the hash of `assumption` equal the signed values.
- `funded.yes` needs `contributionGBP`, `agreedEstimateDays` and `fundedConfirmation` before tier 2 applies.
- `fundedConfirmation.by` must be allowed by `fs-funded-approver` for the entry's `raisingLayer`: only Chris when it is `sales` or `relationship`, and Chris or Ajay otherwise.
- A return for details (`infoRequest`) needs at least one item, each naming a field and asking a question. Resubmitting needs every item answered.
- `status` changes only through the transitions in `03-lifecycle.md`, and each one writes an event.
- `loggedBy`, `loggedAt`, `id` and every signature are write-once. A correction is a new event, never an edit.
