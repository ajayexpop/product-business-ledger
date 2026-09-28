# Integration plan: from `exploring/` to the ledger

This is carried out only after the owner approves the folder and the decisions in `10-open-decisions.md` are answered. It follows the update cycle in the repo `CLAUDE.md`: rules first, rebuild second, record third.

## Step 0: re-read the live artifact

Run `Artifact read` on https://claude.ai/artifact/Dpc9Z8uabRxLCryUSGML7G, then refresh `live/` and `live/db`, then run `python3 tools/ledger.py check`. While the redesign preview is open, restore `src/` from `preview/src` afterwards (see `preview/README.md`).

## Step 1: rules into the registry

- Merge the 30 `fs-*` rules from `rules.proposed.json` into `live/logic.json` under the group **Feature scoring ledger**, with every `null` value filled from the answers to `10-open-decisions.md`. None goes live as `null`.
- Add a `log` entry to `logic.json` (by `claude`, on behalf of the owner) naming the approval.
- `LOGIC_SEED` is regenerated from `logic.json` by the build. It is never edited by hand.

## Step 2: shared database

| Collection | Document | What |
| --- | --- | --- |
| `ledger` | `ledger/<id>` | One entry (`02-entry-schema.md`), with `v`, `j`, `h` in the same shape as `pipeline/*` |
| `ledger-events` | `ledger-events/<id>` | The append-only event log for that entry (`04-approvals-and-audit.md`) |
| `config` | `config/ledger` | The column schema and option lists (levers, teams, product areas), in the same shape as `config/pipeline` |

Every write pins `if_version`, and every change to a field writes its event in the same update (`pp-history`, `fs-history`). Jira columns (status, start, done) go into `j` only, from the existing sync. They carry no history.

**Tier 1 link:** the existing must-have items in `pipeline/*` stay where they are. They are tier 1 by definition. The ranked view reads both collections and shows `pipeline` items as tier 1, sorted by their `order`. They are **not** migrated into `ledger/*`, so their history stays whole. See D6.

## Step 3: the page

A new tab, **Feature ledger**, next to Requests. It holds:

1. **Ledger:** every logged entry, with a **Current stage** column (step, waiting on, days in stage, colour against `fs-stage-limits`). The **Pipeline** section (steps 1 to 5 and Needs details) sits on top, then the **ranked** part from `05-ranking.md`, with tier 1 (from `pipeline`) first and totals per tier.
2. **Awaiting me** and **Needs details:** for the signed-in viewer, the entries whose next step is theirs. A requester sees their returned entries, with the questions, at the top of the page.
3. **Entry panel:** every field, grouped as in `02-entry-schema.md`, with the **details %** and the missing fields named. The signatures show as stamps, with who and when. A 10-step stage bar shows where the entry is, the next step and whose it is. Approved entries read **"On the ledger · not scheduled"**. Ajay has a **Send back for details** button at every stage before pickup. It opens a list of missing fields to tick, a question for each, the person it is assigned to and a due date. The requester answers each question inline and presses **Resubmit**.
4. **Log a request:** the form, in the sections of `02-entry-schema.md` (basics, detail, value by lever). The **S** fields are required, and the others are prompted with the details % shown live. The funding approver appears as soon as *Funded* is ticked, taken from `raisingLayer`, the signer is derived and shown, the intake check runs before **Log**, and `loggedBy` comes from the claude.ai profile. If the viewer is not signed in, the tab is read-only, as Requests is.
5. **Meeting mode:** the ranked approved entries, each with Pick up, Park, Reject and Leave. Pick up opens the pickup fields and shows the derived start and due dates live before they are saved.
6. **History views:** entry history, Logged by, signer track record and meeting record.

Capabilities are unchanged (`artifact`, `db`, `user` profile, `mcp` Atlassian). Nothing new is needed.

## Step 4: intake alignment

- The FIS template and the Jira Feature Request form gain the value fields (lever, figure, assumption, funded, existing and growing). Operations (Susan / Ilaria) keep the intake agent aligned (model: "keep the intake agent aligned with these definitions").
- The old opportunity-score fields (`frequency`, `businessImpact`, `urgency`, `sponsorMultiplier`, `totalOpportunity`) stay readable on the records in `requests/`, but no longer rank anything.
- Backfill is optional, not automatic. An existing request in `requests/db/items.json` enters the ledger only when someone logs it as an entry, with `source` pointing back to it and a signed figure. No figure is inferred from the old scores. `analysis/`'s value driver can be offered as a *suggested* lever on the form, but the requester chooses.

## Step 5: build, QA, publish

1. `python3 tools/ledger.py build`, then serve `dist/` locally.
2. QA: the worked example (`08-worked-example.md`) is entered in a scratch database and every step reproduces the table, the dates and the log. Negative-net, tier-jump, void-on-change and unpick are exercised once each.
3. Publish in place (`url` = the artifact URL, `file_path` = `dist/index.html`, `files` = `logic.json`). Omit `icon` and `capabilities`.
4. Re-read, and confirm the live file equals `dist/qa.html` byte for byte.

## Step 6: record

- Add a change-log row to `docs/methods-runbook.md`.
- Update `artifact.md` (the version line of the Internal Product Business Ledger).
- Mark this folder's `README.md` status as **Approved and live, [date]**. From then on the registry rules are the source of truth. This folder stays as the design record, and is corrected wherever it disagrees with the rules.
