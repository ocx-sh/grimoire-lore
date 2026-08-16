---
title: Antipatterns and Postmortems — Rust Failure Corpus Survey
agent: landscape-scout-antipatterns
model: sonnet
date_researched: "2026-08"
sources_count: 12
scope: >
  Cross-cut of catalogued Rust anti-patterns, real reviewer objections in
  production repos, and postmortem-style writeups of what actually breaks —
  scoped to what a security-sensitive, cross-platform, filesystem-heavy Rust
  CLI package manager (grim / ocx) written largely by AI agents needs to
  avoid. Excludes topics already assigned to sibling research waves
  (type architecture, error handling, CLI contract, async, security,
  testing, tooling/CI, performance, docs/observability, AI-agentic coding,
  large-scale ports) unless a genuinely distinct sub-topic surfaced.
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

1. `.clone()` used to silence the borrow checker is the single most-cited Rust anti-pattern in the wild — it doesn't fail loudly, it just decouples state, and LLM-generated Rust reaches for it by default.
2. `Path::join(absolute)` silently **discards the base path** and returns the absolute argument — a footgun that bites path-composition code in package managers specifically.
3. Converting `Path`/`OsStr` to `String` via `.to_string_lossy()` **silently corrupts** non-UTF-8 filenames (replaces bytes with U+FFFD) instead of erroring — dangerous in a tool that must round-trip arbitrary filenames from tarballs/registries.
4. TOCTOU on paths (check-then-open, or "create then chmod") is a real, repeatedly-audited bug class in Rust CLI tools (uutils coreutils audit found it live in shipped code) — safe Rust does not prevent it.
5. Integer overflow silently **wraps in release builds** (only panics in debug) — arithmetic on sizes, offsets, and counts from untrusted registry/manifest data is a live risk, not a hypothetical.
6. `#[derive(Debug)]` on a struct holding a credential/token prints it in plaintext — and `Debug` output routinely ends up in logs and error messages in production.
7. Deriving `Default` on config-shaped structs produces semantically-invalid zero values (`port: 0`, empty required strings) that pass type-checking as valid.
8. Boolean-plus-`Option` fields that can disagree (`ssl: bool` + `ssl_cert: Option<String>`) let invalid states compile; make the invalid combination unrepresentable with an enum instead.
9. `thread::spawn` without `.join()` silently drops on scope exit without running cleanup — `std::thread::scope` (stable since 1.63) removes the whole footgun class.
10. `std::time::SystemTime`/`Instant` precision and monotonicity guarantees vary by OS — code that assumes nanosecond precision or leap-second behavior breaks cross-platform silently.
11. Never hold a `std::sync::MutexGuard` (or any lock guard) across an `.await` point — restructure to drop it before awaiting, or use `tokio::sync::Mutex` only when genuinely required.
12. "Push ifs up, fors down": centralize branching in callers (not callees) and hoist invariant checks out of loops — both a readability and a correctness heuristic (fewer scattered branch copies to get wrong).
13. Reimplementing an existing tool's behavior (uutils vs GNU coreutils) breaks callers when edge-case behavior silently diverges — behavioral parity with an established convention is a spec, not a suggestion.
14. Aggregating partial failures across a batch (multi-file/multi-package operations) is routinely done wrong: returning only the last error/exit code, or swallowing failures with `.ok()`.
15. `Deref` used to fake inheritance between unrelated structs is explicitly called out as misuse — it breaks trait-bound expectations and reader intuition; prefer explicit delegation.
16. `HashMap` iteration order is randomized per-process — any code that lets that order leak into user-visible output (lockfile serialization, `--json`, diffs) produces nondeterministic artifacts across runs.
17. Newtype-wrap primitives that carry domain meaning (usernames, digests, versions, paths) and validate in the constructor — "stringly typed" signatures are consistently flagged as a missing-abstraction smell.
18. Serde `#[serde(default)]` on required security-relevant fields silently accepts malformed/empty input; prefer `#[serde(try_from = "...")]` with a validating `TryFrom`.
19. Unbounded input (no size cap before decode/decompress) is a denial-of-service vector — this matters directly for OCI blob/manifest downloads and archive extraction (decompression-bomb class).
20. Cross-platform breakage clusters around a small set of repeat offenders: path length limits, case-(in)sensitivity, files locked-open blocking delete/rename on Windows, reserved device names (`CON`, `NUL`, `AUX`), and `\r\n` vs `\n` splitting.

