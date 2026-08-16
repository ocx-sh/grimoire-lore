---
title: AI agents writing and reviewing code — Rust-specific and general
topic: ai-agentic-coding
model: opus
consolidates:
  - ai-agentic-coding/llm-rust-failure-modes.md
  - ai-agentic-coding/autonomous-verification-loops.md
  - ai-agentic-coding/anthropic-guidance-and-context-engineering.md
  - ai-agentic-coding/agent-config-in-rust-repos.md
  - ai-agentic-coding/arcana-digest.md
date: 2026-08
---

# AI agents writing and reviewing code — Rust-specific and general

## Verdict

1. **Rules are traps, not maps.** Every line in an always-loaded file must name a mistake an
   agent makes without it. Architecture, module maps, and ADR indexes move to on-demand files.
   Zed's "traps to avoid, not maps to follow" beats the toasty/Azure/ocx crate-table pattern
   for *our* repos, because ours change fast and the agent can read the code
   ([agent-config-in-rust-repos.md §10](.agents/research/ai-agentic-coding/agent-config-in-rust-repos.md)).
2. **A "done" claim without a command and an exit code from the current tree is inadmissible.**
   Proof-or-Stop measured a ~15x reduction in visible-pass/hidden-fail shipping from swapping
   self-report for evidence-gated loops. We adopt the evidence tiers; we do **not** adopt
   `materialHash` infrastructure — the commit SHA plus a re-run is enough at three repos.
3. **The compiler is the loop.** RustAssistant fixed 91–93% of real compile errors in 2–4
   round-trips. Everything else in this ruleset exists to catch the class the compiler is blind
   to: semantics (38% pass on behavioral API changes) and repo-scale comprehension (28.6% best
   case on Rust-SWE-bench).
4. **Fan-out is gated on file-disjointness, not on "is this a coding task."** Anthropic's
   "coding is a poor fit for multi-agent" predates worktree-parallel execution; the arcana
   digest supplies the sharper gate — ≥3 independent, similarly-sized units, provably disjoint
   file sets, and skip fan-out entirely once a single agent clears the task class. Every branch
   funnels back through **one** verification gate: that is the 4.4x-vs-17.2x error-amplification
   difference.
5. **Cherry-pick clippy restriction lints; never enable the group.** Clippy's own docs say the
   group is not for blanket use. Grimoire already has the right shape
   (`unwrap_used`/`expect_used` as `warn`, non-test-scoped, `unsafe_code = "forbid"`); ocx has
   the same discipline by convention with **no lint gate at all**. Ocx adopts grimoire's gate.
6. **Where a rule and shipped code disagree, the code is authoritative until a human rules
   otherwise.** Ocx's `ClassifyExitCode` trait on 50+ error types directly violates the rule's
   own Block-tier "no trait-based exit-code mapping." The rule is stale, not the code.
7. **The one place we accept a human in the loop is snapshot acceptance.** `insta` refuses to
   auto-accept under `CI=1` by design; that is a feature we keep rather than route around. Every
   other gate must be mechanical.
8. **Four `.claude/` trees for one design is the largest single defect in the current config.**
   grimoire, grimoire-duo, and ocx-mirror carry byte-for-byte forks of ocx's skills. One
   canonical published package, imported — that is what this research is for.

## The ruleset

Severity: **MUST** = blocks merge. **SHOULD** = fix or state why not in the commit body.
**CONSIDER** = judgment, no gate.

