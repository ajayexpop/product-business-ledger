import json,re
a=json.load(open('../input/g6.json'))
F={
"onsite-external-code-scanning":({"outcome":"Organisers check in and record badges from other vendors and co-located events, and the check-in report shows each scanned code and, where recognised, its event."},"outcome 'record every badge presented' overstates; settings cover other vendors' and co-located badges (EP-5714, EP-5643)"),
"onsite-kiosk-improvements":({"benefit":"Help visitors find themselves faster and register for the right event at self-service kiosks."},"benefit said 'register faster'; speed is stated only for search (EP-14045 value), conditional logic is about showing the right event's fields (EP-14036)"),
"onsite-floor-plan-improvements-2023":({"benefit":"Navigate the floor plan more easily, with clearer filters, a list of visited stands and direct links to sessions.","detail":"The floor plan view was improved; unneeded hall arrows are hidden for single-hall events; the Visited quick filter lists visited stands; quick filters show a no-results message; and sessions or events on a stand open their public profile.","what":"The floor plan view was improved. Hall arrows are hidden for single-hall events, the Visited quick filter lists visited stands, quick filters show a no-results message, and sessions on a stand open their profile."},"'rebuilt' and 'smoother view' unsupported: EP-18025 is only titled 'FloorPlan improvement' with no description"),
"integ-crm-session-import":({"benefit":"Import sessions and speakers from an organiser's own CRM, along with their tracks, types and tags.","detail":"An integration with an organiser's own CRM, switched on in event setup, pulls sessions and speakers into the agenda with their tracks, types and tags.","what":"An integration with an organiser's own CRM, switched on in event setup, pulls sessions and speakers into the agenda with their tracks, types and tags."},"generic 'a CRM' overstates scope: EP-27396 is an integration with one organiser's CRM API (value 'only for' that client), not any CRM"),
"integ-event-system-import-enhancements":({"benefit":"Control which sessions, speakers and exhibitor details are imported from the external event system."},"'exactly' overstates: filters are by stream and seminar name plus field locks (EP-25344, EP-28688, EP-33726)"),
"integ-public-api-2024q4":({"outcome":"Integrations set sponsor pop-ups and activate or deactivate products in bulk, and a product status change has the same effects as making it by hand."},"'same effects as the admin panel' wrong and too broad: EP-26427 says status behaves as when changed manually on the frontend; nothing says this for the sponsor pop-up"),
"integ-event-system-push-back":({"outcome":"Exhibitor content entered once on the platform reaches the organiser's event system automatically, and brochures are sent only from a chosen starting point, avoiding duplicates."},"'only new brochures are sent' overstates: EP-43006 sends PDFs from an ID the API manager sets onwards"),
"integ-api-v2-lists":({"benefit":"Fetch all participants and exhibitors through paginated API v2 endpoints, or only what changed since a given time."},"benefit said the endpoints 'return only what changed'; they return all records, with optional timestamp filters (EP-35897, EP-36021)"),
"integ-public-api-v3":({"outcome":"Developers look up event IDs, sorted category lists and registration questions with their options through the API."},"'instead of asking for them' is invented backstory; no story mentions developers having to ask (EP-46710, EP-46512, EP-46511, EP-45064)"),
"integ-genesis-world":({"why":"Organisers who use the Genesis World CRM need it connected to their event platform.","outcome":"Organisers who use Genesis World get a native connection between it and their event platform."},"'keep their contacts' and 'more to follow in later phases' are unsupported; EP-45950 says only phase 1 of the integration, scope not described"),
"onsite-offline-expofp":({"outcome":"Attendees navigate booths and view exhibitor details on the floor plan in halls with weak or no connection."},"'including when they open it for the first time offline' unsupported: EP-45052 downloads and caches floor plan archives, which still need a download"),
"onsite-checkin-qr-2026":({"outcome":"Organisers issue smaller QR codes for partner integrations, and the check-in list filters stay responsive."},"'partner scanners read easily' unsupported; EP-44749 says smaller, lighter code to streamline external integrations"),
"onsite-aditus-badge-errors":({"outcome":"Attendees see what to do when their badge will not load, in English or German, instead of being switched to the standard badge."},"'in their language' overstates (English and German only) and 'wrong badge' mislabels the native fallback (EP-48297)"),
"integ-public-api-v3-expansion":({"detail":"New v3 endpoints check whether an account exists, return visitor and exhibitor registration custom questions, export meetings with filters and incremental sync, and provide check-in data. The API also no longer creates an account with an email already used by an admin."},"detail had the wrong direction: EP-44419 is a fix that stops the API creating accounts with an admin's email, not a feature letting emails be used"),
"onsite-floor-plan-management-2026":({"detail":"Halls and stands can be sorted in natural order and deleted in bulk with multi-select, and stands in a hidden hall no longer open from an exhibitor’s card.","outcome":"Organisers set up and tidy large floor plans in fewer steps, and stands in halls they hide no longer open from exhibitor cards."},"detail had the wrong direction: EP-20247 fixes hidden halls opening from exhibitor cards; outcome 'hidden from visitors' broader than the exhibitor-card fix"),
"integ-public-api-v3-content":({"detail":"New v3 endpoints return sponsors and sponsor categories, products filtered by exhibitor, and event-scoped floor plan halls and stands. Session tracks, types, tags and languages, countries and regions follow with localisation, sorting, paging and modified-since filters."},"'products and exhibitors' implies an exhibitor endpoint; EP-51438 is a products endpoint with an exhibitor filter"),
}
out=[]
for r in a:
  if r['id'] in F:
    f,why=F[r['id']]; out.append({"id":r['id'],"verdict":"fix","fix":f,"reason":why})
  else: out.append({"id":r['id'],"verdict":"ok","fix":{},"reason":"claims supported by the stories; rules and limits met"})
json.dump(out,open('verdicts.json','w'),indent=1,ensure_ascii=False)
# checks
ids=[r['id'] for r in a]; v=json.load(open('verdicts.json'))
assert [x['id'] for x in v]==ids and len(set(ids))==len(ids)
assert set(F)<=set(ids)
L=dict(what=240,why=220,outcome=220,benefit=160,detail=400)
bad=r'—|–|seamless|powerful|revolution|game-chang|effortless|cutting-edge|EP-\d|organiz|optimiz'
for x in v:
  for k,t in x['fix'].items():
    assert len(t)<=L[k],(x['id'],k,len(t))
    assert not re.search(bad,t),(x['id'],k)
print(len(v),'rows;',sum(x['verdict']=='fix' for x in v),'fixes; all checks pass')
