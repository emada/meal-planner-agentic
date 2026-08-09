# Recipe Search & Meal Planner Execution Contract

Status: Approved

Availability preflight: Ready

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

## Autonomous execution

- Continue through all approved plan slices without pausing between slices: Yes
- Maximum unattended duration: until the current stop condition is reached — for this run, a pull request whose mandatory checks are green and awaiting merge approval
- Maximum agent concurrency: 1
- Default execution mode: One lead agent
- Model and reasoning-effort policy: inherit the session model; no per-task overrides
- Interface approval mode: whatever the session uses. **An interface permission mode is never authorization for an external action** — authorization comes only from this file or an explicit instruction
- Dynamic workflows or automatic fleet orchestration allowed: No. Fleet readiness is not demonstrated; the first candidate is S4 + S5, and it requires a separate readiness decision recorded in `FLEET.md`
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
- Protection capability verified by: ruleset `AI Engineering: protect default branch` id 20604945, enforcement `active`, read back through the API; direct push rejected with `GH013`
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

Known defect to repair during execution: the project's only deployment failed (`● Error`, 2s) and `https://meal-planner-agentic-emada1.vercel.app` returns HTTP 404. Diagnosing and fixing it is in scope; it is a build-configuration failure, not a decision.

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
