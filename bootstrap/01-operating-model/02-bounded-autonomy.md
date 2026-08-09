# Bounded autonomy

Preferred progression: one accountable human with one lead agent, followed by a small agent fleet only when direction, boundaries, and evaluation are reliable. Do not give an autonomous swarm a large, ambiguous goal.

## A delegable task includes

- small scope;
- explicit outcome;
- bounded files or subsystem;
- acceptance criteria;
- technical constraints;
- verification commands;
- explicit stop condition.

## Rules

- Do not use an implementation fleet for product discovery.
- Prove the harness and first vertical slice with one agent before parallelizing.
- Prefer small, vertically complete changes over large batches.
- Agents produce reviewable diffs, not unstructured chat code.
- Do not increase concurrency beyond human review capacity.
- Use worktrees or equivalent isolation for parallel tasks.
- Do not allow parallel agents to modify the same area without explicit coordination.
- Stop and request clarification when requirements or boundaries are ambiguous.

## Recommended progression

```text
human + one lead agent for discovery
→ one implementation agent + working gates
→ one verified vertical slice
→ two isolated tasks
→ parallel specialists
→ fleet orchestration
```
