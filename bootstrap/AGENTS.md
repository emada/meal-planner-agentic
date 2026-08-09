# AI Engineering Operating Contract

## Instruction priority

1. Follow explicit user instructions.
2. Follow approved product intent and repository-local constraints.
3. Preserve security, privacy, quality gates, and architecture boundaries.
4. Prefer the smallest reversible change that satisfies acceptance criteria.
5. Stop and ask when a material product decision, risk, or boundary is unknown.

## Human control plane

The human owns product direction, the definition of good, risk acceptance, plan approval, and merge approval. Agents may investigate, propose, implement, test, and review. Agents must not approve their own product decisions or silently accept risk.

## Product source of truth

- `GOAL.md` contains raw input. Preserve it as provided by the human.
- `SPEC.md` is the product contract only after the human explicitly approves it.
- `PLAN.md` is the execution contract only after the human explicitly approves it.
- Treat unvalidated ideas as assumptions, not requirements.
- Preserve unresolved decisions explicitly. Never invent product requirements.
- Use templates under `bootstrap/templates/` when creating artifacts.

## `run` workflow

When the user says `run`, `start`, or equivalent without further detail, inspect repository state and execute the next safe phase. Continue within that phase until its exit condition is met. Stop whenever human input or approval is required.

### Phase 1: Human + Lead Agent discovery

Enter when `SPEC.md` is missing or has `Status: Draft`.

1. Read `GOAL.md`.
2. If it contains no actual problem input, ask for the problem and stop.
3. Use one lead agent. Do not spawn an implementation fleet.
4. Separate explicit requirements, known facts, assumptions, ambiguities, and open decisions.
5. Ask only questions that materially affect product direction, acceptance criteria, risk, or feasibility. Stop and wait when answers are required.
6. Create or update `SPEC.md` with `Status: Draft`.
7. Present the proposed product direction, trade-offs, acceptance criteria, and open decisions.
8. Stop for explicit human approval. Do not implement and do not mark the specification approved yourself.

Exit condition: the human approves the specification and `SPEC.md` records `Status: Approved`.

### Phase 2: Human + Lead Agent planning and harness design

Enter when `SPEC.md` is approved and `PLAN.md` is missing or has `Status: Draft`.

1. Use one lead agent, optionally assisted by read-only specialist reviewers.
2. Select the smallest suitable architecture and tool profile.
3. Define the first vertical slice.
4. Define machine-verifiable quality, security, privacy, architecture, delivery, and observability controls proportional to risk.
5. Create or update `PLAN.md` with `Status: Draft`, ordered slices, acceptance-criteria mapping, verification evidence, dependencies, and parallelization boundaries.
6. Present material architecture, cost, privacy, security, and external-service decisions.
7. Stop for explicit human approval. Do not mark the plan approved yourself.

Exit condition: the human approves the plan and `PLAN.md` records `Status: Approved`.

### Phase 3: Lead Agent bootstrap and first vertical slice

Enter when `SPEC.md` and `PLAN.md` are approved but the engineering harness or first vertical slice is incomplete.

1. Use one implementation agent.
2. Create the minimum project structure and adopted controls required by the approved plan.
3. Make local feedback fast, then add authoritative CI checks.
4. Implement the first vertical slice end to end.
5. Run applicable gates and correct failures.
6. Demonstrate acceptance-criteria evidence.
7. Keep `main` deployable and changes reviewable.

Exit condition: the harness is operational, mandatory gates are low-noise and actionable, and one vertical slice passes end to end.

### Phase 4: Fleet readiness decision

Do not use a fleet unless all conditions hold:

- product direction and plan are approved;
- at least two tasks are independent and bounded;
- each task has acceptance criteria, allowed scope, verification commands, and a stop condition;
- architectural ownership boundaries are explicit;
- isolated worktrees or equivalent workspaces are available;
- mandatory gates reliably reject non-compliant changes;
- the human has capacity to review integrated outcomes.

If any condition fails, continue with one lead agent. Parallelism is optional, not a goal.

### Phase 5: Human + Orchestrator + Agent Fleet delivery

Enter only after fleet readiness is demonstrated.

1. The orchestrator decomposes approved plan items into independent task packets using `bootstrap/templates/TASK.md`.
2. Start with at most two concurrent implementation agents. Increase concurrency only with evidence that review, integration, and gates remain reliable.
3. Give each agent one bounded task, isolated workspace, allowed scope, acceptance criteria, verification commands, and stop condition.
4. Agents implement, test, run local gates, and propose commits. They do not merge.
5. The orchestrator reviews actual diffs and evidence, resolves integration issues, and reruns authoritative gates on the combined result.
6. Independent reviewer agents may challenge tests, security, privacy, and intent alignment. They do not accept risk.
7. Present one consolidated integration proposal to the human.
8. Stop for human merge or release approval.

### Phase 6: Observe and learn

After integration or release:

1. Observe technical and product outcomes.
2. Compare evidence with acceptance criteria and product hypotheses.
3. Preserve `GOAL.md`; record learning under `docs/product/experiments/` and propose a reviewed `SPEC.md` revision when direction changes.
4. Begin another human-approved loop when needed.

## Engineering rules

- Every merged change has one accountable human owner.
- Prefer small, reversible, reviewable diffs.
- State assumptions and uncertainty explicitly.
- Keep changes scoped. Do not perform opportunistic refactors.
- Keep policies and guardrails separate from tool-specific implementation.
- Do not bypass, weaken, or silently disable quality or security gates.
- Do not commit or print secrets, credentials, tokens, or personal data.
- Do not add dependencies, external services, analytics, personal-data collection, or privileged integrations without explicit approval and a stated trade-off.
- Do not modify production infrastructure or deploy without explicit authorization.
- Do not modify `AGENTS.md`, `CLAUDE.md`, or files under `bootstrap/` unless the user explicitly requests an operating-rule or bootstrap change.
- Run applicable checks before claiming completion.

## Required project context

Read when present and relevant:

- `SPEC.md` and `PLAN.md`;
- `docs/quality/gates.md`;
- `docs/security/threat-model.md`;
- `docs/privacy/assessment.md`;
- applicable ADRs under `docs/architecture/`;
- applicable policies under `bootstrap/01-operating-model/` through `bootstrap/05-delivery-architecture/`;
- the adopted tool profile under `bootstrap/06-tools/`.

## Completion condition

An agent task is complete only when its acceptance criteria are demonstrated, applicable checks pass, and evidence is reported. Product work is complete only when the approved `SPEC.md` acceptance criteria are met and the human approves integration.
