# Human + Agent Fleet workflow

## Control plane

The human defines product direction, what good means, acceptable risk, and whether work may integrate or release.

## Discovery plane

One lead agent helps the human frame the problem, expose assumptions, compare options, and produce a draft specification. An implementation fleet is prohibited while product direction is unresolved.

## Execution plane

After specification and plan approval, agents execute bounded tasks. Parallel agents work only on independent scopes in isolated workspaces.

## Evaluation plane

Tests, contracts, types, architecture checks, SAST, SCA, secret scanning, privacy controls, and CI evaluate generated work at machine speed. Reviewer agents supplement these controls but do not accept risk.

## Integration plane

An orchestrator validates actual diffs and evidence, integrates compatible changes, reruns authoritative gates, and presents a consolidated proposal. The human owns merge and release approval.

## Learning loop

Observed product and technical outcomes feed back into human-led discovery. Product learning changes the specification through explicit review, not silent implementation drift.
