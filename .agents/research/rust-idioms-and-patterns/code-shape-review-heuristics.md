---
title: Mechanical Code-Shape Heuristics for Unattended Rust Review
agent: rust-code-shape-researcher
model: sonnet
date_researched: 2026-08
sources_count: 12
scope: >
  A small, grep/clippy-checkable set of code-shape rules an autonomous
  reviewer can apply without judgement calls, targeted at defects
  characteristic of LLM-authored Rust: push-ifs-up/push-fors-down,
  stringly-typed signatures, silent-data-loss defaults, Deref-as-inheritance,
  glob imports/preludes, blanket #[allow(clippy::..)], and the
  static_mut_refs / unsafe_op_in_unsafe_fn allow special case.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Push ifs up, push fors down](#1-push-ifs-up-push-fors-down)
  2. [Stringly-typed signatures](#2-stringly-typed-signatures)
  3. [Silent-data-loss defaults](#3-silent-data-loss-defaults)
  4. [Deref used to fake inheritance](#4-deref-used-to-fake-inheritance)
  5. [Glob imports and preludes](#5-glob-imports-and-preludes)
  6. [Blanket `#[allow(clippy::..)]` at module/crate scope](#6-blanket-allowclippy-at-modulecrate-scope)
  7. [`allow(static_mut_refs)` / `allow(unsafe_op_in_unsafe_fn)`](#7-allowstatic_mut_refs--allowunsafe_op_in_unsafe_fn)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

1. A function whose only reason to return `Option<T>`/`Result<T, E>` is that every single caller immediately unwraps or branches on it the same way should return `T` and let the caller branch — this makes redundant/dead branches visible by inspection instead of scattered across call sites (matklad).
2. The companion rule: hoist loop-invariant conditions out of `for` loops and prefer batch-shaped APIs (`fn process(items: &[T])`) with the single-item call as the degenerate case, not the other way around.
3. Neither rule is a lint. Both are reading heuristics; the mechanical proxy is "find the function, list every call site, check whether the post-call shape is identical everywhere."
4. A `&str`/`String`/`Vec<String>` parameter is stringly-typed exactly when the *set* of valid values is closed and enumerable in the code, independent of whether any given string could also be malformed — a genuinely open-ended string (a file path, a user message, a URL) is not this anti-pattern even though it can also be invalid.
5. The mechanical proxy for stringly-typed is a `match`/`if` on the parameter matching against string literals somewhere in the same crate — that match arm list *is* the missing enum.
6. `unwrap_or_default()`, `to_string_lossy()`, `.ok()`, and `let _ = <fallible-expr>` all compile clean and read idiomatic while discarding an error, an invalid-encoding signal, or a must-use value; none is inherently wrong, but each needs an inline reason at the call site.
7. `to_string_lossy()` explicitly replaces invalid UTF-8 with `U+FFFD` per the stdlib docs — the "lossy" is not editorial, it is documented, silent replacement.
8. `clippy::let_underscore_future`, `clippy::let_underscore_lock`, and `clippy::let_underscore_must_use` already catch three specific instances of the `let _ = …` pattern; none of them is on by default at anything above `suspicious`/`restriction`, so a CLI project must opt in explicitly.
9. `Deref` polymorphism (implementing `Deref<Target = Unrelated>` purely to inherit its methods) is a named rust-unofficial anti-pattern: method resolution "leaks through" `.` syntax, but trait bounds on the target type do **not** propagate to the wrapper, so generic code (`fn f<T: SomeTrait>(x: T)`) still fails to compile even though `x.method()` appeared to work.
10. The fix for Deref-as-inheritance is always explicit delegation: hand-written forwarding methods or a delegation macro, never `Deref`.
11. Glob imports (`use x::*`) are not just a style nit: because adding a new public item is a semver-minor change, any two glob-imported crates (or a glob import plus a local name) can start colliding on an upstream minor bump, breaking a build that made no local change (corrode.dev).
12. The two carve-outs the ecosystem actually uses are (a) trait-only preludes that add extension methods without introducing new free names competing for scope (Rayon-style), and (b) `use super::*;` inside `#[cfg(test)] mod tests`, where the blast radius is one file and the "prelude" is the module under test itself.
13. Even libraries with a `prelude` module (Bevy, Tokio, PyO3, Ratatui) restrict what goes in it precisely because of the collision risk; Tokio removed its prelude because it wasn't pulling its weight. A security-sensitive CLI has the same collision exposure and none of the ergonomic upside those frameworks get from their preludes, so the counter-position does not transfer.
14. `#[allow(clippy::foo)]` (or any `#[allow(lint)]`) placed as an inner attribute (`#![allow(...)]`) or directly above a `mod`/`impl` block silences that lint for every item beneath it, not just the line the author was looking at — a later addition to that module inherits the suppression silently.
15. `#[expect(lint)]` (stable since Rust 1.81, September 2024) is the strictly better tool for a *known, currently-true* suppression: it suppresses the lint exactly like `#[allow]`, but itself warns if the lint stops firing, so a suppression that has become stale is caught by the compiler instead of rotting forever.
16. `clippy::allow_attributes` (restriction group, allow-by-default) exists specifically to flag bare `#[allow]` and suggest `#[expect]`; it cites RFC 2383 ("lint reasons"), whose stated motivation is that unexplained lint suppressions drift out of sync with the code they were written for.
17. `static_mut_refs` is warn-by-default in current rustc: taking a reference to a `static mut` is flagged because concurrent mutable references to the same static are unsound (data races), with the lint's own help text recommending `Mutex`/`atomic`/`LazyLock` instead.
18. `unsafe_op_in_unsafe_fn` requires unsafe operations inside an `unsafe fn` to still be wrapped in an explicit `unsafe { }` block, so the reader can see *which* operation inside the function is the unsafe one instead of the whole function body being an undifferentiated unsafe zone.
19. `#[allow(static_mut_refs)]` or `#[allow(unsafe_op_in_unsafe_fn)]` does not fix the underlying soundness/clarity problem either lint exists to surface — it suppresses the message while the UB risk or the unscoped-unsafe risk remains, which is exactly the failure mode of an agent under pressure to make `cargo build` succeed.
20. Every rule in this document has a false-positive rate above zero except one: `#[allow(static_mut_refs)]` / `#[allow(unsafe_op_in_unsafe_fn)]` appearing anywhere in a diff has no legitimate reading in a 2024-edition codebase and should block review outright.

## Findings

### 1. Push ifs up, push fors down

matklad states the two rules directly: "push ifs up" means moving conditionals from callees toward callers so that "complex control flow... fit[s] on a screen in a single function" while "all the actual work is delegated to straight line subroutines" — visibility of control flow in one place is what makes redundant and dead branches spottable. "Push fors down" is the mirror: operate on batches ("few things are few, many things are many... the hot path usually involves handling many entities") rather than looping one item at a time, because a batch API lets the *caller's* loop stay outside the abstraction boundary, where invariant conditions can be hoisted once instead of re-checked every iteration. The worked example composes both: pulling an `if` out of a `for` loop "avoids repeatedly re-evaluating `condition`, removes a branch from the hot loop, and potentially unlocks vectorization." ([matklad, "Push Ifs Up and Fors Down"](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html))

The Rust-specific instance of "push ifs up": a function signature that returns `Option<T>`/`Result<T, E>` purely so every caller can immediately match/unwrap it is a callee doing the caller's branching job. Centralizing the branch at the *call sites* individually means N copies of essentially the same `match`, some of which will silently diverge (one caller forgets the error path, another swallows it with `.ok()`) — moving the branch inside the function (or up to a single dispatch point) puts all N decisions in one diffable place.

```rust
// before — every caller re-derives the same branch
fn parse_port(raw: &str) -> Option<u16> { raw.parse().ok() }

fn load(raw: &str) -> u16 {
    match parse_port(raw) {
        Some(p) => p,
        None => 8080, // caller 1's fallback
    }
}
// caller 2, caller 3... each repeats this shape, and one of
// them will eventually pick a different fallback by accident.

// after — the branch lives once, at the boundary that owns the default
fn parse_port(raw: &str) -> u16 {
    raw.parse().unwrap_or(8080)
}
```

There is no clippy lint for this shape; it is a reading heuristic, not a mechanical grep.

### 2. Stringly-typed signatures

corrode.dev's "When Rust Gets Ugly" walks a refactor where a function returning `Result<Option<(String, String)>>` for a config-line parser is replaced by a `KeyValue` struct and a `ParsedLine` enum, on the grounds that "code that feels 'stringy-typed' is usually a sign of a missing abstraction." ([corrode.dev, "When Rust Gets Ugly"](https://corrode.dev/blog/ugly/)) The tell in that article is not that strings can be malformed — it's that the *set of things a string is standing in for* is small and already known at compile time; the fix is a type, not better string handling.

The distinguishing question: is there a `match`/`if` *anywhere in this crate* that enumerates the valid values of this `&str`/`String` parameter against literals? If yes, that match/if is the enum that should have been the parameter type. A path, a URL, a free-form error message, or user-supplied text has no such enumeration anywhere — it is genuinely string-shaped data, not a closed set wearing a string costume.

```rust
// stringly-typed: "dev" | "staging" | "prod" is a closed set
fn configure(env: &str) -> Config {
    match env {
        "dev" => Config::dev(),
        "staging" => Config::staging(),
        "prod" => Config::prod(),
        _ => panic!("unknown env"),
    }
}

// typed: invalid values are unrepresentable, not just unmatched
enum Environment { Dev, Staging, Prod }
fn configure(env: Environment) -> Config { /* exhaustive match, no panic arm */ }
```

### 3. Silent-data-loss defaults

The same corrode.dev piece flags manual, panic-prone string handling (`parts[0]`/`parts[1]` without a length check, `String::from_utf8_lossy(&bytes).to_string()`) as symptomatic of "old, bad habits" carried over from other languages, arguing "manual string splitting is error-prone and very much discouraged" because it hides complexity behind code that looks fine at a glance. ([corrode.dev, "When Rust Gets Ugly"](https://corrode.dev/blog/ugly/))

`OsStr::to_string_lossy` is documented, not merely folklore-lossy: "Any non-UTF-8 sequences are replaced with `U+FFFD REPLACEMENT CHARACTER`" ([std docs, `OsStr::to_string_lossy`](https://doc.rust-lang.org/std/ffi/struct.OsStr.html#method.to_string_lossy)) — for a package manager over OCI registries handling arbitrary filesystem paths cross-platform, that replacement can silently corrupt a path used later for a cache key or file write.

Clippy already has partial, narrow coverage of the `let _ = <fallible>` shape: `let_underscore_must_use` (restriction — anything `#[must_use]`), `let_underscore_lock` (correctness — dropping a `Mutex`/`RwLock` guard immediately instead of holding it), and `let_underscore_future` (suspicious — dropping a `Future` that was probably meant to be awaited). None of the three is in Clippy's default-enabled `warn`/`deny` set at the strength this project needs. ([rust-clippy source, `let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs))

`.unwrap_or_default()` and `.ok()` have no clippy lint at all covering the "this throws away an error that should have propagated" case — `clippy::unwrap_or_default` (when it exists as a suggestion) is a style lint about spelling, not a data-loss lint. The mechanical check here has to be a grep plus a project-level convention: any of these four patterns is allowed only with a same-line justification comment.

### 4. Deref used to fake inheritance

The rust-unofficial anti-patterns book names this directly: "Misuse the `Deref` trait to emulate inheritance between structs, and thus reuse methods." Its own example —

```rust
struct Foo {}
impl Foo { fn m(&self) { /* .. */ } }

struct Bar { f: Foo }
impl std::ops::Deref for Bar {
    type Target = Foo;
    fn deref(&self) -> &Foo { &self.f }
}

fn main() {
    let b = Bar { f: Foo {} };
    b.m(); // resolves through Deref, looks like inheritance
}
```

— works for the direct call, but the book is explicit about the failure mode that matters for generic code: "traits implemented by `Foo` are not automatically implemented for `Bar`, so this pattern interacts badly with bounds checking and thus generic programming." ([rust-unofficial patterns, "Deref polymorphism"](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html)) Concretely: `fn needs_trait<T: SomeTrait>(x: T)` will not accept a `Bar` even if `Foo: SomeTrait` and `b.some_trait_method()` compiles fine through `Deref` — the coercion only happens at the call-syntax level, not at the type level, so generic bounds see `Bar` as `Bar`, not `Foo`.

The fix is always explicit delegation — hand-written forwarding methods (`impl Bar { fn m(&self) { self.f.m() } }`) or a delegation macro — never `Deref` for this purpose. `Deref` is for smart-pointer/newtype cases where the wrapper genuinely *is* a thin transparent view over the target (`Vec<T>`-wrapping newtypes deref-ing to `[T]` is legitimate; `Bar` wrapping unrelated `Foo` for method reuse is not).

### 5. Glob imports and preludes

corrode.dev's argument is a semver argument, not a style argument: "Adding new public items is considered a minor change according to semantic versioning rules... You update the crate to the latest minor version, and suddenly your code doesn't compile anymore," walked through with a concrete example where a new `Ferris` struct added in a dependency's 1.3.0 collides with a local `Ferris` brought into the same scope by a glob import. ([corrode.dev, "Don't Use Preludes and Globs"](https://corrode.dev/blog/dont-use-preludes-and-globs/))

The article's own carve-outs: "Preludes which only bring traits into scope might be acceptable" (Rayon's extension-trait prelude is cited approvingly, since it adds methods, not new top-level names competing for identifiers), and `use super::*;` inside a test module — "the only exception I can think of where glob imports are acceptable" — because the blast radius is one file's `#[cfg(test)] mod tests`. It also notes that Bevy, Tokio, PyO3, and Ratatui ship preludes, but that Tokio *removed* its own prelude because it didn't earn its keep — the ecosystem's own trend line is away from, not toward, wide preludes. None of the ecosystem exceptions apply to an internal, security-sensitive CLI's own module tree, where the whole point is that a dependency bump should never silently change what an identifier resolves to.

`clippy::wildcard_imports` (pedantic group, not in the default `warn` set) implements essentially this rule mechanically, and already special-cases prelude modules and `use super::*` in test modules by name/path heuristics. ([rust-clippy source, `wildcard_imports.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/wildcard_imports.rs))

### 6. Blanket `#[allow(clippy::..)]` at module/crate scope

An `#[allow(lint)]` attached as an inner attribute (`#![allow(clippy::foo)]` at the top of a module or crate root) or directly above a `mod`/`impl` block suppresses that lint for every item textually beneath it — including code added to that module a year later by someone who never saw the original justification. `clippy::allow_attributes` exists to push authors toward `#[expect]` instead: "allows explicitly noting that a particular lint *should* occur, and warning if it doesn't," stable since Rust 1.81 (September 2024). Its own release notes give the intended pattern directly: "you can use `#[expect(clippy::undocumented_unsafe_blocks)]` as you transition, ensuring that once all unsafe blocks are documented you can opt into denying the lint." ([Rust 1.81.0 release notes](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/))

The RFC behind both features states the underlying motivation plainly: "Lint settings should have an explanation for their use to explain why they were chosen and where they are or are not applicable" — an unexplained, unscoped `#[allow]` is exactly the artifact that drifts out of sync with the code around it. ([RFC 2383, "lint reasons"](https://rust-lang.github.io/rfcs/2383-lint-reasons.html))

```rust
// before: silences clippy for the whole module, forever
#![allow(clippy::too_many_arguments)]

// after: scoped, and self-invalidating if the shape ever changes
#[expect(clippy::too_many_arguments, reason = "OCI manifest ctor mirrors the spec's field order")]
fn build_manifest(/* 9 params */) { /* .. */ }
```

### 7. `allow(static_mut_refs)` / `allow(unsafe_op_in_unsafe_fn)`

`static_mut_refs` is warn-by-default in current rustc: taking `&`/`&mut` to a `static mut` produces "mutable reference to mutable static is discouraged," with the lint's own suggested fix being to replace the static's type with something `Sync` (`Mutex`, an `atomic` type, or `LazyLock`) rather than to silence the warning — because concurrent mutable references to the same static are unsound (data races / UB), not merely stylistically discouraged. ([rustc lint listing, `static_mut_refs`](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html))

`unsafe_op_in_unsafe_fn` requires that unsafe operations performed *inside* an `unsafe fn` still be wrapped in an explicit inner `unsafe { }` block — an `unsafe fn` is not itself a blanket unsafe context for its whole body; the point is for a reader to see exactly which statement is the unsafe one. ([rustc lint listing, `unsafe_op_in_unsafe_fn`](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html))

Suppressing either lint with `#[allow(...)]` does not touch the underlying problem — the UB risk in the first case, the loss of unsafe-block granularity in the second — it only removes the compiler's warning about it. Given the project's own credential-handling, digest-verification, and archive-extraction surface, and given that an LLM under pressure to make `cargo build`/`cargo clippy` pass reaches for the nearest attribute that makes the red text go away, any diff introducing either allow should be treated as a stop, not a nit.

## Normative guidance candidates

1. **Do not return `Option`/`Result` from a function solely so every caller can immediately branch on it identically.** Rationale: centralizing the branch at one boundary makes redundant/divergent branches visible in a single diff instead of scattered across call sites. VERIFICATION: reading heuristic — for any function returning `Option<T>`/`Result<T, E>`, `rg -n '\bfn_name\(' -A2 src/**/*.rs` and check whether every call site does the same `match`/`unwrap`/`?` shape; if so, move the branch into the function.

2. **Treat a `&str`/`String`/`Vec<String>` parameter as a design smell if the crate itself enumerates its valid values in a `match`.** Rationale: the match arm list is the missing enum; a real string parameter has no such enumeration anywhere. VERIFICATION: `rg -n '"\w[\w-]*"\s*(\||=>)' src/**/*.rs` to surface string-literal match/pattern arms, then check whether the matched expression's type is `&str`/`String` at its declaration. FP rate: moderate — CLI arg-value strings, log-level strings borrowed from a third-party API, and genuinely free-form text with an incidental fallback arm will hit; the reviewer question is "does every valid value for this parameter appear as a literal in this crate?"

3. **Every `.unwrap_or_default()`, `.to_string_lossy()`, `.ok()`, and `let _ = <fallible expr>` needs a same-line justification comment or it is a defect, not a style choice.** Rationale: each compiles clean and reads idiomatic while discarding an error, an invalid-encoding signal, or a must-use value. VERIFICATION: `rg -n '\.unwrap_or_default\(\)|\.to_string_lossy\(\)|\.ok\(\)|let _ = ' --type rust src | rg -v '//'` — any hit with no trailing `//` comment on the line is unjustified. Also enable `clippy::let_underscore_must_use`, `clippy::let_underscore_lock`, and `clippy::let_underscore_future` (none are on by default). FP rate: moderate — `.ok()` on an operation whose error variant is genuinely uninformative (`std::io::Write::flush()` on a `Vec<u8>` sink) is legitimate; the comment is the receipt that someone made that call on purpose.

4. **Never implement `Deref` to reuse another struct's methods (inheritance emulation).** Rationale: `Deref` gives method-call-syntax resolution but does not propagate the target's trait bounds, so generic code taking `T: SomeTrait` still rejects the wrapper even though `wrapper.trait_method()` appears to compile. VERIFICATION: `rg -n 'impl(<[^>]*>)?\s+Deref\s*(<[^>]*>)?\s+for' src/**/*.rs`, then for each hit ask "is `Target` an unrelated struct with its own inherent/trait methods this type wants to inherit, rather than a primitive/collection this type is a thin transparent wrapper over?" FP rate: moderate-high — legitimate newtype-over-`Vec`/`String`/`Box` derefs are common and must not be flagged; the question above is the filter.

5. **Ban glob imports (`use x::*`) outside `#[cfg(test)] mod tests` and trait-only extension preludes (e.g. Rayon's).** Rationale: a dependency's semver-minor bump can add a public item that collides with a glob-imported name, breaking the build with zero local change. VERIFICATION: `rg -n '^\s*use .*::\*;' src/**/*.rs | rg -v 'super::\*'`. Also `cargo clippy -- -W clippy::wildcard_imports` (pedantic, off by default — must be explicitly enabled). FP rate: low — hits are rare by construction, and the two accepted exceptions are easy to eyeball.

6. **No bare `#[allow(clippy::..)]` (or `#![allow(...)]`) above a `mod`, `impl` block, or crate root — every suppression is expression/item-scoped with a `reason = "..."`, and should be `#[expect(...)]` where the condition is currently known-true.** Rationale: an inner or block-level `#[allow]` silences the lint for everything textually beneath it, including future additions nobody reviewed against the original justification; `#[expect]` additionally errors when the suppression becomes stale. VERIFICATION: `rg -n '^#!\[allow\(clippy' src/**/*.rs` (crate/module-wide, near-zero FP — this shape is always blanket by construction) and `rg -n -B1 '#\[allow\(clippy::' src/**/*.rs | rg -A1 'allow' | rg 'mod |impl '` (allow directly above a mod/impl declaration). Enable `clippy::allow_attributes` itself (restriction group, off by default) to get this mechanically on every future PR.

7. **Any diff introducing `#[allow(static_mut_refs)]` or `#[allow(unsafe_op_in_unsafe_fn)]` is review-blocking, full stop — fix the static/unsafe-fn shape instead.** Rationale: both lints exist to surface a genuine soundness/clarity problem (unsound concurrent mutable-static access; unscoped unsafe inside an unsafe fn); the `allow` removes the message, not the risk, and is the exact shortcut an agent under compile-pressure reaches for. VERIFICATION: `rg -n '#\[allow\((static_mut_refs|unsafe_op_in_unsafe_fn)\)\]' --type rust`. FP rate: ~0% — there is no legitimate reason for either allow in a 2024-edition codebase; treat any hit as a stop, not a discussion.

## AI-agent angle

- **Push-ifs-up violations are the default LLM shape, not the exception.** An LLM writing a helper function almost always mirrors the immediate caller's need (`Option` because the one call site it just wrote does `if let Some`), and then a second call site gets added later with a *different* fallback, silently diverging from the first. The smallest mechanical check: whenever a PR adds a second call site to an existing `Option`/`Result`-returning function, diff the two call sites' post-call handling; a mismatch is the bug the pattern was supposed to prevent.
- **Stringly-typed signatures are what an LLM produces by default when it doesn't know the full enum up front** — it starts with `&str` because that's what's easiest to thread through a first draft, and the enum never gets retrofitted once the code compiles. Smallest mechanical check: rule 2's grep, run specifically on newly-added function signatures in a diff (`git diff --unified=0 -- '*.rs' | rg '^\+.*fn .*: *&str'`), not the whole codebase.
- **`.unwrap_or_default()` / `.ok()` / `to_string_lossy()` are exactly what an LLM emits to make a type error or an `unused_must_use` warning go away without engaging with the failure mode** — they are the path-of-least-resistance fix that also happens to compile silently. Smallest mechanical check: rule 3's grep restricted to lines added in the diff; a hit with no justification comment in the same commit is close to certain LLM authorship of a swallowed error.
- **`Deref`-as-inheritance is an LLM pattern-matching failure**: it has seen `Deref` used for legitimate newtype transparency far more often than it has understood the trait-bound caveat, and reaches for it whenever a struct "has-a" another and wants its methods, because it reads like inheriting from a base class. Smallest mechanical check: rule 4's grep, applied whenever a diff adds a `Deref` impl and the same PR also adds or modifies a generic function bound on the target type — that combination is the concrete failure mode.
- **Blanket `#[allow(clippy::..)]` and the `static_mut_refs`/`unsafe_op_in_unsafe_fn` allow are what an LLM reaches for the moment `cargo clippy`/`cargo build` blocks it**, because the allow is the shortest textual edit that satisfies the tool, and the agent has no felt cost for suppressing a warning it will never see fire again. Smallest mechanical check: rules 6 and 7's greps run as a CI gate on every diff, not just at review time — this is the one place a pure `grep -c` exit-code check is sufficient without any LLM judgement in the loop at all.

## Contested / evolving

- **`#[expect]` vs `#[allow]` is genuinely new, not settled practice.** `#[expect]` stabilized in Rust 1.81 (September 2024); most existing Rust codebases, including well-regarded ones, still use `#[allow]` throughout because they predate the feature or haven't done the migration. `clippy::allow_attributes` that would flag this is itself in the `restriction` group (allow-by-default, opt-in only) — the ecosystem has the tool but has not converged on defaulting it on. Direction of travel: RFC 2383's stated motivation (undocumented suppressions drift out of sync) argues for `#[expect]` becoming the default recommendation as tooling and habit catch up.
- **Prelude modules are a live disagreement, not settled against.** Bevy, Tokio (historically), PyO3, and Ratatui all shipped or ship preludes deliberately, for the ergonomic reason that their APIs need many traits and types in scope at once for idiomatic use. corrode.dev's counter-position is scoped to *this class of project* (semver-sensitive, not framework-ergonomics-driven) rather than a blanket claim that preludes are always wrong — Tokio's own removal of its prelude is evidence the calculus can flip even within a single popular crate over time.
- **matklad's push-ifs-up/push-fors-down is a design taste essay, not a lint, and has no tooling behind it.** It is included here because it gives a concrete reviewer question, not because it is mechanically checkable the way the other six rules are; treat it as the weakest-enforceable rule in this set and do not expect a grep to substitute for reading the call sites.
- **Clippy's own coverage of the silent-data-loss patterns (rule 3) is thin and split across restriction/suspicious/correctness groups with different default-on status**, meaning a project that only runs `cargo clippy` with defaults gets essentially none of this for free — the grep-plus-comment-convention in this document is filling a real gap in the lint set as of 2026, not duplicating existing tooling.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [matklad, "Push Ifs Up and Fors Down"](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html) | Primary — design-taste blog post by a prominent Rust compiler/tooling author | 2023-11-15 | The canonical statement of both rules, with the "dissolving enum" worked example |
| [corrode.dev, "When Rust Gets Ugly"](https://corrode.dev/blog/ugly/) | Primary — corrode.dev blog post (Rust consultancy) | 2026-07-17 | Source for stringly-typed and silent-data-loss framing, with a concrete before/after refactor |
| [corrode.dev, "Don't Use Preludes and Globs"](https://corrode.dev/blog/dont-use-preludes-and-globs/) | Primary — corrode.dev blog post | 2024-07-29 | The semver-collision argument against glob imports, plus the stated Rayon/test-module exceptions and the Bevy/Tokio/PyO3/Ratatui counter-position |
| [rust-unofficial patterns, "Deref polymorphism"](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html) | Primary — community-maintained Rust anti-patterns reference | living document, checked 2026-08 | Canonical statement of why Deref-as-inheritance fails generic code, with the minimal repro |
| [rust-unofficial patterns, anti-patterns index](https://rust-unofficial.github.io/patterns/anti_patterns/index.html) | Primary — same reference, index page | living document, checked 2026-08 | Defines "anti-pattern" as the book uses the term; entry point for the Deref page |
| [Rust 1.81.0 release notes](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/) | Primary — official Rust release announcement | 2024-09-05 | Stabilization of `#[expect]`, with the intended migration pattern from `#[allow]` |
| [RFC 2383, "lint reasons"](https://rust-lang.github.io/rfcs/2383-lint-reasons.html) | Primary — accepted Rust RFC | proposed pre-2024, underlies the 1.81 stabilization | States the motivation for both `reason = "..."` and `#[expect]`: undocumented suppressions drift out of sync with the code |
| [rust-clippy source, `clippy_lints/src/let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs) | Primary — Clippy lint source/doc comments | current `master`, checked 2026-08 | Exact behavior and default group of `let_underscore_must_use`/`_lock`/`_future` |
| [rust-clippy source, `clippy_lints/src/wildcard_imports.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/wildcard_imports.rs) | Primary — Clippy lint source/doc comments | current `master`, checked 2026-08 | Exact `wildcard_imports` behavior, default group, and its own prelude/test-module carve-outs |
| [Clippy lint index, `allow_attributes`](https://rust-lang.github.io/rust-clippy/master/index.html#allow_attributes) | Primary — official Clippy lint documentation | current `master`, checked 2026-08 | The lint that directly targets bare `#[allow]` and recommends `#[expect]` |
| [rustc lint listing, warn-by-default (`static_mut_refs`)](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html) | Primary — official rustc reference | current, checked 2026-08 | Exact wording and suggested fix for the mutable-static-reference lint |
| [rustc lint listing, allowed-by-default (`unsafe_op_in_unsafe_fn`)](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | Primary — official rustc reference | current, checked 2026-08 | Exact behavior of the unsafe-block-inside-unsafe-fn lint |
| [std docs, `OsStr::to_string_lossy`](https://doc.rust-lang.org/std/ffi/struct.OsStr.html#method.to_string_lossy) | Primary — official standard library documentation | current, checked 2026-08 | Confirms the U+FFFD replacement behavior is documented, not folklore |
