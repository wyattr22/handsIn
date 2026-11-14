# HandsIn

We're in this together :)

A shared care hub for families. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the full hackathon brief, scope, and judging rubric.

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

## Deploy to Vercel

1. Sign in to Vercel with GitHub and select **Add New → Project**.
2. Import `wyattr22/handsIn`. Allow the Vercel GitHub app access to this repository if prompted.
3. Use the detected **Next.js** preset and the repository root directory. No environment variables are required for this initial page.
4. Deploy. Copy the project's **production domain** from Settings → Domains for the demo link.
5. Keep this Vercel project connected to the GitHub repository, with `main` as the production branch. Every push to `main` updates the same production domain. Preview deployment URLs are specific to individual builds.

This initial version is a branded starting page. Care circles, medication tracking, AI calls, and other planned features have not been implemented yet. Add service credentials through Vercel environment variables as those integrations are built; never commit credentials.
