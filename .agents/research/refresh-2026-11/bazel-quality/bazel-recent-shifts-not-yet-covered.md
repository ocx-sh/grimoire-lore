---
title: Bazel ecosystem shifts not yet covered by the bazel-quality pair
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 14
---

# Bazel ecosystem shifts not yet covered by the bazel-quality pair

Scope: shifts between 2026-09-06 and 2026-11-27 that change what an agent writes or rejects in BUILD, .bzl, MODULE.bazel, MODULE.bazel.lock, .bazelrc or .bazelversion, and that the pair does not mention. This is a delta update. Per-flag core release notes, named ruleset version bumps and buildifier or target-selection tool releases belong to other briefs and are only touched here where a candidate rule depends on them.

Method caveat: the pages were read through a summarising fetch tool, not a raw download. The Bazel 10.0.0rc4 notes were read in full through that tool. The 10.0.0rc3 and 9.3.0 pages were summarised in part. Every item below names the page it came from.

## Summary

- The pair never mentions Bazel 10. The 10.0.0 line is at release candidate 4 (2026-11-19). This is the largest gap. It warrants a migration checklist in the style of the existing 8-to-9 one.
- Bazel 10 removes or changes things an agent writes by habit: `new_git_repository`, `remote_execution_properties`, `host_windows` and `remote` config_settings, `symlink_files`, `/usr/local/bin` on the default PATH, and `bazel_dep()` on the current module.
- `--rewind_lost_inputs` is default-on since 9.3.0 and 10.0. This changes how a build-without-the-bytes cache eviction should be read in caching.md.
- Credential helper failures now abort HTTP downloads instead of continuing unauthenticated (10.0.0rc4). This touches BZL-CACHE-03 and BZL-CACHE-04 wording.
- Supply-chain events in the window: the eMudhra CA compromise (fixes 7.7.2, 8.8.2, 9.3.1, 10.0.0rc2) and the JDK CVE-2026-114938 (fixes 7.7.3, 8.9.0, 9.3.3, 10.0.0rc4 era). Both are a `.bazelversion` floor question.
- The BCR now rejects binary files in module PRs (2026-11-23). This matters to any repo that publishes a module.
- No GitHub security advisory was published for bazelbuild/bazel in the window. The only listed advisory is from 2022.
- Starlark static types were planned for 10.0 (Bazel 9 blog, January 2026) and had BazelCon talks. The rc4 notes list no type-annotation feature. Status: could not determine.
- Nothing found for: PROJECT.scl documentation, BCR attestation or yanking policy, a successor to crate_universe, rules_js, rules_python or a named cache server, or an archived ruleset in the window.

## Findings

### 1. Bazel 10.0.0 release candidates exist and the pair is silent

Old text: rules/bazel-quality.md lines 39-43 say four behaviours flip at 9.0.0 and every rule was measured on 8.7.0, 8.8.0 and 9.2.0. There is no Bazel 10 text and no 9.3, 8.9 or 10 mention anywhere in the pair (grep for "bazel 10" and "10.0" returned only unrelated hits).

