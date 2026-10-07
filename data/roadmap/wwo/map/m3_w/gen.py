import json
N='08_networking_and_interactions:';M='09_meetings_and_matchmaking:';H='18_hosted_buyer_management:'
R=[
("meet-auto-cancellation","improved","Stories add cancellation triggers to existing status and category changes ('Inactive status cancels all scheduled Sessions and Meetings')",[M+'208',M+'209'],"Code cancels meetings on deactivation and on a move to a non-meeting category"),
("meet-confirmation-location-rules","improved","'Auto confirmation of meetings | Participant Category Level' plus location option changes extend existing settings",[M+'138',M+'203',M+'136'],"Auto-confirm settings and meeting location options"),
("meet-cards-improvements","improved","'Meeting cards title', 'MM cards improvement', grouping of existing contact sharing settings",[N+'101',M+'127'],"Meeting cards in My Schedule and self-managed meetings"),
("meet-request-improvements-2023q2","improved","Adds a file option, filter retention and a 20-min step to the existing request flow",[M+'168',M+'137',M+'127'],"File attachment on requests and meeting duration settings"),
("meet-rescheduling-controls","improved","'Apply minor improvements to the meeting rescheduling process', 'Hide Reschedule button option'",[M+'171',M+'127'],"Disallow-reschedule setting and self-managed reschedule"),
("meet-speaker-schedule-blocking","improved","'Block schedule for Speakers and Moderators', 'Blocking schedule booking improvement' extend slot blocking",[M+'132',M+'127'],"Exhibitor events and meeting booking availability"),
("meet-blocked-time","improved","'blocked time unification', 'Visual Representation | Blocked Times' rework existing blocked time",[N+'169',N+'101'],"Blocked time as a schedule item in My Schedule"),
("meet-calendar-sync-improvements","improved","'Change structure of the Title of Outlook calendar card', 'Google Calendar sync improvements'",[N+'148',M+'221'],"External calendar sync via .ics"),
("meet-hosted-buyer-teams","improved","'Change in Team Member Approval Process for Hosted Buyer Using Clients' plus a default category setting",[H+'55',H+'59'],"Hosted buyer categories and buyer acceptance management"),
("meet-badge-scan-completion","improved","'All Meetings Tracking', 'Autocomplete improvement for Exhibitors without team members'",[M+'139',M+'140'],"Auto-complete via badge scan and meeting exports"),
("meet-meeting-ratings","improved","'Request For New Email Template/Custom Meeting Template', 'Rename Appointment Rate Meeting' on existing ratings",[M+'134',M+'189',M+'190'],"Meeting ratings, rating modes and WhatsApp/SMS channels"),
("meet-new-meeting-request-flow","improved","'Meeting creation/edit steps improvement' reworks the existing request flow",[M+'166',M+'127'],"New vs old request flow toggled per event"),
("meet-schedule-calendar-view","improved","'Schedule overview (New Calendar Schedule view)' redesigns the existing schedule pages",[N+'101',N+'145'],"My Schedule personal calendar and its grid"),
("meet-reassign-team-members","new","'Reasigning team members (Web)' introduces a Reassign members button",[M+'127'],"Self-managed meetings include reassign"),
("meet-schedule-downloads","improved","'Download My Schedule in xls format' adds XLS alongside the existing PDF",[N+'147'],"XLS schedule download"),
("meet-favourites-dashboard","new","'User Favorites Dashboard' launches a new admin dashboard",[N+'175',N+'98'],"Favourites dashboard with notes and admin attribution; favourites"),
("meet-schedule-limits-2023q4","improved","'Improve logic of date selector', 'Export My Agenda pdf file changes', 'Remove 0 as unlimited'",[N+'101',M+'225'],"My Schedule and meeting limits"),
("meet-prefilled-requests","improved","'Prefilled meeting info (WEB)' adds saved defaults to the new request flow",[M+'166'],"New meeting request flow"),
("formats-meeting-availability-filter","improved","'Ability for buyers to ... filter exhibitors who have used up their allotment' adds a filter to existing lists",[M+'225',N+'104'],"Meeting limits in organiser networking controls"),
("formats-minimum-meeting-reminders","new","'Ability to setup auto email reminders when a meeting minimal requirement has not been reached'",[M+'192',M+'191',H+'123'],"Required-confirmed-meeting threshold and reminders"),
("meet-limits-auto-confirm","improved","'Meeting auto confirm should work with Category settings', 'Error Mechanism: Meetings, Messages Limits'",[M+'138',M+'203',M+'225'],"Auto-confirm and meeting limits"),
("meet-schedule-while-booking","improved","'My/Team schedule drawer in meeting request page', 'Viewing Daily Schedule on Meeting Creation Page'",[M+'166',M+'195'],"New request flow and pause-after-meeting buffer"),
("formats-speed-networking","new","Stories are 'Speed Networking ... (MVP)' across setup, matching, notifications and display",[M+'129',N+'102',M+'177'],"Speed Networking module and AI pairing"),
("meet-recommended-sorting","new","'Matchmaking Sorting on all marketplace and delegates pages' introduces recommended sorting",[N+'176'],"Matchmaking sorting on marketplace pages (EP-27225)"),
("formats-opt-in-speed-networking","new","A full 'Opt-In Speed Networking' story set: organiser setup, pre-registration, matching, schedules",[M+'176',M+'129',N+'102'],"SN opt-in with relevance marks"),
("formats-round-tables","new","First 'Round tables' story set: admin session creation, topics, tables, frontend listing",[M+'131',M+'186'],"Round Tables and their report"),
("formats-speed-networking-checkin","improved","Adds 'Participant Check-in' and voting-button and timing tweaks to existing speed networking",[M+'175',M+'129'],"SN walk-in badge scan pool"),
("meet-blocked-time-team-schedule","improved","'Blocked Time - Show Only Event Dates', 'Search Functionality for Team Schedule Management'",[N+'169',N+'101'],"Blocked time schedule items and schedules"),
("meet-exhibitor-recommendations","improved","'Add Exhibitor recommendations pop-up to all pages' extends an existing pop-up",[N+'96',N+'137'],"Related exhibitor recommendations pop-up"),
("meet-automatic-calendar-sync","new","'Automated Calendar Sync for Meetings & Sessions' adds background sync",[N+'148'],"External calendar sync via .ics"),
("meet-real-time-matchmaking","improved","'Re-wiring Matchmaking Page' re-platforms the existing page",[N+'89',N+'90',N+'91'],"Matchmaking pipeline status, OFF lambda and toggle lock"),
("meet-wizard-profile-2025q1","improved","'Fake email label in meeting wizard', 'Improve logic of limits display on the frontend'",[M+'225'],"Meeting limits display"),
("meet-meet-button-availability","improved","'Hide Meet Button for Exhibitors Without Available Team Members' changes existing button behaviour",[M+'218',M+'158'],"Meeting permission flow and connection settings"),
("meet-ratings-in-app","improved","'Meeting Rating Button - Meetings Page' adds an app entry point to existing ratings",[M+'134',M+'189'],"Meeting ratings"),
("formats-opt-in-general-use","improved","'MVP Opt-in Speed Networking project adjustments'",[M+'176',M+'177'],"SN opt-in relevance marks and AI pairing"),
("meet-ai-meeting-notes","new","'AI Meeting Note Taker - Stage 1' is a first release",[],"Only claim on this (MTT EP-47872) says it was not delivered, so none"),
("meet-admin-wizard-2025q3","improved","'Improvements in Meeting Wizard & Exhibitor Profile (Admin Panel)'",[],"No claim covers the admin meeting wizard itself"),
("formats-meeting-programmes","new","First 'MP || FE' story set: matches list, relevance actions, timeline, confirmation list",[M+'130',M+'179',M+'178'],"Meeting Program, SR/R relevance and timeline phases"),
("formats-round-table-confirmation","improved","'Confirmation Process', 'Reasignment to another Topic', 'Additional Round tables improvements'",[M+'131',M+'186'],"Round Tables"),
("meet-remaining-meetings","improved","'Auto Confirm Meetings and Meeting limits Cap function'",[M+'138',M+'225'],"Auto-confirm and meeting limits"),
("formats-meeting-programme-admin","new","First 'MP || ... (Admin panel)' story set: programme page, roles, pre-registered list, schedule, tables",[M+'130',M+'184',M+'223'],"Meeting Program, manual final schedule, MP reports"),
("formats-meeting-programmes-app","improved","'MP || App part' brings the existing programme to the app",[M+'130'],"Meeting Program"),
("formats-round-table-numbering","improved","'Round tables. Table numbers across all topics'",[M+'131'],"Round Tables"),
("meet-matchmaking-booking-2026q1","improved","'Matchmaking Improvements. Precise Matchmaking', 'Timepicker. Scroll Hint'",[N+'87',N+'88'],"Category-based matchmaking scoring"),
("formats-meeting-programme-attendance","improved","'MP || FE Meeting Completion via QR & Badge Scan', 'No Show', 'Change meeting rating trigger'",[M+'139',M+'130'],"Auto-complete via badge scan; Meeting Program"),
("formats-meeting-programme-improvements","improved","'Split Voting Phase', 'Combine Meeting Blocks', 'Early access for Exhibitors', 'Sorting options'",[M+'130',M+'178',M+'183'],"Meeting Program, timeline phases, sponsored limits"),
("formats-round-table-seating","improved","'Allow to add users to the table after the final schedule', 'Add setting to define the tables limit'",[M+'131'],"Round Tables"),
("formats-speed-networking-push","improved","'Set up push notifications for Speed Networking 2 in iOS and Android'",[N+'103',M+'176'],"Networking push notifications; opt-in SN"),
("meet-personalised-meeting-notes","new","'Personalized Meeting Notes (Core)' launches private notes; AI notes items are tweaks",[],"No claim covers private meeting notes or AI notes as shipped"),
("meet-meeting-setup-2026q2","improved","'Select All Child Categories When Parent is Selected', 'Table meeting setup and meeting cards improvements in app'",[M+'128'],"Concierge zones and tables"),
("formats-meeting-formats-admin","improved","'Restructure Module Management for Meeting Format', 'Centralised Management'",[M+'141',M+'132'],"May-2026 Meeting Formats regrouping; exhibitor events"),
("formats-smarter-meeting-generation","improved","'Make more uniform distribution', 'Expand non-mutual likes into mutual likes', 'Generate additional pairs'",[M+'177',M+'130',M+'180'],"SN AI pairing, Meeting Program, mutual-pair eligibility"),
("meet-ai-notes-add-on","improved","'Move AI Meeting Notetaker configuration to Lead Capture Pro as an add-on'",[],"No confirmed claim for AI notes (MTT claim says not delivered)"),
("meet-meeting-management-2026q3","improved","'Bulk respond: remove full-team prefetch...', 'Backend endpoint with Restrict meetings setting'",[M+'127'],"Self-managed meetings"),
("formats-round-table-waitlist","improved","'Improve waitlist replacement to auto-detect available candidates'",[M+'131'],"Round Tables"),
]
d=json.load(open('input-m3.json'))
out=[dict(id=a,kind=b,kindWhy=c,buildsOn=e,buildsOnWhy=f) for a,b,c,e,f in R]
json.dump(out,open('m3_w/map.json','w'),indent=1,ensure_ascii=False)
ids=[f['id'] for f in d['features']];cl={c['id']:c['verdict'] for c in d['claims']}
assert [o['id'] for o in out]==ids, 'order/ids'
assert all(o['kind'] in('new','improved','unclear') for o in out)
bad=[(o['id'],b) for o in out for b in o['buildsOn'] if b not in cl]; assert not bad,bad
assert all(len(o['buildsOn'])<=3 for o in out)
from collections import Counter;print(Counter(o['kind'] for o in out));print('empty',[o['id'] for o in out if not o['buildsOn']])
print('non-good verdicts',[(o['id'],b,cl[b]) for o in out for b in o['buildsOn'] if cl[b] not in('CONFIRMED','PARTIAL','CODE-ONLY')])
