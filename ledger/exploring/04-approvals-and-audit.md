# Approvals and the audit ledger

Two things together: the **signatures** an entry must collect, and the **event log** that records every action, so anyone can see who logged, signed, approved and decided what.

## 1. Signatures and approvals

| # | Signature | Who | When it is needed | What it attests | Voided by |
| --- | --- | --- | --- | --- | --- |
| 1 | **Logged** | the signed-in author (`loggedBy`) | always | "I raised this, and the intake basics are true to my knowledge" | never (write-once) |
| 2 | **Figure signed** | the lever owner (`fs-signer`): Sales (Chris) for revenue levers, or for a funded entry the funding approver, who signs both; Operations (Susan or Ilaria) for cost levers; P&E (Bartosz or Ajay) for the engineering hours on an engineering-raised cost entry | always | "I own this figure and will answer for it at the post-delivery check" | a change to `lever`, `figureGBP` or `assumption` |
| 3 | **Funded confirmed** | the funding approver (`fs-funded-approver`): **Chris** when raised by Sales or the relationship team; **Chris or Ajay** when raised any other way | `funded.yes` | "The deal exists. The contribution and the agreed estimate are as stated" | a change to the funded terms |
| 4 | **Growth sized** | Sales (Chris) | `existingGrowing.yes` | "We already earn this, and it will grow by this much" | a change to the growth terms |
| 5a | **Details requested** | P&E (Ajay), or the signer at T4 | whenever details are missing | "This entry cannot move on until these questions are answered". Assigned to the requester with a due date. Not a signature: it records who is holding the entry and why | answered and resubmitted |
| 5 | **Reviewed** | P&E (Ajay) | always | "Quality and value pass" | a change to the problem or evidence (marked stale, not void) |
| 6 | **Estimated** | P&E (Bartosz) | always | "This is the build effort, at this confidence" | a re-estimate (replaced, and the old one kept in history) |
| 7 | **Approved to ledger** | P&E (Ajay) | always | "Valid and ranked." **Not a commitment** | the figure signature being voided |
| 8 | **Picked up** | the product-business meeting (named attendees), recorded by Ajay, dates confirmed by Bartosz | to build | "We will build this, with this team, from this start to this due date" | an unpick (T20) |
| 9 | **Checked** | the figure's signer answers, Ajay records | after deploy | "The figure held / partly held / did not hold" | never |

**Exactly one figure signature** (model: "every figure carries exactly one signature"). Signatures 3 and 4 are confirmations of modifiers, not a second signature on the figure.

**Nobody signs their own figure** (proposed, `fs-no-self-sign`). If the lever owner also raised the entry, the other named owner of that layer signs: Susan for Ilaria and the other way round, or Ajay for Bartosz and the other way round. Sales has one signer (Chris), so an entry Chris raises is signed by Chris and flagged `self-signed` for the weekly review to see. When a funded entry does not come from Sales or the relationship team, Ajay may confirm the funding and sign its figure, including when Ajay raised it (owner instruction, 27 Sep 2026). That case is allowed, flagged `self-signed`, and shown at pickup so the meeting sees it. See `10-open-decisions.md` D3.

A signature stores the values it signed: `{by, role, at, lever, figureGBP, assumptionHash}`. Its validity is checked by comparing those values, not by trusting a flag.

## 2. The audit ledger (event log)

Every action writes one **event**. Events are append-only: never edited, never deleted. A mistake is corrected with a new event that points to the one it corrects.

Storage: a shared-database collection `ledger-events`, one document per entry (`ledger-events/<entryId>`), with events keyed by id, as the Requests `h` map is today. The entry document also carries a short `h` digest of field changes, so the page can show history without a second read. Both are written in the same update (the `pp-history` rule).

### Event record

