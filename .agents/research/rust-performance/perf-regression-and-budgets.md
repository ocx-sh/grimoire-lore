---
title: Benchmark Harnesses, CI Regression Gates, and Performance Budgets
topic: Keeping Rust CLI performance from rotting — harnesses, CI gating, budgets, forensics
agent: inv-perf
model: sonnet
date_researched: "2026-08"
sources_count: 18
scope: |
  Covers Rust benchmark harness design (criterion, divan, iai-callgrind, nightly #[bench]),
  CI performance gating (noise problem, instruction-count vs wall-clock, bencher.dev/codspeed/
  github-action-benchmark), performance budgets (binary size, compile time), regression
  forensics (cargo-bisect-rustc, hyperfine), and package-manager-specific benchmarking
  (uv/cargo/ripgrep methodology). Does NOT cover general Rust perf optimization techniques
  (allocation, data layout) beyond what's needed to interpret benchmarks — see a separate
  perf-optimization researcher for that. Does not cover non-Rust language benchmarking.
---

## Table of contents

1. [Benchmark harness design](#1-benchmark-harness-design)
   1. [criterion](#11-criterion)
   2. [divan](#12-divan)
   3. [iai-callgrind](#13-iai-callgrind)
   4. [nightly `#[bench]` status](#14-nightly-bench-status)
2. [CI performance gating](#2-ci-performance-gating)
   1. [The noise problem, quantified](#21-the-noise-problem-quantified)
   2. [Instruction-count vs wall-clock strategies](#22-instruction-count-vs-wall-clock-strategies)
   3. [Platforms: bencher.dev, codspeed, github-action-benchmark](#23-platforms-bencherdev-codspeed-github-action-benchmark)
   4. [How real projects gate](#24-how-real-projects-gate)
3. [Performance budgets](#3-performance-budgets)
   1. [Binary size](#31-binary-size)
   2. [Compile time](#32-compile-time)
   3. [Release-build correctness](#33-release-build-correctness)
4. [Regression forensics](#4-regression-forensics)
   1. [cargo-bisect-rustc](#41-cargo-bisect-rustc)
   2. [git bisect + hyperfine](#42-git-bisect--hyperfine)
5. [What to measure for a package-manager-like CLI](#5-what-to-measure-for-a-package-manager-like-cli)
6. [Anti-patterns](#6-anti-patterns)
7. [Normative guidance candidates](#normative-guidance-candidates)
8. [AI-agent angle](#ai-agent-angle)
9. [Contested / evolving](#contested--evolving)
10. [Sources](#sources)

## Summary

- Never benchmark a debug build: dev profile is unoptimized and release is commonly **10-100x** faster, so any number from `cargo bench` without `--release` (or a bench profile inheriting release) is meaningless ([Rust Performance Book](https://nnethercote.github.io/perf-book/build-configuration.html)).
- Wrap benchmark inputs and outputs in `std::hint::black_box` — without it LLVM can constant-fold or dead-code-eliminate the very computation being timed ([std docs](https://doc.rust-lang.org/std/hint/fn.black_box.html)).
- `#[bench]`/`test::bench` is still nightly-only and unstable as of 2026, with no stabilization date — treat any agent-generated code that uses `#![feature(test)]` as wrong for a shipping crate; use criterion or divan instead ([rust-lang/rust#66287](https://github.com/rust-lang/rust/issues/66287), [test::bench docs](https://doc.rust-lang.org/stable/test/bench/)).
- criterion is the incumbent: statistical (many-iteration) wall-clock benchmarking with built-in regression detection against a saved baseline via `--save-baseline`/`--baseline`/`--load-baseline` ([criterion book](https://bheisler.github.io/criterion.rs/book/user_guide/command_line_options.html)).
- divan was built specifically to be simpler than criterion and to add generic-function benchmarking, allocation profiling (`AllocProfiler`), and CI-friendlier automatic sample-size scaling; adoption is real but smaller than criterion's ([divan repo](https://github.com/nvzqz/divan), [Nikolai Vazquez's writeup](https://nikolaivazquez.com/blog/divan/)).
- iai-callgrind measures **instruction counts via Valgrind/Callgrind instead of wall-clock time**, which is deterministic and noise-immune even on shared/virtualized CI runners — the standard answer to "criterion benchmarks are too noisy in CI" ([docs.rs/iai-callgrind](https://docs.rs/iai-callgrind)).
- Shared GitHub-hosted CI runners have measured **2.66% coefficient of variation** in wall-clock timing; a naive 2% regression gate on that hardware produces a **45% false-positive rate** — this is the single biggest reason naive wall-clock CI gates get disabled or ignored ([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).
- Bare-metal/isolated CI runners (CodSpeed's Macro Runners) bring variance down to **~0.56%**, making a 1.5% gate achieve sub-1% false positives — the fix for wall-clock CI gating is isolated hardware, not a looser threshold ([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).
- `github-action-benchmark`'s default `alert-threshold` is **200%** (i.e., 2x regression) before it even raises an alert — a deliberately loose default meant to avoid crying wolf on noisy runners, and teams must explicitly opt into `fail-on-alert: true` to hard-block a PR ([benchmark-action/github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark)).
- `cargo bloat --release --crates` and `cargo bloat --release -n 10` show which crates/functions dominate a release binary's `.text` section, but the tool's own docs warn the attribution is "guesswork" — treat it as directional, not exact ([cargo-bloat](https://github.com/RazrFalcon/cargo-bloat)).
- twiggy is cargo-bloat's WebAssembly-focused counterpart (`top`, `dominators`, `monos`, `diff` subcommands) and is the tool to reach for on `wasm32` targets, not cargo-bloat ([twiggy](https://github.com/rustwasm/twiggy)).
- `cargo build --timings` produces an HTML report (`target/cargo-timings/cargo-timing.html`) showing per-unit compile duration and concurrency, and timestamped reports let you diff compile-time regressions across commits ([Cargo Book](https://doc.rust-lang.org/cargo/reference/timings.html)).
- `cargo-bisect-rustc` binary-searches nightlies/CI artifacts to find the exact rustc commit that introduced a regression, given a minimized reproducer ([rust-lang/cargo-bisect-rustc](https://github.com/rust-lang/cargo-bisect-rustc)).
- hyperfine is the standard tool for whole-process wall-clock CLI benchmarking; `--warmup N` populates caches before timing (warm-cache benchmarking), while `--prepare '<cmd>'` runs a command before every single timed run (used to drop OS caches for cold-cache benchmarking) ([hyperfine](https://github.com/sharkdp/hyperfine)).
- uv's own published benchmarks report **8-10x faster than pip/pip-tools with a cold/no cache** and **80-115x faster with a warm cache**, explicitly separating the two regimes because uv's warm-cache advantage comes from a global module cache — this cold/warm split is the right mental model for any package-manager CLI benchmark ([astral.sh/blog/uv](https://astral.sh/blog/uv)).
- LTO (`lto = "thin"` or `"fat"`) commonly buys 10-20%+ runtime improvement at the cost of compile time; `codegen-units = 1` trades compile time for optimizer headroom — both are budget knobs, not free wins, and belong in `[profile.release]`, never assumed present by default ([Rust Performance Book](https://nnethercote.github.io/perf-book/build-configuration.html)).
- rustc's own CI performance tracking (`rustc-perf`, hosted at perf.rust-lang.org) runs a `collector` that gathers data for every bors merge commit and a bot that supports on-demand perf runs on PRs — the reference example of instruction-count-based compiler-perf CI at scale ([rustc-perf repo](https://github.com/rust-lang/rustc-perf)).

## Findings

### 1. Benchmark harness design

#### 1.1 criterion

criterion.rs is the de facto standard stable-Rust benchmarking library: a statistics-driven harness that runs many iterations, produces confidence intervals, and can compare a run against a saved baseline. `criterion::BenchmarkGroup` lets you group related benchmarks (e.g. different input sizes of the same algorithm) and configure `Throughput::Bytes`/`Throughput::Elements` so results are reported as GB/s or elements/s rather than raw time ([docs.rs/criterion BenchmarkGroup](https://docs.rs/criterion/latest/criterion/struct.BenchmarkGroup.html)).

Baseline workflow, straight from the criterion book ([command-line options](https://bheisler.github.io/criterion.rs/book/user_guide/command_line_options.html)):

```bash
# Correct: compare feature branch against master explicitly
git checkout master
cargo bench -- --save-baseline master
git checkout feature
cargo bench -- --save-baseline feature
cargo bench -- --load-baseline feature --baseline master
```

```bash
# Wrong for CI: relying on the implicit "previous run" baseline
cargo bench   # compares against whatever ran last on this machine —
              # meaningless on ephemeral CI runners that start clean each time
```

For CI smoke-testing (not measurement), criterion supports `cargo test --benches`, which runs each benchmark body once to confirm it doesn't panic, without doing statistical analysis — useful as a cheap "benches still compile and run" gate distinct from a performance gate ([criterion book](https://bheisler.github.io/criterion.rs/book/user_guide/command_line_options.html)).

#### 1.2 divan

divan (`nvzqz/divan`) was built because criterion, while capable, has an elaborate setup API; divan's goal is a `#[test]`-like `#[divan::bench]` attribute plus features criterion lacks: benchmarking **generic functions**, **measuring allocations** via `AllocProfiler`, and thread-contention measurement ([divan repo](https://github.com/nvzqz/divan), [design writeup](https://nikolaivazquez.com/blog/divan/)).

```rust
// divan: register a benchmark like a #[test], with parametrized args
#[divan::bench(args = [1, 2, 4, 8, 16, 32])]
fn fibonacci(n: u64) -> u64 {
    // ...
}

fn main() {
    divan::main();
}
```

divan scales sample count/iterations automatically until reaching roughly "100×τ precision" (100x the timer's smallest measurable duration) — on an Apple M1 the timer precision is ~41ns, so divan doubles iteration count until the measured duration comfortably exceeds timer noise. This auto-scaling is the mechanism the ecosystem cites for divan being more CI-friendly than criterion's default sampling ([Nikolai Vazquez's writeup](https://nikolaivazquez.com/blog/divan/)).

`divan --test` runs every benchmark exactly once to check it doesn't panic, mirroring criterion's `cargo test --benches` smoke-test pattern — useful as the same "compiles and runs, doesn't assert timing" CI gate ([divan repo](https://github.com/nvzqz/divan)).

Minimum supported Rust version for divan 0.1.21 is 1.80.0 — check this against your MSRV policy before adopting it ([divan repo](https://github.com/nvzqz/divan)).

#### 1.3 iai-callgrind

iai-callgrind (successor to the unmaintained `bheisler/iai`) uses Valgrind's Callgrind to count **CPU instructions retired** instead of measuring wall-clock time. Because instruction counts are (mostly) deterministic for a given binary and input, this is the standard fix for "our criterion CI benchmarks are too noisy to gate on" — it works reliably even inside virtualized/shared CI runners where wall-clock timing does not ([docs.rs/iai-callgrind](https://docs.rs/iai-callgrind)).

```rust
// iai-callgrind: setup cost is excluded from what's measured
#[library_benchmark]
#[bench::worst_case_4000(setup_worst_case_array(4000))]
fn bench_bubble_sort(array: Vec<i32>) -> Vec<i32> {
    std::hint::black_box(bubble_sort(array))
}
```

Trade-off: because it runs the benchmarked code once under Callgrind instrumentation rather than many times with statistical sampling, it's fast but measures a different thing than wall-clock latency — instruction count correlates with but is not identical to real-world speed (cache effects, branch prediction, syscalls, and I/O wait are all invisible to Callgrind's instruction count). It also requires Valgrind, which is Linux-only, so a Windows/macOS CLI project cannot make it the sole CI gate ([docs.rs/iai-callgrind](https://docs.rs/iai-callgrind)). iai-callgrind additionally supports running Cachegrind, DHAT, and other Valgrind tools for cache-miss and heap-allocation metrics, and can generate flamegraphs directly from the collected data ([lib.rs/iai-callgrind](https://lib.rs/crates/iai-callgrind)).

#### 1.4 nightly `#[bench]` status

`#[bench]`/`test::bench::Bencher` remains nightly-only and unstable as of 2026; the tracking issue for stabilization has been open since 2015 and the maintainers' position is that "the design is problematic" and nobody has driven it to stabilization ([rust-lang/rust#66287](https://github.com/rust-lang/rust/issues/66287), [test::bench](https://doc.rust-lang.org/stable/test/bench/)). This means any code an AI agent generates that does `#![feature(test)] extern crate test;` will not build on stable and should never appear in a shipping crate. criterion or divan are the stable-Rust answers.

### 2. CI performance gating

#### 2.1 The noise problem, quantified

Shared/virtualized CI runners (e.g. default GitHub-hosted runners) are noisy neighbors: CodSpeed measured a **2.66% coefficient of variation** in repeated identical wall-clock benchmark runs on GitHub-hosted runners. Feeding that into a naive 2% regression gate produces roughly a **45% false-positive rate** — nearly half of all "regression" alerts are noise, which trains a team to ignore the gate entirely. Running the same benchmarks on isolated bare-metal runners cut variance to **~0.56%** (about 5x lower), at which point a 1.5% gate achieves sub-1% false positives, and a 2% gate on bare metal drops false positives to ~0.04% (roughly 1 in 2,500 runs) ([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).

The actionable takeaway: **the fix for a noisy CI perf gate is isolating the hardware (or switching to an instruction-count metric), not loosening the threshold on noisy hardware** — a looser threshold on noisy hardware just means smaller real regressions slip through while large ones still occasionally false-positive.

#### 2.2 Instruction-count vs wall-clock strategies

Two fundamentally different strategies exist, and they answer different questions:

| Approach | Metric | Noise on shared CI | What it actually tells you |
|---|---|---|---|
| criterion/divan (wall-clock) | ns/iter, throughput | High — needs isolated/bare-metal runner to be trustworthy | Real-world latency users would feel, including cache/syscall/IO effects |
| iai-callgrind | instructions retired | Very low — deterministic per binary+input | CPU work done, blind to memory-latency/IO/branch-misprediction wall-clock cost |

Best practice observed across the ecosystem: run wall-clock benchmarks locally/manually for tuning, and use instruction-count benchmarks (iai-callgrind) or an isolated-hardware wall-clock service (CodSpeed, Bencher) as the actual CI gate ([bencher.dev prior art](https://bencher.dev/docs/reference/prior-art/), [CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).

#### 2.3 Platforms: bencher.dev, codspeed, github-action-benchmark

- **CodSpeed**: works with criterion, divan, and bencher as underlying harnesses; runs on dedicated "Macro Runner" bare-metal instances specifically to solve the noise problem above; produces differential flamegraphs pinpointing which lines regressed ([codspeed.io](https://codspeed.io/), [CodSpeed noise blog](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).
- **bencher.dev**: open-source (bencherdev/bencher), runs your existing benchmark suite on the same bare-metal hardware both locally and in CI, tracks history, and fails the PR on a detected regression using statistical (change-point) analysis rather than a flat percentage; used by rustls, Servo, Diesel, GitLab Git, Mozilla Neqo, and others ([bencher.dev prior art](https://bencher.dev/docs/reference/prior-art/), [bencherdev/bencher](https://github.com/bencherdev/bencher)).
- **github-action-benchmark** (`benchmark-action/github-action-benchmark`): free, self-hosted approach — stores time-series results either as a `gh-pages` branch (`dev/bench/data.js`) or an external JSON file, and supports many benchmark tool output formats (`cargo`, `go`, `benchmarkjs`, `pytest`, `googlecpp`, `catch2`, `julia`, `jmh`, `benchmarkdotnet`, plus generic `customBiggerIsBetter`/`customSmallerIsBetter`). Its default `alert-threshold` is **200%** (a 2x regression) before even raising an alert, and `fail-on-alert`/`comment-on-alert` are separate opt-in booleans — the action ships with a deliberately loose default specifically to avoid crying wolf, and teams are expected to tune it down only once they've measured their own noise floor ([benchmark-action/github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark)).

```yaml
# github-action-benchmark: correct — loose default alert, hard-fail explicit
- uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'cargo'
    output-file-path: output.txt
    alert-threshold: '150%'      # tune only after measuring your own runner noise
    fail-on-alert: true
    comment-on-alert: true
```

```yaml
# Wrong: fail-on-alert true with the loose 200% default is fine, but
# setting alert-threshold to something like '105%' on a shared GitHub runner
# without first measuring variance will produce constant false failures —
# see the 2.66% CoV finding above.
```

#### 2.4 How real projects gate

- **rustc**: `rustc-perf` (hosted at perf.rust-lang.org) has a `collector` component that gathers instruction-count/wall-time/max-RSS data for every bors merge commit, and a `site` component with a GitHub bot supporting on-demand perf runs directly on PRs — this is the reference large-scale example of compiler performance CI ([rustc-perf](https://github.com/rust-lang/rustc-perf)).
- **uv**: publishes benchmark methodology and results directly in blog posts and its repo, explicitly separating cold-cache and warm-cache numbers rather than a single blended number (see §5) ([astral.sh/blog/uv](https://astral.sh/blog/uv)).
- **tokio**: keeps a plain `benches/` directory (e.g. `rt_multi_threaded.rs`, `sync_mpsc.rs`, `spawn.rs`) of what are conventionally criterion-style benchmarks, run manually/locally by maintainers rather than gated automatically in CI on every PR ([tokio-rs/tokio benches](https://github.com/tokio-rs/tokio/tree/master/benches)) — a reminder that not every respected Rust project runs a hard CI perf gate; many rely on maintainer judgment plus ad hoc `cargo bench` before a release.

### 3. Performance budgets

#### 3.1 Binary size

`cargo-bloat` inspects ELF/Mach-O/PE binaries (not WASM) and reports which functions/crates dominate the `.text` section:

```bash
cargo bloat --release -n 10          # biggest functions
cargo bloat --release --crates       # biggest crates
cargo bloat --release --filter '^__' -n 10   # regex-filtered
```

The tool's own docs are explicit that the size attribution is approximate: "numbers above are a result of guesswork. They are not 100% correct and never will be" — treat cargo-bloat output as a ranking, not a budget-enforcement source of truth ([RazrFalcon/cargo-bloat](https://github.com/RazrFalcon/cargo-bloat)).

For WASM targets, `twiggy` is the equivalent tool (`top`, `dominators`, `monos`, `diff` subcommands), and cargo-bloat explicitly defers to it for WASM ([cargo-bloat](https://github.com/RazrFalcon/cargo-bloat), [rustwasm/twiggy](https://github.com/rustwasm/twiggy)).

For a hard CI size budget (a "size-limit"-style gate), the mechanical building block is comparing `stat -c%s target/release/<bin>` (or `ls -l`) against a checked-in threshold in a shell step — there is no dominant, actively-maintained Rust-native equivalent of JS's `size-limit` found in this research pass; teams compose one from `cargo-bloat` for diagnosis plus a raw file-size check for the gate itself.

#### 3.2 Compile time

`cargo build --timings` (stable) generates an HTML report at `target/cargo-timings/cargo-timing.html` showing per-compilation-unit duration, a concurrency graph (waiting/inactive/active time), and which crates block the critical path; timestamped copies of the report let you diff compile time across commits or dependency bumps ([Cargo Book — timings](https://doc.rust-lang.org/cargo/reference/timings.html)).

Concrete compile-time budget knobs, all from the Rust Performance Book ([build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)):
- Faster linkers (`lld`, `mold`, `wild` on Linux) — "no trade-offs" win, pure compile-time reduction.
- `debug = false` in the dev profile — 20-40% faster dev builds when full debug info isn't needed.
- `codegen-units = 1` — better optimization, worse (longer) compile time; opposite direction from the dev-loop-speed knobs above.
- `lto = "thin"` — 10-20%+ runtime improvement, at a compile-time cost; `lto = "fat"` is more aggressive but "not always" better and costs more compile time still.

```toml
# Correct: an explicit, intentional release profile — a budget decision, not a default
[profile.release]
lto = "thin"
codegen-units = 1
panic = "abort"   # only if the binary never needs catch_unwind / unwinding across FFI
```

#### 3.3 Release-build correctness

`panic = "abort"` removes unwind-table overhead and gives a slight runtime and binary-size win, but it changes observable behavior: `catch_unwind` no longer catches, and any FFI boundary relying on unwind-across-boundary breaks. This is a correctness decision, not merely a perf one — verify no code path expects to catch a panic before enabling it ([Rust Performance Book](https://nnethercote.github.io/perf-book/build-configuration.html)).

### 4. Regression forensics

#### 4.1 cargo-bisect-rustc

`cargo-bisect-rustc` binary-searches nightly builds or CI artifacts to find the exact rustc commit that introduced a regression (compile error, wrong codegen, or performance regression), given a minimized reproducer project. This is the standard tool when a performance (or correctness) regression is suspected to be caused by the *compiler* rather than your own code or a dependency bump ([rust-lang/cargo-bisect-rustc](https://github.com/rust-lang/cargo-bisect-rustc)); full usage docs live at rust-lang.github.io/cargo-bisect-rustc/.

#### 4.2 git bisect + hyperfine

For regressions caused by your own code or a dependency version, the standard workflow is `git bisect` driven by a script that runs `hyperfine` and exits nonzero when the measured time exceeds a threshold:

```bash
# git bisect run script (bisect.sh)
#!/usr/bin/env bash
set -euo pipefail
cargo build --release --quiet
result=$(hyperfine --warmup 3 --export-json /tmp/hf.json './target/release/grim resolve' 2>&1)
mean=$(jq '.results[0].mean' /tmp/hf.json)
awk -v m="$mean" 'BEGIN { exit !(m < 0.5) }'   # fail (bisect "bad") if mean >= 500ms
```

```bash
git bisect start
git bisect bad HEAD
git bisect good v0.9.0
git bisect run ./bisect.sh
```

hyperfine's core knobs for this: `-w/--warmup N` runs the command N times before timing (to populate OS/page caches — the warm-cache scenario), while `-p/--prepare '<cmd>'` runs a command before **every** timed run — on Linux this is the mechanism used to drop caches for a cold-cache benchmark (`hyperfine --prepare 'sync; echo 3 | sudo tee /proc/sys/vm/drop_caches' '...'`). By default hyperfine runs at least 10 iterations for at least 3 seconds and applies statistical outlier detection to flag runs likely contaminated by other system activity ([sharkdp/hyperfine](https://github.com/sharkdp/hyperfine)).

### 5. What to measure for a package-manager-like CLI

uv's own published methodology is the closest analog to OCX/Grimoire's shape (resolve + install over a registry, with a local cache) and is worth mirroring directly:

- **Cold cache vs warm cache are reported separately, never blended.** uv reports "8-10x faster than pip and pip-tools" on a cold/uncached run and "80-115x faster... with a warm cache" — a >10x spread between the two regimes, driven entirely by uv's global module cache ([astral.sh/blog/uv](https://astral.sh/blog/uv)). For grim/ocx, "cold cache" (nothing in `~/.cache`, first `grim install`) and "warm cache" (registry blobs already local) are different user-facing promises and should be two separate budget lines, e.g. "cold install of N artifacts under X s" and "warm re-resolve under Y ms."
- **Network phase vs local phase should be separated the same way.** uv's number split implicitly separates registry/network-bound work (resolution against an index) from local disk work (installation from cache) — for grim/ocx that maps to "OCI pull/manifest-fetch latency" vs "local unpack + link" and each deserves its own benchmark, since network variance (registry latency, ghcr.io rate limiting) dominates any local-only measurement.
- **A representative dependency tree, not a synthetic worst/best case.** uv benchmarked against the Trio project's real dependency tree rather than a synthetic minimal or maximal case — for grim/ocx this means benchmarking against a realistic bundle (a real skill+rule+agent set of, say, 20-50 artifacts) rather than a single-artifact toy case.
- **Parallelism scaling** is not directly covered in the sources fetched this pass, but the general pattern (also visible in tokio's benches directory covering `spawn`, `rt_multi_threaded` etc.) is to benchmark the same workload at 1, N/2, and N cores/concurrent-connections explicitly rather than assume linear scaling; for an OCI-pulling CLI, the concurrency knob to benchmark is simultaneous layer/blob downloads.
- **Memory high-water mark**: iai-callgrind can drive DHAT (a Valgrind heap profiler) for peak-allocation tracking as a byproduct of its Callgrind-based harness, giving a Linux CI-friendly way to catch a memory-budget regression the same way instruction-count catches a CPU regression ([lib.rs/iai-callgrind](https://lib.rs/crates/iai-callgrind)).

### 6. Anti-patterns

- **Benchmarking a debug build.** Dev-profile builds are unoptimized; release is 10-100x faster, so a debug-build "benchmark" measures the debug allocator and lack of inlining, not the shipped binary ([Rust Performance Book](https://nnethercote.github.io/perf-book/build-configuration.html)).
- **Omitting `black_box`.** Without it, LLVM can see that a computed value is never observably used and delete the whole computation, timing an empty loop ([std::hint::black_box docs](https://doc.rust-lang.org/std/hint/fn.black_box.html)).
- **A flat percentage gate on unmeasured hardware.** Setting `alert-threshold: '105%'` (a 5% gate) on a stock GitHub-hosted runner without first measuring that runner's coefficient of variation reproduces the 45%-false-positive scenario CodSpeed documented — measure your own noise floor before choosing a threshold ([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).
- **Benchmark-driven complexity**: adding caching/parallelism/unsafe-optimized paths to win a microbenchmark that doesn't reflect the real call pattern (e.g. optimizing single-artifact resolve when real usage always resolves 20+ artifacts at once) — the uv/tokio pattern of benchmarking a *representative* workload (§5) is the guard against this.
- **Premature parallelism**: spawning worker threads/tasks for a workload whose critical path is actually network-latency-bound (e.g. a single OCI registry round trip) adds synchronization overhead and non-determinism without buying wall-clock improvement; only parallelize phases shown by a cold/warm + network/local split (§5) to actually be CPU- or throughput-bound.

## Normative guidance candidates

1. **Every `cargo bench` invocation and every CI benchmark job must build in `--release` (or an explicit `[profile.bench]`/`[profile.release]`), never the dev profile.**
   Rationale: dev builds are 10-100x slower and measure the wrong thing entirely.
   Verify: grep the CI workflow YAML for `cargo bench` and confirm no `--profile dev` / absence of `--release` ambiguity; check `Cargo.toml` for a `[profile.bench]` that doesn't `inherits = "release"` incorrectly disabling optimizations (e.g. `opt-level = 0` left in bench profile).

2. **Every criterion/divan benchmark body must wrap its input and its return value in `std::hint::black_box`.**
   Rationale: otherwise the optimizer can delete the computation being measured.
   Verify: grep benchmark files (`benches/*.rs`) for the function under test's call site and confirm `black_box(` wraps both the argument(s) and the returned value.

3. **No new dependency-heavy code path may claim a performance win without a checked-in benchmark file (criterion or divan) that exercises it.**
   Rationale: unverified perf claims rot silently and cannot be regression-tested.
   Verify: PR diff touching `src/**` that also claims "faster"/"perf" in its message must touch `benches/**`; reviewer heuristic, not automatable by grep alone.

4. **A CI performance gate's alert threshold must be derived from a measured noise floor on the actual CI hardware, not picked arbitrarily.**
   Rationale: on stock shared GitHub runners, ~2.66% CoV makes a naive 2% gate ~45% false-positive; the number must come from re-running the same benchmark N times on that runner and computing variance first.
   Verify: the threshold value in the CI config (`alert-threshold`, a criterion `--noise-threshold`, or a bencher.dev boundary config) should have an adjacent comment or doc citing the measured baseline variance it was set against.

5. **Any CI job that fails a build purely on a wall-clock performance number must run on dedicated/pinned hardware (self-hosted runner, CodSpeed/Bencher macro runner), not the default shared GitHub Actions runner pool.**
   Rationale: shared runners cannot deliver low-enough variance for a hard blocking gate; a hard-fail on shared-runner wall-clock time is close to a coin flip at typical CI-worthy thresholds (1-5%).
   Verify: read the workflow YAML's `runs-on:` for the perf-gate job — `ubuntu-latest` (or any GitHub-hosted label) combined with `fail-on-alert: true` or an equivalent hard-fail flag is the smell; either move to instruction-count (iai-callgrind, Linux-only) or a dedicated runner.

6. **`#![feature(test)]` / `extern crate test` / `#[bench]` must never appear outside a maintainer-only, explicitly nightly-gated internal tool.**
   Rationale: unstable, no stabilization timeline, will not build on the stable toolchain the project ships with.
   Verify: `grep -rn "feature(test)" --include=*.rs` and `grep -rn "extern crate test"` across the repo should return nothing outside of a clearly nightly-only dev-tool crate.

7. **`[profile.release]` must set `lto`, `codegen-units`, and (if applicable) `panic` explicitly, not rely on Cargo defaults, and the choice must be justified against a measured compile-time cost.**
   Rationale: `lto = "thin"`/`"fat"` and `codegen-units = 1` are real runtime-vs-compile-time trades that silently regress CI/build time if applied without measurement; `panic = "abort"` changes unwind semantics.
   Verify: read `Cargo.toml`'s `[profile.release]`; absence of `lto`/`codegen-units` keys means Cargo defaults (`lto = false`, `codegen-units = 16`) are in force by omission — confirm that's intentional, not accidental.

8. **A binary-size or compile-time regression check belongs in CI as a raw threshold comparison (file size in bytes, `cargo build --timings` total duration), not solely as a human glancing at `cargo-bloat` output.**
   Rationale: `cargo-bloat`'s own docs call its attribution "guesswork" — it's a diagnostic tool for humans, not a machine-checkable gate on its own.
   Verify: CI workflow contains an explicit `stat -c%s`/`ls -l` (or equivalent) comparison against a checked-in byte threshold for the release binary; `cargo bloat` invocations, if present, should be advisory (non-blocking) steps only.

9. **A performance regression suspected to come from the toolchain (not application code) must be isolated with `cargo-bisect-rustc` before filing an issue or reverting application code.**
   Rationale: bisecting the wrong axis (app commits) wastes time when the actual cause is a compiler/std change; `cargo-bisect-rustc` narrows to the exact nightly/PR.
   Verify: reading heuristic — an investigation that jumps straight to `git bisect` on app history without first confirming the regression reproduces on a pinned older toolchain (`rustup run <old-nightly> cargo bench`) skipped a step.

10. **Any hyperfine-based CLI benchmark script must state explicitly whether it measures cold or warm cache, via `--prepare` (cold) or `--warmup` (warm), never neither.**
    Rationale: an unqualified "hyperfine ./grim install" number is not reproducible or comparable — cache state alone can be a >10x factor (see uv's cold/warm split).
    Verify: grep benchmark scripts for `hyperfine` invocations lacking both `--warmup` and `--prepare`; either flag's absence with no comment explaining why is a defect.

## AI-agent angle

- **Hallucinated/outdated `#[bench]` usage.** An LLM trained on older Rust material will readily emit `#![feature(test)] extern crate test; #[bench] fn foo(b: &mut test::Bencher)`, which requires nightly and will not compile on the stable toolchain this project ships with. Mechanical check: `grep -rn "feature(test)\|extern crate test\|test::Bencher"` — any hit outside an explicitly nightly-only internal crate is wrong.
- **Missing `black_box`, or wrapping only the input, not the output.** Agents frequently benchmark `black_box(input)` correctly but return the raw computed value un-wrapped, letting the optimizer still eliminate the pure computation once it sees the result is unused outside the black-boxed call. Mechanical check: in every `fn bench_*` body, both the call site's argument *and* the outer expression around the function call must be inside `black_box(...)`.
- **Copy-pasted criterion `Criterion::default()` boilerplate that silently uses the implicit "previous run" baseline in CI**, producing a comparison against garbage on a fresh ephemeral runner (no prior run exists) rather than the intended feature-vs-main comparison. Mechanical check: any CI workflow step invoking `cargo bench` without an explicit `--save-baseline`/`--baseline` pair (or without checking out a cached prior baseline artifact) is comparing against nothing meaningful.
- **Claiming a performance improvement in a commit/PR description without a benchmark diff attached.** Agents are prone to asserting "this is faster because it avoids an allocation" as a conclusion rather than a hypothesis. Mechanical check: PR touches perf-sensitive code + claims a perf win in prose but the diff has no changes under `benches/` and no before/after numbers pasted — reject or ask for one.
- **Setting an aggressive CI perf-gate threshold (e.g. 1-2%) by analogy to blog posts, without running the noise-floor measurement locally first.** Agents will happily copy a "codspeed uses 1.5%" number into a project running on default GitHub-hosted runners, where that threshold guarantees frequent false failures (§2.1). Mechanical check: does the threshold value in config have a citation/comment linking to an actual variance measurement on *this* project's runner, or is it a bare number with no justification.
- **Using `cargo-bloat`/`twiggy` output as a hard CI gate condition directly** (e.g. parsing its stdout for a byte count and failing the build), when the tool itself disclaims exact accuracy. Mechanical check: CI scripts that `cargo bloat --message-format json | jq ...` and then hard-fail should instead compare the actual binary's `stat` size, using `cargo-bloat` only for the advisory "why" breakdown.

## Contested / evolving

- **criterion vs divan** is not settled; criterion remains the default recommendation in most current material (including the Rust Performance Book's phrasing "Criterion and Divan are more sophisticated alternatives" — listed together, not divan-over-criterion), while divan is gaining adoption specifically among people who find criterion's API heavy or who need generic-function/allocation benchmarking. Expect both to coexist for years; the deciding factor is usually "do I need allocation profiling or generic benchmarks" (divan) vs "do I need the most mature ecosystem/tooling integration" (criterion) ([Rust Performance Book](https://nnethercote.github.io/perf-book/benchmarking.html), [divan repo](https://github.com/nvzqz/divan)).
- **iai-callgrind's rename/evolution**: the bencher.dev prior-art page notes iai-callgrind is "now Gungraun," suggesting an in-flight rename/successor project as of this research pass — verify current canonical crate name before pinning a dependency ([bencher.dev prior art](https://bencher.dev/docs/reference/prior-art/)).
- **Whether a hard CI performance gate is worth the operational cost at all** is genuinely contested: rustc runs an elaborate always-on perf CI (rustc-perf) because compiler performance is core to its value proposition, while tokio appears to keep benchmarks as a manual/maintainer-run tool rather than an automatic PR gate (based on the absence of a discoverable perf-CI workflow in this pass) — the practice is trending toward "gate it if perf is a stated product promise (package managers, compilers), keep it advisory otherwise," but this is inferred from available evidence, not a stated policy from either project.
- **`#[bench]` stabilization**: dormant since ~2015 per the tracking issue; no signal in 2026 sources that this is changing. Treat "wait for stable `#[bench]`" as dead advice — criterion/divan are the permanent stable-Rust answer, not a stopgap.
- **Binary-size CI gating tooling**: no actively-maintained, widely-adopted Rust-native equivalent to JS's `size-limit` surfaced in this research; teams are composing their own from `cargo-bloat` (diagnosis) + a raw `stat` check (gate). This gap may close — worth re-checking in future research passes.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.rs/criterion — BenchmarkGroup](https://docs.rs/criterion/latest/criterion/struct.BenchmarkGroup.html) | Primary API docs | current (docs.rs latest) | Authoritative on groups/throughput API |
| [criterion.rs book — command-line options](https://bheisler.github.io/criterion.rs/book/user_guide/command_line_options.html) | Primary user guide | maintained mdBook | Authoritative on `--save-baseline`/`--baseline`/`--load-baseline` and CI smoke-test flag |
| [github.com/nvzqz/divan](https://github.com/nvzqz/divan) | Primary repo README | active repo | Canonical description of divan's API, MSRV, `--test` flag |
| [nikolaivazquez.com/blog/divan](https://nikolaivazquez.com/blog/divan/) | Primary design writeup by divan's author | launch blog post | Explains *why* divan exists vs criterion, sample-scaling mechanism, allocation profiler |
| [docs.rs/iai-callgrind](https://docs.rs/iai-callgrind) | Primary API docs | v0.16.x era | Authoritative on instruction-count model, `#[library_benchmark]`, setup-cost exclusion |
| [lib.rs/crates/iai-callgrind](https://lib.rs/crates/iai-callgrind) | Package aggregator page | current | Confirms Cachegrind/DHAT/flamegraph support beyond Callgrind |
| [rust-lang/rust#66287 — Stabilize #[bench]?](https://github.com/rust-lang/rust/issues/66287) | Primary GitHub tracking issue | ongoing since 2019 (references 2015-era design problems) | Authoritative on why `#[bench]` is still unstable |
| [doc.rust-lang.org/stable/test/bench](https://doc.rust-lang.org/stable/test/bench/) | Primary std/test docs | current stable docs | Confirms nightly-only status directly from rust-lang.org |
| [codspeed.io/blog/benchmarks-in-ci-without-noise](https://codspeed.io/blog/benchmarks-in-ci-without-noise) | Primary vendor blog with original measurements | 2020s CodSpeed blog | Source of the 2.66% CoV / 45% false-positive / 0.56% bare-metal variance numbers |
| [bencher.dev/docs/reference/prior-art](https://bencher.dev/docs/reference/prior-art/) | Primary vendor docs, competitive landscape page | maintained docs | Cross-references criterion/iai/iai-callgrind/divan/github-action-benchmark and notable adopters (rustls, Servo, Diesel) |
| [github.com/bencherdev/bencher](https://github.com/bencherdev/bencher) | Primary repo | active repo | Confirms OSS nature and bare-metal local+CI comparison model |
| [github.com/benchmark-action/github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark) | Primary GitHub Action README | active repo | Authoritative on `alert-threshold` default (200%), `fail-on-alert`, supported tool formats |
| [github.com/rust-lang/rustc-perf](https://github.com/rust-lang/rustc-perf) | Primary repo (rustc's own perf-CI infra) | active repo | Reference example of large-scale instruction-count-based CI perf tracking |
| [github.com/RazrFalcon/cargo-bloat](https://github.com/RazrFalcon/cargo-bloat) | Primary repo README | active repo | Authoritative commands and the tool's own accuracy disclaimer |
| [github.com/rustwasm/twiggy](https://github.com/rustwasm/twiggy) | Primary repo README | active repo | WASM-specific size-profiling counterpart to cargo-bloat |
| [github.com/rust-lang/cargo-bisect-rustc](https://github.com/rust-lang/cargo-bisect-rustc) | Primary repo README | active repo | Authoritative on rustc regression bisection tool |
| [github.com/sharkdp/hyperfine](https://github.com/sharkdp/hyperfine) | Primary repo README | active repo | Authoritative on `--warmup`/`--prepare`, default run count, outlier detection |
| [nnethercote.github.io/perf-book/benchmarking.html](https://nnethercote.github.io/perf-book/benchmarking.html) | Primary community reference book (Nicholas Nethercote, rustc contributor) | maintained, current | Recommends criterion/divan/hyperfine/bencher/gungraun, wall-time variance caveat |
| [nnethercote.github.io/perf-book/build-configuration.html](https://nnethercote.github.io/perf-book/build-configuration.html) | Same book, build-config chapter | maintained, current | Authoritative on debug-vs-release delta, LTO/codegen-units/panic=abort trade-offs |
| [doc.rust-lang.org/std/hint/fn.black_box.html](https://doc.rust-lang.org/std/hint/fn.black_box.html) | Primary std docs | current stable docs | Authoritative semantics and non-guarantees of `black_box` |
| [doc.rust-lang.org/cargo/reference/timings.html](https://doc.rust-lang.org/cargo/reference/timings.html) | Primary Cargo Book | current stable docs | Authoritative on `cargo build --timings` output and usage |
| [astral.sh/blog/uv](https://astral.sh/blog/uv) | Primary vendor blog (uv's own launch benchmarks) | uv launch-era blog post | Direct example of cold/warm-cache benchmark methodology for a package-manager CLI |
| [github.com/tokio-rs/tokio/tree/master/benches](https://github.com/tokio-rs/tokio/tree/master/benches) | Primary repo directory listing | current main branch | Real-world example of what a mature async-runtime crate actually benchmarks |
