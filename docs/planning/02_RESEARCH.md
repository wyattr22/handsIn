# Elder care needs and family coordination research

Research checked November 14, 2026. United States is the first market. This is a focused desk review of public health, caregiver-support, government, and technical sources, not a systematic review or completed customer validation. Product implications below are proposals for HandsIn; the sources do not establish that HandsIn improves clinical outcomes.

## What the evidence changes

Care is broader than medications. WHO’s integrated-care framework addresses physical and cognitive function, sensory impairments, nutrition, psychological needs, continence, falls, and support for caregivers. Its emphasis on individualized care supports recording specific needs rather than assuming a uniform progression through old age. [WHO ICOPE][R01]

The 2025 AARP/National Alliance for Caregiving study estimates **63 million adult family caregivers in the United States**. This includes care for adults or children with medical conditions or disabilities and, unlike earlier editions, includes some paid family caregiving. It should not be described as “63 million unpaid elder caregivers.” The old project brief’s 53-million figure was a 2020 estimate with different scope. [2025 report FAQ][R02]

The strongest proposed HandsIn focus is coordinating work across people and preserving clear instructions when responsibility changes. That is a product inference, not a claim that competitors lack these features or that demand for this exact app is proven.

## Types of help and their product implications

| Need | What the sources establish | Proposed HandsIn response |
| --- | --- | --- |
| Personal care | Bathing, toileting, dressing, grooming, and eating are distinct care needs. [FCA home help][R03] | Separate task categories, privacy preferences, required assistance level, supply location, explicit acceptance, and qualified-help requirement where appropriate |
| Mobility and home safety | Fall prevention involves home hazards and professional review of risks, including medicines that may cause dizziness or sleepiness. [CDC falls][R04] | Store assessed mobility instructions and equipment; record concerns; distinguish independent walks from transfers requiring assistance; never infer lifting competence from willingness |
| Medication coordination | Multiple doctors and medicines create interaction risks; OTC products, supplements, and food matter too. [FDA][R05] | A consolidated, sourced medication list; prescriber history; reviewed instructions; potential-issue queue; pharmacist review rather than an AI all-clear |
| Nutrition and eating | Nutrition is part of older-person care; swallowing disorders can interfere with food and fluid intake. [WHO][R01], [MedlinePlus swallowing][R06] | Preferences, access to groceries, allergies and documented dietary/texture constraints; meal assistance tasks; clinician review when needs are uncertain |
| Memory and daily routine | Dementia care planning should account for abilities, preferences, time of day, flexibility, and rest. [Alzheimer’s Association][R07] | Short instructions, familiar routines, optional pictures, clear handoffs, and adjustable schedules; do not assume all older users have dementia |
| Vision, hearing and communication | Sensory capacity is part of WHO’s older-person care framework. [WHO][R01] | Readable type, visible labels, no color-only status, text alternatives to voice, preferred language, and a helper contact method |
| Household support | Cooking, cleaning, laundry, and shopping are separate from health and personal care. [FCA][R03] | Recurring household tasks, shopping lists, supply replenishment, and contributors who help remotely |
| Social connection | CDC identifies social isolation and loneliness as health concerns; limited transportation and language barriers can contribute. [CDC social connection][R08] | Visits, calls, preferred activities, transportation tasks, and an individual’s own goals; avoid treating every visit as a clinical intervention |
| Recovery and changing needs | Hospital discharge requires information transfer, medication review, test explanations, follow-up arrangements, and family involvement. [AHRQ][R09] | Time-bounded recovery plans, document attachments, changed-instruction alerts, follow-up appointments, and review dates |
| Caregiver rest and backup | CDC recommends breaks, help with particular tasks or blocks of time, and shared scheduling. [CDC caregiving][R10] | Planned respite, coverage requests, accepted backups, and handoffs that reduce repeated briefing |
| Paid help | Hiring care requires identifying duties and deciding how to arrange and manage help. Agency and private-hire approaches have different responsibilities. [FCA][R03] | A structured service request and agreement; do not label a provider “verified” without an actual verification process |
| Financial and administrative work | Family-care tensions can include unclear responsibilities and expectations about time or money. [FCA siblings][R11] | Track agreed contributions, reimbursements, coordination tasks, and selective exemptions without publishing a family “fairness score” |

This table is a needs taxonomy, not a clinical assessment or a claim that every person needs every service. Profiles should distinguish independent, reminders needed, assistance needed, and professionally assessed support, while letting the family record changes and the source of instructions.

## Family problems to design around

FCA describes recurring sibling tensions: responsibilities can grow without explicit agreement, relatives may disagree about a parent’s needs, and old family roles can distort expectations. Its guidance favors concrete discussion of what each person can contribute and clearer communication. This supports designing for explicit agreements, not assuming everyone has the same time, skills, money, or view of the situation. [FCA siblings][R11]

The following are **design hypotheses to validate**, grounded in those broad issues and the user’s family example:

