---
title: code-docs topic map — agent-era practice
corpus: agent-era practice (vendor guidance and practitioner writing on code that agents write and read, 2024-2026)
agent: research-lang landscape scout (code-docs program)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 28
scope: |
  Covers what vendor docs (Anthropic, OpenAI/Codex, GitHub Copilot, Cursor,
  Google Gemini CLI, Aider) and named practitioners say about code comments,
  doc comments, decision records, naming, and context configuration once
  agents write and read most code. Does not cover user-facing documentation
  standards (docs-quality already owns those, referenced not duplicated),
  general prompt-engineering technique, or non-coding agent use cases.
  Excludes anything already logged in the program's "already covered" list
  (Arafat & Riehle 2009, arXiv 2605.13280/2607.01867/2408.14007/2609.09242,
  CodeCrash, Wen et al. 2019, DocChecker, Lore arXiv 2603.15566, the Embedded
  ADR convention, and prior Anthropic best-practices citations) except where
  this pass adds a number, quote, or contradiction those citations lack.
---

## Contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- Anthropic's own Claude Code system prompt dropped its explicit comment ban
  ("default to writing no comments... one short line max") for "write code
  that reads like the surrounding code: match its comment density, naming,
  and idiom" — a fixed rule replaced by ambient-style matching, with the
  vendor reporting no regression after cutting 80% of the prompt overall.
- Comments are not the only, or even the primary, register Anthropic recommends
  spending context on: CLAUDE.md guidance says "would removing this line cause
  Claude to make a mistake?" is the retention test, and the same test
  transplants cleanly onto a comment.
- Progressive disclosure — metadata now, full file when relevant, referenced
  files only when needed — is Anthropic's answer to "how much can a context
  artifact hold," and it is explicitly *not* a length cap: bundled skill
  context is "effectively unbounded" because agents fetch it on demand. This
  is a mechanism, not a hypothesis, for "pointer, not paraphrase."
- Coding agents navigate mostly by literal text search (`ripgrep`), not
  embeddings; Claude Code's own team tried a vector database and dropped it
  because plain-text search worked better. This makes proximity and naming,
  not indexing, the thing that gets a comment or its pointer found cold.
- Comment/doc-comment trust is asymmetric: incorrect documentation "greatly
  hinders" LLM code understanding while missing documentation has no
  significant effect (Macke & Doyle, NAACL 2024 Findings) — the same
  asymmetry the program's carried-forward evidence already cites for whole
  comments, now independently sourced for documentation specifically.
- Every major client now converges on the same shape for path-scoped rules —
  a glob-matched file that loads only for matching edits — under different
  names: Anthropic `paths:` frontmatter, Cursor `globs`, GitHub Copilot
  `applyTo`. None of the four specify how such a rule should defer to an
  inline comment on the same line.
- AGENTS.md is no longer one vendor's format: it is stewarded by the
  Agentic AI Foundation (a Linux Foundation project) and is read by Codex,
  Claude Code, Cursor, and Copilot; the precedence rule ("closest AGENTS.md
  wins, explicit chat prompt overrides everything") governs nested
  monorepo instructions the way the frame's index-plus-depth-files structure
  will need to.
- Every length guidance number found is a small integer of KB or lines, never
  a ratio: HumanLayer's CLAUDE.md target is under 60 lines (300 as a hard
  ceiling), Aider's CONVENTIONS.md guidance is under 200 lines, OpenAI's
  Codex AGENTS.md default cap is 32 KiB. None of these apply to comments
  directly, but they are the closest vendor-endorsed numeric anchors for
  "how long may a context artifact be before it degrades."
- Naming quality trades directly against comment need: three-word exported
  identifiers hit ~96% uniqueness in a measured codebase versus ~61% for
  one-word names, and a precise type signature "can often answer the agent's
  first questions without requiring it to read the implementation" —
  measured token reductions of 6-66% when names/types carried the load a
  comment otherwise would.
- Comments belong at the *definition* site more than the call site for an
  agent reader specifically because search results land on definitions:
  "the definition is the one spot you can count on it reading" (Modem).
  Deprecated code left uncommented "will be discovered and used" by an agent.
- Scientific-code practitioners are already inventing ad hoc conventions to
  mark code as agent-context versus human-reviewed — commit messages as
  lab-notebook entries the scientist alone writes, single growing scripts
  with unread "comments intended as context for future agents" — a live,
  if under-evidenced (four case studies, no baseline), signal that a formal
  split is coming from the field, not just this program.
- A new, more specific standard than the classic ADR exists for
  machine-authored decisions — the Agent Decision Record (AgDR): model,
  trigger, and timestamp fields, a JSON Schema, and a CI validator plus a
  changelog-lockstep check — directly answering the prior ocx research's
  "every ID a comment points at must resolve to a tracked file" gap with a
  built, if young (single-maintainer GitHub project), implementation.
- "Agentic fitness functions" formalize the LLM-judged review the prior ocx
  research rejected as too expensive, with a concrete calibration recipe:
  test the judge against 20-50 prior classified changes, require a verdict
  with score, confidence, evidence, and a "candidate rule for future
  deterministic enforcement," and escalate low-confidence outcomes to a
  human rather than average them away.
- Domain-Driven Design's Ubiquitous Language is being re-argued as more
  valuable, not less, once an agent is the one reading the vocabulary: one
  authoritative name per concept, explicit naming across Bounded Contexts,
  reduces the "why does this variable mean two things" comment before it is
  needed.
- The most extreme position in this corpus (Thorsten Ball) argues human code
  review is already effectively over — verification shifts from reading to
  testing outcomes — which, if true, changes a comment's primary audience
  from "the next human reviewer" to "the next agent that edits this
  function." No other vendor or practitioner source in this corpus goes
  that far; Anthropic's own docs still instruct users to add a fresh-context
  review step.
- Kent Beck's countervailing argument: current agents "just inhale"
  complexity instead of reducing it, and the fix he is trying is
  *information minimization* — telling the agent only what the next step
  needs, not the whole architecture — which cuts against any design that
  assumes an agent will always have the ADR/CLAUDE.md context loaded when it
  touches a line.
