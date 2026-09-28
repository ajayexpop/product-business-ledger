import json,re
B='/Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash/data/roadmap/wwo/'
d=json.load(open(B+'input/g4.json'))
F={
'sessions-exhibitor-events-launch':({"outcome":"Exhibitors publish events and see who booked them, organisers keep approval in their hands, and attendees find and book exhibitor events on their own Marketplace tab and in My schedule."},
 "outcome said attendees find exhibitor events 'in the same place as sessions'; EP-11663 moved them out of Sessions onto their own Marketplace tab"),
'sessions-session-filter-improvements-2023q1':({"outcome":"Attendees filter sessions by the fields that matter for each event, see speakers before they activate their accounts, and land in the online room straight after signing in."},
 "outcome 'see every speaker' overstates: EP-10629 keeps blocked, banned and waitlisted speakers hidden"),
'sessions-exhibitor-event-controls':({"outcome":"Organisers keep approved events stable, review later edits side by side before approving them, and import events for child exhibitors and contacts."},
 "outcome 'before they go live' is not in the source; EP-13125 only says post-approval edits are shown before and after for review"),
'sessions-session-import-schedule-download':({"detail":"The five session filters are included in the sessions XLS import and export. The Export data button on My Schedule and Team Schedule becomes Download My Schedule, and sessions gained additional indexes for online type, dates and description.",
  "what":"The five session filters are included in the sessions XLS import and export. The Export data button on My Schedule and Team Schedule is now Download My Schedule, and sessions have extra indexes for online type, dates and description."},
 "detail/what claim indexes sped up session loading; EP-18389 only adds indexes (online type, dates, description), no speed result stated"),
'analytics-export-progress':({"detail":"Exports show a percentage progress indicator and a cancel button, and a clear status while the file is being generated. The check-in export uses far fewer database queries."},
 "detail 'check-in export runs faster' is not shown; EP-16615 only reduces a query that ran up to 1,000 times a second"),
'sessions-session-speaker-management-2023q3':({"benefit":"Avoid double-booking speakers, control anonymous questions and give the app's speaker list its own menu item.",
  "detail":"Speakers and moderators with blocked time can no longer be assigned to clashing sessions unless organisers allow it. Organisers can hide the Ask anonymously option in session rooms, the app's speaker list moves to its own menu item, and the apps show the price on past paid sessions."},
 "benefit/detail said speakers get their own menu page; EP-18460 moves the app's speakers list out of the sessions page into its own menu item"),
'ai-search-refinements-2023q4':({"benefit":"Search from one simpler search bar, with products, brands, sessions and exhibitor events matched on more fields.",
  "outcome":"Attendees use the same search bar across the main listing pages, find sessions by speaker and events by exhibitor, and only see people they are permitted to see."},
 "benefit 'find content faster' and 'more accurate ranking' are unsupported; outcome 'every page' overstates (EP-19987 lists specific pages)"),
'analytics-checkin-analytics-refresh':({"outcome":"Organisers follow attendance through the event, check each participant's daily movements, export the list and manage check-in zones that stay in sync with the floor plan."},
 "outcome said zones are managed 'from the floor plan'; EP-24654 manages them on the Check-in zones page, synced with the floor plan"),
'ai-global-search-expansion':({"detail":"The search engine now covers every main section with section-specific multipliers and filters, is on by default for new events and matches exhibitor names on exhibitor events. The Android app keeps search results when users return from a profile.",
  "why":"Search needed to reach every main section of the event with the same ranking, and on Android going back from a profile reloaded the results page.","basis":"implied"},
 "detail 'update more reliably' is vague: EP-35825 keeps Android results on Back; why led with an internal database-efficiency reason (EP-23759) while the main change (EP-13096) states no problem, so basis implied"),
'analytics-session-report-additions':({"outcome":"Organisers review reported and rejected exhibitor events, with when each was created and last edited, from one export for security checks."},
 "outcome 'edit history' overstates; EP-31429 adds only date of creation and date of last edit"),
'sessions-session-scheduling-improvements-2024q4':({"outcome":"Organisers and exhibitors spot a location and time clash before saving and can change it or save anyway."},
 "outcome claimed a result ('fewer overlapping sessions are created'); EP-16924 value states it only as an aim"),
'analytics-marketplace-supply-demand':({"detail":"The supply and demand graph tooltip names the product category, and categories that share the same values are listed clearly in one tooltip."},
 "detail 'all categories are displayed on the same scale' is wrong; EP-31157 lists categories with the same set of values together in one tooltip"),
'sessions-speaker-profile-events-app':({"outcome":"App users see the exhibitor events a speaker is taking part in from one profile and add them to their schedule there."},
 "outcome 'every event' overstates; EP-40261 lists only active, visible exhibitor events"),
'sessions-exhibitor-event-auto-approval':({"why":"Organisers need to decide on many applications within a set number of places, and users did not appreciate rejection messages.","basis":"implied"},
 "why 'fair, quick way' is not stated anywhere (writer's evidence admits fairness implied); only the rejection part is stated in EP-46207, so basis implied"),
'ai-ai-search-relevance':({"benefit":"Find the right exhibitor even with language or accent variants, spacing differences or partial names, with suggestions when nothing matches.",
  "detail":"Exact name matches now outrank description mentions in results and autocomplete, language and accent variants of names are recognised, spaced and joined-up names match, parent and child exhibitors follow a consistent order, and empty searches offer 'Did you mean' and category suggestions.",
  "outcome":"Attendees reach the exhibitor they mean even with a name in another language, different spacing or a partial name, and get 'Did you mean' and category suggestions instead of an empty page."},
 "benefit/outcome said 'spelling variants' and detail 'country variants'; EP-49808 covers language (endonym/exonym) and accent variants; 'helpful' dropped. Note: all stories were fixes found in a client search pilot"),
'sessions-session-cards-admin-filters-2026q2':({"benefit":"Filter sessions and exhibitor events in admin and see type and host details on session cards.",
  "outcome":"Organisers narrow the admin session and event lists with filters instead of scanning, and attendees see what an item is and who hosts it without going back to the list."},
 "benefit 'find sessions faster' / outcome 'quickly' have no evidence; EP-48239 only adds filter sections"),
'analytics-faster-exports':({"outcome":"Organisers download session and booking reports more reliably, including on large events."},
 "outcome 'without long waits or failed exports' is absolute; EP-50643/EP-54274 only make the exports faster and more stable"),
'ai-ai-event-assistant':({"outcome":"In the assistant's first phase, attendees can ask what is on and get relevant sessions back instead of scrolling the full agenda."},
 "EP-50773 is the sessions tool for the Phase-1 AI agent proof of concept; outcome presented it as generally available, now tied to the first phase as the detail already says"),
'ai-ai-search-service':({"outcome":"Attendees search by meaning across the event, narrow results with the filters they already use and page beyond the first set of results, with current data."},
 "outcome 'page through every relevant match' overstates EP-54179 (offset paging beyond the first set)"),
'ai-recommendation-service':({"benefit":"Get category-based recommendations and matching scores from a rebuilt recommendation service with a shorter wait on an event's first request.",
  "outcome":"Attendees get category-based recommendations and matches, with a shorter wait the first time an event's recommendations are requested."},
 "benefit/outcome claim it 'responds quickly'; EP-49473 only says first-request time was significantly reduced from 30-50 seconds"),
'sessions-exhibitor-event-locations-2026q3':({"outcome":"Exhibitors place events where they actually happen, attendees see the right location in their language, and exhibitor events show even without an assigned team member."},
 "outcome 'every exhibitor event is listed' overstates; EP-54235 only fixes events with no team member (visibility rules still apply)"),
'analytics-sponsorship-engagement-reporting':({"benefit":"Measure sponsor performance by asset in a sponsorships dashboard.",
  "detail":"A sponsorships dashboard shows views, clicks and click-through rate per sponsor and asset, backed by a new sponsor interactions report, and existing dashboard graphs were refined.",
  "what":"A sponsorships dashboard shows views, clicks and click-through rate per sponsor and asset, with sponsor KPI cards, backed by a new sponsor interactions report.",
  "why":"Organisers could not easily report sponsor performance by asset such as banners, brand pages and links.",
  "outcome":"Organisers show each sponsor how their banners, pages and links performed, counting confirmed sponsors only.",
  "who":["Organisers","Sponsors"]},
 "EP-57186 app homepage click/impression report is 'explicitly scoped as a one-off' client request, not a platform capability, so removed from all fields; also EP-52370 was 'in testing' when summarised, confirm status before publishing"),
'ai-admin-assistant-redesign':({"outcome":"Organisers ask the admin assistant for help in a redesigned chat window."},
 "outcome 'cleaner' is an unsupported judgement; EP-53589 only says redesigned"),
}
OK={
'sessions-session-calendar-view':"supported by EP-51704/05/06, EP-54324, EP-57107; caveat: EP-51704 (calendar component) ai summary said 'In progress, not yet released' when written, confirm it shipped before publishing",
'analytics-event-reporting-dashboards':"dashboards, KPI cards, trends, filters, drill-down and why supported by EP-52363 to EP-52369 and EP-54553; caveat: EP-52369 (products) and EP-52392 were 'in testing' when summarised, confirm status",
}
out=[]
for r in d:
    i=r['id']
    if i in F: out.append({"id":i,"verdict":"fix","fix":F[i][0],"reason":F[i][1]})
    else: out.append({"id":i,"verdict":"ok","fix":{},"reason":OK.get(i,"all claims supported by the listed stories; rules and limits met")})
json.dump(out,open(B+'g4_v/verdicts.json','w'),ensure_ascii=False,indent=1)
# checks
L={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
bad=re.compile(r'—|–|EP-\d|IMEX|FBF|Hyve|Informa\b|seamless|powerful|revolution|game-chang|effortless|cutting-edge|\bprogram\b|organiz|color|analyz|favorit|optimiz|helpful',re.I)
ids=[o['id'] for o in out]; assert ids==[r['id'] for r in d] and len(set(ids))==len(ids)==77
assert set(F)|set(OK) <= set(ids)
for o in out:
    for k,v in o['fix'].items():
        if k in L:
            assert len(v)<=L[k],(o['id'],k,len(v))
            assert not bad.search(v),(o['id'],k,bad.search(v).group())
        if k=='basis': assert v in('stated','implied')
        if k=='who': assert 1<=len(v)<=3
        if k=='title': assert 2<=len(v.split())<=6
print('ok',len(out),'fixed',sum(o['verdict']=='fix' for o in out))