| Failure in coordination | Proposed mechanism | What must be tested with families |
| --- | --- | --- |
| “I thought someone else was doing it” | Named assignee plus accepted/pending status; backup escalation | Does acceptance remove ambiguity without too much tapping? |
| One person still does all the organizing | Recurring templates, reusable instructions, visible coverage gaps | Does creating and maintaining templates save time in practice? |
| Some work is invisible | Include scheduling, transport, buying supplies, and calls as tasks | Do users feel recognized without being monitored or scored? |
| A replacement lacks practical knowledge | Shift-specific handoff with locations, current instructions, preferences and contact | Can a new helper act correctly without asking the regular caregiver? |
| A helper is uncomfortable or physically unable | Separate willingness, capability, training and availability | Will users disclose limitations, and who can see sensitive reasons? |
| The capable people subsidize everyone else’s relief | Optional service-specific exemptions and an accepted contribution plan | Do families consider the proposed split fair; what alternatives do they need? |
| A task is assigned but never accepted | Keep it visibly uncovered and notify the coordinator | How long should the family wait, and who is the backup? |
| Conflicting versions of instructions circulate | Current version with provenance and acknowledgment of changes | Can users distinguish a current instruction from a historical note? |
| The recipient rejects care or a stranger | Record consent/preferences and declined outcomes respectfully | Does the interface preserve dignity and avoid coercive language? |

The app cannot resolve entrenched family disputes by calculating a score. It can make commitments, missing coverage, and recorded agreements clearer.

## Findings that constrain specific features

### Lab interpretation

Lab values depend on their units, reference ranges, and clinical context. Results outside a reference range do not by themselves establish illness, and results inside it do not prove health. Different laboratories may not produce directly comparable results. [MedlinePlus lab results][R12]

**Design consequence:** store source documents and exact fields; verify extraction; do not infer medication or diet changes from a number. Use comparable-series charts and suggested questions instead of a generalized health score.

### Interaction data and medication names

RxNav discontinued its drug–drug interaction features on January 2, 2024. Medication terminology lookup must not be confused with interaction screening. [NLM FAQ][R13] DailyMed exposes structured label information through web services. [DailyMed][R14] DrugBank describes a separate clinical drug-interactions module; access, licensing, coverage, and costs need confirmation for this project. Its product description is evidence of an available offering, not independent evidence of clinical completeness. [DrugBank][R15]

**Design consequence:** isolate the interaction provider behind an interface. If a suitable provider is unavailable, show that screening is unavailable; keep the medication list and review workflow functional. A limited, visibly labeled demo fixture is not a production interaction checker and must not be presented as a live feature to judges.

### Food and recipes

Food-related instructions belong to the specific medication and person; prescription and OTC labels and professional advice matter. [FDA][R05] Swallowing problems may need specialist assessment and treatment. [MedlinePlus swallowing][R06]

**Design consequence:** generate meal ideas only within a reviewed constraint set. A general recipe assistant must not decide a swallowing texture, nutrient restriction, supplement dose, or medication timing change. Food-aware planning is a product capability that needs a trustworthy rules source, not merely a longer AI prompt.

### Phone taps

Apple documents NDEF URL-based background tag reading and browser fallback for supported devices. Chrome’s Web NFC implementation is documented for Android and has a limited NDEF scope. [Apple][R16], [Chrome][R17]

**Design consequence:** choose compatible NFC tags carrying an HTTPS link to an opaque record identifier, test the actual phones, and provide QR/manual entry. “RFID” alone is not a hardware specification. The authenticated session identifies the helper; the tag selects context. A static link can be copied and therefore is neither proof of physical presence nor proof of administration.

### US privacy and service operations

HIPAA applicability depends on whether an entity is a covered entity or business associate; it is not a label automatically earned or avoided by calling something a consumer app. [HHS][R18] FTC health-data breach rules can also be relevant to health apps. Its September 2026 withdrawal of an obsolete policy statement explicitly notes that the rule itself had been updated in 2024; the withdrawal should not be mistaken for removing the rule. [FTC overview][R19], [FTC update][R20]

**Design consequence:** use synthetic health data in the hackathon. Before public use, assess the actual US operating model, data flows, consent, retention/deletion, contracts, security and applicable state requirements. This research does not certify compliance or determine the legal status of future clinical features, payments, or aide hiring.

### The family example from France

The user’s account of their great-grandmother’s care is valuable firsthand context for unequal burden and selective cost sharing. It does not establish that all retired people in France receive free nursing. The current official service page describes eligibility and financing for home autonomy services and recommends an assessment and quote. [Service Public][R21] France-specific benefits are outside the US-first release.

## Evidence limits

- Caregiver-support guidance identifies meaningful problems; it does not measure demand or willingness to pay for HandsIn.
- US caregiver survey estimates include groups beyond elder care. Do not use the headline population as an addressable-market estimate without further segmentation.
- Dementia-specific guidance should not be generalized to every older adult.
- No caregiver interviews, clinical reviews, paid-provider partnerships, or usability tests were conducted during this planning task.
- Some NIA and USDA/MyPlate pages were inaccessible through the research tools. No detailed conclusions depend on their unavailable text.
- No competitor feature audit was performed. The older brief’s “nobody connects them” claim should not be repeated as a verified fact.

