---
title: "code-docs cleanup: the skill's procedure and safety"
topic: cleanup
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-cleanup/cleanup-procedure.md
  - .agents/research/code-docs-routing/tests-as-guards-proof.md
  - .agents/research/code-docs-ratchet/gate-replays.md
cross-checked:
  - .agents/research/code-docs-guards/guard-shape.md
  - .agents/research/code-docs-guards/lint-owned-guards.md
  - .agents/research/code-docs-guards.md
  - .agents/research/code-docs-routing/routing-table.md
  - .agents/research/code-docs-routing.md
  - .agents/research/code-docs-ratchet/length-and-ratchet.md
  - .agents/research/code-docs-eval/eval-scoring.md
  - .agents/research/code-docs-eval/eval-arms-and-sites.md
  - .agents/research/code-docs-linkage/plan-ids.md
  - .agents/research/code-docs-linkage/record-to-code-rot.md
date: 2026-09-27
revised: 2026-09-27
---

# code-docs cleanup: the skill's procedure and safety

Question: what procedure lets an agent shorten comments without deleting guards,
touching code, or keeping the old text, enforced structurally?

This wave produced one sub-artifact for the group
([cleanup-procedure.md](code-docs-cleanup/cleanup-procedure.md)). Its conflicts are
with sibling wave-2 dives that set the inputs it consumes, so those were read for
this consolidation, and the fleet sites and prototype scripts were re-run on
2026-09-27. The revision of 2026-09-27 folds in two follow-ups:
[tests-as-guards-proof](code-docs-routing/tests-as-guards-proof.md) ran each
site's breaking edit against its named test, and
[gate-replays](code-docs-ratchet/gate-replays.md) rebuilt the guard recogniser
and replayed a LEN-06-shaped removal check over 200 ocx commits.

## Verdict

1. **Keep is the default.** The skill deletes a block only when it positively identifies it as narration, tautology, a banner, a bare ID or unquantified pure provenance. This overrules cleanup-procedure's last bucket, "default: delete". That list has no why-constraint row (33 sampled blocks, `sample.md` §2). The lexical recogniser misses 49% to 57% of the 100 sampled fleet guards, depending on the implementation, and they would all fall through to that bucket (guard-shape §4, gate-replays §5).
2. **Split any guard-bearing block over 5 lines clause by clause.** The dry run under-counted its own blocks. `ocx:crates/ocx_sign/src/verify/pipeline.rs:1383` holds at least three guard clauses, not the one it reported.
3. **Safety is one diff-time script, and only its structural sub-checks block.** `rules/code-docs/checks/cleanup_check.py --base REF` fails a diff when:
   - a non-prose line changes;
   - a test path or in-file test region is touched;
   - removed text survives elsewhere, or relocated text does not land (both derived from the diff);
   - a block the recogniser flags is removed whole with no replacement anywhere in the diff.

   The re-fire sub-check on shortened blocks only lists them for review. A regex misses good rewrites: 6 of 20 loss-free rewrites lose the hit (code-docs-guards verdict 2), and 3 of the 12 flags in gate-replays' 200-commit replay are sound rewrites of this kind. The dive's code-only proof let three edits through that this check now fails: a clap `--help` edit, a `@ts-expect-error` deletion and a doctest deletion (probe run 2026-09-27).
4. **The reason re-check asks the unled question first.** The led `P2` prompt from `run_probes.py` only serves as a gate against confabulated answers. This takes eval-scoring §1 over cleanup-procedure §5. The re-check stays SHOULD until the eval shows it predicts guard survival.
5. **A guard shrinks to a pointer only when its owner is proven.** Present is not proven. The owner must fail when the guard's breaking edit is applied in a scratch copy. Owners are an enabled lint, a scoped `deny` or a named test. Named tests often miss that bar. Of 22 run, 15 fail on their own, 4 fail only as a pair, and 3 stay green (tests-as-guards-proof §2).
6. **Clean touched files by default.** A mass sweep runs one file per commit, gated on other branches' diffs. The dive's `git log --since` gate cannot see in-flight branches. It would clear `ocx:crates/ocx_shell/src/shell/hook.rs` today, which an open branch is editing.
7. **Rendered doc text is out of scope.** Text that renders to users (`interface`) belongs to the interface-leak change, which is allowed to regenerate goldens. The cleanup never edits it.
8. **Documented gaps.** The follow-ups established four gaps:
   - No mechanical check proves that a shortened guard kept every clause. The re-fire flag is advisory, so CLN-02 rests on reading, CLN-06 and the eval.
   - The carve-out cannot run until GRD-06's `guard_recogniser.py` is committed with its fixture. The scratch original is gone. An independent rebuild from the published rule table gets precision 0.594, not 0.714, so the published number does not carry over without the script (gate-replays §4, §6).
   - An owner that is compiled out on the host proves nothing there. OCX-04's Windows-only `assert!` is inert on Linux, so its guard stays whole unless the check runs on its target.
   - mutmut 3.8.0 does not run on a `src/`-layout package (ocx-sdk-python). On that layout the hand-applied edit is the only Python proof.

