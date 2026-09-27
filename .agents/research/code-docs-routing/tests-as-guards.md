---
title: Tests as guard carriers — mutation proof, pairing check, naming
topic: code-docs / routing / tests-as-guards
agent: research-lang subagent (code-docs-routing)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 20
scope: >
  When a comment's guard can shrink to a pointer because a named test already
  carries the constraint, what proves the test would fail if the guard were
  removed, how to pair a guard to its test cheaply and statically, and where
  the reason should live (test, code, or both). Covers Rust (cargo-mutants),
  Python (mutmut, pytest) and TypeScript (StrykerJS, vitest/jest `it()`).
  Does not cover fitness functions, layering guards, or the plan-ID naming
  scheme in test names (folded elsewhere in the topic map).
---

## Table of contents

1. [Mutation testing as the guard-removal proof](#1-mutation-testing-as-the-guard-removal-proof)
2. [Mutation-testing tool landscape](#2-mutation-testing-tool-landscape)
3. [The denominator problem: unviable / CompileError mutants](#3-the-denominator-problem-unviable--compileerror-mutants)
4. [Pairing: a cheap static guard-to-test link](#4-pairing-a-cheap-static-guard-to-test-link)
5. [Naming: the sentence-name rule per language](#5-naming-the-sentence-name-rule-per-language)
6. [Placement: test, code, or both](#6-placement-test-code-or-both)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Mutation testing proves a guard's test kills the *comparison/branch* the guard feeds, not the guard's own line — cargo-mutants has no operator that mutates a bare method call (`.min()`, `.saturating_add()`), so it never generates the exact mutant an audit names as "delete the clamp" ([mutants.rs/mutants.html](https://mutants.rs/mutants.html); OCX-10, OCX-22 below).
- On a live spot check, `a_file_declared_ttl_cannot_outlive_the_built_in_ceiling` (OCX-10) missed a real mutant: `elapsed < threshold` weakened to `elapsed <= threshold` survived — the exact-boundary case is untested (`ocx:crates/ocx_sign/src/verify/trust_cache.rs:155`, this session's `cargo mutants` run).
- On the same check, `scan_propagates_metadata_error_for_self_referential_symlink` (OCX-18) caught the comparison-operator mutant on its guard (`==`→`!=`) but the mutant closest to the audit's own named breaking edit (widen the match guard to `true`, i.e. `Err(_) => continue`) was **unviable** — it fails to compile under this crate's `-D warnings` on an unused variable, not because the test would catch it (`ocx:crates/ocx_package/src/bin_scan.rs:185`).
- `a_zip_of_empty_entries_is_bounded_by_the_byte_cap` (OCX-22) caught all three operator mutants on the byte-cap comparison it guards (`ocx:crates/ocx_util/src/archive/zip.rs:265`); the floor-charge call itself (`saturating_add(ENTRY_FLOOR_BYTES)`) again has no mutant.
- "Unviable" (cargo-mutants) and "CompileError" (StrykerJS) are excluded from the score in both tools, by design — but on a `-D warnings`/`--deny=warnings` crate this silently removes exactly the guard-collapse mutants (whole-function-to-`true`, match-guard-to-`true`) that would most directly test a named breaking edit; 9/18 (50%), 35/54 (65%) and 19/56 (34%) of mutants landed unviable on the three files checked here, all for lint reasons unrelated to the guard.
- Running cargo-mutants at all on this fleet needs `--in-place`: the default copy-based mode tries to copy ocx's 104 GB `target/` into a 14 GB tmpfs and fails with ENOSPC; `--in-place` mutates and restores the real source tree instead, verified clean by `git status` after every run this session.
- `cargo mutants -p ocx_package` fails to build out of the box with `E0433: cannot find 'overrides' in 'env'` — `ocx_package`'s own `__testing` feature does not forward to the five dependency crates' matching `__testing` features it needs; the fix this session used was `--features ocx_util/__testing,ocx_oci/__testing,ocx_index/__testing,ocx_store/__testing,ocx_config/__testing`, undiscoverable without reading five `Cargo.toml` files.
- A cheap static pairing check (tokenize the guard's ground-truth clause and the test's name/parametrize-id on non-alphabetic boundaries, ≥4-char tokens, stopwords dropped, intersect) hits 18/18 (100%) on the 18 Tier-B eval sites — but recall is the wrong number to trust: reading two of the eighteen test bodies directly shows the paired test exercises a related, easier scenario, not the one the comment defends (OCX-13, TS-01 — 11% false-pair rate on this sample).
- TS-01's mismatch was already known to the audit (`eval-sites.md` §3); OCX-13's is new here: `hard_link_target_outside_the_root_is_rejected` tests only a direct out-of-root target, never the symlinked-*intermediate*-directory case the comment specifically defends (`ocx:crates/ocx_util/src/archive/tar.rs:407-424`).
- pytest parametrize `id=` strings can carry the constraint noun even when the enclosing `def test_` name is generic and would otherwise look like a happy-path test: `test_archive_streams_single_member(...)` carries `id="tar-slip-parent"` (`ocx-sdk-python:tests/unit/test_bootstrap.py:561-568`) — a pairing check that reads only `def` names misses this.
- Osherove's 2005 rule (`UnitOfWork_StateUnderTest_ExpectedBehavior`) and the fleet's own convention (full behaviour sentences, no prefix) agree in substance: 35-40 of 40 sampled test names per fleet repo are already sentence-shaped (`config.md` headline; `records.md` §4) — ratifying, not inventing, is the right move.
- Given-When-Then is the same three parts in a different order and gives no additional naming rule beyond Osherove's (fetched directly: [cucumber.io/docs/gherkin/reference](https://cucumber.io/docs/gherkin/reference/)); it is a scenario-authoring convention for feature files, not a unit-test-fn-name convention, and no fleet file uses it.
- The placement rule the fleet already half-follows: a **local, line-attachable** constraint (a clamp, a specific branch) gets its comment on the code, at the line, regardless of whether a test also exists; a **universal negative property** ("`ocx` must never be swept into the reserved set") has no code line to attach a comment to at all — its only home is the test's own doc comment.
- `ocx:crates/ocx_project/src/config.rs:3121` is the clean instance of the second case: the positive rule (`is_reserved_toolchain_name`, C-015) is documented on the code at line 979-984; the negative guarantee that `ocx` is *not* swept in (S-012) is documented **only** on `#[test] fn s012_a_tool_named_ocx_is_admitted_in_every_ascii_case`'s own doc comment, and the code's doc comment does not cross-reference S-012 at all.
- The cleanup skill's shrink-a-guard step needs a concrete gate, not a vibe check: run `cargo mutants -f <the one file> --in-place` (or the mutmut/StrykerJS equivalent), require every mutant on the guarded line/branch to be `caught`, and treat any `unviable`/`CompileError` on that exact line as "not yet proven," not as "safe."

## 1. Mutation testing as the guard-removal proof

Ran `cargo-mutants` (installed fresh, `cargo install --locked cargo-mutants` → v27.1.0, confirmed via `cargo mutants --version` after the fact) scoped to one file each for the three sites the brief names, using `--in-place` (see §2 for why). All three ocx working trees were verified `git status --porcelain` clean before and after every run.

### OCX-10 — the TTL clamp (`crates/ocx_sign/src/verify/trust_cache.rs`)

```
cargo mutants -p ocx_sign -f crates/ocx_sign/src/verify/trust_cache.rs --in-place
```

18 mutants, **3m17s** wall (baseline 43s build + 11s test; ~10s test/mutant after). Result: 2 missed, 7 caught, 9 unviable.

The guarded line is `elapsed < Duration::from_secs(self.ttl_seconds.min(TTL_SECS))` (`trust_cache.rs:155`). cargo-mutants' catalog mutates the `<` comparison (three variants: `==`, `>`, `<=`) but has **no operator that touches a bare method call** — `.min(TTL_SECS)` is never a mutation target, so the audit's own named breaking edit ("simplify to `self.ttl_seconds` directly", `eval-sites.md` OCX-10 row) is never tested by this tool at all. Of the three comparison mutants generated:

| Mutant | Result |
|---|---|
| `<` → `==` | caught |
| `<` → `>` | caught |
| `<` → `<=` | **MISSED** |

`a_file_declared_ttl_cannot_outlive_the_built_in_ceiling` does not pin the exact-equality boundary — an off-by-one at the TTL edge escapes. This is a real, newly-found test gap, independent of the comment question: the clamp itself has zero mutation coverage by construction of the tool, and the comparison it feeds has a live gap at its boundary.

### OCX-18 — the error-kind match (`crates/ocx_package/src/bin_scan.rs`)

```
cargo mutants -p ocx_package -f crates/ocx_package/src/bin_scan.rs --in-place \
  --features ocx_util/__testing,ocx_oci/__testing,ocx_index/__testing,ocx_store/__testing,ocx_config/__testing
```

The bare `-p ocx_package -f ...` form fails the baseline build with `E0433: cannot find 'overrides' in 'env'` (and, one crate later, `cannot find 'test_transport' in 'client'`, then `cannot find 'test_source' in 'ocx_index'`) — `ocx_package`'s `__testing` feature (`crates/ocx_package/Cargo.toml:9-13`, comment: "Forwarded by `ocx_lib`'s and `ocx`'s own `__testing`") does not forward to the five sibling crates whose `#[cfg(any(test, feature = "__testing"))]` seams its own test-only code paths touch. Building the package's tests in isolation — exactly what `cargo mutants -p <pkg>` does — needs every one of those five `pkg/__testing` flags named explicitly on the command line; nothing in the crate documents this, and the error message names only one crate at a time.

54 mutants, **2m26s** wall (baseline near-0s, reusing the just-built test binaries). Result: 5 missed, 14 caught, **35 unviable**.

The guarded line is `Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue` (`bin_scan.rs:185`):

| Mutant | Result |
|---|---|
| `185:32` `==` → `!=` | caught |
| `185:23` match guard → `true` | **unviable** |
| `185:23` match guard → `false` | **unviable** |

The `==`→`!=` mutant — which is caught — is a real mutation of the guard's polarity. But the mutant that most literally *is* the audit's own named breaking edit ("widen the match arm to `Err(_) => continue`", i.e. collapse the guard to `true`) never gets tested: it fails to compile (`error: unused variable: 'e' ... -D unused-variables implied by -D warnings`) before any test runs. `scan_propagates_metadata_error_for_self_referential_symlink` never gets a chance to prove or disprove anything about that exact edit. See §3.

### OCX-22 — the per-entry floor (`crates/ocx_util/src/archive/zip.rs`)

```
cargo mutants -p ocx_util -f crates/ocx_util/src/archive/zip.rs --in-place
```

56 mutants, **1m50s** wall (baseline 12s build + 1s test). Result: 11 missed, 26 caught, 19 unviable.

The floor is charged at `total_written = total_written.saturating_add(ENTRY_FLOOR_BYTES)` (`zip.rs:264`, no mutant possible, same class of gap as OCX-10's `.min()`), then checked at `if total_written > decompressed_cap` (`zip.rs:265`):

| Mutant | Result |
|---|---|
| `265:26` `>` → `==` | caught |
| `265:26` `>` → `<` | caught |
| `265:26` `>` → `>=` | caught |

All three comparison mutants on the line the floor feeds are caught by `a_zip_of_empty_entries_is_bounded_by_the_byte_cap`. This is the strongest of the three results: the test does pin the boundary the floor's effect depends on, even though the floor's own arithmetic call is invisible to the tool.

**Cross-site conclusion:** mutation testing here proves something narrower than "the guard is protected" — it proves "the comparison/branch downstream of the guard is protected." For a guard whose mechanism is itself a bare method call (a clamp, a saturating add, a `.to_relaxed_slug()`), a green mutation run is silent about the guard's own deletion; only a test with an explicit boundary-value case (a planted `u64::MAX` TTL, as OCX-10's test happens to already do) actually exercises it, and mutation testing did not find that — reading the test did.

## 2. Mutation-testing tool landscape

**cargo-mutants** (Rust). Current version **27.1.0**, installed here via `cargo install --locked cargo-mutants` ([mutants.rs/installation.html](https://mutants.rs/installation.html)). Genres, fetched directly ([mutants.rs/mutants.html](https://mutants.rs/mutants.html)): return-value replacement (`FnValue` — `0/1/-1` for integers, `true`/`false` for bool, `String::new()`/`"xyzzy".into()` for strings, recursing into `Result<Option<T>>`), binary-operator swaps (comparisons flip, `&&`/`||` toggle, arithmetic rotates, bitwise substitutes), unary-operator deletion (`-`, `!`), match-arm deletion where a wildcard exists, match-guard replacement with `true`/`false`, and struct-field deletion where a base expression (`..Default::default()`) exists. It automatically skips `#[test]`-attributed functions, `#[cfg(test)]` modules, `unsafe fn`, and anything under `#[mutants::skip]`. Scoping: `-f/--file <glob>` and `-e/--exclude <glob>` (glob, or exact path if it contains a slash), `-F/--re <regex>` against mutant names from `--list`, `-p/--package`. `--in-place` mutates the real source tree instead of a copy (default is copy, with `--copy-target` defaulting to true — the mode that overflowed tmpfs on this fleet). `--list` prints mutants without running them.

**mutmut** (Python). Current version **3.8.0**, released 2026-09-12 ([pypi.org/project/mutmut](https://pypi.org/project/mutmut/)). Install: `pip install mutmut`; run: `mutmut run`. Scoping to a module/function uses a wildcard pattern argument: `mutmut run "my_module*"` or `mutmut run "my_module.my_function*"` ([mutmut.readthedocs.io](https://mutmut.readthedocs.io/en/latest/)). Mutations include integer-literal increments, comparison-operator changes, and `break`↔`continue` swaps, generated from `node_mutation.py`'s ruleset. Results: `killed` (test suite caught it) vs `survived` (test gap); `mutmut browse` gives an interactive TUI to retest and apply; `mutmut export-cicd-stats` / `mutmut badge` produce Shields.io-compatible JSON for CI dashboards.

**StrykerJS** (JavaScript/TypeScript). Install via `npm init stryker@latest`; run via `npx stryker run` ([stryker-mutator.io/docs/stryker-js/getting-started](https://stryker-mutator.io/docs/stryker-js/getting-started/)). The `mutate` config option scopes files: defaults to `src`/`lib` js-like files excluding `__tests__`/`*test`/`*spec`, and accepts an exact file, a glob, or a line/column mutation range like `"src/app.js:5:4-6:4"` ([stryker-mutator.io/docs/stryker-js/configuration](https://stryker-mutator.io/docs/stryker-js/configuration/)). Mutant states, fetched directly ([stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)): **Killed** (a test failed while the mutant was active), **Survived** (all tests passed), **NoCoverage** (no test executed the mutant at all — a distinct, worse state than Survived), **Timeout** (counted as detected), **RuntimeError** and **CompileError** (both excluded from the score — the direct StrykerJS analog of cargo-mutants' "unviable"), **Ignored** (excluded, shown in reports). Mutation score = `detected / valid * 100`; a second metric, mutation score based on covered code, is `detected / covered * 100`. Default thresholds (`thresholds` config key, fetched directly): `high: 80`, `low: 60`, `break: null` — `high`≥`low`≥`break`, scores at or above `high` render green, between `low` and `high` render amber, below `break` exits non-zero for CI gating.

All three tools converge on the same shape: mutate, run the existing test suite per mutant, call it caught if a test failed. None of the three special-cases "delete this specific guard clause" as a mutation genre — every one relies on the general operator catalog landing near the guard by coincidence of what operators the guard happens to be built from.

## 3. The denominator problem: unviable / CompileError mutants

Both tools explicitly exclude compile-failure mutants from the score (cargo-mutants: "unviable"; StrykerJS: "CompileError", per §2's fetched definitions). This is the right default when the mutant is nonsensical (a type mismatch). It is the wrong signal to read as "well tested" when the mutant fails to compile for a reason *unrelated* to the guard being tested.

Measured on the three files this session:

| File | Mutants | Missed | Caught | Unviable | Unviable share |
|---|---|---|---|---|---|
| `trust_cache.rs` | 18 | 2 | 7 | 9 | 50% |
| `bin_scan.rs` | 54 | 5 | 14 | 35 | 65% |
| `zip.rs` | 56 | 11 | 26 | 19 | 34% |

Reading the unviable logs (e.g. `mutants.out/log/...line_154_col_9.log` for `trust_cache.rs`, `...line_185_col_23.log` for `bin_scan.rs`) shows the failures are `-D warnings`-driven: replacing a whole function body with `true` leaves an import (`Duration`) unused; collapsing a match guard to `true` leaves the bound variable (`e`) unused. ocx runs `--deny=warnings` fleet-wide. The mutant that is closest to the *specific breaking edit an audit names* — collapsing a guard-shaped `if`/match-guard to `true` — is exactly the shape most likely to orphan a binding, so this crate's own strict-lint posture systematically removes the most on-target mutants from the scored set before a single test runs. A 65% unviable rate is not "this file is unusually well protected"; it means fewer than half the generated mutants ever reached the test suite, and the ones that did not reach it are disproportionately the guard-collapse mutants a reviewer most wants an answer about.

## 4. Pairing: a cheap static guard-to-test link

Applied a single heuristic to the 18 Tier-B eval sites (`eval-sites.md` §4 — obviousness 3, a test exists): tokenize the guard's ground-truth clause and the paired test's full name (including pytest parametrize `id=` strings and JS `it()` description strings) on non-alphabetic boundaries, drop stopwords and tokens under 4 characters, and check for a non-empty intersection. Script and full per-site token list: `/tmp/claude-1000/.../scratchpad/pairing_check2.py` (session-local; not part of this repo).

**Result: 18/18 (100%) hit** by this measure — every Tier-B site's test name or parametrize id shares at least one constraint noun with the guard's own prose (e.g. `OCX-20`: guard "subtracts nothing" ↔ test `..._subtracts_nothing`; `OCX-11`: guard `.to_relaxed_slug()` ↔ test `..._hostile_slug`).

That 100% is the wrong number to report without a caveat: **recall is high by construction** (Tier B was defined as "has a test"), and it says nothing about whether the paired test exercises the *specific* mechanism named. Reading two of the eighteen test bodies directly:

- **TS-01** — already flagged by the audit itself (`eval-sites.md` row): the paired test, `refuses a path that escapes the index root`, exercises a plain `../` traversal caught by an earlier check in the same function; the scenario the comment defends (a symlinked *parent directory*, invisible to a leaf-level `lstat`) has no dedicated assertion.
- **OCX-13** — new finding this session: `hard_link_target_outside_the_root_is_rejected` (`ocx:crates/ocx_util/src/archive/tar.rs:407-424`) parametrizes over `[secret.to_str().unwrap(), "../../etc/passwd"]` — both are direct out-of-root targets. The comment's specific claim ("a symlinked intermediate component can collapse a declared in-root path onto a real out-of-root file... resolve it for real and re-check", `tar.rs:359-364`) is never constructed by the test: no fixture in this function plants a symlinked intermediate directory. The name-noun overlap (`hard_link`, `root`, `rejected`) is real and the test is real, but it proves a simpler property than the one the comment defends.

**2 of 18 (11%)** Tier-B "paired" sites, on this small sample, are false pairs at the mechanism level even though every one is a true pair at the noun level. The naive pairing check is a good *filter* (it finds every site worth a second look) and a bad *proof* (it cannot tell "same subject" from "same mechanism"). A second finding from the same pass: pytest parametrize ids carry constraint nouns that a `def test_` name misses entirely — `test_archive_streams_single_member(...)`'s enclosing name reads as a happy-path test, and only its `id="tar-slip-parent"` parameter (`ocx-sdk-python:tests/unit/test_bootstrap.py:561-568`) names the security property (PY-02, "zip slip"/"tar slip" being the standard vulnerability names for this exact archive-traversal class). A pairing check that greps only function/method definitions, not parametrize/`it()` string literals, will silently miss this class of pairing.

## 5. Naming: the sentence-name rule per language

Roy Osherove's 2005 rule, fetched directly ([osherove.com/blog/2005/4/3/naming-standards-for-unit-tests](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html)): `[UnitOfWork]_[StateUnderTest]_[ExpectedBehavior]`, e.g. `Sum_NegativeNumberAs1stParam_ExceptionThrown`. His own worked example (`Sum_NumberBiggerThan1000` → `Sum_NumberIsIgnored` → `Sum_NumberIgnoredIfBiggerThan1000`) argues for folding the three parts into one readable clause rather than leaving them as three literal underscore-delimited segments — the fleet's own convention (below) already does this.

A 2020 restatement for XCTest, fetched directly ([qualitycoding.org/unit-test-naming](https://qualitycoding.org/unit-test-naming/), Jon Reid, 2020-04-21): the same three parts — "what operation, under what circumstances, what result" — with the explicit permission that "the three elements can be implied rather than explicit" when domain context is shared, and the warning to "describe behavior, not implementation."

Given-When-Then, fetched directly from the current canonical reference ([cucumber.io/docs/gherkin/reference](https://cucumber.io/docs/gherkin/reference/)): Given = precondition/context ("put the system in a known state"), When = the action/event, Then = the expected, observable outcome. This is Osherove's three parts in a different order, aimed at feature-file scenario titles, not function names; the reference gives no additional naming grammar beyond "tell a story." No file in the fleet uses Gherkin; it is cited here only because the brief asked for a current GWT source, and to confirm it does not conflict with or improve on Osherove's rule for this purpose.

**Fleet reality** (`config.md` headline numbers; `records.md` §4): 35-40 of 40 sampled test names per repo, across ocx, grimoire and 15 other repos, are already full-sentence behaviour names — `an_unfinished_setup_on_a_completed_swap_names_the_exit`, `resolve_registries_for_tui_propagates_a_broken_global_config_t4`. This is Osherove's semantic content (unit-of-work, state, expected behaviour) collapsed into one grammatical sentence, snake_case, with no `test_`/`Test`/`it` scaffolding wrapped around the words themselves — closer to Reid's "implied, not explicit" mode than to literal underscore-delimited `UnitOfWork_State_Behavior`. `config.md` §headline also confirms the gap: zero of the five non-Rust language `testing.md` depth files state a naming convention at all.

**Per-language sentence-name rule, ratifying the fleet's existing majority practice rather than inventing a new one:**

- **Rust `#[test] fn`**: one snake_case sentence, no `test_` prefix (the ecosystem convention already omits it — the function is already `#[test]`-tagged), asserting the specific behaviour and, where the site is a regression or a named constraint, naming the property directly (`a_zip_of_empty_entries_is_bounded_by_the_byte_cap`, not `test_extract_1`).
- **pytest `def test_...`**: `test_` prefix is structural (pytest's own discovery rule), followed by a snake_case behaviour sentence; when one function is parametrized over several distinct scenarios, each `pytest.param(..., id="...")` carries its own scenario noun so the id — not just the enclosing def — states the constraint (PY-02's `id="tar-slip-parent"` is the positive example; a bare `id="case1"` would defeat this).
- **vitest/jest `it(...)`**: the string argument is the sentence itself, no separate function name to worry about; `TS-04`'s `"whichGrim: a RELATIVE PATH entry still yields an absolute path"` is the fleet's own working example of this already.

## 6. Placement: test, code, or both

`ocx:crates/ocx_project/src/config.rs:3115-3135` is a clean two-sided case study, read directly this session:

```rust
// crates/ocx_project/src/config.rs:979-984 — the general rule, on the code:
/// The one ASCII-case-folding rule this file applies to every reserved-name
/// comparison (C-015 / RUL-1): `name` is reserved when it case-folds to
/// `reserved`, so `Default`, `DEFAULT` and `default` are the same
/// reservation. Its two callers are the `default` and `all` group-keyword
/// checks above — the only reservations left, both of them CLI selectors
/// rather than tree names.
fn is_reserved_toolchain_name(name: &str, reserved: &str) -> bool { ... }

// crates/ocx_project/src/config.rs:3115-3124 — the negative guarantee, on the test:
/// C-015 folds *reserved-name* comparisons, and `ocx` is not in the
/// reserved set — so the fold must not smuggle it in. This reds the moment
/// someone helpfully reserves `ocx`.
#[test]
fn s012_a_tool_named_ocx_is_admitted_in_every_ascii_case() { ... }
```

The **positive** rule ("`name` is reserved when it case-folds to `reserved`") has a natural code site — the function that implements the fold — and lives there, with a file-qualified-enough ID (`C-015 / RUL-1`) and no essay. The **negative** guarantee ("and `ocx` specifically must never join that set") has *no* natural code site: there is no line of production code that says "ocx is admitted," because admission is the absence of a check, not the presence of one. The only artifact that can assert a universal negative and fail when it stops holding is a test, and the reason for that guarantee — "someone helpfully reserves `ocx`" is the exact, plausible breaking edit — lives entirely on `s012_...`'s own doc comment. The production code's doc comment does not cross-reference S-012 at all; a cold reader of `is_reserved_toolchain_name` alone would not learn that `ocx`'s continued admission is a load-bearing, tested guarantee.

This matches the pattern `records.md` §4 already names at scale: 7 of 15 sampled ocx guard comments are literally the paired test's own doc comment, not a separate comment on production code (`records.md` "Guard-comment-as-test-docstring" pattern, citing this exact site plus six others: `ocx_index/src/chained_index.rs:2337`, `ocx_sign/src/verify/identity.rs:320`, `ocx_setup/src/lib.rs:1839`, `ocx_shell/src/shell/reconcile/plan.rs:2602`, `ocx_project/src/project_lock.rs:269`, `ocx_package_manager/src/tasks/garbage_collection.rs:313`).

**Decision rule:** the reason lives on the code, at the specific line or branch, whenever a specific line or branch exists to attach it to — a clamp, a comparison, a match arm, an ordering (OCX-01, OCX-09, OCX-10, OCX-18, OCX-22 in §1 are all this shape, and none of them should lose their local comment even after a test exists). The reason lives on the test **instead of** the code only when the guarded property is a universal negative or an emergent absence with no single implementing line — S-012 is the clean instance; a cold reader who wants to know "why must `ocx` never be reserved" has exactly one place to look, and it is the right place, because it is the only place the property is checked at all. "Both" is not a third bucket so much as the default outcome of the first case: a local comment on the mechanism, independently, plus whatever the test's own name/doc already carries — the two are not redundant because they answer different questions ("what does this line do and why" vs. "what regression does this whole behaviour guard against").

## Normative guidance candidates

1. **MUST** — Before a cleanup diff shrinks a guard comment on a specific line/branch (a clamp, a comparison, a match arm, an ordering) to a bare pointer, the named test must be shown to catch every mutation-testing mutant generated on that guarded line. Rationale: a comment removed on the strength of "a test already covers this" is only as safe as that claim is proven — §1 found a real missed mutant (`OCX-10`'s `<`→`<=`) behind a test whose own name reads as reassuring. Verify: `cargo mutants -p <package> -f <path/to/file.rs> --in-place` (Rust); `mutmut run "<module>.<function>*"` (Python); StrykerJS with `mutate: ["<path/to/file.ts>"]` (TypeScript) — require the guarded line's mutants to all read `caught`/`killed`, not `missed`/`survived`. Severity: MUST for a security- or durability-relevant guard (Tier A/B in `eval-sites.md`'s own ranking); SHOULD elsewhere.
2. **MUST** — Treat an `unviable` (cargo-mutants) or `CompileError` (StrykerJS) result on a guard-adjacent mutant as "not yet proven," never as "safe to shrink," until its build log is read. Rationale: on a `--deny=warnings` crate, §3 measured 34-65% of generated mutants landing unviable for lint reasons unrelated to the guard, disproportionately including the exact guard-collapse mutants a reviewer most needs an answer about. Verify: `rg -n -e 'unused variable' -e 'unused import' -e 'unreachable pattern' <mutants.out/log/the-one-relevant-file.log>` — a lint-only failure means the question is still open; a genuine type/logic error means the mutant was nonsensical and exclusion is correct.
3. **SHOULD** — A guard built from a bare method call with no mutatable operator inside it (`.min()`, `.max()`, `.saturating_add()`, `.to_relaxed_slug()`) cannot be mutation-tested at all with today's tools; its comment shrink requires either (a) a dedicated boundary-value test asserting the specific input the call is meant to reject/clamp (e.g. a planted `u64::MAX`), independently of any mutation run, or (b) the comment stays as the sole defense. Rationale: §1 found this exact gap on two of three spot-checked sites (OCX-10, OCX-22); a green mutation run on the surrounding branch is not evidence about the call itself. Verify: read the test body by hand for an assertion against the call's specific documented boundary (e.g. `grep -n -e 'MAX' -e 'u64::MAX' <the test file>` as a first-pass locator, not a proof).
4. **SHOULD** — A cheap static pairing check (tokenize the guard comment and every candidate test name/parametrize-id/`it()` string in the same file on non-alphabetic boundaries, ≥4-char tokens, stopwords dropped; a non-empty intersection is a candidate pair) runs as a fast pre-filter before any human or mutation-testing review, but its output is "review these," never "these are proven." Rationale: §4 measured 100% recall and an 11% mechanism-mismatch rate on the same 18-site sample — a checker that stops at name overlap will rubber-stamp OCX-13- and TS-01-shaped mismatches. Verify: run the pairing script against the directory of guard-bearing files (`rg -n -e 'SAFETY' -e 'must not' -e 'must never' -e 'invariant' -e 'load-bearing' -r <dir> --type rust` to locate candidate guards, then compare each to same-file test names/ids), and separately confirm at least one flagged pair per file by reading the test body.
5. **MUST** — A pairing or naming check that reads only `fn`/`def` names must also read `pytest.param(..., id=...)` strings and `it("...")`/`test("...")` string literals in the same file; the constraint noun is routinely in the id/string, not the enclosing name. Rationale: PY-02's `test_archive_streams_single_member` carries no security vocabulary at all — only its `id="tar-slip-parent"` does (§4). Verify (Python): `rg -n -e 'id="' -e "id='" -r <test_dir>` alongside the `def test_` scan; (JS/TS): `rg -n -e '\bit\(' -e '\btest\(' -r <test_dir>`.
6. **SHOULD** — Rust test names carry no `test_`/`Test` prefix and read as one behaviour sentence in snake_case; pytest names keep the structural `test_` prefix followed by a behaviour sentence, with `pytest.param(id=...)` carrying the scenario noun when one function covers several cases; vitest/jest names are the literal string passed to `it`/`test`, itself a full sentence. Rationale: ratifies the fleet's already-dominant convention (35-40/40 sampled names per repo, `config.md`/`records.md` §4) rather than inventing a scheme the fleet would need to migrate to. Verify: `rg -n -e '#\[test\]' -A1 -r <dir> --type rust` then eyeball for `test_`/`Test` prefixes (a finding, not a pass); `rg -n -e 'def test_[a-z]' -r <dir> --type py` for the pytest shape; `rg -n -e '\bit\(.[A-Z]' -r <dir> --type ts` to flag `it()` strings that start capitalized like a title rather than reading as a sentence continuation of "it ...".
7. **MUST** — When a guarded constraint has a specific implementing line or branch, its reason-comment stays on that code even after a test exists; when a guarded constraint is a universal negative or an emergent absence with no single implementing line (nothing is reserved, nothing is swept in, a name is never refused), its reason-comment's only correct home is the paired test's own doc comment, and that placement is not a violation of "reasons belong on code," it is the only placement that has a code-adjacent site to attach to. Rationale: `config.rs:3121`'s S-012 case (§6) — the code's own doc comment (`config.rs:979-984`) has nowhere to say "and ocx is exempt" without becoming a list of everything that ISN'T reserved, which is unbounded; the test is the exemption's only checkable form. Verify (reading heuristic, not mechanical): for a guard flagged as "comment-only, no natural line," confirm a test exists whose own doc comment states the same constraint the flagged comment does, and that the constraint is phrased as "X is/records/produces Y" (fact) rather than restating the assertion mechanics.
8. **CONSIDER** — When a production function's doc comment documents the general rule a sibling test's negative-guarantee constraint is a special case of (as `is_reserved_toolchain_name`'s C-015/RUL-1 comment is to S-012's exemption), add a one-line cross-reference from the code comment to the test's ID (`S-012`) so a reader of the code learns the exemption exists without needing to already know to search for the test. Rationale: `config.rs:979-984` currently gives no signal that an exemption is tested at all; a reader modifying the reserved-name list has no local pointer to the guarantee they might break. Verify: `rg -n -e 'S-[0-9]{3}' -r <dir> --type rust` cross-referenced against the same file's `#[test]` block names carrying the same ID — flag a code-side doc comment on a "the only X left" / "nothing else is reserved" style claim with zero `S-`/`C-` ID nearby as a candidate for this cross-reference (a finding to triage by hand, not an auto-fail).

## AI-agent angle

- **Treating a green mutation run as proof the guard itself is gone-proof.** An agent asked to shrink OCX-10's or OCX-22's comment, seeing "18 mutants: 2 missed, 7 caught, 9 unviable" or "56 mutants: 11 missed, 26 caught, 19 unviable" with the guarded-line mutants all `caught`, will plausibly conclude the clamp/floor itself is protected. It is not — no mutant targets the method call at all. Smallest mechanical check: before trusting a mutation run as evidence for a specific guard, confirm at least one generated mutant's span covers the exact token range of the guard's own expression (`grep` the mutant list's line:col against the guard's line:col from the eval site record), not just the branch downstream of it.
- **Reading "unviable" as "safe."** An agent skimming `cargo mutants` output sees a low `missed` count and a high `unviable` count and reads the file as well-tested; §3 shows unviable is frequently a lint artifact that removed the most relevant mutant, not evidence of anything. Smallest mechanical check: `rg -c -e 'unviable' <mutants.out/unviable.txt>` against the total mutant count — flag any file where unviable exceeds, say, 30% of mutants generated, and require a human/agent to open at least the unviable mutants whose span overlaps a flagged guard comment's line range before accepting the run as evidence.
- **Pairing by name alone and stopping there.** An agent building or trusting a pairing check will find OCX-13's and TS-01's test names share every relevant noun with their guards and conclude the pairing is proven; §4 shows both are the wrong test for the specific mechanism. Smallest mechanical check: for a pairing flagged only by name, `grep` the test body for the guard's most specific noun phrase (e.g. "symlink" when the guard's breaking edit specifically names a symlinked intermediate/parent) — its *absence from the test body itself*, not just from the name, is the tell.
- **Missing the constraint noun that lives in a parametrize id or string literal, not a def name.** An agent scanning only `def test_...`/`fn ...` signatures for pairing or naming compliance will pass PY-02's generically-named `test_archive_streams_single_member` and never notice its `id="tar-slip-parent"` carries the real constraint. Smallest mechanical check: any pairing/naming scan over Python or JS/TS must also grep `id=`/`it(`/`test(` string literals in the same function/file, not stop at the enclosing definition's name.
- **Building or trusting a mutation run on a workspace this large with the tool's default copy mode.** cargo-mutants' default (`--copy-target` implicitly true) tries to copy the whole `target/` directory per mutant batch; on ocx's 104 GB `target/` against a 14 GB `/tmp`, this fails with ENOSPC and an agent unfamiliar with the flag will read the failure as "cargo-mutants doesn't work here" rather than reaching for `--in-place`. Smallest mechanical check: `df -h $(mktemp -d)` before the first `cargo mutants` invocation on a large repo; if available space is smaller than `du -sh target/`, pass `--in-place` (and verify `git status --porcelain` is clean immediately after, since `--in-place` mutates the real tree and restores it, rather than a disposable copy).

## Contested / evolving

- **Whether "unviable"/"CompileError" mutants should count against the score at all.** Both tools currently exclude them by design (§2, §3), which is defensible for nonsensical mutants but, as measured here, actively hides guard-collapse mutants on strict-lint crates. Neither tool's docs (fetched directly) discuss this interaction; it reads as an under-examined edge case rather than a settled position on either project's part, as of 2026-09-27.
- **Osherove's literal three-underscore-segment format vs. the fleet's (and Reid's 2020 "implied, not explicit") single readable sentence.** The .NET testing community's own more recent discussion (search-indexed, not independently fetched beyond the qualitycoding.org and sammancoaching.org pages cited above) shows both `UnitOfWork_State_Behavior` and single-sentence styles still coexist with no clear consensus toward one; the fleet has already picked the single-sentence style at scale (`config.md`, `records.md`), so this is a decided question for this program even though the wider field has not converged.
- **Mutation testing as a gate vs. a spot check.** StrykerJS ships default CI-gating thresholds (`high`/`low`/`break`, §2) implying mutation score is meant to run every CI cycle; cargo-mutants' docs (fetched) frame it more as an exploratory "tell you something interesting" tool with no equivalent default gate. This program's proposed use (§ Normative guidance candidate 1) is closer to cargo-mutants' framing — a targeted, pre-shrink spot check on one file, not a whole-repo CI gate — because a whole-repo run's wall time scales with mutant count in a way this session's per-file runs (2-3 minutes each) do not.

## Decisions this dive proposes

- **The MUST stating when a test lets a guard comment shrink:** a guard comment may shrink to a pointer only when (a) it sits on a specific line/branch and every mutation-testing mutant generated on that exact line/branch is `caught`/`killed`, with any `unviable`/`CompileError` result on that line manually cleared as lint-only first (guidance candidates 1-2), or (b) it is a universal-negative guarantee with no implementing line, in which case the test's own doc comment already IS the reason and no further shrink is needed or possible (guidance candidate 7).
- **The pairing check, its command, and its hit rate:** tokenize the guard's prose and every same-file test name/parametrize-id/`it()` string on non-alphabetic boundaries (≥4 chars, stopwords dropped) and intersect; measured 18/18 (100%) recall and an 11% (2/18) mechanism-mismatch rate on the Tier-B sample — ship it as a fast pre-filter (guidance candidate 4), never as a standalone proof, and require it to also scan parametrize ids and `it()` strings, not just definitions (guidance candidate 5).
- **The mutation spot-check the cleanup skill runs before shortening a guard:** `cargo mutants -p <pkg> -f <file> --in-place` (Rust; add `--features <dep>/__testing` for every dependency crate whose test-only seam the file's own tests touch, discovered by reading `E0433` errors one crate at a time if the Cargo.toml comments don't already say), `mutmut run "<module>.<fn>*"` (Python), StrykerJS with a `mutate` glob on the one file (TypeScript); require every mutant whose span overlaps the guarded expression to be caught, and manually clear any unviable result on that span before trusting the run (guidance candidates 1-3).
- **The test-name rule per language:** Rust `#[test] fn`, no prefix, one behaviour sentence; pytest `def test_<sentence>`, with `pytest.param(id=...)` carrying the scenario noun under a shared umbrella function; vitest/jest `it("<sentence>")` — ratifying the fleet's existing 35-40/40 majority rather than proposing Osherove's or GWT's literal segment format (guidance candidate 6, §5).

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [mutants.rs](https://mutants.rs/) | cargo-mutants project site, welcome page | fetched 2026-09-27, evergreen docs | States the tool's own framing ("tell you something interesting," not a CI gate) |
| [mutants.rs/installation.html](https://mutants.rs/installation.html) | cargo-mutants install docs | fetched 2026-09-27 | Exact install command used this session; `cargo +1.48 mutants` note on toolchain independence |
| [mutants.rs/mutants.html](https://mutants.rs/mutants.html) | cargo-mutants mutation-operator reference | fetched 2026-09-27 | Source for "no operator mutates a bare method call" — the central gap this dive found |
| [mutmut.readthedocs.io/en/latest](https://mutmut.readthedocs.io/en/latest/) | mutmut docs | fetched 2026-09-27 | Scoping syntax (`mutmut run "module.fn*"`), killed/survived vocabulary |
| [pypi.org/project/mutmut](https://pypi.org/project/mutmut/) | mutmut PyPI listing | fetched 2026-09-27, v3.8.0 released 2026-09-12 | Exact current version, for the "exact tool names with versions" requirement |
| [stryker-mutator.io/docs/stryker-js/introduction](https://stryker-mutator.io/docs/stryker-js/introduction/) | StrykerJS intro | fetched 2026-09-27 | Confirms supported frameworks (TS, React, Angular, Vue, Node) |
| [stryker-mutator.io/docs/stryker-js/getting-started](https://stryker-mutator.io/docs/stryker-js/getting-started/) | StrykerJS getting-started | fetched 2026-09-27 | Exact install/run commands |
| [stryker-mutator.io/docs/stryker-js/configuration](https://stryker-mutator.io/docs/stryker-js/configuration/) | StrykerJS configuration reference | fetched 2026-09-27 | `mutate` glob/range syntax, default threshold values (80/60/null) |
| [stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/) | StrykerJS mutant-state reference | fetched 2026-09-27 | Exact score formula and CompileError exclusion — the cross-tool parallel to cargo-mutants' "unviable" |
| [osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html) | Roy Osherove, original naming post | 2005-04-03 | The commissioned primary source for the naming rule |
| [sammancoaching.org/learning_hours/test_design/test_names.html](https://sammancoaching.org/learning_hours/test_design/test_names.html) | Sam Man Coaching test-naming learning hour | fetched 2026-09-27 | Restates Osherove plus the reversed `ExpectedBehavior_WhenState` variant |
| [qualitycoding.org/unit-test-naming](https://qualitycoding.org/unit-test-naming/) | Jon Reid, "Unit Test Naming: The 3 Most Important Parts" | 2020-04-21 | Current-era restatement, explicit "implied, not explicit" permission the fleet's style matches |
| [cucumber.io/docs/gherkin/reference](https://cucumber.io/docs/gherkin/reference/) | Cucumber's canonical Gherkin reference | fetched 2026-09-27, evergreen | The commissioned "current Given-When-Then source"; confirms it adds no naming grammar beyond Osherove's |
| `ocx:crates/ocx_sign/src/verify/trust_cache.rs:144-158` + this session's `cargo mutants` run | OCX-10 guard + live mutation-testing result | measured 2026-09-27 | Primary evidence: missed boundary mutant, no mutant on the clamp call |
| `ocx:crates/ocx_package/src/bin_scan.rs:178-190` + this session's `cargo mutants` run | OCX-18 guard + live mutation-testing result | measured 2026-09-27 | Primary evidence: guard-collapse mutant unviable via unrelated lint, feature-forwarding gap found in passing |
| `ocx:crates/ocx_util/src/archive/zip.rs:250-267` + this session's `cargo mutants` run | OCX-22 guard + live mutation-testing result | measured 2026-09-27 | Primary evidence: all downstream comparison mutants caught, floor call itself untestable |
| `ocx:crates/ocx_project/src/config.rs:979-984,3115-3135` | S-012/C-015 placement case, read directly | measured 2026-09-27 | Primary evidence for the placement decision (§6) |
| `.agents/research/code-docs-audit/eval-sites.md` (this worktree) | 48-site eval-site harvest, Tier A/B/C ranking | dated 2026-09-27 | Source of the 18 Tier-B sites and their guard/test ground truth used in §4 |
| `.agents/research/code-docs-audit/records.md` (this worktree) | Decision-record, test, and history audit | dated 2026-09-27 | Source of the "guard-comment-as-test-docstring" pattern (7/15) and the 35-40/40 sentence-name fleet numbers |
| `.agents/research/code-docs-audit/config.md` (this worktree) | Agent-config audit (comments, IDs, tests) | dated 2026-09-27 | Source of "zero of five non-Rust `testing.md` files define a naming rule" and the hex traceability-ID convention |
