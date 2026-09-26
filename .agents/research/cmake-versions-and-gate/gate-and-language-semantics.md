---
title: The configure gate and CMake-language semantics
topic: cmake
agent: gate-and-language-semantics
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 14
scope: |
  Settles, by running cmake 3.31.12, 4.3.4 and 4.4.2 against small scratch
  projects (never by reading docs alone), the gate-spelling, diagnostic-
  category, presets-schema, floor, cache, memoization, policy-capture,
  return/scope, argument-parsing and download/include-guard claims that
  family CMK-CORE and every later CMK rule leans on (map dive
  `versions-and-gate/gate-and-language-semantics`, brief items 1-10).
  Out of scope: the distro/CI floor survey and the full policy/experimental-
  gate table (dive `floors-policies-and-era`); the dependency-provider and
  CPS round trip (group `dependency-seam`); install/export correctness.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Gate spelling: `-Werror=dev` vs `-Werror=author`](#1-gate-spelling)
   2. [Diagnostic categories and their CLI names](#2-diagnostic-categories)
   3. [Presets schema rejection](#3-presets-schema-rejection)
   4. [Floors and the `...` range syntax](#4-floors-and-the--range-syntax)
   5. [Cache: FORCE, INTERNAL, CMP0126, precedence](#5-cache-force-internal-cmp0126-precedence)
   6. [The find_ocx memo functions, verbatim, three reconfigures](#6-the-find_ocx-memo-functions-verbatim-three-reconfigures)
   7. [Policy capture at function-definition time](#7-policy-capture-at-function-definition-time)
   8. [Returns and scopes](#8-returns-and-scopes)
   9. [Argument parsing: `ARGN` vs `PARSE_ARGV`](#9-argument-parsing-argn-vs-parse_argv)
   10. [Downloads and vendored-copy include guards](#10-downloads-and-vendored-copy-include-guards)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The configure gate is two lines, not one: **3.x/4.3** use `-Werror=dev` /
  `-Werror=deprecated` (dev-category diagnostics); **4.4+** uses
  `-Werror=author` / `-Werror=deprecated` (both now first-class diagnostic
  categories, `CMD_AUTHOR` / `CMD_DEPRECATED`).
- CMake 4.4.2 still **accepts** `-Werror=dev` as a deprecated synonym for
  `-Werror=author` and prints its own one-line deprecation notice
  (`The error=dev option is deprecated. Use -Werror=author instead.`) — this
  notice is unconditional stderr text, not itself a diagnostic that
  `-Werror=author` or any `-W` flag can suppress or promote.
- On CMake ≤4.3, `-Werror=author` is **silently ignored** (unrecognized
  category name, no warning, no error, exit 0) — it is *not* a working
  synonym on those lines; only `-Werror=dev` works there.
- CMake 4.4.2 ships exactly **seven** diagnostic categories
  (`CMD_AUTHOR`, `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`,
  `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_POLICY`, `CMD_UNINITIALIZED`,
  `CMD_UNUSED_CLI`); `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`, `CMD_POLICY` and
  `CMD_INSTALL_ABSOLUTE_DESTINATION` are children of `CMD_AUTHOR`, so
  `-Werror=author` also promotes them; `CMD_UNINITIALIZED` and
  `CMD_UNUSED_CLI` are un-parented and default to **ignore**, so a CI gate
  that only sets `-Werror=dev`/`-Werror=author` never sees them.
- The CLI category name for `CMD_INSTALL_ABSOLUTE_DESTINATION` is
  `install-absolute-destination`; for `CMD_UNINITIALIZED` it is
  `uninitialized`. Both are real, working `-Werror=` values on 4.4.2.
- Presets schema rejection is precise and version-gated: 3.31.12 accepts
  schema ≤10; 4.3.4 accepts ≤11 (this is where `warnings.dev` still works);
  4.4.2 accepts ≤12 but **rejects schema-12 files that still use
  `warnings.dev`** with the explicit message `File version must be 11 or
  lower for warnings.dev support` — `dev` was renamed to `author` exactly at
  schema 12, and 4.4.2 enforces the rename on the newer schema while keeping
  the old key working on the older one.
- `cmake_minimum_required(VERSION <min>...<max>)` requires **exactly three
  literal dots**; jbeder/yaml-cpp's real `CMakeLists.txt:1` line
  `VERSION 3.15..4.3` has only two, so it is **not** parsed as a range at
  all — CMake treats the whole string as a single (non-numeric-suffix)
  version literal, `CMAKE_MINIMUM_REQUIRED_VERSION` becomes the literal
  string `3.15..4.3`, and the effective policy floor collapses to `3.15`
  with **zero warning or error**, even under `-Werror=dev`/`author`, on all
  three tested binaries. `CMP0126` (3.21) and `CMP0140` (3.25) are left
  unset, exactly as they would be under a plain `VERSION 3.15`.
- `set(<v> ... CACHE STRING <doc>)` without `FORCE` leaves an existing cache
  entry **unchanged** on reconfigure, even when the input that produces the
  new value changes; `set(<v> ... CACHE INTERNAL <doc>)` **overwrites it
  every time** — confirmed on 3.31.12 and 4.4.2, matching the `set()`
  manual's "Use of this type implies `FORCE`."
- The find_ocx-audit's headline defect (`__ocx_set_result`'s `CACHE INTERNAL`
  write "needs `FORCE`") is **refuted by direct execution**: copying
  `__ocx_set_result`/`__ocx_memo_hit`/`__ocx_memo_store` verbatim and running
  three reconfigures with a changed fingerprint on run 2 produces a memo
  **hit** on run 3 (`memo_hit=TRUE`), because `CACHE INTERNAL` really does
  imply `FORCE`.
- `CMP0126` (same-named normal + cache variable) is directly observable:
  `OLD` makes a later read of the variable name resolve to the **cache**
  value (`cache-value`); `NEW` makes it resolve to the **normal** variable
  (`normal-value`), silently shadowing the cache entry in that scope. Both
  explicit `cmake_policy(SET CMP0126 ...)` calls print a deprecation warning
  on 3.31.12 and 4.4.2 (the policy itself is scheduled for removal).
- Precedence for a cache variable, confirmed by direct measurement: `-D` on
  the command line **beats** a preset's `cacheVariables` **beats**
  `option()`'s in-script default; a later plain `set(VAR value)` (no
  `CACHE`) always wins the *read* in that scope afterward, without touching
  the on-disk cache entry — the classic "my `-D` didn't take" report is
  usually this last case.
- A function's body is compiled against the policy state active **at its
  `cmake_policy(PUSH)`-pinned definition point**, not at call time: a
  function defined inside `cmake_policy(PUSH)`/`VERSION 3.19`/`POP` sees
  `CMP0124`/`CMP0140` unset; a sibling function defined immediately after the
  matching `POP`, in the very same file, sees the **includer's** policy
  state (`NEW`/`NEW` when included from a `VERSION 3.31` project). This is
  the exact mechanism behind find_ocx's `__ocx_self_update`, which sits
  after the module's `cmake_policy(POP)`.
- `return(PROPAGATE <var>)` at the very top of a project's own
  `CMakeLists.txt`, inside a bare `block(SCOPE_FOR VARIABLES)` (no enclosing
  `function()`), **fails with only a warning** —
  `Cannot set "VAR": current scope has no parent.` — and the failure is not
  isolated to the block: the **rest of the listfile is skipped entirely**,
  because a directory-scope `return()` returns from the *file*, and a bare
  `block()` does not intercept that.
- `cmake_parse_arguments` in classic `ARGN`-forwarding form
  (`cmake_parse_arguments(ARG "" "VALUE" "" ${ARGN})`, **unquoted**
  `${ARGN}`) has two independent, measured correctness bugs a single-value
  keyword can trip: an **empty-string argument silently vanishes** from the
  list before parsing even sees it (so `VALUE ""` is indistinguishable from
  the keyword being omitted), and a value **containing a semicolon splits**
  across `VALUE` and `UNPARSED_ARGUMENTS` (`VALUE "a;b;c"` → `VALUE='a'`,
  `unparsed='b;c'`). `PARSE_ARGV` (3.5+) exhibits **neither** bug on the
  identical inputs.
- `CMP0174` (3.31+), set to `NEW`, makes an explicitly-empty
  single-value keyword argument **defined and empty** (`ARG_VALUE` is
  `DEFINED`, value `""`) instead of left `UNDEFINED`; confirmed identical on
  3.31.12 and 4.4.2 (the policy itself is available on both).
- `file(DOWNLOAD file:///nonexistent ...)` **does not stop configure**,
  with or without a `STATUS` argument — exit code 0 either way. Without
  `STATUS`, the failure is **completely silent**: no error, no warning, no
  status line — the only way to detect it is to check `STATUS` or verify the
  downloaded file exists afterward.
- Two different files (different absolute paths, same filename, same body
  shape) that each call `include_guard(GLOBAL)` are **not** deduplicated
  against each other — the guard tracks the *calling file's own path*, so
  two vendored copies of "the same" module both execute in full, the later
  `add_subdirectory()`'s copy wins on any shared global state (`GLOBAL`
  property, cache variable), and **nothing is reported**.

## Findings

All commands below were run from
`/home/mherwig/dev/grimoire-lore/.agents/worktrees/java` via
`ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake ...`; the fixtures
live under `.agents/research/cmake-versions-and-gate/scratch/gate-and-language/`
in this worktree (re-runnable; build trees were deleted after measurement).
`cmake --version` on the three lines: **3.31.12**, **4.3.4**, **4.4.2**.

### 1. Gate spelling

Fixture (`exp1-gate-spelling/CMakeLists.txt`):

```cmake
cmake_minimum_required(VERSION 3.25)
project(gate_test LANGUAGES NONE)
message(AUTHOR_WARNING "this is an author warning")
```

Command shape: `cmake -S exp1-gate-spelling -B <build> <flag>`.

| CMake | `-Werror=dev` | `-Werror=author` | both |
|---|---|---|---|
| 3.31.12 | exit **1**, `CMake Error (dev)` | exit **0** (silently ignored) | exit **1**, `CMake Error (dev)` |
| 4.3.4 | exit **1**, `CMake Error (dev)` | exit **0** (silently ignored) | exit **1**, `CMake Error (dev)` |
| 4.4.2 | exit **1**, `CMake Error (author)` | exit **1**, `CMake Error (author)` | exit **1**, `CMake Error (author)` |

Full 4.4.2 / `-Werror=dev` log — this is the "own deprecation diagnostic" the
brief asked about, and it is a plain stderr line, **not** gated by any `-W`
flag:

```
The error=dev option is deprecated.  Use -Werror=author instead.
CMake Error (author) at CMakeLists.txt:3 (message):
  this is an author warning
This error is for project developers.  Use -Wno-error=author to suppress it.

-- Configuring incomplete, errors occurred!
```

`message(DEPRECATION ...)` under `-Werror=deprecated` (fixture
`exp1b-deprecated/CMakeLists.txt`):

| CMake | (no flag) | `-Werror=deprecated` | `-Werror=dev` |
|---|---|---|---|
| 3.31.12 | exit 0, `CMake Deprecation Warning` | exit 1, `CMake Deprecation Error` | exit 1, `CMake Deprecation Error` |
| 4.3.4 | exit 0, `CMake Deprecation Warning` | exit 1, `CMake Deprecation Error` | exit 1, `CMake Deprecation Error` |
| 4.4.2 | exit 0, `CMake Warning (deprecated)`, footer `Use -Wno-author or -Wno-deprecated` | exit 1, `CMake Error (deprecated)` | exit 1, `CMake Error (deprecated)` (plus the same `-Werror=dev` deprecation notice) |

`-Werror=dev` on 4.4.2 promotes the deprecation message too, because
`CMD_DEPRECATED`'s parent is `CMD_AUTHOR` and the legacy `dev` spelling maps
onto `author`
([Help/manual/cmake-diagnostics.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-diagnostics.7.rst),
confirmed with `cmake --help-manual cmake-diagnostics` on the pinned 4.4.2
binary — see [§2](#2-diagnostic-categories)).

### 2. Diagnostic categories

`cmake --help-manual cmake-diagnostics` on 4.4.2 lists exactly seven
categories, each `versionadded:: 4.4`:

```
CMD_AUTHOR                          default: warn
CMD_DEPRECATED     parent: CMD_AUTHOR   default: warn
CMD_EXPERIMENTAL   parent: CMD_AUTHOR   default: warn
CMD_INSTALL_ABSOLUTE_DESTINATION parent: CMD_AUTHOR  default: ignore
CMD_POLICY         parent: CMD_AUTHOR   default: warn
CMD_UNINITIALIZED                   default: ignore
CMD_UNUSED_CLI                      default: ignore
```

(`CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE` do not exist here — map [host]
H2 already established they are `master`/4.5-only; this dive reproduces H2
and adds the parent/default table.)

CLI spelling for the two `ignore`-by-default, unparented categories
(fixture `exp2-categories/CMakeLists.txt`: an undefined-variable
dereference plus `install(FILES ... DESTINATION /opt/absolute/path)`), on
4.4.2:

```
$ cmake -S exp2-categories -B build -Werror=uninitialized
CMake Error (uninitialized) at CMakeLists.txt:3 (message):
  uninitialized variable 'THIS_VAR_IS_NEVER_DEFINED'

$ cmake -S exp2-categories -B build -Werror=install-absolute-destination
CMake Error (install-absolute-destination) at CMakeLists.txt:4 (install):
  INSTALL command given absolute DESTINATION path:
    /opt/absolute/path
```

Both are exit 1 only when their own `-Werror=<name>` flag is present; the
default (no flag) run is exit 0 with no diagnostic printed at all for
either — `--warn-uninitialized`, the pre-4.4 spelling, is a separate legacy
flag not exercised here (out of scope: superseded by this category, see
[Contested](#contested--evolving)).

### 3. Presets schema rejection

Three fixtures, `schema-version`/`warnings-key` combinations, each run with
`cmake --preset default` (`exp3-presets/{v12-author,v11-dev,v12-dev}/`):

| Fixture | schema | `warnings` key | 3.31.12 | 4.3.4 | 4.4.2 |
|---|---|---|---|---|---|
| `v12-author` | 12 | `{"author": true}` | reject | reject | **accept** |
| `v11-dev` | 11 | `{"dev": true}` | reject | **accept** | **accept** |
| `v12-dev` | 12 | `{"dev": true}` | reject | reject | **reject** |

Exact rejection messages:

```
# v12-author, 3.31.12:
CMake Error: Could not read presets from <dir>:
Error: @2,14: Unrecognized "version" 12: must be >=1 and <=10

# v12-author, 4.3.4:
CMake Error: Could not read presets from <dir>:
CMakePresets.json:2: Unrecognized "version" 12: must be >=1 and <=11

# v12-dev, 4.4.2 (the schema itself IS accepted by 4.4.2 — the key is not):
CMake Error: Could not read presets from <dir>:
File version must be 11 or lower for warnings.dev support
```

So the ceiling is exactly the "which of {schema, key}" split the map
committed to measuring: 3.31.12's ceiling is schema 10 regardless of key
name; 4.3.4's ceiling is schema 11, where `warnings.dev` is still the only
spelling; 4.4.2 accepts schema up to 12 but demands `warnings.author` once a
file declares schema ≥12 — `warnings.dev` under a schema-11-or-lower
declaration keeps working unchanged on 4.4.2
([Help/manual/cmake-presets.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst):
"The `dev` field is renamed to `author` in `configurePresets.warnings` and
`configurePresets.errors`" under the version-12 changelog).

### 4. Floors and the `...` range syntax

Fixtures `exp4-floors/{v34,v35,v3154_3dots,yamlcpp_2dots,v315plain}`.

| Fixture | `cmake_minimum_required(...)` | 3.31.12 | 4.3.4 | 4.4.2 |
|---|---|---|---|---|
| `v34` | `VERSION 3.4` | exit 0, `CMake Deprecation Warning` ("< 3.10 will be removed") | exit **1**, `Compatibility with CMake < 3.5 has been removed` | exit **1**, same |
| `v35` | `VERSION 3.5` | exit 0, deprecation warning | exit 0, deprecation warning | exit 0, `CMake Warning (deprecated)` |
| `v3154_3dots` | `VERSION 3.15...4.3` (three dots) | exit 0, **`CMP0126=NEW CMP0140=NEW`** | same | same |
| `yamlcpp_2dots` | `VERSION 3.15..4.3` (two dots, the real yaml-cpp line) | exit 0, **`CMP0126= CMP0140=`** (both unset) | same | same, **no diagnostic under any `-Werror=` flag** |
| `v315plain` | `VERSION 3.15` | — | — | exit 0, `CMP0126= CMP0140=` (identical to the two-dot line, even under `-Werror=dev`) |

`jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:1` (current corpus SHA per map
[host] H8) is verbatim `cmake_minimum_required(VERSION 3.15..4.3)`. The
range separator "the `...` is literal"
([Help/command/cmake_minimum_required.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_minimum_required.rst)):
with two dots instead of three the whole token is not recognized as
`<min>...<max>` at all, so `CMAKE_MINIMUM_REQUIRED_VERSION` is literally the
string `3.15..4.3`, and both policy-`GET`s and the `v315plain` comparison
prove the effective behavior degrades to exactly `VERSION 3.15` — every
policy introduced between 3.16 and 4.3 that the author believed they had
opted into by writing "..4.3" is simply not set, silently, with zero
diagnostic on any of the three binaries including under `-Werror=dev` on
4.4.2. This is a real, present-day authoring defect in a widely-used
exemplar, not a historical one.

### 5. Cache: FORCE, INTERNAL, CMP0126, precedence

**FORCE vs INTERNAL** (fixtures `exp5-cache/{basic,internal}`, run on 4.4.2,
same build dir across two configures):

```
$ cmake -S basic -B build -DINPUT_VALUE=a   # set(X "${INPUT_VALUE}" CACHE STRING "d")
-- X=a
$ cmake -S basic -B build -DINPUT_VALUE=b   # reconfigure, same build dir
-- X=a                                      # UNCHANGED: no FORCE
$ grep '^X:' build/CMakeCache.txt
X:STRING=a

$ cmake -S internal -B build -DINPUT_VALUE=a  # set(Y ... CACHE INTERNAL "d")
-- Y=a
$ cmake -S internal -B build -DINPUT_VALUE=b  # reconfigure
-- Y=b                                        # OVERWRITTEN despite no FORCE keyword
$ grep '^Y:' build/CMakeCache.txt
Y:INTERNAL=b
```

Matches the `set()` manual, both tested binaries (map [host] H4): "Use of
this type implies `FORCE`"
([Help/command/set.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/set.rst),
line: "They may be used to store variables persistently across runs. Use of
this type implies `FORCE`.").

**CMP0126** (fixture `exp5-cache/cmp0126/CMakeLists-{OLD,NEW}.txt`: a normal
`set(Z "normal-value")` followed by `set(Z "cache-value" CACHE STRING "d")`,
then read `${Z}`):

| Policy | 3.31.12 | 4.4.2 |
|---|---|---|
| `OLD` | `Z=cache-value` (+ deprecation warning on the `cmake_policy(SET)` call) | same |
| `NEW` | `Z=normal-value` | same |

`OLD` makes `set(CACHE)` remove the same-named normal variable in the
current scope so the subsequent read falls through to the cache; `NEW`
leaves the normal variable in place, so it silently shadows the value that
was just written to the cache
([Help/policy/CMP0126.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0126.rst)).
CMP0126 itself is a deprecated policy on both tested lines — setting it
explicitly, in either direction, prints a `CMake Deprecation Warning`
regardless of which value is chosen.

**Precedence** (fixture `exp5-cache/precedence`: `option(MYVAR "an option"
OFF)` then a preset `p1` with `cacheVariables: {"MYVAR": "from-preset"}`,
run on 4.4.2):

| Invocation | `MYVAR` after `option()` reads it |
|---|---|
| plain configure | `OFF` |
| `-DMYVAR=from-cli` | `from-cli` |
| `--preset p1` | `from-preset` |
| `--preset p1 -DMYVAR=from-cli` | `from-cli` |

`-D` beats a preset's `cacheVariables`; both beat `option()`'s own default.
In every case, a **subsequent plain `set(MYVAR "from-set-no-cache")`** (no
`CACHE`) further down the same listfile makes every following read in that
scope report `from-set-no-cache`, while the on-disk cache entry is left
exactly as `-D`/preset/`option()` set it
(`grep '^MYVAR' build-preset/CMakeCache.txt` → `MYVAR:BOOL=from-cli`, type
still `BOOL` from `option()`'s declaration even though the stored value is
the non-boolean string `from-cli` — a second, minor landmine: `option()`
does not validate or coerce an existing cache entry's *value* to a boolean,
only claims the `BOOL` *type* if the entry pre-exists untyped).

### 6. The find_ocx memo functions, verbatim, three reconfigures

`__ocx_set_result`, `__ocx_memo_hit`, `__ocx_memo_store` copied verbatim from
`/home/mherwig/dev/find_ocx/ocx.cmake:609-611,616-628,630-633` into
`exp6-memo/CMakeLists.txt` under `cmake_policy(PUSH)`/`VERSION 3.19`/`POP`,
run on 4.4.2, same build dir, `FINGERPRINT` changed on run 2 and held
constant on run 3:

```
### run1: FINGERPRINT=fp1
-- RUN: fingerprint=fp1 memo_hit=FALSE stored_fp=
-- AFTER_STORE: stored_fp=fp1
### run2: FINGERPRINT=fp2 (changed)
-- RUN: fingerprint=fp2 memo_hit=FALSE stored_fp=fp1
-- AFTER_STORE: stored_fp=fp2
### run3: FINGERPRINT=fp2 (unchanged from run2)
-- RUN: fingerprint=fp2 memo_hit=TRUE stored_fp=fp2
-- AFTER_STORE: stored_fp=fp2
```

Run 3 **is** a memo hit. The audit's top-ranked defect — that
`__ocx_set_result`'s missing `FORCE` keyword leaves `OCX_<name>_*` and the
fingerprint stale after an invalidated reconfigure — **does not reproduce**:
`CACHE INTERNAL` behaves exactly as documented (§5) and the memo correctly
re-stores `fp2` on run 2 and correctly recognizes it as current on run 3.
This directly confirms map conflict 16's "Decided (normative): the memo
defect is refuted" with the behavioral repro the map marked as *pending*.

### 7. Policy capture at function-definition time

`exp7-policy-capture/module.cmake`:

```cmake
cmake_policy(PUSH)
cmake_policy(VERSION 3.19)
function(f1_inside_push)
  cmake_policy(GET CMP0124 p0124)
  cmake_policy(GET CMP0140 p0140)
  message(STATUS "f1 ...: CMP0124=${p0124} CMP0140=${p0140}")
endfunction()
cmake_policy(POP)
function(f2_after_pop)
  cmake_policy(GET CMP0124 p0124)
  cmake_policy(GET CMP0140 p0140)
  message(STATUS "f2 ...: CMP0124=${p0124} CMP0140=${p0140}")
endfunction()
```

included from a `cmake_minimum_required(VERSION 3.31)` project, on 4.4.2:

```
-- f1 (defined inside PUSH/VERSION 3.19): CMP0124= CMP0140=
-- f2 (defined after POP): CMP0124=NEW CMP0140=NEW
```

`f1` (defined while the module's own `VERSION 3.19` pin is active) sees
both `CMP0124` (3.21) and `CMP0140` (3.25) as **unset** — they postdate
3.19. `f2`, defined in the same file one line after `cmake_policy(POP)`,
sees the **includer's** state (`VERSION 3.31` → both `NEW`). A CMake
function's policy behavior is fixed at the line where `function()` is
parsed, not at the line where it is called — this is the mechanism, not
just the location, behind find_ocx's `__ocx_self_update` (defined after
`ocx.cmake`'s own `cmake_policy(POP)` at line 1383): that one function will
silently follow whatever policy version the *consuming* project declared,
never the module's own pinned 3.19 baseline, while every other function in
the file is insulated from it.

### 8. Returns and scopes

Fixture `exp8-returns/CMakeLists.txt`, 4.4.2:

- **`PARENT_SCOPE` through a nested helper** — one hop only, as documented:
  `inner_ps()` sets `RESULT_VAR PARENT_SCOPE`, visible to its direct caller
  `outer_ps` (`RESULT_VAR=from-inner`); `outer_ps` must re-`set(...
  PARENT_SCOPE)` itself to relay it to the top level
  (`RESULT_VAR=from-inner-relayed` only after that second explicit hop).
- **`return(PROPAGATE)`** behaves like a single `PARENT_SCOPE` hop too:
  `inner_prop()` propagates `PROP_VAR` to its caller `outer_prop`
  (`PROP_VAR=from-inner-prop`), but `outer_prop` not calling `return(PROPAGATE
  PROP_VAR)` itself leaves the top level's `PROP_VAR` empty.
- **`block(SCOPE_FOR VARIABLES)`** isolates a `set()` inside it exactly as
  advertised: `BLOCK_VAR` set to `inside-block` inside the block reads back
  as `before-block` immediately after `endblock()`.
- **`return(PROPAGATE)` inside a bare top-level `block()`** — the surprise:

  ```
  set(BLOCK_PROP "before-propagate-block")
  block(SCOPE_FOR VARIABLES)
    set(BLOCK_PROP "inside-propagate-block")
    return(PROPAGATE BLOCK_PROP)
  endblock()
  message(STATUS "after propagate-block: BLOCK_PROP=${BLOCK_PROP}")
  message(STATUS "END OF FILE MARKER REACHED")
  ```

  produces:

  ```
  CMake Warning (author) in CMakeLists.txt:
    Cannot set "BLOCK_PROP": current scope has no parent.
  This warning is for project developers.  Use -Wno-author to suppress it.
  -- Configuring done (0.0s)
  ```

  Neither the "after propagate-block" nor the "END OF FILE MARKER REACHED"
  `message()` calls ever print. Per
  [Help/command/return.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst):
  "If not inside a function, [`PROPAGATE`] ensures the variables are
  propagated to the parent file or directory scope" — but the top-level
  `CMakeLists.txt` of a project has no parent directory scope, so the
  propagate itself fails (warning only, not fatal), **and** `return()` at
  directory scope still returns from the *file*, and a bare (non-function)
  `block()` does not intercept that — so the entire remainder of the
  top-level listfile is silently skipped. The same `return(PROPAGATE)` line
  inside a `block()` in a project's *subdirectory* `CMakeLists.txt` (one
  reached via `add_subdirectory()`) would propagate to that subdirectory's
  caller without incident, per the same manual's own worked example.

### 9. Argument parsing: `ARGN` vs `PARSE_ARGV`

Fixture `exp9-args/CMakeLists.txt`, identical on 3.31.12 and 4.4.2 (only the
category name in the CMP0174 notice differs, `(dev)` vs `(author)`):

```
--- empty value case: VALUE "" ---
-- ARGN-style: VALUE='' unparsed='' missing='VALUE'
CMake Warning (dev|author) ...: The VALUE keyword was followed by an empty
  string or no value at all.  Policy CMP0174 is not set, so
  cmake_parse_arguments() will unset the ARG_VALUE variable rather than
  setting it to an empty string.
-- PARSE_ARGV-style: VALUE='' unparsed='' missing=''

--- semicolon-bearing value case: VALUE "a;b;c" ---
-- ARGN-style: VALUE='a' unparsed='b;c' missing=''
-- PARSE_ARGV-style: VALUE='a;b;c' unparsed='' missing=''

--- VALUE keyword given with NO following argument (missing value) ---
-- ARGN-style: VALUE='' unparsed='' missing='VALUE'
-- PARSE_ARGV-style: VALUE='' unparsed='' missing='VALUE'
```

Two independent, measured bugs in the `ARGN`-forwarding idiom
(`cmake_parse_arguments(ARG "" "VALUE" "" ${ARGN})` with **unquoted**
`${ARGN}`), neither present in `PARSE_ARGV`:

1. **Semicolon splitting** — a single-value argument containing a literal
   semicolon (a path list, a generator-expression list) is silently cut at
   the first `;`; the remainder spills into `UNPARSED_ARGUMENTS`, where a
   caller checking only `if(ARG_UNPARSED_ARGUMENTS)` for "did I pass a bad
   flag" will misreport it as an unknown argument instead of a mis-split
   value.
2. **Empty-string erasure at the forwarding boundary** — calling
   `argn_style(VALUE "")` reports `missing='VALUE'`, identical to calling
   `argn_style(VALUE)` with nothing after the keyword at all, because
   unquoted `${ARGN}` list-expansion drops empty elements before
   `cmake_parse_arguments` ever sees them. The *identical* call through
   `PARSE_ARGV` (which reads CMake's internal `ARGV`/`ARGC` directly, never
   re-expanding a list) correctly distinguishes "empty string passed"
   (`missing=''`) from "nothing passed" (`missing='VALUE'`).

**`CMP0174`** (fixture `exp9b-cmp0174`, `cmake_policy(SET CMP0174 NEW)`,
`PARSE_ARGV`, `VALUE ""`), identical on 3.31.12 and 4.4.2:

```
-- CMP0174=NEW: ARG_VALUE is DEFINED, value=''
```

Without the policy (or with it `OLD`), the same call leaves `ARG_VALUE`
**undefined**, not empty — `if(DEFINED ARG_VALUE)` and `if(ARG_VALUE
STREQUAL "")` are not interchangeable checks pre-/post-CMP0174.

### 10. Downloads and vendored-copy include guards

**Silent download failure** (`exp10-download/{with-status,without-status}`,
4.4.2, `file(DOWNLOAD "file:///nonexistent/path/does-not-exist.txt" ...)`):

```
# with STATUS:
-- download STATUS=37;"Could not read a file:// file"
-- REACHED AFTER DOWNLOAD (configure continues)
-- Configuring done (0.0s)          # exit 0

# without STATUS:
-- REACHED AFTER DOWNLOAD (no STATUS arg) -- does configure continue?
-- Configuring done (0.0s)          # exit 0, ZERO diagnostic text about the failure
```

Configure completes successfully (exit 0) either way; without `STATUS`
there is no message of any kind — the only observable symptom downstream is
a missing or truncated file.

**Two vendored copies with `include_guard(GLOBAL)`**
(`exp10b-guard/{sub1,sub2}/mymodule.cmake`, identical bodies except a
version string, each with its own `include_guard(GLOBAL)`, each
`add_subdirectory()`-included from a common top level, 4.4.2):

```
-- mymodule.cmake (sub1 copy) body EXECUTED, setting version 1.0-from-sub1
-- sub1 sees MYMODULE_VERSION=
-- mymodule.cmake (sub2 copy) body EXECUTED, setting version 2.0-from-sub2
-- sub2 sees MYMODULE_VERSION=
-- top-level GLOBAL property MYMODULE_VERSION=2.0-from-sub2
```

Both copies' bodies run in full — `include_guard(GLOBAL)` keys on the
*including file's own absolute path*, so two physically distinct files
(different `sub1/`/`sub2/` paths) are never "the same include" to guard
against, no matter how identical their content or `GLOBAL` scope. The later
`add_subdirectory()` wins any shared global state with **no warning, no
error, no trace of the collision anywhere in the log**. `include_guard()`
protects only against a *literal* re-`include()` of one file, never against
two vendored copies of what a human would call "the same module."

## Normative guidance candidates

Verification commands below name an explicit directory operand, quote every
glob, use one `-e` per alternative, and say which way empty output reads.

1. **Rule: name the configure gate as two lines, gated by version — never a
   single `-Werror=dev` line.** Rationale: `-Werror=author` is a no-op on
   ≤4.3 and `-Werror=dev` prints a deprecation notice (harmless but noisy)
   on 4.4+ ([§1](#1-gate-spelling)). Verify: a CI script or Makefile target
   contains both spellings behind a version check —
   `grep -rn -e 'CMAKE_VERSION VERSION_GREATER_EQUAL 4.4' -e 'Werror=author' <ci-dir>`;
   empty output on a repo whose CI also runs `-Werror=dev` unconditionally
   is the finding (single-line gate, silently inert on 4.4+ for the
   `author` name and noisy on 4.4+ for `dev`). Floor: any (behavior differs
   ≤4.3 vs 4.4+, not gated by the project's own floor).
2. **Rule: a CI gate that wants `CMD_UNINITIALIZED` or
   `CMD_INSTALL_ABSOLUTE_DESTINATION` promoted must name them explicitly —
   `-Werror=author`/`-Werror=dev` never reaches them.** Rationale: both
   default to `ignore` and have no parent category
   ([§2](#2-diagnostic-categories)). Verify (CMake ≥4.4): `cmake --help-manual
   cmake-diagnostics | grep -e 'CMD_UNINITIALIZED' -e
   'CMD_INSTALL_ABSOLUTE_DESTINATION'` confirms both exist and are
   `ignore`-by-default on the pinned binary; a CI invocation missing
   `-Werror=uninitialized`/`-Werror=install-absolute-destination` while
   claiming a "strict" gate is the finding. Floor: CMake ≥4.4 (category
   names do not exist below it; below 4.4 there is no CLI spelling to add).
3. **Rule: a presets file that raises its `"version"` past 11 must rename
   `warnings.dev`/`errors.dev` to `warnings.author`/`errors.author` in the
   same edit.** Rationale: 4.4.2 rejects `dev` under schema ≥12 with a named
   error; the rename is otherwise invisible until someone's CMake is new
   enough to enforce it ([§3](#3-presets-schema-rejection)). Verify:
   `jq -e '.version >= 12 and ((.configurePresets // [])[] | .warnings? // {} | has("dev"))' CMakePresets.json`
   — a `true`/match is the finding, no match is pass. Floor: CMake ≥4.4 to
   observe the rejection; the file itself may target any floor.
4. **Rule: never write a "range" `cmake_minimum_required` with anything
   other than exactly three literal dots between `<min>` and `<max>`.**
   Rationale: two dots parse as a single (garbage) version literal with
   zero diagnostic and silently collapse the floor to `<min>`'s numeric
   prefix, on all three tested lines, even under `-Werror=dev`/`author`
   ([§4](#4-floors-and-the--range-syntax)). Verify:
   `grep -rn -E 'cmake_minimum_required\(VERSION [0-9.]+\.\.[^.]' --include='*.cmake' --include='CMakeLists.txt' .`
   — any match with exactly two dots (not three) before the max version is
   the finding; empty output is pass. Floor: CMake ≥3.12 (`<min>...<max>`
   syntax exists at all below that the extra dots are ignored per the
   manual, which is a second, milder trap worth a one-line callout in the
   depth file but not its own rule).
5. **Rule: an exported/memoized value a module recomputes every configure
   belongs in `CACHE INTERNAL`, never `CACHE STRING ... ` without `FORCE`.**
   Rationale: `CACHE INTERNAL` implies `FORCE` and is confirmed by execution
   to update correctly across reconfigures; a non-`INTERNAL`, non-`FORCE`
   cache write is the one that goes stale ([§5](#5-cache-force-internal-cmp0126-precedence),
   [§6](#6-the-find_ocx-memo-functions-verbatim-three-reconfigures)). Verify: `grep -rn -A1 'CACHE STRING' --include='*.cmake' <dir>`
   read by hand for "is this value supposed to be recomputed every
   configure" — a hit that is, and lacks `FORCE`, is the finding. Floor:
   any.
6. **Rule: a module pinning its own policy version must place
   `cmake_policy(POP)` after the last `function()`/`macro()` definition in
   the file, never before one.** Rationale: measured directly — a function
   defined after `POP` captures the *includer's* policy state, not the
   module's pinned one, with no warning that this happened
   ([§7](#7-policy-capture-at-function-definition-time)). Verify:
   `awk '/cmake_policy\(POP\)/{pop=NR} /^(function|macro)\(/{if(pop && NR>pop) print FILENAME":"NR}' <module>.cmake`
   — any output is the finding (a definition after `POP`); empty is pass.
   Floor: any (mechanism is definition-time policy capture, present since
   policies exist).
7. **Rule: never call `return(PROPAGATE ...)` from inside a `block()` that
   is not itself inside a `function()`, at the top level of a project's own
   root `CMakeLists.txt`.** Rationale: it warns instead of erroring
   ("current scope has no parent") and silently truncates the remainder of
   the listfile as a side effect of the *unrelated* directory-scope
   `return()` semantics — a correctness bug that produces no error exit
   code ([§8](#8-returns-and-scopes)). Verify: a manual read — grep can find
   the shape but not the "is this the root listfile" context:
   `grep -rn -A3 'block(' --include='CMakeLists.txt' . | grep -e 'return(PROPAGATE'`
   flags candidates; each hit is read to confirm whether the enclosing file
   is a project's top-level `CMakeLists.txt` and whether the `block()` is
   inside a `function()`. Floor: CMake ≥3.25 (`block()` and
   `return(PROPAGATE)` both introduced there).
8. **Rule: any `cmake_parse_arguments` whose keywords may hold a
   semicolon-bearing value (a path, a list, a generator expression) or an
   intentionally-empty string must use `PARSE_ARGV`, never
   `cmake_parse_arguments(<prefix> ... ${ARGN})`.** Rationale: measured,
   directly reproducible correctness bugs in the `ARGN`-forwarding form on
   both inputs; `PARSE_ARGV` has neither
   ([§9](#9-argument-parsing-argn-vs-parse_argv)). Verify:
   `grep -rn 'cmake_parse_arguments([A-Za-z_]* ' --include='*.cmake' --include='CMakeLists.txt' <dir>`
   (a positive match on the non-`PARSE_ARGV` form) then read each call site
   for whether any of its single/multi-value keywords could plausibly carry
   a semicolon or an empty string; empty grep output is pass, a match that
   also is semicolon/empty-prone is the finding. Floor: CMake ≥3.5 for
   `PARSE_ARGV`; CMP0174 (3.31+) is a separate, additive concern for
   distinguishing "empty" from "absent" once on `PARSE_ARGV`.
9. **Rule: every `file(DOWNLOAD ...)` must capture `STATUS` and check it —
   a failed download never stops configure by itself.** Rationale: measured
   exit 0 with and without `STATUS`, and zero diagnostic text at all
   without it ([§10](#10-downloads-and-vendored-copy-include-guards); this
   also restates map row M-D-05, which this dive settles behaviorally).
   Verify: `grep -rn -A6 'file(DOWNLOAD' --include='*.cmake' <dir> | grep -c 'STATUS'`
   compared by hand against the count of `file(DOWNLOAD` call sites — fewer
   `STATUS` occurrences than call sites is the finding. Floor: any.
10. **Rule: a copy-and-own module vendored into more than one subdirectory
    of the same build should assert its own version (a
    `define_property`/cache guard keyed by the module's declared version,
    checked and fatally erroring on mismatch) — `include_guard(GLOBAL)`
    alone provides no protection between two copies at different paths.**
    Rationale: measured — both copies' bodies run in full, last one wins on
    shared state, with no report of the collision
    ([§10](#10-downloads-and-vendored-copy-include-guards)). Verify: a named
    reading heuristic — for a module vendored under more than one path in
    a build (`find <root> -name '<module>.cmake' | wc -l` reporting more
    than 1), open each copy and confirm it checks a global/cache flag for
    "already loaded, is this the same version" beyond the plain
    `include_guard()` call; a bare `include_guard(GLOBAL)` with no such
    check is the finding. Floor: any.

## Exemplar evidence

- `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:1` is a live, present-day
  violation of rule 4 — the exact two-dot line measured in §4, confirmed
  present in the 2026-09-26 corpus re-fetch (map [host] H8's current SHA).
- `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:609-611` (`__ocx_set_result`)
  satisfies rule 5 (`CACHE INTERNAL`, confirmed correct by §6) but its
  companion `cmake_policy(POP)` at `ocx.cmake:1383` violates rule 6:
  `__ocx_self_update` is defined after that `POP`
  (`grep -n 'cmake_policy(POP)\|^function(__ocx_self_update'
  /home/mherwig/dev/find_ocx/ocx.cmake` — both cited by map conflict 16 and
  [ocx] §3). Per §7's mechanism, `__ocx_self_update` follows whatever
  policy version the *consuming* project sets, not find_ocx's own pinned
  3.19, a live (if narrow) instance of the exact pattern rule 6 forbids.
- No exemplar in the 46-repo corpus was found using `PARSE_ARGV` universally
  and zero `ARGN`-forwarding sites (rule 8) in this dive's scope — the map's
  own count stands ([shape] §7: 480 `PARSE_ARGV` vs 322 `ARGN`, cited by
  M-C-06) and is not re-measured here; this dive's contribution is *why*
  the `ARGN` form is unsafe, not a fresh count.
- find_ocx's `file(DOWNLOAD)` sites (rule 9): map [host] H6 already
  recorded `rg -c TLS_VERIFY ocx.cmake` → 0 and 2 of 5 sites carrying
  `EXPECTED_HASH`; this dive adds that *none* of the failure modes those
  downloads would hit on a bad mirror are caught by exit code alone — a
  `STATUS`-checking wrapper is necessary regardless of hash/TLS posture.

## AI-agent angle

- **Reflexively writing `-Werror=dev` for a "strict CMake CI" prompt on any
  CMake version.** It quietly does nothing for the `author`-only categories
  on ≤4.3 (wrong direction: agent assumes it's *more* categories, not
  *the* category) and, on 4.4+, technically still works but emits a
  deprecation line that then shows up in every CI log as noise the agent
  did not anticipate. Check: run the exact configure command once against
  the project's actual CMake and grep the log for `is deprecated` — any hit
  means the flag choice needs the version-gated form from rule 1.
- **Treating `cmake_minimum_required(VERSION 3.15..4.3)`-style two-dot
  strings as if they were the documented range syntax**, because training
  data is full of real repos with this exact typo (yaml-cpp is one) and no
  visible error ever calls it out. Check: `cmake_policy(GET CMP0140
  <out>)` immediately after `project()` in a scratch copy — an empty result
  when the model believes 4.3-era policies are active is the tell.
- **Assuming `${ARGN}` forwarding into `cmake_parse_arguments` is
  equivalent to `PARSE_ARGV`** because both "parse the function's
  arguments" — this is the highest-frequency wrong code an LLM trained on
  pre-2019 CMake tutorials will emit for a new function. Check: pass a
  semicolon-bearing value to the generated function and read
  `<prefix>_UNPARSED_ARGUMENTS` — non-empty when it should be empty is the
  tell (§9).
- **Believing `CACHE INTERNAL` needs an explicit `FORCE` "to be safe,"**
  and defensively adding one everywhere out of caution — harmless but
  reveals the model does not know the manual states `INTERNAL` implies it;
  a bigger risk is the mirror-image mistake, assuming a `CACHE STRING`
  *without* `FORCE` behaves like `CACHE INTERNAL` and will "just update."
  Check: `cmake --help-command set | grep -A2 INTERNAL` against the
  project's own pinned CMake to confirm the wording still holds (it has
  since at least 3.31.12 through 4.4.2, unchanged).
- **Suggesting `-Wdev`, `--warn-uninitialized` or `-Werror=dev` as the
  *only* CMake-4-era diagnostics vocabulary**, an artifact of 3.x-era
  training data — CMake 4.4 replaced the whole surface with named
  categories and `cmake_diagnostic()`; a model unaware of this will never
  suggest `-Werror=uninitialized` or `-Werror=install-absolute-destination`
  even when they are exactly the right fix. Check: `cmake --version` on
  the project's pinned binary; if ≥4.4, prefer the category names from §2
  over the legacy flags in any new guidance.
- **Writing `return(PROPAGATE ...)` inside a `block()` at file scope
  as a "safe, modern" replacement for `set(... PARENT_SCOPE)`** without
  checking whether the enclosing file is a project's own root listfile —
  a pattern an LLM is likely to suggest precisely *because* the `block()`
  manual's own example makes it look universally safe. Check: does the
  file being edited have a caller (was it reached via `add_subdirectory()`
  or `include()`)? If it is the root `CMakeLists.txt`, this pattern warns
  and silently truncates the file (§8).

## Contested / evolving

- **Whether `-Werror=dev`/`--warn-uninitialized`-style legacy flags will be
  removed outright, or stay as permanent synonyms.** As of 4.4.2 they are
  accepted with a deprecation notice, not removed; Kitware's own experimental-
  gates policy (era-recheck 2026-09-26, unchanged UUID list) shows a general
  pattern of long-lived compatibility shims, so removal-by-4.5 is unlikely
  but unconfirmed — this dive did not test any 4.5/`master` build (out of
  scope; map [host] H2 already flags `CMD_STRICT`/`CMD_NON_TARGET_DIRECTIVE`
  as master-only, unreleased as of 2026-09-26).
- **Whether the `cmake-diagnostics(7)` category rewrite will grow more
  parent/child relationships over time**, changing which single `-Werror=`
  flag promotes which set. The two un-parented categories measured here
  (`CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`) could plausibly be re-parented
  under `CMD_AUTHOR` in a future minor, at which point rule 2's "must name
  them explicitly" caveat would become unnecessary but harmless.
- **The `CMP0126`/`CMP077`-family "same-named cache and normal variable"
  policies are themselves deprecated** (both explicit `SET` directions warn
  on 3.31.12 and 4.4.2) — the long-run trend is that CMake stops offering a
  choice here at all and simply fixes `NEW` behavior permanently; a rule
  that still explains `OLD` is documenting a shrinking, not growing,
  surface.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `ocx package exec kitware/cmake:{3.31,4.3,4.4} -- cmake -S <fixture> -B <build> [flags]`, exp1–exp10b, this worktree | 20 distinct scratch-project measurements on 3.31.12/4.3.4/4.4.2, quoted verbatim above | 2026-09-26 | Primary: settles every claim in this dive by execution, not documentation |
| `cmake --help-manual cmake-diagnostics` on 4.4.2 | Rendered manual, host binary | 2026-09-26 | Primary: seven categories, parent/default table, reproduces map [host] H2 |
| `cmake --help-command cmake_diagnostic` on 4.4.2 | Rendered command doc, host binary | 2026-09-26 | Primary: `SET`/`PROMOTE`/`DEMOTE`, recursion semantics for `-Wparent`/`-Wno-child` |
| [Help/command/cmake_minimum_required.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_minimum_required.rst) | Raw RST, tagged release | 2026-09-26 fetch, v4.4.2 content | "the `...` is literal" — the exact sentence explaining the yaml-cpp two-dot defect |
| [Help/command/cmake_parse_arguments.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_parse_arguments.rst) | Raw RST, tagged release | 2026-09-26 fetch | CMP0174 versionchanged note (3.31), confirms which CMake introduced the empty-value policy |
| [Help/command/return.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst) | Raw RST, tagged release | 2026-09-26 fetch | "If not inside a function, [PROPAGATE] ensures the variables are propagated to the parent file or directory scope" — explains the exp8 top-level-block warning exactly |
| [Help/command/block.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/block.rst) | Raw RST, tagged release | 2026-09-26 fetch | `SCOPE_FOR [DIAGNOSTICS] [POLICIES] [VARIABLES]` syntax, confirms `block()` does not intercept `return()` |
| [Help/command/set.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/set.rst) | Raw RST, tagged release | 2026-09-26 fetch | "Use of this type implies `FORCE`" for `CACHE INTERNAL`, the exact sentence §5/§6 confirm by execution |
| [Help/policy/CMP0126.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0126.rst) | Raw RST, tagged release | 2026-09-26 fetch | OLD/NEW behavior definition, matches the exp5 measurement precisely, notes the FORCE/INTERNAL exception explicitly |
| [Help/manual/cmake-presets.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst) | Raw RST, tagged release | 2026-09-26 fetch | Version-12 changelog: "The `dev` field is renamed to `author`" |
| `/home/mherwig/dev/find_ocx/ocx.cmake:609-636` | The exact source copied verbatim for exp6 | measured 2026-09-26 (file as of the dirty working tree per map [host] H6) | The subject of the refuted headline defect |
| `git -C /home/mherwig/.cache/research-lang/exemplars/cmake/jbeder__yaml-cpp show HEAD:CMakeLists.txt` | Exemplar-corpus file read | 2026-09-26 (corpus re-fetch, SHA `1e0876c671`) | Confirms the two-dot line is present verbatim in the current corpus snapshot, not a stale citation |
| `.agents/research/cmake-topic-map.md` (rows M-A-01, M-A-02, M-F-06, M-J-01, M-B-04, M-B-06, M-C-01, M-C-02, M-C-05, M-C-06, M-D-01, M-D-02, M-D-05; conflict 16) | This program's own adjudicated map | 2026-09-26 | The commissioning brief and prior "pending measurement" markers this dive resolves |
| `.agents/research/cmake-topic-map/era-recheck-2026-09-26.md` | This program's freshness recheck | 2026-09-26 | Confirms no CMake 4.4.4/4.5 exists and the experimental-gate list is unchanged, bounding this dive's version claims |

Measurement count: 20 distinct scratch-project runs across 10 experiment
groups (exp1 through exp10b, table row 1), each executed on some or all of
3.31.12, 4.3.4, 4.4.2 as the experiment required. The 14 rows in the table
above break down as: 1 bundled measurement row (the 20 runs) + 2
rendered-manual reads on the pinned 4.4.2 binary + 7 primary documentation
fetches at the `v4.4.2` tag + 1 exemplar-corpus file read
(`jbeder__yaml-cpp`) + 1 module-source read (`find_ocx/ocx.cmake`) + 2
internal adjudication citations (the topic map and its era-recheck, which
this dive resolves rather than treats as independent evidence) = 14.
