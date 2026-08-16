---
title: Practitioner Blogs and Talks — Rust Topic Survey
agent: landscape-scout-practitioner-blogs
model: sonnet
date_researched: 2026-08
sources_count: 18
scope: >
  Influential practitioner Rust writing (matklad, ryhl.io, corrode.dev,
  predr.ag/cargo-semver-checks, engineering blogs) surveyed for concrete,
  non-obvious guidance not already claimed by the type-architecture,
  error-handling, cli-contract, async, security, testing, tooling-ci,
  performance, docs-observability, ai-agentic-coding, or large-scale-ports
  research waves.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)
7. [Candidate topics](#candidate-topics)

## Summary

1. Cache/memoization APIs should never take `&mut self` — use interior mutability (`RefCell<LruCache<K, Rc<T>>>`, `once_cell`, `elsa`) so callers keep read-only access, or `&mut self` propagates up the whole call graph. (matklad, Caches In Rust)
2. `Path::join(other)` silently **discards the base** and returns `other` unchanged whenever `other` is absolute — a package manager building install paths from registry-supplied names must not trust this to stay inside a root. (corrode, Sharp Edges)
3. Non-UTF8 filenames (Linux) and `OsString` (Windows) round-tripping needs an explicit strategy — lossy, strict, or byte-preserving — chosen deliberately, not defaulted into via `.to_string_lossy()`. (corrode, Bugs Rust Won't Catch)
4. Rust CVEs in reimplementations of existing CLI tools are usually "does something different from the original," not memory unsafety — behavioral parity with the tool/protocol being replaced is itself a security property. (corrode, Bugs Rust Won't Catch)
5. Wrap the API under test in a single `check()` helper function; when a signature changes, one function needs updating, not every test call site. (matklad, How To Test)
6. For large diffs, review the resulting codebase state, not the unified diff — a diff view hides pre-existing issues and makes duplication/dead branches invisible. (matklad, Unified Versus Split Diff)
7. Push `if`s up toward callers (turn runtime checks into preconditions/types) and push `for`s down into batch-oriented APIs (scalar ops become the degenerate case of batch ops). (matklad, Push Ifs Up And Fors Down)
8. Beyond ~10k LOC, use a **flat** `crates/*` workspace layout with a virtual-manifest root, and drive project automation through a dedicated `cargo xtask` crate instead of shell scripts. (matklad, Large Rust Workspaces)
9. Consolidate `tests/*.rs` integration tests into one `tests/it/main.rs` binary — Cargo re-links the library crate per test file, and N files means N link steps; internal-only crates should skip `tests/` entirely and use in-`src/` unit tests. (matklad, Delete Cargo Integration Tests)
10. An error type's size taxes every `Result` return on the Ok path too — `assert_eq!(size_of::<Error>(), N)` in tests, and box large/rare variants (this is exactly why `std::io::Error` is two words wide). (matklad, Study of std::io::Error)
11. `io::Error` carries no path and no backtrace by default — wrap filesystem operations so failures name the file; raw OS errors alone are undebuggable at scale. (matklad, Study of std::io::Error)
12. Cargo's minimal-version-selection (vs SAT/max-ver) has a real security property beyond algorithmic simplicity: every version in your dependency graph was vetted by someone downstream of the original author, and deeper transitive deps require more independent approval steps. (matklad, Minimal Version Selection Revisited)
13. Avoid glob imports and custom preludes in library crates — a glob import can break silently on an unrelated dependency's semver-compliant *minor* bump (new public item added). (corrode, Don't Use Preludes And Globs)
14. `panic = "abort"` vs unwind is a failure-model decision, not a performance knob — abort skips `Drop`, so anything relying on Drop-based cleanup (temp file removal, lock release) needs unwind, or an explicit panic hook that does the cleanup. (corrode, Hardening Rust Code For Production)
15. Every outbound network call needs an explicit timeout and a bounded retry/circuit-breaker policy — "set timeouts on everything external" is stated as a hardening requirement, not an optimization. (corrode, Hardening Rust Code For Production)
16. Graceful shutdown/restart of a long-running process means the old instance keeps handling in-flight work while accepting no new work, with the transition point being a signal (SIGHUP/SIGTERM), not a hard kill. (Cloudflare, Shedding old code with ecdysis)
17. `std::collections::LinkedList` and default-hasher `HashMap`/`HashSet` iteration order are two of Rust's best-known "technically safe, still wrong" footguns — non-deterministic hash order silently breaks reproducible lockfile/manifest output. (corrode, Sharp Edges; general Rust knowledge)
18. `std::sync::Mutex` poisons on panic-while-held — every subsequent `.lock()` fails unless you explicitly `.into_inner()`-recover or switch to a non-poisoning lock (`parking_lot::Mutex`) for code paths where "keep going" beats "hard fail." (corrode, Sharp Edges)
19. `SystemTime` arithmetic/precision is platform-dependent (Windows does not guarantee the same nanosecond floor as Unix); cache/lockfile freshness checks that diff `SystemTime` values need a documented precision floor. (corrode, Sharp Edges)
20. 1 in 31 releases of the top 1,000 crates.io crates ships an accidental semver violation even from careful maintainers — this is framed as a tooling gap, not a discipline failure, and is the argument for running `cargo-semver-checks` mechanically in CI. (Predrag Gruevski, Semver violations are common)

## Findings

### 1. Cache API ownership shape (matklad, Caches In Rust)

matklad's core warning: adding `&mut self` to a cache getter because the compiler suggested it "creates cascading problems throughout a codebase," because most call sites downstream then need `&mut` too, destroying the type-system's read/write distinction. [Caches In Rust](https://matklad.github.io/2022/06/11/caches-in-rust.html)

```rust
// Wrong — poisons every caller with &mut
fn get(&mut self, key: &K) -> &V { ... }

// Right — pick the ownership shape that fits the eviction policy
fn get(&self, key: &K) -> &V;      // append-only, once_cell / elsa::FrozenMap
fn get(&self, key: &K) -> Rc<V>;   // bounded/evicting, RefCell<LruCache<K, Rc<V>>>
```
Directly applicable: OCX/Grimoire's OCI blob/manifest/layer caches are exactly this shape, and the crate is already dominated by free functions — this is a concrete trait/struct seam to add.

### 2. Path handling footguns (corrode, Sharp Edges in the Rust Standard Library)

`Path::join` with an absolute RHS returns the RHS unchanged, discarding the base — a documented but non-obvious behavior. [Sharp Edges](https://corrode.dev/blog/sharp-edges-in-rust-std/)

```rust
let root = Path::new("/var/cache/ocx");
let joined = root.join("/etc/passwd"); // -> "/etc/passwd", NOT under root!
```
For a package manager writing installs/caches from registry-supplied names, this is a path-traversal-adjacent bug class distinct from zip-slip (already covered by the security wave) because it triggers with **no archive involved at all** — just string concatenation of a trusted root and untrusted path component.

The same post recommends `camino::Utf8PathBuf` to avoid `.as_os_str().to_str()` chains, and flags `SystemTime` arithmetic as platform-dependent (`Duration::from_nanos(1)` added to a `SystemTime` "does not always result in '1 nanosecond' on Windows").

### 3. What Rust's type system does not catch (corrode, Bugs Rust Won't Catch)

Concrete categories: TOCTOU across syscalls, path-string-equality missing `/../` resolution, and — most novel here — the three-way choice every OsString→String conversion forces: lossy (silent corruption), strict (crash), or stay in bytes. The post's core claim: "The type system can encode many things, but it cannot encode conditions outside of its control, such as the passage of time between two syscalls." [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

Also notable and genuinely distinct from generic "security" guidance: a survey of real Rust CLI-tool CVEs found most were "the code does something *different* from GNU, and a shell script somewhere relied on the GNU behavior" — i.e., behavioral drift from a reference implementation is itself the vulnerability class, not memory unsafety. Directly relevant to ocx/grim, which reimplement package-manager semantics that other tooling (scripts, CI) depends on matching.

### 4. Test-resilience idiom (matklad, How To Test)

The `check()` idiom: wrap the function under test in one helper so a signature change (e.g. `-> bool` becoming `-> Result<usize, usize>`) requires editing one function, not N test bodies. [How To Test](https://matklad.github.io/2021/05/31/how-to-test.html)

```rust
fn check(input: &str, expected: &str) {
    let actual = my_api::transform(input); // signature changes stay local
    assert_eq!(actual, expected);
}
```
This is a specific micro-pattern the generic "test organisation" coverage in the testing wave is unlikely to name explicitly.

### 5. Review the state, not the diff (matklad, Unified Versus Split Diff)

"For a large change, I don't want to do a 'diff review', I want to do a proper code review of a codebase at a particular instant in time." [Unified vs Split Diff](https://matklad.github.io/2023/10/23/unified-vs-split-diff.html) Relevant to any AI review loop (including this project's own `/code-review`/`hex-review` skills) that operates purely on `git diff` text and can miss issues invisible to a diff view — pre-existing duplication a change merely extends, or dead branches the diff doesn't touch.

### 6. Push ifs up, push fors down (matklad)

"If there's an `if` condition inside a function, consider if it could be moved to the caller instead" — centralizes branching so redundant/dead conditions become visible; loops should default to batch operations with scalar ops as the degenerate case, both for clarity and for vectorization headroom. [Push Ifs Up And Fors Down](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html)

```rust
// Pushed down (harder to see duplication, checked every iteration)
fn process(items: &[Item]) {
    for item in items {
        if item.enabled { do_work(item); }
    }
}
// Pushed up (precondition is explicit, filter once)
fn process(items: impl Iterator<Item = Item>) {
    for item in items.filter(|i| i.enabled) { do_work(item); }
}
```

### 7. Workspace layout at scale (matklad, Large Rust Workspaces)

Flat `crates/*` beats nested hierarchy past ~10k LOC because "hierarchical structures tend to deteriorate over time, while flat structure doesn't need maintenance." Root is a virtual manifest (`members = ["crates/*"]`); folder names match crate names exactly; project automation lives in a dedicated `cargo xtask` crate, not shell scripts; unpublished internal crates use `version = "0.0.0"`. [Large Rust Workspaces](https://matklad.github.io/2021/08/22/large-rust-workspaces.html) Directly actionable against the stated pain point ("nearly one crate; dominated by free-standing functions").

### 8. Integration-test compile blowup (matklad, Delete Cargo Integration Tests)

Each file under `tests/` is a separate binary that re-links the library crate; consolidating into `tests/it/main.rs` (one binary, `mod` per file) cut a real project's test-suite compile time 3x and on-disk artifact size 5x. Internal (non-published) crates should skip `tests/` and use `#[cfg(test)] mod tests` inside `src/` instead. [Delete Cargo Integration Tests](https://matklad.github.io/2021/02/27/delete-cargo-integration-tests.html)

### 9. Error type size and context (matklad, Study of std::io::Error)

`assert_eq!(size_of::<io::Error>(), 2 * size_of::<usize>())` — "you pay for it even if there are no errors," because the size of `Result<T, E>` is driven by `size_of::<E>()` on every call site. `io::Error` boxes its `Custom` variant to stay small, at the cost of double indirection. It also carries no path context ("you don't know which path it has failed for") and no backtrace. [Study of std::io::Error](https://matklad.github.io/2020/10/15/study-of-std-io-error.html) — this sharpens the already-covered error-handling guidance into two mechanically checkable rules: bound the size, attach the path.

### 10. Minimal version selection as a supply-chain property (matklad)

Against the "min-ver is simpler, max-ver is NP-hard" straw man — both resolve via greedy algorithms; the real difference is that MVS gives "any version in your dependency graph is additionally vetted manually by someone who is *not* the original library developer," since deep transitive deps require an explicit approval step from an intermediate maintainer. The post's proposal — checksum-pinned manifests that transitively lock without a separate lockfile — is directly relevant to ocx/grim's own lockfile design. [Minimal Version Selection Revisited](https://matklad.github.io/2024/12/24/minimal-version-selection-revisited.html)

### 11. Preludes and glob imports (corrode)

"Unless you write a highly critical framework... don't add a prelude." A glob import can break on a dependency's semver-compliant minor bump because adding a new public item is allowed under semver, and that item can collide. [Don't Use Preludes And Globs](https://corrode.dev/blog/dont-use-preludes-and-globs/)

### 12. Production hardening checklist (corrode, Hardening Rust Code For Production)

Panic behavior is "part of your system's failure model" — decide `panic = "abort"` vs unwind deliberately, since abort skips `Drop` (breaks any RAII cleanup: temp files, lock guards). Other concrete items: `cargo-audit`/`cargo-deny` in CI, `mimalloc` with `features = ["secure"]`, `cargo +nightly miri test`, bounded channels sized explicitly (`mpsc::channel::<Job>(1000)`), timeouts on "everything external," distroless containers, Landlock sandboxing, and signal handling for graceful `SIGTERM`/`SIGINT`. [Hardening Rust Code For Production](https://corrode.dev/blog/hardening-rust/)

### 13. Graceful process transitions (Cloudflare, ecdysis)

Fork-exec model for zero-downtime restarts: child inherits listening sockets via a named pipe, parent keeps draining in-flight connections while the child initializes, and "if the child fails during initialization, the parent never stopped listening... the upgrade can be retried." [Shedding old code with ecdysis](https://blog.cloudflare.com/ecdysis-rust-graceful-restarts/) Server-shaped, but the underlying principle — never let interruption produce a state worse than either "fully old" or "fully new" — is exactly the property ocx/grim need for Ctrl-C during a download/extract/lockfile-write sequence.

### 14. Empirical semver-violation rate (Predrag Gruevski)

Across 14,389 releases of the top 1,000 crates.io crates: 3.22% of releases (1 in 31) had at least one semver violation, 17.2% of crates violated semver at least once across their history; top violation categories were exhaustive enum/struct changes, removed public items, and lost auto-trait impls (`Send`/`Sync`). [Semver violations are common, better tooling is the answer](https://predr.ag/blog/semver-violations-are-common-better-tooling-is-the-answer/) — this specific tool (`cargo-semver-checks`) is already named in the testing wave's scope; included here only as the empirical case for *why* it must run in CI, not as a new topic.

## Normative guidance candidates

1. **Never write `&mut self` on a cache/memoization getter.** Use `RefCell`/`once_cell`/`elsa` and return `&T`, `T: Clone`, or `Rc<T>` instead. *Rationale:* `&mut self` forces every caller up the chain to take `&mut`, destroying read/write distinction for no reason tied to the actual mutation. *Verification:* `grep -rn "fn get.*&mut self.*->.*&" src/` in any module named `*cache*`; a cache getter returning a reference and requiring `&mut self` is the smell.

2. **Never build a filesystem path by `.join()`-ing a base with an untrusted/registry-supplied component without first asserting it's relative.** *Rationale:* `Path::join` silently discards the base when the argument is absolute — a config/package name from ghcr.io that happens to be `/etc/foo` escapes the intended root. *Verification:* `grep -rn "\.join(" src/ | grep -v "#\[cfg(test)\]"` then manually check whether the joined component's provenance is trusted; add a `debug_assert!(component.is_relative())` at the join site as a mechanical guard.

3. **Attach the path to every `io::Error` returned from a filesystem operation.** *Rationale:* raw `io::Error` never carries the path; a batch of 500 file operations failing with "No such file or directory" and no filename is undebuggable. *Verification:* clippy does not catch this — grep for bare `?` after `std::fs::` calls not wrapped in a `.with_context(|| path)`/`.map_err` that includes the path; enforce via a project lint rule or a thin `fs` wrapper module that always attaches path context.

4. **Bound every custom error type's size and assert it in a test.** *Rationale:* `size_of::<E>()` taxes every `Result<T, E>` on the Ok path, not just the Err path. *Verification:* `assert!(std::mem::size_of::<MyError>() <= 32)` (or similar budget) as a unit test; re-run on every new variant.

5. **Consolidate `tests/*.rs` into `tests/it/main.rs` for any crate published or with >3 integration test files; use in-`src/` `#[cfg(test)]` modules for everything internal.** *Rationale:* each file under `tests/` is a separate binary re-linking the whole library crate — real measured cost was 3x compile time, 5x artifact size. *Verification:* `ls tests/*.rs | wc -l` — more than one file outside `tests/it/` in a workspace crate is the trigger to consolidate; `cargo build --tests --timings` before/after to confirm.

6. **Push `if`s toward the caller, push `for`s toward batch APIs.** *Rationale:* concentrating branching logic in one place makes redundant/dead conditions visible; batch-first loop APIs give callers and the optimizer more freedom. *Verification:* reading heuristic during review — a private helper function with an internal `if` that every caller passes the same literal for is a hoist candidate; a public API taking a single item where every real caller has a collection is a batch-API candidate.

7. **Flat `crates/*` workspace layout past ~10k LOC; drive automation via `cargo xtask`, not shell scripts.** *Rationale:* nested hierarchies "deteriorate over time," flat lists don't; `xtask` gets the whole Rust toolchain (types, tests, cross-platform) for what would otherwise be untested bash. *Verification:* `find . -maxdepth 3 -name Cargo.toml | grep -v '^./crates/[^/]*/Cargo.toml$'` should return only the root — anything nested deeper than one level under `crates/` is a layout violation. Directly actionable against this project's near-single-crate structure.

8. **Never `.to_string_lossy()` a path/OsString without a comment justifying silent corruption is acceptable at that call site.** *Rationale:* lossy conversion silently mangles non-UTF8 filenames (real on Linux, common enough on Windows with certain locales); a package manager copying/moving files needs an explicit strict-vs-lossy decision, not a default. *Verification:* `grep -rn "to_string_lossy\|to_str().unwrap()" src/` — every hit needs either a `// lossy-ok:` comment or replacement with `camino`/explicit error handling.

9. **`panic = "abort"` requires re-auditing every `Drop` impl relied on for cleanup (temp files, lock files, partial-write guards) before enabling it.** *Rationale:* abort skips unwinding, so RAII cleanup that assumes `Drop` runs on panic silently stops running. *Verification:* `grep -n 'panic = "abort"' Cargo.toml`; if present, grep for `impl Drop for` across the crate and manually confirm each is not the sole cleanup mechanism for a resource that must survive an abort.

10. **Every outbound HTTP/OCI registry call carries an explicit timeout and a bounded retry count.** *Rationale:* stated as a hardening baseline ("set timeouts on everything external"); an unbounded retry loop or missing timeout against ghcr.io hangs the CLI with no user-visible failure. *Verification:* grep the HTTP client construction (`reqwest::Client::builder()` or equivalent) for `.timeout(`; absence is the finding. For retries, grep for retry/backoff crate usage (`backoff`, `tower::retry`) and confirm a max-attempts bound exists.

11. **Sort or use an ordered map (`BTreeMap`/`IndexMap`) anywhere a `HashMap`/`HashSet` feeds into lockfile, manifest, or SBOM output.** *Rationale:* default hasher iteration order is randomized per-process; two runs over identical inputs producing different lockfile byte content breaks reproducibility and diff-based review/CI caching. *Verification:* grep for `HashMap`/`HashSet` in any module that serializes to a file (`serde::Serialize` derive nearby, or a `write!`/`fs::write` in the same function) — each hit needs either a `.sort()` before serialization or a swap to `BTreeMap`.

12. **Decide the poisoning policy for every `std::sync::Mutex` up front: recover via `.into_inner()`, or replace with `parking_lot::Mutex`.** *Rationale:* a panic while holding a std `Mutex` poisons it, and every subsequent `.lock()` returns `Err` by default — an unhandled `.lock().unwrap()` after a poison turns one panic into a permanently-broken process. *Verification:* `grep -rn "\.lock()\.unwrap()" src/` — each is a candidate for either explicit poison-recovery or a switch to `parking_lot`.

## AI-agent angle

- **Cache `&mut self` creep**: an LLM asked to "fix a borrow error" on a cache getter will almost always add `&mut self` and propagate it outward rather than reaching for interior mutability — the smallest mechanical check is grepping for cache/memoization structs whose public methods take `&mut self` and return a reference.
- **`Path::join` misuse**: LLMs treat `.join()` as pure string concatenation and never consider the absolute-path short-circuit; any AI-written code that joins a fixed root with a variable (especially one sourced from a registry response, env var, or CLI arg) needs the `debug_assert!(component.is_relative())` guard above as an automatic check, since nothing in clippy flags this.
- **Diff-only review blind spot**: an automated review loop (including this project's own `/code-review`) that only reads `git diff` output will miss issues matklad's "review the state, not the diff" argues for — pre-existing duplication a change extends, or a branch the diff doesn't touch. The mechanical fix is cheap: for changes to a function, also run the reviewer over the *whole* changed function body (not just the diff hunk), not just the `+`/`-` lines.
- **HashMap-into-serialized-output**: LLMs default to `HashMap` for any key-value need and rarely think about downstream serialization determinism; the check is mechanical (grep above) and should run whenever a PR touches lockfile/manifest-writing code.
- **Glob-import shortcuts**: an agent iterating quickly will reach for `use crate::prelude::*;` or `use super::*;` outside test modules to avoid writing import lists — `grep -rn "use .*::\*;" src/ --include=*.rs | grep -v "mod tests"` catches it in one line and is a good `[lints]`-table or CI-grep candidate.
- **Panic-strategy blindness**: an agent adding `panic = "abort"` to shave startup time or binary size (a common "hardening" suggestion) without cross-checking `impl Drop` usage will silently break cleanup-on-panic; this is not caught by clippy or the type system and needs the manual audit in guidance rule 9.

## Contested / evolving

- **Minimal version selection vs SAT-based resolution**: matklad's 2024 post is itself a *correction* of an earlier, more common argument (min-ver "wins" because SAT is NP-hard) — he argues that framing is wrong and the real tradeoff is supply-chain trust, not algorithmic complexity. Treat any older post repeating the NP-hardness argument as superseded.
- **Prelude/glob-import guidance is a minority position relative to ecosystem practice**: many popular crates (bevy, diesel) *do* ship a `prelude` module and it's broadly accepted for those specific ergonomics-critical libraries; corrode's post narrows the recommendation to "don't do this unless you're a highly critical framework with universally-needed types" rather than a blanket ban — a security-sensitive CLI tool like ocx/grim is squarely in the "don't" camp, not the exception.
- **`panic = "abort"` as a hardening default is trending, but contested for CLI tools specifically**: server/embedded hardening posts increasingly recommend abort (smaller binaries, no unwind-tables attack surface), but this is in real tension with CLI tools that rely on `Drop` guards for temp-file/lock cleanup — no source surveyed resolves this cleanly for the CLI case; it needs an explicit project-level decision, not a copy-pasted default.
- **`parking_lot::Mutex` vs std `Mutex` poisoning**: std's Mutex poisoning behavior itself is under active discussion in the Rust project (proposals exist to make lock-poisoning opt-in or provide a non-poisoning std type); as of edition 2024 this is still the status quo, but treat this as a rule likely to shift within std itself.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [matklad — Large Rust Workspaces](https://matklad.github.io/2021/08/22/large-rust-workspaces.html) | Blog post | Aug 2021 | Concrete flat-`crates/*` + `xtask` layout convention from rust-analyzer's author |
| [matklad — How To Test](https://matklad.github.io/2021/05/31/how-to-test.html) | Blog post | May 2021 | `check()` idiom, sans-io testability, data-oriented test design |
| [matklad — Unified Versus Split Diff](https://matklad.github.io/2023/10/23/unified-vs-split-diff.html) | Blog post | Oct 2023 | Argues for reviewing final state over diff hunks |
| [matklad — Push Ifs Up And Fors Down](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html) | Blog post | Nov 2023 | Control-flow shaping heuristic, directly LLM-relevant |
| [matklad — Delete Cargo Integration Tests](https://matklad.github.io/2021/02/27/delete-cargo-integration-tests.html) | Blog post | Feb 2021 | Measured compile-time cost of `tests/*.rs` fan-out |
| [matklad — Caches In Rust](https://matklad.github.io/2022/06/11/caches-in-rust.html) | Blog post | Jun 2022 | Ownership-shape rules for cache APIs, directly applicable to OCI blob caches |
| [matklad — A Study of std::io::Error](https://matklad.github.io/2020/10/15/study-of-std-io-error.html) | Blog post | Oct 2020 | Error-type size discipline and path-context gap |
| [matklad — Minimal Version Selection Revisited](https://matklad.github.io/2024/12/24/minimal-version-selection-revisited.html) | Blog post | Dec 2024 | Supply-chain argument for MVS over SAT-based resolvers |
| [Alice Ryhl — Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/) | Blog post | 2021 | Canonical actor-pattern writeup (confirms rust-async wave's existing coverage) |
| [Alice Ryhl — Async: What Is Blocking?](https://ryhl.io/blog/async-what-is-blocking/) | Blog post | 2023 | `spawn_blocking`/rayon/dedicated-thread decision tree (confirms async wave coverage) |
| [corrode — Sharp Edges In The Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/) | Blog post | 2025-2026 era | `Path::join`, `LinkedList`, `SystemTime`, `camino` — std footguns |
| [corrode — Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/) | Blog post | 2025-2026 era | TOCTOU, OsString conversion, behavioral-parity CVE pattern |
| [corrode — Don't Use Preludes And Globs](https://corrode.dev/blog/dont-use-preludes-and-globs/) | Blog post | 2025-2026 era | Semver-fragility argument against glob imports |
| [corrode — Hardening Rust Code For Production](https://corrode.dev/blog/hardening-rust/) | Blog post | 2025-2026 era | Panic strategy, allocator hardening, timeouts-on-everything checklist |
| [Predrag Gruevski — Semver violations are common, better tooling is the answer](https://predr.ag/blog/semver-violations-are-common-better-tooling-is-the-answer/) | Blog post | 2023-2024 era | Empirical semver-violation rate across crates.io top 1000 |
| [Cloudflare — Shedding old code with ecdysis](https://blog.cloudflare.com/ecdysis-rust-graceful-restarts/) | Engineering blog | Feb 2026 | Zero-downtime restart / connection-draining pattern in Rust |
| [Astral — engineering blog index](https://astral.sh/blog) | Blog index | 2024-2026 | uv/ruff performance & packaging posts (index only, referenced for scope) |
| [Predrag Gruevski — blog index (predr.ag)](https://predr.ag/blog/) | Blog index | 2023-2025 | Full cargo-semver-checks post series for cross-reference |

## Candidate topics

| candidate topic | why it matters | source | already-covered? | priority |
|---|---|---|---|---|
| cache-ownership-not-mut-self | Cache/memoization getters must expose `&self`, never `&mut self`, via interior mutability — a direct, applicable fix for OCX's OCI blob/manifest cache design | matklad, Caches In Rust | no | high |
| path-join-absolute-silently-wins | `Path::join` with an absolute RHS silently discards the base — a path-escape bug class distinct from zip-slip that needs no archive at all | corrode, Sharp Edges | no | high |
| osstring-non-utf8-roundtrip | Non-UTF8 filenames/Windows OsString need a deliberate lossy/strict/bytes conversion strategy, not `.to_string_lossy()` by default | corrode, Bugs Rust Won't Catch | no | high |
| behavior-parity-with-reference-tool | Reimplemented-tool CVEs are usually behavioral drift from the original, not memory unsafety — ocx/grim replicate npm/OCI/cargo semantics that scripts depend on | corrode, Bugs Rust Won't Catch | no | medium |
| camino-utf8-paths | `camino::Utf8PathBuf` avoids `.as_os_str().to_str()` chains for the heavy path-manipulation code in a package manager | corrode, Sharp Edges | partial | medium |
| check-idiom-test-harness | Wrap the API under test in one `check()` helper so signature churn touches one function, not every test | matklad, How To Test | partial | medium |
| review-final-state-not-diff | Automated review loops (including this project's `/code-review`) that read only `git diff` miss issues visible only in the resulting whole-function state | matklad, Unified Versus Split Diff | no | medium |
| push-ifs-up-fors-down | Hoist conditionals to callers/preconditions, push loops into batch-oriented APIs — LLM-generated code habitually does the opposite | matklad, Push Ifs Up And Fors Down | no | high |
| flat-workspace-layout | Flat `crates/*` + `cargo xtask` automation directly addresses this project's "nearly one crate, free-function-dominated" pain point | matklad, Large Rust Workspaces | partial | high |
| tests-it-single-binary | Consolidating `tests/*.rs` into one harness binary avoids measured 3x compile-time / 5x artifact-size blowup | matklad, Delete Cargo Integration Tests | partial | medium |
| bounded-error-type-size | Error type size taxes every `Result` return on the Ok path — assert `size_of::<Error>()` stays bounded, box rare/large variants | matklad, Study of std::io::Error | partial | medium |
| path-context-on-io-errors | Raw `io::Error` never carries the path that failed — a package manager doing hundreds of fs ops needs this for debuggability | matklad, Study of std::io::Error | no | high |
| mvs-dependency-resolution-literacy | Understanding MVS resolution semantics matters both for debugging Cargo lockfile issues and for designing ocx/grim's own registry-version resolver | matklad, Minimal Version Selection Revisited | partial | medium |
| glob-import-semver-risk | Glob imports/preludes can break silently on a dependency's semver-compliant minor bump; grep-able anti-pattern | corrode, Don't Use Preludes And Globs | partial | low |
| panic-strategy-as-failure-model | `panic = "abort"` vs unwind is a Drop-cleanup decision (temp files, lock guards), not a performance knob — needs explicit project-level choice | corrode, Hardening Rust Code | partial | high |
| interrupt-safe-resumable-installs | Ctrl-C/SIGTERM mid-download-or-extract must leave no partially-written cache/lockfile state; build-in-temp-then-atomic-rename is the pattern | Cloudflare, ecdysis + corrode, Hardening | no | high |
| retry-timeout-registry-calls | Every outbound OCI/ghcr.io HTTP call needs an explicit timeout and bounded retry/circuit-breaker, or the CLI hangs indefinitely | corrode, Hardening Rust Code | partial | high |
| hashmap-ordering-determinism | Default HashMap/HashSet iteration order is randomized per-process — lockfile/manifest/SBOM output needs sorted or `BTreeMap`/`IndexMap` sources | corrode, Sharp Edges (general Rust knowledge) | no | high |
| mutex-poisoning-recovery-policy | A panic while holding `std::sync::Mutex` poisons it for every future locker — decide recovery policy or switch to `parking_lot` up front | corrode, Sharp Edges | no | medium |
| thread-scope-over-manual-join | `std::thread::scope` over manual `thread::spawn`+forgotten-`.join()` for non-tokio parallel fs/CPU work (e.g. parallel checksum verification) | corrode, Sharp Edges | no | low |
| linkedlist-footgun-general | `LinkedList` (and by extension any "obviously right" non-Vec collection pick) is almost always the wrong structural choice vs Vec/VecDeque | corrode, Sharp Edges | no | low |
| systemtime-cross-platform-quirks | `SystemTime` precision/arithmetic is platform-dependent; cache/lockfile freshness checks need a documented precision floor, not raw diffing | corrode, Sharp Edges | no | medium |
| self-consistent-config-grammar | When designing grim.toml/lockfile grammar, keep syntactic categories unambiguous from context alone — avoid accumulating silent special-case exceptions | matklad, Almost Rules | no | low |
| graceful-drain-not-hard-kill | Long-running or batch operations should let in-flight work finish while accepting no new work at the signal boundary, rather than hard-killing mid-write | Cloudflare, ecdysis | partial | medium |
