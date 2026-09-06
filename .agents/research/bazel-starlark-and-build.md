---
title: "BZL-LARK — Starlark, BUILD and `.bzl` authoring"
topic: bazel-starlark-and-build
family: BZL-LARK
model: opus
consolidates:
  - bazel-starlark-and-build/buildifier-taxonomy-and-style.md
  - bazel-starlark-and-build/macros-rules-and-symbolic-macros.md
  - bazel-starlark-and-build/starlark-dialect-and-determinism-traps.md
  - bazel-measurements/buildifier-gate-reach-and-generated-starlark.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
  - bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md
  - bazel-followups/repository-rule-and-extension-offline-testing.md
  - bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md
  - bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md
  - bazel-measurements/hermeticity-second-half-mounts-tool-args-and-globs.md
grounded_in:
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-topic-map.md (How to read this; Conflicts resolved 1-18; The map section A, M-A-01…M-A-22; Selected for wave 2, group 1)
  - bazel-frame.md (body + Corrections 1-6)
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-LARK

## Verdict

1. **The buildifier gate is already hard, the map was wrong, and the exit code you
   will actually see at the fleet's pin is 123.** Map conflict 18 resolved that `mode="diff"` +
   `lint_mode="warn"` gives "a hard format-check plus a soft (non-blocking) lint
   report", agreed on by two independent wave-1 sources. Both inferred it from the
   attribute *name*. `buildifier-taxonomy-and-style.md:48-50,133-204` traces
   `buildifier.go:285-386` (`exitCode = 4` is set from the lint step **before** the
   mode switch, and every early return carries it). Wave 4b then measured the whole
   matrix on the real binary: **any** finding — a pure format need with lint off, or a
   pure lint finding on an already-formatted file, in either `check` or `diff` mode —
   exits 4; exit 0 appears in exactly one cell, nothing wrong *and* lint disabled
   (`buildifier-gate-reach-and-generated-starlark.md:237-260`). Two corrections to the
   earlier trace: the shipped runner is **`find … -print | xargs buildifier ARGS`
   under `set -euo pipefail`**, not `find … -exec … +`, and `xargs` maps any invoked
   command's 1-125 exit to its own **123** — so what propagates out of
   `bazel run //:buildifier.check` on a finding is 123, never buildifier's 4
   (`:83-132`). `pipefail` is what keeps the gate hard. Wave 5 re-ran the whole cluster
   under **Bzlmod-only Bazel 9.2.0** against the same pinned `buildifier_prebuilt` 8.2.0.2:
   identical runner shape, both plants still reached, the propagated code still 123, the
   raw-binary 4-cell matrix unchanged — nothing in the gate is Bazel-9-fragile
   (`bazel9-gate-tags-visibility-and-flag-probes.md:92-175`). But 123 is a property of the
   **pin**, not of buildifier: `buildifier_prebuilt` **8.5.1.4** replaces the
   `find … -print | xargs` pipeline with `find … -exec … {} +`, which retires the remap and
   lets buildifier's own 4 propagate again (`:145-154`). Consequence: M-A-02's P0
   inverts — the job is not "make the gate fail on lint", it is "never let a wrapper
   swallow the exit code, and never gate on a number at all — 4 and 123 are both
   pin-dependent".
2. **`buildifier_test`, the rule that looks like the right way to gate, silently
   false-passes — do not recommend it.** `buildifier_prebuilt` 8.2.0.2's
   `runner.bash.template` always emits `WORKSPACE="<value>"`, so the shell test
   `[[ ! -z "${WORKSPACE+x}" ]]` (which asks whether the variable is *set*, not
   whether it is non-empty) is always true; `FIND_FILE_TYPE` flips from `l` to `f`,
   `find . -type f` runs over a runfiles tree containing only symlinks, matches
   nothing, `xargs` invokes buildifier with zero file arguments, and buildifier reads
   empty stdin as valid Starlark. The test PASSES with `srcs` pointing at a
   deliberately broken file (`buildifier-gate-reach-and-generated-starlark.md:269-300`).
   `no_sandbox=True` plus a `workspace` label fixes the `realpath` failure but changes
   the reach, not the bug: it falls back to a whole-source-tree `find .` that cannot
   descend through `bazel-out`, so generated files stay structurally invisible.
   BZL-LARK-01 previously named `buildifier_test` as an acceptable gate shape. That was
   an overclaim and is corrected in place. Wave 5 closes the version question the false-pass
   left open. The bug is **not** Bazel-version-gated — the same pinned 8.2.0.2 binary
   false-passes a deliberately broken sample identically under Bzlmod-only 9.2.0
   (`//gen:check_broken_via_buildifier_test PASSED`, with `realpath: missing operand` in the
   test log), while the hand-rolled `sh_test` over the raw binary correctly fails it — but it
   **is fixed upstream**, at `buildifier_prebuilt` **8.5.1.3**, where `[[ -n "$WORKSPACE" ]]`
   replaces `${WORKSPACE+x}` in `runner.bash.template`
   (`bazel9-gate-tags-visibility-and-flag-probes.md:124-175`). The fleet pins **8.2.0.2**,
   nine releases behind, and carries both this bug and the exit-code remap. That makes the
   pin itself a rule rather than a footnote: **new rule BZL-LARK-31**.
3. **A default-set buildifier warning is a build-breaking finding, not advice.** That
   single fact re-tiers roughly 98 checks at once and is why this ruleset promotes only
   the warnings whose *failure mode* an agent needs explained (BZL-LARK-05…11) and covers
   the rest with one row naming the invocation.
4. **`depset + depset` is a hard load-time error on the fleet's own pin, today.** The
   two dives disagreed by inference: the dialect dive called it "still loads and runs
   today… debt toward a future removal"
   (`starlark-dialect-and-determinism-traps.md:399`), the buildifier dive measured
   `--incompatible_depset_union` at 0 hits in current `bazelbuild/bazel` source
   (`buildifier-taxonomy-and-style.md:115-131`). Wave 4b ran it: on **8.7.0 and 9.2.0
   alike**, a `.bzl` computing `depset([1]) + depset([2])` fails at load time with
   `Error: unsupported binary operation: depset + depset`, exit 1, before any action is
   analysed (`flag-defaults-and-trivial-builds-across-versions.md:127-156`). The
   "deprecated but working" reading was wrong, and wrong *now*, not at some future
   major. BZL-LARK-11's rationale is corrected: this is a hard error the build reports
   first and buildifier's `depset-union` catches earlier, not a lint-only finding.
5. **`WARNINGS.md`'s "Flag in Bazel" column is provenance, not a live switch.** Seven of
   the flags it cites return zero hits in Bazel's own source
   (`buildifier-taxonomy-and-style.md:117-128`). Guidance that offers
   `--noincompatible_depset_union` as an escape hatch is wrong on every Bazel this fleet
   runs — and, per verdict 4, would not help even if the flag existed. Corrects the map's
   "≈40 of ≈84" to a measured **43 of 99**, and the map's "~84 warnings" to **99
   categories, 98 on by default, exactly one (`unsorted-dict-items`) off** (`:42-47,60-96`).
6. **`py_*` and `sh_*` are not exempt from Bazel 9's empty autoload, and the four rule
   families do not fail alike.** BZL-LARK-10's second clause was written defensively
   because `native-py`'s own buildifier doc text says the disabling "has been postponed"
   and `native-sh-*` cites no flag. Measured on fresh workspaces: on **8.7.0** a bare
   `py_library`, `sh_binary`, `cc_library` and `proto_library` all build (exit 0); on
   **9.2.0** all four fail (exit 1). `py_library`/`sh_binary`/`proto_library` fail with a
   plain `name 'py_library' is not defined (did you mean 'cc_library'?)`; `cc_library`
   alone gets a purpose-built `_removed_rule_failure` traceback through
   `/virtual_builtins_bzl/bazel/exports.bzl:40` that names the fix and even names
   `buildifier --lint=fix` as an automatic remedy
   (`flag-defaults-and-trivial-builds-across-versions.md:158-180`). The measured flag
   value: `--incompatible_autoload_externally` is a full allowlist on 8.7.0 and 8.8.0,
   `""` on 9.2.0. Ground truth for the symbol-to-`load()` mapping is
   `AutoloadSymbols.java` at `release-9.0.0` — not buildifier's `native-*` families, which
   no prose page enumerates and which lag reality for two of the five (BZL-FLAG
   correction 5). BZL-LARK-10 is promoted from defensive hedge to a confirmed MUST
   covering all five families.
7. **`positional-args` never fires on a `.bzl` file at all.** Settled two ways that
   agree. Empirically: five fixtures crossed over file type and call shape — only a
   bare-name call inside a `BUILD` file is flagged. From source
   (`bazel-contrib/buildtools` `main`, `warn/warn_bazel.go:178`): the function returns
   `nil` immediately when `f.Type != build.TypeBuild`, and even inside a `BUILD` file the
   callee must type-assert to `*build.Ident`, which a `*build.DotExpr` like
   `unittest.make(...)` fails (`buildifier-gate-reach-and-generated-starlark.md:170-227`).
   So `unittest.make(_impl)` and `analysistest.make(_impl, …)` are doubly exempt — wrong
   file type *and* wrong call shape. BZL-LARK-09's scoping note was right as written; the
   consequence the rule must now carry is that **empty buildifier output does not read as
   pass for a rule or macro call site living in a `.bzl` file**, which is exactly where a
   legacy macro body puts them. Wave 5 makes the Bazel-version independence measured rather
   than inferred: the clean-tree gate over `rules_ocx` — 28 `unittest.make`/`analysistest.make`
   positional call sites, all in `.bzl` — exits 0 on Bzlmod-only 9.2.0 exactly as on 8.7.0
   (`bazel9-gate-tags-visibility-and-flag-probes.md:92-107`).
8. **`.bazelignore` does not scope a lint gate, and the fleet's `examples/` and `e2e/`
   trees are already linted.** The runner does a plain shell `find .` from
   `$BUILD_WORKSPACE_DIRECTORY`; `.bazelignore` prunes Bazel's *package graph* and has no
   bearing on a `find`. A lint violation planted in `examples/project/BUILD.bazel`
   (`.bazelignore`d) and one planted in `ocx/private/versions.bzl` (in-graph) produce the
   **same** exit 123, with no signal distinguishing them
   (`buildifier-gate-reach-and-generated-starlark.md:134-168`). This falsifies wave-3b
   correction 7's "buildifier never runs over the `.bazelignore`d `examples/` and `e2e/`
   trees" and dissolves this file's own open question 1 as posed: no second target and no
   extra CI minutes are needed, because the coverage already exists. New rule BZL-LARK-29
   carries the general fact, which is the dangerous half: an agent that reads
   `.bazelignore` as a lint exclusion will believe a tree is unchecked when it is checked,
   or exclude a tree by editing the wrong file.
