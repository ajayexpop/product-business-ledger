# Ledger Rewire Preview

Open it: https://claude.ai/artifact/BUv7s6D31RAuodnBFsqJ7o

A working preview of the restructure planned in `ledger/docs/planning-the-next-part-of-ui-ux.md`, running on the ledger's real data. It is a separate artifact. It reads a snapshot and never writes to the live ledger (https://claude.ai/artifact/WS7mJGdC1y2RzsPTScKu6d) or its database.

The design follows `docs/design.md` (Inter and JetBrains Mono as its documented substitutes, one blue accent, weight-400 display type, pill controls, 24px cards). Page copy is checked against `docs/writing-tropes.md`.

## What is in it

| Tab | Contents |
| --- | --- |
| Home | Role switcher (Ops and CS, Engineering, Product, Sales, Leadership). Each role gets a data-written headline, four stat cards that open their list already filtered, a start-here list and one chart. The Leadership view shows no £ figures. The chosen role is remembered in the viewer's browser. |
| Clients | Table or Timeline. Health comes from open bugs and incidents only (formula shown under the table). Renewal, asks, incidents in 180 days and customer since sit behind "Show expert columns". |
| Work | The five-step ladder (Logged, Signed, Scheduled, Building, Shipped), then Asks in flow, Must-have (month board with committed-days bars) and Built and shipped. "Drop a feature" opens the short intake form. |
| Feature requests | Ideas from clients, not commitments. Mentions grouped into feature requests, ranked by tier-weighted signal (T1 = 5, T2 = 3, T3 = 2, T4 = 1, each client once), and signal by product. Each request lists what was shared on this page, with "Add a client's voice" and "Take it to the pipeline". The tab key and old `#need-` links still work; new links use `#request-<id>` and `#feature-requests`. |
| Quality | Open bugs (team pressure, age by severity, the list), incidents, and pressure before shows. Every bar segment filters the list. |
| How it works | Visible to admins: the owner and anyone with edit access (checked with the `user` capability). Test lab first: test mode (records tagged Test and counted only for admins in test mode), one-tap scenarios, view as a colleague, signal before and after, a queue of new requests with merge suggestions, an AI inspector showing every prompt and answer, delete my test data, reset onboarding. Then (checked with the `user` capability; everyone else never sees the tab and its address leads nowhere). Rules: all 205 rules with value, allowed range, reason, source and change history, each in a linkable drawer (`#rule-<id>`). Method and sources: how the preview differs, then the live ledger's own source notes. Sync and logs: each source's last pull, target, status and last 20 runs; pull requests; one history of must-have edits, column changes, rule versions, pulls and requests. Read-only: edits and pulls stay in the live ledger. |

Drawers: Client 360 (with a 2026 month strip), need, item (bug, story or must-have) and month. Each has a stable address and a Copy link button: `#client-<slug>`, `#need-<id>`, `#item-ep-12345`, `#item-mh-p26`, `#month-<slug>-2026-05`, `#drop`, plus `#home`, `#clients`, `#work`, `#demand`, `#quality`, `#role-<role>`.

Share a feature request (button bottom right, and on the Feature requests tab): one screen for anyone. Several clients can be tagged per request (type-to-search picker). "Speak instead" puts the cursor in the box and shows the device's dictation step (the claude.ai frame blocks the microphone, so voice comes from the device's own dictation). "Fill it in for me", a paste or a fetched call starts the AI fill; once the AI has been allowed, a pause in typing refills. If the AI is unavailable, declined or answers badly, a built-in fill splits the text into what, why and outcome, and the reason is shown. Why and outcome may come back as a marked "AI guess" that is never applied without a click. Choose the client, then speak or type, paste a Fathom link or paste a chat; AI fills what, why and outcome (empty fields are filled, typed ones get a suggestion) and can pick the client from a call. "Is this it?" offers the closest requests and built features with one-tap "Yes, add my client's voice" or "Yes, it's already built"; otherwise it is shared as a new feature request. Before saving, AI tidies the wording and the person picks which version to keep. The confirmation shows how many clients were asking, the new count and the signal before and after, plus at most one question that would add missing information.

Voices shared here (Feature requests tab) lists every share on the page, newest first, with an Everyone / Mine filter. Each voice opens its own panel (`#voice-<id>`): clients, what, why, outcome, the feature request it strengthened, call quotes and the original text. The person who shared it, or an admin, can edit it (clients, wording, or move it to another feature request) or delete it after a confirmation; deleting a voice that started a new request also removes that request if nobody else added to it. AI placeholders such as "Not stated" are dropped before saving and shown as a dash on older records.

Every ask in Asks in flow opens its own panel (`#ask-<id>`): a short title, the details with Edit (clients included), the step on the ladder with Move to Scheduled / Building / Shipped, the four value levers with figures (increase revenue £ a year, retain revenue £ at risk, reduce cost and avoid cost as hours a year × £ an hour, plus funded, contribution and growing revenue) with a total and Sign the value (moves it to Signed), linked items with search to link more and Unlink, Close the chain once Shipped (marks linked feature requests delivered and lists the Jira tickets, with a copy button), a full history, and Delete with confirmation. Feature requests show which ask carries them (In the pipeline or Delivered) and admins can add a request to existing work. Speak instead gives the device's real dictation steps and, on a computer, a QR code that opens the share form on the phone.