## The ruleset

The procedure the skill runs. Each step names the rules it applies.

1. Scope: only files the change already touches (CLN-08). Skip interface, directive, licence, doc-fence, trailing-comment and test-region lines (CLN-03, CLN-05).
2. Classify each `blocks_of()` block, checking for a guard first. Delete only on positive identification (CLN-01).
3. For a guard block over 5 lines, split it into clauses and keep every clause that names an edit and its consequence. Rewrite a guard phrased as history into the present tense, in guard-shape's form: a fact plus its consequence, never an instruction (CLN-02).
4. Replace a guard with a pointer only when a planted-edit run proves its owner, and name every test that failed (CLN-07). Split an essay by routing-table's procedure: the argument goes to a record, appended only, and the code keeps one file-qualified pointer.
5. Run `cleanup_check.py --base origin/main`, then the repo's own gate (CLN-01 to CLN-05). Read every block the check lists for review.
6. Run one fresh-context re-check per shortened guard (CLN-06). Commit.

### CLN-01: keep unless positively identified

- **Rule:** Classify every comment block in routing-table order (guard, contract, pointer, todo-debt, provenance, record-paraphrase, essay, then narration, tautology, banner or bare ID). Delete only a block positively identified as narration, tautology, banner, bare ID or unquantified pure provenance. A block that matches nothing, or that the guard recogniser flags, stays.
- **Rationale:** Prevents deleting why-constraints and the guards the lexical recogniser misses. It misses 49% of the 100 sampled fleet guards in guard-shape (recall 0.510, §4) and 57% in gate-replays' rebuild (recall 0.430, §5). Both kinds fall through to cleanup-procedure's "default: delete" bucket (cleanup-procedure §2, step 5).
- **Verification:** Reading heuristic: positive identification uses routing-table §1's one-line tests.
  - Narration means the next code line already says it.
  - Tautology means the name already says it.
  - Pure provenance means past tense, no present obligation and no number.

  Mechanical backstop: the carve-out sub-check fails when both hold:
  - a block the diff removes whole fired a recogniser rule before the edit;
  - no clause, pointer, test or lint replacement lands anywhere in the diff.

  It pairs removed and added blocks across the whole diff by `difflib.SequenceMatcher` ratio. Hunk-local longest-run pairing misread two flags in gate-replays §8: a verbatim move (#1) and two unrelated comments (#7). `git diff --color-moved=blocks --diff-algorithm=histogram` can pre-filter byte-identical moves. The carve-out stays blocking although LEN-06 does not, for two measured reasons:
  - All 12 of LEN-06's false flags come from commits that also change 6 to 211 code lines in the same file (this revision's count over `len06_findings.json`). CLN-03 forbids that in a cleanup diff.
  - All 13 recogniser false positives in gate-replays §6 are contract or design-rationale prose. None is narration, tautology, a banner, a bare ID or pure provenance, so deleting one already breaks this rule. This revision read 6 of the 13.

  Before it ships, the sub-check must pass gate-replays' two planted fixtures: a verbatim move is not flagged, and a true deletion is.
  ```
  python3 rules/code-docs/checks/cleanup_check.py --base origin/main
  ```
- **Severity:** MUST
- **Portability:** portable

### CLN-02: split guard blocks over 5 lines clause by clause

- **Rule:** Before shortening a guard-bearing block longer than 5 lines, split it into clauses. Keep every clause that names a breaking edit and its consequence as its own sentence, at the line it guards. Never paraphrase several guards into one line.
- **Rationale:** Prevents silently dropping the second or third guard in a bundle. Bundles occur in 3 of the 10 dry-run blocks (cleanup-procedure §2) and in 4 of the 20 guard rewrites (guard-shape §2). The dry run itself missed two clauses in `pipeline.rs:1383`: the transport bypass that breaks `--offline`, the `--platform` narrowing that "would refuse membership", and the shared resolver "so the three cannot diverge".
- **Verification:** Reading heuristic first: list every edit the block forbids, and confirm each still has a surviving sentence. The re-fire sub-check of the command below compares, per shortened block, the sentences that fire at least one recogniser rule before and after. Fewer after puts the block on the review list. It never fails the diff.
  - Why only a flag: shortening a guard is this skill's job, and a regex misses good rewrites. 6 of 20 loss-free rewrites lose the hit (code-docs-guards verdict 2). 3 of the 12 LEN-06 flags in gate-replays §8 are sound rewrites the recogniser no longer fires on.
  - A blocking re-fire would also push the agent to keep trigger words rather than clauses.

  The threshold of 5 is length-and-ratchet's plain cap, which flags 0 of 39 human guards. It replaces cleanup-procedure's "~5-8".
  ```
  python3 rules/code-docs/checks/cleanup_check.py --base origin/main
  ```