9. **`inherit_attrs` is a Bazel 8.0.0 feature, not 9.0.** The 9.0.0 release notes list it
   as a 9.0 addition; the versioned docs at the `8.0.0` git tag already document it and
   [PR #24280](https://github.com/bazelbuild/bazel/pull/24280) merged into `release-8.0.0`
   before GA (`macros-rules-and-symbolic-macros.md:276-311`). Gating the rule on Bazel 9
   would have locked the fleet's own 8.7.0 pin out of a feature it has. Generalised into
   BZL-LARK-28: never date a Starlark API from a release-notes bullet alone.
10. **Symbolic macros are the default for new macro code on Bazel 8+, and never for
    performance.** Lazy evaluation — their headline promise — is still explicitly unshipped
    on the live `macros.md` ("This feature is not available yet") and in no 9.0/9.1/9.2
    release note (`macros-rules-and-symbolic-macros.md:325-350`). The follow-up dive adds
    the mechanism the rule should name: a legacy `def` macro re-executes its whole body at
    loading time for every call site, and a symbolic macro pays the identical cost, because
    laziness is the only thing that would change it
    (`diagnosis-procedures-profiling-and-execlog-tooling.md:93`).
11. **Legacy struct providers are a MUST-not on both majors, for two different reasons, and
    the rule says both.** Deprecated-but-working on 8 (the flag was still opt-in per the 8.0.0
    notes), removed outright on 9.0 with `--incompatible_disallow_struct_provider_syntax` a
    permanent no-op (`starlark-dialect-and-determinism-traps.md:235-279`). Because every CI
    matrix in this program runs 8.x *and* 9.x, code that is green on the 8 leg and dead on the
    9 leg is worse than code that never worked. `bazel.build/extending/rules`'s "Migrating from
    legacy providers" section still reads as though the legacy style is current and mentions
    Bazel 9 nowhere — a stale-docs trap the ruleset names explicitly.
12. **The statement-position rule is a Starlark-spec fact, not a Bazel quirk, and the ruleset
    must say "Starlark".** The spec's own grammar and prose carry it, and an independent
    engine (`starlark-rust`, which backs `ocx package test --script`) enforces it with the
    same wording (`starlark-dialect-and-determinism-traps.md:62-115`). Framing it as
    "Bazel's BUILD dialect" undersells its reach into `.star`/`.scl` — which is exactly where
    it has bitten this fleet twice, in `ocx-contrib`, with no Bazel involved.
13. **The dict/set-ordering topic is a decoy; the bug is one layer up.** Starlark specifies
    insertion order for dicts and sets, normatively. The action-key instability M-A-07 is
    about comes from a `default`-order depset — "deterministic" only for a fixed graph shape —
    flowing into a dict, join or command line (`:117-156`). A rule that says "don't rely on
    dict order" fixes nothing; the fix is at the depset boundary. Wave 4b corrects how the
    verification's empty output reads: an action whose owning target hits the **persistent
    local action cache is never written to the execution log at all**, by `spawn.proto`'s own
    contract, so an action absent from both logs was never tested and reads *inconclusive*,
    not pass (`diagnosis-procedures-profiling-and-execlog-tooling.md:112,159`).
14. **The generated-Starlark blind spot is bigger than the audits said, and it now has a
    settled cheapest check.** `starlark-code-shape.md:272` and the dialect dive both name four
    sites; the real count in `rules_ocx` today is **eight**, and it includes generated `.bzl`,
    not only `BUILD.bazel`: `ocx/private/project.bzl:123,225,226`, `download.bzl:59`,
    `package.bzl:97,284,285,406`. Worse, the unit tests that appear to cover it assert
    *substrings* — `launcher_test.bzl:508-511` and `:905-921`, where the comment at `:907`
    literally claims "Must be valid Starlark" above an `in`-check. Wave 4b answered what the
    file flagged as its highest-leverage open question, by running all three candidates:
    (a) `bazel query --output=build` / `bazel build --nobuild` over a package that `load()`s
    the generated repo is the cheapest real check — Bazel's own loading-phase Starlark
    compiler, 0.057 s, 0 actions, no binary, exit 7 (query) or 1 (build) on a bad render;
    (b) a hand-rolled `sh_test` piping the rendered output through the raw `buildifier` binary
    works and adds the lint layer; (c) `buildifier_test` does neither, per verdict 2
    (`buildifier-gate-reach-and-generated-starlark.md:262-397`). (a) becomes new rule
    BZL-LARK-30; (b) replaces BZL-LARK-26's implementation advice.
15. **The loading phase catches meaning, not only syntax — the documented gap was wrong, and
    the blind spot that survives is a different one.** Wave 4b recorded, reasoned rather than
    measured, that a semantically-wrong-but-parseable render would slip past the loading-phase
    check. Wave 5 ran four such fixtures on 8.7.0 and 9.2.0 and the loader caught **every one**,
    at the same reliability as a syntax error, in two sub-phases Bazel's own error text names:
    *compilation of module* — static name resolution, which rejects an undefined name even when
    the only reference sits in a function that is never called — and *initialization of module*,
    which rejects a `load()` of a symbol the target module does not export, and a bad builtin
    argument (`attr.string(default = 123)`), when the top-level statement executes. `query`
    exits 7 and `build --nobuild` exits 1 on each, identically on both majors. Buildifier is
    blind to all three `.bzl`-content classes (exit 0 on each; its one hit on the bad-`load()`
    fixture is an unrelated `unused load` style warning that vanishes when the symbol is used).
    Its one real catch is `duplicated-name` in a *BUILD* file, which is AST-visible and needs no
    execution (`arch-live-graph-generated-semantics-and-lockfile-error.md:238-319`). The blind
    spot that actually survives is worse than the one recorded: **nothing fires until something
    `load()`s the generated file** — `bazel query @gen_a//:all` over a generated repo no package
    consumes returns `INFO: Empty results`, exit 0 (`:289-292`). What is left for BZL-LARK-25's
    real build is content that compiles, initialises and analyses cleanly but names the wrong
    thing at execution — reasoned, not measured; one BUILD-level shape (a `filegroup` with a
    nonexistent kwarg) was left untested (`:480-484`).
16. **Two rules ship straight out of the fleet because nothing upstream documents them.** The
    `analysistest`/`expect_failure` vacuous pass (a `str.find` substring match against text
    that includes the traceback's echo of the caller's own source line,
    `starlark-dialect-and-determinism-traps.md:281-318`) and the generated-Starlark blind
    spot are the corpus's strongest verbatim-reuse candidates. `rules_ocx` already implements
    the first correctly (`ocx/tests/launcher_test.bzl:1153-1166`) and is the source of the text.
17. **BZL-LARK-24's "seen red once" half now has a re-runnable verification, and it is
    structural rather than a remembered drill.** The follow-up dive built and ran the shape on
    both majors: a throwaway harness `rule()` whose implementation does nothing but call the
    guarded path, driven by `analysistest.make(expect_failure = True)` against a
    guard-tripping fixture *and* by a plain `analysistest.make()` against a valid one — both
    green (`repository-rule-and-extension-offline-testing.md:142-179`). That pairing is the
    evidence the prose asked a human to supply: the passing sibling proves the harness has no
    other latent failure, so the failing sibling's failure can only come from the guard, and
    deleting the guard makes the harness return normally, at which point `expect_failure`
    reports `Expected failure of target_under_test, but found success`. The same dive's
    negative control shows why the harness must be an `analysistest`: an uncaught `fail()`
    driven through a bare `unittest.make()` aborts that target's analysis with no PASS/FAIL and
    `bazel test` reports "No test targets were found, yet testing was requested". Decision
    recorded: **fixture pairing**, not a naming convention and not reviewer discipline.
    `rules_ocx` already has the harness half (`_bad_closure_report` at
    `ocx/tests/launcher_test.bzl:1148-1151`, `_guard` at `:1292`) and the constant half; it has
    no passing sibling fixture, which is now a concrete, one-target finding rather than an
    unenforceable one.
18. **What was considered and rejected.** (a) A `set()`-over-dict-as-set rule —
    `--experimental_enable_starlark_set` is on by default since 8.1.0 but still tagged
    experimental, and Bazel's own depsets page still teaches the dict idiom; a rule here
    churns code for no failure (`starlark-dialect-and-determinism-traps.md:408`). (b) A
    docstring-on-every-public-symbol rule — `function-docstring` exempts functions under five
    statements by its own threshold (`buildifier-taxonomy-and-style.md:53`), and over-applying
    it trains agents to ignore the check; folded into BZL-LARK-12 as a ceiling instead.
    (c) A `.bzl`-export-minimisation rule (M-A-22) — no mechanical check exists and nothing in
    an agent's behaviour changes without one. (d) The Tweag `alias()` +
    `attr.label(configurable = False)` early-resolution pattern — a real technique, single
    argued source, kept in the failure-modes section rather than promoted to a rule. (e) A
    separate "never write `buildifier_test`" row — verdict 2's failure is caught by
    BZL-LARK-01's own seeded-violation verification (a `buildifier_test` that stays green with
    a violation planted *is* the finding), so it is folded into that rule instead of forking
    the check.
19. **Version boundaries the ruleset depends on.** Bazel **9.0**: legacy struct providers
    removed; `--incompatible_autoload_externally` defaults empty (measured `""` at 9.2.0
    against a full allowlist at 8.7.0/8.8.0) so every native `cc_*`/`java_*`/`py_*`/`sh_*`/
    `proto_library` needs an explicit `load()`; computation-step limits enforced inside
    symbolic macros (`--max_computation_steps` measured `0`, unlimited, on 8.7.0, 8.8.0 and
    9.2.0, so the change bites only a repo that already set it). Bazel **8.0.0**: symbolic
    macros and `inherit_attrs` available. Bazel **8.1.0**: `set()` builtin. `depset + depset`
    is a hard error on both majors, with no version boundary at all. buildifier's linting is
    Bazel-version independent — only the flag-linked warnings carry a boundary; the numbers
    here are `buildtools` `main`/v8.5.1 as of 2026-09-05, the exit-code and gate-reach
    measurements are buildifier **8.2.0** as pinned by `buildifier_prebuilt` **8.2.0.2**, and
    `bazel_skylib` 1.9.0, as pinned in `rules_ocx/MODULE.bazel:13,18`. Two boundaries belong to
    `buildifier_prebuilt`, not to Bazel or to buildifier: its `runner.bash.template` carries the
    `${WORKSPACE+x}` false-pass through 8.5.1.2 and fixes it at **8.5.1.3**, and carries the
    `find … -print | xargs` exit-123 remap through 8.5.1.3 and replaces it with
    `find … -exec … {} +` at **8.5.1.4** (latest)
    (`bazel9-gate-tags-visibility-and-flag-probes.md:145-154`). rules_js 3.4.1,
    rules_python 2.3.3 and rules_rust 0.74.0 are irrelevant to this family: nothing here
    depends on a language ruleset. `Cargo.toml`/`pyproject.toml`/`package.json` hygiene
    inside a Bazel repo stays covered by `rust-cargo`, `python-packaging` and
    `typescript-packaging`.
20. **Host caveat, stated once.** Every measurement folded into this revision ran on this
    WSL2 workstation (`Linux 6.18.33.2-microsoft-standard-WSL2`, 32 vCPU, 31 GB), not a CI
    runner, with `linux-sandbox` confirmed as the spawn strategy in raw output rather than
    assumed. Nothing in this family's findings depends on a mount, timing or filesystem quirk:
    the mechanisms are `find`/`xargs` exit-code semantics, a bash `${VAR+x}` bug, Bazel's own
    loading-phase compiler and Go source in `warn_bazel.go` — shell- and source-level, not
    kernel-level. The wave-4b buildifier cluster ran at **8.7.0 only**; wave 5 re-ran the gate,
    the `buildifier_test` false-pass and the generated-Starlark fixtures at **9.2.0** as well,
    on the same host, with identical results — where a claim is still 8.7.0-only it says so.

## The ruleset

Thirty-one rules. Ordering for **01-28** is by the check that catches them, so one invocation
covers a run of rows: **01-04** configure and defend the buildifier gate; **05-11** are
individual default warnings the same `bazel run //:buildifier.check` already reports,
promoted only because each names a distinct failure an agent will otherwise repeat;
**12-15** have no buildifier category at all and are greps or reading heuristics; **16-17**
need a build or an execution-log diff; **18-24** are macro-authoring rules checked by reading
the macro body plus a load-time build; **25-28** are the fleet-discovered and
sourcing-discipline rules. **29-30** were added by the wave-4b revision and **31** by the
wave-5 round; all three keep new IDs rather than being renumbered into place: 29 and 31 belong
with the gate rows (01-04), 30 with the generated-Starlark rows (25-26). **pinned** marks a
project decision rather than a derived fact.

**Reach limit on every grep-based cell below, stated once:** a grep sees the `.bzl` source
that *builds* a string, never the string. BUILD and `.bzl` text a repository rule or module
extension writes into a generated repo is out of reach of every grep, of buildifier, and of
stardoc — BZL-LARK-25, 26 and 30 exist because of that, and a clean grep never proves a
generated repo is clean.