### CFG — how the config itself is written

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| CFG-01 | Keep exactly one canonical agent-instruction file per repo; every other agent filename is a one-line import or a symlink to it, never an independently-edited copy. | Every Rust repo shipping both files uses import (`@AGENTS.md`) or symlink; none maintains two copies, because they silently diverge on first edit. | `diff <(cat CLAUDE.md) <(cat AGENTS.md)` shows a match, a one-line import, or a symlink | MUST |
| CFG-02 | Cap any always-loaded rule file or SKILL.md body at 500 lines; push detail into files referenced by name. | Anthropic and Cursor set the identical 500-line ceiling independently; a bloated file makes Claude *ignore* instructions, not merely cost tokens. | `wc -l` on each file under `.claude/rules/` and each `SKILL.md`; fail >500 | MUST |
| CFG-03 | Put behavioral traps in the always-loaded file; put crate layout, module maps, and ADR indexes in an on-demand doc. | Architecture goes stale fast and the agent can recover it by reading code; a trap cannot be discovered by reading code. | Per bullet: "would a careful read of the code have caught this?" — yes means demote | SHOULD |
| CFG-04 | Admit a new rule only if it is non-obvious, has been hit more than once, and is specific enough to act on; add it in its own commit, never as a drive-by during unrelated work. | This three-part bar is the only documented mechanism that keeps a rules file from accreting one-off observations. | Rule-adding PR body cites ≥2 concrete instances or an explicit maintainer override | MUST |
| CFG-05 | Give every command as a fenced, runnable-as-written block, narrowest scope first (`cargo check -p <crate>` before any `--workspace` form). | Agents left to choose default to the broadest, slowest correct command; prose descriptions get paraphrased into something that runs for ten minutes. | grep for ```` ```bash ```` fences; the first non-comment line of the first fence carries a `-p`/scope flag | MUST |
| CFG-06 | Open every skill `description` with the concrete situation that triggers it, not a topic label. | `description` + `when_to_use` are hard-truncated at 1,536 chars in the listing Claude uses to decide relevance. | Reading heuristic: first sentence names a situation ("Use when reviewing an `unsafe` block"), not a category ("Rust safety guidance") | MUST |
| CFG-07 | Route content by kind: static facts → always-loaded file; multi-step procedures → skill; reviewer-only severity and skip-lists → a separate, shorter, highest-priority review file. | Anthropic's own split — `CLAUDE.md` findings are capped at nit severity, `REVIEW.md` is injected as highest priority and is not `@import`-expanded. | Per line: fact, procedure, or review-time override? Misplaced content moves | MUST |
| CFG-08 | Write the enforcement semantics of every config knob, and state replace-vs-append explicitly for every list-valued key. | An undefined interaction between a key and hardcoded behavior is silently ignored by the model rather than flagged; array-merge order is a recurring drift trap (ESLint, GitLab `include`, Ruff `select`/`ignore`). | grep every documented key for a sentence stating what happens when it is absent, unknown, or set at two layers | MUST |
| CFG-09 | Repeat the block-tier rules verbatim (a handful of lines, never the whole file) inside each worker-agent definition, in addition to the path-scoped rule file. | Path-scoped auto-load is a silent-failure mechanism — an unmatched glob loads nothing and reports nothing. | grep each `.claude/agents/*.md` for an "Always Apply" block naming the block-tier items | SHOULD |
| CFG-10 | In any prompt that generates an artifact, state that context and rules are constraints for the model, not content to reproduce. | Models asked to draft an artifact echo instruction text verbatim into the output unless told not to; OpenSpec ships this guardrail as literal skill text. | grep generation prompts for the guardrail sentence | SHOULD |
| CFG-11 | State forbidden agent *actions* (opening PRs, commenting publicly, pushing, adding co-author trailers) as capitalized NEVER clauses that instruct the agent to refuse contradicting prompts — structurally separate from code-style preferences. | Wasmtime's phrasing is written to survive in-context override; a soft style preference is not. Mixing the two makes both negotiable. | Scan for `NEVER`/`MUST NOT` bullets; each names a concrete trigger, and none sits in the style section | MUST |

### VERIFY — the evidence loop

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| VERIFY-01 | Never accept agent narration as evidence; a task is done only when a command, its exit code, and the tree state it ran against are all cited. | Self-report is unfalsifiable; fabricated "tests passing" transcripts typed into the response are a documented, observed failure mode. | The completion message names the command and exit code; CI re-runs it against the same SHA | MUST |
| VERIFY-02 | Run the gate in this order every turn: `cargo check --workspace --all-targets --locked` → `cargo clippy --workspace --all-targets --all-features -- -D warnings` → `cargo nextest run --workspace --locked` → `cargo test --doc` → `cargo deny check`. | Each stage costs strictly more than the last, so the common case (iterating on a compile error) never reaches the slow stages — which is what makes the loop actually get run rather than skipped for time. | Time each stage in CI; `check` fastest, `deny` slowest | MUST |
| VERIFY-03 | Pass `--locked` on every build/test invocation; a `Cargo.lock` change outside the task's declared scope is rejected. | Silently bumping a dependency to dodge a build error produces a successful-looking build against different code than was reviewed. | `cargo check --locked` in CI; diff `Cargo.lock` against the task allowlist | MUST |
| VERIFY-04 | Feed compiler and clippy output back to the agent as literal diagnostic text, never a paraphrase. | The 91–93% fix rate is measured on the compiler's own spans and `help:` suggestions; a summary discards exactly the part that converges. | Inspect the fix-loop prompt for raw `rustc`/`clippy` text | MUST |
| VERIFY-05 | For a regression, commit the failing test first, proven to fail on the pre-fix tree, then the fix. | This is what makes `git bisect run` work later, and the bisect script *is* the test — one artifact, two jobs. | The test commit's parent fails that test in isolation | MUST |
| VERIFY-06 | Ship zero test-file diff in the commit that turns previously-failing tests green, except in an explicitly labelled spec-correction commit. | Otherwise the agent edits the spec instead of the implementation — the strictest form of scope creep. | Diff the test-file set between the red and green commits | MUST |
| VERIFY-07 | Prove a check can go red before trusting it green: demonstrate both outcomes on inputs you control. | A check that never ran and a check that passed are indistinguishable from the outside; unmatched globs and `paths:` frontmatter fail exactly this way. | Mutate the guarded property; the check must red. A mutation that fails to red means the mutation missed, not that the check is fine | MUST |
| VERIFY-08 | Bound every autonomous loop with an explicit maximum iteration or retry count in its own logic; never rely on the harness's cap. | Claude Code force-overrides a Stop hook after 8 consecutive blocks precisely because unbounded loops happen; OpenCode currently ships no depth limit at all and has an open runaway-nesting bug. | grep the loop/hook config for a numeric max | MUST |
| VERIFY-09 | Run `cargo mutants` PR-scoped on lines the diff touched; a surviving mutant in touched code blocks, not advises. Full runs go on a schedule. | Green tests prove nothing about assertion strength; mutation testing is the only mechanical detector for weakened assertions and self-referential asserts (`assert_eq!(result, my_function(input))`). | `cargo mutants --in-place -- $(git diff --name-only origin/main... \| grep '\.rs$')` | SHOULD |
| VERIFY-10 | Never pass `--no-verify`; never edit `Justfile`/`Taskfile`/`.github/workflows/**`/`deny.toml`/`clippy.toml` in the same change the gate is blocking. | An agent cannot police the gate that constrains it; the detector must live outside the trust boundary of the thing it checks. | CODEOWNERS on the CI-config bucket; `git diff --name-only` against a separate always-flagged allowlist | MUST |

### DIFF — scope discipline

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| DIFF-01 | Declare the file allowlist before editing; any diff touching a file outside it blocks. | The scope-contract gate is a five-line script and catches the unrelated-refactor class outright. | `git diff --name-only origin/main... \| grep -qvFf allowed-files.txt` → nonzero blocks | MUST |
| DIFF-02 | Never add `#[allow(...)]`; use `#[expect(lint)]` with an inline `// reason:` when a suppression is genuinely needed. | `#[expect]` fails the build the moment the lint stops firing, so a stale suppression cannot rot silently — adopted independently by crates.io, uv, and zed. | `git diff origin/main... \| grep -n '^\+.*#!\?\[allow('` → any hit blocks; `cargo clippy` reports no `unfulfilled_lint_expectations` | MUST |
| DIFF-03 | Leave no `todo!()`/`unimplemented!()`/`unreachable!()` reachable in production paths outside a declared stub-phase commit. | These compile clean and panic only at runtime, sailing past the fast gate. | `grep -rn 'todo!\|unimplemented!' --include='*.rs' src/ crates/*/src` returns empty | MUST |
| DIFF-04 | Never hand-edit generated code or an `insta` `.snap`; run the named regeneration command and read the diff. | Making a red check green by editing its expected output is the easiest wrong shortcut available, and the single most-repeated prohibition across Rust AGENTS.md files. | CI re-runs the generator from clean and diffs; `git status --porcelain` shows no `*.snap.new` | MUST |
| DIFF-05 | Keep the reviewable unit small — one concern per diff, one work package at a time. | PRs over 1,000 lines get genuine review only ~10% of the time, ~20x less scrutiny per line than sub-200-line PRs. A bigger review panel does not compensate. | `git diff --shortstat origin/main...` as a tripwire against the stated task size | SHOULD |

### REVIEW — adversarial review that finds real bugs

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| REVIEW-01 | Require a resolvable `file:line` for every behavior claim; a finding without one is inadmissible. | Anthropic's own bar: "behavior claims need a `file:line` citation in the source, not an inference from naming." Forces the reviewer to open the diff. | Reviewer output schema makes `file` and `line` required; re-read the cited line and confirm it contains the claimed code | MUST |
| REVIEW-02 | Run review as two passes — a finder, then an independent verifier that re-checks each candidate against actual code behavior before it is surfaced. | This is the mechanism that suppresses false positives in Anthropic's pipeline; better prompting of a single pass is not a substitute, because the finder has an incentive to defend its guesses. | The review design has a distinct step or agent between finding and reporting | MUST |
| REVIEW-03 | Define blocking severity in one falsifiable sentence and cap low-severity output (e.g. at most 5 nits, then a count). | "Find issues" with no severity contract reports everything it notices; a reviewer asked to find gaps will report some even when the work is sound, and chasing them produces over-engineering. | The review config states an explicit Block definition and an explicit nit cap | MUST |
| REVIEW-04 | Classify every finding actionable or deferred, and ban hedge words ("probably", "might", "seems to", "should work") as a deferral reason or a verdict. Claiming "verified" without citing evidence is itself a block-tier finding. | An unclear reason means investigate further, not defer; hedging is how an unverified claim gets shipped as a conclusion. | grep verdicts for the banned-phrase list; every "verified" is followed by a command or test name | MUST |
| REVIEW-05 | Review in a fresh context, never the same context that wrote the code. | A reviewer biased toward code it just wrote is not a reviewer. Subagents also exist to keep the file reads out of the primary window. | The review runs as a separate subagent/session | MUST |
| REVIEW-06 | After round 1, report block-tier findings only; auto-defer any finding that recurs unchanged across two rounds. | Otherwise a one-line fix cycles through review rounds indefinitely on style alone. | The loop protocol states both rules; re-run only perspectives that had prior actionable findings | SHOULD |
| REVIEW-07 | Run the cross-model (non-Claude-family) review once, last, and never in a loop. | Intra-family panels share training data and blind spots; a second family catches what they miss, but two families looping produces stylistic thrash. | The skill sequences cheap intra-family review first and marks the cross-model pass one-shot | SHOULD |

### ORCH — when to fan out

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| ORCH-01 | Fan out only when the subtasks are provably file-disjoint AND there are ≥3 independent, similarly-sized units. Otherwise stay single-agent. | File-disjointness is the mechanically checkable gate; below that granularity, 4–15x spawn overhead dominates, and a Rust rename in one file breaks compilation everywhere else. | Enumerate each subtask's file set before spawning; overlap means collapse to one agent | MUST |
| ORCH-02 | Route every parallel or recursive worker's output back through one centralized verification gate before it counts as done; run `cargo check` after *every* merge, not once at the end. | Centralized verification is the empirical difference between 4.4x and 17.2x error amplification; per-work-package verification alone misses cross-file interaction bugs. | The orchestrator's merge step runs the full gate; per-worker green is never sufficient | MUST |
| ORCH-03 | Self-enforce a hard delegation-depth cap inside the skill's own logic; do not assume the harness has one. | Caps are universal but never uniform — Claude Code 5, Codex 1, OpenCode none. | The skill states its own numeric depth cap and checks it | MUST |
| ORCH-04 | Grow a review panel by adding *roles*, never by duplicating one. | Same-kind sampling plateaus at N=5–10 and noise can hurt past it; "two security reviewers" is a commonly requested, empirically unjustified knob. | No two workers in a panel share a perspective | SHOULD |
| ORCH-05 | Resolve correctness-critical conflicts (merge conflicts, contradictory lint fixes, exit-code classification) with deterministic rules first; model judgment handles only the genuine residual, and escalates rather than guesses. | Replacing a designed deterministic mechanism with prompt-based "intelligent merging" is a regression, not a feature. | The workflow names the deterministic step and the escalation path | MUST |
| ORCH-06 | Have every subagent explicitly `Read` the convention files it must obey; never assume a parent- or sibling-directory rule is ambiently in context. | `CLAUDE.md` resolution concatenates root-down but `.claude/settings.json` never inherits, `--add-dir` loads skills but not rules without an env var, and `@path` imports stop at 4 hops. | The spawn prompt names the files to read by absolute path | MUST |

### RUST — what an LLM gets wrong in Rust specifically

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| RUST-01 | Never add a crate from memory; confirm the exact name resolves on crates.io and that the resolved repository/owner matches the intended crate. Prefer reusing a dependency already in the workspace. | Package hallucination runs ≥5.2% (commercial) to 21.7% (open) across 576k samples, with 205,474 unique fake names — and a hallucinated name that *does* exist is a live slopsquatting vector that `cargo add` will not catch. | `cargo add <name>` succeeds AND the resolved crate's repo is checked; grep the diff's `Cargo.toml` for anything added that wasn't requested | MUST |
| RUST-02 | Before writing against `rand`, `std::env::set_var`/`remove_var`, or `async-trait`, read the version pinned in `Cargo.toml`/`rust-toolchain.toml`. | Three measured churn traps: `rand` 0.9 renamed its whole surface, edition 2024 made env mutation `unsafe fn`, and `async-trait` is still required for `dyn`-dispatched async traits. Post-cutoff APIs score 32.5% vs 56.1% pre-cutoff. | `cargo check` catches the first two; for `async-trait`, grep the trait's uses for `dyn <Trait>` before removing it | MUST |
| RUST-03 | Treat `unsafe` proposed to satisfy the borrow checker as a rejected first draft; require a documented attempt at a safe restructuring first, and a `// SAFETY:` comment on any `unsafe` that survives. | Models reach for manual pointer casts over a safe stabilized stdlib method (the documented `slice::first_chunk_mut` case). | Any diff adding `unsafe` states in the commit body why no safe alternative exists; `#![forbid(unsafe_code)]` where the crate should never need it | MUST |
| RUST-04 | Ban `.unwrap()`/`.expect()` on fallible I/O, parsing, or network results in non-test, non-`main` code, via named cherry-picked clippy lints — never by enabling the `restriction` group. | This is the single most common cheat-to-compile pattern; clippy's own docs say the group is not meant to be enabled wholesale, and `.expect("reason")` on a compile-time-proven invariant is legitimate. | `cargo clippy -- -W clippy::unwrap_used -W clippy::expect_used` on non-test code; grep the lint config for a bare `clippy::restriction` group and flag it | MUST |
| RUST-05 | Never discard a fallible result with `let _ =` or a bare `.ok()`; propagate with `?`, log explicitly, or handle with `match`/`if let Err`. | The most-repeated substantive rule across every Rust AGENTS.md sampled — zed, uv, ruff, wasmtime converge on it independently. Note the second-order form: wrapping the panic in a `Result` that is then `let _ =`-discarded at the call site. | `rg 'let _ = .*\?' --type rust` returns nothing outside test code; `clippy::let_underscore_*` sweep | MUST |
| RUST-06 | Never hold a `std::sync::MutexGuard` (or any non-async guard) across an `.await`; extract the data, drop the guard, then await. | Deadlocks if `Send`, compile error if not. All three codebases use std `Mutex` exclusively (zero `tokio::sync::Mutex` in 700+ files) — the convention is sound but unenforced. | Enable `clippy::await_holding_lock`; it was never confirmed enabled in any of the three repos | MUST |
| RUST-07 | Never call blocking stdlib I/O (`std::fs::*`, `std::net::*`, `std::thread::sleep`) inside an `async fn` or inside a `Drop` reachable from async code; use `tokio::fs`/`tokio::time` or `spawn_blocking`. | Cooperative scheduling means one blocking call stalls every task on that worker thread; Tokio's docs call out the `Drop` case specifically because it is invisible at the call site. | Reading review of every `async fn` diff; a precise detector does not exist yet (see Open questions) | MUST |
| RUST-08 | Sort `JoinSet::join_next()` results by a stable key before returning, and always observe every `JoinHandle`/`spawn_blocking` result. | `join_next()` returns in completion order — non-deterministic output otherwise. An unobserved handle silently swallows a task panic. | Review checklist on any `JoinSet`/`spawn_blocking` diff; the inner `Result` must be propagated with `?`, not dropped | MUST |
| RUST-09 | Use `thiserror` for library error types and `anyhow` only at the binary boundary; never `anyhow::Error` in a library API. `#[non_exhaustive]` on public error enums, `#[source]` on wrapping variants, no `.to_string()` in `map_err`. | `anyhow` in a library kills downstream `match`; `.to_string()` in `map_err` destroys the source chain. `error-chain`/`failure` are stale training-data defaults. | grep library crates for `anyhow::` in public signatures and for `map_err(|e| .*e.to_string())` | MUST |
| RUST-10 | Own a typed `#[repr(u8)] #[non_exhaustive] ExitCode` enum aligned to `sysexits.h` (64/65/69/74/75/77/78, tool-specific 79–127); never `std::process::exit(N)` with a literal, and never from library code. | Single-digit codes collide with shell-reserved 1/2; one enum per workspace is what lets calling scripts discriminate failures without parsing stderr. | grep for `process::exit(` outside `main.rs`; grep for `ExitCode::from(<literal>)` at call sites | MUST |
| RUST-11 | Write library error strings as concise lowercase phrases with no trailing punctuation (`C-GOOD-ERR`); acronyms keep canonical case. Sentence case is allowed only in `anyhow::Context` strings at the CLI boundary. | Mixed-case chains read wrong under `{err:#}`: "failed to install: Registry authentication failed." | grep `#[error("` for a leading uppercase word that is not an initialism, or a trailing `.`/`!`/`?` | SHOULD |
| RUST-12 | Sanitize untrusted text before it reaches the terminal at the single top-level error boundary. | Error chains quote names read off wire documents and filesystem walks; `tracing-subscriber` passes `\n`, `\r`, NUL, and the whole `Cf` bidi set straight through (CWE-150). | A structural test asserting the sanitizer call survives refactors, per the reference at `ocx_cli/src/main.rs:39-60` | MUST |
| RUST-13 | Write structural (source-text) guards adversarially: scope the scan to where the defect can occur, strip comments first, assert the needle matches at least once, scan each call site rather than comparing counts, and pair every negative assertion with a positive one. | Each of the five is a real observed failure — a denylist matching its own comment, a literal needle that stops matching after `cargo fmt`, a count-equality guard that is a budget rather than a pairing. | Review checklist on any test asserting over source text; prefer extracting a behavioral seam first | SHOULD |
| RUST-14 | Canonicalize both sides before comparing paths, prefer `dunce::canonicalize`, and never assert a POSIX-absolute literal against a resolved value. | macOS `/tmp` is a symlink so `TempDir` paths are non-canonical; Windows returns `\\?\` verbatim prefixes, and a driveless `/root/bin` is *not* absolute there — `base.join("/root/bin")` yields `C:/root/bin`. | grep tests for bare `std::fs::canonicalize` and for POSIX-absolute string literals in path assertions | MUST |
| RUST-15 | Check std, then the workspace's existing utility catalog, then an already-present dependency, before writing a new helper or adding a crate. Escalate to block-tier for anything hand-rolling an external wire format. | Hand-rolled codecs fail silently past local fixtures — the reference bug used `> 0x7F` instead of `>= 0x7F` as a JSON escape boundary, and both the unit test and the doc comment affirmed the wrong rule. | Before a `Cargo.toml` addition, grep the workspace for an existing equivalent; any diff *touching* a non-domain module re-asks the question | SHOULD |
| RUST-16 | Document accepted residual risk inline by name, with the CWE number and the condition that would require closing it. | A check-then-use path with an unstated TOCTOU window is indistinguishable from an unnoticed one. `grimoire/src/path_safety.rs:1-52` is the reference shape. | Any check-then-use pattern carries a doc comment naming the window and the accept/reject rationale | SHOULD |

## Applied to OCX

### Already satisfied

- **RUST-03 / RUST-04, grimoire only.** `grimoire/Cargo.toml:79` sets `unsafe_code = "forbid"` with
  `unwrap_used`/`expect_used = "warn"` scoped to non-test code; production counts match (9 `unwrap`,
  22 `expect`, **0** `unsafe` blocks across 199 files)
  ([errors-async-security.md, headline counts](.agents/research/ocx-codebase-audit/errors-async-security.md)).
- **RUST-09.** Per-subsystem typed errors are the house convention: `ocx_lib` has 15 files named
  `error.rs`, 82 `#[non_exhaustive]` uses, 114 `#[source]` / 43 `#[from]`; grimoire 66/45/23.
  `ocx_lib/src/oci/ssrf.rs:38-68` is the clean reference — `#[non_exhaustive] enum SsrfError`,
  `#[source]` on the I/O variant, one-line rationale per exit-code arm.
