# HandsIn product definition and feature catalog

Approved for publication November 14, 2026. United States first. No work is assigned to individuals. Implementation has not been authorized; release sequencing remains a planning recommendation.

## Product goal

Help a family reliably share care for one or more people, including older relatives and adults recovering from illness or injury. A helper should be able to answer: Who needs me? What is due? What am I authorized and able to do? Where are the supplies? What are the approved instructions? What has already happened? Who takes over if I cannot help?

The person receiving care remains a participant with preferences, privacy, and choices. Family membership does not automatically grant authority over their health decisions or all their records.

## People and relationships

- **Care recipient:** a person receiving support; may optionally have their own login. Their profile contains their individual care plan, routines, medication list, documents, contacts, and preferences.
- **Family or care circle:** a coordination workspace that can contain several recipients. A user can belong to several circles and have different access for each recipient.
- **Coordinator:** manages schedules and access within permissions granted to them. This is an app permission, not proof of medical or legal authority.
- **Regular helper:** has recipient-specific responsibilities, availability, skills, comfort levels, and permissions.
- **Temporary helper:** receives an expiring grant for a recipient, a coverage period, and named tasks, plus the information required to perform those tasks.
- **Paid aide or agency:** a separate service-provider relationship with agreed duties, service status, and costs. Being listed in the app is not verification of credentials.

The same person can provide care in one context and receive care in another. Do not build the data model around one permanent “Dad” profile or one universal caregiver role.

## Complete feature catalog

Every row below comes from the updated request unless marked as a retained prior feature or implementation recommendation. “First” is the proposed initial functional slice; “Next” extends it after integration; “Gated” requires an external or clinical dependency. These labels are proposals, not deletions from the product.

| ID | Feature category | Functions and user outcome | Proposed delivery |
| --- | --- | --- | --- |
| F01 | People and care circles | Multiple caregiver accounts, multiple recipients, recipient switcher, profiles, relationships, emergency contacts, recipient-specific access | First |
| F02 | Family roles and capabilities | Family roster; role, recurring responsibility, availability, willing/unwilling tasks, physical limitations, training needs, and coverage backup | First; detailed capability rules Next |
| F03 | Prescription capture | Photograph a prescription label or upload an image; extract drug, strength, formulation, route, prescribed amount, timing instructions, prescriber, pharmacy, dates, and source image; review before saving; manual alternative | First target for a supported label format; manual entry is the functional fallback |
| F04 | Medication schedule and history | Current and historical prescriptions; separate prescribers; confirmed schedules; due-dose list; administered, self-reported taken, declined, not given, and uncertain outcomes; actor/time; corrections; storage location; refill reminders | First for fixed schedules; complex schedules Next |
| F05 | Medication review | Reconcile the combined medication list, including OTC products and supplements; identify possible duplicate ingredients and potential drug/food interactions; show sources and unresolved questions for a pharmacist | Gated by suitable data and review process; no “safe together” guarantee |
| F06 | Lab and health records | Upload blood, urine, and other supported reports; review extracted test/value/unit/range/date/specimen; original document; comparable trends; plain-language explanations; questions and follow-up tasks | Next; one supported report format first |
| F07 | Health-system connections | Connect external lab or patient-portal records with user authorization, identity matching, refresh/revocation, and provenance | Gated; file upload does not count as a live connection |
| F08 | Calendar and delegation | Shared recipient and family calendar; visits, appointments, shifts, availability, responsibilities, recurring tasks, assignment acceptance, conflicts, uncovered tasks, and reassignment | First; external calendar sync Next |
| F09 | Phone alerts and reminders | Task/dose/visit reminders; assignment requests; acknowledgment and backup escalation; delivery status; contact preferences and opt-out | First with one tested SMS path; push/voice Next |
| F10 | Temporary coverage | Request replacement; invite accepted helper; time-limited access; ready-to-use handoff with task order, locations, current instructions, preferences, contacts, and completion history; access expiry/revocation | First; AI summary optional |
| F11 | Daily care and routines | Bathing, toileting, dressing, meals, walks, companionship, preferred activities, supplies, transport, and approved mobility support; clear task instructions and “need help” action | First through reusable care tasks |
| F12 | Meal planning | Suggested recipes and shopping lists respecting recorded allergies, food restrictions, medication-related instructions, preferences, budget, cooking capability, and clinician-set nutrition/texture needs | Next for preference-based recipes; clinical constraints Gated |
| F13 | NFC tap logging | Tag at a station or on a bottle opens the correct workflow; authenticate helper; display person/task; confirm outcome; record identity/time; QR/manual fallback | Next after medication-event foundation |
| F14 | Paid help | Request an aide for a specific uncovered duty or shift; define duties, requirements, quote, availability, acceptance, cancellation, and completion; eventually hire through the app | Next as externally arranged service record; actual booking Gated |
| F15 | Selective cost sharing | Link cost to a service; choose contributors and exemptions; equal/custom shares; consent, receipts, reimbursements, adjustments, and disputes | Next as ledger/agreement; money movement Gated |
| F16 | Care log and visit brief | Shared observations, handoff notes, questions for doctors, medication and lab context with source links | Care log First; brief Next; retained from prior brief |
| F17 | AI check-in calls | Optional scheduled phone conversation; distinguish patient report from observed administration; record notes and request follow-up | Later unless the team explicitly keeps it in the first demo; retained from prior brief |

## Medication behavior

“Guide proper doses and when” means display and schedule **reviewed prescription instructions**. Scanning a pharmacy label is the first supported capture flow. Identifying an unlabelled loose pill by appearance is not part of that flow and must not produce administration instructions.

