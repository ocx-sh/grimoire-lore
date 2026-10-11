---
title: "Performance in general C#: the CA18xx gate, the allocation idioms agents get wrong, and the BenchmarkDotNet procedure"
topic: csharp-performance / csharp-performance-allocation-and-analyzers
agent: deep-dive researcher (sonnet subagent, research-lang csharp, wave 3)
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 23
scope: |
  Covers: the 64 CA18xx rules in the SDK 10.0.401 `10.0-all` severity file (which tier enables each, which fire on planted defects, which fire on five real exemplar libraries); the three deviations the posture needs (CA1822 api_surface, CA1867, SYSLIB1045) and the gaps no analyzer closes; allocation idioms (strings, LINQ, Frozen collections, boxing, Enum, exceptions, Regex, stackalloc, ArrayPool) with BenchmarkDotNet numbers; the BenchmarkDotNet procedure, its failure modes (Debug refusal exits 0, test projects, Configuration trap) and whether an I/O-bound SDK should carry a benchmarks project.
  Does not cover: JIT/PGO tuning, GC settings, async/ValueTask costs (CS-ASYNC), JSON converter performance (CS-JSON), AOT/trim size (csharp-procedures), Windows/macOS timing. All timings were taken on WSL2 (Linux x64, i9-13900KS, .NET 10.0.12): treat them as relative comparisons; allocated bytes are exact. Nothing was run on .NET 11 RC1 beyond reading its severity file.
---