Add work (admins only for now; named product and business users later) runs in four steps with a progress bar: Describe, Check matches, Review, Send. The bottom button always says what it will do and, when it is disabled, names what is missing. Check matches ends with one choice: a new need, it builds on what I linked, or it is already built. Review puts AI suggestions under each field with a "Use this" button and turns its questions into answer boxes (candidate labels such as c2 are replaced by names). Send shows a summary card and a colleague picker for the value, then a confirmation with what happens next; in the preview the ask appears under Asks in flow until reload.

Intake fields: client, what, why, outcome, and an optional Fathom call link. As the TAM types, matches appear with a percentage from four sources: demand needs, stories delivered since 2023 (named by Product Journey feature), in-flight and backlog stories plus must-haves, and confirmed platform statements. A business-facing message leads (for example "Your client is already one of the 11 asking for this"). Matches can be linked: Add to my ask, Extend this feature, Already exists, Follow it; the ask then shows its combined clients, signal and the tickets to close when it ships. The Fathom link fetches the call transcript through the viewer's own Fathom connection and shows matching moments. "Match and draft with AI" re-scores the top matches with a reason each and uses the page's `sample` capability, runs on the viewer's own Claude account, and keeps only fields that cite the TAM's words or a candidate need; everything else stays empty and becomes a question. Value stays with sales. Nothing is saved.

Onboarding: a first-visit welcome with a role choice, a spotlight tour per role, a walkthrough of dropping a feature on a marked example, one-time tab hints, and a Guide button bottom right to replay any tour.

Theme: a Light / Dark / System switch in the top bar, Light by default, remembered in the viewer's browser.

Not in the preview: sign-in, database writes, the in-page Jira refresh, feedback and onboarding tours. Visits, activity and feedback are private in the live ledger and are never exported.

## Files

| Path | What |
| --- | --- |
| `src/index.html` | The page |
| `data/data.json` | Packed snapshot the page fetches (generated) |
| `data/live-db/` | Read-only export of the live ledger's `pipeline`, `jira` and `refresh` collections |
| Shared store (`db` capability) | The preview's own database, separate from the live ledger: `fr/<user id>` marker, `fr/<user id>/mentions`, `fr/<user id>/requests`, `fr/<user id>/asks`. Rules: everyone reads `fr`; each person writes their own `fr/<id>`; admins write anything (merges, test clean-up). Only quoted call moments are stored, never full transcripts |
| `data/admin.json` | Owner-only How it works data (generated). Fetched only after the page confirms the owner; anyone with access to the artifact could still request the file directly, so it holds no feedback, visits or activity |
| `tools/pack_admin.py` | Builds `data/admin.json` from the live ledger's `logic.json` and its `sync`, `refresh`, `refresh-req`, `pipeline` and `config` exports, plus the Method panel text in `ledger/src/markup.html` |
| `data/corpus.json` | Matching sources for the intake form, loaded only when it opens (generated) |
| `tools/pack_corpus.py` | Builds `data/corpus.json` from `../analysis/stories.json`, `../data/roadmap/tags.json` and the platform baseline in `../dist-journey/roadmap-internal/ask.json` |
| `tools/pack.py` | Builds `data/data.json` from `../ledger/data/` plus `data/live-db/`, laying the live refreshes over the built data the way the ledger page does |
| `tools/probe.py` | Headless click-through: every tab, role, view and drawer kind; reports script errors, bad values and sideways overflow |

## Refresh and republish

1. Export the live ledger's `pipeline`, `jira`, `refresh`, `sync`, `refresh-req` and `config` collections into `data/live-db/` (`ArtifactData list` with `out_dir`, read-only), and its `logic.json` into `data/live-db/files/` (`Artifact read` with `paths`).
2. `python3 rewire/tools/pack.py`, `python3 rewire/tools/pack_admin.py` and `python3 rewire/tools/pack_corpus.py`
3. Stage `src/index.html`, `data/data.json`, `data/admin.json`, `data/corpus.json` and `img/` (the two logos from `ledger/live/img/`) in a folder, then `python3 rewire/tools/probe.py <folder> 1440` and again with `1100`. Both must report errors 0 and issues 0, and so must `PROBE_AS=other` (a colleague who is not an admin). The probe carries a stand-in for claude.ai (user, shared store, AI): run it with `PROBE_AI=on`, `off`, `deny` (permission declined) and `bad` (a reply that is not JSON); every combination must be clean. Headless Chrome cannot go below about 500px wide, so check phone width inside a 400px iframe.
4. Republish `src/index.html` to the URL above with `files` = `data.json`, `admin.json` and `corpus.json` (and the logos only if they changed). Omit `icon` and `capabilities` so they are kept: `sample`, `user` with scope `profile`, `db` with rules `fr` (read view, write admin) and `fr/{self}` (write interact), and `mcp` with Fathom `get_recording_by_url` and `get_meeting_transcript` (the page calls the server by its display name, "Fathom").
