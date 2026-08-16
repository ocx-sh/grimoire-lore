---
title: Style Guides, API Rubrics, and Lint Catalogs as Codified Rust Practice
agent: style-guides-and-lint-catalogs
model: sonnet
date_researched: 2026-08
sources_count: 12
scope: >
  Survey of organisational Rust style guides, API rubrics, curated pattern/idiom
  catalogs, and lint/policy catalogs (clippy, cargo-deny, RustSec, safety-critical
  guidelines) as a source of enforceable rules for an AI-agent-authored,
  security-sensitive, cross-platform Rust CLI package manager (grim/ocx family).
---

## Table of contents

1. Summary
2. Findings
3. Normative guidance candidates
4. AI-agent angle
5. Contested / evolving
6. Sources
7. Candidate topics

## Summary

1. The Rust API Guidelines checklist (`C-*` IDs) is the closest thing Rust has to a
   normative style law, and Fuchsia's API rubric is a near-verbatim fork of it —
   two independent orgs converged on the same ~40 rules, which is strong evidence
   they are load-bearing, not stylistic taste.
2. Fuchsia adds one rule the base guidelines don't state explicitly: every `unsafe`
   block must carry a `// SAFETY:` comment justifying soundness — mechanically
   enforceable via `clippy::undocumented_unsafe_blocks`.
3. `C-COMMON-TRAITS` (eagerly derive `Clone, Eq, PartialEq, Ord, PartialOrd, Hash,
   Debug, Default`) is routinely skipped by LLM-authored code because nothing fails
   to compile when it's missing — it only bites downstream, in a test or a caller
   three files away.
4. `C-DTOR-FAIL` / `C-DTOR-BLOCK` (destructors never fail, never block) plus the
   patterns book's "RAII Guards" idiom converge on the same shape: cleanup logic
   belongs in `Drop`, and `Drop::drop` must not panic or perform blocking I/O —
   directly relevant to lockfile/temp-dir/cache guards.
5. `C-SEALED` / `C-STRUCT-PRIVATE` / `C-NEWTYPE-HIDE` / `C-STRUCT-BOUNDS` are the
   codified semver-safety toolkit: private fields and sealed traits are the
   mechanism, not "encapsulation is nice."
6. The official Rust Style Guide is rustfmt's specification, not aspirational
   prose — deviations are rustfmt bugs, so "run rustfmt" already satisfies
   ~95% of its surface; the residual is non-automatable convention (comment
   content, `Cargo.toml` field order).
7. Clippy's `restriction` group is deliberately allow-by-default because its lints
   are project-policy, not universal correctness — `arithmetic_side_effects`,
   `unwrap_used`, `expect_used`, `as_conversions`, `print_stdout`, `absolute_paths`
   are the ones a security-sensitive CLI should opt into via the `[lints]` table.
8. cargo-deny formalises four independent policy axes — `advisories` (RustSec
   vulnerabilities), `bans` (duplicate/banned crates), `licenses` (SPDX
   allowlist), `sources` (registry allowlist) — and they fail differently: a
   duplicate-crate ban catches ABI/type mismatches across a workspace, not
   security bugs.
9. RustSec's advisory taxonomy is broader than "CVE": it also flags
   `unmaintained` and `yanked` crates, neither of which `cargo audit`'s default
   severity gate treats as a hard failure unless configured to.
10. The Safety-Critical Rust Consortium's guideline taxonomy (18 chapters —
    Types/Traits, Ownership and Destruction, Exceptions and Errors, Unsafety,
    Macros, FFI and Inline Assembly, Program Structure and Compilation, …) is
    useful even at non-safety-critical strictness as a checklist of *categories*
    a reviewer should have opinions about — most already map onto this project's
    prior research waves, but "Program Structure and Compilation" (feature-flag
    and `cfg` discipline) does not.
11. Microsoft's Rust guidelines dedicate a top-level category to "Resilience"
    (retry/backoff/timeout for fallible I/O) separate from "Correctness" —
    a distinction most error-handling guidance collapses, but which matters a
    lot for a CLI that talks to ghcr.io over flaky networks.
12. rust-unofficial/patterns' idiom "Return consumed arg on error" — give the
    caller their owned value back inside the `Err` variant instead of silently
    dropping it — is exactly the shape a fallible builder or "install package"
    API should take, and it is absent from generic error-handling guidance
    because it's an API-shape idiom, not an error-type idiom.
