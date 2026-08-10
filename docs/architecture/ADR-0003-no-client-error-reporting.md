# ADR-0003: No client-side error reporting

- Status: Accepted
- Date: 2026-08-09
- Decision maker: human (plan approval, decision P3)

## Context

`SPEC.md` targets real users, and `.ai-engineering/.bootstrap/05-delivery-architecture/03-observability-flow.md` asks for error, latency, and availability signals. The usual answer is a client-side error reporter such as Sentry.

That answer conflicts with two constraints already approved. The spec's privacy position is that no third party beyond TheMealDB receives anything, and no analytics or tracker is used. The operating contract also forbids adding an external service or a data processor without explicit approval and a stated trade-off.

## Decision

Do not adopt client-side error reporting. Observability for now is:

- Vercel's own availability and error-rate metrics for the hosted deployment;
- a manual post-deploy smoke check of the primary journeys;
- CI-level signals — gate failures, flaky tests, rework — as the engineering-flow view.

## Consequences

- **Accepted cost, stated plainly:** runtime errors that occur only on real users' devices are invisible to us. We learn about them when a user reports one or when a smoke check catches one. For an application with no accounts and no data at risk, that is a tolerable blind spot, not a safe one.
- Error boundaries and visible failure states remain acceptance criteria (AC3), so failures are at least visible to the user rather than silent.
- Revisiting this is an explicit `SPEC.md` revision, not an implementation detail. It would add a processor and could capture user-typed content in error payloads, so it requires a privacy review and human approval — see `docs/privacy/assessment.md`.
