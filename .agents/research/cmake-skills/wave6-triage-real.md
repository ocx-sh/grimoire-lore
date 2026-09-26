---
title: "Wave 6 — cmake-dependency-triage, third real round: a bundled copy, CPM, and a cross build"
date: 2026-09-26
model: opus
skill: skills/cmake-dependency-triage (SKILL.md 499 lines and references/reading-the-answers.md, as of wave 5 applied)
measured_on: >-
  cmake 3.31.12, 4.3.4, 4.4.2 via ocx package exec kitware/cmake:<tag>
  (also printed once: 4.0.7, 4.1.6, 4.2.7); ninja 1.13.2; gcc 15.2.1 (host C);
  zig 0.16.0-dev.2670+56253d9e3 as C++ (zig-cxx-wrapper.sh, CMake identifies Clang 21.1.0)
  and as the aarch64 cross C compiler (zig cc -target aarch64-linux-gnu, plus zig ar and zig ranlib)
packages:
  spdlog: 1.17.0 (gabime/spdlog 79524ddd08a4ec981b7fea76afd08ee05f83755d), bundles fmt 12.1.0 (FMT_VERSION 120100)
  fmt: 11.1.4 (fmtlib/fmt 123913715afeb8a437e6388b4473fcc4753e1c9a, installed), 12.1.0 (407c905e45ad75fc29bf0f9bb7c5c2fd3475976f, installed), 12.0.0 and 12.1.0 fetched by CPM from github tags
  CPM.cmake: 0.43.2 release asset, sha256 49a3bef91ceb65bb66d57255e12d1ffd22abc2f6408fa9fe4534c544a2f232aa (source tag 01678cfe175eab53143640429fdaa57c3c621cc6)
  expat: 2.8.5 (libexpat/libexpat R_2_8_5, 4b3f0b06f39fb5529cead381694f8929901bc273) cross-built into an aarch64 Debian-multiarch sysroot; 2.7.3 (R_2_7_3, 4575e52f83e0d6d7bd24939eab8952bbc7bc358f) host build
host_workaround: >-
  fmt 11.1.4 (and 11.2.0) fail to compile under zig's libc++ ("use of undeclared identifier 'free'" in format.h).
  The fmt 11.1.4 install used -DCMAKE_CXX_FLAGS='-include cstdlib', and scenario A's two sources start with
  #include <cstdlib>. Unrelated to any finding.
scratch: /home/mherwig/.cache/cmake-measure-scratch/w6/triage/ ($S). run.sh reproduces every number below; run.out is its last full output (exit 0). Build trees are kept and re-used with --fresh, because rm -rf is refused by the session's permission policy.
---

# Wave 6 — cmake-dependency-triage on three mechanisms no round has tried

Earlier rounds covered two cJSON copies and Chipmunk2D (wave 4), jsoncpp and
tinyformat (wave 5 modernize), and the vcpkg and Conan scenarios (wave 5
triage). This round builds three new mechanisms from real packages, then plays
the user: start from the symptom, run the skill from "Before you start", and
record each step.

| Scenario | Symptom the user reports | Worked | Misled | Stalled | Wrong |
|---|---|---|---|---|---|
| A spdlog's bundled fmt beside an installed fmt | A1: link fails with `undefined symbol ... fmt::v11::` and "did you mean ... fmt::v12::". A2: links fmt 11.1.4, prints `FMT_VERSION 120100` | 4 | 1 | 2 | 0 |
| B1 CPM package lock | Bumped `CPMAddPackage` to `fmt#12.1.0`, the binary prints 120000 | 4 | 1 | 1 | 2 |
| B2 `CPM_USE_LOCAL_PACKAGES` | CMakeLists pins `fmt#12.0.0`, CI prints 120000, the dev tree prints 120100 after the variable was unset | 3 | 2 | 1 | 1 |
| B3 shared `CPM_SOURCE_CACHE` | A brand-new tree builds a fmt that behaves unlike CI's with identical pins | 2 | 0 | 3 | 0 |
| **B total** | | **9** | **3** | **5** | **3** |
| C cross build, zig cc aarch64, `CMAKE_SYSROOT` | `ld.lld: error: .../libexpat.so... is incompatible with aarch64linux` | 4 | 2 | 1 | 2 |

No scenario reached the stop condition from the skill's text alone. Each reached
it with the reads given under "Fixes". Every symptom configures with exit 0 under
the per-line gate on 3.31.12, 4.3.4 and 4.4.2 (B2 and B3 were run on 4.4.2, and
B3 also on 3.31.12). None prints a warning the gate promotes: CPM's two warnings
are plain `message(WARNING)`.

Commands run from the scenario directory with `env.sh` sourced (`use331`,
`use43` and `use44` put that CMake first on `PATH` and set `GATE`). `A_PP` is
`-DCMAKE_PREFIX_PATH=$S/pfx/fmt-11.1.4;$S/pfx/spdlog-1.17.0-bundled`.

## Scenario A: two fmt copies in one link

**Fixture** (`A/app`, `A/app2`): `find_package(fmt 11 CONFIG REQUIRED)`,
`find_package(spdlog 1.17 CONFIG REQUIRED)`, one executable linking `fmt::fmt`
and `spdlog::spdlog`. spdlog 1.17.0 is installed with its default
`SPDLOG_FMT_EXTERNAL=OFF`, so `include/spdlog/fmt/bundled/` holds fmt 12.1.0 and
`libspdlog.a` compiles it in. fmt 11.1.4 is installed separately. `app` includes
`<fmt/format.h>` before `<spdlog/spdlog.h>`, `app2` the other way round. Both
copies use the include guards `FMT_BASE_H_` and `FMT_FORMAT_H_`, so the first
include wins per source file.

**Symptom**, identical on 3.31.12, 4.3.4 and 4.4.2 (configure exit 0 each):

- A1 (`app`): build exit 1, `ld.lld: error: undefined symbol: spdlog::details::log_msg::log_msg(spdlog::source_loc, fmt::v11::basic_string_view<char>, ...)` then `>>> did you mean: ...(spdlog::source_loc, fmt::v12::basic_string_view<char>, ...)`.
- A2 (`app2`): build exit 0, run exit 0, `main.cpp sees FMT_VERSION 120100`. `nm -C b44/app` holds 242 `fmt::v12::` symbols and 0 `fmt::v11::`, although `libfmt.a` 11.1.4 is on the link line (`build.ninja`).

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| A-a | Before you start | `cmake --version` picks `GATE` | `cmake --version` | 4.4.2 → `-Werror=author`. 3.31.12 and 4.3.4 → `-Werror=dev` | worked |
| A-b | Pick the entry point | The description's "a binary links or loads a different copy than the one configured" matches both symptoms. The only row about another copy in a binary is T11 (loader). No row names a link error except T4, whose error is a configure-time "link interface ... not found" | Took T11 for A2. A1 has no row | none | misled |
| A-c | Read order, step 1 | Grep the cache | Ran verbatim, `NAME=fmt`, on `app2/b44` | Exit 0: `CMAKE_PREFIX_PATH:UNINITIALIZED=.../fmt-11.1.4;.../spdlog-1.17.0-bundled`, `fmt_DIR:PATH=.../fmt-11.1.4/lib64/cmake/fmt`. Last row: "the configured copy is right", which is true for the copy that `find_package` saw | worked |
| A-d | Read order, step 2 | `--fresh --debug-find-pkg` | `cmake -S . -B b44 --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=fmt -DCMAKE_BUILD_TYPE=Release "$A_PP"` | Exit 0. `The file was found at` `.../fmt-11.1.4/lib64/cmake/fmt/fmt-config.cmake` | worked |
| A-e | Read order, step 3 | Count, then the name/path/mode/version grep | Both verbatim on 4.4.2 | Count 2. `fmt` request `11`, found `11.1.4`. `spdlog` request `1.17`, found `1.17.0`. Nothing names the bundled fmt 12.1.0, and nothing is expected to: it never passes through `find_package` | worked |
| A-f | T11 | `ldd` and `readelf -d`: "The `ldd` line naming the library is the copy that loads" | `ldd b44/app`, `readelf -d b44/app` | Exit 0. `ldd` lists only `linux-vdso`, `libc.so.6` and `ld-linux-x86-64.so.2`. `NEEDED` lists `libc.so.6` and `ld-linux-x86-64.so.2`, no `RUNPATH`. There is no line naming fmt, and T11 says nothing about a static archive. A1 has no binary at all | stalled |
| A-g | Stop condition | Copy, mechanism, rule | none left | The skill cannot name the second copy (`spdlog/fmt/bundled`, fmt 12.1.0), the mechanism (a bundled copy plus shared include guards), or a fixing rule. No rule in `rules/cmake-build` or `rules/cpp-packaging` covers it (grep for `bundled`, `SPDLOG`, `two copies`, `inline namespace`, 2026-09-26) | stalled |

