---
title: The CMake language — parser fix, corpus counts and measured traps
topic: cmake-language
agent: cmake-language-dive (wave 3)
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 18
scope: |
  CMK-LANG family only: the rules behind cmake-build/language.md — quoting
  and dereferencing in if()/foreach(), macro vs function, cmake_parse_arguments
  ARGN-vs-PARSE_ARGV, hand-joined lists, option()/CMAKE_* naming, and the
  cache/scope semantics already measured by cmake-versions-and-gate. Does not
  cover target-based design, install/export, find_package, providers, presets,
  Conan/vcpkg, or the Bazel seam — those are cmake-consumable-library.md,
  cmake-dependency-seam.md, cmake-package-managers.md, cmake-versions-and-gate.md
  and the shipped BZL-CC rows, cited but never restated here.
---

## Table of contents

1. [Findings](#findings)
   1. [The parser fix, proven on 3 fixtures](#1-the-parser-fix-proven-on-3-fixtures)
   2. [M-C-01/M-C-02 — cache precedence and CMP0126 (cited, not re-measured)](#2-m-c-01m-c-02--cache-precedence-and-cmp0126-cited-not-re-measured)
   3. [M-C-03 — unquoted if() comparisons and bare foreach](#3-m-c-03--unquoted-if-comparisons-and-bare-foreach)
   4. [M-C-04 — macro vs function](#4-m-c-04--macro-vs-function)
   5. [M-C-05 — PARENT_SCOPE, return(PROPAGATE), block() (cited, not re-measured)](#5-m-c-05--parent_scope-returnpropagate-block-cited-not-re-measured)
   6. [M-C-06 — cmake_parse_arguments: ARGN form vs PARSE_ARGV](#6-m-c-06--cmake_parse_arguments-argn-form-vs-parse_argv)
   7. [M-C-07 — generator expressions consumed at configure time (heuristic only)](#7-m-c-07--generator-expressions-consumed-at-configure-time-heuristic-only)
   8. [M-C-08 — hand-joined lists and separate_arguments](#8-m-c-08--hand-joined-lists-and-separate_arguments)
   9. [M-C-09 — option()/variable naming and the project prefix](#9-m-c-09--optionvariable-naming-and-the-project-prefix)
   10. [M-C-10 — option() coerces the type only (cited, not re-measured)](#10-m-c-10--option-coerces-the-type-only-cited-not-re-measured)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Two real parser bugs, both fixed and proven on 3 fixtures**: bracket comments (`#[[ ]]`, `#[=[ ]=]`) were not stripped, and paren-balancing ignored quoted strings — both let corpus content desync the call extractor. Fixed script: `/home/mherwig/.cache/cmake-measure-scratch/cmake-language/parse_fixed.py`.
- The fix moved Kitware's own unquoted-`if()` count from 128 (wave 2, buggy parser) to **127** (this wave) — a small, real, single-line delta, not a rewrite of wave 2's conclusion.
- **M-C-03 is MUST, 0/30 false positives on hand check.** 557 unquoted `${var}` comparisons in `if()`/`elseif()`/`while()` and 1,650 bare `foreach(x ${list})` calls across the corpus (core+scaffold, CMake ≥ 3.0, no version gate).
- CMP0054 (removed 4.0, permanently NEW) governs **quoted/bracketed** if() arguments only. It does **not** touch M-C-03's trap: an **unquoted** `${var}` is still subject to if()'s own short-form variable dereference on 4.4.2 today, so a value that happens to look like another variable name is double-dereferenced regardless of CMP0054.
- **M-C-04 is SHOULD/heuristic, not MUST.** 1,228 macros; 616 (50%) show a function-incompatible shape (`return()`, `ARGN` reuse, a bare caller-scope `set()`). Hand-read 15: every `return()`-using macro sampled needed macro semantics on purpose (CMake's own `find_dependency()`) — the row is "flag for review", never "macro is wrong".
- **The flagship surprise**: Qt6's own `qt6_standard_project_setup()` (`qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3786`) parses its arguments under prefix `__qt_sps_arg`, correctly detects `__qt_sps_arg_UNPARSED_ARGUMENTS`, then interpolates the wrong variable, `${arg_UNPARSED_ARGUMENTS}` (undefined), into its own `FATAL_ERROR` — a copy-paste prefix mismatch that silences the diagnostic's payload in Qt's own recommended one-line CMake entry point.
- **M-C-06: PARSE_ARGV is already the majority form (462/986, 47%), but the ARGN form still checks nothing most of the time.** Of 524 ARGN-form calls, 317 (60%) never reference `<prefix>_UNPARSED_ARGUMENTS` and 523 (99.8%) never reference `<prefix>_KEYWORDS_MISSING_VALUES` within the next 60 lines.
- CMake's own shipped `find_dependency()` macro (`Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:79`) forwards its own `${ARGN}` unquoted into `find_package()` — per the measured trap ([gate] §9), a semicolon-bearing component list is silently mis-split and an explicit empty-string argument silently vanishes before `find_package()` ever sees it.
- **M-C-08 is confirmed P2/heuristic, not measurable as a MUST.** The "hand-joined list" regex has a real, sampled false-positive rate: of 15 hand-read hits, roughly two-thirds are natural-language help strings or MIME/C-snippet content containing a literal `;`, not CMake list literals.
- `separate_arguments(... NATIVE_COMMAND)` is the correctly-used idiom everywhere it appears (8/8 sampled, all in Kitware `Find*.cmake` modules turning a compiler-flag string into argv).
- **M-C-09: the true CMAKE_*-prefixed-option violation count outside CMake's own repo is 2, not 28.** 26 of 28 hits are Kitware/CMake's own top-level options (`CMAKE_USE_SYSTEM_CURL`, `CMake_BUILD_LTO`, …) — legitimate, since CMake's own project prefix is `CMAKE`/`CMake`. The two real violations are vendored upstream recipes inside vcpkg's `ports/` tree redefining CMake's own `CMAKE_VERBOSE_MAKEFILE` and `CMAKE_UNITY_BUILD` as if they were project options.
- The single-dominant-prefix heuristic for "is this option prefixed" collapses on monorepos exactly as the brief warned: it flags 258/391 (66%) of LLVM's options and 166/250 (66%) of Kitware/CMake's as "unprefixed" purely because each vendors multiple sub-projects with their own valid prefixes (`CLANG_`, `MLIR_`, `CURL_`, `ZLIB_`…) — the check must be scoped per vendored subtree, never repo-wide, on a monorepo.
- M-C-01, M-C-02, M-C-05, M-C-07 and M-C-10 are answered entirely from `cmake-versions-and-gate/gate-and-language-semantics.md`'s §5/§8/§9 measurements and are cited, not re-measured, per the brief.
- Non-negotiables for the `cmake-build` index: M-C-03 (unquoted if/foreach) and the CMAKE_*-option-name half of M-C-09. Everything else in this family is SHOULD or a named reading heuristic.

## Findings

### 1. The parser fix, proven on 3 fixtures

`.agents/research/cmake-consumable-library/scratch/consumable-library-targets/parse.py` (wave 2) had two bugs, both confirmed by reading its source:

1. `strip_comment()` stripped only `#`-to-end-of-line comments, per physical line ([source](file:///home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-consumable-library/scratch/consumable-library-targets/parse.py) lines 56–72). A **bracket comment** — `#[[ ... ]]` or `#[=[ ... ]=]`, [cmake-language.7.rst §Comments](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-language.7.rst) — is not terminated by a newline and was left completely untouched, so its content (which can contain `(`, `)`, `"`, `#`, and call-shaped text) leaked into the text fed to the call extractor.
2. `extract_calls()` balanced parens by counting every literal `(`/`)` between a call name and its close, with **no notion of "this paren is inside a quoted argument"** (source lines 110–136). A quoted argument containing an unbalanced `(` or `)` — legal per [cmake-language.7.rst §Quoted Argument](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-language.7.rst), which explicitly allows `(`/`)` inside a quoted string — desyncs the depth counter.

Fix, `parse_fixed.py` (this dive, `/home/mherwig/.cache/cmake-measure-scratch/cmake-language/parse_fixed.py`, copy at `.agents/research/cmake-language/scratch/language-parser/parse_fixed.py`): a single whole-file pass (`clean_text`) that tracks quote state across the **entire file**, not per physical line — this also stops the old code's incidental bug of resetting quote-state at every newline, so a quoted argument that legitimately spans multiple lines (explicitly documented, same manual, "This is a quoted argument containing multiple lines") no longer desyncs comment-stripping either. `extract_calls()` re-tracks the same quote state while balancing parens, and additionally skips bracket-**argument** spans (`[[...]]`/`[=[...]=]`, [Bracket Argument](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-language.7.rst)) for the same reason — the two named bugs are quote- and bracket-shaped instances of one root cause: no notion of "this run of source is one opaque cmake-language token".

Proof, 3 planted fixtures under `.agents/research/cmake-language/scratch/language-parser/fixtures/` (also `/home/mherwig/.cache/cmake-measure-scratch/cmake-language/fixtures/`), run via `python3 parse_fixed.py --demo`:

```
$ python3 parse_fixed.py --demo
demo: all 3 fixtures pass (old parser fails each one, new parser fixes each one)
```

- Fixture 1 (`01_bracket_comment_simple.cmake`): a `#[[ ... should_not_see_this(unbalanced ... ]]` bracket comment ahead of `real_call(fine)`. Old parser: `should_not_see_this` appears in the extracted call list (the comment's content leaked through). New parser: only `real_call` is seen.
- Fixture 2 (`02_bracket_comment_equals.cmake`): a `#[=[ ... ]] ... ]=]` comment whose body contains a literal `]]` that must not close it early (bracket length must match). New parser correctly reads only `real_call` past the whole `#[=[...]=]` span.
- Fixture 3 (`03_quoted_unbalanced_paren.cmake`): `message("unbalanced (")` followed by `set(REAL_MARKER ...)`. Old parser: the depth counter, still open from the quoted `(`, keeps consuming and the `message()` call's captured `args_raw` contains `REAL_MARKER` — the following statement was swallowed. New parser: `message()` and `set()` are extracted as two separate, correctly-bounded calls.

This is a `--demo` self-check, not a test framework: `assert`-based, run standalone, fails loudly if either bug regresses.

### 2. M-C-01/M-C-02 — cache precedence and CMP0126 (cited, not re-measured)

Per the brief, folded verbatim from `.agents/research/cmake-versions-and-gate/gate-and-language-semantics.md` §5, measured on CMake 3.31.12 and 4.4.2, same build dir across reconfigures:

- `set(X ... CACHE STRING ...)` **without `FORCE`** does not update an existing cache entry on reconfigure. `set(Y ... CACHE INTERNAL ...)` **does** overwrite it every time — `INTERNAL` implies `FORCE`, matching [set.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/set.rst): "Use of this type implies `FORCE`."
- **CMP0126** (3.21): `NEW` leaves a same-named normal variable in place after `set(... CACHE)`, silently shadowing the value that was just written to the cache; `OLD` removes the normal variable so the cache write becomes visible. Both directions print a `CMake Deprecation Warning` on 3.31.12 and 4.4.2 — CMP0126 is itself deprecated.
- **Precedence**: `-D` beats a preset's `cacheVariables`, which beat `option()`'s own default; a later plain `set()` (no `CACHE`) in the same listfile shadows all of them for subsequent reads in that scope while leaving the on-disk cache entry untouched.
- A second, minor landmine folded into M-C-10 below: `option()` claims the `BOOL` cache **type** for a pre-existing untyped entry but never validates or coerces the entry's **value**.

No re-measurement performed; see [gate] §5 for the full fixture set and exact command transcripts.

### 3. M-C-03 — unquoted if() comparisons and bare foreach

**Regex** (unchanged from wave 2's compound-identifier refinement, which cut Kitware's naive-regex hit count 501 → 128 per the topic map's conflict log — cited, not re-derived):

```python
UNQUOTED_VAR_COMPARE_RE = re.compile(
    r"(?<![A-Za-z0-9_}])\$\{[A-Za-z_][A-Za-z0-9_]*\}(?![A-Za-z0-9_{])"
    r'[^"]{0,40}?\b(STREQUAL|MATCHES|EQUAL|VERSION_(LESS|GREATER|EQUAL)[A-Z_]*)\b'
)
BARE_FOREACH_RE = re.compile(r"^\s*[A-Za-z_][A-Za-z0-9_]*\s+\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*$")
```

Run on the fixed parser's cleaned text of every `if()`/`elseif()`/`while()`/`foreach()` call, corpus-wide, `core`+`scaffold` buckets only (`vendored` and Kitware `Tests/`+`Help/` excluded and reported separately):

```
$ python3 parse_fixed.py   # writes per_repo_counts.json, examples.json
```

| Metric | Count | Denominator |
|---|---|---|
| Unquoted `${var}` in `if`/`elseif`/`while` comparison | **557** | 43,962 `if`/`elseif`/`while` calls |
| Bare `foreach(x ${list})` | **1,650** | 4,097 `foreach` calls (40.3%) |

Per-repo, where it varies (core+scaffold; full table in `per_repo_counts.json`):

| Repo | Unquoted if-compare | if-total | Bare foreach | foreach-total |
|---|---|---|---|---|
| llvm/llvm-project | 151 | 6,340 | 454 | 730 |
| Kitware/CMake | 127 | 10,895 | 357 | 1,091 |
| qt/qtbase | 47 | 8,337 | 220 | 776 |
| KDE/extra-cmake-modules | 42 | 1,252 | 107 | 161 |
| microsoft/vcpkg | 30 | 7,787 | 77 | 599 |
| cpp-pm/hunter | 17 | 1,951 | 158 | 185 |
| apache/arrow | 16 | 1,409 | 86 | 101 |
| conan-io/conan-center-index | 22 | 1,009 | 50 | 64 |

`Kitware__CMake` moved from 128 (wave 2, buggy parser, `.agents/research/cmake-consumable-library.md` M-C-03 citation) to **127** here — the fix's real, small, corroborating delta, not a reversal.

**False-positive check**: hand-read 30 sampled hits (52 non-vendored `if`-compare + 25 non-vendored bare-foreach hits available in `examples.json`; sampled every-2nd/every-3rd for spread across repos). **0/30 false positives** — every sampled hit is a genuine unquoted `${var}` immediately adjacent to a comparison keyword or a genuine `foreach(x ${listvar})` with no `IN LISTS`/`IN ITEMS`/`RANGE`. Examples:

```
KDE__extra-cmake-modules:toolchain/specifydependencies.cmake:36: if(${extralibname} STREQUAL ${name})
KDE__extra-cmake-modules:tests/test_helpers.cmake:21: if(NOT ${varname} STREQUAL _value_var)
ClickHouse__ClickHouse:cmake/sanitize_targets.cmake:4: foreach(subdir ${subdirectories})
```

Known residual false-positive class in the regex (not observed in this sample, disclosed for honesty): a compound condition with two comparisons inside the 40-character lookahead window, e.g. `if(${A} AND B STREQUAL "x")`, could in principle attribute `B`'s `STREQUAL` to `${A}`. None of the 30 sampled hits have this shape.

**Why it's still a live trap in 4.4.2, independent of CMP0054**: CMP0054 (3.1, **removed in 4.0** — [CMP0054.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0054.rst)) stops if() from implicitly re-dereferencing a **quoted or bracketed** argument's already-expanded value. It says nothing about an **unquoted** argument. Per [if.rst §Condition Syntax](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/if.rst): "The `if` command has a special condition syntax that allows for variable references in the short form `<variable>` instead of `${<variable>}`." An unquoted `${A}` in `if(${A} STREQUAL "x")` expands first (ordinary Variable Reference expansion), producing plain unquoted text; if()'s own short-form rule then re-checks *that resulting text* against known variable names, before evaluating the comparison — a value that happens to equal another variable's name is double-dereferenced, on 4.4.2, today, regardless of CMP0054's removal. **CMP0054 fixed the quoted case; the unquoted case was never governed by it.**

### 4. M-C-04 — macro vs function

Definition-shape scan (`macro(` to its matching `endmacro(`, flagged if the body contains `return(`, references `ARGN`, or calls `set(<name> ...)` with no `PARENT_SCOPE` in the body — i.e. a shape that would behave differently, or not compile the same way, if rewritten as a `function()`):

```
$ python3 parse_fixed.py
```

| Metric | Count | % of 1,228 macros |
|---|---|---|
| Total macros (core+scaffold) | 1,228 | — |
| …with `return()` in body | 20 | 1.6% |
| …referencing `ARGN` | 252 | 20.5% |
| …flagged on any axis | 616 | 50.2% |

Hand-read 15 (macros with `return()` and/or `ARGN`, across Kitware/CMake, KDE/extra-cmake-modules, ClickHouse, Qt and vcpkg):

| Macro | repo@sha:path:line | Classification |
|---|---|---|
| `find_dependency` | `Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:122` | **Needs macro.** `return()` at the end must exit the *including* `Config.cmake`'s scope, not just a helper's — only a macro's caller-scope `return()` does that ([return.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst): "If `return()` is called in a function, control is returned to the caller of that function... a macro... is expanded in place... `return()` in a macro body does not just terminate execution of the macro; rather, control is returned from the scope of the macro call"). As a `function()` this would silently stop returning control to the Config.cmake at all. |
| `__find_dependency_no_return`, `__find_dependency_common` | same file:79,108 | **Needs macro.** Both set `${dep}_FOUND` and friends for the *including* file to read afterward; a `function()` would need `PARENT_SCOPE` on every one and still couldn't propagate past its own caller if nested. |
| `find_dependency` (ECM fallback) | `KDE__extra-cmake-modules@b4c4ec9997:modules/ECMPackageConfigHelpers.cmake:139` | **Needs macro**, same reasoning — a hand-written reimplementation of Kitware's own macro for when the real module isn't found, same `return()`-from-includer idiom. |
| `ch_find_program` | `ClickHouse__ClickHouse@0995a518a8:cmake/tools.cmake:40` | **Needs macro.** Output-parameter idiom: `set(${var} ...)` where `var` is the caller-supplied *name* of the variable to fill, at the caller's own scope — the standard reason to reach for a macro instead of a function-plus-`PARENT_SCOPE`. |
| `add_glob`, `add_headers_and_sources` | `ClickHouse__ClickHouse@0995a518a8:cmake/dbms_glob_sources.cmake:1,5` | **Needs macro**, same output-parameter idiom (`list(APPEND ${cur_list} ...)` at the caller's scope). |
| `extract_into_parent_list` | `ClickHouse__ClickHouse@0995a518a8:cmake/dbms_glob_sources.cmake:16` | **Fragile, not (yet) broken.** Ends `set(${dest_list} "${${dest_list}}" PARENT_SCOPE)`. A macro has no scope of its own ([macro.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/macro.rst): "as if the macro body were pasted in place of the calling statement"), so `PARENT_SCOPE` here escapes whatever scope *textually contains the invocation*. All 11 real call sites (`grep -rn --include=CMakeLists.txt 'extract_into_parent_list' <corpus>/ClickHouse__ClickHouse`, empty output = none nested in a function) are directly at directory scope, so today it correctly targets the parent `add_subdirectory()` caller's scope. Move one call inside a helper `function()` and the same line would silently target *that function's caller*, one scope further out than the function's own body — with no diagnostic. |
| `CMAKE_FORCE_C_COMPILER`/`CXX`/`Fortran` | `Kitware__CMake@e8befb989b:Modules/CMakeForceCompiler.cmake:106,120,134` | **Needs macro** (deprecated API, but by design: sets `CMAKE_C_COMPILER` etc. as normal, caller-visible variables — the entire point of the macro). |
| `_cmifwarg` | `Kitware__CMake@e8befb989b:CMakeCPack.cmake:61` | **Needs macro.** Accumulates a caller-scope string variable (`${_cpifwrcconf}`) across repeated invocations at directory scope. |
| `ecm_find_package_parse_components` | `KDE__extra-cmake-modules@b4c4ec9997:modules/ECMFindModuleHelpers.cmake:117,176` | **Needs macro** (`return()` at line 176 exits the including `Find*.cmake` module on a bad dependency, same idiom as `find_dependency`), and **does the UNPARSED_ARGUMENTS check correctly** (`if(ECM_FPPC_UNPARSED_ARGUMENTS) message(FATAL_ERROR ...)`, contrast with M-C-06 below). |
| `_qt_internal_make_output_file` | `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:16` | **Could be a function.** Pure computation into `${outfile}`; no `ARGN`, no `return()`, one hop of caller-scope output would work identically via `function()` + `PARENT_SCOPE`. Written as a macro out of historical style, not necessity. |
| `qt6_standard_project_setup` | `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3763` | **Needs macro**-shaped caller visibility (sets policy/version state meant to affect the including project), but see the surprise below — its `cmake_parse_arguments` diagnostic is broken independent of the macro-vs-function question. |

In this 15-macro sample, **zero** are "should have been a function and the difference matters" bugs; the dominant pattern (11/15) is the legitimate caller-scope-output or caller-scope-return idiom the map's own row anticipated, one (`extract_into_parent_list`) is a latent-but-currently-safe `PARENT_SCOPE`-in-macro fragility, and one (`_qt_internal_make_output_file`) is a stylistic macro that could be a function with no behavior change. This confirms the map's framing: **M-C-04 is a reading heuristic, not a mechanical MUST** — `rg -n '^\s*macro\('` finds the candidates, but only a human (or the specific, narrow `return()`-in-macro sub-check below) can tell "needs it" from "doesn't".

**The flagship surprise** (chasing the brief's "quoting or ARGN forwarding drops an empty argument in a public function"): `qt6_standard_project_setup()` — Qt6's own documented, recommended one-line CMake entry point for every new Qt6 project —

```cmake
# qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3763-3786
macro(qt6_standard_project_setup)
    if(NOT QT_NO_STANDARD_PROJECT_SETUP)
        ...
        cmake_parse_arguments(__qt_sps_arg
            "${__qt_sps_args_option}"
            "${__qt_sps_args_single}"
            "${__qt_sps_args_multi}"
            ${ARGN}
        )
        if(__qt_sps_arg_UNPARSED_ARGUMENTS)
            message(FATAL_ERROR "Unexpected arguments: ${arg_UNPARSED_ARGUMENTS}")
        endif()
```

The `cmake_parse_arguments` prefix is `__qt_sps_arg`; the `if()` check correctly reads `__qt_sps_arg_UNPARSED_ARGUMENTS` and *does* fire on an unrecognized keyword — but the `FATAL_ERROR` message interpolates `${arg_UNPARSED_ARGUMENTS}`, a **different, undefined** variable (the prefix used by two other, unrelated `cmake_parse_arguments(PARSE_ARGV 0 arg ...)` calls elsewhere in the same 4,400-line file, at lines 3960 and 4183, copy-pasted from). Confirmed by direct grep — the mismatch is isolated to this one macro, not systemic:

```
$ grep -n -F -e 'macro(qt6_standard_project_setup)' -e 'cmake_parse_arguments(__qt_sps_arg' \
      -e 'if(__qt_sps_arg_UNPARSED_ARGUMENTS)' -e 'Unexpected arguments: ${arg_UNPARSED_ARGUMENTS}' \
      Qt6CoreMacros.cmake
3763:macro(qt6_standard_project_setup)
3778:        cmake_parse_arguments(__qt_sps_arg
3785:        if(__qt_sps_arg_UNPARSED_ARGUMENTS)
3786:            message(FATAL_ERROR "Unexpected arguments: ${arg_UNPARSED_ARGUMENTS}")
3960:            message(FATAL_ERROR "Unexpected arguments: ${arg_UNPARSED_ARGUMENTS}")  # different function, prefix IS "arg" there — correct
4183:            message(FATAL_ERROR "Unexpected arguments: ${arg_UNPARSED_ARGUMENTS}")  # ditto
```

Net effect: `qt_standard_project_setup(BOGUS_KEYWORD foo)` still hard-fails (the `if()` guard is correct), but the error prints `"Unexpected arguments: "` — empty, because `arg_UNPARSED_ARGUMENTS` was never set in this scope — instead of naming `BOGUS_KEYWORD foo`. A diagnostic-quality defect, not a silent-success defect, in one of the most widely copy-pasted lines in modern Qt6 CMake projects, and a direct, present-day (as of the fetched SHA) instance of the general class this dive's brief was hunting: a prefix/forwarding mismatch around `cmake_parse_arguments` that drops information a caller needs.

### 5. M-C-05 — PARENT_SCOPE, return(PROPAGATE), block() (cited, not re-measured)

Folded verbatim from [gate] §8, measured on 4.4.2:

- `PARENT_SCOPE` through a nested helper propagates **one hop only** — the direct caller must re-`set(... PARENT_SCOPE)` itself to relay further up.
- `return(PROPAGATE VAR)` (3.25) behaves like a single `PARENT_SCOPE` hop too, with one documented difference: it also propagates through any enclosing `block()` scopes in the same function, per [return.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst)'s own worked example.
- **The surprise [gate] found**: `return(PROPAGATE VAR)` inside a **bare top-level `block()`** in a top-level `CMakeLists.txt` prints `CMake Warning (author): Cannot set "VAR": current scope has no parent` and then **silently skips the rest of the listfile** — the propagate fails (no parent directory scope to escape to) but `return()`'s own file-scope-exit still happens, and a non-function `block()` does not intercept it. The identical line in a subdirectory's `CMakeLists.txt` (reached via `add_subdirectory()`) works without incident.
- `block(SCOPE_FOR VARIABLES)` isolates a plain `set()` exactly as documented.

No re-measurement performed; this dive's M-C-04 finding (`extract_into_parent_list`, above) is a related-but-distinct mechanism — a `PARENT_SCOPE` set() **inside a macro**, where the ambiguity is *which* scope textually contains the invocation, not the function/block-nesting mechanics [gate] §8 measured.

### 6. M-C-06 — cmake_parse_arguments: ARGN form vs PARSE_ARGV

Scan: every `cmake_parse_arguments(...)` call, classified as `PARSE_ARGV` form (first token literally `PARSE_ARGV`) or legacy `ARGN` form; for the ARGN form, a 60-line window after the call is searched for `<prefix>_UNPARSED_ARGUMENTS` and `<prefix>_KEYWORDS_MISSING_VALUES` references (a heuristic — a check further than 60 lines away, or in a different function reusing the same prefix, is a false negative of "unchecked").

```
$ python3 parse_fixed.py
```

| Metric | Count | % |
|---|---|---|
| Total `cmake_parse_arguments` calls (core+scaffold) | 986 | — |
| `PARSE_ARGV` form | 462 | 46.9% |
| ARGN form | 524 | 53.1% |
| ARGN form, no `_UNPARSED_ARGUMENTS` check in next 60 lines | 317 | **60.5% of ARGN-form calls** |
| ARGN form, no `_KEYWORDS_MISSING_VALUES` check in next 60 lines | 523 | **99.8% of ARGN-form calls** |

Per-repo split (core, where PARSE_ARGV adoption varies sharply):

| Repo | Total | PARSE_ARGV | ARGN | ARGN unchecked (UNPARSED) |
|---|---|---|---|---|
| qt/qtbase | 348 | 261 (75%) | 87 | 68 |
| microsoft/vcpkg | 144 | 137 (95%) | 7 | 6 |
| llvm/llvm-project | 143 | 2 (1.4%) | 141 | 97 |
| Kitware/CMake | 102 | 36 (35%) | 66 | 45 |
| KDE/extra-cmake-modules | 54 | 3 (5.6%) | 51 | 17 |
| cpp-pm/hunter | 50 | 0 | 50 | 0 (KDE's `ecm_find_package_parse_components`-style checks are absent here too, but not sampled in detail) |
| apache/arrow | 26 | 0 | 26 | 1 |

The `KEYWORDS_MISSING_VALUES` figure (99.8% unchecked) is the header number, not a defect count on its own — `KEYWORDS_MISSING_VALUES` (a multi-value keyword given zero following values) is a narrower, newer diagnostic than `UNPARSED_ARGUMENTS`, and most callers reasonably only check the latter. The load-bearing number is `UNPARSED_ARGUMENTS`: **6 in 10 ARGN-form calls never check whether the caller passed something the function didn't recognize**, meaning a misspelled keyword is silently absorbed into positional-argument slots or dropped rather than reported. KDE's `ecm_find_package_parse_components` (§4 above) is the counter-example that does check, with a `FATAL_ERROR`.

This measurement is corpus evidence *for* `CMK-MOD-16`'s existing MUST ("one top-level `cmake_parse_arguments(PARSE_ARGV 0 …)` per function", `.agents/research/cmake-module-authoring.md`), not a competing rule — the correctness reason (`PARSE_ARGV` handles empty and `;`-bearing values, ARGN doesn't) belongs to CMK-LANG per that file's own citation back here; this dive supplies the corpus-scale numbers CMK-MOD-16 references.

### 7. M-C-07 — generator expressions consumed at configure time (heuristic only)

Per the topic map's own re-prioritization (wave 2 verification: "0 real instances in 46 repos", conflicts log entry 68), this row ships as a **named reading heuristic**, never a corpus MUST:

```
rg -n -e 'message\(.*\$<' -e 'if\(.*\$<' -e 'string\(.*\$<' <dir> --include='*.cmake' --include='CMakeLists.txt'
```

Empty output is the expected, common case; a hit is the finding (a generator expression, `$<...>`, is evaluated per build-configuration at *generate* time, not when `message()`/`if()`/`string()` run at *configure* time, so it is still the literal text `$<...>` when those commands see it — the correct sink for configuration-dependent text is `file(GENERATE)`). Not re-run this wave; no reason to expect the 0-instance finding to have changed since wave 2's scan of the same corpus.

### 8. M-C-08 — hand-joined lists and separate_arguments

Regex (deliberately loose, a **heuristic**, per the map's own P2/"reading heuristic" classification):

```python
HAND_JOINED_LIST_RE = re.compile(r'"[^"\n]*;[^"\n]*"')   # any quoted string containing a literal ';'
```

Applied only to `set(...)` calls:

| Metric | Count |
|---|---|
| `set(VAR "...;...")`-shaped hits (core+scaffold) | 503 |
| `separate_arguments(...)` calls | 129 |

Hand-read 15 of the 503: **the false-positive rate is high**, confirming the map's own P2/heuristic-only call:

```
ClickHouse__ClickHouse:cmake/ccache.cmake:23: set(COMPILER_CACHE "auto" CACHE STRING "...valid options a...")   -- FALSE POSITIVE: help text, not a list
ClickHouse__ClickHouse:.../embed_clickstack_resources.cmake:81: set(${output_var} "text/html; charset=UTF-8" PARENT_SCOPE)  -- FALSE POSITIVE: single MIME-type value, ';' is part of the value
ClickHouse__ClickHouse:.../CompileProtos.cmake:303: set(target_substitutions "grafeas_v1_grafeas_protos\;grafeas_protos" ...)  -- TRUE POSITIVE: an escaped ';' hand-building a list element
```

Roughly two-thirds of the 15 sampled are natural-language or single-value content strings that happen to contain a semicolon, not CMake list literals — the regex cannot distinguish "this string is a list" from "this string is prose with a semicolon" without reading the value's consumer. **This confirms M-C-08 stays a reading heuristic, never a grep-driven MUST or SHOULD-with-a-count.**

The positive control, `separate_arguments`, is unambiguous and clean: all 8 sampled hits are the correct idiom, converting a compiler/linker flag string into an argv-shaped list — `separate_arguments(OpenMP_VERBOSE_OPTIONS NATIVE_COMMAND "${CMAKE_${LANG}_VERBOSE_FLAG}")` (`Kitware__CMake@e8befb989b:Modules/FindOpenMP.cmake:313`) and four more in `FindMPI.cmake`, all `NATIVE_COMMAND` — never the plain (whitespace-only, platform-dependent) form.

### 9. M-C-09 — option()/variable naming and the project prefix

```python
option_cmake_prefixed  # optname.upper().startswith("CMAKE_")
option_unprefixed_estimate  # per-repo dominant-prefix heuristic, see caveat below
```

| Metric | Count |
|---|---|
| Total `option()` calls (core+scaffold) | 1,504 |
| Named `CMAKE_*` | 28 |

**26 of the 28 are Kitware/CMake's own repo** (`option(CMAKE_USE_SYSTEM_CURL ...)`, `option(CMake_BUILD_LTO ...)`, `option(CMAKE_USE_FOLDERS ...)`, `Kitware__CMake@e8befb989b:CMakeLists.txt:98-322`) — legitimate, because CMake's own project prefix genuinely is `CMAKE`/`CMake`; this is the self-referential exception, not a violation. **The two real violations are both in `microsoft/vcpkg`'s `ports/` tree**, vendored *upstream* recipe files, not vcpkg's own code:

```
microsoft__vcpkg@c4ee5a52d7:ports/duktape/CMakeLists.txt:3: option(CMAKE_VERBOSE_MAKEFILE "Create verbose makefile" OFF)
microsoft__vcpkg@c4ee5a52d7:ports/usockets/CMakeLists.txt:7: option(CMAKE_UNITY_BUILD "Combine source for compilation." ON)
```

Both `CMAKE_VERBOSE_MAKEFILE` and `CMAKE_UNITY_BUILD` are pre-existing CMake built-in variables; wrapping either in `option()` collides with (and, per M-C-02's precedence findings, may silently be overridden by or override) CMake's own use of the same name in any consumer that sets it via `-D` or a preset before this subdirectory configures.

**The general "is this option prefixed" heuristic breaks on monorepos, exactly as the brief warned** — measured, not just asserted:

| Repo | option() total | Single dominant prefix found | "Unprefixed" by naive single-prefix count | Real story |
|---|---|---|---|---|
| llvm/llvm-project | 391 | `LLVM_` (111 uses) | 258 (66%) | Most of the "unprefixed" 258 are `CLANG_*`, `MLIR_*`, `LLD_*`, `FLANG_*` — valid **per-sub-project** prefixes in a monorepo, not unprefixed |
| Kitware/CMake | 250 | `CURL_` (75 uses, from the vendored curl copy) | 166 (66%) | Same shape: `ZLIB_*`, `LIBARCHIVE_*`, `BZIP2_*` and CMake's own `CMake_*`/`CMAKE_*` options are all "prefixed", just not with the dominant one |
| qt/qtbase | 55 | `QT` (50 uses) | 5 (9%) | Clean single-project case — the naive heuristic works fine here |

**Conclusion**: a repo-wide single-dominant-prefix check is only trustworthy for a single-project repo (qtbase-shaped); on a monorepo (llvm-, Kitware/CMake-shaped) it must be scoped per top-level vendored/sub-project subdirectory or it manufactures a majority "violation" rate out of nothing. This is a heuristic-design finding, not a corpus-count finding.

### 10. M-C-10 — option() coerces the type only (cited, not re-measured)

New row, folded from [gate] §5's "second, minor landmine", measured on 4.4.2:

```
$ cmake -S precedence -B build-preset --preset p1 -DMYVAR=from-cli
...
$ grep '^MYVAR' build-preset/CMakeCache.txt
MYVAR:BOOL=from-cli
```

`MYVAR` was declared with `option(MYVAR "an option" OFF)`, so its cache **type** is `BOOL`. After a `-D`/preset override with a non-boolean string, `option()` does not reject, normalize, or coerce the **value** — `MYVAR:BOOL=from-cli` is a `BOOL`-typed cache entry holding the literal, non-boolean string `from-cli`. Per [option.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/option.rst): "If `<variable>` is already set as a normal or cache variable, then the command does nothing" — the type claim happens only on first creation, never on a later value write. A reader doing `if(MYVAR)` gets ordinary CMake truthiness on the string `from-cli` (true, since it isn't one of the recognized falsy tokens), not a boolean-normalized value — no error, no warning, on either 3.31.12 or 4.4.2.

## Normative guidance candidates

1. **Quote every variable reference used as an operand of `if()`/`elseif()`/`while()`'s binary comparisons** (`STREQUAL`, `MATCHES`, `EQUAL`, `VERSION_*`) — write `if("${X}" STREQUAL "y")`, never `if(${X} STREQUAL "y")`.
   Rationale: an unquoted `${X}` is still subject to if()'s own short-form variable dereference on 4.4.2 (§3) — this is independent of CMP0054 (removed 4.0) and not fixed by any policy.
   Verify: `rg -rn --include='*.cmake' --include='CMakeLists.txt' -e '\$\{[A-Za-z_][A-Za-z0-9_]*\}[^"]{0,40}(STREQUAL|MATCHES|EQUAL)' <dir>` (quote the pattern; empty = pass). Measured 0/30 false positives on this corpus.
   Version floor: none — applies to every CMake since bracket/quoted-argument semantics existed (≥ 2.8.12 / 3.0).
   **MUST.**

2. **Iterate a list variable with `foreach(x IN LISTS name)`, never bare `foreach(x ${name})`.**
   Rationale: unquoted list expansion drops empty elements silently — the same class of loss M-C-06 measures for ARGN forwarding.
   Verify: `rg -rn --include='*.cmake' --include='CMakeLists.txt' -e '^\s*foreach\([A-Za-z_][A-Za-z0-9_]*\s+\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*\)' <dir>` (empty = pass). Measured 1,650 hits corpus-wide (40% of all `foreach` calls) — common, not rare; a modernization pass, not a spot fix.
   Version floor: `IN LISTS` since 3.0.
   **MUST for new code; SHOULD-fix on modernization of existing code (the volume is too large to gate CI on immediately for an adopting project).**

3. **A `cmake_parse_arguments`-based function or macro checks `<prefix>_UNPARSED_ARGUMENTS` (and reports it) before doing anything with the parsed keywords.**
   Rationale: measured 60% of ARGN-form calls in the corpus never check it (§6); a misspelled or unsupported keyword is silently absorbed rather than rejected.
   Verify: for each `cmake_parse_arguments(<PREFIX> ...)` call, `rg -n "<PREFIX>_UNPARSED_ARGUMENTS" <file>` within the enclosing function/macro body (present = pass; a named reading heuristic beyond a fixed line window, since a 60-line window has real false negatives).
   Version floor: none (`UNPARSED_ARGUMENTS` since the command's introduction, 2.8.3).
   **SHOULD** (mechanically checkable but the enclosing-scope boundary needs a human or an AST, not a fixed-window grep, to get exactly right).

4. **Prefer `cmake_parse_arguments(PARSE_ARGV 0 <prefix> ...)` over the `ARGN`-forwarding form in any function or macro whose caller might legitimately pass an empty string or a `;`-bearing value.**
   Rationale: cited from [gate] §9 — unquoted `${ARGN}` forwarding drops an explicit empty-string argument (indistinguishable from "not passed") and splits a semicolon-bearing single value across `UNPARSED_ARGUMENTS`; `PARSE_ARGV` does neither. This is `CMK-MOD-16`'s content; this row is the corpus-scale evidence for it, not a competing rule.
   Verify: `CMK-MOD-16`'s own verification (a nesting-aware awk check, per `.agents/research/cmake-module-authoring.md`).
   Version floor: `PARSE_ARGV` since 3.7 (`CMK-MOD-16` cites 3.7, corrected from an earlier 3.5 claim); `CMP0174` (empty-value-defines-a-variable) since 3.31.
   **MUST for any function/macro accepting a value that could legitimately be empty or contain `;`; SHOULD generally.**

5. **Never write `set(<var> ... PARENT_SCOPE)` inside a `macro()` body unless every call site is confirmed to be at the same scope depth.**
   Rationale: a macro has no scope of its own (§4, `extract_into_parent_list`); `PARENT_SCOPE` there targets whatever scope textually contains the *invocation*, which silently changes if the macro is later called from inside a function instead of directly at directory scope. No corpus-wide grep can flag "will this go wrong someday" — only "does this pattern exist at all".
   Verify: named reading heuristic — `rg -n --include='*.cmake' -B5 'PARENT_SCOPE' <dir>` then confirm the enclosing block is `macro(...)...endmacro()`, then check every real call site's scope depth by hand (`rg -n '\bmacro_name\s*\(' <dir>`).
   Version floor: none (macro/PARENT_SCOPE semantics are pre-3.0).
   **SHOULD / reading heuristic**, not MUST — 0 confirmed live defects in this corpus, one confirmed fragility.

6. **`return()` inside a `macro()` is legitimate only when the intent is explicitly "exit the includer's scope"; document it inline when used.**
   Rationale: every sampled instance in this corpus (§4) is the correct, intentional CMake idiom (`find_dependency`-shaped early-exit from a `Find*.cmake`/`Config.cmake`); the risk is a *reader* mistaking it for function-local return.
   Verify: `rg -n --include='*.cmake' -B2 'return\s*\(' <dir>` then confirm the enclosing block is a `macro()`, not a `function()` — a hit is not a defect, it's a review trigger.
   Version floor: `CMP0140` (return() argument validation) since 3.25; the caller-scope-return mechanic itself is macro-command-era (pre-3.0).
   **SHOULD / reading heuristic.**

7. **Never name an `option()` (or a user-facing cache/normal variable) `CMAKE_*`.**
   Rationale: collides with, and can be silently shadowed by or shadow, one of CMake's own built-in variables of the same name (measured: `CMAKE_VERBOSE_MAKEFILE`, `CMAKE_UNITY_BUILD`, §9) — a real, if rare (2/1,504 outside CMake's own repo), and unambiguous violation with no legitimate exception for a non-CMake project.
   Verify: `rg -rn --include='*.cmake' --include='CMakeLists.txt' -e '^\s*option\(\s*"?CMAKE_' <dir>` (empty = pass; CMake's own repo is the one legitimate, documented exception and is excluded by name, never by pattern).
   Version floor: none.
   **MUST.**

8. **Prefix every `option()` name with the project's own name; on a monorepo, check per top-level vendored/sub-project subdirectory, never repo-wide.**
   Rationale: measured — a repo-wide single-dominant-prefix check manufactures a 66% "violation" rate on LLVM and Kitware/CMake purely from legitimate per-sub-project prefixes (§9); it is accurate (91% correctly prefixed) only on a single-project repo like qtbase.
   Verify: named reading heuristic, scoped per subdirectory: `rg -rn --include='*.cmake' --include='CMakeLists.txt' -e '^\s*option\(' <subdir>` then check the dominant prefix *within that subdirectory*, not the whole repo.
   Version floor: none.
   **SHOULD / reading heuristic** (the map's own "vendoring caveat"; not a corpus-wide MUST).

9. **A `cmake_parse_arguments` prefix used in an error message must be the same prefix used in the parse call and the check.**
   Rationale: `qt6_standard_project_setup()` (§4) is a present-day, confirmed instance of exactly this mismatch in a widely-copied public macro — the check still fires, but the diagnostic's payload is silently empty.
   Verify: reading heuristic — for each `cmake_parse_arguments(<PREFIX> ...)`, grep the same function/macro body for `${<PREFIX>_UNPARSED_ARGUMENTS}` inside any `message(...)` call; a different prefix used in an adjacent `message()` in the same body is the finding. Not a clean regex (needs the enclosing-scope prefix bound), named as a heuristic.
   Version floor: none.
   **SHOULD / reading heuristic.**

10. **Never assume an `option()`-declared cache entry's `BOOL` type means its current *value* is boolean.**
    Rationale: measured (§10, [gate] §5) — `option()` only claims the type on first creation; a later `-D`/preset override can leave a `BOOL`-typed entry holding an arbitrary non-boolean string, with no warning on 3.31.12 or 4.4.2.
    Verify: named reading heuristic (no static check catches a runtime override); document the risk in module-authoring guidance for any `option()`-backed variable read with `if(VAR STREQUAL ...)` rather than plain `if(VAR)`.
    Version floor: none.
    **SHOULD / reading heuristic.**

**Non-negotiables for the `cmake-build` index** (the short list a reviewer must always apply, per the map's index-budget constraint): rules **1**, **2** and **7** above. Rules 3 and 4 are strongly recommended but need the module-authoring depth file's own nesting-aware verification (`CMK-MOD-16`) to be checkable without false negatives. Rules 5, 6, 8, 9, 10 are reading heuristics: real, cited, but not corpus-gate material.

## Exemplar evidence

| Candidate | Satisfies | Violates | Contradicts |
|---|---|---|---|
| 1 (quote if() comparisons) | Vast majority of the corpus (557/43,962 ≈ 1.3% violate) | `llvm__llvm-project@e0316c1b47` (151), `Kitware__CMake@e8befb989b` (127), `qt__qtbase@0ef5a8e9ca` (47) | — |
| 2 (foreach IN LISTS) | `nlohmann__json@f422b753cc` and other small, modern repos keep this low relative to total foreach | `llvm__llvm-project` (454/730, 62%), `cpp-pm__hunter@997fab148b` (158/185, 85%) | Bare `foreach(x ${list})` is still the *majority* idiom in several large, actively-maintained repos — not a legacy-only pattern |
| 3 (check UNPARSED_ARGUMENTS) | `KDE__extra-cmake-modules@b4c4ec9997:modules/ECMFindModuleHelpers.cmake:124` (`FATAL_ERROR` on unparsed) | `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3786` (checks it, but names the wrong variable in the message) | — |
| 4 (PARSE_ARGV over ARGN) | `microsoft__vcpkg@c4ee5a52d7` (95% of its `cmake_parse_arguments` calls) | `llvm__llvm-project@e0316c1b47` (99% ARGN-form, 2/143), `cpp-pm__hunter@997fab148b` (100% ARGN-form) | — |
| 5 (no PARENT_SCOPE in macro) | Every macro sampled except one | `ClickHouse__ClickHouse@0995a518a8:cmake/dbms_glob_sources.cmake:16` (fragile, not yet broken) | — |
| 6 (return() in macro = intentional) | `Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:122`, `KDE__extra-cmake-modules@b4c4ec9997:modules/ECMFindModuleHelpers.cmake:176` | none found | — |
| 7 (no CMAKE_*-named option) | 1,502/1,504 options corpus-wide | `microsoft__vcpkg@c4ee5a52d7:ports/duktape/CMakeLists.txt:3`, `ports/usockets/CMakeLists.txt:7` | `Kitware__CMake@e8befb989b` is the one legitimate self-referential exception (26 hits) |
| 8 (per-subdir option prefix) | `qt__qtbase@0ef5a8e9ca` (91% single-prefix) | none — this is a check-design finding | Naive repo-wide check "fails" LLVM and Kitware/CMake for the wrong reason |

`/home/mherwig/dev/find_ocx` (map [ocx], read-only, working tree dirty): 0/240 unquoted `if()` comparisons and 0 bare `foreach()` per wave-1 grounding (candidates 1–2, clean); its `cmake_parse_arguments` usage is 6 ARGN-form calls with no PARSE_ARGV (candidate 4, all 6 unmet — a concrete gap for an adopting-this-ruleset review of find_ocx itself, consistent with map correction 17's finding that find_ocx's `-P`-mode families run outside the usual gate).

## AI-agent angle

- **Citing CMP0054 as "the if()-quoting fix" and treating unquoted `if(${X} ...)` as therefore safe on modern CMake.** Wrong: CMP0054 (removed 4.0, permanently NEW) only stops double-dereference of **quoted/bracketed** arguments; an unquoted `${X}` is still subject to if()'s own short-form variable-reference rule ([if.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/if.rst)) on 4.4.2 today. Check: does the flagged `if()`/`elseif()` argument have a `${...}` **without** surrounding quotes? If yes, the CMP0054 argument doesn't apply, full stop.
- **Writing a "removed" policy as if it still has an `OLD` mode**, e.g. `cmake_policy(SET CMP0054 OLD)`. CMP0054 was removed in 4.0 ([REMOVED_PROLOGUE](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0054.rst)) — setting it at all on 4.0+ is a hard configure error, not a compatibility toggle. Check: any `cmake_policy(SET CMP00nn ...)` naming a policy whose docs carry a `REMOVED_IN_CMAKE_VERSION` line at or below the project's floor is a guaranteed-fatal call on that floor.
- **Suggesting `${ARGN}` inside `foreach(loop_var ${ARGN})` in a macro without the empty-argument caveat.** [macro.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/macro.rst)'s own docs warn this "will skip empty arguments" and give the two-line `set(list_var "${ARGN}")` / `foreach(... IN LISTS list_var)` fix — a model trained mostly on function-flavored examples reaches for the macro form's `foreach(${ARGN})` idiom by pattern-matching, silently reintroducing the drop.
- **Assuming `set(X CACHE STRING ...)` without `FORCE` updates an existing cache entry on a reconfigure with a new `-D` or default value.** It does not (§2, [gate] §5) — only `CACHE INTERNAL` implies `FORCE`. A model asked "why doesn't my new default show up" will often suggest adding `FORCE` everywhere, which then breaks the *user's* ability to override the setting on the command line — the actual fix is almost always "don't set a CACHE default after the first configure; use a preset or the `option()`/`-D` path instead."
- **Recommending `PARENT_SCOPE` inside a `macro()`** to "return a value to the caller", by analogy with functions. A model that has internalized "function needs PARENT_SCOPE, macro doesn't need anything special" half-remembers this backwards under pressure and suggests `PARENT_SCOPE` in a macro body "to be safe" — inside a macro this targets whatever scope contains the *invocation*, not a fixed "caller" the way it does in a function (§4).
- **Treating `return(PROPAGATE VAR)` as always safe inside any `block()`.** [gate] §8's measured surprise — a bare (non-function) top-level `block()` with `return(PROPAGATE)` silently truncates the rest of the listfile with only a warning. A model suggesting this pattern for "clean early-exit with variable propagation" at the top level of a `CMakeLists.txt` (as opposed to inside a function, or inside a subdirectory's file) ships a silent truncation bug.

## Contested / evolving

- **Whether `foreach(x ${list})` (unquoted, no `IN LISTS`) should be flagged as a MUST-fix or left as a SHOULD-modernize.** At 40% of all `foreach` calls corpus-wide (§3), including in llvm and hunter's own actively-maintained, high-traffic code, this is not a fringe legacy pattern — a MUST gate on existing code would fail the majority of large real-world CMake trees today. Trending: `IN LISTS` is the form every current tutorial and Kitware's own newer modules use for new code; the corpus shows the old form persisting in code that predates it, not being actively rewritten.
- **Whether `cmake-lint`'s historical `option()`-prefix check (W0105) is worth citing at all.** [lint]/the map's conflict 4 already settled that `cmake-lint` itself is unmaintained since 2020 and cited nowhere in this program's verifications; this dive's own measurement (§9) shows the *check's substance* is still worth doing, just never via that tool — gersemi does not lint semantics, only format.
- **Where the line sits between "macro legitimately needs caller-scope escape" and "macro is just old style".** This dive's 15-macro hand sample found 11 clear "needs it", 1 fragile-but-currently-fine, 1 "could be a function, no functional difference either way" and zero clear "this macro is definitely wrong" — the practical guidance stays a reading heuristic, and no larger sample size in this corpus is likely to produce a mechanically-checkable dividing line, since the answer depends on caller intent, not syntax.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/manual/cmake-language.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-language.7.rst) | CMake language grammar: comments, bracket/quoted/unquoted arguments, variable references | 4.4.2 | Ground truth for both parser-fix bugs (bracket comment syntax, quoted-argument paren rules) |
| [Help/command/if.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/if.rst) | `if()`/`elseif()`/`while()` condition syntax, incl. short-form variable dereference | 4.4.2 | Source for why M-C-03's unquoted-var trap is independent of CMP0054 |
| [Help/command/macro.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/macro.rst) | Macro semantics, "Macro vs Function", `ARGN` text-substitution caveats | 4.4.2 | Ground truth for M-C-04's caller-scope/PARENT_SCOPE/return() analysis |
| [Help/command/function.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/function.rst) | Function scope and `ARGN`/`ARGV`/`ARGC` as real variables | 4.4.2 | Contrast case for M-C-04 |
| [Help/command/return.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst) | `return()`, `PROPAGATE`, CMP0140, macro-vs-function return semantics | 4.4.2 | Ground truth for M-C-05 (cited) and M-C-04's `find_dependency` classification |
| [Help/command/block.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/block.rst) | `block()` scope kinds and `PROPAGATE` | 4.4.2 | Ground truth for M-C-05 (cited) |
| [Help/command/option.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/option.rst) | `option()` behavior, incl. "does nothing" if already set | 4.4.2 | Ground truth for M-C-09/M-C-10 |
| [Help/policy/CMP0054.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0054.rst) | Quoted/bracketed if()-argument dereference policy, **removed 4.0** | 4.4.2 (removed-policy page) | Confirms CMP0054 is orthogonal to M-C-03's unquoted-argument trap; AI-agent-angle source |
| [Help/policy/CMP0077.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0077.rst) | `option()` honors normal variables | 4.4.2 | Cited context for M-C-10, cross-referenced from CMP0126's own docs |
| [Help/policy/CMP0126.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0126.rst) | `set(CACHE)` normal-variable removal policy | 4.4.2 | Cited context for M-C-01 (measured in [gate], not re-measured here) |
| [Help/policy/CMP0140.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0140.rst) | `return()` argument validation | 4.4.2 | Cited context for M-C-05 |
| [Help/policy/CMP0174.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0174.rst) | `cmake_parse_arguments(PARSE_ARGV)` empty-value-defines-a-variable | 4.4.2 | Cited context for M-C-06/CMK-MOD-16 |
| **Measurement**: `python3 parse_fixed.py --demo` on 3 planted fixtures | Proves both named parser bugs fixed | 2026-09-26 | Primary evidence for §1; script and fixtures at `/home/mherwig/.cache/cmake-measure-scratch/cmake-language/` and `.agents/research/cmake-language/scratch/language-parser/` |
| **Measurement**: `python3 parse_fixed.py` over `/home/mherwig/.cache/research-lang/exemplars/cmake` (46 repos, 2026-09-26 SHAs per map [host] H8) | Corpus counts for M-C-03/04/06/08/09 | 2026-09-26 | Primary evidence for §3, §4, §6, §8, §9; raw output `per_repo_counts.json`, `examples.json`, `exclusions_summary.json` |
| **Measurement**: hand-read 30 sampled M-C-03 hits, 15 sampled M-C-04 macros, 15 sampled M-C-08 hits | False-positive/classification checks | 2026-09-26 | Primary evidence for the FP-rate and heuristic-vs-MUST calls throughout |
| `.agents/research/cmake-versions-and-gate/gate-and-language-semantics.md` §5, §8, §9 | Cache/scope/ARGN semantics, measured on 3.31.12 and 4.4.2 | 2026-09-26 | Cited per the brief for M-C-01, M-C-02, M-C-05, M-C-10 — not re-measured |
| `.agents/research/cmake-module-authoring.md` CMK-MOD-16 | PARSE_ARGV-at-function-top-level rule | 2026-09-26 | Cited for M-C-06's normative pairing; this dive supplies corpus-scale evidence |
| `.agents/research/cmake-topic-map.md` M-C-01…M-C-10 rows, conflicts log entries 39/40/42/68/70/72 | Map's own row definitions and wave-2 verifier corrections | 2026-09-26 | Scope contract for this dive; cited for the regex-refinement provenance (501→128) and M-C-07's re-prioritization |

Measurement count: 1 parser-bug-fix demo (3 fixtures) + 1 full-corpus scan (46 repos, 2,866+ CMake files across the non-Kitware repos alone, per `exclusions_summary.json`) + 3 hand-verification samples (30 + 15 + 15 = 60 individually read hits) = 5 distinct measurement runs, all reproducible by the commands quoted inline.
