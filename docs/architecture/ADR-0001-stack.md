# ADR-0001: Vite + React + TypeScript for a static client application

- Status: Accepted
- Date: 2026-08-09
- Decision maker: human (plan approval), implemented at S0

## Context

`SPEC.md` requires a responsive, keyboard-accessible recipe search with a modal detail view and a persisted shopping list, targeting real users on mobile and desktop, with no backend of ours and no accounts.

## Decision

Build a static single-page application with Vite, React 19, and TypeScript 5 in `strict` mode. Test with Vitest and Testing Library for units, Playwright for browser journeys. Format with Prettier, lint with ESLint 9 using type-aware rules. Deploy static output to Vercel.

Deliberately not adopted: a router, a state-management library, a component library, a CSS framework, an HTTP client. Each would need a named problem first.

## Alternatives considered

- **No framework, plain TypeScript and DOM APIs.** Genuinely viable for a two-view app, and fewer dependencies. Rejected because the accessible modal, focus management, and list state are exactly the work a framework removes; hand-rolling them is more code and more defect surface, not less.
- **Next.js.** Rejected: server rendering, routing, and API routes solve problems this product does not have, and it invites a backend the spec rules out.
- **A router dependency.** Deferred. Two views and a modal do not earn it; the History API behind a small internal module covers the need. Revisit if the view count grows.

## Consequences

- Static output deploys anywhere; Vercel is replaceable without touching application code.
- React's runtime is the largest part of the bundle. Accepted; a bundle budget landed at S6 and blocks in CI.
- TypeScript is pinned to `^5.9` and ESLint to `^9` because `typescript-eslint` does not yet support TypeScript 7 and `eslint-plugin-import` does not yet support ESLint 10. Both pins are recorded in `docs/quality/gates.md` and are revisited when upstream support lands.
