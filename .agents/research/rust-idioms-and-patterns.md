---
title: Rust Idioms and Code Shape — Consolidated
topic: rust-idioms-and-patterns
model: opus
consolidates:
  - rust-idioms-and-patterns/code-shape-review-heuristics.md
  - rust-idioms-and-patterns/book-length-pattern-treatments.md
grounded_by:
  - ocx-codebase-audit/crate-architecture.md
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/rules-inventory.md
  - topic-map.md
date: 2026-08
---

# Rust Idioms and Code Shape

## Verdict

1. This group shipped **two** sub-artifacts ([code-shape-review-heuristics.md](rust-idioms-and-patterns/code-shape-review-heuristics.md), [book-length-pattern-treatments.md](rust-idioms-and-patterns/book-length-pattern-treatments.md)) against the five idiom topics the map listed as high/medium ([topic-map.md:127-139](topic-map.md)). The largest one — `.clone()` to dodge the borrow checker, ranked "**high**, the single most-cited Rust anti-pattern and the most reflexive LLM move" — is **not in this group at all**; the map routed it to `ownership-shapes-clones-and-interior-mutability` ([topic-map.md:212](topic-map.md)). Do not author a clone rule here; cross-reference that wave. ARCH-23 and STATE-36 below are the two clone-adjacent exceptions, and both are *replacements* for a clone rather than a clone policy.
2. Seventeen rules survive. Only three are mechanically decidable at ~0% false-positive rate (IDIOM-08 crate/module-scoped suppression, IDIOM-09 unsafe-lint suppression, IDIOM-05 lint config). Those three go in a CI gate. The rest are review heuristics with an explicit reviewer question attached, and are labelled as such — an autonomous reviewer that treats a grep hit as a defect will drown the diff in noise on IDIOM-03/04/06.
3. **IDIOM-09 is the only stop-the-review rule.** `#[allow(static_mut_refs)]` / `#[allow(unsafe_op_in_unsafe_fn)]` has no legitimate reading in a 2024-edition crate, and both ocx and grimoire are edition 2024 (`grimoire/Cargo.toml:4`, `ocx/crates/ocx_lib/Cargo.toml:4`). Neither appears today; the rule is prophylactic against the compile-pressure reflex.
4. **The highest-yield rule for this project is IDIOM-04**, the justification-comment convention on the silent-data-loss quartet. 84 `to_string_lossy` in `ocx_lib` alone and 135 `unwrap_or_default` across the three trees is the live surface, and a package manager round-tripping arbitrary archive entry names is exactly where U+FFFD substitution corrupts a cache key.
5. **Codify `#[expect]` over `#[allow]` now, despite it being unsettled ecosystem practice.** 181 `#[allow(...)]` across ocx+grimoire, 5 carrying `reason =`, 4 `#[expect]` total. The cost of the immature convention is lower than the cost of 176 undocumented suppressions rotting; the migration is bounded and greppable.
6. **Conflict resolved against the audit:** `crate-architecture.md:284` proposes decomposing ocx's 603-method `PackageManager` "delegating via `Deref`/explicit methods". `Deref` is struck from that recommendation (IDIOM-10) — that is textbook Deref-polymorphism, and the whole point of the extraction is to make types carry the design, which Deref actively prevents by not propagating trait bounds.
7. **Conflict resolved against the sub-artifact:** it states `static_mut_refs` is "warn-by-default in current rustc". That is true for editions ≤2021 only; in edition 2024 it is deny-by-default ([topic-map.md:170](topic-map.md)). Both codebases are 2024, so the lint already fails the build — which raises, not lowers, the pressure to suppress it. IDIOM-09 stands unchanged.
8. **Ownership split with the platform wave:** `to_string_lossy` on paths is owned twice ([topic-map.md:56](topic-map.md) topic 1, and here). Split: this group owns the *convention* (any of the four constructs needs a same-line receipt); `cross-platform-path-and-filename-handling` owns the *correct replacement* for the path case (`camino`, erroring conversions). Do not write a second lossy-path rule here.
9. `ocx_lib::prelude` (`ocx/crates/ocx_lib/src/lib.rs:66-74`) is a near-miss on IDIOM-07, not a violation: four extension traits plus `Error`/`Result`. Trait-only preludes are the sanctioned carve-out; the two type names are the residue to import explicitly.
10. `[workspace.lints]` in ocx is **empty by deliberate policy** (`ocx/Cargo.toml:225-227`) and grimoire's has three entries (`grimoire/Cargo.toml:119-129`). Five lints this group needs are therefore off everywhere. That is IDIOM-05, and it is the cheapest change in the set.
11. **The full rust-unofficial catalogue sweep yielded six genuinely uncovered rules out of ~40 pages, and fifteen collisions.** The corpus was already at ~85% coverage of the community catalogue before this fold. The six survivors are ARCH-23 (Compose Structs), ARCH-24 (typestate), STATE-36 (`mem::take`/`replace`), IDIOM-13 (borrowed argument types), IDIOM-15 (return the consumed argument on error), DOC-21 (doctest initialization helpers) — plus IDIOM-14, which comes from the *book*, not the catalogue. Every collision is tabulated below rather than re-minted; the sweep's own "already reflected" column was verified against the published files, not trusted.
12. **ARCH-23 is the highest-yield addition and it retires an open question.** "Split the struct along the field boundary the borrow checker already named" is the missing *positive* half of the borrow-checker-fight cluster: STATE-21/23/24 all say what not to reach for (`RefCell`, `Arc<Mutex>`, `.clone()`) and none names the fix. It also gives the `PackageManager` decomposition a split axis that is not method-count: 10 fields, 603 methods, and the fields already cluster (`file_structure`/`index`/index-home; `client`/`managed_config_client`/`default_registry`; `patches`/`patch_snapshot`; `progress`). See Open questions.
13. **The book's two reference-code bugs are one AI failure mode, and it is worth a rule.** Its ch8 `State` defines `handle_input` on every state and calls it nowhere (a string `match` to three free functions duplicates the logic); its ch8 `Visitor` defines `accept`/`visit` correctly and then traverses with hand-chained `downcast_ref`. Both are *declared dispatch that is not the dispatch that runs* — the exact residue of an agent that emits the full trait scaffold, hits a self-borrow conflict at the call site, routes around it, and never deletes the scaffold. IDIOM-14.
14. **The book itself is not a citable authority for anything post-mid-2024** ([book-length-pattern-treatments.md](rust-idioms-and-patterns/book-length-pattern-treatments.md) findings 1-2): cover date April 2026, companion repo created 2024-06-12, `edition = "2021"` and MSRV 1.78 throughout. Cite it for typestate (ch10) and RPITIT (ch11) worked examples, which are genuinely 2024-fresh and correct; treat its silence on edition 2024 as absence of evidence. Its ch4 global-state chapter is the one actively incomplete part — it strawmans `lazy_static` and never names `OnceLock`, which EVO-8 already resolves.

## The ruleset

Severity: **MUST** = block the merge; **SHOULD** = flag and require a written answer to the reviewer question; **CONSIDER** = raise once, accept the author's call.

**ID namespace.** IDIOM-01..10 are this group's originals and are published in `rules/rust-quality/api-and-idioms.md`; IDIOM-11 and IDIOM-12 are published there too but were authored by another wave, so this file's new IDIOM rules start at **13**. Rules added by the 2026-08-14 revision take the ID of the *published family they belong to*, continuing that file's numbering — `ARCH-` for `architecture.md`, `DOC-` for `docs-and-tracing.md`, `STATE-` for the ownership cluster — so the ID a rule carries here is the ID it carries once published, and never has to change. `STATE-36` continues from `durable-state.md`'s highest (`STATE-35`); STATE-26/27 are unallocated and were deliberately left alone rather than backfilled.

---

### IDIOM-01 — Do not return `Option`/`Result` solely so every caller branches on it identically

**Rationale.** A callee returning `Option<T>` only so all N call sites re-derive the same fallback is doing the caller's branching job; the N copies diverge silently (one caller `.ok()`s the error, another picks a different default) and no single diff shows it ([matklad, "Push Ifs Up and Fors Down"](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html)).

