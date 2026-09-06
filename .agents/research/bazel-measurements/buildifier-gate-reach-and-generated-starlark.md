---
title: "Buildifier gate reach, and validating generated Starlark"
slug: buildifier-gate-reach-and-generated-starlark
agent: measurement-wave-2
model: sonnet
date_measured: 2026-09-05
bazel_versions: ["8.7.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2, not a CI runner)"
affects_rule_ids:
  - BZL-LARK-09
  - BZL-LARK-24
  - BZL-LARK-25
  - BZL-LARK-26
answers:
  - "bazel-starlark-and-build.md § Open questions › deserves another research round › buildifier-gate-reach"
  - "bazel-starlark-and-build.md § Open questions › deserves another research round › generated-starlark-validation"
---

# Buildifier gate reach, and validating generated Starlark

**Host caveat (stated once):** WSL2, kernel `6.18.33.2-microsoft-standard-WSL2`, not a CI
runner. Every sandboxed-test result below shows `linux-sandbox` as the spawn strategy
(confirmed in raw output, not assumed); nothing in this cluster's findings depends on a
mount, timing, or filesystem quirk that a bare-metal Linux CI runner would not also hit — the
mechanisms measured here (`find`/`xargs` exit-code semantics, a bash `${VAR+x}` bug, `find -P`
not following symlinks) are shell- and Bazel-source-level, not WSL2-specific.

## Table of contents

- [Environment](#environment)
- [Q1: `buildifier.check` on a clean tree, and the runner's actual wrapping](#q1-buildifierscheck-on-a-clean-tree-and-the-runners-actual-wrapping)
- [Q2: Reach into `.bazelignore`'d trees](#q2-reach-into-bazelignored-trees)
- [Q3: Does `positional-args` fire on in-`.bzl` helper calls?](#q3-does-positional-args-fire-on-in-bzl-helper-calls)
- [Q4: Exit-code matrix](#q4-exit-code-matrix)
- [Q5: Validating generated Starlark — three candidate checkers](#q5-validating-generated-starlark-three-candidate-checkers)
- [Q6: `unsorted-dict-items` over `ocx/extensions.bzl`](#q6-unsorted-dict-items-over-ocxextensionsbzl)
- [Not settled](#not-settled)
- [Re-run](#re-run)

## Environment

```
$ free -g
              total  used  free  shared  buff/cache  available
Mem:             31    18     0       4          16           12
Swap:            32    18    13
$ nproc
32
```

31 GB total RAM ≥ 16 GB, so `--host_jvm_args=-Xmx1g` was **not** applied to any invocation
(protocol's threshold not crossed).

`.bazelversion` in `rules_ocx` pins **8.7.0**; all measurement in this cluster ran on 8.7.0
only (the protocol did not ask for a 9.2.0 pass here — that is a gap, see Not settled).

`bazelisk info` (in the git-archive copy):

```
release: release 8.7.0
execution_root: <scratch>/out/848d.../execroot/_main
output_base: <scratch>/out/848d...
workspace: <scratch>/rules_ocx
```

Spawn strategy: every `bazel test` run in this cluster reports `linux-sandbox` in its
summary line, e.g. `19 processes: 11 internal, 8 linux-sandbox` and
`12 processes: 2 action cache hit, 7 internal, 5 linux-sandbox`. No `--sandbox_debug` or
`--subcommands` run was needed — the strategy line in normal output already answers it.

Isolation: `git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x` into the scratch dir
(no `.bazelrc.user`, confirmed absent post-copy). The real `rules_ocx` checkout was never
built against; `git status --short` there is clean throughout and after.

**Disk note, recorded because it shaped this run:** the scratch tmpfs (`/tmp`, 16 GB,
shared across concurrently-running sibling measurement agents in this same wave) hit 100%
full partway through Q5, aborting a `cp`. Recovery: `bazelisk shutdown` on both scratch
workspaces, then deleting this cluster's own `--output_user_root` (freed ~512 MB; the
tmpfs also recovered from other sessions finishing/cleaning concurrently, ending at 60%
used). No finding below depends on the disk event; it cost one retried `cp` and is recorded
per the protocol's instruction to record environmental failures rather than guess.

## Q1: `buildifier.check` on a clean tree, and the runner's actual wrapping

**Protocol:** `bazelisk run //:buildifier.check` on the clean copy; then read the generated
runner script under `bazel-bin`.

**Raw result:**

```
$ USE_BAZEL_VERSION=8.7.0 ocx --project .../ocx.toml exec -- \
    bazelisk --output_user_root=<out> run //:buildifier.check
...
INFO: Build completed successfully, 5 total actions
INFO: Running command line: bazel-bin/buildifier.check.bash
exit=0
```

`bazel-bin/buildifier.check.bash` (from `BUILD.bazel`'s `mode="diff"`, `lint_mode="warn"`):

```bash
set -euo pipefail
BUILDIFIER_SHORT_PATH='../buildifier_prebuilt++buildifier_prebuilt_deps_extension+buildifier_linux_amd64/file/buildifier'
ARGS=('-mode=diff' '-v=false' '-lint=warn')
WORKSPACE=""
buildifier_short_path=$(readlink "$BUILDIFIER_SHORT_PATH")
if [[ -n "${TEST_WORKSPACE+x}" && -z "${BUILD_WORKSPACE_DIRECTORY+x}" ]]; then
  FIND_FILE_TYPE="l"
  if [[ ! -z "${WORKSPACE+x}" ]]; then
    FIND_FILE_TYPE="f"
    WORKSPACE_PATH="$(dirname "$(realpath ${WORKSPACE})")"
    if ! cd "$WORKSPACE_PATH"; then echo "Unable to change..."; fi
  fi
else
  if ! cd "$BUILD_WORKSPACE_DIRECTORY"; then echo "Unable to change..."; exit 1; fi
fi
find . -type "${FIND_FILE_TYPE:-f}" \! -path './.git/*' \
  \( -name '*.bzl' -o -name '*.sky' -o -name '*.bazel' -o -name BUILD -o -name '*.BUILD' \
     -o -name 'BUILD.*.oss' -o -name WORKSPACE -o -name WORKSPACE.bzlmod -o -name WORKSPACE.oss \
     -o -name 'WORKSPACE.*.oss' \) -print | xargs "$buildifier_short_path" "${ARGS[@]}"
```

**Verdict:** the consolidation's phrase "`find … -exec buildifier {} +`" is **not what ships**.
The real runner is `find … -print | xargs buildifier ARGS` under `set -euo pipefail`. This
matters for exit-code fidelity (see Q2, Q4): `pipefail` does make the pipeline's exit status
the (nonzero) exit status of `xargs`/`buildifier`, so a lint or format finding still fails
the `bazel run` — the "hard gate" conclusion holds — but the **specific number** is not
buildifier's own exit code. `xargs` maps any invoked-command exit in the 1–125 range to its
own exit **123**, so what actually propagates out of `bazel run //:buildifier.check` on a
lint or format finding is **123**, not buildifier's internal 4 (confirmed under Q2). Anyone
reading a CI log and expecting to see exit 4 will not. Confirmed at Bazel 8.7.0,
`buildifier_prebuilt` 8.2.0.2, buildifier binary 8.2.0.

## Q2: Reach into `.bazelignore`'d trees

**Protocol:** plant a lint violation (unused `load`) in `examples/project/BUILD.bazel` and in
`ocx/private/versions.bzl`; run `//:buildifier.check`; record exit code; revert.

**Raw result — plant in `examples/project/BUILD.bazel`** (`.bazelignore`'d):

```
./examples/project/BUILD.bazel:1: load: Loaded symbol "paths" is unused. Please remove it.
...
exit=123
```

**Raw result — plant in `ocx/private/versions.bzl`** (in-graph, not ignored):

```
./ocx/private/versions.bzl:12: load: Loaded symbol "paths" is unused. Please remove it.
...
exit=123
```

Both plants were reverted; `diff` against the saved originals confirmed a byte-identical
restore, and `git status --short` in the real `/home/mherwig/dev/rules_ocx` stayed clean
throughout (the plants were only ever in the scratch copy).

**Verdict:** confirmed by direct measurement — `//:buildifier.check`'s runner does `find .`
over the real filesystem from `$BUILD_WORKSPACE_DIRECTORY` (the `bazel run` case), which has
no concept of `.bazelignore` (that file only prunes Bazel's own *package graph*, not a shell
`find`). It reaches `examples/` and `e2e/` exactly as it reaches `ocx/private/`, with **the
same exit code** (123) either way — no signal distinguishes "ignored-tree lint" from
"production lint" in the exit status. This settles the map's open question definitively at
Bazel 8.7.0 with `buildifier_prebuilt` 8.2.0.2: `examples/` and `e2e/` are not, in fact, a
blind spot the fleet's CI happens to miss — `task lint` / `//:buildifier.check` already
lints them today. (Whether that is *desired* is the separate human-decision open question
1 in the consolidation, untouched here.)

## Q3: Does `positional-args` fire on in-`.bzl` helper calls?

**Protocol:** does the check flag `unittest.make(_impl)` / `analysistest.make(_impl, …)` in
`ocx/tests/launcher_test.bzl` (28 call sites, upstream skylib idiom)? Then isolate the
variable with direct binary runs.

**Raw result 1 — baseline:** Q1's clean-tree run (`exit=0`, zero findings) already covers
`ocx/tests/launcher_test.bzl` (it is not `.bazelignore`d and matches `*.bzl`), so the 28
existing `unittest.make`/`analysistest.make` positional call sites produce **zero**
`positional-args` findings today, as shipped.

**Raw result 2 — isolated, buildifier 8.2.0 direct:**

| Fixture | File type | Call shape | `positional-args`? |
|---|---|---|---|
| `unittest_make(_impl)` (bare name) | `.bzl` | positional | no |
| `my_macro("foo", "bar")` / `my_rule("foo","bar")` (bare name) | `BUILD` | positional | **yes** (2 findings) |
| `unittest.make(_impl)` (dotted) | `.bzl` | positional | no |
| `unittest.make(_impl)` (dotted) | `BUILD` | positional | no |
| `analysistest.make(_impl, expect_failure = True)` (dotted, mixed) | `.bzl` | positional | no |

**Raw result 3 — source, `bazel-contrib/buildtools` `main`, `warn/warn_bazel.go:178`:**

```go
func positionalArgumentsWarning(f *build.File, fileReader *FileReader) (findings []*LinterFinding) {
	if f.Type != build.TypeBuild {
		return nil
	}
	...
	for _, expr := range f.Stmt {
		build.Walk(expr, func(x build.Expr, _ []build.Expr) {
			if fnCall, ok := x.(*build.CallExpr); ok {
				fnIdent, ok := fnCall.X.(*build.Ident)
				if !ok {
					return
				}
				if macroAnalyzer.IsRuleOrMacro(...).isRuleOrMacro {
					...
				}
			}
		})
	}
	return
}
```

**Verdict:** settled, and by two independent means (empirical + source read) that agree.
Two conditions gate the warning, both hard: (1) `f.Type != build.TypeBuild` returns `nil`
immediately — **the check never runs on a `.bzl` file at all**, regardless of call shape;
(2) even inside a `BUILD` file, the call target must type-assert to `*build.Ident` (a bare
name) — a `*build.DotExpr` (`unittest.make(...)`) fails that assertion and is skipped. So
`unittest.make(_impl)` / `analysistest.make(_impl, …)` are doubly exempt: wrong file type
*and* wrong call shape. The rule's own scoping note ("BUILD-file rule and macro call sites")
was correct as written; this closes the "Unverified, needs a buildifier run" flag the
consolidation left on BZL-LARK-09 with a positive, reproducible confirmation rather than a
default-to-caution guess. Confirmed at buildifier 8.2.0; the `warn_bazel.go` gate has no
version-conditional code around it in `main`, so this is not expected to be version-fragile,
but only 8.2.0 was measured.

## Q4: Exit-code matrix

**Protocol:** raw buildifier on (a) formatted+1 lint finding, (b) unformatted+0 lint
findings, (c) both, crossed with `-mode=check -lint=warn`, `-mode=diff -lint=warn`,
`-mode=check -lint=off`.

**Raw result:**

| Fixture | `-mode=check -lint=warn` | `-mode=diff -lint=warn` | `-mode=check -lint=off` |
|---|---|---|---|
| (a) formatted, `depset([1])+depset([2])` (1 lint finding, 0 format need) | 4 | 4 | **0** |
| (b) unformatted (`x=1`), 0 lint findings | 4 | 4 | 4 |
| (c) unformatted **and** 1 lint finding | 4 | 4 | 4 |

Exact transcript for (a):

```
$ buildifier -mode=check -lint=off a_formatted_lint.bzl; echo exit=$?
exit=0
$ buildifier -mode=check -lint=warn a_formatted_lint.bzl; echo exit=$?
a_formatted_lint.bzl:4: depset-union: Depsets should be joined using the "depset()" constructor.
exit=4
```

**Verdict:** confirmed and extended. The consolidation's dive established exit 4 for one
case (`mode=diff`+`lint=warn`, lint-only violation on an already-formatted file). This
matrix adds the two cells that case didn't cover and both come out the same way: **any**
buildifier finding — a pure format need with lint entirely off, or a pure lint finding on an
already-formatted file, in either `check` or `diff` mode — sets exit **4**. Exit 0 appears in
exactly one cell: nothing wrong *and* lint disabled. There is no "soft" cell in this matrix
at Bazel-adjacent buildifier 8.2.0; `mode="diff"` is exactly as hard as `mode="check"`. This
independently reconfirms the consolidation's Verdict 1 rather than merely repeating it.

## Q5: Validating generated Starlark — three candidate checkers

**Protocol:** over a genrule-written `.bzl` sample (clean and deliberately broken), test (a)
the shipped `buildifier_test` rule and a hand-rolled `sh_test` over the raw binary, (b)
`bazel build --nobuild` / `bazel query --output=build` over a package that `load()`s a
repository-rule-generated `.bzl`, (c) an offline Starlark parser if one exists.

### (a) `buildifier_test` (shipped by `buildifier_prebuilt`) — **does not work**, in either mode

Sandboxed (default, `srcs = ["render_broken"]`, no `no_sandbox`):

```
Target //gen:check_broken_via_buildifier_test PASSED in 0.1s   (same for the clean fixture)
Test output: realpath: missing operand
```

Root cause, traced in the vendored `runner.bash.template`: the template **always** emits
`WORKSPACE="<value>"` (empty string when the rule's `workspace` attr is unset), so
`[[ ! -z "${WORKSPACE+x}" ]]` is **always true** — `${VAR+x}` tests whether a shell variable
is *set*, not whether it's *non-empty*. This flips `FIND_FILE_TYPE` from `l` (symlink — what
runfiles actually are) to `f` (regular file) unconditionally, then `dirname "$(realpath "")"`
silently swallows the `realpath` failure (it's nested inside another substitution, so its own
exit status never reaches `set -e`) and evaluates to `.`. The net effect: `find . -type f
<ext-filter>` runs over a directory that contains only *symlinks* — it matches nothing,
`xargs` invokes buildifier with zero file arguments, buildifier reads (empty) stdin as valid
Starlark, and the test trivially passes. **`srcs` is accepted by the attribute schema but has
no effect on what gets linted.**

`no_sandbox=True` + a `workspace` label does fix the `realpath` failure (a real path now
resolves) but changes the reach, not the bug: it `cd`s to the **real workspace root** and
does `find .` there — plain `find`, no `-L`, so it does not descend through the `bazel-bin`/
`bazel-out` symlinks. A genrule-produced file (which exists only under `bazel-out`, not as a
real source-tree file) is **structurally invisible** to it. Measured directly: with
`no_sandbox=True`, `workspace="//:MODULE.bazel"`, `srcs=["render_broken"]`, the test still
fails (exit 123) — but its output lists only the four real *source* `BUILD`/`MODULE.bazel`
files needing reformat; `gen/broken.bzl` never appears, clean or broken, because it was never
found. So: **broken by default (finds nothing, false-passes); "fixed" via `no_sandbox` only
by falling back to a whole-workspace source-tree scan that structurally cannot see the one
kind of file this rule exists to check.** `buildifier_test`, as shipped, is not a usable
per-generated-file checker in either configuration.

### (a, working alternative) hand-rolled `sh_test` over the raw binary — **works**

```python
sh_test(
    name = "sh_test_over_generated",
    srcs = ["check_generated.sh"],
    data = ["render_clean", "@buildifier_prebuilt//:buildifier"],
    args = ["$(location render_clean)", "$(location @buildifier_prebuilt//:buildifier)"],
)
```
`check_generated.sh`: `exec "$BUILDIFIER" -mode=check -lint=warn "$GENERATED"`.

```
//gen:sh_test_over_generated          PASSED  (clean fixture)
//gen:sh_test_over_generated_broken   FAILED, exit 1
  gen/broken.bzl:3:9: syntax error near :
  gen/broken.bzl # reformat
```

This is a plain `sh_test` with two `data` deps and `$(location)` substitution — no new
ruleset, no `buildifier_prebuilt` macro beyond the binary target it already exports. It
correctly passes the clean sample and correctly fails the broken one with the exact
file:line:col.

### (b) `bazel build --nobuild` / `bazel query --output=build` over a `load()`-consumed generated `.bzl` — **works, and is the cheapest**

Setup: a `repository_rule` (`use_repo_rule` in `MODULE.bazel`, no module-extension
boilerplate needed) writes `out.bzl` as either `X = 1` or `X = (1 + \n` (unbalanced,
unclosed). Two consumer packages each `load()` from one generated repo.

```
$ bazelisk query --output=build //consumer_broken:broken
ERROR: <out>/external/+_repo_rules+gen_broken/out.bzl:2:1: syntax error at 'newline': expected expression
ERROR: <out>/external/+_repo_rules+gen_broken/out.bzl:1:5: contains syntax errors
ERROR: error loading package 'consumer_broken': compilation of module 'out.bzl' failed
exit=7

$ bazelisk query --output=build //consumer_ok:ok
# .../consumer_ok/BUILD.bazel:3:10
filegroup(name = "ok", tags = ["1"], srcs = [])
exit=0

$ bazelisk build --nobuild //consumer_broken:broken //consumer_ok:ok
ERROR: .../out.bzl:2:1: syntax error at 'newline': expected expression
...
INFO: Elapsed time: 0.057s
INFO: 0 processes.
exit=1
```

**No buildifier binary involved at all** — this is Bazel's own loading-phase Starlark
compiler, which every `load()` already goes through. It is essentially free (0.057 s, 0
actions) and needs nothing beyond the repository rule itself: no toolchain, no external
dependency, no test infrastructure. It only catches *syntax* errors (unbalanced parens, bad
tokens) — it does not catch a semantically-wrong-but-parseable render (e.g., the wrong
attribute name in a schema-shaped dict), which a real consuming build (BZL-LARK-25's existing
mitigation) still catches and this does not.

### (c) offline Starlark parser

```
$ python3 -c "import starlark"   → ModuleNotFoundError
$ python3 -c "import lark"       → ModuleNotFoundError
$ which starlark                 → not found
```

No offline Starlark or general parser is present on this host and none was installed (out
of scope per protocol: "skip if none"). Not evaluated further.

**Verdict, generated-starlark-validation (the family's highest-leverage open question):**
this settles it with a working answer rather than leaving it open. Ranked by cost and what
each actually catches:

1. **`bazel query --output=build` / `bazel build --nobuild` over a `load()`-consuming
   package** is the cheapest real check (no binary, no test, sub-tenth-second) and is the
   right first gate for BZL-LARK-25's "at least one test that builds a target out of the
   generated repository" requirement — it *is* a build-a-target-and-see check, just via the
   loading phase rather than a full build. Catches syntax errors only.
2. **A hand-rolled `sh_test` piping the rendered output through the raw `buildifier` binary**
   (`-mode=check -lint=warn`) is the right implementation of BZL-LARK-26's "pipe a rendered
   sample through `buildifier -mode=check`" — it is a normal, working `sh_test` with two
   `data` deps, and it is the piece that was missing (repo-wide, per the consolidation's
   Violated table) for `render_launchers_build`/`render_env_bzl`.
3. **`buildifier_test` (the shipped rule) is not a substitute for either** — do not recommend
   it for this purpose. It silently no-ops (false pass) in its default configuration and, in
   its only "fixed" configuration, cannot see genrule/repository-rule output at all. Any rule
   text that recommends `buildifier_test` for validating a rendered sample should say instead
   "a plain `sh_test` over the raw binary" and name the reason.

Both (1) and (2) are needed together — (1) is nearly free and catches syntax, (2) is the
existing recommendation and additionally catches buildifier's style/lint rules (which (1)
does not evaluate at all, since Bazel's own loader doesn't lint). Neither alone closes the
whole gap; BZL-LARK-25's full-integration-build requirement remains the only thing that
catches a semantically-wrong-but-syntactically-valid render (e.g., a mistyped attribute name
inside a correctly-balanced dict literal).

## Q6: `unsorted-dict-items` over `ocx/extensions.bzl`

**Protocol:** run buildifier with `-warnings=+unsorted-dict-items` over `ocx/extensions.bzl`;
count findings, confirm they're real schema dicts, check the diff churn.

**Raw result:**

```
$ buildifier -mode=check -lint=warn -warnings=+unsorted-dict-items ocx/extensions.bzl
ocx/extensions.bzl:45: unsorted-dict-items: ...
ocx/extensions.bzl:129: unsorted-dict-items: ...
exit=4
```

Line 45 is `"bins":` inside `_project = tag_class(..., attrs = {"name": ..., "bins": ...})`;
line 129 is `"bins":` inside `_package = tag_class(..., attrs = {"name": ..., "bins": ...})` —
both real `tag_class()` attribute schema dicts, both flagged because `"name"` is deliberately
placed first (readability convention: the identifying attribute leads) and `"bins" < "name"`
lexicographically. The other two `tag_class()`es the consolidation counted (`_download`,
`_policy`) do **not** fire: `_download`'s dict (`dist_manifest`, `triple`, `version`) is
already alphabetical, and `_policy`'s `attrs = POLICY_ATTRS` is a symbol reference, not a
dict literal at this call site — buildifier's `unsorted-dict-items` sorts literal dict
expressions and cannot reach through a name.

Diff churn, measured with `-mode=fix -lint=fix` against a scratch copy:

```diff
@@ -38,10 +38,6 @@
 _project = tag_class(
     attrs = {
-        "name": attr.string(
-            mandatory = True,
-            doc = "Name of the generated repository.",
-        ),
         "bins": attr.string_list(
             ...
         ),
+        "name": attr.string(
+            mandatory = True,
+            doc = "Name of the generated repository.",
+        ),
         "no_config": attr.bool(
```
(same 4-line-moved shape recurs at `_package`, line 122)

**Verdict:** confirmed as described, with the exact count corrected: **2** findings, not 4 —
half the tag classes the consolidation counted don't trigger, for two distinct, unrelated
reasons (already-sorted; not-a-literal). Both real findings are genuine schema dicts, and the
"one round of diff churn" characterization holds precisely: two hunks, each just relocating
the four-line `"name": attr.string(...)` block from first position to its alphabetical slot
between `"groups"`/`"config"`... and `"no_config"`. The fix has no logic effect (attr order
inside a Starlark dict literal is not observable by any consumer of a `tag_class`); the only
cost is that the autofix removes the "identifying attribute first" convention this file uses
today. This is enough evidence to close open question 3 as a genuine one-line style trade
rather than a hidden landmine: adopting `unsorted-dict-items` costs exactly these two small,
one-time, semantically-inert hunks.

## Not settled

- **Bazel 9.2.0 was not run in this cluster.** All six questions here were measured only at
  8.7.0 (the protocol's `USE_BAZEL_VERSION` for this cluster). Q3's source read (against
  `bazel-contrib/buildtools` `main`) is buildifier-version-general, not Bazel-version-general,
  and buildifier's linter logic does not depend on which Bazel loaded it — but this was not
  independently re-run under a Bazel-9 toolchain to rule out a toolchain-selection surprise.
- **Only one buildifier binary version was exercised**, 8.2.0 (pinned by `buildifier_prebuilt`
  8.2.0.2, which is what `rules_ocx`'s `MODULE.bazel` pins as a `dev_dependency`). The `xargs`
  exit-123 finding (Q1) is a property of the vendored `runner.bash.template` in
  `buildifier_prebuilt`, not of the buildifier binary itself, and was not cross-checked
  against a different `buildifier_prebuilt` release to see whether the template has since
  been patched upstream.
- **`buildifier_test`'s `WORKSPACE=""` behavior on Bazel 9** was not measured — Bazel 9
  deletes `WORKSPACE` support code entirely, and the rule's `no_sandbox` path documents
  itself as needing a "WORKSPACE file" label; whether `buildifier_prebuilt` 8.2.0.2's rule
  still functions (even in its degraded, whole-tree-scanning way) under Bzlmod-only Bazel 9
  was not tested here.
- **The Q5(b) load-time check does not catch semantic errors** (wrong attribute name, right
  syntax) — this was stated as a limitation from source-level reasoning about what a parser
  checks, not measured against a deliberately-wrong-but-parseable fixture. A follow-up could
  add that fixture to make the boundary as measured as the syntax-error case is here.

## Re-run

```bash
SCRATCH=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/946b693c-7b64-4917-9d73-8efea67c92ab/scratchpad/measure/buildifier-gate-reach-and-generated-starlark
mkdir -p "$SCRATCH" && git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C "$SCRATCH/rules_ocx" --one-top-level 2>/dev/null || { mkdir -p "$SCRATCH/rules_ocx"; git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C "$SCRATCH/rules_ocx"; }
cd "$SCRATCH/rules_ocx"
USE_BAZEL_VERSION=8.7.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root="$SCRATCH/out" run //:buildifier.check
```
(Q2–Q6 each set up a small scratch fixture inline as described in their sections above; none
persist outside `$SCRATCH`.)
