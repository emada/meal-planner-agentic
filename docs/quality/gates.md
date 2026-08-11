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

`npm run verify` chains the local sequence for convenience. To produce evidence, use the generator instead — it runs every gate rather than stopping at the first failure. See "Whether the gates passed is derived, not written" below.

## Mandatory gates in force (adoption steps 1–2)

Per-gate probe status is carried in the table itself, as `.ai-engineering/.bootstrap/templates/GATES.md` requires. Keeping it here rather than in prose is deliberate: the probe accounting drifted twice while it lived in a separate paragraph.

Failure action for every row: fix the cause. Never weaken, disable, or delete the gate. Exceptions follow the exception path at the end of this document.

| Gate                                | Tool                                                                                                                                                                                                   | Blocks                                                                                                                                             | Negative probe → expected diagnostic                                                                                                                                                                                        | Last proven |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Type safety                         | TypeScript 5 `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`                                                                            | push, CI. The type-aware lint subset (`no-unsafe-*`, `no-floating-promises`) also blocks at commit, but `tsc` semantic errors surface only at push | `const broken: number = 'not a number'` → `error TS2322`                                                                                                                                                                    | 2026-08-09  |
| Lint                                | ESLint 9 flat config, type-aware `strictTypeChecked`                                                                                                                                                   | commit, CI                                                                                                                                         | floating promise + `console.log` → 3 ESLint errors                                                                                                                                                                          | 2026-08-09  |
| Architecture boundaries             | `import/no-restricted-paths` zones                                                                                                                                                                     | commit, CI                                                                                                                                         | `domain/` importing `api/` → `import/no-restricted-paths`                                                                                                                                                                   | 2026-08-09  |
| Dependency cycles                   | `import/no-cycle`                                                                                                                                                                                      | commit, CI                                                                                                                                         | mutually importing modules → `Dependency cycle detected`                                                                                                                                                                    | 2026-08-10  |
| Format                              | Prettier                                                                                                                                                                                               | commit (auto-fixed and re-staged, not rejected), CI (blocking)                                                                                     | unformatted markdown → `prettier --check` fails                                                                                                                                                                             | 2026-08-09  |
| Secret scan, staged files           | secretlint                                                                                                                                                                                             | commit                                                                                                                                             | correctly shaped fake GitHub token → `[GITHUB_TOKEN]`, exit 1; commit rejected by the hook                                                                                                                                  | 2026-08-09  |
| Content Security Policy exact-match | Playwright asserts the full directive string and the absence of `unsafe-inline`/`unsafe-eval`                                                                                                          | CI                                                                                                                                                 | `'unsafe-inline'` added to `script-src` → assertion fails; passes again once reverted                                                                                                                                       | 2026-08-10  |
| Default-branch protection           | GitHub ruleset 20604945                                                                                                                                                                                | remote push                                                                                                                                        | direct push to `main` → `GH013: Repository rule violations found`                                                                                                                                                           | 2026-08-09  |
| Unit/integration tests              | Vitest + Testing Library                                                                                                                                                                               | push, CI                                                                                                                                           | `extractIngredients` stopped discarding empty slots → 7 domain tests failed                                                                                                                                                 | 2026-08-11  |
| Submodule installation integrity    | Vitest asserts `.ai-engineering` stays Git mode `160000` with no vendored or product-owned contract copy                                                                                               | push, CI                                                                                                                                           | `.ai-engineering` replaced with a symlink in a throwaway clone → `expected '120000' to be '160000'`                                                                                                                         | 2026-08-11  |
| Secret scan, full history           | gitleaks (CI)                                                                                                                                                                                          | CI                                                                                                                                                 | a `ghp_`-shaped token committed in a throwaway clone → `leaks found: 1`, exit 1; clean once reverted. **Run with a gitleaks 8.30.1 binary fetched for the probe and not kept; the `gitleaks-action@v2` wiring is unprobed** | 2026-08-11  |
| Reproducible build                  | `tsc --noEmit` + `vite build` at pre-push; additionally `npm ci` from a clean checkout in CI                                                                                                           | push, CI                                                                                                                                           | `const broken: number = 'not a number'` → `error TS2322`, build aborted before Vite ran                                                                                                                                     | 2026-08-11  |
| Browser journeys, mobile + desktop  | Playwright, `desktop-chromium` and `mobile-chromium`                                                                                                                                                   | CI                                                                                                                                                 | browse skipped its detail lookup and opened the modal on partial data → 6 journeys failed across both projects; `e2e/browse.spec.ts` passed in full once reverted                                                           | 2026-08-11  |
| No live third-party API in tests    | Playwright fixture aborts any request to `themealdb.com/api` that a spec did not stub, and fails the test that made it                                                                                 | CI                                                                                                                                                 | default `categories.php` stub removed → every spec in the file failed with `a request reached the live TheMealDB API instead of a stub`                                                                                     | 2026-08-11  |
| No console errors on load           | Playwright assertion                                                                                                                                                                                   | CI                                                                                                                                                 | a `console.error` at module scope → the assertion failed on both projects                                                                                                                                                   | 2026-08-11  |
| Dependency scan                     | `npm audit --audit-level=high` + OSV-Scanner over the lockfile                                                                                                                                         | CI                                                                                                                                                 | `lodash@4.17.20` (GHSA-xxjr-mmjv-4gpg, high) added to a scratch lockfile → `npm audit --audit-level=high` exit 1; exit 0 on the real lockfile. **The OSV-Scanner half of this gate is unprobed**                            | 2026-08-11  |
| Static analysis                     | CodeQL `security-extended`, required as both the job and the `CodeQL` result check                                                                                                                     | CI                                                                                                                                                 | CodeQL reported `js/file-system-race` in our own `scripts/check-bundle-size.mjs` at S6; fixed in `93da8b4`, not suppressed                                                                                                  | 2026-08-11  |
| Preview deployment                  | Vercel git integration, `Vercel` status context                                                                                                                                                        | CI (required context on `main`)                                                                                                                    | **none recorded** — a deployment, not a locally runnable gate                                                                                                                                                               | —           |
| Automated accessibility             | axe-core through Playwright over eight scans: the idle view with its category grid, a category's results, search results, the modal, the shopping list, the clear confirmation, and both error regions | CI                                                                                                                                                 | contrast dropped below AA → axe reports a `color-contrast` violation and the run fails                                                                                                                                      | 2026-08-11  |
| Duplication                         | jscpd over non-test `src/`, 60-token minimum                                                                                                                                                           | CI                                                                                                                                                 | a duplicated module → `found too many duplicates (5.9%) over threshold (1.0%)`, exit 1                                                                                                                                      | 2026-08-11  |
| Bundle budget                       | gzipped total of the shipped assets against a recorded ceiling                                                                                                                                         | CI                                                                                                                                                 | chunks each under the ceiling but over the total → exits 1 naming the extension total; an empty build → `no JavaScript asset was measured`                                                                                  | 2026-08-11  |

