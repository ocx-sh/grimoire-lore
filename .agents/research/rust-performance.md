---
title: Performance Engineering for the OCX/Grimoire Rust CLIs
topic: rust-performance
model: opus
consolidates:
  - rust-performance/performance-practices.md
  - rust-performance/perf-regression-and-budgets.md
  - rust-performance/cli-startup-latency.md
date: 2026-08
revised: 2026-08
---

# Performance Engineering for the OCX/Grimoire Rust CLIs

## Verdict

This project treats performance as **two user-visible numbers and nothing else**: how long
`grim`/`ocx` takes end to end (cold cache and warm cache, reported separately, per uv's
methodology — [perf-regression §5](rust-performance/perf-regression-and-budgets.md)), and how
many bytes the user downloads to get the binary. Everything below those two numbers is
unmeasured folklore until someone pastes a tool's output.

Concrete positions, several of which overrule a sub-researcher:

1. **hyperfine is the primary harness, criterion the exception.** Both sub-artifacts survey
   criterion/divan/iai-callgrind at length; neither found a hot kernel in this codebase worth a
   microbenchmark. Neither repo has a `benches/` directory or a criterion dependency today.
   Adopt hyperfine on real subcommands first; a `criterion` bench earns its place only when a
   flamegraph names a specific function.
2. **No blocking wall-clock perf gate in CI, ever, on GitHub-hosted runners.** 2.66% CoV on
   shared runners makes a 2% gate ~45% false-positive
   ([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)). The only hard CI perf
   gate this project ships is a raw binary-size byte threshold.
3. **iai-callgrind/Gungraun is rejected**, not deferred: Linux-only (Valgrind), mid-rename, and
   a solution to a noise problem we avoid by not gating on wall-clock at all. Two sub-artifacts
   both flag the rename churn; that is a second reason not to pin it.
4. **`panic = "abort"` is banned in the CLI binaries.** performance-practices §8 lists it as a
   standard release lever; `ocx/Cargo.toml:27-29` already documented why it is wrong here — 13
   `resume_unwind(join_err.into_panic())` sites lose spawned-task panic propagation *silently*,
   and it compiles clean. The codebase's measured comment beats the generic guidance.
5. **Binary size outranks `opt-level = 3`.** `ocx/Cargo.toml:23-26` measured 33.4 MB → 18.6 MB
   from `opt-level = "s"` at a 9% cost on the compress+hash path. For a tool distributed as a
   prebuilt binary, download bytes are latency the user feels on every install; 9% on one
   internal path is not.
