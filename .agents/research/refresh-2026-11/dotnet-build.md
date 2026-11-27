---
title: dotnet-build delta refresh, 2026-10-11 to 2026-11-27
pair: dotnet-build
date: 2026-11-27
window_start: 2026-10-11
model: opus
consolidates:
  - .agents/research/refresh-2026-11/dotnet-build/release-train-and-support-dates.md
  - .agents/research/refresh-2026-11/dotnet-build/sdk-cli-msbuild-roslyn-behaviour.md
  - .agents/research/refresh-2026-11/dotnet-build/analyzer-packs-and-analysis-level.md
  - .agents/research/refresh-2026-11/dotnet-build/nuget-client-restore-and-pack.md
  - .agents/research/refresh-2026-11/dotnet-build/nuget-org-and-publish-pipeline.md
  - .agents/research/refresh-2026-11/dotnet-build/recent-shifts.md
revises:
  - .agents/research/csharp-build.md
  - .agents/research/csharp-packaging.md
---

# dotnet-build delta refresh

## Verdict

- Correct CS-PKG-05 in place, both the rule and its `repro` block. NuGet 8.0.0 (SDK 11.0.100) and the 7.9.x backport for a later 10.0.4xx patch no longer read `SOURCE_DATE_EPOCH` during pack, and `DeterministicTimestamp` now defaults to `false` (NuGet.Client#7652 and #7661, plus the pack targets file on `dev` and `release/7.9.x`). The release pack therefore passes the commit time both as the variable, which SDK 10.0.401 honoured when measured, and as `-p:DeterministicTimestamp`. The property form has not been run, and the row says so.
- Rewrite every "SDK 11 RC1" sentence that describes what an unpinned machine picks (CS-BUILD-20, CS-BUILD-21) so it names the newest installed SDK. The RC1 result stays as a dated measurement. SDK 11.0.100 has been GA since 2026-11-10. The sentences that state a measured RC1 result (CS-BUILD-04, CS-BUILD-10) keep it and gain the GA fact.
- Put .NET 8 and 9 support in the past tense. Give the `net11.0` ban the reason it lacked: net11.0 needs SDK 11, which a `latestFeature` pin on SDK 10 cannot reach, and .NET 11 (STS) ends support on 2028-11-14, the same day as .NET 10, so there is no lifetime argument either way.
- Keep `10.0-all` as the pin. The rationale now names the full `11.0` set of eight new CA rules, so a bump commit lists all eight and not only the five seen on RC1.
- Bump `Meziantou.Analyzer` from 3.0.297 to 3.0.342 in CS-BUILD-15 and in `Directory.Packages.analyzers.props`. The README rule table diff between the two tags adds only MA0243 to MA0245, which `MeziantouAnalysisMode=None` leaves off, and no ID is removed or renamed. Keep `Microsoft.VisualStudio.Threading.Analyzers` at 18.7.23, because 18.12.1 adds analyzers whose IDs could not be read. The row says why.
- Re-date the CA1034 extension-block false positive to SDK 10, since the SDK 11 analyzers fix it. Re-source CS-BUILD-22 from Microsoft's breaking-change note in place of a commit hash. Record that Polyfill 12.0.0 still closes none of the three gaps (CS-BUILD-06).
- Add no new rule. The NU5052 `PackageId` shape, the `minPublishAgeHours` source policy, staged publishing and the `DOTNET_TEST_RUNNER` override are each either opt-in, already blocked by an existing rule, or not yet settled upstream. They go to open questions.
- Rule bump: patch, for corrected facts only. Skill bump: patch (`packaging.md` CS-PKG-05 and the analyzer props pin). `SKILL.md` is untouched.
- The rule file is already 229 lines, over the 200-line rule budget, and was over it before this window. Every edit here changes text inside an existing line and adds no line. Reorganising the file is out of scope for a delta.

## Changed rules

### CS-BUILD-02 (rationale only)

- Old: "a net9 consumer resolves the `net8.0` asset and net9 ends support the same day as net8 (2026-11-10); net462 ends 2027-01-13;"
- New: "a net9 consumer resolves the `net8.0` asset and net9 ended support the same day as net8 (2026-11-10; net8.0 stays shippable for the consumers still on it and leaves only at a major, CS-BUILD-08); net11.0 needs SDK 11, which a `latestFeature` pin on SDK 10 cannot select (CS-BUILD-20), and .NET 11 (STS) ends support on 2028-11-14, the same day as .NET 10; net462 ends 2027-01-13;"
- Verification: unchanged, block `tfm-allow`.
- Source: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core and https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json (read 2026-11-27); https://learn.microsoft.com/en-us/dotnet/core/tools/global-json (definition of `latestFeature`).

### CS-BUILD-04 (rationale only)

- Old: "`latest` is 14 on SDK 10 and 15 on SDK 11 RC1 for the same project;"
- New: "`latest` is 14 on SDK 10 and 15 on SDK 11 for the same project (RC1 measured 2026-10-11; C# 15 shipped with SDK 11.0.100 on 2026-11-10);"
- Verification: unchanged, blocks `lang-case` and `langversion`.
- Source: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 and https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version.

### CS-BUILD-06 (rationale only)

- Old: "the three gaps still fail with Polyfill 11.4.3."
- New: "the three gaps still fail with Polyfill 11.4.3 (measured), and the Polyfill 12.0.0 source (2026-11-21) adds none of them (read 2026-11-27)."
- Verification: unchanged, block `ns20-pack`.
- Source: https://github.com/SimonCropp/Polyfill/releases and the tag 12.0.0 source tree.

### CS-BUILD-10 (rationale only)

- Old: "A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028);"
- New: "A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028), and the `11.0` set that SDK 11.0.100 ships adds eight rules, those five plus CA1878, CA2026 and CA2267, all of which a bump commit lists (dotnet/sdk analyzer release file, read 2026-11-27);"
- Verification: unchanged, block `analysislevel` and the `AnalysisMode` grep.
- Source: https://raw.githubusercontent.com/dotnet/sdk/main/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Unshipped.md, cross-checked against the learn.microsoft.com CA rule index; https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#analysislevel (a numeric level locks the set).

### CS-BUILD-12 (rule text, one sentence)

- Old: "CA1034 on C# 14 `extension(...)` blocks is a known false positive (SDK 10.0.401): suppress it at the site."
- New: "CA1034 on C# 14 `extension(...)` blocks is a known false positive on SDK 10 (measured 10.0.401; the SDK 11 analyzers fix it, read 2026-11-27): suppress it at the site while the build runs on SDK 10."
- Verification: unchanged, block `suppress-scan`.
- Source: https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk ("Analyzer bug fixes" table).

### CS-BUILD-15 (rule text and rationale)

- Old (rule): "`Meziantou.Analyzer` 3.0.297 with"
- New (rule): "`Meziantou.Analyzer` 3.0.342 with"
- Old (rationale): "Versions read 2026-10-11."
- New (rationale): "Versions read 2026-10-11, Meziantou.Analyzer re-read 2026-11-27 (3.0.342 adds MA0243 to MA0245, which `None` leaves off); Threading 18.12.1 adds analyzers whose IDs were not read, so 18.7.23 stays until a build lists them."
- Verification: unchanged (block `packs` prints `6`, the `MeziantouAnalysisMode` grep prints one line). After the edit, `grep -c 'Meziantou.Analyzer" Version="3.0.342"' skills/dotnet-build-reference/checks/Directory.Packages.analyzers.props` prints `1`.
- Source: https://api.nuget.org/v3-flatcontainer/meziantou.analyzer/index.json, the 3.0.297 and 3.0.342 README rule tables, https://github.com/microsoft/vs-threading/releases/tag/v18.12.1.

### CS-BUILD-20 (rationale only)

- Old: "No `global.json`, a version-less `allowPrerelease: true` and `latestMajor` all select SDK 11 RC1;"
- New: "No `global.json`, a version-less `allowPrerelease: true` and `latestMajor` all select the newest installed SDK (11.0 RC1 when measured on 2026-10-11, the 11.0.100 GA since 2026-11-10);"
- Verification: unchanged, block `global-json`.
- Source: https://learn.microsoft.com/en-us/dotnet/core/tools/global-json; https://builds.dotnet.microsoft.com/dotnet/release-metadata/11.0/releases.json.

### CS-BUILD-21 (rationale only)

- Old: "is ignored with exit 0 and the build runs on SDK 11 RC1;"
- New: "is ignored with exit 0 and the build runs on the newest installed SDK (11.0 RC1 when measured, 2026-10-11);"
- Verification: unchanged, blocks `sdk-assert` and `setup-dotnet`.
- Source: same as CS-BUILD-20.

### CS-BUILD-22 (rationale only)

- Old: "`dnx` on SDK 10.0.3xx/4xx and 11 runs the newest installed SDK, ignoring `global.json` by design, and floats the tool version (read 2026-10-11, dotnet/sdk commit cf67b96)."
- New: "The `dnx` script from SDK 10.0.302, 10.0.400 and 11 on runs the newest installed SDK, ignoring `global.json` by design, and floats the tool version (Microsoft breaking-change note \"dnx scripts bypass global.json SDK selection\", read 2026-11-27)."
- Verification: unchanged, the `dnx` grep (it also catches `dotnet dnx`, which still floats the tool version).
- Source: https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json; https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-exec.

### CS-PKG-05 (rule, rationale, verification and the `repro` block)

- Old (rule): "Pack releases as `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK 10.0.401 or newer, with `GITHUB_ACTIONS=true` (CS-PKG-03)."
- New (rule): "Pack releases with the commit time passed both ways, `T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack ... -p:DeterministicTimestamp=$T`, on SDK 10.0.401 or newer, with `GITHUB_ACTIONS=true` (CS-PKG-03)."
- Old (rationale): "A fixed timestamp is the only setting that gives a byte-identical nupkg and snupkg across clones. SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`, and 11.0 RC1 is still non-identical by default (measured 2026-10-11)."
- New (rationale): adds that SDK 10.0.401 honoured the variable, that NuGet 8.0.0 (SDK 11.0.100) and its 7.9.x backport for a later 10.0.4xx patch no longer read it and default `DeterministicTimestamp` to `false`, and that the Learn deterministic-packages page saying otherwise predates the change. The two measured sentences stay.
- New (verification): the existing measurement is labelled as variable-only on SDK 10.0.401, and the property form on 10.0.404 and 11.0.100 is marked `unverified: not run`.
- `repro` block: each pack sets `T` once and passes it as `SOURCE_DATE_EPOCH` and as `-p:DeterministicTimestamp="$T"`. The `EQUAL` test is unchanged.
- Agent-error row 5 also names `SOURCE_DATE_EPOCH` used without the property.
- Severity: SHOULD, unchanged.
- Source: https://github.com/NuGet/NuGet.Client/pull/7652 (and its commits "Make deterministic pack opt-in", "Don't use SOURCE_DATE_EPOCH automatically"), https://github.com/NuGet/NuGet.Client/pull/7661, https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets, https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0, https://github.com/NuGet/Home/issues/15050.

## New rules

None. These candidates were declined:

- NU5052 `PackageId` shape in CS-PKG-01. nuget.org has rejected non-standard IDs since 2026-07-15, which is before the baseline, and an agent picks an ASCII dotted ID without being told. Under unconditional warnings-as-errors the SDK 11 warning fails pack loudly, not silently.
- `minPublishAgeHours` in CS-BUILD-27. It is opt-in. Restore does not enforce it for fixed versions, and the NU1020 trap needs a floating version, which CS-BUILD-23 already bans.
- Staged publishing in CS-PKG-11 and CS-PKG-12. The command spelling is contradicted between the NuGet 8.0 notes and the blog, and no exemplar uses it.
- Unsetting `DOTNET_TEST_RUNNER` in the gate. The variable exists only on SDK 11, a mismatch fails the gate rather than passing it, and the gate is quoted verbatim by `csharp-quality`.

## Confirmed unchanged

- .NET 8 and 9 ended support on 2026-11-10, as dated. .NET Framework 4.6.2 still ends 2027-01-13. No 10.0.5xx band exists, and 10.0.404 is the newest SDK.
- NuGet 7.9.0 ships in SDK 10.0.400, so the `packaging.md` binding line still holds for 10.0.401. NuGet 7.10 and 7.11 are Visual Studio only.
- `latestFeature` cannot reach SDK 11. `errorMessage`, `paths` and `test.runner` are documented from SDK 10.
- `--disable-build-servers` and `--tl` are still accepted by `dotnet build`. The MSBuild server default on SDK 11 makes keeping the flag the safe choice.
- `.slnx` is the default on SDK 10 and SDK 11. dotnet/roslyn#41640 is still open, so the IDE0005 claim in CS-BUILD-14 stands.
- `NuGetAuditMode` still defaults to `direct` without a net10+ TFM. The audited-count properties, `NuGetAuditSuppress`, `auditSources` and NU1900 to NU1905 are unchanged.
- Source mapping is still bypassed by a warm global-packages folder. Locked mode, NU1510 and pruning, and the transitive-pinning nuspec leak are unchanged.
- `DeterministicTimestamp=true` is still the wall clock (the `PackageBuilder` parse). The default symbol format is still `.symbols.nupkg`, and the symbol server accepts only snupkg. NU3043 is still an error on SDK 10.
- BannedApiAnalyzers 5.6.0, PublicApiAnalyzers 5.6.0, IDisposableAnalyzers 4.0.8 and MinVer 8.0.0 are still the newest stable versions. Every posture MA, IDISP and VSTHRD ID still exists. `PolyArgumentExceptions` is unchanged. MinVer still sets `AssemblyVersion` to `major.0.0.0`.
- Trusted Publishing is unchanged: `NuGet/login` v1.2.0 is at the pinned SHA, the key lives 1 hour and is single-use, `user:` is the profile name, and `id-token: write` sits on the job. `img.shields.io` and `raw.githubusercontent.com` are still allow-listed. dotnet-validate 0.0.1-preview.582 is still the latest. Strong naming still has no benefit on .NET Core/5+. setup-dotnet 6.1.0 does not change `global-json-file`.
- The NuGet 8.0 change that stops restore from searching the global packages folder for a "next best" version cannot alter a gate that restores into an empty folder.

## Open questions

- Owner decision: should the CS-BUILD-01 default for a greenfield library become `net10.0` now that .NET 8 is out of support? The Severity section lists the floor as an owner default, so it is not changed here. CS-BUILD-08 already permits the removal at a major.
- NETSDK1138 after 2026-11-10: does a `net8.0` Exe (an MTP test project) now warn, and does that fail the gate under warnings-as-errors? The doc does not yet list 8 or 9. Re-measure: `dotnet build -warnaserror 2>&1 | grep NETSDK1138` on 10.0.404 with a net8.0 Exe and a net8.0 library.
- Re-measure the binding line on SDK 10.0.404 and 11.0.100: the invalid `global.json` exit 0, the exit 155 without `errorMessage`, MSB1001 on the MTP branch, `--interactive` defaulting on, and `dotnet test --tl:off` on SDK 11, which now forwards `--tl` to MSBuild and may no longer exit 5.
- Run fixture A from the NuGet artifact. It packs in four modes on 10.0.401, 10.0.404 and 11.0.100, and confirms that the property form gives `EQUAL` and that the variable alone does not on 11.0.100. Also find the first 10.0.4xx patch that carries NuGet.Client#7661.
- Threading 18.12.1: read the IDs and default severities of the ThreadStatic and redundant-state-machine analyzers, build once at each version, and then decide the bump.
- Check the eight-rule `11.0` list against the `analysislevel_11_all.globalconfig` file shipped in SDK 11.0.100. It was read from `main`, not from the GA tag.
- `DOTNET_TEST_RUNNER` on SDK 11 overrides `global.json` `test.runner`, and the gate picks its test branch from `global.json` alone.
- Staged publishing: the `push-gate` block does not see `dotnet package stage push`. Confirm the verb spelling (`dotnet package stage` against `dotnet nuget stage`) on 11.0.100 before any rule cites it.
- The MSBuild server default on SDK 11 is stated two ways by two Microsoft pages. Re-measure with a process listing after a build.
- Whether a Trusted Publishing policy scoped to a not-yet-existing package ID can publish v0.1.0. This needs one live push.
- The rule body is over the 200-line budget (229 lines) from before this window, so a future restructure has to move depth into the reference skill.

## Revision log

- CS-BUILD-02: net9 end of support in the past tense, the net8.0 keep reason, and a net11.0 ban reason added.
- CS-BUILD-04: the `latest` = 15 claim extended from SDK 11 RC1 to the SDK 11 GA.
- CS-BUILD-06: the Polyfill 12.0.0 source read added, with the three gaps still open.
- CS-BUILD-10: the full eight-rule `11.0` list added beside the five measured on RC1.
- CS-BUILD-12: the CA1034 false positive scoped to SDK 10, since SDK 11 fixes it.
- CS-BUILD-15: the Meziantou.Analyzer pin moved from 3.0.297 to 3.0.342, and the reason Threading stays at 18.7.23 recorded.
- CS-BUILD-20 and CS-BUILD-21: "SDK 11 RC1" replaced by "the newest installed SDK", with RC1 kept as the measurement.
- CS-BUILD-22: re-sourced to the breaking-change note, and the introducing versions named.
- CS-PKG-05: the commit time passed as `-p:DeterministicTimestamp` as well as `SOURCE_DATE_EPOCH`, with the rationale, verification, `repro` block and agent-error row 5 updated.
- Rule intro: .NET 8 and 9 end of support in the past tense, and the unmeasured 10.0.404 and 11.0.100 builds named.
- `packaging.md` intro: the unmeasured 10.0.404 and 11.0.100 (NuGet 8.0.0) builds named.
- `Directory.Packages.analyzers.props`: the Meziantou pin and the version-read comment updated.
- Spillover round (items from csharp-quality): no change to the rule or the skill; all three items checked and the target already correct.

## Edit list

Each find and replace text sits alone in a fenced `text` block, verbatim, with no surrounding quotes.


1. File `rules/dotnet-build.md`. Find:
   ```text
   only. Windows, macOS and arm64 rows are `unverified: read only`. .NET 8 and 9 end support on 2026-11-10.
   ```
   Replace with:
   ```text
   only. Windows, macOS and arm64 rows are `unverified: read only`. SDK 10.0.404 and the SDK 11.0.100 GA (both 2026-11-10) are not measured. .NET 8 and 9 ended support on 2026-11-10.
   ```

2. File `rules/dotnet-build.md`. Find:
   ```text
   a net9 consumer resolves the `net8.0` asset and net9 ends support the same day as net8 (2026-11-10); net462 ends 2027-01-13;
   ```
   Replace with:
   ```text
   a net9 consumer resolves the `net8.0` asset and net9 ended support the same day as net8 (2026-11-10; net8.0 stays shippable for the consumers still on it and leaves only at a major, CS-BUILD-08); net11.0 needs SDK 11, which a `latestFeature` pin on SDK 10 cannot select (CS-BUILD-20), and .NET 11 (STS) ends support on 2028-11-14, the same day as .NET 10; net462 ends 2027-01-13;
   ```

3. File `rules/dotnet-build.md`. Find:
   ```text
   `latest` is 14 on SDK 10 and 15 on SDK 11 RC1 for the same project;
   ```
   Replace with:
   ```text
   `latest` is 14 on SDK 10 and 15 on SDK 11 for the same project (RC1 measured 2026-10-11; C# 15 shipped with SDK 11.0.100 on 2026-11-10);
   ```

4. File `rules/dotnet-build.md`. Find:
   ```text
   the three gaps still fail with Polyfill 11.4.3.
   ```
   Replace with:
   ```text
   the three gaps still fail with Polyfill 11.4.3 (measured), and the Polyfill 12.0.0 source (2026-11-21) adds none of them (read 2026-11-27).
   ```

5. File `rules/dotnet-build.md`. Find:
   ```text
   A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028);
   ```
   Replace with:
   ```text
   A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028), and the `11.0` set that SDK 11.0.100 ships adds eight rules, those five plus CA1878, CA2026 and CA2267, all of which a bump commit lists (dotnet/sdk analyzer release file, read 2026-11-27);
   ```

6. File `rules/dotnet-build.md`. Find:
   ```text
   CA1034 on C# 14 `extension(...)` blocks is a known false positive (SDK 10.0.401): suppress it at the site.
   ```
   Replace with:
   ```text
   CA1034 on C# 14 `extension(...)` blocks is a known false positive on SDK 10 (measured 10.0.401; the SDK 11 analyzers fix it, read 2026-11-27): suppress it at the site while the build runs on SDK 10.
   ```

7. File `rules/dotnet-build.md`. Find:
   ```text
   `Meziantou.Analyzer` 3.0.297 with
   ```
   Replace with:
   ```text
   `Meziantou.Analyzer` 3.0.342 with
   ```

8. File `rules/dotnet-build.md`. Find:
   ```text
   Versions read 2026-10-11. |
   ```
   Replace with:
   ```text
   Versions read 2026-10-11, Meziantou.Analyzer re-read 2026-11-27 (3.0.342 adds MA0243 to MA0245, which `None` leaves off); Threading 18.12.1 adds analyzers whose IDs were not read, so 18.7.23 stays until a build lists them. |
   ```

9. File `rules/dotnet-build.md`. Find:
   ```text
   No `global.json`, a version-less `allowPrerelease: true` and `latestMajor` all select SDK 11 RC1;
   ```
   Replace with:
   ```text
   No `global.json`, a version-less `allowPrerelease: true` and `latestMajor` all select the newest installed SDK (11.0 RC1 when measured on 2026-10-11, the 11.0.100 GA since 2026-11-10);
   ```

10. File `rules/dotnet-build.md`. Find:
    ```text
    is ignored with exit 0 and the build runs on SDK 11 RC1;
    ```
    Replace with:
    ```text
    is ignored with exit 0 and the build runs on the newest installed SDK (11.0 RC1 when measured, 2026-10-11);
    ```

11. File `rules/dotnet-build.md`. Find:
    ```text
    `dnx` on SDK 10.0.3xx/4xx and 11 runs the newest installed SDK, ignoring `global.json` by design, and floats the tool version (read 2026-10-11, dotnet/sdk commit cf67b96).
    ```
    Replace with:
    ```text
    The `dnx` script from SDK 10.0.302, 10.0.400 and 11 on runs the newest installed SDK, ignoring `global.json` by design, and floats the tool version (Microsoft breaking-change note "dnx scripts bypass global.json SDK selection", read 2026-11-27).
    ```

12. File `skills/dotnet-build-reference/packaging.md`. Find:
    ```text
    0.0.1-preview.582, every pack watched on `net8.0;net10.0`. SDK 8.0.425 and 11.0 RC1 appear only where a row names them.
    ```
    Replace with:
    ```text
    0.0.1-preview.582, every pack watched on `net8.0;net10.0`. SDK 8.0.425 and 11.0 RC1 appear only where a row names them; SDK 10.0.404 and 11.0.100 (NuGet 8.0.0), both released 2026-11-10, were not measured.
    ```

13. File `skills/dotnet-build-reference/packaging.md`. Find:
    ```text
    | CS-PKG-05 | Pack releases as `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK 10.0.401 or newer, with `GITHUB_ACTIONS=true` (CS-PKG-03). | A fixed timestamp is the only setting that gives a byte-identical nupkg and snupkg across clones. SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`, and 11.0 RC1 is still non-identical by default (measured 2026-10-11). | Block `repro` prints `EQUAL`. Watched red and green (measured 2026-10-11): two clones packed 2 s apart gave no `EQUAL` without the variable and `EQUAL` with it; a clone whose pack failed printed `FAILED pack in b` and an empty artifacts folder printed no `EQUAL`. | SHOULD |
    ```
    Replace with:
    ```text
    | CS-PKG-05 | Pack releases with the commit time passed both ways, `T=$(git log -1 --format=%ct); SOURCE_DATE_EPOCH=$T dotnet pack ... -p:DeterministicTimestamp=$T`, on SDK 10.0.401 or newer, with `GITHUB_ACTIONS=true` (CS-PKG-03). | A fixed timestamp is the only setting that gives a byte-identical nupkg and snupkg across clones. SDK 10.0.401 honoured `SOURCE_DATE_EPOCH` (measured 2026-10-11); NuGet 8.0.0 (SDK 11.0.100) and its 7.9.x backport for a later 10.0.4xx patch no longer read the variable and default `DeterministicTimestamp` to `false`, so only the property fixes the time there (NuGet.Client#7652 and #7661, NuGet 8.0 release notes, read 2026-11-27; the Learn deterministic-packages page that says otherwise predates the change). SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`, and 11.0 RC1 is still non-identical by default (measured 2026-10-11). | Block `repro` prints `EQUAL`. Watched red and green (measured 2026-10-11, SDK 10.0.401, variable only): two clones packed 2 s apart gave no `EQUAL` without the variable and `EQUAL` with it; a clone whose pack failed printed `FAILED pack in b` and an empty artifacts folder printed no `EQUAL`. The property form on SDK 10.0.404 and 11.0.100 is `unverified: not run`. | SHOULD |
    ```

14. File `skills/dotnet-build-reference/packaging.md`. Find:
    ```text
    # repro (CS-PKG-05): clone twice into different directories (a, b);
    ```
    Replace with:
    ```text
    # repro (CS-PKG-05): clone twice into different directories (a, b), each pack taking the commit time as SOURCE_DATE_EPOCH and as DeterministicTimestamp;
    ```

15. File `skills/dotnet-build-reference/packaging.md`. Find:
    ```text
    SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) GITHUB_ACTIONS=true dotnet pack "${PACK:?MISSING PACK}" -c Release -o artifacts > pack.log 2>&1)
    ```
    Replace with:
    ```text
    T=$(git log -1 --format=%ct) && SOURCE_DATE_EPOCH=$T GITHUB_ACTIONS=true dotnet pack "${PACK:?MISSING PACK}" -c Release -o artifacts -p:DeterministicTimestamp="$T" > pack.log 2>&1)
    ```

16. File `skills/dotnet-build-reference/packaging.md`. Find:
    ```text
    | 5 | Presents `DeterministicTimestamp=true` as reproducible packaging. |
    ```
    Replace with:
    ```text
    | 5 | Presents `DeterministicTimestamp=true`, or `SOURCE_DATE_EPOCH` without the property, as reproducible packaging. |
    ```

17. File `skills/dotnet-build-reference/checks/Directory.Packages.analyzers.props`. Find:
    ```text
    <GlobalPackageReference Include="Meziantou.Analyzer" Version="3.0.297" />
    ```
    Replace with:
    ```text
    <GlobalPackageReference Include="Meziantou.Analyzer" Version="3.0.342" />
    ```

18. File `skills/dotnet-build-reference/checks/Directory.Packages.analyzers.props`. Find:
    ```text
    Versions read 2026-10-11; a bump is its own commit that lists the new rule IDs (CS-BUILD-10).
    ```
    Replace with:
    ```text
    Versions read 2026-10-11, Meziantou.Analyzer 3.0.342 re-read 2026-11-27; a bump is its own commit that lists the new rule IDs (CS-BUILD-10).
    ```

## Spillover round

Input: `dotnet-build/spillover-check.md`, three items carried over from the csharp-quality refresh. Three are confirmed by a primary source, none is unconfirmed, and all three are already correct in the target.

### Verdict

- No edit to `rules/dotnet-build.md` or to any file under `skills/dotnet-build-reference/`. Each confirmed fact either does not touch text the target contains or agrees with the text the first round wrote.
- Rule bump and skill bump from this round: none. The first-round patch bumps stand unchanged.
- ID check: no rule or step ID is added or changed, so no ID in the CS-BUILD or CS-PKG families is consumed.

### Changed rules

None.

### New rules

None.

### Declined

- Item 1, `pull_request_target` blocked by default in public repositories from 2026-12-02, and workflow lockfiles (`.github/workflows/actions.lock`) generally available from 2026-10-28. Confirmed by primary source, but the target says nothing about either. The rule routes workflow authoring to `csharp-quality` (CS-CI), which owns the change. CS-PKG-11 pins the publish action to a 40-hex SHA, which a lockfile does not contradict.
- Item 2, `AnalysisLevel=latest` resolving to the .NET 11 rules at GA, CA1876 at suggestion level in .NET 11, and the analyzer pins. Confirmed by primary source for the `latest` fix and CA1876. CS-BUILD-10 states a measured RC1 result and the `11.0` rule list, and neither is contradicted. The optional sentence that `latest` resolves to the `11.0` set at GA is declined: it describes a level the rule forbids, an agent needs it for nothing, and the rule body is already over its 200-line budget. The CS-BUILD-15 pins (Meziantou.Analyzer 3.0.342, Threading 18.7.23 with the reason) match the latest releases read. The CA1877 severity and the MA0053 narrowing in Meziantou.Analyzer 3.0.307 are secondary only (taken from the originating pair's notes, not re-read), and the target makes no claim about either.
- Item 3, Microsoft.Testing.Platform 3.0.0 removing `--no-ansi` and `--no-progress`. Confirmed by primary source, but 3.0.0 is unreleased (latest release 2.5.3, 2026-11-11), the target passes neither flag, and CS-BUILD-30 passes only dotnet CLI flags (`--tl:off --interactive false`). The allow-list fix belongs to the artifact that owns DN-RULE-02, once 3.0.0 ships.

### Sources (spillover round)

No change was made, so no change carries a source row. These primary sources back the declines:

| Item | Source | Read |
|---|---|---|
| 1 | https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 | 2026-11-27 |
| 1 | https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available | 2026-11-27 |
| 2 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | 2026-11-27 |
| 2 | https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1876 | 2026-11-27 |
| 2 | https://github.com/microsoft/vs-threading/releases | 2026-11-27 |
| 2 | https://github.com/meziantou/Meziantou.Analyzer/releases | 2026-11-27 |
| 3 | https://raw.githubusercontent.com/microsoft/testfx/main/docs/Changelog-Platform.md | 2026-11-27 |

### Edit list (spillover round)

Empty. No file in the target changes in this round.
