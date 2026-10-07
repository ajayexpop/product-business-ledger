import json
E='13_exhibitor_portal:';M='14_exhibitor_marketplace:';L='15_lead_intelligence:';S='17_sponsorship:'
R=[
("exhib-parent-child-launch","new","'Parent-Child management on Frontend v.1': first version of the frontend 'My child exhibitors' page",[E+'87',M+'85'],"Parent-child exhibitor relationships and their public indication"),
("exhib-content-limits","improved","'Marketing content limit on individual level', 'description to be extended to 3000 characters', 'Add load indication': limits and options on existing content",[M+'81',M+'80',M+'87'],"Marketing content, news pages and per-exhibitor overrides"),
("exhib-marketplace-2023q1","improved","'display 24 items ... instead of 12 by default', 'Zip Code Field', 'Remove product category auto selection': marketplace options",[M+'83',M+'76',M+'79'],"Marketplace pagination, exhibitor list and brand profiles"),
("exhib-sponsor-banners-category","improved","'Featured exhibitors to be configurable at Exhibitor Category level', 'Sponsor Pop Up - Category Level Config': category-level settings on existing sponsorship",[S+'63',S+'65',S+'64'],"Is Sponsor at category level, sponsor pop-up, banner ads"),
("exhib-sponsored-sessions-profile","improved","'Sponsored Session Should be Visible on Company Profile', 'Include session interactions in the dashboard', 'Enhancement'",[S+'72',S+'73',S+'75'],"Sponsored session block, session sponsorship, exhibitor sponsorship stats"),
("exhib-setup-2023q2","improved","'Exhibitor default category', 'Forbid exhibitors to add active products', manual sections 'divided by their links': settings on existing setup",[M+'129',M+'86',E+'78'],"Active product limit, exhibitor categories, manual section management"),
("exhib-performance-2023q2","improved","'Sync to Elasticsearch only in the end of importing', 'Remove duplicated queries': performance fixes",[M+'82',M+'156'],"Marketplace search and the ElasticSearch service"),
("exhib-colocated-scans","improved","'Change Code to scan QR codes for colocated events', names on lead capture page made clickable",[L+'128',L+'117'],"Colocated scanning and scanning settings"),
("exhib-leads-meetings-events","improved","'Exhibitor events. Interactions and Leads generation', 'Leads Download to Include - All Meeting Requests': extends existing leads",[L+'114',L+'116',L+'92'],"Lead toggles, include all meeting statuses, leads dashboard"),
("exhib-rich-text","improved","'Text Editor', 'Text Editor - Exhibitor News': editor added to existing profile and news fields",[M+'77',M+'80'],"Exhibitor profile description and news pages"),
("exhib-sponsor-layout-2023q2","improved","'*Improvement* In Sponsor Banner for Mobile and Tablet View', 'Sponsors ... cards are 6 in a raw'",[S+'66',S+'64'],"Sponsored exhibitor placement and banner ads on the marketplace"),
("exhib-custom-lead-questions","improved","'Custom Questions stage2. Additional questions', 'two new features': extends existing custom lead questions",[L+'91',L+'120',L+'90'],"Lead question builder for exhibitors and organisers, field types"),
("exhib-custom-listings","improved","'Option to have Custom Listing', 'Custom listing additional features': a table view option on existing lists",[M+'76',M+'102'],"Exhibitor list custom-table view, delegate directory"),
("exhib-sponsor-section","improved","'Move Sponsors to the separate section', 'Choosing the way sponsors displayed', 'optimization for apps'",[S+'66',S+'77',S+'114'],"Sponsored exhibitor placement, display settings, click tracking"),
("exhib-overview-report","new","'Download detailed report (parent+child)': a new exhibitor overview spreadsheet",[E+'87',M+'93'],"Parent-child relationships and exhibitor profile analytics"),
("exhib-team-interaction","improved","'Exhibitor to define if team members can interact (WEB/App)', 'Extract interaction settings in xls': a control on existing team member meetings and chats",[M+'87',E+'88'],"Per-exhibitor settings and API v2 exposure"),
("exhib-manual-translation","new","'Translation tool for Exhibitor Manual': first translation tool for manual sections",[E+'85'],"Per-section language tool in the exhibitor manual"),
("exhib-sponsor-mgmt-2023q4","improved","'Search and filter for sponsor categories on the sponsors page', 'Buttons for Sponsor cards on Marketplace'",[S+'61',S+'62',S+'66'],"Sponsor records, sponsor categories, marketplace placement"),
("exhib-exports-2024q1","improved","'Leads Export: Exhibitor Event - Date / Time', 'Inclusion of Meeting Rating Notes', sponsor stats export look",[L+'95',L+'225',S+'74'],"Leads export, meeting rating notes, sponsorship statistics export"),
("exhib-leads-2024q2","improved","'Download leads improvements', 'Unrecognized Badge Scans', 'Lead capture availability settings'",[L+'95',L+'89',L+'181'],"Leads export, lead capture access, backend badge QR resolution"),
("exhib-settings-2024q2","improved","'Product Description and Product Image Mandatory', 'Rename the sponsor block name', 'Changing deadlines of Exhibitor Manual'",[M+'89',M+'111',E+'118'],"Product form required fields, sponsored block name, manual deadlines"),
("exhib-invite-stats","new","'Invite Visitors - Statistics': a new statistics tab for exhibitor invitations",[],"No claim covers exhibitor visitor invitations"),
("exhib-exhibitor-account","improved","'Exhibitor Account. Header and footer / Registration Info / Settings page ...': redesign of the existing exhibitor account",[E+'86'],"Exhibitor Account (New UI)"),
("exhib-parent-child-auto","new","'Parent/Child - Exhibitor Assignment': a new automatic assignment script (plus checks in API and import)",[E+'87',M+'85'],"Parent-child exhibitor relationships"),
("exhib-event-cloning","improved","'Option to clone products with Active Status', 'Option to clone Brands': options on existing event cloning",[L+'144'],"Event cloning leaves interaction info in the original event"),
("exhib-lead-download-controls","improved","'Download leads feature on Exhibitor Category level and Individual exhibitor level', 'Renaming setting under Contact Sharing'",[L+'219',L+'113'],"Download Leads toggle and Contact Sharing settings"),
("exhib-profile-2024q3","improved","'Extend logic of adding of Product categories', apps use social links from the exhibitor object",[M+'89',M+'77'],"Exhibitor product form and exhibitor profile"),
("exhib-lead-question-levels","improved","'Improve Lead Questions logic on global, category and exhibitor levels'",[L+'90',L+'213',L+'214'],"Lead question builder, standard/additional questions, category limits"),
("exhib-marketplace-2024q4","improved","'option to set up a default view on exhibitor marketplace page', 'amend the order of product category'",[M+'76',M+'122'],"Exhibitor list views and display filter configuration"),
("exhib-sponsor-banners-2024q4","improved","'Unclickable Banners', 'Display the sponsors with the pagination'",[S+'108',S+'64'],"Disable Link toggle and banner ads"),
("exhib-parent-child-app","improved","'Parent / Child - App', label settings, A-z sorting: existing parent-child brought to the app and extended",[M+'85',M+'135',M+'125'],"Parent-child indication, custom labels, Head Office/Child filter"),
("exhib-profile-2025q1","improved","'Sponsored sessions & Sessions We Speak At Block in Profiles', 'Add validation to the Embedded code video field', back button",[S+'72',M+'77'],"Sponsored session block and exhibitor profile page"),
("exhib-manual-2025q1","improved","'Improved Badge Limit Logic in Exhibitor Manuals', 'Save and submit ... on Submit', 'Hide the fields from the Table section'",[E+'132',E+'136',E+'125'],"Manual summary submit, edit profile section, service badge limits"),
("exhib-category-search","improved","'Category Selection Process', 'Search bar option for Categories', 'Hierarchical search results'",[M+'82',M+'125'],"Marketplace search and filters, category system filters"),
("exhib-lead-scan-2025q2","improved","'Force scanned list sync', 'Change name of the Reason for Scanning of any code'",[L+'127',L+'141',L+'129'],"Offline sync / Force Sync, Reason column, any code scan"),
("exhib-parent-child-2025q2","improved","'Control if Child companies indication is present', 'Add country / city', 'Parent/Child script Enhancements 2025'",[M+'134',M+'85'],"'Do not indicate Child companies' toggle and parent-child indication"),
("exhib-team-news-2025q2","improved","'Control if Telephone and Job Title fields ... are required', 'News header image | Change the cropper ratio'",[M+'80'],"News pages (no claim covers the add team member form)"),
("exhib-lead-capture-pro","new","'Lead Capture Journey', 'Lead Capture Pro logic for App': launch of paid Lead Capture Pro",[L+'96',L+'133',L+'134'],"Lead Capture Pro packages, add-ons and pricing page"),
("exhib-manual-discounts","new","'Discount Functionality for Exhibitor Manuals': discount codes introduced",[E+'127',E+'98'],"Manual Equipment items and payment configuration"),
("exhib-dashboard-banners-2025q3","improved","'exhibitor dashboard remove weeks and days filter', 'Update banner tap behavior for Sponsored Banners without website link'",[S+'64'],"Sponsor banner ads (no claim covers the Top Performers block)"),
("exhib-attend-stand","new","'Attend a stand', 'Attend a Stand. App listing': a new plan-to-visit capability",[],"No claim covers stand-visit intentions"),
("exhib-profile-2026q1","improved","'clone Product Category custom filters within an Event', 'add some loader in Team members section'",[M+'122',M+'124'],"Display filter configuration and custom filters"),
("exhib-lead-app-2026q1","improved","'Autosave on Lead Capture Form', 'Logic for Scan Badges Page - Lead Capture Pro', 'Custom Questions Page UI Improvements'",[L+'93',L+'137'],"Mobile lead scanning form and LC Pro scan-button activation"),
("exhib-lcp-access","improved","'Lead Capture Access Control by Exhibitor Category', 'Exhibitor-Level Granular Control', 'Lead Capture Pro — Settings Consolidation'",[L+'89',L+'94',L+'216'],"Lead capture access management, non-badge QR access control, per-TM lead capture"),
("exhib-permissions-2026q2","improved","'Extend Exhibitor Permissions to Products', 'Update on Team Member Creation Rules', 'Removal of Google+'",[M+'86',M+'187',M+'79'],"Exhibitor category entitlements, per-exhibitor restrictions, brand social links"),
("exhib-lead-2026q2","improved","'Changing badge display logic', 'Update Lead Contribution Logic ... Meeting Appointments', 'notes field. Character limitation'",[M+'136',L+'125',L+'93'],"Meeting lead attribution, lead capture page notes, lead scanning"),
("exhib-multilingual-manual","improved","'Organizer can upload Exhibitor Manual documents per Event language': per-language files in the existing Documents section",[E+'121',E+'85'],"Manual Documents section and translation tool"),
("exhib-sponsor-visibility","improved","'Random sorting for Sponsors and Sponsored products', 'Increasing Sponsor Limit to 150', 'Always display Sponsor Name on Session cards'",[S+'66',S+'67',S+'73'],"Sponsored exhibitor/product placement and session sponsorship"),
("exhib-insights-portal","new","'Story 2: Page 01 — Celebrate your wins': first page of a new exhibitor insights portal",[],"No claim describes an exhibitor insights portal"),
("exhib-lcp-profile","improved","'Create Lead Capture Pro settings config for profile level', 'Lead Capture Pro – Full Access to Custom Questions'",[L+'89',L+'133',L+'216'],"Lead capture access per team member and LC Pro add-ons"),
("exhib-profile-2026q3","improved","'Region filters', 'Enhancing Exhibitor Import to Attach Brands', 'Logo option as an exhibitor settings': additions to existing filters, import and settings",[M+'125',M+'79',M+'87'],"Marketplace system filters, brands, per-exhibitor settings"),
("exhib-search-sponsors","new","'Global Search. Sponsorship banner / Sponsored Exhibitors / Sponsored Products': new sponsored placements in global search",[S+'64',S+'66',S+'67'],"Banner ads, sponsored exhibitor and sponsored product placements"),
]
d=json.load(open('../input-m5.json'))
ids={c['id'] for c in d['claims']}
fids=[f['id'] for f in d['features']]
assert [r[0] for r in R]==fids,(set(fids)^set(r[0] for r in R))
out=[]
for i,k,kw,b,bw in R:
  assert k in('new','improved','unclear'); assert len(b)<=3
  for x in b: assert x in ids,x
  out.append({"id":i,"kind":k,"kindWhy":kw,"buildsOn":b,"buildsOnWhy":bw})
json.dump(out,open('map.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),Counter(o['kind'] for o in out),[o['id'] for o in out if not o['buildsOn']])
