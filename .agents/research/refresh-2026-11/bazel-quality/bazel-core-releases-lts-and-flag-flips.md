---
title: Bazel core releases, LTS table and incompatible-flag flips (delta)
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 16
---

# Bazel core releases, LTS table and flag flips, 2026-09-06 to 2026-11-27

This is a delta update of the bazel-quality pair. Claims upstream did not change stay as written. Every fact below was read on 2026-11-27 from a primary source: GitHub release bodies and tagged source in bazelbuild/bazel (via `gh api` and raw.githubusercontent.com), https://bazel.build/release, https://bazel.build/release/rolling, bazelbuild/bazel-central-registry commit history, and bazelbuild/bazelisk. No `bazel` binary exists on this machine, so `bazel help <command> --long` was NOT run on any new release; every default below was read from tagged source instead, and is labelled "source-read". Items that need a binary run are marked "needs re-measurement".

## Verdict (read this first)

1. New newest patches: 9.3.3 (2026-11-19), 8.9.0 (2026-11-19), 7.7.3 (2026-11-19). 8.8.0 is no longer the newest 8.x and 9.2.0 is no longer the newest 9.x. Bazel 10.0.0 has NOT shipped; the newest tag is 10.0.0rc4 (2026-11-19) and `releases/tags/10.0.0` returns 404. No measured default named in the pair changed on any new 8.x or 9.x release (details in the claim table). One behaviour did change on 9.3.0: `--rewind_lost_inputs` is now on by default.
2. The LTS table moved only in its "Latest version" column and one new row. Support-Ends dates are unchanged (9 Dec 2028, 8 Dec 2027, 7 Dec 2026). Bazel 7 is still Maintenance, now at 7.7.3, and has had two patch releases in the window. A new row "Bazel 10 | Rolling" exists.
3. A Bazel 10 flip list exists, in the 10.0.0rc1 to rc3 release notes (identical lists): six flags flipped in 10.0, and fourteen named as flipping in a future major. BZL-FLAG-15 can now name it, with the caveat that 10.0.0 is not final.
4. The lockfile schema did not move: `LOCK_FILE_VERSION = 28` on 8.8.0, 8.8.2, 8.9.0, 9.2.0, 9.3.0, 9.3.3 and 10.0.0rc4. It is 24 only on 8.7.0.
5. No claim in the pair is wrong. Four claims need a wording or scope update (version lists and the "flipped" list), listed under "Normative candidates".

## Releases in the window

