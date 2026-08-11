# Recipe Search & Meal Planner Implementation Plan

Status: Approved

## Approved specification

- Specification: `SPEC.md`, Status: Approved, approved 2026-08-09 by bmi.machado@gmail.com
- Version or commit: `fcc80b2`, the initial commit that recorded the approved `SPEC.md`

## Architecture and constraints

### Shape

A single static client-side application. No backend of ours (spec non-goal). TheMealDB is the only external service. `localStorage` is the only persistence.

### Selected stack

Smallest stack that satisfies the approved spec, mapped to `.ai-engineering/.bootstrap/06-tools/01-typescript-web-profile.md`.

| Concern                | Choice                                            | Why this and not less                                                                                                                            |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language               | TypeScript, `strict`                              | Mandated by the tool profile                                                                                                                     |
| Build/dev              | Vite                                              | Fast local feedback, static output, no config sprawl                                                                                             |
| UI                     | React                                             | The spec requires an accessible modal, list state, and responsive views; hand-rolled DOM for this is more code and more defect surface, not less |
| Boundary validation    | Zod                                               | Spec R3.7 and the architecture rule "validate data at system boundaries" apply to both the API response and `localStorage`                       |
| Unit/integration tests | Vitest                                            | Profile default, shares Vite config                                                                                                              |
| Browser tests          | Playwright                                        | Required for the journey and dual-viewport criteria (AC14)                                                                                       |
| Routing                | Native History API behind a small internal module | Only two views plus a modal. A router dependency is not yet earned; revisit if view count grows                                                  |
| Styling                | Plain CSS with custom properties                  | No design system decided (spec O3); avoids a dependency that would be hard to remove                                                             |

Deliberately **not** adopted yet: state-management library, component library, CSS framework, HTTP client. Each would need a named problem first.

### Module boundaries

```text
src/api/       TheMealDB client + Zod response schemas   → depends on: nothing internal
src/domain/    pure logic: ingredient extraction,        → depends on: nothing
               grouping, alphabetical ordering
src/storage/   localStorage adapter + schema validation  → depends on: domain
src/ui/        views, components, modal                  → depends on: api, domain, storage
```

Rules, to be enforced mechanically rather than by review:

- `domain/` imports nothing from `api/`, `storage/`, or `ui/`. It is pure and fully unit-testable.
- No cyclic dependencies (madge, CI).
- Every value crossing a boundary — API response, `localStorage` read — is parsed through a schema. Unparsed third-party data never reaches `ui/`.
- Recipe text renders as text nodes only. No `dangerouslySetInnerHTML` anywhere; enforced by lint rule, not by convention.

### Constraints carried from the spec

- No personal data collected, stored, or transmitted by us. No cookies, no analytics, no third-party scripts beyond TheMealDB image and API hosts.
- Responsive from the first UI slice, not retrofitted (AC13).
- The app must degrade visibly on API failure, never silently (AC3).

## Engineering harness

Adoption follows the profile's order. Gate owner is the human accountable for the repository; agents may not weaken or skip a gate.

### Local feedback

- TypeScript in watch mode; editor diagnostics.
- `npm run dev` for the app; `npm run test` for focused unit tests.
- Target: type and unit feedback in seconds.

### Pre-commit

Cheap and blocking. Must stay fast enough not to become a waiting ritual.

- Prettier format check on staged files
- ESLint on staged files
- Gitleaks secret scan

### Pre-push

- Full type-check
- Full unit/integration test run
- Production build

### CI (authoritative)

Runs on every pull request and on `main`, from a clean checkout.

| Check                                           | Blocking               | Adoption step |
| ----------------------------------------------- | ---------------------- | ------------- |
| Type-check, lint, format                        | yes                    | 1             |
| Unit/integration tests (Vitest)                 | yes                    | 1             |
| Gitleaks                                        | yes                    | 1             |
| Reproducible build                              | yes                    | 2             |
| Playwright journeys, mobile + desktop viewports | yes                    | 2             |
| Preview deployment                              | yes                    | 2             |
| SCA — `npm audit` + OSV-Scanner                 | yes, high/critical     | 3             |
| SAST — CodeQL or Semgrep                        | yes                    | 3             |
| Dependency-cycle check — madge                  | yes                    | 4             |
| Duplication — jscpd                             | warn first, then block | 4             |
| Automated accessibility checks in Playwright    | yes                    | 4             |
| Mutation testing — Stryker, changed files       | warn only              | 5             |
| Bundle-size budget                              | warn first, then block | 4             |

