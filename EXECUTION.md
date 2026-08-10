# Recipe Search & Meal Planner Execution Contract

Status: Approved

Availability preflight: Ready

## SWEAI Builder dependency

Migrated on 2026-08-10 from a tracked `.bootstrap` symlink (Git mode `120000`, target `../ai_native_se_fde/.bootstrap`) to the supported pinned-submodule installation. Every value below is live evidence, not intention.

- Canonical `sweai-builder` repository URL: `https://github.com/emada/sweai-builder.git`
- Tracked branch: `main`
- Product mount path: `.ai-engineering`
- Installation type: Pinned Git submodule
- Pinned commit: `dd978bf03d39cdd7721d3d58c49536c30c24decb`, advanced from `b66c337` on 2026-08-10 through a reviewed dependency-update pull request. Earlier pins: `52e60f1` → `b66c337` for the gate-evidence profile
- Submodule initialized and `.ai-engineering/AGENTS.md` readable: Yes
- Operating contract reachable at `.ai-engineering/.bootstrap/AGENTS.md`: Yes
- Git index mode is `160000` rather than symbolic-link mode `120000`: Yes — verified with `git ls-files --stage .ai-engineering`
- Product tracks no files inside `.ai-engineering/` and owns no `.bootstrap/`: Yes — `git ls-files .ai-engineering/*` is empty and `.bootstrap/` is ignored
- CI fetches submodules recursively: No — deliberate. No CI job reads the operating contract, and `GITHUB_TOKEN` cannot fetch a private repository other than this one. Revisit if a contract-dependent CI check is ever added
- May advance the pinned SWEAI Builder commit through a dependency-update pull request: Yes
- Symbolic-link, vendored-copy, or product-owned `.bootstrap/` fallback authorized: No
- Unpinned-branch tracking authorized: No

**Decided by the human on 2026-08-10.** This repository is public and its `emada/sweai-builder` dependency is private. The accepted position is that **only authorized clones initialize the submodule**. Rejected alternatives: making `sweai-builder` public, and adding a read-scoped deploy key or personal access token as a repository secret.

Accepted consequences:

- `git clone --recurse-submodules` fails for anyone without read access to `emada/sweai-builder`; a plain `git clone` still succeeds and produces a working application checkout.
- `git submodule update --init --recursive` requires authenticated access to the private dependency.
- CI must not depend on the operating contract, because `GITHUB_TOKEN` cannot fetch another private repository. No current job does.
- Adding a contract-dependent CI check would reopen this decision and require a deploy key or token secret.

## Semantic review

- Specialized Claude review required before merge handoff: Yes — mandatory, per `.ai-engineering/.bootstrap/02-quality/05-automated-semantic-review.md`
- Reviewer definition: `.claude/agents/semantic-reviewer.md`, fresh isolated context, initially read-only, high reasoning effort
- Primary semantic reviewer: Specialized Claude reviewer agent; provider review never replaces it
- Optional provider review (GitHub Copilot) enabled: No — supplementary and disabled by default
- May post or update the Claude review summary on the pull request: **Yes** — approved by the human on 2026-08-10
- May create or update the `SWEAI Review / Claude` commit status: **Yes** — approved by the human on 2026-08-10
- May read, reply to, and resolve pull-request review threads: **Yes** — approved by the human on 2026-08-10

These three grant external-write permissions on the pull request only. They do not extend to merging, to pushing `main`, or to any production action, all of which remain prohibited. A thread is resolved only when its finding was corrected or disproven with evidence, never to clear a blocker.

## Pre-discovery operator availability

Recorded retrospectively: this project reached Phase 3 under the previous version of the operating contract, which had no execution contract. Every field below is live evidence read back through `gh`, not intention.

