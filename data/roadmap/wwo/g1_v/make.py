import json,re
a=json.load(open('input/g1.json'))
F={
"comms-email-nurturing":({"detail":"Campaign email variables show recommended exhibitors, products, sessions and news as cards with meeting, message and favourite actions, plus incoming meetings, unanswered chats and activity counts. A profile link variable signs recipients in, and templates were rolled out to all events.",
  "outcome":"Organisers send personalised emails from ready templates in every event, and recipients open profiles, request meetings or open their chats straight from the email."},
  "detail said 'live' activity counts but EP-15816 counts are as of the send date; outcome said recipients 'reply to chats' from the email, but EP-20714 only links to the messenger"),
"web-display-updates-2023":({"benefit":"Show a rotating set of attendees on the website, and see the updated X logo and name in the main places social links appear."},
  "benefit said 'wherever social links appear'; EP-21984 updated the most-used (MVP) places only, others to be done later"),
"comms-campaigns-refresh":({"outcome":"Organisers reuse existing campaigns by duplicating them, avoid sending empty emails or losing edits, and check send and open statistics from the list."},
  "outcome claimed 'faster' set-up with no evidence; EP-20661 only adds duplication"),
"comms-message-limits":({"title":"Email message count setting","benefit":"Choose how many unanswered messages appear in each recipient's nurturing email.","detail":"Organisers set how many messages, up to ten, the incoming messages variable shows in each recipient's email."},
  "card described a limit on messages participants can send; EP-21855 is a setting for how many messages (max 10) the incoming messages email variable displays"),
"web-language-consent-2024":({"title":"Browser language detection","benefit":"Websites open in the visitor's browser language when the site offers it.","detail":"The language selector defaults to the visitor's browser language when the site supports it, and visitors can still switch manually."},
  "consent mode claim unsupported for event websites: EP-25964 is 'Consent mode for corp site' with no description; EP-23702 supports the language part only"),
"web-editing-controls-2024":({"detail":"Autosave in the builder is off by default and can be turned on, every video block has an autoplay setting, and links in blocks support mailto, tel and anchor links."},
  "detail said autosave 'can be turned off'; EP-28604 disables it by default with an option to switch it on"),
"comms-email-group-improvements-2024q2":({"benefit":"Send activation links from the email sender and see your active search and filters in Groups.","detail":"An Activation link variable in the email sender opens and activates the recipient's profile, and the Groups tab shows the active search term and filters.",
  "outcome":"Organisers send activation links from any email-sender message, and users can see and adjust their search in Groups."},
  "EP-22911 only shows the active search/filter chips in Groups (search already existed), not 'search within groups'; outcome said organisers activate profiles, but recipients do by clicking (EP-27950)"),
"web-custom-forms":({"outcome":"Organisers collect form responses and feedback on their event site where visitors are, styled to the site and in each visitor's language."},
  "outcome claimed 'capture leads'; no story mentions leads (EP-32969..EP-32973 embed marketing forms and a feedback pop-up)"),
"web-embeddable-widgets":({"outcome":"Organisers embed portal widgets in their own websites, and the frame height follows the content shown."},
  "outcome added 'empty space or inner scroll bars' problems no story mentions; EP-33266 only says the client wants the iframe height to follow content"),
"comms-networking-list-filters":({"outcome":"Users focus on the people and companies they already have chats or meetings with, straight from the lists they browse."},
  "outcome said 'contacts awaiting a reply'; EP-32152 filters by messaged / messaged me, not reply status"),
"web-block-design-2024":({"detail":"Cards in card rows and counter blocks can be reordered by drag and drop, FAQ blocks allow more than eight questions, and images use a chosen aspect ratio. News and sponsor cards have rounded corners, testimonial shadows are lighter, carousel buttons align per card, and icons can open platform and external links.",
  "what":"Cards in card-row and counter blocks can be reordered by drag and drop, FAQ blocks take more than eight questions and images use a chosen aspect ratio. News and sponsor cards have rounded corners."},
  "'Cards have rounded corners and softer shadows' overgeneralised: EP-35493 rounds news and sponsor cards only, EP-35499 lightens testimonial shadows only; 'links in text opened from their icon' not what EP-35872 says (icons open platform and external links)"),
"comms-campaign-sending-chat-limits":({"benefit":"Large campaign send-outs reach every selected recipient in one action, and a daily limit slows anyone starting new chats too quickly.",
  "detail":"Campaigns reach all selected recipients without duplicates in a single send, visible in campaign statistics. A daily limit on starting new chats applies to all users and events, telling users when they can try again.",
  "what":"Campaigns send to every selected recipient in one action, without duplicates, as shown in campaign statistics. A daily limit on starting new chats applies to all users and events and tells users when they can try again."},
  "EP-35350 is a fix (mass send-outs did not work), benefit read as a new feature; 'chat spam' not stated in EP-35014; 'across web and apps' unsupported, EP-35014 names iOS and Android and applies to everyone"),
"comms-multilingual-admin-notifications":({"outcome":"Organisers write once per language, and users, including app users who have not signed in, receive the message in their own language and open the chosen page."},
  "outcome said 'every user, signed in or not'; EP-32750 non-logged-in sending is for app users only"),
"web-seo-custom-pages":({"detail":"Content, dynamic, header and footer blocks render in the server response, apart from pop-up forms, with configurable H1–H6 heading tags, semantic section elements, image alt text and working buttons.",
  "what":"Content, dynamic, header and footer blocks on builder pages render in the server response, apart from pop-up forms, with configurable H1 to H6 heading tags, semantic section elements, image alt text and working buttons."},
  "'Every ... block renders in the server response' overstated: EP-36684 says the two pop-up form blocks render on the client side"),
"web-server-rendered-pages":({"benefit":"Key event website pages, such as community, exhibitor, product, session and news article pages, now return their content for search engines.",
  "detail":"Community, events, news, content, brand, exhibitor, participant, product, session, group, manual, marketplace and floor plan pages moved to a new framework, keeping their blocks and actions. Community, events, brand, exhibitor, product, session and news article pages return their content from the server, as do custom text and HTML.",
  "outcome":"Organisers' exhibitor, product, session and news article pages can be read by search engines, while visitors keep meeting, message and favourite actions."},
  "detail said all listed pages moved to server-side rendering; EP-38650/38653/38649/38648/38646 keep marketplace, participants, manual, groups list and floor plan content client-side and EP-37569 news list has no data in the response; 'participants' and 'profile pages' in benefit/outcome unsupported"),
"comms-advanced-targeting":({"detail":"Campaign and notification filters cover session, round table and exhibitor event attributes, profile completeness and meeting programme activity. New campaign variables show each recipient's meeting programme status and assigned round tables; in notifications, meeting programme filters appear only when that module is on."},
  "module-dependent filter visibility applies to admin notifications only (EP-44892), detail implied campaigns too"),
"web-carousel-editor-2026":({"benefit":"Carousels handle short sets of items better, and text editor controls follow their own design.",
  "detail":"Carousel blocks change how they behave when there are not enough slides to swipe through, and text editor controls follow their intended design instead of inheriting the builder's theme.",
  "what":"Carousel blocks change how they behave when there are not enough slides to swipe through. Text editor controls follow their own design instead of taking on the builder's theme.",
  "why":"Text editor controls took on the builder's theme instead of their intended design, and a slider needs enough items to swipe through.",
  "outcome":"Visitors see short sets of cards shown properly, and organisers get text editor controls that look as designed."},
  "detail said controls 'inherit the builder's theme', the opposite of EP-37770; EP-46421 has only a title ('change swiper logic to carousel'), so 'static layout' and the design-mismatch backstory for sliders are not supported"),
"web-footer-2026":({"detail":"Footer columns can be aligned and deleted, text position is configurable and logo plus text width can be set. ExpoPlatform can show or hide the 'Powered by ExpoPlatform' footer branding per event.",
  "what":"Footer columns can be aligned, sized and deleted, text position has its own setting and the logo and text block width can be set. ExpoPlatform can show or hide the 'Powered by ExpoPlatform' footer branding per event."},
  "branding toggle is Superadmin-only (EP-54112), so organisers cannot set it themselves; wording now says ExpoPlatform controls it"),
}
out=[];seen=set()
for r in a:
    i=r['id']
    if i in F:
        fx,rs=F.pop(i); out.append({"id":i,"verdict":"fix","fix":fx,"reason":rs})
    else:
        out.append({"id":i,"verdict":"ok","fix":{},"reason":"all claims supported by the stories"})
assert not F, F
json.dump(out,open('g1_v/verdicts.json','w'),ensure_ascii=False,indent=1)
# checks
L={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
bad=re.compile(r'—|seamless|powerful|revolutionar|game-chang|effortless|cutting-edge|\b(\w+[^s]iz(e|ed|es|ing)|\w*ization|\w*color\w*|\w*favor\w*|center\w*|behavior\w*)\b',re.I)
ids=[o['id'] for o in out]; assert ids==[r['id'] for r in a] and len(set(ids))==len(ids)
for o in out:
    for k,v in o['fix'].items():
        if k in L: assert len(v)<=L[k],(o['id'],k,len(v))
        if k=='title': assert 2<=len(v.split())<=6
        assert not bad.search(v),(o['id'],k,bad.search(v).group(0))
print(len(out),'rows',sum(o['verdict']=='fix' for o in out),'fixed')
