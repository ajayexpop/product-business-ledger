# Product journey: review pack (25 Sep 2026)

Internal. Every public highlight with its source stories. Approve or edit wording here; `data/roadmap/hl/<theme>_w/highlights.json` holds the data.

## Coming next candidates (each needs a yes/no)

1. **Exhibitor insights portal** (Exhibitor & Sponsor Success): Each exhibitor gets a personal page with their leads, buyer intent and product interest, opened from a secure email link. The first part is already live.
2. **Richer session calendar** (Sessions & Agenda): Multi-day and all-day sessions, redesigned session cards and a track drawer, plus calendar views in the app for sessions and exhibitor events.
3. **More filters for sessions and exhibitor events** (Sessions & Agenda): Custom and required category filters, with filter options sorted alphabetically.
4. **Public API v3 expansion** (Integrations & Open API): More v3 endpoints, starting with listing, reading, creating and updating products.
5. **Technical SEO** (Event Websites & Content): Sitemaps generated with the site, crawlable language switching and finer control over which profile pages search engines index.
6. **Meeting scheduling upgrades** (Meetings & Matchmaking): Meeting credits, clearer messages when a limit is reached, and attaching team members to meetings.
7. **Next-generation speed networking** (Networking Formats): A rebuilt speed networking service covering check-in, opt-in and automatic registration.
8. **Meeting analytics in reporting dashboards** (Analytics & Reporting): A meeting statistics tab in the embedded event reporting dashboards.
9. **Tiered access in registration** (Registration, Ticketing & Payments): Multi-tier gating in the new registration, and payment details in registrant reports.
10. **Integration hub field controls** (Integrations & Open API): Per-field mapping controls for native integrations.
11. **Offline floor plans in the app** (Onsite, Badges & Floor Plans): The ExpoFP floor plan available in the Android app without a connection.
12. **Automated SSO provisioning** (Platform, Security & Admin): SAML user accounts provisioned automatically, without manual setup.
13. **AI search in the marketplace** (AI & Smart Discovery): Marketplace search moves to the new AI search.

## Highlights by quarter


### 2023-Q1

- ★ **Registration language preference** · Registration, Ticketing & Payments  
  Let registrants choose their preferred language at sign-up so their emails and notifications arrive in that language.  
  _A Language Preference system field was added to exhibitor and visitor registration forms, defaulting to the event language and supported in import and export. All emails and system notifications then use the chosen language._  
  `EP-7417`
- **Registration form field options** · Registration, Ticketing & Payments  
  Build richer registration forms with website, state/region and city fields, and show the registrant’s category on the confirmation page.  
  _Custom text fields can be set as website fields that render as clickable links. Custom select fields can list states/regions or cities. Confirmation page scripts gain a category variable, showing “No category” when none was chosen._  
  `EP-7851 EP-9415 EP-14498`
- **Automatic meeting cancellation** · Meetings & Matchmaking  
  Automatically cancel a participant's meetings and bookings when they become inactive or move to a category without meetings.  
  _Organisers can switch on automatic cancellation of confirmed, incoming and pending meetings, session bookings and exhibitor events when a participant's status is no longer active, and of meetings a user started when they move to a category that does not allow meetings, with the reason stated._  
  `EP-12587 EP-12585`
- **Meeting confirmation and location rules** · Meetings & Matchmaking  
  Auto-confirm meetings for chosen participant categories and keep meeting locations accurate once the in-person event ends.  
  _Meeting auto-confirmation can be switched on per participant category. After the last in-person slot, requests offer only online meetings, and when 'other location' is allowed without preset options, requesters type the location themselves. Availability checks on the meeting schedule were also made faster._  
  `EP-10663 EP-12036 EP-14891 EP-10875`
- ★ **Exhibitor events** · Sessions & Agenda  
  Let exhibitors create their own events, which organisers approve and publish alongside the conference programme.  
  _Exhibitors create events from the frontend within organiser-set limits and durations; organisers approve or reject them, create events for exhibitors in admin and import them by XLS. Exhibitor events have their own Marketplace tab, booked-attendee lists, stand-restricted locations, invite links and an Events tab in My schedule._  
  `EP-8869 EP-11663 EP-8870 EP-11664 EP-13539`
- **Session filters and speaker display** · Sessions & Agenda  
  Give attendees more ways to filter sessions and show speakers who have not yet activated their accounts.  
  _Tracks can be shown as a session filter, and up to five renamable standard filters can be configured per event. A toggle shows inactive, invited or uploaded speakers on the frontend, and attendees are taken straight to the online session room after signing in._  
  `EP-12563 EP-12365 EP-10629 EP-14618`
- **Chat and comments improvements** · Community & Communications  
  Reply to comments live in feeds and groups, and manage several chats at once on the web.  
  _Comments in Feed and Groups update live and support replies. Web chat windows can be minimised to a tab with unread badges, and exhibitors see their team members first when creating group chats._  
  `EP-12037 EP-7755 EP-13046`
- ★ **Parent and child exhibitors** · Exhibitor & Sponsor Success  
  Parent exhibitors can manage their own child companies directly from the event website.  
  _A new 'My child exhibitors' page lets parent exhibitors search for, add or create child exhibitors. Organisers switch it on and set category rules, and new children receive login details by email, or automatically generated logins where single sign-on is used._  
  `EP-11754`
- **Exhibitor content limits** · Exhibitor & Sponsor Success  
  Set how much marketing content and news text each exhibitor category or exhibitor can publish.  
  _Organisers set marketing content limits per exhibitor, description length limits for marketing files and article length limits for news per category (0 for unlimited). Long descriptions expand with a More button, and uploads show a progress spinner._  
  `EP-12718 EP-11932 EP-7239 EP-10301`
- **Marketplace and profile improvements** · Exhibitor & Sponsor Success  
  Tailor how the marketplace, cards and category pickers behave for your event.  
  _Organisers set the default number of marketplace items per page, can show zip codes on exhibitor and product cards, and choose whether ticking a category also ticks its sub-categories. Brands with many products link to a full, paginated product list._  
  `EP-11579 EP-13284 EP-13930 EP-12034`
- **Sponsor banners and category-level sponsorship** · Exhibitor & Sponsor Success  
  Place sponsor banners on profile pages and set sponsorship for a whole exhibitor category at once.  
  _One or two rotating sponsor banners can appear on every My profile page, set per device. Exhibitor categories gain 'Is sponsor', 'Show in search list' and 'Show sponsor pop-up' toggles that apply to all their exhibitors, including through import and the API, without overwriting manual settings._  
  `EP-11115 EP-12564 EP-12584`
- **Sponsored sessions on exhibitor profiles** · Exhibitor & Sponsor Success  
  Show the sessions an exhibitor sponsors on its profile and let sponsors see who booked or attended them.  
  _Exhibitor profiles show a Sponsored sessions block automatically when the exhibitor sponsors sessions. The sponsor's dashboard adds 'Booked a session' and 'Attended session' columns covering online, onsite and on-demand attendance._  
  `EP-7172 EP-11165 EP-14378`
- ★ **Interactive floor plans** · Onsite, Badges & Floor Plans [Mobile]  
  Give attendees a new interactive floor plan on web and app, with exhibitor names on stands and one-click links from exhibitor cards.  
  _Admins draw and delete stands, show exhibitor names and stand labels that scale with zoom, hide stands or labels, and add sponsor banners at the top or side. Stand locations across the platform open the stand on the plan, the apps use the new floor plan, and hall and stand names are checked for duplicates on import._  
  `EP-6677 EP-10211 EP-10209 EP-11652 EP-11659 EP-11711`
- **Badge builder layout controls** · Onsite, Badges & Floor Plans  
  Lay out printed badges precisely, with per-field alignment, margins, rotation, duplication and resizable codes.  
  _Every field in the badge builder, including QR codes, can be aligned left, centre or right, given left and right margins, rotated 180 degrees and duplicated; QR codes and barcodes can be resized and the category field moved. Badge links and codes can also be added to the category-switch registration email._  
  `EP-9800 EP-9801 EP-9802 EP-9803 EP-9812 EP-9822 EP-11106`
- **QR code PDF export** · Onsite, Badges & Floor Plans  
  Export participants’ and exhibitors’ QR codes as a printable PDF, filtered by category and status.  
  _Organisers generate a PDF in the background with one large QR code per page alongside the holder’s details, including external codes._  
  `EP-8049`
- **Report column additions** · Analytics & Reporting  
  Include exhibitor notes and session IDs in exports and reports.  
  _The Exhibitors export can include the notes from each exhibitor profile, and the favourited sessions report and its export show each session’s ID._  
  `EP-11592 EP-12216`
- **Event system content import** · Integrations & Open API  
  Pull exhibitors, sessions and speakers automatically from an external event management system.  
  _Exhibitors, sessions and speakers sync from the external system, configured per event, with exhibitors matched by account number and main contacts added as admin team members._  
  `EP-11456`
- ★ **Passwordless login** · Platform, Security & Admin [Mobile]  
  Let attendees sign in with a one-time code sent by email instead of a password.  
  _Organisers switch on one-time password login per event. Users receive a code valid for three minutes with a short resend cooldown, the password reset window is hidden when codes are in use, and Android users can paste the code._  
  `EP-11098 EP-12623 EP-12541`
- **Participant email warnings** · Platform, Security & Admin  
  Spot participants with generated, missing or undeliverable email addresses directly in the admin panel.  
  _The participants list and meeting wizard mark accounts that use a generated placeholder email, have no email, or have an email domain that cannot receive mail, with the error named next to the warning._  
  `EP-12726 EP-14907`
- **Profile and page access improvements** · Platform, Security & Admin  
  Find options faster in profile select fields and control public page access with the sign-in setting.  
  _Country, city, region, nationality and custom select fields gain live search, including multi-select. Access to public file pages now follows the exhibitor sign-in access setting rather than the content preview toggle._  
  `EP-12583 EP-11778`

### 2023-Q2

- **Website SEO and form tracking improvements** · Event Websites & Content  
  Event websites are easier for search engines to read, and form analytics record only genuine submissions.  
  _Every page now has an H1 heading, page markup errors reported by the W3C validator were fixed and internal links were optimised for search. Form tracking codes fire only after a form passes validation and submits successfully._  
  `EP-15215 EP-14868 EP-13371 EP-15216`
- **Default participant category** · Registration, Ticketing & Payments  
  Every event now has a default participant category, so uncategorised participants always get sensible limits and settings.  
  _The default category is created with each event, cannot be deleted and has its own limits and settings. Participants without a category, or whose category is deleted, fall back to it._  
  `EP-14938`
- **Meeting and matchmaking card improvements** · Meetings & Matchmaking  
  See who you are meeting and where at a glance, with clearer meeting cards and company names on matchmaking cards.  
  _Calendar meeting cards now show the other party and location first, then time and title. Matchmaking cards show the participant's company name. In the admin meeting management pages, participant photos and names link to their edit pages, and contact sharing settings are grouped into three labelled sections._  
  `EP-16028 EP-16700 EP-15162 EP-17817`
- **Meeting request improvements** · Meetings & Matchmaking [Mobile]  
  Attach files to meeting requests, return to where you started after booking, and run the meetings grid in 20-minute steps.  
  _Requesters can attach a file to a meeting request in the app when organisers enable it. Users can be returned to the page where they started a request, keeping filters and pagination. A 20-minute time step was added to the meetings grid, with matching maximum meeting lengths._  
  `EP-10170 EP-10598 EP-18170`
- **Meeting rescheduling controls** · Meetings & Matchmaking [Mobile]  
  Reschedule meetings faster from the existing slot, and hide rescheduling for chosen roles and categories on web and app.  
  _The rescheduling time grid now opens on the meeting's current date with its time preselected. A 'Disallow meeting reschedule for' setting hides the Reschedule button on meeting cards for selected roles and categories, on web and in the app._  
  `EP-16261 EP-17344 EP-17598`
- **Schedule blocking for speakers** · Meetings & Matchmaking  
  Stop meetings from being booked over speakers' and moderators' sessions, and keep blocking events from clashing with confirmed meetings.  
  _Speakers' and moderators' calendars are blocked during their sessions and exhibitor events for meeting requests and confirmations. Slot-blocking exhibitor events can no longer be booked over confirmed meetings, blocked time, other blocking events or speaker duties._  
  `EP-16776 EP-17284`
- **Exhibitor event editing controls** · Sessions & Agenda  
  Lock approved exhibitor events against changes and give organisers clearer status and import options.  
  _A session-type toggle stops exhibitors editing or deleting events once approved, while organisers can still edit them. Ended events show a Past status, imports accept child exhibitor and contact IDs, and events are checked against session-type and stand hours._  
  `EP-13125 EP-15676`
- **Exhibitor events in the app** · Sessions & Agenda [Mobile]  
  Let app users browse all exhibitor events, add them to their schedule and see the ones they have booked.  
  _The iOS and Android apps gain an all exhibitor events list with date switching and filters, and a My exhibitor events page listing booked events, with a Download My Schedule button to save the schedule as a PDF._  
  `EP-14321 EP-14310 EP-16775`
- **Session import and schedule download** · Sessions & Agenda  
  Import and export session filters in bulk and download a personal schedule from a clearly named button.  
  _The five session filters are included in the sessions XLS import and export. The Export data button on My Schedule and Team Schedule becomes Download My Schedule, and session loading was sped up with additional database indexes._  
  `EP-16749 EP-15375 EP-18389`
- **Multilingual marketing emails** · Community & Communications  
  Send marketing emails in each recipient’s chosen language.  
  _Email sender and campaign templates can be written per language, and recipients receive the version in their selected language, falling back to the default language._  
  `EP-7416`
- **Exhibitor setup improvements** · Exhibitor & Sponsor Success  
  Give uncategorised exhibitors sensible defaults and control product limits and manual navigation.  
  _Each new event gets a Default exhibitor category whose settings and limits apply to uncategorised exhibitors. Organisers can block adding products once the active-product limit is reached and set the default products tab, and each exhibitor manual link now opens its own section._  
  `EP-14937 EP-10479 EP-15338`
- **Faster marketplace and product imports** · Exhibitor & Sponsor Success  
  Marketplace pages load faster and product imports update search more efficiently.  
  _Duplicate queries were removed from the marketplace page, and product search indexing now runs once at the end of an import and only for fields that changed._  
  `EP-17039 EP-16538 EP-17329`
- **Lead scanning across co-located events** · Exhibitor & Sponsor Success [Mobile]  
  Scan the badges of attendees from co-located events and jump straight to their profiles.  
  _With a new contact-sharing setting on, the app saves scans from other events in the same database with an 'other event' label, and scan reports gain an event name column. After a scan, tapping a person's name or a team member's company opens their profile._  
  `EP-5445 EP-8788`
- **Leads from meetings and exhibitor events** · Exhibitor & Sponsor Success  
  Turn exhibitor event bookings and meetings of any status into leads.  
  _Exhibitors holding their own events see bookings in the Interactions dashboard and, if enabled, as leads in Download leads, with private details optionally hidden. A new setting includes pending, incoming, confirmed and cancelled meetings in leads files without duplicates._  
  `EP-16707 EP-16456`
- **Rich text for profiles and news** · Exhibitor & Sponsor Success  
  Format company descriptions and news articles with headings, lists, images and links.  
  _The full text editor is available for 'About the company' in the exhibitor profile editor and for exhibitor news, with headings, bold, italic, underline, lists, alignment, quotes, photos and links._  
  `EP-13852 EP-16131`
- **Sponsor banner and card layout** · Exhibitor & Sponsor Success  
  Sponsor banners and cards display cleanly on tablets and phones.  
  _On smaller screens, marketplace sponsor banners and the product finder sit in a compact block above the filters, and sponsor and sponsored product cards are laid out six in a row._  
  `EP-16209 EP-17760`
- ★ **External QR and barcode scanning** · Onsite, Badges & Floor Plans [Mobile]  
  Scan external QR codes, barcodes and co-located event badges at check-in, in the app and at kiosks.  
  _Unknown codes are saved rather than rejected, and the check-in list report shows each scanned code and, where recognised, its event. An optional setting lets the mobile app scan and store any code, and kiosks check in participants whose external codes came from an integration or the API._  
  `EP-2338 EP-5714 EP-5643 EP-15575`
- **ExpoFP floor plan linking** · Onsite, Badges & Floor Plans [Mobile]  
  Send attendees from any stand link on web or app straight to the right stand on an ExpoFP floor plan.  
  _Organisers choose dynamic linking, a static URL or no link. Stand links on marketplace, exhibitor, product, session, exhibitor event, schedule and recommendation pages, and on app profiles and lists, follow the setting._  
  `EP-14266 EP-15370 EP-15109`
- **Kiosk check-in improvements** · Onsite, Badges & Floor Plans  
  Help visitors find themselves and register faster at self-service kiosks.  
  _Kiosk search by name or email now returns every matching participant, loaded in batches. The kiosk registration form supports the same conditional logic as the web registration form builder._  
  `EP-14045 EP-14036`
- **US English and wording updates** · Mobile App  
  Offer the app in US English and use clearer wording on public profiles.  
  _The apps pick US English from the phone’s locale, with US spellings such as “Favorites”. The “Matchmaking information” section on public profiles is now called “Profile Information”, and the Android app’s network security settings were tightened._  
  `EP-12277 EP-12279 EP-18158`
- ★ **New analytics** · Analytics & Reporting  
  Track registrations, content performance and activity in a new analytics dashboard.  
  _Dashboard widgets show participants, exhibitors, content and actions, plus online participants by country and interest. Registration widgets break down sign-ups over time by category, country and interest, and content widgets cover news, sessions, on-demand, webinars and downloads. Pages open on a range a month either side of the event._  
  `EP-9620 EP-9617 EP-9618 EP-16587`
- **Export progress and cancellation** · Analytics & Reporting  
  Follow the progress of exports and cancel them when needed.  
  _Exports show a percentage progress indicator and a cancel button, and a clear status while the file is being generated. The check-in export runs faster._  
  `EP-8159 EP-8160 EP-15627 EP-16615`
