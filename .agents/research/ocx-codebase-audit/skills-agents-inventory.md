---
title: Skills/Agents Inventory — Rust Quality, Review, Verification
agent: inv-skills
model: sonnet
scope: >
  Inventory of AI-config skills and agents across ocx, grimoire, grimoire-duo,
  ocx-mirror, ocx-save relevant to Rust code quality, review, and
  verification — to inform a publishable Rust-quality package.
sources:
  - /home/mherwig/dev/ocx/.claude/skills/*
  - /home/mherwig/dev/ocx/.claude/agents/*
  - /home/mherwig/dev/ocx/.claude/rules/quality-*.md
  - /home/mherwig/dev/ocx/.claude/rules/workflow-swarm.md
  - /home/mherwig/dev/grimoire/.claude/skills/*
  - /home/mherwig/dev/grimoire-duo/.claude/skills/codex-adversary/*
  - /home/mherwig/dev/ocx-mirror/.claude/skills/*
  - /home/mherwig/dev/ocx-save/.claude/skills/languages/rust/SKILL.md
  - /home/mherwig/dev/ocx-save/.claude/skills/core-engineering/*
---

# Skills/Agents Inventory

## 0. Repo relationship (read this before the table)

`grimoire`, `grimoire-duo`, and `ocx-mirror` are **forks of `ocx`'s `.claude/`
tree**, not independent designs. Diffed byte-for-byte:

- `code-check`, `codex-adversary`, `swarm-review`: identical structure,
  identical line counts (±1), differences are **project-name substitution**
  (`OCX`→`Grimoire`), one flipped `disable-model-invocation` flag, and — in
  grimoire-duo's `swarm-review` only — one added row (`compatibility`
  reviewer, gated on a 1.0.0 stabilization freeze).
- `grimoire` additionally renamed `/architect` references to `/hex-architect`
  and swapped two `subsystem-*.md` pointers, otherwise identical.
- `ocx-mirror` dropped `deps`/`qa-engineer`/`security-auditor`/`code-check`/
  `builder`/`codex-adversary` and added one repo-specific skill (`e2e-test`,
  tiered integration testing against a real downstream fleet — not
  Rust-quality relevant, omitted from digests below).

So the table below lists each **ocx** item once as canonical, with a
one-line note wherever a fork differs in substance (not naming).

`ocx-save` is architecturally unrelated: generic, language-agnostic
`core-engineering/*` skills plus one thin `languages/rust/SKILL.md`. No
Rust-specific lint gate, threshold, or exact command anywhere in it.

## 1. Table

| Item | Repo | Lines | Description (frontmatter) | Trigger | Rust-relevance |
|---|---|---|---|---|---|
| `code-check` (skill) | ocx | 78 | Code review, quality audits, SOLID/DRY, anti-pattern compliance | auto + `/code-check` | **HIGH** |
| `security-auditor` (skill) | ocx | 50 | Security audits, threat modelling, vuln assessment, attack surface | auto + `/security-auditor` | **HIGH** |
| `qa-engineer` (skill) | ocx | 62 | Test suite design, acceptance tests, spec validation, coverage planning | auto + `/qa-engineer` | **HIGH** |
| `review-surface` (skill) | ocx | 96 | Sorts a diff into wire/CLI/API/logic/test/doc tiers, opens a local reading-order HTML page | auto + `/review-surface` | **HIGH** |
| `builder` (skill) | ocx | 62 | Contract-first TDD implementation workflow | auto + phrase triggers | **HIGH** |
| `swarm-review` (skill) | ocx | 197 | Tiered adversarial branch/PR/diff reviewer, single reviewer → full panel + cross-model gate | auto + `/swarm-review` | **HIGH** |
| `codex-adversary` (skill) | ocx | 198 | Cross-model (GPT-5.x) second-opinion review + auto-triage | auto + `/codex-adversary` | **HIGH** |
| `deps` (skill) | ocx | 56 | Add/update/audit Rust crate deps, license + advisory gates | model-invoke only, no user trigger | **HIGH** |
| `worker-reviewer` (agent) | ocx | 94 | Diff reviewer: quality / security / performance / spec-compliance focus modes | spawned by swarm skills, model=opus | **HIGH** |
| `worker-tester` (agent) | ocx | 86 | Writes spec (pre-impl) or validation (post-impl) tests, Rust+pytest | spawned, model=sonnet | **HIGH** |
| `worker-builder` (agent) | ocx | 57 | Stub/implement/test/refactor focus modes with OCX code patterns | spawned, model=sonnet/opus | **HIGH** |
| `quality-rust.md` (rule, referenced by all above) | ocx | 341 | Rust anti-pattern severity ladder, async/Tokio patterns, path-handling gotchas, review checklist | path-scoped auto-load on `**/*.rs` | **HIGH** |
| `quality-core.md` (rule) | ocx | 240 | Language-agnostic SOLID/DRY/YAGNI, verification-honesty anti-hedging rules | auto-load, always | **HIGH** |
| `quality-security.md` (rule) | ocx | 105 | OWASP Top 10, severity classes, CWE citation, OCX-specific attack surfaces | path-scoped on CI/renovate files, pulled in by security-auditor | **HIGH** |
| `workflow-swarm.md` (rule) | ocx | 261 | Worker table, model-routing rationale, Review-Fix Loop protocol, tier vocabulary | path-scoped on `.claude/agents/**`, `.claude/skills/swarm-*/**` | **HIGH** |
| `architect` (skill) | ocx | 67 | ADR/design-spec workflow, C4 levels, trade-off matrix | auto + `/architect` | MED |
| `worker-architect` (agent) | ocx | 44 | Opus-model deep design agent | spawned by architect/swarm-plan | MED |
| `worker-architecture-explorer` (agent) | ocx | 91 | Maps current module state before design work | auto-launched by architect/swarm-plan | MED |
| `worker-doc-reviewer` (agent) | ocx | 109 | Doc-drift detector: source-change → doc-section trigger matrix | spawned, model=sonnet | MED |
| `finalize` (skill) | ocx | 194 | Rewrites working-phase commits into clean history before merge | auto + `/finalize` | LOW-MED (process, not quality) |
| `commit` (skill) | ocx | 161 | Working-phase commit workflow, Checkpoint convention | auto + `/commit` | LOW-MED |
| `swarm-plan` (skill) | ocx | 198 | Tiered feature-planning orchestrator | auto + `/swarm-plan` | LOW-MED |
| `swarm-execute` (skill) | ocx | 193 | Tiered plan-execution orchestrator, Review-Fix Loop | auto + `/swarm-execute` | LOW-MED |
| `docs` (skill) | ocx | 53 | VitePress doc authoring | scoped to `website/` | LOW |
| `worker-researcher`, `worker-doc-writer`, `worker-explorer` (agents) | ocx | 83/111/26 | External research, doc writing, fast file search | spawned | LOW |
| `meta-maintain-config`, `meta-validate-context`, `next`, `ocx-sync-roadmap` (skills) | ocx | 159/70/198/101 | AI-config self-maintenance, roadmap sync | auto/manual | LOW (meta, not Rust) |
| `code-check`, `security-auditor`, `qa-engineer`, `swarm-review`, `codex-adversary` | grimoire / grimoire-duo | ≈same | Same as ocx, project-name substituted; grimoire-duo `swarm-review` adds a `compatibility` reviewer perspective gated on a 1.0.0 stabilization freeze | same | **duplicate — see §0** |
| `e2e-test` (skill) | ocx-mirror | 67 | Tiered end-to-end test runner (offline harness → local registry → dev-channel) against real downstream fleet | auto + trigger | LOW (integration/e2e process, not code-quality) |
| `languages/rust/SKILL.md` | ocx-save | 162 | Generic Rust snippets: error enum, ownership, Tokio, Axum handler, `cargo fmt`/`clippy -D warnings`/`cargo test` | `Use when developing Rust applications` | LOW |
| `core-engineering/debugging`, `refactoring-code`, `testing`, `test-driven-development`, `optimizing-code` | ocx-save | 80/58/94/92/80 | Generic language-agnostic checklists (reproduce/isolate/trace; Extract Method; AAA pattern; Red-Green-Refactor; measure-profile-optimize) | auto | LOW |
| `core-engineering/data-management`, `data-to-ui`, `dependency-management`, `implementing-code` | ocx-save | 78/206/82/71 | Generic, no Rust content beyond incidental examples | auto | LOW |

## 2. Digest — HIGH/MED relevance items

### `code-check` (Codebase Health Auditor)
Makes the model: (1) fan out parallel `worker-reviewer` agents, one per audit
dimension; (2) audit SOLID / DRY / smells / consistency / rule-freshness;
(3) report prioritized findings with `file:line` + remediation. Loads
`quality-core.md`, `quality-rust.md`, `arch-principles.md`, plus
subsystem-specific rules matched to the audited path. Tool preferences:
**Grep/Glob first to verify before flagging**, `task duplo:diff` (structural
duplication, Rust-aware), `cargo-geiger` (unsafe-code audit), `cargo-bloat`
(binary-size hotspots). Output contract is a fixed markdown template with a
letter Health Score (A–F), a Pattern-Violations table, a SOLID-Violations
table, and a Context-Staleness table. Constraints: never flag incidental
duplication as critical, never recommend public-API breakage without a
migration path, always give concrete remediation. Handoff: to Builder for
fixes, to Architect for systemic issues.

### `security-auditor`
Workflow: map surface (Grep/Glob for entry points + data flows) → enumerate
threats via **STRIDE** → trace data through handlers → document with
severity + CWE IDs → save report to `.claude/artifacts/security_audit_[date].md`
(templated) → **file GitHub issues for Critical/High findings**. Tool
preference: Sequential Thinking MCP to walk STRIDE categories in order,
`trivy` for dependency scanning. Hard constraints: never approve code with
critical vulns, never custom crypto, always cite CWE IDs, always create
issues for Critical/High. The sibling `quality-security.md` rule supplies
the actual checklist: OWASP Top 10 table, 4-tier severity classification
(Critical/High/Medium/Low with fix obligation per tier), and a *project*
attack-surface checklist (registry auth chain, TLS/digest verification,
symlink escape from `OCX_HOME`, tar path-traversal/zip-slip, code-signing,
env-var template-injection) — this last part is the reusable **template**:
"enumerate this project's own recurring attack surfaces as a scoping
checklist" rather than the OCX specifics themselves.

### `qa-engineer`
Two modes: **contract-first** (tests written from the design record before
implementation, must compile and fail against `unimplemented!()` stubs) and
**post-implementation coverage** (analyze → plan → write → run, happy/error/
edge). Test-quality bar: deterministic, isolated (unique per-test state, no
shared mutable state), clearly named, complete, and **a regression test is
mandatory for every bug fix**. Constraint: never a flaky test — fix or
delete it; never `path.is_symlink()`, always the project's
`assert_symlink_exists()` helper for cross-platform (Windows-junction) test
correctness. Tool preference: always route through the `task` runner
(`task test:quick`, `task test:parallel`, `task test:unit`, `task coverage`),
never ad-hoc `pytest`/`cargo test` when a task target exists.

### `review-surface`
Not a verdict tool — a **reading-order** tool for diffs too large to eyeball.
Classifies every changed line into 7 tiers, first-match-wins: T0 WIRE
(serde/wire-format files — breaks other programs, including already-published
artifacts), T1 CLI & EXIT (flags/exit codes = a contract calling scripts
parse), T2 API (public signatures), T3 LOGIC (everything else — "no contract
signal, read anyway"), T4 DOC, T5 TEST (counted not ranked), T6 SCAFFOLD
(counted not ranked). Ships as a Python script (PEP 723 inline deps, run via
`uv run --script`, zero venv pollution) producing a local self-contained HTML
page — nothing uploaded. The skill's own worked example (a real 9,241-line
PR) found only 4.2% of added lines were production logic and most of the
Rust delta was inside `#[cfg(test)]` blocks in production files — proving the
tool's value on a concrete number rather than asserting it. Explicitly
documents its own failure mode: tiers rank by *declaration shape*, not blast
radius, so a 47-line untyped hot file can rank below a 2-line serde tweak;
mitigated by (1) printing "biggest movers" above every tier, (2) refusing to
ever collapse T3 to a count, (3) stating the reading-order-not-skip-list
contract on every handover. This kind of stated, load-bearing limitation is
rare and worth copying as a pattern in itself.

