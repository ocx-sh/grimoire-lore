---
title: "C# performance: what agents get wrong (CS-PERF)"
topic: csharp-performance -> csharp-quality/performance.md
model: claude-opus-5-5
consolidates:
  - csharp-performance/csharp-performance-allocation-and-analyzers.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-language-shape.md
  - csharp-topic-map.md
  - csharp-build.md, csharp-security.md, csharp-packaging.md, csharp-language.md, csharp-process.md, csharp-crossplatform.md, csharp-async.md, csharp-observability.md (cross-checked, not re-decided)
date: 2026-10-11
---

# C# performance: what agents get wrong (CS-PERF)

`$FIX` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-performance-allocation-and-analyzers/` (sub-artifact fixtures, abbreviated [AA]).
`$C` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-performance/` (this consolidation).
`$R` = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`.
`rg` is ripgrep. In this harness the bare name is rewritten to GNU grep, so every watched run used `/home/mherwig/.ocx/toolchain/active/bin/rg`.
Timings are from WSL2 (Linux x64, .NET 10.0.12, BenchmarkDotNet 0.15.8). Treat them as ratios. `Allocated` values are exact.

## Verdict

1. **The CA18xx gate is already complete. Do not tune it.** At `10.0-all`, all 64 CA18xx rules are `warning`, so CS-BUILD's TWAE makes them errors with no per-rule line [AA §1]. CS-PERF adds three `.globalconfig` lines and nothing else: `SYSLIB1045 = warning`, `CA1822.api_surface = private, internal`, and `CA1867 = none`.
2. **CA1867 joins CS-BUILD-12's list of repo-wide `none` IDs, which grows from five to six.** *Conflict:* CS-BUILD-12 closes that list at five; [AA] wanted CA1867 off. I measured that CA1867 fires on `StartsWith("a", OrdinalIgnoreCase)`, and its only suggestion, `StartsWith('a')`, is case-sensitive (`$C/p1867`). Under TWAE the gate would push an agent into a behaviour change, so the rule goes.
3. **Every regex with a literal pattern is `[GeneratedRegex(pattern, options, matchTimeoutMilliseconds: 1000)]`.** *Conflict:* CS-SEC-03 allows `new Regex(p, o, TimeSpan)` and the static 4-argument overloads. Those are exactly the forms SYSLIB1045 cannot see: both built clean in `$C/rx-red` and `$C/rx-tt`. The generator form meets CS-SEC-03 (timeout ≤ 1 s) and SYSLIB1045 at once. CS-SEC-03 is narrowed so its `TimeSpan` forms are only for runtime patterns.
4. **The real gaps are syntax forms the analyzers do not see.** Each gets an `rg` check that was watched red and green:
   - collection-expression arguments (CA1861 blind);
   - target-typed `new(...)` Regex fields, which [AA]'s own rg missed;
   - comparing case-normalised copies through `Equals` or `Contains` (CA1862 blind);
   - LINQ inside loops;
   - `ArrayPool` return outside `finally`;
   - an uncapped `stackalloc`.
5. **The gate can steer an agent into a gap.** IDE0300 (raised by CS-LANG-21) and CA1861 fire together on `new[] {...}` inside a loop. The IDE0300 fix is `[...]`, which silences both diagnostics and still allocates 48 B per iteration (`$C/ca1861-*`, `$C/alloc-probe`). CS-LANG-21 stays. CS-PERF-04 closes the hole.
6. **Folklore rewrites are banned unless a benchmark shows a gain.** These are the ones the benchmarks contradict:
   - `StringBuilder` for 4 parts is 2x slower than interpolation.
   - `HasFlag` is a JIT intrinsic (0.37 ns, 0 B).
   - Frozen collections are 6-7x dearer to build, and 1.44x slower on misses at 1000 keys.
   - `Any()` versus `Count > 0` differs by 0.47 ns.
   
   Analyzer clean-ups (CA1860, CA1829, CA1865) are committed as clean-ups and never described as "faster".
7. **The SDK never merges a benchmarks project.** *Conflict:* [AA] offered "keep it with a dry smoke in CI, or delete it". Decided against keeping it, because a small JSON decode takes 0.56 µs while a trivial process spawn takes 822 µs (1,465x) [AA §10], so managed code is invisible next to the child process. A claim carries its BDN class and table in the PR body, and the project is dropped before merge. A squash merge would lose a commit-and-delete anyway.
8. **Hex is not a CS-PERF rule.** *Conflict:* [AA] PERF-06 put `Convert.ToHexStringLower` behind `#if NET9_0_OR_GREATER`. CS-BIN-07 already bans that API in `src` and compares digests as bytes. CS-BIN wins: it is the only hex site, it runs once per install, and a TFM fork to save 30 ns is not worth it. CA1872 in the gate catches the `BitConverter` idiom.
9. **MA0110 is optional.** *Conflict:* [AA] closes the regex timeout gap with Meziantou MA0110. Adopting Meziantou is still an owner decision, CS-PROC said no to it, and CS-API, CS-ASYNC and CS-LANG add it. CS-PERF-03 relies only on the watched `rg`. If the owner adopts Meziantou, `dotnet_diagnostic.MA0110.severity = warning` costs one line [AA V4].
10. **Cut from [AA]'s 22 candidates to 9.** Cited, not restated:
    - culture: CS-XP-07;
    - ValueTask: CS-ASYNC-04;
    - CA1848/CA1873: CS-OBS;
    - CA1849: CS-ASYNC;
    - CA1869: CS-JSON (no runtime options);
    - hex: CS-BIN-07.

    Dropped as common knowledge, or with no SDK site: `Try*` instead of catching `FormatException`, `params object[]`, SearchValues (CA1870 is complete), and per-TFM reading (CS-CI builds both legs). These still appear under failure modes with their check.

