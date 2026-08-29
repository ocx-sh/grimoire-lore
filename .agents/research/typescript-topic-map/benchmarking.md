---
title: Benchmarking JavaScript and TypeScript
corpus: typescript-topic-map
agent: scout-benchmarking
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 23
scope: >
  Covers microbenchmark libraries (tinybench, mitata, Vitest bench, Bun/Deno
  built-ins, benchmark.js), whole-process CLI benchmarking (hyperfine), the
  methodology of why JS microbenchmarks lie (JIT warm-up, DCE, GC, timer
  resolution), CI regression-gating tools (github-action-benchmark, CodSpeed,
  Bencher), and Node/Bun process-startup cost. Does NOT cover browser
  RUM/Web-Vitals field measurement, load testing (k6/autocannon), or
  language-level perf tuning unrelated to measurement methodology.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [tinybench](#1-tinybench)
   2. [mitata](#2-mitata)
   3. [Vitest `bench`](#3-vitest-bench)
   4. [Bun.bench / `bun test --bench`](#4-bunbench--bun-test---bench)
   5. [Deno.bench](#5-denobench)
   6. [benchmark.js — legacy, confirmed dead](#6-benchmarkjs--legacy-confirmed-dead)
   7. [hyperfine — whole-process CLI benchmarking](#7-hyperfine--whole-process-cli-benchmarking)
   8. [The methodology corpus: how a microbenchmark lies](#8-the-methodology-corpus-how-a-microbenchmark-lies)
   9. [Regression detection in CI](#9-regression-detection-in-ci)
   10. [Node/Bun startup cost](#10-nodebun-startup-cost)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- Nobody in the fleet benchmarks anything today — zero `.bench.*` files, zero `tinybench`/`mitata` deps, zero benchmark CI jobs across all nine repos (verified by grep, 2026-08-29).
- **tinybench 6.1.4** (published 2026-08-28, i.e. yesterday) is the de-facto default: it's what Vitest's `bench` wraps, it's actively maintained, and it self-reports timer-resolution saturation via a `warning` event rather than silently lying.
- **benchmark.js is dead**: its GitHub repo (`bestiejs/benchmark.js`) is **archived**, last commit 2022-12-22; the npm package hasn't shipped since **2.1.4 (2017-03-28)**. An agent reaching for it is reaching for a 9-year-old tool with no maintainer.
- **mitata** (npm 1.0.34, 2025-02-04; repo last pushed 2025-02-17) is not dead but is quiet — ~18 months with no commits as of 2026-08-29. It remains the best tool for anything Bun-related: Bun's own docs recommend it by name, it auto-detects dead-code-elimination and prints a `!` warning inline, and it supports hardware perf counters (IPC, cache misses) on Linux/macOS.
- **Vitest's `bench`** is still labeled **Experimental** in the v4 docs even though Vitest is at v4.1.11 (2026-08-18) with v5.0.0-rc.3 already shipping (2026-08-28) — treat its API as unstable across a major bump.
- **Deno.bench** and **Bun** have no equivalent first-party `bench` primitive in `bun test`; Bun's docs explicitly point away from a built-in and say "we recommend mitata" for microbenchmarks and "we recommend hyperfine" for CLI/script timing.
- The single most important methodology fact, straight from **Node core's own contributor guide**: a single benchmark run "does not provide the statistical information to make any conclusions" — Node's `--analyze` flag runs a **Welch's t-test** and the guide recommends treating only **two-star (`**`) significance** as real, because one-star routinely false-positives.
- Dead-code elimination is the sharpest way a microbenchmark lies: if the JIT can prove a computed value is never observed, it deletes the computation you're timing. mitata detects this automatically and marks the line with `!`; tinybench/Vitest do not — you must manually consume the result (`do_not_optimize`, or the classic sum-into-an-accumulator trick).
- V8's own team retired their flagship **Octane** benchmark in 2017 specifically because engineers were gaming synthetic scores in ways that *regressed* real Node.js and Ember applications — the canonical, primary-source case study for "the benchmark measuring the harness, not reality."
- **hyperfine 1.20.0** (2025-11-18) is the right tool for this fleet's two CLIs (`ocx-catalog`, `grimoire-indexer`): it measures whole-process wall time, corrects for shell-spawn overhead automatically, supports `--warmup N`, `--shell=none` for sub-5ms commands, and `--export-json` for CI.
- **CI regression gates are a genuinely hard, mostly-unsolved problem** for wall-clock JS benchmarks: CodSpeed's own blog post says plainly that Vitest `bench` results are "inconsistent between runs" on a shared CI runner, and Bencher documents GitHub Actions runners at **>30% variance** run-to-run.
- **github-action-benchmark** (v1.22.1, 2026-05-06) is the free, no-new-service option: it defaults `alert-threshold` to **200%** (i.e. only alerts on a 2x regression) which is a very loose gate — tightening it on a noisy GH-hosted runner produces false alarms.
- **CodSpeed** solves runner noise by *not measuring wall clock at all* — it uses CPU-instrumentation/simulation to get <1% variance regardless of load, but its own marketing page names Rust/C++/Go/Python/Node.js as supported languages without specifically confirming Vitest-bench parity beyond the plugin blog post.
- **Bencher** takes the opposite tack: keep wall-clock timing but run it on **dedicated bare-metal runners** (claimed <2% variance) plus statistical (t-test-style) regression detection — this requires either their SaaS or self-hosted bare metal, which nine small repos on GitHub-hosted runners don't have.
- **Node startup**: type stripping (`--experimental-strip-types` machinery) is **stable and enabled by default since Node 23.6.0 / stabilized v25.2.0** — it does whitespace-substitution erasure via the `amaro`/SWC-based stripper, no type-checking, and explicitly rejects enums/namespaces-with-code/parameter-properties with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.
- **Node SEA** (Single Executable Applications) supports an opt-in V8 **startup snapshot** (`useSnapshot`) that serializes post-initialization heap state at build time so the CLI deserializes straight to a ready state instead of re-running init code on every launch — directly relevant to `ocx-catalog`/`grimoire-indexer` if npm-install-then-spawn latency ever becomes a complaint.
- **Bun** ships a parallel answer: `bun build --compile` produces a standalone executable, and its own docs give one concrete number — bytecode compilation makes **`tsc` start 2x faster** — by moving parse/transpile cost from every launch to build time.
- **The decision this brief exists to answer**: for nine repos this small, full microbenchmark suites are not worth building. The one thing worth gating is **CLI cold-start wall time** on the two npm-distributed CLIs, measured with hyperfine, because process-startup is the one place where "slow" is a thing an end user actually feels on every invocation — see [Findings §10](#10-nodebun-startup-cost) and the verdict table.

## Findings

### 1. tinybench

[tinybench](https://github.com/tinylibs/tinybench) is at **v6.1.4**, published **2026-08-28** per the npm registry (`npm view tinybench version time.modified` → `6.1.4`, `2026-08-28T21:56:23.172Z`), and the GitHub repo was pushed to as recently as **2026-08-29** — this is an actively-maintained library, not a snapshot-in-time dependency.

Statistical model, per its own README and FAQ:
- Reports **mean, median (p50), standard deviation, variance, relative margin of error (RME), and percentiles (p75/p99)** for both latency and throughput. Example table row from the README: `'faster task' | '63768 ± 4.02%' (latency ns) | '58954 ± 15255.00' (median ± MAD)`.
- **Warm-up is on by default** and excluded from reported statistics; tunable via `warmupIterations` (Vitest default 5) / `warmupTime` (Vitest default 100ms). Disabling it (`warmup: false`) lets first-sample JIT cost pollute results. — [tinybench FAQ.md](https://github.com/tinylibs/tinybench/blob/main/FAQ.md)
- **No automatic outlier rejection.** Instead it surfaces a `'warning'` event with `reason` ∈ `'zero-dominated' | 'low-distinct' | 'zero-mad'` when timer-resolution saturation is detected, plus a per-task `detectedResolution` field. The FAQ is explicit that **RME alone is not a reliable saturation signal** — "a saturated task can report either a very high or a very low `rme`, so do not rely on it alone." — [tinybench FAQ.md](https://github.com/tinylibs/tinybench/blob/main/FAQ.md)
- Timestamp providers are pluggable (`hrtimeNow`, `performanceNow`, `bunNanoseconds`, `auto`) so precision differs by runtime.
- By default samples are **not retained** (memory optimization) — set `retainSamples: true` per-task or bench-wide to get raw samples for custom analysis/export.
- No built-in dead-code-elimination detection (contrast with mitata, §2).

### 2. mitata

[mitata](https://github.com/evanwashere/mitata) is at npm **1.0.34** (published **2025-02-04**), with the last tagged GitHub release **v1.0.23** ("mitata december holidays update", **2024-12-25**) and the repo last pushed **2025-02-17**. As of 2026-08-29 that is roughly 18 months of low commit activity — not archived, not dead, but slower-moving than tinybench.

Its README states its own top-line recommendations before you even benchmark: *"use dedicated hardware for running benchmarks"*, *"run with manual garbage collection enabled (e.g. `node --expose-gc ...`)"*, and links [LLVM's own benchmarking tips](https://llvm.org/docs/Benchmarking.html) as required reading. — [mitata README](https://github.com/evanwashere/mitata)

Statistical/methodology specifics:
- **Built-in dead-code-elimination detection.** Output rows for optimized-away code get a trailing `!` marker with the caption "benchmark was likely optimized out (dead code elimination)" — no special engine flags required.
- **GC handling is explicit and configurable** via `.gc(mode)` per benchmark: `false | 'once' (default) | 'inner'`. Default runs GC once after warm-up; `'inner'` runs GC before every batch-iteration for allocation-heavy code where GC pause timing would otherwise leak into results.
- Reports **min/max range, percentile histogram (ascii sparkline), and — when GC stats are available — a separate GC-timing row and estimated heap usage** per sample.
- Supports **hardware performance counters** (IPC, cache-miss %, retired instructions) via the optional `@mitata/counters` package on Linux (amd64/aarch64) and Apple Silicon macOS — requires `/proc/sys/kernel/perf_event_paranoid <= 2` on Linux.
- Its "writing good benchmarks" section (`#writing-good-benchmarks`) is a self-contained, code-level tutorial on the exact JIT pitfalls covered generically in §8 below: dead-code elimination (fix: `do_not_optimize(value)`), GC pressure (fix: `.gc('inner')`), and **loop-invariant code motion** — the JIT hoisting a per-iteration computation out of the loop because both operands are compile-time-known constants (fix: computed/generator parameters instead of closed-over constants).
- Runs on Node, Bun, Deno, and even non-Node engines (d8, QuickJS, JavaScriptCore, GraalJS, SpiderMonkey CLIs) via its universal-compatibility layer.

### 3. Vitest `bench`

Vitest's own docs are explicit: *"Vitest uses the [tinybench] library under the hood, inheriting all its options."* — [vitest.dev/api](https://vitest.dev/api/). Options and defaults documented there: `time` (500ms), `iterations` (10, used as the floor if `time` elapses first), `warmupTime` (100ms), `warmupIterations` (5), plus `setup`/`teardown` hooks. Results expose `hz`, `mean`, `variance`, `sd`, `p75`/`p99`/`p995`/`p999`, `rme`, and raw `samples`.

Critically, Vitest's own **Features** guide still marks the whole capability **"Benchmarking Experimental"** as of the docs read on 2026-08-29 — [vitest.dev/guide/features](https://vitest.dev/guide/features.html) — despite Vitest itself being well past that: npm shows **v4.1.11** published **2026-08-18**, and a **v5.0.0-rc.3** was published **2026-08-28**. The fleet currently spans vitest `^2.1.8` (fma) to `^4.1.10` (grimoire-indexer); an experimental API surviving three major version bumps unstably is a real risk for anyone who adopts `bench` now and then upgrades across v5.

Because it's a thin tinybench wrapper, everything in §1 applies: warm-up-on-by-default, RME-not-a-saturation-signal, no DCE detection.

### 4. Bun.bench / `bun test --bench`

There is **no `bench()` API and no `--bench` flag in `bun test`** — confirmed by reading Bun's own [Writing tests](https://bun.com/docs/test/writing-tests) doc, which covers Jest-compatible `test`/`describe`/`it` but nothing benchmark-shaped. Bun's dedicated [Benchmarking](https://bun.com/docs/project/benchmarking) page instead **recommends mitata by name** for microbenchmarks, `performance.now()` / `Bun.nanoseconds()` for ad-hoc timing, and **hyperfine by name** for CLI/script-level timing — Bun's own maintainers are pointing users at exactly the two tools this brief separately validates (§2, §7), not at a Bun-native primitive. This means "`Bun.bench`" as a named API does not exist — an agent inventing it is hallucinating a Deno-shaped feature onto Bun.

### 5. Deno.bench

`Deno.bench()` is real and native, run via `deno bench` — [docs.deno.com/runtime/reference/cli/bench](https://docs.deno.com/runtime/reference/cli/bench/). Deno is at **v2.9.6** (released **2026-08-27**). Key mechanics from the docs:
- `Deno.BenchDefinition` supports `warmup` (warmup count), `n` (iteration count), `group` + `baseline` (compare a set of benchmarks against one marked baseline within the group — first baseline wins if multiple are marked), plus `ignore`/`only`/permissions.
- Default table output columns: `time/iter (avg)`, `iter/s`, `(min … max)`, `p75`, `p99`, `p995`.
- `--json` flag emits a full JSON payload (version, runtime, CPU info, per-benchmark `n`/min/max/avg/percentiles/precision) — directly usable for CI regression tooling.
- Supports critical-section timing via `b.start()`/`b.end()` to exclude setup/teardown from the measured window, and async benchmark functions natively.
- Not relevant to this fleet directly (no repo runs on Deno) but useful as a design reference: Deno's baseline/group comparison model is closer to what a "gate" needs than tinybench's flat per-task output.

### 6. benchmark.js — legacy, confirmed dead

State it plainly: **benchmark.js is dead.** The upstream repo `bestiejs/benchmark.js` on GitHub is **archived** (`archived: true`), with `pushed_at: 2022-12-22` — no commits in nearly four years as of 2026-08-29. The npm package `benchmark` last published **2.1.4 on 2017-03-28**; the registry's `time.modified` field (2023-06-09) is a metadata touch, not a real release (verified via `npm view benchmark time --json`, which shows no version newer than 2.1.4 in the publish history). It predates ES2015 modules, async iterators, and every modern JIT-tier-up mechanism this brief covers. An agent trained on older text reaching for `new Benchmark.Suite()` is reaching for a tool whose maintainers stopped responding before Node 14 shipped.

### 7. hyperfine — whole-process CLI benchmarking

[hyperfine](https://github.com/sharkdp/hyperfine) is at **v1.20.0**, released **2025-11-18**. It is the correct tool for `ocx-catalog` and `grimoire-indexer` because both are process-shaped (a CLI invocation, not a hot function) — wall-clock-per-invocation is the metric a user actually experiences.

From its own README:
- Default behavior: *"at least 10 benchmarking runs and measure for at least 3 seconds"* — override with `-r`/`--runs N`.
- **Warm-up**: `-w`/`--warmup N` performs N executions before timing begins, "on warm caches" — essential for anything that touches disk (npm's module resolution, first-run cache population).
- **Shell exclusion**: `-N`/`--shell=none` skips the intermediate shell, recommended for commands **under ~5ms** where shell-spawn correction itself becomes the dominant noise source. Note hyperfine *always* corrects for shell-spawn time by calibrating an empty-command run first — you only need `--shell=none` when that correction's own variance swamps the signal.
- **Cache control**: `-p`/`--prepare <cmd>` runs a command before each timed run — the README's own example clears the OS page cache (`sync; echo 3 | sudo tee /proc/sys/vm/drop_caches`) to force cold-cache measurement, the opposite of warm-up.
- **Statistical outlier detection** is a named feature ("to detect interference from other programs and caching effects") but the README does not spell out the exact algorithm (it is a MAD/IQR-style filter in the Rust source, not documented in prose in the README itself — treat as "present but not user-tunable via a documented flag").
- **Export formats**: `--export-json`, `--export-markdown`, plus CSV and AsciiDoc. The `scripts/` folder in the repo ships Python helpers for turning the JSON into histograms/whisker plots for CI artifacts.

Exact command for this fleet's shape:
```
hyperfine --warmup 3 --runs 20 --export-json bench.json \
  'node dist/cli.js --version'
```

### 8. The methodology corpus: how a microbenchmark lies

This is the section the brief asks to weight most heavily. Each mechanism, its concrete cause, and its defense — grounded in primary sources, not folklore:

**JIT warm-up / tier-up.** V8 (and every modern engine) starts new code in an interpreter (Ignition) and promotes "hot" functions through progressively more optimizing JIT tiers (Sparkplug/Maglev/TurboFan in V8's case) after enough invocations. A benchmark that measures from cold includes interpreter-speed samples blended with fully-optimized samples, producing a number that describes neither state.
- *Defense*: run a warm-up phase excluded from the measured window — this is exactly what tinybench's default `warmup: true` and hyperfine's `--warmup N` do. Node's own contributor guide (§ below) treats this as table stakes, not optional.

**Dead-code elimination (DCE).** If the optimizing compiler can prove the result of a computation is never observed, it deletes the computation — you end up benchmarking an empty loop. mitata's README calls this out with a worked example: `yield () => new Array(0)` gets folded to `yield () => {}` because nothing reads the array; the fix is `do_not_optimize(new Array(0))` to force an observable side effect. — [mitata "writing good benchmarks"](https://github.com/evanwashere/mitata#writing-good-benchmarks). tinybench and Vitest's `bench` have **no automatic detection of this** — you must manually sink the result (accumulate into a variable read after the loop, or use a library helper) or you are silently timing nothing.

**Loop-invariant code motion (constant folding, generalized).** When the JIT can prove a value inside a loop doesn't change between iterations (a literal, or a value the JIT can prove is constant across the loop), it hoists the computation out of the loop and caches the single result — again timing nothing on every iteration but the first. mitata's own example: `str.includes(substr)` where both `str` and `substr` are effectively compile-time-known gets folded to a single boolean computed once. *Defense*: use per-iteration "computed parameters" (a generator function re-supplying fresh, JIT-opaque values each cycle) rather than closed-over constants.

**Allocation-sinking / escape analysis.** A near-cousin of DCE specific to object/array allocation: if the engine can prove an allocated object never escapes the measured scope, it may eliminate the allocation entirely (scalar replacement). This is why mitata separately warns about **GC pressure** as its own axis, not just DCE — a benchmark that "measures allocation cost" can end up measuring nothing if the allocation is provably dead.

**GC pauses mistaken for algorithmic variance.** Allocation-heavy code triggers garbage collection at unpredictable points relative to the sample boundary, inflating variance and sometimes attributing GC pause time to the wrong sample. *Defense*: mitata's `.gc('inner')` mode forces a GC sweep before every batch-iteration so pause cost is either fully excluded or fully and evenly included, never randomly smeared across samples; the general-purpose equivalent is running with `--expose-gc` and calling `global.gc()` between iterations yourself if using a tool without built-in GC control (tinybench has none).

**Timer resolution / "the benchmark measuring the harness."** If a task completes faster than the timer's tick resolution, every sample reads as `0` or as a multiple of the tick, which tinybench's FAQ documents explicitly: it surfaces `detectedResolution` and a `'warning'` event (`reason: 'zero-dominated' | 'low-distinct' | 'zero-mad'`) rather than silently reporting a fabricated number — and warns that "manually looping a fast function to 'amplify' its duration ... adds loop overhead and changes what you measure," i.e. batching to dodge timer resolution is itself a measurement-shape change, not a free fix.

**Insufficient iterations / no statistical footing.** A single run, or too few samples, cannot distinguish signal from noise. Node.js core's own [contributor benchmarking guide](https://github.com/nodejs/node/blob/main/doc/contributing/writing-and-running-benchmarks.md) states plainly that running a benchmark once "does not provide the statistical information to make any conclusions about the performance," and ships a `calibrate-n.js` tool that starts at n=10 and multiplies by 10x until the **coefficient of variation drops below 5%** (default 30 runs per candidate n).

**Comparing across processes / different hardware.** Two separate process invocations (or two different machines) carry independent noise floors — CPU frequency scaling, cache state, background load — that swamp small real differences. Node core's guide addresses the *statistical* half of this with a built-in `--analyze` flag that runs a **Welch's t-test** (no external dependency needed) between two benchmark result sets, and warns that naive single-star significance (`p < 0.05`) will show a false positive roughly 1 time in 20 by construction — *"it's normal that one of them will show significance, when it shouldn't. A possible solution is to instead consider at least two stars (`**`) as the threshold"* for a ~1% false-positive risk. mitata's own top recommendation for the *hardware* half of this problem is blunt: **"use dedicated hardware for running benchmarks."**

**CI runners as noisy neighbours.** This is the least-solved problem in the whole corpus (see §9): shared, virtualized CI hardware has no isolation guarantee, and both major regression-gating vendors say so in their own docs — CodSpeed's blog states Vitest-bench numbers are "inconsistent between runs" on ordinary CI, and Bencher's docs cite **>30% run-to-run variance on GitHub Actions runners**.

**The historical case study: V8 retiring Octane (April 2017).** V8's own team [retired their flagship Octane benchmark](https://v8.dev/blog/retiring-octane) because by 2015 every engine had over-fitted to it: engineers found and exploited real Octane-specific bugs (a Box2DWeb comparison-operator bug worth "~15% performance boost on Octane" with zero real-world benefit), and some optimizations chased purely for Octane score **regressed real applications** — aggressive inlining that ballooned compile time/memory, and a dynamic-pretenuring heuristic and an `instanceof` optimization that both caused measurable regressions in production Ember and Node.js apps respectively. This is the primary-source proof that "the benchmark measuring the harness, not reality" is not theoretical — it happened to the team that builds the engine.

### 9. Regression detection in CI

Turning a benchmark into a gate (not a number nobody reads) requires solving two separable problems: *storing/comparing* results over time, and *not flaking* on CI noise.

**[github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark)**, v1.22.1 (**2026-05-06**): free, self-hosted-in-your-own-repo via GitHub Pages. Reads output from `benchmark.js` (and cargo bench/go bench/pytest-benchmark/etc — **tinybench's format is not in its documented list**, so a custom JSON adapter via `customBiggerIsBetter`/`customSmallerIsBetter` would be needed for a tinybench/Vitest-bench pipeline). Threshold discipline is two config keys: `alert-threshold` (default **200%** — i.e. it only complains when a result is *twice* as slow as before) and `fail-on-alert` (default `false`, must be explicitly turned on to actually break the build); a separate, stricter `fail-threshold` can be set apart from the alert threshold. A 200% default is a very loose gate by design — tuned for noisy free CI runners, not for catching a 10-20% regression.

**[CodSpeed](https://codspeed.io/)**: does not measure wall-clock time at all. It uses CPU-instrumentation/simulation to make measurements deterministic (its own copy: "bring benchmarking variance below 1%"). It ships a first-party `@codspeed/vitest-plugin` — confirmed via its own blog post [Using Vitest bench to track performance regressions](https://codspeed.io/blog/vitest-bench-performance-regressions), which states outright that plain Vitest-bench-on-CI is "inconsistent between runs" and that without CodSpeed's plugin active it falls back to "the default vitest runner" with a visible warning. Setup is `pnpm add -D @codspeed/vitest-plugin`, add `codspeedPlugin()` to `vitest.config.ts`, run via `pnpm vitest bench` inside CodSpeed's own GitHub Action. Its landing page names Node.js among supported languages generally but does not itemize TS-specific caveats.

**[Bencher](https://bencher.dev/)**, v0.6.12 (**2026-08-22**): the opposite bet — keeps real wall-clock timing but recommends **dedicated bare-metal runners** (Bencher's own or self-hosted) to control the noise floor, citing **>30% variance on ordinary GitHub Actions runners** vs **<2% on their bare-metal runners**. Statistical detail (t-test vs percentage threshold) is not spelled out on the page read; it's deferred to a separate `Thresholds & Alerts` doc not fetched in this pass.

**The hard statistical problem — comparing runs on different hardware — has no clean free answer for GitHub-hosted runners.** All three tools essentially agree the honest fix is either (a) don't trust wall clock at all (CodSpeed's instrumentation route) or (b) buy/host consistent hardware (Bencher's bare-metal route). The zero-cost option — `github-action-benchmark` on ordinary GitHub-hosted runners — only works with a threshold loose enough to absorb GH-runner noise (its own 200% default is the tell), which limits it to catching gross regressions (2x+), not the 10-30% regressions that matter for a hot path.

### 10. Node/Bun startup cost

For a CLI, process startup is frequently the entire user-perceived latency (`ocx-catalog`/`grimoire-indexer` both run once and exit; there's no long-lived warm process to amortize JIT tier-up into).

**How to measure it**: hyperfine on the actual invocation, e.g. `hyperfine --warmup 5 'node dist/cli.js --version'` — this captures process fork/exec, module resolution, and any top-level work, which is exactly the number a user feels.

**What reduces it, per each runtime's own docs**:
- **Type stripping is now free and default.** Node's [`typescript.html` docs](https://nodejs.org/api/typescript.html) state type stripping is **enabled by default since Node 23.6.0** and reached **Stable** status by **v25.2.0** (with `--experimental-transform-types` removed entirely in v26.0.0). Mechanically it does whitespace-substitution erasure (inline types replaced with spaces, preserving line numbers, no source maps needed, no codegen) — this is why it's cheap; it is not compiling, it is deleting. It explicitly **does not support** enum declarations, namespaces with runtime code, parameter properties, import aliases, or decorators — those error with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` rather than silently mis-stripping. Node's current release line is **v26.8.1** (**2026-08-26**) per the project's own GitHub releases; the fleet's declared engines floor at Node ≥20 or ≥24 depending on repo, all well past the stabilization point.
- **Bundling removes module-resolution overhead.** Both `ocx-catalog` and `grimoire-indexer` are already commander-based CLIs; a single bundled entry point (esbuild, as `grimoire-vscode`/`vscode-ocx` already do) avoids the multi-file `require`/`import` resolution walk that dominates cold start for a many-file CLI.
- **V8 startup snapshots via Node SEA.** Node's [Single Executable Applications docs](https://nodejs.org/api/single-executable-applications.html) describe an opt-in `useSnapshot` build mode: the main script runs once *at build time*, and the post-initialization V8 heap state is serialized into the executable; at launch the runtime **deserializes the snapshot instead of re-executing initialization code**, which is the mechanism-level reason this reduces startup — it's not "faster startup," it's "skips startup." Requires calling `v8.startupSnapshot.setDeserializeMainFunction()` in the main script to designate what runs at actual launch time.
- **Bun's parallel answer**: [`bun build --compile`](https://bun.com/docs/bundler/executables) produces a standalone executable; with `--bytecode` added, Bun's own docs give one concrete measured number — **`tsc` starts 2x faster** — because bytecode compilation "moves parsing overhead for large input files from runtime to bundle time," trading a slower `bun build` for a faster every-single-launch cost. Not applicable to this fleet directly (no repo builds with Bun as a compile target) but a direct methodological analog to Node SEA snapshots.
- **`--experimental-strip-types` itself is not the bottleneck** — since it's default-on whitespace substitution rather than a real compile step, its marginal per-launch cost is not separable from Node's own baseline startup in the sources read; the actual cost driver for these two CLIs is far more likely module-resolution + `commander`'s own init path than type-stripping.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt / keep / drop / watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| [tinybench](https://github.com/tinylibs/tinybench) | in-process microbenchmark harness (stats: mean/median/SD/RME/percentiles) | 6.1.4, 2026-08-28 | mature, very active | **watch** — don't add it speculatively, but it's the correct default if a hot-path number is ever needed | actively maintained, zero-dep, is what Vitest wraps anyway | benchmark.js |
| [mitata](https://github.com/evanwashere/mitata) | in-process microbenchmark harness w/ DCE detection, GC control, HW counters | npm 1.0.34 (2025-02-04); repo pushed 2025-02-17 | maintained, low velocity (~18mo quiet) | **watch** | best DCE/GC-pressure ergonomics of any tool surveyed; Bun's own docs recommend it | benchmark.js; ad-hoc `console.time` loops |
| [Vitest `bench`](https://vitest.dev/api/) | `bench()` test-runner integration, wraps tinybench | vitest 4.1.11 (2026-08-18); `bench` itself labeled Experimental | unstable API on a stable runner | **watch** | convenient if you already run vitest, but Experimental across 3 majors is a real API-break risk | nothing — net-new capability |
| Bun.bench / `bun test --bench` | — does not exist — | n/a | n/a | **drop the assumption** | Bun's own docs recommend mitata + hyperfine instead; there is no first-party `bench()` | — |
| [Deno.bench](https://docs.deno.com/runtime/reference/cli/bench/) | native `deno bench` w/ group/baseline comparison, `--json` | Deno 2.9.6 (2026-08-27) | mature, first-party | **N/A** — no repo in fleet runs on Deno | not applicable to this fleet | — |
| [benchmark.js](https://github.com/bestiejs/benchmark.js) | classic in-process microbenchmark suite | npm 2.1.4 (2017-03-28); repo **archived** 2022-12-22 | **dead** | **drop** | archived, unmaintained since 2022, predates ESM | superseded by tinybench/mitata |
| [hyperfine](https://github.com/sharkdp/hyperfine) | whole-process CLI wall-clock benchmarking + statistical outlier detection | 1.20.0, 2025-11-18 | mature, active | **adopt** for the two CLIs' cold-start number | this fleet is process-shaped; hyperfine measures exactly the metric a user feels | ad-hoc `time` loops |
| [github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark) | CI action: stores results on GH Pages, alerts/fails on regression | v1.22.1, 2026-05-06 | mature, free | **watch** — only if a gate is actually adopted | zero-cost but 200% default threshold is loose; needs a custom JSON adapter for tinybench output | manual result-tracking spreadsheets |
| [CodSpeed](https://codspeed.io/) | instrumentation-based CI perf regression detection, <1% variance claimed | plugin ecosystem incl. `@codspeed/vitest-plugin` | mature SaaS, active | **watch** | solves CI-noise by not measuring wall clock; own blog admits plain Vitest-bench is noisy on CI | wall-clock CI benchmarking |
| [Bencher](https://bencher.dev/) | continuous benchmarking SaaS/self-host, bare-metal runners, statistical gate | 0.6.12, 2026-08-22 | mature, active | **watch** | keeps real wall-clock but needs dedicated hardware (SaaS or self-host) to be trustworthy | wall-clock CI benchmarking |
| Node SEA + V8 snapshot | serialize post-init heap state, skip re-running init on every launch | stable in current Node (v26.8.1, 2026-08-26) | mature, first-party | **watch** | mechanism-correct fix for CLI cold-start if it's ever measured and found wanting | plain `node dist/cli.js` |
| `--experimental-strip-types` machinery | default TS erasure in Node, whitespace substitution, no type-check | default-on since Node 23.6.0, Stable v25.2.0 | mature, first-party | **n/a (background fact)** | confirms wave-1: 7.0 has no stable programmatic API, but *runtime* TS stripping is already solved and fast | ts-node/tsx for a "just run it" use case |

## Normative guidance candidates

1. **Do not add a benchmark suite (tinybench/mitata/Vitest-bench) to this fleet speculatively.** *Rationale*: none of the nine repos has a measured hot path that a reviewer or user has complained about; a benchmark nobody reads is worse than no benchmark because it still needs maintaining through breaking API changes. *Verify*: `grep -r "tinybench\|mitata" package.json` across the fleet returns nothing — keep it that way until a real perf complaint exists.
2. **If a microbenchmark is ever written, it must consume its own result.** *Rationale*: unconsumed return values are eligible for dead-code elimination and will silently benchmark nothing (§8). *Verify*: reviewer heuristic — every `bench()`/`Bun.bench` callback either returns a value into the harness's own consumption path, calls `do_not_optimize()` (mitata), or assigns into an outer accumulator read after the loop.
3. **Never cite a single benchmark run as evidence of a regression or improvement.** *Rationale*: Node core's own guide states one run "does not provide the statistical information to make any conclusions." *Verify*: any PR description or commit claiming a perf number must show ≥2 runs or a tool's own confidence interval (RME, `± X%`), not a bare number.
4. **`benchmark.js` (the `benchmark` npm package or `Benchmark.Suite`) must not be added to any repo.** *Rationale*: archived upstream since 2022-12-22, unmaintained since before ES modules were common. *Verify*: `grep '"benchmark"' package.json` / any import of `Benchmark` — reject on sight.
5. **CLI cold-start is the one number worth gating for `ocx-catalog` and `grimoire-indexer`, measured with hyperfine, not a per-function microbenchmark.** *Rationale*: both ship as npm-distributed CLIs invoked once per use; process-startup latency is the whole user-visible cost. *Verify*: `hyperfine --warmup 5 --export-json cold-start.json 'node dist/cli.js --version'`; compare `mean` across baseline vs candidate.
6. **Any regression gate on GitHub-hosted (non-dedicated) runners must use a threshold no tighter than roughly 25-50%, not a percent-level threshold.** *Rationale*: Bencher documents >30% run-to-run variance on ordinary GitHub Actions runners; a tight threshold there is a flaky-gate generator, not a real signal. *Verify*: check the `alert-threshold`/`fail-threshold` config key on any adopted `github-action-benchmark` job — a value below ~50% on a GH-hosted runner is a red flag worth challenging in review.
7. **A benchmark comparing two variants must run both on the same machine in the same invocation of the tool, never across separate CI jobs/machines.** *Rationale*: process-to-process and machine-to-machine noise (frequency scaling, cache state, neighbour load) swamps small real differences; both mitata ("use dedicated hardware") and Node core (Welch's t-test needing matched sampling) assume this. *Verify*: a single `hyperfine 'cmd-a' 'cmd-b'` invocation (which interleaves runs) rather than two separate CI job runs compared after the fact.

## AI-agent angle

- **Reaching for `benchmark.js` / `Benchmark.Suite` first.** It's the tool with the most historical training-text volume (jsPerf.com era) and the least current relevance — archived since 2022. *Check*: `grep -r "require('benchmark')\|from 'benchmark'\|Benchmark.Suite" .` on any agent-authored diff; flag on any hit.
- **Inventing `Bun.bench()` or a `bun test --bench` flag.** Deno has `Deno.bench`; an agent pattern-matching "runtime with a fast test runner" onto Bun will hallucinate the same shape. Bun's own docs name mitata and hyperfine instead. *Check*: `grep -r "Bun.bench\|test --bench" .` — this string should never appear; if it does, the agent invented an API.
- **Writing a microbenchmark whose result is never consumed.** An agent producing `bench('sort', () => arr.slice().sort())` without reading the sorted array anywhere hands the JIT a free dead-code-elimination target, and the reported number will be near-zero and meaningless — with tinybench/Vitest-bench, *nothing in the tool's own output flags this as wrong* (only mitata's `!` marker would catch it). *Check*: for any `bench()` callback, verify the callback's return value or an internal accumulator is read by something the JIT can't prove is unused (assigned to a `let` outside the closure and referenced after the loop, or passed to `do_not_optimize`).
- **Treating a single benchmark run's number as a merge-blocking fact** ("this PR is 12% faster") without a second run or a stated confidence interval — trivially easy for an agent to state confidently from one `console.table()` output. *Check*: any perf claim in a PR/commit description should carry either an RME/`±%` figure from the tool itself, or explicit language that it's a single sample.
- **Setting a tight percentage regression gate (e.g. 5-10%) on a GitHub-hosted runner** because that reads as "more rigorous" — it is actually the fastest way to manufacture a flaky, ignored CI check, per Bencher's own documented >30% GH-runner variance. *Check*: any newly-added `alert-threshold`/`fail-threshold` config below ~25-50% on a job running on `ubuntu-latest` (not a self-hosted/bare-metal runner) should be challenged in review.
- **Citing `typescript-eslint`/`ts-morph` as able to analyze code compiled/run under TypeScript 7.0's Go toolchain** in a benchmarking or tooling context — carried over from wave-1's established finding, but worth restating here because a benchmarking-harness discussion is exactly where an agent might casually suggest "just type-check the benchmark file with the new fast compiler" and silently assume the stable programmatic API that doesn't exist until 7.1.

## Contested / evolving

- **Whether wall-clock CI benchmarking is salvageable at all on shared runners, or whether instrumentation (CodSpeed) / dedicated hardware (Bencher) is now required.** As of 2026-08-29 the industry has clearly split into these two camps rather than converging; CodSpeed's own blog post is explicit that plain wall-clock Vitest-bench on ordinary CI is unreliable. Trend: the "just run it in the normal CI job" free option (github-action-benchmark on GH-hosted runners) is increasingly positioned as coarse-alert-only (its 200% default threshold reflects this), while both paid/self-hosted alternatives assume you need either specialized infrastructure or specialized measurement technique to get a tight gate. Watch this over the next 12 months as CodSpeed/Bencher mature their JS/TS-specific integrations.
- **mitata's maintenance trajectory.** ~18 months without a commit as of 2026-08-29 is ambiguous — could mean "feature-complete and stable" (its API surface is small and hasn't needed churn) or could mean "quietly abandoned." Its README's continued relevance (Bun's own current docs still recommend it by name) argues for the former reading, but this should be re-checked in 6-12 months rather than assumed.
- **Vitest `bench`'s Experimental label persisting across major versions.** Normally an "Experimental" label graduates or gets redesigned within a major version or two; it has now survived Vitest 2 → 3 → 4 and into the 5.0.0-rc series (rc.3 published 2026-08-28) without graduating, per the docs read. Either Vitest's team considers the tinybench-wrapping shape settled-but-unpromoted, or a breaking redesign is still pending — this is worth re-reading once Vitest 5 ships stable.
- **Node SEA snapshot support vs the simpler "just bundle it" approach.** The SEA/V8-snapshot mechanism is real and documented as stable machinery, but it is also more operationally complex (a build-time script step, snapshot-serialization constraints) than simply bundling with esbuild. Whether it's worth the complexity for a CLI this fleet's size is genuinely undetermined without a measured baseline — this brief takes no position beyond "measure first" (see Normative Guidance #5).

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Should `ocx-catalog`/`grimoire-indexer` gate CLI cold-start with hyperfine in CI? | Direct, user-felt latency; cheap to measure; only real "worth it" case found | fleet inventory + §7, §10 | high | low — hyperfine's model is stable |
| Is Vitest `bench`'s continued "Experimental" label a blocker for adopting it anywhere? | Committing to an unstable API across a major bump (v4→v5) is a real maintenance cost | §3 | med | high — v5 stable release could resolve this either way within months |
| Does `github-action-benchmark`'s lack of native tinybench/Vitest-bench format support matter if this fleet never adopts it? | Determines whether a custom JSON adapter is even needed | §9 | low | low |
| Is Node SEA + V8 snapshot worth the build complexity for the two CLIs, vs just bundling? | Real startup-latency lever, but unmeasured against effort | §10 | med | med — SEA tooling is still evolving release-to-release |
| Should any repo add `--expose-gc`-aware benchmark helpers, or is that premature given zero current benchmarks? | GC-pressure control (mitata `.gc('inner')`) only matters once a benchmark exists | §2, §8 | low | low |
| What's the actual per-launch cost breakdown for `ocx-catalog` (module resolution vs commander init vs type-stripping-adjacent overhead)? | Needed before choosing bundling vs SEA vs "do nothing" | §10 | med | low |
| Is CodSpeed's free/OSS tier viable for these repos, and does its Vitest plugin actually work with the fleet's non-monorepo layouts? | Only real answer to "trustworthy tight CI gate without dedicated hardware" found in this pass | §9 | low | med — CodSpeed product surface is actively changing |
| Should any repo's `@lhci/cli`/puppeteer-core devDeps (already in `ocx-catalog`) be pointed at a Lighthouse-CI perf budget instead of a JS microbenchmark? | Fleet already has the dependency; Lighthouse budgets are a different, possibly better-fitted regression-gate shape for a VitePress site | fleet inventory (ocx-catalog package.json) | med | low |
| Does `mitata`'s hardware-counter extension (`@mitata/counters`) work at all inside GitHub-hosted CI (perf_event_paranoid restrictions)? | Determines whether IPC/cache-miss data is usable in CI vs local-only | §2 | low | low |
| What is Deno.bench's `group`/`baseline` comparison model, and should tinybench/Vitest adopt something similar via a thin wrapper, given none of this fleet runs Deno? | Purely a design-reference question, not directly actionable | §5 | low | low |
| Is `--experimental-strip-types`' whitespace-substitution approach the actual bottleneck in `ocx-catalog`/`grimoire-indexer` cold start, or is it module resolution / commander init? | Needed to know what "reduces startup cost" actually means for this fleet specifically | §10 | med | low |
| Should the fleet standardize on hyperfine's `--export-json` schema as the one CI-artifact shape for any future perf work, to avoid tool sprawl? | Prevents each repo picking a different ad-hoc benchmark shape later | §7, §9 | low | low |
| Does Bun's `bun build --compile --bytecode` 2x-startup number apply to any current or future Bun-targeted tooling in this fleet (only `setup-ocx` uses Bun today, and it's a GitHub Action, not a CLI binary)? | Currently not applicable, but worth flagging if `setup-ocx`'s shape changes | §10, fleet inventory | low | med |
| Is a 200%-default `alert-threshold` in github-action-benchmark ever tight enough to be useful, or does adopting it without tuning just produce a check nobody trusts? | Directly determines whether the free option is worth the CI-config effort at all | §9 | med | low |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [github.com/tinylibs/tinybench](https://github.com/tinylibs/tinybench) | primary — README | v6.1.4, pushed 2026-08-29 | the library Vitest wraps; current statistical-output surface |
| [github.com/tinylibs/tinybench/blob/main/FAQ.md](https://github.com/tinylibs/tinybench/blob/main/FAQ.md) | primary — maintainer FAQ | read 2026-08-29 | best single methodology doc found: timer resolution, deopt, warmup, cross-tool comparison caveats |
| npm registry (`npm view tinybench/mitata/benchmark/vitest`) | primary — package registry metadata | queried 2026-08-29 | authoritative version + publish-date source, not a scraped page |
| [github.com/evanwashere/mitata](https://github.com/evanwashere/mitata) | primary — README (fetched via GitHub contents API) | npm 1.0.34 (2025-02-04); repo pushed 2025-02-17 | best DCE/GC/loop-invariant-motion tutorial of any tool surveyed |
| [github.com/bestiejs/benchmark.js](https://github.com/bestiejs/benchmark.js) (via `gh api repos/bestiejs/benchmark.js`) | primary — repo metadata | archived 2022-12-22 | confirms dead/legacy status definitively (archived flag + no commits) |
| [vitest.dev/api/](https://vitest.dev/api/) | primary — official docs | vitest 4.1.11 (2026-08-18) | `bench` option defaults and result-field names, straight from the maintainers |
| [vitest.dev/guide/features.html](https://vitest.dev/guide/features.html) | primary — official docs | read 2026-08-29 | confirms `bench` is still labeled Experimental at v4/entering v5 |
| [bun.com/docs/project/benchmarking](https://bun.com/docs/project/benchmarking) | primary — official docs | read 2026-08-29 | Bun's own recommendation of mitata + hyperfine, no native `bench()` |
| [bun.com/docs/test/writing-tests](https://bun.com/docs/test/writing-tests) | primary — official docs | read 2026-08-29 | confirms absence of a `bench()`/`--bench` API in `bun test` |
| [bun.com/docs/bundler/executables](https://bun.com/docs/bundler/executables) | primary — official docs | read 2026-08-29 | `bun build --compile --bytecode`, the "tsc starts 2x faster" figure |
| [docs.deno.com/runtime/reference/cli/bench/](https://docs.deno.com/runtime/reference/cli/bench/) | primary — official docs | Deno 2.9.6 (2026-08-27) | `Deno.bench` group/baseline model and `--json` schema |
| [github.com/sharkdp/hyperfine](https://github.com/sharkdp/hyperfine) | primary — README (via GitHub contents API) | v1.20.0 (2025-11-18) | warmup/shell-exclusion/export flags, default run-count/duration |
| [github.com/benchmark-action/github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark) | primary — README | v1.22.1 (2026-05-06) | exact `alert-threshold`/`fail-on-alert` config keys and 200% default |
| [codspeed.io](https://codspeed.io/) | primary — vendor docs/marketing | read 2026-08-29 | instrumentation-based methodology claim (<1% variance) |
| [codspeed.io/blog/vitest-bench-performance-regressions](https://codspeed.io/blog/vitest-bench-performance-regressions) | primary — vendor blog | read 2026-08-29 | admission that plain Vitest-bench is "inconsistent between runs" on CI; setup commands |
| [bencher.dev/docs/explanation/continuous-benchmarking/](https://bencher.dev/docs/explanation/continuous-benchmarking/) | primary — vendor docs | read 2026-08-29 | the >30%-GH-runner-variance vs <2%-bare-metal figures |
| [github.com/nodejs/node — writing-and-running-benchmarks.md](https://github.com/nodejs/node/blob/main/doc/contributing/writing-and-running-benchmarks.md) | primary — Node core contributor guide | read 2026-08-29 | the single best methodology source: Welch's t-test via `--analyze`, CV<5% calibration, two-star significance threshold |
| [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html) | primary — official Node docs | read 2026-08-29 (Node stable line v26.8.1, 2026-08-26) | type-stripping default-on since v23.6.0, Stable v25.2.0, unsupported-syntax list |
| [nodejs.org/api/single-executable-applications.html](https://nodejs.org/api/single-executable-applications.html) | primary — official Node docs | read 2026-08-29 | V8 startup-snapshot mechanism for SEA CLIs |
| [v8.dev/blog/retiring-octane](https://v8.dev/blog/retiring-octane) | primary — V8 team blog | published April 2017, read 2026-08-29 | canonical historical case study: gamed benchmark caused real production regressions |
| GitHub API repo/release metadata (`gh api repos/.../releases/latest`, `repos/...`) for tinybench, mitata, benchmark.js, hyperfine, github-action-benchmark, Bun, Deno, Bencher, Vitest, Node | primary — GitHub REST API | queried 2026-08-29 | authoritative archived-status, push dates, and release dates independent of any page's prose |
| local fleet inspection (`find`/`grep` over `/home/mherwig/dev/*/package.json`, `.github/workflows/`) | primary — this fleet's own source | inspected 2026-08-29 | confirmed zero existing benchmark usage/CI anywhere in the fleet, grounding the "not worth it" default |
