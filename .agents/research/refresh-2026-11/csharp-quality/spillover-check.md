---
title: csharp-quality spillover check (items reported by the dotnet-build pipeline)
target: csharp-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk
  - https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/
  - https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/
---

# Spillover check for csharp-quality

Both items came from the dotnet-build pipeline. Evidence there: `dotnet-build/sdk-cli-msbuild-roslyn-behaviour.md` (line 85) and `dotnet-build/recent-shifts.md` (section 7). Target files read: `rules/csharp-quality.md` and every file under `skills/csharp-quality-reference/`.

## Item 1: CA1515 false positive on C# extension members is fixed in the SDK 11 analyzers

Item text: "the CA1515 false positive on C# extension members is fixed in the SDK 11 analyzers (the analyzers.props comment names CA1515 as a library rule)."

Verdict: confirmed by primary source; target already correct.

Source: Microsoft Learn, "What's new in the SDK and tooling for .NET 11" (primary), `ms.date` 2026-11-10, `updated_at` 2026-11-17. Its "Analyzer bug fixes" table reads "CA1515 | Fixed false positive when C# extension members are present" and the same wording for CA1034. The page does not say which 11.0.x build carries the fix beyond "this article ... was last updated for the general availability (GA) release". No servicing backport to the 10.0 band is documented.

Where the item lands: the `analyzers.props` comment the item cites is in the dotnet-build artifacts (`skills/dotnet-build-reference/checks/`, rule CS-BUILD-12), not in csharp-quality. In csharp-quality, `CA1034` appears only as a pointer in `skills/csharp-quality-reference/language.md` (CS-LANG-12): "The site-level CA1034 pragma is `CS-BUILD-12`'s." The CA1515 text in csharp-quality is about a different cause and stays true:
- `skills/csharp-quality-reference/testing.md` (CS-TEST-12): "CA1515 fails every public helper type in an `Exe` test project on both TFMs; the test classes themselves are exempt." (measured 2026-10-11, SDK 10.0.401).
- `skills/csharp-quality-reference/performance.md`: "A minimal benchmark class fails the library gate with CA1050, CA1051, CA1515 and CS1591."

Neither is an extension-member false positive, so the SDK 11 fix does not change them.

Smallest change to make the target true on 2026-11-27: none. The target makes no claim about CA1515 and extension members. The claim belongs to dotnet-build CS-BUILD-12 and is that pipeline's to update.

## Item 2: pull_request_target blocked by default from 2026-12-02; workflow lockfiles GA 2026-10-28 as a competitor to 40-hex SHA pins

Item text: "pull_request_target is blocked by default in public repos from 2026-12-02, and GitHub workflow lockfiles reached GA on 2026-10-28 as a competitor to 40-hex SHA pins."

Verdict: pull_request_target part confirmed by primary source. Lockfile GA date confirmed by primary source, with two corrections: the changelog scopes the GA to GitHub Enterprise Cloud, and it does not call lockfiles a competitor to SHA pins (that framing is dotnet-build's inference).

Sources (both primary, GitHub changelog):
- https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/ dated 2026-11-02. Actions blocks `pull_request_target` by default in all public repositories unless an Actions event policy allows it; enforcement 2026-12-02 (previously 2026-11-02); brownouts 2026-11-09 and 2026-11-16, 16:00 to 18:00 UTC. Private and internal repositories are not affected.
- https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/ dated 2026-10-28. "You can now use GitHub Actions workflow dependency lockfiles in general availability on GitHub Enterprise Cloud." File `.github/workflows/actions.lock`, made with the `gh actions-lock` extension. The post never mentions SHA pinning; it says only that a workflow can keep tag or branch references and run the locked commits.

Affected text in the target:
- `skills/csharp-quality-reference/testing.md`, CS-CI-08: "R7, pinned actions: a third-party action sits on a 40-hex commit SHA with its tag in a trailing comment; a first-party `actions/*` or `github/*` action may sit on a version tag, never a branch." Still true. Lockfiles do not make a tag reference checkable by `check-ci-matrix.sh`, and the changelog does not say they replace SHA pins.
- `skills/csharp-quality-reference/checks/check-ci-matrix.sh` lines 60 and 131 list `pull_request_target` only as one of several "other" triggers. Nothing in the target recommends using it, and no rule depends on it staying allowed.
- `rules/csharp-quality.md` says nothing on either point.

Smallest change to make the target true on 2026-11-27: none is required, because no target text is wrong. If the owner wants the point recorded, add one sentence to the CS-CI-08 reason column: "From 2026-12-02 GitHub blocks `pull_request_target` by default in public repositories; this catalogue's workflows use `pull_request` and tag or schedule triggers only." Do not add lockfiles as an alternative to R7, because the script cannot verify them and the GA is Enterprise Cloud only.
