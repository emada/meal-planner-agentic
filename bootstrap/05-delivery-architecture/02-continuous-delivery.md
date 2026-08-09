# Continuous delivery

Target flow:

```text
intent → small task → plan → implementation → verification → review → approval → main → deploy → observation
```

## Rules

- Keep `main` protected, short-lived, and deployable.
- Keep changes small and reversible.
- Pull requests, or equivalent, include test and check evidence.
- Create previews when UI or user behaviour is relevant.
- Treat configuration and infrastructure as code where applicable.
- Never expose secrets in the repository or CI logs.
- Every deployment has a risk-proportionate remediation or rollback path.