| ID | Rule | Rationale | Verification (and how EMPTY OUTPUT reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| **BZL-LARK-01** | Invoke the lint gate as a `buildifier()` target run through `bazel run` whose exit code the caller propagates; never behind `\|\| true`, `continue-on-error`, or a stdout scrape, and **never as `buildifier_test`**. | `mode="diff"` + `lint_mode="warn"` already exits nonzero on a pure lint finding, with no diff to print (`buildifier-taxonomy-and-style.md:133-204`); the shipped runner is `find … -print \| xargs buildifier` under `set -euo pipefail`, so `pipefail` carries the failure out but `xargs` rewrites 1-125 to **123** — nothing you read in CI will say 4. `buildifier_test` is worse than soft: its template's `${WORKSPACE+x}` test is always true, `find -type f` then walks a symlink-only runfiles tree, buildifier gets zero file arguments and reads empty stdin as valid Starlark, so it passes with a broken `srcs` (`buildifier-gate-reach-and-generated-starlark.md:83-132,269-300`). Both halves re-measured under Bzlmod-only **9.2.0** with the same pin: gate identical, false-pass identical — the bug is not Bazel-version-gated, but it **is** fixed upstream at `buildifier_prebuilt` 8.5.1.3, which is BZL-LARK-31's floor (`bazel9-gate-tags-visibility-and-flag-probes.md:92-175`). | Seed one `depset-union` violation into an already-formatted `.bzl` **outside the build's load graph** (a file Bazel loads fails the build first — verdict 4), then `bazel run //:buildifier.check; echo $?` — must be nonzero (measured 123 at `buildifier_prebuilt` ≤ 8.5.1.3 on both 8.7.0 and 9.2.0; buildifier's own **4** from 8.5.1.4, which drops the `xargs` remap). EMPTY stdout with `$? != 0` still reads **pass for the gate**; gate on `$?`, never on stdout, never on a specific number — 4 and 123 are both pin-dependent. A gate target that stays **green** with the violation planted is the finding, and is the tell for a `buildifier_test`. | MUST | Bazel 8, 9 (measured 8.7.0 and 9.2.0); `buildifier_prebuilt` 8.2.0.2, buildifier 8.2.0; shapes A, F | M-A-02 |
| **BZL-LARK-02** | Leave `lint_warnings` unset on every `buildifier()` target unless deliberately narrowing, and never reproduce the default list by hand. | `DefaultWarnings` is computed from `AllWarnings` at build time, so an unset attribute inherits every new check a future `buildtools` release adds; an explicit list freezes the set silently (`buildifier-taxonomy-and-style.md:224-225`). | `grep -rn 'lint_warnings' --include='BUILD.bazel' .` — every hit must be a documented narrowing or `["+unsorted-dict-items"]`. EMPTY output reads **pass**. | SHOULD | Bazel 8, 9; buildifier ≥ current; shapes A, F | M-A-03, M-A-04 |
| **BZL-LARK-03** | Opt in `unsorted-dict-items` (`lint_warnings = ["+unsorted-dict-items"]`) on the target covering any `.bzl` that defines `tag_class()`es or large `attr()` schema dicts, and do not expect it to reach a schema passed by name. **pinned** | It is the single warning upstream disables by default, and only for diff-noise reasons that do not apply to rarely-edited schema tables (`warn.go:224-227`). Measured cost on `ocx/extensions.bzl`: **2** findings, not the 4 `tag_class()`es this file previously counted — one dict is already alphabetical and one is `attrs = POLICY_ATTRS`, a symbol reference the check cannot see through, because it sorts *literal* dict expressions only. The autofix moves two four-line `"name":` blocks and has no observable effect on any consumer (`buildifier-gate-reach-and-generated-starlark.md:399-454`). | `buildifier -mode=check -lint=warn -warnings=+unsorted-dict-items <file>` on the schema file; then confirm the attribute is present on the covering target. EMPTY output from `grep -rn 'unsorted-dict-items'` on a repo with `tag_class()` reads **finding** (not opted in). EMPTY buildifier output on a file whose schemas are `attrs = SOME_CONST` reads **inconclusive**, not pass. | CONSIDER | Bazel 8, 9 (measured 8.7.0, buildifier 8.2.0); shape A | M-A-04 |
| **BZL-LARK-04** | Every `# buildifier: disable=<category>` names a category that still exists in `warn.go` and carries a one-line reason on the same or preceding line. | `load-on-top`, `out-of-order-load`, `same-origin-load` and `attr-package-metadata` are gone from all three warning maps — the first three are unconditional formatter rewrites now — so those suppressions are inert cruft that reads as protection (`buildifier-taxonomy-and-style.md:98-109`). | `grep -rn 'buildifier: disable=' --include='*.bzl' --include='BUILD.bazel' .`, then check each category against the four-name deny-list and against `warn.go`'s maps. EMPTY output reads **pass**. | MUST (never write one of the four); SHOULD (delete on sight) | Bazel 8, 9; current buildifier; shapes A, F | M-A-03 |
| **BZL-LARK-05** | Never return a bare `struct(...)` from a rule or aspect implementation function; return a list of declared providers. | Deprecated on Bazel 8, **removed on 9.0** — the flag is a permanent no-op there — and every CI matrix in this program runs both, so this is code that is green on one leg and dead on the other (`starlark-dialect-and-determinism-traps.md:235-279`). | buildifier `rule-impl-return` (default set, no autofix); backstop `grep -rn 'return struct(' --include='*.bzl' .` — a hit is a finding **only** when the enclosing function is a rule/aspect implementation, not a plain helper returning a value object. EMPTY output reads **pass**. | MUST | Bazel 8 (deprecated) → 9 (removed); shapes A, F | M-A-08 |
| **BZL-LARK-06** | Every `provider()` call declares both `fields` and a documentation string. | Provider identity is symbol plus shape; an undeclared field set makes the first later field addition a silent contract change for every consumer that pattern-matches on `hasattr` (`starlark-dialect-and-determinism-traps.md:235-279`, `buildifier-taxonomy-and-style.md:252`). | buildifier `provider-params` (default set). EMPTY output reads **pass**. | MUST for a new provider; SHOULD to retrofit | Bazel 8, 9; shapes A, F | M-A-09 |
| **BZL-LARK-07** | Never construct a depset inside a loop with the accumulator itself in `transitive=`; collect a plain list across the loop and call `depset(transitive = collected)` once, after it. | Produces an unbounded chain of single-element nodes — silent O(N²) traversal that no `--incompatible_*` flag will ever catch because it is a performance defect, not a compatibility break (`starlark-dialect-and-determinism-traps.md:193-220`). | buildifier `overly-nested-depset` (default set, no autofix). EMPTY output reads **pass** for source `.bzl`. Dynamic backstop when the static check is out of reach (a generated `.bzl`, or a suspected hotspot with no source hit): `bazel build --nobuild --starlark_cpu_profile=/tmp/cpu.pprof <target>` then `pprof -top /tmp/cpu.pprof` — a hot frame in a loop that builds `depset(transitive = accumulator)` is the same finding (`diagnosis-procedures-profiling-and-execlog-tooling.md:89,187-195`). | MUST | Bazel 8, 9; shapes A, F | M-A-05 |
| **BZL-LARK-08** | No function may return a value on some paths and fall off the end on others, and no local may be read before every branch assigns it. | Both are real correctness bugs with no flag behind them: an implicit `None` mixed with an explicit return changes a caller's behaviour depending on which branch ran (`buildifier-taxonomy-and-style.md:270`). | buildifier `return-value` and `uninitialized` (default set, no autofix). EMPTY output reads **pass**. | MUST | Bazel 8, 9; shapes A, F | M-A-20 |
| **BZL-LARK-09** | Pass every argument to a rule or macro call site by keyword, never positionally — and do not read a clean buildifier run as proof for call sites that live in a `.bzl` file. | `WARNINGS.md`'s own entry states that positional arguments "prevent migration from Legacy Macros to Symbolic Macros" — a symbolic macro rejects them at the interpreter level (`accepts no more than N positional argument(s) but got M`), and the warning has **no autofix**, so every site is a hand edit (`macros-rules-and-symbolic-macros.md:352-386`). The check's reach was measured: `warn_bazel.go:178` returns `nil` whenever `f.Type != build.TypeBuild`, and inside a `BUILD` file the callee must be a bare `*build.Ident`, so a dotted call is skipped too (`buildifier-gate-reach-and-generated-starlark.md:170-227`). Re-measured under Bzlmod-only **9.2.0**: the clean-tree gate over `rules_ocx`'s 28 dotted positional call sites still exits 0, so the file-type gate is Bazel-version-independent by measurement, not only by source reading (`bazel9-gate-tags-visibility-and-flag-probes.md:92-107`). | buildifier `positional-args` (default set; exempts `load()`, `vardef()`, `export_files()`, `licenses()`, `print()`). EMPTY output reads **pass for bare-name call sites in `BUILD` files only**; for a call site inside a `.bzl` (a legacy macro body, a helper) it reads **not checked** — read those by hand. `unittest.make(_impl)` and `analysistest.make(_impl, …)` are the upstream bazel-skylib idiom, doubly exempt, and are not this rule's target. | MUST on a symbolic-migration path; SHOULD otherwise | Bazel 8, 9 (gate measured on 8.7.0 and 9.2.0); buildifier 8.2.0, `warn_bazel.go` gate has no version-conditional code; shapes A, F | M-A-15 |
| **BZL-LARK-10** | Every `cc_*`, `java_*`, `py_*`, `sh_*` and `proto_library` call carries an explicit `load()` from its Starlark ruleset, and a clean `native-py`/`native-sh-*` result is never read as proof of Bazel-9 readiness. | `--incompatible_autoload_externally` is a full allowlist on 8.7.0/8.8.0 and `""` on 9.2.0 — the native symbols are simply gone from the global namespace. Measured on fresh workspaces: all five kinds build bare on 8.7.0 and all five fail on 9.2.0, in two different error shapes — a plain `name 'py_library' is not defined (did you mean 'cc_library'?)` for `py_*`/`sh_*`/`proto_library`, and a purpose-built `_removed_rule_failure` traceback naming `buildifier --lint=fix` for `cc_*` (`flag-defaults-and-trivial-builds-across-versions.md:158-180`). buildifier's `native-py` doc text still says the disabling "has been postponed" and `native-sh-*` cites no flag, so the linter lags reality for those two families (`buildifier-taxonomy-and-style.md:55,248-250`). | A real `bazel build --nobuild //...` on **Bazel 9** with no `load()` — the ground truth for all five families. buildifier under a Bazel-9 toolchain auto-fixes cc/java/proto; EMPTY buildifier output reads **pass for cc/java/proto only** and **not checked** for `py_*`/`sh_*`. For the symbol-to-ruleset mapping, read `AutoloadSymbols.java` at `release-9.0.0` — no prose page enumerates it, and BCR's flag list can lag (BZL-FLAG correction 5). | MUST on Bazel 9 for all five families; SHOULD on 8 (forward-compat) | Bazel 8 (SHOULD), 9 (MUST); rules_cc/rules_java/protobuf/rules_python/rules_shell current; shapes A, F | M-A-03 |
| **BZL-LARK-11** | Never merge depsets with `+`, `\|` or `.union()`; construct one `depset(direct = …, transitive = […])`. | This is a **hard load-time error today**, not a deprecation: `depset([1]) + depset([2])` fails with `Error: unsupported binary operation: depset + depset`, exit 1, identically on 8.7.0 and 9.2.0 (`flag-defaults-and-trivial-builds-across-versions.md:127-156`). Its migration flag was flipped and deleted from Bazel's source years ago (`buildifier-taxonomy-and-style.md:115-131`), so no flag re-enables it. The idiom reads as natural set algebra and dominates pre-2020 training data, which is why it still gets written. | buildifier `depset-union` catches it before a build; a build catches it at load time and reds the whole package. Backstop `grep -rnE 'depset\s*[+\|]\s*depset\|\.union\(' --include='*.bzl' .`. EMPTY output reads **pass**. | MUST | Bazel 8, 9 (both measured); shapes A, F | — (the map's own seed-a-violation example for M-A-02) |
| **BZL-LARK-12** | Every `attr.*()` in a rule, aspect, repository rule, tag class or module extension carries `doc=`; do not demand a docstring on a public function below `function-docstring`'s own five-statement threshold. | buildifier checks *function* docstrings and never attribute-level `doc=`, so a clean lint run says nothing about attr-doc coverage; and over-applying the docstring check to one-line helpers produces noise agents learn to ignore (`buildifier-taxonomy-and-style.md:214-220,260-262`). | A paren-balance scan: match every `attr\.\w+\(` call and confirm a `doc\s*=` keyword appears before its closing paren (the technique that measures 51/51 in `rules_ocx`; a line-wise grep miscounts multi-line calls). Any attr printed with no `doc=` reads **finding**; EMPTY output reads **pass**. | SHOULD | Bazel 8, 9; shapes A, F | M-A-01 |
| **BZL-LARK-13** | Every `.bzl` under a directory named `private/` or `internal/` opens with an explicit `visibility([…])` load-gate. | BUILD-target visibility does not gate `load()`; they are two different mechanisms, and buildifier's `bzl-visibility` enforces only the directory-*name* convention, never the builtin call — so a "private" file with a public package stays loadable from anywhere (`buildifier-taxonomy-and-style.md:214-220,264`). | `grep -L '^visibility(' <dir>/*.bzl` for every such directory — must print nothing. A printed filename reads **finding**; EMPTY output reads **pass**. | SHOULD | Bazel 8+ (the `visibility()` builtin); shapes A, F | M-A-16 |
| **BZL-LARK-14** | Do not factor a shared `deps`/`srcs` list into a top-level BUILD variable used by two or more targets; repeat the list. | BUILD files are configuration read one target at a time, and the BUILD style guide prefers DAMP over DRY for exactly that reason; the shared variable is the guide's named anti-pattern and nothing lints for it (`buildifier-taxonomy-and-style.md:206-220,266`). | Reading heuristic: grep for a top-level list assignment in a BUILD file, then grep its name for use in ≥2 rule calls. A hit is worth a second look, not an automatic fail. EMPTY output reads **pass**. | CONSIDER (style guide is argued, not normative) | Bazel 8, 9 (guide unversioned); shapes C, F | M-A-21 |
| **BZL-LARK-15** | Never write a top-level `if` or `for` **statement** in any Starlark file — `.bzl`, `BUILD`, `MODULE.bazel`, `.star`, `.scl` alike — and never write `while` or `assert` anywhere: they are reserved words with no grammar production at all. Use an if-*expression* for a value, or a `def` called as a bare top-level expression. | The restriction is in the Starlark spec's own grammar and prose ("An `if` statement at top level results in a static error"), not in Bazel, and an independent engine enforces it identically. It is a **parse-time** error, so it reds every target on every platform at once, before a single assertion runs (`starlark-dialect-and-determinism-traps.md:62-115`). | `grep -rnE '^(if \|for \|while \|assert )' --include='*.bzl' --include='*.star' --include='*.scl' --include='BUILD*' --include='MODULE.bazel' .` — a column-0 triage grep, not a proof. EMPTY output reads **pass**. When a build already failed, grep the log for the distinctive `cannot be used outside \`def\` in this dialect` before touching anything else. | MUST | All Bazel majors and every Starlark dialect, Bazel-hosted or not; shapes A, B, F (and `ocx-contrib`, outside the table) | M-A-18 |
| **BZL-LARK-16** | Never let a `default`-order depset's traversal reach an action's command line, an action input manifest, or a generated file without either an explicit `order=` chosen for a stated requirement or a canonicalisation step (`sorted()`). | `default` order guarantees only "deterministic for this graph shape". Adding an unrelated transitive edge elsewhere silently reorders the flattened list, changing the command line and therefore the action key — a spurious cache miss that presents as "the build is non-deterministic" (`starlark-dialect-and-determinism-traps.md:117-156`). | Build twice with `--execution_log_compact_file`, editing an unrelated part of the graph between runs, and diff via `bazel-bin/src/tools/execlog/parser --log_path=… --log_path=… --output_path=… --output_path=…` (the parser owns `--log_path`/`--output_path`/`--restrict_to_runner`; `--sort` belongs to `execlog:converter`, and `--execution_log_sort` never applies to the compact format). EMPTY diff **on an action that appears in both logs** reads **pass**; any diff is the trap firing. An action **absent from both logs** was served by the persistent local action cache and is never written to the log at all, by `spawn.proto`'s own contract — that reads **inconclusive**, not pass; `bazel clean` and re-run, or read the BEP's `ActionCacheStatistics` (`diagnosis-procedures-profiling-and-execlog-tooling.md:112,159,163`). | MUST for command lines and generated manifests; SHOULD elsewhere | Bazel 8, 9 (execlog flags byte-identical on both tags); shapes A, F | M-A-07 |
| **BZL-LARK-17** | Never call `depset.to_list()` to build action arguments; pass the depset to `ctx.actions.args().add_all()`/`add_joined()` and let expansion happen at execution time. Flattening is permitted only at a genuinely terminal target or in debugging code. | `to_list()` is O(N²) across overlapping dependency chains, and the common "it's safe at top-level targets" exemption is false the moment tests or an IDE import build overlapping target sets — Bazel's own guidance reports `args()` cutting rule memory by 90% or more (`starlark-dialect-and-determinism-traps.md:158-191`). | `grep -rn '\.to_list()' --include='*.bzl' .`, excluding test and debug paths, then confirm each remaining hit is terminal or replaceable by `add_all`. EMPTY output reads **pass**. Dynamic backstop: elevated CPU inside `runAnalysisPhase` with no matching execution-phase growth, with `--starlark_cpu_profile` + `pprof -top` naming the calling `.bzl` function (`diagnosis-procedures-profiling-and-execlog-tooling.md:90,192-195`). | MUST | Bazel 8, 9; shapes A, F | M-A-06 |
| **BZL-LARK-18** | Choose by capability, not by taste: a `rule()` if the logic must register an action or return a provider; otherwise a symbolic `macro()` on Bazel 8+; a legacy `def` macro **only** when the body needs `glob()`, an untyped parameter, or `native.existing_rules()` outside a finalizer — and prefer moving the `glob()` to the calling BUILD file over keeping the macro legacy. | Macros compose rule calls at loading time and can do neither of the first two things — a hard Starlark API boundary. Legacy macros are transparent to the visibility system and permit silent argument mutation, so porting later is strictly harder than starting symbolic; a `native.existing_rules()` macro's correct destination is `macro(finalizer = True, …)`, which restores macro-aware visibility (`macros-rules-and-symbolic-macros.md:124-150,429-446,477-479,657-676`). | Reading heuristic on each macro definition: does the body call `ctx.actions.*` (→ it must be a `rule()`), `glob()`, take a parameter with no `attr.*()` type, or call `native.existing_rules()` outside `finalizer = True`? A plain `def` on a Bazel-8+ repo with none of those is the finding. EMPTY output (no such `def`s) reads **pass**. | MUST for the `rule()` boundary; SHOULD for the symbolic default | Bazel 8+ for the symbolic default; all majors for the `rule()` boundary; shapes A, C, F | M-A-10 |
| **BZL-LARK-19** | Every target or submacro a symbolic macro creates is named exactly the macro's `name`, or `name` followed by `_` (preferred), `.` or `-`. | A violating target "can be declared, but cannot be built and cannot be used as dependencies" — it surfaces only when something depends on it, as `Target //src:X declared in symbolic macro 'Y' violates macro naming rules` (`macros-rules-and-symbolic-macros.md:180-200`). | Read every `name = ` construction in the macro implementation against the `name` parameter (`"genrule" + name` is the canonical failure; `name + "_genrule"` is the fix), or build the suspect target and read for `violates macro naming rules`. EMPTY output reads **pass**. | MUST | Bazel 8+; shapes A, F | M-A-11 |
| **BZL-LARK-20** | Inside a symbolic macro, never mutate a received argument: no `kwargs["x"]["k"] = v`, no `.append()` on a received list or attribute. Copy first (`dict(x)`), and extend a configurable attribute with `+=`. Mark an attribute `configurable = False` when the macro genuinely cannot handle a per-configuration value. | All macro arguments arrive frozen (`Error: trying to mutate a frozen dict value`), and every attribute not marked `configurable = False` arrives wrapped in a trivial `select()` even when the caller passed a plain list, so `.append()` fails with `'select' value has no field or method 'append'` while `+=` succeeds. Both patterns were silent no-ops in a legacy macro (`macros-rules-and-symbolic-macros.md:202-274`). | `grep -nE 'kwargs\[[^]]+\]\s*\[[^]]+\]\s*=\|kwargs\[[^]]+\]\.append\(\|\.append\(' over the macro's `.bzl`, then confirm each target is not a macro argument. Confirm a hit by building a target the macro instantiates and reading for the two exact error strings. EMPTY output reads **pass**. | MUST | Bazel 8+ (symbolic macros only; legacy macros are unaffected); shapes A, F | M-A-12 |
| **BZL-LARK-21** | Guard every `inherit_attrs`-sourced attribute for `None` before using it as a list, dict or string, and declare defaults in the macro's own `attrs` dict — never on the implementation function's `def` line, where they are silently ignored. | Inheritance overrides every non-mandatory attribute's default to `None` "regardless of the original attribute definition's default value": `target_compatible_with` is `[]` on the rule and `None` on the inheriting macro, so `if not kwargs["x"]` cannot distinguish unset from explicitly empty, and `None + ["x"]` raises where `[] + ["x"]` works (`macros-rules-and-symbolic-macros.md:276-323,556-575,606-621`). | For each name in `inherit_attrs`, read the implementation for a use of that parameter and confirm an `or []` / `== None` guard precedes it. For a suspected ignored default, call the macro without the argument and read the value back with `bazel cquery //target --output=build`. EMPTY output (no unguarded read) reads **pass**. | MUST | **Bazel 8.0.0+** — not 9, despite the 9.0.0 release-notes bullet; shapes A, F | M-A-13 |
| **BZL-LARK-22** | Never justify writing or converting a macro as a performance improvement without a dated citation that symbolic-macro lazy evaluation has shipped. | Lazy expansion is the only mechanism that would make symbolic macros cheaper at equal call volume, and it is explicitly unshipped: "We are in the process of implementing lazy macro expansion and evaluation. This feature is not available yet." No 9.0/9.1/9.2 release note says otherwise (`macros-rules-and-symbolic-macros.md:325-350`). The cost a macro actually imposes is unchanged by the conversion: a legacy `def` macro re-executes its whole body at loading time for every call site, and a symbolic macro pays it identically until laziness ships (`diagnosis-procedures-profiling-and-execlog-tooling.md:93`). | `curl -sL https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/extending/macros.md \| grep -A2 'Laziness'` — a match containing "not available yet" means the performance claim is still false; a match describing shipped laziness re-opens this rule. EMPTY output means the section moved: re-read the page, do not assume it shipped. | MUST (accuracy of shipped text and commit messages) | Bazel 8, 9 (as of 9.2.0, 2026-09-06); shapes A, F | M-A-14 |
| **BZL-LARK-23** | Inside a symbolic macro, set the visibility of each created target explicitly — omitted (macro-private) or forwarded as `visibility = visibility` — and never hardcode `visibility = ["//visibility:public"]` in a macro body. | The package's `default_visibility` does not apply inside a symbolic macro, the opposite of legacy-macro behaviour; hardcoding public "makes the target unconditionally visible to every package, even if the caller specified a more restricted visibility" (`macros-rules-and-symbolic-macros.md:623-642`). | `grep -n 'visibility = \["//visibility:public"\]'` inside `.bzl` files containing `macro(` — a mechanical proxy for the worst case; otherwise read each rule call in the implementation. EMPTY output reads **pass**. | MUST for the hardcoded-public antipattern; SHOULD for the general "set it explicitly" | Bazel 8+; shapes A, F | — (new; adjacent to M-A-11/M-A-16) |
| **BZL-LARK-24** | An `analysistest` built with `expect_failure = True` asserts against a fragment held in a constant that the test's own call site cannot spell, drives a **throwaway harness `rule()` whose implementation does nothing but call the guarded path**, and is paired with a sibling plain `analysistest.make()` over the same harness on a valid input. | `asserts.expect_failure` is `actual_errors.find(msg) < 0` — a raw substring search over the concatenated cause messages, which include the traceback's echo of each frame's *source line*. A fragment that also appears at the call site matches the echo and the test passes with the guard deleted. Documented nowhere upstream (`starlark-dialect-and-determinism-traps.md:281-318`). The harness-plus-pair shape turns the old "seen red once" drill into a structural property: the passing sibling proves the harness has no other latent failure, so the failing sibling's failure can only be the guard's, and deleting the guard makes the harness return normally, at which point `expect_failure` reports `Expected failure of target_under_test, but found success`. Verified running on 8.7.0 and 9.2.0 (`repository-rule-and-extension-offline-testing.md:142-179`). | Three checks, all re-runnable. (1) `grep -rn 'asserts.expect_failure(env, "'` — any hit with a quoted literal rather than a bare identifier is the finding (shared with BZL-TEST-18); EMPTY output reads **pass**. (2) Read the harness rule's implementation: anything beyond the single call into the guarded path is a second possible failure source and reads **finding**. (3) `bazel test` the pair — a green `expect_failure` test with **no** passing sibling over the same harness reads **finding**, not pass. A bare `unittest.make()` is never the right driver here: an uncaught `fail()` aborts that target's analysis with no PASS/FAIL and `bazel test` reports "No test targets were found, yet testing was requested" (`:165-177`). | MUST | Bazel 8, 9 (both measured); any `analysistest`/`bazel_skylib` consumer (1.9.0 as pinned); shapes A, F | M-A-19 |
| **BZL-LARK-25** | Any repository rule, module extension or macro that writes Starlark text as a string — `ctx.file("BUILD.bazel", …)`, `ctx.file("*.bzl", …)` or equivalent — has at least one test that **builds a target out of the generated repository**, exercised on every push. A substring assertion over the rendered string is not validation, and neither is BZL-LARK-30's loading-phase step on its own — it catches a great deal more than syntax, but only for a generated file some package actually `load()`s. | Generated Starlark is invisible to buildifier, stardoc and every grep-based audit: those tools see the `.bzl` that builds the string, never the string. A typo in a generated `package()` passes every static check and surfaces only at consumer build time (`starlark-dialect-and-determinism-traps.md:320-379`; `starlark-code-shape.md:272`). Wave 4b's sharpening ("the cheaper layers stop at syntax") is corrected by measurement: BZL-LARK-30's loading-phase step catches undefined names, bad `load()` targets and bad builtin arguments too, on both majors — but it fires only once some package `load()`s the generated file, and `bazel query @gen_a//:all` over an unconsumed generated repo returns `INFO: Empty results`, exit 0. That is the direct demonstration this rule is load-bearing (`arch-live-graph-generated-semantics-and-lockfile-error.md:289-292,296-319`). What is left to this rule alone is a render that compiles, initialises and analyses cleanly and still names the wrong thing when the target is built. | For each `ctx.file(` whose content argument is a computed string, confirm a corresponding example/e2e target exists **and** runs in CI on push, not on a schedule. This is a reading heuristic cross-referenced against the CI config, not one grep. EMPTY output ("every generator site has an exercised integration test") reads **pass**. A green BZL-LARK-30 or BZL-LARK-26 check on a site with no such test reads **finding**, not pass. | MUST | Bazel 8, 9; binds shape A hardest, then F | M-A-17 |
| **BZL-LARK-26** | Where generated Starlark cannot be avoided, funnel the string-building through a small number of named `render_*` helpers, and have at least one test pipe a rendered sample through the raw `buildifier` binary in `-mode=check -lint=warn` — as a plain `sh_test`, never `buildifier_test`. | Does not close BZL-LARK-25's blind spot but shrinks it from every implementation to a handful of tested helpers, and catches unbalanced parens and bad quoting without a live build (`starlark-dialect-and-determinism-traps.md:406`). The implementation shape is measured: a `sh_test` with `data = [<rendered target>, "@buildifier_prebuilt//:buildifier"]` and `$(location)` substitution correctly passes a clean sample and fails a broken one with the exact `file:line:col`; the shipped `buildifier_test` rule silently passes either way (`buildifier-gate-reach-and-generated-starlark.md:269-326`). Wave 5 narrows what this layer buys: buildifier never *evaluates* Starlark, so it is blind to all three `.bzl`-content defect classes — an undefined name, a `load()` of a symbol the target module does not export, a bad builtin argument — exit 0 on each; its real value is format and style plus the purpose-built structural lints, of which `duplicated-name` over a rendered *BUILD* file is the one that fired. It layers **above** BZL-LARK-30's loading-phase step, never in place of it (`arch-live-graph-generated-semantics-and-lockfile-error.md:238-338`). | Does a `sh_test` capture a `render_*` helper's output and `exec "$BUILDIFIER" -mode=check -lint=warn "$GENERATED"`? Absence of such a test reads **finding**; a substring assertion does not substitute (`asserts.true(env, "x" in content)` cannot detect a syntax error), and a green `buildifier_test` over the same `srcs` reads **not checked**, not pass. EMPTY buildifier output on a rendered `.bzl` reads **pass on format, style and the structural lints only** — never as a semantic check. The shape re-runs on 9.2.0 (broken sample FAILED at `gen/render_broken.bzl:3:1: syntax error`, clean sample PASSED), where the `sh_test` needs an explicit `load("@rules_shell//shell:sh_test.bzl", "sh_test")` because autoload is empty on 9 (BZL-LARK-10). | SHOULD | Bazel 8, 9 (measured 8.7.0 and 9.2.0); buildifier_prebuilt 8.2.0.2; shapes A, F | M-A-17 (mitigation) |
| **BZL-LARK-27** | Never use `ctx.runfiles(collect_data = …)` or `collect_default = …`, and never pass `data_runfiles=`/`default_runfiles=` to the `DefaultInfo` constructor; use `DefaultInfo(runfiles = …)` and read a dependency's runfiles as `DefaultInfo.default_runfiles`. | Bazel's own "Runfiles features to avoid" names all of these — the collect modes gather runfiles across hardcoded dependency edges in confusing ways, and the data/default split is legacy-only. **No buildifier warning and no `--incompatible_*` flag exists for any of them**, so nothing surfaces this on its own (`starlark-dialect-and-determinism-traps.md:222-233,401-402`). | `grep -rn 'collect_data\|collect_default\|data_runfiles' --include='*.bzl' .` — every hit is suspect; a `.default_runfiles` **read** is correct and does not match. EMPTY output reads **pass**. | MUST for new code; SHOULD as a migration backlog | Bazel 8, 9; shapes A, F | — (covered per the wave-2 brief; no M-ID) |
| **BZL-LARK-28** | Before writing any Bazel version floor, flag availability or "still supported" claim into a rule, doc or commit message, verify it against a source with a version attached — the versioned reference docs at the git tag, the release notes, a code search, or the pinned binary's own help output — never a release-notes bullet alone and never a `bazel.build` prose page alone. | Four independent misdatings surfaced across this family's waves: the 9.0.0 notes re-list `inherit_attrs`, an 8.0.0 feature; `WARNINGS.md` cites seven flags Bazel has deleted; the legacy-provider migration page never mentions Bazel 9 at all; and two dives inferred opposite answers on `depset + depset` that one two-line build settled (`macros-rules-and-symbolic-macros.md:276-311,696-714`; `buildifier-taxonomy-and-style.md:115-131`; `starlark-dialect-and-determinism-traps.md:235-279,410`; `flag-defaults-and-trivial-builds-across-versions.md:127-156`). | `curl -sL https://raw.githubusercontent.com/bazelbuild/bazel/<claimed-floor-tag>/site/en/<page>.md \| grep '<api>'` at the claimed floor **and one major earlier**. For a flag: `gh api "search/code?q=<flag>+repo:bazelbuild/bazel"` for existence, and `bazel help build --long` **plus** `bazel help startup_options` on the pinned binary for the live default — a flag can live in either surface and `help build --long` alone silently misses a startup option (`flag-defaults-and-trivial-builds-across-versions.md:53,84,86`); `bazel help all --long` is not a subcommand. A hit one major earlier contradicts the release notes and the docs win. EMPTY search result for a flag reads **historical — do not cite as flippable**. | SHOULD (sourcing discipline for whoever authors or refreshes the shipped text) | All majors; shapes A, F | M-A-03 (partly), M-A-08 (docs-staleness angle) |
| **BZL-LARK-29** | Never treat `.bazelignore` as a lint or format exclusion, and never claim a tree is unlinted because it is listed there. Exclude a tree from the gate with the lint target's own `exclude_patterns` (or an equivalent path filter), and treat every `.bazelignore`d tree as in scope until you have proven otherwise. | `buildifier_prebuilt`'s runner `cd`s to `$BUILD_WORKSPACE_DIRECTORY` and runs a plain shell `find .`; `.bazelignore` prunes Bazel's package graph and has no bearing on a `find`. A violation planted in `examples/project/BUILD.bazel` (`.bazelignore`d) and one planted in `ocx/private/versions.bzl` (in-graph) both produce exit **123** with nothing in the exit status distinguishing them (`buildifier-gate-reach-and-generated-starlark.md:134-168`). Two failure modes follow: an agent believes an ignored tree is unchecked and ships lint debt into it, or "excludes" a tree by editing `.bazelignore` and changes nothing. | Plant one lint violation (an unused `load`) inside a `.bazelignore`d tree, run the gate, `echo $?` — nonzero means the runner reaches it. EMPTY output with `$? == 0` reads **the runner does not reach that tree** (verify why before relying on it); nonzero reads **the tree is in scope**. Independently, read the generated runner under `bazel-bin` and confirm which paths its `find` filter excludes — the `exclude_patterns` attribute becomes `\! -path '<pattern>'`. | MUST | Bazel 8, 9; measured at 8.7.0 with `buildifier_prebuilt` 8.2.0.2 on a WSL2 host — the mechanism is shell-level and not host-specific; shapes A, F | — (new; wave 4b, falsifies wave-3b correction 7) |
| **BZL-LARK-30** | Every repository rule or module extension that generates a `.bzl` or `BUILD` file has a consumer package in the repo that `load()`s or references it, and the gate runs a **loading-phase step** over that consumer on every push — `bazel query //...` (exit 7 on a defect) or `bazel build --nobuild //...` (exit 1) — as its own step, never folded into or replaced by the buildifier step. | Buildifier parses and lints; it never evaluates Starlark, so it is blind to all three `.bzl`-content defect classes and exits 0 on each. Bazel's loading phase catches every one of them at the same reliability as a syntax error, in two sub-phases its own error text names: **static resolution** (`compilation of module`) rejects an undefined name unconditionally — even when the only reference sits in a function that is never called — and **module initialisation** (`initialization of module`) rejects a `load()` of a symbol the target module does not export, and a bad builtin argument (`attr.string(default = 123)`), when the top-level statement executes. Measured identical on 8.7.0 and 9.2.0 across four semantic fixtures plus the syntax fixture, at 0 actions, no binary, 0.057 s (`arch-live-graph-generated-semantics-and-lockfile-error.md:238-319`; `buildifier-gate-reach-and-generated-starlark.md:327-359`). | `bazel query //consumer:target; echo $?` — 0 reads **the generated Starlark compiled and initialised**; 7 prints the generated file's own `path:line:col` (`build --nobuild` gives the same diagnosis at exit 1, and `--output=build` is optional, not load-bearing). EMPTY output with exit 0 over a generated repo **no package loads** reads **not checked**, not pass — `bazel query @gen//:all` on an unconsumed generated repo returns `INFO: Empty results`, exit 0 (`arch-live-graph-generated-semantics-and-lockfile-error.md:289-292`). A generator with no consumer package at all reads **finding**. A green run still says nothing about a render that compiles, initialises and analyses and is wrong only when the target is built — that stays BZL-LARK-25's. | MUST | Bazel 8, 9 (both majors measured, identical error text and exit codes); shapes A, F | M-A-17 (cheap layer) |
| **BZL-LARK-31** | Pin `buildifier_prebuilt` at **8.5.1.3 or later** (8.5.1.4 preferred), and gate the lint target on its exit status being nonzero — never on a specific number. | Two defects live in `runner.bash.template`, not in buildifier and not in Bazel, and both are pin-scoped: `${WORKSPACE+x}` tests whether the variable is *set*, not whether it is non-empty, which is what makes `buildifier_test` false-pass (BZL-LARK-01) — fixed at **8.5.1.3**; and `find … -print \| xargs` remaps any 1-125 exit to **123**, which is what makes any check for buildifier's documented 4 wrong — retired at **8.5.1.4**, where `find … -exec … {} +` lets the native code through. Below the floor a repo ships a lint gate whose `test` form checks nothing; above it, a gate that compares against the literal 123 goes green on every finding. Measured across the tag range, and the false-pass reproduced on both majors with the pinned binary; the fleet pins **8.2.0.2**, nine releases behind, carrying both (`bazel9-gate-tags-visibility-and-flag-probes.md:124-175`). | `grep -n 'buildifier_prebuilt' MODULE.bazel` — a version below 8.5.1.3 reads **finding**; EMPTY output reads **rule does not apply** (not a `buildifier_prebuilt` consumer), never pass. Then read the generated runner: `grep -nE 'WORKSPACE\+x\|xargs' bazel-bin/<target>.bash` — a `${WORKSPACE+x}` hit means the false-pass is live, an `xargs` hit means the 123 remap is live, and EMPTY output means both are gone and the gate now propagates buildifier's own **4**. Separately grep CI and task files for a literal `123` or `-eq 4` compared against this gate; any hit is a finding. | SHOULD for the floor (only the two named fixes are verified — the 8.2.0.2 → 8.5.1.4 changelog across nine releases is unaudited); MUST for never gating on a specific exit number | Bazel 8, 9 (the template is Bazel-version-independent; false-pass measured on 8.7.0 and 9.2.0); `buildifier_prebuilt` 8.2.0.2 through 8.5.1.4; shapes A, F | — (new; wave 5) |

## Applied to rules_ocx

`rules_ocx` is a repository-rule and module-extension ruleset: 4 `repository_rule()`, 1
`module_extension()`, 4 `tag_class()`, and **zero** production `rule()` declarations
(`starlark-code-shape.md:49-53`). That shape decides which half of this family can bind at
all.

**Already satisfied — preserve:**

- **BZL-LARK-01.** `BUILD.bazel:13-18` (`mode="diff"`, `lint_mode="warn"`) → `taskfile.yml:25`
  (`bazel run //:buildifier.check`, first command, no `ignore_error`) → `ci.yml:31`
  (`ocx exec -- task lint`, no `continue-on-error`). Nothing swallows the exit code; the gate
  is hard today, re-confirmed by running it on 8.7.0 and again on Bzlmod-only 9.2.0 (`exit=0`
  clean, `exit=123` with a violation planted, both versions). Critically, it is a `buildifier()`
  target invoked through `bazel run`, **not** a `buildifier_test` — the shape that false-passes
  (verdict 2).
- **BZL-LARK-02.** Neither `buildifier()` target sets `lint_warnings` (`BUILD.bazel:6-18`), so
  both inherit the full 98-warning default (`starlark-code-shape.md:212`).
- **BZL-LARK-04.** Four suppressions repo-wide, every category live and every one justified:
  `unused-variable` at `ocx/tests/launcher_test.bzl:72,100,159` (fake-`ctx` closures whose
  parameter names must match `repository_ctx`'s real signature) and `print` at
  `ocx/private/package.bzl:199` (a user-facing digest-pin hint, the exact case `WARNINGS.md`
  says the warning is *not* for). None is one of the four dead categories.
- **BZL-LARK-09.** Settled by measurement, previously flagged "Unverified": the clean-tree run
  covers `ocx/tests/launcher_test.bzl` and its 28 `unittest.make`/`analysistest.make`
  positional call sites produce **zero** `positional-args` findings, because the check never
  runs on a `.bzl` file and skips dotted calls even in a `BUILD` file. The rule's BUILD-file
  scoping was correct as written.
- **BZL-LARK-10.** Every `sh_test`/`sh_binary` carries an explicit
  `load("@rules_shell//shell:…")` — `ocx/tests/BUILD.bazel:4`, `docs/BUILD.bazel:9`,
  `examples/{project,package,cross_platform}/BUILD.bazel:4-5` — and the repo declares zero
  `cc_*`/`java_*`/`proto_library` targets anywhere (`build-contracts-and-ci-posture.md:37`).
  The explicit `sh_*` loads now matter more than the audit thought: `sh_*` is **not** exempt
  from the empty autoload on 9.x (verdict 6), so this is real Bazel-9 readiness on this axis,
  not incidental hygiene.
- **BZL-LARK-12.** 51/51 production `attr.*()` carry `doc=`; the five undocumented attrs are
  all in example or test scaffolding (`starlark-code-shape.md:53,144`). 10/10 public
  declarations documented (`:70-82`).
- **BZL-LARK-13.** All seven `ocx/private/*.bzl` open with
  `visibility(["//ocx", "//ocx/tests"])` under a public package
  (`starlark-code-shape.md:268`); re-verified here — `grep -L '^visibility(' ocx/private/*.bzl`
  prints nothing.
- **BZL-LARK-15.** Zero top-level statements in `rules_ocx`; re-verified here across
  `ocx/*.bzl`, `ocx/private/*.bzl`, `ocx/tests/*.bzl`.
- **BZL-LARK-24, first two checks.** The exemplar the rule is written from:
  `ocx/tests/launcher_test.bzl:1153-1166` holds the fragment in `_DRIFT_HINT` with a comment
  naming the traceback-echo mechanism, and `:1178-1184` does the same with `_CALLSITE_HINT`.
  Both guards are driven through throwaway harness rules whose implementations do nothing but
  call the guarded path (`_bad_closure_report` at `:1142-1151`, `_guard` at `:1292`), and the
  file's own comment at `:1182-1183` states the property the rule now formalises: "a case that
  *succeeds* returns normally from `_guard_impl` and the analysistest reports it as a miss."
  This is the fleet's own text and shape, promoted verbatim.
- **BZL-LARK-26, first half.** `render_launchers_build` and `render_env_bzl`
  (`ocx/private/repo_utils.bzl:1125-1602`) already centralise five of the six generated-BUILD
  writes into named helpers, and `render_launchers_build` even carries a security assertion
  about hostile names reaching the generated file (`launcher_test.bzl:504-511`).
- **BZL-LARK-29.** Satisfied by measurement rather than by design: `//:buildifier.check`
  already lints `examples/` and `e2e/`, with `exclude_patterns = ["./.git/*"]` the only
  exclusion. Wave-3b correction 7's "buildifier never runs over the `.bazelignore`d
  `examples/` and `e2e/` trees" is **wrong** and is corrected here.

**Violated:**

| Rule | Site | What is wrong |
|---|---|---|
| BZL-LARK-25 | `ocx/private/project.bzl:123,225,226`, `download.bzl:59`, `package.bzl:97,284,285,406` | **Eight** generated-Starlark write sites, not the four both the audit (`starlark-code-shape.md:272`) and the dive record — and two of them write a generated `.bzl` (`env.bzl`), which a consumer then `load()`s (`examples/project/BUILD.bazel:5`). None of the eight is required by anything to have an integration test; `examples/*` happens to cover them today. |
| BZL-LARK-25 | `ocx/tests/launcher_test.bzl:508-511`, `:905-921` | The unit coverage that looks like validation is a set of `in`-checks. The comment at `:907` states "Must be valid Starlark that round-trips the entries through JSON" and the assertion below it is `asserts.true(env, "OCX_ENV = _DATA[\"entries\"]" in content)`. A substring test passes over an unbalanced paren, a bad attribute name, or a truncated render. |
| BZL-LARK-26, second half | repo-wide | No test pipes any `render_*` output through the raw `buildifier` binary. The helpers exist; the cheap syntactic gate over them does not. The shape to add is a plain `sh_test` with `data = ["@buildifier_prebuilt//:buildifier", <rendered file>]` — measured working — not a `buildifier_test`, which would pass regardless. |
| BZL-LARK-24, third check | `ocx/tests/launcher_test.bzl:1169,1299` | Both `analysistest.make(expect_failure = True)` targets drive a correct harness with an unspellable constant, but neither has a **passing sibling** over the same harness on a valid input. `closure_packages_test` (`:1548`) exercises the happy path through `unittest.make` and a different code path, so it does not prove `_bad_closure_report`'s harness has no other latent failure. Two `analysistest.make()` targets (one per harness, valid input) close it. This replaces the old "prose with no re-runnable verification" finding — the check now exists. |
| BZL-LARK-03 | `BUILD.bazel:13-18` | `unsorted-dict-items` is not opted in. Measured cost, correcting this file's earlier count of four: **2** findings in `ocx/extensions.bzl` (`:45` and `:129`, both the `"bins"` key inside a `tag_class()` schema where `"name"` is deliberately placed first). `_download`'s dict is already alphabetical and `_policy`'s `attrs = POLICY_ATTRS` is a symbol reference the check cannot see through. The autofix relocates two four-line blocks, semantically inert. One line; deliberate gap, recorded rather than fixed here. |
| BZL-LARK-31 | `MODULE.bazel:18` | `buildifier_prebuilt` is pinned at **8.2.0.2** — below the 8.5.1.3 floor and nine releases behind 8.5.1.4 — so both template defects are live in this repo's generated runner: the `${WORKSPACE+x}` false-pass (inert only because nothing here writes a `buildifier_test`) and the `xargs` 123 remap (inert only because `taskfile.yml:25` and `ci.yml:31` gate on nonzero rather than on a number). Neither bites at today's shape; the margin is one `buildifier_test` or one exit-code comparison wide. The bump is one line, and its only unaudited risk is the nine-release changelog. |

**Cannot exhibit — no fleet instance, upstream-grounded:**

BZL-LARK-05, 06, 07, 08, 11, 16, 17, 27 and 18-23 all need rule-authoring or macro surface
that `rules_ocx` does not have: 0 production `rule()`, 0 `provider()`, 0 `aspect()`,
0 `macro()`, 0 `depset()` construction anywhere, 0 runfiles-merging code
(`starlark-code-shape.md:49,134-142`; re-verified here — `grep -rn 'depset(' --include='*.bzl' ocx/`
and the `to_list`/`collect_data` greps all return nothing). **To exhibit this half the fleet
would have to build one real `rule()`** — a rule that registers an action and returns a
provider. The nearest thing that exists is the four `repository_rule()` `_impl` functions,
which are a different API: no providers, no depsets, no actions, and (separately) zero
orchestration tests of their own (`starlark-code-shape.md:270-271`; the "zero `analysistest`
coverage" framing is a category error corrected by wave-3a correction 6 — `analysistest.make()`
cannot target a repository rule at all, and the working technique is BZL-TEST-15's fake-ctx
`unittest` plus BZL-LARK-24's harness for the `fail()` paths). Note two traps for whoever runs
the greps: `return struct(` matches five times in `ocx/tests/launcher_test.bzl:65,77,83,106,109`,
all fake-`ctx` constructors inside test helpers and **not** BZL-LARK-05 findings, and the four
`select(`/`glob(`/`package(` hits in `ocx/private/*.bzl` are string templates for a consumer's
generated repo, not this repo's own graph (`starlark-code-shape.md:130,155-158`) — which is
exactly the reach limit BZL-LARK-25/26/30 exist for.

**Would bind on adoption:** BZL-LARK-30. Two of the eight generator sites write a `.bzl` a
consumer loads (`env.bzl`, loaded at `examples/project/BUILD.bazel:5`), so the loading-phase
check already runs as a side effect of the `examples/` jobs — but nothing names it as the gate,
and a ninth generator site with no consumer package would add no signal at all.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds hardest and binds
  today: 01-04, 29 and 31 (the gate), 12-13 (attr docs, load-gates), 24-26 and 30 (the two
  fleet-discovered traps and their measured checks), 28. The rule-authoring half (05-08, 11,
  16-17, 27) and the macro half (18-23) are forward pins for the first `rule()` or `macro()`
  this repo writes.
- **B — Rust CLI + Python harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`, `rust-oci-client`).**
  No Starlark and no Bazel today, so 01-14, 16-27 and 29-30 bind only on adoption — `bob` is
  the named adoption candidate (9 crates, clean DAG, no CI to preserve). **BZL-LARK-15 binds
  now, without Bazel**: `ocx package test --script` runs `starlark-rust` in the real Bazel
  `.bzl` dialect for package smoke tests, and the statement-position trap has shipped twice
  in `ocx-contrib` — a repo outside the A-F table entirely
  (`config-inventory.md:124`, `starlark-dialect-and-determinism-traps.md:412-413`).
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** On adoption, 13 crates plus 3 services
  is the first fleet shape where a per-service macro is the obvious move, so 18-23 land here
  before anywhere else; 14 (DAMP) binds because a shared `deps` variable across 12 workspace
  members is the natural first refactor. Nothing binds today.
- **D — Python library or automation.** Adoption-only, and thin: these are single-package
  projects whose BUILD files would carry a handful of targets each. 15 binds the moment
  anyone writes a `.bzl`; 10 binds the moment a `py_*` target meets a Bazel-9 leg; nothing
  else does.
- **E — TypeScript package, extension or Action.** Adoption-only, same as D. `rules_js`/`rules_ts`
  specifics are `BZL-JS`'s, not this family's.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Every row binds. This
  is the only shape where 05-08, 11, 16-23 and 27 have live subjects, and it is the audience
  the whole rule-authoring half is written for.

## AI-agent failure modes

Ranked by how often it bites.

1. **Writing a legacy `def foo(name, **kwargs): native.cc_library(…)` macro on a Bazel-8+
   repo.** Training data over-represents WORKSPACE-era and pre-2024 macros; "write a macro"
   returns the pattern the model has seen most. **Check:** does the generated `.bzl` call
   `macro(attrs = …, implementation = …)`, or is it a bare `def` with a `visibility = None`
   parameter default? A bare `def` with no stated glob/untyped-param/finalizer need is the tell.
2. **Reading "buildifier passed" as "style guide satisfied".** A clean run proves compliance
   with 99 specific patterns and says nothing about the ~45-50 style-guide items with no
   category — visibility scoping, dependency directness, DAMP-vs-DRY, attr-doc coverage,
   export minimalism. **Check:** run the no-mechanical-check list as a reading pass; there is
   no substitute command to add.
3. **Treating `lint_mode="warn"` as report-only, by analogy to a compiler warning.** An agent
   asked to "add a non-blocking lint check" will copy exactly this configuration and ship a
   blocking one — and an agent asked why CI is red will look everywhere but here.
   **Check:** run the target once with a deliberately seeded violation before calling any
   gate non-blocking. Never infer blocking behaviour from an attribute name.
4. **Reaching for `buildifier_test` because it is the rule with `test` in the name, and
   reading its green as coverage.** It passes with a broken `srcs` in its default
   configuration, and in its only "fixed" configuration it scans the source tree instead of
   the file you named. **Check:** plant a syntax error in the file the test claims to cover;
   if it stays green, the test checks nothing. Replace with a plain `sh_test` over the raw
   binary.
5. **Believing `.bazelignore` scopes the lint gate.** An agent asked "is `examples/` linted?"
   reads `.bazelignore`, answers no, and either ships lint debt there or "excludes" a tree by
   editing a file the gate never reads. **Check:** plant a violation in the ignored tree and
   run the gate.
6. **Writing a bare `cc_library(…)`/`py_test(…)` with no `load()` because it built in
   training data.** Autoload carried this on every Bazel through 8.x; on 9 the symbol is
   gone for all five families, not three. **Check:** a real `bazel build --nobuild` on Bazel
   9. Recognise both error shapes: `name 'py_library' is not defined (did you mean
   'cc_library'?)` for `py_*`/`sh_*`/`proto_library`, and a `_removed_rule_failure` traceback
   naming `buildifier --lint=fix` for `cc_*`.
7. **Copying Python module-level structure into a `.bzl` — a top-level `if` to conditionally
   define a target, a top-level `for` to generate several.** It fails at *parse* time, and an
   agent unfamiliar with the restriction tends to "fix" unrelated nearby code because the
   whole file is red. **Check:** grep the build log for `cannot be used outside \`def\` in
   this dialect` before editing anything.
8. **Returning `struct(my_field = …)` from a rule implementation, copied from
   `bazel.build/extending/rules`' still-live-looking "Migrating from legacy providers"
   section.** Builds on 8, fails outright on 9. **Check:** buildifier `rule-impl-return`,
   plus the judgement step that the enclosing function is really a rule impl.
9. **Porting a legacy macro to symbolic by renaming the `def` and keeping the body.** The
   `kwargs["env"]["k"] = v` and `.append()` mutations that were silent no-ops become
   `trying to mutate a frozen dict value` and `'select' value has no field or method 'append'`.
   **Check:** the BZL-LARK-20 grep before the first build. The escape hatch when a macro
   genuinely needs a resolved `select()` at macro-evaluation time is an `alias()` target plus
   `attr.label(configurable = False)` — one argued source (Tweag), so it is a technique here,
   not a rule.
10. **Merging depsets with `+` or `|`.** Reads as natural set algebra and appears throughout
    pre-2020 snippets. The old belief that it "still works, just deprecated" is wrong: it is a
    hard load-time error on 8.7.0 and 9.2.0 alike. **Check:** buildifier `depset-union` before
    a build; a two-line `.bzl` and `bazel build //...` settles it in one command.
11. **Calling `.to_list()` to build a command line**, usually as
    `args.add(" ".join([f.short_path for f in files.to_list()]))`. It is the readable form and
    it is the O(N²) form. **Check:** `grep -rn '\.to_list()' --include='*.bzl' .`, then
    rewrite to `args.add_all(files, format_each = …, map_each = …)`.
12. **Trusting a green `expect_failure` test.** This is the specifically dangerous one for an
    agent with no human in the loop, because a green suite is exactly the signal an
    autonomous agent is built to trust. **Check:** the harness must do nothing but call the
    guarded path, and a passing sibling over the same harness must exist — then removing the
    guard turns the test red on its own.
13. **Reaching for `unittest.make()` to test a `fail()`-triggering branch.** It looks like the
    right tool and is, for the happy path; on a `fail()` it aborts the target's analysis with
    no PASS/FAIL and `bazel test` reports "No test targets were found, yet testing was
    requested" — a green-looking non-result. **Check:** does the test file drive `fail()` paths
    through `analysistest.make(expect_failure = True)` against a harness rule?
14. **Assuming an inherited attribute keeps the wrapped rule's default** — writing
    `kwargs.get("tags", [])` and expecting `[]` where `inherit_attrs` guarantees `None`.
    `None + ["x"]` raises. **Check:** every `inherit_attrs` name is read behind an `or []` /
    `== None` guard.
15. **Advertising a symbolic-macro migration as a speed-up**, echoing "designed to be
    amenable to lazy evaluation" from Bazel's own page. **Check:** does the commit or PR cite
    a dated release note that laziness shipped? Assertion alone is unverified — the mechanism
    does not exist yet, and a symbolic macro pays the same per-call-site loading cost a legacy
    one does.
16. **Extending a generated-BUILD string and assuming the repo's lint gate covered the
    diff.** The gate the agent just ran did not look inside the string at all.
    **Check:** after touching any `render_*`/`ctx.file("BUILD…")` site, build the
    corresponding example or e2e target — unit tests in this fleet assert substrings over the
    same text and will stay green through a syntax error. The cheap first gate is a
    `bazel query` over a consumer package (BZL-LARK-30); it catches syntax, undefined names,
    bad `load()` targets and bad builtin arguments — but only once some package `load()`s the
    generated file, and never a render that is wrong only in what it names.
17. **Citing a version floor from a release-notes bullet, or an `--incompatible_*` flag from
    `WARNINGS.md`'s flag column, as currently true.** Both are wrong in named, dated cases.
    **Check:** BZL-LARK-28's tag fetch, code search, and the pinned binary's own
    `help build --long` **plus** `help startup_options`.
18. **Hand-wrapping `.bzl` lines to 79 characters.** The style guide states the guideline and
    then says it "should not be enforced strictly"; buildifier's formatter does not wrap
    lines at all and will not un-wrap them either. **Check:** none needed — do not do it.

## Open questions

**Needs a human decision:**

1. Keep linting `examples/` and `e2e/`, or exclude them? The premise of this question has
   changed: they are **already linted today** by `//:buildifier.check` (verdict 8), so the
   choice is now one `exclude_patterns` entry to stop, not a second target and 12+ shards of
   CI minutes to start. Nothing in the evidence decides whether the coverage is wanted.
2. Adopt BZL-LARK-03 (`unsorted-dict-items`) in `rules_ocx` now, or leave it? Now priced:
   exactly **2** findings, two hunks, each relocating a four-line `"name": attr.string(...)`
   block to its alphabetical slot, with no observable effect on any consumer — against the
   loss of the file's "identifying attribute first" convention. The rule ships as CONSIDER
   either way; this is only about the fleet's own gate.

**Deserves another research round:**

| Subarea | Question |
|---|---|
| buildifier-prebuilt-upgrade-path | **Closed the Bazel-9 half** (wave 5: the gate, the reach and the false-pass are all identical under Bzlmod-only 9.2.0 at the 8.2.0.2 pin, and the false-pass is fixed at 8.5.1.3 / the exit remap at 8.5.1.4 — verdicts 1-2, BZL-LARK-31). What is left is the bump itself: only the two named fixes were verified across the nine releases from 8.2.0.2 to 8.5.1.4, with no changelog or behaviour diff for anything else — `exclude_patterns` expansion, `lint_warnings` handling and the runfiles layout are all unaudited across that span (`bazel9-gate-tags-visibility-and-flag-probes.md:404-406`). |
| generated-starlark-execution-only-defects | **Closed as posed** (wave 5 measured four semantic fixtures: the loading phase catches all of them on both majors, buildifier none of the three `.bzl` ones — verdict 15, BZL-LARK-30). Two residues. (a) The one BUILD-level shape named but not run, a rule call with a nonexistent kwarg, is *expected* to fail at package construction by the same mechanism as the bad-builtin-argument fixture — expected, not measured (`arch-live-graph-generated-semantics-and-lockfile-error.md:480-484`). (b) The class BZL-LARK-25 is now the sole check for — a render that compiles, initialises and analyses cleanly and is wrong only in what it names — has no fixture at all, so how much a real consumer build adds over `build --nobuild` is still reasoned. |
| macro-estate-migration | Nothing in the corpus measures the cost of converting an existing legacy-macro estate. Tweag says some organisations reasonably never migrate; no source quantifies when the visibility and typing wins pay for the port. Only matters once shape C or F exists. |

**M-A rows this ruleset does not settle:**

- **M-A-22** ("does a `.bzl` export more public symbols than are ever used together"). No
  mechanical check exists — the buildifier dive confirms the map's own conclusion
  independently (`buildifier-taxonomy-and-style.md:268`) — and a CONSIDER rule with a
  grep-and-judge verification would not change what an agent writes. The behaviour-changing
  half of this question is "a published public API is a one-way door", which belongs to
  `BZL-ARCH`, not here. Left open deliberately.

All other rows M-A-01 through M-A-21 are settled by the table above.

## Revision log

Wave 4b, 2026-09-06. Inputs: the two measurement files and two follow-up dives added to
`consolidates`. No ID was renumbered, reused or retired; every existing rule keeps its number
and its meaning.

| Change | IDs | Why | From |
|---|---|---|---|
| Corrected the runner shape (`find … -print \| xargs`, not `find … -exec … +`) and the propagated exit code (**123**, not 4 or 1); removed `buildifier_test` as an acceptable gate shape and named its `${WORKSPACE+x}` false-pass in the rationale; made the verification say a *green* gate with a violation planted is the finding. **The old text named a gate form that silently checks nothing — the most dangerous kind of overclaim in this revision.** | BZL-LARK-01 | measured | `buildifier-gate-reach-and-generated-starlark.md:83-132,269-300` |
| Corrected the measured cost from 4 findings to **2**, named the two reasons the other schemas do not fire, and added the check's reach limit: it sorts literal dict expressions and cannot see through `attrs = SOME_CONST`. Empty output on a symbol-referenced schema now reads *inconclusive*. | BZL-LARK-03 | measured | `buildifier-gate-reach-and-generated-starlark.md:399-454` |
| Added the dynamic backstop (`--starlark_cpu_profile` + `pprof -top`) for hotspots the static check cannot reach, e.g. a generated `.bzl`. | BZL-LARK-07, BZL-LARK-17 | normative | `diagnosis-procedures-profiling-and-execlog-tooling.md:89-90,187-195` |
| Closed the "Unverified, needs a buildifier run" flag with a positive result, and added the reach limit that matters: `positional-args` never runs on a `.bzl` at all and skips dotted calls in BUILD, so empty output reads **not checked** for `.bzl`-resident call sites rather than pass. | BZL-LARK-09 | measured | `buildifier-gate-reach-and-generated-starlark.md:170-227` |
| Widened the rule from `cc_*`/`java_*`/`proto_library` to all five families (adds `py_*`, `sh_*`) at MUST on Bazel 9 — previously an unresolved defensive clause. Added both measured error shapes and named `AutoloadSymbols.java` at `release-9.0.0` as the symbol-mapping ground truth per the BZL-FLAG cross-family note. | BZL-LARK-10 | measured + normative | `flag-defaults-and-trivial-builds-across-versions.md:158-180`; BZL-FLAG correction 5 |
| Replaced "permanent legacy at best / still evaluates?" with the measured fact: `depset + depset` is a **hard load-time error on 8.7.0 and 9.2.0**, exit 1, `unsupported binary operation`. The rule's severity was already MUST; its rationale claimed less than the truth. | BZL-LARK-11 | measured | `flag-defaults-and-trivial-builds-across-versions.md:127-156` |
| Fixed how empty output reads: an action absent from both execution logs hit the persistent local action cache and was never written to the log at all, so it reads **inconclusive**, not pass. Added the parser/converter flag-ownership correction (`--sort` is the converter's) and the note that `--execution_log_sort` never applies to compact logs. | BZL-LARK-16 | normative | `diagnosis-procedures-profiling-and-execlog-tooling.md:107-118,112,159` |
| Added the mechanism behind the claim: a legacy `def` macro re-executes its body per call site and a symbolic macro pays it identically until laziness ships. Era date moved to 2026-09-06. | BZL-LARK-22 | normative | `diagnosis-procedures-profiling-and-execlog-tooling.md:93` |
| Replaced the unenforceable "observed red once with the guard removed" half with a **re-runnable three-part check**: unspellable constant (grep), a throwaway harness `rule()` that does nothing but call the guarded path (read), and a passing sibling `analysistest` over the same harness (run). Decision recorded: fixture pairing, not a naming convention. Named the `unittest.make()` negative control. This closes open question 2. | BZL-LARK-24 | measured | `repository-rule-and-extension-offline-testing.md:142-179`; BZL-TEST-18 |
| Stated what only this rule catches now that cheaper layers exist: a semantically wrong but syntactically valid render. A green BZL-LARK-30 or BZL-LARK-26 on a site with no integration test now reads **finding**, not pass. | BZL-LARK-25 | measured | `buildifier-gate-reach-and-generated-starlark.md:372-397` |
| Named the implementation shape that actually works — a plain `sh_test` with `data = [<rendered>, "@buildifier_prebuilt//:buildifier"]` — and forbade `buildifier_test` for this purpose, since it passes over the broken fixture and cannot see `bazel-out` at all. | BZL-LARK-26 | measured | `buildifier-gate-reach-and-generated-starlark.md:269-326` |
| Added the pinned-binary half of the verification: `bazel help build --long` **plus** `bazel help startup_options`, because a flag can live in either and `bazel help all --long` is not a subcommand. Added the `depset + depset` case as a fourth worked misdating. | BZL-LARK-28 | measured | `flag-defaults-and-trivial-builds-across-versions.md:53,84,86,127-156` |
| **New rule.** `.bazelignore` does not scope a lint gate; the runner does a plain shell `find .`. Falsifies wave-3b correction 7 and dissolves the old open question 1's premise. | BZL-LARK-29 | measured | `buildifier-gate-reach-and-generated-starlark.md:134-168` |
| **New rule.** The loading-phase Starlark compiler (`bazel query --output=build` / `build --nobuild` over a consumer package) is the cheapest real check on generated Starlark — 0 actions, 0.057 s, no binary. Syntax only; layers under BZL-LARK-25. Settles the family's flagged highest-leverage open question. | BZL-LARK-30 | measured | `buildifier-gate-reach-and-generated-starlark.md:262-397` |
| Stated the generated-repo reach limit once, in the ruleset preamble, rather than repeating it in eleven grep cells — closing the house-standard gap wave-2 correction 9 opened. | (all grep-based cells) | house standard | frame, wave-2 correction 9 |
| Verdicts rewritten: 1-2 (gate mechanics and `buildifier_test`), 4 (depset union settled), 6 (autoload settled), 7 (`positional-args` reach), 8 (`.bazelignore`), 14 (generated-Starlark check settled), 15 (documented gap: no cheap semantic check), 17 (BZL-LARK-24's verification), 19 (version boundaries with measured values), 20 (host caveat). Old verdicts 4-8, 10-11 renumbered as 9-13, 16, 18 with text preserved. | — | — | — |
| Open questions: removed `buildifier-gate-reach`, `depset-union-status`, `autoload-coverage` and `generated-starlark-validation` (all settled, moved into verdicts); removed human-decision 2 (BZL-LARK-24 enforcement, now decided); reframed human-decision 1 on the corrected premise; added `buildifier-gate-on-bazel-9` and `generated-starlark-semantic-check` as the two gaps the measurements themselves left. | — | — | the four inputs' "Not settled" sections |

Wave 5 convergence round, 2026-09-06. Light, row-scoped. Inputs: the three measurement artifacts
added to `consolidates`. No ID was renumbered, reused or retired; one new ID was minted.
**ID reconciliation, recorded once:** the frame's wave-5 correction 5 and
`bazel9-gate-tags-visibility-and-flag-probes.md`'s `affects_rule_ids` both label the
`buildifier_test` false-pass **BZL-LARK-24**. In this file that row has always been BZL-LARK-01's
(the gate rule), and BZL-LARK-24 is the `analysistest`/`expect_failure` rule, untouched by this
round. Under the ID-stability contract the promotion therefore lands as BZL-LARK-01's corrected
text plus a new **BZL-LARK-31**, not as a repurposed 24.

| Change | IDs | Why | From |
|---|---|---|---|
| **New rule.** Pin `buildifier_prebuilt` ≥ 8.5.1.3 (8.5.1.4 preferred) and gate on nonzero, never on a number: the `${WORKSPACE+x}` false-pass is fixed at 8.5.1.3 and the `find \| xargs` exit-123 remap retired at 8.5.1.4, so both the defect and the exit code are properties of the *pin*, not of buildifier or Bazel. The fleet pins 8.2.0.2. | BZL-LARK-31 | measured | `bazel9-gate-tags-visibility-and-flag-probes.md:124-175` |
| Added the Bazel-9 half: the gate, its reach into `.bazelignore`d trees, the exit 123 and the 4-cell raw-binary matrix are all identical under Bzlmod-only 9.2.0 at the same pin. Made the exit code version-conditional in the verification (123 at ≤ 8.5.1.3, buildifier's own 4 from 8.5.1.4) and generalised "never gate on the number 4" to "never gate on a number". | BZL-LARK-01 | measured | `bazel9-gate-tags-visibility-and-flag-probes.md:92-175` |
| Turned the Bazel-version independence of the `positional-args` file-type gate from a source reading into a measurement: the clean-tree gate over 28 dotted `.bzl` call sites exits 0 on 9.2.0 as on 8.7.0. Applies-to now names both majors. | BZL-LARK-09 | measured | `bazel9-gate-tags-visibility-and-flag-probes.md:92-107` |
| **Corrected in place.** The wave-4b rationale claimed the cheaper layers "stop at syntax", so only a real build catches a semantically wrong render. Measured false for the loading-phase layer. The rule's real load-bearing evidence is now the unconsumed-generator result — `bazel query @gen_a//:all` returns `INFO: Empty results`, exit 0 — and what is left to this rule alone is a render that compiles, initialises and analyses and is wrong only when built. | BZL-LARK-25 | measured | `arch-live-graph-generated-semantics-and-lockfile-error.md:289-292,296-319` |
| Narrowed what the buildifier layer buys: blind to all three `.bzl`-content defect classes (exit 0 on each; its one hit on the bad-`load()` fixture is an unrelated unused-load warning), real value is format, style and the structural lints such as `duplicated-name`. It layers **above** BZL-LARK-30, never in place of it. Empty buildifier output now reads pass on format/style/structural lints only. Added the 9.2.0 re-run and the explicit `rules_shell` `load()` the `sh_test` needs there. | BZL-LARK-26 | measured | `arch-live-graph-generated-semantics-and-lockfile-error.md:238-338`; `bazel9-gate-tags-visibility-and-flag-probes.md:136-143` |
| **Promoted SHOULD → MUST**, and from "a cheap syntax check" to "a distinct loading-phase gate step". Names the two sub-phases in Bazel's own error text — static resolution (`compilation of module`, catches an undefined name even in dead code) and module initialisation (`initialization of module`, catches a bad `load()` target and a bad builtin argument when the statement executes). Corrected how empty output reads: exit 0 over a generated repo no package loads is **not checked**, not pass. | BZL-LARK-30 | measured | `arch-live-graph-generated-semantics-and-lockfile-error.md:238-319` |
| Verdicts: 1 (exit 123 is pin-scoped; whole cluster re-measured on 9.2.0), 2 (false-pass reproduces on 9.2.0, fixed upstream at 8.5.1.3, new rule 31), 7 (`positional-args` reach measured on both majors), **15 rewritten** — the "documented gap: nothing cheap catches a semantically-wrong-but-parseable render" was measured wrong; the surviving blind spot is that nothing fires until a consumer `load()`s the file — 19 (the two `buildifier_prebuilt` template boundaries), 20 (host caveat: the buildifier cluster is no longer 8.7.0-only). | — | — | all three inputs |
| Open questions: `buildifier-gate-on-bazel-9` → `buildifier-prebuilt-upgrade-path` (Bazel-9 half closed; the unaudited nine-release changelog is what remains); `generated-starlark-semantic-check` → `generated-starlark-execution-only-defects` (closed as posed; the untested BUILD-level kwarg shape and the unfixtured execution-only class remain). `macro-estate-migration` untouched. | — | — | the inputs' own "Not settled" sections |
| Applied to `rules_ocx`: BZL-LARK-01's bullet now records the 9.2.0 re-run; a BZL-LARK-31 row was added to **Violated** (pin 8.2.0.2 at `MODULE.bazel:18`, both template defects live but inert at today's shape); shape A's gate list reads 01-04, 29 and 31. | BZL-LARK-01, -31 | measured | `bazel9-gate-tags-visibility-and-flag-probes.md:92-175` |
| Read and folded nothing: `hermeticity-second-half-mounts-tool-args-and-globs.md` Q4's `constant-glob` / `--incompatible_disallow_empty_glob` disjointness belongs to BZL-HERM-19; no row in this family mentions `constant-glob`, and the round's brief forbids minting one here. Listed in `consolidates` for provenance. | — | scope | `hermeticity-second-half-mounts-tool-args-and-globs.md:192-235` |

## Sub-artifacts

Wave-2 dives (this family's own):

- [buildifier-taxonomy-and-style.md](bazel-starlark-and-build/buildifier-taxonomy-and-style.md) —
  the 99-category warning taxonomy, the four dead warnings, the flag-provenance correction,
  and the source-plus-live-binary trace that overturns the map's conflict 18.
- [macros-rules-and-symbolic-macros.md](bazel-starlark-and-build/macros-rules-and-symbolic-macros.md) —
  the rule/symbolic-macro/legacy-macro decision procedure, the porting traps (naming schema,
  frozen kwargs, configurable-by-default, `inherit_attrs`), and the `inherit_attrs`
  version-floor correction.
- [starlark-dialect-and-determinism-traps.md](bazel-starlark-and-build/starlark-dialect-and-determinism-traps.md) —
  the statement-position rule as a spec fact, the depset order/`to_list()`/nesting traps,
  legacy struct providers across the 8→9 boundary, and the two fleet-discovered traps
  (`expect_failure` vacuous pass, generated Starlark as a string).

Wave-4b measurements and follow-ups folded in by this revision:

- [bazel-measurements/buildifier-gate-reach-and-generated-starlark.md](bazel-measurements/buildifier-gate-reach-and-generated-starlark.md) —
  the real runner script and its exit-123 semantics, `.bazelignore` reach, the
  `positional-args` file-type gate, the full exit-code matrix, the `buildifier_test`
  false-pass, `unsorted-dict-items`'s measured cost, and the three-way comparison that
  settles how to validate generated Starlark. Bazel 8.7.0 only.
- [bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md) —
  `depset + depset` as a hard error on both majors, bare-rule autoload on 8.7.0 versus 9.2.0
  with the two error shapes, and the per-version flag-default table
  (`--incompatible_autoload_externally`, `--max_computation_steps`). Bazel 8.7.0, 8.8.0, 9.2.0.
- [bazel-followups/repository-rule-and-extension-offline-testing.md](bazel-followups/repository-rule-and-extension-offline-testing.md) —
  the harness-`rule()` plus `analysistest.make(expect_failure = True)` technique verified on
  both majors, and the `unittest.make()` negative control that makes BZL-LARK-24's third check
  re-runnable.
- [bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md) —
  the execlog parser/converter flag split, the "persistent action cache is never logged"
  contract that changes how BZL-LARK-16's empty output reads, and the `--starlark_cpu_profile`
  backstop for BZL-LARK-07/17.

Wave-5 measurements folded in by this revision:

- [bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md](bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md) —
  the whole buildifier gate re-run under Bzlmod-only Bazel 9.2.0 at the fleet's `buildifier_prebuilt`
  8.2.0.2 pin (same runner shape, same reach, same exit 123, same 4-cell matrix), the
  `buildifier_test` false-pass reproduced there, and the `runner.bash.template` tag walk that dates
  the two fixes to 8.5.1.3 and 8.5.1.4. Bazel 8.7.0 and 9.2.0. (Its cache, tag and visibility
  sections belong to BZL-CACHE, BZL-TEST and BZL-ARCH.)
- [bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md](bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md) —
  Q2: four semantically-wrong-but-parseable generated-Starlark fixtures against buildifier,
  `bazel query` and `bazel build --nobuild` on both majors; the compile-phase / init-phase split;
  the unconsumed-generator result that makes BZL-LARK-25 load-bearing. (Q1 and Q3 belong to
  BZL-ARCH and BZL-MOD.)
- [bazel-measurements/hermeticity-second-half-mounts-tool-args-and-globs.md](bazel-measurements/hermeticity-second-half-mounts-tool-args-and-globs.md) —
  listed for provenance only. Its Q4 settles `constant-glob` versus
  `--incompatible_disallow_empty_glob` as disjoint checks; that finding is BZL-HERM-19's, and no row
  in this family mentions `constant-glob`, so nothing was folded here.

## Key sources

| URL | Why it is here |
|---|---|
| [Starlark language specification](https://github.com/bazelbuild/starlark/blob/master/spec.md) | The only normative source for the statement-position rule, dict/set insertion order, and the reserved-but-unimplemented keywords. Settles that these are language facts, not Bazel behaviour. |
| [`buildtools/WARNINGS.md`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md) | The warning catalogue: exact category names, autofix status, the "not supported" markers, and the flag column whose staleness is itself a finding. |
| [`buildtools/warn/warn.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/warn/warn.go) | Ground truth for which warnings exist (99) and which is off by default (`nonDefaultWarnings`, one key). Documentation drifts; this does not. |
| [`buildtools/warn/warn_bazel.go`](https://raw.githubusercontent.com/bazel-contrib/buildtools/main/warn/warn_bazel.go) | `positionalArgumentsWarning` at `:178` — the `f.Type != build.TypeBuild` early return and the `*build.Ident` type assertion that together scope BZL-LARK-09. |
| [`buildtools/buildifier/buildifier.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/buildifier/buildifier.go) | The exit-code logic that settles the gate question: `exitCode = 4` from the lint step, before the mode switch. |
| [`keith/buildifier-prebuilt` runner template](https://raw.githubusercontent.com/keith/buildifier-prebuilt/main/buildifier/runner.bash.template) | The script that actually runs: `find . -print \| xargs buildifier` under `set -euo pipefail`, the `exclude_patterns` → `\! -path` expansion, and the `${WORKSPACE+x}` test behind `buildifier_test`'s false-pass. Read the generated copy under `bazel-bin`, not only the template. |
| [`AutoloadSymbols.java` at `release-9.0.0`](https://github.com/bazelbuild/bazel/blob/release-9.0.0/src/main/java/com/google/devtools/build/lib/packages/AutoloadSymbols.java) | The symbol-to-`load()` mapping Bazel 9 removed from the global namespace. No prose page enumerates it, and buildifier's `native-*` families lag it for `py_*`/`sh_*`. |
| [`bazel.build/extending/macros`](https://bazel.build/extending/macros) | Symbolic-macro reference: naming schema, restrictions, visibility model, `inherit_attrs`, and the standing "lazy evaluation is not available yet" statement. |
| [`bazel.build/extending/rules`](https://bazel.build/extending/rules) | The action/provider boundary that decides rule-versus-macro, the deprecated runfiles list, and the legacy-provider migration section whose staleness is a documented trap. |
| [`bazel.build/rules/performance`](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/performance.md) | `to_list()`'s O(N²) cost with the "safe at top-level" myth named explicitly, the overly-nested-depset shape, and `ctx.actions.args()` as the fix. |
| [`bazel.build/extending/depsets`](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/depsets.md) | The three named traversal orders and the exact `default`-order guarantee — deterministic, not stable across graph edits. |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Dated, normative: legacy struct providers removed, `--incompatible_autoload_externally` empty by default, computation-step limits in symbolic macros. |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | Symbolic macros' announcement, including "compatible with lazy evaluation (not implemented yet)" at ship time, and the still-unflipped struct-provider flag. |
| [Versioned `macros.md` at tag 8.0.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.0.0/site/en/extending/macros.md) + [PR #24280](https://github.com/bazelbuild/bazel/pull/24280) | The decisive evidence that `inherit_attrs` predates the 9.0.0 bullet — and the worked example behind BZL-LARK-28. |
| [`bazel-skylib/lib/unittest.bzl` at tag 1.9.0](https://github.com/bazelbuild/bazel-skylib/blob/1.9.0/lib/unittest.bzl#L541-L560) | `_expect_failure`'s `str.find` implementation — the only source that reveals the vacuous-pass mechanism. Nothing upstream documents the consequence. Pinned to the tag `rules_ocx` actually depends on. |
| [Tweag, "Migrating to Bazel symbolic macros" (2025-11-20)](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/) | Every exact porting error string in BZL-LARK-19/20/21, from runnable examples. The most recent primary-adjacent source in the corpus. |
| [`bazel.build/build/style-guide`](https://bazel.build/build/style-guide) + [`bazel.build/rules/bzl-style`](https://bazel.build/rules/bzl-style) | The two guides behind BZL-LARK-14 and the ~45-50 items with no mechanical check — the reason "buildifier passed" is not "compliant". |
| [`src/tools/execlog/README.md` at 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/tools/execlog/README.md) | The exact command pair that diffs two builds' action arguments — BZL-LARK-16's verification — and the parser/converter flag split. |
| [`src/main/protobuf/spawn.proto` at 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/spawn.proto) | The `SpawnExec` comment stating that spawns whose owning action hits the persistent action cache are never reported — why an empty execlog diff can read inconclusive. |
