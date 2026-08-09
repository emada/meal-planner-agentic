# Secrets and supply chain

## Rules

- Do not commit keys, tokens, credentials, or personal data.
- Use environment variables, a secret manager, or equivalent controls.
- Scan direct and transitive dependencies before promotion.
- Keep lockfiles and intentional versions.
- Produce component evidence, such as an SBOM, when risk justifies it.
- Review permissions granted to agents, CI, and external integrations.
- Grant agents only the tools and credentials required for the assigned task.