## The ruleset

Gate: CS-BUILD `AnalysisLevel 10.0-all` plus `TreatWarningsAsErrors`. Under it, `warning` means a build error. The ID column shows the analyzer's severity under that gate.

### CS-PERF-01 (MUST): keep every CA18xx rule at its `10.0-all` severity

- **Rule:** never add a CA18xx severity line, `NoWarn` entry or downgrade, apart from the two CS-PERF-02 lines. Fix the site. A justified exception gets a site `#pragma warning disable CA18xx // reason` (CS-BUILD-12).
- **Rationale:**
  - On hand-written libraries the full set is quiet: 8-33 one-line hits on Serilog, Spectre.Console and CliWrap, and 0 on simple-exec [AA §2].
  - The noise an agent wants to silence is CA1805 on generated-style models (679 hits in `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Core/HttpResponse.cs:35`). There the fix is to delete `= default;`.
  - CA1851 shows "enabled by default: No" in the docs but is `warning` at All (`analysislevel_10_all.globalconfig:363`), so it is in the gate.
- **IDs:** CA1802-CA1875 (64 rules), all `warning` (error under the gate).
- **Verify:**
  - `rg -n '^[^#]*CA18[0-9]{2}' .globalconfig .editorconfig | rg -v -e 'CA1822\.api_surface = private, internal' -e 'CA1867\.severity = none'` prints nothing.
  - CS-BUILD-12's `NoWarn` grep prints nothing.
- **Watched:** yes. `$C/cfg-red` printed `22:dotnet_diagnostic.CA1851.severity = none` and `23:dotnet_diagnostic.CA1805.severity = suggestion`. `$C/cfg-green` printed nothing.
  - CS-BUILD-12's `awk` check passed the red file, because any comment line above a `none` satisfies it. This check closes that hole.

### CS-PERF-02 (MUST): add exactly three performance lines to the CS-BUILD `.globalconfig`

```ini
# CS-PERF-02: SYSLIB1045 ships with the regex generator, sits outside every analysislevel file, and is Info by default.
dotnet_diagnostic.SYSLIB1045.severity = warning
# CS-PERF-02: making a shipped public instance member static is a breaking change; gate only the non-public surface.
dotnet_code_quality.CA1822.api_surface = private, internal
# CS-PERF-02: CA1867 fires on StartsWith("a", OrdinalIgnoreCase); its char-overload fix is case-sensitive, and it has no code fix.
dotnet_diagnostic.CA1867.severity = none
```

- **Rationale:**
  - SYSLIB1045 is silent unless raised. The red file had 17 errors without the line and 18 with it [AA V2].
  - CA1822 is documented as breaking for visible members [AA §3]. With the option set, 2 errors dropped to 1 (internal only) [AA V3].
  - CA1867, measured in `$C/p1867`, also flagged the letter case `P.cs(6,58)` and the symbol case `(8,58)`. CA1865 still catches the safe `Ordinal` case `(10,59)`.
  - CS-BUILD-12's repo-wide `none` list becomes CA1062, CA1308, CA1716, CA1303, VSTHRD003 and CA1867.
- **Verify:**
  - `rg -c -e '^dotnet_diagnostic\.SYSLIB1045\.severity = warning$' -e '^dotnet_code_quality\.CA1822\.api_surface = private, internal$' -e '^dotnet_diagnostic\.CA1867\.severity = none$' .globalconfig` prints `3`.
  - Canary: a public instance member, an internal instance member and `StartsWith("(", OrdinalIgnoreCase)` build with exactly one error, CA1822 on the internal member.
- **Watched:** yes.
  - `$C/cfg-green`: the count printed `3`.
  - `$C/p1867`: exit 1 with CA1867 ×2 and CA1865 ×1.
  - `$C/p1867-green` (CA1867 `none`; `StartsWith('(')` for the ordinal case): exit 0.
  - [AA] V2 and V3 cover the other two lines.

