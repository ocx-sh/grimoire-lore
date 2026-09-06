---
title: "Buildifier taxonomy and style: the linter, the two style guides, and whether the gate is a gate"
topic: buildifier-taxonomy-and-style
group: bazel-starlark-and-build
family: BZL-LARK
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 15
primary_sources_count: 12
settles: [M-A-01, M-A-02, M-A-03, M-A-04, M-A-05, M-A-08, M-A-09, M-A-15, M-A-16, M-A-20, M-A-21, M-A-22]
scope: >
  What buildifier's linter and the two bazel.build style guides enforce today,
  which of it is mechanical versus reading-only, and — the load-bearing
  question — whether rules_ocx's buildifier.check target can actually fail CI.
  Does not cover Starlark dialect traps (dict/depset ordering, top-level
  if/for, analysistest vacuous-pass) or macro/rule porting traps — see
  starlark-dialect-and-determinism-traps and macros-rules-and-symbolic-macros
  in this group.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The warning taxonomy, by the numbers](#1-the-warning-taxonomy-by-the-numbers)
   2. [The one non-default warning](#2-the-one-non-default-warning)
   3. [The four dead warnings](#3-the-four-dead-warnings)
   4. [Which warnings cite an `--incompatible_*` flag](#4-which-warnings-cite-an---incompatible_-flag)
   5. [The gate question, settled](#5-the-gate-question-settled)
   6. [The two style guides, itemised](#6-the-two-style-guides-itemised)
   7. [Style-guide rules with no mechanical check](#7-style-guide-rules-with-no-mechanical-check)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Buildifier ships **99 warning categories** (`RuleWarningMap` 0 + `FileWarningMap` 51 + `MultiFileWarningMap` 48, `warn.go:118-224`), not the map's estimated ~84 — cite the real number, not the wave-1 guess.
- Exactly **one** warning is off by default: `unsorted-dict-items` (`warn.go:224-227`, `nonDefaultWarnings`) — confirmed, matches the brief's ask.
- Default lint mode is **`off`**; an empty `-warnings` resolves to all 98 non-`unsorted-dict-items` warnings (`buildifier/config/validation.go`, `ValidateModes`/`ValidateWarnings`) — this is the literal upstream default, safe to cite as-is.
- Exactly **four** warnings are "Not supported by the latest version of Buildifier" and must never be cited as live checks: `attr-package-metadata`, `load-on-top`, `out-of-order-load`, `same-origin-load` — all four are absent from `warn.go`'s maps entirely; three were folded into the automatic formatter, one is a dead attribute-naming rule (`WARNINGS.md:239,690,1095,1350`).
- **43 of the 99 categories** cite a `--incompatible_*` flag in `WARNINGS.md`; the other ~56 are pure style with no flag and no scheduled removal (own re-derivation from `WARNINGS.md`, corrects the map's "≈40 of ≈84").
- Surprise: several of the flags `WARNINGS.md` cites (`--incompatible_depset_union`, `--incompatible_disallow_slash_operator`, `--incompatible_bzl_disallow_load_after_statement`, `--incompatible_package_name_is_a_function`, `--incompatible_string_is_not_iterable`, `--incompatible_disallow_old_style_args_add`, `--incompatible_depset_is_not_iterable`) return **zero hits** in the current `bazelbuild/bazel` source (checked 2026-09-05) — those Starlark-migration flags finished and were deleted years ago; the warning describes permanent behaviour, not a future flip. `--incompatible_autoload_externally` (4 hits) and `--incompatible_disable_depset_items`/`--incompatible_new_actions_api` (10-11 hits) are still live. Treat "Flag in Bazel" as provenance, not a togglable-today guarantee, and re-check before citing one as still flippable.
- **The gate question is settled, and it overturns the map's own conflict-18 resolution.** With `mode="diff"` and `lint_mode="warn"`, a lint finding **does** change the exit code — confirmed by source trace (`buildifier.go:308-311`, exit set to 4 whenever `len(warnings) > 0`, independent of `Mode`) and by running the real 8.5.1 binary on an already-correctly-formatted file with one `depset-union` violation: exit 4, no diff to show.
- The `buildifier_prebuilt` runner (`runner.bash.template`) wraps every invocation in `find … -exec buildifier "${ARGS[@]}" {} +` under `set -euo pipefail`; GNU find turns any nonzero exit from `-exec … +` into find's own exit **1** — confirmed empirically. So the discrete 0/1/2/3/4 codes buildifier documents are **collapsed to a single pass/fail bit** once you go through the `buildifier()`/`buildifier_test()` macros; only `buildifier_binary` (`binary_runner.bash.template`, a plain `exec`) preserves them.
- `rules_ocx`'s `//:buildifier.check` (`mode="diff"`, `lint_mode="warn"`, `BUILD.bazel:14-18`) is invoked as `bazel run //:buildifier.check` from `taskfile.yml:25`, first in `task lint`, with no `|| true` and no `continue-on-error` anywhere in `ci.yml`. **Conclusion: the gate is already a hard gate.** A real lint finding fails `task lint`, fails the Lint job, fails the PR — contrary to the map's conflict-18 text ("a soft, non-blocking lint report"), which was inferred from reading the attribute name `lint_mode="warn"` rather than from running the binary.
- Both style guides (`bazel.build/rules/bzl-style`, `bazel.build/build/style-guide`) together carry roughly 45-50 distinct recommendations; call it half with no mechanical check at all — pure reading heuristics for a reviewer, human or agent.
- `rules_ocx`'s own gate omits `unsorted-dict-items`; enabling it for `tag_class()`/`attr()` dict literals costs one line (`lint_warnings = ["+unsorted-dict-items"]`) and is worth it for the 4 `tag_class()` definitions in `extensions.bzl`.
- Docstrings are only *required* by the `function-docstring` warning for public functions with **at least 5 statements** (`WARNINGS.md:576-577`) — a function with 4 or fewer is exempt even with no docstring at all; do not over-apply this check.
- `provider()` field/doc omission (`provider-params`) is flagged as a forward-incompatible smell, not a current error: 0 `provider()` calls exist in `rules_ocx` today, so this rule ships as a pin for the first one, not a fix.
- The `native-cc-*`/`native-java-*`/`native-proto-*` warning families all cite `--incompatible_autoload_externally`, which defaults to the empty string as of Bazel 9.0 ([release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)) — every native `cc_*`/`java_*`/`proto_library` call now needs an explicit `load()`. `native-py`'s own doc text still says "the plans for disabling native rules have been postponed… not required to load Starlark rules" (`WARNINGS.md:1044-1046`) — **that text is stale**; buildifier's own linter has not caught up with Bazel 9's actual autoload default for Python. `native-sh-*` cites no flag at all.
- Test against `rules_ocx`'s four `# buildifier: disable=` sites: 3× `unused-variable` in `launcher_test.bzl:72,100,159` (justified — the unused param names must match `repository_ctx`'s real signature) and 1× `print` in `package.bzl:199` (justified — a user-facing digest-pin hint, not a stray debug print). All four are defensible, none is a smell.

## Findings

### 1. The warning taxonomy, by the numbers

Fetched `warn/warn.go` from `bazelbuild/buildtools` at `main` (raw, verbatim, not summarised). The three registries:

```go
// warn.go:115
var RuleWarningMap = map[string]func(call *build.CallExpr, pkg string) *LinterFinding{}
// warn.go:118
var FileWarningMap = map[string]func(f *build.File) []*LinterFinding{ /* 51 entries */ }
// warn.go:173
var MultiFileWarningMap = map[string]func(f *build.File, fileReader *FileReader) []*LinterFinding{ /* 48 entries */ }
```

`RuleWarningMap` is **empty** — there are no single-rule-scoped warnings left in the current linter; everything runs at file or multi-file scope. Counted directly (not via `grep -c`, which double-counts across a naive regex — verified with a brace-balanced scan):

| Registry | Entries |
|---|---|
| `RuleWarningMap` | 0 |
| `FileWarningMap` | 51 |
| `MultiFileWarningMap` | 48 |
| **`AllWarnings` (union, `warn.go:447-464`)** | **99** |
| **`DefaultWarnings` (`AllWarnings` minus `nonDefaultWarnings`, `warn.go:466-477`)** | **98** |

This is the number a rule must cite, not the map's "~84" placeholder (`bazel-topic-map.md` M-A-03).

### 2. The one non-default warning

```go
// warn.go:224-227
// nonDefaultWarnings contains warnings that are enabled by default because they're not applicable
// for all files and cause too much diff noise when applied.
var nonDefaultWarnings = map[string]bool{
    "unsorted-dict-items": true, // dict items should be sorted
}
```

Confirmed: exactly one key. The [buildifier README](https://github.com/bazelbuild/buildtools/blob/main/buildifier/README.md#linter) states the same policy in prose: "By default, the linter searches for all known issues relevant for the given file type except those that are marked with '[Disabled by default]'." `WARNINGS.md` marks only `unsorted-dict-items` that way (`WARNINGS.md:439`).

### 3. The four dead warnings

`grep -n -i "not supported by the latest"` over `WARNINGS.md` returns exactly four hits — no fifth exists:

| Warning | `WARNINGS.md` line | What "not supported" means |
|---|---|---|
| `attr-package-metadata` | 239 | Never had an autofix; flagged as prohibited-in-future, but the check itself is gone from the binary. |
| `load-on-top` | 690 | "Obsolete; the warning has been implemented in the formatter and the fix is now automatically applied to all files except `WORKSPACE` files" |
| `out-of-order-load` | 1095 | Same pattern — folded into the formatter, applies to all files. |
| `same-origin-load` | 1350 | Same pattern — folded into the formatter, all files except `WORKSPACE`. |

All four are **absent from `warn.go`'s three maps** (`grep -c` returns 0 for each name across the whole file) — they are documentation-only relics, not suppressible-but-present checks. A rule may cite `load-on-top`/`out-of-order-load`/`same-origin-load` only to explain that load ordering is now an unconditional formatter rewrite, never as a lint category an agent could `# buildifier: disable=` away and expect to matter. Do not add a fifth to this list without re-grepping `WARNINGS.md` first — the corpus changes on every `buildtools` release.

### 4. Which warnings cite an `--incompatible_*` flag

Cross-referencing every `Flag in Bazel:` line in `WARNINGS.md` against its category name(s) (own script over the fetched file, not paraphrase): **43 of the 99 categories** carry a flag citation. Nineteen of those 43 are the `native-cc-*`/`native-java-*`/`native-proto-*` family, which all point at the single flag `--incompatible_autoload_externally` (`WARNINGS.md:787-825` for the C++ family alone lists 18 category names under one flag). The remaining ~56 warnings are pure style/correctness with no flag and no scheduled removal — `confusing-name`, `no-effect`, `return-value`, `uninitialized`, `overly-nested-depset`, `duplicated-name`, `bzl-visibility`, `dict-method-named-arg`, `name-conventions`, `unnamed-macro`, `positional-args`, `print`, `provider-params`, `rule-impl-return` among them.

**Surprise, verified against the live `bazelbuild/bazel` source** (`gh api search/code`, 2026-09-05): several flags `WARNINGS.md` cites no longer exist anywhere in the current Bazel codebase —

| Flag (cited by) | Hits in `bazelbuild/bazel` (2026-09-05) |
|---|---|
| `--incompatible_depset_union` (`depset-union`) | 0 |
| `--incompatible_depset_is_not_iterable` (`depset-iteration`) | 0 |
| `--incompatible_disallow_old_style_args_add` (`ctx-args`) | 0 |
| `--incompatible_disallow_slash_operator` (`integer-division`) | 0 |
| `--incompatible_bzl_disallow_load_after_statement` (`load-on-top`) | 0 |
| `--incompatible_package_name_is_a_function` (`package-name`, `repository-name`) | 0 |
| `--incompatible_string_is_not_iterable` (`string-iteration`) | 0 |
| `--incompatible_disable_depset_items` (`depset-items`) | 10 |
| `--incompatible_new_actions_api` (`ctx-actions`) | 11 |
| `--incompatible_autoload_externally` (`native-cc-*`/`native-java-*`/`native-proto-*`) | 4 |
| `--incompatible_no_attr_license` (`attr-license`) | present, default `true` (bazel.build command-line reference) |

Reading: the zero-hit flags belong to the original 2018-2019 Starlark migration; that migration finished, the flags flipped permanently, and Bazel deleted them from its own source years ago. `WARNINGS.md`'s "Flag in Bazel" column for those rows is **provenance** ("this is why the rule exists"), not a live togglable flag — a rule that tells a reader "you can still opt out with `--noincompatible_depset_union`" would be wrong on any Bazel version this fleet runs. The flags with nonzero hits (`autoload_externally`, `disable_depset_items`, `new_actions_api`) are genuinely current and worth naming as still-relevant. Before citing any `--incompatible_*` flag as "still flippable," re-check it against the current command-line reference or a code search — do not trust `WARNINGS.md`'s flag column at face value (this is the map's conflict 8 in miniature: a doc page is not automatically current).

### 5. The gate question, settled

This is the brief's central "must DECIDE." Traced end to end, then verified empirically.

**Step 1 — the raw CLI.** `buildifier/buildifier.go:processFile` (`buildifier.go:285-386`):

```go
warnings := utils.Lint(f, b.config.Lint, &b.config.LintWarnings, b.config.Verbose)
if len(warnings) > 0 {
    exitCode = 4
}
...
switch b.config.Mode {
case "diff":
    if bytes.Equal(data, ndata) {
        return fileDiagnostics, exitCode   // <- still 4 if warnings were found, even with no format diff
    }
    ...
}
```

`exitCode = 4` is set **before** the mode switch, from the lint step alone, and every branch of the mode switch that returns early (including "diff" when the file is already correctly formatted) returns that pre-set code unchanged. Buildifier's own `-help` text documents exit code 4 as "check mode failed (reformat is needed)" (`buildifier.go:76-80`) — that documentation is incomplete: 4 is overloaded for lint findings too, in every mode, independent of formatting.

**Verified by running the real binary** (buildtools v8.5.1, linux-amd64) on an already-correctly-formatted `.bzl` file containing one genuine `depset-union` violation:

```
$ ./buildifier -mode=diff -lint=warn lint_sample.bzl
lint_sample.bzl:4: depset-union: Depsets should be joined using the "depset()" constructor. (…)
$ echo $?
4
```

No diff was printed (the file needed no reformatting) — the nonzero exit came from the lint finding alone. This directly answers the brief: **yes, a lint finding changes the exit code, in `mode="diff"` exactly as much as in `mode="check"`.**

**Step 2 — the Bazel-rule wrapper.** `buildifier_prebuilt`'s `buildifier()`/`buildifier_test()` rules (`rules.bzl`, `factory.bzl`) do not invoke the binary directly; they expand `runner.bash.template` into a generated script:

```bash
#!/usr/bin/env bash
set -euo pipefail
...
find . {EXCLUDE_PATTERNS} -type "${FIND_FILE_TYPE:-f}" \
  \( -name '*.bzl' -o -name '*.bazel' -o -name BUILD -o … \) \
  -exec "$buildifier_short_path" "${ARGS[@]}" {} +
```

That `find … -exec … +` is the **last statement** in the script. Verified empirically: GNU `find` returns exit **1** (not the child's own code) whenever any batched `-exec … +` invocation exits nonzero, and under `set -e` the script's own exit status is that final command's status. So the documented 0/1/2/3/4 codes are **collapsed to a single pass/fail signal (0 or 1)** by the time a `buildifier()` target finishes running — a caller cannot distinguish "needs reformatting" from "has a lint finding" from the exit code alone once it's used through the macro. Only `buildifier_binary` (`binary_runner.bash.template`, a plain `exec "$tool_path" "$@"`) preserves buildifier's real exit code.

**Step 3 — `rules_ocx`'s actual configuration and CI wiring.**

```python
# rules_ocx/BUILD.bazel:14-18
buildifier(
    name = "buildifier.check",
    exclude_patterns = ["./.git/*"],
    lint_mode = "warn",
    mode = "diff",
)
```

```yaml
# rules_ocx/taskfile.yml:20-25
lint:
  desc: buildifier + actionlint + license headers + links + dist snapshot + guards
  cmds:
    - "{{.BAZEL}} run //:buildifier.check"
```

`task lint` runs this as its **first** command, with no `ignore_error: true`; `ci.yml:31`'s Lint job runs `ocx exec -- task lint` with no `continue-on-error`. go-task aborts the command list on the first nonzero exit by default.

**Conclusion, stated exactly:** with `mode="diff"` and `lint_mode="warn"`, a real lint finding makes `bazel run //:buildifier.check` exit nonzero, which makes `task lint` abort, which makes the GitHub Actions Lint job fail, which fails the PR. **The gate is already hard, today, with the current configuration.** This directly contradicts the map's conflict 18 ("CI's lint gate is a hard format-check plus a soft (non-blocking) lint report") — that resolution was reasoned from the attribute name `lint_mode="warn"` reading as "warn-only, non-fatal" by analogy to a compiler warning, not from tracing the binary. Two independent wave-1 sources (`cod`, `shape`) made the same plausible-but-wrong inference; this dive corrects it on primary source plus a live binary run, which the map's own evidence ranking (measured > argued/asserted) puts above the earlier reading.

The one configuration that *would* make a lint finding non-blocking: invoking `buildifier_binary` directly and discarding its exit code (`buildifier ... || true`), or setting `lint_mode = "fix"` (which mutates files instead of reporting, so `len(warnings)` after the fix pass is typically zero). `rules_ocx` does neither.

### 6. The two style guides, itemised

Fetched both pages (`bazel.build/rules/bzl-style`, `bazel.build/build/style-guide`) in full. Distinct, checkable recommendations, condensed (paraphrased for length, not for meaning — every clause below traces to specific guide prose):

**`.bzl` style guide** — General advice (use buildifier, follow testing guidelines); Python style (PEP 8 where practical, 4-space indent); docstrings (module + public function); `doc=` on every rule/aspect/attr/provider/field; naming (`lower_snake_case`, `_private`, no underscore on locals); line length ~79 chars, "should not be enforced strictly"; spaces around `=` in kwargs; `True`/`False` not `1`/`0`; no `print()` in production; macros use rules where possible, take `name=`, prefix generated target names, restrict visibility + `tags=["manual"]`, keyword-only call sites; rules use `snake_case`, noun names, `*_library`/`*_binary`/`*_test`/`*_import` suffix families, consistent `srcs`/`deps`/`data`/`runtime_deps`, private impl functions, provider-based interfaces.

**BUILD style guide** — DAMP over DRY (readability over de-duplication, because BUILD files are configuration, not tested code); formatting must match `buildifier -mode=check`; file order (package comment → `load()`s → `package()` → rules); no `..` up-references; `:`-prefix for generated files and in-package rule references, not for source files; target naming (descriptive, short eponymous target, avoid `all`/`__pkg__`/`__subpackages__`, `_test`/`_unittest`/`Test`/`Tests` suffix, no meaningless `_lib`); visibility scoped tight, avoid `default_visibility = //visibility:public`; dependencies direct-only (no transitive listing), package-local deps first, no shared list-variable encapsulating deps, no `exports`-only grouping targets; globs: `[]` for "no targets", no recursive `**` globs (skip subdirectory BUILD files, less efficient); no list comprehensions generating targets at BUILD top level; string values as literals (no `+`/`%` concatenation), labels never split even past 79 chars; minimise exported `.bzl` symbols, split files rather than over-export; `UPPER_SNAKE_CASE` constants, `lower_snake_case` variables; booleans not integers; double-quote strings by default; one blank line between top-level definitions (not two, unlike PEP 8).

### 7. Style-guide rules with no mechanical check

Cross-referencing every item above against the 99 buildifier categories and against anything greppable. Roughly half — the brief's own estimate — have genuinely nothing mechanical behind them:

**Has a mechanical buildifier check** (name given): docstrings → `module-docstring`, `function-docstring`(+`-header`/`-args`/`-return`); `doc=` on rules/attrs → **no dedicated check** (see below); naming case → `name-conventions`; `print()` → `print`; macro `name=` param → `unnamed-macro`; keyword-only macro/rule calls → `positional-args`; file order / `package()` position → `package-on-top`; formatting itself (quotes, blank lines, `:`-prefixing, kwarg spacing) → `buildifier -mode=check`/`fix` (the formatter, not a warning); glob with no wildcard → `constant-glob`; struct-return from rule impls → `rule-impl-return`; provider fields+doc → `provider-params`; some-paths-return / use-before-init → `return-value`, `uninitialized`; unreachable code → `unreachable`; native module in BUILD → `native-build`; `native.package()` in `.bzl` → `native-package`.

**No mechanical check — reading heuristic only** (confirmed by absence from all 99 categories and from both style guides' own text): `doc=` presence on every `attr.*()` (M-A-01 — buildifier checks *function* docstrings, never attribute-level `doc=`; the map's own workaround is "buildifier `function-docstring` + a paren-balance scan," which is a heuristic, not a warning); DAMP-vs-DRY judgment; visibility scoping tightness / no `default_visibility = public`; dependency directness (requires build-graph knowledge, not lint — a `bazel query` job, not buildifier's); no shared dependency-list variables (M-A-21 — "a list variable used by more than one target," grep-and-judge); recursive-glob avoidance (no buildifier category exists for `**` specifically; `constant-glob` catches a different smell); list-comprehension-generates-targets at BUILD top level; string literal vs concatenation for anything other than dicts (`dict-concatenation` exists, general string concatenation does not); label-never-split; minimal `.bzl` symbol export (M-A-22 — "no mechanical check exists; grep-and-judge only," per the map, confirmed); target naming conventions (`_test` suffix, no `_lib`, reserved names) — a naming-taste rule, not a linter category; `.bzl` private-tree `visibility()` load-gate (M-A-16 — distinct from the `bzl-visibility` warning, which enforces the directory-*name* convention `private`/`internal`, not the explicit `visibility()` builtin call; the grep `grep -L '^visibility(' <dir>/*.bzl` returning nothing is the only available check, and it is a heuristic, not a buildifier warning); boolean-not-integer convention (no dedicated category — `True`/`False` literalness is unchecked by name, only caught incidentally if it trips `no-effect` or similar).

## Decisions

**1. The shipped warning set: default, not `all`, not an explicit list — plus one opt-in.**
Evidence: `all` differs from `default` by exactly one warning (`unsorted-dict-items`), which upstream itself opts out of for diff-noise reasons stated in its own source comment (`warn.go:224-225`). An explicit list would need manual upkeep on every `buildtools` bump — `DefaultWarnings` is computed from `AllWarnings` at build time, so a consumer that leaves `lint_warnings` unset automatically inherits every *new* warning a future buildifier release adds; an explicit list does not. **Decision: leave `lint_warnings` unset (inherits `default`), and separately opt in `unsorted-dict-items` via `lint_warnings = ["+unsorted-dict-items"]`** for the `tag_class()`/`attr()` dict literals in `extensions.bzl` (4 `tag_class()` sites), where sorted keys make a large mapping table scannable. Assumption named: this trades a small amount of unavoidable diff churn on the next tag-class edit for readability; if that churn proves annoying in practice, drop the opt-in — it is one line to revert.

**2. The gate configuration: it already works — say so, and say exactly why.**
Evidence: sections 5 above (source trace + live binary run + fleet grep of `taskfile.yml`/`ci.yml`, no exit-code suppression found). **Decision: the rule states plainly that `mode="diff"` + `lint_mode="warn"` invoked via `bazel run` (not `buildifier_binary` directly, not piped through `|| true`) is already a hard gate**, and that the exact mechanism is CI-tool-agnostic — any wrapper that does not swallow the invocation's exit code inherits this behaviour. Assumption named: this holds only for `buildifier()`/`buildifier_test()` from `buildifier_prebuilt`; a hand-rolled wrapper around the raw binary, or one that pipes to `tee`/parses stdout instead of checking `$?`, could still be soft. The rule's verification (below) checks the actual exit code, not the attribute names, so it survives either wrapper.

**3. The ~15-versus-remainder promotion table.** See the table in [Normative guidance candidates](#normative-guidance-candidates) — 13 candidates below are promoted to their own numbered rule (each independently checkable, each a distinct failure mode); the remaining ~85 buildifier categories are covered by one rule (BZL-LARK-01, "run buildifier with the default+unsorted-dict-items warning set") naming the single invocation, because promoting each of them individually would just restate `WARNINGS.md` as prose.

**4. Style-guide rules with no check become reading heuristics, not verifications** — listed in full in §7 above. A rule built from one of these must say "no mechanical check; read the file and judge" rather than inventing a false-precision grep.

## Normative guidance candidates

Bazel majors: unless stated, all apply to Bazel 8.x and 9.x equally (buildifier's own linting is Bazel-version-independent; only the `--incompatible_*`-flag-linked warnings carry a version boundary).

1. **Run the lint gate through `bazel run`/`bazel test`, never through a wrapper that discards its exit code.** Rationale: `buildifier()`'s exit code already reflects both format drift and lint findings (§5); a `|| true` or a stdout-only check silently converts a hard gate into a soft one. Verify: `bazel run //:buildifier.check; echo $?` after seeding one `depset-union` violation in an already-formatted file — must be nonzero. Empty output (the command prints nothing) still reads as **fail** if `$?` is nonzero; do not gate on stdout. Severity: **MUST**. Applies: 8, 9; `buildifier_prebuilt` any version shipping `runner.bash.template`. Settles: M-A-02.

2. **Leave `lint_warnings` unset on every `buildifier()`/`buildifier_test()` target unless deliberately narrowing.** Rationale: an explicit list freezes the warning set at authoring time and silently misses every new check a future `buildtools` release adds; the default set updates itself. Verify: `grep -n "lint_warnings" BUILD.bazel **/BUILD.bazel` — every hit should be `["+unsorted-dict-items"]` or a documented narrowing, never a bare comma list reproducing the default. Empty output (no `lint_warnings` at all) reads as **pass**. Severity: SHOULD. Applies: 8, 9; buildifier ≥ current. Settles: M-A-03, M-A-04.

3. **Opt in `unsorted-dict-items` for any `.bzl` file defining `tag_class()`s or large `attr()` dicts.** Rationale: the one warning upstream disables by default is disabled for diff-noise reasons that do not apply to rarely-edited schema tables. Verify: `lint_warnings = ["+unsorted-dict-items"]` present on the target covering that file; then `bazel run //:buildifier.check` — a real out-of-order dict must now fail. Empty output on the disable check reads as **finding** (not opted in). Severity: CONSIDER. Applies: 8, 9. Settles: M-A-04.

4. **Never cite `load-on-top`, `out-of-order-load`, `same-origin-load`, or `attr-package-metadata` as a live, suppressible lint category.** Rationale: all four are gone from `warn.go`'s maps; the first three are unconditional formatter rewrites now, the fourth is a dead attribute-naming rule. A `# buildifier: disable=load-on-top` comment does nothing today. Verify: `grep -rn "buildifier: disable=\(load-on-top\|out-of-order-load\|same-origin-load\|attr-package-metadata\)"` over the repo — any hit is dead code cruft, safe to delete. Empty output reads as **pass**. Severity: MUST (do not write these into new guidance); SHOULD (clean up if found). Applies: 8, 9; current buildifier. Settles: M-A-03.

5. **Before citing any `--incompatible_*` flag from `WARNINGS.md` as still flippable, re-verify it exists in the current Bazel.** Rationale: several of the flags `WARNINGS.md` names for Starlark-migration-era warnings (`depset-union`, `depset-iteration`, `integer-division`, `ctx-args`, `package-name`) have been deleted from Bazel's own source; the flag column is provenance, not a live switch. Verify: `gh api "search/code?q=<flag>+repo:bazelbuild/bazel"` returns 0 → treat as historical only; nonzero → still current. Empty search result reads as **historical, do not cite as flippable**. Severity: SHOULD (documentation hygiene). Applies: 8, 9. Settles: M-A-03.

6. **Every native `cc_*`/`java_*`/`proto_library` call in a `.bzl` or `BUILD` file that agent-generated code touches must carry (or already have) an explicit `load()` from the matching Starlark ruleset.** Rationale: `--incompatible_autoload_externally` defaults to the empty string as of Bazel 9.0.0 — native C++/Java/proto rules are gone from the global namespace unless loaded ([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)); buildifier's `native-cc-*`/`native-java-*`/`native-proto-*` families flag exactly this and auto-fix it (`WARNINGS.md:787-825` etc, "Automatic fix: yes"). Verify: `bazel run //:buildifier.check` on Bazel 9, or `buildifier -lint=warn --warnings=native-cc-binary,native-cc-library,native-java-library,native-proto` explicitly. Empty output reads as **pass** on 9; on 8 the same code may still build via autoload, so absence of a finding on 8 does not prove 9-readiness — run the check under a Bazel-9 toolchain. Severity: MUST (Bazel 9), SHOULD (Bazel 8, forward-compat). Applies: 8 (SHOULD), 9 (MUST); rules_cc/rules_java/rules_proto current. Settles: M-A-03.

7. **Do not trust `native-py`'s or `native-sh-*`'s absence of a flag/finding as proof those rules are autoload-safe on Bazel 9.** Rationale: `native-py`'s own doc text ("plans… have been postponed… not required to load Starlark rules," `WARNINGS.md:1044-1046`) predates Bazel 9's `--incompatible_autoload_externally` default flip and has not been updated; `native-sh-*` cites no flag at all. Verify: attempt an actual `bazel build` under Bazel 9 with a bare `py_library`/`sh_binary` and no `load()` — a real build failure, not a buildifier finding, is the ground truth here. Empty buildifier output does **not** read as pass for this specific family. Severity: MUST read this as a known linter gap, not a false negative. Applies: 9 only. Settles: M-A-03.

8. **Flag (don't silently accept) any `provider()` call missing `fields` or a doc string.** Rationale: undeclared fields make a later field addition a breaking change by construction — callers using undeclared fields become invalid the moment fields are declared. Verify: buildifier `provider-params` (on by default). Empty output reads as **pass**. Severity: SHOULD (0 providers exist in `rules_ocx` today — this is a pin for the first one, not a current fix). Applies: 8, 9. Settles: M-A-09.

9. **Flag any rule/macro call site using positional arguments beyond the five buildifier exempts.** Rationale: positional args break silently on argument reordering or removal, and are the named blocker for a later legacy→symbolic macro migration ([bzl-style guide](https://bazel.build/rules/bzl-style)). Verify: buildifier `positional-args` (on by default; exempts `load()`, `vardef()`, `export_files()`, `licenses()`, `print()` — `WARNINGS.md:328-334`). Empty output reads as **pass**. Severity: SHOULD. Applies: 8, 9. Settles: M-A-15.

10. **Flag a rule implementation function returning a bare `struct` instead of declared providers.** Rationale: legacy-provider syntax is permanently deprecated (`--incompatible_disallow_struct_provider_syntax` is a documented no-op as of Bazel 9.0, per the frame's wave-1 correction) and buildifier still catches the pattern by name. Verify: buildifier `rule-impl-return`. Empty output reads as **pass**. Severity: MUST for any new rule; SHOULD for existing code. Applies: 8, 9. Settles: M-A-08.

11. **Flag a depset built inside a loop with itself listed in `transitive`.** Rationale: named the sharpest silent-O(N²) trap in `bazel.build/rules/performance`; no `--incompatible_*` flag will ever catch it because it is a performance smell, not a compatibility break. Verify: buildifier `overly-nested-depset`. Empty output reads as **pass**. Severity: SHOULD. Applies: 8, 9. Settles: M-A-05.

12. **Every public `.bzl` symbol needs a docstring only once it reaches 5 statements; below that, absence is not a finding.** Rationale: `function-docstring`'s own stated threshold (`WARNINGS.md:576`) — a rule that demands docstrings on every one-line helper over-applies the check and produces noise an agent will learn to ignore. Verify: buildifier `function-docstring`/`-header`/`-args`/`-return`. Empty output on a ≤4-statement function reads as **pass by exemption**, not as a missed check. Severity: MUST (respect the threshold, do not over-flag). Applies: 8, 9. Settles: M-A-01.

13. **`attr.*()` `doc=` presence has no buildifier check — verify it with a paren-balance/regex scan, not by trusting a clean `buildifier` run.** Rationale: `function-docstring` checks function bodies, never attribute definitions; a `buildifier -lint=warn` pass with zero findings says nothing about attr-doc coverage (§7). Verify: a scan matching every `attr\.\w+\(` call and confirming a `doc\s*=` keyword appears before its closing paren (the map's own heuristic; `rules_ocx` measures 51/51 this way, not via buildifier). Empty output (scan finds an attr with no doc) reads as **finding**. Severity: SHOULD. Applies: 8, 9. Settles: M-A-01.

14. **A `.bzl` file under a `private/` tree should declare an explicit `visibility()` load-gate — buildifier's `bzl-visibility` checks the directory-name convention, not this.** Rationale: BUILD-target visibility does not gate `load()`; two different mechanisms exist (directory naming, checked; the `visibility()` builtin, not checked) and conflating them leaves a private `.bzl` loadable from anywhere. Verify: `grep -L '^visibility(' <dir>/*.bzl` for every file under a directory literally named `private` or `internal` — must print nothing. Non-empty output (a file listed) reads as **finding**. Severity: SHOULD. Applies: 8+ (the `visibility()` builtin). Settles: M-A-16.

15. **A shared list variable referenced as `deps`/`srcs` by more than one target inverts the BUILD-vs-`.bzl` style split and has no mechanical check.** Rationale: `bazel.build/build/style-guide` explicitly prefers DAMP (repetition) over DRY in BUILD files for reviewability; a shared variable is the named anti-pattern, but nothing lints for it. Verify (reading heuristic, not a command): grep for a top-level list assignment in a BUILD file, then grep its name used in ≥2 rule calls — any hit is worth a second look, not an automatic fail. Empty output (no shared variable found) reads as **pass**. Severity: CONSIDER. Applies: 8, 9 (style guide unversioned). Settles: M-A-21.

16. **A `.bzl` file exporting more public symbols than any single caller uses together has no mechanical check either — grep and judge.** Rationale: matches the map's own conclusion (M-A-22): excessive exports force unrelated consumers into the same dependency edge, but there is no buildifier category for "used-together" analysis. Verify (heuristic): for each public (non-`_`-prefixed) top-level symbol in a `.bzl`, `grep -rn` its name across consumers and note whether any consumer loads more than one symbol from the file — clustering the same pair repeatedly is fine, isolated single-symbol loads across many files suggest a split. Empty output is not meaningful here (this is a judgment call, not a pass/fail command). Severity: CONSIDER. Applies: 8, 9. Settles: M-A-22.

17. **Flag a function with a some-but-not-all-paths return, or a local read before every branch assigns it.** Rationale: both are real correctness bugs with no `--incompatible_*` flag behind them — an implicit `None` return mixed with an explicit `return value` elsewhere silently changes a caller's behaviour depending on which branch ran. Verify: buildifier `return-value` and `uninitialized` (both on by default, no autofix). Empty output reads as **pass**. Severity: MUST (these are bugs, not style). Applies: 8, 9. Settles: M-A-20.

## Fleet evidence

- `rules_ocx/BUILD.bazel:6-18` — both `buildifier()` targets, exactly as the brief names them: `buildifier.fix` (`mode="fix"`, `lint_mode="fix"`) and `buildifier.check` (`mode="diff"`, `lint_mode="warn"`). Neither sets `lint_warnings`, so both run the bare default (98 warnings, no `unsorted-dict-items`).
- `rules_ocx/taskfile.yml:20-25` and `.github/workflows/ci.yml:16-31` — `task lint` runs `bazel run //:buildifier.check` first, with no error suppression; the Lint job runs `task lint` with no `continue-on-error`. This is the evidence for Decision 2 / candidate 1 above: the gate is already hard.
- `rules_ocx/.claude/rules/starlark.md:9` asserts "buildifier clean (`task format` / CI check)" and "Attribute docs on every attr" as prose claims — both are now backed by a concrete, re-runnable check (candidates 1 and 13) rather than resting on the map's earlier "31 of 45 claims carry no re-runnable verification" finding (`config-inventory.md`, cited via the topic map's conflict resolution 9).
- Four `# buildifier: disable=` suppressions, all justified: `launcher_test.bzl:72,100,159` (`unused-variable`, on parameter names that must match `repository_ctx`'s real signature — a legitimate constraint, not a symptom of dead code) and `package.bzl:199` (`print`, a deliberate user-facing digest-pin hint, matching the exact case `WARNINGS.md`'s `print` warning calls out as *not* what it's for — a message the maintainer, not a spammy debug trace). No smell found among the four; `rules_ocx` is again the exemplar the map's conflict 9 already established.
- 0 `provider()` calls exist in `rules_ocx` (`shape` audit) — candidate 8 above ships as a forward pin, not a current fix.
- `rules_ocx` sets `buildifier_prebuilt` as a Bazel-native dev dependency because buildifier itself is not yet in the OCX catalog (`AGENTS.md:272-273`) — an orthogonal fact from `config-inventory.md` §Headline 8: `bazel`/`bazelisk`/`buildifier`/`buildozer` *are* published OCX packages elsewhere (`ocx-contrib/mirror-bazelbuild`), just not consumed by `rules_ocx`'s own build. Not a defect; noted so a later `bazel-adopt` pass doesn't assume buildifier provisioning is unsolved fleet-wide.
- Cargo/pyproject/package.json hygiene inside a Bazel-adopting repo: covered by `rust-cargo`, `python-packaging`, `typescript-packaging` respectively — not re-derived here.

## AI-agent angle

- **Writing `native.cc_library(...)` or a bare `cc_library(...)` with no `load()` and assuming it works because it did in training data.** This built fine on every Bazel up to 8.x via autoload; on Bazel 9 the native symbol is simply gone (`--incompatible_autoload_externally` defaults empty). Smallest check: `bazel run //:buildifier.check` under a Bazel-9 toolchain — the `native-cc-*` family auto-fixes this by inserting the right `load()`, so the fix is one command, but only if the agent runs it under 9, not 8.
- **Assuming a clean `buildifier -lint=warn` run proves the file is fully compliant.** It proves compliance with 99 specific patterns, not with the ~45-50 style-guide items that have no linter category (visibility scoping, dependency directness, DAMP-vs-DRY, symbol-export minimalism, `attr()` doc coverage). An agent that treats "buildifier passed" as "style guide satisfied" will ship BUILD files that are mechanically correct and structurally wrong. Smallest check: run the §7 list as a manual review pass, not a command — there is no substitute command to add.
- **Citing a `--incompatible_*` flag from memory or from `WARNINGS.md`'s flag column as something a user can still flip.** Several of those flags (`depset_union`, `disallow_slash_operator`, `bzl_disallow_load_after_statement`, and others) no longer exist in Bazel's source at all — passing `--noincompatible_depset_union` on the command line today is a silent no-op flag-not-found or outright unrecognized-option error, not a working escape hatch. Smallest check: `gh api "search/code?q=<flag>+repo:bazelbuild/bazel"` before writing the flag into any guidance, or check the live command-line reference.
- **Suppressing a lint finding with `# buildifier: disable=load-on-top` (or `out-of-order-load`, `same-origin-load`, `attr-package-metadata`) expecting it to change behaviour.** These four categories are gone from the linter; the comment is inert. Smallest check: `grep -rn "buildifier: disable="` and cross-reference every disabled category name against the current `warn.go` maps (or just against the four-name deny-list above) — any hit against the deny-list is dead code, safe to delete.
- **Treating `mode="diff"` + `lint_mode="warn"` as "report-only, won't break CI" by analogy to a typical linter's warn/error split.** As shown in §5, it already fails CI. An agent asked to "add a non-blocking lint check" using this exact configuration will accidentally add a blocking one. Smallest check: run the target once with a deliberately introduced violation before declaring a gate non-blocking — do not infer blocking behaviour from the attribute name.
- **Assuming buildifier enforces 79-character line length like a Python formatter.** The `.bzl` style guide states the 79-character guideline explicitly but says it "should not be enforced strictly," and buildifier's formatter does not wrap lines at all — it preserves whatever line breaks the author chose. An agent "fixing" line length by hand-wrapping a `.bzl` file is solving a problem the tool never had a check for, and may fight the next `buildifier -mode=fix` pass, which does not un-wrap it either (formatter is idempotent on line breaks it didn't introduce).

## Contested / evolving

- **Whether the buildifier gate is a gate was contested inside this very research program, not just in the wild.** Two independent wave-1 sources agreed on "soft, non-blocking" by reading configuration prose; this dive reverses that on source trace plus a live binary run. As of 2026-09-05 this dive's reading should be treated as authoritative for this fleet — but it is worth re-verifying against any future `buildifier_prebuilt` release, since a hypothetical future version could add an explicit `ignore_lint_failures` attribute that changes this. No such attribute exists in the version fetched (`main` branch, 2026-09-05).
- **Whether buildifier's own `WARNINGS.md` will catch up with Bazel 9's autoload defaults for Python and shell rules.** `native-py`'s prose is stale relative to the 9.0.0 release notes; `native-sh-*` has never carried a flag citation at all, and it is not clear from any source read whether sh_* rules are actually exempt from `--incompatible_autoload_externally` or whether buildifier simply hasn't been updated. Trend: the `native-cc-*`/`native-java-*`/`native-proto-*` families were updated for the flag; Python and shell lag. Treat a clean `native-py`/`native-sh-*` result as inconclusive on Bazel 9 until confirmed with a real build, not as proof.
- **Which of the ~56 unflagged warnings are candidates for a future `--incompatible_*` flag versus permanent style-only status is not stated anywhere in the source** — `WARNINGS.md` does not distinguish "pure style, will never become a flag" from "not yet flagged, might become one." Treat the presence-or-absence of a flag citation as the only available signal, re-checked at whatever cadence a rule set re-fetches `WARNINGS.md`.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [buildtools `WARNINGS.md`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md) | Primary — the full warning catalogue, fetched raw and verbatim | `main` branch, fetched 2026-09-05 | The only authoritative source for exact category names, flag citations, and "not supported" markers |
| [`warn/warn.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/warn/warn.go) | Primary — the three warning registries and `nonDefaultWarnings` | `main`, 2026-09-05 | Ground truth for which warnings exist and which is off by default; doc text can drift, this cannot |
| [`buildifier/buildifier.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/buildifier/buildifier.go) | Primary — CLI entry point, exit-code logic, mode switch | `main`, 2026-09-05 | Source of the exit-code-4-on-lint-finding behaviour that settles the gate question |
| [`buildifier/config/validation.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/main/buildifier/config/validation.go) | Primary — `ValidateModes`/`ValidateWarnings`, the flag-default resolution | `main`, 2026-09-05 | Confirms default lint mode `off` and empty-`-warnings`-resolves-to-`DefaultWarnings` behaviour exactly |
| [`buildifier/utils/utils.go`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/buildifier/utils/utils.go) | Primary — the `Lint()` dispatcher | `main`, 2026-09-05 | Shows `lint="warn"` returns real findings (not swallowed) versus `lint="fix"` mutating in place |
| buildtools v8.5.1 `buildifier` binary, run directly | Primary/measured — empirical exit-code test | Release 2026-01-30, run 2026-09-05 | The actual proof that a lint-only finding (no format diff) still exits 4 |
| [`keith/buildifier-prebuilt` `factory.bzl`/`rules.bzl`/`runner.bash.template`](https://raw.githubusercontent.com/keith/buildifier-prebuilt/main/buildifier/factory.bzl) | Primary — the Bazel rule wrapping the binary | `main`, 2026-09-05 | Shows exactly how `mode=`/`lint_mode=` attrs become CLI flags, and how `find -exec … +` collapses exit codes |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Primary — GitHub release, the authoritative current-behaviour source | Tagged 2026-01-20 | Confirms `--incompatible_autoload_externally` default-empty and the C++ native-rule removal, dated |
| [`.bzl` style guide](https://bazel.build/rules/bzl-style) | Primary — official style guide (fetched rendered) | Live page, fetched 2026-09-05 | One of the two guides the brief names explicitly |
| [BUILD Style Guide](https://bazel.build/build/style-guide) | Primary — official style guide (fetched rendered) | Live page, fetched 2026-09-05 | The other guide the brief names explicitly |
| [buildifier README, Linter section](https://github.com/bazelbuild/buildtools/blob/main/buildifier/README.md#linter) | Primary — the project's own summary of default-warning policy | `main`, 2026-09-05 | Independent confirmation, in prose, of the `nonDefaultWarnings` mechanism read from source |
| GitHub code search, `bazelbuild/bazel` (`gh api search/code`) | Primary/measured — live repository search | Queried 2026-09-05 | The evidence that several `--incompatible_*` flags `WARNINGS.md` cites are gone from Bazel's own source |
| `rules_ocx/BUILD.bazel`, `taskfile.yml`, `.github/workflows/ci.yml` | Fleet — the actual gate under audit | Repo state 2026-09-05 | The concrete configuration the whole gate-question finding is tested against |
| `rules_ocx/.claude/rules/starlark.md`, `AGENTS.md` | Fleet — existing normative prose | Repo state 2026-09-05 | Source of the "buildifier clean" and "attr docs" claims this dive turns into verifiable checks |
| `bazel-topic-map.md` — conflict 8, conflict 18, family-A rows M-A-01…M-A-22 | Internal — the commissioning document | 2026-09-05, phase 3 | States the questions this dive answers and the wave-1 resolution it overturns (conflict 18) |

