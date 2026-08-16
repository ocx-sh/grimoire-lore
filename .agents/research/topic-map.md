---
title: Rust Research Topic Map — Consolidated Backlog
model: opus
date: 2026-08
consolidates:
  - topic-map/antipatterns-and-postmortems.md
  - topic-map/books-and-canonical-guides.md
  - topic-map/ecosystem-2025-2026-shifts.md
  - topic-map/practitioner-blogs-and-talks.md
  - topic-map/style-guides-and-lint-catalogs.md
grounded_by:
  - ocx-codebase-audit/crate-architecture.md
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/rules-inventory.md
---

# Rust Research Topic Map

Five landscape scouts surveyed the Rust corpus (anti-pattern catalogs and
postmortems, canonical books and guides, 2024–2026 ecosystem shifts,
practitioner blogs, and organisational style/lint catalogs) and produced ~120
raw candidate topics. This document deduplicates them into one durable backlog,
scores each against what the earlier research waves already own and against
what the ocx/grimoire codebases actually are, and commissions the next wave.

Three grounding facts from the codebase audit shape the priorities below:

1. **The stated pain point is wrong in its diagnosis but right in its
   direction.** grimoire has *more* free functions per kLOC than ocx (6.97 vs
   5.15); ocx's real problem is a 603-method `PackageManager` god-struct spread
   across 23 `impl` blocks. Both are symptoms of "the type system is not
   carrying the design," which the `rust-type-architecture` wave already owns.
   The next wave should therefore *not* re-litigate traits-vs-free-functions —
   it should attack the correctness classes those codebases are exposed to.
2. **The exposure is filesystem, wire-format, and cross-platform.** 1,664 +
   906 `std::fs`/`tokio::fs` call sites; atomic-write-then-rename in 50 places;
   a Windows launcher shim written in raw WinAPI FFI; a lockfile and cache
   index written to disk; tarball extraction from a remote registry.
3. **The existing rules cover errors, exit codes, and security posture well,
   and cover almost nothing about serialization, schema evolution, platform
   divergence, feature flags, or resource discipline** (rules-inventory §6).

## The map

Coverage is judged against the eleven waves already commissioned
(type-architecture, error-handling, cli-contract, async, security, testing,
tooling-ci, performance, docs-observability, ai-agentic-coding,
large-scale-ports). "partial" means a sibling wave touches the area but would
not reach this specific failure mode.

