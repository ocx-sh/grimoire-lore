---
title: Bazel lint, test and CI target-selection tooling - delta 2026-09-06 to 2026-11-27
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 24
---

# Bazel lint, test and CI target-selection tooling: delta update

Scope: this is a delta against the 2026-09-06 consolidation, not a re-creation. Only upstream changes dated 2026-09-06 to 2026-11-27 are reported. All release dates come from the GitHub Releases API (`gh api repos/<owner>/<repo>/releases`) and the release bodies, read on 2026-11-27. Nothing below is written from memory. Items I could not measure (I ran no Bazel binary) are labelled "could not determine".

## Contents

1. Summary
2. Newest release of each tool
3. Claim-by-claim verdicts
4. Findings
5. Normative guidance candidates
6. AI-agent angle
7. Contested / evolving
8. Sources

## 1. Summary

- Biggest change: bazel-diff was rewritten. The Kotlin/JVM implementation was deleted on 2026-09-14 (v48.0.0, [PR #498](https://github.com/Tinder/bazel-diff/pull/498)); the Rust binary is now the only CLI, no JDK is needed for the tool, WORKSPACE-mode support was removed from the repo, and the README states "Bazel 8 or higher". The row text "bazel-diff v46.1.0 ... Bazel >=6.2.0 for --useCquery" is therefore wrong as a current statement. Newest release: [v81.0.0](https://github.com/Tinder/bazel-diff/releases/tag/v81.0.0), 2026-11-25 (35 releases in the window).
- buildifier_prebuilt jumped a major: 10.0.1 (2026-09-15), 10.1.0 (2026-09-22), 10.2.0 (2026-11-16, newest). The version scheme now tracks buildtools 10.x. The BZL-LARK-31 floor (8.5.1.3 or later) is still correct and the exit-code fixes are still present in 10.2.0, but "8.5.1.4 (latest)" is stale.
- buildtools moved to the `bazel-contrib` GitHub organisation and v10.0.1 changed the default warning set: `canonical-repository` and `external-path` are gone, `make-location` is new (on by default). Counted from `warn/warn.go`: 99 categories / 98 default becomes 98 categories / 97 default (still only `unsorted-dict-items` off).
- bazel-diff extension question: substantially answered for query mode. Module-extension-generated repositories (including ones no module imports) now get hash nodes from `bazel mod show_repo` (v62.0.0, 2026-10-20), and the README says a change to any repository of an extension changes the owning module's dependents. I did not run it, so the exact "extension tag edit with no repo change" case is documented-by-implication, not measured.
- target-determinator: v0.34.1 (2026-11-19), a label-normalisation fix only; Bazel floor and cache-key text unchanged.
- bazelisk: v1.30.0 (2026-10-20) and v1.31.0 (2026-11-26). The pin "as released on 2026-09-06" is v1.29.0; the newest is v1.31.0.
- BCR presubmit schema (`platform` list and per-task `bazel` field): unchanged. rules_bazel_integration_test: no release since v0.37.1, still no `bazel_compatibility`. Load paths for rules_shell and rules_cc: unchanged.

## 2. Newest release of each tool (as of 2026-11-27)

| Tool | Baseline pin | Newest | Date | Link |
|---|---|---|---|---|
| buildifier_prebuilt | 8.5.1.4 | 10.2.0 | 2026-11-16 | [release](https://github.com/keith/buildifier-prebuilt/releases/tag/10.2.0) |
| buildtools (buildifier) | 8.2.0 / 8.5.1 | v10.2.0 | 2026-10-28 | [release](https://github.com/bazel-contrib/buildtools/releases/tag/v10.2.0) |
| bazel_skylib | 1.9.0 | 1.9.2 (released 2026-07-17, before the window but after 1.9.0, so the baseline pin was already one patch behind) | 2026-07-17 | [release](https://github.com/bazelbuild/bazel-skylib/releases/tag/1.9.2) |
| rules_shell | 0.8.0 | v0.10.0 (repo is now `bazel-contrib/rules_shell`) | 2026-11-16 | [release](https://github.com/bazel-contrib/rules_shell/releases/tag/v0.10.0) |
| rules_cc | 0.2.22 | 0.2.28 | 2026-11-05 | [release](https://github.com/bazelbuild/rules_cc/releases/tag/0.2.28) |
| rules_bazel_integration_test | v0.37.1 | v0.37.1 (no newer) | 2026-01-31 | [release](https://github.com/bazel-contrib/rules_bazel_integration_test/releases/tag/v0.37.1) |
| bazel-diff | v46.1.0 | v81.0.0 | 2026-11-25 | [release](https://github.com/Tinder/bazel-diff/releases/tag/v81.0.0) |
| target-determinator | v0.34.0 | v0.34.1 | 2026-11-19 | [release](https://github.com/bazel-contrib/target-determinator/releases/tag/v0.34.1) |
| aspect_rules_lint | 2.9.0 | v2.9.1 | 2026-09-18 | [release](https://github.com/aspect-build/rules_lint/releases/tag/v2.9.1) |
| bazelisk | v1.29.0 (2026-04-27) | v1.31.0 | 2026-11-26 | [release](https://github.com/bazelbuild/bazelisk/releases/tag/v1.31.0) |

## 3. Claim-by-claim verdicts

| # | Claim at risk | Verdict | Old text | New fact | Source | Date of upstream change |
|---|---|---|---|---|---|---|
| 1 | starlark.md header: "buildifier_prebuilt 8.2.0.2 through 8.5.1.4 (latest)" | update-version-only | 8.5.1.4 latest | 10.2.0 latest; span now 8.2.0.2 through 10.2.0 | [releases](https://github.com/keith/buildifier-prebuilt/releases) | 2026-09-15 (10.0.1), 2026-11-16 (10.2.0) |
| 2 | BZL-LARK-31: "pin at 8.5.1.3 or later - 8.5.1.4 preferred"; false-pass below 8.5.1.3 | unchanged in substance; "8.5.1.4 preferred" is update-version-only | 8.5.1.4 preferred | Floor stays 8.5.1.3. 10.2.0's `runner.bash.template` still uses `find ... -exec "$buildifier_short_path" "${ARGS[@]}" {} +` (no `xargs`, so no 123 remap) and decides test mode from `TEST_WORKSPACE`/`BUILD_WORKSPACE_DIRECTORY`, with no `${WORKSPACE+x}`. The grep verification (`WORKSPACE+x`, `xargs`) still reads empty on 10.2.0 | [runner.bash.template @10.2.0](https://github.com/keith/buildifier-prebuilt/blob/10.2.0/runner.bash.template) | n/a |
| 3 | rules/bazel-quality.md BZL-CORE-02 rationale "a pin below 8.5.1.3" | unchanged | | Floor unchanged | same | n/a |
| 4 | starlark.md gaps: "only the two template fixes named in BZL-LARK-31 are audited" across 8.2.0.2 to 8.5.1.4 | wrong as a span claim (update scope) | 8.2.0.2 to 8.5.1.4, nine releases | Three more releases (10.0.1, 10.1.0, 10.2.0) are unaudited. 10.2.0 notes name three behaviour changes: prune all excluded directories during formatting, a Windows `exclude_patterns` fix, SARIF output via `--format=sarif`. The `exclude_patterns` handling is therefore known to have changed | [10.2.0 notes](https://github.com/keith/buildifier-prebuilt/releases/tag/10.2.0) | 2026-11-16 |
| 5 | starlark.md: "99 categories exist, 98 on by default, exactly one (`unsorted-dict-items`) is off", buildifier 8.2.0 | changed | 99 / 98 / `unsorted-dict-items` off | 98 categories, 97 on by default, `unsorted-dict-items` still the only off one. Removed: `canonical-repository`, `external-path`. Added: `make-location` (default on). Counted by diffing the `FileWarningMap` keys of `warn/warn.go` at v8.5.1 and v10.2.0 and reading `nonDefaultWarnings` | [warn.go v10.2.0](https://github.com/bazel-contrib/buildtools/blob/v10.2.0/warn/warn.go), [warn.go v8.5.1](https://github.com/bazelbuild/buildtools/blob/v8.5.1/warn/warn.go) | between v8.5.1 (2026-01-30) and v10.0.1 (2026-09-15); `make-location` first present in v10.0.1 |
| 6 | bazel_skylib 1.9.0 | update-version-only | 1.9.0 | 1.9.2 exists (2026-07-17); no load-path change found | [1.9.2](https://github.com/bazelbuild/bazel-skylib/releases/tag/1.9.2) | 2026-07-17 |
| 7 | rules_shell 0.8.0 load path for Bazel 9 | unchanged (load path), update-version-only (pin) | 0.8.0 | v0.10.0; `shell/sh_test.bzl`, `sh_binary.bzl`, `sh_library.bzl` still exist at the tag. Repo is now `bazel-contrib/rules_shell`; the release notes say its BCR module is tested with Bazel 9 and 10 | [tree @v0.10.0](https://github.com/bazel-contrib/rules_shell/tree/v0.10.0/shell) | 2026-11-16 |
| 8 | rules_cc 0.2.22 load path for Bazel 9 | unchanged (load path), update-version-only (pin) | 0.2.22 | 0.2.28; `cc/cc_library.bzl`, `cc_binary.bzl`, `cc_test.bzl`, `cc_import.bzl`, `defs.bzl` still exist at the tag. No notes between 0.2.25 and 0.2.28 mention a load-path move | [tree @0.2.28](https://github.com/bazelbuild/rules_cc/tree/0.2.28/cc) | 2026-11-05 |
| 9 | rules_bazel_integration_test v0.37.1 "declares no bazel_compatibility field and never has" | unchanged | | No release after v0.37.1; `MODULE.bazel` on the default branch still has zero `bazel_compatibility` matches | [repo](https://github.com/bazel-contrib/rules_bazel_integration_test) | n/a |
| 10 | ci.md: "bazel-diff v46.1.0 (2026-08-28; Bazel >=6.2.0 for --useCquery, >=8.6.0 / >=9.0.1 for default-mode MODULE.bazel diffing)" | wrong | Bazel >=6.2.0 / >=8.6.0 | README at HEAD: "Bazel 8 or higher (use the latest release for your major version)". At v46.1.0 the README said "Bazel 3.3.0 or higher" and "Java 8 JDK or higher". The JVM CLI was removed in v48.0.0 | [README @master](https://github.com/Tinder/bazel-diff/blob/master/README.md), [README @v46.1.0](https://github.com/Tinder/bazel-diff/blob/v46.1.0/README.md), [PR #498](https://github.com/Tinder/bazel-diff/pull/498) | 2026-09-14 |
| 11 | ci.md: "target-determinator v0.34.0 (2026-06-19; Bazel >=4.0.0)" | update-version-only | v0.34.0 | v0.34.1; README still says "supports Bazel 4.0.0 up to and including the latest LTS release" | [v0.34.1](https://github.com/bazel-contrib/target-determinator/releases/tag/v0.34.1) | 2026-11-19 |
| 12 | ci.md: aspect_rules_lint 2.9.0 | update-version-only | 2.9.0 | 2.9.1 (2026-09-18). Notes include "fix(buildifier): propagate tool runfiles (#991)" and "fix(clang_tidy_wrapper): treat a clang-tidy that cannot run as fatal (#1001)"; the second is a lint exit-behaviour change in a wrapper this pair does not pin | [v2.9.1](https://github.com/aspect-build/rules_lint/releases/tag/v2.9.1) | 2026-09-18 |
| 13 | ci.md: "bazelisk as released on 2026-09-06" | update-version-only | v1.29.0 | v1.31.0. v1.30.0 added config-file lookup in all parent directories and patched RC support; v1.31.0 added `NETRC` support and a `BAZELISK` env fix | [v1.30.0](https://github.com/bazelbuild/bazelisk/releases/tag/v1.30.0), [v1.31.0](https://github.com/bazelbuild/bazelisk/releases/tag/v1.31.0) | 2026-10-20, 2026-11-26 |
| 14 | BZL-CI-21: default mode blind to repository-rule/module-extension deps | changed in part; remainder could not determine | "default-mode hash byte-identical before and after" for a `use_repo_rule` repo whose implementation reads a file | Query mode now lowers every Bzlmod repository from `bazel mod show_repo`, including extension repos no module imports (v62.0.0), and the README documents that a change to any extension repository reaches the owner module's dependents. Whether the specific measured case (a repository-rule implementation reading a file not named by any attribute) is now caught was not re-measured. README still says a label a repository rule writes "without receiving it as a whole attribute value is not seen" | [PR #529](https://github.com/Tinder/bazel-diff/pull/529), [README](https://github.com/Tinder/bazel-diff/blob/master/README.md) | 2026-10-20 |
| 15 | BZL-CI-21 verification: `'//external:all-targets' + '//...:all-targets'` on the `Executing Query:` line means cquery is off | could not determine (probable partial change) | | `collect_all_targets` now skips `//external:all-targets` when `bazel info` shows no `//external` package (v70.0.2 "ask bazel info once per generation instead of version + info + //external probe"). On Bazel 9 the line may therefore lack the `//external` term in default mode too. Do not rely on its absence to mean "cquery on"; rely on `deps(//...:all-targets)` being present | [PR #606](https://github.com/Tinder/bazel-diff/pull/606), [src/bazel.rs](https://github.com/Tinder/bazel-diff/blob/master/src/bazel.rs) | 2026-11-02 |
| 16 | BZL-CI-23: `--excludeExternalTargets` Bzlmod auto-detection via `bazel mod graph` | changed (mechanism), unchanged (intent) | auto-detected "via `bazel mod graph`"; also on `generate-hashes` | `get-impacted-targets` still auto-detects when the flag is unset, but now reads `moduleGraphJson` from the final hash file and only asks Bazel when it is absent (v70.0.2). On `generate-hashes` the CLI default is the literal `false`; the `//external:all-targets` query is skipped by the `bazel info` probe, not by a `bazel mod graph` detection. The crash class (feeding `//external:` labels to `bazel build`) is unchanged. Flag semantics per subcommand unchanged | [PR #605](https://github.com/Tinder/bazel-diff/pull/605), [src/main.rs](https://github.com/Tinder/bazel-diff/blob/master/src/main.rs) | 2026-11-02 |
| 17 | BZL-CI-22: target-determinator cache invalidation (home/system bazelrc, env vars, host machine not in key) | unchanged | | README still lists the same excluded inputs and `--nocache_results`; v0.34.1 changed label normalisation only | [README](https://github.com/bazel-contrib/target-determinator/blob/main/README.md) | n/a |
| 18 | BZL-CI-13: BCR presubmit schema, `platform` list x `bazel` list | unchanged | | docs/README.md presubmit section still: "BCR requires the bazel version to be specified for each task via the `bazel` field", matrix example `platform` x `bazel`. The example's `bazel: [6.x, 7.x]` is illustrative only. Doc commits in the window (2026-10-05 to 2026-11-23) touch other sections | [BCR docs](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md#presubmit) | n/a |
| 19 | Open question: does bazel-diff PR #322 (mod show_repo) catch a module-extension tag change? | partly answered | | [PR #322](https://github.com/Tinder/bazel-diff/pull/322) merged 2026-03-31 (before the baseline). Since then: extension repos without a `use_repo` import get nodes (PR #529, 2026-10-20), `show_repo` attributes (which carry the evaluated tag values) are hashed, and the README states the owner module "stands in for every repository the extension generates", so a bump "impacts most of the workspace" ([issue #603](https://github.com/Tinder/bazel-diff/issues/603) reports exactly that for a `go.mod` bump, fixed opt-in by `--labelOnlyModuleExtensions`, [PR #608](https://github.com/Tinder/bazel-diff/pull/608), 2026-11-03). A tag edit that changes a generated repository's attributes is therefore caught in query mode. A tag edit that changes no generated repository attribute is, correctly, not an impact. Not measured by me | see links | 2026-10-20 to 2026-11-03 |

## 4. Findings

### 4.1 bazel-diff is a different program now (8 flag/behaviour changes that touch the rows)

1. Rust only. [PR #498](https://github.com/Tinder/bazel-diff/pull/498) (v48.0.0, 2026-09-14) removed the Kotlin CLI, WORKSPACE-mode files and the deploy jar. Run it with `bazel run @bazel-diff//:bazel-diff` or a prebuilt binary (`bazel-diff-rust-linux-amd64`, `-linux-arm64`, `-macos-arm64`, `-windows-amd64.exe`) attached to each release. The README says "Bazel needs a JDK; the `bazel-diff` binary does not."
2. Bazel floor is now 8. Row 10 must drop ">=6.2.0" and the ">=8.6.0 / >=9.0.1 for default-mode MODULE.bazel diffing" split; I did not find a statement of what, if anything, still differs between 8.x and 9.x for the MODULE diff, and the README only says that on Bazel 8 and later an alias metadata query runs, and that earlier versions skip it.
3. Release cadence is roughly daily. A pin written as a tag is stale within a week; the row must pin a tag and say "re-verify the flag surface at the pinned tag" (BZL-CI-26 already says this).
4. New flags and modes in the window: `--partialGraph` (v70.0.0 for `generate-hashes`; v69.0.0 for `serve`), `--labelOnlyModuleExtensions` (v68.0.0), `--isolatedDependencyRoot`, `--cqueryRootExpression`/`--cqueryRootExpressionFile` with `--verifyConfiguredRoots` (v76.0.0), `--reportImpactGraph`, `--toolchainCandidatesFile`, `--includeToolchainInputs`, `serve-multi` (v74.0.0), a GCS cache option (v70.0.0), `explain` (ported to Rust in v48.0.0). None changes an existing default.
5. Documented limits worth citing: `--partialGraph` is "Not supported together with `--useCquery`, `--alwaysAffectedTags`, `--contentHashPath`, `--modified-filepaths` or `--targetType`"; the toolchain candidates file "reports `complete: false` even when `unresolved` is empty ... Absence from this file cannot exclude a job." This is a new miss class stated by the maintainers: toolchain registration priority changes can swap the compiler while every observed target hash stays equal.
6. `--useCquery` fixes: main-repository aliases dropped under `--useCquery` (issue #612, fixed v73.0.0; a WORKSPACE-mode follow-up v75.0.0). Before v73.0.0, cquery mode could drop impacted aliases; the BZL-CI-21 statement "`--useCquery` also caught it" is true for the repository-rule class but cquery mode was not exhaustive for aliases.
7. Exit codes: I found no change to exit codes in the release notes or README for `generate-hashes` or `get-impacted-targets`. The rows state none for bazel-diff, so nothing to update.
8. Hash-format change: v61.0.0 migrated cache entries to the "TGB" format (PR #525) and PR #608 states "for users of the flag, the owner's node and everything depending on it hash differently once". A hash file generated by one major and compared with another can differ. The rows should say: generate both hash files with the same bazel-diff version.

### 4.2 buildifier and buildifier_prebuilt

- buildtools moved to `bazel-contrib/buildtools` (the v10.0.1 and later release URLs live there). The v10.0.1 notes include: "Updated to run properly under Bazel 9", "Add make-location lint for deprecated $(location) make variables", "Allow to disable multiple warnings on one line", "Add basic support for REPO.bazel and VENDOR.bazel files", "Fix: ignore comments in unreachable statement check". v10.1.0 adds `cast`/`isinstance` keywords and fixes `@unused` for the last argument; v10.2.0 adds SARIF and extends `make-location` to `.bzl` files ([PR #1526](https://github.com/bazel-contrib/buildtools/pull/1526)).
- `make-location` rationale from the warning's own doc: `$(location)` and `$(locations)` "are legacy synonyms for `$(execpath)` and `$(rootpath)` whose behavior depends on the attribute being expanded"; use `$(execpath ...)` or `$(rootpath ...)`. It is a default-set warning, so a `genrule`/`cmd` using `$(location ...)` now blocks the lint gate after a bump to 10.x. Verification: `grep -rn -E '\$\(locations?[ )]' --include=BUILD.bazel --include='*.bzl' .`.
- The two template fixes behind BZL-LARK-31 are intact in 10.2.0 (see row 2). I did not run the 10.2.0 runner against a planted violation; BZL-CORE-02 demands that for a fixture claim, so the "intact" statement is a source reading, not a watched-red test.
- `buildifier_prebuilt` 10.2.0 `MODULE.bazel`: `bazel_features 1.45.0`, `bazel_skylib 1.3.0`, `platforms 0.0.11`, `rules_shell 0.6.1`, dev dependency `rules_bazel_integration_test 0.36.0`. The consumer's resolved rules_shell must be at least 0.6.1; resolution (MVS) will lift it, so no conflict with the 0.8.0 or 0.10.0 pins.

### 4.3 Defaults, flags, exit codes and miss classes that a row states

- Default changed: buildifier default warning set (row 5).
- Default changed in mechanism only: bazel-diff `--excludeExternalTargets` auto-detection (row 16).
- Flag newly available: `--labelOnlyModuleExtensions`, `--partialGraph`, etc. (4.1).
- Exit code: none changed in what I read. buildifier's documented exit 4 (findings) path is unchanged by the 10.x template.
- Miss class changed: BZL-CI-21 (row 14), plus the new "toolchain registration priority" miss class (4.1 item 5).

## 5. Normative guidance candidates

1. Candidate: rewrite the buildifier pin sentence of BZL-LARK-31 as "pin `buildifier_prebuilt` at 8.5.1.3 or later (10.2.0 is current as of 2026-11-27)"; keep the verification greps. Rationale: the floor is unchanged, the "preferred" version is stale. Verification: `grep -n -e 'buildifier_prebuilt' -- MODULE.bazel`; version below 8.5.1.3 is the finding.
2. Candidate: add `make-location` to the default-set sentence's context, not as a sixth promoted row, unless the owner wants it: rationale, it is the only new default-on warning in the window and bites on a 8.x to 10.x bump. Verification: `bazel run //:buildifier.check; echo $?` after the bump, or the grep in 4.2. Decision for the starlark author: promote only if the five-row table has room; otherwise mention it in "Claims About Versions".
3. Candidate: update the count sentence to "98 categories exist, 97 are on by default, exactly one (`unsorted-dict-items`) is off" and drop any mention of `canonical-repository`/`external-path` (none exist in the pair today). Verification: count keys of `FileWarningMap` in `warn/warn.go` at the pinned buildtools tag.
4. Candidate: ci.md header: replace "bazel-diff v46.1.0 (2026-08-28; Bazel >=6.2.0 ...)" with "bazel-diff v81.0.0 (2026-11-25; Bazel >=8 per its README; Rust binary, no JDK)". Rationale: the prerequisites changed. Verification: `bazel-diff --version` equals the pinned tag in the wrapper; `grep -n 'bazel-diff' -- CI_WRAPPER`.
5. Candidate: BZL-CI-21 keep as MUST but soften the first clause to say default mode used to be blind to repository-rule and extension-implementation reads and that as of v62.0.0 extension-generated repositories are hashed from `bazel mod show_repo`; the unmitigated class that remains is a repository-rule implementation reading a file no attribute names. Add: re-measure on the pinned tag before dropping the `--useCquery` recommendation. Verification unchanged (read the wrapper for `--useCquery` or `--fineGrainedHashExternalRepos`).
6. Candidate: BZL-CI-21 verification text, replace the sentence about `'//external:all-targets' + '//...:all-targets'` with: "`deps(//...:all-targets)` on the `Executing Query:` line means cquery mode is on; the absence of the `//external:all-targets` term proves nothing, because v70.0.2 skips it when `bazel info` shows no `//external` package." Verification: run the wrapper with `-v`/`--verbose` and read the line.
7. Candidate: BZL-CI-23 text, replace "auto-detected via `bazel mod graph`" with "auto-detected on `get-impacted-targets` from the module graph recorded in the final hash file (falling back to asking Bazel); `generate-hashes` defaults to `false` and skips the `//external` query on its own". Verification: `grep -n 'excludeExternalTargets' -- CI_WRAPPER` as before.
8. Candidate (new, SHOULD): "Generate the starting and final hash files with the same bazel-diff version, and keep the version in the cache key." Rationale: PR #608 and the TGB migration show hash shifts between releases. Verification: grep the wrapper for the version pin used by both steps; two different pins or an unpinned `latest` is the finding.
9. Candidate (new, CONSIDER): add the toolchain-reader limit to BZL-CI-21's rationale: a toolchain registration priority change can switch the compiler with all target hashes equal, so `--toolchainCandidatesFile` output is advisory (`complete: false`). Verification: reading heuristic: a wrapper that uses the file to exclude a job is the finding.
10. Candidate: update-version-only pins: skylib 1.9.2, rules_shell 0.10.0, rules_cc 0.2.28, target-determinator v0.34.1, aspect_rules_lint 2.9.1, bazelisk v1.31.0; leave rules_bazel_integration_test v0.37.1 as is. Verification: `grep -n -e 'bazel_dep' -- MODULE.bazel` against the table in section 2. These version bumps were not exercised against a Bazel binary here; the starlark.md and testing.md header sentence "measured 2026-09-06 against Bazel 8.7.0, 8.8.0 and 9.2.0" must keep its date, because the new pins were not re-measured.

## 6. AI-agent angle

- An agent trained before 2026 will write `bazel-diff` as a JAR (`java -jar bazel-diff.jar`) with `Bazel 3.3.0+`; check: `grep -rn -e 'bazel-diff.*\.jar' -e 'java -jar' -- CI_WRAPPER`. The Kotlin build no longer exists.
- It will pin `buildifier_prebuilt` at 8.x and assume `canonical-repository`/`external-path` warnings exist; check: `grep -rn -e 'canonical-repository' -e 'external-path' -- BUILD.bazel .buildifier.json` (a `buildifier: disable=` of a removed category is a dead suppression).
- It will keep writing `$(location ...)` in genrules; with 10.x that is now a default-set finding.
- It may say "no change" for the whole window because 8.5.1.4 "is latest". Check the version in this file's section 2 against `gh api repos/keith/buildifier-prebuilt/releases/latest --jq .tag_name`.

## 7. Contested / evolving

- bazel-diff's major number moves almost daily; any "latest" in a row is dated the day it was written. Trend: more opt-in precision flags (`--labelOnlyModuleExtensions`, `--isolatedDependencyRoot`, configured roots) each carrying an assertion the user must keep true.
- Is default query mode now sufficient for extension-driven dependencies? The maintainers' own README documents residual gaps (labels written without being an attribute value; toolchain priority; unrepresented path copies), so "blind" is too strong but "closed" is unproven. Re-measure when the owner asks for a measured claim.
- buildtools' move to `bazel-contrib` and the 8 to 10 major jump: the version number no longer maps to Bazel generations; do not infer Bazel compatibility from it.

## 8. Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/keith/buildifier-prebuilt/releases | buildifier_prebuilt release list and notes (10.0.1, 10.1.0, 10.2.0, 8.5.1.4) | 2026-08-26 to 2026-11-16 | newest pin, exclude_patterns and SARIF changes |
| https://github.com/keith/buildifier-prebuilt/blob/10.2.0/runner.bash.template | runner template at 10.2.0 | 2026-11-16 | confirms BZL-LARK-31 fixes intact |
| https://github.com/keith/buildifier-prebuilt/blob/10.2.0/MODULE.bazel | module file at 10.2.0 | 2026-11-16 | dependency floors |
| https://github.com/bazel-contrib/buildtools/releases/tag/v10.0.1 | buildtools 10.0.1 notes | 2026-09-15 | make-location, Bazel 9 fixes |
| https://github.com/bazel-contrib/buildtools/releases/tag/v10.1.0 | buildtools 10.1.0 notes | 2026-09-22 | keyword and @unused fixes |
| https://github.com/bazel-contrib/buildtools/releases/tag/v10.2.0 | buildtools 10.2.0 notes | 2026-10-28 | SARIF, make-location for .bzl |
| https://github.com/bazel-contrib/buildtools/blob/v10.2.0/warn/warn.go | warning registry at 10.2.0 | 2026-10-28 | default-set count |
| https://github.com/bazelbuild/buildtools/blob/v8.5.1/warn/warn.go | warning registry at 8.5.1 | 2026-01-30 | baseline count |
| https://github.com/bazelbuild/bazel-skylib/releases/tag/1.9.2 | skylib 1.9.2 | 2026-07-17 | newest skylib |
| https://github.com/bazel-contrib/rules_shell/releases/tag/v0.10.0 | rules_shell 0.10.0 notes | 2026-11-16 | newest, Bazel 9/10 tested |
| https://github.com/bazelbuild/rules_cc/releases/tag/0.2.28 | rules_cc 0.2.28 notes | 2026-11-05 | newest, load path check |
| https://github.com/bazel-contrib/rules_bazel_integration_test | repository, releases, MODULE.bazel | v0.37.1, 2026-01-31 | no newer release; no bazel_compatibility |
| https://github.com/Tinder/bazel-diff/releases | 35 releases in window | 2026-08-28 to 2026-11-25 | tags and dates |
| https://github.com/Tinder/bazel-diff/blob/master/README.md | README at master | 2026-11-25 | prerequisites, flags, extension behaviour |
| https://github.com/Tinder/bazel-diff/blob/v46.1.0/README.md | README at baseline | 2026-08-28 | old prerequisites and help text |
| https://github.com/Tinder/bazel-diff/pull/498 | Kotlin removal | 2026-09-14 | what changed in the program |
| https://github.com/Tinder/bazel-diff/pull/529 | extension repos without import hashed | 2026-10-20 | extension question |
| https://github.com/Tinder/bazel-diff/pull/605 | Bzlmod detection from hash file | 2026-11-02 | BZL-CI-23 mechanism |
| https://github.com/Tinder/bazel-diff/pull/608 and https://github.com/Tinder/bazel-diff/issues/603 | label-only extension owner fix, reported over-impact | 2026-11-03 | owner stand-in semantics |
| https://github.com/Tinder/bazel-diff/blob/master/src/main.rs | CLI definition | 2026-11-25 | flag defaults |
| https://github.com/bazel-contrib/target-determinator/releases/tag/v0.34.1 and README | release and README | 2026-11-19 | cache key and Bazel support |
| https://github.com/aspect-build/rules_lint/releases/tag/v2.9.1 | rules_lint 2.9.1 notes | 2026-09-18 | newest pin |
| https://github.com/bazelbuild/bazelisk/releases/tag/v1.30.0 and v1.31.0 | bazelisk notes | 2026-10-20, 2026-11-26 | newest pin |
| https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md | BCR presubmit docs | read 2026-11-27 | BZL-CI-13 schema |

Retrieval note: release metadata was read through the GitHub API with `gh`; the web fetch of the BCR docs page returned HTTP 503, so the BCR file was read through the contents API instead. No source was unreachable.
