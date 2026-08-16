---
title: CLI Process Startup Latency
topic: rust-performance
agent: inv-startup
model: sonnet
date_researched: 2026-08
sources_count: 18
scope: |
  Covers what a Rust CLI binary pays between exec() and first useful work on Linux
  (primary) with notes for macOS/Windows: linking, allocator init, tokio runtime
  construction, clap parsing, binary-size effects, and the measurement toolchain
  (hyperfine, strace, perf stat). Does not cover steady-state/throughput performance,
  async task scheduling under load, or GC-language comparisons.
---

## Table of contents

1. [Findings](#findings)
   1. [What happens between exec() and main()](#1-what-happens-between-exec-and-main)
   2. [Static vs dynamic linking, musl vs glibc](#2-static-vs-dynamic-linking-musl-vs-glibc)
   3. [Allocator init: mimalloc / jemalloc](#3-allocator-init-mimalloc--jemalloc)
   4. [tokio runtime construction cost](#4-tokio-runtime-construction-cost)
   5. [clap startup cost](#5-clap-startup-cost)
   6. [Binary size, LTO, codegen-units, strip, panic=abort](#6-binary-size-lto-codegen-units-strip-panicabort)
   7. [Measurement method: hyperfine, strace, perf stat](#7-measurement-method-hyperfine-strace-perf-stat)
   8. [Published comparisons: ripgrep, uv](#8-published-comparisons-ripgrep-uv)
   9. [PGO and BOLT for short-lived processes](#9-pgo-and-bolt-for-short-lived-processes)
   10. [Startup budget and the human-perception evidence](#10-startup-budget-and-the-human-perception-evidence)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

1. No source fetched during this research publishes a hard number for "tokio runtime construction takes N µs" or "musl vs glibc costs N ms at startup" for a representative Rust CLI — treat any such number you see elsewhere as unverified until you reproduce it with the recipe in §7.
2. `hyperfine --shell=none` (`-N`) removes shell-fork overhead from the measurement; without it hyperfine still corrects for shell startup via calibration, but `-N` is required once your binary is faster than ~5ms because the correction itself becomes noisy. [hyperfine](https://github.com/sharkdp/hyperfine)
3. `perf stat -D <ms>` exists specifically to exclude a process's startup phase from measurement — the man page calls startup "often very different" from steady state, which is the opposite of what you want when startup IS what you're measuring; do not pass `-D` when profiling cold start. [perf-stat(1)](https://man7.org/linux/man-pages/man1/perf-stat.1.html)
4. `strace -c` counts and times every syscall; `strace -b execve` detaches right after the traced program's own exec, letting you isolate the dynamic linker's syscalls from the program's own logic if you trace the exec of `ld.so` itself. [strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html)
5. musl-based targets (`x86_64-unknown-linux-musl`, `arm-unknown-linux-musleabi*`, etc.) are statically linked by default in rustc; glibc (`-gnu`) targets are dynamically linked by default and require `-C target-feature=+crt-static` to go static. [Rust reference: linkage](https://doc.rust-lang.org/reference/linkage.html)
6. Tokio's multi-thread runtime spawns one OS worker thread per CPU core by default (`num_cpus`); `current_thread` spawns none. No fetched source publishes the actual construction latency of either — measure it yourself (recipe in §4). [tokio runtime docs](https://docs.rs/tokio/latest/tokio/runtime/index.html)
7. Tokio's resource drivers (IO, timer) are NOT enabled by default when you build a runtime with `Builder` by hand — you must call `enable_io()`/`enable_time()` or `enable_all()`; omitting drivers you don't need is free startup and binary-size savings a CLI that only shells out or does blocking I/O can take. [tokio runtime docs](https://docs.rs/tokio/latest/tokio/runtime/index.html)
8. clap's own documentation (derive-macro reference and README) makes zero claims about compile time, binary size, or runtime parse cost, derive vs. builder — this is a real gap in clap's own docs, not something you missed; get numbers from your own `cargo build --timings` and binary-size diff, not from clap's docs.
9. Release-profile knobs with measured/stated effects: `codegen-units = 1`, `lto = "fat"|"thin"`, `panic = "abort"`, `strip = "symbols"` — each improves runtime speed and/or binary size at the cost of compile time; `opt-level = "z"` trades runtime speed for size, `"s"` is the size/speed compromise. [Rust perf book: build configuration](https://nnethercote.github.io/perf-book/build-configuration.html)
10. `min-sized-rust` gets a default release build from ~220KB down to ~8KB using nightly-only techniques (`build-std`, `panic=immediate-abort`, `#![no_main]`, `#![no_std]`) — none of this is stable-Rust reachable, and the source does not connect these size numbers to measured page-in/startup time. [min-sized-rust](https://github.com/johnthagen/min-sized-rust)
11. LD_BIND_NOW forces all dynamic symbol resolution at process start instead of lazily on first call — useful for measuring the true dynamic-linking tax (run once with it set, once without, diff the wall time) but NOT something to ship, since it removes the lazy-binding startup optimization glibc gives you by default. [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html)
12. BOLT is explicitly a "post-link optimizer... to speed up large applications," documented and evaluated around a "deploy the service, warm it up, THEN collect perf data" workflow — this is a long-running-service optimization technique whose entire mechanism (profile-guided code layout for hot paths under sustained load) does not apply to a process that runs once and exits. No fetched BOLT source recommends it for CLIs. [LLVM BOLT README](https://raw.githubusercontent.com/llvm/llvm-project/main/bolt/README.md)
13. PGO's own official workflow doc frames instrumentation as "run the instrumented binary... with typical data" multiple times to build a representative profile — for a CLI whose "typical run" varies per invocation (different args, different repo state) this is a much weaker signal than for a server handling homogeneous requests; the doc itself gives no CLI-specific guidance either way. [rustc PGO](https://doc.rust-lang.org/rustc/profile-guided-optimization.html)
14. uv's own public benchmark methodology explicitly uses hyperfine, and explicitly separates warm-cache from cold-cache scenarios — but even uv's own BENCHMARKS.md does not isolate process-startup time from dependency-resolution time; its "80-115x faster" headline number is a resolution-time comparison, not a startup-time one. Do not cite uv's numbers as evidence about interpreter/process startup. [uv BENCHMARKS.md](https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md)
15. ripgrep's benchmark methodology (from the author's own introductory writeup) is a custom Python harness with 3 warm-up runs before 10 measured runs, explicitly to get the corpus into page cache before timing — the same warm-up discipline hyperfine's `--warmup` automates. The author explicitly flags the benchmarks as "curated" and "biased," a rare and citable instance of a performance author disclosing his own methodology's limits. [ripgrep introduction](https://burntsushi.net/ripgrep/)
16. The 0.1s / 1.0s / 10s response-time thresholds (Miller 1968; Card, Moran & Newell 1991, popularized by Nielsen) are the actual cited human-perception evidence behind "feels instant" vs "feels like a delay" vs "user gives up attention" — use 100ms as the budget for a CLI subcommand that returns to a shell prompt with no long-running work implied, not a folklore round number. [NN/g: response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
17. Tokio's `Builder` docs list `worker_threads()`, `global_queue_interval()`, `event_interval()`, `disable_lifo_slot()` as tunables — none of these are documented with startup-cost numbers; they tune steady-state scheduling behavior, not construction latency.
18. mimalloc's crate docs describe only a two-line drop-in global-allocator pattern and quantify just one cost (secure mode: ~10% throughput penalty per mimalloc's own benchmarks) — no startup/init-cost numbers are published in the crate docs themselves; measure with the recipe in §3 if allocator init time matters to your budget.
19. Rust's own linkage reference is silent on runtime performance differences between staticlib/rlib/dylib/cdylib — it documents ABI and toolchain mechanics only; startup-time claims about static vs dynamic linking must come from your own measurement, not from the reference.
20. No fetched source gives a definitive, current-era number for "dynamic linker overhead on a typical Linux CLI in milliseconds" — the closest primary material is the `ld.so(8)` man page's `LD_DEBUG=statistics` and `LD_BIND_NOW` mechanisms, which let you measure it yourself rather than citing a number.

## Findings

### 1. What happens between exec() and main()

For a dynamically linked ELF binary on Linux, the kernel's `execve()` hands control to the interpreter named in `PT_INTERP` (`/lib64/ld-linux-x86-64.so.2` for glibc), which: maps the binary and its shared libraries, processes relocations, resolves symbols (lazily by default — see below), runs `.init_array` constructors (this is where Rust's lazy `static` machinery and any C++-style global constructors from linked C libraries run), then jumps to the real `main`. A statically linked binary (musl static, or glibc with `+crt-static`) skips essentially all of this: no interpreter, no shared-library mapping, no runtime symbol resolution — the kernel maps one file and jumps in.

No source fetched in this research quantifies "how many milliseconds is this" for a representative Rust CLI. The `ld.so(8)` man page documents the mechanism (`LD_DEBUG=statistics`, `LD_BIND_NOW`) but not a number: [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html). Treat this as the paradigm case for §7's measurement recipe — it is exactly the kind of claim that must be measured per-binary, per-platform, not looked up.

### 2. Static vs dynamic linking, musl vs glibc

Rust's linkage is controlled by the `crt-static` target feature. musl targets (`x86_64-unknown-linux-musl`, the `arm*-musleabi*` family) default to static; glibc (`-gnu`) targets default to dynamic and need `-C target-feature=+crt-static` (or `RUSTFLAGS='-C target-feature=+crt-static'`) to go fully static. [Rust reference: linkage](https://doc.rust-lang.org/reference/linkage.html)

```bash
# static glibc build (still glibc's allocator/NSS semantics)
RUSTFLAGS='-C target-feature=+crt-static' cargo build --release --target x86_64-unknown-linux-gnu

# musl build (static by default, no flag needed)
cargo build --release --target x86_64-unknown-linux-musl
```

No fetched source publishes a musl-vs-glibc startup-time delta. The mechanistic case for static-linking-is-faster-at-startup is strong (no `ld.so` interpreter pass at all) but the magnitude depends on how many shared libraries the dynamic build actually links against — a CLI with two or three dylib dependencies pays a very different tax than one linking against a dozen. Measure with §7 before asserting a number in a rule or a PR review comment.

### 3. Allocator init: mimalloc / jemalloc

Both crates document a two-line drop-in pattern:

```rust
use mimalloc::MiMalloc;
#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;
```

[mimalloc docs.rs](https://docs.rs/mimalloc/latest/mimalloc/) — the crate's own docs make no startup-cost claim; the one quantified number present is unrelated (secure-mode throughput penalty, ~10%, is a steady-state cost not a startup cost). `tikv-jemallocator`'s docs are equally silent on init cost. [tikv-jemallocator docs.rs](https://docs.rs/tikv-jemallocator/latest/tikv_jemallocator/) Both allocators do real work at first-use (arena setup, thread-local bookkeeping) rather than at binary load, so the cost — if it matters for a CLI that allocates very little — shows up in wall time between `main()` entry and first allocation, not in `exec()`-to-`main()` time. Measure it by diffing `hyperfine` runs of the same binary built with the system allocator vs. mimalloc/jemalloc; do not assume registration itself is free or expensive without that diff.

### 4. tokio runtime construction cost

`current_thread` (feature `rt`) runs everything on the calling thread and spawns no OS threads. `multi_thread` (feature `rt-multi-thread`, the default selected by `#[tokio::main]`) spawns one worker thread per available CPU core by default, configurable via `Builder::worker_threads()`. Resource drivers (IO, timer) are opt-in when building by hand — `enable_io()`/`enable_time()`/`enable_all()` — and are NOT enabled implicitly. [tokio runtime docs](https://docs.rs/tokio/latest/tokio/runtime/index.html)

```rust
// cheapest possible runtime for a CLI that does a handful of async HTTP calls
// and no timers: current_thread, only the IO driver.
let rt = tokio::runtime::Builder::new_current_thread()
    .enable_io()
    .build()?;
```

vs. the default that `#[tokio::main]` gives you:

```rust
#[tokio::main] // == multi_thread, worker_threads = num_cpus, enable_all()
async fn main() { ... }
```

On an 8-32 core CI runner or developer workstation, the default spawns 8-32 OS threads before your CLI does anything — thread creation is a syscall (`clone`) per worker plus TLS setup per thread. No fetched source publishes the microsecond cost of this; it is directly measurable and is the single highest-value thing to check in this whole document, because it's the one place a one-line default (`#[tokio::main]` vs `#[tokio::main(flavor = "current_thread")]`) changes syscall count in a way `strace -c` will show immediately.

**Reproducible recipe** (no published number exists — run this):
```bash
# build two variants, identical except runtime flavor
strace -c -f ./target/release/cli_multi_thread --help 2>&1 | tail -20
strace -c -f ./target/release/cli_current_thread --help 2>&1 | tail -20
# compare clone() call counts and total syscall time
hyperfine --shell=none --warmup 10 \
  './target/release/cli_multi_thread --help' \
  './target/release/cli_current_thread --help'
```

For a CLI subcommand that does no concurrent I/O (the overwhelming majority of subcommands in an argument-parsing/dispatch tool), `current_thread` is very likely to remove real, measurable startup cost. Reserve `multi_thread` for the specific subcommands that actually parallelize work (e.g. concurrent multi-registry fetches), not the binary's `#[tokio::main]` as a whole.

### 5. clap startup cost

clap's own documentation — the derive-macro reference and the top-level README — makes no compile-time, binary-size, or runtime-parse-cost claims, and no derive-vs-builder performance comparison. [clap derive docs](https://docs.rs/clap/latest/clap/_derive/index.html), [clap README](https://github.com/clap-rs/clap) This is worth stating plainly because it is tempting to assume a crate this prominent documents its own overhead — it doesn't, in the pages fetched. What you can establish yourself, mechanically:

```bash
# derive-macro compile-time cost, isolated
cargo build --release --timings   # look at the clap_derive proc-macro row
# binary-size cost of a large subcommand tree vs a hand-rolled dispatcher
cargo bloat --release --crates | grep -i clap
```

Two structural facts worth carrying into a rule even without a published number: (1) `Command::new(...).subcommand(...)` chains for a large tree are built eagerly at the top of `main()` regardless of which subcommand is actually invoked — a big subcommand tree pays its full construction cost even for `--help` or a single leaf command, unless you defer construction of subcommand-specific `Arg`s behind the dispatch; (2) `clap_complete`'s shell-completion generation walks the entire `Command` tree to emit a completion script — this is a legitimate one-off cost (run at install time or on-demand via a `completions` subcommand) and should never be on the hot path of ordinary invocation.

### 6. Binary size, LTO, codegen-units, strip, panic=abort

Rust's own performance book gives exact, stable-Rust-reachable knobs:

```toml
[profile.release]
codegen-units = 1     # slower compile, faster runtime + smaller binary
lto = "fat"            # or "thin" for a lighter compile-time hit; most aggressive dead-code + cross-crate inlining
panic = "abort"         # smaller binary, slightly faster; loses catch_unwind and backtraces on panic
strip = "symbols"       # smaller binary; harder to debug/profile after the fact
opt-level = "z"         # trade runtime speed for minimum size ("s" is a smaller trade)
```

[Rust perf book: build configuration](https://nnethercote.github.io/perf-book/build-configuration.html)

`min-sized-rust` pushes this further using nightly-only flags (`-Zbuild-std`, `-Zlocation-detail=none`, `-Cpanic=immediate-abort`, `#![no_main]`, `#![no_std]`), taking a baseline ~220KB macOS binary down to ~8KB in the most extreme (`no_std`) configuration. [min-sized-rust](https://github.com/johnthagen/min-sized-rust) None of those nightly techniques are appropriate for a production CLI shipping prebuilt binaries on stable Rust, and — importantly — the source itself does not connect any of these size numbers to a measured startup-time improvement. Binary size affects startup only through page-in cost (pages the kernel must fault in before code executes), which matters far more on a cold page cache (first run after boot, or after `echo 3 > /proc/sys/vm/drop_caches`) than warm (every subsequent run, which is the overwhelmingly common case for a CLI a developer runs repeatedly in one session). Treat "smaller binary is measurably faster to start" as a claim to verify per-binary with cold-cache `hyperfine --prepare 'sync; echo 3 | sudo tee /proc/sys/vm/drop_caches'` runs, not as a given.

### 7. Measurement method: hyperfine, strace, perf stat

**hyperfine.** `--shell=none` (`-N`) skips the intermediate shell entirely — required once a command runs faster than ~5ms, because hyperfine's shell-startup calibration-and-subtract correction becomes noisy relative to the measured time itself at that scale. Without `-N`, hyperfine still runs the shell with an empty command repeatedly to measure and subtract shell overhead, so bare `hyperfine 'mycli --help'` is not wrong, just noisier for sub-5ms binaries. `--warmup N` runs N throwaway executions first to get the binary and any config/data files into page cache before measured runs begin — use this to measure warm-cache (typical repeated-use) latency; omit it, or use `--prepare` to actively drop caches, to measure cold-cache latency. [hyperfine](https://github.com/sharkdp/hyperfine)

```bash
# warm-cache startup latency, no shell overhead
hyperfine --shell=none --warmup 10 --min-runs 30 './target/release/mycli --help'

# compare two builds directly
hyperfine --shell=none --warmup 10 \
  './target/release/mycli-glibc-dynamic --version' \
  './target/release/mycli-musl-static --version'
```

**strace.** `-c` produces a per-syscall count/time/error summary — the fastest way to see "how many syscalls does this binary make before printing anything," which is a good proxy for both dynamic-linker overhead (`openat`/`mmap` calls against `.so` files) and config-file-read overhead (`openat` against a dotfile). `-T` adds per-call wall time to the normal trace. `-b execve` detaches tracing after the traced program's own `execve` returns, letting you scope a trace to just the exec/load phase if you wrap it around the dynamic linker itself. [strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html)

```bash
strace -c ./target/release/mycli --version 2>&1 | tail -25
# look specifically for: openat against lib*.so, mmap count, and any
# unexpected openat against config paths (~/.config/mycli/*, etc.)
```

**perf stat.** Standard invocation is `perf stat -- <command>`. Relevant counters for a short-lived process: `task-clock`, `context-switches`, `page-faults`, `cycles`, `instructions`. Critically, the `-D <msec>` delay flag is documented to "filter out the startup phase of the program, which is often very different" — this is the correct tool for steady-state profiling and the WRONG flag to reach for when startup is the thing under test; leave it unset (or use `-D -1`, "start with events disabled," only if you specifically want to trigger measurement from inside the program via `PERF_EVENT_IOC_ENABLE`, not to skip startup). [perf-stat(1)](https://man7.org/linux/man-pages/man1/perf-stat.1.html)

```bash
perf stat -e task-clock,context-switches,page-faults,cycles,instructions \
  ./target/release/mycli --version
```

**Separating loader time from `main()` time.** Two options, both cross-checkable: (1) run once with `LD_BIND_NOW=1` and once without — the delta is close to the eager-vs-lazy symbol-resolution cost, though not the full loader cost (mapping and relocation still happen either way); (2) instrument the binary itself: emit a timestamp at the very first line of `fn main()` (before clap parses anything) and diff against the wall-clock start hyperfine reports — the gap between "process start" and "first line of your `main`" is the loader's contribution, everything after is yours. Neither technique is published as a canonical recipe in any source fetched; both follow directly from documented `ld.so(8)` mechanisms. [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html)

### 8. Published comparisons: ripgrep, uv

**ripgrep.** The author's own introductory writeup describes a custom Python harness: 3 warm-up runs to seed the OS page cache with the search corpus, then 10 measured runs, reporting mean ± stddev. Example numbers given: `rg` 0.334s vs `ag` 1.589s (Linux literal search); `rg` 0.355s vs `git grep` 13.045s (Unicode word search, ignore-case). The author is explicit about the limits of his own methodology: "Coming up with a good and fair benchmark is hard, and I have assuredly made some mistakes... These benchmarks are curated, and... therefore also biased." He also notes results vary meaningfully between EC2 VM and bare-metal hardware. [ripgrep introduction](https://burntsushi.net/ripgrep/) None of these numbers isolate process-startup latency from search time — they are end-to-end, dominated by the search itself on large corpora, not comparable to a "how fast does the binary start" question.

**uv.** The project's own `BENCHMARKS.md` states hyperfine is the measurement tool, wrapped in a custom script; it separates warm-cache from cold-cache scenarios and discloses that results vary across OS/filesystem because uv uses reflinking (macOS) vs hardlinking (Linux) for its warm-install path. The document itself flags that when a benchmark's bottleneck is a single intensive source-distribution build, results converge across tools regardless of the tool's own overhead. [uv BENCHMARKS.md](https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md) The astral.sh marketing page's "8-10x / 80-115x faster than pip" and "80x faster than venv" headline figures are real hyperfine-measured numbers per the linked methodology doc, but they measure dependency resolution and environment creation — not interpreter/process startup — and should not be cited as evidence about Rust CLI startup latency specifically (uv's win here is architectural: no per-package subprocess spawn, not "Rust starts fast"). [astral.sh/blog/uv](https://astral.sh/blog/uv)

Neither ripgrep's nor uv's public numbers are startup-latency measurements. If you need a citable startup-latency comparison, none was found in this research — produce one with §7's recipe rather than borrowing an adjacent number.

### 9. PGO and BOLT for short-lived processes

**PGO.** rustc's official workflow: build with `-Cprofile-generate=<dir>`, run the instrumented binary against representative workloads (the doc's own example: run against `mydata1.csv`, `mydata2.csv`, `mydata3.csv`), merge with `llvm-profdata merge`, rebuild with `-Cprofile-use=<merged.profdata>`. [rustc PGO](https://doc.rust-lang.org/rustc/profile-guided-optimization.html) The doc does not discuss short-lived-vs-long-running workload suitability at all — it's silent on the question this subarea asks. The structural implication worth drawing (not stated in the source, reasoned from the mechanism): PGO's benefit comes from better branch prediction and inlining decisions on the paths your training runs actually exercised; a CLI whose invocations vary widely in shape (different subcommands, different flag combinations, different data sizes) produces a much noisier, less representative profile than a server handling a homogeneous request type — so PGO's payoff for a CLI is bounded by how representative you can make the training runs of your actual usage distribution, and is likely to help the shared startup/dispatch path (argument parsing, common setup) more reliably than it helps any one subcommand's specific logic.

**BOLT.** The upstream README describes BOLT as "a post-link optimizer developed to speed up large applications" via profile-guided code layout, and documents its recommended workflow around services specifically: "Once you get the service deployed and warmed-up, it is time to collect perf data." [LLVM BOLT README](https://raw.githubusercontent.com/llvm/llvm-project/main/bolt/README.md) The mechanism BOLT optimizes — instruction cache and branch-predictor-friendly code layout, built from a sampled profile of sustained execution — has no time to pay off in a process that runs once and exits before its working set has "warmed up" a predictor or cache in any way BOLT's layout could exploit. No fetched source recommends BOLT for CLIs; the source's own workflow (deploy, warm up, then profile) is structurally a long-running-service technique. Treat "BOLT helps short-lived CLIs" as an unsupported claim until a source explicitly measuring a short-lived binary is found — none was, here.

### 10. Startup budget and the human-perception evidence

The cited human-perception research behind response-time budgets, per Nielsen Norman Group's synthesis of Miller (1968) and Card, Moran & Newell (1991): 0.1s is "about the limit for having the user feel that the system is reacting instantaneously"; 1.0s is "about the limit for the user's flow of thought to stay uninterrupted, even though the user will notice the delay"; 10s is "about the limit for keeping the user's attention focused on the dialogue." [NN/g: response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) These thresholds are noted in the source as unchanged for "thirty years" (as of the 1993 origin) and "46 years" (as of a 2014 revision) — they are not a moving target and not folklore; they are the standing HCI reference for exactly this question.

Applied to a CLI: a subcommand invoked interactively (a developer types it and waits at the shell) should target under 100ms to read as "instant" — no spinner, no perceived delay. A subcommand that does unavoidable network I/O (registry fetch, auth) crosses into the 1s band, where the user notices but stays engaged, and is exactly the threshold at which a CLI should show a progress indicator rather than sit silent. Nothing in an interactive CLI's common path (parse args, dispatch, read local files, print) should approach the 10s band; if it does, the interactivity contract (no feedback needed) has already broken and the tool needs either a spinner or must move the work to a background/async flow.

## Normative guidance candidates

1. **Do not select `#[tokio::main]`'s default `multi_thread` flavor for a CLI subcommand unless that subcommand does genuinely concurrent I/O.** Rationale: multi_thread spawns one OS thread per core before any of your code runs; most CLI subcommands (parse → single fetch/write → print) never use more than one. VERIFICATION: `grep -rn '#\[tokio::main\]' src/ | grep -v 'flavor = "current_thread"'` — flag any hit whose function body contains no `tokio::spawn`, `join!`, or `try_join!`; those are candidates for `#[tokio::main(flavor = "current_thread")]` or a hand-built `Builder::new_current_thread()`.
2. **Enable only the tokio resource drivers you use (`enable_io()`, `enable_time()`) instead of `enable_all()` when hand-building a runtime.** Rationale: undocumented drivers are still zero-cost until called, but `enable_all()` on a hand-built `Builder` is a readability signal that no one checked which drivers are actually needed. VERIFICATION: `rg 'Builder::new_(current|multi)_thread' -A5` — each hit should show `enable_io()`/`enable_time()` matching an actual `tokio::time::` or `tokio::net::`/`tokio::fs::` usage in the same binary, not a blanket `enable_all()`.
3. **Build a large `clap` subcommand tree once, not per invocation, and never construct subcommand-specific `Arg`s the current invocation cannot reach.** Rationale: `Command` trees are built eagerly at the top of `main()` regardless of which leaf runs; a tree that grows should not silently grow the fixed cost every invocation pays. VERIFICATION: `cargo bloat --release --crates | grep -i clap` tracked over time in CI — flag a jump disproportionate to the number of new subcommands added; also `cargo build --release --timings`, watch the `clap_derive`/`clap_builder` proc-macro row for compile-time growth.
4. **Measure startup latency with `hyperfine --shell=none --warmup N`, never bare `time` and never a shell loop.** Rationale: bare `time` includes one-shot noise (cold cache, scheduler jitter) with no statistical correction; a hand-rolled `for i in {1..100}; do time ...; done` shell loop reintroduces shell-fork overhead into every sample. VERIFICATION: any perf-claiming PR description or benchmark script must show a `hyperfine` invocation with `--shell=none` (or an explicit justification for its absence) and a `--warmup` value ≥5.
5. **Do not cite BOLT or claim "PGO improves CLI startup" without a same-repo before/after `hyperfine` measurement.** Rationale: BOLT's own documented workflow is built around warmed-up services (§9); no fetched source supports either technique for a process that runs once and exits. VERIFICATION: grep any `Cargo.toml`/build script for `-Cprofile-use`/BOLT invocation; a rule or PR asserting a startup benefit from either must link a hyperfine comparison in the same commit, not a general claim.
6. **Prefer `strip = "symbols"`, `panic = "abort"`, `codegen-units = 1`, and `lto = "thin"` or `"fat"` in `[profile.release]` for a shipped CLI binary, in that order of first move.** Rationale: each is a stable, one-line, Rust-perf-book-sourced win for binary size and/or runtime speed at a known, bounded compile-time cost (§6); none require nightly. VERIFICATION: `grep -A6 '^\[profile.release\]' Cargo.toml` — flag a release profile missing `strip` or `panic = "abort"` without a code comment explaining why (e.g. the binary legitimately catches panics).
7. **Never adopt a musl-static or `+crt-static` glibc build for startup-latency reasons without a same-hardware `hyperfine` comparison against the dynamic build actually shipped today.** Rationale: the mechanistic case (no `ld.so` pass) is real but its magnitude scales with how many shared libraries the dynamic build actually links against, which no fetched source quantifies in general (§2). VERIFICATION: a PR switching linking mode must include a `hyperfine --shell=none` before/after pair on the CI runner's actual architecture, not a claim citing a different project's numbers.
8. **When a subcommand's own logic will exceed ~1s (network fetch, large-repo scan), emit a progress indicator; when it will stay under ~100ms, emit none.** Rationale: this maps directly to the Miller/Card/Nielsen perception bands (§10) — under 100ms reads as instant and a spinner would itself be the perceptible lag; the 1s+ band is exactly where silence starts reading as "is this hung." VERIFICATION: reading heuristic — grep for any `reqwest`/registry-fetch call or filesystem walk over an unbounded directory tree with no accompanying `indicatif`/progress-bar or `eprintln!` status line in the same function.
9. **Do not read a global-allocator crate's own docs (mimalloc, jemalloc) for startup-cost numbers — they don't publish any.** Rationale: verified by fetch in this research (§3); both crates document the drop-in pattern and, at most, unrelated steady-state throughput numbers. VERIFICATION: if a design doc or code comment cites mimalloc/jemalloc "faster startup" without a linked `hyperfine` A/B run comparing the same binary with/without the allocator swap, treat the claim as unverified.
10. **Config-file and dotfile reads at startup should be `openat`-visible and countable — audit with `strace -c`, not by reading the code.** Rationale: an `openat` against a config path that doesn't exist yet (falling through several candidate paths) is a common, invisible-in-code-review startup tax; strace makes it a one-line grep instead of a code-tracing exercise (§7). VERIFICATION: `strace -c ./target/release/cli <common-subcommand> 2>&1 | grep -c openat` tracked as a CI budget; a jump signals a new candidate-path probe or an unintended repeated read.

## AI-agent angle

An LLM asked to "make this CLI start faster" reaches first for the plausible-sounding, unverifiable move: swap in mimalloc, add PGO, suggest BOLT, or assert "musl is faster to start" — all four are exactly the claims this research found **no published number** for (§§2, 3, 9). The smallest mechanical check that catches this class of hallucinated-confidence change: any PR or suggestion claiming a startup-latency improvement must be accompanied by a `hyperfine --shell=none --warmup N <old> <new>` output pasted into the PR description or commit message — if it isn't there, the claim is unverified regardless of how standard the technique sounds. A second, narrower check specific to this codebase's shape (heavy tokio use, 2,570 fs call sites): an LLM defaulting every `async fn main` to `#[tokio::main]` without checking whether the function actually spawns concurrent work is the single highest-frequency version of rule #1 above — `grep -c 'tokio::spawn\|join!' <file>` returning 0 in a file using `#[tokio::main]` is a mechanical, no-judgment-required flag.

## Contested / evolving

- **musl vs glibc for shipped CLI binaries** is a live, unresolved trade-off in this research: the startup-time case for musl-static is mechanistically strong (no dynamic linker pass) but unquantified by any fetched source, while musl's `malloc` and NSS (DNS/user lookup) behavior are known-different-enough from glibc's to bite CLIs that shell out to `git` or resolve hostnames — this research did not fetch a source resolving that trade-off either way for the OCX/Grimoire family's specific dependency shape (OCI registry HTTP clients do resolve hostnames). Direction: measure both linking modes on this project's actual dependency graph before choosing; do not port a blanket "always static-link Rust CLIs" rule from elsewhere.
- **PGO/BOLT applicability to CLIs** is not "contested" so much as simply unaddressed by the sources that exist — rustc's PGO doc and LLVM's BOLT README are both written for the general/server case and neither takes a position on short-lived processes one way or the other (§9). The direction implied by the mechanism (branch-prediction and code-layout optimization needs sustained execution to pay off) argues against both for a typical CLI invocation, but this is this researcher's inference from documented mechanism, not a cited conclusion — flag it as such if it's promoted into a hard rule later.
- **clap's lack of self-documented performance characteristics** is worth flagging as a possible future-resolves item: clap is widely enough used that a definitive derive-vs-builder startup/compile-time comparison likely exists somewhere in its issue tracker or a third-party benchmark repo, but no fetched source (README, derive docs, comparison doc — the comparison doc 404'd) contained one. Re-check `clap-rs/clap`'s `assets/` directory or discussions directly (not via search) if this becomes load-bearing for a hard rule.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/sharkdp/hyperfine](https://github.com/sharkdp/hyperfine) | Official README/docs, the de facto standard CLI benchmarking tool | 2026, current | Defines `--shell=none`, `--warmup`, `--prepare`, and the shell-calibration methodology every startup-latency measurement in this doc depends on |
| [nnethercote.github.io/perf-book/build-configuration.html](https://nnethercote.github.io/perf-book/build-configuration.html) | Rust Performance Book, official-adjacent community reference maintained by a Rust compiler contributor | Living doc, 2026 | Authoritative, stable-Rust `[profile.release]` knobs (codegen-units, lto, panic, strip, opt-level) with stated effects |
| [github.com/johnthagen/min-sized-rust](https://github.com/johnthagen/min-sized-rust) | Widely-cited community guide to Rust binary-size minimization | Living doc, 2026 | Exact Cargo.toml/RUSTFLAGS for every size technique from stable strip down to nightly `no_std`, with measured size numbers per step |
| [doc.rust-lang.org/rustc/profile-guided-optimization.html](https://doc.rust-lang.org/rustc/profile-guided-optimization.html) | Official rustc book chapter | Current stable docs | The canonical PGO workflow (instrument → run → merge → rebuild) in rustc's own words |
| [nngroup.com/articles/response-times-3-important-limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | Nielsen Norman Group HCI reference article | Originated 1993, revised periodically (source notes "46 years" as of 2014) | The actual cited human-perception research (Miller 1968; Card, Moran & Newell 1991) behind any "100ms feels instant" budget — not folklore |
| [docs.rs/tokio/latest/tokio/runtime](https://docs.rs/tokio/latest/tokio/runtime/index.html) | Official tokio API docs, runtime module | Current tokio (2026) | Authoritative on `current_thread` vs `multi_thread`, default worker-thread count, and that resource drivers are opt-in on a hand-built `Builder` |
| [github.com/BurntSushi/ripgrep/blob/master/FAQ.md](https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md) | Official ripgrep FAQ | Living doc | Author's own framing of performance claims and pointer to the primary benchmarking writeup |
| [burntsushi.net/ripgrep](https://burntsushi.net/ripgrep/) | ripgrep author's original introductory blog post with benchmarks | 2016, still the canonical methodology reference | Rare primary source that discloses its own warm-up methodology (3 warm-up + 10 measured runs) and explicitly flags its own numbers as "curated" and "biased" |
| [github.com/astral-sh/uv/blob/main/BENCHMARKS.md](https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md) | Official uv benchmarking methodology doc | Living doc, 2026 | Discloses hyperfine as the tool, warm/cold split, and — importantly — that even uv's own numbers don't isolate startup from resolution time |
| [astral.sh/blog/uv](https://astral.sh/blog/uv) | Official Astral announcement/marketing page for uv | 2024 origin, still linked in 2026 | The headline "80-115x faster" numbers everyone cites — read alongside BENCHMARKS.md to see what they actually measure (not startup latency) |
| [docs.rs/mimalloc](https://docs.rs/mimalloc/latest/mimalloc/) | Official mimalloc Rust binding docs | Current | Establishes what the crate does and does NOT document about startup/init cost |
| [docs.rs/tikv-jemallocator](https://docs.rs/tikv-jemallocator/latest/tikv_jemallocator/) | Official jemalloc Rust binding docs | Current | Same finding as mimalloc: no init-cost numbers published in the crate's own docs |
| [doc.rust-lang.org/reference/linkage.html](https://doc.rust-lang.org/reference/linkage.html) | Official Rust Reference, linkage chapter | Current stable | Authoritative on `crt-static`, musl-default-static vs glibc-default-dynamic, and crate-type mechanics |
| [man7.org: perf-stat(1)](https://man7.org/linux/man-pages/man1/perf-stat.1.html) | Official Linux man page | Current | `-D` delay flag semantics — critical to get right (or deliberately omit) when profiling startup specifically |
| [man7.org: strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html) | Official Linux man page | Current | `-c`, `-T`, `-b execve` — the exact flags for syscall-level startup measurement |
| [man7.org: ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html) | Official Linux man page | Current | `LD_BIND_NOW`, `LD_DEBUG=statistics` — the mechanism-level primary source for dynamic-linker overhead, in lieu of any published number |
| [docs.rs/clap: derive reference](https://docs.rs/clap/latest/clap/_derive/index.html) | Official clap derive-macro docs | Current clap (v4-era, 2026) | Establishes, by its absence, that clap does not self-document compile-time/runtime/derive-vs-builder cost |
| [github.com/clap-rs/clap](https://github.com/clap-rs/clap) | Official clap README | Current | Same finding as above for the top-level project README |
| [raw.githubusercontent.com/llvm/llvm-project: bolt/README.md](https://raw.githubusercontent.com/llvm/llvm-project/main/bolt/README.md) | Official LLVM BOLT documentation | Current (BOLT now lives in-tree in llvm-project) | Confirms BOLT's documented workflow and target use-case is warmed-up long-running services, not short-lived processes — the primary evidence behind §9's conclusion |

