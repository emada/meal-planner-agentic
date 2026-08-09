# Quality gates

Owner: the human accountable for this repository (bmi.machado@gmail.com). Agents may not weaken, bypass, or silently disable any gate below. A gate that produces noise instead of actionable findings is reported, not disabled.

## Layer map

| Layer              | Checks                                                      | Command                                                       |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Development        | types, editor diagnostics, focused tests                    | `npm run typecheck`, `npm run test:watch`                     |
| Pre-commit         | format, lint, secret scan — staged files only               | `.husky/pre-commit` → `lint-staged`                           |
| Pre-push           | full type-check, full unit tests, production build          | `.husky/pre-push`                                             |
| CI (authoritative) | everything below, from a clean checkout                     | `.github/workflows/ci.yml`                                    |
| Post-deploy        | availability and error rate from Vercel; manual smoke check | see `docs/architecture/ADR-0003-no-client-error-reporting.md` |

`npm run verify` runs the full local sequence in one command.

## Mandatory gates in force (adoption steps 1–2)

| Gate                                            | Tool                                                                                                                        | Blocks                                 | Failure action                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Type safety                                     | TypeScript 5 `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` | commit (via type-aware lint), push, CI | fix the type; suppressions require a recorded exception |
| Lint                                            | ESLint 9 flat config, type-aware `strictTypeChecked`                                                                        | commit, CI                             | fix; no blanket disables                                |
| Format                                          | Prettier                                                                                                                    | commit, CI                             | `npm run format`                                        |
| Unit/integration tests                          | Vitest + Testing Library                                                                                                    | push, CI                               | fix the code or the test                                |
| Secret scan, staged files                       | secretlint                                                                                                                  | commit                                 | remove the secret and rotate it                         |
| Secret scan, full history                       | gitleaks (CI)                                                                                                               | CI                                     | remove and rotate; history rewrite if already pushed    |
| Reproducible build                              | `npm ci` + `tsc --noEmit` + `vite build`                                                                                    | push, CI                               | fix                                                     |
| Browser journeys, mobile + desktop              | Playwright, `desktop-chromium` and `mobile-chromium`                                                                        | CI                                     | fix                                                     |
| Content Security Policy present in built output | Playwright assertion                                                                                                        | CI                                     | fix the policy, never delete the assertion              |
| No console errors on load                       | Playwright assertion                                                                                                        | CI                                     | fix the cause                                           |

## Architectural rules enforced mechanically

From `PLAN.md`, encoded in `eslint.config.js` rather than left to review:

| Rule                                                                                                                                 | Encoded as                                              |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `domain/` imports nothing internal; `api/` imports nothing internal; `storage/` may import only `domain/`; only `ui/` imports across | `import/no-restricted-paths` zones                      |
| No cyclic dependencies                                                                                                               | `import/no-cycle`                                       |
| Recipe text is never interpreted as markup                                                                                           | `react/no-danger`                                       |
| Outbound third-party links do not leak the opener                                                                                    | `react/jsx-no-target-blank` with `allowReferrer: false` |
| Type-only imports stay type-only                                                                                                     | `@typescript-eslint/consistent-type-imports`            |

## Deferred gates

Deliberately not yet in force. Each has a named landing slice, per the adoption order in `bootstrap/06-tools`.

| Gate                               | Status                           | Lands in | Rationale                                                                                                              |
| ---------------------------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| SCA (`npm audit`, OSV-Scanner)     | deferred                         | S6       | Step 3. Dependency set is still changing during S1–S5                                                                  |
| SAST (CodeQL or Semgrep)           | deferred                         | S6       | Step 3. Little application code exists to analyse yet                                                                  |
| Duplication (jscpd)                | deferred                         | S6       | Step 4. Meaningless before there is code to duplicate                                                                  |
| Automated accessibility assertions | deferred                         | S6       | Step 4. Keyboard and landmark behaviour is asserted per slice in the meantime                                          |
| Mutation testing (Stryker)         | deferred, warn-only when adopted | S6       | Step 5. Expensive; only useful once the domain logic exists                                                            |
| Bundle-size budget                 | deferred                         | S6       | Step 5. No meaningful baseline yet                                                                                     |
| Coverage thresholds                | deferred                         | S6       | A threshold set against an app shell measures nothing. Coverage is reported from S0 and enforced once `domain/` exists |

