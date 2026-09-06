---
title: Diagnosis procedures for slow, non-hermetic and cache-missing builds
slug: diagnosis-procedures-profiling-and-execlog-tooling
agent: diagnosis-procedures-profiling-and-execlog-tooling
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 21
primary_sources_count: 16
answers_for:
  - bazel-diagnose skill (map "Skills" section: three entry points — slow, non-hermetic, missing the cache; GAP, no wave commissioned it)
  - .agents/research/bazel-caching-rbe.md (BZL-CACHE-06,09,12,13,14,15,16,17,18,23)
  - .agents/research/bazel-hermeticity-determinism.md (BZL-HERM-01,02,03,04,05,06,10,11,15,16,19,24,25,26)
  - .agents/research/bazel-starlark-and-build.md (BZL-LARK-07,16,17,22)
  - .agents/research/bazel-architecture-monorepo.md (BZL-ARCH-02,19,20,21)
affects_rule_ids: [BZL-CACHE-06, BZL-CACHE-09, BZL-CACHE-12, BZL-CACHE-13, BZL-CACHE-14, BZL-CACHE-15, BZL-CACHE-16, BZL-CACHE-17, BZL-CACHE-18, BZL-CACHE-23, BZL-HERM-01, BZL-HERM-02, BZL-HERM-03, BZL-HERM-04, BZL-HERM-05, BZL-HERM-06, BZL-HERM-10, BZL-HERM-11, BZL-HERM-15, BZL-HERM-16, BZL-HERM-19, BZL-HERM-24, BZL-HERM-25, BZL-HERM-26, BZL-LARK-07, BZL-LARK-16, BZL-LARK-17, BZL-LARK-22, BZL-ARCH-02, BZL-ARCH-19, BZL-ARCH-20, BZL-ARCH-21, NEW-1, NEW-2, NEW-3, NEW-4, NEW-5]
---

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [Q1 — Slow builds: profiling, JVM sizing, analysis-phase culprits](#q1)
  - [Q2 — Non-hermetic builds: execution log, workspace-rules log, explain, third-party diff tools](#q2)
  - [Q3 — Missing the cache: which of the six caches, and the one command that discriminates each](#q3)
  - [Q4 — Three decision trees for bazel-diagnose](#q4)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)

## Summary

- `bazel analyze-profile` **does not exist on Bazel 9** — its implementation (`ProfileCommand.java`) was deleted between 8.8.0 and 9.0.0; the JSON trace profile is now read only via `chrome://tracing`/Perfetto or a third-party tool. Bazel's own **9.1.0 versioned docs snapshot still lists it** as an available command — a doc bug on the fleet's Active LTS line, not just an old blog citing legacy behaviour.
- `bazel dump --skyframe=working_set` (Bazel 8.x) was renamed `--skyframe=active_directories` at Bazel 9.0.0 (`working_set_frontier_deps` → `active_directories_frontier_deps`). The current (HEAD) `bazel.build/advanced/performance/memory` page still shows the **old** 8.x value — the prose is behind the numbered release here, the mirror image of the frame's usual warning.
- Skymeld (`--experimental_merged_skyframe_analysis_execution`) **defaults `true`** on both 8.7.0 and 9.2.0. Guidance that frames it as something to "enable" is stale; the tunable that remains live is `--experimental_skymeld_analysis_overlap_percentage` (default 100).
- `--experimental_oom_more_eagerly_threshold` is a dead name kept only as an alias (`oldName`) for `--gc_thrashing_threshold` (default 100, percent of tenured space). Its companion `--gc_thrashing_limits` (default `1s:2,20s:3,1m:5`) is the flag that actually gates the new `GcThrashingDetector`, a different mechanism from the old one-shot OOM-eagerness knob.
- `--incompatible_remote_use_new_exit_code_for_lost_inputs` (the flag that makes a lost/evicted remote blob exit 39 instead of 34) is present, default `true`, on Bazel 8.7.0 **and** 8.8.0, and was deleted outright at Bazel **9.0.0**. On Bazel 9 exit 39 is unconditional with no flag left to touch; on Bazel 8 it is still nominally a flag, just defaulted on. The existing `BZL-CACHE` consolidation's "deleted 2025-02" note needs this major-version boundary attached.
- `--sort` belongs to `execlog:converter`, not `execlog:parser` — the parser's own flags are `--log_path` (repeatable), `--output_path`, `--restrict_to_runner`; conflating the two tools' flags is an easy citation error.
- An action whose owning target hits the **persistent local action cache is never written to the execution log at all**, regardless of format — its absence from `--execution_log_compact_file` is itself the diagnostic signal, not a bug in the log.
- The BEP's `ActionCacheStatistics` message (`hits`, `misses`, `miss_details` keyed by `MissReason`: `NOT_CACHED`, `DIGEST_MISMATCH`, `CORRUPTED_CACHE_ENTRY`, `UNCONDITIONAL_EXECUTION`) is specifically the **local, on-disk action cache's** hit/miss breakdown — it is the one BEP field that answers "did the local action cache work," not a remote-cache metric.
- Bazel's own status line ("`N processes: X remote cache hit, Y linux-sandbox`") reports remote cache hits and the execution strategy used for misses, but **never reports local cache hits at all** — a build showing "0 processes" or an unexpectedly low count needs `bazel clean` first, per Bazel's own troubleshooting page.
- `--toolchain_resolution_debug` is one of the rare cases where the current prose (`extending/toolchains.md`) and the source (`PlatformOptions.java`) agree exactly, including the `-.*` (exclude-everything) default — confirmed identical on 8.7.0 and 9.2.0.
- `--experimental_remote_grpc_log` is a dead name; the canonical flag is now `--remote_grpc_log` (an `oldName` alias that still parses but is a documented-deprecation shape, unlike `--gc_thrashing_threshold`'s silent alias).
- BuildBuddy's `bb explain --old {FILE|ID} --new {FILE|ID} [--nondeterministic_only]` (shipped 2026-03-09) is a packaged, invocation-ID-aware version of the exact same compact-execution-log diff Bazel's own docs describe manually; it is scoped to the **execution log**, not the JSON trace profile.
- EngFlow's Bazel Invocation Analyzer consumes the **JSON trace profile** (`.json.gz`), not the execution log — it is a Q1 (slow-build) tool, not a Q2 (non-hermetic) tool, despite being easy to lump in with `bb explain`. Its 14 suggestion categories (`Bottleneck`, `BuildWithoutTheBytes`, `CriticalPathNotDominant`, `GarbageCollection`, `IncompleteProfile`, `InvestigateRemoteCacheMisses`, `Jobs`, `LocalActionsWithRemoteExecution`, `MergedEvents`, `NegligiblePhase`, `NoCacheActions`, `Queuing`, `UseRemoteCaching`, `UseSkymeld`) name the mechanical failure modes worth encoding directly into `bazel-diagnose`.
- `--host_jvm_args=-Xmx2g`-style startup flags are Bazel's own documented answer for capping Bazel-server memory; there is no other JVM-sizing knob in the current memory-optimisation doc, which never once names `--memory_profile`, `--heap_dump_on_oom`, `--skyframe_high_water_mark_threshold` or the `gc_thrashing_*` flags — an agent reading only that page will miss all four.
- Mixing `bazel build -c opt` with `bazel cquery` in the same session discards each other's analysis cache — documented directly, and a common "why did my next build suddenly re-analyze everything" trap that has nothing to do with source changes.

## Answers

<a id="q1"></a>
### Q1. What is the procedure for diagnosing a slow build, with the exact current flag names, profile-lane semantics, and analysis-phase culprits?

**Question as commissioned:** verify `bazel.build/advanced/performance/build-performance-breakdown`, `/json-trace-profile`, `/memory`, `/iteration-speed`; the exact flags and current names in the 8.7.0 and 9.2.0 CLI reference (`--profile`, `--generate_json_trace_profile`, `--experimental_profile_include_target_label`, `--experimental_command_profile`, `bazel analyze-profile`, `--starlark_cpu_profile`, `--memory_profile`, `--heap_dump_on_oom`, `bazel info used-heap-size-after-gc`, `bazel dump --skyframe=… --rules`, `--experimental_ui_debug_all_events`, `--slim_profile`); how to read the trace in Perfetto/chrome://tracing; known analysis-phase culprits and how each shows in the profile; JVM sizing (`--host_jvm_args=-Xmx`, `--experimental_oom_more_eagerly_threshold`, `--skyframe_high_water_mark_threshold`).

**Findings.**

*Flag verification, at the tagged source (8.7.0 and 9.2.0 are byte-identical on every flag below unless noted):*

| Flag | Type / default | Notes |
|---|---|---|
| `--profile` | path, unset | Writes the trace profile; help text now points at the json-trace-profile doc ([CommonCommandOptions.java:365](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java)). Default output, if unset, is `command-$INVOCATION_ID.profile.gz` in the output base with a `command.profile.gz` symlink to the latest ([json-trace-profile](https://bazel.build/advanced/performance/json-trace-profile)). |
| `--generate_json_trace_profile` | TriState, `auto` | **`oldName = "experimental_generate_json_trace_profile"`** — same file, line 294. Not a plain boolean. |
| `--experimental_profile_include_target_label` | bool, `false` | Unchanged name, unchanged default. |
| `--experimental_command_profile` | enum `{cpu,wall,alloc,lock}`, unset | Java Flight Recorder profile, written under the output base ([CommandProfilerModule.java:65](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/profiler/CommandProfilerModule.java)). |
| `--starlark_cpu_profile` | string, `""` | pprof CPU profile of all Starlark threads ([CommonCommandOptions.java:377](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java)). |
| `--memory_profile` | path, unset | Writes memory usage at phase ends, stable heap at build end. |
| `--heap_dump_on_oom` | bool, `false` | Writes `<output_base>/<invocation_id>.heapdump.hprof` on a manual OOM, including a `gc_thrashing_limits` trip — replaces `-XX:+HeapDumpOnOutOfMemoryError`, which the help text says has no effect for manual OOMs. |
| `--slim_profile` | bool, `true` | **`oldName = "experimental_slim_json_profile"`**. |
| `--experimental_ui_debug_all_events` | bool, `false`, `HIDDEN`/`UNDOCUMENTED` | Confirmed present, unchanged, on 9.2.0 ([UiOptions.java:232](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/UiOptions.java)). |
| `--host_jvm_args` | repeatable string, unset | Startup option; `--host_jvm_args=-Xmx2g` is Bazel's own documented example for capping server heap ([memory.md](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/advanced/performance/memory.md)). |
| `--skyframe_high_water_mark_threshold` | int, `85` | Percent retained-heap threshold above which Bazel drops temporary Skyframe state on GC. |
| `--skyframe_high_water_mark_{minor,full}_gc_drops_per_invocation` | int, `10` each | Caps how many times a GC event may trigger a drop. |
| `--experimental_oom_more_eagerly_threshold` | **dead name** | `oldName` alias, `oldNameWarning = false` (silent), for `--gc_thrashing_threshold` (int, `100`, percent). A value of `100` disables the detector entirely — the semantics moved from "drop state above X%" to "count pressure events above X% against `--gc_thrashing_limits`", a different algorithm, not a rename of the same one ([MemoryPressureOptions.java:80-107](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/MemoryPressureOptions.java)). |

`bazel analyze-profile` is **removed on Bazel 9**. Its implementing class, `ProfileCommand.java`, plus the `analyze-profile.txt` help text, are present in the `runtime/commands/` directory at [8.7.0](https://github.com/bazelbuild/bazel/tree/8.7.0/src/main/java/com/google/devtools/build/lib/runtime/commands) and 8.8.0, and **absent** at [9.0.0](https://github.com/bazelbuild/bazel/tree/9.0.0/src/main/java/com/google/devtools/build/lib/runtime/commands), 9.1.0 and 9.2.0 (directory listings pulled directly, diffed by hand). The command's replacement is: view the JSON trace profile directly in `chrome://tracing` or Perfetto, or run a third-party tool (EngFlow's analyzer, below). The removal is real and current, but Bazel's own frozen docs snapshot for **9.1.0** — the same major as the fleet's Active LTS — still advertises it: `docs/versions/9.1.0/run/build.mdx` lists `` [`analyze-profile`](/versions/9.1.0/docs/user-manual#analyze-profile): Analyzes build profile data. `` verbatim, fetched from [the live repo](https://raw.githubusercontent.com/bazelbuild/bazel/master/docs/versions/9.1.0/run/build.mdx). The current (HEAD) unversioned `site/en/run/build.md` has already dropped the line. This is a case of the frame's own "prose can be ahead or behind the numbered release" warning applying to Bazel's *own* generated version snapshot, not merely a third-party blog.

`bazel dump` sub-flags, confirmed from [DumpCommand.java](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/commands/DumpCommand.java):
- `--rules` (bool) — "Dump rules, including counts and memory usage (if memory is tracked)." Worked example from `rules/performance.md`: `bazel dump --rules` prints a table of `RULE / COUNT / ACTIONS / BYTES / EACH`.
- `--skylark_memory=<path>` — dumps a pprof-compatible heap profile; `pprof -text -lines` or `pprof -flame` on the output shows per-rule, per-callsite byte attribution, including native rule classes like `android_library`, `genrule`, `glob`.
- `--skyframe={summary|count|value|deps|rdeps|function_graph|...}` — the two terminal enum values differ by major: **8.7.0/8.8.0** ship `WORKING_SET`/`WORKING_SET_FRONTIER_DEPS`; **9.0.0 through 9.2.0** renamed them to `ACTIVE_DIRECTORIES`/`ACTIVE_DIRECTORIES_FRONTIER_DEPS` (confirmed by diffing the enum across all five tags). `bazel.build/advanced/performance/memory.md`'s Skyfocus example still prints `` Run 'blaze dump --skyframe=working_set' `` — correct for 8.x, stale for 9.x, and fetched from the `master` branch (i.e. today's canonical docs), not an old snapshot.
- Memory tracking (`bazel dump --rules`/`--skylark_memory`) requires two `--host_jvm_args` startup flags on *every* invocation including the server-starting one (`-javaagent:<path-to-java-allocation-instrumenter-3.3.4.jar>` and `-DRULE_MEMORY_TRACKER=1`), documented at [`rules/performance.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/rules/performance.md); forgetting either on one invocation restarts the server and loses tracking state.
- `bazel info used-heap-size-after-gc` is the paired command for reading total instance memory once tracking is on (same doc).

*Reading the profile.* `json-trace-profile.md`'s own text: "The profile contains multiple rows... some special rows are also included" — `Main Thread` (phase markers: `Launch Blaze`, `evaluateTargetPatterns`, `runAnalysisPhase`), `Action count`, `CPU usage (Bazel)`, `Critical Path` (one block per action on the critical path), `Garbage Collector`. Analysis-vs-execution is read by finding `runAnalysisPhase`'s span on the Main Thread and treating everything after it (or, under Skymeld, everything overlapping it) as execution. **No official doc — `json-trace-profile.md` fetched fresh, zero hits for "skymeld"** — explains how Skymeld's phase overlap actually renders on the timeline; this is the single largest documentation gap this wave found for the profiling procedure (see Not settled).

*Analysis-phase culprits and how each shows up:*
- **Depset built inside a loop with the accumulator as `transitive=`** — O(N²) traversal, shows as a long, otherwise-unexplained span with no corresponding action count; caught statically by `BZL-LARK-07`'s `overly-nested-depset` buildifier check, not by the profile itself.
- **`depset.to_list()` on action-construction paths** — shows as elevated CPU time inside `runAnalysisPhase`/action-construction with no matching execution-phase growth; `--starlark_cpu_profile` + `pprof -top` will name the calling `.bzl` function. Static check: `BZL-LARK-17`.
- **`glob()` over a huge tree** — the `build-performance-breakdown` page attributes loading-phase cost to `PackageMetrics.packages_loaded` and "the work needed to read and parse each additional BUILD file"; a glob re-walking a large subtree on every invocation inflates this metric without inflating `targets_configured`. Correctness/cost check for the same call site: `BZL-ARCH-02` / `BZL-HERM-19` (glob silently stops matching once a `BUILD` file appears in a matched subdirectory — a correctness bug, not the same failure mode as raw walk cost, but the same call sites).
- **Transition-induced duplication** — a per-edge transition that never resets configuration produces `2^n` configured targets down a depth-`n` tree; measured with `bazel cquery 'deps(//target)' | awk '{print $1}' | sort | uniq -c | sort -rn` (`BZL-ARCH-19`), and *not* the same thing as duplicated actions (`BZL-ARCH-20` warns `aquery` output must never be counted by line for this reason).
- **Macro expansion per target** — legacy `def` macros re-execute their whole body at loading time for every call site; symbolic macros (Bazel 8+) fix typing/visibility but **not** this cost, because lazy macro evaluation is still unshipped as of 9.2.0 (`BZL-LARK-22`) — do not recommend converting to symbolic macros as a performance fix.
- **Package loading of one giant `BUILD` file** — shows as one long-running package-load event with no corresponding depset/to_list signature; the fix is splitting the package (`BZL-ARCH-01`), verified by watching `packages_loaded` stop dominating wall time relative to `targets_configured`.

*Iteration-speed traps (`iteration-speed.md`):* the analysis cache is discarded whenever "many `bazel` command line flags" differ between invocations, and explicitly "mixing a `bazel build -c opt` with a `bazel cquery` causes each command to discard the analysis cache of the other" — a session-level trap with no connection to source changes. `--noallow_analysis_cache_discard` (6.4.0+) converts a silent discard into a hard error. `--discard_analysis_cache` / `--nokeep_state_after_build` / `--notrack_incremental_state` trade memory for slower incremental builds, in that increasing order of severity; `--experimental_enable_skyfocus` + `--experimental_working_set` is the current mechanism for the "keep speed, bound memory" middle ground, with `--experimental_skyfocus_dump_post_gc_stats` printing the before/after heap delta.

**Answer.** As of Bazel 8.7.0/9.2.0, every profiling flag the commission named is real and identically specified across the two majors except `--experimental_oom_more_eagerly_threshold` (dead alias) and `bazel dump --skyframe=working_set` (renamed `active_directories` at 9.0.0); `bazel analyze-profile` must not be cited for Bazel 9 at all, and Bazel's own 9.1.0 doc snapshot is wrong on this point. The profile is read via the Main Thread's phase markers plus the Critical Path and GC lanes; Skymeld's overlap has no documented visual signature and must be inferred from concurrent analysis/execution activity rather than read off a labelled lane. JVM sizing is `--host_jvm_args=-Xmx<n>`, with `--skyframe_high_water_mark_threshold`/`--gc_thrashing_*` as the separate, undocumented-in-the-memory-page GC-pressure tunables.

<a id="q2"></a>
### Q2. What is the procedure for diagnosing a non-hermetic build, with the execution log, workspace-rules log, explain flags, and third-party diff tools?

**Question as commissioned:** the execution log (`--execution_log_compact_file`, `--execution_log_json_file`, `--execution_log_binary_file`; the parser at `bazelbuild/bazel` `src/tools/execlog` and its `--restrict_to_runner`/`--sort` options), `--experimental_workspace_rules_log_file`, `--sandbox_debug`, `--subcommands`, `--toolchain_resolution_debug`, `--explain` and `--verbose_explanations` (what they report and cannot), the two-run digest diff recipe, BuildBuddy's `bb explain`, EngFlow's Bazel Invocation Analyzer.

**Findings.**

*Execution log formats*, all confirmed identical on 8.7.0 and 9.2.0 from [`ExecutionOptions.java`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java):
- `--execution_log_compact_file` (`oldName = "experimental_execution_log_compact_file"`) — length-delimited `ExecLogEntry` protos, whole file zstd-compressed. Recommended default; "significantly smaller and cheaper to produce" per the flag's own help text.
- `--execution_log_binary_file` / `--execution_log_json_file` — `SpawnExec` protos, binary or newline-JSON. All three are mutually exclusive.
- `--execution_log_sort` (bool, `true`) — only affects the binary/JSON formats; "the compact format is never sorted." Disabling it trades determinism for CPU/memory at the end of the invocation.

*The `SpawnExec` message* ([`spawn.proto`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/spawn.proto)) is the direct answer to "which fields does the log carry": `remotable` (bool), `cacheable` (bool), `remote_cacheable` (bool), `runner` (string — the strategy name, e.g. `"linux-sandbox"`, `"worker"`, `"remote"`, or literally `"disk cache hit"`/`"remote cache hit"` when a cache served the spawn), `cache_hit` (bool), `target_label`, `digest`. The proto's own comment on `runner` is load-bearing for Q3: **"Note that spawns whose owning action hits the persistent action cache are never reported at all."** An action's total absence from the log — not a `cache_hit: false` entry — is the signature of a local action-cache hit.

*`execlog:parser` vs `execlog:converter`* — two different `BUILD` targets with two different flag sets ([`ParserOptions.java`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/tools/execlog/src/main/java/com/google/devtools/build/execlog/ParserOptions.java), [`ConverterOptions.java`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/tools/execlog/src/main/java/com/google/devtools/build/execlog/ConverterOptions.java)):
- **`parser`**: `--log_path` (repeatable — pass it twice to get the second log reordered to match the first's action order, matched by first output), `--output_path` (repeatable, paired positionally with `--log_path`), `--restrict_to_runner` (filter output to one runner string, e.g. `"linux-sandbox"`).
- **`converter`**: `--input`/`--output` (each `format:path`, formats `binary`/`json`/`compact`), `--sort` (deterministic ordering; the README warns large files may need `--jvm_flag=-Xmx4g`).

The commission's phrasing ("the parser ... and its `--restrict_to_runner`/`--sort` options") conflates the two tools; `--sort` is the converter's flag only.

*Digest-diff recipe*, sourced independently from both the fleet's own consolidation (`BZL-HERM-15`) and Bazel's live doc [`remote/cache-remote.md#compare-logs`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/remote/cache-remote.md):
```
bazel build --execution_log_compact_file=/tmp/exec1.log //t   # run 1
bazel build --execution_log_compact_file=/tmp/exec2.log //t   # run 2 (edit something between runs to test)
bazel build //src/tools/execlog:parser
bazel-bin/src/tools/execlog/parser \
  --log_path=/tmp/exec1.log --log_path=/tmp/exec2.log \
  --output_path=/tmp/exec1.log.txt --output_path=/tmp/exec2.log.txt
diff -u /tmp/exec1.log.txt /tmp/exec2.log.txt
```
Empty diff reads as **Bazel-side reproducibility confirmed** — the divergence, if any, is downstream (server eviction, auth scope, a different `--remote_instance_name`). The same doc gives the **two-machine** variant verbatim: `bazel clean` on each machine, run the same modified build with `--execution_log_compact_file` on each, then diff as above — this is the exact "why did this miss between two machines" recipe the commission asked for, now with a direct citation independent of the consolidation.

*Debug flags*, confirmed on both tags:
- `--sandbox_debug` (bool, `false`) — "the sandbox root contents are left untouched after a build... prints extra debugging information." Never commit it (`BZL-HERM-03`): it is an unbounded disk leak by design.
- `--subcommands`/`-s` — displays subcommands as executed; its own help text cross-references `--execution_log_json_file`/`--execution_log_binary_file` for a "tool-friendly" record of the same information.
- `--toolchain_resolution_debug` — `RegexFilter`, default `"-.*"` (exclude everything). One of the few places prose and source agree exactly: `extending/toolchains.md` gives `--toolchain_resolution_debug=//my:target` and `=.*` as the two worked examples, matching the source's regex-filter semantics precisely.
- `--explain=<logfile>` — "causes the dependency checker in `bazel build`'s execution phase to explain, for each build step, either why it is being executed, or that it is up-to-date," per `docs/user-manual.md`. It is scoped to the **local dependency checker only** — it does not discriminate remote-cache decisions, disk-cache decisions, or which of the six caches (Q3) was consulted; it only answers "did this action's dependency-checking logic decide to run it, and why." The doc recommends leaving it in `.bazelrc` until the mystery is solved (it "may carry a small performance penalty").
- `--verbose_explanations` — has no effect unless `--explain` is set; adds full new-command-line detail when a step reruns because its command changed.
- `--experimental_workspace_rules_log_file` — unchanged name and unchanged (`experimental_`-prefixed) status on both 8.7.0 and 9.2.0; the workspacelog parser recipe is already fully specified by `BZL-HERM-16` and not re-derived here.
- `--experimental_remote_grpc_log` is a **dead name**: 9.2.0's source declares `name = "remote_grpc_log", oldName = "experimental_remote_grpc_log"` with no `oldNameWarning = false`, meaning (unlike the silent `gc_thrashing_threshold` alias) the old spelling still parses but is a documented-deprecation shape that should not be written into new guidance.

*BuildBuddy `bb explain`* — shipped [2026-03-09](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/website/changelog/bb-explain.md): "shows a structural diff of two **compact execution logs**... 'Why did Bazel re-execute that action?'" Usage, from [`cli/explain/explain.go`](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/cli/explain/explain.go): `bb explain [--old {FILE|INVOCATION_ID}] [--new {FILE|INVOCATION_ID}] [--output_format {text|json|proto}] [--nondeterministic_only]`; with no arguments it diffs the last two `bb`-driven builds automatically. `--nondeterministic_only` filters the diff to the non-hermeticity signal specifically (input/env/argument changes), which is the packaged equivalent of the manual digest-diff recipe above, plus invocation-ID addressing so the two runs need not be on the same filesystem.

*EngFlow's Bazel Invocation Analyzer* — **consumes the JSON trace profile, not the execution log** (`bazel run //cli -- /path/to/bazel_profile.json.gz`, or upload at `analyzer.engflow.com`), per its own [README](https://raw.githubusercontent.com/EngFlow/bazel_invocation_analyzer/main/README.md). It is therefore a **Q1 tool grouped into the Q2 commission by mistake** — worth correcting in the skill so an agent does not point it at an execution log. Its `suggestionproviders/` directory ([listing](https://github.com/EngFlow/bazel_invocation_analyzer/tree/main/analyzer/java/com/engflow/bazel/invocation/analyzer/suggestionproviders)) names its 14 concrete checks: `BottleneckSuggestionProvider`, `BuildWithoutTheBytesSuggestionProvider`, `CriticalPathNotDominantSuggestionProvider`, `GarbageCollectionSuggestionProvider`, `IncompleteProfileSuggestionProvider`, `InvestigateRemoteCacheMissesSuggestionProvider`, `JobsSuggestionProvider`, `LocalActionsWithRemoteExecutionSuggestionProvider`, `MergedEventsSuggestionProvider`, `NegligiblePhaseSuggestionProvider`, `NoCacheActionsSuggestionProvider`, `QueuingSuggestionProvider`, `UseRemoteCachingSuggestionProvider`, `UseSkymeldSuggestionProvider` — each name is itself the mechanical symptom it flags.

**Answer.** All execution-log flags the commission named are current and unchanged across 8.7.0/9.2.0; the one correction needed is that `--sort` is the converter's flag, `--restrict_to_runner` the parser's. `--explain`/`--verbose_explanations` report only the local dependency checker's own reasoning and never discriminate which cache tier was in play — that job belongs to the execution log's `runner`/`cache_hit` fields and (per Q3) the BEP. The two-run and two-machine digest-diff recipes are both directly documented by Bazel itself, not only inferred by the fleet's consolidation. `bb explain` is the packaged, invocation-ID-aware version of the same recipe; the EngFlow analyzer is a profiling tool that happens to share a vendor with `bb explain` but operates on a different artifact entirely.

<a id="q3"></a>
### Q3. Which of the six caches does a symptom implicate, and what is the one command that discriminates each?

**Question as commissioned:** the six caches (Skyframe in-memory, repository cache, repo contents cache, local action cache/output tree, disk cache, remote AC+CAS), exit 39 handling, the "why did this miss" recipe between two machines.

**Findings.** `BZL-CACHE-15` already states the six-way taxonomy and the general principle ("conflating two of the six is the most common source of a wrong diagnosis"); this answer adds the one-command discriminator this wave was asked to name for each, plus what changed at the version boundary.

| Cache | One discriminating command | What it shows |
|---|---|---|
| **Skyframe in-memory graph** | `bazel dump --skyframe=summary` (or `=count`) | Node counts by SkyFunction; a growing count across incremental builds with no source change confirms state retention, not a miss. `bazel info used-heap-size-after-gc` gives the aggregate heap cost of holding it. |
| **Repository cache** | `du -sh $(bazel info repository_cache)` | Only repo rules calling `rctx.download()`/`.download_and_extract()` populate it — `go_repository` and `container_pull` bypass it by default (`BZL-CACHE-15`); an empty/small directory does not mean the cache is broken if the repo rule never calls those methods. |
| **Repo contents cache** | `.bazelversion` check, then re-verify against `repository_ctx.repo_metadata()` gating | Separate mechanism, Bazel 8.3.0+, shipped on-by-default in 8.3.0 and walked back to opt-in in 8.4.0 (frame Wave-2 Correction 3) — a version check is the discriminator here, not a `bazel info` key; do not assume it is active just because the pin is ≥8.3.0. |
| **Local action cache / output tree** | The action is **absent** from a fresh `--execution_log_compact_file` run *and* the terminal status line shows it under a strategy name (not "remote cache hit") | Per `spawn.proto`'s own comment, a persistent-action-cache hit is never logged at all — its absence from the execlog, combined with a fast/near-instant wall time, is the positive signal. For a build-wide breakdown, read the BEP's `ActionCacheStatistics` message (below) rather than guessing from the status line, which never reports local hits (`cache-local.md`: "Local cache hits are not included in this summary"). |
| **Disk cache** | `du -sh <the configured --disk_cache path>` | No `bazel info` key names it directly (it is a bare path the invoker chose); unbounded on Bazel <7.4 or on any version with neither `--experimental_disk_cache_gc_max_size` nor `_max_age` set (`BZL-CACHE-17`). |
| **Remote AC + CAS** | The terminal status line's `N remote cache hit` count, cross-checked against `--remote_grpc_log` for the actual `FindMissingBlobs`/`GetActionResult` wire traffic | The status line ("`INFO: 7 processes: 3 remote cache hit, 4 linux-sandbox`", per [`cache-local.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/remote/cache-local.md)) is the fast read; `--remote_grpc_log`'s `LogEntry` protos are the ground truth when the count itself is suspect. |

*The BEP discriminator for the local action cache specifically.* `src/main/protobuf/action_cache.proto`'s `ActionCacheStatistics` message — reached from `BuildEventStreamProtos`'s `BuildMetrics` via `action_cache_statistics` — carries `hits` (int32), `misses` (int32), and `miss_details` (repeated `{MissReason, count}`), where `MissReason` is `CORRUPTED_CACHE_ENTRY`, `NOT_CACHED`, `UNCONDITIONAL_EXECUTION`, or `DIGEST_MISMATCH` (the other three enum values, `DIFFERENT_ACTION_KEY`/`DIFFERENT_DEPS`/`DIFFERENT_ENVIRONMENT`/`DIFFERENT_FILES`, are explicitly marked "currently not used" in the proto's own comments — citing them as live reasons is a fabrication risk). This message is specifically about the **local, on-disk** action cache; it is the single richest, one-command ("read the BEP") answer to "did the local action cache work and why not" that the commission asked for.

*Exit 39.* `--experimental_remote_cache_eviction_retries` (int, default `5`) is unchanged, still `experimental_`-prefixed, on both 8.7.0 and 9.2.0 — confirming `BZL-CACHE-12`'s guidance to leave it at default and treat 39 as retryable. The version-specific nuance this wave adds: **`--incompatible_remote_use_new_exit_code_for_lost_inputs`** (the flag whose help text on 8.7.0 says "Bazel will use new exit code 39 instead of 34... if set to true", default `true`) is present in [8.7.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java) and [8.8.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.8.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java), and **absent** from [9.0.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.0.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java), 9.1.0 and 9.2.0. So: on Bazel 8.x the "39 not 34" behaviour is nominally still gated by a flag (defaulted on); on Bazel 9.x it is truly unconditional, with no flag left to name at all. The existing consolidation's "unconditional since Bazel 7.0" claim needs this major-boundary correction — it is unconditional in practice on 8.x (default true, no repo in this program's evidence base sets it false) but only *structurally* unconditional starting at 9.0.0.

*Two-machine "why did this miss" recipe* — already given under Q2; it is the same recipe for both hermeticity and cache-miss investigation, which is itself worth stating explicitly in the skill: one procedure, two entry points.

**Answer.** Each of the six caches now has a named, one-command discriminator; the two that most often get conflated in practice — local action cache and remote AC — are told apart by the execution log's silence (local hit) versus the status line's explicit "remote cache hit" count, with the BEP's `ActionCacheStatistics` as the authoritative build-wide tie-breaker for the local cache specifically. Exit 39 is retry-by-default on both current majors, but the flag that used to make that behaviour togglable exists only through Bazel 8.x and is gone on 9.

<a id="q4"></a>
### Q4. Three decision trees for `bazel-diagnose`

Each step names a runnable command with flag names verified above for both 8.7.0 and 9.2.0 (divergences called out inline). Each terminal box names the `BZL-*` rule ID that prevents recurrence.

#### Tree 1 — "The build/test is slow"

```
Symptom: bazel build/test wall time regressed or is worse than expected.
│
├─ 1. bazel build <target> --profile=/tmp/prof.json.gz --generate_json_trace_profile=yes
│     Open /tmp/prof.json.gz in chrome://tracing (or Perfetto).
│     Read the Main Thread row: where does runAnalysisPhase end relative to execution activity?
│
├─ 2a. Time dominated by loading+analysis (before/overlapping runAnalysisPhase)
│      │
│      ├─ bazel build --nobuild --starlark_cpu_profile=/tmp/cpu.pprof <target>
│      │  pprof -top /tmp/cpu.pprof
│      │
│      ├─ Hot frame is a loop building depset(transitive=accumulator)
│      │    → BZL-LARK-07 (collect a list, one depset() call after the loop)
│      │
│      ├─ Hot frame calls depset.to_list() outside a terminal target
│      │    → BZL-LARK-17 (use ctx.actions.args().add_all()/add_joined())
│      │
│      ├─ No Starlark hotspot, but PackageMetrics.packages_loaded dominates
│      │  wall time relative to TargetMetrics.targets_configured
│      │    → giant BUILD file or a wide glob() re-walking a huge tree
│      │      → BZL-ARCH-01 (split the package); re-verify glob correctness
│      │        with BZL-ARCH-02 / BZL-HERM-19 if a BUILD file was added nearby
│      │
│      ├─ A recently-converted macro is expected to be "faster because symbolic"
│      │    → false: lazy macro evaluation is unshipped as of 9.2.0
│      │      → BZL-LARK-22 (do not cite laziness as a performance win)
│      │
│      └─ bazel cquery 'deps(//target)' | awk '{print $1}' | sort | uniq -c | sort -rn
│         Any label with count > 1 (built under >1 configuration)
│           → transition-induced duplication
│             → BZL-ARCH-19 (measure), BZL-ARCH-21 (a reset transition is not
│               automatically the fix — trace downstream readers first)
│             Do NOT count aquery lines as a duplicate-action proxy: BZL-ARCH-20
│
└─ 2b. Time dominated by execution, or by GC pauses on the trace's
       "Garbage Collector" row
       │
       ├─ bazel info used-heap-size-after-gc   (needs the two memory-tracking
       │   --host_jvm_args from rules/performance.md if attributing to a rule)
       │
       ├─ Heap high / OOM observed
       │    → set --host_jvm_args=-Xmx<n>g; if OOM recurs, add
       │      --heap_dump_on_oom and inspect <output_base>/<id>.heapdump.hprof
       │    → tune --gc_thrashing_limits / --gc_thrashing_threshold, not the
       │      dead --experimental_oom_more_eagerly_threshold name
       │
       └─ Low parallelism / long queuing on the trace's Action count row
            → check --jobs, local/remote resource limits; cross-reference
              EngFlow Invocation Analyzer's Jobs/Queuing/Bottleneck suggestions
              if a JSON trace profile is available for automated triage
```

#### Tree 2 — "The build is non-hermetic" (flaky, or differs across machines)

```
Symptom: same target, same inputs, different output or an unexplained rebuild.
│
├─ 1. bazel build --execution_log_compact_file=/tmp/a.log <target>   (run 1)
│     bazel build --execution_log_compact_file=/tmp/b.log <target>   (run 2)
│     bazel build //src/tools/execlog:parser
│     bazel-bin/src/tools/execlog/parser --log_path=/tmp/a.log --log_path=/tmp/b.log \
│       --output_path=/tmp/a.txt --output_path=/tmp/b.txt
│     diff -u /tmp/a.txt /tmp/b.txt
│
├─ Diff is EMPTY on the same machine
│    → not a Bazel action-key problem here; if the two machines still disagree,
│      re-run the same pair with --execution_log_compact_file on each machine
│      after bazel clean and diff those two files instead (the two-machine
│      variant of the same recipe) → BZL-HERM-15
│
├─ Diff shows differing environment_variables
│    → check --action_env vs --repo_env usage: BZL-HERM-04/05/06
│    → check --incompatible_strict_action_env is pinned true if any Bazel-8
│      leg is in the matrix: BZL-HERM-01
│
├─ Diff shows differing command_args (a literal date/PID/hostname/absolute path)
│    → genrule or custom action embedding host state: BZL-HERM-10, BZL-HERM-11
│      (sort sets/maps before serialising)
│
├─ Diff shows extra/missing inputs
│    → suspect a glob() that silently stopped matching after a BUILD file
│      appeared in a matched subdirectory: BZL-HERM-19 / BZL-ARCH-02
│    → suspect a default-order depset reaching a command line whose flattened
│      order shifted from an unrelated graph edit: BZL-LARK-16
│
├─ Diff is empty, but a repository rule is suspected
│    → bazel clean --expunge
│      bazel build --experimental_workspace_rules_log_file=/tmp/wsl.log //...
│      bazel build src/tools/workspacelog:parser
│      bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/wsl.log > /tmp/wsl.txt
│      grep -c '"which"\|sha256: ""' /tmp/wsl.txt
│    → any hit names the non-hermetic call: BZL-HERM-16
│
├─ Sandbox isolation itself is in question
│    → bazel build --sandbox_debug <target> 2>&1 | grep -i sandbox
│      (never commit --sandbox_debug: BZL-HERM-03)
│    → confirm strategy: processwrapper-sandbox enforces far less than
│      linux-sandbox/darwin-sandbox: BZL-HERM-26
│    → on any hermetic-toolchain claim, confirm it resolves ahead of the
│      autodetected one: BZL-HERM-24 / BZL-HERM-25
│
└─ Have BuildBuddy CLI available?
     → bb explain --old <old-invocation-or-file> --new <new-invocation-or-file> \
         --nondeterministic_only
       (packaged version of the same compact-log diff, invocation-ID aware)
```

#### Tree 3 — "Expected a cache hit, got a miss" / "why did this rebuild"

```
Symptom: cache hit rate lower than expected, or a specific action re-executed.
│
├─ 1. Read the terminal status line from the build in question:
│     "INFO: N processes: X remote cache hit, Y <strategy>"
│     (local cache hits are never included in this line — cache-local.md)
│
├─ Everything ran under a local strategy, remote-cache-hit count is 0
│    → Branch A: remote cache unreachable or not being read
│      │
│      ├─ Look for "WARNING: Error reading from the remote cache" in stdout
│      │    → connectivity/auth: BZL-CACHE-01, BZL-CACHE-03, BZL-CACHE-04,
│      │      BZL-CACHE-24, BZL-CACHE-25 (scheme/credential-helper checks)
│      │
│      ├─ bazel build --build_event_text_file=/tmp/bep.txt <target>
│      │  grep -A2 'command_line_label: "canonical"' /tmp/bep.txt | grep remote_accept_cached
│      │    → if false, find where it was set (cli vs .bazelrc)
│      │
│      ├─ Cache hits work on one machine, not the other
│      │    → run the two-machine execlog-diff recipe (Tree 2, or
│      │      bazel.build/remote/cache-remote#caching-across-machines)
│      │      → BZL-CACHE-16
│      │
│      └─ Intermittent failures, exit code 39
│           → retryable by design; leave --experimental_remote_cache_eviction_retries
│             at its default of 5 (BZL-CACHE-12/13); on Bazel 9 there is no flag
│             to change the exit-code behaviour at all (the 8.x-only
│             --incompatible_remote_use_new_exit_code_for_lost_inputs is gone)
│
└─ A specific action is suspected of hitting the (wrong) cache tier
     → bazel build --execution_log_compact_file=/tmp/e.log <target>
       grep -A1 '"target_label": "<label>"' <converted-to-json log>
     │
     ├─ Action is ABSENT from the log entirely
     │    → persistent local action-cache hit (never logged, by spawn.proto's
     │      own contract) — not a miss; if unexpected, read the BEP's
     │      ActionCacheStatistics.miss_details (by MissReason) for the
     │      build-wide picture: BZL-CACHE-15
     │
     ├─ Action present with runner: "disk cache hit"
     │    → disk cache served it; du -sh <configured --disk_cache path> to
     │      check unbounded growth: BZL-CACHE-17
     │
     ├─ Action present with runner: "remote cache hit"
     │    → remote AC/CAS served it; if the label was expected to hit and
     │      didn't, re-run the two-run digest diff (Tree 2) to find the
     │      differing input/env/arg that busted the action key
     │
     └─ Action present with a real strategy name (e.g. "linux-sandbox") and
        cache_hit: false
          → genuine miss; check whether the repo/module the action depends on
            routes through the repository cache at all — only rctx.download()/
            .download_and_extract() do (container_pull, go_repository do not):
            BZL-CACHE-15, BZL-CACHE-18 (host-resolved tool invisible to the key)
```

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| BZL-CACHE-06 | No change; cite as-is in `bazel-diagnose` Tree 1/3 | [bazel-caching-rbe.md:176](../bazel-caching-rbe.md) | normative |
| BZL-CACHE-12/13 | Confirm default retries=5 unchanged on 8.7.0 and 9.2.0; add the 9.x note that no flag remains to alter the 39-vs-34 choice | [ExecutionOptions.java diff, 8.8.0→9.0.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.0.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java) | measured |
| BZL-CACHE-15 | Add the six discriminator commands from this file's Q3 table directly into the rule's verification field, or into `bazel-diagnose` Tree 3 | this file, Q3 | measured |
| BZL-CACHE-16 | Add the independently-sourced official citation (`remote/cache-remote.md#compare-logs`) alongside the existing derivation | [cache-remote.md](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/remote/cache-remote.md) | normative |
| BZL-CACHE-17 | No change | — | normative |
| BZL-CACHE-23 | Add `--experimental_remote_grpc_log` → `--remote_grpc_log` as a second confirmed rename (first was the merkle-tree-cache non-existent flag) | [RemoteOptions.java:451-453](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java) | normative |
| BZL-HERM-15 | Add the independently-sourced official citation for the same-machine recipe, and cross-link the `bb explain` packaged equivalent | [bb-explain.md](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/website/changelog/bb-explain.md) | normative |
| BZL-HERM-16 | No change | — | normative |
| NEW-1 | `bazel-diagnose` MUST NOT cite `bazel analyze-profile` for any Bazel-9 target; the skill's slow-build entry point should state the command was removed at 9.0.0 and the replacement is chrome://tracing/Perfetto or a third-party tool | Directory diff, [8.8.0](https://github.com/bazelbuild/bazel/tree/8.8.0/src/main/java/com/google/devtools/build/lib/runtime/commands) vs [9.0.0](https://github.com/bazelbuild/bazel/tree/9.0.0/src/main/java/com/google/devtools/build/lib/runtime/commands) | normative |
| NEW-2 | `bazel-diagnose` MUST use `--skyframe=active_directories`/`active_directories_frontier_deps` for any Bazel-9 target, `working_set`/`working_set_frontier_deps` only for Bazel-8; note the current `memory.md` doc is stale on this for 9.x | [DumpCommand.java](https://raw.githubusercontent.com/bazelbuild/bazel/9.0.0/src/main/java/com/google/devtools/build/lib/runtime/commands/DumpCommand.java) diffed 8.8.0→9.0.0 | normative |
| NEW-3 | State Skymeld (`--experimental_merged_skyframe_analysis_execution`) defaults `true` on both 8.7.0 and 9.2.0; do not describe it as opt-in | [BuildRequestOptions.java:379-386](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java) | normative |
| NEW-4 | Add BEP's `ActionCacheStatistics` (`hits`/`misses`/`miss_details` by `MissReason`) as the named one-command discriminator for the local action cache in Q3/BZL-CACHE-15's verification | [action_cache.proto](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/action_cache.proto) | normative |
| NEW-5 | `bazel-diagnose` should route EngFlow's Bazel Invocation Analyzer to the slow-build entry point (it consumes the JSON trace profile) and `bb explain` to the non-hermetic entry point (it consumes the compact execution log) — do not present them as interchangeable | [EngFlow README](https://raw.githubusercontent.com/EngFlow/bazel_invocation_analyzer/main/README.md), [bb-explain.md](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/website/changelog/bb-explain.md) | normative |

## AI-agent angle

An agent trained on pre-2026 material will confidently write `bazel analyze-profile` for a Bazel-9 repo — it is in five years of blog posts, BazelCon slides, and even Bazel's own 9.1.0 doc snapshot. Check: `bazel help analyze-profile` on the pinned version; a "not found" (or, faster, grepping the pinned Bazel's own `commands/` source directory for `ProfileCommand.java`) is the stop signal. The smallest mechanical check that generalizes past this one command: before citing *any* Bazel subcommand or `bazel dump --skyframe=` value in agent-authored guidance, verify it against the exact pinned tag's source tree, not the unversioned `bazel.build` page and not the versioned snapshot for a nearby minor — both can be wrong in either direction, and this wave caught both directions inside a single command (`analyze-profile` gone from source but present in the 9.1.0 snapshot; `--skyframe=working_set` gone from 9.x source but present in the *current* HEAD page).

## Contested / evolving

- Whether Skymeld's phase overlap has (or should have) a distinct visual signature in the JSON trace profile is unresolved — no primary source names one; an agent should describe it in terms of concurrent analysis/execution activity on the Main Thread rather than a labelled lane.
- The exact wall-clock or byte threshold at which "glob over a huge tree" becomes a diagnosable performance problem (as opposed to the correctness problem `BZL-HERM-19`/`BZL-ARCH-02` already cover) has no published number; this file's Tree 1 treats it as a reading heuristic (`packages_loaded` dominating `targets_configured`), not a hard rule.

## Not settled

- No official Bazel doc documents Skymeld's rendering in the JSON trace profile; settling this needs either a labelled example trace from the Bazel team or a from-scratch capture-and-annotate exercise against a known-Skymeld-heavy build, which this wave's budget did not include.
- Whether `bazel.build`'s memory-optimisation page will be corrected for the `active_directories` rename before the fleet's next docs refresh is unknown; re-check `site/en/advanced/performance/memory.md` against `master` at the next research pass.
- The exact commit/PR that removed `ProfileCommand.java` was not tracked down (only the tag-to-tag directory diff was verified); a `git log` bisection between 8.8.0 and 9.0.0 on that path would pin the precise date and rationale if the skill ever needs the commit link.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [ExecutionOptions.java @ 8.7.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java) | Bazel source, tagged | 8.7.0 (fleet pin) | Ground truth for execution-log flags and the `incompatible_remote_use_new_exit_code_for_lost_inputs` flag's presence |
| [ExecutionOptions.java @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/exec/ExecutionOptions.java) | Bazel source, tagged | 9.2.0 (Active LTS) | Same, confirming the flag's absence |
| [MemoryPressureOptions.java @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/MemoryPressureOptions.java) | Bazel source, tagged | 9.2.0 | `gc_thrashing_threshold`/`skyframe_high_water_mark_*` exact defaults and the dead `oom_more_eagerly` alias |
| [RemoteOptions.java @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java) | Bazel source, tagged | 9.2.0 | `remote_grpc_log` rename, TTL/lease/chunking flags |
| [CommonCommandOptions.java @ 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java) | Bazel source, tagged | 9.2.0 | `--profile`, `--generate_json_trace_profile`, `--memory_profile`, `--heap_dump_on_oom`, `--slim_profile`, `--starlark_cpu_profile` |
| [DumpCommand.java, 8.8.0 vs 9.0.0](https://github.com/bazelbuild/bazel/tree/9.0.0/src/main/java/com/google/devtools/build/lib/runtime/commands) | Bazel source, tagged (two tags diffed) | 8.8.0 / 9.0.0 boundary | Proves the `working_set`→`active_directories` rename and its exact version boundary |
| [`runtime/commands/` directory, five tags](https://github.com/bazelbuild/bazel/tree/8.7.0/src/main/java/com/google/devtools/build/lib/runtime/commands) | Bazel source, directory listings via `gh api` | 8.7.0/8.8.0/9.0.0/9.1.0/9.2.0 | Proves `ProfileCommand.java`/`analyze-profile.txt` exist through 8.8.0 and are gone from 9.0.0 onward |
| [`docs/versions/9.1.0/run/build.mdx`](https://raw.githubusercontent.com/bazelbuild/bazel/master/docs/versions/9.1.0/run/build.mdx) | Bazel's own frozen doc snapshot | Frozen at 9.1.0, fetched 2026-09-05 | Shows the doc bug: the 9.1.0 snapshot still lists `analyze-profile` after the command was removed from that exact tag's source |
| [`site/en/advanced/performance/memory.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/advanced/performance/memory.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | Shows the mirror-image doc bug: still cites `--skyframe=working_set`, the pre-9.0.0 value |
| [`site/en/rules/performance.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/rules/performance.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | `bazel dump --rules`/`--skylark_memory`, memory-tracking startup flags, `bazel info used-heap-size-after-gc` worked example |
| [`site/en/advanced/performance/json-trace-profile.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/advanced/performance/json-trace-profile.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | Profile lane names; confirmed zero mentions of Skymeld |
| [`site/en/advanced/performance/iteration-speed.md`](https://bazel.build/advanced/performance/iteration-speed) | Bazel doc (fetched via summarizer) | current | Analysis-cache-discard triggers, `-c opt`/`cquery` conflict, Skyfocus flags |
| [`site/en/remote/cache-remote.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/remote/cache-remote.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | The official two-run and two-machine execlog-diff recipes, verbatim |
| [`site/en/remote/cache-local.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/remote/cache-local.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | The status-line format and "local cache hits are not included" statement |
| [`site/en/docs/user-manual.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/docs/user-manual.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | `--explain`/`--verbose_explanations` exact scope and caveats |
| [`site/en/extending/toolchains.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/extending/toolchains.md) | Bazel's current (HEAD) doc | Fetched 2026-09-05 | `--toolchain_resolution_debug` worked examples, matching source exactly |
| [`src/tools/execlog/README.md`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/tools/execlog/README.md) | Bazel source doc | 9.2.0 | Parser/converter usage, `--restrict_to_runner`, `--sort` ownership |
| [`src/main/protobuf/spawn.proto`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/spawn.proto) | Bazel source (proto) | 9.2.0 | `SpawnExec` fields, the "persistent action cache is never reported" comment |
| [`src/main/protobuf/action_cache.proto`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/action_cache.proto) | Bazel source (proto) | 9.2.0 | `ActionCacheStatistics`/`MissReason` — the BEP discriminator for the local action cache |
| [`website/changelog/bb-explain.md`](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/website/changelog/bb-explain.md) | BuildBuddy changelog | 2026-03-09 | Dated, in-era announcement of `bb explain`'s scope and behaviour |
| [`cli/explain/explain.go`](https://raw.githubusercontent.com/buildbuddy-io/buildbuddy/master/cli/explain/explain.go) | BuildBuddy CLI source | current | Exact `bb explain` flag set |
| [EngFlow `bazel_invocation_analyzer` README + suggestionproviders listing](https://raw.githubusercontent.com/EngFlow/bazel_invocation_analyzer/main/README.md) | Tool source + docs | current | Confirms JSON-trace-profile input and names the 14 suggestion categories |
| [`bazel.build/run/scripts`](https://bazel.build/run/scripts) | Bazel doc (fetched via summarizer) | current | Exit code table (34, 37, 38, 39) |
| [`.agents/research/bazel-caching-rbe.md`](../bazel-caching-rbe.md) | Prior consolidation, this program | 2026-09-05 | `BZL-CACHE` rule text this file cites and refines |
| [`.agents/research/bazel-hermeticity-determinism.md`](../bazel-hermeticity-determinism.md) | Prior consolidation, this program | 2026-09-05 | `BZL-HERM` rule text this file cites |
| [`.agents/research/bazel-frame.md`](../bazel-frame.md) | Program frame + Corrections | 2026-09-05 | Wave-2 Correction 3 (repo contents cache), Correction 6 (exit 39 history) |
