import json,re
a=json.load(open('input/g5.json'))
F={
'exhib-performance-2023q2':({"title":"Marketplace and import efficiency",
  "benefit":"The marketplace page runs fewer queries, and product imports update search once at the end.",
  "detail":"Duplicate queries were removed from the marketplace page. Product search indexing now runs once at the end of an import, and exhibitors and products are re-indexed only when a searchable field changes."},
  "Title/benefit claim faster loading with no measurement (EP-17329 only removes duplicate queries); detail tied field-level re-indexing to imports, EP-16538 applies it to exhibitor and product changes generally"),
'exhib-colocated-scans':({"outcome":"Exhibitors capture visitors from co-located shows in one scan list, see which event each lead came from, and open a person's or team company's profile after scanning."},
  "'every visitor' overstates EP-5445, which only lets other-event badges be saved to the scan list"),
'exhib-rich-text':({"why":"The profile editor had no way to add photos or links and removed photos on save, so organisers were editing exhibitor descriptions in the admin panel instead."},
  "EP-13852: links could not be added at the front; only photos (non-word characters) were stripped on save"),
'exhib-sponsor-layout-2023q2':({"benefit":"Sponsor banners no longer fill the first screen on tablets and phones, and sponsor rows hold six cards.",
  "detail":"On smaller screens, marketplace sponsor banners and the product finder sit in a compact block above the filters. Sponsor and sponsored product cards are laid out six in a row.",
  "outcome":"Visitors on small screens see sponsor banners and the lists together, and sponsor rows hold six cards instead of five."},
  "EP-17760 (six per row) is not tablet/phone specific and does not mention desktop; benefit/detail read as if it were a small-screen change and outcome added 'on desktop'"),
'exhib-overview-report':({"outcome":"Exhibitors see their event activity for every company they manage in one download."},
  "'without asking the organiser for a report' is a past pain EP-17348 does not mention"),
'exhib-leads-2024q2':({"detail":"Download leads moved to a button on the profile, generating the file in the background with a timestamped link. Unrecognised badge scans are matched against the event database and filled in with the attendee's details, and organisers can set who gets lead capture."},
  "EP-26547 sets who gets lead capture (free, per exhibitor, per team member), not when it is available"),
'exhib-settings-2024q2':({"detail":"Organisers can make product images and descriptions mandatory and rename the sponsor sections on exhibitor and product lists, and product pages show custom field data. Exhibitor manual deadlines can be changed with confirmation and without exhibitors resubmitting.",
  "what":"Organisers can make product images and descriptions mandatory and rename the sponsor sections on exhibitor and product lists. Product pages show custom field data, and manual deadlines can be changed with a confirmation.",
  "outcome":"Products include an image and description when the organiser requires them, sponsor sections carry the organiser's own label, and deadlines move without exhibitors having to fill forms again."},
  "EP-25692 just displays custom fields on product pages, it is not an organiser option; 'Product listings arrive complete' overstates EP-7323 (image and description only)"),
'exhib-exhibitor-account':({"benefit":"Manage an exhibitor's details, settings, team, security, sponsorship and stands from one redesigned admin account.",
  "detail":"The admin exhibitor account has new pages for registration info, settings, team members, security, sponsorship, floor plan and analytics against the event average, plus a refreshed interaction dashboard. Profiles show registration URL, external ID and tags, and the password can be left empty to keep the current one."},
  "EP-31674 makes the password optional when editing so the old one is kept, not 'new profiles no longer need a password'; 'every part' overstates the listed pages"),
'exhib-profile-2024q3':({"benefit":"Limit product categories to an exhibitor's activities, and apps take exhibitor social links from the profile.",
  "detail":"A setting restricts product categories to an exhibitor's own activity categories. The iOS and Android apps take exhibitor social links from the exhibitor's own profile data.",
  "what":"A setting limits the product categories exhibitors can choose to their own activity categories. The iOS and Android apps take an exhibitor's social links from its own profile data.",
  "why":"Organisers need exhibitors' product categories to stay within the exhibitor's own activity categories.",
  "outcome":"Product categories stay consistent with each exhibitor's activities, and app users see the social links set on the exhibitor's profile."},
  "EP-34458/EP-34459 (no text) only change where the apps read social links from, not a new display; 'registered for' in why is not in EP-33961"),
'exhib-sponsor-banners-2024q4':({"benefit":"Make sponsor banners display-only, and load marketplace sponsors in batches.",
  "detail":"A 'Disable links' toggle for each web and app banner location makes banners unclickable, with no redirect or click statistics. Marketplace sponsors now load from the server in batches of 12, with the display unchanged."},
  "EP-35640 is back-end batching of 12 with the display unchanged; there is no user-facing paging through sponsor lists"),
'exhib-profile-2025q1':({"benefit":"Show the sessions a company speaks at or sponsors in the app, and validate embedded video code."},
  "'safely' implies a security guarantee; EP-38865/EP-39511 only add validation of embed code"),
'exhib-manual-2025q1':({"benefit":"Enforce badge limits and save the exhibitor profile with the manual's Submit button.",
  "detail":"The Add button is disabled with an explanation once the badge limit is reached, the exhibitor profile is saved and submitted with the Submit button, and unused payment fields are hidden in table sections."},
  "'reliably' implies a past failure no story states (EP-40027 has no text); EP-36646 hides two payment fields, it is not an option to hide fields"),
'exhib-team-news-2025q2':({"benefit":"Decide which team member fields are required and crop news headers to the ratio shown on the site."},
  "'better news header images' overstates EP-41849, which aligns the admin cropper ratio with the site"),
'exhib-attend-stand':({"benefit":"Attendees mark the stands they plan to visit and when, and exhibitors see who intends to come.",
  "detail":"After favouriting an exhibitor, attendees can say they plan to visit its stand and when, and exhibitors see who intends to come. Organisers switch it on per participant category, and list views are available in the app."},
  "'take part in stand activity' is wrong: EP-46483 is a one-directional intention to visit; detail was too vague to be useful"),
'exhib-profile-2026q1':({"benefit":"Reuse product category filters within an event and see when team members are still loading."},
  "'load smoothly' overstates EP-38749, which only adds a loader"),
'exhib-lead-app-2026q1':({"benefit":"Lead details are saved automatically if an exhibitor leaves the form or loses connection."},
  "'Never lose a scanned lead' is an absolute guarantee; EP-47877 autosaves on exit, app close or network loss and syncs later"),
'exhib-lead-2026q2':({"outcome":"With the setting on, attendee emails show only to exhibitors who scan their badge, and exhibitors see which company each lead is from and which colleague earned it."},
  "EP-51659 is an optional toggle that works with profile email hidden; the outcome stated it as always true"),
'exhib-insights-portal':({"outcome":"Exhibitors review their main event results on one page and see how they compare with other exhibitors."},
  "'without assembling figures from separate reports' is a past pain EP-56919 does not mention (basis is implied)"),
}
out=[]
for r in a:
    if r['id'] in F:
        f,reason=F[r['id']]; out.append({"id":r['id'],"verdict":"fix","fix":f,"reason":reason})
    else:
        out.append({"id":r['id'],"verdict":"ok","fix":{},"reason":"All claims supported by the stories; rules and limits met"})
assert set(F)<=set(x['id'] for x in out)
json.dump(out,open('g5_v/verdicts.json','w'),indent=1,ensure_ascii=False)
# checks
lim={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
ids=[x['id'] for x in out]; assert ids==[r['id'] for r in a] and len(set(ids))==len(ids)
pat=re.compile(r'—|–|seamless|powerful|revolution|game-chang|effortless|cutting-edge|EP-\d',re.I)
for x in out:
    for k,v in x['fix'].items():
        if k in lim: assert len(v)<=lim[k],(x['id'],k,len(v))
        if k=='title': assert 2<=len(v.split())<=6
        assert not pat.search(v),(x['id'],k)
print(len(out),'rows,',sum(x['verdict']=='fix' for x in out),'fixed; checks pass')
