import json
T='05_transactions_and_purchasing:';R='06_online_registration:';M='19_mobile_app:'
rows=[
("reg-language-preference","new","'New system field of Language Preference' adds a field that did not exist",[R+'141'],"Language Preference field in the form builder"),
("reg-form-field-options","improved","'Add the option to make custom text field as a website field' / 'Add option for state/region and city' extend existing fields",[R+'147',R+'71',R+'226'],"Custom field types, HTML5 website type and confirmation-page category variable"),
("reg-default-category","improved","'Participant default category' adds a default to the existing participant categories",[R+'182'],"Default Category, auto-assigned"),
("mobile-language-wording-2023","improved","'Add support for US English language' and 'Replace Matchmaking Information Wording' change the existing app",[],"No baseline claim covers app UI languages or wording"),
("reg-category-setup","improved","'Ticketing order' (category ordering) and 'Prohibit same names for answer options' change existing setup",[R+'181',R+'74'],"Participant category management"),
("mobile-android-redesign","improved","'Delegate/Exhibitor/Products/Brands list redesign', 'Android Sessions redesign'",[M+'86',M+'85'],"Catalogue/attendee lists and sessions in the app"),
("reg-utm-tracking","improved","'UTM codes on the Confirmation Pages' adds tracking to the existing confirmation page",[R+'230',R+'345'],"UTM forwarding to the confirmation page, Google Analytics"),
("mobile-arabic-multilingual","improved","'Arabic translation for mobile app' and 'Multilanguage webview pages' extend the app's languages",[M+'91',M+'242'],"Multilanguage webview in the app language, with fallback"),
("reg-category-cloning","new","'Ability to clone participant and exhibitor categories' introduces cloning",[R+'81',R+'198'],"Clone participant/exhibitor categories"),
("reg-print-badge-link","improved","'Adding More Variables in Visitor Confirmation Page'",[R+'226',R+'348'],"Confirmation-page variables incl. print badge link"),
("mobile-in-app-updates","new","'In-App Updates' launches update prompts",[M+'79',M+'221',M+'220'],"Force/soft update policies and Required Update Version"),
("reg-basket-discounts-invoices","improved","'Applying of the discounts', 'Change logic for invoice payment', add-to-basket link",[T+'112',T+'73',T+'75'],"Participant basket discount order, multi-buy, payments by invoice"),
("reg-field-timestamps","improved","'Add the option to record timestamp for a specific field'",[R+'153',R+'411'],"Capture Input Timestamp"),
("mobile-app-behaviour-2024","improved","'Dynamic Event Handling for User Session Management' and friendlier section close change existing behaviour",[M+'76'],"Multi-event container app and event selection"),
("reg-new-basket-payment","improved","'(New UI) My Basket', 'Payment page upgrade' re-platform the basket and payment page",[T+'64',T+'109',T+'67'],"Shopping basket and basket payment page"),
("reg-new-ticketing","improved","'(Part 1) Tickets list/creation in Admin panel' under 'New ticketing' re-platforms ticketing",[T+'65',T+'118'],"Ticket creation/config and setup form"),
("reg-app-basket-payment","new","'Basket for the mobile app', 'Payment page for the mobile app' bring the basket into the app for the first time",[M+'85',M+'89'],"Paid-session basket and basket in app My Account"),
("reg-ticket-pricing-tiers","improved","'Setting few timeranges with different pricing' adds a pricing option to tickets",[T+'65'],"Ticket pricing models"),
("reg-ticket-visibility-country","improved","'Visibility by country for tickets in Old UI Registration' extends existing tickets",[R+'203',T+'65'],"Ticket visibility by country per category"),
("reg-vat-rules","improved","'Changes to the current VAT logic'",[T+'126',T+'69',T+'147'],"VAT rules engine, EU rules, reverse charge"),
("mobile-app-builder-options","improved","'Add an option in app builder...', 'Font in the app', 'Login Link' extend the app builder",[M+'77',M+'141',M+'95'],"App Builder, font selection incl. Gilroy, custom pages"),
("mobile-tiered-menus","improved","'Tiered Menu Navigation for App Browser' restructures the existing menu",[M+'94'],"Configurable app menu"),
("reg-payment-setup-checks","improved","'Validation of Required Fields', 'Check secret key of PayPal', 'new changes to the UK VAT API'",[T+'139',T+'257',T+'191'],"Gateway required fields, PayPal key validation, VAT validation service"),
("mobile-event-selector-2025","improved","'Display Country/City on choose event' and ordering of events on the selector",[M+'76'],"Multi-event container app event selection"),
("reg-tickets-profile-basket","improved","'(Part 2) Introducing new tickets to the basket', 'Reservation of tickets', 'Behaviour of ticketing toggle'",[T+'116',T+'117',T+'120'],"15-min reservation, ticketing toggle/sold lock, participant purchase flow"),
("reg-disable-repeated-registration","improved","'Repeated registration flow for users' adds a setting to existing duplicate handling",[R+'405'],"Duplicate registration can be explicitly permitted"),
("reg-orders-invoices-profile","new","'A new Slider for Orders tab', 'Invoices tab', 'Create module for ordered items'",[],"No baseline claim covers the participant profile orders/invoices area"),
("reg-ticket-category-upgrades","new","'(Part 2) Tickets upgrade' introduces upgrading by ticket",[T+'66',T+'121'],"Ticket upgrades with auto credit on category switch"),
("mobile-resync-builder-2025","new","'Re-sync button to fetch the latest SQL data file manually' adds a new button",[M+'89'],"App Settings incl. re-sync"),
("reg-phone-validation","improved","'Add validation of the phone field by value format'",[],"No claim covers phone field validation"),
("reg-multilingual-invoices-tax","improved","'Translation for invoices', 'Multilingual Tax name' extend existing invoices and taxes",[T+'70',T+'127',T+'125'],"Invoice layout and taxes"),
("mobile-scrolling-location-text","improved","'Rotating Location Text on Button' changes an existing button",[],"No claim covers detail-page location buttons"),
("reg-invoice-payment-registration","improved","'Invoice Payment for Participants in Registration' extends invoice payment to participants",[T+'75',T+'130',T+'67'],"Payments by Invoice and card-or-invoice payment page"),
("reg-category-lock","improved","'Disabled category selection' adds an option to categories",[R+'82',R+'199',R+'307'],"Disable participant category change"),
("reg-ticketing-version-switch","improved","'Feature flag for new Ticketing' adds a switch between versions",[T+'77',T+'65'],"New Ticketing flag and old+new ticket experience"),
("reg-new-ticketing-country","improved","'Visibility of Tickets by Country' in the new ticketing",[R+'203',T+'65'],"Ticket visibility by country"),
("mobile-usability-2026","improved","'Deeplinks for Sessions' plus iOS 'Update About me / Tickets page behaviour'",[M+'85'],"Sessions in the app"),
("mobile-global-resync-no-logout","improved","'Global Force Resync' now resets without logout",[M+'89'],"App settings re-sync"),
("mobile-offline-favourites","improved","'Update Favourite icon behaviour in case of internet connection lost'",[M+'83'],"Networking favourites"),
("reg-new-registration","improved","'Story 7-20' rebuild registration (email verification, tabs, tickets, sessions, summary) on the existing flow",[R+'77',R+'245',R+'73'],"End-user registration page, abandonment resume, conditional logic"),
("reg-approval-buyer-waitlist","improved","'Registration to Private event with Public access', 'Registration of Buyers', 'Registrations with limit'",[R+'114',R+'122',R+'123'],"Registration with approval, limited registration, waiting list"),
("reg-branded-registration-pages","improved","'Main Participant/Buyer registration page setup', 'Confirmation page setup'",[R+'76',R+'226',R+'223'],"Confirmation page, variables, Visitor/Buyer variants"),
("reg-checkout-payment-improvements","improved","'Skip the payment form when total is 0', 'Search Functionality on Transaction Dashboard and Invoice Payments'",[T+'74',T+'130'],"Transaction Dashboard and Payments by Invoice"),
("mobile-branding-typography","improved","'Add FBM Gabarito to remaining pages [Android]', branding promotion",[M+'141'],"App font selection"),
]
out=[dict(id=a,kind=b,kindWhy=c,buildsOn=d,buildsOnWhy=e) for a,b,c,d,e in rows]
json.dump(out,open('m2_w/map.json','w'),indent=1,ensure_ascii=False)
d=json.load(open('input-m2.json'));cl={c['id'] for c in d['claims']}
fid=[f['id'] for f in d['features']]
assert [o['id'] for o in out]==fid
assert all(o['kind'] in('new','improved','unclear') for o in out)
assert all(x in cl for o in out for x in o['buildsOn']) and all(len(o['buildsOn'])<=3 for o in out)
from collections import Counter;print(Counter(o['kind'] for o in out));print([o['id'] for o in out if not o['buildsOn']])
