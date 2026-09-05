---
title: AI-tell set and honest label
topic: ai-tell-set-and-honest-label
group: docs-plain-english
agent: docs-plain-english-researcher
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 14
scope: >
  What punctuation/lexical/structural tells a shipped prose rule should check,
  at what severity, and how the em-dash/semicolon ban is worded so it reads as
  a house-style choice with a translation/rendering rationale, not a claim that
  punctuation frequency detects AI authorship. Does not cover the readability
  formula or grade target (readability-gate-per-page-type), the lint tool
  choice or CI rollout thresholds (lint-mechanism-and-rule-verification-shape),
  or the marketing-tone banned-word list itself (marketing-tone-wordlist).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The measured claim and its actual scope](#1-the-measured-claim-and-its-actual-scope)
   2. [The fleet's own exposure](#2-the-fleets-own-exposure)
   3. [The honest rationale already available](#3-the-honest-rationale-already-available)
   4. [Wikipedia's five-layer taxonomy](#4-wikipedias-five-layer-taxonomy)
   5. [The mechanical implementation: Vale's AiTells package](#5-the-mechanical-implementation-vales-aitells-package)
   6. [Structural tells and the markdownlint boundary](#6-structural-tells-and-the-markdownlint-boundary)
   7. [Four humanizer skills compared](#7-four-humanizer-skills-compared)
   8. [Detection-accuracy ceiling](#8-detection-accuracy-ceiling)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Em-dash frequency is real signal in aggregate (GPT-4.1 10.62/1,000 words vs. a 3.23 human baseline) but fails as a per-instance detector: Twain's *Huckleberry Finn* scores 10.13, inside the AI range, and Llama 3.1 8B scores 0.00, below every human sample ([Freeburg 2026 via slopdetector.org](https://slopdetector.org/blog/em-dash-ai-tell-data)).
- Ship the em-dash/semicolon/curly-quote ban as a **house-style rule for translation and rendering consistency**, citing GitLab's own stated rationale, never as an AI-detection claim ([GitLab style guide](https://docs.gitlab.com/development/documentation/styleguide/)).
- The fleet already carries the cost this ban would fix: 18.3 em-dashes and 5.8 semicolons per 1,000 words fleet-wide, concentrated at 2,988 em-dashes across ocx's 44 pages and 484 semicolons across kate-middlechild's 25 pages (`docs-audit/docs-shape.md` §3).
- Wikipedia's "Signs of AI writing" essay documents five layers of tells — content, linguistic, structural, typographic, chatbot-artifact — five times richer than the four tells (em-dash, semicolon, stacked clauses, hedging) the frame named ([Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)).
- That essay states single-instance human judgment is near chance (57% on AI text, 64% on human text in a cited 2025 study) while heavy LLM users reach ~90% by reading many pages at once — the signal exists only in aggregate, not per sentence.
- Vale's `AiTells` package (17 rules) is the only found mechanical implementation of this taxonomy: 6 rules gate at **error** (Dash, CodeToken, FilePath, StatusBracket, SectionCode, NeverTag) and 11 at **suggestion** (EpigramContrast, NegParallel, CopulaInflation, HiddenVerb, Passive, Cliche, WeakResume, VirtueHonest, LinkText, AbstractTriad, Adverb) ([krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells)).
- Vale's error-tier rules were chosen because they are mechanically unambiguous (a raw file path in prose, an `ALL_CAPS_UNDERSCORE` token, an em/en dash) — none require judging intent, which is exactly why they can gate hard while epigrams and clichés cannot.
- Chatbot-artifact leftovers ("I hope this helps," knowledge-cutoff disclaimers, "as an AI") are the one tell category every source agrees is unambiguous and belongs at hard-error severity in finished docs, regardless of who wrote them.
- Skipped heading levels, multiple H1s, and bold-text-used-as-a-heading are structural AI tells with existing, zero-config checks: markdownlint MD001, MD025, and MD036 respectively ([Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)).
- Title-case headings are **not** caught by markdownlint MD003 (which only enforces one heading *style*, ATX vs. setext, not letter-casing) — the actual check for sentence-case-vs-title-case is Vale's `Google.Headings` rule, built from Google's own developer style guide ([developers.google.com/style/headings](https://developers.google.com/style/headings)). This corrects an imprecise MD003 mapping present in `docs-topic-map/codified-practice.md:194`.
- Four independent Claude/agent "humanizer" skills exist (`blader/humanizer` 35 patterns, `jalaalrd/anti-ai-slop-writing`, `Aboudjem/humanizer-skill` 55 patterns, `hardikpandya/stop-slop`), all citing Wikipedia's essay as their source list; only `Aboudjem/humanizer-skill` computes a genuinely measured score (lexical density, repetition, burstiness, diversity feeding a 0–100 number), the rest are pattern-match-and-rewrite with no numeric output.
- The rule-of-three, the AI-vocabulary cluster (delve, crucial, underscore, intricate, pivotal, tapestry, testament, foster), and the abstract-noun triad are aggregate-only signals: one instance is ordinary prose, and the shipped rule must flag by density-per-page, never reject on a single hit.
- Split the checked tell set into three severities, never two: hard error (mechanical, no judgment needed), suggestion (real pattern, needs a human glance), and aggregate-only (a frequency counter feeding a human review flag, not a per-instance fail).
- The em-dash/en-dash rule and the literal double-hyphen (`--`) rule must be separate checks, because the fix differs: a double hyphen is a keyboard stand-in for a dash a model could not type, an em dash is a sentence to restructure.
- Never let any bucket-3 tell's output read as "this page was written by AI" — the honest framing is "this page has N instances of pattern X per 1,000 words; a human should read it," full stop.
- No source in this research states a validated numeric density threshold for the aggregate-only tells (rule-of-three, AI-vocabulary cluster); ship a starting default explicitly labelled uncalibrated, not measured.

## Findings

### 1. The measured claim and its actual scope

E. M. Freeburg's 2026 paper "The Last Fingerprint: How Markdown Training Shapes LLM Prose" measured em-dash frequency across frontier models against a human control ([Freeburg 2026 data via slopdetector.org](https://slopdetector.org/blog/em-dash-ai-tell-data)):

| Source | Em-dashes / 1,000 words |
|---|---:|
| GPT-4.1 | 10.62 |
| Gemini 2.5 Pro | 3.53 |
| Llama 3.1 8B | 0.00 |
| Human baseline (Freeburg control) | 3.23 |
| Five-novel classic pooled sample | 6.43 |
| Twain, *Huckleberry Finn* | 10.13 |

The article summarizing the study states the point directly: "the em dash is a weak signal, not a fingerprint." Model behavior spans 0.00 to 10.62 depending on which model wrote the text, and a 19th-century human novel (Twain) lands almost exactly on GPT-4.1's rate. Any rule that reads "an em dash means AI wrote this" is falsified by that single data point. This is the evidence behind `docs-frame.md` correction 6, which already flags the frame's original hypothesis 5 (em-dash as an AI tell) as needing relabeling — this topic supplies the citation and the exact wording that relabeling should use.

### 2. The fleet's own exposure

`docs-audit/docs-shape.md` §3 measured the fleet directly (23 repos, 248 pages, 348,917 prose words, code fences/frontmatter/tables/inline-code stripped before counting):

- Fleet median: **18.3 em-dashes / 1,000 words**, **5.8 semicolons / 1,000 words**, Flesch 51.6.
- Heaviest em-dash repo: ocx, 2,988 em-dashes across 44 pages.
- Heaviest semicolon repo: kate-middlechild, 484 semicolons across 25 pages.
- No repo in the fleet reaches Flesch 60 ("standard") except grimoire-indexer, grimoire-vscode, and setup-ocx.

This confirms the ban is not free to adopt: retrofitting ocx alone means resolving nearly 3,000 flagged instances. A rule shipped without a rollout plan (new content only vs. whole-fleet) would fail on day one — that rollout mechanism itself belongs to `lint-mechanism-and-rule-verification-shape`, not this topic, but the exposure number is the reason that topic exists.

### 3. The honest rationale already available

GitLab's documentation style guide bans exactly the same three marks — em/en dash, semicolon, curly quotes — but for a stated reason that has nothing to do with AI detection ([docs.gitlab.com style guide](https://docs.gitlab.com/development/documentation/styleguide/)):

> "When documentation is translated into other languages, the meaning of each word must be clear. The increasing use of machine translation, GitLab Duo Chat, and other AI tools means that consistency is even more important."

The guide's instructions are terse and mechanical: semicolons → "use two sentences instead"; dashes → "use separate sentences, or commas, instead"; curly quotes → "use straight quotes instead," enforced via a Vale rule. The rationale is translation fidelity and predictable rendering across tools, not authorship forensics. Curly quotes in particular are a rendering hazard independent of who typed them (smart-quote auto-substitution breaks code samples and shell copy-paste).

This is the resolution to the named conflict (em-dash as detector, `docs-frame.md` hypothesis 5, vs. house-style choice, `recent-shifts-and-tooling.md` §5 and GitLab): **ship GitLab's rationale, drop the detection framing entirely.** The rule bans the marks on translation/rendering grounds and says so; it does not gain or lose validity depending on who or what wrote the sentence.

### 4. Wikipedia's five-layer taxonomy

`en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing` is the single richest catalogue found, and it organizes tells into five layers, not the frame's four items ([Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)):

1. **Content patterns** — undue emphasis on significance/legacy ("pivotal moment," "indelible mark"); vague attribution ("industry reports," "observers argue," "some critics" standing in for one source); superficial analysis via dangling present-participle clauses ("further enhancing its significance as a dynamic hub"); formulaic conclusions ("Despite its X, faces Y challenges," separate "Future Outlook" sections).
2. **Linguistic markers** — an "AI vocabulary" cluster that has shifted over time (2023–mid-2024: delve, intricate, tapestry, testament, meticulous; mid-2024 on: align with, enhance, fostering, showcasing); copula avoidance ("serves as," "functions as," "represents" instead of "is"); negative parallelism ("not just X but Y," "not X but Y," "X rather than Y"); the rule of three.
3. **Structural patterns** — heading-only sections with no body text; skipped heading levels; overuse of top-level headings; inline-header vertical lists; "X and Y" header formatting.
4. **Typography** — em-dash and curly-quote overuse; boldface used as mid-paragraph mini-headings; emoji as formatting; raw Markdown syntax leaking into a non-Markdown surface.
5. **Chatbot-artifact leftovers** — "I hope this helps," knowledge-cutoff disclaimers ("as of my last update"), and broken citation-tool artifacts (`contentReference`, `oaicite`, `[cite: 1]`) that are unambiguous evidence of an unedited paste, not a style judgment at all.

The essay's own caveat on detection accuracy: a cited 2025 study found single-instance human recognition at "57% for AI texts, 64% for human texts" — barely above chance — while heavy LLM users tagging many pages reach roughly 90% accuracy in aggregate, with the essay noting "if you tag 10 pages as AI, you've probably made one false positive." The taxonomy is real; the confidence it can carry per sentence is not.

### 5. The mechanical implementation: Vale's AiTells package

`krishnasunkam/vale-ai-tells` ("a rule floor rather than a detector... It does not guess a probability that a machine wrote your text. It names a specific, mechanical tell and leaves the rewrite to you") is the mechanical version of the same taxonomy, 17 rules split by how much judgment each needs ([github.com/krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells)):

| Rule | Detects | Severity |
|---|---|---|
| Dash | em/en dashes, including numeric ranges | error |
| CodeToken | `ALL_CAPS_UNDERSCORE` names, single-letter formulas in prose | error |
| FilePath | raw file paths in prose | error |
| StatusBracket | inline status grades, e.g. `[ON TRACK, GREEN]` | error |
| SectionCode | section/source codes, e.g. `Section 4`, `S12` | error |
| NeverTag | a clause closing with an absolute "never" flourish | error |
| EpigramContrast | "is the hero, not a decoration"-style construction | suggestion |
| NegParallel | "not just X, but Y" | suggestion |
| CopulaInflation | "serves as a," "is a testament to" | suggestion |
| HiddenVerb | nominalized actions ("conduct an analysis" for "analyze") | suggestion |
| Passive | passive-voice constructions | suggestion |
| Cliche | stock phrases | suggestion |
| WeakResume | vague corporate language ("responsible for," "worked on") | suggestion |
| VirtueHonest | hedging framed as honesty ("an honest update," "to be honest") | suggestion |
| LinkText | generic anchors ("click here") | suggestion |
| AbstractTriad | three stacked abstract nouns in sequence | suggestion |
| Adverb | filler adverbs ("quietly") | suggestion |

Six rules gate as errors, eleven stay at suggestion — and the split lines up with judgment cost, not with how "AI-sounding" a tell feels. A raw file path or an `ALL_CAPS_UNDERSCORE` token in prose is unambiguous regardless of context; an epigram or a cliché needs a reader to decide whether it actually reads badly here. `Dash` is separate from any double-hyphen check — Vale (and the humanizer skills, §7) treat `--` used as a dash substitute as its own error, because a model typing `--` is standing in for a character it could not produce, while a real em dash is a sentence-structure choice to fix, not a substitution to correct.

### 6. Structural tells and the markdownlint boundary

`markdownlint` (DavidAnson) ships MD001–MD060 and three of its rules mechanically catch structural tells with zero configuration ([Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)):

- **MD001** (`heading-increment`) — a heading level must not skip (H2 straight to H4 fails).
- **MD025** (`single-h1`/`single-title`) — more than one top-level heading in a document fails.
- **MD036** (`no-emphasis-as-heading`) — a whole line of bold or italic text standing in for a real heading fails.

**MD003 does not check letter-casing.** It enforces one consistent heading *syntax* (ATX `#`/closed-ATX/setext) throughout a document — it is blind to whether headings are written in Title Case or sentence case. `docs-topic-map/codified-practice.md:194` maps "writes headings in Title Case" to "MD001 + MD003," which is imprecise: MD003 does not fire on casing at all. The actual mechanical check for the title-case tell is Vale's `Google.Headings` rule, built against Google's developer documentation style guide, which states plainly to "capitalize only the first word in the title, the first word in a subheading after a colon, and any proper nouns" ([developers.google.com/style/headings](https://developers.google.com/style/headings)).

| Bad heading | Good heading | Check |
|---|---|---|
| `## Overview And Key Benefits` | `## Overview and key benefits` | Vale `Google.Headings`, not markdownlint |
| `## Setup` immediately followed by `#### Details` | `## Setup` followed by `### Details` | markdownlint MD001 |
| `**Prerequisites**` as a stand-alone bolded line | `### Prerequisites` | markdownlint MD036 |

### 7. Four humanizer skills compared

`docs-topic-map/codified-practice.md` names four independent Claude/agent skills built on this same taxonomy; each was fetched directly:

| Skill | Pattern count | Measurement | Verification method |
|---|---|---|---|
| [`blader/humanizer`](https://github.com/blader/humanizer) | 35, in 5 categories | none (qualitative) | two-pass: rewrite without preserving structure, then critique the draft against the 35 patterns and source claims |
| [`jalaalrd/anti-ai-slop-writing`](https://github.com/jalaalrd/anti-ai-slop-writing) | ~100 items across 10 categories (50+ words, 35+ phrases, 16 sentence-openers, plus structural/punctuation/formatting/factual checks) | none | pattern match against curated lists sourced from "Carnegie Mellon (2025), Wikipedia's Signs of AI Writing page, Buffer's 52M-post analysis" |
| [`Aboudjem/humanizer-skill`](https://github.com/Aboudjem/humanizer-skill) | 55, in 8 categories, 5 tone voices | **yes** — 0–100 score from "four measurable signals, not from a count of the 55": lexical density, repetition, burstiness (sentence-length variation), diversity | fully local CLI, no API calls |
| [`hardikpandya/stop-slop`](https://github.com/hardikpandya/stop-slop) | ~15 named pattern families (banned phrases, structural clichés, sentence-level rules) | partial — a 5-dimension 1–10 rubric (directness, rhythm, trust, authenticity, density) summing to a 35/50 revision trigger | pattern match plus a qualitative dimensional score, not a mechanical count |

All four cite Wikipedia's essay as their base taxonomy. Only `Aboudjem/humanizer-skill` computes signals independent of the pattern list itself (burstiness and lexical diversity are stylometric measures, not keyword matches) — this is the one genuinely different verification approach in the set, and it is the closest analogue to a defensible "aggregate, not per-instance" signal (§8). None of the four ships staleness detection, single-source-of-truth checks, or zero-result search mining, confirming `docs-frame.md` correction 10.

### 8. Detection-accuracy ceiling

Three independent facts converge on the same conclusion:

1. Freeburg's own em-dash data (§1): AI models range 0.00–10.62/1,000 words; a 19th-century human author (Twain) scores inside that range at 10.13.
2. Wikipedia's cited 2025 study (§4): single-instance human accuracy is 57%/64%, "no better than random chance" per the essay's own framing.
3. Vale's AiTells severity split (§5): the mechanically unambiguous tells (Dash, CodeToken, FilePath, StatusBracket, SectionCode, NeverTag) gate at error; every tell that requires reading intent (epigram, cliché, abstract triad) stays at suggestion — the tool's own author already drew the same line this research draws independently.

The conclusion a shipped rule must encode: **individual-instance tells earn a hard rule only when they are true regardless of authorship** (a raw file path in prose is always wrong; an em dash is always a translation/rendering hazard). Tells that only mean something in aggregate (rule-of-three frequency, AI-vocabulary density) must never be worded as "this page was AI-written" — they are worded as "this page's density of X exceeds Y per 1,000 words; a human should read it."

## Normative guidance candidates

1. **Never label the em-dash/en-dash/semicolon/curly-quote ban as AI detection.** State the rule's rationale as translation fidelity and rendering consistency across tools. Rationale: the ban is defensible on GitLab's grounds; on detection grounds it is falsified by Twain scoring inside the AI range and Llama 3.1 8B scoring at zero. Verify: a human-readable check — the rule's own doc text must not contain "AI-written," "detect," "generated by AI," or similar, only the translation/rendering framing. Evidence: **measured** (Freeburg 2026 + fleet `docs-shape.md` §3).

2. **Ban the em dash (—) and en dash (–) in prose.** Rationale: unpredictable machine-translation and terminal/Markdown rendering, per GitLab's own stated reason — not authorship. Verify: `grep -n '[—–]' <file>` outside fenced code blocks, or Vale's `AiTells.Dash` rule at error severity. Evidence: **codified** (Vale AiTells; GitLab style guide).

3. **Ban the semicolon in prose; require two sentences instead.** Rationale: same translation/rendering grounds; GitLab's own instruction is literally "use two sentences instead." Verify: `grep -n ';' <file>` outside fenced code and inline-code spans. Evidence: **codified** (GitLab style guide).

4. **Ban curly/smart quotes; require straight quotes.** Rationale: smart-quote auto-substitution corrupts shell/code copy-paste and is a rendering hazard independent of authorship. Verify: `grep -n '[""'']' <file>` outside code fences, or a Vale existence rule (GitLab enforces this "via a Vale rule"). Evidence: **codified** (GitLab style guide).

5. **Flag a literal double-hyphen (`--`) used as a dash substitute as a separate rule from the em-dash ban**, because the fix differs — a double hyphen means "insert a real character" (or restructure), an em dash means "restructure into two sentences." Rationale: conflating the two produces a confusing fix suggestion on the wrong instance. Verify: `grep -n '[^-]--[^-]' <file>` outside code, distinct from rule 2's check. Evidence: **codified** (Vale AiTells / humanizer-skill practice of splitting these two).

6. **Reject skipped heading levels, multiple top-level headings, and bold-text-as-heading as hard errors.** Rationale: all three are structural AI tells (Wikipedia's structural layer) and are zero-config-checkable. Verify: markdownlint MD001 (`heading-increment`), MD025 (`single-h1`), MD036 (`no-emphasis-as-heading`). Evidence: **codified** (markdownlint Rules.md).

7. **Require sentence-case headings, not Title Case.** Rationale: Title Case is a named structural/typographic tell and Google's own developer style guide states sentence case as the standard. This is NOT a markdownlint check — MD003 only enforces heading-syntax consistency, not casing. Verify: Vale's `Google.Headings` rule (or an equivalent casing check) — never cite MD003 for this. Evidence: **codified** (Google developer style guide; Vale Google style package).

8. **Reject chatbot-artifact leftovers as hard errors, unconditionally.** Ban a fixed phrase list: "I hope this helps," "as an AI," "I cannot browse the internet," "as of my last update"/"my knowledge cutoff," and citation-tool artifacts (`contentReference`, `oaicite`, `[cite: 1]`). Rationale: every source agrees these are unambiguous evidence of an unedited paste, never a style judgment — they are wrong in finished docs regardless of who wrote the surrounding prose. Verify: an existence-rule grep list run at error severity (jalaalrd/anti-ai-slop-writing and Wikipedia's essay both name near-identical lists independently). Evidence: **codified** (Wikipedia essay + two independent skill implementations).

9. **Run the judgment-dependent tells (epigram, negative-parallelism, copula-inflation, hidden-verb, cliché, weak-résumé language, hedge-framed-as-honesty, generic link text, filler adverb) at suggestion severity only, never error.** Rationale: Vale's own package author already drew this line — these require reading intent, and a hard gate on them produces false-positive blocks on ordinary human prose. Verify: Vale's `AiTells` package (11 suggestion-tier rules) or the equivalent grep-with-review-flag. Evidence: **codified** (Vale AiTells severities).

10. **Never gate the rule-of-three, the AI-vocabulary cluster (delve, crucial, underscore, intricate, pivotal, tapestry, testament, foster, etc.), or the abstract-noun triad on a single instance.** Check density per 1,000 words per page instead, and flag only pages above a threshold for human review — start with an explicitly uncalibrated default (e.g., ≥3 distinct vocabulary-cluster hits or ≥2 rule-of-three constructions per page) and say so is uncalibrated. Rationale: one instance of any of these is ordinary prose; only elevated density is a signal, and no source in this research gives a validated numeric threshold — the honest move is to ship a starting default and recalibrate against the fleet's own agent-authored pages. Verify: a word/phrase-frequency script per page, not a per-sentence lint fail. Evidence: **argued** (Wikipedia's own single-instance-near-chance finding; no measured fleet baseline exists for this specific density).

11. **Word every aggregate-only finding as "N instances of X per 1,000 words — a human should read this page," never as "this page was AI-written."** Rationale: this is the honest-labelling principle the whole topic exists to establish; conflating a frequency signal with an authorship verdict is the exact mistake the Freeburg data and Wikipedia's accuracy numbers rule out. Verify: a fixed message template in the check's output, reviewed as part of shipping the rule (a wording review, not a script — name it as human-review-only if no template check exists). Evidence: **argued**.

12. **Treat Vale's AiTells package (or an equivalent grep set) as the default mechanical implementation of this whole tell set, rather than re-deriving rule names.** Rationale: it is the only found tool that already encodes the full taxonomy with a severity split matched to judgment cost; re-deriving rule names from scratch would duplicate work and likely mis-split severities (as the MD003 miscitation in this fleet's own research shows can happen). Verify: the shipped rule file names `AiTells` rule IDs directly rather than paraphrasing them. Evidence: **codified**.

## AI-agent angle

- **Reaching for the em-dash/semicolon ban as a detection claim.** An agent drafting this rule unprompted will very likely write "avoid em dashes because they are a sign of AI-generated text" — a claim the Freeburg data falsifies (Twain at 10.13, inside the AI range). Smallest check: grep the rule's own prose for "AI-written," "detect," "sign of AI," "generated by AI" near the punctuation rule and require it instead cite translation/rendering.
- **Treating every tell in the taxonomy as equally strict.** An agent given Wikipedia's full list will tend to gate all of it at error, because the list reads as "things AI does wrong." That produces false-positive blocks on ordinary human prose (a cliché, an adverb, a passive sentence are all normal writing). Smallest check: confirm the shipped rule's severity table has both an error tier and a suggestion tier — a rule file with every tell at the same severity is a signal this mistake happened.
- **Citing MD003 for title-case detection.** This exact error already exists in this program's own upstream research (`codified-practice.md:194`). An agent citing markdownlint for heading-casing will be wrong; MD003 only enforces heading-*style* consistency. Smallest check: grep the shipped rule for "MD003" and confirm the adjacent text is about ATX-vs-setext consistency, not casing — if it mentions "Title Case" or "sentence case" next to MD003, it is miscited.
- **Flagging a single "delve" or a single rule-of-three as proof of AI authorship.** An LLM asked to review a page for "AI tells" will readily produce a verdict from one instance, because that is exactly the pattern-matching task it is good at — and exactly the task Wikipedia's own accuracy numbers say humans (and by extension, models doing the same reading) are near chance on for single instances. Smallest check: does the review output name a per-page count and a threshold, or a bare "this looks AI-written" sentence with no number attached? The bare sentence is the tell of a wrong-shaped check.
- **Leaving chatbot leftovers in generated content ("I hope this helps!", "Let me know if you have questions").** These are the one category where an agent's own conversational habits leak directly into shipped docs. Smallest check: grep the finished page for first- and second-person address to "the reader as a chat partner" — "I hope," "let me know," "feel free to ask" — none of which belongs in a docs page under any style regime.
- **Inventing a numeric density threshold and presenting it as measured.** Asked to pick a cutoff for the aggregate-only tells, an agent will confidently state a specific number ("flag pages over 5 instances per 1,000 words") without a source, because a concrete number reads as more authoritative than "uncalibrated." Smallest check: does the threshold cite a source or a fleet measurement? If not, it must be labelled a starting default, not a finding.

## Contested / evolving

- **Em-dash as an AI detector vs. a house-style choice with a translation rationale — named conflict, resolved.** `docs-frame.md` hypothesis 5 treated em-dash density as a tell; `recent-shifts-and-tooling.md` §5 and GitLab's style guide both give the same ban a different, honest reason. Resolution: **ship the ban, drop the detection framing.** Evidence for resolving this way: Freeburg's own numbers falsify detection at the instance level (Twain 10.13, inside GPT-4.1's range; Llama 3.1 8B at 0.00, below the human baseline); GitLab's translation/rendering rationale is independently sufficient to justify the same rule without needing an AI-detection claim at all. This is not "it depends" — it depends on nothing further; the ban stands on translation/rendering grounds alone, and no source found here defends banning it on detection grounds.
- **Where the line falls between "hard error" and "suggestion."** Genuinely contested only in degree, not in direction: every source that splits severity (Vale AiTells, the humanizer skills, Wikipedia's own five-layer taxonomy) puts unambiguous-regardless-of-context tells (file paths, ALL_CAPS tokens, chatbot artifacts, banned punctuation) at the strict end and intent-dependent tells (cliché, epigram, adverb overuse) at the lenient end. Trending direction as of September 2026: toward stricter automation for the mechanical tier (Vale error-gating, markdownlint zero-config rules already exist and are cheap to adopt) and continued human-review-only treatment for the aggregate tier — no source proposes auto-rejecting on rule-of-three or vocabulary-cluster density alone.
- **Whether a numeric density threshold exists for the aggregate-only tells.** Unresolved, and stated as such rather than guessed: no source in this research — not Wikipedia, not Vale, not any of the four humanizer skills — gives a validated per-page threshold for rule-of-three frequency or AI-vocabulary-cluster density. `Aboudjem/humanizer-skill`'s burstiness/lexical-density scoring is the closest thing to a measured approach, but its 0–100 score is calibrated for its own tool's use, not published as a general threshold. This program should ship an explicitly uncalibrated starting default and recalibrate once the fleet's own agent-authored pages can be sampled against it.
- **Whether stylometric measures (burstiness, lexical diversity) will supersede keyword-list tells.** Emerging, not yet converged: `Aboudjem/humanizer-skill` is the only found implementation computing sentence-length variance and lexical diversity as its primary signal rather than counting keyword hits, which sidesteps the "single delve is normal prose" problem structurally rather than by threshold-tuning. As of September 2026 this remains a one-tool pattern, not an adopted practice — worth flagging as the most promising direction for a future revision of this rule, not something to build into the wave-1 deliverable.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [slopdetector.org/blog/em-dash-ai-tell-data](https://slopdetector.org/blog/em-dash-ai-tell-data) | Blog post reporting Freeburg 2026's measured em-dash frequencies | 2026 | Primary numeric source: the exact figures (GPT-4.1 10.62, human baseline 3.23, Twain 10.13) that falsify em-dash as a per-instance detector |
| [en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | Wikipedia's maintained, community-edited essay cataloguing AI-writing tells | actively maintained, fetched 2026-09 | Primary: the richest tell taxonomy found (5 layers), and the source both Vale's AiTells and all four humanizer skills cite |
| [vale.sh/hub/](https://vale.sh/hub/) | Vale's style-package hub/explorer | fetched 2026-09 | Primary: confirms the AiTells package exists at 17 rules and the Readability package at 7, as first-class Vale styles alongside Google/Microsoft |
| [github.com/krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells) | The actual Vale AiTells rule package | fetched 2026-09 | Primary: exact rule names, one-line detection descriptions, and error/suggestion severity for all 17 rules — the mechanical implementation of the taxonomy |
| [docs.gitlab.com/development/documentation/styleguide/](https://docs.gitlab.com/development/documentation/styleguide/) | GitLab's own documentation style guide | current, fetched 2026-09 | Primary: the honest, non-detection rationale (translation/rendering) for banning em dash, semicolon, curly quotes — the exact wording this program's rule should borrow |
| [github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) | markdownlint's full rule catalogue (MD001–MD060) | current, fetched 2026-09 | Primary spec: exact definitions for MD001, MD003, MD025, MD036 — needed to correct the MD003/title-case miscitation |
| [developers.google.com/style/headings](https://developers.google.com/style/headings) | Google developer documentation style guide, headings page | current | Primary: states sentence-case-for-headings as Google's standard, the actual basis for the casing tell (not markdownlint) |
| [github.com/blader/humanizer](https://github.com/blader/humanizer) | Anti-AI-slop agent skill, 35 patterns | fetched 2026-09 | Primary: one of four independent humanizer skills; two-pass rewrite-then-critique method with no numeric score |
| [github.com/jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing) | Anti-AI-slop agent skill, ~100 banned items across 10 categories | fetched 2026-09 | Primary: names its own sources (Carnegie Mellon 2025, Wikipedia, Buffer's 52M-post analysis), no scoring |
| [github.com/Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill) | Humanizer CLI skill, 55 patterns, 5 voices | fetched 2026-09 | Primary: the one skill with a genuinely measured 0–100 score from stylometric signals (burstiness, lexical density), not keyword counting |
| [github.com/hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) | Anti-AI-slop agent skill with a 5-dimension rubric | fetched 2026-09 | Primary: a quasi-quantitative 1–10-per-dimension score (35/50 revision trigger), distinct verification shape from the other three |
| `docs-audit/docs-shape.md` §3 | This program's own fleet-wide prose measurement (23 repos, 248 pages) | measured 2026-09-05 | Primary/measured: the fleet's actual em-dash (18.3/1,000 words), semicolon (5.8/1,000 words) and Flesch (51.6 median) baseline — the retrofit-cost evidence |
| `docs-topic-map/codified-practice.md` | This program's prior-art scouting pass on codified prose-linting practice | 2026-09-05 | Secondary: names the four humanizer skills and the Vale package counts this topic verified directly; also the source of the MD003 miscitation this topic corrects |
| `docs-frame.md` (Corrections, item 6) | This program's phase-0 frame and its own wave-1 correction | 2026-09-05 | Establishes the exact conflict this topic resolves (em-dash as detector vs. house style) and points at the Freeburg number and GitLab's ban |
