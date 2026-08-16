---
title: Module Tree, Visibility, and File Layout
topic: Rust module system design — cohesion, file layout, visibility discipline, circular-dependency avoidance
agent: rust-domain-researcher-module-visibility
model: sonnet
date_researched: 2026-08
sources_count: 17
scope: >
  Covers module-tree design principles, mod.rs vs name.rs file layout, re-export/facade
  patterns, visibility modifiers (pub/pub(crate)/pub(super)/pub(in path)), sealed traits,
  clippy/rustc lints for API-surface hygiene, and real-repo evidence on splitting a
  monolithic crate. Does NOT cover generic/trait-object type design (see the type-design
  research file), async runtime architecture, or build-system/workspace tooling beyond what
  bears directly on module boundaries.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The default privacy model and the four restricted-visibility forms](#1-the-default-privacy-model-and-the-four-restricted-visibility-forms)
   2. [`mod.rs` vs `name.rs`: the 2018+ file-layout convention](#2-modrs-vs-namers-the-2018-file-layout-convention)
   3. [Module tree design: cohesion, one-concept-per-module, when to split a file](#3-module-tree-design-cohesion-one-concept-per-module-when-to-split-a-file)
   4. [Re-export / facade patterns: `pub use`, preludes, `#[doc(inline)]`](#4-re-export--facade-patterns-pub-use-preludes-docinline)
   5. [Sealed traits and other API-surface-control patterns](#5-sealed-traits-and-other-api-surface-control-patterns)
   6. [Why a large `pub` surface is a liability](#6-why-a-large-pub-surface-is-a-liability)
   7. [`unreachable_pub` and `missing_docs`: lints that enforce the surface](#7-unreachable_pub-and-missing_docs-lints-that-enforce-the-surface)
   8. [Clippy lints on naming and imports: `module_name_repetitions`, `wildcard_imports`](#8-clippy-lints-on-naming-and-imports-module_name_repetitions-wildcard_imports)
   9. [File-size and function-size heuristics real projects enforce](#9-file-size-and-function-size-heuristics-real-projects-enforce)
   10. [Circular dependencies, layering, and the "one crate" anti-pattern](#10-circular-dependencies-layering-and-the-one-crate-anti-pattern)
   11. [Import ordering and item ordering within a file](#11-import-ordering-and-item-ordering-within-a-file)
   12. [Module structure and LLM-agent navigability](#12-module-structure-and-llm-agent-navigability)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Everything is private by default except trait items in a `pub trait` and variants in a `pub enum`; a bare `pub` is the least-restrictive choice and should be the exception, not the reflex ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)).
- Prefer `pub(crate)` over bare `pub` for anything not part of the crate's external contract — it documents intent and lets `unreachable_pub` catch drift ([rustc lint docs](https://doc.rust-lang.org/beta/nightly-rustc/rustc_lint/builtin/static.UNREACHABLE_PUB.html)).
- `pub(in path)` restricts visibility to a specific ancestor subtree when `pub(crate)` is still too wide — useful for "visible to this feature's siblings, not the whole crate" ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)).
- Rust 2018+ style prefers `name.rs` + `name/` sibling directory over `name/mod.rs`; both compile identically, but `mod.rs` produces many identically-named tabs in an editor and is treated as legacy in new code ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2018/path-changes.html)).
- `pub use` decouples internal file layout from the public API shape — restructure freely inside a crate as long as the facade re-exports stay stable ([Rust API Guidelines / rustfaq](https://www.rustfaq.org/en/how-to-re-export-items-with-pub-use-in-rust/)).
- Annotate re-exports of your own crate's items with `#[doc(inline)]` so they render inline in docs instead of as an opaque re-export block; never do this for `std` or third-party re-exports — leave those as visible re-export links ([Microsoft Pragmatic Rust Guidelines, M-DOC-INLINE](https://microsoft.github.io/rust-guidelines/guidelines/docs/)).
- Avoid `pub use foo::*` glob re-exports in library crates (M-NO-GLOB-REEXPORTS) — they make it impossible to tell from the re-export site what's actually exported and break `cargo doc` inlining guarantees ([Microsoft Pragmatic Rust Guidelines](https://microsoft.github.io/rust-guidelines/guidelines/docs/)).
- The sealed-trait pattern (`trait Foo: private::Sealed {}` with `private` an unexported module) lets you add trait methods in a minor version without it being a breaking change for downstream implementors, because there are no downstream implementors ([Rust API Guidelines C-SEALED](https://rust-lang.github.io/api-guidelines/future-proofing.html), [predr.ag guide](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/)).
- `clippy::wildcard_imports` (pedantic) flags `use x::*` outside prelude modules and test modules; it can optionally also flag `pub use x::*` re-exports via the `warn-on-all-wildcard-imports` config ([clippy source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/wildcard_imports.rs)).
- `clippy::module_name_repetitions` (pedantic) flags items whose name repeats their containing module's name (e.g. `foo::FooError`); it allow-lists prefixes `to/as/into/from/try_into/try_from` by default ([clippy lint configuration](https://doc.rust-lang.org/nightly/clippy/lint_configuration.html)).
- `clippy::too_many_lines` defaults to a 100-line function threshold; `clippy::cognitive_complexity` defaults to a threshold of 25; both are `u64` values overridable in `clippy.toml` ([clippy lint configuration](https://doc.rust-lang.org/nightly/clippy/lint_configuration.html)).
- Tokio's crate root warns on `missing_docs`, `unreachable_pub`, `missing_debug_implementations`, and `rust_2018_idioms` at the top of `lib.rs` — this is the actual lint posture of a widely-used, security-sensitive async crate ([tokio `lib.rs`](https://github.com/tokio-rs/tokio/blob/master/tokio/src/lib.rs)).
- A monolithic single-crate structure is a symptom, not just a size problem: mixed dependency concerns, `pub` used liberally "because everything is in one crate," and unclear dependency direction are the diagnostic red flags — exactly matching the "everything in one crate" pain point named for this project ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)).
- Rust forbids cyclic crate dependencies; a crate that has evolved circular *module* dependencies inside one crate cannot be split into a workspace without first breaking those cycles — diagnose with `cargo tree` before attempting a split ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/), [pingcap/TiDB blog](https://www.pingcap.com/blog/rust-huge-compilation-units/)).
- rustc/cargo compiles per-crate, not per-module: splitting a monolithic crate is the single highest-leverage lever on incremental compile time, because any change anywhere in a crate re-triggers optimization for that whole compilation unit, and optimization cost is superlinear in code size ([pingcap/TiDB blog](https://www.pingcap.com/blog/rust-huge-compilation-units/)).
- rust-analyzer's contributor style guide places `mod` declarations before `use` statements, groups imports std → external crates → current crate, and explicitly discourages re-exports outside of designated facade modules ("for non-library code, re-exports introduce two ways to use something") ([rust-analyzer style guide](https://rust-analyzer.github.io/book/contributing/style.html)).
- `C-STRUCT-PRIVATE` (private-by-default struct fields) and `C-SEALED` are both "future proofing" guidelines — the same motivating principle as `pub(crate)`-by-default: publicness is a promise you cannot cheaply retract ([Rust API Guidelines](https://rust-lang.github.io/api-guidelines/future-proofing.html)).

## Findings

### 1. The default privacy model and the four restricted-visibility forms

The Rust Reference states the privacy grammar precisely:

```
Visibility →
    pub
  | pub(crate)
  | pub(self)
  | pub(super)
  | pub(in SimplePath)
```

Everything is private by default, with exactly two built-in exceptions: associated items of a `pub trait` are public, and variants/fields of a `pub enum` are public ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)). The privacy model is *tree-shaped*: an item is accessible from module `m` iff `m` can reach every ancestor module of the item's defining module (or the item was re-exported into a reachable path). This is why re-exports "short-circuit" the tree — a `pub use` at a shallow module makes a deeply-nested private-module item reachable without changing the item's own declared visibility:

```rust
mod implementation {
    pub mod api {
        pub fn f() {}
    }
}
pub use self::implementation::api; // api::f is now externally visible;
                                    // implementation::api::f is not.
```

`pub(in path)` is the most granular restricted form. The path must resolve to an ancestor module (in 2018+ edition it must start with `crate`, `self`, or `super`), and only the identifiers reachable via `mod` declarations count — a `use`-imported alias does not satisfy the path ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)). `pub(super)` is sugar for `pub(in super)`; `pub(self)` is sugar for private and exists mainly for macro-generated code that needs an explicit visibility token ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)).

The original motivation for these restricted forms (RFC 1422, stabilized pre-2018 edition but foundational to all current practice) was that developers previously had to choose between two bad options: put a shared helper at a module root (over-exposing it) or bury it in a submodule and mark it `pub` anyway because a sibling needs it, at which point *"one cannot easily tell exactly how 'public' a `pub` item is ... requires reasoning about (1.) all of the `pub use`'s ... and (2.) the `pub`-ness of every module in a path"* ([RFC 1422](https://rust-lang.github.io/rfcs/1422-pub-restricted.html)). `pub(in path)` lets the visibility annotation *state* the scope directly instead of forcing the reader to reconstruct it from re-export chains.

### 2. `mod.rs` vs `name.rs`: the 2018+ file-layout convention

Rust 2015 required a module with submodules to live at `foo/mod.rs`. Rust 2018 lifted that restriction: `foo.rs` can be a plain file, and its submodules still live in the sibling directory `foo/`:

```
# 2015-only style (legacy, still compiles under any edition)   # 2018+ preferred style
src/                                                             src/
├── lib.rs                                                       ├── lib.rs
└── foo/                                                         ├── foo.rs
    ├── mod.rs                                                   └── foo/
    └── bar.rs                                                       └── bar.rs
```

Both are functionally identical to the compiler; the edition guide's stated reason for preferring `name.rs` is purely ergonomic: *"if you have a bunch of files open in your editor, you can clearly see their names, instead of having a bunch of tabs named `mod.rs`"* ([Edition Guide, Rust 2018 path changes](https://doc.rust-lang.org/edition-guide/rust-2018/path-changes.html)). A `foo.rs` and a `foo/` directory may coexist in the same crate; no `mod.rs` file is created or needed once a directory of submodules exists next to `foo.rs`. This is purely a filesystem convention — it has no effect on the `Visibility` grammar in §1.

### 3. Module tree design: cohesion, one-concept-per-module, when to split a file

Neither the Reference nor the API Guidelines prescribe a hard rule for "when to split a file into a module," but the convergent guidance from real-project practice is:

- **Split along dependency direction, not alphabetically or by file size alone.** The recommended refactor path for an overgrown crate is: identify clusters (domain logic, parsing, I/O, CLI) with `cargo tree`, tighten visibility first (replace broad `pub` with `pub(crate)`), *then* extract in dependency order — pure core first, ports/traits next, adapters (I/O, network, DB) last, binaries as the composition root wiring concrete adapters into the app ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)).
- **A module boundary should track a dependency-direction boundary**, not merely a topic label. The anti-pattern's core diagnostic is *"a monolithic crate usually has unclear dependency direction"* — domain code importing an HTTP framework, or "everything can reach everything else." The prescribed rule: `Binaries → Adapters → Application → Core`, and `Core` depends on nothing else in the tree ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)). This applies equally within one crate's module tree — you don't need a workspace to enforce a one-way `mod core; mod adapters;` dependency edge, you just need discipline about which module `use`s which.
- **Do not split preemptively.** The same source is explicit about the counter-case: *"A clean single crate is better than a fragmented workspace full of premature abstractions"* — split only once dependencies are actually simple to separate, tests are already slow because of coupling, or another binary genuinely needs the code ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)). This is a direct check on over-splitting single-purpose CLI tools into workspaces they don't need.
- **A module is a compilation-cost unit too, at the crate level.** rustc's optimizer has superlinear cost in code size per compilation unit, and any single change inside a crate forces recompilation of that whole crate — a large single crate can't get incremental-compile benefit from touching only one logical area of it ([pingcap/TiDB engineering blog](https://www.pingcap.com/blog/rust-huge-compilation-units/)). This is an argument for module-then-crate splitting even when correctness doesn't strictly require it.
- **rust-analyzer's item-ordering convention** inside a single file: put public items before private ones when they're mixed, put type declarations (`struct`/`enum`) before the functions and `impl` blocks that use them, and order type declarations top-down (parent types before the child types they contain) — explicitly optimizing for "the reader who sees the file for the first time" ([rust-analyzer style guide](https://rust-analyzer.github.io/book/contributing/style.html)).

### 4. Re-export / facade patterns: `pub use`, preludes, `#[doc(inline)]`

`pub use` is the mechanism for a "narrow facade over an internal module tree" — a crate's `src/` can be organized however is convenient for the implementers, while `lib.rs` (or a dedicated `pub mod prelude`) re-exports a curated, stable subset as the actual public API ([rustfaq: re-exporting](https://www.rustfaq.org/en/how-to-re-export-items-with-pub-use-in-rust/)). Rust API Guidelines' documentation guidance formalizes two rules that only apply once re-exports are involved:

- **`#[doc(inline)]` on re-exports of your own crate's items** so `cargo doc` renders them as if defined at the re-export site, not as an opaque "Re-exports" list the reader has to click through — but *"this does not apply to `std` or 3rd party types; these should always be re-exported without inlining"* (M-DOC-INLINE, [Microsoft Pragmatic Rust Guidelines](https://microsoft.github.io/rust-guidelines/guidelines/docs/)).
- **No glob re-exports** (`pub use foo::*;`) in library code — M-NO-GLOB-REEXPORTS — "you generally should not re-export items via wildcards," because a glob re-export makes the actual exported surface un-auditable from the re-export site and is invisible to tooling that inlines individual items ([Microsoft Pragmatic Rust Guidelines](https://microsoft.github.io/rust-guidelines/guidelines/docs/)).

rust-analyzer's own style guide goes further for application/tool code specifically: *"for non-library code, re-exports introduce two ways to use something and allow for inconsistency"* — its convention is "avoid re-exports by default," treating them as an exception granted only to designated facade modules, not a default habit ([rust-analyzer style guide](https://rust-analyzer.github.io/book/contributing/style.html)). This is directly applicable to `grim`/`ocx`-style single-binary CLI tools: a facade module (e.g. a top-level `prelude` or the crate root) is where re-exports belong; scattering `pub use` through internal modules recreates the "everything can reach everything else" anti-pattern from §3 even inside one module tree.

A named `pub mod prelude { pub use ... }` is exempt from `clippy::wildcard_imports`'s glob-import restriction specifically *because* it contains `prelude` in its path — the lint's exception list is keyed on the literal substring `prelude` in the module path ([clippy `wildcard_imports.rs` source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/wildcard_imports.rs)).

### 5. Sealed traits and other API-surface-control patterns

The sealed-trait pattern (Rust API Guidelines `C-SEALED`) prevents downstream crates from implementing a trait, by making the trait require a supertrait that lives in a private (unexported) module:

```rust
// Correct: sealed — only this crate can implement TheTrait
pub trait TheTrait: private::Sealed {
    fn method(&self);
}

mod private {
    pub trait Sealed {}
    impl Sealed for MyType {}   // only types this crate opts in
}
```

```rust
// Incorrect: any downstream crate can implement this,
// so adding a method to it later is a breaking change for them.
pub trait TheTrait {
    fn method(&self);
}
```

The Guidelines' stated payoff: *"We are free to add methods to `TheTrait` in a non-breaking release even though that would ordinarily be a breaking change"* because there are no external implementors to break ([Rust API Guidelines, future-proofing](https://rust-lang.github.io/api-guidelines/future-proofing.html)). A second, stricter variant seals *calling* the trait's methods too, by making a method take an unnamable private token type as a parameter — useful when even downstream code shouldn't be able to invoke a method, only observe its effects through other public API ([predr.ag, "A definitive guide to sealed traits in Rust"](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/)). The caveat noted by that source: sealing is not "free" API design — it forecloses legitimate external extension, so it should be applied to traits the crate genuinely intends to own forever, not defensively to every public trait.

The companion rule, `C-STRUCT-PRIVATE`, applies the identical philosophy to data instead of behavior: *"Making a field public is a strong commitment: it pins down a representation choice, and prevents the type from providing any validation or maintaining any invariants"* ([Rust API Guidelines, future-proofing](https://rust-lang.github.io/api-guidelines/future-proofing.html)). Both rules reduce to the same normative point as `pub(crate)`-by-default in §6: publicness is cheap to grant and expensive to revoke, so grant it only where the API is actually meant to be a contract.

### 6. Why a large `pub` surface is a liability

RFC 1422's motivating case (§1) generalizes: every additional `pub` item is a semver promise. Two independent, converging pieces of evidence:

- The Rust Reference's basic privacy model already treats `pub` as "reachable from every module that can reach this item's ancestors" — a bare `pub` on an item nested three modules deep is not a mild convenience, it makes the item reachable from *outside the crate* the moment any ancestor module is also `pub`, which is easy to lose track of as a module tree grows ([Rust Reference](https://doc.rust-lang.org/reference/visibility-and-privacy.html)).
- The monolithic-crate anti-pattern's diagnostic list names *"broad visibility: modules use `pub` liberally because 'everything is in one crate'"* as a direct symptom of structural decay, and the first remediation step, before any file is even moved, is *"replace broad `pub` with `pub(crate)`"* ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)). This is the exact failure mode named for this project's codebase.

The practical cost is bidirectional: a wide `pub` surface (a) commits the crate to backward compatibility on things that were never meant to be load-bearing, and (b) removes the compiler's ability to tell you what's actually unused or what can safely change, because everything *looks* potentially externally used.

### 7. `unreachable_pub` and `missing_docs`: lints that enforce the surface

`unreachable_pub` (a rustc built-in lint, not clippy) fires on any `pub` item that is not actually reachable from outside the crate — not directly `pub`-accessible, not re-exported via `pub use`, and not leaked through a public function's return type. It is allow-by-default (because it fires broadly on existing code that hasn't been audited), and its own documentation gives the fix directly: *"If you wish the item to be accessible elsewhere within the crate, but not outside it, the `pub(crate)` visibility is recommended to be used instead, which more clearly expresses the intent"* ([rustc lint docs, `UNREACHABLE_PUB`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_lint/builtin/static.UNREACHABLE_PUB.html)). This is precisely the RFC 2126 proposal realized: RFC 2126 proposed *"A lint against use of bare `pub` for items which are not reachable via some fully-`pub` path. That is, bare `pub` should truly mean public, and `crate` should be used for crate-level visibility"* ([RFC 2126, path clarity](https://rust-lang.github.io/rfcs/2126-path-clarity.html)) — `unreachable_pub` is that lint, shipped.

`missing_docs` is available both as a rustdoc lint and directly from rustc, controllable via `#[warn(missing_docs)]` / `#[deny(missing_docs)]` at the crate root ([rustdoc book, lints](https://doc.rust-lang.org/rustdoc/lints.html)). It only fires on items that are actually part of the public API surface — meaning it composes with `unreachable_pub`: tightening visibility with `pub(crate)` shrinks what `missing_docs` demands documentation for.

Real-world evidence for both together: tokio's crate root (`tokio/src/lib.rs`) opens with `#![warn(missing_debug_implementations, missing_docs, rust_2018_idioms, unreachable_pub)]` — a widely depended-on, security-adjacent async crate enforces exactly this pair at `warn` level crate-wide ([tokio `lib.rs`](https://github.com/tokio-rs/tokio/blob/master/tokio/src/lib.rs)).

### 8. Clippy lints on naming and imports: `module_name_repetitions`, `wildcard_imports`

`clippy::module_name_repetitions` (pedantic group) fires when an item's name repeats its containing module's name — e.g. `mod foo { struct FooBar; }` instead of `mod foo { struct Bar; }`, because callers already write `foo::Bar` and the repeated `Foo` is redundant noise. It is configurable via `clippy.toml`:

```toml
# clippy.toml
allow-exact-repetitions = true   # default: item name == module name is still allowed
allowed-prefixes = ["to", "as", "into", "from", "try_into", "try_from"]  # default list
```

so `mod foo { fn from_foo() {} }` is exempt even though it repeats `foo` ([clippy lint configuration](https://doc.rust-lang.org/nightly/clippy/lint_configuration.html)).

`clippy::wildcard_imports` (pedantic group) fires on `use x::*;` because *"wildcard imports can pollute the namespace ... especially bad if you try to import something through a wildcard, that already has been imported by name from a different source"* ([clippy `wildcard_imports.rs` source, doc comment](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/wildcard_imports.rs)). Built-in exceptions: any path segment containing `prelude`, and `use super::*` inside a module whose name contains `test`. A `warn-on-all-wildcard-imports` config flag disables both exceptions, and (as of the lint's evolution tracked in [rust-clippy PR #14182](https://github.com/rust-lang/rust-clippy/pull/14182)) can additionally be made to flag `pub use x::*;` glob re-exports, not just `use`. There is no separate `clippy::pub_use` lint — glob re-export coverage lives inside `wildcard_imports`'s configuration, not a distinct lint name; do not cite `clippy::pub_use` as a real lint.

```rust
// Flagged by wildcard_imports (pedantic)
use crate1::*;
foo();

// Preferred
use crate1::foo;
foo();
```

### 9. File-size and function-size heuristics real projects enforce

Clippy ships numeric, `clippy.toml`-overridable thresholds for exactly the "when has this grown too large" question, all `u64` config keys under the pedantic/complexity groups ([clippy lint configuration](https://doc.rust-lang.org/nightly/clippy/lint_configuration.html)):

| Lint | Default threshold | What it measures |
|---|---|---|
| `too_many_lines` | 100 lines | function/method body length |
| `cognitive_complexity` | 25 | branching/nesting complexity per function |
| `type_complexity` | 250 | nested-generic type complexity |
| `excessive_nesting` | 0 (opt-in; disabled by default) | block nesting depth |
| `stack_size` (restriction-group, `large_stack_frames`) | 512000 bytes | per-function stack frame size |

`cognitive_complexity` is deliberately kept out of the default-warn set — its own maintainers' framing is that *"cognitive complexity ... has been left in `restriction` so as to not mislead users into using it as a measurement tool, as the true cognitive complexity of a method is not something that can be calculated using modern technology"* ([Yury Zhauniarovich's clippy pedantic-lint survey, corroborating the clippy source comments](https://zhauniarovich.com/post/2021/2021-09-pedantic-clippy/)) — treat it as a smoke alarm, not a hard gate.

There is no rustc/cargo-native "file too long" lint — file-size limits are enforced, when they are enforced at all, either by external tooling (`tokei`, a CI grep/`wc -l` check) or implicitly by `too_many_lines` catching the symptom (a file that's too long usually has at least one function that's too long). Given no canonical numeric file-length threshold exists in the ecosystem's own tooling, treat "split the file" as a *module-boundary* judgment call (§3) triggered when a file mixes unrelated concerns or exceeds roughly 300–500 lines with no natural single responsibility, rather than a lint-enforced number — this is inference from the absence of a first-party lint, not a cited fact, and should be flagged as such to the reader.

### 10. Circular dependencies, layering, and the "one crate" anti-pattern

Rust's crate graph is required to be acyclic — crate A cannot depend on crate B if B depends (even transitively) on A. This is not true of *modules* within one crate: nothing stops `mod a` and `mod b` in the same crate from `use`-ing each other's items in both directions, and the compiler will happily compile it. That gap is exactly how monolithic crates form: *"large crates allow modules to have circular dependencies, which feels convenient but prevents extracting them into separate crates (since crates require acyclic dependencies)"* ([pingcap/TiDB engineering blog](https://www.pingcap.com/blog/rust-huge-compilation-units/)). The same source's retrospective on TiKV: *"projects tend to start in a single crate, without great attention to their internal dependency graph, and once compilation time becomes an issue, they have already created a spaghetti dependency graph,"* requiring *"multiple aborted attempts to extract various modules ... in long sequences of commits that untangle internal dependencies"* — i.e., the cost of not enforcing module-level acyclicity early is paid later, at a multiple, when someone tries to split the crate.

Practical layering discipline that prevents this, restated from §3's refactor order: `binaries → adapters → application → core`, one-directional, with `core` importing nothing else in the tree. This can — and for a single-crate CLI tool, should — be enforced with plain module `mod`/`use` discipline (`mod core;` never contains `use crate::adapters::...`) well before any workspace split is warranted; a workspace split is the mechanical enforcement of a boundary that should already be true logically ([Software Patterns Lexicon](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/)).

### 11. Import ordering and item ordering within a file

rust-analyzer's contributor style guide (used as an example of a large, well-maintained Rust codebase's actual house style) specifies, in order:

1. `mod` declarations before `use` statements, in "suggested reading order" for a newcomer.
2. Import groups separated by blank lines: `std`, then external crates (one `use` line per crate), then current-crate imports — *"grouping by crate allows spotting unwanted dependencies easier"* ([rust-analyzer style guide](https://rust-analyzer.github.io/book/contributing/style.html)).
3. Prefer `use crate::foo::bar` over `use super::bar` for consistency across files that get moved.
4. Qualify ambiguous/overloaded names by importing the parent module rather than the item (`use syntax::ast; ... fn f(x: ast::Struct)` rather than `use syntax::ast::Struct;`) when two crates in the dependency graph have colliding short names (their example: `hir` vs `ast`).

None of this is rustc/clippy-enforced (there is no first-party import-order lint as of this writing beyond `rustfmt`'s `reorder_imports`, which is stable and on by default and handles alphabetical-within-group ordering, not the std/external/crate grouping itself). Treat rust-analyzer's convention as a strong community precedent, not a compiler-checked rule.

### 12. Module structure and LLM-agent navigability

No primary Rust-ecosystem source addresses this directly (it's outside API-guidelines/RFC scope), so this is inference from the module-system mechanics established above, flagged as such:

- **One-concept-per-file plus a name that matches the concept is a grep contract.** `mod.rs`-style layout defeats this — an agent's own reasonable first move on an unfamiliar tree is to grep the filename for the concept it's hunting (`grep -r "struct Cache" --include=*.rs` will surface `cache.rs` by name-match; it will not surface `cache/mod.rs` any differently, but a directory listing full of `mod.rs` entries gives an agent zero filename signal before it opens anything — this is the exact ergonomic complaint the edition guide raised about tabs, generalized to an agent's directory listing instead of a human's editor tabs (§2)).
- **A narrow, `pub(crate)`-disciplined visibility surface (§6–§7) is a smaller context window for an agent modifying one module** — if `unreachable_pub` and `missing_docs` are enforced, an agent can trust that anything *not* documented and *not* `pub` is safe to refactor without an external-consumer search; a codebase that used bare `pub` everywhere (the named pain point) forces the agent to always assume worst-case external reachability, which either produces overly conservative refactors or unsafe ones.
- **Flat facades (`pub use` from a single crate-root or `prelude` module) give an agent one place to read the whole public contract** instead of needing to traverse the tree to reconstruct it — directly serving the same goal RFC 1422's motivating complaint named for humans (§1), just automated: an agent doing `cat src/lib.rs` should be able to answer "what's the API" without following re-export chains through multiple files.
- **Deep module nesting with `pub(in path)` used sparingly and precisely is more agent-legible than deep nesting with bare `pub` everywhere**, because the visibility annotation on each item states its actual audience inline, instead of the agent needing to trace ancestor-module reachability by hand (§1) — a task LLMs are known to get wrong (see AI-agent angle, below).

## Normative guidance candidates

1. **Default every new item to private; only widen to `pub(crate)`, then `pub(super)`/`pub(in path)`, then `pub` as an actual external consumer is identified.** Rationale: publicness is a one-way semver commitment (§1, §6). Verify: `cargo clippy -- -W unreachable_pub` (or crate-level `#![warn(unreachable_pub)]`) reports zero `pub` items that aren't re-exported or externally consumed.

2. **Never use bare `pub` for an item whose only consumers are inside the same crate.** Rationale: RFC 2126's whole premise — bare `pub` should mean "actually public" (§7). Verify: `#![warn(unreachable_pub)]` at crate root; any hit is a `pub` → `pub(crate)` fix.

3. **New multi-file modules use `name.rs` + `name/` sibling directory, never `name/mod.rs`.** Rationale: 2018+ convention, avoids identically-named-file ambiguity for both editors and agents (§2, §12). Verify: `find src -name mod.rs` returns nothing (ignore pre-existing legacy files unless the task is explicitly a migration).

4. **A module that imports from both the domain/core layer and an I/O/framework layer is a boundary violation; split it or invert the dependency behind a trait.** Rationale: unclear dependency direction is the core diagnostic of the monolithic-crate anti-pattern (§3, §10). Verify: for a suspect module, `grep -n "^use crate::" <file>` and check whether the import list mixes e.g. `crate::domain::*` with `crate::http::*` / `crate::db::*` in the same file.

5. **`core`/domain-logic modules must not `use` anything from adapter modules (HTTP, filesystem-as-registry-client, subprocess, OCI/registry I/O); the dependency edge only runs adapters → core.** Rationale: "core depending outward" is named the cardinal architecture error (§3). Verify: `cargo tree`-style reasoning is crate-only; at module granularity, grep each `core`/domain module's `use crate::` lines and confirm none reference adapter modules.

6. **Do not write `pub use module::*;` (glob re-export) in library code, except in a module whose name/path literally contains `prelude`.** Rationale: glob re-exports hide the actual export surface and break `#[doc(inline)]` auditability (§4, §8). Verify: `cargo clippy -- -W clippy::wildcard_imports -C warn-on-all-wildcard-imports=true` (config flag extends the lint to `pub use`, per §8); or grep `pub use .*\*;` outside `prelude` paths.

7. **Re-exports of the crate's own items get `#[doc(inline)]`; re-exports of `std` or third-party types do not.** Rationale: M-DOC-INLINE (§4) — keeps generated docs from either burying your API behind a re-export stub or falsely implying you own an upstream type. Verify: code-reading heuristic — grep `pub use` lines lacking a preceding `#[doc(inline)]` and check whether the re-exported path starts inside `crate::`.

8. **Seal any public trait that the crate does not want external implementors for**, using the `private::Sealed` supertrait pattern, before the trait ships in a 0.x/1.x release. Rationale: adding a method to an unsealed public trait is a breaking change forever after; sealing forecloses that cost once (§5, C-SEALED). Verify: for each `pub trait` in the crate's public surface, check whether any bound requires a type only defined in a non-`pub` module; absence of such a bound plus intent to never accept external impls is a missed `C-SEALED` application.

9. **Prefer private struct fields plus accessor methods over public fields for any type with an invariant.** Rationale: C-STRUCT-PRIVATE — a public field is a permanent representation commitment that forecloses future validation (§5). Verify: grep `pub struct` bodies for `pub` fields; for each, confirm the struct is a pure data-transfer type with no invariant to protect (config/DTO structs are the legitimate exception).

10. **Enforce `missing_docs` and `unreachable_pub` at `warn` (or `deny` in CI) at the crate root of every library crate.** Rationale: this is tokio's actual house lint set for a security-adjacent async crate (§7, §9), and the pair mutually reinforces the "small, deliberate `pub` surface" goal. Verify: `grep -n "#!\[.*unreachable_pub\|#!\[.*missing_docs" src/lib.rs`; absence is a gap to fix, not silence to assume is fine.

11. **Set `too-many-lines-threshold` and `cognitive-complexity-threshold` explicitly in `clippy.toml` rather than relying on unstated defaults, and run `cargo clippy -- -W clippy::pedantic` at least in CI-report (non-blocking) mode.** Rationale: the pedantic group (where both lints live) is opt-in; a project that never enables it never gets the "this function grew too large" signal at all (§9). Verify: `test -f clippy.toml && grep -E "too-many-lines|cognitive-complexity" clippy.toml`, and confirm `clippy::pedantic` appears somewhere in CI config or crate-root attributes.

12. **Before attempting to split a crate into a workspace, run a module-level cycle check (grep each module's `use crate::` targets and build the edge list by hand, or use a tool like `cargo-modules`/`cargo tree`-adjacent analysis) — a crate split will not compile until every cycle is broken.** Rationale: crate dependencies must be acyclic; a monolithic crate frequently has module-level cycles that were invisible because one crate tolerates them (§10). Verify: for each pair of modules that `use` each other, confirm at least one direction is eliminable (usually by extracting a shared trait/type into a third, lower module both depend on).

13. **Do not glob-import inside `fn` bodies or at module scope for anything other than a designated `prelude` or a `#[cfg(test)] mod tests` block's `use super::*;`.** Rationale: `clippy::wildcard_imports`' own two built-in exceptions are exactly these two cases — everything else is a lint violation by design (§8). Verify: `cargo clippy -- -W clippy::wildcard_imports`.

## AI-agent angle

- **Reaching for `mod.rs` when writing new multi-file modules.** Models trained partly on pre-2018-edition Rust and tutorials still emit `foo/mod.rs` layouts by habit. Mechanical check: `find src -name mod.rs -newer <last-known-good-commit-ref>` (or simply grep any newly-added `mod.rs` in the diff) — flag any new one for conversion to `foo.rs` + `foo/`.

- **Marking new items bare `pub` "to be safe," rather than reasoning about actual reachability.** This is the single most common LLM-generated visibility mistake because `pub` always compiles and never produces a visibility error, so there's no compiler feedback loop pushing the model toward `pub(crate)`. Mechanical check: `#![warn(unreachable_pub)]` in the crate under active edit, or after the agent's diff lands, run `cargo clippy -- -W unreachable_pub` and treat any new hit as a required fix, not a style nit.

- **Inventing a `clippy::pub_use` lint name that does not exist** (confusing it with `wildcard_imports`'s `pub use` coverage) when asked to cite a lint for glob re-exports, or citing `clippy::module_name_repetitions` as `deny`-by-default when it is actually `pedantic` (opt-in). Mechanical check: `cargo clippy --help` / `rustc -W help` do not list a bare `pub_use`; any generated CI config or doc comment citing it should be corrected to `clippy::wildcard_imports` with the `warn-on-all-wildcard-imports` config key.

- **Producing a sealed-trait implementation that forgets the private module has to be genuinely unreachable from outside the crate** — a common broken variant is putting the `Sealed` marker trait in a `pub mod` instead of a private `mod`, which compiles, looks sealed, but is not (any downstream crate can `impl private::Sealed for TheirType` if `private` is itself `pub`). Mechanical check: grep the module declaring the `Sealed`/marker trait and confirm it is `mod private` (no `pub`) or `pub(crate) mod private`, never `pub mod private`.

- **Writing `pub(in path)` with a path through a `use`-imported alias rather than the real module path**, which the Reference explicitly disallows (§1) — a plausible-looking but non-compiling pattern a model may generate by analogy with normal `use` paths. Mechanical check: this fails to compile (E0603/E0742-class error), so it will always surface at `cargo check` — but flag it in code review before that point by confirming the `pub(in ...)` path matches an actual `mod` chain from crate root, not an aliased `use`.

- **Assuming `#[doc(hidden)]` is a visibility mechanism** (it is not — a `#[doc(hidden)] pub fn` is still fully `pub` and callable, just excluded from rendered docs). Models sometimes reach for `#[doc(hidden)]` when asked to "hide" an implementation-detail function, which achieves a documentation effect but not an API-surface guarantee; `unreachable_pub`/`pub(crate)` is the actual tool for that. Mechanical check: grep `#[doc(hidden)]` usages and confirm each is paired with a real semver reason to keep the item technically public (e.g. macro-generated code that must be reachable), not used as a substitute for `pub(crate)`.

- **Splitting a crate into a workspace without checking for module-level circular `use` first**, because the model reasons about the desired end state (clean layered crates) without checking the current graph for cycles (§10, §12) — this produces a plan that looks right but won't compile once attempted, wasting a full refactor pass. Mechanical check: before generating the split, have the agent enumerate every cross-module `use crate::` edge in the target file set and check for a cycle by hand; if any exists, resolve it (usually via a shared lower-level module) before moving files.

## Contested / evolving

- **How aggressively to enable `clippy::pedantic`.** The group contains both genuinely valuable lints (`wildcard_imports`, `module_name_repetitions`) and lints with high false-positive rates that many teams disable individually rather than adopting the whole group; there is no ecosystem consensus on "pedantic wholesale" vs. "cherry-pick." Current trend as of 2026: cherry-picking via explicit `clippy.toml` + targeted `#[allow]` is more common in production crates than a blanket `#![warn(clippy::pedantic)]`, per the general shape of configuration examples surfacing in current tooling and blog coverage (e.g. [Zhauniarovich's pedantic-lint walkthrough](https://zhauniarovich.com/post/2021/2021-09-pedantic-clippy/)) — treat wholesale adoption as a team choice to make explicitly, not a default.

- **`unreachable_pub` remains allow-by-default at the rustc level**, meaning most crates that don't explicitly opt in get zero signal from it despite it being exactly the lint that operationalizes RFC 2126's motivating complaint (§7). Whether it should be default-warn is not resolved upstream; the practical implication for now is that a project must opt in explicitly (§ normative rule 10) — it will never happen automatically.

- **No first-party file-length lint exists, and the community hasn't converged on one.** `too_many_lines` catches long *functions*, not long *files* with many short functions/types that collectively sprawl — the gap named in §9 is real and, as of this research, unaddressed by any widely-adopted first-party tool. Some teams fill it with `tokei`-based CI checks or a plain `wc -l` gate; there is no canonical threshold to cite as authoritative.

- **`mod.rs` is not deprecated, only superseded by convention.** Both styles remain fully supported by the compiler indefinitely (no edition has removed `mod.rs` support), so "never use `mod.rs`" is a house-style choice this research recommends (§2, rule 3), not a language-level requirement — flag this distinction if a reviewer challenges a `mod.rs` file as "wrong": it compiles fine, it's simply off current convention.

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [Rust Reference — Visibility and Privacy](https://doc.rust-lang.org/reference/visibility-and-privacy.html) | Official language reference | Current (stable, all editions) | Ground truth for the `Visibility` grammar and default-private rules; primary source for §1 |
| [Rust Edition Guide — Rust 2018 path changes](https://doc.rust-lang.org/edition-guide/rust-2018/path-changes.html) | Official edition guide | 2018 edition (still current) | Primary source for the `mod.rs` vs `name.rs` history and rationale |
| [RFC 1422 — pub(restricted)](https://rust-lang.github.io/rfcs/1422-pub-restricted.html) | Accepted RFC (rust-lang/rfcs) | 2015 (foundational, still governs current syntax) | Primary source for *why* restricted visibility exists — motivation section directly explains the "large pub surface is a liability" claim |
| [RFC 2126 — Path clarity](https://rust-lang.github.io/rfcs/2126-path-clarity.html) | Accepted RFC (rust-lang/rfcs) | 2017 (pre-2018 edition; still governs current lint design) | Primary source for the origin of the `unreachable_pub` lint proposal |
| [rustc `UNREACHABLE_PUB` lint docs](https://doc.rust-lang.org/beta/nightly-rustc/rustc_lint/builtin/static.UNREACHABLE_PUB.html) | Official rustc internal API docs | Current (nightly-rustc, beta channel) | Primary source confirming the lint's exact semantics and its allow-by-default status |
| [rustdoc book — Lints](https://doc.rust-lang.org/rustdoc/lints.html) | Official rustdoc book | Current | Primary source for `missing_docs` availability from both rustc and rustdoc |
| [Rust API Guidelines — Naming](https://rust-lang.github.io/api-guidelines/naming.html) | Official (rust-lang) style guidelines | Current, stable since ~2020 | Primary source for `C-CASE`, `C-CONV`, `C-GETTER`, `C-WORD-ORDER` naming rules |
| [Rust API Guidelines — Future proofing](https://rust-lang.github.io/api-guidelines/future-proofing.html) | Official (rust-lang) style guidelines | Current | Primary source for `C-SEALED` and `C-STRUCT-PRIVATE`, with the exact code pattern for sealed traits |
| [Rust API Guidelines — Checklist](https://rust-lang.github.io/api-guidelines/checklist.html) | Official (rust-lang) style guidelines index | Current | Enumerates every `C-*` code for cross-reference |
| [Clippy lint configuration (nightly docs)](https://doc.rust-lang.org/nightly/clippy/lint_configuration.html) | Official clippy docs | Current (rolling with clippy releases) | Primary source for exact numeric defaults: `too_many_lines` (100), `cognitive_complexity` (25), `module_name_repetitions` allow-list |
| [clippy `wildcard_imports.rs` source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/wildcard_imports.rs) | Real source code, rust-lang/rust-clippy | Current (master branch) | Primary source for the lint's own doc comment, exceptions, and pedantic-group placement |
| [tokio `tokio/src/lib.rs`](https://github.com/tokio-rs/tokio/blob/master/tokio/src/lib.rs) | Real source code, widely-used production async crate | Current (master branch) | Primary evidence of actual crate-root lint posture (`missing_docs`, `unreachable_pub`, etc.) in a security-adjacent, high-scrutiny crate |
| [rust-analyzer — Style guide](https://rust-analyzer.github.io/book/contributing/style.html) | Official contributor documentation for a major real Rust codebase | Current | Primary source for real-project import ordering, item ordering, and re-export-avoidance convention |
| [Microsoft Pragmatic Rust Guidelines — Documentation](https://microsoft.github.io/rust-guidelines/guidelines/docs/) | Semi-official (Microsoft-maintained) supplement to the Rust API Guidelines | Current (actively maintained repo) | Source for `M-DOC-INLINE` and `M-NO-GLOB-REEXPORTS` re-export documentation rules not covered by the official API Guidelines |
| [predr.ag — "A definitive guide to sealed traits in Rust"](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/) | Technical blog, deep dive | Recent (post-2020, actively referenced) | Explains the second (method-call-sealing) sealed-trait variant and its caveats, beyond what the official guidelines cover |
| [Software Patterns Lexicon — Avoiding Monolithic Crate Structures](https://softwarepatternslexicon.com/rust/anti-patterns-and-common-pitfalls/avoiding-monolithic-crate-structures/) | Technical reference / pattern catalog | Current | Directly matches this project's named pain point (everything in one crate); gives the diagnostic checklist and layered refactor order used throughout §3, §6, §10 |
| [pingcap/TiDB engineering blog — "Rust's Huge Compilation Units"](https://www.pingcap.com/blog/rust-huge-compilation-units/) | Real-world engineering blog (TiKV/TiDB team) | Current | Primary-adjacent (written by engineers who did the actual TiKV crate-split work) evidence for compile-cost and cycle-avoidance rationale in §3, §10 |

