# AI Engineering Bootstrap

Reusable, tool-independent operating rules for AI-assisted software delivery.

This directory contains the reusable operating contract, policies, guardrails, tool profiles, and generated-artifact templates used by an AI-assisted project.

The project root contains three initial entry-point files:

- `AGENTS.md` loads `bootstrap/AGENTS.md`.
- `CLAUDE.md` imports the root `AGENTS.md` for Claude Code.
- `GOAL.md` contains only the original problem statement, customer request, or discovery notes.

Do not create `SPEC.md` initially. The first `run` starts a Human + Lead Agent discovery loop and drafts it using `templates/SPEC.md`. Implementation begins only after explicit human approval of the specification and plan.

## Operating sequence

```text
GOAL
→ Human + Lead Agent discovery
→ human-approved SPEC
→ human-approved PLAN and harness design
→ one agent builds the harness and first vertical slice
→ fleet-readiness check
→ Human + Orchestrator + isolated Agent Fleet
→ machine-enforced gates
→ human merge/release approval
→ observation and product learning
```

The fleet is an execution multiplier, not a product-decision mechanism. Use it only after direction, task boundaries, and evaluation are reliable.

## Directory map

| Directory | Purpose |
| --- | --- |
| `00-orientation` | Adoption order and usage rules |
| `01-operating-model` | Human accountability and agent boundaries |
| `02-quality` | Quality policy and enforceable gates |
| `03-security-privacy` | Security, privacy, GDPR, and supply chain policy |
| `04-product` | Product discovery and experiments |
| `05-delivery-architecture` | Architecture, delivery, and observability |
| `06-tools` | Replaceable tool profiles only |
| `07-project-adoption` | Project adoption checklist and agent instructions |
| `templates` | Structures for `SPEC.md`, `PLAN.md`, task packets, and other agent-generated artifacts |

## Non-negotiable separation

Files `01` through `05` define desired outcomes and constraints. They do not prescribe vendors or products. Tool selection belongs only in `06-tools`.

Do not adopt a tool because it is popular. Adopt it only when it enforces a named rule, controls a known risk, and produces actionable signal at an acceptable cost.

## Scaling rule

Start with one supervised agent and a small set of fast gates. Increase autonomy, parallelism, or gate strictness only after the human owner can reliably review, operate, and maintain the resulting system.