- **Severity:** MUST. The mechanical backstop is advisory, so the MUST rests on the eval confirmation below.
- **Portability:** portable

### CLN-03: non-prose lines stay byte-identical

- **Rule:** Leave every non-prose line byte-identical: code, `interface` doc text (clap, schemars, click), tool directives, licence headers, and fenced code inside doc comments. Prove it per file by comparing the ordered sequence of those lines against the base, then run the repo's own build, doc and lint gate.
- **Rationale:** Prevents an edit riding along in a "comment-only" diff. A count check misses same-length substitutions, and cleanup-procedure's code-only sequence proof misses three more (this consolidation's probe re-ran `comment_census.classify()` on 2026-09-27):
  - it passes an edited clap help line, a deleted `// @ts-expect-error`, and a deleted Rust doctest;
  - ocx runs doctests per library crate (`ocx:taskfile.yml:127`, `:552`);
  - Python loses a function body when its only docstring goes.
- **Verification:** The same command, plus the repo gate (in ocx, the doctests run inside `bazel:test:unit`). Frozen kinds are `code`, `interface`, `directive`, `license`, and doc lines between fences. The fence exposure in ocx is 122 fence lines:
  ~~~
  python3 rules/code-docs/checks/cleanup_check.py --base origin/main
  grep -rnF -e '/// ```' -e '//! ```' --include='*.rs' crates | wc -l
  ~~~
  This check also covers the commission's "never edit an error branch" and the dive's planted Guard-and-Go stub. Re-running `comment_only_check.py` on `after_bad2.rs` fails at 4 code lines before and 6 after.
- **Severity:** MUST
- **Portability:** portable

### CLN-04: removed prose is gone; relocated prose lands

- **Rule:** Derive the removed prose from the diff, never from a manifest the editing agent wrote. Fail when non-guard text the diff removes survives at 80% or more token overlap anywhere else in the file's comments. Fail when a claimed relocation target does not contain the text. A pointer and the paraphrase it replaces never coexist.
- **Rationale:** Prevents Guard-and-Go in prose. CanItDelete finds it in 29% of passing patches, and adding deletion-checking tests cut success from 63.2% to 41.9% (arXiv 2607.28887). The fleet has the prose analogue: 2 of 10 sites carry a pointer next to the essay it should have replaced (`config.md` §4). METR's own mitigation, patching the scoring function, applies here as a principle: the graded agent must not write the grading input.
- **Verification:** The `gone` and `landed` sub-checks of the same command. The prototype is `deletion_check.py`, using summed `SequenceMatcher` blocks rather than the longest contiguous run. The 80% threshold is provisional (see the eval decisions).
  ```
  python3 rules/code-docs/checks/cleanup_check.py --base origin/main
  ```
- **Severity:** MUST
- **Portability:** portable

### CLN-05: forbidden paths and regions

- **Rule:** Fail any cleanup diff that touches any of:
  - a test file, or a line inside an in-file test region (`Line.test`, meaning `#[cfg(test)]`);
  - a lock or manifest file;
  - a generated or golden file;
  - any path outside `EXT_LANG`, other than a declared relocation record, which may only be a new record or receive additions only.

  The check enforces this, never the prompt.
- **Rationale:** Prevents an agent "tidying" a test, lock file or record under pressure. METR measured that a "do not reward hack" instruction moved o3 only from 80% to 70% (failure.md). The dive's prototype tests paths with `scope_of()` alone, but 467 ocx files contain `#[cfg(test)]`, and `scope_of()` calls 460 of them prod. Accepted records are append-only by record-to-code-rot's addendum rule.
- **Verification:** The paths sub-check of the command below, which uses `scope_of()`, `Line.test` and a lock-basename list. The gap and the append-only test for a relocation target:
  ```
  python3 rules/code-docs/checks/cleanup_check.py --base origin/main
  grep -rl -e '#\[cfg(test)\]' --include='*.rs' crates | wc -l
  TARGET=.claude/artifacts/adr_index_indirection.md
  git diff --numstat origin/main -- "$TARGET"
  ```
  The second `numstat` column (deleted lines) must be 0.
- **Severity:** MUST
- **Portability:** portable (adopters extend the lock-basename list)

### CLN-06: fresh-context reason re-check per shortened guard, unled first

