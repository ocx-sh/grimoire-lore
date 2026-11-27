---
title: Spillover check for dotnet-build, items from csharp-quality
target: dotnet-build
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2
  - https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available
  - https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk
  - https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1876
  - https://github.com/microsoft/vs-threading/releases
  - https://github.com/meziantou/Meziantou.Analyzer/releases
  - https://raw.githubusercontent.com/microsoft/testfx/main/docs/Changelog-Platform.md
---

Evidence for all three items sits in /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/csharp-quality/ (recent-shifts-csharp-quality.md, dotnet11-runtime-bcl-and-sdk-test-behaviour.md, analyzer-and-build-time-packages.md, test-and-benchmark-packages.md) and in csharp-quality.md. Target files: rules/dotnet-build.md and skills/dotnet-build-reference/.

## Item 1: pull_request_target blocked by default from 2026-12-02; workflow lockfiles GA 2026-10-28

Verdict: confirmed by primary source.

Source: GitHub changelog, https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 (dated 2026-11-02): from 2026-12-02 Actions blocks `pull_request_target` by default in public repositories unless an Actions event policy allows it; brownouts 2026-11-09 and 2026-11-16, 16:00 to 18:00 UTC; private and internal repositories are not affected. Source: https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available (dated 2026-10-28): lockfile at `.github/workflows/actions.lock`, `gh actions-lock` extension, an admin "Require lockfile" policy, and a note that a lockfile does not decide whether a dependency is safe.

Affected text in the target: none. Neither file mentions `pull_request_target`, `actions.lock` or a workflow lockfile (grep over rules/dotnet-build.md and skills/dotnet-build-reference/ is empty). The rule only claims workflows through its path glob, quoted from rules/dotnet-build.md: `- ".github/**/*.y*ml"`, and routes workflow authoring to the sibling, quoted from rules/dotnet-build.md: "writing a workflow, a CI matrix or a `ci-ok` job (CS-CI)" with the target `csharp-quality`. packaging.md CS-PKG-11 pins the publish action to a 40-hex SHA and does not conflict with lockfiles.

Smallest change to make the target true on 2026-11-27: none. The target says nothing on the point and the owner is csharp-quality (CS-CI).

## Item 2: AnalysisLevel=latest fixed at GA; CA1876 and CA1877 suggestion-level; analyzer pins

Verdict: confirmed by primary source for the AnalysisLevel fix and for CA1876; CA1877 and the MA0053 narrowing only from the originating pair's notes (not re-read here); target already correct.

Sources:
- https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk (ms.date 2026-11-10, updated 2026-11-17; "last updated for the general availability release"): "Projects with `AnalysisLevel=latest` were incorrectly using .NET 9 analyzer rules instead of the expected .NET 11 rules. This is now fixed." The page does not say "previews"; that word is the pair's reading.
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1876 (ms.date 2026-11-13): enabled by default in .NET 10 "No", in .NET 11 "As suggestion". The CA1877 page (2026-11-19 per the pair's notes) was not re-fetched.
- https://github.com/microsoft/vs-threading/releases: v18.12.1 exists, marked Latest, published 26 Oct (the page shows no year). Notes list two new analyzers without IDs ("ThreadStatic correctness analyzers", "redundant async state machines") and fixes to VSTHRD002, 003, 010, 103, 104, 117 and 200.
- https://github.com/meziantou/Meziantou.Analyzer/releases: 3.0.342 listed as latest, published 22 Nov (no year shown); its only note is an MA0101 code-fix change. The page read covered only 3.0.333 to 3.0.342, so the MA0053 narrowing in 3.0.307 is secondary (taken from the pair's notes, which cite pages 1 to 6).

Affected text in the target, rules/dotnet-build.md CS-BUILD-10: "A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028), and the `11.0` set that SDK 11.0.100 ships adds eight rules". This is a statement about RC1 and about the 11.0 set, neither of which the GA fix contradicts; a bump commit still lists the rules.

Affected text in the target, rules/dotnet-build.md CS-BUILD-15: "`Meziantou.Analyzer` 3.0.342 with `<MeziantouAnalysisMode>None</MeziantouAnalysisMode>`" and "Threading 18.12.1 adds analyzers whose IDs were not read, so 18.7.23 stays until a build lists them." The same pins appear in skills/dotnet-build-reference/checks/Directory.Packages.analyzers.props (`Microsoft.VisualStudio.Threading.Analyzers" Version="18.7.23"`, `Meziantou.Analyzer" Version="3.0.342"`). The MA0053 lines in checks/analyzers.globalconfig (`dotnet_diagnostic.MA0053.severity = error # CS-API-03`) remain valid for unsealed public classes; a class used only as a generic constraint no longer triggers it, which the target does not claim either way.

Smallest change to make the target true on 2026-11-27: none. Optional, not required: in CS-BUILD-10 add that `latest` resolves to the 11.0 rule set at GA, which would be new text about a level the rule forbids anyway.

## Item 3: MTP 3.0.0 (unreleased) removes --no-progress and --no-ansi; watch DN-RULE-02

Verdict: confirmed by primary source.

Source: https://raw.githubusercontent.com/microsoft/testfx/main/docs/Changelog-Platform.md (main branch, read 2026-11-27): top section is "## [3.0.0] - Unreleased"; Breaking changes: "Remove the MTP application's `--no-ansi` and `--no-progress` options; use `--ansi off` and `--progress off`." Latest released section is 2.5.3, dated 2026-11-11. The last 60260 characters of the page were not read.

Affected text in the target: none. Neither file mentions `--no-progress`, `--no-ansi` or MTP progress flags (grep empty). DN-RULE-02 is referenced by the target only as a pointer, quoted from rules/dotnet-build.md: "DN-RULE-02 puts the knobs in the environment" and in the first-line comment `export MSBUILDTERMINALLOGGER=off DOTNET_NOLOGO=1 ...    # DN-RULE-02`. The allow-list itself lives in another artifact. CS-BUILD-30 passes `--tl:off --interactive false`, which are dotnet CLI flags, not MTP flags.

Smallest change to make the target true on 2026-11-27: none. 3.0.0 is unreleased; the allow-list fix belongs to the artifact that owns DN-RULE-02 once 3.0 ships.
