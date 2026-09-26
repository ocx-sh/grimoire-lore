---
title: "CMK-BZL under a real Bazel wrap (wave 4)"
date: 2026-09-26
bazel: 9.2.0
rules_foreign_cc: 0.16.0
rules_cc: 0.2.18 (bzlmod-resolved; see Environment notes)
conan: 2.32.0
---

# CMK-BZL under a real Bazel wrap (wave 4)

Every `CMK-BZL` MUST/SHOULD row in `rules/cmake-build/bazel-seam.md` was
re-run as a **real** `rules_foreign_cc` `cmake()` wrap under a **real**
Bazel 9.2.0, from `/home/mherwig/.cache/bazel-measure-scratch/cmake-bzl/`.
Everything the consolidation (`cmake-bazel-seam.md`) had marked
"simulation only" or "unmeasured under real Bazel" was re-measured here.
`run.sh` in the scratch directory reproduces every command below; fixtures
live under `ws/fixtures/`.

## Environment notes (read before the verdicts)

- This host has no `g++`/`cc1plus`. `rules_cc` 0.2.18's autoconf-based host
  toolchain autodetection unconditionally compiles a C++ "checker"/
  "module_parser" tool on first analysis of *any* `cc_*` or `foreign_cc`
  target — even for a C-only wrap — so a working C++ compiler was
  unavoidable (see Candidate new failure modes #4). `CC` was set to a local
  wrapper, `zig-cxx-gnu.sh` (`zig c++ -target native-native-gnu
  -D_GNU_SOURCE`), not the plain `zig-cxx-wrapper.sh` handed to this task:
  plain `zig c++` defaults to a **musl** target, which breaks gnulib/GNU
  Make/pkgconf sources rules_foreign_cc 0.16.0 also needs to bootstrap from
  source (`dirent`/`eaccess` mismatches). `-target native-native-gnu` fixed
  that.
- `rules_cc` resolved to **0.2.18**, not the BCR-newest 0.2.25 first pinned:
  Conan's generated `conan_deps.MODULE.bazel` (CMK-BZL-14) declares its own
  `bazel_dep(name = "rules_cc", version = "0.2.17")`, which cannot coexist
  with a second explicit `bazel_dep(name = "rules_cc", ...)` on the same
  repo name in the root module (hard error, not a warning). The direct pin
  was deleted from the root `MODULE.bazel`; Bzlmod's MVS then resolved
  `rules_cc` to 0.2.18 from `rules_foreign_cc`'s own transitive requirement,
  which satisfies both. See Candidate new failure modes #1.
- CMake tags confirmed present and correct: `ocx package exec
  kitware/cmake:{3.31,4.0,4.1,4.2,4.3,4.4} -- cmake --version` →
  3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2. `ninja-build/ninja` → 1.13.2.
  None of these were used directly inside the wrap — `rules_foreign_cc`
  provisions its own CMake (see CMK-BZL-08).
- `uvx conan==2.32.0 --version` worked, so the BazelDeps/Bzlmod round trip
  was run (CMK-BZL-14).

## Verdict table

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| CMK-BZL-01 | No-network configure+build+install given only `-D` cache entries | **CONFIRMED** | `fixtures/violate-01`, `fixtures/fix-01` |
| CMK-BZL-02 | Caller-supplied `CMAKE_TOOLCHAIN_FILE` must be honoured, unguarded `set()` beats it silently | **CONFIRMED** | `fixtures/violate-02`, `fixtures/guarded-02` |
| CMK-BZL-03 | Never overwrite `CMAKE_<LANG>_FLAGS`; PIC is flag-delivered | **PARTLY** — clobbering confirmed, downstream PIC-link failure not reproducible here | `fixtures/pic-violate`, `fixtures/pic-compliant`, standalone zig probe |
| CMK-BZL-04 | Absolute `install()` `DESTINATION` writes outside the Bazel-managed prefix | **CONFIRMED, mechanism refined** — real Bazel fails loudly, not silently | `fixtures/violate-04`, `fixtures/violate-04b` |
| CMK-BZL-05 | Installed Config/Targets/headers must carry no source/build/install path | **CONFIRMED** | `fixtures/violate-05`, `fixtures/compliant` export |
| CMK-BZL-06 | Install real files, never symlinks (rules_foreign_cc#1129) | **CONFIRMED under real Bazel** (resolves open question 1: yes, exactly as M7 predicted) | `fixtures/compliant` (violates it), `fixtures/fix-06`, `fixtures/consume-compliant` |
| CMK-BZL-07 | Library type must come from a cache entry, never hard-coded | **CONFIRMED** | `fixtures/violate-07`, `fixtures/fix-07` |
| CMK-BZL-08 | `cmake_minimum_required` floor ≤ the wrapper's provisioned CMake (3.31.12); CPS guarded | **CONFIRMED** (also answers the "which CMake does rules_foreign_cc use by default" question: **3.31.12**) | `fixtures/violate-08`, `fixtures/violate-08-cps` |
| CMK-BZL-09 | Build+test both descriptions in CI | **NOT OBSERVABLE IN A WRAP** — a CI/reporting rule, not a `cmake()` build behaviour | — |
| CMK-BZL-10 | One source of truth for dependency versions | **NOT OBSERVABLE IN A WRAP** | — |
| CMK-BZL-11 | Treat a generated file as derived | **NOT OBSERVABLE IN A WRAP** | — |
| CMK-BZL-12 | Report "not knowable" when the CMake side has no version token | **NOT OBSERVABLE IN A WRAP** | — |
| CMK-BZL-13 | Never derive a Bazel label from a CMake target name | **NOT OBSERVABLE IN A WRAP** | — |
| CMK-BZL-14 | Conan `BazelDeps` reaches Bazel via `include()` under Bzlmod, root module only | **CONFIRMED end to end** (resolves "needs another research round" item 3) | `conan-test/`, `fixtures/conan-consumer` |
| CMK-BZL-15 | vcpkg has no Bazel bridge | **NOT OBSERVABLE IN A WRAP** — static grep over a vcpkg checkout, not attempted (no checkout on hand; out of this wave's scope) | — |

Counts: **6 confirmed** (01, 02, 05, 06, 07, 08), **2 confirmed-with-refinement** (04, 14 — both confirmed but each surfaced a new failure mode), **1 partly** (03), **6 not observable in a wrap** (09, 10, 11, 12, 13, 15), **0 refuted**.

## Per-row evidence

### CMK-BZL-01 — no network

```sh
./run.sh build //fixtures/violate-01:mylib   # exit 1
./run.sh build //fixtures/fix-01:mylib       # exit 0
```

`violate-01` declares an unrouted `FetchContent_Declare(... GIT_REPOSITORY
https://github.com/...)`. Under the real `cmake()` action's `block-network`
sandbox:

```
Cloning into 'dep-src'...
fatal: unable to access 'https://github.com/octocat/Hello-World.git/':
Failed to connect to github.com port 443 ... Could not connect to server
...
CMake Error ... Failed to clone repository
Target //fixtures/violate-01:mylib failed to build
```

`fix-01` adds `set(FETCHCONTENT_SOURCE_DIR_DEP "${CMAKE_CURRENT_SOURCE_DIR}/local-dep" CACHE PATH "" FORCE)`
before the same `FetchContent_Declare`; configure completes with **no**
network attempt at all and the build succeeds. Confirms the doc's rationale
line by line under a real sandboxed Bazel action, not a `unshare -rn`
stand-in.

### CMK-BZL-02 — caller toolchain file

```sh
./run.sh build //fixtures/violate-02:mylib   # exit 1
./run.sh build //fixtures/guarded-02:mylib   # exit 0
```

`violate-02`'s `CMakeLists.txt` does an unconditional
`set(CMAKE_TOOLCHAIN_FILE .../bogus-tc.cmake)` before `project()`, where
`bogus-tc.cmake` points `CMAKE_C_COMPILER` at `/nonexistent/...`. Bazel's own
`cmake()` invocation passes `-DCMAKE_TOOLCHAIN_FILE=.../crosstool_bazel.cmake`
on the command line (visible in the build log), yet the project's file wins
with **no warning**:

```
-- PROJECT_TOOLCHAIN_LOADED
-- PROJECT_TOOLCHAIN_LOADED
-- The C compiler identification is unknown
CMake Error at CMakeLists.txt:5 (project):
  The CMAKE_C_COMPILER: /nonexistent/not-a-real-compiler is not a full path
  to an existing compiler tool.
```

`guarded-02` wraps the same `set()` in `if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)`;
Bazel's `-D` already defines the cache entry, so the guard is never entered
and the build succeeds using Bazel's own crosstool. Exactly the mechanism the
rule describes, now observed against a real, Bazel-generated
`crosstool_bazel.cmake`, not a hand-authored stand-in.

### CMK-BZL-03 — flags/PIC

```sh
./run.sh build //fixtures/pic-violate:mylib //fixtures/pic-compliant:mylib \
  --sandbox_debug   # both exit 0
```

Structure: a `STATIC` `inner` lib linked into a `SHARED` `mylib`.
`pic-violate` does `set(CMAKE_C_FLAGS "-O2")` before `add_library(inner
STATIC ...)`; `pic-compliant` uses `target_compile_options(inner PRIVATE
-O2)` instead. Reading the actual verbose compiler invocations
(`CMAKE_VERBOSE_MAKEFILE=ON`, `bazel-bin/.../mylib_foreign_cc/CMake.log`):

```
# pic-compliant (inner.c):
zig-cxx-gnu.sh  -U_FORTIFY_SOURCE -fstack-protector -Wall ... -fPIC ...
  -O3 -DNDEBUG -O2 -c .../inner.c
# pic-violate (inner.c):
zig-cxx-gnu.sh  -O2 -O3 -DNDEBUG -c .../inner.c
```

**Confirmed**: `set(CMAKE_C_FLAGS "-O2")` really does discard the wrapper's
entire `_INIT`-seeded flag set, `-fPIC` included, under a real Bazel wrap —
this is the flag-clobbering mechanism CMK-BZL-03 claims, now seen against
Bazel's real `_INIT` seed rather than a hand-written stand-in.

**Not reproducible here**: both builds still *link* successfully. A
standalone probe explains why —

```sh
$ zig-cxx-gnu.sh -fno-pic -c inner.c -o inner.o
error: unable to create module 'inner': the selected target requires
position independent code
```

zig's `native-native-gnu` target hard-requires PIC codegen and refuses
`-fno-pic` outright, so dropping the `-fPIC` flag never actually produces
non-PIC object code in this environment. The link-failure half of
CMK-BZL-03 cannot be exercised on a host whose C compiler is a Clang-based
stand-in for a missing GCC (see Candidate new failure modes #3). Verdict:
**partly** — the rule and its rationale stand, but this specific harness
cannot confirm the consequence, only the cause.

### CMK-BZL-04 — absolute destination

```sh
./run.sh build //fixtures/violate-04:mylib    # exit 1 (unwritable)
./run.sh build //fixtures/violate-04b:mylib   # exit 1 (writable, still caught)
```

`violate-04` installs to `/opt/mylib-abs-out`, outside every sandbox-writable
root:

```
CMake Error at cmake_install.cmake:54 (file):
  file cannot create directory: /opt/mylib-abs-out.  Maybe need
  administrative privileges.
```

This is **louder**, not silent — the doc's rationale ("nothing ever reports
it") describes the CMake/Bazel-declaration mechanics, not the sandbox's own
filesystem permissions. `violate-04b` installs to an absolute path the
sandbox *does* allow writes to
(`/home/mherwig/.cache/bazel-measure-scratch/cmake-bzl/silent-out`, added via
`--sandbox_writable_path`): the install step succeeds and writes a real file
to that path on the host disk outside any Bazel-tracked output —

```
-- Installing: /home/.../silent-out/libmylib.a
...
rules_foreign_cc: missing expected installed output: lib/libmylib.a
rules_foreign_cc: expected output validation failed
Target //fixtures/violate-04b:mylib failed to build
```

— but the build still fails, because `rules_foreign_cc`'s own **output
validation** (comparing the install tree against `out_static_libs`) catches
the missing declared output. Verdict: **confirmed as MUST, refined**: the
rule is right to forbid absolute destinations, but the failure mode is
"loud build error" in both the unwritable and writable-but-escaping cases,
never the fully silent pass-with-lost-artifact the current rationale
implies — except for the real side effect that a stray file lands on the
host filesystem outside Bazel's purview (see Candidate new failure modes
#2).

### CMK-BZL-05 — no embedded paths

```sh
./run.sh build //fixtures/violate-05:mylib   # exit 0
grep -rn "$(pwd)" bazel-bin/fixtures/compliant/copy_mylib/mylib/lib/cmake/mylib/
# empty = pass
```

The plain `install(EXPORT)` in `fixtures/compliant` is relocatable — its
generated `mylibTargets.cmake` carries no absolute path (confirmed by
`grep`). `violate-05` uses `configure_file(config.h.in mylib_config.h)` to
bake `@CMAKE_CURRENT_SOURCE_DIR@` into an installed header; the build
succeeds, but the installed file reads:

```
#define MYLIB_SOURCE_DIR ".../out/58b0.../sandbox/linux-sandbox/3810/execroot/_main/fixtures/violate-05"
```

— the exact ephemeral per-action sandbox path the rule warns disappears
after the action. **Confirmed.**

Side note: because `fixtures/compliant`'s `BUILD.bazel` declares only
`out_static_libs`/`out_include_dir`, the export files it installs
(`mylibTargets.cmake` etc.) land in an internal `copy_mylib` action's tree
and are **not** part of `:mylib`'s own provided outputs — a live
demonstration of the row's own rationale ("a produced file that no
attribute names never becomes a Bazel output").

### CMK-BZL-06 — no symlinked installs (rules_foreign_cc#1129)

```sh
./run.sh build //fixtures/compliant:mylib
find -L bazel-bin/fixtures/compliant/mylib -type l   # (via ls -la)
./run.sh build //fixtures/fix-06:mylib
find bazel-bin/fixtures/fix-06/mylib -type l -lname '/*'   # empty
./run.sh run //fixtures/consume-compliant:consumer   # exit 0, prints answer=42
```

This resolves the consolidation's open question 1 ("does #1129 fail exactly
as M7's symlink farm predicted, under real Bazel?"): **yes.**
`fixtures/compliant` (which does a plain `install(DIRECTORY include/ ...)`
with no `file(REAL_PATH)`) installs its header as an absolute symlink
*escaping the declared prefix*, pointing back at Bazel's own execroot:

```
lrwxrwxrwx 1 mherwig mherwig 139 ... mylib.h ->
  /home/.../out/58b0.../execroot/_main/fixtures/compliant/include/mylib.h
```

No project-authored symlink farm was needed — Bazel's own sandboxed source
tree is already symlinked, so any ordinary `install(FILES)`/`install(DIRECTORY)`
of project headers reproduces the bug for free. `fixtures/fix-06` resolves
through `file(REAL_PATH)` before `install(FILES ... RENAME mylib.h)` and
installs a real, non-symlink file instead — confirmed empty
`find -lname '/*'`.

Caveat: a downstream consumer (`consume-compliant`) still builds and runs
fine **locally**, because the symlink's target (the real workspace source
file) stays on disk for the life of the output base. The actual breakage
`rules_foreign_cc#1129` reports ("invalid symlink" downloading a
TreeArtifact) needs a remote-execution or remote-cache round trip this
harness has no access to, so that specific downstream failure is inferred
from the upstream issue, not independently reproduced here. The structural
defect — an absolute symlink escaping the declared install prefix — is
fully confirmed.

### CMK-BZL-07 — library type from a cache entry

```sh
./run.sh build //fixtures/violate-07:mylib   # exit 1
./run.sh build //fixtures/fix-07:mylib       # exit 0
```

`violate-07` hard-codes `add_library(mylib STATIC ...)` while the wrap
requests `cache_entries = {"BUILD_SHARED_LIBS": "ON"}` and
`out_shared_libs = ["libmylib.so"]`:

```
rules_foreign_cc: missing expected installed output: lib/libmylib.so
rules_foreign_cc: other files in the same directory (max 5): libmylib.a
rules_foreign_cc: expected output validation failed
```

`fix-07` uses plain `add_library(mylib src/mylib.c)` (no STATIC/SHARED
keyword) and installs `libmylib.so` as requested. **Confirmed**, and louder
than "SHOULD, rationale only from source" suggested — `rules_foreign_cc`'s
own validation catches it as a clean build failure.

### CMK-BZL-08 — the wrapper's own CMake version

```sh
./run.sh build //fixtures/violate-08:mylib       # exit 1
./run.sh build //fixtures/violate-08-cps:mylib   # exit 1
```

Every wrap in this ledger ran through
`external/rules_foreign_cc++tools+cmake-3.31.12-linux-x86_64/bin/cmake` with
no `tools.cmake(...)` override in `MODULE.bazel` — **confirming the BZL-08
table question**: rules_foreign_cc 0.16.0's default provisioned CMake under a
real Bazel 9.2.0 build is **3.31.12**, exactly as the consolidation's
source-read claimed.

`violate-08` sets `cmake_minimum_required(VERSION 4.1)`:

```
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  CMake 4.1 or higher is required.  You are running version 3.31.12
```

`violate-08-cps` adds an **unguarded** `install(PACKAGE_INFO mylib EXPORT
mylibTargets)`:

```
CMake Error at CMakeLists.txt:11 (install):
  install does not recognize sub-command PACKAGE_INFO
```

Both fail exactly as the consolidation's simulation (M1, M1b) predicted, now
under a real Bazel-provisioned CMake.

### CMK-BZL-09..13, -15 — not observable in a wrap

These bind CI wiring, drift reporting, and cross-repo label/version mapping
— properties of a *dual repository's own CI and documentation*, not of a
single `cmake()` action. No `cmake()` wrap surfaces them; they need reading
CI configs and multiple repos' sources, which the consolidation and dual
dive already did. Nothing new to add from this wave.

### CMK-BZL-14 — Conan BazelDeps under Bzlmod

```sh
cd conan-test && CONAN_HOME=.../conan-home uvx conan==2.32.0 install . \
  --output-folder=conan-out --build=missing   # exit 0
./run.sh build //fixtures/conan-consumer:conan_zlib_consumer   # exit 0
./run.sh run   //fixtures/conan-consumer:conan_zlib_consumer   # exit 0, "zlib version: 1.3.1"
```

This resolves "needs another research round" item 3 end to end:

1. `conanfile.txt` with `zlib/1.3.1` and `generators = BazelDeps,
   BazelToolchain`, installed with Conan 2.32.0, produces
   `conan_deps.MODULE.bazel` (the generated file's own header: `# Include in
   your MODULE.bazel file with: include("//conan:conan_deps.MODULE.bazel")`),
   `conan_deps_module_extension_rules_cc.bzl`, and a `BUILD.rules_cc.bazel`
   declaring `cc_import`/`cc_library` targets for zlib — exactly the shape
   the consolidation's source-read described.
2. Copied into `ws/conan/` and wired via `include("//conan:conan_deps.MODULE.bazel")`
   in the **root** `MODULE.bazel`, a `cc_binary` depending on `@zlib//:zlib`
   **builds and runs** under Bazel 9.2.0, printing `zlib version: 1.3.1`.
3. **New failure mode** (not in the consolidation): the generated file's own
   `bazel_dep(name = "rules_cc", version = "0.2.17")` cannot coexist with any
   other explicit `bazel_dep(rules_cc, ...)` already in the root module —
   Bazel treats `include()` as literal text splicing, so this is a hard
   "repo name already defined" error, not a warning. Since `rules_cc` is a
   near-universal direct dependency (this ledger's own `MODULE.bazel` had
   one for `rules_foreign_cc`'s sake), **any real root module that also
   pins `rules_cc` directly must delete that pin** before wiring Conan's
   `include()`, and rely on Bzlmod's version resolution to still satisfy
   both requirements (confirmed: resolved to 0.2.18, satisfying
   `rules_foreign_cc`'s ≥0.2.18 bound and Conan's ≥0.2.17 bound, with only a
   `--check_direct_dependencies` version-mismatch **warning**, not an
   error).

`BazelToolchain`'s `conan_bzl.rc` was generated but not exercised (this
fixture builds against the host's own C toolchain via `cmake()`-unrelated
`cc_binary`, not through Conan's toolchain config) — the include()/BazelDeps
half was the open question, and that half is now fully confirmed.

## Candidate new failure modes

1. **Conan's `conan_deps.MODULE.bazel` collides with an existing direct
   `bazel_dep(rules_cc, ...)`.** `include()` splices text into the same
   file, so two `bazel_dep` declarations for the same repo name is a hard
   configuration error, not a warning. Any root module that both wires
   Conan's `BazelDeps` output *and* directly depends on `rules_cc` (common,
   since `rules_foreign_cc`, `rules_python`, and most C/C++ rulesets pull it
   in) must delete its own direct pin first. Repro:
   `ws/MODULE.bazel` history in this ledger's scratch (git-untracked, kept
   as evidence) plus the error transcript above.
2. **An absolute (or otherwise prefix-escaping) `install()` `DESTINATION`
   that happens to land in a sandbox-writable path leaks a real file onto
   the host disk outside any Bazel-tracked output, even though the build
   still fails.** The failure is loud (rules_foreign_cc's own output
   validation), but the stray file is a genuine hermeticity leak an agent
   cleaning up after a failed build could miss. Repro: `fixtures/violate-04b`.
3. **A Clang-based C compiler substituted for a missing GCC can mask
   CMK-BZL-03's PIC failure mode entirely.** zig's `native-native-gnu`
   target hard-requires position-independent code and rejects `-fno-pic`
   outright, so any host that lacks a real GCC and stands in a Clang-family
   compiler cannot exercise (or verify a fix for) the flag-clobber-breaks-PIC
   failure — a graded check against such a host will read "compliant" for
   both the violating and the fixed fixture. Repro: standalone
   `zig-cxx-gnu.sh -fno-pic` probe above.
4. **`rules_cc` 0.2.18's autoconf-based host-toolchain autodetection
   unconditionally compiles and runs a C++ "capability checker" tool (plus
   bootstraps `gnulib`, GNU Make, `pkgconf`, and `m4` from source) the first
   time *any* `cc_*` or `foreign_cc` target is analyzed — regardless of
   whether the wrapped project is C-only.** A host with a working C compiler
   but no C++ frontend at all (this host's exact starting condition) cannot
   build *anything* under current `rules_foreign_cc`/`rules_cc`, C-only wrap
   included, without a working C++ compiler standing in somewhere. This is
   new information for anyone assuming "C-only project, C-only compiler
   needed."

## Candidate new MUST rows

None proposed outright — severity calls belong to the owner, not this
ledger. Two things worth the owner's attention when `bazel-quality`'s
pointer patch (Authoring notes §11) is applied or CMK-BZL is next revised:

- **CMK-BZL-06** was SHOULD specifically because it was "not yet observed
  under a real Bazel." That condition no longer holds — it is now observed,
  reproducibly, from an ordinary `install(DIRECTORY)` with zero extra setup.
  Whether that changes MUST/SHOULD is the owner's call; the evidence gap
  that justified SHOULD is closed.
- **CMK-BZL-14**, if promoted out of SHOULD/zero-adopters, should carry the
  `rules_cc` collision (Candidate new failure modes #1) as a precondition
  clause, not just the `include()`/root-module restriction it already
  states.

## Convergence read

Every MUST/SHOULD row that a `cmake()` wrap can exercise now has a real,
non-simulated Bazel measurement (6 confirmed outright, 2 confirmed with a
mechanism refinement, 1 partly). No row was refuted. Both items on the
file's "Unmeasured as of 2026-09-26" list are closed: the default
provisioned CMake is confirmed as 3.31.12, and the #1129 symlink defect is
confirmed to manifest exactly as the simulation predicted. The four
candidate failure modes are properties of *this measurement environment and
Conan's generator*, not of the CMK-BZL ruleset's own claims — none of them
contradicts a shipped rule. This wave adds no new MUST rule and confirms
rather than refutes the existing ruleset: consistent with wave 4 being a
convergence wave.

## Wave 4 applied (2026-09-26)

Applier edited only `rules/cmake-build/bazel-seam.md` (203 to 213 lines). Checker
`check-artifacts.py ... rules/cmake-build.md` printed `clean`, exit 0. No cmake fence was
edited, so gersemi was not run.

### Spot checks (re-run from `run.sh`, Bazel 9.2.0, rules_foreign_cc 0.16.0)

Wrap actions were forced to re-execute with `--action_env=SPOTCHECK=applier1`
(`2 linux-sandbox` processes per build, the bootstrap stayed cached).

1. CMK-BZL-06, reproduced. `./run.sh build //fixtures/compliant:mylib //fixtures/fix-06:mylib`, exit 0.
   `find bazel-bin/fixtures/compliant/mylib -type l -lname '/*'` printed
   `.../compliant/mylib/include/mylib.h` (link into `execroot/_main/fixtures/compliant/include/mylib.h`).
   The same find over `fix-06` printed nothing. The CMake.log names
   `external/rules_foreign_cc++tools+cmake-3.31.12-linux-x86_64/bin/cmake` (CMK-BZL-08, also reproduced).
2. CMK-BZL-03 flag drop, reproduced. `./run.sh build //fixtures/pic-violate:mylib //fixtures/pic-compliant:mylib`, exit 0.
   The `inner.c` compile line in `pic-violate` reads `zig-cxx-gnu.sh -O2 -O3 -DNDEBUG ... -c .../inner.c`,
   and in `pic-compliant` it carries the seed including `-fPIC`.
3. CMK-BZL-14, reproduced. `./run.sh run //fixtures/conan-consumer:conan_zlib_consumer`, exit 0,
   `zlib version: 1.3.1`. With `bazel_dep(name = "rules_cc", version = "0.2.18")` appended to
   `ws/MODULE.bazel` and `--lockfile_mode=off`, exit 48:
   `Error in bazel_dep: The repo name 'rules_cc' cannot be defined by a bazel_dep at .../MODULE.bazel:12:10 as it is already defined by a bazel_dep at .../conan/conan_deps.MODULE.bazel:4:10`.
   `MODULE.bazel` and its lock were restored from backups afterwards.

### New measurements by the applier

- `fixtures/violate-04c` (new): all declared outputs go to the prefix, one extra
  `install(FILES include/mylib.h DESTINATION <scratch>/silent-out/undeclared)`.
  `./run.sh build //fixtures/violate-04c:mylib --sandbox_writable_path=<scratch>/silent-out`
  exit 0, `Build completed successfully`, and `silent-out/undeclared/mylib.h` exists on the host
  (itself an absolute link into the execroot). So CMK-BZL-04's "no error reports it" holds for an
  undeclared file, and the ledger's "always loud" refinement holds only for a declared `out_*` file.
- `fixtures/fix-06-dir` (new): `file(REAL_PATH "${CMAKE_CURRENT_SOURCE_DIR}/include" INC_REAL)` then
  `install(DIRECTORY "${INC_REAL}/" ...)`. Same build, exit 0, and
  `find bazel-bin/fixtures/fix-06-dir/mylib -type l -lname '/*'` printed `.../include/mylib.h`.
  The farm (`cp -rs` of the fixture, configure, build, install, same find) printed one line on
  `cmake version 3.31.12` and on `cmake version 4.4.2`, every step exit 0. The old CMK-BZL-06 text
  ("resolve ... through `file(REAL_PATH)` before `install(FILES)` or `install(DIRECTORY)`") therefore
  steers an agent to an ineffective fix: the sandbox keeps directories real and links each file.

### Changed rows

- CMK-BZL-03: rationale gains the real-wrap observation (seed carries `-fPIC`, the write drops it).
  Verification gains "a successful link is not a pass: a compiler that always emits PIC links either way".
- CMK-BZL-04: rationale rewritten. A declared `out_*` file sent elsewhere fails with
  `missing expected installed output`, and an undeclared one sent to a writable path passes silently.
- CMK-BZL-05: rule widened from Config/Targets/.pc to any installed file, naming configured headers
  (the ledger's `violate-05`). The verification already grepped the whole prefix.
- CMK-BZL-06: rule text corrected to resolve each file and install with `install(FILES)`, stating that
  resolving a directory changes nothing. Rationale replaces "not yet observed under a real Bazel" with
  both real-wrap measurements. Stays SHOULD: the consumer break needs a remote cache round trip,
  which neither the measurer nor the applier reproduced.
- CMK-BZL-07: rationale gains the real-wrap `missing expected installed output: lib/libmylib.so`.
- CMK-BZL-08: section intro and rationale now carry the measured default 3.31.12 and the in-wrap failures.
- CMK-BZL-14: rule gains "delete the root's own `bazel_dep(name = \"rules_cc\", …)`, never edit the generated
  file". Rationale gains the end-to-end measurement and the collision error. A fourth grep
  (`grep -n -e 'bazel_dep(name = "rules_cc"' MODULE.bazel`) joins the block, and the verification says an
  empty result is the pass once the include is present. Stays SHOULD (zero adopters, WORKSPACE-only docs landing page).
- Wrap Simulation intro, Package Managers intro, Re-check D4 and the "Unmeasured" line updated to match.

### Added

- Failure mode 13 (`bazel-seam.md`): resolving the include directory through `file(REAL_PATH)` and calling the symlink fixed.
- Failure mode 14 (`bazel-seam.md`): editing the generated `conan_deps.MODULE.bazel`, or dropping the include, when it collides with the root's `rules_cc` pin.
- No new MUST row. No severity change.

### Rejected

- Candidate failure mode 2 (stray file on the host from a writable absolute destination): this is CMK-BZL-04's own consequence, now stated in its rationale.
- Candidate failure mode 3 (Clang-based substitute masks the PIC failure): zig-specific, since plain Clang accepts `-fno-pic`. CMK-BZL-03 already checks the flag, not the link, and one clause now says so.
- Candidate failure mode 4 (`rules_cc` autodetection needs a C++ compiler for C-only wraps): a Bazel host-toolchain fact owned by `bazel-quality` (bounded duplication note 3.4), specific to a host with no C++ frontend, and the mechanism was not isolated.
- Promoting CMK-BZL-06 to MUST: the cause is now measured, but the consequence is still inferred from the upstream issue.

### Cleanup

`rm` of the farm trees (`<scratch>/farm-applier/b-*`, `p-*`) was denied by the permission system, like the measurer's
`out/` and `zig-cache/`. The stray `silent-out/undeclared/mylib.h` is kept as evidence. `run.sh` now lists the new fixtures and commands.