- **Rule:** After shortening a guard, run a fresh read-only session against the edited tree:
  1. Ask the unled question first: why is this line written this way, and what would break if it changed?
  2. Score that answer for mechanism plus consequence.
  3. Only then ask the led question naming the guard's recorded breaking edit, as a consistency gate. A `may-change` there after a strong unled answer is a fail.
- **Rationale:** Prevents trusting the editing agent's own sense that the meaning survived:
  - refinement is the most comment-sensitive task measured (up to −90%, arXiv 2512.16790);
  - models recover at most 24% of a bad comment's effect even when warned (arXiv 2609.09242);
  - the led-only form cleanup-procedure specified hands the answer over (CodeCrash: 23.2% degradation under leading NL, arXiv 2504.14119).
- **Verification:** Use eval-scoring's turns 2a and 2b and its tool allowlist (`run_probes.py:25-41`, Edit and Write disallowed, `--max-budget-usd 2`). Score with eval-scoring's opus judge once it clears ICC ≥ 0.70 on the calibration set. Until then, a human reads every fail. cleanup-procedure's Jaccard ≥ 0.3 bar is dropped as an uncalibrated proxy.
- **Severity:** SHOULD. It is required for any mass-sweep file, and becomes MUST only when the eval confirms it (see the eval decisions).
- **Portability:** portable

### CLN-07: a guard becomes a pointer only when its owner is proven

- **Rule:** Shrink a guard to a one-line pointer only when every breaking edit it names has a proven owner in that package. An owner is proven only when it fails on that edit, applied in a scratch copy. The owner is one of: the lint enabled in the manifest, a scoped `#[deny(clippy::wildcard_enum_match_arm)]` on an exhaustive match, or a named test. The pointer names every test that failed on the edit, and no test that stayed green. Any edit without a proven owner keeps its mechanism, the breaking edit and the consequence.
- **Rationale:** Prevents replacing the only defence with a pointer to nothing. 12 of 40 mechanism sites are comment-only (lint-owned-guards §4). Where a test is named, the name alone was wrong for 7 of 22 sites run (tests-as-guards-proof §2):
  - 3 stay green on the literal breaking edit: GRM-07, PY-03 and TS-01. On TS-01, Stryker agrees: all 3 mutants on the guarded line survive.
  - 4 fail only as a pair, so a pointer can name the wrong half: OCX-16, OCX-20, GRM-05 and GRM-08.

  The ratchet's diff-time check no longer backs this rule up. LEN-06 ships as SHOULD after 12 of 12 false flags (gate-replays §8), which leaves CLN-07 as the only blocking stop.
- **Verification:** A planted-edit run per owner. In a scratch copy, apply one breaking edit at a time, then run only that owner under `timeout`:
  ```
  grep -rn -e 'let_underscore_drop' --include='Cargo.toml' .
  CRATE=ocx_sign; NAME=a_file_declared_ttl_cannot_outlive_the_built_in_ceiling
  timeout 1800 cargo test -p "$CRATE" "$NAME"
  ```
  The owner must fail. Four cases need care:
  - A build error from a leftover the edit orphans is not a fail. OCX-11 and OCX-19 leave an unused import or binding under `-D warnings`. Remove what the compiler names, then re-run.
  - Exit 124 with no `test result:` line counts as a fail only when the guard's stated consequence is a hang. At OCX-01 the edit opens a FIFO that has no writer.
  - An owner compiled out on this host is unproven (OCX-04).
  - A mutation tool is optional support, never the proof. Stryker is cheap and decisive for TypeScript once it is scoped to one test file. cargo-mutants has no operator for `.min()` or `.saturating_add()`, and it reports orphaned bindings as unviable. mutmut 3.8.0 does not run on a `src/` layout.

  Cost: one warm build per repo, then seconds per test. The warm build is `cargo test --workspace --no-run`, about 9 minutes in ocx and 1m25s in grimoire. Some ocx crates need an undocumented feature to compile their tests: `ocx_project` needs `--features ocx_oci/__testing`. The lint grep is still empty in ocx and grimoire (0 manifests each, re-run 2026-09-27).
- **Severity:** MUST (was SHOULD). The proof is now a measured, runnable check. Failing it only means the guard stays whole.
- **Portability:** portable

### CLN-08: touched files by default; mass sweep one file per commit, gated on other branches