### Paths, filesystem, and platform

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| `Path::join(absolute)` silently discards the base | A registry-supplied component that happens to be absolute escapes the cache root with no archive involved — distinct from zip-slip | antipatterns, practitioner, books | uncovered | **high** — 906+ fs call sites build paths from wire data |
| `to_string_lossy()` / `to_str().unwrap()` on external paths | Silently corrupts non-UTF-8 filenames from tarballs instead of erroring; LLMs use it as a type-error escape hatch | antipatterns, practitioner | uncovered | **high** — package manager must round-trip arbitrary archive entry names |
| Path comparison as strings misses `..`, `.`, symlink-equal forms | Audited live in shipped Rust CLI tools (uutils) | antipatterns | partial (security: zip-slip) | **high** |
| `camino::Utf8PathBuf` as the UTF-8-only alternative | Removes `.as_os_str().to_str()` chains across path-heavy code | practitioner, books | uncovered | medium |
| Windows breakage cluster: MAX_PATH/`\\?\`, case-insensitivity, locked-open files blocking rename/delete, reserved names (`CON`/`NUL`), CRLF | The repeat offenders in every cross-platform CLI; ocx ships a WinAPI shim binary | antipatterns, books | uncovered | **high** |
| macOS divergence: case-insensitive APFS, quarantine xattr, notarization on downloaded executables | The project executes downloaded tools; Gatekeeper is a functional blocker, not a nicety | own analysis from audit | uncovered | **high** |
| TOCTOU: check-then-act on a path | `if !path.is_dir() { .. }` then act; safe Rust does not prevent it | antipatterns | partial (security wave) | high |
| Create-then-chmod permission race | `File::create` then `set_permissions` leaves a too-open window | antipatterns | partial | high |
| `cap-std` capability-scoped `Dir` for extraction/cache writes | Stable, `openat2`-backed CWE-22 mitigation; the applied wiring is the missing half | ecosystem | partial (security names the crate) | high |
| `io::Error` carries no path and no backtrace | 500 failing fs ops with "No such file or directory" and no filename is undebuggable | practitioner | uncovered | high |
| `SystemTime`/`Instant` precision and monotonicity vary by OS | Cache-TTL and lockfile-timestamp bugs that only appear on Windows | antipatterns, practitioner, style-guides | uncovered | medium-high |
| Monotonic vs wall-clock for TTLs; single time crate workspace-wide; UTC-only serialized timestamps | Clock skew and mixed `chrono`/`time` silently corrupt freshness logic | books, style-guides | uncovered | medium-high |
| Filesystem mtime granularity as a cache-invalidation input | FAT/HFS/ext4 differ by orders of magnitude | own analysis | uncovered | medium |

### Durability, resources, and lifecycle

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| Atomic write: temp + fsync + rename + parent-dir fsync | The central filesystem correctness property of the whole project; 50 `persist`/`rename` sites already exist without a stated contract | antipatterns, books | uncovered | **high** |
| Ctrl-C / SIGTERM mid-extract leaving half-written cache state | Interruption must yield either fully-old or fully-new, never a torn state | antipatterns, practitioner (ecdysis) | partial (cli-contract owns signals) | **high** |
| Idempotent, re-entrant, resumable install/update | Re-running after an interrupted run must converge, not double-apply | antipatterns, books, style-guides | uncovered | **high** |
| `Drop::drop` must not panic, block, or use `?` | Panic during unwind aborts; blocking in drop deadlocks shutdown; hits lockfile/temp-dir guards | books, style-guides | uncovered | **high** |
| `panic = "abort"` vs unwind as a failure-model decision | Abort skips `Drop`, silently disabling every RAII cleanup | practitioner | uncovered | high |
| `std::sync::Mutex` poisoning policy | One panicking holder wedges every future locker; `.lock().unwrap()` is the default LLM shape | practitioner, books | partial | medium-high |
| `LazyLock`/`OnceLock` poisoning differs from `once_cell::Lazy` | Silent behaviour change on the "obvious" std migration | ecosystem | uncovered | medium |
| `thread::spawn` without `.join()`; `std::thread::scope` | Unjoined threads drop cleanup guarantees | antipatterns, practitioner | uncovered | medium |
| Cache getter must not take `&mut self` | `&mut` propagates up the whole call graph and destroys the read/write distinction; OCI blob/manifest caches are exactly this shape | practitioner (matklad) | uncovered | **high** |
| Interior-mutability selection: `Cell`/`RefCell` vs `Mutex` vs atomics | `RefCell` on a type later `Arc`-wrapped panics at runtime; `Arc<Mutex<T>>` in single-threaded paths is cargo-cult | books | uncovered | high |
| `Arc<Mutex<T>>` sprawl as a reviewable smell vs message passing | Distinct from async primitive mechanics | antipatterns | partial (async wave) | medium |
| Mutex guard held across `.await` | Serializes or deadlocks | antipatterns | covered (async wave) | low |
| Graceful drain instead of hard kill for in-flight work | Long batch operations at the signal boundary | practitioner | partial | medium |
| Resource cleanup ordering during unwind | Guard interaction with poisoning | antipatterns | partial | medium |

### Data, serialization, and on-disk formats

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| On-disk schema versioning + migrate-or-reject on read | No surveyed guide covers it; retrofitting after the first shipped lockfile is a breaking migration | books, style-guides, antipatterns | uncovered | **high** |
| `#[serde(deny_unknown_fields)]` vs tolerant parsing as an explicit per-type decision | The two failure modes (hide a typo / break a sibling binary) require a choice; ocx already argues one side for fleet-compat | books | uncovered | **high** |
| `#[serde(default)]` on a security-relevant required field | Silently accepts absence as empty; `try_from` + validating `TryFrom` is the fix | antipatterns | uncovered | high |
| `#[non_exhaustive]` on wire/manifest enums for forward compat | Next OCI media type must not break older binaries; already used at 82/66 sites without a stated rule | antipatterns, books | partial | high |
| `HashMap` iteration order leaking into lockfiles/`--json`/diffs | Byte-nondeterministic output across runs on identical input | all five scouts | uncovered | **high** |
| Digest/hash string encoding centralization (hex vs base64, case, `sha256:` prefix) | Encoding mismatch breaks equality silently *underneath* verification logic | books | partial (security owns verification) | high |
| Canonical serialization: key order, float/`None`/empty-collection policy | Reproducible artifacts and diffable review | style-guides, own analysis | uncovered | high |
| Zero-copy / borrowed deserialization for manifest bodies | Allocation win on manifest-heavy hot paths | books, style-guides | partial (performance) | medium |
| Const generics / `[u8; 32]` for digests instead of `Vec<u8>` | Encodes the length invariant in the type | books, style-guides | uncovered | medium |
| Bounded error-type size (`size_of::<Error>()` taxes every Ok path) | Error size is paid on success too | practitioner | partial (error wave) | medium |