- **Mobile app analytics** · Analytics & Reporting [Mobile]  
  See how attendees use the mobile app, including logins and unique users per app.  
  _A mobile app logins report lists each login on iOS and Android with profile fields, supporting unique login counts. An App data tab in analytics shows page views, unique badge scans and unique logins per platform._  
  `EP-5767 EP-13816 EP-17000`
- ★ **Visit badge and scanner integration** · Integrations & Open API [Mobile]  
  Use Visit digital badges and the Visit lead scanner inside the platform, with scanned leads pulled back in.  
  _Organisers can switch on the external Visit badge and lead scanner for web and app, sync leads scanned in Visit into the platform, and choose email or external ID as the matching identifier._  
  `EP-14602 EP-14603 EP-14604 EP-15993`
- **Meeting data in the public API** · Integrations & Open API  
  Retrieve full meeting data through the public API, including incremental updates since your last sync.  
  _A paginated endpoint returns every meeting with the same fields as the meetings export, with filters by account and time and sort options. Session responses include the exhibitor ID for exhibitor events, updating an exhibitor's hall and stand also moves their pre-scheduled meetings, and the account interactions endpoint was documented._  
  `EP-9435 EP-11708 EP-12023 EP-15587 EP-16716`
- ★ **Full module management** · Platform, Security & Admin  
  Switch every admin panel section and sub-section on or off to match each event.  
  _Global and event module management were restructured so every admin menu tab and sub-tab can be toggled, including a separate networking and matchmaking section. Analytics tabs redirect correctly when a module is turned off._  
  `EP-17025 EP-17456`
- **Admin action log** · Platform, Security & Admin  
  Search, filter and export a full history of actions taken in the admin panel.  
  _A new admin action log offers event, date, controller and action filters, search within request content and XLS export, and records newer admin panel actions._  
  `EP-15209 EP-17879`
- **Arabic language option** · Platform, Security & Admin  
  Offer Arabic as a platform language for your event.  
  _Arabic is available as a platform language, shown as AR in the language list._  
  `EP-18005`
- **Assigned admins for accounts** · Platform, Security & Admin  
  Assign a responsible admin to each exhibitor or participant and filter lists by them.  
  _The admin exhibitor and participant lists gain an assigned admin column, an assignment pop-up, and filtering and sorting by assigned admin._  
  `EP-12814`
- **Clearer admin panel settings** · Platform, Security & Admin  
  Understand admin settings more easily with clearer names, tooltips and introductory text.  
  _Several confusing settings were renamed, tooltips were added across admin modules, selected pages show a short intro explaining their purpose, and fields with errors are highlighted in exhibitor category settings._  
  `EP-15967 EP-15966 EP-17816 EP-16764`
- **Easier account activation** · Platform, Security & Admin [Mobile]  
  Help users with inactive accounts activate them straight from the login screen on web and app.  
  _Inactive users see one clear activation message across web and the iOS and Android apps, with a resend activation link action, including for one-time password login. The activation notice takes priority over a wrong-password error._  
  `EP-14583 EP-15585 EP-14942 EP-17488 EP-18121`
- **Faster search indexing and listings** · Platform, Security & Admin  
  Get search results and marketplace listings up to date and loading faster.  
  _Search indexing after event cloning and for whole events now runs in bulk, exhibitor list requests on the marketplace page were reorganised, and additional database indexes were added._  
  `EP-13513 EP-17299 EP-17384 EP-18427`
- **Spam protection for exhibitor sign-up** · Platform, Security & Admin  
  Protect exhibitor registration from spam submissions.  
  _Frontend exhibitor registration includes a mandatory reCAPTCHA step._  
  `EP-16297`

### 2023-Q3

- ★ **New website builder** · Event Websites & Content  
  Build event websites in a new visual builder with site-wide styling, custom headers and footers, and mobile-ready pages.  
  _A main menu gives access to blocks, pages, device previews, languages, history, global settings, save and publish. Global settings cover fonts (including uploaded fonts), colours, buttons, favicon and SEO; the header and footer include logo, navigation, search and calls to action. Each event can switch between the old and new builders._  
  `EP-8495 EP-8758 EP-9002 EP-17908 EP-18895 EP-12608`
- **Events page improvements** · Event Websites & Content  
  Visitors see clearer event dates and a tidier filter bar on the events listing.  
  _Event date ranges use compact formats for events within one month, across two months or across two years. The filter reset button appears only when filters are applied._  
  `EP-18740 EP-20654`
- **Category and form setup improvements** · Registration, Ticketing & Payments  
  Control the order participant categories appear in, and avoid duplicate answer options in custom questions.  
  _Participant categories can be reordered by drag and drop or sorted A–Z/Z–A, and that order is used in frontend filters, registration, booking, admin profiles and the app. Custom questions no longer accept answer options with the same name._  
  `EP-17102 EP-20197`
- **Blocked time management** · Meetings & Matchmaking  
  Manage blocked time directly from your schedule, and let exhibitors block time for their team members.  
  _Blocked time is now a schedule item with its own cards and edit and delete actions, managed from the Schedule and Team Schedule pages through an 'Add blocked time' pop-up. Exhibitor companies can set blocked time for team members, and blocked time can apply to exhibitor events only. Allowance settings gained explanatory tooltips._  
  `EP-17281 EP-12377 EP-20318 EP-22218`
- **Calendar sync improvements** · Meetings & Matchmaking  
  Get clearer meeting details in synced Outlook and Google Calendar entries.  
  _Synced Outlook meeting entries include a structured block with companies, participants, title and message. A Google Calendar option excludes attendee emails and puts participant names in the event description instead, matching the Outlook behaviour._  
  `EP-16103 EP-18010`
- **Hosted buyer team setup** · Meetings & Matchmaking  
  Bring exhibitor team members into a hosted buyer programme with a single approval and the right category automatically.  
  _For private events with public registration, buyer-category team members need only one hosted buyer acceptance. A default category setting assigns a buyer category to team members that exhibitors create themselves._  
  `EP-2749 EP-15824`
- **Meeting completion by badge scan** · Meetings & Matchmaking  
  Mark confirmed meetings as completed simply by scanning the other participant's badge, with completion visible in exports and the API.  
  _Badge-scan auto-completion covers regular meetings, with an option to complete meetings scanned outside the meeting time. Completion appears in exports and the API. A scan by any of an exhibitor's team members completes meetings the exhibitor joined before adding team members._  
  `EP-15159 EP-20254`
- **Meeting ratings** · Meetings & Matchmaking  
  Ask attendees to rate their meetings after each meeting, daily or after the event, by email, WhatsApp or SMS.  
  _Organisers choose when ratings are requested for each role or category. Digest emails list meetings to rate and link straight to the ratings page or the app, and the email template is now named 'Meeting Ratings'._  
  `EP-12571 EP-20842`
- **New meeting request flow** · Meetings & Matchmaking  
  Book a meeting on a single page that shows both sides' live availability for date, time, location and duration.  
  _An optional new meeting request flow brings participants, date, time, location and duration onto one page. Users see all bookable dates for both sides, each choice updates the remaining options, and clear error messages explain what needs fixing._  
  `EP-17352 EP-21476`
- **New schedule calendar view** · Meetings & Matchmaking [Mobile]  
  See your schedule in a calendar view that separates committed meetings from optional activities, on web and in the app.  
  _Schedule pages are split into Diary and Optional Activities, with team member selection, activity filters and a legend. The app gained a matching calendar view for My Schedule and Team Schedule. Organisers set the default view and items shown, and a new time picker shows unavailable slots._  
  `EP-18403 EP-18404 EP-20058 EP-20489 EP-20612`
- **Reassign team members to meetings** · Meetings & Matchmaking  
  Let exhibitors swap which team member attends a meeting, including across child companies.  
  _When enabled, a Reassign members button on exhibitor meeting cards opens a pop-up to choose another available team member for the meeting._  
  `EP-17345`
- **Schedule downloads in Excel and app** · Meetings & Matchmaking [Mobile]  
  Download your schedule as an Excel file, including team and child company details, or have it emailed from the app.  
  _Participants can choose PDF or XLS schedule downloads, with team and parent/child company columns for exhibitors. App users can request their schedule and receive it by email as an attachment. Downloaded files now include personal blocked time._  
  `EP-17285 EP-17287 EP-20214 EP-20775`
- **User favourites dashboard** · Meetings & Matchmaking  
  See every participant's favourites with meeting status and notes, and start meetings from them as an organiser.  
  _A favourites dashboard in Networking & Matchmaking lists each favourite with its meeting status, notes and the admin who shared it, and shared filter links now record who shared them._  
  `EP-12576`
- **Session and speaker management improvements** · Sessions & Agenda [Mobile]  
  Avoid double-booking speakers, control anonymous questions and give speakers their own menu page.  
  _Speakers and moderators with blocked time can no longer be assigned to clashing sessions unless organisers allow it. Organisers can hide the Ask anonymously option in session rooms, speakers get a separate menu item, and the apps show the price on past paid sessions._  
  `EP-19325 EP-18536 EP-18460 EP-21415 EP-21399`
- ★ **Email nurturing content blocks** · Community & Communications  
  Add personalised recommendations, meetings, messages and activity to campaign emails.  
  _Campaign email variables show recommended exhibitors, products, sessions and news as cards with meeting, message and favourite actions, plus incoming meetings, unanswered chats and live activity counts. A profile link variable signs recipients in, and templates were rolled out to all events._  
  `EP-14458 EP-14844 EP-14845 EP-14846 EP-15816 EP-20713 EP-20714 EP-20862 EP-21196 EP-15836 EP-21346 EP-21640`
- **Messenger improvements** · Community & Communications  
  Filter chats by who started them and by meeting status, and chat comfortably on mobile web.  
  _Messenger gains filters for who initiated a chat and for meeting status. On mobile web, private chat has a back-to-list button and a fixed header and input._  
  `EP-20716 EP-7084`
- **Segmented push notifications** · Community & Communications  
  Target admin notifications by profile attributes or by what attendees have in their schedule.  
  _Organisers send notifications to users matching advanced profile filters, or who have scheduled a particular session, exhibitor event, type, track or tag._  
  `EP-13566`
- ★ **Custom lead capture questions** · Exhibitor & Sponsor Success [Mobile]  
  Exhibitors add their own questions to the lead capture form so their team records what matters to them.  
  _Exhibitor admins create custom lead questions for their team members, with text, select, multiselect, radio and checkbox types, and answers appear in the leads report. Organisers can open an exhibitor's questions from its admin profile, and duplicate scans are filtered out._  
  `EP-11114 EP-7074 EP-12942 EP-18953 EP-24094`
- **Custom table listings** · Exhibitor & Sponsor Success  
  Show exhibitors and delegates as a configurable table of the fields you choose.  
  _An optional table view for the exhibitor and delegate lists, with an admin builder for choosing and ordering fields. Tables use event branding, show full names on hover and open a pop-up with all of an exhibitor's categories._  
  `EP-12725 EP-20781`
- **Dedicated sponsor section in the marketplace** · Exhibitor & Sponsor Success [Mobile]  
  Sponsors get their own highlighted section above exhibitors on the web and in the app.  
  _Sponsors appear in a separate framed section of cards above the exhibitor list, as an auto-scrolling carousel or static rows. The app gains a sponsors block on exhibitor and product lists, and clicks now count in sponsor statistics._  
  `EP-13907 EP-18978 EP-18109 EP-17790 EP-21461`
- **Exhibitor overview report** · Exhibitor & Sponsor Success  
  Exhibitors download one report covering their company and all child companies.  
  _An Exhibitor Overview spreadsheet in the profile menu lists views, products, content, chats, meetings and badge scans for the exhibitor and each child exhibitor across the event._  
  `EP-17348`
- **Team member interaction controls** · Exhibitor & Sponsor Success [Mobile]  
  Exhibitors decide which team members can take meetings and chat, on the web and in the app.  
  _Exhibitors, and optionally parent exhibitors, switch meetings and chats on or off per team member. The app hides blocked actions and explains why, and the settings are included in the team members export and the public API._  
  `EP-17339 EP-17343 EP-17974`
- **Badge scanning on more Android devices** · Onsite, Badges & Floor Plans [Mobile]  
  Scan badges in the Android app on devices without Google Play services, such as Huawei phones.  
  _The Android app uses an alternative barcode scanner on devices that lack Google Play services, so badge scanning works on them too._  
  `EP-15213`
- **Live location on ExpoFP floor plans** · Onsite, Badges & Floor Plans [Mobile]  
  Show app users their own position as a blue dot on ExpoFP floor plans, powered by Crowd Connected.  
  _The mobile apps use Crowd Connected as the location provider for ExpoFP floor plans, with foreground, background and reminder permission prompts._  
  `EP-20467`
- **Redesigned Android lists and sessions** · Mobile App [Mobile]  
  Browse people, exhibitors, products, brands and sessions in a refreshed Android app design, matching iOS.  
  _Delegate, buyer, exhibitor, product and brand lists, and session cards and pages, were redesigned, with a Live tag, prices and a book button for paid sessions, plus a new no-results screen. Icons across the app follow one consistent style and size._  
  `EP-19631 EP-16391 EP-16392 EP-16393 EP-16394 EP-1130 EP-7197`
- **Custom check-in reports** · Analytics & Reporting  
  Export check-in reports with the columns you choose and see first-time versus repeat scans.  
  _Organisers pick system and custom fields for the check-in report and can export unique check-ins per event or per day, including co-located show badges and external codes, with the scanned code shown._  
  `EP-14043 EP-20031 EP-20384 EP-21474`
- **Dashboard improvements** · Analytics & Reporting  
  Load the favourites dashboard faster and keep table headers in view.  
  _The favourites dashboard uses pre-calculated data refreshed every 30 minutes, with an Update button and last-update time. The interactions table header in visitor and exhibitor dashboards stays fixed while scrolling._  
  `EP-19897 EP-21795`
- ★ **Global search** · AI & Smart Discovery  
  Search the event from one place, with results ranked by weighted relevance across exhibitors, products and brands.  
  _A new search engine scores matches using admin-set multipliers and category weights, supports prefix and fuzzy matching, shows result counters and lets delegates, buyers and speakers be found by activity category._  
  `EP-13095 EP-18744 EP-17512 EP-18807 EP-19249 EP-19173 EP-19784`
- ★ **ExpoFP floor plan integration** · Integrations & Open API  
  Show the interactive ExpoFP floor plan on the event site, with search, deep links and wayfinding.  
  _Enabled with an account token, the ExpoFP floor plan lets attendees search exhibitors, custom locations and sessions, including in-person sessions and exhibitor events with a physical location._  
  `EP-17756 EP-18322 EP-20080`
- **Reach5 login for buyer registration** · Integrations & Open API  
  Let returning buyers log in with their Reach5 account in the buyer registration pop-up.  
  _Reach5 login was added to the buyer registration pop-up used on the repeat-registration link._  
  `EP-17775`
- ★ **Multi-factor authentication for admins** · Platform, Security & Admin  
  Require admins to sign in with a password plus an authenticator app code.  
  _Admin accounts gain an MFA tab to enable authenticator-app login, exclude chosen admins and send MFA setup emails._  
  `EP-11695`
- **Smoother SSO sign-in** · Platform, Security & Admin  
  Let SAML single sign-on users sign in within the same tab and see a custom error page if they are not registered.  
  _The web login pop-up for SAML SSO is replaced by in-tab sign-in that returns users to where they started. Organisers can design a website page to show SSO users who are not found on the event._  
  `EP-17970 EP-17967`

### 2023-Q4

- ★ **Content and dynamic blocks** · Event Websites & Content  
  Add ready-made blocks that show exhibitors, products, brands, sponsors, speakers, sessions and news straight from event data.  
  _A library of static content blocks covers text, media, cards, testimonials, countdown, app download and FAQ. Dynamic blocks display as sliders or static grids, with filters such as category, tag or specific items, plus sorting, cards per row and style settings._  
  `EP-12606 EP-21629 EP-21630 EP-21631 EP-21927 EP-22333 EP-21632 EP-22334`
- **Attendee widget and X branding** · Event Websites & Content  
  Show a rotating set of attendees on the website, and see the updated X logo and name wherever social links appear.  
  _An attendee widget shows a rotating set of attendee cards without interaction buttons. The Twitter logo and name were updated to X in the email builder, registration pages, profiles and exhibitor services._  
  `EP-22016 EP-21984`
- **Media gallery and builder switch** · Event Websites & Content  
  Store and organise website images, videos and files in one gallery, and turn the new builder on per event.  
  _The gallery supports uploads, nested folders, sorting, gallery and list views, video conversion, and renaming, previewing and moving files. A module setting and an event setting control when the new builder is used._  
  `EP-8831 EP-18295 EP-18894`
- **UTM tracking on confirmation pages** · Registration, Ticketing & Payments  
  Attribute registrations to campaigns in Google Analytics, as UTM codes now carry through to the confirmation page.  
  _UTM parameters from the registration URL are passed through to the registration confirmation page, so registrations can be attributed in Google Analytics._  
  `EP-20762`
- **Schedule and meeting limit improvements** · Meetings & Matchmaking  
  Move through event dates more easily and get clearer agenda exports and meeting limit settings.  
  _The Schedule page date selector shows all relevant dates with back and forward arrows. The agenda PDF can include the event logo and date headings. Exhibitor category meeting limits no longer treat zero as unlimited, and delegate page custom filters no longer offer an 'other' option._  
  `EP-21730 EP-22560 EP-23431 EP-23511`