**Stop condition**, reached with the reads under Fixes:

- **Copy:** `pfx/spdlog-1.17.0-bundled/include/spdlog/fmt/bundled/base.h`
  (`#define FMT_VERSION 120100`) beside `pfx/fmt-11.1.4/include/fmt/base.h`
  (`110104`). `grep -rn --include='base.h' -e 'define FMT_VERSION ' "$PFX_FMT11/include" "$PFX_SPD_B/include"` prints both, exit 0.
- **Which one each object used:** `ninja -C b44 -t deps CMakeFiles/app.dir/main.cpp.o`
  lists only the winning copy's `base.h`: fmt 11.1.4's in A1, the bundled one in A2.
- **Mechanism:** `spdlogConfig.cmake:32` reads `set(SPDLOG_FMT_EXTERNAL OFF)`,
  and `spdlogConfigTargets.cmake:64` has `INTERFACE_LINK_LIBRARIES "Threads::Threads"`
  with no `fmt::fmt`. The external build reads `ON` and `"Threads::Threads;fmt::fmt"`.
- **Fix** (measured, 4.4.2): the same two sources against spdlog 1.17.0 built
  with `-DSPDLOG_FMT_EXTERNAL=ON` on fmt 11.1.4 configure, build and run with
  exit 0. Both print `FMT_VERSION 110104`, and the binary holds 237
  `fmt::v11::` symbols and 0 `fmt::v12::`, for either include order. No
  existing rule states this (candidate MUST row 1).

## Scenario B: CPM.cmake 0.43.2

### B1 A package lock pins the old version

**Fixture** (`B/lock`): `include(cmake/CPM.cmake)`,
`CPMUsePackageLock(package-lock.cmake)`, `CPMAddPackage("gh:fmtlib/fmt#12.1.0")`,
and `lib/CMakeLists.txt` with `find_package(fmt 12.1 CONFIG REQUIRED)` (a
subproject written to work installed or fetched, CMK-DEP-07). The lock was
generated by CPM itself when the call said `#12.0.0`
(`cmake --build bgen --target cpm-update-package-lock`, exit 0; run.sh
regenerates it and diffs it against the fixture: identical):

```cmake
CPMDeclarePackage(fmt
  GIT_TAG 12.0.0
  GITHUB_REPOSITORY fmtlib/fmt
  SYSTEM YES
  EXCLUDE_FROM_ALL YES
)
```

**Symptom**: on 3.31.12, 4.3.4 and 4.4.2, a fresh configure exits 0 and prints
`-- CPM: Adding package fmt@12.0.0 (12.0.0)` and one
`CMake Warning at cmake/CPM.cmake:392 (message): CPM: Requires a newer version of fmt (12.1.0) than currently included (12.0.0).`
The build exits 0 and prints `fmt 12 (FMT_VERSION 120000)`. `find_package(fmt 12.1 ...)` in `lib/` passed against 12.0.0.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| B1-a | Before you start | `cmake --version` | same | 4.4.2, `GATE=-Werror=author` | worked |
| B1-b | Pick the entry point | T1 "Wrong copy or version found" → step 1 | Took T1 | none | worked |
| B1-c | Step 1 | Grep the cache | Verbatim, `NAME=fmt`, `b44` | Exit 0, one line: `fmt_DIR:PATH=.../B/lock/b44/CMakeFiles/pkgRedirects`. Row "a FetchContent redirect answered" → T2 | worked |
| B1-d | T2 | `grep ... -e 'OVERRIDE_FIND_PACKAGE' .` names the declaring line. "Empty output means no override declare exists, so look for a `FIND_PACKAGE_ARGS` declare". "A hit in an installable library outside a top-level guard is a CMK-DEP-07 finding" | Verbatim | Exit 0, one hit: `./cmake/CPM.cmake:334: # OVERRIDE_FIND_PACKAGE. The CMAKE_FIND_PACKAGE_REDIRECTS_DIR works ...`, a comment. CPM's `cpm_create_module_file` writes `pkgRedirects/fmt-config.cmake` and a version file holding only `set(PACKAGE_VERSION_COMPATIBLE TRUE)` and `set(PACKAGE_VERSION_EXACT TRUE)` for every package it fetches. Neither T2 branch applies, and the only hit reads like a finding | misled |
| B1-e | T2, version | "Any later `find_package(dep 2.0 ...)` against the redirect passes with a blank version (CMK-DEP-09)" | Read `lib/`'s call against the stub | True as written: `find_package(fmt 12.1 CONFIG REQUIRED)` passed against 12.0.0. A real finding, correctly named | worked |
| B1-f | references, FetchContent redirects | "grep the tree for the keyword": `grep -rn -A2 ... -e 'FetchContent_Declare' -e 'CPMAddPackage' .` | Verbatim | The project hit is `./CMakeLists.txt:5:CPMAddPackage("gh:fmtlib/fmt#12.1.0")`. The lock's `CPMDeclarePackage` matches neither pattern, so the grep names the declaration that lost, and the reader concludes 12.1.0 was used | wrong |
| B1-g | Step 2 | "`The file was found at` followed by a path names the file that answered" | `cmake -S . -B b44 --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=fmt` | Exit 0. 0 `The file was found at` lines: a redirect prints only the three `pkgRedirects` candidates. The bullet has nothing to read | stalled |
| B1-h | Step 3 | "A count of 0 ... is a finding, except for a call a FetchContent redirect answered ..., which logs no event" | Both greps after step 2 | 4.4.2: count 1: `path: ".../pkgRedirects/fmt-config.cmake"`, `mode: "config"`, request `12.1`, found `version: ""`. Without `--debug-find-pkg` the count is 0. The same holds for a plain `FetchContent_Declare(... OVERRIDE_FIND_PACKAGE)` control (`B/fcref`, 4.3.4 and 4.4.2: 0 events without the flag, 1 with it). The text is wrong in the only order the skill runs it | wrong |

**Stop condition**, with the reads under Fixes:

- **Copy:** `CPM_PACKAGE_fmt_SOURCE_DIR:INTERNAL=.../b44/_deps/fmt-src` in the cache.
- **Version:** `CPM_PACKAGE_fmt_VERSION:INTERNAL=12.0.0`, and the console line `CPM: Adding package fmt@12.0.0`.
- **Mechanism:** `CPMUsePackageLock` ran `CPMDeclarePackage(fmt GIT_TAG 12.0.0)`
  first. `CPMAddPackage` hands a declared name to the declaration
  (`CPM.cmake` "Check for available declaration"), then only warns that the call
  wanted more. The declaration grep under Fixes shows it:
  `./package-lock.cmake:5:CPMDeclarePackage(fmt`, `./CMakeLists.txt:4:CPMUsePackageLock(package-lock.cmake)`.
- **Fix** (`B/lock-fix`, 4.4.2): the lock's `GIT_TAG 12.1.0`. Exit 0,
  `CPM: Adding package fmt@12.1.0`, the binary prints 120100, and
  `CPM_PACKAGE_fmt_VERSION:INTERNAL=12.1.0`. The owning rule is the lock-of-record
  (CMK-PKG-01, which lists no CPM lock today) and first-declaration-wins
  (CMK-DEP-10).

### B2 `CPM_USE_LOCAL_PACKAGES` is cached from the environment

**Fixture** (`B/local`): `CPMAddPackage("gh:fmtlib/fmt#12.0.0")`, and an
executable linking `fmt::fmt`. The developer's shell has
`CMAKE_PREFIX_PATH=$S/pfx/fmt-12.1.0` and, once, `CPM_USE_LOCAL_PACKAGES=ON`.

