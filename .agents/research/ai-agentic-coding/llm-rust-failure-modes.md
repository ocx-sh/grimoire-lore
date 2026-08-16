---
title: How LLMs Fail at Rust
topic: LLM coding agents and Rust-specific failure modes
agent: rust-failure-modes-researcher
model: sonnet
date_researched: 2026-08
sources_count: 15
scope: >
  Covers measured benchmark performance of LLMs on Rust code generation/repair,
  the borrow-checker/compiler-feedback failure class, hallucination classes
  (crates, APIs, editions), patterns that compile but are wrong, and evidence
  for what mitigations help. Does not cover general (non-Rust) LLM code-gen
  benchmarks, IDE/tooling UX, or non-agentic (human-only) Rust style guides
  except where directly relevant to agent guidance.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Benchmarks: measured pass rates and failure taxonomies](#1-benchmarks-measured-pass-rates-and-failure-taxonomies)
   2. [The borrow-checker / compiler-feedback failure class](#2-the-borrow-checker--compiler-feedback-failure-class)
   3. [Hallucination classes in Rust](#3-hallucination-classes-in-rust)
   4. [Patterns that compile but are wrong](#4-patterns-that-compile-but-are-wrong)
   5. [What actually helps](#5-what-actually-helps)
   6. [Is Rust a good or bad target for agentic coding?](#6-is-rust-a-good-or-bad-target-for-agentic-coding)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- On RustEvo², the strongest model (Claude-3.7-Sonnet) hit only 65.3% pass@1 on Rust API-evolution tasks; average success on *behavioral* API changes (semantics changed, signature unchanged) was 38.0%, the hardest category measured — [RustEvo² paper](https://arxiv.org/abs/2503.16922).
- Models score far worse on APIs released after their training cutoff (32.5% pass@1) than on pre-cutoff APIs (56.1%), and RAG narrows but does not close that gap (+13.5 points average) — [RustEvo² paper](https://arxiv.org/abs/2503.16922).
- On Rust-SWE-bench (500 real repo-level issues, 34 repos), the best agent+model combo (RUSTFORGER + Claude-Sonnet-3.7) resolved only 28.6% of issues; plain ReAct-style agents topped out at 21.2% — full repos are much harder than synthetic snippets — [Rust-SWE-bench paper](https://arxiv.org/abs/2602.22764).
- The Rust-SWE-bench authors attribute most failures to repository-wide code comprehension and issue reproduction, not raw language syntax — compiling Rust correctly is necessary but not sufficient — [Rust-SWE-bench paper](https://arxiv.org/abs/2602.22764).
- Rust's compiler *is* an unusually good iterative-repair signal: Microsoft's RustAssistant fixed 92.6% of micro-benchmark compile errors and 91.5% of real-world crate errors with GPT-4 in a compiler-feedback loop, and most fixes converged within 2-4 iterations (worst case 15) — [RustAssistant paper](https://arxiv.org/abs/2308.05177).
- RustAssistant found performance "fairly consistent" across error categories (ownership, lifetimes, traits, generics, types) — the compiler-loop advantage is not confined to simple syntax errors — [RustAssistant paper](https://arxiv.org/abs/2308.05177).
- Package hallucination is a real, measured supply-chain risk: across 576,000 generated code samples on 16 models, commercial models hallucinated nonexistent packages at ≥5.2%, open-source models at 21.7%, with 205,474 unique hallucinated names produced — the "slopsquatting" attack surface this creates is concrete, not hypothetical — [package hallucination paper](https://arxiv.org/abs/2406.10279).
- RustEvo² documents models defaulting to *legacy idioms even when a safe stabilized API exists* — e.g. Claude-3.5-Sonnet writing manual `unsafe` pointer casts instead of the stabilized `slice::first_chunk_mut` — a pattern of unnecessary `unsafe` from stale training data — [RustEvo² paper](https://arxiv.org/abs/2503.16922).
- `std::env::set_var`/`remove_var` became `unsafe fn` in Rust 2024 edition because no OS-level thread-safe way to mutate the process environment exists on Unix; a model trained pre-edition-2024 will emit these as safe calls — [`std::env::set_var` docs](https://doc.rust-lang.org/std/env/fn.set_var.html).
- `async fn` in traits stabilized in Rust 1.75 (Dec 2023) but **still cannot** back a `dyn Trait` — the `async-trait` crate/macro remains required whenever the trait is used as a trait object, so "just remove async-trait" is only sometimes correct advice — [async-trait docs](https://docs.rs/async-trait/latest/async_trait/).
- `rand` 0.9 renamed almost the entire public surface a model is likely to have memorized from 0.8: `gen()`→`random()`, `gen_range()`→`random_range()`, `thread_rng()`→`rng()`, `distributions`→`distr`, `Standard`→`StandardUniform` — pre-0.9 training data produces code that does not compile against a fresh `cargo add rand` — [rand CHANGELOG](https://github.com/rust-random/rand/blob/master/CHANGELOG.md).
- Tokio's own docs state the core async failure mode plainly: any blocking call before an `.await` — including one hidden inside a synchronous `Drop` impl — stalls the whole worker thread and every other task scheduled on it, not just the caller — [Tokio task docs](https://docs.rs/tokio/latest/tokio/task/index.html).
- clippy's `unwrap_used`/`expect_used`-class lints live in the `restriction` group, which the tool itself warns is **not** meant to be enabled wholesale — cherry-picking is the intended usage, so a blanket "deny restriction" config is itself a smell — [clippy restriction group docs](https://doc.rust-lang.org/clippy/lints.html).
- Multilingual HumanEval-style ports put Rust noticeably behind Python for the same model (GPT-4: 52.5% pass@1 on Rust English prompts vs. much higher Python scores), consistent with Rust being a genuinely harder generation target, not just an under-benchmarked one — [HumanEval-XL paper](https://arxiv.org/pdf/2402.16694).
- No published evidence found (in this pass) of Rust-specific numbers from Aider's polyglot leaderboard — it reports only an aggregate score across C++/Go/Java/JavaScript/Python/Rust, so per-language Rust pass rates from that benchmark cannot be cited from primary data — treat any such claim as unverified until Aider publishes a breakdown — [Aider leaderboards](https://aider.chat/docs/leaderboards/).
- `error-chain` and `failure` predate Rust's now-standard `anyhow` (applications) + `thiserror` (libraries) split; a model trained on older tutorials will suggest the deprecated crates by default — [anyhow docs](https://docs.rs/anyhow/latest/anyhow/).
- The single highest-leverage mechanical intervention across every primary source gathered here is the same one: put the compiler (and ideally clippy) in the loop and iterate on its literal output — every paper that measured this found rapid convergence — [RustAssistant paper](https://arxiv.org/abs/2308.05177), [RustEvo² paper](https://arxiv.org/abs/2503.16922).

## Findings

### 1. Benchmarks: measured pass rates and failure taxonomies

**RustEvo² (API-evolution benchmark).** RustEvo² synthesizes 588 real Rust API changes (380 stdlib, 208 from 15 third-party crates) across four categories — Stabilizations, Signature Changes, Behavioral Changes, Deprecations — into natural-language programming tasks, then checks whether generated code both compiles and uses the *correct, current* API rather than a plausible old one ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).

Measured pass@1 by model:

| Model | Pass@1 | API-usage accuracy | Coverage |
|---|---|---|---|
| Claude-3.7-Sonnet | 65.3% | 78.2% | 83.6% |
| o1-mini | 57.5% | 70.4% | 85.2% |
| GPT-4o | 55.4% | 68.4% | 77.2% |
| Gemini-1.5-Pro | 55.3% | 62.6% | 60.9% |
| DeepSeek-v3 | 54.8% | 69.7% | 71.0% |
| Gemini-2.0-Flash | 52.6% | 73.5% | 72.5% |
| Llama-3.1-70B | 51.0% | 65.3% | 69.0% |
| Qwen-2.5-72B | 50.9% | 66.7% | 64.7% |
| Claude-3.5-Sonnet | 48.1% | 68.7% | 80.3% |
| Grok-3 | 40.5% | 67.2% | 70.4% |

By category, average success is 65.8% on stabilizations vs. 38.0% on behavioral changes — models are much better at "a function got a new required argument" than "the same signature now means something different." Pre-cutoff APIs score 56.1% vs. 32.5% post-cutoff; retrieval augmentation (feeding the current doc into context) recovers +13.5 points on average but does not close the gap ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).

**Rust-SWE-bench (repository-level issue resolution).** 500 real GitHub issues across 34 Rust repositories, evaluated with four agent scaffolds × four frontier models. Best result: the purpose-built RUSTFORGER agent with Claude-Sonnet-3.7 resolved 28.6% of issues (a 34.9% relative improvement over the strongest generic baseline); plain ReAct-style agents topped out at 21.2%. The paper's own diagnosis is that failures cluster in *repository-wide comprehension* and *issue reproduction* — agents that never manage to reproduce the bug in a runnable test essentially never fix it correctly — rather than in raw Rust syntax competence ([arxiv 2602.22764](https://arxiv.org/abs/2602.22764)).

**Cross-language HumanEval ports.** HumanEval-XL reports GPT-4 at 52.50% pass@1 on Rust for English-language prompts — a large drop from GPT-4's Python HumanEval numbers in the same family of evaluations, consistent with Rust code generation being intrinsically harder for these models, independent of prompt language ([HumanEval-XL, arxiv 2402.16694](https://arxiv.org/pdf/2402.16694)).

**Aider polyglot benchmark.** Includes Rust as one of six languages (C++, Go, Java, JavaScript, Python, Rust) across 225 Exercism exercises, but the public leaderboard publishes only an aggregate correctness percentage per model, not a per-language breakdown — so no Rust-specific number can be cited from this source as of this research pass ([Aider leaderboards](https://aider.chat/docs/leaderboards/)). Treat any claim of "Aider's Rust score is X%" as unverified.

**Package hallucination at scale.** Across 576,000 generated code samples spanning 16 models (commercial and open-source), package hallucination rates were ≥5.2% for commercial models and 21.7% for open-source models, with 205,474 unique hallucinated package names produced overall. This is a cross-language study (not Rust-exclusive), but it is the primary empirical basis for slopsquatting risk assessment and directly generalizes to `crates.io` ([arxiv 2406.10279](https://arxiv.org/abs/2406.10279)).

### 2. The borrow-checker / compiler-feedback failure class

The headline finding from Microsoft Research's RustAssistant is that Rust's compiler diagnostics are unusually *actionable* for LLM-driven repair, not just unusually strict. RustAssistant runs a nested loop — outer loop over distinct errors, inner loop re-invoking the compiler on a single error group — with GPT-4 and GPT-3.5-turbo, terminating on success, a 100-unique-error cap, or a stalled error set. Results ([arxiv 2308.05177](https://arxiv.org/abs/2308.05177)):

| Dataset | Fix rate (GPT-4, N=5) |
|---|---|
| 270 micro-benchmarks (covering 270/506 official rustc error codes) | 92.59% (250/270) |
| 50 curated Stack Overflow questions | 72% (36/50) |
| 182 commits from top-100 crates.io repos | 73.63% of commits, 91.46% of individual errors |
| 346 Clippy lint errors, top-10 crates | reported alongside the above; consistent pattern |

Convergence was fast: most fixable errors resolved within 2-4 compiler round-trips; the worst observed cases needed up to 15 (Stack Overflow snippets) or 6 (micro-benchmarks). The paper explicitly reports that fix rate was "fairly consistent across categories" — ownership/borrow errors were not a disproportionately harder class than type or trait errors once the compiler is in the loop ([arxiv 2308.05177](https://arxiv.org/abs/2308.05177)).

This is the strongest available evidence that **Rust's compiler is a good agent feedback signal**: it is deterministic, localizes the error to a span, and (unlike many dynamically-typed languages) frequently emits a structured suggestion (`help: consider borrowing here`) that the model can apply near-verbatim. The corollary from RustEvo² and Rust-SWE-bench is that this loop rescues *compile* failures well but does not rescue *semantic* failures — a program that compiles because it satisfies the borrow checker can still call the wrong (but type-compatible) API, which is exactly the 38.0%-pass behavioral-change failure class above ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).

### 3. Hallucination classes in Rust

**Nonexistent crates / slopsquatting.** The package-hallucination study is the load-bearing citation here: models hallucinate plausible-sounding crate names at rates from ~5% (best commercial models) to ~22% (open models), and a meaningful fraction of hallucinated names repeat across independent generations — which is precisely the precondition for a slopsquatting attack (an attacker pre-registers the name an LLM is statistically likely to hallucinate) ([arxiv 2406.10279](https://arxiv.org/abs/2406.10279)). For `crates.io` specifically, this means an agent's `Cargo.toml` edits and `cargo add` suggestions are not self-verifying — the crate name compiling under `cargo add` (crates.io returns "no such crate") is a check, but a same-family typosquat crate that *does* exist and does compile is not caught by that check.

**Nonexistent methods / stale API surface.** RustEvo²'s core measurement *is* this failure mode: a model reproduces a method, signature, or trait bound that was true at training time and is no longer true. The paper's qualitative example — Claude-3.5-Sonnet reaching for manual `unsafe` pointer-cast code instead of the now-stabilized safe `slice::first_chunk_mut` — shows the failure is not always "code that doesn't compile," it is frequently "code that compiles by falling back to a less safe, older idiom" ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).

**Specific known API-churn traps relevant to this codebase's dependency surface:**

- `std::env::set_var` / `remove_var` are `unsafe fn` as of edition 2024, because Unix provides no thread-safe way to mutate the process environment and other code (including libc) may read it concurrently without going through `std::env` at all. Correct migration for spawning subprocesses is `Command::env(...)`, not a wrapped `unsafe` block around the old call ([`std::env::set_var` docs](https://doc.rust-lang.org/std/env/fn.set_var.html)):

  ```rust
  // Wrong (pre-2024 idiom, now requires `unsafe`, still not sound in general):
  std::env::set_var("KEY", "value");

  // Right for the common case — scope it to the child process:
  use std::process::Command;
  Command::new("prog").env("KEY", "value").spawn()?;
  ```

- `async fn` in traits (stable since Rust 1.75) does **not** make `async-trait` obsolete in general — it only removes the need for the macro in *statically dispatched* trait usage. Any trait used as `dyn Trait` with async methods still requires `async-trait`, because such traits remain dyn-incompatible natively ([async-trait docs](https://docs.rs/async-trait/latest/async_trait/)). A model that blanket-recommends "delete async-trait, native support landed" is wrong whenever the codebase does dynamic dispatch over that trait — checking for `dyn` usage of the trait is the correct verification step, not the Rust version alone.

- `rand` 0.9 renamed effectively the whole surface a pre-0.9-trained model has memorized: `gen()`→`random()`, `gen_range()`→`random_range()`, `gen_bool()`/`gen_ratio()`→`random_bool()`/`random_ratio()` (the latter now a free function), `thread_rng()`→`rng()` (and both removed from the prelude), `distributions`→`distr`, `Standard`→`StandardUniform`, `SliceRandom` split into `IndexedRandom`/`IndexedMutRandom`/`SliceRandom`, feature `serde1`→`serde`, feature `getrandom`→`os_rng` ([rand CHANGELOG](https://github.com/rust-random/rand/blob/master/CHANGELOG.md)). Any agent-authored code calling `rng.gen_range(..)` or `rand::thread_rng()` against a `rand = "0.9"` (or unpinned) dependency will fail to compile; this is a pure version-churn hallucination, not a logic error, and is trivially caught by `cargo check`.

- `error_chain` and `failure` are the two most commonly hallucinated *legacy* error-handling recommendations; current idiomatic Rust splits this into `thiserror` (library error *types*, via `derive(Error)`) and `anyhow` (application error *propagation*, `Result<T, anyhow::Error>` plus `.context(...)`) — `anyhow`'s own docs frame this split directly and note it deliberately does not bundle a derive macro, deferring to `thiserror` for that ([anyhow docs](https://docs.rs/anyhow/latest/anyhow/)).

### 4. Patterns that compile but are wrong

These are patterns that pass `cargo check`/`cargo build` cleanly — so the compiler-feedback loop from §2 does **not** catch them — and require either clippy or a reading review to catch:

- **`Arc<Mutex<_>>` cargo-culting.** Reached for reflexively for any shared state, including single-threaded or read-mostly cases where `Rc<RefCell<_>>`, a plain owned value passed by reference, or (in async code) a channel would be simpler and avoid lock contention entirely. No single primary source measured prevalence for this research pass, but it follows directly from the async-blocking finding below: `std::sync::Mutex` held across an `.await` point is a documented Tokio anti-pattern (holding a sync lock across a suspension point risks blocking the executor and can deadlock against `spawn_blocking`'d code) — see the Tokio blocking-operations guidance in the next bullet, which generalizes to any synchronous lock held across an await.

- **Blocking inside async.** Tokio's own docs are explicit: "code running in asynchronous tasks should not perform operations that can block. A blocking operation performed in a task running on a thread that is also running other tasks would block the entire thread, preventing other tasks from running." Because tasks are cooperatively scheduled (only yielding at `.await`), a single blocking call before an await stalls every other task scheduled on that worker thread, not just the caller. The warning explicitly extends to **synchronous `Drop` impls executed inside async code** — a blocking call hidden in a destructor is invisible at the call site and will silently stall the runtime ([Tokio task docs](https://docs.rs/tokio/latest/tokio/task/index.html)). The fix is `spawn_blocking` for CPU-bound or blocking-I/O work, with the caveat that `spawn_blocking` tasks cannot be aborted (`.abort()` is a no-op on them).

  ```rust
  // Wrong: blocks the async worker thread running this task
  async fn handler() {
      std::fs::read_to_string("big.txt").unwrap(); // blocking syscall
  }

  // Right: moves blocking work to the blocking thread pool
  async fn handler() {
      tokio::task::spawn_blocking(|| std::fs::read_to_string("big.txt"))
          .await
          .unwrap()
          .unwrap();
  }
  ```

- **`unwrap()`/`expect()` spam.** clippy ships `unwrap_used` and `expect_used` in the `restriction` lint group specifically to catch promoting recoverable errors (`Result`/`Option`) into unconditional panics. clippy's own documentation is explicit that the `restriction` group is **not** meant to be enabled wholesale — lints in it are meant to be cherry-picked per codebase, because several of them (this pair included) have legitimate uses (test code, genuinely-infallible invariants) ([clippy restriction group](https://doc.rust-lang.org/clippy/lints.html)). The corollary for agent guidance: "deny `clippy::unwrap_used` everywhere" is itself a blunt instrument; the checkable rule is narrower — no bare `.unwrap()`/`.expect()` on I/O, parsing, or network results in non-test, non-`main` code paths.

- **Misuse of `unsafe` to silence the borrow checker**, rather than restructuring ownership. RustEvo²'s own qualitative example (manual pointer-cast `unsafe` code substituting for a safe stabilized stdlib method) is one documented instance of a broader pattern: when a model's first attempt fails to satisfy the borrow checker, `unsafe` is sometimes offered as a shortcut rather than the correct fix (splitting borrows, restructuring lifetimes, or using an appropriate safe abstraction) ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).

- **`#[allow(...)]` to silence clippy instead of fixing.** Not independently benchmarked in the sources gathered here, but it is the direct behavioral analogue of the `unwrap_used`-blanket-disable failure above: an agent facing a clippy warning has two mechanically equivalent-looking moves — fix the code, or annotate it away — and nothing in the compiler loop distinguishes a justified `#[allow]` from a lazy one. This is a pure code-review-time check, not a compiler-loop-catchable one.

### 5. What actually helps

- **Compiler-in-the-loop iterative repair converges fast and is highly effective for compile-level errors** — 91-93% fix rates within a handful of round-trips on real crates and micro-benchmarks ([RustAssistant, arxiv 2308.05177](https://arxiv.org/abs/2308.05177)). This is the single best-evidenced intervention in this research pass.
- **Retrieval-augmented context (feeding current API docs/signatures)** measurably helps on post-training-cutoff APIs (+13.5 points average pass@1) but does not close the gap to pre-cutoff performance — RAG mitigates but does not solve the staleness problem ([RustEvo², arxiv 2503.16922](https://arxiv.org/abs/2503.16922)).
- **Repository-level comprehension and issue reproduction, not raw code generation, is the binding constraint** for realistic multi-file Rust tasks — Rust-SWE-bench's purpose-built agent (RUSTFORGER) beat generic ReAct-style agents by ~35% relative specifically by adding automated test-environment setup and dynamic tracing for issue reproduction, not by improving code generation per se ([arxiv 2602.22764](https://arxiv.org/abs/2602.22764)). This implies that for an agentic Rust tool, investment in "can the agent build a reliable repro/test harness before editing" outranks investment in prompt-level Rust style guidance.
- **rust-analyzer/cargo-check exposed as agent-callable tools** (via MCP servers such as [rust-analyzer-mcp](https://github.com/zeenix/rust-analyzer-mcp) or [rust-analyzer-mcp-server](https://github.com/ciresnave/rust-analyzer-mcp-server)) give an agent structured access to hover info, go-to-definition, and diagnostics without a full compile — this operationalizes the compiler-feedback-loop finding above as a tool rather than a shell-out, though no controlled study measuring its incremental effect over plain `cargo check` shell-outs was found in this pass; treat as plausible-but-unmeasured.
- **Clippy in the loop** is a natural extension of the compiler-feedback finding — RustAssistant's dataset explicitly includes 346 Clippy errors from top-10 crates and reports them fixed at rates consistent with the compiler-error categories, suggesting the same iterative-repair loop generalizes from `rustc` diagnostics to `clippy` diagnostics ([arxiv 2308.05177](https://arxiv.org/abs/2308.05177)).

### 6. Is Rust a good or bad target for agentic coding overall?

**Case for good:** The evidence in §2 is the strongest argument — Rust's compiler produces structured, localized, often self-suggesting diagnostics, and an LLM-in-the-loop repair process converges on those diagnostics at 90%+ rates within single-digit iterations on real code ([RustAssistant](https://arxiv.org/abs/2308.05177)). Strong static typing and the borrow checker convert a large class of runtime bugs (use-after-free, data races, null derefs) into compile-time failures the agent gets a chance to fix before the code ever runs — a guardrail dynamically-typed targets don't offer for free.

**Case for bad:** Rust code generation pass rates lag comparable Python numbers on the same models and prompts (GPT-4: 52.5% pass@1 on Rust vs. much higher on Python in HumanEval-XL) ([arxiv 2402.16694](https://arxiv.org/pdf/2402.16694)), and compiling is not the same as correct: RustEvo²'s 38.0% pass rate on behavioral (non-signature) API changes shows the compiler loop is blind to semantic drift ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)). Repository-scale tasks fare far worse than isolated snippets — 28.6% best-case resolve rate on Rust-SWE-bench versus 90%+ single-error fix rates on RustAssistant's micro-benchmarks — meaning the "good feedback loop" advantage measured at the single-error scale does not straightforwardly transfer to multi-file, real-world issue resolution ([arxiv 2602.22764](https://arxiv.org/abs/2602.22764), [arxiv 2308.05177](https://arxiv.org/abs/2308.05177)). Rust's edition/API churn (2024 edition unsafety changes, `rand` 0.9, async-trait's partial obsolescence) is unusually aggressive compared to Python/JS, so training-data staleness bites harder here.

**Net reading of the evidence gathered:** Rust rewards an agent architecture built *around* the compiler-feedback loop (fix-and-recompile is cheap and reliable) but should not be trusted to get semantics or up-to-date API usage right on the first pass, and needs explicit help with repository-scale comprehension separate from per-file code generation quality.

## Normative guidance candidates

1. **Every agent-authored Rust change must pass `cargo check` (or `cargo build`) before being presented as done; failures must be fed back to the agent as the literal compiler output, not summarized.** Rationale: this is the single best-evidenced intervention (91-93% fix rates within 2-4 iterations). Verify: CI/hook runs `cargo check --all-targets` and blocks on nonzero exit; check that the fix-loop prompt includes raw `rustc` diagnostic text, not a paraphrase.
2. **Every agent-authored Rust change must pass `cargo clippy --all-targets -- -D warnings` (with an explicit, reviewed allowlist of exceptions) before being presented as done.** Rationale: clippy catches the compiles-but-wrong class (§4) that `cargo check` cannot; RustAssistant's own dataset shows the same repair loop generalizes to clippy diagnostics. Verify: run `cargo clippy --all-targets -- -D warnings`; nonzero exit blocks.
3. **No new dependency may be added to `Cargo.toml` without confirming it resolves on crates.io and matches the intended crate (not a typosquat/similar name) — never trust an agent-suggested crate name at face value.** Rationale: package hallucination measured at 5-22% across models, and a hallucinated name that happens to exist is a live slopsquatting vector. Verify: `cargo add <name>` succeeds AND a human/second pass checks the resolved crate's repository/owner against the intended one before merge; grep the diff's `Cargo.toml`/`Cargo.lock` for any crate added in the same change that wasn't explicitly requested.
4. **No bare `.unwrap()`/`.expect()` on `Result`/`Option` values that originate from I/O, parsing, network, or other fallible external input, outside `#[test]`/`#[cfg(test)]` code and `fn main`.** Rationale: promotes a recoverable error to an unconditional panic; this is exactly what `clippy::unwrap_used`/`expect_used` exist to catch, and clippy's own docs frame the `restriction` group as intentionally narrow/opt-in rather than a blanket ban. Verify: `cargo clippy -- -W clippy::unwrap_used -W clippy::expect_used` on non-test code; reviewer greps for `.unwrap()`/`.expect(` outside `tests/`, `#[cfg(test)]` modules, and `fn main`.
5. **No `.await` may occur while a `std::sync::MutexGuard` (or any non-async lock guard) is held; use `tokio::sync::Mutex`, restructure to drop the guard before the await, or move the critical section into `spawn_blocking`.** Rationale: Tokio's own docs state blocking a worker thread stalls every other task scheduled on it, and a lock held across an await is the classic way to do this invisibly. Verify: `cargo clippy` flag `clippy::await_holding_lock` (part of clippy's `pedantic`/general set); reading heuristic — grep for `.lock()` followed by an `.await` before the guard's scope ends.
6. **No blocking call (`std::fs::*`, `std::thread::sleep`, synchronous network I/O, or CPU-heavy loops) inside an `async fn` body or inside a `Drop` impl reachable from async code — wrap it in `tokio::task::spawn_blocking`.** Rationale: identical stalling failure mode as #5, explicitly called out by Tokio's docs as extending into destructors. Verify: reading heuristic on diffs touching `async fn`/`impl Drop`; no automated lint fully covers this — treat as a mandatory human/agent-reviewer checklist item on async-code diffs.
7. **When editing/adding code that depends on `std::env::set_var`/`remove_var`, `rand`, or `async-trait`, check the exact crate/edition version pinned in `Cargo.toml`/`rust-version` before writing the call — do not assume pre-2024-edition or pre-0.9 API shapes.** Rationale: these are three concretely measured, version-specific API-churn traps (edition-2024 unsafety, rand 0.9 renames, async-trait's dyn-only continued necessity) that a model's training data is likely to get wrong by default. Verify: `cargo check` will catch the `rand`/`set_var` cases outright (nonexistent method/missing `unsafe`); for `async-trait`, grep the trait definition for `dyn <TraitName>` usage before recommending its removal.
8. **When a model proposes `unsafe` to resolve a borrow-checker error, treat it as a rejected first draft, not a fix — require a second pass that attempts a safe restructuring (split borrows, `Rc`/`Arc`+interior mutability, or an existing safe stdlib method) before accepting `unsafe`.** Rationale: documented pattern of models reaching for `unsafe` pointer tricks over a safe stabilized alternative even when one exists. Verify: reviewer/agent checklist — any diff introducing a new `unsafe` block must state in the PR/commit body why no safe alternative exists; `#![forbid(unsafe_code)]` at the crate root for crates that should never need it, overridden per-module only with justification.
9. **Prefer `anyhow::Error` (application code) + `thiserror::Error` (library/public-boundary error types) over `error_chain`, `failure`, or hand-rolled `Box<dyn Error>` string-matching.** Rationale: current idiomatic split, explicitly documented by `anyhow` itself; `error_chain`/`failure` are legacy patterns a model may default to from stale training data. Verify: grep `Cargo.toml` for `error-chain`/`failure` dependencies (flag for replacement); grep source for hand-rolled `impl std::error::Error` boilerplate that duplicates what `thiserror`'s derive would generate.
10. **Do not enable `clippy::restriction` as a whole group; enable individual restriction lints deliberately, each with a one-line rationale comment at the enabling `#![warn(...)]` site.** Rationale: clippy's own documentation says the restriction group is not intended for blanket use and contains lints with legitimate exceptions. Verify: grep `Cargo.toml`/`clippy.toml`/lint attributes for `clippy::restriction` used as a bare group (e.g. `#![warn(clippy::restriction)]`) — flag it; require named lints instead.

## AI-agent angle

- **Outdated `rand` API calls** (`gen_range`, `thread_rng()`) against a `rand = "0.9"` dependency — smallest check: `cargo check` fails immediately with "no method named `gen_range`"; grep diff for `rand::thread_rng()` or `.gen_range(` against a `Cargo.toml` pinning `rand >= 0.9`.
- **Safe-looking `std::env::set_var` calls with no `unsafe` block** on an edition-2024 crate — smallest check: `cargo check` fails with "call to unsafe function is unsafe"; grep for `env::set_var(` / `env::remove_var(` not wrapped in `unsafe { }`.
- **"Just remove async-trait, it's native now" applied to a `dyn`-dispatched trait** — smallest check: grep the trait's usages for `dyn <TraitName>`/`Box<dyn <TraitName>>`; if present, `async-trait` stays.
- **Hallucinated crate name in a proposed `Cargo.toml` addition** that happens to actually exist (slopsquat risk) or doesn't exist at all — smallest check: `cargo add <name>` (fails loudly if nonexistent) plus a manual glance at the resolved crate's `docs.rs`/repository link for plausibility (does the maintainer/repo match what's expected for that ecosystem niche).
- **Legacy `unsafe` pointer-cast idiom where a stabilized safe stdlib method now exists** (RustEvo²'s documented `slice::first_chunk_mut` case) — smallest check: for any new `unsafe` block touching slices/pointers, search `doc.rust-lang.org/std` for a same-purpose safe method before accepting it.
- **`Arc<Mutex<_>>` reached for by default for shared state** even in single-threaded or non-concurrent contexts — smallest check: if the type never crosses a `tokio::spawn`/`std::thread::spawn` boundary, `Rc<RefCell<_>>` or a plain reference almost always suffices; grep for `Arc<Mutex<` and check whether the containing module ever spawns a task/thread.
- **Bare `.unwrap()`/`.expect()` chains presented as "working code"** on a first draft — smallest check: `cargo clippy -W clippy::unwrap_used -W clippy::expect_used` on the diff's changed files only.
- **Blocking calls inside `async fn` presented as correct** because the code compiles and passes a single-threaded test — smallest check: reading review of every `async fn` diff for `std::fs::`, `std::net::` (sync variants), `std::thread::sleep`, or any synchronous library call without `spawn_blocking`.
- **`#[allow(clippy::...)]` added to silence a fresh warning instead of fixing it** — smallest check: diff review — any newly-added `#[allow(...)]` attribute in the same change that introduced the code it suppresses is a red flag; require a comment justifying it.
- **Confident citation of a specific pass-rate number for a benchmark that does not actually publish per-language results** (e.g., claiming an Aider Rust-specific score) — smallest check: before trusting any agent-reported "Rust benchmark shows X%" claim, verify it against a primary source that actually reports a Rust-specific number (RustEvo², Rust-SWE-bench, HumanEval-XL) rather than an aggregate multi-language score.

## Contested / evolving

- **Whether `clippy::restriction`-group lints should be enabled broadly for agent-authored code.** clippy's maintainers explicitly discourage blanket adoption, but some teams building AI-agent guardrails argue the opposite — that agents specifically benefit from stricter default denial (fewer footguns, more forced explicitness) even where the ergonomic cost to a human author would be too high. No published data resolves this trade-off for *agent-authored* code specifically; treat as an open design choice, not settled practice.
- **How much MCP/rust-analyzer tool access improves agent Rust output versus plain `cargo check`/`cargo clippy` shell-outs.** MCP servers exposing rust-analyzer exist and are actively maintained ([zeenix/rust-analyzer-mcp](https://github.com/zeenix/rust-analyzer-mcp), [ciresnave/rust-analyzer-mcp-server](https://github.com/ciresnave/rust-analyzer-mcp-server)), but no controlled study measuring their incremental benefit over shell-based compiler feedback was found in this pass. Trending toward more structured tool access as MCP adoption grows, but the evidence base is currently anecdotal/tooling-availability, not measured improvement.
- **Whether Rust's difficulty for LLMs is closing over model generations.** RustEvo²'s knowledge-cutoff finding (56.1% pre-cutoff vs. 32.5% post-cutoff) suggests each new Rust release/edition re-opens the gap regardless of overall model capability improvements — i.e., the problem may be structurally recurring (fast-moving ecosystem meeting periodic training cutoffs) rather than converging toward zero. Genuinely unresolved without a longitudinal study across model generations on a fixed set of post-cutoff APIs.
- **`async fn` in traits vs. `async-trait` as the default recommendation.** Practice is trending toward native `async fn` in traits as the default for statically-dispatched trait usage (per current async-trait docs), but the dyn-compatibility gap is not yet closed in the language, so this is a moving target — any guidance baked into agent instructions should be re-checked against the Rust release notes periodically rather than treated as permanently settled.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [arxiv.org/abs/2503.16922](https://arxiv.org/abs/2503.16922) | RustEvo²: An Evolving Benchmark for API Evolution in LLM-based Rust Code Generation (paper) | March 2025 | Primary source for measured pass rates by model and by API-change category; the core Rust-specific benchmark for API staleness. |
| [arxiv.org/abs/2308.05177](https://arxiv.org/abs/2308.05177) | RustAssistant: Fixing Rust Compilation Errors using LLMs (Microsoft Research paper) | Aug 2023 (still current methodology reference) | Primary evidence that Rust's compiler is a strong iterative-repair signal; concrete fix-rate and iteration-count numbers. |
| [arxiv.org/abs/2602.22764](https://arxiv.org/abs/2602.22764) | Rust-SWE-bench / RUSTFORGER: repository-level Rust issue resolution benchmark | 2026 | Only found repo-scale (multi-file, real-issue) Rust agent benchmark; shows the gap between snippet-level and repo-level performance. |
| [arxiv.org/abs/2406.10279](https://arxiv.org/abs/2406.10279) | "We Have a Package for You!" — package hallucination study across 16 LLMs | June 2024 | Primary quantitative basis for slopsquatting risk assessment (hallucination rates, unique hallucinated names). |
| [arxiv.org/pdf/2402.16694](https://arxiv.org/pdf/2402.16694) | HumanEval-XL: multilingual code-generation benchmark | Feb 2024 | Gives a directly comparable Rust vs. other-language pass@1 number (GPT-4, 52.5% on Rust) for gauging relative difficulty. |
| [doc.rust-lang.org/std/env/fn.set_var.html](https://doc.rust-lang.org/std/env/fn.set_var.html) | Official Rust stdlib docs for `env::set_var` | Current (edition 2024) | Primary, authoritative explanation of why this became `unsafe` and the correct migration; a concrete, checkable hallucination trap. |
| [docs.rs/tokio/latest/tokio/task/index.html](https://docs.rs/tokio/latest/tokio/task/index.html) | Official Tokio docs, task module | Current | Primary source for the blocking-in-async failure mode, including the non-obvious `Drop`-impl warning. |
| [github.com/rust-random/rand/blob/master/CHANGELOG.md](https://github.com/rust-random/rand/blob/master/CHANGELOG.md) | `rand` crate changelog | Current (0.9 era) | Primary, exhaustive list of the 0.8→0.9 renames most likely to trip up a model trained on older `rand` usage. |
| [docs.rs/async-trait/latest/async_trait/](https://docs.rs/async-trait/latest/async_trait/) | `async-trait` crate docs | Current | Primary source clarifying exactly when `async-trait` is still required post-stabilization of native `async fn` in traits (the dyn-compatibility caveat). |
| [docs.rs/anyhow/latest/anyhow/](https://docs.rs/anyhow/latest/anyhow/) | `anyhow` crate docs | Current | Primary source for the current idiomatic anyhow/thiserror split, the baseline against which `error_chain`/`failure` recommendations should be flagged as stale. |
| [doc.rust-lang.org/clippy/lints.html](https://doc.rust-lang.org/clippy/lints.html) | Official Clippy lint documentation/lint groups | Current | Primary source for lint group semantics (`restriction` explicitly opt-in, not blanket), underpinning the unwrap_used/expect_used guidance. |
| [github.com/zeenix/rust-analyzer-mcp](https://github.com/zeenix/rust-analyzer-mcp) | rust-analyzer exposed as an MCP server | 2025 | Concrete example of the tooling direction ("what actually helps") for giving agents structured Rust analysis access beyond shell-outs. |
| [aider.chat/docs/leaderboards/](https://aider.chat/docs/leaderboards/) | Aider polyglot benchmark leaderboard | Current | Confirms Rust is part of a well-known agentic coding benchmark, but also documents the limitation (no per-language breakdown) — important for not over-claiming what this benchmark shows. |
| [github.com/ciresnave/rust-analyzer-mcp-server](https://github.com/ciresnave/rust-analyzer-mcp-server) | Second independent rust-analyzer MCP server implementation | 2025 | Corroborates that rust-analyzer-as-MCP-tool is an active, multi-implementation pattern, not a one-off experiment. |
| [huggingface.co/datasets/SYSUSELab/RustEvo2](https://huggingface.co/datasets/SYSUSELab/RustEvo2) | RustEvo² dataset card | 2025 | Companion artifact to the paper; useful for anyone wanting to reproduce or extend the benchmark against this project's own dependency set. |
