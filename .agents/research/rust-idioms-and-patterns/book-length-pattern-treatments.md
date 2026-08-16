---
title: Book-Length Rust Pattern Treatments — Currency Audit and Extraction
topic: rust-idioms-and-patterns
agent: book-patterns
model: sonnet
date_researched: 2026-08
sources_count: 17
scope: >
  Deep source-level read of the primary target — "Design Patterns and Best
  Practices in Rust" (Evan Williams, Packt) — chapter by chapter, judged for
  2026 currency against its own stated MSRV (Rust 1.78) and its actual
  publication date (April 2026). Extracts normative rules not already covered
  by the community rust-unofficial/patterns book. Sweeps the other
  book-length Rust pattern/best-practice titles (Idiomatic Rust: Code Like a
  Rustacean, Code Like a Pro in Rust, Refactoring to Rust, Rust Web
  Development, Rust in Action, Mastering Rust 2nd ed) for era and relevance,
  and flags one title ("Hands-On Design Patterns with Rust") that does not
  exist despite being a plausible LLM hallucination. Closes with a GoF-vs-Rust
  translation table grounded in the primary target's own sample code. A full
  page-by-page sweep of the rust-unofficial/patterns catalogue (idioms,
  patterns, anti-patterns, functional) cross-references every entry against
  this repo's existing rust-quality rule families, surfacing six previously
  uncovered normative rules and two entries whose remediation has since been
  superseded by newer Cargo/ecosystem mechanisms.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The primary target: what it actually is](#1-the-primary-target-what-it-actually-is)
  2. [The book shipped nearly two years behind its own code](#2-the-book-shipped-nearly-two-years-behind-its-own-code)
  3. [The anti-pattern chapters are still correct, with one specific gap](#3-the-anti-pattern-chapters-are-still-correct-with-one-specific-gap)
  4. [The GoF-via-calculator chapters (ch5–ch8) are mostly sound, with two real implementation-fidelity bugs](#4-the-gof-via-calculator-chapters-ch5ch8-are-mostly-sound-with-two-real-implementation-fidelity-bugs)
  5. [The "samsa" project (ch9–ch12) is the strongest, most current material in the book](#5-the-samsa-project-ch9ch12-is-the-strongest-most-current-material-in-the-book)
  6. [The book is honest about its own simplifications](#6-the-book-is-honest-about-its-own-simplifications)
  7. ["Hands-On Design Patterns with Rust" does not exist](#7-hands-on-design-patterns-with-rust-does-not-exist)
  8. [The other book-length titles, assessed](#8-the-other-book-length-titles-assessed)
- [Currency verdict](#currency-verdict)
- [rust-unofficial catalogue sweep](#rust-unofficial-catalogue-sweep)
- [Classic patterns in Rust](#classic-patterns-in-rust)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

1. The primary target — *Design Patterns and Best Practices in Rust* by Evan Williams (Packt) — published **April 2026**, but its companion repo was created **June 2024** and every `Cargo.toml` in it still pins `edition = "2021"` against a stated MSRV of **Rust 1.78** (May 2024); by its own cover date the book had not adopted anything from the ~15 stable releases, Edition 2024, or GATs-adjacent stabilizations that shipped in between.
2. Its global-state anti-pattern chapter (ch4) illustrates the "bad" approach with the `lazy_static` crate and never mentions `std::sync::OnceLock` — stable since Rust 1.70.0, over a year before the book's own MSRV baseline — teaching half the lesson for the case where a genuine process-wide singleton is still warranted.
3. The book's own Visitor implementation (ch8/visitor.rs) defines a proper `accept()`/`visit()` double-dispatch interface, then bypasses it: every concrete visitor (`OptimizationVisitor`, `ValidationVisitor`) walks the tree with a chain of `downcast_ref::<ConcreteType>()` calls instead of calling `.accept()`, defeating the pattern's own purpose.
4. The book's own State pattern implementation (ch8/state.rs) defines `CalculatorState::handle_input` on every state and never calls it — `StateCalculator::process_input` dispatches through a hand-written string match to three free functions that duplicate the same logic instead, leaving the trait method as dead code across the whole crate.
5. Chapters 9–12 (the "samsa" pub/sub broker project) are the book's strongest, most current material: a sealed-trait message schema (ch10), a textbook typestate consumer lifecycle via `PhantomData<State>` (ch10), RPITIT-returning iterator-chain combinators (ch11, a feature stable only since Rust 1.75), and RAII resource guards with `Drop`-based cascading cleanup (ch12).
6. The book is explicit and correct where it matters most: its `Monad` trait impl for `Result` (ch11/type_classes.rs) carries a doc comment warning it panics on `Err` and that production code should use `?`, `and_then`, or `map` instead — the book itself argues against imitating its own demo code here.
7. "Hands-On Design Patterns with Rust" — a title an LLM is likely to produce by pattern-completing Packt's real "Hands-On Design Patterns with {C++, Java, Kotlin, C#, Julia, Delphi}" series — does not exist under any ISBN or GitHub repo found.
8. *Idiomatic Rust: Code Like a Rustacean* (Brenden Matthews, Manning, Aug 2024) is the closest living competitor to the primary target and is worth citing directly for builder/procedural-macro/immutable-data-structure content.
9. *Refactoring to Rust* (Lily Mara & Joel Holmes, Manning, June 2025) is the newest title surveyed but is not a patterns book — it is about embedding Rust incrementally into C/Python/JS codebases via FFI/PyO3/WASM, and adds nothing to a GoF-style catalogue.
10. *Rust Web Development* (Bastian Gruber, Manning, Dec 2022) is framework-dated: it is built around `warp`, which by 2026 has been overtaken by `axum` as the default recommendation in most current Rust ecosystem guidance; its general async/error/testing content still holds, its framework choice does not.
11. *Mastering Rust, 2nd Edition* (Rahul Sharma & Vesa Kaihlavirta, Packt, 2019) explicitly targets the Rust 2018 edition and predates async/await's mainstream adoption; it adds nothing current and should not be cited.
12. *Rust in Action* (Tim McNamara, Manning, 2021) is a systems-programming primer, not a patterns book; it is fine on its own terms but out of scope for a GoF-style corpus.
13. Rust replaces or actively discourages several GoF patterns outright: Iterator is a trait you implement, not a pattern you hand-roll; Prototype is `#[derive(Clone)]`; Singleton is discouraged in favor of explicit state or, when truly needed, `OnceLock`/`LazyLock`; Visitor is usually better replaced by an enum + exhaustive `match` when the variant set is closed (which it almost always is within one crate).
14. The most valuable pattern in the primary target that the community `rust-unofficial/patterns` book does not treat with comparable depth is the typestate pattern's full state-machine lifecycle (connect → subscribe → pause/resume → disconnect) — the community book's typestate coverage is a short sketch by comparison.
15. RPITIT (return-position `impl Trait` in trait method signatures, stable since Rust 1.75, Dec 2023) appears correctly and idiomatically in the primary target's functional-patterns chapter; this is a genuinely 2024-era-current technique that most books published before 2024 could not have shown at all.
16. Sealed traits, as implemented in the primary target (a private `Sealed` supertrait in a non-`pub` module), match the idiomatic pattern already documented by the community book and the Rust API Guidelines — no delta there, but the primary target's version is a clean, directly citable worked example.
17. None of the primary target's dependencies are stale: `thiserror = "2.0"` throughout, no `anyhow`, no `failure`, no `error-chain`, no `lazy_static` outside the one anti-pattern strawman file.
18. An agent grading "is this book still correct" purely from its cover date (2026) would over-trust it; grading purely from its MSRV (1.78 / mid-2024) would under-trust it. The correct read is: current for Rust-1.78-era idioms, silent on everything that shipped in the ~20 months between writing and print.

## Findings

### 1. The primary target: what it actually is

*Design Patterns and Best Practices in Rust: Enhance your Rust skills by applying idiomatic approaches to real-world software design*, by **Evan Williams**, published by **Packt Publishing**. Bookseller listings give a publication date of **April 28, 2026** and **448 pages** (ISBN-13 `978-1836209478`); these two figures come from a single retailer search snippet and were not independently cross-confirmed against a second primary source (Packt's own product page and Amazon's detail page both returned HTTP 403 to automated fetches), so treat the page count and exact day as indicative rather than certain. The ISBN and full title/subtitle *are* independently confirmed via Amazon's page metadata. ([Amazon listing](https://www.amazon.com/Design-Patterns-Best-Practices-Rust/dp/1836209479), [Packt listing](https://www.packtpub.com/en-us/product/design-patterns-and-best-practices-in-rust-9781836209461))

The companion code repository is independently and directly verifiable: created **2024-06-12**, MIT-licensed, 13 chapter directories, requiring **Rust 1.78.0+** and Cargo, `edition = "2021"` in every `Cargo.toml`. ([repo](https://github.com/PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust), [README](https://github.com/PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust/blob/main/README.md))

Full chapter list (from the README, confirmed against the actual directory contents):

| Ch | Title | What's in the repo |
|---|---|---|
| 1 | Why is Rust Different? | `bad_calculator`, `block_finder.rs` |
| 2 | Anti-Pattern: Designing for Object Orientation | `bad_calculator`, `worse_calculator`, `not_so_bad_calculator`, `pets` |
| 3 | Anti-Pattern: Using Clone & `Rc<RefCell>` Everywhere | `bad-calculator` (ownership/cloning/Rc examples) |
| 4 | Don't Fight the Borrow Checker | `bad-calculator` (borrow-fighting, global-state, unsafe examples) |
| 5 | Creational Patterns: Making Things | `correct-calculator` (builder, factory) |
| 6 | Structural Patterns: Connecting & Aggregating | adds adapter, bridge, decorator, facade |
| 7 | Behavioural Patterns 1: Taking Action | adds chain, command, mediator, strategy, template |
| 8 | Behavioural Patterns 2: Keeping Track | adds iterator, memento, observer, state, visitor |
| 9 | Architectural Patterns | `samsa` pub/sub broker project begins |
| 10 | Patterns that Leverage the Type System | adds sealed traits, typestate |
| 11 | Patterns from Functional Programming | adds closures, pattern matching, pipelines, type classes |
| 12 | Patterns that Use Unique Rust Features | adds service lifecycle, RAII resource guards |
| 13 | Leaning into Rust | no source files in the repo (prose-only) |

The "Correct Calculator" (ch5–ch8) and "samsa" (ch9–ch12) are each single running projects that accrete one pattern-file per chapter — a genuinely useful structure for judging whether the *later* chapters' additions still compile cleanly against the *earlier* chapters' foundations, which they do.

### 2. The book shipped nearly two years behind its own code

This is the single most load-bearing currency fact and it is directly verifiable rather than inferred. The repo's first commit and its `Cargo.toml` MSRV both point to **mid-2024** as when the code was written. `std::sync::OnceLock` stabilized in **Rust 1.70.0** (June 2023) and `std::sync::LazyLock` in **Rust 1.80.0** (July 2024) — confirmed directly from the `#[stable(feature = ..., since = "1.70.0")]` / `"1.80.0"` attributes in the local rustc 1.93 toolchain's std source (`sync/once_lock.rs`, `sync/lazy_lock.rs`). Edition 2024 stabilized with Rust 1.85 (Feb 2025). At an **April 2026** cover date, the book is current for everything stable through roughly mid-2024 and silent on everything since, including Edition 2024 itself — every `Cargo.toml` in the repo still declares `edition = "2021"`. This is not "the book is wrong" so much as "the book never caught up to its own publication date"; an agent should treat its Rust-1.78-era idioms as reliable and treat its silence on anything newer as absence of evidence, not evidence of staleness in the newer feature.

### 3. The anti-pattern chapters are still correct, with one specific gap

Read in full: `ch2/pets/src/main.rs`, `ch3/bad-calculator/src/rc_and_refcell.rs`, `ch4/bad-calculator/src/{fighting_borrow_checker,global_state,unsafe_example}.rs`.

- Ch2's `pets` example is a clean, still-valid illustration of the OOP-via-generics anti-pattern: `struct Pet<T: Animal> { name: String, animal: T }` cannot form a heterogeneous `Vec` (`Pet<Dog>` and `Pet<Cat>` are different monomorphized types), and the file's final line — `let pets: Vec<Pet<_>> = vec![dog_pet, cat_pet];` — will not compile as written. The lesson (reach for `Box<dyn Animal>` for a heterogeneous collection, not a shared generic parameter) is timeless and correctly demonstrated by the failure itself.
- Ch3's `rc_and_refcell.rs` correctly frames `Rc<RefCell<T>>` as a smell to route around via clearer ownership first, and correctly reserves `Arc<Mutex<T>>` for the case where concurrency is *actually* needed (its own `ThreadSafeCalculator`). No currency issues.
- Ch4's `fighting_borrow_checker.rs` and `unsafe_example.rs` are solid, version-independent ownership/aliasing teaching (a raw-pointer cache invalidated by `Vec` reallocation, fixed by switching to stable indices). No currency issues.
- Ch4's `global_state.rs` is the one gap: it demonstrates the "BAD APPROACH" using `lazy_static! { static ref VARIABLES: Mutex<HashMap<...>> = ...; }` (with `lazy_static = "1.4.0"` as an actual `Cargo.toml` dependency) and then fixes it by **encapsulating state in a struct** — genuinely good advice — but never mentions that the *specific* strawman it chose (`lazy_static!`) has had a zero-dependency, in-std replacement (`OnceLock`, later `LazyLock`) since before the book's own MSRV. A reader who has a legitimate need for a process-wide global (a metrics registry, a config singleton read from `main`) comes away only knowing "avoid globals," not "if you must, use `OnceLock`, not a crate."

### 4. The GoF-via-calculator chapters (ch5–ch8) are mostly sound, with two real implementation-fidelity bugs

Read in full: `ch5/{builder,factory}.rs`, `ch6/{decorator,facade}.rs`, `ch8/{visitor,iterator,observer,state}.rs`.

- **Builder** (ch5): a consuming builder (`fn number(mut self, ...) -> Self`) with a fallible terminal `build() -> Result<Expression, String>` — textbook-idiomatic Rust builder, arguably a cleaner fit than GoF's original OO shape because ownership prevents reuse of a half-built object.
- **Abstract Factory** (ch5): a `TokenFactory` trait with associated types (`type Number: NumberToken; type Operator: OperatorToken;`) producing a `StandardFactory` and a `ScientificFactory` — correct, idiomatic use of associated types to avoid boxing the products.
- **Decorator** (ch6): `Box<dyn Expression>` wrapping `Box<dyn Expression>` (logging, timing, caching-via-`RefCell`, range-validating layers) — correct pattern-fidelity. Every decorator hand-forwards `to_string()`/`precedence()` verbatim because Rust has no implicit inheritance; this boilerplate tax is real and worth naming as a rule (see Normative guidance #6).
- **Facade** (ch6): a `CalculatorFacade` wrapping parser/variables/scientific-ops/history behind a simplified `evaluate()` — nothing pattern-fidelity-relevant to flag, straightforward and correct.
- **Iterator** (ch8): `HistoryIterator`, `ReverseHistoryIterator`, `VariablesIterator` all correctly implement `std::iter::Iterator` (not a hand-rolled `next()`-only interface) — this is the one GoF pattern the language subsumes entirely, and the book gets the subsumption right rather than reinventing the interface.
- **Observer** (ch8): `Vec`-of-`Box<dyn Observer>` (actually a `HashMap<usize, Box<dyn Observer>>` for detachability) with `Send + Sync` bounds and `Arc<Mutex<dyn Display>>` for the display observer — correct, thread-safe, idiomatic for a synchronous observer list; doesn't reach for channel-based observers (`tokio::sync::broadcast`/`watch`), which is a legitimate scope choice for a synchronous calculator, not an error.
- **State** (ch8) — **flawed as shipped**: `CalculatorState::handle_input(&self, input: &str, calculator: &mut StateCalculator) -> ...` is defined on the trait and implemented in full on `StandardMode`, `ScientificMode`, and `ProgrammerMode`. But `StateCalculator::process_input` never calls `self.state.handle_input(...)`; instead it matches on `self.state.name()` as a string and dispatches to three **free functions** (`match_standard_input`, `match_scientific_input`, `match_programmer_input`) that **re-implement the same logic**. Grepping the whole chapter's source for call sites of `handle_input` outside its own trait/impl definitions returns zero hits — the trait method is dead code, and the pattern's actual runtime behavior comes entirely from stringly-typed matching plus duplicated logic. This reads as an unresolved self-borrow conflict (`&mut self.state` while also needing `&mut self` for the callback) that the author routed around rather than solved, then never cleaned up the now-inert trait scaffolding.
- **Visitor** (ch8) — **flawed as shipped**: `Visitable::accept(&self, visitor: &mut dyn ExpressionVisitor)` is defined correctly and every expression type implements it to call the matching `visit_*` method — proper double dispatch, on paper. But `OptimizationVisitor::optimize()` and `ValidationVisitor::validate()`, the only two call sites that actually drive traversal, never call `.accept()`. They instead chain `expr.as_any().downcast_ref::<NumberExpression>()` / `downcast_ref::<VariableExpression>()` / `downcast_ref::<BinaryOperation>()` / `downcast_ref::<FunctionCall>()` by hand. This defeats the entire point of the Visitor pattern: adding a fifth expression variant now requires updating both the `accept()` impls *and* every downcast chain, instead of touching only the accept() impl the pattern is supposed to isolate the change to.

### 5. The "samsa" project (ch9–ch12) is the strongest, most current material in the book

Read in full: `ch12/{error,service,resources}.rs`, `ch10/{sealed,typestate_consumer}.rs`, `ch11/{type_classes,pipeline,closures,pattern_matching}.rs`.

- **Error handling** (ch9 onward): one unified `SamsaError` enum via `thiserror = "2.0"` with a `type Result<T> = std::result::Result<T, SamsaError>` alias and ergonomic constructor methods (`SamsaError::config(...)`, `.resource(...)`, etc.) — current, idiomatic, no `anyhow`/`failure`/`error-chain` anywhere in the whole crate.
- **Sealed trait** (ch10/sealed.rs): the textbook shape — `mod private { pub trait Sealed {} }` (not `pub` itself) and `pub trait MessageSchema: private::Sealed { ... }`, with `JsonSchema`/`TextSchema` as the only crate-internal implementors. Matches the community `rust-unofficial/patterns` and Rust API Guidelines treatment exactly; no delta, but a clean citable instance.
- **Typestate** (ch10/typestate_consumer.rs): `Consumer<State>` parameterized by zero-sized marker types (`states::{Disconnected,Connected,Subscribed,Paused}`) via `PhantomData<State>`, with `connect`/`subscribe`/`pause`/`resume`/`unsubscribe`/`disconnect` each consuming `self` and returning `Consumer<NextState>`. A method like `receive()` exists **only** on `Consumer<states::Subscribed>` — calling it on a `Consumer<states::Disconnected>` is a compile error, not a runtime check. This is the single deepest, most fully-worked typestate example found across the surveyed corpus; the community patterns book's typestate coverage is comparatively a sketch.
- **RPITIT in a pipeline trait** (ch11/pipeline.rs): `trait SubscriptionProcessing: Iterator<Item = SubscriptionEvent> + Sized { fn valid_subscriptions(self) -> impl Iterator<Item = SubscriptionEvent> { ... } }` — returning `impl Trait` from a method defined *inside a trait* requires RPITIT, stable only since **Rust 1.75** (Dec 2023). This is genuinely a technique most pre-2024 Rust books physically could not show, and the book uses it correctly (blanket `impl<I> SubscriptionProcessing for I where I: Iterator<Item = SubscriptionEvent> {}` to make it apply to any matching iterator).
- **Type classes via GATs** (ch11/type_classes.rs): `Functor` with `type Output<B>;` (a generic associated type) implemented for `Option<T>`; `Foldable`/`Filterable` implemented for `Vec<T>` mostly by delegating to `Iterator::fold`/`filter`. Correct and current (GATs stable since Rust 1.65, Oct 2022).
- **RAII resource guards** (ch12/resources.rs): a `ConnectionPool` whose `acquire()` returns a `ConnectionGuard` implementing `Drop` to auto-return the connection to the pool; a `TransactionGuard<'a, T>` that rolls back via a stored closure unless `commit()` was called first; a `TimedLockGuard` implementing `Deref`/`DerefMut` over a `MutexGuard`. All three are correct, idiomatic RAII. The one caveat: `TimedLockGuard::try_acquire` busy-polls `mutex.try_lock()` in a loop with `thread::sleep(1ms)` rather than using a condvar or a lock type with native timeout support — a reasonable simplification for a teaching example, not something to imitate in production code (see Contested/evolving).
- **Service lifecycle** (ch12/service.rs): `Drop for ServiceManager` performing cascading shutdown, block-expression-based conditional initialization — correct, idiomatic, no issues.

### 6. The book is honest about its own simplifications

The `Monad for Result<T, E>` implementation in ch11/type_classes.rs carries this doc comment verbatim: *"**Warning:** This implementation panics when `bind()` is called on an `Err` value. This is a simplified demonstration of the monad pattern. In production code, use Rust's built-in `?` operator, `and_then()`, or `map()` instead."* This is exactly right, and exactly the kind of self-aware caveat that keeps a teaching example from being copy-pasted into production — worth citing as a model for how a pattern-catalogue book should handle FP-derived patterns that Rust's own control-flow sugar already supersedes.

### 7. "Hands-On Design Patterns with Rust" does not exist

Packt has published *Hands-On Design Patterns with* C++, Java, Kotlin, C# and .NET Core, and Julia (plus a second C++ edition) — a real, recognizable naming pattern. ([C++](https://github.com/PacktPublishing/Hands-On-Design-Patterns-with-CPP), [Java](https://github.com/PacktPublishing/Hands-On-Design-Patterns-with-Java), [Kotlin](https://github.com/PacktPublishing/Hands-on-Design-Patterns-with-Kotlin), [C#/.NET](https://github.com/PacktPublishing/Hands-On-Design-Patterns-with-C-and-.NET-Core), [Julia](https://github.com/PacktPublishing/Hands-on-Design-Patterns-and-Best-Practices-with-Julia)). A GitHub org search for `PacktPublishing` + "design patterns" + Rust returns exactly one hit — the primary target of this document, whose actual title does not follow the "Hands-On" naming convention at all. No repo, ISBN, or listing for a Rust entry in that specific series exists. This is exactly the shape of title an LLM would confidently produce by analogy and should be treated as a naming hallucination if it surfaces in any future output (see AI-agent angle).

### 8. The other book-length titles, assessed

| Title | Author(s) | Publisher / era | Verdict |
|---|---|---|---|
| [Idiomatic Rust: Code Like a Rustacean](https://www.manning.com/books/rust-advanced-techniques) | Brenden Matthews | Manning, Aug 2024 | Worth citing directly. Covers generics/traits, global state management, builder + proc macros, const generics, extension traits, blanket impls, immutable data structures — genuinely overlaps and extends this book's ch5/ch10/ch12 territory from a different angle. Repo: [idiomatic-rust-book](https://github.com/brndnmtthws/idiomatic-rust-book). |
| [Code Like a Pro in Rust](https://www.manning.com/books/code-like-a-pro-in-rust) | Brenden Matthews | Manning, Feb 2024 | Best-practices book, not pattern-catalogue-shaped: tooling, memory management, API design, testing, async, optimization, project management. Complementary rather than overlapping; worth citing for the practices angle, not for patterns. Repo: [code-like-a-pro-in-rust-book](https://github.com/brndnmtthws/code-like-a-pro-in-rust-book). |
| [Refactoring to Rust](https://www.manning.com/books/refactoring-to-rust) | Lily Mara, Joel Holmes | Manning, June 2025 | Newest title surveyed. Not a patterns book — it's about incrementally adding Rust to existing C/Python/JS systems via FFI, `bindgen`, PyO3, and WASM/WASI. Adds nothing to a GoF-style catalogue; cite only if the corpus ever covers incremental-adoption strategy. Repo: [refactoring-to-rust](https://github.com/lily-mara/refactoring-to-rust). |
| [Rust Web Development](https://www.manning.com/books/rust-web-development) | Bastian Gruber | Manning, Dec 2022 | Framework-dated: built entirely around `warp` + `tokio` + `reqwest`; by 2026 `axum` is the more commonly recommended default in current ecosystem guidance. General async/error-handling/testing/tracing content still holds; the framework-specific code does not transfer directly. Repo: [Rust-Web-Development/code](https://github.com/Rust-Web-Development/code). |
| [Rust in Action](https://www.manning.com/books/rust-in-action) | Tim McNamara | Manning, 2021 | Systems-programming primer (file formats, CPUs, geo-spatial data, embedded), not a patterns book. Out of scope for a GoF-style corpus; adds nothing here. Repo: [rust-in-action/code](https://github.com/rust-in-action/code). |
| [Mastering Rust, 2nd Edition](https://github.com/PacktPublishing/Mastering-RUST-Second-Edition) | Rahul Sharma, Vesa Kaihlavirta | Packt, 2019 | Explicitly targets the **Rust 2018 edition**; predates async/await's mainstream adoption. Actively dated — do not cite for anything beyond historical interest. |
| Rust Atomics and Locks | Mara Bos | O'Reilly, 2023 | Already covered elsewhere in this corpus per the assigning task; not re-audited here. |

## Currency verdict

| Chapter | Topic | Verdict | Why |
|---|---|---|---|
| 1 | Why is Rust Different? | Still correct | Intro-only, no version-sensitive content. |
| 2 | Anti-Pattern: OOP via generics | Still correct | `Pet<T: Animal>` heterogeneous-collection failure is timeless. |
| 3 | Anti-Pattern: Clone & `Rc<RefCell>` | Still correct | Ownership-first framing holds; correctly reserves `Arc<Mutex>` for real concurrency needs. |
| 4 | Don't Fight the Borrow Checker | Partially superseded | Raw-pointer/index sections are timeless; the global-state section's `lazy_static` strawman never mentions `OnceLock` (stable a year before the book's own MSRV) as the modern fix. |
| 5 | Creational Patterns | Still correct | Builder and Abstract-Factory-via-associated-types are idiomatic and current. |
| 6 | Structural Patterns | Still correct | Decorator/Facade correctly translated; decorator forwarding boilerplate is a real Rust tax, not an error. |
| 7 | Behavioural Patterns 1 | Not independently line-verified | Chain/Command/Mediator/Strategy/Template files exist and are structurally consistent with the verified ch8 material, but were not read in full for this audit. |
| 8 | Behavioural Patterns 2 | Mixed — two real bugs | Iterator and Observer are correct and idiomatic. **State's trait dispatch is dead code** (never called; logic duplicated via string matching instead). **Visitor's double dispatch is bypassed** by manual `downcast_ref` chains in both concrete visitors. Neither bug is a currency/era issue — both would have been wrong in 2018 Rust too. |
| 9 | Architectural Patterns | Still correct | `thiserror = "2.0"`-based unified error type, clean module split. |
| 10 | Type-System Patterns | Still correct, exemplary | Sealed trait and typestate are both textbook-correct and more deeply worked than the community patterns book's equivalents. |
| 11 | Functional Programming Patterns | Still correct, genuinely current | RPITIT (stable since 1.75) and GATs (stable since 1.65) used correctly; `Monad` impl is explicitly flagged as a non-production simplification. |
| 12 | Unique Rust Features | Still correct | RAII guards, `Drop`-based cascading cleanup all correct; `TimedLockGuard`'s spin-poll is a fine-for-teaching, not-for-production simplification. |
| 13 | Leaning into Rust | Not verifiable | No source files in the repo; appears to be prose-only. |

**One-sentence verdict:** the book is current for Rust-1.78-era (mid-2024) idioms and gets nearly everything right at that baseline — including two genuinely 2024-fresh techniques (RPITIT, deep typestate) most prior books couldn't show — but it shipped in April 2026 without catching up to anything newer, and it has two implementation-fidelity bugs in its own reference code (State's dead trait dispatch, Visitor's downcast-based non-double-dispatch) that are code-quality problems, not era problems, and are exactly the kind of thing a reader — or an LLM trained on this repo — could copy uncritically.

## rust-unofficial catalogue sweep

Full enumeration of every page in [rust-unofficial/patterns](https://rust-unofficial.github.io/patterns/), fetched from the book's own `SUMMARY.md` rather than worked from memory, cross-checked page-by-page against this repository's existing Rust rule families (`rules/rust-quality.md` and its `rules/rust-quality/*.md` depth files, plus `rules/rust-cli-contract.md` and `rules/rust-cargo.md`). "Already reflected" means the guidance genuinely appears in one of those files, not merely that the topic is adjacent. Index/intro pages carry no independent content and are marked accordingly.

**Idioms**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [idioms/index](https://rust-unofficial.github.io/patterns/idioms/index.html) | Navigational index | N/A | N/A | N/A |
| [Use borrowed types for arguments](https://rust-unofficial.github.io/patterns/idioms/coercion-arguments.html) | Prefer `&str`/`&[T]`/`&T` over `&String`/`&Vec<T>`/`&Box<T>` in parameters | Yes | No | Yes — Normative guidance #17 |
| [Concatenating strings with format!](https://rust-unofficial.github.io/patterns/idioms/concat-format.html) | `format!` is readable but not the fastest way to build a string | Yes | No | Minor — too basic to formalize |
| [Constructor](https://rust-unofficial.github.io/patterns/idioms/ctor.html) | `fn new() -> Self` is the constructor convention; pair with `Default` | Yes | Partial (assumed baseline) | No — too foundational to need a rule |
| [The Default Trait](https://rust-unofficial.github.io/patterns/idioms/default.html) | `#[derive(Default)]`, one `Default` impl per type, useful for generic code | Yes | Yes | Our API-08 is a stricter refinement (requires a doc comment naming the runnable state) |
| [Collections Are Smart Pointers](https://rust-unofficial.github.io/patterns/idioms/deref.html) | `Deref` is legitimate for a collection's owned-vs-borrowed view (`Vec`→`[T]`) | Yes | Yes | Consistent with our ARCH-06 ("real smart pointer owning exactly one inner value") |
| [Finalisation in Destructors](https://rust-unofficial.github.io/patterns/idioms/dtor-finally.html) | `Drop` substitutes for `finally`; doesn't run on abort/infinite-loop/double-panic | Yes | Yes (cited already) | Our STATE-7/11–15 and ERR-23 go substantially deeper |
| [mem::{take(_), replace(_)}](https://rust-unofficial.github.io/patterns/idioms/mem-replace.html) | Swap a value out of a `&mut` enum/struct field without cloning | Yes | **No** | **Yes — Normative guidance #13** |
| [On-Stack Dynamic Dispatch](https://rust-unofficial.github.io/patterns/idioms/on-stack-dyn-dispatch.html) | Since Rust 1.79, temporary-lifetime extension lets `&mut dyn Trait` bind directly in an `if`/`else`, no more two-`let` deferred-init dance | Yes — and the page itself documents the 1.79 currency change | No | Minor — narrow situation, not rule-worthy at MUST/SHOULD |
| [idioms/ffi/intro](https://rust-unofficial.github.io/patterns/idioms/ffi/intro.html) | Navigational index for the three FFI idiom pages | N/A | N/A | N/A |
| [Idiomatic Errors (FFI)](https://rust-unofficial.github.io/patterns/idioms/ffi/errors.html) | Convert Rust error enums to C integer codes / transparent `#[repr(C)]` structs | Yes | **No** | See note below — real content, but out of scope for this corpus |
| [Accepting Strings (FFI)](https://rust-unofficial.github.io/patterns/idioms/ffi/accepting-strings.html) | Borrow foreign strings via `CStr`, don't copy; minimize `unsafe` surface | Yes | **No** | See note below |
| [Passing Strings (FFI)](https://rust-unofficial.github.io/patterns/idioms/ffi/passing-strings.html) | Maximize `CString` lifetime; don't let the pointer creation truncate it early | Yes | **No** | See note below |
| [Iterating over an Option](https://rust-unofficial.github.io/patterns/idioms/option-iter.html) | `Option` implements `IntoIterator`; use with `.extend()`/`.chain()` | Yes | No | Minor — well-known, low rule value |
| [Pass Variables to Closure](https://rust-unofficial.github.io/patterns/idioms/pass-var-to-closure.html) | Rebind clone/borrow in a scope block right before a `move` closure | Yes | No | Minor — stylistic, not rule-worthy |
| [Privacy For Extensibility](https://rust-unofficial.github.io/patterns/idioms/priv-extend.html) | `#[non_exhaustive]` or a private field to keep a type extensible without a major bump | Yes | Yes | Our API-15/ERR-02/DATA-FMT-06 are more domain-specific (wire/error/config types named explicitly) |
| [Easy doc initialization](https://rust-unofficial.github.io/patterns/idioms/rustdoc-init.html) | Wrap a complex-to-construct type in a helper function inside a doctest instead of repeating setup | Yes | **No** | **Yes — Normative guidance #18** |
| [Temporary mutability](https://rust-unofficial.github.io/patterns/idioms/temporary-mutability.html) | Rebind `let mut x` to `let x` after prep work, to make later immutability explicit | Yes | No | Minor — stylistic, not rule-worthy |
| [Return consumed argument on error](https://rust-unofficial.github.io/patterns/idioms/return-consumed-arg-on-error.html) | A fallible function that takes ownership should hand the argument back inside its `Err` | Yes | **No** | **Yes — Normative guidance #14**, directly relevant to this corpus's PKG-16 retry policy |

**Design Patterns — Behavioural**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [behavioural/intro](https://rust-unofficial.github.io/patterns/patterns/behavioural/intro.html) | Navigational index | N/A | N/A | N/A |
| [Command](https://rust-unofficial.github.io/patterns/patterns/behavioural/command.html) | Encapsulate actions as trait objects, function pointers, or `Fn` trait objects for undo/redo | Yes | Partial | Covered by our ARCH-09 dispatch ladder and the primary-target GoF table above; no dedicated rule needed |
| [Interpreter](https://rust-unofficial.github.io/patterns/patterns/behavioural/interpreter.html) | Recursive-descent parser, or `macro_rules!` as a mini-DSL | Yes | No | Out of scope — no DSL/parser domain need in this corpus |
| [Newtype](https://rust-unofficial.github.io/patterns/patterns/behavioural/newtype.html) | Tuple struct with one field, for type safety and encapsulation | Yes | Yes | Our ARCH-04/API-10 are stricter (mandate a private field and fallible `TryFrom` constructor for invariant-bearing cases; the community page treats `From` as the default) |
| [RAII Guards](https://rust-unofficial.github.io/patterns/patterns/behavioural/RAII.html) | Resource-acquisition-is-initialization via a guard object and `Drop` | Yes | Yes (cited already) | Our STATE-1 through STATE-17 in platform-and-filesystem.md go far deeper (poisoning, panics-in-Drop, `process::exit` interaction) |
| [Strategy (aka Policy)](https://rust-unofficial.github.io/patterns/patterns/behavioural/strategy.html) | Swap algorithm implementations via a trait or a plain closure | Yes | Partial | Philosophically present (closures-over-formal-traits, PKG-16's "one policy value") but not directly ID'd |
| [Visitor](https://rust-unofficial.github.io/patterns/patterns/behavioural/visitor.html) | Double dispatch (`accept`/`visit`) over heterogeneous data; the page itself notes an enum+iterator-like approach suffices for homogeneous data | Yes | Partial | Covered in this document's "Classic patterns in Rust" table above (row: Visitor), grounded in the primary target's own downcast-based misimplementation |

**Design Patterns — Creational**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [creational/intro](https://rust-unofficial.github.io/patterns/patterns/creational/intro.html) | Navigational index | N/A | N/A | N/A |
| [Builder](https://rust-unofficial.github.io/patterns/patterns/creational/builder.html) | Construct via a helper builder type, consuming or `&mut self` style | Yes | Partial | Pattern itself not ID'd, though API-08's "or a builder in the same impl" references it; already covered in this document's Findings §4 |
| [Fold](https://rust-unofficial.github.io/patterns/patterns/creational/fold.html) | Map a data structure to a new one node-by-node via a `Folder` trait with default methods | Yes | No | Out of scope — no AST/tree-transformation domain need |

**Design Patterns — Structural**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [structural/intro](https://rust-unofficial.github.io/patterns/patterns/structural/intro.html) | Navigational index | N/A | N/A | N/A |
| [Compose Structs](https://rust-unofficial.github.io/patterns/patterns/structural/compose-structs.html) | Decompose an over-large struct into smaller structs so fields borrow independently | Yes | **No** | **Yes — Normative guidance #15**, complements ARCH-01/03 (opposite direction: splitting, not consolidating) |
| [Prefer Small Crates](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html) | Small, single-purpose crates are easier to understand and reuse | Partially superseded — see note below | Yes (cited already) | Our ARCH-19/20 are the current, more conditional successor |
| [Contain unsafety in small modules](https://rust-unofficial.github.io/patterns/patterns/structural/unsafe-mods.html) | Wrap `unsafe` in the smallest module that can uphold its invariants, expose a safe outer API | Yes | Yes | Matches SEC-01/SEC-02 (forbid-with-named-exemptions, SAFETY comments) |
| [Avoid complex type bounds with custom traits](https://rust-unofficial.github.io/patterns/patterns/structural/trait-for-bounds.html) | Introduce a small trait (with a blanket impl) to replace a repeated, unwieldy `Fn`-bound | Yes | **No** | **Yes — Normative guidance #16** |

**Design Patterns — FFI**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [ffi/intro](https://rust-unofficial.github.io/patterns/patterns/ffi/intro.html) | Navigational index | N/A | N/A | N/A |
| [Object-Based APIs](https://rust-unofficial.github.io/patterns/patterns/ffi/export.html) | Export opaque owned types + transparent user-owned data types across an FFI boundary | Yes | **No** | See note below — real content, out of scope (this corpus consumes FFI, doesn't export a C API) |
| [Type Consolidation into Wrappers](https://rust-unofficial.github.io/patterns/patterns/ffi/wrappers.html) | Fold multiple related exported types into one wrapper to minimize unsafe surface | Yes | **No** | Same note |

**Anti-patterns**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [anti_patterns/index](https://rust-unofficial.github.io/patterns/anti_patterns/index.html) | Defines "anti-pattern"; navigational | N/A | N/A | N/A |
| [Clone to satisfy the borrow checker](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html) | Don't `.clone()` reflexively to silence the borrow checker | Yes | Yes (cited already) | Our STATE-24 is a stricter, mechanized version ("if I mutate the clone, should the original see it?") |
| [`#[deny(warnings)]`](https://rust-unofficial.github.io/patterns/anti_patterns/deny-warnings.html) | Don't blanket-deny all warnings at the crate root; name lints explicitly or use `RUSTFLAGS` | **Partially superseded — see note below** | Yes | Our LINT-01/02/03 are the modern successor via a Cargo mechanism this page predates |
| [Deref Polymorphism](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html) | Don't misuse `Deref` to fake struct inheritance | Yes | Yes (cited already) | Our ARCH-06/IDIOM-10 match exactly; page's ~2015-era prediction of a future inheritance mechanism landing in stable Rust never happened (minor, noted below) |

**Functional Programming**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [functional/index](https://rust-unofficial.github.io/patterns/functional/index.html) | Navigational index | N/A | N/A | N/A |
| [Programming paradigms](https://rust-unofficial.github.io/patterns/functional/paradigms.html) | Imperative vs. declarative, illustrated via a hand-rolled loop vs. `Iterator::fold` | Yes | N/A | Conceptual/intro-level, not independently actionable |
| [Generics as Type Classes](https://rust-unofficial.github.io/patterns/functional/generics-type-classes.html) | A generic type parameter can statically split an API by protocol/mode (monomorphization as a compile-time guarantee) | Yes | Partial | Philosophically present in ARCH-09's dispatch ladder; the specific "split API via generic parameter" recipe connects directly to this document's typestate findings (§5) rather than needing a separate rule |
| [Functional Optics](https://rust-unofficial.github.io/patterns/functional/optics.html) | Explains Serde's `Deserializer`/`Visitor` API via Haskell-lens vocabulary (Iso, Poly Iso, Prism) | Yes (describes stable Serde API shapes) | No | Low priority — explanatory framework, not an actionable/checkable practice |

**Additional Resources**

| Page | What it says in one line | Still correct in 2026? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| [additional_resources/index](https://rust-unofficial.github.io/patterns/additional_resources/index.html) | Navigational index | N/A | N/A | N/A |
| [Design principles](https://rust-unofficial.github.io/patterns/additional_resources/design-principles.html) | Link-list of SOLID, DRY, KISS, Law of Demeter, Design by Contract, etc. | Yes (language-agnostic) | N/A | Not Rust-specific by design; no action needed |

**Now-bad-advice, specifically**

1. **`#[deny(warnings)]` — the page's own remediation is dated, not just the anti-pattern it names.** Its "safe to deny" lint list is explicitly pinned "as of rustc 1.48.0" (November 2020): `const_err` is no longer a lint under that name, and `private_in_public` was superseded by the split `private_interfaces`/`private_bounds` lints around Rust 1.74. More importantly, the page's "Alternatives" section — decouple build strictness from source, or name lints explicitly — predates the actual correct modern mechanism: Cargo's `[workspace.lints]` table, stabilized in Rust/Cargo **1.74 (November 2023)**, did not exist when this page was written. This repository's own LINT-01/02/03 rules are exactly that mechanism. An agent citing this page's specific lint list would be citing a five-plus-year-stale enumeration; the underlying "don't blanket-deny" principle is still correct, but the "how" has been fully superseded.
2. **Prefer Small Crates — one-sided relative to 2024–2026 consensus.** The page's "Advantages" list (easier to understand, encourages reuse, parallel compilation) is accurate but incomplete: it does not reflect the ecosystem's subsequent, well-documented reversal — tokio itself consolidated a finer crate split over time — which this repository's own ARCH-19/20 sources cite explicitly by name. Not wrong, but the "prefer" framing reads as dated next to the current "justify every crate split with a measured reason, default to fewer crates" consensus.
3. **Deref Polymorphism's forward-looking claim aged into "never happened."** The page speculates (citing two ~2015 blog posts) that Rust would "likely" gain an inheritance-like mechanism "some time" after the anti-pattern was written. Ten-plus years later, no such mechanism exists or is in active RFC motion. Minor — doesn't affect the page's core advice, but shouldn't be cited as "coming soon."

**FFI coverage gap, noted but not promoted to a rule.** The four FFI pages (`idioms/ffi/*`, `patterns/ffi/*`) are all still fully correct and none of their content is reflected anywhere in this repository's rule families — there is no FFI-focused rule file at all. This is a genuine structural gap in the corpus, not a currency problem: `security.md` SEC-01 explicitly carves out "named FFI/platform API" exemptions from `unsafe_code = "forbid"`, acknowledging FFI happens, but nothing tells an agent how to shape that exemption once it exists (opaque-handle export design, `CStr`/`CString` lifetime handling, error-code conversion). Not promoted to a normative rule here because this corpus's actual FFI surface is overwhelmingly *consuming* C APIs (Windows syscalls, libc) rather than *exporting* one — the two FFI `patterns/` pages specifically address exporting a Rust API to foreign callers, which is not this project's shape. Worth a dedicated small rule file if and when this project grows a genuine C-facing export surface.

## Classic patterns in Rust

| GoF pattern | Translates to Rust? | What Rust uses instead | Good idea here? |
|---|---|---|---|
| Singleton | Poorly | Explicit state passed/injected; if truly global, `OnceLock`/`LazyLock` | Avoid; the primary target's own ch4 argues this but incompletely (see Finding 3) |
| Factory Method / Abstract Factory | Yes | Traits + associated types, or a plain constructor function | Good idea — primary target's `TokenFactory` is a clean example |
| Builder | Yes, more idiomatically than in OO | Consuming builder (`fn f(mut self) -> Self`) + fallible `build()` | Good idea — arguably Rust's ownership makes this pattern *safer* than GoF's original |
| Prototype | Subsumed by the language | `#[derive(Clone)]` | Don't hand-roll it; derive it |
| Adapter | Yes | Wrap a type, `impl TargetTrait for Wrapper` | Good idea, no caveats |
| Bridge | Sometimes redundant | A trait already decouples abstraction from implementation; formal Bridge is often unnecessary ceremony | Contextual — often over-engineering |
| Composite | Yes, differently | An `enum` with recursive `Box<Self>`/`Vec<Self>` variants beats a trait-object tree when the variant set is closed | Prefer the enum shape |
| Decorator | Yes, with a tax | `Box<dyn Trait>` wrapping `Box<dyn Trait>`; every layer hand-forwards unused methods (no inheritance) | Good idea for ≤3-4 method traits; past that, prefer a focused trait or `tower::Layer`-style middleware |
| Facade | Yes | Plain struct exposing a simplified API over other structs | Good idea, no caveats |
| Flyweight | Subsumed | `Arc<T>` sharing, or an interning crate for strings | Don't hand-roll it |
| Proxy | Yes, carefully | Wrapping + explicit forwarding; **not** `Deref` (see [[code-shape-review-heuristics]] Finding 4 on Deref-as-fake-inheritance) | Legitimate for lazy-init/logging/metrics proxies; actively harmful as an inheritance substitute |
| Chain of Responsibility | Yes, often unnecessary | `Vec<Box<dyn Handler>>`, or just `?`/early-return for simple linear chains | Contextual |
| Command | Yes, often simpler as closures | `Box<dyn Fn()>`/`FnMut` for simple cases; a `Command` trait/enum for undo/redo or serializable commands | Prefer closures unless you need undo/redo/introspection |
| Interpreter | Rarely as GoF describes | A hand-rolled enum AST + recursive eval (what this book's calculator does), or a parser-combinator crate (`nom`, `winnow`) | Good idea in the enum-AST shape |
| Iterator | Subsumed by the language | Implement `std::iter::Iterator` directly | Don't reinvent the interface — the primary target gets this right |
| Mediator | Yes | A coordinating struct, or channels (`mpsc`) in concurrent code | Good idea; channels are the concurrency-flavored version |
| Memento | Yes, nearly free | `Clone` + a `Vec`/stack of snapshots | Good idea — Rust's value semantics remove most of GoF's original ceremony |
| Observer | Yes, two flavors | `Vec<Box<dyn Observer>>` for sync code; `tokio::sync::{broadcast,watch}` channels for async/concurrent code | Good idea in either flavor, pick per concurrency model |
| State | Yes, two flavors — pick deliberately | **Typestate** (compile-time, `PhantomData<State>`) for statically-known transitions; runtime `Box<dyn State>` only when the next state is chosen dynamically | Prefer typestate when possible — the primary target's own runtime-`Box<dyn State>` example shows why the naive version is error-prone (Finding 4) |
| Strategy | Yes, often simpler as generics/closures | A generic type parameter, `impl Trait` parameter, or a plain closure/`Fn` argument | Prefer the simplest of these three before reaching for a formal `Strategy` trait hierarchy |
| Template Method | Yes, sometimes awkward | A trait with default methods calling required methods; composition (a struct holding a closure for the varying step) is often cleaner | Contextual — Rust has no "protected" access, which limits how much a base-trait can enforce |
| Visitor | Yes, but often the wrong choice | Enum + exhaustive `match` when the variant set is closed (usual case); accept/visit double dispatch only when the set must be extensible by downstream crates | Reconsider before using — the primary target's own code shows how easy it is to implement "wrong" (Finding 4) |

## Normative guidance candidates

1. **Prefer `std::sync::OnceLock`/`LazyLock` over the `lazy_static` crate for global lazily-initialized state.** Both have been in std since Rust 1.70/1.80; the crate buys nothing but a slower build and an extra `cargo tree` entry. **Verification:** `grep lazy_static Cargo.toml` on any crate whose MSRV is ≥1.70 is a finding.
2. **Encode a state machine's legal transitions as distinct types (typestate) whenever the transition graph is knowable at compile time.** A phantom-parameterized struct with one `impl` block per state, each exposing only the operations valid in that state, turns illegal call sequences into compile errors instead of runtime checks. **Verification:** a call to a method not defined on the current state's monomorphized type fails `cargo build`; grep for `PhantomData<State>` paired with multiple `impl Foo<StateX>` blocks as the structural signature.
3. **Reach for the runtime `Box<dyn State>` shape only when the next state genuinely can't be known until runtime;** if you do, make sure the trait's dispatch method is actually the code path that runs, not scaffolding sitting next to a hand-written string/tag match that duplicates it. **Verification:** grep every trait method defined on a "state" trait for call sites; a method implemented N times and called 0 times is the smell — exactly what ch8/state.rs in the primary target has.
4. **For a fixed, closed set of "kinds" needing double dispatch (a Visitor-shaped problem), default to an enum + exhaustive `match` instead of a trait-object Visitor.** Reach for the trait-object Visitor only when the "kinds" must be extensible by code outside your crate. **Verification:** if every `Visitable` implementor lives in the same crate as the `Visitor` trait, the whole hierarchy collapses into one enum with no loss of capability.
5. **If you do implement the accept()/visit() double-dispatch shape, never let a concrete visitor bypass it with `downcast_ref` chains.** The moment a visitor needs `.as_any().downcast_ref::<T>()` to figure out what it's looking at, the double dispatch it declared is not actually driving the traversal, and adding a new variant now requires updating two places instead of one. **Verification:** grep for `downcast_ref` inside any function/module whose name contains "visit"/"visitor".
6. **In a `Box<dyn Trait>`-based Decorator chain, expect to hand-forward every non-overridden method on every layer** — Rust has no implicit inheritance. If more than ~4-5 methods exist on the trait and most decorators care about only one, split into a smaller trait (or a `tower::Layer`-style middleware trait) rather than accepting N-1 forwarding methods per decorator. **Verification:** count identical (non-overridden) forwarding bodies across decorator `impl` blocks; three or more identical forwards across N decorators is the split signal.
7. **Return `impl Iterator<Item = T>` from a trait method (RPITIT, stable since Rust 1.75) instead of `Box<dyn Iterator<Item = T>>`** when the trait is never used as `dyn Trait` — this keeps the iterator chain zero-cost. **Verification:** a trait method signature `-> Box<dyn Iterator<...>>` on a trait whose only uses are generic (`fn f<T: Trait>(...)`, never `Box<dyn Trait>`) is a missed RPITIT opportunity on MSRV ≥1.75.
8. **Don't build a hand-rolled `Monad`/`bind` abstraction for `Result`/`Option` in application code.** The `?` operator plus `and_then`/`map`/`map_err` already give the same composition without a generic `bind` needing a `panic!` fallback for the `Err`/`None` case. **Verification:** `grep -rn "trait Monad\|fn bind"` outside an actual parser-combinator/effect-system crate is a finding.
9. **Implement `Drop` on a guard type returned from an `acquire`/`begin`/`open`-shaped function instead of requiring callers to remember an explicit `release`/`commit`/`close` call**, especially on error paths. **Verification:** any acquire-shaped function paired with a same-named release-shaped function that isn't automatically invoked (no `Drop` impl) is a candidate to become an RAII guard.
10. **Use tuple/struct destructuring with match guards for multi-dimensional routing logic** (`match (priority, content, topic) { (Critical, _, _) => ..., (_, Json(_), t) if t.starts_with("api.") => ..., ... }`) instead of nested `if`/`if let` chains testing unrelated fields of the same value. **Verification:** three or more nested `if`/`if let` blocks testing independent fields of one struct/tuple is a candidate for a single match with guards; the exhaustiveness checker then proves nothing was missed.
11. **Prefer associated types over boxing when a factory/strategy's concrete output type is known at the call site.** `trait Factory { type Output; fn create(&self) -> Self::Output; }` avoids the allocation and dynamic dispatch of `-> Box<dyn Output>` wherever the caller doesn't need runtime polymorphism over multiple factories at once. **Verification:** a factory trait returning `Box<dyn Trait>` where every call site is monomorphic (one concrete factory type known at compile time) is a missed associated-type opportunity.
12. **When teaching or documenting a simplified version of a pattern that Rust's control flow already supersedes (a hand-rolled Monad, a manual retry loop, a spin-polled timeout), say so explicitly in a doc comment**, naming the idiomatic replacement. **Verification:** presence of the words "simplified", "for demonstration", or "in production use X instead" near a pattern that has a known idiomatic Rust replacement is a positive signal, not a smell — its *absence* next to a clearly-simplified implementation is the smell.
13. **Move a value out of a `&mut` enum/struct field without cloning via `mem::take`/`mem::replace`.** When code needs to change an enum variant in place, or otherwise take ownership of a field behind a mutable reference, `mem::take(field)` (for `Default`-implementing types) or `mem::replace(field, new_value)` swaps in a cheap placeholder and returns the original by value — no clone, no allocation for `String`/`Vec`/`Option`. **Verification:** a `.clone()` immediately followed by discarding or overwriting the original field is a candidate for `mem::take`/`mem::replace` instead; for `Option` fields specifically, prefer `.take()`. Source: [rust-unofficial: mem::{take(_), replace(_)}](https://rust-unofficial.github.io/patterns/idioms/mem-replace.html).
14. **When a fallible function consumes (moves) its argument, give the argument back inside the `Err` variant.** This avoids forcing every caller who wants to retry to `.clone()` the argument defensively before every attempt — `String::from_utf8`/`FromUtf8Error::into_bytes` is the std-library instance. **Verification:** a retry loop (this corpus's PKG-16-shaped policy) calling a value-consuming fallible function that clones its argument before each attempt is a candidate — check whether the function's error type could carry the argument back instead. Source: [rust-unofficial: Return consumed argument on error](https://rust-unofficial.github.io/patterns/idioms/return-consumed-arg-on-error.html).
15. **Decompose an over-large struct into cohesive smaller structs when the borrow checker rejects a valid access pattern because two unrelated fields are borrowed through one owning struct.** This is a distinct trigger from ARCH-01/ARCH-03's method-count/parameter-tuple signal: here the compiler error itself — two different field paths off the same struct, each individually type-checkable — is the signal, and the fix is splitting the struct, not adding a method. **Verification:** a borrow-checker error citing two field paths off one struct, where each field's usage would type-check independently, is the trigger to extract those fields into their own small structs and compose them back. Source: [rust-unofficial: Compose Structs](https://rust-unofficial.github.io/patterns/patterns/structural/compose-structs.html).
16. **Introduce a small named trait to replace a repeated, complex `Fn`/`FnMut`/`FnOnce` trait-bound (especially one returning a `Result` or with an associated-type-shaped output) instead of restating the bound on every generic function and struct that needs it.** A blanket `impl<F: FnMut() -> Result<T, E>, T: Display> Getter for F` lets callers pass a plain closure while every internal signature reads as one clean bound. **Verification:** the same multi-clause `where F: Fn(...) -> ..., ...` (or equivalent inline bound) repeated on three or more items is a candidate for a named trait with a blanket impl. Source: [rust-unofficial: Use custom traits to avoid complex type bounds](https://rust-unofficial.github.io/patterns/patterns/structural/trait-for-bounds.html).
17. **Prefer the borrowed-type parameter over the owned-reference type: `&str` over `&String`, `&[T]` over `&Vec<T>`, `&T` over `&Box<T>`.** The owned-reference form compiles and works for every call site that already holds the owned type, but silently rejects a caller holding only a slice or a string literal, and it costs an extra layer of indirection. **Verification:** a `pub fn` parameter typed `&String`, `&Vec<T>`, or `&Box<T>` (unless the function specifically needs to reallocate/resize the owned value) is a finding — deref coercion makes the borrowed form a strict superset of callable sites. Source: [rust-unofficial: Use borrowed types for arguments](https://rust-unofficial.github.io/patterns/idioms/coercion-arguments.html).
18. **When a doc example requires a struct that takes real effort to construct (multiple fields, external resources like a `TcpStream`), wrap the example body in a hidden helper function taking the already-constructed value as a parameter**, rather than inlining full `# `-hidden setup in every method's doctest. Complementary to DOC-06 (no `.unwrap()` in examples): this addresses doctest *boilerplate*, not doctest *safety*. **Verification:** three or more doctests on the same type independently reconstructing the same multi-field value in hidden `# ` setup lines is the trigger to factor out a shared `# fn example(x: RealType) { ... }` wrapper. Source: [rust-unofficial: Easy doc initialization](https://rust-unofficial.github.io/patterns/idioms/rustdoc-init.html).

## AI-agent angle

- **`lazy_static` overrepresentation.** Older pretraining-era Rust code, tutorials, and Stack Overflow answers skew heavily toward `lazy_static!` for any shared/global state, because `OnceLock`/`LazyLock` are comparatively recent. An agent adding a new dependency on `lazy_static` to a crate with no MSRV pin (i.e., default-assume-recent-toolchain) or an MSRV ≥1.70 should be redirected to `std::sync::OnceLock`. Mechanical check: any new `lazy_static` line in a `Cargo.toml` diff.
- **Downcast-chain Visitor instead of double dispatch.** An LLM asked to "implement the Visitor pattern in Rust" is likely to reach for `Any`/`downcast_ref` chains — exactly what this book's own ch8/visitor.rs does — because it requires less trait-plumbing to produce in one pass than wiring up `accept()` on every variant. Mechanical check: `downcast_ref::<ConcreteType>()` inside a function/module named `visit*`/`*visitor*` is the tell; the fix is either true double dispatch or (usually better) collapsing to an enum + `match`.
- **Scaffolded-but-uncalled trait dispatch.** An LLM implementing a State-pattern-shaped request may write the full `trait State { fn handle(&self, ...); }` boilerplate (which "looks complete" and compiles), then — on hitting a self-borrow conflict when actually wiring the call site — silently fall back to string/tag matching instead of resolving the conflict, leaving the trait as inert scaffolding. This is precisely the bug in the book's own ch8/state.rs. Mechanical check: grep every method on a trait for call sites across the crate; zero call sites on a method implemented by every impl block is the signature.
- **Hand-rolled Monad/`bind`.** When translating a pattern-catalogue explanation that leans on Haskell/Scala vocabulary (Functor, Monad, `bind`) into Rust, an LLM may produce a `trait Monad { fn bind(...); }` for `Result`/`Option` where `?`/`and_then` already cover the ground with less ceremony and no panic fallback needed. Mechanical check: `trait Monad`/`fn bind` outside an actual parser-combinator/effect-system crate.
- **Title hallucination by series-pattern-completion.** Given Packt's real "Hands-On Design Patterns with {C++, Java, Kotlin, C#, Julia}" series, an LLM asked for Rust design-pattern books is liable to produce "Hands-On Design Patterns with Rust" as a plausible-sounding title — it does not exist (Finding 7). Mechanical check before citing any book title: resolve it to a real ISBN or a real GitHub repo before repeating it as fact; a title that merely "fits the pattern" of a real series is not evidence the specific volume exists.
- **Framework-dated code from a book that's otherwise fine.** *Rust Web Development*'s `warp`-based examples are the kind of thing an LLM might reproduce verbatim as "the" way to build a Rust web service; by 2026, `axum` is the more commonly recommended default. Mechanical check: any new `warp` dependency added to a project without an explicit user request for `warp` specifically is worth a second look.

## Contested / evolving

- **Whether Visitor is worth using in Rust at all for closed variant sets.** This audit leans "no, use enum + `match`" — the primary target's own code inadvertently makes the case by showing how easy the pattern is to implement incorrectly (downcast chains instead of double dispatch). The counter-position: a trait-object Visitor still earns its keep when the "kinds" genuinely need to be extensible by downstream crates, which an enum can never be.
- **Whether Bridge and Proxy are distinct-enough concepts in Rust to name separately**, versus both collapsing into "wrap a trait object and forward selectively." Arguable that Rust's trait system already gives you Bridge's decoupling for free, making the formal pattern name mostly vocabulary rather than a distinct technique.
- **RPITIT vs. `Box<dyn Iterator>` for public trait APIs.** RPITIT methods are not dyn-compatible — a trait meant to be used as `dyn Trait` anywhere in its object-safety-required surface still needs boxing for that method. The primary target's `pipeline.rs` never uses its RPITIT traits as `dyn Trait`, so the choice is uncontroversial there, but it is a real constraint an agent should check before recommending the RPITIT rewrite blanket.
- **`TimedLockGuard`'s spin-poll-with-sleep(1ms).** Fine as a teaching simplification of "RAII plus a timeout," but not something to carry into production code, where a condvar or a lock type with native timeout support (e.g. `parking_lot::Mutex::try_lock_for`) is strictly better. Not flagged as wrong in the currency verdict because it was never presented as production-ready.
- **Whether GAT-based "type classes" (Functor/Foldable/Filterable for `Option`/`Vec`) are worth reproducing outside teaching contexts.** Mostly re-wrap `Option::map`/`Iterator::fold`/`filter` behind new vocabulary; genuinely useful only if application code needs to be generic *over* "any Functor," which is rare outside FP-library code itself. Worth knowing the technique exists (GATs make it possible since Rust 1.65); not worth reaching for by default.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust](https://github.com/PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust) | Primary target's companion code repo | Repo created 2024-06-12; MSRV 1.78 | Primary source — full sample code for every chapter, directly readable |
| [README.md](https://github.com/PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust/blob/main/README.md) | Repo README | Same | Authoritative chapter list and project structure |
| [Amazon listing](https://www.amazon.com/Design-Patterns-Best-Practices-Rust/dp/1836209479) | Bookseller page | Cover date ~April 2026 | Independently confirms full title, subtitle, ISBN |
| [Packt product listing](https://www.packtpub.com/en-us/product/design-patterns-and-best-practices-in-rust-9781836209461) | Publisher page | Same | Publisher-side confirmation of the ebook edition |
| [Idiomatic Rust: Code Like a Rustacean (Manning)](https://www.manning.com/books/rust-advanced-techniques) | Book product page | Published Aug 2024 | Closest living competitor; worth citing directly for builder/macro/immutable-data content |
| [idiomatic-rust-book repo](https://github.com/brndnmtthws/idiomatic-rust-book) | Companion code | Same | Source-level verification of the above |
| [Code Like a Pro in Rust (Manning)](https://www.manning.com/books/code-like-a-pro-in-rust) | Book product page | Published Feb 2024 | Best-practices angle, complementary to patterns coverage |
| [code-like-a-pro-in-rust-book repo](https://github.com/brndnmtthws/code-like-a-pro-in-rust-book) | Companion code | Same | Source-level verification of the above |
| [Refactoring to Rust (Manning)](https://www.manning.com/books/refactoring-to-rust) | Book product page | Published June 2025 | Newest surveyed title; establishes it's an incremental-adoption book, not a patterns book |
| [refactoring-to-rust repo](https://github.com/lily-mara/refactoring-to-rust) | Companion code | Same | Confirms FFI/PyO3/WASM scope |
| [Rust Web Development (Manning)](https://www.manning.com/books/rust-web-development) | Book product page | Published Dec 2022 | Establishes `warp`-based framework dating |
| [Rust-Web-Development/code](https://github.com/Rust-Web-Development/code) | Companion code | Same | Source-level confirmation |
| [rust-in-action/code](https://github.com/rust-in-action/code) | Companion code for Rust in Action | Published 2021 | Confirms scope is systems programming, not patterns |
| [PacktPublishing/Mastering-RUST-Second-Edition](https://github.com/PacktPublishing/Mastering-RUST-Second-Edition) | Companion code + README | Published 2019, targets Rust 2018 edition | Establishes explicit edition-2018 dating in the README itself |
| [std::sync::OnceLock](https://doc.rust-lang.org/std/sync/struct.OnceLock.html) / [std::sync::LazyLock](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) | Standard library docs | Stable since 1.70.0 / 1.80.0 respectively | Load-bearing fact for Finding 2 and Normative guidance #1; independently confirmed against local rustc 1.93 toolchain source (`#[stable(feature = ..., since = ...)]` attributes) |
| [rust-unofficial/patterns](https://rust-unofficial.github.io/patterns/) | Community "Rust Design Patterns" book — idioms, patterns, anti-patterns, functional | Actively maintained; `SUMMARY.md` fetched directly, all ~40 leaf pages read in full | Full catalogue sweep in this document; source of Normative guidance #13–18 and the two "now-bad-advice" findings on `#[deny(warnings)]` and Prefer Small Crates |
| [rust-unofficial/patterns SUMMARY.md](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md) | The book's own table of contents, fetched raw | Current as of this research | Ground truth for "every page" enumeration rather than working from memory, per the assigning task's instruction |