- LSP-based navigation (hover, go-to-definition) is maturing fast enough in
  2025-2026 tooling (LspRag, Claude Code LSP plugins, gopls "passive
  features") that doc comments reachable via hover are now a functionally
  different, more reliably-found surface than an inline `//` comment reached
  only by grep — a distinction the program's rendered-surfaces scope should
  treat as load-bearing, not cosmetic.
- No source in this corpus proposes a fixed comment:code ratio as the
  enforcement mechanism; every concrete number found is either a file-length
  cap, a naming/identifier metric, or a documentation-correctness accuracy
  delta — this is independent corroboration for H7 (a ratchet, not a fixed
  ratio gate) from an entirely different literature than the one already
  cited.

## Survey

### 1. Anthropic — Claude Code Best Practices ([code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices))

The current (2026) canonical guidance, redirected from the old
`anthropic.com/engineering/claude-code-best-practices` URL. Frames "context
window fills up fast, performance degrades as it fills" as the constraint
every other practice serves. For CLAUDE.md specifically, gives a two-column
✅/❌ table: include "bash commands Claude can't guess," "code style rules
that differ from defaults," "architectural decisions specific to your
project"; exclude "anything Claude can figure out by reading code," "detailed
API documentation (link to docs instead)," "self-evident practices like
'write clean code.'" The per-line retention test: *"For each line, ask:
would removing this cause Claude to make mistakes? If not, cut it."* Warns
explicitly that "bloated CLAUDE.md files cause Claude to ignore your actual
instructions" and that if Claude keeps missing a rule "the file is probably
too long and the rule is getting lost" — the same failure mode the prior ocx
research found for buried "why" content in essay-length blocks, now stated
as a general property of any always-loaded artifact, not just comments. Names
`/doctor` as a mechanism that "proposes cuts for content it can derive from
the codebase" on a checked-in CLAUDE.md. Recommends a fresh-context adversarial
review subagent before treating work as done, with an explicit warning that a
reviewer told to find gaps "will usually report some, even when the work is
sound" — over-fixing findings causes over-engineering.

### 2. Anthropic — Effective context engineering for AI agents ([anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))

States "context, therefore, must be treated as a finite resource with
diminishing marginal returns," and names "context rot": as tokens in the
window increase, recall accuracy decreases, from the n² pairwise attention
cost of transformer architecture, not a hard cliff. Recommends "just in time"
retrieval — keep lightweight identifiers (file paths, stored queries, links)
and load data at runtime via tools, rather than pre-loading — with Claude
Code's own `head`/`tail` Bash usage as the example. Does not address code
comments or documentation directly; its unit of analysis is system prompts,
tools, and message history. Sub-agent summaries are sized at "1,000-2,000
tokens" of distilled result.

### 3. Anthropic — Equipping agents for the real world with Agent Skills ([anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills))

Introduces progressive disclosure as three levels: skill name+description in
the system prompt at startup; full `SKILL.md` loaded once Claude decides it's
relevant; further bundled files (e.g. the PDF skill's `reference.md` and
`forms.md`) read only as needed. The explicit claim: "the amount of context
that can be bundled into a skill is effectively unbounded," because an agent
with filesystem tools does not need the whole bundle in its context window at
once. Guidance to keep the top file lean and move "mutually exclusive or
rarely-used" material into separate files.

### 4. Anthropic — Claude Code memory docs ([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory))

Documents two carriers across sessions: CLAUDE.md (and/or a repo's
`AGENTS.md`, read on their own or alongside CLAUDE.md) and auto memory (notes
Claude writes itself from corrections). Both are "context, not enforced
configuration" — to block an action regardless of model choice, use a
`PreToolUse` hook instead. Introduces `.claude/rules/*.md` with `paths:`
frontmatter to scope a rule to matching files only, keeping it out of context
for unrelated work — the same mechanism this program's own rule/depth-file
design depends on.

### 5. Claude — "Steering Claude Code" blog ([claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more))

Gives the decision criteria between mechanisms directly: CLAUDE.md holds
"build commands, directory layout, monorepo structure, coding conventions,
team norms"; a file-specific constraint like "migrations are append-only"
"fits best as a rule placed in your `paths:` frontmatter"; "instructions that
are procedural, like deploy workflows... belong in a skill rather than in
CLAUDE.md"; and "'every time X, always do Y' in CLAUDE.md" should become a
hook instead — "the model choosing to run a formatter is different from the
formatter running automatically." This is the clearest single statement in
the corpus of which artifact owns which kind of instruction, and the
code-docs rule set needs to sit correctly against all four categories, not
just "a rule."

### 6. Claude Code system prompt, before/after Opus 5 ([charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete))

A primary-source quote of an actual model system prompt on commenting,
before and after a 2026 revision (Claude Code v2.1.206+, article dated
2026-07-24, Opus 5 launch context July 2026). **Old**: *"In code: default to
writing no comments. Never write multi-paragraph docstrings or multi-line
comment blocks — one short line max."* **New**: *"Write code that reads like
the surrounding code: match its comment density, naming, and idiom."*
Anthropic's own framing (per the article) is that the old rule set existed
"to keep weaker models in line" and that on Opus 5 "they only get in the way"
— contradictory instructions ("leave documentation as appropriate" vs. "DO
NOT add comments") cost reasoning tokens resolving the conflict before the
model touched a file. Anthropic reports removing over 80% of the system
prompt with no measurable coding-eval regression. This is a **hard fact**
that directly informs H7: a fixed rule ("one line max") was tried, in
production, at the frontier lab that runs this program's own tooling, and
was replaced by a relative rule (ambient matching) rather than a stricter
absolute one.

### 7. AGENTS.md specification ([agents.md](https://agents.md/))

The open, cross-vendor spec: "a dedicated, predictable place to provide the
context and instructions to help AI coding agents work on your project,"
distinguished from README (human quick-start) by holding "the extra,
sometimes detailed context coding agents need." No required fields; popular
sections are project overview, build/test commands, code style, testing
instructions, security considerations, commit/PR conventions, deployment
steps. Precedence: "the closest AGENTS.md to the edited file wins; explicit
user chat prompts override everything" — enabling nested, monorepo-scoped
files. Originated from OpenAI Codex, Amp, Google Jules, Cursor, and Factory
converging on one format instead of five; now stewarded by the Agentic AI
Foundation under the Linux Foundation. Over 60,000 open-source projects use
it, read by Copilot, Cursor, VS Code, Devin, and others per the ecosystem
page.

### 8. OpenAI — Codex AGENTS.md guide ([learn.chatgpt.com/docs/agent-configuration/agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md))

Structures recommended content into three buckets: working agreements
(testing commands, dependency management), repository expectations (lint,
doc standards), and code review rules, phrased as "flag behavior + safe
path/exception" pairs. Gives a concrete numeric ceiling: a default
`project_doc_max_bytes` of **32 KiB**, user-raisable to 65 KiB+; Codex "skips
empty files and stops adding files once the combined size reaches the
limit." Merge order for nested files: global (`~/.codex/AGENTS.override.md`
→ `~/.codex/AGENTS.md`) then project root down to cwd, each level checked
for an override first. Recommends keeping review rules "concise," reserving
"formatting and lint checks for CI," and putting repo-wide rules at the root
with "service-specific checks in a nested file" — directly analogous to this
program's index-plus-depth-files design.

### 9. GitHub Copilot — custom instructions ([docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot))

Repository-wide instructions live at `.github/copilot-instructions.md`,
capped at "no longer than 2 pages." Path-specific instructions are
`NAME.instructions.md` files under `.github/instructions/`, each carrying an
`applyTo:` frontmatter glob (comma-separated for multiple patterns, e.g.
`"**/*.ts,**/*.tsx"`), with an `excludeAgent` key to opt specific tools out.
Precedence: personal > repository > organization instructions, but "all sets
of relevant instructions are provided" simultaneously rather than the lower
ones being dropped. Also documents that Copilot now reads `AGENTS.md` (or a
root `CLAUDE.md`/`GEMINI.md`) directly for agent behavior, layered alongside
its own instruction files.

### 10. GitHub changelog — Copilot code review path-scoped instructions ([github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support](https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/))

Shipped 2025-09-03: Copilot code review recognizes `*.instructions.md` files
with an `applyTo` section specifically for *review-time* guidance, separate
from chat-time custom instructions — "files without `applyTo` are ignored"
for review. A follow-up 2025-11-12 changelog entry (per search results, not
separately fetched) extended this to agent-specific and org-level
instructions. This is the first source in the corpus to split "write-time"
from "review-time" instruction scoping as a first-class distinction rather
than one file serving both.

### 11. Cursor — Project Rules ([cursor.com/docs/rules](https://cursor.com/docs/rules))

Three frontmatter fields — `description`, `globs`, `alwaysApply` — combine
into four modes: Always Apply, Apply Intelligently (description-driven,
agent decides relevance), Apply to Specific Files (glob-driven), Apply
Manually (`@`-mention only, neither field set). Also reads nested `AGENTS.md`
files per subdirectory, with child-level instructions overriding parent.
Concrete authoring guidance: **keep rules under 500 lines**, split oversized
rules into focused files, reference files rather than copying their content,
avoid "entire style guides (use linters instead)," avoid documenting common
commands "the agent already knows," and prioritize frequent patterns over
rare edge cases — closely paralleling the ocx critique's finding that a
DOC-05 regex trying to catch every essay variant is the wrong mechanism
compared to a length ratchet.

### 12. Google — Gemini CLI, GEMINI.md ([github.com/google-gemini/gemini-cli, docs/cli/gemini-md.md](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md))

Three-tier hierarchy: global (`~/.gemini/GEMINI.md`), workspace/environment
(searched up the directory tree from configured workspace roots), and
just-in-time (JIT) context files discovered "in that directory and its
ancestors" only when a tool touches a file there — files are concatenated
and sent with every prompt rather than loaded on demand the way Anthropic's
skills are. Recommended content list: product purpose, languages/frameworks,
important folders and architectural boundaries, coding/content/design-system
conventions, validation commands, actions requiring confirmation, and
off-limits files/systems.

### 13. Aider — CONVENTIONS.md ([aider.chat/docs/usage/conventions.html](https://aider.chat/docs/usage/conventions.html))

Loaded via `--read CONVENTIONS.md`, `/read CONVENTIONS.md` in-session, or a
persistent `read:` entry in `.aider.conf.yml` — marked read-only for prompt
caching. Community convention library at
[github.com/Aider-AI/conventions](https://github.com/Aider-AI/conventions).
Guidance (per secondary summary, not independently verified against Aider's
own source): keep the file **under 200 lines**, since "aider may deprioritize
rules at the bottom of the file as the conversation grows" beyond that.

### 14. HumanLayer — Writing a good CLAUDE.md ([humanlayer.dev/blog/writing-a-good-claude-md](https://www.humanlayer.dev/blog/writing-a-good-claude-md))

Frames CLAUDE.md as answering WHY (project purpose, component function),
WHAT (stack, structure, codebase map — "especially critical for monorepos"),
and HOW (package manager, verification, test/build steps). Numeric target:
**fewer than 300 lines**, ideally **under 60** (their own file's length).
Progressive disclosure applied practically: put task-specific detail in
separate files under e.g. `agent_docs/`, list them from CLAUDE.md with a
one-line description, and reference code by `file:line` rather than
snippets, "to avoid staleness" — the same staleness argument the prior ocx
research made against plan-ID pointers, now applied to code excerpts
generally. Explicit argument against outsourcing linting to the model:
"never send an LLM to do a linter's job" because it is "comparably expensive
and incredibly slow" versus a deterministic tool — a style rule belongs in a
hook or a real linter, not in prose the model has to re-derive every turn.

### 15. HumanLayer — 12-Factor Agents, Factor 3 ([github.com/humanlayer/12-factor-agents, factor-03](https://raw.githubusercontent.com/humanlayer/12-factor-agents/main/content/factor-03-own-your-context-window.md))

"Own your context window": frames an agent's entire input, at any point, as
"here's what's happened so far, what's the next step" — prompt, retrieved
documents, past tool calls/results, related-but-separate history (memory),
and output-format instructions are all context engineering, not separate
categories. Explicitly scopes itself away from model-parameter tuning or
training custom models — the guide is about arranging what a stock model
sees, matching this program's own remit for rules/checks over model
fine-tuning.

### 16. Armin Ronacher — Agentic Coding Recommendations ([lucumr.pocoo.org/2025/6/12/agentic-coding](https://lucumr.pocoo.org/2025/6/12/agentic-coding/))

A practitioner source that explicitly values inline why-comments while
flagging their risk: "I have seen the agents leave useful comments about why
it chose one path over another," but warns that when the underlying
dependency or constraint changes, "outdated rationales may persist and
mislead future modifications" — the staleness risk stated as a first-person
observation, not a study. Prefers "descriptive and longer than usual function
names" as a substitute for comment-based explanation where the code can
speak for itself. Relies on a CLAUDE.md for conventions (e.g., emails logged
to stdout in debug mode) and reports running agents with full permissions,
verifying through test suites and tooling rather than manual code review of
each diff — an early, permissive data point for how much a human is expected
to read.

### 17. Kent Beck — Augmented Coding & Design ([newsletter.kentbeck.com/p/augmented-coding-and-design](https://newsletter.kentbeck.com/p/augmented-coding-and-design))

Splits software progress into Features (new function) and Options
(structure — coupling/cohesion), arguing the discipline is to "add the next
feature, then improve the structure" ("breathing"). Diagnoses current agents
("genies") as assuming "its planetary-sized brain is capable of handling any
amount of complexity, so it needn't ever reduce complexity" — they inhale
complexity rather than reduce it, creating an "inhibiting loop" where
features slow until a forced restart or manual refactor. His counter-practice
is **information minimization**: telling the agent "only what it needs to
know for the next step" rather than the whole architecture (his example:
"we aren't implementing a database, we are storing keys & values serialized
onto fixed size pages"). This cuts directly against any design that assumes
an agent will always pull the full ADR/CLAUDE.md context before touching a
line — Beck's practice is to withhold it on purpose.

### 18. Martin Fowler / Birgitta Boeckeler — Context Engineering for Coding Agents ([martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html))

Defines context engineering as "curating what the model sees so that you get
a better result," and inventories the surface as reusable prompts
(instructions, guidance) plus context interfaces (tools, MCP servers,
skills, file/workspace access), mapped onto Claude Code's own feature set
(CLAUDE.md, path-based rules, slash commands, hooks, subagents). Notably
does **not** discuss code comments, doc comments, or decision records as a
context source at all — a gap this program's rule set fills that even a
dedicated late-2026 context-engineering survey from a leading practitioner
site leaves open.

### 19. Geoffrey Huntley — Ralph Wiggum as a "software engineer" ([ghuntley.com/ralph](https://ghuntley.com/ralph/))

Describes the "Ralph" loop: a bash loop restarting a coding agent with a
fresh context each iteration, using the filesystem instead of conversation
history as memory. Three files carry state across iterations: `@fix_plan.md`
(prioritized, continuously-updated task list), `@specs/*` (requirements,
"deterministically allocated to the stack the same way every loop"), and
`@AGENT.md` (how to run the project, learnings from execution). Huntley's
own framing: "the items you want to allocate to the stack every loop are
your plan and your specifications" — and for comments specifically, he
argues for capturing *why tests and their backing implementation matter*
inside the test module itself, as "little notes for future iterations"
explaining context the next (memory-less) loop iteration will not have. This
is a from-scratch, code-adjacent answer to where "why" should live that is
independent of the ADR/CLAUDE.md consensus elsewhere in the corpus.

### 20. Agent Decision Records (AgDR) ([github.com/me2resh/agent-decision-record](https://github.com/me2resh/agent-decision-record))

A 2026 open standard, more specific than the classic embedded-ADR convention
this program already cites: a Markdown representation, a JSON serialization,
JSON Schemas for both, and CI validators (a "Validate AgDRs" workflow, a
"Link Check" workflow, and a "Changelog Lockstep" workflow visible in the
repo's own badges). Fields include `id` (e.g. `AgDR-0001`), `timestamp`,
`agent` (e.g. `claude-code`), `model` (e.g.
`claude-opus-4-5-20251101`), `trigger` (e.g. `user-prompt`), and `status`
(e.g. `executed`) — provenance metadata a classic human-authored ADR does
not carry. Its own framing of the problem: *"You skim the diff, approve the
PR, and it ships. Six weeks later a test breaks... and nobody, human or
agent, can reconstruct the reasoning. The context evaporated the moment that
session ended."* This directly operationalizes the prior ocx research's
recommendation #5 ("every document a comment points at is a tracked file")
with a schema and a CI check rather than a design intent.

### 21. Modem — How coding agents read your code (and how to write for them) ([modem.dev/blog/how-coding-agents-read-your-code](https://modem.dev/blog/how-coding-agents-read-your-code))

A measured, code-specific practitioner source. Core claim: "most coding
agents are just running `grep` — or rather, its faster cousin `ripgrep`,"
and reports that "the Claude Code team tried embeddings and a vector
database early on and threw them out because plain text search worked
better." Measured in the author's own codebase: searching `create` matched
1,585 lines across 459 files; `createStripeClient` matched 43 lines across
19 files — both resolve in ~50ms, but the generic name forces the agent to
read "dozens of unrelated files" to disambiguate, burning "tens of thousands
of tokens." A survey of 7,922 exported names found **three-word identifiers
reach ~96% uniqueness versus ~61% for one-word names**. Types are a second
navigation layer: "a precise signature can often answer the agent's first
questions without requiring it to read the implementation," and branded
types (e.g. `UserId` vs. bare `string`) prevent swapped-argument bugs a
generic type would miss. On comments specifically: because search results
land on the definition, "the definition is the one spot you can count on it
reading" — comments at the call site are much less reliably found cold.
Deprecated-but-uncommented code "will be discovered and used" by an agent.
Reports 6-66% token-count reductions and zero confidently-wrong answers
(versus multiple in the generic-named baseline) after applying these
naming/typing practices.

### 22. Elle O'Brien — "Who is scientific code for?" ([pith.science/paper/2607.25975](https://pith.science/paper/2607.25975))

A 2026 paper (per the paper-summary site pith.science) challenging the
assumption that "at least one person understands why [scientific] code
exists," arguing this breaks down as agents write more of it. Introduces
**"landmarking strategies"** — ad hoc personal conventions distinguishing
human-readable artifacts from agent-context artifacts in the same repo.
Four documented strategies from contextual inquiry (four case studies) plus
survey data (800+ scientific programmers, ~75% ChatGPT adoption, adoption
statistics only): commit messages treated as lab-notebook entries "typed
only by the scientist"; merged diffs as the sole human-reviewed artifact,
agent specs kept transient; markdown specification documents as the
reviewable unit instead of the code; and single growing scripts carrying
"unread agent comments intended as context for future agents." Reviewer
caveats (per the summary): no systematic coding scheme, no baseline
comparing agent-using to non-agent teams, and "several behaviors have
recognizable pre-agent antecedents" — the author herself states "I do not
have direct evidence" for her collaboration-breakdown prediction. Treat as
an early, honestly-hedged signal, not a validated finding.

### 23. William Macke & Michael Doyle — Testing the Effect of Code Documentation on LLM Code Understanding, NAACL 2024 Findings, [arXiv:2404.03114](https://arxiv.org/abs/2404.03114)

Abstract, verbatim: *"We show that providing an LLM with 'incorrect'
documentation can greatly hinder code understanding, while incomplete or
missing documentation does not seem to significantly affect an LLM's
ability to understand code."* A secondary source ([alberto.codes, "When
docstrings lie, your AI tools pay the price"](https://alberto.codes/blog/2026-03-22-when-docstrings-lie-your-ai-tools-pay-the-price))
reports this as a **22.6 percentage-point** degradation from incorrect vs.
correct documentation — this exact figure could not be independently
confirmed from the paper's own text or PDF in this pass (the PDF did not
render as extractable text), so it is cited here as *reported by* the
secondary source, not verified against the primary paper's tables. The
qualitative asymmetry (wrong docs harmful, missing docs mostly harmless) is
independently corroborated by the abstract itself and is a different paper,
venue, and mechanism than the already-covered arXiv 2609.09242 (which
transplants solution-vs-wrong comments on LiveCodeBench) — this is
documentation specifically, tested by substituting real vs. corrupted
docstrings, not synthetic comment injection.

### 24. threedots.tech — Domain-Driven Design matters more when AI writes your code ([threedots.tech/post/ddd-and-ai-coding](https://threedots.tech/post/ddd-and-ai-coding/))

Argues domain understanding, not implementation, is now the differentiator,
and that Ubiquitous Language is the highest-leverage DDD practice for an
agent specifically: "a vague prompt like 'Add user to CRM' produces
suboptimal results" versus a precise one using established terms ("create a
customer entry in CRM, a profile in support"). Concrete guidance: choose one
authoritative name per concept before coding starts; make Bounded-Context
naming divergence explicit "to prevent agents from mistakenly unifying" two
concepts that share a word; keep markdown decision/vocabulary docs close to
code for easy agent access. No numbers or study cited — a practitioner
argument, not measured.

### 25. InfoQ — Agentic Fitness Functions: Extending Evolutionary Architecture Beyond Deterministic Rules ([infoq.com/articles/agentic-fitness-functions-evolutionary-architecture](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/))

Defines an agentic fitness function as "an architecture governance check
whose evaluator is a calibrated AI agent, whose criteria are expressed as an
analytic rubric, and whose output is a structured verdict with evidence,
confidence, and rationale" — distinct from deterministic fitness functions
(dependency rules, contract tests, latency budgets, security scans), which
still handle every measurable invariant. Three named examples: a
**Boundary-Fidelity Reviewer** (semantic coupling dependency rules miss), a
**Semantic Contract Evaluator** (consumer-focus despite structural
compatibility), and an **ADR Drift Monitor** (compares an ADR's original
assumptions against live operational metrics to flag when the rationale has
gone stale). Calibration requirement given explicitly: test the judge
against **20-50 prior classified changes** before production use, and
escalate low-confidence or disagreement cases to a human "rather than
averaging uncertainty away." Every verdict should also emit "a candidate
rule for future deterministic enforcement" — an explicit path from
judgment-based check to cheap mechanical check over time.

### 26. Thorsten Ball — What I believe about the future of software development ([thorstenball.com/blog/2026/09/19](https://thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development/))

The most extreme position found in this corpus, dated 2026-09-19 (eight days
before this survey). Claims "humans won't find a bug or an issue with the
code produced by a model, at least not in a reasonable time," so review
becomes system-composition-level, not line-by-line PR reading. Questions
whether "good code" as a concept survives: it was "mostly based on the idea
that it's easy/cheap/efficient for humans to work with," which stops
mattering once agents maintain the code. Predicts UI and documentation
surfaces shrink because they are "a human-accessible API to a dumb machine;
smart machines need much less UI." Speculates unit tests may disappear
("why have training wheels if you never fall over?"). Explicitly hedges the
timeline: "it'll take a generation." No other source in this corpus goes
this far — see [Contested](#contested).

### 27. Simon Willison — Agentic Coding: The Future of Software Development with Agents ([simonwillison.net/2025/Jun/29/agentic-coding](https://simonwillison.net/2025/Jun/29/agentic-coding/))

A curation/commentary post on Armin Ronacher's agentic-coding practices
(source #16), not an independent primary claim. Willison notes he has "not
been brave enough" to adopt Ronacher's `--dangerously-skip-permissions`
workflow without extra sandboxing (Docker). Contains no direct statement on
code comments or documentation; included because it is the connective
citation between Ronacher's post and the wider "AI slop" discourse
(Willison is credited with popularizing the term "slop" for unreviewed
AI output, per secondary coverage of his May 2024 post, not independently
fetched here since it predates this program's era window).

### 28. Model Context Protocol / LSP-for-agents tooling background (secondary coverage, no single primary source fetched)

Multiple 2025-2026 sources (CircleCI's Claude Code LSP writeup, the LspRag
framework, Go's `gopls` "passive features" docs) converge on: LSP's
`textDocument/hover` returns "a description of the code currently under the
cursor... doc comment (if any), and a link to the symbol's documentation" —
the mechanism by which an agent (or IDE) sees a doc comment without reading
the whole file. Reported token-cost claim (unverified primary source):
without LSP, Claude Code can spend 108,000-117,000 tokens on complex search
operations; LSP-based navigation is claimed to cut this sharply by letting
an agent "read code by meaning instead of by string match." This is the
mechanism-level backing for why doc comments (rustdoc, docstrings,
TSDoc/JSDoc) are a structurally different, more reliably surfaced channel
than inline `//` comments once an agent has LSP tooling — treat the specific
token numbers as unverified pending a primary-source fetch.

## Candidate topics

| # | Topic (question) | Why it matters | Source | Already covered? | Surface | Priority |
|---|---|---|---|---|---|---|
| 1 | Should an agent match the ambient comment density of the file it edits, rather than target a fixed ratio or per-line cap? | Anthropic's own production system prompt moved from a fixed rule ("one short line max") to ambient-style matching with no eval regression — directly contradicts a fixed-ratio design | [charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete) | no | agent config / check | P0 — falsifies or reshapes H7 before the ratchet is built |
| 2 | Does an agent reliably find a comment/pointer left at the call site, or only one left at the definition? | Determines where the "pointer, not paraphrase" pattern must live to be found cold; grep-based navigation lands on definitions | [modem.dev](https://modem.dev/blog/how-coding-agents-read-your-code) | no | inline comment / doc comment | P0 — directly informs H5 (cold agents seldom read pointers) and the where-it-goes table |
| 3 | What per-file line/byte ceiling do vendor-endorsed always-loaded artifacts converge on, and does the same ceiling transfer to a doc-comment block? | HumanLayer (<60 ideal, <300 max), Aider (<200 lines), OpenAI Codex (32 KiB default) all give small numeric ceilings for context files but none for comments directly | [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md), [Aider](https://aider.chat/docs/usage/conventions.html), [OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | no | agent config / doc comment | P0 — closest vendor anchor for a numeric block-length cap |
| 4 | Should code comments follow the same progressive-disclosure principle as SKILL.md — a short inline signal plus an on-demand deeper file? | Anthropic states bundled skill context is "effectively unbounded" because it's fetched on demand, which is a mechanism (not just a hypothesis) for pointer-not-paraphrase | [Anthropic Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) | no | inline comment / decision record | P0 — names the actual mechanism the cleanup skill should implement |
| 5 | Does incorrect documentation degrade an agent's task success by a specific, measured margin versus missing documentation? | Independent, controlled (not synthetic-injection) evidence that wrong docs are uniquely harmful, extending the program's already-cited comment-correctness studies to documentation specifically | [Macke & Doyle, arXiv 2404.03114](https://arxiv.org/abs/2404.03114) | partial | doc comment / check | P0 — strengthens the "wrong is worse than absent" guardrail with a different paper/mechanism |
| 6 | Does an agent trust a doc comment reached via LSP hover more than an inline `//` comment reached only by grep, and should the rule set treat them as different-trust channels? | If hover surfaces doc comments structurally more reliably, the "two registers" split (rustdoc vs `//`) needs a trust/reliability dimension, not just an audience dimension | LSP hover mechanics (secondary coverage) | partial | doc comment / rendered surface | P0 — the rust-quality "two registers" split predates this argument |
| 7 | What frontmatter shape do path-scoped rules converge on across clients (`paths:`, `globs`, `applyTo`), and does any of them specify precedence against an inline comment on the same line? | The program ships a portable rule; every client uses a different key for the same glob-scoping idea, and none arbitrates rule-vs-comment conflict | [Anthropic memory docs](https://code.claude.com/docs/en/memory), [Cursor rules](https://cursor.com/docs/rules), [Copilot custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) | partial | agent config | P0 — governs the artifact's own frontmatter shape |
| 8 | Does the "closest AGENTS.md wins, explicit prompt overrides everything" nesting rule work cleanly with an index-file-plus-depth-files design, or does it fight it? | The program's rule is one index plus depth files, not one file per directory; AGENTS.md's precedence model assumes the latter | [agents.md](https://agents.md/) | no | agent config | P1 |
| 9 | Should review-time instructions be a distinct scoped file from write-time instructions, the way GitHub Copilot code review now separates them? | If cleanup/check rules fire only at review time versus while writing, one glob-scoped file may not be the right granularity | [GitHub changelog, 2025-09-03](https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/) | no | agent config / check | P1 |
| 10 | Can an LLM-judged "did this comment carry load-bearing information" check be calibrated reliably, and how many prior-classified examples does it need? | The prior ocx research rejected LLM-judged review as too expensive; this gives a concrete calibration recipe (20-50 examples, confidence+evidence verdict, human escalation on low confidence) | [InfoQ, agentic fitness functions](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/) | partial | check | P1 — extends a prior "not worth it" verdict with a workable design |
| 11 | Does comparing an ADR's original assumptions against live operational metrics ("ADR drift") reduce the need to restate the same rationale inline as a comment? | If drift is caught automatically at the decision-record level, an inline comment's job shrinks to "here is the pointer," not "here is the argument, kept current" | [InfoQ](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/) | no | decision record / check | P1 |
| 12 | Does a machine-validated decision-record schema (id, timestamp, agent, model, trigger, status) close the "pointer resolves to nothing" failure mode the prior ocx research found for plan IDs? | AgDR is a built, CI-validated implementation of exactly the "every ID must resolve to a tracked file" fix the prior research recommended in the abstract | [Agent Decision Record spec](https://github.com/me2resh/agent-decision-record) | partial | decision record / check | P0 — adopt-or-adapt candidate, not just a design intent |
| 13 | Does three-word (or otherwise longer) identifier naming measurably cut the comments needed to disambiguate a symbol for a grep-based agent? | Measured 96% vs 61% uniqueness and 6-66% token reduction is a concrete, checkable substitute for "write a comment explaining which `create` this is" | [modem.dev](https://modem.dev/blog/how-coding-agents-read-your-code) | no | naming / check | P1 |
| 14 | Does a precise type signature let an agent skip reading the implementation (and skip needing an explanatory comment) more often than a loosely-typed one? | If true, the type system substitutes for a class of contract comments, which affects how aggressively the rule should mandate branded/precise types | [modem.dev](https://modem.dev/blog/how-coding-agents-read-your-code) | no | inline comment / doc comment | P1 |
| 15 | Should deprecated code always carry an explicit, greppable marker, given an agent will otherwise "discover and use" it? | A distinct, checkable failure mode not currently named in the overlapping rust-quality DOC rules (which cover `#[deprecated]` version/note fields but not agent discoverability of the marker itself) | [modem.dev](https://modem.dev/blog/how-coding-agents-read-your-code) | partial | check | P2 |
| 16 | Do BDD-style Given/When/Then test names function as a machine-checkable link from requirement to test, replacing a comment's plan-ID pointer? | Directly operationalizes the frame's H4 (a test named for the constraint is a surviving guard) with a naming convention already in practitioner use | Gherkin/BDD 2026 practitioner corpus | partial | test / traceability | P0 — H4 needs a concrete naming grammar to be checkable |
| 17 | Does living documentation generated from test results (not hand-written) reduce doc-comment staleness risk measurably? | If test-derived docs can't go stale independently of the test, this is a structurally different reliability class than a hand-maintained doc comment | Living-documentation / Cucumber practitioner corpus | no | test / rendered surface | P1 |
| 18 | Does adopting one authoritative name per domain concept (Ubiquitous Language) reduce the number of why-comments needed to disambiguate overloaded terms? | If naming absorbs the disambiguation job, it is a substitute for a class of comments rather than a parallel practice | [threedots.tech](https://threedots.tech/post/ddd-and-ai-coding/) | no | naming / decision record | P1 |
| 19 | Are scientific/research codebases already splitting "human-readable" from "agent-context" artifacts ad hoc, and does a formal convention reduce the collaboration risk this creates? | Early (weakly evidenced) signal that a landmarking convention is coming from practice, not just this program's own design | [pith.science paper](https://pith.science/paper/2607.25975) | no | inline comment / git | P2 — real but thin evidence (4 case studies, no baseline) |
| 20 | If human code review of individual diffs becomes rare (Thorsten Ball's thesis), does a comment's primary audience shift from "next human reviewer" to "next agent that edits this function," and does that change what "why" needs to say? | A one-way-door framing question: if true, it reorders every priority in the rule set toward agent-recoverability over human-skimmability | [Thorsten Ball](https://thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development/) | partial | inline comment / decision record | P1 — flag for escalation, do not assume true (see Contested) |
| 21 | Does Kent Beck's "information minimization" practice (withholding architecture context on purpose) conflict with a rule set that assumes an agent always has ADR/CLAUDE.md context loaded when it edits a line? | If practitioners deliberately restrict what an agent sees, a pointer-only comment strategy may fail exactly when it's needed most (a scoped, minimal-context edit) | [Kent Beck](https://newsletter.kentbeck.com/p/augmented-coding-and-design) | no | agent config / decision record | P1 |
| 22 | Does the Ralph-loop practice of capturing "why this test and its implementation matter" inside the test module (not a separate doc) generalize as a third home for "why," alongside inline comments and decision records? | A from-scratch, load-bearing alternative to the ADR-pointer consensus, worth testing against the eval rather than assuming ADRs win by default | [Geoffrey Huntley](https://ghuntley.com/ralph/) | no | test / inline comment | P2 |
| 23 | Should a cleanup skill run a `/doctor`-style pass on comments — proposing cuts for content the agent can independently re-derive from the code — mirroring Claude Code's own CLAUDE.md pruning command? | Direct mechanism transfer from a shipped, vendor-endorsed workflow to the cleanup skill this program must build | [Claude Code memory docs / best practices](https://code.claude.com/docs/en/best-practices) | no | check / skill | P0 |
| 24 | Which categories of comment rule (ID ban, length ratchet, pointer-must-resolve) belong in a deterministic hook versus an advisory rule the model can choose to follow? | Anthropic's own rules-vs-hooks distinction ("the model choosing... is different from... running automatically") reframes the prior research's "ratchet as a script" recommendation as a hook-vs-rule design choice, not just tooling | [Claude "Steering Claude Code"](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) | partial | check / agent config | P1 |
| 25 | Does a fresh-context subagent catch stale pointers, dead IDs, and essay-length blocks more reliably than the same-context agent that just wrote them? | Directly testable design choice for the cleanup skill and for the reason-recovery eval's "cold" probe methodology | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) | no | check / skill | P1 |
| 26 | Does Chesterton's-fence-style caution work as a standing prose instruction, or does it need a machine check (a "fence" CLI querying why a line exists before deletion) to be reliably obeyed? | The program's own guardrail is a Chesterton's-fence problem stated in different words; emerging tooling responses exist and should be evaluated, not assumed away by an instruction alone | Chesterton's fence / AI-agent commentary corpus | partial | check / agent config | P1 |
| 27 | Do agent-vendor system prompts differ from each other (Anthropic vs. OpenAI vs. others) on how much they instruct the model about commenting, and does that mean a portable rule must compensate for a client with weaker built-in judgment? | If Claude's system prompt now says "match ambient style" but another client's does not, the code-docs rule may need to carry more weight on clients with a weaker built-in default | [charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete) vs. other vendor docs | no | agent config | P2 |
| 28 | Does a repository benefit from two separate context files — one durable, cross-session (CLAUDE.md/AGENTS.md-style) and one per-task scratch file (fix_plan.md-style) — and does that split reduce the felt need to over-comment code as an ad hoc memory aid? | If agents over-comment partly to compensate for having no other persistent memory between turns, giving them one changes the comment incentive itself | [Geoffrey Huntley](https://ghuntley.com/ralph/) | no | agent config / decision record | P2 |
| 29 | Should a code-review-time instruction file be distinct from a write-time one for the code-docs rule specifically (comment-cleanup checks fire at review, not at every edit)? | Splits enforcement cost from authoring guidance, following the precedent GitHub Copilot code review already set | [GitHub changelog](https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/) | no | check / agent config | P2 |
| 30 | Does OpenAI's "flag behavior + safe path/exception" phrasing for review rules transfer as the format for the comment-cleanup check's false-positive handling? | A concrete phrasing template for how a check should state its own exceptions, directly reusable in the rule/check text this program ships | [OpenAI Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | no | check | P2 |
| 31 | Is the 22.6-percentage-point wrong-documentation penalty (as reported by a secondary source) reproducible from the primary paper's own tables, and does it hold for rustdoc/docstring-style documentation specifically rather than general code documentation? | The number is currently uncorroborated at the primary-source level in this pass; using it in a rule or eval baseline without verifying it first risks citing a number this program can't stand behind | [Macke & Doyle, arXiv 2404.03114](https://arxiv.org/abs/2404.03114) (secondary: [alberto.codes](https://alberto.codes/blog/2026-03-22-when-docstrings-lie-your-ai-tools-pay-the-price)) | no | doc comment | P1 — verify before citing the exact number anywhere load-bearing |
| 32 | Does the comment-density classifier this program built (`comment_census.py`) need a bucket for "comment written as agent-only context, not for a human reader," given that practitioners already write such comments deliberately? | If landmarking-style agent-only comments exist in the fleet and are lumped in with narration/essays, the census may be mis-scoring genuinely load-bearing agent-context lines as waste | [pith.science paper](https://pith.science/paper/2607.25975) | no | check | P1 — a direct critique of this program's own measurement tool |

## Recent shifts seen in this corpus

- **July 2026 — Claude Code's system prompt drops its explicit comment ban.**
  "Default to writing no comments... one short line max" became "match its
  comment density, naming, and idiom," alongside an 80% overall system-prompt
  cut with no reported eval regression
  ([charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete)).
  Invalidates: any design that assumes the frontier model itself needs (or
  benefits from) an absolute numeric comment cap rather than a relative,
  ambient-matching instruction — though this cuts against a fixed-ratio
  design at the model-instruction layer specifically, not necessarily at the
  fleet's own lint-and-ratchet layer, which is a different enforcement point.
- **Late 2025 — Agent Skills formalize progressive disclosure as a named,
  documented mechanism** rather than an implicit practice
  ([Anthropic](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)),
  giving "pointer, not paraphrase" designs a concrete substrate (metadata →
  full file → referenced file) instead of just a stated intent.
- **2025-2026 — AGENTS.md consolidates from a single-vendor convention into
  a Linux-Foundation-stewarded, multi-vendor standard**
  ([agents.md](https://agents.md/)), read natively by Copilot, Cursor, and
  Claude Code alongside their own formats. Invalidates: designing a
  code-docs artifact that assumes only one client's file format; the
  program's own portable-artifact requirement is now the industry default,
  not an outlier choice.
- **September 2025 → November 2025 — GitHub Copilot splits review-time from
  write-time instruction scoping**
  ([changelog](https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/)),
  the first source in this corpus to treat "what a rule says while coding"
  and "what a rule checks while reviewing" as different configuration
  surfaces rather than one file serving both.
- **September 2026 — the most extreme "review is dying" claim found in this
  corpus is eight days old at time of writing**
  ([Thorsten Ball](https://thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development/)),
  and is explicitly hedged by its own author ("it'll take a generation").
  Treat as a live, contested trend, not settled practice — see
  [Contested](#contested).
- **2025-2026 — LSP-for-agents tooling matures** (LspRag, Claude Code LSP
  plugins, `gopls` passive features), making hover-surfaced doc comments a
  structurally different, more reliably found channel than a grep-only
  inline comment. This is newer than the rust-quality "two registers" rule
  it should sharpen, which predates general agent LSP adoption.
- **2026 — Agent Decision Records (AgDR) emerge as a more specific standard
  than the classic embedded-ADR convention**
  ([spec](https://github.com/me2resh/agent-decision-record)), adding
  machine-authorship provenance (model, trigger, timestamp) and CI
  validation the older convention does not specify. Refines, does not
  replace, the already-cited adr.github.io convention.
- **2026 — "agentic fitness functions" formalize LLM-judged architecture
  checks with a calibration recipe** (20-50 prior classified examples,
  confidence-scored verdicts, human escalation on low confidence)
  ([InfoQ](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/)),
  which is new enough, and specific enough, to revisit the prior ocx
  research's blanket "LLM-judged comment review... not worth it" verdict —
  not to overturn it outright, but to test the calibrated version before
  ruling it out again.

## Contested

- **Is human code review of individual diffs ending?** Thorsten Ball argues
  yes, effectively already, with verification shifting from reading to
  testing outcomes
  ([Ball, 2026-09-19](https://thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development/)).
  Every other vendor/practitioner source in this corpus assumes ongoing human
  review matters: Anthropic's own best-practices docs still recommend a
  fresh-context adversarial-review subagent step before treating work as
  done, and HumanLayer's writing assumes a human periodically prunes
  CLAUDE.md by observing behavior. Trending: toward more automated,
  less manual review — but "review is dead" is a minority, self-hedged
  position even within this corpus's own vendor sources, not a consensus.
  This program should not assume a comment's audience has already shifted
  entirely from "next human reviewer" to "next agent" (candidate #20)
  without the eval saying so.
- **Fixed ratio/length rule vs. ambient/contextual matching for comment
  density.** Claude Code's own system-prompt change explicitly rejects a
  fixed numeric rule ("one short line max") in favor of "match the
  surrounding style"
  ([charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete)).
  Yet every context-file-length guidance found (HumanLayer, Aider, OpenAI
  Codex) *is* a fixed number, just for a different artifact (the always-loaded
  file, not the comment itself). Trending: fixed numbers for container/file
  size, contextual/relative rules for in-file density — this is actually
  consistent with H7 (a per-package ratchet, not a fixed global ratio) once
  the two artifact types are kept separate, and this corpus's disagreement is
  more apparent than real once that distinction is made explicit.
- **How much inline "why" survives externalization.** Armin Ronacher values
  inline why-comments directly, despite the staleness risk he names himself
  ([Ronacher](https://lucumr.pocoo.org/2025/6/12/agentic-coding/)). The
  AGENTS.md/skills/ADR ecosystem broadly pushes toward externalizing "why"
  into a loaded-on-demand artifact instead. Geoffrey Huntley splits the
  difference: keep "why this test matters" inside the test module, not in a
  separate document
  ([Huntley](https://ghuntley.com/ralph/)). Trending: toward externalization
  as codebases and context windows both grow, but no source argues for zero
  inline "why" — the disagreement is about the *default*, not the extreme.
- **Should an agent get more or less domain/architecture context before it
  edits a line?** threedots.tech argues DDD investment (shared vocabulary,
  explicit bounded contexts) matters *more* as agents write more code
  ([threedots.tech](https://threedots.tech/post/ddd-and-ai-coding/)). Kent
  Beck's practice is the opposite instinct: deliberately *withhold*
  architecture context, giving the agent only what the next step needs,
  because current models "inhale" complexity instead of managing it
  ([Beck](https://newsletter.kentbeck.com/p/augmented-coding-and-design)).
  Trending: no clear direction in this corpus — this is a live, unresolved
  design tension the eval should probe directly (does more upfront context
  improve or hurt reason-recovery and guard survival at the sites tested?)
  rather than assume either camp is right.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) | Official Anthropic docs, "Best practices for Claude Code" | 2026 (current) | Primary vendor guidance; explicit CLAUDE.md ✅/❌ content table and per-line retention test |
| [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Anthropic engineering blog post | 2025-2026 | Primary; defines "context rot" and just-in-time retrieval, the mechanism argument behind pointer-not-paraphrase |
| [anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) | Anthropic engineering blog post | Oct 2025 | Primary; progressive disclosure, the mechanism this program's cleanup should reuse |
| [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) | Official Anthropic docs, CLAUDE.md / memory / rules | 2026 (current) | Primary; `paths:` frontmatter mechanism, AGENTS.md interop, hooks-vs-advisory distinction |
| [agents.md](https://agents.md/) | The AGENTS.md open specification site | 2026 (current), governed since 2025-2026 | Primary spec; cross-vendor standard, nesting/precedence rule |
| [learn.chatgpt.com/docs/agent-configuration/agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | OpenAI's own Codex AGENTS.md guidance | 2026 (current) | Primary vendor docs; 32 KiB cap, review-rule phrasing template |
| [cursor.com/docs/rules](https://cursor.com/docs/rules) | Official Cursor docs, Project Rules | 2026 (current) | Primary; frontmatter fields, 500-line guidance, "avoid entire style guides" |
| [docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) | Official GitHub Copilot docs | 2026 (current) | Primary; applyTo frontmatter, 2-page cap, precedence order |
| [github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support](https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/) | GitHub product changelog | 2025-09-03 | Primary; first source to split review-time from write-time instruction scoping |
| [raw.githubusercontent.com/google-gemini/gemini-cli, docs/cli/gemini-md.md](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md) | Official Gemini CLI repo docs | 2026 (current) | Primary; three-tier hierarchy including just-in-time directory-scoped context |
| [aider.chat/docs/usage/conventions.html](https://aider.chat/docs/usage/conventions.html) | Official Aider docs, CONVENTIONS.md | 2026 (current) | Primary; read-only/caching mechanism for a conventions file |
| [raw.githubusercontent.com/humanlayer/12-factor-agents, factor-03](https://raw.githubusercontent.com/humanlayer/12-factor-agents/main/content/factor-03-own-your-context-window.md) | Primary source repo, "12-Factor Agents" | 2025-2026 | Primary; "own your context window" framing, explicitly scoped away from model tuning |
| [github.com/me2resh/agent-decision-record](https://github.com/me2resh/agent-decision-record) | Open-standard spec repo, Agent Decision Records | 2026 | Primary spec; schema, CI validators, provenance fields a classic ADR lacks |
| [arxiv.org/abs/2404.03114](https://arxiv.org/abs/2404.03114) | Macke & Doyle, NAACL 2024 Findings paper | Apr 2024 (paper), cited into 2026 practice | Primary paper; controlled test of incorrect vs. missing documentation on LLM understanding |
| [pith.science/paper/2607.25975](https://pith.science/paper/2607.25975) | Paper summary site, "Who is scientific code for?" (O'Brien) | 2026 | Primary-adjacent (paper summary with reviewer caveats included); earliest documented "landmarking" convention |
| [charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete) | Practitioner blog quoting Claude Code's actual system prompt diff | 2026-07-24 | Verbatim before/after system-prompt quote on commenting — a primary artifact (the prompt text) relayed by a secondary post |
| [claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) | Anthropic/Claude product blog | 2025-2026 | Clearest single decision table for CLAUDE.md vs. rules vs. skills vs. hooks vs. subagents |
| [humanlayer.dev/blog/writing-a-good-claude-md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) | HumanLayer engineering blog | 2025-2026 | WHY/WHAT/HOW framing, numeric length targets, "never send an LLM to do a linter's job" |
| [lucumr.pocoo.org/2025/6/12/agentic-coding](https://lucumr.pocoo.org/2025/6/12/agentic-coding/) | Armin Ronacher's personal blog | 2025-06-12 | Named practitioner; values inline why-comments, names the staleness risk himself |
| [newsletter.kentbeck.com/p/augmented-coding-and-design](https://newsletter.kentbeck.com/p/augmented-coding-and-design) | Kent Beck's newsletter | 2025-2026 | Named practitioner; "information minimization" as a counter-practice to always-loaded context |
| [martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) | Martin Fowler's site, Birgitta Boeckeler's series | 2025-2026 | Notable gap: a dedicated context-engineering survey that never mentions comments/decision records as context |
| [ghuntley.com/ralph](https://ghuntley.com/ralph/) | Geoffrey Huntley's personal blog | 2025 | Named practitioner; independent, file-based answer to where "why" should live |
| [thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development](https://thorstenball.com/blog/2026/09/19/what-i-believe-about-the-future-of-software-development/) | Thorsten Ball's personal blog | 2026-09-19 | Most extreme, most recent position in the corpus on review/comment audience shift |
| [alberto.codes/blog/2026-03-22-when-docstrings-lie-your-ai-tools-pay-the-price](https://alberto.codes/blog/2026-03-22-when-docstrings-lie-your-ai-tools-pay-the-price) | Practitioner blog | 2026-03-22 | Secondary framing of the Macke & Doyle finding; flagged as unverified for its exact percentage |
| [modem.dev/blog/how-coding-agents-read-your-code](https://modem.dev/blog/how-coding-agents-read-your-code) | Practitioner engineering blog with original measurements | 2025-2026 | Measured naming/search data (7,922 names, 1,585 vs. 43 grep hits, 6-66% token reduction) |
| [threedots.tech/post/ddd-and-ai-coding](https://threedots.tech/post/ddd-and-ai-coding/) | Practitioner engineering blog | 2026 | Ubiquitous Language re-argued as more valuable, not less, for agent-written code |
| [infoq.com/articles/agentic-fitness-functions-evolutionary-architecture](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/) | InfoQ practitioner/industry article | 2026 | Concrete calibration recipe for LLM-judged architecture/comment checks |
| [simonwillison.net/2025/Jun/29/agentic-coding](https://simonwillison.net/2025/Jun/29/agentic-coding/) | Simon Willison's blog (curation post) | 2025-06-29 | Connective source between Ronacher's practice and the wider trust/review discourse |
