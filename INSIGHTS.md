# Where the time went

Measured on 2026-08-11, not estimated.

Everything except the two rows marked below is derived from `git log --all`,
through commit `5a366e4`, by `scripts/derive-insights.mjs`, which writes
`docs/quality/insights-data.json`. `src/test/insights-figures.test.ts` asserts
that every figure printed here matches that file — the header table, the slice
rows, the totals, and each number the prose quotes back, which is where this
document went wrong the second time.

`npm run check:insights` re-derives the JSON from history and fails if it has
drifted. It runs by hand and by nothing else: the slices it measures live on
branches deleted after merge, so a CI checkout cannot reproduce them, and making
it a gate would fail for reasons that are not defects.

The merged-pull-request count and the median CI duration come from the GitHub
API, which an offline test cannot reach. They are carried in the JSON as
`apiDerived` and are **not** re-checked.

The question that prompted it: **is this slow because only one agent is
building?** The data says no, and points somewhere else.

## The shape of the whole run

|                                        |              |
| -------------------------------------- | ------------ |
| Wall clock, first commit to last       | **47.3 h**   |
| Active work (gaps truncated to 30 min) | **14.2 h**   |
| Waiting for a human                    | **33.1 h**   |
| Commits                                | 78           |
| Of those, `fix` commits                | **38 (49%)** |
| Pull requests merged                   | 13           |
| Median CI run                          | **74 s**     |

70% of the calendar time was the agent waiting. The seven gaps over an
hour — including two of about 13 hours — are overnight, not work. Comparing
"two days" against "an app this size" measures the wrong thing.

## Per slice, the part that is actually agent time

S0 and the governance PR are excluded: their spans are dominated by waiting for
approvals, not by building. What is left is the product.

Two definitions, because the first version of this table left them implicit and
one row then disagreed with the prose:

- **Building** — the pull request's first commit to its second.
- **After the first review** — its second commit to the merge.
- **Review rounds** — remediation commits after the initial submission. Note
  this counts commits, not reviewer passes: a round that returns findings and a
  round that returns `PASS` both cost a reviewer pass, but only the first
  produces a commit. AC4 shows the gap — two remediation commits, three
  reviewer passes.

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
| AC4 source-link fix         |      7 m |                    9 m |             2 |
| **Total**                   | **83 m** |              **165 m** |        **23** |

Cells are rounded to the minute; totals are computed from the exact timestamps.
The Building column therefore sums to 82 as printed and 83.4 in fact.

**66% of slice time is spent after the first review.** Writing the feature took
about ten minutes per slice. Getting it past review took 165 minutes against
83 — twice as long in total, and anywhere from two thirds (S7) to more
than four times (S6) on an individual slice.

Median time from a commit to the `fix` that follows it — one review round-trip —
is **8.8 minutes** across all 38 `fix` commits in the history.

## So: would more agents have helped?

**No.** The plan predicted the _independence_ — `PLAN.md` declares S4 and S5
mutually independent in their own slice sections, written before either shipped.
The _cost_ judgement, that running them sequentially beat coordinating two
workspaces, was recorded retrospectively at S7, after both had already merged.
Worth separating, because only the first is a prediction.

The timings support the retrospective call. S3+S4 and S5 together took
67 minutes, 48 of them review. S4 alone is not separable: it shipped in the same
pull request as S3.

Three reasons parallelism would not have moved the number:

1. **The slices are a dependency chain.** S2 needs S1's grid, S3 needs S2's
   modal, S5 reuses S2's modal unchanged. Only one pair was parallelizable.
2. **Building is not the bottleneck.** 83 minutes of building versus 165 of
   review. Doubling build throughput saves 42 of 248 minutes — about
   17%.
3. **A second builder adds a third party to the review queue,** which is the
   part that is already saturated.

The reviewer _is_ already a separate agent. The bottleneck is not how many
agents exist — it is that review is serial, and that too much of it was spent
on defects that should never have reached it.

## What would actually be faster

Ranked by measured impact, not by appeal.

### 1. Run review dimensions in parallel instead of in rounds

Today: submit → one reviewer returns N findings → fix → resubmit → repeat.
S6 took 5 remediation commits; the AC4 fix took three reviewer passes for a
single paragraph.

Each round costs a full reviewer pass over the whole diff. Running several
reviewers concurrently on distinct lenses — claim accuracy, tests that cannot
fail, product correctness, accessibility — and folding their findings into one
commit would collapse most of those rounds. **This is where parallel agents pay,
and it is not where the question assumed.**

Rough size of the prize — an extrapolation, not a measurement: if the same
remediation had arrived in 9 rounds instead of 23, review time drops from 165
to roughly 65 minutes.

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

A scripted find-and-replace that matches nothing exits successfully, and a
commit message written before checking then claims work that does not exist.
Twice a reviewer caught it — `e68b7ba` and `21e47d7` both open by retracting the
previous commit's message. It recurred while this very file was being written.

Unlike every other figure here, the count is not derivable from git: the failure
happens in the tool, and only its consequence reaches a commit. Asserting that a
replacement applied, and reading the file back, costs seconds and removes the
class.

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
one long autonomous stretch, S1 through S9, covered nine slices in 4.9 hours of
active time.

Fewer, larger checkpoints with a clear envelope beat many small ones.

## The honest caveat

Every review in this project was performed by a subagent of the agent that wrote
the code. Isolated context, but not independent judgement. Some fraction of the
23 remediation commits exists because that reviewer is good; some other fraction
of defects is still in the repository because it is not independent. Nothing
here measures the second fraction.

This file is itself an example. Its first version was published as "measured and
reproducible" and the reviewer found seven figures that did not reproduce,
including two that contradicted other sentences in the same document.

The one review that changed the product's direction did not come from any of
them — it came from the human looking at the deployed page and asking why it was
empty.
