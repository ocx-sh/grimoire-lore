# csharp-quality

Standards for writing and reviewing C#: the gate, 24 merge-blocking non-negotiables, and twelve depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/csharp-quality
```

Loads on `**/*.cs`, `**/*.csx` and `**/*.cake`. The index is always present. A depth file is read only when the work calls for it. It ships beside `dotnet-build` in `dotnet-essentials`, and that rule owns the project, props and analyzer files, the pinned analyzer packs and the pack properties, and loads on workflow and build-script edits.

## It starts by never weakening a check

An agent reaches green by the cheapest edit that turns the build red to green. In .NET that edit is rarely a code fix. It is a `NoWarn` entry, a `#pragma warning disable` with no reason, a lowered `dotnet_diagnostic` severity, a deleted `BannedSymbols` line, `continue-on-error: true` on a leg or a `[Fact(Skip = "")]`. Every one of them exits 0.

So the first instruction is CS-CORE-01, and it is a command. `weaken-check.sh` runs against the base commit and prints each added line that weakens a check and each removed gate line. CS-CORE-02 is the second: watch every check red on a planted defect and green on its twin before relying on it. CS-CORE-03 is the third: a step is done when its command, exit code and tree are named, and exit 0 alone proves nothing.

## What agents get wrong by default, measured

Measured 2026-10-11 on SDK 10.0.401 with runtimes 10.0.12 and 8.0.31, built for `net8.0` and `net10.0` in one build. Windows rows were measured on SDK 10.0.102. macOS and arm64 rows are marked `unverified: read only`.

Generated C# reaches for the habit that compiles. A convenience method doing `XAsync().GetAwaiter().GetResult()` is defended with "`ConfigureAwait(false)` makes it safe": the exemplar corpus holds 273 `GetAwaiter().GetResult()` and 235 `.Result`. 10 of 10 surveyed CLI wrappers keep a string argv path, and 5 of 10 call a bare `Kill()` on cancel.

The analyzers push an agent into the wrong fix. CA1867 rewrites `StartsWith("a", OrdinalIgnoreCase)` to the case-sensitive `StartsWith('a')`, a behaviour change. A per-call `new Regex(p)` costs 836 ns and 2.2 KB, and the `TimeSpan` timeout forms that answer "add a ReDoS timeout" are invisible to SYSLIB1045.

Checks lie too. `dotnet test` under Microsoft.Testing.Platform exits 5 on `--tl:off` and `--interactive false`, and exits 8 when zero tests ran. A project with no `PublicAPI.Shipped.txt` reports 12 RS0016 and 8 RS0037 until it is marked `IsPackable=false`.

## What is in it

The index opens with eight conventions defined once (the `SRC`, `TESTS`, `SLN`, `BASE`, `G` and `CIF` operands, the scan scope, the cell shell, the applicability tags, the legacy-TFM clause, the nullable clause, the MTP-or-VSTest test runner and the sanctioned forms, each the one stated exception to the row that names it), then carries the gate, 24 non-negotiables, the 13 rules it owns outright (three CS-CORE rules and ten DN-RULE rules that bind every `dotnet` invocation) and 21 owner defaults. 256 depth rules sit in twelve files: 219 MUST, one MUST from 1.0, 33 SHOULD and 3 CONSIDER.

| File | Family | Rules |
|---|---|---|
| `processes.md` | CS-PROC | 23 |
| `binaries.md` | CS-BIN | 23 |
| `async.md` | CS-ASYNC | 27 |
| `api-design.md` | CS-API | 20 |
| `errors.md` | CS-ERR | 16 |
| `json.md` | CS-JSON | 22 |
| `platform-and-paths.md` | CS-XP | 12 |
| `testing.md` | CS-TEST, CS-CI | 39 |
| `language.md` | CS-LANG | 21 |
| `security.md` | CS-SEC | 16 |
| `observability.md` | CS-OBS | 28 |
| `performance.md` | CS-PERF | 9 |

Every rule carries an ID, a rationale, a runnable verification and a severity. A rule that binds only some repositories leads with a tag (`stj`, `cli-wrapper`, `launches-process`, `json-cli`, `downloads-binary`, `library`, `packable-library`, `zero-dependency`, `mtp`, `gha`, `greenfield`), and outside its tag it does not apply: the cell prints `N/A` and exits 0. Each verification says which way empty output reads, an unset operand prints `MISSING <x>` instead of passing, and the pipeline checks sit in a fenced block the cell cites. 19 IDs are retired, not reused, and each file names its own: six in CS-ASYNC, five in CS-BIN, four in CS-LANG, two in CS-PROC, one each in CS-ERR and CS-OBS. Two shipped scripts sit in a `checks/` directory the rules name by path: `weaken-check.sh` and `check-ci-matrix.sh`.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact. They are marked pinned so a later reader does not re-argue them. The set targets `net8.0;net10.0` until .NET 8 reaches end of support on 2026-11-10, then `net10.0` alone, a move `dotnet-upgrade` executes. `LangVersion` is 14 on both targets.

Warnings are errors unconditionally, for humans too, and only NU1900 to NU1905 are exempt. A library ships no lock file, CI restores into an empty packages folder and no NuGet cache is kept. Coverage is a report on Linux x64 and Windows x64 with no threshold, and `ci-ok` is the only required check.

Each is a default an adopter overrides once, in the shared props or the copied CI. Never per file or per call site. Overriding one is a decision, recorded with its reason. Ignoring one is a violation. Names from the reference consumer, such as `ocx` and `Ocx.Sdk`, are examples the adopter renames.

## What it does not cover

No restatement of C#, the base class library or ASP.NET, which the model already knows. It names traps, not maps. Once a depth file is read, that file does not point at another.

It does not load on project files, props, `.editorconfig`, workflows, build scripts or Dockerfiles. `.editorconfig` is not .NET-specific, so a glob would load this rule in every repository that carries one, and CS-CORE-01 routes an `.editorconfig` edit to `dotnet-build`. The routing table in the index sends those tasks to `dotnet-build` or the right depth file by keyword. `*.fsproj`, `*.vbproj` and `*.ruleset` are not covered.

## Siblings

`dotnet-build` owns what a project and its build config declare and what fails the build: the SDK pin, central package management, the analyzer packs with their ban and severity files, restore hygiene and the pack properties. It loads on the files this rule does not reach, workflows and build scripts included.

`code-docs` and `docs-quality` cover doc comments, READMEs and changelogs. `dotnet-upgrade`, `dotnet-diagnose` and `dotnet-release` are procedures that cite this set's rule IDs by number and never restate them. Bundled with `dotnet-build` and `code-docs` as `dotnet-essentials`.