## Interview and validation plan

Proposed research participants: several family caregivers with differing levels of responsibility, at least one person receiving care who wants to participate, a pharmacist, and an experienced home-care professional. The aim is to improve the design, not to claim statistical representativeness.

Ask for recent concrete examples rather than whether someone likes the idea:

1. Walk through the last day that someone needed help. Which tasks happened, and who coordinated them?
2. Describe the last time a helper canceled. What had to be explained to the replacement?
3. How do you determine which medication list and instructions are current after a new appointment?
4. Which tasks cannot be done by everyone, and how do you currently discuss that?
5. Who pays for help and supplies? Describe a disagreement and how it was resolved.
6. What information would you share with a friend covering a visit, and what should remain private?
7. What makes a meal difficult to plan or prepare? Which restrictions came from a professional?
8. What would make the person receiving care uncomfortable with this app?
9. Which notifications need acknowledgment, and which would become annoying?
10. What would make recording completion difficult during actual care?

Use synthetic examples for usability exercises: create a second recipient; accept a task; replace a helper; find the current instructions; record an uncertain medication outcome; review a proposed cost split. Observe time, errors, clarification requests, and misunderstandings. Compare a generated handoff with the regular caregiver’s description for omissions. Ask the pharmacist to challenge ambiguous labels and interaction wording. Do not treat a small test as proof of medical safety.

## Source register

All sources accessed November 14, 2026. Dates mentioned in the text refer to the source’s report or update, not the access date. Reference links resolve directly to the supporting publisher.

- R01 — WHO, Integrated care for older people approach; broad needs framework.
- R02 — AARP/NAC, Caregiving in the US 2025 FAQ; population and definition.
- R03 — Family Caregiver Alliance, Hiring In-Home Help; support categories and hiring considerations.
- R04 — CDC, Preventing Falls and Hip Fractures; home safety and risk review.
- R05 — FDA, Drug Interactions: What You Should Know; medication reconciliation and interaction categories.
- R06 — MedlinePlus, Swallowing Disorders; eating and swallowing context.
- R07 — Alzheimer’s Association, Daily Care Plan; routines, preferences and changing abilities.
- R08 — CDC, Health Effects of Social Isolation and Loneliness; social support context.
- R09 — AHRQ, IDEAL Discharge Planning; care transitions and information transfer.
- R10 — CDC, Caring for Yourself When Caring for Another; respite and shared help.
- R11 — Family Caregiver Alliance, Caregiving with Your Siblings; family dynamics and agreements.
- R12 — MedlinePlus, How to Understand Your Lab Results; interpretation limits.
- R13 — NLM, RxNav FAQs; discontinued interaction functionality.
- R14 — NLM, DailyMed Web Services; label-data interface.
- R15 — DrugBank, Clinical Drug Data API; vendor-described module availability.
- R16 — Apple Developer, Background Tag Reading; device workflow.
- R17 — Chrome for Developers, Web NFC; browser implementation scope.
- R18 — HHS, Covered Entities and Business Associates; HIPAA applicability framework.
- R19 — FTC, Health Breach Notification Rule basics; health-app privacy context.
- R20 — FTC, September 2026 obsolete-policy withdrawal; current clarification.
- R21 — French Service Public, Service autonomie à domicile; limits of generalizing the family example.

[R01]: https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/ageing-and-health/integrated-care-for-older-people-icope
[R02]: https://www.caregiving.org/wp-content/uploads/2025/07/NAC_CGUS25_FAQ_v3.pdf
[R03]: https://www.caregiver.org/resource/hiring-home-help/
[R04]: https://www.cdc.gov/falls/prevention/
[R05]: https://www.fda.gov/drugs/resources-drugs/drug-interactions-what-you-should-know
[R06]: https://medlineplus.gov/swallowingdisorders.html
[R07]: https://www.alz.org/help-support/caregiving/daily-care/daily-care-plan
[R08]: https://www.cdc.gov/social-connectedness/risk-factors/index.html
[R09]: https://www.ahrq.gov/patient-safety/patients-families/engagingfamilies/strategy4/index.html
[R10]: https://www.cdc.gov/caregiving/caring-for-yourself/
[R11]: https://www.caregiver.org/resource/caregiving-with-your-siblings/
[R12]: https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/
[R13]: https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html
[R14]: https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
[R15]: https://go.drugbank.com/clinical/
[R16]: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
[R17]: https://developer.chrome.com/docs/capabilities/nfc
[R18]: https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html
[R19]: https://www.ftc.gov/business-guidance/resources/health-breach-notification-rule-basics-business
[R20]: https://www.ftc.gov/news-events/news/press-releases/2026/09/ftc-withdraws-obsolete-policy-statement
[R21]: https://www.service-public.gouv.fr/particuliers/vosdroits/F246
