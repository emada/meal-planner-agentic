# Privacy assessment

Scope: the application defined in `SPEC.md`. Last reviewed at S0 (2026-08-09). This is a short assessment because the application collects nothing — that is the finding, not an omission.

## Summary

**No personal data is collected, stored, or transmitted by us.** There is no account, no backend, no database, no analytics, no advertising, no tracker, and no cookie. The only data the application writes is a shopping list held in the user's own browser.

## The required questions

Answered per `.ai-engineering/.bootstrap/03-security-privacy/02-privacy-gdpr-apps.md`.

| #   | Question                                                 | Answer                                                                                                                                                                               |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Is the data necessary?                                   | The shopping list is the product. Nothing else is stored                                                                                                                             |
| 2   | What specific purpose does it serve?                     | Letting the user read back ingredients they chose to save                                                                                                                            |
| 3   | What legal basis applies?                                | None required — no personal data is processed by us, and the data never leaves the user's device                                                                                     |
| 4   | Where is it stored and processed?                        | `localStorage` in the user's browser, on the user's device. Never transmitted                                                                                                        |
| 5   | Who can access it?                                       | Only the user, in that browser profile. We have no access and no way to obtain it                                                                                                    |
| 6   | What is the retention period?                            | Controlled entirely by the user: the list persists until removed, cleared, or the browser's site data is cleared                                                                     |
| 7   | How can it be accessed, corrected, exported, or deleted? | Access and correction through the shopping-list view; deletion per item and in full via the clear control (R3.8, AC12); complete deletion also via normal browser site-data clearing |
| 8   | Can the feature be delivered without it?                 | No — a shopping list that does not persist fails the brief                                                                                                                           |

## Data inventory

| Data                                                | Category                                              | Location                              | Transmitted to | Retention                                               |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- | -------------- | ------------------------------------------------------- |
| Ingredient names and measure strings the user saved | Not personal data                                     | Browser `localStorage`                | Nobody         | Until the user removes it                               |
| Search terms typed by the user                      | Potentially free text; not solicited as personal data | Sent to TheMealDB as the search query | TheMealDB      | Not retained by us; TheMealDB's own retention is theirs |

Users can type anything into a free-text field. The application never stores search terms, never logs them, and never sends them anywhere except TheMealDB as the search query itself.

## Third parties and subprocessors

| Party     | Role                   | What reaches them                                                                     | Basis                                            |
| --------- | ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TheMealDB | Recipe data and images | The search term; the user's IP address as an unavoidable property of any HTTP request | Necessary to deliver the product's core function |
| Vercel    | Static hosting         | The user's IP address and standard request metadata in server logs                    | Necessary to serve the application               |

No other subprocessor. No international transfer beyond what these two involve inherently.

## Guardrails in force

- **Data minimization** — nothing collected beyond the shopping list the user builds deliberately.
- **Purpose limitation** — the list is used only to display the list.
- **Private by default** — device-local storage, no sync, no upload, no account.
- **No cookies** — none set, therefore no consent banner is required.
- **No analytics or trackers** — none, and adding one is a material change requiring a spec revision.
- **No PII in logs** — the application does not log user input anywhere.
- **User-controlled deletion** — per-item and full-clear controls (S4), plus normal browser data clearing.

## Decisions and residual points

- **Client-side error reporting is not adopted.** It would introduce a new processor and could capture user-typed content in error payloads. See `docs/architecture/ADR-0003-no-client-error-reporting.md`. Revisiting requires an explicit spec revision.
- **`localStorage` is not encrypted.** Correct for this data class: anyone with access to the unlocked device already has access to the browser, and the data is a grocery list. No mitigation proposed.
- This assessment records engineering decisions. It is not legal advice. Any change that introduces accounts, a backend, analytics, or third-party scripts voids it and requires a new assessment and human legal review before merging.
