---
title: Repository-rule and extension offline testing
slug: repository-rule-and-extension-offline-testing
agent: repository-rule-and-extension-offline-testing
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 17
answers_for:
  - .agents/research/bazel-testing.md (Open questions: "module_extension offline testing", "rules_bazel_integration_test version floor")
  - .agents/research/bazel-bzlmod-and-repo-rules.md (Open question "Repository-rule testing (BZL-TEST, wave 3)"; map row M-B-20)
affects_rule_ids: [BZL-TEST-15, BZL-TEST-16, BZL-TEST-17, BZL-TEST-18, BZL-MOD-20, BZL-MOD-22, NEW-1, NEW-2, NEW-3, NEW-4]
---

## Table of contents

1. [Summary](#summary)
2. [Answers](#answers)
   - [Q1 — Upstream ruleset survey and the recommended protocol](#q1)
   - [Q2 — Experiment: calling a repo rule / extension impl from a plain function](#q2)
   - [Q3 — rules_bazel_integration_test version floor and cost](#q3)
   - [Q4 — Cheapest offline checks for sha256 coverage and getenv hermeticity](#q4)
3. [Proposed revisions](#proposed-revisions)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Not settled](#not-settled)
7. [Sources](#sources)

## Summary

- **Ran the decisive experiment (Q2) on both 8.7.0 and 9.2.0, twice each.** Calling a `repository_rule` symbol from a plain `.bzl` function invoked at BUILD-file load time fails identically whether the call site is loading-phase top-level code *or* wrapped inside an analysis-phase `rule()` harness — the restriction is a Skyframe-phase gate, not a call-stack or ctx-shape check, and no Starlark-side trick dodges it.
- **The error text changed between majors.** Bazel 8.7.0: `Error in repository_rule: repository rules can only be used while evaluating a WORKSPACE file`. Bazel 9.2.0: `Error in repository_rule: repo rules can only be called from within module extension impl functions`. A grep for one major's wording will silently miss the other's.
- **A fake `module_ctx`/`repository_ctx` struct is never the problem.** In every failing case the fake satisfied every attribute the code touched right up to the repository-rule-instantiation line; the traceback always shows the fake ctx being consumed successfully. This settles BZL-TEST-16's open "is this argued or confirmed" question in favor of confirmed.
- **A plain helper function called from a `.bzl` file at BUILD-load time just works** — `helper(41)` returned `42` via a real `genrule` on both majors, no ctx involved. This is the always-testable third case the commission asked to isolate.
- **New, verified technique for `fail()`/error-propagation paths inside a `repository_rule` `_impl`:** wrap the direct call in a throwaway analysis-phase `rule()` "harness" and drive it with `analysistest.make(expect_failure=True)` + `asserts.expect_failure()` — the exact machinery `BZL-LARK-24` already uses for ordinary rule failures, just pointed at a harness instead of production logic. Verified passing on 8.7.0 and 9.2.0.
- **The negative control matters just as much:** the same `fail()` driven through a bare `unittest.make()` test (no `expect_failure`) does not produce a failing test — it aborts that target's *analysis* outright (`ERROR: Analysis of target '...' failed; build aborted`, no PASS/FAIL, `bazel test` exits with "no test targets were found"). `unittest.make()` cannot survive an uncaught `fail()`; only the `analysistest`-based harness can.
- **rules_python (2.3.3, `bazel-contrib/rules_python`) is the best example found in the survey**, ahead of `rules_ocx` on two axes: a shared, versioned, self-tested ctx-mock library (`tests/support/mocks/mocks.bzl`, both `mocks.rctx()` and `mocks.mctx()`) used across six-plus test files, and a module extension whose `_impl` is split into a pure decision function (`parse_modules(module_ctx) -> mods`) that is unit-tested directly, with the repository-rule-invocation loop kept to a thin, untested tail.
- **Six of eight other surveyed rulesets (`rules_rust`/crate_universe, `rules_go`, `rules_oci`, `rules_nixpkgs`, `toolchains_llvm`, `bazel-lib`) ship zero offline ctx-fake tests of any kind** for their repository rules or module extensions — every one of them relies entirely on a real, networked or filesystem-heavy integration/e2e test. `rules_ocx`'s own hand-rolled fakes already put it ahead of most of the ecosystem; the gap named by the frame (0 orchestration tests of the four `_impl`s) is real but not a below-average starting point.
- **`bazel-skylib` (1.9.0) ships no repository_ctx/module_ctx mock helper of its own** — it is the shared testing library every ruleset (including `rules_ocx`, `rules_python`, and `rules_testing`) depends on for `unittest`/`analysistest`, yet each ruleset that fakes a ctx has independently reinvented the fake, in a different shape.
- **`rules_bazel_integration_test` v0.37.1 declares no `bazel_compatibility` field at all** (checked the exact tag's `MODULE.bazel` via raw fetch) — this has never been a gate. Its own dogfood `.bazelversion` was 9.0.0 at the v0.37.1 release (2026-01-31) and has since moved through 9.0.1 → 9.0.2 → 9.1.0 → 9.1.1 → 9.2.0 (bumped 2026-07-14) on the default branch, with no new release cut since 0.37.1 despite seven Bazel bumps. `rules_python` consumes it (pinned at an older `0.27.0`, `dev_dependency`) and runs at least one real test explicitly at `bazel_versions = ["9.1.0"]`.
- **The cost is real but bounded**: the technique's own inventor (Tweag, 2022) measured an unoptimized `go_bazel_test`-style average of 5–7 minutes per integration test before the fixed-cache-directory optimization that gets it to the now-cited 25–30 seconds — and that optimization requires the `exclusive` tag because it deliberately shares one on-disk workspace path across runs, which is also why it cannot run in parallel with itself.
- **Buildifier has zero warning categories touching any of this.** A full read of the current `WARNINGS.md` (82 `##`-level category headings) turns up zero occurrences of `sha256`, `integrity`, `checksum`, `hash`, `getenv`, `environ`, `download`, `repository_rule`, or `module_extension`. The grep-and-read verification is the *only* mechanical check that exists for either BZL-MOD-20 or BZL-MOD-22 — there is no lint safety net to fall back on.
- **`repository_rule(environ=[...])`/`module_extension(environ=[...])` are explicitly marked `Deprecated` in the current *and* the 8.7.0-pinned API doc** (identical wording at both), with the doc telling authors to "Migrate to `repository_ctx.getenv`/`module_ctx.getenv` instead" — confirming BZL-MOD-20 with a sharper, dual-version-pinned citation than the existing dive had.
- **`ctx.os.environ` (a plain dict) is documented, verbatim, as establishing no dependency at all**: "Retrieving an environment variable from this dictionary does not establish a dependency from a repository rule or module extension to the environment variable. To establish a dependency when looking up an environment variable, use either `repository_ctx.getenv` or `module_ctx.getenv` instead." Both `getenv()` calls auto-register the re-fetch trigger; `environ=` is now redundant with them, not a second requirement layered on top.

## Answers

<a id="q1"></a>
### Q1 — Upstream ruleset survey and the recommended protocol

**Question as commissioned:** *The smallest offline test shape that drives a `repository_rule` `_impl`: rules_ocx already hand-rolls fake ctx structs — read it and `bazel-audit/starlark-code-shape.md` Patterns §5. Survey upstream rulesets for the same technique or a better one: rules_python, rules_rust, rules_go, bazel-skylib, rules_oci, rules_nixpkgs, toolchains_llvm, bazel-lib. What do they test offline vs with rules_bazel_integration_test vs not at all? Produce a table and the recommended protocol.*

**Findings.**

`rules_ocx`'s own three fakes (`ocx/tests/launcher_test.bzl:40-197` — `_fs_ctx`, `_replay_ctx`, `_env_ctx`) are per-file, hand-rolled, duck-typed structs, already documented in `starlark-code-shape.md` Patterns §5 and covered by `testing-starlark-and-coverage.md` Findings 4–5 and Decision 2. I re-read both plus the actual `.bzl` file rather than re-deriving them; the open gap the frame and map already name — zero orchestration tests of the four `_impl` functions themselves, only of the pure helpers they call — stands confirmed. What was not yet done is the cross-ruleset survey. I cloned all eight named rulesets at their pinned/current tags and grepped every `.bzl` file for `repository_rule(`/`module_extension(` (production) and for `repository_ctx`/`module_ctx` (test files):

| Ruleset (version/commit) | repo rules / extensions | Offline ctx-fake technique | Integration/live technique | Notable |
|---|---|---|---|---|
| **rules_ocx** (fleet, 8.7.0 pin) | 4 `repository_rule` + 1 `module_extension` | 3 hand-rolled per-file fakes, pure helpers only — **0 orchestration tests of the 4 `_impl`s** | `examples/*` (3 live-registry jobs) + 2 dogfood `sh_test` | Hermeticity discipline is good (frame Correction 3); orchestration coverage is the named gap |
| **rules_python 2.3.3** ([`bazel-contrib/rules_python@6b40e97`](https://github.com/bazel-contrib/rules_python/blob/6b40e975577e4df42acfbe7520a94f17263bc059/tests/support/mocks/mocks.bzl)) | ~19 `repository_rule` + 1 `module_extension` (`pypi.parse`) | **Shared, versioned, self-tested `tests/support/mocks/mocks.bzl`** (`mocks.rctx()`, `mocks.mctx()`), used from 6+ test files via `rules_testing`; the extension's pure decision function `parse_modules(module_ctx, ...)` is unit-tested directly — the repo-rule-invoking tail of `_pip_impl()` is not | `tests/integration/*` via `rules_bazel_integration_test` (pinned `0.27.0`, `dev_dependency`), some pinned to a specific Bazel version | Best of the eight: shared library + parse/apply split + integration harness, all three layers present |
| **rules_rust 0.74.0** (`crate_universe`, [`bazelbuild/rules_rust@0.74.0`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/crate_universe/extensions.bzl)) | 5 `repository_rule` + 3 `module_extension` | None for ctx-bearing code; `unittest.make()` only for pure, ctx-free helpers (e.g. `sanitize_label_injections`, [`private/tests/label_injections/label_injections_test.bzl`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/crate_universe/private/tests/label_injections/label_injections_test.bzl)) | `crate_universe/tests/integration/*`, driving the real `cargo-bazel` Rust binary | Heavy lifting lives in a Rust binary invoked via `ctx.execute()`; the Starlark `_crate_impl(module_ctx)` mixes tag-parsing and repo-rule invocation in one function with **zero** offline test of either half |
| **rules_go** ([`bazel-contrib/rules_go@2392cc0`](https://github.com/bazel-contrib/rules_go/blob/2392cc0e89eb4ac6e34b270eb1e3599bf1055e20), 2026-09-04) | `go_repository`, SDK download `repository_rule`s + `module_extension` | **None found** — zero test files reference `repository_ctx`/`module_ctx` | `tests/integration/popular_repos` — a curated list of real Go modules fetched live in CI | Weakest of the eight: correctness rests entirely on a networked CI job |
| **bazel-skylib 1.9.0** ([`bazelbuild/bazel-skylib@53f6d0d`](https://github.com/bazelbuild/bazel-skylib/tree/1.9.0)) | none of its own | N/A — it is the library every other row's tests import (`unittest.bzl`, `analysistest.bzl`) | N/A | Ships **no** repository_ctx/module_ctx mock helper; every ruleset that needs one has independently reinvented it |
| **rules_oci** ([`bazel-contrib/rules_oci@522cf5b`](https://github.com/bazel-contrib/rules_oci/tree/522cf5b64e5618ed2e40c05828b6d436f108ef42), 2026-08-24) | `oci_pull` `repository_rule` + `module_extension` | None found | `e2e/smoke`, `e2e/assertion` — real image pulls | |
| **rules_nixpkgs** ([`tweag/rules_nixpkgs@9e67c2e`](https://github.com/tweag/rules_nixpkgs/tree/9e67c2e1f947cf371c4445f83f1f197f99b14ac5), 2026-09-04) | ~19 per-toolchain `repository_rule`/`module_extension` pairs | None found | `testing/` — a shell-based framework running real Nix builds | |
| **toolchains_llvm** ([`bazel-contrib/toolchains_llvm@342c292`](https://github.com/bazel-contrib/toolchains_llvm/tree/342c292d3435eb4168e2c7184b1c3d8a81c9b3a1), 2026-09-05) | distribution/sysroot `repository_rule` + `module_extension` | None found | `tests/*.c`/`*.cc` compiled by the real, fetched toolchain | |
| **bazel-lib** ([`bazel-contrib/bazel-lib@904332f`](https://github.com/bazel-contrib/bazel-lib/tree/904332fd1c978e1d84161c120b26533df279c3dc), 2026-09-02) | several per-tool toolchain `repository_rule`s + `module_extension` | None found | `e2e/*` — real Bazel builds | |

**Reading the table**: only 1 of 8 surveyed rulesets does real offline testing of a module extension's *decision logic* (rules_python); 0 of 8 do — or could do, per Q2 — any offline testing of the repo-rule-*invocation* tail itself. 6 of 8 ship zero ctx-fake tests of any kind and lean entirely on integration/e2e. Against this baseline, `rules_ocx`'s three per-file fakes put it ahead of the ecosystem median; the fleet's real gap (0 of 4 `_impl`s orchestration-tested) is a completable task, not a below-average starting position.

**The recommended protocol**, synthesizing `rules_ocx`'s own pattern, rules_python's shared-library upgrade, and the two new facts this dive's own experiment established (Q2):

1. **Which ctx methods to fake**: duck-type to exactly what the code under test calls — `download`/`download_and_extract`/`execute`/`file`/`template`/`read`/`watch`/`watch_tree`/`getenv`/`which`/`extract`/`symlink`/`os`/`attr`/`path`/`name` for `repository_ctx`; `modules`/`os`/`getenv`/`environ`/`download`/`extension_metadata`/`is_dev_dependency` for `module_ctx`. This is already BZL-TEST-18's rule; rules_python's `mocks.bzl` is the concrete, dogfooded reference shape to point an agent at instead of writing one from scratch every time (see New rule 1 below).
2. **Assert call ordering**: every side-effecting fake method appends a record to a shared, ordered list on the fake struct — rules_ocx's `_env_ctx.watched` and rules_python's `_rctx_execute`'s `execute_calls` are the same idea independently arrived at. Assert equality against an expected ordered list, not membership, or a reorder bug passes silently.
3. **Assert error propagation** (the genuinely new part of this protocol, verified in Q2): a `fail()` inside the code under test cannot be caught by `unittest.make()` — it aborts that test target's analysis outright with no PASS/FAIL result. To reach a `fail()`-triggering path offline, wrap the call to the `_impl`/helper in a throwaway, analysis-phase `rule()` harness and drive that harness with `analysistest.make(expect_failure=True)` + `asserts.expect_failure()` — precisely `BZL-LARK-24`'s existing technique, aimed at a harness instead of production logic. This does not violate `BZL-TEST-14` (analysistest must target a `rule()`-produced `Target`): the harness *is* one. Verified passing on both 8.7.0 and 9.2.0 (Q2).
4. **Keep the fake honest against the real API**: Starlark has no `dir(repository_ctx)`/introspection of a builtin type, so this cannot be automated inside the test itself. The mechanical substitute is an out-of-band check tied to any Bazel-version-pin bump: `curl -s https://bazel.build/versions/<pinned>/rules/lib/builtins/repository_ctx | grep -o '​<method-name>'` (or the unversioned page for a floating pin) for each faked method name — a miss means the method was renamed/removed upstream since the fake was written, or was never real. No source in this corpus (including rules_python's own `mocks_tests.bzl`, which dogfoods the fakes but never cross-checks them against the live API) does this today; it is a gap this dive is naming, not resolving elsewhere.

**Answer**: the smallest offline shape that reaches a `repository_rule` `_impl`'s happy-path logic is exactly `rules_ocx`'s own pattern — a hand-rolled, duck-typed `repository_ctx` struct plus a `unittest.make()` test calling the `_impl` directly, unchanged by this survey. What the survey adds is confirmation the ecosystem has not converged on anything better for the invocation core, one worked example (rules_python) of a materially better organization for the *decision-logic* half of a module extension, and — new to this corpus — a verified technique for the one part of the existing guidance that had no answer at all: testing that the `_impl` actually calls `fail()`, and with the right message, when it should.

<a id="q2"></a>
### Q2 — Experiment: calling a repo rule / extension impl from a plain function

**Question as commissioned:** *In a scratch module, define a repository_rule and a module_extension; from a plain .bzl function called at load time in a BUILD file, try to (a) call the repository_rule symbol directly, (b) call the extension's implementation function with a fake module_ctx struct, (c) call a helper the _impl uses. Record the exact error text or success on 8.7.0 and 9.2.0.*

**Setup.** A scratch bzlmod module (`module(name="expmod", version="0.0.1")`, no `WORKSPACE` file) with:

```python
def helper(x):
    return x + 1

def repo_impl(repository_ctx):
    repository_ctx.file("BUILD.bazel", "")

my_repo = repository_rule(implementation = repo_impl)

def ext_impl(module_ctx):
    n = helper(0)
    my_repo(name = "from_ext_%d" % n)   # the repo-instantiation line
    return module_ctx.extension_metadata(reproducible = True)

my_ext = module_extension(implementation = ext_impl)
```

Three sibling packages each `load()` this file and call one of the three things from BUILD-file top level (Starlark forbids `def` inside a BUILD file itself, so the fake `module_ctx` constructor also lives in a `.bzl` file).

**Findings — run twice, on `USE_BAZEL_VERSION=8.7.0` and `9.2.0`, via `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk`:**

| Case | 8.7.0 | 9.2.0 |
|---|---|---|
| (a) `my_repo(name = "direct_call_attempt")` at BUILD top level | `Error in repository_rule: repository rules can only be used while evaluating a WORKSPACE file` | `Error in repository_rule: repo rules can only be called from within module extension impl functions` |
| (b) `ext_impl(fake_module_ctx())` at BUILD top level | Same error as (a), reached via a full traceback through `ext_impl` — the fake ctx itself is consumed without complaint | Same error as (a) on 9.2.0, same traceback shape |
| (c) `helper(41)` at BUILD top level, piped into a `genrule` | **Succeeds** — `bazel build //c:t` produces `out.txt` containing `42` | **Succeeds**, identical |

Exact traceback for (b) on 9.2.0:

```
ERROR: .../b/BUILD.bazel:5:9: in <toplevel>
Traceback (most recent call last):
	File ".../b/BUILD.bazel", line 5, column 9, in <toplevel>
		ext_impl(fake_module_ctx())
	File ".../defs.bzl", line 17, column 12, in ext_impl
		my_repo(name = "from_ext_%d" % n)
Error in repository_rule: repo rules can only be called from within module extension impl functions
```

**Follow-up experiment, to close a residual gap the commission's three cases leave open**: does wrapping the *same* `ext_impl(fake_module_ctx())` call inside an **analysis-phase** `rule()` harness (rather than at loading-phase BUILD top level) change the outcome? This matters because Q1's recommended protocol proposes exactly this kind of harness-wrapping for `fail()`-path testing, and the natural next question is whether it also opens a back door for the repo-rule-invocation restriction. It does not:

```
ERROR: .../f/BUILD.bazel:2:9: in harness2 rule //f:t:
Traceback (most recent call last):
	File ".../f/defs.bzl", line 8, column 13, in _harness_impl
		ext_impl(fake_module_ctx())
	File ".../defs.bzl", line 17, column 12, in ext_impl
		my_repo(name = "from_ext_%d" % n)
Error in repository_rule: repository rules can only be used while evaluating a WORKSPACE file   [8.7.0]
Error in repository_rule: repo rules can only be called from within module extension impl functions   [9.2.0]
ERROR: Analysis of target '//f:t' failed; build aborted
```

Identical error, identical outcome, on both majors, regardless of phase. This is a Skyframe-level restriction on which evaluation context may request repository creation — not a check on the calling code's shape, ctx type, or call stack depth.

**A second, complementary experiment** verified that a `repository_rule`'s *own* `fail()` path — as opposed to a nested repo-rule *invocation* — behaves completely differently, and can be reached offline. Using a harness that calls `repo_impl(fake_rctx)` directly (no nested repository-rule call inside `repo_impl`):

```python
def repo_impl(ctx):
    if ctx.attr.version == "":
        fail("expmod: version must not be empty; pass version = \"x.y.z\"")
    ctx.file("BUILD.bazel", "")

def _harness_impl(ctx):
    fake_rctx = struct(attr = struct(version = ctx.attr.version), file = lambda p, c = "": None)
    repo_impl(fake_rctx)
    return []

harness_rule = rule(implementation = _harness_impl, attrs = {"version": attr.string(default = "")})
```

driven by `analysistest.make(expect_failure=True)` + `asserts.expect_failure(env, "version must not be empty")` against a `harness_rule(name="bad_fixture", version="")` fixture, and a plain `analysistest.make()` (no `expect_failure`) against a `harness_rule(name="ok_fixture", version="1.2.3")` fixture:

```
//d:bad_test    PASSED in 0.0s
//d:ok_test     PASSED in 0.0s
```

on both 8.7.0 and 9.2.0. The negative control — the identical `fail()` driven through a bare `unittest.make()` test instead — confirms *why* this matters:

```
ERROR: .../e/BUILD.bazel:2:13: in e_bad_test rule //e:e_tests_test_0:
Traceback ... File ".../d/defs.bzl", line 10, column 13, in repo_impl
		fail("expmod: version must not be empty; pass version = \"x.y.z\"")
Error in fail: expmod: version must not be empty; pass version = "x.y.z"
ERROR: Analysis of target '//e:e_tests_test_0' failed; build aborted
...
ERROR: No test targets were found, yet testing was requested
```

`bazel test //e:e_tests` does not report a failing test — it fails to even start testing, for the whole invocation.

**Answer**: (a) direct repository-rule instantiation from a BUILD file fails on both majors, with different exact wording (8.7.0 names WORKSPACE; 9.2.0, having deleted WORKSPACE support, names module-extension impl functions instead — consistent with the frame's Correction 2, "WORKSPACE support code is deleted, not disabled" in Bazel 9). (b) calling the extension's `_impl` with a fake `module_ctx` succeeds right up to the moment it tries to invoke a repository-rule symbol, at which point it hits the identical error as (a) — confirmed by direct execution, not argued by analogy, and confirmed immune to being wrapped in an analysis-phase harness. (c) a plain helper the `_impl` uses is unconditionally callable and returns a correct result on both majors. This settles `BZL-TEST-16`'s open question: the "cannot be faked offline" half of module-extension testing is now **confirmed**, not merely argued, and the rule's severity/confidence annotation should be updated accordingly (see Proposed revisions). It also produces a technique (harness `rule()` + `analysistest.make(expect_failure=True)`) not previously named anywhere in this corpus for reaching a `repository_rule`'s own error paths — narrower in scope than the invocation-blocking restriction, but real and verified.

<a id="q3"></a>
### Q3 — rules_bazel_integration_test version floor and cost

**Question as commissioned:** *Fetch its MODULE.bazel and latest release; bazel_compatibility declared? Bazel 9.2 supported? What does it cost and how do rules_python / rules_rust use it in CI?*

**Findings.**

Latest release, per the GitHub Releases API: **v0.37.1, published 2026-01-31** ([`gh api repos/bazel-contrib/rules_bazel_integration_test/releases`](https://github.com/bazel-contrib/rules_bazel_integration_test/releases/tag/v0.37.1)) — matching the existing corpus's citation exactly, now independently confirmed rather than carried forward.

`MODULE.bazel` at that exact tag, fetched raw:

```python
module(
    name = "rules_bazel_integration_test",
    version = "0.0.0",
)
bazel_dep(name = "bazel_skylib", version = "1.8.2")
bazel_dep(name = "rules_python", version = "1.6.0")
bazel_dep(name = "platforms", version = "1.0.0")
bazel_dep(name = "cgrindel_bazel_starlib", version = "0.28.0")
bazel_dep(name = "rules_shell", version = "0.6.1")
bazel_dep(name = "buildifier_prebuilt", version = "8.2.1.1")
```

**No `bazel_compatibility` field, at all, at this tag** ([raw fetch](https://raw.githubusercontent.com/bazel-contrib/rules_bazel_integration_test/v0.37.1/MODULE.bazel)). This has never been a declared gate for this library.

**Bazel 9.2 support**: not contractually stated, but demonstrated two ways. First, its own dogfood `.bazelversion` was `9.0.0` at the v0.37.1 tag and has moved forward on the default branch through a Renovate-bot cadence — `v9.0.1` (2026-03-12), `v9.0.2` (2026-04-11), `v9.1.0` (2026-04-22), `v9.1.1` (2026-06-05), **`v9.2.0` (2026-07-14, commit [`296a021a`](https://github.com/bazel-contrib/rules_bazel_integration_test/commit/296a021a))** — with no new tagged release cut in the seven months since v0.37.1, meaning the *library's own CI* has been exercising 9.2.0 against v0.37.1's code for nearly two months as of this dive's era date, just not under a new version number. Second, a real downstream consumer: `rules_python` 2.3.3's own `tests/integration/BUILD.bazel` declares `rules_python_integration_test(name = "bzlmod_lockfile_test", bazel_versions = ["9.1.0"], ...)` — an explicit, pinned Bazel-9 run through this exact library, in a widely-used ruleset's real CI.

Its `.bcr/presubmit.yml` (BCR's own gate for this module) is narrower and possibly stale relative to the repo's own dogfooding: it declares only `bazel: [8.2.1]` in its test matrix. This is worth flagging as a caveat rather than a contradiction — BCR presubmit files are snapshotted per publish and are not necessarily kept in lockstep with the source repo's rolling `.bazelversion` bump cadence between releases.

**Cost**: the technique's own inventor, Tweag, wrote in 2022 that an unoptimized nested-workspace integration test (the `rules_haskell`/`go_bazel_test`-style baseline) averaged **5–7 minutes** per test and consumed large amounts of disk, because giving every test workspace a fresh sandbox path forces Bazel to rebuild everything from scratch each time. The fix that gets to the now-commonly-cited **25–30 seconds** figure is to unpack every test workspace into the *same* fixed directory path across runs, so a warm Bazel install/cache is reused — but "this approach... weakens hermeticity, because tests are sharing some context between each other" and "makes it impossible to run such tests in parallel, so they have to use the `exclusive` tag" ([Tweag, "Bazel rules to test Bazel rules"](https://www.tweag.io/blog/2022-10-06-bazel-rules-to-test-bazel-rules/)). Concretely, this means every integration test built on this library downloads (or reuses a pinned, cached copy of) a full Bazel binary per version under test — `rules_bazel_integration_test`'s own `MODULE.bazel` wires this up via its own `bazel_binaries` extension (`bazel_binaries.download(version_file = ...)`, `.download(version = "last_green")`, `.local(path = ...)`).

**How rules_python and rules_rust use it**: rules_python pins `rules_bazel_integration_test` `version = "0.27.0"` as a `dev_dependency` (older than the latest 0.37.1 — no forcing function pushed them to update it) and defines a `rules_python_integration_test()` macro wrapping `bazel_integration_test`, used for lockfile, pip-compile, uv, and toolchain integration scenarios; most default to a "self" (ambient) Bazel version, with `bzlmod_lockfile_test` explicitly pinned to `9.1.0`. `rules_rust` (checked against its own `crate_universe/tests/`) **does not use `rules_bazel_integration_test` at all** — its integration tests are a hand-rolled harness that drives the real `cargo-bazel` binary against real Cargo workspaces, a different (and, per this dive, unaudited for its own Bazel-9 posture) mechanism.

**Answer**: `rules_bazel_integration_test` has never gated itself on `bazel_compatibility`; it is Bazel-9.2-usable today by direct evidence (its own dogfooding at 9.2.0, and a real consumer testing at 9.1.0), not by a documented promise. The cost is real (a Bazel-per-version download/cache, an `exclusive` tag, and — even after the fixed-path optimization — 25–30 seconds per test versus milliseconds for an offline unit test) but far cheaper than the naive baseline the same source measured. rules_python is the concrete "how a real ruleset wires this into CI" example the map asked for; rules_rust is a counter-example proving it is not a universal choice even among the eight rulesets surveyed.

<a id="q4"></a>
### Q4 — Cheapest offline checks: sha256 coverage and getenv hermeticity

**Question as commissioned:** *What is the cheapest offline check that a repository rule's ctx.download/download_and_extract sites all carry sha256 or integrity (grep shape, and does buildifier have a warning for it), and that every ctx.getenv is matched by an environ/watch declaration?*

**Findings — this question's premise needs correcting on its second half before answering it.**

**sha256/integrity coverage.** This is already `BZL-MOD-22` in the shipped ruleset, verbatim: *"Every `ctx.download()`/`ctx.download_and_extract()` call carries `sha256=` or `integrity=`."* Its existing verification (`grep -n 'ctx\.download' **/*.bzl`, then confirm `sha256`/`integrity` on every match; empty = pass) is already the cheapest available shape — this dive adds one fact the existing rationale does not state: **buildifier has no warning for this at all.** A full read of the current [`buildtools/WARNINGS.md`](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md) (82 `##`-level category headings) returns zero matches for `sha256`, `integrity`, `checksum`, or `hash`, anywhere in the file. `rules_ocx`'s own `ocx/private/download.bzl:38,45` demonstrates the call shape the grep needs to handle — both calls in this repo are single-line, keyword arguments included on the same line as the call, e.g. `ctx.download_and_extract(url, output = "extracted", sha256 = row["sha256"], type = archive_type(row["filename"]))` — but the grep-then-read protocol already generalizes to a multi-line call shape (as used elsewhere in this ruleset, e.g. BZL-TEST-11's "grep to enumerate, read each hit" pattern), since a `grep -n` hit followed by reading forward to the call's closing paren does not depend on how many lines the call spans.

**getenv/environ matching — the map's implied model is backwards, and this is confirmed, not new, ground.** `BZL-MOD-20` already states the correct, current rule: read every environment variable through `getenv()`; never through `os.environ`; and *migrate away from* `environ=`, rather than requiring it alongside `getenv()`. Independently re-grounding this from primary sources (rather than re-citing the existing dive) turned up sharper, dual-version-pinned wording than what is currently cited:

- `repository_rule()`'s and `module_extension()`'s `environ` parameter is marked, verbatim, **`Deprecated`** in both the current `bazel.build/rules/lib/globals/bzl` doc and the 8.7.0-pinned snapshot (identical text at both): *"This parameter has been deprecated. Migrate to `repository_ctx.getenv`/`module_ctx.getenv` instead. Provides a list of environment variable that this repository rule depends on. If an environment variable in that list change, the repository will be refetched."*
- `repository_os.environ` (the plain-dict form, `ctx.os.environ`) carries this exact note: *"Retrieving an environment variable from this dictionary does not establish a dependency from a repository rule or module extension to the environment variable. To establish a dependency when looking up an environment variable, use either `repository_ctx.getenv` or `module_ctx.getenv` instead."* ([bazel.build/rules/lib/builtins/repository_os](https://bazel.build/rules/lib/builtins/repository_os))
- The re-fetch trigger list on `bazel.build/external/repo` lists these as alternatives joined by **"or"**, not a joint requirement: *"The value of any environment variable passed to `repository_ctx`'s `getenv()` method **or** declared with the `environ` attribute..."* — i.e. either mechanism alone is sufficient to register a re-fetch dependency; they are not two halves of one requirement.
- `--experimental_strict_repo_env` (default `false`) is unrelated to either: it restricts the *ambient environment inherited by the repo rule/extension process itself* to `PATH`/`PATHEXT`/`--repo_env`-declared names, and has no documented relationship to the `environ=` parameter at all.

The cheapest offline check, therefore, is exactly `BZL-MOD-20`'s existing two-part grep, confirmed correct and current: `grep -rn 'ctx\.os\.environ\|module_ctx\.os\.environ' **/*.bzl` (empty = pass — any hit is a hermeticity bug regardless of any `environ=`/`getenv()` bookkeeping elsewhere), and `grep -n 'environ *= *\[' *.bzl` inside a `repository_rule(`/`module_extension(` call (empty = nothing left to migrate off a deprecated parameter). There is no meaningful "is every `getenv()` matched by a declaration" check to design, because the declaration is the deprecated, optional half of the pair — `getenv()` alone is both necessary and sufficient for the dependency to register. As with the sha256 check, buildifier's `WARNINGS.md` has zero coverage of `getenv`, `environ`, `repository_rule`, or `module_extension` — the grep is, again, the only mechanical check that exists.

**Answer**: both checks the commission asks for already exist in the shipped ruleset (`BZL-MOD-22` for sha256/integrity, `BZL-MOD-20` for getenv hermeticity) and this dive's independent, primary-source re-grounding confirms both are correct as written for both 8.7.0 and 9.2.0 — with one genuinely new fact to fold into their rationale: buildifier provides no lint-level backstop for either, at all, so the grep-and-read protocol is not "the cheapest check among several" but the *only* check available.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| BZL-TEST-16 | Change the confidence annotation from *"SHOULD — the 'cannot be faked offline' half is argued and unconfirmed"* to confirmed: add that the restriction was verified to fire identically from loading-phase top-level code and from inside an analysis-phase `rule()` harness, on both 8.7.0 and 9.2.0, and that the exact error text differs by major (`...evaluating a WORKSPACE file` on 8.7.0 vs `...called from within module extension impl functions` on 9.2.0) — a grep for one major's wording will miss the other's. | [Q2 above](#q2); this dive's own experiment, `experiment/{a,b,f}` | measured |
| BZL-TEST-15 | Add explicit guidance for the error-path half: a `unittest.make()` orchestration test cannot survive an uncaught `fail()` inside the `_impl` (confirmed: it aborts that test target's analysis, no PASS/FAIL result, `bazel test` reports "no test targets were found"). To cover a `fail()`-triggering branch, wrap the `_impl`/helper call in a throwaway `rule()` harness driven by `analysistest.make(expect_failure=True)` + `asserts.expect_failure()`, mirroring BZL-LARK-24. | [Q2 above](#q2), harness experiment `experiment/d` (pass) and negative control `experiment/e` (hard abort) | measured |
| BZL-TEST-17, BZL-TEST-18 | No text change; confirmed as written by the Q1 survey (visibility-gate and duck-typing discipline both hold as the correct shape rules_python independently converged on). | [Q1 above](#q1) | confirms |
| BZL-MOD-20 | No text change; strengthen the rationale citation with the dual-version-pinned "Deprecated" wording (identical at 8.7.0 and current) and the exact `repository_os.environ` NOTE sentence, both fetched fresh rather than re-cited. | [Q4 above](#q4) | confirms |
| BZL-MOD-22 | Add to rationale: a full read of buildifier's current `WARNINGS.md` (82 categories) returns zero hits for `sha256`/`integrity`/`checksum`/`hash` — there is no lint safety net; the grep is the only mechanical check that exists, not merely the cheapest one. | [Q4 above](#q4); [buildtools/WARNINGS.md](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md) | measured |
| NEW-1 | New CONSIDER row: once a codebase has more than ~2 repository rules/extensions needing ctx fakes, factor them into one shared, versioned `.bzl` mock library with its own self-test (rules_python's `tests/support/mocks/mocks.bzl` + `mocks_tests.bzl` is the worked reference), rather than one hand-rolled fake per test file. | [Q1 above](#q1) | measured (rules_python), argued (as general guidance) |
| NEW-2 | New SHOULD row: when a `module_extension`'s `_impl` mixes tag-parsing/decision logic with repository-rule invocation, factor the decision logic into a separate, pure `module_ctx -> data` function and unit-test that function directly with a fake `module_ctx`; keep the repo-rule-invoking tail as a thin, untestable-by-design loop over its output. Modeled on rules_python's `parse_modules()`/`_pip_impl()` split; contrast with rules_rust's `_crate_impl()`, which does not split and has zero offline coverage of either half. | [Q1 above](#q1) | measured |
| NEW-3 | New MUST-where-error-paths-exist row (folds into BZL-TEST-15, listed separately for traceability): every `fail()`-reachable branch inside a `repository_rule`/`module_extension` helper gets an `analysistest.make(expect_failure=True)` test against a harness `rule()`, not a bare `unittest.make()` assertion. | [Q2 above](#q2) | measured |
| NEW-4 | New CONSIDER row: on every Bazel-version-pin bump, diff each hand-rolled ctx fake's method names against `curl -s https://bazel.build/versions/<pinned>/rules/lib/builtins/{repository_ctx,module_ctx}` for the corresponding version — a faked method absent from that version's doc is either renamed/removed upstream or was never real. No source in this corpus (including rules_python's own dogfooded fakes) does this today. | [Q1 above](#q1) | argued (no upstream precedent found) |

## AI-agent angle

- **Grepping for one Bazel major's repository-rule-instantiation error text and assuming it covers both.** The wording changed at the WORKSPACE-deletion boundary (8.7.0 vs 9.2.0, confirmed in Q2). *Check*: any CI-log grep or agent runbook step matching `"can only be used while evaluating a WORKSPACE file"` needs a sibling pattern for 9.x's `"can only be called from within module extension impl functions"`, or a looser match on `Error in repository_rule:` alone.
- **Reaching for `unittest.make()` to test a `fail()`-triggering branch inside a repository-rule/module-extension helper.** It looks like the right tool (it is the right tool for the happy path) but silently produces a hard build abort with no test result at all rather than a red test — confirmed in Q2's negative control. *Check*: any test file calling a repository-rule/extension `_impl`/helper from inside a `unittest.make()`-declared test impl, where that helper has a `fail()` on some input, needs the `analysistest.make(expect_failure=True)` + harness `rule()` shape instead (BZL-TEST-15/NEW-3).
- **Assuming `environ=` on `repository_rule()`/`module_extension()` is still required alongside `getenv()`.** It is the deprecated, optional half of the pair — an agent porting a WORKSPACE-era or pre-`getenv()`-era snippet forward may add both out of an abundance of caution, which is harmless but signals stale source material and should trigger a migration, not a "belt and suspenders" justification. *Check*: BZL-MOD-20's existing grep for `environ *= *\[`.
- **Treating rules_rust's `crate_universe` as a model for module-extension testing because it is large and widely used.** Its `_crate_impl()` has zero offline test coverage of either its tag-parsing or its repo-rule-invocation half — an agent pattern-matching "how does a mature ruleset test its extension" against crate_universe's *source* (rather than its test suite, which does not cover this) would learn nothing transferable. *Check*: prefer rules_python's `parse_modules()` split as the worked example instead.
- **Assuming a hand-rolled ctx fake stays correct forever once written.** Starlark gives no compile-time or runtime introspection to catch drift against the real `repository_ctx`/`module_ctx` API surface. *Check*: NEW-4's version-pin-bump-triggered doc diff.

## Contested / evolving

- **Whether the harness-`rule()` + `analysistest.make(expect_failure=True)` technique (Q2, NEW-3) should be folded directly into BZL-TEST-15's text or kept as a separate row.** This dive verified it works technically; whether it is worth the added indirection (a throwaway `rule()` per error path) versus simply accepting that some error paths are covered only by the live-registry integration test is a project-taste call the existing `BZL-LARK-25` "the two techniques check different things" framing does not resolve on its own.
- **Whether `rules_bazel_integration_test`'s BCR presubmit matrix (`bazel: [8.2.1]` only) genuinely lags its own dogfooded `.bazelversion` (9.2.0), or whether BCR presubmit configs are conventionally narrower than a module's real CI by design.** This dive did not survey a second BCR module's presubmit-vs-CI gap to know which is typical.
- **Whether rules_python's `parse_modules()`/apply split is the ecosystem's emerging convention or one project's individual choice.** Only rules_python does this among the eight surveyed; rules_rust's `_crate_impl()` is the only other Starlark-heavy module extension examined closely enough to compare, and it does not.

## Not settled

- **Whether any ruleset beyond rules_python cross-checks a hand-rolled ctx fake against the live Bazel API surface (NEW-4).** Not found in this survey; would need either a wider ruleset sample or an upstream Bazel-authoring-guide search this dive did not run.
- **Whether the repository-rule-instantiation restriction (Q2) is enforced identically inside a `bazel query`/`cquery` context (as opposed to `build`/`test`), or whether a query-only path surfaces a third error shape.** Not tested; both experiments here used `bazel build`.
- **The exact Bazel version/commit at which `repository_rule()`'s `environ=` parameter was first marked Deprecated** (only confirmed present at 8.7.0 and current/9.x; no bisection attempted).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/external/repo](https://bazel.build/external/repo) | Primary Bazel doc — repository re-fetch triggers | Current, fetched 2026-09-05/06 | Verbatim "getenv() **or** environ" re-fetch-trigger wording, re-fetched and re-quoted exactly (Q4) |
| [bazel.build/rules/lib/globals/bzl](https://bazel.build/rules/lib/globals/bzl) (current) and [versions/8.7.0/.../bzl](https://bazel.build/versions/8.7.0/rules/lib/globals/bzl) | Primary Bazel doc — `repository_rule()`/`module_extension()` signatures | Current + 8.7.0 snapshot, fetched 2026-09-05/06 | The exact, dual-version-pinned "Deprecated. Migrate to ...getenv" wording for `environ=` (Q4) — identical at both versions |
| [bazel.build/rules/lib/builtins/repository_os](https://bazel.build/rules/lib/builtins/repository_os) | Primary Bazel doc — `ctx.os` members | Current, fetched 2026-09-05/06 | The verbatim NOTE that `ctx.os.environ` establishes no dependency, with the exact remediation text (Q4) |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Primary Bazel CLI reference | Current, fetched 2026-09-05/06 | `--experimental_strict_repo_env`'s exact description and default, ruling out a relationship to `environ=` (Q4) |
| [github.com/bazelbuild/buildtools, `WARNINGS.md`](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md) | Primary — buildifier's own warning catalogue, full text | Current, fetched 2026-09-05/06 | Read in full (82 `##` categories); zero hits for sha256/integrity/checksum/hash/getenv/environ/download/repository_rule/module_extension (Q4) |
| [github.com/bazel-contrib/rules_python@6b40e97 (tag 2.3.3)](https://github.com/bazel-contrib/rules_python/blob/6b40e975577e4df42acfbe7520a94f17263bc059/tests/support/mocks/mocks.bzl) | Primary — ruleset source, `mocks.bzl`/`extension.bzl`/`extension_tests.bzl`/`repo_utils_test.bzl` | 2.3.3, cloned 2026-09-05/06 | The shared ctx-mock library and `parse_modules()`/`_pip_impl()` split (Q1) |
| [github.com/bazelbuild/rules_rust@0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/crate_universe/extensions.bzl) | Primary — ruleset source, `extensions.bzl`/`label_injections_test.bzl` | 0.74.0, cloned 2026-09-05/06 | The unsplit `_crate_impl()` and the zero-offline-coverage counter-example (Q1) |
| [github.com/bazel-contrib/rules_go@2392cc0](https://github.com/bazel-contrib/rules_go/tree/2392cc0e89eb4ac6e34b270eb1e3599bf1055e20) | Primary — ruleset source | Cloned 2026-09-05/06, HEAD 2026-09-04 | Zero ctx-fake test files; `popular_repos` live-network integration test only (Q1) |
| [github.com/bazelbuild/bazel-skylib@53f6d0d (tag 1.9.0)](https://github.com/bazelbuild/bazel-skylib/tree/1.9.0) | Primary — the shared testing library's own source | 1.9.0, cloned 2026-09-05/06 | Confirms zero `repository_rule`/`module_extension` and no ctx-mock helper of its own (Q1) |
| [github.com/bazel-contrib/rules_oci@522cf5b](https://github.com/bazel-contrib/rules_oci/tree/522cf5b64e5618ed2e40c05828b6d436f108ef42), [tweag/rules_nixpkgs@9e67c2e](https://github.com/tweag/rules_nixpkgs/tree/9e67c2e1f947cf371c4445f83f1f197f99b14ac5), [bazel-contrib/toolchains_llvm@342c292](https://github.com/bazel-contrib/toolchains_llvm/tree/342c292d3435eb4168e2c7184b1c3d8a81c9b3a1), [bazel-contrib/bazel-lib@904332f](https://github.com/bazel-contrib/bazel-lib/tree/904332fd1c978e1d84161c120b26533df279c3dc) | Primary — four ruleset sources | All cloned 2026-08 through 2026-09-05, near-HEAD | The four "zero offline technique, e2e/integration only" rows of the Q1 table |
| [github.com/bazel-contrib/rules_bazel_integration_test](https://github.com/bazel-contrib/rules_bazel_integration_test) — [`MODULE.bazel`@v0.37.1](https://raw.githubusercontent.com/bazel-contrib/rules_bazel_integration_test/v0.37.1/MODULE.bazel), commit history via `gh api` | Primary — the library's own source, release, and commit history | v0.37.1 (2026-01-31) tag content; commit history through 2026-08-23 | No `bazel_compatibility` field ever declared; `.bazelversion` bump history to 9.2.0 (Q3) |
| [github.com/bazel-contrib/rules_bazel_integration_test, GitHub Releases API](https://github.com/bazel-contrib/rules_bazel_integration_test/releases/tag/v0.37.1) | Primary — release metadata via `gh api` | Fetched 2026-09-05/06 | Confirms v0.37.1 (2026-01-31) is the latest tagged release, independent of prose citation (Q3) |
| [Tweag, "Bazel rules to test Bazel rules"](https://www.tweag.io/blog/2022-10-06-bazel-rules-to-test-bazel-rules/) | Secondary/practitioner — the technique's origin post | 2022-10-06, fetched 2026-09-05/06 | The 5–7-minute unoptimized baseline, the fixed-path-cache trade-off, and the `exclusive`-tag rationale behind the 25–30s figure (Q3) |
| This dive's own experiment (`experiment/{a,b,c,d,e,f}` under the session scratch directory) | Primary — live Bazel 8.7.0 and 9.2.0 runs via `bazelisk` | Executed 2026-09-05/06 | The exact error text for Q2's three cases plus the two follow-up harness experiments; the single most authoritative source in this dive |
| `ocx/private/download.bzl:27-58`, `ocx/tests/launcher_test.bzl:40-197` | Primary — fleet source, `rules_ocx` | Read 2026-09-05/06 | The existing fake-ctx pattern and the sha256-carrying `ctx.download`/`ctx.download_and_extract` call shape (Q1, Q4) |
| `bazel-audit/starlark-code-shape.md` Patterns §5, `bazel-testing/testing-starlark-and-coverage.md` Findings 4–5 / Decision 1–2 | Consolidation dive already in the corpus | Wave 1/3, 2026-09-05 | The existing description of `rules_ocx`'s own fakes and the category-error framing this dive builds on rather than re-derives |
