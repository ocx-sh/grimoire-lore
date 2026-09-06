---
title: "Coverage mechanics across rules_rust/rules_python/rules_js/rules_cc, and the Bazel 9 test exec group"
slug: coverage-across-rulesets-and-the-test-exec-group
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 23
primary_sources_count: 18
answers_for:
  - bazel-testing.md
affects_rule_ids: [BZL-TEST-02, BZL-TEST-22, BZL-TEST-25, NEW-TEST-26, NEW-TEST-27, NEW-TEST-28, NEW-TEST-29, NEW-TEST-30]
---

# Coverage mechanics across rulesets, and the Bazel 9 test exec group

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [1. Coverage mechanics: the LCOV merger, per-ruleset instrumentation, and whether the collector runs inside the test's timeout](#1-coverage-mechanics-the-lcov-merger-per-ruleset-instrumentation-and-whether-the-collector-runs-inside-the-tests-timeout)
  - [2. `--instrumentation_filter`'s real default, and confirming a coverage run instrumented anything](#2---instrumentation_filters-real-default-and-confirming-a-coverage-run-instrumented-anything)
  - [3. The Bazel 9 implicit `test` exec group](#3-the-bazel-9-implicit-test-exec-group)
  - [4. Coverage rows: severity, per-ruleset verification, shape-F binding](#4-coverage-rows-severity-per-ruleset-verification-shape-f-binding)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)

## Summary

- **Correction to the wave-3a consolidation's flag defaults.** `--experimental_split_coverage_postprocessing` and `--experimental_fetch_all_coverage_outputs` both default **`false`**, verified against `TestConfiguration.java` at both the 8.8.0 and 9.2.0 tags — not `true` as `testing-starlark-and-coverage.md:198` claimed. This makes the generalization *stronger*, not weaker: by default the coverage collector runs **inside the same spawn** as the test itself.
- **The collector runs inside the test action's timeout as a Bazel-core property, confirmed from source, for every ruleset.** `collect_coverage.sh` (`@bazel_tools//tools/test:collect_coverage`) is the literal process substituted for the test binary by `TestActionBuilder.java` whenever a rule's `InstrumentedFilesInfo` triggers `collectCodeCoverage` — this wiring is ruleset-agnostic. In the default (non-split) configuration it runs the test, then chains directly into `$LCOV_MERGER` in the same process, before the spawn exits. Even in split mode, the post-processing spawn stays part of the same `TestRunnerAction` and can independently produce `BlazeTestStatus.TIMEOUT` (`StandaloneTestStrategy.java`).
- `@bazel_tools//tools/test:lcov_merger` is an `alias` to `@remote_coverage_tools//:lcov_merger` (`tools/test/BUILD.tools:132-134`) — the `CoverageOutputGenerator` Java binary. It merges *one test's* `.dat`/`.gcov`/`.profraw` outputs into that test's `coverage.dat`. The separate, cross-test **combined report** (`_coverage/_coverage_report.dat`) is a distinct action built by `CoverageReportActionBuilder`, run once after all tests finish — outside any single test's `size`/`timeout` budget.
- **rules_rust 0.74.0 is llvm-cov based, confirmed from its own coverage binary source**, not just its prose doc: `util/collect_coverage/collect_coverage.rs` runs `llvm-profdata merge --sparse *.profraw` then `llvm-cov export -format=lcov`. It needs `RUNFILES_DIR` to locate the test binary and the two LLVM tools in the default (non-split) path, but ships an explicit runfiles-optional fallback (deriving the binary's path from `COVERAGE_DIR`'s `bazel-out/<config>/bin` prefix) for when `RUNFILES_DIR` is absent — used today for split-postprocessing, and plausibly (not confirmed) sufficient for Windows's runfiles-off default too.
- **rules_python 2.3.3 is coverage.py based via a bundled wheel, wired through `python.toolchain(configure_coverage_tool=True)`** (Bzlmod; `register_coverage_tool=True` under WORKSPACE) or manually via `py_runtime.coverage_tool`. New, unreported silent-failure mode found in its own docs: **the bundled wheel only covers CPython 3.9–3.14, not every platform** — when the resolved interpreter has no matching wheel, `bazel coverage` emits **empty lcov data**, silently, with only an analysis-time `py_runtime` warning as a trace.
- rules_python's own `_lcov_merger`/`_collect_cc_coverage` magic attributes are wired with `cfg = config.exec(exec_group = "test")` (`python/private/attributes.bzl:369,376`) — direct, in-the-wild evidence that a real ruleset already scopes coverage-support prerequisites to the same `test` exec group the Bazel 9 test-encyclopedia section names.
- **C++/clang coverage has a silent report-format gap the corpus had not found before.** `--experimental_generate_llvm_lcov` defaults **`false`** (`CppOptions.java:878-879`). Without it, `collect_cc_coverage.sh` writes a raw `.profdata` blob (`PROFDATA` mode) that `LcovMerger` cannot convert to lcov — the script's own comment says so (`# TODO(#5881): Convert profdata reports to lcov`). Only `--experimental_generate_llvm_lcov=true` switches to `LLVM_LCOV` mode, running `llvm-cov export -format=lcov` for a real lcov file. Both cited tracking issues (`#1118`, `#5881`) are **closed**, yet the TODOs referencing them as open are still in the 9.2.0 tree — stale source comments, confirmed by checking the issues' live state.
- C++ coverage has no Windows path at all (`configure/coverage.md` documents only Linux/macOS) and macOS needs `GCOV_PREFIX_STRIP` hand-tuned or, in the doc's own words, "no coverage data will be found."
- **`--instrumentation_filter`'s real danger is not the static Java-only default — it's the auto-computed one.** When the flag isn't set explicitly, `bazel coverage` runs `InstrumentationFilterSupport.computeInstrumentationFilter()`, which derives the filter from the **package of the named test targets**, not from the code under test. A test in `//tests/foo` testing a library in `//lib/foo` gets a filter anchored to `^//tests/foo[/:]` — instrumenting nothing in the library. This is the concrete mechanism behind "measuring nothing," confirmed from `InstrumentationFilterSupport.java` and independently corroborated by `bazel.build/configure/coverage.md`'s own prose.
- **The Bazel 9 test exec group's mandatory toolchain is new; the exec group name and its `exec_properties` scoping are not.** `test` was already a documented, predefined exec group at Bazel 8.8.0 (for `test.<key>`-scoped `exec_properties`). What's new at 9.0.0 is a **mandatory implicit toolchain requirement** on `@bazel_tools//tools/test:default_test_toolchain_type`, confirmed absent from 8.8.0's `tools/test/BUILD.tools` and present, with `build_setting_default = True`, at 9.0.0/9.1.0/9.2.0 alike.
- **What breaks, in the test-encyclopedia's own words:** with the new default toolchain, a test's execution platform must satisfy every constraint of its target platform — if no registered execution platform does, "the test rule fails with a toolchain resolution error." With the legacy escape hatch (`--noincompatible_use_default_test_toolchain`), the doc names the exact multi-platform failure the new default prevents: "a test binary built for Linux on a Windows machine to be executed on Windows."
- **The removal plan has no date, only a warning inside the doc**: "As a legacy setting, expect this option to be unavailable in a future Bazel release" — no tracking issue found linking a target version.
- A toolchain author has exactly two remediations, both named by the doc: register the test's target platform as an execution platform too, or register a custom toolchain for `default_test_toolchain_type` with looser `target_settings`.
- A distinct, older, now-deprecated mechanism for the same goal survives in parallel: the native flag `use_target_platform_for_tests` (`CoreOptions.java`, default `false`) carries its own `deprecationWarning` pointing straight at the exec-group toolchain instead.

## Answers

### 1. Coverage mechanics: the LCOV merger, per-ruleset instrumentation, and whether the collector runs inside the test's timeout

**Question as commissioned:** *bazel.build/configure/coverage, the test-encyclopedia's silence on coverage, the LCOV merger (`@bazel_tools//tools/test:lcov_merger`, `--experimental_generate_llvm_lcov`, `--combined_report=lcov`), and per ruleset: rules_rust (llvm-cov based; runfiles needed? Windows?), rules_python (coverage.py via `python.toolchain`'s `coverage_tool` attr — versions; Windows), rules_js (documented: coverage post-processing consumes the target's timeout/size budget; runfiles tree required on Windows), rules_cc (gcov/llvm-cov; `--instrumentation_filter`). Table, and: is the collector invoked inside the test spawn?*

**Findings**

**The core wiring is one Bazel mechanism, shared by every language.** `TestActionBuilder.java` (9.2.0) sets `$collect_coverage_script` from `@bazel_tools//tools/test:collect_coverage` on any rule whose `InstrumentedFilesInfo` turns on `collectCodeCoverage` ([`TestActionBuilder.java:244-249`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestActionBuilder.java#L244-L249)). The same code resolves the LCOV merger generically from a `:lcov_merger`/`$lcov_merger` label attribute, exporting its exec path into the env var `LCOV_MERGER` ([`TestActionBuilder.java:290-306`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestActionBuilder.java#L290-L306)). `@bazel_tools//tools/test:lcov_merger` is:

```python
# tools/test/BUILD.tools:131-134
alias(
    name = "lcov_merger",
    actual = "@remote_coverage_tools//:lcov_merger",
)
```

`@remote_coverage_tools` is the `CoverageOutputGenerator` Java binary ([`Main.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/CoverageOutputGenerator/java/com/google/devtools/coverageoutputgenerator/Main.java)), which merges every `.dat`/`.gcov`/`.profraw` file found under `--coverage_dir` into one lcov report, filtered by `--source_file_manifest` (the instrumented-file manifest built from `--instrumentation_filter`).

**Is the collector invoked inside the test spawn? Yes, unconditionally, as a Bazel-core property — traced through source, not asserted.** `collect_coverage.sh` ([9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_coverage.sh)) is the script Bazel substitutes for the test binary. Its `main` body branches on two flags baked as env vars, `SPLIT_COVERAGE_POST_PROCESSING` and `IS_COVERAGE_SPAWN`:

```bash
# collect_coverage.sh:159-172 (paraphrased structure)
if [[ "$IS_COVERAGE_SPAWN" == "0" ]]; then
  cd "$TEST_SRCDIR/$TEST_WORKSPACE"
  "$@"                      # <-- the actual test binary
  TEST_STATUS=$?
  # ...fail fast on nonzero...
fi
# past this point: the lcov-merger invocation (below)
if [[ "$SPLIT_COVERAGE_POST_PROCESSING" == "1" && "$IS_COVERAGE_SPAWN" == "0" ]]; then
  exit 0   # merger runs in a second, separate spawn instead
fi
# ...
exec $LCOV_MERGER_CMD
```

Both flags default off. **Correction to the wave-3a consolidation:** `testing-starlark-and-coverage.md:198` states both `--experimental_split_coverage_postprocessing` and `--experimental_fetch_all_coverage_outputs` "default `true` as of 2026-09-05," sourced from command-line-reference prose. Reading the actual `@Option` annotations settles it the other way, at both majors:

```
$ grep -A2 'name = "experimental_split_coverage_postprocessing"' TestConfiguration.java   # 8.8.0 and 9.2.0
defaultValue = "false"
$ grep -A2 'name = "experimental_fetch_all_coverage_outputs"' TestConfiguration.java      # 8.8.0 and 9.2.0
defaultValue = "false"
```
([`TestConfiguration.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java#L342-L373), [@ 8.8.0](https://github.com/bazelbuild/bazel/blob/8.8.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java#L299-L323)). This means the **default** path, on every Bazel 8/9 install for every language, runs the test and the LCOV merge in **one spawn**, sharing the test's own `TIMEOUT` execution requirement — the exact mechanism BZL-TEST-02 needs and previously could only source from rules_js's own docs. Even when a repo opts into split mode, the second "coverage post-processing" spawn is still built by the same `StandaloneTestStrategy` from the same `TestRunnerAction` and its own failure path sets `BlazeTestStatus.TIMEOUT` on a slow merge ([`StandaloneTestStrategy.java:763-798`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java#L763-L798)) — so the budget-sharing property holds either way. **This settles the "Coverage budget generality" open question: it is a Bazel-wide property established at the `TestActionBuilder`/`StandaloneTestStrategy` layer, not a rules_js implementation detail** — rules_js's docs simply happen to be the only ones that write it down.

The **combined report** (`_coverage/_coverage_report.dat`) is a *different* action, `CoverageReportActionBuilder`, that Bazel runs once after all tests finish, merging every test's own `coverage.dat` ([`bazel.build/configure/coverage`](https://github.com/bazelbuild/bazel/blob/master/site/en/configure/coverage.md#running-coverage): "bazel runs an action that collects all the produced coverage files, and merges them into one"). It is not gated by any single test's `size`/`timeout`.

**`--combined_report`:** default flipped `none`→`lcov` in commit [`b6fd304b`](https://github.com/bazelbuild/bazel/commit/b6fd304b), landing 9.0.0 (already established by the wave-3a consolidation; re-confirmed here, unchanged).

**Per-ruleset instrumentation mechanics:**

- **rules_rust 0.74.0** — LLVM source-based coverage, confirmed from the actual collector binary, not just prose: [`util/collect_coverage/collect_coverage.rs`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/util/collect_coverage/collect_coverage.rs) runs `llvm-profdata merge --sparse *.profraw --output coverage.profdata`, then `llvm-cov export -format=lcov -instr-profile coverage.profdata <test_binary>` (lines 179–239). The rustc-side flag is `-Cinstrument-coverage`, gated by `--instrumentation_filter` exactly like C++/Java ([`coverage.md`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/coverage.md)). **Runfiles**: needed in the default (non-split) path to locate `RUST_LLVM_COV`/`RUST_LLVM_PROFDATA` and the test binary via `find_metadata_file`/`find_test_binary` (lines 38–88). **The binary ships an explicit runfiles-optional fallback**: when `RUNFILES_DIR` is unset, it derives the test binary's location purely from `COVERAGE_DIR`'s `bazel-out/<config>/testlogs/...` prefix, stripped to `bazel-out/<config>/bin` (`config_bin_dir`, lines 95-107) — a path that exists on disk regardless of whether a runfiles *tree* was materialized. This is exercised today only for `--experimental_split_coverage_postprocessing` (the doc comment names only that case), but the same code path would also fire if `RUNFILES_DIR` is simply never set — i.e., Windows's `--enable_runfiles` default-off case. **This is plausible from source, not confirmed by any doc or test** — rules_rust's own `coverage.md` says nothing about runfiles or Windows at all.
- **rules_python 2.3.3** — coverage.py, via a bundled wheel. Enable with `python.toolchain(configure_coverage_tool = True)` (Bzlmod; `versionadded 0.18.1`) or `python_register_toolchains(register_coverage_tool = True)` (WORKSPACE); manual control is the `py_runtime.coverage_tool` attribute, a target providing the coverage entry point ([`docs/coverage.md`](https://github.com/bazelbuild/rules_python/blob/2.3.3/docs/coverage.md)). **New finding**: "The bundled `coverage` wheel set covers CPython 3.9 through 3.14 (with freethreaded variants for 3.13+), and not every platform within that range. When the interpreter that `bazel coverage` actually selects has no bundled wheel, `configure_coverage_tool = True` produces no coverage tool and `bazel coverage` emits empty lcov data" — the doc's own words. The only trace is a `py_runtime` analysis-time warning, emitted only when coverage is actually being collected. **Windows**: no mention anywhere in the 74-line `coverage.md` — unconfirmed, same verdict as the prior wave-3a dive. Separately, `python/private/attributes.bzl:363-378` shows rules_python's own `_lcov_merger`/`_collect_cc_coverage` magic attributes using `cfg = config.exec(exec_group = "test")` — concrete evidence a real ruleset already scopes coverage-support prerequisites onto the `test` exec group (see Answer 3).
- **rules_js 3.4.1** — already established by the wave-3a dive; re-confirmed, not re-measured. V8 coverage remapped through the test's runfiles tree; `--enable_runfiles` (default `"auto"`, off on Windows) absent → `ERROR: ...: coverage report generator '...' not found; code coverage requires a runfiles tree`, test still PASSes ([`rules_js troubleshooting.md`](https://github.com/aspect-build/rules_js/blob/v3.4.1/docs/troubleshooting.md#coverage-requires-a-runfiles-tree)). Coverage post-processing time scales with instrumented-file count and shares the test's `size`/`timeout` — now confirmed (Answer 1, above) to be a Bazel-core property that rules_js's docs merely describe accurately, not a JS-specific behavior.
- **rules_cc / core C++** — dual gcov/LLVM path, entirely inside Bazel core's [`tools/test/collect_cc_coverage.sh`](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_cc_coverage.sh), auto-selected by whether `*.profraw` files exist in `$COVERAGE_DIR` (`uses_llvm()`, lines 46-50). gcov path: symlinks `$COVERAGE_GCOV_PATH` to a file named `gcov` (so `llvm-cov`, invoked as `gcov`, self-dispatches) and runs it per `.gcda`/`.gcno` pair. **LLVM path has a silent report-format gap**: without `--experimental_generate_llvm_lcov` (default **`false`**, [`CppOptions.java:877-882`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java#L877-L882)), the script only runs `llvm-profdata merge -output coverage.profdata` (`PROFDATA` mode) — a raw profdata blob the LcovMerger cannot read, per the script's own comment: `# TODO(#5881): Convert profdata reports to lcov` (lines 187-189). Only with the flag set does it run `LLVM_LCOV` mode: `llvm-cov export -instr-profile ... -format=lcov` (lines 73-89). Both `#1118` and `#5881` are **closed** GitHub issues — the "ongoing effort" and "TODO" comments citing them are stale as of the 9.2.0 tree. **`--instrumentation_filter`** applies identically to C++ — no cc-specific default exists. **Windows**: no path at all — `bazel.build/configure/coverage.md`'s C++ section covers only Linux and macOS; macOS additionally needs `GCOV_PREFIX_STRIP` hand-tuned "because the correct value depends on your setup... When the value is incorrect, no coverage data will be found."

| Ruleset | Instrumentation | Merger | Runfiles requirement | Windows caveat | Collector inside test's timeout? |
|---|---|---|---|---|---|
| rules_rust 0.74.0 | `rustc -Cinstrument-coverage` → `.profraw` | `llvm-profdata` + `llvm-cov export -format=lcov` (ruleset's own binary, then Bazel's `lcov_merger` for cross-target merge) | Needed to locate test binary + LLVM tools in default mode; explicit fallback exists when absent (used for split mode) | Not documented; fallback path is plausible but unconfirmed | **Yes** — Bazel-core property, confirmed |
| rules_python 2.3.3 | `coverage.py` via bundled wheel or manual `py_runtime.coverage_tool` | Bazel's `lcov_merger` | Not documented either way | Not documented; separately, missing-wheel-for-interpreter is a silent empty-report cause (new finding) | **Yes** — Bazel-core property, confirmed |
| rules_js 3.4.1 | V8 coverage via Node/`--enable_runfiles`-dependent test wrapper | Bazel's `lcov_merger` | **Required** — confirmed, ruleset's own doc + exact log text | **Confirmed failure**: `--enable_runfiles` off by default → empty report, test still PASSes | **Yes** — confirmed by ruleset doc, now also confirmed as Bazel-core |
| rules_cc (core Bazel) | `gcov`/`llvm-cov` auto-selected by `.profraw` presence | `collect_cc_coverage.sh` (gcov/profdata/llvm-lcov mode) then Bazel's `lcov_merger` | Not documented; script has no runfiles-tree dependency of its own (works from `$COVERAGE_DIR`) | **No Windows support at all**; macOS needs manual `GCOV_PREFIX_STRIP` or "no coverage data will be found" | **Yes** — Bazel-core property, confirmed |

**Answer.** The lcov-merging collector runs inside the test action's own spawn — and therefore its own `size`/`timeout` budget — by default, for every language, as a property of `TestActionBuilder`/`StandaloneTestStrategy`/`collect_coverage.sh` at the Bazel-core layer (confirmed on Bazel 8.8.0 and 9.2.0 alike); this generalizes BZL-TEST-02's coverage clause beyond rules_js. `@bazel_tools//tools/test:lcov_merger` is a per-test alias to `CoverageOutputGenerator`; the cross-test combined report is a separate, unbudgeted action. Each ruleset supplies its own instrumentation-to-lcov translation (rustc+llvm-cov, coverage.py, V8, gcov/llvm-cov) but shares the same Bazel-core merge and budget mechanics. Runfiles dependence and Windows behavior are per-ruleset and only fully confirmed (both directions) for rules_js 3.4.1; rules_rust 0.74.0 has source-level engineering suggesting resilience without a runfiles tree, and rules_python 2.3.3 and rules_cc's docs are silent on the interaction.

### 2. `--instrumentation_filter`'s real default, and confirming a coverage run instrumented anything

**Question as commissioned:** *`--instrumentation_filter` default and the common mistake of measuring nothing (filter excludes the code under test); `--instrument_test_targets`; how a reviewer confirms a coverage run instrumented anything (report non-empty, lcov DA lines > 0).*

**Findings**

The flag's **static** default, as declared in source, is `-/javatests[/:],-/test/java[/:]` ([`CoreOptions.java:360-370`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/config/CoreOptions.java#L360-L370)) — two hardcoded Java exclusions, already established by the wave-3a dive.

**What the wave-3a dive did not have is the actual mechanism `bazel coverage` uses when the flag is left at that default.** `InstrumentationFilterSupport.computeInstrumentationFilter()` ([source, 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/InstrumentationFilterSupport.java)) is a documented heuristic: it collects the **package names of the test targets named on the command line** (expanding `test_suite`s), applies fixed substitutions (`javatests/`→`java/`, `test/java/`→`main/java/`, and stripping `/internal`, `/public`, `/tests` suffixes), and builds a positive filter like `^//foo[/:]`. `bazel.build/configure/coverage.md` independently corroborates the behavior in prose: "By default, bazel tries to match the target package(s), and prints the relevant filter as an `INFO` message."

This is the concrete "measuring nothing" trap: **the auto-computed filter matches the test's own package, not the library's**. A repo laid out as `//lib/foo:foo` (implementation) + `//tests/foo:foo_test` (test) gets, on an unset `--instrumentation_filter`, a filter anchored to `^//tests/foo[/:]` (after the `/tests` suffix-strip becomes `^//tests[/:]` — the strip only removes a trailing `/tests`, it does not walk up to a sibling `lib/` package) — the implementation package is never instrumented, and the run reports 0% coverage on the exact code the test exists to cover. This failure mode is orthogonal to, and more common than, the static Java-only default; it hits any repo whose tests and implementation live in different package trees, in any language.

`--instrument_test_targets` (default `false`) is the second half: even when the filter is correct, code that lives **in the test rule itself** (not a dependency) is excluded from instrumentation unless this flag is set — the flag has nothing to do with the *filter*, it toggles whether test-rule sources are eligible at all. rules_rust's `rust_test(crate = ...)` is the one documented exception: because the library compiles directly into the test binary as one compilation unit, rules_rust checks the underlying crate for eligibility regardless of `--instrument_test_targets` ([`coverage.md`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/coverage.md)) — with the side effect that `#[cfg(test)]` code gets instrumented too, a documented inconsistency with the general Bazel convention.

**Confirming instrumentation actually happened**: neither `bazel coverage`'s exit code nor a passing test proves anything was instrumented (BZL-TEST-25 already covers the "non-empty artifact" half). The stronger, more precise check the commission asks for is counting `DA:` records — the [lcov tracefile format](https://github.com/linux-test-project/lcov)'s per-line hit-count record (`DA:<line>,<count>[,<checksum>]`) — inside the produced report:

```
grep -c '^DA:' bazel-out/_coverage/_coverage_report.dat   # 0 = nothing instrumented at all
grep '^DA:' bazel-out/_coverage/_coverage_report.dat | awk -F, '$2>0' | wc -l   # 0 = instrumented but never executed
```

A file with zero `DA:` lines means the filter matched nothing (or the toolchain-side instrumentation itself failed, e.g. missing wheel for rules_python, or `PROFDATA` mode for C++/clang per Answer 1). A file with `DA:` lines all reading `,0` means files were instrumented but the covering code path never ran (a genuine coverage gap, not a config bug) — a distinction neither Bazel's own exit code nor an eyeballed "the file isn't empty" check makes.

**Answer.** `--instrumentation_filter`'s static default is the two Java exclusions, but `bazel coverage` almost never actually runs with that static value — it silently substitutes a filter computed from the test targets' own packages whenever the flag isn't explicit, and that computed filter is the real, more dangerous "measuring nothing" trap because it tracks the test's location, not the tested code's. `--instrument_test_targets` is an orthogonal, separate gate on test-rule-owned sources. A reviewer confirms real instrumentation by grepping the produced lcov file for `DA:` lines and checking both that any exist and that at least some carry a nonzero count — not by trusting the exit code or a merely-nonempty file.

### 3. The Bazel 9 implicit `test` exec group

**Question as commissioned:** *Read the 9.x test-encyclopedia "Execution platform" section and the source/issue for `--@bazel_tools//tools/test:incompatible_use_default_test_toolchain` (default per 9.0/9.1/9.2; removal plan). What breaks in a multi-platform build when the legacy path is removed; what a toolchain author must register; how `exec_properties` for tests get scoped (`test.<key>`).*

**Findings**

The 9.1.0 test-encyclopedia's "Execution platform" section, in full ([source](https://github.com/bazelbuild/bazel/blob/9.1.0/site/en/reference/test-encyclopedia.md#L702-L742)):

> Each test rule has an implicitly defined `test` exec group that, unless overridden, has a mandatory toolchain requirement on `@bazel_tools//tools/test:default_test_toolchain_type`... Bazel registers two such toolchains, which take effect if users don't explicitly define their own:
> - If `--@bazel_tools//tools/test:incompatible_use_default_test_toolchain` is enabled (**default**), the active test toolchain is `default_test_toolchain`. This toolchain requires an execution platform to match all of the test rule's target platform constraints. ... If no such platform is found, the test rule fails with a toolchain resolution error.
> - If disabled, the active test toolchain is `legacy_test_toolchain`. This toolchain does not impose any constraints... This is often not the intended behavior in multi-platform builds as it can result in, for example, a test binary built for Linux on a Windows machine to be executed on Windows. As a legacy setting, expect this option to be unavailable in a future Bazel release.
> Users can register additional toolchains for this type to influence this behavior... Test rule authors can define their own test toolchain type and also register a default toolchain for it.

**Default per 9.0/9.1/9.2, confirmed from source, not prose.** The flag is a Starlark `bool_flag` in `tools/test/BUILD.tools`:

```python
bool_flag(
    name = "incompatible_use_default_test_toolchain",
    build_setting_default = True,
    visibility = ["//visibility:private"],
)
```

Fetched and grepped at all three tags: present with `build_setting_default = True` at **9.0.0**, **9.1.0**, and **9.2.0** alike (identical block, byte-for-byte). Fetched at **8.8.0**: `tools/test/BUILD.tools` has no `toolchain_type`, `bool_flag`, or `default_test_toolchain*` content at all — the mechanism does not exist pre-9.0.0, matching the consolidation's byte-diff finding. So the new default-on toolchain constraint has been the default from the moment it shipped; there is no 9.0→9.1→9.2 default drift to track.

**Removal plan**: the only statement found is the encyclopedia's own sentence, "expect this option to be unavailable in a future Bazel release" — no version number, no linked tracking issue in either the doc or the `bool_flag`/`toolchain` definitions in `tools/test/BUILD.tools`. Treat this as a stated intent with no committed date, consistent with the consolidation's own framing (open question 4).

**What breaks, concretely**: two named failure modes, one per direction —
- **With the new default kept (the common case):** any build where the test's target platform has no matching *registered execution platform* fails at toolchain resolution — the `toolchain_type`'s own `no_match_error` names the fix inline: "Either register the target platform (or a platform with at least the same constraints) as an execution platform, or override the default behavior by registering a custom toolchain." This is the classic cross-compilation shape: you build for `//platforms:linux_arm64` but only register `linux_x86_64` execution platforms — Bazel 9's default now refuses to run that test at all rather than silently placing it wherever, which is new build-breaking behavior for any repo relying on running cross-target-platform tests on a mismatched executor.
- **If the escape hatch is used (`--noincompatible_use_default_test_toolchain`) and later removed:** the encyclopedia names the regression it currently protects against — "a test binary built for Linux on a Windows machine to be executed on Windows" — silently running a test on the wrong OS because the legacy toolchain "does not impose any constraints" and just grabs "the first registered execution platform."

**What a toolchain author must register** — exactly two options, both named in the doc: (1) register the test's target platform *as an execution platform too* (`register_execution_platforms()` in `MODULE.bazel`, so the constraint check trivially passes), or (2) define a custom toolchain for `@bazel_tools//tools/test:default_test_toolchain_type` — e.g. one whose `target_settings` accept a looser match (a QEMU/emulation-backed execution platform that satisfies the *effect* of the target platform's constraints without being registered as identical to it) — and register it ahead of Bazel's stock one so it wins resolution.

A **separate, older, now-deprecated** mechanism for the same underlying goal survives in parallel and interacts with the new one: the native flag `use_target_platform_for_tests` —

```java
// CoreOptions.java:1113-1123 (9.2.0)
@Option(
    name = "use_target_platform_for_tests",
    deprecationWarning =
        "Tests select an execution platform matching all constraints of the target platform by"
            + " default. Instead of using this flag, make sure that all test target platform are"
            + " registered as execution platforms.",
    defaultValue = "false",
    help = "If true, use the target platform for running tests rather than the test exec group.")
public boolean useTargetPlatformForTests;
```

`TestActionBuilder.getTestActionOwner()` checks this flag directly and, if true, bypasses the exec-group mechanism entirely in favor of the older per-target-platform action-owner path ([`TestActionBuilder.java:146-159`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestActionBuilder.java#L146-L159)); `tools/test/BUILD.tools` correspondingly wires a third toolchain, `legacy_test_toolchain_use_target_platform_for_tests`, that stays unconstrained specifically to avoid double-applying the platform check when this older flag is already doing the job. Its default is `false` and it carries its own deprecation warning pointing straight at the new mechanism — an agent should never recommend setting it.

**`exec_properties` scoped `test.<key>` — older than Bazel 9, and distinct from the toolchain change.** The `test` exec group's *name*, and its use as an `exec_properties`-key prefix, already existed at Bazel 8.8.0:

```
# 8.8.0 site/en/extending/exec-groups.md, "Execution groups for native rules"
* `test`: Test runner actions.
* `cpp_link`: C++ linking actions.
```

— absent any toolchain-requirement language. The 9.x doc adds one clause to the same bullet, cross-referencing the new test-encyclopedia section, but the exec-group name and the scoping mechanism itself are unchanged:

```python
# BUILD, any Bazel major since exec groups shipped
my_test(
    exec_properties = {
        "mem": "12g",       # applies to every action of the target
        "test.mem": "16g",  # applies only to the `test` exec group's actions
    },
)
```

A property can also be inherited from the *execution platform* rather than set on the target, using the identical `test.<key>` prefix (`exec-groups.md`, "Execution groups and platform execution properties"): `platform(exec_properties = {"test.resource": "..."})`. rules_python's own coverage-support attributes already lean on the exec-group *name* (not the exec-properties prefix) for a different purpose — pinning `_lcov_merger`/`_collect_cc_coverage` to `cfg = config.exec(exec_group = "test")` so those prerequisites resolve against the same execution platform the test action itself uses (`python/private/attributes.bzl:363-378`).

**Answer.** The `test` exec group and its `test.<key>` `exec_properties` scoping predate Bazel 9; what is genuinely new at 9.0.0, unchanged through 9.1.0 and 9.2.0, is a mandatory implicit toolchain requirement on that exec group (`default_test_toolchain_type`) that by default forces the resolved execution platform to satisfy every constraint of the test's target platform, defaulting to `true` from the moment it shipped. Failing to satisfy that constraint is now a hard toolchain-resolution error rather than the old silent any-platform fallback; the escape hatch back to the old behavior is explicitly slated for eventual removal with no committed date. A toolchain author facing this must either register the target platform as an execution platform or ship a custom `default_test_toolchain_type` toolchain; a separate, deprecated native flag (`use_target_platform_for_tests`) does a related but distinct job and should not be recommended going forward.

### 4. Coverage rows: severity, per-ruleset verification, shape-F binding

See the [Proposed revisions](#proposed-revisions) table for the five new rows and two revisions. Binding summary, following the existing BZL-TEST "Applied to the fleet shapes" convention:

- **NEW-TEST-26** (confirm real instrumentation via `DA:` counts) — refines BZL-TEST-25's verification; same scope, **shape F only** (no fleet repo configures coverage today).
- **NEW-TEST-27** (rules_python missing-wheel silent-empty) — **shape D** (the fleet's five Python libraries, on adoption) **and F**.
- **NEW-TEST-28** (`--experimental_generate_llvm_lcov` for clang) — **shape F only**; the map already records C++ as having no fleet consumer.
- **NEW-TEST-29** (rules_rust runfiles-optional fallback, informational/CONSIDER) — **shape B** (the fleet's Rust CLIs, on adoption) **and F**.
- **NEW-TEST-30** (register the target platform as an execution platform, or ship a custom `default_test_toolchain_type` toolchain) — binds **shape A today, vacuously**: `rules_ocx`'s three-OS CI matrix always builds and tests natively (exec platform == target platform on every leg), so the new mandatory toolchain never fails there; it binds for real the moment any shape attempts genuine cross-target-platform testing — **shape C** (creeptd-ng, if it ever cross-compiles) and **shape F**.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| BZL-TEST-02 | Strengthen the rationale and evidence: the coverage-budget interaction is a **Bazel-core property** (`TestActionBuilder`/`StandaloneTestStrategy`/`collect_coverage.sh`), confirmed from source at 8.8.0 and 9.2.0, not a rules_js-specific detail as the current citation implies. Also correct the supporting claim that `--experimental_split_coverage_postprocessing`/`--experimental_fetch_all_coverage_outputs` default `true` — both default **`false`** at both majors. | [`TestConfiguration.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java#L342-L373), [@ 8.8.0](https://github.com/bazelbuild/bazel/blob/8.8.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java#L299-L323), [`StandaloneTestStrategy.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java#L484-L520) | normative |
| BZL-TEST-22 | Add the auto-computed-filter mechanism as the primary rationale for "measuring nothing": when `--instrumentation_filter` is unset, `bazel coverage` derives it from the **test targets' own packages**, not the code under test — a filter mismatch far more common than the static Java-only default. Add a verification clause: read the `INFO: Using default value for --instrumentation_filter: "..."` line Bazel prints and confirm it covers the library's package, not just the test's. | [`InstrumentationFilterSupport.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/InstrumentationFilterSupport.java), [`configure/coverage.md`](https://github.com/bazelbuild/bazel/blob/master/site/en/configure/coverage.md) | normative |
| BZL-TEST-25 | Sharpen the verification from "non-empty artifact" to "non-empty **and** carries at least one nonzero-count `DA:` record" — an instrumented-but-never-executed report and an uninstrumented report both currently pass the weaker check. | This dive, Answer 2; [lcov tracefile format](https://github.com/linux-test-project/lcov) | normative |
| NEW-TEST-26 | Grep the produced `_coverage_report.dat` (or a per-target `coverage.dat`) for `^DA:` records and confirm at least one carries a nonzero hit count, not merely that the file is non-empty. *Verify*: `grep -c '^DA:' <report>` (0 = FINDING: nothing instrumented) then `grep '^DA:' <report> \| awk -F, '$2>0'` (0 = FINDING: instrumented but never executed — still worth flagging separately from a config bug). EMPTY on the first grep = FINDING; EMPTY on the second with a nonzero first = a real coverage gap, not a tooling bug. | This dive, Answer 2 | measured |
| NEW-TEST-27 | For a Python coverage leg, confirm the resolved interpreter's version/platform has a bundled `coverage` wheel (CPython 3.9–3.14, not every platform within that range) before trusting a coverage run; if it does not, `bazel coverage` reports empty data silently. *Verify*: run `bazel coverage` once and grep the analysis log for a `py_runtime` coverage-tool warning; absent both the warning and a nonzero `DA:` count in the report, the interpreter/platform combination lacks a bundled wheel — configure `py_runtime.coverage_tool` manually. EMPTY (no warning, and a nonzero-DA report) = PASS. | [`rules_python docs/coverage.md` @ 2.3.3](https://github.com/bazelbuild/rules_python/blob/2.3.3/docs/coverage.md) | normative |
| NEW-TEST-28 | Pass `--experimental_generate_llvm_lcov` explicitly on any coverage leg where the C++ toolchain is clang/LLVM (i.e. `.profraw` files, not `.gcda`, appear in `$COVERAGE_DIR`). Without it, `collect_cc_coverage.sh` emits a raw `.profdata` blob the LcovMerger cannot read, and the combined report silently omits that target's C++ coverage. *Verify*: `grep -n 'experimental_generate_llvm_lcov' .bazelrc*` for a repo whose C++ toolchain is clang; EMPTY = FINDING when clang is in use. | [`collect_cc_coverage.sh` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_cc_coverage.sh#L186-L207), [`CppOptions.java:877-882`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java#L877-L882) | normative |
| NEW-TEST-29 | Do not assume rules_rust's coverage collection has the same hard runfiles/Windows failure rules_js documents. Its own `collect_coverage.rs` binary has an explicit fallback that locates the test binary from `COVERAGE_DIR`'s `bazel-out/<config>` prefix when `RUNFILES_DIR` is absent — used today for split-postprocessing mode, and plausibly (not confirmed by any test or doc) sufficient for Windows too. *Verify*: a reading heuristic only — if evaluating Rust coverage on Windows, run it once with `VERBOSE_COVERAGE=1` and confirm the "falling back to" debug lines resolve real paths, rather than assuming failure by analogy with rules_js. **CONSIDER** (argued from source, not measured on real Windows CI). | [`collect_coverage.rs` @ 0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/util/collect_coverage/collect_coverage.rs#L109-L154) | argued |
| NEW-TEST-30 | Before adopting Bazel 9's default test-toolchain behavior in a cross-target-platform build, either register the test's target platform as an execution platform, or ship a custom toolchain for `@bazel_tools//tools/test:default_test_toolchain_type` — never disable the check with `--noincompatible_use_default_test_toolchain` as a permanent fix, since the doc states that escape hatch is slated for eventual removal. *Verify*: for any target platform a test rule builds against, confirm `bazel query` or `MODULE.bazel`'s `register_execution_platforms()` also registers a compatible execution platform; a toolchain-resolution error naming `default_test_toolchain_type` is the runtime signal if not. EMPTY (every target platform has a matching execution platform) = PASS. | [test-encyclopedia "Execution platform" @ 9.1.0](https://github.com/bazelbuild/bazel/blob/9.1.0/site/en/reference/test-encyclopedia.md#L702-L742), [`tools/test/BUILD.tools` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/BUILD.tools#L1-L89) | normative |

## AI-agent angle

- **Assuming "the coverage report is empty" always means "the filter is wrong."** Three distinct root causes now confirmed in this corpus produce the identical silent-empty symptom: an `--instrumentation_filter` mismatch (Answer 2), a missing bundled `coverage` wheel for the resolved Python interpreter (Answer 1, rules_python), and a missing `--experimental_generate_llvm_lcov` flag on a clang C++ target (Answer 1, rules_cc). *Check*: before concluding "fix the filter," confirm the report has zero `DA:` lines (filter/instrumentation problem) versus a non-lcov `.profdata` artifact sitting where lcov was expected (C++ format problem) versus an analysis-time `py_runtime` warning (Python wheel problem).
- **Trusting the flag's documented static default (`-/javatests[/:],-/test/java[/:]`) as what `bazel coverage` actually runs with.** It is almost never the operative value — `bazel coverage` silently recomputes a package-derived filter whenever the flag isn't explicit. *Check*: read the `INFO: Using default value for --instrumentation_filter` line in the invocation's own output before reasoning about what got instrumented.
- **Recommending `--noincompatible_use_default_test_toolchain` as a fix for a cross-platform test-scheduling failure.** It resolves the symptom today but reintroduces the exact bug the flag exists to prevent (silently running a test on the wrong OS), and it is a legacy setting the doc says will eventually be removed. *Check*: the real fix is registering the target platform as an execution platform, not disabling the constraint.
- **Assuming a `rust_test(crate = ...)` needs `--instrument_test_targets` for library coverage.** rules_rust's own doc names this as the one documented exception — the crate is checked directly regardless of the flag, because it compiles into the test binary as one unit. *Check*: `coverage.md`'s "`rust_test` with a `crate` attribute" section before adding the flag reflexively.
- **Citing the test exec group as brand-new in Bazel 9.** The exec group name and its `test.<key>` `exec_properties` scoping predate 9.0.0 (present at 8.8.0); only the mandatory `default_test_toolchain_type` toolchain requirement is new. *Check*: an agent explaining "what changed in Bazel 9" for tests should name the toolchain requirement specifically, not the exec group's existence.

## Contested / evolving

- **Whether rules_rust's coverage genuinely tolerates a missing runfiles tree (Windows) is unconfirmed.** The source-level fallback exists and is exercised today for split-postprocessing; no test, changelog entry, or issue this dive found states it was designed with Windows in mind, or that it has been run on Windows successfully. Trending: rules_rust's own `coverage.md` has had zero runfiles/Windows content across the versions checked — this is an unwritten area, not a settled one.
- **The C++/clang `PROFDATA`-vs-`LLVM_LCOV` split reads as an unfinished migration, not a deliberate design.** The script's own comment (`TODO(#5881): Convert profdata reports to lcov`) implies the intended end state is automatic conversion with no flag needed, yet the linked issue has been closed since 2018 without that TODO being resolved, and the "ongoing effort" issue (`#1118`) has been closed since 2016. Whether these are simply stale comments nobody removed, or issues closed as superseded by a plan that never shipped, is not established by anything this dive read.
- **No committed removal date exists for `--noincompatible_use_default_test_toolchain`.** The encyclopedia states intent ("expect this option to be unavailable in a future Bazel release") with no linked tracking issue found in the flag's own source location.

## Not settled

| Subarea | What would settle it |
|---|---|
| rules_rust coverage on real Windows CI | Run `bazel coverage` for a `rust_test` on a Windows executor with and without `--enable_runfiles`, and read whether `collect_coverage.rs`'s fallback path actually produces a non-empty, correct lcov report. |
| rules_python coverage on Windows | No source this dive read (rules_python's `coverage.md`, `attributes.bzl`, `coverage_deps.bzl`) mentions Windows at all; the same experiment rules_js's docs already describe would need to be run for a `py_test`. |
| The removal date/version for `incompatible_use_default_test_toolchain` | Find or file a tracking issue in `bazelbuild/bazel`; none is linked from the flag's own definition or the test-encyclopedia section as of this reading. |
| Whether any ruleset besides rules_python scopes coverage-support attributes to `exec_group = "test"` | This dive checked only rules_python's `attributes.bzl`; rules_rust's and rules_js's own coverage-support rule definitions were not read for this specific mechanism. |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`bazel.build/configure/coverage`](https://github.com/bazelbuild/bazel/blob/master/site/en/configure/coverage.md) | Primary Bazel doc, fetched in full (124 lines) | Current, fetched 2026-09-05 | The combined-report action's existence, the auto-computed-filter behavior in prose, and the per-language C++/Java/Python notes (Linux/macOS-only for C++) |
| [`test-encyclopedia` @ 9.1.0, "Execution platform"](https://github.com/bazelbuild/bazel/blob/9.1.0/site/en/reference/test-encyclopedia.md#L702-L742) | Primary Bazel doc, full section quoted | 9.1.0 | The authoritative statement of the `test` exec group, both stock toolchains, the exact multi-platform failure the default prevents, and the removal-intent sentence |
| [`site/en/extending/exec-groups.md` @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/site/en/extending/exec-groups.md) | Primary Bazel doc | 9.2.0 | `test.<key>` `exec_properties` scoping mechanism and syntax, plus the cross-reference to the new toolchain section |
| [`site/en/extending/exec-groups.md` @ 8.8.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.8.0/site/en/extending/exec-groups.md) | Primary Bazel doc, diffed against 9.2.0 | 8.8.0 | Proves the `test` exec group name and `exec_properties` scoping predate Bazel 9 — only the mandatory toolchain is new |
| [`tools/test/collect_coverage.sh` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_coverage.sh) | Bazel-core source, read in full (270 lines) | 9.2.0 | The actual test-spawn wrapper; the `IS_COVERAGE_SPAWN`/`SPLIT_COVERAGE_POST_PROCESSING` branch that answers "is the collector inside the test spawn" definitively |
| [`tools/test/collect_cc_coverage.sh` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_cc_coverage.sh) | Bazel-core source, read in full (216 lines) | 9.2.0 | `GENERATE_LLVM_LCOV`'s `PROFDATA`-vs-`LLVM_LCOV` branch; the stale `#1118`/`#5881` TODO comments |
| [`tools/test/BUILD.tools` @ 9.0.0/9.1.0/9.2.0/8.8.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/BUILD.tools) | Bazel-core source, diffed across four tags | 8.8.0–9.2.0 | The `lcov_merger` alias; the `default_test_toolchain_type`/`incompatible_use_default_test_toolchain`/three-toolchain definitions; confirmed absent pre-9.0.0 |
| [`TestActionBuilder.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestActionBuilder.java) | Bazel-core source | 9.2.0 | Generic `$collect_coverage_script`/`lcov_merger` wiring (ruleset-agnostic); `DEFAULT_TEST_RUNNER_EXEC_GROUP_NAME` and `useTargetPlatformForTests` branch |
| [`StandaloneTestStrategy.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java) | Bazel-core source | 9.2.0 | `createCoveragePostProcessingSpawn`; proof the split spawn stays inside the same `TestRunnerAction` and can independently time out |
| [`TestConfiguration.java` @ 8.8.0 and 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java) | Bazel-core source, diffed across two tags | 8.8.0, 9.2.0 | Ground truth for `--experimental_split_coverage_postprocessing`/`--experimental_fetch_all_coverage_outputs` defaults (`false`, both majors) — corrects the prior dive |
| [`CoreOptions.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/config/CoreOptions.java) | Bazel-core source | 9.2.0 | `--instrumentation_filter`'s literal static default; `use_target_platform_for_tests`'s default and deprecation warning |
| [`CppOptions.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java) | Bazel-core source | 9.2.0 | `--experimental_generate_llvm_lcov`'s default (`false`) |
| [`InstrumentationFilterSupport.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/InstrumentationFilterSupport.java) | Bazel-core source, read in full (139 lines) | 9.2.0 | The exact package-derived auto-filter heuristic — the mechanism behind the real "measuring nothing" trap |
| [`rules_rust/docs/src/coverage.md` @ 0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/coverage.md) | Ruleset doc, read in full | 0.74.0 (2026-08-28) | `rust_test(crate=...)` exception to `--instrument_test_targets`; confirms silence on runfiles/Windows |
| [`rules_rust/util/collect_coverage/collect_coverage.rs` @ 0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/util/collect_coverage/collect_coverage.rs) | Ruleset source, read in full (246 lines) | 0.74.0 | The actual llvm-profdata/llvm-cov invocation and the runfiles-optional fallback path |
| [`rules_python/docs/coverage.md` @ 2.3.3](https://github.com/bazelbuild/rules_python/blob/2.3.3/docs/coverage.md) | Ruleset doc, read in full (74 lines) | 2.3.3 | `configure_coverage_tool`/`register_coverage_tool`/`py_runtime.coverage_tool`; the bundled-wheel-coverage-gap warning |
| [`rules_python/python/private/attributes.bzl` @ 2.3.3](https://github.com/bazelbuild/rules_python/blob/2.3.3/python/private/attributes.bzl) | Ruleset source | 2.3.3 | `_lcov_merger`/`_collect_cc_coverage` wired to `exec_group = "test"` — a real ruleset already using the exec-group mechanism |
| [`rules_js/docs/troubleshooting.md` @ v3.4.1](https://github.com/aspect-build/rules_js/blob/v3.4.1/docs/troubleshooting.md) | Ruleset doc | v3.4.1 | Re-cited from the wave-3a dive; the only ruleset doc with a confirmed, exact-text Windows/runfiles coverage failure |
| [Commit `b6fd304b`](https://github.com/bazelbuild/bazel/commit/b6fd304b) | Bazel release commit | 2025-06-18 | `--combined_report` default flip to `lcov`, landing 9.0.0 (re-confirmed, unchanged from wave-3a) |
| [bazelbuild/bazel#1118](https://github.com/bazelbuild/bazel/issues/1118) | GitHub issue, checked live state | Filed 2016, **closed** | Confirms the `collect_cc_coverage.sh` "ongoing effort" comment cites a long-closed issue |
| [bazelbuild/bazel#5881](https://github.com/bazelbuild/bazel/issues/5881) | GitHub issue, checked live state | Filed 2018, **closed** | Confirms the `TODO(#5881)` comment for profdata→lcov conversion cites a long-closed issue, despite the conversion still being flag-gated |
| [linux-test-project/lcov](https://github.com/linux-test-project/lcov) | The lcov project itself | Referenced by `configure/coverage.md` | Canonical definition of the `.dat`/tracefile `DA:` record format used for the Answer-2 verification |
| `bazel-testing.md` / `bazel-testing/testing-starlark-and-coverage.md` | This program's own wave-3a consolidation and dive | 2026-09-05 | The starting point this follow-up corrects (flag defaults) and extends (auto-filter heuristic, per-ruleset silent-failure modes, the exec-group mechanism) |