### API shape and type discipline

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| Derive completeness on public types (`C-COMMON-TRAITS`) | Missing derives fail at a distant call site, never at the definition | style-guides | uncovered | high |
| `#[derive(Debug)]` on secret-bearing structs prints the secret | Debug output reaches logs and panic messages | antipatterns | partial (security: secrets) | **high** |
| `#[derive(Default)]` on config structs produces invalid zero states | `port: 0`, empty required strings that type-check | antipatterns | uncovered | medium-high |
| `From`/`AsRef`/`TryFrom` over ad-hoc `.to_x()` (`C-CONV-TRAITS`) | Standard conversions compose with generic code | style-guides | uncovered | medium |
| Naming conventions `C-CONV`/`C-GETTER`/`C-ITER` | Concrete, checkable, distinct from architecture guidance | style-guides | uncovered | medium |
| Sealed traits + private fields as the semver mechanism | `C-SEALED`/`C-STRUCT-PRIVATE`/`C-NEWTYPE-HIDE` | books, style-guides | partial (type-architecture) | medium |
| `C-VALIDATE`: validate at the API boundary, not the call site | Call-site validation disappears at the second call site | style-guides | partial | medium |
| `bitflags` over bool-parameter runs / combinatorial enum variants | Named anti-pattern LLMs fall into | style-guides | uncovered | medium |
| Return the caller's consumed argument inside `Err` | Fallible install/build APIs that eat expensive owned values | style-guides | uncovered | medium |
| Invalid-state `bool` + `Option<T>` pairs → one enum | Independent optionals admit meaningless states | antipatterns, books | partial (type-architecture) | medium |
| `Deref` used to fake inheritance | Breaks trait-bound propagation | antipatterns, books | uncovered | medium |
| Lifetime misconceptions distorting public API (`T: 'static`, `&mut` reborrow) | Changes whether a function takes owned data, `Arc`, or a trait object | antipatterns | uncovered | medium |
| Variance / drop-check / `PhantomData` in generic cache and guard types | Safe-code lifetime bugs distinct from "avoid unsafe" | books | uncovered | medium |
| `C-SEND-SYNC` soundness for hand-rolled shared types | Whether a custom type is sound to share at all | style-guides | partial | medium |
| Dependency re-export when your API exposes a dep's types | Downstream version confusion in a workspace | books | uncovered | low |
| `C-RW-VALUE`: `R: Read`/`W: Write` by value | Specific signature convention | style-guides | uncovered | low |
| Operator-overload unsurprisingness, macro hygiene, `no_std`, reflection avoidance | Completeness | books, style-guides | uncovered | low |

