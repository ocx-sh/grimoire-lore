---
title: "csharp-build: target reach, the analyzer gate, and SDK/restore pinning (consolidated)"
topic: csharp-build
model: claude-opus-5-5
consolidates:
  - csharp-build/csharp-build-tfm-reach.md
  - csharp-build/csharp-build-analyzer-gate.md
  - csharp-build/csharp-build-sdk-and-restore-pinning.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-build-and-gates.md
  - csharp-topic-map.md
date: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-build/ (re-run with run-all.sh)
---

# csharp-build: target reach, the analyzer gate, and SDK/restore pinning

This file is the source for the `dotnet-build` rule (index plus the depth files `analyzers.md` and `sdk-and-restore.md`) and for the analyzer depth that `csharp-quality` cites. Every rule below carries its verification command. "Watched" means the check was observed failing on a planted bad fixture and passing on its fixed twin. Sub-artifact verification IDs are cited as `tfm#N`, `gate:VN` and `pin:VN`; consolidation probes are `C1`–`C5` (see the end of the ruleset).

## Verdict

1. **The TFM is decided by the owner's consumer answer, never by "reach".** Modern .NET covers all 8 ocx targets (win, osx, linux, linux-musl, each x64 and arm64). netstandard2.0 adds runtimes such as .NET Framework, Mono and Unity, but no OS or CPU ([tfm-reach §1–2](csharp-build/csharp-build-tfm-reach.md)). Map the owner's answer to a TFM string as follows:
   - **If .NET Framework and Unity hosts are out of scope:** `net8.0;net10.0` for any release published before 2026-11-10, or while a named net8 consumer exists; `net10.0` otherwise.
   - **If they are in scope:** `netstandard2.0;net8.0;net10.0`, plus a `net472` Windows test leg.
   - **If those hosts need only the data types:** split the package into `Ocx.Models` (`netstandard2.0`) and an engine on `net8.0;net10.0`.
   - **Until the owner answers:** use `net8.0;net10.0`. It needs no polyfill. Both other answers are a one-line edit away: add ns2.0, or drop net8.
2. **The SDK's first release will probably land after net8 EOS, which makes `net10.0` the probable end state.** No ocx release carries the machine-interface contract yet ([ocx-cli-contract §0](csharp-audit/ocx-cli-contract.md)). .NET 8 and 9 end support on 2026-11-10. This is a timing fact for the owner, not a guess at their answer.
3. **Pin every value that would otherwise float:**
   - SDK `10.0.401` (`latestFeature`, no prereleases)
   - `LangVersion 14`
   - `AnalysisLevel 10.0-all`
   - exact analyzer package versions
   - `NuGetAuditMode all`

   Measured: SDK 11 RC1 turns a floating `latest-all` into 5 new errors on clean code (gate:V1). An unpinned directory builds on 11 RC1 (pin:V1).
