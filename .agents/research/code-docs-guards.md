---
title: "Guards: what a load-bearing comment is and what can own it"
topic: guards
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-guards/guard-shape.md
  - .agents/research/code-docs-guards/lint-owned-guards.md
  - .agents/research/code-docs-guards/owned-guards.md
  - .agents/research/code-docs-routing/tests-as-guards-proof.md
  - .agents/research/code-docs-ratchet/gate-replays.md
date: 2026-09-27
revised: 2026-09-27
---

# Guards: what a load-bearing comment is and what can own it

Paths are relative to the worktree `/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs`
unless absolute; fleet paths are `repo:path:line` under `/home/mherwig/dev`. Everything
here was researched or re-verified on 2026-09-27. Figures marked *re-measured* were
re-run for this consolidation or its revision, not copied from a sub-artifact. The
revision's re-measure scripts are in `/home/mherwig/.cache/research-lang/code-docs-scratch/guards-revise/`.

Contents: [Verdict](#verdict) · [The ruleset](#the-ruleset) ·
[Applied to the fleet](#applied-to-the-fleet) · [AI-agent failure modes](#ai-agent-failure-modes) ·
[Decisions for the eval](#decisions-for-the-eval) · [Open questions](#open-questions) ·
[Sub-artifacts](#sub-artifacts) · [Key sources](#key-sources) · [Revision log](#revision-log)

## Verdict

1. **A guard is two things: the constraint and the concrete consequence of breaking it.** It names the tempting edit only when the constraint does not already imply it. That pair is a floor no edit may cross (MUST). It is also the most a cleanup keeps (SHOULD until the eval confirms). guard-shape required the breaking edit in every guard; that is narrowed here, because human guards do not reliably spell it out (`human-sample.md` marks its "Edit it prevents" column as the classifier's inference, "not text present in the source").
2. **The seven-rule lexical recogniser ships only as a carve-out, and its published scores are not portable.** guard-shape's precision 0.714 and recall 0.432 on 520 labelled blocks came from a scratch `recognizer2.py` that no longer exists. A reconstruction built from the published rule table (gate-replays) scores differently:
   - On the same 320 fleet blocks it gets precision 0.652 and recall 0.430, against the original's fleet row of 0.729 and 0.510 (*re-measured*).
   - On 100 fresh ocx blocks, hand-read, its precision is 0.594.

   Recall stays near 0.43 whichever implementation runs, so a miss is never evidence. The recogniser is never a gate, never a post-edit check and never an anti-inflation check, which overrides guard-shape's two proposed uses.
   - With the original, it fired on 18 of guard-shape's 20 loss-free rewrites before the edit and 13 after. Six lost the hit, so a regex check after an edit fails 30% of good edits.
   - Real history agrees. Over 200 ocx commits, a pre/post-image check flagged 12 hunks, and all 12 were false positives: a move, five GRD-03 consolidations, a deleted buggy function (two flags), one mispaired comment, and three rewrites below recall.

   Structural anchors add no recall: `unsafe`, `let _ =`, `.ok();`, suppression directives and `never` fallbacks sit under only 6 of the 320 fleet blocks.
3. **No new guard marker in v1.** `GUARD:` (guard-shape), `LINT-OWNED:` (lint-owned) and `NAMED BINDING:` (eval-sites) are all rejected, for three reasons:
   - The paired check guard-shape proposes would flag 7 of its own 20 well-shaped rewrites.
   - clippy's `SAFETY:` pairing works only because `unsafe` gives it a structural oracle, and a general guard has no such oracle.
   - The fleet already ran this experiment without a check. The organic marker "load-bearing" appears on 149 ocx prod lines, 112 of them in doc comments, often opening essays that list several properties.

   `SAFETY:` and `ponytail:` stay. The eval's marker arm may reopen the question.
4. **A guard's owner is decided per breaking edit, and credited only after the owner fails on that edit.** A presence-only check such as ERR-19 owns nothing, and a test name is not proof that the test owns the guard. tests-as-guards-proof applied the literal breaking edit at 22 sites that name a test:
   - At 15 sites the named test fails. At one of them, OCX-24, it fails on only half the edit.
   - At 4 sites, two tests are named and only one fails.
   - At 3 sites (GRM-07, PY-03, TS-01) the named test stays green.

   Credit by name would be wrong or incomplete at 7 of 22 sites (32%). This moves OCX-14 from lint-owned to comment-only. It also carries lint-owned's OCX-04 reasoning over to OCX-17 and to `grimoire:src/install/prune.rs:91-98`. clippy runs `match_wild_enum::check` only `if !from_expansion`, so a scoped deny catches a `_ =>` arm. It does not catch a `matches!` rewrite (the regression prune.rs itself records) or delegation to `error.classify()` (OCX-17's second breaking edit).
5. **Checkers own exhaustiveness; the prose shrinks to one line or none.** 44 prod comment lines in 26 Rust files claim a match must stay exhaustive, and none carries `#[deny(clippy::wildcard_enum_match_arm)]`. Enabling that lint workspace-wide would flag 232, 108 and 41 sites in ocx, grimoire and ocx-mirror (62, 58 and 22 in prod code, *re-measured*), so it stays scoped. Two of lint-owned's MUSTs are downgraded:
   - `let_underscore_drop` becomes SHOULD. rustc fires it on every `let _ =` whose type needs drop, which includes every discarded `io::Result`.
     - The number of sites it flags is now measured: 163 in ocx, 70 in grimoire and 39 in ocx-mirror, of which 44, 42 and 5 are prod code (*re-measured*).
     - owned-guards read 30 stratified hits across four lints: 6 were guards, 3 were discards with a rationale, and 21 were noise, mostly test fixtures.
     - Under ocx's and ocx-mirror's `warnings = "deny"`, every hit must be cleared before the lint lands.
     - GRM-08's rename is already owned: `duplicate_in_flight_row_checks_are_deduped` fails on it. OCX-09's named test has not been proved.
   - "Never a bare raise" in Python is replaced: at a public boundary, keep the runtime `raise` and add the static `Never` check. `assert_never` raises `AssertionError` (re-confirmed from CPython 3.14.5 source), which would change a public SDK's `TypeError` contract.
6. **Put a guard in the register its audience reads.** A caller-visible precondition goes in the doc comment; an implementation hazard goes in a plain comment at the line. guard-shape's "cuts both ways" 10/9 split is noted, but the expected net movement is toward plain. The evidence: human guards are 82% plain, fleet guards 47%, and "load-bearing" sits in doc comments 75% of the time. This stays SHOULD until the eval confirms it.
7. **The comment-only class is a floor of 16 sites.** Cleanup never shortens these below the constraint-plus-consequence floor.
   - The 13 from the first pass: lint-owned's 12 plus OCX-14.
   - GRM-07, PY-03 and OCX-13, whose named tests do not build the guarded scenario.
   - OCX-24's digest-upgrade half also belongs to the floor. Its test owns only the empty-`embedded` short-circuit.

   9 of the 16 have a type sketch (OCX-06, OCX-13, OCX-23, GRM-03, GRM-04, GRM-07, PY-01, PY-03, TS-01), so lint-owned's claim that no mechanism can close OCX-23's negative-space contract is wrong. They leave the floor only when the type lands and fails the planted edit (GRD-12).
8. **A type is an owner, and a missed one.**
   - owned-guards sketches a type for 24 of the 40 eval sites that would make the named edit fail to compile or type-check. It estimates about 45 of the 100 sampled fleet guards have that shape.
   - The fleet already uses such types without crediting them: `SigningInstant` at `ocx:crates/ocx_sign/src/verify.rs:52-58` and `ResultExt::ignore` at `ocx:crates/ocx_util/src/result_ext.rs:4-11`.
   - No sketch has been compiled or planted-edit tested, so GRD-12 is SHOULD, and a type change never rides along with a comment cut.
9. **Documented gaps.** None of these blocks shipping; each limits what a rule may claim.
   - No type sketch is proven (GRD-12).
   - OCX-09's named test and OCX-04's Windows-only `assert!` have never been run against their breaking edits.
   - The recogniser's committed version must pin its own scores, because the original's cannot be reproduced (GRD-06).
   - A diff-time check for guard loss needs whole-commit pairing before it can block anything (GRD-03, GRD-06).
   - mutmut 3.8.0 did not run on ocx-sdk-python's `src/` layout, so the Python owner proof is a hand-applied edit (GRD-07).

## The ruleset

Severity is what ships now. "MUST if E*n*" means the eval decision of that number in
[Decisions for the eval](#decisions-for-the-eval) must hold first. Four MUSTs ship
without the eval, because each one only forbids removing information.

Dropped or folded:
- guard-shape rule 3 (bare IDs) is folded into GRD-02 and GRD-11.
- guard-shape rule 4 (split bundles) became GRD-03.
- guard-shape rule 6 (the marker) is rejected; see the Verdict.
- lint-owned rule 3 (the `LINT-OWNED:` prefix) became GRD-08 without the prefix.
- lint-owned rule 5's typed-lint ESLint migration survives only as an option inside GRD-09.
- lint-owned rule 8 (ERR-19 counts for presence only) is folded into GRD-07.
- "Never `#[expect]`" is not a rule: rustc already reports the unfulfilled expectation, and under ocx's `warnings = "deny"` (`ocx:Cargo.toml:373`) that fails the build.
- owned-guards candidate 1 (no workspace-wide `let_underscore_untyped` or `wildcard_enum_match_arm`) is folded into GRD-09 and GRD-10.
- owned-guards candidate 4 (cite in-fleet type precedents) is folded into GRD-12's rationale.
- tests-as-guards-proof candidates 1-3 are folded into GRD-07 and GRD-08. Candidates 4 (per-language mutation notes) and 5 (a timeout counts as red for a hang guard) are folded into GRD-07's verification.

### GRD-01: the guard floor (MUST · portable)

- **Rule.** Write every guard as the constraint plus the concrete consequence of breaking it, and let no edit remove either half. This includes comments another rule mandates: DOC-04 `SAFETY:`, the ERR-19 discard rationale, suppression-directive reasons, and the roughly 70 lore "a comment naming X" clauses.
- **Rationale.** It prevents the cut that keeps the mechanism and drops what breaks. Without the consequence, a cold agent cannot tell a guard from narration. Every one of the 39 human guards names a concrete failure (`human-sample.md` wording pattern 2).
- **Verification.** Reading heuristic, the *consequence test*: for each guard a diff touches, point to the clause that names what breaks (hang, leak, torn write, wrong exit code, escape). "Important", "careful" or "load-bearing" alone is not a consequence. After a guard is shortened, the cleanup skill's fresh-context reason-recheck probe must recover the consequence. The regex must not be used as that check (see GRD-06).

### GRD-02: nothing but the floor (SHOULD; MUST if E1 · portable, 3-line signal is a fleet default)

- **Rule.** Keep a guard to the constraint, the consequence and, only when the constraint does not imply it, the tempting edit. For a deliberate divergence, the tempting edit is the sibling the code must not be unified with. Route history, weighed alternatives, restated context and bare plan IDs out of the comment.
- **Rationale.** It prevents 6-line fleet guards where humans write 2.
  - guard-shape rewrote 20 fleet guards from 394 lines to 114 (3.46x), keeping only these parts.
  - 7 of the 20 rewrites dropped a bare ID with no loss.
  - Naming the sibling (OCX-02's `resolves_inside`, the GRM-01/GRM-02 cross-reference) lets a cold reader diff two functions instead of trusting prose.
- **Verification.** A guard over 3 lines signals either a bundle (GRD-03) or an essay (routing table). Human guards are 85% at 2 lines or under, with a maximum of 9. List candidates with the census, then intersect the list with recogniser hits:

```
python3 rules/code-docs/checks/comment_census.py --root . --list-blocks --min-block 4
```

### GRD-03: one guard, one site, stated once (SHOULD · portable)

- **Rule.** Split a block that guards more than one breaking edit into one guard at each edit's own line. State each guard once: at the type or at the binding, not both. A constraint repeated across implementations moves to one owner, such as a shared default or a table test, or to one comment.
- **Rationale.** It prevents bundles a length cap cannot split, and copies that drift apart.
  - 4 of guard-shape's 20 rewrites bundled 2-3 guards.
  - `grimoire:src/tui/update_check.rs:320-327` restates the `InFlightGuard` doc at `:362-370`.
  - grimoire repeats "Never called: … `kind_support` gate." on 23 lines and "Dead path: `kind_support` declines …" on 22 (*re-measured*).
  - The consolidation is safe when done. In 200 ocx commits, 5 flagged guard removals were GRD-03 consolidations, and each fact was verified at its remaining home (gate-replays Finding 8).
- **Verification.** Triage for verbatim repeats, then read each hit. A consolidation moves text across hunks and files. Any check of it must pair removed and added blocks across the whole commit (`difflib.SequenceMatcher` ratio, or `git diff --color-moved=blocks --diff-algorithm=histogram` as a pre-filter), never per hunk.

```
grep -rh --include='*.rs' --include='*.py' --include='*.ts' --exclude-dir=target --exclude-dir=node_modules -e '^\s*// [A-Z]' -e '^\s*# [A-Z]' . | sed -e 's/^\s*//' | awk 'length($0) > 50' | sort | uniq -cd | sort -rn
```

### GRD-04: register by audience (SHOULD; MUST if E2 · portable)

- **Rule.** Put a guard in the doc register only when a caller who never opens the body needs it (a precondition, an error condition, a sentinel). Put an implementation hazard in a plain comment on the line it guards.
- **Rationale.** It keeps hazards off hover, rustdoc and, through clap or schemars, user-visible output.
  - Fleet guards are 53% doc and human guards 18% (`sample.md` §5, `human-sample.md`).
  - ocx's "load-bearing" appears on 112 of 149 prod lines in `///` (*re-measured*).
  - This generalises DOC-04's `# Safety` / `// SAFETY:` split and API Guidelines C-FAILURE.
- **Verification.** Run the triage below and apply the question "does this matter to someone who only calls this?" to each hit. A pure implementation hazard in `///` is a finding.

```
grep -rn --include='*.rs' --exclude-dir=target --exclude-dir=external -e '^\s*///.*load-bearing' -e '^\s*///.*rather than' -e '^\s*///.*instead of' -e '^\s*///.*must not' .
```

### GRD-05: a fact, not an instruction (SHOULD · portable)

- **Rule.** Phrase a guard as a fact and its consequence. Never phrase it as a command to the reader ("NEVER …", "Keep …", "Classify …", "do not assume …").
- **Rationale.** It prevents two problems.
  - An instruction carries no consequence, so the next agent cannot re-judge it when the code changes.
  - arXiv 2603.21642 names code comments as an indirect prompt-injection vector, and its mitigation strips imperative language.

  3 of 100 sampled fleet guards are instructions, and agents default to the directive voice of the rules they read.
- **Verification.** Triage, not a gate: the command finds 73 hits in `grimoire/src`, and most are facts such as "Never called: …". A hit is a finding only when the same sentence has no consequence.

```
grep -rnE --include='*.rs' --include='*.py' --include='*.ts' --exclude-dir=target --exclude-dir=node_modules -e '^\s*[/#*]+ *Never ' -e '^\s*[/#*]+ *Do not ' -e '^\s*[/#*]+ *Keep ' -e '^\s*[/#*]+ *Classify ' -e '^\s*[/#*]+ *Make sure ' -e '[/#*] .*NEVER ' .
```

### GRD-06: the recogniser is a carve-out, never a gate (MUST · principle portable, rule set a fleet default)

- **Rule.** These are never auto-cut: anything the recogniser flags, any `SAFETY:` or `ponytail:` label, and any comment another rule mandates. A recogniser miss means *unclassified*, never *safe to cut*. The recogniser never passes or fails an edit or a marker. The most it may do with an edit is add a recogniser-loss item to a review list (LEN-06, SHOULD).
- **Rationale.** Its recall is about 0.43 in every measurement: the original's combined score, the reconstruction's 0.430 on fleet guards, and 0.425 on the eval sites. A gate would therefore approve cutting roughly 57% of guards.
  - As a post-edit check, it failed 6 of guard-shape's 20 loss-free rewrites. It also misfired on 12 of 12 flags in 200 real ocx commits (gate-replays), well past Google's bar of under 10% effective false positives even for a non-blocking check.
  - As an anti-inflation check, it flags 7 of 20 well-shaped guards.
  - Precision depends on the implementation and the population: 0.729 for the original on the fleet fixture, 0.652 for the reconstruction on the same fixture (*re-measured*), and 0.594 on fresh ocx blocks. For a carve-out, a false positive only over-protects; the low recall is the risk.
- **Verification.** New commitment: commit the recogniser as `rules/code-docs/checks/guard_recogniser.py`, with a fixture and a `--self-test`.
  - Start from the reconstruction at `/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/guard_recogniser.py`. The original `recognizer2.py` and guard-shape's 520-block fixture are lost.
  - Rebuild the fixture from `.agents/research/code-docs-audit/scratch/samples/*.json`, which holds the 320 fleet blocks labelled by `sample.md` §5, plus the `human-sample.md` appendix blocks read from the pinned clones.
  - The self-test pins the committed code's own precision and recall on that fixture, never 0.714 and 0.432.
  - Planted fixture: a cleanup run whose own plan deletes or shortens a flagged block must exit non-zero. The ratchet never exits non-zero on a human or agent diff because of recogniser loss.

### GRD-07: decide the owner per breaking edit (MUST · portable)

- **Rule.** Before shortening a guard below GRD-01, list every breaking edit it names. Credit an owner only where a lint, compiler or type check, or named test is shown to fail on that exact edit. A check that only demands a comment exists owns nothing, and neither does a test that merely shares the guard's nouns. Every edit without an owner keeps its prose.
- **Rationale.** It prevents overcrediting.
  - OCX-04's compile-time assert passes when someone raises its own constant.
  - ERR-19 (`rules/rust-quality/errors.md:72`) is a review-time grep that a false rationale satisfies.
  - The scoped `wildcard_enum_match_arm` deny misses macro-expanded `matches!` rewrites (clippy `matches/mod.rs:1087-1127`) and delegation to another classifier.
  - Named tests fail this proof often. At 22 sites, 3 named tests stayed green on the literal edit, and 4 sites named two tests of which only one failed. Credit by name was wrong or incomplete at 32% of sites. OCX-13's test is a fourth noun-only match, found by reading it (tests-as-guards).
- **Verification.** Planted-edit proof per credited owner. Apply the harvested breaking edit on a scratch copy and run only the owner: `cargo clippy`, `cargo test -p` with the crate and test name, `tsc --noEmit`, `npx pyright`, `pytest -k`, or the project's runner with a name filter. The owner must fail. For each uncredited edit, the reading heuristic is: its prose is still present after the diff. The proof has four traps (tests-as-guards-proof):
  - Apply the harvested edit, not a substitute. OCX-24's test fails on removing the empty-`embedded` short-circuit, but nothing fails on the digest upgrade the guard argues against.
  - A compile error from a leftover the edit orphans, such as an unused import or binding under `-D warnings`, is not the owner failing. Remove the leftover and re-run (OCX-11, OCX-19).
  - Run every named test on its own and credit only those that fail (OCX-16, OCX-20, GRM-05, GRM-08).
  - Bound every run with `timeout 1800` or less. A timeout counts as failing only when the guard's named consequence is a hang (OCX-01's FIFO open never returns).

  Mutation tools only support a hand-applied edit:
  - Stryker is cheap on a TypeScript file with a scoped runner config, and it independently confirmed TS-01 (3 of 3 mutants survive).
  - cargo-mutants has no operator for `.min()` or `.saturating_add()`, and it reports `unviable` for edits that break `-D warnings`.
  - mutmut 3.8.0 did not run on ocx-sdk-python's `src/` layout.

### GRD-08: an owned edit keeps one line or none (SHOULD; MUST if E3 · portable)

- **Rule.** When owners catch every breaking edit a guard names, cut the comment to one line naming them. Name the lint, the type, or every test that failed on the planted edit, and never a named test that stayed green. Cut it to nothing when the owning construct states itself (`const exhaustive: never = x`, `assert_never(x)`, `#[deny(…)]`, a type whose constructor is the only path to a value). Use no prefix.
- **Rationale.** Once the owner fails CI on the edit, prose that re-derives the mechanism is only a copy of it, and copies drift.
  - grimoire-vscode already does this at `render.ts:646` and `grimInfo.ts:90`. It still restates the same guarantee in 3 lines at `render.ts:165-167`.
  - At OCX-16 and OCX-20, only one of the two listed tests fails on the edit. A shrunk line that names the other would point a cold reader at a test that never sees the edit.
- **Verification.** A comment longer than one line directly above an owned construct is a finding. For a test pointer, the GRD-07 run must have shown that exact test failing.

```
grep -rn -B4 --include='*.ts' --exclude-dir=node_modules -e 'const exhaustive: never' .
grep -rn -B6 --include='*.rs' --exclude-dir=target -e 'deny(clippy::wildcard_enum_match_arm)' .
```

### GRD-09: the checker owns exhaustiveness (SHOULD · portable)

- **Rule.** Where a comment says a match must stay exhaustive, let the checker own it:
  - **Rust:** `#[deny(clippy::wildcard_enum_match_arm)]` on the enclosing fn or impl. Never workspace-wide, never `#[expect]`.
  - **TypeScript:** `const exhaustive: never = x;` in `default:`, then a throw. The ESLint `switch-exhaustiveness-check` is optional, because it needs typed linting first.
  - **Python:** a static `assert_never(x)`. At a public boundary, keep the runtime `raise` after it.
- **Rationale.** It closes the one gap the compilers leave.
  - Rust's E0004 already catches a missed variant. The only gap is a later `_` arm, which lint-owned §2 showed this restriction lint catches, using a planted edit.
  - A workspace-wide deny would flag 232, 108 and 41 sites in ocx, grimoire and ocx-mirror. Most are test `_ => panic!("expected X")` arms and legitimate wildcards on foreign `#[non_exhaustive]` enums (OCX-18), against 44 claim lines (owned-guards; *re-measured*).
  - In Python, `case _: raise` satisfies pyright's coverage check (planted edit). `assert_never` raises `AssertionError`, so rewriting `ocx-sdk-python:src/ocx_sdk/_envmodel.py:182` would break a user-facing `TypeError`.
- **Verification.** Rust files that claim exhaustiveness without the attribute are findings: take the files in the first list below that are missing from the second. Planted proof: add a `_ =>` arm to a scratch copy; `cargo clippy` must fail. For Python, read each hit in a match claimed exhaustive and require `assert_never(`.

```
grep -rln --include='*.rs' --exclude-dir=target --exclude-dir=external -i -e 'no wildcard' -e 'rather than wildcard' -e 'not wildcarded' -e 'exhaustive match' .
grep -rln --include='*.rs' --exclude-dir=target --exclude-dir=external -e 'wildcard_enum_match_arm' .
grep -rn -A2 --include='*.py' --exclude-dir=.venv -e 'case _:' .
```

### GRD-10: Rust RAII guard bindings (SHOULD · fleet default the adopter may override)

- **Rule.** Mark every Drop-guard type `#[must_use]`. Give each named guard binding one line naming the rename hazard (renaming it to `_` releases it at once). Enable rustc's `let_underscore_drop` in `[workspace.lints.rust]` only after triaging the crate's existing `let _ =` sites. Run `clippy::let_underscore_must_use` and `clippy::let_underscore_untyped` once as audit commands, never as standing lints.
- **Rationale.** Renaming `_render_lock` or `_slot` to `_` is a routine cleanup that drops the guard immediately (OCX-09, GRM-08).
  - `let_underscore_drop` catches that rename without `#[must_use]`. This was shown first on a lookalike crate and then on the real `render_toolchain.rs:892` and `update_check.rs:328` (owned-guards §4).
  - clippy's `let_underscore_lock` never sees a domain wrapper type.
  - The rustc lint fires on every `let _ =` of a type that needs drop. It returns early only when `!ty.needs_drop(…)` (rustc `let_underscore.rs`), so every discarded `io::Result` counts too.
  - That triage is sized now. The lint flags 163, 70 and 39 sites in ocx, grimoire and ocx-mirror, of which 44, 42 and 5 are prod code (*re-measured*). The raw `let _ = ` line counts are 209, 113 and 44.
  - The two clippy lints flag 156-178, 62-98 and 32-43 sites across the same repos. In the read of 30 hits, 70% were noise, mostly test fixtures, so they are not worth a standing lint.
  - `#[must_use]` also catches a bare `acquire();` statement.
- **Verification.** Check the lint table and the guard types. Planted proof: rename a binding to `_` on a scratch copy; `cargo clippy` must fail. To size a crate's triage:
  - On a scratch copy, set `warnings = "deny"` to `"warn"` and pass the target lints as `-W`.
  - Never pass `-A warnings`. It silences a later `-W` in either order, and the run exits 0 with zero hits (owned-guards §1).
  - In ocx and ocx-mirror, the shipped `warnings = "deny"` turns the new lint into a build error, so clear every hit before the enable lands.

```
grep -rn --include='Cargo.toml' --exclude-dir=external -e 'let_underscore_drop' .
grep -rn --include='*.rs' --exclude-dir=target --exclude-dir=external -B3 -e 'impl Drop for' .
```

### GRD-11: carry pointers through a rewrite (MUST · portable)

- **Rule.** A guard rewrite may drop a bare plan, decision or issue ID. It never drops a file-qualified pointer unless the same target reappears in the diff.
- **Rationale.** It prevents losing the one pointer form that resolves. guard-shape rewrite #8 dropped a resolvable ADR pointer along with a bare issue number. 0 of 30 bare `C-` IDs resolve uniquely, while every file-qualified pointer sampled resolved (topic map). The pointer grammar itself belongs to the linkage group.
- **Verification.** Run on the cleanup diff. The check compares pointers one by one, not whole files, so it avoids the false negative gate-replays measured in LNK-06's first command. It writes no temporary files. Any output is a finding:

```
comm -23 <(git diff -U0 origin/main -- . | grep -e '^-' | grep -v -e '^---' | grep -oE -e '[A-Za-z0-9_./-]+\.md' | sort -u) <(git diff -U0 origin/main -- . | grep -e '^+' | grep -v -e '^+++' | grep -oE -e '[A-Za-z0-9_./-]+\.md' | sort -u)
```

### GRD-12: route a guard to a type when one fits (SHOULD · portable)

- **Rule.** Before filing a breaking edit as comment-only or test-owned, ask whether a type would make it fail to compile or fail the type checker. Candidate types:
  - a tri-state enum in place of an `Option<bool>` or a collapsed boolean;
  - a validated newtype whose one constructor runs the check;
  - a trait method with no default;
  - a sealed policy parameter in place of two near-identical functions;
  - a typestate or builder that cannot skip a step;
  - one value computed once and threaded through.

  A sketched type owns nothing. Credit it under GRD-07 only after it lands and the planted edit fails `cargo check`, `tsc --noEmit` or pyright. The type change is its own reviewable diff, never bundled into a comment cut. Once the type owns the edit, the comment follows GRD-08.
- **Rationale.** A compile error holds on every build, while a test holds only when it runs and builds the scenario. 3 of 22 named tests did not build theirs.
  - owned-guards sketches a type for 24 of the 40 eval sites, including 9 of the 16 comment-only ones. It estimates about 45 of the 100 sampled fleet guards have a type shape.
  - The estimate is uneven by language. Rust sits near 47-56%. ocx-sdk-python sits near 25-33%, because Python enforces types only through a static checker.
  - The fleet already does this unprompted. `SigningInstant` (`ocx:crates/ocx_sign/src/verify.rs:52-58`) exists so "no caller can substitute the wall clock for a signing-time proof". `ResultExt::ignore` (`ocx:crates/ocx_util/src/result_ext.rs:4-11`) makes a discard explicit at every call site.
  - A type cannot own ordering inside one function body (OCX-01, GRM-06), platform-API gaps (OCX-03), durability that needs fault injection (OCX-14), deliberate non-optimizations (OCX-21, OCX-24) or judgment calls (OCX-02, OCX-08).
- **Verification.** Planted-edit proof per GRD-07, against the landed type. The triage below lists tri-state candidates, and each hit is read for a collapse that loses a state. It finds 102 lines in ocx `crates/`, tests included.

```
grep -rn --include='*.rs' --exclude-dir=target --exclude-dir=external -e 'Option.bool.' -e 'unwrap_or(false)' .
```

## Applied to the fleet

| Rule | Status | Evidence |
|---|---|---|
| GRD-01 | satisfied | `ocx:crates/ocx_oci/src/endpoint.rs:488-491` names the edit (wildcard) and consequence ("instead of a silent 64"); GRM-01 `grimoire:src/path_safety.rs:91-97` ("otherwise the guard would be skipped") |
| GRD-01 | violated | `grimoire:src/command/add.rs:218` and `:512` "Keep the dev-record keyspace disjoint from declared bindings (C2)." carries no consequence; `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:891` "held until this call returns" names neither the rename hazard nor the interleaving |
| GRD-02 | violated | 33 of 100 sampled fleet guards run past 10 lines (`sample.md` §5); `ocx:crates/ocx_project/src/consent.rs:507` bundles 3 guards in 42 lines; `grimoire:src/install/prune.rs:91-98` carries history ("The prior … failed open") and a rule pointer around a one-line fact |
| GRD-03 | violated | `grimoire:src/tui/update_check.rs:320-327` restates `:362-370`; "NEVER key on `.agents/`" at `grimoire:src/install/vendor_warp.rs:69`, `vendor_kilo.rs:97`, `vendor_goose.rs:76`, `vendor_cline.rs:76`; 23 "Never called" and 22 "Dead path" lines in `grimoire/src/install` |
| GRD-03 | satisfied | ocx commits `d8e17dca10` (store.rs, "see `ConfigGuard::write`") and `93fc7228b4` (progress.rs, two call-site copies of `inherit_scope`'s fact removed) each keep the fact at one home (gate-replays Finding 8) |
| GRD-04 | violated | 112 of 149 ocx prod "load-bearing" lines in `///`, for example `ocx:crates/ocx_index/src/local_index.rs:563` "Three properties are load-bearing"; fleet guards 53% doc against human 18% |
| GRD-04 | satisfied | `grimoire:src/install/vendor_warp.rs:69` sits as a plain comment on the guarded line |
| GRD-05 | violated | `grimoire:src/install/path_anchor.rs:445-446` "Classify a new call site … do not assume"; `add.rs:218`/`:512`; four vendor "NEVER" lines (a hybrid: warp and cline carry a consequence) |
| GRD-06 | new commitment | the original `recognizer2.py` is lost; the reconstruction sits uncommitted in gate-replays scratch; `rules/code-docs/checks/comment_census.py` has no guard carve-out |
| GRD-07 | new commitment | no fleet repo classifies ownership; `eval-sites.md`'s Test column credits by name, and the planted-edit run shows that credit wrong or incomplete at 7 of 22 sites: green at GRM-07 `grimoire:src/lock/advisory_lock.rs:117-119`, PY-03 `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:856-874` and TS-01 `grimoire-indexer:src/validate/adapters/files.ts:69-72`; split at OCX-16, OCX-20, GRM-05 and GRM-08 |
| GRD-08 | satisfied | `grimoire-vscode:src/webview/settings/render.ts:646`, `src/views/grimInfo.ts:90` (a `never` line, no comment) |
| GRD-08 | violated | `grimoire-vscode:src/webview/settings/render.ts:165-167` (3 lines restating `:168`); the warp and kilo NEVER guards are test-owned (`vendor_warp.rs:185`, `vendor_kilo.rs:232`), yet their prose stays |
| GRD-09 | violated | 44 comment lines in 26 Rust files claim exhaustiveness (ocx 20, grimoire 5, ocx-mirror 1), 0 attributes; `ocx:Cargo.toml:375` `[workspace.lints.clippy]` is empty |
| GRD-09 | satisfied | grimoire-vscode: 3 of 15 switches use the `never` fallback plus a throw; `ocx-sdk-python:src/ocx_sdk/_envmodel.py:182` claims no exhaustiveness, so it is out of scope |
| GRD-10 | violated | `ocx:crates/ocx_util/src/fs/locked_file.rs:30` `LockedFile` and `grimoire:src/tui/update_check.rs:371` `InFlightGuard` lack `#[must_use]`; `let_underscore_drop` is absent from the ocx, grimoire and ocx-mirror manifests; enabling it would surface 163/70/39 sites (44/42/5 prod) |
| GRD-11 | new commitment | no fleet cleanup has run; guard-shape's rewrite #8 is the only observed drop |
| GRD-12 | satisfied | `ocx:crates/ocx_sign/src/verify.rs:52-58` `SigningInstant`; `ocx:crates/ocx_util/src/result_ext.rs:4-11` `ResultExt::ignore`; `ocx:crates/ocx_package_manager/src/tasks/pull_local.rs:182` already uses a `Result` sentinel, not a raw `None` |
| GRD-12 | violated | OCX-20 `ocx:crates/ocx_config/src/insecure.rs:21-37` defends an `Option<bool>` tri-state with prose and a split test pair; OCX-12 `ocx:crates/ocx_index/src/local_index.rs:1638-1643` relies on a trait default a "dead code" deletion falls through to; OCX-23 `ocx:crates/ocx_util/src/path.rs:180-183` states in prose a negative contract a `ContainedPath` newtype would enforce |
| DOC-04 (context) | mostly satisfied | ocx: 96 of 104 `unsafe {` sites carry `SAFETY` within 6 lines (*re-measured*), with `undocumented_unsafe_blocks` not enabled; `grimoire:Cargo.toml:123` forbids unsafe |

Amendments to shipped lore:
- **IDIOM-05** (`rules/rust-quality/api-and-idioms.md:97`) makes two claims the evidence corrects:
  - It says none of its five lints is on by default. That is wrong for `let_underscore_lock` (correctness, deny) and `let_underscore_future` (suspicious, warn). Correct it and point it at GRD-10.
  - It requires `let_underscore_must_use` at MUST. That lint flags 156, 98 and 32 sites in ocx, grimoire and ocx-mirror (46, 70 and 7 prod). Under ocx's `warnings = "deny"`, enabling it fails the build until every hit is cleared. Either state that triage cost or demote it to the one-time audit GRD-10 names.
- **ERR-19** (`rules/rust-quality/errors.md:72`) gains a pointer to GRD-07: presence is not ownership.
- **DOC-20** (`rules/rust-quality/docs-and-tracing.md:82`) says "preserve" but never says what shape to preserve. Supersede it by reference to GRD-01 and GRD-02.
- **DOC-04** stays the worked example for GRD-04.

## AI-agent failure modes

Ranked by measured frequency; the last entry is an estimate.

1. **Writes the guard long and bundles several into one block.** 33 of 100 fleet guards run past 10 lines, against 0 of 39 human guards, and 4 of 20 rewrites held 2-3 guards. Rules: GRD-02, GRD-03.
2. **Puts the guard in the doc register.** 53% of fleet guards against 18% of human ones, and 75% of "load-bearing" lines. The text then renders to hover and schemas. Rule: GRD-04.
3. **Uses a bare plan ID in place of the reason.** 7 of 20 rewrites dropped one with no loss; 1,872 ocx prod comment lines carry an ID; 0 of 200 human blocks do. Rules: GRD-02, GRD-11.
4. **Credits a check with a guard it does not own.**
   - By test name, this is wrong or incomplete at 7 of 22 sites (32%).
   - Other checks look complete when they are not: OCX-04's const assert, OCX-14's ERR-19 grep, OCX-17's `classify()` edit, and prune.rs's `matches!` edit.
   - A compile error from an unused import the edit orphaned reads as the owner catching it (OCX-11, OCX-19).

   Rules: GRD-07, GRD-08.
5. **Pastes the same guard at every implementation.** 45 "Never called" and "Dead path" lines in grimoire, and the NEVER line in 4 vendor files. Rule: GRD-03.
6. **Trusts a regex or a marker to protect guards.**
   - A recogniser miss is 57% of guards.
   - Its published precision does not carry over to a reimplementation: 0.652 and 0.594 against 0.714.
   - Compared before and after an edit, it was wrong on 12 of 12 flags in real history.
   - The organic "load-bearing" marker drifted into the doc register.

   Rule: GRD-06.
7. **Uses the wrong tool for lint ownership.** Five variants were each verified; how often agents make them is unmeasured:
   - `#[must_use]` treated as the fix for the RAII rename;
   - `#[expect]` used as the one-line lint pointer;
   - a pyright setting expected to retrofit exhaustiveness;
   - an ESLint rule added without typed linting;
   - a lint's blast radius measured under `-A warnings`, which returns a silent zero.

   Rules: GRD-09, GRD-10.
8. **Drops the consequence clause when compressing.** guard-shape inferred this and did not measure it; the eval's aggressive-cut arm measures it. Rule: GRD-01.
9. **Writes the guard as an instruction.** 3 of 100 fleet guards. Rule: GRD-05.
10. **Defends with prose or a test what a type could make uncompilable.** An estimate from one-line summaries: about 45 of 100 sampled guards have a type shape, and 1 already uses one (`SigningInstant`). Rule: GRD-12.

## Decisions for the eval

- **Marker arm (changed).** `oneline` in `build_arms.py` truncates each block to its first line. `marker` is a hand-authored `// GUARD: fact, consequence` line. Comparing the two confounds the prefix with the content. Add a `guard-line` twin: the same frozen text without the prefix. Adopt a marker only if `marker` beats `guard-line` on guard survival.
- **E1 (rules arm).** Freeze the `rules` arm as GRD-01 to GRD-05 applied by hand. GRD-02 becomes MUST if `rules` is non-inferior to `original` on guard survival, using eval-scoring's margin.
- **E2 (register arm).** For sites whose doc comment holds an implementation hazard (OCX-24 at `ocx:crates/ocx_store/src/shim.rs:165`, which is guard-shape's row 5), add one arm that moves the same text to a plain comment at the guarded line. OCX-23 (`ocx:crates/ocx_util/src/path.rs:180-183`) is a caller-visible negative contract and stays in the doc comment as the control. GRD-04 becomes MUST only if the moved hazard is not worse in plain than in doc.
- **E3 (test-only and pointer arms).** GRD-08 becomes MUST only if a one-line owner pointer holds survival at test-owned Tier-B sites.
  - The pointer names only the tests that failed the planted edit.
  - Score each proposed edit twice: *agent kept the guard*, and *guard held after running the owner*. For owned edits, the cut line uses the second number.
  - The test-owned stratum excludes the noun-only sites GRM-07, PY-03, TS-01 and OCX-13.
  - At OCX-16 and OCX-20, add a `wrong-pointer` twin that names the listed test which stays green. If survival does not drop, pointer accuracy is a correctness rule and not a survival one.
- **Site properties to stratify:**
  - ownership class per breaking edit: 16 comment-only sites plus OCX-24's digest half;
  - recogniser hit or miss, pinned to the committed implementation. The reconstruction misses 23 of the 40 eval sites. It disagrees with the original on OCX-19 and PY-02, which it fires on and the original missed;
  - type-ownable or not: 24 of 40 have a sketch;
  - register;
  - bundle count.

  The aggressive-cut result on recogniser-miss sites is exactly the ratchet's exposure.
- **Site list changes:**
  - OCX-17's probe targets the `classify()` edit.
  - Add grimoire `prune.rs:99` `is_security_class`, whose breaking edit is the `matches!` rewrite: a lint is present but the edit escapes it.
  - Add a 1-line recogniser-miss guard, "Never called: rules are skipped at the `kind_support` gate." (grimoire). The 1-2 line bucket otherwise holds only OCX-09.

## Open questions

**Needs a human decision (one-way door):**
1. **A fleet-wide guard marker.** Adopting `GUARD:` means retrofitting every guard across 10 repos and teaching every agent the convention; backing out later means a second fleet-wide churn. Default: not adopted. Decide after the eval's `marker` against `guard-line` result.

**Deserves another research round:**
- **guard-recognition.**
  - Question: can a calibrated LLM judge, built against the rebuilt fleet and human fixture, reach recall of at least 0.9 at precision of at least 0.7? It must be scored on the 23 eval sites the reconstruction misses and on the 100 fresh ocx blocks gate-replays hand-read. At what cost per 1,000 blocks?
  - Why it matters: both lexical implementations sit near 0.43 recall. Without a judge, the carve-out covers under half the guards, and neither the ratchet nor LEN-06 can judge guard loss.
- **type-owner proof.**
  - Question: in scratch copies, implement three sketches and apply each site's harvested breaking edit. The sketches are OCX-20's tri-state enum, GRM-04's typestate, and OCX-23's `ContainedPath` or PY-04's Python equivalent. Does `cargo check` or pyright refuse the edit? How many lines and call sites does each type change cost?
  - Why it matters: it decides whether GRD-12 can move from SHOULD toward MUST, and whether Python's static-only enforcement counts as ownership.

## Sub-artifacts

- [code-docs-guards/guard-shape.md](code-docs-guards/guard-shape.md): 20 fleet guards rewritten to human shape, the register rule, the seven-rule recogniser scored on 520 blocks, the marker decision and the phrasing check.
- [code-docs-guards/lint-owned-guards.md](code-docs-guards/lint-owned-guards.md): planted-edit probes of clippy, rustc and pyright lints for RAII bindings and exhaustive matches, with all 40 eval sites classified as lint-owned, test-owned or comment-only.
- [code-docs-guards/owned-guards.md](code-docs-guards/owned-guards.md): measured blast radius of four lints on ocx, grimoire and ocx-mirror, the `-A warnings` pitfall, the planted RAII rename on the real fleet files, and type sketches for the 40 eval sites.
- [code-docs-routing/tests-as-guards-proof.md](code-docs-routing/tests-as-guards-proof.md): the literal breaking edit applied at 22 named-test sites, with red, green and split results, plus Stryker and mutmut runs.
- [code-docs-ratchet/gate-replays.md](code-docs-ratchet/gate-replays.md): the recogniser reconstructed and scored on fresh ocx blocks, and a guard-loss diff check replayed over 200 ocx commits with every flag hand-read.

## Key sources

1. [code-docs-guards/guard-shape.md](code-docs-guards/guard-shape.md) §2 and §4: rewrites and the original recogniser scores.
2. [code-docs-guards/lint-owned-guards.md](code-docs-guards/lint-owned-guards.md) §1, §2 and §4: planted-lint probes and the 40-site classification.
3. [code-docs-guards/owned-guards.md](code-docs-guards/owned-guards.md) §1-§6: lint blast radius, the real-file planted rename, and type sketches.
4. [code-docs-routing/tests-as-guards-proof.md](code-docs-routing/tests-as-guards-proof.md) §2 and §3: per-site planted-edit results.
5. [code-docs-ratchet/gate-replays.md](code-docs-ratchet/gate-replays.md) §4-§9: the recogniser reconstruction, its recall and precision, and the 200-commit guard-loss replay.
6. `.agents/research/code-docs-audit/sample.md` §5: 100 fleet guards with the edit each one prevents.
7. `.agents/research/code-docs-audit/human-sample.md` "How humans write guards": 39 human guards and five wording patterns.
8. `.agents/research/code-docs-audit/eval-sites.md` §3 and the JSON site list: 40 mechanism sites with breaking edit, consequence and test.
9. `/home/mherwig/.cache/research-lang/code-docs-scratch/guards-revise/fleet320.py` and `blast.py`: this revision's re-measures (the reconstruction on the audit's 320 fleet blocks; the lint counts, split into prod and test, from owned-guards' saved clippy JSON).
10. https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/matches/mod.rs (lines 1087-1127): `match_wild_enum::check` runs only `if !from_expansion`.
11. https://raw.githubusercontent.com/rust-lang/rust/master/compiler/rustc_lint/src/let_underscore.rs: `let_underscore_drop` returns early only when `!ty.needs_drop`.
12. https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs: scope of the four clippy `let_underscore_*` lints.
13. https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs: the `SAFETY:` match paired with `UNNECESSARY_SAFETY_COMMENT`.
14. https://arxiv.org/abs/2603.21642: code comments as an indirect prompt-injection vector, and the advice to strip imperative language.
15. https://go.dev/wiki/Deprecated: the plaintext-marker precedent.
16. https://rust-lang.github.io/api-guidelines/documentation.html: C-FAILURE, the split between what a caller upholds and why the implementation is correct.
17. https://docs.python.org/3/library/typing.html#typing.assert_never: its runtime `AssertionError`.
18. https://www.typescriptlang.org/docs/handbook/2/narrowing.html: the `never` exhaustiveness idiom.
19. https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#let-underscore-drop: default level of `let_underscore_drop`.
20. https://abseil.io/resources/swe-book/html/ch20.html: Tricorder's bar of under 10% effective false positives for a code-review check, and near zero for a gate.
21. https://git-scm.com/docs/git-diff: `--color-moved=blocks` and `--diff-algorithm=histogram` for telling a moved block from a deletion.

## Revision log

2026-09-27, folding in owned-guards, tests-as-guards-proof and gate-replays:

- **Recogniser scores (Verdict 2, GRD-06).** Restated them per implementation: the original's 0.714/0.432 is lost and unreproducible. The reconstruction scores 0.652/0.430 on the same fleet fixture (*re-measured*) and 0.594 precision on fresh blocks. gate-replays called recall "reproduced", but it compared fleet recall with the original's combined score; like for like, the fleet recall is 0.430 against 0.510. Sources: gate-replays, this revision.
- **GRD-06 Verification.** Removed the false claim that scratch `recognizer2.py` reproduces the table. The self-test now pins the committed code's own numbers on a fixture rebuilt from the audit samples. Source: gate-replays.
- **GRD-06 Rule and Verification.** Resolved an internal contradiction. "A ratchet … run on a fixture that deletes a flagged block must exit non-zero" judged an edit, which the rule forbids. It now applies only to the cleanup skill's own cuts, and the ratchet only lists recogniser loss for review (LEN-06, SHOULD). The pre/post check was wrong on 12 of 12 flags. Source: gate-replays.
- **Verdict 4, GRD-07.** Credit now requires the owner to fail on the harvested edit. Added the measured 7 of 22 credit-by-name failures and four proof traps: a substituted edit, a leftover compile error, split test pairs, and a hang. Added mutation-tool limits and types as a credited owner. Sources: tests-as-guards-proof, owned-guards.
- **GRD-08 Rule.** Now names "every test that failed the planted edit, never one that stayed green", plus types, instead of any named test. Source: tests-as-guards-proof (4 of 22 split sites).
- **Verdict 5, GRD-10.** Replaced "the share the lint flags is unmeasured" with 163/70/39 (44/42/5 prod) and the raw counts 209/113/44. Fixed the overclaim "Both RAII sites are already owned by named tests": GRM-08 is proven, OCX-09 is not. Sources: owned-guards, tests-as-guards-proof.
- **GRD-10 Rule and Verification.** `let_underscore_must_use` and `let_underscore_untyped` are now a one-time audit, not standing lints. Added the `-A warnings` silent-zero pitfall and the clearance that `warnings = "deny"` forces. Source: owned-guards.
- **Verdict 5, GRD-09 Rationale.** Added the measured workspace-wide `wildcard_enum_match_arm` count, 232/108/41, to support "never workspace-wide". Source: owned-guards.
- **Verdict 7.** The comment-only floor grows from 13 to 16 sites (GRM-07, PY-03 and OCX-13 added) plus OCX-24's digest half. Lint-owned's claim that no mechanism can close OCX-23 is contradicted: a type could. The site stays comment-only until one lands. Sources: tests-as-guards-proof, owned-guards.
- **GRD-12 (new).** Route a guard to a type when one fits (SHOULD). Source: owned-guards.
- **Verdict 8 and 9 (new).** Types as an owner class, and the documented gaps. Sources: owned-guards, tests-as-guards-proof, gate-replays.
- **GRD-03.** The Rationale adds the 5 real, correct consolidations. The Verification requires whole-commit pairing, never per hunk. Source: gate-replays.
- **GRD-11 Verification.** Now uses process substitution instead of files under `/tmp`, applying gate-replays' note on LNK-06's command.
- **Amendments to shipped lore.** The IDIOM-05 amendment adds the measured cost of `let_underscore_must_use`. Source: owned-guards.
- **AI-agent failure modes.** "Credits a check" moves from rank 5 to rank 4 with its measured 32%, just below bare IDs at 35%. The regex entry gains the portability and replay numbers, and the lint-tool entry gains the `-A warnings` variant. Entry 10 is new. Sources: all three follow-ups.
- **Decisions for the eval.** E3 adds the red-test-only pointer, the noun-only exclusions and a `wrong-pointer` twin. The strata now use 16 comment-only sites, the reconstruction's misses and the type-ownable class. Sources: tests-as-guards-proof, gate-replays, owned-guards.
- **Open questions.** Removed "lint-adoption blast radius" (owned-guards answered it) and "type-owned guards" (owned-guards answered it; the remaining gap is in Verdict 9). Updated guard-recognition's targets. Added the type-owner proof round.
- **Frontmatter.** Added the three follow-ups to `consolidates` and set `revised: 2026-09-27`.
