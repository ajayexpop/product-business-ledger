# Worked examples

These are made-up entries, used to test the flow. The clients are "Client A" and "Client B" (not real customers). **The day rate, the allowances, the thresholds and the pickup lead below are illustrative placeholders, not agreed values** (see `10-open-decisions.md`). Example A is in `examples/entry.example.json`, and its log is in `examples/events.example.json`.

---

## A. A funded entry raised by Sales, end to end

### The request

A TAM logs, on behalf of Sales, that Client A will expand its contract by £100k if exhibitor lead retrieval supports offline badge scanning on the mobile app. Client A will pay £15k towards it and has agreed to an estimate of 20 days. `raisingLayer` = `sales`, so under `fs-funded-approver` **only Chris** can confirm the funding and sign the figure.

### Step by step

The **Current stage** column is what everyone sees on the ledger at that point.

| # | Date | Who (role) | Action | Status after | Current stage | What else the entry shows |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 28 Sep 2026 | TAM (requester) | Creates a draft. Fills the basics, problem, evidence, customers, user story and workaround. Lever: *increase revenue*, £100,000. Assumption: "Client A 2027 renewal adds the lead-retrieval module, per the 22 Sep call". Figure detail: the Pipedrive deal, stage *Proposal*, close Jan 2027, expansion. Funded: yes, £15,000, 20 days. Raised by: Chris | `draft` | 1 · Draft · waiting on TAM | Signer: **Chris** (funded, raised by Sales) · details 70% |
| 2 | 28 Sep | intake agent | Glossary: pass. Problem clarity: pass | `draft` | 1 · Draft · ready to log | |
| 3 | 28 Sep | TAM (requester) | Presses **Log**. `loggedBy` = TAM, `raisedBy` = Chris, id `LE-2026-0001` | `submitted` | 2 · Awaiting signature · waiting on Chris | |
| 4 | 29 Sep | Chris (sales) | Confirms the funding (deal ref, terms) and signs £100k. Chris raised it and Sales has one signer, so it is flagged `self-signed` | `signed` | 3 · Awaiting review · waiting on Ajay | Signed £100k · Funded ✓ (Chris) · *self-signed* |
| 5 | 1 Oct | Ajay (pe-ledger) | Weekly review. **Sends it back for details**: acceptance criteria are template placeholders, there is no success measure, and it does not say what is needed on the admin panel. Assigned to the TAM, due 6 Oct | `returned` | 3 · **Needs details** · waiting on TAM · due 6 Oct | 3 questions open · details 70% |
| 6 | 2 Oct | TAM (requester) | Answers all three: five acceptance criteria, success measure "Client A signs the expansion; zero lost scans at their March show", and the admin settings needed. Resubmits | `signed` (back to where it was) | 3 · Awaiting review · waiting on Ajay | Details 95%. The signature still holds (no signed value changed) |
| 7 | 2 Oct | Ajay (pe-ledger) | Review: quality pass, value pass. Note: "self-signed accepted: Chris is the only Sales signer" | `reviewed` | 4 · Awaiting estimate · waiting on Bartosz | |
| 8 | 5 Oct | Bartosz (pe-delivery) | Estimate: 24 person-days, Mobile team, confidence medium | `estimated` | 5 · Awaiting approval · waiting on Ajay | Build cost 24 × £400 = **£9,600** · Net **£90,400** · ⚠ *over agreed estimate (24 > 20)* |
| 9 | 6 Oct | Ajay (pe-ledger) | Approves to the ledger. Tier 2 (increase revenue + funded + confirmed + estimated) | `approved` | 6 · **On the ledger · not scheduled** · waiting on the meeting | Tier 2 · rank #3 |
| 10 | 12 Oct | Product-business meeting (Ajay records) | Picks it up: Mobile team, 2 FTE, EP-60001. The over-estimate is noted, and Sales will tell Client A | `picked-up` | 7 · Picked up · starts 19 Oct | Start **19 Oct** → due **10 Nov 2026** (baseline) |
| 11 | 20 Oct | Jira sync | EP-60001 first In progress | `in-delivery` | 8 · In delivery · due 10 Nov | Started 20 Oct (1 day after expected, within the grace period) |
| 12 | 27 Oct | Bartosz (pe-delivery) | Re-estimate: 28 person-days | `in-delivery` | 8 · In delivery · due 12 Nov | Build cost £11,200 · Net £88,800 · drift **+2 days** vs baseline |
| 13 | 12 Nov | Jira sync | EP-60001 Done, deployed | `delivered` | 9 · Delivered · check due · waiting on Chris | Check due at Client A's expansion date |
| 14 | 15 Jan 2027 | Chris answers, Ajay records | Expansion booked at £85,000 | `checked` | 10 · Done | Verdict: *partly* (85% < the illustrative 90% threshold) |
| 15 | 15 Jan 2027 | Ajay (pe-ledger) | Closes it | `closed` | 10 · Done | Chris's track record: 1 checked, 0 held, 1 partly |

### The date arithmetic in step 10

With illustrative parameters `fs-qa-allowance` = 3, `fs-release-allowance` = 2, `fs-pickup-lead` = 1, and one Mobile team entry already due Fri 16 Oct:

```
durationDays  = ceil(24 / 2) + 3 + 2           = 17 business days
teamFreeFrom  = business day after Fri 16 Oct  = Mon 19 Oct
expectedStart = max(Mon 12 Oct + 1 = Tue 13 Oct, Mon 19 Oct) = Mon 19 Oct 2026
expectedDue   = Mon 19 Oct + 17 − 1 business days          = Tue 10 Nov 2026
```

After the re-estimate in step 12: `ceil(28 / 2) + 3 + 2 = 19` business days, so the due date is Thu 12 Nov. The baseline stays at 10 Nov, and the drift is +2 business days.

---

## B. A funded entry that comes through Ajay

Client B tells Ajay directly, in a product call, that they will pay £30k for a custom registration export if it is built by March. They are an existing customer, with no Sales deal behind it yet.

| # | Who (role) | Action | Current stage | Note |
| --- | --- | --- | --- | --- |
| 1 | Ajay (requester, `raisingLayer` = `product-engineering`) | Logs it. Lever: *increase revenue*, £30,000. Funded: yes, contribution £30,000 | 2 · Awaiting signature · waiting on **Chris or Ajay** | Not raised by Sales or the relationship team, so `fs-funded-approver` allows either |
| 2 | Ajay (funding approver) | Confirms the funding and signs the figure | 3 · Awaiting review | Allowed. Flagged `self-signed`, because Ajay raised it, signed it and will approve it. The flag is shown at pickup |
| 3 | — | Review, estimate, approval as in example A | 6 · On the ledger · not scheduled | Tier 2 |

Had a TAM (`relationship`) or Sales raised the same request, only Chris could have confirmed it, and Ajay's sign button would not show.

---

## What the examples test

- `loggedBy` and `raisedBy` differ, and both are kept.
- The funding approver follows `raisingLayer`: Chris only for Sales and relationship entries, Chris or Ajay otherwise.
- The self-sign case is flagged, not hidden.
- **Sending back for details** keeps the entry at its stage and names who it is waiting on. Once answered, it returns to the same step, and the signature is not voided.
- The current stage is visible at every step, with who it is waiting on.
- The over-estimate on a funded entry is visible **before** pickup.
- Approval (step 9) carries no dates. Only pickup (step 10) does.
- A re-estimate moves the schedule but not the baseline.
- The check compares like with like (revenue booked vs revenue signed) and builds the signer's track record.