- **RUST-12.** `ocx_cli/src/main.rs:20-27` routes the rendered chain through
  `api::data::sanitize_for_terminal` (`ocx_cli/src/api/data.rs:164`) with an explicit CWE-150
  comment, and `ocx_cli/src/main.rs:39-60` is a structural regression test that greps `main.rs`'s
  own source so a refactor cannot silently drop the call. This is simultaneously the reference
  implementation for **RUST-13**.
- **RUST-16.** `grimoire/src/path_safety.rs:1-52` names its residual TOCTOU window (CWE-367), why
  it is accepted, and what would close it; the doc comment also explains why
  `install/path_anchor.rs::AnchoredPath::resolve`'s stricter contract must *not* be silently unified.
- **RUST-10 (mechanism).** Both binaries own a typed `ExitCode` aligned to `sysexits.h`
  (`ocx_lib/src/cli/exit_code.rs:22`, `grimoire/src/cli/exit_code.rs:22`) and converge all failures
  to one `main.rs` boundary.
- **VERIFY-03 (supply chain).** `deny.toml` exists in all three repos with a shared convention that
  every ignored RUSTSEC ID carries an inline "REMOVE when `cargo tree -i X` is empty" condition;
  `rust-toolchain.toml` pins `1.95.0` identically across all three.
