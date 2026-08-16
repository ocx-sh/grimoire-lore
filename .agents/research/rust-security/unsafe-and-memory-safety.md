---
title: Unsafe Rust, UB, FFI and Verification Tooling
topic: unsafe, UB, FFI and verification tooling
agent: rust-unsafe-researcher
model: sonnet
date_researched: "2026-08"
sources_count: 18
scope: |
  Covers unsafe-Rust hygiene (SAFETY comments, lint policy, edition-2024 changes),
  the aliasing model (Stacked/Tree Borrows), common UB patterns in safe-looking code,
  verification tooling (Miri, sanitizers, cargo-careful, Kani), FFI/ABI soundness
  (repr(C), cbindgen, catch_unwind), and dependency-unsafe auditing with real advisories.
  Does NOT cover: async-specific UB (pinning is mentioned only briefly), WASM-specific
  unsafe concerns, or a full formal-methods tutorial for Creusot/Prusti/Verus.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [When unsafe is legitimate, and the SAFETY-comment convention](#1-when-unsafe-is-legitimate-and-the-safety-comment-convention)
   2. [`unsafe_code` lint policy and `#![forbid(unsafe_code)]`](#2-unsafe_code-lint-policy-and-forbidunsafe_code)
   3. [`unsafe_op_in_unsafe_fn` — default since edition 2024](#3-unsafe_op_in_unsafe_fn--default-since-edition-2024)
   4. [The aliasing model: Stacked Borrows → Tree Borrows](#4-the-aliasing-model-stacked-borrows--tree-borrows)
   5. [Provenance and strict_provenance APIs](#5-provenance-and-strict_provenance-apis)
   6. [`mem::transmute` — the last resort](#6-memtransmute--the-last-resort)
   7. [Uninitialized memory and `MaybeUninit`](#7-uninitialized-memory-and-maybeuninit)
   8. [`from_raw_parts` misuse](#8-from_raw_parts-misuse)
   9. [`&mut` aliasing (mutability XOR aliasing)](#9-mut-aliasing-mutability-xor-aliasing)
   10. [Unsound `Send`/`Sync` impls](#10-unsound-sendsync-impls)
   11. [`static mut` — deprecated-in-practice since edition 2024](#11-static-mut--deprecated-in-practice-since-edition-2024)
   12. [`Pin` violations](#12-pin-violations)
   13. [Panics across FFI boundaries and `catch_unwind`](#13-panics-across-ffi-boundaries-and-catch_unwind)
   14. [Verification tooling: Miri](#14-verification-tooling-miri)
   15. [Sanitizers (ASan/TSan/MSan) and `cargo-careful`](#15-sanitizers-asantsanmsan-and-cargo-careful)
   16. [Kani, and formal-proof tools (Creusot/Prusti/Verus)](#16-kani-and-formal-proof-tools-creusotprustiverus)
   17. [FFI safety: `extern "C"`, ABI, `repr(C)`, cbindgen, bindgen](#17-ffi-safety-extern-c-abi-reprc-cbindgen-bindgen)
   18. [Auditing dependencies for unsafe: cargo-geiger and the reality](#18-auditing-dependencies-for-unsafe-cargo-geiger-and-the-reality)
   19. [Real CVEs/soundness bugs and what rule would have caught them](#19-real-cvessoundness-bugs-and-what-rule-would-have-caught-them)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The grimoire-lore/ocx codebase is a package manager over OCI registries doing tarball extraction, subprocess execution, and credential handling — it should have **zero** unsafe code in ordinary business logic; unsafe is only defensible at narrow, isolated FFI or raw-pointer boundaries, if any exist at all.
- Put `#![forbid(unsafe_code)]` at the crate root of every crate that has no FFI/perf reason to use `unsafe`; `forbid` (not `deny`) blocks even `#[allow(unsafe_code)]` overrides downstream ([Rust reference, lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)).
- Every `unsafe { }` block that does exist must carry an immediately-preceding `// SAFETY: …` comment stating *why* the invariants hold, enforced by `clippy::undocumented_unsafe_blocks`, and every `unsafe fn` needs a `# Safety` doc section, enforced by `clippy::missing_safety_doc` ([Clippy lint source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/undocumented_unsafe_blocks.rs)).
- As of edition 2024 (stabilized Rust 1.85, Feb 2025), `unsafe_op_in_unsafe_fn` is warn-by-default: an `unsafe fn` body no longer implicitly authorizes unsafe operations — every unsafe operation still needs its own `unsafe { }` block, even inside an `unsafe fn` ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html)).
- As of edition 2024, taking any reference (`&` or `&mut`) to a `static mut` is instantaneous UB and the `static_mut_refs` lint is deny-by-default; replace `static mut` with `AtomicT`, `Mutex`/`RwLock`, `OnceLock`/`LazyLock`, or `&raw mut`/`&raw const` raw-pointer access ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html)).
- As of edition 2024, `std::env::set_var` and `std::env::remove_var` are `unsafe fn` because mutating the process environment races with other threads reading it (same root cause as CVE-2020-26235 in the `time` crate) — any code calling these in this codebase across `cargo fix --edition` migration needs a `# Safety`-justified `unsafe` block, and ideally should avoid them entirely in favor of passing config explicitly ([PR #124636](https://github.com/rust-lang/rust/pull/124636), [RUSTSEC-2020-0071](https://rustsec.org/advisories/RUSTSEC-2020-0071)).
- `mem::transmute` is "the absolute last resort" — for the byte/pointer conversions this codebase actually needs (digest bytes, tarball headers), use `u32::from_ne_bytes`/`to_le_bytes`, `as` pointer casts, or `ptr::addr()`, never `transmute` ([`mem::transmute` docs](https://doc.rust-lang.org/std/mem/fn.transmute.html)).
- `mem::uninitialized()` is deprecated and unsound for any type with validity invariants (references, `bool`, enums); use `MaybeUninit<T>` and never call `.assume_init()` before every byte-relevant field is actually written, and never take `&`/`&mut` into an uninitialized `MaybeUninit` — use `&raw const`/`&raw mut` on the pointer instead ([`MaybeUninit` docs](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html)).
- Miri (`cargo +nightly miri test`) catches out-of-bounds/use-after-free, uninitialized-read, misalignment, invalid-enum-discriminant, aliasing-model violations (Stacked/Tree Borrows), and data races; it does **not** run real FFI/syscalls and only proves the absence of UB on the paths it actually executed on that run — it is a dynamic checker, not a proof ([Miri repo](https://github.com/rust-lang/miri), [Miri POPL'26 paper](https://research.ralfj.de/papers/2026-popl-miri.pdf)).
- Tree Borrows (PLDI 2025 Distinguished Paper) is Miri's newer, less-strict aliasing model — it rejects 54% fewer real-world crates than Stacked Borrows while remaining unsound-detecting; it is not yet the Miri default in all configurations, so run Miri under `-Zmiri-tree-borrows` if your unsafe code triggers Stacked-Borrows false rejections legitimate under the newer model ([ralfj.de blog](https://www.ralfj.de/blog/2023/06/02/tree-borrows.html), [PLDI 2025](https://pldi25.sigplan.org/details/pldi-2025-papers/42/Tree-Borrows)).
- `cargo-careful` (nightly) builds std with debug assertions and adds runtime checks for pointer alignment/non-null/non-overlap on `copy`/`copy_nonoverlapping`/`write_bytes` and validity checks on `NonNull`/`NonZero*::new_unchecked` — cheap enough to run in CI alongside `cargo test` on a nightly job ([crates.io](https://crates.io/crates/cargo-careful/0.3.0)).
- Kani is a bounded model checker (compiles MIR to CBMC) that gives *proof*, not just test coverage, for panic-freedom and memory-safety properties of specific functions via `#[kani::proof]` harnesses; realistic to apply to a handful of hot, security-critical parsing/verification functions (e.g. digest/manifest parsing), not the whole codebase ([Kani repo](https://github.com/model-checking/kani)).
- Any `unsafe impl Send`/`unsafe impl Sync` is a project-wide correctness claim, not a local one — grep for `unsafe impl (Send|Sync)` in review and demand a SAFETY comment that names the actual synchronization mechanism (e.g. "all mutation happens under the caller-held Mutex"), because an incorrect impl is silent until the type crosses a thread boundary under load ([Rustonomicon Send/Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)).
- `#[repr(C)]` alone does not make a type FFI-sound: field-less Rust enums (`repr(C)` or otherwise) are UB if the value doesn't match a declared discriminant, so never `transmute`/reinterpret raw C ints into a Rust enum without validating first ([Rust reference: type layout](https://doc.rust-lang.org/reference/type-layout.html#the-c-repr)).
- Unwinding a Rust panic across an `extern "C"` boundary is UB (pre `C-unwind`); any Rust function this codebase exposes to be called from C, or as a subprocess/plugin callback, must wrap its body in `catch_unwind` and convert the panic to an error code, or be compiled with `panic = "abort"` for that boundary ([`catch_unwind` docs](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html)).
- `cargo-geiger` quantifies `unsafe` usage across the full dependency tree, including a fast `--forbid-only` mode that just checks who declares `#![forbid(unsafe_code)]` without invoking rustc — worth running once in CI as a diff gate on `cargo geiger` output so a new transitive dependency pulling in unsafe doesn't silently land ([cargo-geiger README](https://github.com/geiger-rs/cargo-geiger)).
- Two real RustSec soundness advisories map directly onto rules above: `smallvec` < 0.6.13 used `mem::uninitialized()` on user-supplied `T` (unsound for reference types) ([RUSTSEC-2018-0018](https://raw.githubusercontent.com/rustsec/advisory-db/main/crates/smallvec/RUSTSEC-2018-0018.md)); `smallvec` < 0.6.14/1.6.1 had a buffer-overflow in `insert_many` from an under-sized `grow()` allocation ([RUSTSEC-2021-0003](https://rustsec.org/advisories/RUSTSEC-2021-0003.html)) — both are exactly the class of bug Miri's uninitialized-read and out-of-bounds checks catch.

## Findings

### 1. When unsafe is legitimate, and the SAFETY-comment convention

Unsafe is legitimate only to implement a primitive that safe Rust cannot express, and only when the unsafety is immediately wrapped behind a safe API whose own preconditions the type/function enforces in safe code. The Rustonomicon frames unsafe as unlocking five specific "superpowers" — dereferencing raw pointers, calling unsafe functions, implementing unsafe traits, mutating statics, and accessing union fields — and nothing else becomes magically fine just because it's inside an `unsafe` block; the surrounding safe-Rust rules (aliasing, no data races, valid values) still apply and violating them is still UB ([Rustonomicon intro](https://doc.rust-lang.org/nomicon/intro.html)).

Every `unsafe { }` block must be preceded by a `// SAFETY: …` comment that states which invariant makes the operation sound *at this call site* — not what the code does (that's what the code is for) but why it's safe. Example:

```rust
// SAFETY: `idx < self.len` was just checked above, and `self.buf`
// is a `Vec` we allocated with capacity >= self.len, so this index
// is in-bounds and the element is initialized.
let v = unsafe { self.buf.get_unchecked(idx) };
```

Clippy's `undocumented_unsafe_blocks` lint (stable since Clippy 1.58, part of `clippy::pedantic`... actually promoted to warn-by-default in recent Clippy) enforces the comment must immediately precede the block ([lint source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/undocumented_unsafe_blocks.rs)). Separately, `missing_safety_doc` requires a `# Safety` section in the `///` doc comment of any public `unsafe fn`, stating the preconditions the *caller* must uphold.

### 2. `unsafe_code` lint policy and `#![forbid(unsafe_code)]`

`unsafe_code` is an allow-by-default rustc lint; setting `#![forbid(unsafe_code)]` at a crate root makes any `unsafe` block, fn, trait impl, or attribute-based `#[allow(unsafe_code)]` override a hard compile error, because `forbid` cannot be downgraded by a later `#[allow]` in the same crate — `deny` can be locally overridden, `forbid` cannot ([lint levels reference](https://doc.rust-lang.org/rustc/lints/levels.html)). For a multi-crate workspace like ocx/grim, put this in every crate's `lib.rs`/`main.rs` except the (ideally single, isolated) crate that actually needs raw filesystem/tarball-extraction unsafety, if any is needed at all — most of what this project does (HTTP, OCI manifests, tarfile extraction, credential storage) has fully safe crates already (`tar`, `flate2`, `reqwest`, `zip`) and needs no unsafe.

### 3. `unsafe_op_in_unsafe_fn` — default since edition 2024

Before this lint, an `unsafe fn` body implicitly behaved as if wrapped in `unsafe { }`, so a reviewer scanning for `unsafe {` blocks inside an `unsafe fn` could miss operations that were actually unsafe. Since edition 2024 (Rust 1.85, Feb 2025) the lint is warn-by-default, splitting the two meanings of the `unsafe` keyword: declaring a function unsafe (caller obligation) vs. authorizing unsafe operations inside it (still needs its own block) ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html)).

```rust
// pre-2024 idiom (still compiles, now warns)
unsafe fn get_unchecked<T>(x: &[T], i: usize) -> &T {
    x.get_unchecked(i)          // implicit unsafe authorization — now WARN
}

// edition-2024-correct
unsafe fn get_unchecked<T>(x: &[T], i: usize) -> &T {
    unsafe { x.get_unchecked(i) }   // SAFETY: caller guarantees i < x.len()
}
```

Migrate mechanically with `cargo fix --edition`, or `#![warn(unsafe_op_in_unsafe_fn)]` on pre-2024 editions to opt in early ([RFC 2585](https://rust-lang.github.io/rfcs/2585-unsafe-block-in-unsafe-fn.html)).

### 4. The aliasing model: Stacked Borrows → Tree Borrows

Rust's memory model is not fully specified by the reference; the two operational aliasing models that Miri implements to *detect* aliasing UB are Stacked Borrows (original) and Tree Borrows (2023, PLDI 2025). Both formalize "a `&mut T` grants exclusive access for its lifetime; a `&T` grants shared read-only access; violate this through a raw pointer or an outside reference derived from the wrong parent and it's UB," but Tree Borrows relaxes several patterns Stacked Borrows over-rejected (e.g. certain reborrow-then-read-through-parent patterns common in linked structures and via raw pointers), rejecting 54% fewer of the top 30,000 crates in evaluation while catching the same real bugs ([ralfj.de: From Stacks to Trees](https://www.ralfj.de/blog/2023/06/02/tree-borrows.html), [PLDI 2025 paper page](https://pldi25.sigplan.org/details/pldi-2025-papers/42/Tree-Borrows)). Neither model is proven sound yet, but both are actively used as Miri's UB oracle — run Miri under both if your unsafe code is aliasing-heavy (`-Zmiri-tree-borrows` switches the model). Practical rule: if Miri under Stacked Borrows rejects code you believe is sound, re-check under Tree Borrows before assuming a false positive — but a Tree-Borrows pass is not proof of soundness either, just weaker counter-evidence of unsoundness.

### 5. Provenance and strict_provenance APIs

Every pointer carries "provenance" — which allocation it's actually allowed to access — invisible in the bit pattern. Casting a pointer to `usize` and back loses that information, which is both unspecified behavior in today's model and blocks tools like Miri/CHERI from reasoning about the code. The strict-provenance APIs on `*const T`/`*mut T` make this explicit: `.addr()` extracts the numeric address only (promising no roundtrip), `.with_addr(addr)` builds a new pointer at that address but reusing `self`'s provenance, and `.map_addr(f)` composes the two for e.g. pointer tagging ([`std::ptr` docs](https://doc.rust-lang.org/std/ptr/index.html)). If a numeric address truly must originate from outside Rust's allocator (e.g. an FFI handle, MMIO), use `.expose_provenance()` / `ptr::with_exposed_provenance()` — an explicitly-named escape hatch, not the default path.

```rust
// wrong: loses/fabricates provenance
let tagged = (ptr as usize) | 1;
let back = tagged as *mut T;              // UB-adjacent under strict provenance

// right: keep the source pointer, only manipulate address
let tagged = ptr.map_addr(|a| a | 1);
let back = tagged.map_addr(|a| a & !1);   // same allocation, provenance preserved
```

### 6. `mem::transmute` — the last resort

`transmute::<Src, Dst>` requires `size_of::<Src>() == size_of::<Dst>()` and that the result is a *valid* value of `Dst` — the compiler does not check the latter, so an invalid transmute (e.g. producing a `bool` byte other than 0/1, or a null reference) is instant UB with no runtime signal. Padding bytes are not guaranteed preserved across the transmute, and pointer↔integer transmutes are outside strict provenance and should be avoided ([`mem::transmute` docs](https://doc.rust-lang.org/std/mem/fn.transmute.html)). Prefer, in order: `from_ne_bytes`/`to_le_bytes` for numeric byte conversions, `as` casts for numeric widening/narrowing, pointer `.cast()`/reborrow (`&mut *(p as *mut U)`) for pointer type punning, and `MaybeUninit` for arbitrary bit-pattern manipulation. Grimoire/ocx's digest-verification code (parsing SHA-256 hex/bytes) is exactly the kind of place a naive implementation reaches for `transmute::<[u8;32], SomeDigestType>` — use `from_ne_bytes`/an explicit constructor instead.

### 7. Uninitialized memory and `MaybeUninit`

`mem::zeroed()`/`mem::uninitialized()` are unsound whenever `T` has a validity invariant stronger than "any bit pattern" — references, `bool`, `NonNull`, `char`, and any enum are all such types; `mem::uninitialized()` is deprecated for exactly this reason ([`MaybeUninit` docs](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html)). `MaybeUninit<T>` is the sound replacement: it tells the compiler "this memory may not hold a valid `T` yet" and disables optimizations that would otherwise assume validity.

```rust
// UNSOUND: T may be a reference type; the &i32 could be produced
// as an all-zero/garbage bit pattern, which is never a valid reference.
let x: &i32 = unsafe { mem::zeroed() };

// SOUND pattern for building a struct field-by-field without ever
// creating a reference to uninitialized data (use &raw, not &mut):
let foo = {
    let mut uninit: MaybeUninit<Foo> = MaybeUninit::uninit();
    let ptr = uninit.as_mut_ptr();
    unsafe { (&raw mut (*ptr).name).write("Bob".to_string()); }
    unsafe { (&raw mut (*ptr).list).write(vec![0, 1, 2]); }
    unsafe { uninit.assume_init() }
};
```

Never call `.assume_init_mut()` or take `.assume_init_ref()` before every byte/field is written — both create a reference to (possibly still-)uninitialized data, which is UB even if you write through it immediately afterward.

### 8. `from_raw_parts` misuse

`slice::from_raw_parts(ptr, len)` and `Vec::from_raw_parts(ptr, len, cap)` require: `ptr` non-null, correctly aligned for `T`, valid (readable, and for `_mut` writable) for `len * size_of::<T>()` bytes as a single allocation, every element already initialized (for `from_raw_parts`; `Vec::from_raw_parts` additionally requires `ptr` was originally allocated by the same allocator with exactly `cap`, and `len <= cap`) — get any of these wrong (off-by-one length, alignment mismatch after a pointer cast, reusing a pointer after `Vec` reallocation) and it's immediate or delayed UB with no compiler check ([`std::ptr` docs](https://doc.rust-lang.org/std/ptr/index.html)). In this codebase's tarball-extraction and OCI-blob-streaming paths, any hand-rolled buffer slicing from a raw byte pointer (rather than going through `&[u8]` slices the whole way) is a red flag worth a dedicated review pass.

### 9. `&mut` aliasing (mutability XOR aliasing)

The rule "at most one live `&mut T` to a location, and no live `&T` at the same time (except through `UnsafeCell`)" is not merely a borrow-checker convenience — violating it via raw pointers (two `*mut T` derived to alias, one used as `&mut`) is UB detected by Stacked/Tree Borrows in Miri even when the borrow checker never sees it, because the raw-pointer code sidesteps the checker entirely. This is the single most common self-inflicted bug in "I'll just use unsafe for performance" code that manually manages two views into one buffer (e.g. a zero-copy parser holding both a `&[u8]` and a `*mut u8` into the same slice for in-place mutation).

### 10. Unsound `Send`/`Sync` impls

Most types derive `Send`/`Sync` automatically from their fields; manual `unsafe impl Send for T {}` / `unsafe impl Sync for T {}` is needed only for types built on raw pointers (which are never auto-`Send`/`Sync`) and is a claim the compiler cannot check — get it wrong and the type silently causes data races the moment it crosses threads under real load, not at compile time ([Rustonomicon Send/Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)).

```rust
// UNSOUND: raw pointer to a non-atomic refcount, claimed Send —
// two threads can now race on the refcount with no synchronization.
struct MyRc<T>(*mut (usize, T));
unsafe impl<T> Send for MyRc<T> {}   // WRONG: no actual synchronization exists
```

Any `unsafe impl (Send|Sync)` must name, in its SAFETY comment, the concrete mechanism that makes cross-thread access sound (an atomic, a lock the type always holds, or genuine immutability).

### 11. `static mut` — deprecated-in-practice since edition 2024

`static mut X: T` compiles pre-2024 but taking `&X` or `&mut X` is instant UB the moment the reference exists (not just when used), because it violates mutability-XOR-aliasing at a scope the compiler cannot reason about globally. Edition 2024 makes `static_mut_refs` deny-by-default with **no automatic migration** — you must manually pick a replacement ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html)):

```rust
// BEFORE (UB-prone, denied by default in 2024):
static mut COUNTER: u64 = 0;
unsafe { COUNTER += 1; }               // creates &mut COUNTER implicitly — denied

// AFTER — simple scalar:
static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);   // fully safe

// AFTER — complex state:
static STATE: std::sync::Mutex<HashMap<String, String>> = std::sync::Mutex::new(HashMap::new());
STATE.lock().unwrap().insert(k, v);    // fully safe
```

If `static mut` genuinely cannot be avoided (e.g. an interrupt-disabled embedded context — not applicable to a userspace CLI like ocx/grim), access it via `&raw mut STATE` / `&raw const STATE`, which builds a pointer without ever materializing a reference.

### 12. `Pin` violations

`Pin<P>` promises the pointee will never move in memory again once pinned (needed for self-referential structures, most visibly `async fn` state machines). The violation this codebase is realistically exposed to is not writing custom `Future`s (unlikely for a CLI) but implementing `Unpin`-breaking custom types manually and then moving them via `mem::swap`/`mem::replace`/`Box::leak`-and-move tricks around a `Pin<&mut T>` — any unsafe `Pin::new_unchecked` call needs a SAFETY comment proving the value will genuinely never move again, including inside `Drop`. This crate family is unlikely to need custom `Pin` code at all; grep for `Pin::new_unchecked` and treat any hit as a signal to justify or remove it.

### 13. Panics across FFI boundaries and `catch_unwind`

Unwinding a panic through an `extern "C"` function (the default ABI, not `"C-unwind"`) is undefined behavior — the C caller's stack has no unwind tables for Rust's landing pads. `catch_unwind` only catches unwinding panics, not `panic = "abort"` panics, and the docs explicitly say it is not a general try/catch — reserve it for exactly this boundary case ([`catch_unwind` docs](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html)):

```rust
#[unsafe(no_mangle)]
pub extern "C" fn ocx_parse_manifest(data: *const u8, len: usize) -> i32 {
    let result = std::panic::catch_unwind(|| {
        // ... parsing that might panic on malformed input ...
    });
    match result {
        Ok(code) => code,
        Err(_) => -1,   // convert panic to an FFI-safe error code
    }
}
```

For the ocx/grim family: if any Rust code is invoked as a plugin/callback from a non-Rust process (not the typical case — subprocess execution is the other direction here, Rust launching external tool binaries), that boundary needs this wrapper; launching subprocesses via `std::process::Command` does not have this hazard since the child is a separate process/stack.

### 14. Verification tooling: Miri

Miri interprets a program's MIR, so it runs orders of magnitude slower than native code but has visibility no compiled-code sanitizer has: out-of-bounds and use-after-free, uninitialized-memory reads, misaligned accesses, invalid values for a type (e.g. an out-of-range enum discriminant, non-0/1 `bool`), aliasing-model violations (Stacked/Tree Borrows), and (via a data-race checker using vector clocks) unsynchronized concurrent access; it also flags leaked allocations as diagnostics, which is not itself UB but is a real bug class ([Miri repo](https://github.com/rust-lang/miri), [Miri POPL'26 paper](https://research.ralfj.de/papers/2026-popl-miri.pdf)).

```bash
rustup +nightly component add miri
cargo +nightly miri test
# isolate less strictly (allow real env/fs access where a test needs it):
MIRIFLAGS="-Zmiri-disable-isolation" cargo +nightly miri test
```

What it misses: it cannot execute real FFI calls or syscalls (stubs/no-ops for most), so any test exercising actual filesystem/network/subprocess code (a large fraction of ocx/grim's own test surface) cannot run under Miri unmodified — isolate the pure logic (manifest parsing, digest computation, lockfile diffing) into Miri-testable units, separate from the I/O shell. It is also a dynamic tool: a given Miri run only proves the absence of UB on the exact control-flow path executed that run, not all paths — run it across representative/fuzzed inputs, and treat a clean Miri run as evidence, not proof.

### 15. Sanitizers (ASan/TSan/MSan) and `cargo-careful`

`-Zsanitizer=address|thread|memory` (nightly rustc flag, via `RUSTFLAGS="-Zsanitizer=address" cargo +nightly test -Zbuild-std --target <triple>`) instruments real compiled code rather than interpreting MIR, so it exercises actual FFI/syscalls that Miri can't, at the cost of native-ish speed but real target-triple/build-std complexity. `cargo-careful` is the lower-friction middle ground: it rebuilds the standard library itself with debug assertions and turns on `-Zstrict-init-checks` (so `mem::zeroed`/`mem::uninitialized` panic instead of silently producing invalid values) plus runtime alignment/non-null/non-overlap checks on `copy`, `copy_nonoverlapping`, `write_bytes`, and validity checks on `NonNull::new_unchecked`/`NonZero*::new_unchecked` ([crates.io](https://crates.io/crates/cargo-careful/0.3.0)):

```bash
cargo install cargo-careful
cargo +nightly careful test
```

For a project this size, `cargo careful test` in CI on a nightly job is realistic and cheap; full sanitizer builds are worth reserving for the one or two crates that genuinely touch raw memory/FFI, if any.

### 16. Kani, and formal-proof tools (Creusot/Prusti/Verus)

Kani compiles MIR to CBMC's bit-precise bounded-model-checking engine and proves properties (panic-freedom, memory safety, and user-stated assertions) for a specific function up to a bounded input size, via a harness:

```rust
#[cfg(kani)]
#[kani::proof]
fn check_digest_parse() {
    let input: [u8; 64] = kani::any();   // symbolic input, all values explored
    let _ = parse_sha256_hex(&input);    // must not panic/UB for any input
}
```

Run with `cargo kani` ([Kani repo](https://github.com/model-checking/kani)). This gives an actual proof (within the bound) rather than sampled test coverage — realistic to apply to a small number of hot, security-critical, pure functions (digest/manifest/lockfile parsing) in this codebase, not the CLI as a whole; it does not model I/O, threads, or most of the standard library equally well, and setup/CI cost is non-trivial. Creusot/Prusti/Verus (deductive/refinement-type proof tools) are a further step up in rigor and annotation burden — not realistic for a production CLI tool team without a dedicated formal-methods investment; mention only as "exists" for future consideration, not as near-term guidance.

### 17. FFI safety: `extern "C"`, ABI, `repr(C)`, cbindgen, bindgen

`#[repr(C)]` fixes struct/union field layout to the platform's C ABI (declaration-order fields, C-style padding/alignment) but is not automatically FFI-sound on its own: Rust field-less enums, even `#[repr(C)]`, are UB if given a discriminant value C didn't actually produce for that enum — C enums can legally hold any integer value of the underlying type, Rust enums cannot ([Rust reference: type layout](https://doc.rust-lang.org/reference/type-layout.html#the-c-repr)). Enums with data become a `repr(C)` tag+union struct — useful, but every payload variant must independently be `repr(C)`-safe too.

`cbindgen` generates a C/C++ header from Rust source so the header can never drift from the actual Rust layout — prefer generating over hand-writing when this codebase ever exposes a C ABI, and re-run it in CI (fail the build if the checked-in header differs from freshly generated output) rather than relying on a developer to remember ([cbindgen repo](https://github.com/mozilla/cbindgen)). `bindgen` (the reverse direction — generating Rust FFI bindings from a C header) carries its own hazard: it cannot verify semantic contracts (nullability, ownership, thread-safety) that C headers don't encode in the type system, so every `bindgen`-generated `unsafe extern "C"` function still needs a hand-written safe wrapper with a SAFETY-justified precondition check before this codebase calls it.

### 18. Auditing dependencies for unsafe: cargo-geiger and the reality

`cargo-geiger` walks the full dependency graph and reports unsafe usage counts (functions, expressions, impls, traits) per crate, marking crates that declare `#![forbid(unsafe_code)]` — a fast `--forbid-only` mode (v0.13, 2025) skips invoking `rustc` entirely and just checks for the forbid attribute, cutting CI runtime ([cargo-geiger README](https://github.com/geiger-rs/cargo-geiger)). The honest caveat: a high or low unsafe count is not itself a soundness signal — `serde`/`regex`/`hashbrown`-class crates carry unsafe for real performance reasons and are heavily reviewed; a small utility crate with unsafe from an unfamiliar maintainer is the actually risky case. Use `cargo geiger` output as a *diff* signal in CI (does adding/upgrading a dependency introduce unsafe where there was none before), not as an absolute gate, and cross-reference new/changed dependencies against `cargo audit`'s RustSec advisory database (which flags soundness bugs specifically, not just security CVEs) as the complementary check.

### 19. Real CVEs/soundness bugs and what rule would have caught them

| Advisory | Crate/version | Root cause | Rule that catches it |
|---|---|---|---|
| [RUSTSEC-2018-0018](https://raw.githubusercontent.com/rustsec/advisory-db/main/crates/smallvec/RUSTSEC-2018-0018.md) | `smallvec` < 0.6.13 | `mem::uninitialized::<T>()` used for arbitrary user `T`; unsound for reference-typed `T` | Never call `mem::uninitialized`/`mem::zeroed` on a generic `T` — use `MaybeUninit<T>`, caught by `cargo careful` (`-Zstrict-init-checks` panics on the bad init) |
| [RUSTSEC-2021-0003](https://rustsec.org/advisories/RUSTSEC-2021-0003.html) | `smallvec` < 0.6.14 / 1.6.1 | `insert_many` allocated a buffer smaller than needed, then wrote past its end — heap buffer overflow, exploitable for RCE | Miri's out-of-bounds write detection on any test exercising `insert_many` with realistic sizes; also a case for `cargo fuzz`/property tests on capacity-growth arithmetic |
| [RUSTSEC-2020-0071 / CVE-2020-26235](https://rustsec.org/advisories/RUSTSEC-2020-0071) | `time` < 0.2.23 | `UtcOffset::local_offset_at` read the C `environ` global without synchronization; another thread calling `setenv` concurrently could segfault via dangling pointer | Same root cause is now baked into std itself: `env::set_var`/`remove_var` are `unsafe fn` since edition 2024 — grep for calls, demand a SAFETY comment proving no concurrent env access, or avoid mutating process env after startup entirely |
| actix-web unsafe issues (pre-1.0, [tracking issue #289](https://github.com/actix/actix-web/issues/289)) | `actix-web` early versions | 100+ unsafe uses for hot-path performance, several unsound (violating the invariants safe callers relied on) without individual justification | Every `unsafe` block requires a SAFETY comment naming the specific invariant relied on (rule §1) — a large unreviewed unsafe surface is exactly what `cargo geiger` + `clippy::undocumented_unsafe_blocks` together are meant to surface before merge, not after a CVE |

## Normative guidance candidates

1. **Put `#![forbid(unsafe_code)]` at the top of every crate in the workspace that has no proven FFI/perf need for `unsafe`.** Rationale: this codebase's actual work (OCI HTTP, tar/zip extraction, JSON/TOML parsing) is fully covered by safe crates; unsafe should never appear by accident. Verify: `grep -L 'forbid(unsafe_code)' $(find . -name lib.rs -o -name main.rs)` should return nothing unexpected, or run `cargo geiger --forbid-only`.
2. **Every `unsafe { }` block must be immediately preceded by a `// SAFETY: …` comment naming the specific invariant relied on, and every `unsafe fn` needs a `# Safety` doc section.** Rationale: unsafe code is only as sound as the reasoning behind it, and undocumented unsafe cannot be reviewed. Verify: `cargo clippy -- -D clippy::undocumented_unsafe_blocks -D clippy::missing_safety_doc`.
3. **Never call `mem::zeroed`/`mem::uninitialized` on a generic or non-`#[repr(C)]`-scalar type.** Rationale: both are unsound for any type with a validity invariant (references, bools, enums, NonNull) — this is the exact `smallvec` RUSTSEC-2018-0018 bug. Verify: `grep -rn 'mem::uninitialized\|mem::zeroed' --include=*.rs`, and run `cargo +nightly careful test` in CI (panics on the unsound case via `-Zstrict-init-checks`).
4. **Never `.assume_init_ref()`/`.assume_init_mut()`/`.assume_init()` a `MaybeUninit<T>` before every byte/field relevant to `T`'s validity has been written; build structs field-by-field through `&raw mut (*ptr).field`, never through a `&mut` into uninitialized memory.** Rationale: taking a reference to uninitialized data is itself UB, independent of whether you immediately overwrite it. Verify: code-reading heuristic — any `assume_init` call, trace backward to confirm full initialization on every path; Miri catches the actual violation at runtime.
5. **Reserve `mem::transmute` for cases with no safe/semi-safe equivalent, and never for pointer↔integer conversion.** Rationale: transmute has zero compiler-checked validity guarantee and silently produces UB values; `from_ne_bytes`/`as` casts/`ptr.cast()` cover the overwhelming majority of legitimate uses. Verify: `grep -rn 'mem::transmute\|::transmute::<' --include=*.rs` and require a SAFETY comment justifying why no alternative exists.
6. **Replace all `static mut` with `AtomicT`, `Mutex`/`RwLock`, or `OnceLock`/`LazyLock`; if truly unavoidable, access only via `&raw const`/`&raw mut`, never `&`/`&mut`.** Rationale: edition 2024 makes `static_mut_refs` deny-by-default because a reference to `static mut` is instantaneous UB. Verify: `cargo build` on edition 2024 fails on any violation automatically (deny-by-default lint); `grep -rn 'static mut' --include=*.rs` to confirm none remain.
7. **Treat `std::env::set_var`/`remove_var` calls as requiring the same scrutiny as any other `unsafe` block — a SAFETY comment proving no concurrent thread reads the environment, or better, avoid mutating process env after startup.** Rationale: this is edition 2024's codification of the exact CVE-2020-26235 root cause. Verify: `grep -rn 'env::set_var\|env::remove_var' --include=*.rs`; edition-2024 compiler enforces the `unsafe` wrapper mechanically.
8. **Every `unsafe impl Send`/`unsafe impl Sync` must have a SAFETY comment naming the concrete synchronization mechanism that makes cross-thread access sound.** Rationale: these impls are unchecked correctness claims that fail silently until concurrent load exposes a data race. Verify: `grep -rn 'unsafe impl.*\(Send\|Sync\)' --include=*.rs`, manually confirm each against the comment; run Miri's data-race checker on any multithreaded test exercising the type.
9. **Any Rust function exposed to be called from non-Rust code across an `extern "C"` boundary (default ABI) must wrap its body in `catch_unwind` and translate panics to an error code/status, or be compiled `panic = "abort"` for that target.** Rationale: unwinding across a non-`C-unwind` FFI boundary is UB. Verify: grep for `extern "C" fn` in any crate exposing a C ABI; confirm each has a `catch_unwind` wrapper or the crate is `panic = "abort"`.
10. **Never reinterpret a raw integer from C (or from untrusted bytes, e.g. an OCI manifest field) directly into a Rust field-less enum via `transmute`/pointer cast; validate the discriminant first (e.g. `TryFrom`).** Rationale: an out-of-range Rust enum discriminant is UB per the type-layout reference, not just a logic bug. Verify: code-reading heuristic on every `#[repr(...)] enum` that has a raw-value constructor — confirm it returns `Option`/`Result`, not an unchecked cast.
11. **Run `cargo +nightly miri test` (or at minimum `cargo +nightly careful test`) in CI on every crate whose logic doesn't require real I/O/FFI (parsers, digest code, lockfile diffing).** Rationale: Miri catches the exact bug classes (uninitialized reads, OOB, aliasing violations) responsible for real RustSec advisories; `cargo-careful` is the low-friction fallback where Miri's FFI/syscall limitation blocks a test. Verify: CI job presence; `cargo +nightly miri test -p <pure-logic-crate>` exits 0.
12. **Gate new/updated dependencies on a `cargo geiger` diff (does this pull in unsafe where the prior version/crate had none) plus `cargo audit` against the RustSec database.** Rationale: unsafe-in-dependencies is where most real-world Rust CVEs actually live, not in this project's own code; both tools are complementary (geiger = quantity, audit = known-bad). Verify: CI step running both; fail on new RustSec advisory for anything in `Cargo.lock`.

## AI-agent angle

- **Hallucinated/stale API: writing `mem::uninitialized()` or reaching for `unsafe impl Send` reflexively for "performance."** LLMs trained on pre-2021 code frequently reproduce `mem::uninitialized()`, which is deprecated and unsound. Mechanical check: `grep -rn 'mem::uninitialized' --include=*.rs` — any hit is a hard fail; the fix is always `MaybeUninit`.
- **Writing `unsafe fn` bodies without inner `unsafe {}` blocks, believing the old (pre-2024) semantics still apply.** An agent trained mostly on pre-2024 code will happily call `get_unchecked`/dereference raw pointers directly inside an `unsafe fn` with no inner block — this now warns (and should be denied) under edition 2024. Mechanical check: `cargo clippy -- -D unsafe_op_in_unsafe_fn`.
- **Using `static mut` for "simple global state" because it's the idiom most represented in training data.** Agents default to the pattern that appears most often historically, which is exactly the pattern edition 2024 now denies. Mechanical check: edition-2024 `cargo build` fails automatically; also grep `static mut`.
- **Writing plausible-looking SAFETY comments that restate what the code does rather than why it's sound** (e.g. "SAFETY: this dereferences the pointer" instead of stating the invariant that makes the dereference valid). This passes `clippy::undocumented_unsafe_blocks` (which only checks a comment exists) while providing zero actual review value. Mechanical check: none fully automatic — a reviewer heuristic is required: does the comment reference a specific precondition (bounds, initialization, ownership, lifetime) rather than restate the operation? Treat any SAFETY comment under ~8 words or that just says "this is safe" as a fail.
- **Reaching for `transmute` to "reinterpret" a byte buffer as a struct (e.g. parsing a binary header) instead of using `from_ne_bytes`/explicit field-by-field parsing.** This compiles, often produces plausible values on the happy path, and is UB the moment struct layout/padding/alignment don't match exactly (which they rarely do without `#[repr(C)]` and manual verification). Mechanical check: `grep -rn 'transmute' --include=*.rs`; for any hit, confirm both types are `#[repr(C)]`/fixed layout and same size, or reject the pattern outright in favor of explicit parsing.
- **Adding `#[repr(C)]` to a Rust enum used to model a C `enum`/int field and then casting an arbitrary integer into it without validation.** This looks correct (types "line up") and compiles, but any integer outside the declared variants is instant UB, not a panic or garbage value the agent might expect. Mechanical check: any `#[repr(...)] enum` with a `from_raw`/`as`-cast constructor must return `Option`/`Result` — grep for `as MyEnum` cast patterns and reject them.
- **Claiming Miri/careful/sanitizer coverage in a PR description without it actually running in CI, because the agent generated the workflow YAML but didn't verify the job executes and exits 0.** Mechanical check: confirm the CI job actually ran (not just exists in a YAML file) and inspect its exit code/log for the specific crate, not just "no errors printed."

## Contested / evolving

- **Tree Borrows vs. Stacked Borrows as Miri's default aliasing model.** Tree Borrows (PLDI 2025, Distinguished Paper) is gaining adoption for being measurably less prone to false-positive UB reports on real-world crates (54% fewer rejections in a 30k-crate evaluation), but as of this research neither model is formally proven sound, and Miri still supports both as configurable flags rather than having fully retired Stacked Borrows. Trend as of mid-2026: Tree Borrows is where new aliasing-model work concentrates; treat Stacked-Borrows-only rejections with more suspicion than before, but don't treat a Tree-Borrows pass as definitive proof either ([ralfj.de](https://www.ralfj.de/blog/2023/06/02/tree-borrows.html), [PLDI 2025](https://pldi25.sigplan.org/details/pldi-2025-papers/42/Tree-Borrows)).
- **Standardizing SAFETY-comment structure.** A 2026 RFC effort ("Safety Tags") proposes machine-checkable structured safety annotations (beyond free-text SAFETY comments) with the goal of annotating every public unsafe std API and extending Clippy/rust-analyzer to verify them — not yet stabilized or ecosystem-standard as of this research; current practice remains free-text `// SAFETY:` comments checked only for *presence*, not correctness, by Clippy.
- **`unsafe extern` blocks (the `unsafe_attr_outside_unsafe`/`missing_unsafe_on_extern` direction).** Recent editions have moved toward requiring `unsafe extern "C" { ... }` blocks (not just `unsafe fn` inside a plain `extern` block) — check current nightly/stable status before writing new FFI declarations rather than assuming older `extern "C" { fn foo(); }` syntax is still the preferred form; the trend is toward making the unsafety of *declaring* an external function as explicit as calling one.
- **How much verification tooling (Kani, sanitizers) is "realistic" for a normal project remains a genuine judgment call, not settled practice.** The evidence (Kani's own production use verifying the Rust standard library, 16,000+ harnesses per change) shows it scales for well-funded, dedicated efforts; for a small CLI tool team the realistic default is Miri + `cargo careful` in CI, with Kani reserved for a handful of hand-picked, security-critical pure functions — treat any "just add Kani everywhere" recommendation as over-scoped for this project's size.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [Rustonomicon — Introduction](https://doc.rust-lang.org/nomicon/intro.html) | Official book (rust-lang) | current, edition-2024-era | Canonical statement of what `unsafe` grants and doesn't, and the topic scope for unsafe Rust |
| [Rust Edition Guide — unsafe_op_in_unsafe_fn](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) | Official docs | 2024 edition (Rust 1.85, Feb 2025) | Primary source for the exact edition-2024 lint change and migration command |
| [Rust Edition Guide — static-mut-references](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) | Official docs | 2024 edition | Primary source for `static_mut_refs` deny-by-default and replacement patterns |
| [Rust Edition Guide — newly-unsafe-functions](https://github.com/rust-lang/edition-guide/blob/master/src/rust-2024/newly-unsafe-functions.md) | Official docs (repo) | 2024 edition | Confirms `env::set_var`/`remove_var` became `unsafe fn`, ties directly to CVE-2020-26235 |
| [`std::mem::transmute` docs](https://doc.rust-lang.org/std/mem/fn.transmute.html) | Official API docs | current (std) | Primary source for transmute's exact safety requirements and recommended safe alternatives |
| [`std::mem::MaybeUninit` docs](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html) | Official API docs | current (std) | Primary source for uninitialized-memory handling, assume_init contract, field-by-field init pattern |
| [`std::ptr` module docs](https://doc.rust-lang.org/std/ptr/index.html) | Official API docs | current (std) | Primary source for strict-provenance APIs and `from_raw_parts` safety preconditions |
| [`std::panic::catch_unwind` docs](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html) | Official API docs | current (std) | Primary source for the FFI-unwinding-UB contract and panic=abort interaction |
| [Rustonomicon — Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html) | Official book (rust-lang) | current | Primary source for manual Send/Sync impl rules and when they're needed |
| [Rust Reference — type-layout (#[repr(C)])](https://doc.rust-lang.org/reference/type-layout.html#the-c-repr) | Official language reference | current | Primary source for exact repr(C) layout rules and the field-less-enum FFI hazard |
| [rust-lang/miri GitHub repo](https://github.com/rust-lang/miri) | Official tool repo | actively maintained, 2025/2026 | Primary source for installation, usage, and capability/limitation claims about Miri |
| [Miri: Practical Undefined Behavior Detection for Rust (POPL 2026 paper)](https://research.ralfj.de/papers/2026-popl-miri.pdf) | Peer-reviewed paper (Ralf Jung et al.) | 2026 | Authoritative, current academic source on what Miri catches/misses and its design rationale |
| [Tree Borrows — From Stacks to Trees (ralfj.de blog)](https://www.ralfj.de/blog/2023/06/02/tree-borrows.html) | Blog by the model's co-author | 2023, still current practice | Explains the motivation and mechanics of the newer aliasing model in accessible terms |
| [Tree Borrows — PLDI 2025 paper page](https://pldi25.sigplan.org/details/pldi-2025-papers/42/Tree-Borrows) | Peer-reviewed conference paper listing | 2025 (Distinguished Paper Award) | Confirms current status/evaluation numbers (54% fewer rejections across 30k crates) |
| [`cargo-careful` on crates.io](https://crates.io/crates/cargo-careful/0.3.0) | Crate docs/README | current | Primary source for exact checks cargo-careful performs and how to run it |
| [model-checking/kani GitHub repo](https://github.com/model-checking/kani) | Official tool repo (AWS) | actively maintained, 2025/2026 | Primary source for Kani's model, harness syntax, and production-scale usage claims |
| [geiger-rs/cargo-geiger GitHub repo](https://github.com/geiger-rs/cargo-geiger) | Official tool repo | v0.13, 2025 | Primary source for cargo-geiger's exact capability (unsafe quantification, --forbid-only mode) |
| [RustSec Advisory RUSTSEC-2018-0018 (smallvec)](https://raw.githubusercontent.com/rustsec/advisory-db/main/crates/smallvec/RUSTSEC-2018-0018.md) | Official vulnerability database entry | 2018 advisory, still canonical | Real soundness CVE directly caused by `mem::uninitialized()` misuse |
| [RustSec Advisory RUSTSEC-2021-0003 (smallvec)](https://rustsec.org/advisories/RUSTSEC-2021-0003.html) | Official vulnerability database entry | 2021 advisory | Real heap-buffer-overflow CVE from unsafe capacity/growth arithmetic |
| [RustSec Advisory RUSTSEC-2020-0071 (time)](https://rustsec.org/advisories/RUSTSEC-2020-0071) | Official vulnerability database entry | 2020 advisory (CVE-2020-26235) | Real segfault CVE that directly motivated edition-2024 making `env::set_var` unsafe |
| [rust-lang/rust-clippy — undocumented_unsafe_blocks lint source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/undocumented_unsafe_blocks.rs) | Official tool source code | current | Primary source (source code itself) for the exact enforcement behavior of the SAFETY-comment lint |
| [rust-lang/unsafe-code-guidelines README](https://github.com/rust-lang/unsafe-code-guidelines/blob/master/README.md) | Official working-group repo | current | Explains the authoritative status of the Nomicon vs. the Reference vs. T-opsem FCP decisions |
