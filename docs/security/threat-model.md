# Threat model

Scope: the static client application defined in `SPEC.md`. Last reviewed at S0 on 2026-08-09, revised 2026-08-10 after semantic review. Review again when a new external service, any server-side component, or any form of user-supplied content is introduced.

## System shape

```text
Browser (our static app, served by Vercel)
  ├── fetch  ──> https://www.themealdb.com/api/json/v1/1/*   (public, no auth)
  ├── img    ──> https://www.themealdb.com/images/*
  └── localStorage (shopping list, this browser only)
```

There is no backend of ours, no database, no session, no authentication, and no user account.

## Assets

| Asset                                      | Value | Notes                                                              |
| ------------------------------------------ | ----- | ------------------------------------------------------------------ |
| The shopping list in `localStorage`        | Low   | Not personal data in any meaningful sense; never leaves the device |
| Application integrity (the code users run) | High  | Compromise here reaches every user                                 |
| Vercel deployment credentials              | High  | Stored as GitHub secrets, never in the repository                  |
| TheMealDB API key                          | None  | Key `1` is public and documented; nothing to protect               |

## Threats and controls

| #   | Threat                                                                                   | Likelihood | Impact | Control                                                                                                                                                                                                                  | Status                            |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| T1  | Injection via third-party recipe content — TheMealDB text rendered as markup             | Low        | High   | React text nodes only; `react/no-danger` lint gate; CSP blocks inline script                                                                                                                                             | Adopted (S0)                      |
| T2  | Malicious or hijacked outbound link (`strSource`, `strYoutube`) reaching `window.opener` | Low        | Medium | `rel="noopener noreferrer"`, enforced by `react/jsx-no-target-blank` with `allowReferrer: false`                                                                                                                         | Adopted (S0); exercised from S2   |
| T3  | Supply-chain compromise of an npm dependency                                             | Medium     | High   | Lockfile plus `npm ci` everywhere; minimal dependency set; SCA and SAST land in S6                                                                                                                                       | Partial — SCA/SAST deferred to S6 |
| T4  | Secret committed to the repository                                                       | Low        | High   | secretlint pre-commit on staged files; gitleaks over full history in CI                                                                                                                                                  | Adopted (S0)                      |
| T5  | Corrupt, oversized, or attacker-planted `localStorage` content crashing the app          | Medium     | Low    | Schema validation on read, safe recovery, write-failure handling                                                                                                                                                         | Planned — S3 (AC10)               |
| T6  | Malformed or hostile API response shape                                                  | Medium     | Medium | Zod parsing at the `api/` boundary; unparsed data never reaches `ui/`                                                                                                                                                    | Planned — S1                      |
| T7  | TheMealDB unavailable, throttled, or slow                                                | High       | Low    | Visible error state with retry; treated as an acceptance criterion, not polish                                                                                                                                           | Planned — S1 (AC3)                |
| T8  | Clickjacking of the deployed app                                                         | Low        | Low    | `X-Frame-Options: DENY` and `frame-ancestors 'none'` via `vercel.json`                                                                                                                                                   | Adopted (S0)                      |
| T9  | MIME sniffing / referrer leakage                                                         | Low        | Low    | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`                                                                                                                                    | Adopted (S0)                      |
| T10 | Compromise of the deployment pipeline                                                    | Low        | High   | Least-privilege `permissions: contents: read` in CI; deploy credentials in GitHub secrets; ruleset 20604945 active on `main` with 5 required contexts, proven with a `GH013` negative probe; no agent path to production | Adopted (S0)                      |

## Content Security Policy

Shipped in the built HTML so that `vite preview` and the CI browser tests exercise the same policy production serves:

```text
default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' https://www.themealdb.com data:;
connect-src 'self' https://www.themealdb.com;
font-src 'self'; form-action 'none'; frame-src 'none';
object-src 'none'; base-uri 'self'
```

No `unsafe-inline` and no `unsafe-eval` in either script or style. A Playwright assertion compares the served policy against this exact directive string and separately asserts that no `unsafe-*` keyword appears, so widening a directive fails the gate rather than passing a substring check. Proven on 2026-08-10: adding `'unsafe-inline'` to `script-src` failed the assertion, and reverting restored green.

## Residual risk accepted

- **TheMealDB test key (spec O1). Accepted by the human on 2026-08-10.** Key `1` is rate-limited, carries no availability commitment, and is documented for development rather than production. The application now serves real users on it. Consequences accepted: the recipe search can throttle or fail for reasons outside our control, and there is no supported channel to appeal to when it does. Mitigation is limited to degrading visibly — the AC3 error state with retry — which is a gate, not a fix. Revisit by obtaining a supported key; adding caching or a proxy would contradict the no-backend non-goal and requires a spec revision.
- **Production is released by an agent, with no human checkpoint (2026-08-10).** Merge to `main` is authorized for agents and deploys to production automatically. The gates that stand between a change and real users are the five required status contexts, the semantic-review `PASS` bound to the merged head, and thread resolution — all machine-checked, none human. The semantic reviewer is a subagent of the agent that writes the change: context is isolated, but no independent party evaluates the work. Accepted deliberately by the human, who retains rollback by promoting a previous Vercel deployment.
- **No SCA or SAST until S6.** Dependency and code-analysis gaps exist during S1–S5. Mitigated by a small, well-known dependency set and a lockfile. Not acceptable to carry into production.
- **No runtime error visibility.** No client-side error reporting is adopted; see `docs/architecture/ADR-0003-no-client-error-reporting.md`. Production issues surface through Vercel metrics and manual smoke checks only.

## Out of scope

Authentication, authorization, session management, server-side input validation, rate limiting, and data-at-rest encryption — none of these exist in this architecture. If any is introduced, this model is void and must be rewritten before that change merges.
