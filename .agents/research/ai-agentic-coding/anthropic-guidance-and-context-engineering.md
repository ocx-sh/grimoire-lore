---
title: Anthropic Guidance and Context Engineering
topic: Anthropic and frontier-lab guidance on agentic coding
agent: inv-arch (subarea researcher)
model: sonnet
date_researched: 2026-08
sources_count: 12
scope: |
  Covers first-party Anthropic engineering guidance (context engineering, tool design,
  agent architecture patterns, Claude Code best practices, Agent Skills, multi-agent
  research systems, code review) plus non-duplicative cross-lab guidance (OpenAI Codex
  AGENTS.md, Cursor rules, the AGENTS.md open spec). Does NOT cover Rust-specific lint
  rules, clippy configuration, or OCI/registry protocol details — those belong to other
  subareas of this research effort. Practice as of 2026, Rust edition 2024 era.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Context engineering: the core resource to manage](#1-context-engineering-the-core-resource-to-manage)
  2. [Writing tools for agents](#2-writing-tools-for-agents)
  3. [Agent architecture patterns (workflows vs agents)](#3-agent-architecture-patterns-workflows-vs-agents)
  4. [Claude Code operational best practices](#4-claude-code-operational-best-practices)
  5. [Agent Skills: authoring and triggering](#5-agent-skills-authoring-and-triggering)
  6. [Multi-agent systems: when parallelism pays off](#6-multi-agent-systems-when-parallelism-pays-off)
  7. [Automated code review: evidence, severity, false positives](#7-automated-code-review-evidence-severity-false-positives)
  8. [How Anthropic's own teams use Claude Code](#8-how-anthropics-own-teams-use-claude-code)
  9. [Cross-lab: AGENTS.md, Codex, Cursor rules](#9-cross-lab-agentsmd-codex-cursor-rules)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Context is a finite, degrading resource: Anthropic states LLM performance degrades as the context window fills, so treat every token loaded as a cost, not a freebie ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Use progressive disclosure everywhere: system prompts, skills, and CLAUDE.md should carry only the minimal set of information that fully outlines expected behavior; load detail "just in time" via file paths, tool calls, or references ([Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
- Skills load in three tiers: name+description (always in context, ≤1,536 chars combined), full SKILL.md body (on trigger), and bundled reference files (loaded only when referenced) — keep SKILL.md under 500 lines and push detail into linked files ([Agent Skills docs](https://code.claude.com/docs/en/skills), [Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)).
- A CLAUDE.md/rule file that is too long causes Claude to ignore half of it — "bloated CLAUDE.md files cause Claude to ignore your actual instructions"; prune ruthlessly and ask "would removing this line cause a mistake?" for every line ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Tool responses should default to concise, semantically meaningful output; Claude Code's own tool-result cap is 25,000 tokens, and Anthropic's own example showed a 206-token response reduced to 72 tokens (about ⅓) by trimming low-level identifiers ([Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)).
- Fewer, more consolidated tools beat many thin wrappers: build "a few thoughtful tools targeting specific high-impact workflows" instead of one tool per API endpoint ([Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)).
- Multi-agent orchestration burns tokens: a multi-agent system used ~15× the tokens of a single chat interaction, and token usage alone explained 80% of performance variance — only use it where parallel exploration truly pays off ([Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)).
- Anthropic explicitly says most coding tasks are a **poor fit** for multi-agent fan-out because they have fewer genuinely parallelizable parts and more cross-file interdependencies than open-ended research ([Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)).
- Verification loops are what let an agent run unattended: "give it something that produces a pass or fail... and the loop closes on its own" — tests, build exit codes, linters, or screenshot diffs, escalating from an in-prompt check to a Stop hook that gates ending the turn ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Claude Code's own Stop hook has a hard governor: it overrides the hook and force-ends the turn after **8 consecutive blocks**, so a verification loop cannot spin forever ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Explore → Plan → Implement → Commit is the recommended default workflow; skip planning only when "you could describe the diff in one sentence" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Automated PR review runs multiple specialized agents in parallel, then a **separate verification step checks each candidate finding against actual code behavior before it is ever shown** — this adversarial self-check is what suppresses false positives, not prompt wording alone ([Claude Code: Code Review](https://code.claude.com/docs/en/code-review)).
- Review severity is a three-tier scheme (🔴 Important / 🟡 Nit / 🟣 Pre-existing) with an explicit definition: Important = "a bug that should be fixed before merging," calibrated toward production code by default and repo-tunable via a dedicated `REVIEW.md` ([Claude Code: Code Review](https://code.claude.com/docs/en/code-review)).
- A review-only instruction file (`REVIEW.md`) is injected as the **highest-priority** instruction block, distinct from `CLAUDE.md` (which is read as project context and produces only nit-level findings) — separate "what the agent knows" from "what the reviewer enforces" ([Claude Code: Code Review](https://code.claude.com/docs/en/code-review)).
- A verification bar can be written directly into review instructions: "behavior claims need a `file:line` citation in the source, not an inference from naming" is Anthropic's own example of an evidence requirement ([Claude Code: Code Review](https://code.claude.com/docs/en/code-review)).
- Subagents exist primarily to protect the *main* context window: delegate investigation/research to a subagent so file reads don't pollute the primary conversation, and use a **fresh-context subagent for review** so the reviewer isn't biased toward code it just wrote ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- Anthropic's own internal engineering teams report incident resolution "3x as quickly" when Claude is fed stack traces directly, and shifted from a "design doc → janky code → refactor → give up on tests" cycle to TDD as their default pattern once agents were in the loop ([How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code)).
- Cross-lab convergence: OpenAI's AGENTS.md, Cursor's `.cursor/rules`, and Claude's skills/CLAUDE.md all independently arrived at (a) nearest-file-wins hierarchy for nested config, (b) hard byte/line size caps that trigger a split rather than a bigger file, and (c) a strict separation between "context for humans" (README) and "context for agents" (AGENTS.md/SKILL.md) ([agents.md](https://agents.md/), [OpenAI Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Cursor rules](https://cursor.com/docs/context/rules)).

## Findings

### 1. Context engineering: the core resource to manage

Anthropic's September 2025 post reframes prompt engineering as **context engineering**: the discipline of curating what occupies the finite context window on every turn, because "context window" performance is not flat — it degrades as it fills, both from long-context degradation and from irrelevant/contradictory information crowding out what matters ([Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).

Concrete techniques, in the order the article recommends reaching for them:

1. **Prompt/system-prompt structure** — organize into distinct sections (`<background_information>`, `<instructions>`, `## Tool guidance`) using XML tags or Markdown headers, and aim for "the minimal set of information that fully outlines your expected behavior." Avoid both extremes: brittle hardcoded if/else prompts, and prompts so general they assume shared context the model doesn't have.
2. **Examples over exhaustive rules** — curate a small set of diverse, canonical examples rather than "a laundry list of edge cases"; examples do more behavioral work per token than prose rules.
3. **Progressive disclosure** — give the agent lightweight identifiers (file paths, stored queries, links) and let it load detail "just in time" via tool calls, rather than front-loading everything.
4. **Compaction** — when a session must continue past its practical context limit, first maximize *recall* (capture everything relevant), then iterate to improve *precision* (cut the superfluous). "Tool result clearing" — dropping the body of old tool outputs while keeping the fact that the call happened — is called out as "one of the safest lightest touch forms of compaction."
5. **Note-taking / external memory** — have the agent write persistent notes outside the context window (a scratch file, a todo list) so state survives compaction without occupying live tokens.
6. **Sub-agent architectures** — reserved for tasks whose scope legitimately exceeds one context window: heavy parallel exploration where multiple independent context windows are cheaper than one enormous one.

No specific numeric token budget is given in this post — Anthropic deliberately avoids a magic number ("use under 5,000 tokens") because the right budget is task- and model-dependent. Where Anthropic does publish hard numbers is in the *product surfaces* built on this philosophy — see §5 for the 500-line/1,536-char skill limits and §2 for the 25,000-token tool-result cap.

### 2. Writing tools for agents

Anthropic's tool-design post treats a tool definition with the same rigor as a prompt, because for an agent the tool signature *is* the interface to the world ([Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)).

**Naming and namespacing.** Prefix- or suffix-namespace tools by service/resource (`asana_search`, `jira_search`) so an agent with many integrations can disambiguate. Use unambiguous parameter names — `user_id`, not `user`.

**Consolidate, don't enumerate.** "More tools don't guarantee better outcomes." Prefer "a few thoughtful tools targeting specific high-impact workflows" over one tool per REST endpoint. Anthropic's example: implement `schedule_event` as a single tool rather than exposing `list_users`, `list_events`, and `create_event` separately and making the agent orchestrate three calls plus the reasoning to glue them together.

**Response shape.** Return human-meaningful fields, not low-level plumbing:

```text
Bad (206 tokens):  { "uuid": "8f14e...", "256px_image_url": "...", "mime_type": "image/png", ... }
Good (72 tokens):  { "name": "Q3 roadmap.png", "file_type": "image", "shared_with": ["alice"] }
```

Support a `ResponseFormat` enum so the agent can request verbosity only when it needs technical identifiers for a downstream call:

```
enum ResponseFormat {
   DETAILED = "detailed",
   CONCISE = "concise"
}
```

Claude Code itself enforces a **25,000-token default cap** on tool responses; tools must implement pagination, filtering, or truncation with sensible defaults rather than dumping arbitrarily large payloads.

**Errors are prompts, not stack traces.** "Provide specific and actionable improvements, rather than opaque error codes or tracebacks." An error message should steer the agent toward a token-efficient retry, not just report failure.

**Evaluate like a product, not a unit test.** Weak eval tasks are single straightforward calls; strong eval tasks require realistic multi-call workflows, sometimes dozens of calls, so tool-chaining behavior gets exercised. Track total runtime, tool-call count, token consumption, and tool-error rate — and use exact-match or LLM-judge verification loosely enough to avoid penalizing valid rephrasings.

**The payoff is real.** Anthropic attributes part of Claude Sonnet 3.5's SWE-bench Verified state-of-the-art result to "precise refinements to tool descriptions, dramatically reducing error rates" — tool wording is not cosmetic.

### 3. Agent architecture patterns (workflows vs agents)

Anthropic's December 2024 "Building Effective Agents" post is the canonical reference for choosing an architecture, and its central instruction is anti-complexity: *"Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short"* ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)).

It draws a hard line between **workflows** (LLMs and tools orchestrated through predefined code paths — predictable, auditable) and **agents** (the LLM dynamically directs its own tool use and process — flexible, but error-compounding). Five named workflow patterns, each with a specific fit criterion:

| Pattern | Use when | Example |
|---|---|---|
| Prompt chaining | Task decomposes cleanly into fixed sequential steps | outline → check → full document |
| Routing | Distinct input categories are better handled by separate specialized paths | refund vs. technical-support triage |
| Parallelization (sectioning/voting) | Subtasks are independent, or multiple perspectives improve confidence | parallel code-review evaluators, guardrails |
| Orchestrator-workers | Subtasks are dynamic/unpredictable in number and shape | multi-file coding changes |
| Evaluator-optimizer | Clear evaluation criteria exist and iteration measurably improves output | translation refinement loops |

Full autonomous "agent" mode is reserved for genuinely open-ended problems where the step count can't be predicted in advance — and it demands extensive sandboxed testing plus guardrails, because errors compound over a long autonomous run.

**Agent-computer interface (ACI) principles** apply directly to tool/CLI design: give the model "enough tokens to think before it writes itself into a corner," keep formats close to what naturally occurs in training text (avoid demanding the model count characters or escape strings), and use "poka-yoke" (mistake-proofing) design — e.g. require absolute file paths instead of relative ones so a wrong-directory error can't silently happen.

### 4. Claude Code operational best practices

The current (redirected-to) canonical doc is [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices), which supersedes the older `anthropic.com/engineering/claude-code-best-practices` URL (308 permanent redirect — the content moved, not a separate/older post).

**Verification is the difference between watched and unattended work.** *"Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available... Give Claude something that produces a pass or fail, and the loop closes on its own."* Three escalating tiers, from lightest to strongest guarantee:

1. In-prompt: ask Claude to run the check and iterate in the same message.
2. `/goal` condition: a separate evaluator re-checks after every turn across a whole session.
3. Stop hook: a deterministic script blocks the turn from ending until the check passes — **Claude Code force-overrides this after 8 consecutive blocks**, so a broken check can't hang a session forever.

Root-cause framing belongs in the prompt itself: *"the build fails with this error: [paste error]. fix it and verify the build succeeds. address the root cause, don't suppress the error."*

**Explore → Plan → Implement → Commit.** Enter plan mode (`Shift+Tab` until `⏸ plan mode on`, or `claude --permission-mode plan`) for anything you're uncertain about, touching multiple files, or unfamiliar with. Skip planning for a change you "could describe... in one sentence" — a typo fix or a log line doesn't need a plan phase.

**CLAUDE.md discipline** — this is the single most load-bearing table in the doc for an AI-config authoring effort:

| ✅ Include | ❌ Exclude |
|---|---|
| Bash commands Claude can't guess | Anything Claude can figure out by reading code |
| Code style rules that differ from defaults | Standard language conventions Claude already knows |
| Testing instructions and preferred test runners | Detailed API documentation (link instead) |
| Repository etiquette (branch naming, PR conventions) | Information that changes frequently |
| Architectural decisions specific to your project | Long explanations or tutorials |
| Developer environment quirks (required env vars) | File-by-file descriptions of the codebase |
| Common gotchas or non-obvious behaviors | Self-evident practices like "write clean code" |

Litmus test for every line: *"Would removing this cause Claude to make mistakes?"* If not, cut it. *"Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"* — this is a direct, first-party statement that instruction-following degrades with document bloat, not just token cost. Domain knowledge that's only sometimes relevant belongs in a **skill**, loaded on demand, not CLAUDE.md, loaded every session.

**Subagents protect the main context window.** *"Since context is your fundamental constraint, subagents are one of the most powerful tools available."* Delegate investigation ("use subagents to investigate how our auth system handles token refresh") so the file reads don't pollute the primary conversation; the subagent reports back a summary only.

**Adversarial review as a distinct discipline.** *"A reviewer prompted to find gaps will usually report some, even when the work is sound, because that is what it was asked to do. Chasing every finding leads to over-engineering."* The fix is scoping the reviewer explicitly to correctness/requirements, not style: *"Report gaps, not style preferences."* This is Anthropic's own explicit warning against reviewer-induced over-engineering — directly relevant to writing a review skill that must find real bugs, not manufacture defensive code.

**Named failure patterns and fixes** (verbatim from the doc, worth preserving as-is because each is a diagnosable symptom):

- *The kitchen sink session* → unrelated tasks pile into one context → `/clear` between tasks.
- *Correcting over and over* → two failed corrections on the same issue means the context is polluted with failed approaches → `/clear` and write a better initial prompt.
- *The over-specified CLAUDE.md* → too long, so Claude ignores half of it → prune ruthlessly; convert repeatable rules to hooks instead.
- *The trust-then-verify gap* → plausible code that silently mishandles edge cases → always provide a verification artifact; "if you can't verify it, don't ship it."
- *The infinite exploration* → an unscoped "investigate X" reads hundreds of files → scope investigations narrowly or push them into a subagent.

### 5. Agent Skills: authoring and triggering

Two complementary sources: the engineering-blog framing ([Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), Oct 16 2025) and the full product reference ([code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)).

**Three-tier progressive disclosure is the whole design:**

1. **Metadata (always loaded):** `name` + `description` (+ optional `when_to_use`) are pre-loaded into the system prompt for every installed skill so Claude can decide relevance without paying for the body. Combined `description` + `when_to_use` text is **hard-truncated at 1,536 characters** in the skill listing — put the key trigger phrase first.
2. **Body (loaded on trigger):** the full SKILL.md content loads only if Claude judges the skill relevant, and then **persists in context for the rest of the session** — it is not re-read each turn, so instructions must read as standing rules, not one-time steps.
3. **Bundled files (loaded on demand):** reference docs, scripts, templates referenced *by name* from SKILL.md, fetched only when actually needed.

**Hard size guidance:** *"Keep SKILL.md under 500 lines. Move detailed reference material to separate files."* Once a skill loads, every line is a **recurring token cost across the whole session** — the doc explicitly tells authors to apply the same conciseness test used for CLAUDE.md, and to "state what to do rather than narrating how or why."

**Description quality gates triggering.** *"Pay special attention to the `name` and `description` of your skill. Claude will use these when deciding whether to trigger the skill."* Development loop: identify gaps by running representative tasks, iterate collaboratively (ask Claude to capture its own successful approach back into the skill), and monitor for "unexpected trajectories or overreliance."

**Skills are the anti-bloat mechanism CLAUDE.md needs.** *"When you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact"* — that's the signal to extract a skill. This maps directly onto the review-skill and lint-skill config this research feeds: a procedural checklist ("how to review a Rust `unsafe` block") is a skill; a fact ("we use edition 2024") is CLAUDE.md.

**`allowed-tools` / `disallowed-tools` are turn-scoped, not permanent** — a skill grant clears on the next user message, so a skill cannot silently escalate privileges across an entire session; re-invocation re-applies it. This matters for autonomous review/fix skills that should not accumulate standing write access.

**Auto-compaction budget for skills is explicit and numeric:** re-attached skills after compaction keep the first **5,000 tokens** of each, and re-attached skills share a combined **25,000-token budget**, filled starting from most-recently-invoked — older invoked skills can be silently dropped entirely. A large skill invoked early in a long session is not guaranteed to survive compaction.

### 6. Multi-agent systems: when parallelism pays off

Anthropic's own multi-agent research system post is the most numerically concrete source in this research area ([How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), June 2025).

**Cost is real and measured:** the multi-agent system uses **~15× the tokens** of a single chat interaction; individual subagents alone use ~4× a chat baseline; **token usage explains 80% of the variance** in evaluated performance. This is a first-party admission that parallelism is expensive, not free, and should be weighed against that cost every time.

**Explicit fit criteria** — good fit: tasks with heavy legitimate parallelism, information that exceeds one context window, complex external tool interfacing. Poor fit, quoted directly: *"most coding tasks (fewer parallelizable elements)"* and any domain requiring all agents to share a single mutable context. This is a direct first-party caveat against reflexively fanning a coding task out to N parallel subagents — most coding work has cross-file dependencies that make isolated parallel workers duplicate or conflict.

**Delegation must be explicit or agents duplicate work.** *"Without detailed task descriptions, agents duplicate work, leave gaps, or fail"* — a vague delegation like "research the semiconductor shortage" caused redundant subagent work in testing. Effort should scale explicitly with task complexity: simple queries get 1 agent with 3–10 tool calls; complex work gets 10+ subagents with clearly divided responsibilities stated up front.

**Observed failure modes worth designing against:** spawning 50+ subagents for a simple query, subagents duplicating identical searches, endless searching for sources that don't exist, and subagents unable to self-judge appropriate effort. All of these are *coordination* failures, not model-capability failures — they are fixed by tighter delegation prompts, not bigger models.

**Evaluation methodology:** start with ~20 representative test cases before building a large eval set — Anthropic reports this alone surfaced a 30%→80% success-rate jump. LLM-as-judge with a single rubric (factual accuracy, citation accuracy, completeness, source quality, tool efficiency) tracked closest to human judgment, but human spot-checking still caught failures automation missed (e.g. picking SEO content farms over authoritative sources) — automated eval alone is not sufficient.

### 7. Automated code review: evidence, severity, false positives

This is Anthropic's fullest first-party statement on building a review pipeline that finds real bugs, and it is the most directly transferable section for a Rust review skill/agent config ([Claude Code: Code Review](https://code.claude.com/docs/en/code-review)).

**The pipeline's own anti-false-positive mechanism is a second, independent verification pass, not better prompting of the first pass:** *"multiple agents analyze the diff and surrounding code in parallel... Each agent looks for a different class of issue, then a verification step checks candidates against actual code behavior to filter out false positives. The results are deduplicated, ranked by severity."* Design point: a single-pass "find bugs" prompt is structurally weaker than a two-pass find-then-verify pipeline, because the verifier has no incentive to defend the finder's guesses.

**Severity is a fixed three-level taxonomy, defined in one sentence each:**

| Marker | Severity | Definition (verbatim) |
|---|---|---|
| 🔴 | Important | "A bug that should be fixed before merging" |
| 🟡 | Nit | "A minor issue, worth fixing but not blocking" |
| 🟣 | Pre-existing | "A bug that exists in the codebase but was not introduced by this PR" |

Default scope is explicitly narrow: *"Code Review focuses on correctness: bugs that would break production, not formatting preferences or missing test coverage."* Style nits are not the target class by default — they are demoted to 🟡 and capped.

**A dedicated review-instructions file outranks general project instructions.** `CLAUDE.md` is read as background project context and any violation it flags is capped at nit severity. `REVIEW.md`, by contrast, is *"injected directly into every agent in the review pipeline as highest priority"* and is **not** subject to `@import` expansion — everything must be inlined, verbatim. The practical pattern this implies for an AI-config repo: keep general Rust conventions in CLAUDE.md, and put reviewer-specific severity calibration, skip-lists, and evidence bars in a separate, shorter, higher-priority file.

**Anthropic's own worked example of `REVIEW.md`** is directly reusable as a template shape:

```markdown
## What Important means here
Reserve Important for findings that would break behavior, leak data,
or block a rollback: incorrect logic, unscoped database queries, PII
in logs or error messages, and migrations that aren't backward
compatible. Style, naming, and refactoring suggestions are Nit at most.

## Cap the nits
Report at most five Nits per review. If you found more, say "plus N
similar items" in the summary instead of posting them inline.

## Do not report
- Anything CI already enforces: lint, formatting, type errors
- Generated files under `src/gen/` and any `*.lock` file

## Always check
- New API routes have an integration test
- Database queries are scoped to the caller's tenant
```

**Explicit evidence requirement, quoted directly:** *"behavior claims need a `file:line` citation in the source, not an inference from naming."* This is the exact adversarial-verification bar this research effort's REVIEW.md should encode for Rust: a review finding that says "this probably panics" without a cited call site and cited input is not a finding.

**Convergence rule to prevent review-loop churn:** *"after the first review, suppress new nits and post Important findings only"* on re-review — otherwise a one-line fix can cycle through review rounds indefinitely on style alone.

**Effort/confidence tradeoff is explicit and tunable:** at `low`/`medium` effort the reviewer reports only its most-confident findings (fewer false positives); `high` through `max` broaden coverage and *may include findings it's less sure about* — i.e. recall and precision are explicitly traded off by a single dial, and the default should favor precision for an unattended/no-human-in-the-loop pipeline.

**Output contract is structured, not prose.** Findings carry: severity marker, file:line, one-sentence summary, and (in host apps that request it) route through a typed `ReportFindings` tool rather than free text, enabling downstream tooling (fixed/skipped/no-change-needed tracking on re-review).

### 8. How Anthropic's own teams use Claude Code

From Anthropic's internal-usage post ([How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code), July 2025):

- **Security Engineering** shifted their entire default workflow from *"design doc → janky code → refactor → give up on tests"* to test-driven development once Claude was writing the pseudocode and iterating under human-guided checkpoints — a direct first-party endorsement of TDD as the agentic default, not merely a nice-to-have.
- Production incidents are resolved **"3x as quickly"** when the team feeds Claude stack traces and docs directly and lets it trace control flow, rather than a human doing that trace manually first.
- The **Inference team** — working in a language they're less fluent in (their example: Rust) — explains desired functionality in plain language and lets Claude write the implementation in the target language's idiom. This is a first-party example of using an agent as the *fluency bridge* into an unfamiliar systems language, directly relevant to grim/ocx being Rust.
- CLAUDE.md is explicitly used for onboarding: new data scientists feed the whole codebase plus CLAUDE.md pipeline-dependency notes to ramp up without a human pairing session.

### 9. Cross-lab: AGENTS.md, Codex, Cursor rules

**AGENTS.md (open, cross-lab spec).** Framed explicitly as *"a README for agents"* — README stays for humans (quick starts, contribution guidelines); AGENTS.md carries what would "clutter" a README: build steps, tests, conventions ([agents.md](https://agents.md/)). Precedence rule, stated plainly: *"The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything."* For monorepos: *"Place another AGENTS.md inside each package. Agents automatically read the nearest file in the directory tree."* Format is deliberately unconstrained Markdown with no required fields — this is the opposite design choice from Claude's structured YAML-frontmatter skills, and matters for a tool (grim) that must target multiple client formats.

**OpenAI Codex.** Codex's own AGENTS.md handling adds two concrete, numeric details not present in the open spec or Claude's docs:
- **Hard size cap of 32 KiB** (`project_doc_max_bytes` in `~/.codex/config.toml`) on the *combined* instruction file after merging the directory hierarchy; Codex "skips empty files and stops adding files once the combined size reaches the limit" ([OpenAI Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)).
- **Override files**: `AGENTS.override.md` is checked *before* `AGENTS.md` at both global (`~/.codex`) and project scope, giving a clean way to layer a strict machine-enforced override on top of team-authored guidance without editing the team file — directly analogous to Claude's `REVIEW.md` outranking `CLAUDE.md` in §7.
- Files merge **root-down, with closer files overriding earlier guidance** — same nearest-wins model as AGENTS.md and Cursor.

**Cursor `.cursor/rules`.** Rules are `.mdc` files (not plain `.md`) with three frontmatter controls that determine *when* a rule attaches, not just what it says: `alwaysApply: true` (always in context), `globs` (auto-attached when matching files are open — e.g. `src/components/**/*.tsx`), or `description`-only (pulled in by agent judgment, same trigger-by-description model as Claude skills). *"Keep rules under 500 lines. Split large rules into multiple, composable rules."* — this is the exact same 500-line ceiling Anthropic sets for SKILL.md, arrived at independently by a different vendor, which is a meaningful convergence signal for setting a size norm in this project's own rule files ([Cursor rules](https://cursor.com/docs/context/rules)).

**Convergent pattern across all three vendors:** nearest/closest-file-wins hierarchy, a hard size ceiling that forces a split rather than unbounded growth, and a strict split between docs for humans and docs for agents. Any rule/skill authoring guidance this research feeds into should adopt all three as vendor-agnostic defaults.

## Normative guidance candidates

1. **Cap every SKILL.md / rule file body at 500 lines; split into linked reference files past that.** Rationale: Anthropic (SKILL.md) and Cursor (`.cursor/rules`) independently converge on this exact ceiling, and both say persistence in context makes every line a recurring cost, not a one-time read. Verify: `wc -l` on the file's body (excluding linked reference files) in CI; fail the build past 500.

2. **Front-load the skill/rule `description` with the concrete trigger condition, not a category label.** Rationale: the combined description+when_to_use is hard-truncated at 1,536 characters in the listing Claude uses to decide relevance — a vague first sentence wastes the highest-value characters. Verify: reading heuristic — does the first sentence name a concrete situation ("Use when reviewing an `unsafe` block or a `Drop` impl") rather than a topic ("Rust safety guidance")?

3. **Never let a review/lint rule file exceed what fits as "highest priority" injected context — keep REVIEW-equivalent files short and skip general project background.** Rationale: Anthropic's own REVIEW.md is explicitly separate from CLAUDE.md so it can be injected as highest-priority without dilution; a long REVIEW.md "dilutes the rules that matter most" per Anthropic's own callout. Verify: grep the review-config file for CLAUDE.md-style project background (build commands, architecture prose) — anything not about *what to flag and how* should move out.

4. **Require a `file:line` citation for every correctness/behavior claim a review agent makes; reject unsupported claims before they're reported.** Rationale: this is Anthropic's own stated evidence bar for suppressing false positives ("not an inference from naming"). Verify: a reviewer output schema that makes `file` and `line` required fields (as Claude Code's own `ReportFindings` tool does), and a lint/parse step that rejects findings missing them.

5. **Run review as two independent passes — a finder and a verifier that re-checks candidates against actual code behavior — never a single find-and-report pass.** Rationale: this is the concrete mechanism Anthropic's Code Review pipeline uses to filter false positives; a single pass has no adversarial check on its own guesses. Verify: reading heuristic on the review skill/agent design — does a distinct step or distinct agent re-examine each candidate finding against the source before it is surfaced?

6. **Define "must-fix" severity in one falsifiable sentence per project, and cap low-severity output volume explicitly (e.g. "at most 5 nits, then a count").** Rationale: Anthropic's default Important/Nit/Pre-existing taxonomy is deliberately narrow ("bugs that would break production, not formatting preferences") and repo-tunable precisely so teams don't drown signal in style noise. Verify: the review config states an explicit Important definition and an explicit nit cap; grep for both.

7. **Prefer TDD / write-the-check-first when handing an agent a non-trivial Rust change, and always give it a runnable pass/fail signal (test, `cargo build`, `cargo clippy -- -D warnings`) rather than asking it to self-assess "done."** Rationale: "Claude stops when the work looks done... give it something that produces a pass or fail" is Anthropic's stated mechanism for unattended correctness, and Anthropic's own Security Engineering team made this exact TDD shift once agents entered the loop. Verify: does the task/PR include a test or lint command the agent ran and can show output from, distinct from prose claiming success?

8. **Gate any long/unattended agent run behind a hard stop condition (a hook, a bounded retry count, an explicit fixed budget) rather than open-ended "keep trying."** Rationale: Claude Code's own Stop hook force-overrides after 8 consecutive blocks specifically to prevent an unbounded loop; unattended agentic work needs the same design. Verify: does any autonomous/long-running agent config in this repo specify a maximum iteration/retry count?

9. **Do not fan a single Rust coding task out across parallel subagents by default; reserve multi-agent parallelism for genuinely independent, non-overlapping investigation (e.g. researching N unrelated crates) and expect ~4–15× the token cost when you do.** Rationale: Anthropic's own multi-agent post states most coding tasks are a poor fit for this pattern due to cross-file interdependency, and gives the measured cost multiplier. Verify: for any multi-agent workflow definition, check whether the subtasks it fans out are file-disjoint / genuinely independent — if they touch the same files or types, collapse to one agent.

10. **Put facts (build commands, conventions that don't change) in CLAUDE.md/AGENTS.md; put procedures (multi-step workflows, checklists) in a skill; put reviewer-only severity/skip rules in a separate highest-priority review file.** Rationale: this three-way split is Anthropic's own stated criterion (CLAUDE.md is "a fact," a skill is "a procedure," REVIEW.md is reviewer-only override) and is echoed by Codex's `AGENTS.override.md` mechanism. Verify: reading heuristic per line in any rule file — is this a static fact, a multi-step procedure, or a review-time-only override? Misplaced content should move.

11. **Every non-trivial tool a Rust-agent config exposes (build wrapper, publish script, etc.) should return concise, human-meaningful output and implement pagination/truncation, not raw stdout dumps.** Rationale: Anthropic's own measured example shows a ~3× token reduction from trimming a tool response to only meaningful fields, and Claude Code enforces a 25,000-token cap on tool results regardless. Verify: does the tool/script strip low-level identifiers (raw hashes, full paths when a relative name would do) from its default output, and does it support a concise/verbose toggle?

12. **State CLAUDE.md/AGENTS.md size discipline as a per-line test, not a length target: "would removing this line cause a mistake?"** Rationale: Anthropic states directly that an over-long CLAUDE.md causes instructions to be *ignored*, not just costs tokens — this is a compliance failure mode, not merely an efficiency one. Verify: for each bullet in the project's CLAUDE.md/AGENTS.md, can a reviewer point to a concrete mistake the agent would make if that line were deleted? If not, cut it.

## AI-agent angle

What an LLM coding agent characteristically gets wrong when applying *this* subarea's guidance, and the smallest mechanical check that catches it:

- **Treats CLAUDE.md/AGENTS.md as a dumping ground for everything it learns, growing it unboundedly across a session.** Symptom: a rule file that accretes "note: also handle X" lines from every past correction. Check: periodic line-count diff on the rule file across commits; a monotonically growing file with no corresponding deletions is a red flag — Anthropic's own guidance is that this actively degrades instruction-following, not just wastes tokens.
- **Writes a review/lint skill that reports style nits as blocking findings**, because "find issues" without an explicit severity contract defaults to reporting everything it notices. Check: does the skill's system prompt define what counts as blocking in one sentence, with a nit cap, per Anthropic's own REVIEW.md pattern? If the skill has no severity taxonomy at all, it will over-flag.
- **Fabricates a `file:line` citation or asserts "this could panic" from a function name alone**, without having actually traced the call site — this compiles-and-sounds-plausible failure mode is exactly what Anthropic's verification-step pipeline exists to catch. Check: for any finding claiming a behavior, does the cited line actually contain the claimed code when re-read? A trivial grep-and-confirm catches most of these.
- **Fans a routine multi-file Rust refactor out to N parallel subagents "for speed,"** because parallelism sounds efficient, ignoring that Rust's borrow/trait-coherence rules make cross-file edits genuinely interdependent (a rename in one file breaks compilation everywhere else). Check: before parallelizing, verify the file sets touched by each proposed subtask are actually disjoint — if not, the task is single-agent, sequential, by construction.
- **Builds a tool wrapper (e.g. around `cargo` or the OCI push/pull path) that echoes raw command output instead of a concise structured result**, because that's the path of least resistance when wrapping a CLI. Check: run the tool once and count tokens in a representative response; if it exceeds a few hundred tokens for a routine call, it needs a concise mode.
- **Writes an unattended/long-running agent loop with no hard iteration cap**, assuming the model will "know when to stop." Check: grep any agent-loop or hook config in the repo for an explicit max-retry or max-iteration bound; absence of one is the bug, per Anthropic's own 8-block Stop-hook override existing specifically to prevent this.
- **Treats `/code-review`-style output as prose to summarize rather than a structured findings list**, losing the fixed/skipped/no-change-needed tracking Anthropic's own tooling relies on for convergence. Check: does the review output map cleanly onto (file, line, severity, summary) fields that a later pass can diff against, rather than freeform markdown a human must re-parse?

## Contested / evolving

- **Multi-agent fan-out for coding tasks is trending *toward* more use, not less, despite Anthropic's June 2025 caution.** The same Claude Code product now ships file-disjoint parallel work-package execution (worktree-based parallel implementation, as used by orchestration skills like this project's own hex-execute) as a supported pattern — the June 2025 research-system post predates that product capability. The resolution in practice: parallelism is fine when subtasks are provably file-disjoint (enforced structurally, e.g. by git worktree boundaries), which is a narrower and more mechanically checkable condition than the original post's "most coding tasks are a poor fit" caveat suggests. Treat file-disjointness as the actual gate, not "is this a coding task."
- **Whether review severity should ever *block* a merge is unresolved and vendor-specific.** Anthropic's hosted Code Review explicitly never gates GitHub branch protection — "The check run always completes with a neutral conclusion so it never blocks merging" — leaving the gating decision to the consuming CI. Other tooling (and this project's own goal of a no-human-in-the-loop agent) may want a hard gate on Important findings. This is a deliberate product choice by Anthropic to preserve existing review workflows, not a claim that blocking is wrong — teams building autonomous pipelines are actively diverging from Anthropic's default here.
- **Compaction/note-taking numeric budgets (5,000 tokens per skill, 25,000-token shared budget) are Claude-Code-specific product parameters, not general agentic-coding law**, and are the kind of number likely to change across Claude Code releases — the September 2025 context-engineering post itself declines to give general numeric budgets for exactly this reason. Treat these as illustrative of the *scale* of the problem, not as portable constants for a non-Claude-Code agent.
- **`REVIEW.md`-style reviewer-priority override files are new (introduced with Claude Code's hosted Code Review) and not yet mirrored 1:1 by Codex or Cursor** — Codex's closest analog (`AGENTS.override.md`) overrides general agent instructions, not review-specifically, and Cursor has no review-specific override tier documented. This is a genuine cross-lab design gap right now; expect convergence but don't assume it exists yet outside Claude Code.
- **Whether AGENTS.md's unconstrained-Markdown, no-required-fields design or Claude's structured YAML-frontmatter design is "correct" is an open, deliberate disagreement between vendors**, not an oversight on either side — AGENTS.md optimizes for cross-tool portability at the cost of machine-checkable structure; Claude Skills optimizes for fine-grained, per-skill behavioral control (invocation gating, tool scoping, effort override) at the cost of being Claude-Code-specific. A project (like grim) that targets multiple clients has to choose per-artifact which tradeoff it needs, not assume one design is simply more advanced than the other.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Anthropic engineering blog post | Sep 29, 2025 | Primary source reframing prompt engineering as context engineering; defines progressive disclosure and compaction technique |
| [anthropic.com/engineering/writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Anthropic engineering blog post | Sep 11, 2025 | Primary source on tool design; concrete token-savings example and 25k-token response cap |
| [anthropic.com/engineering/building-effective-agents](https://www.anthropic.com/engineering/building-effective-agents) | Anthropic engineering blog post | Dec 19, 2024 | Primary, foundational source on workflow-vs-agent architecture patterns and ACI design |
| [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) | Claude Code product docs (successor to the older `claude-code-best-practices` engineering post, which now 308-redirects here) | continuously updated, fetched Aug 2026 | Primary, most operationally detailed source: verification loops, CLAUDE.md table, subagent usage, failure patterns |
| [anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) | Anthropic engineering blog post | Oct 16, 2025 | Primary source introducing Agent Skills' progressive-disclosure design rationale |
| [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | Claude Code product docs | continuously updated, fetched Aug 2026 | Primary, exhaustive skill-authoring reference: frontmatter fields, 500-line/1,536-char limits, compaction budget numbers |
| [anthropic.com/engineering/multi-agent-research-system](https://www.anthropic.com/engineering/multi-agent-research-system) | Anthropic engineering blog post | Jun 13, 2025 | Primary source with hard numbers on multi-agent token cost (15×) and explicit "poor fit for most coding tasks" caveat |
| [code.claude.com/docs/en/code-review](https://code.claude.com/docs/en/code-review) | Claude Code product docs | continuously updated, fetched Aug 2026 | Primary, most directly transferable source for this project's review-skill design: severity taxonomy, REVIEW.md, verification-pass mechanism, evidence bar |
| [claude.com/blog/how-anthropic-teams-use-claude-code](https://claude.com/blog/how-anthropic-teams-use-claude-code) (redirected from `anthropic.com/news/...`) | Anthropic blog, internal-usage case studies | Jul 24, 2025 | Primary first-party account of TDD adoption and incident-response speedup once agents were in the loop, including a Rust-fluency-bridge example |
| [agents.md](https://agents.md/) | Open cross-vendor spec site (backed by OpenAI, Google, and others) | fetched Aug 2026, spec actively maintained | Primary spec document for the AGENTS.md convention this project's own AGENTS.md-equivalents should be checked against |
| [learn.chatgpt.com/docs/agent-configuration/agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | OpenAI Codex product docs | fetched Aug 2026 | Primary cross-lab source; adds concrete numeric detail (32 KiB cap, override-file precedence) the open spec doesn't specify |
| [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules) | Cursor product docs | fetched Aug 2026 | Primary cross-lab source; independently converges on the same 500-line ceiling as Claude Skills, useful corroborating signal |

