---
title: Derive Discipline and Standard Conversions
agent: rust-api-design/derive-discipline-and-standard-conversions
model: sonnet
date_researched: 2026-08
sources_count: 16
scope: >
  Mandatory vs. banned derive sets for public Rust types (Clone/Copy/Debug/Default/
  PartialEq/Eq/PartialOrd/Ord/Hash), the Debug-on-secrets hazard, Default-on-config
  hazard, derive interaction hazards (Hash/Eq drift, PartialOrd on enums, Copy on a
  type that later grows a heap field, reflexive Serialize/Deserialize), and the
  standard conversion-trait rule (From/TryFrom/AsRef/AsMut/Into over ad-hoc
  to_x/as_x methods), each with a mechanical check. Written for the OCX/Grimoire
  Rust CLI family (grim, ocx, ocx-mirror).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [C-COMMON-TRAITS: the mandatory derive set](#1-c-common-traits-the-mandatory-derive-set)
   2. [`missing_debug_implementations` as the enforcement lint](#2-missing_debug_implementations-as-the-enforcement-lint)
   3. [Debug-on-secrets: the concrete hazard](#3-debug-on-secrets-the-concrete-hazard)
   4. [`secrecy` and `zeroize`: the two alternatives, and when each applies](#4-secrecy-and-zeroize-the-two-alternatives-and-when-each-applies)
   5. [Default-on-config: the zero-state hazard](#5-default-on-config-the-zero-state-hazard)
   6. [Hash/Eq consistency and what a violation actually breaks](#6-hasheq-consistency-and-what-a-violation-actually-breaks)
   7. [`PartialEq` without `Eq`: the asymmetric derive](#7-partialeq-without-eq-the-asymmetric-derive)
   8. [`PartialOrd`/`Ord` derived on an enum: order nobody intended](#8-partialordord-derived-on-an-enum-order-nobody-intended)
   9. [`Copy` on a type that later gains a heap field](#9-copy-on-a-type-that-later-gains-a-heap-field)
   10. [Reflexive `Serialize`/`Deserialize`](#10-reflexive-serializedeserialize)
   11. [The conversion-trait rule: `From`/`TryFrom`/`AsRef`/`AsMut` over ad-hoc methods](#11-the-conversion-trait-rule-fromtryfromasrefasmut-over-ad-hoc-methods)
   12. [The `as_`/`to_`/`into_` naming triad](#12-the-as_to_into_-naming-triad)
   13. [Getters without `get_`, and the `iter`/`iter_mut`/`into_iter` triad](#13-getters-without-get_-and-the-iteriter_mutinto_iter-triad)
   14. [`TryFrom` at deserialization boundaries](#14-tryfrom-at-deserialization-boundaries)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

1. Every public struct/enum eagerly derives `Debug`, `Clone`, `PartialEq`, `Eq`, `Hash` when the fields allow it, plus `Copy`/`PartialOrd`/`Ord` when semantically valid — a missing derive fails at a caller three files away, not at the definition ([Rust API Guidelines, C-COMMON-TRAITS](https://rust-lang.github.io/api-guidelines/interoperability.html)).
2. `#![warn(missing_debug_implementations)]` at the crate root is the compiler-enforced backstop for "all public types implement Debug" (C-DEBUG) — it is allow-by-default in rustc, so it must be turned on explicitly ([rustc lint listing](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)).
3. Never `#[derive(Debug)]` on a type holding a token, password, key, or credential — `Debug` output reaches logs, panic messages, and `anyhow`/`thiserror` error chains; the fix is a hand-written redacting `Debug` impl or a wrapper (`secrecy::SecretString`, `zeroize::Zeroizing`) whose `Debug` is already redacted ([corrode.dev, Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/); [secrecy docs](https://docs.rs/secrecy/latest/secrecy/)).
4. `secrecy::SecretBox<T>`'s `Debug`/`Display` are redacted by construction and its `Drop` zeroizes; accessing the value requires the explicit `ExposeSecret`/`ExposeSecretMut` trait, making every read grep-able ([secrecy docs](https://docs.rs/secrecy/latest/secrecy/)).
5. `zeroize::Zeroize` must never be derived/implemented directly on a type that is *always* meant to hold a secret — that leaves the type in a half-zeroized, still-readable, invalid state after a manual `.zeroize()` call. Use `ZeroizeOnDrop` with a custom `Drop` instead ([zeroize docs](https://docs.rs/zeroize/latest/zeroize/)).
6. `#[derive(Default)]` on a config/settings struct produces a zero state (`port: 0`, `retries: 0`, empty required `PathBuf`) that type-checks, compiles, and gets passed around as if valid — the type system gives no error, the failure surfaces downstream ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)). Only derive `Default` when the all-zero/empty state is a value a caller would genuinely construct and run; otherwise expose `Config::minimal(..)`/a builder and delete the derive.
7. Deriving `Eq`+`Hash` together is always safe — the compiler-generated impls are consistent by construction. The danger is *mixing* a derived one with a hand-written other: clippy's `derived_hash_with_manual_eq` catches a derived `Hash` next to a manual `PartialEq`; `derive_partial_eq_without_eq` catches a derived `PartialEq` that could have derived `Eq` too but didn't ([clippy `derive/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs)).
8. If `Hash` and `Eq`/`PartialEq` disagree, `k1 == k2` no longer implies `hash(k1) == hash(k2)`; `HashMap`/`HashSet` silently misbehave — lookups miss, "duplicate" keys coexist, entries become unreachable. It is a logic error, not UB, but it is undiagnosable from the call site ([`std::hash::Hash` docs](https://doc.rust-lang.org/std/hash/trait.Hash.html)).
9. `derive(PartialOrd, Ord)` on an enum orders variants by **declaration order**, not by any domain meaning — reordering variants for readability silently reorders every `sort()`/`BinaryHeap`/`BTreeMap` that uses the type. Clippy's `derive_ord_xor_partial_ord` catches the narrower case of a hand-written one of the pair next to a derived other, but declaration-order drift has no lint at all — it needs an explicit discriminant comment or a manual `Ord` impl.
10. `Copy` is part of a type's public API. A type that is `Copy` today and gains a `Vec`/`String`/heap field tomorrow must *remove* `Copy`, and every caller relying on implicit copy-on-assignment breaks at that call site, not at the struct definition — the standard library's own docs recommend omitting `Copy` up front "if the type might become non-Copy in the future" ([`std::marker::Copy` docs](https://doc.rust-lang.org/std/marker/trait.Copy.html)).
11. Deriving `Serialize`/`Deserialize` reflexively on a type never meant to cross a process/network/file boundary turns every field into part of a de-facto wire format nobody designed, and (for a type with `unsafe` methods relying on internal invariants) `derive(Deserialize)` opens a second, unchecked constructor — clippy flags exactly this with `unsafe_derive_deserialize` ([clippy `derive/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs)).
12. Standard conversion traits (`From`, `TryFrom`, `AsRef`, `AsMut`) compose with generic code (`impl Into<T>` parameters, `?`-operator error conversion) in a way ad-hoc `.to_x()`/`.as_x()` methods never do; implement `From`, never `Into` directly — the blanket impl gives you `Into` for free ([Rust API Guidelines, C-CONV-TRAITS](https://rust-lang.github.io/api-guidelines/interoperability.html); [`std::convert::From` docs](https://doc.rust-lang.org/std/convert/trait.From.html)).
13. `From` must be infallible, lossless, and value-preserving — if the conversion can fail, it's `TryFrom`, not a `From` that panics ([`std::convert::From` docs](https://doc.rust-lang.org/std/convert/trait.From.html)).
14. Method-name prefixes signal cost and ownership: `as_` = free reference-to-reference, `to_` = expensive/copying, `into_` = ownership-consuming (variable cost) — a method named `to_x` that actually consumes `self`, or `as_x` that actually clones, is a naming lie a reviewer won't catch from the signature alone ([Rust API Guidelines, naming](https://rust-lang.github.io/api-guidelines/naming.html)).
15. Getters never use a `get_` prefix (`first()`, not `get_first()`); the `get`/`get_mut` names are reserved for the one-obvious-thing case (`Cell::get`) ([Rust API Guidelines, naming](https://rust-lang.github.io/api-guidelines/naming.html)).
16. Collections expose exactly `iter(&self)`, `iter_mut(&mut self)`, `into_iter(self)` — not `to_vec()`-as-iterator or a single overloaded name — so generic `for` loops and iterator-adaptor chains work without special-casing the type ([Rust API Guidelines, naming](https://rust-lang.github.io/api-guidelines/naming.html)).
17. Newtypes (`Miles(f64)` vs `Kilometers(f64)`) buy nothing if construction bypasses validation; the enforcement point for a newtype's invariant is a `TryFrom` impl (or a private-field constructor returning `Result`) at the boundary where untrusted data enters — typically `#[serde(try_from = "Raw")]` at deserialization — not a `pub` field or an infallible `From` ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/); [Rust API Guidelines, C-NEWTYPE](https://rust-lang.github.io/api-guidelines/type-safety.html)).
18. `#[non_exhaustive]` is cheap on a struct/enum on day one and a breaking change to add later — decide exhaustiveness at type-introduction time, not after the first downstream consumer pattern-matches on it ([Cargo semver reference](https://doc.rust-lang.org/cargo/reference/semver.html)).

---

## Findings

### 1. C-COMMON-TRAITS: the mandatory derive set

The Rust API Guidelines state the rule plainly: **"Types eagerly implement common traits"** ([interoperability.html](https://rust-lang.github.io/api-guidelines/interoperability.html)). The rationale is specific to Rust's orphan rule: a downstream crate *cannot* add `impl Debug for their::Type` from outside — only the defining crate can. A derive omitted at definition time is a derive that can never be added by a consumer; it can only be worked around with a wrapper newtype, which is exactly the kind of accidental API surface growth this topic is meant to prevent.

The essential set named by the guidelines: `Copy`, `Clone`, `Eq`, `PartialEq`, `Ord`, `PartialOrd`, `Hash`, `Debug`, `Display`, `Default`. `Display` and hand-rolled `Default` aren't `#[derive]`-able, so the mechanically-checkable subset is `Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash` — the exact set named in the task brief.

```rust
// Wrong: nothing derived, "I'll add it when I need it"
pub struct PackageDigest {
    algo: DigestAlgo,
    bytes: [u8; 32],
}

// Right: everything that is semantically valid, derived at definition time
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PackageDigest {
    algo: DigestAlgo,
    bytes: [u8; 32],
}
```
`PartialOrd`/`Ord` are deliberately absent here — a digest has no meaningful ordering; deriving them anyway is the hazard covered in §8.

### 2. `missing_debug_implementations` as the enforcement lint

`missing_debug_implementations` is a real rustc lint, but it ships **allow-by-default** — "adding `Debug` to all types can have a negative impact on compile time and code size" ([rustc lint listing](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)). It must be turned on explicitly:

```rust
#![warn(missing_debug_implementations)]
```
placed once at the crate root (`lib.rs`/`main.rs`) of every `grim`/`ocx`/`ocx-mirror` crate. It fires at the definition site — exactly the "fail at the caller three files away" problem the brief calls out, converted into a fail at the `pub struct` line itself.

### 3. Debug-on-secrets: the concrete hazard

corrode.dev's *Pitfalls of Safe Rust* states the mechanism directly: "if you blindly derive `Debug` for all types, you might expose sensitive data. That's because `Debug` is often used in logging and error messages, even in production code." ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)). The propagation path that makes this dangerous rather than merely sloppy: `#[derive(Debug)]` on a struct containing a field also embedded in an `anyhow::Error` context, a `tracing::debug!("{:?}", cfg)`, or a `.unwrap()` panic message — none of those call sites look at the struct definition, so the leak is invisible at every point that matters.

```rust
// Wrong: token reaches every {:?} format call transitively
#[derive(Debug, Clone)]
pub struct RegistryAuth {
    pub registry: String,
    pub token: String,
}

// Right: manual Debug that destructures (so a new field is a compile error
// here, not a silent leak) and redacts by name
pub struct RegistryAuth {
    pub registry: String,
    pub token: String,
}

impl std::fmt::Debug for RegistryAuth {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let Self { registry, token: _ } = self;
        f.debug_struct("RegistryAuth")
            .field("registry", registry)
            .field("token", &"[REDACTED]")
            .finish()
    }
}
```
The `let Self { .. } = self` destructure is the corrode.dev-recommended trick: it forces a compile error the moment a field is added and not routed through the redaction, converting "someone forgot to update Debug" from a silent leak into a build failure.

### 4. `secrecy` and `zeroize`: the two alternatives, and when each applies

`secrecy::SecretBox<T>` (with `SecretString = SecretBox<String>`) is the wrapper-type alternative to a hand-written redacting `Debug`: its `Debug`/`Display` are redacted by construction, and the inner value is reachable only through the explicit `ExposeSecret`/`ExposeSecretMut` traits — meaning every place a secret is actually read is `grep`-able as `.expose_secret()` ([secrecy docs](https://docs.rs/secrecy/latest/secrecy/)). It also zeroizes on `Drop` via the `zeroize` crate internally.

`zeroize::Zeroize` is the lower-level primitive `secrecy` builds on. Its docs draw a sharp line the task brief doesn't spell out but that matters for review: **`Zeroize` must not be derived/implemented directly on a type that always holds a secret**, because calling `.zeroize()` on it leaves the type in a half-wiped, still-typed-as-valid state — "would effectively leave such types in an invalid state" ([zeroize docs](https://docs.rs/zeroize/latest/zeroize/)). The correct pattern for an always-secret type is `ZeroizeOnDrop` plus a custom `Drop` impl, not a bare `#[derive(Zeroize)]`.

Rule of thumb for this codebase: reach for `secrecy::SecretString`/`SecretBox` first for anything read from a credential file or registry-auth header; reach for hand-written redacting `Debug` only for structs that mix one secret field among several non-secret ones where wrapping the whole struct would be overkill.

### 5. Default-on-config: the zero-state hazard

corrode.dev again: "It's quite common to add a blanket `Default` implementation to your types without thinking twice about it. But that can lead to unforeseen issues" — the concrete example given is a `port` field defaulting to `0`, "not a valid configuration value" ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)). This matches the task brief's framing exactly: it type-checks and compiles, so nothing catches it until the zero-state config is actually used — a `TcpListener::bind` on port 0, an empty `PathBuf` passed to `fs::read`.

```rust
// Wrong: compiles, "works", produces a config nobody could have wanted
#[derive(Default)]
pub struct MirrorConfig {
    pub registry: String,   // "" — not a registry
    pub port: u16,          // 0 — not a port
    pub cache_dir: PathBuf, // "" — not a directory
}

// Right: no Default derive. Either a builder, or a named constructor
// for the one genuinely runnable minimal state (if one exists).
pub struct MirrorConfig {
    pub registry: String,
    pub port: u16,
    pub cache_dir: PathBuf,
}

impl MirrorConfig {
    /// Loopback mirror on an ephemeral port, cache in the OS temp dir.
    /// This is a real, runnable configuration — not a placeholder.
    pub fn minimal() -> Self {
        Self {
            registry: "localhost".into(),
            port: 0, // 0 is meaningful HERE: "ask the OS for an ephemeral port"
            cache_dir: std::env::temp_dir(),
        }
    }
}
```
The test for whether `Default` is legitimate: can you name, in the doc comment, what running system `T::default()` describes? If the answer is "none, it's just zeroed", delete the derive.

Note the interaction with clippy's `derivable_impls` lint, which nudges the *opposite* direction — it fires when a **manual** `Default` impl is field-for-field identical to what `#[derive(Default)]` would generate, suggesting to derive instead ([clippy `derivable_impls.rs`](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/derivable_impls.rs)). That lint is about redundancy, not validity — it never argues a zero state is meaningful, so it does not contradict the rule above; a manual `Default` that legitimately differs from the derived one (e.g. `retries: 3` instead of `0`) is exactly the case the lint leaves alone.

### 6. Hash/Eq consistency and what a violation actually breaks

The `std::hash::Hash` docs state the invariant directly: `k1 == k2 -> hash(k1) == hash(k2)`. Violating it is documented as "a logic error" (not undefined behavior — no `unsafe` code may rely on it holding), but the practical failure mode is severe: `HashMap`/`HashSet` "cannot function properly" — lookups miss, apparent duplicate keys coexist, iteration is unreliable ([`std::hash::Hash` docs](https://doc.rust-lang.org/std/hash/trait.Hash.html)). The docs also give the safe path: deriving both together removes the risk entirely — `#[derive(PartialEq, Eq, Hash)]` is always consistent by construction. The hazard only exists when one of the pair is hand-written.

### 7. `PartialEq` without `Eq`: the asymmetric derive

Clippy's `derive_partial_eq_without_eq`: "Checks for types that derive `PartialEq` and could implement `Eq`." Rationale: "If a type `T` derives `PartialEq` and all of its members implement `Eq`, then `T` can always implement `Eq`" ([clippy `derive/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs)). This is the mechanical half of C-COMMON-TRAITS: it's not enough to eagerly derive *something* — an eligible-but-missing `Eq` silently downgrades every downstream generic bound that needs `Eq` (e.g. using the type as a `HashMap` key requires `Eq`, not just `PartialEq`), and that downgrade is invisible until a caller three files away tries to use the type as a hash key and gets a trait-bound error with no obvious link back to the derive line.

### 8. `PartialOrd`/`Ord` derived on an enum: order nobody intended

`derive(PartialOrd, Ord)` on an enum orders variants strictly by **declaration order** — the compiler generates the comparison from variant index, not from any domain semantics. This is standard, well-documented derive behavior (confirmed via [the `derive` attribute reference](https://doc.rust-lang.org/reference/attributes/derive.html)), but it is a landmine specifically because it looks intentional: `derive(Ord)` reads as "these variants have an order", when what actually happened is "these variants have whatever order I typed them in".

```rust
// Wrong-by-accident: looks intentional, is actually declaration order.
// Someone alphabetizes the variants for readability during a refactor
// and silently reverses every sort() that relies on severity order.
#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Info,
    Warning,
    Error,
    Critical,
}
```
The related clippy lint, `derive_ord_xor_partial_ord`, only catches the narrower case of a hand-written `PartialOrd`/`Ord` next to a derived counterpart going out of sync ([clippy `derive/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs)) — it does not catch declaration-order drift, because both traits stay internally consistent with each other even as their *meaning* silently changes. The only mechanical guard is a comment pinned to the enum (`// order is significant: Info < Warning < Error < Critical, do not reorder`) plus a unit test asserting the expected ordering (`assert!(Severity::Info < Severity::Warning)`), which turns an accidental reorder into a failing test instead of a silent behavior change.

### 9. `Copy` on a type that later gains a heap field

The standard library's own `Copy` docs state the semver hazard explicitly: "implementing `Copy` is part of the public API of your type. If the type might become non-Copy in the future, it could be prudent to omit the `Copy` implementation now, to avoid a breaking API change" ([`std::marker::Copy` docs](https://doc.rust-lang.org/std/marker/trait.Copy.html)). The mechanism: `Copy` requires every field to be `Copy`, and adding a `Vec`/`String`/`Box` field makes that impossible, forcing removal of the derive. Every call site that did `let b = a; use(a);` — legal only because `a: T` was `Copy` — now fails to compile at the *use site*, which in a large codebase can be dozens of call sites scattered across crates, all surfacing at once on an otherwise-unrelated field addition.

```rust
// v0.1: small, Copy is free and convenient
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_attempts: u8,
    pub backoff_ms: u32,
}

// v0.2: someone adds a per-attempt jitter seed source that needs to own
// a Vec<u32> of pre-computed jitter values. Copy must be removed.
// Every `let p2 = p1;` at every call site that then still used `p1`
// now fails to compile — the "breaking change" lands where the value
// is *used*, not where the field was added.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_attempts: u8,
    pub backoff_ms: u32,
    pub jitter_table: Vec<u32>,
}
```
Practical rule: derive `Copy` only for types that are conceptually "plain data forever" (numeric wrappers, small fixed-size handles, enums with no payload). For anything that might plausibly grow a `String`/`Vec`/`PathBuf`/`Box` field as the domain model matures — config fragments, IDs that might become UUIDs-with-metadata, anything with "policy"/"options"/"settings" in the name — omit `Copy` up front even though the type is `Copy`-eligible today.

### 10. Reflexive `Serialize`/`Deserialize`

corrode.dev extends the same "don't derive reflexively" argument to serde: "Don't blindly derive `Serialize` and `Deserialize` either, especially for sensitive data" — citing both the risk of fields silently accepting invalid/empty values on deserialize, and sensitive-data exposure on serialize; the recommended fix is `#[serde(try_from = "Raw")]` with a validating `TryFrom` ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)) — this is the exact link to §14 below.

Clippy's `unsafe_derive_deserialize` covers the sharper, more mechanical version of this: "Checks for deriving `serde::Deserialize` on a type that has methods using `unsafe`", because "Deriving `serde::Deserialize` will create a constructor that may violate invariants held by another constructor" ([clippy `derive/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs)). Any type in this codebase that has an `unsafe` method relying on "this field is always a validated digest"/"this path is always canonicalized" and also derives `Deserialize` has two constructors — the normal one, and the derive-generated one that bypasses every invariant check.

### 11. The conversion-trait rule: `From`/`TryFrom`/`AsRef`/`AsMut` over ad-hoc methods

C-CONV-TRAITS: implement `From<T>`/`TryFrom<T>` for owned conversions and `AsRef<T>`/`AsMut<T>` for borrowing conversions; never implement `Into`/`TryInto` directly — both have blanket impls derived from `From`/`TryFrom` ([Rust API Guidelines, interoperability](https://rust-lang.github.io/api-guidelines/interoperability.html)). The reason this outranks a hand-rolled `.to_x()` method is compositional, not stylistic: only the standard traits let a *caller* write generic code —

```rust
// Only works because RegistryRef implements From<&str> (or TryFrom):
fn pull(r: impl Into<RegistryRef>) { ... }
pull("ghcr.io/ocx-sh/toolchain");   // &str -> RegistryRef via Into
pull(existing_ref);                  // RegistryRef -> RegistryRef via Into (identity)
```
An ad-hoc `RegistryRef::from_str_ref(s: &str)` method gives none of this: it doesn't satisfy `impl Into<RegistryRef>`, doesn't work with `?` (which uses `From` for error conversion), and doesn't compose with any other generic function written against the standard traits.

`From` carries a hard correctness contract: infallible, lossless, value-preserving ([`std::convert::From` docs](https://doc.rust-lang.org/std/convert/trait.From.html)). "Infallible" is not a suggestion — a `From` impl that panics on bad input is a `From` impl that should have been `TryFrom`.

```rust
// Wrong: From that can panic — violates the trait's contract, and every
// generic `impl Into<T>` caller now inherits an undocumented panic path
impl From<&str> for RegistryRef {
    fn from(s: &str) -> Self {
        RegistryRef::parse(s).expect("invalid registry ref")
    }
}

// Right: fallible conversion is TryFrom, full stop
impl TryFrom<&str> for RegistryRef {
    type Error = RegistryRefError;
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        RegistryRef::parse(s)
    }
}
```

### 12. The `as_`/`to_`/`into_` naming triad

Rust API Guidelines naming conventions ([naming.html](https://rust-lang.github.io/api-guidelines/naming.html)):
- `as_*` — free, reference-to-reference (`str::as_bytes`)
- `to_*` — expensive, typically allocating (`str::to_lowercase`)
- `into_*` — ownership-consuming, variable cost (`String::into_bytes`)

These prefixes are load-bearing documentation: a reviewer (human or AI) reads `cfg.to_bytes()` and correctly assumes "this allocates and I still own `cfg` afterward" without reading the body. A method that consumes `self` but is named `to_x` lies to every caller who trusts the naming convention, which is precisely the "cost lands at a distant call site" failure mode this topic exists to prevent — the caller writes code assuming borrow semantics, then hits a use-after-move error (best case) or, worse, keeps a stale clone around because they assumed a cheap `to_` call.

### 13. Getters without `get_`, and the `iter`/`iter_mut`/`into_iter` triad

Getters: `first()`, not `get_first()`; `get`/`get_mut` are reserved for the single-obvious-thing case like `Cell::get` ([Rust API Guidelines, naming](https://rust-lang.github.io/api-guidelines/naming.html)). Iterators: exactly `iter(&self)`, `iter_mut(&mut self)`, `into_iter(self)`, with iterator type names matching (`Iter`, `IterMut`, `IntoIter`) — this is also what makes `for x in &collection` / `for x in &mut collection` / `for x in collection` all work via the `IntoIterator` blanket machinery, so deviating from the triad breaks plain `for` loops, not just style.

### 14. `TryFrom` at deserialization boundaries

This is the direct mechanical answer to §5's config problem and §10's serde problem, and it is the same mechanism the on-disk-format/lockfile topic needs at its boundary: a newtype's invariant (a non-empty registry host, a validated semver, a canonicalized path) is worthless if the type can also be constructed with public fields or a derived `Deserialize` that bypasses the check. Rust API Guidelines' C-NEWTYPE frames the *purpose* (statically distinguishing `Miles` from `Kilometers`) but is silent on *enforcement* ([type-safety.html](https://rust-lang.github.io/api-guidelines/type-safety.html)); corrode.dev supplies the enforcement mechanism: `#[serde(try_from = "Raw")]` paired with a `TryFrom<Raw>` impl that runs validation exactly once, at the one place untrusted bytes become a typed value ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)).

```rust
// Wrong: derive(Deserialize) on the real type — any JSON with a negative
// or zero port deserializes into a "valid" ListenPort with no error.
#[derive(Deserialize)]
pub struct ListenPort(pub u16);

// Right: deserialize into an unchecked shape, validate through TryFrom,
// and never derive Deserialize on the type whose invariant matters.
#[derive(Deserialize)]
#[serde(try_from = "u16")]
pub struct ListenPort(u16);

impl TryFrom<u16> for ListenPort {
    type Error = ConfigError;
    fn try_from(raw: u16) -> Result<Self, Self::Error> {
        if raw == 0 {
            return Err(ConfigError::PortZero);
        }
        Ok(ListenPort(raw))
    }
}
```

---

## Normative guidance candidates

1. **Every `pub struct`/`pub enum` derives `Debug`, and the crate root sets `#![warn(missing_debug_implementations)]`.**
   Rationale: allow-by-default lint means it must be opted in; a type with no `Debug` fails a caller three files away, not at definition.
   VERIFICATION: `grep -rn "warn(missing_debug_implementations)" --include="lib.rs" --include="main.rs"` in each crate; `cargo clippy` (rustc lint, not clippy-specific — runs under `cargo build`/`cargo check` once the `#![warn(...)]` is present).

2. **Every `pub struct`/`pub enum` derives `Clone, PartialEq, Eq, Hash` unless a field makes one of them impossible (float, non-`Eq` external type) or the type deliberately represents a resource/handle (file, connection, lock guard).**
   Rationale: C-COMMON-TRAITS — orphan rule means downstream crates can never add a missing derive; the omission is permanent for consumers.
   VERIFICATION: `grep -B2 "^pub struct\|^pub enum"` across `src/**/*.rs`, flag any hit whose preceding lines have no `#[derive(` at all; for hits that do derive, diff the derive list against `{Debug, Clone, PartialEq, Eq, Hash}` and require a comment justifying each omission.

3. **`Copy` is opt-in only for types that are "plain data forever": no field could plausibly become a `String`/`Vec`/`PathBuf`/`Box`/`HashMap` as the domain model grows.**
   Rationale: removing `Copy` later is a breaking change per the `Copy` docs — the compiler flags it at every use site, not the definition, across the whole dependent graph at once.
   VERIFICATION: reading heuristic during review — for each `#[derive(..., Copy, ...)]`, ask "could this struct's next field plausibly be owned/heap data?"; if yes, require a comment recording the decision (`// Copy: fixed-size handle, will not grow heap fields`).

4. **`PartialOrd`/`Ord` are derived only when variant/field declaration order *is* the intended order, and that intent is pinned with a comment and a unit-test assertion on the ordering.**
   Rationale: derive generates order from declaration position; reordering variants during an unrelated refactor silently changes every `sort()`/`BTreeMap`/`BinaryHeap` behavior with no compiler signal.
   VERIFICATION: `grep -B1 "derive(.*Ord" --include="*.rs" -r src/` on enums, then manually confirm each has an adjacent `// order is significant: ...` comment; grep test files for a matching `assert!(A < B)` ordering test.

5. **Never `#[derive(Debug)]` (or accept the default `Debug` from a wrapper) on a struct with a field matching `token|secret|password|key|credential|auth` (case-insensitive) unless the field's type is `secrecy::SecretString`/`SecretBox`/a type with its own redacting `Debug`.**
   Rationale: `Debug` output reaches logs, panics, and error chains; a leaked token in a log file is a security incident, not a bug report.
   VERIFICATION: mechanical grep across struct bodies —
   ```
   grep -rn -B15 '#\[derive([^)]*Debug' --include="*.rs" src/ \
     | grep -iE '(token|secret|password|key|credential|auth)\s*:' 
   ```
   any hit is a finding unless the field type is `SecretString`/`SecretBox<_>`/`Zeroizing<_>`. Pair with `cargo clippy` — clippy has no built-in secret-field lint, so this grep is the enforcement, not a substitute for one.

6. **Secret-bearing fields are `secrecy::SecretString`/`SecretBox<T>`, not `String`/`Vec<u8>`, at the point they enter the process (env var read, config file parse, HTTP response header).**
   Rationale: wrapping at the boundary makes every subsequent `.clone()`/`Debug`/serialize path redacted/zeroize-on-drop by construction, instead of relying on every downstream struct remembering to redact.
   VERIFICATION: `grep -rn "std::env::var\|env::var(" src/` for anything reading a token/credential env var and confirm the result is wrapped in `SecretString::from(..)`/`SecretBox::new(..)` before being stored on a struct.

7. **`#[derive(Zeroize)]`/`impl Zeroize` is never placed directly on a type that always holds a secret; use `ZeroizeOnDrop` + a custom `Drop` instead.**
   Rationale: a bare `Zeroize` impl lets `.zeroize()` be called mid-lifetime, leaving the type in a wiped-but-still-typed-valid state — a distinct bug class from simply forgetting to wipe.
   VERIFICATION: `grep -rn "derive(Zeroize\|impl Zeroize for" src/` — every hit must be paired with `ZeroizeOnDrop` on the same type, not called standalone from application code outside `Drop`.

8. **`#[derive(Default)]` is permitted only when a doc comment on the impl (or the derive line itself) names the concrete runnable state `T::default()` produces; otherwise delete the derive and add `Config::minimal(..)` or a builder.**
   Rationale: a zero/empty state that type-checks but is never actually runnable (`port: 0`, empty required path) defers the failure from compile time to first use, with no error at the definition site.
   VERIFICATION: `grep -B3 "derive(.*Default" --include="*.rs" -r src/` on config/settings-named types (`*Config`, `*Settings`, `*Options`); require either a `///` doc comment justifying the derive or its absence plus a `fn minimal()`/builder present in the same `impl` block.

9. **Conversions between owned types use `From`/`TryFrom`; conversions to a borrowed view use `AsRef`/`AsMut`; never implement `Into`/`TryInto` directly; never name a conversion method `.to_x()`/`.from_x()`/`.as_x()` when a `From`/`AsRef` impl would do the same job.**
   Rationale: only the standard traits satisfy `impl Into<T>`/`impl AsRef<T>` generic bounds and the `?`-operator's automatic `From` conversion; hand-rolled methods are dead ends for generic callers.
   VERIFICATION: `grep -rn "impl Into<\|impl TryInto<" src/` — any hit is a finding (should be `From`/`TryFrom` instead); `grep -rn "fn to_[a-z_]*(&self)\|fn from_[a-z_]*(" src/` cross-checked against whether a `From`/`TryFrom` impl for the same pair of types already exists or should.

10. **A method prefixed `as_` never allocates or clones; a method prefixed `to_` never consumes `self`; a method prefixed `into_` always consumes `self`.**
    Rationale: the prefix is documentation callers rely on without reading the body; violating it silently changes ownership/cost assumptions at every call site.
    VERIFICATION: reading heuristic per method — check `&self`/`self`/return-type against the prefix; for `as_*`, grep the body for `.clone()`/`.to_vec()`/`.to_owned()`/`String::from` and flag any hit as a naming violation.

11. **Getters are never named `get_x`; the type exposes `x(&self)` (or `x_mut(&mut self)`), reserving `get`/`get_mut` for a single obvious accessor.**
    Rationale: matches Rust API Guidelines naming convention; consistency lets an AI agent or reviewer predict method names without checking docs.
    VERIFICATION: `grep -rn "pub fn get_[a-z_]*(&self" --include="*.rs" src/` — any hit that is a plain field accessor (not `Cell`/`RefCell`-style single-obvious-get) is a finding.

12. **Any type deserialized from an on-disk lockfile, config file, or registry response validates its invariant through `TryFrom`/`#[serde(try_from = "Raw")]`, never through a bare `#[derive(Deserialize)]` on the invariant-bearing type itself.**
    Rationale: this is the one place untrusted bytes become a typed value; a derived `Deserialize` on the real type is a second, unchecked constructor that bypasses every invariant the rest of the codebase assumes holds.
    VERIFICATION: `grep -rn "derive(.*Deserialize" --include="*.rs" src/` cross-referenced against types with a hand-written `TryFrom`/validating constructor elsewhere in the same file — a type with both a validating `TryFrom` *and* a bare `#[derive(Deserialize)]` (no `#[serde(try_from = ...)]`) is a finding.

13. **A type with any `unsafe` method relying on a field invariant never also derives `serde::Deserialize`.**
    Rationale: clippy's own `unsafe_derive_deserialize` rationale — the derive creates a constructor that can violate the invariant the `unsafe` code assumes.
    VERIFICATION: `cargo clippy -- -W clippy::unsafe_derive_deserialize` (nursery-tier lint as of current clippy; confirm allow/warn level with `cargo clippy --explain unsafe_derive_deserialize` and enable it explicitly in `[lints.clippy]` in `Cargo.toml` if not on by default).

14. **Enable `clippy::derive_partial_eq_without_eq` and `clippy::derived_hash_with_manual_eq` at `warn` (or `deny`) in workspace `Cargo.toml` `[lints.clippy]`.**
    Rationale: these are the two mechanically-checkable halves of the Hash/Eq consistency and derive-completeness rules above; both exist precisely because the derive macro cannot see "you could have derived more" or "your manual impl disagrees with the derived one".
    VERIFICATION: `grep -A5 "\[lints.clippy\]" Cargo.toml` confirms both are present; `cargo clippy --workspace` surfaces violations directly.

---

## AI-agent angle

An LLM writing Rust defaults to the *minimum derive set that makes the current test pass* — it derives `Debug` because a `{:?}` in a test needs it, skips `Eq`/`Hash` because nothing in the diff under review uses them yet, and only discovers the gap when a later, unrelated PR tries to put the type in a `HashSet` and gets a trait-bound error pointing at a call site far from the original definition. The mechanical fix is a repo-wide grep run as a pre-merge check (rule 2 above), not a request to "remember" the full trait set — an agent has no persistent memory of a convention stated once in an earlier session.

The second, sharper failure: an agent asked to "add a `TokenStore`/`AuthConfig` struct" will almost always start from `#[derive(Debug, Clone, Serialize, Deserialize)]` as a reflexive template, because that's the single most common derive line in any Rust training corpus — it is not scanning for `token`/`secret`/`password` field names before reaching for `Debug`. The smallest mechanical check that catches this is exactly rule 5's grep, run as a required pre-merge/pre-commit step, not left to code review judgment: it needs zero Rust-semantic understanding, just a derive-line-plus-field-name pattern match, so it can run in CI on every diff that touches a `struct` definition.

A third, subtler failure specific to agent-authored code: when asked to "fix" a `HashMap` lookup bug, an agent will often patch the call site (add a normalization step before `.get()`) rather than notice the actual root cause is a hand-written `PartialEq` that disagrees with a derived `Hash` on the key type — because the diff is smaller and the symptom (missing lookup) disappears either way. `cargo clippy -- -W clippy::derived_hash_with_manual_eq` catches the actual defect at the type definition regardless of which call site an agent happens to be looking at when it "fixes" the symptom.

## Contested / evolving

- **Whether `Eq`/`Hash`/`Ord` should be derived "eagerly" or only "on demand" is a real philosophical split.** The Rust API Guidelines' C-COMMON-TRAITS is unambiguous ("eagerly implement") because it is written for library authors who cannot retrofit an impl later due to the orphan rule. Some application-code style guides (not sourced here as primary, but visible in community discussion) push back for large internal types where an accidental `Eq`/`Hash` derive on a struct with float fields, or a huge struct where `Hash`/`Eq` cost matters for compile time and binary size, is itself a footgun. For this codebase (published binaries, not a library crate consumed by others in the traditional sense, but `grim`/`ocx` types do cross an OCI-manifest/lockfile serialization boundary that acts like a public API) — the eager-derive rule should still win for anything that appears in a lockfile schema, cache key, or public CLI output type; it's a judgment call for pure-internal plumbing types.
- **`clippy::unsafe_derive_deserialize` and several other derive-interaction lints live in clippy's `nursery` or `pedantic` groups, not the default `warn`-by-default set** — meaning a fresh `cargo clippy` run without an explicit `[lints.clippy]` table in `Cargo.toml` will not surface them. This is a moving target release-to-release as clippy promotes/demotes lints between groups; the workspace `Cargo.toml` lint table (rule 14) needs a periodic audit against `cargo clippy --help` / the current clippy lint index rather than a "set once and forget" configuration.
- **`secrecy`'s API has evolved across major versions** (the split into `SecretBox`/`SecretString`/`SecretSlice` with `ExposeSecret`/`ExposeSecretMut` as of the docs fetched in 2026 supersedes older `Secret<T>`-only APIs from `secrecy` 0.7/0.8 era) — code or documentation referencing the older single-type API is historical, not current guidance; pin the exact `secrecy` version in the codebase's `Cargo.toml` when writing enforcement rules that mention specific type names.
- **The Cargo semver reference has no explicit section on removing auto-trait/marker-trait impls** (`Copy`, `Send`, `Sync`) as a breaking change, despite this being well-established practice — the guidance in this document (§9) is sourced from the `std::marker::Copy` docs' own explicit warning, not from the semver reference, because the semver reference is silent on it. `cargo-semver-checks` (a separate, not-yet-fetched tool) is the actual automated enforcement mechanism for this class of change in CI and is worth investigating as a follow-up rather than relying on manual review.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rust-lang.github.io/api-guidelines/interoperability.html](https://rust-lang.github.io/api-guidelines/interoperability.html) | Official Rust API Guidelines, "Interoperability" chapter | Living doc, 2024/2026-era edition | Primary source for C-COMMON-TRAITS (eager derive) and C-CONV-TRAITS (From/TryFrom/AsRef/AsMut over Into) |
| [rust-lang.github.io/api-guidelines/naming.html](https://rust-lang.github.io/api-guidelines/naming.html) | Official Rust API Guidelines, "Naming" chapter | Living doc | Primary source for the as_/to_/into_ triad, no-`get_`-prefix getters, and the iter/iter_mut/into_iter convention (C-ITER) |
| [rust-lang.github.io/api-guidelines/debuggability.html](https://rust-lang.github.io/api-guidelines/debuggability.html) | Official Rust API Guidelines, "Debuggability" chapter | Living doc | Primary source for C-DEBUG ("all public types implement Debug") and C-DEBUG-NONEMPTY |
| [rust-lang.github.io/api-guidelines/type-safety.html](https://rust-lang.github.io/api-guidelines/type-safety.html) | Official Rust API Guidelines, "Type safety" chapter | Living doc | Primary source for C-NEWTYPE / C-CUSTOM-TYPE — the rationale for newtypes, linked to TryFrom-based enforcement in Findings §14 |
| [corrode.dev/blog/pitfalls-of-safe-rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) | corrode.dev blog post, "Pitfalls of Safe Rust" | 2020s, actively maintained blog | Primary source for the Debug-on-secrets hazard, Default-on-config hazard, and the `#[serde(try_from = ...)]` validation pattern — the exact three hazards the task brief calls out |
| [docs.rs/secrecy/latest/secrecy](https://docs.rs/secrecy/latest/secrecy/) | Official crate docs for `secrecy` | Current release, 2026 | Primary source for `SecretBox`/`SecretString`, redacted `Debug`, and the `ExposeSecret` access pattern used as the alternative to a leaking derive |
| [docs.rs/zeroize/latest/zeroize](https://docs.rs/zeroize/latest/zeroize/) | Official crate docs for `zeroize` | Current release, 2026 | Primary source for `Zeroize` vs `ZeroizeOnDrop`, and the explicit warning against deriving `Zeroize` directly on always-secret types |
| [github.com/rust-lang/rust-clippy — clippy_lints/src/derive/mod.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/derive/mod.rs) | Clippy lint source (`declare_clippy_lint!` doc comments) | Current `master`, 2026 | Primary source, verbatim lint text for `derive_partial_eq_without_eq`, `derived_hash_with_manual_eq`, `derive_ord_xor_partial_ord`, `expl_impl_clone_on_copy`, `unsafe_derive_deserialize` |
| [github.com/rust-lang/rust-clippy — missing_fields_in_debug.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/missing_fields_in_debug.rs) | Clippy lint source | Current `master`, 2026 | Primary source for the `missing_fields_in_debug` lint (catches manual `Debug` impls that drift from struct fields — relevant to the redacting-Debug pattern in Findings §3) |
| [github.com/rust-lang/rust-clippy — derivable_impls.rs](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/derivable_impls.rs) | Clippy lint source | Current `master`, 2026 | Primary source for `derivable_impls`, the counterweight lint to the Default-on-config rule — flags manual `Default` impls that are redundant with what `#[derive(Default)]` would produce |
| [doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | Official rustc lint listing | Current stable docs, 2026 | Primary source establishing `missing_debug_implementations` is allow-by-default and must be opted in with `#![warn(...)]` |
| [doc.rust-lang.org/cargo/reference/semver.html](https://doc.rust-lang.org/cargo/reference/semver.html) | Official Cargo Book, SemVer compatibility reference | Current stable docs, 2026 | Primary source for `#[non_exhaustive]` breaking-change guidance; also establishes (by its silence) that trait-impl-removal breaking changes are not covered there, motivating the `std::marker::Copy` docs as the actual source for the Copy hazard |
| [doc.rust-lang.org/std/hash/trait.Hash.html](https://doc.rust-lang.org/std/hash/trait.Hash.html) | Official `std::hash::Hash` trait docs | Current stable docs, 2026 | Primary source for the exact Hash/Eq consistency invariant (`k1 == k2 -> hash(k1) == hash(k2)`) and what "logic error" means for HashMap/HashSet |
| [doc.rust-lang.org/std/convert/trait.From.html](https://doc.rust-lang.org/std/convert/trait.From.html) | Official `std::convert::From` trait docs | Current stable docs, 2026 | Primary source for the From-must-be-infallible/lossless/value-preserving contract and the "implement From, not Into" rule via the blanket impl |
| [doc.rust-lang.org/std/marker/trait.Copy.html](https://doc.rust-lang.org/std/marker/trait.Copy.html) | Official `std::marker::Copy` trait docs | Current stable docs, 2026 | Primary source for the explicit semver warning: "if the type might become non-Copy in the future, it could be prudent to omit the Copy implementation now" — the direct citation for Findings §9 |
| [doc.rust-lang.org/reference/attributes/derive.html](https://doc.rust-lang.org/reference/attributes/derive.html) | Official Rust Reference, `derive` attribute | Current stable docs, 2026 | Primary source confirming which traits are built-in derivable and how derive auto-generates generic bounds; underpins the declaration-order mechanism behind the `PartialOrd`/`Ord` enum hazard |
