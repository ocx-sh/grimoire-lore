---
title: Arcana research digest — AI agent behavior for config authoring
agent: inv-arcana
model: sonnet
scope: >
  Digest of arcana's local research (.agents/research/*.md) filtered to
  findings that generalize to "how should we write config/rules/skills so
  AI agents follow them reliably and work autonomously." Excludes content
  that is purely about arcana's own hex/grim product or roadmap.
sources:
  - /home/mherwig/dev/arcana/.agents/research/harness-capability-landscape.md
  - /home/mherwig/dev/arcana/.agents/research/hierarchical-execution-performance.md
  - /home/mherwig/dev/arcana/.agents/research/hierarchical-orchestration-precedent.md
  - /home/mherwig/dev/arcana/.agents/research/nested-execution-tooling.md
  - /home/mherwig/dev/arcana/.agents/research/plan-schema-evolution.md
  - /home/mherwig/dev/arcana/.agents/research/swarm-customization-and-config.md
  - /home/mherwig/dev/arcana/.agents/research/openspec-framework-analysis.md
  - /home/mherwig/dev/arcana/.agents/research/spec-federation-multi-repo.md
---

# Findings

1. **Multi-agent coordination cost scales superlinearly with agent count.**
   Universal Scalability Law crosstalk term is quadratic in N; a Dec-2025
   Google preprint measures coordination turns T = 2.72×(n+0.5)^1.724 and
   error amplification climbing 1.0x (single agent) → 4.4x (centralized
   coordination) → 5.1x (hybrid) → 7.8x (decentralized) → 17.2x
   (independent, uncoordinated agents). Non-peer-reviewed; exponents
   directional, not exact.
   *Source: hierarchical-execution-performance.md, Key finding 4
   (arxiv.org/html/2512.08296v1).*

2. **Adding agents past a single-agent success threshold gives negative
   returns.** Same preprint: once a single agent already clears ~45%
   accuracy on a task class, adding agents has a negative effect
   (β=−0.408, p<0.001). A 16-tool benchmark showed a 6.3x efficiency
   collapse in multi-agent mode (success/token 0.466 → 0.074).
   *Source: hierarchical-execution-performance.md, Key finding 4.*

3. **Anthropic's own multi-agent research system: real but task-specific
   win, explicit poor fit for coding.** ~15x the tokens of a single chat
   turn, ~4x a single agent. Opus-lead + Sonnet-subagents beat single Opus
   by 90.2% on breadth-first research, cutting wall-clock up to 90% — but
   Anthropic names coding a poor fit for this pattern because it has fewer
   truly parallelizable subtasks than research does.
   *Source: hierarchical-execution-performance.md, Key finding 4
   (anthropic.com/engineering/multi-agent-research-system).*

4. **Single-context beats multi-agent on sequential/dependent reasoning
   under equal compute.** A Stanford paper found multi-agent decomposition
   only earns its keep when one context literally cannot hold the task, or
   when strictly more total compute is spent — not as a free quality lever.
   *Source: hierarchical-execution-performance.md, Key finding 4
   (arxiv.org/abs/2604.02460).*

5. **Same-kind reviewer/sample scaling plateaus early.** Self-consistency
   gains are mostly captured by N=5–10 same-kind samples, flat by 20–40, at
   40–64x compute cost, and noise can hurt past the plateau. Panels should
   grow role/perspective diversity, not duplicate the same
   role — corroborated independently by a config-design audit that found
   "two security reviewers" is a commonly requested but empirically
   unjustified knob.
   *Sources: hierarchical-execution-performance.md, Key finding 4
   (arxiv.org/html/2511.00751v2); swarm-customization-and-config.md,
   Finding 6.*

6. **Concrete gating thresholds for when fan-out/recursion is worth it.**
   Sub-orchestration (recursive delegation) only pays off when a unit of
   work has ≥3 independent, similarly-sized sub-tasks and the work is
   actually decomposable (not tightly sequential/state-dependent — the
   exact regime where single-agent wins under equal budget, per Finding 4).
   Below that granularity, spawn overhead (4–15x token cost per Finding 3)
   dominates. Skip fan-out entirely once a single agent already clears
   ~45%+ success on the task class; split the unit smaller instead of
   adding agents.
   *Source: hierarchical-execution-performance.md, Decision thresholds.*