- ★ **Native exhibitor events in the app** · Sessions & Agenda [Mobile]  
  Browse, search and filter exhibitor events in a native app page that follows the same rules as the web.  
  _A native page with Exhibitor Events and On-demand tabs replaces the web view. The apps honour slot blocking, non-removable events, visibility, tracks and speaker, moderator and sponsor display, and moderators are marked with an icon in profiles, lists and sessions._  
  `EP-18257 EP-21137 EP-21963 EP-21681 EP-21682 EP-21683 EP-21685 EP-21686 EP-21687 EP-23610 EP-23609`
- **Multilingual exhibitor events** · Sessions & Agenda [Mobile]  
  Publish exhibitor event names and descriptions in several languages on the web and in the app.  
  _A language switcher lets users read exhibitor events in any supported language, defaulting to the language set by the organiser, with translated event names and descriptions._  
  `EP-23529`
- ★ **Campaigns refresh** · Community & Communications  
  Manage email campaigns in a redesigned area with duplication, warnings and clearer statistics.  
  _The campaigns list and campaign page were redesigned with filters, empty states and statistics. Organisers can duplicate campaigns, are warned about unsaved changes or empty templates, and export data only appears once a campaign has been sent._  
  `EP-20555 EP-20661 EP-23410`
- **Message limit setting** · Community & Communications  
  Set how many messages participants can send.  
  _Organisers can configure a limit on the number of messages._  
  `EP-21855`
- ★ **Exhibitor manual translation** · Exhibitor & Sponsor Success  
  Publish the exhibitor manual in every language your event supports.  
  _Every exhibitor manual section, including section names, can be switched between platform languages and translated in the admin panel, as already possible for registration._  
  `EP-20410`
- **Sponsor management improvements** · Exhibitor & Sponsor Success  
  Find sponsors quickly in the admin panel and let visitors act on sponsor cards.  
  _Admins search sponsors and filter them by sponsor category. Sponsor and sponsored product cards on the marketplace show location and meeting and message buttons on hover, and these interactions count in sponsor reports._  
  `EP-22966 EP-20725`
- **Floor plan improvements** · Onsite, Badges & Floor Plans  
  Navigate the floor plan more easily, with a smoother view, clearer filters and direct links to sessions.  
  _The floor plan view was rebuilt and improved; unneeded hall arrows are hidden for single-hall events; the Visited quick filter lists visited stands; quick filters show a no-results message; and sessions or events on a stand open their public profile._  
  `EP-15556 EP-18025 EP-20136 EP-20222 EP-20149`
- ★ **Arabic app and multilingual pages** · Mobile App [Mobile]  
  Offer the mobile app in Arabic and open in-app pages in the user’s app language.  
  _The mobile app was translated into Arabic. Edit profile, floor plan, basket, exhibitor events and delegates pages open in the app language when the event supports it, otherwise in English._  
  `EP-20409 EP-23090`
- **Login source in login reports** · Analytics & Reporting  
  See whether each login came from the web or the iOS or Android app.  
  _The visitor and exhibitor login report export has a login source column for every login attempt._  
  `EP-13872`
- **Search refinements and new search bar** · AI & Smart Discovery  
  Find content faster with a simpler search bar and more accurate ranking for products, brands, sessions and exhibitor events.  
  _A single redesigned search bar now appears on the marketplace, sessions, delegates, news, groups and floor plan pages. Country is indexed for products and brands, speaker names and exhibitors boost session and exhibitor event results, stop-words are ignored and permission rules filter the delegate list._  
  `EP-19987 EP-20611 EP-21065 EP-21373 EP-19256 EP-20800 EP-24013`
- ★ **Klipso integration** · Integrations & Open API  
  Import exhibitors from Klipso automatically, with categories and custom questions kept up to date.  
  _The integration pulls exhibitor data from Klipso every minute or on demand with a Sync button, maps categories by text, brings in chosen exhibitor custom questions and passes contact email and username._  
  `EP-14473 EP-23914 EP-24104`
- **Public API improvements** · Integrations & Open API  
  Do more through the public API, from exporting buyers to creating products with image links.  
  _A buyers-only export is available through the API, product images can be sent as URLs, session responses include speakers and moderators, exhibitor event 'Other' locations can be set, the indoor maps toggle is exposed and activity category limits can be set when editing profiles._  
  `EP-18331 EP-20177 EP-21351 EP-19915 EP-22242 EP-23662`
- **Aligned module and permission settings** · Platform, Security & Admin  
  Keep meeting and messaging permissions consistent with the modules switched on for an event.  
  _The relationship between module management and the permission matrix for meetings and messages was improved._  
  `EP-16638`
- **Faster floor plans and filters** · Platform, Security & Admin  
  Load integrated floor plans and filters more quickly.  
  _Integrated floor plans are cached and optimised, and the filters service was optimised._  
  `EP-22678 EP-21993 EP-18599`
- **Loading indicators on listings** · Platform, Security & Admin  
  See clear loading feedback while listing pages and session dates load.  
  _Listing pages show loaders while content loads, and the sessions page shows a loader when switching to another date._  
  `EP-17637 EP-21659`
- **Login by badge scan** · Platform, Security & Admin [Mobile]  
  Let app users sign in by scanning their event badge.  
  _Badge-scan login in the mobile app can be switched on per event, limited to chosen categories and shown with a configurable login button. It works with one-time password login and activates the account._  
  `EP-19419`
- **Self-service account deletion** · Platform, Security & Admin  
  Let users choose events and request deletion of their account data from one page.  
  _A single event selection page lists the events a verified user belongs to, so they can select events and delete their account and data._  
  `EP-23063`
- **Simpler one-time password login** · Platform, Security & Admin  
  Let users request a one-time login code whatever their account status.  
  _A one-time code is emailed on request regardless of account status, and inactive users become active once they log in. On public events any user can request a code by email and sign in._  
  `EP-18110`

### 2024-Q1

- **Browser language and consent mode** · Event Websites & Content  
  Websites open in the visitor's browser language when available, with support for cookie consent mode.  
  _The language selector defaults to the visitor's browser language when the site supports it, and visitors can still switch manually. Consent mode support was added for cookie consent._  
  `EP-23702 EP-25964`
- **Rich content and text editing** · Event Websites & Content  
  Build free-form page sections with a full text editor, title blocks and custom HTML that can run scripts.  
  _A Custom Content block offers backgrounds, overlays and a rich-text editor with tables, columns, images and YouTube. Text modules gain a WYSIWYG editor, a Title & Subtitle block comes in six layouts, and custom HTML blocks can run JavaScript._  
  `EP-23990 EP-20868 EP-23051 EP-26881`
- **Category cloning** · Registration, Ticketing & Payments  
  Duplicate participant and exhibitor categories with all their settings, then change only what differs.  
  _A Duplicate button copies a category with all its settings as a named copy. The categories table is also adaptive and supports drag-and-drop ordering._  
  `EP-23224`
- **Print badge link on confirmation page** · Registration, Ticketing & Payments  
  Let visitors print their badge straight from the registration confirmation page.  
  _A Print Your Badge variable can be added to the visitor confirmation page; the link opens the visitor’s badge in a new tab, matching the print option in the profile and admin panel._  
  `EP-10489`
- **Prefilled meeting requests** · Meetings & Matchmaking  
  Save a default subject, message, duration and file once and have them pre-filled in every new meeting request.  
  _In the new web meeting request flow, users save default meeting information from a pop-up or their profile settings, and can still edit it on each request._  
  `EP-17353`
- **Meeting availability filter** · Networking Formats  
  Let buyers filter lists to show only exhibitors and people who still have meetings available.  
  _A 'Meeting availability' filter can be added to exhibitor, product, pavilion, speaker, delegate and buyer lists through display filters, with an explanatory tooltip in the admin panel._  
  `EP-23255 EP-26686`
- **Minimum meeting reminders** · Networking Formats  
  Set a minimum number of confirmed meetings per category and remind participants who have not reached it.  
  _Organisers set a required number of confirmed meetings per category. Users see confirmed versus required meetings on their meetings page and receive automated reminder emails until they reach it._  
  `EP-23256`
- ★ **Other locations for sessions and events** · Sessions & Agenda [Mobile]  
  Place sessions and exhibitor events at venues outside the floor plan, with addresses shown on web and app cards.  
  _Organisers manage a predefined list of other locations for sessions and exhibitor events, can allow a custom alternative location, and can add an address that appears on session cards, in the API and in export and import. The iOS and Android apps show the address on cards._  
  `EP-16777 EP-16736 EP-16739 EP-26791 EP-24407`
- **Schedule and invite link improvements** · Sessions & Agenda [Mobile]  
  Stop attendees adding items that clash with blocked time and show times in event time only if preferred.  
  _Direct invite links for meetings, sessions and exhibitor events add the item and open the schedule, or name the clashing item. A setting hides local time on web and app, session speakers and moderators can be added to exhibitor events, and app session pages gain loading and not-found states._  
  `EP-23542 EP-24305 EP-16928 EP-21759 EP-21758`
- **Badge codes in emails** · Community & Communications  
  Include each recipient’s badge barcode and QR code in campaign and buyer emails.  
  _Badge barcode and QR code variables are available in campaign emails and in the buyer acceptance email, showing internal or external badge codes that the check-in app can scan._  
  `EP-22505 EP-15823`
- **Company and job title on cards** · Community & Communications [Mobile]  
  See who people are at a glance, with company and job title on user cards across web and app.  
  _Participant cards in community, team members, meetings, messenger, profiles and sessions show company name and job title on the web and in the mobile app._  
  `EP-23519 EP-24992`
- **Leads and sponsor export improvements** · Exhibitor & Sponsor Success  
  Leads and sponsor exports carry more context about each interaction.  
  _Leads exports add exhibitor event date and time and, if enabled, meeting rating notes. The exhibitor export's custom field list was updated, and sponsor statistics exports use a clearer layout and count only sponsors actually shown on screen._  
  `EP-24160 EP-24161 EP-24776 EP-23935 EP-20605`
- **Meeting locations on the floor plan** · Onsite, Badges & Floor Plans [Mobile]  
  Tap a meeting’s location in the app to open the floor plan at that spot.  
  _Meeting cards in the app make the location clickable in any meeting status, opening internal, MapsPeople or ExpoFP floor plans focused on the meeting place._  
  `EP-23543`
- ★ **In-app updates** · Mobile App  
  Prompt attendees to update the app when a newer version is available.  
  _Organisers enable in-app updates in the app builder and choose required or optional update prompts, which the apps show when a new version is released._  
  `EP-17855`
- ★ **Check-in analytics refresh** · Analytics & Reporting  
  Follow check-ins and check-outs by day, hour and zone in redesigned check-in analytics.  
  _A new analytics page charts registrations before and after the event starts and check-ins and check-outs by day or hour, with user and zone filters. The check-in list shows each participant’s first and last check-in and check-out per day, and the zones page manages zones synced with the floor plan._  
  `EP-24652 EP-24653 EP-24654 EP-28682`
- ★ **Mobile analytics page** · Analytics & Reporting [Mobile]  
  Chart mobile app logins, page views, favourites, meetings and badge scans over time.  
  _The mobile analytics page shows daily, weekly or monthly graphs, filtered by user group, platform and page._  
  `EP-20705`
- **Meetings analytics** · Analytics & Reporting  
  Analyse meeting activity across web and app in the new analytics module.  
  _A Meetings tab with event, segment and date filters shows requested meetings by status, online and offline counts, average meeting length and time spent in online meetings._  
  `EP-1068`
- **Standard report** · Analytics & Reporting  
  Generate a standard event report from the admin Data page.  
  _Admins generate the standard report from the Data page in the same way as other reports._  
  `EP-23957`
- ★ **AI assistant in the admin panel** · AI & Smart Discovery [AI]  
  Ask an AI assistant questions about the platform from any admin page and get answers drawn from the documentation.  
  _A chat assistant based on a large language model opens from an icon on every admin page, keeps conversation history and collects feedback on answers. Access is controlled per client, and the icon can be dragged out of the way._  
  `EP-23166 EP-26308`
- **Global search across all content** · AI & Smart Discovery  
  Search exhibitor events, sessions, on-demand content, news, groups, delegates, speakers and buyers with the same ranked search.  
  _The search engine now covers every main section with section-specific multipliers and filters, is on by default for new events and matches exhibitor names on exhibitor events. Search results in the Android app also update more reliably._  
  `EP-13096 EP-18759 EP-23759 EP-35825`
- **Recommendation display improvements** · AI & Smart Discovery [Mobile]  
  Control how personalised recommendations are shown on the session overview and in the Android app.  
  _A new setting decides whether session recommendations are expanded when the session overview loads, and the logic behind the recommended sections in the Android app was improved._  
  `EP-24107 EP-27485`
- **Admin workflow improvements** · Platform, Security & Admin  
  Open a user’s profile as them, keep list filters between visits and find session settings faster.  
  _A customer service action in the exhibitor and visitor lists logs an admin in as that user in a new tab. Filters and search persist per admin on sponsor, participant, exhibitor and session lists, and the sessions configuration page is regrouped by area._  
  `EP-23019 EP-23021 EP-23885`
- **Event-time-only display** · Platform, Security & Admin  
  Choose to show only event time, without local time, across the web and app.  
  _When the setting is on, meetings, sessions, exhibitor events and blocked times show only event time on every frontend page._  
  `EP-23518`
- **More reliable exports** · Platform, Security & Admin  
  Download exports that recover automatically from temporary glitches instead of hanging.  
  _Exports run on a status-controlled process that reruns an incompletely processed batch up to three times, and the exhibitor manual export runs as a queued job with all details included in the file._  
  `EP-16797 EP-1094`
- **Security hardening across web and apps** · Platform, Security & Admin [Mobile]  
  Benefit from fixes to security findings across the website, admin panel, server and mobile apps.  
  _Issues identified in a security assessment were fixed in the frontend, admin panel and server, and in the Android and iOS apps._  
  `EP-10562 EP-10563`

### 2024-Q2

- ★ **Multilingual websites** · Event Websites & Content  
  Run the same website in several languages, keeping page structure in sync while translating the text of each version.  
  _Blocks are shared across language versions with independent text by default; organisers can desync a language and later restore it. Favourite blocks and an extra blocks section make frequently used content quicker to add._  
  `EP-18901`
- **Website builder editing controls** · Event Websites & Content  
  Control autosave, video autoplay and special link types while building pages.  
  _Autosave in the builder can be turned off, every video block has an autoplay setting, and links in blocks support special link types._  
  `EP-28604 EP-28605 EP-29275`
- **Discount, invoice and basket improvements** · Registration, Ticketing & Payments  
  Apply discounts more reliably, pay by invoice with updated logic and add sessions to the basket from a direct link.  
  _Discount application was improved, the invoice payment logic was updated, and sessions gained an “add to basket” link so attendees can place them in their basket directly._  
  `EP-26659 EP-30801 EP-26652`
- **Registration field timestamps** · Registration, Ticketing & Payments  
  Record when a registrant filled in a specific form field and see it in the export.  
  _Any registration field can be flagged to record the time of input. The latest input time before registration completes is stored in event local time and exported as a column next to the field._  
  `EP-26281`
- **Meeting limits with auto-confirmation** · Meetings & Matchmaking [Mobile]  
  Keep auto-confirmed meetings within category limits, with clear messages on web and in the app when a limit is reached.  
  _Auto-confirmation respects category daily and total confirmation limits, and the limit settings were renamed with clearer tooltips. The apps enforce the same meeting and message limits as the web, with specific error messages for pending and confirmation limits._  
  `EP-18393 EP-24046`
- **Schedule view while booking** · Meetings & Matchmaking  
  Check your own or your team's schedule without leaving the meeting request page.  
  _The new meeting request flow gained a 'See my Schedule' drawer with a team member selector for exhibitors, and a 'View Today's Schedule' pop-up that keeps form data intact. The break between meetings set by organisers is now always stated on the request screen._  
  `EP-27719 EP-24925 EP-29078`
- ★ **Speed networking** · Networking Formats  
  Run timed, table-based networking rounds where checked-in attendees are matched automatically and see who to meet next.  
  _Organisers set up sessions with location, timings, meetings per person and breaks; the platform pairs checked-in participants, lets them reject irrelevant matches, emails schedules and contacts, and shows a live timeline, table view and public display board. Organisers can adjust meetings by hand and export feedback._  
  `EP-26344 EP-26346 EP-26347 EP-26368 EP-26419 EP-26349 EP-26354 EP-26351 EP-26352 EP-30182 EP-30268`
- **Content reporting for exhibitor events** · Sessions & Agenda  
  Let attendees report offensive exhibitor events and let organisers reject events on security grounds.  
  _Users report exhibitor events with preset reasons and organisers review the reports against a content policy for exhibitors. A final Rejected for security concern status requires a reason, with filters and a rejection reason column._  
  `EP-16951 EP-16950`
- **Sessions list and schedule download options** · Sessions & Agenda  
  Show exhibitor events on the Sessions page and choose which profile fields go into downloaded schedules.  
  _An optional setting lists exhibitor events alongside sessions with a Session Format filter. Registration fields can be flagged for inclusion in the XLS schedule download, and exhibitors can search speakers and moderators by name or title when creating events._  
  `EP-26029 EP-23548 EP-27790`
- **Email sender and group search improvements** · Community & Communications  
  Send activation links from the email sender and search within groups.  
  _An Activation link variable in the email sender opens and activates the recipient’s profile, and the Groups tab gains a search filter._  
  `EP-27950 EP-22911`
- **Lead download and badge matching** · Exhibitor & Sponsor Success  
  Download leads in the background and get full details even for badges the scanner did not recognise.  
  _Download leads moved to a button on the profile, generating the file in the background with a timestamped link. Unrecognised badge scans are matched against the event database and filled in with the attendee's details, and organisers can set when lead capture is available._  
  `EP-22713 EP-21095 EP-26547`
- **Product and exhibitor setting improvements** · Exhibitor & Sponsor Success  
  Require key product details, show custom fields on product pages and rename sponsor sections.  
  _Organisers can make product images and descriptions mandatory, show custom field data on product pages and rename the sponsor sections on exhibitor and product lists. Exhibitor manual deadlines can be changed with confirmation and without exhibitors resubmitting._  
  `EP-7323 EP-25692 EP-27558 EP-23915`
