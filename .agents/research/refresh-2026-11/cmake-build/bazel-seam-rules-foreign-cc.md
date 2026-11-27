---
title: "Delta: rules_foreign_cc, Bazel, rules_cc, Conan BazelDeps and vcpkg for bazel-seam.md"
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 21
---

# Delta 2026-09-26 to 2026-11-27: the Bazel seam

Scope: the claims in skills/cmake-build-reference/bazel-seam.md and the cross-reference in versions-and-policies.md. This is an update of the 2026-09-26 research, not a re-creation. Dates written "day Month" on GitHub release pages carry no year; the year 2026 is inferred from the tag order and from release notes that state it.

## Verdict in one paragraph

One new rules_foreign_cc release landed in the window: 0.17.0 on 25 October 2026. It did not move the default CMake (still 3.31.12) or the prebuilt table ceiling (still 4.0.7), so CMK-BZL-08 and the cross-reference in versions-and-policies.md stay true for the default and the table. Both issues (#1129 and #329) are still open. PIC delivery is unchanged. Conan 2.34.0 (28 October 2026) still pins rules_cc 0.2.17 in the BazelDeps include file and added a Bazel 6 deprecation warning, which does not touch the Bazel 7.2 floor. vcpkg still offers no Bazel integration. The only edit worth making is a wording one: the text says "At 0.16.0", and 0.17.0 is now the newest tag.

## Claim by claim

### "At 0.16.0 (2026-09-15)", default 3.31.12, table 3.19.8 to 4.0.7 (CMK-BZL-08, versions-and-policies.md): CHANGED only in the release label, UNCHANGED in the facts

- Old text: "At 0.16.0 (2026-09-15) ... At rules_foreign_cc 0.16.0 the default is 3.31.12 ... the prebuilt table runs 3.19.8 to 4.0.7".
- New fact: rules_foreign_cc 0.17.0 was published 25 October 2026. At tag 0.17.0, `foreign_cc/repositories.bzl` has `DEFAULT_TOOL_VERSIONS` with `"cmake": "3.31.12"` and `"ninja": "1.13.2"`. `toolchains/private/cmake_versions.bzl` has `CMAKE_BIN_SRCS` with 14 versions, lowest 3.19.8 and highest 4.0.7 (3.19.8, 3.20.6, 3.21.7, 3.22.6, 3.23.5, 3.24.4, 3.25.3, 3.26.6, 3.27.9, 3.28.6, 3.29.9, 3.30.9, 3.31.12, 4.0.7).
- Release notes for 0.17.0 (18 PRs) list one CMake change, [#1597](https://github.com/bazel-contrib/rules_foreign_cc/pull/1597), which only maps Windows arm64 prebuilt archives. No CMake bump. The ceiling stays 4.0.7, so a wrapped consumer still cannot reach the 4.4 gate spelling through the prebuilt table. The 3.31 line of 0.15.0 and 0.16.0 stands.
- Consequence for wording: "At 0.16.0" and "3.31.12 under rules_foreign_cc 0.16.0" are not wrong, but 0.17.0 is the newest tag. If the pair wants the claim to stay current, name the range "0.16.0 and 0.17.0". The measured statement "every wrap on Bazel 9.2.0 ran `cmake-3.31.12-linux-x86_64`" is a 2026-09-26 measurement on 0.16.0 and was not re-run. It is neither contradicted nor re-confirmed.
- Other 0.17.0 items that touch the seam: [#1604](https://github.com/bazel-contrib/rules_foreign_cc/pull/1604) fixes `--incompatible_auto_exec_groups` usage; [#1602](https://github.com/bazel-contrib/rules_foreign_cc/pull/1602) adds CI for Bazel 9; [#1606](https://github.com/bazel-contrib/rules_foreign_cc/pull/1606) drops `PWD` from the cc_toolchain environment. None of them is a claim in the file. The `PWD` change could in principle alter the environment a wrapped CMake sees, but nothing in bazel-seam.md depends on `PWD`.
- Source: https://github.com/bazel-contrib/rules_foreign_cc/releases/tag/0.17.0 ; https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/foreign_cc/repositories.bzl ; https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/toolchains/private/cmake_versions.bzl . Date of upstream change: 25 October 2026 (release), no change to the claim.

### "Since rules_foreign_cc 0.16.0" PIC is delivered as a flag (PR #1440, CMK-BZL-03 to -05): UNCHANGED

- [#1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440) "fix: honor --force_pic for shared library" is merged (6 November 2025, by jsharpe) and shipped in 0.16.0 per the 0.16.0 notes ("Fixes `--force_pic` for shared libraries"). The 0.17.0 notes do not mention PIC, `--force_pic` or `-fPIC`.
- Source: https://github.com/bazel-contrib/rules_foreign_cc/pull/1440 ; the 0.17.0 release page above.

### Issue #1129 ("invalid symlink"): UNCHANGED, still open

- [#1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) is open, labels `bug` and `help wanted`. Last comment is 11 April 2024 (TendTo's `postfix_script` workaround). The related fix attempt [#1196](https://github.com/bazel-contrib/rules_foreign_cc/pull/1196) is still an open draft whose last shown activity is 7 May 2024. The 0.17.0 notes do not mention symlinks. The 0.16.0 notes (before the window) already include "fixes directory-symlink functions" and runfiles symlinking, which the baseline research already covered.
- Source: https://github.com/bazel-contrib/rules_foreign_cc/issues/1129 ; https://github.com/bazel-contrib/rules_foreign_cc/pull/1196 .

### Issue #329 (`-j`): UNCHANGED, still open, with one new fact to note

- [#329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) is open (a feature request, opened 18 October 2019, auto-closed as stale and reopened 10 November 2022). No maintainer comment after 13 December 2023. The page shows a commit of 10 March 2026 for [#1465](https://github.com/bazel-contrib/rules_foreign_cc/pull/1465), which adds Bazel `resource_sets` to build actions and references this issue; the 0.16.0 notes already list resource sets and a fixed-CPU `serial` size. This predates the window and is not a closure. If the file's text says nothing about resource sets, it is accurate as written; adding one clause about #1465 is optional.
- Source: https://github.com/bazel-contrib/rules_foreign_cc/issues/329 .

### "Unmeasured as of 2026-09-26" list (real Bazel wrap): COULD NOT DETERMINE

- This is an open question about running a real wrap. No upstream document can answer it, and no wrap was run for this delta (the commission was source reading only). It stays unmeasured. 0.17.0 and Bazel 9.3.3 were not exercised.

### Bazel after 9.2.0: CHANGED (new releases), no claim at risk

- The releases page lists, all 19 November 2026 unless noted: 9.3.3 (marked Latest, patch LTS; notes cover only the embedded JDK update), 8.9.0 (minor LTS, no cc items), 7.7.3 (patch LTS), and pre-releases 10.0.0rc3 (10 November) and 10.0.0rc4 (19 November). The page did not show 9.2.0 itself or 9.3.0 to 9.3.2, so those are not read.
- 10.0.0rc3 removed `CoptsFilter`, "no longer used since `rules_cc` 0.2.19". Nothing in the notes touches `include()` in MODULE.bazel; the Bazel 7.2.0 floor for `include()` stands. The file only claims a measurement on 9.2.0, which stays a past measurement.
- Bazel-side rules stay with the bazel-quality rule (BZL-CC-22, -23, -24, -28); this delta does not propose changes to them.
- Source: https://github.com/bazelbuild/bazel/releases .

### rules_cc: CHANGED (newer releases), the Conan pin is the claim at risk

- Releases read (day and month only on the page): 0.2.17 (18 February), 0.2.18 (21 April), 0.2.19 (1 June), 0.2.20 (22 June), 0.2.21 (3 July), 0.2.22 (7 July), 0.2.25 (14 September), 0.2.26 (5 October), 0.2.27 (22 October), 0.2.28 (5 November). The newest is 0.2.28. Releases 0.2.23 and 0.2.24 have no own entry. In the window: 0.2.26, 0.2.27 and 0.2.28.
- rules_foreign_cc 0.17.0's `MODULE.bazel` still declares `bazel_dep(name = "rules_cc", version = "0.2.18")`, so the claim "resolution picked 0.2.18 through rules_foreign_cc" holds for 0.17.0 as well. 0.17.0's notes also mention rules_cc 0.2.19 or later only for the m4 MSVC change [#1598](https://github.com/bazel-contrib/rules_foreign_cc/pull/1598).
- Source: https://github.com/bazelbuild/rules_cc/releases ; https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/MODULE.bazel .

### CMK-BZL-14, Conan BazelDeps include file: UNCHANGED for the pin and the floor, one doc fact CHANGED

- Newest Conan tags: 2.33.0 (29 September 2026) and 2.34.0 (28 October 2026). `develop2` reports `2.35.0-dev`. The file's "unchanged at 2.32.0" is now behind: it is also unchanged at 2.34.0.
- At tag 2.34.0, `conan/tools/google/bazeldeps.py` still emits `conan_deps.MODULE.bazel` and still declares `bazel_dep(name = "rules_cc", version = "0.2.17")`. `develop2` has the same pin. rules_cc 0.2.17 is now eight releases behind 0.2.28, so the "resolution picked 0.2.18 through rules_foreign_cc" observation still holds (Bazel picks the highest requested version).
- New in 2.34.0: the notes say "Add deprecation warnings for Bazel 6 support in the `BazelDeps` generator", "Update `conan new bazel_lib` and `conan new bazel_exe` templates to Bazel 7", and "Do not write `--dynamic_mode=off` in `BazelToolchain` when the recipe has no `shared` option". The Bazel 6 path (`dependencies.bzl` from a WORKSPACE) is deprecated; the MODULE.bazel include path the file relies on is the recommended one. The floor "Conan 2.30.0 and Bazel 7.2.0" is unchanged, as the docs still say `conan_deps.MODULE.bazel` is for Bazel 7.2 and later, "including 9.x".
- Experimental status: the BazelDeps docs page (titled "conan 2.34.0 documentation") still carries the warning "This feature is experimental and subject to breaking changes." Answer to the open question: yes, marked experimental, unchanged.
- Candidate edit (optional): change "unchanged at 2.32.0" to "unchanged through 2.34.0 (28 October 2026)". The `BazelToolchain` `--dynamic_mode=off` fix is relevant only if the file discusses shared builds through BazelToolchain; it does not.
- Source: https://github.com/conan-io/conan/releases ; https://raw.githubusercontent.com/conan-io/conan/2.34.0/conan/tools/google/bazeldeps.py ; https://docs.conan.io/2/reference/tools/google/bazeldeps.html .

### CMK-BZL-15, vcpkg across the seam: UNCHANGED

- vcpkg registry 2026.10.16 (tag; published 20 October 2026) and vcpkg-tool 2026-10-29 (Latest; 2026-09-26 sits between) are newer than the file's "vcpkg 2026.07.29 and vcpkg-tool 2026-07-27". Neither release page nor the October 2026 blog post shows Bazel integration. The only Bazel mention is that the port `vcpkg-tool-bazel` was removed from the registry in 2026.10.16. That is a port that supplied a Bazel binary as a tool, not an integration with Bazel's dependency resolution, so the claim "vcpkg offers nothing across the seam" stands. A web search for a vcpkg Bazel integration returned nothing. The vcpkg `scripts/` grep in the file's command was not re-run, since no checkout was fetched. The vcpkg-tool 2026-10-29 notes were not read beyond the release-list page, so "could not determine" applies to a Bazel feature hidden in that release's body. The release list shows no Bazel mention.
- Candidate edit (optional): bump "vcpkg 2026.07.29 and vcpkg-tool 2026-07-27" to "vcpkg 2026.10.16 and vcpkg-tool 2026-10-29" only if the pair re-reads the source at those tags; the shorter note is that the claim is unchanged.
- Source: https://github.com/microsoft/vcpkg/releases/tag/2026.10.16 ; https://github.com/microsoft/vcpkg-tool/releases ; https://devblogs.microsoft.com/cppblog/whats-new-in-vcpkg-oct-2026/ .

## Normative candidates

None to add or change as a rule. Two wording refreshes, each with a rationale and a check:

1. versions-and-policies.md and bazel-seam.md: name 0.17.0 beside 0.16.0 for the default CMake (3.31.12) and table (3.19.8 to 4.0.7). Rationale: 0.17.0 is the newest tag and carries the same values, so a reader on 0.17.0 must not think the claim stops at 0.16.0. Verification: `curl -s https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/<tag>/foreign_cc/repositories.bzl | grep -n '"cmake":'` returns `"cmake": "3.31.12"`, and `curl -s .../toolchains/private/cmake_versions.bzl | grep -n -o '"[0-9]\.[0-9]*\.[0-9]*": {' | tail -1` returns `"4.0.7": {`.
2. bazel-seam.md CMK-BZL-14 and Re-check: change "unchanged at 2.32.0" to "unchanged through 2.34.0" and keep the rules_cc 0.2.17 pin. Rationale: 2.34.0 is the newest tag and the pin is the same. Verification: `grep -n 'bazel_dep(name = "rules_cc"' conan/tools/google/bazeldeps.py` at tag 2.34.0 returns version 0.2.17.

Re-check triggers for the next refresh: a rules_foreign_cc release that edits `DEFAULT_TOOL_VERSIONS` or adds a version above 4.0.7 to `CMAKE_BIN_SRCS`; closure of #1129 or #329; a Conan release that raises the rules_cc pin or drops the Bazel 7.2 include path; a Bazel 10.0.0 final.

## Sources fetched (21)

rules_foreign_cc releases page, 0.17.0 release page, repositories.bzl, cmake_versions.bzl and MODULE.bazel at 0.17.0, issues #1129 and #329, pull requests #1196 and #1440; Bazel releases; rules_cc releases; Conan releases, `bazeldeps.py` at 2.34.0 and `develop2`, `conan/__init__.py`, BazelDeps docs page; vcpkg releases and the 2026.10.16 tag page; vcpkg-tool releases; the October 2026 vcpkg blog post; one vcpkg-and-Bazel web search (a search, not a source).