Source: `gh api repos/bazelbuild/bazel/releases` (https://github.com/bazelbuild/bazel/releases).

| Series | New tags (final only) | Date |
|---|---|---|
| 9.x | 9.3.0 | 2026-10-07 |
| 9.x | 9.3.1 | 2026-10-21 |
| 9.x | 9.3.2 | 2026-11-05 |
| 9.x | 9.3.3 | 2026-11-19 |
| 8.x | 8.8.1 | 2026-09-24 |
| 8.x | 8.8.2 | 2026-10-21 |
| 8.x | 8.9.0 | 2026-11-19 |
| 7.x | 7.7.2 | 2026-10-23 |
| 7.x | 7.7.3 | 2026-11-19 |
| 10.x | 10.0.0rc1 (2026-10-07), rc2 (10-22), rc3 (11-10), rc4 (11-19); no final | |

What each release changed that touches the pair:

- 9.3.0 (https://github.com/bazelbuild/bazel/releases/tag/9.3.0): minor LTS, "fully backward compatible with Bazel 9 releases starting from 9.0.1". `--rewind_lost_inputs` is now enabled by default (PR 31416). Test targets can now be built for a target platform with no compatible execution platform, and fail at run time instead of analysis (PR 30946). `repository_ctx.patch(directory)` and `Label.repo_root` added. Fix for the `--lockfile_mode=error` crash (bazel#29497) shipped via backport PR 30512 titled "[9.3.0] Avoid fetching yanked metadata in error mode" (https://github.com/bazelbuild/bazel/pull/30512). This confirms the pair's "fixed only from 9.3.0".
- 9.3.1 / 9.3.2 / 9.3.3: patch releases. 9.3.1 rewinds an action whose output was lost before download; 9.3.2 reverts the 9.3.0 change that invalidated cached action results when remote endpoints change (it caused over-invalidation with rewinding on); 9.3.3 and 8.9.0 and 7.7.3 update the bundled JDK for CVE-2026-114938. 9.3.1, 8.8.2 and 7.7.2 remove distrusted eMudhra and Sectigo roots from the bundled JDK.
- 8.8.1: fixes slow source-directory digests for remote execution. 8.8.2: certificate removal only.
- 8.9.0 (https://github.com/bazelbuild/bazel/releases/tag/8.9.0): minor LTS, backward compatible with 8.0. Adds `repository_ctx.patch(directory)`, `--experimental_remote_cache_chunking_function`, `--experimental_max_repeated_lost_inputs`; Windows tests no longer need Bash unless coverage is collected. No default flip.
- 7.7.2 / 7.7.3: JDK and certificate patches only.

## LTS table (https://bazel.build/release, read 2026-11-27)

| LTS | Stage | Latest | Support ends |
|---|---|---|---|
| Bazel 10 | Rolling | see rolling page | n/a |
| Bazel 9 | Active | 9.3.3 | Dec 2028 |
| Bazel 8 | Maintenance | 8.9.0 | Dec 2027 |
| Bazel 7 | Maintenance | 7.7.3 | Dec 2026 |
| Bazel 6 | Deprecated | 6.6.0 | Dec 2025 |

The page states "Rolling releases can ship incompatible changes". Bazel 7 support still ends Dec 2026, which is after the window; it has not yet become Deprecated. The rolling page (https://bazel.build/release/rolling) gives no current version and defers to https://releases.bazel.build/rolling.html (not read).

## Bazel 10 flip list (source: 10.0.0rc1, rc2, rc3 release bodies, section "Migration-Ready Incompatible Flags")

The list is identical in rc1, rc2 and rc3. The rc4 body uses a flat "Release Notes" format and drops the section, so the list is last confirmed at rc3 (2026-11-10). Flipped in 10.0 (test with `bazelisk --migrate` on Bazel 9):

- `--experimental_fetch_all_coverage_outputs`
- `--experimental_split_coverage_postprocessing`
- `--incompatible_check_testonly_for_output_files` (rc4 body: "has been flipped")
- `--incompatible_exclude_starlark_flags_from_exec_config`
- `--incompatible_no_implicit_file_export`
- `--rewind_lost_inputs` (already default-on since 9.3.0)

Named for a future major (not 10.0): `--incompatible_check_external_repo_source_dir_package_boundary`, `--incompatible_config_setting_private_default_visibility`, `--incompatible_disable_starlark_host_transitions`, `--incompatible_eagerly_resolve_select_keys`, `--incompatible_fail_on_unknown_output_groups`, `--incompatible_package_group_build_output`, `--incompatible_prefer_depending_configuration_runfiles`, `--incompatible_remove_ctx_android_fragment`, `--incompatible_remove_ctx_apple_fragment`, `--incompatible_remove_ctx_objc_fragment`, `--incompatible_require_matching_aspect_hints_providers`, `--incompatible_require_mnemonic_for_run_actions`, `--incompatible_require_repo_extension_metadata`, `--incompatible_symbolic_macro_strict_attrs`.

Other 10.0 removals relevant to BZL-FLAG-31 and BZL-FLAG-15 step 7 (rc1 and rc4 notes): `new_git_repository` removed; `remote_execution_properties` platform attribute removed; `@bazel_tools//src/conditions:{host_windows,remote}` removed; `--use_target_platform_for_tests`, `--experimental_sibling_repository_layout` and `--incompatible_modify_execution_info_additive` made no-ops; the rc1 "now no-ops" list also includes `--incompatible_use_new_cgroup_implementation` (source-read: BazelRulesModule.java at 10.0.0rc4 marks it "Deprecated no-op"); `bazel_dep()` on the current module and root `use_repo()` of a self-overridden repo become errors; `bazel mod tidy` now evaluates every extension; `/usr/local/bin` dropped from default PATH.

## BCR and bazelisk

- `incompatible_flags.yml` in bazel-central-registry: last commit is still 2025-07-25 (commit 3b02f265, "Fix typo for incompatible flags"); no commit in the window (https://github.com/bazelbuild/bazel-central-registry/commits/main/incompatible_flags.yml). The file still lists only 6.x/7.x/8.x/last_green/rolling channel entries, none for 9.x or 10. BZL-FLAG-07's staleness claim is unchanged and now one year old.
- bazelisk: v1.30.0 (2026-10-20) and v1.31.0 (2026-11-26) are new. README on master still says "`last_downstream_green` support has been removed, please use `last_green` instead". BZL-CI-09 unchanged. The new bazelisk release notes were not read, so whether v1.30/v1.31 changed `--migrate` or flag handling is "could not determine".

## Claim-by-claim

| Claim | Verdict | Evidence |
|---|---|---|
| Intro: "measured on 8.7.0, 8.8.0 and 9.2.0 (2026-09-06)" | unchanged as a historical statement; now incomplete as a currency statement | Newest are 9.3.3 and 8.9.0. Needs re-measurement only for the defaults below, which source-read shows unchanged. |
| Intro: four behaviours "flip at 9.0.0" | unchanged | 9.3.x and 8.9.0 notes contain no change to the 8-to-9 boundary. |
| flags.md header "9 Active (9.2.0, ends Dec 2028), 8 Maintenance (8.8.0, ends Dec 2027), 7 Maintenance (7.7.1, ends Dec 2026), 6 Deprecated" | changed | Old: 9.2.0, 8.8.0, 7.7.1. New: 9.3.3, 8.9.0, 7.7.3. Dates and stages unchanged. Source https://bazel.build/release, 2026-11-19 (releases) . Add a Bazel 10 Rolling row. |
| BZL-FLAG-04 | unchanged | Still correct: page shows the same stage logic; "ages within one minor release" is demonstrated by this very window. |
| BZL-FLAG-05 "For Bazel 8 that is through Dec 2027" | unchanged | Table row for Bazel 8 still reads Dec 2027. |
| BZL-FLAG-07 | unchanged | See BCR above. |
| BZL-FLAG-15 "flipped in X.0" list for the next major | changed (additive) | A list now exists for 10.0 (above). The row's step 10 ("re-read the flag list from that major's own release notes") is vindicated: rc4 dropped the section. Row text also says "lockFileVersion 24 on" 8.7.0; still true. |
| BZL-FLAG-31 commands and enum values removed at a major | unchanged for 8 to 9; extend for 10 | 10.0 removals listed above. No 10.0 deleted command was identified in the rc4 body; not exhaustively checked. |
| BZL-FLAG-32 `--enforce_project_configs` | unchanged | Source-read BuildRequestOptions.java `defaultValue = "true"` at 8.9.0, 9.2.0, 9.3.3 and 10.0.0rc4. PROJECT.scl not documented in any new release note (grep of 9.3.x, 8.9.0, 10.0.0rc4 bodies). |
| BZL-FLAG-35 `--incompatible_use_new_cgroup_implementation` | unchanged on 9.x; changed on 10 | Source-read SandboxOptions.java: default true at 9.2.0 and 9.3.3, false at 8.9.0. On 10.0.0rc4 the flag is a "Deprecated no-op". The row's "on Bazel 9" scope stays true. |
| bzlmod: lockFileVersion 24 on 8.7.0, 28 on 8.8.0 and 9.2.0 | unchanged | `LOCK_FILE_VERSION` read at 8.7.0 (24) and 8.8.0, 8.8.2, 8.9.0, 9.2.0, 9.3.0, 9.3.3, 10.0.0rc4 (all 28). Source: BazelLockFileValue.java on each tag. |
| bzlmod: "fixed only from 9.3.0" (bazel#29497) | unchanged, now confirmed shipped | 9.3.0 is released; backport PR 30512 titled for 9.3.0. Not re-run with a binary. |
| BZL-MOD-33 `--repo_contents_cache` default | unchanged by source; needs re-measurement for completeness | Source-read RepositoryOptions.java: default `null` (derived) at 9.2.0, 9.3.3, 10.0.0rc4; `""` at 8.9.0, so off by default on 8.x. Line 213 of bzlmod.md can add "9.3.3 and 8.9.0 by source read". The 10.0 notes add that the remote repo contents cache supports all reproducible rules; 8.9.0 notes fix a restart bug in the remote contents-cache lookup. Neither changes the in-tree hard failure; not run. |
| BZL-MOD-09 compatibility_level "resolver-only (8.6.0 and 9.1.0)" | unchanged for 8 and 9; will be wrong for 10 | 10.0.0rc1 and rc4 notes: "`compatibility_level` and `max_compatibility_level` ... are now no-ops". The row's claim that BCR `bcr_validation.py` still diffs the field was not re-checked against the registry in this window: could not determine. |
| BZL-MOD-16 `repo_metadata(reproducible = True)` | unchanged | No change in 9.3.x, 8.9.0 or 10.0.0rc4 notes to the local-cache gate. 10.0 notes widen the remote cache to "all reproducible repo rules", which affects the row's sentence that `getenv()` and `watch()` disqualify a rule from the remote cache: could not determine whether that sentence still holds on 10. |
| testing.md BZL-TEST-28 implicit `test` exec group | unchanged | `tools/test/BUILD.tools` at 9.2.0, 9.3.3 and 10.0.0rc4 all define `incompatible_use_default_test_toolchain` with `build_setting_default = True`. 9.3.0 adds that tests for a platform with no compatible execution platform now fail at run time, not at analysis (PR 30946); 10.0 makes `--use_target_platform_for_tests` a no-op. Row text should be re-read for the first (it softens the failure mode). |
| ci.md BZL-CI-08 Active LTS leg | unchanged in rule; version examples need updating | Active LTS is now 9.3.3. A rolling or Bazel 10 RC leg is the "advisory channel" the row already allows. |
| ci.md BZL-CI-09 bazelisk chain | unchanged | bazelisk README on master still removes `last_downstream_green`. |

## Normative candidates

1. flags.md header and any citation of "7.7.1", "8.8.0", "9.2.0" as newest: update to 7.7.3, 8.9.0, 9.3.3 and add the Bazel 10 Rolling row. Rationale: the table's "Latest" column moved on 2026-11-19. Verification: fetch https://bazel.build/release and diff the pinned majors' rows (BZL-FLAG-04's own check); `grep -n -E '7\.7\.1|8\.8\.0|9\.2\.0' skills/bazel-quality-reference/flags.md`.
2. BZL-FLAG-15: add that Bazel 10.0 is not released (10.0.0rc4, 2026-11-19), and name the six-flag flip list with its rc3 provenance, stating that it must be re-read from the 10.0.0 final notes. Rationale: step 2 needs an exact list and the rc4 body no longer carries one. Verification: `gh api repos/bazelbuild/bazel/releases/tags/10.0.0 --jq .body | sed -n '/flipped in 10/,/future major/p'`; a 404 means the list stays provisional.
3. BZL-FLAG-35 and BZL-FLAG-31: scope the cgroup flag to "Bazel 9" explicitly and add one clause that it is a deprecated no-op from 10.0. Rationale: the rc1 no-op list names it. Verification: `gh api repos/bazelbuild/bazel/contents/src/main/java/com/google/devtools/build/lib/bazel/rules/BazelRulesModule.java?ref=10.0.0rc4 --jq .content | base64 -d | grep -B2 -A6 incompatible_use_new_cgroup_implementation`.
4. BZL-MOD-09: add "and a documented no-op in the 10.0 release notes". Rationale: one more version now documents it. Verification: `grep -n "compatibility_level" ` in the 10.0.0rc4 body.
5. New fact worth one row or a clause in an existing caching row: `--rewind_lost_inputs` is default-on from 9.3.0, and 9.3.2 reverted a related invalidation; Build-without-the-Bytes users on 9.3.0 or later recover from remote cache eviction by rewinding. Rationale: bears on BZL-CACHE-12 and BZL-CACHE-26 claims about cache-outage behaviour that were "measured on 8.7.0 and 9.2.0"; those claims were not re-measured on 9.3.x. Verification: `bazel help build --long | grep -A4 rewind_lost_inputs` on 9.3.3 prints the default (needs re-measurement; not run here).

## Needs re-measurement (no binary was available)

- `bazel help build --long` and `bazel help startup_options` on 9.3.3 and 8.9.0 for the repo-contents-cache default, `--enforce_project_configs`, the cgroup flag and `--rewind_lost_inputs`. Source-read says unchanged except `--rewind_lost_inputs`, but the pair's convention is measured-by-run.
- BZL-CACHE-12 and BZL-CACHE-26 (exit code 39 and cache-outage behaviour) on 9.3.x, because action rewinding became default-on.
- Rolling release numbers (https://releases.bazel.build/rolling.html) were not read.
- bazelisk v1.30.0 and v1.31.0 release notes were not read.