- Intended repository provider: GitHub
- Intended owner or organisation: `emada`
- Intended repository name: `meal-planner-agentic`
- Intended visibility: Public
- Source is approved for public visibility: Yes — approved by the human on 2026-08-09. Verified before publishing: no secrets in the working tree or in the two commits of history. TheMealDB key `1` is public by design; deployment credentials live in GitHub secrets, never in the tree
- Provider account or organisation plan: GitHub Free
- Required default-branch governance supported for this visibility: Yes, for public. **No for private** — GitHub Free returns HTTP 403 for both rulesets and classic branch protection on private repositories
- Evidence source and date: `gh api repos/emada/meal-planner-agentic/rules/branches/main` → `["deletion","non_fast_forward","pull_request"]`, and a negative probe rejected with `GH013`, 2026-08-09
- Approved fallback if governance is unsupported: Change visibility — already exercised, private → public
- Authenticated CLI identity: `gh` as `emada`, scopes `gist`, `read:org`, `repo`, `workflow`
- Repository administration permission expected: Yes — verified, `permissions.admin: true`, and a ruleset was applied successfully
- Likely application-hosting provider and account: Vercel, account `emada`, scope `emada1`
- Human-only consent, login, billing, or installation action required before unattended work: **None remaining.** The human installed and authenticated the Vercel CLI on 2026-08-09, which was the only blocker
- Availability blockers remaining: None. GitHub and Vercel are both authenticated and verified

## Authorization model

Applies `.ai-engineering/.bootstrap/01-operating-model/06-evidence-gated-authorization.md`, introduced by the `dd978bf` pin. Every `Yes` in this file is a ceiling, not a grant: the action is permitted only while its named signature holds at the moment it runs.

| Action                      | Required signature   | Enforced by                                      |
| --------------------------- | -------------------- | ------------------------------------------------ |
| Publish gate evidence       | `evidence-current`   | `06-tools/evidence/generate-evidence.mjs verify` |
| Publish a review verdict    | `review-current`     | `06-tools/github/publish-claude-review.sh`       |
| Apply repository governance | `ruleset-verified`   | `06-tools/github/apply-repository-ruleset.sh`    |
| Keep the contract installed | `installation-valid` | `src/test/repository-integrity.test.ts`, Phase 0 |

- Highest autonomy level authorized: **3**. Level 3 actions — advancing this pin, changing required status contexts, applying the ruleset — are performed by an agent but never merged by one; a human reviews and merges. Level 4 remains human throughout, which is why production is reachable only as a consequence of a merge you perform.
- New actions introduced without a named signature: None.

`installation-valid` is enforced here by a product test rather than only by Phase 0, so a regression to a symlink or vendored contract fails a gate instead of relying on review.

### Runtime operations

SWEAI Builder does not yet model authorization for operating a running system. Until `ROADMAP.md` item 1 lands, these remain level 4 and are performed by a human:

- Read production telemetry, logs, or traces: Human only
- Execute a runbook or rollback: Human only
- Restart, scale, or reconfigure a running service: Human only
- Silence, suppress, or edit an alert: Human only

This product does not need operational autonomy and is not constrained by the gap. It is a static bundle on Vercel with no backend, no runbook, no alerting, and no telemetry we collect — ADR-0003 declines error reporting outright. Rollback is promoting a previous Vercel deployment, which is yours to perform. If that ever changes, the change itself is the signal that this product has outgrown the current contract version.

## Autonomous execution

- Continue through all approved plan slices without pausing between slices: Yes
- Maximum unattended duration: until the current stop condition is reached — for this run, a pull request whose mandatory checks are green and awaiting merge approval
- Maximum agent concurrency: 1
- Default execution mode: One lead agent
- Model and reasoning-effort policy: inherit the session model; no per-task overrides
- Interface approval mode: whatever the session uses. **An interface permission mode is never authorization for an external action** — authorization comes only from this file or an explicit instruction
- Dynamic workflows or automatic fleet orchestration allowed: No. Fleet readiness is not demonstrated; the first candidate is S4 + S5, and it requires a separate readiness decision to be recorded in a `FLEET.md` created at that point. No such file exists yet, deliberately
- May create local commits: Yes
- May create branches and worktrees: Yes
- May push approved branches: Yes — feature branches only. Never `main`, which the ruleset enforces independently
- May open or update pull requests: Yes

## Repository destination

