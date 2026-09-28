# Lifecycle: statuses and transitions

An entry moves only along the transitions below. Each transition writes one event to the audit ledger (`04-approvals-and-audit.md`) with who, when, the role they acted in, and the reason where one is required. A transition that is not in this table is refused.

## Statuses

Every logged entry is visible to everyone on the ledger, with its **current stage** (below). The last column says whether it is also in the *ranked* part.

| Status | Meaning | In the ranked part? |
| --- | --- | --- |
| `draft` | Being written. Visible only to its author and to P&E | no |
| `submitted` | Logged. The intake check passed, and it waits for the lever owner's signature | no (listed under *Awaiting signature*) |
| `returned` | **Needs details.** Sent back to the requester with the fields that are missing and a question for each (`infoRequest`). It waits for their answers, and is shown at the step it came from | no (or greyed in place, if it came from `approved` or `parked`) |
| `signed` | The figure is signed (plus any funded or growth confirmation). It waits for the weekly review | no (*Awaiting review*) |
| `reviewed` | Quality and value passed at the weekly review. It waits for a build-cost estimate | no (*Awaiting estimate*) |
| `estimated` | Build cost and net value are known. It waits for approval to the ledger | no (*Awaiting approval*) |
| `approved` | **On the ranked ledger.** Valid, signed, costed and ranked. **Not a commitment to build** | **yes** |
| `parked` | Approved, but the business chose "not now" with a date to look again | yes (greyed, below its tier) |
| `picked-up` | The product-business meeting decided to build it. It has a team, an expected start and an expected due date | yes (*In plan*) |
| `in-delivery` | Work has started (the first Jira In progress) | yes (*In plan*) |
| `delivered` | Deployed. The post-delivery check is scheduled | yes (*Delivered*) |
| `checked` | The figure was compared with the outcome | archive |
| `closed` | Nothing more to do | archive |
| `rejected` | Will not be built, with a reason. Terminal | archive |
| `withdrawn` | The requester took it back. Terminal | archive |
| `merged` | A duplicate, folded into another entry (`mergedInto`). Terminal. Its signer and figure are kept on the surviving entry's history | archive |

## Transitions

| # | From → to | Who may do it | Needs | Event `k` |
| --- | --- | --- | --- | --- |
| T1 | *(none)* → `draft` | any signed-in person | a title | `create` |
| T2 | `draft` → `submitted` | the author | every field required at **S**, and `intakeCheck` passed on glossary and problem clarity | `log` |
| T3 | `submitted` → `signed` | the lever owner (`fs-signer`). For a funded entry, the funding approver (`fs-funded-approver`): Chris if raised by Sales or the relationship team, otherwise Chris or Ajay | the signature. Plus `fundedConfirmation` if funded, and `growthSizing` if existing and growing | `sign` |
| T4 | `submitted` → `returned` | the lever owner or funding approver | an `infoRequest` saying what the figure needs (the figure is not supportable as stated) | `decline-sign` |
| T5 | `signed` → `reviewed` | P&E (Ajay) at the weekly review | `review.quality = pass` and `review.value = pass` | `review` |
| T6 | `submitted` / `signed` / `reviewed` / `estimated` / `approved` / `parked` → `returned` | P&E (Ajay), at any time, not only at the weekly review | an `infoRequest`: at least one missing field with a question, assigned to the requester, with a due date (`fs-info-due`). Quality or value failing at review is also sent back this way | `return` |
| T7 | `reviewed` → `estimated` | P&E (Bartosz) | `estimate.effortDays`, `team` and `confidence` | `estimate` |
| T8 | `estimated` → `approved` | P&E (Ajay) | tier and net value computed. **This is approval to the ledger, not to build** | `approve` |
| T9 | `estimated` / `approved` → `rejected` | P&E (Ajay), or the meeting | a reason. The signer is told | `reject` |
| T10 | `approved` → `parked` | the product-business meeting, recorded by Ajay | `parkedUntil` and a reason | `park` |
| T11 | `parked` → `approved` | automatic on `parkedUntil`, or Ajay | none | `unpark` |
| T12 | `approved` → `picked-up` | **the product-business meeting**, recorded by Ajay, dates confirmed by Bartosz | `pickup` (meeting date, team, allocation), with `schedule` derived and `baseline` frozen | `pickup` |
| T13 | `picked-up` → `in-delivery` | Jira sync | the first Jira In progress on `pickup.jiraKey` | `start` |
| T14 | `in-delivery` → `delivered` | Jira sync, or Bartosz | a deploy date | `deliver` |
| T15 | `delivered` → `checked` | Ajay records the signer's answer | `check.verdict` and `check.actualGBP`, or the `too-early` verdict with a new due date | `check` |
| T16 | `checked` → `closed` | Ajay | none | `close` |
| T17 | `returned` → `returnedFrom` (the stage it was sent back from) | the requester it is assigned to, or the author | every `infoRequest` item answered, and the intake check passed again. If a signed value changed in the answers, it goes to `submitted` instead (`fs-void-on-change`) | `resubmit` |
| T17a | `returned` → `returned` | Ajay | a follow-up question added to the same `infoRequest` (the answers were not enough) | `return` |
| T18 | `draft` / `submitted` / `returned` / `signed` → `withdrawn` | the author, or `raisedBy` | a reason | `withdraw` |
| T19 | any status before `picked-up` → `merged` | P&E (Ajay) | `mergedInto` | `merge` |
| T20 | `picked-up` / `in-delivery` → `approved` | the meeting, recorded by Ajay | a reason. The pickup is withdrawn and the `schedule` is kept in history | `unpick` |