Steps 1–2 landed in S0. **Step 3 was pulled forward to 2026-08-10**, when automatic release on merge made shipping without dependency and code analysis a condition the threat model already declared unacceptable. Step 4 completed at S6, together with the bundle-size budget, which was moved here from step 5 because it is cheap and measured rather than estimated. Step 5 — mutation testing — is unscheduled: the precondition is met, and adopting it is now a cost decision rather than a sequencing one.

### Post-deploy

Constrained by the spec's no-analytics, no-third-party position.

- Host-level availability and error-rate metrics only, from whatever hosting is chosen (P2).
- A manual post-deploy smoke check of the three journeys until real usage justifies more.
- Client-side error reporting (Sentry or equivalent) is **not** adopted: it is a new external service and data processor, and adopting it silently would violate the spec's privacy constraint. Raised as P3.

## Vertical slices

Every slice carries an explicit `**Status**:` line. The governance guard reads
it to decide which slices have shipped, so a slice without one is treated as not
shipped rather than silently assumed complete.

Cross-cutting definition of done for every slice below: acceptance criteria demonstrated with evidence, mandatory gates green, responsive at 375px and desktop, keyboard operable, diff reviewed, docs updated, `main` deployable.

### S0 — Engineering harness

- **Status**: complete, 2026-08-10 (PR #1).
- **Outcome**: repository, toolchain, and gates operational; `main` protected and deployable; control docs exist.
- **Mapped AC**: none directly; enables AC14.
- **Scope**: `git init` and initial commit; Vite + React + TS strict scaffold; ESLint, Prettier, Vitest, Playwright, Gitleaks; pre-commit and pre-push hooks; GitHub Actions CI covering adoption steps 1–2; Vercel static-build configuration; `docs/quality/gates.md`, `docs/security/threat-model.md`, `docs/privacy/assessment.md`; ADRs for stack and boundaries; bootstrap rule statuses recorded as adopted / deferred / not-applicable.
- **Dependencies**: none remaining. Preview deployment additionally requires the Vercel/GitHub connection step you perform.
- **Evidence**: clean checkout passes every step-1 and step-2 gate; a deliberately introduced type error, lint error, and planted fake secret each fail the correct gate.
- **Stop condition**: any gate that cannot be made low-noise and actionable — stop and report rather than weakening it.
- **Parallelization**: none. Single agent.

### S1 — Search and results grid (first vertical slice)

- **Status**: complete, 2026-08-11 (PR #5).
- **Outcome**: a user searches and sees results, with all failure states handled, end to end through api → domain → ui, deployed to a preview.
- **Mapped AC**: AC1, AC2, AC3.
- **Scope**: `api/` client for `search.php` with Zod schema; loading, empty (`{"meals": null}`), and error states with working retry; responsive results grid showing thumbnail, title, category, area.
- **Dependencies**: S0.
- **Evidence**: unit tests for schema parsing including the null-meals case; Playwright test for search → grid at both viewports; error state demonstrated with the network stubbed to fail; preview URL.
- **Stop condition**: TheMealDB response shape differs from the spec's assumption — stop and report before coding around it.
- **Parallelization**: none. Single agent.

### S2 — Recipe detail modal

- **Status**: complete, 2026-08-11 (PR #6).
- **Outcome**: clicking a result opens an accessible modal with full recipe detail.
- **Mapped AC**: AC4, AC5.
- **Scope**: ingredient/measure extraction in `domain/` discarding empty pairs; modal with focus trap, Escape to close, focus restoration; conditional YouTube and source links with `rel="noopener noreferrer"`; instructions rendered as text.
- **Dependencies**: S1.
- **Evidence**: unit tests for extraction across recipes with 3, 9, and 20 filled slots plus whitespace-only measures; keyboard-only Playwright test. The automated a11y check landed at S6 with the other accessibility assertions (`docs/quality/gates.md`); this slice asserted keyboard, focus-trap, and landmark behaviour directly instead.
- **Stop condition**: focus management cannot satisfy AC5 with the chosen approach.
- **Parallelization**: none.

### S3 — Shopping list: add, persist, view

- **Status**: complete, 2026-08-11 (PR #7).
- **Outcome**: ingredients from a recipe reach a persistent, grouped, alphabetically ordered list reachable from anywhere.
- **Mapped AC**: AC6, AC7, AC8, AC9, AC10.
- **Scope**: "add to my shopping list" button; `storage/` adapter with Zod validation and safe recovery from malformed or foreign data; write-failure handling for private-browsing modes; grouping by normalized ingredient name with measures listed verbatim; "view my shopping list" control present in every view including while the modal is open.
- **Dependencies**: S2.
- **Evidence**: unit tests for grouping, normalization, ordering, malformed-JSON recovery, and quota/write failure; Playwright test covering add → view → reload persistence.
- **Stop condition**: none expected.
- **Parallelization**: none.

### S4 — Shopping list editing

- **Status**: complete, 2026-08-11 (PR #7).
- **Outcome**: the list is editable, not append-only.
- **Mapped AC**: AC12.
- **Scope**: remove a single ingredient entry; clear the whole list behind a confirmation; both persist.
- **Dependencies**: S3.
- **Evidence**: unit tests for removal and clear; Playwright test asserting persistence after reload.
- **Parallelization**: **independent of S5** once S3 lands. Touches `storage/` and the shopping-list view only.

### S5 — Surprise me

- **Status**: complete, 2026-08-11 (PR #8).
- **Outcome**: a random recipe opens in the same modal from any view.
- **Mapped AC**: AC11.
- **Scope**: `random.php` client method and schema; "surprise me" navigation control; reuses the S2 modal unchanged.
- **Dependencies**: S2.
- **Evidence**: unit test for the random-response schema; Playwright test for surprise me → modal → add to list, from both the search and shopping-list views.
- **Parallelization**: **independent of S4**. Touches `api/` and navigation only.

### S6 — Hardening and advanced gates

- **Status**: complete, 2026-08-11 (PR #9).
- **Outcome**: the full gate profile is in force and the app is verified across the required matrix.
- **Mapped AC**: AC13, AC14.
- **Scope**: adoption step 4 — jscpd, automated a11y, bundle-size budget. madge is recorded as `not-applicable`: `import/no-cycle` already blocks cycles at commit and in CI, and a second full-graph checker adds a dependency without adding a control. Step 5 (Stryker, coverage thresholds) is unscheduled — see the gate register. SCA and SAST landed on 2026-08-10; complete dual-viewport journey matrix; resolve any accumulated warn-level findings.
- **Dependencies**: S4, S5.
- **Stop condition**: a new blocking gate produces noise rather than actionable findings — report before making it mandatory.

### S7 — Production readiness

- **Status**: complete, 2026-08-11 (PR #10).
- **Outcome**: the app is fit to serve real users.
- **Scope**: production deployment to Vercel; rollback via Vercel's previous-deployment promotion; post-deploy smoke check of the three journeys. Obtaining a supported TheMealDB key is **no longer in scope** — the human accepted the test-key risk on 2026-08-10 (spec O1).
- **Dependencies**: none remaining. Production now releases automatically on merge, so S7 is a verification and hardening slice rather than a gate to pass through.

### S8 — Browse by category

- **Status**: complete, 2026-08-11 (PR #11).
- **Outcome**: a user who has not searched has somewhere to start, and can reach a full recipe without typing.
- **Mapped AC**: AC15, added by spec amendment A1.
- **Scope**: `categories.php` and `filter.php` clients with their own schemas; a category browser occupying the idle search view; a `lookup.php` follow-up because filter results are partial; a return path from a search back to the categories; the shared `RecipeCard` extracted so the two grids cannot drift.
- **Dependencies**: S1 for the grid, S2 for the modal.
- **Evidence**: unit tests for the three new endpoints and both new domain mappings; component tests for every browse state including a failed lookup; ten browser tests at both viewports; a Playwright fixture that fails any spec reaching the live API, probed both ways.
- **Stop condition**: `filter.php` turning out to carry full meals after all, which would make the lookup dead weight — report rather than keep it.
- **Parallelization**: none. Single agent.

## First vertical slice

**S1 — Search and results grid**, immediately after S0. It exercises every architectural layer, both external boundaries relevant at that point, all three UI states, the responsive requirement, and the full deploy path — while remaining small enough to review in one sitting.

## Fleet candidates

Not yet. Against `.ai-engineering/.bootstrap/AGENTS.md` Phase 4:

| Condition                                                         | Status                                              |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| Product direction and plan approved                               | yes — spec 2026-08-09, plan 2026-08-09              |
| Two independent bounded tasks                                     | **not yet** — S0 through S3 are strictly sequential |
| Acceptance criteria, scope, verification, stop condition per task | yes, defined above                                  |
| Explicit ownership boundaries                                     | yes, module boundaries above                        |
| Isolated worktrees available                                      | yes, once S0 initializes git                        |
| Gates reliably reject non-compliant changes                       | unproven until S0 evidence exists                   |
| Human review capacity                                             | your call                                           |

**Outcome: no fleet step was taken.** S4 and S5 were the only independent pair, and by the time S3 landed they were small enough that running them sequentially cost less than coordinating two workspaces. The whole plan was delivered by one lead agent with an independent reviewer per head.

## Risks and mitigations

| Risk                                                                        | Mitigation                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TheMealDB test key is rate-limited and unsupported for production (spec O1) | Risk accepted by the human on 2026-08-10. Throttling surfaces as the AC3 error state; there is no further mitigation, which is what accepting the risk means |
| TheMealDB availability or latency                                           | Visible error and retry states are acceptance criteria, not polish                                                                                           |
| Third-party recipe text rendered in our UI                                  | Text-only rendering, lint-enforced; `rel="noopener noreferrer"` on outbound links; covered in the threat model                                               |
| `localStorage` unavailable or full                                          | Write failures handled explicitly in S3; app stays usable without persistence                                                                                |
| Measure strings are free text and inconsistent                              | Spec forbids unit arithmetic; grouping is by name only, measures verbatim                                                                                    |
| Full gate profile slows the first slice                                     | Adoption is staged: steps 1–2 at S0, step 3 pulled forward to 2026-08-10, step 4 at S6. Step 5 is unscheduled — see the gate register                        |
| Gates become noise and get ignored                                          | Each slice has a stop condition requiring a report instead of a weakened gate                                                                                |

## Decisions resolved

- **P1 — Version control.** Resolved: `git init` in this directory, initial commit of the contract files, all subsequent work on short-lived branches into a protected `main`.
- **P2 — Hosting and deployment target** (spec O2). Resolved: Vercel, static output, per-PR preview deployments. Unblocks the S0 preview gate. Since 2026-08-10 the same integration also releases production automatically on merge.
- **P4 — Repository hosting.** Resolved: GitHub, with GitHub Actions as the authoritative CI layer and branch protection on `main`.

## Open decisions

- **P3 — Client-side error reporting.** Not adopted. Real users would normally justify it, but it adds an external service and data processor, which the spec's privacy constraint does not currently permit. Position: stay without it; rely on Vercel's availability and error metrics plus post-deploy smoke checks. Revisit only as an explicit spec revision.
- **Spec O1 — TheMealDB supported key.** Resolved 2026-08-10: the human accepted running production on the test key `1`. Nothing is blocked. Recorded in `SPEC.md` and `docs/security/threat-model.md`.

## Operational notes from resolved decisions

- Vercel project creation and the GitHub remote require account access I do not have. I will produce the configuration and workflow files; connecting the Vercel project to the repository and adding any deployment token as a GitHub secret is a step you perform. I will not create accounts, push to a remote, or deploy without explicit authorization.
- No secret is needed to build or run the app itself — TheMealDB key `1` is public. Deployment credentials are the only secrets in play, and they live in GitHub secrets, never in the repository.

## Approval

- Approved by: bmi.machado@gmail.com
- Approved on: 2026-08-09