### CS-PERF-03 (MUST): every regex with a literal pattern is a `[GeneratedRegex(pattern, options, matchTimeoutMilliseconds: 1000)]` partial member

- **Rule:**
  - Never write `new Regex(...)`, a target-typed `Regex X = new(...)`, a static `Regex.IsMatch/Match/Matches/Replace/Split/Count/EnumerateMatches(...)` call, or `RegexOptions.Compiled`.
  - A runtime-built pattern, which can only be `Regex.Escape` output (CS-SEC-03), is a single `static readonly Regex` with a `TimeSpan` timeout. Its line carries the marker `// CS-PERF-03: runtime pattern`.
- **Rationale:**
  - Per-call construction costs 836 ns and 2,232 B. The static cache costs 46 ns and 0 B, and the generator 21 ns and 0 B [AA §7].
  - SYSLIB1045 is silent on the `TimeSpan` overloads [AA V6]. Those are the forms CS-SEC-03 used to prescribe, and an agent writes them after being told "add a ReDoS timeout".
  - The generator meets CS-SEC-03 and CS-LANG-25 (partial only with a generator attribute).
- **IDs:** SYSLIB1045 `warning` (from CS-PERF-02); RS0030 on the CS-SEC-03 ban list.
- **Verify:** `rg -n -e 'new Regex\(' -e 'Regex\s+\w+\s*=\s*new\s*\(' -e '\bRegex\.(IsMatch|Match|Matches|Replace|Split|Count|EnumerateMatches)\(' -e 'RegexOptions\.Compiled' --glob '*.cs' src | rg -v 'CS-PERF-03: runtime pattern'` prints nothing.
- **Watched:** yes. The build was green on every twin under the CS-SEC-03 ban lines, so only the rg separates them.
  - `$C/rx-red`: build exit 0, rg hits `R.cs:8` (`new Regex(..., TimeSpan)`) and `R.cs:12` (static 4-argument `IsMatch`).
  - `$C/rx-tt`: build exit 0, rg hits `R.cs:8` (`= new(..., TimeSpan)`). [AA]'s pattern without `Regex\s+\w+\s*=\s*new` missed this line.
  - `$C/rx-green`: build exit 0, rg prints nothing.

### CS-PERF-04 (SHOULD): hoist constant array arguments to `static readonly` fields, or take `ReadOnlySpan<T>`, including collection-expression arguments

