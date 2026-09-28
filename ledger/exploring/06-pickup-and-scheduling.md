# Pickup and scheduling

## 1. The pickup decision

Pickup is the only step that commits the business to building something. It happens at the **product-business meeting**, not at approval.

The meeting takes the ranked ledger (approved entries, in rank order) and decides, entry by entry: **pick up**, **park** (with a date to look again), **reject**, or **leave on the ledger** (no event).

For each entry it picks up, Ajay records the `pickup` event with:

| Field | What goes in |
| --- | --- |
| `meetingDate`, `minuteRef`, `attendees[]` | Which meeting decided it, and who was there |
| `team` | The delivery team (the Jira Team field values, as on the Requests tab) |
| `allocationFTE` | How many people work on it at once (default `fs-default-allocation`) |
| `jiraKey` | The EP key the work is tracked under. It is created or linked at pickup if not before |
| `dependsOn[]` | Other entries or EP keys that must finish first |
| `earliestStart` | Optional. The date before which the team cannot start (for example a code freeze) |
| `jumpedOver[]`, `reason` | Only when it is picked ahead of a higher-ranked unpicked entry (`fs-tier-jump`) |

Bartosz then confirms the derived dates (below), or overrides them with a reason. Either way the result is frozen as the **baseline**.

## 2. Expected start and due dates (`fs-schedule`)

The dates are **derived from the estimate** and the team's queue, not typed. All arithmetic is in **business days**, with weekends stripped, as the ledger's `fl-business-days` rule does. Public holidays are not stripped, as with `fl-holidays`.

```
durationDays  = ceil( effortDays / allocationFTE )
                + qaAllowanceDays                       (fs-qa-allowance)
                + releaseAllowanceDays                  (fs-release-allowance)

teamFreeFrom  = the business day after the latest expectedDue among this team's
                entries that are picked-up or in-delivery and come before this one
                in delivery order, counted over the capacity this entry needs
                (or the pickup date when there are none)

expectedStart = next business day on or after
                max( pickup decision date + fs-pickup-lead,
                     teamFreeFrom,
                     latest expectedDue of dependsOn[],
                     earliestStart )

expectedDue   = expectedStart + durationDays − 1        (business days)
```

- **Confidence widens the due date, not the start.** A low-confidence estimate shows the due date as a range, `expectedDue` to `expectedDue + ceil(durationDays × fs-low-confidence-spread)`. The baseline records the early date.
- **Funded entries** carry the agreed estimate (`funded.agreedEstimateDays`). If the engineering `effortDays` exceeds it, the entry is flagged *over agreed estimate* before pickup, because the customer's contribution was priced on the smaller figure.
- **`neededBy`** is compared to `expectedDue`. If the due date is later, the entry shows *misses the date the customer needs* at the meeting, before pickup, so the decision is made knowingly.

## 3. After pickup: re-planning and drift

| Event | What changes |
| --- | --- |
| Re-estimate (`effortDays` changes) | `schedule` is re-derived, and `baseline` stays. The difference shows as **drift** (the same idea as the Requests `drift` flag) |
| Work starts in Jira (the first In progress) | `startedAt` is set and the status becomes `in-delivery`. If it starts later than `expectedStart` + `fs-late-start-grace`, it is flagged *late start* |
| An entry above it on the same team slips | Its `expectedStart` moves. The move is logged as a `re-plan` event with the cause |
| `expectedDue` passes and it is not delivered | Flagged *overdue*, as the Requests `overdue` flag is |
| Deploy | `deliveredAt` is set and the status becomes `delivered`. The post-delivery check is scheduled at `deliveredAt + fs-check-after` |

The baseline is never overwritten. If the meeting deliberately re-baselines (for example after a scope change), it does so with a `rebaseline` event and a reason, and the old baseline is kept in history.

## 4. Where the parameters come from

The allowances should come from measured data, not guesses. The parked Flow exploration (`exploration/flow.md`, `live/flow.json`) measured the QA cycle and the release hold on a 64-issue sample. At go-live, `fs-qa-allowance` and `fs-release-allowance` are set to the medians of those intervals, re-measured on a bigger sample. Until then they are listed as **to set** in `rules.proposed.json`, with no number invented.