## Current stage (`fs-stage`)

The ledger shows every entry's **current stage** as a column and as a progress bar on the entry, so anyone can see where a feature is and who it is waiting on. The stage is derived from `status` and the latest event, never typed.

| Step | Stage label | Statuses | Waiting on | Next action |
| --- | --- | --- | --- | --- |
| 1 | Draft | `draft` | the author | finish and log |
| 2 | Awaiting signature | `submitted` | the signer (`fs-signer` / `fs-funded-approver`) | sign the figure, confirm funding or growth |
| 3 | Awaiting review | `signed` | Ajay | weekly review of quality and value |
| 4 | Awaiting estimate | `reviewed` | Bartosz | estimate build effort |
| 5 | Awaiting approval | `estimated` | Ajay | approve to the ledger |
| 6 | On the ledger · not scheduled | `approved`, `parked` | the product-business meeting | pick up, park or reject |
| 7 | Picked up · scheduled | `picked-up` | the delivery team | start work (expected start shown) |
| 8 | In delivery | `in-delivery` | the delivery team | deliver (expected due shown) |
| 9 | Delivered · check due | `delivered` | the signer | answer the post-delivery check |
| 10 | Done | `checked`, `closed` | nobody | none |
| — | **Needs details** | `returned` | the requester it is assigned to | answer the questions. Shown at the step it came from, e.g. "Step 5 · Needs details · waiting on (requester) · due 9 Oct" |
| — | Stopped | `rejected`, `withdrawn`, `merged` | nobody | none (the reason is shown) |

Each stage shows **days in stage**. A stage turns amber, then red, when it passes its limit (`fs-stage-limits`, e.g. 10 business days in *Awaiting review*), or when a *Needs details* request passes its due date. The person it is waiting on sees it in **Awaiting me**.

## Re-entry rules (what sends an entry back)

| Change | Effect |
| --- | --- |
| `lever`, `figureGBP` or `assumption` changes at any status from `signed` on | The signature is void. The entry goes back to `submitted` (`void-sign`). Review, estimate and approval are kept but marked *stale*, and are re-confirmed on the way through |
| `funded` or `existingGrowing` terms change | The matching confirmation is void and the tier is re-derived. The entry stays in its status but shows *confirmation needed* until the funding approver (or Sales, for growth) re-confirms |
| `estimate.effortDays` changes after `estimated` | `buildCostGBP`, `netValueGBP` and `rank` are recomputed (`re-estimate`). If the entry is already picked up, `schedule` is re-derived and drift against `baseline` is shown. It is not re-approved |
| `problem` or `evidence` changes after `reviewed` | `review` is marked *stale*. The next weekly review re-confirms it. The status does not change |

## What "approval" means (said once, plainly)

`approved` means: *this entry is a valid, signed, costed item and this is where it ranks.* It gives no date, no team and no promise to the customer. The only status that carries a date is `picked-up`, and only the product-business meeting can set it. The page shows this distinction in words on every approved entry: **"On the ledger · not scheduled"**.