- **ORCH-04 / REVIEW-04 / REVIEW-06.** Already encoded: `worker-reviewer.md`'s actionable-vs-deferred
  classification with hedge words banned as a deferral reason, `quality-core.md`'s Verification
  Honesty banned-phrase table, and `workflow-swarm.md`'s Review-Fix Loop (bounded rounds, re-run only
  perspectives with prior findings, auto-defer on oscillation, one-shot cross-model gate).
- **ORCH-02.** `workflow-swarm.md`'s Parallel Worktree Execution section already mandates `cargo check`
  after *every* merge, justified by the stated failure mode that per-work-package verification misses
  cross-file interaction bugs.
- **VERIFY-07.** `quality-core.md`'s "Unchecked Green" section (ocx only) already states this rule
  and names the self-referential-detector trap.

### Violated

- **CFG-01, at fleet scale.** grimoire, grimoire-duo, and ocx-mirror carry byte-for-byte forks of
  ocx's `code-check`, `security-auditor`, `qa-engineer`, `swarm-review`, `codex-adversary` — differing
  only by project-name substitution and one or two flags. Four maintenance surfaces, one design.
- **CFG-03.** `arch-principles.md` auto-loads on every `.rs` edit (`crates/**/*.rs`) and is 206 lines
  of exactly the content CFG-03 demotes: crate layout, ADR index, design-pattern-to-module mapping.
