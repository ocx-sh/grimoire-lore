---
title: What a CMake project owes rules_foreign_cc
topic: The Bazel seam and dual builds — the wrapped project's side of the contract
agent: wrappable-cmake-contract
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 19
scope: |
  What a CMake project must do (network, install layout, toolchain-file and
  PIC honouring, static/shared selection, parallelism, relocatability, version
  floor) to be safely wrapped by bazel-contrib/rules_foreign_cc's `cmake()`
  rule, re-measured at the 2026-09-26 exemplar-corpus SHA (`bb2f3e5d72`,
  tag 0.16.0). Does not restate rules_foreign_cc's own Bazel-side obligations
  (BZL-CC-22/-23/-24/-28 in `rules/bazel-quality/cpp.md`) — cited by ID only.
  Does not cover dual-build sync, dependency-graph drift or Conan's Bazel
  generators (M-K-03 through M-K-07: a separate dive,
  `dual-build-sync-and-conan-bazel`).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- rules_foreign_cc's `cmake()` rule blocks network for the whole configure+build+install action unless the target itself carries the `requires-network` tag (`execution_requirements["block-network"] = ""` when that tag is absent) — [framework.bzl:591](#sources), `bazel-contrib__rules_foreign_cc@bb2f3e5d72`.
- **Measured**: under `unshare -rn`, a plain `cmake --install`-only configure succeeds but a configure that calls `FetchContent_MakeAvailable(... GIT_REPOSITORY ...)` fails at the sub-build's `git clone` step during *configure*, on CMake 4.4.2 — proving the wrap's network ban catches configure-time fetches, not just build-time ones (measurement below).
- The rule's I/O contract is `lib_source` (a `glob(["**"])` filegroup, never curated) plus `out_static_libs`/`out_shared_libs`/`out_interface_libs`/`out_binaries`/`out_include_dir`/`out_lib_dir`/`out_bin_dir`/`out_data_dirs`/`out_data_files` — [cmake.bzl:366-419](#sources); this is BZL-CC-23's exact attribute set, cited there, not restated here.
- `install` defaults to `True` and `generate_crosstool_file` defaults to `True` — [cmake.bzl:406,395](#sources) — so a wrapped project gets a synthesized `CMAKE_TOOLCHAIN_FILE` unless it (or the caller) already sets one via `cache_entries`.
- The synthesized toolchain file sets `CMAKE_C_COMPILER`/`CMAKE_CXX_COMPILER`, `CMAKE_AR`/`CMAKE_RANLIB`, `CMAKE_SYSTEM_NAME`/`CMAKE_SYSTEM_PROCESSOR`, `CMAKE_*_ARCHIVE_CREATE`, and seeds flags through the `_INIT` cache variables (`CMAKE_C_FLAGS_INIT`, `CMAKE_CXX_FLAGS_INIT`, `CMAKE_EXE_LINKER_FLAGS_INIT`, etc.), never the plain `CMAKE_C_FLAGS` — [cmake_script.bzl:259-312](#sources) — a wrapped project's own `set(CMAKE_C_FLAGS ...)` therefore adds to, not replaces, what Bazel injects, because CMake seeds `CMAKE_<LANG>_FLAGS` from `_INIT` only on the *first* configure.
- **Measured**: a wrapped project's own `CMAKE_TOOLCHAIN_FILE` cache entry suppresses the synthesized crosstool file entirely — `no_toolchain_file = cache_entries.get("CMAKE_TOOLCHAIN_FILE") or not generate_crosstool_file` ([cmake.bzl:210](#sources)) — and, independently measured on 4.4.2, a project-supplied toolchain file's `set(CMAKE_C_COMPILER ...)` reaches the configure log unmodified.
- **Measured** (CMake 4.4.2, gcc 15.2.1): a static library with no PIC anywhere fails to link into a shared consumer with `relocation R_X86_64_32 against '.data' can not be used when making a shared object; recompile with -fPIC`; setting `CMAKE_POSITION_INDEPENDENT_CODE=ON` globally fixes it; injecting `-fPIC` via `CMAKE_C_FLAGS` alone (no `CMAKE_POSITION_INDEPENDENT_CODE` at all) also fixes it — the second path is what rules_foreign_cc actually uses.
- rules_foreign_cc 0.16.0 (2026-09-15) shipped `fix: honor --force_pic for shared library` ([PR #1440](#sources), merged 2025-11-06): it passes `use_pic = cc_toolchain_.needs_pic_for_dynamic_libraries(...)` into the compile-flags assembly (`cc_toolchain_util.bzl`), so PIC reaches the wrapped build as a compiler flag, not as a `CMAKE_POSITION_INDEPENDENT_CODE` cache entry. [Issue #421](#sources) (opened 2020-08-05) is **still open** on 2026-09-26 despite the fix landing — treat the fix as present at `bb2f3e5d72`/0.16.0, not as the issue being closed.
- [Issues #329](#sources) (parallel-build passthrough, open since 2019-10-18, 27 comments) and [#1129](#sources) (installed files from the source dir are only symlinked, open since 2023-12-11, 12 comments) are both **still open, no fix**, re-checked 2026-09-26.
- **Surprise, chased per brief**: the default bundled CMake at 0.16.0/`bb2f3e5d72` is **unchanged from wave 1**: prebuilt-binary table spans `3.19.8`–`4.0.7` ([cmake_versions.bzl:10-1067](#sources)) and both the WORKSPACE default (`DEFAULT_TOOL_VERSIONS["cmake"] = "3.31.12"`, [repositories.bzl:19](#sources)) and the bzlmod default (`tools.cmake(mode = "binary", version = "3.31.12")`, [MODULE.bazel:73-75](#sources)) still pick 3.31.12. The era-recheck's "version model has shifted" (hub-and-spoke registration, `cmake_source_spokes`) changed the *internal plumbing*, not the *numbers* — [built_toolchains.bzl](#sources) confirms the spoke mechanism but the table it reads still tops out at 4.0.7.
- Consequence of that ceiling: **CPS (`install(PACKAGE_INFO)`, stabilized at CMake 4.3.0) can never run under rules_foreign_cc's own bundled CMake provisioning** at 0.16.0 — every version in the binary/source-spoke table predates 4.1. A caller must supply a real CMake ≥4.3 through `native_tools_toolchains` or rely on `tools.cmake(mode = "system")` (which only wins on a host with no matching prebuilt platform) to ever reach it.
- CPS negative re-checked at the new SHA and current registries: `gh api /search/issues?q=repo:bazel-contrib/rules_foreign_cc+CPS` → `total_count: 0`; `gh api /search/issues?q=repo:bazelbuild/bazel-central-registry+CPS` → `total_count: 0`; `git grep -c -i PACKAGE_INFO` over the whole `bb2f3e5d72` tree → 0 hits — confirms [cps-verification.md row 51](#sources) still holds, unchanged from wave 1.
- `set_file_prefix_map` (default `False`, package-level default via `//foreign_cc/settings:set_file_prefix_map_default`) is what turns on `-ffile-prefix-map=$EXT_BUILD_ROOT=.` for a wrapped build's compiled outputs — [framework.bzl:60-64](#sources); it is opt-in, not automatic, matching the topic map's note that CMake itself has no `CMAKE_DEBUG_PREFIX_MAP` equivalent.
- 0.16.0 added `experimental_validate_outputs_in_action` (default `True`, [framework.bzl:159-161](#sources), via [PR #1517](#sources)): the foreign-build action now validates its own expected outputs *before it exits*, rather than silently omitting a Bazel output for a name nobody declared — new since wave 1's `f68b351c46` snapshot, and it directly firms up BZL-CC-23's output-side check.
- The bundled worked example itself wraps a toy library on `cmake_minimum_required(VERSION 2.8.4)` ([examples/cmake_crosstool/static/src/CMakeLists.txt](#sources)) — rules_foreign_cc's own docs are not a floor-practice exemplar; do not cite them for a version-floor claim.
- What ships back to `bazel-quality`: one pointer line at the top of its *Wrapped Foreign Builds* section — *"the wrapped project's side of this contract is `CMK-BZL` in `cmake-build/bazel-seam.md`"* — per [cmake-topic-map.md](#sources)'s Artifact set decision; no `BZL-CC` row is authored, renumbered or reworded by this program.

## Findings

### 1. The rule's attribute contract, measured against source

`bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/cmake.bzl` (checked out at `/home/mherwig/.cache/research-lang/exemplars/cmake/bazel-contrib__rules_foreign_cc`) defines `cmake = rule(...)` whose attrs merge `CC_EXTERNAL_RULE_ATTRIBUTES` (from `foreign_cc/private/framework.bzl:93-273`) with cmake-specific ones (`foreign_cc/cmake.bzl:360-421`):

| Attribute | Default | Source |
|---|---|---|
| `lib_source` | mandatory, `attr.label` | `framework.bzl:182-187` |
| `cache_entries` | `{}` | `cmake.bzl:366-373` |
| `generate_args` | `[]` | `cmake.bzl:384-393` |
| `generate_crosstool_file` | `True` | `cmake.bzl:395-405` |
| `install` | `True` | `cmake.bzl:406-409` |
| `install_args` | unset | `cmake.bzl:410-413` |
| `working_directory` | `""` | `cmake.bzl:414-419` |
| `out_static_libs`/`out_shared_libs`/`out_interface_libs`/`out_binaries` | unset (bare `lib_name.a` assumed if all four and `out_headers_only` are unset) | `framework.bzl:200-235` |
| `out_include_dir`/`out_lib_dir`/`out_bin_dir` | `"include"`/`"lib"`/`"bin"` | `framework.bzl:206-236` |
| `out_data_dirs`/`out_data_files` | unset | `framework.bzl:196-203` |
| `set_file_prefix_map` | `False` (inherits package default) | `framework.bzl:60-65` |
| `experimental_validate_outputs_in_action` | `True` | `framework.bzl:159-161` |

`working_directory` matters for a monorepo-shaped wrapped tree: `detect_root(ctx.attr.lib_source)` finds the label's root, and `working_directory` is appended to it before CMake ever runs (`cmake.bzl:200-204`) — a project whose top-level `CMakeLists.txt` is not at the filegroup's root must be paired with this attribute or the configure never finds it.

### 2. No network at configure or build — measured, not just read

`ctx.actions.run_shell`'s `execution_requirements` sets `block-network` unless the target's own `tags` already carry `requires-network` (`framework.bzl:589-591`):

```python
execution_requirements = {tag: "" for tag in ctx.attr.tags}
if "requires-network" not in execution_requirements:
    execution_requirements["block-network"] = ""
```

This is a Bazel *action* property (a sandbox network-namespace flag), not something the wrapped CMake project can see or opt out of from inside its own `CMakeLists.txt`. The whole configure+build+install runs as a single `run_shell` action, so a network reach at *any* point in that sequence — including a `FetchContent_MakeAvailable` sub-build kicked off during *configure* — fails the whole action.

**Measurement**, host CMake 4.4.2, gcc 15.2.1, scratch at `/home/mherwig/.cache/cmake-measure-scratch/bzl-wrap/` (sources copied to `.agents/research/cmake-bazel-seam/scratch/wrap-contract/`):

```sh
$ cat netprobe/CMakeLists.txt
cmake_minimum_required(VERSION 3.25)
project(netprobe NONE)
include(FetchContent)
FetchContent_Declare(dep GIT_REPOSITORY https://github.com/madler/zlib.git GIT_TAG v1.3.1)
FetchContent_MakeAvailable(dep)

$ unshare -rn ocx package exec kitware/cmake:4.4 -- cmake -S netprobe -B build-netprobe -G "Unix Makefiles"
  Failed to clone repository:
    'https://github.com/madler/zlib.git'
[...]
CMake Error at .../Modules/FetchContent.cmake:1933 (message):
  Build step for dep failed: 2
-- Configuring incomplete, errors occurred!
```

Empty/failing output here is the pass: it proves `unshare -rn` (the no-Bazel stand-in the brief specifies) reliably catches a configure-time network reach the same way `block-network` would inside the real rule, without needing Bazel installed at all. A benign configure with no network dependency, same toolchain-file setup, succeeds under the identical `unshare -rn` wrapper (below).

### 3. `CMAKE_TOOLCHAIN_FILE` honoured, and what the synthesized one contains

`no_toolchain_file = ctx.attr.cache_entries.get("CMAKE_TOOLCHAIN_FILE") or not ctx.attr.generate_crosstool_file` (`cmake.bzl:210`) — a caller-supplied `CMAKE_TOOLCHAIN_FILE` cache entry suppresses crosstool synthesis outright. When synthesis does run, `_create_crosstool_file_text` (`foreign_cc/private/cmake_script.bzl:285-345`) writes a `crosstool_bazel.cmake` and points `cache_entries["CMAKE_TOOLCHAIN_FILE"]` at `$BUILD_TMPDIR$/crosstool_bazel.cmake` (`cmake_script.bzl:312`). It sets, via two tables (`cmake_script.bzl:259-282`):

- `CC`/`CXX` env → `CMAKE_C_COMPILER`/`CMAKE_CXX_COMPILER` (replace)
- `CFLAGS`/`CXXFLAGS`/`ASMFLAGS` → `CMAKE_{C,CXX,ASM}_FLAGS_INIT` (**not** the plain `_FLAGS` variable — additive, seeded before `project()` runs)
- `CMAKE_AR`/`CMAKE_RANLIB` (replace), `CMAKE_SYSTEM_NAME`/`CMAKE_SYSTEM_PROCESSOR` (kept if already set)
- `CMAKE_{EXE,SHARED,MODULE,STATIC}_LINKER_FLAGS_INIT`, `CMAKE_{C,CXX}_ARCHIVE_CREATE`

**Measurement**, host CMake 4.4.2:

```sh
$ cat toolchain.cmake
set(CMAKE_C_COMPILER /usr/sbin/gcc)
set(CMAKE_SYSTEM_NAME Linux)

$ ocx package exec kitware/cmake:4.4 -- cmake -S src -B build2 -G "Unix Makefiles" \
    -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake -DCMAKE_INSTALL_PREFIX=prefix
-- WRAPTEST_C_COMPILER=/usr/sbin/gcc
-- Configuring done
```

The project's `message(STATUS "WRAPTEST_C_COMPILER=${CMAKE_C_COMPILER}")` echoed the toolchain-file value verbatim — a caller-supplied `CMAKE_TOOLCHAIN_FILE` reaches the wrapped project unmodified. Full source at `.agents/research/cmake-bazel-seam/scratch/wrap-contract/src/`.

### 4. Install layout, relocatability and the fresh-prefix diff

**Measurement**, host CMake 4.4.2, `install(EXPORT ...)` + `configure_package_config_file` (relocatable, `@PACKAGE_INIT@`):

```sh
$ cmake --install build2   # CMAKE_INSTALL_PREFIX=.../prefix-static
-- Installing: .../prefix-static/lib/libwraptest.a
-- Installing: .../prefix-static/include/widget.h
-- Installing: .../prefix-static/lib/cmake/wraptest/wraptestTargets.cmake
-- Installing: .../prefix-static/lib/cmake/wraptest/wraptestTargets-release.cmake
-- Installing: .../prefix-static/lib/cmake/wraptest/wraptestConfig.cmake

$ grep -rn "$SC" prefix-static/lib/cmake/wraptest/
(empty)
```

Empty grep = pass: no absolute scratch-tree path leaked into the installed `.cmake` files (`@PACKAGE_INIT@` + `PACKAGE_PREFIX_DIR` resolve relative to the config file's own install location, per `CMakePackageConfigHelpers`). The listing lands exactly under `lib/`, `include/`, `lib/cmake/wraptest/` — the shape `out_lib_dir`/`out_include_dir` expect by default. This is the "diff the wrapped build's own install-directory listing against the declared `out_*` names" check M-K-01's row specifies, done here without Bazel.

### 5. PIC: three measured configurations

**Measurement**, host CMake 4.4.2, gcc 15.2.1, a static archive (`libwraptest.a`, containing a global data table so the compiler must choose an absolute vs. GOT-relative relocation) linked into a shared consumer (`wraptest_consumer.so`):

| Configuration | Cache/flags | Result |
|---|---|---|
| (a) no PIC anywhere | (none) | **fails**: `ld: libwraptest.a(widget.c.o): relocation R_X86_64_32 against '.data' can not be used when making a shared object; recompile with -fPIC` |
| (b) global cache entry | `-DCMAKE_POSITION_INDEPENDENT_CODE=ON` | succeeds |
| (c) flags only, no PIC cache entry | `-DCMAKE_C_FLAGS=-fPIC` | succeeds |

Configuration (c) is the mechanism rules_foreign_cc actually uses since 0.16.0's PR #1440: PIC reaches the wrapped build as an injected compiler flag (via the `_INIT` seeding above, or directly appended to `generate_args`' `<FLAGS>` substitution in `get_flags_info`, `foreign_cc/private/cc_toolchain_util.bzl`), never by setting `CMAKE_POSITION_INDEPENDENT_CODE` in `cache_entries`. A wrapped project that hardcodes `set(CMAKE_POSITION_INDEPENDENT_CODE OFF)` (ignoring the flags CMake was handed) defeats this path; one that never touches the variable and simply respects whatever `CMAKE_C_FLAGS`/`CMAKE_C_FLAGS_INIT` it is given works correctly under both the pre- and post-0.16.0 rule.

Full scratch project (`CMakeLists.txt`, `widget.c`/`.h`, `consumer.c`, `toolchain.cmake`) is at `.agents/research/cmake-bazel-seam/scratch/wrap-contract/src/`.

### 6. The version ceiling — the chased surprise

`bazel-contrib__rules_foreign_cc@bb2f3e5d72` (tag `0.16.0`, released 2026-09-15) reworked toolchain *registration* into a hub-and-spoke model (`toolchains/built_toolchains.bzl` docstring: *"This is a thin shim over the per-tool spoke helpers"*; `toolchains/private/source_spokes.bzl:cmake_source_spokes`) but the **version data did not move**:

- `foreign_cc/repositories.bzl:18-24` — `DEFAULT_TOOL_VERSIONS = {"cmake": "3.31.12", ...}`, unchanged from wave 1's `f68b351c46` reading.
- `toolchains/private/cmake_versions.bzl` (a generated file, `"""@generated by toolchains/prebuilt_toolchains.py"""`) carries the prebuilt binary table for exactly `3.19.8, 3.20.6, 3.21.7, 3.22.6, 3.23.5, 3.24.4, 3.25.3, 3.26.6, 3.27.9, 3.28.6, 3.29.9, 3.30.9, 3.31.12, 4.0.7` — 14 entries, ceiling `4.0.7`.
- `MODULE.bazel:73-77` (bzlmod path) — `tools.cmake(mode = "binary", version = "3.31.12")` then `tools.cmake(mode = "system")` as an unconstrained fallback that only wins on a host with no matching prebuilt platform (five platforms covered; comment at `MODULE.bazel:65-72` spells out the lex-sort mechanics).

CMake 4.3.0 (2026-03-17) stabilized `install(PACKAGE_INFO)`/CPS (per this program's frame and `cps-verification.md`). Every version rules_foreign_cc's own binary/source-spoke provisioning can hand a wrapped project — at 0.16.0, still — predates 4.1, let alone 4.3. **A CPS-emitting `install(PACKAGE_INFO)` call inside a rules_foreign_cc-wrapped CMake project is dead code under the rule's own default and even its explicit `cmake_version=` override table**, unless the caller bypasses provisioning entirely with `native_tools_toolchains` pointed at an external CMake ≥4.3, or relies on `mode = "system"` finding one on a platform the binary table doesn't cover. This is the surprise the brief asked to chase, and it is a structural ceiling, not a version lag that the next `rules_foreign_cc` release is likely to lift on its own (the table is generated from pinned upstream CMake release archives, one per minor series, not "always latest").

### 7. Parallelism and symlinked installs: two long-open issues, re-confirmed

[Issue #329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) ("Parallel build support", opened 2019-10-18, 27 comments, **state: open** as of 2026-09-26): rules_foreign_cc does not translate Bazel's `--jobs`/local-resource settings into `-j<N>` for the wrapped build; a caller who wants parallelism must pass it explicitly through `build_args` (e.g. `["-j", "4"]`), and doing so risks oversubscription against Bazel's own scheduler since the wrapped build's job count is then static, not resource-aware. No fix landed in 0.16.0.

[Issue #1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) ("cmake: file installed from the source directory are only symlinked", opened 2023-12-11, 12 comments, **state: open**): when a project's `install(FILES ...)` (or an underlying build step) leaves a symlink rather than a real file in the install tree, Bazel's `TreeArtifact` validation rejects it (*"Failed to resolve relative path hello.h inside TreeArtifact ... The associated file is either missing or is an invalid symlink"*). A wrapped project must ensure its `install()` step copies, not symlinks, every artifact under `CMAKE_INSTALL_PREFIX` — this is usually automatic for `install(FILES/TARGETS)` but is a known trap for a project that hand-rolls its install step with a custom `install(CODE ...)` using `create_symlink`.

## Normative guidance candidates

1. **CMK-BZL-01 (MUST).** A CMake project meant to be wrapped by `rules_foreign_cc`'s `cmake()` must reach zero network during configure or build — no `FetchContent_MakeAvailable`, `file(DOWNLOAD)`, configure-time `ExternalProject_Add`, `CPMAddPackage`, `HunterGate` call, or dependency-provider fetch (`cmake_language(SET_DEPENDENCY_PROVIDER)`) that isn't declared and switched off for the wrapped build. *Rationale*: the whole configure+build+install runs as one Bazel action with `block-network` set by default (`framework.bzl:591`); a network reach anywhere in that sequence fails the entire action, not just the network-dependent step. *Verify*: `grep -rn -e 'FetchContent_MakeAvailable' -e 'file(DOWNLOAD' -e 'ExternalProject_Add' -e 'CPMAddPackage' -e 'HunterGate' --include='*.cmake' --include='CMakeLists.txt' -r .` (union of alternatives; a hit needs manual triage for whether it is guarded off), then reproduce Finding 2's `unshare -rn cmake -S . -B build -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake` against the project's own source — empty grep and a successful configure = pass, a network-fetch error during that configure = the finding. *Version floor*: none — behavior of `FetchContent`/`file(DOWNLOAD)` predates every floor this program considered.
2. **CMK-BZL-02 (MUST).** Every artifact the wrapped project's `install()` produces must land at a name-stable path directly reachable from `CMAKE_INSTALL_PREFIX` under the project's `out_lib_dir`/`out_include_dir`/`out_bin_dir` subdirectory (defaults `lib`/`include`/`bin`), matching the names the `cmake()` call declares in `out_static_libs`/`out_shared_libs`/`out_interface_libs`/`out_binaries`/`out_data_files`/`out_data_dirs` exactly — a produced-but-undeclared file is silently never a Bazel output (BZL-CC-23). *Rationale*: CMake decides these paths at configure time; a caller cannot introspect them without running the build. *Verify*: run the project's real configure+build+install to a fresh prefix (e.g. `PREFIX=$PWD/fresh-prefix`, then `find "$PREFIX" -type f | sort`) and diff that listing against the `out_*` attribute values a `BUILD.bazel`/`.bzl` wrapping it declares (or, absent a Bazel wrapping, against the names a rule author would need to write) — an identical listing is the pass; a file present in the listing but absent from the declared set, or vice versa, is the finding.
3. **CMK-BZL-03 (MUST).** `install()` destinations must be relative to `CMAKE_INSTALL_PREFIX` (via `GNUInstallDirs` or equivalent) and honour a caller-supplied value — never a project-hardcoded absolute prefix. *Rationale*: `cmake()` always builds to a Bazel-managed sandbox path and installs to a Bazel-managed output tree; a project that ignores `CMAKE_INSTALL_PREFIX` installs into its own source or build tree, which the wrapping rule never declares as an output. *Verify*: `grep -rn -e 'CMAKE_INSTALL_PREFIX' --include='CMakeLists.txt' -r .` — a project with `install()` calls but zero mentions of `CMAKE_INSTALL_PREFIX` (direct or via `GNUInstallDirs`, which reads it internally) is the finding; confirm with a fresh-prefix install (CMK-BZL-02's measurement) landing under that prefix and nowhere else.
4. **CMK-BZL-04 (MUST).** A wrapped project must honour a caller-supplied `CMAKE_TOOLCHAIN_FILE` — never overwrite it with `FORCE`, never conditionally ignore it based on a project-specific option. *Rationale*: `no_toolchain_file = cache_entries.get("CMAKE_TOOLCHAIN_FILE") or not generate_crosstool_file` (`cmake.bzl:210`) means a caller-supplied toolchain file suppresses crosstool synthesis entirely; if the project's own `CMakeLists.txt` then clobbers `CMAKE_C_COMPILER`/`CMAKE_SYSTEM_NAME` after `project()`, the caller's toolchain intent is lost. *Verify*: `grep -rn 'CACHE.*FORCE' --include='CMakeLists.txt' -r . | grep -i -e COMPILER -e TOOLCHAIN` — a hit inside the wrapped project (not its top-level example/test harness) is the finding; empty = pass.
5. **CMK-BZL-05 (SHOULD).** A static library the wrapped project builds must accept PIC through compiler flags (`CMAKE_C_FLAGS`/`CMAKE_CXX_FLAGS` seeded via `_INIT`, or an explicit `-fPIC` in `generate_args`) rather than requiring `CMAKE_POSITION_INDEPENDENT_CODE=ON` as a `cache_entries` key — rules_foreign_cc's own `--force_pic` fix (0.16.0, [PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440)) delivers PIC as a flag, not a cache entry. *Rationale*: measured — configuration (c) above shows `-fPIC` via `CMAKE_C_FLAGS` alone links successfully with no `CMAKE_POSITION_INDEPENDENT_CODE` set at all; a project that hardcodes `set(CMAKE_POSITION_INDEPENDENT_CODE OFF)` unconditionally defeats this delivery path regardless of what flags Bazel injects. *Verify*: `grep -rn 'CMAKE_POSITION_INDEPENDENT_CODE' --include='CMakeLists.txt' -r .` — empty, or a hit only under a caller-visible option, is the pass; a hit that hardcodes `OFF` unconditionally is the finding; then reproduce configurations (a)–(c) above against the project's own static target as the wrap-simulation proof. *Version floor*: none (the variable predates CMake 3.0).
6. **CMK-BZL-06 (MUST).** Static-vs-shared selection must be driven by `BUILD_SHARED_LIBS` (settable via `cache_entries`), never hardcoded `STATIC`/`SHARED` on the library target the rule is meant to wrap. *Rationale*: `cache_entries` is the only channel `cmake()` has to influence the project's build shape; a hardcoded type makes `out_static_libs` vs `out_shared_libs` a guess the rule author must hand-verify by reading the project's `CMakeLists.txt` rather than by reading the rule's own attributes. *Verify*: `grep -rn 'add_library(' --include='CMakeLists.txt' -r . | grep -e ' STATIC' -e ' SHARED'` on the specific target(s) the wrap targets — empty = pass; a hit is the finding unless the hardcoded type is deliberate and stated in the wrapping `BUILD.bazel`'s `out_*` choice.
7. **CMK-BZL-07 (SHOULD).** The wrapped project's build step must be safe under an externally supplied `-j<N>` (via `build_args`), since rules_foreign_cc does not translate Bazel's own parallelism into the wrapped build automatically ([issue #329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329), open since 2019, unresolved at 0.16.0). *Rationale*: without an explicit `-j`, the wrapped build runs serially inside its one Bazel action, wasting the action's allotted CPUs; with one hardcoded too high, it competes with Bazel's own scheduler for cores the action didn't request. *Verify*: reading heuristic — does the wrapping `cmake()` call's `build_args` include an explicit, bounded `-j` (not `-j` unbounded)? Absent `build_args`, the wrapped build is single-threaded regardless of `--jobs`; this is a design note, not a grep, since the number cannot be derived from the CMake side alone.
8. **CMK-BZL-08 (MUST).** No installed `Config.cmake`/`.pc`/similar file may embed an absolute build-tree or sandbox path. *Rationale*: `cmake()` builds and installs inside a Bazel sandbox path that does not exist once the sandbox is torn down; an absolute-path leak breaks the consumer the moment Bazel reuses or discards that sandbox directory. *Verify*: after a fresh-prefix install (CMK-BZL-02, `PREFIX=$PWD/fresh-prefix`), `grep -rn "$PWD" "$PREFIX"` where `$PWD` is the scratch build directory's own absolute path — empty = pass, matching the measurement in Finding 4; a hit means the build tree's own path leaked into an installed file.
9. **CMK-BZL-09 (SHOULD, dated to 0.16.0).** Do not design a wrapped project's package metadata around CPS (`install(PACKAGE_INFO)`, CMake ≥4.3) as the path a Bazel consumer will read — rules_foreign_cc's own bundled CMake provisioning tops out at `4.0.7` ([cmake_versions.bzl](#sources), `bb2f3e5d72`), so the feature cannot run under the rule's default or documented `cmake_version=` overrides. *Rationale*: measured from source, Finding 6; re-confirmed zero adopters (CPS negative below). *Verify*: reading heuristic on the specific `rules_foreign_cc` version pinned in the consuming `MODULE.bazel`/`WORKSPACE` — is the requested `cmake_version` ≤ the table's ceiling for that release? If so, CPS-only install logic gated behind `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO`/stable 4.3 semantics never executes in the wrap; author CMake-script package files (`Config.cmake`) as the wrap-visible path regardless of whether the project also emits CPS for non-wrapped consumers.
10. **CMK-BZL-10 (CONSIDER, cross-reference only).** Do not point a wrapped-build IDE/tooling story at the CMake project's own `CMAKE_EXPORT_COMPILE_COMMANDS`; under Bazel, `compile_commands.json` for the whole workspace (including targets that merely *consume* the wrapped library) is `BZL-CC-28`'s aquery-based generator's job, not the wrapped CMake build's. *Rationale*: the wrapped build's own compile database describes only the foreign build's internal compilation, run inside a sandbox path that stops existing; it is not the artifact a Bazel-side clangd setup should read. *Verify*: cited by ID — `BZL-CC-28` in `rules/bazel-quality/cpp.md`, never restated.

## Exemplar evidence

- `bazel-contrib__rules_foreign_cc@bb2f3e5d72:examples/cmake_crosstool/static/BUILD.bazel` and `:examples/cmake_crosstool/static/src/CMakeLists.txt` — the canonical `cmake()` usage example: `lib_source = ":srcs"` where `srcs = glob(["**"])` (satisfies CMK-BZL and BZL-CC-23's input-side requirement); `out_include_dir = "include/version123"` matched exactly by the wrapped project's `install(FILES hello.h DESTINATION include/version123)`. The wrapped `CMakeLists.txt` itself declares `cmake_minimum_required(VERSION 2.8.4)` — not a version-floor exemplar, a toy fixture only; do not cite it for CMK-BZL-09 or any floor claim.
- `bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/private/cmake_script.bzl:259-282` — the crosstool synthesis tables are the ground truth for CMK-BZL-04 and CMK-BZL-05; no exemplar CMake project in the 46-repo corpus is itself built *through* this rule (the corpus measures what a CMake project looks like, not what wraps it), so this dive's evidence is source-code and measurement, not corpus adoption counts — consistent with the topic map's framing of `M-K-01`/`M-K-02` as `measure`-flavoured rows even inside an otherwise `exemplar` dive.
- `/home/mherwig/dev/find_ocx` (read-only, `ocx-sh__find_ocx@ac2a759cd0` in the frozen corpus copy): no `rules_foreign_cc` usage found — `find_ocx` is a pure-CMake tool-provisioning module with no Bazel wrapping of its own, so it neither satisfies nor violates any CMK-BZL row; it is out of scope for this dive beyond the floor precedent the frame already recorded (3.19 floor, `PROJECT_IS_TOP_LEVEL` shim).
- CPS negative, re-verified at the current SHAs (Finding 6 / Summary): `bazel-contrib/rules_foreign_cc` and `bazelbuild/bazel-central-registry` both return `total_count: 0` for a `CPS` issue search, and `git grep -c -i PACKAGE_INFO` over the whole `bb2f3e5d72` tree returns 0 — extends `cps-verification.md` row 51's `0 and 0` (checked 2026-09-05 at `f68b351c46`) unchanged to the 2026-09-26 SHA and tag 0.16.0.

## AI-agent angle

1. **Assuming rules_foreign_cc delivers PIC via a CMake cache entry.** An agent asked "why does my rules_foreign_cc-wrapped static lib fail to link into a .so" will often suggest adding `set(CMAKE_POSITION_INDEPENDENT_CODE ON)` to the wrapped `CMakeLists.txt`. That is a reasonable CMake-only answer but misdescribes the mechanism: since 0.16.0 the rule injects `-fPIC` as a compiler flag (`cc_toolchain_util.bzl`'s `use_pic`), not as a cache entry, so the actual defect is more often a project that hardcodes `CMAKE_POSITION_INDEPENDENT_CODE OFF` and thereby *ignores* the injected flags. *Check*: `grep -n 'CMAKE_POSITION_INDEPENDENT_CODE' CMakeLists.txt` — a hardcoded `OFF` is the tell, not an absent `ON`.
2. **Believing `-j`/parallelism just works because Bazel is parallel.** [Issue #329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) has been open since 2019 with no fix; an agent that assumes Bazel's `--jobs` reaches the wrapped `make`/`ninja` invocation will under-diagnose a slow wrapped build. *Check*: read the `build_args` attribute on the `cmake()` call — no explicit `-j` means the wrapped build is single-threaded regardless of the outer `--jobs`.
3. **Treating CPS as reachable through a rules_foreign_cc wrap because "CMake 4.3+ supports it."** The rule's *own* bundled CMake never reaches 4.1, let alone 4.3, in its default or documented-override paths (Finding 6). An agent trained mostly on pre-2026 material may not know CPS exists at all; one that does know may wrongly assume any CMake ≥4.3 feature is available the moment the *host* has CMake 4.4 installed, missing that `rules_foreign_cc` provisions its *own* CMake independent of the host's. *Check*: read the pinned `rules_foreign_cc` version's `toolchains/private/cmake_versions.bzl` (or the WORKSPACE `cmake_version=`/bzlmod `tools.cmake(version=...)` argument) for the actual ceiling, never assume it tracks upstream CMake's latest.
4. **Citing `-Werror=dev` as the wrapped configure's warnings gate.** Per this program's frame ([cmake-frame.md](#sources) correction 1), CMake 4.4 replaced `-Wdev`/`-Werror=dev` with a categorized `cmake-diagnostics(7)` system (`-Werror=author` etc.); an agent adding a warnings-as-errors check to a wrap-simulation script on a 4.4.x binary should name the current spelling, with the ≤4.3 form as an explicit fallback, not the reverse.
5. **Confusing the WORKSPACE and bzlmod version-override syntaxes.** `rules_foreign_cc_dependencies(cmake_version = "X")` (WORKSPACE, `repositories.bzl:29`) and `tools.cmake(mode = "binary", version = "X")` (bzlmod module extension tag, `MODULE.bazel:73-75`) are not interchangeable spellings of the same call; an agent that hallucinates one syntax under the other build system produces a `MODULE.bazel`/`WORKSPACE.bazel` that silently falls back to the rule's own default (3.31.12) instead of the version the person asked for. *Check*: read which of `WORKSPACE.bazel`/`MODULE.bazel` (or both, mid-migration) the target repo uses before writing either call.
6. **Assuming a symlinked install artifact is harmless because plain CMake handles it fine.** `install(FILES ...)` that leaves (or a custom `install(CODE ...)` that creates) a symlink works under a normal `cmake --install`, but fails Bazel's `TreeArtifact` validation inside a `cmake()`-wrapped build ([issue #1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129), still open). An agent debugging "file is either missing or is an invalid symlink" under Bazel should suspect the *install step*, not a missing source file — the CMake-only reproduction (`cmake --install build --prefix "$PWD/fresh-prefix"`, then `find "$PWD/fresh-prefix" -type l`) catches it without Bazel.

## Contested / evolving

- **The version-provisioning mechanism, not the numbers, is mid-migration.** 0.16.0 (2026-09-15) introduced the hub-and-spoke registration model the era-recheck flagged; the actual default/ceiling (`3.31.12`/`4.0.7`) held steady through this rewrite (Finding 6), but the mechanism change signals more tool-version churn is likely in the *next* release once the new spoke infrastructure is exercised further — re-check `toolchains/private/cmake_versions.bzl` at whatever SHA a future dive reads, don't assume this dive's table is permanent.
- **The `--force_pic` fix is landed but the tracking issue is not closed.** [PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440) merged 2025-11-06 and shipped in 0.16.0; [issue #421](https://github.com/bazel-contrib/rules_foreign_cc/issues/421) remains open as of 2026-09-26. Treat "fixed at 0.16.0" as the measured, load-bearing fact (Finding 5) and the open issue as a maintainers'-bookkeeping lag, not evidence the fix is incomplete — no comment on the issue since the PR merged contradicts the fix.
- **Parallel-build passthrough is a stable non-fix, not a pending one.** [Issue #329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) is seven years old with 27 comments and no maintainer commitment to a design; write CMK-BZL-07 as a permanent caller responsibility, not as "watch for a fix."
- **The bundled-example floor (CMake 2.8.4) versus a modern wrapped project's real floor.** rules_foreign_cc's own docs never updated their worked example past a 2.8-era toy library; this dive's normative rows assume a realistic wrapped-project floor (whatever `cmake-build`'s own assumed-floor decision lands on, 3.25 per `cmake-topic-map.md`'s Conflicts-resolved #1), not the example's floor.

## Sources

| URL / measurement | What it is | Date / era | Why worth reading |
|---|---|---|---|
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/cmake.bzl` (exemplar corpus, `/home/mherwig/.cache/research-lang/exemplars/cmake/bazel-contrib__rules_foreign_cc`) | `cmake()` rule definition and attrs | corpus SHA dated 2026-09-23 | Primary: the rule's whole attribute contract (`lib_source`, `cache_entries`, `generate_args`, `install`, `working_directory`) |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/private/framework.bzl` | Shared attrs (`out_*`, `set_file_prefix_map`, `experimental_validate_outputs_in_action`) and the `block-network` execution requirement | 2026-09-23 | Primary: network-block mechanism, output-declaration attrs, PIC-adjacent settings |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/private/cmake_script.bzl` | Synthesized-crosstool-file generator | 2026-09-23 | Primary: exact variables the synthesized `CMAKE_TOOLCHAIN_FILE` sets, and when synthesis is suppressed |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:foreign_cc/repositories.bzl` | `DEFAULT_TOOL_VERSIONS`, WORKSPACE entry point | 2026-09-23 | Primary: WORKSPACE-path CMake default (3.31.12) |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:toolchains/private/cmake_versions.bzl` | Generated prebuilt-CMake version table | 2026-09-23 | Primary: the 3.19.8–4.0.7 ceiling, unchanged from wave 1 |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:MODULE.bazel` and `toolchains/built_toolchains.bzl` | bzlmod default tags; hub-and-spoke rewrite | 2026-09-23 | Primary: confirms the bzlmod path's default (3.31.12) despite the registration-mechanism rewrite the era-recheck flagged |
| `bazel-contrib__rules_foreign_cc@bb2f3e5d72:examples/cmake_crosstool/static/{BUILD.bazel,src/CMakeLists.txt}` | Canonical wrapping example | 2026-09-23 | Exemplar: `lib_source`/`out_include_dir` matched against the wrapped project's own `install()` |
| Measurement: PIC 3-way (no-PIC fails / `CMAKE_POSITION_INDEPENDENT_CODE=ON` / `-fPIC` via `CMAKE_C_FLAGS`) | `cmake --build`/`ld` output, CMake 4.4.2, gcc 15.2.1, `/home/mherwig/.cache/cmake-measure-scratch/bzl-wrap/` | 2026-09-26 | Primary: grounds Finding 5 / CMK-BZL-05 |
| Measurement: `CMAKE_TOOLCHAIN_FILE` honoured | `cmake` configure log, CMake 4.4.2 | 2026-09-26 | Primary: grounds Finding 3 / CMK-BZL-04 |
| Measurement: `FetchContent` under `unshare -rn` fails at configure time | `cmake` configure log, CMake 4.4.2 | 2026-09-26 | Primary: grounds Finding 2 / CMK-BZL-01, the Bazel-free wrap simulation the brief specifies |
| Measurement: install listing + relocation grep | `cmake --install` output + `grep`, CMake 4.4.2 | 2026-09-26 | Primary: grounds Finding 4 / CMK-BZL-02, -03, -08 |
| [GitHub issue #329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) | "Parallel build support", open | opened 2019-10-18, re-checked 2026-09-26 | Primary (issue-tracker state fetched live): grounds CMK-BZL-07 |
| [GitHub issue #1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) | "cmake: file installed from the source directory are only symlinked", open | opened 2023-12-11, re-checked 2026-09-26 | Primary: grounds Finding 7 / AI-agent angle #6 |
| [GitHub issue #421](https://github.com/bazel-contrib/rules_foreign_cc/issues/421) and [PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440) | "doesn't add -fPIC when --force_pic is specified"; the fix PR and its diff | issue opened 2020-08-05; PR merged 2025-11-06; both re-checked 2026-09-26 | Primary: grounds Finding 5 / CMK-BZL-05, and the "fixed but issue still open" contested note |
| [GitHub Releases API, `bazel-contrib/rules_foreign_cc` `/releases/latest`](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases/latest) | Current release, 0.16.0 | published 2026-09-15, fetched 2026-09-26 | Primary: confirms the tag this dive reads against, and the changelog line for PR #1440's landing |
| [GitHub Search API, `CPS` issues over `bazel-contrib/rules_foreign_cc` and `bazelbuild/bazel-central-registry`](https://api.github.com/search/issues) | Re-check of the CPS-in-Bazel negative | fetched 2026-09-26 | Primary: extends `cps-verification.md` row 51 to the new SHA/tag, `0` and `0` |
| `.agents/research/cmake-dependency-seam/cps-verification.md` (row 51) | Opus-verified CPS claim ledger | verified 2026-09-05/06 | Codified: original CPS-in-Bazel negative this dive re-checks |
| `.agents/research/cmake-topic-map/era-recheck-2026-09-26.md` | Three-week freshness re-check | 2026-09-26 | Codified: flagged the rules_foreign_cc version-model change this dive resolves down to "mechanism only" |
| `.agents/research/cmake-topic-map.md` (Conflicts resolved, Artifact set decision) | Wave-2 topic map | 2026-09-26 | Codified: binds this dive's scope, the CMK-BZL family, and the exact pointer line owed back to `bazel-quality` |
| `rules/bazel-quality/cpp.md` §Wrapped Foreign Builds, §The Local Developer Surface | BZL-CC-22/-23/-24/-28 | measured 2026-09-06 against Bazel 8.7.0/8.8.0/9.2.0 | Codified: the Bazel-side half of the contract this dive cites by ID and never restates |