- **Rationale:**
  - CA1861 registers only array-creation and invocation operations, so a `[...]` argument escapes it ([AvoidConstArrays.cs](https://source.dot.net/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetCore.Analyzers/Runtime/AvoidConstArrays.cs.html)).
  - The IDE0300 fix steers code into exactly that form.
  - Measured with `GC.GetAllocatedBytesForCurrentThread` (exact, `$C/alloc-probe`, `dotnet run -c Release`) over 1,000 iterations:
    - `Has(["a","b","c"], s)` into a `string[]` parameter: 48,000 B;
    - a hoisted `static readonly` field: 0 B;
    - a `ReadOnlySpan<string>` parameter: 0 B.
- **IDs:** CA1861 `warning`; IDE0300 `warning` via CS-LANG-21.
- **Verify:** `rg -n -P '[(,]\s*\[\s*["\x27\d-]' --glob '*.cs' src` lists literal collection-expression arguments. Each hit must be outside a loop, or bound to a `ReadOnlySpan<T>` parameter.
- **Watched:** yes.
  - `$C/ca1861-red` (`new[] {...}` in a loop): build exit 1 with `C.cs(11,21) CA1861` and `IDE0300`.
  - `$C/ca1861-agentfix` (the IDE0300 rewrite): build exit 0, and the rg hits `C.cs:11`.
  - `$C/ca1861-green` (hoisted): build exit 0, and the rg prints nothing.

### CS-PERF-05 (SHOULD): compare case-insensitively with a `StringComparison`/`StringComparer`, never by normalising both sides

- **Rule:**
  - Use `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)`, `Contains(k, StringComparer.OrdinalIgnoreCase)`, or a `Dictionary`/`HashSet` built with `StringComparer.OrdinalIgnoreCase`.
  - `ToUpperInvariant`/`ToLowerInvariant` produce output values (CS-XP-07; OCI references per CS-BUILD-12's CA1308). They are never inputs to `==`, `Equals`, `Contains`, `StartsWith` or a lookup.
- **Rationale:**
  - The pair `ToLowerInvariant` and `==` costs 21.5 ns and 48 B; `OrdinalIgnoreCase` costs 15.6 ns and 0 B [AA §4]. On ASCII the result is the same.
  - CA1862 catches the `==` forms but not normalised copies passed to `Equals(..., Ordinal)` or to a collection's `Contains`.
  - The Python SDK's `key.upper()` env matching (ocx-cli-contract §6 line 108) ports straight into that blind form.
- **IDs:** CA1862 `warning`. CA1304, CA1309, CA1311 and CA1307 belong to CS-XP and are not restated.
- **Verify:** `rg -n -P -e '\b(Equals|Contains|ContainsKey|TryGetValue|IndexOf|StartsWith|EndsWith|Remove)\([^;]*\.To(Upper|Lower)(Invariant)?\(\)' -e '\.To(Upper|Lower)(Invariant)?\(\)\s*(==|!=|\.(Equals|Contains|StartsWith|EndsWith)\()' --glob '*.cs' src` prints nothing.
- **Watched:** yes.
  - `$C/case-red`: the build exited 1 with CA1862 only at `K.cs(6,51)` and `(8,51)`. `K.cs:10` (`string.Equals(a.ToUpperInvariant(), b.ToUpperInvariant(), Ordinal)`) and `K.cs:12` (`keys.Contains(k.ToUpperInvariant())`) were silent. The rg hit all four lines.
  - `$C/case-green`: build exit 0, rg exit 1 (no output).

### CS-PERF-06 (MUST): pooled and stack buffers

- **Rule:**
  - Each `ArrayPool<T>.Shared.Rent` has exactly one `Return`, inside `finally`, with no use after it.
  - A rental that ever held stdin secret bytes (CS-PROC-08 and CS-PROC-12) returns with `clearArray: true`.
  - `stackalloc` targets a `Span<T>`, has a constant size or a `<= const` guard, and never sits in a loop.
  - Stream data never goes on the stack. The CS-PROC-10 cap is 16 MiB.
- **Rationale:**
  - The ArrayPool docs call a double return or use-after-return "a high-severity security issue" ([ArrayPool.Return](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return)). No analyzer sees either one [AA §8].
  - An uncapped `stackalloc` ends in an uncatchable `StackOverflowException`.
  - Exemplar shape: `const int MAX_STACK = 128`, a ternary to `Rent`, and a `try`/`finally` around the use (`StackExchange__StackExchange.Redis@e7c43a269f53:src/RESPite/Messages/RespReader.cs:809-822`).
- **IDs:** CA2014 (`stackalloc` in a loop) `warning` at All, measured as an error [AA V1 `Defects.cs(82,54)`].
- **Verify:**
  - `rg -U -P -n 'Shared\.Rent\((?:(?!\bfinally\b)[\s\S])*?Shared\.Return\(' --glob '*.cs' src` prints nothing.
  - `rg -n -P 'stackalloc\s+\w+\s*\[(?!\s*\d+\s*\])' --glob '*.cs' src` lists non-constant sizes. Each must sit behind a visible `<=` guard.
  - Review every `rg -n -A8 'Shared\.Rent\(' --glob '*.cs' src` hit for `clearArray: true` where the buffer held a secret.
- **Watched:** yes, re-run here on [AA]'s twins.
  - The Rent/Return rg hit `red/Defects.cs:88-89`; green printed nothing.
  - The stackalloc rg hit `sweep/Sweep3.cs:26` (`stackalloc byte[n]`); red and green printed nothing.
  - The `clearArray` review is not watched.

### CS-PERF-07 (SHOULD): per-chunk code allocates nothing it can avoid, and nothing is materialised just to count

- **Rule:**
  - Per-chunk code is the stdout/stderr pump, its `Add`, any per-line or per-chunk callback (CS-ASYNC streaming), and any loop over unbounded input.
  - That code has no LINQ, no capturing lambda, no `ToList()`/`ToArray()`, no `Enum.ToString()` and no `string +=`.
  - Nowhere write `.ToList().Count`, `.ToArray().Length`, `.ToList().ForEach` or `.ToList().Any`.
  - A parameter enumerated twice is `IReadOnlyCollection<T>`/`IReadOnlyList<T>` (CA1851).
  - One-shot code over a bounded handful, such as argv or a small report, may use LINQ.
- **Rationale** (BDN smoke runs [AA §4-§6]):
  - Over 1,000 items, `Where.Select.Sum` costs 1,991 ns and 152 B, `.ToList().Count` costs 1,423 ns and 1,544 B, and `foreach` costs 837 ns and 0 B.
  - A capturing lambda inside a loop allocated 664 B over 10 iterations.
  - 200 `+=` appends cost 50.7 µs and 585 KB; `StringBuilder` costs 1.4 µs and 7.7 KB.
  - `Enum.ToString()` costs 30 ns and 72 B.
  - .NET 10 escape analysis shrinks delegate allocations, but the closure object stays, and the net8.0 floor lacks the optimisation.
- **IDs:** CA1851 `warning` (All only); CA1826, CA1829, CA1830 and CA1834 `warning`. No ID covers a loop body.
- **Verify:**
  - `rg -n -P '\.To(List|Array)\(\)\.(Count|Length|ForEach|Any)\b' --glob '*.cs' src` prints nothing.
  - `rg -U -P -n '(?:var|string) (\w+) = (?:""|string\.Empty);\s*(?:foreach|for|while)\b[^{]*\{[^{}]*\b\1 \+= ' --glob '*.cs' src` prints nothing.
  - `rg -U -n '(foreach|for|while) ?\([^)]*\)\s*\{[^{}]*\.(Select|Where|ToList|ToArray|Any|Count|OrderBy)\(' --glob '*.cs' src` is a candidate list. It must have no hit in the pump or callback files.
- **Watched:** yes.
  - Re-run here: the ToList and LINQ-in-loop patterns hit `red/Defects.cs:61-63`, and green was clean.
  - The `+=` pattern ran red/green in [AA V8].

### CS-PERF-08 (SHOULD): do not apply rewrites the benchmarks contradict; `Frozen*` only for a `static readonly` table

- **Rule.** The following are not performance changes:
  - interpolation or `+` with about 4 or fewer parts rewritten to `StringBuilder` or `string.Create`;
  - `Enum.HasFlag` rewritten to a mask;
  - `Any()` rewritten to `Count > 0` for speed;
  - `Dictionary`/`HashSet` replaced by `FrozenDictionary`/`FrozenSet` anywhere except a `static readonly` table that is built once and read hundreds of times.
- **Rationale** (BDN 2 launches × 20 iterations [AA §4-§6]):
  - 4 string parts: interpolation 38.0 ns and 72 B; `StringBuilder` 74.4 ns and 280 B.
  - `HasFlag`: 0.37 ns and 0 B.
  - `Any()` 0.90 ns against `Count > 0` 0.43 ns.
  - Frozen construction is 7.1x the time and 2.8x the memory at 8 keys. At 1000 keys a hit is a tie and a miss is 1.44x slower. Break-even at 8 keys is about 360 hits.
- **IDs:** CA1860 and CA1829 `warning`. Those are clarity fixes and are labelled so (CS-PERF-09).
- **Verify:**
  - `rg -n 'ToFrozen(Dictionary|Set)\(' --glob '*.cs' src | rg -v 'static readonly'` prints nothing. The initializer goes on the declaration line.
  - `rg -n 'new StringBuilder\(' --glob '*.cs' src` is a reading list: each hit needs a loop or an unknown part count.
- **Watched:** yes. The Frozen rg was run here.
  - `$C/frozen-red` hit `F.cs:7` (a per-call `ToFrozenDictionary`).
  - `$C/frozen-green` (a `static readonly` initializer) printed nothing.
  - The StringBuilder list is a reading heuristic and was not watched.

### CS-PERF-09 (SHOULD): any claim that a change is faster or allocates less carries the procedure's BDN table

- **Rule:**
  - A time claim is accepted only when the effect is above 20% and the Error intervals do not overlap.
  - An allocation claim is accepted at any size, because `Allocated` is deterministic.
  - An analyzer-driven change is described as a clean-up.
- **Rationale:**
  - ShortRun rows printed sub-nanosecond means with Error larger than the mean, plus `ZeroMeasurement` and `MultimodalDistribution` footers. Those rows are noise, not evidence [AA §9.8].
  - Every agent "perf" PR in the failure list below rests on such a row or on folklore.
- **Verify:** `git log origin/main..HEAD --format=%B | rg -i -e 'faster' -e 'speed ?up' -e 'fewer alloc' -e 'reduc\w* alloc' -e 'optimi[sz]'`. When it hits, the PR body must contain a BDN table with an `Allocated` column.
- **Watched:** no. This is a reading heuristic.

### Procedure: when a performance claim needs proof

These are steps, not rules. CS-PERF-09 triggers them. Each "exits 0" trap below was measured [AA §9].

1. **Where.** Create `benchmarks/Ocx.Benchmarks/` on the PR branch:
   - `OutputType` Exe, `IsPackable=false`;
   - its own `benchmarks/Directory.Build.props` (`<Project />`) and `Directory.Packages.props`. A minimal benchmark class fails the library gate with CA1050, CA1051, CA1515 and CS1591.
   - Never put benchmarks in `src/` or in a test project. A `[Fact]` calling `BenchmarkRunner.Run` passed in 0.43 s under Debug with no measurement, and took 146 s under Release.
2. **Class.**
   - `[MemoryDiagnoser]`, and one `[Benchmark(Baseline = true)]`.
   - Inputs in fields set in `[GlobalSetup]`, and every body returns its result. Constants fold: [AA] measured a `0.0000 ns` row.
   - Use `OperationsPerInvoke` for bodies in the nanosecond range.
   - No process, file or network work. A spawn is 822 µs with Error larger than the mean. Benchmark the pump over a `MemoryStream`, not a child process.
3. **Run.**
   - Always pass `-c Release` and an explicit `--filter`. Without a filter the switcher waits on stdin, then exits 0 having run nothing.
   - Smoke: `dotnet run -c Release --project benchmarks/Ocx.Benchmarks -- --filter '*Pump*' --job short -m`. For a decision, drop `--job short`.
   - `<Configuration>Release</Configuration>` in the csproj leaves `Optimize=false`. After changing configuration properties, run `rm -rf benchmarks/Ocx.Benchmarks/bin benchmarks/Ocx.Benchmarks/obj`.
4. **Assert, do not trust exit 0.** A Debug refusal, an ambiguous project and a missing filter all exit 0. After the run, `test -n "$(ls benchmarks/Ocx.Benchmarks/BenchmarkDotNet.Artifacts/results/*-report-github.md 2>/dev/null)"` must succeed.
5. **Read.**
   - Use `Ratio`, `Error` and `Allocated`.
   - Rows with a `ZeroMeasurement`, `MultimodalDistribution` or `BaselineCustomAnalyzer` footer are not evidence. Re-run them with the default job.
6. **Land.**
   - Paste the BDN header, the table and the benchmark class into the PR body.
   - Remove `benchmarks/` before merge. On main, `test ! -d benchmarks` holds.
   - Stay on BDN 0.15.x until 0.16 is GA, and re-verify step 4 when upgrading.

## Applied to the ocx C# SDK

**New commitments (the SDK design changes for these):**

- **`.globalconfig` gets the three CS-PERF-02 lines.** CS-BUILD-12's closed list becomes six IDs. Amend CS-BUILD-12's text and its reference posture `consolidate-csharp-build/posture/.globalconfig`.
- **CS-SEC-03 is narrowed.** Its `new Regex(p, o, TimeSpan)` and static 4-argument forms stay legal only for `Regex.Escape` patterns that carry the CS-PERF-03 marker.
- **The CS-BIN-08 manifest validators take the generator form.** They are `[GeneratedRegex(@"\A[A-Za-z0-9._+-]+\z", RegexOptions.None, matchTimeoutMilliseconds: 1000)]` and `[GeneratedRegex(@"\A[0-9a-f]{64}\z", ...)]`, on an `internal static partial class` (watched in `$C/rx-green`).
- **The env scrub keeps CS-PROC's reference shape.** That shape is `Scrubbed.Contains(key, StringComparer.OrdinalIgnoreCase)` over a 7-entry `static readonly string[]` (`csharp-process.md:850`).
  - Do not port it as `key.ToUpperInvariant()` (CS-PERF-05).
  - Do not "upgrade" it to `FrozenSet`. A scan of 7 items, next to an 822 µs spawn, has no measurable cost (CS-PERF-08).
- **The pump keeps CS-PROC's `Rent`/`try`/`finally Return` shape** (`csharp-process.md:919-926`).
  - `Capture.Add` and any `IProgress`/callback path fall under CS-PERF-07.
  - If an agent later pools the bytes of an encoded password, CS-PERF-06 requires `clearArray: true`.
- **No `benchmarks/` on main.** The first PR that makes a claim follows the procedure. The first candidate is pump throughput, the only per-chunk managed work in the SDK [AA §10].

**The ocx contract forces these:**

- **Performance is counted in spawns, not nanoseconds.**
  - Decoding a 330-byte report takes 0.56 µs and a trivial spawn 822 µs [AA §10]. Real ocx adds its registry and filesystem work on top.
  - The levers a caller can see are the number of ocx processes per public call, and the handshake memoised once per client. ocx-cli-contract §5 says to "handshake once, cache" (`runtime.rs:293-338`). CS-ASYNC single-flight owns the memo.
  - Any managed micro-optimisation in argv building, decoding or the exit table therefore needs CS-PERF-09 proof, and would not survive it.
- **Payloads are bounded by contract.**
  - Reports are small JSON. The manifest is about 88 KB, read once per install (python-sdk-digest §3, `_dist.py:67`).
  - Captured streams are capped at 16 MiB (CS-PROC-10).
  - So the only unbounded loop is the pump. That is why CS-PERF-07 names the pump, not "hot paths" in general.
- **Env names are case-insensitive** (`eq_ignore_ascii_case`, ocx-cli-contract line 108). That makes CS-PERF-05 a correctness rule for the scrub, not only an allocation rule.

**The Python SDK already does these (port them):**

- Module-level compiled validators (`_NAME_RE`, `_VERSION_RE`, `_SHA256_RE`, `_dist.py:91-100`). They map to CS-PERF-03 with `\A…\z` anchors (CS-BIN-08).
- One pump per stream so neither pipe fills (`_process.py:616-631`). CS-PROC-09 keeps that structure.
- Size caps on manifest and download (`_dist.py:67,70`).
- A memoised compat gate that never re-discovers the binary (python-sdk-digest "No state caching" rule, line 262).

**Do not copy these from Python:**

- **`key.upper()` matching** (ocx-cli-contract line 108). This is the CS-PERF-05 blind form.
- **Line-by-line pump reads** (`_process.py:616-631`). The C# equivalent, `ReadLineAsync` per line, allocates a string per line and adds a newline policy. CS-PROC-09's byte pump stays.
- **Unbounded capture** (python-sdk-digest S9). CS-PROC-10 replaces it.
- **`^…$` patterns.** In .NET, `$` accepts a trailing `\n` (CS-BIN-08). Use `\A…\z` inside the generator attribute.

## AI-agent failure modes

Ranked by how often each bites: corpus frequency and gate hit counts from [AA §2], plus the reflexes listed in [AA]'s agent table.

| # | What the agent does | Why it is wrong | Check that catches it |
|---|---|---|---|
| 1 | Takes the gate's suggestion literally: IDE0300 turns `new[]{...}` into `[...]` inside a loop; CA1867 turns `StartsWith("a", OrdinalIgnoreCase)` into `StartsWith('a')`; CA1822 makes a public member `static` | Each fix compiles clean and leaves a 48 B-per-iteration allocation, a behaviour change, or a SemVer break | CS-PERF-04 rg; CS-PERF-02 lines |
| 2 | Silences a noisy CA18xx rule (CA1805 on `= default;`, CA1851) with a `.globalconfig` line or `NoWarn` | Hides every future true positive; 679 CA1805 hits on generated-style models | CS-PERF-01 rg; CS-BUILD-12 grep |
| 3 | Writes `new Regex(p)` per call, or follows a ReDoS instruction with `new Regex(p, o, TimeSpan)` / target-typed `new(...)` | 836 ns and 2.2 KB per call; SYSLIB1045 goes blind on the TimeSpan forms | CS-PERF-03 rg; SYSLIB1045 |
| 4 | Rewrites by folklore and calls it faster: StringBuilder for 3 parts, mask instead of `HasFlag`, Frozen everywhere, `Count > 0` "for performance" | Each measured slower or within noise on .NET 10 | CS-PERF-08 Frozen rg; CS-PERF-09 claim gate |
| 5 | Ports Python's `key.upper()`: `Scrubbed.Contains(key.ToUpperInvariant())`, or `Equals(a.ToUpperInvariant(), b.ToUpperInvariant(), Ordinal)` | 48 B per comparison; CA1862 is silent on these forms | CS-PERF-05 rg |
| 6 | Uses LINQ, `.ToList().Count` or a capturing lambda in the pump or a per-line callback | 2.4x the time of the foreach and 10x the memory per chunk | CS-PERF-07 rgs |
| 7 | Iterates with `-f net10.0` only, then the net8 leg fails: CA1842/CA1843 fire only on net8.0, and `Convert.ToHexStringLower` gives CS0117 | The analyzer's verdict and its suggested fix differ per TFM [AA §1, V5] | build without `-f` (both TFMs); CS-BIN-07 rg |
| 8 | Runs BDN in Debug, without `--filter`, inside an xUnit test, or relies on `<Configuration>Release</Configuration>`, sees exit 0 and reports a result | No measurement was taken | Procedure step 4 (report-file assertion); step 1 (`rg -l BenchmarkDotNet --glob '*.csproj' src tests` prints nothing) |
| 9 | Returns a rented array twice, or after a `catch`; `stackalloc byte[n]` with `n` from input | Use-after-free class bug; uncatchable stack overflow | CS-PERF-06 rgs; CA2014 |
| 10 | Adds `params object[]` helpers, or wraps `int.Parse` in `catch (FormatException)` (dropped as rules) | 16.5 ns / 48 B against 1.3 ns / 0 B; 2.3 µs against 4 ns (556x) | `rg -n 'params object\[\]' --glob '*.cs' src`; `rg -n -e 'catch (FormatException' -e 'catch (OverflowException' -e 'catch (InvalidCastException' -e 'catch (KeyNotFoundException' -F --glob '*.cs' src`. Both were re-run here on [AA]'s twins: red hit `Defects.cs:97` and `:100`, and green printed nothing. |

## Failure classes

| Class | Mechanism | Modes | Check |
|---|---|---|---|
| **A. Gate-steered regression** | An analyzer's suggested fix is wrong in context, or moves the code into another analyzer's blind spot | 1, 7 | Deviate where the fix is wrong (CS-PERF-02). Pair every steering rule with an rg twin (CS-PERF-04). Build every TFM. |
| **B. Blind syntax form** | The rule exists but misses a form: collection expressions, target-typed `new`, `TimeSpan` overloads, normalised copies passed to `Equals`/`Contains`, loop bodies | 3, 5, 6 | One rg per form, watched red/green (CS-PERF-03/04/05/07). |
| **C. Folklore from an older runtime** | Advice from .NET Framework, or from before interpolation handlers and Frozen collections, applied without measuring | 4, 10 | Claim gate plus procedure (CS-PERF-09); Frozen rg. |
| **D. Silent configuration drift** | A severity line or `NoWarn` removes a rule with exit 0 | 2 | CS-PERF-01 rg (comment-proof, unlike CS-BUILD-12's awk). |
| **E. Exit-0 non-measurement** | The tool refuses or never runs, and returns success | 8 | Assert the report file exists (procedure step 4). |
| **F. Unchecked buffer ownership** | Pool or stack memory with no analyzer coverage | 9 | CS-PERF-06 rgs; CA2014. |

## Open questions

**Owner decisions:**

1. **Meziantou adoption** (cross-cutting; the topic map lists it as owner-gated). If adopted, add `dotnet_diagnostic.MA0110.severity = warning` as a second check under CS-PERF-03. If not, nothing in CS-PERF changes.
2. **Benchmarks never merged (Verdict 7).** This is the program's default. If the owner wants a standing `benchmarks/` for pump regressions, it needs a non-required CI job that runs `--job dry` plus the procedure step 4 assertion, and a CPM/NuGetAudit carve-out for BDN's transitive graph.

**Cross-file amendments this file imposes** (program-internal, already decided here):

- CS-BUILD-12: the repo-wide `none` list grows to six IDs.
- CS-SEC-03: literal patterns use the generator form only.

Both are needed because SYSLIB1045 and CA1867 were measured. The CS-BUILD and CS-SEC rule files must be edited to match.

**Another research round:**

- **csharp-performance-net8-floor.** Do CS-PERF-07's closure and LINQ numbers hold on net8.0, where .NET 10's delegate escape analysis is absent? Do the Frozen ratios hold on net8's Frozen implementation? Everything here was measured on .NET 10.0.12 only.
- **csharp-build-analyzer-gate at .NET 11 GA** (already tracked by CS-BUILD). Do CA1876 and CA1877 (new at `11.0-all`, absent under the `10.0-all` pin) fire on SDK-shaped code, and does CA1861 learn collection expressions? If it does, CS-PERF-04's rg can go.
- **BenchmarkDotNet 0.16 GA.** Re-verify the Debug-refusal exit code and the `--filter` prompt, which are procedure steps 3 and 4.

## Sub-artifacts

- [csharp-performance/csharp-performance-allocation-and-analyzers.md](csharp-performance/csharp-performance-allocation-and-analyzers.md): covers four things.
  - The 64 CA18xx rules by level, and their noise on 6 exemplars.
  - The three deviations and four gaps.
  - BDN numbers for strings, LINQ, Frozen, boxing, Enum, regex, exceptions and buffers.
  - The BenchmarkDotNet exit-0 traps, and why an I/O-bound SDK needs no benchmarks project. 18 red/green pairs.

**Consolidation fixtures** (`$C`), each built with `$R dotnet build --no-incremental -nologo -v:q` under the CS-BUILD posture plus five CS-SEC-03 regex ban lines:

| Fixture | Result |
|---|---|
| `p1867`, `p1867-green` | exit 1 → 0 |
| `rx-red`, `rx-tt`, `rx-green` | exit 0, 0, 0; rg 2 hits, 1 hit, 0 hits |
| `ca1861-red`, `ca1861-agentfix`, `ca1861-green` | exit 1, 0, 0; rg 0, 1, 0 hits |
| `case-red`, `case-green` | exit 1, 0; rg 4 hits, 0 hits |
| `cfg-red`, `cfg-green` | rg 2 lines, 0 lines |
| `frozen-red`, `frozen-green` | rg 1 hit, 0 hits |
| `alloc-probe` | 48,000 / 0 / 0 B |

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/performance-warnings: the CA18xx index.
2. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1822: the breaking-change note and the `api_surface` option.
3. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1865-ca1867: the three char-overload rules, and CA1867 shipping disabled.
4. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851: multiple enumeration ("enabled by default: No", yet `warning` at All).
5. https://source.dot.net/Microsoft.CodeAnalysis.NetAnalyzers/Microsoft.NetCore.Analyzers/Runtime/AvoidConstArrays.cs.html: why CA1861 cannot see collection expressions.
6. https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1040-1049: SYSLIB1045 and its Info default.
7. https://learn.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-source-generators: the generator over `Compiled`, `matchTimeoutMilliseconds`, and the fallbacks.
8. https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-regex: the 15-entry static cache and timeouts.
9. https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return: double return and use-after-return are "a high-severity security issue".
10. https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc: caps, no loops, `Span<T>` targets.
11. https://learn.microsoft.com/en-us/dotnet/api/system.collections.frozen.frozendictionary-2: construction cost against lookup, and trusted keys.
12. https://learn.microsoft.com/en-us/dotnet/csharp/how-to/concatenate-multiple-strings: `+` and interpolation for small fixed sets, `StringBuilder` for unknown counts.
13. https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/: delegate escape analysis, boxing-aware inlining, Frozen alternate lookup.
14. https://benchmarkdotnet.org/articles/guides/good-practices.html: Release builds only, consume results, no debugger.
15. https://benchmarkdotnet.org/articles/configs/validators.html: a critical validation error stops the run (which exits 0).