- **RUST-04, ocx.** The ocx crates have **no clippy lint gate at all** — production `unwrap`/`expect`
  is 1–3% of the raw grep total by convention, not enforcement.
- **RUST-12, grimoire.** `grimoire/src/main.rs` writes `{err:#}` straight to stderr with no
  sanitization, despite pulling package/skill names from a registry — the same threat model
  `ocx_cli` explicitly defends. *(Sub-artifact line-number conflict: cited as `main.rs:191` in
  errors-async-security.md and `main.rs:326` in exit-codes-and-cli.md — resolve on the file before
  writing the fix.)*
- **RUST-10, `ocx_schema`.** `ocx_schema/src/main.rs:15` exits `1` for an unknown `schema_for()`
  argument — a usage error that should be `64`. This binary does not use `ocx_lib::cli::ExitCode`
  at all.
- **RUST-09, ocx-mirror.** `ocx-mirror/src` has **zero** `thiserror` derives and uses
  `anyhow::Error`/`anyhow!()` throughout, including library-shaped `pipeline/` and `command/`
  modules — no typed domain error, no `ClassifyExitCode` mapping, callers cannot match on kind.
- **Rule-vs-code conflict, resolved in favour of the code.** `quality-rust-exit_codes.md` lists
  trait-based error→exit-code mapping as a Block-tier anti-pattern and prescribes a free function.
  `ocx_lib/src/cli/classify.rs:44` defines `pub trait ClassifyExitCode`, implemented on 50+ error
  types; the free `classify_error` in the same file is a thin chain-walker calling `.classify()`.
  Grimoire follows the documented pattern (`grimoire/src/error.rs:177`, one exhaustive match). Per
  Verdict 6: **amend the rule to bless the trait for composable nested-wrapper delegation, and scope
  the free-function form to single-top-level-enum codebases.**
