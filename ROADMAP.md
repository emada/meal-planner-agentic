# Roadmap

What this product does not do, and what would change that. Written after the
product was complete, so nothing here is a commitment — it is the record of
decisions taken and deferred, kept so the next person does not have to
reconstruct them from git history.

The corresponding record of what **did** go wrong is
[`docs/engineering/learning-log.md`](docs/engineering/learning-log.md).

## Deferred product scope

Both were recorded in `SPEC.md` as candidate scope from the first discovery
round (`D2`, `O4`) and have never been requirements. The human confirmed on
2026-08-12 that they stay deferred.

### Filter by area

TheMealDB exposes `list.php?a=list` (roughly thirty cuisines) and
`filter.php?a=Italian`. Technically this is close to a copy of S8: the same pair
of endpoints, the same partial-meal response, the same `lookup.php` follow-up,
the same grid.

The open question is not technical. It is whether two browse dimensions side by
side help a home cook or just fill the screen. Nothing in `GOAL.md` asks for it,
and the search box already answers "I want Italian".

### Check off items while shopping

A checkbox per ingredient, persisted, so a list read in a shop can be worked
through without deleting anything. The brief says the list is read in a shop,
which is the argument for it; removal already exists, but striking an item and
deleting it are different gestures, and someone mid-aisle wants to still see
what they have picked up.

Cost: a third storage migration (`v2` → `v3`), and `AC12` would need a
counterpart for the new state surviving a reload.

## Accepted risk that could be retired

### TheMealDB developer key `1`

`SPEC.md` `O1`, accepted 2026-08-10 and re-accepted 2026-08-12 after its shape
changed. The key is TheMealDB's public test key: rate-limited, unsupported for
production, no availability commitment. `docs/security/threat-model.md` carries
the full acceptance.

What changed at S8: the category browser loads on arrival, so a rate limit is
spent per page view. Before that the floor was zero for a visitor who never
searched.

Retiring it means obtaining a supported key and reading it from configuration,
with the test key as the local default. That is a small change — the client
already builds its own URLs in one place — gated on the human deciding the
subscription is worth it. Adding a caching proxy instead would contradict the
no-backend non-goal and needs a spec revision.

## Known limits, recorded rather than scheduled

None of these is a planned change. They are the places where this repository
knows it is weaker than it looks, kept here so a reader does not have to find
them by accident.

|                                                                                    |                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| One gate is proven at the tool, not at the wiring                                  | CI runs `gitleaks-action`; the probe ran the gitleaks CLI. Closing it means pushing a credential-shaped string to the remote                    |
| The pre-push layer has no probe of its own                                         | it is a layer, not a gate row; nothing shows it rejects a failing build                                                                         |
| The promotion check cannot tell a wrong destination from a right one               | it resolves the file and stops there. Two rows once pointed at a real file that did not hold their lesson                                       |
| The production smoke check is not derived evidence                                 | reproducible with `npm run smoke:prod`, but a human decides when it runs                                                                        |
| No accessibility audit by a practitioner, and no screen-reader testing             | three AA criteria remain unverified; `docs/quality/accessibility.md` names them and records the human\'s acceptance of this state on 2026-08-12 |
| Every semantic review was performed by a subagent of the agent that wrote the code | isolated context, not independent judgement                                                                                                     |

## Not planned

Recorded so they are not proposed again as if new: user accounts, a backend of
our own, syncing a list across devices, meal scheduling by day or week,
nutrition data, portion scaling, pantry tracking, recipe creation, editing,
rating or favouriting, offline support, analytics or any third-party script
beyond TheMealDB, and any unit arithmetic on measures.

That is the whole of `SPEC.md`'s non-goals list. Favouriting is called out by
name there as the one most likely to be re-proposed, because it is absent from
the brief rather than refused by it.