## Findings

### 1. `.clone()`-to-satisfy-the-borrow-checker is the flagship anti-pattern

The official Rust Design Patterns book gives this its own dedicated anti-pattern page — using `.clone()` to make a borrow error disappear rather than restructuring ownership. The two values then evolve independently with no compiler warning that they've diverged. The book's own caveat is telling: it's tolerated for prototypes, but is explicitly a smell in production code. Detection: `cargo clippy` flags many but not all instances (`redundant_clone`); the rest require a human/LLM to notice a `.clone()` that exists only to dodge an error, not to express real shared ownership.
[Clone to satisfy the borrow checker](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html)

### 2. `Deref` misused to fake inheritance

Wrapping struct `Bar { f: Foo }` and implementing `Deref<Target = Foo>` so `Bar`'s methods "inherit" `Foo`'s is explicitly documented as a misuse of the trait — `Deref` is for smart-pointer semantics, not OOP-style inheritance. It also doesn't give you real subtyping: trait bounds on `Foo` don't apply to `Bar`, so generic code still breaks. Prefer explicit delegation methods or a delegation-generating macro/crate.
[Deref polymorphism anti-pattern](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html)

### 3. Path handling: three separate, well-documented footguns

- `Path::join()` silently discards the receiver and returns the argument unchanged if the argument is absolute — `Path::new("/usr").join("/local/bin")` yields `/local/bin`, not `/usr/local/bin`. No panic, no warning.
- `OsStr → String` conversion has no lossless path in the general case; the tempting shortcut `.to_string_lossy()` replaces invalid UTF-8 bytes with `U+FFFD`, silently corrupting the very filenames a package manager needs to round-trip byte-for-byte.
- Comparing paths as strings (`path == Path::new("/")`) misses semantically-equal forms reachable via `..`, `.`, or a resolving symlink — a real, exploitable class found live in shipped Rust CLI tools during a security audit of uutils coreutils.

[Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/), [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

```rust
// wrong: silently corrupts non-UTF-8 filenames from an untrusted archive
let name = entry_path.to_string_lossy().into_owned();

// right: fail loud, or use camino/OsStr end-to-end and only error at the boundary
let name = entry_path
    .to_str()
    .ok_or_else(|| Error::NonUtf8Path(entry_path.to_path_buf()))?;
```

### 4. TOCTOU and permission-race windows are real in safe Rust, not just C

Two distinct shapes, both audited as live bugs in production Rust CLI tools:
- **Classic TOCTOU**: check a path's metadata, then act on the path separately — an attacker (or just a concurrent process) swaps a symlink in the gap. `if !path.is_dir() { return Err(..) } ; remove_dir_impl(path)` — the directory can become a symlink to `/etc` between the check and the removal.
- **Insecure-default-then-fix window**: `File::create(path)` (default permissions) followed by a later `set_permissions` call to tighten them leaves a window where any other local user/process can open the file with the too-permissive default mode.

Fix pattern for both: open/create the resource once via a handle, and perform every subsequent check/permission-set operation *on that open handle* (`file.metadata()`, `file.set_permissions()`), never by re-resolving the path.
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/), [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

### 5. Integer overflow wraps silently in release builds

Rust panics on overflow in debug builds but **wraps silently in release** by default — a check that "worked in dev" ships broken. This is a live, tracked concern: rust-clippy has an open issue specifically requesting a stronger lint for this class because the current coverage (`arithmetic_side_effects`, off by default; debug-assertions catch nothing in release) leaves a gap.
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/), [clippy#12503 — lint for integer overflow, especially in release mode](https://github.com/rust-lang/rust-clippy/issues/12503)

```rust
// wrong: wraps in release, panics in debug — divergent behavior by build profile
fn total_bytes(count: u32, size: u32) -> u32 { count * size }

// right: explicit about the failure mode
fn total_bytes(count: u32, size: u32) -> Option<u32> { count.checked_mul(size) }
```

### 6. `Debug`-derive leaks secrets; `Default`-derive produces invalid configs

Deriving `Debug` on any struct holding a token, password, or API key prints it in plaintext — and `Debug` output is exactly what ends up in `{:?}` logging and panic messages in production. Deriving `Default` on a config struct silently produces zero-valued fields (`port: 0`) that type-check but are never a valid runtime configuration. Both are "the derive compiles, therefore it's fine" traps.
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/)

