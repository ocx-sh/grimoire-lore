---
title: "The contract a shipped CMake module keeps"
topic: cmake-module-authoring
agent: cmake-module-contracts
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 21
scope: |
  What a reusable shipped CMake module (a Find module, a helper module, a
  copy-and-own tool bootstrapper like find_ocx) must guarantee: the
  cmake-developer(7) Find-module contract, the network/process/JSON contract
  for a module that downloads or executes, message and diagnostic hygiene,
  configure-time re-run correctness, credential handling, script-mode
  support, and the find_package hand-off (<Name>_ROOT / CMP0144). Answers
  M-D-03 through M-D-15, M-C-04, M-C-08 from cmake-topic-map.md. Does not
  re-decide the CMake floor, the configure-gate spelling, or general
  target/install hygiene (owned by CMK-VER, CMK-CORE, CMK-TGT, CMK-INST); does
  not re-measure language/gate semantics owned by
  versions-and-gate/gate-and-language-semantics.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The Find-module contract (M-D-03, M-D-04)](#1-the-find-module-contract-m-d-03-m-d-04)
   2. [file(DOWNLOAD) as a module dependency (M-D-05)](#2-filedownload-as-a-module-dependency-m-d-05)
   3. [execute_process as a module dependency (M-D-06)](#3-execute_process-as-a-module-dependency-m-d-06)
   4. [string(JSON) parsing tool output (M-D-07)](#4-stringjson-parsing-tool-output-m-d-07)
   5. [Diagnostics: prefix, severity, context (M-D-08)](#5-diagnostics-prefix-severity-context-m-d-08)
   6. [Configure-time re-run correctness (M-D-09)](#6-configure-time-re-run-correctness-m-d-09)
   7. [Environment snapshotting and credentials (M-D-10)](#7-environment-snapshotting-and-credentials-m-d-10)
   8. [Script-mode support and naming honesty (M-D-11)](#8-script-mode-support-and-naming-honesty-m-d-11)
   9. [The find_package hand-off: <Name>_ROOT (M-D-12)](#9-the-find_package-hand-off-name_root-m-d-12)
   10. [Reference docs from bracket comments (M-D-13)](#10-reference-docs-from-bracket-comments-m-d-13)
   11. [Self-updating / copy-and-own verification (M-D-14)](#11-self-updating--copy-and-own-verification-m-d-14)
   12. [Host detection and offline knobs (M-D-15)](#12-host-detection-and-offline-knobs-m-d-15)
   13. [Function vs macro (M-C-04)](#13-function-vs-macro-m-c-04)
   14. [Lists vs hand-joined strings (M-C-08)](#14-lists-vs-hand-joined-strings-m-c-08)
   15. [The chased surprise: CPM.cmake's global policy mutation](#15-the-chased-surprise-cpmcmakes-global-policy-mutation)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A shipped `Find<Pkg>.cmake` MUST call `find_package_handle_standard_args()` (FPHSA) to set `<Pkg>_FOUND`, never hand-roll it — the cmake-developer(7) contract, unchanged since ≥3.0, current at v4.4.2.
- Every imported target a Find module creates MUST be guarded `if(NOT TARGET <Pkg>::<Pkg>)` — required because `find_package()` can legitimately run the module more than once per configure (v4.4.2 cmake-developer(7)).
- `file(DOWNLOAD)` does **not** fail the configure on a missing/unreachable URL by itself — MEASURED on 3.31.12 and 4.4.2 with a nonexistent `file://` URL: the configure completed with `-- Configuring done` after the download silently no-op'd. Every `file(DOWNLOAD)` in a module MUST check `STATUS`.
- `execute_process()` does **not** fail the configure on a nonzero child exit by itself — MEASURED on 3.31.12 and 4.4.2: an unchecked `execute_process(COMMAND false)` let configure continue to completion. Every module `execute_process()` MUST check `RESULT_VARIABLE` or pass `COMMAND_ERROR_IS_FATAL ANY` (3.19+).
- `CMAKE_TLS_VERIFY` (and `file(DOWNLOAD TLS_VERIFY)`) default to **on** only since CMake 3.31 (`versionchanged:: 3.31`, v4.4.2 docs) — a module whose floor admits 3.19–3.30 MUST pass `TLS_VERIFY ON` explicitly, not rely on the ambient default.
- `execute_process(... ENCODING)` defaults to `AUTO` on 3.15–3.30 and to `UTF-8` only since 3.31 (CMP0176) — a module parsing subprocess output on Windows below that floor MUST state `ENCODING UTF-8` explicitly if it expects UTF-8.
- `cmake_policy(PUSH)` / `cmake_policy(VERSION <floor>)` / `cmake_policy(POP)` genuinely isolates a pinned function's policy view from the includer's ambient policy — MEASURED: a function defined inside the pin reads the pinned (NEW) `CMP0054` even when the includer explicitly set `CMP0054 OLD`; a function defined **after** the module's `POP` inherits whatever policy state is ambient at that point in the file, not the pin.
- A module's `<Name>_ROOT` hint (case-preserved, `CACHE PATH ... FORCE`) is sufficient on its own for `find_package(<Name>)` to pick it up (CMP0074, 3.12+) — MEASURED, and it takes precedence over `CMAKE_PREFIX_PATH`. The module does **not** need to also set the upper-case `<NAME>_ROOT` form (CMP0144, 3.27): that form only activates when the *consumer* opts into `CMP0144 NEW` and is meant for a user-set uppercase variable, not for the provisioning module to duplicate — MEASURED with `CMP0144` OLD (uppercase ignored) and NEW (uppercase honored).
- CMake ships **no maintained semantic CMake linter** in 2026 (cmake-lint/cmake-format last released 2020-08-19); the module-hygiene checks in this file are named greps and reading heuristics, not linter rule IDs — settled in `versions-and-gate/floors-policies-and-era`, cited here, not re-derived.
- A module that snapshots environment variables into `CACHE` variables MUST exclude anything credential-shaped by name — MEASURED: a naive `foreach()` snapshot of three env vars, one named `*_AUTH_TOKEN`, wrote the token in plaintext into `CMakeCache.txt`.
- `include(FetchContent)`/`ExternalProject`/`file(DOWNLOAD)` inside a `Find<Pkg>.cmake` on a miss is a real, shipped pattern (`ccache/ccache`'s `FindZstd.cmake`) — it must be documented and switchable off, never silent; that same module also skips FPHSA and exports a non-namespaced `dep_zstd` target, breaking two more cmake-developer(7) conventions in the same file.
- `include_guard()` is the wrong tool for a `Find<Pkg>.cmake` file — zero of the Kitware Find modules sampled (`FindZLIB`, `FindBZip2`, `FindEXPAT`, `FindIconv`, `FindPython/Support.cmake`) use it; idempotency comes from FPHSA's own re-entrant design plus `NOT TARGET` guards. `include_guard(GLOBAL)` belongs to a helper/bootstrap module like `ocx.cmake` that is `include()`d for its side effects, not `find_package()`d.
- `string(JSON GET ...)` without `ERROR_VARIABLE` aborts the configure with CMake's generic parse-error message instead of the module's own — find_ocx does this correctly at exactly 1 of its 17 `string(JSON)` call sites (audit-confirmed, unchanged in the working tree).
- `CMAKE_MESSAGE_CONTEXT` (3.17) has **zero** adoption across every module sampled here (find_ocx, `FindPython/Support.cmake`, `conan_provider.cmake`, `CPM.cmake`) — it is a real, current, structured-logging mechanism (`cmake --log-context`) that no shipped module exercises; SHOULD/CONSIDER at most, never MUST.
- `CMAKE_CONFIGURE_DEPENDS` correctly re-arms a reconfigure on a watched file's change but cannot watch a file that does not exist yet — a module MUST document that gap, not just implement the watch.
- `cpm_set_policies()` in `cpm-cmake/CPM.cmake` calls `cmake_policy(SET CMP0077|CMP0126|CMP0135|CMP0150 NEW)` **and** `set(CMAKE_POLICY_DEFAULT_CMPxxxx NEW)` at file-include time, with no `PUSH`/`POP` around it — this permanently changes four policy *defaults* for the rest of the including project's directory tree and every subdirectory, a load-bearing, undocumented-in-most-tutorials side effect of `include(CPM.cmake)`.
- `conan-io/cmake-conan`'s `conan_provider.cmake` pins its whole file inside one `cmake_policy(PUSH)` at line 35 and `POP` at the literal last line (722) — the correct shape find_ocx's `POP` at line 1383 of 1506 (leaving one function outside) does not match; find_ocx's gap is real but low-severity because the excluded function (`__ocx_self_update`) runs only in script mode.
- Even a widely used, actively maintained module has an unchecked `execute_process()`: `conan_provider.cmake:322` (`xcrun --find`, macOS probe) has no `RESULT_VARIABLE` — a narrow, low-stakes exception to the fail-loud rule, not grounds for weakening it.
- The audit's headline find_ocx "defect" — `__ocx_set_result` writing `CACHE INTERNAL` without `FORCE` — is refuted: `set()`'s own manual states `INTERNAL` implies `FORCE`, confirmed on both 3.31.12 and 4.4.2 (host H4, cmake-topic-map.md conflict 16); this report does not repeat it as a finding.
- A module's reference documentation should be extracted from `.rst:`-tagged bracket comments (`#[[.rst:` … `#]]`) immediately above the module or above each documented function, per cmake-developer(7)'s "A Sample Find Module" and consumed by the `cmake-module::` Sphinx directive (`sphinxcontrib-moderncmakedomain`) — this is how hand-written reference tables avoid drifting from the code, not a documentation-tool preference.

## Findings

### 1. The Find-module contract (M-D-03, M-D-04)

cmake-developer(7) at v4.4.2 spells out the contract precisely: a find module's "primary task ... is to determine whether a package is available, set the `<PackageName>_FOUND` variable ... and provide any variables, macros and imported targets required to use the package," honoring `Foo_FIND_QUIETLY`, `Foo_FIND_REQUIRED`, and the `Foo_FIND_VERSION` family, and it recommends doing all of this through `find_package_handle_standard_args` ([Help/manual/cmake-developer.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-developer.7.rst) §"Find Modules"). The "Sample Find Module" section gives the canonical shape:

```cmake
include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Foo
  REQUIRED_VARS
    Foo_LIBRARY
    Foo_INCLUDE_DIR
  VERSION_VAR Foo_VERSION
)
...
if(Foo_FOUND AND NOT TARGET Foo::Foo)
  add_library(Foo::Foo UNKNOWN IMPORTED)
  set_target_properties(Foo::Foo PROPERTIES
    IMPORTED_LOCATION "${Foo_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${Foo_INCLUDE_DIR}"
  )
endif()
```

Four of Kitware's own small Find modules follow this exactly, each pinning `CMP0159` for the duration and popping at the end:

- `Kitware__CMake@e8befb989b:Modules/FindZLIB.cmake:127-128,242,253-254,279` — `cmake_policy(PUSH)` / `SET CMP0159 NEW` at :127-128, FPHSA at :242, `if(NOT TARGET ZLIB::ZLIB)` at :253, `POP` at :279.
- `Kitware__CMake@e8befb989b:Modules/FindBZip2.cmake:105-106,132,155-156,183` — identical shape.
- `Kitware__CMake@e8befb989b:Modules/FindEXPAT.cmake:83-84,178,190-191,224` — identical shape.
- `Kitware__CMake@e8befb989b:Modules/FindIconv.cmake:94-95,186,198-199,205` — identical shape (its imported target is `INTERFACE IMPORTED`, not `UNKNOWN`, since Iconv can be a header-only shim on some libcs).
- `KDE__extra-cmake-modules@b4c4ec9997:find-modules/FindWayland.cmake:59,112` — `cmake_policy(VERSION 3.16)` (the simpler form, not PUSH/POP) then FPHSA.

**A Find module that breaks this contract, shipped and in real use**: `ccache__ccache@b471bbde29:cmake/FindZstd.cmake` (82 lines, read in full). It never calls `find_package_handle_standard_args` — it hand-sets `set(Zstd_FOUND 1)` at the last line with no version check, no component handling, and no `<Pkg>_NOT_FOUND_MESSAGE`. Its imported target is `add_library(dep_zstd ...)` (`:19`, `:76`) — not namespaced `Zstd::Zstd`, breaking the `Xxx::Xxx` convention cmake-developer(7) recommends specifically so `target_link_libraries` can diagnose a typo via `CMP0028`. And on a miss it silently reaches for `FetchContent` (`:43-70`) with a hardcoded `URL_HASH SHA256=...` — this is M-D-04's exact shape: "does any Find module download on a miss, hiding a network dependency behind a local search." It is documented in the surrounding project (a `DEPS=AUTO|DOWNLOAD` cache option gates it, `:7`), so it is not *silent* in ccache's own build, but a copy of this file dropped into another project without that surrounding `DEPS` option would download unconditionally the moment `Zstd` isn't found system-wide — the exact failure mode M-D-04 asks about.

None of the five clean Kitware/KDE Find modules use `include_guard()`. Neither does `ccache`'s `FindZstd.cmake`. This is consistent, not an oversight: `find_package(MODULE)` re-runs the module file on every call (there is no built-in cache of "already ran"), and FPHSA plus `NOT TARGET` guards are what makes re-running safe and cheap. `include_guard(GLOBAL)` is for a helper module `include()`d for its side effects and function definitions (like `ocx.cmake`, `ocx.cmake:173`), where re-running would redefine every function and re-execute top-level statements — a different problem with a different tool.

### 2. file(DOWNLOAD) as a module dependency (M-D-05)

`file(DOWNLOAD)`'s options relevant to a module (v4.4.2, [Help/command/file.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/file.rst) §DOWNLOAD): `STATUS <var>` ("a `;` separated list of length 2 ... 0 means no error"), `EXPECTED_HASH <algo>=<value>` ("the operation fails with an error" on mismatch), `TLS_VERIFY <ON|OFF>` (default *on* only `.. versionchanged:: 3.31`, previously off), `INACTIVITY_TIMEOUT`/`TIMEOUT <seconds>`.

MEASURED, `download-status/CMakeLists.txt` in this dive's scratch, on both 3.31.12 and 4.4.2:

```cmake
file(DOWNLOAD "file:///nonexistent/path/does-not-exist.bin" "${CMAKE_BINARY_DIR}/out_nostatus.bin")
message(STATUS "case-A: configure did NOT abort after a STATUS-less failed file(DOWNLOAD)")
```

Output on both lines: `-- case-A: configure did NOT abort after a STATUS-less failed file(DOWNLOAD)` followed by `-- Configuring done`. A parallel `STATUS`-checked call on the same nonexistent URL reported `code=37 msg="Could not read a file:// file"` — the failure is fully observable, but only if the module asks. **`file(DOWNLOAD)` never fails a configure by itself.**

find_ocx's 5 `file(DOWNLOAD)` sites all check `STATUS` (re-verified in the working tree, unchanged from the audit): `ocx.cmake:738,765,1413(via separate check),1434,1467`. `EXPECTED_HASH` covers 2 of 5 (the two that download the `ocx` binary and the release files, `:765`, `:1467`); the other 3 are the trust-root fetches themselves (dist manifest, GitHub releases API, `SHA256SUMS`) where a hash cannot exist yet — the standard bootstrap chicken-and-egg, not a gap FPHSA-style modules have to solve. **None of the 5 pass `TLS_VERIFY`** (`rg -cF TLS_VERIFY ocx.cmake` → 0), and find_ocx's floor is 3.19 — squarely inside the 3.19–3.30 window where the default was *off*. This is the one narrowed, still-live finding from the audit's original TLS claim (map conflict 16, correction 2): not "0 of 5 hashed" (refuted framing), but "0 of 5 pass `TLS_VERIFY ON`, and the floor admits the pre-3.31 off-by-default window."

### 3. execute_process as a module dependency (M-D-06)

MEASURED, `execproc-fail/CMakeLists.txt`, both 3.31.12 and 4.4.2:

```cmake
execute_process(COMMAND false)
message(STATUS "case-A: configure did NOT abort after an unchecked failing execute_process")
```

prints exactly that message, then continues to the next statement — `execute_process(COMMAND false COMMAND_ERROR_IS_FATAL ANY)`, which correctly halts with `CMake Error at CMakeLists.txt:9 (execute_process): execute_process failed command indexes: 1: "Child return code: 1"` and `Configuring incomplete, errors occurred!`. Both lines behave identically on 3.31.12 and 4.4.2. `COMMAND_ERROR_IS_FATAL` takes `ANY|LAST|NONE`, `NONE` added in CMake 4.0 as the explicit default when the option is omitted and `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL` is unset ([Help/command/execute_process.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/execute_process.rst) `.. versionadded:: 4.0`). `ENCODING` defaults to `AUTO` from 3.15–3.30 and to `UTF-8` only since 3.31 (`CMP0176`); `ENVIRONMENT`/`ENVIRONMENT_MODIFICATION` options are new in **4.4** — a module targeting the assumed 3.25 floor cannot use them and must keep threading environment through `execute_process`'s absence of a native env-override option (find_ocx does not need this; it snapshots into cache instead, see §7).

find_ocx's 2 real `execute_process` sites (`ocx.cmake:449,556`) both check `RESULT_VARIABLE`; its third site (`:1286`, inside a doc code-block, non-executable) is documentation, not code, so find_ocx is fully compliant here. `conan-io__cmake-conan@b1593849dd:conan_provider.cmake` is 4 of 5 compliant (`RESULT_VARIABLE` at :450,459,489; a `RESULT_VARIABLE`-checked block at :522-525) — the one gap is `:322`, an `xcrun --find <compiler>` probe inside `set_conan_compiler_if_appleclang`, used only to detect an already-correct toolchain path and unconditionally safe to skip on failure (its output feeds a string comparison, not a fatal branch). Read in context this is a defensible exception, not evidence the rule is optional: it is a probe with no failure branch, not an install/verify step.

### 4. string(JSON) parsing tool output (M-D-07)

`string(JSON <out> [ERROR_VARIABLE <var>] GET <json-string> <member|index> ...)` — without `ERROR_VARIABLE`, a malformed JSON string aborts the configure with CMake's own generic parse-error message rather than the module's branded one. find_ocx has 17 `string(JSON ...)` sites parsing `ocx`'s own `--format json` output; exactly 1 (`__ocx_select_release`'s schema check) passes `ERROR_VARIABLE err`. The other 16 would surface a bare CMake parse error, not a `find_ocx: ` -prefixed one, if the `ocx` CLI ever emitted malformed JSON — a real, low-severity, easily fixed gap (audit-confirmed, unchanged in the working tree).

### 5. Diagnostics: prefix, severity, context (M-D-08)

find_ocx's 48+2 `message()` calls are 100% prefixed `"find_ocx: "` (audit, re-verified by direct read, since the string literal is frequently on the continuation line after `message(FATAL_ERROR`) — the worked example for "every diagnostic carries the module prefix." Severity split: 37 `FATAL_ERROR` (configure-stopping), 1 `WARNING` in `ocx.cmake` (a deliberately non-fatal floating-package path), 2 `WARNING` in `Findocx.cmake` (bootstrap misconfiguration degrading to "no ocx found," matching `find_package`'s own non-fatal-until-`REQUIRED` contract).

`CMAKE_MESSAGE_CONTEXT` (3.17, [Help/variable/CMAKE_MESSAGE_CONTEXT.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_MESSAGE_CONTEXT.rst)) converts a list into a dot-separated `[top.foo.bar]` prefix on VERBOSE-and-below messages when `cmake --log-context` or `CMAKE_MESSAGE_CONTEXT_SHOW` is set, via `list(APPEND CMAKE_MESSAGE_CONTEXT "name")` / `list(POP_BACK CMAKE_MESSAGE_CONTEXT)` pairs around a function body. `grep -c CMAKE_MESSAGE_CONTEXT` returns **0** across every module measured in this dive — `find_ocx/ocx.cmake`, `Kitware__CMake@e8befb989b:Modules/FindPython/Support.cmake`, `conan-io__cmake-conan@b1593849dd:conan_provider.cmake`, `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake`. A real, current mechanism with (as far as this sample of four large, well-known modules shows) zero adopters — SHOULD/CONSIDER, not a MUST, until broader corpus evidence says otherwise.

### 6. Configure-time re-run correctness (M-D-09)

`CMAKE_CONFIGURE_DEPENDS` used at 3 sites in find_ocx: `ocx_project` watches the `ocx.toml`/`ocx.lock` paths (`ocx.cmake:925-929`, guarded `NOT CMAKE_SCRIPT_MODE_FILE`), `ocx_package` watches the resolved index leaf file when present (`:1145-1149`, same guard). This correctly re-triggers a reconfigure when a watched file *changes*, but cannot watch a file that does not exist yet — a `.ocx/` snapshot directory created by a first run needs a manual reconfigure to be picked up, a gap the audit found undocumented but structurally unavoidable (the same "config file created later" class every configure-time watcher has). A module that uses `CMAKE_CONFIGURE_DEPENDS` should say so in its own docs, not just implement it silently.

### 7. Environment snapshotting and credentials (M-D-10)

MEASURED, `cred-cache/CMakeLists.txt`:

```cmake
foreach(_v IN ITEMS MY_TOOL_HOME MY_TOOL_MIRROR MY_TOOL_AUTH_TOKEN)
  if(DEFINED ENV{${_v}})
    set(${_v} "$ENV{${_v}}" CACHE STRING "snapshotted from environment")
  endif()
endforeach()
```

configured on 4.4.2 with `MY_TOOL_AUTH_TOKEN=sk-demo-secret-xyz` set, then:

```
$ grep -inE "TOKEN|PASSWORD|SECRET" build/CMakeCache.txt
61:MY_TOOL_AUTH_TOKEN:STRING=sk-demo-secret-xyz
```

A naive "snapshot every `OCX_*`/`FOO_*` env var into `CACHE`" loop — the exact pattern find_ocx uses for its 18 legitimate knobs — writes any credential-shaped variable into `CMakeCache.txt` in plaintext, a file people routinely `cat`, attach to bug reports, or leave in a shared build directory. find_ocx itself gets this right: `OCX_AUTH_<REGISTRY>_{TYPE,USER,TOKEN}` is documented as never snapshotted (`ocx.cmake:162-164`) and is absent from `__OCX_PASSTHROUGH_VARS` (`:367-377`, audit-confirmed, re-checked in the working tree) — it is read live and forwarded as a **child-process environment variable**, not written to cache. The rule this measurement grounds: any snapshot loop over an env-var namespace MUST explicitly exclude (not just "remember to exclude") anything credential-shaped, and the verification is exactly the grep above run against a real configure with a planted dummy secret.

### 8. Script-mode support and naming honesty (M-D-11)

find_ocx's sole script-mode entry point, `__ocx_self_update` (`ocx.cmake:1394-1499`), is invoked automatically when `cmake -P ocx.cmake` runs the file directly (`:1504-1506`) and is documented for consumers to run (`README.md:54`) — yet it carries the same `__` double-underscore prefix as every internal-only helper. cmake-developer(7)'s convention ("variables starting with underscore are for temporary use only") extends by house practice to functions; a name a *consumer* is told to invoke should not look private. This is real (audit's "naming/visibility mismatch" smell, unchanged in the working tree) and independent of its policy-scope placement.

Separately, `__ocx_self_update` is defined **after** the module's `cmake_policy(POP)` (`:1383`), so per the measured mechanism in §15/Findings 15, it does not get the `VERSION 3.19` pin the rest of the module captures at definition — it inherits whatever policy state is ambient when `ocx.cmake` finishes being parsed via `cmake -P`. The map's own adjudication (`cmake-topic-map.md` §"Explicitly not a defect") downgrades this to low severity specifically for find_ocx: script mode has no enclosing `cmake_minimum_required`/`cmake_policy(SET ... OLD)` from an "includer" to diverge from, so the practical exposure is near zero for *this* module. The general contract for any module claiming script-mode support: guard on `CMAKE_SCRIPT_MODE_FILE` before calling anything that requires a `project()` context, and if a script-mode entry point is meant to be user-invoked, name it like public API.

### 9. The find_package hand-off: <Name>_ROOT (M-D-12)

`ocx_package(NAME <n> PACKAGE <ref> PULL)` sets `<n>_ROOT` (original case) as `CACHE PATH ... FORCE` (`ocx.cmake:1199-1202`, re-verified unchanged in the working tree):

```cmake
if(NOT arg_NO_ROOT)
  set(${arg_NAME}_ROOT "${content}" CACHE PATH
    "find_ocx: content root of ${ref} (CMP0074 search hint)" FORCE)
endif()
```

MEASURED, `root-hint/` in this dive's scratch, a `find_package(Foo MODULE)` call into a `FindFoo.cmake` doing nothing but a bare `find_path(Foo_INCLUDE_DIR NAMES foomarker.h)` — no `HINTS`, no `PATHS`:

| Set | `CMP0144` | Result on 4.4.2 |
|---|---|---|
| `Foo_ROOT` only (case-preserved) | OLD | **found** — CMP0074 alone is enough |
| `FOO_ROOT` only (upper-case) | OLD (project floor 3.19, no explicit NEW) | **not found** |
| `FOO_ROOT` only (upper-case) | explicit `NEW` | **found** |
| `Foo_ROOT` set, `CMAKE_PREFIX_PATH` also set to a different prefix | OLD | **`Foo_ROOT`'s prefix wins** |

This confirms three things a module author needs, none of which requires re-reading the policy prose twice: (1) setting the case-preserved `<Name>_ROOT` is sufficient by itself, on any floor ≥3.12, for `find_package(<Name>)`'s internal `find_*` calls to consult it — the mechanism only activates *inside* a `find_package()` call, not for a bare `find_path()` at top level (an easy thing to test wrong); (2) the module does **not** need to also emit the upper-case `<NAME>_ROOT` form — that form is CMP0144's accommodation for a *user*-set uppercase variable, gated by the *consumer's* policy choice, not something the provisioning module controls or should duplicate; (3) `<Name>_ROOT` outranks `CMAKE_PREFIX_PATH` in CMake's own search-roots stack, so a manager-injected `CMAKE_PREFIX_PATH` (a Conan or vcpkg toolchain, say) does not silently override a tool-provisioning module's explicit hint.

### 10. Reference docs from bracket comments (M-D-13)

cmake-developer(7)'s sample module opens with a `#[=======================================================================[.rst:` bracket comment, immediately followed by an underlined module name, a description, an "Imported Targets" section, a "Result Variables" section, and optionally "Cache Variables" — and closes with `#]=======================================================================]`. The `moderncmakedomain` Sphinx extension's `.. cmake-module::` directive is an "Autodoc style extractor (takes a relative filepath) for markup as described in [cmake-developer(7)]" ([moderncmakedomain README](https://raw.githubusercontent.com/scikit-build/moderncmakedomain/main/README.md)) — it reads exactly this bracket-comment convention out of the `.cmake` source file at build time, so the reference table cannot drift from the code the way a hand-maintained `.rst` file can. find_ocx documents functions in prose comments and a separate `docs/reference.rst` that (per the audit, §11) Sphinx auto-extracts from the two shipped files — the same mechanism, differently wired.

### 11. Self-updating / copy-and-own verification (M-D-14)

find_ocx's self-update path (`ocx.cmake:1413-1499`) fetches a GitHub releases API `latest.json` (no hash — dynamic content), then a `SHA256SUMS` trust-root file (no hash — this *is* the hash source), then the two shipped files themselves **with `EXPECTED_HASH SHA256=${sha}`** parsed out of that sums file (`:1467`). This is the standard bootstrap chicken-and-egg (TLS-only trust for the root, hash-verified content below it) — the same shape Homebrew, rustup, and most curl-pipe installers use, and not a defect in itself (map: "Explicitly not a defect"). What a self-updating module must guarantee: the final artifact write is hash-checked before it replaces anything on disk, and a consumer can read what version is currently installed (`__OCX_MODULE_VERSION`, `ocx.cmake:181`, and the module's own `--version`-equivalent surface) — find_ocx satisfies both.

### 12. Host detection and offline knobs (M-D-15)

`__ocx_host_info` (`ocx.cmake:482-509`) branches on `CMAKE_HOST_SYSTEM_NAME`/host architecture, not `CMAKE_SYSTEM_NAME` (the *target* platform) — correct for a tool-provisioning module, since the binary it fetches must run on the machine doing the configuring, not the cross-compilation target. Offline/mirror knobs: `OCX_MIRRORS`, `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_INSECURE_REGISTRIES` are all part of the 9-variable passthrough list forwarded to every `ocx` invocation (`ocx.cmake:367-377`, audit-confirmed).

### 13. Function vs macro (M-C-04)

find_ocx: 20 `function()` + 1 `macro()` (`__ocx_require_cli`, `ocx.cmake:579-597`). The macro is deliberate: it must be able to fall through to `find_program(OCX_EXECUTABLE ...)` or `ocx_bootstrap()` and have `OCX_EXECUTABLE` immediately visible to the *caller's* subsequent statements in the same scope, without a `PARENT_SCOPE` relay — the textbook case LLVM's own guidance names: "macros suitable for defining very small bits of functionality only" because "variables set in macros will bleed out into the calling scope" ([LLVM CMakePrimer](https://llvm.org/docs/CMakePrimer.html)). The same pattern recurs in two other exemplars measured in this dive:

- `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:89-109` — `cpm_set_policies()` is a `macro()` specifically because `cmake_policy(SET CMP0077 NEW)` and `set(CMAKE_POLICY_DEFAULT_CMP0077 NEW)` must affect the *includer's* current policy scope, not a function's throwaway one (see Findings 15).
- `aminya__project_options@412045e1f1:src/DynamicProjectOptions.cmake:90-303` — `dynamic_project_options()` is a `macro()` for the same class of reason: it sets project-wide toggles the top-level `CMakeLists.txt` must see directly.

This matches the corpus-wide ratio the exemplar audit already measured (4:1 function:macro, [shape] §7, cited, not re-measured) and gives it a mechanism, not just a count: every macro found in this sample exists because the whole point of the call is to mutate the caller's scope, never because someone reached for `macro()` out of habit.

### 14. Lists vs hand-joined strings (M-C-08)

find_ocx builds every list with `list(APPEND ...)` (23 `list()` sites) and iterates with `foreach(... IN LISTS|ITEMS|RANGE|ZIP_LISTS)` (13 loops, 0 bare `foreach(x ${list})` — audit §4, re-verified unchanged). It never calls `separate_arguments` (0 sites) because nothing in the module parses a shell-style string into argv — every multi-value list it forwards to `COMMAND` (`${platform_args}`, `${groups_args}`) is already a proper CMake list built with `list(APPEND)`, so unquoted expansion into `COMMAND` is correct (each element becomes one argv token) rather than a quoting bug. The LLVM primer's guidance on this specific pitfall is a naming/style document, not a quoting one, so the citable authority for the mechanism itself is CMake's own list-vs-string semantics (`;`-separated lists are just strings with a reserved separator character); the practical rule is: build lists with `list(APPEND)`, never `set(x "a;b")` by hand-splicing a shell string, and reach for `separate_arguments(<out> NATIVE_COMMAND <shell-string>)` only at the one boundary where a genuine shell-quoted string needs to become an argv list.

### 15. The chased surprise: CPM.cmake's global policy mutation

The brief asked to chase "a Kitware-shipped module that breaks its own cmake-developer(7) contract." The sharper surprise in this sample is not Kitware's own modules (they are the cleanest evidence in this dive — every one of `FindZLIB`, `FindBZip2`, `FindEXPAT`, `FindIconv` gets `PUSH`/`SET .../POP`, FPHSA, and `NOT TARGET` exactly right) but the most widely `include()`d third-party module in the corpus, `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake`:

```cmake
macro(cpm_set_policies)
  cmake_policy(SET CMP0077 NEW)
  set(CMAKE_POLICY_DEFAULT_CMP0077 NEW)
  if(POLICY CMP0126)
    cmake_policy(SET CMP0126 NEW)
    set(CMAKE_POLICY_DEFAULT_CMP0126 NEW)
  endif()
  if(POLICY CMP0135)
    cmake_policy(SET CMP0135 NEW)
    set(CMAKE_POLICY_DEFAULT_CMP0135 NEW)
  endif()
  if(POLICY CMP0150)
    cmake_policy(SET CMP0150 NEW)
    set(CMAKE_POLICY_DEFAULT_CMP0150 NEW)
  endif()
endmacro()
...
cpm_set_policies()     # line 113, unconditional, top-level, no PUSH before it
```

(`cmake/CPM.cmake:89-113`). There is **no `cmake_policy(PUSH)` anywhere in this 1,386-line file** (`grep -cF "cmake_policy(PUSH)"` → 0). `cmake_policy(SET ... NEW)` alone only affects the current policy scope (bounded by the enclosing `add_subdirectory`/`function`/`include`'s own scope rules per [Help/command/cmake_policy.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_policy.rst)), but `set(CMAKE_POLICY_DEFAULT_CMPxxxx NEW)` is a **normal cache/variable write** with no scope boundary at all — it changes the *default* policy state CMake applies to every *future* policy scope (every subdirectory, every `project()`) for the rest of the build, unless something downstream overrides it again. Including `CPM.cmake` therefore permanently changes four policy defaults for the whole remaining configure, silently, with no `PUSH`/`POP` symmetry to undo it — a real, documented-only-in-code side effect that a module review checklist built purely from "does it PUSH/POP" would miss entirely, because the mechanism it uses to leak state isn't the policy stack at all.

## Normative guidance candidates

Verification commands below run on **3.31.12** and **4.4.2** (this dive's pinned binaries); a row whose behavior differs states both. Empty `rg`/`grep` output means "pass" unless stated otherwise. Floor assumed: 3.25, per `cmake-topic-map.md` conflict 1; a mechanism newer than 3.25 carries its own gate.

1. **[M-D-03] A shipped `Find<Pkg>.cmake` MUST set `<Pkg>_FOUND` through `find_package_handle_standard_args`, never by hand, and MUST guard every imported target with `if(NOT TARGET <Pkg>::<Pkg>)`.**
   Rationale: this is the cmake-developer(7) contract every `find_package(MODULE)` caller relies on for `QUIET`/`REQUIRED`/version handling, and `find_package` can re-run the module more than once per configure.
   Verify: `rg -n --include='Find*.cmake' -e 'find_package_handle_standard_args' <dir>` — a `Find*.cmake` with no hit is a finding (P1); pair with a read for `NOT TARGET` immediately guarding each `add_library(... IMPORTED)`.
   Floor: no gate — FPHSA predates every supported floor.

2. **[M-D-04] A `Find<Pkg>.cmake` that falls back to `FetchContent`/`ExternalProject`/`file(DOWNLOAD)` on a miss MUST document that in its `.rst:` header and gate it behind an explicit, off-by-default opt-in variable — never fetch unconditionally.**
   Rationale: a "find" module that silently reaches the network on a local-search miss surprises every caller who expected Module mode to be offline-safe (`ccache__ccache@b471bbde29:cmake/FindZstd.cmake` is the shipped counter-example, gated in its own project but dangerous copied elsewhere).
   Verify: `rg -n --include='Find*.cmake' -e 'FetchContent' -e 'file(DOWNLOAD' -e 'ExternalProject' <dir>` — a hit with no adjacent `option()`/cache-variable gate in the same file is a finding.
   Floor: no gate.

3. **[M-D-05] Every `file(DOWNLOAD)` in a module MUST check `STATUS`, MUST carry `EXPECTED_HASH` for any content that will be executed or linked, and MUST pass `TLS_VERIFY ON` explicitly when the module's floor admits 3.19–3.30.**
   Rationale: MEASURED (§2) — a missing/unreachable URL does not fail the configure by itself; `CMAKE_TLS_VERIFY` defaults to on only since 3.31.
   Verify: `rg -n -A8 -e 'file\(DOWNLOAD' <dir>/*.cmake` — each block must contain `STATUS`, and either `EXPECTED_HASH`/`EXPECTED_MD5` or a documented trust-root comment; on a <3.31 floor, also `TLS_VERIFY ON`. Confirm the STATUS-empty-configure behavior yourself with `file(DOWNLOAD "file:///nonexistent" out.bin)` — no error, only `STATUS` reveals it.
   Floor: `TLS_VERIFY ON` explicit MUST below 3.31 (CMAKE ≥ 3.19 for the module itself); above 3.31 it is SHOULD (defense in depth against an env override of `CMAKE_TLS_VERIFY=0`).

4. **[M-D-06] Every `execute_process()` in a module MUST check `RESULT_VARIABLE`/`RESULTS_VARIABLE` or pass `COMMAND_ERROR_IS_FATAL ANY` (CMake ≥ 3.19); a call whose output is parsed on Windows below CMake 3.31 MUST state `ENCODING UTF-8` explicitly.**
   Rationale: MEASURED (§3) — an unchecked failing child process does not fail the configure; `ENCODING` only defaults to UTF-8 since 3.31 (CMP0176).
   Verify: `rg -n -A10 -e 'execute_process\(' <dir>/*.cmake` — each block must contain `RESULT_VARIABLE`, `RESULTS_VARIABLE`, or `COMMAND_ERROR_IS_FATAL`; a documented, no-failure-branch probe (like `conan_provider.cmake:322`) is an accepted, narrow exception — read it, don't just grep-fail it.
   Floor: `COMMAND_ERROR_IS_FATAL` needs CMake ≥ 3.19.

5. **[M-D-07] A `string(JSON GET ...)` call that parses a subprocess's or file's output SHOULD pass `ERROR_VARIABLE` so a malformed payload produces the module's own branded error, not CMake's generic parse-error message.**
   Rationale: a module-prefixed error with a fix hint is strictly more useful to the caller than CMake's default `string sub-command JSON, GET failed...` text.
   Verify: `rg -n --include='*.cmake' -e 'string\(JSON' <dir>` then read each hit for a neighboring `ERROR_VARIABLE`; find_ocx's own ratio (1 of 17) is the negative exemplar.
   Floor: `string(JSON)` needs CMake ≥ 3.19 (ERROR_VARIABLE available from the same version).

6. **[M-D-08] Every `message()` in a module SHOULD carry a stable, greppable prefix naming the module and the right severity (`FATAL_ERROR` for a hard stop, `WARNING` for a degrade-not-abort path, never bare `STATUS` for an actual problem); `CMAKE_MESSAGE_CONTEXT` is CONSIDER, not MUST, given zero measured adoption in this sample.**
   Rationale: a consistent prefix is what lets a caller `grep` their own build log for `"mymodule: "` and distinguishes the module's own diagnostics from CMake's; `CMAKE_MESSAGE_CONTEXT` is real but unproven in practice (§5).
   Verify: `rg -c --include='*.cmake' -e 'message\(FATAL_ERROR' -e 'message\(WARNING' <file>` against a manual read confirming every hit opens with the module's name.
   Floor: `CMAKE_MESSAGE_CONTEXT` needs CMake ≥ 3.17.

7. **[M-D-09] A module that parses a project-local file (a manifest, a lock file, a resolved index) at configure time MUST add that path to `CMAKE_CONFIGURE_DEPENDS`, and MUST document, in the same place, that a newly-created watched file needs a manual reconfigure the first time.**
   Rationale: without the watch, an edited manifest is silently ignored until something else forces a reconfigure; without the documented gap, users file bug reports about a "stale" result that is working as designed.
   Verify: `rg -n --include='*.cmake' -e 'CMAKE_CONFIGURE_DEPENDS' <dir>` — a module reading a project file with `file(READ|STRINGS)` or `string(JSON)` and no nearby `CMAKE_CONFIGURE_DEPENDS` append is a finding (reading heuristic; a full corpus regression test is out of scope here).
   Floor: no gate — the variable predates every supported floor.

8. **[M-D-10] A module that snapshots environment variables into `CACHE` MUST explicitly exclude anything credential-shaped by name (`*TOKEN*`, `*PASSWORD*`, `*SECRET*`, `*_AUTH_*`, `*KEY*`) — never snapshot a namespace wholesale and assume none of the members are secrets.**
   Rationale: MEASURED (§7) — a naive per-namespace snapshot loop writes a planted secret into `CMakeCache.txt` in plaintext, a file people paste into bug reports and sometimes commit by accident.
   Verify: configure with a dummy credential-shaped env var set, then `grep -inE 'TOKEN|PASSWORD|SECRET' <builddir>/CMakeCache.txt` — empty = pass, any hit = the finding.
   Floor: no gate.

9. **[M-D-11] A module's script-mode entry point (anything documented for a consumer to run via `cmake -P`) MUST guard on `CMAKE_SCRIPT_MODE_FILE` before touching anything that assumes a `project()` context, and MUST NOT carry the module's private (`__`-prefixed) naming convention if it is consumer-invoked.**
   Rationale: naming a public entry point like a private helper (find_ocx's `__ocx_self_update`) misleads a reader auditing the module's public surface; a script-mode function that assumes ambient project state fails outside `cmake -P` in ways that are hard to diagnose from the error alone.
   Verify: `rg -n "cmake -P" <docs-or-readme>` to find the documented entry point name, then check that name against the module's own private-prefix convention; separately `rg -n CMAKE_SCRIPT_MODE_FILE <module>.cmake` to confirm the guard exists somewhere the script-mode path is reached.
   Floor: no gate — `CMAKE_SCRIPT_MODE_FILE` predates every supported floor.

10. **[M-D-12] A tool-provisioning module MUST prime the find_package hand-off with the case-preserved `<Name>_ROOT` as `CACHE PATH ... FORCE`, and MUST NOT also emit the upper-case `<NAME>_ROOT` form as if it were required — that form is the consumer's opt-in (CMP0144, needs the consumer's own floor ≥3.27 or an explicit `cmake_policy(SET CMP0144 NEW)`), not the provisioning module's job.**
    Rationale: MEASURED (§9) — case-preserved `<Name>_ROOT` alone is sufficient on any floor ≥3.12 and outranks `CMAKE_PREFIX_PATH`; emitting the upper-case form from the provisioning side does nothing useful and risks colliding with an unrelated environment variable of the same all-caps name.
    Verify: with a scratch `FindFoo.cmake` doing a bare `find_path()`/`find_library()` and no `HINTS`/`PATHS`, set only `Foo_ROOT` and confirm `find_package(Foo MODULE)` locates content under it; this is the reading heuristic to apply to any module that claims a `find_package` hand-off.
    Floor: CMP0074 needs CMake ≥ 3.12 (below every assumed floor, so unconditional); CMP0144 (if a module chooses to also honor an upper-case *user*-set variable, which is different from emitting one) needs ≥ 3.27.

11. **[M-D-13] A module's reference documentation SHOULD be extracted from a `.rst:`-tagged bracket comment immediately above the module (or above each documented function/macro), not maintained as a separate hand-written page.**
    Rationale: the bracket-comment form is read directly by `sphinxcontrib-moderncmakedomain`'s `cmake-module::` directive, so the reference table cannot drift from the code the way a hand-copied one can.
    Verify: reading heuristic — check that the module's own doc header opens with `#[[.rst:` / `#[=[.rst:` (or a numbered-bracket variant) rather than pointing at a separately maintained file with no extraction mechanism.
    Floor: no gate — bracket comments and the `.rst:` convention predate every supported floor; `sphinxcontrib-moderncmakedomain` is a docs-toolchain choice, not a language feature (docs-quality owns the prose rules).

12. **[M-D-14] A self-updating or copy-and-own module MUST hash-verify every artifact it writes to disk before it becomes the active copy, and MUST expose a version a consumer can read (a variable, or the module's own version-reporting call).**
    Rationale: a self-updater that trusts TLS alone for the final artifact (not just the trust-root fetch) turns a MITM'd or corrupted download into an executed payload; a module with no readable version cannot be audited for "is this the pinned one."
    Verify: reading heuristic — trace the self-update code path from its trust-root fetch to its final `file(RENAME)`/write, confirming an `EXPECTED_HASH` (or equivalent manual hash compare) sits between the download and the write; separately confirm a `<MODULE>_VERSION`-shaped variable exists and is set from a single source of truth.
    Floor: no gate.

13. **[M-D-15] A tool-provisioning module MUST use `CMAKE_HOST_SYSTEM_*` (never `CMAKE_SYSTEM_*`) to pick which binary to fetch, and SHOULD expose offline and mirror override variables.**
    Rationale: the fetched tool runs on the machine doing the configuring, not the cross-compilation target; conflating the two silently breaks every cross-compile.
    Verify: reading heuristic — `rg -n --include='*.cmake' -e 'CMAKE_SYSTEM_NAME' -e 'CMAKE_SYSTEM_PROCESSOR' <dir>` inside code that decides which binary to download is a finding; the same lookup against `CMAKE_HOST_SYSTEM_*` is correct.
    Floor: no gate.

14. **[M-C-04] Default to `function()`; reach for `macro()` only when the call's entire purpose is to mutate the caller's own scope (a policy default, a project-wide toggle, a cache variable the caller needs immediately) — and say so in a comment at the definition.**
    Rationale: MEASURED pattern across three independent modules (§13) — every `macro()` found in this sample exists because a `function()` would have made its effect invisible outside `PARENT_SCOPE`, not out of habit; LLVM's own guidance states functions are preferred "whenever reasonable" because macros bleed variables into the calling scope.
    Verify: `rg -n --include='*.cmake' -e '^\s*macro\(' <dir>`, then read each hit — if nothing inside genuinely needs caller-scope mutation, it is a candidate for conversion to `function()`.
    Floor: no gate.

15. **[M-C-08] Build lists with `list(APPEND ...)`, never by hand-splicing a `";"`-joined string; reach for `separate_arguments(<out> NATIVE_COMMAND <shell-string>)` only at the one boundary where a genuine shell-quoted string must become an argv list for `COMMAND`.**
    Rationale: a hand-built `"a;b;c"` string silently breaks the moment an element itself needs to contain a literal `;`, while `list(APPEND)` composes correctly regardless of element content; forwarding a real CMake list unquoted into `COMMAND` is the *correct* form (each element becomes one argv token) and should not be "fixed" into a quoted string.
    Verify: reading heuristic — `rg -n --include='*.cmake' -e 'set\([A-Za-z_]+ "[^"]*;[^"]*"\)' <dir>` flags a literal semicolon-joined string assignment as a candidate for `list(APPEND)` instead; confirm any unquoted list forwarded into `COMMAND` is genuinely list-shaped, not a scalar that should be quoted.
    Floor: no gate.

## Exemplar evidence

| Candidate | Satisfies | Violates | Notes |
|---|---|---|---|
| 1 (FPHSA + NOT TARGET) | `Kitware__CMake@e8befb989b:Modules/{FindZLIB,FindBZip2,FindEXPAT,FindIconv}.cmake`; `KDE__extra-cmake-modules@b4c4ec9997:find-modules/FindWayland.cmake:112` | `ccache__ccache@b471bbde29:cmake/FindZstd.cmake` (no FPHSA at all) | find_ocx has no `Find<Pkg>.cmake` of its own shape to score against this row — `Findocx.cmake` finds a program, not a library; see row 10. |
| 2 (no silent fetch) | — | `ccache__ccache@b471bbde29:cmake/FindZstd.cmake:43-70` (fetches on miss, gated only by that project's own `DEPS` option, not by the file itself) | The gate lives in the *including* project, not the module — a copy elsewhere loses the gate. |
| 3 (file(DOWNLOAD) contract) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:765,1467` (STATUS + EXPECTED_HASH) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:738,765,1413,1434,1467` (0 of 5 pass `TLS_VERIFY`, floor 3.19) | find_ocx satisfies the STATUS half and 2-of-5 hash half; fails the TLS_VERIFY half at its stated floor. |
| 4 (execute_process contract) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:449,556` (RESULT_VARIABLE); `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:450,459,489,522-525` (4 of 5) | `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:322` (no RESULT_VARIABLE, accepted narrow exception) | |
| 5 (string(JSON) ERROR_VARIABLE) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:514` (1 of 17) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake` (other 16 of 17) | find_ocx is its own negative exemplar here. |
| 6 (message prefix/severity) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake` (100% of 48+2 messages prefixed) | — | The worked example for this row. |
| 7 (CMAKE_CONFIGURE_DEPENDS) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:925-929,1145-1149` | — (gap: undocumented "created later" limitation) | |
| 8 (no credential in cache) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:162-164,367-377` (OCX_AUTH_* never snapshotted) | This dive's own `cred-cache` anti-pattern demo (illustrative, not a real module) | find_ocx is the positive exemplar; the anti-pattern is manufactured to prove the check works. |
| 9 (script-mode naming/guard) | — | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:1394` (`__ocx_self_update`, private-named but consumer-invoked; defined after the file's `POP` at :1383) | Map-adjudicated as low-severity for this specific case (script mode has no includer policy stack to diverge from). |
| 10 (find_package hand-off) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:1199-1202` (case-preserved `<Name>_ROOT`, CACHE PATH FORCE — correct per this dive's measurement); `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake` never touches `CMAKE_PROGRAM_PATH`/`CMAKE_PREFIX_PATH` directly (correct — leaves precedence to CMake's own stack) | — | find_ocx never emits the upper-case form either — consistent with this row's "don't" half. |
| 11 (bracket-comment docs) | `Kitware__CMake@e8befb989b:Modules/FindZLIB.cmake` (canonical `.rst:` header) | — | find_ocx uses prose comments plus a separately-generated `docs/reference.rst`; functionally similar, mechanism note only (P3). |
| 12 (self-update hash + version) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:1467` (EXPECTED_HASH before write), `:181` (`__OCX_MODULE_VERSION`) | — | |
| 13 (host detection) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:482-509` (`CMAKE_HOST_SYSTEM_NAME`, never `CMAKE_SYSTEM_NAME`) | — | |
| 14 (function vs macro) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake:579-597` (`__ocx_require_cli`); `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:89-109` (`cpm_set_policies`); `aminya__project_options@412045e1f1:src/DynamicProjectOptions.cmake:90-303` (`dynamic_project_options`) | — | All three macros in this sample are justified; none is a stray habit. |
| 15 (lists vs strings) | `ocx-sh__find_ocx@ac2a759cd0:ocx.cmake` (23 `list()` sites, 0 bare `foreach(x ${list})`) | — | |

## AI-agent angle

- **Assuming `file(DOWNLOAD)`/`execute_process()` fail the configure on error.** An agent trained on tutorial-style CMake snippets routinely writes a bare `file(DOWNLOAD url out.bin)` or `execute_process(COMMAND some_tool)` and treats a subsequent `if(EXISTS out.bin)` or the tool's *output* as proof of success. MEASURED in this dive on 3.31.12 and 4.4.2: neither command fails the configure by itself. Mechanical check: `rg -n -A6 -e 'file\(DOWNLOAD' -e 'execute_process\(' <dir>/*.cmake` and confirm `STATUS`/`RESULT_VARIABLE`/`COMMAND_ERROR_IS_FATAL` appears in every block.
- **Assuming `<PACKAGENAME>_ROOT` (upper-case) is required alongside `<PackageName>_ROOT`.** A model that has absorbed CMP0074 and CMP0144 as "two things you must both do" will emit both cases from a provisioning module. MEASURED (§9): only the case-preserved form is the provisioning module's job; the upper-case form is a consumer-side opt-in. Mechanical check: read whether a module sets an *upper-case-only* `<NAME>_ROOT` variable as its primary hand-off — if so, ask why the case-preserved form isn't the one being set.
- **Assuming `TLS_VERIFY`/`CMAKE_TLS_VERIFY` still defaults to off**, because most 3.x-era training text (correctly, for its time) treats `file(DOWNLOAD)` as insecure-by-default. Since 3.31 the default is *on*. The opposite mistake — assuming it is always on and skipping the explicit `TLS_VERIFY ON` for a module whose floor admits 3.19–3.30 — is the live one for 2026-era code. Mechanical check: read the module's `cmake_minimum_required` floor before deciding whether an explicit `TLS_VERIFY ON` is required or merely defensive.
- **Reaching for `cmake-lint`/`cmake-format` as "the linter"** for a generated module-review checklist. That project's last release was 2020-08-19; no maintained semantic CMake linter exists in 2026 (settled in `versions-and-gate/floors-policies-and-era`, cited here). Mechanical check: if a suggested fix cites a `cmake-lint` rule ID (e.g. `C0301`), verify the tool is actually installed and current before trusting the rule name — it is very likely hallucinated or stale.
- **Copying a Conan-1-era `conanfile.txt`/`CMAKE_MODULE_PATH`-only integration pattern into a module meant to interoperate with Conan 2's `conan_provider.cmake`.** Out of scope for this dive's module-authoring rows specifically, but worth flagging here since `conan_provider.cmake` was read as an exemplar: it is Conan-2-only syntax (`CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, `cmake_language(SET_DEPENDENCY_PROVIDER)`), and a model recalling Conan 1's `conan_basic_setup()` macro will produce code that does not compose with it at all.
- **Treating `include(CPM.cmake)` as a side-effect-free convenience `include()`.** A model reproducing a common "add CPM to your project" snippet will not mention that it permanently changes four `CMAKE_POLICY_DEFAULT_CMPxxxx` variables for the rest of the configure (§15) — because that fact lives only in CPM's own source, not in its typical usage examples. Mechanical check: `rg -n --include='*.cmake' -e 'CMAKE_POLICY_DEFAULT_CMP' <dir>` after adding a new `include()` of a third-party helper module — a hit that wasn't there before is a global, silent side effect worth a one-line comment at the call site.

## Contested / evolving

- **Whether a Find module should ever fall back to `FetchContent` on a miss at all.** `ccache/ccache`'s `FindZstd.cmake` does it, gated by that project's own option; nothing in cmake-developer(7) sanctions or forbids it. This dive's position (documented + off-by-default opt-in, never silent) is a synthesis, not a settled community consensus — trending toward "acceptable if explicit," per the one real corpus example available.
- **`CMAKE_MESSAGE_CONTEXT` adoption.** Zero adoption across every module sampled here (a small, non-random sample of 4). Whether this stays a CONSIDER-only mechanism or becomes a SHOULD as more projects adopt structured build logs is unresolved as of 2026-09-26; the exemplar-shape audit's broader corpus count ("11 corpus uses," [shape] §7, cited not re-measured) suggests real but thin adoption beyond this sample.
- **Whether `CMAKE_POLICY_DEFAULT_CMPxxxx` mutation from a widely-included helper module (CPM's pattern) is a known, accepted cost of convenience or an under-documented footgun.** CPM's own maintainers clearly intend it (the comments explain *why* each policy is forced NEW); no corpus evidence surfaced a competing helper module that does the equivalent job with a `PUSH`/`POP`-scoped, non-leaking approach instead. This dive treats it as worth a one-line warning in guidance rather than a MUST-avoid, since the alternative (scoping the policy change to only the one `CPMAddPackage()` call site) would require re-deriving CPM's own design, out of scope here.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/manual/cmake-developer.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-developer.7.rst) | Normative Find-module contract, sample module, standard variable names | v4.4.2 (2026) | The single authoritative source for M-D-03 and M-D-13. |
| [Modules/FindPackageHandleStandardArgs.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FindPackageHandleStandardArgs.cmake) | FPHSA's own bracket-comment reference doc, read from source | v4.4.2 (2026) | Exact signature and option list (`HANDLE_VERSION_RANGE`, `HANDLE_COMPONENTS`, `NAME_MISMATCHED`, `FOUND_VAR` deprecated). |
| [Help/command/file.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/file.rst) | `file(DOWNLOAD)` options, `STATUS`, `EXPECTED_HASH`, `TLS_VERIFY`/`TLS_VERSION` defaults and version history | v4.4.2 (2026) | Grounds M-D-05; the `versionchanged:: 3.31` notes are the load-bearing facts. |
| [Help/command/execute_process.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/execute_process.rst) | `RESULT_VARIABLE`, `COMMAND_ERROR_IS_FATAL`, `ENCODING`, new 4.4 `ENVIRONMENT`/`ENVIRONMENT_MODIFICATION` | v4.4.2 (2026) | Grounds M-D-06; caught the 4.0 `NONE` default and CMP0176. |
| [Help/variable/CMAKE_TLS_VERIFY.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TLS_VERIFY.rst) | TLS-verify default-on-since-3.31 | v4.4.2 (2026) | Directly cited in M-D-05's floor clause. |
| [Help/command/cmake_policy.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_policy.rst) | PUSH/POP/VERSION semantics, function/macro policy capture at definition | v4.4.2 (2026) | Interpreted alongside the PUSH/POP measurement in Findings 15. |
| [Help/command/include_guard.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/include_guard.rst) | `include_guard([DIRECTORY|GLOBAL])` scope semantics | v4.4.2 (2026) | Grounds the include_guard-vs-Find-module observation in §1. |
| [Help/variable/CMAKE_MESSAGE_CONTEXT.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_MESSAGE_CONTEXT.rst) | Structured logging via `list(APPEND)`/`POP_BACK` context stack | v4.4.2 (2026) | Grounds M-D-08's CONSIDER-not-MUST call. |
| [Help/policy/CMP0074.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0074.rst), [CMP0144.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0144.rst) | `<PackageName>_ROOT` / upper-case `<PACKAGENAME>_ROOT` policy text | v4.4.2 (2026) | Read before, then confirmed against, the M-D-12 measurement. |
| [Help/manual/cmake-diagnostics.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-diagnostics.7.rst) | 7 diagnostic categories at v4.4.2 (`CMD_AUTHOR` … `CMD_UNUSED_CLI`) | v4.4.2 (2026) | Cross-check against host measurement H2 in `cmake-topic-map.md`; matches. |
| [LLVM CMakePrimer](https://llvm.org/docs/CMakePrimer.html) | Naming convention (`llvm_*` private, `add_llvm_*` public wrapper) and function-vs-macro guidance | current (fetched 2026-09-26) | Grounds M-C-04's rationale and the public/private naming discussion in M-D-11. |
| [sphinxcontrib-moderncmakedomain README](https://raw.githubusercontent.com/scikit-build/moderncmakedomain/main/README.md) | `cmake-module::` directive's bracket-comment extraction mechanism | current (fetched 2026-09-26) | Grounds M-D-13's mechanism claim. |
| Measured: `file(DOWNLOAD)` on a missing `file://` URL, with and without `STATUS`, on CMake 3.31.12 and 4.4.2 | Real-binary measurement, this dive's scratch (`download-status/`) | 2026-09-26 | Grounds M-D-05's headline claim; primary evidence. |
| Measured: `execute_process(COMMAND false)` with and without `COMMAND_ERROR_IS_FATAL ANY`, on CMake 3.31.12 and 4.4.2 | Real-binary measurement, this dive's scratch (`execproc-fail/`) | 2026-09-26 | Grounds M-D-06's headline claim; primary evidence. |
| Measured: `cmake_policy(PUSH)`/`VERSION 3.19`/`POP` isolating a pinned function's `CMP0054` from an includer's explicit `CMP0054 OLD`, on CMake 3.31.12 and 4.4.2 | Real-binary measurement, this dive's scratch (`policy-pin/`) | 2026-09-26 | Grounds §15/M-D-11's discussion of what the pin actually does and doesn't cover. |
| Measured: env-to-CACHE credential leak, planted `*_AUTH_TOKEN`, on CMake 4.4.2 | Real-binary measurement, this dive's scratch (`cred-cache/`) | 2026-09-26 | Grounds M-D-10's headline claim; primary evidence. |
| Measured: `<Name>_ROOT` / `<NAME>_ROOT` / `CMAKE_PREFIX_PATH` precedence via `find_package(Foo MODULE)`, on CMake 4.4.2 | Real-binary measurement, this dive's scratch (`root-hint/`) | 2026-09-26 | Grounds M-D-12's full claim table; primary evidence. |
| `/home/mherwig/dev/find_ocx/ocx.cmake`, `Findocx.cmake` (working tree, re-read directly) | The fleet's one shipped CMake module, worked example throughout | 2026-09-26 | Primary, re-verified against `cmake-audit/find-ocx-cmake-shape-and-contracts.md`'s line numbers — all cited lines (POP at :1383, `file(DOWNLOAD)` at :738/765/1413/1434/1467, `<Name>_ROOT` at :1199-1202) matched exactly. |
| `Kitware__CMake@e8befb989b:Modules/{FindZLIB,FindBZip2,FindEXPAT,FindIconv}.cmake`, `Modules/FindPython/Support.cmake` (exemplar corpus, read directly) | Kitware's own Find modules | corpus SHA 2026-09-26 | Primary; the clean-contract exemplars for M-D-03. |
| `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake` (exemplar corpus, read directly) | CPM.cmake's full source | corpus SHA 2026-09-26 | Primary; source of Findings 15's chased surprise and M-C-04's second macro example. |
| `conan-io__cmake-conan@b1593849dd:conan_provider.cmake` (exemplar corpus, read directly) | Conan 2's official CMake dependency-provider module | corpus SHA 2026-09-26 | Primary; the correct-PUSH/POP-scope exemplar and the one-unchecked-probe nuance for M-D-06. |
| `ccache__ccache@b471bbde29:cmake/FindZstd.cmake` (exemplar corpus, read in full) | A shipped Find module that fetches on a miss and skips FPHSA | corpus SHA 2026-09-26 | Primary; the negative exemplar for M-D-03/M-D-04. |
| `aminya__project_options@412045e1f1:src/*.cmake` (exemplar corpus, read directly) | A multi-file CMake helper-module library | corpus SHA 2026-09-26 | Primary; per-file `include_guard()` pattern and the third macro example for M-C-04. |
| `KDE__extra-cmake-modules@b4c4ec9997:find-modules/FindWayland.cmake` (exemplar corpus, read directly) | A large Find-module collection's representative module | corpus SHA 2026-09-26 | Primary; a `cmake_policy(VERSION ...)`-not-PUSH/POP variant of the same contract. |
| `.agents/research/cmake-audit/find-ocx-cmake-shape-and-contracts.md` | Wave-1 audit of find_ocx | 2026-09-05, re-verified 2026-09-26 | Secondary; cited for counts this dive did not re-derive, all spot-checked against the working tree. |
| `.agents/research/cmake-topic-map.md` | Phase-3 adjudicated topic map, conflicts resolved, row assignments | 2026-09-26 | Secondary; the FORCE-finding withdrawal (conflict 16), the diagnostics-category count (host H2), and the row-ownership boundaries this dive respects. |
