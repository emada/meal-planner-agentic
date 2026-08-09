# Recipe Search & Meal Planner Specification

Status: Approved

## Goal

Let a person find recipes quickly from a public recipe database and collect the ingredients they need into a shopping list they can consult while shopping. Success is a search-to-shopping-list flow that is fast, obvious, and works without an account.

## Users

Single user type: a home cook planning meals on their own device.

- No accounts, no authentication, no multi-user features.
- Uses one browser on one device; the shopping list lives in that browser's local storage.
- Uses both mobile and desktop browsers (D4, resolved). Mobile matters because shopping lists are read in a shop.

## Requirements

Sourced from `GOAL.md`. Requirements marked _(derived)_ are implied by the brief and are proposed, not stated by the human.

### R1 — Recipe search

- R1.1 A search box accepts a free-text term and runs the search when the user presses Enter.
- R1.2 Results come from TheMealDB search endpoint: `https://www.themealdb.com/api/json/v1/1/search.php?s={term}`.
- R1.3 Results render in a grid. Each card shows image (`strMealThumb`), title (`strMeal`), category (`strCategory`), area (`strArea`).
- R1.4 _(derived)_ The empty-result case is a first-class state: TheMealDB returns `{"meals": null}` for no match, and the UI must say so rather than showing an empty grid.
- R1.5 _(derived)_ Loading and network-failure states are visible and recoverable (retry available).

### R2 — Recipe detail

- R2.1 Clicking a result opens a modal/panel with the full recipe: ingredients with measures, instructions, YouTube link, source link.
- R2.2 Ingredients come from the `strIngredient1..20` / `strMeasure1..20` field pairs; empty, null, and whitespace-only pairs are discarded.
- R2.3 _(derived)_ YouTube and source links render only when the field is non-empty, and open in a new tab.
- R2.4 _(derived)_ The modal is keyboard-accessible: focus moves into it on open, is trapped while open, Escape closes it, and focus returns to the element that opened it.

### R3 — Shopping list builder

- R3.1 The detail view has a button labelled "add to my shopping list".
- R3.2 Clicking it iterates the ingredient/measure pairs of that recipe and persists them to local storage.
- R3.3 Every page/view has a button labelled "view my shopping list".
- R3.4 Opening the shopping list shows all stored ingredients in alphabetical order with their measures.
- R3.5 _(derived)_ The list survives a page reload and a browser restart.
- R3.6 Ingredients are grouped by name (case- and whitespace-insensitive), one entry per ingredient, with each contributing measure listed beneath it. Measures are never converted, summed, or otherwise arithmetically combined. (D1, resolved)
- R3.7 _(derived)_ Corrupt or foreign local-storage content is detected and recovered from rather than crashing the app. Data read from local storage is validated at the boundary, same as data read from the API.
- R3.8 The user can remove a single ingredient entry and clear the whole list. Clearing the whole list asks for confirmation. (D2, resolved)

### R4 — Navigation

- R4.1 From anywhere in the app the user can reach: search, shopping list, and "surprise me".
- R4.2 "Surprise me" fetches `https://www.themealdb.com/api/json/v1/1/random.php` and shows the result in the same recipe modal/panel as R2.

### R5 — Quality baseline

- R5.1 Business logic (ingredient extraction, list grouping, sorting, storage validation) is unit-tested.
- R5.2 The primary journeys are covered by browser tests at both a mobile and a desktop viewport: search → detail → add to list; view and edit list; surprise me → detail.
- R5.3 The app targets real users (D3, resolved), so the full tooling profile applies in the adoption order of `bootstrap/06-tools`: types, format, lint, tests, secrets → CI, reproducible build, preview deploy → SCA and SAST → boundaries, duplication, cycles → mutation and performance. Exact mandatory set, layer, and owner per gate are fixed in `PLAN.md` and recorded in `docs/quality/gates.md`.
- R5.4 Because the app is user-facing, it needs a threat model (`docs/security/threat-model.md`) and a privacy assessment (`docs/privacy/assessment.md`) recording the no-personal-data position, however short.

## Non-goals

- User accounts, login, server-side persistence, or syncing a list across devices.
- Any backend service of our own. The app is a static client calling TheMealDB directly.
- Meal scheduling by day/week, nutrition data, portion scaling, or pantry tracking.
- Recipe creation, editing, rating, or favouriting (favourites are not in the brief; not proposed).
- Offline support / installable PWA.
- Analytics, tracking, cookies, or any third-party script beyond TheMealDB.
- Unit arithmetic on measures (converting or summing "1 tbsp" + "50g").

## Constraints

