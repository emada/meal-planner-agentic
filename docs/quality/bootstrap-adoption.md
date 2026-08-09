# Bootstrap rule adoption status

Required by `bootstrap/00-orientation/01-how-to-use.md`: every bootstrap rule records `adopted`, `deferred`, or `not-applicable`, with a short rationale. Reviewed at S0 (2026-08-09).

## 01 — Operating model

| Rule                                         | Status   | Rationale                                                                                      |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Human accountability for every merged change | Adopted  | Single accountable human; agents propose, never merge                                          |
| Bounded autonomy                             | Adopted  | Each slice in `PLAN.md` carries scope, acceptance criteria, verification, and a stop condition |
| Agent roles                                  | Adopted  | One lead agent through S0–S3; roles separate at the first fleet step                           |
| Human + agent fleet workflow                 | Deferred | Fleet readiness is not met yet; first candidate is S4 + S5 in parallel                         |

## 02 — Quality

| Rule               | Status  | Rationale                                                                                      |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| Policy as code     | Adopted | Types, lint, tests, boundaries, and CSP presence are executable checks, not review conventions |
| Layered gates      | Adopted | Development → pre-commit → pre-push → CI, mapped in `docs/quality/gates.md`                    |
| Definition of done | Adopted | Applied per slice; S0's evidence is recorded in this commit's pull request                     |

## 03 — Security and privacy

| Rule                     | Status  | Rationale                                                                                          |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------- |
| Security by design       | Adopted | Threat model written before feature code; CSP and security headers ship from S0                    |
| Privacy and GDPR/APPs    | Adopted | Assessment complete; the finding is that no personal data is processed by us                       |
| Secrets and supply chain | Partial | Secret scanning adopted at two layers from S0; SCA and SAST deferred to S6 with rationale recorded |

## 04 — Product

| Rule                                          | Status             | Rationale                                                                       |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| Engineering quality is not product-market fit | Adopted            | Gates and acceptance criteria kept separate from product hypotheses             |
| Experiments                                   | Not applicable yet | No product hypothesis under test; `docs/product/experiments/` starts at Phase 6 |

## 05 — Delivery and architecture

| Rule                    | Status  | Rationale                                                                                                                    |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Architecture boundaries | Adopted | Four modules, one-way dependencies, lint-enforced — ADR-0002                                                                 |
| Continuous delivery     | Partial | Branch-based flow, CI, and preview deploys configured. Branch protection on `main` is a repository setting the human applies |
| Observability and flow  | Partial | Host metrics and manual smoke checks only; client error reporting deliberately declined — ADR-0003                           |

## 06 — Tools

| Rule                   | Status                  | Rationale                                                                                                                  |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TypeScript web profile | Adopted in staged order | Steps 1–2 in force at S0; steps 3–5 land in S6. Two substitutions and two version pins recorded in `docs/quality/gates.md` |

## 07 — Project adoption

| Checklist section             | Status                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Project initialization        | Complete                                                                                                    |
| Before planning               | Complete — `SPEC.md` approved 2026-08-09                                                                    |
| Before writing the first code | Complete — `PLAN.md` approved 2026-08-09; personal data, analytics, and external-service decisions recorded |
| Before the first merge        | Complete for local and CI gates; branch protection and the Vercel connection are human steps                |
| Before increasing autonomy    | Not met — see the fleet readiness table in `PLAN.md`                                                        |
