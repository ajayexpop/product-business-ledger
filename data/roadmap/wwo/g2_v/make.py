import json,re
a=json.load(open('input/g2.json'))
F={
"reg-default-category":({"why":"Participants who are not assigned to a custom category still need category limits and settings to apply to them.","basis":"implied","outcome":"Every participant is covered by category settings and limits, including those left without a category or moved out of a deleted one."},
 "EP-14938 only states the request for a default category; no past problem is stated, and 'do not have to chase uncategorised profiles' is invented backstory."),
"mobile-language-wording-2023":({"detail":"The apps pick US English from the phone’s locale, with US spellings such as “Favorites”. The “Matchmaking information” section on public profiles is now called “Profile Information”.","outcome":"App users whose phones are set to US English see US spelling, and everyone sees a clearer label on profiles."},
 "Detail said Android network security settings were 'tightened'; EP network_security_config story adds a config so app requests can be inspected for debugging (wrong direction, internal). US English follows phone locale, not location (EP-12277)."),
"mobile-arabic-multilingual":({"why":"Multilingual support was a main requirement for upcoming events, and in-app pages opened in English whatever language the phone and app used.","outcome":"App users can use the app in Arabic, and profile, floor plan and basket pages open in their app language when the event offers it."},
 "EP-20409 value names one client's planned events, not 'many events'; outcome 'the whole app in their own language' overstates: only listed webviews, and only when the event has the language (EP-23090)."),
"reg-category-cloning":({"why":"Categories sometimes differ by only one or two settings, yet organisers had to go through every option again to create a new one.","outcome":"Organisers set up new categories with less effort by cloning an existing one and changing only the settings that differ."},
 "EP-23224 says 'sometimes' only 1 or 2 settings vary (not 'often'); 'faster' unsupported, value says 'minimize efforts'."),
"reg-basket-discounts-invoices":({"benefit":"Discounts work in the new basket, invoice payment has its own step, and a direct link adds a session to the basket.","detail":"Discounts were implemented in the new basket, the invoice payment logic was updated, and the session “add to basket” link adds a session to the basket directly when opened.","why":"The new basket needed the discount rules of the previous basket, and the Add to basket link on session pages had to add the session directly when opened.","outcome":"Buyers get the discounts they are due on tickets and sessions, and organisers can share a link that adds a session straight to the basket."},
 "'More reliably'/'improved' overstates: EP-26659 ports old discount logic to the new basket; EP-26652 makes an existing link work (sessions did not 'gain' it); link adds to basket, not 'straight to paying'."),
"reg-ticket-pricing-tiers":({"why":"Organisers need to charge different prices for the same ticket depending on when people buy it."},
 "Implied why claimed organisers 'often' do this; no source states frequency (EP-26895)."),
"reg-ticket-visibility-country":({"why":"Organisers needed to sell different sets of tickets depending on the country a registrant selects, with the option to let other combinations register free rather than be stopped."},
 "EP-37154 is one client's request, not 'some' organisers; reworded to the stated need."),
"reg-vat-rules":({"outcome":"Buyers are charged the VAT that applies to their situation, and organisers can turn the VAT rules off if they do not need them."},
 "'When they manage tax another way' is an invented reason; EP-32621 only states a Disable VAT rules setting."),
"mobile-app-builder-options":({"detail":"Custom block pages can be shown only to logged-out users; custom blocks can link to the app sign-in page and to other app pages; the Gilroy font can be chosen for headings and text; and the app builder preview now shows the real app view, without a Download all button the apps do not show."},
 "Detail said 'forms are shown in an embedded frame' and 'Download all can be hidden on custom documents blocks'; EP-35827 renders the app builder preview in an iframe, EP-32270 hides Download all in the preview only because the apps lack it."),
"reg-ticket-category-upgrades":({"outcome":"Participants upgrade from their profile and pay only the difference, and can see their current category on the dashboard."},
 "'Always see' overstates: EP-26634 shows the category only when the form has a category field."),
"reg-phone-validation":({"outcome":"Registrants are told when a number is in the wrong format, and organisers get phone numbers in a usable format."},
 "EP-44198 is summary only; 'as they enter it' (live validation timing) is not stated."),
"reg-invoice-payment-registration":({"why":"Organisers and participants needed an offline way to pay when registering."},
 "'Instead of card payment only' is wrong: PayPal and Parampos were already available; EP-34905 value states only an offline payment option."),
"reg-category-lock":({"benefit":"Prevent participant categories being changed by mistake in the admin panel.","why":"Organisers asked for a hard block on accidental participant category changes, beyond the existing warning, especially for participants imported with categories already assigned.","outcome":"Participants keep the category they were registered or imported with, as it cannot be changed by mistake in the admin panel."},
 "'Once registration is set up' not in EP-45795; 'a warning alone did not stop them' and 'knock-on effects' are invented; source says a warning existed and a hard restriction was requested."),
"reg-new-ticketing-country":({"outcome":"Registrants see only the tickets that apply to where they are from, and organisers can move to the new ticketing and keep showing tickets by country."},
 "'Country pricing' is wrong: EP-33039 is visibility by country, not pricing."),
"mobile-usability-2026":({"benefit":"Open sessions from links, see tidier profiles and get loading feedback on the Tickets page.","detail":"Deep links open sessions directly in the app. The About me section on delegate profiles on iOS is hidden when empty, and the Tickets page shows a loading spinner while updating."},
 "Tickets spinner story is iOS (ai outcome claims both, conflicting), so the platform claim is dropped; hiding an empty About me is not 'feedback' (EP-47476)."),
"reg-branded-registration-pages":({"benefit":"Brand the registration welcome, confirmation and sold-out pages for participants and buyers from the admin panel."},
 "'Without custom code' unsupported: confirmation pages explicitly support custom scripts (Stories 3, 4, 21)."),
"reg-checkout-payment-improvements":({"outcome":"Registrants finish free bookings in one step and keep their place when reading the terms, and organisers find a payer's record by searching instead of scrolling."},
 "'Find any payment record in seconds' is an unsupported speed claim; EP-54690 only replaces scrolling with search."),
"mobile-branding-typography":({"benefit":"An event app’s custom typeface now appears consistently across every Android screen.","detail":"An event app’s custom font, previously used only on the My Account and Event Info screens, now covers all remaining Android screens for a consistent look, and the app shows ExpoPlatform branding."},
 "'Set in the app builder' and organisers 'applying' a typeface are not in EP-56372: it rolled one app's font out to the remaining Android layouts."),
}
out=[]
for r in a:
    if r['id'] in F:
        f,why=F.pop(r['id']); out.append({"id":r['id'],"verdict":"fix","fix":f,"reason":why})
    else:
        out.append({"id":r['id'],"verdict":"ok","fix":{},"reason":"Checked against sources; claims supported."})
assert not F,F
lim={'what':240,'why':220,'outcome':220,'benefit':160,'detail':400}
bad=re.compile(r'—|EP-\d|seamless|powerful|revolution|game-chang|effortless|cutting-edge|Hyve|SELA|Shoptalk|FBM|Gabarito|in seconds')
ids=[o['id'] for o in out]; assert ids==[r['id'] for r in a] and len(set(ids))==len(ids)==44
for o in out:
    for k,v in o['fix'].items():
        if k in lim: assert len(v)<=lim[k],(o['id'],k,len(v))
        if k=='title': assert 2<=len(v.split())<=6
        if k!='basis': assert not bad.search(v),(o['id'],k)
json.dump(out,open('g2_v/verdicts.json','w'),indent=1,ensure_ascii=False)
print(len(out),sum(o['verdict']=='fix' for o in out))
