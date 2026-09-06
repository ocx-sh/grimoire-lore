---
title: Choosing a hermetic C++ toolchain under Bazel
topic: hermetic-cc-toolchain-choice
group: bazel-cpp
family: BZL-CC
agent: research-lang wave-3b worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 12
primary_sources_count: 11
settles: [M-L-01, M-L-02, M-L-03, M-L-04, M-L-05, M-L-08]
builds_on: [BZL-HERM-07, BZL-HERM-08, BZL-HERM-24, BZL-HERM-25]
scope: |
  Covers: why rules_cc ships no hermetic C++ toolchain, the four symptoms of
  the autodetected default it leaves in its place, and a constraint-keyed
  decision tree across the three community alternatives (toolchains_llvm,
  hermetic_cc_toolchain/zig, and rules_cc's own modular rule-based-toolchain
  API) — each project's real cost, not a recommendation of one as default.
  Does NOT cover: `layering_check` mechanics, the include-path trio, or the
  shipped sanitizer flag block (`bazel-cpp/layering-check-includes-and-sanitizers`);
  `rules_foreign_cc`, C++20 modules' native-Bazel status, or IDE/`compile_commands.json`
  tooling (`bazel-cpp/foreign-builds-modules-and-cpp-tooling`); the general
  determinism/sandbox taxonomy, owned by `bazel-hermeticity-determinism`
  (cited by ID, not restated). **This file ships with no fleet consumer**:
  `rules_ocx` — the fleet's only Bazel repository — compiles zero `cc_*`
  targets, so every claim here is grounded on upstream sources and the
  practitioner corpus, verified against tagged releases and source, never
  against a fleet build.
---

