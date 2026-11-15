# Meals & daily care

## Simplified medication-linked experience (November 15 update)

The default view now answers: **what to eat/drink, which confirmed dose it supports, and when**. Each meal card shows one suggestion and its recipe action. Medication source details, macronutrient explanations, shopping/progress, assignments and history are expandable. Daily Care is a chronological reminder checklist, including references to the same meal tasks; it has no second meal or care schedule. Outcomes are Done, Skipped and Need help. `skipped` is an additive shared task status that closes a reminder without falsely claiming that the patient refused it; a future production enum/schema must accommodate this status before connection.

### Medication food contracts

- `FoodGuidance` now supports exact ingredient/strength/form/route, source/review versions, structured food/drink/nutrient requirements, patient directions and explicit conflict flags. Differing structured patient/product rules or requirements require confirmation rather than automatically choosing one.
- Nutrient requirements support fat, carbohydrate, protein and energy, with optional **explicitly sourced** minimums and units. Ordinary with-food rules display “No specific fat, carbohydrate, or protein amount is stated.” No gram/calorie threshold is invented. Non-numerical fat instructions remain non-numerical.
- Numerical recipe suitability requires verified nutrition data for every ingredient, matching quantity units and a source/version. Servings are calculated from recipe yield. Missing, unverified or incompatible data remains unconfirmed; a known shortfall blocks the suggestion. The demo intentionally ships no fabricated nutrition database. Synthetic numerical data exists only in tests.
- Qualitative label food examples can inform suggestions without being turned into mandated foods or portions. The added fictional Kalydeco **ivacaftor 150 mg oral tablet** example uses the [2026 FDA product label, Reference ID 5764298](https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/203188s044lbl.pdf): food containing fat, no invented gram minimum, and avoidance of grapefruit. Egg is one label example, offered in an optional simple egg/rice recipe. This is not a recommendation to start the medication or a regimen inferred from its label. June retains unknown allergies and visible confirmation requirements.
- `MedicationFoodOccurrence` is a read-only projection of a canonical confirmed medication occurrence. `Meal.medicationOccurrenceIds` references its IDs. Planning validates recipient, exact product, instruction version, source, dose version, confirmation and duplicate links. Multiple links must have compatible requirements. Acknowledging a food review never clears unresolved allergy, instruction, timing or nutrition warnings.
- Meal timing is proposed for user confirmation. With-food instructions receive no invented before/after window. Empty-stomach/separation checks use explicit intervals and canonical dose instants, including adjacent days. Legacy local-time hints are only a fallback when no occurrence adapter is supplied. Clock-change ambiguity fails explicitly.
- Daily recurring meals can be planned for up to 14 days (UI offers seven). Every linked day requires its own already-confirmed dose IDs. Missing future occurrences or a clock-change error roll back the entire request. Repeated meals share a calendar series; historical records remain immutable. Medication times are never created or moved by meal planning.
- The calendar projects medication times from those canonical occurrences and suppresses canceled ones. Medication schedule edits/cancellations and administration are rejected in the general calendar/care engine; the medication module owns them. Meal outcomes do not update medication outcomes.

### Adapter boundaries

The scanner branch at `3d03f47` currently exposes `MedicationDraft`, field review statuses and `scheduleTimes`; that draft is **not** a confirmed occurrence API. A production adapter must resolve real recipient/medication/occurrence IDs and confirmed exact-product fields from the medication owner. Do not manufacture production occurrences from OCR text or local-time strings, and do not treat a draft acknowledgement as an authenticated clinical review. The demo explicitly constructs fictional adapter snapshots and read-only calendar medication references for seven days.

`MedicationFoodPort.getOccurrences` defines the missing host boundary. Production authentication, encrypted persistence, medication providers, reliable nutrition providers and real phone delivery remain unconnected. The source/version fields are provenance contracts, not independent clinical verification. Existing recipient/category permissions, temporary access, primary/secondary responsibility, idempotency, corrections, observations and outbox remain in use.

### Review steps

1. Open `/care/demo`. Alex has a breakfast linked to the supplement/water instruction and dinner linked to a prescription with food. June demonstrates an explicit fat-containing-food instruction with no invented numerical target.
2. Open Medication food instructions, then a product, to read macronutrient details, exact product metadata and source. Unknown information stays visible even after a coordinator acknowledges review.
3. Move to the next day. Review a meal for a confirmed dose or use Plan a meal, select a dose, review the proposed time and confirm. Check the same task in `/calendar/demo`; use the recipient filter or Day view when a month cell has more events than it can show.
4. Open a meal's Details > Other meal ideas to change its recipe/servings or substitutions. Known conflicts block saving a suggestion. Actual consumption remains recordable regardless of the planned recipe.
5. Open Daily care. Use Done to record a reminder; the form also offers Skipped and Need help, accurate source attribution and an observation time. Detailed instructions/history are hidden until requested. Optional observations and their independent follow-up are under a separate expandable section.
6. Verify Ben can record as an authorized secondary, Alex self-reports for Alex only, and guest/unrelated accounts receive no care profiles. Check that the calendar reflects the same outcome without changing medication administration.