7. **The single highest-leverage structural rule for containing error
   amplification: every delegate/sub-orchestrator must still funnel through
   one centralized verification gate**, not a locally-scoped one. This is
   empirically the difference between the 4.4x (centralized) and 17.2x
   (independent) error-amplification regimes in Finding 1.
   *Sources: hierarchical-execution-performance.md; hierarchical-
   orchestration-precedent.md.*

8. **Recursion/nesting depth caps are universal but never uniform, and an
   uncapped one is an active bug class.** Every mature multi-agent
   framework studied hard-caps delegation depth, but the cap tracks what
   state the construct carries — stateless workers get deeper caps,
   checkpointed/resumable constructs get shallow ones. Concretely: Claude
   Code caps subagent nesting at depth 5 (the deepest level loses further
   spawn ability) and workflow self-nesting at 1; Codex CLI hard-codes
   depth 1 (subagents can't spawn further, open feature request
   openai/codex#9912); OpenCode currently has **no** depth limit and an
   open runaway-nesting bug (anomalyco/opencode#18100). A depth cap used by
   a tool/skill's own orchestration logic must be self-enforced, not
   assumed from the harness.
   *Sources: nested-execution-tooling.md, Cross-harness nesting;
   hierarchical-orchestration-precedent.md, Finding 9.*

9. **"Strongest" or orchestrator-tier models can silently fall back to a
   weaker model.** Anthropic's orchestrator-class tier (Fable 5/Mythos 5)
   has safety classifiers that fall back to Opus 4.8 on certain requests —
   a plain capability boolean or model-name string hides this. Don't assume
   a top-tier model designation guarantees that literal model executed.
   *Source: harness-capability-landscape.md, Key findings
   (anthropic.com/news/claude-fable-5-mythos-5).*

10. **LLM-driven hierarchical delegation misbehaves in practice.** CrewAI's
    hierarchical process (a manager agent deciding sub-agent task
    assignment) has an iteration-limit hard cap specifically because open
    issues show it misbehaving without one — a caution against trusting an
    LLM orchestrator to freely delegate without hard limits.
    *Source: hierarchical-orchestration-precedent.md, Finding 8
    (github.com/crewAIInc/crewAI/issues/4783).*

11. **Review/escalation should scope small by default and widen only on
    local failure to resolve** — the pattern across supervision trees
    (OTP/Akka), CI, and human review hierarchies alike. Critically, each
    level's reviewable unit must stay small (per-item summaries, not raw
    piles) or that level just rubber-stamps; deep hierarchy without
    matching reviewer capacity becomes a bottleneck, not a quality gain
    (the Linux kernel "maintainers don't scale" lesson).
    *Source: hierarchical-orchestration-precedent.md, Findings 1, 4 and
    Recurring structural rules.*

12. **Quantified: large diffs get far less real scrutiny per line.** PRs
    over 1,000 lines get genuine review only ~10% of the time — about 20x
    less scrutiny per line than PRs under 200 lines. Directly supports
    keeping the reviewable/verifiable unit small rather than compensating
    with a bigger review panel later.
    *Source: hierarchical-orchestration-precedent.md, Finding 5.*

13. **Undocumented enforcement semantics is the worst config failure mode
    for an LLM consumer.** When a config key is named but its interaction
    with hardcoded behavior is never written down, the model doesn't error
    — it silently doesn't act on the field, and two separate reads of the
    same file can reach different conclusions about whether a value is
    binding. Writing the resolution rule matters more than validating the
    schema.
    *Source: swarm-customization-and-config.md, Direct answer, Findings
    1–2.*

14. **Resilient parse-with-warnings beats strict failure for agent-consumed
    config.** Unknown keys should warn once and be ignored, never block the
    run; oversized or malformed values should be dropped with a warning,
    not error. Observed in OpenSpec (an oversized `context:` field >50KB is
    warned-and-dropped, not rejected; unknown `rules:` keys warn once) and
    in get-shit-done (unknown config keys are silently ignored, verified in
    its own test suite).
    *Sources: swarm-customization-and-config.md, Findings 11, 16;
    openspec-framework-analysis.md, Finding 4.*

15. **Never block a run on config trouble — surface it diagnostically.**
    The observed convention (OpenSpec's `doctor` command) is read-only
    health reporting as `{message, fix}` pairs, separate from the main
    execution path, with every complaint paired with a remediation string,
    not just a fault description.
    *Sources: swarm-customization-and-config.md, Finding 16; openspec-
    framework-analysis.md, Finding 11 (distinct error strings per failure
    shape).*

16. **List-valued config keys are a recurring drift trap.** Raw
    ordered-array composition across config layers is unpredictable enough
    that ESLint had to reintroduce `extends` sugar (March 2026) after users
    struggled with flat-config array ordering; GitLab's `include` cannot
    merge `rules:` arrays (later layer replaces wholesale, never appends);
    Ruff resets its `ignore` baseline whenever `select` is specified in the
    same config. Any list-valued key must explicitly state
    replace-vs-append semantics — never leave it implied.
    *Source: swarm-customization-and-config.md, Finding 9.*

17. **A minimal, frozen config vocabulary beats an elaborate declarative
    one in practice.** Spec Kitty designed a full 367-line agent-roster
    YAML (per-agent roles, priority, concurrency caps, ordered fallback
    chains) and never shipped it — what shipped was 3 fields. GSD, which
    shares the "config only ever read by a prompt, no code layer"
    architecture, went maximal instead (~90 keys across 16 groups) and paid
    for it with a 1,111-line reference doc, plus the same precedence
    caveat ("absent key = enabled, explicit `false` = disabled") repeated
    verbatim across 4 separate agent files — evidence that precedence
    should be stated once centrally, not re-explained per key.
    *Source: swarm-customization-and-config.md, Findings 12, 18.*

18. **Separating a generation prompt into distinct, never-concatenated
    blocks reduces drift, and an explicit "don't copy this into the
    output" guardrail is a real, working mitigation.** OpenSpec's prompt
    assembly keeps `<project_context>` / references / `<rules>` /
    `<dependencies>` / `<output>` / `<instruction>` / `<template>` /
    `<success_criteria>` as separate blocks in a fixed order, and its own
    skill text states the guardrail verbatim: "context and rules are
    constraints for YOU, not content for the file — Do NOT copy
    `<context>`, `<rules>`, `<project_context>` blocks into the artifact."
    This targets a real failure mode: models asked to draft an artifact
    will sometimes echo instruction/context text verbatim into the output
    unless explicitly told not to.
    *Source: openspec-framework-analysis.md, "Deterministic core vs prompt
    layer"; Adopt/adapt item 7.*

19. **Precise, actionable error and reviewer-comment strings are one of
    the cheapest quality wins available.** Distinguishing "no delta
    sections found" from "sections found but no entries parsed" (rather
    than one generic error) is called out explicitly as cheap and
    high-value; likewise, an error that rejects a value should enumerate
    the accepted values inline rather than pointing at `--help`, and every
    refusal should name both the fault and the fix location.
    *Source: openspec-framework-analysis.md, Findings 11, 24; Adopt items
    9, 29.*

20. **Delegating a correctness-critical operation to "LLM judgment"
    instead of deterministic rules is a regression, not a feature.**
    OpenSpec had designed a deterministic conflict-resolution mechanism
    (fingerprints + diff3 + scenario IDs) for merging spec deltas, never
    shipped it, and replaced it with prompt-based "intelligent merging"
    instead. The recommended pattern: mechanical/deterministic rules first,
    agent judgment only for genuinely remaining conflicts, with escalation
    rather than silent guessing.
    *Source: openspec-framework-analysis.md, Finding 12; Adopt item 22.*

21. **Context-file loading mechanics are non-obvious and change whether a
    rule an agent is "supposed to know" is actually in its context.**
    Verified for Claude Code: `CLAUDE.md` resolution is *concatenation*
    from filesystem root down to cwd, not nearest-wins override, so a
    `CLAUDE.md` at a common ancestor is already loaded in any session
    started below it. `--add-dir` always loads skills from the added
    directory but loads its `CLAUDE.md`/rules only if
    `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` is set — the
    permission-only `additionalDirectories` setting never loads them at
    all. `.claude/settings.json` never inherits from parent directories.
    `@path` imports recurse at most 4 hops. A worker cannot assume a
    parent- or sibling-directory's conventions are ambiently in context —
    it must explicitly `Read` them.
    *Source: spec-federation-multi-repo.md, "Runtime constraints (Claude
    Code, verified)".*