**Verification.** Reading heuristic, no lint exists. For any function returning `Option<T>`/`Result<T, E>`: `grep -rn -A2 '\bfn_name(' --include='*.rs' src/` and compare the post-call shape at every site. Identical at all of them → move the branch into the function. In review of a *diff*, the cheap form: when a PR adds a second call site to an existing `Option`-returning function, diff the two call sites' handling; a mismatch is the defect this rule prevents.

**Severity: SHOULD.**

---

### IDIOM-02 — Prefer batch-shaped signatures (`fn f(items: &[T])`) with the single-item call as the degenerate case

**Rationale.** A batch API leaves the loop in the caller, where loop-invariant conditions can be hoisted once instead of re-checked per iteration — "avoids repeatedly re-evaluating `condition`, removes a branch from the hot loop, and potentially unlocks vectorization" ([matklad](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html)).

**Verification.** Reading heuristic only. Reviewer question: "is this function called inside a `for` loop anywhere, and does it re-check something constant across that loop?" No grep substitutes.

**Severity: CONSIDER.** This is the weakest-enforceable rule in the set — a design-taste essay with no tooling behind it. Included because it gives a concrete reviewer question; excluded from any CI gate.

---

### IDIOM-03 — Replace a `&str`/`String`/`Vec<String>` parameter with an enum when the crate itself enumerates its valid values