# Choosing a hermetic C++ toolchain under Bazel

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [rules_cc ships no hermetic toolchain, by its own README](#1-rules_cc-ships-no-hermetic-toolchain-by-its-own-readme)
   2. [The four symptoms, and the trace to rules_cc's modular toolchain API](#2-the-four-symptoms-and-the-trace-to-rules_ccs-modular-toolchain-api)
   3. [toolchains_llvm: sanitizers, cross-compilation, and the Yocto override](#3-toolchains_llvm-sanitizers-cross-compilation-and-the-yocto-override)
   4. [toolchains_llvm: C++ named modules and the layering_check interaction — the surprise](#4-toolchains_llvm-c-named-modules-and-the-layering_check-interaction--the-surprise)
   5. [hermetic_cc_toolchain: UBSAN-by-default and the SIGILL trap](#5-hermetic_cc_toolchain-ubsan-by-default-and-the-sigill-trap)
   6. [hermetic_cc_toolchain: known issues that will not be fixed](#6-hermetic_cc_toolchain-known-issues-that-will-not-be-fixed)
   7. [Correcting a miscitation: the "tested with rules_go/rules_rust/rules_foreign_cc" claim](#7-correcting-a-miscitation-the-tested-with-rules_gorules_rustrules_foreign_cc-claim)
   8. [The modular rules_cc API: a real third option, not a fallback](#8-the-modular-rules_cc-api-a-real-third-option-not-a-fallback)
   9. [The stated intent to remove the default toolchain concept — still just stated](#9-the-stated-intent-to-remove-the-default-toolchain-concept--still-just-stated)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **`rules_cc`'s own README states it outright**: "rules_cc itself does not yet offer a hermetic toolchain distribution," and names four third-party projects without endorsing one — there is no default answer to ship ([rules_cc README](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md)).
- The one documented off-switch for the autodetected default is `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` — already settled at [BZL-HERM-07](../bazel-hermeticity-determinism.md); do not re-derive it, cite it.
- Pigweed's account names four concrete symptoms of the autodetected default: not hermetic, prefers gcc/binutils over clang/llvm, CI-versus-local divergence, and every flag settable only through the command line or `.bazelrc` — no structured API (§2).
- The fix traces a real lineage: `pw_cc_toolchain` (2023) → Brough's `modular_cc_toolchains` proposal → Montanez's SEED 0113 → Stark's upstreaming into `rules_cc` **0.0.10** (2024-09-13). Current `rules_cc` is **0.2.22** (2026-07-07) — the API has had roughly two years and ~30 releases to mature (§2).
- **No single winner exists, and the choice is constraint-keyed, not preference-keyed**: needs C++20 named modules or the newest sanitizer/MSan story → `toolchains_llvm`; needs trivial bring-your-own-sysroot cross-compilation and can absorb UBSAN-on-by-default → `hermetic_cc_toolchain`; needs a toolchain shaped to exactly one platform with no community dependency → `rules_cc`'s own modular `cc_toolchain()` API (§8, Decisions).
- `toolchains_llvm`'s C++ named-modules support is real but narrow: "currently tested" only at **Bazel 9.2 + LLVM 22** on Linux/macOS, and the README states plainly "Bazel 7 and 8 do not expose the required `cc_library` module API" ([toolchains_llvm README](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md)).
- **The surprise, chased and confirmed verbatim**: without the `cpp_modules` feature turned on, the toolchain "continues to disable C++ named modules to preserve the existing Clang module-map behavior used by `layering_check`" — the newest capability is off by default specifically to protect the oldest strict-deps feature, and the README does not state what happens to `layering_check` once `cpp_modules` is turned on (§4).
- `hermetic_cc_toolchain` (zig cc) differs from mainstream clang/gcc by enabling UndefinedBehaviorSanitizer **by default** — a program that compiles clean under regular clang/gcc can crash with `SIGILL: illegal instruction` purely from the toolchain switch, and the zig maintainer confirms this is intentional debug-mode inference, not a bug (§5).
- The zig cache lives outside Bazel's output base (`$HOME/.cache/zig` on Unix, `%LocalAppData%\zig` on Windows) — `bazel clean --expunge` never touches it — and OSX sysroot support is explicitly "not implemented," with darwin/arm64 cgo programs named as the concrete casualty (§6).
- **Correction to the map's own inherited claim**: `hermetic_cc_toolchain`'s current README states no "tested with rules_go/rules_rust/rules_foreign_cc" compatibility list at all — that sentence belongs to `toolchains_llvm`'s own README. A prior wave-1 scout in this program made exactly this cross-project miscitation (§7).
- `rules_cc`'s modular toolchain API (`@rules_cc//cc/toolchains:toolchain.bzl`) is a real, working, single-platform path with a maintained example (`examples/rule_based_toolchain`) — not a fallback of last resort, but the right answer when neither community project's tradeoffs are acceptable and the target is exactly one platform (§8).
- Google's own BazelCon 2024 statement of intent to remove the default-C++-toolchain concept entirely is **two years old and not executed** as of 2026-09-05: the current `rules_cc` README (fetched fresh) still documents the autodetected default and its off-switch as live, current behavior (§9).
- **The fleet's own zig arrangement is not an instance of `hermetic_cc_toolchain` at all.** `rules_ocx`'s `MODULE.bazel` carries no `bazel_dep` on either community project (verified directly, zero matches); `.bazelrc.user` sets a bare `--repo_env=CC=<path>` pointing the *autodetected* toolchain's probe at a local zig wrapper binary, and separately turns `layering_check` off. It is the least-hermetic of every option surveyed here, not a worked example of any of them (Fleet evidence).
- Escaping zig cc's default UBSAN crash means passing an optimization flag (`-O2`/`-O3`/`-Os`, or Bazel's own `-c opt`) — zig cc infers "debug mode" (with its safety checks) only in the absence of one, per the zig maintainer's own explanation on the upstream issue (§5).
- Cross-compilation with `toolchains_llvm` is tested for exactly four host→target pairs — `{linux,x86_64}→{linux,aarch64}`, `{linux,aarch64}→{linux,x86_64}`, `{darwin,x86_64}→{linux,x86_64}`, `{darwin,x86_64}→{linux,aarch64}` — for "some hello-world binaries," not a general guarantee (§3).
- A Yocto-built sysroot needs an explicit `cxx_include_layout = "yocto"` plus a matching `multiarch` override with `toolchains_llvm`; the default assumes Debian's `/usr/include/c++/<ver>` layout and will silently resolve the wrong libstdc++ headers otherwise (§3).

## Findings

### 1. rules_cc ships no hermetic toolchain, by its own README

Fetched verbatim from `main` (2026-09-05):

> "Configuring a hermetic toolchain makes your build more deterministic. rules_cc itself does not yet offer a hermetic toolchain distribution. Other community owned and maintained projects offer hermetic C/C++ toolchains: GCC (Linux only): f0rmiga/gcc-toolchain · Hermetic LLVM: hermeticbuild/hermetic-llvm · LLVM: bazel-contrib/toolchains_llvm · zig cc: uber/hermetic_cc_toolchain"

— [rules_cc/README.md:63-73](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md). This is not a gap the ruleset is closing incrementally; it is a stated, standing position — the README lists four names and endorses none. The same section states the off-switch immediately above it:

```
--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1
```

— already the subject of [BZL-HERM-07](../bazel-hermeticity-determinism.md) (SHOULD, for a repo with zero `cc_*` targets and no plan to add any) and [BZL-HERM-24](../bazel-hermeticity-determinism.md) (MUST for a repo with real `cc_*` targets, to treat the default as host-installed and non-hermetic until an explicit toolchain resolves ahead of it — see [BZL-HERM-25](../bazel-hermeticity-determinism.md)). This file does not re-derive either; it starts where they stop — **which** hermetic toolchain, once the decision to register one is made.

### 2. The four symptoms, and the trace to rules_cc's modular toolchain API

Pigweed's own account of building `pw_cc_toolchain` names four concrete problems with Bazel's autodetected default (quoted verbatim):

1. Builds "used binutils/gcc rather than our preferred llvm/clang toolchain."
2. "CI builds and local builds were inconsistent; just because builds passed locally didn't mean the same build would pass in automated builds."
3. "All flags had to be passed in via the command line or pushed into a `.bazelrc` file" — no structured, typed API.
4. "There was no clear path for scalably supporting embedded MCU device builds."

— [pigweed.dev/blog/06-better-cpp-toolchains](https://pigweed.dev/blog/06-better-cpp-toolchains.html), published 2024-12-11. The lineage from there to today's shipped API:

| Step | Who | What |
|---|---|---|
| Early | Nathaniel Brough | `rules_cc_toolchain` (limited configurability) |
| Mid-2023 | Armando Montanez | Simplified `pw_cc_toolchain` |
| — | Nathaniel Brough | `modular_cc_toolchains` proposal (more flexible building blocks) |
| — | Armando Montanez | SEED 0113, "Add modular Bazel C/C++ toolchain API" — approved, implemented |
| 2024-09-13 | Matt Stark | Upstreamed into `rules_cc` **0.0.10**, with added type safety |

`rules_cc` 0.0.10's own GitHub release notes do not narrate the toolchain-API landing in prose (the diff against 0.0.9 is a single dependency bump) — the API's arrival is dated by the Pigweed account, not by the release body, and independently corroborated by the fact that `cc/toolchains/` (the module's public surface today) already existed in that era ([rules_cc 0.0.10 release](https://github.com/bazelbuild/rules_cc/releases/tag/0.0.10)). Current `rules_cc` is **0.2.22**, released 2026-07-07 ([rules_cc releases](https://github.com/bazelbuild/rules_cc/releases)) — roughly two years and ~30 point releases after the API's introduction, still actively receiving changes (0.2.22 alone touched default-toolchain macOS flags and ThinLTO argument handling).

### 3. toolchains_llvm: sanitizers, cross-compilation, and the Yocto override

Current release **v1.9.0**, published 2026-08-29 ([toolchains_llvm releases](https://github.com/bazel-contrib/toolchains_llvm/releases)). Verified directly from the README (`master`, 2026-09-05):

**Sanitizers as Bazel features**, one at a time:

```sh
bazel build //... --features=asan
bazel build //... --features=ubsan
bazel build //... --features=tsan
bazel build //... --features=msan   # Linux only
```

"Enabling sanitizers as features means Bazel resets them to `--host_features` in the exec configuration, so build tools stay uninstrumented." MSan additionally needs a separately-built instrumented libc++ — "There is no official prebuilt instrumented libc++; you must build one from the matching LLVM sources," pointed at via `libcxx_url`/`libcxx_sha256` on the `llvm`/`llvm_toolchain` rule or the `llvm.toolchain` module-extension tag ([toolchains_llvm README:532-593](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md)). The full sanitizer flag block (`-fno-omit-frame-pointer`, `-O1`, `--strip=never`, the matching `linkopt`) belongs to `bazel-cpp/layering-check-includes-and-sanitizers`, cited here only for its role in the decision tree.

**Cross-compilation is bring-your-own-sysroot**, tested for exactly four pairs "to work for some hello-world binaries" — not a general guarantee:

- `{linux, x86_64} → {linux, aarch64}`
- `{linux, aarch64} → {linux, x86_64}`
- `{darwin, x86_64} → {linux, x86_64}`
- `{darwin, x86_64} → {linux, aarch64}`

```sh
bazel build \
  --platforms=@toolchains_llvm//platforms:linux-x86_64 \
  --extra_toolchains=@llvm_toolchain_with_sysroot//:cc-toolchain-x86_64-linux \
  //...
```

**The layout override that is easy to miss**: cross-compiling links against the sysroot's own libstdc++ (a single-platform build links libc++ bundled with LLVM instead). Three attributes, keyed by target platform, control this; the layout one is the trap:

- `cxx_include_layout`: `"debian"` (the **default**) expects `/usr/include/<multiarch>/c++/<ver>`; `"yocto"` expects `/usr/include/c++/<ver>/<multiarch>`.
- `multiarch`: overrides the multiarch tuple, "useful when the sysroot uses a non-standard tuple, e.g. Yocto's `aarch64-oe4t-linux`."

Leaving `cxx_include_layout` at its Debian default against a Yocto sysroot does not error — it silently resolves headers from the wrong path shape ([toolchains_llvm README:372-387](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md)).

### 4. toolchains_llvm: C++ named modules and the layering_check interaction — the surprise

The README's own words, current on `master` as of 2026-09-05:

> "The currently tested configuration is Bazel 9.2 with LLVM 22 on Linux and macOS. The selected LLVM distribution must contain `bin/clang-scan-deps`... Bazel 7 and 8 do not expose the required `cc_library` module API. Windows is not currently tested."

Usage requires three things together: `cc_library(module_interfaces = [...])`, `--experimental_cpp_modules`, and `--features=cpp_modules`, plus `--cxxopt=-std=c++20`:

```sh
bazel build //:app \
  --experimental_cpp_modules \
  --features=cpp_modules \
  --cxxopt=-std=c++20
```

`--experimental_cpp_modules` is defined with `defaultValue = "false"` and tagged `OptionMetadataTag.EXPERIMENTAL` in `CppOptions.java` — confirmed present (same definition) at the **8.7.0**, **9.0.0**, and **9.2.0** tags alike ([CppOptions.java, 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java)). So the bare flag and the `module_interfaces` attribute plumbing (`cc_helper.get_cpp_module_interfaces`) already exist in Bazel's own Starlark builtins at 8.7.0 — the toolchain-level API `toolchains_llvm` says it needs is narrower than either of those, and this file does not isolate which internal surface is actually missing on 8/9.0/9.1. Treat the ruleset's own stated floor as authoritative for its own behavior; do not re-derive a different floor from a grep of Bazel's rule source.

**The chased surprise, quoted exactly**:

> "It also embeds module inputs so compilation databases and tools such as clang-tidy retain the source information they need. Without the `cpp_modules` feature, the toolchain continues to disable C++ named modules to preserve the existing Clang module-map behavior used by `layering_check`."

— [toolchains_llvm README:517-522](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md). Read precisely: the toolchain's **default** posture is to keep C++ named modules switched off, specifically so `layering_check`'s Clang module-map mechanism (`.cppmap` generation, `-fmodules-strict-decluse`) keeps working unmodified. The newest capability is gated behind an opt-in feature flag for exactly this reason. What the README does **not** state is the converse: what happens to `layering_check` enforcement once `cpp_modules` **is** turned on. No source in this survey answers that; it is an open question, not a resolved one (see Contested/evolving).

### 5. hermetic_cc_toolchain: UBSAN-by-default and the SIGILL trap

Current release **v4.3.0**, published 2026-07-27 ([hermetic_cc_toolchain releases](https://github.com/uber/hermetic_cc_toolchain/releases)). The README's own words:

> "`zig cc` differs from 'mainstream' compilers by enabling UBSAN by default. Which means your program may compile successfully and crash with: `SIGILL: illegal instruction`. This flag encourages program authors to fix the undefined behavior."

— [hermetic_cc_toolchain README:469-480](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md). The root cause, confirmed at the primary source zig cites for this behavior:

> "`zig cc` is intentionally an interface to the zig compiler, a bit higher level than using clang directly. With no optimization flags specified, `zig cc` infers debug mode... This applies for C code as well, taking advantage of clang's UBSAN. The fact that debug mode is 'default' is entirely intentional... Note that the presence of `-O2`, `-O3` will cause zig to select release-fast, `-Os` will cause zig to select release-small, and optimization flags plus `-fsanitize=undefined` will cause zig to select release-safe."

— [ziglang/zig#4830](https://github.com/ziglang/zig/issues/4830), comment from the Zig project maintainer. Practical consequence for a Bazel build: an unoptimized (`-c dbg`, the Bazel default for `bazel build` with no `-c` flag) `cc_binary` compiled under a registered zig-cc toolchain gets UBSAN whether anyone asked for it or not; passing an optimization flag (`-c opt`, or an explicit `--copt=-O2`) is what escapes debug-mode inference — this is a side effect of optimization level, not an independently documented toggle.

### 6. hermetic_cc_toolchain: known issues that will not be fixed

Verbatim from the README's own "Known Issues" section, which the maintainers preface as things "we are unlikely to implement... any time soon":

- **Zig cache location**: "Zig cache is stored outside Bazel's output base (at `$HOME/.cache/zig` on Unix or `%LocalAppData%\zig` on Windows), so `bazel clean --expunge` will not clear it. Each user gets their own cache directory automatically via `$HOME`." An override exists (`--repo_env=HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX=/path`, paired with `--sandbox_add_mount_pair`), but it is opt-in, not the default.
- **OSX sysroot**: "Support for OSX sysroot is currently not implemented, but patches implementing it will be accepted... In essence, OSX target support is not well tested with `hermetic_cc_toolchain`." Named casualty: "all darwin/arm64 cgo programs" specifically.
- **Bazel 6 or earlier** needs `--incompatible_enable_cc_toolchain_resolution` added manually — not relevant to this fleet's 8.7.0/9.x/rolling floor, listed for completeness.

— [hermetic_cc_toolchain README:482-513](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md).

### 7. Correcting a miscitation: the "tested with rules_go/rules_rust/rules_foreign_cc" claim

This program's own wave-1 scout (`bazel-topic-map/language-rulesets-canonical.md`, §24) states: "Compatibility is stated as tested against `rules_go`, `rules_rust`, and `rules_foreign_cc` specifically" — attributed to `hermetic_cc_toolchain`. The brief for this dive repeats the same attribution.

**Fetching `hermetic_cc_toolchain`'s current README directly (2026-09-05) finds no such sentence anywhere in it.** No "Compatibility" section exists; the closest content is a footnote naming Uber's own Go monorepo as a production user, and a "Host Environments" list of platforms the project's own CI runs on (`linux_amd64`, `linux_arm64`, `darwin_amd64`, `darwin_arm64`, `windows_amd64`, tests running on `linux-amd64`) — [hermetic_cc_toolchain README:514-523](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md).

**The sentence is real — it is `toolchains_llvm`'s.** Its README carries, verbatim: "### Compatibility \n\n The toolchain is tested to work with `rules_go`, `rules_rust`, and `rules_foreign_cc`." ([toolchains_llvm README:441-443](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md)). Both projects solve the same problem (a hermetic C/C++ toolchain) and both READMEs cover sandboxing, sysroots and sanitizers in a similar order — an easy cross-file mixup for a skim-reader, human or model. This file corrects the attribution; the compatibility claim belongs only to `toolchains_llvm`, and no equivalent claim exists for `hermetic_cc_toolchain`.

### 8. The modular rules_cc API: a real third option, not a fallback

`rules_cc` ships a maintained, working example of building a rule-based toolchain entirely with its own public API — no third-party dependency at all:

```starlark
# examples/rule_based_toolchain/toolchains/clang/BUILD.bazel
load("@rules_cc//cc/toolchains:make_variable.bzl", "cc_make_variable")
load("@rules_cc//cc/toolchains:toolchain.bzl", "cc_toolchain")

cc_toolchain(
    name = "host_clang",
    args = select({
        "@platforms//os:linux": ["//toolchains/clang/args:linux_sysroot"],
        ...
    }),
    ...
)
```

— [rules_cc examples/rule_based_toolchain](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/examples/rule_based_toolchain/toolchains/clang/BUILD.bazel); the example "showcases a fully working rule-based toolchain for Linux" and doubles as an integration test, switchable between clang and gcc via `--config=gcc` ([examples/rule_based_toolchain/README.md](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/examples/rule_based_toolchain/README.md)). This is the third branch of the decision tree: when neither community project's cost profile is acceptable — no UBSAN-by-default tolerance, no need for `toolchains_llvm`'s cross-platform or named-modules machinery, and the target is exactly one platform — building directly on `@rules_cc//cc/toolchains` means every toolchain flag is typed, versioned with `rules_cc` itself, and carries no independent release cadence or known-issues list to track. The cost is the one `rules_cc` itself does not pay for you: you write and maintain the toolchain definition.

### 9. The stated intent to remove the default toolchain concept — still just stated

At BazelCon 2024, Google stated an intent that reads as a roadmap commitment:

> "Google said that there is a desire to remove the concept of a default C++ toolchain in favor of explicitly defining a hermetic toolchain like almost all other rules do. This was met with cheering from the audience."

— Julio Merino's BazelCon 2024 recap, published 2024-10-22 ([blogsystem5.substack.com/p/bazelcon-2024-recap](https://blogsystem5.substack.com/p/bazelcon-2024-recap)). **Fetching `rules_cc`'s current README (`main`, 2026-09-05) directly shows the autodetected default and its `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` off-switch both still fully documented, live, and unqualified by any deprecation notice** (§1). Nearly two years after the stated intent, it has not been executed. This is dated guidance about a direction, not a fact about current behavior — a C++ guide should treat "always register an explicit toolchain" as the durable, future-safe default recommendation regardless of whether the autodetect mechanism is ever actually removed, while being precise that removal has not happened as of this era.

## Decisions

**1. The decision tree, keyed on constraint, not preference.**
Decision: no single default hermetic C++ toolchain — a rule must present three branches and let the constraint pick:
- **Needs C++20 named modules, or the newest sanitizer/MSan story, and can float a Bazel 9.2+/LLVM 22 floor** → `toolchains_llvm`.
- **Needs cheap, bring-nothing cross-compilation across many target/host pairs and can absorb UBSAN-on-by-default as a debug-mode side effect** → `hermetic_cc_toolchain` (zig cc).
- **Needs a toolchain shaped to exactly one platform, with no community-project release cadence to track, and can afford to author it** → `rules_cc`'s own modular `cc_toolchain()` API.

Evidence: `rules_cc`'s own README names all three (plus GCC-only `f0rmiga/gcc-toolchain`, out of scope here as GCC-only and far less active) and endorses none (§1); each project's own README documents the exact cost that makes it the wrong default for the other two use cases (§3-§6, §8). Assumption named: a repository picks along the axis that is actually load-bearing for it (modules/sanitizers, cross-compilation breadth, or platform count) rather than defaulting to whichever project it happened to read about first — reversible per-repo, since nothing here is a Bazel-core commitment.

**2. Whether the fleet's zig arrangement is an endorsement.**
Decision: **No, explicitly.** `rules_ocx`'s `.bazelrc.user` sets `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` and disables `layering_check` — a workaround for a missing host `g++`, read through the *autodetected* toolchain's probe, not a registered `hermetic_cc_toolchain` module. Verified directly: `rules_ocx/MODULE.bazel` carries zero `bazel_dep` on either `hermetic_cc_toolchain` or `toolchains_llvm`. Evidence: `.bazelrc.user:1` states the rationale in its own comment ("no g++ on this box, use zig as C compiler"); the repo compiles zero `cc_*` targets (`ci` Headline; corroborated independently here). Assumption named: none — this is a direct grep-verified fact, not an inference.

**3. Whether the shipped guidance pre-empts the stated removal of the default-toolchain concept.**
Decision: **Yes, as a forward-looking default, not as a statement of current fact.** Recommend explicit hermetic-toolchain registration unconditionally, framed as "the direction Bazel itself is moving," while stating precisely that the autodetected default and its off-switch remain live, current mechanisms as of 2026-09-05 (§9). Evidence: the BazelCon 2024 statement is dated and unexecuted nearly two years later; a rule that claimed the default toolchain concept is *already* gone would be wrong on its face against the current `rules_cc` README. Assumption named: Google's stated direction eventually ships in some form — reversible by simply not citing a removal date if evidence changes.

## Normative guidance candidates

1. **Never assume a Bazel repository has a hermetic C++ toolchain because it "uses Bazel."** Treat `rules_cc`'s autodetected default as the live, standing state until an explicit toolchain module is registered ahead of it.
   Rationale: `rules_cc`'s own README states outright it ships no hermetic distribution (§1); this is the family-owning claim [BZL-HERM-24](../bazel-hermeticity-determinism.md) already makes at MUST — restated here only as the entry point into the choice this file resolves.
   Verify: `grep -n 'toolchains_llvm\|hermetic_cc_toolchain\|cc_toolchain(' MODULE.bazel` in any repo with real `cc_*` targets. Empty output = finding (no hermetic registration).
   Severity: MUST (repos with real `cc_*` targets only). Bazel 8/9. rules_cc `main` 2026-09 (0.2.22). Settles: M-L-01. Depends on: BZL-HERM-24.

2. **Pick the hermetic C++ toolchain from the constraint, using the three-branch tree, and write down which branch was taken.** Never adopt one because it was the first result, the most-starred, or the one a training corpus happens to favor.
   Rationale: no upstream source endorses a default; picking without stating the constraint that decided it makes the choice unreviewable later (Decisions §1).
   Verify (reading heuristic): does the repo's toolchain-adoption doc or PR description name which of the three constraints (named modules/sanitizers, cross-compile breadth, single-platform) drove the pick? No named constraint = finding.
   Severity: SHOULD. Bazel 8/9; toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0, rules_cc 0.2.22. Settles: M-L-02.

3. **Never present a bare `CC=`/`--repo_env=CC=<path>` override as a hermetic toolchain, or as an example of adopting `hermetic_cc_toolchain`.** It only redirects the *autodetected* toolchain's compiler probe; it registers no toolchain, resolves nothing ahead of the default, and carries none of a real toolchain's cross-compilation, sysroot, or sanitizer-feature machinery.
   Rationale: this is exactly the fleet's own arrangement, and conflating it with real adoption is the single most likely misreading of this repo by an agent (Decisions §2).
   Verify: `grep -n 'repo_env=CC=' .bazelrc*` with no matching `bazel_dep(name = "hermetic_cc_toolchain"` / `bazel_dep(name = "toolchains_llvm"` in `MODULE.bazel` → the override is a probe redirect, not a toolchain; document it as such. Empty on the first grep = not applicable.
   Severity: MUST (documentation-of-fact). All majors; shapes A, F. Settles: M-L-02.

4. **Before choosing `toolchains_llvm` for C++ named modules, confirm the floor is Bazel 9.2.0+ with an LLVM 22+ distribution that ships `bin/clang-scan-deps`** — do not infer support from Bazel's own `module_interfaces` attribute existing on earlier majors.
   Rationale: the toolchain's own README states Bazel 7 and 8 "do not expose the required `cc_library` module API," and this file independently confirmed the bare `--experimental_cpp_modules` flag and `module_interfaces` plumbing already exist in Bazel's Starlark builtins at 8.7.0 — evidence that the missing piece is toolchain-internal, not the flag or attribute itself (§4).
   Verify: read `toolchains_llvm`'s README "C++ named modules" section for its current stated floor before writing or accepting any guidance that claims an earlier major works; do not substitute a grep of Bazel's own `cc_library.bzl` for the ruleset's own compatibility statement.
   Severity: MUST. Bazel 9.2+ (toolchains_llvm's stated floor); Bazel 7/8 explicitly unsupported per the ruleset. toolchains_llvm 1.9.0. Settles: M-L-02, M-L-08.

5. **Treat `toolchains_llvm`'s default behavior (named modules off) as protecting `layering_check`, and re-test `layering_check` explicitly before shipping any repo that turns on `--features=cpp_modules`.** The README does not state what happens to `layering_check` enforcement once named modules are enabled — this is an open interaction, not a documented-safe one.
   Rationale: this is the chased surprise (§4) — the newest capability is gated off by default specifically because it can interact with the oldest strict-deps feature, and the interaction's far side (`cpp_modules` ON) has no documented answer.
   Verify: `grep -n 'features.*cpp_modules\|cpp_modules.*features' .bazelrc* BUILD.bazel **/BUILD.bazel` — any hit means `layering_check`'s own enforcement must be independently re-verified on that build (a per-target compile with an undeclared-header violation should still fail), not assumed to still work because it worked before `cpp_modules` was turned on. Empty output = not in use, not applicable.
   Severity: MUST wherever `cpp_modules` is enabled. Bazel 9.2+; toolchains_llvm 1.9.0. Settles: M-L-08.

6. **Never claim `hermetic_cc_toolchain` is "tested with `rules_go`/`rules_rust`/`rules_foreign_cc`."** That compatibility statement is `toolchains_llvm`'s; `hermetic_cc_toolchain`'s current README carries no equivalent list.
   Rationale: this exact cross-project miscitation already happened once inside this research program (§7) — a concrete, demonstrated failure mode, not a hypothetical one.
   Verify: before citing any "tested/compatible with X" claim about either project, re-read the exact README paragraph in the project actually being cited; do not carry a compatibility sentence across to its sibling from memory.
   Severity: SHOULD (prose-accuracy; does not change build behavior). N/A version-specific. Settles: none (this file's own correction; not an M-ID).

7. **Escape zig cc's UBSAN-on-by-default via an optimization flag (`-c opt`, or an explicit `--copt=-O2`/`-O3`/`-Os`), never by trying to disable UBSAN as an independent switch** — none is documented.
   Rationale: the zig maintainer's own account states debug-mode (and its UBSAN checks) is inferred purely from the absence of an optimization flag; this is intentional design, not a bug with a dedicated opt-out (§5).
   Verify (reading heuristic): does a repo registering a zig-cc toolchain build any target at the Bazel default compilation mode (`-c dbg`, i.e. no explicit `-c` and no `--compilation_mode` in `.bazelrc`)? If so, and `SIGILL` crashes are reported, check the target's optimization level before assuming a real bug.
   Severity: MUST wherever `hermetic_cc_toolchain` is registered. hermetic_cc_toolchain 4.3.0; all Bazel majors. Settles: M-L-03.

8. **Document the zig cache's location as outside Bazel's build graph in any onboarding or cleanup runbook for a `hermetic_cc_toolchain` repo**, and provide the `HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX` override explicitly if a clean-room rebuild is ever required.
   Rationale: `bazel clean --expunge` does not touch `$HOME/.cache/zig` (or `%LocalAppData%\zig`); a "clean build" that still resolves stale zig-cached artifacts is a documented, permanent gap the maintainers do not plan to close (§6).
   Verify: `grep -rn 'HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX' .bazelrc* docs/ README*` — empty output in a repo using `hermetic_cc_toolchain` = the cache-location caveat is undocumented locally; not a build failure, a knowledge gap.
   Severity: SHOULD. hermetic_cc_toolchain 4.3.0; all majors. Settles: M-L-02 (tail).

9. **Do not assume `hermetic_cc_toolchain` OSX/darwin cross-compilation "just works," especially for cgo programs targeting darwin/arm64.** The README states OSX sysroot support is "currently not implemented" and "not well tested."
   Rationale: silent under-testing on a specific target platform is worse than a documented unsupported platform — a repo that assumes parity across host/target pairs will discover the gap at build time, not at adoption time (§6).
   Verify: `grep -rn 'darwin.*arm64\|osx.*sysroot' MODULE.bazel .bazelrc*` in a repo targeting OSX via `hermetic_cc_toolchain`, paired with a manual test build for that exact target. Empty on the grep = the repo has not documented awareness of the gap.
   Severity: SHOULD. hermetic_cc_toolchain 4.3.0. Settles: M-L-02.

10. **When cross-compiling with `toolchains_llvm` against a sysroot, verify the host→target pair is one of the four explicitly tested combinations, or budget explicit validation** rather than assuming general cross-platform support.
    Rationale: the README's own words are "tested to work for some hello-world binaries" for exactly `{linux,x86_64}→{linux,aarch64}`, `{linux,aarch64}→{linux,x86_64}`, `{darwin,x86_64}→{linux,x86_64}`, `{darwin,x86_64}→{linux,aarch64}` — not a general cross-compilation guarantee (§3).
    Verify: read the `--platforms=`/`--extra_toolchains=` pair a repo's cross-compile build uses; confirm it matches one of the four tested pairs, or flag the combination as unverified upstream.
    Severity: SHOULD. toolchains_llvm 1.9.0. Settles: M-L-02.

11. **Set `cxx_include_layout = "yocto"` and a matching `multiarch` override explicitly whenever a `toolchains_llvm` sysroot is Yocto-built** — never leave the default.
    Rationale: the default (`"debian"`) expects a different header path shape (`/usr/include/<multiarch>/c++/<ver>` vs. Yocto's `/usr/include/c++/<ver>/<multiarch>`) and resolves silently to the wrong libstdc++ headers with no error against a mismatched sysroot (§3).
    Verify: `grep -n 'cxx_include_layout\|multiarch' MODULE.bazel` for any `sysroot`-carrying `llvm_toolchain`/`llvm.toolchain` definition. A Yocto-sourced sysroot (check its own build provenance) with no `cxx_include_layout = "yocto"` set = finding.
    Severity: MUST wherever a Yocto sysroot is in use. toolchains_llvm 1.9.0. Settles: M-L-02.

12. **Treat the choice of hermetic C++ toolchain as a decision to record, not just a `bazel_dep` to add** — name the constraint that drove it next to the registration, in a comment or adjacent doc.
    Rationale: absence of a stated rationale is itself a finding once a second maintainer (or an agent) has to re-derive why one of three incompatible, differently-costed projects was picked (Decisions §1).
    Verify (reading heuristic): does a comment or commit message adjacent to the `bazel_dep`/`register_toolchains` call name which of the three branches (modules/sanitizers, cross-compile breadth, single-platform) applied? No such statement anywhere = finding.
    Severity: CONSIDER (prose-quality, mirrors [BZL-HERM-29](../bazel-hermeticity-determinism.md)'s style). All majors; shape F. Settles: M-L-02.

13. **Do not cite Google's BazelCon 2024 statement of intent to remove the default C++ toolchain concept as a fact about current Bazel behavior.** State it as a direction, dated, alongside confirmation that the autodetected default and its off-switch remain live.
    Rationale: nearly two years after the statement, `rules_cc`'s current README documents the autodetected default and `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` as fully live, unqualified mechanisms — a guide that claims removal already happened is simply wrong (§9).
    Verify: any generated guidance claiming "Bazel no longer has a default C++ toolchain" or similar must be checked against a fresh fetch of `rules_cc/README.md`'s "Toolchains" section before shipping.
    Severity: MUST (claim-accuracy). rules_cc `main` 2026-09 (0.2.22). Settles: M-L-05.

14. **Recommend explicit hermetic-toolchain registration as the durable default posture regardless of whether Bazel ever executes on removing the autodetected default** — the forward-looking recommendation does not depend on the roadmap item shipping.
    Rationale: the direction is stated by the rules' own maintainers and cheering-audience reaction; adopting it early costs nothing extra beyond what BZL-HERM-24/25 already require, and avoids a future migration scramble if/when the default is actually removed (§9, Decisions §3).
    Verify: same as candidate 1 — this is the same check, restated as "why," not a new mechanical test.
    Severity: SHOULD. All majors. Settles: M-L-05. Depends on: BZL-HERM-24, BZL-HERM-25.

15. **Never wrap `rules_foreign_cc`, CMake, or a shell script around the "bring your own sysroot" step `toolchains_llvm` asks for.** The README names exactly two supported approaches — `docker export` for a filesystem archive, or the Chromium project's own sysroot build scripts — not an arbitrary foreign build.
    Rationale: an agent reaching for a familiar tool (CMake, a foreign build system) to "produce a sysroot" adds an entire second non-hermetic build system to solve a problem the toolchain's own docs answer in two sentences.
    Verify: `grep -rn 'sysroot' MODULE.bazel BUILD.bazel` paired with a read of how the sysroot archive was produced — a `genrule` shelling into `cmake`/`make` to build a sysroot is a finding; an `http_archive`/`filegroup` pointing at a `docker export` or Chromium-script output is the documented path.
    Severity: SHOULD. toolchains_llvm 1.9.0. Settles: M-L-02.

## Fleet evidence

`rules_ocx` — the fleet's only Bazel repository — is the only fleet evidence this family has, and it is entirely negative: **zero `cc_binary`/`cc_library`/`cc_toolchain` targets anywhere in the repo** (frame `ci` Headline; independently corroborated by `starlark-code-shape.md`). Every claim below follows from that absence.

- **The "zig arrangement" is not `hermetic_cc_toolchain`.** Verified directly against the live repo: `grep -n 'hermetic_cc_toolchain\|toolchains_llvm\|zig' /home/mherwig/dev/rules_ocx/MODULE.bazel` returns zero matches. `.bazelrc.user` (gitignored, developer-machine only, never read by CI per `build-contracts-and-ci-posture.md:198-206`) carries exactly:
  - line 1: a comment — "host-specific: no g++ on this box, use zig as C compiler"
  - line 2: `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc`
  - line 3: `build --features=-layering_check --host_features=-layering_check`

  This redirects the **autodetected** toolchain's compiler probe to a local wrapper binary — it registers no `cc_toolchain`, resolves nothing ahead of the default, and provides none of either community project's cross-compilation, sysroot, or sanitizer machinery. It is the least-hermetic point on this file's entire decision tree, not an instance of any branch of it. This corrects any reading of the frame/map's shorthand ("the fleet's own zig arrangement") as adoption evidence for `hermetic_cc_toolchain` specifically.
- **Nothing in this family currently binds for `rules_ocx`.** [BZL-HERM-24](../bazel-hermeticity-determinism.md) (register a hermetic toolchain ahead of the default) and [BZL-HERM-25](../bazel-hermeticity-determinism.md) (confirm it actually resolves) apply only to repos with real `cc_*`/`py_*` targets; `rules_ocx` has none, so this file's decision tree — which of the three hermetic toolchains — is moot for the repo itself today. It binds for shape F: `rules_ocx`'s own users, the future adopting monorepos this artifact set ships to.
- **The cheaper, correct fix available today is [BZL-HERM-07](../bazel-hermeticity-determinism.md), not a toolchain choice.** Since the repo has zero `cc_*` targets and no plan to add any, the SHOULD-severity fix is one committed `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` line — it removes the autodetection probe (and with it, the entire reason `.bazelrc.user`'s `CC=`/`layering_check` pair exists) without requiring a decision from this file's tree at all. That decision was already made in the wave-2 consolidation; this file does not re-open it.
- **Sibling-set boundary.** Nothing in this family touches `Cargo.toml`/`pyproject.toml`/`package.json` hygiene — covered by `rust-cargo`, `python-packaging`, `typescript-packaging` respectively, per the frame's constraint. Not applicable here since the fleet has no C++ package-manifest equivalent to begin with (no `conanfile.txt`/`vcpkg.json` anywhere in the fleet, unmeasured but consistent with zero `cc_*` targets).

## AI-agent angle

1. **Spelling the off-switch wrong.** `--define=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` or a `load()` of that symbol does not exist — already named as failure mode #6 in [BZL-HERM's AI-agent list](../bazel-hermeticity-determinism.md); cited here because it is this file's own topic's most common error. *Check*: the correct form is only `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` (or the variable set in the process environment before Bazel starts).
2. **Copying `hermetic_cc_toolchain`'s own README `bazel_dep` snippet verbatim.** The current README's own `MODULE.bazel` usage example reads `bazel_dep(name = "hermetic_cc_toolchain", version = "3.1.0")` — two majors behind the actual current release, **4.3.0**. An agent trusting the doc snippet ships a stale pin on day one. *Check*: `gh api repos/uber/hermetic_cc_toolchain/releases --jq '.[0].tag_name'` (or the BCR listing) before trusting any version string quoted inside a README's code fence — a README's own example can be stale even in its own repository.
3. **Cross-attributing the "tested with `rules_go`/`rules_rust`/`rules_foreign_cc`" claim.** This file's §7 documents a real instance: a prior scout in this exact research program made this miscitation. *Check*: re-read the specific project's own README paragraph before repeating a compatibility claim about it; two READMEs covering the same problem space (sandboxing, sysroots, sanitizers) in similar order invite exactly this mixup.
4. **Concluding named-modules support from a grep of Bazel's own rule source rather than the toolchain's README.** `module_interfaces` and `--experimental_cpp_modules` exist in Bazel's Starlark builtins as far back as 8.7.0 (verified here); that is not the same claim as "`toolchains_llvm` supports named modules on Bazel 8." *Check*: the ruleset's own README states its tested floor explicitly (9.2 + LLVM 22) — treat that as authoritative over an inference from Bazel-core source.
5. **Reaching for the `WORKSPACE` snippet first because it appears earlier in the README.** `hermetic_cc_toolchain`'s current README still shows the `WORKSPACE` `http_archive` pattern before the `MODULE.bazel` one; on a Bazel-9 target this is dead machinery ([BZL-HERM-28](../bazel-hermeticity-determinism.md): WORKSPACE support code deleted at 9.0.0, not merely disabled). *Check*: grep the README for its `### MODULE.bazel` heading and use that section regardless of which appears first in reading order.
6. **Adding `cc_binary`/`cc_library`/`cc_toolchain` targets on a Bazel 9 target without an explicit `rules_cc` `load()`.** Bazel 9.0's `--incompatible_autoload_externally` defaults empty, so every previously-built-in `cc_*` rule needs its own `load()` — a fact this file's own primary-source fetch of the [Bazel 9.0 release post](https://blog.bazel.build/2026/01/20/bazel-9.html) confirms directly ("all rulesets have to be explicitly loaded from external modules"). This is `BZL-LARK`'s territory ([BZL-LARK-10](../bazel-starlark-and-build.md), the `autoload-coverage` gap it names for `py_*`/`sh_*` applies to `cc_*` identically); cited here because it surfaces the moment any C++ toolchain adoption work touches a BUILD file at all.

## Contested / evolving

- **No consensus toolchain exists, and the corpus shows momentum, not agreement.** `toolchains_llvm` shipped C++ named-modules support in a recent release cycle (README section is new relative to the sanitizer/cross-compile content around it) and continues receiving floor-raising work (v1.9.0, 2026-08-29). `hermetic_cc_toolchain` has no open issue or roadmap item tracking an equivalent feature (checked directly: zero open issues mentioning "modules" as of 2026-09-05). Trend, as of this era: `toolchains_llvm` is where the newest Bazel/C++ feature work lands first; `hermetic_cc_toolchain`'s value proposition (cross-compilation breadth, small footprint, zig's speed) is stable rather than growing.
- **The `layering_check`-versus-named-modules interaction's far side is undocumented, not merely unresolved.** §4's surprise establishes only the default-off behavior and its stated reason; no source in this survey — including `toolchains_llvm`'s own README — states what enabling `cpp_modules` does to `layering_check` enforcement. This is a genuine gap in the primary source, not a disagreement between sources; flagged here for the next research round rather than guessed at.
- **Google's stated intent to remove the default C++ toolchain concept (BazelCon 2024) remains unexecuted two years later.** The direction has broad community support (audience reaction, per the recap) but no tracked issue or shipped flag found in this survey moves it forward. Trend: guidance should keep treating explicit registration as "the future," not claim the autodetected default is gone.
- **`rules_cc`'s modular toolchain API is still actively changing shape.** Two years and ~30 releases past its 0.0.10 introduction, 0.2.22 (2026-07-07) alone touched default-toolchain macOS flags and added ThinLTO argument support — this is API surface still being extended, not a frozen 1.0. A guide built on it should re-verify attribute names against the current release rather than a cached example.
- **The UBSAN-by-default behavior of zig cc is not evolving and is not expected to.** It is a deliberate, stated design choice by the Zig project itself (§5), independent of `hermetic_cc_toolchain`'s own release cadence — do not expect a future `hermetic_cc_toolchain` release to add an independent opt-out; the only lever is the optimization-level side effect already documented.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazelbuild/rules_cc README.md](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md) | Ruleset's own top-level doc (primary) | `main`, fetched 2026-09-05 | The exact "does not yet offer a hermetic toolchain distribution" sentence, the four named third-party projects, and the autodetect off-switch, all in the ruleset's own words. |
| [bazelbuild/rules_cc releases](https://github.com/bazelbuild/rules_cc/releases) (via `gh api`) | Release list (primary) | queried 2026-09-05 | Dates 0.0.10 (2024-09-13, the modular-toolchain-API landing) against the current release, 0.2.22 (2026-07-07). |
| [rules_cc examples/rule_based_toolchain](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/examples/rule_based_toolchain/toolchains/clang/BUILD.bazel) | Maintained working example (primary source) | `main`, fetched 2026-09-05 | The real, minimal `cc_toolchain()` call from `@rules_cc//cc/toolchains` — the modular API's third decision-tree branch, shown rather than described. |
| [bazel-contrib/toolchains_llvm README.md](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) | Ruleset's own top-level doc (primary) | `master` v1.9.0, fetched 2026-09-05 | Sanitizer feature set and the `--host_features` reset, the four tested cross-compile pairs, the Yocto/Debian `cxx_include_layout` trap, the exact named-modules floor and the `layering_check`-preserving default — all quoted verbatim from this file. |
| [bazel-contrib/toolchains_llvm releases](https://github.com/bazel-contrib/toolchains_llvm/releases) (via `gh api`) | Release list (primary) | queried 2026-09-05 | Confirms v1.9.0 published 2026-08-29 as current. |
| [uber/hermetic_cc_toolchain README.md](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md) | Ruleset's own top-level doc (primary) | `main` v4.3.0, fetched 2026-09-05 | The UBSAN-by-default statement, the "Known Issues" section (zig cache location, OSX sysroot), and the confirmed *absence* of any "tested with rules_go/rules_rust/rules_foreign_cc" claim — the source that corrects §7's miscitation. |
| [uber/hermetic_cc_toolchain releases](https://github.com/uber/hermetic_cc_toolchain/releases) (via `gh api`) | Release list (primary) | queried 2026-09-05 | Confirms v4.3.0 published 2026-07-27 as current, against the README's own stale `version = "3.1.0"` example. |
| [ziglang/zig#4830](https://github.com/ziglang/zig/issues/4830) | Upstream issue with maintainer comment (primary) | opened 2020-03-27, comment cited undated but pre-2026 | The zig maintainer's own explanation that UBSAN-in-debug-mode is intentional design, and that an optimization flag escapes it — the root cause behind hermetic_cc_toolchain's own documented symptom. |
| [Pigweed: "Shaping a better future for Bazel C/C++ toolchains"](https://pigweed.dev/blog/06-better-cpp-toolchains.html) | Practitioner account from the people who built `pw_cc_toolchain` (primary for its own history) | published 2024-12-11 | The four named symptoms of the autodetected default, and the exact authorship trace from `pw_cc_toolchain` through SEED 0113 to the `rules_cc` 0.0.10 upstream. |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Bazel's own release announcement (primary) | 2026-01-20 | Verbatim confirmation of C++ rule externalization into `rules_cc` at 9.0, `--incompatible_autoload_externally`'s empty-by-default flip, and WORKSPACE code removal — used here for the `cc_*`-`load()` AI-agent trap and the era grounding. |
| [CppOptions.java, tags 8.7.0/9.0.0/9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java) | Bazel's own source (primary) | fetched per-tag, 2026-09-05 | Source-verified, not doc-verified: `--experimental_cpp_modules`'s exact default (`false`) and its presence across 8.7.0–9.2.0 — the evidence behind this file's caveat on `toolchains_llvm`'s stated floor. |
| [Julio Merino — BazelCon 2024 recap](https://blogsystem5.substack.com/p/bazelcon-2024-recap) | Practitioner conference recap | published 2024-10-22 | The only source in this survey for Google's stated intent to remove the default C++ toolchain concept — dated precisely, and checked here against current behavior to show it is unexecuted. |
