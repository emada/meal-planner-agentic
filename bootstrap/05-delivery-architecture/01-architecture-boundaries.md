# Architecture and boundaries

Architecture must be understandable by humans and agents, and material enough to verify mechanically.

## Rules

- Start simple. Evolve with evidence. Do not anticipate abstractions.
- Define modules and responsibilities explicitly.
- Avoid cyclic dependencies.
- Validate data at system boundaries.
- Keep dependencies intentional and minimal.
- Record material decisions as ADRs.
- Convert architectural rules into tests, structural analysis, or lint whenever possible.
- Separate deployment from release. Use feature flags when progressive exposure is appropriate.
