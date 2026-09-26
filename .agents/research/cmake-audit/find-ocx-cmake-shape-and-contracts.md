---
title: find_ocx — CMake code shape, implemented contracts, runtime posture
agent: cmake-audit-find-ocx
model: sonnet
scope: /home/mherwig/dev/find_ocx (ocx.cmake, Findocx.cmake, tests/, examples/, .github/workflows/, docs/) plus read-only comparison against /home/mherwig/dev/rules_ocx/AGENTS.md
method: >
  find, wc -l, git status/diff/show, grep -n/-c/-oE/-F (ripgrep-backed; -F required
  for literal parens/braces), awk (function/macro line-span extraction), Read on
  ocx.cmake (full, in offset chunks past the embedded JSON dist snapshot) and
  Findocx.cmake (full). Every command is inlined next to its result below —
  none were re-run without being shown. No cmake, conan, or vcpkg command was
  executed; no file outside this report was modified.
date_researched: 2026-09-05
---

# find_ocx — CMake code shape, implemented contracts, runtime posture

## Table of contents

- [Headline numbers](#headline-numbers)
- [The dirty tree, precisely](#the-dirty-tree-precisely)
- [1. File census](#1-file-census)
- [2. Function census](#2-function-census)
- [3. Scoping and policy posture](#3-scoping-and-policy-posture)
- [4. Quoting and list discipline](#4-quoting-and-list-discipline)
- [5. Network and process surface](#5-network-and-process-surface)
- [6. Error taxonomy](#6-error-taxonomy)
- [7. Memoization and reconfigure semantics](#7-memoization-and-reconfigure-semantics)
- [8. Platform posture](#8-platform-posture)
- [9. The find_package seam](#9-the-find_package-seam)
- [10. Tests and CI](#10-tests-and-ci)
- [11. Doc-versus-code drift](#11-doc-versus-code-drift)
- [12. Parity with rules_ocx](#12-parity-with-rules_ocx)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

All line numbers are **working-tree** unless marked `HEAD:`. Run from
`/home/mherwig/dev/find_ocx`.

## Headline numbers

| # | Measurement | Value | Command |
|---|---|---|---|
| 1 | `ocx.cmake` | 1,506 lines (working tree) / 1,531 (HEAD) | `wc -l ocx.cmake`; `git show HEAD:ocx.cmake \| wc -l` |
| 2 | `Findocx.cmake` | 90 lines, **untouched by the dirty tree** | `wc -l Findocx.cmake`; absent from `git status --short` |
| 3 | Functions/macros | 21 total (20 `function()`, 1 `macro()`); 4 truly public (no `__` prefix), 17 double-underscore-private — one of the 17, `__ocx_self_update`, is the sole script-mode entry point | `grep -n '^function(\|^macro('` |
| 4 | `cmake_parse_arguments` | 6 call sites, all `${ARGN}` form, zero `PARSE_ARGV` | `grep -n cmake_parse_arguments ocx.cmake` |
| 5 | `PARENT_SCOPE` | 26 | `grep -cF PARENT_SCOPE ocx.cmake` |
| 6 | `CACHE` writes | 4 distinct call sites (2 with `FORCE`, 2 without) | `grep -nF 'set(' ocx.cmake \| grep -F CACHE` |
| 7 | `unset(...CACHE)` | 1 (`OCX_REFRESH`) | `grep -nF 'unset(' ocx.cmake` |
| 8 | `ENV{` reads | 8; **zero** `set(ENV{...})` writes | `grep -cF 'ENV{' ocx.cmake`; `grep -nF 'set(ENV{' ocx.cmake` (empty) |
| 9 | `file(DOWNLOAD)` | 5, **zero** with `TLS_VERIFY`, `TIMEOUT`, `INACTIVITY_TIMEOUT`, `HTTPHEADER`, or `SHOW_PROGRESS` | `grep -nF 'file(DOWNLOAD' ocx.cmake`; `grep -cF TLS_VERIFY ocx.cmake` → `0` |
| 10 | `execute_process` | 3; only 2 use `RESULT_VARIABLE`, the third uses `COMMAND_ERROR_IS_FATAL ANY` | `grep -n execute_process ocx.cmake` |
| 11 | `string(JSON ...)` | 17 | `grep -cF 'string(JSON' ocx.cmake` |
| 12 | `message()` | 48 in `ocx.cmake` (37 `FATAL_ERROR`, 1 `WARNING`, 10 `STATUS`) + 2 `WARNING` in `Findocx.cmake`; **100% carry the `find_ocx: ` prefix** (verified by direct read, not just grep, since the prefix lands on the string-literal continuation line) | `grep -cF 'message(FATAL_ERROR' ocx.cmake` → 37 |
| 13 | Generic sysexit hints in `__ocx_default_hint` | Only **4** codes named: 64, 65, 69, 78 — two more (81) are hand-rolled per-call in `ocx_package` only | `sed -n '423,435p' ocx.cmake` |
| 14 | Policy | Exactly one named policy, `CMP0074` (in prose/comments only, never `cmake_policy(SET CMP0074 ...)`); `cmake_policy(PUSH)`/`VERSION 3.19` at :179-180, `POP` at **:1383 — not at the end of the file**, leaving `__ocx_self_update` (:1394-1499) defined *outside* the pinned-3.19 policy scope the header comment (:178) says covers "this module" | `grep -n 'cmake_policy\|CMP0' ocx.cmake` |
| 15 | Quoting discipline | **Zero** unquoted `${var}` expansions inside `if()`/`elseif()`/`while()` comparisons (`STREQUAL`/`MATCHES`/`EQUAL`); all 13 `foreach()` loops use `IN LISTS`/`IN ITEMS`/`RANGE`/`ZIP_LISTS` (no bare `foreach(x ${list})`) | `grep -noE '(if\|elseif\|while)\([^"]*\$\{[a-zA-Z_0-9]+\}[^"]*(STREQUAL\|MATCHES\|EQUAL)' ocx.cmake` → 0 matches |
| 16 | Test families | 10, each run once per provisioned CMake line (`3` → 3.31.x, `4` → 4.x); **5 of the 10 never pass `-Werror=dev`** to the inner `cmake` invocation they assert against | `sed -n '1,56p' CMakeLists.txt`; `grep -n Werror tests/helpers.cmake` |
| 17 | CI OS matrix | `test` and `examples` jobs: ubuntu/macos/windows (3); `lint`/`docs`/`offline` jobs: ubuntu only | `.github/workflows/ci.yml` |
| 18 | Working tree | **dirty**, 10 files, +145/−175, and it is **not one change** — see next section | `git status --short; git diff --stat` |
| 19 | **Likely bug**: memoization write path | `__ocx_set_result` (the function backing *every* exported `OCX_<name>_*` result var **and** the `_FP`/`_GUARD` memo record) writes `CACHE INTERNAL` **without `FORCE`** — on CMake's own `set()` semantics an existing cache entry is left untouched by a non-`FORCE` write, so after the very first configure the memo fingerprint can never be updated again, and `ocx_project`/`ocx_package` re-run `ocx` on *every* subsequent reconfigure once one input changes once | `sed -n '609,636p' ocx.cmake`; confirmed identical on `HEAD:610-636` |

## The dirty tree, precisely

`git status --short` / `git diff --stat` (10 files, +145/−175) is **two unrelated changes**, not one:

1. **Namespaced-catalog / lock-v3 migration** (matches `OCX-0.5-HANDOVER.md` items 2-3): `ocx.toml`, `ocx.lock`, `examples/project/ocx.toml`, `examples/project/ocx.lock`, one line each in `README.md` / `docs/index.rst`. `ocx.lock`'s new header reads `lock_version = 3`, `generated_by = "ocx 0.5.6"` (`ocx.lock:2-5`) — **0.5.6, not the 0.5.2 the handover title names**.
2. **A `PLATFORM`/`PINS` API simplification in `ocx.cmake` itself**, `examples/package/CMakeLists.txt`, `docs/examples.rst`, `tests/fixtures/foreign_platform/CMakeLists.txt` — removes the ordered multi-platform preference list and the `PINS <platform>=sha256:<digest>...` keyword from `ocx_package()`, replacing per-platform pins with a single `@sha256:` digest in `PACKAGE`. **`OCX-0.5-HANDOVER.md` never mentions `PINS` or a `PLATFORM` list at all** — this refactor is undocumented by the one handover file that exists (see [Contradictions](#contradictions-of-the-frame)).

Neither change touches `__OCX_PIN_VERSION` (`ocx.cmake:187`, still `"0.3.11"` in the working tree — `git diff -- ocx.cmake` has no hunk near that line) or `release.yml`'s `setup-ocx@v1: version: "0.3.11"` (`.github/workflows/release.yml:20-21`, `.github/workflows/ci.yml:31` et al.). So the working tree, **as it stands right now**, has a lock file stamped `generated_by = "ocx 0.5.6"` but a pinned/CI-installed CLI of `0.3.11` — and per the handover's own §2, an old CLI cannot read a v3 lock at all. `ocx_project()`'s first act is `lock --check` (`ocx.cmake:957-963`); this working tree would fail that check the moment anyone ran `task test` with the CI-pinned 0.3.11 `ocx`. Not run (read-only per task rules) — stated as a structural consequence of the cited facts, not an executed repro.

Also unconverted: both committed index snapshots (`examples/frozen_index/.ocx/ocx.sh/jq.json`, `examples/package/index/ocx.sh/jq.json`) **and** the harness's own `.ocx/ocx.sh/cmake.json` are still the pre-0.5 flat form (`{"version":1,"repository":"ocx.sh/jq", "tags":{...}}`) — handover item 4 flags the two example ones as dead; the harness's own snapshot (used by `CMakeLists.txt:19-21`, still referencing the *un-renamed* `ocx.sh/cmake:3.31`/`:4`, not `ocx.sh/kitware/cmake`) was not even in the handover's list and is equally stale.

## 1. File census

```
wc -l ocx.cmake Findocx.cmake CMakeLists.txt tests/*.cmake tests/fixtures/*/CMakeLists.txt \
  tests/fixtures/*.cmake examples/*/CMakeLists.txt scripts/*.py .github/workflows/*.yml \
  docs/*.rst taskfile.yml taskfiles/*.yml
```

| File | Lines | Ships to consumers? |
|---|---:|---|
| `ocx.cmake` | 1506 | **Yes** |
| `Findocx.cmake` | 90 | **Yes** |
| `CMakeLists.txt` | 55 | No — `LANGUAGES NONE` test harness |
| `tests/helpers.cmake` | 150 | No |
| `tests/reconfigure_check.cmake` | 35 | No |
| `tests/self_update_check.cmake` | 87 | No |
| `tests/fixtures/bootstrap/CMakeLists.txt` | 24 | No |
| `tests/fixtures/foreign_platform/CMakeLists.txt` | 30 | No |
| `tests/fixtures/package/CMakeLists.txt` | 56 | No |
| `tests/fixtures/project_run/CMakeLists.txt` | 27 | No |
| `tests/fixtures/stale_lock/CMakeLists.txt` | 14 | No |
| `tests/fixtures/bootstrap_off.cmake` | 13 | No |
| `tests/fixtures/floating_fatal.cmake` | 9 | No |
| `tests/fixtures/script_mode.cmake` | 52 | No |
| `examples/find_package/CMakeLists.txt` | 23 | No (demo) |
| `examples/frozen_index/CMakeLists.txt` | 40 | No (demo, and CI doesn't build it — [§10](#10-tests-and-ci)) |
| `examples/package/CMakeLists.txt` | 59 | No (demo) |
| `examples/project/CMakeLists.txt` | 42 | No (demo) |
| `scripts/update_dist.py` | 81 | No |
| `.github/workflows/ci.yml` | 112 | No |
| `.github/workflows/pages.yml` | 50 | No |
| `.github/workflows/release.yml` | 45 | No (it produces the release) |
| `.github/workflows/update-dist.yml` | 41 | No |
| `docs/examples.rst` | 104 | No |
| `docs/index.rst` | 186 | No |
| `docs/reference.rst` | 9 | No (Sphinx auto-extracts from the two shipped files — [§11](#11-doc-versus-code-drift)) |
| `taskfile.yml` | 74 | No |
| `taskfiles/release.taskfile.yml` | 41 | No |

**Ships-to-consumers is exact, not a guess** — `.github/workflows/release.yml:23-24,36-45`:

```yaml
- name: Checksums over the published files
  run: sha256sum Findocx.cmake ocx.cmake > SHA256SUMS
...
  gh release create "$GITHUB_REF_NAME" ... Findocx.cmake ocx.cmake SHA256SUMS
```

Two files ship. Everything else — including every example and every doc page — is repo-internal.

## 2. Function census

```
awk '/^function\(|^macro\(/{n=$0;s=NR} /^endfunction\(|^endmacro\(/{print s"-"NR"  "n}' ocx.cmake
```

| Span | Name | Public? | `cmake_parse_arguments`? | Result mechanism |
|---|---|---|---|---|
| 357-362 | `__ocx_snapshot_env` | private | no | `set(... CACHE STRING)`, no `FORCE` |
| 407-421 | `__ocx_env_prefix` | private | no | `PARENT_SCOPE` |
| 423-435 | `__ocx_default_hint` | private | no | `PARENT_SCOPE` |
| 441-478 | `__ocx_run` | private | yes (`${ARGN}`) | `PARENT_SCOPE` (optional) |
| 482-509 | `__ocx_host_info` | private | no | `PARENT_SCOPE` ×3 |
| 513-545 | `__ocx_select_release` | private | no | `PARENT_SCOPE` ×4 |
| 549-574 | `__ocx_cli_version` | private | no | `PARENT_SCOPE` + `set_property(GLOBAL)` |
| 579-597 | `__ocx_require_cli` (**macro**, not function) | private | no | ambient (macro, no new scope) |
| 601-607 | `__ocx_register_name` | private | no | `set_property(GLOBAL APPEND)` |
| 609-611 | `__ocx_set_result` | private | no | `set(... CACHE INTERNAL)`, **no `FORCE`** |
| 617-631 | `__ocx_memo_hit` | private | no | `PARENT_SCOPE` |
| 633-636 | `__ocx_memo_store` | private | no | delegates to `__ocx_set_result` |
| 638-640 | `__ocx_clear_refresh` | private | no | `unset(... CACHE)` |
| 648-668 | `__ocx_export_env` | private | no | delegates to `__ocx_set_result` |
| 691-795 | `ocx_bootstrap` | **public** | yes | `set(OCX_EXECUTABLE ... CACHE FILEPATH ... FORCE)` |
| 805-835 | `__ocx_default_toml` | private | no | `PARENT_SCOPE` |
| 871-994 | `ocx_project` | **public** | yes | delegates (`__ocx_set_result`, `__ocx_export_env`) |
| 1005-1025 | `__ocx_find_index` | private | no | `PARENT_SCOPE` |
| 1071-1231 | `ocx_package` | **public** | yes | delegates + `set(<NAME>_ROOT ... CACHE PATH ... FORCE)` |
| 1294-1381 | `ocx_index` | **public** | yes (both sub-ops) | `PARENT_SCOPE` (`FIND`) / `PARENT_SCOPE` (`UPDATE_COMMAND`) |
| 1394-1499 | `__ocx_self_update` | private-named, sole script-mode entry point | no | none (rewrites files on disk) |

4 truly public (no `__` prefix): `ocx_bootstrap`, `ocx_project`, `ocx_package`, `ocx_index`. `__ocx_self_update` is invoked automatically at :1504-1506 when `cmake -P ocx.cmake` runs the file directly — it is reachable by any consumer running the documented self-update command (`README.md:54`, `ocx.cmake:131-141`) but is named like every private helper. **Naming/visibility mismatch** — see [Smells](#smells-ranked).

**CACHE variable table** (all 4 `set(... CACHE ...)` sites — matches headline #6):

| Variable(s) | Type | Docstring | `FORCE`? | Setter |
|---|---|---|---|---|
| Any of the 18 snapshotted `OCX_*` knobs (see [§7](#7-memoization-and-reconfigure-semantics)) | `STRING` | `"find_ocx: snapshotted from the environment at first configure"` | no (intentional — first-configure-wins is the documented "sticky" contract) | `__ocx_snapshot_env`, :359 |
| `__OCX_R_<name>_FP`, `__OCX_R_<name>_GUARD` | `INTERNAL` | `"find_ocx result (recomputed each configure)"` | **no** | `__ocx_set_result` via `__ocx_memo_store`, :610, :633-636 |
| `OCX_<name>_RUN`, `OCX_<name>_RUN_<BIN>`, `OCX_<name>_CONTENT`, `OCX_<name>_PATHS`, `OCX_<name>_ENV_<KEY>`, `OCX_<name>_ENV_KEYS` | `INTERNAL` | same docstring | **no** | `__ocx_set_result` via `ocx_project`:985-990, `ocx_package`:1197,1222-1227, `__ocx_export_env`:661,666-667 |
| `OCX_EXECUTABLE` | `FILEPATH` | `"Path to the ocx CLI"` | **yes** | `ocx_bootstrap`, :792 |
| `<NAME>_ROOT` | `PATH` | `"find_ocx: content root of <ref> (CMP0074 search hint)"` | **yes** | `ocx_package`, :1200-1201 |

The docstring on the second and third rows *says* "recomputed each configure" while the code that writes it omits `FORCE` — the one thing that would make that true. See [Smells](#smells-ranked) #1.

## 3. Scoping and policy posture

```
grep -n 'cmake_policy\|cmake_minimum_required\|include_guard\|CMP0' ocx.cmake Findocx.cmake CMakeLists.txt
```

| File | Guard | Floor | Policy |
|---|---|---|---|
| `ocx.cmake` | `include_guard(GLOBAL)` :173 | Hard `if(CMAKE_VERSION VERSION_LESS 3.19) message(FATAL_ERROR ...)` :167-171 | `cmake_policy(PUSH)` + `VERSION 3.19` :179-180, `POP` :**1383** |
| `Findocx.cmake` | **none** | No hard floor for the module itself; only the `OCX_BOOTSTRAP` fallback checks `CMAKE_VERSION VERSION_LESS 3.19` (:46) and warns (not fatal) | none |
| `CMakeLists.txt` (harness) | n/a | `cmake_minimum_required(VERSION 3.19)` :8 | none |

`CMP0074` is named only in prose/comments (`ocx.cmake:1061`, `:1201`) — the module never calls `cmake_policy(SET CMP0074 ...)`; it relies on the includer's own CMake version defaulting `CMP0074` to `NEW` (≥3.12) since `find_ocx` already requires ≥3.19.

**The policy-scope claim is false for one function.** The header comment (:175-178):

> "Function definitions capture the policy settings of their definition point: pin them to this module's baseline so includers that never ran cmake_minimum_required ... get identical behavior. Balanced by cmake_policy(POP) at the end of this file."

`cmake_policy(POP)` is at **:1383**, immediately after `ocx_index()` ends (:1381) — not "at the end of this file" (:1506). `__ocx_self_update` (:1394-1499) is defined *after* the `POP`, so it does **not** get the pinned-3.19 baseline the comment promises. Confirmed identical on `HEAD:1408` / `HEAD:1419-1524` (`git show HEAD:ocx.cmake | grep -n cmake_policy`). In practice this is low-severity — `__ocx_self_update` runs only in script mode (`cmake -P`), which has no ambient `cmake_minimum_required` from an includer to diverge from — but the comment is a factual misstatement about the code, verifiable by anyone who reads both.

**Sub-3.19 behavior, both files:**
- `ocx.cmake`: hard `FATAL_ERROR` at the top (:167-171) before `include_guard` even runs. CMake 3.15-3.18 (or 4.0's floor-removal era, see the frame) cannot get past line 171.
- `Findocx.cmake`: no floor at all for `find_package(ocx)` itself (`find_program`, `execute_process`, `find_package_handle_standard_args`, `add_executable(... IMPORTED)`, `mark_as_advanced` are all pre-3.0 features) — the file's own doc header claims "works standalone on CMake 3.15+" (:36) but nothing in CI or the test harness exercises a CMake below 3.31 ([§10](#10-tests-and-ci)), so the 3.15 claim is **unverified by any test in this repo**.

Policy inheritance at function-definition time is exactly why the `cmake_policy(PUSH)/VERSION 3.19` exists: CMake functions capture the policy stack in effect where they are *defined*, not where they are *called* — so without the pin, a caller with an older/newer `cmake_policy(VERSION ...)` in its own `CMakeLists.txt` would change the behavior of `ocx_project`/`ocx_package`'s internals purely by including the file from a different policy context. The mechanism is correct for 20 of 21 functions/macros; `__ocx_self_update` is the one exception (previous paragraph).

## 4. Quoting and list discipline

```
grep -cF 'if(' ocx.cmake        # 240
grep -cF 'list(' ocx.cmake      # 23
grep -cF 'string(' ocx.cmake    # 38
grep -cF 'foreach(' ocx.cmake   # 26 (13 loops, paired with 13 endforeach)
grep -nF 'separate_arguments' ocx.cmake   # 0 matches
grep -noE '(if|elseif|while)\([^"]*\$\{[a-zA-Z_0-9]+\}[^"]*(STREQUAL|MATCHES|EQUAL|VERSION_)' ocx.cmake   # 0 matches
```

| Signal | Count | Reading |
|---|---:|---|
| `if(` / `elseif(` sites | 240 | dense but not the concern |
| Unquoted `${var}` inside an `if()`/`elseif()`/`while()` *comparison* (the classic semicolon/word-split pitfall) | **0** | Every comparison quotes the variable: `if(NOT "${var}" STREQUAL "")` etc., throughout |
| Bare-identifier `if(var)` truthiness tests (the *safe* idiom CMake recommends for list-shaped values) | 26 (sampled) | Correct usage — `if(platform)`, `if(pull)`, `if(hit)`, etc. never dereference through `${}` first |
| `foreach()` forms | 13 loops: `IN ITEMS` ×1, `IN LISTS` ×9, `RANGE` ×2, `ZIP_LISTS` ×1 | **Zero** bare `foreach(x ${list})` — the form that silently mis-splits on embedded semicolons |
| `separate_arguments` | 0 | Not needed — nothing here parses a shell-style string into a list |
| User-supplied values interpolated into `COMMAND` | `"${toml}"` (:959,968,977,926-928), `"${lock}"` (:928), `"${ref}"` (:1184,1190,1214), `"${OCX_EXECUTABLE}"` (:450,557,1221) | **All quoted** at every site — verified by direct read of every `COMMAND` line (`ocx.cmake:437-478`, `:957-991`, `:1182-1228`, `:1283-1286`) |
| Multi-value lists forwarded unquoted into `COMMAND` (`${platform_args}`, `${groups_args}`, `${index_args}`, `${prefix}`) | intentional — these are lists of separate argv tokens (e.g. `-p foo`), not scalar values, so unquoted expansion is the *correct* form (each list element becomes one COMMAND argument) | correct |

**Net finding: this module has none of the classic CMake quoting bugs.** No unquoted `${var}` inside a comparison, no bare `foreach`, no unquoted user value landing in a `COMMAND` list. The one place a list *can* legitimately contain semicolons that would matter — `PLATFORM` — is explicitly rejected with a `MATCHES ";"` guard in both `ocx_project` (:905-909) and `ocx_package` (:1087-1091), i.e. the module defends against its own callers passing a `;`-list where a scalar is required, rather than mishandling it silently.

## 5. Network and process surface

```
grep -n 'file(DOWNLOAD\|file(ARCHIVE_EXTRACT\|execute_process' ocx.cmake
```

| Site | Kind | `EXPECTED_HASH`? | `TLS_VERIFY`/`TIMEOUT`/`INACTIVITY_TIMEOUT`/`HTTPHEADER`/`SHOW_PROGRESS`? | Notes |
|---|---|---|---|---|
| `ocx.cmake:738` | `file(DOWNLOAD)` — dist manifest via `OCX_INSTALL_DIST_URL` | **No** (can't — it's the trust root) | none of the five | Only reached when a mirror manifest URL is set; the embedded snapshot (:190-350) is the default and needs no download |
| `ocx.cmake:765` | `file(DOWNLOAD)` — the `ocx` binary itself | **Yes**, `SHA256=${sha}` | none of the five | Content-verified regardless of TLS; a MITM can only serve garbage that then fails the hash |
| `ocx.cmake:1413` | `file(DOWNLOAD)` — GitHub releases API `latest.json` (self-update, tag discovery) | **No** (dynamic content) | none | Only reached by `cmake -P ocx.cmake` with no explicit `OCX_SELF_UPDATE_VERSION` |
| `ocx.cmake:1434` | `file(DOWNLOAD)` — `SHA256SUMS` (self-update trust root) | **No** — this *is* the hash source | none | Trust is transitive from here down; nothing verifies this file's own integrity beyond HTTPS transport |
| `ocx.cmake:1467` | `file(DOWNLOAD)` — `ocx.cmake`/`Findocx.cmake` release files | **Yes**, `SHA256=${sha}` (from :1434's parsed sums) | none | |
| `ocx.cmake:776` | `file(ARCHIVE_EXTRACT)` | n/a | n/a | `INPUT`/`DESTINATION` only, into a fresh `extract-<version>-<triple>` dir that is `file(REMOVE_RECURSE)`d first |

**`TLS_VERIFY` is never set anywhere, on any of the 5 downloads.** CMake's `file(DOWNLOAD)` performs TLS verification by default when `CMAKE_TLS_VERIFY` is a cache/normal variable set truthy, but does **not** default it on when the variable is simply undefined for a *specific* `file(DOWNLOAD)` call — the module never sets `CMAKE_TLS_VERIFY` and never passes `TLS_VERIFY ON` to any of its 5 calls. In practice the two unverifiable-content downloads (`:738` dist manifest, `:1434` `SHA256SUMS`) are the ones where TLS is the *only* integrity layer, and it is not pinned on explicitly by this module — it depends entirely on the CMake build's own global TLS defaults (which vary by CMake version and platform TLS backend).

```
grep -n execute_process ocx.cmake
```

| Site | `RESULT_VARIABLE`? | `OUTPUT_VARIABLE`/`ERROR_VARIABLE`? | `COMMAND_ERROR_IS_FATAL`? | `WORKING_DIRECTORY`? | `OUTPUT_STRIP_TRAILING_WHITESPACE`? |
|---|---|---|---|---|---|
| `:449` (`__ocx_run`, every `ocx` invocation) | yes (`rc`) | yes/yes | no | no | no (`string(STRIP)` used manually where needed, e.g. :566) |
| `:556` (`__ocx_cli_version`) | yes (`rc`) | yes/yes | no | no | manual `string(STRIP)` at :566 |
| `:1286` (doc example only, inside the `.. parsed-literal::` block, not executable module code) | no | no | **yes**, `ANY` | no | n/a |

`OUTPUT_STRIP_TRAILING_WHITESPACE` and `ENCODING` are used **zero** times (`grep -c` → 0 each); every trim is done by hand with `string(STRIP ...)`. `WORKING_DIRECTORY` is never set — every `execute_process`/`__ocx_run` invocation runs in CMake's own current working directory, relying on absolute paths passed as arguments (`"${toml}"`, `"${OCX_EXECUTABLE}"`) rather than a `cd`.

`string(JSON ...)`: 17 uses, all `GET`/`LENGTH`/`MEMBER`, none with `ERROR_VARIABLE` **except** `__ocx_select_release`'s schema check (:514, `ERROR_VARIABLE err`) — every other `string(JSON GET ...)` call (parsing `ocx`'s own `--format json` output) has no `ERROR_VARIABLE` and would abort the configure with CMake's own generic JSON-parse error message rather than a `find_ocx: ` -prefixed one if `ocx` ever emitted malformed JSON.

sha256 verification summary: **2 of 5** downloads are hash-verified (the actual binaries); the **2 manifest/trust-root fetches that anchor those hashes** (`:738`, `:1434`) are trusted on TLS transport alone, which is the standard "chicken and egg" shape for this kind of bootstrap (documented nowhere as a caveat, but not unusual — Homebrew, rustup, and most curl-pipe-installers have the identical root-of-trust gap).

## 6. Error taxonomy

```
grep -cF 'message(FATAL_ERROR' ocx.cmake   # 37
grep -cF 'message(WARNING' ocx.cmake       # 1
grep -cF 'message(STATUS' ocx.cmake        # 10
```

Prefix convention: **every** message in both files opens with `"find_ocx: "` (verified by direct read of all 48+2 sites, not grep alone — the string literal is frequently on the line *after* `message(FATAL_ERROR`). No exceptions found.

`__ocx_default_hint`, quoted verbatim (`ocx.cmake:423-435`):

```cmake
function(__ocx_default_hint code out_var)
  set(hint "")
  if(code EQUAL 64)
    set(hint "the pinned ocx and find_ocx disagree on the CLI surface - check OCX_INSTALL_VERSION against the find_ocx pin (${__OCX_PIN_VERSION})")
  elseif(code EQUAL 65)
    set(hint "declarations changed since ocx.lock was written - run 'ocx lock' and commit the result")
  elseif(code EQUAL 69)
    set(hint "registry unreachable - check the network, OCX_MIRRORS, and registry credentials (OCX_AUTH_*)")
  elseif(code EQUAL 78)
    set(hint "expected configuration missing - is ocx.toml/ocx.lock where find_ocx expects it?")
  endif()
  set(${out_var} "${hint}" PARENT_SCOPE)
endfunction()
```

Only **64, 65, 69, 78** are named generically. Two call sites in `ocx_package` (:1174, :1177) hand-roll an **81** hint inline via the `HINTS` mechanism (`"81=package not in the committed index snapshot ..."` / `"81=frozen resolution refused the floating tag ..."`) — `__ocx_run`'s `HINTS` list is checked *before* falling back to `__ocx_default_hint` (:462-471), so per-call overrides work, but **81 has no generic fallback** for any call site that doesn't opt in.

Fatal vs. warning: 37 fatal paths (configure-stopping) vs. **1** warning in `ocx.cmake` (:1205, a floating+lazy package with `OCX_ALLOW_FLOATING` — deliberately non-fatal, the gate above it is what makes this reachable at all) and 2 warnings in `Findocx.cmake` (:47,:51, both `OCX_BOOTSTRAP` misconfiguration that degrades to "no ocx found" rather than aborting `find_package`, matching `find_package`'s own non-fatal-until-`REQUIRED` contract).

Credential/environment leakage: `OCX_AUTH_<REGISTRY>_{TYPE,USER,TOKEN}` is documented as **never** snapshotted (:162-164) and is absent from `__OCX_PASSTHROUGH_VARS` (:367-377) — confirmed by grep, `OCX_AUTH` appears only in prose/comments (`ocx.cmake:162`, `:430`), never in an executable `set`/`list`/`foreach`. No error path prints `${OCX_EXECUTABLE}`'s full environment; `stderr`/`stdout` from the `ocx` child process are interpolated into `FATAL_ERROR` messages (:476-477) verbatim, so **whatever `ocx` itself chooses to print on failure is not redacted by find_ocx** — a credential accidentally echoed by the `ocx` CLI (not this module's doing) would surface in the CMake log. Not exploitable by this module's own code, but worth naming as a boundary.

**Comparison with `rules_ocx`'s CLI contract** (`/home/mherwig/dev/rules_ocx/AGENTS.md:161-178`, read-only): rules_ocx's sysexit table names **14** codes (64,65,69,74,75,77,78,79,80,81,82,83,84,85) against `find_ocx`'s **4** generic + 2 hand-rolled = 6. `find_ocx` predates 0.5+'s sysexits 75/79/80/81/82/83/84/85 entirely at the generic-hint layer — see [§12](#12-parity-with-rules_ocx).

## 7. Memoization and reconfigure semantics

**The memoization mechanism, as documented** (`ocx.cmake:613-616`):

> "Reconfigure memoization: returns TRUE in out_var when the stored fingerprint for `<name>` matches AND every guard path still exists (store GC protection). `OCX_REFRESH` bypasses (one-shot: cleared at the end of the top-level directory via `cmake_language(DEFER)`)."

Fingerprint inputs (`ocx_project` :939-940): `project|<module version>|<cli version>|<OCX_EXECUTABLE>|<toml path>|<toml sha256>|<lock sha256>|<GROUPS>|<BINS>|<platform>|<pull>|<env prefix>`. `ocx_package` (:1164-1165): the equivalent with `<PACKAGE ref>` instead of toml/lock. Both are `string(SHA256 ...)`-hashed, then compared via `__ocx_memo_hit` against `$CACHE{__OCX_R_<name>_FP}` plus a guard-path existence check (`__OCX_R_<name>_GUARD`, :625-628 — the exported `_PATHS`/`_CONTENT` targets must still exist on disk, protecting against an external `ocx` store GC invalidating a stale memo hit).

**As implemented, the write side is broken past the first configure** — see [Smells](#smells-ranked) #1: `__ocx_memo_store` (:633-636) calls `__ocx_set_result` for both `_FP` and `_GUARD`, and `__ocx_set_result` (:609-611) writes `CACHE INTERNAL` with no `FORCE`. CMake's `set(<var> <value> CACHE <type> <docstring>)` **without `FORCE` is a no-op when the cache entry already exists** — only the very first configure of a build tree (where the entry doesn't exist yet) actually stores a value; every later attempt to overwrite it silently does nothing. Concretely: configure #1 creates `__OCX_R_JQ_FP` with fingerprint A. Something changes (new `PACKAGE` ref) → configure #2's `__ocx_memo_hit` correctly detects the mismatch (A ≠ B) and re-runs `ocx`, computes new fingerprint B, calls `__ocx_memo_store` to write B — which **fails silently**, leaving the cache at A. Configure #3 (nothing changed since #2) computes fingerprint B again, compares against the *still-stale* cached A, gets another mismatch, and re-runs `ocx` **again** — the memo can never re-arm after its first invalidation. The same missing-`FORCE` bug also means `OCX_<name>_RUN`/`OCX_<name>_CONTENT`/`OCX_<name>_PATHS`/`OCX_<name>_ENV_*` themselves go stale on that first invalidated reconfigure — inconsistent with `<name>_ROOT` (`ocx_package:1200-1201`), which **does** carry `FORCE` and updates correctly, so the same `ocx_package()` call can leave `<name>_ROOT` fresh while `OCX_<name>_CONTENT` (the very same content path, exported through a different variable) is stale.

`tests/reconfigure_check.cmake` (35 lines, [§10](#10-tests-and-ci)) does **not** catch this: it configures the *same* fixture twice with *no input change*, asserting the second run **is** memoized — it never invalidates the memo and reconfigures a third time to check the memo re-arms. The one test that exists for this mechanism cannot see the bug.

`CMAKE_CONFIGURE_DEPENDS`: used at 3 sites — `ocx_project` watches `${toml}` and (if present) `${lock}` (:925-929, guarded by `NOT CMAKE_SCRIPT_MODE_FILE`), `ocx_package` watches the index leaf `<index_dir>/<repo>.json` when it exists (:1145-1149, same script-mode guard). Not used for `.ocx/` directory *creation* (a snapshot added after the first configure needs a manual reconfigure — undocumented but structurally identical to the "config file created later" gap the rules_ocx side documents explicitly, per the handover's §9 note).

`OCX_REFRESH` one-shot bypass (:641-643): guarded to run only `if(OCX_REFRESH AND NOT CMAKE_SCRIPT_MODE_FILE)`, deferred via `cmake_language(DEFER DIRECTORY ... CALL __ocx_clear_refresh)` — clears the cache flag once, at the end of the top-level directory's processing, so a single `-DOCX_REFRESH=ON` configure self-resets for the next one.

**Env-snapshot table** — every `OCX_*` knob and its treatment, cross-checked against `ocx.cmake`'s own header doc (:42-164):

| Variable | Snapshotted (env→cache at 1st configure)? | Forwarded to every `ocx` invocation (passthrough)? | Forced/neutralized in `__ocx_env_prefix`? | Doc says this? |
|---|---|---|---|---|
| `OCX_EXECUTABLE` | yes (:381) | n/a (it's the binary itself) | no | yes |
| `OCX_INSTALL_DIST_URL` | yes (:382) | no | no | yes |
| `OCX_INSTALL_MIRROR_URL` | yes (:383) | no | no | yes |
| `OCX_INSTALL_VERSION` | yes (:384) | no | no | yes |
| `OCX_DEFAULT_PLATFORM` | yes (:385) | no | no | yes |
| `OCX_BOOTSTRAP` | yes (:386) | no | no | yes |
| `OCX_BOOTSTRAP_CACHE` | yes (:387) | no | no | yes |
| `OCX_PROJECT_FILE` | yes (:388) | no | no | yes |
| `OCX_ALLOW_FLOATING` | yes (:389) | no | no | yes |
| `OCX_HOME`, `OCX_MIRRORS`, `OCX_INSECURE_REGISTRIES`, `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_REMOTE`, `OCX_JOBS`, `OCX_INDEX`, `OCX_DEFAULT_REGISTRY` (9 — `__OCX_PASSTHROUGH_VARS`, :367-377) | yes (:390, `${__OCX_PASSTHROUGH_VARS}` expanded into the same `foreach`) | **yes** | cleared knob → `--unset=VAR` (:415) | yes |
| `OCX_PROJECT` | n/a — never snapshotted; **always** forced to `""` on every invocation (:408) | forced, not passthrough | yes, unconditionally | yes (:401-403) |
| `OCX_PULL` | **no** — read directly as a plain variable (`if(OCX_PULL OR platform)`, :917,:1158) | n/a | n/a | **doc (:42-46) implies "every OCX_* knob follows the snapshot pattern" — this is the exception, undocumented as such** |
| `OCX_REFRESH` | **no** — same as `OCX_PULL` | n/a | n/a | same drift |
| `OCX_SELF_UPDATE_VERSION`, `OCX_SELF_UPDATE_URL` | no (script mode has no persistent cache to snapshot into) | n/a | n/a | doc explicitly scopes these to script mode (:131-141, :143-148) — no drift |
| `OCX_AUTH_<REGISTRY>_{TYPE,USER,TOKEN}` | **never**, by design | not in passthrough list | n/a | yes, explicitly (:162-164) |

18 knobs go through `__ocx_snapshot_env`; `OCX_PULL`/`OCX_REFRESH` are the two the general doc prose doesn't call out as exceptions to "each one follows the snapshot pattern." See [§11](#11-doc-versus-code-drift) row.

## 8. Platform posture

`__ocx_host_info` (`ocx.cmake:482-509`):

| Host | `CMAKE_HOST_SYSTEM_NAME` branch | Release triple | ocx platform key | exe suffix |
|---|---|---|---|---|
| Linux (any libc) | `"Linux"` | `<arch>-unknown-linux-musl` — **always musl, never gnu**, "same as rules_ocx" per the comment at :481 | `linux/<amd64\|arm64>` | none |
| macOS | `"Darwin"` | `<arch>-apple-darwin` | `darwin/<amd64\|arm64>` | none |
| Windows | `"Windows"` | `<arch>-pc-windows-msvc` | `windows/<amd64\|arm64>` | `.exe` |
| anything else (BSD, unknown) | `else()` | n/a | n/a | `message(FATAL_ERROR "unsupported host OS '${CMAKE_HOST_SYSTEM_NAME}'")` (:507) |
| unsupported arch (not x86_64/amd64/x64 or aarch64/arm64) | — | — | — | `message(FATAL_ERROR "unsupported host architecture '${raw_arch}'")` (:492) |

Deliberate design, not a gap: Linux is *always* mapped to the musl release regardless of the host's actual libc — this is a portability choice (musl binaries run on both glibc and musl hosts; the reverse is not true), not an oversight, and matches `rules_ocx`'s stated behavior verbatim ("Linux maps to musl, same as rules_ocx", :481).

Windows-specific handling in `ocx_bootstrap` (:718-731): `%LOCALAPPDATA%/find_ocx` cache root when `OCX_BOOTSTRAP_CACHE` is unset and the host is Windows with `LOCALAPPDATA` set (:720-721); falls through the same `XDG_CACHE_HOME` → `HOME` → build-tree ladder as POSIX otherwise. `.exe` suffix threaded through `__ocx_host_info` → `ocx_bootstrap`'s binary path (:731,:777-778) and the release archive naming (`.zip` for Windows targets, `.tar.xz` for all POSIX targets, per the embedded manifest at :196-260 — **`.tar.xz`, not `.tar.gz` as `OCX-0.5-HANDOVER.md` states**; functionally irrelevant since `file(ARCHIVE_EXTRACT)` auto-detects format, but a footnote-level inaccuracy in the handover's own text, not in the code).

CI's Windows note (`.github/workflows/ci.yml:16-19`):

```yaml
# The mirror-cmake bundle picks NMake on Windows (needs a VS dev shell);
# ninja is provisioned through ocx.toml — dogfooding all the way down.
env:
  CMAKE_GENERATOR: Ninja
```

CI overrides the generator globally to Ninja precisely to avoid the NMake-needs-a-VS-shell problem the comment names — the module itself has no generator opinion; this is a harness-only concern.

**What CI actually runs vs. what the code claims to support:**

| Platform | CI job(s) that run there | Code paths claiming support |
|---|---|---|
| Linux (ubuntu-latest) | `lint`, `docs`, `test`, `examples`, `offline` (all 5 jobs) | full — the `foreign_platform` test family is Linux-only in `CMakeLists.txt:47-49` |
| macOS | `test`, `examples` | full host-detection branch, never CI-exercised for `lint`/`docs`/`offline` |
| Windows | `test`, `examples` | full host-detection branch (`%LOCALAPPDATA%`, `.exe`, `.zip`); **never** runs `offline` (the offline-determinism job is ubuntu-only, :90-113) |
| musl (Alpine etc.) | never | claimed identical-to-glibc-Linux by design, never actually run under musl in CI |
| BSD / other | never | explicit `FATAL_ERROR`, by design |

## 9. The find_package seam

`ocx_package(... PULL)` sets `<NAME>_ROOT` — **normal-case, unmodified `arg_NAME`** (the doc at :1061 says "original case"), as a **CACHE PATH with FORCE** (`ocx.cmake:1199-1202`):

```cmake
if(NOT arg_NO_ROOT)
  set(${arg_NAME}_ROOT "${content}" CACHE PATH
    "find_ocx: content root of ${ref} (CMP0074 search hint)" FORCE)
endif()
```

This is exactly the `<PackageName>_ROOT` variable CMake's `CMP0074` policy (NEW since 3.12, which this module always has since it floors at 3.19) makes `find_package(<PackageName>)` consult automatically — `find_ocx` never calls `find_package` itself; it only *primes the hint variable* a subsequent, user-written `find_package(jq)` / `find_library` / `find_program` will pick up. `NO_ROOT` suppresses the export when the caller doesn't want `find_package` interference (e.g. the package isn't meant to be discovered that way).

`CMAKE_PROGRAM_PATH` / `CMAKE_PREFIX_PATH`: **never touched** anywhere in `ocx.cmake` (`grep -cF` for both → 0). The seam is exclusively `<NAME>_ROOT` (CMP0074) plus the `OCX_<NAME>_RUN*` command-list exports — `find_ocx` does not attempt to make provisioned content globally discoverable via the generic prefix-path mechanism, only via the named, opt-in `<NAME>_ROOT` variable.

`Findocx.cmake` (a genuine CONFIG-style find module, for the `ocx` CLI itself, not for packages `ocx_package` provisions) vs. what a CONFIG package would do differently:

| Concern | `Findocx.cmake` (Find module) | A `ocxConfig.cmake` (Config package) would instead |
|---|---|---|
| Discovery | `find_program(OCX_EXECUTABLE NAMES ocx)` (:42) | `find_package(ocx CONFIG)` walking `CMAKE_PREFIX_PATH`/`<ocx>_DIR` |
| Version | `execute_process(... ocx version ...)` parsed by regex (:62-73) | A `ocxConfigVersion.cmake` compatibility file, no process spawn |
| Target | Hand-built `add_executable(ocx::ocx IMPORTED)` + `IMPORTED_LOCATION` (:84-88) | Target imported directly from an installed `ocxTargets.cmake` |
| Fallback | Opt-in bootstrap via `OCX_BOOTSTRAP` (delegates to `ocx.cmake`'s `ocx_bootstrap()`, :54-57) | No equivalent concept — Config packages don't self-download |

An imported executable target **is** created: `ocx::ocx` (:84-88), guarded by `NOT TARGET ocx::ocx` so a second `find_package(ocx)` in a different subdirectory doesn't redefine it — but note `Findocx.cmake` has **no `include_guard`**, so `find_program`/`execute_process`/`find_package_handle_standard_args` re-run every time the file is `include()`d or `find_package()`d again in the same configure (redundant work, not a correctness bug, since the `NOT TARGET` guard protects the one operation that would actually error).

## 10. Tests and CI

`CMakeLists.txt:44-55`, `tests/helpers.cmake` (150 lines) — 10 test families, each instantiated once per `OCX_TEST_CMAKE_VERSIONS` entry (`3` → CMake 3.31.x, `4` → CMake 4.x; **3.19 is commented out**, :22-24: `# TODO(mirror backfill): mirror-cmake versions.min is 3.31.0; enable once 3.19.x is published, see the plan's external prerequisite.` — so **the CMake 3.19 floor this module enforces at :167-171 is never actually tested against a real CMake 3.19 binary**, only ≥3.31):

| Family | Asserts | Negative? | Linux-only? | `-Werror=dev` on its own `cmake` invocation? |
|---|---|---|---|---|
| `bootstrap` | `ocx_bootstrap()` fixture builds with `NO_EXECUTABLE` (forces the download path) | no | no | yes (`ocx_add_cmake_version_test`, :44) |
| `project_run` | `ocx_project()` end-to-end | no | no | yes |
| `package` | `ocx_package()` end-to-end | no | no | yes |
| `foreign_platform` | `PLATFORM` export path produces no `RUN` vars | no | **yes** (`CMakeLists.txt:47-49`) | yes |
| `stale_lock` | doctored `ocx.lock` fails with the exit-65 hint (`PASS_REGULAR_EXPRESSION "run 'ocx lock'"`) | **yes** | no | yes (`ocx_add_stale_lock_test`, :57) |
| `bootstrap_off` | `OCX_BOOTSTRAP=OFF` + no executable → hard error | **yes** | no | **no** |
| `floating_fatal` | floating tag, no index/pin → hard error | **yes** | no | **no** |
| `memoize` (via `tests/reconfigure_check.cmake`) | 2nd configure of an unchanged fixture is memoized | no | no | **no** |
| `script_mode` | `include(ocx)` under `cmake -P` | no | no | **no** |
| `self_update` (via `tests/self_update_check.cmake`) | file:// fake release round-trips, hash-verified, atomic rename | no | no | **no** |

**5 of 10 families never assert `-Werror=dev` on the `cmake` invocation they're testing** — `bootstrap_off`, `floating_fatal`, `script_mode`, `memoize`, `self_update` all invoke `cmake -P` or `cmake -S/-B` directly (`tests/helpers.cmake:71-133`) without the flag, and their supporting scripts (`tests/reconfigure_check.cmake:15-18`, `tests/self_update_check.cmake:52-57,75-79`) don't add it either. Only `ocx_add_cmake_version_test` (:23-45) and `ocx_add_stale_lock_test` (:51-67) pass `-Werror=dev`.

**CI** (`.github/workflows/ci.yml`, 112 lines):

| Job | OS matrix | What it proves |
|---|---|---|
| `lint` | ubuntu | `task lint` (actionlint, hawkeye license headers, lychee link check) |
| `docs` | ubuntu | `task docs` → `sphinx-build -W` (warnings are errors) |
| `test` | ubuntu, macos, windows | `task test` → the 10-family CTest harness above, on the host's live `ocx.sh` registry (not offline) |
| `examples` | ubuntu, macos, windows × `[project, package, find_package]` | Manual `cmake -Werror=dev -DOCX_PULL=ON -DOCX_BOOTSTRAP=ON` configure/build/ctest per example — **`frozen_index` is absent from this matrix** (`:65-72`), even though `taskfile.yml:52`'s local `task test:examples` **does** include it (`EXAMPLES: project package frozen_index find_package`) — CI and the local `verify` gate disagree on coverage |
| `offline` | ubuntu only | Warm+offline configure succeeds; offline against an *empty* `OCX_HOME` fails as expected — proves the offline-determinism contract, but **only on Linux** |

`update-dist.yml` also listens for `repository_dispatch: {types: [ocx-released]}` (:6-8) — per `OCX-0.5-HANDOVER.md` item 8, `ocx-sh/ocx` has no workflow that sends this event, so that trigger is dead; the `schedule: "23 4 * * 1"` cron is the only one that actually fires.

Not tested anywhere: the Windows-specific `%LOCALAPPDATA%` cache-root branch under a *forced empty* `XDG_CACHE_HOME`/`HOME` (CI's Windows runners have `HOME` set, so the fallback ladder's Windows-first branch is exercised only incidentally, not asserted); any mirror knob (`OCX_INSTALL_DIST_URL`, `OCX_INSTALL_MIRROR_URL`, `OCX_MIRRORS`, `OCX_INSECURE_REGISTRIES`); `OCX_SELF_UPDATE_URL` against a *mirror that actually serves different bytes* (only a `file://` echo of the current sources, `tests/self_update_check.cmake:19-50`); a genuine reconfigure-with-changed-inputs path (the gap that hides the memoization bug, [§7](#7-memoization-and-reconfigure-semantics)); a real CMake 3.19 binary (mirror-cmake's floor is 3.31, per the TODO at `CMakeLists.txt:22-24`); `Findocx.cmake`'s standalone-3.15 claim.

**Docs freshness**: `docs/reference.rst` (9 lines) is **not hand-written prose to drift** — it's two Sphinx directives (`.. cmake-module:: ../ocx.cmake`, `.. cmake-module:: ../Findocx.cmake`) from the `sphinxcontrib.moderncmakedomain` extension (`docs/conf.py:10-11`), which extracts the `#[=[.rst: ... #]=]` comment blocks *directly from the source files* at doc-build time. `task docs` runs `sphinx-build -W` (warnings as errors), gated by CI's `docs` job — so a malformed `.rst` comment block inside `ocx.cmake`/`Findocx.cmake` fails CI, but this mechanism cannot catch drift in **hand-written** prose elsewhere (`README.md`, `docs/index.rst`) that paraphrases the same knobs independently — see [§11](#11-doc-versus-code-drift).

## 11. Doc-versus-code drift

| Doc claim | Code reality | Authoritative in practice |
|---|---|---|
| `ocx.cmake`'s own `.. rst:` header ↔ `docs/reference.rst` | Sphinx `cmake-module` directive extracts the header **from the source at build time** — cannot drift by construction | Code (mechanically enforced) |
| Header prose (:42-46): "Corporate mirrors and behavior knobs are plain `OCX_*` variables. Each one follows the snapshot pattern" | `OCX_PULL` and `OCX_REFRESH` are **not** snapshotted (read as plain `-D` variables only, [§7](#7-memoization-and-reconfigure-semantics)) — 2 of the ~20 knobs are silent exceptions to this blanket claim | Code — the doc overclaims |
| Header comment :178 "Balanced by `cmake_policy(POP)` at the end of this file" | `POP` is at :1383, ~120 lines before EOF; `__ocx_self_update` is defined after it | Code — the comment is wrong ([§3](#3-scoping-and-policy-posture)) |
| `Findocx.cmake:36` "This find module works standalone on CMake 3.15+" | No CI job or test runs any CMake < 3.31 ([§10](#10-tests-and-ci)) | Unverified either way — the claim is plausible (all APIs it uses predate 3.15) but untested |
| `README.md`/`docs/index.rst` corporate-mirrors variable tables | Both hand-written, independently of `ocx.cmake`'s own header and of each other; currently in sync (spot-checked: `OCX_INSTALL_DIST_URL`, `OCX_INSTALL_MIRROR_URL`, `OCX_MIRRORS`, `OCX_INSECURE_REGISTRIES`, `OCX_AUTH_<REGISTRY>_*` all present, wording matches) — but **nothing mechanically checks this**, unlike `docs/reference.rst` | Code, but only by luck/discipline — no test enforces it |
| `OCX-0.5-HANDOVER.md`: "Still `.tar.gz` + `.zip`" | Embedded manifest (`ocx.cmake:196-260`) ships `.tar.xz` for every POSIX target, `.zip` for Windows | Code — the handover's own text is imprecise (functionally moot, `file(ARCHIVE_EXTRACT)` format-sniffs) |
| `OCX-0.5-HANDOVER.md` (title: "adopt ocx **0.5.2**") | Working-tree `ocx.lock` header reads `generated_by = "ocx 0.5.6"` | Neither — the working tree is ahead of the handover's own stated target version |
| Working-tree `ocx.toml` (renamed to `ocx.sh/kitware/cmake:3.31` etc.) vs. `CMakeLists.txt:20-21` (`ocx_package(... PACKAGE ocx.sh/cmake:3.31 ...)`, still flat) and `.ocx/ocx.sh/cmake.json` (still flat `"repository": "ocx.sh/cmake"`) | The dev-tool declarations were renamed; the CMake test-harness's own package references and its committed index snapshot were **not** — internally inconsistent within the same dirty tree | Neither — this is mid-migration and self-contradictory right now |

## 12. Parity with rules_ocx

Read-only comparison against `/home/mherwig/dev/rules_ocx/AGENTS.md` (303 lines, the project's own stated single source of truth) and `rules_ocx/ocx/private/versions.bzl:15,18`.

| Concern | `find_ocx` | `rules_ocx` | Same or diverged |
|---|---|---|---|
| Public surface | 4 commands: `ocx_bootstrap`, `ocx_project`, `ocx_package`, `ocx_index` | 1 extension (`//ocx:extensions.bzl%ocx`) with 4 tag classes (`download`, `project`, `package`, `policy`) + `ocx_project_repo`/`ocx_package_repo` repository rules from `//ocx:defs.bzl` | **Diverged in shape, same in coverage** — no `find_ocx` equivalent of the `policy` tag (see below) |
| CLI pin | `__OCX_PIN_VERSION = "0.3.11"` (`ocx.cmake:187`, unchanged by the dirty tree) | `MIN_OCX_VERSION = DEFAULT_OCX_VERSION = "0.6.0"` (`versions.bzl:15,18`) | **Diverged — 3+ minor versions behind.** `find_ocx`'s own working-tree `ocx.lock` is stamped `ocx 0.5.6`, itself ahead of the CLI pin it ships |
| Env passthrough ("site" class, forwarded verbatim) | 9: `OCX_HOME`, `OCX_MIRRORS`, `OCX_INSECURE_REGISTRIES`, `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_REMOTE`, `OCX_JOBS`, `OCX_INDEX`, `OCX_DEFAULT_REGISTRY` (`ocx.cmake:367-377`) | 10: same 8 minus `OCX_HOME` (resolved, not forwarded) plus `OCX_MANAGED_CONFIG`, `OCX_PATCHES` (AGENTS.md:215-217) | **Diverged** — `find_ocx` is missing `OCX_MANAGED_CONFIG`/`OCX_PATCHES` (matches `OCX-0.5-HANDOVER.md` §9 independently) and forwards `OCX_HOME` directly instead of resolving it |
| "Translucent" env class (ambient unless an attr overrides) | **No equivalent concept** | 4: `OCX_CONFIG`, `OCX_PATCH_SNAPSHOT`, `OCX_SIGSTORE_TRUSTED_ROOT`, `OCX_NO_CONFIG` (AGENTS.md:229-232) | **Diverged** — `find_ocx` has none of these |
| "Explicit" env class (never ambient, always written) | **No equivalent** — `find_ocx` has no signature/policy tier at all | 2: `OCX_NO_VERIFY`, `OCX_ALLOW_YANKED`, driven by an `ocx.policy()` tag (AGENTS.md:40-54, 233-234) | **Diverged** — `find_ocx` predates ocx's signature-verification/yank-policy features entirely |
| "Pinned" env class (forced constant every invocation) | 1: `OCX_PROJECT=""` (`ocx.cmake:408`) | 5: `OCX_PROJECT ""`, `OCX_GLOBAL "0"`, `OCX_QUIET "0"`, `OCX_NO_PROJECT "1"`, `OCX_NO_CONFIG_REFRESH "1"` (AGENTS.md:235-238) | **Diverged** — `find_ocx` neutralizes only 1 of the 5; `OCX_QUIET`/`OCX_GLOBAL` unneutralized is exactly `OCX-0.5-HANDOVER.md` §5's finding, corroborated independently here |
| Sysexit hint coverage | 4 generic (64,65,69,78) + 2 hand-rolled (81) = 6 of 14 codes named | 14 named: 64,65,69,74,75,77,78,79,80,81,82,83,84,85 (AGENTS.md:161-178), 75 explicitly retried before ever reaching a `fail()` | **Diverged** — `find_ocx` has no hint for 74,75,77,79,80,82,83,84,85; `__ocx_run`'s `RETRIES` param exists (:442,445-447) but nothing currently passes it for 75 specifically (only `ocx_package`'s `install` call uses `RETRIES 2`, :1185, generically) |
| Reproducible-first / floating-tag policy | Explicit, prominent: floating tag + no index + no digest pin is a **hard configure error** by default, `OCX_ALLOW_FLOATING` the escape hatch (`ocx.cmake:26-30,101-107,1119-1129`) | Not described in comparable terms in the read AGENTS.md excerpt (its reproducibility story is `MIN_OCX_VERSION` + `dist/dist.json` version lockstep, a different mechanism; an index/snapshot equivalent, if any, was not established in this read-only pass) | **Not directly comparable from the material read** — flag as a gap, not a divergence, since `rules_ocx`'s index-equivalent (if one exists) wasn't located |
| Reconfigure/fetch memoization | Fingerprint-based, `CACHE INTERNAL` (broken past first invalidation, [§7](#7-memoization-and-reconfigure-semantics)) | Not covered in the read excerpt (Bazel's own repository-rule re-fetch semantics are a different mechanism — Bazel tracks `repository_ctx.watch()`'d paths itself) | Not comparable — different platforms, different mechanism entirely |
| Config-tier watching | None — `find_ocx` has no concept of `/etc/ocx/config.toml`, user config dir, or managed-config snapshot at all | 4-5 tiers watched via `repository_ctx.watch()`, including *absence*-watching (AGENTS.md §"Invariants" item 5, and `OCX-0.5-HANDOVER.md` §9's note that `CMAKE_CONFIGURE_DEPENDS` cannot express absence-watching) | **Diverged, and structurally so** — CMake's dependency model cannot express what Bazel's `watch()` can; `find_ocx` doesn't attempt it (correctly, per the handover's own recommendation to document rather than fake it) |

## Smells (ranked)

1. **`__ocx_set_result` writes `CACHE INTERNAL` without `FORCE`** (`ocx.cmake:609-611`), breaking reconfigure memoization for every exported result variable (`OCX_<name>_RUN*`, `OCX_<name>_CONTENT`, `OCX_<name>_PATHS`, `OCX_<name>_ENV_*`) **and** the `_FP`/`_GUARD` memo record itself, past the first configure of a build tree. Confirmed identical on `HEAD:610-612`. Docstring ("recomputed each configure") directly contradicts the missing keyword. The one test covering this path (`tests/reconfigure_check.cmake`) never exercises "memo invalidated, then reconfigure again" and so cannot catch it. Highest-value single fix in this codebase.
2. **`cmake_policy(POP)` at :1383, not at EOF (:1506)**, leaving `__ocx_self_update` defined outside the policy scope the header comment (:178) claims covers the whole module. Low practical severity (script mode has no ambient policy to diverge from) but a verifiable, plain factual error in a load-bearing comment.
3. **Working tree bundles two unrelated changes** ([§Dirty tree](#the-dirty-tree-precisely)): the namespaced-catalog/lock-v3 migration `OCX-0.5-HANDOVER.md` describes, and an undocumented `PLATFORM`/`PINS` API simplification the handover never mentions. A reviewer reading only the handover would miss half the diff's intent.
4. **The dirty tree is internally inconsistent right now**: `ocx.lock` claims `generated_by = "ocx 0.5.6"` (lock v3) while `__OCX_PIN_VERSION` and `release.yml`'s `setup-ocx@v1` are both still `0.3.11` — per the handover's own §2, an old CLI cannot read a v3 lock, so `ocx_project()`'s first act (`lock --check`, :957-963) would fail against this exact combination.
5. **Naming/visibility mismatch**: `__ocx_self_update` is double-underscore-named (the file's own private-function convention) yet is the sole, documented, user-facing entry point in script mode (:1501-1506, `README.md:52-58`).
6. **`__ocx_default_hint` covers 4 of the ocx CLI's 14 documented sysexits** (per `rules_ocx/AGENTS.md`'s contemporary contract); `find_ocx` predates 75/79/80/81(generic)/82/83/84/85 entirely at the generic layer, with only two `81` cases hand-rolled per-call.
7. **5 of 10 test families never assert `-Werror=dev`** on their own `cmake` invocations (`bootstrap_off`, `floating_fatal`, `script_mode`, `memoize`, `self_update`) — inconsistent rigor across the suite for no stated reason.
8. **CI's `examples` matrix omits `frozen_index`** while the local `task verify`/`test:examples` gate includes it (`taskfile.yml:52` vs `.github/workflows/ci.yml:65-72`) — CI is weaker than the documented local gate.
9. **Two of five `file(DOWNLOAD)` calls have no `EXPECTED_HASH` and no `TLS_VERIFY`** (`:738` dist manifest, `:1434` `SHA256SUMS`) — the standard bootstrap chicken-and-egg gap, not unique to this project, but unremarked anywhere in the docs.
10. **`OCX_PULL`/`OCX_REFRESH` silently exempt from the documented "every `OCX_*` knob follows the snapshot pattern" claim** (:42-46) — minor, but a real doc/code gap a new contributor would trip on.

## Patterns worth encoding

These are measured properties of this codebase that a CMake-quality rule set could point to as positive exemplars, independent of whether `find_ocx` itself is the citation target (per the frame's "worked examples of a pattern, never the pattern" constraint):

- **Every `foreach()` uses `IN LISTS`/`IN ITEMS`/`RANGE`/`ZIP_LISTS`** — zero bare `foreach(x ${list})` sites, across 13 loops. A rule verification: `rg -n 'foreach\([a-zA-Z_]+ +\$\{' <path>` should return nothing.
- **Zero unquoted `${var}` inside `if()`/`elseif()`/`while()` comparisons**, across 240 `if(`-family sites — the classic semicolon-splitting pitfall is entirely absent. Verification: `rg -n '(if|elseif|while)\([^"]*\$\{[A-Za-z_0-9]+\}[^"]*(STREQUAL|MATCHES|EQUAL)' <path>` empty.
- **User-supplied values are always quoted when they land in a `COMMAND` list**, while genuine argv-list variables (`${platform_args}`, `${groups_args}`) are deliberately left unquoted because each element is meant to become a separate token — the two cases are visually distinguishable in this codebase by whether the variable holds a scalar (quoted) or a `list(APPEND)`-built argv fragment (unquoted).
- **A single `cmake_policy(PUSH)` / `VERSION <floor>` pin at include time**, balanced by one `POP`, so a module's own functions behave identically regardless of the includer's policy stack — modulo this file's own POP-placement bug ([Smells](#smells-ranked) #2), the *pattern* (pin at definition time, pop once) is correct and worth encoding even though this instance of it is buggy.
- **A positional-then-keyword argument shape via `list(POP_FRONT)` before `cmake_parse_arguments`** (`ocx_index`, :1326-1327) — an alternative to `PARSE_ARGV` for a function whose first argument selects a sub-operation and whose remaining arguments are `NAME`/value pairs.
- **A reproducible-first default with an explicit, single escape-hatch variable** (`OCX_ALLOW_FLOATING`) rather than a silent fallback to live resolution — the fail-closed default plus a one-line named override is a pattern worth generalizing beyond this project's package-tag resolution specifically.
- **Sha256-verified downloads paired with a `REMOVE_RECURSE` of the extraction scratch directory before *and* after extraction** (`ocx.cmake:775-776,788-789`) — avoids stale-file contamination across retries without needing a uniquely-named temp dir per attempt.
- **A `cmake_language(DEFER)`-based one-shot flag reset** (`OCX_REFRESH`, :641-643) — clears a cache-backed "do this once" flag automatically at the end of the top-level directory's processing, without requiring the user to remember to unset it.

## Contradictions of the frame

- **No `find_ocx`-specific hypothesis was handed to this audit** — `cmake-frame.md`'s "requester's hypothesis" section is about the CMake-and-package-manager research program broadly (Conan/vcpkg/Hunter/CPM as "the package managers that matter," Bazel interop as companion scope), not a claim about `find_ocx`'s own code quality. This audit therefore tested the two documents that *do* make specific, checkable claims about this codebase — `ocx.cmake`'s own header comments and `OCX-0.5-HANDOVER.md` — rather than a requester diagnosis that doesn't exist for this repo specifically.
- **`OCX-0.5-HANDOVER.md`'s implicit framing — that the dirty working tree *is* the 0.5.2 adoption — is only half true.** Half the diff (the `ocx.cmake` `PLATFORM`/`PINS` simplification) is unrelated to anything the handover describes; the half that *is* related has already moved past the handover's own stated target (`ocx.lock` says `generated_by = "ocx 0.5.6"`, not 0.5.2) while leaving the CLI pin (`0.3.11`) and the harness's own package references (`ocx.sh/cmake`, not `ocx.sh/kitware/cmake`) untouched. The handover reads as a plan that was **partially executed, then overtaken by a second, different plan**, not as an accurate description of what `git diff` currently shows.
- **The codebase's own header comment about policy scoping (:178) is factually wrong**, as measured directly against the file's own `cmake_policy(POP)` line number — a documentation claim contradicted by the same file's code, not by any external hypothesis.
- **A plausible prior — "a 1,500-line hand-maintained CMake module downloading and executing things will be full of quoting bugs" — does not hold here.** Zero unquoted-variable-in-comparison sites, zero bare `foreach`, consistent quoting of every user-supplied `COMMAND` argument (measured in [§4](#4-quoting-and-list-discipline)). If the broader CMake-quality rule set assumes copy-and-own modules are typically sloppy about CMake-language hygiene, this exemplar contradicts that assumption on the quoting axis specifically — the module's actual weaknesses are elsewhere (cache-write semantics, sysexit coverage, doc/code sync across two overlapping in-flight changes), not in basic CMake-language discipline.

## Gaps

- **The missing-`FORCE` memoization bug is a logic deduction from CMake's documented `set(...CACHE...)` semantics, not an executed repro** — the task rules forbid running `cmake` in this repository. A future pass with execute permission should configure `tests/fixtures/package` once, change `PACKAGE` to a different tag, reconfigure, and inspect `CMakeCache.txt` for `OCX_JQ_CONTENT` to confirm the staleness directly.
- **`rules_ocx`'s reproducibility/index-equivalent mechanism (if any) was not located** in the single AGENTS.md read for this audit — the [§12](#12-parity-with-rules_ocx) "reproducible-first" row is marked not-comparable rather than diverged; a full parity pass would need to read `rules_ocx/ocx/private/*.bzl` for an index/snapshot analog before asserting either way.
- **`Findocx.cmake`'s "works standalone on CMake 3.15+" claim is untested** by anything in this repository ([§3](#3-scoping-and-policy-posture), [§10](#10-tests-and-ci)) — confirming or refuting it needs a real CMake 3.15-3.18 binary, which `mirror-cmake`'s current floor (3.31) cannot provide (`CMakeLists.txt:22-24`).
- **This audit did not read `rules_ocx`'s `ocx/private/repo_utils.bzl` or `ocx/private/versions.bzl` beyond the two greps shown** — the task scoped `rules_ocx` as read-only background, not a second full audit target; a genuine BZL-vs-CMake parity rule would need that file read in full.
- **CPM.cmake, Conan 2, vcpkg, and Hunter/cpp-pm do not appear anywhere in `find_ocx`** — expected, since `find_ocx` is a tool provisioner (competing with Conan `tool_requires`/vcpkg host deps in that one narrow niche), not a C/C++ library dependency manager. This audit cannot speak to the frame's Conan/vcpkg/Hunter/CPM axes at all; those need the exemplar-corpus pass the frame separately scopes.
- **No attempt was made to verify the embedded `__OCX_DIST_JSON` snapshot's 8-target-per-version claim** (`scripts/update_dist.py`'s own `TARGETS_PER_VERSION = 8` docstring) against the live `setup.ocx.sh/dist.json` — that would require a network call this audit's read-only constraint excludes.