**Symptom** (4.4.2): the first configure prints `CPM: Using local package fmt@12.1.0`
and the binary prints 120100. After `unset CPM_USE_LOCAL_PACKAGES`, a
reconfigure of the same tree exits 0, prints the same line, and still builds
120100: `CPM_USE_LOCAL_PACKAGES:BOOL=ON` stays in the cache
(`option(CPM_USE_LOCAL_PACKAGES ... $ENV{CPM_USE_LOCAL_PACKAGES})`, `CPM.cmake:115`).
fmt's version file is `AnyNewerVersion`, so CPM's `find_package(fmt 12.0.0 QUIET)` accepts 12.1.0.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| B2-a | Before you start | `cmake --version` | same | 4.4.2 | worked |
| B2-b | Pick the entry point | T1 | Took T1 | none | worked |
| B2-c | Step 1 | Grep, first matching row decides | Verbatim, `NAME=fmt` | Exit 0: only `fmt_DIR:PATH=.../pfx/fmt-12.1.0/lib64/cmake/fmt`. No `CMAKE_PREFIX_PATH` line (it is in the environment). Row "not under the current `dep_ROOT`, `CMAKE_PREFIX_PATH` entry ...: a stale cache entry, or a rooted copy". Neither is the mechanism, and the record that is (`CPM_USE_LOCAL_PACKAGES:BOOL=ON`) is not in the grep | misled |
| B2-d | T1 | "`-U <Pkg>_DIR` is enough only when the toolchain did not change" | `cmake -S . -B b44 -U fmt_DIR "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW` | Exit 0, `CPM: Using local package fmt@12.1.0`, `fmt_DIR` back on `pfx/fmt-12.1.0`. The prescribed remedy changes nothing | wrong |
| B2-e | Step 2 (variable unset) | `--fresh`, then "A `dep_DIR` that moved to the hinted copy confirms a stale cache (T1)" | `cmake -S . -B b44 --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=fmt` | Exit 0, `CPM: Adding package fmt@12.0.0`, 0 debug blocks, 0 events, no `fmt_DIR` line at all, and the binary now prints 120000. The symptom is gone, so the reader records "stale `_DIR`, fixed by `--fresh`". The mechanism was CPM's cached option | misled |
| B2-f | Step 2 (variable still exported, a new tree `b44env`) | "`_DIR` stays put under `--fresh`: a rooted copy won ... Both empty while step 1 names cmake-conan: T13" | Same command on `b44env` | Exit 0. `The file was found at .../pfx/fmt-12.1.0/.../fmt-config.cmake`. `CMAKE_FIND_ROOT_PATH` and `CMAKE_SYSROOT` both `none`, and no cmake-conan: no T1 branch applies. The tell was printed and never named: the first debug header reads `CMake Debug Log at cmake/CPM.cmake:309 (find_package)` | stalled |
| B2-g | Step 3 | "A found version other than the one the manager reports is the finding" | Name/path/mode/version grep | 4.4.2: request `12.0.0`, found `12.1.0`, backtrace `cmake/CPM.cmake:309 (find_package)`. The version finding is right | worked |

**Stop condition:** copy `pfx/fmt-12.1.0` (`fmt_DIR`), version 12.1.0,
mechanism CPM's local-package search enabled by a cached option. Fix:
`-DCPM_USE_LOCAL_PACKAGES=OFF` on the same tree (exit 0,
`CPM: Adding package fmt@12.0.0`, binary 120000, measured with the variable
still exported), or `--fresh` with it unset. No new MUST row: CMK-DEP-32's
"assert the copy" covers CI, and its check needs the CPM cache line (Fixes).

### B3 A shared `CPM_SOURCE_CACHE` holds an edited copy

**Fixture**: `B/cache-other` and `B/cache` both call
`CPMAddPackage("gh:fmtlib/fmt#12.0.0")` with `CPM_SOURCE_CACHE=$S/B/cpm-cache`.
`cache-other` populated `cpm-cache/fmt/061b`. A debugging edit was then made in
that shared checkout (`#define FMT_LOCAL_EDIT 1` after `FMT_VERSION` in
`include/fmt/base.h`; `git status --porcelain` prints ` M include/fmt/base.h`).

**Symptom**: `B/cache` configured into a brand-new tree on 3.31.12 and 4.4.2
exits 0, prints `CMake Warning at cmake/CPM.cmake:924 (message): CPM: Cache for fmt (.../cpm-cache/fmt/061b) is dirty`
and `CPM: Adding package fmt@12.0.0 (12.0.0 at .../cpm-cache/fmt/061b)`, and the
binary prints `FMT_VERSION 120000 (edited copy)`. A new tree, `--fresh` and a
wiped tree all reuse the shared copy.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| B3-a | Before you start | `cmake --version` | same | 4.4.2 and 3.31.12 | worked |
| B3-b | Pick the entry point | No row names a source copy. T1 is the nearest | Took T1 → step 1 | none | worked |
| B3-c | Step 1 | "Non-empty output is expected" | Verbatim, `NAME=fmt` | Exit 1, empty. Row "No `dep_DIR` line and no provider: a Find module answered, or the call never ran". Nothing calls `find_package(fmt)`, and the skill has no read for a fetched copy's source | stalled |
| B3-d | Steps 2 and 3 | `--fresh --debug-find-pkg`, then the log | Verbatim | Exit 0, 0 debug blocks, 0 events. "Empty output means no `find_package` resolved": true, and a dead end | stalled |
| B3-e | references, FetchContent redirects | The declare grep | Verbatim | `CPMAddPackage("gh:fmtlib/fmt#12.0.0")`, the same pin CI uses. Nothing reads `CPM_SOURCE_CACHE` or asks whether the copy is clean | stalled |

**Stop condition:** copy `CPM_PACKAGE_fmt_SOURCE_DIR:INTERNAL=.../cpm-cache/fmt/061b`,
version 12.0.0 (`CPM_PACKAGE_fmt_VERSION`), mechanism a shared source cache
edited by another project, reused with a warning the gate never promotes. Fix:
restore the checkout (`git -C "$DIR" checkout -- .`) and give CI its own cache.
The rule home is CMK-DEP-16, which names `CPM_SOURCE_CACHE` only as the offline
mechanism. No MUST row proposed: one real but rare trigger.

## Scenario C: cross build, zig cc aarch64 with `CMAKE_SYSROOT`

**Fixture**: `C/toolchain-aarch64.cmake` sets `CMAKE_SYSTEM_NAME Linux`,
`CMAKE_SYSTEM_PROCESSOR aarch64`, `CMAKE_SYSROOT` (`C/sysroot`), the compiler
wrapper (`zig cc -target aarch64-linux-gnu`) and `zig ar`/`zig ranlib`: the
common shape, and CMK-TC-08's "wrong" example. expat 2.8.5 is cross-built into
the sysroot with the Debian multiarch layout (`-DCMAKE_INSTALL_PREFIX=/usr
-DCMAKE_INSTALL_LIBDIR=lib/aarch64-linux-gnu`, `DESTDIR=C/sysroot`), so
`usr/lib/aarch64-linux-gnu/libexpat.so` (AArch64) and
`usr/lib/aarch64-linux-gnu/cmake/expat-2.8.5/expat-config.cmake`. The host's
expat 2.7.3 (x86-64) sits in `pfx/expat-2.7.3`, and the developer's
environment has `CMAKE_PREFIX_PATH` pointing at it. Two consumers:
`C/app-config` (`find_package(expat 2.6 CONFIG REQUIRED)`, `expat::expat`) and
`C/app-module` (`find_package(EXPAT 2.6 MODULE REQUIRED)`, `EXPAT::EXPAT`).

