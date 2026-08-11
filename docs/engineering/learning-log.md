# Engineering learning log

What went wrong while building this, what fixed it, and — the only part that
matters later — **what would have caught it earlier**.

The operating contract has a learning loop, but it covers _product_ learning:
outcomes feed back into the specification through explicit review. Nothing
covered _engineering_ learning: how the work itself failed and how the method
should change. This file is that, kept per product; entries marked `propose`
are candidates for the contract itself, promoted through a reviewed
dependency-update pull request rather than by editing a pinned submodule.

## How to read an entry

- **Scope** — `local` if it is about this product, `propose` if the lesson is
  general and belongs in SWEAI Builder, `promoted` once it is in a contract
  pull request.
- **Caught by** — a gate, a review round, or a human. Which one is the finding.
  A defect caught by a human is a gate that does not exist.
- **Guard** — what now fails if it recurs, or "none" if nothing does.

## Pending promotion

Entries below marked `propose` and not yet in a contract pull request: **20**.

---

## The recurring classes

Twenty-four entries, and they are not twenty-four different mistakes. Three
shapes account for most of them.

### A. Claim accuracy — a document asserting what the code does not do

The largest class by a wide margin, and the hardest to gate because prose is not
executable.

| #   | What happened                                                                                                                                                                                                                                                                                      | Caught by                            | Fix                                                              | Guard                                                                              | Scope   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| A1  | Two commit messages described work that did not exist: a widened selector and a fixture. The edits were partial — the commits that retract them say only the inner regex changed, and that the change was three comment lines and a filter. The message was written before the file was read back. | review, twice (`e68b7ba`, `21e47d7`) | verify the replacement applied, then read the file back          | none — the failure is in the tool, and only its consequence reaches a commit       | propose |
| A2  | The gate register said AC13 was not exercised, and that the app rendered an empty `<main>`, after both had stopped being true.                                                                                                                                                                     | review                               | replaced with the three tests that assert it                     | none — the register's prose claims about what is exercised are unguarded           | propose |
| A3  | Three threat-model rows stayed `Planned — S3` after S3 shipped.                                                                                                                                                                                                                                    | review                               | marked `Adopted`                                                 | `governance-consistency.test.ts`, widened to any dash and to a parenthesised slice | propose |
| A4  | The gate-count sentence said "eleven of twenty" after the table had grown. Three rounds of this.                                                                                                                                                                                                   | review, three times                  | counts derived from the table by test                            | `governance-consistency.test.ts`                                                   | propose |
| A5  | The same guard then **fell silent**: `\w` does not match the hyphen in "twenty-one", so every count sentence went unchecked in the commit that claimed to strengthen it.                                                                                                                           | review                               | `[\w-]+`, and `spell()` composed rather than listed              | probed three ways                                                                  | propose |
| A6  | It fell silent a second time when the documents stopped saying "N of M" and started saying "All M".                                                                                                                                                                                                | review                               | a branch for the new phrasing                                    | probed both ways                                                                   | propose |
| A7  | `INSIGHTS.md` was published as "measured and reproducible" with seven figures that did not reproduce.                                                                                                                                                                                              | review                               | every figure derived into a JSON the document is checked against | `insights-figures.test.ts`                                                         | propose |
| A8  | Correcting A7, the table was recomputed and the prose quoting it was not — the document contradicted itself.                                                                                                                                                                                       | review                               | the prose figures asserted by value, not only the table          | `insights-figures.test.ts`                                                         | propose |
| A9  | Describing one small defect took three rounds: the first version overstated it, the second over-corrected.                                                                                                                                                                                         | review, twice                        | state what a reconstruction shows, not what reasoning suggests   | none                                                                               | propose |

**What generalises.** A claim about code is worth exactly as much as the check
behind it. Where a claim can be derived — a count, a list, a status — derive it.
Where it cannot, the reviewer is the guard, and the reviewer needs the claim
stated precisely enough to falsify.

### B. Guards that cannot fail

A gate, test, or regex that passes because it matches nothing. Every one of
these was green before it was found.

