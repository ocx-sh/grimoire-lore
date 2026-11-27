---
title: .NET 11 runtime, BCL and SDK test behaviour delta (GA vs RC1)
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 22
---

# .NET 11 runtime, BCL and SDK test behaviour delta

Scope: the claims of the csharp-quality pair that depend on the .NET 11 runtime, BCL, `dotnet test` and the analyzers. Compiler and System.Text.Json changes, the SDK pin, `AnalysisLevel` and the TFM choice are out of scope. This is a delta against the baseline of 2026-10-11. Nothing was measured: no .NET 11 SDK exists on the research host (`dotnet` is not installed), so every verdict below is from documentation and release notes, and each is marked "documented" rather than "measured".

Release timeline in the window (source: dotnet/core release-notes/11.0 README): RC2 2026-10-13, RC3 2026-10-25 (out-of-band security update, Brotli CVE), GA 11.0.0 on 2026-11-10 with SDK 11.0.100. The baseline pair measured SDK 11.0.100-rc.1 (2026-09-08).

## Summary

- Process API names are unchanged between RC1 and GA. No RC2, RC3 or GA note adds, renames or removes `Process.Run`, `RunAndCaptureText`, `KillOnParentExit` or the rest of the family. The family shipped in previews 4 to 7 and RC1.
- `KillOnParentExit` GA scope: Windows (job object) and Linux and Android (`prctl(PR_SET_PDEATHSIG)`). Not macOS, not other Unix. The "What's new" libraries page still says "Windows only" and is stale; the API reference page is right.
- `posix_spawn` is an Apple-only change (macOS and Mac Catalyst), made in the Process API post of 2026-05-13, before the window. It is not a Linux change.
- Runtime-async is not documented as on by default for `net11.0`. The GA runtime page gives `<Features>runtime-async=on</Features>` as the way to enable it. The same page also names `<UseRuntimeAsync>false</UseRuntimeAsync>` as an opt-out, which contradicts an opt-in default. Verdict: could not determine the default; the safe reading is opt-in.
- The exit-8 all-skipped behaviour holds on GA and is now documented: with the .NET 11 SDK and no global minimum, an all-skipped whole run exits 8 regardless of the per-module `--zero-tests-policy`.
- CA1876 and CA1877 are "As suggestion" at GA in .NET 11 and "No" in .NET 10. Neither hits a pattern the depth files prescribe, as far as the file text read shows.
- CA1861 documentation still shows only `new[] {…}` examples and says nothing about collection expressions. Whether the analyzer learned collection expressions: could not determine.
- The `.NET 10 removed the default SIGTERM handler` claim: no .NET 11 breaking-change entry touches SIGTERM or `ProcessExit`. Unchanged, but not re-measured on 11.
- No new analyzer in the GA SDK notes changes a prescribed pattern. CA1873 got fewer false positives and an `AnalysisLevel=latest` fix; both belong to `dotnet-build` and CS-OBS territory and are noted only.

## Findings, per claim

### 1. processes.md:32 and the csharp-process open questions

Old text: "CS-PROC-23 is retired, not reused: the .NET 11 process APIs (`Process.Run`, `RunAndCaptureText`, `KillOnParentExit`) are a `dotnet-upgrade` re-check, and no such code compiles until a `net11.0` leg exists (`CS-LANG-16`)."

Verdict: unchanged. Every API name in the sentence is real at GA.

Evidence:
- `Process.Run`, `RunAsync`, `RunAndCaptureText`, `RunAndCaptureTextAsync` landed in Preview 4 ([libraries notes preview 4](https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview4/libraries.md), 2026-05-12). The GA "What's new in libraries" page lists the same set ([learn.microsoft.com libraries, GA](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries), page updated for GA 2026-11-10).
- Later additions are additive and pre-window: `ReadAllLines` and Linux `KillOnParentExit` (Preview 5), `silent` parameter on `Run` and `RunAsync` plus `StartSuspended` on Windows (Preview 6), `arguments` widened to `IEnumerable<string>?` and `StartSuspended` on macOS (Preview 7), `Process.Signal` and `WaitForExitStatus` family (RC1, `ProcessExitStatus`).
- Release notes for RC2 (2026-10-13) and RC3 (2026-10-25) list no Process change. RC2 libraries notes cover CBOR, ML-KEM, HPKE, DataAnnotations and HTTP/2 only. The GA 11.0.0 note carries only the package list and CVE notice.
- One signature change worth knowing for any future `net11.0` leg: the `fileName` overloads of `Run` and `RunAsync` gained `bool silent = false` before the other optional parameters in Preview 6, so positional calls written against Preview 4 or 5 samples break.