Validation extends the existing suites with exact-product/conflict checks, explicit versus unspecified macronutrients, missing nutrition data, servings/units, food/drink substitutions, dose-link races/duplicates, compatible multi-dose meals, recurring rollback, canonical medication calendar times, and skipped reminders. Browser checks cover clear cards, planning, shared navigation, recording, sources, mobile layout, and keyboard controls. The original implementation notes below remain background for the unchanged permission/persistence boundaries; this section supersedes their earlier UI and medication-link descriptions.

Feature branch: `codex/meals-and-daily-care`, based on calendar/delegation commit `9b9324c`. Main and the other feature branches are not changed. The dependency is intentional: every meal and scheduled routine uses the existing coordination task, assignment, audit and notification structures.

## Run and review

`npm ci`, `npm run dev`, then open `/care/demo`. `/calendar/demo` shares the same in-memory workspace during client navigation. Reloading resets fictional data. `/care` explains why production access is unavailable. No environment variables, real records, SMS, paid APIs or database migrations are required.

1. Start as Sarah. Select Alex or June and a date. Open recipes and food guidance; Alex has a milk allergy, June has unknown allergies and a vegetarian preference.
2. Plan a meal, select servings and optionally substitute catalog ingredients. Known conflicts prevent recommending that plan. Custom meals require manual ingredient review. Planned meals appear in the calendar using the exact same task IDs and times.
3. Open Demo tools and choose Ben, the accepted secondary for Alex’s breakfast. Record preparation/offering separately from actual consumption. Consumption needs an amount and source; preparation does not increment the eating count. Recording does not promote a backup or withdraw the primary.
4. Choose Alex (patient) to self-report for Alex only. Maya can record as an authorized caregiver without being assigned primary. Guest and unrelated accounts have no full care-profile access.
5. Correct a completed record with a reason. The previous author, source, observed time and saved time remain in history. The goal uses the latest effective record and actual consumption date.
6. Open Daily care. Record a hygiene or comfort check. Add a factual skin/injury observation separately. Completing a check leaves the observation open. A coordinator acknowledges or resolves it with a follow-up note; ordinary caregivers cannot resolve it.
7. Customize a routine’s days, time, assistance, instructions and source. Saving retires future unfinished occurrences; Schedule next 7 days materializes the new version. Generating the same version/date twice creates no duplicate. Completed/declined occurrences are never recreated by an edited routine on the same date.
8. Personalize allergy status, restrictions, preferences, household meal goal, optional sex/height/weight and health context. These fields do not prescribe diets, fluids, calories, shower frequency or treatment.

## Requirement coverage

| Requirement | Implementation / boundary |
| --- | --- |
| Separate meals and daily-care section | `/care/demo`, two simple tabs, person/date controls, large labels and controls, mobile stacking, empty states |
| Meals + calendar integration | One coordination task per occurrence, shared root demo provider, shared cancellation/status/coverage; no second schedule |
| Recipes and drinks with prescriptions/OTC/supplements | Curated recipes, ingredients/steps/servings, water only where product instruction specifies it; exact-product source excerpts for all three categories |
| Allergies and restrictions take priority | Known catalog conflicts block planning/review, substitutions rechecked, unknown information visibly requires review; no interaction-clearance claim |
| Individual care | Versioned profiles and routine templates with sources, assistance and days; no clinical regimen inferred from body measurements |
| Patient + authorized caregivers + primary/secondary recording | Explicit `shared_care` policy, verified-patient link contract, separate source attribution; assignments never grant access |
| Daily meal goal | Configurable household goal (demo default 2), tracks any amount eaten, explicitly not nutritional adequacy |
| Hygiene, skin, sores/injuries | Configurable routines plus factual observation/follow-up workflow; no diagnosis/staging/treatment or photo collection |
| History, corrections and duplicate prevention | Expected versions, atomic transitions, idempotency receipts, appended superseding records |
| Calendar reminders / phone alerts | Existing shared outbox plus care-concern events, dispatch authorization and invalidation; actual SMS/push delivery not connected |
| Guest/filtered accounts | Denied full care profiles unless full-recipient meal AND daily-care read scopes exist; task-only projection remains in calendar |
| Integration into app | Typed repository/client/food-guidance/notification ports. Production auth, persistence, medication provider, category-access resolver and encryption are deliberately unconnected |

## Sources and food-rule behavior

Example recipes are ordinary optional foods, not clinically required menus or nutrition-complete plans. Label instructions do not establish a patient’s medication regimen. Demo times are fictional already-confirmed schedules. The module never starts, stops, reschedules, doses or records administration of medication.

