# HandsIn: Project Brief and Handoff

## Current project direction as of November 14, 2026

The user approved publication of the [research and planning packet](docs/planning/README.md). It is the current reference for the expanded product definition and proposed construction plan. **Work remains unassigned. Do not begin implementation merely because this plan has been published; the user explicitly requested documentation only.**

The first market is the **United States**. The updated scope includes multiple care recipients and caregivers, a family roles page, prescription-label scanning and reviewed medication schedules, interaction review, blood/urine records, shared calendars and accepted task assignments, phone reminders, temporary helpers with expiring access and reusable handoffs, daily care, constrained meal planning, NFC/QR logging, paid help, and selective cost sharing.

Read the [product catalog](docs/planning/01_PRODUCT_DEFINITION.md), [research and sources](docs/planning/02_RESEARCH.md), [architecture](docs/planning/03_ARCHITECTURE.md), and [unassigned build packages](docs/planning/04_BUILD_PLAN.md). These describe planned behavior, not completed features, clinically validated advice, service partnerships, or compliance certification. Release stages and provider dependencies remain explicit in the packet.

The original brief below is retained as historical context. Where it conflicts with the packet, the packet takes precedence: the old “build these, nothing else” MVP is superseded; interaction review is part of the product vision; NFC is now specified; the old four-role split is not an assignment; and the phone-call centerpiece and original weekend sequence are not mandatory priorities. The repository and live starter already exist, so the old setup checklist is historical. Referenced deck/SVG assets are not established as repository contents merely by their mention below.

Keep the existing repository, deployment target, brand and project history. Future implementation requires a separate instruction; do not infer it from the historical next steps.

## Original hackathon brief

> Project planning context for a four-person school hackathon team. This document records the supplied brief; it does not indicate that features, interviews, testing, or compliance work have been completed.

Sources: `Pasted text.txt` (project brief and handoff) and `HandsIn Why We Should Build It.pdf` (pitch deck). The handoff provides the detailed scope; the deck reinforces the problem, connected care loop, demo, and judging priorities.

Decisions in the supplied brief are recorded below. Items under “Open items / next steps” remain unresolved. The original opening address to an AI assistant has been replaced with this document description.


## 1. The idea in one line

HandsIn is one shared hub for families caring for a loved one. It coordinates medications, appointments and lab results across siblings, and an AI phone call checks in with the parent and feeds what it learns back to the family and the doctor.

Tagline idea: "When Dad needs care, everyone puts their hands in."

Mission statement:

Caring for someone you love shouldn't mean drowning in group texts, pill bottles, and paperwork. HandsIn gives families one shared place to coordinate care, so nothing gets missed and no one carries it alone.

## 2. The problem and the user

The user (be specific, not "everyone"): Sarah, an adult child who works full time and shares her dad's care with her brother.

Today: care runs through group texts, sticky notes and memory. Doses get missed or doubled ("Did anyone give Dad his 8pm pill?" / "I thought you did??"), appointments get double-booked, and one sibling ends up doing everything.

Scale: about 53 million Americans are unpaid family caregivers (source: AARP & National Alliance for Caregiving, Caregiving in the U.S. 2020).

## 3. What already exists (competitors) and how we're different

All the pieces exist separately. Nobody connects them.

| Category | Examples | Their gap |
| --- | --- | --- |
| Family coordination apps | Caring Village, CareClinic, CircleCare, Caily, KinRelay | Shared calendar and meds list, but someone still checks every dose off by hand |
| AI check-in calls for seniors | Callie Care, ElderMate, inTouch, CareRing, Yokeru | Built around the call, not the family's whole care plan |
| AI lab result explainers | Wizey, MedAssist, Healtix, TestResult.ai | Built for one person reading one report, not a family |

