# Temporary coverage: preparation checkpoint

**Build update:** The user subsequently authorized implementation. A first interactive fictional slice now exists; see [current implementation handoff](../TEMPORARY_COVERAGE_HANDOFF.md). The preparation status below is preserved as historical context.

Prepared November 14, 2026. Local proposal, not a production feature or a team-approved contract. Read the shared `PROJECT_CONTEXT.md` and `docs/planning/` alongside this package.

## Recommendation

Build one reliable handoff to a known friend or family member: select existing everyday tasks, review the information needed, invite one named helper, obtain explicit acceptance, show current instructions, record outcomes, and return unresolved work to a named coordinator. Keep acceptance, arrival, task outcomes, and access expiry distinct.

The user confirmed **known helper, everyday non-medication tasks first**, with medication integration later. No fixed deadline or additional priority scenario was specified. New friends still need verified identity and recipient-specific permission; familiarity is not authorization.

## Read this package

1. [Evidence and decisions](01-discovery.md): actual repository state, people, research, alternatives, unknowns.
2. [Workflow and handoff](02-workflow.md): responsibility, transitions, edge cases, field ownership and access.
3. [Screens](03-screens.md): low-fidelity mobile wireframes, representative copy and accessibility.
4. [Integration and build preparation](04-integration.md): proposed contracts, AJ compatibility gaps, authorization, sequencing and acceptance tests.
5. [Synthetic scenarios](fixtures.json): deterministic examples for future adapters and tests; not a runtime API schema.

## Scope and status

This package is preparation only. It does not add app routes, dependencies, a permissions implementation, a database migration, or invitation delivery. Text wireframes are deliberately sufficient to review the journey before UI implementation. No prototype is represented as a working shared service.

The intended feature branch is `codex/temporary-coverage`, based on `8a454de`. Repository inspection used fetched remote refs; no teammate branch was merged. Team assignments come from the user's current instructions: AJ works on calendar/delegation, Caleb on people/roles; Wyatt's section is unknown. Contract questions below are proposals to take to the team, not assignments or messages sent to them.

## Preparation exit and implementation entry

The proposal is ready for review, not validated with families. Before implementing the connected slice, settle four contracts: (1) unavailable original assignments and atomic replacement with AJ; (2) invite identity, issuer authority and scoped grants with Caleb; (3) maintained instruction ownership and freshness; (4) follow-up ownership and in-app event handling. No teammate response is assumed.

The next authorized build should start with a labeled synthetic adapter and the acceptance/gap journey. Replace it with server-authorized persistence before claiming access control or a two-person shared flow. See the ordered build steps and adversarial checks in the integration document.

Full implementation is intentionally stopped here as requested. Nothing in this package authorizes production deployment, live care data, paid resources, real messages, merging or pushing.

## Local delivery and checks

Saved in the managed worktree `C:/Users/erosb/.codex/worktrees/temporary-coverage-prep/handsin-repo`, on `codex/temporary-coverage`. The original checkout remains clean on its original `main` revision. All six added files are local and uncommitted; nothing was pushed.

Verification passed: JSON parsing, unique fixture IDs, recipient/instruction/task references, instruction versions, task/access intervals, scenario references, all five local document links, paired Markdown fences and trailing-whitespace checks. Fixtures cover two recipients, three tasks and ten scenarios. These checks verify preparation consistency, not implemented behavior, access security or usability. No app code changed, so no application build/test was needed or claimed.
