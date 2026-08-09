# ADR-0002: Four modules with a one-way dependency rule

- Status: Accepted
- Date: 2026-08-09
- Decision maker: human (plan approval), implemented at S0

## Context

Two kinds of untrusted data enter this application: TheMealDB responses and whatever sits in `localStorage`. `SPEC.md` requires both to be validated (R3.7) and requires the pure logic — ingredient extraction, grouping, alphabetical ordering — to be unit-tested (R5.1). Architectural intent that lives only in a document decays.

## Decision

Four modules, one permitted direction of dependency:

```text
src/domain/    pure logic; no I/O, no React, no imports from siblings
src/api/       TheMealDB client and response schemas; no imports from siblings
src/storage/   localStorage adapter and schema validation; may import domain
src/ui/        views and components; may import api, domain, storage
```

Two rules follow:

1. Every value crossing a boundary is parsed through a schema. Unparsed third-party data never reaches `ui/`.
2. `domain/` stays pure, so its tests need no DOM, no network, and no fakes.

Both are enforced in `eslint.config.js` — `import/no-restricted-paths` for direction, `import/no-cycle` for cycles — not by review.

## Alternatives considered

- **Feature folders** (`src/search/`, `src/shopping-list/`). Better for large applications with many teams. Rejected here: the interesting boundary is trust, not feature, and there are two features.
- **Documented convention with no enforcement.** Rejected. The .bootstrap contract is explicit that repeatable quality must not depend on heroic manual review.

## Consequences

- Adding a fifth module means updating the zone list; the rule is visible and mechanical.
- `storage/` depending on `domain/` is deliberate: the stored shape is a domain concept, and duplicating it in both places would let them drift.
- A file placed in the wrong module fails lint rather than passing review unnoticed.