- **Rule:** Clean only the files the current change already touches. Run a mass sweep of a repo's top comment-mass files only as one file per commit. Skip a file while any other worktree branch has it in its diff against main, and check this before starting and again before merge.
- **Rationale:** Prevents collisions with in-flight work on exactly the files where the mass sits: 25 of 636 ocx files hold 34% of it (`census.md` §2). cleanup-procedure's gate, `git log --since=2.days` on the sweep branch, returns 0 for `hook.rs` today, yet an open ocx branch is editing it.
- **Verification:** Any output from this command means skip the file.
  ```
  FILE=crates/ocx_shell/src/shell/hook.rs
  git worktree list --porcelain | grep -e '^branch' | cut -d/ -f3- | xargs -r -I{} git diff --name-only main...{} -- "$FILE"
  ```
- **Severity:** SHOULD
- **Portability:** fleet default the adopter may override

**Dropped from the sub-artifact:**
- Normative #8 (thresholds are CONSIDER): not a rule; it moves to the eval decisions.
- "Error branches" as a separate forbidden path: CLN-03 already subsumes it.
- The history-phrase rewrite as its own rule: CLN-01 keeps those guards, and guard-shape owns their wording.

## Applied to the fleet

The first pass read ocx at `2691d3c16` (2026-09-25), and grimoire and grimoire-vscode at HEAD on 2026-09-27. The follow-ups ran at ocx `2691d3c1`, grimoire `7dc3d6b8`, ocx-sdk-python `9713f0a9` and grimoire-indexer `fd624615`. This revision re-read grimoire at `be3a7382`.