**Symptom**, identical on 3.31.12, 4.3.4 and 4.4.2: configure exits 0, build
exits 1 with `ld.lld: error: .../pfx/expat-2.7.3/lib64/libexpat.so.1.11.1 is incompatible with aarch64linux`
(config) or `.../lib64/libexpat.so is incompatible with aarch64linux` (module).
The module configure prints `-- Found EXPAT: .../pfx/expat-2.7.3/lib64/libexpat.so (found suitable version "2.8.5", minimum required is "2.6")`:
the library is the host's, the version is the sysroot header's. The cause, on
all three lines: `CMakeFiles/<ver>/CMakeCCompiler.cmake` holds
`set(CMAKE_C_LIBRARY_ARCHITECTURE "")` and `set(CMAKE_C_IMPLICIT_LINK_DIRECTORIES "")`,
because zig cc reports no implicit link directories, so `<sysroot>/usr/lib/aarch64-linux-gnu`
is never searched and the unrooted host prefix wins under the default `BOTH`.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| C-a | Before you start | `cmake --version` | same | 4.4.2 (and 3.31.12, 4.3.4) | worked |
| C-b | Pick the entry point | Description: "find_package picked a different installed copy than expected" → T1 | Took T1 | none | worked |
| C-c | Step 1 (config) | Grep the cache | Verbatim, `NAME=expat` | Exit 0: `CMAKE_TOOLCHAIN_FILE:FILEPATH=.../C/toolchain-aarch64.cmake`, `expat_DIR:PATH=.../pfx/expat-2.7.3/lib64/cmake/expat-2.7.3`. Row "not under the current hint ... step 2 tells them apart" → step 2 | worked |
| C-d | Step 2 (config), then T1 | `--fresh --debug-find-pkg`, then "One that stays on a manager's tree or a sysroot is a rooted copy winning". T1: "`_DIR` stays put under `--fresh`. A rooted copy won: `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty" | `cmake -S . -B b44 --fresh --toolchain .../toolchain-aarch64.cmake "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW -DCMAKE_BUILD_TYPE=Release --debug-find-pkg=expat` | Exit 0. `_DIR` stays on the host path. The output prints `CMAKE_FIND_ROOT_PATH none` and `CMAKE_SYSROOT .../C/sysroot`, so T1's condition holds and its reading ("a rooted copy won") is inverted: the winner is unrooted, and the considered list has 0 candidates under `sysroot/usr/lib/aarch64-linux-gnu` | wrong |
| C-e | T1's fix | "Pin the copy with `<Pkg>_DIR` (CMK-DEP-21)" | `-Dexpat_DIR=$S/C/sysroot/usr/lib/aarch64-linux-gnu/cmake/expat-2.8.5` on a fresh tree | Exit 0, build exit 0, `Machine: AArch64`. It works for this one Config package, leaves the toolchain at `BOTH` (CMK-TC-08, never cited by the skill) and does nothing for a Find module (C-g) | misled |
| C-f | Step 3 (config) | Count, then the grep | Verbatim on 4.4.2 | Count 1. Request `2.6`, found `2.7.3`, path the host's `expat-config.cmake`. The event's `settings` also holds `CMAKE_FIND_ROOT_PATH_MODE: "BOTH"`, which the references mention and the SKILL grep omits | worked |
| C-g | Step 1 (module) | "No `dep_DIR` line and no provider: a Find module answered ... Step 2 prints which" → references, Module mode | Verbatim, `NAME=EXPAT` | Exit 0, only `CMAKE_TOOLCHAIN_FILE`. The answer sits in `EXPAT_INCLUDE_DIR:PATH=.../C/sysroot/usr/include` and `EXPAT_LIBRARY_RELEASE:FILEPATH=.../pfx/expat-2.7.3/lib64/libexpat.so`, which neither the SKILL nor the references say to read | stalled |
| C-h | Step 2 (module) | "`The file was found at` followed by a path names the file that answered" | Same flags, `--debug-find-pkg=EXPAT` | Exit 0, 4199 lines. The one `The file was found at` names `FindEXPAT.cmake`. The copies print as `The item was found at`: `.../C/sysroot/usr/include/` (find_path) and `.../pfx/expat-2.7.3/lib64/libexpat.so` (find_library) | misled |
| C-i | Step 3 (module) | "A found version other than the one the manager reports is the finding" | Verbatim on 4.4.2 | `mode: "module"`, found `version: "2.8.5"`: the sysroot header's version, while the linked library is the host's 2.7.3. The skill's version read names the copy that did not link | wrong |

**Stop condition:**

- **Copy:** host expat 2.7.3 (`expat_DIR`, or `EXPAT_LIBRARY_RELEASE`). In
  module mode the header is the sysroot's 2.8.5, a split copy.
