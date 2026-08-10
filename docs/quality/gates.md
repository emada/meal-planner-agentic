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

Per-gate probe status is carried in the table itself, as `.ai-engineering/.bootstrap/templates/GATES.md` requires. Keeping it here rather than in prose is deliberate: the probe accounting drifted twice while it lived in a separate paragraph.

Failure action for every row: fix the cause. Never weaken, disable, or delete the gate. Exceptions follow the exception path at the end of this document.

| Gate                                | Tool                                                                                                                        | Blocks                                                                                                                                             | Negative probe → expected diagnostic                                                       | Last proven |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| Type safety                         | TypeScript 5 `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` | push, CI. The type-aware lint subset (`no-unsafe-*`, `no-floating-promises`) also blocks at commit, but `tsc` semantic errors surface only at push | `const broken: number = 'not a number'` → `error TS2322`                                   | 2026-08-09  |
| Lint                                | ESLint 9 flat config, type-aware `strictTypeChecked`                                                                        | commit, CI                                                                                                                                         | floating promise + `console.log` → 3 ESLint errors                                         | 2026-08-09  |
| Architecture boundaries             | `import/no-restricted-paths` zones                                                                                          | commit, CI                                                                                                                                         | `domain/` importing `api/` → `import/no-restricted-paths`                                  | 2026-08-09  |
| Dependency cycles                   | `import/no-cycle`                                                                                                           | commit, CI                                                                                                                                         | mutually importing modules → `Dependency cycle detected`                                   | 2026-08-10  |
| Format                              | Prettier                                                                                                                    | commit (auto-fixed and re-staged, not rejected), CI (blocking)                                                                                     | unformatted markdown → `prettier --check` fails                                            | 2026-08-09  |
| Secret scan, staged files           | secretlint                                                                                                                  | commit                                                                                                                                             | correctly shaped fake GitHub token → `[GITHUB_TOKEN]`, exit 1; commit rejected by the hook | 2026-08-09  |
| Content Security Policy exact-match | Playwright asserts the full directive string and the absence of `unsafe-inline`/`unsafe-eval`                               | CI                                                                                                                                                 | `'unsafe-inline'` added to `script-src` → assertion fails; passes again once reverted      | 2026-08-10  |
| Default-branch protection           | GitHub ruleset 20604945                                                                                                     | remote push                                                                                                                                        | direct push to `main` → `GH013: Repository rule violations found`                          | 2026-08-09  |
| Unit/integration tests              | Vitest + Testing Library                                                                                                    | push, CI                                                                                                                                           | **none recorded** — lands S6                                                               | —           |
| Submodule installation integrity    | Vitest asserts `.ai-engineering` stays Git mode `160000` with no vendored or product-owned contract copy                    | push, CI                                                                                                                                           | **none recorded** — added this slice, asserted but not yet disproven; lands S6             | —           |
| Secret scan, full history           | gitleaks (CI)                                                                                                               | CI                                                                                                                                                 | **none recorded** — lands S6                                                               | —           |
| Reproducible build                  | `tsc --noEmit` + `vite build` at pre-push; additionally `npm ci` from a clean checkout in CI                                | push, CI                                                                                                                                           | **none recorded** — lands S6                                                               | —           |
| Browser journeys, mobile + desktop  | Playwright, `desktop-chromium` and `mobile-chromium`                                                                        | CI                                                                                                                                                 | **none recorded** — lands S6                                                               | —           |
| No console errors on load           | Playwright assertion                                                                                                        | CI                                                                                                                                                 | **none recorded** — lands S6                                                               | —           |
| Preview deployment                  | Vercel git integration, `Vercel` status context                                                                             | CI (required context on `main`)                                                                                                                    | **none recorded** — lands S6                                                               | —           |

**Eight of fifteen mandatory gates are proven; seven are not.** The unproven seven are configured and green but have never demonstrated rejection, which is stated here rather than presented as verified. They land in S6. The pre-push layer additionally has no probe showing it rejects a failing build or test — that is a layer, not a table row, and lands with them.

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

Deliberately not yet in force. Each has a named landing slice, per the adoption order in `.ai-engineering/.bootstrap/06-tools`.

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

## Verification evidence

A gate is not adopted because it is configured. Per-gate probes and their `Last proven` dates are in the mandatory-gate table above; this section records the detail that does not fit a table cell.

| Probe                                                 | Result                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `const broken: number = 'not a number'`               | `error TS2322` — type gate rejects                                            |
| Floating promise, empty async function, `console.log` | 3 ESLint errors — lint gate rejects                                           |
| `src/domain/` importing from `src/api/`               | `import/no-restricted-paths` — boundary gate rejects                          |
| Mutually importing modules in `src/domain/`           | `import/no-cycle` — cycle gate rejects                                        |
| Correctly formatted fake GitHub token                 | `[GITHUB_TOKEN]`, exit 1 — secret gate rejects                                |
| Committing that token for real                        | `husky - pre-commit script failed (code 1)`, no commit created                |
| Unformatted markdown                                  | `prettier --check` fails the format gate                                      |
| Full suite on the clean tree                          | `npm run verify` passes; 10 Playwright tests pass across both viewports       |
| Direct push to `main` on the remote                   | `GH013: Repository rule violations found` — ruleset rejects                   |
| `'unsafe-inline'` added to `script-src`               | CSP assertion fails on the exact-match comparison; passes again once reverted |

