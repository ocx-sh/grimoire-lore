---
title: "C# exemplar corpus: measured language shape"
agent: exemplar-language-shape (research-lang, C# / .NET, axis 'measured C# code shape')
model: sonnet (Sonnet 5.5)
scope: 35 blob-less exemplar clones under /home/mherwig/.cache/research-lang/exemplars/csharp, 40,949 .cs files on disk. Counts are per repo and total, split into lib / test / aux / generated buckets. Dated 2026-10-10.
method: Python regex counters over comment- and string-blanked source (measure.py), a csproj/props/editorconfig scanner (config.py), table renderer (tables.py), strictness scorer (score.py). All under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-shape/. Every command is inlined next to its result below. Re-run time about 50 s on 16 processes.
---

# C# exemplar corpus: measured language shape

## 0. Result in one screen (hypothesis check)

The brief's framing (library authoring at the centre, "sealed by default", `ConfigureAwait(false)` in libraries, `ThrowIfNull`, `#nullable enable`, modern types) is mostly a description of the strict minority, not the fleet. Measured:

| Claim an agent would assume | Measured (lib bucket, 13,746 files, 1,041.9 kLOC) | Verdict |
|---|---|---|
| Public classes are sealed by default | 2,560 sealed vs 3,286 open (abstract 423, static 937 excluded) = **44% sealed**. Only 12 of 28 repos with >=20 candidates are >=50% sealed; 11 are <=20% | **Contradicted.** Sealed is the strict-repo habit (Meziantou 97%, spectre 97%, testcontainers 95%, testfx 90%, roslynator 88%), not the norm. The three generated SDKs are almost entirely open |
| `#nullable enable` at file top | 221 directives vs **562 `#nullable disable`** in lib; `<Nullable>enable</Nullable>` is set in props/csproj of **30 of 35** repos | **Contradicted for directives.** Project-level switch is the norm; per-file `disable` is the legacy-debt marker |
| `ArgumentNullException.ThrowIfNull` replaces manual checks | 1,401 `ThrowIfNull` vs 2,155 `new ArgumentNullException(` = **39% modern** | **Mixed.** Modern form dominates only in net6+-only or `Polyfill`-backed repos (cake 705, spectre 438, FluentValidation 103). Multi-target-to-net462 repos keep a hand `Guard` (Polly) |
| `ConfigureAwait(false)` on every library await | 6,815 of 8,276 awaits = **82% overall, median repo 76%**; bimodal: 10 repos >=90%, 6 repos <20% (Polly, FluentValidation, coverlet, nodatime, nuke, xunit) | **Partly true, enforced by analyzer.** Two repos use other forms (see section 3.2). Compliance tracks the `CA2007` severity setting |
| Records are the type default | 407 record declarations vs 7,206 public classes + 5,277 internal classes | **Contradicted.** Records are ~3% of type declarations in library code (407 of ~13,000 class-or-record declarations) |
| Libraries log via `ILogger` | 13 of 35 repos reference `ILogger` at all; **0 of 9 SDK/CLI-wrapper-like repos** do (CliWrap, simple-exec, MedallionShell, anthropic, openai, octokit, Dapper, FluentValidation, NodaTime) | **Contradicted for SDKs.** When logging is present it is source-generated (`[LoggerMessage]` 247, `LoggerMessage.Define` 0) |
| Sync-over-async is absent in libraries | `.GetAwaiter().GetResult()` 273, `.Wait()` 46, `.Result` 235 raw (20 as `...Async(...).Result`), spread across 21 repos (`GetResult`) and 16 repos (`.Wait()`) | **Contradicted.** It is deliberate in sync-facade layers (npgsql 116) and in `Main`/ctors, but it exists everywhere |
| `netstandard2.0` is a legacy leftover | **28 of 35** repos list `netstandard2.0` in some `TargetFrameworks`; of 17 client or runtime libraries checked by hand, 13 ship it, 4 do not (FluentValidation net8 only, Npgsql net10 only, Pulumi net6 only, simple-exec net8-10) | **Open question stays open.** See section 9 |

Highest-value finding: the corpus splits into a **strict core** (testfx, Polly, xunit, vs-threading, Humanizer; section 8) that bakes policy into build files, and a **long tail** where the same style is convention only. An agent that copies "typical" code from the tail will violate the core's rules in 6 of 11 axes.

## 1. Method, commands and caveats

Pinned inputs: SHAs are the clone HEADs (`for d in */; do git -C $d rev-parse --short=12 HEAD; done`):
simple-exec@f80913246993 anthropic-sdk-csharp@ae16e5933f39 Polly@e4476096da5b azure-sdk-for-net@32c48fc3d524 cake@08885933e936 coverlet@ecd6fd5533e7 Dapper@eb47546a408b StyleCopAnalyzers@d51e0fd84584 aspire@af646baee1e8 BenchmarkDotNet@61ebda8a50ae command-line-api@ba7fb9bd4443 roslynator@167f43468118 sourcelink@6ec19dda0e19 FluentValidation@299ef377bde8 GitVersion@5057cdbcc177 Humanizer@4574b93883bf MedallionShell@e45f1f6ffd4c MessagePack-CSharp@242bdad51f89 Meziantou.Analyzer@161b7e948ad3 testfx@7226b0c74729 vs-threading@f6d817997090 nodatime@4dd26f1ddfa7 npgsql@9c47244547c2 nuke@27e8077b8ab0 octokit.net@7fa5b0fe4a18 openai-dotnet@1f0e8829acac PowerShell@5d871eb5e02c pulumi-dotnet@2a0dca84f09b serilog@bebc7719004f spectre.console@0de183140529 StackExchange.Redis@e7c43a269f53 stripe-dotnet@dbdca6ba5efc testcontainers-dotnet@04cbb73fcc58 CliWrap@7dbc252fa773 xunit@0c7aa4991fa3. Citations below use `owner__repo@<sha>:path:line`; where the owner prefix is dropped the repo is the one named in the row.

Commands (all re-runnable, all offline):

```
FX=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-shape
cd $FX
python3 -I measure.py > out.json          # 49 s wall, Pool(16). Output: per repo x bucket counters + histograms + first-hit examples
python3 -I config.py  > config.json       # csproj/props/targets/.editorconfig/global.json/PublicAPI.*.txt scan
python3 -I tables.py lib <inv|null|async|disp|types|exc|log|api|json>   # lib-bucket tables (this file embeds them)
python3 -I tables.py test tests           # test-bucket table
python3 -I score.py                       # strictness score from config.json
python3 -I derived.py                     # derived aggregates quoted in prose (medians, repo counts, LangVersion, frameworks)
python3 -I build_report.py <out.md>       # assembles this file from narrative.md + the above
```

How a file is bucketed (`measure.py:bucket`): `gen-other` = name ends `.g.cs/.Designer.cs/.generated.cs/.g.i.cs`, path contains `/obj/` or `/bin/`, or the first 600 bytes match `auto-generated|file generated|generated by|<generated|code generated`. `gen-sdk` = the three generated SDK trees reported separately: all of `stripe-dotnet/src/Stripe.net/**` ("File generated from our OpenAPI spec", `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Entities/Charges/Charge.cs:1`), `openai-dotnet/**/Generated/**`, `anthropic-sdk-csharp/src/Anthropic{,.Tests}/{Models,Services}/**`. `test` = any path component named `test(s)`, ending `Tests`, `.Tests.`, `UnitTests`, or file ending `Test(s).cs`. `aux` = samples, examples, benchmarks, perf, build, tools, eng, docs, testdata, api, codegen. Everything else is `lib`.

Counting rules: comments and string/char literals are blanked (newlines kept) before matching, so `!` inside strings and `// ConfigureAwait` do not count. kLOC = non-blank lines after blanking. Type counts include nested types and read only the *declared* accessibility modifier. Metrics marked "raw" are noisy by construction.

Known limits, stated plainly:
- **7 of 40,949 files hit a 20 s regex timeout and are excluded** (catastrophic backtracking in the type-declaration regex): StyleCopAnalyzers `.../SettingsFileCodeFixProvider.cs`, `.../SA1404UnitTests.cs`; testfx `.../CtrfReportGeneratorLifecycleTests.cs`; octokit.net `Octokit.Tests/Clients/RepositoriesClientTests.cs`; xunit `xunit.v2.tests/Visitors/XmlTestExecutionVisitorTests.cs`, `xunit.v3.generatorutility/TestMethod/TheoryMethodDetails.cs` (+1 more xunit file). Effect: under 0.02% of files; one lib file in xunit and one in StyleCop.
- `git ls-files '*.cs'` lists 137,911 files for azure-sdk-for-net because the clone is blob-less and sparse; the measured set is the 815 files on disk (Azure.Core slice). Aspire is the Dcp slice only (58 files, all `internal`, so its public-class row is 0). PowerShell is one file.
- `stripe-dotnet` has no `lib` row: the whole `Stripe.net` project is bucketed `gen-sdk`, including ~76 hand-written Infrastructure files. Its tests are measured.
- `.Result` (235) and `.Wait()` (46) are raw regex hits and include non-Task members; use the narrow `Async(...).Result` column (20) as the floor.
- "MSTest-style Assert.*" means the `Assert.AreEqual/IsTrue/IsNull/ThrowsException` family; NUnit's classic model uses the same names, which is why azure-sdk-for-net and nodatime appear under it.
- The `throw ex;` regex matches identifier names `ex|e|exc|exception|error|err`; hits include freshly-built exception variables, not only caught ones (see 3.5).

## 2. Inventory

Command: `python3 -I tables.py lib inv`

| repo | lib files | lib kLOC | test files | test kLOC | aux files | gen-sdk files | gen-other files |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 380 | 17.0 | 323 | 49.1 | 97 | 0 | 1 |
| azure-sdk-for-net | 390 | 35.8 | 364 | 60.7 | 22 | 0 | 39 |
| Dapper | 64 | 7.8 | 92 | 11.7 | 0 | 0 | 1 |
| StyleCopAnalyzers | 464 | 49.2 | 2674 | 84.0 | 1 | 0 | 230 |
| FluentValidation | 140 | 6.4 | 78 | 10.0 | 0 | 0 | 1 |
| GitVersion | 487 | 23.4 | 285 | 82.0 | 94 | 0 | 5 |
| Humanizer | 392 | 45.4 | 299 | 75.3 | 44 | 0 | 0 |
| MessagePack-CSharp | 222 | 35.7 | 150 | 15.8 | 78 | 0 | 241 |
| PowerShell | 1 | 1.8 | 0 | 0.0 | 0 | 0 | 0 |
| StackExchange.Redis | 389 | 60.7 | 380 | 60.9 | 16 | 0 | 3 |
| CliWrap | 31 | 2.0 | 27 | 1.9 | 8 | 0 | 0 |
| simple-exec | 10 | 0.6 | 9 | 0.5 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 129 | 14.7 | 63 | 23.2 | 20 | 4253 | 1 |
| cake | 509 | 24.0 | 718 | 77.5 | 652 | 0 | 4 |
| coverlet | 106 | 10.4 | 165 | 25.4 | 8 | 0 | 3 |
| BenchmarkDotNet | 739 | 48.3 | 307 | 34.1 | 116 | 0 | 16 |
| aspire | 58 | 9.5 | 0 | 0.0 | 0 | 0 | 0 |
| command-line-api | 102 | 7.5 | 82 | 14.5 | 16 | 0 | 0 |
| roslynator | 1552 | 158.4 | 427 | 29.4 | 46 | 0 | 19 |
| sourcelink | 63 | 5.8 | 69 | 9.2 | 0 | 0 | 0 |
| MedallionShell | 35 | 3.1 | 11 | 1.8 | 0 | 0 | 0 |
| Meziantou.Analyzer | 404 | 39.7 | 198 | 39.3 | 0 | 0 | 0 |
| testfx | 1711 | 137.6 | 2077 | 747.0 | 87 | 0 | 35 |
| vs-threading | 150 | 20.4 | 91 | 27.1 | 3 | 0 | 1 |
| nodatime | 255 | 22.8 | 225 | 24.6 | 6 | 0 | 2 |
| npgsql | 335 | 42.2 | 136 | 34.7 | 0 | 0 | 4 |
| nuke | 442 | 23.1 | 58 | 3.8 | 83 | 0 | 63 |
| octokit.net | 1038 | 51.6 | 529 | 87.8 | 16 | 0 | 0 |
| openai-dotnet | 857 | 22.3 | 101 | 26.0 | 165 | 2316 | 133 |
| pulumi-dotnet | 256 | 18.5 | 215 | 16.2 | 183 | 0 | 579 |
| serilog | 113 | 7.1 | 103 | 8.5 | 0 | 0 | 0 |
| spectre.console | 371 | 19.4 | 77 | 9.9 | 4 | 0 | 16 |
| stripe-dotnet | 0 | 0.0 | 159 | 15.1 | 5 | 6151 | 1 |
| testcontainers-dotnet | 534 | 22.1 | 246 | 12.7 | 38 | 0 | 0 |
| xunit | 1017 | 47.7 | 450 | 78.4 | 63 | 0 | 19 |
| **TOTAL** | 13746 | 1041.9 | 11188 | 1798.1 | 1871 | 12720 | 1417 |

gen-sdk kLOC total: 1076.0; gen-other kLOC total: 218.4; aux kLOC: 97.4

Generated SDK trees (reported separately, excluded from every lib number). Command: `python3 -I build_report.py` (section `GEN`, from `out.json` bucket `gen-sdk`):

| repo | files | kLOC | public classes sealed / open | `required` | `init` | `!` | await | ConfigureAwait(false) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| anthropic-sdk-csharp | 4253 | 723 | 269 / 2775 | 3260 | 6862 | 53 | 1951 | 1485 |
| openai-dotnet | 2316 | 194 | 0 / 950 | 0 | 0 | 0 | 195 | 182 |
| stripe-dotnet | 6151 | 160 | 1 / 6060 | 0 | 0 | 8 | 28 | 37 |

What the generated trees teach an agent, because they are the most widely copied style: stripe has 6,060 open public classes and 1 sealed; openai Generated has 950 open and 0 sealed; anthropic Models/Services use `required` 3,260 times and `init` 6,862 times but 2,775 open vs 269 sealed classes. Copying generated-SDK shape produces unsealed, mutable-by-init DTOs. Anthropic also shows `ConfigureAwait(false)` on 1,485 of 1,951 awaits even in generated code.

## 3. Findings by axis (lib bucket)

### 3.1 Nullable and argument guards

Commands: `python3 -I tables.py lib null` (counters: `#nullable\s+enable`, `#nullable\s+disable`, null-forgiving `(?<=[\w\)\]>])!(?=[\.\)\;\,\[\]\s\}]|$)` on blanked source, `ArgumentNullException\.ThrowIfNull\(`, `ArgumentException\.ThrowIfNullOr(Empty|WhiteSpace)\(`, `new\s+ArgumentNullException\(`, `Requires\.NotNull`, `Guard\.\w+\(`). Project switch: `python3 -I config.py` counter `nullable_enable`.

**1 nullable + guards** (bucket `lib`)

| repo | kLOC | #nullable enable | #nullable disable | `!` count | `!`/kLOC | ThrowIfNull | ThrowIfNullOr* | new ArgumentNullException | Requires.NotNull | Guard.* |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 17.0 | 82 | 0 | 51 | 3.01 | 1 | 0 | 415 | 0 | 150 |
| azure-sdk-for-net | 35.8 | 74 | 137 | 106 | 2.96 | 0 | 0 | 72 | 0 | 0 |
| Dapper | 7.8 | 1 | 0 | 170 | 21.68 | 0 | 0 | 43 | 0 | 0 |
| StyleCopAnalyzers | 49.2 | 0 | 408 | 7 | 0.14 | 0 | 0 | 12 | 26 | 0 |
| FluentValidation | 6.4 | 0 | 0 | 0 | 0.00 | 103 | 0 | 6 | 0 | 0 |
| GitVersion | 23.4 | 0 | 0 | 79 | 3.38 | 54 | 12 | 17 | 0 | 0 |
| Humanizer | 45.4 | 0 | 0 | 96 | 2.11 | 34 | 0 | 1 | 0 | 0 |
| MessagePack-CSharp | 35.7 | 5 | 3 | 166 | 4.65 | 0 | 0 | 40 | 2 | 0 |
| PowerShell | 1.8 | 2 | 1 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 |
| StackExchange.Redis | 60.7 | 0 | 0 | 243 | 4.00 | 5 | 0 | 157 | 0 | 0 |
| CliWrap | 2.0 | 0 | 0 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 |
| simple-exec | 0.6 | 0 | 0 | 1 | 1.55 | 0 | 0 | 3 | 0 | 0 |
| anthropic-sdk-csharp | 14.7 | 0 | 0 | 57 | 3.88 | 0 | 0 | 25 | 0 | 0 |
| cake | 24.0 | 1 | 0 | 0 | 0.00 | 705 | 0 | 112 | 0 | 0 |
| coverlet | 10.4 | 0 | 0 | 16 | 1.55 | 5 | 0 | 18 | 0 | 0 |
| BenchmarkDotNet | 48.3 | 0 | 1 | 440 | 9.11 | 15 | 1 | 30 | 0 | 0 |
| aspire | 9.5 | 0 | 0 | 21 | 2.21 | 1 | 6 | 0 | 0 | 0 |
| command-line-api | 7.5 | 1 | 0 | 36 | 4.79 | 0 | 0 | 39 | 0 | 0 |
| roslynator | 158.4 | 0 | 0 | 376 | 2.37 | 0 | 0 | 555 | 0 | 0 |
| sourcelink | 5.8 | 1 | 0 | 21 | 3.65 | 0 | 0 | 3 | 0 | 0 |
| MedallionShell | 3.1 | 0 | 0 | 5 | 1.60 | 0 | 0 | 2 | 0 | 0 |
| Meziantou.Analyzer | 39.7 | 0 | 0 | 162 | 4.08 | 0 | 0 | 1 | 0 | 0 |
| testfx | 137.6 | 0 | 3 | 508 | 3.69 | 3 | 1 | 278 | 0 | 0 |
| vs-threading | 20.4 | 0 | 0 | 113 | 5.53 | 0 | 0 | 31 | 240 | 0 |
| nodatime | 22.8 | 0 | 0 | 97 | 4.26 | 0 | 0 | 8 | 0 | 0 |
| npgsql | 42.2 | 0 | 9 | 353 | 8.36 | 37 | 5 | 18 | 0 | 0 |
| nuke | 23.1 | 0 | 0 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 |
| octokit.net | 51.6 | 0 | 0 | 0 | 0.00 | 0 | 0 | 12 | 0 | 0 |
| openai-dotnet | 22.3 | 23 | 0 | 40 | 1.79 | 0 | 0 | 41 | 0 | 0 |
| pulumi-dotnet | 18.5 | 0 | 0 | 183 | 9.90 | 0 | 0 | 25 | 0 | 0 |
| serilog | 7.1 | 0 | 0 | 23 | 3.26 | 0 | 0 | 8 | 0 | 141 |
| spectre.console | 19.4 | 0 | 0 | 6 | 0.31 | 438 | 0 | 81 | 0 | 0 |
| testcontainers-dotnet | 22.1 | 0 | 0 | 0 | 0.00 | 0 | 0 | 5 | 0 | 88 |
| xunit | 47.7 | 31 | 0 | 82 | 1.72 | 0 | 0 | 97 | 0 | 1650 |
| **TOTAL** | 1041.9 | 221 | 562 | 3458 | 3.32 | 1401 | 25 | 2155 | 268 | 2029 |

- `<Nullable>enable</Nullable>` appears in props/csproj of 30 of 35 repos. Absent: FluentValidation, PowerShell (slice), cake (`nullable_disable` set), Meziantou.Analyzer, nuke.
- Null-forgiving density is 3.32 per kLOC overall. Tail: Dapper 21.7 (`return rawSql!;` at `DapperLib__Dapper@eb47546a408b:Dapper.SqlBuilder/SqlBuilder.cs:98`), pulumi 9.9, BenchmarkDotNet 9.1, npgsql 8.4 (`= null!;` on required-by-construction properties at `npgsql__npgsql@9c47244547c2:src/Npgsql.SourceGenerators/NpgsqlConnectionStringBuilderSourceGenerator.cs:127`). Near zero: StyleCop 0.14, spectre 0.31. Zero in repos that never enabled nullable (FluentValidation, nuke, cake) but also in octokit, CliWrap, testcontainers.
- File-level opt-outs persist in big migrations: azure-sdk-for-net 137 `#nullable disable` (e.g. `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/AuthenticationAccount.cs:4`), StyleCop 408 (`DotNetAnalyzers__StyleCopAnalyzers@d51e0fd84584:StyleCop.Analyzers/StyleCop.Analyzers/AnalyzerCategory.cs:4`). New repos have 0.
- Guards: ThrowIfNull-dominant = cake 705:112, spectre 438:81, FluentValidation 103:6, GitVersion 54:17, Humanizer 34:1, npgsql 37:18. Manual-dominant = Polly 1:415 (+150 `Guard.`; `Polly__e4476096da5b:src/Polly.Core/Utils/Guard.cs:7` is an internal helper because Polly.Core targets net462, `Polly.Core.csproj:4`), Redis 5:157, roslynator 0:555, testfx 3:278, xunit 0:97 (+1,650 `Guard.`), vs-threading 0 (+240 `Requires.NotNull`). Spectre targets `netstandard2.0` yet uses ThrowIfNull 438 times because it references the `Polyfill` package for that TFM (`spectreconsole__spectre.console@0de183140529:src/Spectre.Console/Spectre.Console.csproj:33`). So the guard form is decided by the lowest TFM, not by taste.

### 3.2 Async

Commands: `python3 -I tables.py lib async`. Counters: async declarations `\basync\b(?!\s*(?:\(|delegate\b|\w+\s*=>))` (lambdas excluded), `\bawait\b`, `\.ConfigureAwait\(\s*false\s*\)`, `\bValueTask\b`, `\bTask\b`, `\bIAsyncEnumerable\b`, `\[EnumeratorCancellation\]`, `\basync\s+void\s+\w+\s*\(([^)]*)\)` (handler = params match `EventArgs|\bsender\b`), `\.GetAwaiter\(\)\s*\.GetResult\(\)`, `\.Wait\(\s*\)`, `\.Result\b`, `Async\s*\([^;{}]*\)\s*\.Result\b`, CancellationToken parameter `\bCancellationToken\??\s+(\w+)(\s*=\s*[^,()]+(?:\([^()]*\))?)?\s*([,)])` (terminator `)` = last parameter).

**2a async** (bucket `lib`)

| repo | async decl | await | ConfigureAwait(false) | CFA/await | CFA(true) | ValueTask | Task | IAsyncEnumerable | [EnumeratorCancellation] | async void (non-handler / handler) | GetAwaiter().GetResult() | .Wait() | .Result | Async(..).Result | Task.Run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 62 | 138 | 20 | 14% | 0 | 223 | 593 | 0 | 0 | 0 / 0 | 8 | 0 | 8 | 0 | 4 |
| azure-sdk-for-net | 586 | 360 | 361 | 100% | 0 | 237 | 190 | 10 | 1 | 0 / 0 | 14 | 0 | 4 | 0 | 3 |
| Dapper | 18 | 47 | 41 | 87% | 0 | 3 | 145 | 8 | 2 | 0 / 0 | 0 | 0 | 3 | 1 | 0 |
| StyleCopAnalyzers | 197 | 310 | 305 | 98% | 6 | 0 | 340 | 0 | 0 | 0 / 0 | 3 | 0 | 2 | 2 | 3 |
| FluentValidation | 12 | 28 | 0 | 0% | 0 | 7 | 49 | 0 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| GitVersion | 0 | 7 | 5 | 71% | 0 | 1 | 26 | 0 | 0 | 0 / 0 | 2 | 2 | 0 | 0 | 0 |
| Humanizer | 5 | 6 | 6 | 100% | 0 | 0 | 5 | 0 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| MessagePack-CSharp | 18 | 27 | 20 | 74% | 0 | 16 | 32 | 1 | 1 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| PowerShell | 1 | 1 | 0 | 0% | 0 | 0 | 1 | 0 | 0 | 0 / 0 | 1 | 0 | 0 | 0 | 0 |
| StackExchange.Redis | 127 | 289 | 62 | 21% | 0 | 86 | 1459 | 36 | 1 | 0 / 0 | 10 | 6 | 24 | 0 | 7 |
| CliWrap | 16 | 56 | 48 | 86% | 0 | 2 | 49 | 5 | 2 | 0 / 0 | 2 | 0 | 0 | 0 | 0 |
| simple-exec | 5 | 12 | 7 | 58% | 0 | 0 | 15 | 0 | 0 | 0 / 0 | 0 | 1 | 2 | 0 | 0 |
| anthropic-sdk-csharp | 77 | 135 | 120 | 89% | 0 | 24 | 118 | 27 | 9 | 0 / 0 | 2 | 0 | 4 | 0 | 1 |
| cake | 35 | 66 | 25 | 38% | 0 | 0 | 186 | 5 | 1 | 0 / 0 | 9 | 3 | 2 | 0 | 1 |
| coverlet | 13 | 41 | 6 | 15% | 0 | 2 | 73 | 0 | 0 | 0 / 0 | 1 | 1 | 0 | 0 | 0 |
| BenchmarkDotNet | 227 | 574 | 434 | 76% | 8 | 378 | 138 | 76 | 8 | 7 / 0 | 10 | 1 | 11 | 0 | 1 |
| aspire | 71 | 215 | 213 | 99% | 0 | 14 | 178 | 7 | 3 | 0 / 0 | 0 | 3 | 1 | 0 | 27 |
| command-line-api | 2 | 8 | 2 | 25% | 0 | 0 | 23 | 0 | 0 | 0 / 0 | 2 | 0 | 7 | 0 | 0 |
| roslynator | 569 | 1069 | 994 | 93% | 0 | 0 | 1028 | 0 | 0 | 0 / 0 | 0 | 0 | 36 | 14 | 0 |
| sourcelink | 4 | 5 | 4 | 80% | 0 | 0 | 16 | 0 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| MedallionShell | 16 | 35 | 34 | 97% | 0 | 0 | 125 | 0 | 0 | 0 / 0 | 5 | 4 | 3 | 1 | 5 |
| Meziantou.Analyzer | 279 | 412 | 403 | 98% | 0 | 0 | 305 | 0 | 0 | 0 / 0 | 0 | 0 | 1 | 0 | 0 |
| testfx | 749 | 1893 | 1842 | 97% | 2 | 22 | 1907 | 0 | 0 | 0 / 0 | 38 | 8 | 58 | 1 | 24 |
| vs-threading | 56 | 161 | 78 | 48% | 15 | 35 | 488 | 0 | 0 | 1 / 0 | 12 | 5 | 10 | 0 | 0 |
| nodatime | 10 | 16 | 0 | 0% | 0 | 0 | 10 | 0 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| npgsql | 1305 | 706 | 703 | 100% | 0 | 331 | 307 | 11 | 2 | 2 / 0 | 116 | 1 | 19 | 0 | 1 |
| nuke | 18 | 28 | 0 | 0% | 0 | 0 | 51 | 0 | 0 | 0 / 0 | 18 | 2 | 4 | 1 | 0 |
| octokit.net | 194 | 217 | 188 | 87% | 0 | 0 | 2611 | 1 | 0 | 0 / 0 | 0 | 1 | 1 | 0 | 1 |
| openai-dotnet | 183 | 208 | 195 | 94% | 0 | 15 | 196 | 14 | 2 | 0 / 0 | 0 | 0 | 0 | 0 | 0 |
| pulumi-dotnet | 195 | 426 | 290 | 68% | 0 | 4 | 599 | 2 | 0 | 0 / 0 | 3 | 0 | 21 | 0 | 3 |
| serilog | 7 | 14 | 10 | 71% | 0 | 10 | 14 | 0 | 0 | 0 / 0 | 0 | 1 | 0 | 0 | 1 |
| spectre.console | 19 | 36 | 25 | 69% | 0 | 0 | 67 | 0 | 0 | 0 / 0 | 10 | 1 | 0 | 0 | 1 |
| testcontainers-dotnet | 170 | 367 | 365 | 99% | 2 | 15 | 378 | 0 | 0 | 0 / 0 | 1 | 0 | 0 | 0 | 0 |
| xunit | 148 | 363 | 9 | 2% | 0 | 382 | 88 | 2 | 0 | 1 / 0 | 6 | 6 | 14 | 0 | 8 |
| **TOTAL** | 5394 | 8276 | 6815 | 82% | 33 | 1807 | 11810 | 205 | 32 | 11 / 0 | 273 | 46 | 235 | 20 | 91 |

**2b cancellation tokens** (bucket `lib`)

| repo | CT params | last | not last | with default | named `cancellationToken` | named `ct` | named `token` | other names | CancellationToken.None | CreateLinkedTokenSource | CancelAfter |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 233 | 158 | 75 | 18 | 231 | 0 | 0 | 2 | 14 | 4 | 3 |
| azure-sdk-for-net | 387 | 381 | 6 | 108 | 356 | 0 | 0 | 31 | 5 | 6 | 9 |
| Dapper | 29 | 29 | 0 | 10 | 26 | 0 | 0 | 3 | 0 | 0 | 0 |
| StyleCopAnalyzers | 162 | 160 | 2 | 0 | 159 | 0 | 3 | 0 | 2 | 0 | 0 |
| FluentValidation | 22 | 22 | 0 | 6 | 1 | 1 | 1 | 19 | 0 | 0 | 0 |
| GitVersion | 17 | 17 | 0 | 11 | 13 | 2 | 0 | 2 | 1 | 0 | 0 |
| Humanizer | 5 | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| MessagePack-CSharp | 54 | 53 | 1 | 33 | 52 | 2 | 0 | 0 | 0 | 0 | 0 |
| PowerShell | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| StackExchange.Redis | 63 | 60 | 3 | 15 | 57 | 0 | 0 | 6 | 20 | 2 | 1 |
| CliWrap | 40 | 33 | 7 | 30 | 26 | 0 | 0 | 14 | 5 | 5 | 0 |
| simple-exec | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 107 | 107 | 0 | 35 | 107 | 0 | 0 | 0 | 4 | 6 | 0 |
| cake | 35 | 35 | 0 | 0 | 35 | 0 | 0 | 0 | 29 | 0 | 0 |
| coverlet | 7 | 7 | 0 | 0 | 1 | 0 | 0 | 6 | 3 | 0 | 0 |
| BenchmarkDotNet | 259 | 257 | 2 | 44 | 259 | 0 | 0 | 0 | 4 | 6 | 4 |
| aspire | 98 | 88 | 10 | 28 | 83 | 3 | 0 | 12 | 1 | 3 | 3 |
| command-line-api | 5 | 5 | 0 | 3 | 5 | 0 | 0 | 0 | 2 | 1 | 0 |
| roslynator | 1075 | 1073 | 2 | 512 | 1075 | 0 | 0 | 0 | 1 | 0 | 0 |
| sourcelink | 3 | 3 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| MedallionShell | 19 | 17 | 2 | 0 | 19 | 0 | 0 | 0 | 6 | 0 | 0 |
| Meziantou.Analyzer | 263 | 252 | 11 | 2 | 263 | 0 | 0 | 0 | 6 | 1 | 0 |
| testfx | 612 | 551 | 61 | 22 | 579 | 0 | 1 | 32 | 83 | 25 | 16 |
| vs-threading | 125 | 117 | 8 | 43 | 120 | 0 | 0 | 5 | 35 | 3 | 0 |
| nodatime | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| npgsql | 467 | 446 | 21 | 259 | 466 | 0 | 0 | 1 | 73 | 6 | 10 |
| nuke | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | 0 |
| octokit.net | 99 | 89 | 10 | 60 | 96 | 0 | 0 | 3 | 42 | 1 | 0 |
| openai-dotnet | 239 | 235 | 4 | 222 | 239 | 0 | 0 | 0 | 1 | 0 | 0 |
| pulumi-dotnet | 197 | 196 | 1 | 131 | 179 | 16 | 0 | 2 | 8 | 3 | 0 |
| serilog | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| spectre.console | 20 | 20 | 0 | 12 | 20 | 0 | 0 | 0 | 4 | 0 | 0 |
| testcontainers-dotnet | 259 | 259 | 0 | 251 | 5 | 254 | 0 | 0 | 8 | 2 | 1 |
| xunit | 54 | 51 | 3 | 4 | 54 | 0 | 0 | 0 | 1 | 3 | 0 |
| **TOTAL** | 4958 | 4729 | 229 | 1860 | 4537 | 278 | 5 | 138 | 361 | 77 | 47 |

CT param name histogram (top 12): `cancellationToken`=4537, `ct`=278, `cancellation`=57, `CancellationToken`=8, `forcefulCancellationToken`=7, `gracefulCancellationToken`=7, `applicationCancellationToken`=6, `token`=5, `cancel`=3, `requestCancellationToken`=3, `userCancellationToken`=3, `rootToken`=3

- **ConfigureAwait.** The `false` count understates compliance in two repos that use another spelling. Polly: `await action(context).ConfigureAwait(context.ContinueOnCapturedContext)` 117 times (`App-vNext__Polly@e4476096da5b:src/Polly.Core/CircuitBreaker/CircuitBreakerManualControl.cs:81`), measured by `git -C App-vNext__Polly grep -hE 'ConfigureAwait\((continue|[a-z]+\.)' -- '*.cs' | wc -l`. StackExchange.Redis: `.ForAwait()` 533 times, defined as `ConfiguredTaskAwaitable ForAwait(this Task task) => task.ConfigureAwait(false)` (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/TaskExtensions.cs:72`). `ConfigureAwaitOptions` (the .NET 8 form) appears once in Polly and nowhere else (`git grep -h ConfigureAwaitOptions`). xunit deliberately omits it (2%) and sets `CA2007 = none`.
- **Enforcement is a build setting.** `CA2007` severity set by repo: testfx `warning` (`microsoft__testfx@7226b0c74729:.editorconfig:446`, 97% compliance), npgsql `warning` (100%), BenchmarkDotNet `warning` (76%), stripe `error`, xunit/MessagePack/vs-threading/Meziantou `none` or `silent`. Measured with `git -C <repo> grep -hE 'CA2007\.severity' -- '*.editorconfig' '*.globalconfig' '*.ruleset'`. Compliance follows the analyzer, not the repo's intent.
- **ValueTask.** 1,807 `ValueTask` mentions vs 11,810 `Task` mentions (13%); concentrated in perf-driven libraries: BenchmarkDotNet 378, xunit 382, npgsql 331, azure 237, Polly 223. SDK-style repos (octokit, CliWrap, openai, anthropic, Dapper) are `Task`-first; `IAsyncEnumerable` appears in 205 places, mostly SDK pagination/streaming (Redis 36, anthropic 27, BDN 76) and `[EnumeratorCancellation]` only 32 times, so most async iterators silently lose the token parameter ceremony.
- **async void.** 11 outside event handlers, 0 handlers, in lib code. All are fire-and-forget by design: timer callbacks (`npgsql__npgsql@9c47244547c2:src/Npgsql/Replication/ReplicationConnection.cs:660,678`), a local `async void Cancel()` (`dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Loggers/Broker.cs:92`), `private async void StartWorkload()` (`.../Toolchains/InProcess/NoEmit/BenchmarkActionImpl.cs:287`), `private async void PostHelper(...)` (`microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/AsyncReaderWriterLock.cs:2818`). The rest of the corpus is `async Task`; async-void test methods exist only in tests (Dapper `tests/Dapper.Tests/MiscTests.cs:1247`, FluentValidation `src/FluentValidation.Tests/CustomValidatorTester.cs:158`) and are a defect there.
- **Sync-over-async.** Heavy where the library has a sync API facade: npgsql 116 `GetAwaiter().GetResult()`, testfx 38, BenchmarkDotNet 10, Redis 10, spectre 10. Light in async-first SDK wrappers: CliWrap 2 (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Utils/SimplexStream.cs:171`), anthropic 2, openai 0. The Python-SDK-shaped C# wrapper will not need it.
- **CancellationToken.** 4,958 parameters in lib: named `cancellationToken` 4,537 (91.5%), `ct` 278 (testcontainers owns 254 of them), `cancellation` 57, other 86. Last parameter: 4,729 (95.4%). Not-last cases are mostly two-token signatures (CliWrap `forcefulCancellationToken, gracefulCancellationToken` at `CliWrap/Command.Execution.cs:158-161`), legacy Polly v7 `...CancellationToken cancellationToken, bool continueOnCapturedContext` (`Polly/src/Polly/NoOp/AsyncNoOpPolicy.cs:15`), and testfx internals. Defaulted (`= default`): 1,860 (37.5%), concentrated on public overloads (openai 222 of 239, roslynator 512 of 1,075, npgsql 259 of 467). `CancellationToken.None` appears 361 times, `CreateLinkedTokenSource` 77, `CancelAfter` 47.

### 3.3 Disposal

Command: `python3 -I tables.py lib disp`. Counters: `IAsyncDisposable`, `\bawait\s+using\b`, `^\s*~\w+\s*\(\s*\)`, `void\s+Dispose\(\s*bool`, `GC\.SuppressFinalize`, `SafeHandle`, using declaration `\busing\s+(?:var|[\w<>\.\?\[\]]+)\s+\w+\s*=`, using statement `\busing\s*\(`.

**3 disposal** (bucket `lib`)

| repo | IDisposable | IAsyncDisposable | DisposeAsync | await using | using decl | using stmt | finalizer ~T() | Dispose(bool) | GC.SuppressFinalize | SafeHandle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 13 | 10 | 27 | 0 | 16 | 0 | 1 | 0 | 6 | 0 |
| azure-sdk-for-net | 26 | 0 | 1 | 0 | 111 | 13 | 0 | 4 | 1 | 0 |
| Dapper | 4 | 1 | 9 | 0 | 9 | 8 | 0 | 5 | 4 | 0 |
| StyleCopAnalyzers | 2 | 0 | 0 | 0 | 2 | 5 | 0 | 0 | 0 | 0 |
| FluentValidation | 6 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 |
| GitVersion | 26 | 0 | 0 | 2 | 28 | 27 | 0 | 8 | 2 | 0 |
| Humanizer | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 |
| MessagePack-CSharp | 16 | 0 | 0 | 0 | 3 | 83 | 0 | 2 | 2 | 0 |
| PowerShell | 0 | 0 | 0 | 0 | 1 | 4 | 0 | 0 | 0 | 0 |
| StackExchange.Redis | 32 | 7 | 18 | 7 | 33 | 14 | 4 | 8 | 9 | 0 |
| CliWrap | 3 | 0 | 1 | 7 | 14 | 5 | 0 | 1 | 0 | 0 |
| simple-exec | 0 | 0 | 0 | 1 | 6 | 0 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 8 | 0 | 1 | 0 | 29 | 4 | 0 | 5 | 3 | 0 |
| cake | 20 | 0 | 0 | 16 | 48 | 63 | 0 | 0 | 0 | 0 |
| coverlet | 1 | 0 | 0 | 0 | 40 | 10 | 1 | 2 | 1 | 0 |
| BenchmarkDotNet | 31 | 18 | 20 | 6 | 100 | 41 | 2 | 10 | 2 | 2 |
| aspire | 6 | 7 | 4 | 1 | 22 | 4 | 0 | 0 | 0 | 0 |
| command-line-api | 2 | 0 | 0 | 0 | 11 | 4 | 0 | 0 | 0 | 0 |
| roslynator | 9 | 0 | 0 | 8 | 5 | 108 | 0 | 6 | 3 | 0 |
| sourcelink | 4 | 0 | 0 | 0 | 9 | 4 | 0 | 0 | 0 | 0 |
| MedallionShell | 7 | 0 | 0 | 0 | 2 | 8 | 0 | 5 | 0 | 1 |
| Meziantou.Analyzer | 3 | 0 | 0 | 1 | 9 | 0 | 0 | 0 | 0 | 0 |
| testfx | 160 | 26 | 61 | 2 | 223 | 137 | 2 | 3 | 7 | 0 |
| vs-threading | 29 | 6 | 4 | 1 | 1 | 69 | 0 | 4 | 4 | 0 |
| nodatime | 3 | 0 | 0 | 3 | 9 | 20 | 0 | 0 | 0 | 0 |
| npgsql | 36 | 3 | 47 | 2 | 65 | 22 | 0 | 11 | 6 | 0 |
| nuke | 27 | 0 | 0 | 2 | 40 | 105 | 0 | 0 | 0 | 0 |
| octokit.net | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 1 | 0 |
| openai-dotnet | 4 | 0 | 3 | 2 | 224 | 6 | 0 | 2 | 3 | 0 |
| pulumi-dotnet | 5 | 3 | 9 | 2 | 38 | 1 | 0 | 2 | 1 | 0 |
| serilog | 34 | 17 | 16 | 0 | 4 | 1 | 0 | 1 | 0 | 0 |
| spectre.console | 7 | 0 | 0 | 0 | 5 | 8 | 0 | 0 | 0 | 0 |
| testcontainers-dotnet | 13 | 8 | 18 | 0 | 23 | 50 | 0 | 0 | 2 | 0 |
| xunit | 48 | 32 | 51 | 25 | 80 | 49 | 0 | 4 | 41 | 0 |
| **TOTAL** | 586 | 138 | 290 | 88 | 1212 | 884 | 10 | 84 | 98 | 3 |

- Finalizers: **10 in 1,041.9 kLOC**, in 5 repos (Redis 4, BDN 2, testfx 2, Polly 1, coverlet 1). The full `Dispose(bool)` + finalizer pattern is rare; `Dispose(bool)` 84, `SuppressFinalize` 98 (xunit 41 of those). `SafeHandle` 3.
- `IAsyncDisposable` 138 vs `IDisposable` 586; `await using` 88; using declarations (1,212) outnumber using statements (884) 58:42.

### 3.4 Types and syntax

Command: `python3 -I tables.py lib types`. Type-declaration regex: `^[ \t]*(modifiers)*(class|interface|enum|struct|record)(\s+(class|struct))?\s+\w+` with modifiers `public|internal|protected|private|sealed|abstract|static|partial|unsafe|new|file|readonly|ref`. Primary constructors `(class|struct)\s+\w+(<..>)?\(`; collection expressions `(?:=|=>|\breturn|\?\?|\?|:|\()\s*\[(?!\s*\])`.

**4 types** (bucket `lib`)

| repo | pub class | sealed | abstract | static | open (unsealed) | open% | int class | int sealed | record decl | primary ctor (class/struct) | record positional | required | init | collexpr | new List<>() | readonly struct | struct decl | Span<> | Memory<> | stackalloc | file-scoped ns files | block ns files |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 217 | 23 | 33 | 44 | 117 | 84% | 132 | 70 | 10 | 4 | 11 | 0 | 0 | 22 | 2 | 41 | 42 | 1 | 0 | 0 | 379 | 0 |
| azure-sdk-for-net | 138 | 18 | 22 | 10 | 88 | 83% | 208 | 30 | 0 | 2 | 0 | 0 | 0 | 26 | 54 | 42 | 64 | 114 | 70 | 4 | 5 | 383 |
| Dapper | 61 | 4 | 6 | 33 | 18 | 82% | 25 | 20 | 0 | 0 | 0 | 0 | 1 | 9 | 13 | 6 | 6 | 0 | 0 | 0 | 1 | 62 |
| StyleCopAnalyzers | 4 | 0 | 0 | 0 | 4 | 100% | 417 | 27 | 3 | 0 | 3 | 0 | 0 | 0 | 86 | 7 | 26 | 0 | 0 | 0 | 4 | 447 |
| FluentValidation | 64 | 0 | 7 | 8 | 49 | 100% | 74 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 138 | 0 |
| GitVersion | 91 | 8 | 3 | 23 | 57 | 88% | 273 | 128 | 59 | 131 | 37 | 38 | 112 | 135 | 21 | 3 | 6 | 52 | 2 | 14 | 480 | 0 |
| Humanizer | 138 | 33 | 0 | 55 | 50 | 60% | 74 | 53 | 100 | 213 | 96 | 1 | 37 | 96 | 54 | 19 | 24 | 63 | 0 | 5 | 245 | 0 |
| MessagePack-CSharp | 461 | 237 | 8 | 21 | 195 | 45% | 76 | 11 | 25 | 0 | 11 | 22 | 51 | 29 | 20 | 1 | 53 | 364 | 71 | 26 | 53 | 162 |
| PowerShell | 2 | 1 | 0 | 0 | 1 | 50% | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 6 | 0 | 0 | 0 | 1 |
| StackExchange.Redis | 132 | 56 | 25 | 5 | 46 | 45% | 267 | 122 | 1 | 80 | 1 | 1 | 29 | 28 | 38 | 90 | 118 | 482 | 157 | 113 | 242 | 138 |
| CliWrap | 38 | 0 | 4 | 7 | 27 | 100% | 9 | 0 | 0 | 16 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 7 | 0 | 31 | 0 |
| simple-exec | 4 | 0 | 0 | 2 | 2 | 100% | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| anthropic-sdk-csharp | 79 | 32 | 3 | 15 | 29 | 48% | 40 | 22 | 11 | 4 | 3 | 42 | 114 | 35 | 13 | 1 | 3 | 6 | 14 | 0 | 127 | 1 |
| cake | 319 | 178 | 26 | 94 | 21 | 11% | 164 | 69 | 0 | 0 | 0 | 0 | 1 | 31 | 92 | 0 | 1 | 10 | 16 | 0 | 498 | 2 |
| coverlet | 15 | 0 | 1 | 5 | 9 | 100% | 82 | 12 | 0 | 0 | 0 | 0 | 0 | 40 | 23 | 2 | 3 | 0 | 0 | 0 | 25 | 75 |
| BenchmarkDotNet | 485 | 77 | 38 | 50 | 320 | 81% | 339 | 135 | 17 | 87 | 6 | 16 | 39 | 210 | 61 | 20 | 33 | 27 | 5 | 7 | 211 | 522 |
| aspire | 0 | 0 | 0 | 0 | 0 | - | 121 | 79 | 20 | 15 | 14 | 4 | 18 | 26 | 20 | 0 | 1 | 4 | 0 | 0 | 58 | 0 |
| command-line-api | 57 | 17 | 7 | 10 | 23 | 58% | 43 | 22 | 0 | 0 | 0 | 0 | 0 | 15 | 7 | 3 | 3 | 4 | 0 | 0 | 29 | 72 |
| roslynator | 558 | 442 | 26 | 30 | 60 | 12% | 798 | 75 | 3 | 0 | 2 | 0 | 22 | 16 | 100 | 106 | 115 | 0 | 0 | 0 | 1543 | 1 |
| sourcelink | 23 | 20 | 2 | 0 | 1 | 5% | 47 | 29 | 2 | 4 | 2 | 0 | 11 | 7 | 13 | 15 | 17 | 3 | 0 | 0 | 8 | 55 |
| MedallionShell | 10 | 7 | 3 | 0 | 0 | 0% | 26 | 10 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 33 |
| Meziantou.Analyzer | 304 | 292 | 1 | 1 | 10 | 3% | 98 | 40 | 15 | 83 | 25 | 0 | 0 | 151 | 63 | 4 | 8 | 50 | 0 | 0 | 401 | 0 |
| testfx | 461 | 341 | 15 | 67 | 38 | 10% | 1143 | 725 | 102 | 159 | 123 | 74 | 156 | 808 | 112 | 79 | 106 | 174 | 120 | 7 | 1688 | 10 |
| vs-threading | 132 | 24 | 14 | 35 | 59 | 71% | 32 | 3 | 0 | 1 | 0 | 0 | 2 | 37 | 18 | 47 | 58 | 10 | 8 | 0 | 137 | 5 |
| nodatime | 129 | 61 | 7 | 26 | 35 | 36% | 151 | 90 | 0 | 0 | 0 | 0 | 0 | 100 | 26 | 20 | 21 | 0 | 0 | 0 | 9 | 242 |
| npgsql | 148 | 69 | 28 | 15 | 36 | 34% | 5 | 3 | 4 | 81 | 2 | 17 | 59 | 90 | 29 | 42 | 62 | 100 | 82 | 16 | 328 | 0 |
| nuke | 338 | 4 | 27 | 136 | 171 | 98% | 58 | 0 | 3 | 13 | 3 | 0 | 6 | 86 | 18 | 0 | 2 | 0 | 0 | 0 | 439 | 0 |
| octokit.net | 769 | 8 | 8 | 21 | 732 | 99% | 17 | 1 | 0 | 0 | 0 | 0 | 0 | 6 | 35 | 0 | 1 | 0 | 0 | 0 | 0 | 1036 |
| openai-dotnet | 549 | 19 | 6 | 9 | 515 | 96% | 171 | 1 | 0 | 0 | 0 | 0 | 0 | 42 | 19 | 364 | 138 | 16 | 32 | 0 | 844 | 11 |
| pulumi-dotnet | 227 | 97 | 15 | 16 | 99 | 51% | 79 | 11 | 16 | 0 | 2 | 5 | 65 | 6 | 45 | 15 | 15 | 1 | 0 | 0 | 11 | 243 |
| serilog | 41 | 5 | 4 | 9 | 23 | 82% | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 12 | 5 | 3 | 5 | 30 | 4 | 17 | 110 | 1 |
| spectre.console | 231 | 130 | 11 | 86 | 4 | 3% | 109 | 62 | 5 | 6 | 4 | 0 | 11 | 29 | 70 | 10 | 15 | 8 | 0 | 0 | 364 | 0 |
| testcontainers-dotnet | 259 | 229 | 8 | 11 | 11 | 5% | 145 | 109 | 11 | 5 | 6 | 0 | 0 | 24 | 6 | 18 | 18 | 0 | 0 | 0 | 265 | 205 |
| xunit | 722 | 128 | 65 | 93 | 436 | 77% | 43 | 25 | 0 | 224 | 0 | 354 | 20 | 128 | 81 | 4 | 6 | 0 | 0 | 0 | 984 | 31 |
| **TOTAL** | 7206 | 2560 | 423 | 937 | 3286 | 56% | 5277 | 1984 | 407 | 1130 | 352 | 574 | 754 | 2252 | 1159 | 962 | 972 | 1525 | 588 | 209 | 9665 | 3738 |

- Sealed share by repo (public non-abstract non-static): Meziantou 292/302, spectre 130/134, testcontainers 229/240, testfx 341/379, roslynator 442/502, MedallionShell 7/7, sourcelink 20/21 vs Octokit 8/740, FluentValidation 0/49, CliWrap 0/27, StyleCop 0/4. Internal classes are sealed 59% (1,984 of 3,344).
- File-scoped namespaces: 9,665 files vs 3,738 block-scoped (72%). Block form survives in Octokit (all 1,036), azure (383), StyleCop (447), BDN (522), nodatime (242) because those predate C# 10 or hold a style rule; newer code is file-scoped everywhere.
- Primary constructors on classes/structs: 1,130 (xunit 224, Humanizer 213, testfx 159, GitVersion 131, BDN 87, Meziantou 83, npgsql 81, Redis 80). Example `Humanizr__Humanizer@4574b93883bf:src/Humanizer/Bytes/ByteRate.cs:11`. Positional records 352. `required` 574 (xunit 354, testfx 74, anthropic 42, GitVersion 38), `init` 754.
- Collection expressions: 2,252 vs 1,159 `new List<T>()`; testfx 808, BDN 210, Meziantou 151, GitVersion 135. Explicit `Array.Empty<` and `new T[] {}` coexist; the modern form wins only in repos on LangVersion >= 12 (Dapper 13, MessagePack 13, Redis 14).
- `readonly struct` 962 (openai Custom 364, roslynator 106, Redis 90); `ref struct` and `Span<>` 1,525 (Redis 482, MessagePack 364, azure 114), `Memory<>` 588, `stackalloc` 209. Zero-copy buffer code lives in a handful of serializers and clients; it is not general.

### 3.5 Exceptions

Command: `python3 -I tables.py lib exc`. Counters: custom exception = class whose base text contains `Exception`; `catch\s*\(\s*Exception\b[^)]*\)`; `catch\s*(?=\{)`; filters `catch\s*(\([^)]*\))?\s*when\s*\(`; `\bthrow\s*;`; `\bthrow\s+(ex|e|exc|exception|ex\d|error|err)\s*;`.

**5 exceptions** (bucket `lib`)

| repo | custom exc classes | public | sealed | catch (Exception) | catch (bare) | catch total | filters `when` | `throw;` | `throw ex;` | throw new | throw-expr | ExceptionDispatchInfo | catch OCE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 9 | 8 | 2 | 39 | 0 | 48 | 1 | 12 | 0 | 537 | 24 | 17 | 6 |
| azure-sdk-for-net | 6 | 4 | 0 | 77 | 17 | 183 | 26 | 38 | 1 | 521 | 67 | 4 | 11 |
| Dapper | 0 | 0 | 0 | 2 | 16 | 19 | 0 | 3 | 0 | 85 | 13 | 0 | 0 |
| StyleCopAnalyzers | 3 | 0 | 2 | 3 | 2 | 8 | 3 | 0 | 0 | 129 | 17 | 0 | 0 |
| FluentValidation | 2 | 2 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 33 | 1 | 0 | 0 |
| GitVersion | 7 | 6 | 1 | 25 | 5 | 54 | 12 | 5 | 0 | 300 | 58 | 0 | 0 |
| Humanizer | 1 | 1 | 0 | 6 | 0 | 35 | 1 | 1 | 0 | 612 | 59 | 1 | 0 |
| MessagePack-CSharp | 6 | 3 | 0 | 8 | 0 | 13 | 1 | 0 | 0 | 252 | 79 | 2 | 0 |
| PowerShell | 2 | 2 | 1 | 11 | 2 | 32 | 0 | 8 | 0 | 3 | 0 | 0 | 0 |
| StackExchange.Redis | 9 | 8 | 8 | 107 | 113 | 269 | 36 | 27 | 5 | 669 | 54 | 0 | 7 |
| CliWrap | 2 | 2 | 0 | 1 | 5 | 18 | 6 | 4 | 0 | 13 | 0 | 0 | 6 |
| simple-exec | 3 | 2 | 1 | 2 | 0 | 4 | 0 | 1 | 0 | 9 | 6 | 0 | 0 |
| anthropic-sdk-csharp | 17 | 17 | 0 | 11 | 4 | 57 | 10 | 5 | 0 | 232 | 44 | 0 | 4 |
| cake | 3 | 3 | 3 | 17 | 6 | 31 | 1 | 9 | 3 | 302 | 92 | 0 | 0 |
| coverlet | 3 | 1 | 0 | 37 | 9 | 60 | 1 | 2 | 0 | 72 | 14 | 0 | 0 |
| BenchmarkDotNet | 1 | 0 | 1 | 60 | 27 | 125 | 27 | 12 | 0 | 250 | 74 | 8 | 6 |
| aspire | 1 | 0 | 1 | 28 | 10 | 72 | 20 | 14 | 0 | 94 | 8 | 0 | 16 |
| command-line-api | 1 | 1 | 0 | 3 | 0 | 9 | 2 | 0 | 0 | 78 | 29 | 0 | 0 |
| roslynator | 1 | 0 | 0 | 22 | 1 | 43 | 20 | 5 | 0 | 924 | 106 | 0 | 2 |
| sourcelink | 0 | 0 | 0 | 13 | 13 | 34 | 10 | 0 | 0 | 66 | 6 | 0 | 1 |
| MedallionShell | 1 | 1 | 1 | 7 | 0 | 17 | 5 | 4 | 0 | 37 | 12 | 9 | 0 |
| Meziantou.Analyzer | 0 | 0 | 0 | 2 | 1 | 13 | 0 | 0 | 0 | 38 | 2 | 0 | 0 |
| testfx | 21 | 3 | 16 | 445 | 41 | 752 | 228 | 86 | 2 | 1182 | 408 | 11 | 83 |
| vs-threading | 3 | 3 | 0 | 37 | 3 | 54 | 6 | 11 | 0 | 117 | 37 | 3 | 8 |
| nodatime | 13 | 11 | 11 | 4 | 0 | 19 | 1 | 0 | 0 | 243 | 30 | 0 | 0 |
| npgsql | 3 | 3 | 2 | 71 | 49 | 144 | 15 | 60 | 2 | 612 | 133 | 3 | 7 |
| nuke | 3 | 2 | 0 | 27 | 8 | 41 | 1 | 4 | 0 | 66 | 3 | 0 | 0 |
| octokit.net | 21 | 21 | 0 | 6 | 1 | 63 | 0 | 7 | 0 | 328 | 230 | 0 | 0 |
| openai-dotnet | 0 | 0 | 0 | 10 | 1 | 20 | 0 | 4 | 0 | 131 | 10 | 0 | 0 |
| pulumi-dotnet | 16 | 10 | 4 | 20 | 5 | 37 | 4 | 8 | 0 | 260 | 48 | 14 | 2 |
| serilog | 1 | 1 | 0 | 16 | 0 | 19 | 0 | 4 | 0 | 33 | 1 | 0 | 0 |
| spectre.console | 1 | 1 | 1 | 2 | 11 | 17 | 0 | 2 | 0 | 231 | 89 | 0 | 0 |
| testcontainers-dotnet | 14 | 14 | 14 | 21 | 9 | 54 | 6 | 2 | 0 | 71 | 11 | 2 | 2 |
| xunit | 6 | 6 | 1 | 74 | 41 | 144 | 0 | 11 | 0 | 535 | 140 | 11 | 0 |
| **TOTAL** | 180 | 136 | 70 | 1214 | 400 | 2511 | 443 | 349 | 13 | 9065 | 1905 | 85 | 161 |

Custom exception base-class histogram: `Exception`=95, `ApiException`=10, `InvalidOperationException`=8, `Anthropic4xxException`=6, `ExecutionRejectedException`=5, `MessagePackSerializationException`=4, `AnthropicException`=4, `ForbiddenException`=4, `AnthropicApiException`=3, `CommandException`=3, `BrokenCircuitException`=2, `RuntimeException`=2, `RedisException`=2, `AnthropicServiceException`=2

- 180 custom exception classes; 136 public; **only 70 sealed (39%)**. Base is plain `Exception` in 95 (53%), then a repo-local root (`ApiException`, `AnthropicException`, `ExecutionRejectedException`, `MessagePackSerializationException`, `RedisException`, `CommandException`). Testcontainers seals all 14 (`testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Builders/DockerUnavailableException.cs:11`); Polly leaves its two-level circuit-breaker tree open (`.../src/Polly.Core/CircuitBreaker/BrokenCircuitException.cs:13`). `ApplicationException` has zero uses.
- `catch (Exception)` is 1,214 of 2,511 catch clauses (48%), exception filters 443 (17.6%): testfx 228, Redis 36, BDN 27, azure 26. Bare `catch {}` 400 (Redis 113, npgsql 49). `throw;` 349 vs `throw ex;` 13.
- The 13 `throw ex;` are mostly not the stack-destroying bug: cake `src/Cake.Core/CakeEngine.cs:608` rethrows a single collected exception on purpose, with the comment "Sadly this won't keep our original stack trace"; azure `.../Identity/CredentialDiagnosticScope.cs:52` throws after `ExceptionDispatchInfo.Capture(ex).Throw()` as an unreachable-path compiler satisfier. `ExceptionDispatchInfo` is used 85 times (Polly 17, pulumi 14, testfx 11, xunit 11).
- `throw new` 9,065 (includes throw-expressions); the `?? throw` / `? : throw` expression forms alone are 1,905.

### 3.6 Logging and diagnostics

Command: `python3 -I tables.py lib log`.

**6 logging/diagnostics** (bucket `lib`)

| repo | ILogger | ILoggerFactory | [LoggerMessage] | LoggerMessage.Define | EventSource | ActivitySource | StartActivity | Meter | Diagnostic(Source/Listener) | Console.Write | Debug.Assert |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 5 | 3 | 4 | 0 | 0 | 0 | 0 | 4 | 1 | 0 | 9 |
| azure-sdk-for-net | 0 | 0 | 0 | 0 | 9 | 8 | 1 | 0 | 10 | 2 | 37 |
| Dapper | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| StyleCopAnalyzers | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 42 | 11 |
| FluentValidation | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GitVersion | 105 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 21 | 0 |
| Humanizer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 144 | 2 |
| MessagePack-CSharp | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 22 | 14 |
| PowerShell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| StackExchange.Redis | 169 | 3 | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 67 | 101 |
| CliWrap | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| simple-exec | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| anthropic-sdk-csharp | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 |
| cake | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 2 |
| coverlet | 50 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 7 |
| BenchmarkDotNet | 179 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 12 | 83 |
| aspire | 34 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 10 |
| command-line-api | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| roslynator | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 26 | 195 |
| sourcelink | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 23 |
| MedallionShell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 |
| Meziantou.Analyzer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 2 |
| testfx | 185 | 61 | 0 | 0 | 0 | 1 | 31 | 1 | 2 | 23 | 76 |
| vs-threading | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 13 | 3 |
| nodatime | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 78 | 0 |
| npgsql | 105 | 10 | 73 | 0 | 4 | 1 | 3 | 14 | 0 | 0 | 277 |
| nuke | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 0 |
| octokit.net | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 16 |
| openai-dotnet | 0 | 0 | 0 | 0 | 0 | 7 | 1 | 6 | 0 | 0 | 25 |
| pulumi-dotnet | 19 | 0 | 0 | 0 | 0 | 16 | 14 | 0 | 0 | 7 | 16 |
| serilog | 34 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| spectre.console | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 | 8 |
| testcontainers-dotnet | 144 | 0 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| xunit | 4 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 5 | 0 |
| **TOTAL** | 1038 | 88 | 247 | 0 | 25 | 33 | 50 | 31 | 13 | 600 | 923 |

- `[LoggerMessage]` 247 (Redis 124, npgsql 73, testcontainers 46); `LoggerMessage.Define` 0. Example `StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/LoggerExtensions.cs:72`, `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Logging.cs:32`.
- `ActivitySource` 33 (pulumi 16, azure 8, openai 7), `Meter` 31, `EventSource` 25 (azure 9). Libraries that wrap a process or HTTP API instrument with `ActivitySource` when they instrument at all; none of the process wrappers (CliWrap, simple-exec, MedallionShell) do either.

### 3.7 Public API surface and evolution

Command: `python3 -I tables.py lib api`; evolution tooling from `python3 -I config.py` (`publicapi_files`, `publicapi_lines`, `package_validation`).

**7 public API surface (declarations incl. nested; accessibility = declared modifier only)** (bucket `lib`)

| repo | pub class | pub interface | pub enum | pub struct | pub record | pub delegate-ish n/a | internal types | InternalsVisibleTo | [Obsolete] | [Experimental] | [EditorBrowsable] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 217 | 34 | 7 | 40 | 1 |  | 148 | 0 | 0 | 0 | 40 |
| azure-sdk-for-net | 138 | 7 | 12 | 32 | 0 |  | 257 | 6 | 17 | 23 | 142 |
| Dapper | 61 | 8 | 1 | 1 | 0 |  | 29 | 1 | 28 | 0 | 36 |
| StyleCopAnalyzers | 4 | 0 | 5 | 2 | 0 |  | 451 | 29 | 0 | 0 | 2 |
| FluentValidation | 64 | 43 | 5 | 0 | 0 |  | 79 | 1 | 9 | 0 | 0 |
| GitVersion | 91 | 59 | 15 | 1 | 27 |  | 346 | 0 | 0 | 0 | 0 |
| Humanizer | 138 | 22 | 19 | 3 | 22 |  | 98 | 2 | 0 | 0 | 0 |
| MessagePack-CSharp | 461 | 14 | 20 | 36 | 24 |  | 93 | 1 | 6 | 0 | 6 |
| PowerShell | 2 | 0 | 0 | 0 | 0 |  | 9 | 0 | 1 | 0 | 0 |
| StackExchange.Redis | 132 | 21 | 70 | 83 | 0 |  | 339 | 0 | 65 | 15 | 146 |
| CliWrap | 38 | 1 | 1 | 0 | 0 |  | 9 | 0 | 2 | 0 | 0 |
| simple-exec | 4 | 0 | 0 | 0 | 0 |  | 4 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 79 | 10 | 4 | 1 | 9 |  | 42 | 0 | 2 | 0 | 2 |
| cake | 319 | 76 | 17 | 1 | 0 |  | 170 | 15 | 0 | 0 | 0 |
| coverlet | 15 | 0 | 1 | 0 | 0 |  | 108 | 23 | 0 | 0 | 0 |
| BenchmarkDotNet | 485 | 30 | 36 | 16 | 14 |  | 368 | 16 | 3 | 0 | 32 |
| aspire | 0 | 0 | 0 | 0 | 0 |  | 154 | 0 | 0 | 0 | 0 |
| command-line-api | 57 | 3 | 2 | 1 | 0 |  | 47 | 0 | 0 | 0 | 6 |
| roslynator | 558 | 2 | 24 | 48 | 2 |  | 925 | 0 | 2 | 0 | 2 |
| sourcelink | 23 | 0 | 0 | 3 | 1 |  | 64 | 0 | 0 | 0 | 2 |
| MedallionShell | 10 | 0 | 1 | 0 | 0 |  | 27 | 1 | 1 | 0 | 0 |
| Meziantou.Analyzer | 304 | 0 | 0 | 3 | 1 |  | 115 | 2 | 0 | 0 | 0 |
| testfx | 461 | 90 | 32 | 39 | 0 |  | 1423 | 1 | 50 | 110 | 114 |
| vs-threading | 132 | 3 | 5 | 41 | 0 |  | 45 | 0 | 6 | 1 | 12 |
| nodatime | 129 | 6 | 7 | 15 | 0 |  | 173 | 7 | 4 | 0 | 0 |
| npgsql | 148 | 5 | 31 | 40 | 2 |  | 9 | 3 | 40 | 49 | 14 |
| nuke | 338 | 47 | 34 | 2 | 1 |  | 60 | 20 | 6 | 0 | 0 |
| octokit.net | 769 | 254 | 118 | 1 | 0 |  | 17 | 0 | 72 | 0 | 8 |
| openai-dotnet | 549 | 0 | 37 | 95 | 0 |  | 216 | 0 | 16 | 263 | 112 |
| pulumi-dotnet | 227 | 2 | 9 | 9 | 14 |  | 94 | 5 | 3 | 0 | 0 |
| serilog | 41 | 12 | 4 | 1 | 0 |  | 2 | 2 | 1 | 0 | 4 |
| spectre.console | 231 | 30 | 20 | 9 | 2 |  | 123 | 0 | 9 | 0 | 4 |
| testcontainers-dotnet | 259 | 30 | 9 | 8 | 9 |  | 168 | 0 | 135 | 0 | 0 |
| xunit | 722 | 218 | 23 | 4 | 0 |  | 46 | 0 | 256 | 0 | 492 |
| **TOTAL** | 7206 | 1027 | 569 | 535 | 129 |  | 6258 | 135 | 734 | 461 | 1176 |

- `PublicAPI.Shipped.txt`/`Unshipped.txt` exist in **8 repos**: testfx (82 files, 2,581 lines), Redis (12 files, 3,381 lines), npgsql (10, 2,141), Polly (10, 1,725, in a dot-directory `src/Polly.Core/.PublicAPI/PublicAPI.Shipped.txt`), GitVersion (16, 1,268), pulumi (2, 983), Dapper (14, 413), StyleCop (6). `EnablePackageValidation` is set in 5 repos (FluentValidation, coverlet, vs-threading, nodatime, stripe). `[Experimental]` 461 (testfx 110, azure 23) is the only evolution marker used at scale; `[EditorBrowsable]` 1,176.
- `InternalsVisibleTo` appears in 135 source-level places (StyleCop 29, coverlet 23, cake 15, BDN 16); csproj-level `<InternalsVisibleTo>` items are not counted.
- Public classes (7,206) vs internal classes (5,277) = 1.37 public per internal class, skewed by API-surface-heavy repos (Octokit 769 public vs 17 internal, openai Custom 549 vs 171); the strict analyzers repos invert it (StyleCop 4 public vs 417 internal, roslynator 558 vs 798). Aspire's Dcp slice has 0 public classes and 154 internal types.

### 3.8 JSON and subprocess (extra axes, cheap to count)

Commands: `python3 -I tables.py lib json` (prints both the JSON table 9a and the subprocess table 9b).

**9a JSON** (bucket `lib`)

| repo | System.Text.Json | Newtonsoft | JsonSerializerContext | [JsonSerializable] | [JsonPropertyName] | Utf8JsonReader |
| --- | --- | --- | --- | --- | --- | --- |
| Polly | 0 | 0 | 0 | 0 | 0 | 0 |
| azure-sdk-for-net | 75 | 0 | 1 | 9 | 0 | 27 |
| Dapper | 0 | 0 | 0 | 0 | 0 | 0 |
| StyleCopAnalyzers | 0 | 3 | 0 | 0 | 0 | 0 |
| FluentValidation | 0 | 0 | 0 | 0 | 0 | 0 |
| GitVersion | 5 | 0 | 2 | 5 | 45 | 3 |
| Humanizer | 11 | 0 | 0 | 0 | 0 | 0 |
| MessagePack-CSharp | 0 | 6 | 0 | 0 | 0 | 0 |
| PowerShell | 0 | 0 | 0 | 0 | 0 | 0 |
| StackExchange.Redis | 0 | 0 | 0 | 0 | 0 | 0 |
| CliWrap | 0 | 0 | 0 | 0 | 0 | 0 |
| simple-exec | 0 | 0 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 71 | 0 | 0 | 0 | 17 | 6 |
| cake | 0 | 0 | 0 | 0 | 0 | 0 |
| coverlet | 5 | 0 | 0 | 0 | 0 | 0 |
| BenchmarkDotNet | 14 | 0 | 3 | 8 | 0 | 4 |
| aspire | 25 | 0 | 0 | 0 | 235 | 1 |
| command-line-api | 0 | 0 | 0 | 0 | 0 | 0 |
| roslynator | 0 | 14 | 0 | 0 | 0 | 0 |
| sourcelink | 1 | 0 | 0 | 0 | 0 | 0 |
| MedallionShell | 0 | 0 | 0 | 0 | 0 | 0 |
| Meziantou.Analyzer | 0 | 0 | 0 | 0 | 0 | 0 |
| testfx | 62 | 0 | 15 | 7 | 18 | 0 |
| vs-threading | 0 | 0 | 0 | 0 | 0 | 0 |
| nodatime | 0 | 0 | 0 | 0 | 0 | 0 |
| npgsql | 14 | 6 | 0 | 0 | 0 | 0 |
| nuke | 3 | 43 | 0 | 0 | 0 | 0 |
| octokit.net | 0 | 0 | 0 | 0 | 0 | 0 |
| openai-dotnet | 93 | 0 | 0 | 0 | 0 | 17 |
| pulumi-dotnet | 47 | 0 | 0 | 0 | 21 | 13 |
| serilog | 0 | 0 | 0 | 0 | 0 | 0 |
| spectre.console | 3 | 0 | 0 | 0 | 0 | 0 |
| testcontainers-dotnet | 34 | 0 | 1 | 1 | 3 | 2 |
| xunit | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | 463 | 72 | 22 | 30 | 339 | 73 |

**9b subprocess** (bucket `lib`)

| repo | ProcessStartInfo | Process.Start | .ArgumentList | .Arguments = | Redirect* | Kill(true) | WaitForExitAsync | Encoding.UTF8 | new UTF8Encoding(false) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| azure-sdk-for-net | 19 | 0 | 0 | 0 | 3 | 0 | 0 | 33 | 1 |
| Dapper | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| StyleCopAnalyzers | 0 | 0 | 144 | 0 | 0 | 0 | 0 | 9 | 0 |
| FluentValidation | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GitVersion | 3 | 1 | 1 | 0 | 5 | 0 | 0 | 13 | 0 |
| Humanizer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 19 | 0 |
| MessagePack-CSharp | 1 | 1 | 4 | 2 | 2 | 0 | 0 | 73 | 2 |
| PowerShell | 3 | 3 | 4 | 3 | 6 | 0 | 0 | 1 | 0 |
| StackExchange.Redis | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 81 | 0 |
| CliWrap | 5 | 0 | 0 | 0 | 3 | 1 | 1 | 0 | 0 |
| simple-exec | 6 | 1 | 3 | 0 | 3 | 0 | 1 | 0 | 0 |
| anthropic-sdk-csharp | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 33 | 0 |
| cake | 5 | 0 | 0 | 6 | 7 | 0 | 0 | 17 | 2 |
| coverlet | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 4 | 2 |
| BenchmarkDotNet | 17 | 7 | 29 | 2 | 19 | 0 | 2 | 10 | 0 |
| aspire | 0 | 0 | 5 | 0 | 3 | 1 | 1 | 8 | 0 |
| command-line-api | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 0 |
| roslynator | 2 | 6 | 140 | 0 | 0 | 0 | 0 | 13 | 0 |
| sourcelink | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| MedallionShell | 5 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Meziantou.Analyzer | 1 | 1 | 41 | 0 | 5 | 0 | 1 | 0 | 0 |
| testfx | 22 | 5 | 56 | 3 | 15 | 6 | 35 | 75 | 9 |
| vs-threading | 0 | 0 | 10 | 0 | 0 | 0 | 1 | 0 | 0 |
| nodatime | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| npgsql | 1 | 1 | 0 | 0 | 2 | 0 | 1 | 15 | 0 |
| nuke | 4 | 3 | 3 | 0 | 2 | 0 | 0 | 23 | 0 |
| octokit.net | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| openai-dotnet | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| pulumi-dotnet | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| serilog | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| spectre.console | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| testcontainers-dotnet | 1 | 1 | 0 | 1 | 2 | 0 | 0 | 2 | 0 |
| xunit | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 14 | 0 |
| **TOTAL** | 97 | 32 | 440 | 18 | 85 | 8 | 43 | 463 | 16 |

- `System.Text.Json` is used by 15 repos (463 references); Newtonsoft by 5 (72); source generation (`[JsonSerializable]`) in only 5 (GitVersion 5, BDN 8, testfx 7, azure 9, testcontainers 1; 30 attributes). The SDK wrappers here (anthropic 71 STJ references, openai 93, pulumi 47, aspire 25) use STJ with hand converters or `Utf8JsonReader` (openai 17, pulumi 13), not `JsonSerializerContext`. 12 repos set `IsAotCompatible`/`EnableTrimAnalyzer` but only 5 use `[JsonSerializable]`, so AOT-flagged does not imply source-generated JSON.
- Subprocess (`ProcessStartInfo` 97, `.ArgumentList` 440, string `.Arguments =` 18, `Kill(true|entireProcessTree)` 8, `WaitForExitAsync` 43). `ArgumentList` is the default except where `netstandard2.0` is a target: CliWrap targets ns2.0 and sets a pre-escaped string (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:408` `Arguments = Arguments`) consistent with `ProcessStartInfo.ArgumentList` not being part of `netstandard2.0` (inference, not stated in the repo); its tree kill is `process.Kill(entireProcessTree)` (`CliWrap/Utils/Extensions/ProcessExtensions.cs:48`). A net8+ only wrapper (simple-exec, net8-10) can use `ArgumentList`.

## 4. Tests

Commands: `python3 -I tables.py test tests` (bucket `test`, 11,188 files, 1,798.1 kLOC, of which testfx 747 kLOC).

**8 tests** (bucket `test`)

| repo | test files | test kLOC | [Fact] | [Theory] | [Test] | [TestMethod] | [TestCase] | [DataRow] | [InlineData] | Assert.That | xunit-style Assert.* | MSTest-style Assert.* | .Should() | Moq Mock<> | NSubstitute | FakeItEasy | test classes *Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polly | 323 | 49.1 | 2469 | 151 | 0 | 0 | 0 | 0 | 315 | 0 | 107 | 0 | 6625 | 0 | 76 | 0 | 256 |
| azure-sdk-for-net | 364 | 60.7 | 0 | 27 | 2293 | 0 | 1035 | 0 | 0 | 339 | 1083 | 5206 | 6 | 64 | 0 | 0 | 255 |
| Dapper | 92 | 11.7 | 379 | 10 | 0 | 0 | 0 | 0 | 40 | 0 | 1367 | 1 | 0 | 0 | 0 | 0 | 82 |
| StyleCopAnalyzers | 2674 | 84.0 | 3913 | 893 | 0 | 0 | 0 | 0 | 1566 | 0 | 2095 | 0 | 0 | 0 | 0 | 0 | 2658 |
| FluentValidation | 78 | 10.0 | 822 | 16 | 0 | 0 | 0 | 0 | 62 | 0 | 166 | 0 | 1123 | 0 | 0 | 0 | 31 |
| GitVersion | 285 | 82.0 | 0 | 6 | 953 | 0 | 36486 | 0 | 0 | 90 | 33 | 1 | 2443 | 0 | 78 | 0 | 133 |
| Humanizer | 299 | 75.3 | 1189 | 1374 | 0 | 0 | 0 | 0 | 7239 | 0 | 5448 | 0 | 0 | 0 | 0 | 0 | 276 |
| MessagePack-CSharp | 150 | 15.8 | 552 | 88 | 20 | 0 | 82 | 0 | 329 | 82 | 639 | 4 | 10 | 3 | 0 | 0 | 111 |
| StackExchange.Redis | 380 | 60.9 | 2405 | 520 | 0 | 0 | 0 | 0 | 2375 | 0 | 8654 | 29 | 8 | 0 | 12 | 0 | 270 |
| CliWrap | 27 | 1.9 | 102 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 211 | 0 | 0 | 0 | 12 |
| simple-exec | 9 | 0.5 | 28 | 13 | 0 | 0 | 0 | 0 | 29 | 0 | 63 | 0 | 0 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 63 | 23.2 | 905 | 50 | 0 | 0 | 0 | 0 | 169 | 0 | 2450 | 1 | 0 | 81 | 0 | 0 | 57 |
| cake | 718 | 77.5 | 4703 | 1163 | 0 | 0 | 0 | 0 | 3958 | 0 | 6025 | 0 | 0 | 0 | 1136 | 0 | 652 |
| coverlet | 165 | 25.4 | 630 | 75 | 0 | 0 | 0 | 0 | 319 | 0 | 1361 | 1 | 0 | 404 | 0 | 0 | 79 |
| BenchmarkDotNet | 307 | 34.1 | 1030 | 401 | 0 | 0 | 0 | 0 | 724 | 0 | 1776 | 6 | 228 | 0 | 0 | 0 | 239 |
| command-line-api | 82 | 14.5 | 700 | 83 | 0 | 0 | 0 | 0 | 274 | 0 | 4 | 0 | 1155 | 0 | 0 | 0 | 58 |
| roslynator | 427 | 29.4 | 3089 | 59 | 0 | 0 | 0 | 0 | 352 | 0 | 148 | 5 | 0 | 0 | 0 | 0 | 361 |
| sourcelink | 69 | 9.2 | 158 | 94 | 0 | 0 | 0 | 0 | 735 | 0 | 582 | 0 | 0 | 0 | 0 | 0 | 47 |
| MedallionShell | 11 | 1.8 | 0 | 0 | 79 | 0 | 15 | 0 | 0 | 1 | 38 | 7 | 171 | 1 | 0 | 0 | 10 |
| Meziantou.Analyzer | 198 | 39.3 | 3621 | 285 | 0 | 0 | 0 | 0 | 1518 | 0 | 50 | 1 | 0 | 0 | 0 | 0 | 202 |
| testfx | 2077 | 747.0 | 4 | 1 | 18 | 118330 | 3 | 2533 | 3 | 88 | 2167 | 120637 | 5570 | 1633 | 0 | 0 | 971 |
| vs-threading | 91 | 27.1 | 1450 | 81 | 0 | 0 | 0 | 0 | 38 | 0 | 2229 | 38 | 0 | 0 | 0 | 0 | 75 |
| nodatime | 225 | 24.6 | 0 | 0 | 1762 | 0 | 1335 | 0 | 0 | 36 | 588 | 2778 | 0 | 0 | 0 | 0 | 172 |
| npgsql | 136 | 34.7 | 18 | 9 | 1599 | 0 | 336 | 0 | 0 | 3969 | 232 | 61 | 3 | 0 | 0 | 0 | 97 |
| nuke | 58 | 3.8 | 142 | 44 | 0 | 0 | 0 | 0 | 229 | 0 | 3 | 0 | 366 | 0 | 0 | 0 | 37 |
| octokit.net | 529 | 87.8 | 3901 | 63 | 0 | 0 | 0 | 0 | 131 | 0 | 11061 | 0 | 4 | 0 | 3527 | 0 | 458 |
| openai-dotnet | 101 | 26.0 | 0 | 0 | 656 | 0 | 320 | 0 | 0 | 4084 | 98 | 48 | 0 | 38 | 0 | 0 | 77 |
| pulumi-dotnet | 215 | 16.2 | 410 | 34 | 9 | 1 | 0 | 0 | 105 | 0 | 1412 | 9 | 20 | 15 | 0 | 0 | 70 |
| serilog | 103 | 8.5 | 389 | 48 | 0 | 0 | 0 | 0 | 254 | 0 | 826 | 0 | 1 | 0 | 0 | 0 | 40 |
| spectre.console | 77 | 9.9 | 588 | 98 | 0 | 0 | 0 | 0 | 387 | 0 | 8 | 2 | 583 | 0 | 0 | 0 | 66 |
| stripe-dotnet | 159 | 15.1 | 677 | 7 | 0 | 0 | 0 | 0 | 37 | 0 | 2180 | 0 | 0 | 4 | 0 | 0 | 132 |
| testcontainers-dotnet | 246 | 12.7 | 365 | 93 | 0 | 0 | 0 | 0 | 328 | 0 | 764 | 0 | 0 | 2 | 0 | 0 | 243 |
| xunit | 450 | 78.4 | 3605 | 576 | 0 | 0 | 1 | 0 | 973 | 0 | 13348 | 35 | 7 | 19 | 92 | 0 | 623 |
| **TOTAL** | 11188 | 1798.1 | 38244 | 6362 | 7389 | 118331 | 39613 | 2533 | 22489 | 8689 | 67005 | 128870 | 18534 | 2264 | 4921 | 0 | 8850 |

Test method naming style (methods with [Fact]/[Theory]/[Test]/[TestMethod] attr, any bucket):
| repo | Method_Scenario_Expected (2+ _) | one underscore | Should* | When/Given* | PascalNoUnderscore |
| --- | --- | --- | --- | --- | --- |
| Polly | 2292 | 262 | 0 | 0 | 17 |
| azure-sdk-for-net | 227 | 440 | 3 | 0 | 1745 |
| Dapper | 60 | 99 | 0 | 0 | 260 |
| StyleCopAnalyzers | 21 | 28 | 0 | 0 | 4735 |
| FluentValidation | 811 | 23 | 0 | 0 | 3 |
| GitVersion | 107 | 70 | 109 | 72 | 1243 |
| Humanizer | 350 | 782 | 2 | 0 | 1427 |
| MessagePack-CSharp | 49 | 151 | 0 | 6 | 463 |
| StackExchange.Redis | 345 | 908 | 2 | 3 | 1655 |
| CliWrap | 110 | 0 | 0 | 0 | 0 |
| anthropic-sdk-csharp | 293 | 437 | 0 | 0 | 225 |
| cake | 5777 | 33 | 41 | 0 | 8 |
| coverlet | 146 | 111 | 0 | 23 | 424 |
| BenchmarkDotNet | 367 | 182 | 0 | 52 | 878 |
| command-line-api | 749 | 1 | 0 | 0 | 30 |
| roslynator | 1122 | 1797 | 0 | 0 | 196 |
| sourcelink | 37 | 129 | 0 | 1 | 77 |
| MedallionShell | 0 | 0 | 0 | 0 | 80 |
| Meziantou.Analyzer | 1659 | 1650 | 7 | 3 | 586 |
| testfx | 3926 | 2868 | 1 | 112 | 111408 |
| vs-threading | 195 | 408 | 2 | 17 | 909 |
| nodatime | 208 | 884 | 0 | 52 | 778 |
| npgsql | 1049 | 230 | 0 | 0 | 323 |
| nuke | 11 | 42 | 0 | 0 | 118 |
| octokit.net | 0 | 86 | 21 | 18 | 3838 |
| openai-dotnet | 121 | 152 | 0 | 0 | 557 |
| pulumi-dotnet | 21 | 46 | 0 | 0 | 385 |
| serilog | 3 | 0 | 2 | 19 | 409 |
| spectre.console | 684 | 2 | 0 | 0 | 0 |
| stripe-dotnet | 125 | 108 | 0 | 3 | 448 |
| testcontainers-dotnet | 11 | 0 | 25 | 23 | 399 |
| xunit | 64 | 167 | 1 | 6 | 1241 |
| **TOTAL** | 20940 | 12096 | 216 | 410 | 134865 |

Aggregates (per-repo dominant style), command `python3 -I derived.py` (reads out.json and config.json; its full output is reproduced in the numbers quoted here):
- **Framework**: xunit `[Fact]/[Theory]` in 26 of 33 test-bearing repos; NUnit in 6 (azure, GitVersion, MedallionShell, nodatime, npgsql, openai); MSTest in 1 (testfx, which tests itself).
- **Assertions** (dominant style per repo): xunit `Assert.*` 20 repos, FluentAssertions/Shouldly `.Should()` 8 (Polly 6,625, GitVersion 2,443, command-line-api 1,155, FluentValidation 1,123, spectre 583, CliWrap 211), NUnit constraint `Assert.That` 2 (npgsql 3,969, openai 4,084), classic `AreEqual` family 3 (azure, nodatime, testfx).
- **Mocking**: NSubstitute 4,921 (octokit 3,527, cake 1,136), Moq 2,264 (testfx 1,633, coverlet 404, anthropic 81). The FakeItEasy pattern `A.Fake<` has zero hits.
- **Naming** (excluding testfx's 111k generated-data methods): `Method_Scenario_Expected`-style (2+ underscores) 17,014; one underscore 9,228; PascalCase without underscore 23,457; `Should*` 215; `When/Given*` 298. Dominant per repo: Polly 2,292 two-underscore vs 17 Pascal; cake 5,777 vs 8; spectre 684 vs 0; StyleCop 4,735 Pascal vs 21; octokit 3,838 Pascal. Naming is repo-local, no fleet norm.
- **Placement**: test code is always in separate projects, never in-assembly. Layout of those projects (crude heuristic over `git ls-files '*.csproj'`): top-level `tests/` or `test/` directory in 18 repos, sibling under `src/` in 13, sibling at repo root in 3, nested deeper in 10 (repos can count in two).

## 5. Config and build strictness (feeds section 8)

Command: `python3 -I config.py > config.json` then `python3 -I score.py`. One point per signal: Nullable=enable, TreatWarningsAsErrors, AnalysisMode/AnalysisLevel set, EnforceCodeStyleInBuild, a quality analyzer package (Meziantou/Roslynator/StyleCop/Threading/Sonar/AsyncFixer/NetAnalyzers), PublicApiAnalyzers or PublicAPI files, BannedApiAnalyzers/BannedSymbols, >=10 `severity = error` or >=40 `severity = warning` in `.editorconfig`, EnablePackageValidation, GenerateDocumentationFile, AOT/trim analyzers. Presence in any file counts, so it is a ceiling, not an effective-setting audit.

```
10 testfx                   err=  0 warn=112 publicapi_lines= 2581 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; PublicApiAnalyzers or PublicAPI files; BannedApiAnalyzers/BannedSymbols; editorconfig severity=error >=10; GenerateDocumentationFile; AOT/trim analyzers
 8 Polly                    err=  0 warn=  0 publicapi_lines= 1725 | Nullable=enable; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; PublicApiAnalyzers or PublicAPI files; BannedApiAnalyzers/BannedSymbols; GenerateDocumentationFile; AOT/trim analyzers
 7 xunit                    err=  0 warn=104 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; EnforceCodeStyleInBuild; editorconfig severity=error >=10; GenerateDocumentationFile; AOT/trim analyzers
 7 vs-threading             err=  0 warn= 12 publicapi_lines=    0 | Nullable=enable; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; EnablePackageValidation; GenerateDocumentationFile; AOT/trim analyzers
 7 simple-exec              err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; PublicApiAnalyzers or PublicAPI files; GenerateDocumentationFile
 7 Humanizer                err= 62 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; EnforceCodeStyleInBuild; editorconfig severity=error >=10; GenerateDocumentationFile; AOT/trim analyzers
 6 npgsql                   err=  2 warn=  1 publicapi_lines= 2141 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; PublicApiAnalyzers or PublicAPI files; GenerateDocumentationFile; AOT/trim analyzers
 6 nodatime                 err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; analyzer pkg; EnablePackageValidation; GenerateDocumentationFile; AOT/trim analyzers
 6 coverlet                 err=  0 warn= 14 publicapi_lines=    0 | Nullable=enable; AnalysisMode/Level set; EnforceCodeStyleInBuild; BannedApiAnalyzers/BannedSymbols; EnablePackageValidation; GenerateDocumentationFile
 6 aspire                   err=  1 warn= 79 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; EnforceCodeStyleInBuild; PublicApiAnalyzers or PublicAPI files; editorconfig severity=error >=10; GenerateDocumentationFile
 6 MessagePack-CSharp       err=  0 warn=  8 publicapi_lines=    0 | Nullable=enable; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; BannedApiAnalyzers/BannedSymbols; GenerateDocumentationFile
 5 pulumi-dotnet            err=  0 warn=  0 publicapi_lines=  983 | Nullable=enable; TreatWarningsAsErrors; AnalysisMode/Level set; PublicApiAnalyzers or PublicAPI files; GenerateDocumentationFile
 5 StackExchange.Redis      err=  1 warn=  1 publicapi_lines= 3381 | Nullable=enable; TreatWarningsAsErrors; analyzer pkg; PublicApiAnalyzers or PublicAPI files; GenerateDocumentationFile
 5 GitVersion               err=  4 warn=  1 publicapi_lines= 1268 | Nullable=enable; AnalysisMode/Level set; EnforceCodeStyleInBuild; analyzer pkg; PublicApiAnalyzers or PublicAPI files
 4 stripe-dotnet            err=  1 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; EnablePackageValidation; GenerateDocumentationFile
 4 spectre.console          err=  0 warn=  9 publicapi_lines=    0 | Nullable=enable; analyzer pkg; GenerateDocumentationFile; AOT/trim analyzers
 4 openai-dotnet            err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; GenerateDocumentationFile; AOT/trim analyzers
 4 command-line-api         err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; GenerateDocumentationFile; AOT/trim analyzers
 4 cake                     err=  2 warn= 11 publicapi_lines=    0 | TreatWarningsAsErrors; AnalysisMode/Level set; EnforceCodeStyleInBuild; GenerateDocumentationFile
 4 StyleCopAnalyzers        err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; analyzer pkg; PublicApiAnalyzers or PublicAPI files
 4 Dapper                   err=  0 warn=  0 publicapi_lines=  413 | Nullable=enable; TreatWarningsAsErrors; PublicApiAnalyzers or PublicAPI files; GenerateDocumentationFile
 4 CliWrap                  err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; GenerateDocumentationFile; AOT/trim analyzers
 4 BenchmarkDotNet          err=  0 warn=  1 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; analyzer pkg; GenerateDocumentationFile
 3 testcontainers-dotnet    err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; GenerateDocumentationFile
 3 serilog                  err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; GenerateDocumentationFile; AOT/trim analyzers
 3 azure-sdk-for-net        err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; BannedApiAnalyzers/BannedSymbols
 3 anthropic-sdk-csharp     err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; GenerateDocumentationFile
 3 MedallionShell           err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; TreatWarningsAsErrors; analyzer pkg
 3 FluentValidation         err=  0 warn=  0 publicapi_lines=    0 | TreatWarningsAsErrors; EnablePackageValidation; GenerateDocumentationFile
 2 roslynator               err=  0 warn= 14 publicapi_lines=    0 | Nullable=enable; analyzer pkg
 2 octokit.net              err=  0 warn=  0 publicapi_lines=    0 | Nullable=enable; GenerateDocumentationFile
 2 Meziantou.Analyzer       err=  0 warn=  0 publicapi_lines=    0 | analyzer pkg; BannedApiAnalyzers/BannedSymbols
 1 sourcelink               err=  0 warn=  2 publicapi_lines=    0 | Nullable=enable
 1 nuke                     err=  0 warn=  0 publicapi_lines=    0 | GenerateDocumentationFile
 0 PowerShell               err=  0 warn=  0 publicapi_lines=    0 |
```

Counts across 35 repos: Nullable 30, TreatWarningsAsErrors 22, PublicAPI files 8, package validation 5, SourceLink package 18. `LangVersion` set explicitly (`python3 -I derived.py`): `latest` in 15 repos, `preview` in 7 (Humanizer, aspire, roslynator, sourcelink, Meziantou, testfx, nuke), `14` in 6 (StyleCop, Redis, BDN, vs-threading, spectre, xunit), `12` in 6, `13` in 4. **.NET 11 / C# 15 flags**: Humanizer targets `net11.0` first in its TFM list (`Humanizr__Humanizer@4574b93883bf:src/Humanizer/Humanizer.csproj:3`), BenchmarkDotNet and cake list `net11.0`, seven repos use `LangVersion preview`. No C# 15 syntax was counted; anything an agent writes from these repos' `preview` branches must be flagged as RC-era.

## 6. Shared and conflicting patterns (what to copy, what to cross-check)

Mostly consistent across repos that are active in 2026:
- file-scoped namespaces (72% of files), `Nullable` enabled in project properties (30/35), `cancellationToken` named and last (91.5% / 95.4%), `[LoggerMessage]` as the only source-gen logging form, `ArgumentList` for process args except under ns2.0, STJ over Newtonsoft (463 vs 72), `using` declarations over statements (58:42), repo-local exception root with `Exception` as direct base (53%).

Conflict between convention and enforcement:
- `ConfigureAwait(false)` (docs say "libraries"; in practice analyzer-driven, 0-100%).
- Sealing (docs and CA1852 say "seal internal, default seal public"; practice is 44%).
- `ThrowIfNull` (docs say prefer; practice is TFM-bound).

When docs and code disagree, the **build file wins**: every consistent behavior above is backed by a `dotnet_diagnostic.*` or `Directory.Build.props` line in the strict repos, and drifts in the repos without one.

## 7. Patterns an agent would get wrong (ranked by likelihood x cost)

1. **Writing `ArgumentNullException.ThrowIfNull` in code that targets `netstandard2.0`/`net462`.** Compile error without `Polyfill`; Polly rolls its own `Guard`, spectre adds `Polyfill`. Decide TFM first (section 9).
2. **Sealing nothing, or sealing everything.** Fleet norm is 44%; the strict core seals by default and enforces it with an analyzer (`CA1852` at `microsoft__testfx@7226b0c74729:.editorconfig:434-435`). For a new SDK, seal public classes by default and unseal on purpose (extension point), because adding `sealed` later is a breaking change in the other direction too.
3. **Putting `#nullable enable` per file** or leaving `#nullable disable` in place; the norm is the project property. 562 `disable` directives are migration debt, not style.
4. **Omitting `.ConfigureAwait(false)` in library code, or adding it in test and app code.** Library-bucket compliance is 82%; xunit deliberately omits it (2%). The .NET 8 `ConfigureAwaitOptions` form appears once in the whole corpus (Polly), so do not reach for it by default.
5. **Mis-positioning or mis-naming the token**: `ct`/`token`/`cancel`/`cancellation` (8.5% of parameters), token in the middle, or `CancellationToken cancellationToken = default` on internal methods (the default belongs on public overloads; concentrated there in openai and npgsql).
6. **`async void` anywhere but a true event handler.** Lib code has 11, all timers or local fire-and-forget; tests with `async void` are bugs.
7. **Reflexive full Dispose pattern** (finalizer + `Dispose(bool)`): 10 finalizers in 1,042 kLOC. Use it only with unmanaged resources; wrap handles in `SafeHandle` (3 uses) otherwise. Prefer `IAsyncDisposable` for anything holding a process or stream.
8. **Sync wrappers over async APIs by default.** SDK wrappers have 0-2 `GetAwaiter().GetResult()`; the 116 in npgsql exist because of an existing sync API contract.
9. **Records and primary constructors everywhere.** Records are 407 declarations vs 12,483 class declarations; positional records mostly in DTO-heavy code (Humanizer 96, testfx 123). Primary constructors are common for DI-style classes (1,130) but are not a replacement for fields; there are only 574 `required` members in the fleet.
10. **Dropping `ILogger` into a CLI-wrapper SDK.** None of the 10 comparable wrappers take a logger; instrumentation, when present, is `ActivitySource`.
11. **Treating generated-SDK style as house style** (open classes, `init` setters, `required`, mutable DTOs). Stripe, OpenAI and Anthropic generated trees have 1/0/269 sealed classes.
12. **Newtonsoft by default, or assuming STJ source generation is the norm.** 463 STJ vs 72 Newtonsoft references; only 5 repos use `[JsonSerializable]` (30 attributes), while 12 repos set AOT/trim flags. The closest SDK analogues (anthropic, openai, pulumi) hand-write converters or readers.
13. **`throw ex;`**: rare (13) and sometimes intentional; the agent mistake is the reverse, `catch (Exception) {}` (400 bare/swallowing catches) without a filter.

## 8. The five strictest repos and what makes them strict

Ranking is `score.py` (section 5) plus code evidence; tie at 7 broken by effective code strictness. simple-exec (7) is excluded as too small (0.6 kLOC) to carry weight, but its `Directory.Build.props` is a compact template: `AnalysisMode All` (:4), `EnforceCodeStyleInBuild` (:7), `Nullable` (:10), `TreatWarningsAsErrors` (:21), `Microsoft.VisualStudio.Threading.Analyzers` (:29).

1. **microsoft/testfx** (score 10): `AnalysisLevel preview-recommended` + `EnforceCodeStyleInBuild` (`eng/Analyzers.props:6-7`), `Nullable` (`Directory.Build.props:20`), PublicApiAnalyzers and BannedApiAnalyzers pinned (`Directory.Packages.props:35-36`), 82 `PublicAPI.*.txt` files, 40 `BannedSymbols.txt` files, 112 `severity = warning` overrides, `CA1852` seal-internal and `CA2007` as warnings (`.editorconfig:434-435, 446`). Code result: 90% of public classes sealed, 97% ConfigureAwait.
2. **App-vNext/Polly** (8): `PublicAPI.Shipped/Unshipped.txt` across 10 files (1,725 lines), `BannedSymbols.txt`, `AnalysisLevel latest` + `EnforceCodeStyleInBuild` (`eng/Analyzers.targets:16-17`), `PublicApiAnalyzers` wired for every library (`eng/Library.targets:51`), AOT-compat in 3 projects, StyleCop and Sonar analyzers. No `TreatWarningsAsErrors` anywhere in the repo (`git -C App-vNext__Polly grep -nE 'TreatWarningsAsErrors|WarningsAsErrors|warnaserror'` returns nothing), so enforcement is review and CI, not props. Its code is still 84% unsealed (v7-era API), proving that strict *tooling* and strict *shape* are separate.
3. **xunit/xunit** (7): `TreatWarningsAsErrors` (`src/Directory.Build.props:33`), `AnalysisLevel latest-All` (:61), `EnforceCodeStyleInBuild` (:68), `Nullable` (:72), 104 `severity = warning` lines. Custom `Guard.*` helpers (1,650 call sites) instead of framework throw helpers; it multi-targets netstandard2.0/net472 (`xunit.v3.core.csproj:7`), which is the likely reason.
4. **microsoft/vs-threading** (7): the owner of `Microsoft.VisualStudio.Threading.Analyzers` (7 projects reference it), `EnablePackageValidation` (`Directory.Build.props:21`), `AnalysisLevel latest`, `EnforceCodeStyleInBuild`, `Nullable`. Code: `Requires.NotNull` 240 call sites; 12 `.GetAwaiter().GetResult()` in a library whose subject is avoiding exactly that.
5. **Humanizr/Humanizer** (7): `TreatWarningsAsErrors` (`Directory.Build.props:8`), `AnalysisLevel latest` + `AnalysisMode Minimum` (:18-19), `EnforceCodeStyleInBuild` (:17), 62 `dotnet_diagnostic.*.severity = error` lines (`.editorconfig:176-179` CA1001, CA1009, CA1016, CA1033, ...), AOT/trim analyzers, `net11.0` in the TFM list.

Code-level strict (independent of build files): Meziantou.Analyzer (97% sealed, 98% ConfigureAwait), spectre.console (97% sealed, 438 ThrowIfNull), testcontainers (95% sealed, `[LoggerMessage]`, all 14 exceptions sealed).

## 9. The netstandard2.0 question (measured input, not a decision)

Commands: `python3 -I derived.py` (counts) and, per library, `git -C <repo> grep -nE '<TargetFramework|ClientTargetFrameworks' -- <main csproj> Directory.Build.props`.

- 28 of 35 repos list `netstandard2.0` in some project (`python3 -I derived.py`); 22 list a .NET Framework TFM (`net4x`/`net35`). Many are analyzer, MSBuild or test-host packages where ns2.0 is mandatory (StyleCop, Meziantou, roslynator, sourcelink, coverlet, testfx, GitVersion, cake, nuke, BenchmarkDotNet, command-line-api), so that count alone overstates the library case. The hand check below covers 17 client or runtime libraries' main package.
- With `netstandard2.0` in the main package (13): Polly.Core (`net8.0;net6.0;netstandard2.0;net472;net462`, `Polly.Core.csproj:4`), OpenAI (`net10.0;net8.0;netstandard2.0`, `Directory.Build.props:7`), Stripe (`...;netstandard2.0;net462`, `Stripe.net.csproj:14`), Redis (`net461;netstandard2.0;net472;net8.0;net10.0`), Dapper (`net461;netstandard2.0;net8.0;net10.0`, `Dapper.csproj:8`), CliWrap (`netstandard2.0;netstandard2.1;net6.0;net7.0;net10.0`, `CliWrap.csproj:3`), Testcontainers (`...netstandard2.0;netstandard2.1`, `Testcontainers.csproj:3`), NodaTime (`netstandard2.0;net8.0`, `NodaTime.csproj:6`), Serilog (`Serilog.csproj:12`), Octokit (`netstandard2.0` only, `Octokit.csproj:9`), MedallionShell, Anthropic (`net8.0;net9.0;netstandard2.0`, `src/Directory.Build.props:28`), Humanizer (`net11.0;net10.0;net8.0;net48;netstandard2.0`).
- Without (4): FluentValidation (`net8.0`, `src/FluentValidation/FluentValidation.csproj:3`), Npgsql (`net10.0`, `src/Npgsql/Npgsql.csproj:8`), Pulumi and Pulumi.Automation (the CLI-wrapper analogue, `net6.0`, `sdk/Pulumi/Pulumi.csproj:4`), simple-exec (`net8.0;net9.0;net10.0`).
- Consequences visible in code: ns2.0 forces a polyfill (`Polyfill` package in spectre; hand `Guard` in Polly/xunit), blocks `ProcessStartInfo.ArgumentList` (CliWrap's own escaper), and removes `ThrowIfNull`/`required`/`init` unless polyfilled. The closest analogues to the ocx wrapper split: CliWrap (ns2.0 + escaping), simple-exec (net8+, ArgumentList), pulumi-dotnet (net6 only, CLI wrapper).

## 10. What was not measured

- Effective analyzer severity after `.globalconfig` and package defaults (score.py counts presence).
- Doc-comment shape (`///` coverage) and `[Obsolete]` messages; not part of this axis.
- Semantic accessibility (a `public` nested type inside an `internal` type counts as public).
- Exemplar `tests/` snapshot or approval-test usage (`Verify(`) is in the table but unexplored; testing patterns for subprocess cancellation belong to another axis.