| Rule | Status | Evidence |
|---|---|---|
| CLN-01 | **violated** in ocx's local rules; new commitment everywhere | `ocx:.claude/rules/quality-rust.md:320-327` protects every `// ── Section ──` divider and phase or step comment, which conflicts with DOC-19 (`rules/rust-quality/docs-and-tracing.md:81`). DOC-20 (`:82`) is a SHOULD keep-list with no order. The prior ocx plan tabled real guards for deletion (`ocx:.claude/artifacts/research_code_comment_density.md:175-181`). |
| CLN-02 | **violated** in ocx | `ocx:crates/ocx_sign/src/verify/pipeline.rs:1383`: 34 lines, at least 3 guard clauses. `ocx:crates/ocx_store/src/file_structure/toolchain_store.rs:430`: 20 lines, 5 clauses (choke point, `is_link` vs `is_symlink`, raw `read_link`, error means invalid, CWE-426 by equality). `ocx:crates/ocx_announce/src/forge/api.rs:167`: 10 lines, 2 clauses. |
| CLN-02 | satisfied | `grimoire:src/install/path_anchor.rs:249`: 2 lines, "the fail-closed read path". `ocx:crates/ocx_config/src/lib.rs:1591`: a 2-line `SAFETY:`. |
| CLN-03 | new; no fleet check exists | The nearest check, `build_arms.py:157-167`, counts code lines and only warns. ocx runs doctests (`ocx:taskfile.yml:127`, `:552`) and has 122 doc-fence lines under `crates/`. |
| CLN-04 | **violated** in ocx | `ocx:crates/ocx_index/src/store.rs:4` cites `adr_index_indirection.md` Decisions A2/B1/B2 and restates them over 22 lines. `ocx:crates/ocx_index/src/local_index.rs:1034` does the same (`config.md` §4, #6). |
| CLN-05 | partial in ocx and grimoire | The identical `pre_tool_use_validator.py` denies `.git/`, `.env` and `.mcp.json` (`ocx:.claude/hooks/pre_tool_use_validator.py:65`, `:144-151`) and one generated workflow (`:67-74`). This is the structural precedent, but it covers no tests and no locks. 460 ocx files that `scope_of()` calls prod contain `#[cfg(test)]`. |
| CLN-06 | new | `run_probes.py:47-57` has only the led `P2`. The unled 2a exists only as eval-scoring's design. |
| CLN-07 | **violated** in ocx | `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:891`, "Step 4: one lock over the whole body, held until this call returns.", states the mechanism only: no `_` rename, no consequence. It stands in for a lint that 0 ocx and 0 grimoire `Cargo.toml` files enable. Its named test (`:5777`) is still unproven, because OCX-09 was outside the proof pass. The same `_` rename at GRM-08 (`grimoire:src/tui/update_check.rs:328`, `_slot`) does fail its first named test. |
| CLN-07 | a pointer to the named test would be wrong today | The named test stays green on the breaking edit at `grimoire:src/lock/advisory_lock.rs:117` (GRM-07), `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:856` (PY-03) and `grimoire-indexer:src/validate/adapters/files.ts:69` (TS-01). Only one of two named tests fails at `ocx:crates/ocx_cli/src/options/verify.rs:87` (OCX-16, `resolve_flag_wins_over_env`) and `ocx:crates/ocx_config/src/insecure.rs:128` (OCX-20, `a_system_locked_entry_that_never_states_insecure_subtracts_nothing`). |
| CLN-07 | proven owner, ready for a one-line pointer | Each named test fails on the hand-applied edit, which cargo-mutants could not generate: `ocx:crates/ocx_sign/src/verify/trust_cache.rs:155` (OCX-10), `ocx:crates/ocx_util/src/archive/zip.rs:256` (OCX-22) and `ocx:crates/ocx_package/src/bin_scan.rs:184` (OCX-18). |
| CLN-08 | at risk in ocx and grimoire | ocx branch `fix/pwsh-wrapper-double-dash` (last commit 2026-09-24, not on main) has `crates/ocx_shell/src/shell/hook.rs`, #7 of the top 25, in its diff. In grimoire, 3 branches touch `src/install/installer.rs` (#1 by mass) and 2 touch `src/install/path_anchor.rs` (#5). The prior ocx plan proposed a sweep of about 20 files (`research_code_comment_density.md:161`). |
| Others | new commitment | ocx-sdk-python is 70.7% contract, so CLN-01 keeps most of it (`sample.md` §4). `grimoire-vscode:src/views/details.ts:214` is a guard phrased as history ("blinked out on the second paint"): phrase-based deletion loses it, and CLN-01 keeps it (routing-table §4). |

## AI-agent failure modes

Ranked by measured frequency.

1. **Collapsing a guard bundle into one paraphrase, dropping the consequence clause first.** 33 of 100 fleet guards run past 10 lines (`sample.md` §5), and 3 of 10 top-file blocks bundle 2 to 5 guards. Caught by CLN-02 (reading, the re-fire review list and CLN-06).
2. **Deleting by category or length.** "Long means essay", "history phrase means provenance", "`Step N:` means narration". 37% of history-phrase hits are live guards (`census.md` §6), and the `Step 4` line above `_render_lock` is the only record of that lock hazard. Caught by CLN-01.
3. **Crediting an owner by name.** At 3 of 22 sites the named test stays green on the breaking edit, and at 4 more it fails only as a pair (tests-as-guards-proof §2). The lint is off in 2 of 2 fleet repos. Caught by CLN-07.
4. **Under-deletion.** This is Guard-and-Go, or a pointer added beside the essay it should replace: 29% of passing patches (CanItDelete), and 2 of 10 fleet sites. Caught by CLN-04 plus CLN-03.
5. **Self-reporting success without verifying.** Consulting docs goes with less testing (adjusted OR 0.39), and no documentation-based validation was observed (arXiv 2608.20195). Caught by the CLN-03 gate and CLN-06.
6. **Incidental edits outside prose under pressure.** Directives, doctests, tests, locks, goldens. METR measured 30.4% of RE-Bench runs reward-hacking, and an instruction moved the rate only from 80% to 70%. Caught by CLN-03 and CLN-05.
7. **Reading a build error as a caught edit.** 2 of 22 planted edits (OCX-11, OCX-19) fail to compile on an orphaned import or binding before the test runs. Caught by CLN-07's verification.
8. **Wide sweeps colliding with in-flight branches** (ocx `hook.rs`, grimoire `installer.rs` today). Caught by CLN-08.
9. **Rewriting a guard as an imperative** ("NEVER key on..."): 3 to 4 of 100 today (guard-shape §6). guard-shape's phrasing rule applies; the skill inherits it.

## Decisions for the eval

- **This group defines the `rules` arm.** The arm is the skill's output on each site file: run once with CLN-01 to CLN-05 and CLN-07 passing, committed as a frozen fixture, never regenerated per run (eval-arms-and-sites rule 1).
- **Site property this group cares about: guard bundles over 5 lines.** The current list has 2 of 20 sites over 10 lines and none that probe a second clause (eval-arms-and-sites §5). Add at least 4 bundle sites with one breaking edit per clause: `pipeline.rs:1383`, `toolchain_store.rs:430`, `forge/api.rs:167` and `consent.rs:507`.
- **Owner tags come from the proof pass, not from test names.** tests-as-guards-proof §2 gives each tested site's status: 15 fail on their own, 4 fail only as a pair, 3 stay green, and OCX-04 is unrun. Tag lint and comment-only sites as before. On a pair site, the `rules` arm's frozen text names only the test that failed.
- **Must confirm before shipping as MUST:**
  - **CLN-06:** the re-check's pass or fail predicts turn-1 guard survival on the `rules` arm.
  - **CLN-02:** the `rules` arm's survival on bundle sites is non-inferior to `original` within the 5-point margin (eval-scoring §9). With the re-fire check only advisory, this is the rule's only confirmation.
  - **CLN-04:** the 80% `gone` threshold, calibrated on the 100 labelled guards and real essay splits, not one planted fixture.
- **No eval needed:** CLN-01, CLN-03 and CLN-05 are structural and ship on their own evidence. CLN-07 ships on the proof pass's 22 runs.
- **One implementation:** the re-check and the eval share turns 2a and 2b and the judge. Build it once in `run_probes.py`.

## Open questions

Human decisions (one-way doors only):

1. **Publishing.** Merging the skill to lore main publishes it to every adopter. Should it ship before the eval sets the cut line? Default: ship touched-files mode once GRD-06's recogniser is committed. It runs with the blocking checks (CLN-01's carve-out, CLN-03 to CLN-05) and CLN-07's planted-edit proof. Mass-sweep mode stays off until the eval confirms CLN-02 and CLN-06.
2. **ocx's `quality-rust.md` Patterns to Preserve.** Amend it before any ocx cleanup; this is topic-map owner question 2. Until then the skill must refuse to delete ocx phase markers and dividers, even ones CLN-01 identifies as narration.

