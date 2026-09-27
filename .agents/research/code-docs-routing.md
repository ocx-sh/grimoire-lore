---
title: "code-docs routing: where everything else goes (consolidated)"
topic: routing
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-routing/routing-table.md
  - .agents/research/code-docs-routing/tests-as-guards.md
  - .agents/research/code-docs-routing/tests-as-guards-proof.md
date: 2026-09-27
revised: 2026-09-27
---

# code-docs routing: where everything else goes

Question: which store holds each kind of information a comment carries today,
and when does a test carry a guard well enough for the comment to shrink?
Paths are relative to the worktree unless prefixed `repo:` (a fleet repo under
`/home/mherwig/dev`) or absolute. Everything below was researched or
re-checked on 2026-09-27.

## Verdict

1. **Route each clause, not each block.** Only guard, why-constraint and contract clauses stay in source. All 4 sampled fleet essays, and the 96-line `is_ocx_trampoline` doc, wrap real guards in argument ([routing-table §4](code-docs-routing/routing-table.md#4-essay-split-four-fleet-essays-and-one-97-line-function)). Routing whole blocks drops those guards.
2. **Anything a future edit depends on must live in the tracked tree.** Commit bodies, PR text, backup refs and gitignored plans are never its only store, and never the target of a pointer. The frame routed history to the commit body; this program rejects that. `hex-finalize` writes each recomposed body from the diff, not from the branch's commits (`/home/mherwig/.claude/skills/hex-finalize/SKILL.md:237-239`), and backup refs are disposable. The finalized body stays a useful second copy of settled reasoning.
3. **Correction, one line:** routing-table's forge-squash argument depends on the repo. ocx allows only rebase merges; the other 6 fleet repos checked allow squash (`gh api repos/ocx-sh/ocx`, 2026-09-27). Point 2 holds without it.
4. **A test carries a guard only when the guard's breaking edit, applied in a scratch copy, turns that test red.** Shared nouns are not proof, and neither is a read of the test body. The edit was applied and the test run at 22 sites. The named test alone went red at 15. At 4, only one of two named tests went red. At 3 the named test stayed green: GRM-07, PY-03 and TS-01. Add OCX-13 from the earlier read, and 4 of 23 checked sites (17%) are noun-only. Reading the bodies flagged the 3 green sites. It also called OCX-16 and OCX-20 fully covered, and only the run showed which of their two tests catches the edit ([tests-as-guards-proof §2](code-docs-routing/tests-as-guards-proof.md#2-per-site-results-table)). This is GRD-07's planted-edit proof, measured at scale.
5. **A guard tied to a specific line keeps one local line even when a test owns it.** That line names each test the planted edit turned red, not whichever test the site happens to list. Only a universal negative, a property with no implementing line, lives solely on the test's doc comment. This resolves routing-table's guard row ("or the test's doc comment") in favour of the placement rule in [tests-as-guards §6](code-docs-routing/tests-as-guards.md#6-placement-test-code-or-both). The eval decides whether the "never zero lines" half stays MUST.
6. **Mutation testing is optional supporting evidence, never the gate.** It never gave a verdict on a guard that the planted edit did not also give.
   - cargo-mutants generates no mutant for the guard call at OCX-10 and OCX-22. It calls OCX-18's guard-collapse mutant unviable under `-D warnings`. Applied by hand, the same three edits turn all three tests red.
   - Stryker's 3 of 3 surviving mutants on TS-01's line agree with the hand edit, which stays green.
   - mutmut 3.8.0 does not run on ocx-sdk-python's `src/` layout.
   - The one thing mutation found that the planted edit did not was a separate gap beside a guard: OCX-10's `<` to `<=` mutant survives.
   - RTE-06 drops to CONSIDER. The planted-edit run answers CLN-07's pending "mutation proof".
7. **When code refers to other code, it names the symbol, never a plan ID.** That covers the test that proves a guard and a sibling with the opposite posture. This overrides tests-as-guards' "cite `S-012`" (rule 8): 0 of 30 sampled `C-` IDs resolve to one document.
8. **Invariants that hold across a whole subsystem go to path-scoped rules.** A hook built from the rules' `paths:` frontmatter backs this up. It stays SHOULD until the eval measures cold recovery from rules. Both fleet hooks keep hand-written tables that have already drifted.
9. **An essay's argument goes to a decision record when Henderson's filter says so.** A repo with few records is no excuse to keep the argument in code.
10. **Documented gaps** (tests-as-guards-proof §2-3):
    - **Tests that cannot see their guard's breaking edit.** The comment is still the only defence at these sites, so none of them may shrink:
      - GRM-07: `acquire_retries_past_a_ghost_inode` never creates real lock contention.
      - PY-03: `test_archive_member_size_is_capped` uses an archive that reports its true size, so a check on the declared size passes it too.
      - TS-01 and OCX-13: their tests never plant a symlinked parent directory.
    - **A breaking edit that hangs instead of failing.** Reordering OCX-01 hangs `a_fifo_is_not_a_trampoline_and_is_never_opened`: under `timeout 15` it exits 124 and never prints a result. Without a per-test timeout, CI hangs instead of naming the test.
    - **Platform-gated guards.** OCX-04's `#[cfg(windows)]` compile-time assert was never run. Its breaking edit has to be tested on Windows (the local cross-compile path), because on Linux the assert is not compiled at all.
    - **Tool gaps.** cargo-mutants has no operator for a bare method call. mutmut 3.8.0 fails on `src/`-layout packages ([boxed/mutmut#585](https://github.com/boxed/mutmut/issues/585) is the related upstream defect).

## The ruleset

### Routing table (the index's where-it-goes table)

| Kind of content | Destination | One-line routing test | Rule |
|---|---|---|---|
| Guard on a specific line | Plain comment at the line, at least 1 line even when tested, naming each test the planted edit turns red (doc comment only for a caller-visible precondition, per guard-shape) | Would a plausible edit here break something no type, lint or test forbids? | RTE-01, RTE-03 |
| Guard on a universal negative or absence | The guarding test's own doc comment | Is there no single line that implements the property? | RTE-04 |
| Guard a lint owns | One line naming the enabled lint (lint-owned-guards) | Does an enabled lint fail if the guard goes? | lint-owned-guards |
| Why-constraint | One sentence at the site | Local reason, no single named breaking edit? | RTE-01 |
| Subsystem-wide invariant | Path-scoped rule; per-file copies deleted | Is the sentence true verbatim at every file the rule's glob matches? | RTE-07 |
| Contract | Doc comment on the item | Does a caller outside this file need it to use the item correctly? | DOC-01..04 |
| Essay argument (alternatives, history, trade-off) | Decision record plus one file-qualified pointer (linkage grammar) | Does it argue for a decision someone could re-open? Then Henderson's filter | RTE-10 |
| Record paraphrase | Deleted; the pointer stays | Does it restate a tracked record? | RTE-09 |
| Pointer to a record | File plus heading anchor (pointer-form-and-check) | Does it name a document instead of stating the reason? | linkage |
| Reference to other code | Symbol name | Is the target a function, test or type? | RTE-05 |
| Provenance that justifies a live value | At most 2 quantified lines beside the value | Would removing it let someone "fix" the number back? | RTE-11 |
| Provenance that justifies nothing live | Deleted from code; the finalized commit body at most | Does it bear on any plausible future edit? | RTE-02, RTE-11 |
| Deferred shortcut | Marker that resolves itself: ceiling plus upgrade path (`ponytail:`) | Does it name a deliberate, deferred shortcut? | table only |
| Narration, tautology, section or phase marker | Deleted, unless a clause names what the step guards (then it is a guard: OCX-09's "Step 4: one lock") | Does the next line or the name already say it? | DOC-19 |

### Rules

**RTE-01 — Route every comment block longer than 3 lines clause by clause: guard and contract clauses stay, every other clause goes to its row of the table, and a clause that fits no row stays.**
- Rationale: routing whole blocks deletes guards inside long comments. `grimoire-vscode:src/views/details.ts:214` was sampled as an essay and is a guard ("blinked out on the second paint"). Three of 10 dry-run blocks in cleanup-procedure would fail the same way. Human plain-comment p90 is 3 lines ([code-docs-topic-map.md](code-docs-topic-map.md#what-the-grounding-changed)).
- Verification: run `grep -rc -i -e 'instead of' -e 'rather than' -e 'load-bearing' -e 'must not' -e 'never' crates/ocx_config/src` before and after the edit. Read every file whose count drops. Then apply cleanup-procedure's `gone`/`landed` check. Reading test: every clause that named a breaking edit and its consequence before the edit is still there after.
- Severity: MUST. Portability: portable.

**RTE-02 — Keep every reason a future edit depends on in the tracked tree, and never point a comment at a commit SHA, branch, backup ref or gitignored path.**
- Rationale: that text drops out of the agent's view. `hex-finalize` writes recomposed bodies from the diff (`SKILL.md:237-239`). ocx's `feat/extra-ca-certs` went from 25 commits to 10 and lost the review-round wording. `.claude/state/` is gitignored (`ocx:.gitignore:39`), yet three ocx comments cite plans inside it.
- Verification: `grep -rnE -e '// .*commit [0-9a-f]{7,40}' -e '# .*commit [0-9a-f]{7,40}' -e '\* .*commit [0-9a-f]{7,40}' crates` and `grep -rn -e '\.claude/state/' -e '\.agents/state/' crates`. Both must return nothing. On ocx today they return 1 and 3 hits. Every other pointer target goes through the linkage group's tracked-file check.
- Severity: MUST. Portability: portable.

**RTE-03 — Shrink a guard on a specific line because of a test only after applying the guard's breaking edit in a scratch copy and seeing that test fail; even then, keep one local line that names every test that failed.**
- Rationale: a test named for the constraint is not proof that it guards anything.
  - **The named test stays green on the breaking edit** at 3 of 22 sites run:
    - `grimoire:src/lock/advisory_lock.rs:131` (the `WouldBlock` arm) against `acquire_retries_past_a_ghost_inode`;
    - `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:856` against `test_archive_member_size_is_capped`;
    - `grimoire-indexer:src/validate/adapters/files.ts:68` against its test file.
  - **The test proves a simpler case.** `ocx:crates/ocx_util/src/archive/tar.rs:407-424` never plants the symlinked intermediate directory that `tar.rs:359-364` defends against.
  - **Only one of two named tests catches the edit** at 4 more sites. OCX-16's `verify || !env_opt_out` collapse is caught by `resolve_flag_wins_over_env`, not by `resolve_env_decides_when_no_flag`. OCX-20's `unwrap_or(false)` collapse is caught by the `None` test, not by the `Some(false)` test.
  - **Reading the test body is not enough.** A read flagged the 3 green sites but called OCX-16 and OCX-20 fully covered.
  - **A shared noun proves even less.** OCX-13's test doc says "symlink" at `tar.rs:404`, so a noun-in-span check passes the mismatched test ([tests-as-guards-proof](code-docs-routing/tests-as-guards-proof.md)).
- Verification: GRD-07's planted-edit proof.
  1. In a scratch copy, apply the breaking edit.
  2. Run only the named test or tests. For example, `cargo test -p ocx_sign a_file_declared_ttl_cannot_outlive_the_built_in_ceiling`, `uv run pytest tests/unit/test_bootstrap.py -k tar-slip-parent`, or `npx vitest run test/validate/files.test.ts`.
  3. Read the result three ways:
     - **A failed build is not a failed test.** When `-D warnings` rejects an import or binding the edit left unused (OCX-11, OCX-19), delete it and run again. A red only counts when the test itself prints `FAILED`.
     - **Run under `timeout`.** Exit 124 counts as red only when the guard's stated consequence is the hang itself (OCX-01).
     - **With several named tests, run each one.** Keep only the tests that failed.
  4. Confirm the local line names them: `NAME=a_zip_of_empty_entries_is_bounded_by_the_byte_cap; grep -rn -e "$NAME" crates/ocx_util/src` must return at least 2 hits (the definition plus the reference).
- Severity: MUST for the planted-edit proof and for naming the tests that failed. The "at least one line, never zero" half ships as MUST only if the eval confirms it (see [Decisions for the eval](#decisions-for-the-eval)). Portability: portable.

**RTE-04 — Put the reason for a universal negative or emergent absence (nothing reserved, never refused, never swept in) on the doc comment of the test that asserts it, phrased as fact plus consequence.**
- Rationale: an agent would otherwise attach an unbounded "and not X" list to production code, or delete the test's doc as test chatter. `ocx:crates/ocx_project/src/config.rs:3114-3124` is the model case. It is the only checkable form of the guarantee, and 7 of 15 sampled ocx guards already sit on a test's doc ([records.md §4](code-docs-audit/records.md#4-tests-as-documentation)).
- Verification: reading test. For a guard with no implementing line, a test must exist whose doc comment states the same constraint and names the plausible breaking edit ("reds the moment someone helpfully reserves `ocx`").
- Severity: SHOULD. Portability: portable.

**RTE-05 — When a comment refers to other code (the test that proves a guard, a sibling function with the opposite posture), name the symbol, never a plan ID or a `file:line`.**
- Rationale: plan IDs collide (0 of 30 unique, `C-018` in 21 files), and 45% of path citations in sampled records rot. Symbol search still finds a renamed function. `ocx:crates/ocx_project/src/config.rs:979-984` cites `C-015 / RUL-1` and never names `s012_a_tool_named_ocx_is_admitted_in_every_ascii_case`. `ocx-catalog:src/sources/labels.ts:163` gets it right.
- Verification: `NAME=a_tool_named_ocx_is_admitted_in_every_ascii_case; grep -rn -e "$NAME" crates/ocx_project/src` should hit both the test and the production doc comment. Today it hits only the test. The plan-ID families themselves go to the linkage group's `plan_id_ratchet.py`.
- Severity: SHOULD. Portability: portable.

**RTE-06 — Use a mutation run only as supporting evidence for a guard shrink, never as its proof; `unviable`, `CompileError`, `NoCoverage` or no mutant on the guarded span proves nothing, and a surviving mutant beside the guard is a test gap to report.**
- Rationale: the tool never gave a verdict on a guard that the planted edit (RTE-03) did not also give.
  - OCX-10's `.min()` and OCX-22's `.saturating_add()` never get a mutant.
  - OCX-18's guard-collapse mutant is unviable under `-D warnings`. Unviable shares were 50%, 65% and 34% on the three files.
  - Yet all three tests go red when the edit is applied by hand.
  - Stryker's 3 of 3 surviving mutants on TS-01's line (`files.ts:70`) agree with the hand edit, which stays green.
  - What mutation adds is gaps beside a guard: OCX-10's `<` to `<=` mutant survives.
- Verification, by language:
  - **TypeScript** is cheap.
    1. Install Stryker inside the project: `npm install --no-save @stryker-mutator/core @stryker-mutator/vitest-runner`. The `npx --yes` form fails with `ERR_MODULE_NOT_FOUND: typescript`.
    2. Set `mutate` to the one source file.
    3. Point `vitest.configFile` at a project-local config whose `include` names only the target test file. Stryker's dry run needs every configured test green.
    4. Run `npx stryker run` and read the surviving mutants for the guard's line.
  - **Rust**:
    1. Run `cargo mutants -p ocx_sign -f crates/ocx_sign/src/verify/trust_cache.rs --in-place` in a clean worktree, then `git status --porcelain`.
    2. Read the unviable logs with `grep -rn -e 'unused variable' -e 'unused import' mutants.out/log`.
  - **Python**: skip mutmut. Version 3.8.0 fails with an `ImportError` inside its own sandbox on `src/`-layout packages. Rely on the planted edit.
- Severity: CONSIDER (was SHOULD). Portability: portable.

**RTE-07 — Move an invariant that is true verbatim at every file a path-scoped rule's glob matches into that rule, and delete the copies in individual files.**
- Rationale: every per-file copy of a subsystem rule is one more copy that can drift. Agents also consult instruction files for 60.5% of their documentation lookups, against 10.6% for classical docs ([arXiv 2608.20195](https://arxiv.org/abs/2608.20195)). No violation was measured yet (see [Open questions](#open-questions)).
- Verification: reading test ("true at every matched file?"), plus `PHRASE=example; grep -rl -e "$PHRASE" crates/ocx_cli/src`. If the invariant's key phrase appears in 2 or more files under one rule's glob, that is a finding.
- Severity: SHOULD. The eval must confirm cold recovery from rules before this rises. Portability: portable to any client with path-scoped instructions.

**RTE-08 — Build the PostToolUse reminder that prints the rules covering a touched path from the rules' own `paths:` frontmatter, never from a hand-written table.**
- Rationale: Claude Code loads path-scoped rules "when Claude reads files matching the pattern, not on every tool use", and drops them after compaction until a matching file is read again (<https://code.claude.com/docs/en/memory>). A Write-only edit can therefore skip the rule. Both fleet tables have drifted.
- Verification: `grep -rln -e '^paths:' .claude/rules | wc -l` compared with `grep -rn -e 'subsystem-' .claude/hooks`. Every path-scoped rule the hook never names is a finding. ocx has 42 path-scoped rules, and its hook names 8 of its 14 subsystem rules.
- Severity: SHOULD. Portability: fleet default the adopter may override (Claude Code hooks).

**RTE-09 — Once a comment carries a file-qualified pointer to a record, delete the clauses that restate that record; keep only the clauses the record does not hold.**
- Rationale: agents add the pointer and keep the essay. This happened in 2 of 10 spot-checks (`ocx:crates/ocx_index/src/store.rs:4`, `ocx:crates/ocx_index/src/local_index.rs:1034`), and `ocx:crates/ocx_cli/src/command/package_verify.rs:4` does the same. Keeping local invariants the record lacks follows from RTE-01, because essays hold constraints the ADR never states.
- Verification: `grep -rn -e 'adr_[a-z_]*\.md' crates/ocx_index/src` finds candidates. Reading test: a block that names a record and restates 2 or more of its sentences is a finding.
- Severity: SHOULD. Portability: portable.

**RTE-10 — Move an argument that weighs alternatives into a decision record unless Henderson's filter says skip ("limited in scope and time and risk and cost, or already covered elsewhere"), and keep in the record the specifics that make the choice falsifiable.**
- Rationale: argument in code gets re-litigated by every reader, or silently lost in a cut. `ocx-catalog:.lighthouserc.cjs:2` is a 51-line comment in a repo with 1 tracked ADR. The rejected audit names (`color-contrast`, `link-name`, `link-in-text-block`) are what make its choice checkable later.
- Verification: reading test, Henderson's filter per essay. How few records a repo holds is not one of the filter's skip conditions.
- Severity: SHOULD. Portability: portable.

**RTE-11 — Keep provenance only when it justifies a value still in the code, as at most 2 lines carrying a count or a named artifact; rewrite history that still constrains an edit as a present-tense guard, and delete the rest.**
- Rationale: provenance and narration blocks carried guard content in 1 of 43 sampled blocks. The quantified exception is `ocx:.claude/rules/docs-quality/checks/prose.py:101` ("12 of 18"). A regex for history phrasing has 37% false positives and hits load-bearing guards another 37% of the time.
- Verification: reading test: does the sentence carry a number, a named test or a tracked artifact? `grep -rn -i -e 'used to' -e 'previously' -e 'historically' src` only locates candidates for reading. It is never a delete list.
- Severity: SHOULD. Portability: portable.

**RTE-12 — Name a test that carries a guard after the constraint, in its name or, when one function covers several scenarios, in each `pytest.param` id or `it()` string; any guard-to-test pairing check reads those ids and strings too.**
- Rationale: in parametrized tests the constraint noun often appears only in the id. `id="tar-slip-parent"` sits on `ocx-sdk-python:tests/unit/test_bootstrap.py:564-613` (`test_archive_refuses_anything_but_one_regular_member`), whose name has no "slip" or "traversal". The planted edit confirms it: deleting the traversal check turns both `[tar-slip-parent]` and `[zip-slip-parent]` red. Correction: tests-as-guards attributed that id to `test_archive_streams_single_member`.
- Verification: `grep -rn -e 'id="case' -e 'id="test' tests` must return nothing, and a pairing scan runs `grep -rn -e 'id="' -e '\bit("' tests` next to the scan of `def` and `fn` names.
- Severity: CONSIDER. The fleet already names 35-40 of 40 sampled tests as sentences. Portability: portable.

Dropped as rules the fleet already follows unprompted, or as duplicates: a sentence-name rule for Rust test functions (35-40 of 40 already comply), the `ponytail:` todo rule (1 of 320 blocks), and the commit-SHA MUST as its own rule (1 hit in 9 repos; folded into RTE-02). tests-as-guards-proof's candidates were not given new IDs:
- its "run the literal edit" MUST duplicates GRD-07;
- its split-ownership MUST and its hang CONSIDER are how RTE-03 is verified, so they are folded into RTE-03.

Pointer grammar and plan-ID bans go to the linkage group. The rule-versus-rule collision (`ocx:.claude/rules/quality-rust.md:320-327` against DOC-19) goes to the amendment pass.

## Applied to the fleet

| Rule | Satisfied | Violated | New commitment |
|---|---|---|---|
| RTE-01 | ocx guards are mostly line-local (62% of sampled ocx comment lines are guards, sample.md §4) | `grimoire-vscode:src/views/details.ts:214` (guard inside an 18-line "essay"); `ocx:crates/ocx_config/src/env.rs:1756-1851` (7 headers, one of which guards nothing) | Clause routing in the cleanup skill |
| RTE-02 | 8 of 9 repos have zero commit-SHA pointers; ocx `5c75411` body restates every durable fact of its 25-commit branch | `ocx:crates/ocx_package_manager/src/tasks/pull.rs:669` ("commit 40b001f"); `ocx:crates/ocx_setup/src/lib.rs:17`, `ocx:crates/ocx_setup/src/bootstrap.rs:17`, `ocx:crates/ocx_package_manager/src/composer.rs:5645` cite gitignored `.claude/state/plans/` (the directory is empty) | none |
| RTE-03 | `ocx:crates/ocx_sign/src/verify/trust_cache.rs:144-155` keeps its local guard beside a test that goes red on the planted edit; 15 of 22 planted-edit sites go red on their named test alone | `ocx:crates/ocx_util/src/archive/tar.rs:359-364` vs test `:407-424`; `grimoire-indexer:src/validate/adapters/files.ts:68` vs `test/validate/files.test.ts:47`; `grimoire:src/lock/advisory_lock.rs:131` vs `acquire_retries_past_a_ghost_inode`; `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:856` vs `test_archive_member_size_is_capped` (a shrink would be unsafe at all four) | Planted-edit run before every guard shrink |
| RTE-04 | `ocx:crates/ocx_project/src/config.rs:3114-3124`; 7 of 15 sampled ocx guards | none found | none |
| RTE-05 | `ocx-catalog:src/sources/labels.ts:163`; OCX-02 names `resolves_inside` | `ocx:crates/ocx_project/src/config.rs:979-984` (bare `C-015 / RUL-1`, no test named); the test doc at `:3114` cites bare `S-012 (E34, E35)` and `C-015` | none |
| RTE-06 | none | none measured; 0 of 9 fleet repos configure cargo-mutants, mutmut or Stryker (`git ls-files` scan), and mutmut 3.8.0 does not run on ocx-sdk-python's `src/` layout | none: RTE-03's planted-edit run replaces the cleanup skill's mutation spot-check |
| RTE-07 | ocx keeps 42 and grimoire 35 path-scoped rules for subsystem invariants (records.md §6) | none measured; how often it happens is an open question | none |
| RTE-08 | both repos already ship the hook shape | `ocx:.claude/hooks/post_tool_use_tracker.py:31-39` omits subsystem-cli-api, -cli-commands, -deps, -metadata-schema, -script, -taskfiles and the `crates/ocx_index/**` glob; `grimoire:.claude/hooks/post_tool_use_tracker.py:31-36` uses narrower globs than the rules' `src/**` and omits `subsystem-config-keys.md`; lore `rules/rust-quality/docs-and-tracing.md` has no frontmatter at all | Hook generated from frontmatter |
| RTE-09 | `ocx:crates/ocx_store/src/file_structure.rs:53` (one-clause pointer `adr_index_indirection.md` A1, no paraphrase) | `ocx:crates/ocx_index/src/store.rs:4`; `ocx:crates/ocx_index/src/local_index.rs:1034`; `ocx:crates/ocx_cli/src/command/package_verify.rs:4`; `grimoire:src/cli/color.rs:86-96` (points at the module docs, then restates the precedence chain) | none |
| RTE-10 | ocx 96 of 96 and arcana 23 of 23 ADRs tracked | `ocx-catalog:.lighthouserc.cjs:2` (51 lines; its "WP2 completion report" pointer is itself a bare ID with no tracked file) | Second ocx-catalog ADR |
| RTE-11 | `ocx:.claude/rules/docs-quality/checks/prose.py:101` | `ocx-catalog:.lighthouserc.cjs:2` restates thresholds the config object already holds | none |
| RTE-12 | 35-40 of 40 sampled names per repo are sentences (records.md §4); PY-02's `[tar-slip-parent]` and `[zip-slip-parent]` ids go red on the planted edit | none measured | Pairing check reads ids and strings |

## AI-agent failure modes

Ranked by how often each was measured to bite.

1. **Writing the plan's own ID as the pointer** (1,872 ocx prod lines; `composer.rs:5645` cites `C-006`, `C-012`, `C-013` and `S-005`, all defined only in a gitignored plan). The agent reuses the vocabulary in its context. Routed to the linkage group; RTE-02 and RTE-05 close the routing half.
2. **Crediting a named test without running the breaking edit** (7 of 22 planted-edit sites; OCX-13 on top). The test stays green at 3 sites, and at 4 only one of two named tests catches the edit. Every one shares nouns with its guard. Check: RTE-03's planted-edit run, each named test separately.
3. **Routing a long block as one unit** (3 of 10 dry-run blocks; details.ts:214). Length marks it an essay, and the guard clause goes with the cut. Check: RTE-01's before/after count of counterfactual clauses.
4. **Adding the pointer and keeping the paraphrase** (2 of 10 spot-checks). Check: RTE-09's reading test.
5. **Misreading a planted-edit run that never reaches a test result** (3 of 22). At OCX-11 and OCX-19 the build fails first, on an import or binding the edit left unused, and a failed `cargo test` looks like a red. OCX-01 hangs. Check: require the test's own `FAILED` line; delete the leftover and run again; run under `timeout` (RTE-03).
6. **Reading mutation output as safety.** A green run on the branch below a guard, or a high `unviable` count, gets taken as protection (all 3 runs). Check: RTE-06 never lets mutation output license a shrink.
7. **Giving up on the tool, or not knowing when to.**
   - ocx's default copy mode fails with ENOSPC.
   - `-p ocx_package` needs five `__testing` features, and `-p ocx_project` needs `ocx_oci/__testing`.
   - `npx --yes` Stryker fails on ESM resolution.
   - mutmut 3.8.0 does not run on a `src/` layout at all.

   Check: use `--in-place` in a clean worktree, read the `E0433` crate names one at a time, and install Stryker into the project. When mutmut fails in its sandbox, stop and use the planted edit.
8. **Editing without the governing rule loaded.** Rules load on read, and a Write-only edit or a compaction skips them. Frequency unmeasured. Check: the RTE-08 hook.
9. **Pointing at a commit** (1 in 9 repos). Check: RTE-02's grep.

## Decisions for the eval

Arm names and the margin follow [code-docs-eval.md](code-docs-eval.md) (EVL-07). This file previously said `test-only` and δ = 5.

- **Arms.** This group adds no arm.
  - **`rules` arm.** This group fixes its frozen text for tested sites: one line of fact plus consequence, naming each test the planted edit turned red (RTE-03).
  - **`deleted` arm.** It removes the comment and keeps the tests. Report its Tier-B sites separately for each planted-edit result from [tests-as-guards-proof §2](code-docs-routing/tests-as-guards-proof.md#2-per-site-results-table):

    | Planted-edit result | Sites |
    |---|---|
    | One test owns the guard | OCX-01, -10, -11, -18, -19, -22, GRM-01, PY-02, PY-04, TS-02, TS-04 |
    | One test of a named pair owns it | OCX-20, GRM-05, GRM-08 |
    | Noun-only: no named test owns it | OCX-13, TS-01 |
    | Not yet run | OCX-03, OCX-05, OCX-09 |

  - **Prediction.** `deleted` loses the guard on noun-only sites. The eval's pooled 18-site test for "a test named for the constraint lets the guard comment go" mixes these groups.
  - **Optional extra pair.** GRM-07 and PY-03 are also noun-only, but they are Tier C (obviousness ≤ 2). If the budget allows, add them as a pair reported separately.
- **Site property.** Record each site's planted-edit result (one test red, one of a pair red, green, not run). Record whether the guard sits on a specific line or is a universal negative.
  - Run the planted edit on OCX-03, OCX-05 and OCX-09 before the eval. OCX-05 is a Windows-gated guard like OCX-04, so it needs the Windows run.
  - Add `ocx:crates/ocx_project/src/config.rs:3114-3124` (S-012) as the one universal-negative site. None of the 48 sites is one today.
- **Where-found.** `extract.py` tags stores by path, but ocx keeps its tests in in-file `#[cfg(test)]` modules, so reading a guard on a test doc is tagged `source`. Record each read's line range and tag it `test` when the range falls inside a test-module span. eval-scoring already orders `agent-config` before `record`, so `.claude/rules/subsystem-*.md` reads count as rules.
- **Git channel.** RTE-02 rests on the fleet's git flow (`SKILL.md:237-239`, gitignored state), not on agent behaviour. It ships as MUST without the eval, and this group does not need the history-bearing variant.
- **Must confirm before MUST.**
  - **RTE-03's "never zero lines" half:** `deleted` must fail non-inferiority against `original` (δ = 10 points, EVL-07) on the 11 sites where one test owns the guard. If `deleted` holds there, that half drops to SHOULD. The planted-edit half needs no eval, because it is a measured fact about the tests.
  - **RTE-01:** confirmed through the `rules` arm as a whole; that arm must be non-inferior to `original`.
  - **RTE-07:** stays SHOULD until an optional rule-routed arm, with the reason moved into a path-scoped rule inside the snapshot, shows cold recovery.

## Open questions

Human decisions (one-way doors only):

1. **Squash merges.** 6 of the 7 fleet repos checked allow squash; ocx is rebase-only. Each squash permanently discards a finalized series' bodies. Decide per repo whether to disable squash where you want those bodies kept as the second copy. Default: leave the settings alone, since no RTE rule depends on commit bodies.
2. **`ocx` branch `feat/extra-ca-certs`.** It still carries the armed ref `backup/feat/extra-ca-certs-pre-finalize` next to the inert `backup/feat/extra-ca-certs-2dcad4ba` (re-checked 2026-09-27). Under hex-state, the armed ref blocks commits onto that branch. Releasing or deleting it is your call; deleting it discards pre-finalize history.

Another research round:

- **rules-as-store.** Does a cold agent recover a reason moved into a path-scoped rule when its only action is a Write, and how often do fleet sessions edit a file without the matching rule loaded? This needs the rule-routed eval arm and session logs.

## Sub-artifacts

- [code-docs-routing/routing-table.md](code-docs-routing/routing-table.md): the 11-category routing table, the commit-body verdict across `hex-finalize`, path-scoped rules and the hook, and five worked essay splits.
- [code-docs-routing/tests-as-guards.md](code-docs-routing/tests-as-guards.md): cargo-mutants runs on OCX-10, OCX-18 and OCX-22, the unviable-denominator problem, the noun-pairing check (18/18 hit, 2/18 wrong mechanism), naming, and placement on the test versus the code.
- [code-docs-routing/tests-as-guards-proof.md](code-docs-routing/tests-as-guards-proof.md): the planted breaking edit applied at 22 sites (15 red on one test, 4 red on one of a pair, 3 green, OCX-04 not run), the hand-edit reversal of the cargo-mutants blind spots, a Stryker run on TS-01, and the mutmut `src/`-layout failure.

## Key sources

- <https://code.claude.com/docs/en/memory>: path-scoped rules trigger on read, not on every tool use, and are lost after compaction.
- <https://arxiv.org/abs/2608.20195>: 60.5% of agent documentation consultations hit instruction files.
- <https://github.com/joelparkerhenderson/architecture-decision-record>: the ADR-worthiness filter.
- <https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html>: name symbols, don't link paths.
- <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>: records are superseded, never rewritten.
- <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges>: squash message content depends on settings.
- <https://mutants.rs/mutants.html>: cargo-mutants' operator catalog; it has no operator for a method call.
- <https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/>: CompileError is excluded from the score.
- <https://stryker-mutator.io/docs/stryker-js/vitest-runner/>: the `configFile` scoping that gets past an unrelated failing test.
- <https://mutmut.readthedocs.io/en/latest/>: mutmut scoping syntax.
- [boxed/mutmut#585](https://github.com/boxed/mutmut/issues/585): open mutmut 3.8.0 defect on `src/`-layout packages, no workaround.
- `/home/mherwig/.claude/skills/hex-finalize/SKILL.md:237-239`: recomposed messages are derived from the diff.
- [code-docs-audit/records.md](code-docs-audit/records.md): the 7-of-15 test-doc guards, 45% record path rot, commit-body statistics.
- [code-docs-audit/eval-sites.md](code-docs-audit/eval-sites.md): Tier A/B/C sites, each site's breaking edit, and the TS-01 mismatch.
- [code-docs-audit/config.md](code-docs-audit/config.md): 2 of 10 pointer-plus-essay spot-checks, and the rule collision.
- `ocx:crates/ocx_project/src/config.rs:979-984,3114-3124`: the placement case for a universal negative.
- `ocx:crates/ocx_util/src/archive/tar.rs:359-424`: the noun-paired, mechanism-mismatched test.
- `grimoire:src/lock/advisory_lock.rs:131,311` and `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:856`, `tests/unit/test_bootstrap.py:620`: the two noun-only tests the planted-edit pass found.

## Revision log

All revisions dated 2026-09-27. Every change below comes from [tests-as-guards-proof](code-docs-routing/tests-as-guards-proof.md) unless it names another source.

- **Verdict 4 and RTE-03, proof standard.** A test now counts as carrying a guard only when the planted breaking edit turns it red. The old standard was that a read of the test body shows it builds the guard's scenario. That read called OCX-16 and OCX-20 fully covered, although only one of their two tests catches the edit, and a noun check passes OCX-13 through its test doc (`tar.rs:404`).
- **RTE-03, which test to name.** The local line now names every test that went red, not any test the site lists. At 4 of 22 sites only one of two named tests catches the edit.
- **RTE-03, verification.** A failed build is no longer read as a red (OCX-11, OCX-19). A timeout counts as red only when the guard's consequence is a hang (OCX-01). The noun-in-span grep is gone, because it passes a mismatched test.
- **Verdict 6 and RTE-06, severity.** The rule drops from SHOULD to CONSIDER and now reads "supporting evidence, never proof".
  - The hand edit turns OCX-10, OCX-18 and OCX-22 red where cargo-mutants had no viable mutant.
  - Stryker only agreed with the hand edit on TS-01.
  - The mutmut command was removed because it does not run on ocx-sdk-python. The Stryker command was replaced with the in-project install and scoped config that actually ran.
- **Verdict 5 and the routing table's guard row.** Both now say the local line names each test the planted edit turned red.
- **Verdict 10, new.** Adds the documented gaps: the noun-only tests (GRM-07, PY-03, TS-01, OCX-13), OCX-01's hang, OCX-04's Windows-only assert, and the mutation-tool gaps.
- **RTE-12.** Adds the planted-edit confirmation of PY-02's ids.
- **Applied to the fleet.**
  - RTE-03 row: adds the GRM-07 and PY-03 violations and the 15-of-22 satisfied count.
  - RTE-06 row: drops the mutation spot-check commitment.
  - RTE-12 row: adds PY-02.
- **Failure modes.**
  - New entry 2: crediting a named test without running the edit, 7 of 22.
  - New entry 5: misreading a run that never reaches a result, 3 of 22.
  - Entry 7: adds `ocx_project`'s feature gap, the Stryker ESM failure and mutmut's `src/`-layout failure.
  - The old "shared nouns" entry (2 of 18) is folded into entry 2.
- **Decisions for the eval, from [code-docs-eval.md](code-docs-eval.md).** The arm is renamed from `test-only` to `deleted` and the margin changed from δ = 5 to δ = 10, because EVL-07 rejects δ = 5.
- **Decisions for the eval, strata.** Tier-B sites are now split by planted-edit result instead of reading-based pairing. OCX-03, -05 and -09 are listed as not yet run.
- **Open questions.** Removed the tests-as-guards round. Its noun-only rate is now measured at 4 of 23, and the precision of the static pairing check no longer gates anything.
- **Frontmatter.** Adds tests-as-guards-proof to `consolidates` and adds `revised: 2026-09-27`.