- **Visitor invitation statistics** · Exhibitor & Sponsor Success  
  See how many visitors each exhibitor's invitations bring in.  
  _Invite registrations are attributed to exhibitors. Admins get a statistics tab with status counts, top exhibitors, filters, search and Excel export, and exhibitors see their own invitation funnel in their profile._  
  `EP-27290`
- ★ **InVisual floor plan integration** · Onsite, Badges & Floor Plans  
  Use InVisual floor plans natively on web and app, linked to exhibitors, sessions and favourites.  
  _Admins configure InVisual in settings. Users open the map from exhibitor, session and event locations, scan venue QR codes into the app or web view, and keep favourites in sync._  
  `EP-27382`
- **Badge printing improvements** · Onsite, Badges & Floor Plans  
  Print badges in bulk from the participants page and track badge printing.  
  _The batch print tool works with or without filters: organisers confirm the badge count, a file is generated in the background and a download button appears when ready. Badge print statistics are captured, and exhibitors without badges see a clear message pointing them to where badges are printed._  
  `EP-10207 EP-17524 EP-33643`
- **Check-in app zones and actions** · Onsite, Badges & Floor Plans [Mobile]  
  Choose the zone, action and session before scanning in the check-in app, with alerts for duplicate scans.  
  _Staff pick check-in, check-out or session scanning and the zone before they start. Session scans require the item in the attendee’s schedule, a short cooldown avoids accidental double scans, and repeat same-day scans are flagged._  
  `EP-23669`
- **Redesigned ExpoFP floor plans in-app** · Onsite, Badges & Floor Plans [Mobile]  
  Search for a booth and get directions on ExpoFP floor plans in the app, with a redesigned layout.  
  _Search results, stand details, get-directions and route panels were redesigned on Android and iOS. Users choose a start point from their current location with Crowd Connected or on the map, swap points and see the route._  
  `EP-24164`
- **Export additions** · Analytics & Reporting  
  Export news articles and get more detail in user and meeting exports.  
  _A News export lists articles with author, tags, visibility and exhibitor. The user export shows when each account was activated, and the meetings export shows the parent exhibitor of child-exhibitor participants._  
  `EP-55 EP-26794 EP-25833`
- **Aditus badges in the app** · Integrations & Open API [Mobile]  
  Show attendees their Aditus tickets on the badge page of the mobile app.  
  _When the Aditus badge integration is switched on, the app's badge menu lists the user's Aditus tickets, found by email._  
  `EP-25790`
- **CRM session import** · Integrations & Open API  
  Import sessions and speakers from a CRM, along with their tracks, types and tags.  
  _A CRM integration, switched on in event setup, pulls sessions and speakers into the agenda with their tracks, types and tags._  
  `EP-27396`
- **Event system import enhancements** · Integrations & Open API  
  Control exactly which sessions, speakers and exhibitor details are imported from the external event system.  
  _Imports now bring in moderators, only the speakers of imported sessions, exhibitor custom fields and categories, tracks and session types, and can filter sessions by stream and seminar name. Fields can be locked from updates and welcome emails sent to imported exhibitors._  
  `EP-25344 EP-28688 EP-30037 EP-33726`
- **ExpoFP exhibitor data sync** · Integrations & Open API  
  Keep ExpoFP floor plans current with exhibitor details sent automatically from the platform.  
  _Exhibitor name, stand, order ID, description, logo and category are pushed to ExpoFP whenever an exhibitor changes, with changes grouped and sent together every ten minutes._  
  `EP-26327 EP-32423`
- **Public API improvements** · Integrations & Open API  
  Set networking opt-in, filter statistics by time and export meeting tags through the public API.  
  _The account endpoint accepts a networking opt-in parameter, statistics endpoints filter by Unix timestamps, stand transmission via the API was improved and meeting tags appear in the meetings export and its endpoint._  
  `EP-24220 EP-25280 EP-26245 EP-28229`
- **Admin panel colour update** · Platform, Security & Admin  
  Work in an admin panel with updated primary and secondary colours.  
  _The primary and secondary colours of the admin panel were changed._  
  `EP-28362`
- **Return to page after SSO** · Platform, Security & Admin  
  Send single sign-on users back to the page they originally requested after they authenticate.  
  _A SAML setting returns users to their intended page after authentication instead of the event homepage._  
  `EP-20669`

### 2024-Q3

- ★ **Custom forms and pop-ups** · Event Websites & Content  
  Place marketing forms on the website inline, beside images or videos, as pop-ups or as sidebars, in several languages.  
  _Form blocks embed a chosen marketing form with colour and typography settings. Pop-up and sidebar forms support multi-column layouts and triggers such as exit intent, delay, scroll or page count. A feedback pop-up collects emoji or star ratings with comments, and forms can be multilingual and split into steps._  
  `EP-32969 EP-32970 EP-32971 EP-32972 EP-32973 EP-30562 EP-34225 EP-34293`
- **Banners, page slugs and event cloning** · Event Websites & Content  
  Add rotating banners, see page slugs at a glance and keep the website when cloning an event.  
  _A Banner block shows several linked banners in three sizes with timed rotation. The page list shows each page's slug, and cloning an event copies its new-builder website._  
  `EP-21888 EP-34455 EP-25958`
- **Custom CSS and HTML controls** · Event Websites & Content  
  Fine-tune the website's look with editable custom CSS and full-screen custom HTML.  
  _Existing custom CSS can be edited, custom CSS supports pseudo-classes, custom HTML can be shown full screen, and anchor IDs and custom CSS pass through to the header and footer._  
  `EP-34498 EP-34099 EP-34123 EP-33622`
- **Embeddable portal widgets** · Event Websites & Content  
  Embed portal widgets in other websites with frames that resize to fit their content.  
  _In widget mode the portal reports its height to the host page, and the frame is tracked across the session so the height stays correct._  
  `EP-33266 EP-33653`
- **Real-time team editing** · Event Websites & Content  
  Several admins can edit the same website at once and see who is working where.  
  _The builder shows active users, updates live, locks a block while someone edits it, shares autosave and warns before a version is restored._  
  `EP-22484`
- ★ **Recommended for you sorting** · Meetings & Matchmaking [AI]  
  Sort exhibitors, products, delegates, speakers and buyers by AI matchmaking relevance with 'Recommended for you'.  
  _With matchmaking on, listing pages offer 'Recommended for you' alongside A–Z sorting, optionally as the default, with explanatory text. Choosing a column sort in custom listings switches off recommended sorting._  
  `EP-27225 EP-32584 EP-32719`
- ★ **Opt-in speed networking** · Networking Formats [Mobile]  
  Invite eligible participants to opt in to speed networking, mark who is relevant ahead of time and get a generated schedule.  
  _Organisers select participants using categories and registration fields, manage a pre-registered list, set sponsored and buyer meeting limits and adjust generated tables by drag and drop. Participants mark relevant matches, see sessions and meetings in their profile, schedule and app, and receive email and bell notifications._  
  `EP-30282 EP-30284 EP-29905 EP-30285 EP-30697 EP-30302 EP-30295 EP-30297 EP-30286 EP-30292 EP-30699 EP-30294 EP-30300 EP-30874 EP-30301`
- ★ **Round tables** · Networking Formats [Mobile]  
  Run round table sessions where attendees apply for topics and are seated at tables with a leader or moderator.  
  _Organisers create sessions with topics, see applicants, and manage generated tables with seat editing and leader, moderator and sponsor assignment. Attendees find round tables in sessions, apply for topics, and see their table in My Schedule on web and app, with notifications once seated._  
  `EP-28986 EP-28987 EP-28988 EP-28989 EP-28990 EP-28991 EP-28992 EP-28993 EP-29074 EP-31628 EP-28995 EP-28994`
- **Speed networking check-in and voting** · Networking Formats  
  Track speed networking check-in from a registration list and vote on matches with clearer buttons.  
  _Session pages gained a registration list of checked-in participants with filter, search, sort and QR code actions. Voting buttons start neutral and show the chosen vote in colour, and meetings can start one minute after final schedules are sent._  
  `EP-26345 EP-32670 EP-33959`
- ★ **Exhibitor event approval workflow** · Sessions & Agenda  
  Review exhibitor events with security questions, auto-approval by type and notifications at every step.  
  _Organisers can require exhibitors to answer custom security questions and accept a policy on submission, auto-approve events by event type, and save changes without approving or rejecting. Email and platform notifications cover submission, approval, rejection and change requests._  
  `EP-26093 EP-32197 EP-23521 EP-16921`
- **Clickable custom locations** · Sessions & Agenda [Mobile]  
  Add a link to a session or exhibitor event location so attendees can open it from the card.  
  _With the setting on, other locations can carry a URL that opens from session and exhibitor event cards on the web and in the apps, inside the app for internal pages or in the browser for external ones._  
  `EP-16920 EP-32851`
- **Internal notes and critical flags** · Sessions & Agenda  
  Keep back-office notes on sessions and exhibitor events and flag the critical ones for follow-up.  
  _Sessions and exhibitor events gain an internal Notes field and a Flag as critical checkbox, visible only in the back office, with a filter, export columns and import support._  
  `EP-29190 EP-29221`
- **Schedule list view in the app** · Sessions & Agenda [Mobile]  
  View a day of meetings, sessions and events as a chronological list in the app.  
  _The app schedule gains a list view grouping meetings, sessions, events and blocked time by hour, and the default view setting now applies to the apps._  
  `EP-21405`
- **Session import and filtering improvements** · Sessions & Agenda  
  Import multilingual sessions, link speakers by external code and filter sessions by product category.  
  _The session import maps a name and description field per frontend language and attaches speakers and moderators by external code. A product category display filter is available on the All Sessions, On-demand and Round tables tabs._  
  `EP-16932 EP-16934 EP-29933`
- **Campaign and email editor redesign** · Community & Communications  
  Edit campaign variables as tags and get save confirmations in every email template editor.  
  _Campaign variables appear as tags with settings behind a gear icon, with a sender details section and clearer statistics. Unsaved-changes warnings and save confirmations extend to all admin email template editors._  
  `EP-23413 EP-30386`
- **Networking filters for lists** · Community & Communications  
  Filter attendee and exhibitor lists by existing chats and meetings.  
  _Delegate, speaker, buyer, exhibitor, pavilion and product lists can be filtered by existing chats, by who initiated meetings and by meeting status, configured in display filters._  
  `EP-32152 EP-27888`
- ★ **Redesigned exhibitor account** · Exhibitor & Sponsor Success  
  Manage every part of an exhibitor from one redesigned account in the admin panel.  
  _The admin exhibitor account has new pages for registration info, settings, team members, security, sponsorship, floor plan and analytics against the event average, plus a refreshed interaction dashboard. Profiles show registration URL, external ID and tags, and new profiles no longer need a password._  
  `EP-23966 EP-23967 EP-23968 EP-23969 EP-23970 EP-23971 EP-23972 EP-23973 EP-26041 EP-31630 EP-31674`
- **Automatic parent and child assignment** · Exhibitor & Sponsor Success  
  Link exhibitors that share an email address as parent and child companies automatically.  
  _A general setting runs a script that makes the first exhibitor with a shared email the parent and later ones its children, showing the last run. Checks in the API and import stop an exhibitor being set as its own parent or child._  
  `EP-27619 EP-26157`
- **Clone products and brands with events** · Exhibitor & Sponsor Success  
  Carry exhibitors' active products and brands into a cloned event.  
  _Event cloning can keep only active products, and can copy brands with their exhibitors, products, logo, categories, description, social links and translations. Interaction data such as favourites is not copied._  
  `EP-29011 EP-29132`
- **Lead download controls** · Exhibitor & Sponsor Success  
  Choose which exhibitor categories or exhibitors can download leads.  
  _Download leads can be switched on or off per exhibitor category or individual exhibitor, including their team members on web and app. Contact-sharing settings were renamed to name exhibitor events and sponsored sessions clearly._  
  `EP-13663 EP-28237 EP-28308`
- **Product category and profile improvements** · Exhibitor & Sponsor Success [Mobile]  
  Limit product categories to an exhibitor's activities and show exhibitor social links in the app.  
  _A setting restricts product categories to an exhibitor's own activity categories. The iOS and Android apps show exhibitor social links from the exhibitor's profile._  
  `EP-33961 EP-34458 EP-34459`
- **App behaviour improvements** · Mobile App  
  Keep attendees on a valid event and make Android sections easier to use.  
  _On launch the app checks the user’s event still exists; if not, the user is logged out and shown the event selection or login screen. Collapsing sections in the Android app behaves more naturally._  
  `EP-31013 EP-34002`
- **Report times in event time zone** · Analytics & Reporting  
  See when each report was generated in the event’s own time zone.  
  _Export, import and statistics download links across the admin panel show the generation time in the event time zone, with the zone named._  
  `EP-29932`
- **Session report additions** · Analytics & Reporting  
  See exhibitor event status, content reports and edit dates in the sessions export.  
  _The sessions export shows each exhibitor event’s status, including rejection for security concerns, how often it was reported as offensive, and when the exhibitor created and last edited it._  
  `EP-16952 EP-31429`
- **Related exhibitor recommendations** · AI & Smart Discovery  
  Discover exhibitors similar to the ones you have requested meetings with, and see exhibitor events among your recommendations.  
  _After requesting a meeting, attendees see a pop-up and a schedule page block listing up to 20 related exhibitors. Organisers can also switch on exhibitor events in the Recommendations section._  
  `EP-28230 EP-30975`
- **Crowd Connected location and messaging** · Integrations & Open API [Mobile]  
  Send location-based push messages through Crowd Connected and link app users to their location data.  
  _The apps pass each user's ID to Crowd Connected, Crowd Connected can send notifications with category targeting through a dedicated API, and ExpoFP and Crowd Connected settings can be entered when an app is created._  
  `EP-23579 EP-23578 EP-34460`
- **Reach5 accounts at registration** · Integrations & Open API  
  Let visitors register with an existing Reach5 account, with their details carried across.  
  _Visitor registration checks an email against both systems and creates platform accounts from Reach5 data._  
  `EP-18360`
- **Admin panel language choice** · Platform, Security & Admin  
  Choose the admin panel language on the login page and keep it between visits.  
  _The new admin panel adds a language selector on the login page, remembers the chosen language, and shows a loader instead of a loading message while event data loads._  
  `EP-34512 EP-34511 EP-34004`
- **Consent for embedded videos** · Platform, Security & Admin  
  Block embedded videos on exhibitor profiles until the visitor gives consent.  
  _An optional setting, off by default, keeps embedded videos on exhibitor profiles blocked until the user consents._  
  `EP-32016`
- **Easier account switching** · Platform, Security & Admin  
  Switch between your own, team member, parent and child company accounts from the top menu.  
  _The web account switcher is a dropdown available from the top-right menu and from the name on the profile page, with scrolling when there are more than five accounts._  
  `EP-28676`

### 2024-Q4

- **Card and block design improvements** · Event Websites & Content  
  Arrange and style cards more freely, with more FAQs, consistent image ratios and better link handling.  
  _Cards in card rows and counter blocks can be reordered by drag and drop, FAQ blocks allow more than eight questions, and images use a chosen aspect ratio. Cards have rounded corners and softer shadows, carousel button alignment was improved, and links in text can be opened from their icon._  
  `EP-35499 EP-35493 EP-25939 EP-35443 EP-36712 EP-24028 EP-37474 EP-35872`
- **Pop-ups, social links and logo controls** · Event Websites & Content  
  Show custom HTML as a pop-up, pin social links to the page edge and control where header and footer logos link.  
  _Custom HTML pop-ups have display triggers, auto-close and per-device settings. A social links block attaches to the left or right edge. Header and footer logos can be static or link to any URL. Custom domain setup explains SSL certificate options._  
  `EP-34162 EP-34346 EP-35265 EP-28249`
- ★ **New basket and payment page** · Registration, Ticketing & Payments  
  Participants and exhibitors can collect items in a redesigned basket and pay by card, PayPal or Parampos on a new payment page.  
  _The participant basket holds tickets, sessions and on-demand sessions; the exhibitor basket holds manual equipment and lead capture items. Both show discounts, taxes and totals and allow payment per section or in full. Items are reserved for 15 minutes on the payment page, and the Basket and Discounts modules control what users see._  
  `EP-923 EP-24017 EP-26932 EP-27695 EP-30067 EP-34965 EP-37398 EP-35239 EP-34191 EP-34607 EP-29730 EP-23328 EP-26539`
- ★ **New ticketing** · Registration, Ticketing & Payments  
  Create, edit and clone tickets in a new admin ticketing area, targeted by participant category and check-in location.  
  _Organisers manage tickets from a new Tickets list, setting name, description, category availability and check-in zones on community and regular events. Ticket content can be translated and shows in the visitor’s chosen language._  
  `EP-26628 EP-26629 EP-30803`
- **Basket and payment in the app** · Registration, Ticketing & Payments [Mobile]  
  Participants can use the new basket and pay for items inside the iOS and Android apps.  
  _The app basket tab opens the new basket with items, prices, discounts and availability checks. The payment page is adapted to the app with PayPal and Parampos support, and session pages in the app connect to the new basket._  
  `EP-30723 EP-31477 EP-35249`
- **Ticket pricing tiers** · Registration, Ticketing & Payments  
  Sell tickets at different prices across named sales periods, such as early bird.  
  _Tickets can have a fixed price or a dynamic price with several consecutive, named and coloured date ranges up to the event’s last day, each shown with its own price tag._  
  `EP-26895`
- **Ticket visibility by country** · Registration, Ticketing & Payments  
  Show registrants only the tickets that apply to their category and country.  
  _Tickets can be made visible per category and country, with a country selector in the registration tickets step that syncs with the Country field. An optional setting lets unlisted combinations continue at no charge instead of showing an error._  
  `EP-34940 EP-37154`
