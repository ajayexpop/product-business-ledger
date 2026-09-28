import json,re
s=json.load(open('input/g3.json'));w=json.load(open('g3_w/wwo.json'))
F={
"meet-auto-cancellation":({
 "benefit":"Automatically cancel a participant's meetings and bookings when they become inactive, and meetings they started if they move to a category without meetings.",
 "what":"Organisers can switch on automatic cancellation of a participant's confirmed, incoming and pending meetings, session bookings and exhibitor events if they become inactive, and of meetings they began if moved to a category without meetings."},
 "Category move cancels only meetings the user initiated, not all meetings and bookings (EP-12587); benefit and what implied all"),
"meet-confirmation-location-rules":({
 "detail":"Meeting auto-confirmation can be switched on per participant category. After the last in-person slot, requests offer only online meetings, and when 'other location' is allowed without preset options, requesters type the location themselves."},
 "Detail claimed availability checks were 'made faster'; EP-10875 is an internal refactor (init once) with no speed evidence"),
"meet-rescheduling-controls":({
 "benefit":"Reschedule meetings from the existing slot, and hide rescheduling for chosen roles and categories on web and app."},
 "'Faster' has no evidence; EP-16261 only preselects the current date and time"),
"meet-speaker-schedule-blocking":({
 "outcome":"Speakers are not double-booked against their own sessions, and attendees are stopped, with a warning, from booking a blocking exhibitor event into a slot that is already taken."},
 "EP-17284: booking into an occupied slot is refused with a warning, not just warned beforehand"),
"meet-badge-scan-completion":({
 "what":"Scanning the other participant's badge marks a confirmed regular meeting as completed, optionally also outside the meeting time. Completion shows in exports and the API, including meetings an exhibitor joined before adding team members.",
 "outcome":"Organisers get a record of completed meetings from badge scans and can use it in exports and connected systems."},
 "'A scan by any team member counts' overgeneralised EP-20254 (only meetings the exhibitor joined before having team members); 'without marking by hand' not in any story"),
"meet-new-meeting-request-flow":({
 "detail":"An optional new meeting request flow brings participants, date, time, location and duration onto one page. Users see all bookable dates for both sides, each choice updates the remaining options, and unavailable options are disabled.",
 "what":"An optional meeting request flow puts participants, date, time, location and duration on one page. Users see every bookable date for both sides, each choice updates the remaining options, and unavailable options are disabled.",
 "outcome":"Users pick a slot that works for both sides from one page and cannot choose options that are unavailable."},
 "EP-21476 has only a title ('Add error to the meeting wizard'); 'error messages explain what to fix' is unsupported. EP-17352 supports disabled unavailable options"),
"meet-schedule-downloads":({
 "why":"Participants and exhibitor teams need a copy of their schedule outside the platform, including when they are using the app."},
 "Implied why invented reasons (sort, share, keep offline) that no story mentions (EP-17285, EP-20214)"),
"formats-minimum-meeting-reminders":({
 "outcome":"Organisers follow up on meeting requirements without chasing each person, and participants can see how many meetings they still need."},
 "'Always know' overstated; EP-23256 shows confirmed vs required on the meetings page"),
"formats-opt-in-speed-networking":({
 "benefit":"Add eligible participants to speed networking by set conditions, let them mark who is relevant ahead of time and get a generated schedule."},
 "EP-30284: users meeting the conditions are added automatically and notified; no invitation to opt in is described"),
"formats-round-tables":({"who":["Organisers","Attendees"]},
 "EP-28986: round tables have no speakers; roles are leaders and moderators, so 'Speakers' is wrong"),
"meet-exhibitor-recommendations":({
 "outcome":"Attendees see other relevant exhibitors wherever they start a meeting with an exhibitor."},
 "'Helps them find more people to meet' is a result claim EP-34005 does not show"),
"meet-ratings-in-app":({
 "outcome":"Attendees rate a completed meeting from their phone, including whether it took place, and can change their rating later."},
 "EP-40631 says nothing about organisers receiving or using the feedback"),
"formats-opt-in-general-use":({
 "why":"Opt-in speed networking had to be adapted so that it suits many different events and organisers."},
 "'Shaped around one event's needs' is backstory; EP-39133 states only the goal of making it suitable for multiple clients"),
"meet-ai-meeting-notes":({
 "why":"Busy people in meetings want to focus on the conversation and still have accurate, searchable notes emailed to them without extra work."},
 "'Back-to-back meetings' embellishes EP-42801, which says 'busy professional attending meetings'"),
"formats-round-table-confirmation":({"who":["Organisers","Attendees"]},
 "No story concerns speakers (EP-39818/39819/41016 are organisers and participants)"),
"meet-matchmaking-booking-2026q1":({
 "benefit":"Control which categories shape matchmaking and spot every available time slot when booking.",
 "detail":"Organisers can set each parent category to be included in, excluded from or strictly applied in matchmaking, and the meeting time picker now shows a scroll hint so users see that more slots are available below."},
 "'More precise results' is an unshown result; EP-44267 only adds an include/exclude/strict setting per parent category"),
"formats-meeting-programme-improvements":({
 "detail":"Voting phases were split and tabs restructured, meeting blocks combine into one schedule list, and exhibitors can get early access. Users can sort matches in the relevance and opt-in phases, and organisers gained manual meeting deletion, timeslot blocking limits, optional conditions for team members and a switch to disable notifications; deleted users are removed.",
 "what":"Meeting programmes have split voting phases, restructured tabs and one schedule list, and exhibitors can get early access to set team roles. Users can sort matches; organisers can delete meetings, limit timeslots and turn off notifications."},
 "EP-48752 (confluence, from description): sorting is for users reviewing matches, not organisers; EP-40448: users block timeslots within organiser limits"),
"formats-round-table-seating":({
 "detail":"Organisers can add users to a table after the final schedule is sent and define a tables limit, and deleted users are removed from sessions."},
 "'Run on a new dedicated service' is internal architecture (EP-46238, no text), not customer copy"),
"meet-personalised-meeting-notes":({
 "outcome":"Users prepare for and follow up on meetings from notes only they can see, and every participant receives the same AI action points in the language of the meeting."},
 "EP-49217 produces output in the meeting language, not each person's language ('the language they spoke')"),
"formats-meeting-formats-admin":({
 "what":"A Meeting Formats area in the admin panel holds speed networking, meeting programmes and concierge meetings, each with its own email templates. Round tables and exhibitor events have their own sections there, and each format has a switch."},
 "EP-50109/EP-50110: round tables and exhibitor events get their own sections inside Meeting Formats; the copy read as if they were outside it"),
"formats-smarter-meeting-generation":({
 "why":"Some participants received too few meetings, one-sided likes were not used, invalid data could let meetings land in blocked slots, and sponsored limit checks could block meetings organisers created.",
 "outcome":"Participants are less likely to be left with only a few meetings, blocked times are respected, and organisers can still add the meetings they arrange by hand."},
 "Why blamed invalid input for blocking organiser meetings (EP-50818 is a sponsored-limit validation issue, separate from EP-50642); 'more participants get a usable schedule with fewer empty slots' is an unshown result"),
"meet-meeting-management-2026q3":({
 "benefit":"Open Bulk Respond without waiting for large teams to load, and restrict meetings with exhibitors without teams in the app.",
 "outcome":"Exhibitors with large teams use Bulk Respond without waiting, and organisers' meeting restrictions apply in the app as well as on the web."},
 "EP-56351 concerns pending meeting-relevance assignments; 'respond to meetings' may misstate what Bulk Respond acts on, so kept to the feature name"),
"formats-round-table-waitlist":({
 "benefit":"More reliable waitlist replacement when round table seats are freed.",
 "detail":"Eligible waitlist candidates for a freed round table seat are now worked out within matching itself: applicants who have not already been invited to a seat in any generation or earlier replacement. This removes an error-prone step.",
 "what":"When a round table seat is freed, eligible waitlist candidates are now worked out within matching itself: applicants not already invited to a seat in any generation or earlier replacement.",
 "why":"Working out which waitlisted applicants had not yet been offered a seat was hard to do reliably in a separate step.",
 "outcome":"Freed seats go to waitlisted applicants who have not already had an offer, with less risk of error.",
 "basis":"stated"},
 "EP-56891 is a reliability change (eligibility moved from an error-prone backend step into the matching service), not a new automatic waitlist feature; why is stated in its problem text"),
}
out=[]
for r,o in zip(s,w):
  i=r['id']
  if i in F: out.append({"id":i,"verdict":"fix","fix":F[i][0],"reason":F[i][1]})
  else: out.append({"id":i,"verdict":"ok","fix":{},"reason":"Claims match the stories"})
json.dump(out,open('g3_v/verdicts.json','w'),indent=1,ensure_ascii=False)
# checks
ids=[x['id'] for x in out]; assert ids==[r['id'] for r in s] and len(set(ids))==len(ids)==55
assert set(F)<=set(ids)
lim={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
bad=re.compile(r'—|seamless|powerful|revolution|game-chang|effortless|cutting-edge|organiz|color|favorit|\bEP-|Hyve|IMEX|DWTC|Shoptalk',re.I)
for x in out:
  for k,v in x['fix'].items():
    if k in lim: 
      if len(v)>lim[k]: print('LEN',x['id'],k,len(v))
      if bad.search(v): print('BAD',x['id'],k)
    if k=='who': assert 1<=len(v)<=3
print('fixes',len(F))
