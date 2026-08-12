import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Governance documents drift when a decision changes. Authorising autonomous
 * merge falsified eleven statements across four files at once, and the review
 * that caught them was a model reading prose. A statement that is merely
 * corrected by hand comes back; one a gate rejects does not.
 *
 * These assertions encode positions that are currently true. When a position
 * genuinely changes, the test changes with it in the same commit — which is the
 * point: the change becomes visible instead of silent.
 */
describe('governance documents agree with the current authorization model', () => {
  const tracked = execFileSync('git', ['ls-files', '*.md', 'docs/*.md', 'docs/**/*.md'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  })
    .split('\n')
    .filter(Boolean)
    // GOAL.md is preserved verbatim as the human supplied it.
    .filter((path) => path !== 'GOAL.md');

  const documents = tracked.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  const forbid = (label: string, pattern: RegExp) => {
    it(`no document claims ${label}`, () => {
      const offenders = documents.filter(({ text }) => pattern.test(text)).map(({ path }) => path);

      expect(offenders).toEqual([]);
    });
  };

  // Superseded 2026-08-10: merge is authorized under EXECUTION.md
  // "Autonomous merge and release" while its signatures hold.
  forbid('agents never merge', /agents?[^.\n]{0,40}never merge/i);
  forbid('production requires a human merge', /human-approved merge|only by human merge/i);
  forbid('agents have no path to production', /no agent path to production|agents have no path/i);

  // Superseded 2026-08-10: spec O1 resolved as accepted risk.
  forbid('spec O1 is still open', /O1[^.\n]{0,60}(still open|remains open)/i);
  forbid('S7 is blocked', /blocked on spec O1|S7 (remains |is )?blocked/i);

  it('documents the same required contexts the versioned ruleset declares', () => {
    // The previous round of this document drifted from the ruleset twice: the
    // gate registry kept transcribing a five-context list after the ruleset had
    // grown. Binding the two mechanically is what stops a reader auditing the
    // merge gate from being told the wrong answer by the authoritative file.
    const ruleset: unknown = JSON.parse(readFileSync('.github/rulesets/protect-main.json', 'utf8'));
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    const contexts = (
      ruleset as {
        rules: { type: string; parameters?: { required_status_checks?: { context: string }[] } }[];
      }
    ).rules
      .find((rule) => rule.type === 'required_status_checks')
      ?.parameters?.required_status_checks?.map((check) => check.context);

    expect(contexts).toBeDefined();
    expect(contexts?.length).toBeGreaterThan(0);

    const undocumented = (contexts ?? []).filter((context) => !gates.includes(context));

    expect(undocumented).toEqual([]);
  });

  it('declares the same gates the evidence generator will run', () => {
    // The register explains that gates live beside the scripts they name so the
    // two cannot drift. That is only true if something checks.
    const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    const declared = (manifest as { sweai: { gates: string[] } }).sweai.gates;
    const quoted = /"gates": \[([^\]]*)\]/.exec(gates)?.[1] ?? '';

    const scripts = (manifest as { scripts: Record<string, string> }).scripts;
    const quotedGates = [...quoted.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

    expect(declared.length).toBeGreaterThan(0);
    // Set equality both ways, and every declared gate must name a real script:
    // a one-directional check would let the register quote a gate that no
    // longer exists.
    expect([...quotedGates].sort()).toEqual([...declared].sort());
    expect(declared.filter((gate) => !(gate in scripts))).toEqual([]);
  });

  it('never points a deferred gate at a slice that has already shipped', () => {
    // Twice now a "lands in S6" cell survived S6 shipping, leaving a commitment
    // with no landing point and nothing to surface it again.
    const threats = readFileSync('docs/security/threat-model.md', 'utf8');
    const plan = readFileSync('PLAN.md', 'utf8');

    // Derived from PLAN.md rather than listed here. A hand-kept list stops
    // growing the moment someone forgets it, and this one had already fallen a
    // slice behind: S7 shipped while the list still ended at S6, so nothing
    // would have caught a "lands in S7".
    //
    // Shipped is opt-in, not opt-out. Reading "no planned marker" as shipped
    // meant a new slice written in the old format — none of S0-S6 carried a
    // status line — would be classified shipped on the day it was drafted, and
    // its own landing points would fail the suite as stale.
    //
    // The section bound matters: a non-greedy match from one heading ran on to
    // the next slice's status line, so one slice's state described them all.
    const sections = [...plan.matchAll(/^### (S\d+) — [^\n]*\n([\s\S]*?)(?=^#{2,3} )/gm)];
    const shipped = sections
      .filter((match) => (match[2] ?? '').includes('**Status**: complete'))
      .map((match) => match[1] ?? '');

    // Every slice must declare where it stands, or the derivation above is
    // guessing. PLAN.md states this convention next to the slices.
    const undeclared = sections
      .filter((match) => !/\*\*Status\*\*: (complete|planned|in progress)/.test(match[2] ?? ''))
      .map((match) => match[1] ?? '');

    expect(undeclared).toEqual([]);
    expect(shipped).toContain('S8');
    // Selected by content, not by table syntax: the bullet this guard was
    // written for was prose, and a `startsWith('| ')` filter excluded it
    // before the slice regex was ever evaluated.
    // A slice is stale only when it is named as the *landing point* — a cell
    // of its own in the table, or the object of "lands in" / "available in"
    // in prose. A rationale that mentions S0 historically is not a promise.
    const shippedPattern = shipped.join('|');
    const isStale = (line: string) => {
      const cells = line.startsWith('| ') ? line.split('|').map((cell) => cell.trim()) : [];

      if (cells.some((cell) => shipped.includes(cell))) return true;

      return new RegExp(`(lands? in|available in|deferred to)\\s+(${shippedPattern})\\b`, 'i').test(
        line,
      );
    };

    // Pins the selector itself. Narrowing it to table rows once let the prose
    // bullet this guard exists for slip through with the suite green, so the
    // shapes it must catch — and must not — are asserted here rather than in a
    // commit message.
    expect(isStale('- **madge deferred.** madge remains available in S6 if wanted.')).toBe(true);
    expect(isStale('| Coverage thresholds | deferred | S6 | ... |')).toBe(true);
    expect(isStale('| Coverage thresholds | deferred | unscheduled | ... |')).toBe(false);
    expect(isStale('Coverage is reported from S0 and enforced later.')).toBe(false);

    // Three documents, not one: the step-5 cell and three "Planned" threat rows
    // survived a full slice because only gates.md was being read.
    // Every tracked document, not three. An ADR said "a bundle budget lands in
    // S6" through seven review rounds because it was outside the list.
    // Every document, with one line dropped rather than one file: the threat
    // model is where controls get deferred, so excluding it wholesale would
    // blind the guard exactly where a stale pointer is most likely to appear.
    // The one exclusion, named rather than silent: that file records a
    // deferral as *resolved* ("These were deferred to S6 … Authorizing
    // automatic release on merge made that unacceptable"), which the selector
    // reads as a live pointer. Its status rows are guarded separately below.
    //
    // Bound to one path and one shape. Matching the phrase in any document
    // turned a named single-file exemption into an opt-out any future line
    // could claim by quoting it — including a line that really does point a
    // live deferral at a shipped slice.
    const isResolvedDeferral = (path: string, line: string) =>
      path === 'docs/security/threat-model.md' &&
      /deferred to S\d/.test(line) &&
      line.includes('resolved, not accepted');

    // Counted, not merely asserted to exist: a second exemption has to be
    // visible here rather than silently widening the hole.
    expect(
      documents.flatMap(({ path, text }) =>
        text.split('\n').filter((line) => isResolvedDeferral(path, line)),
      ).length,
      'exactly one line repository-wide may claim the resolved-deferral exemption',
    ).toBe(1);

    const guarded = documents.map(
      ({ path, text }) =>
        [
          path,
          text
            .split('\n')
            .filter((line) => !isResolvedDeferral(path, line))
            .join('\n'),
        ] as const,
    );

    for (const [name, text] of guarded) {
      expect([name, ...text.split('\n').filter(isStale)]).toEqual([name]);
    }

    // Adoption step 5 must never be pointed at a shipped slice, whatever its
    // schedule status. Three documents once claimed it landed in one, in three
    // different phrasings — asserting the shape catches phrasings not yet
    // invented.
    for (const [name, text] of guarded) {
      const scheduled = text
        .split('\n')
        .filter((line) => /steps? 4[–—-]5/i.test(line) && /\bS\d\b/.test(line));

      expect([name, ...scheduled]).toEqual([name]);
    }

    // A control cannot still be "planned" for a slice that has shipped.
    const planned = threats
      .split('\n')
      // Any dash, or a parenthesised slice: the em-dash-only form matched the
      // one row that existed when this was written and nothing else.
      .filter((line) =>
        new RegExp(`Planned\\s*(?:[—–-]|\\()\\s*(${shipped.join('|')})\\b`).test(line),
      );

    expect(planned).toEqual([]);
  });

  it('does not describe the settled fleet decision as upcoming', () => {
    // Six wordings said fleet readiness was still ahead after the project
    // shipped without a fleet step. The first version of this guard matched one
    // of them and the commit message claimed it matched two — and it read only
    // one document, while the same fact lived in three.
    const isUpcoming = (line: string) =>
      /is not met yet|first candidate is|revisit at the S4|is not demonstrated/i.test(line) ||
      /roles separate at the first fleet/i.test(line) ||
      /\|\s*Not met\s*[—-]/.test(line) ||
      // PLAN's fleet section opened with this above its own outcome paragraph.
      // Without it, adding PLAN to the loop below read a third file and had no
      // condition that could fail in it.
      /^Not yet\.$/.test(line.trim());

    // Pinned, because a selector that matches nothing passes. Each retired
    // wording must be caught, and legitimately forward-looking prose must not.
    expect(
      isUpcoming('| Human + agent fleet workflow | Deferred | Fleet readiness is not met yet |'),
    ).toBe(true);
    expect(
      isUpcoming('| Before increasing autonomy | Not met — see the fleet readiness table |'),
    ).toBe(true);
    expect(isUpcoming('Concurrency is 1; revisit at the S4 + S5 fleet-readiness decision')).toBe(
      true,
    );
    expect(isUpcoming('the first candidate is S4 + S5, and it requires a separate decision')).toBe(
      true,
    );
    expect(isUpcoming('| Agent roles | Adopted | roles separate at the first fleet step |')).toBe(
      true,
    );
    expect(isUpcoming('Not yet.')).toBe(true);
    expect(
      isUpcoming(
        '| Experiments | Not applicable yet | `docs/product/experiments/` starts at Phase 6 |',
      ),
    ).toBe(false);
    expect(isUpcoming('No fleet step was taken; the decision is recorded in PLAN.md')).toBe(false);
    expect(isUpcoming('None were used. The readiness assessment was made before S4.')).toBe(false);

    // Three documents, because the same claim was true in one and stale in the
    // others — which is how it survived every round.
    for (const path of ['docs/quality/bootstrap-adoption.md', 'EXECUTION.md', 'PLAN.md']) {
      const stale = readFileSync(path, 'utf8').split('\n').filter(isUpcoming);

      expect([path, ...stale], `${path} still describes the fleet decision as upcoming`).toEqual([
        path,
      ]);
    }
  });

  it('states roadmap limits that the documents behind them still hold', () => {
    // ROADMAP asserts six things about this repository, each of which decays
    // when the thing it describes is fixed. Two are derivable; deriving them is
    // what stops the table going quietly false the day one is closed.
    const roadmap = readFileSync('ROADMAP.md', 'utf8');
    const accessibility = readFileSync('docs/quality/accessibility.md', 'utf8');
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    const unverified = (accessibility.match(/\*\*(?:Partly u|U)nverified\.\*\*/g) ?? []).length;
    const spelled = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][unverified] ?? '';

    expect(
      unverified,
      'the accessibility table must mark some criterion unverified',
    ).toBeGreaterThan(0);
    // Above the lookup table `spelled` falls back to '', and the assertion
    // below degrades to a substring the current row already satisfies — so the
    // guard would stop firing exactly when the state got worse.
    expect(spelled, `no spelling for ${String(unverified)} unverified criteria`).not.toBe('');
    expect(
      roadmap.includes(`${spelled} AA criteria remain unverified`),
      `ROADMAP says a different number than the ${String(unverified)} the accessibility table marks`,
    ).toBe(true);

    // The other derivable row: how many gates are proven at the tool rather
    // than at the wiring around it. Derived from the probe cells, not from the
    // register's own summary — binding the two sentences to each other made
    // them agree with one another and with nothing else, so probing the
    // gitleaks wiring would have left both false and the suite green.
    const toolOnly = gates
      .split('\n')
      .filter((line) => line.startsWith('| ') && line.includes('wiring is unprobed')).length;
    const toolOnlySpelled = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][toolOnly] ?? '';

    expect(toolOnly, 'the gate table must mark some wiring unprobed').toBeGreaterThan(0);
    expect(toolOnlySpelled, `no spelling for ${String(toolOnly)} tool-only rows`).not.toBe('');
    expect(
      gates.includes(
        toolOnly === 1
          ? 'One row is proven at the tool'
          : `${toolOnlySpelled[0]?.toUpperCase() ?? ''}${toolOnlySpelled.slice(1)} rows are proven at the tool`,
      ),
      'the gate register says a different number than its own probe cells mark',
    ).toBe(true);
    expect(
      roadmap.includes(
        toolOnly === 1
          ? 'One gate is proven at the tool'
          : `${toolOnlySpelled[0]?.toUpperCase() ?? ''}${toolOnlySpelled.slice(1)} gates are proven at the tool`,
      ),
      'ROADMAP says a different number than the gate table marks',
    ).toBe(true);

    // Every count of the unverified criteria, wherever it is written. Three
    // copies of "three" sit in the file the number is derived from, and only
    // the ROADMAP row was bound to it — so closing a criterion would have
    // corrected one sentence and left the rest false.
    const stale = documents.flatMap(({ path, text }) =>
      [
        ...text.matchAll(
          /\b(zero|one|two|three|four|five|six)\b(?=[^.]{0,40}(?:unverified|AA criteri))/gi,
        ),
      ]
        .map((match) => match[1]?.toLowerCase() ?? '')
        .filter((word) => word !== spelled)
        .map((word) => `${path}: ${word}`),
    );

    expect(stale, `a document counts the unverified criteria as other than ${spelled}`).toEqual([]);
  });

  it('lists every SPEC non-goal in the roadmap that claims to hold them all', () => {
    // "That is the whole of SPEC.md's non-goals list" is a completeness claim
    // checked by eye. It was wrong twice — `cookies` in one review round and
    // `installable PWA` in the next — so it is derived instead.
    const spec = readFileSync('SPEC.md', 'utf8');
    const roadmapFile = readFileSync('ROADMAP.md', 'utf8');
    // The haystack is the enumeration itself: the sentence after the colon, and
    // nothing else. Three spans were tried before this one and each let the
    // document shield itself — the file scope let `backend` match two sections
    // away, the section scope let `favouriting` match the sentence one blank
    // line below the list, and the paragraph scope would let that same sentence
    // shield it again the moment someone reflowed the blank line away. The
    // shield is always prose near the claim, so the span has to be the claim.
    //
    // Split rather than a lookahead: `$` under /m matches end of line, so an
    // earlier attempt captured one paragraph and checked a third of the
    // section.
    const enumerationOf = (text: string) => {
      const notPlanned = (text.split(/^## Not planned$/m)[1] ?? '').split(/^## /m)[0] ?? '';
      const paragraph =
        notPlanned
          .split(/\n\s*\n/)
          .find((part) => part.trim().startsWith('Recorded so they are not')) ?? '';

      const afterColon = paragraph.includes(':') ? paragraph.slice(paragraph.indexOf(':') + 1) : '';
      // The first sentence after the colon, and it has to be terminated. A
      // sentence starting on a new line ends the span too: without that, an
      // enumeration whose full stop was dropped runs straight into the prose
      // beside it and restores the shielding this span exists to prevent.
      // Truncating early — an abbreviation inside the list would do it — makes
      // items go missing and the check fail, which is the loud direction.
      const [first = ''] = afterColon.split(/(?<=\.)(?:\s|$)|\n(?=[A-Z])/);

      return (first.trimEnd().endsWith('.') ? first : '').toLowerCase();
    };

    // Pins the span with the shape that was green through nine review rounds:
    // the item absent from the list, present in a sentence beside it. Both
    // sentences sit in one paragraph here, which is the arrangement a reflow
    // produces and the one the paragraph scope could not survive.
    const fixture = [
      '## Not planned',
      '',
      'Recorded so they are not proposed again as if new: accounts, login.',
      'Favouriting is called out by name as the one most likely to return.',
      '',
      '## Next',
    ].join('\n');

    expect(enumerationOf(fixture), 'the enumeration must be read').toContain('accounts');
    expect(
      enumerationOf(fixture),
      'prose beside the list must fall outside the span, or it shields the list',
    ).not.toContain('favouriting');
    // An unterminated list must read as no list at all, rather than as one that
    // swallows the next sentence.
    expect(
      enumerationOf(fixture.replace('login.', 'login')),
      'an enumeration with no full stop must not capture the prose after it',
    ).toBe('');

    const roadmap = enumerationOf(roadmapFile);

    expect(roadmap, 'the enumeration must be findable').not.toBe('');

    const section = /^## Non-goals\n\n([\s\S]*?)\n\n## /m.exec(spec)?.[1] ?? '';
    const bullets = section.split('\n').filter((line) => line.startsWith('- '));

    // A bullet is a comma- or slash-separated list of distinct refusals, and it
    // is an individual item that goes missing, not a whole bullet. Each item's
    // first significant word must appear in the enumeration.
    const items = bullets.flatMap((bullet) =>
      bullet
        .slice(2)
        .replace(/\([^)]*\)/g, '')
        .split(/,| or | \/ /)
        .map((fragment) => /[a-z][a-z-]{4,}/i.exec(fragment.replace(/^(any|the)\s+/i, ''))?.[0])
        .filter((word): word is string => word !== undefined)
        .map((word) => ({ word: word.toLowerCase(), bullet: bullet.slice(2, 48) })),
    );

    expect(items.length, 'SPEC must declare non-goals').toBeGreaterThan(0);

    const missingFrom = (haystack: string) =>
      items
        .filter(({ word }) => !haystack.includes(word))
        .map(({ word, bullet }) => `${word} (from: ${bullet}…)`);

    expect(missingFrom(roadmap), 'the roadmap claims to list every non-goal and does not').toEqual(
      [],
    );
  });

  it('keeps the adoption register and the gate register agreeing on step 5', () => {
    // They contradicted each other with every gate green: PLAN and the gate
    // register recorded the decision, and the adoption register — the document
    // whose whole purpose is the adoption position — still called it open.
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    expect(
      gates.includes('Step 5 is closed'),
      'the gate register must state where step 5 stands',
    ).toBe(true);

    // The shape, not the sentence. Five review rounds each found the same
    // contradiction in a new phrasing, and a guard pinned to the last one
    // catches only the last one.
    const callsStepFiveOpen = (line: string) =>
      /steps?\s+(?:\d+\s*(?:[–—-]|and|,|&)\s*)*(?:5|five)\b|fifth adoption step/i.test(line) &&
      /\bunscheduled\b|\bstill open\b|\bnot yet\b|\bremains? open\b/i.test(line) &&
      // A line may close step 5 and note that something else is unscheduled in
      // the same breath — which is the accurate sentence, not a contradiction.
      !/step 5 (?:is |was )?(?:closed|resolved|declined)/i.test(line);

    // Pinned, so the selector cannot quietly stop matching. The second case is
    // legitimate: coverage thresholds genuinely are unscheduled, and saying so
    // beside a closed step 5 is the accurate sentence.
    expect(callsStepFiveOpen('Step 5 is unscheduled — see the gate register')).toBe(true);
    expect(callsStepFiveOpen('Steps 4–5 remain unscheduled')).toBe(true);
    expect(callsStepFiveOpen('Steps 4 and 5 remain unscheduled')).toBe(true);
    expect(callsStepFiveOpen('Step five remains unscheduled')).toBe(true);
    expect(callsStepFiveOpen('Step 5 remains unscheduled; Stryker may yet be adopted')).toBe(true);
    expect(callsStepFiveOpen('Step 5 is closed. Coverage thresholds remain unscheduled')).toBe(
      false,
    );

    // Every document that mentions the step, not a hand-kept list: an earlier
    // version read one file while three could contradict it.
    const contradicting = documents.flatMap(({ path, text }) =>
      text
        .split('\n')
        .filter(callsStepFiveOpen)
        .map((line) => `${path}: ${line.trim().slice(0, 70)}`),
    );

    expect(
      contradicting,
      'a document calls step 5 open while the gate register calls it closed',
    ).toEqual([]);
  });

  it('does not name a tool as enforced that the register says is not adopted', () => {
    // Five rounds fixed this class by hand, then a sixth added a guard that
    // filtered on table syntax — reintroducing the exact mistake this file
    // already records for another selector, and letting a prose bullet
    // ("No cyclic dependencies (madge, CI)") survive a seventh round.
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    // Derived from the register, not listed here: a hardcoded pair covers only
    // the tools that happened to be declined when it was written.
    // Every row of the deferred table whose status says not adopted, plus every
    // substitution bullet — by status, not by the two spellings that happened
    // to exist. A derivation that silently matches fewer rows shrinks the
    // search while its anti-vacuity assertion still passes.
    const notAdoptedRows = gates
      .split('\n')
      .filter((line) => line.startsWith('| ') && /not adopted|not-applicable/i.test(line));
    const substitutions = [...gates.matchAll(/^- \*\*`?[\w/-]+`? instead of (\w+)/gm)].map(
      (match) => match[1] ?? '',
    );
    const fromRows = notAdoptedRows.map(
      (row) => /\(([\w-]+)\)/.exec(row)?.[1] ?? (row.split('|')[1] ?? '').trim(),
    );
    const declined = [...fromRows, ...substitutions].filter(Boolean);

    // This catches a row with no cells at all. What actually catches an
    // unrecognised row shape is the equality below, which pins the answer.
    expect(fromRows.filter(Boolean).length, 'a not-adopted row produced no tool name').toBe(
      notAdoptedRows.length,
    );

    // Anti-vacuity: the list must resolve to the tools the register declines,
    // or the assertion below passes by finding nothing to check.
    expect([...declined].sort(), 'the declined-tool list must derive from the register').toEqual([
      'Stryker',
      'madge',
    ]);

    // Any line, prose or table, presenting the tool as something CI runs.
    const claimsEnforced = (line: string, tool: string) => {
      const parts = line.split(/(?<=\.)\s+|\|/);
      const index = parts.findIndex((part) => part.includes(tool));
      const clause = parts[index] ?? '';
      // A table row is one subject, so the blocking cell is read anywhere in it
      // — it is not always adjacent, since a tool can be named in a rationale
      // cell that sits after it. Prose puts several subjects on one line, so
      // there the scope is the sentence naming the tool; reading a whole prose
      // line let a disclaimer about one tool excuse an overclaim about another.
      //
      // The disclaimer is read row-wide too, but not from a cell naming one of
      // the *other* declined tools: reading the whole row let `Stryker is
      // declined` in a notes cell excuse a row putting madge in CI, which is
      // the same defect the prose branch above already carries a comment about.
      const isRow = line.trimStart().startsWith('|');
      const others = declined.filter((other) => other !== tool);
      const context = isRow
        ? parts.filter((cell) => !others.some((other) => cell.includes(other)))
        : [clause];
      const evidence = isRow ? parts.filter((_, at) => at !== index) : [parts[index + 1] ?? ''];

      // The blocking cell's spelling is whatever the register uses: PLAN writes
      // `yes`/`warn`, the gate table writes the layers — `CI`, `commit, CI`,
      // and qualified forms like ``CI (required context on `main`)``.
      // Restricting it to `yes|warn` meant one table in the whole repository
      // could trip this, and the gate register itself could not; requiring the
      // cell to consist only of layer words then excluded the qualified forms
      // the register actually uses. What disqualifies a cell is a denial, not
      // its punctuation — `not run in CI` is not evidence of CI, and
      // `yesterday` is not `yes`.
      const isBlocking = (cell: string) =>
        /^\s*(?:yes|warn)\b/i.test(cell) ||
        (/\bCI\b/.test(cell) && !/\b(?:not|never|manual|unprobed|without)\b/i.test(cell));

      return (
        clause !== '' &&
        (evidence.some(isBlocking) || /\(\s*\w*[, ]*CI\s*\)|blocks in CI/i.test(clause)) &&
        !context.some((cell) => /not adopted|not-applicable|substituted|declined/i.test(cell))
      );
    };

    expect(claimsEnforced('- No cyclic dependencies (madge, CI).', 'madge')).toBe(true);
    expect(claimsEnforced('| Mutation testing — Stryker | warn only | 5 |', 'Stryker')).toBe(true);
    // The gate register's own row shape, in each layer spelling it uses.
    expect(claimsEnforced('| Cycles | madge | commit, CI | probe | 2026-08-01 |', 'madge')).toBe(
      true,
    );
    expect(claimsEnforced('| Mutants | Stryker | CI | survived | 2026-08-12 |', 'Stryker')).toBe(
      true,
    );
    expect(claimsEnforced('| Mutants | Stryker | not adopted | — | — |', 'Stryker')).toBe(false);
    // Named in a rationale cell, after the blocking one.
    expect(claimsEnforced('| Cycle detection | yes | 4 | via madge |', 'madge')).toBe(true);
    // A disclaimer about the other declined tool must not excuse this one.
    expect(claimsEnforced('| Cycles | madge | CI | Stryker was declined |', 'madge')).toBe(true);
    // A cell denying enforcement is not evidence of it, and `yesterday` is not
    // `yes`: both were read as blocking while the match was an open prefix.
    expect(claimsEnforced('| Mutants | Stryker | manual | not run in CI |', 'Stryker')).toBe(false);
    expect(claimsEnforced('| Mutants | Stryker | manual | yesterday |', 'Stryker')).toBe(false);
    // The register's qualified layer spelling, which a layer-words-only match
    // could not see.
    expect(
      claimsEnforced('| Mutants | Stryker | CI (required context on `main`) | — |', 'Stryker'),
    ).toBe(true);
    expect(claimsEnforced('madge is recorded as `not-applicable`', 'madge')).toBe(false);
    // A disclaimer about one tool must not excuse an overclaim about another.
    expect(
      claimsEnforced('- No cyclic dependencies (madge, CI). Stryker is declined.', 'madge'),
    ).toBe(true);

    const overclaimed = declined.flatMap((tool) =>
      documents
        .flatMap(({ path, text }) => text.split('\n').map((line) => `${path}\u0000${line}`))
        .filter((entry) => claimsEnforced(entry.split('\u0000')[1] ?? '', tool))
        .map((entry) => `${tool}: ${entry.replace('\u0000', ' — ').trim().slice(0, 80)}`),
    );

    expect(
      overclaimed,
      'PLAN names a tool as enforced that the register says is not adopted',
    ).toEqual([]);
  });

  it('quotes a slice range that matches the slices PLAN.md declares', () => {
    // README said "slices S0-S7" for a full slice after S8 existed. Nothing
    // bound a range written in prose to the plan it described.
    const plan = readFileSync('PLAN.md', 'utf8');
    const slices = [...plan.matchAll(/^### S(\d+) — /gm)].map((match) => Number(match[1]));

    expect(slices.length).toBeGreaterThan(0);

    const first = `S${String(Math.min(...slices))}`;
    const last = `S${String(Math.max(...slices))}`;

    const wrong = documents.flatMap(({ path, text }) =>
      [...text.matchAll(/slices (S\d+)[–-](S\d+)/g)]
        .filter((match) => match[1] !== first || match[2] !== last)
        .map((match) => `${path}: "${match[0]}"`),
    );

    // The pattern is deliberately narrow — any `slices SX-SY` must be the full
    // range — so the message has to say that, or a maintainer writing about a
    // legitimate subrange gets a bare array diff and no idea why.
    expect(
      wrong,
      `prose must quote the full range ${first}-${last}; name individual slices instead of a subrange`,
    ).toEqual([]);
  });

  it('states gate counts that match the gate table they summarise', () => {
    // These counts drifted in three consecutive review rounds because they were
    // written by hand next to a table that already held the answer. Deriving
    // them from the table is what stops a fourth.
    const gates = readFileSync('docs/quality/gates.md', 'utf8');
    const adoption = readFileSync('docs/quality/bootstrap-adoption.md', 'utf8');

    const rows = gates
      .split('\n')
      .filter((line) => line.startsWith('| ') && line.includes(' | '))
      // The mandatory-gate table is the only one carrying a probe column.
      .filter((line) => line.includes('none recorded') || / \| \d{4}-\d{2}-\d{2} +\|/.test(line));

    const unproven = rows.filter((line) => line.includes('none recorded')).length;
    const proven = rows.length - unproven;

    expect(rows.length).toBeGreaterThan(0);

    // Composed rather than listed. The list stopped at twenty, so the table
    // growing to twenty-one made every denominator `undefined` — a comparison
    // that can never hold, which is worse than a wrong number because the
    // suite reports it as a failure of the document instead of the guard.
    const ONES = [
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen',
    ];
    const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy'];
    const spell = (n: number): string => {
      if (n < 20) return ONES[n] ?? String(n);

      const tens = TENS[Math.floor(n / 10)] ?? String(n);
      const unit = n % 10;

      return unit === 0 ? tens : `${tens}-${ONES[unit] ?? String(unit)}`;
    };

    // Pinned, because the bug this replaces was invisible: a hyphenated
    // denominator simply stopped matching and the guard fell silent.
    expect(spell(8)).toBe('eight');
    expect(spell(20)).toBe('twenty');
    expect(spell(21)).toBe('twenty-one');

    // Every "N of M ... gates" claim must use the table's own numbers: the
    // numerator is either the proven or the unproven count, the denominator is
    // always the total.
    const wrong: string[] = [];

    for (const [name, text] of [
      ['gates.md', gates],
      ['bootstrap-adoption.md', adoption],
    ] as const) {
      for (const match of text.matchAll(/([\w-]+) of (?:the )?([\w-]+) (?:mandatory )?gates/gi)) {
        const [claim, left, right] = match;
        const numerator = (left ?? '').toLowerCase();
        const denominator = (right ?? '').toLowerCase();

        const numeratorValid = numerator === spell(proven) || numerator === spell(unproven);

        if (!numeratorValid || denominator !== spell(rows.length)) {
          wrong.push(`${name}: "${claim}"`);
        }
      }

      // Once every gate had a probe, the documents stopped saying "N of M"
      // and started saying "All M" — which matched no pattern here, so the
      // guard fell silent at the moment the numbers were most likely to move.
      for (const match of text.matchAll(/All ([\w-]+) (?:mandatory )?gates/gi)) {
        const [claim, left] = match;

        if ((left ?? '').toLowerCase() !== spell(rows.length) || unproven !== 0) {
          wrong.push(`${name}: "${claim}"`);
        }
      }

      // "…; the other nine remain unproven" is the same hand-written count
      // wearing different words, and it survived the sweep above when the
      // table grew by one because it names no denominator.
      for (const match of text.matchAll(
        /(?:the other|The unproven) ([\w-]+) (?:remains?|are)\b[^.]*|; ([\w-]+) (?:is|are) not\b/gi,
      )) {
        const [claim, other, trailing] = match;
        // "Twenty of twenty-one gates are proven; one is not" — the second
        // clause is the same hand-written count, and it drifted freely while
        // the first was guarded.
        const remainder = (other ?? trailing ?? '').toLowerCase();

        if (remainder !== spell(proven) && remainder !== spell(unproven)) {
          wrong.push(`${name}: "${claim}"`);
        }
      }
    }

    expect(
      wrong,
      `table holds ${String(rows.length)} gates: ${String(proven)} proven, ${String(unproven)} unproven`,
    ).toEqual([]);
  });
});
