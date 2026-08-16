---
title: AI-Assisted Large Refactors and Migrations in Practice
topic: AI-assisted large-scale code refactors and migrations
agent: subarea-researcher-large-refactors
model: sonnet
date_researched: "2026-08"
sources_count: 13
scope: |
  Covers: published outcomes from AI-assisted and deterministic large-scale
  code migrations (Google, Anthropic/Bun/Krieger, academic surveys); codemod
  tooling (ast-grep, comby, OpenRewrite, Sourcegraph Batch Changes); Rust-native
  mechanics for safe large refactors (rust-analyzer SSR, cargo fix --edition,
  cargo-mutants, cargo-semver-checks, workspace splitting); and a concrete
  playbook for splitting a single-crate Rust CLI into a workspace with an
  agent-driven, behavior-preserving process.
  Does not cover: general prompt-engineering advice unrelated to refactors,
  non-Rust language-specific migration tooling beyond what illustrates a
  transferable technique, or IDE-specific keybindings.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Measured outcomes from published AI-assisted migrations](#1-measured-outcomes-from-published-ai-assisted-migrations)
   2. [Deterministic codemod tooling and when it beats an LLM](#2-deterministic-codemod-tooling-and-when-it-beats-an-llm)
   3. [Decomposing a refactor into agent-sized work packages](#3-decomposing-a-refactor-into-agent-sized-work-packages)
   4. [Parallel agents, worktrees, and merge-conflict management](#4-parallel-agents-worktrees-and-merge-conflict-management)
   5. [Rust-specific mechanics for big refactors](#5-rust-specific-mechanics-for-big-refactors)
   6. [Verification of behavioral equivalence](#6-verification-of-behavioral-equivalence)
   7. [Failure stories and the controls that catch them](#7-failure-stories-and-the-controls-that-catch-them)
   8. [Playbook: split a single-crate Rust CLI into a workspace, agent-driven](#8-playbook-split-a-single-crate-rust-cli-into-a-workspace-agent-driven)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Anthropic's own large-scale migration playbook is six steps: rulebook + dependency map + gap inventory → stress-test on a sample → parallel translation → compile-fix loop → smoke tests → full parity verification against the old codebase ([Anthropic](https://claude.com/blog/ai-code-migration)).
- Bun's ~1M-line Zig→Rust port took under two weeks, cost ~$165K in API spend, passed 100% of the existing test suite before merge, but still surfaced 19 regressions post-merge — passing tests pre-merge is not proof of zero defects ([Anthropic](https://claude.com/blog/ai-code-migration)).
- Google's internal LLM-assisted migration study (39 migrations, 3 developers, 12 months) reports the LLM generated 74.45% of code changes and 69.46% of edits, with an estimated 50% reduction in migration time — but this is *labor* saved, not a defect-rate claim ([Ziftci et al., arXiv:2504.09691](https://arxiv.org/abs/2504.09691)).
- The core operating principle from Anthropic's writeup: "you don't fix the code, you fix the process (loop) that produced the code" — when a defect pattern is found, patch the rulebook/prompt, not the one file, so the fix propagates to every future generation ([Anthropic](https://claude.com/blog/ai-code-migration)).
- Deterministic, rule-based codemods (OpenRewrite, ast-grep, comby, Sourcegraph Batch Changes) should be preferred over LLM generation whenever the transformation is expressible as a structural pattern — they are repeatable, diffable, and need no per-file human review ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring); [ast-grep](https://ast-grep.github.io/guide/rewrite-code.html)).
- AI's complementary role is where rules run out: semantic understanding of intent, discovering *which* deterministic recipe applies, and handling the long tail of one-off cases a codemod can't express ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring)).
- Work should be split into units whose completion is checkable by disk state (a file exists, a test passes) so the queue can be rebuilt from scratch and resumed after any interruption — this is what makes fan-out to many agents safe ([Anthropic](https://claude.com/blog/ai-code-migration)).
- Model tiering matters economically and qualitatively: cheap/fast models for high-volume mechanical implementation, larger models reserved for adversarial review and rule-writing, not bulk translation ([Anthropic](https://claude.com/blog/ai-code-migration)).
- Compilers, differs, and test runners should be the arbiter of correctness during the fix loop, not human judgment on individual diffs — humans review patterns and rule changes, not every file ([Anthropic](https://claude.com/blog/ai-code-migration)).
- `cargo fix --edition` automates the mechanical part of a Rust edition migration but explicitly cannot fix doctests, build-time codegen, or macro/proc-macro incompatibilities — those need manual passes ([Rust Edition Guide](https://doc.rust-lang.org/edition-guide/editions/transitioning-an-existing-project-to-a-new-edition.html)).
- rust-analyzer's Structural Search and Replace (`rust-analyzer.ssr`) does type- and path-aware rewrites (`$pattern ==>> $replacement`), which is strictly safer than text/regex substitution for Rust because it respects name resolution ([rust-analyzer book](https://rust-analyzer.github.io/book/features.html)).
- `cargo-mutants` measures whether your test suite would actually catch a wrong behavior by injecting mutations and checking if any test fails — run it on the pre-refactor code to size the safety net *before* trusting "tests pass" as your only equivalence gate ([mutants.rs](https://mutants.rs/)).
- `cargo-semver-checks` catches removed items, added required params, and reduced visibility automatically, but it explicitly does **not** yet catch breaking changes to a type's shape (field/parameter type changes) or generic/lifetime changes — treat it as a floor, not a ceiling, on API-compatibility checking ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)).
- Cargo workspaces make `[workspace.dependencies]` the single place versions are pinned across members, and any `path` dependency inside the workspace directory is automatically a member unless excluded — relevant when extracting a module into its own crate ([Cargo Book](https://doc.rust-lang.org/cargo/reference/workspaces.html)).
- Rust's own module-privacy defaults (everything private unless `pub`) mean that extracting code into a new crate is a *visibility-widening* operation by construction — every symbol the new crate needs from the old one must be explicitly exported, which is exactly the point where AI agents most often either over-expose (`pub` everything to make it compile) or silently break external callers ([Cargo Book](https://doc.rust-lang.org/cargo/reference/workspaces.html); pattern observed across sources, see §7).
- Sourcegraph Batch Changes and OpenRewrite both scale by keeping the transform declarative (a spec/recipe) and separating "define the change" from "apply and track it" — the same separation Anthropic's rulebook step imposes on LLM-driven migrations ([Sourcegraph](https://sourcegraph.com/docs/batch-changes); [OpenRewrite](https://docs.openrewrite.org/)).
- The one recurring failure mode across every source consulted is *review fatigue defeating the safety net*: once an AI-driven change is "mostly right," human reviewers stop reading carefully, so the controls that matter are ones that don't depend on a human reading every line (parity tests, semver checks, mutation testing, adversarial second-agent review) ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring); [Anthropic](https://claude.com/blog/ai-code-migration)).

## Findings

### 1. Measured outcomes from published AI-assisted migrations

**Anthropic (Claude Code, Bun and internal migrations).** Anthropic's own methodology post documents two case studies plus internal usage data. The headline case is Jarred Sumner's Bun migration: roughly one million lines of Zig ported to Rust in under two weeks, at ~$165,000 of API spend (5.9B input / 690M output tokens), with the full existing test suite passing before merge. Post-merge, 19 regressions surfaced and were fixed. The port also shipped a 19% smaller binary on Linux/Windows and a 2–5% performance improvement, with about 4% of the new code in `unsafe` blocks. A second case, Mike Krieger's Python→TypeScript migration (165,000 lines) ran over a single weekend, verified with 7 real-world scenario parity tests and 4 overnight autonomous improvement cycles, primarily to cut a ~30-minute cross-platform build down to ~2 seconds. Internally, Anthropic reports individual engineers migrating 10 packages of tens-to-hundreds-of-thousands of lines in a month using a mix of Sonnet-class and Opus-class models ([Anthropic](https://claude.com/blog/ai-code-migration)).

**Google (Ziftci et al., 2025).** A study of 39 distinct migrations run by 3 developers over 12 months, covering 595 submitted changes and 93,574 edits. The LLM authored 74.45% of code changes and 69.46% of edits; developers estimated a 50% time reduction versus prior manual migration practice ([arXiv:2504.09691](https://arxiv.org/abs/2504.09691)). A related, separately reported Google case — migrating 32-bit to 64-bit IDs in the Ads codebase — is cited as cutting migration time 50% with the model authoring 80% of changes, and a Java-file-edit prediction accuracy of 91% ([industry analysis of Google's enterprise LLM customization](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring)). Note these numbers come from an internal enterprise-tuned model, not an off-the-shelf assistant — treat the specific percentages as upper bounds for a purpose-built system, not a baseline any agent should be expected to hit.

**ClangMR (Google, 2013), the deterministic precursor.** Before LLMs, Google combined the Clang compiler frontend (semantic understanding of C++) with MapReduce (distributed execution) to perform large-scale, semantically-correct refactors across its C++ monorepo, reported as used in a real API migration ([Google Research](https://research.google/pubs/pub41342)). This is the direct ancestor of today's "structural codemod" tools (ast-grep, comby, OpenRewrite) — the lineage matters because it establishes that *compiler-grade semantic matching*, not text matching, is the bar large-scale refactor tooling has cleared for over a decade; an LLM-based approach that regresses to text-level pattern matching is a step backward, not forward.

**Synthesis across sources.** The consistent shape across all three is: (a) an AI/LLM layer does high-volume, low-judgment translation; (b) a deterministic layer (compiler, test runner, structural diff) gates what's accepted; (c) humans review policy (rules, patterns) rather than individual diffs; (d) even with 100% pre-merge test pass rates, some behavioral regressions still escape to post-merge — the test suite's coverage, not the AI's competence, is usually the limiting factor.

### 2. Deterministic codemod tooling and when it beats an LLM

The general industry position, argued explicitly in a synthesis of Google's own experience, is: **prefer deterministic recipes whenever the transformation is expressible as one**, and reserve AI for (1) finding *which* recipe applies where, (2) authoring the recipe itself from examples, and (3) the residual cases no recipe covers ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring)). The reasoning: a deterministic recipe is repeatable, independently auditable once, and applies identically everywhere — an LLM re-derives (and can re-err) per occurrence.

- **ast-grep** — Rust-authored, tree-sitter-backed structural search/replace with a YAML rule format. Rules are `pattern` + `fix`, with `$X`-style metavariables capturing single AST nodes and `$$$X` capturing variadic sequences:

  ```yaml
  id: swap
  language: Python
  rule:
    pattern: $X = $Y
  fix: $Y = $X
  ```

  Complex rewrites can expand the matched range with `expandStart`/`expandEnd` (e.g., to also delete a trailing comma), and the rewrite preserves indentation of the substituted text automatically ([ast-grep docs](https://ast-grep.github.io/guide/rewrite-code.html)).

- **comby** — language-agnostic structural matching via lightweight templates (`:[a]`, `:[hole]`) instead of regex, explicitly built to avoid regex's escaping problems with nested delimiters and multiline code:

  ```
  comby 'failUnlessEqual(:[a],:[b])' 'assertEqual(:[a],:[b])' example.py
  ```
  ([comby.dev](https://comby.dev/)).

- **OpenRewrite** — parses source into a Lossless Semantic Tree (LST) that retains formatting, so recipe-driven edits don't create formatting-only diff noise, which is itself a review-burden reducer at scale. Recipes compose visitors; a commercial platform (Moderne) runs them across many repos. No quantified case-study numbers are published on the docs site itself ([OpenRewrite docs](https://docs.openrewrite.org/)).

- **Sourcegraph Batch Changes** — orchestrates changes across many repositories via a three-stage flow: a YAML *batch spec* declares repos/commands/templates, execution produces *changeset specs* (diffs + PR metadata), and a controller reconciles PR/MR state going forward. It is repo-fanout tooling, not an in-repo refactor engine — the actual transformation still comes from a script, codemod, or LLM call the spec invokes ([Sourcegraph docs](https://sourcegraph.com/docs/batch-changes)).

**When to reach for which**: a rename, an API-signature-preserving call-site rewrite, or a lint-driven fix belongs in ast-grep/comby/OpenRewrite — no agent should touch it. An LLM agent should be used only where the transformation requires understanding intent (e.g., "this free function reads like it should be a method — move it, and decide which type") or where no existing recipe covers the shape, and even then, the agent's job is often to *write the recipe*, not apply it file-by-file.

### 3. Decomposing a refactor into agent-sized work packages

Anthropic's playbook, generalized:

1. **Rulebook + dependency map + gap inventory** (human-heavy). Enumerate translation rules explicitly (this idiom maps to that idiom), map file/module dependencies to get an ordering, and inventory places where the target structure has no direct source equivalent (architectural gaps that need a design decision, not a translation).
2. **Stress test** on a small, representative sample before committing to the full-scale run — this is where systemic rule errors get caught cheaply.
3. **Fan out** implementer agents across the full file set using the now-validated rules.
4. **Compile-fix loop**: run the compiler, bucket errors by root cause (not by file), and have a fixer agent address each *category* once, applied everywhere it recurs.
5. **Smoke test**: run cheap tests, again bucketing crashes by root cause.
6. **Full parity verification**: run the complete test suite (or a purpose-built parity harness) against old and new implementations.

The unit of work at every stage after the rulebook is chosen so completion is checkable from disk state alone — "does file X exist and compile" — which lets the queue be rebuilt and resumed after any interruption without re-deriving what's left to do ([Anthropic](https://claude.com/blog/ai-code-migration)). This is the single most load-bearing technique in the writeup: it turns a multi-day agent run into something that survives crashes, rate limits, and context resets for free.

Model tiering follows the same decomposition: cheap models do the high-volume fan-out (step 3), expensive models do adversarial review and rule-writing (steps 1, 4's categorization, and reconciling reviewer disagreement) — never the reverse, since bulk work is where token volume dominates cost and judgment work is where model quality dominates outcome ([Anthropic](https://claude.com/blog/ai-code-migration)).

### 4. Parallel agents, worktrees, and merge-conflict management

The published sources don't give a worktree-specific playbook beyond confirming the practice exists at scale (Anthropic's Bun case fanned out across 1,448 files in parallel; the Python→TypeScript case used 12 subagents) ([Anthropic](https://claude.com/blog/ai-code-migration)). The generalizable mechanics, consistent with how the disk-state-driven queue in §3 must work to be safe for parallel writers:

- **Partition by disjoint file set**, not by feature or by time — two agents must never hold write locks on files that import each other in ways that could produce a half-migrated intermediate state visible to a third agent.
- **One worktree per agent**, each on its own branch, so agents never contend for the same working directory or index lock; merges into the integration branch happen serially even though generation happens in parallel.
- **Merge order follows the dependency map from step 1**, not commit-completion order — a leaf module that has no internal dependents can merge as soon as it's green; a module other in-flight work depends on should not merge until dependents are ready to consume its new shape, or every dependent needs a second pass.
- **The build daemon / compile step is serialized** even when generation is parallel, because compilation and test execution contend for CPU and can produce nondeterministic flakiness under concurrent load — Anthropic explicitly calls this out as a reason to funnel compiles through a single daemon rather than let each agent compile independently ([Anthropic](https://claude.com/blog/ai-code-migration)).

### 5. Rust-specific mechanics for big refactors

**Structural Search and Replace (rust-analyzer).** Invoked via the `rust-analyzer.ssr` command (or as an inline assist), syntax is `<search> ==>> <replace>` with `$name` placeholders matching any single AST node (expression, type, path, pattern, or item). Because it operates on resolved paths, `foo::Bar` in a pattern matches a bare `Bar` used inside module `foo`, and it auto-inserts `*`/`&`/`&mut` when a receiver's reference-ness changes between pattern and replacement. Placeholders can carry constraints (`${x:kind(literal)}`, `not(...)`). Scope defaults to the whole workspace. This is meaningfully safer than ast-grep/comby for *Rust-internal* refactors specifically because it is name-resolution-aware, not merely syntax-aware — a plain-syntax tool cannot tell two identically-spelled `foo::Bar` in different modules apart, SSR can ([rust-analyzer book](https://rust-analyzer.github.io/book/features.html)).

**`cargo fix --edition`.** The documented edition-migration sequence:

```bash
cargo update
cargo fix --edition
# edit Cargo.toml: edition = "2024" (or target edition)
cargo build
cargo test
cargo fmt
```

`cargo fix` explicitly does **not** touch doctests, build-time code generation, or macro/proc-macro incompatibilities — those require a manual pass, and the guide recommends running `cargo fix` a second time (without `--edition`) afterward to pick up compiler suggestions before the test pass ([Rust Edition Guide](https://doc.rust-lang.org/edition-guide/editions/transitioning-an-existing-project-to-a-new-edition.html)). For unstable/nightly-gated edition features, the flow is `rustup update nightly && cargo +nightly fix --edition`, gated by a `cargo-features = [...]` line in `Cargo.toml`.

**`cargo-mutants` as the safety-net sizer.** It compiles mutated variants of your code (e.g., flip a `<` to `>=`, replace a function body with `Default::default()`) and reruns your test suite against each mutant; a mutant that *doesn't* cause a test failure marks a gap in coverage ([mutants.rs](https://mutants.rs/)). The correct use in a refactor is **not** "run it after the refactor" — run it on the pre-refactor code first to establish which behaviors your tests can actually detect a regression in; a green test suite with a low mutation-kill rate is not a trustworthy equivalence oracle, and any file about to be gutted by an agent is exactly where you want that number checked first.

**`cargo-semver-checks` at crate-extraction boundaries.** Catches: removed public items, newly-required parameters, reduced visibility, changed trait requirements, added generic constraints, `#[must_use]` changes. Does **not** yet catch: breaking changes to a field/parameter's *type* (as opposed to its presence), or breaking generic/lifetime changes ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)). Exit codes: 0 pass, 100 violations found, 101 tool error — wire it into CI as a hard gate on the extracted crate whenever a workspace split promotes former `pub(crate)` items to `pub`.

**Workspace mechanics for extracting a module into a crate.** A `[workspace]` table plus `members = [...]` (globs allowed) defines the workspace; any `path`-dependency inside the workspace root is auto-included as a member unless `exclude`d. `[workspace.dependencies]` centralizes version pins so the new crate and the old one don't drift onto different versions of a shared dependency. `[patch]`, `[replace]`, and `[profile.*]` are only honored in the *root* manifest, which matters if the extracted crate previously set a profile override — it silently stops applying once the crate is no longer the workspace root ([Cargo Book](https://doc.rust-lang.org/cargo/reference/workspaces.html)). Because Rust items are private by default, extraction is inherently visibility-widening: everything the new crate needs from the parent must become `pub` (or `pub(crate)` promoted further), which is the exact seam where an agent under time pressure tends to either over-widen (mark everything `pub` to make it compile, permanently enlarging the public API) or leave a needed item private (compile failure the agent then "fixes" by inlining a copy instead of exporting the original — a silent duplication bug). A `pub use old_crate::Thing as Thing;` shim in the original location preserves the old import path for external callers during a staged migration and can be `#[deprecated]`-annotated to schedule its removal.

### 6. Verification of behavioral equivalence

The strongest verification signal across every migration case study is **parity testing**: running the same input against old and new implementations and diffing output, rather than trusting either side's own test suite in isolation. Anthropic's methodology treats this as the final gate (step 6) and explicitly separates it from the earlier "does it compile / do smoke tests pass" gates — a codebase can compile and pass unit tests while still diverging in edge-case behavior no test happened to cover, which is exactly what produced Bun's 19 post-merge regressions despite 100% pre-merge pass rate ([Anthropic](https://claude.com/blog/ai-code-migration)).

Rust-specific tooling that operationalizes this same idea:
- **`cargo-mutants`** as a leading indicator of whether the test suite *would* catch a behavior change at all (§5) — run before trusting "tests pass" as an equivalence proxy.
- **Snapshot/characterization tests** (the `insta` crate, in Rust ecosystem convention) captured from the pre-refactor binary's output, then re-run unmodified against the post-refactor binary — this is the Rust-idiomatic version of Anthropic's "parity harness when no test suite exists."
- **`cargo-semver-checks`** as a structural (not behavioral) equivalence gate specifically for the public-API surface at a crate boundary (§5).
- **Property-based testing** (the `proptest` crate, in Rust ecosystem convention) generalizes a hand-written parity test into a generator + invariant check, useful when the input space is too large to enumerate representative cases by hand.

None of the fetched primary sources describe a benchmark-parity gate (performance regression testing) in detail beyond Bun's reported 2–5% performance *improvement* as an outcome metric, not a gate — treat CI-enforced benchmark parity as a technique to add deliberately, not one validated by the case studies here.

### 7. Failure stories and the controls that catch each

| Failure mode | How it manifests | Control that catches it |
|---|---|---|
| Silent behavior change | Code compiles, unit tests pass, output differs on an edge case no test covers | Parity/characterization testing against pre-refactor output (§6); `cargo-mutants` run pre-refactor to confirm the suite would even notice |
| Lost edge case during translation | An agent translating file-by-file drops a branch (e.g., an error path) because the target idiom "looked" equivalent | Compiler/test-runner as objective referee rather than human eyeballing the diff (§3); smoke-test crash bucketing by root cause surfaces *categories* of loss, not just one file |
| Test weakening | An agent "fixes" a failing test by loosening the assertion instead of fixing the code | `cargo-mutants` mutation-kill rate as a check that the suite still detects real regressions, not just as a pre-refactor sizing step but re-run after |
| Review fatigue | Once a mostly-correct AI diff looks plausible, human reviewers stop reading carefully, and the review step stops being a real gate | Every published source's structural answer is the same: move the gate off human attention and onto something deterministic (compiler, parity test, semver check, adversarial second-agent review) — humans review *patterns/rules*, not every diff ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring); [Anthropic](https://claude.com/blog/ai-code-migration)) |
| Visibility over-widening during crate extraction | Agent marks items `pub` to unblock a compile error, permanently enlarging the API surface | `cargo-semver-checks` as a CI gate on the newly-split crate (§5); code review specifically for new `pub` items, not the whole diff |
| Post-merge regressions despite 100% pre-merge test pass | Bun's 19 regressions after a fully-green pre-merge suite | Accept that pre-merge green is necessary but not sufficient; budget for a post-merge fix window and monitor production/integration signals, don't treat merge as the finish line |

### 8. Playbook: split a single-crate Rust CLI into a workspace, agent-driven

Concrete, ordered, applicable to a codebase like the OCX/Grimoire family (one crate, dominated by free-standing functions):

1. **Map the target shape before moving anything.** Human (or a single high-tier agent) writes the target module/crate boundary and, for each free function to be moved onto a type, which type and why. This is the "rulebook" step — do not let a fan-out of agents each invent their own boundary.
2. **Establish the safety net first.** Run `cargo mutants` on the current single crate to find where the test suite has gaps; write characterization/snapshot tests (`insta`) for CLI-level behavior (stdin/stdout/exit-code/filesystem side effects) before touching structure, since these are the parity oracle for every later step.
3. **Do deterministic moves with rust-analyzer SSR / ast-grep first**, not an LLM: mechanical renames, `use` path updates, and call-site rewrites that don't require judgment. Reserve agent time for the free-function → method conversions that require deciding *which* type owns the behavior.
4. **Introduce the workspace shape with the code still in one crate.** Add `[workspace]` + members, but do the actual code move as a second, separate step — proving the workspace scaffolding builds green before any logic moves reduces the blast radius of the next step.
5. **Move code crate-by-crate in dependency order** (leaves first — the crate with no internal dependents), each move as one agent-sized, independently buildable, independently revertible unit. After each move: `cargo build --workspace`, `cargo test --workspace`, `cargo semver-checks` on any crate whose public surface changed.
6. **Convert free functions to methods within each moved crate**, one type at a time, agent-sized. Add a `#[deprecated]` `pub use`/wrapper at the old free-function call site if any external code depended on it, rather than a bare rename that breaks callers silently at the type level but compiles.
7. **Run the full parity suite (step 6 of §6/§3) after each crate move**, not only at the end — catching a regression one crate-move after it was introduced is far cheaper to localize than catching it after the whole workspace split lands.
8. **Adversarial review pass**: a separate agent (or the human) reviews the diff specifically for new `pub` items, widened visibility, and any `TODO`/dropped-`unwrap`-handling introduced by the mechanical move — not a full line-by-line re-review of code that didn't move.
9. **Only after the full workspace builds green and parity passes**, remove the compatibility shims (`pub use` re-exports) added in step 6, in a final, separate, easily-revertible commit.

## Normative guidance candidates

1. **Rule**: Before an LLM agent touches a file for a mechanical transform (rename, signature-preserving call-site rewrite, visibility change), check whether ast-grep or rust-analyzer SSR can express it as a pattern; if yes, use that instead of agent generation. *Rationale*: deterministic tools are repeatable and don't need per-occurrence review. *Verify*: reviewer asks "could this diff have been an `ast-grep --update-all` run?" — if yes and it wasn't, flag it.
2. **Rule**: Every agent-driven migration/refactor work package must be sized so its completion is checkable from disk/build state alone (file exists + compiles + its tests pass), never from agent-reported status. *Rationale*: this is what makes the work queue resumable after a crash or context reset. *Verify*: the work-tracking mechanism (queue file, task list) is regenerated from a filesystem/`cargo check` scan, not from an agent's self-report, and still produces the correct remaining set after being deleted and rebuilt.
3. **Rule**: Run `cargo mutants` on the pre-refactor code before trusting "tests currently pass" as the equivalence oracle for a refactor. *Rationale*: a green suite with a low mutation-kill rate will not notice most regressions a refactor introduces. *Verify*: `cargo mutants` output; a specific numeric kill-rate threshold should be set per-repo and checked in CI on the pre-refactor baseline.
4. **Rule**: Any crate-boundary change (new crate, promoted `pub` item) must pass `cargo semver-checks` before merge, and the diff review must separately call out every newly-`pub` item. *Rationale*: extraction is inherently visibility-widening; agents under compile pressure default to over-widening. *Verify*: `cargo semver-checks` exit code in CI; `git diff` grep for `+pub ` lines reviewed individually.
5. **Rule**: Parity/characterization tests (snapshot of CLI stdout/stderr/exit-code/filesystem effects) must be captured from the pre-refactor binary before any structural change begins, and re-run unmodified against the post-refactor binary at every merge point, not only at the end. *Rationale*: compiling + unit tests passing is necessary but not sufficient — Bun's port hit 19 post-merge regressions despite a 100%-passing pre-merge suite. *Verify*: `insta` (or equivalent) snapshot diff is empty; snapshot files are committed pre-refactor and not regenerated mid-refactor without explicit review of the diff.
6. **Rule**: When an agent's fix to a failing test changes the assertion rather than the code under test, that diff requires the same review weight as a production-code change, not a lighter "just a test" pass. *Rationale*: test weakening is how a real regression becomes invisible. *Verify*: CI or review tooling flags any diff touching `assert*!`/`#[test]` bodies in the same PR as production-code changes for explicit sign-off.
7. **Rule**: Merge order for parallel agent work follows the dependency map (leaf modules first), not agent-completion order; compilation/test execution is serialized through one build path even when generation is parallel. *Rationale*: concurrent compiles contend for resources and can produce flaky, non-reproducible failures that get misattributed to the refactor. *Verify*: CI/build logs show one compile job at a time even when multiple agent branches exist; merge commit order matches the dependency map produced in the rulebook step.
8. **Rule**: `cargo fix --edition` output is a starting point, not a finished migration — doctests, build scripts, and macros/proc-macros must be checked by hand afterward. *Rationale*: the tool explicitly does not cover these categories. *Verify*: `cargo test --doc` passes; grep the diff for files under `build.rs` or `proc-macro` crates that `cargo fix --edition` did not touch, and confirm they were reviewed separately.
9. **Rule**: A migration's rulebook (translation rules + dependency map + known gaps) is a reviewed artifact in its own right, produced and stress-tested on a small sample *before* full fan-out begins. *Rationale*: fixing a systemic rule error after 1000 files have been generated from it costs 1000x what fixing it before generation costs. *Verify*: reviewer can point to a rulebook document/prompt and a sample-run diff that predates the full fan-out commit.
10. **Rule**: Reserve the largest/most expensive model tier for adversarial review and rule-writing; use the cheapest model capable of the mechanical translation for bulk fan-out. *Rationale*: judgment quality matters most where mistakes propagate (rules), volume/cost matters most where work is repetitive (bulk translation). *Verify*: check which model tier authored the rulebook/reviewed the diffs vs. which tier generated the bulk file changes, in the agent-run logs.

## AI-agent angle

- **Hallucinated or outdated `cargo fix`/edition behavior.** An agent may claim `cargo fix --edition` fully migrates a crate, including doctests and macros — it explicitly does not ([Rust Edition Guide](https://doc.rust-lang.org/edition-guide/editions/transitioning-an-existing-project-to-a-new-edition.html)). *Check*: `cargo test --doc` after any edition-migration commit; a failure there means the agent stopped early and reported success anyway.
- **Regex-based "structural" rewrites presented as safe.** An agent asked to do a Rust-wide rename may reach for `sed`/regex instead of rust-analyzer SSR or ast-grep, silently matching identifiers inside strings, comments, or unrelated modules with the same name. *Check*: grep the diff for changes inside `//`/`///` comments or string literals that shouldn't have been touched; prefer requiring the agent name which tool (SSR/ast-grep) it used and reject bare `sed`/`grep -l | xargs sed` for anything beyond single-file trivial cases.
- **Over-widened visibility to unblock a compile error.** When extracting a module and hitting a "private item" error, an agent's fastest fix is `pub`-ing the item rather than deciding whether it *should* be part of the new public API. This compiles and is wrong. *Check*: `cargo semver-checks` plus a manual diff scan for every new `pub` (rule 4 above).
- **Claiming semver-safety `cargo-semver-checks` doesn't actually verify.** An agent may report "API is backward compatible" after a workspace split where a field's *type* changed (not just presence/visibility) — the tool doesn't catch that class of break yet ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)). *Check*: don't take a green `cargo semver-checks` run as proof of full semver safety when field/parameter *types* changed; require a manual read of any such diff.
- **Test-suite green treated as proof of equivalence.** An agent will naturally report "all tests pass" as the finish line for a refactor; Bun's own migration shows this is necessary but not sufficient (19 post-merge regressions despite 100% pre-merge pass) ([Anthropic](https://claude.com/blog/ai-code-migration)). *Check*: require a parity/characterization-test diff (captured pre-refactor) as a separate, explicit gate, not folded into "tests pass."
- **Loosening a failing assertion instead of fixing the underlying diff.** Under pressure to turn a red test green, an agent will sometimes weaken the assertion rather than fix the regression it's flagging. *Check*: diff every touched `#[test]`/`assert*!` body specifically; a test that got *less specific* during a refactor commit is a red flag regardless of whether the suite is green.
- **Free-function-to-method conversion that silently changes error/ownership semantics.** Converting `fn do_thing(x: &Config, path: &Path) -> Result<T>` into `impl Config { fn do_thing(&self, path: &Path) -> Result<T> }` looks purely mechanical but can change borrow lifetimes or drop an implicit clone the free function relied on, producing code that compiles with different runtime behavior (e.g., now borrowing `self` for the call's duration where before two independent borrows existed). *Check*: this is exactly the class of change `cargo-mutants` and characterization tests are meant to catch — treat any free-fn-to-method conversion PR as required to carry a passing parity-test diff, not just a green build.

## Contested / evolving

- **How much of the fan-out work should be LLM-generated at all vs. deterministic recipe.** The industry-analysis source argues explicitly for minimizing LLM involvement in favor of rule-based recipes wherever possible, treating "human review becomes the bottleneck" as the central risk of AI-heavy approaches ([industry analysis](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring)). Anthropic's own writeup, by contrast, leans into LLM-driven bulk translation as the default and treats deterministic gates (compiler, tests, parity) as the safety net rather than trying to minimize LLM involvement up front ([Anthropic](https://claude.com/blog/ai-code-migration)). These are not fully reconcilable positions — one treats AI generation as the default with determinism as the check, the other treats determinism as the default with AI as the exception. Practice as of 2026 appears to be trending toward Anthropic's model (AI-first bulk generation, deterministic gates) for migrations where no existing recipe/codemod covers the transformation shape, and toward the recipe-first model for anything a tool like OpenRewrite/ast-grep already has a rule for.
- **Whether 100%-passing tests pre-merge is a meaningful gate.** Bun's own case shows it isn't sufficient (19 post-merge regressions), but no source proposes a specific *replacement* threshold (e.g., a target mutation-kill rate) as an industry norm yet — this reads as an open, unresolved area rather than settled practice.
- **cargo-semver-checks' coverage of type-level breaking changes.** The tool's own documentation flags type/generic/lifetime breaking changes as not yet covered — this is an active development area for the tool itself, not a permanent limitation; check the tool's changelog before relying on this document's specific list of gaps staying accurate.
- **Whether AI agents should ever be trusted with the "rulebook" authoring step itself**, versus that step remaining human-authored with AI only executing against it. Anthropic's writeup describes rule-writing as reserved for the largest models, but doesn't claim it's ever fully unsupervised — this remains the most human-in-the-loop-heavy step across every source and is the most likely place practice keeps evolving toward more automation.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [claude.com/blog/ai-code-migration](https://claude.com/blog/ai-code-migration) | Anthropic's primary case-study writeup on running large-scale code migrations with Claude Code (Bun, Python→TypeScript) | 2026 | Primary source; the most detailed, numbers-backed methodology available, directly from the tool vendor doing the migrations |
| [arXiv:2504.09691 — Migrating Code At Scale With LLMs At Google](https://arxiv.org/abs/2504.09691) | Google internal study, 39 migrations / 3 devs / 12 months, LLM-authored edit percentages | 2025 | Primary source; independent (Google, not Anthropic) numeric confirmation that LLM-assisted migration measurably cuts time |
| [research.google/pubs/pub41342 — Large-Scale Automated Refactoring Using ClangMR](https://research.google/pubs/pub41342) | Google's 2013 paper on Clang + MapReduce for deterministic large-C++-codebase refactoring | 2013 | Primary source; establishes the pre-LLM baseline that today's semantic-refactor tools descend from — historical but foundational, not superseded |
| [ast-grep.github.io — rewrite-code guide](https://ast-grep.github.io/guide/rewrite-code.html) | Official docs for ast-grep's YAML rule / pattern / fix syntax | current | Primary source; exact syntax for the deterministic-codemod tool most relevant to a Rust codebase |
| [rust-analyzer.github.io/book/features.html](https://rust-analyzer.github.io/book/features.html) | Official rust-analyzer manual, Structural Search and Replace section | current | Primary source; the Rust-native, name-resolution-aware alternative to text-based codemods |
| [Rust Edition Guide — transitioning an existing project](https://doc.rust-lang.org/edition-guide/editions/transitioning-an-existing-project-to-a-new-edition.html) | Official Rust documentation for `cargo fix --edition` | current | Primary source; exact commands and explicit list of what the tool does not cover |
| [mutants.rs](https://mutants.rs/) | Official docs for cargo-mutants | current | Primary source; the specific tool for sizing a test suite's regression-detection power before trusting it as a refactor's safety net |
| [github.com/obi1kenobi/cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) | Official repo/docs for cargo-semver-checks | current | Primary source; exact coverage and gaps for automated API-compatibility checking at crate boundaries |
| [doc.rust-lang.org/cargo/reference/workspaces.html](https://doc.rust-lang.org/cargo/reference/workspaces.html) | Official Cargo Book workspaces reference | current | Primary source; exact mechanics for splitting a crate into a workspace, shared dependency pinning, root-manifest-only settings |
| [comby.dev](https://comby.dev/) | Official site for the comby structural search/replace tool | current | Primary source; language-agnostic structural matching as a comparison point to ast-grep/SSR |
| [docs.openrewrite.org](https://docs.openrewrite.org/) | Official OpenRewrite documentation | current | Primary source; the most mature "LST-based deterministic large-scale refactor" ecosystem, illustrating the recipe/visitor model as an alternative to LLM generation |
| [sourcegraph.com/docs/batch-changes](https://sourcegraph.com/docs/batch-changes) | Official Sourcegraph Batch Changes documentation | current | Primary source; the spec/changeset/reconcile model for orchestrating and tracking large-scale changes across many repos |
| [ecosystem4engineering.substack.com — The Value and Limitations of AI for Large Scale Refactoring](https://ecosystem4engineering.substack.com/p/the-value-of-ai-for-large-scale-refactoring) | Independent industry-analysis piece synthesizing Google's enterprise-LLM refactoring experience | 2025/2026 | Secondary source, but the clearest articulated counter-position (recipe-first, AI as exception) to Anthropic's AI-first approach — needed for the Contested section |
