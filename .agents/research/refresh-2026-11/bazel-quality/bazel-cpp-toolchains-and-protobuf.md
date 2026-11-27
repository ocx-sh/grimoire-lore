---
title: C++ toolchain rulesets, C++20 modules and protobuf, delta 2026-09-06 to 2026-11-27
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 27
---

# Delta: C++ toolchain rulesets, C++20 modules and protobuf

Scope: what changed between the 2026-09-06 baseline (cpp.md, bazel-cpp consolidation) and 2026-11-27 for the rulesets and claims cpp.md binds to. Method: GitHub release bodies, tags, compare endpoints, CHANGELOG/README at tags and BCR `metadata.json`, all read through the `gh api` CLI on 2026-11-27. Nothing was exercised against a live C++ build. Anything not listed below as changed was checked and has no newer upstream fact.

## Contents

- Summary
- Newest versions table
- Claim-by-claim status
- Normative guidance candidates
- AI-agent angle
- Could not determine

## Summary

- Only one claim is wrong: BZL-CC-04's "exists only on `main`, in no tagged release and in no BCR version". PR #843 (merged 2026-09-02) first shipped in `toolchains_llvm` v1.9.1 (2026-09-16), which is on BCR.
- BZL-CC-04 should now name `toolchains_llvm` **1.9.1 or newer** (v1.9.0, 2026-08-29, predates the merge). The Bazel 9.2 plus LLVM 22 floor and the `clang-scan-deps` requirement are unchanged in v1.13.0's README.
- The version header is stale in five places: `rules_cc` 0.2.28, `toolchains_llvm` 1.13.0, `rules_foreign_cc` 0.17.0, `protobuf` 36.2 (37.0-rc3 is a prerelease), `aspect_rules_lint` 2.9.1. `hermetic_cc_toolchain` 4.3.0, `rules_fuzzing` 0.8.0 and `bazel_iwyu` 0.0.4 are still newest.
- `--experimental_cpp_modules` is unchanged through Bazel 9.3.3 and 10.0.0rc4: same name, default `false`, `EXPERIMENTAL` metadata, same "no guarantees" help text.
- C++20 modules support spread across rulesets: `rules_cc` 0.2.25 added GCC and MSVC parts and rules-based-toolchain support, 0.2.28 added rules-based args under `cc/toolchains/args/cpp_modules`. This gives BZL-CC-01 branch three a module story it did not have.
- The `rules_cc` built-in fragments BZL-CC-01-b watches (`args/layering_check`, `args/pic_flags`) had no `select()` change from 0.2.22 to 0.2.28, only an added `srcs` filegroup in each.
- No protobuf release in the window changes the Bazel floor (`>=8.0.0` at 36.1, 36.2 and 37.0-rc3) or the `proto_library` load path.
- `rules_cc` 0.2.25 disables the macOS toolchain by default and 0.2.26 splits coverage features; neither contradicts BZL-CC-33 but both are worth a line.

## Newest versions

