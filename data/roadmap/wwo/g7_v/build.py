import json,re
B='/Users/admin/orca/workspaces/Crossteamdash/CrossTeamDash/data/roadmap/wwo/'
d=json.load(open(B+'input/g7.json'));w={c['id']:c for c in json.load(open(B+'g7_w/wwo.json'))}
F={
'next-0':({'benefit':"Each exhibitor will get a personal page with their leads, buyer intent and product interest, opened from a secure email link."},
 "Benefit says 'the first part is already live' but no story is Done (EP-56918/56920 Ready for release, others in testing or Ready to start)."),
'next-1':({'benefit':"Calendar views in the app for sessions and exhibitor events, plus all-day sessions, redesigned session cards and multi-day view improvements.",
  'what':"The app will add calendar views for sessions and for exhibitor events, with 1-day and 3-day grids, overlap handling, track filters and search. The calendar will also show all-day sessions and get redesigned session cards."},
 "EP-57014 is 'Multi-day Session Calendar View Enhancements' (title only), not multi-day sessions; EP-57237 only relabels the existing track drawer tab, it does not add a drawer."),
'next-2':({'title':"More session and exhibitor event filters",
  'benefit':"Location and language filters, required custom category filters in the filter pop-up, and filter options sorted alphabetically.",
  'outcome':"Attendees will find sessions and exhibitor events by where they take place and the language they are held in, and pick filter options from an alphabetical list."},
 "Title over 6 words; 'custom and required' misreads EP-56915 (required custom category filters in pop-up); 'faster' in outcome has no evidence."),
'next-3':({'benefit':"More v3 endpoints, starting with listing and reading products and adding, updating or removing them on an event.",
  'what':"The v3 Public API will list products across events with the events each belongs to, return product details for every event, attach a product to an event with its own categories and custom fields, update them, and remove it from one event.",
  'why':"In the new API a product exists once and is linked to several events, so integrations need to manage its event-specific data and remove it from one event without deleting the product."},
 "No story creates products (EP-52842 binds an existing product to an event; create is EP-52837, not in the row); 'duplicating' in why is not in any source; remove drops the binding, not categories (EP-52844)."),
'next-4':({'outcome':"Organisers' event pages in each language will be easier for search engines to find, and attendees' profiles will stay out of public search results."},
 "Coming-next item described as already done ('can be found'); sitemap and profile stories are not released (EP-56823 Ready for release, EP-57406 Ready to start)."),
'next-10':({'why':"An incorrect file check in the app's offline floor plan handling could reject and delete the download, so the offline floor plan never became available."},
 "EP-54991 says the check 'can fail permanently', not that it rejected every download."),
'next-12':({'title':"AI search for the exhibitor list",
  'benefit':"We are researching how to move the exhibitor list search to the new AI search, before building it."},
 "EP-55778 is a research spike only; the card presented the move as happening, and the spike covers the Exhibitors list, not a 'marketplace'."),
'dlg-item-0':({'benefit':"Spam sign-ups had forced exhibitor registration to be switched off. Exhibitor registration now includes reCAPTCHA, so it can stay open.",
  'outcome':"Organisers can keep exhibitor registration open, with reCAPTCHA protecting it from automated spam sign-ups."},
 "'You asked' unsupported: EP-16297 is tier C (Reported-by only); benefit over 160; 'spam sign-ups are stopped' overstates reCAPTCHA."),
'dlg-item-1':({'title':"Category order you control",
  'benefit':"Participant categories now keep the order you set in registration, even after you edit or add categories.",
  'outcome':"Organisers show participant categories in the sequence they choose, such as regular before student passes, and keep it when they make changes."},
 "EP-17102 orders participant categories ('the ticketing order does not matter'); card said tickets keep their order."),
'dlg-item-2':({'benefit':"With one setting, the app shows the custom badge page from Aditus, your registration partner, so attendees show the badge they registered with for scanning.",
  'outcome':"Attendees open the badge they registered with straight from the app, ready to be scanned."},
 "Benefit over 160 and said attendees scan badges; 'organisers use one badge for scanning' not in EP-25790 (value: display custom badges for scanning)."),
'dlg-item-3':({'outcome':"Organisers decide which exhibitor categories or individual exhibitors can download leads."},
 "'For example as part of a package' is not in EP-13663."),
'dlg-item-6':({'outcome':"Organisers keep the product categories exhibitors choose within those exhibitors' activity categories."},
 "'So category listings stay consistent' is not stated in EP-33961."),
'dlg-item-7':({'outcome':"Your data feed sets the sponsor pop-up for each exhibitor as it creates or updates them, with no manual edits in the admin panel."},
 "'For every exhibitor in one step' overstates EP-32201 (a per-exhibitor parameter on exhibitor/set)."),
'dlg-item-8':({'benefit':"Write each admin notification in each event language and visitors get it in their own language, including app users who are not logged in."},
 "EP-32750: non-logged-in notifications go to app users only; EP-31011 falls back to the primary language, so not 'every visitor' in their own language."),
'dlg-item-9':({'title':"App pages for logged-out visitors",
  'outcome':"Organisers show content meant only for logged-out visitors, and it disappears once they log in."},
 "Title over 6 words; 'sign-up or welcome content' is not in EP-32358."),
'dlg-item-10':({'benefit':"The sponsor page in the admin panel, which was slow to load, has been reworked to load faster.",
  'outcome':"Organisers manage sponsors with less waiting for the page to load."},
 "'You reported' unsupported: EP-36019 is tier C (Reported-by only); 'without waiting' overstates 'load faster'."),
'dlg-item-11':({'title':"German wording corrected",
  'benefit':"German wording for booking, order, invoice, recommendation and profile labels corrected, using EuroTier 2024 as the reference and applied to every event.",
  'what':"German translations were corrected and completed for booking, order, invoice, offer, recommendation and profile link labels, using EuroTier 2024 as the reference and applied to every event.",
  'outcome':"Visitors and exhibitors at German-language events see these labels in correct German."},
 "EP-40706/EP-41169 fix listed labels applied globally (every event), not German 'across the platform'; 'consistent throughout' overstates."),
'dlg-item-14':({'title':"Favourites and stand bookmarks synced"},
 "Title over 6 words; text matches EP-44186."),
'dlg-item-15':({'benefit':"When a custom badge cannot be loaded, visitors now see a clear page explaining what happened and what to do, instead of the standard badge page."},
 "Benefit over 160 and said users were sent 'silently'; EP-48297 says an error message was shown before reverting to the native badge page."),
'dlg-item-16':({'title':"Floor plan source switch tested",
  'benefit':"After an ExpoFP update reached the app before the web at Agritechnica 2025, we tested switching the web floor plan source during the live event."},
 "EP-47929 is a live test/investigation; card claimed 'we added a way to switch the floor plan source'. Title over 6 words."),
'dlg-item-17':({'title':"Bulk hall and stand management",
  'benefit':"Hall and stand lists in the floor plan admin sort naturally and let you select and remove many at once, which helps events with many halls like Agritechnica."},
 "EP-51701 cites Agritechnica only as an example (tier W), not as what it was built for; title over 6 words."),
'dlg-item-18':({'title':"Missing past event data investigated",
  'benefit':"After data went missing in the app for finished events, including Agritechnica 2025, we investigated the cause and options for keeping past events available.",
  'outcome':"The findings set out fix options and a support policy for finished events in the app, so the cause can be fixed instead of relying on one-off workarounds."},
 "EP-52820 acceptance criteria are investigation deliverables; card claimed visitors can now reopen past events and 'the fix'; outcome claimed a planned fix and clear policy as delivered."),
'dlg-item-19':({'benefit':"Visitors who opt out of networking can still favourite exhibitors, visitors and products on web and in the app, and keep them private under GDPR."},
 "Benefit over 160 characters; content matches EP-53978/EP-57577."),
'dlg-next-0':({'title':"Academic titles for participants",
  'benefit':"Academic titles will be captured at registration and shown next to participants' names, starting with a minimal first release."},
 "In-development text must not state timing: EuroTier 2026 target (EP-57562) removed; benefit now uses 'will'."),
'dlg-next-1':({'title':"Session and exhibitor event language filter",
  'benefit':"Visitors will filter sessions and exhibitor events by the language they are held in."},
 "Title over 6 words; in-development benefit must use 'will' (EP-57253 Ready to start)."),
'dlg-next-2':({'title':"Calendar all-day sessions and track order",
  'benefit':"The session calendar will show all-day sessions and keep each track in the same column through the day."},
 "'Shown in their own row' is not in EP-57098 (title only); in-development text needs 'will'; title over 6 words."),
'dlg-next-3':({'title':"Tracking-free pages in the EuroTier app",
  'benefit':"Web pages opened inside the app will no longer load tracking scripts or show the cookie banner, in line with app store rules."},
 "In-development benefit must use 'will' (EP-57824 Ready for testing); title over 6 words."),
'dlg-next-4':({'benefit':"Exhibitor and sponsor interaction statistics will carry a processing-time marker, so integrations can sync them in steps with stable pages."},
 "'Without missing late-arriving data' comes from the AI summary only, not EP-57428/EP-57430 descriptions; in-development text needs 'will'."),
'dlg-next-5':({'benefit':"Session type visibility settings will follow the cloned event correctly, as needed for DLG-Feldtage."},
 "In-development benefit must use 'will' (EP-57471 In testing)."),
'dlg-next-6':({'benefit':"Removing many connections at once will also remove private favourites."},
 "In-development benefit must use 'will' (EP-55477 Ready for testing)."),
}
OK={
'next-7':"Matches EP-57343 (tab, event/date/tag filters, per-tag figures, legacy page stays).",
'next-8':"EP-55944 Done supports report text and stated why; gating described only by EP-57634 title.",
'next-9':"Matches EP-56121 (per-field control, empty value skipped, default keeps current behaviour).",
'next-11':"Matches EP-1095; why marked implied.",
'dlg-item-4':"Text matches EP-26093 and claims no DLG request (tier W: FBF request; page placement is an owner decision).",
'dlg-item-5':"Matches EP-29933 (tier B).",
'dlg-item-12':"Matches EP-43163 (stated multilingual gap, listed outputs).",
'dlg-item-13':"Matches EP-44694 (reinstated setting).",
'dlg-item-20':"Matches EP-55642 confluence summary.",
'dlg-item-21':"Matches EP-57347/EP-57348 (tier A).",
'dlg-item-22':"'Urgent request' stated in EP-57684 (tier A); same fields and validation, no migration stated.",
}
L={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
bad=re.compile(r'—|–|seamless|powerful|revolution|game-chang|effortless|cutting-edge|favorit|organiz|EP-\d',re.I)
out=[]
for r in d:
    i=r['id']
    if i in F:
        fx,why=F[i]; out.append({'id':i,'verdict':'fix','fix':fx,'reason':why})
        for k,v in fx.items():
            if k=='title': assert 2<=len(v.split())<=6,(i,v)
            elif k in L: assert len(v)<=L[k],(i,k,len(v))
            assert not bad.search(v),(i,k)
            if r['kind'] if 'kind' in r else None: pass
    else:
        out.append({'id':i,'verdict':'ok','reason':OK[i]})
ids=[o['id'] for o in out]; assert ids==[r['id'] for r in d] and len(set(ids))==len(ids)==41
assert set(F)|set(OK)==set(ids) and not set(F)&set(OK)
json.dump(out,open(B+'g7_v/verdicts.json','w'),ensure_ascii=False,indent=1)
print(len(out),sum(o['verdict']=='fix' for o in out))