- **Mechanism:** the toolchain leaves the find-root modes unset (`BOTH`,
  shown in the event's settings), and `CMAKE_LIBRARY_ARCHITECTURE` is empty, so
  the sysroot's multiarch directory is never a candidate and the environment's
  `CMAKE_PREFIX_PATH` copy wins.
- **Fix** (`C/toolchain-aarch64-only-arch.cmake`: CMK-TC-08's four modes plus
  `set(CMAKE_LIBRARY_ARCHITECTURE aarch64-linux-gnu)`): configure and build exit
  0 for both consumers on 3.31.12, 4.3.4 and 4.4.2, `expat_DIR` and
  `EXPAT_LIBRARY_RELEASE` under `sysroot/usr/lib/aarch64-linux-gnu`, and
  `readelf -h` prints `Machine: AArch64`.
- **Controls** (4.4.2): CMK-TC-08's modes alone turn it into a configure error
  (`Could not find a package configuration file provided by "expat"`, and
  `Could NOT find EXPAT (missing: EXPAT_LIBRARY)`, exit 1), although the package
  is in the sysroot. `CMAKE_LIBRARY_ARCHITECTURE` alone finds the sysroot copy
  (rooted first). CMK-TC-08's E3 check lists `toolchain-aarch64.cmake` and
  `toolchain-aarch64-arch.cmake` as findings.

## Fixes

Line numbers refer to `skills/cmake-dependency-triage/SKILL.md` as of this wave
(499 lines, 2026-09-26). Every edit below was applied to a copy by
`$S/proposed/apply.py`, which asserts each anchor line, and the result is
`$S/proposed/SKILL.md` (**497 lines**, diff in `$S/proposed/SKILL.diff`; run.sh
re-runs it). Text that leaves SKILL.md and has no home in the references yet is
in `$S/proposed/references-additions.md`, with the new `## Bundled copies` and
`## CPM` sections and the Module mode, FetchContent redirects and
Toolchain-injected paths additions. Every other moved passage already exists
in the references, at the heading the edit's tag names.

Which edit answers which step:

| Fix | Steps | Edits (by tag below) |
|---|---|---|
| F1 bundled copies, new T14 | A-b, A-f, A-g | F1.1 to F1.5, F1.7 |
| F2 CPM, new T15 | B1-d, B1-f, B1-g, B2-c, B2-d, B2-e, B2-f, B3-c, B3-d, B3-e | F2.1 to F2.4, F2.6, F2.8, and the `pkgRedirects` row text in F2.2 (B1-g) |
| F3 cross builds and Find modules | C-d, C-e, C-g, C-h, C-i | F3.1 to F3.7 |
| F4 redirect event under `--debug-find-pkg` | B1-h | F4 (step 3 paragraph and failure mode 10) |
| Budget moves | none | every tag starting `move:` |

Outside SKILL.md, F4 also applies to the references' FetchContent table row 3
(line 84) and to CMK-DEP-17's verification cell
(`rules/cmake-build/dependencies.md:136`), which carry the same "logs no
event" wording from wave 4. The references' redirect grep (line 94) gains
`-e 'CPMDeclarePackage' -e 'CPMUsePackageLock'`.

### Budget

The edits that only add text total +56 lines (the T14 and T15 insert +34,
failure modes 16 to 19 +8, T1's cross bullet +5, the CPM step 1 rows +3, and
+2 each for the evidence rule, the step 2 bullet and the two entry rows). The
two mixed edits (step 3, T2) net -3, and the pure moves total -55, so SKILL.md
goes from 499 to 497. The per-edit deltas, from `apply.py`:

| Edit | Delta | Edit | Delta |
|---|---|---|---|
| intro (16-18) | -1 | T3 bullets (251-257) to references providers | -3 |
| F1.4 evidence rule (61-63) | +2 | T4 detail (265-268), kept as failure mode 7 | -2 |
| floor sentence (71-74) to pinned defaults | -1 | T5 and T6 merged (281-307), detail to references Config mode | -10 |
| F2.2 three CPM rows (108) | +3 | T8 (330-334, 340-346) to references Conan graph | -6 |
| F3.3 step 2 bullet (after 132) | +2 | T9 (352-355, 361-368) to references vcpkg | -7 |
| F4 + F3.4 step 3 (147-161), cmake-conan event shape to references providers | -1 | T12 section (399-416) to references, entry row links it | -18 |
| F1.1 + F2.3 entry rows (after 179) | +2 | T13 (419-426), fallback detail to references providers | -2 |
| T1 toolchain bullet (187-190) to references toolchain paths | -1 | F1.5 + F2.6 T14 and T15 sections (after 427) | +34 |
| F3.1 T1 bullets (205-210) | +5 | pinned defaults rows (435-436) | -1 |
| F2.4 T2 (227-236), `FIND_PACKAGE_ARGS` detail to references redirects | -2 | failure modes 16-19 (after 485) | +8 |
| | | re-check list (495-499) to references header | -3 |

### Exact replacement text, per edit

#### line 3 (+0) — desc

~~~text
description: Symptom-first triage for a CMake dependency that resolved to the wrong copy, version or mechanism, with the exact cache, configure-log, Conan, vcpkg and CPM reads and what each output means. Use when find_package picked a different installed copy than expected, a re-pointed _ROOT, CMAKE_PREFIX_PATH or toolchain had no effect, a cross build linked a host library, a fetched copy was built although an installed one was on the path, a CPM lock, CPM_USE_LOCAL_PACKAGES or CPM_SOURCE_CACHE picked another copy, two copies of one library meet in one link, a dependency provider or cmake-conan never supplied a package or find_program cannot see it, a binary links or loads a different copy than the one configured, a consumer fails with "link interface of target ... not found", CMake 4 reports "Compatibility with CMake < 3.5 has been removed" or the configure gate stops on "< 3.10 will be removed" or on install-absolute-destination in a dependency, an offline or FETCHCONTENT_SOURCE_DIR configure fails where the online one passed, or someone asks which version Conan or vcpkg picked. Not for choosing a package manager or writing build files (the cmake-build and cpp-packaging rules).
~~~

#### line 7 (+0) — keywords

~~~text
  keywords: cmake,dependency,triage,find_package,CMakeCache,_DIR,_ROOT,debug-find-pkg,fresh,CMakeConfigureLog,FetchContent,OVERRIDE_FIND_PACKAGE,pkgRedirects,FETCHCONTENT_SOURCE_DIR,dependency-provider,cmake-conan,CMakeConfigDeps,conan-graph-info,conan-graph-explain,conan.lock,vcpkg,VCPKG_INSTALLED_DIR,toolchain,CMAKE_FIND_ROOT_PATH,find_dependency,CMAKE_POLICY_VERSION_MINIMUM,cmake_minimum_required,CPM,CPMUsePackageLock,CPM_USE_LOCAL_PACKAGES,CPM_SOURCE_CACHE,bundled,CMAKE_SYSROOT,CMAKE_LIBRARY_ARCHITECTURE
~~~

#### lines 16-18 (-1) — move: intro

~~~text
This skill assumes the `cmake-build` and `cpp-packaging` rule sets are
installed. Their merge-blocking rows are repeated at the end, on purpose.
~~~

#### lines 19-23 (+0) — measured (F2/F3 tools; registry detail to references header)

~~~text
Everything below was run on CMake 3.31.12, 4.3.4 and 4.4.2, Conan 2.32.0 with
cmake-conan `develop2` (`b1593849`), vcpkg-tool 2026-09-26 (2026-07-27 where a
line says so) and CPM.cmake 0.43.2, on real cJSON, spdlog 1.17.0, fmt and expat
2.8.5 trees, the last cross-built with zig cc 0.16 (2026-09-26). The references
name each version.
~~~

#### line 27 (+0) — contents

~~~text
[Pick the entry point](#pick-the-entry-point) · [T1 to T15](#t1-wrong-copy-or-a-re-pointed-hint-had-no-effect) ·
~~~

#### lines 35-36 (+0) — F3.5

~~~text
- **Which copy.** On a `--fresh` configure, `<Pkg>_DIR` (or a Find module's
  library cache line, or the provider that answered) names the copy you intended.
~~~

#### lines 61-63 (+2) — F1.4

~~~text
It never comes from the call site, a green configure, a manager's trace
(`VCPKG_TRACE_FIND_PACKAGE`, `vcpkg depend-info`), `conan graph info`, or
`cmake --graphviz`, which draws the target graph only. A copy bundled inside
another package never passes through `find_package`: its version macro is its
record (T14).
~~~

#### lines 71-74 (-1) — move: floor sentence to pinned defaults

~~~text
The binary line decides the gate spelling and which floor rule applies. Every
configure in this skill passes the gate for its line and, because a fetch may
be involved, `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` (floor pinned below).
~~~

#### line 95 (+0) — F2.1

~~~text
grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" -e '^CMAKE_PREFIX_PATH' -e '^VCPKG_INSTALLED_DIR' -e '^CMAKE_TOOLCHAIN_FILE' -e '^CMAKE_PROJECT_TOP_LEVEL_INCLUDES' -e '^CPM_PACKAGE_' -e '^CPM_USE_LOCAL_PACKAGES' -e '^CPM_SOURCE_CACHE' build
~~~

#### line 108 (+3) — F2.2

~~~text
| `CPM_USE_LOCAL_PACKAGES:BOOL=ON` | CPM ran `find_package` before fetching. The option is read from the environment on the first configure and then cached, so unsetting the variable or `-U dep_DIR` keeps the local copy (4.4.2) | T15 |
| `CPM_PACKAGE_dep_VERSION` other than the version the `CPMAddPackage` call names | Another declaration of the name came first, a `CPMUsePackageLock` file included | T15 |
| `CPM_PACKAGE_dep_SOURCE_DIR` outside the build tree | A shared `CPM_SOURCE_CACHE` copy, which every tree reuses, `--fresh` included | T15 |
| `dep_DIR:PATH=<build>/CMakeFiles/pkgRedirects` | A FetchContent or CPM redirect answered, and step 2 prints its candidates with no `The file was found at` line. An installed copy was never consulted | T2 |
~~~

#### line 110 (+0) — F3.2

~~~text
| No `dep_DIR` line and no provider | A Find module answered, or the call never ran. A module's copy is its `<NAME>_LIBRARY*` and `<NAME>_INCLUDE_DIR` cache lines, grepped with `NAME` as the call spells it | [references](references/reading-the-answers.md#module-mode-find_package) |
~~~

#### line 111 (+0) — F1.2

~~~text
| `dep_DIR` under the expected prefix, and no row above matches | The configured copy is right. A binary that reports another version at run time is the loader (T11), or, with no `ldd` line for the library, a bundled copy compiled in (T14). Otherwise a wrong version is the manager's | T11, T14, T8, T9 |
~~~

#### insert before line 133 (+2) — F3.3

~~~text
- `The item was found at` is a `find_library` or `find_path` answer. For a Find
  module these lines are the copy, and `The file was found at` names the module.
~~~

#### lines 147-161 (-1) — F4 + F3.4; cmake-conan event shape to references

~~~text
Run both only after the `--fresh` configure of step 2, because the log appends
on a reused tree (4.4.2 counted 2 events after one reconfigure). A count of 0
on 3.x is expected. A count of 0 on 4.1 or newer after a `find_package` ran is
a finding (CMK-DEP-17). A call a FetchContent or CPM redirect answered logs an
event only under `--debug-find-pkg`, with its `path:` in `pkgRedirects` and a
blank found `version:` (4.3.4 and 4.4.2). A cmake-conan call's events:
[references](references/reading-the-answers.md#dependency-providers). The second
command pairs each package `name:` with its `path:`, `mode:` and `version:`
lines, the request's version first, then the found copy's. A found version
other than the one the manager reports is the finding. A Find module reports
the version it read, usually the header's: compare it with step 1's library
line. Empty output means no `find_package` resolved. On 3.x, read the version
file beside step 1's `_DIR`
([references](references/reading-the-answers.md#config-mode-find_package)).
~~~

#### line 167 (+0) — F3.6

~~~text
| T1 | Wrong copy or version found. A re-pointed hint had no effect | Step 1, then step 2 | `_DIR` moves under `--fresh`: stale cache. It does not move: a rooted copy wins | CMK-DEP-13, CMK-DEP-21, CMK-TC-08 |
~~~

#### line 178 (+0) — T12 row link

~~~text
| T12 | 4.4 and newer: the gate stops on `install-absolute-destination` inside a fetched or vendored dependency | The error's file:line, then [references](references/reading-the-answers.md#install-under-the-44-gate) | The dependency installs to an absolute `DESTINATION` (`CMAKE_INSTALL_FULL_*`) | CMK-DEP-30, CMK-DEP-31 |
~~~

#### insert before line 180 (+2) — F1.1 + F2.3

~~~text
| T14 | A link error names two versions of one library ("did you mean" another inline namespace), or a static binary runs another version than `<dep>_DIR` names | The version macro over step 1's prefixes | Another package bundles a copy in its headers and library | Candidate CMK-DEP-33 |
| T15 | A CPM project builds another version or source than its `CPMAddPackage` call names | Step 1's `CPM_` lines | A lock declaration, a cached `CPM_USE_LOCAL_PACKAGES`, or a shared source cache | CMK-DEP-10, CMK-PKG-01, CMK-DEP-16 |
~~~

#### lines 187-190 (-1) — move: T1 toolchain detail

~~~text
- **A toolchain was added or changed on this tree.** It is never loaded, and
  `-U <Pkg>_DIR` finds the old copy again: `--fresh` or a new tree (CMK-TC-03,
  [references](references/reading-the-answers.md#toolchain-injected-paths)).
~~~

#### lines 205-210 (+5) — F3.1

~~~text
- **`_DIR` stays put under `--fresh`, and starts with a root.**
  `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty (step 2 prints both),
  and every rooted candidate beats an unrooted `_ROOT` hint. Pin the copy with
  `<Pkg>_DIR` (CMK-DEP-21, and CMK-TC-10 under a Conan cross build). Both empty
  while step 1 names cmake-conan means its fallback search found the copy
  again: T13, never a `_DIR` pin.
- **`_DIR` stays put outside every root, in a cross build.** The target's copy
  was never a candidate. Step 3's `CMAKE_FIND_ROOT_PATH_MODE: "BOTH"` is
  CMK-TC-08's finding. A sysroot's `usr/lib/<triplet>` is searched only when
  `CMAKE_LIBRARY_ARCHITECTURE` is set, and zig cc 0.16 leaves it empty in
  `CMakeFiles/*/CMakeCCompiler.cmake`: the toolchain sets it (3.31.12 to 4.4.2).
~~~

#### lines 227-236 (-2) — F2.4; FIND_PACKAGE_ARGS detail to references

~~~text
Empty output, or a hit only inside `CPM.cmake` (CPM writes the redirect itself
for every package it fetches: T15), means no override declare. Then look for a
`FIND_PACKAGE_ARGS` declare whose try-find missed because its name is spelled
unlike the Config file: re-run step 1 with `NAME` set to that spelling
([references](references/reading-the-answers.md#fetchcontent-redirects)). A hit
in an installable library outside a top-level guard is a CMK-DEP-07 finding.
A later `find_package(dep 2.0 ...)` against the redirect passes with a blank
version (CMK-DEP-09). A CI leg on the installed copy asserts step 1's path (CMK-DEP-32).
~~~

#### lines 251-257 (-3) — move: T3 bullets

~~~text
A leg without presets captures the step 2 command the same way. Empty output
means `CMakeDeps`, whose content no `find_*` call sees. A `Loading` line means
`CMakeConfigDeps`, whose paths exist after the first intercepted `find_package`,
in that directory scope (4.4.2).
~~~

#### lines 265-268 (-2) — move: T4 detail

~~~text
The error names the installed `*Targets.cmake`: the exporter never redeclared
a dependency on its link interface. Only a compiled consumer fails (failure mode 7).
~~~

#### lines 281-307 (-10) — move: T5+T6 merged

~~~text
## T5 and T6 A dependency's floor stops the configure

T5 is 4.x's "Compatibility with CMake < 3.5 has been removed". T6 is the gate on
"< 3.10 will be removed": `CMake Deprecation Error` on 3.31.12 and 4.3.4,
`CMake Error (deprecated)` on 4.4.2. Both name the dependency's
`cmake_minimum_required` line. On 4.x the fix is CMK-DEP-15, value 3.10 (never
CMake's suggested 3.5), scoped to the one call that adds the dependency. On 3.x
it is CMK-DEP-30, a re-pin or a one-line `PATCH_COMMAND`, because 3.31.12
ignores `CMAKE_POLICY_VERSION_MINIMUM`. Never a warning switch. List the writes:

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' .
```

Empty output passes. Each hit must be a set/restore around one call that adds
the dependency, a `set()` inside a function, or a vcpkg port's own arguments.
A preset, workflow or file-scope hit is the finding.
~~~

#### lines 330-334 (-3) — move: T8 part 1

~~~text
Pass the flags the build's `conan install` uses. It prints what the conanfile
resolves to now. The tree builds against the last install's generators folder:
~~~

#### lines 340-346 (-3) — move: T8 part 2

~~~text
Hits under a `generators` directory are this tree's version and package
folder, and empty output means no generators folder (not applicable). A version
other than graph info's means `conan install` did not run after a change
(CMK-CONAN-07, CMK-CONAN-09, [references](references/reading-the-answers.md#the-conan-graph)).
~~~

#### lines 352-355 (-2) — move: T9 duplicates

~~~text
the same way (a missing `VCPKG_INSTALLED_DIR` line is step 1's first row). For
the version, read what vcpkg installed into this tree:
~~~

#### lines 361-368 (-5) — move: T9

~~~text
Only an `install ok installed` entry counts, and empty output means no manifest
install ran into this tree. A version above a `version>=` floor is the baseline
winning (CMK-VCPKG-02, [references](references/reading-the-answers.md#vcpkg)).
~~~

#### lines 391-397 (+0) — F1.3; cJSON detail to references

~~~text
`ldd` printing `not a dynamic executable`, or no line naming the library, means
T11 does not apply: a static or header copy is T14. The `ldd` line naming the
library is the copy that loads. An installed binary with no `RUNPATH` or
`RPATH` line, whose build-tree twin has one, lost it at install, and a
same-SONAME copy on the loader's path wins with exit 0 (3.31.12 and 4.4.2).
The fix is CMK-INST-11 (`$ORIGIN`) for the same prefix, and
`INSTALL_RPATH_USE_LINK_PATH ON` on the executable for another. Never `LD_LIBRARY_PATH`.
~~~

#### lines 399-416 (-18) — move: T12 section to references

Delete.

#### lines 419-426 (-2) — move: T13

~~~text
cmake-conan re-runs a failed generators search with CMake's default search, so
a request that rejects Conan's copy, or a conanfile without the package, lets
another copy win with exit 0
([references](references/reading-the-answers.md#dependency-providers)). Fix the
request or the conanfile. A leg that must use Conan's copy asserts that step 1
prints no `<Pkg>_DIR` line for it (CMK-DEP-32).
~~~

#### insert before line 428 (+34) — F1.5 + F2.6

~~~text
## T14 Two copies of one library in one link

A package that bundles a dependency ships the copy in its own include
directory and library, and no configure record names it. The copies share
include guards, so the first include per source file wins: a link error naming
both inline namespaces, or a green binary running the bundled version (spdlog
1.17.0 and fmt 11.1.4, 3.31.12 to 4.4.2). List every copy on step 1's prefixes:

```sh
grep -rn --include='*.h' --include='*.hpp' -e 'define FMT_VERSION ' /usr/local/include /opt/spdlog/include
```

Name the library's version macro and step 1's prefixes. One hit passes, and
empty output means a wrong macro. A second hit is the finding: consume the
package's build that uses the external copy, whose targets list it (T4's second
grep), never an include order ([references](references/reading-the-answers.md#bundled-copies)).

## T15 CPM chose another copy

Step 1's `CPM_PACKAGE_<name>_VERSION` and `_SOURCE_DIR` lines are CPM's record.
List the declarations, the lock file included:

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' --exclude='CPM.cmake' --exclude='cpm-package-lock.cmake' --exclude-dir='_deps' -e 'CPMUsePackageLock' -e 'CPMDeclarePackage' -e 'CPMAddPackage' .
```

Empty output means no CPM. A `CPMDeclarePackage` wins over every `CPMAddPackage`
of the name, with one ungated warning: change the lock (CMK-DEP-10, CMK-PKG-01).
Step 2's `Debug Log at cmake/CPM.cmake` is the cached local search: pass
`-DCPM_USE_LOCAL_PACKAGES=OFF`. For a `_SOURCE_DIR` under `CPM_SOURCE_CACHE`,
`git -C "$DIR" status --porcelain` passes empty, and a line means another
project edited the shared copy (CMK-DEP-16,
[references](references/reading-the-answers.md#cpm)).

~~~

#### lines 435-436 (-1) — move: pinned defaults

~~~text
| Gate spelling and floor value | As in [Before you start](#before-you-start) and T5 and T6 (CMK-DEP-15, CMK-DEP-30) |
~~~

#### line 475 (+0) — F4

~~~text
10. **Reporting a CMK-DEP-17 finding for a zero event count** when a redirect answered: it logs an event only under `--debug-find-pkg`.
~~~

#### insert before line 486 (+8) — F1.7 + F2.8 + F3.7

~~~text
16. **Stopping at a right `<dep>_DIR` when another package bundles the
    dependency.** The bundled copy never passes through `find_package` (T14).
17. **Reading a CPM project's copy from its `CPMAddPackage` call.** A lock,
    a cached `CPM_USE_LOCAL_PACKAGES` or a shared source cache decides (T15).
18. **Reading a `_DIR` outside every root as "a rooted copy won"** because
    `CMAKE_SYSROOT` is set. The sysroot's copy was never searched (T1).
19. **Taking a Find module's reported version as the linked copy's.**
    FindEXPAT printed the sysroot header's 2.8.5 beside the host library (T1).
~~~

#### lines 495-499 (-3) — move: re-check list to references

~~~text
Re-check each tool version the references name, CPM.cmake 0.43.2 and zig cc 0.16
included, on its next release.
~~~

## Candidate new failure modes

Each was measured in this wave, and none is in the skill or the rules today
(grep over `rules/` and `skills/` for `bundled`, `inline namespace`,
`CPMDeclarePackage`, `CPM_PACKAGE_`, `cpm_create_module_file`,
`LIBRARY_ARCHITECTURE`, `multiarch`, `_LIBRARY_RELEASE` and `item was found`,
2026-09-26; the only `multiarch` hit is BZL-CC-09, a Bazel sysroot row).
Reproductions are paths under `$S`, all driven by `run.sh`. The proposed
SKILL.md carries them condensed as failure modes 16 to 19: 1 as 16, 2 to 5 as
17, 6 and 7 as 18, and 8 as 19.

1. **A package's bundled copy meets the installed one in one link.** The
   configure records name only the installed copy, `ldd` shows nothing for a
   static library, and include order decides per source file. Repro: `A/app`
   (link error, 3.31.12 to 4.4.2) and `A/app2` (green, runs fmt 12.1.0 while
   linking fmt 11.1.4). Overlaps failure mode 8 ("stopping at the configured
   copy is right") in effect, but the mechanism and the fix differ, so it is a
   new mode, not a re-count.
2. **CPM writes `pkgRedirects` itself.** Every fetched `CPMAddPackage` leaves
   `<name>-config.cmake` and an accept-anything version file, with no
   `OVERRIDE_FIND_PACKAGE` in the tree, so T2's grep hits a comment in
   `CPM.cmake` and `find_package(fmt 12.1 ...)` passes against 12.0.0. Repro:
   `B/lock`.
3. **A CPM package lock silently beats a bumped `CPMAddPackage`.** One
   ungated warning, exit 0, the old version built. Repro: `B/lock` (3.31.12,
   4.3.4, 4.4.2), fixed in `B/lock-fix`.
4. **`CPM_USE_LOCAL_PACKAGES` outlives its environment variable.** It is an
   `option()` seeded from `$ENV` and cached, so `unset` and `-U <Pkg>_DIR` both
   keep the local copy, and CPM's `find_package` accepts any version the
   package's version file allows (12.1.0 for `#12.0.0`). Repro: `B/local`.
5. **A shared `CPM_SOURCE_CACHE` copy survives a new tree.** An edit made
   from another project is built by every tree, with one ungated `is dirty`
   warning. Repro: `B/cpm-cache` edited from `B/cache-other`, built by `B/cache`
   on 3.31.12 and 4.4.2.
6. **In a cross build, an unrooted host copy is read as "a rooted copy won".**
   `CMAKE_SYSROOT` is set, so T1's condition holds, but the winner is a host
   path from the environment's `CMAKE_PREFIX_PATH`. Repro: `C/app-config` with
   `C/toolchain-aarch64.cmake` (3.31.12, 4.3.4, 4.4.2).
7. **A multiarch sysroot is invisible when `CMAKE_LIBRARY_ARCHITECTURE` is
   empty.** zig cc reports no implicit link directories, so
   `usr/lib/aarch64-linux-gnu` is never a candidate, for Config files and
   `find_library` alike. CMK-TC-08's `ONLY` then fails with "Could not find",
   which reads as a missing package. Repro: `C/toolchain-aarch64-only.cmake`
   (fails) against `C/toolchain-aarch64-only-arch.cmake` (passes).
8. **A Find module splits one package across two copies and reports the
   wrong one's version.** `EXPAT_INCLUDE_DIR` came from the sysroot (2.8.5),
   `EXPAT_LIBRARY_RELEASE` from the host (2.7.3), and both the console
   (`found suitable version "2.8.5"`) and the 4.4.2 `found.version` report the
   header's. Repro: `C/app-module`.

Not a failure mode, a text defect (F4): the claim that a redirect logs no
event holds only without `--debug-find-pkg`, and the skill always runs step 3
after it.

## Candidate new MUST rows

1. **New row in `rules/cmake-build/dependencies.md` (next free ID, CMK-DEP-33).**
   - Rule: "Link one copy of each library. When a consumed package can bundle
     a dependency that the project, or another package in the link, also uses,
     consume the build that uses the external copy (spdlog:
     `SPDLOG_FMT_EXTERNAL=ON`). Its exported targets then list the dependency
     on `INTERFACE_LINK_LIBRARIES`, and its Config file calls `find_dependency`
     for it."
   - Verification: `grep -rn --include='*.h' --include='*.hpp' -e 'define FMT_VERSION ' /usr/local/include /opt/spdlog/include`,
     naming the library's version macro and each prefix's `include` directory.
     One hit is the pass, and a second hit is the finding (measured: the
     bundled pair prints two lines, the external pair one). For the
     package itself: `grep -rn --include='*Targets.cmake' -e 'INTERFACE_LINK_LIBRARIES' "$PREFIX"`
     names the dependency's target.
   - Rationale: measured on 3.31.12, 4.3.4 and 4.4.2 with spdlog 1.17.0 and
     fmt 11.1.4. One include order fails the link, the other builds a binary
     that runs the bundled fmt 12.1.0 while linking fmt 11.1.4, with exit 0.
     The external build fixes both orders.
   - Not measured: which package managers build spdlog with the external fmt.
2. **CMK-TC-08 (amendment, a clause on the existing MUST row).**
   - Rule: "… and, for a sysroot with a multiarch `usr/lib/<triplet>` layout,
     sets `CMAKE_LIBRARY_ARCHITECTURE` to that triplet."
   - Verification (with `SYSROOT` and the toolchain directory bound):
     `find "$SYSROOT/usr/lib" -maxdepth 1 -type d -name '*-linux-gnu*'` lists a
     triplet directory, and `grep -rliE --include='*.cmake' -e 'set[[:space:]]*\([[:space:]]*CMAKE_SYSROOT' . | xargs -r grep -L -e 'CMAKE_LIBRARY_ARCHITECTURE'`
     lists the toolchain file: the finding. Empty output from either is the pass.
   - Rationale: measured on 3.31.12, 4.3.4 and 4.4.2 with zig cc 0.16.0-dev.
     Without it, the modes CMK-TC-08 already requires turn a silent host copy
     into "Could not find" for a package the sysroot holds. A GNU cross
     compiler whose implicit link line names the multiarch directory may
     detect it on its own (not measured here, no cross gcc on the host).
3. **CMK-PKG-01 (amendment, the lock-of-record list; borderline).**
   - Rule: "A tree that calls `CPMUsePackageLock` treats that file as CPM's
     pin of record. A version changes in the lock, or the entry is deleted and
     regenerated with the `cpm-update-package-lock` target, never only in
     `CPMAddPackage`."
   - Verification: `grep -rn --include='CMakeLists.txt' --include='*.cmake' --exclude='CPM.cmake' --exclude='cpm-package-lock.cmake' --exclude-dir='_deps' -e 'CPMUsePackageLock' .`.
     Empty output is not applicable. Otherwise each `CPM_PACKAGE_<name>_VERSION`
     cache line equals the version its `CPMAddPackage` call names.
   - Rationale: measured on 3.31.12, 4.3.4 and 4.4.2 (B1). The only signal is
     one ungated warning. If the consolidator prefers not to extend a MUST row,
     the same text fits CMK-DEP-10 (SHOULD), which already says the first
     declaration wins.

B2 and B3 add no MUST row: they are triage reads and failure modes. B2's CI
guard is CMK-DEP-32's assertion, once its check reads the CPM cache lines.

## Wave 6 applied (2026-09-26)

Applier: opus. Files edited: `skills/cmake-dependency-triage/SKILL.md` (500
lines, cap 500) and `references/reading-the-answers.md` (300 lines, cap 300).
`check-artifacts.py` with the six `--forbid` flags: `clean`, exit 0. No cmake
fence was edited, so gersemi was not run.

### Spot checks (re-run, `$S/spot-apply.sh`, output `$S/spot-apply.out`, exit 0)

| Claim | Command, version | Result |
|---|---|---|
| A: bundled spdlog beside fmt 11.1.4 | `cmake --fresh` then `cmake --build` on `A/app` and `A/app2`, 4.4.2 | `app`: configure 0, build 1, `undefined symbol: spdlog::details::log_msg::log_msg` and `did you mean`. `app2`: build 0, run 0, `FMT_VERSION 120100`, `v11=0 v12=242`. External spdlog: both 0, `FMT_VERSION 110104`, `v11=237 v12=0`. Macro grep: 2 hits bundled, 1 hit external. Reproduced |
| C: empty `CMAKE_LIBRARY_ARCHITECTURE` hides the multiarch sysroot | the four toolchains × two consumers, 4.4.2 and 3.31.12 | Original: configure 0, build 1, `is incompatible with aarch64linux`, `set(CMAKE_C_LIBRARY_ARCHITECTURE "")`. `-only`: configure 1, `Could not find a package configuration file provided by "expat"` and `Could NOT find EXPAT (missing: EXPAT_LIBRARY)`. `-only-arch` and `-arch`: configure 0, build 0, copy under `sysroot/usr/lib/aarch64-linux-gnu`. Module mode prints `found suitable version "2.8.5"` with the host library. Reproduced on both lines |
| B1: lock beats bumped `CPMAddPackage`, redirect event | `B/lock` fresh configure, build, run, then with `--debug-find-pkg=fmt`, 4.4.2 | Configure 0, `CPM: Adding package fmt@12.0.0 (12.0.0)`, one `Requires a newer version` warning, binary `FMT_VERSION 120000`. Events 0 without the flag, 1 with it (`path` in `pkgRedirects`, `version: ""`), 0 `The file was found at`. `B/fcref` control: 0 and 1. Reproduced |

Also confirmed from the ledger's `run.out`: B2 (`-U fmt_DIR` and `unset` keep
12.1.0, `CPM_USE_LOCAL_PACKAGES:BOOL=ON` cached) and B3 (`is dirty` warning,
edited copy built on 3.31.12 and 4.4.2).

### Changed in the skill

- Step 3 and failure mode 10 (F4): "logs no event" corrected to "an event only
  under `--debug-find-pkg`, blank found version". References FetchContent row 3
  likewise.
- Step 1: the grep gains `CPM_PACKAGE_`, `CPM_USE_LOCAL_PACKAGES` and
  `CPM_SOURCE_CACHE`. Three CPM rows sit before the "not under the current
  hint" row (B2-c took that row in the measurer's order). The `pkgRedirects`,
  Find-module and last rows name CPM, the module cache lines and T14.
- Step 2: `The item was found at` bullet. Step 3: a Find module's version is
  the one it parsed.
- T1: the toolchain bullet folded into the stale-cache bullet (detail stays in
  the references). The rooted bullet now says "starts with a root", and a new
  bullet covers a `_DIR` outside every root in a cross build, with the measured
  `CMAKE_LIBRARY_ARCHITECTURE` cause (CMK-TC-08). The `_ROOT`/`find_program`
  paragraph is dropped from T1 (verbatim in the references' toolchain section).
- T2: a hit only inside `CPM.cmake` means no override declare.
- T11: a static or header copy is T14.
- New T14 (bundled copies, cites CMK-DEP-33) and T15 (CPM declarations, the
  cached option and `git status` on the source copy).
- T5 and T6 merged. T3, T4, T8, T9 and T13 shortened where the references
  already hold the detail. T12 kept in SKILL.md (the measurer moved it to a
  references heading that does not exist, which would have cost 20 depth-file
  lines). The re-check list stays in SKILL.md with CPM.cmake 0.43.2 and zig cc
  0.16.0-dev added. Pinned defaults keep the vcpkg-port 3.5 exception that the
  measurer's merged row dropped.
- MUST table row 12: CMK-DEP-33.
- Failure modes 16 to 19 added. Existing failure modes reflowed to one line
  each, the shape items 3, 6, 7 and 10 already had.
- References: `Bundled copies` and `CPM` sections, a Module-mode bullet, a
  cross-build row under Toolchain-injected paths, the declare grep gains
  `CPMDeclarePackage` and `CPMUsePackageLock`, and the header names CPM.cmake
  0.43.2 and zig cc 0.16.0-dev.

### New failure modes (all in SKILL.md)

- 16 bundled copy (candidate 1).
- 17 CPM copy read from the `CPMAddPackage` call (candidates 2 to 5).
- 18 unrooted host copy read as "a rooted copy won", with the empty
  `CMAKE_LIBRARY_ARCHITECTURE` cause (candidates 6 and 7).
- 19 Find module's reported version taken as the linked copy's (candidate 8).

### Rule decisions (handed back, the rule files are not the applier's)

- **CMK-DEP-33, new MUST** in `rules/cmake-build/dependencies.md`. Passes the
  bar: a correctness defect (two copies of one library in one link, silent
  version substitution with exit 0), measured on three CMake lines, invisible to
  every configure record the rule set treats as provenance. SKILL.md T14 and the
  MUST table cite it, so the topic map's note 3.1 list grows to 12 rows.
- **CMK-TC-11, new SHOULD** in `rules/cmake-build/toolchains-and-providers.md`
  (the ledger's candidate 2, downgraded from a clause on the CMK-TC-08 MUST
  row). Both failures it prevents are loud (a link error or "Could not find"),
  and it was measured with zig cc only.
- **CMK-DEP-10 verification** gains `CPMDeclarePackage` and its rationale the
  lock measurement (the ledger's candidate 3, placed where the ledger itself
  offered).
- **CMK-DEP-17 verification** "a redirect logs no event" corrected as in F4.

### Rejected

- CMK-PKG-01 amendment (candidate MUST 3): PKG-01 lists which mechanisms need a
  lock-of-record entry, and CPM is already listed (CMK-DEP-01 to CMK-DEP-03). A
  lock losing to or beating a call is first-declaration-wins, CMK-DEP-10's
  subject, so the text goes there as SHOULD.
- CMK-TC-08 MUST clause (candidate MUST 2): downgraded to the SHOULD row above,
  reasons given there.
- A rule row for B3's shared `CPM_SOURCE_CACHE` edit: one rare trigger, and
  the triage read (T15's `git status`) plus CMK-DEP-16 cover it. The measurer
  proposed none either.
- The measurer's moves of T12, the T5 "3.5 on the command line" detail, the
  re-check list and T11's cJSON figures into new references text: the depth
  file had 33 lines of room, all needed for the new sections. T12 and the
  re-check list stay in SKILL.md, the cJSON figures stay in T11.
- T15 citing CMK-PKG-01: replaced by CMK-DEP-32, which is the CI guard B2 needs.

Convergence: not converged. This wave added one MUST row (CMK-DEP-33, handed
back) and four failure-mode entries covering the ledger's eight candidates.

## Handbacks applied (2026-09-26)

Applier: opus (handback wave). Re-ran `$S/spot-apply.sh`, output
`$S/spot-handback.out`, exit 0, identical to `spot-apply.out` apart from log
timestamps (cmake 4.4.2 and 3.31.12). `check-artifacts.py` with the six
`--forbid` operands: `clean`, exit 0.

| Handback | Re-run result | Applied |
|---|---|---|
| CMK-DEP-33 (new MUST) | A: bundled link exit 1, `fmt::v11` signature with "did you mean" the `fmt::v12` one. Other order exit 0, runs FMT_VERSION 120100, v11=0 v12=242. External build v11=237 v12=0. Bundled pair grep prints two lines, external pair one | row inserted after CMK-DEP-32. The rationale names the `fmt::v11` signature as the link error prints it |
| CMK-DEP-17 redirect events | B1: 0 events without `--debug-find-pkg`, 1 with it and `version: ""` (CPM lock and `fcref`, 4.4.2) | verification parenthesis replaced as handed back |
| CMK-DEP-10 CPM lock | B1: `CPM: Adding package fmt@12.0.0`, "Requires a newer version of fmt (12.1.0)", configure 0, build 0, app prints FMT_VERSION 120000 | rationale sentence and the `-e 'CPMDeclarePackage\('` alternative added |
| E8 grep | on `C/`: lists `toolchain-aarch64.cmake` and `toolchain-aarch64-only.cmake`, not the two `-arch` files. `find` on the fixture sysroot prints `aarch64-linux-gnu` | added inside the fence after E7 |
| CMK-TC-11 (new, SHOULD) | C: no triplet `BOTH` links the host lib ("incompatible with aarch64linux"), `ONLY` alone "Could not find", `ONLY` plus triplet finds the sysroot copy. `CMakeCCompiler.cmake`: `set(CMAKE_C_LIBRARY_ARCHITECTURE "")` | row inserted after CMK-TC-10. The verification binds `SYSROOT=/opt/sysroots/aarch64` (section 7). Cited beside CMK-TC-08 in SKILL.md's cross bullet and the references' cross-build row, no line added |
| topic-map note 3.1 (DEP-33 in the triage list) | not re-run (a count) | not applied: `.agents/research/cmake-topic-map.md` is outside this applier's files. Returned as a handback. DEP-33 landed, so SKILL.md row 12 and T14's citation stay |