**Twenty of twenty-one mandatory gates are proven; one is not.** Seven gained a probe at S9, in a throwaway clone or a scratch lockfile so that no credential-shaped string, broken submodule, or vulnerable dependency ever entered this repository's history.

The one that remains is **preview deployment**. Proving it means shipping a build that fails to deploy, which would put a broken deployment in the project's Vercel history to demonstrate something the deployment logs already show on every push. That trade is not worth making, and it is recorded here rather than quietly counted as passing.

**Two rows are proven at the tool, not at the gate.** Every other probe ran the same program CI runs. The secret scan does not: CI runs `gitleaks/gitleaks-action@v2` and the probe ran the gitleaks CLI, so what is demonstrated is that gitleaks rejects the input, not that the action wiring rejects. The dependency scan is `npm audit` **plus** OSV-Scanner and only the first half was probed. Both cells say so. Closing either means pushing a credential-shaped string or a vulnerable lockfile to the remote, which the S9 stop condition forbids, so the limit is disclosed rather than absorbed into the word "proven".

Three notes worth more than the count:

- The first attempt at the secret-scan probe **failed to trip the gate**. The planted string was AWS's own documentation placeholder, which gitleaks allowlists by design. A probe that passes because the gate is right to ignore the input proves nothing; the recorded probe uses a `ghp_` shape instead. This is exactly why a probe is written down with its input.
- The static-analysis probe is not synthetic, and it is the one probe that exercised the real CI gate. CodeQL rejected code written for this project — a file-system race in `scripts/check-bundle-size.mjs`, found at S6 — and it was fixed in `93da8b4` rather than suppressed. The check run is `failure` on the parent commit and `success` on the fix.
- The register calls a gate proven when a probe made it reject. It does not claim the probe covered every path into that gate; where it did not, the cell says which part is untested.

The pre-push layer additionally has no probe showing it rejects a failing build or test; that is a layer, not a table row.

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

Deliberately not in force. The adoption order in `.ai-engineering/.bootstrap/06-tools` is complete through step 4; what remains has no scheduled slice, because the sequencing reason for deferring it is gone and what is left is a cost decision.