### Idioms, code shape, and the LLM signature

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| `.clone()` to silence the borrow checker | The single most-cited Rust anti-pattern and the most reflexive LLM move; clippy catches only a subset | antipatterns, books | uncovered | **high** |
| Push ifs up, push fors down | One of the few *mechanical* review heuristics in the corpus | antipatterns, practitioner | uncovered | high |
| "Stringly typed" signatures as a missing-type smell | `Vec<String>` for a closed variant set | antipatterns | partial | medium |
| `unwrap_or_default()` as silent data loss on untrusted input | Same class as lossy path conversion | antipatterns | uncovered | medium |
| Glob imports / preludes break on a dep's semver-compliant minor bump | Grep-able; LLMs reach for `use super::*` to skip import lists | practitioner | partial | medium |
| Blanket `#[allow(clippy::...)]` above expression scope | Silently defeats the lint gate for everything beneath | books | partial (tooling-ci) | medium |
| Review final state, not the diff | This project's own review skills read `git diff` only | practitioner | uncovered | medium |
| `check()` test-helper idiom for signature churn | Micro-pattern the testing wave would not name | practitioner | partial | low |
| `tests/*.rs` fan-out re-links the lib per file; consolidate to `tests/it/` | Measured 3× compile time, 5× artifacts | practitioner | partial | medium |
| Collection-choice traps (`LinkedList`, wrong std container) | Rarely right | antipatterns, practitioner | partial (performance) | low |
| Unnecessary lifetime annotations; version-aware sorting; other rustfmt-residual style | rustfmt already covers most of it | books, style-guides | partial | low |

### Numbers, limits, and untrusted input

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| Integer overflow wraps silently in release, panics in debug | Divergent-by-profile bugs on sizes/offsets from manifests; clippy's coverage is an acknowledged gap (clippy#12503) | antipatterns, style-guides | uncovered | **high** |
| `as` casts truncating (`len as u32`) instead of `try_from` | Shorter to generate than the correct form, so LLMs emit it | style-guides | uncovered | **high** |
| Unbounded decode/decompress = DoS (decompression bomb) | Directly on the OCI blob path | antipatterns | partial (security: zip-slip) | **high** |
| Streaming vs buffering whole layers into memory | Memory bomb on large images | antipatterns, books | partial (performance) | high |
| Allocation sized from an attacker-controlled length field | `Vec::with_capacity(header.len)` | own analysis | uncovered | high |
| Bounded channels sized explicitly | Named in the hardening checklist | practitioner | partial (async) | medium |

