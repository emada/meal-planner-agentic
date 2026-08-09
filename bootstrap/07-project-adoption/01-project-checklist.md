# Project adoption checklist

## Project initialization

- [ ] Create root `AGENTS.md` that loads `bootstrap/AGENTS.md`.
- [ ] Create root `CLAUDE.md` containing `@AGENTS.md` when Claude Code is used.
- [ ] Create root `GOAL.md` containing only the original input placeholder.
- [ ] Include the complete `bootstrap/` directory.
- [ ] Paste the original problem statement, customer request, or discovery notes into `GOAL.md`.
- [ ] Do not create `SPEC.md` or `PLAN.md` before the workflow produces them.

## Before planning

- [ ] One lead agent, not a fleet, assisted product discovery.
- [ ] `SPEC.md` exists, is materially complete, and records human approval.
- [ ] Separate assumptions and ambiguity from explicit requirements.
- [ ] Define observable acceptance criteria.

## Before writing the first code

- [ ] `PLAN.md` records human approval.
- [ ] Bound the first vertical slice.
- [ ] Make an explicit decision about personal data, analytics, and external services.
- [ ] Define proportional quality, security, privacy, architecture, delivery, and observability controls.

## Before the first merge

- [ ] Types, formatting, lint, and baseline tests work.
- [ ] Secret commits are blocked.
- [ ] CI runs reproducible checks.
- [ ] `main` remains deployable.
- [ ] A safe way exists to preview or test the change.

## Before increasing autonomy

- [ ] One agent completed the first vertical slice end to end.
- [ ] Gates are low-noise and failures are actionable.
- [ ] The human can review agent output without creating a review queue.
- [ ] Parallel work is isolated by worktrees or equivalent.
- [ ] At least two tasks are independent and bounded.
- [ ] Every task has allowed scope, acceptance criteria, verification commands, and a stop condition.
- [ ] Security, privacy, and cost are considered.
- [ ] Initial fleet concurrency is capped at two agents.