# Performance in general C#: the CA18xx gate, the allocation idioms agents get wrong, and the BenchmarkDotNet procedure

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-performance-allocation-and-analyzers/` (cited as `$FIX`). Tool wrapper: `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. Exemplar citation form: `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`. Rule IDs CS-BUILD, CS-ASYNC, CS-XP, CS-API refer to the earlier waves and are not re-decided here.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The CA18xx set at 10.0-all, tier by tier](#1-the-ca18xx-set-at-100-all-tier-by-tier)
   2. [What fires on real code, and how noisy](#2-what-fires-on-real-code-and-how-noisy)
   3. [The three deviations and the four gaps](#3-the-three-deviations-and-the-four-gaps)
   4. [Strings: concatenation, interpolation, StringBuilder, case comparison, hex](#4-strings-concatenation-interpolation-stringbuilder-case-comparison-hex)
   5. [Collections and LINQ: hot loops, the ToList reflex, Frozen collections, Any versus Count](#5-collections-and-linq-hot-loops-the-tolist-reflex-frozen-collections-any-versus-count)
   6. [Boxing: params object[], structs through interfaces, Enum](#6-boxing-params-object-structs-through-interfaces-enum)
   7. [Exceptions as control flow and per-call Regex](#7-exceptions-as-control-flow-and-per-call-regex)
   8. [Spans, stackalloc and ArrayPool](#8-spans-stackalloc-and-arraypool)
   9. [BenchmarkDotNet: what agents get wrong](#9-benchmarkdotnet-what-agents-get-wrong)
   10. [Should an I/O-bound SDK carry a benchmarks project?](#10-should-an-io-bound-sdk-carry-a-benchmarks-project)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- `AnalysisLevel` `10.0-all` already sets all 64 CA18xx rules to `warning` (Minimum 47, Recommended 52, All 64), so under CS-BUILD's unconditional TWAE they are errors with no per-rule lines ([SDK severity files](#1-the-ca18xx-set-at-100-all-tier-by-tier), measured). Do not re-list them in `.globalconfig`; list only deviations.
- CA1851 (multiple enumeration) is documented "Enabled by default in .NET 10: No" ([MS Learn](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851)) but is `warning` at All and absent at Recommended and below (`analysislevel_10_all.globalconfig:363`; zero CA1851 lines in the recommended file). It fires under the pinned gate.
- Exactly three deviations are needed: `dotnet_code_quality.CA1822.api_surface = private, internal` (a shipped public instance member made `static` is a breaking change), `CA1867.severity = none` (no code fix, ignore-case semantics), and `SYSLIB1045.severity = warning` (it is Info and silent otherwise; it is not a CA rule and no `AnalysisLevel` touches it). Measured: CA1822 2 errors to 1, CA1867 1 to 0, SYSLIB1045 absent to present.
- Four gaps stay silent under the full gate and need an `rg` check: LINQ/closures inside loops, `+=` on a string in a loop, `ArrayPool` double return or use-after-return, and exceptions as control flow. Two further holes hide inside rules that exist: CA1861 ignores collection expressions (`Has(["a","b"], s)` in a loop passes; `new[] {...}` fails), and SYSLIB1045 goes silent when a non-constant `TimeSpan` timeout is passed. Meziantou `MA0110` closes the second (measured, under `MeziantouAnalysisMode=None`).
- Interpolation beats `StringBuilder` for 2 to 4 parts: 38.0 ns / 72 B versus 74.4 ns / 280 B (4 string parts), 12.7 ns versus 36.2 ns (2 parts). The agent claim "StringBuilder is faster for small joins" is refuted. `StringBuilder` or `string.Join` wins only in loops: 1.4 µs / 7.7 KB versus 50.7 µs / 585 KB for 200 `+=` appends.
- `FrozenDictionary` is not a free upgrade: with 8 string keys a miss is 4.5x faster (1.03 versus 4.65 ns) and a hit 1.3x faster, but with 1000 keys a hit is a tie (7.44 versus 7.66 ns) and a miss is 1.4x slower (5.46 versus 3.80 ns); construction costs 6 to 7x a `Dictionary` and 2.9x the memory (667 ns versus 94 ns at 8 keys). Break-even at 8 keys is about 360 hits.
- `Any()` versus `Count > 0` on a `List<T>`: 0.90 versus 0.43 ns, both 0 B. The 2x ratio is real and the 0.47 ns absolute is below any budget. Gate CA1860 for clarity, never as a performance claim.
- `Enum.HasFlag` is a JIT intrinsic on .NET 10 (0.37 ns, 0 B, same as the bit mask); rewriting it is a .NET Framework reflex. `Enum.ToString()` really allocates (30 ns, 72 B). A struct passed to an interface parameter does not allocate when the callee inlines (0 B) and does when it cannot (24 B); a constrained generic never does.
- Per-call `new Regex(...)` costs 836 ns / 2232 B; the static `Regex.IsMatch` cache 46 ns / 0 B; `[GeneratedRegex]` 21 ns / 0 B. Exceptions as control flow: 2.3 µs / 512 B versus 4.2 ns for `TryParse` (556x).
- `stackalloc` in a loop is CA2014 (error under the gate, measured). Unbounded `stackalloc byte[n]`, double `ArrayPool.Return` and use-after-return have no analyzer; the MS docs call the last two "a high-severity security issue" ([ArrayPool.Return](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return)). Use the exemplar shape: a constant cap, `try`/`finally`, one `Return` ([StackExchange.Redis RespReader.cs:808-816](https://github.com/StackExchange/StackExchange.Redis)).
- BenchmarkDotNet exits 0 when it refuses a Debug build, and also when it cannot build its generated project. A benchmark placed in an xUnit v3 test project "passes" in 0.43 s under Debug with no measurement, and takes 146 s under Release. CI must assert that a report file exists, not that the exit code is 0.
- `<Configuration>Release</Configuration>` in the csproj does not make BDN accept the build: `Optimize` stays `false` (measured; BDN printed "non-optimized"). `-c Release` is the only reliable switch; `Optimize=true` alongside fixes the csproj-only route.
- A benchmark project compiled under the library gate fails with CA1050, CA1051, CA1515 and CS1591 on a minimal class (measured). It lives outside `src/`, with its own `Directory.Build.props`, `IsPackable=false`, and is not part of the required CI check.
- For an I/O-bound SDK: decoding a small ocx JSON report takes 0.56 µs; spawning a trivial child process takes 822 µs (1465x). No SDK-glue optimization can be seen next to the process, so no benchmarks project ships by default; it is created on the first performance claim and deleted or kept as a dormant tool afterwards.
- A performance claim (time or allocation) in a commit, PR or comment needs a BDN table: Release, `[MemoryDiagnoser]`, baseline marked, `Mean`, `Error`, `Ratio`, `Allocated`. Accept a time claim only when the effect exceeds 20% and the Error intervals do not overlap; accept an allocation claim at any size because `Allocated` is deterministic even on noisy WSL.
- New in SDK 11 RC1 at `11-all`: CA1876 (do not use `AsParallel` in `foreach`) and CA1877 (collapse consecutive `Path.Combine`/`Path.Join`) at `warning`. The pin to `10.0-all` keeps them out; they are the only CA18xx additions between 10 and 11 RC1 (66 versus 64 lines).

## Findings

### 1. The CA18xx set at 10.0-all, tier by tier

Counted from the SDK's own files in `/home/mherwig/.cache/research-lang/dotnet-tools/dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/analyzers/build/config/`:

| Level file | CA18xx lines at `warning` | Notes |
|---|---|---|
| `analysislevel_10_default.globalconfig` | 0 | only `CA1516 = none`; every perf rule is "As suggestion" (IDE-only, invisible in `dotnet build`) |
| `analysislevel_10_minimum.globalconfig` | 47 | |
| `analysislevel_10_recommended.globalconfig` | 52 | Minimum plus exactly CA1805, CA1838, CA1848, CA1852, CA1863 |
| `analysislevel_10_all.globalconfig` | 64 | Recommended plus CA1802, CA1810, CA1812, CA1813, CA1814, CA1815, CA1819, CA1820, CA1823, CA1849, CA1851, CA1867 |
| `analysislevel_11_all.globalconfig` (SDK 11.0.100-rc.1) | 66 | adds CA1876, CA1877 |

The twelve All-only rules are the ones that do not appear at Recommended; CA1851 and CA1867 are documented as disabled by default and are still `warning` at All (`analysislevel_10_all.globalconfig:363` and `:408`). Under the CS-BUILD pin (`<AnalysisLevel>10.0-all</AnalysisLevel>`, `TreatWarningsAsErrors=true`) all 64 are build errors; the gate needs no CA18xx line at all except the deviations in section 3. Last two columns of the table below: "sweep" = fired in `$FIX/sweep` (net10.0; planted defects, one per rule) and "real hits" = unique locations across Serilog, Spectre.Console, CliWrap and the Anthropic C# SDK (section 2).

| Rule | Title | Lowest tier | Sweep | Real hits |
|---|---|---|---|---|
| CA1802 | Use literals where appropriate | all | Y | 0 |
| CA1805 | Do not initialize unnecessarily | rec | Y | 683 |
| CA1806 | Do not ignore method results | min | not planted | 0 |
| CA1810 | Initialize reference type static fields inline | all | Y | 2 |
| CA1812 | Avoid uninstantiated internal classes | all | Y | 0 |
| CA1813 | Avoid unsealed attributes | all | Y | 0 |
| CA1814 | Prefer jagged arrays over multidimensional | all | Y | 0 |
| CA1815 | Override equals and operator equals on value types | all | Y | 4 |
| CA1816 | Dispose methods should call SuppressFinalize | min | not planted | 1 |
| CA1819 | Properties should not return arrays | all | Y | 0 |
| CA1820 | Test for empty strings using string length | all | Y | 5 |
| CA1821 | Remove empty Finalizers | min | not planted | 0 |
| CA1822 | Mark members as static | min | Y | 2 |
| CA1823 | Avoid unused private fields | all | Y | 0 |
| CA1824 | Mark assemblies with NeutralResourcesLanguageAttribute | min | not planted | 0 |
| CA1825 | Avoid zero-length array allocations | min | Y | 0 |
| CA1826 | Do not use Enumerable methods on indexable collections | min | Y | 0 |
| CA1827 | Do not use Count() or LongCount() when Any() can be used | min | Y | 0 |
| CA1828 | Do not use CountAsync() or LongCountAsync() when AnyAsync() ca | min | not planted | 0 |
| CA1829 | Use Length/Count property instead of Count() when available | min | Y | 0 |
| CA1830 | Prefer strongly-typed Append and Insert method overloads on St | min | Y | 0 |
| CA1832 | Use AsSpan or AsMemory instead of Range-based indexers when ap | min | Y | 0 |
| CA1833 | Use AsSpan or AsMemory instead of Range-based indexers when ap | min | Y | 0 |
| CA1834 | Consider using 'StringBuilder.Append(char)' when applicable | min | Y | 0 |
| CA1835 | Prefer the 'Memory'-based overloads for 'ReadAsync' and 'Write | min | Y | 0 |
| CA1836 | Prefer IsEmpty over Count | min | Y | 0 |
| CA1837 | Use 'Environment.ProcessId' | min | Y | 0 |
| CA1838 | Avoid 'StringBuilder' parameters for P/Invokes | rec | not planted | 0 |
| CA1839 | Use 'Environment.ProcessPath' | min | not planted | 0 |
| CA1840 | Use 'Environment.CurrentManagedThreadId' | min | Y | 0 |
| CA1841 | Prefer Dictionary.Contains methods | min | Y | 0 |
| CA1842 | Do not use 'WhenAll' with a single task | min | net8 only | 0 |
| CA1843 | Do not use 'WaitAll' with a single task | min | net8 only | 0 |
| CA1844 | Provide memory-based overrides of async methods when subclassi | min | not planted | 0 |
| CA1845 | Use span-based 'string.Concat' | min | Y | 1 |
| CA1846 | Prefer 'AsSpan' over 'Substring' | min | Y | 0 |
| CA1847 | Use char literal for a single character lookup | min | Y | 1 |
| CA1848 | Use the LoggerMessage delegates | rec | Y | 0 |
| CA1849 | Call async methods when in an async method | all | Y | 3 |
| CA1850 | Prefer static 'HashData' method over 'ComputeHash' | min | Y | 0 |
| CA1851 | Possible multiple enumerations of 'IEnumerable' collection | all | Y | 8 |
| CA1852 | Seal internal types | rec | Y | 6 |
| CA1853 | Unnecessary call to 'Dictionary.ContainsKey(key)' | min | Y | 0 |
| CA1854 | Prefer the 'IDictionary.TryGetValue(TKey, out TValue)' method | min | Y | 0 |
| CA1855 | Prefer 'Clear' over 'Fill' | min | Y | 0 |
| CA1856 | Incorrect usage of ConstantExpected attribute | min | not planted | 0 |
| CA1858 | Use 'StartsWith' instead of 'IndexOf' | min | Y | 0 |
| CA1859 | Use concrete types when possible for improved performance | min | Y | 12 |
| CA1860 | Avoid using 'Enumerable.Any()' extension method | min | Y | 5 |
| CA1861 | Avoid constant arrays as arguments | min | Y | 2 |
| CA1862 | Use the 'StringComparison' method overloads to perform case-in | min | Y | 0 |
| CA1863 | Use 'CompositeFormat' | rec | Y | 0 |
| CA1864 | Prefer the 'IDictionary.TryAdd(TKey, TValue)' method | min | Y | 0 |
| CA1865 | Use char overload | min | Y | 2 |
| CA1866 | Use char overload | min | Y | 1 |
| CA1867 | Use char overload | all | Y | 3 |
| CA1868 | Unnecessary call to 'Contains(item)' | min | Y | 0 |
| CA1869 | Cache and reuse 'JsonSerializerOptions' instances | min | Y | 0 |
| CA1870 | Use a cached 'SearchValues' instance | min | Y | 0 |
| CA1871 | Do not pass a nullable struct to 'ArgumentNullException.ThrowI | min | Y | 0 |
| CA1872 | Prefer 'Convert.ToHexString' and 'Convert.ToHexStringLower' ov | min | Y | 0 |
| CA1873 | Avoid potentially expensive logging | min | Y | 0 |
| CA1874 | Use 'Regex.IsMatch' | min | Y | 0 |
| CA1875 | Use 'Regex.Count' | min | Y | 0 |

53 of the 64 fired in the net10.0 sweep; 11 did not (the table marks them). CA1816 still produced one real hit (CliWrap). Nine were not planted (CA1806, CA1816, CA1821, CA1824, CA1828, CA1838, CA1839, CA1844, CA1856: each needs a context the probe lacks, such as a P/Invoke, a resource assembly or a `Stream` subclass). CA1842 and CA1843 are different: they fired on the **net8.0** sweep (`Task.WhenAll(t)` with the `params Task[]` overload) and are silent on net10.0, where `Task.WhenAll` gained a `params ReadOnlySpan<Task>` overload (`$FIX/sweep8/out_sweep_8all.txt` versus `$FIX/sweep/out_sweep_10all_final.txt`). On the net8.0;net10.0 matrix the same source gets a different verdict per leg; on net10.0 the analyzer is effectively dead for the single-task case.

Per-rule facts the table cannot show, each measured in `$FIX/sweep` unless a source is named:

- **CA1826** (use indexer/property) only inspects `IReadOnlyList<T>` implementers that are not `IList<T>`; `List<T>.First()` passes ([CA1826](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1826): "analyzes collection types that implement IReadOnlyList<T> but not IList<T>"). It fired on `IReadOnlyList<int>.First()/Last()/Count()` only.
- **CA1859** (use concrete types) fires for locals, fields and private/internal members, not for public signatures: `private static IList<int> Build() => new List<int>()` fired, `public int Idx3(IList<int> a)` did not ([CA1859](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1859)).
- **CA1862** fired on `a.ToLower() == b.ToLower()` (message: "Prefer using 'string.Equals(string, StringComparison)' ... case-insensitive comparison"), alongside CA1304 and CA1311. It did not fire on `a.ToLowerInvariant().Equals(b.ToLowerInvariant())`; CA1307 and CA1309 did (`$FIX/out_red_final.txt`, `$FIX/sweep/out_sweep_10all_final.txt`).
- **CA1863** fires only when the format string is a `static` field or constant that is not a `CompositeFormat`; `string.Format("{0} items", a)` with a literal passed. Documented "Enabled by default in .NET 10: No" ([CA1863](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1863)) and `warning` at Recommended.
- **CA1865/1866/1867** are one family: CA1865 = a safe automatic transformation (code fix), CA1866 = no comparison specified, CA1867 = every other comparison; CA1865 and CA1866 are suggestions by default, CA1867 is off by default ([CA1865-CA1867](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1865-ca1867)). Measured: `StartsWith("(", StringComparison.OrdinalIgnoreCase)` is CA1867 in Spectre.Console (`spectreconsole__spectre.console@0de183140529:src/Spectre.Console.Ansi/AnsiMarkupTagParser.cs:73,198,199`) with no code fix.
- **CA1870** ignores up to five values ("The rule doesn't flag calls that use up to five values, as those already use an optimal implementation", [CA1870](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1870)). It fired on a `static readonly char[]` with six values passed to `IndexOfAny`; the fix is a `static readonly SearchValues<char>`. Measured: 19.4 ns versus 7.4 ns (0.38x) for an 8-value set over a 201-char span.
- **CA1872** names `Convert.ToHexStringLower` (a .NET 9 API) on net10.0 and `Convert.ToHexString` on net8.0 (`H.cs(5,45)` message in `$FIX/net8probe`). Following the net10 suggestion on a net8.0 leg gives `CS0117: 'Convert' does not contain a definition for 'ToHexStringLower'`. On net8.0 `dotnet format analyzers --diagnostics CA1872 --severity info` rewrote the chain to `Convert.ToHexString(b).ToLowerInvariant()`, which is the correct floor form.
- **CA1873** (avoid potentially expensive logging) and **CA1848** (use `LoggerMessage`) fired on `ILogger.LogInformation($"...")`; they matter only when `Microsoft.Extensions.Logging` enters the SDK. CS-OBS owns that decision; the gate already covers it if it happens.
- **CA1849** (call async methods in an async method) is the CS-ASYNC gate (CA1849 explicit severity); not re-decided.
- **CA2014** (do not use `stackalloc` in loops) is a Reliability rule, not CA18xx, and is `warning` at All: it fired on `for (...) { Span<byte> b = stackalloc byte[64]; }` (`$FIX/out_red_final.txt` `Defects.cs(82,54)`).

### 2. What fires on real code, and how noisy

Method: copy each exemplar tree (no `.git`) under `$FIX/noise/<tag>/`, replace its `global.json` with the 10.0.401 pin, then `dotnet build <project> -f <tfm> --no-incremental -p:AnalysisLevel=10.0-all -p:TreatWarningsAsErrors=false -p:WarningsAsErrors= -p:EnableNETAnalyzers=true -p:SignAssembly=false` (`$FIX/noise/run_noise.sh`). Counts are unique file/line/column locations, excluding NuGet content files and `obj/`:

| Project (sha12) | CA18xx unique hits | Top rules | Reading |
|---|---|---|---|
| Serilog `serilog__serilog@bebc7719004f` `src/Serilog` | 12 | CA1860 3, CA1859 2, CA1820 2, CA1847, CA1845, CA1822, CA1815, CA1805 1 each | all mechanical single-line fixes; CA1860 sites are `_filters.Any()` on `List<T>` (`LoggerConfiguration.cs:137,145`) |
| Spectre.Console `spectreconsole__spectre.console@0de183140529` `src/Spectre.Console` | 33 | CA1859 10, CA1851 8, CA1867 3, CA1805 3, CA1865 2, CA1860 2, CA1815 2 | CA1851 at `Internal/Ratio.cs:35,53` is a genuine double enumeration of the same `IEnumerable` parameter; at `Extensions/Bcl/EnumerableExtensions.cs:23` (`Repeat`) re-enumeration is the method's purpose, so a per-site `#pragma` is the right answer |
| CliWrap `Tyrrrz__CliWrap@7dbc252fa773` `CliWrap/CliWrap.csproj` | 8 | CA1852 6, CA1861 1, CA1816 1 | 55 more CA1852 and 40 CA1813 came from PolyShim-injected content files (`nuget-packages/polyshim/...`): a netstandard2.0 polyfill source package makes the analyzers lint vendored code |
| Anthropic C# SDK `anthropics__anthropic-sdk-csharp@ae16e5933f39` `src/Anthropic` (net8.0) | 688 | CA1805 679, CA1849 3, CA1820 3, CA1810 2, CA1815 1 | CA1805 is `public CancellationToken CancellationToken { get; init; } = default;` (`Core/HttpResponse.cs:35`) repeated across generated models; 4,474 CA diagnostics of all categories on this tree |
| simple-exec `adamralph__simple-exec@f80913246993` | 0 | | the repo already sets `AnalysisMode` All (`Directory.Build.props:4`) and suppresses per site |
| Polly.Core `App-vNext__Polly@e4476096da5b` (net8.0) | 0 | | 0 CA diagnostics of any id; Polly's own configuration was not investigated |

Conclusions: (0) CliWrap's compile finished and the diagnostics above were emitted; the build then failed in a post-compile `Binternal` task (OpenSSL signing error on this host), which does not affect the counts. (1) On hand-written library code the full CA18xx set is quiet: 8 to 33 hits per 3k to 50k lines, each fixable in one line. (2) CA1805 is the one rule that is noisy on model-heavy or generated code; for a hand-written SDK keep it, because agents write `= null;`, `= 0;`, `= default;` reflexively and the fix is deleting the initializer. For generated code mark the file `// <auto-generated>` or `generated_code = true` in `.editorconfig`. (3) A polyfill package that ships `contentFiles/*.cs` (PolyShim, PolySharp) is linted like first-party code; CS-BUILD already records the netstandard2.0 polyfill facts and this is the cost: add `[**/PolyShim/**.cs] generated_code = true` if the netstandard leg is ever added (not measured here beyond the CliWrap count). (4) The large exemplars gate narrower sets: Humanizer `AnalysisMode` Minimum with `CA1821` raised to error (`Humanizr__Humanizer@4574b93883bf:Directory.Build.props:18`, `.editorconfig:193`), Npgsql `AnalysisLevel` `latest` plus `CA2016` as error (`npgsql__npgsql@9c47244547c2:Directory.Build.props:7`, `.editorconfig:64`), StackExchange.Redis `CA1852` as warning (`StackExchange__StackExchange.Redis@e7c43a269f53:.editorconfig:143`). None gates all 64; for large existing code bases that is a legacy accommodation, and simple-exec shows the full set is livable on a small library (0 hits, `adamralph__simple-exec@f80913246993:Directory.Build.props:4`).

### 3. The three deviations and the four gaps

**Deviation 1: CA1822 `api_surface`.** `Mark members as static` is "Breaking - If you change the member from an instance member to a static member and it is visible outside the assembly" ([CA1822](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1822)), and it sits at `warning` for the public surface too. For a library with a SemVer contract, restrict it: `dotnet_code_quality.CA1822.api_surface = private, internal`. Measured on `$FIX/posture`: before the line CA1822 fired on `public int PublicInstance()` and `internal int InternalInstance()` (2 errors); after, only on the internal one (1 error) (`out_posture_before.txt`, `out_posture_after.txt`).

**Deviation 2: CA1867 off.** `string.StartsWith("(", StringComparison.OrdinalIgnoreCase)` is flagged with no fix; `StartsWith('(')` is ordinal and case-sensitive, so for letters the swap changes behavior and for symbols it is a micro-gain. Microsoft ships it disabled. Measured: `$FIX/posture` `Paren(...)` 1 error before, 0 after.

**Deviation 3: SYSLIB1045 to warning.** `Use GeneratedRegexAttribute` is emitted by the regex source generator that ships with the shared framework, defaults to Info ([SYSLIB1040-1049](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1040-1049)), and does not appear in any `analysislevel_*.globalconfig`. Measured: the red file has 17 errors without the line and 18 with `dotnet_diagnostic.SYSLIB1045.severity = warning` (`out_red_posture0b.txt` versus `out_red_posture1.txt`). It fires for `Regex.IsMatch/Replace/Split/Match` static calls, `new Regex(literal)` and a `static readonly Regex F = new(literal)` field (`$FIX/regex-probe`, 6 of 8 shapes).

**Gap A: SYSLIB1045 does not see a non-constant timeout.** `Regex.IsMatch(s, @"^\d+$", RegexOptions.None, TimeSpan.FromSeconds(1))` and `new Regex(p, RegexOptions.None, TimeSpan.FromSeconds(1))` did not fire (2 of 8 shapes in `$FIX/regex-probe`). That is the exact shape an agent produces after being told "add a timeout against ReDoS". `[GeneratedRegex(pattern, options, matchTimeoutMilliseconds: 1000)]` takes a constant. Meziantou `MA0110` (Use the Regex source generator, README row `meziantou__Meziantou.Analyzer@161b7e948ad3:README.md:142`) does fire on the timeout form (`Defects.cs(54,9)` in `$FIX/mez-probe`), and it works under the CS-API/CS-XP setup `MeziantouAnalysisMode=None` plus `dotnet_diagnostic.MA0110.severity = warning`: red `R.cs(7,49): error MA0110`, green (line removed) 0 errors (`$FIX/mez-gate`). Without Meziantou use the `rg` check in rule PERF-04.

**Gap B: CA1861 does not see collection expressions.** `Has(new[] { "a", "b", "c" }, s)` in a loop is CA1861 (`Defects.cs(32,47)`); `Has(["a", "b", "c"], s)` in a loop is silent (`Defects.cs(38)`). The analyzer registers only `OperationKind.ArrayCreation` and `OperationKind.Invocation` ([AvoidConstArrays.cs](https://source.dot.net/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetCore.Analyzers/Runtime/AvoidConstArrays.cs.html)), and a collection expression is neither. Agents on C# 12+ write `[...]` by habit, so the rule's blind spot is the common case.

**Gap C: no analyzer for per-iteration LINQ or closures.** A `foreach` whose body calls `Where(...).Select(...).ToList().Count` compiled clean under the full gate (`Defects.cs(63)`). Meziantou has MA0020 (use direct methods), MA0098 (indexer), MA0063/MA0159 (`OrderBy`/`Order`) and MA0029 (combine LINQ methods), but none inspects a loop body (`$FIX/mez-probe`: `Extra.cs` line 9, the loop, was not flagged). No CA rule inspects one either. The mitigation is an `rg` candidate list and a reading heuristic (PERF-08).

**Gap D: no analyzer for `+=` on a string in a loop, `ArrayPool` double return/use-after-return, unbounded `stackalloc byte[n]`, or `catch (FormatException)` around `int.Parse`.** All four compiled clean (`$FIX/sweep/Sweep3.cs`, `$FIX/red/Defects.cs` lines 72-97) and each is caught by an `rg` pattern verified red/green in section 11.

### 4. Strings: concatenation, interpolation, StringBuilder, case comparison, hex

All numbers: BenchmarkDotNet 0.15.8, .NET 10.0.12, `[MemoryDiagnoser]`; `ClaimStringParts` ran `SimpleJob(launchCount: 2, warmupCount: 5, iterationCount: 20)` (`$FIX/bench/Claims.cs`, `out_bdn_release_claims.txt`); the others ran `[ShortRunJob]` (3 iterations, 1 launch) and are smoke-grade (`$FIX/bench/Strings.cs`, `out_bdn_release_all.txt`).

**Claim: StringBuilder beats interpolation for 4 or fewer parts. Refuted.**

| Method (2 launches x 20 iterations) | Mean | Allocated | vs interpolation |
|---|---|---|---|
| `$"{a}-{b}-{c}-{d}"` (4 strings) | 38.03 ns | 72 B | 1.00 |
| `a + "-" + b + "-" + c + "-" + d` | 47.10 ns | 152 B | 1.25x time, 2.1x bytes |
| `new StringBuilder().Append(a).Append('-')...ToString()` | 74.40 ns | 280 B | 1.97x time, 3.9x bytes |
| `$"{a}-{b}"` (2 strings) | 12.68 ns | 48 B | |
| `new StringBuilder().Append(a).Append('-').Append(b).ToString()` | 36.21 ns | 152 B | 2.9x time, 3.2x bytes |
| `$"{a}-{b}-{c}-{n}"` (3 strings + int) | 40.62 ns | 72 B | 1.00 |
| StringBuilder equivalent with `Append(int)` | 76.25 ns | 280 B | 1.88x time, 3.9x bytes |

The compiler lowers an interpolated string to `string.Concat` (all-string holes, small count) or to `DefaultInterpolatedStringHandler` with a pooled buffer ([DefaultInterpolatedStringHandler](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.defaultinterpolatedstringhandler)), and an `int` hole is formatted into the buffer without an intermediate `ToString()`. `new StringBuilder()` costs an object plus a 16-char chunk before the first character. Smoke run (ShortRun) agreed: `Interpolation` 36.8 ns/72 B, `string.Concat(a,"-",b,"-",c,"-",n.ToString())` 49.6 ns/104 B, `+` 72.6 ns/184 B, `new StringBuilder` 74.9 ns/280 B, `string.Create(null, stackalloc char[128], $"...")` 29.7 ns/72 B. `string.Create` with a stack buffer saves 7 ns and zero bytes over plain interpolation: not worth the extra overload. The MS guidance matches: "For a fixed, small set of values, the `+` operator and string interpolation are clearer" and `StringBuilder` is for "the number of pieces is large or unknown at compile time" ([Concatenate strings](https://learn.microsoft.com/en-us/dotnet/csharp/how-to/concatenate-multiple-strings)).

**In a loop the reflex is correct.** ShortRun, `foreach (p in parts) { s += p; s += ','; }`:

| N | `+=` loop | StringBuilder loop | `string.Join(',', parts)` |
|---|---|---|---|
| 8 | 240.7 ns / 1,216 B | 130.9 ns / 464 B | 35.9 ns / 120 B |
| 200 | 50,726 ns / 584,752 B | 1,394 ns / 7,680 B | 979 ns / 3,000 B |

36x time and 76x memory at N=200. When the pieces already exist as a collection, `string.Join`/`string.Concat` beat a hand-written `StringBuilder` loop (1.4x faster, 2.6x less memory at N=200).

**Case-insensitive comparison.** `a.ToLower() == b.ToLower()`: 28.2 ns / 48 B; `ToLowerInvariant()` pair: 21.5 ns / 48 B; `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)`: 15.6 ns / 0 B (ShortRun, `CaseCompare`). Two allocations and a culture dependency (CA1304, CA1311; the Turkish-I failure is in CS-XP) for a result that `OrdinalIgnoreCase` returns without allocating. `ToLowerInvariant()` stays legitimate for *producing* lowercase output (hex digests, OCI references; CS-XP already exempts CA1308 for this).

**Hex encoding.** `BitConverter.ToString(d).Replace("-", "").ToLowerInvariant()` on 32 bytes: 519 ns / 520 B. `Convert.ToHexStringLower(d)` (.NET 9+): 28.5 ns / 152 B (0.06x). `Convert.ToHexString(d).ToLowerInvariant()` (the net8 floor form): 60.8 ns / 304 B (0.12x). CA1872 is `warning` at Minimum; on a `net8.0;net10.0` matrix the `ToHexStringLower` call needs `#if NET9_0_OR_GREATER` (CS-PROC already restricts .NET 11 APIs behind `#if`; the same pattern applies one release earlier).

**CompositeFormat (CA1863).** Only when the same format string is reused on a hot path: parse once into a `static readonly CompositeFormat` and call `string.Format(null, fmt, args)` ([CA1863](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1863)). The gate fires only on a *static* non-`CompositeFormat` format field; literals are left alone. Interpolation stays the default.

### 5. Collections and LINQ: hot loops, the ToList reflex, Frozen collections, Any versus Count

**LINQ in a hot loop (ShortRun, 1000-element `List<int>`, filter + map + sum).**

| Shape | Mean | Allocated |
|---|---|---|
| `Where(...).Select(...).Sum()` | 1,991 ns | 152 B |
| `Where(...).Select(...).ToList().Count` (the `.ToList()` reflex) | 1,423 ns | 1,544 B |
| `foreach` with `if` | 837 ns | 0 B |
| 10 x `list.Count(i => i % (k + 2) == 0)` (closure capturing the loop variable) | 14,625 ns | 664 B |

The foreach is 2.4x faster than the chain and allocates nothing; `.ToList()` before `.Count` is 10x the memory of the chain it terminates; a capturing lambda inside a loop allocates a closure per iteration (664 B for 10 iterations here). .NET 10's JIT stack-allocates non-escaping delegates ("[dotnet/runtime#115172] teaches the JIT how to perform escape analysis related to delegates"; the post's example drops 88 B to 24 B, and "the JIT doesn't elide the allocation of the closure object", [Performance improvements in .NET 10](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/)), so the closure allocation is shrinking but the capturing closure object itself remains. Fix by shape, not by blanket ban: one-shot code over a bounded handful of items (arguments, a 5-entry report) is fine with LINQ; code that runs per output line, per byte, per package in an unbounded list is not. The SDK's real per-line work is the stdout pump (CS-PROC byte pump), not report decoding, so the practical rule is "no LINQ inside the pump or any per-chunk callback".

**Multiple enumeration (CA1851, All only).** `public int Multi(IEnumerable<int> input) { var c = input.Count(); foreach (var i in input) ... }` is two enumerations of a possibly deferred sequence. Fix by taking `IReadOnlyCollection<int>`/`IReadOnlyList<int>` (the `Count` property then replaces `Count()`), or materialize once (`ToArray()`) when the source is a LINQ query ([CA1851](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851): "If the underlying type ... is some other type, such as List or Array, it's safe to convert"). The red/green pair in section 11 shows the `IReadOnlyCollection<int>` fix passing.

**Any versus Count on `List<T>`. Confirmed in ratio, irrelevant in size.** `SimpleJob` 2x20, 1024 calls per invoke over 16 lists (half empty, half 100 items) so the JIT cannot fold:

| Expression | Mean per call | Allocated |
|---|---|---|
| `list.Any()` | 0.898 ns | 0 B |
| `list.Count > 0` | 0.429 ns | 0 B |
| `list.Count() > 0` (LINQ `Count()` on a `List<T>`) | 0.807 ns | 0 B |

`Count()` on a `List<T>` takes the `ICollection<T>.Count` fast path, so even CA1829 (`Count()` to `Count`) is a 0.4 ns clean-up. BDN warned `MultimodalDistribution` on two of the three. CA1860 and CA1829 are clarity rules: gate them, and never write "faster" in the message. The earlier ShortRun table printed sub-nanosecond values with errors larger than the mean (`ListAny` 1.0037 ns, Error 18.58 ns; `ArrayAny` at N=1000 `0.0000 ns`, `ZeroMeasurement` warning): that is a benchmark with no signal, not evidence.

**FrozenDictionary versus Dictionary. Qualified, not confirmed.** `SimpleJob` 2x20, 1024 lookups per invoke, `Ordinal` string keys of the form `key-N`, misses of the form `nope-N`:

| Keys | Hit: Dictionary | Hit: Frozen | Miss: Dictionary | Miss: Frozen |
|---|---|---|---|---|
| 8 | 6.31 ns | 4.72 ns (0.75x) | 4.65 ns | 1.03 ns (0.22x) |
| 1000 | 7.66 ns | 7.44 ns (0.97x, within Error) | 3.80 ns | 5.46 ns (1.44x slower) |

Construction (ShortRun, `FrozenBuild`): 8 keys 94 ns / 440 B for `new Dictionary(src, Ordinal)` versus 667 ns / 1,248 B for `ToFrozenDictionary(Ordinal)` (7.1x time, 2.8x memory); 1000 keys 7.5 µs / 31 KB versus 44.9 µs / 91 KB (6.0x, 2.9x). The docs say the same in words: "relatively high cost to create but provides excellent lookup performance ... intended for dictionaries that are created infrequently and used frequently" and "should only be initialized with trusted keys, because the details of the keys affect construction time" ([FrozenDictionary](https://learn.microsoft.com/en-us/dotnet/api/system.collections.frozen.frozendictionary-2)). The break-even at 8 keys is (667-94)/(6.31-4.72) = 360 hits (160 misses). At 1000 keys with mostly-hit traffic it never pays. The exemplars use it exactly where the shape fits: a `static readonly` table built once (`Humanizr__Humanizer@4574b93883bf:src/Humanizer/MetricNumeralExtensions.cs:72,123`). The honest default is `Dictionary`/`HashSet`; `Frozen*` is the choice for a static lookup table consulted at least in the hundreds of times per process, and a claim of "faster" needs the BDN table (PERF-10).

**SearchValues (CA1870).** `IndexOfAny(char[8])` 19.4 ns versus `IndexOfAny(SearchValues<char>)` 7.4 ns. Exemplar: `Humanizr__Humanizer@4574b93883bf:src/Humanizer/Localisation/EifelerRule.cs:12`. The array form in a `static readonly char[]` is the thing CA1870 flags; five or fewer values are left alone.

### 6. Boxing: params object[], structs through interfaces, Enum

`SimpleJob`-free smoke (ShortRun, `BoxingParams`, `EnumUse`) plus a 2x20 re-run of the interface case (`ClaimBoxing`, `NoInlining` helpers so the JIT cannot remove the box):

| Case | Mean | Allocated |
|---|---|---|
| `Fmt(params object[] args)` called with two `int` | 16.54 ns | 48 B |
| `Span(params ReadOnlySpan<int> args)` (C# 13 params collections) | 1.30 ns | 0 B |
| `int` to `IEquatable<int>` parameter, callee **inlinable** | 0.06 ns (ZeroMeasurement) | 0 B |
| same, callee `[NoInlining]` | 5.27 ns | 24 B |
| `GenericNoInline<T>(T v) where T : struct, IEquatable<T>` | 0.52 ns | 0 B |
| `flags.HasFlag(Perm.Write)` | 0.37 ns | 0 B |
| `(flags & Perm.Write) != 0` | 0.04 ns (below noise floor) | 0 B |
| `flags.ToString()` | 30.27 ns | 72 B |
| `nameof(Perm.Write)` | 0.10 ns | 0 B |

Findings: (a) `params object[]` boxes every value-type argument and allocates the array; `params ReadOnlySpan<T>` (C# 13, `LangVersion` 14 is pinned by CS-BUILD) removes both. On a net8.0 leg the same code needs `LangVersion >= 13`: the default there is C# 12 and the compiler says `CS9202: Feature 'params collections' is not available in C# 12.0` (`$FIX/net8probe`; compiled clean with `<LangVersion>14</LangVersion>`). (b) The "structs through interfaces always box" rule is true at the IL level and false after inlining on .NET 10; the deterministic fix is a constrained generic (`where T : struct, IEquatable<T>`), not an interface parameter. .NET 10's inliner now "looks for boxing, as the caller could possibly instead avoid the box entirely" ([Performance improvements in .NET 10](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/)). (c) `Enum.HasFlag` was slow and boxing on .NET Framework; since .NET Core 3.0 the JIT treats it as an intrinsic and the docs define it as `(thisInstance & flag) == flag` ([Enum.HasFlag](https://learn.microsoft.com/en-us/dotnet/api/system.enum.hasflag)). Measured 0.37 ns, 0 B: do not rewrite it. (d) `Enum.ToString()` allocates a string every call (72 B); on a hot path use `nameof` for a known member, a `switch` returning literals, or a cached `FrozenDictionary<TEnum,string>` built once. No CA18xx rule covers `params object[]` or `Enum.ToString()`; Meziantou `MA0052` replaces a *constant* `Enum.ToString()` with `nameof` (README row 84).

### 7. Exceptions as control flow and per-call Regex

**Exceptions.** `int.TryParse(bad, out _)`: 4.17 ns / 0 B. `try { int.Parse(bad); } catch (FormatException) { }`: 2,314.9 ns / 512 B, 556x (ShortRun, `ExceptionControlFlow`). No gate fires: CA1031 targets *general* catches and CS-ERR already gates it; a specific `catch (FormatException)` is silent (`$FIX/red/Defects.cs:97`). The rule is "use the `Try*` overload"; exceptions stay for exceptional paths, which is also what CS-ERR assumes (exit-code failures are exceptions at the API boundary, not in a loop).

**Regex.**

| Shape (ShortRun, `RegexUse`, input `"123456"`, pattern `^\d+$`) | Mean | Allocated |
|---|---|---|
| `new Regex(p).IsMatch(s)` per call | 836.5 ns | 2,232 B |
| `Regex.IsMatch(s, p)` (static; the 15-entry cache) | 45.8 ns | 0 B |
| `static readonly Regex(p, Compiled)` | 30.0 ns | 0 B |
| `[GeneratedRegex(p)]` partial method | 20.5 ns | 0 B |

"By default, the last 15 most recently used static regular expression patterns are cached" ([Best practices for regular expressions](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex)), which is why the static call is only 2.2x slower than the generated one while per-call construction is 40x slower. The static form is still flagged by SYSLIB1045 and is a cache-eviction hazard in a library called from many sites. The docs' guidance is unconditional: "Where possible, use source-generated regular expressions instead of compiling regular expressions using the `RegexOptions.Compiled` option" ([Regex source generators](https://learn.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-source-generators)); `RegexOptions.Compiled` is "ignored by the source generator", and the generator emits a cached singleton, so no extra `static readonly` is needed. The generator needs a `partial` class; the .NET 9 partial-property form (`private static partial Regex X { get; }`) is also supported (same page). Exemplar: `Humanizr__Humanizer@4574b93883bf:src/Humanizer/StringHumanizeExtensions.cs:15-16`. Timeouts: `matchTimeoutMilliseconds:` in the attribute (Gap A in section 3).

### 8. Spans, stackalloc and ArrayPool

- **stackalloc**: assign to `Span<T>`, cap the size, never in a loop. The language reference gives the shape `const int MaxStackLimit = 1024; Span<byte> buffer = inputLength <= MaxStackLimit ? stackalloc byte[inputLength] : new byte[inputLength];`, warns "be conservative when you define the actual limit value", says "Avoid using `stackalloc` inside loops", and that the memory is uninitialized ([stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)). CA2014 enforces the loop rule (measured error). Exemplars cap by a constant: `const int MAX_STACK = 128; ... maxLen <= MAX_STACK ? stackalloc byte[MAX_STACK] : (lease = ArrayPool<byte>.Shared.Rent(maxLen))` with `try`/`finally` returning the lease (`StackExchange__StackExchange.Redis@e7c43a269f53:src/RESPite/Messages/RespReader.cs:809-822`; sibling sites return in `finally`, e.g. `:728`); a guard before an unbounded size (`if (end > RespConstants.MaxRawBytesInt32) ThrowProtocolFailure(...)` then `stackalloc byte[end]`, `RespReader.Utils.cs:191-195`); and a decoder-reported token size of at most a few bytes (`MessagePack-CSharp__MessagePack-CSharp@242bdad51f89:src/MessagePack/MessagePackReader.Integers.cs:46`). For the ocx SDK the bound is the CS-PROC 16 MiB cap, far above any stack limit: stack buffers are for fixed small things (an 8-byte token, a 64-char scratch), not for stream data.
- **ArrayPool**: "The reference returned from a given call to the Rent method must only be returned using the Return method once ... Returning the same array reference twice or continuing to use the array reference after it has been returned is a high-severity security issue ... double-free and use-after-free" ([ArrayPool.Return](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return)). The compiler and every analyzer in the gate stayed silent on a double return (`$FIX/red/Defects.cs:88-90`, `Pool`). Two counter-examples from the exemplars show the common hazards: `ArrayPool<char>.Shared.Return(charArray)` placed after code that can throw, so an exception leaks the rental to the GC instead of returning it (`MessagePack-CSharp__MessagePack-CSharp@242bdad51f89:src/MessagePack/MessagePackReader.cs:1157,1182`); the Redis reader uses `try`/`finally` (`RespReader.cs:728`). Leaking a rental is harmless; returning twice is not. Secrets: the SDK passes secrets as stdin bytes (CS-PROC); a buffer that ever held one must be rented and returned with `clearArray: true`, otherwise the next renter reads it. A pooled buffer is also an ownership decision CS-ASYNC resolved lexically (using/await using); a `try`/`finally` around `Rent`/`Return` is the same discipline.
- **Spans** for slicing: CA1846 (`Substring` to `AsSpan`), CA1831-CA1833 (range indexer to `AsSpan`), CA1845 (span-based `Concat`) are in the gate at warning and each fired in the sweep. Where the callee takes only `string`, `AsSpan().ToString()` is a regression; leave the `Substring`.

### 9. BenchmarkDotNet: what agents get wrong

Procedure verified end to end in `$FIX/bench` (BenchmarkDotNet 0.15.8; 0.16.0-preview.1/.2 are on NuGet and the exemplar tree is at `0.16.0`, `dotnet__BenchmarkDotNet@61ebda8a50ae:build/common.props:46`; stay on 0.15.x until 0.16 is GA).

1. **Debug builds are refused, and the process exits 0.** `dotnet run -c Debug -- --filter '*AnyVsCount*'` printed, verbatim: `// Validating benchmarks:` / `//    * Assembly Bench which defines benchmarks is non-optimized` / `Benchmark was built without optimization enabled (most probably a DEBUG configuration). Please, build it in RELEASE.` / `If you want to debug the benchmarks, please see https://benchmarkdotnet.org/articles/guides/troubleshooting.html#debugging-benchmarks.` and returned exit code 0 (`$FIX/bench/out_bdn_debug.txt`). `DefaultConfig` adds `JitOptimizationsValidator.FailOnError` (`dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Configs/DefaultConfig.cs:75`), whose error is critical (`JitOptimizationsValidator.cs:48-55`, message at `:50`), and the runner then returns `Summary.ValidationFailed(...)` instead of throwing (`Running/BenchmarkRunnerClean.cs:92-93`): "If any of the validation errors is critical, then none of the benchmarks will get executed" ([Validators](https://benchmarkdotnet.org/articles/configs/validators.html)). `Main` returns normally, hence exit 0. An agent that checks `$?` concludes success. A second exit-0 failure: an ambiguous project lookup (`Found more than one matching project file for Bench`) printed "BenchmarkDotNet has failed to build the auto-generated boilerplate code" and still exited 0 (`$FIX/bench-relcfg`, first attempt, caused by two projects named `Bench` under one parent). **Assert that a report exists**: `test -n "$(ls BenchmarkDotNet.Artifacts/results/*-report-github.md 2>/dev/null)"`.
2. **`<Configuration>Release</Configuration>` in the csproj is not enough.** StackExchange.Redis does this (`StackExchange__StackExchange.Redis@e7c43a269f53:tests/StackExchange.Redis.Benchmarks/StackExchange.Redis.Benchmarks.csproj:5`). Measured here: with that property and no `-c`, MSBuild reports `Optimize=false`, `bin/Release` is created, and BDN prints "non-optimized" (`$FIX/bench-relcfg/out_run_noconfig_dry.txt`); adding `<Optimize>true</Optimize>` made it run (`out_run_noconfig_optimize.txt`). Worse, an unoptimized `bin/Release` left behind is reused by a later `dotnet run -c Release` (incremental build) until `bin`/`obj` are removed. Always pass `-c Release` and, after changing configuration properties, `rm -rf bin obj`.
3. **Do not run benchmarks inside a test project.** A `[Fact]` calling `BenchmarkRunner.Run<SumBench>()` in an xUnit v3 (`xunit.v3.mtp-v2` 4.0.2) project: under the default Debug build the run printed the same refusal and the runner reported `Total: 1, Errors: 0, Failed: 0 ... Time: 0.433s`, a green test with no measurement; under `-c Release` it measured (1.589 ns) and the single test took 146.4 s (`$FIX/bench-in-test/out_run_debug.txt`, `out_run_release.txt`). Both outcomes break a CS-TEST gate: one silently passes, the other blows any timeout.
4. **The benchmark project is not a library.** Under the library gate a minimal benchmark class (public class in the global namespace, a `[Params]` public field, no XML docs) fails with CA1050, CA1051, CA1515 and CS1591 (`$FIX/bench-gate`). Give `benchmarks/` its own `Directory.Build.props` (an empty `<Project />` stops the upward search; NuGet's `Directory.Packages.props` lookup is separate and needs its own file) and set `IsPackable=false`. Exemplars keep benchmarks out of `src/` and out of the packable set: `npgsql__npgsql@9c47244547c2:test/Npgsql.Benchmarks/Npgsql.Benchmarks.csproj:9` relaxes NuGet audit errors for the project, Humanizer builds against a baseline package via a manual workflow (`Humanizr__Humanizer@4574b93883bf:src/Benchmarks/README.md:10-30`).
5. **What to put in the class.** `[MemoryDiagnoser]` always (without it allocation is invisible, and allocation is the only deterministic number on a noisy machine); `[ShortRunJob]` only for a smoke run (StackExchange.Redis does `[ShortRunJob, MemoryDiagnoser]`, `StackExchange__StackExchange.Redis@e7c43a269f53:tests/StackExchange.Redis.Benchmarks/AsciiHashBenchmarks.cs:11`); one `[Benchmark(Baseline = true)]` per comparison; `[Params]` for sizes; **return the value** so the JIT cannot discard the work (the BDN guide: "the JIT can eliminate this code because the result ... is not used", and "Never use the Debug build", "never use an attached debugger", [Good practices](https://benchmarkdotnet.org/articles/guides/good-practices.html)); inputs in fields set in `[GlobalSetup]`, not literals (constants fold: `ArrayAny` at N=1000 measured `0.0000 ns`, `ListAny` Error 18.58 ns on Mean 1.00 ns in ShortRun). For nanosecond bodies use `OperationsPerInvoke` over a loop whose index selects among several inputs (the `ClaimAny` shape).
6. **Do not benchmark I/O or the child process.** `Process.Start("true")` measured 821,536 ns / 88,305 B with Error 1,125,183 ns (WSL noise larger than the mean's spread); the ocx process dwarfs anything the SDK does (section 10). Benchmark the pure parts (argv builder, exit-table lookup, JSON decode, discovery order) and keep file, network and process work out of `[Benchmark]` bodies.
7. **CLI**: `dotnet run -c Release -- --filter '*ClaimAny*' --job short -m` (`-j/--job` accepts `Dry/Short/Medium/Long`; `-m/--memory`; `-f/--filter` takes globs; `--list flat` prints names; `--statisticalTest 5%` compares runs; `--help` lists them, `$FIX/bench` verified). Without `--filter` (or `--job`/other arguments naming a target) `BenchmarkSwitcher` prints `Available Benchmarks:` and `You should select the target benchmark(s). Please, print a number ...` and waits on stdin; with stdin closed it exits 0 having run nothing (`$FIX/bench/out_nofilter.txt`); an agent must always pass `--filter` (a bare `--filter '*'` runs everything). `--job dry` ran one benchmark in 6 s and is a compile-and-execute smoke test, never a timing (`Mean 1.711 ms` for a 3-element sum). Keep `BenchmarkDotNet.Artifacts/` out of git.
8. **Measurement hygiene on WSL.** Same-process comparisons are valid, absolute numbers are not. ShortRun Error columns were as large as the Mean itself (`ListAny` 1.00 ns with Error 18.58 ns; `DictionaryHit` at 8 keys 56.5 ns with Error 105.2 ns); the 2x20 `SimpleJob` re-runs brought Error to 4 to 13% of the Mean for every row above 0.4 ns. Use `Allocated` for allocation claims (exact), `Ratio` and the Error columns for time, and re-run with a longer job when the intervals overlap. Heed the footer warnings (`ZeroMeasurement`, `MultimodalDistribution`, `BaselineCustomAnalyzer`): each means "this row is not evidence".

### 10. Should an I/O-bound SDK carry a benchmarks project?

No, not by default. ShortRun, `SdkCostContext`: decoding a 330-byte ocx-shaped JSON document with `JsonDocument.Parse` 561.7 ns / 72 B; `Process.Start("true")` with redirected stdout/stderr 821,535.7 ns / 88,305 B, 1,465x. A real `ocx` call adds the Rust binary's own work (registry I/O, filesystem) on top. Anything the SDK does in managed code is three orders of magnitude below the child's start-up, so optimizing argv building, report decoding or exit-table lookups cannot be observed by a caller. A benchmarks project is a standing cost (a second dependency graph, BDN's own transitive packages, a gate exemption, CI wiring) that buys nothing until someone claims a speed-up. Rule: create `benchmarks/Ocx.Benchmarks/` when a PR claims a performance or allocation improvement, commit the project with the claim's benchmark class, and either keep it (it then needs a `dry` smoke build in CI so it does not rot) or delete it in the same PR. The one place with real per-chunk work is the stdout/stderr byte pump (CS-PROC-*: one pump per stream, 16 MiB cap); that is where a benchmark would first earn its keep (bytes per second through the pump with a fake child, `Ocx.Fake` from CS-TEST), still without spawning the real binary inside `[Benchmark]`.

### 11. Verified on the toolchain

All commands from `$FIX` (SDK 10.0.401 pinned by `$FIX/global.json`; wrapper `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`). The posture files are copies of the CS-BUILD "chosen" set (`Directory.Build.props`: `AnalysisLevel 10.0-all`, `EnforceCodeStyleInBuild`, `GenerateDocumentationFile`, `TreatWarningsAsErrors`; `BannedSymbols.txt`; BannedApiAnalyzers 5.6.0 and VS.Threading 18.7.23 as `GlobalPackageReference`) plus the three perf lines in `.globalconfig` (final copy `.globalconfig.final`, pre-perf copy `.globalconfig.before_perf`).

**V1. Red file under the pinned gate, then the green twin** (`red/Defects.cs` 101 lines, `green/Defects.cs` 90 lines):

```
$ cd red && run.sh dotnet build --no-incremental -v q ; echo exit=$?
exit=1   (19 unique error locations, 16 ids)
Defects.cs(11,39): error CA1825   new string[0]
Defects.cs(13,52): error CA1829   list.Count()
Defects.cs(17,21), (18,27): error CA1851   Count() + foreach on one IEnumerable<int>
Defects.cs(24,13): error CA1854   ContainsKey then d[k]
Defects.cs(28,50): error CA1860   list.Any()
Defects.cs(32,47): error CA1861   new[] {"a","b","c"} as an argument in a loop
Defects.cs(44,57): error CA1865   StartsWith("a", Ordinal)
Defects.cs(45,45): error CA1310 + (45,57) CA1866   StartsWith("b")
Defects.cs(47,66): error CA1870   IndexOfAny(static readonly char[6])
Defects.cs(49,43): error CA1872   BitConverter.ToString(b).Replace("-","").ToUpperInvariant()
Defects.cs(51,44): error SYSLIB1045   Regex.IsMatch(s, @"^\d+$")
Defects.cs(56,56..73): error CA1862, CA1304 x2, CA1311 x2   a.ToLower() == b.ToLower()
Defects.cs(82,54): error CA2014   stackalloc inside a for loop
    19 Error(s)
$ cd green && run.sh dotnet build --no-incremental -v q ; echo exit=$?
Build succeeded.   0 Warning(s)   0 Error(s)   exit=0
```

Silent in red under the gate, as predicted (gaps C/D and the CA1861 hole): `KnownCollExpr` (collection expression argument, line 38), `DigitsTimeout` (non-constant timeout, line 54), `HotLinq` (line 63), `Concat` (`+=` in a loop, line 75), `Pool` (double `Return`, line 88-90), `ParseByCatch` (line 97), `Joined(params object[])` (line 100), the mutable-looking `static readonly Dictionary` (line 68).

**V2. SYSLIB1045 posture line** (`.globalconfig.before_perf` swapped in, then `.globalconfig.final`): red 17 errors without `dotnet_diagnostic.SYSLIB1045.severity = warning` (`out_red_posture0b.txt`), 18 with (`out_red_posture1.txt`).

**V3. CA1822 api_surface and CA1867** (`posture/`, public + internal instance members and `StartsWith("(", OrdinalIgnoreCase)`): before `CA1822 x2, CA1867 x1`; after `CA1822 x1` (internal only). `out_posture_before.txt`, `out_posture_after.txt`.

**V4. MA0110 closes gap A** (`mez-gate/`, `MeziantouAnalysisMode=None`): with `dotnet_diagnostic.MA0110.severity = warning` `R.cs(7,49): error MA0110: Use the Regex source generator`; line removed, `0 Error(s)`.

**V5. net8.0 floor** (`net8probe/`): chain `BitConverter.ToString(b).Replace(...).ToLowerInvariant()` gives `CA1872: Prefer 'System.Convert.ToHexString(byte[])'`; `Convert.ToHexStringLower(b)` gives `CS0117`; `params ReadOnlySpan<string>` gives `CS9202` until `<LangVersion>14</LangVersion>`; `dotnet format analyzers --diagnostics CA1872 --severity info` produced `Convert.ToHexString(b).ToLowerInvariant()`.

**V6. Regex shapes** (`regex-probe/`, 8 shapes): SYSLIB1045 on lines 7, 8, 10, 12, 13, 14 (static IsMatch with and without options, `new Regex`, `Regex.Replace`, `Regex.Split`, `static readonly Regex = new(...)`); silent on line 9 (static + `TimeSpan`) and 11 (ctor + `TimeSpan`).

**V7. CA1812 is not noisy for STJ source-gen DTOs** (`stj-probe/`): `internal sealed class Dto` registered in `[JsonSerializable]` was not flagged; `internal sealed class NeverUsed` was (`D.cs(11,23): error CA1812`).

**V8. `rg` verifications, each red hit and green clean** (real ripgrep binary; in this harness the bare `rg` is rewritten to GNU grep by a hook, so the binary path was used):

```
PERF-04  rg -n -e 'new Regex\(' -e '\bRegex\.(IsMatch|Match|Matches|Replace|Split|Count|EnumerateMatches)\(' red green --glob '*.cs'
         red/Defects.cs:51, red/Defects.cs:54                       green: none
PERF-05  rg -n -e '\.To(Lower|Upper)(Invariant)?\(\)\s*(==|!=)' -e '\.To(Lower|Upper)(Invariant)?\(\)\.(Equals|Contains|StartsWith|EndsWith)\(' red green --glob '*.cs'
         red/Defects.cs:56                                          green: none
PERF-07  rg -U -P -n '(?:var|string) (\w+) = (?:""|string\.Empty);\s*(?:foreach|for|while)\b[^{]*\{[^{}]*\b\1 \+= ' red green --glob '*.cs'
         red/Defects.cs:74-75                                       green: none
PERF-08  rg -U -n '(foreach|for|while) ?\([^)]*\)\s*\{[^{}]*\.(Select|Where|ToList|ToArray|Any|Count|OrderBy)\(' red green --glob '*.cs'
         red/Defects.cs:61-63                                       green: none
PERF-14  rg -U -P -n 'Shared\.Rent\((?:(?!\bfinally\b)[\s\S])*?Shared\.Return\(' red green --glob '*.cs'
         red/Defects.cs:88-89                                       green: none (Return count 1 == finally-Return count 1)
PERF-13  rg -n -P 'catch \((FormatException|OverflowException|InvalidCastException|KeyNotFoundException)\b' red green --glob '*.cs'
         red/Defects.cs:97                                          green: none
PERF-03  rg -n -e '\(\s*\[\s*"' red green --glob '*.cs'            red/Defects.cs:38   green: none
PERF-15  rg -n -P 'stackalloc\s+\w+\s*\[(?!\s*\d+\s*\])' sweep red green --glob '*.cs'   sweep/Sweep3.cs:26   red, green: none
```

**V9. BenchmarkDotNet**: Release smoke of 53 benchmarks, `Global total time: 00:11:16`, results in `bench/BenchmarkDotNet.Artifacts/results/*-report-github.md`; second wave (21 benchmarks, 15:43) for the three claims; third wave (8 benchmarks, 1:15) for the cost context; Debug refusal (`out_bdn_debug.txt`, exit 0); test-project Debug and Release runs; `--job dry` smoke; Configuration trap.

Counts of watched red-to-green pairs: gate red/green (V1), SYSLIB1045 line (V2), CA1822 api_surface (V3), CA1867 off (V3), MA0110 (V4), net8 ToHexStringLower (V5), CA2014 (V1), eight `rg` patterns (V8), BDN Debug versus Release (V9), BDN-in-test Debug versus Release (V9), Configuration property with and without `Optimize` (V9): 18 pairs.

## Normative guidance candidates

Verification commands use `rg` (ripgrep) with a directory operand; `src` and `benchmarks` are the proposed roots. `rg -P` is PCRE2. Every pattern below was run against `$FIX/red` (hit) and `$FIX/green` (no hit) unless marked "reading heuristic".

1. **PERF-01. Keep every CA18xx rule at its `10.0-all` severity; list only deviations.** Rationale: `10.0-all` already makes all 64 `warning`, TWAE makes them errors, and a re-listed rule is a rule someone can quietly downgrade. Verify: `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:AnalysisLevel` prints `10.0-all`; `rg -n 'CA18[0-9]{2}' .globalconfig .editorconfig Directory.Build.props` prints only the CA1822 `api_surface` line and the CA1867 line (PERF-02); `rg -n 'NoWarn' --glob '*.props' --glob '*.targets' --glob '*.csproj' . | rg 'CA18'` prints nothing.
2. **PERF-02. Exactly three deviations in `.globalconfig`.** `dotnet_diagnostic.SYSLIB1045.severity = warning`, `dotnet_code_quality.CA1822.api_surface = private, internal`, `dotnet_diagnostic.CA1867.severity = none`, each with a one-line reason. Rationale: SYSLIB1045 is Info by default and outside every `analysislevel_*` file; CA1822 on public members is a breaking change; CA1867 has no fix and changes ignore-case meaning. Verify: `rg -n -e 'SYSLIB1045.severity = warning' -e 'CA1822.api_surface = private, internal' -e 'CA1867.severity = none' .globalconfig | wc -l` prints `3`; the canary `$FIX/posture` pattern (public instance member, internal instance member, `StartsWith("(", OrdinalIgnoreCase)`) must build with exactly one error (CA1822 on the internal member).
3. **PERF-03. Constant arrays passed as arguments are hoisted to `static readonly` by hand, including collection-expression arguments.** Rationale: CA1861 registers only array-creation and invocation operations, so `Has(["a","b"], s)` escapes; every iteration allocates. Verify: CA1861 (gate); plus `rg -n -e '\(\s*\[\s*"' --glob '*.cs' src` lists literal collection-expression arguments; each hit must be outside any loop or a non-array parameter (`ReadOnlySpan<T>` parameters do not allocate; reading heuristic).
4. **PERF-04. Regex: `[GeneratedRegex]` only, on a `partial` type; timeout via `matchTimeoutMilliseconds`.** No `new Regex(`, no static `Regex.*` call with a literal pattern, no `RegexOptions.Compiled`, no `TimeSpan` timeout argument. Rationale: 836 ns / 2,232 B per call construction versus 21 ns / 0 B; the `TimeSpan` overload silently disables SYSLIB1045. Verify: SYSLIB1045 at warning (PERF-02); `rg -n -e 'new Regex\(' -e '\bRegex\.(IsMatch|Match|Matches|Replace|Split|Count|EnumerateMatches)\(' -e 'RegexOptions\.Compiled' --glob '*.cs' src` prints nothing; when Meziantou is referenced, `dotnet_diagnostic.MA0110.severity = warning` (red `MA0110`, green clean in `$FIX/mez-gate`).
5. **PERF-05. Case-insensitive equality is `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)`; `ToLower()`/`ToUpper()` are never used to compare.** `ToLowerInvariant()` is allowed only to produce a lowercase value (digests, OCI references; CA1308 exemption from CS-XP). Rationale: 28 ns / 48 B versus 16 ns / 0 B, plus the culture bug (CS-XP). Verify: CA1862, CA1304, CA1311, CA1309 (gate, all fired); `rg -n -e '\.To(Lower|Upper)(Invariant)?\(\)\s*(==|!=)' -e '\.To(Lower|Upper)(Invariant)?\(\)\.(Equals|Contains|StartsWith|EndsWith)\(' --glob '*.cs' src` prints nothing (catches the `==` and chained forms CA1862 misses; `ToLowerInvariant().Equals(...)` was not flagged by CA1862 in the sweep).
6. **PERF-06. Hex-encode with `Convert.ToHexString`/`Convert.ToHexStringLower`; `ToHexStringLower` sits behind `#if NET9_0_OR_GREATER` on any leg that includes net8.0.** Rationale: 519 ns / 520 B for the `BitConverter` chain versus 28 ns / 152 B; the net8.0 CA1872 message suggests the uppercase API and the net10.0 one suggests an API net8.0 lacks. Verify: CA1872 (gate); `dotnet build -f net8.0 src/Ocx/Ocx.csproj` succeeds; `rg -n 'ToHexStringLower' --glob '*.cs' src` hits only inside `#if NET9_0_OR_GREATER` blocks (reading heuristic: `rg -n -B3 'ToHexStringLower' src`).
7. **PERF-07. Build strings by size: up to roughly four known parts use interpolation or `string.Concat`; a loop uses `StringBuilder` (one instance, `Append` per piece) or `string.Join`/`string.Concat` over the collection; `+=` on a string inside a loop is banned.** Do not replace a small interpolation with `StringBuilder` or `string.Create` "for performance". Rationale: 38 ns / 72 B versus 74 ns / 280 B at four parts; 50.7 µs / 585 KB versus 1.4 µs / 7.7 KB at 200 appends. Verify: `rg -U -P -n '(?:var|string) (\w+) = (?:""|string\.Empty);\s*(?:foreach|for|while)\b[^{]*\{[^{}]*\b\1 \+= ' --glob '*.cs' src` prints nothing; CA1830, CA1834, CA1845 in the gate; `new StringBuilder()` followed by fewer than five `Append` calls and no loop is a reading-heuristic finding.
8. **PERF-08. No LINQ chain, `ToList()`/`ToArray()` or capturing lambda inside a loop that runs per output chunk, per byte or per element of an unbounded input; never materialize only to take `.Count`/`.Length` or to `ForEach`.** One-shot code over a handful of items (argv, a short report) may use LINQ. Rationale: 1,991 ns / 152 B chain versus 837 ns / 0 B foreach; `.ToList().Count` 1,544 B; a capturing lambda allocates a closure per iteration. No analyzer covers it. Verify: `rg -U -n '(foreach|for|while) ?\([^)]*\)\s*\{[^{}]*\.(Select|Where|ToList|ToArray|Any|Count|OrderBy)\(' --glob '*.cs' src` is a candidate list (each hit needs a "bounded N" or "one-shot" judgement); `rg -n -P '\.To(List|Array)\(\)\.(Count|Length|ForEach|Any)\b' --glob '*.cs' src` prints nothing; in the stdout/stderr pump and any per-chunk callback the first pattern must print nothing (named reading heuristic).
9. **PERF-09. Take `IReadOnlyCollection<T>`/`IReadOnlyList<T>` when the callee enumerates twice or needs the count; use concrete types for private/internal members where CA1859 asks; use `Count`/`Length`, `Count > 0`, `IsEmpty` instead of `Count()`/`Any()` on collections.** Rationale: CA1851 is a real double enumeration (Spectre `Ratio.cs:35,53`); CA1860/CA1829/CA1836 are clarity fixes, not speed claims (`Any()` 0.90 ns versus `Count > 0` 0.43 ns, both 0 B). Verify: CA1851, CA1859, CA1860, CA1829, CA1836, CA1826 (gate, all fired); `rg -n -e '\.Any\(\)' --glob '*.cs' src` is a reading list for `Any()` on a `List<T>`/array; no comment or commit may justify these as performance (PERF-17).
10. **PERF-10. `Dictionary`/`HashSet` by default; `FrozenDictionary`/`FrozenSet` only for a `static readonly` table that is built once and consulted at least hundreds of times per process (break-even about 360 hits at 8 keys), with string or enum keys; never for a per-call or per-instance table, and never for a mutable one.** Rationale: construction is 6 to 7x and 2.8 to 2.9x memory; lookup wins at 8 keys (hit 0.75x, miss 0.22x) and loses on a 1000-key miss (1.44x slower). Verify: `rg -n 'ToFrozen(Dictionary|Set)\(' --glob '*.cs' src` hits only initializers of `static readonly` fields: per file `rg -U -c -P 'static readonly[^;]*ToFrozen' f` equals `rg -c 'ToFrozen' f` (1 and 1 on the green fixture); `rg -n -P 'static readonly (Dictionary|HashSet)<' --glob '*.cs' src` lists tables to consider (reading heuristic: never mutated after construction); a "faster" claim requires PERF-17.
11. **PERF-11. No `params object[]` in the SDK's own signatures; use overloads, a constrained generic (`where T : struct, IEquatable<T>`), or `params ReadOnlySpan<T>` (C# 13; any net8.0 leg needs `LangVersion` 13 or later, CS-BUILD pins 14).** Rationale: 16.5 ns / 48 B versus 1.3 ns / 0 B; `struct` to interface boxes unless the callee inlines. Verify: `rg -n 'params object\[\]' --glob '*.cs' src` prints nothing; `rg -n '<LangVersion>' Directory.Build.props` prints `14`.
12. **PERF-12. Leave `Enum.HasFlag` alone; do not call `Enum.ToString()` on a hot path.** Use `nameof(E.Member)`, a `switch` returning literals, or a cached lookup. Rationale: `HasFlag` 0.37 ns / 0 B on .NET 10 (the .NET Framework-era "HasFlag boxes" advice is obsolete); `ToString()` 30 ns / 72 B. Verify: reading heuristic; any PR that rewrites `HasFlag` into a mask carries a BDN table (PERF-17).
13. **PERF-13. Parse and probe with `Try*` APIs; do not catch `FormatException`, `OverflowException`, `InvalidCastException`, `KeyNotFoundException` or `ArgumentException` to decide a branch.** Rationale: 2.3 µs / 512 B per caught exception versus 4 ns (556x). Verify: `rg -n -P 'catch \((FormatException|OverflowException|InvalidCastException|KeyNotFoundException)\b' --glob '*.cs' src` prints nothing; CA1031 (CS-ERR) covers the general catch.
14. **PERF-14. Every `ArrayPool<T>.Shared.Rent` is paired with exactly one `Return` inside `finally`; no use after `Return`; `clearArray: true` for any buffer that held secrets (stdin secrets, CS-PROC).** Rationale: the MS docs rate double return and use-after-return "a high-severity security issue"; no analyzer sees either. Verify: `rg -U -P -n 'Shared\.Rent\((?:(?!\bfinally\b)[\s\S])*?Shared\.Return\(' --glob '*.cs' src` prints nothing; per file `rg -c 'Shared\.Return\(' f` equals `rg -U -c -P 'finally\s*\{[^{}]*Shared\.Return\(' f`; secrets: `rg -n -B2 -A6 'Shared\.Return\(' src` reviewed for `clearArray: true` where the buffer held a secret (reading heuristic).
15. **PERF-15. `stackalloc` is assigned to a `Span<T>`, has a constant or capped size (default cap 256 bytes unless a documented bound), and is never inside a loop.** Rationale: CA2014 (loop) is an error; an uncapped `stackalloc byte[n]` has no analyzer and a `StackOverflowException` is not catchable; the exemplars cap with a constant (`MAX_STACK = 128`). Verify: CA2014 (gate); `rg -n -P 'stackalloc\s+\w+\s*\[(?!\s*\d+\s*\])' --glob '*.cs' src` lists non-constant sizes; each must sit behind a visible `<= Limit` ternary or guard (reading heuristic).
16. **PERF-16. Six or more search characters use a `static readonly SearchValues<char>`; slicing for parsing uses `AsSpan`/range-on-span rather than `Substring`/range-on-string where the callee accepts a span.** Rationale: 19.4 ns versus 7.4 ns; CA1870, CA1846, CA1831-CA1833, CA1845 are in the gate and fired. Verify: those rules; `rg -n 'static readonly char\[\]' --glob '*.cs' src` lists arrays that should be `SearchValues` when passed to `IndexOfAny`.
17. **PERF-17. A performance or allocation claim in code comments, commit messages, PR text or docs needs a BenchmarkDotNet table; an analyzer-driven cleanup (CA1860, CA1829, CA1865 ...) must be described as a cleanup, not as faster.** Accept a time claim only when the effect exceeds 20% and the Error intervals do not overlap; accept an allocation claim for any change in `Allocated` (deterministic). The table shows `Method`, `Mean`, `Error`, `Ratio`, `Allocated`, the job and the `BenchmarkDotNet v0.x`/runtime header. Verify: `git log origin/main..HEAD --format=%B | rg -i -e 'faster' -e 'speed ?up' -e 'fewer alloc' -e 'reduces? alloc' -e 'optimi[sz]'` hits must be matched by `git log origin/main..HEAD --format=%B | rg -c 'Allocated'` greater than zero (reading heuristic on the PR body for the same words).
18. **PERF-18. Benchmarks live in `benchmarks/<Name>.Benchmarks/` (never in `src/`, never in a test project), an `OutputType` Exe with `IsPackable=false`, outside the library gate through its own `benchmarks/Directory.Build.props` and `Directory.Packages.props`, and are not in the required CI check.** Rationale: a minimal benchmark class fails the library gate with CA1050, CA1051, CA1515, CS1591; a benchmark inside xUnit v3 passes in 0.4 s under Debug with no measurement. Verify: `rg -l 'BenchmarkDotNet' --glob '*.csproj' --glob '*.props' src tests` prints nothing; `test "$(dotnet msbuild benchmarks/Ocx.Benchmarks/Ocx.Benchmarks.csproj -getProperty:IsPackable)" = false`; `test -f benchmarks/Directory.Build.props`.
19. **PERF-19. Run benchmarks only with `-c Release` and an explicit `--filter`, then assert a report exists; a zero exit code proves nothing.** `dotnet run -c Release --project benchmarks/Ocx.Benchmarks -- --filter '*Name*' --job short -m` for a smoke, the default job (or `SimpleJob(launchCount: 2, warmupCount: 5, iterationCount: 20)`) for a decision; delete `bin`/`obj` after changing configuration properties; `--job dry` only to prove a benchmark executes. Rationale: Debug refusal, missing `--filter` prompt, ambiguous-project failure and a stale `bin/Release` all exit 0. Verify: `test -n "$(ls benchmarks/Ocx.Benchmarks/BenchmarkDotNet.Artifacts/results/*-report-github.md 2>/dev/null)"` after the run; `rg -n 'Optimize|Configuration' benchmarks/Ocx.Benchmarks/Ocx.Benchmarks.csproj` shows no `<Configuration>` without `<Optimize>true</Optimize>`; `BenchmarkDotNet.Artifacts/` is in `.gitignore` (`rg -n 'BenchmarkDotNet.Artifacts' .gitignore`).
20. **PERF-20. Benchmark bodies: `[MemoryDiagnoser]` on the class, one `[Benchmark(Baseline = true)]` per comparison, inputs in fields initialised in `[GlobalSetup]`, every body returns its result, no file, network or process work inside a `[Benchmark]` method.** Rationale: dead-code elimination and constant folding produce `0.0000 ns` rows and sub-ns noise; I/O dominates and hides the effect. Verify: `rg -L 'MemoryDiagnoser' benchmarks --glob '*.cs' | rg -v Program` lists classes lacking it (must be empty); `rg -n -e 'Process\.Start' -e 'File\.(Read|Write|Open)' -e 'HttpClient' -e 'Task\.Delay' benchmarks --glob '*.cs'` prints nothing except a file explicitly named `*CostContext*`; BDN footer `ZeroMeasurement` in the committed run output is a failure.
21. **PERF-21. The SDK ships no benchmarks project until a PR makes a performance claim.** Rationale: JSON decode of a small report is 0.56 µs, a trivial child spawn is 822 µs (1,465x); managed glue cannot be seen next to the process. Verify: `test ! -d benchmarks || git log --oneline -- benchmarks | head -1` shows a commit whose message cites the claim (reading heuristic); when it exists, CI builds it (`dotnet build benchmarks/Ocx.Benchmarks -c Release`) so it does not rot.
22. **PERF-22. Read analyzer results per TFM on a multi-target build; a rule that is silent on one leg may fire on the other.** Rationale: CA1842/CA1843 fire on net8.0 and not on net10.0; CA1872's suggestion differs. Verify: `dotnet build -c Release -f net8.0 src/Ocx/Ocx.csproj` and `-f net10.0` both exit 0 in CI (CS-CI already runs all legs).

## AI-agent angle

| What an LLM does | Why it is wrong here | Smallest mechanical check |
|---|---|---|
| Reaches for `StringBuilder` for a three-part message, or `string.Create` "to avoid allocation" | Interpolation is 2x faster and allocates 3.9x less than `new StringBuilder()` at 4 parts; `string.Create` saves nothing measurable | `rg -n 'new StringBuilder\(\)' --glob '*.cs' src` reading list; PERF-17 for the claim |
| Writes `s += x` in a loop, or the opposite: wraps a 2-line concat in `StringBuilder` | 585 KB at 200 appends; or 3x the cost at 2 parts | PERF-07 `rg -U -P` pattern |
| `a.ToLower() == b.ToLower()`, `ToUpper().Contains(...)` | two allocations plus the Turkish-I culture bug | CA1862 + CA1304 + CA1311; PERF-05 pattern |
| `new Regex(...)` per call, or "add a timeout" with `TimeSpan.FromSeconds(1)` and thereby silence SYSLIB1045 | 40x slower and 2.2 KB per call; the analyzer cannot see the timeout form | PERF-04 pattern; `MA0110` |
| Passes `["a","b"]` (collection expression) to an array parameter inside a loop | CA1861 is blind to collection expressions; allocation per iteration | PERF-03 `rg -e '\(\s*\[\s*"'` |
| `BitConverter.ToString(b).Replace("-", "").ToLower()` (decade-old idiom) | 18x slower; and on net8.0 `Convert.ToHexStringLower` does not exist (hallucinated for the floor) | CA1872; `dotnet build -f net8.0` |
| Uses `Convert.ToHexStringLower` on a net8.0 leg because CA1872 on net10 said so | `CS0117` on the floor; analyzer message differs per TFM | `dotnet build -f net8.0` |
| "Optimizes" `Enum.HasFlag` into a bit mask, or avoids `HasFlag` for "boxing" | JIT intrinsic since .NET Core 3.0, 0.37 ns, 0 B; advice is .NET Framework-era | reading heuristic; PERF-17 demands a BDN table |
| Calls `Enum.ToString()` / `.ToString()` on flags in a per-line path | 72 B per call | reading heuristic |
| Declares `params object[]` helpers (`Log(string fmt, params object[] args)`) | boxes each value argument and allocates the array | `rg 'params object\[\]'` |
| Replaces `Any()` with `Count > 0` and writes "improves performance" | 0.47 ns; below any budget; the claim is false at the scale that matters | PERF-17 |
| Converts every `Dictionary` to `FrozenDictionary` "for speed" | construction 6 to 7x; 1000-key misses 1.44x slower; wrong for per-call tables | PERF-10 `rg 'ToFrozen'` with the static-readonly check |
| `.ToList()` before `.Count`, `.ToList()` then `foreach`, LINQ chain per output line | 10x memory of the chain; 2.4x time of foreach | PERF-08 patterns |
| `catch (FormatException)` around `int.Parse` | 556x slower; silent in every analyzer | PERF-13 pattern |
| Rents an array and returns it twice, or after a `catch`, or reads it after `Return` | high-severity per MS docs; no analyzer | PERF-14 pattern (no `finally` between Rent and Return) |
| `stackalloc byte[n]` with `n` from input, or `stackalloc` inside a loop "to avoid allocations" | `StackOverflowException` is fatal; CA2014 for the loop | CA2014; PERF-15 pattern |
| Runs a BDN benchmark in Debug, sees exit 0, reports success | BDN refuses and exits 0 | PERF-19 report-exists assertion |
| Puts `[Benchmark]` methods into the xUnit test project | green test, no measurement, or 146 s under Release | PERF-18 `rg -l BenchmarkDotNet src tests` |
| Sets `<Configuration>Release</Configuration>` and drops `-c Release` (copying the StackExchange.Redis csproj) | `Optimize` stays false; "non-optimized" refusal | PERF-19 csproj check |
| Benchmarks `Process.Start` or a file read, or a constant-folded `list.Any()` | I/O dominates; `0.0000 ns` rows | PERF-20 `rg` |
| Cites a ShortRun result with `Error` larger than `Mean` as proof | noise; BDN prints `ZeroMeasurement`/`MultimodalDistribution` | PERF-17 thresholds |
| Writes `[LoggerMessage]` or CA1848 fixes for an SDK that has no logging dependency | out of scope for the SDK today | `rg -n 'Microsoft.Extensions.Logging' Directory.Packages.props` empty means CA1848/CA1873 never fire |

## Contested / evolving

- **Whether CA18xx should be gated at all.** Large exemplars gate narrower sets (Humanizer Minimum, Npgsql `latest` with few per-rule lines, Redis one CA18xx rule) and simple-exec gates All with zero hits. Trend: Microsoft keeps adding rules and moving them to Recommended; the evidence here (12 to 33 one-line hits on 14k to 50k lines) says the full set is cheap on new code. As of 2026-10-11 this is a green-field choice; the contested ground is legacy code. CA1805 on model-heavy code is the one demonstrably noisy rule (679 hits in the Anthropic SDK).
- **CA1851 default state.** The docs say "No"; the severity file says `warning` at All. A future SDK could move it; the pin makes that explicit rather than implicit.
- **Closure and delegate allocation advice is aging.** .NET 10's escape analysis removes non-escaping delegate allocations and the post lists array and span stack allocation in progress ([Performance improvements in .NET 10](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/)). A "no lambdas in hot loops" rule is weaker on net10 than on net8; the closure *object* is still allocated and the net8.0 floor does not have the optimization. Trend: more of PERF-08 moves from "ban" to "measure first". Not measured here for net8.0.
- **`params ReadOnlySpan<T>` and `params` collections** (C# 13) change the boxing advice for new APIs; existing `params object[]` signatures in dependencies stay. On C# 14 with a net8.0 leg `LangVersion` must be set explicitly (`CS9202` otherwise).
- **`FrozenDictionary` guidance** is in flux: the .NET 10 post notes alternate-lookup improvements for Frozen types ("both types gain from alternate lookup changes") and remains the "construction cost for read speed" trade. Numbers here are .NET 10.0.12 on one machine; a future runtime may shift the 1000-key miss result.
- **BenchmarkDotNet 0.16.0** is at `preview.2` on NuGet and `0.16.0` in the exemplar tree; behavior of the Debug refusal and exit code may change. Re-verify PERF-19 when upgrading from 0.15.x.
- **.NET 11 / C# 15 RC1 (GA Nov 2026).** `analysislevel_11_all.globalconfig` adds CA1876 (do not use `AsParallel` in `foreach`) and CA1877 (collapse consecutive `Path.Combine`/`Path.Join`) at warning; both stay out under the `10.0-all` pin. The C# 15 `stackalloc`-to-pointer-outside-`unsafe` preview note in the language reference (memory-safety preview) does not change PERF-15. Not otherwise measured on RC1.
- **Source-generated regex everywhere vs `RegexOptions.NonBacktracking`.** The generator falls back to a cached `Regex` for `NonBacktracking` and for `IgnoreCase` backreferences ([Regex source generators](https://learn.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-source-generators)); a pattern that needs either gets a `#pragma` with a reason rather than a `new Regex`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/performance-warnings | MS Learn: performance rules index | updated 2026-08-27 | entry point (page body is a stub; per-rule pages carry the content) |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851 | CA1851 multiple enumeration | .NET 7 rule; enabled by default in .NET 10: No | the documented "off" state versus `warning` at All |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1859 | CA1859 use concrete types | .NET 8 rule; suggestion | what it does and does not flag |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1826 | CA1826 property instead of LINQ | suggestion | `IReadOnlyList<T>` but not `IList<T>` scope |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1865-ca1867 | CA1865-CA1867 char overloads | 2023; CA1867 off by default | the three-rule split |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1870 | CA1870 cached SearchValues | 2023; threshold of five values | exact threshold |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1872 | CA1872 ToHexString | 2024; .NET 9 API in the fix | `ToHexStringLower` TFM trap |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1863 | CA1863 CompositeFormat | 2023; off by default per docs | scope: static format fields only |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1873 | CA1873 expensive logging | new in .NET 10; suggestion | pairs with CA1848 for any future logging |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1822 | CA1822 mark members static | updated 2026-03-30 | breaking-change warning and `api_surface` option |
| https://benchmarkdotnet.org/articles/guides/good-practices.html | BDN good practices | current | Release, no debugger, consume results |
| https://benchmarkdotnet.org/articles/configs/validators.html | BDN validators | current | critical validation errors stop the run |
| https://learn.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-source-generators | Regex source generators | 2025-10-20 | prefer over Compiled; fallbacks |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1040-1049 | SYSLIB1040-1049 | 2022/2024 | SYSLIB1045 meaning |
| https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex | Best practices for regular expressions | updated 2026-07-08 | static cache of 15, timeouts |
| https://learn.microsoft.com/en-us/dotnet/api/system.collections.frozen.frozendictionary-2 | FrozenDictionary API | .NET 8 to 11 | creation versus lookup cost, trusted keys |
| https://learn.microsoft.com/en-us/dotnet/api/system.enum.hasflag | Enum.HasFlag | .NET 10 view | defined as `(thisInstance & flag) == flag` |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc | stackalloc reference | 2026-06-16 | limits, no loops, span targets |
| https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return | ArrayPool.Return | .NET 10 view | double return and use-after-return are security issues |
| https://learn.microsoft.com/en-us/dotnet/csharp/how-to/concatenate-multiple-strings | Concatenate strings (canonical: /csharp/fundamentals/strings/common-tasks/concatenate) | 2026-06-24 | when `+`/interpolation versus `StringBuilder` |
| https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.defaultinterpolatedstringhandler | DefaultInterpolatedStringHandler | .NET 6 to 11 | what interpolation lowers to |
| https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/ | Performance improvements in .NET 10 | 2025 | escape analysis for delegates, boxing inlining, Frozen alternate lookup |
| https://source.dot.net/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetCore.Analyzers/Runtime/AvoidConstArrays.cs.html | CA1861 analyzer source | current | operation kinds registered: why collection expressions escape |
| exemplars (not counted): `dotnet__BenchmarkDotNet@61ebda8a50ae` `JitOptimizationsValidator.cs`, `DefaultConfig.cs`, `BenchmarkRunnerClean.cs`; `StackExchange__StackExchange.Redis@e7c43a269f53` benchmarks and `RespReader.cs`; `npgsql__npgsql@9c47244547c2` benchmarks; `MessagePack-CSharp__MessagePack-CSharp@242bdad51f89` reader; `Humanizr__Humanizer@4574b93883bf` Frozen/GeneratedRegex/SearchValues; `nodatime__nodatime@4dd26f1ddfa7` `NodaTime.Benchmarks`; `meziantou__Meziantou.Analyzer@161b7e948ad3` README rules | real source | the idioms as shipped | file:line cited inline |
