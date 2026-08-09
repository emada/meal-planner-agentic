# Tools are implementations, not rules

This directory contains replaceable tool profiles that implement bootstrap guardrails.

Adopt a tool only when it:

1. controls a named risk;
2. complements existing controls;
3. has acceptable execution and maintenance cost;
4. runs in the correct delivery layer;
5. produces useful signal instead of noise.

## Required separation

| Rule | Possible implementation |
| --- | --- |
| No secrets in Git | Gitleaks |
| No known critical dependency vulnerabilities | OSV-Scanner, npm audit |
| No type errors | TypeScript strict |
| No new cycles | madge |
| Effective tests | Stryker |

Changing a tool does not change the rule. It only changes the control implementation.
