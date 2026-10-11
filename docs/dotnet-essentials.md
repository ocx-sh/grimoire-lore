# dotnet-essentials

The OCX .NET set in one install: two rules for the files you edit and three skills for occasional procedures. It also carries the comment rule and cleanup skill shared by every language set.

```sh
grim add ghcr.io/ocx-sh/lore/dotnet-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `csharp-quality` | rule | 24 non-negotiables and 256 depth rules, 219 of them MUST and one MUST from 1.0, across twelve depth files: processes, binaries, async, API design, errors, JSON, platform and paths, testing and CI, the language era, security, observability and performance. Installed on `**/*.cs`, `**/*.csx` and `**/*.cake` |
| `dotnet-build` | rule | 12 non-negotiables and the CS-BUILD rules, plus 16 CS-PKG rules in one depth file, 12 of them MUST and 4 SHOULD: the SDK pin, central package management, the analyzer packs and their ban and severity files, restore hygiene and pack properties. Installed on 22 globs, from `**/*.csproj` to `**/[Bb]uild.*`, workflows and build scripts included |
| `dotnet-upgrade` | skill | An order-sensitive, one-commit-per-step procedure of 13 steps to move a solution from `net8.0` to `net10.0`, with the .NET 11 probe shape and five dated re-checks |
| `dotnet-diagnose` | skill | Triage-ordered diagnosis through a 74-row catalogue (DN-DIAG-01 to DN-DIAG-79, five retired) across SDK, restore, project, compile, analyzers, trim and AOT, tests and hangs, with eleven owner-only blockers |
| `dotnet-release` | skill | A gate-ordered runbook for a NuGet library (14 steps) and for an application (14 steps and a publish-mode table), built around the tag push as the only publishing step |
| `code-docs` | rule | Fifteen non-negotiables across five depth files: the guard floor, where each clause of a comment goes, record pointers and process IDs, doc text that renders into help and schemas, and the length caps. Shared by every language set |
| `code-docs-cleanup` | skill | A ten-step, guard-first procedure for shortening existing comments, gated by a structural diff check and a cold reason re-check per shortened guard |

## The premise

The default .NET toolchain does not gate what it looks like it gates. A `NoWarn`, a lowered `dotnet_diagnostic` severity, a `BannedSymbols.txt` that is not an `AdditionalFiles` item and `continue-on-error` all leave the build green. `dotnet test` under Microsoft.Testing.Platform exits 5 on `--tl:off`. A restore passes on a warm package cache and fails on a clean runner. A publish with IL warnings exits 0 and the artifact exits 134.

So the set trusts a command run on the tree over any page that describes it. It states which SDK every claim was watched on. It was measured 2026-10-11 on SDK 10.0.401 with runtimes 10.0.12 and 8.0.31, built for `net8.0` and `net10.0`, against an upstream exemplar corpus. Windows rows were measured on SDK 10.0.102. macOS and arm64 rows are `unverified: read only`.

## Why two rules and not one

The globs differ, which is the only thing that justifies a second rule file. A `.cs` edit is not a `.csproj` edit. Loading the packaging and analyzer-posture depth while you touch a method body is pure cost.

So the split follows what the file under edit is. `csharp-quality` carries the source standards and loads on `**/*.cs`, `**/*.csx` and `**/*.cake`. `dotnet-build` carries what a project and its build config claim about themselves. No compiler checks those files. It loads on the project, props, SDK pin, NuGet config, analyzer and ban files, the solution files, the workflows and the build scripts.

`.editorconfig`, Dockerfiles, `*.fsproj`, `*.vbproj`, `*.ruleset` and `*.nuspec` are never globbed. `.editorconfig` is not .NET-specific, so a glob would load a .NET rule in every repository that has one. A `*.cs` edit loads `csharp-quality`, and CS-CORE-01 routes an `.editorconfig` edit to `dotnet-build`.

## Why three skills

`dotnet-upgrade`, `dotnet-diagnose` and `dotnet-release` run at three different triggers, none of them every edit. Once per SDK or target-framework move. Once per failing build, publish or test. Once per release.

Loading any of them on a routine edit would be dead context weight, so they carry no rules of their own. Each restates the merge-blocking rows it enforces as findings with rule IDs. A review run without the rules loaded still reports them correctly.

The skills cite scripts and data that ship in the `checks/` directories of the two rules. Install the bundle rather than a skill alone.

## Pinned decisions

- SDK 10.0.401 with `rollForward: latestFeature`, `LangVersion` 14 and `AnalysisLevel` `10.0-all`.
- Targets `net8.0;net10.0` until .NET 8 end of support on 2026-11-10, then `net10.0` alone.
- Warnings are errors unconditionally. Only NU1900 to NU1905 are exempt.
- Five analyzer packs and MinVer as `GlobalPackageReference` with exact versions. Never StyleCop or Roslynator.
- A library ships no lock file. CI restores into an empty packages folder and keeps no NuGet cache.
- Publishing uses Trusted Publishing and a tag push. No author signing and no strong naming.

Each is a default an adopter overrides once, in the shared props or the copied CI. Never per project and never per call site.

## What is not in it

Build systems other than MSBuild and the `dotnet` CLI are not covered. F#, Visual Basic, WPF, MAUI and Blazor are not covered. README and CHANGELOG prose belongs to `docs-quality`. The reference SDK package is not shipped, and names from it, such as `ocx` and `Ocx.Sdk`, are examples the adopter renames.

The bundle names its members without a tag. It says these seven belong together. Your `grimoire.lock` is what freezes them.

## Siblings

- **`docs-quality`**: README, guide and changelog prose around a package.
- **`code-docs`**: doc comments in every language. Part of this bundle.
