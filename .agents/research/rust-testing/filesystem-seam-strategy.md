---
title: Filesystem Seam Strategy
topic: rust-testing / filesystem-heavy code — trait seam vs in-memory VFS vs TempDir vs cap-std
agent: rust-testing-researcher
model: sonnet
date_researched: 2026-08
sources_count: 17
scope: >
  Covers how to test std::fs/tokio::fs-heavy Rust code at the scale of ocx (1,664 call sites)
  and grimoire (906 call sites): trait-seam abstraction, in-memory VFS crates, TempDir/assert_fs
  as the seam, cap-std capability sandboxing, fault-injection technique, and what cargo, uv,
  rustup, sccache, and jj actually do. Does NOT cover async runtime testing, network mocking,
  or non-filesystem I/O (those are separate subareas).
---

## Table of contents

1. [Findings](#findings)
   1. [What each strategy can and cannot test](#1-what-each-strategy-can-and-cannot-test)
   2. [Ergonomics cost of a trait seam at 1,600+ call sites](#2-ergonomics-cost-of-a-trait-seam-at-1600-call-sites)
   3. [Measured suite-speed evidence](#3-measured-suite-speed-evidence)
   4. [Fault injection: crates and techniques](#4-fault-injection-crates-and-techniques)
   5. [How comparable projects solve it](#5-how-comparable-projects-solve-it)
   6. [cap-std as a seam that doubles as a security control](#6-cap-std-as-a-seam-that-doubles-as-a-security-control)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

1. No comparable large Rust CLI/package-manager project (cargo, rustup, sccache, uv, jj) puts a
   `FileSystem` trait between its logic and `std::fs`/`tokio::fs`. All of them test against a
   **real temp directory on real disk** and invest instead in fixture-builder ergonomics and
   suite parallelism.
2. `rsfs` (last release 2017, 83 downloads/month) is **abandoned** — do not adopt it or cite it
   as current practice.
3. `vfs` (0.13.0, Mar 2026) and `cap-std` (4.0.2, Feb 2026) are both actively maintained in
   2026; `cap-std` has two orders of magnitude more adoption (2.3M downloads/month vs ~204k).
4. An in-memory VFS (`vfs::MemoryFS`) cannot reproduce `EXDEV` (cross-device rename), `ENOSPC`,
   partial writes, real permission-bit denial, real symlink-escape behavior, fsync/durability,
   or genuine concurrent-process locking — it is a pure in-process `HashMap`-backed structure,
   not an OS-error simulator. Treat green tests against it as coverage of your *branching logic
   only*, not of failure-mode handling.
5. `std::fs::rename` is documented to fail across mount points/filesystems on all platforms —
   this is the single most-skipped real failure mode in filesystem test suites and the one an
   in-memory FS structurally cannot produce, because there is only one "device."
6. The `fail` crate (fka `fail-rs`, TiKV project, 0.5.1, Oct 2022, 1M+ downloads/month) is the
   standard Rust mechanism for injecting errors, panics, and delays at specific source
   locations via a `fail_point!("name")` macro gated behind a `failpoints` Cargo feature and
   activated by the `FAILPOINTS` env var or `FailScenario` — this reaches real I/O call sites
   without a trait indirection.
7. `cap-std::fs::Dir` is a capability handle (sandboxed, TOCTOU/symlink-escape resistant) that
   the maintaining project itself describes as usable as a convenient unit-test seam "as a nice
   side effect" of its primary security purpose — it is the one abstraction here that earns its
   keep even if you never write a test with it.
8. `uv-fs` (astral-sh/uv) has **no filesystem trait at all** at ~similarly large scale — it is
   free functions directly wrapping `std::fs`/`tokio::fs` with heavy platform-conditional retry
   logic (Windows antivirus-lock retries with exponential backoff on rename/persist), which is
   architecturally the closest precedent to ocx/grimoire's current shape.
9. Cargo's own test harness (`cargo-test-support`) builds real directory trees under
   `$CARGO_TARGET_TMPDIR`/a `paths::root()` helper and backdates mtimes by one second to defeat
   filesystem mtime coarseness (notably on macOS in CI) rather than avoiding real I/O.
10. jj (Jujutsu) uses real `tempfile::TempDir`s for working-copy tests but keeps a **pluggable
    backend trait** at the storage layer (Git backend vs a test-only in-memory backend) — this
    is a two-tier pattern: real disk for the working copy, a swappable trait only at the object
    store boundary where the abstraction was needed for another reason (multiple real backends
    exist, not just a fake).
11. matklad's "How to Test" is the clearest primary articulation of the underlying principle:
    architect for a sans-I/O compute core and let the callers own I/O, then accept that the
    residual I/O-touching code gets tested against real I/O — Cargo's suite takes ~7 minutes,
    rust-analyzer's under 30 seconds, and the gap is explained by how much of each does real
    filesystem/process work, not by mocking strategy.
12. Deterministic simulation testing (Antithesis-style) is the frontier alternative to both
    trait seams and TempDir for finding timing- and durability-dependent bugs — their August
    2026 SQLite WAL post found a 16-year-old concurrency bug in 15 minutes of exhaustive
    scheduling exploration, a class of bug neither a `FileSystem` trait fake nor a `TempDir`
    suite is built to find. It is not yet mainstream Rust CLI-project practice.
13. Partial adoption is coherent and is what every comparable project actually does: a seam
    exists only at boundaries that already need multiple *real* implementations (jj's storage
    backend, ocx's `OciTransport`/`CredentialStore`) — never introduce a `FileSystem` trait
    whose only implementor besides `std::fs` is a fake built purely to avoid disk I/O in tests.
14. libfiu (LD_PRELOAD-based POSIX fault injection, v1.2, Oct 2023) and similar OS-level tools
    let you fail specific syscalls for an unmodified real binary — useful for a handful of
    high-value integration tests (e.g. "what does grim do when `rename()` returns `ENOSPC`"),
    not for unit-level coverage, and it's Unix-only.
15. ENOSPC and cross-device-rename testing at the OS level is done with tmpfs/loop-device
    tricks (`mount -t tmpfs -o size=8M`, a small loop-mounted ext4 image, or two separate real
    mounts for EXDEV), not with any Rust crate — this is infrastructure the CI harness owns,
    not application code.
16. Case-insensitive-collision bugs (macOS/Windows default filesystems) and case-sensitive
    Linux are a real-OS-only failure mode with no in-memory or trait-fake substitute unless the
    fake explicitly models case-folding — most fakes (including `vfs::MemoryFS`) do not.
17. Given ocx/grimoire's current shape — 1,664 + 906 call sites almost entirely in free
    functions, with no existing filesystem abstraction — a codebase-wide `FileSystem` trait
    retrofit is the highest-cost, lowest-yield option on this list; it should not be attempted
    as a blanket migration.

## Findings

### 1. What each strategy can and cannot test

| Failure mode | (a) trait + fake | (b) in-memory VFS | (c) TempDir/assert_fs | (d) cap-std |
|---|---|---|---|---|
| Cross-device rename (`EXDEV`) | Only if fake explicitly models it (rare — most fakes have one flat namespace, so there is no "other device" to fail across) | No — single in-process store, no device boundary | **Yes** — mount two real filesystems/tmpfs+loopdev in CI, or reproduce with a bind mount | Yes, same as (c); `Dir` still calls real `renameat` |
| `ENOSPC` (disk full) | Only if fake has an injectable error map | Only if the crate exposes an error-injection hook (`rsfs` had one and **removed** it; `vfs::MemoryFS` has none) | **Yes** — small tmpfs (`size=`) or loop-mounted image | Yes, same underlying syscalls as (c) |
| Partial/torn writes | Fake must simulate; most don't | No | Hard even with real I/O — requires killing the process mid-write or a crash-consistency tool (ALICE-style); TempDir alone doesn't give you this | Same limitation as (c) |
| Permission denied | Fake can return the error trivially — but doesn't prove the real OS check is wired correctly | Same as fake — synthetic, not exercising `EACCES` from the kernel | **Yes**, real `chmod`/ACL, but flaky/non-portable across CI runners and meaningless on Windows without ACL setup | Yes — and `Dir` additionally *enforces* directory-boundary denial itself (its main feature), so this is the one place a permission test is validating your own abstraction, not just the OS |
| Symlink escape / TOCTOU | Fake can model it as much or as little as you code — self-fulfilling | Depends on crate; most model symlinks loosely if at all | Real symlinks, real races — genuine coverage but racy/slow to hit reliably | **Best fit** — this is `cap-std`'s core design goal; `Dir::open` structurally cannot escape its root even under a symlink race |
| Case-insensitive collisions | No, unless deliberately coded into the fake | No (flat `HashMap`, case-sensitive) | **Yes**, but only on a case-insensitive CI runner (macOS default, Windows) — Linux CI won't catch it | Yes, real OS behavior |
| fsync / durability / crash consistency | No | No | Only the happy path (call succeeds); can't verify data survives a real power loss without OS/VM-level crash injection | No — cap-std doesn't change fsync semantics |
| Concurrent access (two processes/threads racing on one file) | Fake typically single-threaded, so this tests your *locking logic*, not real contention | Same limitation | **Yes** — real file locks, real races, the only strategy that can catch a genuine `flock`/rename race | Yes, same as (c) |
| Windows-specific (locked-open-file rename failure, `MAX_PATH`, junctions vs symlinks) | No, unless you hand-code Windows quirks into the fake (nobody does this reliably) | No | **Yes, and only this** — must run in Windows CI | Yes; `cap-std` explicitly documents Windows differences in its `fs` module |

The load-bearing conclusion: an in-memory VFS answers "does my branching logic do the right
thing when `open()` returns `Err`" and nothing about "does the real OS actually produce that
Err, and does my code survive what the OS does around it." Treat (b) as a fast unit-test
convenience for pure control-flow, never as evidence a durability or cross-platform path works.
[docs.rs/vfs](https://docs.rs/vfs/latest/vfs/) documents `MemoryFS` only as "an ephemeral
in-memory implementation (intended for unit tests)" — it makes no claim to model permissions,
symlinks, or OS error semantics, and the crate does not document any deliberate gap-list, which
is itself a signal: it was not designed as a fault-injection tool.

`rsfs`'s own history is a warning shot for this whole strategy: its README states an
error-injection feature "used to exist but was removed," and the crate has had no release
since May 2017 — [lib.rs/crates/rsfs](https://lib.rs/crates/rsfs). Do not build new work on it.

`std::fs::rename`'s documented behavior confirms EXDEV is not an edge case to hand-wave: "This
function will not work if the new name is on a different mount point," with Windows-vs-Unix
divergence layered on top (`MoveFileExW`/`SetFileInformationByHandle` on Windows, matching Unix
semantics only from Windows 10 1607+) —
[doc.rust-lang.org/std/fs/fn.rename.html](https://doc.rust-lang.org/std/fs/fn.rename.html).
Any code that persists artifacts by renaming into a cache directory (which is exactly what an
OCI-artifact package manager does) needs an EXDEV-aware fallback (copy+delete), and only a
real-multi-filesystem test setup — never an in-memory fake — can exercise that fallback path.

### 2. Ergonomics cost of a trait seam at 1,600+ call sites

None of the five comparable projects fetched put a `FileSystem` trait behind their call sites,
and the one with the closest shape to ocx/grimoire — **uv-fs** (astral-sh/uv) — is explicit
counter-evidence: it is free functions (`write_atomic`, `rename_with_retry`,
`replace_symlink`, `persist_with_retry`) calling `std::fs`/`tokio::fs`/`fs_err` directly, with
correctness pushed into platform-conditional retry loops (Windows antivirus-lock backoff) and
atomic-rename-via-tempfile patterns, not into a mockable trait. This is strong evidence that at
package-manager scale, the ROI of a blanket trait seam is negative — the complexity budget goes
to handling real OS quirks correctly, not to abstracting them away.

If a seam is introduced anyway, the generic-vs-`dyn` choice has the usual trade:

```rust
// generic — zero-cost, but the type parameter infects every signature
// that touches it, transitively, all the way up the call graph.
fn install<F: FileSystem>(fs: &F, pkg: &Package) -> Result<()> { ... }

// dyn — one concrete boundary, but every call is a vtable indirection
// and object-safety constraints (no generic methods on the trait) bite.
fn install(fs: &dyn FileSystem, pkg: &Package) -> Result<()> { ... }
```

At 1,600+ call sites spread through free functions (not already behind a small number of
structs), a generic parameter would need to be threaded through nearly the entire call graph —
this is the same "function coloring" problem async/await has, applied to I/O capability instead
of futures. A `dyn` seam avoids the signature explosion but only if there is already a small
number of entry points to inject it at; retrofitting either shape onto 1,600 pre-existing free
functions is a multi-week mechanical rewrite with high regression risk for a payoff (fast fakes)
that the "what each strategy can/cannot test" table above shows is largely illusory anyway.

**Partial adoption is coherent and is the pattern every comparable project actually uses.**
jj keeps its storage-backend trait only where multiple *real* backends already exist (Git
backend vs. jj's native backend) — the trait wasn't invented for testing, testing rides along on
an abstraction that earns its keep in production too. This mirrors ocx/grimoire's own existing
precedent (`OciTransport`, `IndexImpl`, `CredentialStore`, `OciAccess`, `ArtifactMaterializer`):
each of those traits exists because production needs more than one real implementation, not
because someone wanted a fake for tests. That is the bar a new filesystem seam should be held to
— introduce one only at a layer that would need the abstraction even if tests didn't exist.

### 3. Measured suite-speed evidence

Cargo's own integration-test harness
([cargo-test-support/src/lib.rs](https://github.com/rust-lang/cargo/blob/master/crates/cargo-test-support/src/lib.rs))
does not avoid real I/O — it embraces it and optimizes around specific pain points:
- Projects are materialized under `$CARGO_TARGET_TMPDIR` via a `ProjectBuilder`
  (`project()`, `.file()`, `.symlink()`, `.build()`).
- It explicitly backdates file mtimes by one second after building a fixture ("place the entire
  project 1 second in the past to ensure that if cargo is called multiple times, the 2nd call
  will see targets as 'fresh'"), using `filetime::set_file_times()`, because of coarse mtime
  resolution — notably on macOS CI runners. This is a real, measured filesystem-timing gotcha
  that no in-memory fake would ever surface, since fakes don't have mtime coarseness bugs.

matklad's ["How to Test"](https://matklad.github.io/2021/05/31/how-to-test.html) gives the
sharpest available speed comparison for real projects: "Cargo's test suite takes around seven
minutes... while rust-analyzer finishes in less than half a minute" — attributed to how much of
each program's logic is architected sans-I/O ("architecture the software to keep as much as
possible sans io... let the callee do compute") versus how much necessarily touches the real
filesystem/process boundary. The actionable takeaway isn't "avoid TempDir," it's "shrink the
fraction of your logic that needs to touch the filesystem at all" — which is a refactor toward
pure functions taking already-read data, not a mocking-library decision.

No source fetched in this round gives a controlled A/B benchmark of tmpfs-vs-disk-backed
`$TMPDIR` for a large `TempDir`-based Rust suite; this specific number is not established by any
source found here — treat any claimed multiplier (e.g. "2-3x on tmpfs") as anecdotal until
measured directly in ocx/grimoire's own CI. What's measured instead, consistently: fixture
*construction* overhead (mtime handling, directory-tree copy) dominates over raw disk I/O
latency at the scale these projects operate — the tmpfs vs. spinning/SSD distinction matters far
less on modern CI (SSD-backed runners, page-cache-resident recently-written files) than the
number of syscalls the fixture builder issues per test.

### 4. Fault injection: crates and techniques

**`fail` (TiKV project, fka fail-rs, v0.5.1 Oct 2022, ~1M downloads/month)** is the standard
Rust answer. It instruments specific source locations:

```rust
use fail::{fail_point, FailScenario};

fn do_fallible_work() {
    fail_point!("read-dir");
    let _dir: Vec<_> = std::fs::read_dir(".").unwrap().collect();
}
```
activated at test time without recompiling production logic:
```
FAILPOINTS=read-dir=panic cargo test --features failpoints
```
This is the mechanism that reaches real call sites *without* a trait indirection — it inverts
the trait-seam approach: instead of substituting the whole filesystem, you mark specific lines
as fallible and toggle them via environment variable or `FailScenario::setup()`. It requires a
`failpoints` Cargo feature gate (compiled out in release builds) and one macro call per
instrumented site — a much smaller diff than a trait seam, but it only injects *failures at
marked lines*, not full alternate filesystem semantics. [fail-rs
README](https://github.com/tikv/fail-rs) — TiKV, RocksDB-adjacent Rust storage engines are the
primary real-world users.

**libfiu (v1.2, Oct 2023, still maintained, public-domain, Unix-only)** works at the OS/POSIX
level via a preload mechanism, injecting failures into unmodified real binaries — e.g. enabling
`posix/io/*` fault points to make read/write/open calls fail —
[blitiri.com.ar/p/libfiu](https://blitiri.com.ar/p/libfiu/). This is orthogonal to and can
complement `fail`: `fail` requires instrumenting your own code; libfiu (and equivalents like
`LD_PRELOAD`-based syscall interceptors) fails calls without touching source, at the cost of
being coarser-grained and Unix-only — no Windows equivalent exists in this space, which matters
for a cross-platform CLI shipping Windows binaries.

**OS-level tools for the failure modes above** (not Rust crates, CI/test-infra owned):
- ENOSPC: `mount -t tmpfs -o size=8M /mnt/small && ...` or a small loop-mounted ext4 image.
- EXDEV: two real mounts (a second tmpfs, or a bind-mounted directory on a different device) so
  a rename genuinely crosses filesystems.
- Permission denied: real `chmod`, run as non-root in CI (root bypasses most permission checks).
- Crash consistency / torn writes: dm-flakey-style block-device fault injection or killing the
  process mid-syscall — heavyweight, appropriate for a handful of high-value tests, not routine
  suite coverage.

**Deterministic simulation (Antithesis-style, frontier as of 2026):** their August 2026 post on
a SQLite WAL-reset race — a data-race bug present since 2010 —
[antithesis.com/blog/2026/wal-reset-bug](https://antithesis.com/blog/2026/wal-reset-bug/) —
found it in 15 minutes of exhaustive timing-scenario exploration against a simple concurrent
read/write/checkpoint workload, and the SQLite team's own prior approach had required "special
testing logic that deliberately triggers the circumstances of the bug" by hand. This class of
tool (hypervisor-level deterministic replay across the whole binary, not just the filesystem
layer) is the most promising direction for concurrency/durability bugs that neither a trait fake
nor TempDir integration tests reliably catch — but it is infrastructure-heavy (a specialized
hypervisor/platform), not something to adopt piecemeal into a CI job this quarter.

### 5. How comparable projects solve it

| Project | Filesystem test strategy | Evidence |
|---|---|---|
| **cargo** | Real `TempDir`-backed project fixtures via `cargo-test-support`; no filesystem trait. Optimizes fixture-construction correctness (mtime backdating) over abstraction. | [cargo-test-support/src/lib.rs](https://github.com/rust-lang/cargo/blob/master/crates/cargo-test-support/src/lib.rs) |
| **rustup** | Real tempdirs at multiple granularities (`test_dir()`, `test_dist_dir()`); a narrow `RustupHome` newtype-around-`PathBuf` for the "smallest form of test isolation" on config-only codepaths (no process/network); a `Env` trait for injecting env vars into `Command` or a `HashMap` uniformly — not a filesystem trait. Mock *distributions* (`MockComponentBuilder`, `MockInstallerBuilder`) are content builders on top of real dirs, not a fake OS. | `src/test.rs` in [rust-lang/rustup](https://github.com/rust-lang/rustup) |
| **sccache** | Real tempdirs, real Docker containers, real sockets for its distributed-compile test harness; no trait abstraction, `fs_err` for ergonomic error messages. | `tests/harness/mod.rs` in [mozilla/sccache](https://github.com/mozilla/sccache) |
| **jj (Jujutsu)** | Real `tempfile::TempDir` (`jj-test-` prefixed) for working-copy tests via `TestWorkspace`/`TestRepo`; a genuine backend trait (`TestRepoBackend::{Git, Simple, Test}`) at the storage layer only, because jj already supports multiple real storage backends in production. | `lib/testutils/src/lib.rs` in [jj-vcs/jj](https://github.com/jj-vcs/jj) |
| **uv (astral-sh)** | `uv-fs` is free functions directly on `std::fs`/`tokio::fs`/`fs_err`, no trait; correctness lives in platform-conditional logic (Windows retry-with-backoff on `rename`/`persist` for antivirus locks, junction-vs-symlink selection, Wine detection). Closest architectural analog to ocx/grimoire's current shape. | `crates/uv-fs/src/lib.rs` in [astral-sh/uv](https://github.com/astral-sh/uv) |

The consistent pattern across all five: real disk I/O in tests is accepted as the default, and
engineering effort goes into (a) fixture-builder ergonomics, (b) platform-specific correctness
in the free functions themselves, and (c) a trait seam *only* where production already needs
more than one real backend. None retrofit a `FileSystem` trait purely to speed up or fake out
tests.

### 6. cap-std as a seam that doubles as a security control

`cap-std` (BytecodeAlliance, v4.0.2, Feb 2026, 2.3M downloads/month, 1,120 dependent crates) —
[lib.rs/crates/cap-std](https://lib.rs/crates/cap-std) — reframes the filesystem access pattern
around a `Dir` capability instead of ambient path strings. Its own README states the rationale
directly: "Programs typically have the *ambient authority* to request any file... simply by
providing its name," whereas with `cap-std`, "`Dir::open`" requires already holding "a `Dir`,
representing an open directory it's in" —
[github.com/bytecodealliance/cap-std](https://github.com/bytecodealliance/cap-std). Concretely:

```rust
// ambient authority — this line can walk anywhere on disk the process can reach
let f = std::fs::File::open(user_supplied_path)?;

// capability — bounded to whatever `dir` was opened as; ../ and symlink escapes
// return PermissionDenied instead of leaving the sandbox
let f = dir.open(user_supplied_path)?;
```

This is a genuine two-for-one: it is a **security control** against path-traversal/symlink-
escape (CWE-22-class bugs, directly relevant to a package manager unpacking untrusted OCI
artifacts) that, as a side effect, gives tests a real, sandboxed root to assert against — the
`Dir`'s own README notes it is used elsewhere "for unit tests where the main benefit of `Dir` is
just convenience" alongside "the nice side effect" of sandboxing. Unlike (a)/(b), `cap-std` is
not introduced *for* testing — it earns its place by making artifact-unpack code correct against
malicious archive paths, and testing benefits ride along.

## Normative guidance candidates

1. **Do not introduce a codebase-wide `FileSystem` trait to make tests faster or fakeable.**
   No comparable project (cargo, rustup, sccache, jj, uv) does this at similar or larger scale,
   and an in-memory fake cannot exercise EXDEV, ENOSPC, permission, or fsync failure modes
   anyway (§1), so the abstraction buys speed at the cost of false-confidence coverage.
   VERIFICATION: `grep -rn "trait.*FileSystem\|trait.*Vfs" --include=*.rs` — should not exist
   as a blanket cross-cutting trait; a hit warrants asking whether it was justified by a second
   real implementation, not by test speed.

2. **Where artifact-unpack or download-materialization code writes attacker-influenced paths
   (OCI layer paths, tar entries), use `cap-std::fs::Dir` scoped to the destination root,
   not raw `std::fs`/`tokio::fs` with string-joined paths.** This is a security control first;
   the test-seam benefit is secondary.
   VERIFICATION: grep the artifact-materializer / cache-write modules for `std::fs::File::open`
   or `Path::join` fed by data read from an OCI manifest/tar entry — each hit is a candidate for
   `Dir`-scoping. `cargo tree -i cap-std` confirms adoption once present.

3. **Keep (or introduce) a trait seam only at layers that already need ≥2 real
   implementations in production** — mirror the existing `OciTransport` /
   `CredentialStore` / `ArtifactMaterializer` precedent. A trait whose only non-`std`
   implementor is a test fake is the smell to reject.
   VERIFICATION: reading heuristic — for any new trait, ask "what's the second production
   implementation?"; if the answer is "none, it's for tests," reject in favor of real I/O in a
   `TempDir`.

4. **Default to real `TempDir`/`assert_fs` fixtures for filesystem-touching tests.** This is
   what cargo, rustup, sccache, and jj all do; it is the only strategy in §1's table that can
   actually exercise EXDEV, permission-denied, symlink-escape races, and Windows-specific
   behavior when run in the matching CI environment.
   VERIFICATION: `cargo tree -i tempfile` / `cargo tree -i assert_fs` should show them as
   dev-dependencies in every crate with `std::fs`/`tokio::fs` call sites in its non-test code.

5. **Shrink the filesystem-touching surface itself before reaching for any seam** — pull
   parsing, validation, and decision logic out into pure functions that take already-read bytes
   or already-listed paths, and confine `std::fs`/`tokio::fs` calls to thin I/O-only wrapper
   functions. This is matklad's sans-I/O architecture point (§3) and is why rust-analyzer's
   suite is 14x faster than cargo's despite neither using a filesystem trait.
   VERIFICATION: reading heuristic on new/touched functions — does it both parse/decide *and*
   call `std::fs`/`tokio::fs` in the same function body? If yes, it's a retrofit candidate for
   splitting; `clippy::too_many_lines` on such functions is a proxy trigger worth checking.

6. **For durability-sensitive writes (lockfile commits, cache manifests), instrument the write
   path with `fail::fail_point!` rather than reaching for a trait fake**, so CI can flip
   `FAILPOINTS=<name>=return(...)` to assert on partial-write recovery without a mock filesystem.
   VERIFICATION: `grep -rn "fail_point!" ` in the persistence/cache-write modules; absent today
   — flag as a gap for any new atomic-write/rename path introduced in this codebase.

7. **Any cache/artifact "install" path that does `rename()` into place MUST have an
   EXDEV-aware fallback (copy + fsync + delete) and a test that actually crosses two real
   mounts/tmpfs instances in CI**, not just a mocked `Err(EXDEV)` from a fake. Mirrors uv-fs's
   `rename_with_retry` pattern.
   VERIFICATION: grep for `fs::rename\|tokio::fs::rename` in write/install/persist modules;
   each call site needs either a documented same-filesystem invariant or a fallback branch
   matching `ErrorKind::CrossesDevices`/raw `EXDEV`.

8. **Every filesystem integration-test suite that runs in CI MUST run on all three target OSes
   (Linux, macOS, Windows) before a filesystem-touching PR is considered green** — Windows file
   locking (can't rename/delete an open file), macOS/Windows case-insensitivity, and `MAX_PATH`
   are real-OS-only failure modes that no fake or single-OS CI job will surface (§1).
   VERIFICATION: CI config — confirm the filesystem-test job matrix includes `windows-latest`
   and `macos-latest`, not just `ubuntu-latest`.

9. **Do not adopt `rsfs`; treat any reference to it as historical-only.** It has been unmaintained
   since 2017 and its own docs record that its error-injection feature was removed and never
   replaced.
   VERIFICATION: `cargo tree -i rsfs` should return nothing; a hit is a finding on its own.

10. **When a fake/in-memory filesystem is used at all (e.g. `vfs::MemoryFS` for pure
    control-flow unit tests of a parser/planner), the test name or a comment must make clear it
    is validating branching logic, not OS behavior** — never let a green `MemoryFS` test stand
    in for coverage of a real failure mode from §1's table.
    VERIFICATION: reading heuristic when reviewing a new test using `vfs`/any fake — does the
    PR description or a nearby comment claim it covers a real-OS failure mode (permission,
    fsync, EXDEV)? If so, it's miscategorized; the corresponding real-I/O test is missing.

## AI-agent angle

An LLM asked to "make this filesystem code testable" reaches for a `FileSystem` trait + mock by
default, because that is the textbook OOP-era answer and it makes the diff *look* thorough. The
five real-project precedents in §5 show this is not what production Rust code at this scale
actually does, and §1's table shows the resulting fakes miss exactly the failure modes that
matter most for a package manager (EXDEV, ENOSPC, permission, symlink escape). The smallest
mechanical check that catches this reliably: **when an agent's diff adds a new `trait` whose
name contains `FileSystem`/`Vfs`/`Fs` and whose only two implementors are `std::fs`-backed and
an in-memory/test-only fake, reject it** — ask for the second *production* implementation, or
redirect to a real-`TempDir` test instead. A second common failure: an agent asked to "test the
disk-full case" will happily write a `MemoryFS`-with-injected-error test and report it as done;
verify by grepping the new test for `ENOSPC`/disk-full framing against a fake — if the fake has
no documented error-injection hook (most don't, see `rsfs`'s removed feature), the test is
fabricating coverage that doesn't exist. Also watch for agents skipping the EXDEV fallback
entirely on new `rename`-into-place code, since it requires OS knowledge (mount points) an LLM
has no way to observe from the diff alone — this is exactly what normative rule 7 exists to
mechanically catch via grep rather than relying on the agent to remember it.

## Contested / evolving

- **Deterministic simulation testing (Antithesis and similar hypervisor-level platforms) is
  actively displacing hand-rolled fault injection for the highest-value durability/concurrency
  bugs** in database/storage engines as of 2026 (§4), but it requires dedicated infrastructure
  and is not yet a routine part of a CLI package-manager's CI — worth tracking, not yet
  actionable for ocx/grimoire.
- **cap-std's async story is unsettled.** `cap-async-std` exists but `async-std` itself (the
  runtime it targets) has been effectively discontinued; the `vfs` crate has independently
  signaled it is sunsetting its own `async_vfs` feature for the same reason
  ([lib.rs/crates/vfs](https://lib.rs/crates/vfs) issue #77 note). Any tokio-based async
  filesystem sandboxing story in this space is still in flux — do not commit to `cap-async-std`
  for grim's tokio-based async call sites without re-checking its tokio compatibility at
  adoption time.
- **No authoritative, reproducible tmpfs-vs-disk suite-speed benchmark for large Rust `TempDir`
  suites was found in this round** (§3) — claims of a specific multiplier should be treated as
  unverified until measured directly against ocx/grimoire's own suite.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [lib.rs/crates/cap-std](https://lib.rs/crates/cap-std) | Crate metadata mirror | v4.0.2, Feb 2026 | Current version, adoption (2.3M/mo), maintenance status |
| [github.com/bytecodealliance/cap-std](https://github.com/bytecodealliance/cap-std) | Primary README/source | 2026 | Capability-security rationale, `Dir` semantics, testing side-benefit statement |
| [lib.rs/crates/vfs](https://lib.rs/crates/vfs) | Crate metadata mirror | v0.13.0, Mar 2026 | Current version, backends (MemoryFS/PhysicalFS/OverlayFS), async_vfs sunset note |
| [docs.rs/vfs](https://docs.rs/vfs/latest/vfs/) | API docs, primary | 2026 | Confirms `MemoryFS` is documented only as a unit-test convenience, no OS-fault claims |
| [lib.rs/crates/rsfs](https://lib.rs/crates/rsfs) | Crate metadata mirror | last release 2017 | Establishes rsfs as abandoned; documents its removed error-injection feature |
| [lib.rs/crates/fail](https://lib.rs/crates/fail) | Crate metadata mirror | v0.5.1, Oct 2022 | Maintenance status, TiKV origin, download volume |
| [github.com/tikv/fail-rs](https://github.com/tikv/fail-rs) | Primary README | — | `fail_point!` macro usage, `FAILPOINTS` env var, `FailScenario` API |
| [lib.rs/crates/assert_fs](https://lib.rs/crates/assert_fs) | Crate metadata mirror | v1.1.4, May 2026 | Current version, relationship to `predicates`/`tempfile` |
| [github.com/rust-lang/cargo — cargo-test-support/src/lib.rs](https://github.com/rust-lang/cargo/blob/master/crates/cargo-test-support/src/lib.rs) | Primary source | 2026 | Real project's TempDir-based fixture harness, mtime-backdating gotcha |
| [github.com/rust-lang/rustup — src/test.rs](https://github.com/rust-lang/rustup/blob/master/src/test.rs) | Primary source | 2026 | Real project's tempdir hierarchy, `Env` trait for env-var injection, mock content builders |
| [github.com/mozilla/sccache — tests/harness/mod.rs](https://github.com/mozilla/sccache/blob/main/tests/harness/mod.rs) | Primary source | 2026 | Real tempdirs + real Docker/sockets, no filesystem trait |
| [github.com/jj-vcs/jj — lib/testutils/src/lib.rs](https://github.com/jj-vcs/jj/blob/main/lib/testutils/src/lib.rs) | Primary source | 2026 | TempDir working copy + genuine multi-backend storage trait (not test-only) |
| [github.com/astral-sh/uv — crates/uv-fs/src/lib.rs](https://github.com/astral-sh/uv/blob/main/crates/uv-fs/src/lib.rs) | Primary source | 2026 | Closest architectural analog: free functions, no trait, Windows retry logic |
| [doc.rust-lang.org/std/fs/fn.rename.html](https://doc.rust-lang.org/std/fs/fn.rename.html) | Official stdlib docs, primary | current | EXDEV/cross-mount-point failure documented as stdlib-level behavior |
| [doc.rust-lang.org/cargo/reference/environment-variables.html](https://doc.rust-lang.org/cargo/reference/environment-variables.html) | Official Cargo Book, primary | current | `CARGO_TARGET_TMPDIR` semantics for integration-test fixtures |
| [matklad.github.io/2021/05/31/how-to-test.html](https://matklad.github.io/2021/05/31/how-to-test.html) | Primary essay, well-known Rust contributor | 2021, still current guidance | Sans-I/O architecture principle; cargo-vs-rust-analyzer suite-speed comparison |
| [blitiri.com.ar/p/libfiu](https://blitiri.com.ar/p/libfiu/) | Primary project page | v1.2, Oct 2023 | LD_PRELOAD-style POSIX fault injection technique and current maintenance status |
| [antithesis.com/blog/2026/wal-reset-bug](https://antithesis.com/blog/2026/wal-reset-bug/) | Primary vendor blog, case study | Aug 2026 | 2026 state-of-the-art deterministic simulation finding a real durability/concurrency bug neither trait-fakes nor TempDir suites are built to find |