| Gate                       | Status                           | Lands in    | Rationale                                                                                                                                                           |
| -------------------------- | -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation testing (Stryker) | deferred, warn-only when adopted | unscheduled | Step 5. Measured once on 2026-08-11 rather than argued about — see below. What remains is a cost decision                                                           |
| Coverage thresholds        | deferred                         | unscheduled | Coverage is reported from S0. A threshold measured against a suite this size mostly reports the number it was set to; worth setting when someone will act on a drop |

## Substitutions from `PLAN.md`

Recorded because they differ from what the plan named:

- **secretlint at pre-commit, gitleaks in CI.** The plan named gitleaks at both layers. Gitleaks is a system binary and is not installed here — the S9 probe fetched a copy for one run and discarded it; requiring it locally would make a fresh clone fail its own hook. secretlint installs from the lockfile, so `npm ci` is enough to get a working pre-commit gate. Gitleaks still runs in CI over full history, which is the authoritative layer. Net effect: stronger, not weaker.
- **`import/no-cycle` instead of madge; madge recorded as `not-applicable`.** The plan put cycle detection at step 4 via madge. The lint rule was already active from S0, blocks at commit and in CI, and carries a dated negative probe. A second full-graph checker would cover only files ESLint does not lint, of which there are none — so it would add a dependency without adding a control. Decision taken, not deferred again.
- **Duplication and the bundle budget block from the first day, rather than warning first.** `PLAN.md` staged both as "warn first, then block". Both went straight to blocking, including as a required context: there are zero clones to grandfather, and the budget is measured against the real artifact rather than estimated, so neither can produce the noise the warn-first ramp exists to absorb. Stricter than planned, recorded because it differs.
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
| Direct push to `main` on the remote                   | `GH013: Repository rule violations found` — ruleset rejects                   |
| `'unsafe-inline'` added to `script-src`               | CSP assertion fails on the exact-match comparison; passes again once reverted |

### Whether the gates passed is derived, not written

There is no longer a sentence in this document claiming the suite passes at some head. That claim decayed every time the head moved, and it was corrected in four consecutive review rounds — which is the argument against writing it at all.

Gates are declared once, in `package.json` under `sweai.gates`, beside the scripts they name so the two cannot drift:

```json
"sweai": {
  "gates": ["typecheck", "lint", "format:check", "test:coverage", "scan:secrets", "build", "check:bundle", "check:duplication", "test:e2e"]
}
```

Evidence is produced by running them:

```bash
node .ai-engineering/.bootstrap/06-tools/evidence/generate-evidence.mjs run --markdown evidence-report.md
node .ai-engineering/.bootstrap/06-tools/evidence/generate-evidence.mjs verify
```

`run` executes every declared gate — it does not stop at the first failure, so one broken gate cannot hide the others. `verify` exits non-zero unless the evidence describes the current head of a clean worktree with every gate passing, which makes a stale claim fail instead of merely reading as true.

`verify` was probed in this repository rather than trusted from its own test suite, because a verifier that cannot reject is worse than no verifier:

| Probe                                               | `verify` exit |
| --------------------------------------------------- | ------------- |
| Dirty worktree                                      | 1             |
| Evidence stamped with a commit that is not the head | 1             |
| Evidence recording a failed gate                    | 1             |
| Clean worktree, evidence at the current head        | 0             |

`evidence.json` and the rendered report are gitignored. Committing either would dirty the worktree the evidence describes and change the commit it is stamped with.

The rendered report is published on the pull request under the marker `<!-- sweai-builder-evidence -->` and updated in place, separate from the semantic-review record.

**The `verify` script is deliberately not declared as a gate.** It chains with `&&`, so it reports the first failure and hides every one after it — exactly the defect this arrangement removes. It stays as a convenience for local use.

### What this evidence does not establish

Three limits, stated because a green report is easy to over-read:

- **A local counterpart is not the required context.** Five of the ten required contexts have a locally runnable counterpart among the declared gates. Five have none: `Vercel`, `Dependency scan`, `Static analysis`, `CodeQL`, and `SWEAI Review / Claude` — deployments, security analysis, and a review verdict are not npm scripts. Where a counterpart exists it is not always equivalent: the `Secret scan` context is gitleaks over full history against a local secretlint over the working tree, so **CI remains authoritative for secrets**, and `Reproducible build` in CI additionally installs from the lockfile with `npm ci`.
- **Gate evidence alone never demonstrates merge readiness.** It reaches five of ten required contexts. The pull request's own checks are what demonstrate readiness.
- **It records that gates ran and what they returned, not that they work.** A passing run over an ineffective gate is still a failing control. Effectiveness is the negative-probe cycle above, and one of twenty-one gates still has no probe.

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
  Dependency scan
  Static analysis
  CodeQL
  Duplication and bundle budget
  SWEAI Review / Claude
  Vercel
