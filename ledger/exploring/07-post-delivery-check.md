# Post-delivery check

The model: "After deploy the figure is checked against what happened, so whoever attached it sees whether it held."

## When

It is due at `deliveredAt + fs-check-after`. The default is proposed per lever, because revenue and saved hours show up at different speeds:

| Lever | Check after (proposed) | What is compared |
| --- | --- | --- |
| Increase revenue | at the deal's close or expansion date, or 90 days, whichever is sooner | Revenue actually booked (Pipedrive, invoicing) vs `figureGBP` |
| Retain revenue | at the customer's next renewal date (the ledger holds renewal dates) | Renewed or not, and at what value, vs contract value at risk |
| Reduce cost | 60 days, or after the next N events that use it | Hours actually spent now vs hours before, × the same rate |
| Avoid cost | 90 days | Incidents, rework and bugs of the named kind (Jira) vs the baseline count |

## Who

The **signer** answers: Chris for revenue figures, Susan or Ilaria for operations hours, Bartosz or Ajay for engineering hours. For a funded entry, the funding approver who signed it answers (Chris, or Ajay when Ajay approved it). Ajay records the answer as the `check` event. The entry shows *check due* in the signer's **Awaiting me** view from the due date.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `held` | The actual is at least `fs-held-threshold` of the figure |
| `partly` | The actual is between 0 and that threshold |
| `did-not-hold` | No measurable effect |
| `too-early` | It cannot be judged yet. A new due date is required, and this can be used at most `fs-max-deferrals` times |

`actualGBP` and `evidence` are required for every verdict except `too-early`.

## What it feeds

- The **signer track record** (`04-approvals-and-audit.md`): over time, the share of each signer's figures that held. It is shown on every new entry the same person signs, so the weekly review can weigh figures by who stands behind them. It is shown, not scored: the ranking stays net value.
- A **lessons line** in the entry history when a figure did not hold, taken from the `evidence` field.