| Ruleset | cpp.md header | Newest as of 2026-11-27 | Date | Source |
|---|---|---|---|---|
| rules_cc | 0.2.22 | 0.2.28 (BCR has 0.2.25 to 0.2.28; 0.2.23 and 0.2.24 not on BCR) | 2026-11-05 | [releases](https://github.com/bazelbuild/rules_cc/releases) |
| toolchains_llvm | 1.9.0 plus main | v1.13.0 | 2026-11-04 | [v1.13.0](https://github.com/bazel-contrib/toolchains_llvm/releases/tag/v1.13.0) |
| hermetic_cc_toolchain | 4.3.0 | v4.3.0 (unchanged; one docs-only commit on main 2026-10-22) | 2026-07-27 | [releases](https://github.com/uber/hermetic_cc_toolchain/releases) |
| rules_foreign_cc | 0.15.1 | 0.17.0 (0.16.0 on 2026-09-15) | 2026-10-25 | [0.17.0](https://github.com/bazel-contrib/rules_foreign_cc/releases/tag/0.17.0) |
| protobuf | 36.1.bcr.1 | 36.2 stable (2026-09-17); 37.0-rc3 prerelease (2026-11-12) | 2026-09-17 | [releases](https://github.com/protocolbuffers/protobuf/releases) |
| rules_fuzzing | 0.8.0 | v0.8.0 (unchanged; three maintenance commits on main 2026-11-16) | 2026-04-16 | [releases](https://github.com/bazelbuild/rules_fuzzing/releases) |
| bazel_iwyu | 0.0.4 | 0.0.4 (only BCR version) | not re-dated | [BCR metadata](https://github.com/bazelbuild/bazel-central-registry/tree/main/modules/bazel_iwyu) |
| aspect_rules_lint | 2.9.0 | 2.9.1 | 2026-09-18 | [BCR metadata](https://github.com/bazelbuild/bazel-central-registry/tree/main/modules/aspect_rules_lint) |
| Bazel (context) | 9.2.0 | 9.3.3, 8.9.0, 7.7.3 (all 2026-11-19); 10.0.0rc4 prerelease | 2026-11-19 | [releases](https://github.com/bazelbuild/bazel/releases) |

The `toolchains_llvm` 1.10.0 to 1.13.0 releases are minor feature drops (see BZL-CC-04 below). All still declare minimum Bazel 7.0.0.

## Claim-by-claim status

### Header version list: changed (version bump)

Old: "rules_cc 0.2.22, toolchains_llvm 1.9.0 plus its unreleased main after PR #843, hermetic_cc_toolchain 4.3.0, rules_foreign_cc 0.15.1, protobuf 36.1.bcr.1, rules_fuzzing 0.8.0, bazel_iwyu 0.0.4, aspect_rules_lint 2.9.0". New: see the table. The phrase "unreleased main after PR #843" must go entirely. Upstream change dates: rules_cc 0.2.28 on 2026-11-05; toolchains_llvm 1.13.0 on 2026-11-04; rules_foreign_cc 0.17.0 on 2026-10-25; protobuf 36.2 on 2026-09-17; aspect_rules_lint 2.9.1 on 2026-09-18. The baseline "measured against Bazel 8.7.0, 8.8.0, 9.2.0" paragraph is a measurement date statement and need not change, but 9.3.x and 8.9.0 now exist.

### BZL-CC-04: changed (wrong now)

Old text: "as of 2026-09-06 it exists only on `main` (PR #843, merged 2026-09-02), in no tagged release and in no BCR version".

New fact: the PR #843 merge commit `629975f` is an ancestor of v1.9.1 and of every later tag (GitHub compare API, base `629975f`, status `ahead`, `behind_by=0` for v1.9.1, v1.10.0 and v1.11.0) and not of v1.9.0 (status `behind`). v1.9.0 was published 2026-08-29, before the merge. The [CHANGELOG at v1.13.0](https://github.com/bazel-contrib/toolchains_llvm/blob/v1.13.0/CHANGELOG.md) lists under 1.9.1: "Experimental C++ named modules, including `clang-scan-deps` integration." v1.9.1 was published 2026-09-16 (10 days after the baseline) and 1.9.1 is in the BCR `metadata.json` version list. So BZL-CC-04 should name **1.9.1 or newer, newest 1.13.0**, and its grep must flag a pin to exactly 1.9.0 or older, instead of "a plain `bazel_dep` on a released version".

Unchanged inside the rule: the floor in the [v1.13.0 README, "C++ named modules"](https://github.com/bazel-contrib/toolchains_llvm/blob/v1.13.0/README.md): "currently tested configuration is Bazel 9.2 with LLVM 22 on Linux and macOS", the distribution must contain `bin/clang-scan-deps`, "Bazel 7 and 8 do not expose the required `cc_library` module API", Windows not tested. New detail worth adding: usage needs three things together, `--experimental_cpp_modules`, `--features=cpp_modules` and `--cxxopt=-std=c++20` (or newer). Without the `cpp_modules` feature the toolchain keeps disabling named modules to preserve the Clang module-map behaviour `layering_check` uses. That last point links BZL-CC-04 to BZL-CC-12: turning modules on changes the layering_check interaction. Still the wording "the module API is experimental" holds, so keep "experimental" in the rule.

### BZL-CC-27: unchanged

`--experimental_cpp_modules` is read from `CppOptions.java` at tags [9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java), [9.3.3](https://github.com/bazelbuild/bazel/blob/9.3.3/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java) and [10.0.0rc4](https://github.com/bazelbuild/bazel/blob/10.0.0rc4/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java): identical name, `defaultValue = "false"`, `OptionMetadataTag.EXPERIMENTAL`, `UNDOCUMENTED` category, and the help text still reads "there are no guarantees about incompatible changes to it or even keeping the support". It was not renamed, stabilised or removed. The 9.3.0 and 10.0.0rc4 release notes contain no C++ modules line. Rules-side support did grow ([rules_cc 0.2.25 notes](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.25): GCC part, MSVC part, rules-based toolchain API; [0.2.27](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.27): cpp_modules fixes and Windows module actions; [0.2.28](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.28): rules-based args for C++20 modules and a `clang-scan-deps` PATH fallback). The claim's text "never state Bazel supports C++20 modules without naming flag, version and date" stays right; the date-stamped 2026-09-06 multi-interface history (merged 2025-12-10, reverted 2026-01-08, tracking issue reopened) was not re-checked in this delta and is marked could-not-determine below.

### BZL-CC-01 three-branch choice: unchanged in structure, two facts to refresh

- UBSAN-on-by-default in `hermetic_cc_toolchain`: unchanged. No release after 4.3.0, and the [README](https://github.com/uber/hermetic_cc_toolchain/blob/main/README.md) section "UBSAN and SIGILL: Illegal Instruction" still says `zig cc` enables UBSAN by default.
- Branch one ("named modules or the newest sanitizer story, then toolchains_llvm") is still right and the sanitizer story grew: v1.9.0 added LeakSanitizer, v1.11.0 made MemorySanitizer instrument C as well as C++ and fail loudly on unsupported targets (Linux only), per the [CHANGELOG](https://github.com/bazel-contrib/toolchains_llvm/blob/v1.13.0/CHANGELOG.md).
- Branch three (`rules_cc` own modular toolchain) now has first-party C++20 module args. Bump "21 releases, 14 months, zero renames" if the row is re-measured; not re-measured here.
- BZL-CC-01-b (fragment `select()` churn): between 0.2.22 and 0.2.28 the files `cc/toolchains/args/layering_check/BUILD` (+6 lines) and `cc/toolchains/args/pic_flags/BUILD` (+6) changed only by adding a `filegroup(name = "srcs")`; no `select()` condition was touched in those two (compare [0.2.22...0.2.28](https://github.com/bazelbuild/rules_cc/compare/0.2.22...0.2.28)). The new fragment `cc/toolchains/args/cpp_modules/BUILD` (+56) is additive. ThinLTO fragments were not individually diffed.

### BZL-CC-12 and BZL-CC-14 (layering_check via aquery): unchanged

No Bazel 9.3.x or 10.0.0rc4 release-note line touches `layering_check` or the module-map staging. toolchains_llvm README still says strict header deps is "Linux only" and still lists layering_check as depending on Clang modules. The only new interaction is the `cpp_modules` feature note above. The Bazel 7.3.0 floor statement is unchanged.

### BZL-CC-33 (coverage Linux and macOS only): unchanged, with new context

No source found that adds a Windows C++ coverage path. Related changes: [rules_cc 0.2.26](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.26) splits coverage features into `coverage_enabled` and `coverage_instrumented`; [0.2.28](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.28) preserves LLVM coverage runtime object paths; [Bazel 10.0.0rc4 notes](https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4) default `--experimental_split_coverage_processing` and `--experimental_fetch_all_coverage_outputs` to true and add `BAZEL_LLVM_PROFILE_FILE` (default pattern `%h-%p-%m.profraw`). The `GCOV_PREFIX_STRIP` macOS statement was not re-read against the Bazel coverage doc page; treat as unchanged.

### Non-Negotiable 18 in rules/bazel-quality.md: unchanged

Line 103 ("confirm `layering_check` on the real compile command with `aquery`") cites BZL-CC-12 and BZL-CC-14, both unchanged.

### protobuf cross-file claims (starlark.md, hermeticity.md, flags.md, architecture.md): version bump only

- protobuf 36.2 and 37.0-rc3 both keep `bazel_compatibility = [">=8.0.0"]` in `MODULE.bazel` ([36.1](https://github.com/protocolbuffers/protobuf/blob/v36.1/MODULE.bazel), [36.2](https://github.com/protocolbuffers/protobuf/blob/v36.2/MODULE.bazel), [37.0-rc3](https://github.com/protocolbuffers/protobuf/blob/v37.0-rc3/MODULE.bazel)). The 8.0.0 floor in flags.md line 193 is unchanged.
- `proto_library` still loads from `@protobuf//bazel:proto_library.bzl` ([v37.0-rc3 file](https://github.com/protocolbuffers/protobuf/blob/v37.0-rc3/bazel/proto_library.bzl)); no load-path change.
- protobuf 36.2 release notes list only Rust and C# changes. 37.0-rc3 adds to Bazel: warn on `--strict_public_imports` violations by default, and a fix to prebuilt protoc toolchain resolution ([37.0-rc3 notes](https://github.com/protocolbuffers/protobuf/releases/tag/v37.0-rc3)). The second item is adjacent to flags.md's `prefer_prebuilt_protoc` 33.4/34.0 boundary: the label string still appears in the toolchain BUILD at 36.1, 36.2 and 37.0-rc3, but whether the 37.0 fix changes the label path was not confirmed (see below).
- protobuf 36.0 is yanked on BCR (macOS prebuilt toolchain integrity mismatch, use `36.0.bcr.1`); this predates the window but is worth a mention beside the `36.1.bcr.1` pin.
- `rules_cc` pinned inside protobuf is still 0.2.18; with `rules_cc` 0.2.28 in a root module, MVS resolves to the higher version.

## Normative guidance candidates

1. Rule (edit BZL-CC-04): require `toolchains_llvm` >= 1.9.1 (current 1.13.0) for named modules, and demand all of `--experimental_cpp_modules`, `--features=cpp_modules`, `--cxxopt=-std=c++20` and Bazel >= 9.2 with an LLVM >= 22 distribution containing `bin/clang-scan-deps`. Rationale: 1.9.0 has no modules code; 1.9.1 first carries PR #843. Verify: `grep -n -E 'bazel_dep\(name = "toolchains_llvm"' MODULE.bazel` and compare the version with 1.9.1; then `grep -rn 'cpp_modules' .bazelrc` for the feature; `bazel aquery 'mnemonic("CppCompile", //t:target)' --output=text | grep -c 'clang-scan-deps\|\.pcm'` is a named reading heuristic only, not run here.
2. Rule (edit header): replace the version line with the table above and drop "unreleased main". Rationale: the header is the date anchor agents copy. Verify: `grep -n "unreleased" skills/bazel-quality-reference/cpp.md` returns nothing.
3. Rule (new, SHOULD, add to BZL-CC-04 or BZL-CC-12): when `--features=cpp_modules` is enabled on a `toolchains_llvm` toolchain, re-run the BZL-CC-12 aquery, because the toolchain stops disabling Clang modules for that configuration and the README states the default exists to preserve `layering_check` behaviour. Rationale: upstream README, v1.13.0 "C++ named modules". Verify: aquery count of `-fmodules-strict-decluse` per configuration leg with and without the feature. Interaction is upstream-stated, not measured here.
4. Rule (edit BZL-CC-01 branch three): note that `rules_cc` >= 0.2.28 ships rules-based C++20 module args (`cc/toolchains/args/cpp_modules`). Rationale: release notes 0.2.25 and 0.2.28. Verify: `grep -rn "cpp_modules" @rules_cc//cc/toolchains/args` at the pinned tag.
5. Rule (edit flags.md and starlark.md citations): cite protobuf 36.2 as newest stable and keep `>=8.0.0` as its Bazel floor; do not cite 37.0-rc3 as a floor source. Verify: `grep -n "36.1" skills/bazel-quality-reference/{flags,starlark,hermeticity,architecture}.md` and update each date-stamped sentence.

## AI-agent angle

- Training data and the pre-window cpp.md both say named modules in `toolchains_llvm` are main-only; an agent will therefore wrongly tell users to use `git_override`. The released path (1.9.1+ via BCR) is now correct.
- Agents will recommend `toolchains_llvm` 1.9.0 because it is the version in older README fences; 1.9.0 has no modules code.
- Agents may expect `--experimental_cpp_modules` to have been renamed or stabilised by Bazel 10; it was not.
- 1.13.0 migration trap: `first` or `latest` LLVM and linker selectors no longer pick prereleases without `llvm_version_allow_prereleases = True` (or `linker_version_allow_prereleases = True`); exact pins are unchanged ([v1.13.0 release notes](https://github.com/bazel-contrib/toolchains_llvm/releases/tag/v1.13.0)). Relevant to any generated `llvm.toolchain(...)` snippet using ranges.

## Could not determine

- Whether the multi-interface `module_interfaces` regression history in BZL-CC-27 (merge 2025-12-10, revert 2026-01-08, issue reopened) changed after 2026-09-06; the Bazel issue tracker was not read.
- Whether protobuf 37.0's "fix prebuilt protoc toolchain resolution" changes the `prefer_prebuilt_protoc` label that flags.md pins at the 33.4 and 34.0 boundaries; only the string's presence was confirmed.
- The `GCOV_PREFIX_STRIP` macOS text in Bazel's coverage doc and any Windows C++ coverage addition in the docs; docs pages were not fetched.
- Whether `bazel_iwyu` 0.0.4 is still the newest outside BCR; the upstream repo path used by `gh` returned 404, so only BCR metadata was read.
- Whether rules_cc 0.2.23 and 0.2.24 exist as tags (BCR skips them); not relevant to a pin decision.
