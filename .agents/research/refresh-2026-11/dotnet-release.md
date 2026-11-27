---
title: dotnet-release spillover round, 2026-11-27
target: dotnet-release
date: 2026-11-27
model: opus
consolidates:
  - /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/dotnet-release/spillover-check.md
---

# dotnet-release spillover round

## Verdict

- Apply item 1. NuGet 8.0.0 (SDK 11.0.100) and the 7.9.x backport no longer read `SOURCE_DATE_EPOCH` during pack, and `DeterministicTimestamp` now defaults to `false`. The primary evidence is the pack targets file on `dev` and `release/7.9.x` and NuGet.Client#7652. The first round of this refresh already changed CS-PKG-05 in `dotnet-build-reference/packaging.md` to pass the commit time both ways: `T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack ... -p:DeterministicTimestamp=$T`. This skill still packs with the variable alone in four commands and states twice that the variable is the only reproducible setting. Those six places change in place to match CS-PKG-05.
- Change nothing for dotnet-releaser 0.24.1. The fix is confirmed by its release page, but the skill never names dotnet-releaser, so no statement in it is wrong.
- Change nothing for staged publishing. The command spelling is unconfirmed, and the existing `MISSING REL` guard already fails loudly on a workflow without `nuget push`.
- Keep every step ID, R-row ID and anti-pattern number as it is. Add no new step and no new rule.
- No first-round edit touched `skills/dotnet-release/`. These edits build on CS-PKG-05 as the first round left it.
- Bump: patch, for corrected facts only. The skill is procedural and has no reference-skill pair of its own.
- Budgets: `SKILL.md` has 499 body lines and keeps that count, because every edit replaces text inside an existing line. `references/library-steps.md` (404 lines) keeps its table of contents and its line count.

## Changed statements

### SKILL.md step 4 (pack command)

- Old: `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" ...`
- New: `T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" ... -p:DeterministicTimestamp="$T" ...`
- Verification: step 7 prints `clone pack exit 0` and `reproducible`, which is CS-PKG-05's block `repro` applied to the release tree. The property form on SDK 10.0.404 and 11.0.100 is `unverified: not run`, as the CS-PKG-05 row records.

### library-steps.md R5 (release-workflow checklist)

- Old: "`SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts`"
- New: "`T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack src/Acme.Lib -c Release -o artifacts -p:DeterministicTimestamp=$T`"
- Verification: unchanged, the R5 check (exit 0 and `ls artifacts/*.snupkg`), and R9 equal digests.

### library-steps.md step 7 (prose and clone command)

- Old: "A fixed `SOURCE_DATE_EPOCH` is the only setting that gives byte-identical nupkgs"
- New: "A fixed commit time passed as both `SOURCE_DATE_EPOCH` and `-p:DeterministicTimestamp` is the only setting that gives byte-identical nupkgs"
- The clone pack command gains `T=$(git log -1 --format=%ct) &&` before the variable and `-p:DeterministicTimestamp="$T"` on the pack.
- Verification: unchanged, `clone pack exit 0` and `reproducible`.

### library-steps.md example workflow, Pack step

- The single-line `run:` gains `T=$(git log -1 --format=%ct);` first and `-p:DeterministicTimestamp=$T` on the pack, so the workflow example matches R5.
- Verification: R5 and R9 of the same file.

### library-steps.md anti-pattern 12

- Old: "wall clock. Only `SOURCE_DATE_EPOCH` gives equal digests (step 7, CS-PKG-05)."
- New: "wall clock. Only the commit time in Unix seconds passed as `-p:DeterministicTimestamp`, with `SOURCE_DATE_EPOCH` for SDK 10.0.401, gives equal digests (step 7, CS-PKG-05)."
- Verification: step 7 `reproducible`.

### Unchanged on purpose

- `SKILL.md` line 51, "SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`", is still a true dated measurement.
- `SKILL.md` anti-pattern row 5 and CS-PKG-02 still ban `DeterministicTimestamp=true`, which is the wall clock. A Unix-seconds value is a different setting, so the ban and the new pack form do not conflict.

## New rules

None.

## Declined