### `builder`
Contract-first TDD in four phases: Understand (load subsystem rules, grep
before inventing) → Stub (signatures + `unimplemented!()`, gated on
`cargo check`) → Implement (fill bodies until spec tests pass) → Verify
(`task verify` before marking complete). Four focus modes: Implementation
(default), Debugging (reproduce → isolate → trace → fix → regression test),
Refactoring (Two Hats Rule — never mix with optimization in one session),
Optimization (measure → optimize → measure). Constraints: no placeholders/
TODOs, no assumed dependencies (grep first), no duplicate implementations,
always `cargo fmt` before commit, `task verify` before completion, commit on
feature branch only — human decides when to push.

### `swarm-review`
Thin dispatch layer over tier files (`tier-low.md`/`tier-high.md`/
`tier-max.md` — not read here, referenced only). Argument parsing resolves
target (PR URL / `#N` / branch / current HEAD) and baseline (`--base`, else
PR's base ref via `gh pr view`, else `main`), then **classifies** diff size/
subsystem-count/structural-markers/PR-labels into tier `low|auto|high|max`
when tier is `auto`. A single consolidated approval gate (`EnterPlanMode`
meta-plan, or `AskUserQuestion` fallback) fires only when `--dry-run`,
`--form`, tier resolves to `max`, or classification confidence is low — no
mid-flow questions otherwise. Worker/perspective table: spec-compliance
(all tiers) → test-coverage, quality (all) → security/performance (high,
security/hot paths) → architecture, CLI-UX, SOTA-gap (max, adversarial) →
cross-model Codex pass (high when `--codex` fires, mandatory at max). Fixed
output skeleton per tier: Summary/Verdict, Stage 1, Stage 2, optional
Cross-Model and Root-Cause sections, Deferred Findings. Verdict is one of
Approve / Needs Work / Request Changes, driven by unresolved Block-tier
findings. Hard constraints: **read-only** (never auto-fixes), never approves
with unresolved Block-tier, never nitpicks style a formatter already
enforces, max 8 parallel workers, always classifies every finding
actionable-vs-deferred, always stays within `<base>...HEAD` diff scope.

### `codex-adversary`
Cross-*model-family* second opinion (Codex/GPT-5.x) explicitly framed against
`swarm-review`'s intra-Claude-family panel: "same training data, same blind
spots" vs. "catches things Claude family miss" — recommended sequence is
cheap intra-family review first, then this as final gate. Model tiers
(`luna`≈Haiku, `terra`≈Sonnet, `sol`≈Opus, default `terra`). Deliberately does
**not** re-inject project context into the review prompt — Codex reads the
repo's own `AGENTS.md` every invocation, so context lives in one file both
models share rather than being duplicated per-skill. Two review scopes:
code-diff (working-tree/branch/`--base`) or plan-artifact (reviews an ADR/
plan markdown file — used as a gate before `/swarm-plan` finalizes). After
the external review returns, Claude **auto-triages** the free-text output
into six classes (Auto-fix / Needs-confirmation / Discuss / Filtered-trivia /
Filtered-stated-convention / Filtered-false-positive) rather than surfacing
every line to the user — auto-fix items get applied with `Edit`, a targeted
`cargo check -p <crate>` per fix, then one `task verify` at the end (not
per-file); needs-confirmation items go through `AskUserQuestion` one at a
time; discuss items are presented verbatim, un-advocated. Never commits —
that is always a separate, explicit `/commit` call.

### `deps`
Six-step workflow: research current crate API/features via Context7 MCP →
`cargo deny check licenses` against an allowlist → `cargo deny check
advisories` → prefer `[workspace.dependencies]` for shared crates → verify
via `task license:deps` + `cargo clippy --workspace` → `cargo update` +
`cargo deny check` + `task verify` on updates. Qualitative crate-evaluation
rubric before recommending anything: maintenance (last commit/release, CI
health), bus factor (single maintainer vs. community), maturity (≥1.0,
6-month API churn), adoption (stars absolute *and* relative to niche
alternatives), ecosystem fit, and a check against `blessed.rs`/`lib.rs`
crate-recommendation sites — explicit rule: **never pick between two crates
from memory alone**. `cargo machete` for unused-dep detection. Constraint:
no crate added without a license+advisory check; submodule deps
(vendored/forked crates) require upstream PRs, not silent local patches.

### `worker-reviewer` (agent)
Four focus modes (quality default / security / performance /
spec-compliance), the last of which is **phase-aware**: `post-stub` checks
stub signatures against the design record with zero implementation yet
(every documented type/trait/fn has a stub, no extra public surface, all
bodies `unimplemented!()`); `post-specification` checks tests trace to
design requirements before implementation exists; `post-implementation`
does full requirement↔test↔impl traceability and reports coverage gaps.
"Always Apply" section repeats the block-tier Rust anti-patterns (no
`.unwrap()`/`.expect()` in lib code, no blocking I/O in async, no
`MutexGuard` across `.await`, no `unsafe` without a `// SAFETY:` comment)
directly in the agent file so they fire even when the path-scoped rule file
doesn't auto-load for some reason — a deliberate belt-and-suspenders
redundancy. Every finding is classified **Actionable** (fixable without
human input) or **Deferred** (needs human judgment, with a stated reason —
hedge words like "probably"/"might" are explicitly banned as a
classification excuse: unclear reason means investigate more, not defer).
Diff-scoped: given a file list, restrict findings to those files, except
where the diff introduces a regression in unchanged code. "Verification
Honesty" section bans hedge phrases in verdicts entirely.

### `worker-tester` / `worker-builder` (agents)
Tester: **specification mode** writes tests from the plan artifact before
implementation exists, explicitly forbidden from reading impl code or stub
bodies (only design record + stub *signatures*), must fail against
`unimplemented!()`/`NotImplementedError`, and flags any design gap rather
than inventing a requirement to test. Validation mode (default) covers an
existing implementation. Builder: four focus modes (stubbing/implementation/
testing/refactoring); model-override note is itself a useful piece of
routing prose — "sonnet is 1.2pp behind opus on SWE-bench at 5x lower cost;
orchestrator should still pass `model: opus` for architecturally complex or
cross-subsystem work" — i.e. the model choice is justified with a number,
not asserted.

### `quality-rust.md` (rule)
The actual substance behind most of the above skills. Structured as a tiered
anti-pattern ladder (Block/Warn/Suggest) rather than a flat lint list:
- **Block** (must fix before merge): `.unwrap()`/`.expect()` in library code
  (ties to `clippy::unwrap_used`/`clippy::expect_used` as `warn` lints in
  `[lints.rust]`), `anyhow` in library APIs (libs=`thiserror`, bins=`anyhow`,
  never mixed), non-`C-GOOD-ERR`-compliant error strings, magic
  `std::process::exit(N)` literals instead of a typed `ExitCode` enum aligned
  to `sysexits.h`, silent `let _ = result`/`.ok()` swallowing, `.to_string()`
  in `map_err` erasing the source error, `MutexGuard` held across `.await`,
  `unsafe` without a `// SAFETY:` comment, blocking stdlib I/O in async paths,
  a `From` impl that can panic (must be `TryFrom` instead), `Box<dyn Error>`
  as a lib return type, suppressing `clippy::correctness`, reachable
  `todo!()`/`unimplemented!()` in production paths, missing `use<'a, T>`
  capture bounds on public RPIT returns under edition 2024.
- **Warn**: `pub(crate)`/`pub(super)` as a visibility smell (gate through
  module nesting instead), missing `#[derive(thiserror::Error)]`, public
  error enums missing `#[non_exhaustive]`, missing `#[source]` on wrapping
  variants, unnecessary `.clone()`, `Box<dyn Trait>` where `impl Trait`
  works, `PathBuf`/`String` parameters where `&Path`/`&str` suffice,
  stringly-typed APIs, boolean parameters where an enum reads clearer,
  unbounded `mpsc::channel()`, 15+-field god structs, abbreviated
  identifiers (with named exceptions: domain initialisms like `OCI`/`HTTP`,
  obvious one-line closure bindings, loop counters `i`/`j`).
- **Suggest**: `Cow<'_, str>`, `#[must_use]`, iterator chains over
  materialized intermediate `Vec`s, `impl Into<T>` parameters, early returns
  over nesting, hand-picked `clippy::pedantic` lints (never the whole group).

Async/Tokio section: `JoinSet` for bounded parallel work, **mandatory
deterministic-output rule** — `join_next()` returns in completion order, so
every consumer must sort by a stable key before returning (spawn with index,
collect, sort by index is the named idiom); `spawn_blocking` for >100μs
sync work between awaits, its `JoinHandle` must be awaited or a panic is
silently dropped; cancel-safety notes (`recv()` safe, `send()` not — use
`reserve().await` + `permit.send()` inside `select!`); five explicit NEVERs
(MutexGuard across await, blocking stdlib in async, `block_on` from a tokio
thread, unbounded channels without justification, dropping an unobserved
`JoinHandle`).

Notably rigorous **Testing Conventions → Structural guards** subsection:
guidance for writing a test that asserts over *source text* rather than
*behavior* (the only way to cover "a call that must not exist"). Five
concrete failure modes observed in real guards, each with the fix: scope the
scan to where the defect can *actually* occur (not just the function whose
name matches), strip comments before scanning (a denylist that quotes its
own forbidden forms matches its own comment), a literal needle can silently
stop matching after a reformat (assert match-count is non-zero, not just
that a forbidden count is absent), a count-equality guard is a budget not a
pairing (one stray match elsewhere can compensate — scan each call site
instead), and a negative assertion (`!contains(X)`) fails silently where a
positive one fails loudly (treat a denylist as a tripwire for the likely
accident, never as the contract itself). This is the single most
sophisticated, non-generic piece of content found in the whole survey.

Also: a dedicated **Cross-Platform Path Handling** section (macOS `/tmp`
symlink non-canonicality, Windows `\\?\` verbatim-prefix and 8.3 short
names, POSIX-vs-Windows absoluteness divergence — a driveless `/root/bin`
is *not* absolute on Windows) with concrete rules (`dunce::canonicalize`
over bare `std::fs::canonicalize`, canonicalize both sides of a path
equality assertion, never assert a POSIX-absolute literal against a
resolved value, pair every `!contains` negative assertion with a positive
one on a known-present path). And a closing **Code Review Checklist
(Rust-Specific)** that compiles the whole file into ~10 checkboxes,
including one specific to this project's CLI-flag-forwarding contract
(a pattern worth genericizing: "any config-affecting flag added must be
forwarded through the project's subprocess-spawn helper AND documented").

### `quality-core.md` (rule)
Universal (language-agnostic) SOLID/DRY/KISS/"Choose Boring Technology"
(explicit ~3-novel-dependency budget per project, citing Dan McKinley's
"innovation tokens")/YAGNI, a 3-tier anti-pattern severity system
(Block/Warn/Suggest) reused by every language leaf rule, a "Don't Own
Non-Domain Code" section (bar for hand-rolling something a library already
solves: no library exists, or a library exists but leaks needed features —
with a named precedent, a forked OCI client — or it's a genuine one-liner;
escalates to **Block-tier** for anything parsing/emitting an external wire
format, illustrated with a real bug: a hand-written JSON emitter used `>
0x7F` instead of `>= 0x7F` for its escape boundary, and neither the unit
test nor the doc comment caught it because no golden fixture contained the
offending byte). The **Verification Honesty** section is the most reusable
piece: a banned-phrase table ("should work"→"verified by [test/command
output]", "probably/likely"→state what was checked, "seems to"→"confirmed
by [method]"), tiered as Warn (hedging, premature celebration) vs. Block
(claiming "verified" without citing evidence). Its "Unchecked Green"
subsection formalizes a mutation-testing-style proof obligation for *any*
check, not just tests: demonstrate both a red and a green outcome on inputs
you control, because a green-only result can't distinguish "passed" from
"never ran"; includes a sharp aside on self-referential detectors (`pgrep
<term>` from a shell whose own command line contains `<term>` always
matches, regardless of whether the real thing exists).

### `quality-security.md` (rule)
Short (105 lines) but functions as a template: generic OWASP-Top-10 table +
4-tier severity classification (Critical/High/Medium/Low with fix-obligation
per tier) + CWE-citation requirement, followed by a **project-specific
attack-surface enumeration** (here: registry auth, TLS/digest/signature
verification, symlink escape, tar path-traversal/zip-slip, macOS
code-signing, env-var template-injection) used directly as the STRIDE
scoping checklist by `security-auditor`. The reusable shape for a new
package is "OWASP table stays generic; attack-surface list gets rewritten
per target project."

### `workflow-swarm.md` (rule)
Backing rule for every swarm skill; not itself Rust-specific but defines
the **model-routing rationale** referenced everywhere else in this
codebase family and in the user's own global CLAUDE.md: axis is nature of
work not tier — Opus for security/code-review/adversarial passes and
non-mechanical implementation (multi-file, async/concurrency,
error/exit-code semantics, wire-format, credential paths, one-way-door
architecture), Sonnet for mechanical/breadth work (exploration, search,
research, docs, fixtures, renames, test scaffolding), Haiku only on
explicit user override and never on security paths. Defines the **Review-Fix
Loop** shared verbatim across three skills (`swarm-execute`, `swarm-review`,
bugfix/refactor workflows) via an HTML-comment-delimited canonical block —
worth copying as a pattern: round 1 runs every perspective, findings
classified actionable/deferred, subsequent rounds re-run only perspectives
with prior actionable findings, oscillating findings (same issue two rounds
running) auto-defer rather than loop forever, optional one-shot (never
looping) cross-model gate at the end. Also defines per-tier defaults for
`swarm-plan`/`swarm-execute`/`swarm-review` (`low|auto|high|max`) as data
tables rather than prose, and a **Parallel Worktree Execution** section:
one worktree per file-disjoint work package, `cargo check` after *every*
merge (per-work-package verification alone misses cross-file interaction
bugs — this is the one piece of the rule justified with a stated failure
mode rather than asserted as best practice).

### `architect` / `worker-architect` / `worker-architecture-explorer`
Design workflow: auto-launch an explorer to map current module state and
find reusable code before any design reasoning happens; research phase
persists findings to `.claude/artifacts/research_*.md` rather than
discarding them; requires ≥2 options with trade-offs before a
recommendation; C4-level scoping (Context/Container/Component/Code, "Code"
only when significant); explicit NFR checklist (scalability, availability,
latency, security, cost, operability). Hard constraint: architect produces
design docs only, never implementation code.

### `worker-doc-reviewer`
Read-only doc-drift detector driven by a **source-change → doc-file →
section** trigger matrix (e.g., a new file under `command/*.rs` → check the
CLI reference's flag table; a new `OCX_*` env var → check the environment
reference; a schema field addition → check the metadata reference). Cross-
references every changed file in the diff against the table, flags
unaddressed triggers as Critical (user-visible) or Medium (edge case).
Enforces Diátaxis-type integrity (reference pages stay facts-only, no
narrative bleed) and link integrity. Explicitly separated from
`worker-doc-writer` (review vs. remediation are different agents/tools).

## 3. Structural patterns worth copying

1. **Severity-tiered anti-pattern ladders (Block/Warn/Suggest), not flat lint
   lists.** Defined once in `quality-core.md`, specialized per language leaf.
   Makes every review output classifiable and every finding's obligation
   explicit ("must fix" vs. "can negotiate" vs. "optional").
2. **Actionable-vs-deferred finding classification with a banned-hedge
   rule for the "deferred" reason.** Forces genuine human-judgment calls to
   be named specifically instead of used as an escape hatch, and drives an
   automatic fix-loop (only actionable findings trigger re-review).
3. **The Review-Fix Loop as one canonical, verbatim-shared block** (HTML
   comment markers) rather than re-explained per skill — bounded rounds,
   re-run only perspectives with prior findings, auto-defer on oscillation,
   one-shot (never-looping) cross-model gate at the end.
4. **Cross-model adversarial review as a distinct, later gate** from
   intra-family multi-perspective review — explicitly framed as "same
   training data / different blind spots," sequenced cheap-first,
   deliberately one-shot to avoid two-family stylistic thrash, and
   deliberately *not* re-injecting project context (both models read the
   same `AGENTS.md`/README instead of duplicating it per-prompt).
5. **A tool that produces a reading order, not a verdict** (`review-surface`)
   — worth the generalized shape: classify diff lines by *contract weight*
   (wire format > CLI/exit code > public API > logic > test/doc/scaffold),
   ship a small local script with inline dependency metadata (no venv/repo
   pollution), and — critically — **state the tool's own blind spot inside
   itself** (declaration shape ≠ blast radius) with concrete counter-measures
   rather than silently living with the limitation.
6. **Structural-guard-writing guidance**: five specific, previously-observed
   failure modes for tests that assert over source text rather than
   behavior (wrong scope, unstripped comments, silently-stale literal
   needles, count-based guards that are budgets not pairings, negative
   assertions that fail silently). This is deep, hard-won content, not
   generic advice — a strong candidate for direct reuse.
7. **Verification Honesty / "Unchecked Green"**: a banned-phrase table plus
   a mutation-testing-style proof obligation (must show both red and green
   on controlled inputs) applied uniformly to review verdicts, completion
   reports, and test/CI checks alike — including the self-referential
   detector trap (`pgrep <term>` from a shell containing `<term>` in its own
   command line).
8. **Belt-and-suspenders rule redundancy**: the same 4–5 block-tier Rust
   anti-patterns are repeated verbatim inside `worker-reviewer.md`,
   `worker-builder.md`, and `worker-tester.md`'s "Always Apply" sections in
   addition to living in the auto-loaded `quality-rust.md` rule file — a
   deliberate hedge against path-scoped auto-load not firing for some
   reason, worth adopting as a small, bounded duplication (a handful of
   lines, not the whole rule file).

Also worth noting as reusable shape, lower priority: the crate-evaluation
rubric in `deps` (maintenance / bus factor / maturity / adoption /
ecosystem fit, "never choose between two crates from memory alone"); the
"Don't Own Non-Domain Code" bar-for-vendoring test in `quality-core.md`; and
the doc-drift trigger-matrix pattern in `worker-doc-reviewer` (source-change
pattern → doc file → section, generalizable beyond OCX's own files).

## 4. Anti-patterns / bloat observed

- **Near-total duplication across four repos.** `grimoire`, `grimoire-duo`,
  and `ocx-mirror` carry byte-for-byte copies of ocx's `code-check`,
  `security-auditor`, `qa-engineer`, `swarm-review`, `codex-adversary`, etc.,
  differing only by a find-and-replace of the project name and one or two
  flags. Four maintenance surfaces for one design — the clearest single
  argument for extracting a shared, parameterized package rather than
  forking `.claude/` per repo.
- **Deep cross-referencing into a specific project's rule tree.** Every
  skill assumes `.claude/rules/subsystem-*.md`, `arch-principles.md`,
  `product-context.md`, a `task` runner with a fixed command surface
  (`task verify`, `task test:quick`, `task license:deps`, `task
  duplo:diff`), and specific in-house types (`ReferenceManager`,
  `PackageErrorKind`, `OCX_HOME`). None of this content transplants without
  a rewrite pass — the *shape* is reusable, the *content* is not.
  `quality-rust.md`/`quality-core.md` are the exception: genuinely
  project-independent already, explicitly labeled "shareable" in their own
  headers.
- **`ocx-save`'s `languages/rust/SKILL.md` is boilerplate, not a quality
  gate.** It's a snippet library (error enum, ownership examples, an Axum
  handler) with a generic `cargo fmt` / `cargo clippy -- -D warnings` /
  `cargo test` block at the end. No severity tiers, no async/Tokio
  discipline, no path-handling gotchas, no structural-guard guidance —
  everything that makes `ocx`'s `quality-rust.md` valuable is absent. Not
  worth porting; would be actively regressive to include alongside ocx's.
- **`ocx-save`'s `core-engineering/*` skills are entirely generic,
  TypeScript-flavored, and language-non-specific**, duplicating standard
  textbook content (TDD red-green-refactor, AAA test pattern, Extract
  Method) that any competent model already knows without a skill file.
  Low information density relative to line count.
- **Long orchestrator skills (`swarm-review`, `swarm-plan`, `swarm-execute`,
  `codex-adversary`, all ~190–200 lines) carry heavy tier/overlay/flag
  bookkeeping** that's necessary for a multi-repo swarm orchestration
  *product* but is orthogonal to "review this Rust diff for quality" — a
  packaged quality skill should not need tier classifiers, meta-plan gates,
  or an 8-worker cap; that's swarm-orchestration machinery bolted onto the
  review content, not part of the review content itself.
- **`finalize`/`commit` are git-workflow skills, not quality skills** —
  relevant to a *complete* AI-config bundle but out of scope for a
  Rust-quality-specifically package; including them would blur the
  package's purpose.

## 5. What's missing for a Rust-focused quality package

- **No dedicated benchmarking/criterion workflow.** `optimizing-code`
  (ocx-save) has "measure first" as generic prose; nothing here wires up
  `cargo bench`/`criterion`, flamegraph profiling, or a benchmark-regression
  gate specific to Rust.
- **No `cargo nextest` / CI-matrix-specific guidance beyond a couple of
  invocation examples in `worker-tester.md`.** No coverage-threshold gate
  (a `task coverage` command is referenced but its threshold, if any, is
  never stated in these files), no flaky-test-quarantine protocol beyond
  "don't write them."
- **No MSRV (minimum supported Rust version) policy, no `cargo semver-checks`
  / public-API-diff gate for library crates**, despite `#[non_exhaustive]`
  and RPIT-capture-bounds both being called out as concerns that exist
  precisely because of semver breakage risk.
- **No fuzzing / property-testing guidance** (`proptest`/`quickcheck`/
  `cargo fuzz`) anywhere in the surveyed set, despite security-auditor
  content emphasizing input-boundary risks that fuzzing is the standard tool
  for.
- **No `unsafe`-code-specific deep-dive beyond "needs a SAFETY comment."**
  `cargo-geiger` is named as a tool preference in `code-check` but nothing
  defines what an acceptable geiger report looks like, nor covers Miri,
  sanitizers, or `unsafe` review checklists (aliasing, UB classes).
  Security-auditor's "no custom crypto" constraint is the closest thing to
  an unsafe-adjacent gate, and it's one line.
- **No workspace-hygiene / crate-boundary linting** (`cargo udeps` for
  unused deps at the workspace level — only `cargo machete` is mentioned;
  no check for accidental crate-graph cycles, no feature-unification
  auditing for multi-crate workspaces).
- **No build-time / compile-time budget gate** (no mention of watching
  `cargo build --timings`, incremental-compile regression, or codegen-units
  tuning) despite `cargo-bloat` being named for binary size.
- **Doc-drift detection (`worker-doc-reviewer`) is fully bespoke to one
  project's doc tree** — the trigger-matrix *pattern* is reusable but there
  is no generic, rustdoc-centric equivalent (e.g., a gate checking that
  every public item change has a corresponding `///` update, or that
  `cargo doc --no-deps -D warnings` is clean).
