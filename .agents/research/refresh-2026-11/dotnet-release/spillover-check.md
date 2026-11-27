---
title: dotnet-release spillover check
target: dotnet-release
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/NuGet/NuGet.Client/pull/7652
  - https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets
  - https://raw.githubusercontent.com/NuGet/NuGet.Client/release/7.9.x/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets
  - https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0
  - https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/
  - https://github.com/xoofx/dotnet-releaser/releases
---

# Spillover check for dotnet-release

Both items come from the dotnet-build pair. Evidence is in `.agents/research/refresh-2026-11/dotnet-build/nuget-client-restore-and-pack.md`, `nuget-org-and-publish-pipeline.md`, `recent-shifts.md`, and the decision file `dotnet-build.md`. The skill files are under `skills/dotnet-release/`.

## Item 1: pack must also pass -p:DeterministicTimestamp=$T

Item: NuGet 8.0.0 and the 7.9.x backport no longer read SOURCE_DATE_EPOCH, so the pack must also pass `-p:DeterministicTimestamp=$T`; the sentence "Only SOURCE_DATE_EPOCH gives equal digests" is no longer true.

Verdict: confirmed by primary source (source code and repository PR). The property form itself has not been run; dotnet-build says the same.

Evidence:
- https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets, fetched 2026-11-27: sets `<DeterministicTimestamp Condition="'$(DeterministicTimestamp)' == ''">false</DeterministicTimestamp>`; no line mentions `SOURCE_DATE_EPOCH`. The `release/7.9.x` branch file is identical on both points.
- https://github.com/NuGet/NuGet.Client/pull/7652, merged into `dev` 2026-08-27, backport #7661 dated 2026-08-28. Description: "Customers will need to either set `DeterministicTimestamp` to `true` or a specific timestamp to use the feature." A late commit is titled "Don't use SOURCE_DATE_EPOCH automatically". The PR discussion is mixed on intent; the targets file is the deciding evidence.
- https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 (page date 2026-11-06): NuGet 8.0.0 ships in SDK 11.0.100; "Make deterministic package timestamps opt-in again to preserve existing `PreserveNewest` behavior". The page does not mention `SOURCE_DATE_EPOCH`.
- Caveat: which 10.0.4xx patch carries the backport is not established. SDK 10.0.401 honoured the variable when dotnet-build measured it on 2026-10-11.
- A bare `-p:DeterministicTimestamp=true` is the wall clock; the skill already says so. The value must be Unix seconds.

Affected text in the target, verbatim:
- `references/library-steps.md` line 33 (R5): "`SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts` (`GITHUB_ACTIONS=true` is set by the runner)"
- `references/library-steps.md` line 107: "A fixed `SOURCE_DATE_EPOCH` is the only setting that gives byte-identical nupkgs"
- `references/library-steps.md` line 117: "( cd "$R/clone" && SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$R/out" --tl:off --interactive false -nologo -v:q > "$R/pack.log" 2>&1; echo "clone pack exit $?" )"
- `references/library-steps.md` line 175: "run: SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts --tl:off --interactive false -nologo -v:q"
- `references/library-steps.md` lines 393-394: "wall clock. Only `SOURCE_DATE_EPOCH` gives equal digests (step 7, CS-PKG-05)."
- `SKILL.md` line 221: "SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" --tl:off --interactive false -nologo -v:q > "$LOGS/pack.log" 2>&1; echo "pack exit $?""
- `SKILL.md` line 51 ("SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`") is still true and needs no change.

Smallest change: on each pack command at `SKILL.md` line 221 and `library-steps.md` lines 33, 117 and 175, set `T=$(git log -1 --format=%ct)` first and keep `SOURCE_DATE_EPOCH=$T`, then add `-p:DeterministicTimestamp=$T`, the form dotnet-build's CS-PKG-05 now cites. Reword line 107 to "A fixed commit time passed as both `SOURCE_DATE_EPOCH` and `-p:DeterministicTimestamp` is the only setting..." and line 394 to "Only a fixed Unix-seconds `-p:DeterministicTimestamp` (with `SOURCE_DATE_EPOCH` for SDK 10.0.401) gives equal digests". The skill must keep CS-PKG-05's text in sync with the rule.

## Item 2: staged publishing and dotnet-releaser 0.24.1

Item: nuget.org staged publishing (`dotnet package stage push` against `dotnet nuget stage push`, spelling unresolved) is a blind spot of the push procedure; dotnet-releaser 0.24.1 fixed the Trusted Publishing key expiring before the push.

Verdict, staged publishing: only secondary source for the spelling, and it conflicts with the primary note. The Microsoft Learn NuGet 8.0 release notes (primary, page date 2026-11-06) say "Add `dotnet nuget stage push` to upload packages and symbols to a staging service". The .NET Blog post https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/ (2026-11-17; a vendor blog, secondary) gives `dotnet package stage push <nupkg> --source https://api.nuget.org/v3/index.json --api-key ... [--group id]` and says "The .NET 11 RC2 SDK supports basic staging uploads." Nothing here runs the command, so the spelling stays unresolved. This is a real gap only if the skill allows staged publishing; the opt-in feature leaves `dotnet nuget push` working.

Verdict, dotnet-releaser: confirmed by primary source. https://github.com/xoofx/dotnet-releaser/releases lists release 0.24.1 dated "06 Nov" (year not shown on the page; dotnet-build records 2026-11-06) with the bug fix "Fix NuGet trusted publishing key expiring before publication".

Affected text in the target: the skill does not mention staged publishing or dotnet-releaser anywhere, so it says nothing on either point. Its publish path is a tag-triggered workflow holding `nuget push`. Verbatim: `SKILL.md` line 288: "REL=$(git grep -l -e 'nuget push' -- "$CIF" | head -n 1); : "${REL:?MISSING R..." and line 397: "The tag push starts the release workflow, the only publishing path." A workflow using staged publishing would not match the `nuget push` grep and would hit the `MISSING REL` guard, which fails loudly rather than silently.

Smallest change that would make the target true on 2026-11-27: none is required for dotnet-releaser (the skill never names it). For staged publishing, add one sentence near `SKILL.md` line 288: "A workflow that uploads with `dotnet package stage push` (spelling unverified, NuGet 8.0 notes say `dotnet nuget stage push`) does not match this grep; staged publishing is opt-in and not covered here." Do not add a command to a rule until `dotnet package stage push --help` has been run on SDK 11.0.100.