Open question "host-death containment via `KillOnParentExit`": answerable now. Per the [API reference for `ProcessStartInfo.KillOnParentExit`, net-11.0](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0) (page updated 2026-10-16): supported on android, linux and windows only; cannot be combined with `UseShellExecute = true`; Windows uses a job object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, Linux and Android use `prctl(PR_SET_PDEATHSIG)`. The [Process API post](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/) (2026-05-13) adds that a dedicated thread spawns these processes on Linux so the signal is not tied to a pool thread, and that other Unix platforms, macOS included, are not supported yet. Consequence for the pair: the pair's macOS leg gets no host-death containment from this API, so the process rules' own tree-kill (`CS-PROC-14`, `CS-PROC-18`) stays the only mechanism there.

Doc conflict: the GA libraries page still says "`ProcessStartInfo.KillOnParentExit` (Windows only)". The API reference, the Preview 5 note ([dotnet/runtime #127112](https://github.com/dotnet/runtime/pull/127112)) and the blog agree on Linux and Android; treat the libraries page as stale.

Open question "the .NET 11 `posix_spawn` switch": answered in scope. The Process API post says `Process` moved from `fork` plus `exec` to `posix_spawn` on Apple platforms (macOS and Mac Catalyst) to support `ProcessStartInfo.InheritedHandles`, and does not mention Linux. A web search surfaced [dotnet/runtime #126063](https://github.com/dotnet/runtime/pull/126063) (opened 2026-03) only through a mirror: Apple targets except Mac Catalyst and tvOS, with a fallback to fork and exec when credentials must change. The mirror was not the primary page, so the exact PR scope is "could not determine"; the blog's statement is the citable one. The effect on inherited-handle behaviour on macOS stays unmeasured, which matches the existing `unverified: not run` macOS stance.

### 2. processes.md:136 (SIGTERM and ProcessExit)

Old text: ".NET 10 removed the default SIGTERM handler: `ProcessExit` ran on net8.0 and did not run on net10.0, and the exit code stays 143 (measured 2026-10-11)."

Verdict: unchanged. The [Breaking changes in .NET 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11) page (updated 2026-11-23) lists no entry for SIGTERM, `ProcessExit`, `Console.CancelKeyPress` or `PosixSignalRegistration`. The Process API post does not mention `ProcessExit`. No evidence of a change in .NET 11, and no evidence that it was re-checked on 11 either: net11.0 behaviour is "could not determine" until measured.

Adjacent new API, not a change to the claim: `Process.Signal(PosixSignal)` and `Process.WaitForExitStatus*` returning `ProcessExitStatus` (RC1, [dotnet/runtime #131165](https://github.com/dotnet/runtime/pull/131165)) distinguish exit from signal termination; relevant to the 143 exit-code reading only on a future `net11.0` leg.

### 3. async.md:10, async.md:52 and the runtime-async open question

Old text (line 10): ".NET 11 runtime-async is covered where a row says so." Old text (line 52): "Same on 11.0.100-rc.1 with runtime-async on."

Verdict for line 10: unchanged. Verdict for line 52: unchanged but the label should name what "on" meant.

Evidence:
- GA runtime page ([What's new in the .NET 11 runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime), updated 2026-11-12): "To enable Runtime Async in a project that targets `net11.0`, add `<Features>runtime-async=on</Features>`." A `net11.0` project no longer needs `<EnablePreviewFeatures>true</EnablePreviewFeatures>` (Preview 3 change, [preview 3 runtime notes](https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview3/runtime.md)). This answers the question of what RC1 "on" meant: the `Features` switch, not a default.
- The same page says the `DOTNET_RuntimeAsync` and `UNSUPPORTED_RuntimeAsync` environment variables were removed (Preview 4) and that a project opts out with `<UseRuntimeAsync>false</UseRuntimeAsync>`. An opt-out property suggests a default-on state for some project shape, but no page found says `UseRuntimeAsync` defaults to true for an SDK-style `net11.0` application. The compiler side is another brief. Verdict on "is runtime-async on by default for net11.0": could not determine; documentation recipe is opt-in.
- The runtime libraries themselves are compiled with `runtime-async=on` since Preview 4 ([preview 4 runtime notes](https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview4/runtime.md), 2026-05-12). So a consumer's own code being compiled the old way still awaits runtime-async BCL tasks. That is the existing single-flight and `ForceYielding` surface, not new at GA.
- No RC2, RC3 or GA note reports a change to runtime-async semantics. RC2 runtime notes are file locking and bug fixes only. Preview 7 added tiered async compilation and `await Task.Yield()` allocation savings in runtime-async paths ([preview 7 runtime notes](https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview7/runtime.md), 2026-08-11), which predates RC1 and the baseline.
- The GA notes mention that the async profiler now instruments both models and that continuations can skip `ExecutionContext` capture and restore when nothing needs restoring (a Task-level change in preview 6). Neither changes `SynchronizationContext` capture, so the CS-ASYNC-06 deadlock table has no documented reason to change.

Open question (does a native `net11.0` build with runtime-async keep the single-flight matrix, `ForceYielding` and the CS-ASYNC-06 deadlock table): could not determine. No source states either way and nothing was measured on GA. Do not edit the rows; keep the question open and re-measure with an SDK 11.0.100 GA run.

### 4. testing.md:30 (exit 8 on an all-skipped whole run)

Old text: "Gap: SDK 11.0.100-rc.1 fails an all-skipped whole run with exit 8, SDK 10.0.401 exits 0 (measured 2026-10-11). The per-module minimum of `CS-TEST-06` fails both."

Verdict: changed in status only. The behaviour holds at GA and is now a documented contract, not an RC observation. The version label "11.0.100-rc.1" should become "11.0.100 (GA)" once re-measured; until then keep "rc.1" as the measured point and cite the doc for GA.

New facts:
- [dotnet test with MTP](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp) (updated 2026-11-20): "When you don't set a global minimum, the .NET 11 SDK determines the whole-run zero-tests verdict separately. An all-skipped whole run exits with code 8 regardless of the per-module `--zero-tests-policy` value." Per-module default is `--zero-tests-policy allow-skipped` (MTP 2.3.0 and later), under which an all-skipped module exits 0.
- A module that matches no tests exits 8 but is normalised to success before aggregation, so one empty module does not fail a whole run; the module keeps an `Exit code: 8` line in the output.
- [MTP troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting) (updated 2026-09-22): exit 8 means no tests discovered, or every selected test skipped under strict policy; exit 9 means an explicit `--minimum-expected-tests` was not met; "this whole-run zero-tests verdict requires the .NET 11 SDK or a later version"; `--ignore-exit-code 8` or `TESTINGPLATFORM_EXITCODE_IGNORE` suppresses it. Whole-run minimum counts skipped tests; per-module minimum does not, which is why the existing sentence "the per-module minimum of `CS-TEST-06` fails both" still reads correctly on the per-module side. The whole-run minimum (before `--`) would pass on skipped tests, a nuance the file may want to state.
- Release note: the GA SDK page lists "whole-run zero-test verdict logic" under reporter and artifacts improvements ([What's new in the SDK, GA](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk), updated 2026-11-17).
- New exit codes in `dotnet test` for .NET 11: `--timeout` returns 3; `--maximum-failed-tests` returns 13 (needs MTP 2.4). An aborted run returns 3. Exit 14 is a failed coverage threshold. None of this touches the "exit 5 as 1 on Windows" gap line (testing.md, unverified, no source found).

### 5. testing.md:28 (GA re-run) and the csharp-performance open question

Old text: ".NET 11 GA is November 2026: re-run the analyzer and exit-code checks then." GA happened on 2026-11-10. The instruction is now due, and cannot be discharged by documentation reading alone.

Analyzer facts at GA:
- [CA1876](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1876) (page updated 2026-11-19): "Do not use `AsParallel` in `foreach`", category Performance, enabled by default in .NET 10: No, in .NET 11: As suggestion. Cause: a `foreach` directly enumerating `AsParallel()`.
- [CA1877](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1877) (updated 2026-11-19): "Use `Path.Combine` or `Path.Join` overloads", Performance, .NET 10: No, .NET 11: As suggestion. Flags consecutive nested `Path.Combine` or `Path.Join` calls; a code fix exists. Introduced in preview 1 ([dotnet/sdk #51287](https://github.com/dotnet/sdk/pull/51287), [#51456](https://github.com/dotnet/sdk/pull/51456) per the preview 1 SDK notes).
- Both are "As suggestion" by default, so they surface in the IDE and not in the build log unless an analysis mode raises them. Whether they surface under `AnalysisMode=All` at `11.0-all` is `dotnet-build`'s `AnalysisLevel` question and was not determined here.
- Pattern hit: neither rule matches a prescribed pattern in the performance, platform-and-paths or other depth files as far as the files were scanned for `CA18` strings. The only `CA18xx` mention found is CA1861 in CS-PERF-04. A nested `Path.Combine(Path.Combine(a, b), c)` shape is something an agent might write; CS-PLAT path rules should not prescribe it. Verification below.
- [CA1861](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1861) (updated 2026-11-19): enabled as suggestion in both .NET 10 and 11; the page shows only `new[] { … }` and the `static readonly` fix, and does not mention collection expressions. The analyzer source could not be fetched at the paths tried (404), so whether CA1861 learned `["a", "b"]` is could not determine. CS-PERF-04 states that the IDE0300 fix silences CA1861; that claim is unchanged by anything read.
- CA1873 (avoid expensive logging arguments) got reduced noise and reason text, and now applies only to Information-level logging and below by default; nine reasons are listed. Relevant to the observability file only if it prescribes a CA1873 setting.
- `AnalysisLevel=latest` used .NET 9 rules in .NET 11 previews and is fixed at GA ([SDK notes](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk)). This is `dotnet-build`'s; flagged only because it changes which rules fire on an SDK 11 run.

## Sentences that need an edit

| File and line | Old text | New fact | Source | Upstream date |
|---|---|---|---|---|
| testing.md:30 | "SDK 11.0.100-rc.1 fails an all-skipped whole run with exit 8, SDK 10.0.401 exits 0 (measured 2026-10-11)." | Behaviour is documented for the 11 SDK at GA; add "documented for 11.0.100 GA, not re-measured" or re-measure | [dotnet-test-mtp](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp) | page updated 2026-11-20; GA 2026-11-10 |
| testing.md:28 | ".NET 11 GA is November 2026: re-run the analyzer and exit-code checks then." | GA was 2026-11-10; state that the re-run is pending and was not done on this research host | [dotnet/core 11.0 README](https://github.com/dotnet/core/blob/main/release-notes/11.0/README.md) | 2026-11-10 |
| processes.md:32 (and the csharp-process open questions) | host-death containment via `KillOnParentExit` and the `posix_spawn` switch left open | `KillOnParentExit` supports windows, linux, android only; `posix_spawn` is Apple-only | [API reference](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0), [Process API post](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/) | 2026-10-16 and 2026-05-13 |
| async.md:52 | "Same on 11.0.100-rc.1 with runtime-async on." | Name the switch: `<Features>runtime-async=on</Features>`; default for `net11.0` undetermined | [What's new in the runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime) | page updated 2026-11-12 |

No edit is needed for processes.md:136 (SIGTERM), async.md:10, the CA1876 or CA1877 mentions, or the CA1861 sentence in CS-PERF-04.

## Normative guidance candidates

1. State in testing.md that on SDK 11 a whole run whose tests are all skipped exits 8 unless `--ignore-exit-code 8` or a global `--minimum-expected-tests` is set, and that `--zero-tests-policy` does not change that. Rationale: the .NET 11 SDK decides the whole-run verdict itself. Verification: a test project with one `[Ignore]` test, `dotnet test; echo $?` prints 8 on SDK 11.0.100 and 0 on 10.0.401; add `--minimum-expected-tests 1` and it prints 0 because the global count includes skipped tests.
2. Prescribe `--timeout` and `--maximum-failed-tests` only behind an SDK 11 gate, and map their exit codes 3 and 13 in any exit-code table. Rationale: both are new in .NET 11 and need MTP 2.4. Verification: `dotnet test --timeout 90s` on a hanging test exits 3; `rg -n 'timeout|maximum-failed' skills/csharp-quality-reference/testing.md` shows the gate wording.
3. Keep `KillOnParentExit` out of any rule that applies to macOS. Rationale: unsupported there at GA. Verification: `rg -n 'KillOnParentExit' skills/csharp-quality-reference` shows no row without a `windows`, `linux` or `android` platform fence.
4. Do not recommend `Path.Combine(Path.Combine(a, b), c)` or nested `Path.Join`; use the multi-segment overload. Rationale: CA1877 is a suggestion in .NET 11. Verification: `rg -n -P 'Path\.(Combine|Join)\(\s*Path\.(Combine|Join)\(' -g '*.cs'` prints nothing; `dotnet build -p:AnalysisLevel=11.0-all` would show CA1877 where `AnalysisMode` raises it.
5. Do not prescribe `foreach (var x in seq.AsParallel())`. Rationale: CA1876; the loop is serial. Verification: `rg -n -P 'foreach\s*\([^)]*\.AsParallel\(\)\)' -g '*.cs'` prints nothing.

## AI-agent angle

- An agent trained before 2026 writes `Process.Start` plus `OutputDataReceived` wiring; on a `net11.0` leg it should use `Process.RunAndCaptureTextAsync`. Mistake that compiles but fails: calling the Preview 4 `Run` overload with positional arguments after the Preview 6 `silent` parameter was inserted. Check: a build on SDK 11.0.100 and `rg -n 'Process\.Run(Async)?\(' -g '*.cs'` reviewed for positional bool or token arguments.
- An agent asserts that `dotnet test` exits 0 for an all-skipped run (true on SDK 10 and per-module on 11, false for a whole run on 11). Check: the grep in candidate 1.
- An agent adds `KillOnParentExit = true` as a portable containment and ships it to macOS. Check: candidate 3.
- An agent treats runtime-async as default or as `EnablePreviewFeatures`-gated. Check: `rg -n 'EnablePreviewFeatures|runtime-async|UseRuntimeAsync' -g '*.csproj' -g '*.props'`.

## Contested and evolving

- Runtime-async default for `net11.0`: opt-in per the GA how-to, yet an opt-out property is documented. Trending toward default-on in a later release; not settled as of 2026-11-27.
- `KillOnParentExit` platform list: the "What's new" page says Windows only, the API page says Windows, Linux and Android. The API page is the better source; the blog says other Unix platforms may follow.
- Whole-run zero-test policy: the whole-run verdict is SDK-side and strict, while per-module default stays lenient (`allow-skipped`). MTP 2.3.0 introduced `--zero-tests-policy`; the asymmetry may be revisited.
- CA1861 and collection expressions: no primary source found; treat as open.

## Sources

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| https://github.com/dotnet/core/blob/main/release-notes/11.0/README.md | Release index | GA 2026-11-10 | Timeline and links |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md | GA release note | 2026-11-10 | Confirms no runtime or SDK narrative at GA |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc3/11.0.0-rc.3.md | RC3 note | 2026-10-25 | Out-of-band security release, no API change |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc2/runtime.md | RC2 runtime | 2026-10-13 | No runtime-async change |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc2/libraries.md | RC2 libraries | 2026-10-13 | No Process change |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc2/sdk.md | RC2 SDK | 2026-10-13 | No test or analyzer change |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc1/libraries.md | RC1 libraries | 2026-09-08 | `Process.Signal`, `WaitForExitStatus` |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc1/runtime.md | RC1 runtime | 2026-09-08 | No runtime-async change |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/rc1/sdk.md | RC1 SDK | 2026-09-08 | `dotnet test` run-level options |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview4/libraries.md | Preview 4 libraries | 2026-05-12 | Process API family introduced |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview5/libraries.md | Preview 5 libraries | 2026-06-09 | Linux `KillOnParentExit` |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview6/libraries.md | Preview 6 libraries | 2026-07-14 | `silent` parameter on `Run` |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview7/libraries.md | Preview 7 libraries | 2026-08-11 | `IEnumerable<string>` arguments, macOS suspended start |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/preview/preview4/runtime.md | Preview 4 runtime | 2026-05-12 | Runtime libraries compiled with runtime-async |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime | GA runtime What's new | 2026-11-12 | Runtime-async opt-in and opt-out text |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries | GA libraries What's new | GA | Process APIs, stale "Windows only" line |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | GA SDK What's new | 2026-11-17 | `dotnet test` and analyzer changes |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 | Breaking changes in .NET 11 | 2026-11-23 | No SIGTERM or Process entry |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp | `dotnet test` MTP reference | 2026-11-20 | Whole-run exit 8 contract |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit codes | 2026-09-22 | Exit code table, `--ignore-exit-code` |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0 | API reference | 2026-10-16 | Platform support |
| https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/ | Process API post | 2026-05-13 | `posix_spawn` scope, KillOnParentExit design |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1876 | CA1876 page | 2026-11-19 | Default severity |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1877 | CA1877 page | 2026-11-19 | Default severity, code fix |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1861 | CA1861 page | 2026-11-19 | No collection-expression text |

Not fetched or not reachable: the analyzer source for CA1861 (404 at both guessed paths), the primary dotnet/runtime PR pages (only a mirror seen for #126063), and the testfx release notes for the MTP version bundled with SDK 11.0.100 (the `dotnet test` page states MTP 2.4 for the new options; the bundled version itself was not confirmed).
