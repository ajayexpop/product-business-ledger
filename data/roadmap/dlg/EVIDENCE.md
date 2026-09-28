# DLG tagging: evidence dump (internal, 25 Sep 2026)

Every Jira story behind anything the DLG page presents as done for DLG, with the reason it was tagged. Pulled live from Jira on 25 Sep 2026 (`data/roadmap/dlg/raw/evidence.json`). Also available as `evidence.csv`.

## How a story got tagged DLG

A story was pulled in if **any** of these were true in Jira: the *Reported by (internally or by client)* field contains DLG, the *Affected clients* field contains DLG, it has the label `DLG`, or its text mentions DLG, Agritechnica or EuroTier. I then read each ticket. **The Reported-by field and labels are filled in by our own team, not by DLG**, so on their own they show that we recorded DLG as the source. They don't prove that DLG asked.

## Evidence strength

| Tier | Meaning | Safe to say "at your request"? |
|---|---|---|
| **A** | The ticket text or comments name DLG as the one asking (e.g. 'Dennis from DLG is chasing it') | Yes |
| **B** | Reported by DLG, and the ticket uses a DLG event or environment as the case | Yes, but check with the account manager |
| **C** | Only the Reported-by field or label says DLG; nothing in the text | Only after the account manager confirms |
| **S** | Reported-by lists DLG and other clients | Say "requested by DLG and other organisers", not "built for you" |
| **W** | DLG is not the requester: another client asked, or a DLG event is only an example, or it fixed a DLG incident | No. Remove it or reword it |

**Totals:** A · DLG named as asking: 7 · B · DLG case in the ticket: 6 · C · Reported-by field only: 12 · S · Shared with other clients: 9 · W · Not a DLG request: 6

## Page items and their stories

### Delivered for DLG

