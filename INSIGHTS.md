# Where the time went

Measured from git and the GitHub API on 2026-08-11, not estimated. Every number
here is reproducible from `git log --all` and `gh pr list`.

The question that prompted it: **is this slow because only one agent is
building?** The data says no, and points somewhere else.

## The shape of the whole run

|                                        |              |
| -------------------------------------- | ------------ |
| Wall clock, first commit to last       | **47.3 h**   |
| Active work (gaps over 30 min removed) | **14.2 h**   |
| Waiting for a human                    | **33.1 h**   |
| Commits                                | 78           |
| Of those, `fix` commits                | **38 (49%)** |
| Pull requests merged                   | 14           |
| Median CI run                          | **90 s**     |

Two thirds of the calendar time was the agent waiting. The seven gaps over an
hour — including two of about 13 hours — are overnight, not work. Comparing
"two days" against "an app this size" measures the wrong thing.

## Per slice, the part that is actually agent time

S0 and the governance PR are excluded: their spans are dominated by waiting for
approvals, not by building. What is left is the product.

| Slice                       | Building | After the first review | Review rounds |
| --------------------------- | -------: | ---------------------: | ------------: |
| S1 search and results grid  |      8 m |                    9 m |             2 |
| S2 recipe modal             |     11 m |                   15 m |             2 |
| S3+S4 shopping list         |     10 m |                   22 m |             3 |
| S5 surprise me              |      8 m |                   27 m |             3 |
| S6 remaining gates          |      9 m |                   39 m |             5 |
| S7 production verification  |      7 m |                    5 m |             1 |
| S8 browse by category       |     12 m |                   25 m |             3 |
| S9 close the disclosed gaps |     10 m |                   14 m |             2 |
| AC4 source-link fix         |      0 m |                   16 m |             4 |
| **Total**                   | **76 m** |              **172 m** |        **25** |

**69% of slice time is spent after the first review.** Writing the feature took
about ten minutes per slice. Getting it past review took two to four times that.

Median gap between consecutive `fix` commits — one review round-trip — is
**9 minutes**.

## So: would more agents have helped?

**No, and the plan already predicted it.** `PLAN.md` records that S4 and S5 were
the only genuinely independent pair, and that by the time S3 landed they were
small enough that running them sequentially cost less than coordinating two
workspaces. That was a judgement call at the time; the timings confirm it — S4
and S5 together took 67 minutes, of which 49 were review.

Three reasons parallelism would not have moved the number:

1. **The slices are a dependency chain.** S2 needs S1's grid, S3 needs S2's
   modal, S5 reuses S2's modal unchanged. Only one pair was parallelizable.
2. **Building is not the bottleneck.** 76 minutes of building versus 172 of
   review. Doubling build throughput moves the total by less than 15%.
3. **A second builder adds a third party to the review queue,** which is the
   part that is already saturated.

The reviewer _is_ already a separate agent. The bottleneck is not how many
agents exist — it is that review is serial, and that too much of it was spent
on defects that should never have reached it.

## What would actually be faster

Ranked by measured impact, not by appeal.

### 1. Run review dimensions in parallel instead of in rounds

Today: submit → one reviewer returns N findings → fix → resubmit → repeat.
S6 took five rounds; the AC4 fix took three rounds for a single paragraph.

Each round costs a full reviewer pass over the whole diff. Running several
reviewers concurrently on distinct lenses — claim accuracy, tests that cannot
fail, product correctness, accessibility — and folding their findings into one
commit would collapse most of those rounds. **This is where parallel agents pay,
and it is not where the question assumed.**

Rough size of the prize: if the 25 fix commits had arrived in 9 rounds instead
of 25, review time drops from 172 to roughly 70 minutes.

### 2. Self-check the recurring classes before submitting

The findings were not random. Three classes account for most of them:

- **Claim accuracy** — a document or commit message asserting something the
  code does not do. By far the largest group.
- **Guards that cannot fail** — a test, gate, or regex that passes because it
  matches nothing. This project shipped at least six.
- **Focus and late-response handling** — the same defect shape recurring across
  S2, S5 and S8.

A pre-submit pass targeted at exactly those three would catch a large share
before a reviewer sees them. That is cheaper than a review round, because it
does not pay the round-trip.

### 3. Verify every scripted edit

Three times in this project a scripted find-and-replace silently matched
nothing, and the commit message claimed work that did not exist. Twice it took a
reviewer to notice. Asserting that a replacement applied — and reading back the
file — costs seconds and removes a whole class of false claims.

### 4. Probe hygiene

Three negative probes proved nothing and were briefly believed:

- a planted AWS documentation placeholder, which gitleaks allowlists by design;
- a probe that ran against a stale preview server and tested the previous build;
- a reflow fixture built from hyphenated words, which CSS breaks on, so the
  clipping check could not fail.

Each was caught, but only after being recorded as evidence. **A probe must be
shown to fail before its pass means anything** — and its input has to be written
down, not just its verdict.

### 5. Batch the human checkpoints

33 of 47 hours were spent waiting. Most of that is unavoidable and correct —
the human sleeps, and the approvals were real decisions. But the run stopped for
approval at S0, then again for the autonomy envelope, then again mid-build. The
one long autonomous stretch, S1 through S9, covered nine slices in about four
hours of active time.

Fewer, larger checkpoints with a clear envelope beat many small ones.

## The honest caveat

Every review in this project was performed by a subagent of the agent that wrote
the code. Isolated context, but not independent judgement. Some fraction of the
25 fix commits exists because that reviewer is good; some other fraction of
defects is still in the repository because it is not independent. Nothing here
measures the second fraction.

The one review that changed the product's direction did not come from any of
them — it came from the human looking at the deployed page and asking why it was
empty.
