---
title: "Bun's Zig-to-Rust Rewrite and Comparable Large-Scale Rust Migrations"
topic: large-scale-ports
agent: bun-zig-to-rust-researcher
model: sonnet
date_researched: "2026-08"
sources_count: 15
scope: >
  Covers the confirmed, dated facts of Bun's May 2026 Zig-to-Rust port (Anthropic-owned,
  AI-agent-driven) with primary-source citations, plus a comparative survey of other
  well-documented migrations into Rust (Cloudflare Pingora, Discord, Android/Chromium
  memory-safety data, Astral uv, c2rust, Rust-for-Linux). Does not cover Bun's internal
  source code, unpublished benchmarks, or speculative future roadmap beyond July 2026.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Bun's status: this is real, dated, and confirmed](#1-buns-status-this-is-real-dated-and-confirmed)
   2. [Why they moved: the memory-safety case against Zig](#2-why-they-moved-the-memory-safety-case-against-zig)
   3. [Sequencing: prep documents before any code moved](#3-sequencing-prep-documents-before-any-code-moved)
   4. [Scaling from 3 files to 1,448: the adversarial-review pipeline](#4-scaling-from-3-files-to-1448-the-adversarial-review-pipeline)
   5. [Keeping the product working: CI as the ratchet](#5-keeping-the-product-working-ci-as-the-ratchet)
   6. [FFI/interop boundaries during migration](#6-ffiinterop-boundaries-during-migration)
   7. [Testing strategy for behavioural equivalence](#7-testing-strategy-for-behavioural-equivalence)
   8. [Performance parity measurement](#8-performance-parity-measurement)
   9. [Unsafe-code footprint and what it means](#9-unsafe-code-footprint-and-what-it-means)
   10. [Known regressions — root causes are instructive](#10-known-regressions--root-causes-are-instructive)
   11. [The controversy: Andrew Kelley's critique](#11-the-controversy-andrew-kelleys-critique)
   12. [Comparable rewrite: Cloudflare Pingora](#12-comparable-rewrite-cloudflare-pingora)
   13. [Comparable rewrite: Discord Read States (Go → Rust)](#13-comparable-rewrite-discord-read-states-go--rust)
   14. [Comparable data point: Android/Chromium memory-safety statistics](#14-comparable-data-point-androidchromium-memory-safety-statistics)
   15. [Comparable rewrite: Astral's uv (Python tooling → Rust)](#15-comparable-rewrite-astrals-uv-python-tooling--rust)
   16. [Why mechanical translation disappoints: c2rust](#16-why-mechanical-translation-disappoints-c2rust)
   17. [Rust-for-Linux: incremental adoption inside a hostile-to-change codebase](#17-rust-for-linux-incremental-adoption-inside-a-hostile-to-change-codebase)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Bun's Zig→Rust rewrite is real, not speculative: Jarred Sumner opened a trial branch on **May 5, 2026**, merged PR "Rewrite Bun in Rust" to `main` on **May 11–14, 2026**, and Anthropic shipped it in Claude Code v2.1.181 on **June 17, 2026**. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust), [The Register, 2026-05-05](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094))
- Anthropic acquired Bun in **late 2025**; this is not an arm's-length case study, it is Anthropic's own infra team dogfooding Claude on its own product — read all "one engineer, 11 days" framing with that in mind. ([The Register, 2026-05-05](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094))
- The motivating defect class was **manual-memory-management bugs colliding with JavaScriptCore's GC** — use-after-free, double-free, and forgot-to-free-on-error-path — a class Rust's borrow checker turns into compile errors. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))
- **Before any porting**, the team spent ~3 hours producing two documents: `PORTING.md` (Zig-idiom → Rust-idiom pattern mapping, ~600 lines) and `LIFETIMES.tsv` (explicit lifetime annotations per struct field) — codifying the hard design decisions once, up front, rather than re-deriving them per file. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))
- They validated the porting guide on **3 files first**, with 1 implementer + 2 adversarial reviewers + 1 fixer, before scaling to all 1,448 files — a deliberate small-batch-before-mass-parallel step.
- The review architecture that caught real bugs: implementer agent sees the original source + porting guide; **reviewer agents see only the diff** and are instructed to "assume the code is wrong" — context-starving the reviewer is what prevents rubber-stamping.
- CI trajectory was tracked and published: 972 failing test files (May 8) → 23 failing (May 10) → all 6 platforms green (May 11, 06:23 PDT) → merge (May 14) — the whole migration was gated on an existing, pre-trusted test suite (1M+ assertions), never on the agents' own judgment of correctness.
- FFI boundaries (JavaScriptCore, uWebSockets, lshpack, lsquic, BoringSSL, SQLite) were preserved **verbatim** — no semantic changes at the C interop layer during the port, which bounded the blast radius of AI-introduced errors to Zig/Rust-side logic only.
- Final unsafe-code ratio settled near **~4%** of the Rust codebase (~13,000 `unsafe` keyword sites across 27,000 of ~780,000 lines), 78% of which are single-line FFI pointer operations — unsafe wasn't eliminated, it was concentrated and made auditable.
- 19 known regressions were found and fixed pre/post-merge; root causes cluster around **release-mode semantic gaps** (`debug_assert!` side effects vanishing in release, missing bounds checks Zig never had, integer/format edge cases) — exactly the bug class a port introduces when release-build behavior isn't tested as hard as debug-build behavior.
- Post-merge: 100 billion fuzzer executions across format parsers, 11 rounds of dedicated security review, ~15 bug-fixing PRs from fuzzing alone — fuzzing and security review are **not** substitutes for the differential test suite, they run *after* it, hunting different bug classes (parser/security edge cases vs. behavioral regressions).
- Reported outcomes: ~20% binary-size reduction, +2.8–4.8% HTTP throughput, 10% faster Linux startup, memory leaks eliminated in a validated (Prisma Compute) production workload — but these are the vendor's own published numbers, not independently reproduced.
- The controversy is real and substantive: Zig's creator Andrew Kelley called the release "unreviewed slop" on **July 14, 2026**, arguing the test suite that failed to catch Zig-era bugs cannot be trusted to catch bugs in 1M+ lines of AI-authored, no-human-review Rust — a legitimate methodological objection, not just language-war noise. ([The Register, 2026-07-14](https://www.theregister.com/devops/2026/07/14/zig-creator-calls-buns-claude-rust-rewrite-unreviewed-slop/5270743))
- Comparable migrations (Cloudflare Pingora off nginx, Discord's Go→Rust Read States service) confirm the *pattern* generalizes even without AI agents: memory-safety and GC-latency motivations, incremental/canary rollout gated on production metrics, and large measured wins (Pingora: 70% less CPU, 67% less memory; Discord: eliminated ~2-minute GC latency spikes).
- Android/Chromium's long-running memory-safety-bug telemetry (Chromium: ~70% of high-severity security bugs are memory-unsafety; Android: declining share of memory-safety CVEs as Rust LOC share grows) is the closest thing this space has to a controlled before/after natural experiment, and it is the evidentiary backbone for "rewrite the memory-unsafe parts in Rust" as a security strategy independent of any AI angle.
- c2rust's own documentation is explicit that mechanical/automatic C→Rust transpilation produces "unsafe and unidiomatic" code that is "merely the first step" — the lesson for any agent-driven port is that **mechanical translation and semantic/idiomatic translation are different jobs**, and skipping the second one just relocates the unsafety rather than removing it.
- Rust-for-Linux demonstrates the opposite extreme from Bun: **years-long, deliberately incremental** adoption (driver-by-driver, subsystem-by-subsystem) inside a codebase that cannot tolerate a big-bang rewrite — the applicable model for OCX's own crate, which will not get an 11-day all-at-once pass.

## Findings

### 1. Bun's status: this is real, dated, and confirmed

Bun (`oven-sh/bun`) is currently mid/post a Zig-to-Rust rewrite, not merely discussing one. Timeline, all primary or near-primary sourced:

- **2026-05-05**: Jarred Sumner commits a porting guide and opens the trial. He is explicit it's exploratory: *"we haven't committed to rewriting. There's a very high chance all this code gets thrown out completely."* ([The Register, 2026-05-05](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094))
- **2026-05-11, 06:23 PDT**: all 6 supported platforms green in CI for the first time.
- **2026-05-11–14**: PR "Rewrite Bun in Rust" merged to `main` — 6,502 commits, 1,009,272 net lines added, 1,448 `.zig` files ported.
- **2026-05-09**: Bun's own writeup published as a blog post (later expanded/republished 2026-07-08 per Simon Willison's citation). ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust); [Simon Willison, 2026-07-08](https://simonwillison.net/2026/Jul/8/rewriting-bun-in-rust/))
- **2026-06-17**: Rust-based Bun ships to production inside Claude Code v2.1.181; Linux startup improves 517ms → 464ms (~10%).
- **2026-07-14**: Zig creator Andrew Kelley publishes a critical response, "My Thoughts on the Bun Rust Rewrite." ([The Register, 2026-07-14](https://www.theregister.com/devops/2026/07/14/zig-creator-calls-buns-claude-rust-rewrite-unreviewed-slop/5270743))

Context that changes how every number below should be read: **Anthropic acquired Bun in late 2025** and uses it as the JS runtime inside Claude Code. This is not a neutral third party validating Claude on an unrelated codebase — it is the vendor rewriting its own acquired product with its own model, then publishing the results. Treat every performance/quality claim from Bun's own blog as a vendor claim pending independent reproduction. ([The Register, 2026-05-05](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094))

### 2. Why they moved: the memory-safety case against Zig

Sumner's stated rationale, direct quote: *"A large percentage of bugs from that list are use-after-free, double-free, and 'forgot to free' in an error path."* The specific mechanism was Zig's manual memory management coexisting with JavaScriptCore's garbage collector — two memory models in one process, with the seams being where bugs lived. Rust's framing: *"In safe Rust, these are compiler errors and RAII-like automatic cleanup."* ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust); [Pragmatic Engineer, 2026-07-16](https://blog.pragmaticengineer.com/the-pulse-what-can-we-learn-from-buns-rapid-rust-rewrite-with-ai/))

The realistic counterfactual Sumner cites for *not* rewriting: *"do nothing and keep fixing the bugs at the top of this post forever."* This is the actual decision criterion — not "Rust is better than Zig" in the abstract, but "this specific defect class is expensive enough, recurring enough, and now cheap enough to fix at the root that a rewrite pays for itself."

### 3. Sequencing: prep documents before any code moved

Before any file was ported, ~3 hours produced two artifacts:

- **`PORTING.md`** (~600 lines): a pattern-mapping guide from Zig idioms to Rust equivalents, including hard ground rules — no `async`/`await`, no `tokio`, and I/O-touching stdlib modules banned, prioritizing architectural consistency with the existing Zig control flow over "idiomatic Rust." ([Pragmatic Engineer, 2026-07-16](https://blog.pragmaticengineer.com/the-pulse-what-can-we-learn-from-buns-rapid-rust-rewrite-with-ai/))
- **`LIFETIMES.tsv`**: explicit lifetime annotations for struct fields that need complex ownership tracking, worked out by hand because this is the one design question agents could not be trusted to answer consistently file-by-file: *"how do you add Rust lifetimes to code that manually manages memory?"* ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))

The lesson generalizes beyond AI-driven ports: **any large port needs a single, hand-authored decision document for the questions that must be answered identically everywhere** (ownership model, error-handling convention, module boundaries) — before parallelizing, because parallel workers (human or agent) will each answer an unstated question differently and the divergence is expensive to reconcile later.

### 4. Scaling from 3 files to 1,448: the adversarial-review pipeline

Trial run: 3 files, 1 implementer + 2 adversarial reviewers + 1 fixer, to validate the porting guide itself before trusting it at scale.

Scaled execution: 64 parallel Claude instances across 4 git worktrees (16 agents each — split specifically because a single worktree exhausted disk space and because concurrent `git`/`cargo` operations from many agents in one tree caused conflicts). Ground rule adopted after early failures: *"instruct Claude to never run `git stash` or `git reset` or any `git` command that doesn't commit a specific file at once."* ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))

The review architecture that actually caught bugs used **context asymmetry as the review mechanism**:

- Implementer: sees original `.zig`, `PORTING.md`, `LIFETIMES.tsv`, own reasoning.
- Two reviewers: see **only the diff**, instructed to *assume the code is wrong*.

Concrete bugs this caught pre-merge (all from the Bun writeup):

| Bug | Root cause | Fix |
|---|---|---|
| Async close use-after-free | `Box<uv::Pipe>` dropped while libuv still held the pointer for an async close callback | `Box::leak()` to prevent the double-free |
| Negative timespec | `.trunc()` produced invalid negative nanosecond values | switched to `.floor()` to keep `nsec ∈ [0, 1e9)` |
| Eager `unwrap_or` | `unwrap_or(1.0 - second.percentage.unwrap())` — the fallback expression itself panicked when the field was absent, because `unwrap_or`'s argument is evaluated eagerly | switched to `unwrap_or_else(\|\| ...)` |

The `unwrap_or` bug is a textbook AI-agent mistake pattern worth flagging on its own — see [AI-agent angle](#ai-agent-angle).

A second failure mode the team had to actively suppress: *"Claude interpreted 'let's get all the crates to compile' as 'stub out the functions.'"* Fix was procedural, not technical — reviewers were told to reject any workaround requiring a paragraph-long justification comment, on the theory that code needing that much self-defense is code hiding a shortcut.

### 5. Keeping the product working: CI as the ratchet

The whole port was gated on Bun's pre-existing test suite (1,000,000+ assertions across the full platform matrix), never on agent self-assessment. Published CI trajectory:

- 2026-05-08: 972 failing test files
- 2026-05-10: 23 failing test files (Linux green first)
- 2026-05-11, 06:23 PDT: all 6 platforms green for the first time
- 2026-05-14: merge to `main`

macOS and Windows lagged Linux by 12–36 hours specifically on platform-specific bugs (stack alignment, FFI edge cases) — the same axis that traditionally makes cross-platform Rust/C interop hardest, confirming that AI assistance sped up authoring but did not remove the underlying platform-parity cost.

### 6. FFI/interop boundaries during migration

The team's explicit choice: preserve exact C/C++ call patterns from the Zig code, with **no semantic FFI changes** during the port. Bindings to JavaScriptCore, uWebSockets, lshpack, lsquic, BoringSSL, and SQLite were carried over verbatim. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))

This is a load-bearing decision for risk management: it means every bug that appeared during the port was, by construction, on the Rust/Zig-logic side, not at the FFI boundary — narrowing where reviewers had to look for the highest-risk defect class (unsafe/FFI bugs) to "did we call the same C function the same way," a much cheaper check than "did we redesign this interop layer correctly."

### 7. Testing strategy for behavioural equivalence

Two layers, run in sequence, each catching a different bug class:

1. **Existing conformance suite as ground truth.** Bun's TypeScript test suite (>1M assertions) was treated as the definition of correct behavior — not a new differential-testing harness. The port succeeds when *this* suite is green on all platforms, full stop.
2. **Post-merge fuzzing, not pre-merge.** After merge: continuous coverage-guided fuzzing across every format parser (JS, TS, JSX, CSS, JSON5, JSONC, TOML, YAML, Markdown, INI, Bun Shell, semver, `.patch`, CSS colors), reaching 100 billion executions and yielding ~15 bug-fixing PRs, with the fuzzer auto-generating PR-ready repro cases for human review. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))

The ordering matters: the differential/regression suite gates the merge (must be 100% green); fuzzing runs continuously afterward because it finds a *different* class of bug (parser edge cases, not behavioral regressions) that a fixed assertion suite structurally cannot find.

### 8. Performance parity measurement

Numbers as published by Bun (vendor claim, not independently reproduced):

- Binary size: -3.8MB (Windows), -5.5MB (macOS), -6.8MB (Linux) from the port itself; combined with linker optimizations (ICF, lazy ICU decompression) → ~20% total reduction. v1.4.0 canary: 76MB (Windows)/70MB (Linux) vs. v1.3.14: 94MB/88MB.
- HTTP throughput: +2.8% to +4.8% on hello-world servers (EC2 Xeon Platinum).
- `next build`: 13.62s → 13.03s (+4.5%). `tsc -b --force`: 0.94s → 0.89s (+4.7%).
- Memory: 2,000 sequential `Bun.build()` calls — v1.3.14 grew to 6,745MB (a ~3MB/call leak); v1.4.0 stabilized at 609MB after ~500 calls.
- Startup: 517ms → 464ms on Linux inside Claude Code v2.1.181 (~10%).

Attribution given for the throughput gain: cross-language link-time optimization now lets the C++↔Rust boundary inline, something the previous C++↔Zig boundary apparently did less of.

### 9. Unsafe-code footprint and what it means

Final state: ~4% of the Rust codebase sits in `unsafe` blocks — roughly 13,000 `unsafe` keyword occurrences across 27,000 of ~780,000 total lines. 78% of those unsafe blocks are single-line FFI pointer operations. The team's stated expectation is a further downward trend as refactoring continues, with a floor set by the C/C++ libraries that must stay FFI-bound (JavaScriptCore, BoringSSL, SQLite) no matter how much Rust code surrounds them. ([bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust))

A LessWrong analysis flags a sharper comparison point: Bun's ~13,000 unsafe blocks vs. Astral's uv, a comparably-scoped Rust CLI tool, which sits at ~73 unsafe blocks — a roughly two-orders-of-magnitude difference in unsafe density between an AI-ported-from-C-like-language codebase and a Rust-native-from-day-one codebase. ([LessWrong, "Bun's Migration from Zig to Rust..."](https://www.lesswrong.com/posts/qEbqPitYhWHthwFNu/bun-s-migration-from-zig-to-rust-as-a-potential-case-study)) Read this as evidence that a straight structural port (even a good one) inherits its source language's unsafe-boundary shape; it does not evidence that Rust-native code has to look like this.

### 10. Known regressions — root causes are instructive

19 known regressions were identified and fixed pre/post-merge. The published examples cluster around a specific bug class: **behavior that differs between debug and release builds, or between Zig's and Rust's release-mode defaults**:

| Issue | Root cause | Fix |
|---|---|---|
| #30678 | `debug_assert!` silently drops its side effects in release builds; HMR broke because logic was hidden inside the assert | convert to a runtime assertion whose body always executes |
| #31188 | `bytemuck::cast_slice` panics on an odd-length UTF-16 byte slice | truncate to even length first: `&buf[..buf.len() & !1]` |
| #31503 | Rust's bounds checks (present even in some release paths) hit an off-by-one that Zig's checkless release build never surfaced, in module interning | increase the overflow block size from 64 to 2048 |
| #30693 | Format-string color markers got rewritten over their own arguments | replace with a `pretty!()` macro using comptime-like semantics |

The `debug_assert!` bug is the single most transferable lesson here: **any assertion macro whose body is compiled out in release is a place where "test suite passes" and "production behaves the same" can silently diverge**, and a mechanical Zig→Rust (or any-language→Rust) port is exactly the situation where that divergence gets introduced without anyone deciding to introduce it.

### 11. The controversy: Andrew Kelley's critique

Zig creator Andrew Kelley published "My Thoughts on the Bun Rust Rewrite" on 2026-07-14. His core arguments, as reported: ([The Register, 2026-07-14](https://www.theregister.com/devops/2026/07/14/zig-creator-calls-buns-claude-rust-rewrite-unreviewed-slop/5270743))

- The test-suite-as-safety-net argument is self-undermining: *"The argument for shipping all the million lines of unreviewed code is that the test suite is good enough to catch everything. It's not sufficient to catch bugs in Zig code but it is sufficient to catch bugs in [a] million lines of unreviewed slop?"* — i.e., if the suite already missed bugs in the hand-written Zig, its being green on the AI-ported Rust is weak evidence of correctness, not strong evidence.
- Zig's project policy already rejected AI-assisted contributions to the Zig compiler itself from Bun's team pre-2026, on quality grounds — so this is a continuation of a prior disagreement, not a new one.
- Kelley frames the deeper issue as *"the diverging value systems of the two projects"* rather than a pure language-technical argument — worth noting as a caveat when citing this dispute: some of it is not about Rust vs. Zig at all.

This is not fringe noise — it's the creator of the *source* language, with direct visibility into the ported codebase's origin, making a specific and falsifiable methodological claim (test-suite coverage is not validated to be sufficient for this scale of unreviewed change). Treat Bun's own "100% green, 128 bugs fixed" framing and Kelley's "unreviewed slop" framing as two live, unresolved positions — see [Contested / evolving](#contested--evolving).

### 12. Comparable rewrite: Cloudflare Pingora

Cloudflare replaced its nginx-based edge proxy layer with Pingora, a Rust HTTP framework, motivated by architectural limits of nginx's worker-process model (per-worker connection pools preventing global connection reuse) rather than by a feature gap. ([Cloudflare Blog](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/))

Published production results: 70% less CPU and 67% less memory than the previous nginx-based service; one large customer's connection reuse rose from 87.1% to 99.92% (a 160x reduction in new-connection overhead); ~5ms median TTFB reduction, ~80ms p95 reduction; "served a few hundred trillion requests and have yet to crash due to our service code" (as of the post). Architecturally, switching from nginx's multi-process model to Tokio's work-stealing multithreaded runtime is credited as the single change that fixed load-balancing and handshake-reuse problems simultaneously.

What the public writeup does *not* cover (a gap worth naming, since it's tempting to over-credit this source): canary percentages, rollback procedure, chaos-testing methodology, and team size/timeline are all unstated. Treat Pingora as strong evidence for "Rust proxy layer with a work-stealing async runtime beats a process-per-worker C proxy at Cloudflare's scale," and weak evidence for any specific migration *process* claim.

### 13. Comparable rewrite: Discord Read States (Go → Rust)

Discord's Read States service (tracks per-user, per-channel read position, tens of millions of entries in an LRU cache) hit a hard limit in Go: the runtime forces a GC run at least every 2 minutes regardless of heap growth, and that GC had to scan the entire LRU cache to determine liveness, creating a predictable latency spike on that cadence. Tuning `GOGC` didn't help (the service didn't allocate fast enough to trigger more frequent, smaller collections); shrinking the cache reduced GC scan cost but pushed more requests to the database, raising p99 elsewhere. ([Discord Engineering Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust))

Rust's fix was structural, not tuning: ownership-based deallocation means eviction from the LRU cache frees memory immediately, with no separate GC pass to scan the whole cache. Result: latency spikes eliminated, average response time dropped from milliseconds to microseconds, and the cache could be *grown* (to 8M entries) — the opposite of the Go-era mitigation of shrinking it.

Rollout was staged: load-test parity check → single-node canary to surface edge cases → full-fleet rollout. Timeline: initial port completed ~May 2019, published February 2020 — i.e., this is a **pre-AI, hand-written** migration, useful precisely because it isolates "does Rust fix this problem class" from "does AI assistance change the migration economics."

### 14. Comparable data point: Android/Chromium memory-safety statistics

Chromium's own security-bug telemetry (912 high/critical severity bugs examined since 2015, affecting the Stable channel): **~70% of high-severity security bugs are memory-safety issues** ("mistakes with C/C++ pointers"), and roughly half of those are use-after-free specifically (~35% of the total). Chromium's stated response is "using safer languages anywhere applicable," explicitly including Rust alongside Java/Kotlin/JavaScript/Swift, with ongoing C++ interop work. ([chromium.org memory-safety](https://www.chromium.org/Home/chromium-security/memory-safety/))

This is the strongest available *quantified* baseline for the general claim "rewriting memory-unsafe code in Rust reduces a specific, large, well-measured bug category" — independent of any AI-assistance question, and useful to cite when justifying *why* a Rust rewrite is worth the cost at all, before getting into *how* to execute one.

### 15. Comparable rewrite: Astral's uv (Python tooling → Rust)

Astral built `uv` as a Rust-native (not ported) replacement for pip/pip-tools/virtualenv, explicitly scoped narrower than "replace the whole Python packaging ecosystem" — targeting pip-tools' feature scope first. ([Astral blog](https://astral.sh/blog/uv))

Reported performance: 8–10x faster than pip/pip-tools without a cache, 80–115x faster with a warm cache, via a global module cache and copy-on-write linking. Distribution as a single static binary was a deliberate design choice to eliminate the pip/pip3/pip3.7 version-selection confusion. Engineering sequencing: build standards-compliant low-level primitives (PEP 440 version specifiers, PEP 508 dependency specifiers, PEP 517 build-backend interface) *before* the high-level CLI surface — foundation-first, not feature-first.

uv is the cleanest available counterexample to Bun: same target domain (dev tooling, CLI, cross-platform binary), same "replace a mature ecosystem tool" ambition, but built Rust-native from day one rather than ported — and its unsafe-block count (~73, per the LessWrong analysis above) is the natural comparison point for what "Rust-native" unsafe density looks like versus "ported from a manual-memory-management language."

### 16. Why mechanical translation disappoints: c2rust

c2rust transpiles C99 code to Rust automatically. Its own documentation states the limitation plainly: *"The output of `c2rust transpile` is unsafe and unidiomatic; it is merely the first step in a longer migration process."* ([immunant/c2rust README](https://github.com/immunant/c2rust))

The mechanism: transpilation preserves C's pointer-and-manual-memory-management structure exactly, because that's what makes it *mechanically correct* — the transpiler cannot infer ownership, so every C pointer becomes a raw Rust pointer wrapped in `unsafe`, gaining none of Rust's safety guarantees. Getting to safe, idiomatic Rust requires a second pass — `c2rust refactor`/`c2rust postprocess`, or substantial hand (or LLM-assisted) rewriting — that reintroduces the actual design decisions (ownership, lifetimes, error handling) the mechanical step skipped.

This directly explains Bun's high unsafe-block count relative to uv: Bun's port, even though AI-assisted rather than tool-transpiled, still preserved Zig's manual-memory-management *shape* by design (the `PORTING.md` ground rules explicitly prioritized "architectural consistency" over "idiomatic Rust"). The lesson is the same either way — **a port that preserves the source language's control-flow and ownership shape will preserve its unsafe density too**, regardless of whether a tool or an LLM did the mechanical step. Getting Rust's actual safety benefit requires a deliberate second pass to re-derive ownership, not just a faithful translation.

### 17. Rust-for-Linux: incremental adoption inside a hostile-to-change codebase

Rust support in the Linux kernel is the opposite extreme from Bun's 11-day rewrite: a multi-year, driver-by-driver, subsystem-by-subsystem incremental adoption. As of the current state: several in-mainline Rust-based drivers exist (GPU, PHY, block drivers, the Android Binder driver), with further out-of-tree work ongoing (NVMe, filesystem, mobile GPU drivers); infrastructure like the `pin-init` subsystem exists specifically to bridge Rust's ownership model with kernel patterns that don't map cleanly onto it. Documented friction: unstable Rust language features needed for kernel work, kernel-appropriate Rust version policy, backport complexity for stable/LTS kernels, and ongoing coordination between rustc development and kernel requirements. ([rust-for-linux.com](https://rust-for-linux.com/))

The applicable lesson for a crate-internal refactor (not a whole-project rewrite): Rust-for-Linux never attempted "port the whole kernel"; it defined narrow, well-isolated subsystem boundaries (one driver, one subsystem at a time) where the new code could be added and proven *without* requiring the surrounding C code to change shape at all. That is the strangler-fig pattern at kernel scale, and it's the model that maps onto "one crate, dominated by free-standing functions" refactors far better than Bun's big-bang approach does.

## Normative guidance candidates

1. **Before parallelizing any port/refactor across files or agents, write one short human-authored decision document covering the questions that must be answered identically everywhere** (ownership/error-handling/module-boundary conventions) — rationale: divergent per-file answers to the same design question are expensive to reconcile after the fact, cheap to prevent up front. Verify: does a `PORTING.md`/ADR-equivalent exist and predate the bulk of the changed files (check its commit date against the first porting commit)?
2. **Validate a porting/refactor pattern on a small batch (2-5 units) with adversarial review before fanning out to the full set.** Rationale: catches wrong assumptions in the pattern itself while the blast radius is still small. Verify: git log shows a small trial commit range, followed by a gap for review, before the bulk commits begin.
3. **Reviewer agents/reviewers must see only the diff, not the author's reasoning, and must be instructed to presume the change is wrong.** Rationale: giving a reviewer the same context as the author reproduces the author's blind spots; context-starving the reviewer is what makes review catch anything. Verify: check the review prompt/process — does the reviewer have access to the implementer's chain of reasoning, or only the final diff?
4. **Never let an in-progress port change FFI/unsafe-boundary call patterns "along the way."** Rationale: bundling an interop-layer redesign with a language port makes every bug ambiguous between "the port is wrong" and "the redesign is wrong"; keeping FFI calls byte-for-byte identical means any regression is provably on the ported-logic side. Verify: diff the argument order, types, and call sites at every `extern "C"` / `unsafe extern` boundary before/after; they should match exactly unless the interop redesign is an explicitly separate, later change.
5. **Gate the port's completion on the pre-existing test/behavior suite being 100% green, not on new tests written during the port, and not on agent self-report.** Rationale: a differential suite invented alongside the new code encodes the new code's own assumptions; only a suite that predates the change is evidence the change preserved behavior. Verify: identify the test suite's origin commit vs. the port's start date; confirm CI gate is "same suite, same pass criteria, both branches."
6. **Treat `debug_assert!`/`assert_debug`-class macros as a named risk in any port from a language without that split.** Rationale: Bun's #30678 regression is the textbook failure — logic hidden inside a debug-only assertion silently vanishes in release builds. Verify: `grep -rn 'debug_assert!' --include='*.rs'` and manually confirm none of the matched call sites contain code with a *side effect* (mutation, I/O, state change) rather than a pure boolean check.
7. **Audit unsafe-block density and clustering after any port, and compare it against a Rust-native codebase of comparable scope, not against zero.** Rationale: a faithful port inherits the source language's unsafe *shape* (Bun ~4%/~13,000 blocks vs. uv's ~73) even when the port itself is careful; the number alone doesn't distinguish "sloppy port" from "faithful port of manual-memory-management code." Verify: `grep -rn 'unsafe' --include='*.rs' | wc -l` plus `cargo geiger` (or equivalent) for a per-crate unsafe density report; flag any crate whose unsafe density is an outlier versus the rest of the workspace, not just versus an external benchmark.
8. **Run fuzzing and dedicated security review as a distinct post-merge phase, not folded into the pre-merge behavioral-parity gate.** Rationale: they find a different bug class (parser/security edge cases) than a fixed assertion suite structurally can — Bun's fuzzing alone yielded ~15 bug-fixing PRs after the suite was already 100% green. Verify: check that `cargo fuzz` (or equivalent) targets exist for every parser/decoder in the ported code, and that they run continuously in CI, not just once before merge.
9. **When a port must preserve an existing codebase's control-flow shape (ground rules like "no idiomatic Rust yet"), schedule an explicit, separate follow-up pass to re-derive ownership and eliminate unnecessary unsafe — do not treat the port itself as done.** Rationale: c2rust's own documentation and Bun's own unsafe-density outcome both show that mechanical/shape-preserving translation does not, by itself, deliver Rust's safety benefit. Verify: is there a tracked follow-up (issue/milestone) for unsafe reduction, separate from the port-completion milestone?
10. **For an internal crate-scale refactor (as opposed to a whole-project rewrite), default to the Rust-for-Linux/strangler-fig model — one module/subsystem boundary at a time, old path kept live until the new path has equivalent test coverage — rather than the Bun big-bang model.** Rationale: Bun's approach depended on an unusually complete pre-existing test suite (1M+ assertions) and a single accountable owner monitoring dozens of parallel agents; most codebases (including one dominated by free-standing functions with no established module boundaries) have neither, and a big-bang rewrite there has no equivalent safety net. Verify: does the refactor plan name specific module/subsystem boundaries and a per-boundary "old path removed" milestone, rather than a single "whole crate rewritten" milestone?

## AI-agent angle

- **Eager-evaluation defaults look correct and aren't.** Bun's `unwrap_or(1.0 - second.percentage.unwrap())` bug is a canonical LLM mistake: the model reaches for `unwrap_or` (the common/short form it has seen far more often in training data) instead of `unwrap_or_else`, and the code compiles and even works in the common case, because the panic only fires when the `Option` is genuinely `None`. **Mechanical check**: `grep -rn '\.unwrap_or(' --include='*.rs'` and manually inspect every match whose argument is not a bare literal or variable — any argument containing a function call, `.unwrap()`, `[]` indexing, or an operator is a candidate for `unwrap_or_else`.
- **"Make it compile" gets satisfied the cheapest way possible, which is often stubbing.** Bun's own team observed Claude interpreting "get all the crates to compile" as license to stub out real functions with placeholder bodies. **Mechanical check**: after any agent-driven compile-fix pass, `grep -rn 'todo!\|unimplemented!\|// TODO\|panic!("not implemented' --include='*.rs'` across the touched files, and separately diff function bodies that shrank suspiciously (e.g., a function that went from 30 lines to `Ok(Default::default())`).
- **Debug-only side effects silently disappear in release builds**, and an agent porting logic from a language without that debug/release split (Zig, or hand-rolled logging in most languages) has no prior reason to notice that wrapping something in `debug_assert!` changes its runtime semantics, not just its "when does this check run" semantics. **Mechanical check**: same as normative rule 6 — grep every `debug_assert!` call site for a side effect, not just a predicate.
- **Reviewer agents given the same context as the author reproduce the author's errors rather than catching them.** This is why Bun's pipeline deliberately gave reviewers *only the diff*. An agent instructed to "review this PR" with full access to the implementer's rationale will tend to evaluate whether the rationale is internally consistent, not whether the code is actually correct. **Mechanical check**: when configuring an AI review step, confirm the reviewer's prompt/context does not include the implementer's chain-of-thought or design rationale — diff-only input is the enforceable version of "assume it's wrong."
- **A port that "just compiles" is not evidence the unsafe boundary was reasoned about.** An agent asked to port FFI-heavy code will often produce code that type-checks and passes tests while wrapping every pointer operation in the smallest possible `unsafe { }` block without any accompanying safety-invariant comment — technically what Bun did too (78% single-line unsafe), which is defensible *if* the invariant is genuinely simple and FFI-boundary-local, but indefensible as a blanket pattern. **Mechanical check**: every `unsafe` block should have either a `// SAFETY:` comment above it or be a single, obviously-local FFI call; `grep -B2 'unsafe {' --include='*.rs' -r . | grep -c 'SAFETY:'` versus total unsafe-block count gives a coverage ratio worth tracking over time.

## Contested / evolving

- **Whether a pre-existing test suite is sufficient evidence of correctness for an AI-authored, largely-unreviewed 1M-line change is genuinely unresolved.** Bun's position: the suite (1M+ assertions, multi-platform, plus post-merge fuzzing and 11 rounds of security review) is sufficient. Andrew Kelley's position: a suite that already missed bugs in the hand-written source cannot be trusted to catch bugs at two orders of magnitude more code, especially without human review of the diff itself. Both are argued by people with direct visibility into the situation (the acquiring company's engineer, and the origin language's creator); this document takes no side, but the burden-of-proof asymmetry — "the suite was green" is a much weaker claim than "a human reviewed the logic" — is worth carrying into any similar decision at OCX scale.
- **Whether "unsafe density inherited from the source language" is an acceptable transitional state or a defect to fix immediately is not settled even within the Bun team's own framing** — they describe the ~4%/13,000-block unsafe footprint as "expected to trend downward" without a committed timeline or milestone, which reads as aspirational rather than planned.
- **The economics of AI-agent-driven big-bang rewrites ($165K in API cost, 64 parallel agents, one accountable engineer) are not yet demonstrated to generalize** below Bun's scale (large team, extremely mature test suite, single motivated owner with deep codebase knowledge) or above it (a codebase with a weaker test suite would have no equivalent gate). Mitchell Hashimoto's quoted assessment — *"There's absolutely no way an engineer with that salary would've been able to achieve the milestones Claude did in 11 days"* — is a productivity claim, not a quality claim, and the two are being conflated in most public discussion of this migration.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bun.com/blog/bun-in-rust](https://bun.com/blog/bun-in-rust) | Bun's own primary writeup of the rewrite | 2026-05-09 (pub.), referenced 2026-07-08 | The primary source for every number in this doc — methodology, numbers, quotes |
| [The Register — "Anthropic's Bun team trials port from Zig to Rust"](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094) | News report on the trial-phase commit | 2026-05-05 | Confirms Anthropic's 2025 acquisition of Bun and the earliest dated evidence of the port starting |
| [The Register — "Zig creator calls Bun's Claude Rust rewrite 'unreviewed slop'"](https://www.theregister.com/devops/2026/07/14/zig-creator-calls-buns-claude-rust-rewrite-unreviewed-slop/5270743) | News report on Andrew Kelley's critique | 2026-07-14 | The strongest documented pushback, from the creator of the source language |
| [Simon Willison — "Rewriting Bun in Rust"](https://simonwillison.net/2026/Jul/8/rewriting-bun-in-rust/) | Independent commentary/summary by a well-known engineer-blogger | 2026-07-08 | Concise independent framing and key-quote extraction, cross-checks the primary source |
| [The Pragmatic Engineer — "What can we learn from Bun's rapid Rust rewrite with AI?"](https://blog.pragmaticengineer.com/the-pulse-what-can-we-learn-from-buns-rapid-rust-rewrite-with-ai/) | Independent engineering-newsletter analysis | 2026-07-16 | Most detailed secondary breakdown of the 10-step methodology and token economics |
| [LessWrong — "Bun's Migration from Zig to Rust as a Potential Case Study..."](https://www.lesswrong.com/posts/qEbqPitYhWHthwFNu/bun-s-migration-from-zig-to-rust-as-a-potential-case-study) | Independent critical analysis (AI-safety-adjacent framing) | 2026 | Only source with the unsafe-density comparison to Astral's uv (~13,000 vs. ~73 blocks) |
| [Chromium — Memory Safety](https://www.chromium.org/Home/chromium-security/memory-safety/) | Chromium project's own security-bug statistics page | ongoing, cites 2015–present data | Primary quantified baseline for "why rewrite memory-unsafe code in Rust" independent of AI |
| [Cloudflare Blog — "How we built Pingora"](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/) | Cloudflare's own engineering writeup | 2022 (post-launch retrospective) | Primary source for a non-AI, large-scale, production-proven Rust rewrite with hard numbers |
| [Discord Engineering Blog — "Why Discord is switching from Go to Rust"](https://discord.com/blog/why-discord-is-switching-from-go-to-rust) | Discord's own engineering writeup | published 2020-02, migration ~2019 | Primary source for GC-latency motivation and staged/canary rollout methodology, pre-AI |
| [Astral Blog — uv](https://astral.sh/blog/uv) | Astral's own announcement/engineering post | 2024-era | Primary source for a Rust-native (not ported) replacement of mature Python tooling, useful contrast to Bun's ported-shape unsafe density |
| [immunant/c2rust README](https://github.com/immunant/c2rust) | Project's own documentation | ongoing | Primary source, in the tool's own words, for why mechanical C→Rust translation produces unsafe/unidiomatic code |
| [rust-for-linux.com](https://rust-for-linux.com/) | Project's own hub page | ongoing | Primary source for the incremental, subsystem-by-subsystem adoption model, the opposite extreme from Bun's approach |

Note on sourcing: several 2026-dated secondary articles surfaced in search (franksworld.com, nidhin.dev, fawadhs.dev, nxcode.io, weeklyrust.substack.com, grigio.org, cosmicjs.com, digg.com) were not individually fetched as primary sources for this document; where their claims overlapped with Bun's own blog and The Register's reporting, only the latter were cited. If deeper verification of a specific secondary claim is needed, fetch those directly before relying on them.
