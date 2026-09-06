---
title: Layering check, include-path hygiene, and sanitizer configs under Bazel
topic: layering-check-includes-and-sanitizers
group: bazel-cpp
family: BZL-CC
agent: research-lang wave-3b worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 12
settles: [M-L-06, M-L-07, M-L-09, M-L-10, M-L-11, M-L-12]
builds_on: [BZL-HERM-07, BZL-HERM-08, BZL-HERM-09, BZL-HERM-24, BZL-LARK-10]
scope: |
  Covers: the `layering_check` mechanism end to end (module-map generation,
  the exact compiler flags, its direct-includes-only scope, the per-package
  rollout procedure, and a corrected account of its sandboxing dependency);
  the `includes`/`strip_include_prefix`/`include_prefix`/`implementation_deps`
  attribute quartet; the standard sanitizer (`asan`/`tsan`/`ubsan`/`msan`)
  `.bazelrc` block and the `--host_features` reset; and `rules_fuzzing`'s
  build-setting shape for sanitizer+engine selection.
  Does NOT cover: which hermetic C++ toolchain to adopt or its cost tree
  (`bazel-cpp/hermetic-cc-toolchain-choice`, which also owns
  `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` and the zig/UBSAN trap — cited here,
  never restated); `rules_foreign_cc`, native C++20 modules, or
  `compile_commands.json` generation (`bazel-cpp/foreign-builds-modules-and-cpp-tooling`);
  the general sandboxing/determinism taxonomy, owned by
  `bazel-hermeticity-determinism` (cited by ID). **This file ships with no
  fleet consumer**: `rules_ocx` — the fleet's only Bazel repository —
  compiles zero `cc_*` targets, so every claim here is grounded on upstream
  sources and the practitioner corpus, verified against tagged releases,
  the project's own issue tracker, and source, never against a fleet build.
---