6. **Do not swap the default hasher.** performance-practices §4 recommends `FxHashMap` by
   default for internal keys. Rejected: essentially every map key in these tools (digests,
   refs, package names, index entries) originates in a wire document from a registry, which is
   exactly the case both that sub-artifact and the [foldhash docs](https://docs.rs/foldhash/latest/foldhash/)
   carve out. Keep SipHash; revisit only per-map, with a profile.
7. **No `mmap`, no BLAKE3.** grimoire already forbids `unsafe` (`grimoire/Cargo.toml:123`), and
   ocx's store directories are multi-writer — `memmap2`'s UB boundary applies. BLAKE3's speed
   win is real but every durable digest here must match an OCI manifest, so it would buy a
   second hash format for zero interop benefit (`ocx` already rejects `blake3:` digests as
   unaddressable at `ocx_cli/src/api/data/package_cascade_check.rs:299`).
8. **Bounded concurrency is already the house style and is now mandatory**, including the
   subtlety ocx learned the hard way: bound the *spawn*, not the task body
   (`ocx_lib/src/package_manager/tasks/common.rs:928`).
9. **The startup-latency round is done, and it settled the budget, not a number.** The
   follow-up ([cli-startup-latency](rust-performance/cli-startup-latency.md)) found **no
   published figure** for tokio runtime construction, musl-vs-glibc load time, allocator init,
   or clap parse cost — all four are self-measure-only. What it did settle is the *budget's
   provenance*: 100 ms "feels instant" / 1 s "notices but stays engaged" is Miller (1968) and
   Card, Moran & Newell (1991) via [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/),
   not a folklore round number. That is now PERF-29, and it is the only startup threshold this
   project asserts.
10. **`current_thread` is not available to `ocx`, and this is a correctness fact, not a perf
    trade.** The follow-up's headline recommendation is "don't use multi-thread for a CLI
    unless it does concurrent I/O". `ocx` cannot: `ocx.run`'s host fn uses
    `Handle::block_on` inside `block_in_place`, which panics on a `current_thread` runtime —
    documented at `ocx_lib/src/script.rs:186-192` and guarded by a `debug_assert!` on
    `runtime_flavor()` at `ocx_cli/src/command/script_runner.rs:44-54`. `grimoire` has **zero**
    `block_in_place` sites and is therefore not blocked, only unmeasured. PERF-26 writes both
    halves down.
11. **BOLT is rejected; PGO is deferred behind a measured number.** BOLT's own README scopes it
    to "large applications" profiled after a service is "deployed and warmed-up"
    ([LLVM BOLT](https://raw.githubusercontent.com/llvm/llvm-project/main/bolt/README.md)) —
    the mechanism needs sustained execution a process that runs once and exits never provides.
    No fetched source recommends either technique for a CLI. This closes the third
    research-round item outright rather than deferring it again: more research will not produce
    the sources, only a hyperfine A/B on this codebase will (PERF-28).

## The ruleset

Rules an agent gets wrong without being told. Generic advice ("don't clone in a loop", "use
iterators") is deliberately absent.

### Measurement discipline

**PERF-01 — Never state a performance number you did not produce; paste the tool output.**
*Rationale:* agents fabricate plausible percentages in PR text and code comments
([performance-practices, AI-agent angle](rust-performance/performance-practices.md);
[perf-regression, AI-agent angle](rust-performance/perf-regression-and-budgets.md)).
*Verify:* any commit/PR/comment containing `%`, `x faster`, `speedup`, or `optimiz` must also
contain a hyperfine table, criterion output block, or a linked artifact. Reviewer grep:
`git log -p | grep -nE '[0-9]+(\.[0-9]+)?x faster|[0-9]+% faster'`.
*Severity:* MUST

**PERF-02 — Benchmark release builds only.**
*Rationale:* dev builds are 10–100x slower and measure the debug allocator
([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)).
*Verify:* `grep -rn 'hyperfine' --include='*.sh' --include='*.yml' .` — every target path must
be `target/release/` or `target/dist/`, never `target/debug/`.
*Severity:* MUST

**PERF-03 — Every hyperfine invocation declares cold or warm cache: `--prepare` (cold) or `--warmup N` (warm), never neither.**
*Rationale:* cache state alone is a >10x factor for a package manager — uv reports 8-10x cold
vs 80-115x warm and never blends them ([astral.sh/blog/uv](https://astral.sh/blog/uv)).
*Verify:* `grep -rn 'hyperfine' . | grep -v -e '--warmup' -e '--prepare'` returns nothing.
*Severity:* MUST

**PERF-04 — Report cold-cache and warm-cache results as two separate budget lines, never one blended number.**
*Rationale:* they are two different user promises ("first `grim install`" vs "re-resolve"), and
a blended number hides a regression in either.
*Verify:* reading heuristic on any perf report; a single unqualified "grim install takes Xs" is
a defect.
*Severity:* MUST

**PERF-05 — In a criterion/divan benchmark, wrap both the input and the returned value in `std::hint::black_box`.**
*Rationale:* wrapping only the input still lets LLVM delete a pure computation whose result is
unused ([std::hint::black_box](https://doc.rust-lang.org/std/hint/fn.black_box.html)).
*Verify:* for each `fn bench_*` body, `black_box(` must appear both inside the call arguments
and around the call expression. A benchmark reporting a >90% win is a prompt to re-read for
this.
*Severity:* MUST

**PERF-06 — Never emit `#![feature(test)]`, `extern crate test`, or `#[bench]`.**
*Rationale:* nightly-only since 2015 with no stabilization path
([rust-lang/rust#66287](https://github.com/rust-lang/rust/issues/66287)); the repos pin stable
1.95.0 (`grimoire/rust-toolchain.toml`), so it will not build.
*Verify:* `grep -rn 'feature(test)\|extern crate test\|test::Bencher' --include='*.rs' .` →
zero hits.
*Severity:* MUST

**PERF-07 — Do not add a CI job that fails a build on a wall-clock benchmark number while running on a GitHub-hosted runner.**
*Rationale:* ~2.66% CoV on shared runners; a 2% gate is ~45% false-positive and trains everyone
to ignore it. The fix is isolated hardware, not a looser threshold
([CodSpeed](https://codspeed.io/blog/benchmarks-in-ci-without-noise)).
*Verify:* in workflow YAML, any step whose failure condition is a timing comparison must not be
under `runs-on: ubuntu-latest`/`macos-*`/`windows-*`; hyperfine steps must be advisory
(`continue-on-error: true` or comment-only).
*Severity:* MUST

**PERF-08 — A binary-size gate compares `stat -c%s target/dist/<bin>` against a checked-in byte threshold; `cargo bloat` is advisory only.**
*Rationale:* cargo-bloat's own docs call its attribution "guesswork"
([cargo-bloat](https://github.com/RazrFalcon/cargo-bloat)) — it explains *why*, it cannot be the
gate.
*Verify:* any CI step parsing `cargo bloat` output into a failure condition is a defect;
the gate step must read the real file size.
*Severity:* SHOULD

**PERF-09 — Any regression threshold in CI config carries an adjacent comment citing the variance measurement it was derived from.**
*Rationale:* agents copy "1.5%" from a CodSpeed blog post onto a shared runner; the number must
come from re-running the benchmark N times on *this* runner
([perf-regression §2.1](rust-performance/perf-regression-and-budgets.md)).
*Verify:* grep the workflow for `alert-threshold`/`noise-threshold`/size thresholds; a bare
number with no adjacent justification comment is a defect.
*Severity:* SHOULD

### Concurrency and I/O — the throughput axis that actually matters here

**PERF-10 — Every fan-out over registry/network calls goes through `tokio::sync::Semaphore` or `StreamExt::buffer_unordered(n)`; never a raw `join_all`/unbounded `FuturesUnordered`.**
*Rationale:* ghcr.io rate-limits and resets connections under unbounded fan-out; agents reach
for maximum parallelism by default ([tokio Semaphore](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html),
[buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)).
*Verify:* `grep -rn 'join_all' src/ crates/*/src` — every hit over an HTTP/OCI client call needs
a `Semaphore`/`buffer_unordered` within the same function or an explanatory comment.
*Severity:* MUST

**PERF-11 — Acquire the concurrency permit before spawning the task, not inside the task body.**
*Rationale:* a semaphore that gates only the fetch body still lets a wide frontier spawn
thousands of tasks and hold their memory — the exact bug documented at
`ocx_lib/src/package_manager/tasks/common.rs:928` ("the prior `Semaphore` only gated the fetch
body, so a wide frontier still…") and `tasks/inspect.rs:2791`.
*Verify:* for each `JoinSet`/`spawn` inside a loop, the `acquire()`/`acquire_owned()` call must
appear lexically *outside* the spawned future, not as its first statement.
*Severity:* MUST

**PERF-12 — Never `mmap` (`memmap2`, `Mmap`, `MmapMut`) anywhere in these codebases.**
*Rationale:* concurrent external truncation/modification of a mapped file is UB, and both
tools' store/cache directories are multi-writer by design (concurrent `grim`/`ocx`
invocations) ([memmap2 docs](https://docs.rs/memmap2/latest/memmap2/)); grimoire also
`forbid`s unsafe outright (`grimoire/Cargo.toml:123`).
*Verify:* `grep -rn 'memmap\|Mmap' --include='*.rs' .` → zero hits.
*Severity:* MUST

**PERF-13 — Wrap repeated small file reads/writes in `BufReader`/`BufWriter`, and take `stdout().lock()` once outside any loop that prints.**
*Rationale:* Rust file I/O is unbuffered by default and `println!` re-locks stdout on every
call ([perf-book io](https://nnethercote.github.io/perf-book/io.html)).
*Verify:* `grep -rn -B5 'for .*{' src/ | grep 'println!\|print!'` for loop-local printing;
any `File::open`/`File::create` feeding a read/write loop without a `Buf*` wrapper is a defect.
`grimoire/src/app.rs:175` is the reference shape.
*Severity:* SHOULD

**PERF-14 — Pre-size collections with `with_capacity`/`reserve` when the source length is known or size-hinted.**
*Rationale:* growing to ~20 elements costs 4 reallocations under the default doubling schedule
([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
*Verify:* `Vec::new()`/`HashMap::new()` immediately followed in the same function by a loop
over a `.len()`-bearing source.
*Severity:* SHOULD

**PERF-15 — Do not call sync `std::fs::*` inside an `async fn`; use `tokio::fs` or a documented `spawn_blocking` wrapper naming the sync primitive it bridges.**
*Rationale:* blocks a runtime worker thread. The house pattern is
`ocx_lib/src/utility/fs.rs:22-33`, whose doc comment names exactly which sync API it exists to
bridge ([ocx audit §3](ocx-codebase-audit/errors-async-security.md)).
*Verify:* not grep-reliable (the audit's 76/25/39-file co-location count is an upper bound, not
a defect count) — enforce via `clippy::await_holding_lock` plus review of any new `std::fs::`
call added to a file containing `async fn`.
*Severity:* SHOULD

### Build and distribution

**PERF-16 — Every key in a `[profile.*]` block carries a comment with the measured number that justified it.**
*Rationale:* `lto`, `codegen-units`, `opt-level` are runtime-vs-build-time-vs-size trades, not
free wins; `ocx/Cargo.toml:21-35` is the reference (measured MB deltas, measured link-time
doubling, measured per-path cost).
*Verify:* read `Cargo.toml`; an uncommented profile key is a defect. Absence of `lto`/
`codegen-units` means Cargo defaults (`lto = false`, `codegen-units = 16`) are in force by
omission — confirm that is intentional.
*Severity:* MUST

**PERF-17 — Never set `panic = "abort"` in `ocx`, `grim`, or `ocx-mirror`.**
*Rationale:* it silently removes the mechanism behind the 13
`resume_unwind(join_err.into_panic())` sites that propagate spawned-task panics, and it
compiles clean — documented at `ocx/Cargo.toml:27-29`, which also records the 3.1 MB it would
have bought. This overrides the generic "panic=abort is a standard release lever" guidance in
[performance-practices §8](rust-performance/performance-practices.md) **and** its restatement
as a first-move release lever in
[cli-startup-latency, guidance #6](rust-performance/cli-startup-latency.md) — two independent
rounds have now recommended it generically and both are overruled by the same in-tree
measurement.
*Verify:* `grep -rn 'panic *= *"abort"' --include=Cargo.toml .` — only `[profile.shim]`
(`ocx/Cargo.toml:52`, a dependency-free WinAPI launcher stub with no tasks) may match.
*Severity:* MUST

**PERF-18 — Pin compression backend features explicitly; never inherit a crate's default backend.**
*Rationale:* `flate2`'s features are additive and resolve by priority, and its own docs say
`zlib-rs` "typically outperforms all the C implementations" while `miniz_oxide` is still the
default ([flate2 docs](https://docs.rs/flate2/latest/flate2/)). An unpinned backend means
throughput changes on a `cargo update`.
*Verify:* `grep -n 'flate2\|zstd\|async-compression' Cargo.toml` — each must carry an explicit
`features = [...]` list. `ocx/Cargo.toml:121` (zstd `zstdmt`, with rationale) is the reference
shape; `ocx/Cargo.toml:114` (`flate2 = "1.1.9"`, bare) is the counter-example.
*Severity:* SHOULD

### Data structures and allocation — narrow, because most of it does not apply

**PERF-19 — Do not replace the default `HashMap`/`HashSet` hasher without (a) a profile showing the map is hot and (b) a written argument that its keys are not attacker-supplied.**
*Rationale:* FxHash/foldhash are measurably faster but explicitly not DoS-resistant
([perf-book hashing](https://nnethercote.github.io/perf-book/hashing.html),
[foldhash](https://docs.rs/foldhash/latest/foldhash/)); in these tools nearly every key is a
digest, ref, or package name read off a registry response. Also, `ahash` is not a free upgrade
— rustc measured 1-4% *slowdowns* switching to it.
*Verify:* `grep -rn 'rustc_hash\|FxHash\|ahash\|foldhash' --include='*.rs' .` — currently zero
hits across all three repos; each new hit needs both justifications in a comment.
*Severity:* MUST

**PERF-20 — Do not introduce `SmallVec`/`ArrayVec`/`CompactString` without a schema-enforced upper bound on the data.**
*Rationale:* `SmallVec` adds a branch to every access and pays off only when the collection is
usually inline; `ArrayVec` panics or truncates past its fixed `N`. "Usually small in practice"
is not a bound ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
*Verify:* for each `ArrayVec<[T; N]>`/`SmallVec<[T; N]>` introduced, point at the schema field
or protocol constant that caps the length; otherwise use `Vec`.
*Severity:* SHOULD

**PERF-21 — Never add `#[repr(C)]` for performance.**
*Rationale:* it *disables* the compiler's automatic size-minimizing field reordering and only
matters for FFI ABI stability ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)).
*Verify:* `grep -rn -A3 '#\[repr(C)\]' --include='*.rs' .` — every hit must sit near an
`extern "C"` boundary (i.e. `ocx_shim` only).
*Severity:* MUST

**PERF-22 — Box an enum variant that is both rare and much larger than its siblings; do not silence `clippy::large_enum_variant` without a comment.**
*Rationale:* types over 128 bytes are `memcpy`'d on move instead of moved in registers; every
instance of the enum pays for its largest variant
([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)). Boxing a
*hot* variant is a pessimization, so this is conditional, not blanket.
*Verify:* `cargo clippy` — `large_enum_variant` allowed anywhere needs an adjacent rationale;
add `const _: () = assert!(size_of::<T>() <= N);` on error enums that cross task boundaries.
*Severity:* CONSIDER

**PERF-23 — Extract the non-generic body of a generic function into a separate non-generic `fn` when the body is more than a few lines.**
*Rationale:* each instantiation duplicates the whole body — compile time and icache. This is
not abstract here: `ocx/Cargo.toml:24-26` chose `opt-level = "s"` specifically because LLVM's
inlining across "a 304-crate monomorphized graph" was costing 6.9 MB
([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)).
*Verify:* `cargo llvm-lines --release | head -30`; a generic function with a high
Lines × Copies product is the trigger.
*Severity:* CONSIDER

**PERF-24 — Defer any startup-optional initialization behind `std::sync::LazyLock`/`OnceLock`.**
*Rationale:* a CLI invocation should not pay for regexes, config parsing, or lookup tables it
never touches. Already the house pattern (28 sites in grimoire, 36 in ocx_lib).
*Verify:* `grep -rn 'static [A-Z_]*: *\(Vec\|HashMap\|Regex\)' --include='*.rs' .` for eager
statics; new module-level initialization work belongs in a `LazyLock`.
*Severity:* SHOULD

### Startup latency and the interactive budget

**PERF-25 — Any startup-latency measurement uses `hyperfine --shell=none --warmup N`; never bare `time`, never a shell `for` loop.**
*Rationale:* below ~5 ms hyperfine's shell-startup calibration-and-subtract correction is
noisier than the thing being measured, which is exactly the regime a `--version`/`--help`
invocation lives in; a hand-rolled loop re-adds the fork/exec cost to every sample
([hyperfine](https://github.com/sharkdp/hyperfine),
[cli-startup-latency §7](rust-performance/cli-startup-latency.md)).
*Verify:* `grep -rn 'hyperfine' . | grep -v -e '--shell=none' -e ' -N '` — a startup benchmark
without it is a defect; PERF-03's cold/warm declaration still applies on top.
*Severity:* MUST

**PERF-26 — Do not change `ocx`'s runtime flavor away from multi-thread. Do not "optimize" any `#[tokio::main]` to `current_thread` without checking for `block_in_place` in the reachable call graph.**
*Rationale:* `ocx.run` calls `Handle::current().block_on(...)` inside
`tokio::task::block_in_place`, which **panics** on a `current_thread` runtime —
`ocx_lib/src/script.rs:186-192` states the precondition and
`ocx_cli/src/command/script_runner.rs:44-54` asserts it. This is a correctness constraint that
overrides [cli-startup-latency, guidance #1](rust-performance/cli-startup-latency.md)'s
otherwise-sound "most CLI subcommands don't need multi-thread".
*Verify:* `grep -rn 'block_in_place' --include='*.rs' .` before touching any runtime
construction; a flavor change in a crate with a hit, or with a `runtime_flavor()` assertion,
is a defect. `grimoire/src/main.rs:165` (`Runtime::new()`, zero `block_in_place` sites) is the
one place a flavor experiment is legal — behind a PERF-25 measurement.
*Severity:* MUST

**PERF-27 — A hand-built `tokio::runtime::Builder` names the drivers it needs (`enable_io()`/`enable_time()`) instead of `enable_all()`, or carries a comment saying why all are needed.**
*Rationale:* resource drivers are opt-in on a hand-built `Builder`, not implicit
([tokio runtime docs](https://docs.rs/tokio/latest/tokio/runtime/index.html)); `enable_all()`
is a signal nobody checked which drivers the runtime actually uses.
*Verify:* `grep -rn -A5 'Builder::new_\(current\|multi\)_thread' --include='*.rs' .` — each hit
must show either named drivers or a rationale comment. Current sites:
`grimoire/src/auth/store.rs:480`, `ocx_lib/src/script/engine.rs:303`,
`ocx_lib/src/oci/index/file_transport.rs:924` — all three bare `enable_all()`.
*Severity:* SHOULD

**PERF-28 — Never claim a startup or runtime win from swapping the global allocator (mimalloc/jemalloc), from musl/`+crt-static` linking, from PGO, or from BOLT, without a same-hardware `hyperfine --shell=none` before/after pair in the same commit. BOLT is not adopted at all.**
*Rationale:* these are the four moves an agent reaches for first and the four the follow-up
round found **no published number** for — mimalloc's and tikv-jemallocator's own docs publish
no init cost, the Rust linkage reference is silent on runtime effects, rustc's PGO doc takes no
position on short-lived processes, and BOLT's README scopes itself to warmed-up services
([cli-startup-latency §§2, 3, 9](rust-performance/cli-startup-latency.md)).
*Verify:* `grep -rn 'global_allocator\|crt-static\|profile-use\|profile-generate\|llvm-bolt' .`
— currently zero hits across all three repos and that is the intended steady state; each new
hit needs the hyperfine pair in the same commit. BOLT hits are a defect regardless.
*Severity:* MUST

**PERF-29 — A subcommand whose work stays under ~100 ms shows no progress indicator; one that can cross ~1 s must show one.**
*Rationale:* the 0.1 s / 1.0 s thresholds are Miller (1968) and Card, Moran & Newell (1991),
synthesized by [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/) —
under 100 ms a spinner is itself the perceptible lag; past 1 s silence reads as "hung". This is
the only startup/latency threshold this project asserts, and it is sourced, not folklore.
*Verify:* any function issuing a registry fetch or an unbounded directory walk must have an
`indicatif` handle or a status `eprintln!` in scope. `ocx/Cargo.toml:171` has `indicatif`;
**`grimoire` has no progress dependency and no spinner anywhere in `grimoire/src`**, while
`grim install` pulls from ghcr.io — that is the open defect.
*Severity:* SHOULD

**PERF-30 — Use `strace -c` to establish what a startup actually costs before optimizing it; treat the syscall count as a diagnostic, not a CI gate.**
*Rationale:* config/dotfile path probing is invisible in code review and shows up immediately
as `openat` counts; `perf stat`'s `-D` flag exists to *skip* the startup phase and is the wrong
flag here ([strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html),
[perf-stat(1)](https://man7.org/linux/man-pages/man1/perf-stat.1.html)).
*Verify:* `strace -c ./target/dist/grim --version 2>&1 | tail -25` before any startup change;
a PR claiming a startup win with no syscall or hyperfine evidence is PERF-01. Do not turn the
count into a blocking threshold — that is PERF-07/09 territory.
*Severity:* CONSIDER

## Applied to OCX

### Already satisfied — do not "improve" these

- **Bounded concurrency is universal.** grimoire: `tui/update_check.rs:181`
  (`Semaphore::new(ROW_CHECK_CONCURRENCY)`), `tui/bundle_member_fetch.rs:126`,
  `command/status.rs:484` — and **zero `join_all` in `grimoire/src`**. ocx: a dedicated
  `package_manager/concurrency.rs:44-47` producing an `Option<Arc<Semaphore>>` from a CLI knob,
  plus 21 `buffer_unordered` sites in `ocx_lib` and named per-subsystem constants
  (`reachability_graph.rs:91`, `tasks/clean.rs:251`, `utility/fs/assemble.rs:521`,
  `utility/fs/dir_walker.rs:161`). This is better than the sub-artifacts' baseline advice.
- **The permit-at-spawn lesson is already learned and documented in-tree**
  (`ocx_lib/src/package_manager/tasks/common.rs:928`, `tasks/inspect.rs:2791`). PERF-11 just
  writes it down.
- **`ocx/Cargo.toml:21-35` is the model release profile**: every key carries its measured
  delta, including a documented *rejection* of `panic = "abort"` with the exact failure mode.
  No sub-artifact produced anything this good.
- **`zstd` with `zstdmt` (`ocx/Cargo.toml:117-121`)** — multi-threaded encode with a comment
  explaining the encode/decode asymmetry.
- **Startup deferral** via `LazyLock`/`OnceLock` (grimoire 28, ocx_lib 36, ocx-mirror 26).
- **The runtime-flavor precondition is asserted in-tree, not just commented.**
  `ocx_cli/src/command/script_runner.rs:44-54` carries a `debug_assert!` on
  `Handle::current().runtime_flavor()` written specifically so "a future switch to
  current_thread fails loudly". PERF-26 exists because an agent reading a startup-perf blog
  post would otherwise make exactly that switch.
- **Zero global-allocator swaps, zero `+crt-static`, zero PGO/BOLT** across all three repos —
  PERF-28's steady state, currently true by accident.
- **`grimoire/Cargo.toml:123` `unsafe_code = "forbid"`** makes PERF-12 (no mmap) mechanically
  unbreakable in grimoire.
- **stdout locked once** at `grimoire/src/app.rs:175`.
- **Two Hats Rule** ("never mix refactoring and optimization in one session; optimization
  requires benchmarks") is already in the shipped rules
  ([rules-inventory.md:745-751](ocx-codebase-audit/rules-inventory.md)) — PERF-01 supplies the
  benchmark half it currently asserts without a mechanism.

### Violated or absent today

| Gap | Evidence | Rule |
|---|---|---|
| **Zero benchmarks of any kind.** No `benches/` dir, no criterion/divan/hyperfine dependency, no `hyperfine` in any of 22 ocx + 7 grimoire workflow files. | `ls -d */benches` → none; `grep -rn hyperfine .github/` → empty | PERF-01/03 |
| **No perf guidance in existing AI-config.** `quality-core.md`'s generic Performance Checklist is the entire corpus — "nothing on criterion benchmarks, allocation profiling, perf/flamegraphs". | [rules-inventory.md:1046-1049](ocx-codebase-audit/rules-inventory.md); [skills-agents-inventory.md:498-501](ocx-codebase-audit/skills-agents-inventory.md) | whole ruleset |
| **`flate2` runs on whatever backend Cargo picks.** Bare version requirement, no `features`, so `miniz_oxide` — the slowest documented option. | `ocx/Cargo.toml:114` | PERF-18 |
| **grimoire's release profile is undocumented and thinner than ocx's.** `[profile.dist]` sets only `lto = "thin"` + `strip`; no `codegen-units`, no `opt-level`, no measured numbers — and only the `strip` key has a rationale comment. | `grimoire/Cargo.toml:111-117` | PERF-16 |
| **Neither repo defines `[profile.release]`.** `dist` inherits it, so a plain `cargo build --release` (what every local perf experiment uses) runs at Cargo defaults: `lto = false`, `codegen-units = 16`. Any local timing is measured against a binary nobody ships. | `grep -n profile */Cargo.toml` | PERF-02/16 |
| **10 `join_all` sites in ocx** (7 in `ocx_cli`, 3 in `ocx_lib`) are unaudited against PERF-10. | `grep -rn join_all ocx/crates/*/src` | PERF-10 |
| **No `BufReader`/`BufWriter` anywhere in `grimoire/src`** (0 hits vs 21 in `ocx_lib`). Probably fine — grimoire does whole-file reads — but unverified for the install/materialize path. | `grep -rc 'BufReader\|BufWriter' grimoire/src` | PERF-13 |
| **`tokio` is `features = ["full"]` in all three repos** and grimoire builds a default multi-thread `Runtime` at `grimoire/src/main.rs:165`. `ocx` is pinned to multi-thread by PERF-26; **grimoire is not** (zero `block_in_place` sites) and is the only legal place to try `current_thread` — still unmeasured. | `errors-async-security.md:49`; `grep -rn block_in_place grimoire/src` → none | PERF-25/26 |
| **Three hand-built runtimes all use bare `enable_all()`** with no comment on which drivers they need. | `grimoire/src/auth/store.rs:480`, `ocx_lib/src/script/engine.rs:303`, `ocx_lib/src/oci/index/file_transport.rs:924` | PERF-27 |
| **grimoire ships no progress indicator at all** — no `indicatif`, no spinner, nothing in `grimoire/src` — while `grim install`/`grim search` do ghcr.io round trips that are squarely in the >1 s band. ocx has `indicatif` and grimoire does not. | `grep -rn indicatif grimoire/Cargo.toml` → none; `ocx/Cargo.toml:171` | PERF-29 |
| **Blocking-in-async co-location is large** (76 ocx_lib / 25 grimoire / 39 ocx-mirror files with an `async fn` and a `std::fs::` call). An upper bound, not a defect count, but unresolved. | [errors-async-security.md:53](ocx-codebase-audit/errors-async-security.md) | PERF-15 |

### Newly committed to

No `mmap` and no BLAKE3 anywhere (PERF-12, verdict §7) — both currently true by accident, now
by rule. No `panic = "abort"` outside `[profile.shim]` (PERF-17). No hasher swap without a
written untrusted-key argument (PERF-19) — currently zero `rustc_hash`/`ahash`/`foldhash`
usage across all three repos, and that is the intended steady state. No BOLT, ever (verdict
§11); no global-allocator swap, no `+crt-static`, no PGO without a hyperfine pair in the same
commit (PERF-28) — also currently zero hits everywhere, also now by rule. `ocx` stays on the
multi-thread runtime (PERF-26).

## AI-agent failure modes

Ranked by how often they bite in this codebase's shape, merged across both sub-artifacts.

1. **Asserting a numeric speedup that was never measured.** The single most common one — "this
   is 3x faster because it avoids an allocation" written as a conclusion, in a commit message
   or a code comment, with no tool ever run. Both sub-artifacts name it independently. Caught
   only by PERF-01 as a process check.
2. **Unbounded `join_all` over registry calls "for speed."** Locally it looks like a win;
   against ghcr.io it is a rate-limit incident. The agent has no way to know the registry's
   limits, so it optimizes the only variable it can see.
3. **Benchmarking a debug build**, or benchmarking `target/release` in a repo whose real
   artifact is `target/dist` with different LTO settings. Produces a confident number about a
   binary nobody ships.
4. **`black_box` on the input only.** The agent writes correct-looking criterion code, LLVM
   deletes the unused result, and the reported number is near-zero — which the agent then
   reports as the win.
5. **Reflexive `SmallVec`/`ArrayVec`/`CompactString` on collections with no bound.** Pattern-
   matching "small collection type = faster" onto a dependency list, which either adds branch
   overhead for nothing or panics on real input past `N`.
6. **`#![feature(test)]` / `#[bench]` from stale training data.** Does not compile on the pinned
   stable 1.95.0 toolchain.
7. **Copying a CI perf threshold out of a blog post** (CodSpeed's 1.5%) onto a shared GitHub
   runner, guaranteeing constant false failures.
8. **`unsafe { mmap }` for "fast file reading"** on a store path a concurrent `grim`/`ocx`
   process may write. Compiles, reads idiomatically, is UB. Not clippy-catchable — this is
   exactly why PERF-12 is an absolute ban rather than a judgement call.
9. **Hallucinated hasher APIs** — `FxHashMap::new()` (no such method; only `default()`), or the
   type imported from `std::collections`/`hashbrown`. Caught by `cargo check`, but wastes a
   round trip.
10. **`#[repr(C)]` added "for performance"**, which disables the layout optimization the agent
    thought it was enabling.
11. **`Rc<RefCell<T>>`/`Arc<Mutex<T>>` as the default shared-state shape**, then optimizing the
    `.clone()` (a refcount bump, free) while ignoring the runtime borrow-check and lock
    contention that are the actual cost.
12. **Using `cargo bloat` output as a hard gate** by parsing its stdout, against the tool's own
    accuracy disclaimer.
13. **The four reflex startup "fixes": swap in mimalloc, switch to musl-static, add PGO, add
    BOLT.** Asked to "make this CLI start faster", an agent reaches for all four because they
    sound standard — and all four are precisely the moves for which the startup round found no
    published number at all. PERF-28 makes the hyperfine pair the price of entry.
14. **Downgrading `#[tokio::main]` to `current_thread` "because a CLI doesn't need worker
    threads."** Correct advice in general, a panic in `ocx` — `block_in_place` +
    `Handle::block_on` requires multi-thread. The `debug_assert!` catches it only in debug
    builds, so a release-only regression is possible. PERF-26.

## Open questions

**Needs a human decision:**

- **grimoire's `[profile.dist]`: adopt ocx's `opt-level = "s"` + `codegen-units = 1` + `lto = "fat"`, or keep `lto = "thin"`?** ocx measured its trade; grimoire never has. Requires someone to
  accept a release-link-time increase (ocx measured 96s → 187s) against a size win.
- **Should either repo define an explicit `[profile.release]`** so local `cargo build --release`
  matches shipped settings, or is the dev/dist split deliberate?
- **What is the binary-size budget number?** PERF-08 needs a threshold; ocx currently ships
  18.6 MB / 7.7 MB archive. Nobody has said what "too big" is. (The *latency* budget is no
  longer open — PERF-29 sets it at 100 ms / 1 s with a cited source.)
- **Does grimoire get a progress indicator, and which crate?** PERF-29 makes this a defect
  today; `indicatif` is already a dependency in ocx, so the cheap answer is to match it. Needs
  someone to accept the dependency in grimoire, which currently has none.
- **Does the release pipeline move to musl-static or `+crt-static`?** The mechanistic case (no
  `ld.so` pass) is real and unquantified, and musl's `malloc`/NSS behaviour differs in ways
  that matter for a tool that resolves ghcr.io hostnames
  ([cli-startup-latency, contested](rust-performance/cli-startup-latency.md)). PERF-28 blocks
  the change until someone runs the pair; the decision to run it is the owner's.

**Deserves another research round, specifically:**

1. **Archive + hash throughput on the real blob-size distribution.** No sub-artifact found a
   zstd-vs-gzip number, and ocx supports gzip, zstd, and xz layers. Which codec/level is
   actually on the critical path for a typical `ocx install`, and does `zlib-rs` (PERF-18)
   move it? Needs a measurement against real ghcr.io layer sizes, not a synthetic corpus.
2. **The blocking-in-async question, resolved precisely.** The 76/25/39-file co-location count
   needs an AST or `rust-analyzer`-driven pass identifying `std::fs::` calls lexically inside
   `async fn` bodies before PERF-15 can become a mechanical MUST rather than a review SHOULD.
3. **Binary-size gating tooling.** [perf-regression §3.1](rust-performance/perf-regression-and-budgets.md)
   found no maintained Rust equivalent of JS's `size-limit`; teams hand-roll `stat`. Worth
   re-checking before we hand-roll one too.

**Closed by the follow-up round, no further research warranted:**

- *CLI startup latency* — answered. Three rounds of source-hunting produced no published
  numbers for tokio construction, linking mode, allocator init, or clap parse cost, and
  cli-startup-latency establishes that this is a property of the literature, not of the search:
  these are self-measure-only quantities. The residual is a **measurement task, not research** —
  run PERF-25's recipe on `grim --version` / `grim status` / `ocx --version` and paste the
  table. The threshold it would be judged against already exists (PERF-29).
- *PGO/BOLT* — answered. BOLT is rejected (verdict §11); PGO stays unadopted behind PERF-28.
  No source exists to find, so no round would help.

## Sub-artifacts

- [rust-performance/performance-practices.md](rust-performance/performance-practices.md) —
  allocation strategy, iterators, data layout and hashing, monomorphisation cost, I/O
  buffering and bounded concurrency, hash/compression throughput, build configuration,
  profiling tools, and a self-flagged-thin section on CLI startup latency.
- [rust-performance/perf-regression-and-budgets.md](rust-performance/perf-regression-and-budgets.md) —
  benchmark harness comparison (criterion/divan/iai-callgrind/`#[bench]`), the quantified CI
  noise problem and gating platforms, binary-size and compile-time budgets, regression
  forensics with `cargo-bisect-rustc` and `git bisect` + hyperfine, and uv's cold/warm
  package-manager benchmark methodology.
- [rust-performance/cli-startup-latency.md](rust-performance/cli-startup-latency.md) —
  the follow-up round commissioned by the first consolidation's open question #1: what happens
  between `exec()` and `main()`, static-vs-dynamic linking, allocator and tokio-runtime
  construction cost, clap's undocumented overhead, the `hyperfine --shell=none` / `strace -c` /
  `perf stat` measurement toolchain, why BOLT and PGO do not transfer to short-lived processes,
  and the Miller/Card/Nielsen perception bands behind the 100 ms budget. Its central finding is
  a negative one: no published number exists for any of the four moves an agent reaches for.

Supporting audit evidence cited above:
[ocx-codebase-audit/crate-architecture.md](ocx-codebase-audit/crate-architecture.md),
[ocx-codebase-audit/errors-async-security.md](ocx-codebase-audit/errors-async-security.md),
[ocx-codebase-audit/rules-inventory.md](ocx-codebase-audit/rules-inventory.md),
[ocx-codebase-audit/skills-agents-inventory.md](ocx-codebase-audit/skills-agents-inventory.md).

## Key sources

| URL | Why it is here |
|---|---|
| [perf-book — general tips](https://nnethercote.github.io/perf-book/general-tips.html) | The measurement-first framing the whole ruleset rests on |
| [perf-book — build configuration](https://nnethercote.github.io/perf-book/build-configuration.html) | Debug-vs-release delta, LTO/codegen-units/panic=abort trade-offs, linker guidance |
| [perf-book — heap allocations](https://nnethercote.github.io/perf-book/heap-allocations.html) | `with_capacity`, Cow, SmallVec/ArrayVec caveats, clone cost model |
| [perf-book — hashing](https://nnethercote.github.io/perf-book/hashing.html) | The rustc-measured FxHash/ahash percentages behind PERF-19 |
| [perf-book — type sizes](https://nnethercote.github.io/perf-book/type-sizes.html) | 128-byte memcpy cliff, enum boxing, why `#[repr(C)]` hurts |
| [perf-book — I/O](https://nnethercote.github.io/perf-book/io.html) | Unbuffered-by-default, stdout re-locking |
| [std::hint::black_box](https://doc.rust-lang.org/std/hint/fn.black_box.html) | Canonical statement of what it does and does not guarantee |
| [hyperfine](https://github.com/sharkdp/hyperfine) | `--warmup`/`--prepare`/`--shell=none`, shell-overhead correction — the project's primary harness |
| [CodSpeed — benchmarks in CI without noise](https://codspeed.io/blog/benchmarks-in-ci-without-noise) | 2.66% CoV / 45% false-positive / 0.56% bare-metal — the basis for PERF-07 |
| [astral.sh/blog/uv](https://astral.sh/blog/uv) | Cold/warm-cache split methodology for a package-manager CLI (PERF-03/04) |
| [rust-lang/rust#66287](https://github.com/rust-lang/rust/issues/66287) | Why `#[bench]` is permanently nightly (PERF-06) |
| [tokio Semaphore](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html) · [futures buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered) | The two sanctioned bounded-fan-out primitives (PERF-10) |
| [memmap2](https://docs.rs/memmap2/latest/memmap2/) | The UB boundary that makes PERF-12 an absolute ban |
| [flate2](https://docs.rs/flate2/latest/flate2/) | Backend priority resolution and the `zlib-rs` claim behind PERF-18 |
| [foldhash](https://docs.rs/foldhash/latest/foldhash/) | "Minimally DoS-resistant" — the counterweight to fast-hasher enthusiasm |
| [cargo-bloat](https://github.com/RazrFalcon/cargo-bloat) | Its own "guesswork" disclaimer, why it is advisory-only |
| [Cargo Book — timings](https://doc.rust-lang.org/cargo/reference/timings.html) | Compile-time diagnosis for the monolithic-crate problem |
| [NN/g — response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | Miller 1968 / Card, Moran & Newell 1991 — the cited 0.1 s / 1 s / 10 s bands behind PERF-29 |
| [tokio runtime docs](https://docs.rs/tokio/latest/tokio/runtime/index.html) | `current_thread` vs `multi_thread`, and that resource drivers are opt-in on a hand-built `Builder` (PERF-26/27) |
| [LLVM BOLT README](https://raw.githubusercontent.com/llvm/llvm-project/main/bolt/README.md) | Its own "deploy the service, warm it up, then profile" workflow — the basis for rejecting BOLT (verdict §11) |
| [strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html) · [perf-stat(1)](https://man7.org/linux/man-pages/man1/perf-stat.1.html) · [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html) | Syscall/loader measurement mechanics for PERF-30; `perf stat -D` is the flag that skips startup, so never pass it here |
| [Rust reference — linkage](https://doc.rust-lang.org/reference/linkage.html) | musl-default-static vs glibc-default-dynamic and `+crt-static`; silent on runtime effects, which is why PERF-28 demands a measurement |

## Revision log

**2026-08 — folded in [cli-startup-latency.md](rust-performance/cli-startup-latency.md)**, the
follow-up round commissioned by the first consolidation's open question #1. Every PERF-01..24
ID keeps its number and meaning; only PERF-17's rationale text changed.

| Change | IDs | Why |
|---|---|---|
| Added a "Startup latency and the interactive budget" rule block | **PERF-25** (`hyperfine --shell=none`), **PERF-26** (no `current_thread` for ocx), **PERF-27** (named tokio drivers, not `enable_all()`), **PERF-28** (no allocator/musl/PGO/BOLT claim without a hyperfine pair), **PERF-29** (100 ms / 1 s progress-indicator budget), **PERF-30** (`strace -c` as diagnostic, not gate) | New IDs continuing the sequence; the follow-up round is the first source for all six. PERF-26 and PERF-29 are the two that catch a plausible-looking agent change that breaks something real. |
| Rationale amended in place — no meaning change | **PERF-17** | cli-startup-latency guidance #6 recommends `panic = "abort"` as a first-move release lever, contradicting PERF-17. The rule stands; its rationale now records that *two* rounds recommended it generically and both are overruled by `ocx/Cargo.toml:27-29`. Left the ID, severity, and verify grep untouched. |
| Verdict §9 rewritten; §10 and §11 added | — | §9 said startup was unresearched and gets its own round. It got one. It now records what the round settled (the budget's provenance) and what it could not (any number). §10 records the `block_in_place` constraint that makes the round's headline recommendation illegal for ocx. §11 rejects BOLT outright rather than deferring it a third time. |
| Open questions: removed round items #1 (startup) and #3 (PGO/BOLT); renumbered the remainder to 1–3 | — | Both are answered. Added a "Closed by the follow-up round" block so a later author does not re-commission them: startup's residual is a measurement task, and no PGO/BOLT source exists to find. |
| Open questions: added grimoire's missing progress indicator and the musl-static decision | — | Both are human decisions the round surfaced (dependency acceptance; distribution change gated on PERF-28). |
| "Applied to OCX" — three rows added to *Violated or absent*, two bullets to *Already satisfied*; the `tokio features = ["full"]` row's Rule column changed from "open question" to PERF-25/26 | — | The runtime-flavor row is no longer an open question: ocx is pinned by a documented precondition, grimoire is not. The `enable_all()` and no-progress-indicator gaps are new, both grep-verified in this pass. |
| AI-agent failure modes #13 and #14 added | — | The four reflex startup "fixes", and the `current_thread` downgrade that panics only outside debug builds. |
| Frontmatter: `cli-startup-latency.md` added to `consolidates`, `revised: 2026-08` added | — | File contract. |
