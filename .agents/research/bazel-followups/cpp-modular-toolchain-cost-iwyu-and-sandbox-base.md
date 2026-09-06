---
title: rules_cc modular toolchain cost, IWYU under Bazel, and sandbox base
slug: cpp-modular-toolchain-cost-iwyu-and-sandbox-base
agent: cpp-modular-toolchain-cost-iwyu-and-sandbox-base
model: claude-sonnet-5
date_researched: 2026-09-06
sources_count: 24
primary_sources_count: 24
answers_for:
  - bazel-cpp.md (Open questions › deserves another research round: "rules_cc modular toolchain API", "IWYU under Bazel", "sandbox base (M-L-17, unresearched)", "layering_check × C++20 named modules")
affects_rule_ids: [BZL-CC-01, BZL-CC-04, BZL-CC-05, BZL-CC-10, BZL-CC-11, BZL-CC-12, BZL-CC-30, M-L-17, M-L-08]
---

## Table of contents

1. [Summary](#summary)
2. [Answers](#answers)
   - [Q1 — rules_cc modular toolchain API maintenance cost](#q1)
   - [Q2 — IWYU under Bazel](#q2)
   - [Q3 — Sandbox base (M-L-17)](#q3)
   - [Q4 — layering_check × C++20 modules](#q4)
3. [Proposed revisions](#proposed-revisions)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Not settled](#not-settled)
7. [Sources](#sources)

## Summary

- `rules_cc`'s public `cc_toolchain()` macro (`@rules_cc//cc/toolchains`) only grew across 0.1.1→0.2.22 (14 months, 21 releases): 3 new optional attributes (`artifact_name_patterns`, `make_variables`, `legacy_tools`), 8 new files, **zero renamed or removed attributes**. The worked example (`examples/rule_based_toolchain`) changed exactly twice in that span, both additively.
- Real modular-API churn is internal, not attribute-level: rules_cc's own built-in `cc/toolchains/args/*` fragments (including the `layering_check` fragment itself) had their macOS/Apple `select()` conditions rewritten three times across the four releases 0.2.19–0.2.22 (five weeks, June–July 2026), and 0.2.22 quietly added a second, Bazel-native implementation path behind `bazel_features.cc.supports_starlarkified_toolchains`.
- `rules_lint` v2.9.0 (2026-09-03) ships `clang_tidy.bzl` and `cppcheck.bzl` for C/C++ but **no IWYU linter at all** — confirmed by listing its `lint/` directory, not by reading a claim.
- The maintained Bazel-native IWYU path is `RealtimeRoboticsGroup/bazel_iwyu` (BCR module `bazel_iwyu`, version `0.0.4`, first commit 2026-07-03), an explicit fork of `storypku/bazel_iwyu`, whose last commit is 2024-09-12. **Do not conflate the two projects that share the exact name `bazel_iwyu`.**
- The IWYU aspect derives its compiler flags from `CcInfo.compilation_context` and `cc_common`'s compile-variables — the same inputs an ordinary compile action gets. It never touches `-fmodule-map-file=`/`.cppmap` or any other `layering_check` surface; the two mechanisms share no module-map input.
- Hedron's `aquery`-based `compile_commands.json` extractor is the bridge for the *standalone* community `include-what-you-use`/`iwyu_tool.py`, for anyone who wants IWYU without wiring an aspect.
- `--sandbox_base`, `--sandbox_tmpfs_path`, and `--experimental_sandbox_async_tree_delete_idle_threads` are **absent from `bazel.build/docs/sandboxing`**; only `--reuse_sandbox_directories` gets one sentence there. The CLI reference is the only complete source, byte-identical in substance across 8.7.0 and 9.1.0.
- Confirmed at `SandboxOptions.java` (8.7.0 and 9.2.0 tags): `reuse_sandbox_directories`'s `oldName` is `experimental_reuse_sandbox_directories` (`oldNameWarning = false`) — and `sandbox_base` itself also carries `oldName = "experimental_sandbox_base"`, a fact not previously recorded in this program.
- **Measured** (50 genrules, 3 clean rebuilds per condition, Bazel 8.7.0, linux-sandbox): default sandbox base mean 26.2ms/action vs `--sandbox_base=/dev/shm` mean 24.1ms/action (stdev 8–11ms) — **no measurable delta**, because this host's mandated scratch directory is itself tmpfs (`/tmp`, confirmed via `findmnt`): the comparison is tmpfs-vs-tmpfs, not tmpfs-vs-disk. [WSL2 + harness-location caveat]
- What `/dev/shm` actually gives up is not a Bazel-side permission change (sandbox subdirectories are mode `755` regardless of base) but a **parent-directory** one: `/dev/shm` is mode `1777` (world-traversable, sticky) identically to `/tmp`, versus a real `$HOME` at `700`. On an ordinary multi-user host with the stock `$HOME`-rooted default, moving to `/dev/shm` removes that barrier.
- Confirmed at `LinuxSandboxedSpawnRunner.java`/`HardlinkedSandboxedSpawn.java` (9.2.0): the **default** (non-hermetic) sandbox stages inputs via **symlinks** (filesystem-agnostic). `--experimental_use_hermetic_linux_sandbox` switches to **hardlinks**, which cannot cross a filesystem boundary (`EXDEV`); Bazel catches that and silently falls back to a full **file copy**, logged only under `--sandbox_debug`. Pointing `--sandbox_base` at `/dev/shm` while the execroot lives elsewhere therefore downgrades every input's staging cost from O(1) to O(size) under the hermetic sandbox specifically.
- `toolchains_llvm`'s C++20 named-modules feature (`module_interfaces`, `--features=cpp_modules`) is **not in the latest tagged release** `v1.9.0` (2026-08-29) or on the BCR. It landed only on `main` via [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843), merged **2026-09-02** — four days before this program's era date. `v1.9.0`'s README has no "C++ named modules" section at all.
- PR #843's own diff is the primary evidence for the far side of `layering_check` × `cpp_modules`: the toolchain used to pass `-fno-cxx-modules` **unconditionally** for LLVM ≥ 14 ("breaks Bazel's `use_module_maps` feature, which is used by `layering_check`"); the fix gates that suppression OFF exactly when `cpp_modules` is enabled, and adds **no replacement protection**. Neither the PR's own tests nor rules_cc's `layering_check` feature fragment reference the new module actions — the combination is untested at every version that exists.
- `rules_cc` 0.2.22 already ships the native module action types (`cpp_module_compile`, `cpp20_module_compile`, `cpp20_module_codegen`, `cpp_module_deps_scanning`) that both the modular toolchain API and `toolchains_llvm`'s new feature wire into — Q1 and Q4 sit on the same underlying plumbing.

## Answers

### Q1 — rules_cc modular toolchain API maintenance cost {#q1}

**Question as commissioned:** Diff the maintained example toolchain's BUILD surface across consecutive `rules_cc` releases (0.1.x → 0.2.x; 4–5 tags via raw GitHub) and the CHANGELOG entries touching `cc/toolchains`; count attribute renames, removed/added args rules, default-flag changes (macOS defaults, ThinLTO handling). State the real maintenance cost per release and whether the API is stable enough for BZL-CC-01's worked example.

**Findings.**

`rules_cc` has no `CHANGELOG.md` file — verified by a 404 on `raw.githubusercontent.com/bazelbuild/rules_cc/main/CHANGELOG.md`. Its GitHub Releases page (auto-generated PR-title lists) is the changelog; that is what "the CHANGELOG" means here.

Tags fetched and diffed: `0.1.1` (2025-02-07), `0.1.4` (2025-07-18), `0.2.0` (2025-08-06), `0.2.10` (2025-10-17), `0.2.22` (2026-07-07 — the fleet's pinned version). `examples/rule_based_toolchain` exists at all five, and its structure (`toolchains/{clang,gcc,args}/BUILD.bazel`) is stable.

- **Top-level `examples/rule_based_toolchain/BUILD.bazel` is byte-identical across all five tags** (34 lines, `diff` empty).
- **`toolchains/clang/BUILD.bazel`** changed twice in the span: 0.1.1→0.1.4 added one new example rule (`cc_make_variable` + a `cc_args` target, purely additive); 0.2.10→0.2.22 added a `compiler = "clang"` attribute and replaced a flat `tool_map` reference with a `select()` distinguishing macOS from everything else (the first real, if small, behavior-relevant edit a copy-pasting adopter would have to notice).
- **`toolchains/gcc/BUILD.bazel`** followed the same two-edit pattern (0.1.1→0.1.4 additive; 0.2.10→0.2.22 added `compiler = "gcc"`).
- **`toolchains/args/BUILD.bazel`** changed once (0.1.1→0.1.4, one new additive `cc_args` target for a `--target=` cross-compile flag).

At the macro level (`cc/toolchains/toolchain.bzl`, the actual `cc_toolchain()` public entry point), diffing 0.1.1 against 0.2.22 directly:

```
# 0.2.22 adds, with defaults, none of which existed at 0.1.1:
artifact_name_patterns = [],
make_variables = [],
legacy_tools = [],
cpu = "",                 # DEPRECATED per its own docstring; auto-computed if omitted
target_system_name = None,

if bazel_features.cc.supports_starlarkified_toolchains:
    _cc_toolchain(...)     # a second, Bazel-native implementation path
    return
# ...falls through to the pre-existing macro-based path otherwise
```

No existing attribute was renamed or removed. `cc/toolchains/` itself gained 8 new top-level files between 0.1.1 and 0.2.22 (`artifacts.bzl`, `artifacts/`, `cc_toolchain_alias.bzl`, `feature_injection.bzl`, `legacy_file_group.bzl`, `legacy_tool.bzl`, `make_variable.bzl`, `providers.bzl`) with zero deletions.

The macOS/ThinLTO churn the frame's own open question anticipated is real but lives one layer down, in rules_cc's **built-in** `cc/toolchains/args/*` fragments — the argument bundles a toolchain author references by label rather than writes by hand:

| Release | Date | Commit | Files touched |
|---|---|---|---|
| 0.2.19 | 2026-06-01 | [`31f137fd`](https://github.com/bazelbuild/rules_cc/commit/31f137fd8838bb961332df8857b84c75f769333b) | 11 files across `cc/settings`, `cc/toolchains/args/{archiver_flags,generate_linkmap,layering_check,libraries_to_link,pic_flags,runtime_library_search_directories,sanitize_pwd,soname_flags,strip_flags}` — rewrote `@platforms//os:macos` selects to a new `//cc/settings:apple_constraint` |
| 0.2.19 | 2026-06-01 | [`21c8c40d`](https://github.com/bazelbuild/rules_cc/commit/21c8c40d43a0f7dc362436fa888e0617ae135380) | `cc/toolchains/impl/toolchain_config.bzl`, `cc/toolchains/toolchain.bzl` — `target_libc` set to `macosx` for Apple platforms |
| 0.2.21 | 2026-07-03 | [`97e2922a`](https://github.com/bazelbuild/rules_cc/commit/97e2922a84c5145ce9bfd147d42e451c4346ac89) | `cc/toolchains/args/{libraries_to_link,thin_lto}` — added Windows ThinLTO args |
| 0.2.22 | 2026-07-07 | [`9b321830`](https://github.com/bazelbuild/rules_cc/commit/9b321830c1a84415bc139d29e5864b3bb7f1b474) | `cc/toolchains/args/thin_lto` — added macOS ThinLTO args |

The `layering_check` fragment's own edit (part of `31f137fd`) is a one-line-times-three condition rewrite:

```diff
- "@platforms//os:macos": ["-Xclang"],
+ "//cc/settings:apple_constraint": ["-Xclang"],
```

repeated for `module_name_args`, `module_map_file_args`, and `dependent_module_map_files_args` — broadening macOS-only matching to "Apple platform" matching (iOS/tvOS/watchOS included), with no attribute-name change and no deprecation notice a consumer would see unless they read the commit.

Across the full 0.1.1→0.2.22 span, 85 PR titles landed in the release notes, 17 mentioning "toolchain" by name; none mention `cc/toolchains` as a path (PR titles are prose, not path-scoped) — grepping the changelog by keyword is not a substitute for reading the actual diffs.

**Answer.** The real maintenance cost of the third branch, as of `rules_cc` 0.2.22 (2026-07-07) against a 0.1.1 baseline (2025-02-07, 14 months, 21 releases): **near zero for a toolchain author who only calls the public `cc_toolchain()`/`cc_args()`/`cc_tool_map()` macros with static content** — every change to those macros has been an optional, defaulted addition, and the worked example needed exactly two small edits in the whole span. The cost is **materially higher** for anyone relying on rules_cc's *built-in* argument fragments (ThinLTO, `layering_check`, PIC flags, etc.) by label rather than reimplementing them: those fragments' internal `select()` conditions were rewritten three times in five weeks at 0.2.19–0.2.22, silently, with no changelog line naming the affected labels. BZL-CC-01's worked-example preference for the modular API stands on the attribute-stability evidence; its text should add the built-in-fragment caveat.

### Q2 — IWYU under Bazel {#q2}

**Question as commissioned:** Is there a maintained Bazel-native way to run include-what-you-use over `cc_*` targets — `rules_lint` (does it support IWYU?), `bazel_iwyu`/IWYU aspects on GitHub (maintainer, last release, Bazel floor), `hedron_compile_commands` as the bridge? Does any consume the same module maps `layering_check` uses? Propose BZL-CC-11's verification text.

**Findings.**

`rules_lint` (`aspect-build/rules_lint`, v2.9.0, published 2026-09-03, pushed 2026-09-04): its [`lint/` directory](https://github.com/aspect-build/rules_lint/tree/v2.9.0/lint) contains `clang_tidy.bzl` and `cppcheck.bzl` for C/C++. **No `iwyu.bzl` and no mention of "iwyu" anywhere in `docs/linting.md`.** rules_lint does not support IWYU as of this version.

Two GitHub projects are named `bazel_iwyu`, and this program must not conflate them:

- **`storypku/bazel_iwyu`** — the original. Last commit 2024-09-12, last release `0.20` (2023-07-22), 9 open issues, no `bazel_compatibility` declaration. Its README's install instructions are still `WORKSPACE`/`http_archive`-only.
- **`RealtimeRoboticsGroup/bazel_iwyu`** — an explicit fork (its own README: *"development has stalled on the original repository, we maintain this fork to keep the project active"*). First commit 2026-07-03, latest tag `v0.0.4` (2026-07-04), pushed as recently as 2026-07-04. Its `MODULE.bazel` is a real Bzlmod module: `bazel_dep(name = "bazel_skylib", version = "1.8.2")`, `bazel_dep(name = "rules_cc", version = "0.2.17")`, a `bazel_binaries.download(version = "8.0.0")`/`(version = "9.0.0")` CI matrix via `rules_bazel_integration_test`, and a `use_extension`-based `iwyu` extension providing `iwyu_prebuilt_pkg`.

The BCR confirms which project is actually published: `bazel-central-registry/modules/bazel_iwyu/metadata.json` names homepage `github.com/RealtimeRoboticsGroup/bazel_iwyu`, maintainer Austin Schuh, and exactly one version, `0.0.4`. **A `bazel_dep(name = "bazel_iwyu", version = "0.0.4")` resolves to the maintained fork, not to storypku's original — but the fork itself is only about two months old at this program's era date**, with a single primary maintainer.

Usage (from the fork's README): declare a `bazel_dep` on `bazel_iwyu`, then

```
build:iwyu --aspects @bazel_iwyu//:iwyu.bzl%iwyu_aspect
build:iwyu --output_groups=report
```

and run `bazel build --config=iwyu //path/to:target`; the legacy `@bazel_iwyu//bazel/iwyu:iwyu.bzl%iwyu_aspect` path is kept for backward compatibility.

**Does it consume the same module maps `layering_check` uses?** No — read directly from `bazel/iwyu/iwyu.bzl`'s aspect implementation: the aspect pulls `target[CcInfo].compilation_context` (defines, `includes`, `quote_includes`, `system_includes`) and derives the rest of the command line through `cc_common.create_compile_variables`/`cc_common.get_memory_inefficient_command_line` — the identical inputs an ordinary `CppCompile` action gets. **It never references `-fmodule-map-file=`, a `.cppmap` file, or any of `layering_check`'s `use_module_maps`/`module_maps` feature surface.** The two systems are structurally unrelated: IWYU is a static analysis of the actual `#include` graph derived from parsed sources; `layering_check`'s `-fmodules-strict-decluse` is a Clang-modules enforcement mechanism keyed on declared module maps. A clean IWYU run says nothing about `layering_check` coverage, and vice versa.

`hedronvision/bazel-compile-commands-extractor` (`main`, pushed 2025-08-11) remains the bridge for anyone who wants IWYU **without** wiring an aspect: it emits a standard `compile_commands.json` via `aquery`, described in its own README as feeding "build-system-independent tooling (e.g. `clangd` autocomplete, `clang-tidy` linting etc.)" — the same compilation-database format the standalone `include-what-you-use` project's own `iwyu_tool.py` consumes. Hedron's README does not mention IWYU by name; the bridge is generic, not IWYU-specific.

**Proposed BZL-CC-11 verification text:**

> Run an IWYU pass with `bazel_iwyu` (`bazel_dep(name = "bazel_iwyu", version = "0.0.4")` — confirm this resolves to `github:RealtimeRoboticsGroup/bazel_iwyu` on the BCR, never `storypku/bazel_iwyu`, which is stale since 2024-09-12) via `bazel build --config=iwyu //path/to:pkg/...` with `build:iwyu --aspects @bazel_iwyu//:iwyu.bzl%iwyu_aspect` and `build:iwyu --output_groups=report` in `.bazelrc`, then read the generated `<target>.<src>.iwyu.txt` reports before enabling `layering_check` on that package. `rules_lint` (checked at v2.9.0) does not offer an IWYU linter — do not look there. The IWYU pass and `layering_check` enforcement are independently verified: an IWYU report says nothing about whether `-fmodules-strict-decluse` is active on the same target (BZL-CC-12's `aquery` check), because the two consume disjoint inputs (IWYU: `CcInfo.compilation_context`; `layering_check`: `-fmodule-map-file=`/`.cppmap`). `grep -rn 'bazel_iwyu\|iwyu_aspect' MODULE.bazel .bazelrc*` — EMPTY means no IWYU pass has ever been wired, which is itself the finding BZL-CC-11 exists to catch for any package carrying `layering_check`.

**Answer.** As of 2026-09-06, a maintained Bazel-native IWYU path exists — `RealtimeRoboticsGroup/bazel_iwyu` 0.0.4, aspect-based, Bzlmod-native, tested against Bazel 8.0.0 and 9.0.0 — but it is a two-month-old fork of a project stale since 2024, not a mature ecosystem entry, and `rules_lint` does not carry it. The aspect and `layering_check` never share a module-map surface; they must be verified separately.

### Q3 — Sandbox base (M-L-17) {#q3}

**Question as commissioned:** Read `bazel.build/docs/sandboxing` on `--sandbox_base`, `--experimental_sandbox_async_tree_delete_idle_threads`, `--reuse_sandbox_directories` (renamed — confirm oldName in the 9.2.0 CLI reference), `--sandbox_tmpfs_path`. Measure: ~50 genrules, `--profile`, `--sandbox_base=/dev/shm` vs default, on 8.7.0. Report per-action delta and what hermeticity is given up.

**Documentation findings.**

`bazel.build/docs/sandboxing` (fetched fresh) mentions only one of the four flags — one sentence: *"Setting `--reuse_sandbox_directories` can mitigate the setup and teardown cost."* `--sandbox_base`, `--sandbox_tmpfs_path`, and `--experimental_sandbox_async_tree_delete_idle_threads` do not appear on that page at all. This is another instance of the program's standing finding that a bazel.build prose page under-documents relative to the CLI reference — it is not merely incomplete on rulesets, it is incomplete on Bazel's own core flags too.

No versioned `9.2.0` doc snapshot exists (`bazel.build/versions/9.2.0/...` → 404, consistent with the wave-3b correction); `9.1.0` is the closest live 9.x snapshot. Both `8.7.0` and `9.1.0` CLI references carry the same four flags with materially identical help text:

- `--sandbox_base=<a string>`, default `""`: *"Lets the sandbox create its sandbox directories underneath this path. Specify a path on tmpfs (like /run/shm) to possibly improve performance a lot when your build / tests have many input files."*
- `--sandbox_tmpfs_path=<an absolute path>`, multiple uses accumulated: mounts an empty writable directory at that path for sandboxed actions, "if supported by the sandboxing implementation, ignored otherwise."
- `--experimental_sandbox_async_tree_delete_idle_threads=<int|"auto"|"HOST_CPUS"|"HOST_RAM"[op<float>]>`, default `"4"` — the 8.7.0 and 9.1.0 wording differs cosmetically (8.7.0: "delete sandbox trees... execute the deletion... on an asynchronous thread pool"; 9.1.0: "sandboxes are deleted asynchronously in the background") but the default and semantics are unchanged.
- `--[no]reuse_sandbox_directories`, default `"true"` at both.

Confirmed directly from Bazel source (`SandboxOptions.java`, both the `8.7.0` and `9.2.0` tags, lines 309–319 at 9.2.0):

```java
@Option(
    name = "reuse_sandbox_directories",
    oldName = "experimental_reuse_sandbox_directories",
    oldNameWarning = false,
    defaultValue = "true",
    ...)
```

matching the prior correction. **New in this dive:** `--sandbox_base` itself also carries an old name, at lines 99–101 of the same file:

```java
@Option(
    name = "sandbox_base",
    oldName = "experimental_sandbox_base",
    defaultValue = "",
    ...)
```

— not previously recorded anywhere in this program. Neither old name is documented on any CLI reference page; both are visible only in source.

**Measurement.** Scratch workspace, `MODULE.bazel` with no `bazel_dep`, one package `pkg` with 50 `genrule`s each `cp`-ing the same small input file; Bazel **8.7.0** via `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk`, `--output_user_root` under this task's scratch directory, `bazelisk shutdown`-equivalent clean between runs. Spawn strategy confirmed `linux-sandbox` for all 50 actions in every run (`51 processes: 1 internal, 50 linux-sandbox`). `bazelisk analyze-profile` was not attempted — the wave-4a correction already established it was deleted at 9.0.0 and 8.7.0's build was never separately re-verified to still carry it, so this dive went straight to parsing the JSON trace with `python3`, per the fallback instruction.

Three clean rebuilds per condition, `action processing` events named `Executing genrule …` extracted from each `--profile` JSON trace:

| Condition | run 1 mean | run 2 mean | run 3 mean | overall (n=150) mean | overall stdev |
|---|---|---|---|---|---|
| default `sandbox_base` | 33.6ms | 21.7ms | 23.2ms | **26.2ms** | 10.9ms |
| `--sandbox_base=/dev/shm` | 24.4ms | 24.3ms | 23.4ms | **24.1ms** | 7.6ms |

**Per-action delta: ~2.1ms (~8%) in favor of `/dev/shm`, well inside one standard deviation — not a measurable effect on this host.** Root cause, confirmed directly: this task's mandated scratch directory is `/tmp/claude-…/scratchpad/…`, and `findmnt -T` on that path returns `tmpfs` — `/tmp` on this host is itself a 64GB tmpfs (`mount | grep /tmp` → `tmpfs on /tmp type tmpfs (rw,nosuid,nodev,size=67108864k,...)`), identical in kind to `/dev/shm` (16GB tmpfs). **The comparison this measurement can run, constrained to the mandated scratch location, is tmpfs-vs-tmpfs, not the tmpfs-vs-disk comparison the flag's own help text promises a benefit for.** [WSL2 + harness-location caveat: a bare-metal CI runner whose default output root sits on a real disk-backed filesystem would very plausibly see a real, larger delta; this measurement cannot speak to that case, only to the null result on a host/harness where both paths are already RAM-backed.]

**What hermeticity is given up.** Two distinct effects, verified directly rather than inferred:

1. **Directory permissions.** `stat` on the actual sandbox directories created in both conditions: `755`, owned by the invoking user, in *both* cases — Bazel's own `mkdir` behavior is unaffected by `--sandbox_base`. The exposure difference is in the **parent** chain: `/dev/shm`'s own mode is `1777` (world-writable-with-sticky-bit, i.e., world-traversable) — identically to `/tmp` on this host — while a real user's `$HOME` (the common real-world default parent for `~/.cache/bazel`) was `700` here. On an ordinary multi-user machine where the default sandbox base lives under a private home directory, redirecting `--sandbox_base` to `/dev/shm` removes that `700` barrier: any local user who can `cd /dev/shm` can list `bazel-sandbox.<hash>/` and read every world-readable file inside — a live copy of every input to that build. This harness's own mandated location happens to already be `1777`-parented, so it cannot demonstrate the delta directly; the mechanism is confirmed from the permission bits observed and is unaffected by which tmpfs is in play.
2. **Symlink vs. hardlink staging**, confirmed at `LinuxSandboxedSpawnRunner.java` (9.2.0, lines ~350–375): when `sandboxOptions.useHermetic` is false (the default; the flag is `--experimental_use_hermetic_linux_sandbox`), Bazel builds a `SymlinkedSandboxedSpawn` — inputs are staged as **symlinks**, which work across any filesystem boundary. When hermetic sandboxing is turned on, Bazel instead builds a `HardlinkedSandboxedSpawn`, and `HardlinkedSandboxedSpawn.java`'s own doc comment states plainly: *"Symlinks are resolved. If files is located on another disk, hardlink will fail and a copy will be made instead."* The code confirms this is a caught, silent fallback:

```java
try {
  source.createHardLink(target);
} catch (IOException e) {
  if (sandboxDebug) {
    logger.atInfo().log("File %s could not be hardlinked, file will be copied instead.", source);
  }
  FileSystemUtils.copyFile(source, target);
}
```

The practical consequence: pointing `--sandbox_base` at `/dev/shm` while running `--experimental_use_hermetic_linux_sandbox` and while the execroot/output_base lives on a *different* filesystem or device (the ordinary case — `/dev/shm` is its own tmpfs mount, distinct from wherever `--output_user_root` lives) silently downgrades every input's staging from an O(1) hardlink to an O(size) file copy, for every action, with only a `--sandbox_debug`-gated log line as evidence it happened at all.

**Answer.** On this host, under the constraint that all measurement had to run inside a tmpfs-backed scratch directory, `--sandbox_base=/dev/shm` produces **no measurable per-action speedup** (~2ms/action, within noise) because the default is already tmpfs. What is unambiguously true regardless of host is the mechanism, confirmed from Bazel 9.2.0 source: `/dev/shm`'s world-traversable parent mode trades away the isolation a private-home-rooted default gets for free, and `/dev/shm` combined with the hermetic sandbox strategy risks a silent hardlink→copy downgrade across the filesystem boundary. M-L-17 is now answered, at Bazel 8.7.0 and 9.2.0 identically for the flag semantics; the performance half needs a disk-backed re-run to be conclusive.

### Q4 — layering_check × C++20 named modules {#q4}

**Question as commissioned:** From `toolchains_llvm`'s README/issues, rules_cc's `cpp_modules` docs, and Bazel 9's C++20 modules notes, what happens to `layering_check` enforcement once `--features=cpp_modules` is on; what is stated vs. unknown; write the precise "not settled" entry with the verification that would settle it.

**Findings.**

`toolchains_llvm`'s README on `main` (fetched fresh) states the default-off rationale exactly as BZL-CC-05 already records: *"Without the `cpp_modules` feature, the toolchain continues to disable C++ named modules to preserve the existing Clang module-map behavior used by `layering_check`."* It states nothing about the far side.

**The feature does not exist in any released version of `toolchains_llvm`.** The latest tag, `v1.9.0`, was published 2026-08-29. The "C++ named modules" README section, `module_interfaces` wiring, and the `cpp_modules` toolchain feature were added only by [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) ("Add C++20 modules support"), **merged 2026-09-02** — four days after `v1.9.0` and four days before this program's era date. Confirmed by fetching `v1.9.0`'s actual `README.md` and `toolchain/cc_toolchain_config.bzl`: no "named modules" text anywhere in the README, and the toolchain config at that tag still contains only the old, unconditional form:

```python
# v1.9.0 (released) — cc_toolchain_config.bzl, unconditional for LLVM >= 14:
cxx_flags.append("-Xclang")
cxx_flags.append("-fno-cxx-modules")
cxx_flags.append("-Wno-module-import-in-extern-c")
```

The BCR's `toolchains_llvm` metadata confirms `v1.9.0` is still the newest published version — a `bazel_dep(name = "toolchains_llvm", version = "1.9.0")` gets **zero** C++20-modules support. **BZL-CC-04's citation of "toolchains_llvm 1.9.0" as the version carrying the Bazel-9.2+LLVM-22 named-modules floor is describing an unreleased `main`-branch feature, not something reachable through a normal Bzlmod pin.**

PR #843's own diff to `cc_toolchain_config.bzl` is the primary evidence for the interaction itself. The old unconditional suppression is replaced with a feature-gated one:

```python
cc_feature_constraint(
    name = name + "_not_cpp_modules",
    none_of = [":" + name + "_cpp_modules"],
)
cc_args(
    name = name + "_disable_cpp_modules_args",
    actions = ["@rules_cc//cc/toolchains/actions:cpp_compile_actions"],
    args = ["-Xclang", "-fno-cxx-modules", "-Wno-module-import-in-extern-c"],
    requires_any_of = [":" + name + "_not_cpp_modules"],   # <- only applied when cpp_modules is OFF
)
```

The commit's own comment names exactly why this matters: *"With C++20, Clang defaults to using C++ rather than Clang modules, which breaks Bazel's `use_module_maps` feature, which is used by `layering_check`. Disable C++ modules by default, but not when the caller explicitly enables Bazel's `cpp_modules` feature."* — i.e., the PR removes the workaround precisely in the one case (`cpp_modules` on) where the underlying Clang behavior it exists to counteract is guaranteed to recur, **and adds no replacement**.

Cross-checking `rules_cc` 0.2.22's own `layering_check` feature fragment (`cc/toolchains/args/layering_check/BUILD`) confirms there is no declared relationship at all between the two features: `layering_check`'s `cc_args` target the plain `@rules_cc//cc/toolchains/actions:compile_actions` action set; the new module machinery uses the disjoint `cpp20_module_compile`/`cpp20_module_codegen`/`cpp_module_deps_scanning` action types (all four already present in `rules_cc` 0.2.22's `cc/toolchains/actions/BUILD`, confirmed by direct fetch). Neither fragment references, requires, or excludes the other.

The PR's own test suite (`tests/cpp_modules/BUILD.bazel`, `tests/scripts/run_cpp_modules_test.sh`) builds and inspects a module target under `--features=cpp_modules` **alone** — it never combines `layering_check` with `cpp_modules` in the same build, and grepping the diff for `layering_check` returns nothing. **The combination has zero test coverage anywhere in this corpus's primary sources**, at any version, because the only version that could even attempt it (an unreleased `main` commit four days old) has never been asked the question.

**Answer.** As of 2026-09-06: `toolchains_llvm`'s C++20-modules support is pre-release (on `main` only, four days old); its own stated rationale for the previous unconditional Clang-modules suppression is that Clang's C++20-modules default *"breaks Bazel's `use_module_maps` feature, which is used by `layering_check`"* — and the PR that finally allows `cpp_modules` to be enabled removes that suppression for exactly that case with no substitute. Whether `layering_check` still catches an undeclared `#include` in an ordinary (non-named-module) file compiled in the same target graph once `cpp_modules` is on is **not stated anywhere, not tested anywhere, and not yet reachable through any released version of the toolchain** — this program cannot settle it without building against an unreleased commit.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| BZL-CC-01 | Add to the rationale: the modular API's public macro attributes are additive-only (0 renames/removals, 0.1.1→0.2.22), but its *built-in* argument fragments (ThinLTO, `layering_check`, PIC flags, etc.) had `select()` conditions rewritten three times in five weeks at 0.2.19–0.2.22 with no changelog line naming the affected labels — a consumer using only the fragments-by-reference path inherits that churn silently. | [rules_cc commit 31f137fd](https://github.com/bazelbuild/rules_cc/commit/31f137fd8838bb961332df8857b84c75f769333b); [`toolchain.bzl` diff](https://github.com/bazelbuild/rules_cc/blob/main/cc/toolchains/toolchain.bzl) 0.1.1 vs 0.2.22 (this dive's scratch) | measured |
| BZL-CC-04 | Add a MUST clause: before citing "Bazel 9.2 + LLVM 22" as `toolchains_llvm`'s named-modules floor, confirm whether the repo pins a *release* or a `main`/commit ref — as of era 2026-09-06 the feature exists only on `main` (merged 2026-09-02, PR #843), not in the latest tag `v1.9.0` (2026-08-29) or on the BCR. | [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843); `v1.9.0` README (no "named modules" section, fetched directly) | measured |
| BZL-CC-05 | Replace "the far side is undocumented" with the settled fact: the toolchain's own `-fno-cxx-modules` suppression — which existed specifically to protect `layering_check` from Clang's C++20-modules default — is now gated OFF exactly when `cpp_modules` is enabled (PR #843), with no replacement and no test combining the two features anywhere in `toolchains_llvm` or `rules_cc`. State this as the *reason* the interaction is unknown, not just that it is unknown. | PR #843 diff (`cc_toolchain_config.bzl`); `rules_cc` 0.2.22 `cc/toolchains/args/layering_check/BUILD` (no reference to module actions) | measured |
| BZL-CC-10 | Add a fourth demonstrated instance to the rationale: `toolchains_llvm`'s own README on `main` documents `cpp_modules`, a feature absent from its latest tagged release and from the BCR — "re-read the current README" must specify *which ref* (tag vs. `main`) is being read. | `v1.9.0` vs `main` README diff | measured |
| BZL-CC-11 | Ship the concrete verification text drafted in [Q2](#q2): name `RealtimeRoboticsGroup/bazel_iwyu` 0.0.4 as the maintained Bzlmod-native aspect, flag `storypku/bazel_iwyu` as stale since 2024-09-12 despite sharing the exact module name, and state that `rules_lint` (checked at v2.9.0) has no IWYU support. | BCR `modules/bazel_iwyu/metadata.json`; `aspect-build/rules_lint` `lint/` directory listing at v2.9.0 | measured |
| BZL-CC-12 | Add a clause: an IWYU pass and `layering_check` enforcement are independent checks with no shared input — `bazel_iwyu`'s aspect reads `CcInfo.compilation_context`, never a `.cppmap`/`-fmodule-map-file=`. Passing one says nothing about the other. | `RealtimeRoboticsGroup/bazel_iwyu` `bazel/iwyu/iwyu.bzl` source (fetched directly) | measured |
| NEW-1 (proposed home: `BZL-HERM`, cross-referenced from `BZL-CC`) | `--sandbox_base=<tmpfs path>` is CONSIDER, not a blanket recommendation: it buys nothing measurable where the default sandbox location is already tmpfs-backed (confirm via `findmnt -T $(bazel info output_base)`); combined with `--experimental_use_hermetic_linux_sandbox` it silently downgrades every input's staging from a hardlink to a full copy whenever the sandbox base and the execroot sit on different filesystems (`EXDEV` caught and swallowed). Verify with `--sandbox_debug` and grep the log for "will be copied instead". | This dive's measurement (150 actions, 3 runs/condition); [`HardlinkedSandboxedSpawn.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/HardlinkedSandboxedSpawn.java) @ 9.2.0 | measured |
| NEW-2 | Record that `--sandbox_base` itself carries `oldName = "experimental_sandbox_base"` (previously unrecorded in this program), alongside the existing `reuse_sandbox_directories` → `experimental_reuse_sandbox_directories` note. | [`SandboxOptions.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) @ 9.2.0, lines 99–101 | measured (primary source) |
| M-L-17 | Retire the "not researched" status in `bazel-cpp.md`'s open-questions table — answered by [Q3](#q3) above, with the WSL2/harness-location caveat stated. | This file | measured |

## AI-agent angle

- **Conflating the two `bazel_iwyu` projects by name alone.** A model asked "is there an IWYU ruleset" will find `storypku/bazel_iwyu` first (older, more search-engine history) and miss that it is two years stale while a maintained fork exists under a different GitHub org with the identical module name. *Check*: always resolve the module name through the BCR (`bazel-central-registry/modules/bazel_iwyu/metadata.json`), which names the actual maintained homepage, rather than trusting the first search hit.
- **Citing `toolchains_llvm`'s README verbatim without checking whether the described feature is in a release.** This program's own prior worked example (BZL-CC-10) already exists to catch stale version numbers in a README; this dive shows the *opposite* failure mode is equally live — a README on `main` describing a feature that is **ahead of** every tagged release. *Check*: `gh api repos/<owner>/<repo>/releases --jq '.[0].tag_name'` and diff that tag's README against `main` before repeating any capability claim, not just its version-number code fences.
- **Treating "the modular toolchain API changed" and "my `cc_toolchain()` call needs a rewrite" as the same claim.** The commit-level churn in rules_cc's built-in argument fragments is real and undocumented in the release notes' prose, but it never touched a public macro attribute in 21 releases. *Check*: BZL-CC-01's worked example only needed two edits in 14 months; a model recommending a defensive rewrite on every rules_cc bump is overreacting to internal churn it cannot see from the changelog anyway.
- **Assuming `--sandbox_base=/dev/shm` is a free performance win.** The flag's own help text ("possibly improve performance a lot") invites exactly that assumption, and most tutorials repeat it without the tmpfs-vs-tmpfs caveat. *Check*: `findmnt -T` on the *current* default sandbox location before recommending the flag; if it already reports `tmpfs`, there is nothing to gain.
- **Recommending `--sandbox_base=/dev/shm` alongside `--experimental_use_hermetic_linux_sandbox` without checking the filesystem boundary.** The combination is a plausible-sounding "maximum hermeticity, maximum speed" pairing that a model would readily suggest; the actual effect, per source, is a silent hardlink-to-copy downgrade. *Check*: NEW-1's `--sandbox_debug` grep.

## Contested / evolving

- **Whether `layering_check` survives `--features=cpp_modules`** is not contested between sources — it is simply unaddressed by every source that exists, including the PR that just shipped the feature. This is not a disagreement to arbitrate; it is a genuine gap this program cannot close without an unreleased build.
- **The performance case for `--sandbox_base=/dev/shm`** is contested only in the sense that this measurement's null result is host/harness-specific (mandated tmpfs scratch) rather than a general refutation of the flag's own documented rationale. A disk-backed default would very plausibly show the classic win; this dive could not test that case under its operating constraints.

## Not settled

- **`layering_check` × `--features=cpp_modules`, precisely restated:** on `toolchains_llvm` `main` (post-[PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843), 2026-09-02), does `bazel build --features=layering_check,cpp_modules --experimental_cpp_modules --cxxopt=-std=c++20` on a target with a deliberately undeclared `#include` in an ordinary (non-module) source file still fail with the `-fmodules-strict-decluse` diagnostic? **Verification that would settle it:** pin `toolchains_llvm` to the `843`-containing commit (no release carries it yet) with LLVM 22, build a `cc_library` that has both a `module_interfaces` file and an ordinary `.cc` file with a private, undeclared `#include` of a transitive dependency's header, with `layering_check` and `cpp_modules` both enabled; record whether the undeclared-inclusion error still fires. This program did not run that build — it requires an unreleased ref and was out of scope for a measurement pass that also had to cover Q1–Q3.
- **Whether the `--sandbox_base=/dev/shm` performance claim holds on a disk-backed default.** Settled here only for the null (tmpfs-vs-tmpfs) case. **Verification that would settle the general case:** repeat this dive's exact 50-genrule protocol with `--output_user_root` rooted on a real block-device filesystem (e.g., `ext4`, confirmed via `findmnt -T`) rather than inside the mandated tmpfs scratch directory — outside this program's permitted execution locations, so left for a future measurement wave or a CI-runner rerun.
- **`bazel_iwyu`'s (`RealtimeRoboticsGroup` fork) longevity.** Two months of history and one primary maintainer is not enough to call it a stable ecosystem entry the way `hedron_compile_commands` or `rules_lint` are. **Verification that would settle it:** re-check its commit cadence and BCR version count at the next research wave; a gap of several months with no new BCR version would be the signal to downgrade BZL-CC-11's confidence in it.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazelbuild/rules_cc releases API](https://github.com/bazelbuild/rules_cc/releases) | GitHub Releases (the de facto changelog; no `CHANGELOG.md` file exists) | 2024-10 → 2026-07 (0.0.12 → 0.2.22) | Only source of PR-level provenance for the macOS/ThinLTO churn; confirms no `CHANGELOG.md` exists |
| [rules_cc commit `31f137fd`](https://github.com/bazelbuild/rules_cc/commit/31f137fd8838bb961332df8857b84c75f769333b) | Single commit diff | 2026-06-01 (0.2.19) | The exact `layering_check`/ThinLTO/PIC condition rewrite across 8 built-in argument fragments |
| [rules_cc `examples/rule_based_toolchain`](https://github.com/bazelbuild/rules_cc/tree/0.2.22/examples/rule_based_toolchain) | Worked example, fetched at 5 tags (0.1.1/0.1.4/0.2.0/0.2.10/0.2.22) | 2025-02 → 2026-07 | The actual BUILD-surface diff this question asked for |
| [rules_cc `cc/toolchains/toolchain.bzl`](https://github.com/bazelbuild/rules_cc/blob/main/cc/toolchains/toolchain.bzl) | Public macro source, diffed 0.1.1 vs 0.2.22 | 2025-02 vs 2026-07 | The attribute-level stability evidence (3 additions, 0 renames/removals) plus the new `bazel_features`-gated native path |
| [rules_cc `cc/toolchains/args/layering_check/BUILD`](https://github.com/bazelbuild/rules_cc/blob/0.2.22/cc/toolchains/args/layering_check/BUILD) | Built-in feature fragment, current | 2026-07 (0.2.22) | Shows `layering_check` has zero declared relationship to the new module action types |
| [rules_cc `cc/toolchains/actions/BUILD`](https://raw.githubusercontent.com/bazelbuild/rules_cc/0.2.22/cc/toolchains/actions/BUILD) | Action-type registry | 2026-07 (0.2.22) | Confirms `cpp20_module_compile`/`cpp20_module_codegen`/`cpp_module_deps_scanning` already ship natively |
| [aspect-build/rules_lint `lint/` tree @ v2.9.0](https://github.com/aspect-build/rules_lint/tree/v2.9.0/lint) | Ruleset source, linter file listing | 2026-09-03 | Direct evidence of no `iwyu.bzl`; only `clang_tidy.bzl`/`cppcheck.bzl` for C++ |
| [RealtimeRoboticsGroup/bazel_iwyu README](https://raw.githubusercontent.com/RealtimeRoboticsGroup/bazel_iwyu/main/README.md) | Maintained fork's own docs | 2026-07 (main) | States the fork rationale explicitly; the Bzlmod usage snippet |
| [RealtimeRoboticsGroup/bazel_iwyu `bazel/iwyu/iwyu.bzl`](https://raw.githubusercontent.com/RealtimeRoboticsGroup/bazel_iwyu/main/bazel/iwyu/iwyu.bzl) | Aspect implementation source | 2026-07 (main) | Proves the aspect reads `CcInfo.compilation_context`, never a module map |
| [storypku/bazel_iwyu](https://github.com/storypku/bazel_iwyu) | The original, stale project | last commit 2024-09-12 | The name-collision trap this dive exists partly to flag |
| [BCR `modules/bazel_iwyu/metadata.json`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/bazel_iwyu/metadata.json) | Bazel Central Registry module metadata | fetched 2026-09-06 | Ground truth for which `bazel_iwyu` a `bazel_dep` actually resolves to |
| [hedronvision/bazel-compile-commands-extractor README](https://raw.githubusercontent.com/hedronvision/bazel-compile-commands-extractor/main/README.md) | Ruleset docs | pushed 2025-08-11 | The `aquery`-based `compile_commands.json` bridge statement |
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | Prose doc, current | fetched 2026-09-06 | Confirms 3 of 4 commissioned flags are undocumented there |
| [Bazel 8.7.0 command-line reference](https://bazel.build/versions/8.7.0/reference/command-line-reference) | Versioned CLI reference | 8.7.0 | Full help text for all four sandbox flags |
| [Bazel 9.1.0 command-line reference](https://bazel.build/versions/9.1.0/reference/command-line-reference) | Versioned CLI reference (closest live 9.x snapshot; 9.2.0 has none) | 9.1.0 | Same, for the 9.x comparison |
| [`SandboxOptions.java` @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | Bazel source, tagged | 9.2.0 | `oldName` ground truth for both `reuse_sandbox_directories` and `sandbox_base` |
| [`SandboxOptions.java` @ 8.7.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | Bazel source, tagged | 8.7.0 | Confirms identical option definitions at the fleet-pinned major |
| [`LinuxSandboxedSpawnRunner.java` @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxedSpawnRunner.java) | Bazel source, tagged | 9.2.0 | The symlink-vs-hardlink branch point (`useHermetic`) |
| [`HardlinkedSandboxedSpawn.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/HardlinkedSandboxedSpawn.java) | Bazel source, tagged | 9.2.0 | The caught-`IOException`-falls-back-to-copy code, verbatim |
| [bazel-contrib/toolchains_llvm README @ `main`](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) | Ruleset docs, unreleased state | fetched 2026-09-06 | The "C++ named modules" section that does not exist in any release |
| [bazel-contrib/toolchains_llvm README @ `v1.9.0`](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/v1.9.0/README.md) | Ruleset docs, latest release | 2026-08-29 | Proves the feature is absent from the actual shipped version |
| [toolchains_llvm PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) | The commit that added C++20 modules support | merged 2026-09-02 | The `cc_toolchain_config.bzl` diff is the primary evidence for Q4's whole answer |
| [BCR `modules/toolchains_llvm/metadata.json`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/toolchains_llvm/metadata.json) | BCR module metadata | fetched 2026-09-06 | Confirms `v1.9.0` is still the newest published version |
| This dive's own measurement scratch (50-genrule workspace, 6 `--profile` traces) | In-house measurement | run 2026-09-06 | The Q3 timing table and the `findmnt`/`stat` permission evidence |