- **Updated VAT rules** · Registration, Ticketing & Payments  
  Charge VAT correctly based on where the billing and paying companies are located.  
  _VAT calculation now considers billing and paying company location, EU VAT number validation and a setting to disable VAT rules; for example, tax is zero when a non-EU billing company charges an EU payer._  
  `EP-32621`
- **Blocked time and team schedule improvements** · Meetings & Matchmaking  
  Limit blocked time to event days and find team members quickly on the Team Schedule page.  
  _An 'Allow blocked time outside the event days' setting restricts blocked-time pickers to event dates and times when switched off. The Team Schedule member selector gained search by name and company._  
  `EP-34594 EP-35119`
- **Exhibitor recommendations when booking** · Meetings & Matchmaking [AI]  
  See recommended exhibitors when starting a meeting with an exhibitor from any page.  
  _An exhibitor recommendations pop-up now appears across all pages where a meeting with an exhibitor can be started._  
  `EP-34005`
- ★ **Session ratings** · Sessions & Agenda [Mobile]  
  Collect star ratings and feedback on attended sessions on the web and in the app.  
  _Attendees rate sessions they attended with stars and a short comment, or mark that a session did not take place, from a ratings page or a prompt after the session. The apps prompt for ratings singly or in batches, and organisers export ratings with user details._  
  `EP-19438 EP-36711 EP-37170 EP-36710 EP-33802`
- **Session scheduling safeguards** · Sessions & Agenda  
  Get warned about location and time clashes when creating sessions and exhibitor events.  
  _A warning appears on front end and admin when a session or exhibitor event is set at the same location and an overlapping time as another. Time zone validation was added, and the Sessions page shows an empty state when there are no sessions._  
  `EP-16924 EP-32196 EP-35795`
- **Bulk campaign sending and chat limits** · Community & Communications  
  Send campaigns to large filtered audiences in one action and protect users from chat spam.  
  _Campaigns reach all selected recipients without duplicates in a single send, visible in campaign statistics. A daily limit on starting new chats applies across web and apps, telling users when it is reached._  
  `EP-35014 EP-35350`
- **Multilingual admin notifications** · Community & Communications [Mobile]  
  Send admin notifications in each user’s language, including to app users who are not logged in.  
  _Organisers write notification titles and messages per language with a fallback language; users receive them in their profile or app language. Push notifications can also reach app users who are not logged in, opening a chosen page._  
  `EP-31011 EP-32750`
- **Lead questions by category and exhibitor** · Exhibitor & Sponsor Success  
  Set lead capture questions globally, per exhibitor category or per exhibitor.  
  _Lead question logic was improved so questions can be managed at global, category and individual exhibitor level._  
  `EP-32169`
- **Marketplace view and category order** · Exhibitor & Sponsor Success [Mobile]  
  Choose the default marketplace view and the order of category filters.  
  _Organisers set the default marketplace view to cards, list or short list, and drag and drop category filters into order, which applies to category pickers on web and in the app._  
  `EP-34438 EP-24228`
- **Sponsor banner controls** · Exhibitor & Sponsor Success [Mobile]  
  Make sponsor banners display-only and page through long sponsor lists.  
  _A 'Disable links' toggle for each web and app banner location makes banners unclickable, with no redirect or click statistics. Sponsors are displayed with pagination._  
  `EP-35019 EP-35640`
- ★ **App builder options** · Mobile App  
  Tailor app content by login status, font and links from the app builder.  
  _Custom block pages can be shown only to logged-out users; custom blocks can link to the app sign-in page and to other app pages; the Gilroy font can be chosen for headings and text; forms are shown in an embedded frame; and the Download all button can be hidden on custom documents blocks._  
  `EP-32270 EP-27462 EP-32359 EP-32358 EP-35841 EP-35827`
- **Tiered app menus** · Mobile App [Mobile]  
  Organise the app menu into expandable sections with sub-items.  
  _Main menu items show first, and their sub-items appear indented when the parent is expanded, with the parent staying visible._  
  `EP-27309`
- **Attendee names in team schedule export** · Analytics & Reporting  
  See who is attending your team’s events in the team schedule export.  
  _The team schedule export lists attendee names for events the team moderates or speaks at; parent exhibitors also see their child companies’ events._  
  `EP-36095`
- **Supply and demand graph improvements** · Analytics & Reporting  
  Read marketplace supply and demand by category more easily.  
  _The supply and demand graph tooltip names the product category, and all categories are displayed on the same scale._  
  `EP-29899 EP-31157`
- ★ **AI-powered exhibitor search** · AI & Smart Discovery [AI]  
  Describe what you are looking for in plain language and let AI find matching exhibitors, refining the results with follow-up prompts.  
  _A prompt-based AI search widget sits on the exhibitor list, enabled as its own module with open or sign-in-only access. Organisers can set up to three suggested prompts, and the conversation is kept as visitors move around the site._  
  `EP-33164 EP-27547 EP-34248 EP-35217`
- **Public API exhibitor and product controls** · Integrations & Open API  
  Switch an exhibitor's sponsor pop-up and activate or deactivate products through the public API.  
  _The exhibitor endpoint accepts a sponsor pop-up parameter, and the product endpoint accepts an active or inactive status._  
  `EP-32201 EP-26427`
- ★ **Login codes by WhatsApp and SMS** · Platform, Security & Admin  
  Send one-time login codes by WhatsApp and SMS as well as email.  
  _Each channel has its own toggle and users receive codes through every enabled channel. SMS uses custom text and WhatsApp a preset template._  
  `EP-26859`
- **Admin panel improvements** · Platform, Security & Admin  
  Work in a tidier admin panel with fewer redundant settings and clear empty states.  
  _Redundant settings were removed, admin tables show empty states, and modules such as hospitality, exhibitor manual and table taxes can be hidden._  
  `EP-32439 EP-23762 EP-28153`
- **Australian hosting region** · Platform, Security & Admin  
  Host event platforms on infrastructure in Australia.  
  _Cloud infrastructure was set up in an Australian region._  
  `EP-35819`
- **Faster pages and admin lists** · Platform, Security & Admin  
  Load sponsor pages, search widgets and admin meeting lists more quickly.  
  _Database connection pooling was added in production, account attributes and event configuration are retrieved and cached more efficiently, and admin table meeting lists, sponsor pages and exhibitor, product and brand search widgets were optimised._  
  `EP-31026 EP-35921 EP-35926 EP-35927 EP-36782 EP-36786 EP-36019`
- **Security hardening** · Platform, Security & Admin  
  Benefit from stronger protection of account activation and badge scanning.  
  _Activation codes are generated with the account identifier included, and the badge scanning endpoint requires a secure token._  
  `EP-34239 EP-35880`
- **Sign-in and profile refinements** · Platform, Security & Admin  
  See clearer profile titles and error codes, and sign in through custom login services.  
  _The profile edit page title reflects the account type, the frontend shows error codes, the sign-up prompt was removed from the login page, and the new frontend supports login by token from a custom service._  
  `EP-34576 EP-36297 EP-37445 EP-37093`

### 2025-Q1

- ★ **SEO for custom pages** · Event Websites & Content  
  Custom pages built in the website builder are rendered for search engines, with configurable headings and image alt text.  
  _Every content, dynamic, header and footer block renders in the server response with configurable H1–H6 heading tags, semantic section elements, image alt text and working buttons._  
  `EP-36224 EP-36288 EP-32698 EP-32699 EP-32702 EP-32701 EP-32705 EP-32706 EP-32707 EP-32708 EP-32710 EP-32709 EP-32703 EP-32700 EP-32704 EP-32711 EP-36507 EP-36695 EP-36694 EP-32712 EP-36683 EP-36685 EP-36687 EP-36689 EP-36691 EP-36692 EP-36693 EP-32713 EP-36508 EP-33022 EP-33023 EP-36684 EP-39909`
- **Block versioning and updates** · Event Websites & Content  
  Keep website blocks up to date, updating one block or a whole page after reviewing what has changed.  
  _Blocks are versioned; outdated blocks show an indicator, single updates list the changes before confirming and bulk updates apply across a page._  
  `EP-34874 EP-38778`
- **Search-friendly event pages** · Event Websites & Content  
  Event website pages such as exhibitors, sessions, news and participants now render their content for search engines.  
  _Community, events, news, brand, exhibitor, participant, product, session, group, manual, marketplace and floor plan pages were moved to server-side rendering while keeping their existing blocks and actions. Custom text and HTML also render on the server._  
  `EP-37489 EP-37490 EP-37569 EP-37570 EP-38048 EP-37488 EP-38049 EP-38050 EP-38646 EP-38647 EP-38648 EP-38649 EP-38650 EP-38653 EP-38655 EP-38052 EP-38051 EP-40539`
- **Visibility and page access** · Event Websites & Content  
  Choose who sees each link and button and who can open each custom page.  
  _Header and footer links and block buttons can be shown to everyone, logged-in or logged-out visitors, and a page access tab controls access to each custom page._  
  `EP-38225`
- **Website builder improvements** · Event Websites & Content  
  Cleaner page URLs, linkable card images, adjustable header menu font size and smoother page and news editing.  
  _Custom page URLs drop the /page segment, slugs can be changed before validation, and images in card rows and carousels can link to a URL. Header menu items have a font size slider with overflow into Show More. Legacy colour settings are hidden when the new builder is on, font key errors are shown, and news paging is kept after approvals._  
  `EP-38376 EP-35968 EP-36242 EP-40176 EP-24408 EP-37769 EP-39361`
- **Payment setup checks** · Registration, Ticketing & Payments  
  Catch payment integration mistakes before they affect checkout, with validation of required fields and PayPal keys.  
  _Required fields for payment integrations are now validated, and an invalid PayPal secret key for the active test or live mode blocks saving with a clear message. The UK VAT validation service connection was also updated._  
  `EP-38109 EP-38286 EP-32998`
- ★ **Automatic calendar sync** · Meetings & Matchmaking  
  Keep meetings and sessions in step with your external calendar automatically after a one-time consent.  
  _Meetings and sessions sync to users' external calendars in the background every six hours, so additions, changes and deletions arrive without manual action._  
  `EP-30274`
- ★ **Real-time matchmaking** · Meetings & Matchmaking  
  Switch on real-time matchmaking recommendations from the admin panel and see their status live.  
  _The admin Matchmaking page now runs on the real-time recommender, with an Enable toggle and a live status of in progress, error or completed. Switching it off shuts the pipeline down._  
  `EP-34318`
- **Meeting wizard and profile improvements** · Meetings & Matchmaking  
  Spot team members with email problems when booking for them, and share profile links in one click.  
  _The admin meeting wizard marks team members with fake, empty or undeliverable emails. Profile pages gained a Copy button for the public profile link, with a bulk export of links for team members. Meeting limits are displayed more clearly on the front end._  
  `EP-36721 EP-34934 EP-39067`
- **Session details in the app** · Sessions & Agenda [Mobile]  
  See full locations on session cards and moderators in the speakers list in the app.  
  _Session and exhibitor event cards in the iOS and Android apps display the complete location, and the iOS speakers list also shows moderators._  
  `EP-38220 EP-25578`
- **Longer group descriptions** · Community & Communications  
  Describe community groups more clearly with longer short descriptions.  
  _The character limit for community group short descriptions was raised from 200 to 400._  
  `EP-39625`
- ★ **Parent and child companies in app** · Exhibitor & Sponsor Success [Mobile]  
  Show parent and child companies in the mobile app, with your own labels in every language.  
  _The apps mark parent and child companies, add a Pavilions tab with child counts and a head office or child filter, and sort children alphabetically. Organisers rename the parent, child, pavilion and head office labels per language, and marketplace cards show country and city for parent exhibitors._  
  `EP-32830 EP-37234 EP-37278 EP-37305 EP-37846 EP-38531 EP-39031`
- **Exhibitor and sponsor profile improvements** · Exhibitor & Sponsor Success [Mobile]  
  Show the sessions a company speaks at or sponsors in the app, and embed videos safely.  
  _App exhibitor profiles add 'Sessions we speak at' and 'Sponsored sessions' blocks that respect visibility rules. Embedded video fields on profiles, products and groups are validated, and sponsor profiles gain a back button._  
  `EP-39354 EP-38865 EP-39511 EP-39105`
- **Exhibitor manual improvements** · Exhibitor & Sponsor Success  
  Enforce badge limits and save profile details reliably in the exhibitor manual.  
  _The Add button is disabled with an explanation once the badge limit is reached, the exhibitor profile is saved and submitted with the Submit button, and fields can be hidden in table sections._  
  `EP-38608 EP-40027 EP-36646`
- **Event selector improvements** · Mobile App [Mobile]  
  Help attendees pick the right event in the app.  
  _The Android event selection and login screens show each event’s country and city and order current and past events by event time. Favourite icons on iOS were updated to sharper versions._  
  `EP-38532 EP-33551 EP-39633`
- **Login and check-in export improvements** · Analytics & Reporting  
  Separate customer service logins and see session details in check-in exports.  
  _The login data report lists customer service logins separately from web logins, and the check-in list export can show the session ID and name for session, exhibitor event and round table check-ins._  
  `EP-18160 EP-38213`
- **Unified recommendations page** · AI & Smart Discovery [Mobile]  
  Give attendees one configurable recommendations page on web and app, with sections for matchmaking, products, exhibitors, sessions and people.  
  _Organisers choose, title, order and target each recommendation section, including matchmaking, and preview the page for web or app. The app page shows role icons on recommended people, and the admin page warns when no sections are enabled._  
  `EP-27246 EP-38636 EP-40901 EP-39504 EP-39440`
- **A2Z integration enhancements** · Integrations & Open API  
  Choose which A2Z exhibitors to import by booth status and map their pavilion and hall.  
  _Only exhibitors with the selected booth status are imported, and pavilion and hall codes map to chosen custom fields._  
  `EP-37381`
- **Reach5 single sign-on** · Integrations & Open API  
  Let attendees sign in with Reach5 single sign-on.  
  _The site accepts a Reach5 authorisation code and exchanges it for an access token to log the user in._  
  `EP-36147`
- **Visit staff sign-on and meeting rights** · Integrations & Open API  
  Let exhibitors register their staff through single sign-on and control who can have meetings from Visit data.  
  _A 'Register Your Staff' option under Team Members signs exhibitor admins into the partner system, and a custom question and response set in the Visit integration decides which participants can have meetings._  
  `EP-39524 EP-39525 EP-41108`
- **Clearer buttons and messages** · Platform, Security & Admin  
  See consistent primary save buttons and clearer validation messages.  
  _Save and similar buttons use the primary button style, and the error shown when an entry has too few characters was reworded._  
  `EP-38372 EP-37692`
- **Up-to-date country and city data** · Platform, Security & Admin  
  Use country, city and region names and translations that refresh automatically every month.  
  _The country manager now imports country, city and region names and translations from an external reference service, with monthly automatic updates._  
  `EP-28301`

### 2025-Q2

- **Header and styling improvements** · Event Websites & Content  
  Header titles and subtitles display on mobile, and portal elements can be targeted with custom styling.  
  _Header titles and subtitles show on mobile with character limits and colour settings, and portal pages expose CSS classes or data attributes for custom styling._  
  `EP-40342 EP-42351`
- **Image alt text and sitemap** · Event Websites & Content  
  Describe every website image for search engines and screen readers, with an improved sitemap.  
  _Every image in the builder, including header and footer, has an optional alt text field with SEO tips and a warning when empty. Sitemap generation logic was updated._  
  `EP-36256 EP-40229`
- ★ **Tickets in the profile and basket** · Registration, Ticketing & Payments  
  Participants can view their tickets and buy more from their profile, with new tickets paid for through the basket.  
  _A Tickets tab shows purchased and available tickets. Tickets have their own basket section with discount codes and taxes, and are held for 15 minutes during payment. Organisers get ticketing settings and an on/off toggle with a warning, and tickets with sales become view-only._  
  `EP-26630 EP-26632 EP-37664 EP-37784 EP-38218 EP-38168 EP-38136 EP-33497 EP-41971 EP-36099`
- **Option to disable repeated registration** · Registration, Ticketing & Payments  
  Treat returning visitors as new registrants when an event should not reuse accounts from other events.  
  _A visitor setting lets users register without a one-time code or their old password even if their email exists on other events, while duplicate prevention, continuous registration and buyer upgrade still apply._  
  `EP-42940`
- **Orders and invoices in the profile** · Registration, Ticketing & Payments  
  Participants can see everything they have bought and download their invoices from their profile.  
  _The profile Orders section has an Ordered items tab listing purchased tickets and sessions, and an Invoices tab listing paid orders with sortable columns, item breakdowns and invoice download._  
  `EP-38223 EP-26637 EP-26636`
- **Ticket category upgrades** · Registration, Ticketing & Payments  
  Let participants upgrade to a higher category by buying a ticket and paying only the difference.  
  _When category changes are allowed, participants can buy a ticket of an equal or higher-value category, replacing their current tickets, on desktop and in the app. Their current category is shown on the dashboard and ticketing pages._  
  `EP-26633 EP-30343 EP-26634`
- **Meeting button availability checks** · Meetings & Matchmaking [Mobile]  
  Only offer meetings with exhibitors who have a team member available, on web and in the app.  
  _The Meeting button on exhibitor, pavilion and product cards and profiles checks team member permissions, opt-in, settings and limits. If no team member is available, the button is hidden in the app and the web suggests alternatives._  
  `EP-37473 EP-35513`
- **Meeting ratings in the app** · Meetings & Matchmaking [Mobile]  
  Rate completed meetings in the mobile app with stars, comments and the likely business outcome.  
  _Completed meetings in the app show a 'Rate This Meeting' button with 1–5 stars, comments, likely business outcome or 'did not take place', and ratings can be edited later._  
  `EP-40631`