Subareas that deserve another round:

- **guard-recognition by judge:** can the eval's opus judge, or a cheaper model, find guard clauses at 0.9 recall or better on the labelled guards, at a cost per block the skill can pay? The lexical rebuild gets recall 0.429 and precision 0.594 on them (gate-replays §5-6). The carve-out protects only what the recogniser sees. A judge would also be the only way to make CLN-02's re-fire a gate.
- **cleanup thresholds:** calibrate `gone` at 80% and the 5-line split trigger on real cleanup diffs of ocx top-25 files, not single planted fixtures. Calibrate the carve-out's whole-diff pairing ratio as well; difflib's own "close match" heuristic is 0.6 (gate-replays §9). Measure the carve-out's false-flag rate on those diffs, because LEN-06's 12 of 12 came from commits that changed code.

## Sub-artifacts

- [cleanup-procedure.md](code-docs-cleanup/cleanup-procedure.md): an ordered decision list dry-run on 10 ocx blocks, tested prototypes of the comment-only, deletion and forbidden-path checks, the re-check spec, and the batching policy.
- [tests-as-guards-proof.md](code-docs-routing/tests-as-guards-proof.md) (routing group): each site's breaking edit, run against its named test at 22 sites, plus one Stryker run and one blocked mutmut run.
- [gate-replays.md](code-docs-ratchet/gate-replays.md) (ratchet group): the seven-rule recogniser rebuilt and scored for recall and precision, and a LEN-06-shaped removal check replayed over 200 ocx commits with all 12 flags hand-read.

## Key sources