- Xarelto **20 mg oral tablet**: [FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/022406s045lbl.pdf), food required for this strength. Other strengths/forms cannot inherit this rule.
- Ibuprofen **200 mg coated oral tablet, OTC**: [DailyMed product](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dd9aaf80-6c2b-41a3-87b9-61642aaed4f0), conditional food instruction is kept conditional. It is on a separate fictional recipient from the anticoagulant example.
- Nature Made Vitamin D3 **25 mcg / 1,000 IU tablet**: [manufacturer directions](https://www.naturemade.com/products/vitamin-d3-25-mcg-1000-iu-tablets), existing product directions mention water and a meal; no supplement recommendation is made.
- [MedlinePlus skin-care reference](https://medlineplus.gov/ency/patientinstructions/000147.htm), linked for care-team discussion. No universal check/bathing/repositioning protocol is prescribed.

With-meal rules flag unconfirmed matching dose times. Empty-stomach/separation rules require explicit reviewed before/after intervals and schedules; no interval is invented. Adjacent dates and DST failures are considered. Missing instructions, unknown ingredients, custom food and unavailable interaction services remain review limitations. Full food/drug/supplement interaction checking is always marked unavailable. Acknowledging review does not remove that limitation or assert clinical approval. All product confirmations in fixtures are **demonstration-only**, never real clinician approvals.

Meal review fingerprints cover the recipient profile, all recorded product rules/versions, recipe/substitutions/servings and shared calendar times. Changes make prior review stale immediately. Actual consumption is recordable even if it differs from a plan; factual history must not be suppressed because a recipe is unsuitable. Reminders contain coordination metadata, not cached medical advice.

## Host integration contract

`src/contracts/care.ts` defines the client/repository/food/notification ports. `applyCare` and `applyCommand` are pure atomic transitions; `executeCare` must run inside a real database transaction. No raw-state demo endpoint or demo actor switch may be exposed as production authentication.

- Derive actor identity from the verified host session. Resolve recipient/circle membership, category permissions, active temporary scopes and revocation on every read, mutation, retry and dispatch. Never accept grants or patient user IDs from request JSON.
- Resolve the People & Roles branch’s cumulative tiers/overrides **before** constructing grants: category `meals` maps to `meal`, `care` maps to `daily_care`; tier 1 scheduling does not imply either. Approved temporary grants replace regular access while active, combine by strongest category across overlaps, and restore regular scope at expiry as defined by that branch. Family titles are not permissions. The optional category allowlist is enforced by coordination authorization. Demo legacy full grants omit it; production must populate it explicitly.
- The combined care screen currently requires full-recipient read permission for both meals and daily care. A narrower grant can access its authorized task through calendar projections, without full health context. A future separate meals-only projection must minimize profile fields rather than expose the whole profile.
- `recordingPolicy: shared_care` is allowed only for meal/daily-care tasks. Medication-linked tasks remain rejected. Expose the care `record` command for food/care logging; `careOutcome` is its internal coordination transition, not a public alternate meal-log API. Existing generic outcomes retain accepted-primary and medication-module rules.
- Use canonical medication IDs from the scanner/medication branch, with exact product/form/strength, confirmation status, label source/version and confirmed schedules. Unsupported or conflicting data stays review-required. Do not copy the scanner’s guessed OCR data into confirmed rules. The current fixture ID adapter is synthetic.
- Map observation IDs to the shared health-record/notes module when that contract is merged. Preserve one canonical observation and its audited follow-up; do not create a second diagnosis record. The current coordination observation collection is the explicit local port boundary.
- Persist profiles, guidance versions, meal-to-task links, routines, append-only logs, observations, receipts, audit and outbox together under recipient-specific authorization/RLS. Existing circle membership alone is insufficient. No SQL migration is shipped or applied because production persistence and encryption remain unagreed.
- The newer `codex/people-and-roles` preview at `19a7a87` is separate and also has no production authorization/encryption backend. Its package scripts/UI should be merged deliberately; do not overwrite either branch’s scripts. The scanner and health-record branches are not silently merged into this feature.
- Route reminder delivery through the shared notifications worker with `shouldDispatch` immediately before sending. Queueing does not mean delivered. Keep PHI out of lock-screen payloads by default, and implement quiet hours/preferences with the notification owner. Acknowledged concerns stay open; resolution invalidates pending concern events.
- Apply the team’s chosen encrypted storage/synchronization and trusted-device design before processing real health information. No HIPAA compliance claim is made by this demo. No real data enters browser storage, external recipe/AI services or application logs.

## Verification

`npm run test:care` (also `test:calendar`) compiles strict domain code and runs both test suites. Covers permission isolation, category filtering, patient/secondary recording, unchanged assignments, corrections, races, idempotency, medication protection, recipe conflicts/substitutions, unknown data, stale reviews, food separation, repeat generation, observation follow-up, shopping scaling and actual-day goals, plus the existing calendar tests.

`npm run typecheck`, `npm run build`, `git diff --check` complete source/build checks. Browser review covers recording, shared navigation, patient/guest access, routines, observations and responsive layout. These checks validate a synthetic preview, not real clinical rules, database/RLS, encrypted synchronization or SMS delivery.

On Windows, a running preview can hold files under `.next`. If a repeated build fails with `EPERM` while creating segment folders, use `$env:HANDSIN_ISOLATED_BUILD='1'; npm run build` to build into the ignored, dedicated `.care-build` directory. Normal development and deployment still use `.next` when the flag is absent. No patient data is stored in either output directory.