22. **Claude Code's own guidance for scaling conventions beyond nested
    context files is not "add more/deeper context files" — it's moving
    them into skills, versioned plugins/bundles, or an MCP index.**
    *Source: spec-federation-multi-repo.md, Key finding 5
    (code.claude.com/docs/en/large-codebases).*

23. **Dependency-driven (DAG) task launch is a near-free upgrade over
    wave/barrier scheduling** — same coordination cost, strictly less
    wasted wait time — and is adopted without caveat across every mature
    CI/build precedent studied (GitLab `needs`, Bazel critical-path
    profiling, Buck2's single incremental graph replacing Bazel's phases).
    *Sources: hierarchical-execution-performance.md; hierarchical-
    orchestration-precedent.md, Findings 2, 3.*

# Implications for authoring Rust quality config

- Write down the **enforcement semantics** of every knob, not just its
  name — an undefined interaction between a config value and hardcoded
  tool behavior gets silently ignored by the model, not flagged (Finding
  13).
- Use **resilient parsing**: unknown or malformed keys warn-and-continue,
  never hard-fail a run; cap/drop oversized values with a warning rather
  than erroring (Finding 14).
- For any list-valued setting (lint allow/deny lists, path globs, rule
  overrides), state **replace-vs-append explicitly per key** — don't leave
  array-merge behavior implied (Finding 16).
