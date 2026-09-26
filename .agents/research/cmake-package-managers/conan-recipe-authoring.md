---
title: "Authoring a Conan 2 recipe for a CMake library"
topic: "cpp-packaging/conan.md (package-managers group, producer side)"
agent: conan-recipe-authoring
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 20
scope: >
  What a Conan 2 recipe (conanfile.py, conandata.yml, test_package) must do to
  build, package and export a CMake-based C++ library correctly for Conan
  Center Index (CCI) or an equivalent internal remote. Producer side only —
  layout(), generate(), package(), package_id(), package_info() naming,
  test_package shape and the CCI-specific recipe conventions (implements,
  version-range allow-list, archived KB-H hook rules). Does not repeat the
  consumer-side rules (CMK-CONAN-01..12: generator choice, tool_requires,
  lockfiles, profile/project cppstd agreement, presets) held stable in
  cmake-package-managers.md, or vcpkg port authoring (a separate wave-3 dive).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The sample](#1-the-sample)
   2. [layout() and cmake_layout](#2-layout-and-cmake_layout)
   3. [generate(): the canonical template still writes CMakeDeps](#3-generate-the-canonical-template-still-writes-cmakedeps)
   4. [package_info() naming: set_property versus names residue](#4-package_info-naming-set_property-versus-names-residue)
   5. [rmdir in package()](#5-rmdir-in-package)
   6. [package_id() for header-only](#6-package_id-for-header-only)
   7. [validate(), compatibility(), and the version-range allow-list](#7-validate-compatibility-and-the-version-range-allow-list)
   8. [implements=[...] versus hand-written fPIC/header-only logic](#8-implements--versus-hand-written-fpicheader-only-logic)
   9. [requires pins and tool_requires](#9-requires-pins-and-tool_requires)
   10. [test_package shape](#10-test_package-shape)
   11. [conandata.yml and sha256](#11-conandatayml-and-sha256)
   12. [required_conan_version: the Conan-1/Conan-2 migration shim](#12-required_conan_version-the-conan-1conan-2-migration-shim)
   13. [The producer-side CPS paths (M-M-09)](#13-the-producer-side-cps-paths-m-m-09)
   14. [replace_requires / platform_requires (M-M-12)](#14-replace_requiresplatform_requires-m-m-12)
   15. [The archived conan-io/hooks KB-H rules](#15-the-archived-conan-iohooks-kb-h-rules)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **The 2026-09-26 canonical CCI template still generates `CMakeDeps`, not `CMakeConfigDeps`** (`docs/package_templates/cmake_package/all/conanfile.py:94-98`, Conan 2.32.0-era docs) — confirms the wave-2 surprise; a recipe author gets no flow split, only CMK-CONAN-04's consumer-side choice applies, and it resolves to `CMakeDeps` because a recipe is not itself a `CMakeConfigDeps`-provider consumer.
- **`layout()` is near-universal (37/40 sampled) and `cmake_layout(self, src_folder="src")` is the CMake-building form (21/22 of the recipes that call `CMakeToolchain`)**; the one exception is a header-only recipe using `basic_layout` correctly, because it never runs a real CMake build (`recipes/trianglemeshdistance/all/conanfile.py:21-22`, corpus SHA `07389b8fa0`).
- **`cpp_info.names`/`filenames` residue is real (3/40 sampled, 246/2,002 whole-tree beside `set_property`) but it is not preserved for a live Conan-1 consumer** — CCI's legacy remote (`center.conan.io`) froze on 2024-11-04 and receives no new recipe revisions ever again (`README.md:31-33`, `docs/changelog.md:3-5`); dropping `names` from an edited recipe today cannot break any Conan-1 install, because that install already cannot see the edit.
- **`package_id()` for header-only is uniform: `self.info.clear()` (15/15 header-only-shaped recipes in the sample), never the removed `self.info.header_only()`.** `implements = ["auto_header_only"]` (CCI, added after the 2.4 line) makes the explicit method unnecessary and is already in the sample (`recipes/trianglemeshdistance/all/conanfile.py:19`).
- **`implements = ["auto_shared_fpic"]` covers only 3/40 sampled recipes**; the majority (22/40) still hand-roll `config_options()`/`configure()` with `rm_safe("fPIC")` or `del self.options.fPIC`. Both are correct; `auto_shared_fpic` is the CCI-recommended default for new recipes (`docs/adding_packages/conanfile_attributes.md:153-157`).
- **`rmdir(lib/cmake)` and `rmdir(lib/pkgconfig)` fire only when the recipe actually calls `cmake.install()` and the upstream `CMakeLists.txt` installs an exported Config or `.pc` file** — 13/22 CMake-building sampled recipes call it; the other 9 either never call `cmake.install()` (headers copied by hand) or the upstream never installs those files. The rule is conditional, not unconditional MUST-for-every-CMake-recipe.
- **`validate()` with `check_min_cppstd()` is near-universal (31/40 sampled)**; `compatibility()` is unused in the sample (0/40) and in the canonical templates — it stays a documented, checkable CONSIDER, not a MUST or SHOULD.
- **Version ranges in `requires()` are not a free choice on CCI: they are prohibited except an explicit, named allow-list** (openssl, cmake, doxygen, libcurl, zlib, libpng, expat, libxml2, libuv, qt5/qt6, c-ares, zstd, ninja, meson, pkgconf, xz_utils — `docs/adding_packages/dependencies.md:57-77`). A range outside that list is a CCI-specific policy violation, distinct from CMK-CONAN-09's general lockfile guidance.
- **`required_conan_version` values as low as `>=1.50.0` beside `from conan import ConanFile` are not stale metadata** — Conan shipped a `conan` top-level package as a migration shim from the 1.2x line onward (`conan-io/conan@1.53.0:conan/__init__.py` re-exports `ConanFile` from `conans.model.conan_file`), so "new-style" recipes genuinely run on both lines. 38/40 sampled recipes declare a floor; the current templates all declare `>=2.0` or `>=2.0.9` (six templates, all `>=2.0.x`), which is the floor for *new* recipes today.
- **`test_package/CMakeLists.txt` follows one fixed six-line shape in 37/38 sampled recipes that build a test binary**: `cmake_minimum_required(VERSION 3.15)`, `project(test_package LANGUAGES CXX)`, `find_package(<Pkg> REQUIRED CONFIG)`, one `add_executable`, one `target_link_libraries(... PRIVATE <Pkg>::<target>)`. The one deviation (`libui`) is a full Conan-1 recipe (`conanbuildinfo.cmake`/`conan_basic_setup()`), the sample's clearest CMK-CONAN-01 violation.
- **`test_package/conanfile.py` generators are `"CMakeDeps", "CMakeToolchain"` plus `"VirtualRunEnv"` in 29/37 sampled files**, gated by `can_run()` (38/40) so a cross-compiled or emulated binary is packaged without being executed.
- **`conandata.yml` with a `sha256` per source entry is universal in the sample (40/40)** — the template's `get(self, **self.conan_data["sources"][self.version], strip_root=True)` pattern is unconditional.
- **Conan 2.32.0 registers an undocumented `CPSDeps` generator** (`conan/internal/api/install/generators.py:39`, `conan/tools/cps/cps_deps.py`) that writes a `build/cps/<config>/cps/*.cps` tree from `self.dependencies.host`; `conan.cps.cps.CPS.load(file).to_conan()` (`conan/cps/cps.py:238,291`) is the read-back side. 0/40 sampled recipes use it; it stays CONSIDER, cite-source-not-docs (M-M-09).
- **`[replace_requires]`/`[platform_requires]` are both marked experimental and Conan's own docs call bare `platform_requires` "very challenging" for a regular library**, recommending a wrapper recipe plus `[replace_requires]` instead (M-M-12). Neither is a MUST-grade "use the system copy" mechanism.
- **The archived `conan-io/hooks` KB-H rules (last useful for Conan 1.x, repo now archived) still name real, checkable shapes** — KB-H016 (CMake modules/config files), KB-H020 (pc-files), KB-H045 (delete options from package_id), KB-H050/051 (default option values) map directly onto measured rows above; KB-H001, KB-H008 and KB-H013 are superseded by mechanisms (`CMakeToolchain`, the dependencies.md allow-list, `layout()`) that postdate the hook.
- **No maintained automated linter replaces the archived hooks for a Conan 2 recipe.** The verification for every producer row below is a grep or a read against the recipe, same as the consumer-side rules (map conflict 5, already decided).

## Findings

### 1. The sample

Deterministic sample of 40 recipes from `conan-io__conan-center-index@07389b8fa0` (`/home/mherwig/.cache/research-lang/exemplars/cmake/conan-io__conan-center-index`), all 2026-09-26 measurements:

```sh
git -C "$CORPUS" ls-tree HEAD:recipes | awk '{print $4}' | sort > recipes_sorted.txt
wc -l recipes_sorted.txt   # 1950
awk 'NR%49==1' recipes_sorted.txt   # N=49 gives exactly 40 rows spread A→X
```
Output (40 names, `7bitconf` … `xxsds-sdsl-lite`), each recipe's `conanfile.py` fetched with `git -C "$CORPUS" show HEAD:recipes/<name>/<version-dir>/conanfile.py` (`all` for 38/40; `b2` uses `standard`, `gdal` uses `post_3.5.0`, the only two without an `all` folder). This whole-tree residue count (2,002 recipe folders; 40 `from conans`, 35 `build_requires`, 270 `cpp_info.names`, 24 without `set_property`, 2,515/6 `CMakeDeps`/`CMakeConfigDeps`) is already measured in `cmake-package-managers.md` and is not re-run here.

### 2. layout() and cmake_layout

```sh
grep -l 'def layout' sample/*.py | wc -l          # 37/40
grep -l 'cmake_layout' sample/*.py | wc -l         # 21/40
grep -l 'CMakeToolchain' sample/*.py | wc -l       # 22/40 (these are the CMake-building recipes)
```
21 of the 22 CMake-building recipes call `cmake_layout`; the one exception, `trianglemeshdistance` (header-only via `implements = ["auto_header_only"]`), calls `basic_layout(self, src_folder="src")` (`recipes/trianglemeshdistance/all/conanfile.py:21-22`) — correct, because a header-only recipe with `implements = ["auto_header_only"]` never runs a real build tree even when it still generates a `CMakeToolchain` to let `install(FILES ...)` run through CMake.

### 3. generate(): the canonical template still writes CMakeDeps

The current (2026-09-26) `docs/package_templates/cmake_package/all/conanfile.py` (required by CCI's own scaffolding tool for new recipes):

```python
def generate(self):
    tc = CMakeToolchain(self)
    tc.cache_variables["PACKAGE_BUILD_TESTS"] = False
    ...
    tc.generate()
    deps = CMakeDeps(self)
    deps.set_property("fontconfig", "cmake_file_name", "Fontconfig")
    deps.set_property("fontconfig", "cmake_target_name", "Fontconfig::Fontconfig")
    deps.generate()
```
(`conan-io__conan-center-index@07389b8fa0:docs/package_templates/cmake_package/all/conanfile.py:84-98`). No `CMakeConfigDeps` anywhere in the template or in the sample (`grep -l CMakeConfigDeps sample/*.py` → 0 hits, confirming the corpus-wide 6/2,515 split already measured). **This settles the map's open DECIDE point**: a recipe author gets no flow-based split (CMK-CONAN-04 is a *consumer* choice); the producer-side generator choice is unconditional — `CMakeDeps`, full stop, because a recipe's own `generate()` never runs inside a `cmake-conan`-provider consumer's configure.

`spdlog`'s dual-mode recipe shows the conditional-toolchain idiom for an optionally-header-only library: `CMakeToolchain` is skipped entirely under `header_only=True`, but `CMakeDeps` always runs (`conan-io__conan-center-index@07389b8fa0:recipes/spdlog/all/conanfile.py:107-132`).

### 4. package_info() naming: set_property versus names residue

```sh
grep -l 'cmake_target_name\|cmake_file_name' sample/*.py | wc -l   # 19/40
grep -l 'cpp_info.names\|cpp_info\[.*\]\.names' sample/*.py | wc -l  # 3/40
```
All three residue hits carry the identical comment:
```python
# TODO: to remove in conan v2 once cmake_find_package_* generators removed
self.cpp_info.names["cmake_find_package"] = "PROPOSAL"
self.cpp_info.names["cmake_find_package_multi"] = "PROPOSAL"
```
(`conan-io__conan-center-index@07389b8fa0:recipes/proposal/all/conanfile.py:114-116`; same shape at `recipes/daw_header_libraries/all/conanfile.py:67-74` and `recipes/xxsds-sdsl-lite/all/conanfile.py:63-65`). The key is the *generator name string* (`"cmake_find_package"`/`"cmake_find_package_multi"`, the Conan-1 `cmake_find_package_multi` generator), not `"cmake"`; under Conan 2's `MockInfoProperty` the key is irrelevant — every write is discarded regardless (CMK-CONAN-02).

**Whether dropping it breaks a live Conan-1 consumer**: no. `README.md:31-33` (`conan-io__conan-center-index@07389b8fa0`): "The legacy remote at `https://center.conan.io` stopped receiving updates on 4 November 2024 and is frozen and will no longer receive updates. It is kept in this state to avoid breaking any existing Conan 1.x installations." `docs/changelog.md:3-5`: "04-Nov-2024 … Conan 1.x end of support and Conan 2.x as default version in the CI … New CI infrastructure for Conan 2.x only." A Conan-1 install is pinned to whatever revision existed on 2024-11-04; it will never see a rebuilt or re-exported recipe from the live (Conan-2-only) remote, so removing dead `names` code from a 2026 edit changes nothing for it. This is decisive, not "harmless dead code kept out of caution" — it is dead code with **no** consumer at all.

### 5. rmdir in package()

```sh
grep -h -A1 'rmdir(self,' sample/*.py | grep -oE '"[a-zA-Z_.]+"' | sort | uniq -c | sort -rn
#  21 "lib"   11 "cmake"   9 "pkgconfig"   7 "share"   3 "res"   2 "models"  1 "spdlog"  1 "man"
```
16/40 sampled recipes call `rmdir` at all; of the 22 CMake-building recipes, 13/22 do. The 9 that do not either never call `cmake.install()` (`libbasisu` copies headers by hand, `recipes/libbasisu/all/conanfile.py:107-113`, no `CMake(self).install()` anywhere in the file) or the upstream build never installs a `lib/cmake`/`lib/pkgconfig` tree in the first place. The canonical template removes three paths unconditionally after `cmake.install()`: `rmdir(... "lib", "pkgconfig")`, `rmdir(... "lib", "cmake")`, `rmdir(... "share")` (`docs/package_templates/cmake_package/all/conanfile.py:112-114`) plus `rm(self, "*.pdb", ..., recursive=True)` (`:115`). `spdlog` also removes a package-specific third path, `lib/spdlog/cmake` (`recipes/spdlog/all/conanfile.py:161-163`) — the rule generalises to "everything CMake or pkg-config installed that duplicates what `package_info()` already states", not a fixed two-path list.

### 6. package_id() for header-only

```sh
grep -l 'self.info.clear()' sample/*.py | wc -l          # 15/40
grep -l 'self.info.header_only()' sample/*.py | wc -l    # 0/40
```
Every header-only-shaped `package_id()` in the sample uses `self.info.clear()`; the two `package_id()` bodies that do *not* clear info are tool-like packages removing single settings (`b2`: `del self.info.options.use_cxx_env` / `del self.info.options.toolset`, `recipes/b2/standard/conanfile.py:99-101`; `kcov`: `del self.info.settings.compiler` / `del self.info.settings.build_type`, `recipes/kcov/all/conanfile.py:43-45`) — the exact CCI-documented tool-package idiom (`docs/adding_packages/conanfile_attributes.md:99-109`: "it is advised that the `compiler` setting is removed … in the `package_id()` method", with an explicit caution to keep `build_type`).

`spdlog`'s conditionally-header-only recipe clears `package_id()` only when the option is set: `if self.info.options.header_only: self.info.clear()` (`recipes/spdlog/all/conanfile.py:72-74`) — the pattern for a library that is *sometimes* header-only, distinct from an unconditional header-only recipe.

`implements = ["auto_header_only"]` (CCI-specific, `trianglemeshdistance`) removes the need to write `package_id()` by hand at all — the implement mixin sets the equivalent of `self.info.clear()` and `no_copy_source = True` together.

### 7. validate(), compatibility(), and the version-range allow-list

```sh
grep -l 'def validate' sample/*.py | wc -l            # 35/40
grep -l 'check_min_cppstd' sample/*.py | wc -l         # 31/40
grep -l 'def compatibility' sample/*.py | wc -l        # 0/40
```
`compatibility()` appears in neither the sample nor any of the six current package templates — it is a real, documented Conan feature (docs.conan.io/2 `reference/extensions/binary_compatibility.html`) but has zero measured adoption in this sample, so it stays CONSIDER, never SHOULD.

CCI restricts `requires()` version ranges to an explicit list, not "ranges are fine if you have a lock" (that is a consumer-side concern, CMK-CONAN-09): "Version ranges are generally not allowed... [except] OpenSSL: `[>=1.1 <4]`... CMake: `[>3.XX <4]`... doxygen, Libcurl, Zlib, Libpng, Expat, Libxml2, Libuv, qt5, qt6, c-ares, zstd, ninja, meson, pkgconf, xz_utils" (`docs/adding_packages/dependencies.md:57-77`). This is stricter and more specific than the general "range needs a lock" guidance and is CCI policy, not a Conan 2 mechanism — a recipe destined for CCI that ranges an unlisted dependency is a policy violation independent of lockfiles.

### 8. implements=[...] versus hand-written fPIC/header-only logic

```sh
grep -l 'auto_shared_fpic' sample/*.py | wc -l   # 3/40  (llama-cpp, mariadb-connector-cpp, pistache)
grep -l 'auto_header_only' sample/*.py | wc -l   # 1/40  (trianglemeshdistance)
grep -l 'rm_safe("fPIC"' sample/*.py | wc -l     # 18/40
grep -l 'del self.options.fPIC' sample/*.py | wc -l  # 19/40
```
The current template recommends `implements = ["auto_shared_fpic"]` as the default and reserves hand-written `config_options()`/`configure()` for "plain-C project" exceptions (`docs/adding_packages/conanfile_attributes.md:38,153-157` and the template body itself, `docs/package_templates/cmake_package/all/conanfile.py:39,45-52`). The sample shows the opposite ratio in practice (3 `implements` vs 37 hand-rolled), because most sampled recipes predate the `implements` mixin (added to Conan in the 2.4 line) — this is a **migration gap**, not disagreement: new recipes should use `implements`, existing ones are not required to migrate on sight.

### 9. requires pins and tool_requires

```sh
grep -l 'tool_requires' sample/*.py | wc -l                        # 9/40
grep -l 'build_requires' sample/*.py | wc -l                        # 0/40 (in this 40-recipe sample; whole tree: 35/2,002, already measured)
grep -El 'self\.requires\(.*\[' sample/*.py | wc -l                 # 15/40
```
The canonical template's `build_requirements()` pins a tool with a range from the CCI allow-list: `self.tool_requires("cmake/[>=3.16 <4]")` (`docs/package_templates/cmake_package/all/conanfile.py:76-77`) — the same range mechanism as CMK-CONAN-03 (`tool_requires`, never `build_requires`), applied to a build tool rather than a host dependency.

### 10. test_package shape

38/40 sampled recipes ship `test_package/CMakeLists.txt`; 37/38 pin `cmake_minimum_required(VERSION 3.15)` (one uses `3.1`, a straggler):
```sh
grep -h -o 'cmake_minimum_required(VERSION [0-9.]*' testpkg/*.txt | sort | uniq -c | sort -rn
#  37 cmake_minimum_required(VERSION 3.15
#   1 cmake_minimum_required(VERSION 3.1
```
Canonical shape (`docs/package_templates/cmake_package/all/test_package/CMakeLists.txt`, verbatim):
```cmake
cmake_minimum_required(VERSION 3.15)
project(test_package LANGUAGES CXX)

find_package(package REQUIRED CONFIG)

add_executable(${PROJECT_NAME} test_package.cpp)
target_link_libraries(${PROJECT_NAME} PRIVATE package::package)
```
Every sampled `find_package(...)` call in `test_package` uses `REQUIRED CONFIG` (36/37; the exceptions are a `PkgConfig` recipe and one MODULE-mode `FindFLEX` recipe that legitimately ships a Find module). `test_package/conanfile.py` matches the canonical shape too:
```python
generators = "CMakeDeps", "CMakeToolchain"
def build(self):
    cmake = CMake(self); cmake.configure(); cmake.build()
def test(self):
    if can_run(self):
        self.run(os.path.join(self.cpp.build.bindir, "test_package"), env="conanrun")
```
(`docs/package_templates/cmake_package/all/test_package/conanfile.py`). 38/40 sampled `test_package/conanfile.py` files call `can_run()`; 29/37 add `"VirtualRunEnv"` to `generators` (needed whenever the test binary links a shared dependency at runtime, e.g. cross-compiling or a `LD_LIBRARY_PATH`-sensitive host build).

**The one deviation is the sample's clearest CMK-CONAN-01 violation**: `libui`'s `test_package/CMakeLists.txt` is
```cmake
cmake_minimum_required(VERSION 3.15)
project(test_package C)
include(${CMAKE_BINARY_DIR}/conanbuildinfo.cmake)
conan_basic_setup()
add_executable(${PROJECT_NAME} test_package.c)
target_link_libraries(${PROJECT_NAME} ${CONAN_LIBS})
```
and its `conanfile.py` opens with `from conans import ConanFile, CMake, tools` and `generators = "cmake", "pkg_config"` (`conan-io__conan-center-index@07389b8fa0:recipes/libui/all/conanfile.py:1-6`, `test_package/CMakeLists.txt:1-8`). This recipe cannot run under any Conan 2 client at all — it is CCI's own residue, one of the 40 whole-tree `from conans import` hits already counted, caught inside our 40-recipe alphabetical sample.

### 11. conandata.yml and sha256

40/40 sampled recipes ship `conandata.yml`; 40/40 of those carry `sha256` per source entry (measured by fetching each `recipes/<name>/<version>/conandata.yml` and grepping for `sha256`). The template's unconditional `get(self, **self.conan_data["sources"][self.version], strip_root=True)` (`docs/package_templates/cmake_package/all/conanfile.py:80`) only works because `conandata.yml`'s `sources:` entries always carry `url:`/`sha256:` pairs — an entry without `sha256` would make `source()` accept an unverified download.

### 12. required_conan_version: the Conan-1/Conan-2 migration shim

```sh
grep -oE 'required_conan_version = "[^"]*"' sample/*.py | sort -u
#  ">=1.50.0" ">=1.51.3" ">=1.52.0" ">=1.53.0" ">=1.54.0" ">=1.64.0" ">=2" ">=2.0" ">=2.0.5" ">=2.0.9" ">=2.1" ">=2.4"
```
21/40 sampled recipes declare a `>=1.5x`–`1.64` floor while importing `from conan import ConanFile` (the Conan-2-spelled top-level package, not `conans`). This is **not stale or broken metadata**: Conan shipped a `conan` top-level package as a forward-compatibility shim well before 2.0 —
```sh
curl -sL https://raw.githubusercontent.com/conan-io/conan/1.53.0/conan/__init__.py
# from conans.model.conan_file import ConanFile
# from conan.tools.scm import Version
# from conans import __version__
```
(`conan-io/conan@1.53.0:conan/__init__.py`, measured 2026-09-26) — so "new-style" recipes using `conan.tools.*` genuinely run unmodified on Conan 1.24+ and Conan 2.x both, and a `>=1.5x` floor on such a recipe is a real, honoured compatibility statement, not an error. What is a real defect is the *old*-style `from conans import` (no shim exists for that direction — `conans/__init__.py` is 0 bytes at Conan 2.32.0, CMK-CONAN-01). All six current package templates declare `required_conan_version = ">=2.0"` or `">=2.0.9"` — the floor for a **new** recipe today is 2.0, dropping 1.x compatibility entirely; an existing recipe is not required to raise an already-correct 1.5x floor.

### 13. The producer-side CPS paths (M-M-09)

Conan 2.32.0 registers an undocumented generator:
```
"CPSDeps": "conan.tools.cps"
```
(`conan-io/conan@2.32.0:conan/internal/api/install/generators.py:39`). `CPSDeps.generate()` writes one `.cps` file per dependency into `<build>/build/cps/<config-name>/cps/` (the comment "CMake wants a '/cps/' folder" is in the source itself), where `<config-name>` is built from compiler, arch, cppstd, build_type and shared/static (`conan-io/conan@2.32.0:conan/tools/cps/cps_deps.py:12-34`). The read-back side lives in `conan.cps.cps.CPS`: `def to_conan(self)` (`conan-io/conan@2.32.0:conan/cps/cps.py:238`) converts a loaded CPS document into Conan's internal model, and `def load(file)` (`:291`) reads and merges configuration-specific `.cps` files. **0/40 sampled recipes reference `CPSDeps` or `conan.cps`.** There is no docs.conan.io page for this generator at 2.32.0 — every citation here is to source, per the map's instruction (M-M-09).

### 14. replace_requires/platform_requires (M-M-12)

Both `[replace_requires]` and `[platform_requires]` are profile sections, both explicitly experimental: "This feature is experimental and subject to breaking changes" (docs.conan.io/2 `reference/config_files/profiles.html`). `[replace_requires]` does literal pattern-based substitution (`zlib/*: zlibng/*`) and does not apply to a requirement pinned on the CLI. `[platform_requires]` tells Conan a dependency is already installed and skips download/build entirely (`zlib/1.3.1`) — but Conan's own docs call this "very challenging" for a regular library, because Conan then has no metadata for that dependency's transitive requirements or build-system integration, and **recommends a wrapper Conan recipe modelling the platform dependency, used together with `[replace_requires]`, instead of bare `platform_requires`**. Neither mechanism is CCI recipe-author surface (both are consumer profile features); they answer "does Conan have a `system_requires`-equivalent" with "experimental, and the documented pattern is a wrapper recipe, not a bare declaration" — CONSIDER, not MUST/SHOULD, and never described as GA.

### 15. The archived conan-io/hooks KB-H rules

`conan-io/hooks` is archived: "This hooks repository was for Conan 1.X and it is not longer maintained, it is archived" (README, fetched 2026-09-26). Its Conan Center hook (`hooks/conan-center.py`) is itself marked deprecated inside the same repo ("conan-center-index no longer uses this hook... NOT supported by Conan v2 yet"). The legend at `hooks/conan-center.py:27-95` lists every `KB-H0xx` rule the hook ever checked. Cross-referencing that legend against this dive's measurements:

| KB-H | Name | Verdict |
|---|---|---|
| KB-H005 | HEADER_ONLY, NO COPY SOURCE | Survives — folded into row 21 (`package_id`/`no_copy_source`/`auto_header_only`) |
| KB-H006 | FPIC OPTION | Survives — folded into row 17 |
| KB-H007 | FPIC MANAGEMENT | Survives, superseded in intent by `implements = ["auto_shared_fpic"]` |
| KB-H016 | CMAKE-MODULES-CONFIG-FILES | Survives — folded into row 19 (`rmdir(lib/cmake)`) |
| KB-H020 | PC-FILES | Survives — folded into row 19 (`rmdir(lib/pkgconfig)`) |
| KB-H024 | TEST PACKAGE FOLDER | Survives — folded into row 23 |
| KB-H029 | TEST PACKAGE - RUN ENVIRONMENT | Survives — folded into row 23 (`can_run()`/`VirtualRunEnv`) |
| KB-H034 | TEST PACKAGE - NO IMPORTS() | Survives as a reading heuristic (`imports()` is Conan-1-only; 0/40 sampled test_package files use it) |
| KB-H045 | DELETE OPTIONS | Survives — folded into row 21 (`del self.info.options.*`/`del self.info.settings.*`) |
| KB-H050 | DEFAULT SHARED OPTION VALUE | Survives as a reading heuristic (`shared=False` default) |
| KB-H051 | DEFAULT OPTIONS AS DICTIONARY | Survives as a reading heuristic (`default_options = {...}` dict form) |
| KB-H065 | NO REQUIRED_CONAN_VERSION | Survives — folded into row 22 |
| KB-H001 | DEPRECATED GLOBAL CPPSTD | Retired — `settings.compiler.cppstd` handling is automatic under `CMakeToolchain`; the hook predates it |
| KB-H008 | VERSION RANGES | Superseded by `docs/adding_packages/dependencies.md`'s current, more specific allow-list (row 20) |
| KB-H013 | DEFAULT PACKAGE LAYOUT | Superseded entirely by `layout()`/`cmake_layout()`, which postdates the hook |
| KB-H028, KB-H048 | CMAKE MINIMUM VERSION / CMAKE VERSION REQUIRED | Out of this family — belongs to the vendored upstream `CMakeLists.txt`'s own floor, a `cmake-build`/`CMK-VER` concern, not a conanfile check |
| KB-H062 | TOOLS CROSS BUILDING | Retired — targets the Conan-1 `tools.cross_building()` API, replaced by `conan.tools.build.cross_building` |
| KB-H072 | PYLINT EXECUTION | Retired — CI infrastructure, not a recipe-shape rule |

No rule below is invented from the hook alone; each "survives" row already has an independent measurement or template citation in Findings 1–11 above, so the hook is cited for its historical name and rationale, never as sole evidence.

## Normative guidance candidates

Numbering continues from the held-stable `CMK-CONAN-01..12` in `cmake-package-managers.md`. Every row binds **RCP** (recipe author) unless stated. Floor is CMake 3.25 per the map's assumed floor (conflict 1) unless the recipe's own `cmake_minimum_required` differs, and Conan 2.32.0 for every Conan mechanism.

**CMK-CONAN-13 (MUST):** A recipe that runs a real CMake build calls `cmake_layout(self, src_folder="src")` in `layout()`. A recipe that never builds (pure header-only, no `CMake(self)` object) calls `basic_layout(self, src_folder="src")` instead.
- Verify: `grep -n 'CMakeToolchain\|CMake(self)' conanfile.py` — if it hits, `grep -n 'cmake_layout' conanfile.py` must also hit; empty = finding. If neither hits, `grep -n 'basic_layout' conanfile.py` should hit.
- Evidence: 21/22 CMake-building sampled recipes ([M]); `docs/package_templates/cmake_package/all/conanfile.py:54-55` ([N]).

**CMK-CONAN-14 (SHOULD):** New or heavily-edited recipes declare `implements = ["auto_shared_fpic"]` instead of hand-writing `config_options()`/`configure()` for `shared`/`fPIC`. An existing hand-rolled recipe using `rm_safe("fPIC")` or `del self.options.fPIC` correctly is not required to migrate.
- Verify: reading heuristic — `grep -n 'implements' conanfile.py`; absent, then `grep -n 'del self.options.fPIC\|rm_safe(.fPIC' conanfile.py` must be present for a shared/static library.
- Evidence: 3/40 use `implements`, 37/40 hand-roll ([M]); `docs/adding_packages/conanfile_attributes.md:153-157` recommends `implements` as current guidance ([N]).

**CMK-CONAN-15 (SHOULD):** A header-only recipe declares `implements = ["auto_header_only"]` rather than writing `package_id()`/`no_copy_source` by hand, unless the library is only *sometimes* header-only (an option-gated case), which must keep the conditional `if ...: self.info.clear()` form.
- Verify: reading heuristic on `package_type`/topics containing "header-only"; if unconditional, `implements` should list `auto_header_only` or `package_id()`/`self.info.clear()` and `no_copy_source = True` must both be present.
- Evidence: `recipes/trianglemeshdistance/all/conanfile.py:19` ([M]); `docs/package_templates/header_only/all/conanfile.py:26,44-45` ([N]).

**CMK-CONAN-16 (MUST):** An unconditionally header-only `package_id()` calls `self.info.clear()`. Never the removed `self.info.header_only()`. A conditionally-header-only recipe guards it: `if self.info.options.header_only: self.info.clear()`.
- Verify: `grep -n 'self.info.header_only()' conanfile.py`, empty = pass (removed API — hard error under 2.32.0). `grep -n 'def package_id' -A3 conanfile.py` for a header-only package_type must show `self.info.clear()`.
- Evidence: 15/15 header-only-shaped `package_id()` bodies in the sample use `clear()`, 0/40 use `header_only()` ([M]); `spdlog`'s conditional form at `recipes/spdlog/all/conanfile.py:72-74` ([M]).

**CMK-CONAN-17 (MUST):** A tool-like recipe (consumed as `tool_requires`, e.g. a compiled build tool) removes `compiler` from its `package_id()` (`del self.info.settings.compiler`) but never removes `build_type`.
- Verify: for a recipe whose CCI category is a tool (its `package_type` or its consumers' `tool_requires` usage), `grep -n 'def package_id' -A3 conanfile.py` should show `del self.info.settings.compiler` and must not show `del self.info.settings.build_type`.
- Evidence: `recipes/b2/standard/conanfile.py:99-101`, `recipes/kcov/all/conanfile.py:43-45` ([M]); `docs/adding_packages/conanfile_attributes.md:99-109` ([N]).

**CMK-CONAN-18 (SHOULD):** `package()` calls `rmdir(self, os.path.join(self.package_folder, "lib", "cmake"))` and `rmdir(self, os.path.join(self.package_folder, "lib", "pkgconfig"))` (and any package-specific duplicate CMake/pc directory the upstream install writes) whenever `cmake.install()` is called and the upstream `CMakeLists.txt` installs a Config package or `.pc` file. Not a MUST for every CMake-building recipe — only when there is something to remove.
- Verify: `grep -n 'cmake.install()' conanfile.py`; if present, read whether the upstream `install(EXPORT ...)`/`install(FILES ... DESTINATION lib/pkgconfig)` exists (or run the packaged build and check for `lib/cmake`/`lib/pkgconfig` under the package folder); if either exists, `grep -n 'rmdir' conanfile.py` must hit the matching path.
- Evidence: 13/22 CMake-building sampled recipes call `rmdir`; the 9 that don't never call `cmake.install()` at all (`recipes/libbasisu/all/conanfile.py:107-113`) ([M]); template at `docs/package_templates/cmake_package/all/conanfile.py:112-114` ([N]); `spdlog`'s third package-specific path (`recipes/spdlog/all/conanfile.py:161-163`) ([M]).

**CMK-CONAN-19 (MUST):** `package_info()` names the exported CMake and pkg-config surface only through `set_property` (`cmake_file_name`, `cmake_target_name`, and `cmake_module_file_name`/`cmake_module_target_name` when the package also ships a Find-module identity, `pkg_config_name`). Never add a new `cpp_info.names`/`filenames` entry; delete an existing one on any edit that already touches `package_info()`, citing CCI's frozen legacy remote (2024-11-04) as the reason it cannot break a live consumer.
- Verify: `grep -rln --include='conanfile.py' -e 'cpp_info.names' -e 'cpp_info.filenames' .` lists candidates for deletion; `grep -c 'set_property' conanfile.py` must be non-zero for any package with a Config or Find identity. (This restates and dates CMK-CONAN-02 for the producer.)
- Evidence: `recipes/proposal/all/conanfile.py:114-116`, `recipes/daw_header_libraries/all/conanfile.py:67-74`, `recipes/xxsds-sdsl-lite/all/conanfile.py:63-65` ([M]); `README.md:31-33`, `docs/changelog.md:3-5` ([N]).

**CMK-CONAN-20 (SHOULD, CCI-specific):** A `requires()` version range is used only for a dependency on CCI's named allow-list (openssl, cmake, doxygen, libcurl, zlib, libpng, expat, libxml2, libuv, qt5, qt6, c-ares, zstd, ninja, meson, pkgconf, xz_utils, at the ranges the docs give). A range on any other dependency is a CCI policy violation independent of CMK-CONAN-09's lockfile guidance.
- Verify: `grep -n -E "requires\(.*\[" conanfile.py`; each hit's dependency name must be on the allow-list above, else finding.
- Evidence: `docs/adding_packages/dependencies.md:57-77` ([N]); 15/40 sampled recipes carry a range, e.g. `openssl/[>=1.1 <4]` in the template itself (`docs/package_templates/cmake_package/all/conanfile.py:65`) ([M]).

**CMK-CONAN-21 (MUST):** Every recipe declares `required_conan_version`. A new recipe declares `>=2.0` (or a patch-qualified `>=2.0.x`); an existing recipe's `>=1.5x` floor beside `from conan import` is a deliberate, working compatibility statement (the shim exists) and is not itself a defect to "fix" by bumping.
- Verify: `grep -c 'required_conan_version' conanfile.py`, zero = finding for any new recipe. Do not flag an existing `>=1.5x` floor as a bug merely for being below 2.0; flag it only if the recipe also contains `from conans import` (a real Conan-1 recipe, CMK-CONAN-01), which the shim does not cover.
- Evidence: 38/40 sampled declare it ([M]); all six current templates declare `>=2.0`/`>=2.0.9` ([N]); shim confirmed at `conan-io/conan@1.53.0:conan/__init__.py` ([N/M]).

**CMK-CONAN-22 (SHOULD):** `test_package/CMakeLists.txt` follows the fixed six-line shape: `cmake_minimum_required(VERSION 3.15)`, `project(test_package LANGUAGES CXX)`, `find_package(<Pkg> REQUIRED CONFIG)` (or `MODULE` only when the package legitimately ships a Find module), one `add_executable`, one `target_link_libraries(... PRIVATE <Pkg>::<target>)`. `test_package/conanfile.py` sets `generators = "CMakeDeps", "CMakeToolchain"` (`+ "VirtualRunEnv"` when the test binary needs a runtime search path) and gates execution with `can_run(self)`.
- Verify: `grep -n 'cmake_minimum_required(VERSION 3.15)' test_package/CMakeLists.txt`; `grep -n 'can_run' test_package/conanfile.py`; a hit on `conanbuildinfo.cmake`/`conan_basic_setup()`/`generators = "cmake"` anywhere under `test_package/` is a hard CMK-CONAN-01 finding, not merely a shape deviation.
- Evidence: 37/38 sampled files pin 3.15 ([M]); canonical template ([N]); `libui`'s Conan-1 test_package as the sample's clearest violation (`recipes/libui/all/test_package/CMakeLists.txt:1-8`, `conanfile.py:1-6`) ([M]).

**CMK-CONAN-23 (MUST):** Every `conandata.yml` source entry carries `sha256`. `source()` uses the unconditional `get(self, **self.conan_data["sources"][self.version], strip_root=True)` pattern, never a hand-written unauthenticated download.
- Verify: `grep -L 'sha256' conandata.yml`, empty (present) = pass, for every entry under `sources:`.
- Evidence: 40/40 sampled recipes ([M]); template pattern (`docs/package_templates/cmake_package/all/conanfile.py:80`) ([N]).

**CMK-CONAN-24 (CONSIDER):** `CPSDeps` (`-g CPSDeps`) and `conan.cps.cps.CPS` stay uncited in shipped guidance beyond "it exists at 2.32.0, is source-only, has zero corpus adopters, and is not `CMakeConfigDeps`'s CPS round trip" (that one is already CMK-INST/CMK-DEP territory per the map). `[replace_requires]`/`[platform_requires]` stay CONSIDER, experimental, and the documented "use the system copy" pattern is a wrapper recipe plus `[replace_requires]`, never bare `platform_requires` alone.
- Verify: a reading heuristic against generated prose — no shipped text may call either GA, stable, or "the" way to consume a system copy.
- Evidence: `conan-io/conan@2.32.0:conan/internal/api/install/generators.py:39`, `conan/tools/cps/cps_deps.py`, `conan/cps/cps.py:238,291` ([N]); docs.conan.io/2 `reference/config_files/profiles.html` ([N]).

**MUST count added: 6** (CONAN-13, 16, 17, 19, 21, 23). **SHOULD: 5** (CONAN-14, 15, 18, 20, 22). **CONSIDER: 1** (CONAN-24). No new file: these append as a "Check F: recipe authoring (RCP)" section inside the existing `cpp-packaging/conan.md`, keeping one file per glob (the map's Artifact-set decision, conflict 13) — a separate `conan-recipe.md` would double-load `**/conanfile.py` for no reason, since RCP rows are a kind-tag, not a different surface.

## Exemplar evidence

- **Satisfies CONAN-13/19/23 cleanly**: `spdlog` (`recipes/spdlog/all/conanfile.py`) — `cmake_layout` at :65, `set_property`-only naming at :167-169 (with a documented components TODO, not a `names` leak), `conandata.yml` sha256-backed sources, conditional `package_id()` at :72-74.
- **Satisfies CONAN-15/16 via `implements`**: `trianglemeshdistance` (`recipes/trianglemeshdistance/all/conanfile.py:19,21-22`) — the sample's only `auto_header_only` recipe, correctly paired with `basic_layout`.
- **Satisfies CONAN-14**: `llama-cpp`, `mariadb-connector-cpp`, `pistache` (`implements = ["auto_shared_fpic"]`, each at or near their class-attribute block).
- **Satisfies CONAN-18 conditionally**: `libbasisu` legitimately has no `rmdir` because it never calls `cmake.install()` (`recipes/libbasisu/all/conanfile.py:107-113`) — not a violation, a correct negative.
- **Violates CONAN-01/19/22 together**: `libui` (`recipes/libui/all/conanfile.py:1-6`, `test_package/CMakeLists.txt:1-8`) — full Conan-1 recipe, one of the 40 whole-tree `from conans import` hits, caught inside this 40-recipe sample.
- **Violates CONAN-19 (dead-weight residue)**: `proposal`, `daw_header_libraries`, `xxsds-sdsl-lite` — `cpp_info.names` beside a comment that already flags it as removal-pending (:114-116, :67-74, :63-65 respectively).
- **`/home/mherwig/dev/find_ocx`**: not a Conan recipe (0 Conan references, [fleet] §7) — no CMK-CONAN row binds it; it is cited nowhere in this dive's Applied section.

## AI-agent angle

1. **Reaches for `CMakeConfigDeps` in a new recipe's `generate()`** because it looks like "the modern one." The canonical 2026-09-26 template still writes `CMakeDeps`; `CMakeConfigDeps` is a provider-side, not recipe-side, choice. Check: `grep -n CMakeConfigDeps conanfile.py` in a *recipe* (not a consumer app) — any hit is almost certainly wrong.
2. **Writes `self.info.header_only()`** (removed Conan 2 API) instead of `self.info.clear()`, or invents a `package_id()` that leaves settings in place for a header-only package. Check: `grep -n 'header_only()' conanfile.py`, non-empty = hard finding (hard error at runtime, not a style note).
3. **Treats every `required_conan_version < "2.0"` as a bug to bump**, not knowing the `conan` top-level package existed as a real 1.x/2.x compatibility shim. Bumping a working `>=1.53.0` recipe to `>=2.0` with no other change is a needless compatibility regression, not a fix. Check: is `from conans import` present? Only then is the floor genuinely wrong.
4. **Adds `cpp_info.names`/`filenames` "for Conan 1 compatibility"** to a brand-new recipe. There is no live Conan-1 remote to serve (frozen since 2024-11-04); the pattern only ever existed as legacy residue on recipes older than that date. Check: any `names[` write in a recipe with `required_conan_version >= "2.0"` and no `from conans` anywhere is invented cruft.
5. **Hand-writes a `test_package/CMakeLists.txt` from a general CMake mental model** (`find_package` without `CONFIG`, a custom `include_directories()`, no `add_executable` name matching `${PROJECT_NAME}`) instead of the fixed six-line CCI shape. Check: diff against the canonical template; any structural deviation beyond the package/target names is a smell.
6. **Adds an unconditional `rmdir(lib/cmake)`/`rmdir(lib/pkgconfig)` to every recipe "because that's the pattern"**, including ones that never call `cmake.install()` — a no-op `rmdir` on a nonexistent path is harmless in Conan (it warns, doesn't fail), but signals the agent copied a snippet without reading `package()`. Check: is there a preceding `cmake.install()` (or an upstream install of those trees) at all?
7. **Adds a version range to a `requires()` for a dependency not on CCI's allow-list**, conflating "Conan 2 supports ranges" with "CCI accepts ranges everywhere." Check: cross the range's dependency name against `docs/adding_packages/dependencies.md`'s list.
8. **Presents `CPSDeps`/`conan.cps` as a documented, stable feature** because it is importable and registered. It has no docs.conan.io page at 2.32.0 and zero corpus adopters. Check: does the citation point at conan's source tree, never a docs URL that 404s?

## Contested / evolving

- **`implements` adoption is a migration gap, not a disagreement.** The mixin (`auto_shared_fpic`, `auto_header_only`) is CCI's current recommendation, but the bulk of the recipe body predates it. Trend: new PRs increasingly use `implements`; there is no push to retrofit old recipes. As of 2026-09-26, treat `implements` as SHOULD for new work, never MUST-retrofit.
- **`compatibility()` remains real but unused.** No sampled recipe or template uses it, and Conan's own docs give only a synthetic example. Whether CCI will ever ask for it (e.g. for Debug/Release binary reuse across an ABI-stable compiler bump) is open; nothing in this corpus argues for adoption today.
- **`CPSDeps`/CPS producer support is pre-decision, not pre-release.** It exists in Conan 2.32.0's generator table but has no announced timeline for a docs page or GA status. Track the same signal CMK-CONAN-04's auto-flip watches: a Conan changelog line naming CPS export/`CPSDeps` as stable.
- **`[replace_requires]`/`[platform_requires]` have been "experimental" across multiple minor lines** with no announced graduation date; Conan's own guidance (wrapper recipe + `replace_requires`) argues the team does not expect bare `platform_requires` to graduate for general libraries.

## Sources

| Source | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `conan-io__conan-center-index@07389b8fa0` sample of 40 recipes, deterministic N=49 stride over 1,950 top-level recipe folders | Measurement (exemplar corpus) | 2026-09-26 | Primary evidence for every row-count claim above |
| [conan-center-index docs/adding_packages/conanfile_attributes.md](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/docs/adding_packages/conanfile_attributes.md) (fetched via corpus `git show`) | CCI maintainer guide | current at 2026-09-26 | `implements`, options naming, `package_id()` tool-package idiom |
| [conan-center-index docs/adding_packages/dependencies.md](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/docs/adding_packages/dependencies.md) | CCI maintainer guide | current | The version-range allow-list, `python_requires` ban |
| [docs/package_templates/cmake_package/all/conanfile.py](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/docs/package_templates/cmake_package/all/conanfile.py) | CCI's own scaffolding template | current | Canonical `generate()`, `package()`, `package_info()`, `implements` shape |
| [docs/package_templates/header_only/all/conanfile.py](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/docs/package_templates/header_only/all/conanfile.py) | CCI's own scaffolding template | current | Canonical header-only `package_id()`/`no_copy_source` shape |
| [docs/package_templates/cmake_package/all/test_package/{CMakeLists.txt,conanfile.py}](https://github.com/conan-io/conan-center-index/tree/07389b8fa0/docs/package_templates/cmake_package/all/test_package) | CCI's own scaffolding template | current | Canonical `test_package` shape, `can_run()` gate |
| [conan-center-index README.md](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/README.md) | Repo README | current, notes a 2024-11-04 event | Legacy remote frozen 2024-11-04 — decides the `names`-residue DECIDE question |
| [conan-center-index docs/changelog.md](https://github.com/conan-io/conan-center-index/blob/07389b8fa0/docs/changelog.md) | CI changelog | dated entries back to 2024 | Exact date of Conan-1 CI end-of-support |
| [docs.conan.io/2 CMakeDeps properties reference](https://docs.conan.io/2/reference/tools/cmake/cmakedeps.html) | Normative tool docs | Conan 2.32-era | `set_property` key list, `cmake_find_mode` values, `build_context_activated`/`build_context_suffix` |
| [docs.conan.io/2 package_id reference](https://docs.conan.io/2/reference/binary_model/package_id.html) | Normative tool docs | Conan 2.32-era | `package_id` computation model (context for `del self.info.*`) |
| [docs.conan.io/2 binary compatibility reference](https://docs.conan.io/2/reference/extensions/binary_compatibility.html) | Normative tool docs | Conan 2.32-era | `compatibility()` method shape and example |
| [docs.conan.io/2 profiles reference](https://docs.conan.io/2/reference/config_files/profiles.html) | Normative tool docs | Conan 2.32-era | `[replace_requires]`/`[platform_requires]` experimental status and caveats |
| [conan-io/hooks README](https://raw.githubusercontent.com/conan-io/hooks/master/README.md) | Archived repo README | archived, dated 2026-03-24 per the map | Confirms archival and deprecation of the Conan Center hook |
| [conan-io/hooks/hooks/conan-center.py](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | Archived hook source | archived | The authoritative `KB-H0xx` rule legend (lines 27-95) |
| `conan-io/conan@2.32.0:conan/internal/api/install/generators.py:39` | Conan source at tag | 2.32.0 | Confirms `CPSDeps` generator registration (M-M-09) |
| `conan-io/conan@2.32.0:conan/tools/cps/cps_deps.py` | Conan source at tag | 2.32.0 | `CPSDeps.generate()` body, output folder shape |
| `conan-io/conan@2.32.0:conan/cps/cps.py:238,291` | Conan source at tag | 2.32.0 | `CPS.to_conan()`/`CPS.load()` producer-side round trip |
| `conan-io/conan@1.53.0:conan/__init__.py` | Conan source at tag | 1.53.0 | Confirms the `conan` top-level migration-shim package existed pre-2.0 |
| `cmake-package-managers.md` (this program, verified 2026-09-26) | Held-stable consolidation | 2026-09-26 | CMK-CONAN-01..12 consumer rows this dive builds on and never restates |
| `cmake-topic-map.md` | This program's phase-3 map | 2026-09-26 | M-M-06/09/12 questions, the brief, and the artifact-set decision cited for "one file, RCP kind-tag" |
