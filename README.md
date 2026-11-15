# HandsIn

We're in this together :)

## Shared pitch preparation

Teammates and their AIs: start with the [HandsIn pitch workspace](docs/pitch/README.md) for verified competition rules, source PDFs, product evidence, proposed narrative, demo/rehearsal guidance, and open decisions. This is a collaborative preparation packet, not a finalized pitch or a claim that all planned features are complete.

A shared care hub for families. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the full hackathon brief, scope, and judging rubric.

**Live app:** [handsin-six.vercel.app](https://handsin-six.vercel.app)

## Approved research and planning

Start with the [HandsIn planning packet](docs/planning/README.md), approved for publication on November 14, 2026:

- [Product definition and feature catalog](docs/planning/01_PRODUCT_DEFINITION.md)
- [Elder care and family research](docs/planning/02_RESEARCH.md)
- [Architecture and shared contracts](docs/planning/03_ARCHITECTURE.md)
- [Build packages and integration plan](docs/planning/04_BUILD_PLAN.md)

The first market is the United States. All work remains unassigned. This is a documentation handoff; implementation has not been authorized under the revised plan. Teammates and their AIs should read the current-context notice in `PROJECT_CONTEXT.md` and the planning packet before starting any separately authorized work.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run typecheck
npm run build
```

## Deployment

HandsIn is deployed on Vercel at [handsin-six.vercel.app](https://handsin-six.vercel.app).

The Vercel project is connected to this GitHub repository. Pushes to `main` update the production deployment, while pull requests and other branches can receive their own preview deployments.

This initial version is a branded starting page. Care circles, medication tracking, AI calls, and other planned features have not been implemented yet. Add service credentials through Vercel environment variables as those integrations are built; never commit credentials.