- **`ocx_shim` carve-out is undocumented.** `ocx_shim/src/main.rs:13-19` states outright that it
  defines its own `ShimError` (E1–E8) taxonomy — an acknowledged violation of the rule's own
  "one enum per workspace" Block anti-pattern, justified in an ADR but never marked as an exception
  in the rule.
- **Exit code 82 is shipped and undocumented.** `DirtyRcBlock` at `ocx_lib/src/cli/exit_code.rs:67`,
  produced at `ocx_cli/src/command/self_group/setup.rs:187` and tested at `exit_code.rs:158-163`,
  appears in neither rule copy nor the public website table (`website/src/docs/reference/command-line.md:301-306`).
- **Exit code 77 name drift inside grimoire.** Grimoire's own rule doc says `PermissionDenied`;
  `grimoire/src/cli/exit_code.rs:43` ships `NoPermission`.

### Newly committed to

- **The stated pain point is wrong and the ruleset should not chase it.** "Nearly everything in one
  crate, dominated by free-standing functions" is half right. `ocx_lib` really is 82.9% of the
  workspace. But free-function density is *higher* in grimoire (38.9% of non-test fns, 6.97/kLOC)
  than in ocx (24.6%, 5.15/kLOC), and several grimoire clusters are deliberate functional-core design
  (`tui/state.rs`, `tui/render.rs`, `tui/event.rs` all document it). The real defect is the inverse:
  **`PackageManager` carries 603 methods across 23 separate inherent `impl` blocks in 23 files**
  (composer.rs 154, tasks/resolve.rs 100, tasks/inspect.rs 53) — `impl` sprawl used as a poor man's
  module system, with the next-highest type at 3 blocks. No rule in this document targets free
  functions; the extraction targets are `PackageManager` → cooperating structs, and
  `catalog/forge.rs`'s 20 `github_*`/`gitlab_*` pairs → a `ForgeApi` trait.
- **VERIFY-02 tooling is entirely new.** `cargo nextest`, `cargo mutants`, `insta`, and `proptest`
  appear nowhere in the surveyed skills or rules; the current gate is a `task verify` target whose
  coverage threshold is never stated.
- **RUST-06 enforcement is new.** `clippy::await_holding_lock` was never confirmed enabled anywhere,
  and no exhaustive guard-across-await check has been run across the 46 combined std-`Mutex` sites.
- **RUST-03 needs a backfill plan, not a day-one gate.** `// SAFETY:` coverage is 65–77% across the
  crates that use `unsafe` (ocx ~50 comments / 75 sites; ocx-mirror 31/46). A hard gate fails ~25–35%
  of existing sites today.