4. **TreatWarningsAsErrors is unconditional, Debug included.** An agent's "done" signal is a local Debug build (gate:V2).
5. **The only exemption from TreatWarningsAsErrors is the six NuGet audit codes, NU1900–NU1905.** A separate audit job turns them back into errors.
6. **Never pass `-warnaserror` on the command line.** C2 measured it overriding the audit exemption, so an advisory-feed outage fails the build.
7. **The analyzer posture is one diffable file set:** `Directory.Build.props`, `Directory.Packages.props`, `.globalconfig`, `.editorconfig` and `BannedSymbols.txt`. It was built together for the first time here, on `net8.0;net10.0` and on `netstandard2.0` (C1, C3). Only two third-party packs are used: BannedApiAnalyzers and VS.Threading.Analyzers.
8. **No lock file for the library.** The SDK has zero runtime NuGet dependencies on net8+ ([python-sdk-digest §11 #3](csharp-audit/python-sdk-digest.md)), and its dev dependencies use exact versions. A lock file would add NU1004 churn on every TFM or SDK edit and buy no determinism (pin:V7–V10, V24).

**Conflicts resolved (each with its reason):**
- **TWAE scope.** The analyzer-gate wanted it unconditional; simple-exec gates it on Release; the exemplar audit recommends "Release or CI only".
  - **Decision:** unconditional. Measured: the same tree exits 0 with 83 warnings in Debug and exits 1 with 82 errors when the switch is on (gate:V2).
- **The `WarningsNotAsErrors` property.** analyzer-gate rule 7 bans it; pinning rule 16 requires it for NU190x.
  - **Decision:** allow it only with audit codes as its value.
  - **Reason:** the TreatWarningsAsErrors *property* does reach NuGet restore, which contradicts analyzer-gate's "compiler only" reading of the docs. With only NU1901–NU1904 exempt, an outage makes NU1900/NU1905 fail the restore (pin:V14). C5 watches the allow-list check.
- **The CI gate command.** tfm-reach used `dotnet build -c Release -warnaserror`; analyzer-gate used `dotnet build -c Release --no-incremental`.
  - **Decision:** the latter, with no `-warnaserror`.
  - **Reason:** C2 measured `-warnaserror` overriding `WarningsNotAsErrors`: NU1900/NU1905 become errors and the build exits 1 on an audit outage.
- **The global.json `rollForward` value.** tfm-reach rule 20 said `latestPatch`; pinning said `latestFeature`.
  - **Decision:** `latestFeature` (`disable` only if lock files are ever adopted).
  - **Reason:** both values stay on SDK 10, since `latestFeature` cannot reach 11 (pin:V3). `latestPatch` also rejects a newer 10.0 feature band with exit 155. That band holds nothing back now: the analysis level is pinned separately (gate:V1), so a band change cannot move the rule set.
- **The bulk severity line.** The exemplar audit's "gate block" pattern and simple-exec use `.globalconfig` `dotnet_analyzer_diagnostic.severity = warning`.
  - **Decision:** forbidden.
  - **Reason:** under `All` it is a no-op for CA rules, and it silently widens IDE rules on future SDKs (gate:V3, §10).
- **Lock files and locked mode.** The exemplar audit pattern #3 and xunit/simple-exec use them; pinning says no lock file for a library.
  - **Decision:** no lock file (Verdict 8).
  - **Revisit when:** any of pinning's four flip conditions becomes true. These are in rule CS-BUILD-25.
- **Banning `ProcessStartInfo.Arguments` (analyzer-gate) while Polyfill builds `Arguments` internally on ns2.0 (tfm-reach §4).** There is no conflict. C3 measured the polyfill source as exempt: green on ns2.0 with `ArgumentList`. A hand-written `Arguments =` still fails on all three TFMs.

## The ruleset

Prefix `CS-BUILD`. Verification commands run from the repo root on bash.

### Target frameworks

**CS-BUILD-01 (MUST): declare the TFM list only in `Directory.Build.props`; no csproj sets `TargetFramework(s)`.**
- **Rationale:** with one source, a floor bump is a one-line edit and not a hunt.
- **Verify:** `grep -rnE --include='*.csproj' '<TargetFrameworks?>' .` prints nothing.
- **Watched:** yes (tfm#15).

**CS-BUILD-02 (MUST): ship only the TFMs on the allow-list.**
- **The allow-list:** `net8.0`, `net10.0`, and `netstandard2.0` under CS-BUILD-03.
- **Never ship:** `netstandard2.1`, `netstandard1.x`, `net5.0`/`net6.0`/`net7.0`/`net9.0`, `net461`/`net462`.
- **Rationale:**
  - ns2.1 is not implemented by .NET Framework.
  - 6.0 and 7.0 are EOL.
  - A net9 consumer resolves the net8.0 asset (measured), and net9 ends on the same day as net8.
  - net462 ends 2027-01-13.
  - Libraries never get the SDK's EOL warning: NETSDK1138 fires for an Exe only (tfm#14).
- **Verify:** `grep -rnE --include='*.csproj' --include='*.props' -e 'netstandard2\.1' -e 'netstandard1\.' -e 'net(5|6|7|9)\.0' -e 'net46[12]' .` prints nothing. Also commit tfm-reach's `gate.sh` as `eng/tfm-gate.sh`, with the project paths adjusted, and run `bash eng/tfm-gate.sh .`, which must exit 0.
- **Watched:** gate.sh yes (tfm#10); the grep no.

**CS-BUILD-03 (MUST): add `netstandard2.0` only for a named consumer class, and only with a test leg that executes it.**
- **Named consumer classes:** .NET Framework 4.7.2+ apps, Unity, and MSBuild-task hosts. List the class in the README.
- **The test leg:** `net472` on a Windows runner. Every other shipped TFM also needs a test TFM.
- **Rationale:**
  - ns2.0 adds runtimes, never OSes.
  - A net8 test run never loads the ns2.0 assembly. In Anthropic's SDK, a guard compiled for ns2.0 silently disabled 429 retries (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:28`).
- **Verify:** `bash eng/tfm-gate.sh .` exits 0. It prints `FAIL: netstandard2.0 shipped but tests have no net472 leg` on the red twin.
- **Watched:** yes (tfm#10).

**CS-BUILD-04 (MUST): pin `<LangVersion>14</LangVersion>` in `Directory.Build.props`, and build with SDK ≥ 10.**
- **Never set:** `latest`, `preview`, `latestMajor` or `default`.
- **C# 14 on `net8.0` is a recorded decision:** use compile-only features only (`field`, `extension` blocks, `?.=`). The compiler itself refuses runtime-bound features (`CS9240`).
- **Rationale:**
  - `latest` resolves to 14 on SDK 10 and to 15 on SDK 11 for the same project (tfm#17).
  - SDK 8 rejects `14` with CS1617 (tfm#8).
  - Without the pin, the net8 leg defaults to C# 12, and shared C# 14 source fails there (tfm#3).
- **Verify:**
  - `grep -rnE --include='*.csproj' --include='*.props' '<LangVersion>(latest|preview|latestMajor|default)<' .` prints nothing.
  - `find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:LangVersion` prints `14` for each project.
- **Watched:** yes (tfm#3, #8, #9, #17; C1 builds net8.0 at 14).

**CS-BUILD-05 (MUST): write `#if NET8_0_OR_GREATER`, never `#if NET8_0`; never `#if` away behaviour.**
- Use `NETSTANDARD2_0` only to mean "this is the ns2.0 build", and only around an equivalent implementation.
- **Rationale:** `NET8_0` is false on the net10.0 build, so the fallback branch compiles there (measured `FALLBACK path`).
- **Verify:** `grep -rnP --include='*.cs' '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+|NETCOREAPP[0-9]_[0-9])\b' src` prints nothing.
- **Watched:** yes (tfm#12).

**CS-BUILD-06 (MUST, only when ns2.0 ships): follow the netstandard2.0 packaging rules.**
- Use Polyfill with `PrivateAssets="all"`. Add `<PolyArgumentExceptions>true</PolyArgumentExceptions>` if `ThrowIfNull` is used.
- Never `PolyPublic`, and never hand-roll a `public class IsExternalInit`.
- Condition every compat package on `'$(TargetFramework)' == 'netstandard2.0'`: `Microsoft.Bcl.TimeProvider`, `System.Text.Json`, `Microsoft.Bcl.AsyncInterfaces`.
- Condition `IsAotCompatible`, `IsTrimmable` and `EnableTrimAnalyzer` with `IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0')`.
- Design around the three gaps no polyfill clears: `StandardInputEncoding`, `System.Formats.Tar` (no NuGet package; NU1101) and array ranges `a[1..]`.
- **Rationale:**
  - Without `PrivateAssets="all"`, the polyfill packages leak as nuspec dependencies (tfm#11).
  - The trim and AOT properties are silently inert on ns2.0 (tfm#16).
  - The three gaps above still fail with Polyfill 11.4.3 (tfm#5).
- **Verify:**
  - `dotnet pack -c Release -o artifacts && unzip -p artifacts/*.nupkg '*.nuspec' | grep -i -e polyfill -e polysharp` prints nothing.
  - `unzip -p artifacts/*.nupkg '*.nuspec' | grep -A3 'targetFramework="net10.0"' | grep -c '<dependency'` prints `0`.
- **Watched:** leak yes (tfm#11); polyfill coverage yes (tfm#5); coexistence with BannedSymbols yes (C3).

**CS-BUILD-07 (MUST): select the ocx binary by `RuntimeInformation.OSArchitecture` plus the OS, never by `ProcessArchitecture`, `Environment.Is64BitProcess` or `IntPtr.Size`.**
- Any OS/arch outside the 8 targets throws a typed unsupported-platform error that names them. This covers 32-bit Windows, linux-arm and FreeBSD.
- This is a code rule; its home is `csharp-quality/platform-and-paths.md`. It is kept here because this group measured it.
- **Rationale:** a 32-bit net472 host on x64 Windows reports `ProcessArchitecture=X86` (→ `win-x86`, which ocx does not ship), yet spawns the x64 `ocx.exe` fine.
- **Verify:** `grep -rnE --include='*.cs' -e 'ProcessArchitecture' -e 'Is64BitProcess' -e 'IntPtr\.Size' src` prints nothing.
- **Watched:** yes (tfm#13, on the Windows host).

**CS-BUILD-08 (SHOULD): never remove a TFM in a patch release.**
- Add a new LTS when it ships.
- Remove a TFM only after its end-of-support date (read from the support-policy page, never from memory), and only at a major version (0.x: a minor).
- Prove the removal with a throwaway consumer on that TFM that gets NU1202.
- **Rationale:** removal fails restore for those consumers (tfm#6, #7).
- **Verify:**
  - `git diff -U0 origin/main -- Directory.Build.props | grep -E '^-.*TargetFrameworks'` is non-empty only in a PR that also changes the major version.
  - The consumer probe prints `error NU1202`.
- **Watched:** NU1202 yes; the diff check no.

### The analyzer gate (the diffable file set; built green and red in C1)

The reference files are the props block and the configs in `consolidate-csharp-build/posture/`: `Directory.Build.props`, `Directory.Packages.props`, `.globalconfig`, `.editorconfig`, `BannedSymbols.txt` and `nuget.config`.

**CS-BUILD-10 (MUST): pin `<AnalysisLevel>10.0-all</AnalysisLevel>` once, in the root `Directory.Build.props`.**
- No `AnalysisMode` alongside it; a per-category `AnalysisMode<Category>` is the only allowed sibling.
- Bump the level in a dedicated commit after listing the new rule IDs. Use `comm -13 <(grep '^dotnet_diagnostic' analysislevel_10_all.globalconfig | sort) <(grep '^dotnet_diagnostic' analysislevel_11_all.globalconfig | sort)` in the SDK's `Sdks/Microsoft.NET.Sdk/analyzers/build/config`.
- **Rationale:**
  - A floating level broke clean code with 5 new errors on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028).
  - Without an explicit level, each TFM leg gets its own rule set (CA2022 fired on net10.0 only).
  - Typo'd values (`10.0-allx`, `10.0.401-all`) build with exit 0 and no CA rules.
- **Verify:** `find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:AnalysisLevel | grep -vE '^[0-9]+\.0-all$'` prints nothing.
- **Watched:** yes (gate:V1, V7, V13; C4 for the regex check).

**CS-BUILD-11 (MUST): set severities only per rule, with `dotnet_diagnostic.<ID>.severity`.**
- Never use `dotnet_analyzer_diagnostic.severity` or `dotnet_analyzer_diagnostic.category-*`.
- **Rationale:** under `All` the SDK file has a per-rule line for every rule, so bulk lines are ignored (`severity = none` left 33 diagnostics at 33). Bulk lines also widen IDE rules on future SDKs.
- **Verify:** `grep -rnE --include='.globalconfig' --include='.editorconfig' '^dotnet_analyzer_diagnostic' .` prints nothing.
- **Watched:** yes (gate:V3).

**CS-BUILD-12 (MUST): suppress at the site, never project-wide.**
- No analyzer ID goes in `NoWarn`.
- Repo-wide `none` is limited to CA1062, CA1308, CA1716, CA1303 and VSTHRD003. Each needs a `#` reason line directly above it.
  - CA1062 only while every project is `Nullable=enable`.
  - CA1308 because OCI refs are lowercase.
- Every other suppression is `#pragma warning disable <ID> // <reason>` … `restore`.
- Known site-level false positive: CA1034 on C# 14 `extension(...)` blocks (SDK 10.0.401).
- **Rationale:** `NoWarn` hides an ID in every file and records no reason. These five were the only API-shaped findings that were wrong for an ocx wrapper.
- **Verify:**
  - `grep -rnE --include='*.props' --include='*.csproj' --include='*.targets' '<NoWarn>[^<]*(CA|IDE|RS|VSTHRD|MA|SA|RCS)[0-9]' .` prints nothing.
  - `grep -rnE --include='*.cs' '#pragma warning disable [A-Za-z0-9, ]+$' src` prints nothing.
  - `awk 'prev !~ /^#/ && /severity *= *none/ {print FILENAME": "FNR} {prev=$0}' .globalconfig` prints nothing.
- **Watched:** the five-ID set yes (gate:V2 green, V6 CA1034); the greps no.

**CS-BUILD-13 (MUST): turn warnings into errors from the props, never from the command line.**
- Set `TreatWarningsAsErrors=true` unconditionally in the root props. No `Configuration`, `$(CI)` or `ContinuousIntegrationBuild` condition.
- The only `WarningsNotAsErrors` entries are NU1900–NU1905 (CS-BUILD-26).
- Never `CodeAnalysisTreatWarningsAsErrors=false`, `-warnaserror`, `-p:TreatWarningsAsErrors=false` or `-p:WarningLevel=0`.
- **Rationale:**
  - A Debug build must fail where CI fails (gate:V2).
  - `-warnaserror` overrides the audit exemption, so an advisory-feed outage fails the build (C2).
- **Verify:**
  - `find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -p:Configuration=Debug -getProperty:TreatWarningsAsErrors` prints only `true`.
  - `find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:WarningsNotAsErrors | tr ';' '\n' | grep -v '^$' | grep -vE '^NU190[0-5]$'` prints nothing.
  - `grep -rnE -e '-warnaserror|TreatWarningsAsErrors=false|CodeAnalysisTreatWarningsAsErrors|WarningLevel=0' .github eng` prints nothing.
- **Watched:** yes (gate:V2, C2, C5).

**CS-BUILD-14 (MUST): set the doc and style properties that make CS1591 and the IDE rules visible at build.**
- Set `Nullable=enable`, `GenerateDocumentationFile=true` and `EnforceCodeStyleInBuild=true` in the root props.
- Put IDE0005, IDE0055 and IDE0161 at `warning` in `.editorconfig`.
- CS1591 stays an error in `src/`. Test projects set `GenerateDocumentationFile=false` instead of `NoWarn CS1591`.
- **Rationale:**
  - IDE0005 is silent at the CLI without the doc file (dotnet/roslyn#41640).
  - The SDK's XML docs are its discoverable contract; 19/35 exemplars mute CS1591.
  - CS1591 is not reported while any other error exists: rerun until `0 Error(s)` before judging docs.
- **Verify:**
  - `grep -rn --include='*.props' --include='*.csproj' 'CS1591' src` prints nothing.
  - `grep -cE 'IDE0005\.severity *= *(warning|error)' .editorconfig` prints `1`.
- **Watched:** yes (gate:V9, V10).

**CS-BUILD-15 (MUST): use exactly two third-party packs, as `GlobalPackageReference` with exact versions in `Directory.Packages.props`.**
- **The packs:** `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0 and `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23.
- **`BannedSymbols.txt`** (registered as `AdditionalFiles`) bans these five symbols:
  - `P:System.DateTime.Now`
  - `P:System.DateTimeOffset.Now`
  - `P:System.Text.Encoding.Default`
  - `M:System.Diagnostics.Process.Start(System.String,System.String)`
  - `P:System.Diagnostics.ProcessStartInfo.Arguments`

  Each line carries a `;message` naming the replacement.
- **Never add:** StyleCop.Analyzers, Roslynator, `Microsoft.CodeAnalysis.NetAnalyzers` or FxCopAnalyzers.
- **Rationale:**
  - Nothing in the SDK's CA set catches `DateTime.Now`, string-built argv or `.Result`.
  - StyleCop added 70 style-only locations to a clean 870-line library; Roslynator's IDs duplicated CA rules.
  - The NetAnalyzers package replaces the SDK-bundled analyzers.
- **Verify:**
  - `grep -cE 'GlobalPackageReference Include="(Microsoft\.CodeAnalysis\.BannedApiAnalyzers|Microsoft\.VisualStudio\.Threading\.Analyzers)" Version="[0-9]+\.[0-9]+\.[0-9]+"' Directory.Packages.props` prints `2`.
  - `grep -rniE --include='*.props' --include='*.csproj' 'StyleCop\.Analyzers|Roslynator\.|NetAnalyzers|FxCopAnalyzers' .` prints nothing.
  - A planted `DateTime.Now` fails with `error RS0030` on every TFM.
- **Watched:** yes (gate:V2; C1 shows RS0030, CA2007 and VSTHRD200 on both net8.0 and net10.0; C3 on all three TFMs).

**CS-BUILD-16 (MUST): run the CI gate as two steps, in this order.**
1. `dotnet build -c Release --no-incremental -nologo` (the gate).
2. `dotnet format --verify-no-changes --no-restore` (the cheap second line).

Never use `dotnet format` alone.
- **Rationale:** `dotnet format` exited 0 on a tree containing `DateTime.Now`, because RS0030 has no code fix.
- **Verify:** `grep -rnE 'dotnet format .*--verify-no-changes' .github/workflows` has a hit in a workflow that also runs `dotnet build -c Release`.
- **Watched:** yes (gate:V8).

**CS-BUILD-17 (SHOULD): give a test-layer `.globalconfig` `global_level = 101`, and keep every config file at or above every `Compile` item's directory.**
- **Rationale:**
  - Equal levels emit `MultipleGlobalAnalyzerKeys` and *unset* the key.
  - Config files are found by walking up from the Compile items, not from the csproj, so a misplaced config silently applies to nothing.
- **Verify:**
  - `dotnet build 2>&1 | grep -c MultipleGlobalAnalyzerKeys` prints `0`.
  - `dotnet build -v:d 2>&1 | grep -o '/analyzerconfig:[^ ]*\.globalconfig' | sort -u` lists the repo's `.globalconfig`.
- **Watched:** yes (gate:V4, V5).

**CS-BUILD-18 (SHOULD): keep a canary project that must fail with `error CA2007`, and assert that failure in CI.**
- The canary is one file with `public static async Task A(Task t) { await t; }`.
- **Rationale:** besides a typo'd level, `RunAnalyzers=false` or `EnableNETAnalyzers=false` also turn the gate off with exit 0. Only a build that must fail proves the gate is on.
- **Verify:** `dotnet build tests/Canary/Canary.csproj 2>&1 | grep -c 'error CA2007'` prints a non-zero count, and the CI step fails on `0`.
- **Watched:** yes (gate:V13).

### SDK selection and restore

**CS-BUILD-20 (MUST): ship a root `global.json` with an exact three-part version, `latestFeature` and no prereleases.**
- The shape: `{"sdk":{"version":"10.0.401","rollForward":"latestFeature","allowPrerelease":false,"errorMessage":"Install .NET SDK 10.0.401 or a later 10.0 feature band: https://dotnet.microsoft.com/download/dotnet/10.0"}}`.
- Use `rollForward: disable` only together with committed lock files (CS-BUILD-25).
- **Rationale:**
  - No global.json, a version-less `allowPrerelease:true`, or `latestMajor` all select 11.0 RC1.
  - `latestFeature` cannot reach 11.
  - Without `errorMessage`, a missing SDK prints "application 'build' does not exist" (exit 155).
- **Verify:** `jq -e '(.sdk.version|test("^[0-9]+\\.[0-9]+\\.[0-9]+$")) and (.sdk.rollForward=="latestFeature" or .sdk.rollForward=="disable") and .sdk.allowPrerelease==false' global.json`
- **Watched:** yes (pin:V1–V3, V6).

**CS-BUILD-21 (MUST): assert the SDK at every entry point.**
- Every build entry point first runs `jq empty global.json && dotnet --version | grep -qE '^10\.0\.[0-9]+$'`.
- CI installs the SDK with `actions/setup-dotnet` `global-json-file: global.json`. A `dotnet-version: 8.0.x` line may only add the net8 *runtime* for test legs.
- **Rationale:** an invalid global.json is ignored with exit 0, and the build runs on SDK 11 RC1. Such files include a trailing comma, `"10.0"`, `"10.0.x"`, `"latestFeatur"`, `"SDK"` or `"false"` as a string. The only signal is an info-level NETSDK1057 that `-warnaserror` does not catch.
- **Verify:**
  - The assertion above exits 0.
  - `grep -rLn 'global-json-file' .github/workflows | xargs -r grep -ln 'dotnet '` prints nothing.
- **Watched:** yes (pin:V4).

**CS-BUILD-22 (MUST): never call `dnx`.**
- Run tools with `dotnet tool run` from `.config/dotnet-tools.json`, or with `dotnet tool exec <id>@<exact version>`.
- **Rationale:** `dnx` in SDK 10.0.3xx/4xx and 11 runs the newest installed SDK, ignoring global.json by design. It also floats the tool version.
- **Verify:** `grep -rnE '(^|[[:space:];&|(])dnx([[:space:]]|$)' .github eng` prints nothing.
- **Watched:** yes (pin:V5).

**CS-BUILD-23 (MUST): keep every package version in a root `Directory.Packages.props` (`ManagePackageVersionsCentrally=true`).**
- No `Version=` on any `PackageReference`.
- No floating `*` versions, and no `CentralPackageFloatingVersionsEnabled`.
- **Rationale:** NU1008 enforces one source of versions; floating versions silently diverge CI from a laptop.
- **Verify:** `grep -rnE --include='*.csproj' --include='Directory.Build.props' '<PackageReference[^>]*Version=' .` and `grep -nE 'Version="[^"]*\*|CentralPackageFloatingVersionsEnabled' Directory.Packages.props` both print nothing.
- **Watched:** yes (pin:V23, V7).

**CS-BUILD-24 (MUST): never enable `CentralPackageTransitivePinningEnabled` for a packable project.**
- For a non-packable project (tests, tools), set it in the project body or in `tests/Directory.Build.props`.
- Never set it behind `Condition="'$(IsPackable)' == 'false'"` in `Directory.Packages.props`.
- **Rationale:**
  - Pinned transitives become nuspec dependencies of the shipped library.
  - `Directory.Packages.props` is imported before the csproj body, so that condition is always false.
- **Verify:**
  - `grep -n 'CentralPackageTransitivePinningEnabled' Directory.Packages.props` prints nothing.
  - After `dotnet pack -c Release -o artifacts`, `unzip -p artifacts/*.nupkg '*.nuspec' | grep '<dependency '` lists only the intended dependencies. For the ocx SDK on net8+ that is none.
- **Watched:** yes (pin:V20, V21).

**CS-BUILD-25 (MUST): commit no `packages.lock.json` for the library.**
- **Switch to lock files only when one of these holds:**
  - a floating version exists;
  - an executable or tool ships from the repo;
  - NU1403 integrity is a stated requirement;
  - CI caching must key on a lock hash.
- **When on, adopt all of these together:**
  - `RestorePackagesWithLockFile=true` repo-wide;
  - `RestoreLockedMode` conditioned on `$(CI)`;
  - `rollForward: disable`;
  - every project has a tracked lock;
  - locks are regenerated in the same commit as any TFM, SDK or version edit.
- **Rationale:**
  - `--locked-mode` with no lock file passes, and even creates the file.
  - A TFM edit fails a locked restore with NU1004.
  - The value left, integrity and a frozen closure, does not pay for the churn when there are zero runtime dependencies and exact dev versions.
- **Verify:** `test "$(git ls-files '*packages.lock.json' | wc -l)" -eq 0` passes. If locks are on, the count equals `git ls-files '*.csproj' | wc -l` and `jq -e '.sdk.rollForward=="disable"' global.json` passes.
- **Watched:** yes (pin:V7–V10, V24).

**CS-BUILD-26 (MUST): set the NuGet audit explicitly and prove that it ran.**
- Set `NuGetAudit=true` and `NuGetAuditMode=all` explicitly in `Directory.Build.props`.
- Exempt NU1900–NU1905 from TWAE via `WarningsNotAsErrors`, except when `-p:AuditPipeline=true`. A dedicated CI audit job runs that and turns all six into errors.
- A `Directory.Solution.targets` assertion compares `RestoreProjectsAuditedCount` with `RestoreProjectCount`.
- Accept advisories only as `NuGetAuditSuppress Include="https://github.com/advisories/GHSA-…"`, with a comment giving the reason and the removal condition.
- **Never:** `NuGetAuditMode=direct`, `NuGetAudit=false`, or `NoWarn NU190x`.
- **Rationale:**
  - The mode defaults to `direct` on any project without a net10+ TFM.
  - Polly sets `direct` explicitly.
  - An audit-source outage must neither break builds nor silently switch audit off.
- **Verify:**
  - `for t in $(find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:TargetFrameworks | tr ';' ' '); do find src -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -p:TargetFramework=$t -getProperty:NuGetAuditMode; done | sort -u` prints only `all`.
  - `grep -rnE --include='*.props' --include='*.csproj' --include='*.targets' 'NuGetAudit(Mode)?>(false|direct)|NoWarn[^<]*NU190' .` prints nothing.
  - `CI=true dotnet restore -p:NuGetAudit=false` exits non-zero.
- **Watched:** yes (pin:V11–V16; C2 on the merged posture).

**CS-BUILD-27 (MUST): ship a root `nuget.config` that clears and maps every source, and restore in CI into an empty packages folder.**
- The `nuget.config`:
  - `<clear />` under `packageSources`;
  - a `<packageSourceMapping>` that maps every source, with pattern `*` on exactly one source;
  - `<auditSources><clear />` naming nuget.org.
- In CI, restore into an empty packages folder: `NUGET_PACKAGES=$RUNNER_TEMP/nuget`.
- **Rationale:**
  - Two unmapped sources resolved the attacker's `1.9.9`.
  - Mapping is fail-closed only on a cold cache: a warm global-packages folder bypasses it.
- **Verify:**
  - `grep -c '<clear />' nuget.config` is at least `2`.
  - `xmllint --xpath 'count(//packageSourceMapping/packageSource/package[@pattern="*"])' nuget.config` prints `1`.
  - `dotnet restore --packages "$(mktemp -d)"` exits 0.
- **Watched:** yes (pin:V17–V19).

**CS-BUILD-28 (SHOULD): fix NU1510 by deleting the redundant `PackageReference`.**
- `RestoreEnablePackagePruning=false` and `NoWarn NU1510` are forbidden.
- **Rationale:** under TWAE the warning fails restore on net10, and 5 corpus repos mute it while carrying dead references.
- **Verify:** `grep -rnE --include='*.props' --include='*.csproj' 'NU1510|RestoreEnablePackagePruning' .` prints nothing.
- **Watched:** yes (pin:V22).

**CS-BUILD-29 (SHOULD): keep exactly one solution file at the root, and make it `.slnx`.**
- **Rationale:** `.slnx` is the SDK 10 default. With two solution files, a bare `dotnet build` fails with MSB1011.
- **Verify:** `test "$(find . -maxdepth 1 \( -name '*.sln' -o -name '*.slnx' \) | wc -l)" -eq 1 && ls ./*.slnx`
- **Watched:** yes (pin:V21b).

**CS-BUILD-30 (SHOULD): make automation that parses `dotnet` output pass `--tl:off` (`-tl:off` for `dotnet msbuild`) and `--interactive false`.**
- **Rationale:**
  - A forced Terminal Logger injects OSC escapes into captured logs.
  - `--interactive` defaults on in interactive terminals since .NET 10, and a credential prompt blocks a pty-backed agent.
- **Verify:** `grep -rnE 'dotnet (build|test|restore|pack)' eng .github | grep -v -e '--tl:off' -e '-tl:off'` prints nothing for steps whose output is parsed.
- **Watched:** yes (pin:V27, V29).

### Verified in consolidation (fixture `consolidate-csharp-build/`, SDK 10.0.401, `bash run-all.sh`)

| ID | What | Red (observed) | Green (observed) |
|---|---|---|---|
| C1 | The merged file set gates both TFM legs | `red-planted/`: `dotnet build src/Lib/Lib.csproj -nologo --no-incremental` gives `error RS0030`, `error CA2007` and `error VSTHRD200` on both `[net8.0]` and `[net10.0]`; exit 1 | `posture/`: same command, `0 Warning(s) 0 Error(s)`, exit 0, `bin/Debug/{net8.0,net10.0}` |
| C2 | `-warnaserror` defeats the audit exemption | `audit-outage/` (auditSources → `http://127.0.0.1:18799`): `... --no-incremental -warnaserror` gives `error NU1900` and `error NU1905`, exit 1. `-p:AuditPipeline=true`: same errors, exit 1 (intended) | same tree without the switch: `warning NU1900`, `warning NU1905`, exit 0 |
| C3 | BannedSymbols coexists with Polyfill on ns2.0 | `ns20-arguments-red/` (`psi.Arguments = string.Join(...)`): `error RS0030` on `[netstandard2.0]`, `[net8.0]` and `[net10.0]`; exit 1 | `ns20-polyfill/` (`netstandard2.0;net8.0;net10.0`, Polyfill 11.4.3 `PrivateAssets=all`, `psi.ArgumentList.Add`): exit 0, no diagnostic from the polyfill source |
| C4 | The level-regex check catches the fail-open typos | `dotnet msbuild src/Lib/Lib.csproj -nologo -p:AnalysisLevel=10.0-allx -getProperty:AnalysisLevel \| grep -qE '^[0-9]+\.0-all$'` exits 1 (same for `10.0.401-all`) | the pinned value `10.0-all` gives exit 0 |
| C5 | The `WarningsNotAsErrors` allow-list check | `-p:WarningsNotAsErrors=CA1822` gives value `[CA1822]`, and the check fails | the default value `;NU1900;NU1901;NU1902;NU1903;NU1904;NU1905` passes |

## Applied to the ocx C# SDK

**New commitments (rules that shape the SDK's design):**
1. **TFMs follow Verdict 1; the default is `net8.0;net10.0`.** On net8+ the whole process and bootstrap path is in-box:
   - process: `ArgumentList`, `Kill(true)`, `WaitForExitAsync`, `StandardInputEncoding`;
   - bootstrap: `System.Formats.Tar`, `File.SetUnixFileMode`, `TimeProvider`.

   The SDK therefore ships with **zero NuGet dependencies** in its net8.0 and net10.0 groups (tfm-reach §3). Verify after pack: `unzip -p artifacts/*.nupkg '*.nuspec' | grep -c '<dependency'` prints `0` (CS-BUILD-24). The analyzer packs do not leak, because `GlobalPackageReference` is private.
2. **If the owner keeps ns2.0, the bootstrap cannot be built on it.**
   - ocx archives are `.tar.gz` everywhere except Windows `.zip` ([ocx-cli-contract §5](csharp-audit/ocx-cli-contract.md)).
   - `System.Formats.Tar` has no ns2.0 package (NU1101, tfm-reach §4).

   So the ns2.0 build must exclude the download/unpack path (locate-only), or take answer C (split). This is a design fork, and owner decision 3 (binary delivery) interacts with it.
3. **Secrets on stdin need a workaround on ns2.0.**
   - ocx takes secrets only on stdin: `login --password-stdin` and two `--identity-token-stdin` arguments ([ocx-cli-contract §4](csharp-audit/ocx-cli-contract.md)).
   - On ns2.0, `ProcessStartInfo.StandardInputEncoding` does not exist (CS-BUILD-06).

   The process runner must therefore write UTF-8 bytes to `StandardInput.BaseStream` on every TFM, rather than `#if`-ing an encoding setter (CS-BUILD-05). Doing the same on every TFM keeps one path.
4. **The argv contract is a build error, not a review comment.** ocx needs an argv list and never a shell ([ocx-cli-contract §8.2](csharp-audit/ocx-cli-contract.md)). Banning `ProcessStartInfo.Arguments` and `Process.Start(string,string)` turns a string-built call into `RS0030` on every TFM (C3).
5. **The clock and encoding seams the Python SDK relies on are enforced by the build.**
   - The ban on `DateTime.Now` makes the retry clock go through `TimeProvider` ([python-sdk-digest §11 #23](csharp-audit/python-sdk-digest.md)).
   - The ban on `Encoding.Default` makes the encoding explicit UTF-8 (digest #16).
   - VS.Threading's VSTHRD002 enforces the async-first surface (digest #19).
6. **Binary selection is a pure `(OSPlatform, OSArchitecture, libc) → triple` function, table-tested** (CS-BUILD-07; digest #32).
   - There is no win-x86 target. A 32-bit host on x64 Windows maps to `win-x64`.
   - True x86 Windows, linux-arm and FreeBSD each throw the typed unsupported-platform error ([ocx-cli-contract §5, §8.13](csharp-audit/ocx-cli-contract.md)).
7. **The build SDK is pinned to 10.0.401 even for the net8 leg,** because `LangVersion 14` needs it (CS-BUILD-04, CS-BUILD-20). CI installs the SDK from global.json and only adds the 8.0 runtime for the net8 test leg.

**What the Python SDK already models (keep):**
- Zero runtime dependencies, enforced by a test ([digest §0](csharp-audit/python-sdk-digest.md), `pyproject.toml:22`). The C# equivalent is the nuspec dependency count above.
- A strict static gate on `src` and a relaxed one on tests: pyright strict for src and standard for tests; ruff `ANN`/`D` waived for tests ([digest §7](csharp-audit/python-sdk-digest.md)). The C# equivalent is the `src`/`tests` split of CS-BUILD-13, -14 and -17.
- Actions pinned by SHA, plus `permissions: contents: read` (digest §7). These belong to the testing/release groups, and the posture here assumes them.
- The fail-closed bootstrap trust rules (digest §5). They need net7+ APIs, which is commitment 2.

**What the ocx CLI contract forces:**
- **The platform rules:** 8 targets with no win-x86, which drives CS-BUILD-07 and the TFM reach analysis.
- **The archive formats:** `.tar.gz` and `.zip`, which drive commitment 2.
- **The input rules:** an argv-only interface and secrets only on stdin, which drive commitments 3 and 4.
- **The timing fact:** the contract is unreleased ([ocx-cli-contract §0](csharp-audit/ocx-cli-contract.md)), which drives Verdict 2.

**Where the Python design must NOT be copied:**
- **A version matrix that mirrors the Python one.** Python tests 3.12, 3.13 and 3.14 ([digest §7](csharp-audit/python-sdk-digest.md)). The C# analogue is *not* `net8.0;net9.0;net10.0`: a net9 consumer resolves the net8.0 asset, so net9 adds a build and a leg but no reach (CS-BUILD-02).
- **Bootstrap via stdlib `tarfile` on every runtime.** The C# equivalent exists only on net7+. Do not try it on ns2.0 (commitment 2).
- **Lint breadth as the quality signal.** Ruff's breadth does not translate to StyleCop/Roslynator, which only add style noise (CS-BUILD-15). The C# gate is depth: `10.0-all` plus two semantic packs.
- **A CI matrix with no arm64 or Windows-contract leg** ([digest S5/S6](csharp-audit/python-sdk-digest.md)). In .NET, "all platforms" is a matrix property, not a TFM property. The matrix belongs to `csharp-quality/testing.md`, but CS-BUILD-03 and CS-BUILD-07 are unproven without it.

## AI-agent failure modes (ranked by how often they bite)

The rank comes from corpus frequency, which is how often an agent sees the pattern to imitate, plus how silent the failure is.

| # | What the agent does | Evidence of frequency | Check that catches it |
|---|---|---|---|
| 1 | Writes floating values: `<LangVersion>latest</LangVersion>`, `<AnalysisLevel>latest(-All)</AnalysisLevel>`, `dotnet-version: 8.0.x`, or a global.json with no version / `allowPrerelease: true` | `latest` LangVersion in 15/35 repos; 8 of the 10 repos that set AnalysisLevel use `latest`; 7 set `allowPrerelease:true` ([exemplar-build-and-gates §0](csharp-audit/exemplar-build-and-gates.md)) | CS-BUILD-04 and -10 getProperty checks; CS-BUILD-20 jq; CS-BUILD-21 `dotnet --version` regex |
| 2 | Gets the build green by suppressing: `NoWarn CS1591;CA2007`, `NoWarn NU1903`, `NoWarn NU1510`, `TreatWarningsAsErrors=false`, `NuGetAudit=false` | CS1591 muted in 19/35, NU1903 in 4, NU1510 in 5, audit off in stripe | CS-BUILD-12, -13, -14, -26 and -28 greps |
| 3 | Adds `netstandard2.0` (or 2.1) "for maximum compatibility" to a cross-platform wrapper | 26/34 libraries ship netstandard, the majority to imitate | CS-BUILD-02 allow-list and CS-BUILD-03 `tfm-gate.sh` (needs a named consumer and a net472 leg) |
| 4 | Gates TWAE on `Release` or `$(CI)`, so the Debug loop passes and CI fails | simple-exec's recipe; the exemplar audit lists it as a "pattern worth encoding" | CS-BUILD-13 `-p:Configuration=Debug -getProperty:TreatWarningsAsErrors` |
| 5 | Copies simple-exec's `dotnet_analyzer_diagnostic.severity = warning`, or bulk `category-*` lines, expecting them to raise or lower rules | simple-exec is the only `All`-mode exemplar, so agents copy it | CS-BUILD-11 grep (gate:V3) |
| 6 | Adds `-warnaserror` to CI "to be strict", so an audit-feed outage reds every build | tfm-reach's own procedure wrote it | CS-BUILD-13 grep over `.github eng` (C2) |
| 7 | Writes `"version": "10.0"` / `"10.0.x"` in global.json, or makes a typo. Both are ignored silently and the build runs on SDK 11 RC1 | the model generalises from `<TargetFramework>` | CS-BUILD-20 jq; CS-BUILD-21 `dotnet --version` |
| 8 | Concatenates arguments into `ProcessStartInfo.Arguments`, or calls `Process.Start("ocx", "install " + pkg)`, especially on ns2.0 because "ArgumentList isn't there" | the default shape in training data; nothing in the CA set flags it | CS-BUILD-15 BannedSymbols (C3) |
| 9 | Uses `#if NET8_0` to mean "net8 and later" | — | CS-BUILD-05 `grep -P` (tfm#12) |
| 10 | Picks the binary with `ProcessArchitecture` / `Is64BitProcess` / `IntPtr.Size`, or hard-codes an x86 fallback | — | CS-BUILD-07 grep (tfm#13) |
| 11 | Uses the wrong fix: "fixes" a vulnerable transitive with `CentralPackageTransitivePinningEnabled` in the shipped library, or conditions it on `IsPackable` in `Directory.Packages.props` | 8 of the 18 sampled clones enable it | CS-BUILD-24 nuspec dependency count |
| 12 | Adds `RestorePackagesWithLockFile` or `--locked-mode` without a committed lock, and believes a gate exists | the Anthropic SDK writes locks and enforces nothing | CS-BUILD-25 lock count |
| 13 | Adds Polyfill/PolySharp without `PrivateAssets="all"`, or hand-rolls a `public` `IsExternalInit` | — | CS-BUILD-06 nuspec grep (tfm#11) |
| 14 | Treats `dotnet format --verify-no-changes` as the analyzer gate | 4/35 repos run it; it reads like "lint" | CS-BUILD-16 (gate:V8) |
| 15 | Runs `dnx` in CI expecting global.json to apply | new in .NET 10; no corpus usage | CS-BUILD-22 grep |
| 16 | Tests source mapping on a warm cache and declares it works | — | CS-BUILD-27 `dotnet restore --packages "$(mktemp -d)"` |
| 17 | Hallucinates MSBuild properties: `RestoreUseLockFile`, `NuGetLockMode`, `NuGetAuditEnabled`, `AnalysisMode=AllEnabledByDefault` as a new value | — | `dotnet msbuild -getProperty:<the name>` returns empty for an invented name; the canary (CS-BUILD-18) |
| 18 | Reads a TWAE error list without CS1591 and concludes the docs are complete | CS1591 is suppressed while other errors exist | rerun until `0 Error(s)` (CS-BUILD-14) |

## Failure classes

| Class | Mechanism | Members | The check that catches the class |
|---|---|---|---|
| **F1 Float** | The value is resolved from the environment at build time, so the same commit builds differently | SDK selection without a pin, `dnx`; `LangVersion latest`; `AnalysisLevel latest`; the AnalysisLevel default following the TFM; the NuGetAuditMode default following the TFM; floating package versions; `dotnet-version: x.y.x` | Pin the value, then **read the effective value back**: `dotnet --version` regex, `dotnet msbuild -getProperty:{AnalysisLevel,LangVersion,NuGetAuditMode,TreatWarningsAsErrors}` per TFM (CS-BUILD-04, -10, -13, -20, -21, -26) |
| **F2 Fail-open config** | An invalid or misplaced setting is ignored with exit 0, and the gate silently disappears | global.json typos and wrong case; `AnalysisLevel` typos; bulk severities under `All`; `.globalconfig` above no Compile item; same-level globalconfig collision; `--locked-mode` without a lock; warm-cache mapping bypass; inert trim props on ns2.0; NETSDK1138 is Exe-only; CS1591 hidden behind errors; IDE0005 needing the doc file | **Assert the effect, not the setting:** the canary must fail (CS-BUILD-18), the audited-count assertion (CS-BUILD-26), cold-cache restore (CS-BUILD-27), the lock-count equality (CS-BUILD-25), and the level regex (C4) |
| **F3 Gate scope** | The gate covers too little, or too much | Release-only TWAE; project-wide `NoWarn`; per-TFM rule sets; `-warnaserror` catching audit-feed outages; `CodeAnalysisTreatWarningsAsErrors=false` | Debug `getProperty`, the `WarningsNotAsErrors` allow-list (C5), the no-`-warnaserror` grep (C2), and one explicit level for all legs (gate:V7) |
| **F4 Leak into the package** | A build-time choice becomes a consumer-visible dependency | Polyfill without `PrivateAssets`; transitive pinning; an unconditional `System.Text.Json`; pruning privatising a reference | Pack, then inspect: `unzip -p artifacts/*.nupkg '*.nuspec' \| grep '<dependency'` is empty for net8/net10 (CS-BUILD-06, -24) |
| **F5 Reach confusion** | A TFM or runtime fact is mistaken for an OS/CPU fact | ns2.0 "for all platforms"; `net9.0`; `#if NET8_0`; `ProcessArchitecture` selection; `#if`-ing behaviour away on ns2.0 | The TFM allow-list gate with a test leg per TFM (CS-BUILD-02, -03), the `grep -P` symbol check (CS-BUILD-05), and the OSArchitecture grep (CS-BUILD-07) |
| **F6 Resolution trust** | A package resolves from the wrong source, or with unverified bytes | Two sources without mapping (dependency confusion); no `<clear />` (machine sources inherited); tampered same-version package without a lock | The mapping plus `<clear />` plus a cold-cache restore (CS-BUILD-27). Add a lock file only if integrity is required (CS-BUILD-25) |

## Open questions

**Owner decisions (each blocks a rule's concrete value):**
1. **Consumer reach.** Are .NET Framework 4.7.2+ or Unity hosts in scope? The answer selects the TFM row in Verdict 1. If yes, decide whether those hosts need the engine (answer B: ns2.0 build is locate-only, with no bootstrap; commitment 2) or only the data types (answer C, split).
2. **Floor and timing.** Will SDK 0.1 publish before 2026-11-10, or does any named consumer need net8?
   - Given the unreleased ocx contract (topic-map owner decision 4), "no" is likely. The TFM is then `net10.0`, and CS-BUILD-04's "C# 14 on net8" decision disappears.
3. **LangVersion 14 on net8.0.** It is Microsoft-unsupported, but measured to work for compile-only features. Accept it (the default here), or pin `LangVersion 12` repo-wide while net8 ships? The cost of 12 is losing `field`, extension blocks and C# 13/14 features across the codebase.
4. **TWAE for human contributors.** Unconditional TWAE is chosen for agent loops. If humans co-develop, confirm that WIP-time failures are acceptable; there is no CI-only escape hatch by design.

**Subareas that deserve another research round:**
- **csharp-build-tfm-reach (ns2.0 branch only, if the owner answers "in scope").** Do Polyfill's `Process.Kill(bool entireProcessTree)` and `WaitForExitAsync` actually kill the tree and honour cancellation on .NET Framework 4.7.2/4.8? tfm#5 proved only that they compile. Also measure `RuntimeInformation.OSArchitecture` for a .NET Framework process under x64 emulation on Windows-on-Arm64 (tfm §9, not measured).
- **csharp-build-analyzer-gate, at .NET 11 GA (November 2026).** Re-diff `analysislevel_11_all.globalconfig` against RC1. CA1878 and CA2026 are listed but have not been seen firing. The diff should land before the dotnet-upgrade skill writes the `10.0-all → 11.0-all` bump. Also re-check whether CA1034 on extension blocks is fixed in a 10.0.x servicing band, so the site pragmas can go.
- **csharp-build-sdk-and-restore-pinning.** Measure the .NET 11 defaults (MSBuild server and NativeAOT CLI) for state leakage across an agent session's repeated `dotnet` invocations (pin §9, not exercised). It matters once SDK 11 is pinned.

## Sub-artifacts

- [csharp-build/csharp-build-tfm-reach.md](csharp-build/csharp-build-tfm-reach.md): the 8-target reach matrix, the ns2.0 compile-cost probe, polyfill coverage, NU1202 resolution, the WOW64/OSArchitecture proof on the Windows host, the decision table and the floor-bump procedure.
- [csharp-build/csharp-build-analyzer-gate.md](csharp-build/csharp-build-analyzer-gate.md): AnalysisMode sizes, severity precedence and the bulk-line no-op, the SDK 11 RC1 float break, fail-open levels, third-party pack measurements and the chosen posture files.
- [csharp-build/csharp-build-sdk-and-restore-pinning.md](csharp-build/csharp-build-sdk-and-restore-pinning.md): global.json resolution and silent fallbacks, `dnx`, CPM and transitive-pinning leak, lock-file costs, the NuGetAudit matrix and outage hole, source mapping and the warm-cache bypass, NU1510, slnx and Terminal Logger.

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting: "start with net8.0+", "consider" ns2.0.
2. https://learn.microsoft.com/en-us/dotnet/standard/net-standard: which runtimes implement ns2.0 and ns2.1; the 4.7.2+ recommendation.
3. https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core: .NET 8/9 EOS 2026-11-10, .NET 10 to 2028-11-14.
4. https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md: per-OS and per-arch reach for the 8 ocx targets.
5. https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version: a newer LangVersion than the TFM's is unsupported; do not use `latest`.
6. https://github.com/SimonCropp/Polyfill: the polyfilled API list, `PolyArgumentExceptions`, the visibility rules.
7. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview: AnalysisLevel/AnalysisMode, and the advice to pin.
8. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options: bulk severities ignored under AnalysisMode; precedence.
9. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files: `global_level` and collision behaviour.
10. https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md: the `BannedSymbols.txt` format.
11. https://learn.microsoft.com/en-us/dotnet/core/tools/global-json: matching rules, `rollForward`, `errorMessage`, the lock-file footnote.
12. https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages: the audit defaults, NU1900–NU1905, the audit-pipeline split, the audited-count assertion.
13. https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management: CPM, and "Transitive Pinning and Pack".
14. https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping: precedence and the global-packages-folder caveat.
15. https://github.com/dotnet/sdk/commit/cf67b960b0d90c4a8a84452f2dace93ab66e7fa3: `dnx` runs the newest SDK "despite any global.json".
