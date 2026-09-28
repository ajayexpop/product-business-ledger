# Roadmap tagging spec (v1, 25 Sep 2026)

Each done story (2023–2026) gets one theme, an include/exclude decision and a feature name. Themes are the 13 in
`THEMES.md` (v2, owner-confirmed). The page is **customer-facing**, but this tagging output is internal.

## Input (one record per story, `data/roadmap/tag/input-<batch>.json`)

`k, summary, epic (name), components, labels, doneAt, text` — `text` is the existing what/why/outcome or AI summary
where one exists (about 1,300 of the stories), otherwise null. Use the summary, epic, components and `text`. Do not call Jira.

## Output (`data/roadmap/tag/<batch>_w/tags.json`, a JSON array, one object per input key)

```json
{"k": "EP-30412", "theme": "reg", "include": true, "exclude": null,
 "feature": "New basket and payment page", "tags": ["Mobile"], "cf": "High"}
```

- `theme` — one of: `web` Event Websites & Content · `reg` Registration, Ticketing & Payments · `meet` Meetings &
  Matchmaking · `formats` Networking Formats (speed networking, round tables, meeting programmes) · `sessions` Sessions &
  Agenda · `comms` Community & Communications · `exhib` Exhibitor & Sponsor Success · `onsite` Onsite, Badges & Floor
  Plans · `mobile` Mobile App · `analytics` Analytics & Reporting · `ai` AI & Smart Discovery · `integ` Integrations &
  Open API · `platform` Platform, Security & Admin. Always set it, even when excluded.
- Pick by what the **customer** gets, not by team or component. Mobile-app work that delivers another theme's feature
  in the app goes to that theme with tag `Mobile`; `mobile` is for app-native capabilities (app builder, in-app updates,
  navigation, app redesigns, languages). AI features go to their functional theme with tag `AI`; `ai` is for search,
  recommendations and assistants/chatbots themselves.
- `include: false` with `exclude` one of: `bugfix` (fixes a defect, restores behaviour) · `test` (tests, QA, CI/CD) ·
  `internal` (tooling, admin-only chores for our staff, investigations, spikes, documentation) · `refactor`
  (rewrite, migration or upgrade with no customer-visible change) · `thin` (can't tell what was delivered). Keep a
  story included when it changes what an organiser, exhibitor, visitor, speaker or sponsor can do or see — including
  small improvements. Performance, security and privacy work customers benefit from is included (`platform`).
- `feature` — a short, customer-facing name for the capability this story contributes to, 2–6 words, Title-case first
  word only, no client names, no Jira jargon, no internal code names or ticket prefixes (strip "MP ||", "[BE]",
  "(Part 2)", "EMEA:", "*DWTC*" etc.). Stories that build the same capability share the **same** feature string
  (e.g. every "Opt-in Speed Networking. …" story → "Opt-in speed networking"). Integration partners may be named
  (ExpoFP, Klipso, Map Your Show, Reach5, Aditus, Crowd Connected…); client organisations never (IMEX, DWTC, Hyve,
  Informa, Vinexposium, FBF, GES, etc.). Null when excluded.
- `tags` — any of `AI`, `Mobile`; [] if none.
- `cf` — High (clear), Medium (reasonable reading), Low (guess).

Save after every 50 records (resumable: skip keys already present). When done, every input key must appear exactly once.