- **Opt-in speed networking for any event** · Networking Formats  
  Use opt-in speed networking with visibility presets and pairing based on relevance and matchmaking score.  
  _Buyers became a tag rather than a separate setup, organisers set two-sided visibility or choose presets, only opted-in eligible users appear in offers, and pairing uses relevance and matchmaking score._  
  `EP-39133`
- **Agenda sharing improvements** · Sessions & Agenda  
  Choose who receives an exhibitor’s agenda and show child exhibitors on session cards.  
  _A Send Agenda pop-up in the admin exhibitor list and profile explains the action and lets organisers pick recipients, including team members. Session cards can show child exhibitors._  
  `EP-40075 EP-30370`
- **Custom session filters in the app** · Sessions & Agenda [Mobile]  
  Filter sessions in the app with the same custom filters used on the web, in the attendee’s language.  
  _Custom session filters are available in the mobile apps, working with existing filters and search, and custom filter items can be translated._  
  `EP-39304 EP-41291`
- **Easy session check-in** · Sessions & Agenda  
  Let attendees check in to sessions and exhibitor events even if they did not add them to their schedule.  
  _An optional Easy Entrance setting in Sessions config allows check-in without errors for sessions and exhibitor events not in the attendee’s schedule._  
  `EP-40189`
- **Configurable session reminders** · Community & Communications [Mobile]  
  Choose when session and exhibitor event reminders are sent.  
  _Organisers pick reminder times from 0 to 60 minutes before a session or exhibitor event starts, replacing fixed reminder times, on the web and in the app._  
  `EP-36743`
- **Personal assistant email copies** · Community & Communications  
  Copy a participant’s emails to their personal assistant.  
  _A Personal Assistant Email field in registration copies emails sent to participants, buyers and team members to the assistant’s address._  
  `EP-40074`
- ★ **Smarter category selection and search** · Exhibitor & Sponsor Success  
  Find the right category quickly, even in long, nested category lists.  
  _A redesigned category picker offers a two-panel view by custom filter with direct search. Category filters with many items can show a search field across marketplace, delegate and news pages, and results show matching categories with their parents and children._  
  `EP-35452 EP-36732 EP-40743`
- **Lead scanning improvements** · Exhibitor & Sponsor Success [Mobile]  
  Sync offline scans on demand and see clearer scan reasons in reports.  
  _A 'Force scans sync' button in app settings sends locally edited scans, notes and ratings to the server so they appear in the leads file. The reason for scanning is labelled more clearly in reports._  
  `EP-23400 EP-42570`
- **Parent and child display controls** · Exhibitor & Sponsor Success [Mobile]  
  Choose whether child companies are shown and show parent locations in the app.  
  _A 'Do not indicate child companies' setting hides child relations on web and in the apps. App cards and profiles show country and city for parent exhibitors and pavilions, and the automatic assignment can run daily with an emailed report._  
  `EP-37800 EP-37805 EP-41483 EP-38486`
- **Team member and news settings** · Exhibitor & Sponsor Success  
  Decide which team member fields are required and get better news header images.  
  _Organisers control whether telephone and job title are required when adding team members, and the news header image cropper uses a new ratio._  
  `EP-40242 EP-41849`
- ★ **Ticket validation at check-in** · Onsite, Badges & Floor Plans  
  Validate attendees’ tickets when their badge is scanned in the check-in app.  
  _On each scan the app checks that a ticket is held, valid for the date, not expired and valid for the check-in zone, and shows clear messages such as “No ticket found” or “Wrong check-in zone”. No checks run when ticketing is off._  
  `EP-28422`
- **Floor plan display improvements** · Onsite, Badges & Floor Plans  
  Keep the floor plan consistent with the rest of the event website.  
  _Exhibitor filters on the floor plan page follow the order set in display filters, and the floor plan uses the standard website builder header instead of its own mini header._  
  `EP-36287 EP-38711`
- **GPS and indoor positioning options** · Onsite, Badges & Floor Plans [Mobile]  
  Show attendees their live GPS position on floor plans on Android as on iOS, and choose GPS, indoor positioning or both.  
  _Android app users see their GPS position on InVisual floor plans, with permission prompts. For ExpoFP with Crowd Connected, organisers choose IPS only, GPS only or IPS plus GPS in general settings._  
  `EP-40070 EP-40363`
- **Redesigned badge templates** · Onsite, Badges & Floor Plans  
  Create badges with a redesigned templating and output process.  
  _Badge templating and badge output were redesigned._  
  `EP-41901`
- **Manual data re-sync** · Mobile App [Mobile]  
  Let attendees refresh the app’s event data themselves from Settings.  
  _A Re-sync button on the Settings page fetches the latest data, up to once an hour; logged-in users also find Cancel Registration and Delete My Account there. Text blocks were removed from the app builder._  
  `EP-41330 EP-42436`
- **Total meetings graph update** · Analytics & Reporting  
  See meeting totals displayed with updated logic in meeting analytics.  
  _The display logic of the Total meetings graph was updated._  
  `EP-42365`
- **Aditus participant sync** · Integrations & Open API  
  Sync participants and team members from Aditus for one or more events.  
  _Registrations are pulled from Aditus with category mapping, badge fields and email options, and the Aditus badge page settings are available again in the admin panel._  
  `EP-40301 EP-44694`
- **Klipso integration enhancements** · Integrations & Open API  
  Bring exhibitor admins, multiple stands and product categories across from Klipso.  
  _Contact person details become the exhibitor's admin team member, optionally set as active, exhibitors can have several halls and stands, and product categories can be copied from an earlier event._  
  `EP-31213 EP-38131 EP-38098 EP-41455`
- **Public API improvements** · Integrations & Open API  
  Filter meeting exports by creation and change dates, remove team members and fetch badge QR codes through the API.  
  _The meetings export accepts created and last-modified date filters, sending empty exhibitor IDs detaches a team member, and the account endpoint returns the participant's badge QR code._  
  `EP-35900 EP-35903 EP-40281 EP-40013`
- ★ **Attendee onboarding** · Platform, Security & Admin [Mobile]  
  Guide attendees to pick their interests on first login so recommendations are personalised from the start.  
  _Organisers configure a multilingual onboarding pop-up with live preview, texts, category groups, mandatory or optional completion and reappearance timing. It runs on web and app, and users are notified when their recommendations page is updated._  
  `EP-36617 EP-40162 EP-40531`
- ★ **Custom labels** · Platform, Security & Admin  
  Rename page and section labels in each language across web and app.  
  _A content settings page lets organisers edit labels per language, with all and modified-only views, including labels in the cancel registration and delete account pop-ups._  
  `EP-39352 EP-41750`
- **Admin panel improvements** · Platform, Security & Admin  
  See the event time zone in the admin panel and keep settings consistent between admin panels.  
  _The admin panel shows the selected event time zone, and settings made in the previous admin panel apply in the new one._  
  `EP-42398 EP-41912`
- **Landing page after login** · Platform, Security & Admin  
  Choose which page exhibitors, participants and team members land on after they log in.  
  _The page opened on login can be a custom internal URL, and the redirect is handled on the server._  
  `EP-38505 EP-40076`
- **Performance and security improvements** · Platform, Security & Admin  
  Load large option lists and data faster, with less sensitive data sent in requests.  
  _Additional database indexes were added, multi-select fields with many options load on demand, and tokens and identifiers were removed from requests._  
  `EP-42371 EP-38507 EP-43090`

### 2025-Q3

- **Mobile layout for card rows** · Event Websites & Content  
  Four-card rows display better on mobile devices.  
  _The mobile layout of the four-card view used in system pages was adjusted._  
  `EP-43030`
- **Phone number validation** · Registration, Ticketing & Payments  
  Reduce invalid phone numbers with format validation on the phone field.  
  _The phone field now validates the format of the value entered._  
  `EP-44198`
- **Translated invoices and tax names** · Registration, Ticketing & Payments  
  Show invoices and tax names in each event language.  
  _Invoices can be translated, and tax names can be set per event language so they appear translated on invoices, the basket, exhibitor manuals, tickets and ordered items._  
  `EP-40498 EP-43163`
- ★ **AI meeting notes** · Meetings & Matchmaking [AI, Mobile]  
  Record meetings in the app after a badge scan and receive an AI summary by email.  
  _A first release of AI meeting notes in the app covers voice sample onboarding, recording from the Scans tab after a badge scan, explicit consent and emailed AI summaries. Organisers switch it on in the app builder._  
  `EP-42801`
- **Admin meeting wizard improvements** · Meetings & Matchmaking  
  Find the right team member fast when booking meetings for exhibitors in the admin panel.  
  _The meeting wizard team member dropdown is sorted A–Z, shows job title and company and supports search. The exhibitor profile Team Members table combines columns and adds a phone column._  
  `EP-44527`
- ★ **Meeting programmes** · Networking Formats  
  Take part in hosted meeting programmes: mark who you want to meet, confirm proposed meetings and follow your schedule.  
  _Participants mark people Relevant or Super Relevant with an optional message, see who picked them and mutual matches, and confirm or decline meetings by round. They follow a timeline, see their schedule and a connections dashboard, get calendar files for deadlines and rate meetings afterwards; exhibitors manage their team._  
  `EP-43905 EP-43907 EP-42161 EP-43483 EP-43484 EP-43487 EP-43490 EP-43492 EP-43493 EP-43494 EP-43660 EP-43662 EP-43665 EP-43564 EP-39158 EP-43562 EP-43904 EP-43871 EP-43809 EP-43717 EP-43872 EP-41254 EP-42383 EP-44876`
- **Round table confirmation and reassignment** · Networking Formats  
  Ask round table participants to confirm their seat and move people between topics and tables.  
  _An optional confirmation step lets participants confirm or reject their topic and table, with statuses organisers can filter. Organisers see each topic's applicants and can move or remove participants by drag and drop. Notifications, tooltips and the admin and front-end views were also refined._  
  `EP-39818 EP-39819 EP-41016 EP-41524 EP-43554 EP-44052 EP-43553`
- ★ **Applications for exhibitor events** · Sessions & Agenda [Mobile]  
  Let attendees apply for places at exhibitor events and let organisers approve applicants on the web and in the app.  
  _Exhibitor events can use an application deadline with manual or first-come approval. Organisers review applicants on an Applications tab with status filters, search and clash details; applicants are notified and emailed when approved or rejected, and can request or cancel places in the app._  
  `EP-39836 EP-41663 EP-41666 EP-44664 EP-39841 EP-45600`
- **Session attendee management** · Sessions & Agenda  
  Manage who is scheduled for or has attended a session from a dedicated tab.  
  _Attendees and Favourited move from the session and exhibitor event edit page to a separate Attendees tab, where organisers add or remove scheduled users and mark attendance. After saving, organisers stay on the session’s edit page instead of returning to the list._  
  `EP-41665 EP-44247`
- **Speaker profile events in the app** · Sessions & Agenda [Mobile]  
  See the exhibitor events a speaker or moderator is taking part in from their app profile.  
  _Speaker and moderator profiles in the mobile app gain an Events block listing their active, visible exhibitor events with date, time and an add-to-schedule button._  
  `EP-40261`
- ★ **Advanced campaign and notification targeting** · Community & Communications  
  Target emails and notifications by session, round table and meeting programme activity.  
  _Campaign and notification filters cover session, round table and exhibitor event attributes, profile completeness and meeting programme activity. New campaign variables show each recipient’s meeting programme status and assigned round tables; meeting programme filters appear only when that module is on._  
  `EP-40080 EP-40078 EP-40081 EP-44892`
- **Registration email variables** · Community & Communications  
  Use any registration form field in registration email templates.  
  _Registration email templates for visitors, speakers, moderators and exhibitors can use all system and custom registration fields, grouped as General, System and Custom. Leaderboard tooltips were also reworded._  
  `EP-37164 EP-36649`
- ★ **Lead Capture Pro** · Exhibitor & Sponsor Success [Mobile]  
  Sell lead capture to exhibitors as a paid package for their whole team.  
  _Organisers configure paid lead capture packages and their presentation, and track payments and revenue. Exhibitors buy access for their team, and in the app the Scan Badges page is shown only to exhibitors who have purchased it._  
  `EP-40864 EP-43200 EP-43294 EP-44314`
- **Discount codes in the exhibitor manual** · Exhibitor & Sponsor Success  
  Offer exhibitors discount codes on equipment ordered through the exhibitor manual.  
  _Discount codes apply to items in the Equipment section, targeted by exhibitor category and item. Exhibitors and team members apply codes in the basket, and admins see and export discount usage._  
  `EP-40746`
- **Exhibitor dashboard and sponsor banner improvements** · Exhibitor & Sponsor Success [Mobile]  
  Top performers show all-time results, and banners without links behave consistently in the app.  
  _The exhibitor dashboard's Top Performers block always shows all-time data. On iOS and Android, tapping a sponsored banner that has no website link behaves consistently._  
  `EP-45361 EP-43244 EP-43245`
- ★ **Stand bookmarking on floor plans** · Onsite, Badges & Floor Plans [Mobile]  
  Bookmark stands, sessions, events and custom locations on the ExpoFP floor plan in the app.  
  _App users bookmark a location with a confirmation message and revisit their bookmarks from a list in the floor plan header._  
  `EP-41743`
- **Animated ring on live digital badges** · Onsite, Badges & Floor Plans [Mobile]  
  Help staff spot screenshots of badges and check attendee category at a glance.  
  _Live digital badges can show a moving ring around the QR code in the attendee’s category colour, switched on per event._  
  `EP-43589`
- **Attendee category at check-in** · Onsite, Badges & Floor Plans [Mobile]  
  See each attendee’s category when checking them in, in the check-in app and at kiosks.  
  _The check-in app shows the participant category after a scan and in the manual-add and scanned lists, and kiosks show the visitor category next to names. The app’s logout button is easier to find and asks for confirmation._  
  `EP-42819 EP-42609 EP-44841`
- **Scrolling location text** · Mobile App [Mobile]  
  Read long location names in full on session and networking detail pages in the app.  
  _Location buttons on session, exhibitor event, round table and speed networking pages scroll long text continuously and stay static when it fits._  
  `EP-44837`
- **Meeting programme reports** · Analytics & Reporting  
  Download a full report of a meeting programme’s relevance actions, acceptances and meetings.  
  _A Generate XLS Report button on meeting programme details produces a multi-tab, timestamped report with per-attendee counts of generated, accepted, rejected and confirmed meetings, sponsored and free._  
  `EP-43263`
- **Event system data push-back** · Integrations & Open API  
  Send exhibitors, news and exhibitor content from the platform back to the external event system.  
  _Exhibitors in selected categories, approved news and exhibitor manual brochures, images and videos flow to the external system with an agreed field mapping, including product export columns._  
  `EP-42403 EP-43006`
- **Participant and exhibitor list endpoints** · Integrations & Open API  
  Fetch all participants and exhibitors through paginated API v2 endpoints that return only what changed.  
  _New endpoints list participants and exhibitors with their details, including parent and child companies, with timestamp filters. Deleted participant IDs can also be retrieved._  
  `EP-35897 EP-36021 EP-44632`
- **Admin panel safeguards** · Platform, Security & Admin  
  Avoid accidental changes with warnings on category changes and stronger validation.  
  _Admins confirm participant category changes after a warning that they may affect access, visibility and matchmaking. Region values are validated, and the save and cancel bar is blurred behind for readability._  
  `EP-39674 EP-40207 EP-43097`

### 2025-Q4

- ★ **Invoice payment during registration** · Registration, Ticketing & Payments  
  Let participants choose to pay by invoice when buying paid items during registration.  
  _With the new setting on, registrants can pay by invoice; their paid sessions are scheduled, and the activation email is sent once the organiser confirms payment in Invoice payments._  
  `EP-34905`
- **Lock participant categories** · Registration, Ticketing & Payments  
  Prevent participant categories being changed in the admin panel once registration is set up.  
  _An optional registration setting, off by default, locks the participant category field in the admin panel for all admins._  
  `EP-45795`
- **Switch between ticketing versions** · Registration, Ticketing & Payments  
  Choose old or new ticketing per event or for all events without losing existing tickets.  
  _A module toggle selects the ticketing version per event or globally. Each version keeps its own tickets and settings, and users’ tickets are kept._  
  `EP-46947`
- **Remaining meetings with auto-confirm** · Meetings & Matchmaking  
  Cap auto-confirmed meetings at the exhibitor category limit and show how many meetings remain.  
  _When auto-confirm is on, exhibitor category meeting limits still apply, and the remaining meeting count is displayed on the front end._  
  `EP-46592`
- ★ **Meeting programme management** · Networking Formats  
  Configure and run meeting programmes from the admin panel, from roles and participants through to tables and final schedules.  
  _Organisers set roles, limits and a custom timeline, manage the pre-registered list with dashboards, and review generated meetings in confirmation, schedule and table views with search and filters. They can create or move meetings manually. Both generation runs create sponsored and free meetings, with email and platform notifications at each step._  
  `EP-41325 EP-41245 EP-41378 EP-41435 EP-41432 EP-41431 EP-41459 EP-41460 EP-41461 EP-41682 EP-41707 EP-41731 EP-41768 EP-41712 EP-41773 EP-43916 EP-43922 EP-43914 EP-44786 EP-46480 EP-45791`
- **Meeting programmes in the app** · Networking Formats [Mobile]  
  Follow meeting programmes in the mobile app with notifications, schedule cards and meeting ratings.  
  _App users are notified when added, removed or when final schedules are sent, see placeholder and then per-meeting cards with table numbers in My Schedule, filter them, and rate their meetings._  
  `EP-39154`
- **Round table numbering** · Networking Formats  
  Give every round table in a session a unique number that never shifts.  
  _Table numbers run in one sequence across all topics in a session; new tables take the smallest free number._  
  `EP-45793`
- **Notification and information request improvements** · Community & Communications  
  Open items from the notification dropdown and ask participants for missing registration details.  
  _Notifications in the dropdown are clickable. A participant information request email template and a Send Information Request action in participant profiles and lists let organisers request missing details._  
  `EP-43260 EP-45418`
