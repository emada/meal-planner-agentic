# Threat model

Scope: the static client application defined in `SPEC.md`. Last reviewed at S0 (2026-08-09). Review again when a new external service, any server-side component, or any form of user-supplied content is introduced.

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

| #   | Threat                                                                                   | Likelihood | Impact | Control                                                                                                     | Status                                                                |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| T1  | Injection via third-party recipe content — TheMealDB text rendered as markup             | Low        | High   | React text nodes only; `react/no-danger` lint gate; CSP blocks inline script                                | Adopted (S0)                                                          |
| T2  | Malicious or hijacked outbound link (`strSource`, `strYoutube`) reaching `window.opener` | Low        | Medium | `rel="noopener noreferrer"`, enforced by `react/jsx-no-target-blank` with `allowReferrer: false`            | Adopted (S0); exercised from S2                                       |
| T3  | Supply-chain compromise of an npm dependency                                             | Medium     | High   | Lockfile plus `npm ci` everywhere; minimal dependency set; SCA and SAST land in S6                          | Partial — SCA/SAST deferred to S6                                     |
| T4  | Secret committed to the repository                                                       | Low        | High   | secretlint pre-commit on staged files; gitleaks over full history in CI                                     | Adopted (S0)                                                          |
| T5  | Corrupt, oversized, or attacker-planted `localStorage` content crashing the app          | Medium     | Low    | Schema validation on read, safe recovery, write-failure handling                                            | Planned — S3 (AC10)                                                   |
| T6  | Malformed or hostile API response shape                                                  | Medium     | Medium | Zod parsing at the `api/` boundary; unparsed data never reaches `ui/`                                       | Planned — S1                                                          |
| T7  | TheMealDB unavailable, throttled, or slow                                                | High       | Low    | Visible error state with retry; treated as an acceptance criterion, not polish                              | Planned — S1 (AC3)                                                    |
| T8  | Clickjacking of the deployed app                                                         | Low        | Low    | `X-Frame-Options: DENY` and `frame-ancestors 'none'` via `vercel.json`                                      | Adopted (S0)                                                          |
| T9  | MIME sniffing / referrer leakage                                                         | Low        | Low    | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`                       | Adopted (S0)                                                          |
| T10 | Compromise of the deployment pipeline                                                    | Low        | High   | Least-privilege `permissions: contents: read` in CI; deploy credentials in GitHub secrets; protected `main` | Partial — branch protection is a repository setting the human applies |

## Content Security Policy

Shipped in the built HTML so that `vite preview` and the CI browser tests exercise the same policy production serves:

```text
default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' https://www.themealdb.com data:;
connect-src 'self' https://www.themealdb.com;
font-src 'self'; form-action 'none'; frame-src 'none';
object-src 'none'; base-uri 'self'
```

No `unsafe-inline` and no `unsafe-eval` in either script or style. A Playwright assertion fails the build if the policy stops shipping.

## Residual risk accepted

- **TheMealDB test key (spec O1).** Key `1` carries no availability commitment and is documented for development use. Accepted for S1–S6; blocks S7 until decided. This is the human's risk to accept, and it is not yet accepted for production.
- **No SCA or SAST until S6.** Dependency and code-analysis gaps exist during S1–S5. Mitigated by a small, well-known dependency set and a lockfile. Not acceptable to carry into production.
- **No runtime error visibility.** No client-side error reporting is adopted; see `docs/architecture/ADR-0003-no-client-error-reporting.md`. Production issues surface through Vercel metrics and manual smoke checks only.

## Out of scope

Authentication, authorization, session management, server-side input validation, rate limiting, and data-at-rest encryption — none of these exist in this architecture. If any is introduced, this model is void and must be rewritten before that change merges.
