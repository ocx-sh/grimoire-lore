---
title: Codified documentation practice — landscape scout
topic: docs
agent: docs-topic-map/codified-practice
model: sonnet
date_researched: 2026-09-05
sources_count: 24
scope: |
  Covers Part A (Vale + community style packages, markdownlint, textlint/remark-lint,
  readability formulas, plain-English standards, AI-writing-tell catalogues, inclusive-
  language linters) and Part B (existing AI skills/rules/agents for documentation
  writing: Anthropic's own skill, community subagent collections, humanizer/anti-slop
  skills, Mintlify/GitBook AI-docs guidance, Diataxis-based practice). Does not cover
  general UX research methods beyond what a docs team specifically codified (no new
  card-sorting studies run), and does not evaluate any specific fleet repo's docs
  quality — that is the grounding wave's job, not this scout's.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Vale and the style-package ecosystem](#1-vale-and-the-style-package-ecosystem)
   2. [Markdown structure linters](#2-markdown-structure-linters)
   3. [Readability formulas and their shipped thresholds](#3-readability-formulas-and-their-shipped-thresholds)
   4. [Plain-English standards bodies](#4-plain-english-standards-bodies)
   5. [AI-writing tells as a codified, checkable corpus](#5-ai-writing-tells-as-a-codified-checkable-corpus)
   6. [Existing AI skills/agents for documentation](#6-existing-ai-skillsagents-for-documentation)
   7. [Docs-for-agents: llms.txt, skill.md, AGENTS.md](#7-docs-for-agents-llmstxt-skillmd-agentsmd)
   8. [Documentation observability, measured](#8-documentation-observability-measured)
   9. [Information architecture and use-case discovery](#9-information-architecture-and-use-case-discovery)
   10. [Accessibility and link integrity](#10-accessibility-and-link-integrity)
   11. [API-reference drift](#11-api-reference-drift)
3. [Candidate topics](#candidate-topics)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Vale's own hub ships a "Readability" package and an "AiTells" package as first-class style families, alongside Google/Microsoft/Red Hat — AI-tell detection and readability are already inside the codified-practice canon, not a fringe idea this program is inventing ([Vale hub](https://vale.sh/hub/)).
- The only readability threshold independently confirmed in a shipped rule file is Vale's `Readability/FleschKincaid.yml`: grade level `> 8` fires at `suggestion` severity, not `error` — the tooling itself treats reading-grade as advisory, never a hard gate ([errata-ai/Readability](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml)).
- GOV.UK's own target is a reading age of 9 for *citizen-facing* content — a number regularly misapplied to developer docs, where jargon (`OCI`, `sha256`, flag names) is unavoidable and unpenalized by design; the frame's plain-English hypothesis needs a carve-out for reference pages, not a blanket grade cap.
- Google's Vale style ships 36 rules, Microsoft's ships 47 — both name `Passive.yml`, `Contractions.yml`, `OxfordComma.yml`, `Headings.yml` individually; Microsoft alone adds `SentenceLength.yml`, meaning "keep sentences short" is checkable today, not just an opinion ([Google rules](https://github.com/errata-ai/Google/tree/master/Google), [Microsoft rules](https://github.com/errata-ai/Microsoft/tree/master/Microsoft)).
- "AI slop" has a maintained taxonomy far bigger than em-dash/semicolon: Wikipedia's own "Signs of AI writing" essay documents heading-only sections, skipped heading levels, bold-mini-heading lists, "not just X but Y," rule-of-three, copula avoidance ("serves as" instead of "is"), vague attribution ("researchers argue"), and leftover chatbot artifacts ("I hope this helps") — a far richer checklist than the frame's four named tells ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)).
- At least four independent Vale-compatible or standalone "humanizer" skills already exist for coding agents (`blader/humanizer`, 35 patterns; `jalaalrd/anti-ai-slop-writing`; `Aboudjem/humanizer-skill`; `hardikpandya/stop-slop`), all citing the same Wikipedia essay as their source of truth — this program should cite that essay directly rather than re-deriving the list.
- Anthropic's own `doc-coauthoring` skill (375 lines) does not carry a single lint or numeric check — its only verification step is "hand the doc to a fresh Claude with no context and see if it answers reader questions correctly," a reader-simulation test, not a grep ([anthropics/skills doc-coauthoring](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md)).
- `obra/superpowers`'s `writing-skills` skill applies TDD to skill-authoring itself: run a pressure scenario with a subagent *without* the skill, capture the verbatim rationalization, write the smallest skill line that defeats it, re-test — a pattern this program's own rule/skill pair should borrow for its own verification story ([obra/superpowers writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md)).
- Community "technical-writer" and "documentation-engineer" subagents (VoltAgent's 158-agent collection) gate on numeric thresholds like "readability score > 60" and "page load time < 2s" but never name which formula produces "60" or how it's computed — a checklist that looks verified but is not ([VoltAgent technical-writer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md)).
- Diataxis (tutorial / how-to / reference / explanation) is the dominant docs-type framework in the wild and is *already partially adopted inside the fleet*: `ocx`'s `worker-doc-writer.md` tells the writer to "identify Diátaxis type" before writing, but the enforced rule file (`docs-style.md`) never checks or names it — a gap between agent instruction and rule enforcement worth closing ([Diátaxis](https://diataxis.fr/), local: `ocx/.claude/agents/worker-doc-writer.md`).
- Gerry McGovern's "Top Tasks" methodology is the closest existing codification of the frame's use-case-tier hypothesis: gather ~150 candidate tasks, have ~400 real users vote, keep the ranked shortlist, then track a Task Performance Indicator (success rate × time-on-task) twice a year — this is a research *method* with a repeatable measurement, not a one-time guess ([MeasuringU: Top Task Analysis](https://measuringu.com/top-tasks/)).
- "Time to first successful call" is the one metric the API-docs industry has converged on as the north star for onboarding docs; Stripe's public case (8 hours → under 10 minutes) is the industry's own proof point — this is a stronger, more specific observability claim than "measure if docs work" ([Fern / TTFS coverage synthesized from search](https://buildwithfern.com/post/developer-documentation-metrics)).
- Zero-result search-query mining is a mature, named practice outside docs (ecommerce, support) that transfers directly: a docs search box's zero-result queries are literally readers naming the page that doesn't exist yet — an "overlap test" distinguishes an IA/synonym problem from an actual content gap.
- `llms.txt` (proposed Sept 2024) sits at only 5–15% adoption among tech/doc sites by mid-2026 despite being called the "gold standard" for AI-native companies — treat it as a low-cost addition, not yet an obligatory one ([llms.txt guide, 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/), [llmstxt.org](https://llmstxt.org/)).
- Mintlify's `skill.md` (a single `/.well-known/skills/default/skill.md` file, auto-regenerated per doc update) is a genuinely new artifact class this program's own output resembles — decision tables, explicit boundaries, "common gotchas," and a link back to the fuller docs — worth studying as a sibling format, not a competitor, to the shipped rule+skill pair ([Mintlify: skill.md](https://www.mintlify.com/blog/skill-md)).
- GitBook's stated design principle — write the voice down as a rule an agent can follow ("we say 'you can't do X yet,' not 'unfortunately, X is not currently supported'") — is the clearest existing articulation of "house voice as a checkable contract," and it flags the failure mode of universal AI-docs voice: over-applied, it makes every product's docs sound the same.
- `alex`, Vale's `BiasFree.yml`/`Gender.yml`, and the Conscious Style Guide together form a mature, three-decades-deep inclusive-language corpus that neither the frame nor ocx's `docs-style.md` currently references at all — a clean gap.
- Lychee (Rust, async, Markdown/HTML-native) is the current default link-checker for docs CI, distinctly newer/faster than `markdown-link-check`, and it is a two-line GitHub Action, not a research problem — link rot has an off-the-shelf fix the fleet is not shown to be using.
- `ocx`'s own tested-doc-command ADR (accepted 2026-05-17) is the fleet's single most rigorous piece of already-codified docs practice found anywhere in this research — every documented command is an acceptance-tested script, cast generation is opt-in per script, and a stale command fails `task verify` red — this should be the shipped artifact's worked example, exactly as the frame instructs (local: `ocx/.claude/artifacts/adr_tested_doc_command_mechanism.md`).
- Joblint — named explicitly in the task brief as part of the Vale corpus — checks job-posting language for bias and unrealistic-expectations phrasing; it has no application to software documentation at all and should be dropped from this program's radar rather than force-fit.

## Findings

### 1. Vale and the style-package ecosystem

Vale is a markup-aware, cross-platform CLI prose linter (Go), run at AWS, NVIDIA, Microsoft, GitLab, and Red Hat, that applies YAML-defined "styles" to Markdown/AsciiDoc/reST ([Vale](https://vale.sh/)). Its public hub lists, per style, an exact rule count:

| Style | Rule count | What it checks |
|---|---|---|
| Google | 36 | Google Developer Documentation Style Guide — contractions, passive voice, headings, Oxford comma, jargon, gender-neutral language, first person, "will"/future-tense claims ([rule list](https://github.com/errata-ai/Google/tree/master/Google)) |
| Microsoft | 47 | Microsoft Writing Style Guide — adds `SentenceLength.yml`, `Accessibility.yml`, `Militaristic.yml`, `UIVerbs.yml`, `Wordiness.yml` beyond Google's set ([rule list](https://github.com/errata-ai/Microsoft/tree/master/Microsoft)) |
| Red Hat | 37 | Red Hat Supplementary Style Guide |
| write-good | — | "naive linter for English prose" — filler, weasel words, passive voice, lexical illusions |
| proselint | 34 | clarity/register issues drawn from usage guides |
| alex | 11 | insensitive/inconsiderate language (built on `retext-equality`/`retext-profanities`) |
| neighbor | 13 | accessibility-oriented inclusive language — ableist terms, exclusionary metaphors |
| Joblint | 17 | job-posting bias, unrealistic expectations, recruiter red flags — **not applicable to software docs** |
| Readability | 7 | popular readability metrics as Vale rules (only `FleschKincaid` independently confirmed below) |
| AiTells | 17 (6 gate as errors) | "the tells of AI-written prose: em-dash habits, epigrams, abstract-noun triads, clichés" |
| Harper | 547 | a full Rust-native grammar checker, not a Vale style — offline, sub-millisecond, English-only ([Automattic/harper](https://github.com/automattic/harper)) |

Source: [Vale hub](https://vale.sh/hub/), cross-checked against the Google and Microsoft rule-file listings above.

### 2. Markdown structure linters

`markdownlint` (DavidAnson) ships 50+ numbered rules (MD001–MD060, several retired) covering heading hierarchy (MD001, MD003, MD025 "only one H1"), list formatting (MD004, MD005, MD007, MD029, MD030), whitespace (MD009, MD010, MD012), link hygiene (MD011 reversed syntax, MD034 bare URLs, MD042 empty links, MD051/MD052 broken fragments/reference labels, MD059 "link text should be descriptive"), code fences (MD031, MD040 "language required", MD046, MD048), and accessibility (MD045 "images should have alternate text") ([Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)). This is the layer that catches structural AI tells (skipped heading levels, heading-only sections) mechanically, distinct from Vale's prose layer.

`remark-lint` is the same idea built on the unified/remark AST rather than regex, published as many small `remark-lint-*` plugins composed into presets (`remark-preset-lint-recommended`, `remark-preset-lint-consistent`); community plugins extend it to alt-text (`remark-lint-alt-text`) and link validity (`remark-lint-are-links-valid`) (source: [GitHub topic: remark-lint](https://github.com/topics/remark-lint)).

textlint applies the same idea to natural-language rule packages (e.g. `textlint-rule-preset-ja-technical-writing`), distinguishing itself by shipping rule *presets* per language/domain rather than one monolithic style.

### 3. Readability formulas and their shipped thresholds

The only default threshold directly confirmed by reading the shipped rule file: Vale's `Readability/FleschKincaid.yml` computes `(0.39 × words/sentence) + (11.8 × syllables/word) − 15.59` and fires at `suggestion` level when the result exceeds grade `8` ([raw YAML](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml)). The Vale hub's own count (7 rules in the Readability package) implies the remaining six are the other standard formulas (Gunning Fog, SMOG, Coleman-Liau, Automated Readability Index, LIX, Flesch Reading Ease) but their individual thresholds were not independently confirmed in this pass — treat the "8" figure as the only load-bearing number, everything else as "likely present, unverified default."

GOV.UK's target, cited widely (design.homeoffice.gov.uk, servicemanual.gov.scot, secondary sources), is a reading age of **9** for all GOV.UK content — a citizen-facing standard, explicitly not "write for a 9-year-old" but "make it fast to scan, tired-reader-proof, first-language-agnostic." Nothing in the fetched GOV.UK guidance pages ties this to a specific formula; the number is a policy commitment, not a Vale rule.

### 4. Plain-English standards bodies

The U.S. Plain Writing Act of 2010 is the legal basis for `plainlanguage.gov` (now `digital.gov/guides/plain-language`); its guidance is directional ("shorter words," "active voice," "present tense," "short sections") with **no numeric sentence-length or grade-level target stated on the guide pages themselves** ([digital.gov/guides/plain-language](https://digital.gov/guides/plain-language)) — a genuine gap between the U.S. federal standard's reputation and its actual specificity, worth naming explicitly rather than assuming a number exists.

### 5. AI-writing tells as a codified, checkable corpus

Wikipedia's "Signs of AI writing" essay is the most exhaustive catalogue found, spanning five layers: content patterns (significance overemphasis, vague attribution, formulaic "Despite its X, faces challenges" conclusions), linguistic markers ("AI vocabulary" cluster: delve, crucial, underscore, intricate, pivotal, tapestry, testament, foster; copula avoidance — "serves as" for "is"; negative parallelism — "not just X but Y"; rule-of-three), structural patterns (heading-only sections, skipped heading levels, bold mini-headings inside lists, emoji as formatting), typography (em dash, curly quotes overuse), and chatbot-artifact leftovers ("I hope this helps," knowledge-cutoff disclaimers) ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)). The essay itself notes human judgment alone performs at chance on single-instance detection, while heavy LLM users reach ~90% — i.e., the signal is real in aggregate but a single flagged sentence is a weak individual proof.

At least four independent Claude/agent skills operationalize this exact list: `blader/humanizer` (35 patterns, two-pass rewrite-then-critique, no numeric score — human judgment closes the loop), `jalaalrd/anti-ai-slop-writing`, `Aboudjem/humanizer-skill` ("55 patterns, 5 voices, a 0–100 AI-tell score"), `hardikpandya/stop-slop`. Vale's own `AiTells` package (17 rules, 6 gate as errors) is the mechanical-check version of the same list, splitting the literal double-hyphen ("the ASCII stand-in AI types when it cannot produce an em dash") from real em-dash usage because the fix differs.

### 6. Existing AI skills/agents for documentation

Anthropic's own `doc-coauthoring` SKILL.md (375 lines, `anthropics/skills`) is a three-stage workflow — context gathering, section-by-section drafting with brainstorm/curate/draft/refine, then "reader testing" (predict 5–10 questions a reader would ask, hand the finished doc to a *fresh* Claude with no conversation context, see if it answers correctly) ([source](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md)). It carries zero lints or numeric checks; its entire verification story is the reader-simulation loop.

`obra/superpowers`'s `writing-skills` SKILL.md (679 lines) is not a docs-writing skill but a skill for *writing skills*, applying RED-GREEN-REFACTOR: run a pressure scenario with a subagent lacking the skill, capture the verbatim rationalization it gives for skipping the rule, write the smallest skill text that defeats that rationalization, re-test with 5+ fresh samples per wording variant ([source](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md)). This is directly reusable: this program's own rule set should be validated the same way (does a fresh agent given the rule actually stop doing the flagged thing?) rather than assumed correct because it reads well.

VoltAgent's `awesome-claude-code-subagents` (158+ agents) ships `technical-writer` and `documentation-engineer` — both haiku-model agents with `Read, Write, Edit, Glob, Grep, WebFetch, WebSearch` tools, both structured as three phases (audit → implement → verify) and both gating on checklist items like "readability score > 60," "API documentation 100% coverage," "page load time < 2s," "accessibility WCAG AA compliant" ([technical-writer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md), [documentation-engineer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md)). None of the fetched pages name which formula produces "60," what tool measures "page load time," or how "100% coverage" is computed — these read as verified but are unfalsifiable as written, exactly the failure mode this program's own rules must not repeat.

### 7. Docs-for-agents: llms.txt, skill.md, AGENTS.md

`llms.txt` (proposed Sept 2024, spec revised through 2026) is a Markdown file at the site root: required H1 (project name), required blockquote (one/two-sentence summary), optional free paragraphs, then H2 "file list" sections of `[name](url): notes` links to curated pages ([llmstxt.org](https://llmstxt.org/)). Adoption sits at 5–15% of tech/doc sites by 2026 despite being called the "gold standard" among AI-native companies (Anthropic, Cursor, Vercel) — this program should recommend it as a cheap addition, not oversell its current ubiquity.

Mintlify's `skill.md` (`/.well-known/skills/default/skill.md`, auto-regenerated per doc update, installable into 20+ agents via Vercel's skills CLI) consolidates agent-specific guidance — decision tables, explicit boundaries, common gotchas — that "documentation usually scatters across dozens of pages, or skips entirely because it would overwhelm human readers" ([Mintlify: skill.md](https://www.mintlify.com/blog/skill-md)). `AGENTS.md` (root-level, case-sensitive filename) is the third convention, carrying repo-specific instructions (code-example standards, style rules) for coding agents specifically, distinct from doc-site llms.txt for chat/search agents ([mintlify/starter AGENTS.md](https://github.com/mintlify/starter/blob/main/AGENTS.md)). As of Sept 2026 these three formats (llms.txt, skill.md, AGENTS.md) are not unified — a project may need more than one.

GitBook's framing: "the majority of readers of documentation are now AI agents that read docs, paraphrase them, and hand answers to people" — every doc page now has two audiences with different needs, and GitBook's own Agent product "lints human-created content against your style guide before publishing" (source: GitBook blog, synthesized from search snippets, not independently fetched in full — treat as secondary).

### 8. Documentation observability, measured

"Time to first successful [API] call" (TTFS) is the converged north-star metric for developer-onboarding docs; Stripe's public case (8 hours → under 10 minutes after adding interactive examples and a sandbox, 92% of signups making a test call within 24 hours) is the industry's standard reference point. A commonly cited starting target is reducing median TTFS ~30% over 90 days for one target flow.

Zero-result search-query mining is mature outside docs (ecommerce, support desks) and transfers directly: a documented "overlap test" distinguishes a search/IA problem (missing synonyms, bad tagging) from an actual content gap (no page exists for what's being searched) — a B2B case found 23% zero-result queries concentrated in three topic clusters (competitive positioning, implementation troubleshooting, pricing).

Gerry McGovern's Top Tasks methodology is the most rigorous pre-existing codification of "discover your own use-case tiers": gather a comprehensive list of candidate tasks (his own first exercise reached ~150), refine with stakeholders to a shortlist, have a representative sample of real users (~400) vote for their most important, then track a Task Performance Indicator — success rate × time-on-task — every six to twelve months ([MeasuringU: Top Task Analysis](https://measuringu.com/top-tasks/)). This is the closest existing analogue to the frame's use-case-tier hypothesis and should be cited as prior art rather than reinvented.

### 9. Information architecture and use-case discovery

Diátaxis (tutorials / how-to guides / reference / explanation) is the dominant docs-type taxonomy in current practice, adopted at Cloudflare, Gatsby, Vonage among others, organized around a "compass": tutorials and how-tos are about *action*, reference and explanation are about *cognition* — the two axes (action↔cognition, study↔work) are what generate the four quadrants, not an arbitrary four-way split ([diataxis.fr](https://diataxis.fr/)). It is already referenced inside the fleet — `ocx/.claude/agents/worker-doc-writer.md` instructs the writer to "identify Diátaxis type" — but the enforced rule (`docs-style.md`) never names or checks it, a real gap between instruction and enforcement.

### 10. Accessibility and link integrity

WCAG 2.2 (current since Oct 2023) requires 4.5:1 contrast for normal text regardless of light/dark mode; dark mode is not itself an accessibility feature and does not exempt a site from contrast checks — SC 1.4.11 (non-text contrast, 3:1) matters more in dark mode because "subtle" light-mode UI elements go invisible on a dark background. Some docs sites hold code-block syntax highlighting to AAA's 7:1 in both themes independently, stricter than the AA baseline.

Lychee (Rust, async, native Markdown/HTML support) is the current default link-checker for docs CI — a two-line GitHub Action (`lycheeverse/lychee-action`) scanning ~576 links in ~1 minute, configurable via `.lycheeignore`, distinctly faster than the older `markdown-link-check` ([lychee](https://github.com/lycheeverse/lychee)). Link rot has an off-the-shelf, near-zero-effort fix; a docs rule set that only says "verify links point to real sections" (as `ocx/.claude/rules/docs-style.md` does, prose-only) is leaving a two-line CI job on the table.

### 11. API-reference drift

Current practice (2026) treats the machine-readable spec (OpenAPI, AsyncAPI, gRPC/protobuf, or a vendor-neutral "Fern Definition") as the single source of truth, generating the human docs site, the token-efficient Markdown/llms.txt version, and SDK examples from one artifact on one commit — the goal being to remove the *interval* in which docs and implementation can diverge, not just to catch drift after the fact. Contract-testing the live API against the spec in CI, failing the build on mismatch, is the recommended gate. This generalizes `ocx`'s own CLI-reference approach (`command-line.md` has "its own structural gate," per the local ADR) to any spec-described surface, and is a stronger claim than "keep docs in sync" — it names the mechanism (single artifact, one commit, contract test) rather than the goal.

## Candidate topics

| slug | label | why it matters | source | covered? | priority | doc type |
|---|---|---|---|---|---|---|
| readability-threshold | What numeric grade-level gates a merge, and at what severity? | Only verified number in this whole corpus: FK grade `>8` → *suggestion*, never *error* — a hard gate needs its own justification | Vale Readability | no | high | cross-cutting |
| readability-formula-choice | Which formula (FK vs Gunning Fog vs SMOG) suits docs full of code identifiers none were designed to score? | All formulas count syllables/words; `sha256`, `--flag-name`, `OCIImageIndex` break every one of them | Vale Readability hub | no | high | cross-cutting |
| reading-age-vs-jargon | Does a reading-age target apply to reference pages at all, or only to landing/guide prose? | GOV.UK's "9" is a citizen-facing number; a CLI flag reference cannot avoid jargon by definition | GOV.UK reading age | no | high | reference |
| diataxis-classification | Does every page declare its Diátaxis type, and is type-mixing inside one page flagged? | Already instructed in `ocx`'s agent file but not enforced by its rule | diataxis.fr; ocx worker-doc-writer.md | partial | high | cross-cutting |
| use-case-tier-discovery | How does a project surface its own top tasks instead of assuming them? | Top Tasks is a repeatable *method* (vote + TPI), not a one-time guess | McGovern / MeasuringU | no | high | process |
| time-to-first-success | What's the measured minutes-to-first-success on the quickstart, and the target delta? | Converged industry north-star metric; Stripe's 8h→10min is the reference case | Fern/Stripe TTFS | no | high | landing/guide |
| zero-result-queries | What % of docs-search queries return zero results, and which clusters? | Direct, unsolicited signal of exactly which page doesn't exist yet | zero-result mining articles | no | high | process |
| link-rot-ci-gate | Is an automated link checker running in CI, and at what failure threshold? | Off-the-shelf two-line fix (lychee); prose-only "verify links" is not enforcement | lychee | no | high | process |
| ai-agent-readers | Does the site publish an llms.txt/skill.md/AGENTS.md, and which convention? | Three competing, non-unified formats exist; a project may need more than one | llmstxt.org; Mintlify skill.md | no | high | cross-cutting |
| ai-tells-checklist-completeness | Which of the ~20+ documented AI tells (not just em-dash/semicolon) does the shipped rule actually check? | Wikipedia's catalogue is 5x richer than the frame's four named tells | Wikipedia Signs of AI writing | partial | high | cross-cutting |
| heading-tell-check | Are heading tells (title case, skipped levels, heading-only sections) checked mechanically? | markdownlint already has MD001/MD003/MD025/MD036 off the shelf | markdownlint | partial | high | cross-cutting |
| link-style-lint | Is reference-style-only linking enforced by a lint, or only stated in prose? | `ocx` states the rule in prose with no lint backing it — exactly the gap the frame's "every rule needs verification" constraint targets | ocx docs-style.md; remark-lint | partial | high | cross-cutting |
| hedging-filler-check | Is hedging/filler ("it's worth noting," "simply," sycophantic openers) grepped, distinct from em-dash/semicolon? | Frame names hedging generically; no fleet rule checks it today | humanizer patterns; Mintlify style guide | partial | high | cross-cutting |
| dual-audience-pages | Does a page's prose serve both a human skimmer and an LLM paraphraser with different needs (tables vs narrative)? | Genuinely new framing the frame's UX hypothesis doesn't name | GitBook dual-audience guidance | no | high | cross-cutting |
| skill-verification-method | Is this program's own rule set tested against a fresh agent's actual behavior, not just read for plausibility? | `obra/superpowers`'s RED-GREEN-REFACTOR is directly reusable methodology | obra/superpowers writing-skills | no | high | process |
| passive-voice-budget | What % passive voice is acceptable, measured rather than eyeballed? | Google/Microsoft both ship `Passive.yml`; no numeric budget stated anywhere found | Vale Google/Microsoft | no | medium | cross-cutting |
| sentence-length-cap | Is there a hard per-sentence word cap enforced in CI? | Microsoft ships `SentenceLength.yml`; Mintlify's own guide says "under 25 words" | Microsoft Vale; Mintlify | no | medium | cross-cutting |
| inclusive-language-gate | Is alex/BiasFree-style checking wired into CI, not just prose? | Mature 3-decade corpus (Conscious Style Guide, alex, Vale BiasFree/Gender) entirely absent from the fleet today | alex; Conscious Style Guide | no | medium | cross-cutting |
| alt-text-real-content | Does every image carry *real* alt text, not a placeholder string satisfying the linter? | MD045 catches *absence*; nothing catches `alt="image"` | markdownlint MD045 | no | medium | reference |
| dark-mode-contrast | Is code-block syntax highlighting checked for WCAG contrast independently in both themes? | Dark mode is not itself accessible; SC1.4.11 bites harder in dark mode | WCAG 2.2 / dark-mode articles | no | medium | cross-cutting |
| versioned-docs-strategy | How does the site handle multiple product versions of the same page? | Frame's own suspected-gap list; genuinely unaddressed here | (frame hypothesis) | no | medium | process |
| i18n-of-docs | Does a non-English docs surface exist, and does the plain-English rule travel to it unchanged? | Reading-level formulas are English-specific; a naive port breaks | (frame hypothesis); digital.gov | no | low | process |
| changelog-migration-link | Does every breaking change's changelog entry link to a migration guide, and is that link checked? | `ocx` has a changelog *format* convention but no link-existence check | ocx worker-doc-writer.md | partial | medium | reference |
| error-message-docs-link | Do runtime error messages link to a docs page, and is that link checked to exist? | Named in frame's suspected-gap list; zero coverage found anywhere | (frame hypothesis) | no | medium | reference |
| card-sort-tree-test | Has the nav IA been validated with users, or does it mirror the codebase's module layout? | Named in frame's suspected-gap list; Top Tasks methodology is the closer existing analogue found | McGovern Top Tasks (adjacent) | no | medium | process |
| tested-example-freshness | Does a changed CLI/API fail the doc-example test loudly, or drift silently? | This is literally `ocx`'s own accepted ADR — the frame's stated best practice | ocx ADR (local) | yes (ocx only) | high | process |
| cast-generation-cost | Should asciicast generation be opt-in per example or default-on for every script? | `ocx`'s ADR already answers this (opt-in, `# cast: true`) — a cost/CI-time trade-off worth generalizing | ocx ADR (local) | yes (ocx only) | low | process |
| openapi-single-source | Is the API reference generated from one machine-readable spec, or hand-maintained prose? | 2026 consensus: spec is the source of truth; docs/SDK/examples generate from it on one commit | Fern API-docs guides | no | medium | reference |
| joblint-inapplicability | Does Joblint's job-posting-bias corpus have any application to software docs? | Explicitly named in the task brief's Part A; answer is no — worth stating to close the question, not silently drop it | Vale hub | no (n/a) | low | cross-cutting |
| tooltip-vs-glossary | Should jargon hide behind a hover tooltip (ocx's pattern) or a linked glossary, and is either measured for engagement? | `ocx` has the pattern; no fleet repo measures whether readers open it | ocx docs-style.md | yes (pattern only, unmeasured) | medium | guide |
| analogy-freshness | Are cross-tool analogies (APT, Homebrew, Docker) re-verified as those tools evolve, or written once and left to rot? | `ocx` instructs searching before writing but has no re-verification cadence | ocx docs-style.md | partial | medium | process |
| house-voice-sameness-cost | Does one shared voice contract make every adopting project's docs sound identical? | GitBook names this cost explicitly; the frame assumes house style is pure upside | GitBook voice guidance | no | medium | process/contested |
| rule-of-three-false-positives | Is "items in threes" mechanically greppable, or so common in ordinary writing it's a poor signal alone? | Wikipedia's own essay flags this as statistical-aggregate evidence, not single-instance proof | Wikipedia Signs of AI writing | partial | medium | cross-cutting |
| readability-score-provenance | When a subagent checklist says "readability score > 60," which formula and tool produced that number? | VoltAgent's own agents state the threshold with no named formula — an unfalsifiable-looking check | VoltAgent technical-writer | no | medium | process |
| markdownlint-vale-boundary | Where do structural (markdownlint) and prose (Vale) linters overlap or conflict, and which owns which rule? | Both touch headings; an unowned overlap risks contradictory fixes | markdownlint; Vale | no | low | process |

## AI-agent angle

| What an LLM characteristically does wrong | Smallest mechanical check that catches it |
|---|---|
| Writes analogies/comparisons to other tools from training-data memory instead of the tool's current behavior | Grep for a comparison claim (named external tool) with no adjacent markdown link in the same paragraph |
| Documents a CLI/API from memory of what it "should" do rather than reading the source or `--help` | Diff every documented flag/command name against the actual parser output; fail on any name not found (this is exactly `ocx`'s 31-stale-reference problem) |
| Reflexively uses inline `[text](url)` links even when the house rule is reference-style-only | Grep for `\]\(https?://` inside prose body (excluding the link-definitions block at file bottom) |
| Overuses em dash, "not just X but Y," bold mini-headers, and rule-of-three when asked to write "naturally" | Run Vale's `AiTells` style, or the equivalent grep list, as a required CI step — not a one-time human read |
| Writes headings in Title Case or skips a heading level | `markdownlint` MD001 (level increments) + MD003 (consistent style), zero-config |
| States a percentage or metric ("reduces support tickets by 30%") with no citation | Grep for a bare `%` or "X×" claim with no adjacent link/footnote |
| Applies the exact same idea→problem→solution rhythm to reference material, which needs plain facts with no narrative frame | Assert per Diátaxis type: a page tagged `reference` fails if its first paragraph contains a "problem" framing sentence |
| Writes a code example and never runs it | Require every fenced shell block to reference a script under a test path; fail the page if none exists (ocx's mechanism, generalized) |
| Satisfies an alt-text linter with a placeholder (`alt="image"`, `alt="screenshot"`) | Grep alt text against a stoplist of generic placeholder strings, not just "is alt text present" |
| Produces a checklist item like "readability score > 60 achieved" with no formula named | Require every numeric quality claim in agent output to name its formula/tool, or strip the claim |

## Contested / evolving

- **Vale vs. Harper for prose linting.** Vale is a rules-as-YAML *house-style enforcer*, still the team/CI default as of 2026. Harper (Automattic, Rust, sub-millisecond, fully offline, English-only) is newer and positioned as a local pre-commit grammar pass, not a house-style tool — the two are complementary, not competing, but coverage is shifting toward "Harper locally, Vale in CI" rather than Vale doing both jobs ([harper/COMPARISON.md](https://github.com/Automattic/harper/blob/master/COMPARISON.md)).
- **A reading-age target for developer docs.** GOV.UK's "9" is a citizen-facing-services number; whether it should apply at all to API reference pages (unavoidable jargon) versus only to landing/guide prose is unresolved in the literature found — trending toward "tiered target by Diátaxis type," not one number for the whole site.
- **em-dash-as-tell.** Wikipedia's own essay concedes single-instance human judgment is near chance; the mechanical checks (Vale AiTells, the four humanizer skills) still treat it as a hard signal. The tension — real in aggregate, weak per-instance — is unresolved; practice is trending toward "flag for human review," not "auto-reject," for the softer tells (six of AiTells's 17 rules gate as hard errors, the rest stay judgment calls).
- **llms.txt adoption.** Proposed Sept 2024, at 5–15% adoption by mid-2026 despite "gold standard" framing among AI-native companies — genuinely unsettled whether it becomes universal or stays a niche practice; skill.md and AGENTS.md are competing for the same "docs for agents" slot with no convergence yet.
- **One shared voice across many projects.** GitBook explicitly names the risk: a universal AI-docs voice makes every product's docs sound the same, which costs a differentiator (docs as first product experience). This directly cuts against a program that ships one house style across 13 repos — worth flagging as a real trade-off in the shipped rule's own scope note, not resolving silently.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [vale.sh/hub](https://vale.sh/hub/) | Vale's style-package hub | fetched 2026-09 | Primary: exact rule counts for Google/Microsoft/Red Hat/write-good/proselint/alex/Joblint/Readability/AiTells/Harper |
| [errata-ai/Google rules](https://github.com/errata-ai/Google/tree/master/Google) | Google Vale style, rule files | current | Primary: exact 36 rule file names |
| [errata-ai/Microsoft rules](https://github.com/errata-ai/Microsoft/tree/master/Microsoft) | Microsoft Vale style, rule files | current | Primary: exact 47 rule file names, incl. `SentenceLength.yml` |
| [errata-ai/Readability FleschKincaid.yml (raw)](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml) | Shipped rule YAML | current | Primary: the one independently confirmed numeric threshold (grade >8, suggestion) |
| [DavidAnson/markdownlint Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) | Full markdownlint rule catalog | current | Primary: MD001–MD060 exact IDs and descriptions |
| [en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | Wikipedia essay, maintained catalogue of AI-writing tells | current, actively maintained | Primary: the most exhaustive tell taxonomy found, source for 4+ downstream humanizer skills |
| [diataxis.fr](https://diataxis.fr/) | The Diátaxis framework's own site | ongoing | Primary: the compass/quadrant model in the framework's own words |
| [anthropics/skills — doc-coauthoring/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | Anthropic's official docs-writing skill | current | Primary: the reference implementation this program should be judged against |
| [obra/superpowers — writing-skills/SKILL.md](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | Community skill-authoring methodology | current | Primary: TDD-for-skills methodology, directly reusable for this program's own verification story |
| [VoltAgent/awesome-claude-code-subagents — technical-writer.md](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) | Community subagent definition | current | Primary: shows the "looks verified, isn't" failure mode (unnamed readability formula) |
| [VoltAgent/awesome-claude-code-subagents — documentation-engineer.md](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) | Community subagent definition | current | Primary: same failure mode, different checklist (API coverage, page-load time) |
| [blader/humanizer](https://github.com/blader/humanizer) | Anti-AI-slop agent skill, 35 patterns | current | Primary: full pattern catalogue with before/after examples, two-pass verification design |
| [Automattic/harper](https://github.com/automattic/harper) + [COMPARISON.md](https://github.com/Automattic/harper/blob/master/COMPARISON.md) | Rust offline grammar checker | current, active | Primary: the newest entrant, positions itself explicitly against Vale/LanguageTool |
| [llmstxt.org](https://llmstxt.org/) | The llms.txt specification | v2, current | Primary: exact file format, H1/blockquote/H2 structure |
| [mintlify.com/blog/skill-md](https://www.mintlify.com/blog/skill-md) | Mintlify's skill.md announcement | current | Primary: a sibling artifact class to this program's own output |
| [mintlify.com/docs/guides/style-and-tone](https://www.mintlify.com/docs/guides/style-and-tone) | Mintlify's own writing style guide | current | Primary: concrete numeric guidance (<25 words/sentence, 2-4 sentences/paragraph) from a docs platform vendor |
| [digital.gov/guides/plain-language](https://digital.gov/guides/plain-language) | U.S. federal plain-language guide (successor to plainlanguage.gov) | current | Primary: confirms the Plain Writing Act basis and the *absence* of a stated numeric threshold |
| [mintlify/starter — AGENTS.md](https://github.com/mintlify/starter/blob/main/AGENTS.md) | Example AGENTS.md | current | Primary: the third competing "docs for agents" convention |
| [MeasuringU: Top Task Analysis](https://measuringu.com/top-tasks/) | Explainer on Gerry McGovern's methodology | evergreen | Secondary but detailed: the closest existing codification of "discover your own use-case tiers" |
| [lycheeverse/lychee](https://github.com/lycheeverse/lychee) | Rust async link checker | current, active | Primary: the off-the-shelf link-rot fix, two-line CI integration |
| [GitHub topic: remark-lint](https://github.com/topics/remark-lint) | remark-lint ecosystem overview | current | Secondary: preset-based markdown AST linting, alt-text and link-validity plugins |
| [codersera.com llms.txt guide, May 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/) | 2026-era adoption/status guide | 2026 | Secondary: the 5–15% adoption figure and "gold standard" framing |
| local: `ocx/.claude/rules/docs-style.md` | ocx's enforced docs rule (163 lines) | 2026, in-repo | Primary (fleet): the baseline this program must not re-tread, exact wording confirmed by direct read |
| local: `ocx/.claude/artifacts/adr_tested_doc_command_mechanism.md` | ocx's accepted ADR, tested-doc-command mechanism | accepted 2026-05-17, in-repo | Primary (fleet): the frame's stated best-practice mechanism, confirmed by direct read, must become the shipped artifact's worked example |
| local: `ocx/.claude/agents/worker-doc-writer.md` | ocx's docs-writing subagent | in-repo | Primary (fleet): confirms Diátaxis is already named in agent instructions but absent from the enforced rule — the exact gap candidate #4 names |