- **ExpoFP stands with hall numbers** · Onsite, Badges & Floor Plans [Mobile]  
  Link exhibitors to ExpoFP stands whether stand numbers include the hall or not.  
  _The apps follow ExpoFP’s “Map with Hall” setting, matching stands as hall plus stand (for example “Halle 3.0 G61”) or stand only (“G61”)._  
  `EP-45853`
- **Programme and round table reports** · Analytics & Reporting  
  Get more detail in meeting programme reports and export round table assignments.  
  _The meeting programme report adds each exhibitor’s sponsored meeting limit and a relevance tab covering all user types. Each round table session has an export listing assigned attendees with topic and table number._  
  `EP-45789 EP-45788 EP-45794`
- ★ **Public API v3** · Integrations & Open API  
  Start building on the new Public API v3, beginning with events, categories and registration questions.  
  _The first v3 endpoints list an environment's events, exhibitor and participant categories, and the custom questions of the visitor registration pipeline._  
  `EP-46710 EP-46512 EP-46511 EP-45064`
- ★ **Visit integration on API V2** · Integrations & Open API  
  Sync participants and exhibitors with Visit in near real time, with automatic retries and full request logs.  
  _The integration moved to Visit's V2 API, receives updates as they happen, pushes chosen fields back and runs an end-of-day push. Deletions are handled, profile pictures sync both ways, failed calls retry automatically and every request is logged in the admin panel._  
  `EP-42360 EP-42361 EP-42362 EP-42363 EP-42364 EP-47117 EP-50158`
- **Genesis World integration** · Integrations & Open API  
  Connect the platform with the Genesis World CRM.  
  _The first phase of a native integration with Genesis World was delivered._  
  `EP-45950`
- **Editor and admin panel tidy-ups** · Platform, Security & Admin  
  Clear formatting from text in one click and work without the maintenance banner.  
  _The text editor has a remove styling button, and the maintenance warning was removed from the admin panels._  
  `EP-45768 EP-38283`
- **Fewer requests and faster search** · Platform, Security & Admin [Mobile]  
  Get a quicker app and delegate search with fewer calls to the server.  
  _The app sends fewer requests to the server, delegate search responses are lighter, and location data is cached._  
  `EP-44197 EP-45987 EP-45899`
- **Protection against script injection** · Platform, Security & Admin  
  Benefit from protection against cross-site scripting where HTML content is allowed.  
  _Cross-site scripting issues were fixed in places where HTML content is supported._  
  `EP-45748`

### 2026-Q1

- ★ **Custom grids** · Event Websites & Content  
  Build your own page layouts with custom grids and place simple elements such as buttons where you need them.  
  _Organisers set up grids with a chosen number of columns and place elements inside them, with settings positioned alongside the grid. A simple components block adds elements such as buttons._  
  `EP-47651 EP-47652 EP-47653 EP-47658 EP-42261`
- **Carousel and text editor refinements** · Event Websites & Content  
  Carousels behave sensibly with few items, and text editor controls match the builder's theme.  
  _Blocks switch from a swiping slider to a static layout when there are not enough slides, and text editor controls inherit the builder's theme._  
  `EP-46421 EP-37770`
- **Country visibility in new ticketing** · Registration, Ticketing & Payments  
  Target new-style tickets by the registrant’s country as well as category.  
  _Ticket visibility by country, previously available in the older ticketing, is now part of the new ticketing._  
  `EP-33039`
- **Matchmaking and booking improvements** · Meetings & Matchmaking  
  Get more precise matchmaking and spot every available time slot when booking.  
  _Matchmaking was refined for more precise results, and the meeting time picker now shows a scroll hint so users see that more slots are available below._  
  `EP-44267 EP-47793`
- **Meeting programme attendance tracking** · Networking Formats [Mobile]  
  Record completed meetings by badge or QR scan and flag no-shows as an organiser or participant.  
  _Meeting programme meetings can be completed by QR or badge scan, and both organisers and participants can mark a no-show. Ratings open in the app once final schedules are received._  
  `EP-39228 EP-49073 EP-49075 EP-49879`
- **Meeting programme improvements** · Networking Formats  
  Run meeting programmes with a simpler participant view, split voting phases, early exhibitor access and more organiser control.  
  _Voting phases were split and tabs restructured, meeting blocks combine into one schedule list, and exhibitors can get early access. Organisers gained sorting in relevance and opt-in phases, manual meeting deletion, timeslot blocking, optional conditions for team members and a switch to disable notifications; deleted users are removed._  
  `EP-46566 EP-46565 EP-46564 EP-46487 EP-46486 EP-46485 EP-40448 EP-46552 EP-46563 EP-48314 EP-42263 EP-43923 EP-43924 EP-41328 EP-46551 EP-49001 EP-48752 EP-49069 EP-49002 EP-45790 EP-50569`
- **Round table seating controls** · Networking Formats  
  Add people to tables after final schedules and set a limit on the number of tables.  
  _Organisers can add users to a table after the final schedule is sent and define a tables limit. Deleted users are removed from sessions, and round tables run on a new dedicated service._  
  `EP-46473 EP-46474 EP-49077 EP-46238`
- **Speed networking push notifications** · Networking Formats [Mobile]  
  Receive opt-in speed networking updates as push notifications on iOS and Android.  
  _Push notifications for opt-in speed networking were set up in the iOS and Android apps._  
  `EP-33706`
- **Exhibitor event auto-approval rules** · Sessions & Agenda [Mobile]  
  Set up automatic approval for exhibitor event applications with a required capacity limit.  
  _A new auto-approval interface and mechanism for exhibitor event applications, a required limit when the approval process is on, and removal of rejection notifications. Exhibitor events are sorted consistently in exhibitor profiles, and app content settings include exhibitor events._  
  `EP-46201 EP-46203 EP-46204 EP-46207 EP-47797 EP-46550`
- **Messenger conversation filters** · Community & Communications  
  Find active or pending conversations quickly by filtering the inbox by status.  
  _Messenger lets attendees and exhibitors filter conversations by status._  
  `EP-47792`
- **Attend a stand** · Exhibitor & Sponsor Success [Mobile]  
  Attendees can take part in stand activity, with the listing also available in the app.  
  _Adds an 'Attend a stand' capability, with its listing shown in the mobile app._  
  `EP-46483 EP-47311`
- **Category filter cloning and profile loading** · Exhibitor & Sponsor Success  
  Reuse product category filters within an event and see team members load smoothly.  
  _Organisers can clone product category custom filters within an event instead of rebuilding them, and the team members section of public exhibitor profiles shows a loader._  
  `EP-47919 EP-38749`
- **Lead capture app improvements** · Exhibitor & Sponsor Success [Mobile]  
  Never lose a scanned lead, even on unreliable venue networks.  
  _The lead capture form autosaves when an exhibitor leaves it, closes the app or loses connection, then syncs. The Scan Badges page follows Lead Capture Pro access rules, and the custom questions page in the exhibitor profile is clearer._  
  `EP-47877 EP-44306 EP-48886`
- ★ **Offline ExpoFP floor plans** · Onsite, Badges & Floor Plans [Mobile]  
  Use ExpoFP floor plans in the app without an internet connection.  
  _The mobile apps provide full offline support for ExpoFP floor plans._  
  `EP-45052`
- **Bookmarks synced with favourites** · Onsite, Badges & Floor Plans  
  Keep favourites and floor plan bookmarks in step automatically.  
  _Favourites and floor plan bookmarks now sync in both directions, so an item saved in one place appears in the other._  
  `EP-44186`
- **Check-in and QR code improvements** · Onsite, Badges & Floor Plans  
  Use a simplified participant QR code and a refined zone filter in the check-in list.  
  _Admins can choose a new “Simplified Participant QR” code type, and the zone filter in the admin check-in list has new limits._  
  `EP-44749 EP-40616`
- **Clearer custom badge errors with Aditus** · Onsite, Badges & Floor Plans [Mobile]  
  Tell attendees what to do when their Aditus custom badge cannot be shown.  
  _Instead of silently falling back to the standard badge, users are taken to a clear error page for no-connection and no-information cases, available in English and German._  
  `EP-48297`
- **App usability improvements** · Mobile App [Mobile]  
  Open sessions from links, and get clearer feedback on profiles and tickets.  
  _Deep links open sessions directly in the app. The About me section on delegate profiles on iOS was updated, and the Tickets page shows a loading spinner while updating on iOS and Android._  
  `EP-44893 EP-47476 EP-49024`
- **Event data reset without logout** · Mobile App [Mobile]  
  Reset event data in the app mid-event without logging attendees out.  
  _The admin panel’s global resync performs a full reset of app data without logging users out, matching the resync in the app’s settings._  
  `EP-49211`
- **Export additions** · Analytics & Reporting  
  Analyse profile completion and new exhibitors in your own reporting tools.  
  _Participant exports include profile completion, the exhibitor export shows whether each exhibitor is new, and the team member export includes external QR codes._  
  `EP-46247 EP-47499 EP-49223`
- **Meeting programme report additions** · Analytics & Reporting  
  See how each meeting was generated and how it was rated in the programme report.  
  _The All meetings tab of the meeting programme report shows how each meeting was generated and the rating it received._  
  `EP-48386 EP-48851`
- **Better search in the mobile app** · AI & Smart Discovery [Mobile]  
  Search exhibitor descriptions in the app and see exhibitors whose names match your query at the top.  
  _Mobile search now looks at descriptions as well as names, and orders exhibitor results so name matches come before description matches._  
  `EP-46589 EP-48511`
- **More accurate AI search results** · AI & Smart Discovery  
  Find the right exhibitor even with spelling variants, spacing differences or partial names, with helpful suggestions when nothing matches.  
  _Exact name matches now outrank description mentions in results and autocomplete, country and accent variants are recognised, spaced and joined-up names match, parent and child exhibitors follow a consistent order, and empty searches offer 'Did you mean' and category suggestions._  
  `EP-49803 EP-49808 EP-50317 EP-49805 EP-49807 EP-49809 EP-49812 EP-50477`
- ★ **Map Your Show integration** · Integrations & Open API  
  Import exhibitors from Map Your Show, with custom fields and product categories.  
  _Built on the integration hub, the integration fetches exhibitors from the Map Your Show API with their custom fields and product categories, and a second stage completed the remaining requirements._  
  `EP-45440 EP-48154`
- **Integration hub mapping improvements** · Integrations & Open API  
  Map more data through the integration hub, including team member roles, default language and Aditus exhibitor data.  
  _Team member roles can be set in the mapping without downgrading existing admins on resync, exhibitor mappings include a default language field, and exhibitor and team member data can be pushed to Aditus._  
  `EP-46657 EP-47958 EP-50667`
- **More Public API v3 endpoints** · Integrations & Open API  
  Check accounts, read registration questions, export meetings and pull check-in data through Public API v3.  
  _New v3 endpoints check whether an account exists, return visitor and exhibitor registration custom questions, export meetings with filters and incremental sync, and provide check-in data. Emails can also be used when creating accounts through the API._  
  `EP-46489 EP-46513 EP-46514 EP-47892 EP-45958 EP-44419`
- **Locale-aware dates and translations** · Platform, Security & Admin  
  Show dates in the format of each user’s language, with more complete translations.  
  _Date formats follow the locale, and missing languages and system translations were added._  
  `EP-46596 EP-46955 EP-47038`
- **More sign-in options** · Platform, Security & Admin [Mobile]  
  Offer both single sign-on and standard login, including a second external login option in the app.  
  _The sign-in modal offers SAML single sign-on or standard login, the mobile app can show a configurable second external login button, and sign-in buttons gain a hover colour._  
  `EP-48719 EP-49318 EP-48919`
- **Profile completion tracking** · Platform, Security & Admin  
  See each participant’s profile completion in the admin panel with a more accurate score.  
  _The profile completion calculation was updated, and the admin participants list shows each participant’s completion status._  
  `EP-49221 EP-49202`
- **Stay on page when saving** · Platform, Security & Admin  
  Save changes in the admin panel without losing your place, and see a warning while an event is cloning.  
  _Saving or applying changes in key admin modules keeps organisers on the same page. A persistent banner across admin pages warns not to edit an event while it is being cloned._  
  `EP-47917 EP-48874`

### 2026-Q2

- **Card styling options** · Event Websites & Content  
  Give every card view borders and shadows, and hide the button on individual cards without custom CSS.  
  _Border and shadow options were added to card views that lacked them, and each card has a toggle to show or hide its call-to-action button._  
  `EP-50364 EP-50339`
- **Footer layout controls** · Event Websites & Content  
  Lay out the website footer more precisely, with column alignment, text position and logo width settings.  
  _Footer columns can be aligned and deleted, text position is configurable and logo plus text width can be set. The 'Powered by ExpoPlatform' footer branding can be shown or hidden per event._  
  `EP-37947 EP-37526 EP-37518 EP-35590 EP-54112`
- ★ **Personalised AI meeting notes** · Meetings & Matchmaking [AI, Mobile]  
  Get AI meeting notes tailored to you, in the meeting's language, and revisit them from a notes list on web and mobile.  
  _Each user receives personalised meeting notes, with a notes list on web to revisit notes tied to their meetings, and personalised notes on mobile. Outputs are produced in the language the meeting was held in, and action points go to all participants as one shared list._  
  `EP-49217 EP-49577 EP-51149 EP-48113 EP-23843`
- **Meeting setup improvements** · Meetings & Matchmaking [Mobile]  
  Set up matchmaking categories faster and get improved table meeting setup and meeting cards in the app.  
  _Selecting a parent category in Networking & Matchmaking now selects all its child categories. The app gained improvements to table meeting setup and meeting cards._  
  `EP-47953 EP-6281`
- **Centralised meeting formats admin** · Networking Formats  
  Manage speed networking, meeting programmes, concierge meetings, round tables and exhibitor events from one place.  
  _Module management for meeting formats was restructured, with a central area for speed networking, meeting programmes and concierge meetings. Email templates for every format are managed there, round tables are managed independently, and exhibitor events management was enhanced._  
  `EP-50129 EP-50104 EP-50105 EP-50107 EP-50109 EP-50110`
- **Smarter meeting generation** · Networking Formats  
  Get fuller, fairer generated schedules for speed networking and meeting programmes.  
  _Meetings are spread more evenly across participants, likes can be pooled across an exhibitor's team, one-sided likes can count as mutual for chosen role directions, and extra pairs can be generated where no likes exist. Invalid input now returns an error rather than creating meetings in blocked slots, and sponsored limits no longer block organiser-created meetings._  
  `EP-39148 EP-39150 EP-49192 EP-50818 EP-52147 EP-50840 EP-53330 EP-50642 EP-53334`
- **External session registration links** · Sessions & Agenda  
  Send attendees from a session’s Register button to an external registration or payment page.  
  _Organisers set a per-session external registration URL with a custom button label and an external-link icon, used during the pre-event and live event._  
  `EP-52375`
- **Now and upcoming sessions** · Sessions & Agenda [Mobile]  
  Jump straight to what is on now and next in the app’s session list.  
  _On the current day, the mobile Sessions list scrolls to the current time with a now separator and highlights Now and Upcoming sessions._  
  `EP-48378`
- **Session cards and admin filters** · Sessions & Agenda  
  Find sessions faster in admin and see type and host details on session cards.  
  _The admin Sessions and Exhibitor Events pages gain filter sections such as session type. Detail cards show the session or exhibitor event type, and exhibitor event cards show the hosting exhibitor’s name._  
  `EP-48239 EP-53048 EP-53049`
- **Clearer recommendation blocks in emails** · Community & Communications  
  Send campaign emails whose recommendation blocks are full width and clearly separated.  
  _Recommendation blocks in organiser campaign emails use full-width card layouts with clear boundaries, matching the visitor-side design._  
  `EP-50897`
- ★ **Lead Capture Pro access control** · Exhibitor & Sponsor Success [AI]  
  Grant lead capture, product QR codes and AI notes by exhibitor category or individual exhibitor.  
  _Organisers enable lead capture, product QR codes and AI meeting notes per exhibitor category or per exhibitor from one consolidated settings area. The purchase page marks features already granted as purchased, and standard questions have a configurable default state._  
  `EP-50123 EP-50124 EP-50125 EP-50126 EP-50127 EP-49735 EP-49740 EP-54359 EP-54261 EP-46050`
- **Exhibitor permissions and team rules** · Exhibitor & Sponsor Success [Mobile]  
  Product visibility follows the exhibitor's restrictions, and team logins stay unique.  
  _Products inherit their exhibitor's visibility and message and meeting restrictions on web and mobile. Team member creation rules were updated with login uniqueness checks, and Google+ was removed from brand social links._  
  `EP-50974 EP-53945 EP-52566`
- **Lead capture improvements** · Exhibitor & Sponsor Success [Mobile]  
  Protect attendee privacy at the stand and see richer lead details.  
  _Attendee emails can be shown only after a badge scan. Scanned visitor QR codes include team members, lead contribution counts meeting appointments, notes have a character limit, and interaction dashboards show each participant's company._  
  `EP-51659 EP-40302 EP-52952 EP-46360 EP-54733`
- **Multilingual exhibitor manual documents** · Exhibitor & Sponsor Success  
  Give exhibitors the exhibitor manual document in their own language.  
  _Organisers upload a separate file for each event language within one exhibitor manual entry, and exhibitors see only the file for their selected language._  
  `EP-49295 EP-49298`
- **Random sponsor order and visibility** · Exhibitor & Sponsor Success [Mobile]  
  Rotate sponsors fairly and make sure sponsor names always show.  
  _Sponsors and sponsored products can be shown in random order on web and in the app, or by matchmaking score in the app. The legacy view shows up to 150 sponsors, sponsor names always appear on session cards and pages, and the custom sponsor limit has a tooltip._  
  `EP-50051 EP-50249 EP-52414 EP-53036 EP-41570`
