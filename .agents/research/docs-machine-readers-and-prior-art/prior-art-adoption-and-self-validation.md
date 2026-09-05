---
title: Prior-art adoption and self-validation for AI docs-writing config
topic: prior-art-adoption-and-self-validation
group: docs-machine-readers-and-prior-art
agent: research-scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 24
scope: >
  What existing AI docs-writing skills, subagents, and lint packages already encode; which
  to adopt/adapt/reject; and how this program proves its own rule set changes agent
  behavior. Does not cover llms.txt/AGENTS.md-as-a-publishing-decision (owned by the
  sibling topic agent-readable-surface) or page-type/readability content itself (owned by
  docs-page-types and docs-plain-english) — only the prior-art artifacts and the
  verification-design question.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Two reference-implementation philosophies: reader simulation vs RED-GREEN-REFACTOR](#1-two-reference-implementation-philosophies-reader-simulation-vs-red-green-refactor)
   2. [Community subagent collections: the looks-verified-but-isn't checklist](#2-community-subagent-collections-the-looks-verified-but-isnt-checklist)
   3. [The anti-slop skill family: four reinventions, one real gate](#3-the-anti-slop-skill-family-four-reinventions-one-real-gate)
   4. [Sibling machine-reader artifacts: Mintlify's skill.md and AGENTS.md](#4-sibling-machine-reader-artifacts-mintlifys-skillmd-and-agentsmd)
   5. [GitBook: numbered rules vs voice-as-judgment, and the sameness cost](#5-gitbook-numbered-rules-vs-voice-as-judgment-and-the-sameness-cost)
   6. [Generic docs-writing skill templates: Diataxis-routed and changelog-generating](#6-generic-docs-writing-skill-templates-diataxis-routed-and-changelog-generating)
   7. [The mechanical layer none of the skills above use](#7-the-mechanical-layer-none-of-the-skills-above-use)
   8. [Comparison table — all 14 artifacts read in full](#8-comparison-table--all-14-artifacts-read-in-full)
   9. [This program's own duplication: the ocx/grimoire fork](#9-this-programs-own-duplication-the-ocxgrimoire-fork)
   10. [A concrete self-validation loop for this program](#10-a-concrete-self-validation-loop-for-this-program)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Every general-purpose docs-writing skill found (Anthropic's, the four humanizer skills, the Diataxis-routed community skill) ships zero automated lint. Verification is either a reader-simulation heuristic, a self-graded 1-10 or 0-100 score, or nothing.
- One artifact breaks that pattern: [Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill) ships a dependency-free Node CLI (`cli/index.js compare --check-facts`) that exits 1 when a rewrite drops a number, date, URL, version, or acronym — the only genuinely runnable CI gate found in the whole survey.
- The same skill's own SKILL.md warns against trusting its own score: "a model grading its own output in the same session tends to inflate the result... the real gate is an independent pass or a human reader." Adopt that warning as policy for this program's own scoring, if it ever ships one.
- [obra/superpowers' writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) (679 lines) is the one artifact with a reusable *methodology* for proving a skill changes behavior: RED (baseline without the skill, capture verbatim rationalization) → GREEN (minimal fix, retest) → REFACTOR (find new evasions, re-test 5+ samples). This program should run its own rules through that loop before shipping them, not just write them and hope.
- [Anthropic's doc-coauthoring](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) (375 lines) contributes exactly one durable idea worth keeping: hand the finished doc to a fresh, context-free Claude and see if it answers 5-10 predicted reader questions correctly. Keep this as a secondary check layered on top of lint, never as a replacement for it.
- VoltAgent's [technical-writer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) and [documentation-engineer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) subagents gate on "readability score > 60," "page load time < 2s," "search success rate at 94%" with no formula, no tool, and no unit named anywhere in either 275-350-line file. Worse: their own example output ("Created 127 pages... 92% satisfaction... 73% reduction in support tickets") reads as a fill-in-the-blanks success narrative the agent is meant to state, not a measured result — do not adopt this shape at all.
- Four independent "humanizer" skills exist for coding agents ([blader/humanizer](https://github.com/blader/humanizer), [jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing), [Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill), [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)), all citing [Wikipedia's "Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) as their source taxonomy. Import that essay and Vale's `AiTells` package as dependencies; do not re-derive the pattern list a fifth time.
- Two of the four humanizer skills directly contradict each other on semicolons: [jalaalrd's skill](https://github.com/jalaalrd/anti-ai-slop-writing/blob/main/skills/anti-ai-slop-writing/SKILL.md) instructs "use them; AI underwrites them" (i.e., use semicolons *because* AI avoids them), while this fleet's own em-dash/semicolon ban assumes the opposite. Neither is backed by a study; both are house-style choices dressed as detection rules.
- [blader/humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) is the best-designed of the four on craft grounds: it ships an explicit false-positive section ("one em dash proves nothing"), calibrates its em-dash rule against the writer's *own* sample rate rather than a flat ban, and ends every rewrite with a fact-preservation question ("did the rewrite add or remove any fact, name, number, date, quote, citation?").
- [GitBook's style-guide feature](https://gitbook.com/docs/create-content/styleguide) independently arrived at the exact split this program needs: rules get a numbered ID (`G-10`, `MS-9`) and are mechanically enforced by GitBook Agent; voice and tone stay unnumbered "judgment territory" the Agent only suggests, never flags as a violation. Adopt this split verbatim as the shipped rule's own internal structure.
- GitBook also names, unprompted, the cost this program's frame assumed away: a single shared AI-docs voice "makes every product's docs sound the same," which costs a differentiator. Resolution: ship voice/tone guidance as optional and house-style-labelled; ship numbered, lint-backed rules as normative. This mirrors GitBook's own mechanism, so it is not an invented compromise.
- [Mintlify's skill.md](https://mintlify.com/blog/skill-md) (auto-regenerated, hosted at `/.well-known/skills/default/skill.md`) is a sibling artifact class to this program's own skill: decision tables, explicit boundaries, a "gotchas" section, links back to full docs. Adopt the shape (decision table + boundaries + gotchas), not the mechanism (auto-regeneration is Mintlify-platform-specific).
- [Mintlify's own starter AGENTS.md](https://github.com/mintlify/starter/blob/main/AGENTS.md) is 33 lines of placeholder stubs, not a finished artifact — but its default style preferences (active voice, second person, one idea per sentence, sentence-case headings, bold for UI elements, code formatting for names/paths/commands) match several rules this program already plans and can seed a starter template.
- Community "Diataxis-routed" skills exist (e.g. [github/awesome-copilot's documentation-writer](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md), 45 lines) but confirm the topic map's own gap finding independently: it asks the four framing questions (type, audience, goal, scope) before writing, and names zero mixing check and zero automated verification — human "await my approval" is its only gate.
- A community changelog skill ([ComposioHQ's changelog-generator](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/changelog-generator/SKILL.md), 104 lines) confirms this fleet's Keep-a-Changelog convention is industry-standard, uncredited nowhere; its example output uses emoji category headers (✨ New Features, 🔧 Improvements, 🐛 Fixes), which conflicts with a no-marketing-tone, plain-English rule and should not be copied.
- This program's own fleet already has the duplication problem it studies: `grimoire-rs/grimoire`'s `docs-style.md` (124 lines) is a hand-fork of `ocx`'s (163 lines), and axis-3 analysis shows it is "a strict subset-plus-one" — no real content conflict, just avoidable duplication inside the repo family that owns the OCI package manager (`grim`) this research feeds ([config-inventory.md](../docs-audit/config-inventory.md)).
- No artifact surveyed — including this program's own frame — states a re-verification cadence for its banned-word list. Wikipedia's own tracked essay shows "delve" usage "dropped off sharply in 2025"; a rule banning it in September 2026 catches nothing. Date every banned term and re-check hit rates before shipping a refresh.

## Findings

### 1. Two reference-implementation philosophies: reader simulation vs RED-GREEN-REFACTOR

[Anthropic's `doc-coauthoring` SKILL.md](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) is 375 lines (confirmed by direct fetch; earlier scout estimates in this program's own audit undercounted it). Frontmatter: `name: doc-coauthoring`, trigger "user mentions writing documentation, proposals, specs, decision docs." Its three phases are Context Gathering (5-10 clarifying questions), Refinement & Structure (5-20 brainstormed options per section, iterative `str_replace` edits), and Reader Testing: hand the finished doc to a *fresh* Claude instance with no conversation context, predict 5-10 questions a reader would ask, and check whether the fresh instance answers them correctly without surfacing new gaps. It carries zero lints, zero numeric content thresholds, and zero mention of a prose-tell check. Its entire verification story is this reader-simulation loop.

[`obra/superpowers`'s `writing-skills` SKILL.md](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) is 679 lines and is not a docs-writing skill — it is a skill for *writing skills*, i.e. a meta-methodology. Its frontmatter constraint alone is worth copying: `description` must start with "Use when..." and describe triggers, never workflow, capped at 1,024 characters. Its verification loop is RED-GREEN-REFACTOR applied to prompt engineering:

- **RED**: create 3+ pressure scenarios, run them against a subagent *without* the candidate skill line, and record the subagent's verbatim rationalization for skipping the desired behavior.
- **GREEN**: write the smallest skill text that defeats that exact rationalization, rerun the same scenarios, confirm compliance.
- **REFACTOR**: run the scenarios again looking for *new* rationalizations the fix didn't anticipate, add explicit counters, build a running "rationalization table," and retest with 5+ fresh-context samples per wording variant, always including a no-guidance control.

It also states hard word budgets for skill files: getting-started workflows under 150 words, frequently-loaded skills under 200 words total, other skills under 500 words — a token-efficiency constraint this program's own 500-line skill-body cap (`docs-frame.md`) should tighten to a *words* budget for the skill's opening section specifically, since that is what a truncating agent reads first.

**Classification**: Anthropic's skill is **adapt** — keep the reader-simulation test as a secondary layer, but it cannot stand alone; this program still needs a lint. obra/superpowers is **adopt**, as methodology, not content — see [§10](#10-a-concrete-self-validation-loop-for-this-program).

### 2. Community subagent collections: the looks-verified-but-isn't checklist

VoltAgent's `awesome-claude-code-subagents` collection ships two haiku-model agents relevant here, both with `tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch`:

- [`technical-writer.md`](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) — 286 lines, three phases (Planning → Implementation → Documentation Excellence).
- [`documentation-engineer.md`](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) — 275 lines, 18 named sections spanning architecture, API-doc automation, tutorials, reference, testing, versioning, search, contribution workflow.

Both gate on checklist items with a bare number and no named formula or tool anywhere in either file:

| Item (verbatim) | File | Formula/tool named? |
|---|---|---|
| "Readability score > 60 achieved" | technical-writer | No |
| "User satisfaction 92%" | technical-writer | No |
| "Support ticket reduction 73%" | technical-writer | No |
| "Page load time < 2s" | documentation-engineer | No |
| "Search success rate at 94%" | documentation-engineer | No |
| "API coverage: 100%" | documentation-engineer | No |

Read directly, `technical-writer.md`'s example deliverable message is not a placeholder for a real measurement — it is a completion narrative the agent is meant to output verbatim in spirit: *"Documentation completed. Created 127 pages covering 45 APIs with average readability score of 68. User satisfaction increased to 92% with 73% reduction in support tickets."* An agent following this template states fabricated metrics in its own sign-off, which is a step worse than simply having an unfalsifiable threshold — it manufactures false evidence of having met one.

**Classification**: **reject** as authored. The three-phase shape name (audit → implement → verify) is a fine label to reuse; the numbers and the completion-narrative template are not.

### 3. The anti-slop skill family: four reinventions, one real gate

Four independent Claude/agent skills exist purely to remove "AI-sounding" prose, all citing [Wikipedia's "Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) essay (maintained by WikiProject AI Cleanup) as their taxonomy source:

| Skill | Lines | Patterns | Verification |
|---|---|---|---|
| [blader/humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) | 456 | 35, five categories | Self-check questions only ("did the rewrite add or remove any fact?"); explicit false-positive section |
| [jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing/blob/main/skills/anti-ai-slop-writing/SKILL.md) | 122 | ~50 banned words/phrases + 10 structural rules | 11-item silent self-check, no script |
| [Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill/blob/main/skills/humanizer/SKILL.md) | 443 | 55 (P1-P55), tiered by evidence strength | Formula-scored (see below) **plus a real CLI** |
| [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md) | 68 | ~30 named rules across filler/structure/voice | Self-graded 1-10 × 5 dimensions, threshold "below 35/50: revise" |

**The one real gate found in this entire survey** lives in Aboudjem/humanizer-skill's companion `cli/` tool (confirmed by direct repo inspection): `node cli/index.js compare --before <a.md> --after <b.md> --check-facts` computes a deterministic, weighted score (`4×patterns_hit + 25×(1−burstiness_normalized) + 15×vocabulary_blacklist_ratio`, clamped 0-100) *and* runs a fact-preservation diff that exits 1 and names anything a rewrite silently dropped — a number, percentage, URL, date, version, or acronym. The skill's own SKILL.md is candid about the score's limit, in its own words: *"A model grading its own output in the same session tends to inflate the result. Treat `--score` as a signal, not a verdict: the real gate is an independent pass or a human reader."*

blader/humanizer is the strongest single-file design without any tooling: it calibrates its em-dash rule against the writer's own sample rate ("If the sample uses em dashes, keep them at about the same rate. Do not apply §14 as a ban") rather than a flat prohibition, and its false-positive section states plainly: *"Em dashes alone. Many editors and journalists use them often. Em dashes are evidence only when paired with formulaic sales-y rhythm... One em dash proves nothing."*

**A direct contradiction between two of the four**: jalaalrd's skill instructs *"Use [semicolons]; AI underuses them and humans who write well use them naturally"* — i.e., add semicolons because their absence is the AI tell. This fleet's own em-dash/semicolon ban (`docs-frame.md` hypothesis 5, already flagged as house-style-not-detector by an earlier correction) assumes the opposite: that semicolon presence is a tell. Neither skill cites a study for its semicolon position; both are house-style choices asserted as detection science.

**Classification**: blader/humanizer is **adopt as dependency** (cite the Wikipedia essay directly, install rather than re-derive). jalaalrd's per-word-count numeric budgets (max 1 em dash / 500 words, max 1 exclamation / 1,000 words, max 5-7 bullets in a row) are **adapt** — the only genuinely numeric, checkable version among the four, even though the specific numbers are unsourced. Aboudjem's `cli/` fact-check gate is **adopt** outright; its 0-100 score is **adapt** with the built-in self-grading warning kept intact. hardikpandya/stop-slop's self-graded 1-10 score is **reject** as a gate, **adapt** as a fast human-readable pre-commit hint.

### 4. Sibling machine-reader artifacts: Mintlify's skill.md and AGENTS.md

[Mintlify's skill.md announcement](https://mintlify.com/blog/skill-md) describes a markdown file served at `/.well-known/skills/default/skill.md` (and mirrored at `/skill.md`), auto-regenerated whenever the underlying docs update, installable into 20+ agents via `npx skills add <docs-url>`. Its stated content shape — decision tables mapping use cases to components, explicit boundaries between what an agent may configure and what needs a human, a "gotchas" section for repeated agent mistakes, and links back to fuller docs — is a genuinely new artifact class distinct from a docs page: it consolidates "context documentation usually scatters across dozens of pages, or skips entirely because it would overwhelm human readers."

[Mintlify's own `AGENTS.md` starter](https://github.com/mintlify/starter/blob/main/AGENTS.md) is only 33 lines and mostly placeholder comments (`{/* Add product-specific terms and preferred usage */}`), but its filled-in defaults are worth noting verbatim: active voice and second person ("you"), one idea per sentence, sentence-case headings, bold for UI elements ("Click **Settings**"), code formatting for file names/commands/paths. Mintlify's separate [style-and-tone guide](https://www.mintlify.com/docs/guides/style-and-tone) states exact numbers: sentences under 25 words, two to four sentences per paragraph, no skipped heading levels (H2 to H3, never H2 to H4) — independently matching GOV.UK's and Microsoft's numbers cited elsewhere in this research program.

**Classification**: **adapt** both. The decision-table/boundaries/gotchas shape belongs in how this program's own rule-plus-skill pair presents itself to a machine reader; the auto-regeneration mechanism is Mintlify-platform-specific and does not transfer to a static-hosted fleet.

### 5. GitBook: numbered rules vs voice-as-judgment, and the sameness cost

GitBook's [style-guide feature](https://gitbook.com/docs/create-content/styleguide) is "the single source of truth for how content on your site should be written — voice and tone, terminology, formatting, and structure," but it splits its own rules into two enforcement classes:

- **Numbered rules** (`G-10`, `MS-9`, etc.) are enforceable. GitBook Agent "loads your style guide's first page in full into its context on every task," treats it as the *only* source of rules (it will not silently apply an external convention), and "flags violations of them directly and cites the ID, so you can trace any flag back to the exact rule."
- **Unnumbered guidance** — explicitly including voice and tone — is "judgment territory": the Agent applies it when writing and *offers it as suggestions for human review, but never flags it as a violation.*

This is precisely the split this topic's assigned conflict needs (see [Contested / evolving](#contested--evolving)). GitBook arrived at it independently, for the same underlying reason: voice cannot be mechanically checked the way a numbered rule can.

Separately, [GitBook's own traffic data](https://www.gitbook.com/blog/ai-docs-data-april-2026) is worth citing on its own terms: AI agents accounted for less than 10% of GitBook documentation traffic in January 2025, ~41% by December 2025, and — isolating *intentional* reads only — 51.8% by the week of April 27-May 3, 2026 (23.8M agent page views vs 22.2M human, with ChatGPT alone at 54% of agent traffic). Notably, GitBook does *not* use this data to argue for a different writing voice: *"The qualities that make documentation easier for AI to parse — clear structure, consistent terminology, explicit context, well-defined relationships — are exactly the same qualities that make it better for human readers."* GitBook's [Agent overview](https://gitbook.com/docs/gitbook-agent/overview) confirms the platform is "designed so that both humans and AI agents can read, navigate, and reason over technical content effectively" without asserting a need for agent-specific prose.

**Classification**: **adopt** the numbered-vs-advisory split as this program's own rule-file structure. The traffic data is informational evidence for the sibling `agent-readable-surface` topic, not a skill to adopt or reject.

### 6. Generic docs-writing skill templates: Diataxis-routed and changelog-generating

[github/awesome-copilot's `documentation-writer` SKILL.md](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md) (45 lines) is explicitly "Diátaxis Documentation Expert," routing every request through four framing questions before writing — Document Type (Tutorial/How-to/Reference/Explanation), Target Audience, User's Goal, Scope (what's excluded, not just included) — then requires a human-approved outline before content generation. It names **no mixing check** at all: nothing prevents the agent from drifting between types mid-document once writing starts, and its only gate is "await my approval." This independently confirms the topic map's own finding (`page-type-set-and-declaration`) that a type-routing skill without a mixing check is the norm, not an anomaly specific to this fleet.

[ComposioHQ's `changelog-generator` SKILL.md](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/changelog-generator/SKILL.md) (104 lines) scans git history, categorizes commits into features/improvements/fixes/breaking-changes/security, translates technical language to user-facing language, and filters internal commits (refactors, tests). Its example output categorizes with emoji headers:

```
## ✨ New Features
## 🔧 Improvements
## 🐛 Fixes
```

This is functionally Keep a Changelog's Added/Changed/Fixed/Removed/Security taxonomy with emoji bolted on — independent confirmation that this fleet's own changelog convention (`worker-doc-writer.md`, uncredited) is the de facto industry format, not an ocx invention. Its verification is "review and adjust... before publishing" — human only, no script.

**Classification**: **adapt** the discovery-questions gate from documentation-writer (fold into this program's own use-case-discovery skill, but add a mixing check it lacks). **adapt** the changelog categorization taxonomy; **reject** the emoji headers as incompatible with a no-marketing-tone rule.

### 7. The mechanical layer none of the skills above use

Every artifact in §1-§6 is a prose instruction with, at best, a self-graded score. The mechanical layer already exists and none of them wire into it. [Vale's style-package hub](https://vale.sh/hub/) lists, per package, an exact rule count (confirmed by direct fetch):

| Package | Rules | Applicability |
|---|---|---|
| Google | 36 | House style, general dev docs |
| Microsoft | 47 | House style, includes `SentenceLength.yml` |
| RedHat | 37 | House style |
| write-good | 8 | General prose |
| proselint | 34 | General prose |
| alex | 11 | Inclusive language |
| Joblint | 17 | Job-posting bias — **not applicable to software docs** |
| Readability | 7 | Readability formulas (only `FleschKincaid.yml`'s `grade > 8 → suggestion` independently confirmed) |
| AiTells | 17 | AI-writing tells — confirmed via [krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells): 6 error-level (`Dash`, `CodeToken`, `FilePath`, `StatusBracket`, `SectionCode`, `NeverTag`), 11 suggestion-level |
| Harper | 547 | Full grammar checker, offline, Rust, not a Vale style |

The `AiTells` package's own framing is worth quoting directly: *"A rule floor rather than a detector... It names a specific, mechanical tell and leaves the rewrite to you."* This is the honest version of what every self-graded humanizer skill in §3 implicitly claims to be but is not: a mechanical floor, not an AI-detector verdict.

**One notable irony**: a second AiTells-style repository, [tbhb/vale-ai-tells](https://github.com/tbhb/vale-ai-tells), describes itself in language that is itself a textbook AI-slop demonstration ("game-changer," "supercharges your prose," "delve into the rich tapestry," a rocket emoji) — apparently a deliberate joke, and a useful illustration for the AI-agent angle below: even a tool built to catch AI tells gets shipped with AI-sounding marketing copy around it.

**Classification**: **adopt as dependency**, all of the above except Joblint (explicitly out of scope for software docs) and Harper (complementary local pre-commit layer, not a house-style tool, per this program's own earlier audit).

### 8. Comparison table — all 14 artifacts read in full

| Artifact | URL | Lines | Body structure (routes to depth) | Trigger/description | Enforces | Verification | Design win | Design flaw |
|---|---|---|---|---|---|---|---|---|
| doc-coauthoring | [link](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | 375 | 3 stages: context → refine → reader-test | "user wants to write documentation, proposals, specs" | Nothing mechanical | Fresh-Claude reader simulation | Reader-simulation catches ambiguity a grep can't | Zero lint of any kind |
| writing-skills | [link](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | 679 | Overview → When to Use → Pattern → Quick Ref → Implementation → Mistakes → Impact | "Use when [triggers]" naming convention enforced | Skill-authoring quality | RED-GREEN-REFACTOR against a subagent, 5+ samples/variant | The only reusable *methodology* for proving a rule changes behavior | Meta-skill, not a docs-content skill itself |
| technical-writer (VoltAgent) | [link](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) | 286 | Planning → Implementation → Excellence | "Agent for creating/improving technical documentation" | Unnamed numeric checklist | None — checklist items unfalsifiable | Names 7 stakeholder integration points | Completion message fabricates metrics in its own narrative |
| documentation-engineer (VoltAgent) | [link](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) | 275 | 18 sections, architecture-first | "create, architect, or overhaul comprehensive documentation systems" | Same failure mode, broader scope | None | Broad architecture checklist (versioning, search, contribution) | Same unnamed-formula problem, at greater length |
| humanizer (blader) | [link](https://github.com/blader/humanizer/blob/main/SKILL.md) | 456 | Patterns → false-positives → rewrite process | "removes signs of AI-generated writing" | 35 patterns, 5 categories | Self-check + explicit false-positive section | Calibrates em-dash rule to writer's own baseline; fact-preservation question | Still no automated check |
| anti-ai-slop-writing (jalaalrd) | [link](https://github.com/jalaalrd/anti-ai-slop-writing/blob/main/skills/anti-ai-slop-writing/SKILL.md) | 122 | Before-writing load → structural → punctuation → do-instead → accuracy → self-check | "activates on any writing task" | ~50 words/phrases + per-1000-word budgets | 11-item silent self-check | Only per-word-count numeric budgets found in the family | Instructs "use semicolons," contradicting jalaalrd's own peers and this program's ban |
| humanizer-skill (Aboudjem) | [link](https://github.com/Aboudjem/humanizer-skill/blob/main/skills/humanizer/SKILL.md) | 443 | Quick ref → 55 patterns tiered by evidence → scoring rubric | "Detects 55 AI writing patterns... optional 0-100 score" | 55 tiered patterns | Named formula **+ separate deterministic CLI with a real exit-1 fact-check gate** | Explicitly warns against trusting its own self-grading | The warning is easy to miss if only the score is used, not the CLI |
| stop-slop (hardikpandya) | [link](https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md) | 68 | Core rules → quick checks → scoring | "Remove AI writing patterns from prose" | ~30 rules | Self-graded 1-10 × 5 dims, threshold 35/50 | Shortest, fastest to read; honest about being a manual checklist | Self-graded score with no independent check at all |
| skill.md (Mintlify) | [blog](https://mintlify.com/blog/skill-md) | n/a (product feature) | Decision tables + boundaries + gotchas + links | Auto-served at `/.well-known/skills/default/skill.md` | Nothing itself; documents the product | None named | Purpose-built sibling artifact for exactly this program's reader | Platform-specific auto-regeneration doesn't transfer |
| AGENTS.md starter (Mintlify) | [link](https://github.com/mintlify/starter/blob/main/AGENTS.md) | 33 | About → Terminology (stub) → Style (stub) → Boundaries (stub) | Project-scaffolding template | Active voice, 2nd person, 1 idea/sentence | None | Clean minimal starter shape | Mostly empty placeholders, not a finished contract |
| Style guide + Agent (GitBook) | [styleguide](https://gitbook.com/docs/create-content/styleguide), [agent](https://gitbook.com/docs/gitbook-agent/overview) | n/a (product feature) | Numbered rules (enforced) vs unnumbered (judgment) | Configured per-site by the team | Whatever rules a team writes, numbered | Agent flags numbered-rule violations and cites the ID | The split itself, independently arrived at | Numbering discipline depends entirely on the authoring team |
| documentation-writer (awesome-copilot) | [link](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md) | 45 | Principles → 4 types → workflow → contextual awareness | "Diátaxis Documentation Expert" | 4-question discovery gate | Human "await my approval" only | Short, sharp discovery-question gate | No mixing check at all once writing starts |
| changelog-generator (ComposioHQ) | [link](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/changelog-generator/SKILL.md) | 104 | When-to-use → capabilities → usage → example → tips | "creates user-facing changelogs from git commits" | Keep-a-Changelog-shaped categories | "Review before publishing" — human only | Confirms Keep a Changelog as the de facto standard | Emoji category headers clash with plain-English/no-marketing rules |

### 9. This program's own duplication: the ocx/grimoire fork

This fleet is its own case study in the exact problem this section studies. `ocx-sh/ocx`'s `docs-style.md` (163 lines, glob `website/**`) and `skills/docs/SKILL.md` (53 lines) are hand-forked into `grimoire-rs/grimoire` as `docs-style.md` (124 lines, glob `docs/**`) and `skills/docs/SKILL.md` (46 lines) — copied by hand, not installed via `grim install`, despite `grimoire` being the OCI package manager this research feeds ([config-inventory.md](../docs-audit/config-inventory.md)). Axis-3 analysis of the two files found **no real content conflict**: grimoire's version is "a strict subset-plus-one" of ocx's — same narrative/link/header rules minus VitePress-only bits (the `:::info` callout syntax, the Vue component catalog), plus one rule ocx lacks: a build-time table-parity test (`client_target.rs`, `docs-style.md:82-91`) that fails when a docs table drifts from code.

Axis-2 analysis of the four ocx-origin files (`docs-style.md`, `skills/docs/SKILL.md`, `worker-doc-writer.md`, `subsystem-website.md`) classified each rule's portability directly:

- **Portable as-is**: idea→problem→solution narrative structure; short paragraphs; TOC-readable headers with stable `{#anchor}` syntax; reference-style-only links (stated but never wired to a grep — `grep -n '\]\(https\?://' <file>` catches every violation in one line); every-external-tool-hyperlinked (needs a maintained term list to be checkable in practice); the reference-page contract (purpose sentence + flags table + behavioral notes + error conditions); the Keep-a-Changelog-shaped changelog format (uncredited, but is exactly the public convention); the doc-review trigger matrix pattern (source-file pattern → doc section) even though its rows are ocx's own file paths.
- **Portable only as a re-syntaxed principle**: analogies belong in a collapsible aside, not inline — the `:::info` syntax is VitePress-specific, the practice is not; callout-type taxonomy (info/tip/warning/details) is near-universal Docusaurus/Starlight/VitePress vocabulary once the component name is swapped.
- **Not portable at all**: the four pinned OCX tag/cascade precision facts (correctness facts about *this* product, not a transferable rule); the Vue component catalog; the `task website:build` task name (the *pattern* — docs build as a CI gate — is universal, the task name is not).

**Disposition**: the shipped rule set should supersede both hand-forks' portable content. Neither `ocx` nor `grimoire` should keep a full local copy — both should install the published bundle and retain only a short repo-specific overlay: ocx keeps its VitePress component-syntax pointer, grimoire keeps `client_target.rs` as a named instance of the portable "reference-mirrors-code, structural-drift-gate" pattern this program's rule should generalize, not remove.

### 10. A concrete self-validation loop for this program

Adapting `obra/superpowers`' method (§1) to this program's own rules, not to prompt-engineering in general:

1. **Pick rules with real pressure surfaces.** Three worth testing before shipping, chosen because each has an obvious agent temptation working against it:
   - *No-marketing-tone / landing-page CTA cap* — pressure scenario: "write an exciting hero section for our new SDK's landing page."
   - *Reference-page neutral tone* — pressure scenario: "the new flag is really useful, make sure readers get excited about it in the reference doc."
   - *Type-declaration + mixing check* — pressure scenario: "write comprehensive docs covering everything about the new subsystem" (a request that invites a tutorial/reference/explanation blend in one file).
2. **RED**: run each scenario against a fresh subagent with *no* rule text present. Record the verbatim output and, if the agent explains itself, the verbatim rationalization (e.g., "I added a hero because landing pages need to hook visitors emotionally").
3. **GREEN**: write the smallest rule line that defeats that exact rationalization (a CTA-count cap plus a banned-word grep plus one worked good/bad example, per rule), rerun the same three scenarios, confirm compliance.
4. **REFACTOR**: rerun with 5+ fresh-context samples per rule, always including a no-guidance control sample, and look for a *new* evasion the fix didn't anticipate (e.g., the agent keeps zero CTAs but adds a marketing adjective to the page title instead). Add an explicit counter for each new evasion found; do not add a nuance clause that reopens negotiation — restructure as a conditional rule on an observable predicate instead.
5. **Record** the resulting rationalization table in the rule's own support directory (e.g. `standards/verification-log.md`) so a future rewording of the rule can be checked against every evasion already discovered, rather than starting from zero.

This is deliberately scoped to 2-3 rules, not all of them — obra/superpowers' own method treats this as expensive per-rule work (3+ scenarios, 5+ samples, multiple rounds), and this program's own rule count (~15-20 normative candidates below) makes running the full loop on every rule a phase-5 budget decision, not a phase-6 one.

## Normative guidance candidates

1. **Install Vale with an existing style package (Google or Microsoft) plus `AiTells` and `Readability`; do not re-author a prose-tell wordlist.** Rationale: every humanizer skill surveyed re-derives the same Wikipedia-sourced list with no lint attached; Vale already ships it as enforceable YAML, 17-47 rules per package. Verify: `.vale.ini` names the package; `vale --config=.vale.ini <path>` runs in CI. Evidence: codified.

2. **Split every shipped rule into a numbered, mechanically-enforced tier and an unnumbered, house-style-advisory tier**, mirroring GitBook's `G-10`/`MS-9` vs voice-and-tone split. Rationale: resolves "one voice makes every project sound the same" without dropping the rules that are actually checkable. Verify: the rule file has two labeled sections (e.g. `## Enforced` / `## Advisory`); every row under Enforced carries an ID and an inline command; grep confirms no bare rule lives under Enforced. Evidence: argued (GitBook precedent), normative (this program's decision).

3. **Ship this program's own verification story as an executable log, not a claim.** Rationale: 0 of 14 surveyed artifacts test whether their own rule changes agent behavior; obra/superpowers is the one exception and its method transfers directly (§10). Verify: `standards/verification-log.md` exists per rule family, recording the pressure scenario, the baseline rationalization verbatim, the rule line added, and the retest pass rate across ≥5 fresh samples. Evidence: normative.

4. **Reject any numeric quality score whose formula or tool is not named in the same line.** Rationale: VoltAgent's two subagents and Aboudjem's own 0-100 score both name a number with no formula; a number with no named source is unfalsifiable. Verify: grep every numeric threshold in the shipped rule for an adjacent named tool/formula/citation; fail the rule review if none is found. Evidence: measured (VoltAgent, Aboudjem read directly).

5. **Never adopt a self-graded score (produced by the same model call that wrote the text) as a CI merge gate; keep it, if used at all, as a local pre-commit hint.** Rationale: Aboudjem's own skill states this explicitly — "a model grading its own output in the same session tends to inflate the result" — and hardikpandya/stop-slop's 1-10×5 score has no independent check of any kind. Verify: reading heuristic — does the score's computation depend on the same LLM call that produced the text? If yes, it cannot gate a merge. Evidence: asserted by the source itself (Aboudjem), argued more broadly.

6. **Adopt a fact-preservation diff on any AI-driven prose rewrite pass, modeled on Aboudjem's `cli/index.js compare --check-facts`.** Rationale: it is the one runnable, exit-code-bearing check found in the entire survey, and it catches the specific failure mode a humanizing rewrite invites — silently dropping a number, date, URL, version, or acronym while smoothing the prose. Verify: a script diffing entity extraction (numbers, dates, URLs, versions, acronyms) between before/after text, exiting non-zero on any loss. Evidence: codified (read directly from the CLI's own description).

7. **Date and re-verify every banned-word entry before a refresh ships; drop terms with measured recent decline.** Rationale: Wikipedia's own tracked essay states "delve" usage "dropped off sharply in 2025" — a rule banning it in this program's own September 2026 era catches nothing. Verify: each banned term in the rule's wordlist carries a `(added: <date>, last-checked: <date>)` comment; a periodic script re-runs the grep against a sample of recent real fleet PRs and flags near-zero hit rates for review. Evidence: measured (Wikipedia essay, fetched directly).

8. **Land the fleet's own two docs-style forks by installing the shipped bundle via `grim install` in both `ocx` and `grimoire`, deleting the hand-forked copies, and keeping only the genuinely repo-specific overlay** (ocx's VitePress callout-syntax pointer; grimoire's `client_target.rs` table-parity test, kept as a named instance of the shipped structural-drift-gate pattern). Rationale: axis-3 analysis shows no real content conflict — grimoire's fork is a strict subset-plus-one of ocx's — so the duplication is pure avoidable cost inside the very repo family that owns this package manager. Verify: `grim status` in both repos shows the bundle installed; the local rule file is empty or under ~20 lines of overlay, not a full copy. Evidence: codified (config-inventory.md axis 2/3).

9. **Require every page-type-declaration rule to ship a mixing-check tested against a real fleet page before merge**, not just a routing question list. Rationale: the one Diataxis-routed community skill found (awesome-copilot's `documentation-writer`) asks the four framing questions but names zero mixing check — confirming this gap is generic to surveyed prior art, not an ocx-specific oversight. Verify: run the candidate mixing-check signature against `ocx/website/src/docs/user-guide.md`, report the false-positive rate in the rule's own changelog before shipping. Evidence: measured (direct fetch of awesome-copilot's skill).

10. **Do not adopt a "phase → deliverable narrative" completion template that states a agent-authored success metric in prose.** Rationale: read directly, VoltAgent's `technical-writer.md` example output is a fill-in-the-blanks success narrative with fabricated-looking numbers, not a template for a real measurement — an agent following it states a metrics claim it never measured. Verify: grep any shipped agent/skill file for present-tense, first-person completion narratives with embedded numbers; none should exist without an adjacent named measurement command. Evidence: codified (VoltAgent file read directly).

11. **Keep the changelog rule scoped to Keep a Changelog's plain category headers (Added/Changed/Fixed/Removed/Security); reject emoji-headed categories.** Rationale: ComposioHQ's changelog-generator defaults to emoji section headers (✨🔧🐛), which collides with this program's own no-marketing-tone constraint and is not part of Keep a Changelog's actual spec. Verify: grep generated changelog entries for any emoji character in a heading line; reject the entry if found. Evidence: measured (ComposioHQ's example output read directly).

12. **Adopt the reader-simulation test as a secondary check layered on top of the mechanical lint layer, never as a substitute for it.** Rationale: Anthropic's own official skill catches ambiguity a grep cannot, but on its own (zero lints) it would not have caught what this fleet's own audits already found broken — 555 inline-style links, 343 untagged fenced blocks. Verify: a fresh-context agent session answers a fixed list of 5-10 predicted reader questions about the finished page; failure to answer, or a new gap surfaced, blocks merge alongside (not instead of) the lint results. Evidence: normative, argued from Anthropic's own design plus this fleet's measured gaps.

13. **Calibrate the em-dash/semicolon budget against a measured baseline rather than a flat ban, and flag single instances only in aggregate, never individually.** Rationale: blader/humanizer's own false-positive section states "one em dash proves nothing... evidence only when paired with formulaic rhythm," and jalaalrd's skill instructs the opposite position on semicolons with equally little evidence — a flat rule risks becoming the next unstudied assertion. Verify: a density script (occurrences per 1,000 prose words, code fences excluded) against a stated numeric cap, not a presence/absence grep. Evidence: argued (two contradicting prior-art skills), measured (fleet's own 18.3/1000 baseline from an earlier audit).

14. **Adopt Mintlify's decision-table + explicit-boundaries + gotchas shape for how this program's own rule and skill documents itself to a machine reader**, not the auto-regeneration mechanism. Rationale: skill.md is the one sibling artifact class purpose-built for exactly this program's own reader; static-hosting auto-regeneration doesn't transfer. Verify: reading heuristic — does the rule's own README contain a decision table and a named "Gotchas" or "Common mistakes" section, not prose narrative only. Evidence: argued (Mintlify's stated design rationale).

15. **State a self-check-vs-lint boundary explicitly on every rule that genuinely cannot be mechanically checked** — use the literal string "unverified: reading heuristic," not silence. Rationale: 12 of 14 surveyed artifacts carry zero lint and none labels the absence; this program's own frame already requires a verification per rule, so an unlabeled gap repeats the exact failure this section exists to prevent. Verify: grep the rule file for every rule row; any row lacking an adjacent command or lint name must carry the literal marker. Evidence: normative, measured against this program's own ~92-rule/2-verification fleet baseline.

16. **Where a rule genuinely needs a discovery-questions gate before writing (type, audience, goal, scope), require it to declare what happens if the writer never answers**, rather than defaulting to "await approval" as the only fallback. Rationale: awesome-copilot's `documentation-writer` has no fallback beyond a blocked human wait, which does not work in an unattended agent pipeline with no human approver in the loop. Verify: the skill states an explicit default (e.g., "if unstated, assume how-to for a task-shaped request, reference for an enumerable one") and a mixing check that fires if the default guess turns out wrong mid-draft. Evidence: measured (awesome-copilot's skill read directly), normative for this fleet's own unattended-agent context.

## AI-agent angle

- **Fabricates a completion narrative instead of reporting a real result.** VoltAgent's subagents template a plausible-sounding success message ("92% satisfaction, 73% reduction") with no measurement behind it — an unprompted LLM reaches for the same move: state a confident-sounding number to close out a task. Smallest check: grep the agent's own sign-off message for a percentage or absolute count with no adjacent tool-invocation or file reference producing it.
- **Grades its own homework and calls it verification.** Two of the four humanizer skills (Aboudjem, hardikpandya) compute a "humanness score" using the same model call that just wrote the text — Aboudjem's own file names this failure mode directly. Smallest check: the reading heuristic in candidate 5 above — trace whether the score's inputs come from an independent tool call or the same generation pass.
- **Re-derives a taxonomy instead of citing it.** Four independent skills reinvent the same ~35-55-item AI-tell pattern list, all ultimately from one Wikipedia essay, none crediting a shared source in a way that lets a maintainer update all four at once. Smallest check: grep a new skill's pattern list for ≥10 items overlapping Wikipedia's "Signs of AI writing" categories with no citation link — a strong signal it was re-derived rather than imported.
- **Bans a stale tell as if it were current.** "Delve" is the textbook 2023-era AI tell; Wikipedia's own tracked page shows its usage "dropped off sharply in 2025." An agent asked to "add AI-tell detection" reaches for the famous 2023 examples by default, not what is actually common in 2026 model output. Smallest check: date every banned term (candidate 7) and re-run the grep against a recent sample before trusting a hit rate.
- **Writes the marketing copy it was told to avoid, around the tool meant to catch it.** `tbhb/vale-ai-tells`'s own repository description is written in textbook AI-slop ("game-changer," "supercharges," "delve into the rich tapestry," a rocket emoji) while describing a tool that detects exactly those patterns — a vivid illustration that instructing an agent "write plainly" and actually verifying plain writing are two different things. Smallest check: run the shipped `AiTells` package against this program's own README and rule files, not only against the docs it governs.
- **Treats a discovery-question gate as sufficient and never revisits the answer.** Both awesome-copilot's Diataxis skill and Aboudjem's tiered pattern list note related risks in their own text (no mixing check; low-variance writers scoring falsely high) but neither one builds a re-check into the writing loop itself — an agent asks the framing questions once, then drifts. Smallest check: candidate 9's mixing-check test, run at the end of drafting, not only before it starts.
- **Adds a hero, a CTA row, or an "exciting" adjective under any request framed as promotional**, even when a page-type rule says otherwise, because "landing page" and "exciting" co-occur constantly in its training distribution. Smallest check: candidate 13's density script plus the pressure-scenario test in §10 — a static read of the rule text does not catch this; a live agent has to be tested against the temptation.

## Contested / evolving

**Resolved — the conflict this topic owns**: *"One shipped house voice as pure upside vs a cost that makes every project sound alike"* (GitBook, [codified-practice.md](../docs-topic-map/codified-practice.md)). Resolution: split the shipped rule into numbered, mechanically-enforced content (link hygiene, header/anchor conventions, changelog format, page-type declaration, the AI-tell wordlist) and unnumbered, house-style-labelled voice/tone guidance that a project may opt out of or override. This is not an invented compromise — [GitBook's own style-guide feature](https://gitbook.com/docs/create-content/styleguide) independently implements exactly this split for the same reason (voice cannot be flagged as a violation the way a numbered rule can), so the resolution has a working precedent, not just an argument.

**Genuinely unresolved, as of September 2026**:

- **Whether a "humanness score" can ever be a legitimate CI gate.** Aboudjem's skill both computes one and warns against trusting it; hardikpandya's skill computes one with no warning at all. No source found validates any of the coefficients (4×patterns_hit + 25×burstiness + 15×vocabulary_ratio, or the 1-10×5 dimension sum) against a ground truth. Trend: toward "signal, not verdict," per Aboudjem's own framing — but this is one skill author's stated caution, not an industry consensus, and hardikpandya's skill (68 lines, no caution) coexists with it in the same ecosystem right now.
- **Semicolon usage as an AI tell.** Directly contested between two artifacts in this same survey (jalaalrd says use them because AI underuses them; this fleet's own frame bans them as an AI tell). Wikipedia's essay — the shared source both sides claim descent from — does not mention semicolons at all. This is not a "some sources disagree" case; it's a case where the cited common ancestor supports neither position, and both are unsourced house-style choices. Cannot be resolved with the evidence in hand; state it as house style, not a detector, per the frame's own earlier correction.
- **Whether AI-agent traffic changes what "good" docs prose looks like.** GitBook's own data shows the majority-reader shift is real (51.8% by intentional reads, April-May 2026) but GitBook's own conclusion is that it changes nothing about voice — the same structural clarity serves both readers. This is one vendor's stated position, based on their own traffic, not a controlled study; it is directionally consistent with Cloudflare's and Vercel's parallel argument (cited in the sibling `agent-readable-surface` topic) that structure, not tone, is the lever — but "consistent across three vendors" is not the same evidentiary weight as a study, and should be labeled as such if cited in the shipped rule.
- **Whether a discovery-question gate needs a machine-checkable fallback for unattended pipelines.** Every routed-writing skill found (Anthropic's, awesome-copilot's) assumes a human answers the framing questions ("await my approval"). None ship a fallback for a pipeline with no human in the loop, which is this program's own explicit operating context. Trend: none visible yet in the wider ecosystem toward solving this — it is this program's own gap to close (candidate 16), not one to import from prior art.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/anthropics/skills — doc-coauthoring/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | Anthropic's official docs-writing skill | Current, fetched 2026-09 | Primary: the reference implementation this program is judged against; 375 lines confirmed by direct fetch |
| [github.com/obra/superpowers — writing-skills/SKILL.md](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | Community skill-authoring methodology | Current, fetched 2026-09 | Primary: the only reusable RED-GREEN-REFACTOR verification methodology found in the survey |
| [VoltAgent/awesome-claude-code-subagents — technical-writer.md](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) | Community subagent definition | Current, fetched 2026-09 | Primary: shows the fabricated-completion-narrative failure mode directly |
| [VoltAgent/awesome-claude-code-subagents — documentation-engineer.md](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) | Community subagent definition | Current, fetched 2026-09 | Primary: same failure mode at broader architectural scope |
| [github.com/blader/humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) | Anti-AI-slop skill, 35 patterns | Current, v2.11.2, fetched 2026-09 | Primary: best-designed single-file humanizer, explicit false-positive handling |
| [github.com/jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing/blob/main/skills/anti-ai-slop-writing/SKILL.md) | Anti-AI-slop skill, ~50 patterns | Current, fetched 2026-09 | Primary: only per-word-count numeric budgets found; contradicts peers on semicolons |
| [github.com/Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill/blob/main/skills/humanizer/SKILL.md) | Anti-AI-slop skill, 55 patterns + deterministic CLI | Current, fetched 2026-09 | Primary: the one artifact with a real exit-code CI gate (fact-preservation check) |
| [github.com/hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md) | Anti-AI-slop skill, ~9.8k GitHub stars | Current, fetched 2026-09 | Primary: shortest, most-starred, and least-rigorous verification of the four |
| [mintlify.com/blog/skill-md](https://www.mintlify.com/blog/skill-md) | Mintlify's skill.md announcement | 2026, fetched directly | Primary: sibling artifact class to this program's own output |
| [github.com/mintlify/starter — AGENTS.md](https://github.com/mintlify/starter/blob/main/AGENTS.md) | Example AGENTS.md template | Current, fetched 2026-09 | Primary: default style preferences for an agent-facing docs-instruction file |
| [mintlify.com/docs/guides/style-and-tone](https://www.mintlify.com/docs/guides/style-and-tone) | Mintlify's own style guide | Current, fetched 2026-09 | Primary: concrete numeric guidance (sentence/paragraph length) from a docs platform vendor |
| [gitbook.com/docs/create-content/styleguide](https://gitbook.com/docs/create-content/styleguide) | GitBook style-guide feature docs | Current, fetched 2026-09 | Primary: the numbered-rule vs voice-as-judgment split this program adopts directly |
| [gitbook.com/docs/gitbook-agent/overview](https://gitbook.com/docs/gitbook-agent/overview) | GitBook Agent product docs | Current, fetched 2026-09 | Primary: confirms the Agent enforces the style guide as source of truth |
| [gitbook.com/blog/ai-docs-data-april-2026](https://www.gitbook.com/blog/ai-docs-data-april-2026) | GitBook traffic-data blog post | Published 2026-05-13, fetched directly | Primary: measured AI-vs-human docs traffic share, and GitBook's own no-special-voice conclusion |
| [en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | Wikipedia essay, maintained AI-tell taxonomy | Actively maintained, fetched 2026-09 | Primary: the shared source all four humanizer skills claim descent from; shows "delve" declining sharply in 2025 |
| [vale.sh/hub](https://vale.sh/hub/) | Vale's style-package directory | Current, fetched 2026-09 | Primary: exact rule counts for every named package |
| [github.com/krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells) | Community Vale AiTells package | Current, fetched 2026-09 | Primary: confirms 17 rules / 6 error-level with exact rule names |
| [github.com/github/awesome-copilot — documentation-writer/SKILL.md](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md) | Diataxis-routed community skill | Current, fetched 2026-09 | Primary: confirms the "no mixing check" gap independently of this fleet |
| [github.com/ComposioHQ/awesome-claude-skills — changelog-generator/SKILL.md](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/changelog-generator/SKILL.md) | Community changelog-writing skill | Current, fetched 2026-09 | Primary: confirms Keep a Changelog as unattributed industry default; shows the emoji-header anti-pattern |
| [docs-audit/config-inventory.md](../docs-audit/config-inventory.md) | This program's own fleet audit | 2026-09-05 | Internal: the ocx/grimoire fork axis-2/axis-3 analysis this section's §9 builds on |
| [docs-topic-map/codified-practice.md](../docs-topic-map/codified-practice.md) | This program's own scout report | 2026-09-05 | Internal: names the sources and conflict this topic was commissioned to resolve |
| [github.com/tbhb/vale-ai-tells](https://github.com/tbhb/vale-ai-tells) | Alternate community AiTells package | Current, noted via search | Secondary: not independently fetched in full; its self-descriptive AI-slop framing is cited only as an illustration, cross-checked against its own repo description text returned in search results |
| skills.sh, awesome-claude-skills, awesome-cursorrules directories | Public skill/rule indexes | Current, searched 2026-09 | Secondary: used to locate the specific artifacts above (humanizer variants, Diataxis skill, changelog skill); the directories themselves are indexes, not read as single documents |
