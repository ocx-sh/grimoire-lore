# Research Corpus

The cited research the `rust-*`, `python-*` and `typescript-*` rules in this
repository were distilled from. Three programs have run here, all with
`.claude/skills/research-lang/`: Rust (2026-08-16), Python (2026-08-23) and
TypeScript (2026-08-29). The TypeScript tree indexes from
`typescript-topic-map.md`; the Python tree from `python-topic-map.md`; the
Rust tree from `topic-map.md`. Nothing here ships with the packages — the artifacts are
deliberately short, and this is where the evidence and the discarded
alternatives live.

## How to read it

| File | What it is |
|---|---|
| `<topic>.md` | The consolidated position: a verdict stated as decisions, a numbered ruleset with a verification per rule, what the OCX codebases already satisfy or violate, the agent failure modes, and the open questions |
| `<topic>/<worker>.md` | One researcher's artifact behind it — findings with inline URL citations, normative candidates, contested points, and a sources table |
| `topic-map.md` | The prioritised backlog the corpus was commissioned from, plus everything deliberately deferred |
| `ecosystem-map.md` | The tooling and crate inventory, with an adopt / keep / drop verdict per tool |
| `ocx-codebase-audit/` | Measurements of the real codebases: existing config, crate and type shape, the implemented exit-code contract, and the runtime/security posture |

A rule ID in a published rule (`ARCH-03`, `SEC-09`, `PLAT-14`) resolves to
the ruleset table in the matching `<topic>.md`, which carries its
rationale, citation, and the evidence for how the codebase stands
against it.

## Topics

| Topic | Covers |
|---|---|
| [rust-type-architecture](rust-type-architecture.md) | Where behaviour lives — free function vs method vs trait, newtypes, the dispatch ladder, I/O seams and ports, module visibility, and the workspace shape |
| [rust-error-handling](rust-error-handling.md) | Error types and cause chains, message style, panic policy, redaction, and the error → exit-code contract |
| [rust-cli-contract](rust-cli-contract.md) | The pinned exit-code table, stream discipline, machine-readable output, colour and TTY, clap surface design |
| [rust-async](rust-async.md) | Runtime discipline, blocking, cancellation safety, bounded fan-out, sync primitives, and deterministic time testing |
| [rust-security](rust-security.md) | Unsafe policy, untrusted archive extraction, filesystem and subprocess safety, secrets, TLS, content trust, supply chain |
| [rust-testing](rust-testing.md) | Test placement and seams, determinism, CLI black-box contracts, structural guards, property testing, fuzzing, mutation, coverage |
| [rust-tooling-ci](rust-tooling-ci.md) | Lint selection and the workspace lints table, toolchain pinning, CI job design, dependency gates, release profiles and provenance |
| [rust-performance](rust-performance.md) | Measurement discipline, the allocation rules that matter versus folklore, I/O and concurrency shape, budgets and CI regression gating |
| [rust-docs-observability](rust-docs-observability.md) | Rustdoc conventions and required sections, the two-register comment model, tracing and span discipline, log-level semantics |
| [rust-platform-and-portability](rust-platform-and-portability.md) | Paths and filenames across platforms, canonicalisation traps, Windows and macOS divergence, clocks and cache freshness |
| [rust-state-and-resources](rust-state-and-resources.md) | Durable writes and interruption safety, Drop guards and poisoning, ownership shapes, clones and interior mutability |
| [rust-data-and-serialization](rust-data-and-serialization.md) | On-disk and wire format evolution, deterministic and canonical output, digest and content-addressing rules |
| [rust-api-design](rust-api-design.md) | Signature design, derive discipline, standard conversions, and what a `Debug` impl leaks |
| [rust-idioms-and-patterns](rust-idioms-and-patterns.md) | The code-shape heuristics an unattended review can actually apply, and the catalogued anti-patterns |
| [rust-language-evolution](rust-language-evolution.md) | Edition 2024 and the stale-API recall problem — what changed, and what advice it invalidated |
| [rust-domain-package-manager](rust-domain-package-manager.md) | Bounded ingestion of untrusted blobs, registry resilience, and batch partial-failure reporting |
| [rust-tui](rust-tui.md) | Terminal UI architecture, event loops, terminal-state safety, keybinding conventions, and rendering untrusted text |
| [rust-ecosystem](rust-ecosystem.md) | The tooling of record, the crate-of-record table, and publishing, versioning and distribution |
| [ai-agentic-coding](ai-agentic-coding.md) | How LLMs fail at Rust specifically, agent-config practice in real Rust repos, and verification loops an agent cannot fake |
| [large-scale-ports](large-scale-ports.md) | The Bun Zig→Rust port and other migrations into Rust, and the playbook for a restructure that keeps working |

## TypeScript

Indexed by [typescript-topic-map.md](typescript-topic-map.md) — 212
deduplicated candidates, the conflicts wave 1 resolved, and the deferred
backlog. [typescript-frame.md](typescript-frame.md) states the phase-0 frame
and, below it, every premise the grounding wave overturned — read the
corrections, not the body, where they disagree.

| Topic | Covers |
|---|---|
| [ts-gate](ts-gate.md) | Type-aware lint wiring, `projectService` vs `project`, preset choice, ESLint/Biome parity, and what the gate costs |
| [ts-modules](ts-modules.md) | `moduleResolution` per shape, extension discipline, `import type`, ESM/CJS interop, cycles, barrels, package boundaries |
| [ts-async](ts-async.md) | Floating and misused promises, `void` as a marker, deadlines and cancellation, concurrency bounds, per-runtime rejection semantics |
| [ts-resources](ts-resources.md) | `using`/`await using`, disposal protocols, child processes and process-group termination, timers, file handles |
| [ts-errors-boundaries](ts-errors-boundaries.md) | `Error.cause`, when a typed error class is earned, one classifier, and where `unknown` becomes typed |
| [ts-extension-host](ts-extension-host.md) | VS Code and Electron: activation ordering, workspace trust, the webview boundary, esbuild-to-CJS semantics, typed host-API doubles |
| [typescript-tooling-landscape](typescript-tooling-landscape.md) | 99 tools with an adopt/keep/drop/watch verdict — linters, test runners, static analysis, benchmarking, web performance, build and CI |

`typescript-audit/` holds the four grounding audits: the config inventory
and its strictness matrix, the measured code shape, the contracts the code
actually honours, and the runtime posture.

Two findings are worth knowing before reading anything else. TypeScript 7.0
is current, but `@typescript-eslint/eslint-plugin` declares a peer range
that excludes it — so "upgrade to latest" breaks linting, and the corpus
says to pin. And `any` is not the escape hatch anyone expects: it is nearly
absent, while `as unknown as T` is pervasive, concentrated in test doubles.

## Method

The corpus was built with the `research-lang` skill in
`.claude/skills/research-lang/`: ground on the real codebases first, scout
the field to discover topics rather than accept a handed-down list,
prioritise into a backlog, dive each topic with a fixed output contract,
consolidate into a decision, then commission whatever the consolidation
says deserves another round. Web research ran on a fast model; every
consolidation and every decision that became an enforced rule ran on the
strongest one.

The loop ran until a wave stopped producing new merge-blocking rules. The
`## Open questions` section of each topic records what is left — some of
it needs a human decision rather than more research, and those are marked.