# Layering check, include-path hygiene, and sanitizer configs under Bazel

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [How Bazel turns hdrs/srcs/deps into a .cppmap file](#1-how-bazel-turns-hdrssrcsdeps-into-a-cppmap-file)
   2. [The exact compiler flags, traced to rules_cc source](#2-the-exact-compiler-flags-traced-to-rules_cc-source)
   3. [Direct-includes-only: the Encyclopedia's own scope statement, and why IWYU runs first](#3-direct-includes-only-the-encyclopedias-own-scope-statement-and-why-iwyu-runs-first)
   4. [Rollout is per-package, and the missing-stdlib-module-maps blocker](#4-rollout-is-per-package-and-the-missing-stdlib-module-maps-blocker)
   5. [Corrected: "layering_check doesn't work without sandboxing" — what the primary sources actually show](#5-corrected-layering_check-doesnt-work-without-sandboxing--what-the-primary-sources-actually-show)
   6. [Verifying enforcement, not just the flag](#6-verifying-enforcement-not-just-the-flag)
   7. [hdrs_check is dead; stop grepping for it](#7-hdrs_check-is-dead-stop-grepping-for-it)
   8. [The include-path trio, disambiguated](#8-the-include-path-trio-disambiguated)
   9. [implementation_deps: the fourth attribute in the confusion](#9-implementation_deps-the-fourth-attribute-in-the-confusion)
   10. [The standard sanitizer flag set](#10-the-standard-sanitizer-flag-set)
   11. [--host_features and why sanitizers don't leak into build tools](#11---host_features-and-why-sanitizers-dont-leak-into-build-tools)
   12. [MSan's instrumented libc++ tax](#12-msans-instrumented-libc-tax)
   13. [The fuzzing config shape: build settings, not raw copts](#13-the-fuzzing-config-shape-build-settings-not-raw-copts)
   14. [Bazel 9 autoload: cc_library/cc_binary/cc_test need an explicit load()](#14-bazel-9-autoload-cc_librarycc_binarycc_test-need-an-explicit-load)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Bazel generates one `.cppmap` file per `cc_*` target: `hdrs`/`textual_hdrs` become `textual header` declarations, `srcs` headers become `private textual header` declarations, and `deps` become `use` declarations — this is the ruleset's own documented mapping, demonstrated with a real `bazel build` trace ([maskray](https://maskray.me/blog/2022-09-25-layering-check-with-clang)).
- `layering_check` compiles with exactly `-fmodules-strict-decluse -Wprivate-header` plus a `-fmodule-map-file=`/`-fmodule-name=` pair per target and per **direct** dependency — traced to `rules_cc`'s `unix_cc_toolchain_config.bzl`, not Bazel core (§2).
- The check only fires on a **directly written** `#include` line; a symbol pulled in transitively through an already-permitted header's own includes is invisible to it. Run Include-What-You-Use (or an equivalent direct-include pass) first, or the rollout stalls on noise ([Build Encyclopedia](https://bazel.build/versions/8.7.0/reference/be/c-cpp#cc_library), §3).
- Rollout is per-package or per-target (`--features=layering_check` on the CLI, or `features` on `package()`/a target) — never documented as a repo-wide default flip, because most systems ship no Clang module maps for their C/C++ standard library and `-fmodules-strict-decluse` errors on every stdlib include until one exists; Bazel supplies `tools/cpp/generate_system_module_map.sh` as the unblocker (§4).
- **Correction to the map's M-L-06 framing.** The cited bug, [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592) ("`layering_check` doesn't work without sandboxing"), shows the *opposite* polarity from "silently stops enforcing": an **unsandboxed** build failed with a spurious "undeclared inclusion" error that a **sandboxed** build of the same target did not produce. It was fixed in **Bazel 7.3.0** (2024-08-12) — both fleet-relevant majors (8.7.0, 9.x) postdate the fix. The durable lesson underneath is narrower than "false negative": layering_check's guarantee is scoped to whatever module maps Bazel actually declares as inputs, and Clang does not error when an `extern module` reference can't be resolved — it silently drops it (§5).
- **The real, still-current gap is not sandboxing, it's staging**: Bazel stages `-fmodule-map-file=` flags only for a target's **direct** dependencies, not the full transitive closure — a separate, permanent design point from the direct-includes-only scope in §3 ([bazelbuild/bazel#21592 body](https://github.com/bazelbuild/bazel/issues/21592)).
- "Enabled" is not "enforcing." Confirm with `bazel aquery`, not by reading `.bazelrc` — a rule can be on for a package and still never reach a given target's compile action (wrong toolchain, wrong compiler, a `select()` that never resolves there) (§6).
- `hdrs_check` is a `cc_library`/`cc_binary` attribute that has been "Deprecated, no-op" in the Build Encyclopedia text at both **8.7.0** and **9.1.0** — identical wording at both versions. It predates `layering_check` and does nothing; do not treat setting it as adopting strict deps (§7).
- `includes`, `strip_include_prefix`, and `include_prefix` are not three spellings of one idea: `includes` adds a compiler search path that **propagates to every reverse dependency** ("not the rules it depends upon" — the Encyclopedia's own emphasis); `strip_include_prefix`/`include_prefix` only relabel where a target's *own* `hdrs` are addressable from, with no leakage to dependents (§8).
- Both `strip_include_prefix` and `include_prefix` are documented as "only legal under `third_party`" — a convention statement in the Encyclopedia text itself, not a claim this file verifies as toolchain-enforced (§8).
- `implementation_deps` keeps a library's private, compile-only dependencies off the public compile line: consumers get neither the headers nor the include paths of an `implementation_deps` entry, though it is still linked into any binary that depends on the library (§9).
- The standard sanitizer feature (`asan`/`ubsan`/`tsan`, all via `rules_cc`'s shared `_sanitizer_feature` helper) always adds `-fno-omit-frame-pointer` and `-fno-sanitize-recover=all` to every compile action, on top of the sanitizer-specific `-fsanitize=` flags — this is baked into the feature, not something a `.bazelrc` line needs to add separately ([rules_cc source](https://github.com/bazelbuild/rules_cc/blob/main/cc/private/toolchain/unix_cc_toolchain_config.bzl), §10).
- The community `.bazelrc` convention layered on top (grpc, google/xls) additionally pins `--strip=never`, an explicit optimization level (`-O0` or `-O1` depending on the project), `-g`, and the matching `linkopt=-fsanitize=...` — because the toolchain feature alone does not set `--strip` or opt level (§10).
- `--features=X` only applies "for targets built in the **target** configuration" per the command-line reference; it does not reach the exec configuration unless `--host_features=X` is also set. This — not an active Bazel "reset" — is why enabling a sanitizer as a feature leaves build tools uninstrumented by default (§11).
- MemorySanitizer additionally requires an instrumented libc++, Linux-only, with **no official prebuilt**; a repository must build one from matching LLVM sources and point a distribution at it (§12).
- `rules_fuzzing` (Bazel's own official fuzzing ruleset, `blog.bazel.build/2021/02/08/rules-fuzzing.html`) does not want hand-written `--copt=-fsanitize=` lines for a fuzz target — it exposes a three-axis build-setting selection (`cc_engine`, `cc_engine_instrumentation`, `cc_engine_sanitizer`) wired up behind named `--config=asan-libfuzzer`-style aliases (§13).
- On Bazel 9, a bare `cc_library(...)`/`cc_binary(...)`/`cc_test(...)` in a `BUILD` file with no `load()` is a hard error — `--incompatible_autoload_externally` defaults empty, per [BZL-LARK-10](../bazel-starlark-and-build.md); the concrete fix for this family is `load("@rules_cc//cc:cc_library.bzl", "cc_library")` (and the `cc_binary.bzl`/`cc_test.bzl` siblings), all real file targets in `rules_cc`'s own `cc/BUILD` (§14).

## Findings

### 1. How Bazel turns hdrs/srcs/deps into a .cppmap file

Clang's header-modules machinery needs a *module map* — a file declaring which headers belong to which named module, and which other modules a module is allowed to `use`. Bazel generates one per `cc_*` target rather than asking anyone to hand-write it. Maskray's worked example, run against a real `bazel build --features=layering_check`, shows the generated file for a three-target chain (`a` binary → `b` library → `c` library):

```
% cat bazel-out/k8-fastbuild/bin/a.cppmap
module "//:a" {
  export *
  private textual header "../../../a.h"
  use "//:b"
  use "@bazel_tools//tools/cpp:malloc"
  use "crosstool"
}
extern module "//:b" "../../../bazel-out/k8-fastbuild/bin/b.cppmap"
extern module "@bazel_tools//tools/cpp:malloc" "..."
extern module "crosstool" "external/local_config_cc/module.modulemap"
```

The mapping is exactly: **`hdrs`/`textual_hdrs` → `textual header`, `srcs` headers → `private textual header`, `deps` → `use`** ([maskray](https://maskray.me/blog/2022-09-25-layering-check-with-clang)). `a.cc`'s own `srcs` header (`a.h`, since `cc_binary` has no `hdrs` attribute at all) is a *private* textual header of module `//:a`; `b`'s public `hdrs` are plain textual headers of `//:b`. The Build Encyclopedia's independent framing agrees: `hdrs` "comprise the public interface" and are includable from any `cc_*` rule listing the library in `deps`, while `srcs` headers "must only be directly included from the files in `hdrs` and `srcs` of the library itself" ([Build Encyclopedia, cc_library](https://bazel.build/versions/8.7.0/reference/be/c-cpp#header-inclusion-checking)) — the public/private split the Encyclopedia describes in prose is exactly what the generated `.cppmap` encodes as `header` vs. `private ... header`.

### 2. The exact compiler flags, traced to rules_cc source

The feature itself lives in `rules_cc`, not Bazel core — `layering_check` `implies use_module_maps` and adds:

```python
# cc/private/toolchain/unix_cc_toolchain_config.bzl (rules_cc, main, fetched 2026-09-05)
feature(
    name = "layering_check",
    implies = ["use_module_maps"],
    flag_sets = [flag_set(
        actions = [c_compile, cpp_compile, cpp_header_parsing, cpp_module_compile],
        flag_groups = [
            flag_group(flags = ["-fmodules-strict-decluse", "-Wprivate-header"]),
            flag_group(
                iterate_over = "dependent_module_map_files",
                flags = ["-fmodule-map-file=%{dependent_module_map_files}"],
            ),
        ],
    )],
)
```

`use_module_maps` separately contributes `-fmodule-name=%{module_name}` and `-fmodule-map-file=%{module_map_file}` (the target's *own* map) for every compile action ([rules_cc, unix_cc_toolchain_config.bzl](https://github.com/bazelbuild/rules_cc/blob/main/cc/private/toolchain/unix_cc_toolchain_config.bzl)). A real invocation's argument list, quoted from the same maskray trace:

```
-fmodule-name=//:a -fmodule-map-file=bazel-out/.../a.cppmap
-fmodules-strict-decluse -Wprivate-header
-fmodule-map-file=external/local_config_cc/module.modulemap
-fmodule-map-file=bazel-out/.../b.cppmap
```

`c.cppmap` is absent from that list — `:c` is not a **direct** dependency of `:a`, so its map is never passed as an explicit flag; Clang only reaches it lazily, via the `extern module "//:c"` line inside `b.cppmap`, if it needs to (§5). `-fmodules-strict-decluse` is Clang's stricter sibling of `-fmodules-decluse`: the non-strict form tolerates an included file that isn't in *any* module (needed for headers Bazel hasn't modularized), while the strict form Bazel actually uses errors on those too ([maskray](https://maskray.me/blog/2022-09-25-layering-check-with-clang)). `-Wprivate-header` is a separate, on-by-default Clang warning enforcing the `private textual header` marking — orthogonal to `-fmodules-strict-decluse`, and it fires even with `layering_check` fully disabled, so long as `-fmodule-map-file=` flags are present at all.

`layering_check` first shipped for Clang on Linux via [bazelbuild/bazel#11440](https://github.com/bazelbuild/bazel/pull/11440) (opened 2020-05-19); it has been stable, unchanged in mechanism, across every Bazel release since. The current `rules_cc` release is **0.2.22** (2026-07-07, [releases](https://github.com/bazelbuild/rules_cc/releases)).

### 3. Direct-includes-only: the Encyclopedia's own scope statement, and why IWYU runs first

The Build Encyclopedia states the enforcement boundary explicitly, independent of the module-map mechanics: "The inclusion checking rules only apply to *direct* inclusions... the compiler may read `baz.h` and `baz-impl.h` when compiling `foo.cc`, but `foo.cc` must not contain `#include "baz.h"`" ([Build Encyclopedia, cc_library](https://bazel.build/versions/8.7.0/reference/be/c-cpp#header-inclusion-checking)). Maskray's own second example makes the failure mode concrete: `a.cc` writes only `#include "dir/b.h"`, gets `fc()`'s declaration transitively because `b.h` itself includes `c.h`, and never writes `#include "dir/c.h"` anywhere — "`-fmodules-strict-decluse` cannot flag this case" ([maskray](https://maskray.me/blog/2022-09-25-layering-check-with-clang)). This is *not* the sandboxing issue in §5; it is permanent and applies identically on every Bazel major and every execution strategy. It is exactly Include-What-You-Use's target case (ensuring each translation unit directly includes what it uses, rather than relying on transitive pull-through) — run IWYU (or a manual pass) before or during a `layering_check` rollout, or every un-direct-ified transitive include is a silent hole the feature was never designed to see.

### 4. Rollout is per-package, and the missing-stdlib-module-maps blocker

Nothing in the primary sources documents `--features=layering_check` as a global `.bazelrc` default for an existing codebase. The Encyclopedia frames it as opt-in per invocation, per package, or per target: "requested explicitly, for example via the `--features=layering_check` command-line flag or the `features` parameter of the [`package`](https://bazel.build/versions/8.7.0/reference/be/functions#package) function" ([Build Encyclopedia, cc_library](https://bazel.build/versions/8.7.0/reference/be/c-cpp#header-inclusion-checking)). The real-world exemplar cited by maskray is LLVM's own (unsupported) Bazel build, which enables `features = ["layering_check"]` only for `llvm/`, `clang/`, and `mlir/` — not repo-wide.

The practical reason a repo-wide flip fails on day one: "Many systems do not ship Clang module map files for C/C++ standard libraries, so `-fmodules-strict-decluse` is not suitable" without a workaround ([maskray](https://maskray.me/blog/2022-09-25-layering-check-with-clang)) — every `#include <stdio.h>`-style system header immediately errors ("module A does not depend on a module exporting 'stdio.h'"). Bazel's own unblocker is `tools/cpp/generate_system_module_map.sh`, which generates a synthetic module map listing every system header the toolchain ships, loaded by the toolchain feature as the `crosstool` module seen in §1's `.cppmap` dump.

```bzl
# Correct: opt in per package, after IWYU has run there
package(features = ["layering_check"])

# Wrong: flip it for the whole repo in one .bazelrc line before any
# per-package IWYU pass — every stdlib include and every un-direct-ified
# transitive include fails on the first build.
# build --features=layering_check
```

### 5. Corrected: "layering_check doesn't work without sandboxing" — what the primary sources actually show

The map's M-L-06 row frames this as "an unsandboxed compile loads transitive module maps Bazel never declared, producing a **silent false negative**." The primary source it traces to — [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592), filed 2024-03-06 by `fmeum` (a `rules_cc`/C++-rules maintainer), titled "`layering_check` doesn't work without sandboxing" — reports the **opposite direction**. The filed repro:

```
$ bazel build @abseil-cpp//absl/base:throw_delegate --spawn_strategy=sandboxed
# ... Build completed successfully

$ bazel build @abseil-cpp//absl/base:throw_delegate --spawn_strategy=standalone
ERROR: .../BUILD.bazel:339:11: Compiling absl/base/internal/throw_delegate.cc failed:
undeclared inclusion(s) in rule '...:throw_delegate':
this rule is missing dependency declarations for the following files included by
'absl/base/internal/throw_delegate.cc': ...
```

Sandboxed **succeeded**; unsandboxed **failed** on real, unmodified upstream code — the opposite of "silently stops enforcing." Investigation by maintainer `keith` (comments on the same issue) found the actual mechanism: "when sandboxing is disabled the target's `.d` file ends up with dependencies on more cppmaps than it depends on... It appears clang includes any transitive modulemaps in the dotd file when they are readable." That `.d`-file (dependency file) cross-check is a **separate, legacy Bazel mechanism** — not the `-fmodules-strict-decluse` diagnostic in §2 — that predates `layering_check` and validates a compile's declared inputs against whatever paths Clang's own dependency-file output lists. Its exact error text ("this rule is missing dependency declarations for the following files included by") is also the one quoted, independently, in [bazelbuild/bazel#29152](https://github.com/bazelbuild/bazel/issues/29152) (opened 2026-03-30, proposing to remove that mechanism entirely in favor of `layering_check`, closed 2026-04-10 without action — "not going to push on this for now"). Unsandboxed compilation let Clang's dotd output see transitive `.cppmap` paths that were never part of the action's declared input set, and the legacy checker flagged those paths as undeclared — a bug in a mechanism unrelated to the module-map diagnostic itself.

The fix, [bazelbuild/bazel#21832](https://github.com/bazelbuild/bazel/pull/21832) ("Ignore transitive cppmap files from dotd files"), shipped in **Bazel 7.3.0** (2024-08-12 — the maintainer comment references the 2024-07-29 RC). Its own justification text states the design point precisely: those transitive cppmap references are excluded from dependency tracking "since... with sandboxing enabled they are not part of the input set." Both fleet-relevant majors — **8.7.0 and every 9.x** — postdate this fix; the exact spurious-failure symptom from the 2024 report does not reproduce today.

What survives, and is the actually-durable lesson: `fmeum`'s own words while investigating — "clang doesn't seem to fail if it can't find a module map file referenced by another module map... this behavior was pretty surprising to me." Combined with the staging fact already quoted in the issue body ("Bazel only stages the clang module maps of **direct** dependencies of a target as inputs, not all transitive module maps" — [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592)), the scope of `layering_check`'s guarantee is: **only what is declared as an input gets checked; an unresolvable reference is silently skipped, not escalated.** That is the same direct-only design already documented in §3, restated from the input-staging angle rather than the compiler-diagnostic angle. It means enforcement completeness is a function of the declared BUILD graph, and running the same compile action in an environment where extra, undeclared files happen to be reachable (a shared, non-isolated exec root, a persistent worker, a locally-cached partial build) is not a reliable way to get *either* more or less enforcement than what the graph declares — which is exactly why §6's `aquery`-based verification, tied to the declared graph, is the correct check, not "did the build succeed."

One platform-specific caveat worth flagging rather than asserting as settled: Bazel's own sandboxing documentation distinguishes `processwrapper-sandbox` ("builds a sandbox directory consisting of symlinks... prevents the action from accidentally using any input files that are not declared" via relative-path resolution only) from `linux-sandbox`/`darwin-sandbox` (which additionally use OS namespaces to make "the entire filesystem read-only except for the sandbox directory") — and states plainly that even under sandboxing generally, "processes can freely access all files on the file system" via an absolute path ([Bazel docs, Sandboxing](https://bazel.build/docs/sandboxing)). `processwrapper-sandbox` is the strategy Windows CI legs fall back to, per `bazel-hermeticity-determinism.md`'s own established fleet finding (`sandboxing.md` §"What sandbox strategy to use"; cross-reference [BZL-HERM](../bazel-hermeticity-determinism.md) rather than re-deriving the Windows-CI fact here). Whether that weaker isolation tier changes `layering_check`'s empirical behavior the way `--spawn_strategy=standalone` did in #21592 is not something either primary source tests directly — flagged in [Contested / evolving](#contested--evolving), not asserted here.

### 6. Verifying enforcement, not just the flag

Given §5, "the `.bazelrc` has `--features=layering_check`" is not proof anything is being checked for a specific target — the feature might not reach that target's toolchain (non-Clang, non-Unix/macOS: "The toolchains provided by Bazel only support this feature with clang on Unix and macOS," [Build Encyclopedia](https://bazel.build/versions/8.7.0/reference/be/c-cpp#header-inclusion-checking)), might be set in a `.bazelrc` config CI never selects, or might be overridden by a later negative feature (`-layering_check` "always overrides" positive ones, per the [command-line reference](https://bazel.build/versions/8.7.0/reference/command-line-reference)'s own `--features` text).

```sh
# Does the flag actually reach this target's CppCompile action?
bazel aquery 'mnemonic("CppCompile", //path/to:target)' --output=text \
  | grep -c -- '-fmodules-strict-decluse'
# 0  = not enforcing for this target today (wrong toolchain, feature not
#      resolved here, or the action isn't a CppCompile at all) — a finding
#      if the target is believed to be covered.
# >0 = confirmed: the flag reached the real spawned command line.
```

Rollout breadth is a second, separate question — a target's *own* `features` attribute is visible to `bazel query`, but a `package()`-level default is inherited, not a target attribute, and is invisible to an `attr()` query:

```sh
# Finds only targets with features set directly on the rule, NOT ones
# covered only by package(features = ["layering_check"]).
bazel query 'attr(features, "layering_check", //...)'
# EMPTY does not prove layering_check is unused — grep BUILD/.bazelrc too:
grep -rn 'features\s*=.*layering_check\|--features[= ]layering_check' \
  --include=BUILD* --include=*.bzl --include='.bazelrc*' .
```
Treat the two EMPTY results together, not the query alone, as "not adopted here" — a query-only EMPTY with a non-empty grep is the exact package-level blind spot this section names.

### 7. hdrs_check is dead; stop grepping for it

`cc_library`'s `hdrs_check` attribute reads, verbatim, in both the **8.7.0** and **9.1.0** Build Encyclopedia text (diffed directly, byte-identical on this row): `String; default is ""` **Deprecated, no-op.** ([Build Encyclopedia, cc_library, 8.7.0](https://bazel.build/versions/8.7.0/reference/be/c-cpp#cc_library) / [9.1.0](https://bazel.build/versions/9.1.0/reference/be/c-cpp#cc_library)). It predates `layering_check` and Clang-module-based strict deps entirely, and setting it to any value today changes nothing. A repository's own header-hygiene policy should name `layering_check` (§1-§6) or the legacy dotd-based undeclared-inclusion check (§5) — never `hdrs_check`.

### 8. The include-path trio, disambiguated

| Attribute | What it changes | Scope | Encyclopedia text |
|---|---|---|---|
| `includes` | Adds a compiler search-path flag (`-isystem path_to_package/include_entry` on POSIX) | **Propagates to every rule that depends on this one**, transitively | "these flags are added for this rule and every rule that depends on it. (Note: **not** the rules it depends upon!) Be very careful, since this may have far-reaching effects." ([Build Encyclopedia, cc_library](https://bazel.build/versions/8.7.0/reference/be/c-cpp#cc_library)) |
| `strip_include_prefix` | Relabels where this target's own `hdrs` are addressable *from* (strips a package- or repository-relative prefix) | This target's `hdrs` only — no propagation to dependents | "the headers in the `hdrs` attribute of this rule are accessible at their path with this prefix cut off... only legal under `third_party`" |
| `include_prefix` | Adds a prefix to this target's own `hdrs` paths, applied *after* `strip_include_prefix` removes one | This target's `hdrs` only — no propagation | "the headers... are accessible at [the] value of this attribute prepended to their repository-relative path... only legal under `third_party`" |

The Encyclopedia's own emphasis (bold in source: "**not** the rules it depends upon") is the single fact worth over-communicating: `includes` is the one of the three that reaches *outward*, into every reverse dependency's compile line, silently, for as long as the dependency edge exists. `strip_include_prefix`/`include_prefix` never leave the target that declares them; they only change the *name* other targets use to reach that target's own headers, and any `strip_include_prefix`/`include_prefix` pair change is a `strip`-then-`add` operation in that fixed order.

```bzl
# Wrong: includes leaks -isystem third_party/foo/include to every
# reverse dependency of :foo, forever, invisibly.
cc_library(
    name = "foo",
    includes = ["include"],
    hdrs = ["include/foo/foo.h"],
)

# Right: strip_include_prefix only changes how :foo's own hdrs are
# addressed by whoever already lists :foo in deps — no leakage.
cc_library(
    name = "foo",
    strip_include_prefix = "include",
    hdrs = ["include/foo/foo.h"],
)
```

### 9. implementation_deps: the fourth attribute in the confusion

`implementation_deps` is easy to mistake for a fifth include-path knob; it is a **dependency-visibility** control, not an include-path one. Its Encyclopedia text: "the headers and include paths of these libraries (and all their transitive deps) are only used for compilation of **this** library, and not libraries that depend on it. Libraries specified with `implementation_deps` are still linked in binary targets that depend on this library" ([Build Encyclopedia, cc_library](https://bazel.build/versions/8.7.0/reference/be/c-cpp#cc_library) — identical text at 9.1.0). It is the mechanism for keeping a `.cc`-only, non-re-exported dependency (a compression library used purely inside an implementation file, never named in a public header) off consumers' compile lines — narrower analysis surface for them, and no accidental transitive re-export of a dependency's public headers.

```bzl
cc_library(
    name = "widget",
    srcs = ["widget.cc"],           # uses absl::StrCat internally
    hdrs = ["widget.h"],            # widget.h does not mention absl at all
    implementation_deps = ["@abseil-cpp//absl/strings"],  # compile-only, private
    deps = [":widget_public_api"],  # genuinely re-exported in widget.h
)
```

### 10. The standard sanitizer flag set

`toolchains_llvm`'s own README delegates the actual flag set to `rules_cc`: "`asan`, `ubsan`, and `tsan` are `rules_cc`'s stock sanitizer features" ([toolchains_llvm README](https://github.com/bazel-contrib/toolchains_llvm/blob/master/README.md#sanitizers), v1.9.0, 2026-08-29). Reading that source directly (`rules_cc`, `unix_cc_toolchain_config.bzl`, `_sanitizer_feature` helper, already quoted in the Summary) shows every sanitizer feature always adds `-fno-omit-frame-pointer` and `-fno-sanitize-recover=all` to every compile action, plus its own `-fsanitize=` value at both compile and link:

```python
asan_feature = _sanitizer_feature(name = "asan", specific_compile_flags = ["-fsanitize=address"], specific_link_flags = ["-fsanitize=address"])
tsan_feature = _sanitizer_feature(name = "tsan", specific_compile_flags = ["-fsanitize=thread"],  specific_link_flags = ["-fsanitize=thread"])
ubsan_feature = _sanitizer_feature(name = "ubsan", specific_compile_flags = ["-fsanitize=undefined"], specific_link_flags = ["-fsanitize=undefined"])
```

That toolchain-level feature is necessary but not sufficient for a usable sanitizer build. The community `.bazelrc` convention — cross-checked against [grpc/grpc `tools/bazel.rc`](https://github.com/grpc/grpc/blob/master/tools/bazel.rc) and [google/xls `.bazelrc`](https://github.com/google/xls/blob/main/.bazelrc) — layers on `--strip=never`, an explicit optimization level, and `-g`, none of which the toolchain feature sets:

```
# .bazelrc — the shipped config block
build:asan --strip=never
build:asan --copt=-fsanitize=address
build:asan --copt=-O1
build:asan --copt=-g
build:asan --copt=-fno-omit-frame-pointer   # rules_cc's asan feature already adds this; explicit for clarity/portability to non-Clang toolchains
build:asan --linkopt=-fsanitize=address

build:tsan --strip=never
build:tsan --copt=-fsanitize=thread
build:tsan --copt=-fno-omit-frame-pointer
build:tsan --linkopt=-fsanitize=thread

build:ubsan --strip=never
build:ubsan --copt=-fsanitize=undefined
build:ubsan --copt=-fno-omit-frame-pointer
build:ubsan --linkopt=-fsanitize=undefined
```

`--strip` itself is a stable, version-independent Bazel flag: "Specifies whether to strip binaries and shared libraries (using `-Wl,--strip-debug`). The default value of `sometimes` means strip iff `--compilation_mode=fastbuild`" ([command-line reference, 8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference#flag--strip)) — `never` is required for a sanitizer build because a stripped binary loses the symbol information a sanitizer's stack traces need. `-O1` (versus `-O0`) is the choice `google/xls` documents; grpc's own file uses `-O0` for `asan` specifically — both are real, current, primary-sourced practice, and this is one of the few places the sources genuinely diverge on a number rather than a mechanism (flagged in [Contested / evolving](#contested--evolving)).

### 11. --host_features and why sanitizers don't leak into build tools

The command-line reference is precise about scope: `--features=<string>` "will be enabled or disabled by default for targets built in the **target** configuration," while `--host_features=<string>` is the identical mechanism "for targets built in the **exec** configuration" ([command-line reference, 8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference#flag--features)). `toolchains_llvm`'s README phrases the consequence as an active "reset" ("Bazel resets them to `--host_features` in the exec configuration"), but the primary mechanism is simpler and older: `--features` was never target-and-exec-shared to begin with. A code generator, `protoc`, or any other exec-configuration tool built as part of the same invocation is uninstrumented **by default**, with no separate action required — the failure mode is the opposite: someone adding `--host_features=asan` (or copying a `--features=asan` line into a place that also sets `--host_features`) to "be thorough," which then *does* instrument build tools and is almost never wanted.

### 12. MSan's instrumented libc++ tax

MSan is Linux-only and reports false positives against an uninstrumented standard library — `toolchains_llvm`'s README states plainly: "There is no official prebuilt instrumented libc++; you must build one from the matching LLVM sources and point the distribution at it with the `libcxx_url` and `libcxx_sha256` attributes" ([toolchains_llvm README](https://github.com/bazel-contrib/toolchains_llvm/blob/master/README.md#memorysanitizer-and-the-instrumented-libc)). The build recipe it links to (Google's [MemorySanitizer libc++ how-to](https://github.com/google/sanitizers/wiki/MemorySanitizerLibcxxHowTo)) requires `-DLLVM_USE_SANITIZER=MemoryWithOrigins` against the exact matching LLVM version, plus manually swapping in an *uninstrumented* `libunwind` afterward ("libunwind itself is too low-level to instrument"). This is a standing cost the other three sanitizers do not carry, and it recurs on every LLVM version bump — a repository choosing MSan is choosing to own and rebuild this artifact indefinitely, not a one-time setup task.

### 13. The fuzzing config shape: build settings, not raw copts

`rules_fuzzing`'s own `.bazelrc` shows a materially different shape from §10's raw `--copt=-fsanitize=` lines. Sanitizer and fuzzing-engine selection are each an independent build setting, composed via named `--config` aliases, not baked directly into copts:

```
# rules_fuzzing/.bazelrc (master, fetched 2026-09-05)
build:asan-libfuzzer --//fuzzing:cc_engine=//fuzzing/engines:libfuzzer
build:asan-libfuzzer --@rules_fuzzing//fuzzing:cc_engine_instrumentation=libfuzzer
build:asan-libfuzzer --@rules_fuzzing//fuzzing:cc_engine_sanitizer=asan
```

The three flags are documented independently: `--@rules_fuzzing//fuzzing:cc_engine` names the `cc_fuzzing_engine` target (libFuzzer, Honggfuzz, replay, OSS-Fuzz, or Jazzer for Java); `cc_engine_instrumentation` and `cc_engine_sanitizer` are separately valued so any engine/sanitizer combination the ruleset supports is reachable without a combinatorial explosion of hand-written configs ([rules_fuzzing guide.md](https://github.com/bazelbuild/rules_fuzzing/blob/master/docs/guide.md)). The official announcement frames the whole ruleset's purpose against exactly this gap: "build systems don't traditionally offer any support beyond the core primitives of producing executables, so projects adopting fuzzing often end up reimplementing fuzz test recipes" ([blog.bazel.build, rules_fuzzing announcement](https://blog.bazel.build/2021/02/08/rules-fuzzing.html)). Current release: **v0.8.0** (2026-04-16).

### 14. Bazel 9 autoload: cc_library/cc_binary/cc_test need an explicit load()

The general autoload requirement (`--incompatible_autoload_externally` defaults empty on Bazel 9.0.0, and the native `cc_*`/`java_*`/`proto_library` global symbols are simply gone) is already settled at [BZL-LARK-10](../bazel-starlark-and-build.md) — not re-derived here. The CC-specific instantiation every snippet in this file (and every `cc_*` BUILD file on Bazel 9) needs:

```bzl
# Wrong on Bazel 9 (WORKSPACE-era muscle memory): bare native call, no load().
cc_library(name = "foo", srcs = ["foo.cc"])

# Right, all majors: explicit load from rules_cc's own real file targets
# (cc/BUILD: cc_library.bzl, cc_binary.bzl, cc_test.bzl).
load("@rules_cc//cc:cc_library.bzl", "cc_library")
cc_library(name = "foo", srcs = ["foo.cc"])
```
buildifier's `native-cc-*` warning family auto-fixes this on a Bazel-9 toolchain, per BZL-LARK-10's own text — cited, not restated.

## Decisions

**1. The `layering_check` rollout procedure.**
Decision: per-package (or per-target) opt-in via `features = ["layering_check"]`, gated on two preconditions in order — (a) a direct-include hygiene pass (IWYU or manual) has run on that package, and (b) the toolchain's system module map exists (`tools/cpp/generate_system_module_map.sh` or the hermetic toolchain's equivalent) — never a single `build --features=layering_check` line adopted repo-wide on day one.
Evidence: the Encyclopedia documents only per-invocation/per-package/per-target enablement (§4); LLVM's own Bazel build enables it only for three of its many top-level packages (§4); the direct-includes-only scope (§3) means an un-IWYU'd package fails on noise, not real violations, undermining trust in the gate from the first rollout day.
Assumption named: a repository can afford to roll out package-by-package rather than needing an instant, complete gate — reversible per package by removing the `features` entry, and the two preconditions are re-checkable independently at any later package.

**2. Verifying `layering_check` is actually enforcing, not merely enabled.**
Decision: two checks, both required, neither sufficient alone — `bazel aquery 'mnemonic("CppCompile", //target)' | grep -- '-fmodules-strict-decluse'` (does the flag reach *this* target's real compile command line) and a combined `bazel query 'attr(features, ...)'` + BUILD/.bazelrc grep (does the declared rollout match what actually got enabled, catching the package-level-default blind spot the `attr()` query alone misses).
Evidence: `--features` on a `.bazelrc` line CI never selects, a toolchain that silently doesn't support the feature (non-Clang or non-Unix/macOS, per the Encyclopedia's own scope statement), and negative-feature override all produce "flag present in some file, absent from the real compile" (§6); §5's corrected finding independently establishes that build *success* is not evidence of enforcement either way.
Assumption named: an `aquery` check is run against the exact target and configuration the gate is meant to cover, not a proxy target — reversible in the sense that the check is re-run on every configuration a CI matrix adds, never assumed to generalize from one leg.

**3. The shipped sanitizer config block.**
Decision: ship the `asan`/`tsan`/`ubsan` trio as named `.bazelrc` configs (§10's block), each pairing `-fsanitize=X` with `-fno-omit-frame-pointer`, `--strip=never`, `-g`, and the matching `linkopt`; document MSan (§12) as a CONSIDER requiring a self-maintained instrumented libc++ rather than shipping it as an equal fourth default; point any actual fuzz target at `rules_fuzzing`'s build-setting trio (§13) instead of hand-rolled copts.
Evidence: `rules_cc`'s own sanitizer feature already bakes in `-fno-omit-frame-pointer`/`-fno-sanitize-recover=all` (§10, direct source read); the community `.bazelrc` convention (grpc, google/xls) adds exactly the four items the toolchain feature does not (§10); `toolchains_llvm`'s README states there is no official MSan-instrumented libc++, full stop (§12); `rules_fuzzing`'s own `.bazelrc` never expresses a sanitizer as a raw copt, only as a build setting (§13).
Assumption named: `-O1` (google/xls) over `-O0` (grpc) as the shipped default optimization level, because it more closely matches typical release-adjacent debugging needs and readable-stack-trace guidance in the wider sanitizer literature — named explicitly because the primary sources genuinely disagree on this one number (§10, [Contested / evolving](#contested--evolving)); reversible by a single `-O0`/`-O1` edit in the shipped block with no other consequence.

## Normative guidance candidates

1. **Enable `layering_check` per-package or per-target, gated on an IWYU pass and a working system module map for that package — never as a single repo-wide `.bazelrc` flip.**
   Rationale: the direct-includes-only scope (§3) turns un-IWYU'd transitive includes into rollout noise, and missing stdlib module maps fail every system-header include on the first build (§4).
   Verify: `grep -rn 'features\s*=.*layering_check' --include=BUILD* --include=*.bzl .` cross-checked against a per-package IWYU-run log or commit; a package with the feature but no recorded IWYU pass is a finding. EMPTY grep = not yet adopted anywhere (not itself a finding).
   Severity: SHOULD. Bazel 7/8/9; `rules_cc` `main`/0.2.22. Settles: M-L-06, M-L-07.

2. **Never treat a build's success or failure as evidence that `layering_check` is (or isn't) enforcing for a given target; confirm with `bazel aquery`.**
   Rationale: [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592) is a primary-sourced case of a real, correct target failing unsandboxed and succeeding sandboxed for reasons unrelated to any real layering violation (§5) — build outcome and enforcement correctness are not the same signal.
   Verify: `bazel aquery 'mnemonic("CppCompile", //target)' --output=text | grep -c -- '-fmodules-strict-decluse'`. `0` = not enforcing for this target (finding, if the target is believed covered); `>0` = confirmed on the real command line.
   Severity: MUST (for any target a rule set claims is layering-checked). Bazel 7/8/9. Settles: M-L-06.

3. **Pin a Bazel floor of ≥7.3.0 wherever `layering_check` and any non-sandboxed spawn strategy (`--spawn_strategy=standalone`/`local`, `--strategy=CppCompile=local`) might coexist.**
   Rationale: the pre-7.3.0 dotd-leakage bug (§5) produced spurious build failures specifically in that combination; both fleet-relevant majors already clear this floor, but a rule authored without naming the floor reads as current-forever when it is a dated fact.
   Verify: `.bazelversion` / CI matrix ≥ 7.3.0 everywhere `layering_check` is enabled, cross-checked against any `--spawn_strategy=standalone`/`local` line in `.bazelrc*` or CI workflow files.
   Severity: MUST (documentation-of-fact; low cost since both fleet majors already clear it). Bazel <7.3.0 (violated) vs ≥7.3.0 (clear). Settles: M-L-06.

4. **Never spell layering-check rollout coverage as `bazel query 'attr(features, "layering_check", //...)'` alone; pair it with a grep over `BUILD*`/`.bzl`/`.bazelrc*` for `package(features = [...])` lines.**
   Rationale: `attr()` reads a target's own rule-attribute value; a `package()`-level default is inherited, not a target attribute, and never appears in that query's results — an EMPTY `attr()` result is not proof the feature is unused.
   Verify: run both; treat "both EMPTY" as "not adopted here" and "query EMPTY, grep non-empty" as the specific blind spot this rule exists to catch.
   Severity: SHOULD. Bazel 7/8/9; any `cc_*` rule surface. Settles: M-L-06.

5. **Run Include-What-You-Use (or an equivalent direct-include audit) on a package before or during its `layering_check` rollout, not after.**
   Rationale: `-fmodules-strict-decluse` only ever checks a directly written `#include`; a symbol obtained only transitively through an already-permitted header is invisible to it either way (§3) — rolling out the gate first just produces noisy, uncorrelated failures that erode trust in the check.
   Verify (reading heuristic): does the rollout PR/commit for a package also touch its own `#include` lists, or only add `features = ["layering_check"]`? The latter alone is a finding worth a second look, not an automatic block.
   Severity: SHOULD. Bazel 7/8/9; toolchain-agnostic. Settles: M-L-07.

6. **Never set or check `hdrs_check` on a `cc_library`/`cc_binary` target as a substitute for `layering_check`.**
   Rationale: the attribute is documented, unchanged across 8.7.0 and 9.1.0, as "Deprecated, no-op" — any value written there has zero build effect (§7).
   Verify: `grep -rn 'hdrs_check' --include=BUILD* --include=*.bzl .` — non-empty is a finding (dead code smell / cargo-culted attribute) regardless of the value set. EMPTY = pass.
   Severity: SHOULD (cleanup; not a correctness risk since it's inert either way). Bazel 8/9 (unchanged text at both). Settles: M-L-06 (peripherally, as a common misreading of the same enforcement surface).

7. **Treat `includes` as a load-bearing, transitively-propagating API decision, never a convenience shortcut for one target's own compile line.**
   Rationale: the Encyclopedia's own emphasis — "these flags are added for this rule and **every rule that depends on it**" — means an `includes` entry silently changes every reverse dependency's search path for as long as the dependency edge exists (§8).
   Verify (reading heuristic): for every `includes = [...]` in a `cc_library`/`cc_binary`, confirm the intent is genuinely "every consumer should see this path," not "just let this one target's own `#include`s resolve" (which `strip_include_prefix` achieves without leakage). `grep -rn 'includes\s*=' --include=BUILD* .` to enumerate candidates for the read.
   Severity: SHOULD. Bazel 7/8/9. Settles: M-L-09.

8. **Use `strip_include_prefix`/`include_prefix` to relabel a target's own `hdrs` addressing, and `includes` only when the search path is genuinely meant to leak to dependents — never interchange the two for convenience.**
   Rationale: they solve different problems at different scopes (own-headers relabeling vs. transitive search-path injection); picking the wrong one either leaks a path nobody meant to expose or fails to expose a path a vendored third-party library needs (§8).
   Verify: none of the three is a drop-in substitute for another — the reading heuristic is the table in §8: does the change need to reach reverse dependencies (`includes`) or stay local to this target's own headers (`strip_include_prefix`/`include_prefix`)?
   Severity: SHOULD. Bazel 7/8/9. Settles: M-L-09.

9. **Use `implementation_deps` for any dependency used only inside a library's `.cc` files and never named in its public `hdrs`.**
   Rationale: without it, a private dependency's headers and include paths are visible on every consumer's compile line — a false public surface, and unnecessary rebuild/recompile fan-out when the private dependency changes.
   Verify: for a dependency in `deps`, check whether any file in `hdrs` `#include`s it (or names a type from it in a public signature). If not, it is a candidate for `implementation_deps`. No fully mechanical check exists (a reading heuristic, not a grep); a partial signal is `grep -l '#include' hdrs...` cross-referenced against each `deps` entry's own public headers.
   Severity: CONSIDER (reading heuristic only, no re-runnable check on generated content). Bazel 7/8/9. Settles: M-L-10.

10. **Ship the sanitizer `.bazelrc` block as named configs, each pairing the sanitizer's own `-fsanitize=` flag with `-fno-omit-frame-pointer`, an explicit optimization level, `-g`, `--strip=never`, and the matching `linkopt`.**
    Rationale: `rules_cc`'s toolchain feature bakes in `-fno-omit-frame-pointer`/`-fno-sanitize-recover=all` and the sanitize flag itself, but sets neither `--strip` nor an optimization level — a sanitizer build without `--strip=never` produces backtraces with no symbols, defeating the point (§10).
    Verify: `grep -n '^build:asan\|^build:tsan\|^build:ubsan' .bazelrc*` and confirm each config block includes `--strip=never` and a `linkopt=-fsanitize=` line matching its `copt`. Missing either on any sanitizer config = finding.
    Severity: MUST (for any repo shipping a sanitizer config at all). Bazel 7/8/9; `rules_cc` 0.2.22, `toolchains_llvm` 1.9.0. Settles: M-L-11.

11. **Never set `--host_features=<sanitizer>` alongside `--features=<sanitizer>` unless build tools are deliberately meant to run instrumented.**
    Rationale: `--features` only applies "for targets built in the target configuration" by design (command-line reference, §11) — build tools stay uninstrumented by default with no separate action needed; adding `--host_features` for symmetry actively defeats that default.
    Verify: `grep -n 'host_features' .bazelrc*` — any hit pairing a sanitizer name with `--host_features` is a finding unless a comment explains a deliberate instrumented-build-tool need. EMPTY = pass (default behavior in effect).
    Severity: SHOULD. Bazel 7/8/9. Settles: M-L-11.

12. **Document MSan as a CONSIDER, not a peer default alongside ASan/TSan/UBSan, and name the instrumented-libc++ build as its own maintained artifact before enabling it.**
    Rationale: there is no official prebuilt instrumented libc++ (toolchains_llvm README, §12) — a repository enabling MSan is committing to rebuilding that artifact on every relevant LLVM version bump indefinitely, a materially different cost than the other three sanitizers.
    Verify (reading heuristic): does the repository's toolchain setup reference a `libcxx_url`/`libcxx_sha256` pointing at a locally-built, versioned artifact (not a placeholder or a stale URL)? Absence with MSan enabled = finding.
    Severity: CONSIDER. Bazel 7/8/9; `toolchains_llvm` 1.9.0 (Linux only). Settles: M-L-12.

13. **Build actual fuzz targets on `rules_fuzzing`'s `cc_engine`/`cc_engine_instrumentation`/`cc_engine_sanitizer` build-setting trio, not hand-rolled `--copt=-fsanitize=` lines.**
    Rationale: the build-setting shape composes engine and sanitizer choice independently and is the ruleset's own documented interface (§13); a hand-rolled copt duplicates that machinery without its engine-selection or reproduction-mode support (`asan-replay`, `msan-libfuzzer-repro`).
    Verify: `grep -rn 'cc_fuzz_test\|fuzz_test(' --include=BUILD* .` then confirm the corresponding `.bazelrc` configs reference `@rules_fuzzing//fuzzing:cc_engine*`, not raw `-fsanitize=` copts, for that target's fuzzing configs.
    Severity: SHOULD (for repos with any fuzz targets; N/A otherwise). Bazel 7/8/9; `rules_fuzzing` 0.8.0. Settles: M-L-11 (peripherally, as the fuzzing instance of the same sanitizer-config family).

14. **On Bazel 9, load `cc_library`/`cc_binary`/`cc_test` explicitly from `@rules_cc//cc:*.bzl`; never rely on the bare native global.**
    Rationale: `--incompatible_autoload_externally` defaults empty from Bazel 9.0.0 — the native symbols are gone, not merely deprecated ([BZL-LARK-10](../bazel-starlark-and-build.md)).
    Verify: buildifier under a Bazel-9 toolchain auto-fixes the `native-cc-*` family (BZL-LARK-10's own verification); EMPTY buildifier output = pass on Bazel 9.
    Severity: MUST on Bazel 9; SHOULD on 8 (forward-compat). Bazel 8 (SHOULD)/9 (MUST); `rules_cc` current. Settles: none new (restates [BZL-LARK-10](../bazel-starlark-and-build.md) for this family's own snippets). Depends on: BZL-LARK-10.

15. **Record any host-specific `CC=`/`layering_check`-disabling override as a latent trap the moment it appears, even with zero `cc_*` targets in the repository.**
    Rationale: disabling `layering_check` as part of a "no working C compiler" workaround silently also disables the one mechanism that would catch strict-deps drift the moment any `cc_*` target is later added — already established generally at [BZL-HERM-08](../bazel-hermeticity-determinism.md); this rule connects it specifically to the layering-check surface this file owns.
    Verify: `grep -n 'layering_check' .bazelrc*` for a negative form (`-layering_check` or `features = ["-layering_check"]`) paired with `grep -rn 'cc_binary(\|cc_library(\|cc_toolchain(' --include='*.bzl' --include='BUILD*' .`. First non-empty + second EMPTY = CONSIDER, tracked as latent (matches BZL-HERM-08's own severity ladder); both non-empty = escalate to MUST.
    Severity: CONSIDER → MUST (mirrors [BZL-HERM-08](../bazel-hermeticity-determinism.md)). All majors; shape A, F. Settles: M-L-06. Depends on: BZL-HERM-08.

16. **Never quote a `strip_include_prefix`/`include_prefix` restriction to "third_party" as toolchain-enforced; it is a documented convention, not a checked constraint.**
    Rationale: the Encyclopedia states the restriction in prose ("This attribute is only legal under `third_party`") without naming an enforcing mechanism, and this file did not locate or verify an actual Bazel-side check for it — asserting enforcement where none was verified would violate the house evidence standard.
    Verify (reading heuristic): treat any claim that Bazel itself rejects the attribute outside `third_party` as unverified until a specific error message or source check is cited; if a repository wants the restriction enforced, it needs its own presubmit/buildifier-adjacent check, not reliance on Bazel core.
    Severity: CONSIDER (documentation-accuracy rule, not a build-behavior rule). Bazel 7/8/9. Settles: M-L-09.

## Fleet evidence

`rules_ocx` — the fleet's only Bazel repository — compiles **zero** `cc_binary`/`cc_library`/`cc_toolchain` targets anywhere (`grep -rn "cc_binary\|cc_library\|cc_toolchain"` over every `.bzl`/`BUILD.bazel` returns no output — [build-contracts-and-ci-posture.md:37](../bazel-audit/build-contracts-and-ci-posture.md)). Every rule in this file's [Normative guidance candidates](#normative-guidance-candidates) is currently vacuously satisfied there, not actively exercised — this file's own scope line already states it ships with no fleet consumer.

The one directly relevant fact already established at [BZL-HERM-08](../bazel-hermeticity-determinism.md): `.bazelrc.user` sets a `CC=` override to a zig wrapper under one developer's home directory and disables `layering_check` for both build and host — the exact negative-feature pattern rule 15 above checks for. `build-contracts-and-ci-posture.md`'s own audit is explicit about why this is inert rather than dangerous today: "The comment at `.bazelrc.user:1` ('no g++ on this box, use zig as C compiler') is the whole rationale; there is no comment addressing what disabling `layering_check` protects against, since there is no C++ compilation to protect" ([build-contracts-and-ci-posture.md:220](../bazel-audit/build-contracts-and-ci-posture.md)). Per map conflict 6 and the addendum governing this whole group: this is a missing-`g++` workaround, not an endorsement of any hermetic toolchain choice, and it governs zero targets — the toolchain-choice question itself is out of this file's scope ([bazel-cpp/hermetic-cc-toolchain-choice](hermetic-cc-toolchain-choice.md)).

No other §1-§14 finding (module-map generation, the include-path trio, `implementation_deps`, sanitizer configuration, or `rules_fuzzing`) has any fleet instance to check against — `starlark-code-shape.md`'s own contradiction log states the frame's per-language-guide hypothesis "gets no support or refutation from this codebase... `rules_ocx` contains zero `cc_*`... rule usage anywhere" ([starlark-code-shape.md, Contradictions of the frame](../bazel-audit/starlark-code-shape.md)). `Cargo.toml`/`pyproject.toml`/`package.json` hygiene inside a future Bazel-adopting repo remains out of this family's scope, covered by `rust-cargo`, `python-packaging`, and `typescript-packaging` respectively (per the frame's own constraint).

## AI-agent angle

1. **Writing a bare `cc_library(...)`/`cc_binary(...)`/`cc_test(...)` with no `load()`, from WORKSPACE-era muscle memory.** Compiles fine on Bazel 7/8 (native global still resolves), silently breaks on Bazel 9 with `--incompatible_autoload_externally` defaulting empty (§14). *Check*: `load("@rules_cc//cc:cc_library.bzl", "cc_library")` present in the same file as any `cc_library(` call; buildifier under a Bazel-9 toolchain auto-fixes the miss.
2. **Setting `hdrs_check` expecting it to enable strict-deps checking.** The name reads like a knob that turns header-inclusion checking on; it is a no-op that has done nothing since before `layering_check` existed (§7). *Check*: `grep -rn 'hdrs_check'` — any hit is worth a second look regardless of the value assigned.
3. **Reaching for `includes` to fix one target's own `#include` resolution.** It looks like the natural "add an include path" attribute; it actually mutates every reverse dependency's compile line, forever (§8). *Check*: for a new `includes = [...]`, ask whether the intent was "just let this target's headers resolve" (wrong attribute — use `strip_include_prefix`) or "every consumer needs this path" (right attribute, but confirm that's really wanted).
4. **Citing `--incompatible_strict_action_env`/`BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` in a `--define=` form.** Already the top AI-agent failure mode named in [BZL-HERM's own list](../bazel-hermeticity-determinism.md) — restated here because a model asked specifically about C++ toolchain autodetection is exactly the context most likely to hallucinate this spelling; the only correct form is `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`.
5. **Inventing sanitizer flags instead of using the toolchain's own feature.** A model asked for "an ASan build" may write out `-fsanitize=address -fno-omit-frame-pointer` by hand as `copts`, duplicating what `--features=asan` already provides and risking a mismatched, partial flag set (missing `--strip=never`, missing the `linkopt`, or missing `-fno-sanitize-recover=all`). *Check*: prefer `--features=asan` (or the shipped `.bazelrc` block, §10) over hand-written `copts`/`linkopts` for a standard sanitizer build; hand-written flags are a signal to re-derive from source, not to trust as-is.
6. **Treating `layering_check` present in `.bazelrc` as proof a codebase is strict-deps-clean.** The single most on-topic mistake for this file: a model summarizing a repository's hygiene from `grep -n layering_check .bazelrc` alone, without the §6 `aquery` check, can report a gate that never reaches the target in question (wrong toolchain, wrong OS, an override elsewhere). *Check*: run the `bazel aquery ... | grep -c -- '-fmodules-strict-decluse'` command from §6 before asserting enforcement for any specific target.
7. **Using `rules_fuzzing`'s sanitizer names (`cc_engine_sanitizer=asan`) interchangeably with `toolchains_llvm`'s (`--features=asan`).** They are two different build-setting namespaces (`@rules_fuzzing//fuzzing:cc_engine_sanitizer` vs. Bazel's own `--features`) that happen to share the string `asan`; a model porting a `.bazelrc` line between a fuzz target and a regular sanitizer build can copy the wrong flag form. *Check*: confirm which namespace a target's build actually reads — `bazel_dep` on `rules_fuzzing` plus a `cc_fuzz_test` rule means the `@rules_fuzzing//fuzzing:*` settings; a plain `cc_test` means `--features=`/`--host_features=`.
8. **Assuming `strip_include_prefix`'s "only legal under `third_party`" text is a Bazel-enforced restriction and reporting a violation with no verified mechanism behind it.** This file explicitly did not locate a verified enforcement point for that restriction (rule 16); a model should say "documented convention" rather than "Bazel error" unless it has actually reproduced a rejection.

## Contested / evolving

- **Optimization level for a sanitizer `.bazelrc` block.** grpc's own `tools/bazel.rc` uses `-O0` for `asan`/`msan`/`tsan`/`ubsan`; `google/xls`'s own `.bazelrc` uses `-O1 -g` for `asan`. Both are current, primary-sourced, and from repositories that clearly ship real sanitizer CI. This file's Decision 3 names `-O1` as the shipped default (closer to typical release-adjacent debugging and the general sanitizer literature's stack-trace-readability guidance) but records the disagreement rather than hiding it — a repository with different priorities (fastest possible sanitizer iteration over trace readability) has primary-sourced grounds to pick `-O0` instead.
- **Whether the legacy dotd-based undeclared-inclusion check (§5) should be removed outright in favor of `layering_check` alone.** [bazelbuild/bazel#29152](https://github.com/bazelbuild/bazel/issues/29152) proposed exactly this in 2026-03, citing that the legacy check "validates non-hermetic behavior" while being cached (making failures hard to recover from) and offering "no way to disable this." Closed 2026-04-10 without action ("not going to push on this for now"). As of 2026-09-05 both mechanisms remain live and can still interact the way §5 describes for any repository that has not yet upgraded past 7.3.0 or that hits an as-yet-undiscovered variant of the same class of bug. Trending toward eventual removal of the legacy check, per the maintainer's own framing, but unscheduled.
- **Whether `processwrapper-sandbox`'s weaker isolation (relative-path symlinks only, no OS-namespace filesystem restriction — [Bazel docs, Sandboxing](https://bazel.build/docs/sandboxing)) reproduces any variant of the §5 class of behavior on the Windows CI legs `layering_check` would run on.** Neither primary source examined here (the #21592 issue thread, which reproduces on Linux with `--spawn_strategy=standalone`, or the sandboxing doc, which describes strategy tiers but does not test `layering_check` specifically against them) settles this. Recorded as an open question rather than asserted either way; the general Windows-sandbox-tier fact is already established fleet-independently by [BZL-HERM](../bazel-hermeticity-determinism.md), not re-derived here.
- **`layering_check`'s interaction with C++ named modules.** `toolchains_llvm`'s README states that, absent its `cpp_modules` feature, the toolchain "continues to disable C++ named modules to preserve the existing Clang module-map behavior used by `layering_check`" — a real, current interaction between this file's topic and the sibling toolchain-choice dive's M-L-08. Owned and chased there (`bazel-cpp/hermetic-cc-toolchain-choice`), cited here only to flag that it exists.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Build Encyclopedia — C/C++ Rules, 8.7.0](https://bazel.build/versions/8.7.0/reference/be/c-cpp) | Versioned reference doc (primary) | 8.7.0, fetched 2026-09-05 | Exact attribute text for `hdrs`, `srcs`, `deps`, `includes`, `strip_include_prefix`, `include_prefix`, `implementation_deps`, `hdrs_check`, and the "Header inclusion checking" section's direct-only scope statement. |
| [Build Encyclopedia — C/C++ Rules, 9.1.0](https://bazel.build/versions/9.1.0/reference/be/c-cpp) | Versioned reference doc (primary) | 9.1.0, fetched 2026-09-05 | Diffed byte-for-byte against 8.7.0 on every attribute this file cites — confirms zero drift across the two fleet-relevant majors. |
| [Bazel command-line reference, 8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference) | Versioned reference doc (primary) | 8.7.0, fetched 2026-09-05 | Exact `--features`/`--host_features`/`--strip` flag text and defaults, used to correct the "reset" framing in §11. |
| [Bazel docs — Sandboxing](https://bazel.build/docs/sandboxing) | Live doc (primary) | fetched 2026-09-05 | The `processwrapper-sandbox`/`linux-sandbox`/`darwin-sandbox` strategy distinctions used in §5's caveat and Contested §3. |
| [rules_cc — `unix_cc_toolchain_config.bzl`](https://github.com/bazelbuild/rules_cc/blob/main/cc/private/toolchain/unix_cc_toolchain_config.bzl) | Tagged/main ruleset source (primary) | `main`, fetched 2026-09-05; ruleset 0.2.22 (2026-07-07) | The actual `layering_check`/`use_module_maps` feature definitions and the `_sanitizer_feature` helper — the exact flags in §2 and §10, not a paraphrase. |
| [rules_cc — `cc/BUILD`](https://github.com/bazelbuild/rules_cc/blob/main/cc/BUILD) | Ruleset source (primary) | `main`, fetched 2026-09-05 | Confirms `cc_library.bzl`/`cc_binary.bzl`/`cc_test.bzl` as real file targets for the Bazel-9 `load()` snippets in §14. |
| [bazelbuild/bazel#11440](https://github.com/bazelbuild/bazel/pull/11440) | GitHub PR, project's own issue tracker (primary) | opened 2020-05-19 | The PR that first added `layering_check` support for Clang on Linux — dates the feature's origin. |
| [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592) | GitHub issue, project's own issue tracker (primary) | filed 2024-03-06, closed 2024-07-29 | The exact bug the map's M-L-06 traces to — read in full (body + all 10 comments) to correct the "silent false negative" framing with the maintainers' own investigation (§5). |
| [bazelbuild/bazel#21832](https://github.com/bazelbuild/bazel/pull/21832) | GitHub PR, project's own issue tracker (primary) | merged into 7.3.0, released 2024-08-12 | The fix and its own justification text ("since... with sandboxing enabled they are not part of the input set") — the primary source for §5's "durable lesson." |
| [bazelbuild/bazel#29152](https://github.com/bazelbuild/bazel/issues/29152) | GitHub issue, project's own issue tracker (primary) | opened 2026-03-30, closed 2026-04-10 | Confirms the legacy dotd-based checker is a separate, still-live mechanism from `layering_check`, and that removing it is proposed but unscheduled (Contested §2). |
| [toolchains_llvm README](https://github.com/bazel-contrib/toolchains_llvm/blob/master/README.md) | Ruleset's own top-level doc (primary) | `master`, v1.9.0 (2026-08-29), fetched 2026-09-05 | The sanitizer section (§10-§12), the `--host_features` framing, and the Linux-only scoping of `layering_check` support in this specific toolchain. |
| [rules_fuzzing `.bazelrc`](https://github.com/bazelbuild/rules_fuzzing/blob/master/.bazelrc) | Ruleset's own shipped config (primary) | `master`, v0.8.0 (2026-04-16), fetched 2026-09-05 | The real `cc_engine`/`cc_engine_instrumentation`/`cc_engine_sanitizer` build-setting composition — the fuzzing config shape quoted in §13, not a paraphrase. |
| [rules_fuzzing `docs/guide.md`](https://github.com/bazelbuild/rules_fuzzing/blob/master/docs/guide.md) | Ruleset's own doc | `master`, fetched 2026-09-05 | Documents each of the three build settings' valid values and intent. |
| [blog.bazel.build — Fuzzing rules for Bazel](https://blog.bazel.build/2021/02/08/rules-fuzzing.html) | Official Bazel project blog | 2021-02-08 | The brief's named source for the fuzzing config shape's motivation; the "projects... reimplementing fuzz test recipes" framing quoted in §13. |
| [Maskray — "Layering check with Clang"](https://maskray.me/blog/2022-09-25-layering-check-with-clang) | Practitioner blog by a Clang/LLVM contributor, with a real reproducible `bazel build` trace | 2022-09-25, updated 2023-07 | The most precise available account of the `.cppmap` generation mapping (§1) and the exact compiler flags on a real command line (§2) — not primary by the house standard's own definition, but directly reproducible and independently corroborated by the `rules_cc` source read. |
| [grpc/grpc `tools/bazel.rc`](https://github.com/grpc/grpc/blob/master/tools/bazel.rc) | Real-world exemplar `.bazelrc` | `master`, fetched 2026-09-05 | One of two cross-checked, currently-maintained sanitizer `.bazelrc` blocks used to establish the community convention in §10 (codified, not argued). |
| [google/xls `.bazelrc`](https://github.com/google/xls/blob/main/.bazelrc) | Real-world exemplar `.bazelrc` | `main`, fetched 2026-09-05 | The second cross-check for §10; also points at `google/fuzztest`'s own `setup_configs.sh` generator as a related, actively-maintained pattern. |