### Package-manager domain

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| Timeouts on every outbound registry call | grimoire has 2 `tokio::time::timeout` hits against a real network surface (audit smell #5) | practitioner, style-guides | partial (async) | **high** |
| Bounded retry/backoff/jitter, `Retry-After`/429 handling, circuit breaking | Microsoft's guidelines treat Resilience as its own discipline, separate from Correctness | practitioner, style-guides | uncovered | **high** |
| Batch/partial-failure aggregation across N packages | `chmod -R`-class bug: last-error-wins or `.ok()` discards N−1 outcomes | antipatterns | uncovered | **high** |
| Behavioural parity with the reference tool/spec is a security property | Most Rust CLI reimplementation CVEs are behavioural drift, not memory unsafety | antipatterns, practitioner | partial | medium |
| Minimal-version-selection semantics as a resolver design input | Relevant to ocx/grim's own version resolver, not just to Cargo | practitioner | partial | medium |
| SSRF: resolve-validate-pin at connect time via a custom `reqwest::dns::Resolve` | ocx has a reference implementation; grimoire has none | audit | partial (security) | medium |
| Terminal-escape sanitization of untrusted names in error output (CWE-150) | ocx sanitizes at the exit boundary; grimoire does not (audit smell #1) | audit | partial (cli-contract) | high |
| Signature verification (cosign/sigstore) absent everywhere | Supply-chain gap for an artifact distributor | audit | partial (security) | medium |
| Self-consistent config/lockfile grammar design | Avoid accumulating silent special cases | practitioner | uncovered | low |

### Ecosystem, edition, and Cargo

| Topic | Why it matters | Source | Coverage | Priority |
|---|---|---|---|---|
| Edition 2024 semantics: `static mut` refs deny-by-default, `unsafe_op_in_unsafe_fn`, `unsafe extern`, RPIT capture, `gen` reserved | The single largest edition; agents "fix" these with `#[allow]`, preserving the UB | ecosystem, books | uncovered | **high** |
| Stale-API recall: rand 0.9 renames, `LazyLock` over `once_cell`/`lazy_static`, thiserror 2 direct-dep rule, reqwest 0.12/0.13 + rustls/aws-lc-rs, hyper/http 1.x, async-std discontinued | Version-blind recall is the highest-frequency agent failure in this whole corpus | ecosystem | uncovered | **high** |
| If-let chains (1.88, 2024-edition-only) and async closures (1.85) | Post-cutoff syntax; wrong-edition use fails with a generic parse error | ecosystem | uncovered | medium |
| Precise capturing `impl Trait + use<'a, T>` (1.87) | Opt-out of default-capture-everything | ecosystem | uncovered | low |
| rustls crypto-provider explicit selection (aws-lc-rs vs ring) and cross-compilation | Runtime, not compile-time, failure when two deps disagree; hits the prebuilt-binary matrix | ecosystem | uncovered | high |
| `[workspace.lints]` centralization | Mechanical fix for duplicated per-crate lint config | ecosystem | partial (tooling-ci) | high |
| MSRV-aware resolver 3 and per-member `rust-version` | Declaring MSRV now changes what `cargo update` picks | ecosystem | uncovered | high |
| Cargo feature-flag design and workspace feature unification hazards | Enabling a feature for one binary silently changes a sibling's build | style-guides (Program Structure and Compilation) | uncovered | high |
| clippy `restriction` group as explicit project policy (`arithmetic_side_effects`, `as_conversions`, `unwrap_used`, `print_stdout`) | Allow-by-default because it is policy; silence is an unmade decision | style-guides | partial (tooling-ci) | high |
| cargo-deny's four independent axes (advisories/bans/licenses/sources) | `bans` catches two TLS stacks in one binary; `sources` catches dependency confusion | style-guides | partial (security) | medium |
| RustSec `unmaintained`/`yanked` as CI-failing | Default gate is vulnerability-only | style-guides | partial | medium |
| Flat `crates/*` layout + `cargo xtask` automation | Directly addresses the workspace pain point | practitioner | partial (type-architecture) | medium |
| `cargo add`/`cargo remove` over hand-edited version strings | Skips MSRV-aware resolution | ecosystem | uncovered | medium |
| `cargo script` is nightly-only; do not build release tooling on it | Well-publicized trap | ecosystem | uncovered | medium |
| cargo-nextest process isolation for subprocess/exit-code tests; cargo-mutants on verify/parse paths | Both named generically by the testing wave; the "why for this CLI" angle is the delta | ecosystem | partial (testing) | medium |
| syn 2.0 porting notes | Only if a derive macro is ever hand-rolled | ecosystem | uncovered | low |
| Machine-readable checksummed rule IDs (Sphinx-Needs precedent) | A publishing-format idea for this program's own output | style-guides | uncovered | low |

## Selected for the next wave

Fourteen topics. The cut applied the stated criteria in order, with two
project-specific tiebreakers: anything the codebase audit showed as a *live
divergence or absence* in ocx/grimoire beat anything merely theoretical, and
anything a grep, a clippy lint, or a `[lints]` entry can check beat anything
that can only be judged by reading.

Merges worth naming: all path/filename footguns collapsed into one topic rather
than five one-liner rules; schema versioning, `deny_unknown_fields`, `serde`
defaults and wire-`#[non_exhaustive]` collapsed into a single on-disk-format
topic; clone-to-dodge-borrowck, cache `&mut self`, interior-mutability choice
and `Arc<Mutex>` sprawl collapsed into one ownership-shape topic because they
are the same mistake at four scales; overflow, lossy casts, size caps and
streaming collapsed into one untrusted-input topic because they share a single
review question ("where did this number come from?").

| # | Group | Slug | Why it made the cut |
|---|---|---|---|
| 1 | platform | `cross-platform-path-and-filename-handling` | Uncovered, 900+ call sites, three named silent-corruption footguns, all greppable |
| 2 | platform | `windows-and-macos-platform-divergence` | Uncovered; the project ships a WinAPI shim and executes downloaded binaries on macOS |
| 3 | platform | `time-clocks-and-cache-freshness` | Uncovered; cache TTL and lockfile timestamps are load-bearing and platform-variant |
| 4 | state | `atomic-writes-and-interruption-safety` | The central durability property; 50 existing sites with no stated contract |
| 5 | state | `drop-guards-panics-and-lock-poisoning` | Uncovered; lockfile and temp-dir guards are exactly the failure surface |
| 6 | state | `ownership-shapes-clones-and-interior-mutability` | The #1 LLM Rust failure mode, at four scales, none caught by clippy alone |
| 7 | data | `on-disk-format-evolution` | Genuine gap in every surveyed guide; a lockfile format is already shipped |
| 8 | data | `deterministic-and-canonical-serialized-output` | All five scouts independently raised it; mechanically checkable |
| 9 | api | `derive-discipline-and-standard-conversions` | Secret leakage via `Debug` plus derive completeness; cheap to check, invisible to the compiler |
| 10 | idioms | `code-shape-review-heuristics` | The few mechanical heuristics that make an unattended review pass useful |
| 11 | domain | `bounded-ingestion-and-untrusted-arithmetic` | Overflow + casts + size caps + streaming on the OCI blob path; security-critical and uncovered |
| 12 | domain | `registry-resilience-timeouts-and-retries` | Audit found 2 timeouts against grimoire's whole network surface |
| 13 | domain | `batch-partial-failure-reporting` | Uncovered, package-manager-shaped, checkable, and the exit-code interaction is real |
| 14 | evolution | `edition-2024-and-stale-api-recall` | The highest-frequency agent failure across the entire corpus |

## Deferred

Not selected now, with the reason and the trigger to revisit.

- **Cargo workspace and manifest hygiene** (`[workspace.lints]`, resolver-3
  MSRV awareness, per-member `rust-version`, feature unification, `cargo add`
  over hand-edits, clippy `restriction` policy, cargo-deny's four axes). Highest
  of the deferred set. Overlaps the `rust-tooling-ci` wave on lint selection and
  toolchain pinning, but *feature unification* and the MSRV-aware resolver are
  genuinely unowned. Commission next round, scoped to the non-overlapping half.
- **Semver and extensibility surface** (sealed traits, `C-STRUCT-PRIVATE`,
  `cargo-semver-checks`, `cargo public-api`, dependency re-export). Downgraded
  because neither `ocx_lib` nor `grimoire` is published as a library — the
  semver blast radius is internal. Revisit if any crate is published.
- **Invalid-state modelling** (`bool` + `Option` pairs, `Default` on config
  structs, bitflags, `C-VALIDATE`, return-consumed-arg-on-error). Substantially
  inside `rust-type-architecture`'s newtype/typestate remit; the residue is a
  handful of rules that can be appended to that wave's output rather than
  researched fresh. `Default`-derive invalidity rides along in topic 9.
- **Variance, drop-check, `PhantomData`, lifetime misconceptions.** Real and
  uncovered, but the audit found no generic guard/cache types where it bites
  today. Revisit if the workspace split introduces generic infrastructure types.
- **Behavioural parity with the reference tool/spec.** Strong idea (most Rust
  CLI reimplementation CVEs are behavioural drift), but it needs a concrete
  spec-conformance target to be actionable; better as a testing-wave follow-up
  (OCI distribution-spec conformance suite) than as a rules topic.
- **Review final state, not the diff.** A change to this project's own review
  skills, not Rust research. Route to the skill-authoring track.
- **Test-shape items** (`check()` idiom, `tests/it/` consolidation, black-box
  binary testing, nextest/mutation rationale). All partial-overlap with
  `rust-testing`; hand to that wave's maintainer as addenda.
- **SSRF connect-time pinning, cosign/sigstore verification, CWE-150 terminal
  sanitization.** All three are audit findings with a named reference
  implementation already in ocx. They are *port* tasks, not research tasks —
  file them as engineering work against grimoire, not as a research brief.
- **Low-priority completeness items**: `no_std`, reflection avoidance, operator
  overloading, macro hygiene, syn 2.0 porting, `C-RW-VALUE`, collection-choice
  traps, precise capturing, `gen` keyword, rustfmt-residual style, machine-
  readable rule IDs. Keep in the map; commission only if a concrete need appears.

## Sub-artifacts

- [topic-map/antipatterns-and-postmortems.md](topic-map/antipatterns-and-postmortems.md)
- [topic-map/books-and-canonical-guides.md](topic-map/books-and-canonical-guides.md)
- [topic-map/ecosystem-2025-2026-shifts.md](topic-map/ecosystem-2025-2026-shifts.md)
- [topic-map/practitioner-blogs-and-talks.md](topic-map/practitioner-blogs-and-talks.md)
- [topic-map/style-guides-and-lint-catalogs.md](topic-map/style-guides-and-lint-catalogs.md)
