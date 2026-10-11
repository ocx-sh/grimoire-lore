---
title: "SDK selection, restore pinning and the audit gate: what makes CI and a laptop build the same thing"
topic: csharp-build / csharp-build-sdk-and-restore-pinning
agent: deep-dive researcher (sonnet), group "Target reach, the analyzer gate, and SDK/restore pinning"
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 22
scope: |
  Covers: global.json shape (version, rollForward, allowPrerelease, paths/errorMessage, test.runner), what the SDK picks when global.json is absent or invalid, dnx vs global.json, Central Package Management and transitive pinning (and what it does to a packed library), packages.lock.json and locked mode for a library, NuGetAudit mode/level/TWAE interplay, audit sources, package source mapping and its cache bypass, NU1510 pruning, .slnx, Terminal Logger and --interactive in CI. 22 web sources read (16 primary) plus 18 exemplar clones; 23 red/green pairs run on SDKs 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128.
  Not covered: analyzer severities and TWAE for compiler warnings (sibling subtopic), TFM choice (csharp-build-tfm-reach), package signing/SBOM/SourceLink, the MTP test-runner migration beyond the global.json switch, Windows-host behaviour (Linux/WSL toolchain only; no Windows claim here is load-bearing).
---

# SDK selection, restore pinning and the audit gate

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-sdk-and-restore-pinning/` (scripts in `scripts/`, transcripts in `scripts/*.out`). Local folder feeds only; nothing published. Exemplar cites are `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [SDK selection: what `dotnet` picks and how it silently picks wrong](#1-sdk-selection)
   2. [The global.json shape, with corpus numbers](#2-the-globaljson-shape)
   3. [`dnx` ignores global.json](#3-dnx-ignores-globaljson)
   4. [Central Package Management and transitive pinning in a library](#4-central-package-management-and-transitive-pinning)
   5. [Lock files and locked mode: is one right for a library](#5-lock-files-and-locked-mode)
   6. [NuGetAudit: mode, level, TWAE, sources, outage behaviour](#6-nugetaudit)
   7. [Package source mapping and the global-packages-folder bypass](#7-package-source-mapping)
   8. [NU1510 pruning (.NET 10)](#8-nu1510-pruning)
   9. [.slnx, Terminal Logger, `--interactive`, the MTP runner switch](#9-slnx-terminal-logger---interactive-and-the-mtp-switch)
   10. [Verified on the toolchain](#10-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Without a valid `global.json`, `dotnet` uses the highest installed SDK including previews; on this machine that is `11.0.100-rc.1.26425.128`. A repo must ship `global.json` ([docs](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json), V1).
- A `global.json` that is invalid JSON, has `"version": "10.0"` or `"10.0.x"`, or a typo in a `rollForward` value does not error. It is ignored and the build runs on the newest SDK, preview included (V4). Assert `dotnet --version` against a regex in CI.
- Default shape for a library repo: exact three-part `version`, `rollForward: latestFeature`, `allowPrerelease: false` (10 of 28 corpus repos use `latestFeature`). `latestFeature` and `latestMinor` can never cross to SDK 11; `latestMajor`, `major` and "no version" can (V3).
- `rollForward: disable` is the only value that keeps SDK and lock file in lockstep; use it if and only if lock files are committed ([docs footnote](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json), [dotnet/sdk#48795](https://github.com/dotnet/sdk/issues/48795)).
- `dnx` from SDK 10.0.3xx/4xx and 11.0 runs the newest installed SDK by design and ignores global.json (V5). Use `dotnet tool exec pkg@version` or a local tool manifest instead.
- Central Package Management is the baseline (22 corpus repos). `CentralPackageTransitivePinningEnabled` promotes pinned transitives into the **nuspec** of a packed library (V20); keep it off for packable projects and enable it only in non-packable ones.
- `Directory.Packages.props` cannot condition on a property the csproj body sets (`IsPackable`); the condition silently evaluates false (V21). Set pinning in a nearer `Directory.Build.props` or the project.
- A lock file adds three things a plain restore lacks: frozen transitive versions (V7), a content-hash integrity check (NU1403, V10) and a drift gate (NU1004, V8). Its costs are real: every TFM edit breaks locked restore (V9) and SDK-implicit packages change with SDK patches ([dotnet/sdk#48795](https://github.com/dotnet/sdk/issues/48795)). For a library with a handful of exact-version dev dependencies the default is **no lock file**; the decision flips on named conditions in finding 5.
- `--locked-mode` with no lock file present does not fail; with `RestorePackagesWithLockFile=true` it generates one (V24). The gate only exists where the lock file is committed.
- `NuGetAuditMode` defaults to `all` only when the project targets `net10.0` or higher; a `net8.0`-only project silently audits direct packages only (V12). Set it explicitly and prove it with `dotnet msbuild -getProperty:NuGetAuditMode` (V25).
- Under `TreatWarningsAsErrors`, an unreachable audit source turns NU1900 and NU1905 into errors even when NU1901-NU1904 are exempted (V14). The exemption list must be NU1900-NU1905, and a separate audit job makes them errors on purpose (V15).
- Prove audit actually ran: a `Directory.Solution.targets` assertion on `RestoreProjectsAuditedCount` fails when `NuGetAudit=false` sneaks in (V16).
- Package source mapping with a cold cache is fail-closed (NU1100/NU1102, V18/V19); with a warm global-packages folder the mapping is ignored (V19). Use an ephemeral or repo-scoped packages folder in CI.
- NU1510 fires on `net10.0` for any direct reference the shared framework already provides; under TWAE it breaks restore (V22). Remove the reference; 5 corpus repos mute it instead.
- `dotnet new sln` produces `.slnx` on SDK 10 and `.sln` on SDK 8 (V21b); two solution files in one directory make bare `dotnet build` fail with MSB1011.
- The `test.runner` section in global.json is harmless on SDK 8 (V26) and selects MTP mode on SDK 10; .NET 11 Preview 6+ adds `DOTNET_TEST_RUNNER` (RC1 flag).
- Terminal Logger is off automatically when stdout is redirected; a harness that forces `--tl:on` captures OSC escape sequences in the log (V27).

## Findings

### 1. SDK selection

**Rule from the docs.** "If no *global.json* file is found, or *global.json* doesn't specify an SDK version and doesn't specify an `allowPrerelease` value, the highest installed SDK version is used (equivalent to setting `rollForward` to `latestMajor`)", and outside Visual Studio prerelease SDKs are considered ([global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json), "Matching rules"). `allowPrerelease` defaults to `true` outside Visual Studio. With a version and no `rollForward`, the default is `patch`. The docs state the intended CI stance: "In CI scenarios, however, you typically want to specify an acceptable range for the SDK version".

**Where the files are searched.** The muxer starts at the current working directory; the MSBuild SDK resolver starts at the solution directory, else the project directory ([global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)). A command run from another directory can therefore see a different pin than the build it triggers.

**Measured (V1-V4, SDKs installed: 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128).**

| global.json (in a directory with no pin above it unless stated) | `dotnet --version` |
|---|---|
| none anywhere above | `11.0.100-rc.1.26425.128` (red) |
| `{"sdk":{"version":"10.0.401","rollForward":"latestPatch","allowPrerelease":false}}` | `10.0.401` |
| `{"sdk":{"allowPrerelease":false}}` (StackExchange.Redis shape) | `10.0.401` today; becomes SDK 11 the day 11.0.1xx GA is installed |
| `{"sdk":{"allowPrerelease":true}}` | `11.0.100-rc.1...` (red) |
| `{"sdk":{"version":"10.0.100","rollForward":"latestFeature"}}` | `10.0.401` |
| `{"sdk":{"version":"10.0.100","rollForward":"latestMinor","allowPrerelease":true}}` | `10.0.401` |
| `{"sdk":{"version":"10.0.100","rollForward":"latestMajor","allowPrerelease":true}}` (aspire shape) | `11.0.100-rc.1...` (red) |
| `{"sdk":{"version":"10.0.100","rollForward":"disable"}}` | error, exit 155: "A compatible .NET SDK was not found. Requested SDK version: 10.0.100" |

Note the error text on a missing pinned SDK is the misleading "The application 'build' does not exist or is not a managed .dll or .exe" followed by "A compatible .NET SDK was not found" (`scripts/00-sdk.out`). An agent that reads only the first line concludes the project file is broken.

**Silent failure modes (V4).** All of these run the build on SDK 11 RC1 with exit 0 and only an informational `message NETSDK1057` (not a warning, so `-warnaserror` does not catch it):

| global.json content | result |
|---|---|
| trailing comma (invalid JSON) | ignored, SDK 11 RC1; `dotnet --info` prints no `global.json file:` section at all |
| `"version": "10.0"` or `"10.0.x"` | ignored, SDK 11 RC1; `dotnet --info` shows `global.json file: Invalid [...] Version '10.0' is not valid for the 'sdk/version' value` |
| `"rollForward": "latestFeatur"` (typo) | ignored, SDK 11 RC1 |
| `"SDK": {...}` (wrong key case) | ignored, SDK 11 RC1 |
| `"allowPrerelease": "false"` (string) | ignored, SDK 11 RC1 |
| `"rollforward"` (wrong key case) with a version | key ignored, default `patch`, SDK 10.0.100 not found: error |

The docs show only the `10.0` case and say `dotnet --info` reports it ([global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json), "Examples"). The silent fallback for the other rows is measured here. Smallest mechanical guard: `dotnet --version` must match `^10\.0\.[0-9]+$` (no `-` suffix).

**SDK vs runtime.** global.json selects the SDK only; the target runtime is separate ([global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)). SDK 10.0.401 builds `net8.0` and runs net8.0 tests only when the 8.0 runtime is installed (the toolchain has runtimes 8.0.31 and 10.0.12).

**CI installation.** `actions/setup-dotnet@v6` accepts `global-json-file` and installs the SDK it names; it honours `rollForward` (and installs the pinned version exactly for prereleases) but does not support `allowPrerelease`, and `sdk.version` must be fully qualified ([setup-dotnet README](https://github.com/actions/setup-dotnet)). The Anthropic C# SDK exemplar instead passes `dotnet-version: '8.0.x'` in every job and ships no global.json (`anthropics__anthropic-sdk-csharp@ae16e5933f39:.github/workflows/ci.yml:34`), which floats within 8.0 and cannot build a net10 target: the opposite of a pin.

### 2. The global.json shape

Corpus (28 repos with a root global.json): `rollForward` latestFeature 10, latestMinor 5, unset 4, feature 2, latestMajor 2, patch 2, major 2, latestPatch 1; `allowPrerelease` true 7 / false 6 / unset 15; 11 carry the MTP `test` section; 6 pin an 11.0 preview/RC (`csharp-audit/exemplar-build-and-gates.md:21-22`).

Exemplar lines:

| repo | shape | cite |
|---|---|---|
| coverlet | `10.0.401`, `latestFeature`, MTP | `coverlet-coverage__coverlet@ecd6fd5533e7:global.json:3-7` |
| xunit, simple-exec | `10.0.100`, `latestMinor`, MTP | `xunit__xunit@0c7aa4991fa3:global.json:3-7`, `adamralph__simple-exec@f80913246993:global.json:3-7` |
| Polly | `10.0.401`, default rollForward (`patch`), `allowPrerelease:false`, MTP | `App-vNext__Polly@e4476096da5b:global.json:3-10` |
| GitVersion | `10.0.401` only, MTP | `GitTools__GitVersion@5057cdbcc177:global.json:8-11` |
| npgsql | `10.0.200`, `latestMajor`, `allowPrerelease:false` | `npgsql__npgsql@9c47244547c2:global.json:3-5` |
| StackExchange.Redis | no version, only `allowPrerelease:false` | `StackExchange__StackExchange.Redis@e7c43a269f53:global.json:4` |
| aspire | `11.0.100-rc.1...`, `rollForward: major`, `allowPrerelease:true`, `paths` + `errorMessage` | `dotnet__aspire@af646baee1e8:global.json:3-10` |

Reading: `latestFeature` (coverlet) and `latestMinor` (xunit, simple-exec) both stay inside SDK 10.0.x/10.x and cannot jump to SDK 11 (V3). `latestMajor` (npgsql) and `major` (aspire) can, and aspire uses it deliberately with a repo-local `.dotnet` via `paths` (SDK 10+ field) and a custom `errorMessage` ([global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json), `paths`, `errorMessage`). The Redis shape (no version, `allowPrerelease:false`) is a floating pin: it selects "highest installed stable", which is SDK 11 once 11.0.1xx GA lands in November 2026.

**Recommended shape (library repo, no lock files):**

    {
      "sdk": { "version": "10.0.401", "rollForward": "latestFeature", "allowPrerelease": false },
      "test": { "runner": "Microsoft.Testing.Platform" }
    }

**With committed lock files:** `"rollForward": "disable"` ([global.json footnote](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json); [NuGet doc note](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#locking-dependencies)), and add `"errorMessage"` (SDK 10 field) naming the install command so an agent that hits exit 155 gets an actionable string.

The `test` section is ignored by older SDKs: SDK 8.0.425 with `"test":{"runner":"Microsoft.Testing.Platform"}` builds normally (V26). It selects MTP mode in SDK 10 and needs MTP >= 1.7; mixed VSTest/MTP solutions are unsupported ([unit-testing-with-dotnet-test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)). `.NET 11` flag: Preview 6+ adds the `DOTNET_TEST_RUNNER` env var that overrides global.json ([dotnet-11 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk), "dotnet test improvements").

### 3. `dnx` ignores global.json

`dnx` ships as a script next to `dotnet` ([.NET 10 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)). In `release/10.0.1xx` and `release/10.0.2xx` it is a one-liner that honours global.json: `"$(dirname "$0")/dotnet" dnx "$@"` ([dnx @ release/10.0.1xx](https://github.com/dotnet/sdk/blob/release/10.0.1xx/src/Layout/redist/dnx)). In `release/10.0.3xx`, `release/10.0.4xx`, `release/11.0.1xx` and `main` it was rewritten to take the last line of `dotnet --list-sdks` and exec that SDK's `dotnet.dll` directly ([dnx @ release/10.0.4xx](https://github.com/dotnet/sdk/blob/release/10.0.4xx/src/Layout/redist/dnx)). Commit message of [cf67b960b0](https://github.com/dotnet/sdk/commit/cf67b960b0d90c4a8a84452f2dace93ab66e7fa3) (2026-05-27): "This allows the dnx script to work despite any global.json." This is intentional (dotnet/sdk#51085: pinned SDKs that predate `dnx` could not run it). Consequence: in a directory pinned to 10.0.401, `dnx` runs under SDK 11 RC1 (V5, `COREHOST_TRACE`). `dotnet tool exec` in the same directory runs under 10.0.401.

`dotnet tool exec`/`dnx` use the newest tool version unless `pkg@version` is given, and prompt for download approval ([.NET 10 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)); .NET 11 RC1 drops the extra approval prompt ([dotnet-11 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk), "Other CLI improvements"). No corpus repo calls `dnx` in a workflow or script (grep over `.yml/.yaml/.sh/.ps1`: 0 hits).

### 4. Central Package Management and transitive pinning

CPM: `Directory.Packages.props` with `ManagePackageVersionsCentrally=true`, `PackageVersion` items there, versionless `PackageReference` in projects ([CPM docs](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management)). Corpus: 22 repos; 8 of the 18 clones we sampled also enable `CentralPackageTransitivePinningEnabled` (coverlet `Directory.Packages.props:4`, aspire `:8`, sourcelink `src/Directory.Packages.props:5`, command-line-api `:5`, Humanizer `:4`, cake `src/Directory.Packages.props:4`, vs-threading `:6`); testfx sets it `false` explicitly (`microsoft__testfx@7226b0c74729:Directory.Packages.props:12`).

Enforcement: a `Version` attribute on a `PackageReference` under CPM fails restore with NU1008 "The following PackageReference items cannot define a value for Version" (V23). `NU1507` (warn when more than one source and no mapping) is documented; it did not fire with two local-folder sources in the fixture, so it cannot be relied on as the gate.

**The library trap (V20).** The docs say transitive pinning "promotes a transitive dependency to a top-level dependency" and that on `pack` "NuGet will promote the transitively pinned dependencies to explicit dependencies in the nuspec", so "the use of transitive pinning should be carefully evaluated when authoring a library" ([CPM docs](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management), "Transitive Pinning and Pack"). Measured: a library referencing only `Contoso.Lib 1.0.0` (which depends on `Contoso.Dep 1.0.0`) with `Contoso.Dep` pinned centrally packs with `<dependency id="Contoso.Dep" version="1.2.0">` in every TFM group; the same project with pinning off packs only `Contoso.Lib`. With a floating pin (`1.*`) the packed minimum is whatever the feed held at pack time, so two packs of identical source yield different nuspecs.

| | nuspec dependencies for `Fx.Lib` |
|---|---|
| pinning on | `Contoso.Lib 1.0.0`, `Contoso.Dep 1.2.0` (red) |
| pinning off | `Contoso.Lib 1.0.0` (green) |

Pinning is still the right *remediation* for a vulnerable transitive in a non-shipping project (test, tool, sample): with `Contoso.Dep 1.0.0` flagged NU1904, pinning `Contoso.Dep 1.1.0` clears the warning (V13b). NuGet's own order of preference: update the closest package first, pin or suppress last ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages), "Transitive Packages"). Downgrades via pinning are rejected with NU1109.

**Conditioning gotcha (V21).** `<CentralPackageTransitivePinningEnabled Condition="'$(IsPackable)' == 'false'">true</...>` inside `Directory.Packages.props` works when `IsPackable` is a *global* property (`-p:IsPackable=false`) and silently does nothing when `IsPackable` is set in the csproj body, because `Directory.Packages.props` is imported before the project body. Setting `CentralPackageTransitivePinningEnabled` in the non-packable csproj (or in `test/Directory.Build.props`) works (restore cleared NU1904).

`VersionOverride` and `GlobalPackageReference` (SDK 7.0.100+/NuGet 6.4+) exist; `CentralPackageVersionOverrideEnabled=false` turns overrides into restore errors (docs; not exercised). Different versions per TFM are expressed with `Condition="'$(TargetFramework)' == ..."` on `PackageVersion` (docs).

### 5. Lock files and locked mode

**What the docs say.** `RestorePackagesWithLockFile=true` writes `packages.lock.json` at the project root; with a lock present, restore uses it when inputs are unchanged. `--locked-mode`/`RestoreLockedMode` fails "if you updated the defined package dependencies for the project after lock file was created". For libraries: "if your project is a library project that you do not ship or a common code project on which other projects depend, you **should not** check in the lock file... There is no harm in keeping the lock file" because a consuming project's lock file wins ([package-references](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#locking-dependencies), "Make lock file part of your source repository"). Also: "Once a project has `packages.lock.json`... the lock file is always used with restore even if the property is not set".

**Corpus.** 5 repos track lock files, 3 enforce locked mode (`exemplar-build-and-gates.md:33`). The libraries among them:

| repo | lock files | locked mode | cite |
|---|---|---|---|
| xunit (libraries, 59 lock files) | yes | `Condition="'$(ContinuousIntegrationBuild)' == 'true'"` | `xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:29-30` |
| SimpleExec (library + tests + fixtures + build, 5) | yes | `Condition="'$(CI)' != ''"` | `adamralph__simple-exec@f80913246993:Directory.Build.props:11-12` |
| Anthropic C# SDK (8) | yes | **no** | `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Directory.Build.props:36` |
| testfx build tool | yes | unconditional | `microsoft__testfx@7226b0c74729:.github/workflows/unskip-closed-tests-tool/UnskipClosedTests.Tool.csproj:8-9` |

The Anthropic SDK is the instructive near-miss: lock files are written but nothing enforces them, so they are decoration.

**What a lock file buys (measured).**

- *Frozen floating resolution (V7).* Lock created with `Contoso.Dep` at `1.*` resolved 1.2.0; after 1.3.0 was published, `CI=true dotnet restore` still restored 1.2.0, and the same project without a lock restored 1.3.0.
- *Integrity (V10).* After re-packing `Contoso.Dep 1.1.0` with different bytes under the same id and version, `CI=true dotnet restore` on a cold packages folder failed `NU1403: Package content hash validation failed for Contoso.Dep.1.1.0. The package is different than the last restore`; without a lock file the tampered package restored with exit 0. This is the one property source mapping does not give.
- *Drift gate (V8).* `Directory.Packages.props` changed 1.1.0 to 1.2.0: `CI=true` restore fails `NU1004: The package reference Contoso.Dep version has changed from [1.1.0, ) to [1.2.0, )`; on a laptop (`CI` unset) the same change is accepted and the lock silently rewritten.

**What it costs (measured).**

- *TFM edits (V9).* Adding `net9.0` to `net8.0;net10.0` under `CI=true` fails NU1004 "The project target frameworks are different than the lock file's target frameworks". The message labels are swapped: it printed `Lock file target frameworks: net8.0,net9.0,net10.0. Project target frameworks net10.0,net8.0`, i.e. the first list is the project's new set and the second is the lock's. (The NU1004 doc example shows the same inversion.)
- *Fail-open when absent (V24).* `dotnet restore --locked-mode` with no lock file exits 0; with `-p:RestorePackagesWithLockFile=true` it *creates* the lock. A lock file that was never committed, or was gitignored, makes the gate vacuous. The guard is a count: tracked `packages.lock.json` files must equal the number of projects.
- *SDK-implicit packages.* The SDK adds `PackageReference` items such as `Microsoft.NET.ILLink.Tasks` when `IsTrimmable`/`IsAotCompatible` is set; a `net8.0` library with `IsTrimmable=true` locks `Microsoft.NET.ILLink.Tasks` at `[8.0.31, )` (V28). Moving between SDK patches that change that version fails locked restore with NU1004 ([dotnet/sdk#48795](https://github.com/dotnet/sdk/issues/48795): 8.0.407 to 8.0.408, "version has changed from [8.0.14, ) to [8.0.15, )"; unresolved as of the August 2026 comment). SDKs 8.0.425, 10.0.401 and 11.0 RC1 all request 8.0.31, so this toolchain cannot reproduce it; the thread's workaround is `rollForward: disable` (NuGet doc note quoted above).
- *Pruning.* NuGet 7.0 notes "Package pruning will lead to a one-time diff in packages lock file"; the locked-mode check is pruning-aware ([package-references](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#locking-dependencies); [NuGet 7.0 release notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.0)).
- *Format.* `packages.lock.json` is versioned and CPM transitive pinning bumps its format version (docs).

**Decision for a library repo.** Default: no lock file; exact CPM versions, no floating, `latestFeature`. Reason: with exact direct versions the closure is deterministic except for "nearest-wins lowest applicable" surprises (a lower version published later, documented in the lock section of the package-references page), and the remaining value (integrity, frozen dev-tool closure) is bought with TFM and SDK-patch churn that an unattended agent hits constantly. Flip to **lock files on** when any of these is true: the repo uses floating versions anywhere; it ships an executable/tool/container (the lock is then consumed); a supply-chain requirement demands NU1403 integrity; or CI cache keys need a lock hash (`setup-dotnet` caching keys on `packages.lock.json`). When on, all of these are required together: `RestorePackagesWithLockFile=true` repo-wide, `RestoreLockedMode` conditional on CI, `rollForward: disable`, a bot or script that regenerates `global.json` and every lock in one commit when the SDK moves, and a CI count check that every project has a tracked lock.

### 6. NuGetAudit

**Defaults ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages)).** `NuGetAudit` true; `NuGetAuditLevel` `low` (values `low|moderate|high|critical`); `NuGetAuditMode` "defaults to `all` when a project targets `net10.0` or higher. Otherwise ... `direct`. When a project multi-targets, if any one target framework selects `all`, then audit will use this value for all target frameworks." Feature history: NuGet 6.8/.NET 8 SDK introduced it, 6.12/.NET 9.0.100 added audit sources, 7.0/.NET 10.0.100 changed the mode default ([NuGet 7.0 notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.0)). `dotnet restore` documents the same: ".NET 8 and .NET 9 ... only direct ... Starting in .NET 10, NuGet audits both direct and transitive" ([dotnet restore](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-restore)).

**Measured matrix (V11-V13, planted advisory: `Contoso.Dep [1.0.0,1.1.0)` critical, reached only transitively through `Contoso.Lib`; fake VulnerabilityInfo/6.7.0 source on `127.0.0.1`).**

| config | restore result |
|---|---|
| net10.0, `NuGetAuditMode=direct` | silent, exit 0 (red) |
| net10.0, `NuGetAuditMode=all` | `warning NU1904` (green) |
| net10.0, nothing set | `warning NU1904` |
| net8.0, nothing set | silent, exit 0 (red) |
| net8.0, `NuGetAuditMode=all` | `warning NU1904` |
| `net8.0;net10.0`, nothing set | `warning NU1904` (any `all` wins) |
| net10.0 + `TreatWarningsAsErrors` | `error NU1904: Warning As Error`, exit 1 |
| same + `WarningsNotAsErrors=NU1901;NU1902;NU1903;NU1904` | warning, exit 0 |
| net10.0 + `WarningsAsErrors=NU1903;NU1904`, no TWAE | error, exit 1 (the docs' "fail only on high/critical" recipe) |
| `NuGetAudit=false` | silent |
| `NuGetAuditMode` effective value | `dotnet msbuild Lib.csproj -p:TargetFramework=net8.0 -getProperty:NuGetAuditMode` prints `direct`; `net10.0` prints `all` (V25) |

SDK 11.0 RC1 gives the same defaults: net8.0 silent, net10.0 and net11.0 warn (`scripts/` ad-hoc run recorded in finding 10, V12b).

**Corpus configuration.** Only 2 repos set audit properties on purpose, and one sets it the wrong way: Polly sets `<NuGetAuditMode>direct</NuGetAuditMode>` for a `net8.0;net9.0;net10.0` multi-target (`App-vNext__Polly@e4476096da5b:eng/Common.props:9`), which overrides the `all` the net10 leg would have chosen. Stripe turns it off for the main library (`stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Stripe.net.csproj:29`) and cake in CI (`cake-build__cake@08885933e936:.rwx/cake.yml:52`). Four repos mute advisories with `NoWarn` NU1902/NU1903 (xunit test projects, GitVersion test project, pulumi with a written rationale at `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Pulumi.csproj:22-31`). Roslynator is the better pattern: per-advisory `NuGetAuditSuppress` items (`dotnet__roslynator@167f43468118:src/CommandLine/CommandLine.csproj:53-61`).

**TWAE interaction.** The shared pattern is TWAE on plus an explicit exemption of NU1901-NU1904 so that "vulnerabilities discovered in the future" do not break a build ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages), "Warning codes"):

- aspire: `WarningsNotAsErrors` NU1901-NU1904 unless `TreatNuGetAuditWarningsAsErrors` (`dotnet__aspire@af646baee1e8:Directory.Build.props:20-22`).
- testfx: exempt unless `OfficialBuild` (`microsoft__testfx@7226b0c74729:Directory.Build.props:72-73`).
- sourcelink/testfx Arcade scripts default `warn_not_as_error` to `NU1901;NU1902;NU1903;NU1904` (`dotnet__sourcelink@6ec19dda0e19:eng/common/tools.sh:73-74`).
- Azure SDK keeps NU1904 an error for client libraries only (`Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:109-114`).
- BenchmarkDotNet exempts only NU1900 (`dotnet__BenchmarkDotNet@61ebda8a50ae:build/common.props:24`).

**The hole in that pattern (V14).** With the audit source unreachable, restore emits `NU1905` ("Audit source ... did not provide any vulnerability data") and `NU1900` ("Error occurred while getting package vulnerability data"). With TWAE and only NU1901-NU1904 exempted, both become errors and restore fails with exit 1; adding NU1900 and NU1905 to `WarningsNotAsErrors` restores exit 0. So an outage of the audit endpoint, not a vulnerability, breaks the build. Conversely, if NU1900/NU1905 are warnings in every job, an outage silently disables audit. The docs' answer is a split ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages), "Separating Errors from Warnings with a Dedicated Auditing Pipeline"), reproduced in V15: normal builds list all six codes in `WarningsNotAsErrors`; the audit job passes `-p:AuditPipeline=true` and all six become errors (NU1904 error, exit 1).

**Prove audit ran (V16).** NuGet 9.0.200/MSBuild 17.13 added `RestoreProjectCount`, `RestoreSkippedCount`, `RestoreProjectsAuditedCount` task outputs (not available with static-graph restore). A `Directory.Solution.targets` target `AfterTargets="Restore"` with `Condition="'$(CI)' == 'true'"` erroring when `RestoreProjectsAuditedCount != RestoreProjectCount` passed on a normal restore and failed (`Expected: 1 Found: 0`, exit 1) when `-p:NuGetAudit=false` was injected. It must live in `Directory.Solution.targets`, not `Directory.Build.props` ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages), "Ensure restore audited projects"). The `RestoreSkippedCount` variant is needed if no-op restores should pass.

**Audit sources.** `auditSources` in nuget.config is separate from `packageSources`; if undefined, package sources are used and NU1905 is suppressed. A source qualifies if it serves the `VulnerabilityInfo/6.7.0` resource; absolute URLs, 1-16 pages, lowercase package ids, severity 0-3 ([vulnerability-info API](https://learn.microsoft.com/en-us/nuget/api/vulnerability-info)). `https://data.nuget.org/v3/index.json` is a vulnerability-only endpoint for networks that block `api.nuget.org`; testfx, sourcelink and command-line-api use it (`microsoft__testfx@7226b0c74729:NuGet.config:22-25`, `dotnet__sourcelink@6ec19dda0e19:NuGet.config:14-17`). NuGet 7.0 errors on non-https resources in a service index, so the fixture's `http://127.0.0.1` feed needs `allowInsecureConnections="true"` ([NuGet 7.0 notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.0)).

**Triage tooling.** `dotnet package list --vulnerable` reports direct packages only ("has no vulnerable packages"); add `--include-transitive` to see `Transitive Package Contoso.Dep 1.0.0 Critical <url>`; `dotnet nuget why Lib.csproj Contoso.Dep` prints the path `Contoso.Lib (v1.0.0) -> Contoso.Dep (v1.0.0)` (V13c). `dotnet package update --vulnerable` (SDK 10) bumps to the first non-vulnerable version. Per-advisory suppression is `NuGetAuditSuppress Include="https://github.com/advisories/GHSA-..."`, "a last resort" that hides the advisory for every package that shares it ([auditing-packages](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages), "Excluding advisories").

### 7. Package source mapping

Syntax and semantics ([package-source-mapping](https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping)): once any `<packageSourceMapping>` exists, every package, including transitive, must match a pattern; exact id beats longest prefix beats `*`; the same pattern on two sources is allowed but non-deterministic. It applies to restore/install/update downloads only; `dotnet package add` and `dotnet list package --outdated/--vulnerable` still send package ids to all configured sources ([security-best-practices](https://learn.microsoft.com/en-us/nuget/concepts/security-best-practices)). Corpus: 5 repos own a mapping (Polly, npgsql, MessagePack, testfx, openai); Polly and npgsql map `*` to nuget.org with a single source (`App-vNext__Polly@e4476096da5b:NuGet.config:3-11`, `npgsql__npgsql@9c47244547c2:NuGet.config:4-12`). Polly adds `<clear />` under `packageSources`; npgsql does not, so machine-level sources are inherited and unmapped. xunit's config lists two sources (nuget.org and feedz.io) with no mapping (`xunit__xunit@0c7aa4991fa3:NuGet.Config:3-7`).

**Measured (V17-V19; two local feeds: `private` has `Contoso.Dep` 1.0.0/1.1.0/1.2.0, `public-evil` has 1.9.9; CPM floating `1.*`).**

| nuget.config | `Contoso.Dep` resolved |
|---|---|
| two sources, no mapping | **1.9.9 from `public-evil`** (red) |
| `Contoso.*` mapped to `private`, `Other.*` to `public-evil` | 1.2.0 (green) |
| mapping exists, nothing matches `Contoso.Dep` | `error NU1100: Unable to resolve 'Contoso.Dep (>= 1.0.0)' ... PackageSourceMapping is enabled, the following source(s) were not considered: private, public-evil` (fail-closed) |
| pinned `1.9.9`, `*` mapped to `private` only, **cold** packages folder | `error NU1102 ... Versions from public-evil were not considered` |
| same, **warm** packages folder that already holds 1.9.9 | restored, exit 0: mapping ignored |

The last row is the documented caveat: "When the requested package already exists in the global packages folder, no source look-up will happen and the mappings will be ignored" ([package-source-mapping](https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping)). Shared CI runners and developer laptops have warm folders. Mitigations: an ephemeral per-job packages folder (`NUGET_PACKAGES`, or `globalPackagesFolder` in nuget.config, or `--packages`), and a lock file (NU1403 catches a swapped package even when the cache is warm only if the hash differs from the lock).

Repo-level baseline from the docs: a nuget.config at the repo root with `<clear />` in `packageSources`, "to ensure no user or machine specific configuration is applied" ([security-best-practices](https://learn.microsoft.com/en-us/nuget/concepts/security-best-practices), "NuGet Configuration"), plus `<packageSourceMapping>` and, if the audit endpoint differs, `<auditSources><clear />...`.

### 8. NU1510 pruning

Since NuGet 7.0/.NET 10 SDK, pruning of framework-provided packages is on by default for every framework of a project that targets `>= net10.0`, multi-targeted included; a direct `PackageReference` removable from all frameworks raises `NU1510: PackageReference X will not be pruned. This package is automatically available and does not need to be referenced explicitly. Remove the PackageReference item` ([package-references](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#prunepackagereference); [NU1510](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1510)). Opt-out is `RestoreEnablePackagePruning=false` ([.NET 10 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), "Pruning of framework-provided package references"). NU1510 does not fire when another TFM (`netstandard2.0`, `net48`) really needs the package. NU1511 covers `ProjectReference`.

Measured (V22, `System.Text.Json 10.0.0` on net10.0): warning NU1510, exit 0; with `TreatWarningsAsErrors` error, exit 1; `net8.0;net10.0` still warns; `RestoreEnablePackagePruning=false` silent. A net8.0-only project (even with pruning opted in) does not warn.

Corpus mutes it instead of fixing it: BenchmarkDotNet (`dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/BenchmarkDotNet.csproj:8`), aspire with a `TODO: Re-enable` (`dotnet__aspire@af646baee1e8:Directory.Build.props:44-46`), testfx (`microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Extensions.Telemetry/Microsoft.Testing.Extensions.Telemetry.csproj:5`), Azure SDK for tests/samples (`Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:97-106`), coverlet via `MSBuildWarningsAsMessages` (`coverlet-coverage__coverlet@ecd6fd5533e7:test/coverlet.MTP.tests/coverlet.MTP.tests.csproj:15`). Pruning also removes the pruned package from a packed nuspec for the framework it applies to and reduces audit false positives ([package-references](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#prunepackagereference)); it also privatizes a direct reference (`PrivateAssets=all`, `IncludeAssets=none`), so a library that leaves the reference in no longer flows it to consumers.

### 9. slnx, Terminal Logger, `--interactive`, and the MTP switch

**.slnx.** `dotnet new sln` creates `.slnx` since .NET 10 ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default); `--format sln` for the old one); CLI support started in SDK 9.0.200 and `dotnet sln migrate` converts ([slnx blog](https://devblogs.microsoft.com/dotnet/introducing-slnx-support-dotnet-cli/)); MSBuild reads `.slnx` from VS 17.12 and "if both are present, you must explicitly specify one" ([MSBuild reference](https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference)). Corpus: 19 slnx-only, 5 both, 11 sln-only (`exemplar-build-and-gates.md:20`). Measured (V21b): SDK 10.0.401 `dotnet new sln` writes `App.slnx`, SDK 8.0.425 writes `App.sln`, SDK 11.0 RC1 writes `A.slnx`; two solution files in one directory give `MSB1011: Specify which project or solution file to use because this folder contains more than one project or solution file`. In MTP mode `dotnet test MySolution.slnx` becomes `dotnet test --solution MySolution.slnx` ([unit-testing-with-dotnet-test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)).

**Terminal Logger.** `--tl:[auto|on|off]`, default `auto`, which checks that the terminal is capable and "isn't using a redirected standard output" ([dotnet restore](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-restore)); MSBuild: "Don't parse the output or otherwise rely on it remaining unchanged" (MSBuild switch `-tl[:auto|on|off]`, 17.8+, [MSBuild reference](https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference)). Measured (V27): with stdout piped the classic logger is used; `--tl:on` in a pipe emits `ESC]9;4;3`, hyperlink and colour escape sequences into the captured text. Scripts that parse output turn it off: xunit passes `-tl:off`/`--tl:off` (`xunit__xunit@0c7aa4991fa3:tools/builder/targets/Packages.cs:28-31`, gated to SDK major > 8), BenchmarkDotNet `-tl:off` (`dotnet__BenchmarkDotNet@61ebda8a50ae:.github/workflows/run-tests-selected.yaml:83`). .NET 11 RC1: `dotnet test` forwards `--tl`, `--terminallogger`, `--tlp` to MSBuild instead of the test app.

**`--interactive`.** Since .NET 10 it is "enabled by default for CLI commands in interactive terminals"; disable with `--interactive false` ([.NET 10 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)). `dotnet restore --interactive false` is accepted (V29). It matters for authenticated feeds: an interactive credential provider prompt under a pty-backed agent harness blocks.

**Other defaults that moved.** .NET 11 RC1 enables the NativeAOT CLI host and the MSBuild server by default (opt out `DOTNET_CLI_ENABLEAOT=false`, `DOTNET_CLI_USE_MSBUILD_SERVER=false`); a warm MSBuild server keeps env/property state between invocations of an agent session ([dotnet-11 SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk), "CLI architecture"). Not exercised here.

### 10. Verified on the toolchain

Root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-sdk-and-restore-pinning/`. Every command below was run through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. Local feeds `feed/` (private) and `feed2/` (evil); fake audit feed `03-audit/vulnfeed/serve.py` on 127.0.0.1:18765 (start it before `03a/03b/03c/06`; stop it afterwards).

| id | what | fixture / script | red | green |
|---|---|---|---|---|
| V1 | unpinned dir picks the preview | `scripts/00-sdk.sh` (probe in `mktemp -d`, outside the tree) | `cd $(mktemp -d) && dotnet --version` -> `11.0.100-rc.1.26425.128` | `01-sdk/green-exact/global.json` -> `10.0.401` |
| V2 | `allowPrerelease:true`, no version | `01-sdk/prerelease-true-noversion` | `11.0.100-rc.1...` | `01-sdk/green-allowprerelease-false` -> `10.0.401` |
| V3 | rollForward reach | `01-sdk/aspire-shape-latestmajor` | `latestMajor`+allowPrerelease -> `11.0.100-rc.1...` | `latestFeature` / `latestMinor` -> `10.0.401` |
| V4 | invalid or typo'd global.json | `01-sdk/typo` (rewritten per case) | trailing comma / `"10.0"` / `"latestFeatur"` -> `11.0.100-rc.1...`, `dotnet build` exit 0, `NETSDK1057` as a message | valid pin -> `10.0.401` |
| V5 | `dnx` vs pin | `00-sdk.sh` last block, `COREHOST_TRACE=1` | `dnx --help` -> `sdk/11.0.100-rc.1.26425.128/dotnet.dll` | `dotnet tool exec --help` -> `Using .NET SDK dll=[.../sdk/10.0.401/dotnet.dll]` |
| V6 | pinned SDK absent (gate) | `01-sdk/disable-miss` | n/a | `dotnet build` exit 155 "A compatible .NET SDK was not found. Requested SDK version: 10.0.100" |
| V7 | floating without/with lock | `02b-lock-multitarget-floating.sh` B/B2 | no lock: 1.3.0 after publish | lock + `CI=true`: stays 1.2.0 |
| V8 | drift gate | `02e-lock-drift.sh` | laptop `CI=` accepts and rewrites lock to 1.2.0 | `CI=true`: `error NU1004: ... changed from [1.1.0, ) to [1.2.0, )`, exit 1 |
| V9 | TFM edit under lock | `02b` A | n/a | `CI=true` + added `net9.0`: NU1004, labels swapped, exit 1 |
| V10 | content tamper | `02a-lock-integrity.sh` | no lock: tampered 1.1.0 restores, exit 0 | lock + cold cache: `NU1403 ... The package is different than the last restore`, exit 1 |
| V11 | audit direct vs all | `03a-audit-matrix.sh` | `-p:NuGetAuditMode=direct`: silent | `all`: `warning NU1904` |
| V12 | TFM-dependent default | `03a` | net8.0 default: silent | net10.0 default: `warning NU1904`; V12b: same on SDK 11.0 RC1 (ad hoc, `global.json` swapped in `03-audit/proj` then removed) |
| V13 | TWAE x audit codes | `03a` | TWAE: `error NU1904`, exit 1 | + `WarningsNotAsErrors=NU1901..NU1904`: warning, exit 0; V13b pin clears it (ad hoc, nuspec read); V13c `03c-audit-tooling.sh` |
| V14 | audit outage | `03b-audit-source-down.sh` | TWAE + exempt NU1901-1904: `error NU1905`, `error NU1900`, exit 1 | exempt NU1900-NU1905: warnings, exit 0 |
| V15 | audit pipeline split | `06-cpm-lock-misc-and-audit-pipeline.sh` | `-p:AuditPipeline=true`: `error NU1904`, exit 1 | normal job: warning, exit 0 |
| V16 | audit-ran assertion | `03c-audit-tooling.sh` | `-p:NuGetAudit=false`: `Directory.Solution.targets(3,5): error : Restore did not audit every project. Expected: 1 Found: 0`, exit 1 | normal: NU1904 warning, exit 0 |
| V17 | dependency confusion | `04a-source-mapping.sh` | no mapping: `1.9.9` from `public-evil` | mapping: `1.2.0` |
| V18 | fail-closed mapping | `04a` | n/a | unmatched id: `NU1100 ... PackageSourceMapping is enabled`, exit 1 |
| V19 | warm-cache bypass | `04b-source-mapping-warm-cache.sh` | warm folder: restore exit 0 despite mapping | cold folder: `NU1102 ... Versions from public-evil were not considered`, exit 1 |
| V20 | pinning leaks into nuspec | `02d-pinning-leak-and-float.sh` | pinning on: `Contoso.Dep 1.2.0` in every TFM group; laptop 1.1.0 vs CI 1.2.0 | pinning off: only `Contoso.Lib` |
| V21 | conditional pinning | ad hoc in `03-audit/proj` | `Condition="'$(IsPackable)' == 'false'"` with `IsPackable` in csproj body: NU1904 stays | property set in the project body: restore clean |
| V21b | `dotnet new sln` | `00-sdk.sh` tail | 8.0.425 -> `App.sln`; two files -> `MSB1011` | 10.0.401 -> `App.slnx` |
| V22 | NU1510 | `05-prune.sh` | net10 + redundant STJ: warning; + TWAE: error, exit 1 | `RestoreEnablePackagePruning=false`: silent |
| V23 | CPM enforcement | `06-cpm-lock-misc-and-audit-pipeline.sh` | `PackageReference ... Version="1.0.0"`: `error NU1008`, exit 1 | versionless reference: restores |
| V24 | locked mode, no lock | `06` | `--locked-mode`: exit 0; `--locked-mode -p:RestorePackagesWithLockFile=true`: exit 0 and `packages.lock.json` created | committed lock: V8 |
| V25 | effective values | `07-effective-values.sh` | `-p:NuGetAuditMode=direct` on net10: prints `direct` | `net10.0` -> `all`; `net8.0` -> `direct`; `RestoreLockedMode` `""` vs `"true"` under `CI=true` |
| V26 | MTP section on SDK 8 | `01-sdk/sdk8-with-test-section` | n/a | 8.0.425 builds with the `test` section present |
| V27 | Terminal Logger and pipes | ad hoc in `06-misc/s10/p` | `--tl:on` in a pipe: `ESC]9;4;3` + OSC 8 links in the text | default in a pipe: classic `Restored ... / p -> ...` lines |
| V28 | SDK-implicit package in lock | `02c-lock-sdk-implicit.sh` | n/a (not reproducible here) | `net8.0` + `IsTrimmable`: `Microsoft.NET.ILLink.Tasks` `[8.0.31, )` under SDK 8.0.425, 10.0.401 and 11.0 RC1 |
| V29 | `--interactive false` | `07-effective-values.sh` | n/a | accepted, restore exit 0 |

Count: 23 red/green pairs (V1-V5, V7-V8, V10-V11, V14-V17, V19-V20, V21, V22, V23, V24, V25, V27 plus V12 and V13 as pairs) and 6 gate/observation probes (V6, V9, V18, V21b, V26, V28, V29). Representative raw output:

    ### RED  no global.json in any ancestor (/tmp/tmp.WaOsP8s2Gc): dotnet --version
    11.0.100-rc.1.26425.128
    ### green-exact: { "sdk": { "version": "10.0.401", "rollForward": "latestPatch", "allowPrerelease": false } } -> 10.0.401
    ### dnx bypass: dir pinned to 10.0.401, which SDK dll runs?
    dotnet tool exec -> Using .NET SDK dll=[/home/.../dotnet/sdk/10.0.401/dotnet.dll]
    dnx              -> sdk/11.0.100-rc.1.26425.128/dotnet.dll

    ### RED  net10 + NuGetAuditMode=direct (transitive vuln silent)
      Restored Lib.csproj (in 181 ms).     exit=0
    ### GREEN net10 + NuGetAuditMode=all
    Lib.csproj : warning NU1904: Package 'Contoso.Dep' 1.0.0 has a known critical severity vulnerability, https://github.com/advisories/GHSA-fixt-ure0-0001
    ### net10 all + TreatWarningsAsErrors
    Lib.csproj : error NU1904: Warning As Error: Package 'Contoso.Dep' 1.0.0 has a known critical severity vulnerability, ...   exit=1

    ### audit source unreachable + TreatWarningsAsErrors + WarningsNotAsErrors=NU1901..NU1904
    Lib.csproj : error NU1905: Warning As Error: Audit source 'fixture-audit' did not provide any vulnerability data.
    Lib.csproj : error NU1900: Warning As Error: Error occurred while getting package vulnerability data: Unable to load the service index ...   exit=1

    ### GATE: CI=true restore after Directory.Packages.props 1.1.0 -> 1.2.0
    Lib.csproj : error NU1004: The package reference Contoso.Dep version has changed from [1.1.0, ) to [1.2.0, ).   exit=1
    ### GREEN: CI=true locked restore with cold cache after tamper
    Lib.csproj : error NU1403: Package content hash validation failed for Contoso.Dep.1.1.0. The package is different than the last restore.   exit=1

    ### RED   two sources, NO packageSourceMapping      -> Contoso.Dep 1.*  resolved 1.9.9
    ### GREEN mapping: Contoso.* only from private     -> Contoso.Dep 1.*  resolved 1.2.0

## Normative guidance candidates

**A. SDK selection**

1. **A repository MUST contain a root `global.json` with a full three-part `sdk.version`, an explicit `sdk.rollForward`, and `"allowPrerelease": false`.** Rationale: absence, a bare `allowPrerelease`, or no version selects the newest installed SDK including 11 RC1 (V1-V3). Verify: `jq -e '.sdk.version | test("^[0-9]+\\.[0-9]+\\.[0-9]+$")' global.json && jq -e '.sdk.rollForward != null and .sdk.allowPrerelease == false' global.json`.
2. **`rollForward` MUST be `latestFeature` (no lock files) or `disable` (lock files committed); `latestMajor`, `major`, `minor`, `latestMinor` and an absent value are forbidden.** Rationale: only these two keep SDK 10 vs SDK 11 an explicit decision; `disable` is the documented partner of lock files. Verify: `jq -e '.sdk.rollForward == "latestFeature" or .sdk.rollForward == "disable"' global.json`; if `git ls-files '*packages.lock.json' | wc -l` is non-zero then `jq -e '.sdk.rollForward == "disable"' global.json`.
3. **Every build entry point MUST assert the SDK: CI and agent scripts run `dotnet --version` and fail unless it matches `^10\.0\.[0-9]+$`, and `jq empty global.json` first.** Rationale: invalid JSON, `"10.0"`, `"latestFeatur"`, wrong key case and string booleans all fall back silently to the newest SDK, exit 0 (V4). Verify: `jq empty global.json && dotnet --version | grep -E '^10\.0\.[0-9]+$'`; `dotnet --info | grep -A2 'global.json file'` must not contain `Invalid`.
4. **CI MUST install the SDK with `global-json-file: global.json`, not a floating `dotnet-version`.** Rationale: one source of truth; `A.B.x` floats within a band ([setup-dotnet](https://github.com/actions/setup-dotnet)). Verify: `grep -rn -e 'dotnet-version' .github/workflows` shows `dotnet-version` only in steps that also have `global-json-file` (extra runtimes for net8 test legs); `grep -rLn -e 'global-json-file' .github/workflows` lists no workflow that runs `dotnet`.
5. **Scripts, CI and agents MUST NOT call `dnx`; run tools through `dotnet tool run <name>` from `.config/dotnet-tools.json` or `dotnet tool exec <pkg>@<exact-version>`.** Rationale: the SDK 10.0.3xx+/11 `dnx` script runs the newest installed SDK regardless of global.json (V5) and floats the tool version. Verify: `grep -rnE '(^|[[:space:];&|(])dnx([[:space:]]|$)' .github scripts eng 2>/dev/null` returns nothing; `jq -e '.tools | length >= 0' .config/dotnet-tools.json` for manifest presence.
6. **A missing pinned SDK MUST produce an actionable message: set `sdk.errorMessage` (SDK 10+) naming the install command.** Rationale: the default text points at a non-existent application (exit 155). Verify: `jq -e '.sdk.errorMessage | length > 0' global.json`.
7. **`test.runner` in global.json MUST be `Microsoft.Testing.Platform` only when every test project is MTP >= 1.7; `dotnet test` invocations then use `--solution`/`--project`/`--test-modules`.** Rationale: SDK 10 MTP mode rejects VSTest-only projects and the positional solution form; SDK 8 ignores the section (V26). .NET 11 RC1 can override with `DOTNET_TEST_RUNNER`. Verify: `jq -r '.test.runner' global.json`; `grep -rnE 'dotnet test [^-]*\.(sln|slnx|csproj)' .github scripts` returns nothing.

**B. Central package management**

8. **Every package version MUST live in a root `Directory.Packages.props` with `ManagePackageVersionsCentrally=true`; no `Version=` on `PackageReference`.** Rationale: one place to audit and bump; enforced by NU1008 (V23). Verify: `dotnet restore` exits 0; `grep -rnE '<PackageReference[^>]*Version=' --include=*.csproj --include=Directory.Build.props .` returns nothing.
9. **No floating versions: no `*` in any `PackageVersion`, and `CentralPackageFloatingVersionsEnabled` unset.** Rationale: floating makes CI and laptop diverge silently without a lock (V7). Verify: `grep -rnE 'Version="[^"]*\*|CentralPackageFloatingVersionsEnabled' --include=Directory.Packages.props --include=Directory.Build.props .` returns nothing.
10. **`CentralPackageTransitivePinningEnabled` MUST NOT be true for any packable project.** Enable it only in non-packable projects, set in the project body or a `test/Directory.Build.props`, never behind `Condition="'$(IsPackable)'..."` in `Directory.Packages.props`. Rationale: pinned transitives become nuspec dependencies of the shipped library (V20); the IsPackable condition silently fails (V21). Verify: `dotnet pack -c Release -o artifacts/nupkg` then `unzip -p artifacts/nupkg/*.nupkg '*.nuspec' | grep -c '<dependency '` equals the number of intended direct dependencies; `grep -rn 'CentralPackageTransitivePinningEnabled' --include=Directory.Packages.props .` returns nothing.

**C. Lock files**

11. **Default for a library repo: no `packages.lock.json` and no `RestorePackagesWithLockFile`.** Opt in only when floating versions exist, an executable/tool ships, NU1403 integrity is required, or CI cache keys need a lock hash (finding 5). Rationale: costs measured in V9, V28 and fail-open V24 outweigh the benefit when direct versions are exact. Verify: `test "$(git ls-files '*packages.lock.json' | wc -l)" -eq 0` or rules 12-14 all hold.
12. **If lock files are used, every project MUST have a tracked lock (`git ls-files '*packages.lock.json' | wc -l` equals `git ls-files '*.csproj' | wc -l`).** Rationale: `--locked-mode` with no lock creates it and passes (V24). Verify: that equality in a CI step.
13. **If lock files are used, `RestoreLockedMode` MUST be set from CI (`Condition="'$(CI)' != ''"` or `'$(ContinuousIntegrationBuild)' == 'true'`) and the first CI step is `dotnet restore --locked-mode`; `--force-evaluate` is forbidden in CI.** Rationale: V8; xunit/SimpleExec shape (`xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:29`). Verify: `CI=true dotnet msbuild <Project>.csproj -getProperty:RestoreLockedMode` prints `true`; `grep -rn -e 'force-evaluate' .github scripts` returns nothing.
14. **If lock files are used, a TFM, `Directory.Packages.props` or `global.json` change MUST regenerate every lock in the same commit (`dotnet restore --force-evaluate` locally).** Rationale: NU1004 on TFM edits (V9) and SDK-implicit packages ([dotnet/sdk#48795](https://github.com/dotnet/sdk/issues/48795)). Verify: CI `CI=true dotnet restore` exits 0 on the PR; `git diff --exit-code -- '*packages.lock.json'` after a local `dotnet restore` is clean.

**D. Audit**

15. **`NuGetAudit` MUST be true and `NuGetAuditMode` MUST be `all`, set explicitly in `Directory.Build.props`; `direct`, `NuGetAudit=false` and `NoWarn` of NU1901-NU1904 are forbidden repo-wide.** Rationale: the default is `direct` for any project not targeting net10+ (V12) and Polly shows an explicit `direct` overriding the net10 default. Verify: `dotnet msbuild src/<Lib>/<Lib>.csproj -p:TargetFramework=<each TFM> -getProperty:NuGetAuditMode` prints `all` for every TFM; `grep -rnE 'NuGetAudit(Mode)?>(false|direct)|NoWarn.*NU190[1-4]' --include=*.props --include=*.targets --include=*.csproj .` returns nothing.
16. **With `TreatWarningsAsErrors`, `WarningsNotAsErrors` MUST list all of `NU1900;NU1901;NU1902;NU1903;NU1904;NU1905` in the normal build, and a dedicated audit job MUST pass `-p:AuditPipeline=true` (or equivalent) that moves all six into `WarningsAsErrors`.** Rationale: an audit-endpoint outage breaks every build if NU1900/NU1905 stay errors (V14), and silently disables audit if they are warnings everywhere (V15). Verify: `dotnet restore -p:TreatWarningsAsErrors=true` passes with the audit source blocked; `dotnet restore -p:AuditPipeline=true` fails when a known-bad package is present; `grep -n 'NU1900' Directory.Build.props` is non-empty.
17. **CI MUST assert that restore audited every project via `Directory.Solution.targets` (`RestoreProjectsAuditedCount` vs `RestoreProjectCount`).** Rationale: `-p:NuGetAudit=false` or a project that opts out otherwise passes silently (V16). Verify: `test -f Directory.Solution.targets && grep -q RestoreProjectsAuditedCount Directory.Solution.targets`; `CI=true dotnet restore <sln> -p:NuGetAudit=false` must exit non-zero.
18. **Each accepted advisory MUST be a `NuGetAuditSuppress Include="https://github.com/advisories/GHSA-..."` item with a comment giving reason and removal condition.** Rationale: last resort, hides the advisory for all packages that share it. Verify: `grep -rn -B1 'NuGetAuditSuppress' --include=*.props --include=*.csproj .` shows a comment line above every hit.
19. **Remediation order for a vulnerable transitive: upgrade the closest package, then (non-packable projects only) transitive pin, then suppress.** Rationale: pinning in a packable project leaks to consumers (V20). Verify: `dotnet nuget why <proj> <PackageId>` and `dotnet package list --vulnerable --include-transitive` are clean.

**E. Sources**

20. **The repo MUST have a root `NuGet.config` with `<clear />` under `packageSources`, explicit sources, a `<packageSourceMapping>` that maps every source, and `<auditSources><clear />` naming nuget.org or `https://data.nuget.org/v3/index.json`.** Rationale: no machine-level source inheritance (docs), fail-closed mapping (V17, V18). Verify: `grep -c '<clear />' NuGet.config` >= 2 and `grep -q 'packageSourceMapping' NuGet.config`; `dotnet restore --packages "$(mktemp -d)"` exits 0.
21. **Private or secondary feeds MUST be mapped by specific prefix; `*` MUST map to exactly one source; the same pattern MUST NOT appear under two sources.** Rationale: the docs call duplicate patterns non-deterministic. Verify: `xmllint --xpath 'count(//packageSourceMapping/packageSource/package[@pattern="*"])' NuGet.config` equals 1.
22. **CI MUST restore into an empty or per-job packages folder (`NUGET_PACKAGES=$RUNNER_TEMP/nuget` or `--packages`), or rely on a committed lock.** Rationale: a warm global-packages folder bypasses mapping (V19). Verify: `grep -rn -e 'NUGET_PACKAGES' -e 'globalPackagesFolder' -e '--packages' .github NuGet.config` is non-empty; or `actions/cache` keyed on the lock hash.

**F. Hygiene**

23. **`NU1510` MUST be fixed by removing the redundant `PackageReference`, not muted; `RestoreEnablePackagePruning=false` is forbidden.** Rationale: V22; 5 corpus repos hide it and carry dead references. Verify: `dotnet restore -p:TreatWarningsAsErrors=true` exits 0 on net10 TFMs; `grep -rnE 'NU1510|RestoreEnablePackagePruning' --include=*.props --include=*.csproj --include=*.targets .` returns nothing.
24. **Exactly one solution file in the repo root, `.slnx`.** Rationale: SDK 10 default; two files give MSB1011 (V21b). Verify: `test "$(find . -maxdepth 1 \( -name '*.sln' -o -name '*.slnx' \) | wc -l)" -eq 1 && test -f ./*.slnx` (run with `shopt -s nullglob` or `ls *.slnx`).
25. **Automation that parses build or test output MUST pass `--tl:off` (`-tl:off` for `dotnet msbuild`) and `--interactive false`; humans' defaults stay.** Rationale: `--tl:on` injects escape sequences (V27); `--interactive` defaults on in interactive terminals. Verify: `grep -rnE 'dotnet (build|test|restore|pack|publish)' .github scripts | grep -v -e '--tl:off' -e '-tl:off'` returns nothing for lines whose output is parsed; `DOTNET_NOLOGO=1`, `DOTNET_CLI_TELEMETRY_OPTOUT=1` in the workflow `env`.
26. **Use `dotnet package add|list|remove` (noun first) in new scripts on SDK 10+; the verb-first forms still work.** Rationale: .NET 10 alias set ([SDK what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)); `dotnet package update --vulnerable` exists only noun-first. Verify: `grep -rnE 'dotnet (add|list|remove) package' .github scripts docs` returns nothing.

## AI-agent angle

| What an LLM typically gets wrong | Smallest mechanical check |
|---|---|
| Writes `"version": "10.0"`, `"10.0.x"` or `"10"` in global.json (modelled on `<TargetFramework>`). It is ignored and the build runs on SDK 11 RC1 (V4). | `jq -e '.sdk.version \| test("^[0-9]+\\.[0-9]+\\.[0-9]+$")' global.json` and `dotnet --version \| grep -E '^10\.0\.[0-9]+$'` |
| Adds a trailing comma or a misspelt `rollForward` value, or lower-case `rollforward`; no error. | `jq empty global.json`; `jq -e '.sdk.rollForward \| IN("latestFeature","disable")' global.json` |
| Treats `allowPrerelease: true` as "also allow previews" while pinning; with no version it means "newest preview wins". | `jq -e '.sdk.allowPrerelease == false' global.json` |
| Uses `dnx tool` or `dotnet tool install -g` in CI believing global.json applies. | `grep -rnE '(^\|[[:space:];&])dnx[[:space:]]' .github scripts` |
| Sets `actions/setup-dotnet` `dotnet-version: 8.0.x` (copied from .NET 8-era workflows) for a net10 repo. | `grep -rn 'dotnet-version' .github/workflows` next to `global-json-file` |
| Puts a `Version` on `PackageReference` in a CPM repo, or adds `<PackageReference Update=...>` hacks; NU1008. | `dotnet restore` exit code; `grep -rnE '<PackageReference[^>]*Version=' --include=*.csproj .` |
| "Fixes" a vulnerable transitive with `CentralPackageTransitivePinningEnabled=true` in a shipped library; the nuspec gains a dependency (V20). | `unzip -p artifacts/nupkg/*.nupkg '*.nuspec' \| grep '<dependency '` vs intended list |
| Conditions `Directory.Packages.props` on a csproj-body property (`IsPackable`); never true (V21). | grep `Condition=` in `Directory.Packages.props` for non-global properties; test with `-getProperty` |
| Adds `<NuGetAuditMode>direct</NuGetAuditMode>` "to reduce noise", or `NuGetAudit=false` in CI to "fix a flaky build", or `NoWarn NU1903`. | `dotnet msbuild <proj> -getProperty:NuGetAuditMode` per TFM; rule 15 grep |
| Assumes audit is on and transitive for every TFM ("NuGetAudit is on by default"); true for net10+, `direct` for net8-only (V12). | `dotnet msbuild <proj> -p:TargetFramework=net8.0 -getProperty:NuGetAuditMode` |
| Adds TWAE plus `WarningsNotAsErrors` NU1901-NU1904 only; an audit outage then fails the build (V14). | rule 16 check with the audit source blocked |
| Enables `RestorePackagesWithLockFile` without `RestoreLockedMode`, or `--locked-mode` without a committed lock (V24); thinks the gate exists. | `git ls-files '*packages.lock.json' \| wc -l` vs project count; `CI=true dotnet msbuild <proj> -getProperty:RestoreLockedMode` |
| Hallucinates MSBuild properties: `RestoreUseLockFile`, `NuGetLockMode`, `UseLockFile`, `NuGetAuditEnabled`, `AuditMode`, `LockedMode`. Real ones: `RestorePackagesWithLockFile`, `RestoreLockedMode`, `NuGetLockFilePath`, `RestoreForceEvaluate`, `NuGetAudit`, `NuGetAuditMode`, `NuGetAuditLevel`. | `dotnet msbuild <proj> -getProperty:<Name>` returns empty for an invented name; `grep -rnE 'RestoreUseLockFile\|NuGetLockMode\|NuGetAuditEnabled' .` |
| .NET Framework-era: `packages.config`, `nuget.exe restore`, `<RestoreSources>`, `PackageTargetFallback`, `Install-Package`. | `grep -rlE 'packages\.config\|RestoreSources\|PackageTargetFallback' .` |
| Tries to "fix" NU1004 by deleting the lock or setting `RestoreLockedMode=false`; misreads the swapped TFM labels in the message (V9). | the lock must be regenerated by `dotnet restore --force-evaluate`, never deleted in CI |
| Writes `<packageSourceMapping>` without `<clear />` in `packageSources`, or maps `*` to two sources; or tests mapping on a warm cache and declares it works (V19). | rule 20-22 checks with `--packages "$(mktemp -d)"` |
| Says `dotnet new sln` makes a `.sln`; adds `MyApp.sln` next to `MyApp.slnx`; CI scripts glob `*.sln`. | `ls *.sln* \| wc -l`; rule 24 |
| Mutes NU1510 (`NoWarn`) rather than deleting `System.Text.Json`/`Microsoft.Extensions.*` references that net10 already provides. | rule 23 |
| Runs `dotnet test MyApp.slnx` after switching global.json to MTP; fails with MTP argument errors. | rule 7 grep |
| Says the SDK version in global.json "must match the TargetFramework". They are independent ([global.json docs](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)). | n/a (reading heuristic: SDK 10 builds net8.0 TFMs) |
| Reads the NU1004 "Lock file target frameworks / Project target frameworks" labels literally. | known inverted message (V9) |

## Contested / evolving

- **Lock files for libraries.** Microsoft: do not commit for libraries, no harm if you do ([package-references](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#locking-dependencies)). xunit (59), SimpleExec (5) and the Anthropic SDK (8, not enforced) commit them; 22 of 28 global.json repos have none. Trend: the NuGet Security Best Practices page lists lock files as a consumer control ("Lock files store the hash of your package's content"), and the docs footnote now steers lock users to `rollForward: disable`. The unresolved [dotnet/sdk#48795](https://github.com/dotnet/sdk/issues/48795) (open, last comment Aug 2026) is the main argument against combining lock files with a rolling SDK. Which way it goes depends on whether the SDK moves implicit packages to `PackageDownload` (NuGet/Home#7724).
- **`rollForward`: latestFeature vs disable vs latestMinor.** Corpus split 10/5/(1 disable-equivalent: 0 repos). `disable` is correct with locks but hostile to Visual Studio users whose SDK auto-updates (the docs warn VS removes the previous SDK it installed). Trend: `paths` plus `errorMessage` (SDK 10) let a repo carry its own SDK (aspire), which removes the argument against `disable`.
- **`allowPrerelease` for .NET 11 before GA.** 7 repos set true; 6 pin an 11 preview/RC (aspire exact RC1 with `rollForward: major`). For a library that wants an 11 RC lane, pin the exact RC version in a *separate* global.json used by a CI matrix leg, never the default. After GA (November 2026) `{"sdk":{"allowPrerelease":false}}` without a version silently becomes SDK 11.
- **Transitive pinning for libraries.** 8 corpus repos enable it; the docs warn. Trend: pruning (NuGet 7.0) shrinks the number of false-positive transitives that motivated pinning (framework-provided packages vanish from the graph).
- **NuGetAuditMode default.** Changed from `direct` to `all` for net10+ in NuGet 7.0 / SDK 10.0.100. Multi-targeting libraries that keep `net8.0` only get `all` because of the net10 leg; if net10 is ever dropped the default falls back to `direct` without notice. .NET 8 and 9 reach end of support on 2026-11-10 (per the topic map, frame correction 1), which makes net10-only the likely end state and the explicit setting redundant but harmless.
- **`--interactive` default and automation.** Interactive-by-default is new in .NET 10; harnesses that allocate a pty can hang on credential prompts. Whether agents should set `DOTNET_CLI_...` env vars or per-command flags is not standardised; `--interactive false` per command is the documented form.
- **`dnx` semantics.** Changed within the 10.0.x line: bands 1xx/2xx honour global.json, 3xx/4xx and 11.0 do not (commit 2026-05-27). The same `dnx` command therefore behaves differently by installed SDK band; no single doc page states this.
- **`dotnet test` runner selection.** global.json `test.runner` (SDK 10) versus `DOTNET_TEST_RUNNER` (.NET 11 Preview 6+, RC1 listed). RC1 known issues: relative project paths (dotnet/sdk#56196), exit code 8 with `--zero-tests-policy` (dotnet/sdk#56214). Flag: do not generalise RC1 `dotnet test` behaviour into rules.
- **Terminal Logger.** Default-on in interactive terminals since .NET 9 SDK; docs still say not to parse its output. The xunit build gates `--tl:off` on SDK major > 8, showing the flag itself is version-sensitive for some commands.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/tools/global-json | global.json reference: schema, rollForward table, matching rules, `paths`, `errorMessage`, `test.runner` | updated 2026-04-30, SDK 10 | primary; the exact resolution rules and the `disable`-with-lock-files footnote |
| https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages | NuGet Audit: properties, defaults, audit sources, warning codes, CI pipeline split, audited-count assertion | updated 2026-07-07, NuGet 7 | primary; NU1900-NU1905 policy and the `RestoreProjectsAuditedCount` recipe |
| https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management | CPM: enabling, transitive pinning, pack behaviour, overrides, NU1507 | updated 2026-03-03 | primary; the "transitive pinning and pack" warning for library authors |
| https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files | PackageReference: lock files, locked mode, libraries, PrunePackageReference, duplicate-TFM multi-targeting | updated 2026-08-15, NuGet 7.x | primary; "should not check in the lock file" for libraries; pruning rules |
| https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping | package source mapping syntax, precedence, global-packages-folder caveat | updated 2026-08-03 | primary; the warm-cache bypass sentence |
| https://learn.microsoft.com/en-us/nuget/concepts/security-best-practices | NuGet supply-chain guidance: clear sources, lock files, mapping, audit sources | updated 2026-08-03 | primary; repo-root nuget.config baseline and the metadata-query limitation |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1004 | NU1004 locked-mode errors (TFM change, version change) | 2022, updated 2024 | primary; the scenario wording (labels as printed) |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1510 | NU1510 pruning warning | 2026-05-28 | primary; when it is and is not raised |
| https://learn.microsoft.com/en-us/nuget/api/vulnerability-info | VulnerabilityInfo/6.7.0 resource format | 2023, updated 2025 | primary; lets a fixture fake an audit source |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.0 | NuGet 7.0 (SDK 10.0.100): audit `all` default, pruning, lock diff, https-only service index | 2026-04-14 | primary; dates the default changes |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk | .NET 10 SDK: `dnx`, `dotnet tool exec`, pruning, `--interactive`, noun-first commands, MTP switch | 2025-11, updated 2026-07 | primary; era facts for SDK 10 |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | .NET 11 SDK (RC1): `DOTNET_TEST_RUNNER`, NativeAOT CLI, MSBuild server default, known `dotnet test` RC1 issues | 2026-09-12, RC1 | primary; the .NET 11 flags |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-restore | `dotnet restore` options incl. `--locked-mode`, `--use-lock-file`, `--tl`, audit section | updated 2026-04 | primary; exact flags and `--tl` semantics |
| https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference | MSBuild switches: `-tl`, `-warnAsError`, `-getProperty`, `-restoreProperty`, slnx note | updated 2026-10-08 | primary; `-getProperty` is the verification primitive used here |
| https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test | `dotnet test` VSTest vs MTP mode, migration steps | 2026-09-12 | primary; argument-shape changes under MTP mode |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default | breaking change: `dotnet new sln` creates `.slnx` | 2025-08-30, SDK 10 | primary; the `--format sln` escape hatch |
| https://devblogs.microsoft.com/dotnet/introducing-slnx-support-dotnet-cli/ | slnx CLI support in SDK 9.0.200, `dotnet sln migrate` | 2025-03-13 | background; tool-support gaps at introduction (historical) |
| https://github.com/dotnet/sdk/issues/48795 | locked-mode NU1004 after an SDK patch because of implicit `Microsoft.NET.ILLink.Tasks` | 2025, comment Aug 2026 | primary; the real-world failure behind "lock file means `rollForward: disable`" |
| https://github.com/dotnet/sdk/blob/release/10.0.4xx/src/Layout/redist/dnx | the shipped `dnx` script (newest SDK via `--list-sdks`) | 2026-06 | primary source; shows the global.json bypass; compare `release/10.0.1xx` (one-liner) |
| https://github.com/dotnet/sdk/commit/cf67b960b0d90c4a8a84452f2dace93ab66e7fa3 | commit "Update the dnx script to use the newest SDK" | 2026-05-27 | primary; the stated intent ("despite any global.json") |
| https://github.com/dotnet/sdk/blob/release/10.0.1xx/src/Layout/redist/dnx | the earlier `dnx` one-liner that honours global.json | 2025-07 | primary; band-dependent behaviour |
| https://github.com/actions/setup-dotnet | `global-json-file`, `dotnet-version` forms, caching keyed on lock file | v6 | primary-ish tooling doc; how CI should consume global.json |

Exemplar clones read (additional, `/home/mherwig/.cache/research-lang/exemplars/csharp/`): adamralph__simple-exec@f80913246993, App-vNext__Polly@e4476096da5b, xunit__xunit@0c7aa4991fa3, StackExchange__StackExchange.Redis@e7c43a269f53, dotnet__aspire@af646baee1e8, GitTools__GitVersion@5057cdbcc177, npgsql__npgsql@9c47244547c2, coverlet-coverage__coverlet@ecd6fd5533e7, dotnet__sourcelink@6ec19dda0e19, microsoft__testfx@7226b0c74729, Azure__azure-sdk-for-net@32c48fc3d524, anthropics__anthropic-sdk-csharp@ae16e5933f39, stripe__stripe-dotnet@dbdca6ba5efc, cake-build__cake@08885933e936, dotnet__BenchmarkDotNet@61ebda8a50ae, dotnet__roslynator@167f43468118, pulumi__pulumi-dotnet@2a0dca84f09b, Humanizr__Humanizer@4574b93883bf; counts from `csharp-audit/exemplar-build-and-gates.md:20-22,33,37,48`.
