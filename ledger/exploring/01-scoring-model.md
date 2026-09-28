# Feature Scoring Model (source, 25 Sep 2026)

Author: Ajay Singh. This is the model as written. The rest of the folder turns it into a flow. Where this file and a later file seem to disagree, this file wins, and the later file is corrected.

Every feature request becomes a ledger entry with one value lever, a £ figure signed by the layer that owns it, and its build cost. The ledger ranks by net value within four tiers. Three layers own the flow: Sales, Operations, and Product & Engineering.

## Value levers

The four levers replace the opportunity score (frequency, business impact, urgency, sponsor multiplier). Every request picks one lever and states a figure in £.

| Lever | The question the entry answers | Figure to state (£) | Signed by |
| --- | --- | --- | --- |
| Increase revenue | New or expansion revenue: by how much? | Revenue gained | Sales (Chris) |
| Retain revenue | How much revenue is at risk of churn if we do not do it? | Contract value at risk | Sales (Chris) |
| Reduce cost | Time we spend today that goes away | Hours saved × rate | Operations (Susan / Ilaria) |
| Avoid cost | Mistakes, incidents or rework we stop paying for | Hours avoided × rate | Operations (Susan / Ilaria) |

Two modifiers sit on top of the lever:

- **Funded:** the customer pays a contribution and the estimate is known. Sales (Chris) confirms the deal and its terms. *Increase revenue* plus *funded* is the top of the ledger.
- **Existing and growing:** revenue we already receive and will increase ranks above revenue we only anticipate. Sales (Chris) sizes it.

The function that raises the entry does not change the lever. An engineering refactor is scored as reduced or avoided cost, like any operations entry. Product & Engineering (Bartosz / Ajay) signs the engineering hours.

## What a ledger entry carries

An entry joins the ledger once it carries the intake basics plus the value fields below.

| Field | What goes in | Who provides it |
| --- | --- | --- |
| Basics, problem statement, evidence | Today's intake fields. They must pass the glossary and problem-clarity check | Requester |
| Value lever | One of: increase revenue, retain revenue, reduce cost, avoid cost | Requester |
| Figure (£) | The amount, e.g. "+£100k" or "100 hours = £20k of TAM time" | Requester |
| Assumption | One line on what the figure rests on: which customer, which contract, how many hours per event | Requester |
| Signed by | The owner of the figure: Sales (Chris) for revenue, Operations (Susan / Ilaria) for hours | Named on the entry |
| Funded | Yes or no. If yes, the customer contribution and the agreed estimate | Sales (Chris) |
| Build cost | The engineering estimate, added at estimation | Product & Engineering (Bartosz / Ajay) |

**Net value = figure − build cost.** A feature worth £20k that costs £50k to build shows up as such before it is queued, not after.

## How the ledger is ranked

The ledger has four tiers. Within a tier, entries rank by net value.

1. **Must-have ledger:** the items already agreed at the product-business meeting. They are built first, and nothing outside the two ledgers is entertained.
2. **Funded and increases revenue:** the customer pays, and the estimate is known.
3. **Existing revenue that will grow:** customers we already earn from who will expand.
4. **Everything else**, by net value (figure − build cost).

After deploy, the figure is checked against what happened, so whoever attached it sees whether it held. The business settles competing priorities between tiers at the product-business meeting, not the figure alone.

## How a request flows

The layer that owns the lever signs the figure before an entry is logged. Product & Engineering reviews quality, value and build cost, ranks the ledger, builds after the must-haves, and checks the figure after deploy.

## Who owns what

Three layers own the ledger and the flow, and every figure carries exactly one signature.

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Sales | Chris | Signs every revenue figure: revenue gained from a win or expansion, contract value at risk of churn, and the terms of funded entries. Answers for those figures at the post-delivery check |
| Operations | Susan / Ilaria | Raise operational entries through intake. Confirm the hours and the rate behind every reduce-cost and avoid-cost figure. Keep the intake agent aligned with these definitions |
| Product & Engineering | Bartosz / Ajay | Own the ledger: the weekly review of quality and value, build-cost estimates, net value and ranking, the must-have ledger, delivery order and the post-delivery check. Ajay covers the ledger, review and ranking; Bartosz covers estimates and delivery |

## Amendments by the owner (27 Sep 2026)

These change the model above. The rest of the folder follows them.

1. **Funded entries do not always come through Sales.** When a funded feature comes via Ajay, or any route other than Sales or the relationship team, Ajay can also approve it: the funding approver is Chris or Ajay. When Sales or the relationship team raises a funded feature, Chris approves it (`fs-funded-approver`).
2. **Approval is not pickup.** Approval puts an entry on the ledger. Picking it up for delivery is a separate, final decision, with a status and expected start and due dates based on the estimates (`fs-approval-not-pickup`).
3. **The current stage is part of the ledger**, so everyone knows where a feature is (`fs-stage`). Ajay can assign an entry back to the requester when details are missing (`fs-return-for-info`).
4. **As much detail as possible** on every entry (`fs-completeness`).
