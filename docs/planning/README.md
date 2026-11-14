# HandsIn product and build plan

Prepared and approved for publication November 14, 2026. First market: United States. Work is intentionally unassigned; the team will choose who builds each component. Publication is a documentation handoff, not authorization to begin implementation.

HandsIn coordinates a family’s care for multiple loved ones: what each person needs, who will do it, the instructions they need, what happened, and how agreed costs are shared. Medication support is one part of that system.

## Read these documents in order

1. [Product definition and feature catalog](01_PRODUCT_DEFINITION.md) — every requested function, proposed boundaries, screens, and release slices.
2. [Elder care and family research](02_RESEARCH.md) — evidence, product implications, sources, and questions to validate with families.
3. [Architecture and shared contracts](03_ARCHITECTURE.md) — records, permissions, interfaces, event rules, and external dependencies.
4. [Build packages and integration plan](04_BUILD_PLAN.md) — unassigned work packages, acceptance criteria, integration sequence, and demo checks.

## What changed from the repository brief

The user’s latest definition expands the November 14 repository brief. It adds multiple care recipients, capability-based task coordination, temporary coverage with ready-made instructions, food-aware meal planning, NFC logging, paid help, and selective cost sharing. Drug-interaction review is now part of the product vision, rather than merely an optional stretch feature. Blood and urine reports are included. The previous phone-call centerpiece remains a possible later workflow; it is not assumed to outrank these new requirements.

This packet proposes how to implement that vision. It does not claim the new scope is already approved for a single hackathon release. Clinical interpretation, service-provider access, and real payments have separate dependencies described below.

## Current construction

The shared repository is https://github.com/wyattr22/handsIn and its public build is https://handsin-six.vercel.app. At the inspected revision `99c641e`, it contains a Next.js App Router landing page, React, TypeScript, a lockfile, and plain responsive CSS. No database, auth, application modules, Tailwind, shadcn/ui, AI services, or telephone services are implemented in that revision. The landing page responds successfully; local typecheck/build were not run in this planning task. The earlier shell check found Node but no `npm` command on PATH.

Retain that repository, deployment, and brand: dark teal, cream, sand, coral; Fraunces and DM Sans. The UI’s current hand illustration is CSS, not the referenced final SVG asset. Do not replace it with rejected logo concepts or MotionWise assets.

## Main planning recommendations

- Build a working coordination and temporary-handoff flow first, with medication records and confirmed dose logging connected to it.
- Define one shared schema and API contract before splitting implementation. Integrate working slices throughout the build, with final assembly reserved for verification and polish.
- Preserve all requested features in the catalog, but use dependency gates to decide which can honestly run in the demo.
- Treat AI output as a draft with sources. Confirm prescription instructions before generating reminders; do not have AI invent doses or determine whether a combination is safe.
- Model cost sharing as an agreement attached to a specific paid service. Support excluding willing hands-on caregivers, exactly as requested, without assigning debts automatically.

## Remaining planning inputs

The user approved this packet for the team and their AIs to reference. The release slices and technical choices are planning recommendations, not a claim that the full scope fits one hackathon release. Remaining inputs are the actual deadline, service-account availability, supported test phones, and whether an interaction-data provider can be obtained in time. Personnel assignments remain the team's decision.

This packet lives in `docs/planning/` in the shared repository and is linked from the root README and `PROJECT_CONTEXT.md`. Preserve the existing project history. Do not start building, assign work, purchase services, or contact teammates based on publication of these documents; the current instruction is to share the plan only.
