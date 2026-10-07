import json
d=json.load(open('input-m7.json'))
P='20_integrations:'
R=[
("integ-event-system-import","new","'Integration with ASP events system to pull in Exhibitors, Sessions and Speakers' builds a new integration",[],"No baseline claim covers this external event-system connector"),
("integ-visit-badge-scanner","new","'Visit G2 external badge / external scanner / pull external leads' introduce the Visit integration",[],"No Visit claims in the baseline"),
("integ-api-meeting-data","improved","Adds meeting endpoints and filters to the existing public API ('API endpoints in the public API', 'Add additional filter param', 'Exhibitor Id need to add')",[P+"84",P+"290"],"Meetings export API with pagination and last_modified filter"),
("integ-expofp-floor-plan","new","'ExpoFP Floorplan | Integration' launches the integration, plus sessions and an account token field",[P+"267",P+"214",P+"215"],"ExpoFP floor plan integration, its token field and Map with Hall toggle"),
("integ-reach5-buyer-registration","improved","'add reach 5 settings functionality to the EP internal buyer registration pop up' extends existing registration",[],"No Reach5 claims in the baseline"),
("integ-klipso-integration","new","'Build an integration between EP and Klipso'",[],"No Klipso claims in the baseline"),
("integ-public-api-2023q4","improved","Adds parameters and options to existing v2 endpoints (buyers export, images[] URLs on product/set, speakers on sessions/get)",[P+"150",P+"167",P+"308"],"account/buyers, product/set and product image URL handling"),
("integ-aditus-app-badges","new","'Custom Badge Page Integration with Aditus' introduces the Aditus badge integration",[],"No Aditus claims in the baseline"),
("integ-crm-session-import","new","'Sessions integration with DWTC CRM' builds a new connector",[],"No claim for this organiser CRM connector"),
("integ-event-system-import-enhancements","improved","'ASP Integration - Enhancements' / 'Send Email Functionality' extend the existing ASP import",[],"No baseline claim covers the ASP connector"),
("integ-expofp-data-sync","improved","'ExpoFP - Data Integration' / batching every 10 minutes extends the existing ExpoFP integration",[P+"267",P+"214"],"ExpoFP floor plan integration and its token setting"),
("integ-public-api-2024q2","improved","Adds parameters and filters to existing endpoints (account/set opt-in, time filter on statistics, meeting tags in export)",[P+"140",P+"83",P+"84"],"account/set, Statistics API v2, meetings export API"),
("integ-crowd-connected","improved","'Pass User ID through to Crowd Connected', push messaging and settings at app creation extend an existing Crowd Connected link",[P+"216",P+"268"],"Crowdconnected SDK in the EP apps"),
("integ-reach5-registration","improved","'Autologged in mode + Reach 5 in EP Registration' adds Reach5 to existing visitor registration",[],"No Reach5 claims in the baseline"),
("integ-public-api-2024q4","improved","Adds parameters to exhibitor/set and product/set ('Addition of parameter \"status\"')",[P+"167"],"product/set endpoint"),
("integ-a2z-enhancements","improved","'A2Z Enhancements' to the existing A2Z integration",[],"No A2Z claims in the baseline"),
("integ-reach5-sso","unclear","Single story 'Reach5 SSO'; Reach5 existed for registration but it cannot be told whether SSO login is a first version",[],"Baseline SSO claims are SAML 2.0, not Reach5"),
("integ-visit-sso-meetings","improved","'GES - Single Sign-on', 'allow_meetings' and 'SSO Button - Relocate' add options to the existing Visit/GES integration",[],"No Visit/GES claims in the baseline"),
("integ-aditus-participants","new","'InfoSalons/Aditus Participant API' launches participant sync (settings 'Reinstate' is minor)",[],"No Aditus claims in the baseline"),
("integ-klipso-enhancements","improved","'Klipso Integration - Team member admin / Multiple Hall/Stands / Product Categories Enhancement'",[],"No Klipso claims in the baseline"),
("integ-public-api-2025q2","improved","'/api/v2/meetings/export - New parameters', 'Badge QR - Exposing it to the api/v2/account/get'",[P+"84",P+"141"],"Meetings export API and account/get"),
("integ-event-system-push-back","new","'ASP - Data Push Back' adds an outbound direction the ASP import did not have",[],"No baseline claim covers the ASP connector"),
("integ-api-v2-lists","improved","'API V1 Visitors list Migration to API V2' / 'Synchronize data Migration' re-platform existing v1 endpoints",[P+"76"],"Delta-sync pattern after the first full pull (timestamp filters)"),
("integ-public-api-v3","new","First v3 endpoints ('GET - Event List', categories, 'Accounts - New Endpoint on API V3')",[P+"72"],"REST API v2 and v3 over HTTPS"),
("integ-visit-api-v2","improved","'HYVE - N200 API V2. New version on N200 using V2' re-platforms the existing Visit integration",[],"No Visit claims in the baseline"),
("integ-genesis-world","new","'Phase 1 - HINTE - Genesis World Integration'",[],"No Genesis World claims in the baseline"),
("integ-map-your-show","new","'Integration Hub - Map Your Show' builds a new connector, then 'MYS Stage 2'",[],"No Map Your Show claims; hub claims describe the host, not this connector"),
("integ-hub-mapping","improved","'Add team member role matching to the mapping schema', 'Addition of new field' to the existing hub",[P+"81"],"Integration HUB catalogue of native connectors"),
("integ-public-api-v3-expansion","improved","Adds more endpoints to v3 ('Check if the Account exists', 'API V3 - Meetings Export Migration')",[P+"148",P+"84",P+"72"],"account/exists, meetings export API, v3 API"),
("integ-public-api-v3-content","improved","'API V3 Migration - /api/v2/floorplan/getStands to V3' etc. move existing v2 endpoints to v3",[P+"72",P+"73"],"v2/v3 API and its core resources"),
("integ-cds-participants","new","'CDS - Participant Integration' builds a new connector",[],"No CDS claims in the baseline"),
("integ-d2i","new","'D2i - Native Integration Build'",[],"No D2i claims in the baseline"),
("integ-hub-migrations","improved","'Integration HUB Migration - Aventri V2 / Aditus / A2Z' re-platforms existing integrations",[P+"81",P+"217"],"Integration HUB and Aventri/Cvent participant sync"),
("integ-integrations-page","new","'A new Integrations page' ('Integrations page - Back-end work'), with SAML settings moved onto it",[P+"81",P+"104",P+"80"],"Integration HUB catalogue, organiser HUB view, SAML config"),
("integ-public-api-v2-2026q3","improved","'New endpoint for sponsor analytics' and 'Add filter_1 to filter_5 support on sessions/set' extend API v2",[P+"83"],"Statistics API v2 interaction coverage"),
("integ-hub-sync","improved","'ExpoFP - Migration to HUB', 'Updates on Sync Mechanism', 'Change on Matching Mechanism'",[P+"81",P+"267"],"Integration HUB and ExpoFP integration"),
("integ-api-v3-products","improved","Adds product create/update/delete and media endpoints to v3; products already set via v2 product/set",[P+"167",P+"308"],"product/set and product image URL handling"),
("integ-swoogo","new","'Native Integration - Swoogo' builds a new connector",[],"No Swoogo claims in the baseline"),
]
out=[dict(id=a,kind=b,kindWhy=c,buildsOn=e,buildsOnWhy=f) for a,b,c,e,f in R]
json.dump(out,open('m7_w/map.json','w'),indent=1,ensure_ascii=False)
ids=[f['id'] for f in d['features']]; cids={c['id'] for c in d['claims']}
assert [o['id'] for o in out]==ids
assert all(o['kind'] in('new','improved','unclear') for o in out)
assert all(b in cids for o in out for b in o['buildsOn'])
assert all(len(o['buildsOn'])<=3 for o in out)
from collections import Counter;print(Counter(o['kind'] for o in out));print('empty',sum(not o['buildsOn'] for o in out))