- [cleanup-procedure.md](code-docs-cleanup/cleanup-procedure.md): the dry run and the three prototypes this file widens.
- [tests-as-guards-proof.md](code-docs-routing/tests-as-guards-proof.md): 15 of 22 named tests fail alone, 4 only as a pair, 3 stay green; the build-error and hang cases.
- [gate-replays.md](code-docs-ratchet/gate-replays.md): recogniser rebuild at recall 0.429 and precision 0.594; LEN-06 flags 12, all false.
- [arXiv 2607.28887, CanItDelete](https://arxiv.org/abs/2607.28887): deletion recall 71.7%, Guard-and-Go 29%, 63.2% to 41.9% under deletion tests.
- [METR, 2025-06-05](https://metr.org/blog/2025-06-05-recent-reward-hacking/): reward hacking at 30.4%, an instruction moving 80% to 70%, and "patch the scoring function".
- [Software Engineering at Google, ch. 20](https://abseil.io/resources/swe-book/html/ch20.html): under 10% effective false positives to run in review at all, near zero to gate.
- [arXiv 2512.16790, Inside Out](https://arxiv.org/html/2512.16790v1): refinement degrades up to −90% without the comment concept.
- [arXiv 2609.09242](https://arxiv.org/abs/2609.09242): at most 24% recovery from a bad comment even when warned.
- [arXiv 2504.14119, CodeCrash](https://arxiv.org/abs/2504.14119): leading NL cues cost 23.2%, the reason CLN-06 asks unled first.
- [arXiv 2608.20195](https://arxiv.org/abs/2608.20195): consulting docs goes with less testing (OR 0.39).
- [code.claude.com best practices](https://code.claude.com/docs/en/best-practices): hooks are deterministic, CLAUDE.md is advisory.
- [code-docs-audit/sample.md](code-docs-audit/sample.md): 100 labelled guards, the taxonomy, and the missing why-constraint row.
- [code-docs-audit/census.md](code-docs-audit/census.md): the top-25 sweep list and history-phrase precision.
- [code-docs-guards/guard-shape.md](code-docs-guards/guard-shape.md): recogniser precision 0.714 and recall 0.432 in its own scratch, used as a carve-out, never a gate. An independent rebuild gets 0.594 and 0.429.
- [code-docs-routing/routing-table.md](code-docs-routing/routing-table.md): the classification order, the essay split, and "fits none, never silent deletion".
- [code-docs-eval/eval-scoring.md](code-docs-eval/eval-scoring.md): the unled 2a, led 2b gate, opus judge and ICC gate.
- [code-docs-guards/lint-owned-guards.md](code-docs-guards/lint-owned-guards.md): 12 of 40 sites comment-only; `let_underscore_drop` owns the `_` rename.
- [rules/code-docs/checks/comment_census.py](../../rules/code-docs/checks/comment_census.py): `classify()`, `blocks_of()`, `scope_of()`, `Line.test`, reused by `cleanup_check.py`.

## Revision log

Revised 2026-09-27. One line per change:

- Frontmatter: added tests-as-guards-proof and gate-replays to `consolidates`, added code-docs-guards.md and code-docs-routing.md to `cross-checked`, and set `revised`. Source: both follow-ups.
- CLN-07 rule text changed from "verifiably exists" to "proven by a failing planted-edit run" for every owner kind. The pointer must now name every test that failed and none that stayed green. Why: the old verification ("the named test must exist") overclaimed, because the name alone was wrong at 7 of 22 sites. Source: tests-as-guards-proof §2, §3.5-3.6, candidates 1-3.
- CLN-07 verification rewritten as the planted-edit run, with the build-error, hang, compiled-out and mutation-tool cases and the cost. Source: tests-as-guards-proof §1, §3.1-3.4, §3.7-3.8, candidates 4-5.
- CLN-07 severity changed from SHOULD to MUST. Why: the proof is runnable and measured, failing it only keeps the guard, and LEN-06's drop to SHOULD leaves CLN-07 as the only blocking stop. Source: tests-as-guards-proof Decisions; gate-replays Decisions 2.
- CLN-02 re-fire sub-check changed from failing the diff to a review-list flag. Why: a regex misses good rewrites (6 of 20 loss-free rewrites; 3 of the 12 LEN-06 flags). The first pass also contradicted code-docs-guards verdict 2, which already bars the recogniser as a post-edit check. Severity MUST kept, now resting on the eval. Source: gate-replays §6, §8; code-docs-guards verdict 2.
- CLN-01 carve-out restricted to blocks removed whole, and required to pair blocks across the whole diff by similarity. It stays blocking and must pass two planted fixtures before it ships. Why: hunk-local pairing produced 2 false flags. This revision counted 6 to 211 changed code lines in the same file behind all 12 LEN-06 flags, which CLN-03 forbids in a cleanup diff. It also read 6 of the 13 precision false positives and found only contract or rationale prose, which CLN-01 keeps anyway. Source: gate-replays §6, §8, §9; this revision.
- CLN-01 rationale and Verdict 1: the recogniser miss rate became 49% to 57% (recall 0.510 original, 0.430 rebuild), replacing a flat 49%. Source: gate-replays §5.
- Verdict 3 rewritten: only the structural sub-checks block, and re-fire is advisory. Source: gate-replays §8; code-docs-guards verdict 2.
- Verdict 5 rewritten from "verifiably present" to "proven", with the 15/4/3 split. Source: tests-as-guards-proof §2.
- Verdict 8 added with four documented gaps: no mechanical clause-survival check, the uncommitted recogniser and its non-portable precision, compiled-out owners, and mutmut on a `src/` layout. Source: gate-replays §4, §6; tests-as-guards-proof §2, §3.8.
- Procedure steps 4 and 5 updated for the planted-edit proof and the review list. Source: as for CLN-07 and CLN-02.
- Applied-to-fleet: the CLN-07 render-lock row now notes that OCX-09 was outside the proof pass and that GRM-08 went red. Two CLN-07 rows added: green or split sites, and proven owners. The SHAs were updated, and this revision re-checked the lint grep and the `:5777` test line. Source: tests-as-guards-proof §2; this revision.
- AI-agent failure modes: "pointing at an owner that does not exist" became "crediting an owner by name", with measured rates, and moved to rank 3. "Reading a build error as a caught edit" added. Source: tests-as-guards-proof §3.2, §3.9.
- Eval decisions: owner tags now come from the proof pass, CLN-07 joined "no eval needed", and CLN-02's confirmation is now its only one. Source: tests-as-guards-proof §2.
- Open questions: removed "tests-as-guards", which the proof pass answered: OCX-10, OCX-18 and OCX-22 all go red on the hand edit, and the wall time is one warm build, then seconds per test. "guard-recognition by judge" updated with the rebuild's numbers. The carve-out's pairing ratio and false-flag rate were added to "cleanup thresholds". Publishing default updated. Source: tests-as-guards-proof §3.3-3.4; gate-replays §5-6, §9.
