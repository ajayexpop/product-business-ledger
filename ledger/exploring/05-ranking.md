# Ranking

Every logged entry is on the ledger for everyone to see, with its current stage (`03-lifecycle.md`, `fs-stage`). Only entries with status `approved`, `parked`, `picked-up`, `in-delivery` or `delivered` are **ranked**. Entries still collecting signatures, or sent back for details, sit in a **Pipeline** section above the ranked part, grouped by stage, with who each one is waiting on.

## Tier assignment (`fs-tiers`)

Tiers are derived from the entry's fields, never typed. The rules are checked top down, and the first match wins.

| Tier | Name | Rule |
| --- | --- | --- |
| 1 | Must-have ledger | `mustHave.yes` with a meeting date: agreed at the product-business meeting. The existing Must-Have Product Pipeline items (the Requests tab) are tier 1 by definition |
| 2 | Funded and increases revenue | `lever = increase-revenue` **and** `funded.yes` **and** `fundedConfirmation` valid (given by the approver `fs-funded-approver` names: Chris for entries raised by Sales or the relationship team, Chris or Ajay otherwise) **and** an estimate exists |
| 3 | Existing revenue that will grow | `existingGrowing.yes` **and** `growthSizing` valid |
| 4 | Everything else | any other approved entry |

Notes:

- A funded entry whose lever is not *increase revenue* stays in tier 4, with a **Funded** badge. The model puts only "increase revenue + funded" at the top. See `10-open-decisions.md` D5.
- An entry that is both funded (tier 2) and existing-and-growing (tier 3) is tier 2.
- A voided confirmation drops the entry to the tier its remaining valid fields support, straight away, with a `re-tier` event.

## Within a tier

1. **Net value**, highest first (`figureGBP − buildCostGBP`).
2. Ties: **funded** first, then the earlier **`neededBy`**, then the earlier **signed** date.
3. **Negative net value** entries sort to the bottom of their tier and carry a red **Costs more than it returns** label. They can still be picked up, but only by a meeting decision whose event carries a reason (`fs-negative-net`).

Tier 1 items without a figure (the older must-haves) sort by their existing Requests order, below the tier 1 items that have a figure. See `10-open-decisions.md` D6.

## Confidence shown, not scored

The estimate's `confidence` (low, medium, high) and the `assumption` line appear on every row. They do not change the rank: the model ranks by net value, and the business settles judgement calls between tiers at the meeting.

## The ranked view (columns)

| # | Tier | Entry | **Current stage** (waiting on · days) | Lever | Figure | Build cost | **Net value** | Signed by | Funded (approved by) | Details % | Expected start → due |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- *Expected start → due* is blank, showing "not scheduled", until the entry is picked up.
- Filters: tier, **stage**, lever, signer, client, product area, logged by, waiting on.
- The Pipeline section uses the same columns. Its figures show as *unsigned* until signed, and build cost and net value stay blank until estimated.
- Totals per tier: the sum of figure, build cost and net value, split into *picked up* and *not picked up*.

## Between tiers

Tier order is the default delivery order. The model says: "Competing priorities between tiers are settled by the business at the product-business meeting, not by the figure alone." So the meeting may pick up a tier 3 entry ahead of an unpicked tier 2 entry. That pickup event records the entries it jumped ahead of and the reason (`fs-tier-jump`), so the decision can be seen later.