- Default to a **small, frozen config vocabulary**. Resist designing an
  elaborate declarative schema up front; ship the minimal version and only
  grow it when a second real consumer needs the extra surface (Finding
  17).
- Keep any generated review/fix/checker **panel role-diverse rather than
  duplicating the same checker type** — diminishing returns past ~5
  same-kind reviewers; Rust's own lint groups (clippy categories,
  rustfmt, cargo-audit, cargo-deny) already give role diversity for free
  (Findings 5, 6).
- If a skill spawns sub-agents to fix findings in parallel (e.g., one
  worker per clippy lint category), **gate that fan-out behind a
  granularity threshold** (≥3 independent, similarly-sized units, genuinely
  decomposable work) and **self-enforce a hard depth cap** in the skill's
  own logic — don't assume the harness's cap is sufficient or even present
  (Findings 6, 8).
- **Route every fix — however many parallel/recursive workers produced
  it — back through one centralized verification step** (`cargo check` /
  `cargo clippy` / `cargo test`) before it's considered done. This is the
  single biggest lever against error amplification in multi-agent output
  (Finding 7).
- Keep the **reviewable unit small** (small diffs, one work package at a
  time) rather than trusting a larger review panel to compensate for a
  large diff — large diffs get dramatically less real scrutiny per line
  regardless of who or what reviews them (Finding 12).
- Structure any generated prompt (e.g., a "fix this clippy warning" or
  "write this commit message" task) into **separate, clearly labeled
  blocks** (context / rules / task / output shape) and include an explicit
  **"these are constraints for you, not content to reproduce"** guardrail
  wherever the model might otherwise echo instruction text into a commit
  message, doc comment, or generated file (Finding 18).
- Make any custom checker's **error and lint-fix messages actionable**:
  name the fault and the fix location together, and when rejecting a
  value (e.g., an invalid profile or edition), enumerate the valid values
  inline (Finding 19).
- Prefer **deterministic rules over LLM judgment** for anything
  correctness-critical (e.g., merging generated changes, resolving
  conflicting lint fixes); reserve model judgment for genuine residual
  conflicts, and make it escalate rather than silently guess (Finding 20).
- Don't assume a rule defined in a workspace member's or parent
  directory's config file is automatically in a subagent's context —
  have the skill explicitly read it, matching how `CLAUDE.md`
  inheritance is narrower than it looks (Finding 21).
- When routing to an "orchestrator" or "strongest" model tier for a
  design/architecture decision, remember it can silently fall back to a
  weaker model under safety classifiers — don't hardcode assumptions
  about which literal model executed (Finding 9).