13. None of the surveyed guides treat filesystem path handling, non-UTF-8
    filenames, or `HashMap` iteration order as "security" or "correctness" — they
    fall through the cracks between style guides (too CLI-specific) and security
    guides (not memory-unsafe) even though they are the most common source of
    Windows/macOS-only bugs and non-reproducible lockfiles.
14. Cargo.toml/on-disk-format versioning is not addressed by any surveyed style
    guide directly — `C-STABLE` talks about *crate* API stability, not the
    stability of a lockfile or cache schema the crate writes to disk; this is a
    genuine gap the project must self-legislate.
15. The Safety-Critical Consortium guidelines are published as machine-readable
    Sphinx-Needs data (`needs.json` with checksummed IDs) — a model for how this
    project's own normative-guidance output could be made machine-checkable
    later, not just prose.
16. clippy's lint groups map cleanly onto severity, not topic: `correctness` is
    deny-by-default (compiler-adjacent bug), `suspicious`/`style`/`complexity`/
    `perf` are warn-by-default idiom lints, `pedantic`/`nursery`/`restriction` are
    allow-by-default and require an explicit opt-in in `[lints.clippy]` — treating
    "pedantic" as noise to be globally allowed throws away real signal.
17. The Rust API Guidelines' `C-RW-VALUE` (generic reader/writer functions take
    `R: Read`/`W: Write` by value, not `&mut`) is a specific, checkable signature
    convention that generic "traits vs free functions" guidance won't surface on
    its own.
18. `C-VALIDATE` (public functions validate their arguments and document the
    validation) is the guideline-level statement of "parse, don't validate" —
    worth stating explicitly because AI-authored code tends to validate at the
    call site instead of the API boundary, so the check silently disappears at
    a second call site.
19. bitflags-for-flag-sets (`C-BITFLAG`) is a named, specific rule against the
    common LLM habit of encoding a set of boolean options as an enum with
    combinatorial variants or as multiple `bool` parameters.
20. "Contain unsafety in small modules" (rust-unofficial/patterns) is the
    architectural complement to the SAFETY-comment rule: the *module boundary*,
    not just the block, is the unit of unsafe review — a `pub(crate)` module
    with 3 unsafe fns and a safe wrapper API is auditable; unsafe scattered
    across a 2000-line file is not.

## Findings

### 1. Rust API Guidelines checklist is the load-bearing spec, and Fuchsia independently reinvented it

