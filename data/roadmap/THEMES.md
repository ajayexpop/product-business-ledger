# Product evolution roadmap: themes (v2, confirmed 25 Sep 2026)

Customer-facing. Derived from the 709 done stories 2023–2025 (`data/<year>/stories.json`) and the 2026 cache
(`data/stories/cache/`), read by summary, epic and component. Confirmed by owner 25 Sep 2026: networking formats split out (13 themes); AI is a lane plus a cross-theme badge; integration partners may be named.

| # | Theme (public name) | Scope | Example threads (2023 → 2026) |
|---|---|---|---|
| 1 | Event Websites & Content | Website builder, pages and blocks, custom forms, SEO, multilingual sites | Main menu & header/footer builder → New Website Builder and 30+ content blocks → custom forms and pop-ups → SEO for custom pages → AI-assisted website builder |
| 2 | Registration, Ticketing & Payments | Registration forms and flows, tickets, basket, payments, invoices, tax, discounts | Registration custom questions → new-UI basket and payment page → ticketing (pricing tiers, upgrades, reservations) → invoice payment → new registration experience |
| 3 | Meetings & Matchmaking | One-to-one meeting booking and scheduling, matchmaking scores and sorting, meeting wizard, calendar sync, meeting limits and rules, AI meeting notes | Auto-confirm meetings, blocked times → matchmaking sorting, prefilled meetings → calendar sync → AI meeting notes |
| 3b | Networking Formats | Speed networking, round tables, hosted meeting programmes (generated schedules, confirmation lists, tables) | Speed networking MVP → opt-in speed networking, round tables → meeting programmes with generated schedules and reports |
| 4 | Sessions & Agenda | Sessions, speakers, schedules, exhibitor events, session ratings | New schedule/calendar views → exhibitor events → session ratings, multilingual import → session calendar view → AI agenda builder |
| 5 | Community & Communications | Chat and messaging, groups, comments, push and email notifications, email campaigns | Group chat, comments & likes → campaigns refresh, segmented push → email nurturing, advanced campaign filters → communication channels |
| 6 | Exhibitor & Sponsor Success | Exhibitor manual, exhibitor account, marketplace catalogue, products and brands, parent/child companies, sponsorship, lead capture and lead exports, exhibitor insights | Exhibitor manual and translation tool → exhibitor account redesign, sponsor placements → parent/child companies → Lead Capture Pro → exhibitor insights portal |
| 7 | Onsite, Badges & Floor Plans | Badge builder and printing, check-in app, kiosks, scanning, floor plans, wayfinding | Badge builder, external QR scanning, kiosk conditional logic → interactive floor plans → check-in analytics, GPS/IPS indoor wayfinding, stand bookmarking |
| 8 | Mobile App | Native app capabilities and redesigns (feature parity for other themes goes to that theme, tagged Mobile) | Android list redesigns, Arabic and US English → in-app updates, basket and payment in app, tiered menus → onboarding in app → 2026 enhancements |
| 9 | Analytics & Reporting | Organiser dashboards, reports, exports | New analytics, mobile analytics → check-in analytics refresh, standard reports → meeting programme reports → automated event reporting dashboards |
| 10 | AI & Smart Discovery | Global and AI search, recommendations engine, AI assistants and chatbots (AI features of other themes stay in their theme with the AI badge) | Global search → AI module search, prompt-based exhibitor search, admin chatbot → unified recommendations → AI event assistant and new AI search |
| 11 | Integrations & Open API | Public API v2/v3, native partner integrations, integration hub | API v2 endpoints → registration and scanner partner integrations → API v1→v2 migration, integration hub → Public API v3 |
| 12 | Platform, Security & Admin | Login and SSO, MFA, security and privacy, admin panel experience, performance | Passwordless login, MFA → OTP via WhatsApp/SMS, security fixes → SSO options, onboarding → admin panel redesign and restructure, performance programme |

Cross-theme tags (shown as badges, not lanes): **AI**, **Mobile**.

## Tagging rules (proposed)

- One primary theme per story, by the capability the customer gets (not the team or component).
- Excluded from the page: bug fixes, test and CI work, internal tooling, pure refactors and migrations with no customer-visible
  change (e.g. router rewrites, test rewrites). Kept only as a rolled-up "Platform, Security & Admin" highlight where it
  delivers something customers notice (speed, stability, security).
- Client-specific work is kept only as the general capability, never with the client's name.
- Integration partners may be named (e.g. ExpoFP, Klipso, Map Your Show, Reach5); client names never.
- Internal epic names are rewritten (e.g. a client-named meeting programme becomes "Meeting programmes").