```rust
// wrong
#[derive(Debug)]
struct Credentials { token: String }

// right — redact explicitly, don't rely on the derive
struct Credentials { token: String }
impl std::fmt::Debug for Credentials {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Credentials").field("token", &"[REDACTED]").finish()
    }
}
```

### 7. Invalid state combinations from independent optional fields

`struct Configuration { ssl: bool, ssl_cert: Option<String> }` admits `ssl: true, ssl_cert: None` — a state with no valid meaning, but the compiler accepts it. The recurring fix, catalogued repeatedly in the failure corpus, is collapsing the two into one enum so the invalid combination has no representation:
```rust
enum ConnectionSecurity { Insecure, Ssl { cert_path: String } }
```
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/)

### 8. `thread::spawn` without `.join()`, and `std::thread::scope`

A spawned `std::thread::Handle` that is dropped without `.join()` does not run any of the thread's cleanup guarantees before the parent proceeds — "manually calling `.join().unwrap()` is a chore and easy to forget," and nothing in the type system forces it. `std::thread::scope` (stable) structurally joins every spawned thread before returning, closing the class rather than relying on discipline.
[Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/)

### 9. `SystemTime`/`Instant` platform variance

`std::time::SystemTime` nanosecond arithmetic is not reliably nanosecond-precise cross-platform — Windows clock resolution differs from Linux/macOS, so `now + Duration::from_nanos(1)` does not reliably read back as `+1ns` on every OS. `Instant` wraps an OS-specific monotonic source with only weak documented guarantees. Code that assumes uniform precision or monotonic-across-suspend behavior breaks only on the platform nobody tested. For anything beyond `thread::sleep`, reach for `jiff` or `time`, not raw `std::time` arithmetic.
[Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/)

### 10. Never hold a lock guard across `.await`

