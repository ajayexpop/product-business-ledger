# Feature Scoring Model: ledger entry flow (exploring)

**Status:** proposal, awaiting owner approval. Nothing here is on the live ledger yet.
**Source:** "Feature Scoring Model", 25 Sep 2026, Ajay Singh (copied into `01-scoring-model.md`).
**Written:** 27 Sep 2026.

Every new feature request becomes a **ledger entry**: one value lever, one £ figure signed by the layer that owns it, a build cost, and a net value. This folder describes the whole flow, from the moment someone logs a request to the check after it ships. It also covers the audit ledger of who logged, signed, approved and decided what.

Six rules underlie the whole flow:

1. **Every action is recorded.** Who logged the entry, who signed the figure, who approved it and who decided to pick it up. Each is an event with a name, a role, a time and the values before and after. Nothing is overwritten without a trace.
2. **Approval is not pickup.** An approved entry is a valid, signed, estimated and ranked item on the ledger. It is **not** a commitment to build. Pickup is a separate, later decision made at the product-business meeting. Only that decision sets the status *Picked up for delivery*, along with an expected start and due date taken from the estimate.
3. **One figure, one signature.** Changing the lever, the figure or the assumption voids the signature, and the entry goes back to be signed again.
4. **Who approves a funded entry depends on who raised it.** If Sales or the relationship team raised it, only Chris can approve it. If it came any other way (for example through Ajay), Chris or Ajay can (`fs-funded-approver`).
5. **Everyone sees the current stage.** Every entry shows its step (1 to 10), who it is waiting on and how long it has been there (`fs-stage`). Ajay can send an entry back to the requester for missing details at any stage before pickup. It then shows as *Needs details*, and returns to the same step once answered (`fs-return-for-info`).
6. **As much detail as possible.** The entry carries the full intake form plus the working behind the figure. A details % names what is missing (`fs-completeness`).

## Reading order

| File | What it settles |
| --- | --- |
| `01-scoring-model.md` | The model as agreed on 25 Sep 2026: levers, modifiers, tiers, owners |
| `02-entry-schema.md` | Every field on an entry (identity, full detail, value working, funding approver, current stage, details requests): type, who provides it, the stage it becomes required |
| `03-lifecycle.md` | The statuses, the 10-step current stage, every allowed transition (including send back for details), who may make it and what it needs |
| `04-approvals-and-audit.md` | The signatures and approvals, what voids them, and the append-only event log (who logged what) |
| `05-ranking.md` | Tier assignment, net value, tie-breaks and the ranked view |
| `06-pickup-and-scheduling.md` | The pickup decision, and how expected start and due dates come from the estimate |
| `07-post-delivery-check.md` | Checking the figure against what happened |
| `08-worked-example.md` | A Sales-raised funded entry end to end (including a send-back for details), and a funded entry that came through Ajay |
| `09-integration-plan.md` | How this becomes part of the Internal Product Business Ledger once approved |
| `10-open-decisions.md` | What the owner has to decide before it goes live |
| `rules.proposed.json` | The `fs-*` rules in the registry format of `live/logic.json`, ready to merge |
| `examples/entry.example.json` | The worked example as a database document |
| `examples/events.example.json` | Its event log |

## The flow on one page

```
 Requester            Lever owner              Product & Engineering                  Product-business meeting
 ─────────            ───────────              ─────────────────────                  ────────────────────────
 Draft
   │ log (intake check: glossary, problem clarity)
 Submitted ─────────► Sign figure  ─ decline ─► Needs details ─► (requester answers) ─► back to same step
                      (funded: Chris if raised by Sales/relationship, else Chris or Ajay;
                       growth sizing by Sales)
                        │
                      Signed ───────────────► Weekly review (quality, value) ─ gaps ─► Needs details
                                              (Ajay can send back for details at any step up to Approved)
                                                │
                                              Reviewed ─► Build-cost estimate (Bartosz)
                                                │
                                              Estimated ─► Approve to ledger (Ajay): tier, net value, rank
                                                │
                                              Approved ════ NOT a commitment ═══════► Pick up for delivery
                                                                                        (team, start, due)
                                                                                           │
                                              In delivery ◄── Jira first In progress ──────┘
                                                │
                                              Delivered (deployed)
                                                │
                                              Checked (figure vs outcome, answered by the signer)
                                                │
                                              Closed

 Every entry shows its current stage (step 1–10, waiting on, days) to everyone.
 Side exits: Needs details (any stage before pickup), Parked (Approved, not now, review date),
             Rejected (with reason), Withdrawn (by requester), Merged (duplicate of another entry)
```

## What happens on approval

When the owner approves this folder, `09-integration-plan.md` is carried out in order. The rules go into `live/logic.json` first, then the schema and the page are rebuilt, and the change-log row is added to `docs/methods-runbook.md`. The folder then stays as the design record, and the rules in the registry take over as the source of truth.