Full gate sequence re-run on 2026-08-10 at head `b3b4d6d`. The named head advances on any change to gate **behaviour** or to the artifact a gate inspects; the per-gate `Last proven` dates above are the authoritative account.

### Default-branch protection

Desired state is versioned at `.github/rulesets/protect-main.json` and applied through `.ai-engineering/.bootstrap/06-tools/github/apply-repository-ruleset.sh`. The committed JSON is not evidence; the live state was read back through the API.

- Ruleset id 20604945, name `SWEAI Builder: protect default branch`, enforcement `active`. Live name and versioned desired state agree, so `apply-repository-ruleset.sh` — which selects by name — updates this ruleset rather than creating a second one. Verified on 2026-08-10 with `gh api repos/emada/meal-planner-agentic/rulesets`
- Effective rules on `refs/heads/main`: `deletion`, `non_fast_forward`, `pull_request` (with `required_review_thread_resolution: true`), `required_status_checks`
- Approvals required: 0 — a solo owner must not be locked out of their own repository. GitHub does not block on approval, but it **does** block on an unresolved review thread. That is a real merge gate: a thread may be resolved only when its finding was corrected or disproven with evidence, never to clear a blocker (`EXECUTION.md`)
- Negative probe: pushing a commit straight to `main` was rejected with `GH013 ... Changes must be made through a pull request`
- <https://github.com/emada/meal-planner-agentic/rules/20604945>

**Repository visibility changed to public to obtain this.** GitHub Free returns HTTP 403 for both rulesets and classic branch protection on private repositories. The alternatives were paying for GitHub Pro or leaving `main` unprotected; the human chose public. Verified before publishing: no secrets in the working tree or in the two commits of history. Nothing in this repository is confidential — the TheMealDB key is public by design and deployment credentials live in GitHub secrets, never in the tree.

### Required status checks

Contexts were read from the first real run on pull request #1 rather than guessed, then added to the versioned JSON and reapplied to the same named ruleset. Live state confirmed through the API:

```text
rule_types: deletion, non_fast_forward, pull_request, required_status_checks
required_status_contexts:
  Types, lint, format, unit tests
  Secret scan
  Reproducible build
  Browser journeys (mobile + desktop)
  Vercel
```

`strict_required_status_checks_policy` is on, so a branch must be up to date with `main` before merging — two pull requests that pass in isolation cannot merge into a broken combination.

`Vercel Preview Comments` is deliberately **not** required. It reports that a bot posted a comment, not that anything built or passed; requiring it would let a cosmetic integration change block merges.

**AC13 is not yet exercised.** The horizontal-overflow assertion in `e2e/smoke.spec.ts` cannot currently fail: the shell renders a heading and an empty `<main>`, so overflow is impossible. It is a valid S0 smoke test and a valid regression guard once there is layout, but AC13 evidence begins at S1, when a real results grid renders. Recorded so the green tick is not mistaken for responsive-layout proof.

`SWEAI Review / Claude` is **not yet** a required context. The semantic review is mandatory by contract and runs on every head, but it is published by the lead agent rather than by an independent workflow, so requiring it would mean the agent under review controls its own merge gate. It becomes a required context when it is emitted by CI rather than by the implementer. Until then the human merge step carries that residual risk, which is recorded here rather than left implicit.

### Vercel deployment

- Git integration was already connected by the human; verified read-only. No project or integration was duplicated.
- Preview for pull request #1: `● Ready` in 12 s. The preview URL returns HTTP 302 to Vercel SSO because Deployment Protection is enabled on previews — a security default, not a failure.
- The earlier production deployment failed (`● Error`, 2 s) with `npm error code EUSAGE — can only install with an existing package-lock.json`. Root cause: it built `main` at `fcc80b2`, which held only the operating contract, with no `package.json` and no lockfile. Not a configuration defect; the same configuration builds the preview successfully. It resolves when an application-bearing `main` is merged.
- Agents have no path to production. `vercel --prod` and deployment promotion are prohibited by `EXECUTION.md`; production may occur only as a consequence of a human-approved merge.

### Two gates were silently passing and were fixed

Both would have looked configured and reported nothing:

1. **`import/no-cycle` never fired.** `eslint-plugin-import` could not parse imported `.ts` files, so it could not build the dependency graph and passed everything. Fixed by adding `settings['import/parsers']` mapping `@typescript-eslint/parser` to `.ts`/`.tsx`, and installing that parser as a direct dependency. Verified failing-then-passing against a real cycle. **Do not remove that setting** — the rule reverts to silently passing, with no error to indicate it.
2. **secretlint appeared to miss real credentials.** It did not: the first probe tokens were malformed (wrong length for a GitHub PAT, and AWS's documented `EXAMPLE` key is intentionally allow-listed). With correctly shaped fakes the rule fires. Confirmed coverage includes GitHub, Vercel, AWS, GCP, Slack, npm, Stripe, private keys, and database connection strings.

Known local gap: secretlint's preset does not detect every credential shape, and it scans staged files rather than history. Gitleaks in CI covers full history and a broader rule set. Treat CI as authoritative for secrets.

## Exception path

An exception requires: the rule, the reason, the reviewer, an expiry date where applicable, and supporting evidence — recorded in the pull request and in this file. Inline `eslint-disable` and `@ts-expect-error` need a comment naming the reason. Unexplained suppressions are review failures.
