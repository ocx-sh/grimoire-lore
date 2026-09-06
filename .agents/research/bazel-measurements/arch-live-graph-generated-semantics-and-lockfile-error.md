---
title: "Live-graph macro/aspect arithmetic, the generated-Starlark semantic boundary, and the --lockfile_mode=error crash shape"
slug: arch-live-graph-generated-semantics-and-lockfile-error
agent: measurement-wave-5
model: sonnet
date_measured: 2026-09-06
bazel_versions: ["8.7.0", "9.2.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2, not a CI runner)"
affects_rule_ids:
  - BZL-ARCH-30
  - BZL-LARK-30
  - BZL-LARK-25
  - BZL-LARK-26
  - BZL-MOD-02
answers:
  - "bazel-architecture-monorepo.md § Open questions › Deserves another research round › BZL-ARCH-30's verification on a live graph"
  - "bazel-starlark-and-build.md § Open questions › Deserves another research round › generated-starlark-semantic-check"
  - "bazel-bzlmod-and-repo-rules.md, Verdict 17 / the measurement wave's block 4 — the follow-on named in the row's Affects cell (\"root cause not isolated, no upstream issue found\")"
---

# Live-graph macro/aspect arithmetic, the generated-Starlark semantic boundary, and the --lockfile_mode=error crash shape

**Host caveat (stated once):** WSL2, kernel `6.18.33.2-microsoft-standard-WSL2`, not a CI
runner; spawn strategy `linux-sandbox` where any action ran (Q1's `bazel test`). Network to
`bcr.bazel.build` and `github.com` (for the `gh api` search in Q3) was available throughout.
No fleet repository (`rules_ocx` included) was modified — all Bazel invocations ran against
either a fresh scratch module or a `git archive HEAD` copy of `rules_ocx` under the scratch
root named below.

## Table of contents

- [Environment](#environment)
- [Q1: Macro vs aspect on a live graph](#q1-macro-vs-aspect-on-a-live-graph)
- [Q2: Generated Starlark, semantic half](#q2-generated-starlark-semantic-half)
- [Q3: --lockfile_mode=error crash, isolated](#q3---lockfile_modeerror-crash-isolated)
- [Not settled](#not-settled)
- [Re-run](#re-run)
- [Scratch left on disk](#scratch-left-on-disk)

## Environment

```
$ free -g
               total    used    free  shared  buff/cache  available
Mem:              31      14       0       0          16          16
$ nproc
32
$ uname -a
Linux Workstation 6.18.33.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun 18 21:54:43 UTC 2026 x86_64 GNU/Linux
$ df -h /home/mherwig/.cache
/dev/sdd  1007G  247G  710G  26% /
```

All invocations: `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk
--output_user_root=/home/mherwig/.cache/bazel-measure-scratch/arch-live-graph-generated-semantics-and-lockfile-error/out
<args>`, with `USE_BAZEL_VERSION` set per invocation. A wrapper (`run.sh`, listed under
Re-run) fixed the flags and printed `EXITCODE=$?` after every call. **Shell trap recorded for
future re-runs:** in zsh, an unbraced `"//$var:all"` is parsed as the `:a` (absolute-path)
history modifier applied to `$var`, silently producing a bogus target label
(`///abs/cwd/path/consumer_all`) with no shell error. `"//${var}:all"` avoids it; every
command below uses the braced form.

## Q1: Macro vs aspect on a live graph

### Protocol

Scratch module `q1` (Bzlmod, no other deps beyond `rules_shell`), two variants of the same
five one-package target graph (`pkgs/p1`..`p5`, each holding one `filegroup`):

- **Variant A (`q1/macro`):** `pkgs/pN/BUILD.bazel` calls a legacy macro,
  `legacy_wrap(name="lib", srcs=["file.txt"])`, defined in `tools/defs.bzl`, which emits three
  rules per call: the `filegroup` itself, an `sh_test` lint target, and a `genrule` docs
  target.
- **Variant B (`q1/base` + `--aspects`):** `pkgs/pN/BUILD.bazel` declares only the plain
  `filegroup`. The same lint is an `aspect` (`lint_aspect` in the same `tools/defs.bzl`)
  writing one report file per target into an `OutputGroupInfo(lint_report = ...)`, applied via
  `--aspects=//tools:defs.bzl%lint_aspect --output_groups=lint_report` on the command line —
  no BUILD-file change.

Measured on 8.7.0 and 9.2.0: `query //...`, `query 'tests(//...)'`, `bazel test //...`, a
`query //...` diff between the wrapped/unwrapped and aspect-flag/no-flag trees, and repeated
(warm-server, 3rd-run) `build --nobuild` timings as a proxy for analysis cost.

### Raw result

**First attempt broke on 9.2.0**, and the break is itself load-bearing evidence: the macro's
`native.sh_test(...)` call failed with `Error: no native function or rule 'sh_test'` — this is
`--incompatible_autoload_externally` defaulting empty at 9.0.0 (frame correction, Wave 1 #2),
hit for the first time here against a live legacy-macro fixture rather than read from docs.
Fixed by adding `bazel_dep(name = "rules_shell", version = "0.8.0")` and
`load("@rules_shell//shell:sh_test.bzl", "sh_test")` in the macro's `.bzl` — after which both
majors behave identically:

```
$ bazelisk query '//...'            # q1/base, both 8.7.0 and 9.2.0
//pkgs/p1:lib
//pkgs/p2:lib
//pkgs/p3:lib
//pkgs/p4:lib
//pkgs/p5:lib
EXITCODE=0                          # 5 targets

$ bazelisk query '//...'            # q1/macro, both 8.7.0 and 9.2.0
//pkgs/p1:lib
//pkgs/p1:lib_docs
//pkgs/p1:lib_lint_test
... (×5 packages)
EXITCODE=0                          # 15 targets

$ bazelisk query 'tests(//...)'     # q1/base
EXITCODE=1                          # empty (grep -c reports 0 matches → exit 1)

$ bazelisk query 'tests(//...)'     # q1/macro
//pkgs/p1:lib_lint_test
... (×5)
EXITCODE=0                          # 5 test targets

$ bazelisk test '//...'             # q1/base, both versions
ERROR: No test targets were found, yet testing was requested
EXITCODE=4

$ bazelisk test '//...'             # q1/macro, both versions
Executed 5 out of 5 tests: 5 tests pass.
EXITCODE=0

$ diff <(bazelisk query '//...' # q1/base) <(bazelisk query '//...' # q1/macro)
1a2,3
> //pkgs/p1:lib_docs
> //pkgs/p1:lib_lint_test
... (×5 packages, 10 lines added, 0 removed)
diff exit=1                         # non-empty, as expected

$ bazelisk cquery '//...'                                                            # q1/base
$ bazelisk cquery '//...' --aspects='//tools:defs.bzl%lint_aspect' --output_groups=lint_report
# both: identical 5-line //pkgs/pN:lib list, both exit 0, both "Found 5 targets..."
# the --aspects run's summary line differs only in an added counter:
# "...16 targets configured, 5 aspect applications)."
```

`bazel build //... --aspects=... --output_groups=lint_report` on `q1/base` (8.7.0) produced
real artifacts with **zero** new query-visible labels:

```
$ find bazel-bin -iname '*lint_report*'
bazel-bin/pkgs/p1/lib.lint_report.txt
bazel-bin/pkgs/p2/lib.lint_report.txt
bazel-bin/pkgs/p3/lib.lint_report.txt
bazel-bin/pkgs/p4/lib.lint_report.txt
bazel-bin/pkgs/p5/lib.lint_report.txt
```

Repeated (3rd-run, warm-server) `build --nobuild '//...'` wall-clock, both versions:
`q1/base` ≈ 0.06–0.07 s, `q1/base` **+aspect flag** ≈ 0.05–0.08 s (statistically
indistinguishable from no-aspect), `q1/macro` ≈ 0.09–0.10 s. At this toy scale (5–15 trivial
targets) the gap between macro and base/aspect is real but small and dominated by the extra
10 targets to configure, not by any mechanism specific to macros vs. aspects; `--profile`'s
JSON trace on both versions merges loading and analysis into one Skymeld-era phase marker
("Load, analyze dependencies and build artifacts", no `dur` field), so a classic
loading-vs-analysis time split is not extractable from the profile at all on 8.7.0 or 9.2.0 —
consistent with the measurement wave's Skymeld-default-true finding, not a new claim.

### Verdict

**Confirmed, both 8.7.0 and 9.2.0, exactly as BZL-ARCH-30 states the arithmetic:** the legacy
macro adds exactly **+2 targets per wrapped target** to the query graph beyond the wrapped
target's own label (10 new labels for 5 macro calls — the "+3 rules per call" in the
consolidation's own count includes the base target itself, which does not change identity;
the *net new* label count is 2 per call), while the aspect adds **zero** new query-visible
targets under any invocation, `--aspects` flag or not — its output is reachable only through
`--output_groups` on a real build, never through `bazel query`/`cquery`'s label list. The
exact verifying query BZL-ARCH-30 should cite:

```
diff <(bazel query '//...' --output=label) <(bazel query '//...' --output=label)
#     ^ tree without the macro applied           ^ same tree, targets wrapped by the macro
# PASS condition for "the macro changed the graph": diff is non-empty.

diff <(bazel cquery '//...' --output=label) \
     <(bazel cquery '//...' --output=label --aspects='<label>%<aspect>' --output_groups=<group>)
# PASS condition for "the aspect did NOT change the graph": diff is empty.
```

(`cquery`, not plain `query`, for the aspect side — plain `query` does not accept `--aspects`
at all, `Unrecognized option`, confirmed live on both majors; that flag is `build`/`cquery`
only.) One genuine new finding beyond the commissioned arithmetic: a legacy macro that uses
any autoloaded native rule (`sh_test` here; the same applies to `cc_*`/`java_*`/`py_*`/
`proto_library`) silently breaks under bare `native.<rule>()` on Bazel 9.0.0+ and needs an
explicit ruleset `load()` — a real migration cost specific to variant A that variant B (an
aspect touching no native rule symbols) never pays.

### Affects

- **BZL-ARCH-30**: **confirms**, on a live graph for the first time (the open question's own
  words: "neither has been run against a real adopted target graph"). The stated arithmetic
  (macro adds N targets, aspect adds 0) holds unchanged across 8.7.0 and 9.2.0. The rule's
  verification should be tightened to the two-line `diff`/`cquery` pair above, with `cquery`
  named explicitly for the aspect side (a reader trying plain `query --aspects=` will hit
  `Unrecognized option`, not silence).
- Not itself a rule row, but worth folding into whichever rule documents Bazel-9 macro
  migration: a legacy macro that emits an autoloaded native rule (`sh_test`, `cc_library`,
  `py_binary`, ...) needs an explicit ruleset `load()` before it works on 9.0.0+; this was
  reproduced live rather than reasoned from the autoload correction already on record.

## Q2: Generated Starlark, semantic half

### Protocol

Scratch module `q2` (`bazel_dep`s: `bazel_skylib` 1.9.0, `buildifier_prebuilt` 8.2.0.2 as
`dev_dependency`). A repository rule (`gen_repo`, invoked via `use_repo_rule` directly in
`MODULE.bazel` — no module-extension boilerplate, same technique the prior wave's
`buildifier-gate-reach-and-generated-starlark.md` Q5(b) used) materializes a `BUILD.bazel` and
an `out.bzl` per repo from checked-in fixture files, standing in for any generator (genrule,
custom repo rule) whose Starlark content isn't fixed until generation time. Four semantically
wrong, syntactically valid fixtures, each with a one-line consumer package that `load()`s the
generated file:

- **(a)** a top-level call to an undefined function; **(a2)** the same undefined-function
  reference, but buried inside a function body that is *never called* (tests whether the
  resolver is static or lazy);
- **(b)** `load()`s a nonexistent symbol from a real module (`@bazel_skylib//lib:paths.bzl`),
  unused after import; **(b2)** the same, but the loaded symbol *is* used (isolates whether
  buildifier's hit in (b) is a "nonexistent symbol" catch or an "unused load" coincidence);
- **(c)** `rule(attrs = {"x": attr.string(default = 123)})` — an int default on a string attr;
- **(d)** a *BUILD* file (not `.bzl`) with the same target `name` declared twice.

Each run through: the raw `buildifier -mode=check -lint=warn` binary (extracted from
`bazel run @buildifier_prebuilt//:buildifier -- --version`'s resolved path) directly on the
fixture text; `bazel query //<consumer>:all`; `bazel build --nobuild //<consumer>:all`; and,
for (d), `bazel query @gen_d//:all` (no consumer needed — the defect is in the generated
package's own `BUILD.bazel`). All four re-run on 9.2.0 to check for cross-major drift.

### Raw result

Buildifier, **first pass included a confound**: every fixture without a module docstring
picked up an unrelated `module-docstring` finding, making every cell exit 4 regardless of the
real defect. Re-run with a docstring added to isolate the true signal:

```
$ buildifier -mode=check -lint=warn bzl_a.txt   ; echo exit=$?     # (a)  undefined fn, called
exit=0
$ buildifier -mode=check -lint=warn bzl_a2.txt  ; echo exit=$?     # (a2) undefined fn, dead code
exit=0
$ buildifier -mode=check -lint=warn bzl_b.txt   ; echo exit=$?     # (b)  bad load, unused
bzl_b.txt:3: load: Loaded symbol "totally_bogus_symbol" is unused. Please remove it.
exit=4
$ buildifier -mode=check -lint=warn bzl_b2.txt  ; echo exit=$?     # (b2) bad load, used
exit=0
$ buildifier -mode=check -lint=warn bzl_c.txt   ; echo exit=$?     # (c)  bad attr default
exit=0
$ buildifier -mode=check -lint=warn build_dup.txt ; echo exit=$?   # (d) duplicate BUILD name
build_dup.txt:3: duplicated-name: A rule with name "dup" was already found on line 1. ...
exit=4
```

Bazel's own loading phase, both majors identical (8.7.0 shown; 9.2.0 re-run produced the same
error text, same "compilation"/"initialization" phase word, same exit codes throughout):

```
$ bazelisk query '//consumer_a:all'             # (a) top-level undefined-function call
ERROR: .../out.bzl:4:12: name 'some_undefined_function' is not defined
ERROR: error loading package 'consumer_a': compilation of module 'out.bzl' failed
EXITCODE=7

$ bazelisk query '//consumer_a2:all'            # (a2) same, but inside dead code
ERROR: .../out.bzl:2:12: name 'some_undefined_function' is not defined
ERROR: error loading package 'consumer_a2': compilation of module 'out.bzl' failed
EXITCODE=7                                       # identical — the resolver is static, not lazy

$ bazelisk query '//consumer_b:all'             # (b)/(b2) bad load — same result either way
ERROR: Error: file '@bazel_skylib//lib:paths.bzl' does not contain symbol 'totally_bogus_symbol'
ERROR: error loading package 'consumer_b': initialization of module 'out.bzl' failed
EXITCODE=7

$ bazelisk query '//consumer_c:all'             # (c) invalid attr default type
ERROR: Error in string(): parameter 'default' got value of type 'int', want 'string'
ERROR: error loading package 'consumer_c': initialization of module 'out.bzl' failed
EXITCODE=7

$ bazelisk query '@gen_d//:all'                 # (d) duplicate BUILD target name, no consumer
ERROR: Error in filegroup: filegroup rule 'dup' conflicts with existing filegroup rule...
ERROR: package contains errors: ...
EXITCODE=7

$ bazelisk build --nobuild '//consumer_a:all'   # every one of (a),(a2),(b),(b2),(c) and
...same ERROR text, "error loading package ... failed"...                    (d) via @gen_d
EXITCODE=1                                       # build --nobuild: exit 1, not 7 (query's own)
```

`bazel query @gen_a//:all` (the generated repo's own, empty `BUILD.bazel`, which never
`load()`s `out.bzl`) returns `INFO: Empty results`, exit 0 — **no check anywhere fires until
something actually `load()`s the generated file.** A generator that writes a broken `.bzl`
nobody consumes is invisible to every column in the table below.

### Verdict

| Defect | buildifier `-mode=check` | `query` | `build --nobuild` | Phase (Bazel's own error text) |
|---|---|---|---|---|
| (a) undefined function, called at top level | **No** (exit 0; blind to name resolution) | **Yes**, exit 7 | **Yes**, exit 1 | `compilation of module` — static resolver, before any code runs |
| (a2) undefined function, referenced only in dead code | **No** (exit 0) | **Yes**, exit 7 — identical to (a) | **Yes**, exit 1 | `compilation of module` — same phase; the resolver is static and checks every name in the file, called or not |
| (b)/(b2) `load()`s a nonexistent symbol | **No** for the real defect — (b)'s exit-4 hit is an unrelated "unused load" style warning that vanishes the moment the symbol is used (b2, exit 0); buildifier has no way to know whether a `load()`ed label actually exports a name | **Yes**, exit 7, both variants identical | **Yes**, exit 1 | `initialization of module` — the `load()` statement is validated when the top-level statements execute, one phase later than (a)'s pure name resolution |
| (c) `attr.string(default = 123)` | **No** (exit 0; buildifier never evaluates `attr.*`/`rule()` calls) | **Yes**, exit 7 | **Yes**, exit 1 | `initialization of module` — same phase as (b): the type check inside the `string()` builtin fires only when that call actually executes |
| (d) duplicate target name in a *BUILD* file | **Yes** — a dedicated, purpose-built `duplicated-name` lint, exit 4, real detection | **Yes**, exit 7 | **Yes**, exit 1 | package construction (not a `.bzl` "module" error at all — the BUILD file's own top-level execution) |

This gives BZL-LARK-30's boundary a precise shape rather than the reasoned "loading catches
syntax, not meaning" it started from: **Bazel's own loader catches all four semantic defects
tested here, every time, at exactly the same reliability as a syntax error** — because in
every case the defect is only reachable through Starlark's own compile/execute machinery
(name resolution or top-level statement execution), which `query`/`build --nobuild`/any real
build all share. There are two distinct sub-phases inside "loading", visible in Bazel's own
error text and worth naming precisely: **compile-phase** errors (undefined names — caught by
static resolution, unconditionally, even in code that never runs) and **init-phase** errors
(a bad `load()` target, a bad builtin-function argument — caught only when the top-level
statement that triggers them actually executes). Buildifier is blind to every one of the three
`.bzl`-content defects (a, a2, b/b2, c) — it never evaluates Starlark, only parses and lints
its syntax tree — and its one real catch here (d) is possible only because a duplicate `name=`
across top-level BUILD calls is itself a purely syntactic, AST-visible fact requiring no
execution. The one true blind spot that survives all four columns: **nothing fires until a
`load()` (or, for (d), a package evaluation) actually happens** — a generator that never gets
consumed leaves its defect permanently undetected by every mechanism measured here.

### Affects

- **BZL-LARK-30**: **promotes**, from a reasoned boundary to a measured one, per the open
  question's own framing ("would turn the documented gap... into a measured one"). The rule
  should state the two named sub-phases (compile vs. init) rather than a single "loading
  phase" bucket, and should state plainly that `query` and `build --nobuild` are equally
  sufficient — no ceremony beyond a one-line consumer package is needed to catch any of these
  four shapes, on either 8.7.0 or 9.2.0.
- **BZL-LARK-25** ("at least one test that builds a target out of the generated repository"):
  **confirms** the requirement is load-bearing — Q2's `@gen_a//:all` empty-result result is
  the direct demonstration of why: without a consuming target, none of these four defects is
  ever caught.
- **BZL-LARK-26** ("pipe a rendered sample through `buildifier -mode=check`"): **demotes**,
  narrowly. The rule should not imply buildifier adds semantic coverage beyond formatting/lint
  style — for three of four defect shapes tested here it is provably blind, and its one hit
  (b, unused-load) is coincidental to the fixture's shape, not a "does this symbol exist"
  check. It remains valuable for exactly what it catches (style, format, and the small set of
  purpose-built structural lints like `duplicated-name`), not as a substitute for BZL-LARK-25.

## Q3: --lockfile_mode=error crash, isolated

### Protocol

Four `git archive HEAD` copies of `rules_ocx` (never the real checkout). Two crash-repro
copies mirror the prior wave's fixture exactly: bump `bazel_dep(name = "bazel_skylib",
version = "1.9.0")` → `"1.7.1"` without touching `MODULE.bazel.lock` (on 9.2.0, the lock was
first regenerated under 9.2.0 — `lockFileVersion` 28 — so the bump isn't confounded with a
schema mismatch). Two new copies isolate part (c): add a **brand-new** `bazel_dep(name =
"rules_python", version = "2.3.3")` — a module `rules_ocx` never depended on before — leaving
the lock otherwise untouched, on both majors. Run `bazel mod deps --lockfile_mode=error`
directly (no build) in every case; add `--registry=https://bcr.bazel.build` explicitly on one
run to test part (b); search `bazelbuild/bazel` issues via `gh api` for the exact exception
text to close part of the "no upstream issue found" gap the prior wave left open.

### Raw result

**(a) `mod deps --lockfile_mode=error` alone, no build, existing-dep version bump —
crashes identically to the prior wave's `build --nobuild` result:**

```
$ bazelisk mod deps --lockfile_mode=error          # 8.7.0, bazel_skylib bumped 1.9.0→1.7.1
FATAL: bazel crashed due to an internal error. Printing stack trace:
java.lang.RuntimeException: Unrecoverable error while evaluating node
  'Key[moduleName=bazel_skylib, registryUrl=https://bcr.bazel.build/]' ...
Caused by: java.lang.IllegalStateException: Cannot fetch a file without a checksum in
  ENFORCE mode. This is a bug in Bazel, please report at
  https://github.com/bazelbuild/bazel/issues/new/choose.
  ... IndexRegistry.getYankedVersions ... YankedVersionsFunction.compute ...
EXITCODE=37
```

Reproduced identically on 9.2.0 against the freshly-regenerated `lockFileVersion` 28 lock —
same stack, same cause, `EXITCODE=37`.

**(b) explicit `--registry=https://bcr.bazel.build` changes nothing:**

```
$ bazelisk mod deps --lockfile_mode=error --registry=https://bcr.bazel.build
FATAL: bazel crashed due to an internal error. ...  (byte-identical cause/trace)
EXITCODE=37
```

**(c) a lock stale only from a *new* `bazel_dep` (no version bump of anything existing) —
produces the clean, named diagnostic on both majors:**

```
$ bazelisk mod deps --lockfile_mode=error          # 8.7.0, rules_python 2.3.3 newly added
ERROR: Missing checksum for registry file https://bcr.bazel.build/modules/rules_python/2.3.3/MODULE.bazel
  not permitted with --lockfile_mode=error. Please run `bazel mod deps --lockfile_mode=update`
  to update your lockfile.
EXITCODE=37

$ bazelisk mod deps --lockfile_mode=error          # 9.2.0, same new-dep shape, lock@28
ERROR: Missing checksum for registry file https://bcr.bazel.build/modules/rules_python/2.3.3/MODULE.bazel
  not permitted with --lockfile_mode=error. Please run `bazel mod deps --lockfile_mode=update`
  to update your lockfile.
EXITCODE=37
```

**(d) 8.7.0 for the new-dep shape** is shown above (identical message, identical exit) —
symmetric with 9.2.0.

**Upstream search**, `gh api -X GET search/issues -f q='repo:bazelbuild/bazel "Cannot fetch a
file without a checksum in ENFORCE mode"'`: **3 hits**, closing the prior wave's "no upstream
issue found" gap.

- **[bazelbuild/bazel#29497](https://github.com/bazelbuild/bazel/issues/29497)** — "Bazel
  crashes when using --lockfile_mode=error and downgrading bazel_dep version" — the exact
  scenario reproduced here (an existing dep's version changes, lock left stale). Closed
  2026-07-29. Bazel maintainer `fmeum`'s diagnosis, quoted in full because it is the actual
  root cause this wave's prior "not isolated" note left open: *"When module versions change,
  Bazel may fetch yanked versions, which can't be pinned down by hashes. But that's not
  allowed in `error` mode, which means that we should probably ensure `metadata.json` isn't
  fetched in that situation."* Fixed by
  [PR #30315](https://github.com/bazelbuild/bazel/pull/30315) ("Avoid fetching yanked metadata
  in error mode", the commit that closed #29497), backported **only** to the 9.3.0 release
  branch via [PR #30512](https://github.com/bazelbuild/bazel/pull/30512) (merged
  2026-07-30, base `release-9.3.0`).
- **[bazelbuild/bazel#29146](https://github.com/bazelbuild/bazel/issues/29146)** ("[8.6.0]
  Cannot fetch a file without a checksum in ENFORCE mode", **open**) — the original report,
  independently confirmed by another reporter on 9.1.1 in-thread. On 2026-07-22, `iancha1992`
  asked "Is this a fix we must add in Bazel 8?"; `fmeum` answered **"No, I think it's okay to
  miss if we don't get to it"** — an explicit maintainer decision that the Bazel-8 line will
  not receive this fix.
- **[bazelbuild/bazel#29188](https://github.com/bazelbuild/bazel/issues/29188)** ("[8.8.0]
  Cannot fetch a file without a checksum in ENFORCE mode", **open**, forked from #29146) — the
  8.8.0-specific tracking fork, still open.

Both pinned majors in this program (8.7.0, 9.2.0) predate the fix version (9.3.0).

### Verdict

The prior wave's crash is confirmed exactly (same trigger, same trace, same exit 37) and now
fully root-caused with a named, cited upstream defect rather than left as "not isolated": the
crash is specific to **an existing `bazel_dep`'s locked version changing** (bump *or*
downgrade — #29497 was filed against a downgrade, this wave's fixture is a bump, both crash
identically), because resolving a changed version needs to check yanked-version metadata via
an unchecksummed fetch, which `ENFORCE`/`--lockfile_mode=error` categorically forbids. This
is a real, still-open Bazel defect on the 8.x line (maintainer-confirmed "won't fix"), fixed
only from 9.3.0 onward. Neither `mod deps` running standalone (a) nor an explicit `--registry`
(b) changes anything — the crash triggers inside module resolution itself, before any registry
selection logic a user-supplied `--registry` flag could redirect.

**The clean, named, documented lockfile diagnostic BZL-MOD-02 assumes does exist — but only
for a narrower staleness shape than "any stale lock": a lock that is stale purely because
MODULE.bazel gained a *dependency it did not have before*.** That shape never reaches
`YankedVersionsFunction` (a brand-new module has no "previous locked version" to compare
against for yanked-status purposes) and fails instead through the older, already-handled
missing-checksum-for-a-named-file path, producing exactly the message Verdict 2 describes,
on both 8.7.0 and 9.2.0 alike. BZL-MOD-02's own verification ("gate on the exit code, never a
matched stderr string") is now doubly justified: exit 37 is common to *both* failure shapes,
but the two shapes' stderr text has zero overlap, so a CI gate that keys on the exit code
catches both a version bump (crash) and a new dependency (clean message) uniformly, while any
stderr-matching gate would need to special-case both texts or match neither.

### Affects

- **BZL-MOD-02**: **confirms and closes the wave's own follow-on**, exactly the ask recorded
  in the prior wave's own row ("Worth a follow-on: file or find the upstream Bazel issue...").
  Root cause named (yanked-version metadata fetch during version resolution, forbidden under
  ENFORCE mode); upstream issues cited (#29497 closed/fixed, #29146 and #29188 open,
  Bazel-8 fix explicitly declined by a maintainer); the fix version named (9.3.0, later than
  both of this program's pinned majors). The rule's own verification is unchanged and now has
  a second, positive-path confirmation: the "clean lockfile-mismatch message" it documents is
  real and reproducible — for a new-dependency addition, not for a version change of an
  existing one. A rule author citing "the clean message" as the crash's behavior for *any*
  staleness shape would now be wrong in a specifically named, sourced way.

## Not settled

- **Q1's `--profile` timing comparison is noise-dominated at this fixture's scale.** Five to
  fifteen trivial targets configure in well under a tenth of a second on this host; the
  macro-vs-aspect wall-clock gap (0.09s vs 0.06s, 3rd-run) is real but too close to the
  measurement's own jitter to generalize past "aspects add no *target-count* cost; their
  analysis cost at fleet scale is a separate, unmeasured question." Bazel's own `--profile`
  cannot separate loading from analysis time on either pinned version (Skymeld merges the
  phase marker) and `bazel analyze-profile` is gone from 9.0.0 onward, so a cleaner timing
  split would need the raw event-level `traceEvents` array parsed by hand — not attempted
  here.
- **Q2 did not test a fifth semantic shape the consolidation's own text also names**: "a
  `filegroup` with a nonexistent kwarg" as a BUILD-level (not `.bzl`-level) semantic defect,
  distinct from the duplicate-name case actually tested. Expected, by the same reasoning as
  (c), to fail at package-construction time with a `TypeError`-shaped message and to be
  equally invisible to buildifier — not measured directly.
- **Q3's root cause is now named, but the exact Skyframe reason a *new* dependency's version
  resolution skips the yanked-versions check** (rather than merely "isn't a version change")
  was read from the maintainer's one-sentence comment on #29497, not traced through
  `BazelModuleResolutionFunction`/`YankedVersionsFunction` source directly. Sufficient to
  state the observed behavior and its cause with confidence; a source-level trace would be
  the next increment if a rule ever needs to state *which* Bazel internals to patch or watch.
- **9.3.0 itself was not installed or tested** — the fix's existence and target branch are
  taken from the closed issue, the merged PR, and its base ref (`release-9.3.0`), not from a
  live run against a 9.3.0 binary.

## Re-run

```bash
SC=/home/mherwig/.cache/bazel-measure-scratch/arch-live-graph-generated-semantics-and-lockfile-error
mkdir -p "$SC"
cat > "$SC/run.sh" <<'RUNNER'
#!/bin/bash
set -uo pipefail
SC=/home/mherwig/.cache/bazel-measure-scratch/arch-live-graph-generated-semantics-and-lockfile-error
V="$1"; shift; WD="$1"; shift; [ "$1" = "--" ] && shift
cd "$WD"
USE_BAZEL_VERSION="$V" ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root="$SC/out" "$@"
echo "EXITCODE=$?"
RUNNER
chmod +x "$SC/run.sh"

# Q1: five-package scratch module, legacy-macro variant (tools/defs.bzl: legacy_wrap,
# +rules_shell 0.8.0 dep for sh_test's Bazel-9 autoload) vs. plain-filegroup variant
# (same tools/defs.bzl: lint_aspect). See Raw result for the exact query/cquery/test
# invocations; both variants are five one-line BUILD files plus one shared tools/defs.bzl.

# Q2: scratch module `q2`, one repository_rule (rules.bzl:gen_repo, use_repo_rule'd
# directly in MODULE.bazel) materializing a BUILD.bazel/out.bzl pair per repo from
# checked-in fixture .txt files (bzl_a/a2/b/b2/c.txt, build_dup.txt), one one-line
# consumer package per fixture. buildifier binary resolved via:
"$SC/run.sh" 8.7.0 "$SC/q2/m" -- run '@buildifier_prebuilt//:buildifier' -- --version
# then run the printed bazel-bin symlink target directly, or `bazel run ... -- <args>`.

# Q3:
git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C "$SC/q3/rules_ocx_87"
sed -i 's/bazel_skylib", version = "1.9.0"/bazel_skylib", version = "1.7.1"/' \
  "$SC/q3/rules_ocx_87/MODULE.bazel"                       # (a)/(b) fixture
"$SC/run.sh" 8.7.0 "$SC/q3/rules_ocx_87" -- mod deps --lockfile_mode=error
# (c)/(d): same archive technique, instead insert a brand-new bazel_dep (e.g. rules_python
# 2.3.3) after the existing bazel_skylib/platforms deps, leave the lock untouched.
gh api -X GET search/issues -f q='repo:bazelbuild/bazel "Cannot fetch a file without a checksum in ENFORCE mode"'
```

`bazelisk shutdown` was run for every workspace × version combination used above
(`q1/base`, `q1/macro`, `q2/m`, `q3/rules_ocx_87`, `q3/rules_ocx_92`,
`q3/rules_ocx_87_newdep`, `q3/rules_ocx_92_newdep` × 8.7.0, 9.2.0) before this artifact was
written.

## Scratch left on disk

```
$ du -sh /home/mherwig/.cache/bazel-measure-scratch/arch-live-graph-generated-semantics-and-lockfile-error
827M
```

Almost entirely the shared `--output_user_root` (`out/`, 820M — repository cache plus one
output base per workspace×version pair); the fixture trees themselves total under 7M
(`q1/` 1.4M, `q2/` 136K, `q3/` 5.0M). Deletion was declined per this session's instructions;
left for the owner to sweep.