- **External dependency**: TheMealDB public API, developer key `1` as specified in `GOAL.md`. That key is a test key: rate-limited, unsupported for production traffic, no availability commitment. The service can be slow or down, and the app must degrade visibly, never silently. Because the app is now intended for real users, the key itself is an open decision — see O1.
- **Persistence**: browser `localStorage` only. Capped (~5MB), synchronous, and can be unavailable in private-browsing modes — the app must not crash when writes fail.
- **Privacy**: no personal data is collected, stored, or transmitted by us. Search terms go to TheMealDB as part of normal use; no analytics, no logging of user input to any third party. No cookie banner is required because no cookies are set. This is the whole privacy position — it should stay true, and any change to it is a material decision requiring approval.
- **Security surface**: recipe text and image URLs are third-party content rendered in our UI. Instructions must be rendered as text, never as HTML, to avoid injection. Outbound links use `rel="noopener noreferrer"`.
- **Accessibility**: keyboard operable, visible focus, labelled controls, sufficient contrast. Modal follows the dialog pattern (R2.4).
- Stack and hosting are not yet decided — see D2 and D3.

## Acceptance criteria

Each is observable and testable.

- **AC1** Typing `beef` and pressing Enter shows a grid of matching recipes, each card showing thumbnail, title, category, and area.
- **AC2** A search with no matches (e.g. `zzzzz`) shows an explicit "no results" message, not a blank grid.
- **AC3** With the network failing, a search shows an error message and a working retry control; the app remains usable.
- **AC4** Clicking a result opens a modal showing ingredients with their measures, full instructions, and — when present in the data — working YouTube and source links. No blank or `null` ingredient rows appear.
- **AC5** The modal can be opened, operated, and closed by keyboard alone; Escape closes it; focus returns to the triggering card.
- **AC6** Clicking "add to my shopping list" stores that recipe's ingredient/measure pairs; the shopping list then shows them in alphabetical order by ingredient.
- **AC7** The "view my shopping list" control is reachable from the search view, the shopping-list view, and while a recipe modal is open.
- **AC8** After a full browser restart, the shopping list still shows previously added items.
- **AC9** Adding two recipes that share an ingredient produces one grouped entry for that ingredient listing both measures verbatim, with no converted or summed quantities.
- **AC10** With `localStorage` containing malformed JSON under our key, the app loads, shows an empty or recovered list, and does not throw.
- **AC11** "Surprise me" from any view opens a random recipe in the same modal, with the same detail and add-to-list behaviour.
- **AC12** A user can remove one ingredient from the shopping list and can clear the list entirely after confirming; both changes survive a reload.
- **AC13** Every view is usable at a 375px-wide mobile viewport and at desktop width, with no horizontal scrolling and no clipped or unreachable controls.
- **AC14** The primary journeys pass as automated browser tests at both viewports, and the mandatory gate set passes on CI from a clean checkout.

## Decisions resolved

- **D1 — Duplicate ingredients across recipes.** Resolved: group by ingredient name, list each contributing measure separately, never do unit arithmetic. Encoded as R3.6 / AC9.
- **D2 — Scope beyond the literal brief.** Resolved: literal brief plus remove-item and clear-list. Browse/filter by category and area, and check-off-while-shopping, are deferred — not rejected. Encoded as R3.8 / AC12.
- **D3 — Delivery context and gate depth.** Resolved: intended for real users. Full tooling profile in adoption order, plus threat model and privacy assessment. Encoded as R5.3 / R5.4. Raises O1 below.
- **D4 — Target devices.** Resolved: responsive, mobile and desktop. Encoded as R5.2 / AC13.

## Open decisions

Blocking — needs a human answer before the affected work starts.

- **O1 — TheMealDB production access.** _Raised by D3._ Key `1` is TheMealDB's public test key. It is documented for development and testing, is rate-limited, and carries no availability commitment; the maintainers offer a supported key to Patreon supporters for production use. `GOAL.md` names the `v1/1/` endpoints explicitly, so the first slice will use them as specified. But "intended for real users" plus a test key is a genuine reliability and terms-of-use exposure that I should not accept on your behalf. Options: (a) obtain a supported key and read it from configuration, keeping the test key as the local-development default; (b) stay on key `1` and accept the risk explicitly, recorded in the threat model; (c) add a thin caching proxy of our own — which contradicts the "no backend of our own" non-goal and would need that non-goal revised. Recommendation: (a), with the key injected at build time and never committed. This does not block spec approval; it blocks the production-hosting slice.
- **O2 — Hosting and deployment target.** _Raised by D3._ Real users implies a hosting decision (static host such as Vercel/Netlify/Cloudflare Pages, or existing infrastructure you already run) and whether preview deploys per pull request are wanted. Deferred to `PLAN.md` as a material decision requiring your approval — noted here so it is not silently chosen.

Non-blocking — recorded to prevent silent invention.

- **O3** Visual direction is unspecified. Default: clean, neutral, system-font UI with no design-system dependency, unless directed otherwise.
- **O4** Deferred scope from D2 (browse/filter by category and area; check-off while shopping) is recorded as candidate future slices, not requirements.
- **O5** No formal WCAG conformance level has been set. Default: meet the accessibility constraints listed above and keep automated a11y checks in CI; a specific conformance target can be set later.

## Approval

- Approved by: bmi.machado@gmail.com
- Approved on: 2026-08-09
