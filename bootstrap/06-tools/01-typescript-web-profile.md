# Candidate profile: TypeScript web application

This is a reference profile. It is not a mandatory list and not a recommendation to install everything on day one.

| Guardrail | Possible implementation | Suggested initial layer |
| --- | --- | --- |
| Typing | TypeScript strict | development / pre-commit |
| Style and code quality | ESLint + Prettier | development / pre-commit |
| External contracts | Zod | application + tests |
| Unit/integration tests | Vitest or equivalent | pre-push / CI |
| Browser tests | Playwright or equivalent | CI |
| Mutation testing | Stryker | CI, changed files |
| Secrets | Gitleaks | pre-commit + CI |
| SCA | OSV-Scanner + npm audit | CI |
| SAST | CodeQL, Semgrep, or SonarCloud | CI |
| Duplication | jscpd | CI |
| Cycles | madge | CI |
| Shell | ShellCheck | CI |
| YAML | yamllint | CI |
| Deployment/preview | Vercel or equivalent | CI / pull request |

## Adoption order

1. types, formatting, lint, tests, and secrets;
2. CI, reproducible build, and preview;
3. SCA and SAST;
4. architectural boundaries, duplication, and cycles;
5. mutation testing, performance, and more expensive controls.