```

This list is bound to `.github/rulesets/protect-main.json` by `src/test/governance-consistency.test.ts`, which fails when the ruleset declares a context this document does not mention. It drifted twice before that binding existed.

`Static analysis` is the CodeQL **job**; `CodeQL` is the code-scanning **result** check. `github/codeql-action/analyze` uploads its SARIF and exits 0 regardless of what it found, so requiring only the job would have let a high-severity alert merge and ship. Both are required.

`strict_required_status_checks_policy` is on, so a branch must be up to date with `main` before merging — two pull requests that pass in isolation cannot merge into a broken combination.

`Vercel Preview Comments` is deliberately **not** required. It reports that a bot posted a comment, not that anything built or passed; requiring it would let a cosmetic integration change block merges.

**AC13 is exercised.** Four browser tests assert it against rendered content at 375px: the results grid with unbreakable titles (`e2e/search.spec.ts`), the open modal (`e2e/recipe-modal.spec.ts`), the shopping list (`e2e/shopping-list.spec.ts`), and the category browser (`e2e/browse.spec.ts`). Each checks both document overflow and intra-card clipping, because `overflow: hidden` hides the second from the first.

`SWEAI Review / Claude` **is** a required context, added on 2026-08-10 when autonomous merge was authorized.

It was deliberately not required before, on the argument that the agent under review publishes it and so would control its own merge gate — with the human merge step carrying that risk. Authorizing autonomous merge removed the human step, which inverted the argument rather than settling it. Requiring the context does not stop a wrong `PASS`, but it does stop a merge with **no** review at all, and that was previously possible: nothing in the ruleset asked for the status to exist.

What remains unprotected, stated plainly: the reviewer is a subagent of the agent that wrote the change, so a `PASS` it reaches in error still merges. The context is a floor, not a substitute for independent judgement.

**Owner recovery.** Requiring a context only an agent publishes reintroduces, by a different route, the lockout that zero required approvals was chosen to avoid: if the agent or `publish-claude-review.sh` is unavailable, nothing can merge — including a fix to the ruleset. `bypass_actors` is empty by design. The recovery is for the owner to edit ruleset 20604945, remove the context, merge, and restore it. Publishing the status by hand with `gh api` is not the recovery; `EXECUTION.md` prohibits it precisely because it would defeat the head binding.

### Mutation testing, measured once

Run on 2026-08-11 against a scratch copy that was not retained, so unlike the derived gate evidence these figures cannot be re-derived from this repository. Not adopted. `@stryker-mutator/core` + the vitest runner, 987 mutants across 14 files, 3 minutes 5 seconds at concurrency 4 on a developer machine.

| Module     | Score  |
| ---------- | ------ |
| `domain/`  | 93.55% |
| `api/`     | 90.20% |
| `storage/` | 86.49% |
| `ui/`      | 55.04% |
| **All**    | 62.88% |

**The headline number is misleading and should not be published as a quality figure.** Stryker runs the Vitest suite only, so `App.tsx` scores 2.94% with 87 uncovered mutants — that component is exercised almost entirely by Playwright, which the mutation runner does not invoke. The number measures the unit suite, not the test suite.

**It found a real hole, which is the argument for the cost.** No test asserted the source link's `href` at any level — the mapping test pinned `sourceUrl` to `null`, and the component and browser tests asserted only that the link was present. Wrong-destination reads were therefore caught incidentally or not at all: swapping in `strYoutube` failed the mapping test, but only because that test expected `null` and `strYoutube` was non-empty in its fixture. What survived the unit suite outright was a read of a field empty in that fixture, and the field-drop mutant Stryker reported — which the browser suite did catch, since the anchor stops rendering, and which is why a Vitest-only runner saw it live. AC4 requires "working YouTube and source links"; the YouTube half was asserted by destination at all three levels and the source half at none. Fixed on 2026-08-11, each assertion probed.

Two rounds of review were needed to state that paragraph correctly: the first version overstated the hole, the second over-corrected. The defect was always small; describing it precisely was the hard part.

Whether to adopt it as a gate is unresolved. The costs are ~9 MB of dev dependency, roughly three minutes locally and more on a two-core CI runner, and triage of 258 surviving mutants of which an unknown share are equivalent — mutants that change the code without changing behaviour, which no test can or should kill.

### Production smoke check

`npm run smoke:prod` — `e2e-prod/smoke.spec.ts` against `playwright.prod.config.ts`.

Run against the live site with the real TheMealDB, most recently on 2026-08-11:

| Journey                                                                 | Result |
| ----------------------------------------------------------------------- | ------ |
| The app loads, its stylesheet applies, and no page or console error     | pass   |
| Browse: categories load, one opens, a recipe opens with its ingredients | pass   |
| Search → a grid of live results                                         | pass   |
| Open a recipe → add its ingredients → read them back in the list        | pass   |
| Remove one item, clear the list, both surviving a reload                | pass   |
| Surprise me → a random recipe with its ingredients                      | pass   |
| The deployment serves the five security headers `vercel.json` sets      | pass   |

Fourteen runs: seven journeys across a 375px and a desktop viewport. **All passed on the first attempt** — `retries: 2` is configured and none were consumed. That distinction matters: a journey that needs a retry against a live third party is a finding, and the JSON report it would appear in is not committed, so it is stated here or it is lost.

The header check uses Playwright's `request` fixture, so it is viewport-independent: two of the fourteen runs assert the same thing twice.

**Until S9 this was a claim nobody could check.** The rows above were produced by a throwaway Playwright project outside the repository, so a reader had to take them on trust, and the previous version of this section said so. The suite is now committed and the command is one line, which is the difference between a record and an assertion. It still is not derived evidence — a human decides when to run it, and `smoke-results.json` is not committed — but anyone can reproduce it, including against a preview with `SMOKE_URL`.

Assertions are shape-based, not content-based. The recipe database changes without notice, so "a grid appears with at least one non-empty title" survives where "Beef Pie is first" would fail for reasons that are not defects. The stylesheet assertion reads a custom property only our stylesheet defines, because a visible heading proves nothing about styling — that is precisely how the cached-`index.html` failure reached a user.

This is the one check that exercises the real dependency: every other browser test stubs TheMealDB, because AC2 and AC3 need responses a live service will not produce on demand. A Playwright fixture enforces that separation — `e2e/` cannot reach the live API, and `e2e-prod/` exists outside it.

It is deliberately not a gate. It runs against production, so it cannot block a merge that has not happened yet, and making it a required context would tie every pull request to a third party's uptime — the same dependency spec O1 already records as unsupported.

### Vercel deployment

- Git integration was already connected by the human; verified read-only. No project or integration was duplicated.
- Preview for pull request #1: `● Ready` in 12 s. The preview URL returns HTTP 302 to Vercel SSO because Deployment Protection is enabled on previews — a security default, not a failure.
- The earlier production deployment failed (`● Error`, 2 s) with `npm error code EUSAGE — can only install with an existing package-lock.json`. Root cause: it built `main` at `fcc80b2`, which held only the operating contract, with no `package.json` and no lockfile. Not a configuration defect; the same configuration builds the preview successfully. It resolves when an application-bearing `main` is merged.
- Direct production means remain prohibited by `EXECUTION.md`: no `vercel --prod`, no deployment promotion. Since 2026-08-10 production occurs as an automatic consequence of a merge, and merging is authorized for agents under `EXECUTION.md` "Autonomous merge and release" while its signatures hold.

### Two gates were silently passing and were fixed

Both would have looked configured and reported nothing:

1. **`import/no-cycle` never fired.** `eslint-plugin-import` could not parse imported `.ts` files, so it could not build the dependency graph and passed everything. Fixed by adding `settings['import/parsers']` mapping `@typescript-eslint/parser` to `.ts`/`.tsx`, and installing that parser as a direct dependency. Verified failing-then-passing against a real cycle. **Do not remove that setting** — the rule reverts to silently passing, with no error to indicate it.
2. **secretlint appeared to miss real credentials.** It did not: the first probe tokens were malformed (wrong length for a GitHub PAT, and AWS's documented `EXAMPLE` key is intentionally allow-listed). With correctly shaped fakes the rule fires. Confirmed coverage includes GitHub, Vercel, AWS, GCP, Slack, npm, Stripe, private keys, and database connection strings.

Known local gap: secretlint's preset does not detect every credential shape, and it scans staged files rather than history. Gitleaks in CI covers full history and a broader rule set. Treat CI as authoritative for secrets.

## Exception path

An exception requires: the rule, the reason, the reviewer, an expiry date where applicable, and supporting evidence — recorded in the pull request and in this file. Inline `eslint-disable` and `@ts-expect-error` need a comment naming the reason. Unexplained suppressions are review failures.
