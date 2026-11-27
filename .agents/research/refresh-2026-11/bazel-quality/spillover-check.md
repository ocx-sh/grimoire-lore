---
title: Spillover check for bazel-quality
target: bazel-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/bazel-contrib/rules_foreign_cc/releases/tag/0.17.0
  - https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/MODULE.bazel
  - https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/foreign_cc/repositories.bzl
  - https://github.com/bazelbuild/bazel/releases
---

# Spillover check for bazel-quality

## Item 1 (from cmake-build)

Item: "rules_foreign_cc 0.17.0 (2026-10-25) keeps default CMake 3.31.12, prebuilt ceiling 4.0.7 and bazel_dep rules_cc 0.2.18; Bazel 9.3.3 and 10.0.0rc4 are out; restamp any bazel-quality text that names 0.16.0 as newest."

Evidence in origin: .agents/research/refresh-2026-11/cmake-build/bazel-seam-rules-foreign-cc.md and cmake-build.md.

Verdict: confirmed by primary source (rules_foreign_cc facts and Bazel release facts); target already correct.

Sources:
- https://github.com/bazel-contrib/rules_foreign_cc/releases/tag/0.17.0 : release page shows "25 Oct" (no year on the page); lists only PR #1597 (Windows arm64 prebuilt CMake archives) as CMake change; PR #1598 mentions rules_cc 0.2.19 or later only for m4 on MSVC.
- https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/foreign_cc/repositories.bzl : `"cmake": "3.31.12"`, `"ninja": "1.13.2"` in DEFAULT_TOOL_VERSIONS. The 4.0.7 ceiling is taken from the origin file's reading of cmake_versions.bzl; I did not refetch that file.
- https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/MODULE.bazel : `bazel_dep(name = "rules_cc", version = "0.2.18")`.
- https://github.com/bazelbuild/bazel/releases : 9.3.3 (Latest, 19 Nov), 8.9.0 (19 Nov), 10.0.0rc4 (19 Nov, pre-release); no final 10.0.0 on the first page.

Affected text in target: none names rules_foreign_cc 0.16.0 or 0.17.0. A grep of /home/mherwig/dev/ocx-sh/grimoire-lore/rules/bazel-quality.md and skills/bazel-quality-reference/ finds rules_foreign_cc only in cpp.md (lines 97 and 191), and neither line names a version. The Bazel versions are already current:
- rules/bazel-quality.md: "Releases after that date — 9.3.0 to 9.3.3, 8.8.1 to 8.9.0 and the 10.0.0 release candidates (10.0.0 itself is unreleased on 2026-11-27)"
- skills/bazel-quality-reference/flags.md: "on 2026-11-27 it read 10 Rolling (10.0.0 unreleased, 10.0.0rc4 newest), 9 Active (9.3.3), 8 Maintenance (8.9.0), 7 Maintenance (7.7.3)"

Smallest change: none. The rules_cc 0.2.18 pin and the CMake 3.31.12 default belong to cmake-build, not bazel-quality; bazel-quality's rules_cc 0.2.22 (flags.md) is a different claim about the newest rules_cc release and is not touched by this item.