## Substitutions from `PLAN.md`

Recorded because they differ from what the plan named:

- **secretlint at pre-commit, gitleaks in CI.** The plan named gitleaks at both layers. Gitleaks is a system binary and is not installed here; requiring it locally would make a fresh clone fail its own hook. secretlint installs from the lockfile, so `npm ci` is enough to get a working pre-commit gate. Gitleaks still runs in CI over full history, which is the authoritative layer. Net effect: stronger, not weaker.
- **`import/no-cycle` now, madge deferred.** The plan put cycle detection at step 4 via madge. The lint rule costs nothing and is already active, so cycles are blocked from S0. madge remains available in S6 if a full-graph check is wanted; if it adds nothing, record it as `not-applicable` then.
- **CSP shipped in the built HTML, not only in Vercel headers.** A header-only policy could not be tested locally. Injecting it at build time means `vite preview`, and therefore the CI browser tests, exercise the real policy. `vercel.json` carries only the directives a meta tag cannot express (`frame-ancestors`) plus the non-CSP security headers.

## Version pins forced by the ecosystem

- **TypeScript pinned to `^5.9`.** TypeScript 7 is released, but `typescript-eslint` supports `>=4.8.4 <6.1.0`. Forcing 7 would mean `--legacy-peer-deps` and unreliable type-aware linting. Revisit when `typescript-eslint` supports 7.
- **ESLint pinned to `^9`.** `eslint-plugin-import` does not yet support ESLint 10. Revisit when it does, or when a maintained fork replaces it.

## Verification evidence (S0, 2026-08-09)

A gate is not adopted because it is configured. Each was proven to reject a deliberately broken change:

| Probe                                                 | Result                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `const broken: number = 'not a number'`               | `error TS2322` — type gate rejects                                     |
| Floating promise, empty async function, `console.log` | 3 ESLint errors — lint gate rejects                                    |
| `src/domain/` importing from `src/api/`               | `import/no-restricted-paths` — boundary gate rejects                   |
| Mutually importing modules in `src/domain/`           | `import/no-cycle` — cycle gate rejects                                 |
| Correctly formatted fake GitHub token                 | `[GITHUB_TOKEN]`, exit 1 — secret gate rejects                         |
| Committing that token for real                        | `husky - pre-commit script failed (code 1)`, no commit created         |
| Unformatted markdown                                  | `prettier --check` fails the format gate                               |
| Full suite on the clean tree                          | `npm run verify` passes; 8 Playwright tests pass across both viewports |

### Two gates were silently passing and were fixed

Both would have looked configured and reported nothing:

1. **`import/no-cycle` never fired.** `eslint-plugin-import` could not parse imported `.ts` files, so it could not build the dependency graph and passed everything. Fixed by adding `settings['import/parsers']` mapping `@typescript-eslint/parser` to `.ts`/`.tsx`, and installing that parser as a direct dependency. Verified failing-then-passing against a real cycle. **Do not remove that setting** — the rule reverts to silently passing, with no error to indicate it.
2. **secretlint appeared to miss real credentials.** It did not: the first probe tokens were malformed (wrong length for a GitHub PAT, and AWS's documented `EXAMPLE` key is intentionally allow-listed). With correctly shaped fakes the rule fires. Confirmed coverage includes GitHub, Vercel, AWS, GCP, Slack, npm, Stripe, private keys, and database connection strings.

Known local gap: secretlint's preset does not detect every credential shape, and it scans staged files rather than history. Gitleaks in CI covers full history and a broader rule set. Treat CI as authoritative for secrets.

## Exception path

An exception requires: the rule, the reason, the reviewer, an expiry date where applicable, and supporting evidence — recorded in the pull request and in this file. Inline `eslint-disable` and `@ts-expect-error` need a comment naming the reason. Unexplained suppressions are review failures.