- ★ **OCR badge scanning** · Onsite, Badges & Floor Plans [Mobile]  
  Capture badge details by reading the printed text with OCR when scanning.  
  _Badge scanning can use optical character recognition to read badges._  
  `EP-45778`
- **Floor plan management improvements** · Onsite, Badges & Floor Plans  
  Manage halls and stands on large internal floor plans faster.  
  _Halls and stands can be sorted in natural order and deleted in bulk with multi-select, and hidden halls can be opened from an exhibitor’s card._  
  `EP-51701 EP-20247`
- **Offline feedback for favourites** · Mobile App [Mobile]  
  Let users know when a favourite cannot be saved because they are offline.  
  _Tapping Favourite without a connection shows the app’s standard connection-lost message across lists, profiles and recommendations on Android and iOS._  
  `EP-52358 EP-52359`
- ★ **Automated event reporting dashboards** · Analytics & Reporting [Mobile]  
  Track exhibitors, attendees, app adoption, meetings, sessions and products in ready-made dashboards in Analytics.  
  _New dashboards sit in their own Analytics section: exhibitor analytics, attendee analytics, platform performance, mobile app downloads and adoption, meetings and messaging, top sessions and session types, and product categories and listings, with KPI cards, trends, filtering and drill-down._  
  `EP-47443 EP-52363 EP-52364 EP-52365 EP-52366 EP-52367 EP-52368 EP-52369 EP-52392 EP-54553`
- **Co-located event check-in comparison** · Analytics & Reporting  
  Compare check-ins across co-located events and see attendees who cross over.  
  _The total check-in and check-out graph compares co-located events and shows crossover check-ins, filterable by badge origin._  
  `EP-49438`
- **Faster report exports** · Analytics & Reporting  
  Download session and booking reports faster and more reliably on large events.  
  _The by-session export was reworked to run in the background more reliably, and the by-booking report loads each page with a fixed set of queries._  
  `EP-50643 EP-54274`
- **Google Analytics 4 support** · Analytics & Reporting  
  Track event website traffic with Google Analytics 4.  
  _GA4 tracking works again on event websites, and the Google Analytics ID field in the admin panel validates the GA4 format, with placeholder and help text; leaving it empty turns tracking off._  
  `EP-53455 EP-53548`
- **Meeting outcome columns in reports** · Analytics & Reporting  
  See whether meetings took place and how likely they are to lead to business.  
  _The meetings report and custom meeting wizard report include business transaction likelihood and meeting did not take place columns._  
  `EP-53966`
- ★ **AI event assistant for sessions** · AI & Smart Discovery  
  Ask the AI event assistant about sessions by day, topic, time or format instead of scrolling through the full agenda.  
  _A sessions and agenda tool was built into the first phase of the AI event assistant, so it can answer attendee questions about the programme._  
  `EP-50773`
- **AI search across the event** · AI & Smart Discovery  
  Search exhibitors, people, sessions, products and news semantically, with filters and paging that work alongside AI relevance.  
  _A new AI search service indexes exhibitors, team members, products, people, sessions and news, and stays up to date as data changes. Marketplace filters narrow AI results, and results can be paged beyond the first set._  
  `EP-48436 EP-49810 EP-52169 EP-52173 EP-53552 EP-54178 EP-54179 EP-54404`
- **New recommendation service** · AI & Smart Discovery  
  Get category-based recommendations and matching scores from a rebuilt recommendation service that responds quickly from the first request.  
  _The service calculates matching scores from category similarity and provides recommendations through a new API. Start-up delay on an event's first request was cut, and caching now updates incrementally._  
  `EP-46045 EP-47167 EP-48058 EP-49473 EP-54438`
- ★ **Public API v3 content endpoints** · Integrations & Open API  
  Pull sponsors, products, floor plan halls and stands, session metadata and reference data through Public API v3.  
  _New v3 endpoints return sponsors and sponsor categories, products and exhibitors, and event-scoped floor plan halls and stands. Session tracks, types, tags and languages, countries and regions follow with localisation, sorting, paging and modified-since filters._  
  `EP-45065 EP-51830 EP-51438 EP-52613 EP-51337 EP-51338 EP-51344 EP-51343 EP-51360 EP-51359 EP-51355 EP-51354`
- **CDS participant integration** · Integrations & Open API  
  Sync large volumes of registrations from CDS reliably.  
  _Participants are pulled from CDS page by page with full field mapping, matched by email for updates, with order type and included items set in the admin panel._  
  `EP-48618 EP-46776`
- **D2i integration** · Integrations & Open API  
  Import registration and attendee data from D2i automatically.  
  _A native integration searches and pages through D2i registrations and syncs only changed records, with D2i as the source of truth._  
  `EP-52290`
- **Integrations move to the integration hub** · Integrations & Open API  
  Run the Aventri, Aditus and A2Z integrations on the integration hub.  
  _The Aventri V2, Aditus and A2Z integrations were migrated to the integration hub._  
  `EP-46288 EP-47099 EP-45439`
- **Admin panel navigation and pagination** · Platform, Security & Admin  
  Move through admin lists consistently and return to the page you were on.  
  _Pagination is standardised across admin listings and remembers your position as you navigate. The sponsorship section moved as part of a navigation restructure, and the colour picker rejects invalid values._  
  `EP-52457 EP-52989 EP-53117 EP-53413 EP-52556`
- **Lighter requests and loading feedback** · Platform, Security & Admin  
  Get faster page loads with fewer unnecessary requests.  
  _Empty banner placements are no longer requested repeatedly, unnecessary sign-in checks and database connections were cut, and file download buttons in the user profile show a loader._  
  `EP-54157 EP-48260 EP-49453 EP-45868`
- **Security hardening** · Platform, Security & Admin  
  Benefit from protection against email flooding and tighter API error handling.  
  _The resend endpoint is rate limited per IP with temporary blocking, and the schedule note API no longer exposes internal server details in errors and enforces authorisation._  
  `EP-52804 EP-52467`

### 2026-Q3

- ★ **AI-assisted website styling** · Event Websites & Content [AI]  
  Restyle website blocks by describing the change in plain language and let AI generate on-brand CSS.  
  _Organisers describe a change in everyday words; the builder sends the block's structure and design tokens through a secure server-side connection, shows the generated CSS for review and applies it only to that block._  
  `EP-52651 EP-52647 EP-52648 EP-52649 EP-52650`
- **Editable marketing tracking links** · Event Websites & Content  
  Edit the name and destination of existing tracking links without recreating and re-sharing them.  
  _Each tracking link has an edit action to update its name and landing page URL, with validation._  
  `EP-54929`
- **Header layout and mobile search** · Event Websites & Content  
  Choose header scroll behaviour and line layout, and search by category on mobile.  
  _Header menus gain scroll settings and a line layout. Mobile header search shows the categories selector and its panel pushes content down instead of covering it._  
  `EP-39660 EP-39685 EP-55199`
- ★ **New registration experience** · Registration, Ticketing & Payments  
  Registrants move through a rebuilt, step-by-step registration with tickets, sessions, a summary and payment in one flow.  
  _Email verification catches duplicates and resumes unfinished or repeat registrations with data pre-filled. Tabs with a live order summary cover conditional fields, tickets held during checkout, session booking, discount codes, terms and payment. Category links pre-filter tickets, and organisers switch each event to the new flow when ready._  
  `EP-54663 EP-54664 EP-54665 EP-54667 EP-54668 EP-54669 EP-54670 EP-54671 EP-54672 EP-54673 EP-54674 EP-54676 EP-54679 EP-54684 EP-54685 EP-55250 EP-31418`
- **Approval, buyer and waiting-list flows** · Registration, Ticketing & Payments  
  Run approval-based, buyer and capacity-limited registrations in the new flow, with payment collected after approval.  
  _Private events with public access and buyer registrations submit for organiser approval, then pay through the basket once activated. Participants can upgrade to buyer with pre-filled data, and registrations over the limit join a waiting list with its own email._  
  `EP-54680 EP-54681 EP-54682 EP-54683`
- **Branded registration pages** · Registration, Ticketing & Payments  
  Brand the registration welcome, confirmation and sold-out pages for participants and buyers without custom code.  
  _A visual constructor sets hero image, title and description per language for welcome pages. Confirmation pages support merge variables such as name, QR code and badge link, scripts or a custom website page. A sold-out page offers a configurable call-to-action button._  
  `EP-54656 EP-54657 EP-54658 EP-54659 EP-54661 EP-54662 EP-54677 EP-54678 EP-33119`
- **Checkout and payment admin improvements** · Registration, Ticketing & Payments [Mobile]  
  Complete free bookings in one step, find payments quickly and keep app registrants in the flow when reading the terms.  
  _Bookings with a total of zero skip the payment form and go straight to the success page. Transaction and invoice payment pages can be searched by payer name or email. In the app, the terms of use open in the device browser._  
  `EP-55358 EP-54690 EP-54612`
- **AI meeting notes add-on** · Meetings & Matchmaking [AI]  
  Offer AI meeting notes to exhibitors as a paid Lead Capture Pro add-on they can buy themselves.  
  _Organisers enable AI meeting notes as a Lead Capture Pro add-on and set its price in the event's payment currency. Exhibitors see and buy it on the Lead Capture Pro page, unlocking AI transcription for their whole team._  
  `EP-49766 EP-49988`
- **Meeting management improvements** · Meetings & Matchmaking [Mobile]  
  Respond to meetings in bulk without waiting for large teams to load, and restrict meetings with exhibitors without teams in the app.  
  _Bulk Respond now opens instantly regardless of team size and refreshes after changes are applied. The mobile app respects the setting that restricts meetings with exhibitors who have no team members._  
  `EP-56351 EP-54268`
- **Round table waitlist replacement** · Networking Formats  
  Fill freed round table seats from the waitlist with eligible candidates detected automatically.  
  _Waitlist replacement now works out eligible candidates itself: applicants who have not already been invited to a seat in any generation or earlier replacement._  
  `EP-56891`
- ★ **Session calendar view** · Sessions & Agenda [Mobile]  
  Browse the agenda in a day, week or multi-day calendar, search it and add sessions without leaving the view.  
  _The calendar handles overlapping sessions, shows a live now indicator and marks sessions already in the attendee’s schedule. Search by title or speaker, a slide-out drawer with session details and bookmarking, logged-out browsing and optional exhibitor events in the mobile calendar are included._  
  `EP-54343 EP-54324 EP-55558 EP-51704 EP-51705 EP-51706 EP-57107 EP-44911`
- **Default view and track colours** · Sessions & Agenda  
  Choose the default layout of the Sessions page and give tracks custom colours.  
  _A Default view setting in Sessions config makes List, Grid or Calendar the first layout attendees see on the Sessions and Exhibitor Events pages, and tracks can have custom colours._  
  `EP-55021 EP-55466`
- **Exhibitor event location improvements** · Sessions & Agenda [Mobile]  
  Place exhibitor events at any floor plan location and translate predefined locations.  
  _An optional setting lets exhibitor events use any live floor plan location, not just the exhibitor’s stand. Predefined other locations can be stored per language, and exhibitor events show even when no team member is assigned._  
  `EP-55020 EP-54081 EP-54235`
- **Custom SMTP email sending** · Community & Communications  
  Send platform emails through your own SMTP service.  
  _A setting lets organisers use a custom SMTP service for sending emails._  
  `EP-15768`
- **Exhibitor insights portal** · Exhibitor & Sponsor Success  
  Exhibitors see the results of their event participation in one place.  
  _The first insights page shows leads captured, meetings held, profile views, message reply rate, best single day and benchmarking against peers, based on real event data._  
  `EP-56919`
- **Lead Capture Pro per team member** · Exhibitor & Sponsor Success [Mobile, AI]  
  Turn lead capture and AI meeting notes on for individual team members, with unlimited questions for buyers.  
  _The app applies lead capture and AI meeting notes access per exhibitor owner and team member. Exhibitors who buy custom questions get unlimited standard and additional lead questions._  
  `EP-50535 EP-48813`
- **Region filters and brand import** · Exhibitor & Sponsor Success  
  Filter listings by region and keep exhibitors' brands when they join new events.  
  _An optional Region filter nested under Country narrows exhibitor and participant listings on web. Exhibitor import and adding from the global database attach an exhibitor's existing brands, and exhibitor settings include a logo option._  
  `EP-55645 EP-55642 EP-44730`
- **Sponsored placements in global search** · Exhibitor & Sponsor Success  
  Sell sponsored banners, exhibitors and products on the global search page.  
  _Global search shows a sponsorship banner plus rotating sponsored exhibitor and sponsored product blocks with configurable labels and colours. Sponsor cards now show location, tags and products, and exhibitors with several stands display them clearly._  
  `EP-47680 EP-53767 EP-53768 EP-55625`
- **App branding and typography** · Mobile App  
  Apply a custom typeface consistently across every Android screen.  
  _A custom font set in the app builder now covers all remaining Android screens for a consistent look, and the app shows ExpoPlatform branding._  
  `EP-56372 EP-54106`
- **Sponsorship and engagement reporting** · Analytics & Reporting [Mobile]  
  Measure sponsor performance by asset and clicks on app homepage elements.  
  _A sponsorships dashboard shows views, clicks and click-through rate per sponsor and asset, backed by a new sponsor interactions report. A click and impression report for mobile app homepage elements is available as an admin panel export, and existing dashboard graphs were refined._  
  `EP-52370 EP-54784 EP-55287 EP-57186`
- ★ **Unified global search** · AI & Smart Discovery  
  Search everything from one field with live suggestions and a single results page that groups people, sessions and content.  
  _The search field suggests queries as you type and opens a unified results page with top results, quick links, 'Show all' views, saved queries and a way back to results from any detail page. Organisers control which blocks appear, their labels and order, and search terms in links filter news, participants and sessions._  
  `EP-47674 EP-51742 EP-47675 EP-47678 EP-55295 EP-47681 EP-55706 EP-55109 EP-56418 EP-57221`
- **More content in AI search** · AI & Smart Discovery  
  Find pavilions, community groups and on-demand sessions through AI search.  
  _Pavilions are indexed with their grouped exhibitors, community groups can be found by name or topic, and on-demand sessions are searchable by title, speaker or topic._  
  `EP-54858 EP-54859 EP-54860`
- **Redesigned admin AI assistant** · AI & Smart Discovery  
  Use a redesigned chat interface for the AI assistant in the admin panel.  
  _The admin assistant has a new front end, built as the first version of the interface for the platform's AI assistant._  
  `EP-53589`
- ★ **Integrations catalogue** · Integrations & Open API  
  See every available integration in one catalogue in the admin panel, with its category and status for your event.  
  _A new Integrations page lists hub and existing integrations with descriptions, category tags and whether each is active for the event. SAML 2.0 settings now have their own page in the catalogue._  
  `EP-55251 EP-57684`
- **API sponsor analytics and session filters** · Integrations & Open API  
  Read sponsor interaction analytics and set custom session filters through the public API.  
  _A new endpoint returns sponsor views, clicks, favourites, meetings and messages, and session endpoints can set and return up to five custom filters._  
  `EP-54772 EP-57347 EP-57348`
- **More reliable integration syncing** · Integrations & Open API  
  Keep partner data in step with self-healing sync, sync history and email-first matching.  
  _ExpoFP and Visit now run on the hub's automatic update engine, with removed exhibitors recreated, sync history and logs, and a configurable polling interval. An 'Email First' matching option keeps attendee profiles together when their email changes upstream._  
  `EP-54115 EP-56245 EP-54452`
- **Product management in Public API v3** · Integrations & Open API  
  Create, update and delete products across all events through the API, including their images, videos and media.  
  _New v3 endpoints create global products, update global fields, delete a product from every event in one call, and upload or remove images, videos and media files, keeping image order and the main image._  
  `EP-52837 EP-52840 EP-52841 EP-55240 EP-55241 EP-55242 EP-55243 EP-55533 EP-55534`
- **Swoogo integration** · Integrations & Open API  
  Sync registrants, speakers and exhibitors from Swoogo automatically, including cancellations.  
  _The inbound integration runs on the integration hub, matches records by external ID, groups exhibitors by company and keeps team members linked._  
  `EP-54645`
- **Faster web pages** · Platform, Security & Admin  
  Load web pages and images faster with less data transferred.  
  _The portal requests resized WebP images instead of originals, the web app manifest is cached instead of refetched on every navigation, and frontend bundles and builds were optimised._  
  `EP-57489 EP-57336 EP-54861 EP-49045`
- **Private favourites for opted-out users** · Platform, Security & Admin [Mobile]  
  Let attendees who opt out of networking favourite exhibitors, people and products privately.  
  _Opted-out users can favourite and unfavourite exhibitors, visitors, speakers and products on web and in the app, with the action kept private so they are not exposed as leads._  
  `EP-53978 EP-57577`
- **Redesigned admin panel pages** · Platform, Security & Admin  
  Work in a cleaner, modern admin panel on the most used pages, with nothing to relearn.  
  _Event setup, categories setup, event list, exhibitor list, participants list and sessions list pages were restyled to a new design with no change to how they work._  
  `EP-54462 EP-54463 EP-54464 EP-54465 EP-54466 EP-54547`
- **Selective event cloning** · Platform, Security & Admin  
  Choose exactly which content carries over when you clone an event.  
  _The clone dialog offers separate checkboxes for sponsors, news, sessions, local categories and other content categories._  
  `EP-52816`
- **Separate sign-in settings by profile** · Platform, Security & Admin  
  Configure one-time password sign-in separately for company and individual profiles.  
  _Organisers set one-time password authentication independently for company and individual profiles per event, and admin accounts gain a phone field._  
  `EP-54790 EP-44947`
- **Trusted embed domains** · Platform, Security & Admin  
  Embed authenticated content such as on-demand sessions on approved partner sites.  
  _A security settings section lets organisers whitelist trusted external domains so authenticated content plays when embedded there._  
  `EP-55082`
