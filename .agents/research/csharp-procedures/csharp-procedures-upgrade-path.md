---
title: "Upgrading a .NET 8 repo to .NET 10 LTS, and the shape of the 10 to 11 hop: ordered steps, breaking-change checklist, rollback, tooling"
topic: csharp-procedures-upgrade-path (AG-01, BD-14) - input to the dotnet-upgrade skill
agent: deep-dive researcher (wave 2, group "Skill corpora: dotnet-diagnose, dotnet-upgrade, dotnet-release app path")
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 35
scope: |
  Covers: the ordered step list for moving a repo from net8.0 to net8.0;net10.0 on SDK 10 (one verification command per step), the breaking-change
  checklist for libraries (C# 14 span overloads, `field`, BinaryFormatter, SIGTERM, STJ, NU1510, NuGetAudit, CLI defaults, MTP, slnx, containers),
  the rollback point, the 10 to 11 hop as an RC1-flagged outline, and the Upgrade Assistant vs Copilot upgrade agent status.
  Method: the whole procedure was replayed on a real library (adamralph/simple-exec@800a8d0, adapted to net8-only on SDK 8.0.425, then upgraded step
  by step on SDK 10.0.401; 15 commits, each tagged); every breaking change was reproduced in a fixture before it is listed; the 11 hop was probed on
  SDK 11.0.100-rc.1. Consumes csharp-build verdicts (CS-BUILD-xx) and csharp-api-evolution-gates section 6; it does not re-decide them.
  Not covered: ASP.NET / WPF / WinForms / MAUI app upgrades, EF Core migrations, Windows and macOS execution (all runs are linux-x64), the Copilot upgrade
  agent itself (no Copilot subscription on this host; documented from Microsoft pages only), and any API-level BCL break not on the compat pages' grep-able list.
---

# Upgrading .NET 8 to .NET 10 LTS (and looking at 11)

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Support clock and target](#1-support-clock-and-target)
   2. [The ordered procedure](#2-the-ordered-procedure)
   3. [Why this order: what each step breaks when taken early](#3-why-this-order-what-each-step-breaks-when-taken-early)
   4. [Breaking-change checklist for libraries](#4-breaking-change-checklist-for-libraries)
   5. [Analyzer delta, measured](#5-analyzer-delta-measured)
   6. [CLI and SDK default changes](#6-cli-and-sdk-default-changes)
   7. [Rollback](#7-rollback)
   8. [The 10 to 11 hop (RC1, outline only)](#8-the-10-to-11-hop-rc1-outline-only)
   9. [Upgrade Assistant, the Copilot upgrade agent, and what an agent should use](#9-upgrade-assistant-the-copilot-upgrade-agent-and-what-an-agent-should-use)
   10. [Exemplar evidence](#10-exemplar-evidence)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Clock.** .NET 8 and .NET 9 both reach end of support on 2026-11-10, 30 days after this research date. .NET 10 is LTS (GA 2025-11-11, EOS 2028-11-14, latest 10.0.12). .NET 11 is at RC1 (GA expected November 2026) and is not a target yet.
- **Shape.** The upgrade is not "change the TFM". It is a ladder of nine small commits, each with one command that goes red before and green after. Order matters: three of the steps produce hard errors when taken too early (section 3).
- **Hidden first step.** The SDK bump alone turns a green net8 build red when the repo sets `dotnet_analyzer_diagnostic.severity = warning` in a `.globalconfig` (IDE0370 appears, four errors on the replay tree). `AnalysisLevel 8.0-all` does not freeze it. Remove the bulk line, pin the level, then bump.
- **TFM add is where the build breaks.** Adding `net10.0` produced a compile error in a `#if NET8_0` ladder (CS-BUILD-05's hazard, reproduced), and under `CI=true` every project failed restore with NU1004 until locks were regenerated in the same commit.
- **C# 14 is a behaviour change, not only a syntax gift.** At LangVersion 14, an overload set containing `T[]`/`IEnumerable<T>` and `Span<T>` can pick a different overload; with a covariant array it throws ArrayTypeMismatchException at runtime, and an expression-tree `Contains` throws ArgumentException. Both reproduce on net8.0 and net10.0. The compiler is silent; only tests on every TFM catch it.
- **Runtime changes are TFM-conditional.** BinaryFormatter throws on net10 and works on net8 (221 bytes); a SIGTERM no longer runs `ProcessExit` on net10; STJ 10 throws `InvalidOperationException` on `$type` property-name conflicts, also on net8 when the STJ 10 package is referenced (CS-JSON).
- **NuGetAudit.** The default mode flips from `direct` to `all` for net10 targets. A transitive Newtonsoft.Json 10.0.3 became NU1903 (error under TWAE) exactly when `net10.0` was added. Set `all` explicitly before adding the TFM (CS-BUILD-26) and the finding appears on net8 first.
- **Tooling traps found while measuring.** `dotnet test --nologo` in MTP mode forwards the flag to the test app and gives "Zero tests ran", exit 5 (SDK 10.0.401). `--interactive false` is accepted by `restore`/`build`/`test` and rejected by `dotnet package list`, `dotnet list package` and `dotnet tool restore`. SDK 8.0.425 cannot read a `.slnx` (MSB1003).
- **Rollback is a tag, not a flag.** A full `git worktree add ../rb pre-net10` restored SDK 8.0.425 with a green build and 46 passing tests. Reverting `global.json` alone fails (NETSDK1045, MSB1003).
- **Upgrade Assistant is deprecated.** Microsoft's replacement is the GitHub Copilot upgrade / app modernization agent (needs a Copilot subscription). An agent without it follows the manual ladder here; the ladder also encodes gates the Copilot agent does not know.
- **10 to 11 (RC1, not executed).** On the final tree, SDK 11 RC1 builds unchanged (0/0). `AnalysisLevel 11.0-all` brings IDE0370 back; adding `net11.0` gave CA2016 at one site, fixed by forwarding the token; tests passed on all three TFMs after the fix. Treat it as an outline until GA.

## Findings

### 1. Support clock and target

Retrieved 2026-10-11 from the support-policy page:

| Release | Type | GA | End of support | Latest patch seen |
|---|---|---|---|---|
| .NET 8 | LTS | 2023-11 | 2026-11-10 | 8.0.31 |
| .NET 9 | STS | 2024-11 | 2026-11-10 | 9.0.20 |
| .NET 10 | LTS | 2025-11-11 | 2028-11-14 | 10.0.12 |
| .NET 11 | RC1 | expected 2026-11 | not final | 11.0.0-rc.1.26425.128 |

Consequences for the skill: the upgrade target is `net10.0`; `net9.0` is never a stop (same EOS as 8); `net11.0` is a follow-up. The repo keeps `net8.0` as a TFM until after 2026-11-10 and removes it only at a major version (CS-BUILD-08).

### 2. The ordered procedure

Every step is its own commit. "Verify" is the one command to run after the step; the red column is what the same command printed before the step on the replay tree (SDK 8.0.425 start, 10.0.401 after step 1). Replay tags are in `net8-baseline/` (section 11).

| # | Step | Verify (exit 0 / prints) | Red before the step | Replay tag |
|---|---|---|---|---|
| 0 | Tag the rollback point on a green tree: `git tag pre-net10` | `dotnet build -warnaserror && dotnet test` green, then `git rev-parse --verify pre-net10` | n/a | `pre-net10` |
| 1 | Pin SDK 10 in `global.json` (CS-BUILD-20), set `AnalysisLevel` to the OLD level explicitly (`8.0-all`), delete any `dotnet_analyzer_diagnostic.severity` bulk line (CS-BUILD-11) | `dotnet --version` prints 10.0.401; build 0 warnings 0 errors; `grep -rnE '^dotnet_analyzer_diagnostic' --include=.globalconfig --include=.editorconfig .` exits 1 | 4 x IDE0370 "Suppression is unnecessary" | `step1-red`, `step1-green` |
| 2 | Raise `AnalysisLevel` to `10.0-all` (CS-BUILD-10); fix or suppress each new diagnostic at the site (CS-BUILD-12) | build 0/0 | CA2025 at `SimpleExec/Command.cs(369,26)` | `step2-red`, `step2-green` |
| 3 | LangVersion 14 effective in every project (CS-BUILD-04): delete per-project `<LangVersion>default</LangVersion>` | `find . -name '*.csproj' -print0 \| xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:LangVersion` prints the same value `14` for each | `14 default default` | `step3-red`, `step3-green` |
| 4 | Set `NuGetAudit` true and `NuGetAuditMode` all explicitly in `Directory.Build.props` (CS-BUILD-26); promote or update any flagged transitive | per-project `dotnet msbuild -getProperty:NuGetAuditMode` prints `all` for every TFM | `3 all / 3 direct` (default mode splits per TFM) | `step5-red`, `step5-green` |
| 5 | Centralise `TargetFrameworks` in `Directory.Build.props` (CS-BUILD-01), then add `net10.0` in a separate commit that also fixes `#if NETx_y` ladders (CS-BUILD-05) and regenerates lock files | `CI=true dotnet build` and `CI=true dotnet test` green on both TFMs; `grep -rnP --include='*.cs' '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+)\b' .` exits 1 | CS1002/CS1525 in `Tester.cs(5,33)` on net10.0; NU1004 x3 under `CI=true` | `step4a`, `step4b-red`, `step4b-green` |
| 6 | Delete or condition every package that net10 now prunes (NU1510, CS-BUILD-28); bump analyzers and test packages; list with `dotnet package list --outdated` | `dotnet build` 0/0 on both TFMs; outdated list holds only deliberate holds | `NU1510: PackageReference System.Text.Json will not be pruned` (fixture) | `step6` |
| 7 | If any test project is MTP-based (xunit.v3, MSTest.Sdk, TUnit), add `"test": {"runner": "Microsoft.Testing.Platform"}` to `global.json` | `dotnet test --minimum-expected-tests 1` exits 0 | "Testing with VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK and later", exit 1 (fixture) | n/a (not applicable to the VSTest replay tree) |
| 8 | Solution file to `.slnx`: `dotnet sln X.sln migrate`, then `git rm X.sln` (CS-BUILD-29). Last, because SDK 8 cannot read it | `test "$(find . -maxdepth 1 \( -name '*.sln' -o -name '*.slnx' \) \| wc -l)" -eq 1` and `dotnet build` green | MSB1011 with both files present | `step7` |
| 9 | CI and containers: `actions/setup-dotnet` with `global-json-file: global.json` in every workflow (CS-BUILD-21); images `dotnet/sdk:10.0` / `runtime:10.0-noble-chiseled`; devcontainer `10.0` | `grep -rLn 'global-json-file' .github/workflows \| xargs -r grep -ln 'dotnet '` prints nothing; Dockerfile grep (rule 13) exits 1 | two workflows pinned to 9.0.308; `devcontainers/dotnet:8.0` | `step8` |
| 10 | Do not remove `net8.0` yet. Removal is a major version after 2026-11-10 (CS-BUILD-08) | the TFM list still contains `net8.0` | n/a | n/a |

Whole-hop cost on the replay tree: 17 files changed, +172/-105 lines (`git diff --stat pre-net10 step8`), of which the three `packages.lock.json` files are most of the churn. PublicAPI files: 0 files changed when `net10.0` is added with an unchanged surface (`git diff --stat step4a step4b-green -- '*PublicAPI*'` is empty). A TFM-specific API needs the per-TFM layout from csharp-api-evolution-gates section 6 (layout C: shared pair plus `PublicAPI/$(TargetFramework)` delta directory, enabled by `Exists(...)`); layout A (one root pair) gives RS0017 on net8. That layout was not re-run here.

The replay ran the audit step (4) after the TFM add (5) because that is the order the work was done. The fixture `deps-lib/` shows an explicit `all` on a net8-only project surfaces the same three NU1903 findings, so the recommended order (audit first) is sound and keeps the TFM commit free of dependency noise.

### 3. Why this order: what each step breaks when taken early

| Taken early | What breaks | Evidence |
|---|---|---|
| SDK 10 before freezing the analyzer set | IDE0370 enters via the bulk severity line, even with `AnalysisLevel 8.0-all` set. Pinning the level alone did not fix it; removing the bulk line did | `step1-red` (4 errors), `step1-green` |
| `AnalysisLevel 10.0-all` and the TFM in one commit | CA2025 (a net8-visible finding) is mixed with TFM errors; two red causes in one diff | `step2-red` is a net8-only build |
| LangVersion 14 after the TFM add | The per-project `default` overrides survive and half the projects stay on the old language; found only with `-getProperty:LangVersion` | `14 default default` |
| TFM add before locks are regenerated | NU1004 on every project under `CI=true` (it needs a cleared `obj`; a no-op restore skips the lock check) | `step4b-red` |
| TFM add with an exact-TFM `#if` ladder | `#if NET8_0 ... #if NET9_0` has no `NET10_0` branch, so the path expression is empty: CS1002/CS1525 | `Tester.cs(5,33)` |
| Audit mode left to the default | Flips to `all` when `net10.0` joins: a transitive Newtonsoft.Json 10.0.3 became NU1903 error | `deps-lib/` |
| `.slnx` first | SDK 8.0.425 reports MSB1003 (no project or solution found); every net8 developer is locked out | `step7` plus SDK-8 rollback check |
| `global.json` rollback alone, after the TFM add | NETSDK1045: the SDK does not support net10.0 | rollback check |

### 4. Breaking-change checklist for libraries

"Reproduced" means a fixture under `c14-breaks/`, `behaviors/` or `deps-*` printed the failure and its fixed twin printed none (section 11).

| # | Change | Since | Who is hit | Detect | Fix | Status |
|---|---|---|---|---|---|---|
| B1 | **First-class span overloads.** More overloads apply; ambiguity errors, silent different-overload choice, `ArrayTypeMismatchException` with covariant arrays (`string[]` passed as `object[]`) | C# 14 (LangVersion 14, any TFM) | any library with `T[]`/`IEnumerable<T>` plus `Span<T>`/`ReadOnlySpan<T>` overloads, and callers of `MemoryExtensions` | tests on every TFM; no compiler diagnostic | give the intended overload a distinct signature, or call it explicitly, or `.AsEnumerable()` | reproduced: LangVersion 12 prints "R picked overload 1", 14 throws, on net8.0 and net10.0 |
| B2 | **Expression trees and `Contains`.** `array.Contains(x)` inside an expression tree binds to `MemoryExtensions.Contains`, throws under interpretation | C# 14 | EF/LINQ-provider code, interpreted `Expression.Compile(preferInterpretation: true)` | tests on every TFM | `Enumerable.Contains(array, x)` | reproduced: `True` at 12, `ArgumentException` at 14 |
| B3 | **`array.Reverse()` binds to in-place `MemoryExtensions.Reverse(Span<T>)`** (returns void) only when C# 14 targets a TFM older than net10.0 | C# 14 on net8 | any `using System;` file with `var r = arr.Reverse();` | compiler: CS0815 on net8.0 only | `Enumerable.Reverse(arr)` | reproduced; needs `using System;` to trigger |
| B4 | **`field` is a keyword in property accessors.** A member named `field` now binds to the synthesized backing field (CS9258, a warning, an error under TWAE); a local or parameter named `field` is an error. The learn page lists CS9272; SDK 10.0.401 emits **CS9273** | C# 14 | any code with a member/local/parameter called `field` | compiler | `this.field` or `@field`, or rename | reproduced |
| B5 | `extension` and `scoped` contextual-keyword changes | C# 14 | types named `extension` / `scoped` | compiler | rename or `@` | from the compiler-breaking-changes page only; not reproduced |
| B6 | **BinaryFormatter always throws** (`PlatformNotSupportedException`); a separate unsupported package exists | .NET 9 | any serializer/clone/cache code on a net10 TFM | `grep -rn BinaryFormatter`; tests | replace the serializer (STJ, MessagePack, Protobuf); do not ship the unsupported package | reproduced: net8.0 serialized 221 bytes, net10.0 threw |
| B7 | **No default SIGTERM handler:** `AppDomain.ProcessExit` and `AssemblyLoadContext.Unloading` no longer run on SIGTERM, exit code stays 143 | .NET 10 | apps and libraries that register cleanup on `ProcessExit` | `grep -rnE 'ProcessExit\|Unloading'`; a SIGTERM test | `PosixSignalRegistration.Create(PosixSignal.SIGTERM, ...)`, or the Generic Host | reproduced: net8.0 "ProcessExit ran", net10.0 nothing; fixed twin ran both |
| B8 | **STJ property-name validation:** a property named like the `$type`/`$id`/`$ref` metadata name or `TypeDiscriminatorPropertyName` throws `InvalidOperationException` instead of emitting duplicate keys | STJ 10 | polymorphic models with a `Type` discriminator property | tests; CS-JSON | rename the property or the discriminator | reproduced: net8.0 inbox STJ emitted `{"Type":"dog","Type":"Dog"}`; net10.0 and net8.0 + STJ 10.0.12 package threw |
| B9 | **NU1510** for a `PackageReference` that net10 prunes (System.Text.Json, Microsoft.Bcl.AsyncInterfaces, ...) | SDK 10, net10+ target | libraries that carried polyfill/inbox packages for net8 | build | delete it, or `Condition="!$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net10.0'))"` (CS-BUILD-28); never `NoWarn` | reproduced |
| B10 | **NuGetAuditMode default `all` for net10+ targets** (`direct` for net9 and below). It was briefly `all` in a .NET 9 preview, reverted in 9.0.101 | SDK 10 | libraries with transitive vulnerabilities | per-TFM `-getProperty:NuGetAuditMode` | explicit `all` first; update or promote the transitive; never force `direct` | reproduced |
| B11 | **Exact-TFM `#if`** (`NET8_0`, `NET9_0`) has no net10 branch | any TFM add | any `#if` ladder, test helpers | `grep -rnP` in step 5 | `NET8_0_OR_GREATER` (CS-BUILD-05) or stamp the value via build metadata | reproduced |
| B12 | **`DefineConstants` TFM constants not available at MSBuild evaluation time** | SDK 10 (docs) | `.props` with `$(DefineConstants.Contains('NET8_0'))` | `grep` in rule 18 | `$([MSBuild]::IsTargetFrameworkCompatible(...))` | **not reproduced** in item-condition form on SDK 8.0.425 or 10.0.401 (the constants were not visible on either). Treat as docs-only |
| B13 | **Container tags:** default SDK-container base is Ubuntu 24.04 `noble`; there is no `10.0-bookworm-slim`/`10.0-trixie-slim`; `-chiseled` exists for runtime and aspnet only, not sdk | .NET 10 | Dockerfiles and `ContainerFamily` users | registry tag list (section 11) | `10.0`, `10.0-noble`, `10.0-noble-chiseled`, `10.0-alpine`, `10.0-azurelinux3.0`; also `10.0-resolute` (Ubuntu 26.04) | verified against the MCR API |
| B14 | `dotnet new sln` creates `.slnx` | SDK 10 | scripts that assume `.sln` | `ls` | `dotnet new sln --format sln` if you must | docs |
| B15 | Terminal Logger default, `--interactive` default (true for user scenarios, false in CI or redirected output) | SDK 9 / SDK 10 | scripts parsing `dotnet` output | see section 6 | `--tl:off`, `DOTNET_NOLOGO=1`; `--interactive false` only where accepted | reproduced |

Not on this list on purpose: the long tail of API-level BCL breaks in the compat pages. The skill should have the agent read the 8 to 10 compat index for APIs the library actually calls (`grep` its public surface against the page titles); that mapping was not automated or verified here.

### 5. Analyzer delta, measured

From the SDK's `analysislevel_{8,10,11}_all.globalconfig` files (SDK 10.0.401, 11.0.100-rc.1):

- 8 to 10: new rule IDs **CA1515** (public types in an exe, new in 9) and **CA2025**; eight rules go from `none` to `warning` (CA1514, CA1871 to CA1875, CA2262, CA2263). Rule lines: 285 at 8, 281 at 10 (some are removed).
- 10 to 11: new IDs **CA1517, CA1876, CA1877, CA2026, CA2027, CA2028**.
- Real tree, unmodified source, `Tyrrrz/CliWrap@7dbc252fa773` on net10.0, TWAE off, built at `AnalysisLevel 8.0-all` then `10.0-all`: 205 unique sites / 26 IDs at 8.0-all; 214 to 215 sites / 28 IDs at 10.0-all (run-to-run difference of one site). New: CA1515 x8 or x9, CA2025 x1. Plan on one to ten new sites per library; the replay tree had exactly one (CA2025).
- Polly itself measured 0 because its config suppresses nearly everything; that is not a datapoint.
- CA2025 is documented as "Enabled by default in .NET 10: No". It fires here only because the tree runs `AnalysisMode All` / `-all`.

### 6. CLI and SDK default changes

Measured on SDK 10.0.401 against the replay tree (`inter.sh`, `evidence.txt` section 10):

| Command | `--interactive false` | bare `--interactive` |
|---|---|---|
| `dotnet restore`, `dotnet build --no-restore`, `dotnet test --no-build` | exit 0 | exit 0 |
| `dotnet package list` | exit 1 ("Unrecognized command or argument 'false'") | exit 0 |
| `dotnet list package` | exit 1 | exit 0 |
| `dotnet tool restore` | exit 1 | exit 0 |
| `dotnet pack`, `dotnet nuget why` | exit 1 (also exit 1 without `false`: inconclusive in my invocation) | exit 1 |

CS-BUILD-30 says to pass `--interactive false` to automation that parses `dotnet` output. That is right for restore, build and test and wrong as a blanket rule: the package-listing and tool commands treat `--interactive` as a flag and `false` as a stray argument. Raise this with csharp-build's owner; the safe blanket is `CI=true` (the SDK defaults interactive to false in CI or when output is redirected) plus `--tl:off`.

Other measured SDK facts:

- `dotnet test` in MTP mode (global.json runner set) needs the 10 SDK and Microsoft.Testing.Platform 1.7+. With no runner key, an MTP project exits 1 with the "no longer supported ... opt-in to the new dotnet test experience" text. `--minimum-expected-tests` needs 10.0.100; `-e` env vars need 10.0.110. `--no-build --minimum-expected-tests 1 -- --filter-method NoSuch` exits 8.
- **`dotnet test --nologo` on an MTP project forwards `--nologo` to the test app** (trace via `DOTNET_CLI_TEST_TRACEFILE`: the app was started with ` --nologo --server dotnettestcli ...`). Result: "Zero tests ran", exit 5, with the tests actually passing when `--nologo` is dropped. `DOTNET_NOLOGO=1` silences the banner. The MTP page says `--nologo` for MTP mode is available starting .NET 11 Preview 7. The `mtp-mstest` probe in this fixture dir hit the same exit 5 for the same reason, so it is inconclusive; the diagnose-catalogue fixture `mtp/pass` is probably affected too.
- `dotnet package list --outdated` is the SDK 10 form; `dotnet list package` still works.
- Locked-mode NU1004 reproduces only after clearing `obj`.
- `dotnet sln` gains removal by name in SDK 10 and `.slnf` editing in SDK 11 (docs).

### 7. Rollback

Rollback point: a git tag on the last green net8 commit, created before step 1 (`git tag pre-net10`). All state that determines the build lives in the tree (global.json, Directory.Build.props, locks, solution file, workflows), so restoring the tree restores the build.

| Rollback | Result on the replay tree |
|---|---|
| `git worktree add ../rollback-wt pre-net10` then `CI=true dotnet build && dotnet test` | SDK 8.0.425, 0 warnings, 0 errors, 46 passed 2 skipped |
| revert only `global.json` to 8.0.425 on the finished tree | `.slnx` present: **MSB1003**. Building the csproj: **NETSDK1045** (net10.0 unsupported) |

Points of no return:

- For developers, step 5 (adding `net10.0`) and step 8 (`.slnx`): after them an SDK 8 machine cannot build.
- For consumers, publishing a package with a `net10.0` asset: consumers can not be rolled back; ship a fixed version instead.
- One upgrade is one PR; revert the PR, not single files.

### 8. The 10 to 11 hop (RC1, outline only)

Status: .NET 11 is at RC1 (what's-new page "last updated for release candidate 1", GA expected November 2026); the compat/11 page is dated 2026-06-04, updated 2026-10-08 and will still move. Nothing below is GA-final. Run against SDK 11.0.100-rc.1.26425.128 in `net11-probe/` (a copy of the finished tree, `allowPrerelease: true`, `rollForward: disable`):

| Probe | Result |
|---|---|
| SDK 11 RC1 on the unchanged tree (`net8.0;net10.0`, `AnalysisLevel 10.0-all`) | 0 warnings, 0 errors |
| `AnalysisLevel 11.0-all` | IDE0370 reappears at 4 sites on both TFMs |
| add `net11.0`, level stays `10.0-all` | CA2016 error at `SimpleExec/ProcessExtensions.cs:48` on net11.0 only (`Console.Out.WriteAsync(string)` now has a `CancellationToken` overload) |
| fix: `WriteAsync(text.AsMemory(), cancellationToken)` | build 0/0, 46 tests pass on net8.0, net10.0 and net11.0 |
| default `NuGetAuditMode` on net11.0 | `all` |
| new rule IDs at 11 | CA1517, CA1876, CA1877, CA2026, CA2027, CA2028 |

Outline of the hop, for after GA (the same ladder, shorter):

1. Do not float. A floating `AnalysisLevel` or an SDK 11 that `latestFeature` happens to select breaks the build (the topic map's note on CA1517/1876/1877/2026/2027/2028). Keep `allowPrerelease: false` in `main`; probe on a branch.
2. Bump the SDK pin to the GA 11.0.1xx. Verify: build 0/0 on the unchanged tree.
3. Raise `AnalysisLevel` to `11.0-all` in its own commit; expect IDE0370 and the six new IDs; fix at the site.
4. Add `net11.0` (TFM commit with locks). Expect new-overload analyzer hits like CA2016. Verify: `CI=true` build and test on all three TFMs.
5. Compat/11 items to grep for: nine `Microsoft.Extensions.*` libraries move into the shared framework (Caching.Abstractions, Configuration.Abstractions, DependencyInjection.Abstractions, Diagnostics.Abstractions, FileProviders.Abstractions, Hosting.Abstractions, Logging.Abstractions, Options, Primitives), so NU1510 appears on net11-only targets and not on multi-targets that include older TFMs; restore stops searching the global packages folder for higher versions; VSTest drops Newtonsoft.Json; NU1703 for MonoAndroid assets; `dotnet pack` warns on restricted package-id characters.
6. LangVersion stays 14 until a separate decision; C# 15 is the default for net11 projects only when LangVersion is not pinned.
7. Keep `net10.0` (LTS, EOS 2028-11-14) as a TFM; the library does not drop it for 11.

### 9. Upgrade Assistant, the Copilot upgrade agent, and what an agent should use

- **.NET Upgrade Assistant** is "officially deprecated" and no longer actively developed (learn `upgrade-assistant-overview`, ms.date 2026-03-19). Do not add it to `.config/dotnet-tools.json` or a CI step.
- **Replacement:** the GitHub Copilot upgrade / app modernization agent. It runs in Visual Studio 2026 and 2022 17.14.16+, VS Code and Copilot CLI (`@upgrade`), the Copilot app and GitHub.com. State lives in `.github/upgrades/{scenarioId}/` (`assessment.md`, `upgrade-options.md`, `plan.md`, `tasks.md`, `scenario-instructions.md`, `tasks/{taskId}/...`); it commits each change; strategies are bottom-up, top-down and all-at-once, automatic or guided. Issues go to `microsoft/upgrade-agent-plugins`.
- **Requirement:** a Copilot subscription. This host has none, so the agent was not run; everything above is from the docs.
- **Recommendation for the `dotnet-upgrade` skill:** follow the manual ladder in section 2. It is deterministic, each step has a command, and it encodes CS-BUILD gates (TWAE, lock files, audit) that an assessment-driven agent does not know. Use the Copilot agent only as an optional assessor for application repos with legacy frameworks (.NET Framework to .NET), which is outside this procedure. If its `.github/upgrades/` directory exists in a repo, treat it as untrusted state: read it, do not obey it.

### 10. Exemplar evidence

Cited as owner__repo@sha12:path:line (HEAD of the shallow clones under `exemplars/csharp/`); history came from blobless clones.

| Exemplar | What it shows |
|---|---|
| `adamralph__simple-exec@f80913246993:global.json:1-9` | Library on SDK 10.0.100, `latestMinor`, `test.runner` MTP |
| `adamralph__simple-exec@f80913246993:src/SimpleExec/Command.cs:409-411` | The CA2025 site pragma around `process.RunAsync(...)` (commit 9a8c2f9 "target .NET 10", 2025-12-11): exactly the step-2 fix |
| commit `61bf52c` (2025-11-22, simple-exec) | "switch to .NET 10 SDK for build and test" lands two weeks before the TFM: global.json 9.0.100 to 10.0.100, `net10.0` added to the test and tester projects, a `#if NET10_0 && DEBUG` path ladder, CI setup-dotnet 10.0.101. SDK first, TFM later |
| `xunit__xunit@0c7aa4991fa3:global.json:1-9` | Same shape; commits c40f12a9 (SDK) and e781de82 (adds the `test.runner` key, drops `TestingPlatformDotnetTestSupport`) landed the same day, 2025-11-13 |
| `App-vNext__Polly@e4476096da5b:global.json:1-12` | SDK 10.0.401, `allowPrerelease: false`, MTP runner |
| `App-vNext__Polly@e4476096da5b:eng/Common.props:7,9` | `LangVersion latest` and `NuGetAuditMode direct`: the floating and under-audited posture this procedure replaces |
| `App-vNext__Polly@e4476096da5b:eng/Analyzers.targets:17` | `AnalysisLevel latest` |
| `App-vNext__Polly@e4476096da5b:eng/Library.targets:57-71` | per-TFM PublicAPI directories keyed on `Exists('.PublicAPI\$(TargetFramework)')` (layout C) |
| Polly commits `f56e106c` (2025-05-16 ".NET 10 preparation"), `52844cc9` (2025-06-11, suppress CA2025 from the preview-5 SDK), `42b05ffe` (2025-12-18 "Update to .NET 10 SDK", adopts `field` in two files), `de3067c9` (2026-02-13 ".NET 11 preparation": site pragmas CA1010/CA1710, `NoWarn CA1510`) | Both hops were done ahead of GA in small commits, SDK before TFM; CA2025 was seen five months before the 10 GA |
| NU1510 muted by `NoWarn` in the corpus: `dotnet__BenchmarkDotNet/src/BenchmarkDotNet/BenchmarkDotNet.csproj:8`, `coverlet-coverage__coverlet/test/coverlet.MTP.tests/coverlet.MTP.tests.csproj:15`, `Azure__azure-sdk-for-net/eng/Directory.Build.Common.props:97,106`, `dotnet__aspire/Directory.Build.props:44-46`, `microsoft__testfx/src/Platform/Microsoft.Testing.Extensions.Telemetry/...csproj:5` | The anti-pattern CS-BUILD-28 forbids is common; this procedure's step 6 is the alternative |
| `.slnx` in 18 exemplars (Polly, Dapper, BenchmarkDotNet, command-line-api, sourcelink, Humanizer, Meziantou.Analyzer, testfx, vs-threading, npgsql, nuke, OpenAI, StackExchange.Redis, testcontainers, CliWrap, xunit, simple-exec, coverlet) | the format is mainstream; `dotnet sln migrate` is the path |
| `global.json` `test.runner` in 11 exemplars (simple-exec, Polly, cake, coverlet, aspire, GitVersion, Humanizer, Meziantou.Analyzer, testfx, vs-threading, xunit) | step 7 is common practice for MTP repos |

### 11. Verified on the toolchain

Host: linux-x64 (WSL2), SDK 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128 installed from the ocx index. Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-procedures-upgrade-path/`. Re-run everything with `bash run-all.sh` (about 2.5 minutes; writes `evidence.txt`); `bash rules-check.sh` re-runs the grep rules (output in `rules.out`).

| Fixture | What | Red (observed) | Green (observed) |
|---|---|---|---|
| `net8-baseline/` (git repo, 15 tagged commits, from simple-exec 800a8d0) driven by `replay.sh` | steps 0 to 9 and rollback | see rows below | see rows below |
| step 1 | SDK 10.0.401 only | `error IDE0370: Suppression is unnecessary` x4 (`SimpleExecTests/EchoingCommands.cs` 20,59 / 50,65 / 63,43 / 79,43); bulk-severity grep exits 0 | build 0/0; grep exits 1; `AnalysisLevel` prints `8.0-all` x3 |
| step 2 | `AnalysisLevel 10.0-all` | `error CA2025 ... SimpleExec/Command.cs(369,26)` | pragma around the call; 46 passed, 2 skipped |
| step 3 | LangVersion | `14 default default` | `14 14 14` |
| step 4 (replay tag step5) | audit mode | `3 all` + `3 direct` | `6 all` |
| step 5 | add `net10.0` | `Tester.cs(5,33): error CS1002: ; expected [net10.0]`, `CS1525`; `CI=true dotnet restore`: `3 error NU1004`; `#if NET8_0 && DEBUG` grep hits | `CI=true` build 0/0; 46 passed on net8.0 and 46 on net10.0; grep exits 1; PublicAPI diff empty |
| step 6 | bumps (PublicApiAnalyzers 3.3.4 to 5.6.0, MinVer 6.1.0-beta.1 to 8.0.0, Test.Sdk 17.12.0 to 18.10.1, xunit.runner.visualstudio 3.0.2 to 3.1.5, GitHubActionsTestLogger 2.4.1 to 3.0.5) | 10 outdated rows | 2 rows (xunit.runner.visualstudio 3.1.5, latest 4.0.1: a major bump left alone); tests pass on both TFMs |
| step 8 | `.sln` to `.slnx` | `error MSB1011` with both files; SDK 8.0.425 on the slnx: `error MSB1003` | one file (`./SimpleExec.slnx`); build 0/0 |
| step 9 | CI and image | release.yml and infer-sharp.yml without `global-json-file`; `FROM ...devcontainers/dotnet:8.0` | greps print nothing / exit 1 |
| rollback | partial vs full | `error NETSDK1045`; `error MSB1003` | `pre-net10` worktree: SDK 8.0.425, build 0/0, 46 passed |
| `c14-breaks/` (`build-case.sh <Case> <LangVersion>`; TWAE on; `net8.0;net10.0`) | B3 Reverse | LangVersion 14: `error CS0815: Cannot assign void to an implicitly-typed variable [net8.0]` only | 12: exit 0; `ReverseFixed` at 14: exit 0 |
| same | B4 `field` | 14: `CS9258` (and `CS0414`) on both TFMs; local named `field`: `CS9273`, `CS9264`, `CS0219`, `CS9258` | 12: exit 0; `FieldWarnFixed` (`this.field`) and `FieldErrorFixed` (`@field`) at 14: exit 0 |
| same, `dotnet run -f <tfm> -p:Lang=<v>` | B1, B2 | 14 on net8.0 and net10.0: `R threw ArrayTypeMismatchException`; `Contains(expression) threw ArgumentException` | 12 on both: `R picked overload 1`; `Contains(expression, interpreted) = True` |
| `delta/measure.sh` | section 5 | n/a | 205 sites/26 IDs at 8.0-all vs 214 to 215/28 at 10.0-all on CliWrap |
| `deps-lib/audit.sh` | B10 | net8.0 only: exit 0; `net8.0;net10.0`: `error NU1903` Newtonsoft.Json 10.0.3 (GHSA-5crp-9r3c-p9vr), exit 1; with `NuGetAuditMode=direct` forced: exit 0 (the forbidden hide) | direct `Newtonsoft.Json 13.0.3` added: exit 0 |
| `deps-prune/prune.sh` | B9 | `NU1510: PackageReference System.Text.Json will not be pruned`, exit 1; net8-only exit 0 | conditional STJ 10.0.12 + Logging.Abstractions 10.0.12: exit 0; nuspec: net10.0 group has only Logging.Abstractions, net8.0 group adds System.Text.Json 10.0.12 |
| `mtp-xunit3/` | MTP runner, `--nologo` | no `test.runner`: exit 1 "Testing with VSTest target is no longer supported ..." ; with runner and `--nologo`: "Zero tests ran", exit 5 | runner set, no `--nologo`: 2 passed, exit 0 |
| `behaviors/run-case.sh` | B6, B7, B8 | net10.0: BinaryFormatter `PlatformNotSupportedException`; SIGTERM: "ready" and no "ProcessExit ran"; STJ conflict `InvalidOperationException` | net8.0: 221 bytes serialized; "ProcessExit ran"; `{"Type":"dog","Type":"Dog"}`; `sigterm-fixed` runs "SIGTERM handler ran" and "ProcessExit ran", exit 0, on both TFMs |
| `net11-probe/probe.sh` | section 8 | `AnalysisLevel 11.0-all`: IDE0370 x4; `net11.0`: `error CA2016` | `.AsMemory(), cancellationToken` fix: 0/0 and 46 passed on three TFMs |
| `rules-check.sh` | grep rules 5, 10, 13, 15, 16 in the Normative list (rule 11's grep was not planted) | planted `Bad.cs`, `ci.yml`, `Dockerfile`, `global.json`, `.config/dotnet-tools.json`: exit 0 and matching lines | planted twins: exit 1 / jq exit 0 |
| `defineconstants/check.sh` | B12 | not reproduced: only the `IsTargetFrameworkCompatible` item is present on both SDKs | n/a |
| registry (`run-all.sh` section 9) | B13 | `10.0-bookworm-slim` and `10.0-trixie-slim` absent in sdk, runtime, aspnet; `10.0-noble-chiseled` absent in sdk | present: `10.0`, `10.0-noble`, `10.0-alpine`, `10.0-azurelinux3.0` in all; `10.0-noble-chiseled` in runtime and aspnet; `11.0`; devcontainers `10.0` |

Count: 34 red/green pairs watched (14 in the replay including rollback, five C# 14 cases, deps-lib, deps-prune, two MTP, three runtime behaviours, two net11 probes, and six planted-file rule-grep pairs not duplicated by the replay).

Not verified: the Copilot upgrade agent; `extension`/`scoped` keyword breaks; PublicAPI layout A vs C on this tree; Windows and macOS; `docker build` against the tags (existence checked in the registry only); B12 (not reproduced); the net11 RC1 results are RC1-only.

## Normative guidance candidates

Each rule: the rule, a one-line rationale, and how a reviewer verifies it. Commands assume the repo root and a POSIX shell. "csharp-build" rules are cited, not re-decided.

1. **Tag the last green net8 commit `pre-net10` before changing anything, and do the upgrade on one branch with one commit per step.** Rationale: a partial revert fails (NETSDK1045/MSB1003); a tag gives a full one. Verify: `git rev-parse --verify pre-net10 && git worktree add ../rb pre-net10 && (cd ../rb && dotnet build && dotnet test)` exits 0.
2. **Bump the SDK first, with the analyzer set frozen: `AnalysisLevel` at the old level, no bulk `dotnet_analyzer_diagnostic.severity` line (CS-BUILD-11).** Rationale: the bulk line pulls new IDE rules in with the SDK (IDE0370, 4 errors). Verify: `grep -rnE '^dotnet_analyzer_diagnostic' --include=.globalconfig --include=.editorconfig .` exits 1 and `dotnet build` is 0/0 on SDK 10.
3. **Raise `AnalysisLevel` in its own commit and fix each new diagnostic at the site (CS-BUILD-10, -12). Measure the delta first with warnings not as errors at both levels.** Rationale: the delta is 1 to 10 sites; one commit isolates its cause. Verify: `dotnet build -p:AnalysisLevel=10.0-all` is 0/0 and `git grep -n 'NoWarn.*CA' -- '*.csproj' '*.props'` shows no project-wide new suppression.
4. **Make LangVersion 14 effective in every project and prove it per project.** Rationale: per-project `<LangVersion>default</LangVersion>` overrides survive a props change. Verify: `find . -name '*.csproj' -print0 | xargs -0 -r -n1 dotnet msbuild -nologo -getProperty:LangVersion | sort -u` prints exactly `14`.
5. **After LangVersion 14, run the full test suite on every TFM, and grep for the C# 14 hazards.** Rationale: B1/B2 change behaviour with no diagnostic, on net8 as well. Verify: `CI=true dotnet test` runs once per TFM; `grep -rnE --include='*.cs' '\.Reverse\(\)' .` is empty or reviewed; `grep -rnE --include='*.cs' '\b(var|int|long|bool|string|object|[A-Z][A-Za-z0-9_<>?]*)\s+field\b\s*[=;,)]' .` is empty or reviewed (it also lists fields named `field`, which need `this.field`).
6. **Set `NuGetAudit` true and `NuGetAuditMode` all explicitly before adding `net10.0` (CS-BUILD-26).** Rationale: the net10 default flips to `all`; explicit `all` shows the same findings on net8 first. Verify: `for p in $(git ls-files '*.csproj'); do dotnet msbuild "$p" -nologo -getProperty:NuGetAuditMode; done | sort -u` prints `all`.
7. **Add `net10.0` only through `Directory.Build.props` (CS-BUILD-01), in a commit that also fixes exact-TFM `#if` and regenerates locks if the repo uses them.** Rationale: both break at that moment (CS1002/CS1525; NU1004 under `CI=true`). Verify: `CI=true dotnet build && CI=true dotnet test` is green with `net8.0` and `net10.0` both listed; `grep -rnP --include='*.cs' '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+|NETCOREAPP[0-9]_[0-9])\b' .` exits 1.
8. **Resolve NU1510 by deleting the reference, or conditioning it on `IsTargetFrameworkCompatible(..., 'net10.0')` when net8 still needs it; never `NoWarn` (CS-BUILD-28).** Rationale: the pruned package is still needed on the older TFM. Verify: build 0/0 on both TFMs; `grep -rn 'NU1510' --include=*.csproj --include=*.props --include=*.targets .` exits 1.
9. **Bump analyzer and test packages in a separate commit after the TFM add; list with `dotnet package list --outdated`.** Rationale: a package bump hidden in the TFM commit hides its cause. Verify: `dotnet package list --outdated` shows only named holds.
10. **If any test project uses Microsoft.Testing.Platform (xunit.v3, MSTest.Sdk, TUnit, `UseMicrosoftTestingPlatformRunner`), `global.json` carries `"test": {"runner": "Microsoft.Testing.Platform"}`; and `dotnet test` is never given `--nologo`.** Rationale: without the key SDK 10 exits 1; with `--nologo` the test app is started with it and reports exit 5. Verify: `if grep -rlE --include='*.csproj' -e 'xunit\.v3' -e 'MSTest\.Sdk' -e 'TUnit' -e 'UseMicrosoftTestingPlatformRunner' -e 'EnableMSTestRunner' . >/dev/null; then jq -e '.test.runner=="Microsoft.Testing.Platform"' global.json; fi` exits 0; `grep -rnE 'dotnet test[^|;&]*--(nologo|no-logo)' .github scripts` exits 1; CI runs `dotnet test --minimum-expected-tests N`.
11. **Pass `--interactive false` only to `restore`, `build` and `test`; give automation `CI=true` and `--tl:off` for everything else (qualifies CS-BUILD-30).** Rationale: `package list`, `list package` and `tool restore` reject `false`. Verify: `grep -rnE 'dotnet (package list|list package|tool restore)[^|;&]*--interactive false' .github scripts` exits 1.
12. **Migrate to `.slnx` last, delete the `.sln`, and keep exactly one solution file (CS-BUILD-29). It is a one-way door for SDK 8 users.** Rationale: MSB1011 with both; MSB1003 on SDK 8. Verify: `test "$(find . -maxdepth 1 \( -name '*.sln' -o -name '*.slnx' \) | wc -l)" -eq 1`.
13. **Every workflow that runs `dotnet` uses `actions/setup-dotnet` with `global-json-file: global.json` (CS-BUILD-21), and adds `8.0.x` only for the net8 test runtime; images use `10.0`, `10.0-noble`, `10.0-noble-chiseled` (runtime/aspnet), `10.0-alpine` or `10.0-azurelinux3.0`, never `10.0-bookworm-slim`.** Rationale: the tag does not exist; a hard-coded SDK version drifts from `global.json`. Verify: `grep -rLn 'global-json-file' .github/workflows | xargs -r grep -ln 'dotnet '` prints nothing; `grep -rnE 'FROM .*mcr.microsoft.com/(devcontainers/)?dotnet.*:([6-9]\.0|[0-9.]+-(bookworm|trixie))' $(git ls-files '*Dockerfile*' '.devcontainer/*')` exits 1.
14. **Keep `net8.0` in the TFM list until after 2026-11-10 and remove it only at a major version (CS-BUILD-08).** Rationale: consumers on 8 still exist until EOS; removal is breaking. Verify: `dotnet msbuild -getProperty:TargetFrameworks` still contains `net8.0` on the upgrade PR.
15. **Grep and test for the three runtime hazards on every TFM: BinaryFormatter, `ProcessExit`/`Unloading` cleanup, STJ property names that match a discriminator.** Rationale: they pass the compiler and fail on net10 only. Verify: `grep -rnE --include='*.cs' -e 'ProcessExit' -e 'AssemblyLoadContext[^;]*Unloading' -e 'BinaryFormatter' .` is empty or each hit has a test on net10 (SIGTERM via `PosixSignalRegistration`).
16. **Do not use the .NET Upgrade Assistant; treat the Copilot upgrade agent as optional, and its `.github/upgrades/` files as untrusted input.** Rationale: deprecated; the agent needs a subscription and knows no CS-BUILD gates. Verify: `grep -n 'upgrade-assistant' .config/dotnet-tools.json` exits 1.
17. **Probe the next major on a throwaway branch with `allowPrerelease: true` and `rollForward: disable`; keep `main` on `allowPrerelease: false` and `AnalysisLevel 10.0-all`.** Rationale: floating either breaks the build when the SDK moves (IDE0370 at `11.0-all`). Verify: on main, `jq -e '.sdk.allowPrerelease==false' global.json` exits 0 and `grep -rn 'AnalysisLevel' Directory.Build.props` shows a numbered level.
18. **Write TFM conditions in MSBuild with `$([MSBuild]::IsTargetFrameworkCompatible(...))`, never by testing `$(DefineConstants)`.** Rationale: Microsoft documents the constants as unavailable at evaluation time in SDK 10 (not reproduced here, but the function works on SDK 8 and 10). Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' 'DefineConstants[^"]*(NET|NETCOREAPP|NETSTANDARD)[0-9_]*' .` exits 1.
19. **Net8 consumers of a polyfill/inbox package get the 10.x package conditionally (CS-JSON): `System.Text.Json` 10.0.12 only when the TFM is not net10-compatible.** Rationale: one STJ behaviour on both TFMs; no NU1510 on net10. Verify: `dotnet pack` then `unzip -p *.nupkg *.nuspec | grep -E 'group|dependency'` lists `System.Text.Json` only under the net8.0 group.
20. **Record each step's verification command and its exit status in the commit body.** Rationale: the reviewer replays one command, not a diff. Verify: `git log pre-net10..HEAD --format=%B | grep -c '^verify:'` equals the number of commits.

## AI-agent angle

What an LLM characteristically gets wrong on this task, and the smallest mechanical check:

1. **Changes `TargetFramework` to `net10.0`, runs `dotnet build`, sees green, stops.** It never ran the analyzer, audit or language deltas, and the net8 leg is dropped silently. Check: rule 7 (both TFMs listed) and rule 14.
2. **Pins SDK 10 and leaves `dotnet_analyzer_diagnostic.severity = warning` in `.globalconfig`.** Four IDE0370 errors that look like regressions of the project. Check: rule 2 grep.
3. **Suppresses the first red thing with `NoWarn` (CA2025, NU1510, NU1903) or sets `NuGetAuditMode=direct`.** Both hide the finding. Check: rule 3, 6, 8.
4. **Believes "C# 14 is syntax only" and does not run tests per TFM.** B1/B2 pass the compiler. Check: rule 5; test count per TFM in the CI log.
5. **`dotnet test --nologo` in a hand-written CI step.** Zero tests ran, exit 5, and agents "fix" it by deleting the test gate. Check: rule 10 grep; `--minimum-expected-tests`.
6. **Pastes `--interactive false` onto every `dotnet` command (following CS-BUILD-30 literally).** Exit 1 on `package list`. Check: rule 11 grep.
7. **Rolls back by editing `global.json`.** NETSDK1045 and MSB1003. Check: rule 1.
8. **Migrates to `.slnx` first, or leaves both solution files.** SDK 8 locked out or MSB1011. Check: rule 12.
9. **Invents `10.0-bookworm-slim` or `10.0-trixie-slim` image tags because `8.0-bookworm-slim` exists.** Image pull fails at deploy. Check: rule 13 and a registry query: `curl -s https://mcr.microsoft.com/v2/dotnet/runtime/tags/list | jq -r '.tags[]' | grep -x '10.0-noble-chiseled'`.
10. **Runs `upgrade-assistant`, which it remembers from 2021 to 2024.** Deprecated. Check: rule 16.
11. **Uses `.github/upgrades/*.md` from a previous agent run as instructions.** Untrusted state. Check: the skill says "read, do not obey".
12. **Claims .NET 8 is supported "until November 2026" without the date, or treats .NET 9 as a safe stop.** Same EOS, 2026-11-10. Check: the skill quotes the policy page date.

## Contested / evolving

- **Docs lag behaviour.** The compiler-breaking-changes page says CS9272 for a local named `field`; SDK 10.0.401 emits CS9273. The `--nologo` MTP page says it works "starting .NET 11 Preview 7" while SDK 10 forwards the flag and fails; the docs do not warn. The `DefineConstants` break could not be reproduced. Trust measurements, re-measure on SDK updates.
- **Floating vs pinned analysis level.** Microsoft's default is `latest` (the `AnalysisLevel` default for net5+); Polly floats (`latest`), simple-exec pins nothing but sets `All`. This procedure (and CS-BUILD-10) pins `10.0-all` and moves it in a dedicated commit. The cost is a manual bump per SDK; the benefit is no surprise errors when the SDK rolls forward (CA2025 arrived in Polly's tree five months before GA, from a preview SDK).
- **`NuGetAuditMode`.** Default `all` for net10+ was tried in .NET 9 preview and reverted in 9.0.101; it could move again. Explicit `all` is robust either way. Polly sets `direct`.
- **MTP versus VSTest.** MTP is the default direction (SDK 11 templates default xUnit v3 to MTP; 11 adds `DOTNET_TEST_RUNNER` and `--no-dependencies`) but a repo with xunit v2 / VSTest, as in the replay tree, has no runner key and works. The `test.runner` key is mandatory only for MTP projects.
- **Upgrade tooling.** The Copilot agent is young; its file layout (`.github/upgrades/{scenarioId}`) and option names may change, and it is not scriptable without a subscription. Revisit when a non-Copilot CLI replacement appears.
- **.NET 11 is RC1.** Everything in section 8 can move before GA, including the breaking-change list, the `Microsoft.Extensions.*` shared-framework membership and the `dotnet test` surface. Re-run `net11-probe/probe.sh` at GA.
- **Is `net9.0` worth a stop?** No: STS with the same EOS as .NET 8. Exemplars that targeted 9 (Polly's 9.0.308 era) moved on to 10 directly.
- **Open for csharp-build's owner:** whether CS-BUILD-30 should say "restore, build, test only" for `--interactive false`; and whether the `mtp/pass` fixture in the diagnose catalogue and the `dotnet test --nologo` examples elsewhere need `DOTNET_NOLOGO=1` instead.

## Sources

Primary: learn.microsoft.com (breaking-change and tool pages), dotnet.microsoft.com policy, the dotnet-docker README, the MCR registry API, nuget.org flat container, SDK-shipped analyzer config files, and exemplar commits. Retrieval date 2026-10-11 for all fetched pages; "page date" is the `ms.date` front matter where shown.

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | .NET support policy: release types, EOS dates, latest patches | fetched 2026-10-11 | EOS 2026-11-10 for 8 and 9; 10 LTS to 2028-11-14 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0 | .NET 10 breaking-change index | 2025 to 2026 | Entry point for B6 to B15 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/9.0 | .NET 9 breaking-change index | 2024 to 2026 | BinaryFormatter, Terminal Logger |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 | .NET 11 breaking-change index | 2026-06-04, updated 2026-10-08 | Section 8 items; still moving |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010 | Roslyn breaking changes for C# 14 | 2025 to 2026 | `field`, span conversions, `extension`, `scoped` |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14 | What's new in C# 14 | 2025-11-18, updated 2026-09-03 | The `field` caveat, implicit span conversions, "supported on .NET 10" |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/csharp-overload-resolution | Overload resolution with spans | .NET 10 | B1 to B3 semantics |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler | SIGTERM default handler removed | .NET 10 | B7 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/10/property-name-validation | STJ property-name conflict validation | .NET 10 | B8 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/9.0/binaryformatter-removal | BinaryFormatter always throws | .NET 9 | B6 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nu1510-pruned-references | NU1510 for pruned references | SDK 10 | B9 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages | NuGetAuditMode default `all` | SDK 10 | B10, reverted-in-9.0.101 history |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/defineconstants-not-available-at-evaluation | DefineConstants at evaluation time | SDK 10 | B12 (not reproduced) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-cli-interactive | `--interactive` defaults | SDK 10 | section 6 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default | `dotnet new sln` creates `.slnx` | 2025-08-30 | B14; `--format sln` |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/10.0/default-images-use-ubuntu | Container default base images | .NET 10 | B13 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/extensions-in-shared-framework | Nine Microsoft.Extensions libraries in the shared framework | .NET 11 RC1 | section 8, NU1510 on net11 |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview | What's new in .NET 11 | 2026-09-08, updated 2026-09-29 | RC1 status, GA expected November 2026, SDK/MTP changes |
| https://learn.microsoft.com/en-us/dotnet/core/tools/global-json | global.json reference | 2026 | `test.runner`, `paths`, `errorMessage`, `rollForward` |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-sln | `dotnet sln` reference | 2026 | `migrate`, remove by name, `.slnf` |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp | `dotnet test` in MTP mode | 2026 | `--minimum-expected-tests`, `--nologo` availability |
| https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-running-tests | Running MSTest with MTP | 2026 | runner requirements |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild properties for the SDK | 2026 | AnalysisLevel / AnalysisMode defaults and values |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2025 | CA2025 | 2025-05-08 | New rule, off by default in .NET 10 |
| https://learn.microsoft.com/en-us/dotnet/core/porting/upgrade-assistant-overview | Upgrade Assistant overview | 2026-03-19 | "officially deprecated" |
| https://learn.microsoft.com/en-us/dotnet/core/porting/github-copilot-upgrade/overview | Copilot upgrade / app modernization agent | 2026 | surfaces, `.github/upgrades` layout, strategies |
| https://raw.githubusercontent.com/dotnet/dotnet-docker/main/README.sdk.md | dotnet-docker image table | fetched 2026-10-11 | Ubuntu 26.04, Alpine 3.23/3.24, Azure Linux |
| https://mcr.microsoft.com/v2/dotnet/sdk/tags/list (and `/runtime/`, `/aspnet/`, `/devcontainers/dotnet/`) | MCR tag lists | queried 2026-10-10/11 | the only ground truth for tag existence |
| https://api.nuget.org/v3-flatcontainer/ (system.text.json, microsoft.extensions.logging.abstractions, microsoft.codeanalysis.publicapianalyzers, minver, microsoft.net.test.sdk, xunit.v3, ...) | NuGet version indexes | queried 2026-10-11 | latest stable versions used in step 6 |
| `Sdks/Microsoft.NET.Sdk/analyzers/build/config/analysislevel_{8,10,11}_all.globalconfig` in SDK 10.0.401 and 11.0.100-rc.1 | Rule sets shipped with the SDK | 2026 | section 5 deltas, byte-exact |
| https://github.com/adamralph/simple-exec (commits 61bf52c, 9a8c2f9; HEAD f80913246993) | Library that did the SDK-then-TFM hop | 2025-11 to 2025-12 | the replay base |
| https://github.com/xunit/xunit (commits c40f12a9, e781de82; HEAD 0c7aa4991fa3) | SDK 10 and MTP runner key, same day | 2025-11-13 | step 7 practice |
| https://github.com/App-vNext/Polly (commits f56e106c, 52844cc9, 42b05ffe, de3067c9; HEAD e4476096da5b) | Both hops prepared early | 2025-05 to 2026-02 | CA2025 early warning, `field` adoption, net11 prep |
| `.agents/research/csharp-build.md` (CS-BUILD-01 to -30) | Prior consolidated verdicts, internal | 2026-10-11 | the rules this procedure consumes |
| `.agents/research/csharp-api/csharp-api-evolution-gates.md` section 6 | Per-TFM PublicAPI layouts, internal | 2026-10-11 | layout A vs C |
| `.agents/research/csharp-topic-map.md` (AG-01, BD-14) | Topic map, internal | 2026-10-11 | scope of this subtopic |