The [Rust API Guidelines checklist](https://rust-lang.github.io/api-guidelines/checklist.html)
defines ~45 rules under 11 categories (Naming, Interoperability, Macros,
Documentation, Predictability, Flexibility, Type safety, Dependability,
Debuggability, Future proofing, Necessities). [Fuchsia's Rust API
rubric](https://fuchsia.dev/fuchsia-src/development/api/rust) republishes almost
the identical rule set verbatim (`C-CASE` through `C-STRUCT-BOUNDS`), which is
strong signal that this is convergent industrial practice, not one project's
taste — but Fuchsia adds a rule the upstream guidelines never state as a
checklist item:

> Every `unsafe` block requires a `// SAFETY:` comment explaining soundness;
> unsafe trait definitions document safety obligations, implementations justify
> compliance.

This is exactly what `clippy::undocumented_unsafe_blocks` enforces mechanically.

```rust
// Wrong — no safety comment, invisible to review and to clippy::undocumented_unsafe_blocks
let len = unsafe { buf.len_unchecked() };

// Right
// SAFETY: `buf` was just initialized to `cap` elements above, so `len <= cap` holds.
let len = unsafe { buf.len_unchecked() };
```

### 2. The official Rust Style Guide is rustfmt's spec, not a suggestion

[The Rust Style Guide](https://doc.rust-lang.org/nightly/style-guide/) states
explicitly that rustfmt is the reference implementation and that any
discrepancy between the guide and rustfmt's actual output should be filed as a
bug against one or the other. Concretely it fixes: 4-space indent, 100-char
lines, block indent over visual indent, trailing commas on multi-line lists,
`//` over `/* */`, one `derive(...)` attribute per item (combine, don't
stack), and version-aware sorting (`u8` < `u16` < `u32`, not lexicographic).
The practical upshot for this project: `cargo fmt --check` in CI already
covers this guide's enforceable surface; the only residual manual-review items
are comment *content* (complete sentences, capitalized, ending in a period)
and `Cargo.toml` field ordering, neither of which rustfmt touches.

### 3. clippy's lint groups encode severity, and the useful lints are mostly opt-in

The [clippy lint index](https://rust-lang.github.io/rust-clippy/master/index.html)
groups lints as `correctness` (deny-by-default — real bugs, e.g.
`absurd_extreme_comparisons`, `cast_slice_different_sizes`), `suspicious` /
`style` / `complexity` / `perf` (warn-by-default idiom and footgun lints, e.g.
`await_holding_lock`, `collapsible_if`, `boxed_local`), and `pedantic` /
`nursery` / `restriction` / `cargo` (allow-by-default — opinionated or
experimental, must be enabled explicitly). For a security-sensitive CLI, the
`restriction` group is where the payoff concentrates because it's the only
group with lints against *sound but risky* patterns:

```toml
# Cargo.toml — opt into the ones that matter for a package manager
[lints.clippy]
arithmetic_side_effects = "warn"   # catches unchecked +/-/* on sizes, offsets, counts
as_conversions = "warn"            # forces checked_/try_from over lossy `as`
unwrap_used = "warn"               # forces explicit error handling outside tests
expect_used = "warn"
print_stdout = "warn"              # forces routing through the CLI's --json/output layer
absolute_paths = "warn"            # forces qualified imports at call sites
```

### 4. cargo-deny formalises four independently-failing policy axes

[cargo-deny's docs](https://embarkstudios.github.io/cargo-deny/) split policy
into `advisories` (RustSec vulnerability DB), `bans` (duplicate/banned/
wildcard-version crates), `licenses` (SPDX allowlist), `sources` (registry
allowlist, blocks non-crates.io dependency confusion). These are genuinely
independent failures for this project: `bans` catches two versions of a
crate like `windows-sys` or `rustls` coexisting in the dependency graph
(binary bloat, or worse, two incompatible TLS stacks linked into one binary);
`sources` catches a dependency silently resolving from a typosquatted or
unpinned git source instead of crates.io.

### 5. RustSec's taxonomy is wider than "known CVE"

[RustSec](https://rustsec.org/) is explicit that the advisory database covers
more than vulnerabilities: it also tracks `unmaintained` and `yanked` crates,
and exports to OSV for cross-tool consumption (Dependabot, Trivy, Debian's
security tracker). `cargo audit`'s default exit behavior only hard-fails on
vulnerabilities unless `unmaintained`/`yanked` are explicitly escalated —
worth codifying given this project pins a lot of low-level OCI/HTTP crates
that can go unmaintained silently.

### 6. Safety-Critical Rust Consortium: useful as a checklist of categories, not as a strictness target

The [Safety-Critical Rust Consortium's guidelines](https://coding-guidelines.arewesafetycriticalyet.org/)
organise into 18 chapters: Types and Traits, Patterns, Expressions, Values,
Statements, Functions, Associated Items, Implementations, Generics,
Attributes, Entities and Resolution, Ownership and Destruction, Exceptions and
Errors, Concurrency, Program Structure and Compilation, Unsafety, Macros, FFI
and Inline Assembly. Most of these map directly onto categories this
project's earlier research waves already own (Unsafety → rust-security,
Exceptions and Errors → rust-error-handling, Concurrency → rust-async). Two do
not have an obvious owner: **Ownership and Destruction** (Drop/RAII discipline
as its own first-class topic, not folded into "error handling" or
"architecture") and **Program Structure and Compilation** (which in practice,
per Microsoft's and the Consortium's framing, means feature-flag and `cfg`
discipline across a workspace). The guidelines are published as
Sphinx-Needs-generated `needs.json` with checksummed rule IDs — worth noting
as a *format* precedent if this project ever wants its own normative rules to
be machine-checkable, independent of content.

### 7. Microsoft's Rust guidelines split "Correctness" from "Resilience"

[Microsoft's Rust guidelines](https://microsoft.github.io/rust-guidelines/)
(fetched at the `about`/index level; full `M-*` rule text did not render
through the fetch tool) organise into Universal, Libraries (Interoperability,
UX, Resilience, Building), Macros, Applications, FFI, Correctness,
Performance, Project, Documentation, and — notably — a dedicated **AI**
category (guidance for LLM-authored Rust, corroborating this research
program's own `ai-agentic-coding` wave). The split of *Resilience* out of
*Correctness* is the interesting structural signal: retry/backoff/timeout
policy for fallible I/O is treated as its own discipline, distinct from "does
the error type make sense" — directly relevant for ghcr.io registry calls.

### 8. rust-unofficial/patterns: idioms and anti-patterns as a checklist, not a tutorial

The [patterns book's table of
contents](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md)
is a useful flat list to grep against a diff. Items not otherwise covered by
this project's prior waves: **"Return consumed arg on error"** (a fallible
API returns the caller's owned value back inside `Err`, mirroring
`mpsc::SendError<T>`, instead of dropping it silently), **"RAII Guards"** and
**"Finalisation in Destructors"** (cleanup belongs in `Drop`, and per
`C-DTOR-FAIL`/`C-DTOR-BLOCK` that `Drop::drop` must neither panic nor block),
and **"Contain unsafety in small modules"** (the *module*, not the function,
is the review unit for `unsafe`).

```rust
// Anti-pattern: drop the caller's data on failure
fn install(pkg: Package) -> Result<(), InstallError> {
    // ... fails, `pkg` (possibly expensive to rebuild) is gone
}

// Idiom: give it back
struct InstallError { pkg: Package, source: io::Error }
fn install(pkg: Package) -> Result<(), InstallError> { .. }
```

### 9. Sources that returned 404 or thin content this pass

`google.github.io/styleguide/rsguide.html` and `.../rustguide.html`,
`source.android.com/docs/setup/build/rust/style-guide` and `/policy`, and the
ANSSI checklist page (`07_checklist.html`) all 404'd against the current site
structure — these guides have moved or been restructured since last indexed.
The ANSSI guide's [introduction](https://anssi-fr.github.io/rust-guide/) did
load and confirms scope (unsafe code, external library selection, language
constructs; explicitly excludes async Rust as of this version) but the fetch
tool could not extract the numbered `STD-*`/`LANG-*` recommendation IDs from
the chapter pages — flagged here rather than fabricated.

## Normative guidance candidates

1. **Derive the full common-trait set on public types** (`Clone, Debug,
   PartialEq, Eq, Hash, Default` where semantically valid) unless there's a
   documented reason not to.
   Rationale: missing derives fail silently at a call site far from the type
   definition, not at the definition itself.
   Verification: `cargo clippy -- -W clippy::missing_docs_in_private_items`
   doesn't catch this; instead grep every `pub struct`/`pub enum` and check
   each has `#[derive(..)]` including at minimum `Debug`; enforce
   `clippy::missing_fields_in_debug` and require `Debug` project-wide via
   `#![warn(missing_debug_implementations)]`.

2. **Every `unsafe` block carries a `// SAFETY:` comment.**
   Rationale: the comment is the audit trail; without it, review of `unsafe`
   degrades to "trust the author."
   Verification: `clippy::undocumented_unsafe_blocks = "deny"` in
   `[lints.clippy]`.

3. **Contain `unsafe` inside small, named modules with a safe public wrapper API.**
   Rationale: module-boundary containment makes `unsafe` auditable in one
   sitting; unsafe scattered through business logic is not.
   Verification: reading heuristic — `grep -rn "unsafe" --include=*.rs | grep -v '_test'`
   and check each hit sits inside a module whose *only* job is that unsafe op.

4. **`Drop::drop` never panics and never blocks.**
   Rationale: a panicking or blocking destructor breaks cleanup during unwind
   and can deadlock during shutdown — directly relevant to lockfile guards and
   temp-download-dir guards.
   Verification: reading heuristic on every `impl Drop` — no `.unwrap()`,
   `.expect()`, `panic!`, or synchronous network/lock calls inside `drop()`;
   consider `clippy::significant_drop_in_scrutinee` / `clippy::let_underscore_lock`.

5. **Opt into the clippy `restriction` lints that police risk, not style**
   (`arithmetic_side_effects`, `as_conversions`, `unwrap_used`, `expect_used`,
   `print_stdout`, `print_stderr` outside a CLI's output layer).
   Rationale: these lints are allow-by-default precisely because they're
   project-policy, not universal — silence here is an unmade decision, not
   an endorsement.
   Verification: `[lints.clippy]` table in the workspace root `Cargo.toml`;
   `cargo clippy --workspace --all-targets` in CI must be clean at the chosen level.

6. **Run `cargo deny check` with all four checks enabled** (`advisories`,
   `bans`, `licenses`, `sources`) in CI, not just `cargo audit`.
   Rationale: `bans` and `sources` catch classes of bug (duplicate crate
   versions, non-crates.io dependency confusion) that a vulnerability
   scanner alone will never see.
   Verification: `cargo deny check` exit code in CI; a `deny.toml` present at
   the workspace root with non-empty `[bans]` and `[sources]` sections.

7. **Treat RustSec `unmaintained` and `yanked` findings as CI failures, not warnings.**
   Rationale: `cargo audit`'s default severity gate is vulnerability-only;
   an unmaintained crate in a package manager's supply chain is a standing risk.
   Verification: `cargo audit --deny unmaintained --deny yanked` (or the
   equivalent `[advisories]` block in `deny.toml`).

8. **Public functions validate their own arguments; don't rely on caller discipline** (`C-VALIDATE`).
   Rationale: validation at the API boundary survives a second, third,
   n-th call site; validation at the call site does not.
   Verification: reading heuristic — every `pub fn` taking a "raw" type
   (`&str`, `PathBuf`, `u64`) that has preconditions either validates inline
   or takes a newtype that enforces the precondition in its constructor.

9. **Encode a fixed set of boolean options as `bitflags!`, not as combinatorial
   enum variants or a run of `bool` parameters** (`C-BITFLAG`).
   Rationale: bitflags gives you `Debug`, set operations, and serialization
   for free; hand-rolled combinations don't compose and don't `Display` sanely.
   Verification: reading heuristic — a function signature with 3+ trailing
   `bool` parameters, or an enum whose variants are power-set combinations of
   independent concerns, is a `bitflags` candidate.

10. **Public structs keep fields private; expose sealed traits, not open ones,
    unless external implementation is an explicit design goal** (`C-SEALED`,
    `C-STRUCT-PRIVATE`).
    Rationale: this is the actual mechanism semver-safety runs on — adding a
    field or a trait method is a breaking change only if the type/trait was
    open to begin with.
    Verification: `cargo public-api` diff between releases catches the break
    after the fact; the proactive check is a reading heuristic — no `pub`
    field on a struct with any invariant, no `pub trait` meant for internal
    dispatch only without a `Sealed` supertrait.

11. **Lockfiles and on-disk cache formats carry an explicit schema-version
    field, checked on read, with a defined migration or rejection path.**
    Rationale: none of the surveyed guides address this — it's a genuine gap
    this project must self-legislate, and getting it wrong means silently
    misreading an old lockfile as a new one.
    Verification: reading heuristic — the serialized lockfile/cache struct has
    a `version: u32` (or equivalent) field as the first field, and the read
    path has a `match version { .. }` or explicit `unsupported version` error,
    not a bare `serde_json::from_str` that trusts the shape.

12. **Serialize any collection whose output order affects a file on disk
    (lockfiles, manifests) from an ordered container (`BTreeMap`/sorted `Vec`),
    never straight from a `HashMap`/`HashSet`.**
    Rationale: `HashMap` iteration order is randomized per-process by default
    (`RandomState`) — identical input produces a different byte-for-byte
    lockfile on every run, breaking diffs and reproducibility.
    Verification: `grep -rn "HashMap\|HashSet" --include=*.rs src/ | grep -i
    "lock\|manifest\|serialize"` — any hit is a candidate to convert to
    `BTreeMap`/`BTreeSet` or to sort before serializing.

## AI-agent angle

- **Missing derives are invisible to an LLM's own review loop.** A model
  writing a new `pub struct` has no compile error to react to when it omits
  `Debug`/`Clone`/`PartialEq` — the smallest mechanical check is
  `#![warn(missing_debug_implementations)]` at the crate root plus a CI grep
  for `pub struct`/`pub enum` without a `#[derive(`.
- **LLMs default to `HashMap` reflexively and rarely reach for `BTreeMap`
  even when output determinism matters** — the smallest check is the
  `HashMap`-near-`serialize`/`lock`/`manifest` grep in candidate #12 above,
  run as a pre-commit or CI grep, not a clippy lint (clippy has no lint for
  "this HashMap feeds a serializer").
- **`unsafe` blocks generated by an LLM are syntactically correct but rarely
  carry a safety justification**, because the model optimizes for "compiles"
  over "is reviewable" — `clippy::undocumented_unsafe_blocks = "deny"` turns
  this from a review-time catch into a compile-time one, which is strictly
  better for an unattended agent loop.
- **Models copy the `as` cast reflexively for numeric narrowing** (e.g.
  `len as u32` for a digest offset) because it's shorter to generate than
  `u32::try_from(len)?` — `clippy::as_conversions` or
  `clippy::cast_possible_truncation` at `warn` turns every instance into a
  visible diff line the agent (or its reviewer pass) must justify or fix.
- **Fallible builder/install APIs generated by an LLM drop the caller's input
  on error by default** (`fn install(pkg: Package) -> Result<(), Error>`)
  because "return the owned value back" is an idiom, not something the type
  checker demands — smallest check is a reading heuristic on every `pub fn`
  taking an owned, non-trivially-reconstructible argument and returning
  `Result<_, E>`: does `E` give it back?

## Contested / evolving

- **`unwrap_used`/`expect_used` as blanket `deny` vs. targeted `warn`:**
  practice is trending toward `warn` at the workspace level with `#[allow]`
  overrides in tests and genuinely-infallible call sites, rather than a
  blanket `deny` that forces noisy per-line suppressions — the Rust API
  Guidelines don't take a position; this is purely a clippy-restriction-group
  convention that different orgs (Microsoft's guidelines, Google's internal
  style) settle differently.
- **`pedantic`/`nursery` wholesale-enable vs. cherry-pick:** the ecosystem is
  visibly split between `#![warn(clippy::pedantic)]` wholesale (accepting
  noise for coverage) and hand-picking individual pedantic lints into
  `[lints.clippy]`; no surveyed guide picks a side definitively, and clippy
  itself churns lint group membership (`nursery` → `pedantic` promotions)
  release to release, so a pinned toolchain matters more here than the choice
  itself.
- **cargo-deny vs. cargo-vet:** cargo-deny polices the dependency graph's
  *properties* (license, duplicates, advisories); cargo-vet polices *who
  audited the code* — these are complementary, not competing, but guidance
  varies on whether a CLI-shipping-binaries project needs both or just the
  former; direction of travel favors adding cargo-vet as supply-chain
  scrutiny tightens industry-wide post-xz.
- **Fuchsia's mandatory SAFETY-comment rule vs. upstream API guidelines'
  silence on it:** this is a case of a downstream guide codifying something
  the upstream guidelines left as convention — worth watching whether it
  gets folded into the base Rust API Guidelines or `clippy::correctness`
  itself in a future edition.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rust-lang.github.io/api-guidelines](https://rust-lang.github.io/api-guidelines/) | Official Rust API Guidelines (rust-lang org) | Living doc, edition-2024 era | The base normative spec almost every other guide here forks from |
| [rust-lang.github.io/api-guidelines/checklist.html](https://rust-lang.github.io/api-guidelines/checklist.html) | Full `C-*` rule checklist | Same | Flat, greppable rule list |
| [doc.rust-lang.org/nightly/style-guide](https://doc.rust-lang.org/nightly/style-guide/) | Official Rust Style Guide (rustfmt's spec) | Nightly, tracks current rustfmt | Authoritative formatting rules; explicitly the rustfmt reference |
| [fuchsia.dev/.../development/api/rust](https://fuchsia.dev/fuchsia-src/development/api/rust) | Fuchsia's Rust API rubric | Current | Independent convergence on API guidelines + one novel SAFETY-comment rule |
| [rust-lang.github.io/rust-clippy/master/index.html](https://rust-lang.github.io/rust-clippy/master/index.html) | Full clippy lint index by group | master (current) | Taxonomy of common mistakes as a lint catalog |
| [rust-unofficial.github.io/patterns](https://rust-unofficial.github.io/patterns/) + [raw SUMMARY.md](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md) | Curated patterns/idioms/anti-patterns book | Actively maintained | Flat idiom/anti-pattern list, several items with no other codified home |
| [mre/idiomatic-rust](https://github.com/mre/idiomatic-rust) | Curated link list of idiomatic-Rust articles/talks | Actively maintained | Meta-index; surfaces which guides/tools the community treats as canonical |
| [embarkstudios.github.io/cargo-deny](https://embarkstudios.github.io/cargo-deny/) | cargo-deny documentation | Current | Codifies license/bans/sources/advisories as four distinct dependency policies |
| [rustsec.org](https://rustsec.org/) | RustSec project site (Advisory DB, cargo-audit) | Current | Vulnerability + unmaintained + yanked taxonomy, OSV export |
| [github.com/rustfoundation/safety-critical-rust-coding-guidelines](https://github.com/rustfoundation/safety-critical-rust-coding-guidelines) + [coding-guidelines.arewesafetycriticalyet.org](https://coding-guidelines.arewesafetycriticalyet.org/) | Safety-Critical Rust Consortium coding guidelines | Active, Rust Foundation-hosted | 18-chapter taxonomy of what a strict Rust reviewer has opinions about |
| [microsoft.github.io/rust-guidelines](https://microsoft.github.io/rust-guidelines/) | Microsoft's open-source Rust guidelines | Active | Splits Resilience from Correctness; has a dedicated AI/agent-authored-Rust category |
| [anssi-fr.github.io/rust-guide](https://anssi-fr.github.io/rust-guide/) | ANSSI (French national cyber agency) secure Rust coding guide | Marked "unstable" by the authors | National-agency secure-coding scope statement (unsafe, external libs, language constructs); chapter-level `STD-*`/`LANG-*` rule IDs exist but did not render through this pass's fetch tool |

## Candidate topics

| Candidate topic | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|
| Derive-completeness for public types (`Debug`/`Clone`/`Eq`/`Hash`/`Default`) | Missing derives fail silently at a distant call site, not at definition | Rust API Guidelines `C-COMMON-TRAITS`, Fuchsia rubric | no | high |
| Mandatory `// SAFETY:` comments on every `unsafe` block | Turns unsafe review from "trust the author" into an auditable, mechanically-checkable artifact | Fuchsia API rubric | partial (rust-security covers unsafe generally, not the comment mandate) | high |
| Contain `unsafe` inside small, named modules with a safe wrapper | Module boundary, not function boundary, is the real unit of unsafe review | rust-unofficial/patterns ("Contain unsafety in small modules") | partial | medium |
| `Drop::drop` must never panic or block | Breaks cleanup during unwind/shutdown; directly hits lockfile and temp-dir guards | API Guidelines `C-DTOR-FAIL`/`C-DTOR-BLOCK`, patterns "RAII Guards" | no | high |
| Deterministic serialization ordering (`BTreeMap` over `HashMap` for lockfiles/manifests) | `HashMap` iteration order is randomized per-process; breaks reproducible, diffable lockfiles | own analysis, no single guide states it directly | no | high |
| On-disk format/schema versioning for lockfiles and caches | No surveyed guide addresses it; silent misread of an old format is a real failure mode | own analysis (gap identified against `C-STABLE`, which only covers crate API stability) | no | high |
| Cross-platform path handling (`OsStr`/`OsString`, non-UTF-8 filenames, case sensitivity, Windows verbatim prefixes) | Falls between style guides (too CLI-specific) and security guides (not memory-unsafe); the most common source of platform-only bugs | own analysis, cross-referenced against ANSSI's language-construct scope | no | high |
| Integer overflow / lossy-cast discipline (`arithmetic_side_effects`, `as_conversions`, `cast_possible_truncation`) | Real bug class in size/offset math on archives and digests; deliberately allow-by-default in clippy, needs explicit opt-in | clippy `restriction`/`pedantic` groups | partial (rust-security covers unsafe/UB, not numeric-cast lints specifically) | high |
| Return the caller's owned argument inside `Err` on a fallible operation | API-shape idiom absent from generic error-handling guidance; matters for install/build APIs taking expensive owned values | rust-unofficial/patterns ("Return consumed arg on error") | no | medium |
| Sealed traits + private struct fields as the semver-safety mechanism | This is the actual mechanism "extensibility seams" runs on, not a vague principle | API Guidelines `C-SEALED`/`C-STRUCT-PRIVATE`/`C-NEWTYPE-HIDE`/`C-STRUCT-BOUNDS` | partial (type-architecture wave covers newtype/typestate but not the semver-safety framing) | high |
| `bitflags` for boolean-option sets instead of bool-parameter runs or combinatorial enums | Named, specific anti-pattern LLMs fall into by default | API Guidelines `C-BITFLAG` | no | medium |
| Argument validation at the API boundary, not the call site (`C-VALIDATE`) | Validation logic that lives at the boundary survives every future call site; call-site validation silently disappears at the second one | API Guidelines `C-VALIDATE` | partial (adjacent to error-handling wave but distinct: about *where*, not *how*) | medium |
| cargo-deny's four independent policy axes (advisories/bans/licenses/sources) run as one CI gate | `bans` and `sources` catch dependency-confusion and duplicate-crate-ABI bugs a vulnerability scanner alone never sees | cargo-deny docs | partial (supply-chain generically covered; this is the specific four-axis framing) | high |
| RustSec `unmaintained`/`yanked` as CI-failing, not just vulnerability CVEs | Default `cargo audit` severity gate is vulnerability-only; an unmaintained crate in an OCI/HTTP dependency chain is a standing risk | RustSec | partial | medium |
| Feature-flag / `cfg` discipline across a Cargo workspace (feature unification hazards) | Enabling a feature in one workspace binary can silently change behavior of a shared lib used by a sibling binary in the same build | Safety-Critical Consortium ("Program Structure and Compilation"), Microsoft guidelines ("Building") | no | high |
| Resilience: retry/backoff/timeout policy for registry HTTP calls, separated from error-type design | ghcr.io calls are flaky-network-prone; Microsoft's guidelines treat this as its own discipline, distinct from "is the error type correct" | Microsoft Rust guidelines ("Resilience" category) | partial (async wave covers cancellation/backpressure, not retry policy as an API-design concern) | high |
| Idempotent install/update operations (safe to re-run after a partial failure or retry) | Retry policy above is unsound without this; a package manager's core operations must tolerate at-least-once execution | own analysis, adjacent to Microsoft "Resilience" | no | high |
| Naming conventions: `as_`/`to_`/`into_` for conversions, getters without `get_`, `iter`/`iter_mut`/`into_iter` | Concrete, checkable naming rules distinct from architecture-level trait-vs-function guidance | API Guidelines `C-CONV`/`C-GETTER`/`C-ITER`/`C-ITER-TY` | no | medium |
| `From`/`AsRef`/`AsMut` over ad-hoc `.to_x()`/`.as_x()` conversion methods | Standard-trait conversions compose with generic code (`impl Into<T>` params); ad-hoc methods don't | API Guidelines `C-CONV-TRAITS` | no | medium |
| Generic reader/writer functions take `R: Read`/`W: Write` by value, not `&mut` | Specific, checkable signature convention; generic architecture guidance won't surface it | API Guidelines `C-RW-VALUE` | no | low |
| `Send`/`Sync` soundness review for custom types crossing thread/await boundaries | Distinct from "how to use sync primitives" — it's about whether hand-rolled types are sound to share across threads at all | API Guidelines `C-SEND-SYNC` | partial (async wave covers sync primitives usage, not custom-type Send/Sync soundness) | medium |
| Fixed-size arrays / const generics for digests and hashes (`[u8; 32]` not `Vec<u8>`) | Directly applicable to this project's digest-verification code path; encodes length invariant in the type | own analysis, adjacent to API Guidelines `C-NEWTYPE` | no | medium |
| Zero-copy deserialization for OCI manifest/config JSON (borrow from buffer instead of per-field allocation) | Not named explicitly in the performance wave's bullet list; concrete win for manifest-heavy hot paths | own analysis, adjacent to `serde(borrow)` idiom | partial | medium |
| Monotonic vs. wall-clock time for cache TTLs and lockfile timestamps (`Instant` vs `SystemTime`) | Wall-clock skew/adjustment silently corrupts TTL logic; not addressed in any surveyed guide | own analysis | no | medium |
| Mutex poisoning semantics on panic, and the project's chosen recovery policy | Distinct from "how to use a Mutex" — it's what happens to shared cache state after a panicked holder | Safety-Critical Consortium ("Concurrency"), adjacent to API Guidelines dependability chapter | partial (async wave covers sync primitives generically) | low |
| Macro hygiene and proc-macro span/error-reporting discipline | Low usage surface in this project today, but any custom derive/declarative macro needs this | Safety-Critical Consortium ("Macros"), API Guidelines Macros chapter | no | low |
| clippy `restriction` group as explicit opt-in policy, not default noise | Allow-by-default because it's project-policy; silence is an unmade decision | clippy lint index | partial (tooling-ci wave covers lint *selection* generically; this is the specific restriction-group framing) | high |
| SPDX license allowlisting across the full dependency tree | Legally load-bearing for a project shipping prebuilt OSS binaries; distinct check from vulnerability scanning | cargo-deny `[licenses]` | partial | medium |
| Duplicate-dependency-version detection across a Cargo workspace | Catches ABI/type mismatches (two `windows-sys` or `rustls` versions linked into one binary), not just bloat | cargo-deny `[bans]` | no | medium |
| Version-aware sorting convention for numeric-suffixed identifiers (`u8` before `u16`, not lexicographic) | Minor but rustfmt-adjacent; low practical bite once `cargo fmt` is enforced | Rust Style Guide | no | low |
| Machine-readable, checksummed IDs for this project's own normative-guidance rules | Precedent from the Safety-Critical Consortium's Sphinx-Needs `needs.json` output — a model for making future rule sets grep/lint-checkable rather than prose-only | Safety-Critical Consortium publishing format | no | low |
