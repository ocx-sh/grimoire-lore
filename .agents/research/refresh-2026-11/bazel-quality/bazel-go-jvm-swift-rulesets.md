---
title: Go, Java/Kotlin and Swift Bazel rulesets, delta since each file's measurement date
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 38
---

# Go, Java/Kotlin and Swift Bazel rulesets: delta to 2026-11-27

Scope: a delta update. Each file is compared from its own measurement date (go.md 2026-09-26, java.md 2026-09-12, swift.md 2026-10-10) up to 2026-11-27. Everything not listed as changed is unchanged. No `bazel` binary was run; all findings come from release notes, tagged source files and diffs read through the GitHub API, plus the live bazel.build pages. Behavioural claims that the files measured with a binary (reproducible bytes, vet analyzer counts) were not re-measured and are marked as such.

## Contents

1. Summary
2. Findings: Go, JVM, Swift
3. Normative guidance candidates
4. AI-agent angle
5. Contested / evolving
6. Sources

## Summary

- Go: newest rules_go is 0.65.0 (2026-10-22); newest stable gazelle is still 0.54.0 (2026-09-03), but the v2 line is now on BCR as 2.0.0-beta.1 (2026-10-02) and 2.0.0-beta.2 (2026-10-08), plus a stray 1.0.0-beta.1.
- Go: `go_deps.config(check_direct_dependencies = ...)` is deprecated on gazelle master and in the 2.0.0-beta tags in favour of a new `checks` attribute (default `"warning"`). BZL-GO-13 is correct for 0.54.0 only.
- Go: BZL-GO-12 (`gazelle_default_attributes` beats the registry's default overrides) is unchanged in the v2 line; the precedence is now documented in source as a four-level list.
- Go: `go_sdk.from_file` and toolchain-line semantics are unchanged in 0.65.0. The only change is that it reads go.mod and go.work by label (no behaviour change to the generated SDK).
- Go: rules_go 0.64.0 stopped passing a fixed `-buildid=redacted` to the linker and 0.65.0 derives Go build IDs from the linked binary. BZL-GO-15's "byte-identical across two clones" measurement is stale for 0.63.0 and must be re-measured on 0.65.x.
- Go: rules_go 0.65.0 raises the minimum Bazel version to 7.7.0, removes the `request_nogo` setting and adds nogo crash reporting. TOOLS_NOGO and the strip mapping (`-s -w` for strip mode) are unchanged.
- Go: no rules_go issue tracking the nogo `GoVersion` gap was found; [gazelle#1797](https://github.com/bazel-contrib/bazel-gazelle/issues/1797) is still open.
- Java: newest rules_jvm_external is 7.2 (2026-10-12), rules_kotlin v2.4.21 (2026-10-15, repository now `bazel-contrib/rules_kotlin`), rules_java 9.9.0 (2026-08-25, before the baseline), contrib_rules_jvm 0.35.0 (2026-11-12, repository now `bazel-contrib/rules_jvm`).
- Java: java.md's "contrib_rules_jvm 0.31.0 (pre-1.0, no tagged releases)" is wrong; tagged releases exist (0.31.1 on 2025-11-11, 0.34.0 on 2026-07-24, 0.35.0 on 2026-11-12).
- Java: `x_lambdas` default `"class"`, the strict_visibility attribute and the Kotlin/ijar README warning are all unchanged through v2.4.21 and 7.2.
- Java: in Bazel source the flag is `experimental_strict_java_deps` with `oldName = "strict_java_deps"`, so both spellings are accepted. The two docs pages still disagree on spelling. BZL-JAVA-05's premise (one spelling "rejected") needs softening.
- Swift: newest rules_swift is 4.3.0 (2026-11-16), rules_swift_package_manager v1.26.0 (2026-11-19). rules_swift_package_manager 1.26.0 now declares `bazel_dep(rules_swift, 4.2.1)`, so the "resolves 3.6.0 when the root omits it" claim is true only for 1.25.0 and earlier.
- Swift: upcoming-feature names and SE floors are unchanged through Swift 6.4.3 (2026-11-20); Swift 6.5 is not released. Bazel 10.0.0 is still at rc4 (2026-11-19); Bazel 9.3.3 and 8.9.0 are released.
- Swift: the three 4.2.1 doc drifts are all still present in 4.3.0.

## Findings

### 1. Go (baseline 2026-09-26: rules_go 0.63.0, gazelle 0.54.0)

Versions. rules_go releases after the baseline: [0.64.0 (2026-09-30)](https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.0), [0.64.1 (2026-10-01)](https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.1), [0.64.2 (2026-10-08)](https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.2), [0.65.0 (2026-10-22)](https://github.com/bazel-contrib/rules_go/releases/tag/v0.65.0); BCR metadata lists 0.65.0 as newest. Default SDK in the release snippets moved from the 1.27.1 line to `go_register_toolchains(version = "1.27.3")` in 0.65.0.

| Claim | Status | Detail |
|---|---|---|
| BZL-GO-01 `go_sdk.from_file`, toolchain-line semantics, "Measured rules_go 0.63.0" | unchanged (version bump) | The 0.63.0 to 0.65.0 diff of `go/private/extensions.bzl` only drops old-Bazel feature checks; `from_file` is still the tag. [PR 4756](https://github.com/bazel-contrib/rules_go/pull/4756) (0.65.0) reads go.mod and go.work by label; the PR states the generated SDK repo is identical. Parse errors now cite the label (`@@//:go.mod:3: ...`) instead of an absolute path. The version-selection logic was not re-run. |
| BZL-GO-12 `gazelle_default_attributes` | unchanged | Gazelle 0.54.0 `_get_override_or_default` checks specific override, then default attributes, then registry path overrides. Master (v2 line) documents the same order in `_gazelle_attributes_for_module`: go_repository defaults, default_gazelle_overrides.bzl, `gazelle_default_attributes`, `gazelle_override`. Caveat: the rationale text "per gazelle's `bzlmod.md`" cites a file that does not exist at `docs/bzlmod.md` on either ref; the authoritative text is now the source comments above and the `go_deps.bzl` tag docs. Could not determine whether a prose page exists elsewhere. |
| BZL-GO-13 `check_direct_dependencies`, "default only prints a warning" | changed (v2 line only) | Old text: "The attribute is `check_direct_dependencies`, not `checks`." New fact: on gazelle master and in tags [v2.0.0-beta.1](https://github.com/bazel-contrib/bazel-gazelle/releases/tag/v2.0.0-beta.1) and [v2.0.0-beta.2](https://github.com/bazel-contrib/bazel-gazelle/releases/tag/v2.0.0-beta.2), `go_deps.config` has `checks` (values off, warning, error; default `"warning"`) and `check_direct_dependencies` is "DEPRECATED: Use `checks` instead", printing a deprecation message when set. Source: [go_deps.bzl on master](https://github.com/bazel-contrib/bazel-gazelle/blob/master/internal/bzlmod/go_deps.bzl). Default behaviour (warning) is unchanged. 0.54.0 remains the newest non-beta tag. |
| BZL-GO-11 MVS uplift example (rules_go's own go.mod raised `golang.org/x/text`) | could not determine | Mechanism (MVS over every Bazel module's go.mod) is unchanged; gazelle master rewrote `go_deps` on `go list -m` ([commit 2026-09-14, #2418](https://github.com/bazel-contrib/bazel-gazelle/pull/2418)) and rules_go 0.65.0 upgraded `golang.org/x/tools` to v0.51.0. Whether rules_go 0.65.0's go.mod still pulls the 2017 pin to v0.26.0 was not re-measured. |
| BZL-GO-15 and "rules_go 0.63.0 turns `--strip=sometimes` into link `-s -w`" | unchanged | `emit_link` in 0.65.0 still adds `-s -w` when `go.mode.strip`. |
| BZL-GO-15 reproducibility ("byte-identical across two clones") | changed, needs re-measure | The 0.63.0 to 0.65.0 diff of `go/private/actions/link.bzl` removes `tool_args.add("-buildid=redacted")` and 0.65.0 notes ([PR 4728](https://github.com/bazel-contrib/rules_go/pull/4728)) "derive Go build IDs from the linked binary". Link actions also gain build-info flags (`-main_imports`, `-package_metadata`, `-imports`). Byte identity may still hold; it was not measured. |
| nogo analyzer gap ("omits four of go vet's 35 analyzers", `pass.Pkg.GoVersion()` equal to the SDK) | unchanged as far as read | `TOOLS_NOGO` in `go/def.bzl` is not in the diff. 0.65.0 changes around nogo: crash reporting instead of a missing `.facts` output ([PR 4747](https://github.com/bazel-contrib/rules_go/pull/4747)), the `request_nogo` build setting removed ([PR 4761](https://github.com/bazel-contrib/rules_go/pull/4761)), and tools/x upgrades (0.48.0 then 0.51.0 in the line). The `GoVersion` behaviour was not re-probed. Note golang.org/x/tools v0.53.0 broke nogo ([rules_go#4790](https://github.com/bazel-contrib/rules_go/issues/4790), opened and closed 2026-11-21 as an issue title), relevant to the file's pinned `golang.org/x/tools` v0.50.0. |
| "No rules_go issue tracks this (searched 2026-09-26)" | unchanged | Searching rules_go issues for `nogo GoVersion` and `nogo go version language version analyzer` returned no issue about analyzers seeing the SDK version instead of the `go` line. Related open: [#4744](https://github.com/bazel-contrib/rules_go/issues/4744) (nogo export data, opened 2026-10-09, mentions "language versions" being preserved, not the same defect). Re-dated search: 2026-11-27. |
| gazelle#1797 "(open on 2026-09-26)" | unchanged | Still open as of 2026-11-27, title "Cyclical Indirect Dependencies & Go.work can cause divergence". |
| rules_go#2396 `cgocall` | unchanged | Still open. |
| "No 8.x leg was run"; minimum Bazel | changed | rules_go 0.65.0 raises the minimum supported Bazel to 7.7.0 ([PR 4762](https://github.com/bazel-contrib/rules_go/pull/4762)). |

Other gazelle changes worth knowing: `go_deps` now supports `fast_imprecise` mode (2026-11-18, #2507); new `-strict` and `-fix` flags in the v2 updater; `cgo_library` and `go_grpc_library` dropped from the Go language (v2.0.0-beta.1). The v2 line is beta, so stable guidance stays on 0.54.0.

### 2. Java and Kotlin (baseline 2026-09-12)

Versions after baseline: [rules_jvm_external 7.2](https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.2) (2026-10-12, requires Bazel 7.7.1, 8.8.1 or 9, bumps rules_kotlin to 2.4.0); rules_kotlin [v2.4.20](https://github.com/bazel-contrib/rules_kotlin/releases/tag/v2.4.20) (2026-09-17), [v2.4.21](https://github.com/bazel-contrib/rules_kotlin/releases/tag/v2.4.21) (2026-10-15, drops WORKSPACE tests and requires bzlmod); contrib_rules_jvm (repo now [bazel-contrib/rules_jvm](https://github.com/bazel-contrib/rules_jvm/releases)) v0.35.0 on 2026-11-12. rules_java newest is 9.9.0 (2026-08-25), already older than the baseline; no change. rules_kotlin moved from `bazelbuild/` to `bazel-contrib/`; GitHub redirects both.

| Claim | Status | Detail |
|---|---|---|
| Header: "rules_jvm_external 7.1, rules_kotlin v2.4.10, contrib_rules_jvm 0.31.0 (pre-1.0, no tagged releases)" | version bump, and wrong for contrib_rules_jvm | Newest are 7.2, v2.4.21, 0.35.0. "No tagged releases" was already wrong at the baseline: the tag list shows 0.31.1 (2025-11-11), 0.32.0 (2026-01-20), 0.33.0 (2026-04-20), 0.34.0 (2026-07-24), 0.35.0 (2026-11-12), and BCR carries 0.30.0 to 0.35.0. |
| BZL-JAVA-05 flag name disagreement | changed (clarified) | The disagreement persists: [command-line reference](https://bazel.build/reference/command-line-reference) lists `--experimental_strict_java_deps`, [user manual](https://bazel.build/docs/user-manual) lists `--strict_java_deps`. New fact from source: [JavaOptions.java](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/rules/java/JavaOptions.java) declares `name = "experimental_strict_java_deps"` with `oldName = "strict_java_deps"`, and the same `oldName` is present at tags 8.8.0 and 9.2.0. Both spellings therefore resolve. The row's rationale ("a misspelled flag is rejected") is wrong for `--strict_java_deps` at those versions. Whether `oldName` is deprecation-warned was not determined. |
| BZL-JAVA-13 `strict_visibility` | unchanged | `strict_visibility` and `strict_visibility_value` (default `//visibility:private`) are defined identically in `private/extensions/maven.bzl` at 7.1 and 7.2. |
| BZL-JAVA-18 rules_kotlin java_import and ijar trap, "skips ijar automatically" via maven.install | unchanged | The README warning line is still present at v2.4.21 (line 162, was 146 at v2.4.10). The 7.1 to 7.2 diff touches no ijar or kotlin_module logic. |
| BZL-JAVA-19 `x_lambdas` default `"class"` | unchanged | [opts.kotlinc.bzl](https://github.com/bazel-contrib/rules_kotlin/blob/v2.4.21/src/main/starlark/core/options/opts.kotlinc.bzl) at v2.4.21 and v2.4.10 is identical: `default = "class"`, doc says it differs from the Kotlin 2.x/Gradle default of `"indy"`. Note v2.4.20 changed the default Kotlin to 2.4 and v2.4.21 added `x_compiler_plugin_order`; neither touches the row. |
| Doc bug "unfixed as of its 2026-09-05 revision" (default javac `-source 8 -target 8` versus `--java_language_version` default 11) | partly could not determine | The `-source 8 -target 8 -encoding UTF-8` text is still in the [user-manual source](https://github.com/bazelbuild/bazel/blob/master/docs/docs/user-manual.mdx) (last touched 2026-11-23 for other changes). The "defaults to 11" statement is not on the user-manual page; the live [Java and Bazel page](https://bazel.build/docs/bazel-and-java) says `--tool_java_language_version`/`--tool_java_runtime_version` default to 11 and `remotejdk_11`, and states no default for `--java_language_version`. The rendered pages show no revision dates, so the "2026-09-05 revision" wording cannot be re-confirmed. |

Other items: rules_kotlin v2.4.20 adds `no_proc`, Java release 25 support in `kt_javac_options`, Build Tools API compilation; v2.4.21 adds `manifest_lines` to kt_jvm rules. rules_jvm_external 7.2 removes `-noverify` and adds AAR support to IndexJar. None conflicts with a quoted row.

### 3. Swift (baseline 2026-10-10: rules_swift 4.2.1, rules_swift_package_manager 1.25.0, Swift 6.4.0)

Versions after baseline: rules_swift [4.2.2](https://github.com/bazelbuild/rules_swift/releases/tag/4.2.2) (2026-10-20, fixes SwiftTestingRunner for the 6.5 event-stream schema) and [4.3.0](https://github.com/bazelbuild/rules_swift/releases/tag/4.3.0) (2026-11-16); [rules_swift_package_manager v1.26.0](https://github.com/cgrindel/rules_swift_package_manager/releases/tag/v1.26.0) (2026-11-19). Swift releases: 6.4.1 (2026-10-15), 6.4.2 (2026-10-30), 6.4.3 (2026-11-20); 6.4.0 was 2026-09-15, before the baseline. No Swift 6.5 release exists as of 2026-11-27 (rules_swift 4.2.2's note refers to a 6.5 schema, i.e. pre-release).

| Claim | Status | Detail |
|---|---|---|
| BZL-SWIFT-02 "rules_swift 4.2.1 is bzlmod-only (`bazel_compatibility = [">=8.0.0"]`)" | unchanged (version bump) | `MODULE.bazel` at 4.3.0 still has `bazel_compatibility = [">=8.0.0"]`, `compatibility_level = 3`. |
| BZL-SWIFT-02 "a root declaring only rules_swift_package_manager silently resolves rules_swift 3.6.0" | changed | Old text: resolves 3.6.0. New fact: rules_swift_package_manager v1.26.0 declares `bazel_dep(name = "rules_swift", version = "4.2.1", max_compatibility_level = 3)`; v1.25.0 declared 3.6.0. Release note: "require rules_swift 4.2.1 and add explicit modules support" (PR 2576). Date of change: 2026-11-19. The rule's instruction (declare rules_swift in the root) stays good advice; the stated failure is true for rsp 1.25.0 and earlier only. |
| "Bazel 10 is unverified" | unchanged | [Bazel 10.0.0rc4](https://github.com/bazelbuild/bazel/releases) (2026-11-19) is still a release candidate. 9.3.3 and 8.9.0 were released 2026-11-19, so the file's "9.3.0 and 8.8.1 are unverified" list is out of date (both are superseded). rules_swift 4.3.0 states: "compatible with Bazel 8.x LTS, 9.x LTS, and rolling releases"; rules_jvm_external 7.2 requires Bazel 7.7.1, 8.8.1 or 9. |
| BZL-SWIFT-08/09/11 names (`swift.enable_v6`, ExistentialAny, MemberImportVisibility, InternalImportsByDefault, NonisolatedNonsendingByDefault, InferIsolatedConformances) and floors (SE-0335, 0409, 0444, 0461, 0470) | unchanged | `Features.def` at swift-6.4.0-RELEASE, swift-6.4.3-RELEASE and main lists all five with the same SE numbers. The rules_swift 4.2.1 to 4.3.0 diff of `features.bzl` adds only a guard (below). `swift.upcoming.ApproachableConcurrency` was not re-checked. Sources: [Features.def at 6.4.3](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/Basic/Features.def). |
| BZL-SWIFT-15 three 4.2.1 doc drifts | unchanged | At 4.3.0, `doc/standalone_toolchain.md` still registers the `_embedded_` pair and lists `fedora39` and `amazonlinux2`; `doc/rules.md` still has the "XCTest Test Discovery" section. Only an Android SDK URL example was added. |
| BZL-SWIFT-05 "4.2.1 carries 6.2.1 to 6.4.0; `6.4.1` fails" | version bump | The 4.2.1 to 4.3.0 diff adds `6.4.1` and `6.4.2` to `swift_release_metadata.json`. 6.4.3 was not in that diff. 4.2.2 also updated metadata (contents not read). |
| New in 4.3.0 | not in file | `swift._*` internal features are now rejected when requested directly on a target, package or command line ([PR 2002](https://github.com/bazelbuild/rules_swift/pull/2002)); `.package.swiftinterface` outputs; explicit modules disabled for android and wasm. A grep for `swift\._` in the pair's files found no use. |

## Normative guidance candidates

1. Rule: In BZL-GO-13, name `check_direct_dependencies` for gazelle 0.x and `checks` (with `check_direct_dependencies` deprecated) for gazelle 2.x, and say which version a repository pins. Rationale: the attribute name differs by line and a deprecated name prints a message on every evaluation. Verification: `grep -n -e 'check_direct_dependencies' -e 'checks *=' -- MODULE.bazel`, then compare to `bazel_dep(name = "gazelle"` version.
2. Rule: Re-measure BZL-GO-15's byte-identity recipe on rules_go 0.65.x before keeping "byte-identical" as a fact, and re-date the measurement. Rationale: the linker `-buildid=redacted` was removed and build IDs are now derived from the binary. Verification: build the same target in two clones with different directory names and separate output bases, then `cmp` and `sha256sum` the outputs.
3. Rule: Replace "contrib_rules_jvm 0.31.0 (pre-1.0, no tagged releases)" with the current tagged version read from BCR. Rationale: tags exist. Verification: `gh api repos/bazel-contrib/rules_jvm/tags --jq '.[].name'` or BCR `modules/contrib_rules_jvm/metadata.json`.
4. Rule: In BZL-JAVA-05, state that `--experimental_strict_java_deps` is the declared name and `--strict_java_deps` its `oldName` alias, and keep the confirmation step. Rationale: both resolve at 8.8.0 and 9.2.0; the docs pages still disagree. Verification: `bazel help build --long | grep -e strict_java_deps` at the pin, and `bazel build --strict_java_deps=error //...` must not fail with an unknown-flag error.
5. Rule: In BZL-SWIFT-02, bound the 3.6.0 claim to rules_swift_package_manager 1.25.0 and earlier, and add that 1.26.0 resolves 4.2.1. Rationale: the dependency was bumped on 2026-11-19. Verification: `bazel mod graph | grep rules_swift` on the repository, compared with the rsp version.
6. Rule: In swift.md Gaps, replace "9.3.0 and 8.8.1 unverified" with "9.3.3, 8.9.0 released 2026-11-19; Bazel 10 is at rc4". Rationale: stale list. Verification: `gh api repos/bazelbuild/bazel/releases --jq '.[].tag_name'`.
7. Rule: In BZL-GO-12, cite the `go_deps.bzl` source comment for precedence instead of `bzlmod.md`. Rationale: the cited file is absent. Verification: `gh api repos/bazel-contrib/bazel-gazelle/contents/docs/bzlmod.md` returns 404.
8. Rule: Add to swift.md that rules_swift 4.3.0 rejects direct `swift._*` features. Rationale: a build that sets one now fails at analysis. Verification: `grep -rn 'swift\._' --include=BUILD* --include=*.bzl --include=.bazelrc .`.

## AI-agent angle

- A model trained before 2026-10 writes `check_direct_dependencies` as the live attribute for gazelle 2.x; catch with candidate 1's grep.
- A model reciting "rules_kotlin lives at bazelbuild/rules_kotlin" and "contrib_rules_jvm has no releases" cites dead names; check the repository URL redirects and BCR metadata.
- A model pins rules_swift 3.6.0 or says rules_swift_package_manager drags it in; read `bazel mod graph`.
- A model treats `-buildid=redacted` or fixed link flags as the reproducibility mechanism for rules_go; only an A/B build proves it.
- A model asserts `--strict_java_deps` "does not exist"; `bazel help build --long | grep strict_java_deps` shows the canonical name and the alias works.

## Contested / evolving

- Gazelle v2: a beta line (`2.0.0-beta.2`, plus a confusing `1.0.0-beta.1` tag whose only change points go.mod at v2.0.0-beta.1) is on BCR; GitHub marks beta.2 as the latest release. Trend: v2 becomes the default eventually, with `checks` replacing `check_direct_dependencies`. Not yet stable as of 2026-11-27.
- nogo is being reworked: an unmerged five-layer stack ([rules_go#4744](https://github.com/bazel-contrib/rules_go/issues/4744)) moves nogo to x/tools export data. It may change what analyzers see.
- Bazel 10.0.0 is at rc4 (2026-11-19); all three rulesets state support for 8.x and 9.x LTS only.

## Sources

| URL | What it is | Date | Why |
|---|---|---|---|
| https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.0 | rules_go 0.64.0 notes | 2026-09-30 | link build-info, nogo x/tools bump |
| https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.1 | rules_go 0.64.1 notes | 2026-10-01 | coverage fix |
| https://github.com/bazel-contrib/rules_go/releases/tag/v0.64.2 | rules_go 0.64.2 notes | 2026-10-08 | Go 1.27 response files |
| https://github.com/bazel-contrib/rules_go/releases/tag/v0.65.0 | rules_go 0.65.0 notes | 2026-10-22 | from_file by label, min Bazel 7.7.0, request_nogo removed |
| https://github.com/bazel-contrib/rules_go/pull/4756 | PR: go_sdk reads go.mod by label | 2026-10 | confirms no SDK change |
| https://github.com/bazel-contrib/rules_go/compare/v0.63.0...v0.65.0 | diff 0.63.0 to 0.65.0 | 2026-10-22 | link.bzl, extensions.bzl, nogo changes |
| https://github.com/bazel-contrib/rules_go/issues/4744 | nogo export-data stack | 2026-10-09 | related open work |
| https://github.com/bazel-contrib/rules_go/issues/4790 | nogo breaks on x/tools 0.53.0 | 2026-11-21 | pin risk |
| https://github.com/bazel-contrib/bazel-gazelle/issues/1797 | cycle and go.work divergence | open | still open |
| https://github.com/bazel-contrib/bazel-gazelle/releases/tag/v2.0.0-beta.1 | gazelle v2 beta 1 | 2026-10-02 | v2 line, go_deps rewrite |
| https://github.com/bazel-contrib/bazel-gazelle/releases/tag/v2.0.0-beta.2 | gazelle v2 beta 2 | 2026-10-08 | latest tag |
| https://github.com/bazel-contrib/bazel-gazelle/blob/master/internal/bzlmod/go_deps.bzl | go_deps source, master and v0.54.0 read | 2026-11-18 | checks attribute, precedence |
| https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.2 | rules_jvm_external 7.2 | 2026-10-12 | Bazel floor, changes |
| https://github.com/bazel-contrib/rules_kotlin/releases/tag/v2.4.20 | rules_kotlin v2.4.20 | 2026-09-17 | changes |
| https://github.com/bazel-contrib/rules_kotlin/releases/tag/v2.4.21 | rules_kotlin v2.4.21 | 2026-10-15 | WORKSPACE dropped |
| https://github.com/bazel-contrib/rules_kotlin/blob/v2.4.21/src/main/starlark/core/options/opts.kotlinc.bzl | x_lambdas definition | 2026-10-15 | default unchanged |
| https://github.com/bazel-contrib/rules_jvm/releases | contrib_rules_jvm releases (v0.35.0) | 2026-11-12 | corrects header |
| https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/rules/java/JavaOptions.java | strict deps flag definition | 2026-10-26 | oldName alias |
| https://bazel.build/reference/command-line-reference | Bazel flag reference | live 2026-11-27 | experimental_ spelling |
| https://bazel.build/docs/user-manual | Bazel user manual | live 2026-11-27 | strict_java_deps spelling, -source 8 |
| https://bazel.build/docs/bazel-and-java | Java and Bazel page | live 2026-11-27 | default 11 statement |
| https://github.com/bazelbuild/rules_swift/releases/tag/4.2.2 | rules_swift 4.2.2 | 2026-10-20 | Swift 6.5 schema fix |
| https://github.com/bazelbuild/rules_swift/releases/tag/4.3.0 | rules_swift 4.3.0 | 2026-11-16 | swift._ guard, metadata |
| https://github.com/bazelbuild/rules_swift/compare/4.2.1...4.3.0 | diff 4.2.1 to 4.3.0 | 2026-11-16 | docs and metadata drift check |
| https://github.com/cgrindel/rules_swift_package_manager/releases/tag/v1.26.0 | rsp 1.26.0 | 2026-11-19 | requires rules_swift 4.2.1 |
| https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/Basic/Features.def | upcoming feature names | 2026-11-20 | names and SE numbers unchanged |
| https://github.com/bazelbuild/bazel/releases | Bazel releases | 2026-11-19 | 10.0.0rc4, 9.3.3, 8.9.0 |
| https://github.com/bazelbuild/bazel-central-registry/tree/main/modules | BCR metadata for all eight modules | 2026-11-27 | newest versions |