- Staged publishing (`dotnet package stage push` against `dotnet nuget stage push`). The spelling is unconfirmed. The NuGet 8.0 release notes (primary) say `dotnet nuget stage push`, and the .NET Blog post (vendor blog, secondary) says `dotnet package stage push`. Nobody has run either command. The feature is opt-in, `dotnet nuget push` still works, and a workflow without `nuget push` already stops at the `MISSING REL` guard in step 8. The dotnet-build round also left this as an open question. Revisit once `--help` has been run on SDK 11.0.100.
- dotnet-releaser 0.24.1 (Trusted Publishing key expiring before the push). This is confirmed by its release page, but the skill never names dotnet-releaser, so there is nothing to correct.

## Sources

- https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets (read 2026-11-27): `DeterministicTimestamp` defaults to `false`, and no line mentions `SOURCE_DATE_EPOCH`.
- https://raw.githubusercontent.com/NuGet/NuGet.Client/release/7.9.x/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets (read 2026-11-27): identical on both points.
- https://github.com/NuGet/NuGet.Client/pull/7652 (merged 2026-08-27, backport #7661): "Customers will need to either set `DeterministicTimestamp` to `true` or a specific timestamp to use the feature."
- https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 (page date 2026-11-06): deterministic timestamps are opt-in again, and the page names `dotnet nuget stage push`.
- https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/ (2026-11-17, secondary): names `dotnet package stage push`.
- https://github.com/xoofx/dotnet-releaser/releases: release 0.24.1, "Fix NuGet trusted publishing key expiring before publication".
- CS-PKG-05 in `skills/dotnet-build-reference/packaging.md`, as the first round of this refresh left it.

## Revision log

- 2026-11-27: spillover round from the dotnet-build pair. Six in-place edits align the pack commands and the reproducibility statements with CS-PKG-05. Two items were declined. No IDs were added or renumbered.

### Edit list (spillover round)

1. File: `skills/dotnet-release/SKILL.md`
   Find:
   ```
   SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" --tl:off --interactive false -nologo -v:q > "$LOGS/pack.log" 2>&1; echo "pack exit $?"
   ```
   Replace with:
   ```
   T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" -p:DeterministicTimestamp="$T" --tl:off --interactive false -nologo -v:q > "$LOGS/pack.log" 2>&1; echo "pack exit $?"
   ```

2. File: `skills/dotnet-release/references/library-steps.md`
   Find:
   ```
   | R5 | `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts` (`GITHUB_ACTIONS=true` is set by the runner) |
   ```
   Replace with:
   ```
   | R5 | `T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack src/Acme.Lib -c Release -o artifacts -p:DeterministicTimestamp=$T` (`GITHUB_ACTIONS=true` is set by the runner) |
   ```

3. File: `skills/dotnet-release/references/library-steps.md`
   Find:
   ```
   A fixed `SOURCE_DATE_EPOCH` is the only setting that gives byte-identical nupkgs
   ```
   Replace with:
   ```
   A fixed commit time passed as both `SOURCE_DATE_EPOCH` and `-p:DeterministicTimestamp` is the only setting that gives byte-identical nupkgs
   ```

4. File: `skills/dotnet-release/references/library-steps.md`
   Find:
   ```
   ( cd "$R/clone" && SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$R/out" --tl:off --interactive false -nologo -v:q > "$R/pack.log" 2>&1; echo "clone pack exit $?" )
   ```
   Replace with:
   ```
   ( cd "$R/clone" && T=$(git log -1 --format=%ct) && SOURCE_DATE_EPOCH=$T timeout 900 dotnet pack src/Acme.Lib -c Release -o "$R/out" -p:DeterministicTimestamp="$T" --tl:off --interactive false -nologo -v:q > "$R/pack.log" 2>&1; echo "clone pack exit $?" )
   ```

5. File: `skills/dotnet-release/references/library-steps.md`
   Find:
   ```
           run: SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts --tl:off --interactive false -nologo -v:q
   ```
   Replace with:
   ```
           run: T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack src/Acme.Lib -c Release -o artifacts -p:DeterministicTimestamp=$T --tl:off --interactive false -nologo -v:q
   ```

6. File: `skills/dotnet-release/references/library-steps.md`
   Find:
   ```
       wall clock. Only `SOURCE_DATE_EPOCH` gives equal digests (step 7, CS-PKG-05).
   ```
   Replace with:
   ```
       wall clock. Only the commit time in Unix seconds passed as `-p:DeterministicTimestamp`, with `SOURCE_DATE_EPOCH` for SDK 10.0.401, gives equal digests (step 7, CS-PKG-05).
   ```
