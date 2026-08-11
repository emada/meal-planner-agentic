# Recipe Search & Meal Planner

Search recipes from [TheMealDB](https://www.themealdb.com) and build a shopping list that lives in your browser. No account, no backend, no tracking.

Status: **complete.** Every acceptance criterion in [`SPEC.md`](SPEC.md) is implemented and live at <https://meal-planner-agentic.vercel.app>.

Browse the categories, or search by name. Open a recipe for its ingredients and instructions, add them to a shopping list that survives a browser restart, edit that list, or let "surprise me" pick for you.

## Requirements

- Node.js 20 or newer (developed on 24)

## Getting started

```bash
npm ci        # install exactly what the lockfile specifies
npm run dev   # http://localhost:5173
```

## Commands

| Command                     | What it does                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`               | Dev server with hot reload                                                 |
| `npm run build`             | Type-check, then produce the static bundle in `dist/`                      |
| `npm run preview`           | Serve the built bundle locally                                             |
| `npm run typecheck`         | TypeScript, no emit                                                        |
| `npm run lint`              | ESLint, type-aware                                                         |
| `npm run format`            | Apply Prettier                                                             |
| `npm run test`              | Unit and integration tests                                                 |
| `npm run test:coverage`     | Tests with a coverage report                                               |
| `npm run test:e2e`          | Playwright journeys at mobile and desktop viewports                        |
| `npm run scan:secrets`      | secretlint over the repository                                             |
| `npm run check:bundle`      | gzipped bundle size against its budget                                     |
| `npm run check:duplication` | jscpd over non-test `src/`                                                 |
| `npm run verify`            | The local gate sequence, in one command — stops at the first failure       |
| `npm run smoke:prod`        | The production smoke check against the live site (`SMOKE_URL` to retarget) |

`verify` chains types, lint, format, unit tests with coverage, secret scan, build, bundle budget, duplication, and browser journeys — every gate the project declares. It is a convenience, not evidence: it short-circuits, so it reports one failure and hides the rest, and it cannot reach the gates that live on the remote. To produce evidence, run the generator described in [docs/quality/gates.md](docs/quality/gates.md) — it runs every declared gate and stamps the result with the commit it describes.

First Playwright run needs browsers: `npx playwright install chromium`.

## How this project is governed

This repository follows a goal-first operating contract. The documents are the contract, in this order:

| Document                       | Role                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`GOAL.md`](GOAL.md)           | The original brief, preserved verbatim                                                                                                                                      |
| [`SPEC.md`](SPEC.md)           | The product contract — approved                                                                                                                                             |
| [`PLAN.md`](PLAN.md)           | The implementation plan, slices S0–S9. S0–S7 approved 2026-08-09; S8 and S9 appended afterwards by the agent and counter-signed 2026-08-11, S8 under `SPEC.md` amendment A1 |
| [`EXECUTION.md`](EXECUTION.md) | The autonomy envelope and permissions — approved                                                                                                                            |
| `.ai-engineering/`             | SWEAI Builder, pinned as a Git submodule                                                                                                                                    |

`.ai-engineering/` is a pinned submodule of the private `emada/sweai-builder` repository. A plain `git clone` gives a complete, buildable application checkout. Initializing the submodule with `git submodule update --init --recursive` additionally requires read access to that private dependency; without access the application still builds, tests, and runs.

Supporting records:

- [`docs/quality/gates.md`](docs/quality/gates.md) — what blocks a merge, at which layer, and what is deliberately deferred
- [`docs/quality/bootstrap-adoption.md`](docs/quality/bootstrap-adoption.md) — every bootstrap rule marked adopted, deferred, or not-applicable
- [`docs/engineering/learning-log.md`](docs/engineering/learning-log.md) — what went wrong building this, and what would have caught it earlier
- [`docs/security/threat-model.md`](docs/security/threat-model.md) — assets, threats, controls, residual risk
- [`docs/privacy/assessment.md`](docs/privacy/assessment.md) — the data position (short: we collect nothing)
- [`docs/architecture/`](docs/architecture/) — ADRs for material decisions

## Architecture

Static SPA. Four modules, one permitted direction of dependency, enforced by lint rather than by review:

```text
domain/   pure logic — no I/O, no React
api/      TheMealDB client + response schemas
storage/  localStorage adapter + validation   (may use domain)
ui/       views and components                (may use api, domain, storage)
```

Everything crossing a boundary is schema-parsed. See [ADR-0002](docs/architecture/ADR-0002-module-boundaries.md).

## Notes

The app calls TheMealDB with the public developer key `1`, as the brief specifies. That is a test key with no availability guarantee, and running production on it is a risk the owner accepted on 2026-08-10 (`SPEC.md` O1, `docs/security/threat-model.md`). When the service throttles or fails, the app says so and offers a retry — that is the whole mitigation.