(Competitor details come from their own app store listings and company pages. Describe them fairly and don't overclaim what they lack.)

Our edge, the connected loop:

Dad answers: at 8pm the AI calls and asks whether he took his pills and how he feels.

Family updated: his answer automatically checks off the dose in the shared list.

Context logged: "felt dizzy" lands in the care log next to last week's new medication.

Doctor ready: calls, labs and medication changes become one doctor-visit brief with questions.

Positioning line: "Other apps remind Dad. HandsIn tells the whole family what happened and gets them ready for the doctor."

The name was changed from "CareCircle" because CircleCare already exists.

## 4. MVP features (build these, nothing else)

- Care circle: create a profile for the loved one ("Dad") and invite family by link.
- Scan to add meds: photograph a prescription label, and AI (vision) pulls out the drug name, dose, schedule and refill date.
- Live med checklist: today's doses. Anyone can check one off and everyone sees it in real time.
- Missed-dose alerts: a text to the family if a dose isn't checked off, plus refill reminders.
- Shared calendar: appointments with "who's taking him?" assignments.
- Care log: quick notes after visits or calls.
- Lab results explained: upload a photo or PDF of blood work. AI extracts each test, value and the lab's reference range, flags out-of-range values, explains each test in plain English, shows trends across uploads, and generates "ask your doctor" questions that get added to the next appointment.
- AI check-in call (the creative-AI centerpiece): a phone call to the parent at dose time. Their answers update the checklist and care log, and alert the family if something's off. Backup if voice takes too long to build: an SMS check-in.
- Doctor-visit brief: AI combines meds, lab trends and care notes into one page of questions for the appointment.
- Stretch goals only: a drug-interaction warning when a new med is added, and an AI weekly family summary.

## 5. Guardrails (important, judges will ask)

Explain and organize, never diagnose.

✅ OK: "Cholesterol is 240. The lab's normal range is under 200." / "A1C rose from 5.6 to 6.1 over three tests." / "Ask the doctor: is this A1C trend a concern?"

❌ Never: name a condition, give a diagnosis, suggest starting, stopping or changing a medication, or say a result is nothing to worry about.

Every AI insight carries a short disclaimer: "Informational only. Discuss with a healthcare provider."

Software that diagnoses can count as a medical device under FDA rules, so staying on the explain side is a deliberate product choice.

Demo data only this weekend. HIPAA compliance is on the plan for a real launch.

## 6. The 2-minute demo (one family's story, told live)
1. Sarah creates Dad's circle and invites her brother.
2. She snaps a photo of Dad's pill bottle. The med and schedule fill in.
3. Her brother's phone updates instantly.
4. 8pm: HandsIn calls Dad, played by a teammate on stage. His answer updates the checklist and alerts the family.
5. New blood work: a rising A1C is flagged and questions go on Thursday's appointment.
6. Her brother claims Thursday's appointment. Done.

Prep: rehearse at least 3 times, with a pill bottle that scans cleanly and 2 or 3 fake lab reports on different dates so the trend chart looks good.

## 7. Business model and path to customers

Who pays: adult children like Sarah.

Pricing (suggested, untested): free for one care circle, then a family plan at about $8/month (unlimited members, AI summaries, SMS alerts, check-in calls).

Why they switch: today it's group texts or two or three separate apps. HandsIn is one place, and Dad doesn't need to learn anything new or own a smartphone.

First users (specific places): our own families; campus staff caregivers via HR or employee groups; local Alzheimer's Association support groups; online caregiver communities (for example r/CaregiverSupport and Facebook caregiver groups).

Later (B2B): home care agencies, senior living communities, and employers offering caregiver benefits.

## 8. Tech stack

| Layer | Tool |
| --- | --- |
| Frontend | Next.js + Tailwind + shadcn/ui (mobile-first) |
| Backend, database, auth, real-time | Supabase |
| AI (label scanning, lab parsing, summaries, call logic) | Claude API (vision + text) |
| Phone calls and SMS | Twilio (voice + SMS), with speech-to-text for the call |
| Hosting | Vercel |

## 9. Team roles (4 people)

| Role | Owns |
| --- | --- |
| Frontend [Name] | Dashboard, med checklist, calendar, lab view; works great on phones |
| Backend [Name] | Database schema, login, invites, real-time sync, reminder timing |
| AI & integrations [Name] | Label scanning, AI check-in call, text alerts, lab parsing |
| Product & pitch [Name] | Design, caregiver interviews, user testing, business model, slides, demo rehearsal |

Agree on the database schema and the data each screen needs in the first 2 hours so everyone can build in parallel.

## 10. Weekend timeline

| When | What |
| --- | --- |
| Friday night | Lock screens and schema, start one repo, book caregiver interviews |
| Saturday morning | Core app: login, care circles, med checklist with live sync |
| Saturday afternoon | Label scanning, missed-dose alerts, shared calendar |
| Saturday night | AI check-in call, lab upload and the doctor-visit brief |
| Sunday morning | Real families use it, we collect proof, polish the design |
| Final hours | Feature freeze. Rehearse the demo at least 3 times |

Real-user plan (needed for top marks):

Friday: interview 5 caregivers (parents, relatives, campus staff). Ask how they coordinate meds today and what has gone wrong.

Saturday: put about 3 families on the live app for a real routine, with non-sensitive details only.

Sunday: bring the proof (quotes, screenshots, usage numbers) into the pitch.

## 11. Judging rubric (100 points) and how we hit each criterion

| Criterion | Pts | Top-score bar | Our plan |
| --- | --- | --- | --- |
| Execution & design | 25 | Runs live, nothing faked, easy to use cold, looks like a real product | Whole flow runs live. Cut a feature rather than fake one |
| Real problem, real user | 25 | Specific person with a painful problem; real people used it this weekend, with proof | Sarah; interviews plus about 3 families testing, with quotes and screenshots |
| Path to customers | 20 | Clear who pays, how much, why they'd switch; exactly where the first users come from | Families at about $8/month; named caregiver groups |
| Pitch & demo | 15 | Judges care within 30 seconds; demo tells one user's story, live; sharp, honest answers | The 6-step Sarah story above |
| Creative use of AI | 15 | A use judges haven't seen that the product depends on, and we can show it | The connected loop: the call updates the family checklist, adds care-log context and feeds the doctor brief |

Other rules:

Not scored: how hard the code is, how much AI is used, majors. Templates, open source, APIs and AI builders are all allowed.

Keep history: build in ONE project from Friday on. Don't delete commits, project versions or AI chats until prizes are paid. Don't duplicate the project or move to a fresh one at the end.

Tiebreaker: Real problem score first, then Execution & design.

At the finals, Execution & design is judged from the live demo.

## 12. Brand

Name: HandsIn (written as one word, capital H and I).

Logo: four hands stacked in the middle of a round cream badge, coming in from the four corners: red (#D94841), blue (#2F6FD1), orange (#F08A2B), yellow (#F2C230). Colored burst lines around them suggest the "about to cheer" moment. The wordmark is "Hands" in dark teal (#14302E) with "In" in red.

Deck palette: dark teal #14302E, cream #FAF7F2, sand #EFE8DD, coral #B5462A. Fonts: Fraunces (headings), DM Sans (body).

## 13. Assets already made

Team pitch deck (13 slides): cover, problem, competitors, rubric overview, one slide per rubric criterion, guardrails, roles, weekend plan, "Are we in?" close. It has speaker notes.

Logo files: handsin-logo.svg (badge plus name) and handsin-mark.svg (badge only).

## 14. Open items / next steps

- [ ] Fill in teammate names for the roles.
- [ ] Team vote: are we in?
- [ ] Check that "HandsIn" is free on the App Store and as a domain.
- [ ] Line up 5 caregivers to interview.
- [ ] Set up the single shared repo (Next.js + Supabase) and agree on the database schema.
- [ ] Build the label-scanning prototype first, since it's the riskiest AI piece after the call.
- [ ] Decide early whether the check-in call is voice or the SMS backup.