**Rationale.** "Code that feels 'stringly-typed' is usually a sign of a missing abstraction" ([corrode.dev, "When Rust Gets Ugly"](https://corrode.dev/blog/ugly/)). The discriminator is *not* whether the string can be malformed: it is whether the set of valid values is closed and already written down as `match` arms somewhere in the crate. That arm list is the missing enum. A path, a URL, a registry reference, or a free-form message has no such enumeration and is genuinely string-shaped.

**Verification.** `grep -rnE '"[A-Za-z][A-Za-z0-9_-]*"\s*(\||=>)' --include='*.rs' src/`, then check the matched scrutinee's declared type. On a diff: `git diff --unified=0 -- '*.rs' | grep -E '^\+.*fn .*: *&str'`. Reviewer question: "does every valid value for this parameter appear as a literal in this crate?"

**Severity: SHOULD.** Moderate false-positive rate — CLI arg strings, third-party log-level strings, and free-form text with an incidental fallback arm all hit. Overlaps `rust-type-architecture`'s newtype remit; this rule is the *detection grep*, that wave owns the replacement type's design.

---

### IDIOM-04 — Every `.unwrap_or_default()`, `.to_string_lossy()`, `.ok()`, and `let _ = <fallible expr>` carries a same-line justification comment

**Rationale.** All four compile clean and read idiomatic while discarding an error, an invalid-encoding signal, or a `#[must_use]` value. `to_string_lossy`'s loss is documented, not editorial: "Any non-UTF-8 sequences are replaced with `U+FFFD REPLACEMENT CHARACTER`" ([std docs](https://doc.rust-lang.org/std/ffi/struct.OsStr.html#method.to_string_lossy)) — on a cache key or a file write derived from a tarball entry name, that is silent corruption. None of the four is inherently wrong; the comment is the receipt that someone chose it deliberately.

**Verification.** `grep -rnE '\.unwrap_or_default\(\)|\.to_string_lossy\(\)|\.ok\(\)|let _ = ' --include='*.rs' src/ | grep -v '//'` — every hit without a trailing `//` on the same line is unjustified. On a diff, restrict to added lines; a hit with no justification in the same commit is near-certain machine-authored error swallowing. Partial mechanical backup via IDIOM-05's three `let_underscore` lints; `.unwrap_or_default()` and `.ok()` have **no** clippy coverage for the data-loss case.

**Severity: MUST** (extends the existing Block-tier rule that already covers `let _`/`.ok()` — [rules-inventory.md:126](ocx-codebase-audit/rules-inventory.md) — to `unwrap_or_default` and `to_string_lossy`). Moderate false-positive rate on `.ok()` over a genuinely uninformative error (`Write::flush()` on a `Vec<u8>` sink); the comment is cheap and settles it.

---

### IDIOM-05 — Enable `let_underscore_must_use`, `let_underscore_lock`, `let_underscore_future`, `wildcard_imports`, and `allow_attributes` in `[workspace.lints]`

**Rationale.** All five implement rules in this document mechanically, and **none is on by default** — the three `let_underscore` lints sit in restriction/correctness/suspicious at strengths below what a CLI needs ([clippy source, `let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs)); `wildcard_imports` is pedantic and already carve-outs preludes and test modules by path heuristic ([clippy source, `wildcard_imports.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/wildcard_imports.rs)); `allow_attributes` is restriction ([Clippy lint index](https://rust-lang.github.io/rust-clippy/master/index.html#allow_attributes)). A project running default `cargo clippy` gets none of this.

**Verification.** `grep -nE 'let_underscore_must_use|let_underscore_lock|let_underscore_future|wildcard_imports|allow_attributes' Cargo.toml crates/*/Cargo.toml` — five hits at `warn` or stronger, or the rule fails.

**Severity: MUST.** Lint-file ownership belongs to `rust-tooling-ci`; this rule contributes the specific lint IDs and their justification, not the file layout.

---

### IDIOM-06 — Never implement `Deref` to reuse an unrelated type's methods

**Rationale.** Named anti-pattern: "traits implemented by `Foo` are not automatically implemented for `Bar`, so this pattern interacts badly with bounds checking and thus generic programming" ([rust-unofficial patterns, "Deref polymorphism"](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html)). `wrapper.method()` compiles via method-resolution coercion while `fn f<T: SomeTrait>(x: T)` still rejects the wrapper — the coercion is call-syntax-level, not type-level. Fix is always explicit delegation or a delegation macro.

**Verification.** `grep -rnE 'impl( *<[^>]*>)? *(std::ops::)?Deref *(<[^>]*>)? *for' --include='*.rs' src/`, then per hit: "is `Target` an unrelated type whose methods this wrapper wants to inherit, or is this a thin transparent newtype over its own inner value?" Transparent newtypes over `Vec`/`String`/`Box`/an inner domain value are legitimate and must not be flagged.

**Severity: SHOULD.** Moderate-to-high false-positive rate; the reviewer question above is the only filter.

---

### IDIOM-07 — No glob imports (`use x::*`) outside `#[cfg(test)] mod tests` and trait-only preludes

**Rationale.** A semver argument, not a style one: adding a public item is a minor-version change, so a dependency bump can introduce a name that collides with a glob-imported one and break a build that changed nothing locally ([corrode.dev, "Don't Use Preludes and Globs"](https://corrode.dev/blog/dont-use-preludes-and-globs/)). Carve-outs are the two the ecosystem actually uses: trait-only extension preludes (Rayon-style — they add methods, not competing top-level names) and `use super::*;` in a test module, where the blast radius is one file.

**Conflict noted and resolved.** Bevy, PyO3, and Ratatui ship preludes deliberately, and Tokio *removed* its own for not earning its keep. The counter-position is framework-ergonomics-driven and does not transfer: a security-sensitive internal CLI carries the same collision exposure with none of the ergonomic upside.

**Verification.** `grep -rnE '^\s*use .*::\*;' --include='*.rs' src/ | grep -v 'super::\*'`, then discard hits whose target module exports only traits. Mechanical backup: `wildcard_imports` via IDIOM-05.

**Severity: SHOULD.** Low false-positive rate; hits are rare by construction.

---

### IDIOM-08 — Every lint suppression is item-scoped and carries `reason = "..."`; use `#[expect]` where the condition is currently true

**Rationale.** `#![allow(...)]` at crate/module scope, or `#[allow(...)]` above a `mod`/`impl`, silences the lint for everything textually beneath it — including code added a year later by an author who never saw the justification. RFC 2383: "Lint settings should have an explanation for their use to explain why they were chosen and where they are or are not applicable" ([RFC 2383](https://rust-lang.github.io/rfcs/2383-lint-reasons.html)). `#[expect]` (stable 1.81, September 2024) suppresses identically *and* warns when the suppression goes stale ([Rust 1.81.0 release notes](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/)).

**Verification.** Two greps, both near-zero false positive: `grep -rnE '^\s*#!\[allow\(' --include='*.rs' src/` (crate/module-wide by construction) and `grep -rn -A1 -E '^\s*#\[allow\(' --include='*.rs' src/ | grep -E '(mod |impl )'` (allow above a mod/impl). Plus `allow_attributes` from IDIOM-05 for the bare-`#[allow]`-should-be-`#[expect]` case.

**Severity: MUST** for the two scope greps. The `#[allow]`→`#[expect]` migration is **SHOULD**, applied to new and touched code — `#[expect]` is genuinely new and most well-regarded Rust codebases predate it, so a bulk rewrite of existing suppressions is not required.

---

### IDIOM-09 — `#[allow(static_mut_refs)]` and `#[allow(unsafe_op_in_unsafe_fn)]` block the review outright

**Rationale.** `static_mut_refs` fires because concurrent mutable references to a static are unsound, and the lint's own help text says to change the static's type to `Mutex`/atomic/`LazyLock`, not to silence it ([rustc lint listing](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html)). `unsafe_op_in_unsafe_fn` exists so a reader sees *which* statement in an `unsafe fn` is the unsafe one instead of the whole body being an undifferentiated unsafe zone ([rustc lint listing](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)). Both allows delete the message and leave the risk. In edition 2024 `static_mut_refs` is deny-by-default, so the allow is the difference between a failing build and shipped UB — and it is the exact shortest edit an agent reaches for when the build is red.

**Verification.** `grep -rnE '#\[allow\((static_mut_refs|unsafe_op_in_unsafe_fn)\)\]' --include='*.rs' .` — non-empty exit status fails CI. No LLM judgement in the loop.

**Severity: MUST.** ~0% false-positive rate; the only rule in this set with no legitimate exception.

---

### IDIOM-10 — Do not decompose a god-struct by having the facade `Deref` to an extracted type

**Rationale.** Corollary of IDIOM-06 at the architecture scale, and the specific correction to `crate-architecture.md:284`'s proposal to split `PackageManager` "delegating via `Deref`/explicit methods". A `Deref` facade preserves `.method()` call-site compatibility while leaving every trait bound pointing at the god-struct — the extraction produces no type-system benefit, which was its entire purpose. Explicit forwarding methods (or, better, migrating call sites to the extracted type directly) is the only shape that banks the win.

**Verification.** During any extraction PR: `grep -rnE 'impl( *<[^>]*>)? *(std::ops::)?Deref *for' --include='*.rs' src/` against the diff. A new `Deref` impl whose `Target` is a type introduced by the same PR is the failure.

**Severity: SHOULD.**

---

### ARCH-23 — Split a struct along the field boundary the borrow checker names, before reaching for `.clone()`, `RefCell` or `Arc<Mutex>`

**Rationale.** "Compose Structs" is the one rust-unofficial page with no counterpart anywhere in this corpus, and it is the *positive* half of a cluster that is otherwise entirely prohibitions: STATE-24 forbids the reflexive clone, STATE-21 forbids `Arc<Cell>`, STATE-23 forbids the one-lock-site `Arc<Mutex>` — and none of the three names what to do instead. The community page names it: when the compiler rejects two simultaneous borrows through one owning struct, and each field path would type-check on its own, the struct is doing two jobs and the borrow error is the compiler pointing at the seam ([rust-unofficial, "Compose Structs"](https://rust-unofficial.github.io/patterns/patterns/structural/compose-structs.html)). Distinct trigger from ARCH-01/ARCH-03: those fire on a repeated parameter tuple and a method count, and both push work *into* a type; this one fires on a compiler error and pushes fields *out* of one.

**Verification.** No lint — the trigger is a `cargo build` error (E0499/E0502) citing two different field paths off one receiver. Reviewer question at the fix: "does either field appear in the other's methods?" Two disjoint field sets is the extraction. On a diff, the failure signal is the opposite shape: a commit whose message mentions the borrow checker and whose diff adds a `.clone()`, a `RefCell`, or an `Arc<Mutex>` without moving a field.

**Severity: SHOULD.** Low false-positive rate because the compiler produces the trigger, not a grep — but the *fix* is a judgement call, so it cannot be a MUST.

---

### ARCH-24 — Encode a state machine's legal transitions as types when the transition graph is known at compile time

**Rationale.** A phantom-parameterized struct with one `impl` block per state, each transition consuming `self` and returning the next type, makes an illegal call sequence a compile error rather than a runtime check or a `debug_assert`. The book's ch10 `Consumer<State>` is the deepest worked example in the surveyed corpus — `receive()` exists only on `Consumer<Subscribed>`, so calling it on a `Consumer<Disconnected>` does not compile ([book-length-pattern-treatments.md](rust-idioms-and-patterns/book-length-pattern-treatments.md) finding 5). This is the same argument as ARCH-05 (enum over `bool` for a closed set of choices) lifted from *values* to *sequences*, and the same argument as ARCH-04 (parse once at the boundary) lifted from *shape* to *lifecycle*.

**Verification.** Structural: `grep -rn 'PhantomData<' --include='*.rs' src/` paired with two or more `impl Foo<StateX>` blocks is the signature that it was applied. The trigger to apply it is the inverse — an enum field named `state`/`phase`/`status` read by a `match` at the top of three or more methods, each with an "invalid in this state" arm, is a runtime state machine that could be a compile-time one.

**Severity: CONSIDER.** The cost is real (one type per state, no heterogeneous collection of consumers, no runtime-chosen next state), and the payoff only lands when the graph is genuinely static. Raise it once at design time; do not re-raise on a machine that already ships.

---

### STATE-36 — Take a field out of a `&mut` with `mem::take`/`mem::replace`/`Option::take`, not with a clone you then overwrite

**Rationale.** The idiom the community catalogue names for exactly the borrow-checker pressure STATE-24 forbids the clone answer to: `mem::take(&mut self.buf)` swaps in a cheap `Default` and hands back the original by value — for `String`/`Vec`/`HashMap`/`Option` the placeholder allocates nothing ([rust-unofficial, "mem::{take, replace}"](https://rust-unofficial.github.io/patterns/idioms/mem-replace.html)). `mem::replace` is the same move where no `Default` exists, and is the only way to change an enum variant in place while keeping the old payload. The clone version is not merely slower: it leaves a stale second copy alive for the rest of the scope, which is where the divergence bug in STATE-24 comes from.

**Verification.** `grep -rnE -A3 '\.clone\(\)' --include='*.rs' src/` and keep hits where the *same* place expression is assigned within the next few lines — that is the `mem::take` shape. For `Option` fields specifically, `.take()` over `.clone()` + `= None`. No lint: `redundant_clone` does not fire here, because the clone is genuinely used before the original is overwritten.

**Severity: SHOULD.** Overlaps STATE-24's remit and is deliberately narrower — STATE-24 asks whether the two copies should diverge; this rule is the answer for the "no, and I only cloned to get past `&mut`" case.

---

### IDIOM-13 — Take `&str`/`&[T]`/`&T`, never `&String`/`&Vec<T>`/`&Box<T>`

**Rationale.** Deref coercion makes the borrowed form a strict superset of callable sites: `&String` rejects a string literal, `&Vec<T>` rejects an array or a slice of a larger buffer, and both add a pointer hop ([rust-unofficial, "Use borrowed types for arguments"](https://rust-unofficial.github.io/patterns/idioms/coercion-arguments.html)). The exception is a function that must resize or reallocate the owned value, which needs `&mut String`/`&mut Vec<T>` anyway.

**Verification.** `cargo clippy` — `clippy::ptr_arg` is **style, warn-by-default**, so a plain clippy run already catches `&String`/`&Vec<T>`/`&PathBuf`/`&Cow<_>` in argument position and correctly exempts trait impls. `&Box<T>` needs `clippy::borrowed_box` (pedantic, opt-in). This rule is therefore *documentation of an already-mechanized default*, not new enforcement.

**Severity: CONSIDER**, and see the note below on why it is not promoted: the corpus has two `&String` parameters and both are `impl TryFrom<&String>` signatures, which `ptr_arg` deliberately exempts. Zero live surface plus default-lint coverage means a published line would buy nothing.

---

### IDIOM-14 — Declared dispatch must be the dispatch that runs: no trait method implemented by every impl and called by none, and no `downcast_ref` chain standing in for a declared `accept`/`visit`

**Rationale.** Both of the book's own reference-code bugs are this defect (findings 3-5 in the sub-artifact): `CalculatorState::handle_input` is implemented on three states and called nowhere, with a string `match` to three free functions duplicating the logic beside it; `Visitable::accept` is implemented correctly on every node and driven by neither concrete visitor, both of which walk the tree with hand-chained `downcast_ref`. Neither is an era problem — both would have been wrong in 2018 — and both are the residue of the same process: emit the full trait scaffold (which compiles and reads complete), hit a self-borrow conflict when wiring the real call site, route around it, never delete the scaffold. The cost is that the next variant has to be added in two places, and a reader who trusts the trait reads the wrong control flow.

**Verification.** Per trait: for each method, `grep -rn '\.method_name(' --include='*.rs' src/` outside the trait's own definition and impls. N implementations and zero call sites is the finding. Second grep, narrower: `grep -rn 'downcast_ref' --include='*.rs' src/` restricted to files or functions whose name contains `visit`. Note the corpus's 34 `downcast_ref` hits are `std::error::Error` chain inspection and starlark value extraction, both legitimate — the rule is scoped to visitor-shaped traversal, not to `downcast_ref` as such.

**Severity: SHOULD.** Low false-positive rate on the dead-method half (a trait method with zero call sites has to be justified as a downstream extension point, and in a binary crate there is no downstream).

---

### IDIOM-15 — A fallible function that consumes its argument returns the argument inside the `Err`

**Rationale.** `String::from_utf8` is the std instance: the error carries `into_bytes()` so a caller can recover the input it moved in ([rust-unofficial, "Return consumed argument on error"](https://rust-unofficial.github.io/patterns/idioms/return-consumed-arg-on-error.html)). Without it every caller that might retry has to clone defensively *before every attempt*, including the attempts that succeed — which is the clone STATE-24 will then flag, in a place where it is genuinely load-bearing. Directly relevant to this corpus: PKG-16's retry policy is exactly the shape that pays this cost.

**Verification.** On any new value-consuming `fn f(x: T) -> Result<U, E>`: is any call site inside a retry loop? If yes, `E` carries `T`. On existing code, the inverse grep — a `.clone()` immediately inside a retry/backoff loop body, feeding a consuming call.

**Severity: CONSIDER.** Applies at API-design time only; retrofitting it onto an existing error enum is a wire-format change for `#[non_exhaustive]` error types (API-15) and rarely worth it.

---

### DOC-21 — Factor repeated doctest setup into one hidden helper function rather than re-hiding it per example

**Rationale.** When a type takes real effort to construct — several fields, a `TcpStream`, a client — every doctest on it re-hides the same `# `-prefixed setup, and the copies drift until one of them no longer compiles and the rest still do. The community idiom is a single hidden `# fn example(x: RealType) { … }` wrapper the examples call ([rust-unofficial, "Easy doc initialization"](https://rust-unofficial.github.io/patterns/idioms/rustdoc-init.html)). Complementary to DOC-06, which governs doctest *safety* (`?` not `.unwrap()`); this one is doctest *duplication*.

**Verification.** Three or more doctests on one type whose hidden `# ` lines reconstruct the same value. Mechanically: extract `# `-prefixed lines from each `///` block in a file and look for a repeated multi-line run.

**Severity: CONSIDER.**

---

**Deliberately not made rules.** Formatting and import ordering (rustfmt owns it); "prefer iterators over index loops", `?` over manual match, and `impl Trait` in argument position — an LLM produces these reliably unprompted, and a rule spends attention budget for nothing.

**Dropped from the 2026-08-14 fold, with reasons.** Candidate numbers are the sub-artifact's ([book-length-pattern-treatments.md](rust-idioms-and-patterns/book-length-pattern-treatments.md) `## Normative guidance candidates`).

| Candidate | Why not a rule |
|---|---|
| 6 — decorator forwarding tax, split the trait past ~4 methods | Real observation, but the threshold is arbitrary and the corpus has no decorator chain. The useful residue — hand-written forwarding at scale — is the unresolved delegation question under Open questions, not a rule. |
| 7 — prefer RPITIT over `Box<dyn Iterator>` when the trait is never `dyn` | Correct, but it is the exact inverse of ARCH-10 and publishing both invites an agent to oscillate. Recorded instead as a carve-out on ARCH-10: ARCH-10 forbids RPITIT in a trait *that is also used as `dyn`*; where no `dyn` use exists, RPITIT is the default and boxing needs the justification. |
| 8 — no hand-rolled `Monad`/`bind` | Zero live surface and no plausible one. `?`/`and_then` already cover it, and IDIOM-12 (do not own non-domain code) is the general form. |
| 10 — tuple destructuring with match guards over nested `if let` | Style preference with no verification that survives contact — "three or more nested `if let`" fires on plenty of correct code. |
| 12 — doc-comment your simplified teaching implementations | Applies to pedagogical code. This corpus ships none. |
| 5 (partially) — never bypass `accept`/`visit` with `downcast_ref` | Not dropped: merged into IDIOM-14 as its second grep, because it is the same defect as candidate 3 at a different scale. |

### Collisions with already-published rules

Recorded rather than re-minted. Each row is a catalogue page or book candidate whose behaviour a published rule already governs; **no new ID was created for any of them**, and where the published rule is stricter, that is noted so the sweep's own wording does not weaken it on a re-read.

| Source item | Published rule that owns it | Relationship |
|---|---|---|
| Candidate 1 — `OnceLock`/`LazyLock` over `lazy_static` | **EVO-8** (also EVO-3, STATE-17) | Exact duplicate. EVO-8 goes further: it also keeps the `once_cell` carve-out and forbids treating `LazyLock` poisoning as recoverable, which the book never mentions. |
| Candidate 4 — enum + `match` over trait-object Visitor for a closed set | **ARCH-09** | The dispatch ladder already says enum + `match` when the implementor set is closed and crate-owned. |
| Candidate 9 — RAII guard with `Drop` over an explicit `release` | **STATE-1..17** (`durable-state.md`) | Published rules go far deeper — poisoning, panics in `Drop`, `process::exit` interaction. |
| Candidate 11 — associated types over boxing when the output type is known | **ARCH-09** | Same ladder: generic parameter by default, `dyn` only for a genuinely open set. |
| Candidate 2 — typestate | **ARCH-24** (new, this revision) | Not a collision; listed here because the sweep filed it under "already reflected via ARCH-09", which is wrong — ARCH-09 is about dispatch, not lifecycle. |
| Catalogue: Deref polymorphism | **ARCH-06**, IDIOM-10 | Exact match. The page's ~2015 prediction that Rust would gain an inheritance mechanism never happened; do not cite it as forthcoming. |
| Catalogue: Clone to satisfy the borrow checker | **STATE-24** | STATE-24 is stricter (the "should the copies diverge?" question). STATE-36 adds the replacement, not a second prohibition. |
| Catalogue: `#[deny(warnings)]` | **LINT-01/02/03** (`rust-cargo.md`) | Page's remediation is superseded, not just its lint list: `[workspace.lints]` (Cargo 1.74) postdates it. Its pinned "safe to deny" enumeration is rustc-1.48-era — `const_err` is gone, `private_in_public` split into `private_interfaces`/`private_bounds`. Do not cite the list. |
| Catalogue: Prefer Small Crates | **ARCH-19/20** | Page is one-sided; ARCH-19/20 are the conditional successor and already cite tokio's reversal. |
| Catalogue: Contain unsafety in small modules | **SEC-01/SEC-02** | Exact match. |
| Catalogue: Newtype | **ARCH-04**, API-10 | Published rules are stricter: private field, fallible `TryFrom`. The page treats `From` as the default, which API-10 explicitly supersedes. |
| Catalogue: The `Default` trait | **API-08** | API-08 is stricter — the derive needs a doc comment naming the runnable state. |
| Catalogue: Collections are smart pointers | **ARCH-06** | Consistent: `Deref` is legitimate for a real smart pointer owning exactly one inner value. |
| Catalogue: Finalisation in destructors | **STATE-7/11-15**, ERR-23 | Published rules go deeper. |
| Catalogue: Privacy for extensibility (`#[non_exhaustive]`) | **API-15**, ERR-02, DATA-FMT-06 | Published rules name the specific type families. |
| Catalogue: Command; Generics as type classes; Builder | **ARCH-09**, API-08 | Covered by the dispatch ladder and the `Default`/builder rule; no dedicated ID warranted. |
| Catalogue: FFI (4 pages) | **nothing** | Genuine structural gap, deliberately not filled. This corpus *consumes* C APIs; the two `patterns/ffi/*` pages address *exporting* one. Worth its own small rule file if a C-facing export surface ever appears — see Open questions. |

### Contradictions resolved in this revision

- **Candidate 16 (a blanket-impl trait to name a repeated closure bound) contradicts ARCH-07 as written.** ARCH-07 requires a second real implementation or an exercised test double before a trait exists, and verifies with `rg -c 'impl T for'`. An alias trait — `trait Getter { … }` plus `impl<F: FnMut() -> Result<T, E>> Getter for F` — has exactly one `impl` line and no mock, so ARCH-07 flags it, wrongly: the blanket impl means *every* matching closure implements it, which is the opposite of the one-implementor abstraction ARCH-07 exists to stop. **Resolution: ARCH-07 gains a carve-out for blanket-impl alias traits, rather than this becoming a new rule.** The carve-out is in the promotion list; no new ID.
- **Candidate 7 vs ARCH-10, resolved as a carve-out** — see the dropped-candidates table above.
- **The sweep marks candidate 2 (typestate) "already reflected" against ARCH-09.** It is not; ARCH-09 governs how a call reaches an implementation, not which calls are legal in which order. ARCH-24 is new.

## Applied to OCX

Evidence from `ocx-codebase-audit/*` where the audit covers it, and from direct greps of `/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` where it does not (the audit measured architecture, errors, and security posture — it did not measure any of the code-shape constructs in this group).

### Satisfied

- **IDIOM-08 scope greps, both trees.** Zero `#![allow(...)]` inner attributes and zero `#[allow]` above a `mod`/`impl` across `ocx/crates/*/src` and `grimoire/src`. Every one of the 181 suppressions is item- or expression-scoped. This is the good half of the picture.
- **IDIOM-09, both trees.** Zero `#[allow(static_mut_refs)]`, zero `#[allow(unsafe_op_in_unsafe_fn)]`. `ocx_shim` — the raw WinAPI launcher, 34 `unsafe` occurrences in `ocx/crates/ocx_shim/src/main.rs` — declares no `unsafe fn` and no `static mut` at all. `grimoire` goes further with `unsafe_code = "forbid"` (`grimoire/Cargo.toml:123`, corroborated at [errors-async-security.md:35](ocx-codebase-audit/errors-async-security.md)).
- **IDIOM-07 in grimoire, effectively.** Two non-test globs: `grimoire/src/main.rs:276` (`use tracing_subscriber::prelude::*` — trait-only prelude, the sanctioned carve-out) and `grimoire/src/oci/identifier.rs:481` (`use RepositoryPathIssue::*` inside a function — enum-variant scope, one-expression blast radius). Neither is the semver hazard the rule targets.
- **IDIOM-06 for the newtype derefs.** `PinnedIdentifier` → `Identifier` (`ocx/crates/ocx_lib/src/oci/pinned_identifier.rs:60`, mirrored at `grimoire/src/oci/pinned_identifier.rs:62`) and `ValidMetadata` → `Metadata` (`ocx/crates/ocx_lib/src/package/metadata/validation.rs:129`) are transparent newtypes over their own inner value, with explicit `as_identifier()`/`From` escape hatches alongside. Legitimate; do not flag.
- **IDIOM-13, both trees, effectively.** Exactly two `&String` parameters exist across `ocx/crates/*/src` and `grimoire/src` — `fn try_from(value: &String)` in each tree's `oci/digest.rs` (`ocx/crates/ocx_lib/src/oci/digest.rs:249`, `grimoire/src/oci/digest.rs:215`). Both are `TryFrom` impls, which is the signature the trait dictates and which `clippy::ptr_arg` deliberately exempts. Zero `&Vec<T>`, zero `&Box<T>`. This rule has no live surface here.
- **STATE-36 is already partly practised.** 22 `mem::take`/`mem::replace` call sites across the two trees. The rule is about the cases that went the other way, not a greenfield introduction.
- **ARCH-24 — no typestate anywhere in either tree, and nothing misusing `PhantomData` either.** All 13 `PhantomData` occurrences are payload-type markers on `LockedJsonFile<T>`/`LockedTomlFile<T>` (`ocx/crates/ocx_lib/src/utility/fs/locked_file.rs:288,371`) and `DirWalker<T>` (`utility/fs/dir_walker.rs:125`). Like IDIOM-09, this rule is prophylactic: it exists so the next lifecycle-shaped type is considered at design time, not so an existing one is rewritten.
- **IDIOM-14's downcast grep, both trees.** 34 `downcast_ref` hits, concentrated in `utility/fs/assemble.rs` (6), `project/resolve.rs` (6), `cli/classify.rs` (3) and `grimoire/src/cli/printer.rs` (3). All are `std::error::Error` chain inspection or starlark value extraction — neither is visitor-shaped traversal, and neither is a finding. No `accept`/`visit` trait exists in either tree.

### Violated

- **IDIOM-05 — five required lints absent everywhere.** ocx's `[workspace.lints]` is deliberately empty (`ocx/Cargo.toml:225-227`, "overrides belong in each crate's own `[lints.clippy]` section"), and all four member crates inherit it via `workspace = true`. grimoire's `[lints]` has exactly three entries: `unsafe_code = "forbid"`, `unwrap_used = "warn"`, `expect_used = "warn"` (`grimoire/Cargo.toml:119-129`). None of `let_underscore_must_use`, `let_underscore_lock`, `let_underscore_future`, `wildcard_imports`, `allow_attributes` is enabled in either tree.
- **IDIOM-04 — the largest live surface, no convention.** `to_string_lossy`: 84 in `ocx_lib/src`, 7 in `ocx_cli/src`, 34 in `grimoire/src`. `unwrap_or_default`: 53 / 28 / 54. The audit already blocks `let _`/`.ok()` without a comment ([rules-inventory.md:126](ocx-codebase-audit/rules-inventory.md)) but says nothing about these two, and no lint covers them. With 1,664 + 906 `std::fs`/`tokio::fs` call sites ([crate-architecture.md:220-221](ocx-codebase-audit/crate-architecture.md)) and tarball entry names arriving from a remote registry, the lossy-path subset is the concrete corruption path.
- **IDIOM-08 reason clause.** 181 `#[allow(...)]` across both trees; **5** carry `reason = "..."`. `#[expect]` appears 4 times, all in `ocx_lib`. 97% of suppressions are undocumented.
- **IDIOM-07 in ocx, two genuine hits.** `ocx/crates/ocx_lib/src/ci/github_flavor.rs:10` and `gitlab_flavor.rs:10` both `use crate::log::*;` — a module glob over a non-prelude module, which is exactly the shape a later addition to `crate::log` can collide with.
- **ARCH-23 — `PackageManager` is the textbook Compose Structs case, and nobody has looked at it that way.** 10 fields against 603 methods and 23 `impl` blocks (`ocx/crates/ocx_lib/src/package_manager.rs:319`). The fields already cluster by concern: `file_structure` + `index` + the redirected index home; `client` + `managed_config_client` + `default_registry`; `patches` + `patch_snapshot`; `progress` standing alone. That is four types, derived from the data rather than from a method-count target — and it is a different, more defensible split axis than ARCH-03's 25-method cap, which says only that the type is too big and nothing about where to cut.
- **IDIOM-06, one to review.** `ocx/crates/ocx_lib/src/cli/printer.rs:181` — `impl Deref for Style { type Target = console::Style; }`, wrapping a *foreign* type held in a `style` field. Not a newtype over its own value: the target's trait impls will not propagate to `Style`, so any future generic code bounded on a `console` trait silently rejects it. Reviewer call, but this is the one hit that matches the anti-pattern's shape.

### New commitments

- **Add the five IDIOM-05 lints to `ocx/Cargo.toml`'s `[workspace.lints]` and `grimoire/Cargo.toml`'s `[lints.clippy]`.** This contradicts ocx's stated "keep it empty, override per crate" policy (`ocx/Cargo.toml:225-227`) — resolved in favour of centralization: these five are correctness/hygiene lints that must apply uniformly, and per-crate duplication is precisely the failure `[workspace.lints]` exists to prevent. Per-crate overrides remain available for anything genuinely crate-specific.
- **IDIOM-04 becomes a Block-tier rule extension, not a new rule.** Fold `unwrap_or_default` and `to_string_lossy` into the existing "silent error swallowing" Block item ([rules-inventory.md:126](ocx-codebase-audit/rules-inventory.md)) rather than shipping a second, competing rule. Backfill of the ~260 existing sites is not required; the rule applies to new and touched lines.
- **Strike `Deref` from the `PackageManager` decomposition plan** ([crate-architecture.md:284](ocx-codebase-audit/crate-architecture.md)) — IDIOM-10. The 603-method / 23-`impl`-block split proceeds with explicit forwarding or direct call-site migration only.
- **Tighten `ocx_lib::prelude`** (`ocx/crates/ocx_lib/src/lib.rs:66-74`) to the four extension traits, moving `Error`/`Result` to explicit imports at the ~6 glob sites. Low priority — the prelude is already 2/3 compliant and the residue is two names in a first-party crate.
- **Give the `PackageManager` split a field axis, not just a method-count target** (ARCH-23). The decomposition plan at [crate-architecture.md:284](ocx-codebase-audit/crate-architecture.md) is driven by ARCH-03's 25-method cap, which says the type is too big and nothing about where to cut; the four field clusters above say where. Do this *before* choosing a delegation mechanism — the mechanism question (Open questions) is much smaller once the cut is derived from data rather than from method names.
- **ARCH-07 gains a blanket-impl carve-out** so an alias trait over a repeated closure bound stops reading as a one-implementor abstraction. Text change only, no new ID; see the promotion list.
- **IDIOM-13 is deliberately not promoted.** `clippy::ptr_arg` is warn-by-default and already covers it, and the corpus has zero genuine hits. Recorded so the next sweep does not re-discover it as an uncovered catalogue page.

## AI-agent failure modes

Ranked by how often it bites, most frequent first.

1. **Reaching for `.unwrap_or_default()` / `.ok()` / `to_string_lossy()` to make a type error or an `unused_must_use` warning disappear.** The path of least resistance that also compiles silently. Highest frequency by a wide margin, and the 260+ existing call sites in ocx/grimoire show it is not hypothetical. Cheapest catch: IDIOM-04's grep restricted to added lines in the diff.
2. **Emitting `&str` where the enum exists.** The agent starts with `&str` because it does not know the full variant set while drafting, the code compiles, and the enum is never retrofitted. Catch on new function signatures only (`git diff --unified=0 | grep -E '^\+.*fn .*: *&str'`), not on the whole codebase — the whole-codebase form is unactionable noise.
3. **Returning `Option`/`Result` mirroring the single call site it just wrote.** Invisible on the PR that introduces it; the damage lands on the PR that adds call site two with a different fallback. Only diff-time check that works: compare the two call sites' post-call shape.
4. **Suppressing a lint the moment `cargo clippy` or `cargo build` blocks progress.** The allow is the shortest textual edit that satisfies the tool and the agent bears no cost for a warning it will never see fire again. This is the mode IDIOM-08 and IDIOM-09 exist for, and the only one where a bare `grep -c` exit-code gate is sufficient with no model in the loop. Lower frequency than 1-3, far higher severity: IDIOM-09's variant converts a build failure into shipped UB.
5. **`use super::*` / `use crate::foo::*` to skip writing an import list.** Mechanically caught by `wildcard_imports` once IDIOM-05 lands, so it stops being an agent problem the moment the lint is on.
6. **`Deref` as inheritance.** The agent has seen far more legitimate newtype `Deref` than it has understood the trait-bound caveat, and reaches for it whenever a struct has-a another and wants its methods. Lowest frequency here — but note it is the shape the audit's own decomposition plan proposed, so the failure is not exclusive to machines. Sharpest signal: a diff that adds a `Deref` impl *and* touches a generic bound on the target type.
7. **Scaffolded dispatch that never runs.** The agent emits the full `trait State { fn handle(&self, …); }` and every impl — it compiles and reads complete — then hits a self-borrow conflict wiring the real call site (`&mut self.state` while also needing `&mut self`), routes around it with a string/tag `match` to free functions, and never deletes the now-inert trait. Verified in the book's own reference code, twice, in two different patterns. Sharpest signal: a trait method with N impls and zero call sites. IDIOM-14.
8. **`.clone()` where `mem::take` was the move.** A subspecies of failure mode 1 with a specific correct answer: the agent clones a field to get a value out from behind `&mut`, then overwrites the field two lines later. `redundant_clone` cannot see it — the clone *is* used. STATE-36.
9. **Reaching for `RefCell`/`Arc<Mutex>`/`.clone()` when the borrow checker names two field paths.** The compiler has just pointed at the seam and the agent patches around it, because splitting a struct is a bigger diff than adding a wrapper. This is the single case where the smallest diff is reliably the wrong one. ARCH-23.
10. **Citing a book title that fits a real series' naming pattern.** "Hands-On Design Patterns with Rust" does not exist — Packt's real series covers C++, Java, Kotlin, C#, and Julia, and an agent completes the pattern confidently. Resolve any title to an ISBN or a real repo before repeating it. Generalizes past books: the same completion instinct invents crate names, RFC numbers, and clippy lints (`clippy::pub_use`, already noted in `architecture.md`).

## Open questions

- **`ownership-shapes-clones-and-interior-mutability` is the gap this group leaves.** `.clone()` to dodge the borrow checker is the map's own **high**-priority, most-cited LLM failure ([topic-map.md:129](topic-map.md)) and this group produced nothing on it. It is commissioned as wave topic 6 ([topic-map.md:212](topic-map.md)); confirm that wave lands before these rules ship, or the ruleset published as "Rust idioms" will conspicuously omit the number-one idiom failure.
- **Deserves another research round: the false-positive economics of unattended review.** Every SHOULD rule here assumes a reviewer answers a judgement question. Nobody has measured what an autonomous agent's precision actually is on IDIOM-03 (stringly-typed) and IDIOM-06 (Deref) given only the reviewer question — and a rule that fires wrongly 40% of the time trains the agent to ignore the whole ruleset. Specific brief: run IDIOM-03/04/06 over a labelled sample of ocx+grimoire hits (the 84 `to_string_lossy`, 5 `Deref` impls, and a sampled 50 `&str` parameters are ready-made), measure precision, and either add a discriminating sub-condition or demote the rule to CONSIDER. This is the highest-value follow-up in this group.
- **Deserves another research round: delegation mechanics for the `PackageManager` split — narrowed, not closed, by ARCH-23.** IDIOM-10 forbids `Deref` but names no replacement beyond "hand-written forwarding", and hand-writing forwarders for 603 methods is not a plan. ARCH-23 shrinks the question: split along the four field clusters first and most methods move *with* their fields rather than needing a forwarder at all, so the delegation surface is whatever is genuinely cross-cutting after the cut — plausibly small enough that a macro is unnecessary. What is still unmeasured is how large that residue actually is. Concrete next step, cheap: partition `package_manager.rs`'s 603 methods by which of the four field clusters each one touches, and count the methods touching two or more. That number decides whether `delegate`/`ambassador`, a trait per concern, or straight call-site migration is right — and it is a scripted count, not a research round.
- **Is the `#[allow]` → `#[expect]` migration worth doing in bulk?** 176 undocumented suppressions. IDIOM-08 currently says new-and-touched-code only. A bulk migration is mechanically feasible (`cargo clippy --fix` does not do it; a script could) and would immediately surface every stale suppression — but produces one enormous diff. No source surveyed addresses migration strategy at this scale.
- **Does `wildcard_imports`'s built-in prelude heuristic actually exempt `crate::prelude`?** The lint special-cases prelude modules by path name, but whether a *first-party* `crate::prelude` is exempted or flagged determines whether enabling it in IDIOM-05 immediately produces 6 warnings in `ocx_lib`. Verify before landing the lint, not after.
- **What is the right rule for `.ok()` on a genuinely uninformative error?** IDIOM-04's comment requirement is a receipt, not a decision procedure. If a codebase accumulates 50 `// error is uninformative` comments, the convention has decayed into ritual. No surveyed source proposes a stronger discriminator.
- **The FFI gap is real and deliberately unfilled.** Four rust-unofficial pages (`idioms/ffi/*`, `patterns/ffi/*`) are current, correct, and reflected nowhere in this corpus. SEC-01 carves out "named FFI/platform API" exemptions from `unsafe_code = "forbid"` and then says nothing about how to shape the exemption. Not promoted here because the two `patterns/ffi/*` pages are about *exporting* a C API, which neither tree does — `ocx_shim`'s 34 `unsafe` occurrences are all WinAPI *consumption*. The trigger to revisit: any crate in either tree gaining an `extern "C"` export. SEC-04 already exists for the `catch_unwind` half, which is evidence the corpus expects that day to come.
- **Is ARCH-24 (typestate) worth a published line with zero live instances?** It is the only rule added in this revision whose entire justification is design-time prophylaxis, and unlike IDIOM-09 — where the failure mode is one greppable attribute and the cost of a false negative is shipped UB — a missed typestate opportunity is invisible and its cost is diffuse. It sits at the bottom of the promotion list for exactly this reason. If `architecture.md` needs a line back, cut this first.

## Sub-artifacts

- [rust-idioms-and-patterns/code-shape-review-heuristics.md](rust-idioms-and-patterns/code-shape-review-heuristics.md) — seven grep/clippy-checkable code-shape rules (push-ifs-up, stringly-typed, silent-data-loss defaults, Deref-as-inheritance, glob imports, blanket `#[allow]`, and the `static_mut_refs`/`unsafe_op_in_unsafe_fn` special case) with per-rule false-positive rates and the LLM-authorship angle for each. Source of IDIOM-01..10.
- [rust-idioms-and-patterns/book-length-pattern-treatments.md](rust-idioms-and-patterns/book-length-pattern-treatments.md) — chapter-by-chapter currency audit of Packt's *Design Patterns and Best Practices in Rust* (April 2026 cover date, mid-2024 code) with two implementation-fidelity bugs in its own reference code; era assessments of six other book-length titles and one hallucinated title; a GoF→Rust translation table; and a **full page-by-page sweep of the rust-unofficial/patterns catalogue** cross-checked against every published `rust-quality/*` rule family. Source of ARCH-23, ARCH-24, STATE-36, IDIOM-13..15, DOC-21, the collision table, and the three "now-bad-advice" findings.

## Key sources

| URL | What it is | Why it matters here |
|---|---|---|
| [matklad, "Push Ifs Up and Fors Down"](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html) | Design essay, 2023-11-15 | Canonical statement behind IDIOM-01 and IDIOM-02 |
| [corrode.dev, "When Rust Gets Ugly"](https://corrode.dev/blog/ugly/) | Consultancy blog, 2026-07-17 | Source for IDIOM-03 and IDIOM-04, with a worked stringly-typed→enum refactor |
| [corrode.dev, "Don't Use Preludes and Globs"](https://corrode.dev/blog/dont-use-preludes-and-globs/) | Consultancy blog, 2024-07-29 | The semver-collision argument for IDIOM-07, plus its own Rayon/test carve-outs and the Bevy/Tokio counter-position |
| [rust-unofficial patterns, "Deref polymorphism"](https://rust-unofficial.github.io/patterns/anti_patterns/deref.html) | Community anti-pattern reference, living | The trait-bound-non-propagation failure behind IDIOM-06 and IDIOM-10 |
| [rust-unofficial patterns, anti-patterns index](https://rust-unofficial.github.io/patterns/anti_patterns/index.html) | Same reference, index | Defines the term as used above; entry point for the Deref page |
| [Rust 1.81.0 release notes](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/) | Official release announcement, 2024-09-05 | `#[expect]` stabilization and the intended `#[allow]` migration pattern (IDIOM-08) |
| [RFC 2383, "lint reasons"](https://rust-lang.github.io/rfcs/2383-lint-reasons.html) | Accepted RFC | States why unexplained suppressions drift out of sync — the rationale for `reason = "..."` |
| [Clippy lint index, `allow_attributes`](https://rust-lang.github.io/rust-clippy/master/index.html#allow_attributes) | Official Clippy docs | The lint enforcing IDIOM-08 mechanically; restriction group, opt-in |
| [rust-clippy source, `let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs) | Clippy lint source | Exact behaviour and default group of the three `let_underscore` lints (IDIOM-05) |
| [rust-clippy source, `wildcard_imports.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/wildcard_imports.rs) | Clippy lint source | `wildcard_imports` behaviour and its prelude/test carve-outs (IDIOM-05, IDIOM-07) |
| [rustc lint listing, warn-by-default (`static_mut_refs`)](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html) | Official rustc reference | Exact wording and suggested fix behind IDIOM-09 |
| [rustc lint listing, allowed-by-default (`unsafe_op_in_unsafe_fn`)](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | Official rustc reference | The unsafe-block-granularity half of IDIOM-09 |
| [std docs, `OsStr::to_string_lossy`](https://doc.rust-lang.org/std/ffi/struct.OsStr.html#method.to_string_lossy) | Official stdlib docs | Confirms U+FFFD substitution is documented behaviour, not folklore (IDIOM-04) |
| [rust-unofficial patterns, `SUMMARY.md`](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md) | The catalogue's own table of contents, fetched raw | Ground truth for the page-by-page sweep — enumeration came from the book, not from memory |
| [rust-unofficial, "Compose Structs"](https://rust-unofficial.github.io/patterns/patterns/structural/compose-structs.html) | Community pattern reference | ARCH-23; the only catalogue page with no counterpart anywhere in this corpus |
| [rust-unofficial, "mem::{take, replace}"](https://rust-unofficial.github.io/patterns/idioms/mem-replace.html) | Community idiom reference | STATE-36 — the replacement for the borrow-checker clone STATE-24 forbids |
| [rust-unofficial, "Return consumed argument on error"](https://rust-unofficial.github.io/patterns/idioms/return-consumed-arg-on-error.html) | Community idiom reference | IDIOM-15; `String::from_utf8`/`FromUtf8Error::into_bytes` is the std instance |
| [rust-unofficial, "Use borrowed types for arguments"](https://rust-unofficial.github.io/patterns/idioms/coercion-arguments.html) | Community idiom reference | IDIOM-13 — recorded, not promoted; `clippy::ptr_arg` already covers it warn-by-default |
| [rust-unofficial, "Easy doc initialization"](https://rust-unofficial.github.io/patterns/idioms/rustdoc-init.html) | Community idiom reference | DOC-21 |
| [rust-unofficial, "Avoid complex type bounds with custom traits"](https://rust-unofficial.github.io/patterns/patterns/structural/trait-for-bounds.html) | Community pattern reference | The ARCH-07 blanket-impl carve-out |
| [PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust](https://github.com/PacktPublishing/Design-Patterns-and-Best-Practices-in-Rust) | Companion code for the primary book target | Directly readable evidence for IDIOM-14 (ch8 `state.rs`, `visitor.rs`) and ARCH-24 (ch10 `typestate_consumer.rs`); repo created 2024-06-12, MSRV 1.78, edition 2021 throughout |
| [Clippy lint index, `ptr_arg`](https://rust-lang.github.io/rust-clippy/master/index.html#ptr_arg) | Official Clippy docs | Establishes that IDIOM-13 is already mechanized by default, and that trait impls are exempt |

## Revision log

### 2026-08-14 — folded `book-length-pattern-treatments.md`

`code-shape-review-heuristics.md` was already folded by the original consolidation and was not re-processed. Only the book artifact is new in this revision.

**IDs added (7).** ARCH-23 (Compose Structs), ARCH-24 (typestate), STATE-36 (`mem::take`/`mem::replace`), IDIOM-13 (borrowed argument types), IDIOM-14 (declared dispatch must run), IDIOM-15 (return the consumed argument on error), DOC-21 (doctest initialization helper). Each takes the ID of the published family it will land in, continuing that file's numbering, so no ID changes at promotion time. IDIOM-11 and IDIOM-12 already exist in `api-and-idioms.md` from another wave; the new IDIOM numbering starts at 13 to avoid them.

**IDs changed in place (0 rules, 2 verdict items).** No existing rule's number, text, severity or meaning changed — IDIOM-01..10 are untouched, and nothing in the fold contradicted any of them. Two verdict items were corrected because the fold falsified them: item 1 ("this group shipped **one** sub-artifact" → two, plus a pointer to the two clone-adjacent additions and why they are not a clone policy) and item 2 ("Ten rules survive" → seventeen). The `## Sub-artifacts` entry for `code-shape-review-heuristics.md` lost the phrase "the group's only sub-artifact" for the same reason.

**IDs dropped (0).** No published or existing rule was withdrawn.

**Candidates rejected (5), merged (1), redirected (1).** Rejected with reasons in the dropped-candidates table: 6 (decorator forwarding tax — arbitrary threshold, no live surface), 7 (prefer RPITIT — inverse of ARCH-10, recorded as a carve-out instead), 8 (no hand-rolled `Monad` — IDIOM-12 is the general form), 10 (match guards over nested `if let` — style, no surviving verification), 12 (document your simplified teaching code — this corpus ships none). Candidate 5 (no `downcast_ref` bypass of `accept`/`visit`) merged into IDIOM-14 as its second grep rather than becoming its own ID, because it is candidate 3's defect at a different scale. Candidate 16 (custom trait for complex bounds) redirected to an ARCH-07 text amendment — see contradictions.

**Collisions recorded (15), no second IDs minted.** Candidate 1 → EVO-8; candidate 4 → ARCH-09; candidate 9 → STATE-1..17; candidate 11 → ARCH-09. Catalogue pages: Deref polymorphism → ARCH-06/IDIOM-10; Clone-to-satisfy-borrowck → STATE-24; `#[deny(warnings)]` → LINT-01/02/03; Prefer Small Crates → ARCH-19/20; unsafe modules → SEC-01/02; Newtype → ARCH-04/API-10; `Default` → API-08; Collections as smart pointers → ARCH-06; Finalisation in destructors → STATE-7/11-15 and ERR-23; Privacy for extensibility → API-15/ERR-02/DATA-FMT-06; Command + Generics-as-type-classes + Builder → ARCH-09/API-08. Where the published rule is the stricter of the two, the table says so, so a later reader of the community page does not weaken it. The FFI pages are recorded as a genuine uncovered gap, deliberately not filled.

**Contradictions resolved (3).** (a) Candidate 16 contradicts ARCH-07 as written — a blanket-impl alias trait has one `impl` line and no test double, so ARCH-07's verification flags it, wrongly; resolved as an ARCH-07 carve-out, not a new rule. (b) Candidate 7 reads as the inverse of ARCH-10; resolved by scoping ARCH-10 explicitly to traits that are *also* used as `dyn`. (c) The sweep files candidate 2 (typestate) as "already reflected via ARCH-09"; it is not — ARCH-09 governs how a call reaches an implementation, not which calls are legal in which order — so ARCH-24 is new.

**Open questions changed.** The delegation-mechanics question was narrowed from a research round to a scripted count (partition `package_manager.rs`'s 603 methods by field cluster, count the cross-cutting ones) because ARCH-23 supplies the split axis. Three added: the FFI gap and its revisit trigger, whether ARCH-24 earns a line with zero live instances, and IDIOM-13's exclusion rationale.

## Promotion list for published rules

Ranked, cut from the bottom. Line budget at the time of writing: `api-and-idioms.md` 149/170, `architecture.md` 137/170, `docs-and-tracing.md` **168/170** — the docs file has two lines of headroom, so item 7 must displace something rather than be added, and that is the orchestrator's call, not this file's.

**1 — ARCH-23** → `architecture.md`, *Where Behaviour Lives* (after ARCH-03).

> \| ARCH-23 \| When the borrow checker rejects two simultaneous borrows through one struct and each field path would type-check alone, split the struct along that seam — never reach for `.clone()`, `RefCell` or `Arc<Mutex>` instead. The compiler has named the cut; STATE-21/23/24 forbid the three ways of ignoring it and none of them names the fix. Distinct from ARCH-01/03: those push work *into* a type on a method count, this pushes fields *out* of one on a compiler error. \| No lint — the trigger is an E0499/E0502 citing two field paths off one receiver. On a diff, the failure signal is a borrow-checker fix that adds a wrapper instead of moving a field \| SHOULD \|

**2 — STATE-36** → `api-and-idioms.md`, *Choosing an Ownership Shape* (directly after STATE-24).

> \| STATE-36 \| Take a value out from behind `&mut` with `mem::take`/`mem::replace` — `Option::take` for `Option` fields — never with a clone you then overwrite. The placeholder allocates nothing for `String`/`Vec`/`HashMap`/`Option`, and the clone leaves a stale second copy live for the rest of the scope, which is exactly where STATE-24's divergence bug starts. \| `rg -n -A3 '\.clone\(\)' <src>`, keeping hits where the same place expression is assigned within a few lines. `redundant_clone` cannot see this — the clone is genuinely used before the overwrite \| SHOULD \|

**3 — IDIOM-14** → `api-and-idioms.md`, *Reviewing Code Shape*.

> \| IDIOM-14 \| Declared dispatch must be the dispatch that runs. A trait method implemented by every impl and called by none, or a `downcast_ref` chain doing the traversal a declared `accept`/`visit` was supposed to do, is scaffolding left beside a hand-written duplicate: the next variant must then be added twice, and the trait tells every reader the wrong control flow. \| Per trait method, `rg -n '\.<method>\(' <src>` outside its own trait and impls — N impls with zero call sites is the finding. Then `rg -n 'downcast_ref' <src>` restricted to `visit`-named functions; error-chain and dynamic-value downcasts are not this \| SHOULD \|

**4 — ARCH-07 amendment** → `architecture.md`. Text change to the existing rule, **no new ID**, no added line. Append to ARCH-07's rule cell:

> Exempt: a blanket-impl alias trait that names a repeated `Fn`/`FnMut` bound and is implemented for every closure matching it — one `impl` line and no double by construction, but an open implementor set, which is the opposite of what this rule stops.

**5 — IDIOM-15** → `api-and-idioms.md`, *Reviewing Code Shape*.

> \| IDIOM-15 \| A fallible function that consumes its argument returns that argument inside the `Err` — `String::from_utf8` and `FromUtf8Error::into_bytes` are the std instance. Without it every caller that might retry clones defensively before *every* attempt, including the ones that succeed. \| On a new value-consuming `fn f(x: T) -> Result<U, E>`: is any call site inside a retry loop (PKG-16)? If yes, `E` carries `T`. Retrofitting it later is a wire change for a `#[non_exhaustive]` error type \| CONSIDER \|

**6 — ARCH-24** → `architecture.md`, *Where Behaviour Lives*.

> \| ARCH-24 \| Encode a state machine's legal transitions as types when the transition graph is known at compile time: one marker type per state, each transition consuming `self` and returning the next type, each operation defined only on the states where it is legal. ARCH-05's argument — enum over `bool` for a closed set — applied to sequences instead of values. \| Trigger: an enum field named `state`/`phase`/`status` read by a `match` at the top of three or more methods, each carrying an "invalid in this state" arm. Applied, the illegal call becomes a `cargo build` error rather than a runtime check \| CONSIDER \|

**7 — DOC-21** → `docs-and-tracing.md`, *Rustdoc Contract*. **Requires displacing an existing line** (file is at 168/170).

> \| DOC-21 \| Factor repeated doctest setup into one hidden helper the examples call, rather than re-hiding the same construction in every example's `# ` lines — the copies drift until one stops compiling and the others still pass. Complements DOC-06, which governs doctest safety rather than duplication. \| Three or more doctests on one type whose hidden `# ` lines rebuild the same value \| CONSIDER \|

**Promotion outcome, 2026-08-14.** Items 1–6 landed: ARCH-23 and ARCH-24 in
`architecture.md` (now 139 lines), the ARCH-07 carve-out appended in place,
STATE-36, IDIOM-14 and IDIOM-15 in `api-and-idioms.md` (now 152). Item 7
(DOC-21) was **deferred, not rejected** — `docs-and-tracing.md` is at 168/170
and no existing line there was worth displacing for a CONSIDER. It keeps its
ID; promote it the next time that file is opened for a revision that frees a
line.

**Not promoted — IDIOM-13** (borrowed argument types, `&str` over `&String`). `clippy::ptr_arg` is style/warn-by-default and already covers `&String`/`&Vec<T>`/`&PathBuf`/`&Cow<_>` in argument position, correctly exempting trait impls; `&Box<T>` needs pedantic `borrowed_box`. The corpus's only two `&String` parameters are `TryFrom` impls, which the lint exempts by design. A published line would restate a default. Kept here with a stable ID so the next catalogue sweep does not re-discover it as uncovered.
