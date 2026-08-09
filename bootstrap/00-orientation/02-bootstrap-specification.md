# Bootstrap Specification

## Goal

Create and evolve a reusable, opinionated bootstrap for AI-assisted software engineering.

The bootstrap initializes projects in which coding agents accelerate delivery while humans retain responsibility for product decisions, risk, quality, security, privacy, and integration.

## Scope

- Maintain reusable, tool-independent policies for agent operation, engineering quality, security, privacy, product discovery, architecture, delivery, and observability.
- Keep tool profiles separate from policies and guardrails.
- Provide a root loader and concise, LLM-oriented project templates.
- Support projects that begin with either an ambiguous problem or a complete specification.
- Support modern web applications, initially through a TypeScript-oriented tool profile.
- Include GDPR and Australian Privacy Principles considerations where personal data is relevant.

## Non-goals

- Do not prescribe one AI coding tool, cloud provider, or deployment vendor.
- Do not install every quality or security tool by default.
- Do not replace legal review, human code review, or product discovery with automation.
- Do not make the bootstrap itself a production application.

## Design constraints

- All bootstrap content is written in English.
- Instructions are concise, imperative, and optimized for LLM execution.
- Policies state outcomes and constraints; tool profiles state possible implementations.
- Controls are introduced only when they address a named risk with actionable signal.
- `AGENTS.md` is the canonical cross-tool instruction file.
- `CLAUDE.md` is a minimal Claude Code compatibility shim.
- A new goal-first project contains root `AGENTS.md`, `CLAUDE.md`, and `GOAL.md`, plus the `bootstrap/` directory.
- A new project does not contain `SPEC.md` or `PLAN.md`; a lead agent drafts them sequentially and the human approves each.
- An implementation fleet is prohibited until a working harness and first vertical slice demonstrate reliable evaluation.