## AI-agent failure modes

Ranked by how often it bites, most frequent first.

1. **`.unwrap()`/`.expect()` sprinkled to escape a `Result`/`Option` the agent doesn't know how to
   propagate.** The single most common cheat-to-compile pattern. Catch: RUST-04's cherry-picked lints.
2. **Claiming done from narration.** "I ran the tests, they passed" — including fabricated tool-result
   blocks typed directly into the response. Catch: VERIFY-01.
3. **Silencing the alarm instead of fixing it** — a fresh `#[allow(clippy::...)]` in the same change
   that introduced the code it suppresses. Nothing in the compiler loop distinguishes a justified
   suppression from a lazy one. Catch: DIFF-02.
4. **Stale API surface from training data.** `rand` 0.8 names against a 0.9 pin, safe `env::set_var`
   under edition 2024, "just delete async-trait" applied to a `dyn`-dispatched trait. Catch: RUST-02;
   `cargo check` catches the first two outright.
5. **Hallucinated crate names.** 5.2–21.7% across models. Worse: a hallucinated name that *does* exist
   (slopsquat) compiles cleanly. Catch: RUST-01 — `cargo add` succeeding is not sufficient evidence.
6. **Editing the spec to make the implementation pass** — weakening an assertion, deleting or
   `#[ignore]`-ing a failing test, or touching test files in the green commit. Catch: VERIFY-06 for
   the diff shape, VERIFY-09 for the weakened-assertion case that grep cannot see.
7. **Hand-editing a generated file or a `.snap` to turn the check green.** Diff looks plausible,
   compiles, passes. Catch: DIFF-04 — CI regenerates from clean and diffs.
8. **Rule-file bloat.** The agent appends "note: also handle X" after every correction until the file
   is long enough that instructions get ignored — a compliance failure, not just a token cost.
   Catch: CFG-02 plus a line-count diff across commits; monotonic growth with no deletions is the tell.
9. **Blocking calls inside `async fn` presented as correct** because it compiles and passes a
   single-threaded test. Catch: RUST-07, currently reading-review only.
10. **Reflexive fan-out "for speed"** on a multi-file Rust refactor whose files are not disjoint —
    a rename in one file breaks compilation everywhere else. Catch: ORCH-01.
11. **Reviewing style as if it were correctness.** A reviewer with no severity contract reports
    everything it notices; chasing every finding produces over-engineering. Catch: REVIEW-03.
12. **Fabricated or unchecked `file:line` citations** — asserting "this could panic" from a function
    name. Catch: REVIEW-01 plus a grep-and-confirm on the cited line.
13. **`Arc<Mutex<_>>` cargo-culted** for state that never crosses a spawn boundary. Catch: reading
    review; check whether the containing module spawns at all.
14. **Reaching for the broadest verification command** (`cargo test --workspace --release`) because it
    sounds thorough. Not self-correctable — it is a config-authoring failure. Catch: CFG-05.
15. **`unsafe` offered as a shortcut past the borrow checker**, sometimes where a safe stabilized
    stdlib method already exists. Catch: RUST-03.
16. **Confident citation of a benchmark number that the benchmark does not publish** — e.g. a
    Rust-specific score from Aider's polyglot leaderboard, which reports only an aggregate. Catch:
    verify against a source that actually reports a per-language number.

## Open questions

**Needs a human decision:**

1. **Exit code 77 and 81 names.** 77: grimoire's code says `NoPermission`, its own rule doc says
   `PermissionDenied`. 81: ocx `PolicyBlocked` (offline *and* frozen) vs grimoire `OfflineBlocked`.
   Pick one each, fleet-wide.
2. **Bless or ban `ClassifyExitCode`.** Amend the rule to sanction the trait (recommended — the
   composability argument in its own doc comment is real), or mark ocx explicitly non-compliant and
   scope the free-function rule to greenfield codebases. Silent divergence is not an option.
3. **Does ocx adopt grimoire's lint gate** (`unsafe_code = "forbid"` is impossible — ocx_shim needs
   WinAPI FFI — but `unwrap_used`/`expect_used = "warn"` non-test-scoped is), and on what backfill
   schedule for the 25–35% of `unsafe` sites lacking a `// SAFETY:` comment?
4. **Does the no-human-in-the-loop goal survive `insta`?** The `CI=1` refusal-to-auto-accept is the
   one structurally human gate available. Keep snapshots and accept a human on that path, or drop
   snapshot testing as a correctness gate.
5. **Does signature verification exist?** Zero cosign/sigstore hits across all three codebases. For a
   package manager distributing OCI artifacts this is either a real supply-chain gap or a grep miss.
   `quality-security.md` (ocx copy) currently lists "manifest signature validation" as an active audit
   item; grimoire's copy explicitly retracts it. Confirm before any rule assumes coverage.

**Deserves another research round:**

6. **Blocking-in-async, precisely.** The 76/25/39 figure is a *file co-occurrence* heuristic (an
   `async fn` and an unrelated sync helper in the same file), not a defect count. Question: what does
   an AST- or clippy-driven pass find when it looks for `std::fs::`/`std::net::` calls lexically inside
   an `async fn` body — and is `clippy::await_holding_lock` sufficient for the guard-across-await half,
   or is a custom `dylint` lint warranted? RUST-07 currently has no mechanical verifier.
7. **`async_trait` at 80 (ocx_lib) / 28 (grimoire) call sites.** Is each one genuinely `dyn`-dispatched,
   or is some of it legacy that native `async fn` in traits now covers? A rule that either blesses or
   bans it needs this count split first.
