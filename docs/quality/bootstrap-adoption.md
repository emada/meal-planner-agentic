# Bootstrap rule adoption status

Required by `.ai-engineering/.bootstrap/00-orientation/01-how-to-use.md`: every SWEAI Builder rule records `adopted`, `deferred`, or `not-applicable`, with a short rationale. Reviewed at S0 on 2026-08-09 and re-reviewed on 2026-08-10 against the rule set carried by the pinned submodule, which is larger than the one this record was first written against.

## 01 — Operating model

| Rule                                         | Status   | Rationale                                                                                      |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Human accountability for every merged change | Adopted  | Single accountable human; agents propose, never merge                                          |
| Bounded autonomy                             | Adopted  | Each slice in `PLAN.md` carries scope, acceptance criteria, verification, and a stop condition |
| Agent roles                                  | Adopted  | One lead agent through S0–S3; roles separate at the first fleet step                           |
| Human + agent fleet workflow                 | Deferred | Fleet readiness is not met yet; first candidate is S4 + S5 in parallel                         |
| Language policy                              | Adopted  | Every committed and published engineering artifact is English; conversation language is free   |

## 00 — Orientation

| Rule                    | Status  | Rationale                                                                                             |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| How to use              | Adopted | Goal-first order followed: `GOAL.md` → `SPEC.md` → `PLAN.md` → `EXECUTION.md`, each human-approved    |
| Bootstrap specification | Adopted | Artifacts created from `.ai-engineering/.bootstrap/templates/`, not hand-invented                     |
| Lifecycle distribution  | Adopted | SWEAI Builder is installed as a pinned submodule at `.ai-engineering`; see `EXECUTION.md` for the pin |

## 02 — Quality

| Rule                      | Status  | Rationale                                                                                                                                                           |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy as code            | Adopted | Types, lint, tests, boundaries, and CSP presence are executable checks, not review conventions                                                                      |
| Layered gates             | Adopted | Development → pre-commit → pre-push → CI, mapped in `docs/quality/gates.md`                                                                                         |
| Definition of done        | Adopted | Applied per slice; S0's evidence is recorded in this commit's pull request                                                                                          |
| Control effectiveness     | Partial | Eight of fifteen mandatory gates have a recorded negative probe; the other seven land in S6. Per-gate status and `Last proven` dates are in `docs/quality/gates.md` |
| Automated semantic review | Adopted | Mandatory independent reviewer at `.claude/agents/semantic-reviewer.md`; publishing authorized in `EXECUTION.md` on 2026-08-10                                      |

## 03 — Security and privacy

| Rule                       | Status  | Rationale                                                                                          |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Security by design         | Adopted | Threat model written before feature code; CSP and security headers ship from S0                    |
| Privacy and GDPR/APPs      | Adopted | Assessment complete; the finding is that no personal data is processed by us                       |
| Secrets and supply chain   | Partial | Secret scanning adopted at two layers from S0; SCA and SAST deferred to S6 with rationale recorded |
| Agent tool data handling   | Adopted | Agents touch no personal data; no secret value is printed, logged, or committed — `EXECUTION.md`   |
| External service readiness | Partial | GitHub and Vercel verified live; TheMealDB production key is spec O1, still open and blocking S7   |

## 04 — Product

| Rule                                          | Status             | Rationale                                                                       |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| Engineering quality is not product-market fit | Adopted            | Gates and acceptance criteria kept separate from product hypotheses             |
| Experiments                                   | Not applicable yet | No product hypothesis under test; `docs/product/experiments/` starts at Phase 6 |

## 05 — Delivery and architecture

| Rule                        | Status             | Rationale                                                                                                    |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Architecture boundaries     | Adopted            | Four modules, one-way dependencies, lint-enforced — ADR-0002                                                 |
| Continuous delivery         | Adopted            | Branch-based flow, CI, preview deploys, and an active ruleset on `main` proven with a `GH013` negative probe |
| Observability and flow      | Partial            | Host metrics and manual smoke checks only; client error reporting deliberately declined — ADR-0003           |
| Parallel agent architecture | Not applicable yet | Concurrency is 1 by `EXECUTION.md`; revisit at the S4 + S5 fleet-readiness decision                          |

## 06 — Tools

| Rule                              | Status                  | Rationale                                                                                                                  |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TypeScript web profile            | Adopted in staged order | Steps 1–2 in force at S0; steps 3–5 land in S6. Two substitutions and two version pins recorded in `docs/quality/gates.md` |
| High-velocity TypeScript monorepo | Not applicable          | Single-package application, not a monorepo                                                                                 |
| Tailwind CSS                      | Not applicable          | Plain CSS with custom properties; no design system adopted (spec O3)                                                       |
| Provider CLI preflight            | Adopted                 | Both authenticated identities verified read-only; Vercel CLI telemetry confirmed disabled on 2026-08-10                    |
| GitHub repository automation      | Adopted                 | `.github/rulesets/protect-main.json` generated from the profile template and applied with its script; live state verified  |
| Vercel automation                 | Adopted                 | Existing project and git integration verified read-only; no duplicate created; production reachable only by human merge    |

## 07 — Project adoption

| Checklist section             | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project initialization        | Partial — complete except recursive submodule initialization in clones and CI, deliberately not configured because `GITHUB_TOKEN` cannot fetch the private dependency; rationale in `EXECUTION.md`                                                                                                                                                                                                                                                                                         |
| Automatic preflight           | Partial — satisfied retrospectively. This project reached Phase 3 under a contract version that had no `EXECUTION.md`, so the operator-availability checkpoint ran after implementation began rather than before `GOAL.md` was read. The substance is covered: both CLI identities verified, Vercel telemetry disabled, plan and visibility governance recorded in `EXECUTION.md`                                                                                                          |
| Before planning               | Complete — `SPEC.md` approved 2026-08-09                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Before writing the first code | Complete — `PLAN.md` approved 2026-08-09; personal data, analytics, and external-service decisions recorded                                                                                                                                                                                                                                                                                                                                                                                |
| Before the first merge        | **Partial.** Local and CI gates green, ruleset active on `main`, Vercel git integration connected and verified. Two checklist items are unmet and knowingly carried into this merge: seven of fifteen mandatory gates have no negative probe (each named in `docs/quality/gates.md`, landing S6), and `SWEAI Review / Claude` is published as a commit status but is not a required context in the ruleset — rationale in `docs/quality/gates.md`. Both are the human's to accept at merge |
| Before increasing autonomy    | Not met — see the fleet readiness table in `PLAN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
