---
title: Writing Fast Rust — Allocation, Iterators, Data Layout, I/O
topic: rust-performance
agent: perf-researcher
model: sonnet
date_researched: 2026-08
sources_count: 20
scope: |
  Covers measurement-first optimization discipline, allocation strategy (Cow/SmallVec/
  compact strings/arenas), iterator vs loop codegen, data layout (struct/enum sizing,
  hashers), generics/compile-time cost, I/O buffering and parallel filesystem/network
  work, hashing/compression throughput, and CLI startup latency — all as it applies to
  a Rust CLI package manager over OCI registries (clap, tokio, filesystem-heavy).
  Does NOT cover SIMD intrinsics, unsafe-heavy micro-optimization, GPU, or web-server
  request-per-second tuning.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Measurement-first discipline](#1-measurement-first-discipline)
   2. [Allocation strategy](#2-allocation-strategy)
   3. [Iterators vs loops](#3-iterators-vs-loops)
   4. [Data layout and hashing](#4-data-layout-and-hashing)
   5. [Generics, monomorphisation, and compile-time cost](#5-generics-monomorphisation-and-compile-time-cost)
   6. [I/O performance](#6-io-performance)
   7. [Hashing and compression throughput](#7-hashing-and-compression-throughput)
   8. [Compile-time performance](#8-compile-time-performance)
   9. [Benchmarking and profiling tools](#9-benchmarking-and-profiling-tools)
   10. [Startup latency for CLIs](#10-startup-latency-for-clis)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Never hand-optimize without a benchmark first; the biggest wins come from algorithm/data-structure changes, not micro-tricks — most individual optimizations are small and only add up in aggregate ([perf-book general tips](https://nnethercote.github.io/perf-book/general-tips.html)).
- `criterion` measures wall-clock time with statistical outlier detection and warm-up; `iai-callgrind` (renamed **Gungraun**) measures instruction counts via Valgrind, which is noise-immune in CI but not a substitute for wall-clock numbers ([Gungraun README](https://github.com/iai-callgrind/iai-callgrind)).
- Wrap benchmark inputs/outputs in `std::hint::black_box`; it is only a best-effort compiler hint, never rely on it for correctness or security ([std docs](https://doc.rust-lang.org/std/hint/fn.black_box.html)).
- For end-to-end CLI timing use `hyperfine`, which auto-corrects for shell spawn overhead and supports `--warmup`/`--prepare`/`--shell=none` ([hyperfine README](https://github.com/sharkdp/hyperfine)).
- `clone()` on `Rc`/`Arc` is a refcount bump, not an allocation; `clone()` on `String`/`Vec`/`HashMap` does allocate — profile before assuming either is hot ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
- Reducing allocation rate by ~10 allocations per million instructions produced a measurable ~1% win in rustc's own optimization history — allocation counts matter at scale, not in isolation ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
- `SmallVec`/`ArrayVec` avoid heap allocation for small, bounded collections but add a branch to every access; `ArrayVec` is faster than `SmallVec` when you know a hard max length ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
- `compact_str::CompactString` stores up to 24 bytes inline on 64-bit (same size as `String`) with zero API-surface change — a strict upgrade over `String` for path segments, tags, digests, and version strings that are usually short ([compact_str docs](https://docs.rs/compact_str/latest/compact_str/)).
- `Vec::with_capacity` on a vector that will hold ~20 items avoids 4 reallocations that the default doubling growth (0,4,8,16,32...) would otherwise perform ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).
- `bumpalo` arena allocation is a win specifically for phase-oriented workloads (parse-then-discard, build-then-drop-all) where individual frees are unnecessary; it does not run `Drop` on reset unless objects are boxed into the arena explicitly ([bumpalo docs](https://docs.rs/bumpalo/latest/bumpalo/)).
- `FxHashMap` (rustc-hash) is measurably faster than the default SipHash for CLI-scale workloads (rustc saw 4–84% slowdowns reverting away from it); `ahash` is not a strict upgrade over FxHash — rustc saw 1–4% slowdowns switching to it ([perf-book hashing](https://nnethercote.github.io/perf-book/hashing.html)). `foldhash` is a newer default-candidate hasher, faster-tuned but only "minimally" DoS-resistant — do not use it (or FxHash) for attacker-controlled keys without a HashDoS mitigation ([foldhash docs](https://docs.rs/foldhash/latest/foldhash/)).
- The compiler already reorders struct/enum fields to minimize size unless `#[repr(C)]` is used — manual field reordering is a non-issue except under `repr(C)`/FFI ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)).
- `Box` large, rare enum variants; types over 128 bytes trigger `memcpy` instead of register/inline moves, which is a real speed cliff ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)).
- Generic function bloat is a real compile-time and icache cost — extract non-generic logic into inner non-generic functions ("outline the cold/generic-free path"); `cargo llvm-lines` finds the worst offenders ([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)).
- Rust file I/O is unbuffered by default — wrap with `BufReader`/`BufWriter` for many small reads/writes, and lock `stdout`/`stdin` once via `.lock()` before a loop of `print!`/`writeln!` calls, since each unlocked call re-locks ([perf-book io](https://nnethercote.github.io/perf-book/io.html)).
- `mmap` requires `unsafe` specifically because concurrent external modification/truncation of the backing file is undefined behavior in the Rust memory model — do not mmap files you don't control the lifetime of ([memmap2 docs](https://docs.rs/memmap2/latest/memmap2/)).
- Use bounded concurrency (`tokio::sync::Semaphore` or `StreamExt::buffer_unordered(n)`) for "fetch N objects from a registry" — unbounded `join_all` on hundreds of futures opens hundreds of simultaneous connections and can trip server rate limits ([tokio Semaphore docs](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html), [futures buffer_unordered docs](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)).
- BLAKE3 is dramatically faster than SHA-256/SHA-1/MD5/SHA-3/BLAKE2 (its own CLI, `b3sum`, is "an order of magnitude faster" than `sha256sum` on typical hardware) and should be preferred for non-interop content hashing; `sha2` gets hardware acceleration (x86 SHA-NI, ARM SHA2/SHA3 extensions) with automatic runtime detection when digest format must stay SHA-256 for compatibility ([BLAKE3 README](https://github.com/BLAKE3-team/BLAKE3), [sha2 docs](https://docs.rs/sha2/latest/sha2/)).
- `flate2`'s `zlib-rs` backend now "typically outperforms all the C implementations" including zlib-ng, and needs no C compiler — prefer it over the default pure-Rust `miniz_oxide` backend when gzip throughput matters ([flate2 docs](https://docs.rs/flate2/latest/flate2/)).
- Always enable a faster linker on Linux (`lld` is default since Rust 1.90; `mold` is faster still, measured 3.6–4x faster than lld linking large C++ projects) — "there are no downsides to doing so" ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html), [mold README](https://github.com/rui314/mold)).
- LTO (`lto = "thin"` or `"fat"`) plus `codegen-units = 1` can yield 10–20%+ runtime improvement at the cost of release build time — this is the standard release-profile lever for a shipped CLI binary ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)).

## Findings

### 1. Measurement-first discipline

The Rust Performance Book's core methodology: profile before optimizing, and prefer algorithmic/data-structure fixes over micro-tuning. "The biggest performance improvements often come from changes to algorithms or data structures, rather than low-level optimizations," and "most optimizations result in small speedups... they really add up if you can do enough of them" — implying no single micro-optimization is worth chasing without a profile pointing at it ([perf-book general-tips](https://nnethercote.github.io/perf-book/general-tips.html)). "Different profilers have different strengths. It is good to use more than one" — the book explicitly rejects a single-tool workflow.

A benchmark that lies is worse than no benchmark. Two failure modes to guard against:

1. **Dead-code elimination silently deleting the workload.** `std::hint::black_box` is the fix: it is documented as an identity function the compiler is "encouraged to assume... can use `dummy` in any possible valid way," which blocks both constant-folding of its argument and elision of its result. Critically: "`black_box` is only (and can only be) provided on a 'best-effort' basis... Programs cannot rely on `black_box` for correctness... it must not be relied upon to control critical program behavior" — it is a benchmarking aid, never a security or correctness mechanism ([std::hint::black_box docs](https://doc.rust-lang.org/std/hint/fn.black_box.html)). Correct criterion usage wraps the *input*: `b.iter(|| fibonacci(black_box(20)))` ([criterion getting-started](https://bheisler.github.io/criterion.rs/book/getting_started.html)).
2. **System noise masking or fabricating a signal.** `hyperfine` addresses this for end-to-end CLI timing: it runs warm-up iterations (`--warmup N`) to prime OS/filesystem caches before measuring, applies "statistical outlier detection to detect interference from other programs and caching effects," and *automatically corrects for shell-spawn time* by calibrating against empty shell invocations — critical for a CLI whose own runtime may be single-digit milliseconds, where shell fork/exec overhead would otherwise dominate the number. For sub-millisecond binaries use `--shell=none` to skip the intermediate shell entirely ([hyperfine README](https://github.com/sharkdp/hyperfine)).

Micro-benchmark tool choice depends on what "not lying" means for your case:

- **criterion**: wall-clock time, statistics-driven — reports warm-up, sample count, and change significance as a p-value (e.g. `p = 0.00 < 0.05` ⇒ "Performance has improved") ([criterion getting-started](https://bheisler.github.io/criterion.rs/book/getting_started.html)).
- **divan**: simpler API (`#[divan::bench]` attribute, no closures/setup boilerplate), reports fastest/slowest/median/mean; supports `--test` to run benchmarked code once for correctness without full profiling overhead in CI ([divan README](https://github.com/nvzqz/divan)).
- **iai-callgrind / Gungraun**: measures instruction counts and estimated cycles via Valgrind's callgrind instead of wall-clock time, running each benchmark *once*. This "negat[es] the noise of the environment" — the tool's own docs are explicit that "If you need wall-clock times, [it] cannot help you much... cycle estimation merely correlates to wall-clock times but is not a replacement" — use it for regression detection in noisy/virtualized CI, not for reporting real-world speed ([Gungraun README](https://github.com/iai-callgrind/iai-callgrind)).

CPU pinning / ASLR: none of the fetched primary sources for this subarea document `taskset`/CPU-affinity pinning directly (out of scope for what was fetched) — treat any claim of a specific pinning recipe as unverified until you check `hyperfine`'s own issue tracker or `criterion`'s `--sample-size` flags for the current guidance; do not assert a specific `taskset` invocation as settled practice.

### 2. Allocation strategy

**`clone()` — when it's real cost vs noise.** Cloning heap-backed types (`String`, `Vec<T>`, `HashMap`) "typically involves additional allocations." The one universal exception is `Rc`/`Arc`, where `.clone()` is a refcount increment, not an allocation ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)). Concretely: `a.clone_from(&b)` can reuse `a`'s existing buffer instead of allocating fresh, unlike `a = b.clone()`. The book's threshold for "this matters": rustc's own history shows shaving ~10 allocations per million executed instructions produced ~1% measurable speedup — allocation *rate*, not any single clone, is what shows up in a profile.

**`Cow<'a, T>`** lets a function accept either borrowed or owned data and only allocate on the mutation path — useful for "normalize this string only if it needs normalizing" style code (e.g. path/tag normalization in a registry client). The book's own caveat: "`Cow` can be fiddly to get working, but it is often worth the effort" ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).

**`SmallVec`/`ArrayVec` vs `Vec`.** `SmallVec<[T; N]>` stores up to `N` elements inline and spills to the heap beyond that, but is "slightly slower than `Vec` for normal operations" because every access branches on whether it's inline or heap. `ArrayVec` has no spill path at all and is faster when the max length is truly known and bounded ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)). For a package manager, candidates: small fixed-arity tuples (a manifest's list of 1–3 platforms), not general dependency lists (unbounded, don't force a spill branch on the common unbounded case).

```rust
// Right-sized: a manifest almost always names 1 registry mirror, rarely more than 3.
use smallvec::SmallVec;
type Mirrors = SmallVec<[String; 2]>;

// Wrong: dependency graphs are unbounded — SmallVec here just adds branch
// overhead with no payoff since the heap path is the common path anyway.
type Deps = SmallVec<[PackageId; 4]>; // should just be Vec<PackageId>
```

**String types.** `String` allocates; `format!` always allocates a `String` ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)). For short, bounded strings (OCI tags, digests' hex prefix, path components, semver strings) `compact_str::CompactString` is a drop-in `String` replacement that stores up to 24 bytes inline on 64-bit platforms (12 on 32-bit) — same `size_of` as `String`, using the fact that a valid UTF-8 string's byte layout leaves the encoding scheme spare bits to signal length ([compact_str docs](https://docs.rs/compact_str/latest/compact_str/)). `Box<str>` is worth it over `String` specifically when a string is stored long-term and never grows again — it drops the unused `capacity` word, shrinking the type by one `usize` per instance, which matters when you have millions of interned strings.

**Arena allocation (`bumpalo`).** A bump allocator is a fast path for *phase-oriented* allocation: parse a manifest into a scratch AST, use it, drop it all at once. Allocation is "checking available capacity and updat[ing] the pointer" — no per-object bookkeeping; deallocation is "extremely fast" because it just resets one pointer. The sharp edge: resetting the arena does **not** run `Drop` on the objects inside unless they're wrapped so their drop glue is explicitly registered — do not put anything with a meaningful `Drop` (open file handles, mutex guards) directly in a bump arena ([bumpalo docs](https://docs.rs/bumpalo/latest/bumpalo/)).

**`with_capacity` / reuse.** Growing a `Vec` to ~20 elements via repeated `push` triggers reallocations at 4, 8, 16, 32 (doubling from 0); pre-sizing with `Vec::with_capacity(20)` collapses that to one allocation ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)). The idiomatic buffer-reuse pattern for a hot loop (e.g. reading N registry manifests line by line):

```rust
// Allocates once per line.
for line in reader.lines() { process(&line?); }

// Reuses one buffer across the whole loop — perf-book's recommended pattern.
let mut line = String::new();
while reader.read_line(&mut line)? != 0 {
    process(&line);
    line.clear(); // keeps capacity, drops length to 0
}
```

**Allocator choice (mimalloc/jemalloc).** Swapping the global allocator requires no code changes beyond one `#[global_allocator]` static:

```rust
use mimalloc::MiMalloc;
#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;
```

mimalloc is "a general purpose, performance oriented allocator built by Microsoft"; its own benchmarks show its optional `secure` hardening mode (guard pages, randomized allocation, encrypted free lists) costs "around 10%" — implying the non-secure default is close to zero-tax vs. its own baseline, though no head-to-head number against glibc's allocator was found in the fetched docs ([mimalloc_rust README](https://github.com/purpleprotocol/mimalloc_rust)). Treat "mimalloc/jemalloc is X% faster than system malloc for CLI workloads" as something to **measure on your own allocation profile** (many small short-lived allocs vs few large ones) rather than assume — the perf-book only asserts *that* allocator choice can matter, not by how much for a given shape of workload ([perf-book heap-allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)).

### 3. Iterators vs loops

The perf-book's iterator guidance, all directly actionable:

- **Avoid `collect()` into a throwaway collection.** If the result is only iterated again, return `impl Iterator<Item=T>` instead of `Vec<T>` — skips an allocation entirely ([perf-book iterators](https://nnethercote.github.io/perf-book/iterators.html)).
- **Prefer `extend()` over `collect()` + `append()`** when adding iterator output to an existing collection — one fewer intermediate allocation.
- **Implement `size_hint`/`ExactSizeIterator::len` on custom iterators** — `collect`/`extend` use it to pre-size the target allocation, avoiding incremental growth.
- **Avoid `chain()` in hot paths** — "it can be slower than a single iterator" even though it reads cleanly; inline the two loops if profiling shows it's hot.
- **Prefer `filter_map` over `.filter().map()`** — one pass instead of two closures per element.
- **`slice::chunks_exact` over `slice::chunks`** when the chunk size divides evenly, or combine it with explicit remainder handling — avoids the length-check branch `chunks` pays per chunk.
- **`iter().copied()` over `iter()` for small `Copy` types** (integers, small enums) — lets LLVM generate by-value code instead of threading references through, which is friendlier to inlining and vectorization.

```rust
// Deoptimized: two passes, two closures, and an intermediate iterator object.
let tags: Vec<String> = manifests.iter()
    .filter(|m| m.is_release())
    .map(|m| m.tag.clone())
    .collect();

// Preferred: single pass.
let tags: Vec<String> = manifests.iter()
    .filter_map(|m| m.is_release().then(|| m.tag.clone()))
    .collect();
```

No general claim that "iterators always compile to the same code as loops" was found with a citation strong enough to assert flatly; the perf-book's guidance is narrower and more useful: specific combinators (`chain`, sequential `filter`+`map`) are named as *sometimes* slower, which is a weaker and more honest claim than "iterators vs loops" folklore — treat iterator/loop codegen equivalence as combinator-specific, not a blanket rule.

### 4. Data layout and hashing

**Field ordering is the compiler's job, not yours.** "The Rust compiler automatically sorts the fields in struct and enums to minimize their sizes (unless the `#[repr(C)]` attribute is specified)" ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)). Manual field reordering for size is a wasted diff outside of `#[repr(C)]`/FFI structs, where reordering *is* your responsibility because the compiler stops doing it.

**Enum size and boxing.** A single oversized variant inflates every instance of the enum to the size of its largest variant. Fix: box the fat payload.

```rust
// Every `A` is sizeof(LargeType) + tag, even for the common `A::X` case.
enum A { X, Y(i32), Z(i32, LargeType) }

// `A::Z` variant shrinks to one pointer; A::X/A::Y unaffected.
enum A { X, Y(i32), Z(Box<(i32, LargeType)>) }
```
This is "more likely to be a net performance win if the `A::Z` variant is relatively rare" — i.e. don't box a variant that's on the hot path just to shrink the type, measure the trade first ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)).

**The 128-byte cliff.** Types over 128 bytes get `memcpy`'d on move/copy instead of moved via registers/inline code; "shrinking these types to 128 bytes or less can make the code faster by avoiding `memcpy` calls" ([perf-book type-sizes](https://nnethercote.github.io/perf-book/type-sizes.html)). A `static_assertions::assert_eq_size!` (or `const _: () = assert!(...)` in modern editions) on hot types guards against silent regrowth.

**Hashers.** Default `HashMap`/`HashSet` use SipHash-1-3: "high quality," "high protection against collisions," but "relatively slow, particularly for short keys such as integers." `rustc-hash`'s `FxHashMap`/`FxHashSet` are drop-in replacements that are "low-quality but very fast, especially for integer keys," and were found to "out-perform all other hash algorithms within rustc" — reverting rustc *away* from FxHash back to default caused "slowdowns ranging from 4–84%" ([perf-book hashing](https://nnethercote.github.io/perf-book/hashing.html)). `ahash` is not automatically better: rustc's own attempted switch from FxHash to ahash caused "slowdowns of 1-4%" — **benchmark alternatives on your actual workload rather than picking the hasher with the best reputation.** `foldhash` is newer, explicitly speed-first, and self-describes as "minimally DoS-resistant" with a fast variant that "has known statistical imperfections" — its `FixedState` mode is explicitly documented as "trivially vulnerable to HashDoS attacks" ([foldhash docs](https://docs.rs/foldhash/latest/foldhash/)). For a package manager keying maps by internal package IDs/hashes (not attacker-supplied network input), FxHash/foldhash are safe; for maps keyed directly by untrusted registry-response strings, keep SipHash or a randomized-seed hasher unless you've reasoned explicitly about the DoS surface.

```toml
# Fast, non-DoS-resistant — fine for internal, non-adversarial keys.
rustc-hash = "2"
```
```rust
use rustc_hash::FxHashMap;
let mut by_digest: FxHashMap<Digest, ManifestEntry> = FxHashMap::default();
```

No `BTreeMap` vs `HashMap` numeric comparison was found in the fetched sources — the standing rule of thumb (BTreeMap for ordered iteration / range queries, HashMap otherwise, with BTreeMap paying O(log n) instead of O(1) per operation) is stdlib-documented behavior, not something requiring a benchmark citation here.

### 5. Generics, monomorphisation, and compile-time cost

Every generic function instantiation is a separate copy of machine code — "generic functions... can be instantiated dozens or even hundreds of times in large programs," which bloats both compile time and instruction-cache footprint at runtime ([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)). The mitigation pattern ("outline the cold/generic path"):

```rust
// Every call site gets a full copy of parse_and_validate<T>'s body.
fn parse_and_validate<T: DeserializeOwned>(bytes: &[u8]) -> Result<T> {
    let value: T = serde_json::from_slice(bytes)?;
    validate_schema(&value)?;   // large, non-generic logic duplicated per T
    Ok(value)
}

// Non-generic body extracted into one shared function; only the thin
// generic shim gets duplicated per T.
fn parse_and_validate<T: DeserializeOwned>(bytes: &[u8]) -> Result<T> {
    let value: serde_json::Value = parse_and_validate_inner(bytes)?;
    serde_json::from_value(value).map_err(Into::into)
}
fn parse_and_validate_inner(bytes: &[u8]) -> Result<serde_json::Value> {
    let value: serde_json::Value = serde_json::from_slice(bytes)?;
    validate_schema(&value)?;
    Ok(value)
}
```
`cargo llvm-lines` ranks functions by generated LLVM IR to find the worst offenders in an existing codebase ([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)).

`dyn Trait` trades this away: one shared vtable-dispatched implementation instead of N monomorphized copies — smaller binary and faster compile, at the cost of an indirect call and no per-type inlining. For a CLI with a handful of registry-backend implementations (ghcr.io vs others) behind a trait, `dyn` is very likely the right default; reserve generics for genuinely hot, small, inlinable functions.

### 6. I/O performance

**Buffering is not automatic.** "Rust file I/O is unbuffered by default" — every `read`/`write` call on a raw `File` is a syscall. `BufReader`/`BufWriter` batch reads/writes through an in-memory buffer, "minimizing the number of system calls required" ([perf-book io](https://nnethercote.github.io/perf-book/io.html)). Note the API split: unbuffered readers implement `Read`; buffered readers implement `BufRead` and need different call patterns (`read_line`, `lines()`) — swapping in a `BufReader` is not always a drop-in type change.

**Locking `stdout`/`stdin` once.** `print!`/`println!` lock stdout on *every call*. In a loop, take the lock once and reuse it:

```rust
// Locks + flushes stdout on every iteration.
for tag in tags { println!("{tag}"); }

// One lock for the whole loop; combine with BufWriter for many writes.
let stdout = std::io::stdout();
let mut out = std::io::BufWriter::new(stdout.lock());
for tag in &tags { writeln!(out, "{tag}")?; }
out.flush()?; // explicit flush surfaces I/O errors instead of swallowing them on drop
```
([perf-book io](https://nnethercote.github.io/perf-book/io.html))

**UTF-8 validation overhead.** `String`/`str` pay a UTF-8 validation cost on construction from bytes; for byte-oriented or ASCII-only parsing (e.g. scanning a manifest for a delimiter) `BufRead::read_until` on raw bytes avoids it ([perf-book io](https://nnethercote.github.io/perf-book/io.html)).

**Memory-mapped files.** `mmap` (via `memmap2`) is `unsafe` to construct precisely because the OS-level mapping and Rust's aliasing/lifetime model don't agree: if the backing file is truncated or modified by another process while mapped, that's undefined behavior from Rust's point of view — the crate's API "delegates responsibility to users to ensure file stability during mapping operations" ([memmap2 docs](https://docs.rs/memmap2/latest/memmap2/)). For a package manager reading OCI blobs it downloaded itself and controls exclusively (temp files, not shared), mmap is a reasonable win for large-file reads (avoids the read-into-buffer copy); for anything another process might touch concurrently (a shared cache directory another `grim`/`ocx` invocation is also writing), it's a correctness hazard, not just a perf lever.

**Parallel filesystem walking.** `ignore::WalkBuilder` (ripgrep's crate) is "a fast recursive directory iterator that respects various filters such as globs, file types and `.gitignore` files" and is the crate ripgrep itself uses for its walk ([ignore docs](https://docs.rs/crate/ignore/latest)). `jwalk` takes a different angle: it "combine[s] the parallelism of `ignore` with `walkdir`'s streaming iterator API," parallelizing via rayon while still streaming sorted results ([jwalk docs](https://docs.rs/jwalk/latest/jwalk/)). Choose `ignore` when you need gitignore-aware filtering (scanning a project tree for config files to package); choose `jwalk` when you need raw parallel throughput over a large flat cache/store directory and don't need ignore-file semantics.

**Bounded concurrent network fetch.** For "download N objects from a registry without melting the server," bound concurrency explicitly rather than firing all requests via `join_all`:

```rust
use futures::stream::{self, StreamExt};

let results: Vec<_> = stream::iter(blob_digests)
    .map(|digest| fetch_blob(client.clone(), digest))
    .buffer_unordered(8) // at most 8 in-flight GETs
    .collect()
    .await;
```
`buffer_unordered(n)` guarantees "no more than `n` futures will be buffered at any point in time" ([futures docs](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)). The `tokio::sync::Semaphore` pattern is equivalent and preferred when the concurrent work is spawned as separate tasks rather than driven as one stream (permits are fairly queued and released automatically on drop) ([tokio Semaphore docs](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html)).

### 7. Hashing and compression throughput

**Content hashing.** BLAKE3 is "much faster than MD5, SHA-1, SHA-2, SHA-3, and BLAKE2," and its reference CLI `b3sum` is described as "an order of magnitude faster... than `sha256sum`" on typical desktop hardware ([BLAKE3 README](https://github.com/BLAKE3-team/BLAKE3)). Use it for any internal content-addressing/dedup hash that doesn't have to match an external OCI digest format. Where the digest *must* be SHA-256 (OCI manifest/layer digests are specified as SHA-256), the `sha2` crate auto-detects and uses hardware acceleration at runtime — x86 SHA-NI, AArch64 SHA-2 extension, RISC-V Zknh, with automatic fallback to a portable software implementation when the CPU lacks the extension, so no build-time feature flag is required for the common case ([sha2 docs](https://docs.rs/sha2/latest/sha2/)). The `soft` and `riscv-zknh` backends unroll their round loops for speed at the cost of larger generated code; a `sha2_backend` config flag lets you force loop compaction if binary size matters more than raw throughput.

**Gzip/deflate.** `flate2` supports pluggable backends via Cargo features: the default `miniz_oxide` (pure Rust, no C toolchain needed), C-based `zlib`/`zlib-ng`/Cloudflare's zlib, and the newer `zlib-rs` (pure-Rust rewrite, some unsafe, no C compiler required). The crate's own docs state "`zlib-rs` typically outperforms all the C implementations" including zlib-ng, and flags it as the likely future default — prefer it explicitly today rather than waiting ([flate2 docs](https://docs.rs/flate2/latest/flate2/)). Cargo features are additive and resolve by priority (zlib-ng > zlib-rs > cloudflare_zlib > miniz_oxide when multiple are enabled) — pick exactly one explicitly in `Cargo.toml` to avoid ending up on a backend you didn't intend.

```toml
[dependencies]
flate2 = { version = "1", default-features = false, features = ["zlib-rs"] }
```

No zstd-specific numeric benchmark was found in the fetched sources — treat "zstd is faster than gzip at a given ratio" as needing its own measurement against your actual blob-size distribution before being asserted as a rule.

### 8. Compile-time performance

- `cargo build --timings` renders an HTML Gantt chart of per-crate compile time and parallelism, useful for spotting "large crates that serialize compilation [and] should be broken up" — directly relevant to the stated pain point of "nearly everything in ONE crate" ([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)).
- Nightly `-Zmacro-stats` (`cargo +nightly rustc -- -Zmacro-stats` or `RUSTFLAGS="-Zmacro-stats" cargo +nightly build`) flags macros generating code comparable in size to hand-written code — candidates for removal or a lighter-weight replacement ([perf-book compile-times](https://nnethercote.github.io/perf-book/compile-times.html)).
- `cargo llvm-lines` ranks functions by generated LLVM IR volume — the primary tool for finding generic-bloat hotspots (see §5).
- Dev-build debuginfo cuts significantly into iteration speed: disabling it ("as much as 20-40%" faster dev builds) or switching to `debug = "line-tables-only"` (keeps backtraces, drops the rest) is the standard `[profile.dev]` lever ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)).
- **Linker choice has zero downside.** lld is the Linux/Windows default since Rust 1.90; mold is measured 3.6–4x faster than lld on large C++ link jobs (MySQL, Clang, Chromium) and "is only 2x slower than the `cp` command on the same machine" — i.e. link time approaches a pure file-copy cost ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html), [mold README](https://github.com/rui314/mold)). For a workspace with a monolithic crate and frequent incremental rebuilds, this is one of the highest ROI-per-line-changed levers available.
- Release-profile levers, in order of typical payoff: `lto = "thin"` or `"fat"` (10–20%+ runtime win, longer release builds), `codegen-units = 1` (further runtime win, further compile-time cost), `panic = "abort"` (smaller binary, small runtime win, forfeits unwinding — check this doesn't break a caller expecting `catch_unwind`) ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)).

```toml
[profile.release]
lto = "thin"
codegen-units = 1
panic = "abort"   # only if nothing in the workspace relies on unwinding
```

### 9. Benchmarking and profiling tools

| Tool | Measures | Best for |
|---|---|---|
| `criterion` | wall-clock time, statistical significance | library/function-level microbenchmarks with confidence intervals ([criterion docs](https://bheisler.github.io/criterion.rs/book/getting_started.html)) |
| `divan` | wall-clock time | quick microbenchmarks, minimal boilerplate, CI smoke-check via `--test` ([divan README](https://github.com/nvzqz/divan)) |
| `iai-callgrind` / Gungraun | instruction counts, estimated cycles (Valgrind) | noise-free regression detection in CI/VMs; **not** a wall-clock substitute ([Gungraun README](https://github.com/iai-callgrind/iai-callgrind)) |
| `hyperfine` | wall-clock, whole-process | end-to-end CLI invocation timing, cross-tool comparison ([hyperfine README](https://github.com/sharkdp/hyperfine)) |
| `cargo flamegraph` | sampled call-stack profile | finding *where* time goes; Linux needs `perf` + `--no-rosegment` linker flag when using lld/mold ([flamegraph-rs README](https://github.com/flamegraph-rs/flamegraph)) |
| `dhat-rs` | heap allocation count/size/lifetime + call sites | finding *what allocates* and how often, via a global-allocator wrapper ([dhat docs](https://docs.rs/dhat/latest/dhat/)) |

**PGO.** rustc/cargo support 4-step profile-guided optimization (`-Cprofile-generate` → run representative workloads → `llvm-profdata merge` → `-Cprofile-use`), requires `rustup component add llvm-tools-preview`, must use identical flags across the generate/use compiles, and Cargo needs `--target` set explicitly so build-script `.profraw` files don't pollute the profile ([rustc PGO guide](https://doc.rust-lang.org/rustc/profile-guided-optimization.html)). No numeric gain was found in the fetched official guide itself — PGO's payoff is workload-shape-dependent and must be measured against your own representative traces, not assumed from a generic percentage. (No live source with rustc/ripgrep-specific PGO+BOLT numbers was reachable during this research pass — the previously known BurntSushi write-up returned 404; treat any specific PGO/BOLT percentage claim as unverified until re-sourced.)

**Flamegraph mechanics for a CLI**: samples "multiple times per second" recording instruction pointer + call chain; x-axis is *not* time, only sample ordering — box width is proportional to total time on CPU, not wall-clock position ([flamegraph-rs README](https://github.com/flamegraph-rs/flamegraph)). On Linux with lld (default since Rust 1.90) or mold, you must add `-Clink-arg=-Wl,--no-rosegment` to rustflags or `perf` cannot unwind stacks correctly.

### 10. Startup latency for CLIs

No primary source specific to Rust CLI/tokio-runtime startup latency numbers was successfully fetched in this pass (search budget was exhausted early and no stable, fetchable primary doc with concrete millisecond figures was found for this subtopic). What can be stated from adjacent, verified sources:

- Faster linking (mold/lld) reduces *build* latency, not runtime startup latency — don't conflate the two when explaining "why does `grim` feel slow to launch."
- `panic = "abort"` and smaller binaries (via `opt-level = "z"`/`"s"`, `lto`) reduce the amount of code the dynamic loader/relocator processes at process start, which is a plausible but *unmeasured-here* contributor to startup time ([perf-book build-configuration](https://nnethercote.github.io/perf-book/build-configuration.html)).
- Deferred/lazy statics (`std::sync::OnceLock`, `std::sync::LazyLock` since Rust 1.80) avoid paying initialization cost for config/regex/lookup tables that a given invocation may never touch — this is standard practice but no numeric CLI-startup comparison was sourced here.

**This subsection should be treated as thin** relative to the rest of the file — flag it for a follow-up research pass specifically targeting `hyperfine`-measured startup deltas (dynamic vs static linking, tokio multi-thread vs current-thread runtime creation cost, number of `OnceLock`s touched at startup) before it is used to justify a specific normative threshold.

## Normative guidance candidates

1. **No optimization PR without an attached before/after benchmark number.** *Rationale*: perf-book explicitly frames optimization as profile-driven, not intuition-driven. *Verify*: PR description or commit message contains a `criterion`/`divan`/`hyperfine` output snippet or a link to one; reviewer heuristic — reject "should be faster" claims without a number.
2. **Every micro-benchmark that could be dead-code-eliminated wraps its hot value in `std::hint::black_box`.** *Rationale*: an un-black-boxed benchmark can silently measure nothing. *Verify*: grep `benches/` for `criterion::Criterion` or `#[divan::bench]` usage without `black_box`/`divan::black_box` nearby — flag for review.
3. **CLI-level timing claims use `hyperfine` with `--warmup` set, never a single `time` invocation.** *Rationale*: single-shot timing is dominated by cold-cache and shell-spawn noise. *Verify*: reading heuristic on any perf claim in a PR/issue — is there a hyperfine table, or one `time` run?
4. **Default hasher for internal (non-adversarial-key) `HashMap`/`HashSet` is `rustc_hash::FxHashMap`/`FxHashSet`, not the std default, unless keys come directly from untrusted network input.** *Rationale*: measured rustc slowdowns of 4–84% reverting away from FxHash; default SipHash is a deliberate DoS-resistance trade-off you should make consciously, not by default. *Verify*: `grep -rn "std::collections::HashMap" src/ | grep -v FxHashMap` in hot paths; a lint via `rustc_hash` re-export at the crate root prevents accidental default-hasher usage (perf-book's own advice: "Use Clippy to prevent accidentally mixing hasher types").
5. **Buffer all file/stdout I/O — no raw `File`/unlocked `println!` in a loop.** *Rationale*: unbuffered I/O syscalls per line; `println!` re-locks stdout every call. *Verify*: grep for `println!`/`write!` inside `for`/`while` loop bodies; grep for `File::open`/`File::create` followed by `.read_to_string`/`.write_all` in a loop without a `BufReader`/`BufWriter` wrapper.
6. **Any collection built by repeated `push`/`insert` in a loop over a known or size-hinted source uses `with_capacity`/`reserve`.** *Rationale*: avoids the doubling-growth reallocation cascade. *Verify*: grep for `Vec::new()`/`HashMap::new()` immediately followed by a `for`/`while` loop containing `.push(`/`.insert(` in the same function, with an iterator/slice of known length available.
7. **Struct/enum field order is never hand-tuned in application code without `#[repr(C)]`.** *Rationale*: the compiler already does this; manual reordering is wasted effort and a maintenance trap when someone assumes the order is load-bearing. *Verify*: reading heuristic — a comment claiming "fields ordered for size" on a non-`repr(C)` type is a smell, not a feature.
8. **Enum variants larger than ~128 bytes (or noticeably larger than sibling variants) get boxed unless proven hot.** *Rationale*: 128B is documented as the `memcpy` cliff; boxing shrinks the common-case move cost. *Verify*: `static_assertions::assert_eq_size!` (or a `const _: () = assert!(size_of::<T>() <= N);`) on hot enum types in CI; a clippy `large_enum_variant` warning should not be silenced without justification.
9. **Generic functions with a non-trivial body get their non-generic logic extracted into a separate `fn` before merging.** *Rationale*: avoids per-instantiation code duplication (compile time + icache). *Verify*: run `cargo llvm-lines --release | head -30` periodically; a generic function appearing with a high "Lines" × "Copies" product is the trigger to refactor.
10. **Fan-out network calls (registry blob fetches) always go through a bounded-concurrency primitive (`buffer_unordered(n)` or `Semaphore::new(n)`), never a raw `join_all`/`FuturesUnordered` with unlimited fan-out.** *Rationale*: an OCI registry (ghcr.io) can rate-limit or reset connections under unbounded concurrency; bounding is the standard "don't melt the server" idiom. *Verify*: grep for `futures::future::join_all` / bare `FuturesUnordered` around HTTP client calls; require an adjacent `Semaphore` or `buffer_unordered`/`buffered` call.
11. **`mmap` is only used on files the process exclusively owns for the mapping's lifetime (its own temp/download files), never on a shared cache path another process may write concurrently.** *Rationale*: concurrent external mutation of a mapped file is UB; `memmap2`'s `unsafe` boundary exists exactly for this reason. *Verify*: reading heuristic — trace every `Mmap::map` call site back to the file's open mode and confirm no other process/thread can write that path while the mapping is alive; prefer `File::open` + `BufReader` over `mmap` whenever the file lives in a shared, multi-writer directory.
12. **Content hashing for internal dedup/integrity (not OCI-spec digests) uses BLAKE3; SHA-256 is reserved for where the OCI spec mandates it.** *Rationale*: BLAKE3 is an order of magnitude faster than SHA-256 in its own benchmarks and there's no compatibility reason to pay the SHA-256 cost internally. *Verify*: grep for `Sha256::new()`/`sha2::Sha256` call sites and confirm each one is producing a digest that must match an OCI manifest/layer digest format — anything else should be `blake3::hash`.
13. **Release profile sets `lto`, `codegen-units = 1`, and a fast linker; this is checked into `Cargo.toml`/`.cargo/config.toml`, not left to per-developer defaults.** *Rationale*: 10–20%+ runtime win with zero source-code risk; linker choice is asserted to have "no downsides." *Verify*: `cat Cargo.toml` shows `[profile.release]` with `lto` set; `cat .cargo/config.toml` shows a `link-arg=-fuse-ld=` or confirms lld-is-default is being relied on deliberately (not accidentally).

## AI-agent angle

An autonomous coding agent writing Rust for this project characteristically gets these wrong, with a cheap mechanical check for each:

- **Hallucinated hasher import paths.** Agents write `use rustc_hash::FxHashMap;` correctly often enough, but also invent `std::collections::FxHashMap` or `hashbrown::FxHashMap` (wrong crate) or forget `FxHashMap::default()` vs `FxHashMap::new()` (the type has no `new()` — only `default()` / `with_hasher`). *Check*: `cargo check` catches this immediately; a reviewer should still grep for `FxHashMap::new(` specifically since it's a plausible-looking but non-existent call.
- **Writing a micro-benchmark without `black_box` and believing the resulting number.** Very common failure mode — the agent writes plausible-looking `criterion`/`divan` code, the loop body gets constant-folded away because the input is a literal, and the agent reports a suspiciously fast (often near-zero) number as a real win. *Check*: any benchmark result claiming a >90% or "instant" speedup on non-trivial work is a signal to re-read the bench body for a missing `black_box` around the input.
- **Adding `SmallVec`/`ArrayVec`/`compact_str` reflexively to "optimize" every collection/string, including unbounded ones.** Agents pattern-match "small collection type == faster" without checking whether the collection is actually usually small — this adds branch overhead with no payoff, or (worse) picks `ArrayVec` with a fixed capacity that then panics/truncates on a real-world unbounded input (e.g. an actual dependency list exceeding the chosen `N`). *Check*: for every `ArrayVec<[T; N]>` introduced, confirm there's a real, enforced upper bound on that data (a schema max, not "usually small in practice") — otherwise reject in favor of `Vec`.
- **Introducing `unsafe { mmap }` for "fast file reading" on a path the tool doesn't exclusively own** (e.g. a shared cache directory another `grim`/`ocx` process, or a concurrent test run, may write). This compiles, looks idiomatic, and is a real UB hazard the agent has no way to reason about without being told the concurrency model. *Check*: any new `Mmap::map`/`memmap2::MmapMut` call site gets manually traced for concurrent-writer possibility — this is not clippy-catchable.
- **Unbounded `futures::future::join_all` over a registry-call iterator "for speed."** An agent optimizing "fetch these N blobs faster" reaches for maximum parallelism by default, not bounded parallelism — this looks like a speed win locally and becomes a production incident against a real rate-limited registry. *Check*: grep new `join_all`/bare `FuturesUnordered` usages touching an HTTP client; require justification or a `buffer_unordered`/`Semaphore` swap.
- **Claiming a specific numeric speedup ("this is 3x faster") without having run anything.** Agents fabricate plausible-sounding percentages in PR descriptions or code comments justifying a change. *Check*: treat any numeric performance claim in agent-authored text as unverified until a `hyperfine`/`criterion` output is attached; this is a process check, not a code check.
- **Using `#[repr(C)]` "for performance" on a plain internal struct.** Agents sometimes add `#[repr(C)]` believing it helps layout/perf, when it actually *disables* the compiler's automatic field-reordering optimization and only matters for FFI ABI stability. *Check*: grep for `#[repr(C)]` on types with no `extern "C"` boundary nearby — likely a mistaken addition.
- **Reaching for `Rc<RefCell<T>>` or `Arc<Mutex<T>>` as a default "shared state" pattern where a plain owned value or `&mut` borrow would do**, then separately worrying about the `.clone()` cost on that `Rc`/`Arc` without realizing the refcount bump was never the actual problem — the real cost is the interior-mutability borrow-check-at-runtime overhead and potential lock contention. *Check*: for every new `Rc<RefCell<_>>`/`Arc<Mutex<_>>`, ask whether ownership could instead flow via a plain `&mut` and a restructured call chain — a reading heuristic, not mechanical, but worth flagging in review.

## Contested / evolving

- **PGO/BOLT for shipped Rust CLI binaries**: the mechanism is documented and stable (`-Cprofile-generate`/`-Cprofile-use`, `llvm-profdata`), but no fetchable primary source in this pass carried concrete, current percentage gains for a Rust CLI specifically — a previously known write-up (BurntSushi's ripgrep PGO post) returned 404 during this research pass, meaning either the URL moved or the content was retired. Treat PGO adoption as "mechanically well-supported, numerically unverified for our workload" until re-measured directly.
- **`zlib-rs` as the flate2 default.** As of the fetched docs, `zlib-rs` is *not yet* the default backend (`miniz_oxide` still is) despite reportedly outperforming all C backends including zlib-ng — the crate's own docs flag this may change in a future release ([flate2 docs](https://docs.rs/flate2/latest/flate2/)). Pin the backend explicitly rather than relying on "whatever the default is" for reproducible throughput.
- **`ahash` vs `rustc-hash`/`foldhash`**: genuinely workload-dependent — rustc's own numbers show ahash *losing* to FxHash on their codebase, but ahash is tuned for AES-NI-bearing hardware and different key distributions could reverse this. The practice trend is toward foldhash as a newer, actively-promoted "fast default" candidate for `hashbrown`, but this is recent enough that it shouldn't be treated as settled consensus yet.
- **`iai-callgrind`'s rename to Gungraun**: the project itself appears to have rebranded (fetched README self-identifies as "Gungraun" while the GitHub org/repo path is still `iai-callgrind/iai-callgrind`) — expect crate-name/import-path churn; verify the current crates.io name before citing it in generated code rather than assuming `iai-callgrind` remains canonical.
- **Linker defaults are actively shifting**: lld became the Linux default only as of Rust 1.90 (a recent change relative to older guidance that told users to opt in manually) — any pre-1.90-era blog post recommending manual `-fuse-ld=lld` setup is now partially obsolete for Linux (though still correct for platforms/toolchains where it isn't default, and mold remains an explicit opt-in beyond lld).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nnethercote.github.io/perf-book/heap-allocations.html](https://nnethercote.github.io/perf-book/heap-allocations.html) | The Rust Performance Book, allocation chapter | living doc, 2026-current | Primary, authoritative, maintained by a former rustc perf lead; ground truth for clone/Cow/SmallVec/with_capacity guidance |
| [nnethercote.github.io/perf-book/iterators.html](https://nnethercote.github.io/perf-book/iterators.html) | Perf Book, iterators chapter | living doc | Primary source for collect/extend/chain/filter_map guidance |
| [nnethercote.github.io/perf-book/hashing.html](https://nnethercote.github.io/perf-book/hashing.html) | Perf Book, hashing chapter | living doc | Primary source with actual rustc-measured percentages for FxHash/ahash/default hasher swaps |
| [nnethercote.github.io/perf-book/type-sizes.html](https://nnethercote.github.io/perf-book/type-sizes.html) | Perf Book, type-sizes chapter | living doc | Primary source for field-ordering, enum boxing, 128-byte memcpy threshold |
| [nnethercote.github.io/perf-book/compile-times.html](https://nnethercote.github.io/perf-book/compile-times.html) | Perf Book, compile-times chapter | living doc | Primary source for cargo build --timings, -Zmacro-stats, cargo llvm-lines |
| [nnethercote.github.io/perf-book/build-configuration.html](https://nnethercote.github.io/perf-book/build-configuration.html) | Perf Book, build-configuration chapter | living doc | Primary source for opt-level/LTO/codegen-units/linker/panic=abort guidance and numbers |
| [nnethercote.github.io/perf-book/io.html](https://nnethercote.github.io/perf-book/io.html) | Perf Book, I/O chapter | living doc | Primary source for buffering and stdout-locking guidance |
| [nnethercote.github.io/perf-book/general-tips.html](https://nnethercote.github.io/perf-book/general-tips.html) | Perf Book, general tips | living doc | Primary source for measurement-first methodology framing |
| [doc.rust-lang.org/std/hint/fn.black_box.html](https://doc.rust-lang.org/std/hint/fn.black_box.html) | std library reference | stable std docs | Primary, canonical text on black_box guarantees/non-guarantees |
| [doc.rust-lang.org/rustc/profile-guided-optimization.html](https://doc.rust-lang.org/rustc/profile-guided-optimization.html) | rustc book, PGO chapter | stable rustc docs | Primary, exact CLI workflow for PGO with rustc/cargo |
| [bheisler.github.io/criterion.rs/book/getting_started.html](https://bheisler.github.io/criterion.rs/book/getting_started.html) | criterion.rs user book | maintained crate book | Primary source for criterion's statistical methodology and black_box usage pattern |
| [github.com/iai-callgrind/iai-callgrind](https://github.com/iai-callgrind/iai-callgrind) | Gungraun (formerly iai-callgrind) README | active crate, 2026 | Primary source; explicit statement that it measures instructions not wall-clock, and why that suits noisy CI |
| [github.com/nvzqz/divan](https://github.com/nvzqz/divan) | divan crate README | active crate | Primary source for divan's API style and CI `--test` mode |
| [github.com/sharkdp/hyperfine](https://github.com/sharkdp/hyperfine) | hyperfine README | active tool | Primary source for CLI benchmarking methodology, warm-up, shell-overhead correction |
| [github.com/flamegraph-rs/flamegraph](https://github.com/flamegraph-rs/flamegraph) | cargo-flamegraph README | active tool | Primary source for flamegraph mechanics and the lld/mold `--no-rosegment` requirement |
| [docs.rs/dhat/latest/dhat](https://docs.rs/dhat/latest/dhat/) | dhat-rs crate docs | active crate | Primary source for heap-allocation profiling setup |
| [docs.rs/compact_str/latest/compact_str](https://docs.rs/compact_str/latest/compact_str/) | compact_str crate docs | active crate | Primary source for the 24-byte inline string threshold |
| [docs.rs/bumpalo/latest/bumpalo](https://docs.rs/bumpalo/latest/bumpalo/) | bumpalo crate docs | active crate | Primary source for arena-allocation semantics and Drop caveat |
| [docs.rs/foldhash/latest/foldhash](https://docs.rs/foldhash/latest/foldhash/) | foldhash crate docs | active crate | Primary source for the newer fast-hasher's DoS-resistance trade-off |
| [github.com/purpleprotocol/mimalloc_rust](https://github.com/purpleprotocol/mimalloc_rust) | mimalloc Rust bindings README | active crate | Primary source for global-allocator swap mechanics |
| [github.com/BLAKE3-team/BLAKE3](https://github.com/BLAKE3-team/BLAKE3) | BLAKE3 reference implementation README | active project | Primary source for BLAKE3 vs SHA-2/SHA-3/MD5 speed claims |
| [docs.rs/sha2/latest/sha2](https://docs.rs/sha2/latest/sha2/) | sha2 crate docs | active crate | Primary source for hardware-acceleration backend list and runtime detection |
| [docs.rs/flate2/latest/flate2](https://docs.rs/flate2/latest/flate2/) | flate2 crate docs | active crate | Primary source for miniz_oxide/zlib-ng/zlib-rs backend comparison |
| [docs.rs/crate/ignore/latest](https://docs.rs/crate/ignore/latest) | ignore crate docs | active crate | Primary source, ripgrep's own parallel/gitignore-aware walker |
| [docs.rs/jwalk/latest/jwalk](https://docs.rs/jwalk/latest/jwalk/) | jwalk crate docs | active crate | Primary source for rayon-parallel streaming directory walk |
| [docs.rs/memmap2/latest/memmap2](https://docs.rs/memmap2/latest/memmap2/) | memmap2 crate docs | active crate | Primary source for mmap's unsafe boundary and concurrent-modification hazard |
| [docs.rs/futures/latest/.../buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered) | futures crate docs | stable API | Primary source for bounded-concurrency stream combinator |
| [docs.rs/tokio/latest/.../Semaphore.html](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html) | tokio crate docs | stable API | Primary source for bounded-concurrency task-spawn pattern |
| [github.com/rui314/mold](https://github.com/rui314/mold) | mold linker README | active project | Primary source for measured lld-vs-mold link-time numbers |

