# Bootstrap usage

## Required reading order

1. Read `01-operating-model` before delegating work to an agent.
2. Read `02-quality` before configuring a pipeline.
3. Read `03-security-privacy` before collecting data, integrating services, or granting agent tools.
4. Read `04-product` before treating a green deployment as product success.
5. Use `05-delivery-architecture` to structure the repository and delivery flow.
6. Select implementations from `06-tools` only after the required controls are defined.

## Project adoption

Initialize a goal-first project with:

```text
AGENTS.md                  # loads bootstrap/AGENTS.md
CLAUDE.md                  # Claude Code shim: @AGENTS.md
GOAL.md                    # original problem statement only
bootstrap/                 # operating contract, policies, tools, templates
```

Do not create `SPEC.md` or `PLAN.md` initially. Paste the original problem into `GOAL.md` and invoke `run`. One lead agent assists discovery and drafts `SPEC.md`. Human approval is required before planning. The fleet is considered only after an approved plan, a working harness, and a verified vertical slice.

As the project evolves, create and maintain:

```text
docs/quality/gates.md         # mandatory checks and required evidence
docs/security/threat-model.md # assets, threats, controls, residual risk
docs/privacy/assessment.md    # data, purpose, retention, processors
docs/architecture/            # material technical decisions
docs/product/experiments/     # hypotheses, evidence, and learning
```

For every bootstrap rule, record one status: `adopted`, `deferred`, or `not-applicable`. Record a short rationale.

## Add a control only when

1. The controlled risk is named.
2. The expected signal is defined.
3. Execution and maintenance cost are acceptable.
4. The correct delivery layer is known.
5. An owner is responsible for resolving failures.