- ❓ **Spam protection for exhibitor registration** (2023-Q2) · strongest evidence **C** · [EP-16297](https://expoplatform.atlassian.net/browse/EP-16297) C
- ❓ **Ticket order you control** (2023-Q3) · strongest evidence **C** · [EP-17102](https://expoplatform.atlassian.net/browse/EP-17102) C
- **Aditus badges inside the app** (2024-Q2) · strongest evidence **A** · [EP-25790](https://expoplatform.atlassian.net/browse/EP-25790) A
- ❓ **Lead downloads by exhibitor category** (2024-Q3) · strongest evidence **C** · [EP-13663](https://expoplatform.atlassian.net/browse/EP-13663) C
- ⚠️ **Security questions for exhibitor events** (2024-Q3) · strongest evidence **W** · [EP-26093](https://expoplatform.atlassian.net/browse/EP-26093) W
- **Product categories as session filters** (2024-Q3) · strongest evidence **B** · [EP-29933](https://expoplatform.atlassian.net/browse/EP-29933) B
- ↔ **Activity categories only for exhibitors** (2024-Q3) · strongest evidence **S** · [EP-33961](https://expoplatform.atlassian.net/browse/EP-33961) S
- **Sponsor pop-up through the API** (2024-Q3) · strongest evidence **A** · [EP-32201](https://expoplatform.atlassian.net/browse/EP-32201) A
- ❓ **Admin notifications in every language** (2024-Q4) · strongest evidence **C** · [EP-31011](https://expoplatform.atlassian.net/browse/EP-31011) S, [EP-32750](https://expoplatform.atlassian.net/browse/EP-32750) C
- ↔ **App pages for visitors who are not logged in** (2024-Q4) · strongest evidence **S** · [EP-32358](https://expoplatform.atlassian.net/browse/EP-32358) S, [EP-32359](https://expoplatform.atlassian.net/browse/EP-32359) S
- ❓ **Faster sponsor administration** (2024-Q4) · strongest evidence **C** · [EP-36019](https://expoplatform.atlassian.net/browse/EP-36019) C
- **German across the platform** (2025-Q2) · strongest evidence **B** · [EP-40706](https://expoplatform.atlassian.net/browse/EP-40706) B, [EP-41169](https://expoplatform.atlassian.net/browse/EP-41169) B
- ❓ **Tax names in every language** (2025-Q3) · strongest evidence **C** · [EP-43163](https://expoplatform.atlassian.net/browse/EP-43163) C
- ❓ **Aditus badge settings restored** (2025-Q3) · strongest evidence **C** · [EP-44694](https://expoplatform.atlassian.net/browse/EP-44694) C
- ↔ **Favourites and floor plan bookmarks in sync** (2026-Q1) · strongest evidence **S** · [EP-44186](https://expoplatform.atlassian.net/browse/EP-44186) S
- ❓ **Clearer badge messages with Aditus** (2026-Q1) · strongest evidence **C** · [EP-48297](https://expoplatform.atlassian.net/browse/EP-48297) C
- ⚠️ **Safer floor plan updates between web and app** (2026-Q1) · strongest evidence **W** · [EP-47929](https://expoplatform.atlassian.net/browse/EP-47929) W
- ⚠️ **Hall and stand management for large events** (2026-Q2) · strongest evidence **W** · [EP-51701](https://expoplatform.atlassian.net/browse/EP-51701) W
- ⚠️ **Past events stay available in the app** (2026-Q2) · strongest evidence **W** · [EP-52820](https://expoplatform.atlassian.net/browse/EP-52820) W
- ❓ **Private favourites for opted-out visitors** (2026-Q3) · strongest evidence **C** · [EP-53978](https://expoplatform.atlassian.net/browse/EP-53978) S, [EP-57577](https://expoplatform.atlassian.net/browse/EP-57577) C
- ↔ **Brands attached across events on import** (2026-Q3) · strongest evidence **S** · [EP-55642](https://expoplatform.atlassian.net/browse/EP-55642) S
- **Custom session filters in the API** (2026-Q3) · strongest evidence **A** · [EP-57347](https://expoplatform.atlassian.net/browse/EP-57347) A, [EP-57348](https://expoplatform.atlassian.net/browse/EP-57348) A
- **Dedicated SAML single sign-on page** (2026-Q3) · strongest evidence **A** · [EP-57684](https://expoplatform.atlassian.net/browse/EP-57684) A

### In development for DLG

- **Academic titles for EuroTier 2026** (in development) · strongest evidence **B** · [EP-57562](https://expoplatform.atlassian.net/browse/EP-57562) B, [EP-57533](https://expoplatform.atlassian.net/browse/EP-57533) B, [EP-57544](https://expoplatform.atlassian.net/browse/EP-57544) B
- ↔ **Language filter for sessions and exhibitor events** (in development) · strongest evidence **S** · [EP-57253](https://expoplatform.atlassian.net/browse/EP-57253) S
- ↔ **Custom filters for exhibitor events** (in development) · strongest evidence **S** · [EP-47879](https://expoplatform.atlassian.net/browse/EP-47879) S
- **Session calendar: all-day sessions and track order** (in development) · strongest evidence **A** · [EP-57098](https://expoplatform.atlassian.net/browse/EP-57098) W, [EP-57478](https://expoplatform.atlassian.net/browse/EP-57478) A
- **Cleaner web pages inside the EuroTier app** (in development) · strongest evidence **A** · [EP-57824](https://expoplatform.atlassian.net/browse/EP-57824) A
- ❓ **Reliable incremental sync of interaction statistics** (in development) · strongest evidence **C** · [EP-57428](https://expoplatform.atlassian.net/browse/EP-57428) C, [EP-57430](https://expoplatform.atlassian.net/browse/EP-57430) C
- ⚠️ **Session audiences kept when cloning events** (in development) · strongest evidence **W** · [EP-57471](https://expoplatform.atlassian.net/browse/EP-57471) W
- ❓ **Private favourites: bulk removal** (in development) · strongest evidence **C** · [EP-55477](https://expoplatform.atlassian.net/browse/EP-55477) C

### Timeline features badged "Requested by DLG"

- 2023-Q2 **Spam protection for exhibitor sign-up** · 1 of 1 stories DLG · [EP-16297](https://expoplatform.atlassian.net/browse/EP-16297) C
- 2023-Q3 **Category and form setup improvements** · 1 of 2 stories DLG · [EP-17102](https://expoplatform.atlassian.net/browse/EP-17102) C
- 2024-Q2 **Aditus badges in the app** · 1 of 1 stories DLG · [EP-25790](https://expoplatform.atlassian.net/browse/EP-25790) A
- 2024-Q3 **Session import and filtering improvements** · 1 of 3 stories DLG · [EP-29933](https://expoplatform.atlassian.net/browse/EP-29933) B
- 2024-Q3 **Lead download controls** · 1 of 3 stories DLG · [EP-13663](https://expoplatform.atlassian.net/browse/EP-13663) C
- 2024-Q3 **Product category and profile improvements** · 1 of 3 stories DLG · [EP-33961](https://expoplatform.atlassian.net/browse/EP-33961) S
- 2024-Q4 **Multilingual admin notifications** · 2 of 2 stories DLG · [EP-31011](https://expoplatform.atlassian.net/browse/EP-31011) S, [EP-32750](https://expoplatform.atlassian.net/browse/EP-32750) C
- 2024-Q4 **App builder options** · 2 of 6 stories DLG · [EP-32358](https://expoplatform.atlassian.net/browse/EP-32358) S, [EP-32359](https://expoplatform.atlassian.net/browse/EP-32359) S
- 2024-Q4 **Public API exhibitor and product controls** · 1 of 2 stories DLG · [EP-32201](https://expoplatform.atlassian.net/browse/EP-32201) A
- 2025-Q2 **Aditus participant sync** · 1 of 2 stories DLG · [EP-44694](https://expoplatform.atlassian.net/browse/EP-44694) C
- 2025-Q3 **Translated invoices and tax names** · 1 of 2 stories DLG · [EP-43163](https://expoplatform.atlassian.net/browse/EP-43163) C
- 2026-Q1 **Bookmarks synced with favourites** · 1 of 1 stories DLG · [EP-44186](https://expoplatform.atlassian.net/browse/EP-44186) S
- 2026-Q1 **Clearer custom badge errors with Aditus** · 1 of 1 stories DLG · [EP-48297](https://expoplatform.atlassian.net/browse/EP-48297) C
- ⚠️ 2026-Q2 **Floor plan management improvements** · 1 of 2 stories DLG · [EP-51701](https://expoplatform.atlassian.net/browse/EP-51701) W
- 2026-Q3 **Region filters and brand import** · 1 of 3 stories DLG · [EP-55642](https://expoplatform.atlassian.net/browse/EP-55642) S
- 2026-Q3 **Integrations catalogue** · 1 of 2 stories DLG · [EP-57684](https://expoplatform.atlassian.net/browse/EP-57684) A
- 2026-Q3 **API sponsor analytics and session filters** · 2 of 3 stories DLG · [EP-57347](https://expoplatform.atlassian.net/browse/EP-57347) A, [EP-57348](https://expoplatform.atlassian.net/browse/EP-57348) A
- 2026-Q3 **Private favourites for opted-out users** · 2 of 2 stories DLG · [EP-53978](https://expoplatform.atlassian.net/browse/EP-53978) S, [EP-57577](https://expoplatform.atlassian.net/browse/EP-57577) C

## Story by story

### [EP-13663](https://expoplatform.atlassian.net/browse/EP-13663) · Download leads feature on Exhibitor Category level and Individual exhibitor level
- **C · Reported-by field only**: Reported by DLG + label DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2023-02-14 by Kavinder Rawal
- Reported-by field: DLG · Labels: DLG, Team_C
- On the page: Delivered for DLG: Lead downloads by exhibitor category | Badge "Requested by DLG" in timeline: 2024-Q3 Lead download controls

### [EP-16297](https://expoplatform.atlassian.net/browse/EP-16297) · The exhibitor registration reCapthca 
- **C · Reported-by field only**: Reported by DLG + label DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2023-04-21 by Vova Berezovskyi
- Reported-by field: DLG · Labels: DLG, Team_B
- On the page: Delivered for DLG: Spam protection for exhibitor registration | Badge "Requested by DLG" in timeline: 2023-Q2 Spam protection for exhibitor sign-up

### [EP-17102](https://expoplatform.atlassian.net/browse/EP-17102) · Ticketing order 
- **C · Reported-by field only**: Reported by DLG + label DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2023-05-15 by Vova Berezovskyi
- Reported-by field: DLG · Labels: DLG, Team_A
- On the page: Delivered for DLG: Ticket order you control | Badge "Requested by DLG" in timeline: 2023-Q3 Category and form setup improvements

### [EP-25790](https://expoplatform.atlassian.net/browse/EP-25790) · Custom Badge Page Integration with Aditus
- **A · DLG named as asking**: DLG named in comments (DLG-Feldtage, DLG ticket links); Reported by DLG
- Story · Done · created 2024-01-29 by Ajay Singh
- Reported-by field: DLG · Labels: (none)
- On the page: Delivered for DLG: Aditus badges inside the app | Badge "Requested by DLG" in timeline: 2024-Q2 Aditus badges in the app
- Quote (comment, Oleksandr Yelfutin, 2024-05-08): "…de": "DD8151FJKTJHE4", "registeredOn": "2024-05-07 13:22:29.2732071", "linkPDF": "https://www.messe-ticket.de/DLG-WS/P3Q9MDMwNDQwNDI1MDAwMDEwMSZzaD1PYnJpU1gmY3Q9cGRm", "linkWallet": "https://www.messe-ticket.de/DLG-WS/P3Q9M…"
- Quote (comment, Ajay Singh, 2024-05-31): "…vent on our side. (or) maybe you should ask Aditus to source this data via single ID, as what we have seen in DLG Feldtage (per event). The ID comes from Aditus and is added to our backend. Current Iteration - Single ID as …"

### [EP-26093](https://expoplatform.atlassian.net/browse/EP-26093) · Events Security concern. Ability for Organizer to set questions for Exhibitor
- **W · Not a DLG request**: Reported by FrankfurterBuchmesse; epic is FBF security concerns; DLG only as a label → FBF request, not DLG
- Story · Done · created 2024-02-06 by Oleksandr Parashchuk
- Reported-by field: FrankfurterBuchmesse · Labels: DLG, Team_B
- On the page: Delivered for DLG: Security questions for exhibitor events

### [EP-29933](https://expoplatform.atlassian.net/browse/EP-29933) · Product categories as a filter for sessions
- **B · DLG case in the ticket**: Reported by DLG; the description uses the DLG admin environment (api-dlgservice) as the case
- Story · Done · created 2024-05-23 by Vova Berezovskyi
- Reported-by field: DLG · Labels: Team_B, Vlad
- On the page: Delivered for DLG: Product categories as session filters | Badge "Requested by DLG" in timeline: 2024-Q3 Session import and filtering improvements
- Quote (description): "…In display filters - [https://api-dlgservice.expoplatform.com/admin/displayFilters](https://api-dlgservice.expoplatform.com/admin/displayFilters) the ‘pro…"
- Quote (description): "…In display filters - [https://api-dlgservice.expoplatform.com/admin/displayFilters](https://api-dlgservice.expoplatform.com/admin/displayFilters) the ‘product category’ filter is not available The same setting as exi…"

### [EP-31011](https://expoplatform.atlassian.net/browse/EP-31011) · Multilanguage Admin Notifications
- **S · Shared with other clients**: Reported by INTERNAL + DLG + Informa – Cosmoprof NA: shared request
- Story · Done · created 2024-06-19 by Ajay Singh
- Reported-by field: INTERNAL, DLG, Informa - Cosmoprof NA · Labels: Talala, Team_B
- On the page: Delivered for DLG: Admin notifications in every language | Badge "Requested by DLG" in timeline: 2024-Q4 Multilingual admin notifications

### [EP-32201](https://expoplatform.atlassian.net/browse/EP-32201) · Sponsor pop-up parameter on api/v2/exhibitor/set
- **A · DLG named as asking**: Comments: 'Dennis from DLG is chasing it', 'DLG is waiting for this feature… EuroTier 2024'
- Story · Done · created 2024-07-18 by Pedro Goncalves
- Reported-by field: INTERNAL · Labels: Team_A, vova
- On the page: Delivered for DLG: Sponsor pop-up through the API | Badge "Requested by DLG" in timeline: 2024-Q4 Public API exhibitor and product controls
- Quote (description): "… the admin panel: In the Exhibitor Profile, there is a "Sponsor pop-up" setting that can be manually enabled. DLG pushes data for their exhibitors via the API; however, our api/v2/exhibitor/set API documentation does not in…"
- Quote (comment, Pedro Goncalves, 2024-07-23): "…Hi Team! @Andrii (PM) , can we please get this feature estimated? Dennis from DLG is chasing it. FYI → @Vova Berezovskyi…"
- Quote (comment, Pedro Goncalves, 2024-09-05): "…Hey @Andrii (PM), thank you for the quick response, I appreciate it! DLG is waiting for this feature to be used in their upcoming show EuroTier 2024 (12 - 15 Nov), so I would say tha…"

### [EP-32358](https://expoplatform.atlassian.net/browse/EP-32358) · Add an option in app builder to specify page for logged in / non logged user
- **S · Shared with other clients**: Reported by INTERNAL + DLG: shared
- Story · Done · created 2024-07-23 by Ajay Singh
- Reported-by field: INTERNAL, DLG · Labels: (none)
- On the page: Delivered for DLG: App pages for visitors who are not logged in | Badge "Requested by DLG" in timeline: 2024-Q4 App builder options

### [EP-32359](https://expoplatform.atlassian.net/browse/EP-32359) · Login Link for App Sign In Page
- **S · Shared with other clients**: Reported by INTERNAL + DLG: shared
- Story · Done · created 2024-07-23 by Ajay Singh
- Reported-by field: INTERNAL, DLG · Labels: (none)
- On the page: Delivered for DLG: App pages for visitors who are not logged in | Badge "Requested by DLG" in timeline: 2024-Q4 App builder options

### [EP-32750](https://expoplatform.atlassian.net/browse/EP-32750) · Multilanguage Admin Notifications (for non-logged-in user)
- **C · Reported-by field only**: Reported by DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2024-08-02 by Evgen Polivach
- Reported-by field: DLG · Labels: Team_B
- On the page: Delivered for DLG: Admin notifications in every language | Badge "Requested by DLG" in timeline: 2024-Q4 Multilingual admin notifications

### [EP-33961](https://expoplatform.atlassian.net/browse/EP-33961) · Extend logic of adding of Product categories
- **S · Shared with other clients**: Reported by INTERNAL + DLG: shared
- Story · Done · created 2024-09-03 by Bohdan Osypenko
- Reported-by field: INTERNAL, DLG · Labels: Team_C
- On the page: Delivered for DLG: Activity categories only for exhibitors | Badge "Requested by DLG" in timeline: 2024-Q3 Product category and profile improvements

### [EP-36019](https://expoplatform.atlassian.net/browse/EP-36019) · The Sponsor page is loading slowly 
- **C · Reported-by field only**: Reported by DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2024-10-23 by Vova Berezovskyi
- Reported-by field: DLG · Labels: Team_A, vova
- On the page: Delivered for DLG: Faster sponsor administration

### [EP-40706](https://expoplatform.atlassian.net/browse/EP-40706) · DLG: language issues
- **B · DLG case in the ticket**: Reported by DLG; description references EuroTier 2024 and the DLG admin
- Story · Done · created 2025-03-19 by Elena Potapov
- Reported-by field: DLG · Labels: (none)
- On the page: Delivered for DLG: German across the platform
- Quote (description): "…please take into consideration the attached Doc. Made to Eurotier 2024 https://www.eurotier.com/de/ https://api-dlgservice.expoplatform.com/admin/exhibitions/list test account…"
- Quote (description): "…please take into consideration the attached Doc. Made to Eurotier 2024 https://www.eurotier.com/de/ https://api-dlgservice.expoplatform.com/admin/exhibitions/list test account jens schindler but probab…"

### [EP-41169](https://expoplatform.atlassian.net/browse/EP-41169) · please translate into German
- **B · DLG case in the ticket**: Reported by DLG + FrankfurterBuchmesse; description: DLG Services – EuroTier 24 as basis
- Story · Done · created 2025-04-02 by Elena Potapov
- Reported-by field: DLG, FrankfurterBuchmesse · Labels: (none)
- On the page: Delivered for DLG: German across the platform
- Quote (description): "…please apply translation **globally** DLG Services - Eurotier 24 as basis ‌ | Welcome to the Exhibitors Page, your gateway to the dynamic world of our …"
- Quote (description): "…please apply translation **globally** DLG Services - Eurotier 24 as basis ‌ | Welcome to the Exhibitors Page, your gateway to the dynamic world of our event's participants…"

### [EP-43163](https://expoplatform.atlassian.net/browse/EP-43163) · Multilingual Tax name
- **C · Reported-by field only**: Reported by DLG, set by our team; no DLG wording in the ticket
- Story · Done · created 2025-06-19 by Oleksandr Parashchuk
- Reported-by field: DLG · Labels: (none)
- On the page: Delivered for DLG: Tax names in every language | Badge "Requested by DLG" in timeline: 2025-Q3 Translated invoices and tax names

### [EP-44186](https://expoplatform.atlassian.net/browse/EP-44186) · Bi-directional Sync Between Favorites and Floorplan Bookmarks
- **S · Shared with other clients**: Reported by INTERNAL + DLG: shared
- Story · Done · created 2025-07-30 by Ajay Singh
- Reported-by field: INTERNAL, DLG · Labels: DoDUserStory, qa_review
- On the page: Delivered for DLG: Favourites and floor plan bookmarks in sync | Badge "Requested by DLG" in timeline: 2026-Q1 Bookmarks synced with favourites

### [EP-44694](https://expoplatform.atlassian.net/browse/EP-44694) · Custom Badge Page with Aditus - Reinstate the Settings on Admin Panel
- **C · Reported-by field only**: Reported by INTERNAL + DLG; follow-up to EP-25790 (strong)
- Story · Done · created 2025-08-22 by Pedro Goncalves
- Reported-by field: INTERNAL, DLG · Labels: API, adminpanel
- On the page: Delivered for DLG: Aditus badge settings restored | Badge "Requested by DLG" in timeline: 2025-Q2 Aditus participant sync

### [EP-47879](https://expoplatform.atlassian.net/browse/EP-47879) · Add Custom Filters for Exhibitor Events
- **S · Shared with other clients**: Reported by DLG + FrankfurterBuchmesse + K5: shared
- Epic · Ready to start · created 2026-01-08 by Elena Potapov
- Reported-by field: DLG, FrankfurterBuchmesse, K5 · Labels: (none)
- On the page: In development for DLG: Custom filters for exhibitor events

### [EP-47929](https://expoplatform.atlassian.net/browse/EP-47929) · Changing the sourse URL for the external floor plan (ExpoFP)
- **W · Not a DLG request**: Reported by INTERNAL, A3, Vinexposium; describes a problem during Agritechnica 2025 → a fix after a DLG incident, not a DLG request
- Story · Done · created 2026-01-09 by Elena Potapov
- Reported-by field: INTERNAL, A3, Vinexposium · Labels: (none)
- On the page: Delivered for DLG: Safer floor plan updates between web and app
- Quote (description): "…**Background:** During the Agritechnica event in 2025, we encountered the following issue: * ExpoFP updated the SDK for the floor plan. * The Mobile …"
- Quote (description): "… in a similar situation for the next time. * The customer has been informed and has agreed to this test for **Agritechnica 2025**. * We need to investigate: **if we change the floor plan URL on the live event, will there be any issu…"

### [EP-48297](https://expoplatform.atlassian.net/browse/EP-48297) · Error Handling - Custom Badge Page
- **C · Reported-by field only**: Reported by DLG; follow-up to EP-25790 (strong)
- Story · Done · created 2026-01-20 by Taimoor Zulfiqar
- Reported-by field: DLG · Labels: DoDUserStory
- On the page: Delivered for DLG: Clearer badge messages with Aditus | Badge "Requested by DLG" in timeline: 2026-Q1 Clearer custom badge errors with Aditus
- Quote (comment, Ibrokhim Movlonov, 2026-02-05): "…🎉 Build successfully uploaded! Available on TestFlight: **DLG-Feldtage 2024** 1.94.8 (10735).…"

### [EP-51701](https://expoplatform.atlassian.net/browse/EP-51701) · Adding sorting and multi-select to internal floorplan
- **W · Not a DLG request**: Nothing in Reported by; Agritechnica used only as an example
- Story · Done · created 2026-04-13 by Taimoor Zulfiqar
- Reported-by field: (empty) · Labels: DoDUserStory
- On the page: Delivered for DLG: Hall and stand management for large events | Badge "Requested by DLG" in timeline: 2026-Q2 Floor plan management improvements
- Quote (description): "…s such as deleting multiple halls or stands at once. This is particularly problematic for large events (e.g., Agritechnica with 27 halls), where organizers must manually scroll, search, and delete each hall individually. This proces…"
- Quote (description): "…ete features work for any event using the Floor Plan backend. ### Other information * Example event impacted: Agritechnica (27 halls). * Current workaround for organizers is to scroll, search, and delete halls one by one, which is i…"

### [EP-52820](https://expoplatform.atlassian.net/browse/EP-52820) · Investigate and fix mobile app sync process for past/expired events
- **W · Not a DLG request**: Tech debt; cites bug EP-50071 (DLG: Agritechnica 2025) as one cause → not a request
- Story · Done · created 2026-05-04 by Konstantin Shein
- Reported-by field: (empty) · Labels: tech-debt
- On the page: Delivered for DLG: Past events stay available in the app
- Quote (description): "…he mobile app when accessing past or expired events. Previous bugs related to this issue include: * EP-50071 (DLG: Agritechnica 2025) * EP-52817 (HINTE: Intergeo 2025) An immediate workaround for EP-50071 involved regenerat…"
- Quote (description): "…bile app when accessing past or expired events. Previous bugs related to this issue include: * EP-50071 (DLG: Agritechnica 2025) * EP-52817 (HINTE: Intergeo 2025) An immediate workaround for EP-50071 involved regenerating the "zero …"

### [EP-53978](https://expoplatform.atlassian.net/browse/EP-53978) · Enhancing Privacy for Opted-Out Users: Favouriting Features and GDPR Compliance
- **S · Shared with other clients**: Reported by DLG + FBF; sits under the IMEX GDPR epic: shared with IMEX and FBF
- Story · Done · created 2026-05-29 by Oleksandr Parashchuk
- Reported-by field: DLG, FBF · Labels: DoDUserStory
- On the page: Delivered for DLG: Private favourites for opted-out visitors | Badge "Requested by DLG" in timeline: 2026-Q3 Private favourites for opted-out users

### [EP-55477](https://expoplatform.atlassian.net/browse/EP-55477) · Bulk connection delete is not private-favourite-aware
- **C · Reported-by field only**: Reported by DLG; follow-up to EP-53978
- Story · Ready for testing · created 2026-07-20 by Oleksii Tur
- Reported-by field: DLG · Labels: (none)
- On the page: In development for DLG: Private favourites: bulk removal

### [EP-55642](https://expoplatform.atlassian.net/browse/EP-55642) · Enhancing Exhibitor Import to Attach Brands Across Events
- **S · Shared with other clients**: Reported by ANWR + DLG: shared
- Story · Done · created 2026-07-28 by Oleksandr Parashchuk
- Reported-by field: ANWR, DLG · Labels: DoDUserStory
- On the page: Delivered for DLG: Brands attached across events on import | Badge "Requested by DLG" in timeline: 2026-Q3 Region filters and brand import

### [EP-57098](https://expoplatform.atlassian.net/browse/EP-57098) · All Day Session in the calendar view
- **W · Not a DLG request**: Reported by INTERNAL; DLG only in a prototype name (/dlg-g3) → part of the general calendar work
- Story · Ready for release · created 2026-09-08 by Kavinder Rawal
- Reported-by field: INTERNAL · Labels: DoDUserStory
- On the page: In development for DLG: Session calendar: all-day sessions and track order
- Quote (comment, Oleksandr Zakablukov, 2026-09-14): "… Session in calendar view specifies the promoted card's title as maximum 2 lines. The approved G3 prototype (/dlg-g) renders 3, and so does our implementation. Where the 2 comes from: in the prototype the line count is a pe…"

### [EP-57253](https://expoplatform.atlassian.net/browse/EP-57253) · Language Filter for Sessions and Exhibitor Events (Web)
- **S · Shared with other clients**: Reported by DLG + HINTE: shared
- Story · Ready to start · created 2026-09-11 by Oleksandr Parashchuk
- Reported-by field: DLG, HINTE · Labels: mig-in-preparation
- On the page: In development for DLG: Language filter for sessions and exhibitor events

### [EP-57347](https://expoplatform.atlassian.net/browse/EP-57347) · API V2 — Add filter_1 to filter_5 support on sessions/set
- **A · DLG named as asking**: Comment: 'After the DLG escalation…'; Reported by DLG
- Story · Done · created 2026-09-15 by Pedro Goncalves
- Reported-by field: INTERNAL, DLG · Labels: DoDUserStory
- On the page: Delivered for DLG: Custom session filters in the API | Badge "Requested by DLG" in timeline: 2026-Q3 API sponsor analytics and session filters
- Quote (comment, Pedro Goncalves, 2026-09-15): "…aluate the ticket, provide us with estimates, and proceed with its development. @Konstantin Shein → After the DLG escalation, we have to change our internal pipeline and priorities - This DLG Request is one of the top items…"

### [EP-57348](https://expoplatform.atlassian.net/browse/EP-57348) · API V2 — Return filter_1 to filter_5 on sessions/get and sessions/getSession
- **A · DLG named as asking**: Companion of EP-57347 (same DLG escalation); Reported by DLG
- Story · Done · created 2026-09-15 by Pedro Goncalves
- Reported-by field: INTERNAL, DLG · Labels: DoDUserStory
- On the page: Delivered for DLG: Custom session filters in the API | Badge "Requested by DLG" in timeline: 2026-Q3 API sponsor analytics and session filters

### [EP-57428](https://expoplatform.atlassian.net/browse/EP-57428) · [Exhibitor] Update AccountsInteractionsReport to expose sync_ts
- **C · Reported-by field only**: Reported by DLG, set by our team; no DLG wording in the ticket
- Story · Ready for testing · created 2026-09-17 by Konstantin Shein
- Reported-by field: DLG · Labels: (none)
- On the page: In development for DLG: Reliable incremental sync of interaction statistics

### [EP-57430](https://expoplatform.atlassian.net/browse/EP-57430) · [Exhibitor] Update SponsorAccountsInteractionsReport to expose sync_ts
- **C · Reported-by field only**: Reported by DLG, set by our team; no DLG wording in the ticket
- Story · Ready for testing · created 2026-09-17 by Konstantin Shein
- Reported-by field: DLG · Labels: (none)
- On the page: In development for DLG: Reliable incremental sync of interaction statistics

### [EP-57471](https://expoplatform.atlassian.net/browse/EP-57471) · Cloning: remap session type "Visible to" / "Available to" ids to the cloned event
- **W · Not a DLG request**: Reported by INTERNAL; follow-up to DLG-Feldtage bug EP-56645 → a fix, not a request
- Story · In testing · created 2026-09-17 by Maryna Dovgal
- Reported-by field: INTERNAL · Labels: tech-debt
- On the page: In development for DLG: Session audiences kept when cloning events
- Quote (description): "…Follow-up to EP-56645 (DLG-Feldtage). When an event is cloned, session **types** carry their per-event audience settings — "Visible to" …"
- Quote (description): "…Follow-up to EP-56645 (DLG-Feldtage). When an event is cloned, session **types** carry their per-event audience settings — "Visible to" (`setting…"

### [EP-57478](https://expoplatform.atlassian.net/browse/EP-57478) · Track-Based Session Ordering in Calendar View
- **A · DLG named as asking**: Description: 'DLG (Dennis Schmitz) raised this in the Sep 8 weekly call'
- Story · Open · created 2026-09-17 by Kavinder Rawal
- Reported-by field: INTERNAL · Labels: (none)
- On the page: In development for DLG: Session calendar: all-day sessions and track order
- Quote (description): "…ing") can appear in column 1 at 10:00 but jump to column 3 at 13:00 depending on what other sessions overlap. DLG (Dennis Schmitz) raised this in the Sep 8 weekly call: "When you look from top to bottom, you can see whether…"
- Quote (description): "… can appear in column 1 at 10:00 but jump to column 3 at 13:00 depending on what other sessions overlap. DLG (Dennis Schmitz) raised this in the Sep 8 weekly call: "When you look from top to bottom, you can see whether a sessi…"

### [EP-57533](https://expoplatform.atlassian.net/browse/EP-57533) · Academic Title for Event Participants
- **B · DLG case in the ticket**: Description: 'DLG and FBM are pushing credentials through workarounds'; EuroTier freeze discussed; Reported by INTERNAL
- Story · Open · created 2026-09-18 by Kavinder Rawal
- Reported-by field: INTERNAL · Labels: (none)
- On the page: In development for DLG: Academic titles for EuroTier 2026
- Quote (description): "…* * Export & API `academic_title`, the `title`/Aditus nuance (D4) * Import matching, tie-break, column order, DLG feeds, repointing Aditus/SessionBoard (D1–D3, D5) * Webhook token for external print services (D6) **Data Sci…"
- Quote (description): "…a simple field turns into coordination across 5 teams and two release cycles — and none of it fits within the EuroTier freeze in mid-October.…"
- Quote (comment, Kavinder Rawal, 2026-09-18): "…d per event by the organiser, not preconfigured by us. Values can be added, reordered, edited and translated. DLG can lock EuroTier to their four values; FBM can add whatever range they need. _Prefix vs. suffix_ — nothing i…"
- Quote (comment, Elena Potapov, 2026-09-19): "…xpectation of having a proper standard field available is valid, and that's what this story should deliver. * EuroTier freeze — hard to pin down, since the sessions are already live and Sessionboard needs time for the mapping. M…"

### [EP-57544](https://expoplatform.atlassian.net/browse/EP-57544) · Mobile: display Academic Title next to participant names on agenda session cards, speaker list and attendee profile cards, without truncating the name
- **B · DLG case in the ticket**: Description: 'DLG and FBM are pushing credentials through workarounds'; Reported by INTERNAL
- Story · Open · created 2026-09-21 by Taimoor Zulfiqar
- Reported-by field: INTERNAL · Labels: (none)
- On the page: In development for DLG: Academic titles for EuroTier 2026
- Quote (description): "…ers a participant's name as first + last, with salutation where one is stored. There is no academic title, so DLG and FBM are pushing credentials through workarounds (a custom title1 select, and titles typed into the first-…"

### [EP-57562](https://expoplatform.atlassian.net/browse/EP-57562) · Minimal Release for Academic Titles at EuroTier 2026
- **B · DLG case in the ticket**: Title: 'Minimal Release for Academic Titles at EuroTier 2026'; Reported by INTERNAL
- Story · Ready to start · created 2026-09-21 by Kavinder Rawal
- Reported-by field: INTERNAL · Labels: (none)
- On the page: In development for DLG: Academic titles for EuroTier 2026
- Quote (comment, Maryna Dovgal, 2026-09-22): "…1 is now _"Value-list mismatch"_. On EP-57533 the mobile split was discussed and accepted as a parity gap for EuroTier. Does that decision still hold for this minimal release? The answer decides whether the mobile team has to be…"

### [EP-57577](https://expoplatform.atlassian.net/browse/EP-57577) · Mobile app: allow opted-out users to favourite exhibitors, visitors and products
- **C · Reported-by field only**: Reported by DLG; mobile follow-up to EP-53978
- Story · Done · created 2026-09-21 by Taimoor Zulfiqar
- Reported-by field: DLG · Labels: (none)
- On the page: Delivered for DLG: Private favourites for opted-out visitors | Badge "Requested by DLG" in timeline: 2026-Q3 Private favourites for opted-out users

### [EP-57684](https://expoplatform.atlassian.net/browse/EP-57684) · Integrations catalog: move SAML 2.0 settings to a dedicated integration page (urgent – DLG)
- **A · DLG named as asking**: Description: 'DLG has asked, as an urgent request'
- Story · Done · created 2026-09-23 by Mykola Litvynchuk
- Reported-by field: INTERNAL · Labels: DLG, integrations-catalog, saml
- On the page: Delivered for DLG: Dedicated SAML single sign-on page | Badge "Requested by DLG" in timeline: 2026-Q3 Integrations catalogue
- Quote (description): "…L 2.0** (`saml`, Auth section), still points `pageUrl` at the shared legacy page `/admin/general/settings`. **DLG** has asked, as an urgent request, for SAML to have its own dedicated settings page. We're pulling SAML out o…"
- Quote (description): "…che). * \[ \] API-E2E pageUrl routing check (SHAPE-07, EP-55347) is updated for `saml`. * \[ \] Verified on a DLG event before release. ## Out of scope * Moving other non-hub integrations (SSO, Cognito, ReachFive, IIRIS, Ge…"

### [EP-57824](https://expoplatform.atlassian.net/browse/EP-57824) · [DLG][iOS] Suppress tracking scripts and cookie banner on web pages opened inside the mobile app (?application=true)
- **A · DLG named as asking**: Description names 'the DLG / EuroTier iOS app'; Reported by DLG
- Story · Ready for testing · created 2026-09-24 by Mykyta Fastovets
- Reported-by field: DLG · Labels: (none)
- On the page: In development for DLG: Cleaner web pages inside the EuroTier app
- Quote (description): "…e way as native functionality in your app, unless you are enabling the user to navigate the open web."_). The DLG / EuroTier iOS app (old app, no native registration) opens the registration page `https://digital.eurotier.co…"
- Quote (description): "…as native functionality in your app, unless you are enabling the user to navigate the open web."_). The DLG / EuroTier iOS app (old app, no native registration) opens the registration page `https://digital.eurotier.com/index/reg…"


## Change, 25 Sep 2026

- Removed "Custom filters for exhibitor events" (EP-47879) from In development for DLG: EP-47879 is an Epic, not a Story, and none of its 6 child stories is reported by DLG (3 are Frankfurter Buchmesse, 3 have no reporter).