| Field | What goes in |
| --- | --- |
| `id` | `e<unix-ms>-<4 random>`, unique |
| `at` | UTC timestamp |
| `by` | `{name, email}` from the signed-in claude.ai profile (the `user` capability). `claude` for automated writes, with the human who asked in `onBehalfOf` |
| `role` | the capacity they acted in: `requester`, `sales`, `operations`, `pe-ledger`, `pe-delivery`, `meeting`, `jira-sync`, `intake-agent` |
| `k` | the kind: the transition's `k` from `03-lifecycle.md`, or `edit`, `void-sign`, `re-estimate`, `correct`, `comment` |
| `from` / `to` | the status before and after, for a transition |
| `changes` | `[{f, from, to}]` for field edits |
| `infoRequest` | for `return` and `decline-sign`: the items (field, question), `assignedTo` and `dueBy`. For `resubmit`: the answers |
| `reason` | required for `decline-sign`, `return`, `reject`, `park`, `withdraw`, `merge`, `unpick` and `correct` |
| `meeting` | `{date, minuteRef, attendees[]}` for any event decided at the product-business meeting |
| `corrects` | the event id this one corrects, for `correct` |
| `b` | the batch id when several events come from one action (as in the Requests history) |

### What the log answers

| Question | How it is read |
| --- | --- |
| Who logged this, and when? | the `log` event (and `raisedBy` if someone logged it for another person) |
| Who owns the figure? | the latest `sign` event not followed by a `void-sign` |
| Has anyone signed a figure that later changed? | `void-sign` events, with the `changes` that caused them |
| Who approved it, and did they commit to build? | `approve` (ledger only) versus `pickup` (the build decision, with the meeting) |
| When did the dates move, and why? | `re-estimate` and `pickup` events, and `schedule` versus `baseline` |
| Where is it now, and who has it? | the current stage (`fs-stage`), from the latest event: step, waiting on, days in stage |
| Why was it sent back, and was it answered? | `return` events with their `infoRequest`, then the `resubmit` with the answers |
| Did the figure hold? | the `check` event, grouped by signer across all entries: a **signer track record** |

### Views over the log

- **Entry history:** every event on one entry, newest first, in plain words ("Chris signed £100k for *increase revenue* on 30 Sep").
- **Logged by:** entries grouped by `loggedBy`, with counts by status. Shows who raises what and how much of it gets through.
- **Needs details:** every returned entry, who it is assigned to, what is asked and when it is due. Requesters see their own at the top of the page.
- **Awaiting me:** for a signed-in person, the entries whose next transition is theirs (to sign, review, estimate, approve or check).
- **Signer track record:** per signer, how many checked figures held, partly held or did not hold, and the sum of signed £ against actual £.
- **Meeting record:** every pickup, park, reject and unpick decided at one product-business meeting, and who attended.

## 3. Permissions (who can press what)

Permissions follow the named owners in `rules.proposed.json` (`fs-owners`). They are rules in the registry, not code, so a change of owner is a Logic save with its own history.

| Action | Allowed |
| --- | --- |
| create / edit own draft / log / resubmit / withdraw | any signed-in ExpoPlatform user |
| sign a revenue figure, size growth | Sales owners (`fs-owners.sales`) |
| confirm a funded entry and sign its figure | Sales owners when `raisingLayer` is `sales` or `relationship`; Sales owners or P&E ledger (`fs-owners.pe-ledger`) otherwise (`fs-funded-approver`) |
| sign a cost figure | Operations owners (`fs-owners.operations`); P&E (`fs-owners.pe-delivery` or `pe-ledger`) for engineering hours |
| review, **return for details (assign back to the requester)**, approve, reject, merge, record a meeting decision, record a check | P&E ledger (`fs-owners.pe-ledger`) |
| answer a details request and resubmit | the requester it is assigned to, or the author |
| estimate, confirm schedule dates | P&E delivery (`fs-owners.pe-delivery`) |
| read everything, including the whole log | anyone signed in. Not signed in: read-only, as the Requests tab works today |