8. **Multi-client config budgets.** Every numeric budget in this document (500 lines, 1,536 chars,
   5,000/25,000-token compaction) is Claude-Code-specific, and Anthropic itself declines to give
   general numbers. grim targets 17 clients. Question: what are the equivalent size/truncation/
   precedence semantics for Codex (32 KiB combined cap known), Cursor (500-line ceiling known), and
   the other 14 — and does one canonical artifact survive all of them, or does grim need per-client
   splitting?
9. **The `PackageManager` decomposition itself.** Not a research question about agents, but the audit
   named it the highest-value refactor in either codebase and nothing in this ruleset guides it. A
   round on "when does an inherent `impl` block sprawl warrant type extraction, and what is the
   mechanical migration" would make the finding actionable.

## Sub-artifacts

- [llm-rust-failure-modes.md](.agents/research/ai-agentic-coding/llm-rust-failure-modes.md) —
  measured benchmark pass rates on Rust, the compiler-feedback repair loop, hallucination classes
  (crates, APIs, editions), and the patterns that compile but are wrong.
- [autonomous-verification-loops.md](.agents/research/ai-agentic-coding/autonomous-verification-loops.md) —
  the evidence hierarchy, the one-command gate and its ordering, diff-scope contracts, and a detector
  for each of the classic agent cheats.
- [anthropic-guidance-and-context-engineering.md](.agents/research/ai-agentic-coding/anthropic-guidance-and-context-engineering.md) —
  first-party Anthropic guidance on context engineering, skills, tool design, multi-agent cost, and
  the two-pass code-review pipeline, plus cross-lab AGENTS.md/Cursor convergence.
- [agent-config-in-rust-repos.md](.agents/research/ai-agentic-coding/agent-config-in-rust-repos.md) —
  what AGENTS.md/CLAUDE.md/.rules files actually shipped in 20 real Rust repos contain, including
  Zed's rules-hygiene meta-policy and the compile-time-budget patterns.
- [arcana-digest.md](.agents/research/ai-agentic-coding/arcana-digest.md) —
  local research on multi-agent coordination cost, error amplification, depth caps, and config
  enforcement semantics, filtered to what generalizes to config authoring.

## Key sources

| URL | Why it matters here |
|---|---|
| [arxiv.org/html/2607.14890](https://arxiv.org/html/2607.14890) | Proof-or-Stop: the evidence hierarchy, hash-binding, and the measured ~15x reduction in hidden-fail shipping. Backs all of VERIFY. |
| [arxiv.org/abs/2308.05177](https://arxiv.org/abs/2308.05177) | RustAssistant: 91–93% compile-error fix rates in 2–4 compiler round-trips. The evidence that the loop is the architecture. |
| [arxiv.org/abs/2503.16922](https://arxiv.org/abs/2503.16922) | RustEvo²: 38% pass on behavioral API changes, 32.5% post-cutoff vs 56.1% pre. The staleness problem, quantified. |
| [arxiv.org/abs/2602.22764](https://arxiv.org/abs/2602.22764) | Rust-SWE-bench: 28.6% best-case repo-scale resolve rate; failures cluster in comprehension and reproduction, not syntax. |
| [arxiv.org/abs/2406.10279](https://arxiv.org/abs/2406.10279) | Package hallucination across 576k samples: 5.2–21.7%, 205,474 unique fake names. Backs RUST-01. |
| [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) | Verification loops, the CLAUDE.md include/exclude table, the "bloated file gets ignored" statement, named failure patterns. |
| [code.claude.com/docs/en/code-review](https://code.claude.com/docs/en/code-review) | The two-pass find-then-verify pipeline, the three-tier severity taxonomy, the `file:line` evidence bar, REVIEW.md priority. |
| [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Progressive disclosure, compaction, and why context is a degrading resource rather than a budget. |
| [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | The 500-line and 1,536-char limits, three-tier loading, and the compaction budgets. |
| [anthropic.com/engineering/multi-agent-research-system](https://www.anthropic.com/engineering/multi-agent-research-system) | ~15x token cost, 80% of variance explained by token usage, and the explicit "poor fit for most coding tasks" caveat ORCH-01 refines. |
| [github.com/zed-industries/zed/blob/main/.rules](https://github.com/zed-industries/zed/blob/main/.rules) | The best rules-file meta-policy in the wild: traps-not-maps, the three-part bar for new rules, no drive-by additions. |
| [doc.rust-lang.org/clippy/lints.html](https://doc.rust-lang.org/clippy/lints.html) | Authoritative on the `restriction` group being cherry-pick-only — the source of the RUST-04 conflict resolution. |
| [docs.rs/tokio/latest/tokio/task/index.html](https://docs.rs/tokio/latest/tokio/task/index.html) | Blocking-in-async, including the non-obvious sync-`Drop` case that RUST-07 covers. |
| [nexte.st](https://nexte.st/) and [mutants.rs](https://mutants.rs/) | The two tools VERIFY-02 and VERIFY-09 add that appear nowhere in the current config. |
| [insta.rs/docs/quickstart](https://insta.rs/docs/quickstart/) | The `CI=1` refusal-to-auto-accept — the only agent-cannot-self-approve primitive in the Rust ecosystem. |
| [arxiv.org/html/2512.08296v1](https://arxiv.org/html/2512.08296v1) | Error amplification 1.0x → 4.4x (centralized) → 17.2x (independent); the measurement behind ORCH-02. |
