# Open decisions (for the owner, before go-live)

Each decision has a proposed answer. Approving the folder as it stands accepts every proposal marked **Proposed**. Items marked **To set** need a number from the named person: no number is invented in this folder.

| # | Decision | Proposed | Who decides |
| --- | --- | --- | --- |
| D1 | **Figure horizon.** Is every £ figure stated over 12 months, or can one-off and multi-year figures be used? | 12 months for all four levers (`fs-figure-horizon`) | Ajay, with Chris |
| D2 | **Rates.** The engineering day rate (`fs-day-rate`) and the operations hourly rate (`fs-ops-rate`). The model's example "100 hours = £20k" implies £200/h, but it is an example, not an agreed rate | **To set** | Bartosz (day rate); Susan / Ilaria (hourly rate) |
| D3 | **Self-signing.** Chris is the only Sales signer, and Ajay may raise, sign and approve a funded entry that did not come from Sales or the relationship team (owner instruction, 27 Sep). Is a flag enough in both cases? | Accept and flag `self-signed`, shown at review and at pickup (`fs-no-self-sign`) | Ajay |
| D4 | **Engineering-raised cost entries.** Bartosz or Ajay signs the engineering hours, and Bartosz also estimates build cost. Is the same person allowed to do both on one entry? | Yes, but the other P&E owner signs the figure when one of them raised it | Ajay, Bartosz |
| D5 | **Funded but not increase revenue** (e.g. the customer pays towards a cost reduction). Tier 2 or tier 4? | Tier 4 with a Funded badge, as written in the model | Ajay |
| D6 | **Existing must-haves.** Keep them in `pipeline/*` as tier 1 without figures, or ask their owners to add a lever and figure? | Keep them as they are. Figures are optional for tier 1, and they sort by their current order | Ajay |
| D7 | **Scheduling parameters**: `fs-default-allocation`, `fs-qa-allowance`, `fs-release-allowance`, `fs-pickup-lead`, `fs-low-confidence-spread`, `fs-late-start-grace` | **To set.** The allowances come from the measured Flow intervals (QA cycle, release hold) | Bartosz |
| D8 | **Check thresholds**: `fs-held-threshold` and `fs-max-deferrals`, and the check-after periods in `fs-check-after` | **To set** (thresholds); periods as proposed | Ajay, with Chris and Susan / Ilaria |
| D9 | **Meeting quorum.** Who must attend for a pickup to count? | One of each layer: Sales, Operations and P&E. Recorded in `meeting.attendees` | Ajay |
| D10 | **Who can log.** Any signed-in ExpoPlatform user, or only named requesters? | Any signed-in user, with `loggedBy` recorded. Signing is where authority sits | Ajay |
| D11 | **Weekly review cadence.** Does an entry with no review within N days get flagged? | Flag after 10 business days in `signed` | Ajay |
| D12 | **Customer visibility.** Is anything here ever shown to customers (e.g. the Product Journey artifacts)? | No. The ledger is internal only; customer pages keep their own public-content rules | Ajay |
| D13 | **Who is "the relationship team"?** It decides when only Chris can confirm a funded entry | Account management, customer success and TAMs acting for a client relationship. Listed by name in `fs-owners` | Ajay, with Chris |
| D14 | **Stage limits** (`fs-stage-limits`) and the **details request due date** (`fs-info-due`) | 10 business days in Awaiting review, and 5 business days to answer a details request. The other limits are **to set** | Ajay |
| D15 | **Details after pickup.** Can Ajay still send an entry back once it is picked up? | No. After pickup, gaps go to the delivery team as Jira comments, so the schedule is not held up | Ajay, Bartosz |