`std::sync::MutexGuard` is `!Send`, so the compiler rejects holding it across an await point outright when it would move across a task boundary — but code can still deadlock or serialize an entire async runtime by holding the guard across CPU-bound work between two awaits in the same task. Tokio's own tutorial is explicit: restructure the code so the guard's destructor runs before the `.await`, encapsulate locking inside synchronous helper methods, or route mutation through a dedicated task via message-passing instead of shared-state locking. Reach for `tokio::sync::Mutex` only when a lock genuinely must survive a suspension point; it is not a drop-in "fixes the compile error" substitute for `std::sync::Mutex`.
[Tokio tutorial — Shared State](https://tokio.rs/tokio/tutorial/shared-state)

### 11. "Push ifs up, fors down" — a mechanical code-shape heuristic

matklad's rule, distilled from years of rust-analyzer review: move `if`/early-return branching **up**, out of small callees and into the caller (`fn frobnicate(walrus: Walrus)` instead of `fn frobnicate(walrus: Option<Walrus>)` with an internal early-return) — centralizing branches makes redundant or dead branches visible in one place instead of scattered across the call graph. Conversely, push loops **down** — evaluate a condition once outside a loop rather than re-checking it per iteration, which both removes a per-item branch and opens vectorization. This is one of the few *mechanical* review heuristics in the corpus: "does this function take an `Option`/`Result` just to immediately branch on it and return early?" is grep-able by a reviewer or an agent.
[Push Ifs Up and Fors Down](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html)

### 12. Reimplementation behavioral divergence and swallowed batch errors

A 2026 security audit of `uutils` (a from-scratch Rust reimplementation of GNU coreutils) surfaced a durable lesson for any Rust CLI that stands in for an established tool or convention: silent behavioral divergence breaks every caller downstream that depended on the old behavior (`kill -1` sending to all processes instead of PID 1's signal, because a flag-parsing edge case diverged from GNU's). The same audit found batch/partial-failure handling done wrong repeatedly: `chmod -R` returning only the *last* file's exit code instead of the worst one across the whole tree; `dd` silently writing a truncated file on a full disk rather than erroring. Both are instances of the same root cause — using `.ok()` or a single scalar return to summarize N independent outcomes.
[Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

### 13. Newtype validation vs. "stringly typed" signatures

The corpus repeatedly converges on the same fix for primitive-obsession bugs (unvalidated `String` usernames, unbounded `f64` distances, raw `u16` ports): wrap in a newtype with a validating constructor (`Username::new`, `Distance::new`) so illegal values cannot reach business logic at all. A parallel, less obvious variant: a function signature built entirely out of `String`/`&str`/`Vec<String>` for what is actually a small closed set of variants ("stringy-typed" code) is itself a code smell indicating a missing enum/struct, independent of whether any individual string is ever invalid.
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/), [When Rust Gets Ugly](https://corrode.dev/blog/ugly/)

### 14. Serde derive footguns on security-relevant fields

`#[serde(default)]` on a field that is actually required (e.g. `username`) makes deserialization silently accept its absence as an empty string rather than a parse error. The corpus's fix is `#[serde(try_from = "String")]` paired with a validating `TryFrom` impl, pushing validation into the type constructor instead of leaving it to be remembered at every call site that deserializes the struct.
[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/)

### 15. Lifetime misconceptions that leak into API design

Two misconceptions from the corpus directly shape public API shape, not just internal code: (a) `T: 'static` is misread as "must be known at compile time" when it actually means "contains no non-'static borrows" — this changes whether a function should accept owned data, `Arc<T>`, or a trait object; (b) re-borrowing a `&mut T` as `&T` silently extends the *mutable* borrow's lifetime to match the shared reborrow's use, producing APIs that look more restrictive (or more permissive) than intended, especially in method return types.
[Common Rust Lifetime Misconceptions](https://github.com/pretzelhammer/rust-blog/blob/master/posts/common-rust-lifetime-misconceptions.md)

## Normative guidance candidates

1. **Never `.to_string_lossy()` a path that came from an external source (archive entry, registry API, filesystem walk) without an explicit fallback decision.** Rationale: silent data corruption on non-UTF-8 filenames, which are legal on Linux/macOS. VERIFICATION: `grep -rn 'to_string_lossy' src/ | grep -v '// ponytail\|display()'` — every hit should be justified (display-only) or replaced with a fallible `to_str()` + explicit error.
2. **Never build a path with `.join()` where the joined component's origin is untrusted or could be absolute.** Rationale: `Path::join(absolute)` silently discards the base, which is a path-injection-adjacent bug in a tool that resolves cache/install paths from manifest data. VERIFICATION: for every `.join(` call, confirm the argument is a validated relative-path component (reading heuristic — clippy has no lint for this).
3. **All arithmetic on sizes/offsets/counts derived from untrusted input (manifest, HTTP header, archive metadata) must use `checked_*`/`saturating_*`, never bare operators.** Rationale: bare arithmetic wraps silently in release; the failure mode differs from what a debug build shows. VERIFICATION: `cargo clippy -- -W clippy::arithmetic_side_effects` scoped to the ingestion modules (noisy repo-wide, useful as a targeted gate).
4. **No path-based check-then-act.** Any `metadata()`/`exists()`/`is_dir()` check followed by a *separate* operation on the same path is a TOCTOU bug; open the resource once and operate on the handle. Rationale: audited as a live bug class in shipped Rust CLI tools, not theoretical. VERIFICATION: reading heuristic — grep for `.exists()` or `.is_dir()` followed within a few lines by an operation re-resolving the same path variable.
5. **Never derive `Debug` on a type holding a secret (token, password, signing key) without a manual redacting impl.** Rationale: `Debug` output routinely reaches logs/error messages in production. VERIFICATION: grep struct definitions containing `token`/`secret`/`password`/`key` fields for `#[derive(Debug)]` without an adjacent manual `impl Debug` override.
6. **Config/settings structs must not derive `Default` if any field has no semantically valid zero value** (ports, required paths, non-empty collections). Rationale: a compiling `Default` invites accidental use of an invalid config. VERIFICATION: reading heuristic on every `#[derive(Default)]` near a `Config`/`Settings`/`Options` struct — does `T::default()` actually describe a runnable state?
7. **Model mutually-dependent optional fields as one enum, not independent `bool`/`Option` pairs.** Rationale: independent optionals admit states with no valid interpretation. VERIFICATION: reading heuristic — a struct with an `Option<T>` whose presence is implied by a sibling `bool`/enum field is a candidate for collapsing.
8. **Never hold a `MutexGuard`/`RwLockGuard` across an `.await`.** Rationale: serializes concurrent tasks at best, deadlocks at worst; `std::sync` guards are `!Send` so cross-task cases are caught, same-task cases are not. VERIFICATION: `cargo clippy -- -W clippy::await_holding_lock` (built-in clippy lint — enable in the `[lints]` table).
9. **Batch/multi-item operations (install N packages, extract N files) must aggregate outcomes explicitly — never collapse to "last error wins" or `.ok()`.** Rationale: a scalar result over N independent operations silently discards N−1 of them. VERIFICATION: reading heuristic — any loop over user-facing items whose per-item `Result` is discarded (`.ok()`, ignored `?` inside a loop that swallows via `continue`) without being collected into a report.
10. **Any function whose parameter/return type is `Option<T>`/`Result<T,E>` purely to be unwrapped-or-early-returned by every caller should take `T` and push the branch to the caller.** Rationale: matklad's "push ifs up" — centralizes branch logic where redundancy and dead branches are visible. VERIFICATION: reading heuristic during review; not mechanically greppable, but a fast pattern to eyeball in a diff.
11. **`std::thread::spawn` is disallowed in new code in favor of `std::thread::scope` unless the thread must outlive the spawning function.** Rationale: unjoined threads drop cleanup guarantees silently. VERIFICATION: `grep -rn 'thread::spawn' src/` and confirm each hit is either inside a `thread::scope` closure or has a documented long-lived reason.
12. **Any `std::time::SystemTime`/`Instant` arithmetic beyond `elapsed()`/`thread::sleep` duration must go through `jiff` (or `time`), not raw `std` operations.** Rationale: precision/monotonicity guarantees are platform-specific; a cache-TTL or lockfile-timestamp bug that "can't happen" on Linux will happen on Windows. VERIFICATION: grep for `SystemTime::now() +`/`-` or `.duration_since(` outside a thin time-abstraction module.
13. **Any user-visible serialized output (lockfile, `--json`, cache index) that iterates a `HashMap` must sort keys before emitting.** Rationale: `HashMap` iteration order is randomized per-process; unsorted emission makes lockfiles/diffs nondeterministic across runs on the same input. VERIFICATION: grep for `HashMap` fields feeding into `serde::Serialize`/`println!`/file-writing paths without a preceding `.sort()`/use of `BTreeMap`.
14. **New on-disk formats (lockfile schema, cache-index format) must carry an explicit version/schema field from the first write.** Rationale: retrofitting versioning after the first shipped format is a breaking migration; the corpus's cost of *not* doing this shows up as "can't read old caches" bugs. VERIFICATION: reading heuristic on any new `struct` that gets `serde`-written to disk — does it have a `version`/`schema_version` field?

## AI-agent angle

- LLMs default to `.clone()` the instant the borrow checker complains, because it is the shortest edit that makes the error disappear — it is never flagged as wrong by the compiler, only by a human or clippy's narrower `redundant_clone` lint. Smallest check: `cargo clippy -- -W clippy::redundant_clone` in CI, plus a review heuristic ("would restructuring the caller avoid this clone entirely?") since clippy only catches the subset where the clone is provably unused.
- LLMs reach for `.to_string_lossy()` and `.unwrap_or_default()` as generic "make the type error go away" moves without registering that both are silent-data-loss operations on untrusted input — the fix compiles and looks idiomatic. Smallest check: grep-gate `to_string_lossy()` and `unwrap_or_default()` in modules that touch filesystem paths or deserialized network data; require a comment justifying the fallback.
- LLMs derive `Debug`, `Default`, and `Serialize`/`Deserialize` reflexively on every struct because it is boilerplate they've seen work everywhere — they don't cross-reference "does this struct hold a secret" or "does zero/absence mean something invalid here" before adding the derive. Smallest check: a pre-commit/CI grep for `#[derive(Debug` co-located with field names matching `token|secret|password|key|credential`.
- LLMs write check-then-act path code (`if path.exists() { ... }` then a later, separate filesystem call on the same path) because it mirrors how the logic reads in prose — they don't model the gap as an attacker-controlled window. Smallest check: a review heuristic flagging any `.exists()`/`.is_dir()`/`.metadata()` call whose result is used only to decide *whether* to make a second, separate call on the same path variable, rather than being reused via a handle.
- LLMs collapse batch operations to a single `Result` (returning the first or last error) because that is the natural shape of `?`-propagation in a `for` loop — they don't reach for an explicit per-item outcome report unless the ticket says "report failures per file." Smallest check: any function that loops over a `Vec<PathBuf>`/`Vec<PackageId>` and contains an early `?` inside the loop is a candidate for manual review of "should this continue and collect instead."

## Contested / evolving

- **`Path::join`'s absolute-override behavior is not going to change** — it matches POSIX `join`/`os.path.join` semantics deliberately (rust-lang tracking discussions have closed "fix" proposals as WONTFIX because it mirrors established cross-language convention) — the correct response is documentation/lint discipline, not waiting for a std change. The `camino` crate (UTF-8-only paths) is the community's practical workaround, not a std fix.
- **`std::sync::Mutex` vs `tokio::sync::Mutex` guidance has stabilized** as of the current tokio docs (prefer std unless you must hold across `.await`) but this was a genuinely contested question for years and older blog posts/StackOverflow answers still recommend the async mutex by default — flag any pre-2023 source on this topic as possibly stale.
- **Clippy's overflow-lint coverage is actively evolving**: `arithmetic_side_effects` exists but is off-by-default and noisy; the open clippy issue requesting a stronger, more targeted release-mode-overflow lint (linked above) is unresolved as of this research — this is a gap the project cannot currently close with tooling alone and must cover with `checked_*` discipline and code review.
- **`std::thread::scope` (stabilized 1.63, 2022) obsoletes a large fraction of older "always call `.join()`" advice** — pre-2022 material recommending manual join-handle bookkeeping as the *primary* pattern is dated; scope should be the default reach today.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Clone to satisfy the borrow checker](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html) | Official Rust Design Patterns anti-pattern catalog entry | Living doc, current | Canonical name and framing for the single most common LLM-Rust failure mode |
| [Deref polymorphism anti-pattern](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html) | Official Rust Design Patterns anti-pattern catalog entry | Living doc, current | Names a specific trait-misuse pattern with a concrete broken example |
| [Tokio tutorial — Shared State](https://tokio.rs/tokio/tutorial/shared-state) | Official tokio documentation | Current (tokio 1.x docs) | Primary-source rule on `std::sync::Mutex` vs `tokio::sync::Mutex` and the "never hold a guard across await" rule |
| [Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) | corrode.dev blog post, practitioner-authored | 2025-04-01 | Fifteen concrete, code-exampled pitfalls that compile cleanly but are wrong — overflow, invalid-state structs, Debug leaks, TOCTOU, timing attacks |
| [Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/) | corrode.dev blog post, practitioner-authored | 2025-05-21 | Std-library-specific gotchas: thread joining, `Path::join`, `SystemTime`/`Instant` platform variance |
| [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/) | corrode.dev blog post reporting on a real security audit of uutils coreutils | 2026-04-29 | Real production-audit findings in a widely-used Rust CLI reimplementation — TOCTOU, permission races, lossy UTF-8, swallowed batch errors, behavioral divergence, chroot ordering |
| [When Rust Gets Ugly](https://corrode.dev/blog/ugly/) | corrode.dev blog post, practitioner-authored | 2026-07-17 | Catalog of code-shape smells (stringly-typed signatures, manual indexing, imperative loops) with before/after refactors |
| [Push Ifs Up and Fors Down](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html) | Blog post by matklad, rust-analyzer maintainer | 2023-11-15 | A mechanical, review-applicable control-flow heuristic distilled from a large real Rust codebase's review history |
| [Common Rust Lifetime Misconceptions](https://github.com/pretzelhammer/rust-blog/blob/master/posts/common-rust-lifetime-misconceptions.md) | Long-form community reference, widely cited | Living doc | Primary source for lifetime-driven API design mistakes that are otherwise hard to name precisely |
| [clippy#12503 — lint for integer overflow, especially in release mode](https://github.com/rust-lang/rust-clippy/issues/12503) | Open GitHub issue on rust-lang/rust-clippy | Open, current | Confirms this is a live, unresolved tooling gap, not solved by "just run clippy" |
| [rust-unofficial/patterns anti-patterns index](https://rust-unofficial.github.io/patterns/anti_patterns/index.html) | Official Rust Design Patterns book, anti-patterns section landing page | Living doc, current | Defines the anti-pattern taxonomy this whole research wave draws on |
| [BurntSushi/ripgrep#94 — Windows stdin detection](https://github.com/BurntSushi/ripgrep/issues/94) | Real issue in a widely-used, highly-reviewed Rust CLI tool | Historical, closed | Concrete instance of the cross-platform-breakage class (Windows-only stdin/TTY detection divergence) in a reference-quality Rust CLI |

## Candidate topics

| candidate topic | one-line why it matters | source | already-covered? | priority |
|---|---|---|---|---|
| `atomic-write-crash-consistency` | write-temp-then-rename + fsync ordering is the difference between a corrupt cache/lockfile and a safe one on crash/power-loss — this is the central filesystem concern of the whole project | corrode.dev pitfalls/sharp-edges (TOCTOU/permission-race pattern generalizes here) | no | high |
| `path-lossy-conversion-corruption` | `.to_string_lossy()` silently corrupts non-UTF-8 filenames from archives/registries instead of erroring | Sharp Edges in Rust std | partial | high |
| `path-join-absolute-override-footgun` | `Path::join(absolute)` silently discards the base path — bites any path-composition code (install/cache paths) | Sharp Edges in Rust std | no | high |
| `permission-race-window-on-create` | create-then-chmod leaves a window where default (too-open) permissions are live on disk | Bugs Rust Won't Catch | partial (security wave has TOCTOU generally) | high |
| `integer-overflow-release-mode-wrapping` | arithmetic on untrusted sizes/offsets wraps silently in release, panics in debug — divergent-by-profile bug | Pitfalls of Safe Rust; clippy#12503 | no | high |
| `debug-derive-secret-leakage` | `#[derive(Debug)]` on credential-bearing structs prints secrets straight into logs/panic messages | Pitfalls of Safe Rust | partial | high |
| `hashmap-iteration-order-nondeterminism` | randomized HashMap order leaking into lockfiles/`--json`/diffs makes output nondeterministic run-to-run | general Rust std behavior; ugly-rust code-shape complaints | partial | high |
| `on-disk-format-schema-versioning` | lockfile/cache-index formats need a version field from the first write or migration becomes a breaking change later | prompt's own "boring but bites" list; Bugs Rust Won't Catch's behavioral-divergence lesson | no | high |
| `windows-specific-breakage-cluster` | path length limits, case-insensitivity, locked-open files blocking delete/rename, reserved device names (`CON`/`NUL`) | BurntSushi/ripgrep#94; Sharp Edges in Rust std (SystemTime variance) | no | high |
| `batch-operation-partial-failure-aggregation` | multi-item operations (install N packages) must report per-item outcome, not collapse to last-error-wins or `.ok()` | Bugs Rust Won't Catch (chmod -R, dd examples) | no | high |
| `clone-driven-development-ai-signature` | `.clone()`-to-dodge-borrowck is the single most reflexive LLM-Rust failure mode; needs an explicit review heuristic beyond clippy's narrow lint | rust-unofficial anti-patterns | no | high |
| `unbounded-input-decompression-bomb` | no size cap before decode/decompress is a DoS vector — directly maps onto OCI blob/manifest download and archive extraction | Pitfalls of Safe Rust | partial (security wave covers zip-slip; size caps distinct) | high |
| `streaming-vs-buffering-large-blob-extraction` | loading an entire tarball/layer into memory before writing vs. streaming — memory-bomb risk on large images | performance wave touches I/O buffering generically; extraction-specific angle is new | partial | high |
| `signal-interrupt-mid-write-corruption` | Ctrl-C during extraction/write leaving a half-written cache entry — combines cleanly with atomic-write topic | cli-contract wave covers signals generically; the write-corruption consequence is the new part | partial | high |
| `arc-mutex-overuse-code-smell` | `Arc<Mutex<T>>` sprinkled everywhere as a reviewable anti-pattern signal (vs. message-passing/actor), distinct from the async-primitives mechanics already covered | r/rust-style recurring complaint pattern (per task brief); tokio shared-state tutorial's own escalation ladder | partial | medium |
| `invalid-state-boolean-option-pairs` | independent `bool` + `Option<T>` fields admit states with no valid meaning; collapse into an enum | Pitfalls of Safe Rust | partial (architecture wave covers newtype/typestate generally) | medium |
| `default-derive-semantic-invalidity` | `#[derive(Default)]` on config structs produces zero-valued but semantically invalid instances (port 0, empty required string) | Pitfalls of Safe Rust | no | medium |
| `serde-default-on-required-field` | `#[serde(default)]` on a field that's actually required silently accepts absence; prefer `try_from` validation | Pitfalls of Safe Rust | no | medium |
| `stringly-typed-signature-smell` | function signatures built entirely of `String`/`&str` for what's really a small closed variant set signal a missing type | When Rust Gets Ugly | partial | medium |
| `push-ifs-up-fors-down-heuristic` | mechanical, review-applicable control-flow shape rule: centralize branches in callers, hoist invariant checks out of loops | matklad, Push Ifs Up and Fors Down | no | medium |
| `thread-spawn-vs-scoped-threads` | unjoined `thread::spawn` drops cleanup guarantees silently; `std::thread::scope` closes the class structurally | Sharp Edges in Rust std | no | medium |
| `systemtime-instant-platform-variance` | `SystemTime`/`Instant` precision/monotonicity differ by OS — cache-TTL and timestamp-comparison bugs that only show up on Windows | Sharp Edges in Rust std | no | medium |
| `reimplementation-behavioral-parity` | when mimicking an existing tool/registry convention (npm-like semantics, OCI spec edge cases), silent behavioral divergence breaks every caller downstream | Bugs Rust Won't Catch (uutils vs GNU) | partial | medium |
| `lifetime-driven-api-design-misconceptions` | `T: 'static` misread as compile-time-only; `&mut` reborrowed as `&` silently extending the mutable borrow's lifetime — both distort public API shape | pretzelhammer, Common Rust Lifetime Misconceptions | no | medium |
| `deref-inheritance-misuse` | using `Deref` to fake OOP inheritance between unrelated structs breaks trait-bound propagation and reader intuition | rust-unofficial anti-patterns | no | medium |
| `chroot-privilege-drop-ordering` | resolving trust-sensitive state (credentials, dynamic library paths) after entering a restricted context vs. before it — ordering bug class | Bugs Rust Won't Catch | no | medium |
| `resource-cleanup-guard-poisoning-on-panic` | a panic mid-operation while holding a `Mutex`/`RwLock` poisons it for every subsequent access; interacts with Drop-guard cleanup ordering during unwind | tokio shared-state tutorial (adjacent); general std `Mutex` poisoning behavior | partial | medium |
| `idempotent-reentrant-operations` | re-running install/extract after an interrupted prior run must converge, not double-apply or corrupt state | prompt's own "boring but bites" list | no | medium |
| `non-exhaustive-forward-compat-matching` | matching on registry/manifest enum variants without `#[non_exhaustive]`-aware handling breaks on the next OCI media-type addition | architecture wave covers typestate generally; the versioned-wire-format angle is distinct | partial | medium |
| `linkedlist-and-collection-choice-traps` | reaching for `LinkedList` (or otherwise the wrong std collection) when `Vec`/`VecDeque`/`BTreeMap` is strictly better, per std's own docs | Sharp Edges in Rust std | partial (performance wave covers data layout generically) | low |
| `unnecessary-lifetime-annotations-noise` | explicit lifetime params where elision already covers it — readability noise, not a bug, but a recurring reviewer nit | When Rust Gets Ugly | partial | low |
| `feature-flag-combinatorial-explosion` | `cfg`-gated feature combinations that are never tested together; less relevant for a near-single-crate binary but worth a one-line rule | prompt's own "boring but bites" list | no | low |
| `unsafe-dependency-auditing-cargo-geiger` | auditing transitive dependencies' unsafe-code footprint | Pitfalls of Safe Rust | yes (security wave covers cargo-deny/audit/vet directly) | low |
| `mutex-guard-across-await` | holding a lock guard across an `.await` point serializes or deadlocks async tasks | Tokio shared-state tutorial | yes (async wave explicitly covers sync primitives) | low |