New fact: releases page lists 10.0.0rc3 (2026-11-10) and 10.0.0rc4 (2026-11-19), 9.3.0 (2026-10-07, minor LTS), 9.3.3 and 8.9.0 and 7.7.3 (all 2026-11-19). Status: changed. Sources: [Bazel releases](https://github.com/bazelbuild/bazel/releases), [10.0.0rc4](https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4), [9.3.0](https://github.com/bazelbuild/bazel/releases/tag/9.3.0). Date of upstream change: 2026-10-07 to 2026-11-19. 10.0.0 final was not yet released at the date of research.

### 2. Bazel 10 breaking changes that touch files an agent writes (10.0.0rc4 notes)

All from [10.0.0rc4 release notes](https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4), 2026-11-19. Status: changed (none present in the pair).

| Area | Change | Files affected |
|---|---|---|
| Bzlmod | `bazel_dep()` on the current module is rejected | MODULE.bazel |
| Bzlmod | Root module cannot `use_repo()` a repo it overrides with itself via `override_repo()` or `inject_repo()` | MODULE.bazel |
| Bzlmod | `bazel mod tidy` evaluates every extension in the graph, including those used only by dependencies; `bazel vendor` may need more; new `bazel vendor --lockfile_deps` | MODULE.bazel.lock, vendor/ |
| Bzlmod | Patch and overlay integrity strings in `source.json` must be non-empty | BCR submissions |
| Bzlmod | `compatibility_level` and `max_compatibility_level` become no-ops | MODULE.bazel |
| Bzlmod | New `module_extension(facts_version=)`, `--inject_module`, `--watch_registry`, `use_repo()` `{name}` and `{version}` placeholders | MODULE.bazel, .bzl |
| Repo rules | `new_git_repository` removed (use `git_repository`); `http_archive` and `archive_override` `files` are copied, `symlink_files` removed | MODULE.bazel, .bzl |
| Platforms | `remote_execution_properties` removed (use `exec_properties`); `host_windows` and `remote` config_settings removed | BUILD, .bzl |
| Environment | `/usr/local/bin` dropped from default PATH; `LC_CTYPE` defaults to `C.UTF-8` when `use_default_shell_env = True` | .bazelrc, rules |
| .bazelrc | Startup options accept `startup:linux` style config; import depth capped at 512; `--test_tmpdir=` semantics changed; `--use_target_platform_for_tests` no-op; `--experimental_override_platform_cpu_name` renamed `--override_platform_cpu_name` | .bazelrc |
| Starlark | `Label.workspace_root` deprecated for `Label.repo_root`; custom rules named `test_suite` no longer special; `string.splitlines()` drops U+0085; `fail()` message prefix is `Error:` | .bzl |
| Flags flipped in 10 (rc3) | `--incompatible_no_implicit_file_export`, `--incompatible_check_testonly_for_output_files`, `--incompatible_exclude_starlark_flags_from_exec_config`, `--rewind_lost_inputs` and two coverage flags | BUILD, .bazelrc |
| Flags queued for a later major | about 14, including `--incompatible_symbolic_macro_strict_attrs` and `--incompatible_eagerly_resolve_select_keys` | .bzl, BUILD |

The `--incompatible_no_implicit_file_export` and `--incompatible_symbolic_macro_strict_attrs` items come from the 10.0.0rc3 summary on the releases page and were not re-read on a tag page. Treat the exact flag list as rc-stage: it can change before 10.0.0.

### 3. Remote cache and credential behaviour (10.0.0rc4, 9.3.0)

- `--rewind_lost_inputs` default-on: builds with build-without-the-bytes recover from cache eviction automatically (9.3.0, 2026-10-07; restated in rc4). Old pair text treating an eviction failure as a hard build failure needs a version qualifier. Verify against caching.md before editing; the pair was not re-read line by line for this.
- Credential helper failures abort HTTP downloads rather than continuing unauthenticated; `null` values in helper responses count as unset (rc4).
- Remote and auth flags (`--remote_cache=`, `--remote_executor=`, `--google_credentials=`, `--tls_*`) can be reset to unset with an empty value (rc4). This changes how a personal rc can neutralise a tracked rc.
- Disk cache GC flags (`--disk_cache_gc_*`, `--action_cache_gc_*`, `--install_base_gc_max_age`) are no longer experimental; bare `--disk_cache` uses `<outputUserRoot>/cache/disk`; Bazel no longer verifies disk cache digests on hit (rc4).
- Repo contents cache keys include host OS and CPU (rc4).
- Bazelisk 1.31.0 (2026-11-26) honours the `NETRC` environment variable. Source: [bazelisk releases](https://github.com/bazelbuild/bazelisk/releases). Relevance to BZL-CACHE-04 is slight: a netrc is a credential file that must stay out of the repository.

Status: changed, for all of the above.

### 4. Security events

- eMudhra CA compromise: Bazel 7.7.2, 8.8.2, 9.3.1 and 10.0.0rc2 remove the distrusted eMudhra and Sectigo AAA roots from the bundled JDK. Workaround for older versions: `--host_jvm_args=-Djavax.net.ssl.trustStore=<path>`. Source: [Bazel blog, 2026-10-23](https://blog.bazel.build/2026/10/23/emudhra-ca-compromise.html). The post does not say which versions are affected beyond "unsupported older releases get no fix".
- JDK CVE-2026-114938 (GHSA-6g7j-4xh3-xq2q): high severity, CVSS 8.1, heap overflow in the Oracle Java compiler component. Fixed in the embedded JDK of Bazel 9.3.3, 8.9.0, 7.7.3 (all 2026-11-19). Sources: [9.3.3 release](https://github.com/bazelbuild/bazel/releases/tag/9.3.3), [advisory](https://github.com/advisories/GHSA-6g7j-4xh3-xq2q). The advisory lists affected JDK versions, not Bazel versions, and gives no patched versions. The mapping to Bazel releases comes only from the release page.
- Bazelisk 1.30.0 (2026-10-20) was rebuilt on Go 1.27.3 for CVE-2026-111943. Source: [bazelisk releases](https://github.com/bazelbuild/bazelisk/releases). The CVE details were not fetched.
- GitHub security advisories page for bazelbuild/bazel: only GHSA-mxr8-q875-rhwq (2022) is listed. Nothing in the window. The bazel-contrib organisation advisory page returned 404, so that category could not be determined.
- Cache poisoning or credential helper advisories for BZL-CACHE-01 to 04: none found. Status: unchanged.

### 5. BCR policy

- 2026-11-23: [BCR PR 11940](https://github.com/bazelbuild/bazel-central-registry/pull/11940) adds `verify_no_binary_files` to `tools/bcr_validation.py`, rejecting accidental or uninspected binary files in BCR pull requests. The exact detection rules were not stated on the page.
- Docs commits in the window ([docs history](https://github.com/bazelbuild/bazel-central-registry/commits/main/docs)): 2026-10-05 documents the BCR Downstream Test; 2026-10-20 stops comparing MODULE.bazel with the sources. Titles only, bodies not read.
- Attestation, provenance, yanking: nothing in the docs commits. Status: unchanged, as far as titles show.

### 6. Starlark typing, PROJECT.scl, symbolic macros

- The Bazel 9 post ([2026-01-20](https://blog.bazel.build/2026/01/20/bazel-9.html)) says a Starlark typing system is planned for 10.0 and removes `--incompatible_autoload_externally` in 10.0. The rc4 notes list no type annotation syntax. Could not determine whether typing ships in 10.0.0.
- BazelCon 2026 had talks "Static types in Starlark" and "Type-checking Starlark without waiting for Bazel" (listed on the [recap](https://blog.bazel.build/2026/11/10/bazel-q4-2026-bazelcon-recap.html)). Talk contents were not fetched.
- Symbolic macros: `--incompatible_symbolic_macro_strict_attrs` fails on invalid attribute values under rc4 and is queued for a later major. See candidate 6.
- PROJECT.scl: not mentioned in any fetched source. Nothing found.

### 7. Rulesets and tools

- Nothing found that displaces crate_universe, rules_js, rules_python or a named cache server. BazelCon 2026 had training days for rules_js/ts and rules_py and a talk on rules_rs, all already named in the pair; nothing in the recap says a pinned tool was replaced. The Gazelle talks ("Gazelle v2", "Extend Gazelle in Starlark, not Go") and "Build File Generation Using AXL" are signals only; no release was fetched. Source: [recap](https://blog.bazel.build/2026/11/10/bazel-q4-2026-bazelcon-recap.html).
- No ruleset archival or deprecation found in the window. A web search found only older deprecations (rules_proto, built-in pkg rules).
- The BUILD Foundation was launched, with supply-chain security among its priorities (keynote, per the recap). No rule consequence yet.

## Normative guidance candidates

1. New rule (new file section, ARCH or MOD family, proposed as a Bazel 10 migration checklist next to the 8-to-9 one). Statement: "Before moving `.bazelversion` to 10.x, grep for and replace `new_git_repository`, `remote_execution_properties`, `host_windows`, `remote` config_settings, `symlink_files`, `bazel_dep` on the current module, and `Label.workspace_root`." Rationale: each is removed or deprecated in rc4. Verification: `git grep -n -E 'new_git_repository|remote_execution_properties|host_windows|symlink_files|workspace_root|//src/conditions:remote'` in BUILD, .bzl, MODULE.bazel; empty output is the pass. Then run one CI leg with `USE_BAZEL_VERSION=10.0.0rc4` as non-blocking. Gate it as "rc, re-verify at 10.0.0 final".
2. New rule (flags.md, FLAG family). Statement: "On 10.x, do not rely on `/usr/local/bin` being on the default action PATH or on an unset `LC_CTYPE`; pin them with `--action_env` and `--host_action_env` where a tool needs them." Rationale: both defaults changed in rc4. Verification: build one target needing a `/usr/local/bin` tool under 10.0.0rc4; failure is the finding.
3. Amended rule (BZL-CORE-01 and the rule table row on measured versions). Statement: add 9.3.x, 8.9.x and 10.0.0rc4 to the version-support statement, saying that everything measured on 8.7.0, 8.8.0 and 9.2.0 is not asserted for them. Verification: reading heuristic, the version line in rules/bazel-quality.md matches the versions in each depth file header.
4. Amended rule (MOD family, `.bazelversion` floor). Statement: "Pin `.bazelversion` to at least 7.7.2, 8.8.2, 9.3.1 or 10.0.0rc2 for the CA fix, and at least 7.7.3, 8.9.0, 9.3.3 for the JDK CVE fix, per the track the repo is on." Rationale: the bundled JDK trust store and JDK compiler are in the Bazel binary. Verification: `cat .bazelversion` against the list; a lower pin is the finding. Caveat: the JDK CVE mapping comes from release-page text, not the advisory.
5. Amended rule (CACHE-03 and CACHE-04 wording, gap note only). Statement: note that on 10.x a failing credential helper aborts HTTP downloads, so a helper must be present on every machine that builds, and a missing helper is a hard failure not a silent anonymous download. Verification: run a build with the helper binary renamed and expect failure, not a silent pass.
6. Gap note (LARK family). Statement: "Do not write symbolic-macro attribute values that violate the declared attribute type; `--incompatible_symbolic_macro_strict_attrs` will fail them in a later major." Verification: `bazel build //... --incompatible_symbolic_macro_strict_attrs` on 10.0.0rc4.
7. Gap note (MOD family, publish checklist). Statement: "A BCR submission contains no binary files (swap files, blobs); `source.json` patch and overlay integrity strings are non-empty." Verification: run `tools/bcr_validation.py` from a bazel-central-registry checkout, or `git diff --numstat` showing `-` for binary files in the submission.
8. Gap note (CACHE family). Statement: on 10.x, `--rewind_lost_inputs` is default-on; an eviction-caused failure under build-without-the-bytes on 9.3.0 or later is a regression to report, and on earlier versions it is expected. Verification: `bazel help build --long | grep -A6 -e '--rewind_lost_inputs'` on the pinned binary.
9. Gap note (CI family, bazelisk). Statement: Bazelisk 1.31.0 honours `NETRC`; keep netrc files out of the repository like any other credential (extends BZL-CACHE-04). Verification: `git ls-files | grep -i netrc` is empty.

## AI-agent angle

- An agent trained before 2026 writes `new_git_repository`, `remote_execution_properties` and `symlink_files` from habit. Cheapest check: the grep in candidate 1.
- An agent writes `Label.workspace_root`; on 9.3.0 and later that is deprecated. Check: grep `workspace_root`.
- An agent assumes `bazel mod tidy` only touches the root module's extensions and assumes `bazel vendor` is complete; on 10 both widen. Check: run `bazel vendor` after `bazel mod tidy` on rc4 and diff the vendor directory.
- An agent writes `compatibility_level` expecting enforcement. It is a no-op on 10. Check: grep.
- An agent states that Bazel 10 has Starlark types. Not established; do not write it as fact. Check: look for the tag in the release notes of the pinned version.
- An agent cites JDK CVE fixes by JDK number alone. Check: name the Bazel release.

## Contested / evolving

- Everything about Bazel 10 is rc-stage as of 2026-11-19; highlights are still "TBA" in the rc3 notes. Re-check at 10.0.0 final. Trend: more flags flipped, more removals.
- Starlark typing: planned for 10.0 in January 2026, absent from rc4 notes. Trend: unknown.
- The JDK version bundled with 10 is reported inconsistently in the rc4 notes (26 in one entry, 27.0.1.1 in another). Do not state a JDK number for Bazel 10.

## Not found, stated explicitly

- PROJECT.scl documented or defaulted: nothing in any fetched source.
- BCR attestation, provenance or yanking policy change: nothing in titles of docs commits.
- GitHub advisories for bazel-contrib: page returned 404; could not determine.
- Successor to crate_universe, rules_js, rules_python or a cache server: nothing found.
- Ruleset archival in the window: nothing found.
- Q3 2026 community update (2026-10-02): no roadmap, BCR, ruleset, deprecation or LTS items. Bazel 9.3.0 was predicted for 2026-10-05 and released 2026-10-07.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://blog.bazel.build/ | Blog index | read 2026-11-27 | Found three posts in window |
| https://blog.bazel.build/2026/11/10/bazel-q4-2026-bazelcon-recap.html | BazelCon recap | 2026-11-10 | Talk list; types, supply chain, Gazelle v2 |
| https://blog.bazel.build/2026/10/23/emudhra-ca-compromise.html | Security release post | 2026-10-23 | Fixed versions, workaround |
| https://blog.bazel.build/2026/10/02/bazel-q3-2026-community-update.html | Q3 update | 2026-10-02 | Release dates; no policy items |
| https://blog.bazel.build/2026/01/20/bazel-9.html | Bazel 9 post (pre-window) | 2026-01-20 | Typing planned for 10.0 |
| https://github.com/bazelbuild/bazel/releases | Releases index | 2026-11-19 | rc3, rc4, 9.3.3, 8.9.0, 7.7.3 |
| https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4 | Release notes | 2026-11-19 | Full breaking-change list |
| https://github.com/bazelbuild/bazel/releases/tag/9.3.0 | Release notes | 2026-10-07 | rewind_lost_inputs default |
| https://github.com/bazelbuild/bazel/releases/tag/9.3.3 | Release notes | 2026-11-19 | JDK CVE fix |
| https://github.com/advisories/GHSA-6g7j-4xh3-xq2q | Advisory | 2026-11-18 | CVE-2026-114938 detail |
| https://github.com/bazelbuild/bazel/security/advisories | Advisory list | read 2026-11-27 | Nothing new in window |
| https://github.com/bazelbuild/bazelisk/releases | Bazelisk releases | 2026-10-20, 2026-11-26 | 1.30.0 CVE, 1.31.0 NETRC |
| https://github.com/bazelbuild/bazel-central-registry/commits/main/docs | BCR docs history | 2026-10 to 2026-11 | Policy commits (titles only) |
| https://github.com/bazelbuild/bazel-central-registry/pull/11940 | BCR PR | 2026-11-23 | Binary-file check |

Failed fetches: bazel.build/about/roadmap (404), github.com/orgs/bazel-contrib/security/advisories (404). Two web searches (Bazel 10 migration guide, ruleset archival) returned no in-window primary source.
