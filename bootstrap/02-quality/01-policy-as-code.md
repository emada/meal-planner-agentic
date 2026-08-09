# Policy as code

Engineering quality is a control problem: state the standard, encode the check, and block material deviations.

## Rules

- Do not rely on heroic manual review for repeatable quality.
- Encode as many criteria as possible as tests, contracts, static analysis, or executable policy.
- Apply identical rules to human-written and agent-written code.
- Do not allow material warnings to become permanent noise.
- Every rule has an owner, rationale, failure action, and documented exception path.

## Typical enforceable criteria

- functional behaviour;
- API contracts;
- types and style;
- coverage and test effectiveness;
- cyclic dependencies and duplication;
- secrets and known vulnerabilities;
- performance limits;
- architectural boundaries.

## Exception rule

If a requirement cannot be enforced mechanically, record the decision, reviewer, rationale, expiry date if applicable, and supporting evidence.