Keep strength (for example, amount per tablet) separate from prescribed dose (how many tablets or amount to take). Missing or ambiguous fields remain unresolved. “Twice daily” must not silently become a clinically chosen interval. As-needed medicines, tapers, variable doses, and conflicting instructions require additional rules; the initial scheduler can display these instructions without generating automated dose recommendations.

Changing a prescription creates a new version and retires future reminders for the old version. Historical administration records remain attached to the instructions in effect at that time. A missed reminder means “no confirmation recorded,” not “the patient definitely missed a dose.” No automatic catch-up or double-dose advice.

The medication-review page shows which records were checked, which were unresolved, when the check ran, and where each warning came from. Provider failure or incomplete coverage cannot be presented as an all-clear. AI may explain retrieved findings, but it cannot substitute for the interaction database or decide a new regimen. FDA guidance supports reconciling medicines across doctors and including OTC products and supplements. [FDA interaction guidance](https://www.fda.gov/drugs/resources-drugs/drug-interactions-what-you-should-know)

## Lab and meal behavior

Labs are evidence about a person, not a complete model of their health. Review extracted fields against the uploaded document. Preserve qualitative results such as positive/negative and comparator values such as “less than,” rather than forcing everything into numbers. A trend needs matching tests, units, specimen context, and comparable methods; otherwise show separate results and explain the mismatch. Use the report’s range, not a universal range invented by AI. [MedlinePlus lab guidance](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/)

A report can create a question or a proposed follow-up task. It must not automatically change prescriptions, diagnose a condition, or create dietary restrictions. The meal planner consumes a reviewed set of constraints, with the source and review date for each. Unknown or conflicting medical restrictions result in a review request, not a promise that a recipe is safe. A recipe substitution must be checked again against the constraints.

## Temporary handoff behavior

1. A helper requests coverage for a recipient, time window, and specific tasks.
2. The coordinator selects a replacement and reviews the information they will receive.
3. The replacement signs in, accepts the coverage and instructions, and receives a scoped grant.
4. Their screen shows the current care plan: what is due, where supplies are, relevant allergies and warnings, preferences, who to contact, and tasks they must not perform.
5. Instructions are assembled from structured, reviewed records. An optional AI summary may shorten them but cannot remove essential warnings or invent missing directions.
6. Completion or inability to complete is recorded and shared. Outstanding tasks remain visible to the regular team.
7. Access expires or is revoked. A new request checks the grant again; the helper does not gain access to unrelated recipients, finances, or the full historical chart.

A coordinator should be able to generate the handoff without rewriting it each time. The underlying care plan still has to be entered and maintained. If the plan changes during a shift, show the change and require acknowledgment for affected tasks. Do not silently preserve an obsolete medication instruction in a handoff summary.

## Cost sharing behavior

The requested model is supported directly: people who provide an agreed hands-on task can be exempt from the cost of hiring someone to cover that task, while a selected group agrees to fund the paid replacement.

Illustrative example: seven family helpers; two agree to provide bathing/personal care on their shifts; the family hires an aide for other agreed shifts for **$150**. If the other five agree to equal shares, their shares are **$30 each**, while the two exempt helpers owe **$0**. This is sample arithmetic, not an aide price estimate.

Store the agreement for that service, not a permanent judgment about the family member. Keep “cannot physically do it,” “not trained,” “not available,” and “not willing” distinct. Do not equate willingness with actual completed care. Allow custom amounts, voluntary subsidies, changing circumstances, and a recipient’s own funding contribution. Contributions are proposed until accepted; rejecting a share does not create debt or cancel necessary care automatically.

The first ledger records commitments and externally paid expenses, clearly labeled. It does not charge anyone. A later payment integration needs a separate design for authorizations, refunds, failed payments, payout ownership, and disputes. A real aide marketplace additionally needs provider vetting, task scope, service areas, contracts, and support. Those are product operations, not just a booking button.

## Navigation and reusable UI

| Screen | Main content and actions |
| --- | --- |
| Today | Recipient selector, current helper, due tasks, unconfirmed doses, coverage gaps, recent updates |
| People | Recipient profiles, family roster, roles, permissions, availability and task preferences |
| Medications | Scan/review, current list, schedules, record outcome, history, review findings |
| Calendar | Visits and appointments, accepted assignments, availability, conflicts, request cover |
| Care plan | Routines, locations, supplies, approved instructions, preferences, contacts |
| Cover this visit | Expiring invitation, handoff preview, helper acceptance, completion and return notes |
| Health records | Upload/review, results and trends, questions, observations, visit brief |
| Meals | Reviewed constraints, recipe suggestions, shopping list and meal assignments |
| Help and costs | Service requests, provider record, quote, allocation agreement, receipts and ledger |

Reusable components: recipient selector, task card, timeline, assignment badge, acceptance controls, source/reference panel, upload review form, permission preview, reminder status, empty/error state, confirmation dialog, and accessible date/time display. Mobile layouts should keep the recipient’s identity visible on every action and distinguish status with text as well as color.

## Proposed release slices

**First working slice:** two recipients, a family roster, reviewed medication records, due tasks, dose-event recording, shared calendar and acceptance, structured care instructions, temporary coverage, and one reliable reminder path. Prove it with two logged-in users.

**Next extensions:** one real label-extraction flow if not ready in the first slice, NFC/QR entry, one reviewed blood/urine report flow, a source-linked visit brief, meal preferences, and a selective cost-sharing ledger. These can be implemented independently against the agreed contracts, but should be enabled only after their checks pass.

**External or launch gates:** comprehensive interaction screening, condition-specific food constraints, health-system connections, live aide hiring, payment collection, and broad public use with health data. AI phone calls are an additional integration, not a prerequisite for the new coordination story.

This preserves the full vision while giving the team a functional stopping point at every stage. The team can change the sequence before approval.
