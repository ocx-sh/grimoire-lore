---
title: Traits, Structs, and Methods vs Free-Standing Functions
topic: rust-type-architecture
agent: traits-vs-free-functions-researcher
model: sonnet
date_researched: 2026-08
sources_count: 19
scope: >
  Covers idiomatic Rust type-driven API design as of the edition-2024 / Rust 1.8x era:
  when to choose free functions vs inherent methods vs traits, newtype/typestate/builder/RAII
  patterns, trait object safety (now "dyn compatibility") and dispatch strategy, coherence and
  sealed traits, and the Rust API Guidelines items that bear on type design. Does NOT cover
  async runtime architecture, error-type design (see a dedicated error-handling subarea if one
  exists), or macro-based codegen beyond what's needed to explain sealing/builders.
---

## Table of contents

1. [Free function vs method vs trait: the decision](#1-free-function-vs-method-vs-trait-the-decision)
2. [The newtype pattern](#2-the-newtype-pattern)
3. [Parse, don't validate — applied to Rust](#3-parse-dont-validate--applied-to-rust)
4. [The typestate pattern](#4-the-typestate-pattern)
5. [The builder pattern](#5-the-builder-pattern)
6. [RAII guards](#6-raii-guards)
7. [Phantom types](#7-phantom-types)
8. [Trait design: object safety / dyn compatibility](#8-trait-design-object-safety--dyn-compatibility)
9. [Sealed traits](#9-sealed-traits)
10. [Extension traits and blanket impls](#10-extension-traits-and-blanket-impls)
11. [The orphan rule and coherence](#11-the-orphan-rule-and-coherence)
12. [Associated types vs generic parameters, and GATs](#12-associated-types-vs-generic-parameters-and-gats)
13. [`impl Trait` in argument and return position, and RPITIT](#13-impl-trait-in-argument-and-return-position-and-rpitit)
14. [Static vs dynamic dispatch](#14-static-vs-dynamic-dispatch)
15. [Anti-patterns](#15-anti-patterns)
16. [Rust API Guidelines checklist items that bear on type design](#16-rust-api-guidelines-checklist-items-that-bear-on-type-design)
17. [Real codebases: how cargo, ripgrep, reqwest structure types](#17-real-codebases-how-cargo-ripgrep-reqwest-structure-types)
18. [Normative guidance candidates](#normative-guidance-candidates)
19. [AI-agent angle](#ai-agent-angle)
20. [Contested / evolving](#contested--evolving)
21. [Sources](#sources)

---

## Summary

- A function belongs on a type (inherent `impl`) the moment it has a clear receiver; free functions are for constructors that can't be `Self::new`-shaped, pure transformations with no natural "owner" type, and operations over foreign types you can't `impl` on ([Rust API Guidelines, "Functions with a clear receiver are methods"](https://rust-lang.github.io/api-guidelines/checklist.html)).
- Use the newtype pattern (`struct Meters(f64)`) to make unit/kind confusion a compile error, not a runtime bug — this is the direct Rust idiom for "parse, don't validate" ([API Guidelines C-NEWTYPE](https://rust-lang.github.io/api-guidelines/type-safety.html)).
- A smart constructor (`fn parse(s: &str) -> Result<Digest, Error>`) that returns a newtype turns every later call site from "must re-check" into "already guaranteed" — this is Alexis King's *parse, don't validate* principle applied to Rust's type system ([applications collected here](https://harudagondi.space/blog/parse-dont-validate-and-type-driven-design-in-rust/)).
- The typestate pattern encodes protocol state in the type itself (`Draft` → `PendingReview` → `Published`) so illegal transitions fail to compile, not at runtime — the Rust book's own "OOP state pattern" chapter recommends the type-encoded version as more idiomatic than the `Box<dyn State>` version ([Rust Book ch. 18](https://doc.rust-lang.org/book/ch18-03-oo-design-patterns.html)).
- Builders come in two flavors: non-consuming (`&mut self -> &mut Self`, e.g. `std::process::Command`) and consuming (`self -> Self`); prefer non-consuming unless the builder must transfer ownership of something during configuration ([API Guidelines C-BUILDER](https://rust-lang.github.io/api-guidelines/type-safety.html)).
- Traits should be designed object-safe (now called *dyn compatible*) deliberately, not by accident: decide up front whether a trait is a generic-bound trait or an object trait, and use `where Self: Sized` to exclude specific methods from the dyn-compatibility requirement ([API Guidelines C-OBJECT](https://rust-lang.github.io/api-guidelines/flexibility.html); [terminology rename](https://github.com/rust-lang/lang-team/issues/286)).
- `async fn` and return-position `impl Trait` in traits (RPITIT/AFIT), stable since **Rust 1.75** (Dec 2023), make traits with iterator/future-returning methods far more ergonomic — but such traits are **not dyn compatible**: you lose `dyn Trait` entirely unless you hand-write a `dyn`-compatible shim or use `trait_variant::make` ([Rust Blog announcement](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/)).
- Generic Associated Types (GATs) stabilized in **Rust 1.65** (Nov 2022); use them when an associated type must itself be generic over a lifetime borrowed from `&self` (lending iterators, zero-copy parsers) — anything trained before late 2022 may not know they exist or may hallucinate pre-stabilization syntax ([GATs stabilization post](https://blog.rust-lang.org/2022/10/28/gats-stabilization.html)).
- Seal a trait to freeze its method set against downstream `impl`s while still letting it be used as a bound; there are three distinct techniques (supertrait sealing, signature/token sealing, partial sealing) with different capability trade-offs, not one universal recipe ([predr.ag definitive guide](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/); [API Guidelines C-SEALED](https://rust-lang.github.io/api-guidelines/future-proofing.html)).
- Extension traits are the sanctioned way to add methods to a foreign type without violating the orphan rule — define a trait, `impl` it only for the foreign type(s) you name, don't design it to be implemented generically ([RFC 0445](https://rust-lang.github.io/rfcs/0445-extension-trait-conventions.html)).
- A blanket impl (`impl<T: Display> ToString for T`) is the right tool when a capability should fall out automatically from an existing trait bound — but a blanket impl and a manual impl of the same trait for the same concrete type will not coexist; the orphan rule plus the overlap rule is what stops two crates from fighting over the same `impl` ([coherence explainer](https://github.com/Ixrec/rust-orphan-rules)).
- The orphan rule requires the trait or the type to be local to your crate for any `impl Trait for Type` — this is *why* the newtype pattern exists as a workaround for wrapping foreign types to `impl` foreign traits on them ([Rust Reference, Implementations](https://doc.rust-lang.org/reference/items/implementations.html)).
- Static dispatch (generics, monomorphized) is the default in Rust and is what "zero-cost abstraction" refers to; dynamic dispatch (`dyn Trait`) trades some runtime cost (vtable indirection, no cross-call inlining) for smaller binaries, faster compile times in some cases, and heterogeneous collections ([official 2015 Rust blog post on zero-cost traits](https://blog.rust-lang.org/2015/05/11/traits/), still the canonical statement of the trade-off).
- In one published microbenchmark, iterating 20M elements took 64ms with static dispatch vs 216ms with `dyn` (~3.4x), with the gap driven mostly by lost inlining, not the vtable lookup itself — a signal to keep `dyn` calls out of hot inner loops, not a blanket ban on `dyn` ([benchmark writeup, see Sources](https://www.somethingsblog.com/2025/04/20/rust-dispatch-explained-when-enums-beat-dyn-trait/)).
- `enum_dispatch` converts a closed, crate-controlled set of trait impls into a single enum with generated `match`-based dispatch, reported up to 10x faster than `dyn Trait` for the call itself because it restores inlining — appropriate exactly when the variant set is closed and known at compile time, wrong the moment callers need to add their own impls ([enum_dispatch docs](https://docs.rs/enum_dispatch/latest/enum_dispatch/)).
- A trait implemented by exactly one type, in the same crate, with no plan for a second implementation, is very often a needless abstraction — prefer an inherent `impl` until a second concrete need for polymorphism actually exists ([community discussion of the "trait-to-extend" anti-pattern](https://github.com/rust-unofficial/patterns/discussions/357)).
- `Deref`/`DerefMut` are for smart pointers only — never implement them to fake inheritance or to avoid writing accessor methods; this both violates API Guidelines C-DEREF and creates confusing autoderef method-resolution surprises ([API Guidelines, type-safety/predictability sections](https://rust-lang.github.io/api-guidelines/type-safety.html)).
- Struct fields should default to private (`C-STRUCT-PRIVATE`) so invariants established by a constructor/parser can't be broken by direct field mutation from outside the module — this is the mechanical enforcement of "parse, don't validate."

---

## Findings

### 1. Free function vs method vs trait: the decision

Rust's own API Guidelines checklist states the operative heuristic directly: **"Functions with a clear receiver are methods"** ([checklist](https://rust-lang.github.io/api-guidelines/checklist.html)). The decision tree in practice, synthesized from the guidelines and community consensus on `internals.rust-lang.org` ([Trait method or free function?](https://internals.rust-lang.org/t/trait-method-or-free-function/572)):

| Situation | Idiomatic choice |
|---|---|
| Operation has one obviously-primary argument that "owns" the behavior | Inherent method `impl Type { fn op(&self, ...) }` |
| Pure transformation with no privileged argument (e.g. `min(a, b)`, a hash function over two independent values) | Free function |
| Constructor-like helper that doesn't fit `Type::new` (e.g. builds a `Vec<Foo>` from disparate inputs) | Free function, often named `make_*` or living in a module, not a method |
| Operation over a **foreign** type you don't own and the trait/type orphan rule blocks an inherent `impl` | Free function, or an extension trait if method-call syntax is wanted |
| Behavior needs to vary by concrete type at a call site the crate doesn't control | Trait (object-safe if callers need `dyn`, generic bound otherwise) |
| Behavior is implemented by exactly one type in your own crate, no second impl planned | Inherent method — *not* a trait (see §15 anti-patterns) |

Most free functions surviving in `std` today are explicitly "historical baggage" from before the method-call convention solidified; new API surfaces are expected to prefer methods when a receiver exists ([internals thread](https://internals.rust-lang.org/t/trait-method-or-free-function/572)). For the OCX/Grimoire codebases specifically — where the owner has flagged "dominated by free-standing functions" as a pain point — the fix is not "delete all free functions," it's: any function whose first parameter is conceptually `&self`/`&mut self`/`self` for a type your crate owns should become a method on that type.

### 2. The newtype pattern

A newtype is a single-field tuple struct that wraps an existing type to create a *distinct* type at compile time ([API Guidelines C-NEWTYPE](https://rust-lang.github.io/api-guidelines/type-safety.html)):

```rust
// Bad: two f64s that are trivially swappable by mistake.
fn to_kilometers(miles: f64) -> f64 { miles * 1.609 }

// Good: the compiler now refuses to pass a Kilometers where Miles is expected.
struct Miles(pub f64);
struct Kilometers(pub f64);
impl Miles {
    fn to_kilometers(self) -> Kilometers { Kilometers(self.0 * 1.609) }
}
```

For the OCX/Grimoire domain this maps directly onto the primitives that get passed around as bare `String`/`Vec<u8>` today: an OCI digest, a registry reference, a credential token, a lockfile hash. Wrapping each as a newtype (`Digest(String)`, `RegistryRef(String)`) means a function signature `fn pull(digest: Digest, registry: RegistryRef)` cannot be called with the arguments swapped — the current codebase's `fn pull(String, String)` can.

The newtype pattern is also the *only* legal way to implement a foreign trait for a foreign type, because it introduces a new local type that satisfies the orphan rule (§11) — e.g. wrapping `reqwest::Error` in a local `RegistryError(reqwest::Error)` to `impl std::error::Error` with local formatting.

### 3. Parse, don't validate — applied to Rust

Alexis King's 2019 principle — encode invariants in types at the boundary rather than re-checking booleans deep in the call stack — has a direct, mechanical Rust translation: a **smart constructor** that returns `Result<NewtypeT, Error>`, after which every other function in the program takes `NewtypeT` by value and never re-validates ([collected write-up](https://harudagondi.space/blog/parse-dont-validate-and-type-driven-design-in-rust/)):

```rust
// Validating (bad): the bool tells you nothing at the call site, and every
// downstream function must decide whether to trust it or re-check.
fn is_valid_digest(s: &str) -> bool { ... }
fn extract(tarball_path: &Path, digest: &str) -> Result<()> {
    if !is_valid_digest(digest) { return Err(...) }
    // ... 40 lines later, still just a &str
}

// Parsing (good): once you hold a Digest, the invariant is permanent.
pub struct Digest(String); // C-STRUCT-PRIVATE: field is not pub
impl Digest {
    pub fn parse(s: &str) -> Result<Self, DigestError> {
        // sha256:<64 hex chars> — checked exactly once, here.
        ...
    }
}
fn extract(tarball_path: &Path, digest: &Digest) -> Result<()> { /* no re-check possible */ }
```

This is the single highest-leverage pattern for a security-sensitive, filesystem-heavy CLI: digest verification, tarball path sanitization, and credential handling should all be "parsed" once into a newtype at the trust boundary (registry response, CLI arg, lockfile read) and never touched as a raw `String`/`&str` again downstream.

### 4. The typestate pattern

The typestate pattern encodes an object's protocol state as its Rust *type*, so that operations illegal in the current state are simply absent from that type's `impl` block and therefore fail to compile ([Cliffle, "The Typestate Pattern in Rust"](https://cliffle.com/blog/rust-typestate/); [Embedded Rust Book](https://docs.rust-embedded.org/book/static-guarantees/typestate-programming.html)):

```rust
pub struct HttpResponseBuilder;              // state: nothing written
pub struct AfterStatus { .. }                // state: status line written
pub struct AfterHeaders { .. }               // state: headers written

impl HttpResponseBuilder {
    fn status_line(self, code: u16) -> AfterStatus { .. }
}
impl AfterStatus {
    fn header(self, k: &str, v: &str) -> AfterHeaders { .. }
}
impl AfterHeaders {
    fn header(self, k: &str, v: &str) -> AfterHeaders { .. } // headers, chained
    fn body(self, text: &str) -> Vec<u8> { .. }               // terminal
}
```

The Rust Book's own worked example (the blog-post `Post`/`DraftPost`/`PendingReviewPost` state machine) explicitly prefers this type-encoded version over the `Box<dyn State>` trait-object version, because "invalid state transitions are caught at compile time... it's impossible to accidentally display unpublished content" ([Rust Book ch. 18.3](https://doc.rust-lang.org/book/ch18-03-oo-design-patterns.html)).

For OCX/Grimoire: a **lockfile writer** or **atomic-write-to-tempfile-then-rename** helper is a natural typestate candidate — `TempFile` (open, writable) → `FsyncedTempFile` (data flushed) → committed via `rename()`, consuming `self` at each step so a caller physically cannot rename a file whose contents were never fsynced. Cliffle's caveat is worth carrying forward: typestate depends on move semantics to work well, and Rust's ownership model is one of the few mainstream languages where it's cheap to apply ([Cliffle](https://cliffle.com/blog/rust-typestate/)) — but it adds real boilerplate (one struct + impl per state), so reserve it for protocols where an out-of-order call is a *correctness or security* bug, not for every multi-step process.

### 5. The builder pattern

API Guidelines C-BUILDER distinguishes **non-consuming** and **consuming** builders ([type-safety.html](https://rust-lang.github.io/api-guidelines/type-safety.html)):

```rust
// Non-consuming (preferred default): terminal method takes &self, so both
// one-liners and stored/reused partial configs work.
let mut cmd = std::process::Command::new("/bin/cat");
cmd.arg("file.txt");
cmd.spawn()?;

// Consuming: terminal method takes self by value; needed only when the
// builder must move out something non-Clone during configuration.
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(10))
    .gzip(true)
    .build()?;
```

`reqwest::ClientBuilder` is a real-world consuming builder: its private fields hold an inner `async_impl::ClientBuilder` plus a `timeout`, and `.build()` consumes `self` to produce an immutable, internally-`Arc`'d `Client` that's cheap to clone and share ([reqwest source](https://github.com/seanmonstar/reqwest/blob/master/src/blocking/client.rs)). `ripgrep`'s `ignore::WalkBuilder` is the non-consuming style: configuration methods mutate `&mut self` and return `&mut Self`, and `.build()` produces the iterator ([ripgrep walk.rs](https://github.com/BurntSushi/ripgrep/blob/master/crates/ignore/src/walk.rs)).

For an OCI registry client with many optional knobs (retries, auth, mirror fallback, TLS config), a `RegistryClientBuilder` following the `reqwest` shape is the idiomatic replacement for a free function taking eight `Option<T>` parameters.

### 6. RAII guards

RAII (Resource Acquisition Is Initialization) guards tie a resource's lifetime to a value's `Drop` impl, so cleanup happens automatically and can't be forgotten — `std::sync::MutexGuard` is the canonical example: `lock()` returns a guard, and unlock happens in `Drop`, making "forgot to unlock" unrepresentable. The pattern generalizes to any acquire/release pair: a temp-directory guard that `rm -rf`s on drop, a process-spawn guard that kills a child on drop, a lockfile guard that removes the `.lock` file on drop. For OCX/Grimoire's filesystem-heavy operations (cache directories, in-progress downloads, subprocess execution of downloaded tools), a `Drop`-based guard is the mechanical way to guarantee cleanup on the early-return/`?`-propagation paths that free functions with manual cleanup calls routinely miss.

### 7. Phantom types

`PhantomData<T>` lets a struct carry a compile-time-only type parameter with no runtime storage, used to encode extra invariants the type system should check but that have no data representation — e.g. `Verified` vs `Unverified` markers on a generic `Signed<State, T>` wrapper, or unit markers (`Length<Meters>` vs `Length<Feet>`) without per-unit struct duplication. It composes with the newtype and typestate patterns: a zero-sized marker type plus `PhantomData` gets you typestate-style compile-time state tracking on top of an existing generic struct, without runtime cost.

### 8. Trait design: object safety / dyn compatibility

As of the current Rust Reference, the concept formerly called "object safety" is now named **dyn compatibility** — the Rust language team proposed and the reference has adopted the rename because "object safety" was judged an unclear, misleading term (nothing to do with `unsafe`, no clear referent for "object" in a non-OOP language) ([lang-team issue #286](https://github.com/rust-lang/lang-team/issues/286); [Rust Reference, Traits](https://doc.rust-lang.org/reference/items/traits.html)). A trait is dyn-compatible only if, roughly: it has no generic methods, no `Self: Sized` methods counted against it, no associated constants, and doesn't return `Self` by value from a method usable through `dyn`.

API Guidelines C-OBJECT: decide **at trait-design time** whether a trait is meant to back `dyn Trait` objects or to be used purely as a generic bound — and if it needs to do both, put the `Self`-returning / generic methods behind `where Self: Sized` so they're excluded from the vtable and don't break dyn compatibility for the rest of the trait ([flexibility.html](https://rust-lang.github.io/api-guidelines/flexibility.html)):

```rust
pub trait Extractor {
    fn extract(&self, archive: &Path, dest: &Path) -> Result<()>; // dyn-compatible

    fn boxed(self) -> Box<dyn Extractor>
    where
        Self: Sized + 'static,               // excluded from the vtable
    {
        Box::new(self)
    }
}
```

### 9. Sealed traits

Sealing freezes a trait's implementer set to the defining crate while still letting downstream crates use it as a bound or call its methods. Predrag Gruevski's guide documents that this is not one pattern but a spectrum, and the choice changes what downstream code can still do ([predr.ag, "A definitive guide to sealed traits in Rust"](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/)):

```rust
// 1. Supertrait sealing — strongest: blocks impl AND indirectly nothing else
//    is restricted (calling methods is still fine).
mod private { pub trait Sealed {} }
pub trait Extractor: private::Sealed {
    fn extract(&self, src: &Path, dst: &Path) -> std::io::Result<()>;
}
impl private::Sealed for TarGzExtractor {}
impl Extractor for TarGzExtractor { .. }

// 2. Signature/token sealing — blocks impl AND blocks calling the method,
//    because the token type is unnameable outside the crate.
mod private { pub struct Token(pub(crate) ()); }
pub trait Extractor {
    fn extract(&self, src: &Path, dst: &Path, _t: private::Token) -> std::io::Result<()>;
}

// 3. Partial sealing — some methods overridable downstream, others not
//    (this is how std::error::Error itself is sealed).
```

| Technique | Downstream can use as bound | Downstream can call methods | Downstream can `impl` |
|---|---|---|---|
| `pub trait` (unsealed) | yes | yes | yes |
| Supertrait sealed | yes | yes | **no** |
| Signature/token sealed | yes | **no** | no |
| Partially sealed | yes | selective | selective |

Use sealing on any internal trait abstraction (extraction backends, registry auth strategies, transport backends) that the crate wants freedom to extend with new variants later without it counting as a breaking change — API Guidelines names this directly as C-SEALED, "Sealed traits protect against downstream implementations" ([future-proofing.html](https://rust-lang.github.io/api-guidelines/future-proofing.html)).

### 10. Extension traits and blanket impls

An extension trait adds methods to a type (often foreign) you don't own, by defining a small trait and implementing it only for that type — RFC 0445 codifies the naming convention (`...Ext` suffix) and the rule that an extension trait is not meant for generic downstream implementation, only for the specific type(s) it targets ([RFC 0445](https://rust-lang.github.io/rfcs/0445-extension-trait-conventions.html)):

```rust
trait ResponseExt {
    fn digest_header(&self) -> Option<&str>;
}
impl ResponseExt for reqwest::Response {
    fn digest_header(&self) -> Option<&str> {
        self.headers().get("Docker-Content-Digest")?.to_str().ok()
    }
}
```

A blanket impl (`impl<T: Trait1> Trait2 for T`) grants `Trait2` automatically to every type already satisfying `Trait1` — the standard library's `impl<T: Display> ToString for T` is the reference example. Blanket impls interact with coherence: you cannot add a second, overlapping blanket impl for the same trait in a downstream crate, and a concrete manual impl for a specific type will conflict with a blanket impl that also covers it unless specialization (unstable) is in play.

### 11. The orphan rule and coherence

The orphan rule: `impl Trait for Type` is only legal if the crate defines the trait, the type, or both — never when both are foreign ([Rust Reference, Implementations](https://doc.rust-lang.org/reference/items/implementations.html); [rust-orphan-rules explainer](https://github.com/Ixrec/rust-orphan-rules)). This exists to guarantee **coherence** — at most one impl of a trait for a type exists program-wide, so the compiler never has to pick between two crates' conflicting impls. The practical corollary for this codebase: you cannot `impl serde::Serialize for oci_spec::Digest` if both are foreign crates — the fix is the newtype pattern (§2), wrapping the foreign type locally so the local-type half of the orphan rule is satisfied.

### 12. Associated types vs generic parameters, and GATs

Use an **associated type** when a trait implementation determines exactly one such type per impl (an `Iterator`'s `Item`); use a **generic parameter** on the trait when a single type might sensibly implement the trait multiple times for different type arguments (`From<T>` — a type can convert `From` many source types). Getting this backwards either forces callers to over-specify turbofish everywhere (associated type should've been generic) or prevents a type from having more than one useful impl (generic should've been associated).

Generic Associated Types (GATs) — letting an associated type itself carry generic parameters (lifetime, type, or const) — stabilized in **Rust 1.65**, November 2022, after a six-year RFC process ([GATs stabilization post](https://blog.rust-lang.org/2022/10/28/gats-stabilization.html)). The headline use case is a `LendingIterator` whose `Item<'a>` borrows from `&'a mut self`, enabling zero-copy parsing patterns that were previously impossible to express as a trait. Any model trained substantially before that date, or generalizing from pre-2022 Rust material, may not know GATs exist or may propose invalid pre-stabilization workarounds.

### 13. `impl Trait` in argument and return position, and RPITIT

`impl Trait` in **argument** position (`fn f(x: impl Read)`) is sugar for an anonymous generic parameter — static dispatch, monomorphized, has been stable since Rust 1.26 (2018). `impl Trait` in **return** position (`fn f() -> impl Iterator<Item = u32>`) lets a function return an unnameable concrete type (e.g. a chained iterator adaptor type) while hiding it behind the trait — also long-stable for free functions and inherent methods.

What's new: **return-position `impl Trait` in traits (RPITIT)** and **`async fn` in traits (AFIT)** — the ability to write `-> impl Iterator<Item=T>` or `async fn` directly as a *trait* method signature — stabilized together in **Rust 1.75**, December 2023 ([Rust Blog announcement](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/); [RFC 3425](https://rust-lang.github.io/rfcs/3425-return-position-impl-trait-in-traits.html)). The critical, easy-to-miss limitation: **traits using RPITIT or `async fn` are not dyn compatible** — you cannot build a `dyn Trait` from them. For a public trait where callers might need `Send` futures, the blog recommends the `trait_variant::make` macro to generate a `Send`-bound sibling trait rather than adding `Send` bounds directly to the public trait (which would force it on every implementor).

```rust
// Compiles, ergonomic — but this trait can NEVER be used as `dyn Extractor`.
trait Extractor {
    async fn extract(&self, src: &Path, dst: &Path) -> std::io::Result<()>;
}
```

If a registry-backend or extractor trait in OCX/Grimoire needs both `async fn` ergonomics *and* `dyn` usage (e.g. a plugin-style list of backends chosen at runtime), AFIT/RPITIT is the wrong tool — use `#[async_trait]` (boxes the future, dyn-compatible, small runtime cost) or hand-write `Pin<Box<dyn Future<...>>>` returns instead.

### 14. Static vs dynamic dispatch

Static dispatch is Rust's zero-cost default: a generic function is monomorphized into one specialized copy per concrete type at the call site, so the trait call itself disappears at codegen time and the optimizer can inline across it. Dynamic dispatch (`&dyn Trait` / `Box<dyn Trait>`) stores a data pointer plus a vtable and resolves the call at runtime — "you have vtables when you need them, but the same trait can be compiled away statically when you don't" is the Rust project's own framing, unchanged since the language's early zero-cost-abstraction blog post ([Rust Blog, 2015, still the canonical citation](https://blog.rust-lang.org/2015/05/11/traits/)).

Trade-offs, concretely:

| | Static (generics / `impl Trait`) | Dynamic (`dyn Trait`) | Enum dispatch |
|---|---|---|---|
| Call overhead | none (inlined) | vtable indirection, no inlining across the call | none (match, inlinable) |
| Binary size | grows with # of instantiations (monomorphization bloat) | one copy regardless of concrete types | one copy, no bloat |
| Compile time | can grow with # of instantiations | lower per-callsite | lower |
| Heterogeneous collections (`Vec<T>` of mixed concrete types) | not directly possible | yes, that's the point | only for a closed, known variant set |
| Extensible by downstream/plugin code | no | yes | no — variants are fixed at compile time |

A published microbenchmark iterating 20M elements measured 64ms (static) vs 216ms (`dyn`, ~3.4x slower), with the gap widening sharply when the dispatch point sits *inside* the hot loop rather than outside it ([benchmark](https://www.somethingsblog.com/2025/04/20/rust-dispatch-explained-when-enums-beat-dyn-trait/)). `enum_dispatch` sits between the two: it macro-generates an enum with one variant per implementing type and inherent `match`-based forwarding methods, reportedly up to 10x faster than the equivalent `dyn Trait` call because it restores compiler inlining — but it only works when the implementor set is closed and known to the crate at compile time; it cannot support a caller-supplied, open-ended type ([enum_dispatch docs](https://docs.rs/enum_dispatch/latest/enum_dispatch/); [comparison writeup](https://www.somethingsblog.com/2025/04/20/rust-dispatch-explained-when-enums-beat-dyn-trait/)).

Practical rule of thumb for OCX/Grimoire: registry backends, extractors, and auth strategies are almost always a **closed, crate-known set** (OCI HTTP, local file, maybe one mirror protocol) → prefer an enum with `match`-based dispatch (or `enum_dispatch` if the boilerplate is heavy) over `dyn Trait`, reserving `dyn` for genuinely open-ended cases like a plugin system loading arbitrary external crates.

### 15. Anti-patterns

- **Trait-per-struct with a single impl.** If a trait has exactly one implementor, lives entirely inside your own crate, and there's no concrete plan for a second implementor, it's usually pure ceremony — an inherent `impl` gives the same methods with no vtable, no extra indirection to read through, and no dyn-compatibility constraints to satisfy later. The community explicitly debates this as the "trait-to-extend" anti-pattern ([rust-unofficial/patterns discussion #357](https://github.com/rust-unofficial/patterns/discussions/357)). Exception: a trait with one impl today but a *named, concrete* second implementor on the roadmap (e.g. "local extractor now, OCI-artifact extractor next quarter") is legitimate forward design, not premature abstraction — the test is whether a second impl is planned, not merely conceivable.
- **Stringly-typed APIs.** Passing `&str`/`String` for things that are actually a closed enumeration (registry scheme, auth mode, compression format) forces every call site to re-validate and re-match strings at runtime instead of letting the compiler exhaustiveness-check an enum. Combine with C-CUSTOM-TYPE (§16): booleans and raw strings that encode a choice should become an enum or newtype.
- **God structs.** A single struct accumulating every field the program touches (config + cache state + network client + credentials + in-flight downloads) forces every function that needs one field to take a `&mut GodStruct`, serializing otherwise-independent work and making borrow-checker conflicts common. Split by responsibility and compose via smaller structs held as fields, not one struct with fifty fields.
- **Deref polymorphism.** Implementing `Deref`/`DerefMut` to simulate inheritance (so `Wrapper` "inherits" `Inner`'s methods) is explicitly against API Guidelines — `Deref` is reserved for genuine smart pointers, and abusing it produces surprising autoderef method resolution and IDE-completion noise unrelated to the wrapper's own API ([API Guidelines, C-DEREF](https://rust-lang.github.io/api-guidelines/type-safety.html)).
- **Over-generic signatures.** A function generic over `T: Read + Write + Seek + Send + Sync + 'static` when it only ever gets called with `File` gains nothing (no second caller, no test double) and costs monomorphization + harder-to-read signatures. Generalize a signature only when there's a second real caller, not speculatively.
- **Premature `dyn`.** Reaching for `Box<dyn Trait>` before checking whether the implementor set is actually open-ended (see §14's enum-dispatch case) pays a real performance and inlining cost for flexibility nobody is using yet.

### 16. Rust API Guidelines checklist items that bear on type design

Enumerated from the official checklist ([rust-lang.github.io/api-guidelines/checklist.html](https://rust-lang.github.io/api-guidelines/checklist.html)) and detail pages:

| Code | Rule | Relevance here |
|---|---|---|
| C-COMMON-TRAITS | Eagerly derive `Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug, Display, Default` where applicable | Newtypes and domain structs should derive these, not hand-roll |
| C-CONV-TRAITS | Conversions use `From`/`AsRef`/`AsMut`, not ad-hoc `to_x`/`from_x` free functions where a trait fits | Prefer `impl From<RawManifest> for Manifest` over a free `parse_manifest` |
| C-COLLECT | Collections impl `FromIterator`/`Extend` | If OCX/Grimoire has a custom collection (e.g. lockfile entry set) |
| C-SEND-SYNC | Types are `Send`+`Sync` where possible | Required for anything crossing a tokio `.await`/task boundary |
| C-STRUCT-PRIVATE | Struct fields are private by default | Enforces the "parse, don't validate" invariant (§3) |
| C-SEALED | Sealed traits protect against downstream impls | See §9 |
| C-CONV | Ad-hoc conversions follow `as_`/`to_`/`into_` naming | `as_` = cheap borrow, `to_` = expensive/copying, `into_` = consumes self |
| C-CONV-SPECIFIC | Conversions live on the most specific type | `Digest::to_hex()`, not a free `hex_encode(digest)` |
| C-DEREF | Only smart pointers impl `Deref`/`DerefMut` | See §15 anti-patterns |
| C-NEWTYPE | Newtypes provide static distinctions | See §2 |
| C-CUSTOM-TYPE | Arguments convey meaning through types, not raw `bool`/`Option` | `Widget::new(Small, Round)` over `Widget::new(true, false)` |
| C-BUILDER | Builders for complex construction | See §5 |
| C-GENERIC | Generic functions minimize assumptions about inputs via trait bounds, not concrete types | `fn f(i: impl IntoIterator<Item=i64>)` over `fn f(v: &Vec<i64>)` |
| C-INTERMEDIATE | Expose useful intermediate computation results rather than recomputing | `binary_search` returns insertion point even on `Err` |
| C-CALLER-CONTROL | Take ownership vs borrow based on actual need; don't bound on `Copy` just to signal cheapness | |
| C-OBJECT | Decide trait dyn-compatibility deliberately; use `where Self: Sized` to exclude methods from the vtable requirement | See §8 |

### 17. Real codebases: how cargo, ripgrep, reqwest structure types

- **ripgrep** factors search/traversal logic into a workspace of focused crates (`ignore`, `grep-matcher`, `grep-searcher`, `grep-printer`, ...) rather than one monolith; `ignore::WalkBuilder` is a textbook non-consuming builder producing a `Walk`/`WalkParallel` iterator, with the ignore-rule matching itself implemented as a small hierarchical `Ignore` type rather than free functions threading state through parameters ([ripgrep repo](https://github.com/BurntSushi/ripgrep), [walk.rs](https://github.com/BurntSushi/ripgrep/blob/master/crates/ignore/src/walk.rs)). Directly relevant precedent for splitting OCX/Grimoire's one-crate design into focused sub-crates (registry client, extraction, lockfile, cache) the way ripgrep splits traversal from matching from printing.
- **reqwest** exposes exactly the builder→immutable-client shape recommended in §5: `ClientBuilder` is consumed by `.build()` to produce a `Client` that is cheap to `.clone()` because it holds its connection pool behind an internal `Arc` — callers are explicitly told *not* to wrap it in their own `Arc`/`Rc` ([reqwest Client docs](https://docs.rs/reqwest/latest/reqwest/struct.Client.html), [source](https://github.com/seanmonstar/reqwest/blob/master/src/blocking/client.rs)). A `RegistryClient` in OCX/Grimoire pulling credentials, retry policy, and TLS config together is the same shape.
- **The 2015 Rust blog trait-abstraction post** itself uses the standard library's own iterator-adaptor chain (`map`/`filter`/`fold`) as the reference example of trait-based zero-cost design: each adaptor is a small generic struct implementing `Iterator`, composed by ownership, dispatched statically, and optimized to the same code a hand-written loop would produce ([2015 post](https://blog.rust-lang.org/2015/05/11/traits/)).

---

## Normative guidance candidates

1. **A function whose first parameter is conceptually `&self`/`&mut self`/`self` for a type your crate owns must be a method on that type, not a free function taking the type as its first argument.** Rationale: this is the exact "free-standing functions instead of methods" pain point the owner named. Verify: `grep -rn '^pub fn [a-z_]*(' src/ | grep -E '\(([a-z_]+: &?(mut )?(Self|[A-Z][a-zA-Z]*)'` — any hit where the first parameter's type has an `impl` block in the same crate is a candidate to move.

2. **Any raw `String`/`&str`/`Vec<u8>` that represents a digest, registry reference, credential, or path that must satisfy a format invariant must be parsed into a newtype at the boundary and never re-validated downstream.** Rationale: mechanizes "parse, don't validate"; makes digest/credential confusion a compile error. Verify: code-reading heuristic — grep for validation-looking function names (`is_valid_*`, `check_*`, `validate_*`) called more than once on the same conceptual value across the call graph; each such repeat validation is a missing newtype.

3. **Struct fields are private by default; a `pub` field is only acceptable when the struct is a pure data-carrier with no invariant to protect (API Guidelines C-STRUCT-PRIVATE).** Rationale: private fields plus a constructor is what makes a newtype's invariant permanent. Verify: `cargo clippy` does not catch this directly; grep for `pub struct` followed by `pub` field declarations and manually confirm each one is invariant-free.

4. **Never implement `Deref`/`DerefMut` except on an actual smart pointer (owns/manages access to exactly one inner value, like `Box`/`Rc`/`MutexGuard`).** Rationale: C-DEREF; deref-as-inheritance produces surprising autoderef method resolution. Verify: `grep -rn 'impl.*Deref.*for' src/` and manually confirm each target is a genuine pointer-like wrapper, not a "give me Inner's methods for free" hack.

5. **A trait with exactly one implementor inside the crate and no named second implementor on the roadmap should be collapsed into an inherent `impl`.** Rationale: avoids the trait-per-struct anti-pattern, removes an unneeded vtable-compatibility constraint, and stops the trait from silently becoming non-dyn-compatible-by-accident later. Verify: for each `trait T` defined and only-`impl`'d within the same crate, `grep -rn 'impl T for' src/` returning exactly one hit is a candidate; confirm with the author whether a second impl is actually planned before collapsing.

6. **Before writing `Box<dyn Trait>`, confirm the implementor set is actually open-ended (caller-supplied types); if it's closed and crate-known, use an enum with `match`-based dispatch instead.** Rationale: static/enum dispatch avoids vtable indirection and restores cross-call inlining; published benchmarks show ~3.4x for a tight loop and `enum_dispatch` reports up to 10x over `dyn` for the call itself. Verify: code-reading heuristic — list every concrete `impl` of the trait; if all of them live in this crate/workspace, `dyn` is very likely the wrong choice.

7. **Any trait meant to back a `dyn Trait` object must avoid `async fn` and return-position `impl Trait` in its method signatures (RPITIT/AFIT make a trait non-dyn-compatible) — use `#[async_trait]` or a hand-written `Pin<Box<dyn Future<...>>>` return instead.** Rationale: stabilized in Rust 1.75; this is the single most likely place an AI agent writes code that compiles today but silently forecloses `dyn` usage later. Verify: `grep -rn 'async fn' src/**/trait*.rs` (or any file defining a `trait`) cross-checked against `grep -rn 'dyn ' ` usages of the same trait name — if both appear, it won't compile, which is itself the check (`cargo build` fails with an explicit "not dyn compatible" diagnostic).

8. **Seal any internal trait (extraction backend, auth strategy, transport) that the crate wants to extend later without a semver break, using supertrait sealing unless downstream also needs to call the methods, in which case use signature/token sealing.** Rationale: C-SEALED; freezes the impl set while a public bound stays usable. Verify: grep for `pub trait` definitions with more than one crate-internal `impl`; confirm each either has a `: private::Sealed` supertrait bound or is deliberately meant to be open for downstream `impl`.

9. **Wrapping a foreign type to implement a foreign trait on it (orphan-rule workaround) must use the newtype pattern — never a type alias, and never a locally-defined trait that happens to share the foreign trait's method names.** Rationale: type aliases don't create a new type for orphan-rule purposes; a same-named-but-different trait silently fails to satisfy trait bounds expecting the real foreign trait. Verify: `grep -rn 'type .* = ' src/` for aliases used where a trait impl was actually wanted — a smell, not a hard rule violation, but worth flagging in review.

10. **A public builder must be either fully non-consuming (`&mut self -> &mut Self`, terminal method `&self`) or fully consuming (`self -> Self`, terminal `self`) — never mixed within the same builder type.** Rationale: C-BUILDER; mixing the two styles breaks the "store partial config and reuse" ergonomics of non-consuming builders and the "one-liner chain" ergonomics of consuming builders simultaneously. Verify: for each `*Builder` struct, grep its `impl` block for method receiver types (`&mut self` vs `self`) and confirm consistency (excluding the single terminal `build`/`get` call, which may differ from the configuration methods by design).

---

## AI-agent angle

- **Hallucinated `dyn`-compatible AFIT.** A model will confidently write `trait Backend { async fn fetch(&self, ...) -> Result<Bytes>; }` and then, elsewhere, `Vec<Box<dyn Backend>>` — this compiles as separate statements in isolation but fails the moment the trait is actually used as `dyn`, with an error message models trained before wide RPITIT/AFIT adoption may not recognize or may "fix" by adding nonsensical bounds. Check: `cargo build` surfaces this immediately as "the trait ... is not dyn compatible" — treat any such diagnostic on a freshly-generated trait as "redesign with `#[async_trait]` or an enum," not "patch around it."
- **Pre-GAT / pre-RPITIT era knowledge leaking into 2026-targeted code.** Models sometimes propose `Box<dyn Iterator>`-returning workarounds or manual lifetime gymnastics for a case GATs (stable since 1.65) or RPITIT (stable since 1.75) now solve cleanly, or conversely invent syntax that never existed for a pre-stabilization proposal. Check: for any trait method returning a boxed trait object purely to dodge a "can't name this type" problem, ask whether `-> impl Trait` (RPITIT) on today's edition would remove the box — if yes, and dyn-compatibility isn't needed, prefer RPITIT.
- **Confident sealed-trait code with the wrong technique for the stated goal.** A model asked to "let downstream call methods but not implement the trait" will sometimes reach for supertrait sealing (which blocks nothing about method-calling but also doesn't distinguish — it's actually fine here) versus being asked to "prevent downstream from calling internal methods too" and using plain supertrait sealing (which doesn't block that). Check: re-derive from the capability matrix in §9 which technique the stated requirement actually needs, and confirm the generated code matches — don't trust the presence of *a* `Sealed`-shaped pattern as sufficient.
- **Deref-based fake inheritance.** When asked to "let `Wrapper` behave like `Inner`," a model frequently reaches for `impl Deref<Target = Inner> for Wrapper` instead of explicit forwarding methods or a trait. This compiles, looks clever, and violates C-DEREF. Check: `grep -rn 'impl.*Deref.*for'`; any hit should be justified as a genuine smart pointer, not a shortcut for method forwarding.
- **Trait-per-struct as a reflex.** Asked to "make this extensible," a model will often introduce a trait with a single impl "for future flexibility" even when no second implementor is named anywhere in the task. Check: after generation, grep for `impl <TraitName> for` across the diff — if it's exactly one hit and the task didn't name a second backend/strategy, ask whether the trait should be inlined into an inherent `impl` (rule 5 above).
- **Newtype without `parse`/validation, defeating its own purpose.** A model told to "add a `Digest` type" will sometimes produce `struct Digest(pub String);` with a `pub` inner field and a plain `Digest(s)` constructor call at every call site — technically a newtype, but with no invariant enforcement at all, so it buys type-distinction but not "parse, don't validate" safety. Check: for every newtype wrapping a `String`/primitive, confirm the field is private and the only construction path is a `parse`/`try_from`-style fallible constructor, not a public tuple-struct literal.

---

## Contested / evolving

- **`async fn` in traits vs `#[async_trait]`**: with AFIT stable since Rust 1.75, the ecosystem is still mid-migration away from `async-trait`'s boxed-future macro toward native `async fn in trait` for the static-dispatch case, while `async-trait` remains the correct choice whenever `dyn` is required — current guidance (per the stabilization announcement itself) is "use native AFIT for static dispatch, `trait_variant::make` or `async-trait` when you need `dyn` or `Send`-bound variants," and this is trending toward native AFIT becoming the default recommendation as tooling around `Send` bounds matures ([Rust Blog, Dec 2023](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/)).
- **How aggressively to seal internal traits**: the community is not fully agreed on whether every internal (non-published-crate) trait should be sealed by default — sealing has real ergonomic cost (extra module, extra trait bound) and some maintainers only seal traits that have actually shipped in a public API once, not preemptively.
- **`enum_dispatch` vs hand-written `match`**: the crate itself is a thin macro over a well-known manual pattern; some codebases prefer to hand-write the enum + `match` for transparency/debuggability over pulling in the `enum_dispatch` proc-macro dependency, trading a small amount of boilerplate for zero extra dependency surface — reasonable either way given "prefer fewer dependencies" is itself a live value in security-sensitive CLIs.
- **"Object safety" vs "dyn compatibility"**: the terminology change is recent (the lang-team issue debating it is from the 2020s and the Reference has since switched); expect both terms in the wild for years, with "dyn compatible/dyn compatibility" being the term to use going forward per the official Reference ([lang-team issue #286](https://github.com/rust-lang/lang-team/issues/286)).
- **Extension-trait vs inherent-impl-on-newtype for foreign-type ergonomics**: when wrapping a foreign type like `reqwest::Response`, there's genuine disagreement on whether to add an extension trait (`ResponseExt`) or to always wrap in a local newtype and add inherent methods — extension traits keep the foreign type's own API surface usable directly (no wrap/unwrap noise) but can't carry additional private state the way a newtype can; both are idiomatic depending on whether extra state is actually needed.

---

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [rust-lang.github.io/api-guidelines/checklist.html](https://rust-lang.github.io/api-guidelines/checklist.html) | Official Rust API Guidelines, checklist | Living doc, current (edition-2024 era) | Canonical enumeration of every C-* rule; primary source for §16 |
| [rust-lang.github.io/api-guidelines/type-safety.html](https://rust-lang.github.io/api-guidelines/type-safety.html) | Official Rust API Guidelines, type-safety page | Living doc, current | Primary source for newtype (C-NEWTYPE), builder (C-BUILDER), custom-type (C-CUSTOM-TYPE) |
| [rust-lang.github.io/api-guidelines/flexibility.html](https://rust-lang.github.io/api-guidelines/flexibility.html) | Official Rust API Guidelines, flexibility page | Living doc, current | Primary source for C-GENERIC, C-OBJECT (dyn-compatibility design) |
| [rust-lang.github.io/api-guidelines/future-proofing.html](https://rust-lang.github.io/api-guidelines/future-proofing.html) | Official Rust API Guidelines, future-proofing page | Living doc, current | Primary source for C-SEALED |
| [doc.rust-lang.org/book/ch18-03-oo-design-patterns.html](https://doc.rust-lang.org/book/ch18-03-oo-design-patterns.html) | The Rust Programming Language book, official | Current edition (2024) | Official worked example contrasting `dyn` state pattern vs type-encoded typestate |
| [doc.rust-lang.org/reference/items/implementations.html](https://doc.rust-lang.org/reference/items/implementations.html) | The Rust Reference, official | Current | Primary/normative source for the orphan rule |
| [doc.rust-lang.org/reference/items/traits.html](https://doc.rust-lang.org/reference/items/traits.html) | The Rust Reference, official | Current, reflects the "dyn compatibility" rename | Primary source confirming current terminology |
| [blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/) | Official Rust Blog, stabilization announcement | Dec 2023 (Rust 1.75) | Primary source for RPITIT/AFIT stabilization and dyn-incompatibility caveat |
| [rust-lang.github.io/rfcs/3425-return-position-impl-trait-in-traits.html](https://rust-lang.github.io/rfcs/3425-return-position-impl-trait-in-traits.html) | RFC, official rust-lang/rfcs | RFC merged pre-1.75 | Primary design-rationale source for RPITIT |
| [blog.rust-lang.org/2022/10/28/gats-stabilization.html](https://blog.rust-lang.org/2022/10/28/gats-stabilization.html) | Official Rust Blog, GATs stabilization | Oct 2022 (Rust 1.65) | Primary source for GATs stabilization date and use case |
| [blog.rust-lang.org/2015/05/11/traits/](https://blog.rust-lang.org/2015/05/11/traits/) | Official Rust Blog, "Abstraction without overhead: traits in Rust" | 2015, still cited as canonical | Primary source for zero-cost static/dynamic dispatch trade-off, still accurate |
| [rust-lang.github.io/rfcs/0445-extension-trait-conventions.html](https://rust-lang.github.io/rfcs/0445-extension-trait-conventions.html) | RFC, official rust-lang/rfcs | RFC-era, conventions still followed | Primary source for extension-trait naming/design convention |
| [github.com/rust-lang/lang-team/issues/286](https://github.com/rust-lang/lang-team/issues/286) | rust-lang GitHub issue, lang team | Recent (2020s rename proposal) | Primary source for the object-safety → dyn-compatibility rename |
| [predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/](https://predr.ag/blog/definitive-guide-to-sealed-traits-in-rust/) | Blog, Predrag Gruevski (known Rust-ecosystem contributor) | Current | Deepest available treatment of sealed-trait technique spectrum, cited above for its capability matrix |
| [cliffle.com/blog/rust-typestate/](https://cliffle.com/blog/rust-typestate/) | Blog, Cliff L. Biffle | Widely cited typestate reference | Clear worked example plus the move-semantics caveat |
| [docs.rust-embedded.org/book/static-guarantees/typestate-programming.html](https://docs.rust-embedded.org/book/static-guarantees/typestate-programming.html) | Official Embedded Rust Book | Current | Second primary-adjacent source on typestate, embedded-systems framing |
| [docs.rs/enum_dispatch/latest/enum_dispatch/](https://docs.rs/enum_dispatch/latest/enum_dispatch/) | Crate docs, official docs.rs | Current | Primary source for enum_dispatch's mechanism and performance claim |
| [github.com/BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) (and `crates/ignore/src/walk.rs`) | Real production repo source | Current | Exemplary codebase: workspace-split crates, non-consuming builder pattern in production |
| [github.com/seanmonstar/reqwest](https://github.com/seanmonstar/reqwest) (`src/blocking/client.rs`) + [docs.rs Client](https://docs.rs/reqwest/latest/reqwest/struct.Client.html) | Real production repo source + official docs | Current | Exemplary codebase: consuming builder → immutable, internally-`Arc`'d client shape directly applicable to a `RegistryClient` |

