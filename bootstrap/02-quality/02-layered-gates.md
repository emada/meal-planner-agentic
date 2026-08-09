# Layered gates

Run each check at the cheapest layer that provides sufficient confidence.

| Layer | Purpose | Examples |
| --- | --- | --- |
| Editor/development | Immediate feedback | types, diagnostics, focused tests |
| Pre-commit | Block cheap errors | formatting, lint, secrets, local checks |
| Pre-push | Wider change verification | build, tests, targeted coverage |
| CI | Reproducible trusted verification | full tests, security, architecture |
| Post-deploy | Validate real behaviour | errors, performance, availability |

## Rules

- A mandatory gate blocks promotion on failure.
- Gates report actionable remediation.
- Put slow checks in the correct layer. Do not turn commits into a waiting ritual.
- Keep `main` protected and deployable.
- Change owners fix material violations in their changed scope. They do not inherit unlimited repository debt.