| #   | What happened                                                                                                                                    | Caught by | Fix                                           | Guard                                                          | Scope   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------- | -------------------------------------------------------------- | ------- |
| B1  | `import/no-cycle` reported nothing: `eslint-plugin-import` could not parse the TypeScript it was pointed at.                                     | review    | `settings['import/parsers']`                  | proved with a real cycle                                       | propose |
| B2  | The AC13 clipping test could not fail — `overflow: hidden` clipped inside the card while the document never gained scroll width.                 | review    | assert intra-element clipping too             | 8 clipped without the fix, 0 with                              | propose |
| B3  | The stylesheet test read `font-weight` from an `h1`, which the user-agent stylesheet sets either way.                                            | review    | assert a property only our stylesheet defines | a 404/`text/plain` probe                                       | propose |
| B4  | `review-current` was declared and not enforced: the status was being published with raw `gh api`, bypassing the guard that binds it to the head. | review    | publish only through the tool that binds it   | the context is required                                        | propose |
| B5  | The reflow fixture used hyphenated words. CSS breaks on hyphens, so the text wrapped on its own and the clipping check could not fail.           | probe     | a genuinely unbreakable token                 | probed both ways                                               | propose |
| B6  | A negative probe ran against a stale preview server and tested the previous build.                                                               | probe     | kill the server; verify the artifact          | none                                                           | propose |
| B7  | The secret-scan probe planted AWS's documentation placeholder, which gitleaks allowlists by design. It proved nothing.                           | probe     | a `ghp_` shape                                | the register records a probe's **input**, not only its verdict | propose |
| B8  | The exhaustiveness check written to stop this class was itself substring-based: every single-digit number in the document was unguardable.       | review    | positional span matching                      | probed with seven shapes                                       | propose |
| B9  | The probes for that check tested a duplicate of it. Widening the live path left them green.                                                      | review    | one implementation, called by both            | probed                                                         | propose |

**What generalises.** A gate is untrusted until it has rejected something, and
the probe's _input_ has to be recorded, because a probe can pass for the wrong
reason. This project has now seen a probe fail to trip a gate three separate
ways: an allowlisted input, a stale artifact, and a fixture that could not break
the thing it guarded.

### C. Late responses and focus

The same defect shape, three slices apart.

| #   | What happened                                                                                                                                                | Caught by | Fix                                                            | Guard                                                                                                         | Scope |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- |
| C1  | The error alert took focus and discarded characters typed after it.                                                                                          | review    | take focus only if the user has not moved on                   | browser test                                                                                                  | local |
| C2  | A slow "surprise me" replaced a recipe the user had chosen.                                                                                                  | review    | abandon the in-flight request                                  | browser test                                                                                                  | local |
| C3  | A slow category lookup replaced the recipe the user was reading. Same shape, opposite direction, and the `cancel` that claimed to handle it was never wired. | review    | discard a response if a recipe appeared while it was in flight | `src/ui/CategoryBrowser.test.tsx`; the prop carrying the guard is required, so deleting it is a compile error | local |

**What generalises.** Any asynchronous result that lands in shared UI state
needs an answer to "what if the user moved on?" — and the answer must be wired,
not commented. `propose`: a checklist item for review.

---

## Everything else

| #   | What happened                                                                                                                                                                                       | Caught by | Scope   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| D1  | `.bootstrap` was committed as a symlink pointing outside the repository. Installation integrity needs a mechanical assertion, and now has one.                                                      | human     | propose |
| D2  | CodeQL flagged a file-system race in a script written for this project. Fixed, not suppressed.                                                                                                      | gate      | local   |
| D3  | The preview-deployment gate was left unproven on the argument that deploy logs already showed it. They show success, not refusal — different claims, and "the logs already show it" is not a probe. | human     | propose |

---

## What the human caught that no gate did

Three, and they are the most expensive kind because nothing mechanical was
watching:

1. **The landing page was empty.** Nine slices, every acceptance criterion
   green, and the front door served only someone who already knew what to type.
   No gate reads the product as a product.
2. **`.bootstrap` was a symlink.** An installation that looked right and was
   structurally invalid.
3. **The preview gate's exemption was a bad argument**, and the reasoning was
   mine.

Each was found by a human, not a gate. Two now have a test, written after the
fact: `e2e/browse.spec.ts` asserts the landing view is not empty, and
`src/test/repository-integrity.test.ts` asserts the submodule's Git mode. The
third has none, and "a bad argument" is not a category a test can hold.

That is the honest summary of what the gates are for and what they are not: they
catch what someone already thought to check.