- Provider: GitHub
- Owner or organisation: `emada`
- Repository name: `meal-planner-agentic`
- Visibility: Public
- Source approved for this visibility: Yes
- Provider account or organisation plan: GitHub Free
- Default-branch protection supported for this visibility: Yes
- Protection capability verified by: ruleset id 20604945, name `SWEAI Builder: protect default branch`, enforcement `active`, read back through the API on 2026-08-10; direct push rejected with `GH013`. Live name and versioned desired state agree, so the apply script updates rather than duplicates
- Approved degraded-governance exception, if any: None. Full protection is in force
- Authenticated CLI identity: `gh` as `emada`
- Repository administration permission verified: Yes
- May create the remote repository: Not applicable — it exists
- May configure CI: Yes
- May create or update repository rulesets: Yes
- Repository ruleset desired-state file: `.github/rulesets/protect-main.json`
- May set the default branch: Yes — already `main`
- May configure repository secrets and environments: Yes, names only. Secret values are supplied by the human and never printed, logged, or committed

## Application hosting

- Required: Yes — `SPEC.md` targets real users and `PLAN.md` makes preview deployments a mandatory CI gate
- Provider: Vercel
- Account or team: `emada`, scope `emada1`. CLI 58.9.0 authenticated on 2026-08-09
- Project name: `meal-planner-agentic`, id `prj_MLHWJj7uE1Qi7FLfxTBCydNyFyb4`, framework preset Vite, created by the human on 2026-08-09
- May create or link the hosting project: Yes — the project exists; linking it to the GitHub repository so that pull requests receive preview deployments is authorized
- May create preview deployments: Yes. Once the git integration is connected, previews are produced by Vercel itself rather than by our workflow, and Vercel publishes its own status context on each pull request
- May deploy to production: **No.** Explicitly prohibited by the human on 2026-08-09: agents must not run `vercel --prod`, promote a deployment, or publish to production by any other direct means
- Production release model: Production may occur **only** as an automatic consequence of a pull request that the human approved and merged into `main` after every mandatory gate passed. There is no agent path to production, and spec O1 blocks production release independently
- Do not create a second Vercel project or a duplicate git integration. Inspect the existing integration first; use `vercel link` only to attach the local directory to the existing project when that is actually required

Git integration status: **already connected** by the human before this contract was approved. Verified read-only — Vercel publishes the `Vercel` and `Vercel Preview Comments` contexts on pull requests. No project was created and no integration was duplicated; `vercel link` was not needed.

Resolved: the earlier failed production deployment (`● Error`, 2s, HTTP 404) was not a configuration defect. It built `main` at commit `fcc80b2`, which contained only the operating contract — no `package.json` and no lockfile — so `npm ci` exited with `EUSAGE: can only install with an existing package-lock.json`. The identical configuration built the preview for pull request #1 in 12 s. Production resolves itself when the human merges an application-bearing `main`.

## External services and credentials

- Approved services: TheMealDB (public API, no credential), GitHub (repository and CI), Vercel (hosting, authenticated)
- Cost ceiling: **US$0**, confirmed by the human on 2026-08-09. No paid plan, no paid tier, and no billable resource may be created without explicit approval. Everything this project needs fits the free tiers of GitHub and Vercel
- AI subscription or API spend ceiling: governed outside this repository; not an agent decision
- Action when 80% of a spend ceiling is reached: not applicable at a US$0 ceiling — any action that would incur cost stops and asks first
- Available authenticated tools: `gh` (admin on the target repository), `vercel` CLI 58.9.0 as `emada`, `git`, `npm`, `node` 24, Playwright with Chromium installed
- Credentials the user must provide: none. The application needs no secret to build or run, and both providers are already authenticated

Never write credentials or secret values into this file.

## Stop conditions

Stop and request the user when:

- an action exceeds an authorization above;
- a material product, architecture, privacy, security, or cost decision is not covered by the approved plan;
- a required credential or external permission is unavailable;
- a destructive or production-impacting action requires confirmation;
- an approved time, compute, token, or monetary budget would be exceeded;
- mandatory gates repeatedly fail without a safe resolution;
- the approved plan is complete.

Project-specific additions:

- Merging to `main` is always the human's action. Agents open and update pull requests; they never merge.
- Any change that would introduce a data processor, analytics, tracking, cookies, or a third-party script stops for a `SPEC.md` revision — see `docs/privacy/assessment.md` and ADR-0003.
- Spec O1 (TheMealDB supported key) blocks slice S7 and is not an agent decision.

## Approval

- Approved by: bmi.machado@gmail.com
- Approved on: 2026-08-09
