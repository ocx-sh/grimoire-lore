---
title: Canonical documentation guides — table-of-contents survey
topic: docs-topic-map
agent: docs-landscape-scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 24
scope: >
  Covers page-type contracts and checklist items from Diataxis/Divio, Google,
  Microsoft, Write the Docs, The Good Docs Project, GitLab, Red Hat, Kubernetes,
  Django, and three practitioner books (Docs for Developers, Every Page is Page
  One, Docs Like Code), plus adjacent tooling (Vale, llms.txt, asciicast v3,
  lychee) and IA/observability methods (top tasks, card sorting, tree testing,
  zero-result search mining). Does NOT cover: a scan of existing AI-config
  doc-writing skills/rules already published (frame hypothesis 7 — separate
  corpus, separate wave); a full fleet page inventory; Apple's Style Guide,
  which is paywalled (Apple Books) and not fetchable, and the HIG "Writing"
  page, which returned no extractable prose over two fetch attempts — both
  are flagged as a scope gap, not silently assumed.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Diataxis / Divio: the four-type compass](#1-diataxis--divio-the-four-type-compass)
   2. [Google developer documentation style guide](#2-google-developer-documentation-style-guide)
   3. [Microsoft Writing Style Guide](#3-microsoft-writing-style-guide)
   4. [Write the Docs guide](#4-write-the-docs-guide)
   5. [The Good Docs Project](#5-the-good-docs-project)
   6. [GitLab documentation style guide + CTRT](#6-gitlab-documentation-style-guide--ctrt)
   7. [Red Hat supplementary style guide](#7-red-hat-supplementary-style-guide)
   8. [Kubernetes documentation contribution guide](#8-kubernetes-documentation-contribution-guide)
   9. [Django documentation contribution guide](#9-django-documentation-contribution-guide)
   10. [Three practitioner books](#10-three-practitioner-books)
   11. [Tooling: Vale, llms.txt, asciicast v3, lychee](#11-tooling-vale-llmstxt-asciicast-v3-lychee)
   12. [IA and observability methods](#12-ia-and-observability-methods)
   13. [Apple — scope gap](#13-apple--scope-gap)
3. [Candidate topics](#candidate-topics)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The canonical framework underneath nearly every other guide in this corpus is **Diataxis** (formerly the Divio documentation system, same author, Daniele Procida) — not a big-company style guide. Kubernetes credits it explicitly, GitLab's "CTRT" is a renamed variant of it, Django implements its four types without naming it. [diataxis.fr](https://diataxis.fr/), [Kubernetes](https://kubernetes.io/docs/contribute/style/page-content-types/), [GitLab](https://docs.gitlab.com/development/documentation/topic_types/), [Django](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/).
- Every corpus source that names doc types uses **four** (tutorial, how-to, reference, explanation) or more, never three. GitLab adds a fifth, **Troubleshooting**, with its own error→cause→fix contract. The Good Docs Project catalogs 25 distinct template types. A landing/guide/reference three-way split erases the single distinction the corpus insists matters most.
- The most-repeated, most-explicit claim in the whole corpus is that **conflating tutorial and how-to guide actively harms new users** — not a style nit, a structural failure mode named by its own dedicated page. [diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/).
- Big-company style guides (Google, Microsoft) are strong on **word-and-sentence-level** rules (voice, punctuation, modal verbs, bias-free language) but essentially silent on **page-type architecture** — the opposite of what the frame's hypothesis 1 implied. The architecture work is Diataxis's, not theirs.
- **Every rule in this corpus that ships with a number is mechanically checkable**: GitLab caps headings at H5, ~15 links/page, ~100-char line wrap, alt text ≤155 chars, screenshots ≤1000×500px/≤100KB; Django wraps at 80 chars; Google wraps code at 80 chars. None of these are opinions — they are grep/lint targets. [GitLab styleguide](https://docs.gitlab.com/development/documentation/styleguide/).
- **Reference documentation must mirror the actual structure of the code/API**, not an author's preferred grouping — stated independently by Diataxis and implied by Microsoft's fixed reference-article section table. [diataxis.fr/reference](https://diataxis.fr/reference/), [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation).
- **Auto-generated reference docs need a human review pass** before publishing — Microsoft calls this out explicitly ("developers might leave out details… remove implementation or internal details"), and it is the one place autogeneration and hand-authoring guides visibly disagree on emphasis.
- None of the canonical **style guides** (Google, Microsoft, GitLab, Kubernetes, Django) devote a section to measuring whether docs work. Only a **practitioner book** does — "Docs for Developers" chapter 9, "Measuring documentation quality." The frame's hypothesis that observability is under-served is confirmed, and the gap has a precise shape: style guides own words, nobody but a book owns proof.
- GitLab's style guide independently bans **em-dash, semicolon, and curly quotes** in prose — the exact "AI slop" tell list the frame names, arrived at from a completely different motivation (translation and terminal rendering, not AI detection).
- **Prescriptive modal verbs are a named rule**, not a stylistic preference: Google says avoid "should," use "must" for requirements, "can" for optional, "might" for uncertain outcomes. [Google](https://developers.google.com/style/prescriptive-documentation).
- **Timeless-documentation words are an explicit blocklist**: "as of this writing, currently, does not yet, eventually, existing, future, latest, new, now, old, presently, soon" — a straight grep target. [Google](https://developers.google.com/style/timeless-documentation).
- **Django's versionadded/versionchanged convention** solves the temporal-language problem structurally: the annotation is self-contained, sits at the bottom of a section, and has an explicit two-release sunset — it is timeless documentation achieved through format, not through banning all mention of time.
- **llms.txt** (published spec, actively iterated through 2026) is the concrete answer to "agent-readable docs": a markdown file at `/llms.txt` with an H1, a blockquote summary, and H2-grouped links, meant to fit in a context window where the full site cannot. [llmstxt.org](https://llmstxt.org/).
- **Vale** is the verification mechanism the frame's constraint ("every rule carries a verification") is asking for: rule types are `existence`, `substitution`, `occurrence`, `repetition`, `consistency`, `conditional`, `capitalization`, `metric` (readability formulas), `spelling`, `sequence`, `script` — each a `.yml` file under a `StylesPath`. [docs.vale.sh](https://docs.vale.sh/topics/styles/).
- **asciicast v3** shipped 2025-09-10 (revised 2025-10-20); v2 and v3 share the newline-delimited-JSON shape but v3 changed the event-time encoding, so a v2 reader cannot play a v3 file and vice versa. Checked directly: `ocx`'s generated `.cast` files are still `"version": 2` while its player dependency is pinned `^3.15.1` — the fleet's own flagship tested-doc mechanism is one major cast version behind current. [docs.asciinema.org](https://docs.asciinema.org/manual/asciicast/v3/).
- No developer-doc style guide in this corpus states a numeric reading-level target (no guide gives a Flesch-Kincaid grade). The commonly cited "8th grade" figure comes from US federal plain-language/accessibility compliance, a different constraint (broad public audience) than developer docs, whose guides instead ban jargon/idiom for non-native English readers rather than targeting a grade level. Anyone importing "aim for grade 8" into developer docs is importing the wrong guide's constraint.
- **Zero-result search-query mining** and **top-tasks surveys** are the two concrete, low-effort observability techniques found outside the style-guide corpus — both directly test the frame's hypothesis-3 use-case-tier claim by asking users what they actually search for/need, rather than having the project guess a tier order.
- Write the Docs' own principle list contains an internal tension worth preserving rather than flattening: **ARID** ("accept some repetition in documentation") and **Unique** ("eliminate content overlap between separate sources") are not contradictory once read carefully — ARID is about what a *published page* may repeat for skimmability, Unique is about how many *source-of-truth locations* a fact may live in. [Write the Docs](https://www.writethedocs.org/guide/writing/docs-principles/).
- ocx's own `docs-style.md` rule instructs writers to reach for **culture-bound analogies** (Nix store, APT, Homebrew Cellar, SDKMAN) — directly opposed to Google's and Kubernetes' "write for a global audience" / "avoid idioms" guidance. This is a real, fleet-specific tension, not a hypothetical one.

## Findings

### 1. Diataxis / Divio: the four-type compass

Diataxis positions four documentation types on two axes — action vs. cognition, and acquisition vs. application — yielding tutorial (action+acquisition), how-to guide (action+application), explanation (cognition+acquisition), and reference (cognition+application). The "compass" page frames this as a diagnostic truth-table for classifying a section of prose, applicable "close-up, at the level of sentences and words, or from a wider perspective." [The map](https://diataxis.fr/map/), [The compass](https://diataxis.fr/compass/).

**Tutorial contract**: learning-oriented; "a tutorial is not the place for explanation" (link out instead); "ignore options and alternatives"; every action must produce "a comprehensible result, however small"; "aspire to perfect reliability" — a tutorial's path is "carefully-managed" and must "eliminate the unexpected." [diataxis.fr/tutorials](https://diataxis.fr/tutorials/).

**How-to contract**: task-oriented, serves "the already-competent user"; conditional-imperative phrasing ("If you want x, do y"); explicitly "no digression, explanation, teaching"; unlike a tutorial it "must prepare for the unexpected" because "the path can't be managed" — it applies to the real world. [diataxis.fr/how-to-guides](https://diataxis.fr/how-to-guides/).

**The single most emphatic distinction in the corpus**: "A tutorial serves the needs of the user who is at study… A how-to guide serves the needs of the user who is at work." Conflating them "risks getting in the way of those newcomers whom we hope to turn into committed users." This is explicitly *not* about simple-vs-advanced content — both types can be simple or complex; the axis is *why* the reader is here. [diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/).

**Reference contract**: "The structure of the documentation should mirror the structure of the product, so that the user can work their way through them at the same time." Tone is "austere and uncompromising… neutrality, objectivity, factuality." Forbidden: opinion, instruction, explanation, marketing. [diataxis.fr/reference](https://diataxis.fr/reference/).

**Explanation contract**: "understanding-oriented," the only type allowed to "admit opinion and perspective," discuss alternatives, and render a judgment ("w is better than z, because…"). Diataxis calls it "the only kind of documentation that it might make sense to read in the bath." [diataxis.fr/explanation](https://diataxis.fr/explanation/).

**Complex hierarchies**: Diataxis explicitly does not require exactly four top-level sections — a project can nest topic areas or user-type splits inside the four-type arrangement, as long as the arrangement "does not muddle up its different forms and purposes." A worked example given is a product deployable on multiple clouds, where each cloud's workflow gets its own tutorial/how-to/reference split rather than one shared set. [diataxis.fr/complex-hierarchies](https://diataxis.fr/complex-hierarchies/) (fetched via cached search excerpt after two direct 404s — the page exists and is indexed, but did not resolve on either direct fetch attempt).

**Applying it in practice**: Diataxis explicitly rejects big-bang restructuring — "Don't try to work on the big picture… keep taking small steps" — and warns against "empty structures for tutorials/howto guides/reference/explanation with nothing in them. Don't do that. It's horrible." The prescribed loop is choose → assess → decide one next action → do it → repeat. [diataxis.fr/how-to-use-diataxis](https://diataxis.fr/how-to-use-diataxis/).

**Divio vs. Diataxis**: Divio's original write-up ("there isn't one thing called documentation, there are four") is the same four types under the same author, predating the independent diataxis.fr rebrand; no divergence in content was found. [docs.divio.com](https://docs.divio.com/documentation-system/).

### 2. Google developer documentation style guide

Highlights page: second person, active voice, sentence-case headings, serial commas, code font for code, bold for UI elements, unambiguous dates, alt text required. [Highlights](https://developers.google.com/style/highlights).

Tone: "conversational, friendly, and respectful… avoiding slang." Explicit bans: buzzwords, figurative language/metaphor, "please note," exclamation marks, "simple/easy/quick" framing of tasks, sentences repeatedly starting with "You can"/"To." [Tone](https://developers.google.com/style/tone).

Code samples: precede every sample with an introductory sentence; indent 2 spaces (no tabs); wrap at 80 characters; never use `...` or `…` for omitted code — use a language-native comment instead; a block containing an omission must not be marked click-to-copy. [Code samples](https://developers.google.com/style/code-samples).

API reference comments: every class/interface/struct/constant/field/enum/typedef/method must be documented; class descriptions must not repeat the class name or say "this class will/does…"; methods open with a present-tense action verb by role (getter/setter/creator/callback); deprecations must "tell the user what to use as a replacement." [API reference comments](https://developers.google.com/style/api-reference-comments).

Prescriptive documentation: "recommends a way to achieve tasks… tells the reader what to do instead of giving them a list of options"; "generally avoid the word *should*" — use "must" (required), "we recommend" (recommended), "can" (optional), "might" (possible outcome). [Prescriptive documentation](https://developers.google.com/style/prescriptive-documentation).

Timeless documentation: ban list — "as of this writing, currently, does not yet, eventually, existing, future, latest, new, now, old, presently, soon" — because they "anchor the documentation to a point in time." If newness must be conveyed, attach a date or version number instead. [Timeless documentation](https://developers.google.com/style/timeless-documentation).

Accessibility: alt text on every image; no skipped heading levels; 4.5:1 text contrast; never color-only communication; meaningful link text ("never 'click here'"); table headers use `<th>`, never merged cells (`colspan`/`rowspan` banned). [Accessibility](https://developers.google.com/style/accessibility).

The guide's own top-level navigation has no dedicated "tutorial" section (a direct `/style/tutorials` URL 404s) — Google's guide is word/sentence-level only; it does not attempt a page-type architecture. [developers.google.com/style](https://developers.google.com/style).

### 3. Microsoft Writing Style Guide

Top 10 tips: bigger ideas/fewer words; write like you speak; use contractions; front-load what's scannable; sentence-case headings (never title case); no period/colon on headings; serial (Oxford) comma; one space after sentence-ending punctuation, no spaces around em dash; start sentences with verbs, cut "there is/are/were." [Top 10 tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice).

Developer content: "it's OK to assume IT pros and developers bring a fundamental understanding of programming concepts" — skip basics, focus on product-specific detail; two foundational content types are reference documentation and code examples. [Developer content](https://learn.microsoft.com/en-us/style-guide/developer-content/).

Reference documentation: fixed section table — title+description, declaration/syntax, parameters, return value, remarks, example, requirements/applies-to, see-also (plus property-value/exceptions/permissions where relevant); article titles follow `Element ElementType` (e.g. "Clear method"), disambiguated by parent/product name when the name collides. Crucially: **"If you automatically generate reference documentation and comments from the source code, review the quality and appropriateness of the comments… Remove any implementation or internal details that aren't suitable for documentation."** [Reference documentation](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation).

Code examples: "always compile and test your code"; design for reuse; comment for clarity without stating the obvious; show expected output; only show exception handling when intrinsic to the point being made; write secure code — "always validate user input, never hard-code passwords… use code-analysis tools." [Code examples](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples).

Procedures: "The best procedure is the one you don't need" — try a picture/video/one-sentence instruction before reaching for a numbered list; document every input method (mouse, keyboard, voice, controller) to support accessibility. [Procedures and instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions).

Scannable content: F-shaped reading pattern, most important info upper-left; paragraphs "three to seven lines" is "about the right length"; every long document needs internal navigation (TOC, back-to-top links); consistent formatting patterns (e.g. bold always means UI label) build reader trust. [Scannable content](https://learn.microsoft.com/en-us/style-guide/scannable-content/).

Bias-free communication: gender-neutral job terms (chair not chairman); no generic he/she — rewrite to second person, plural, or singular "they"; real people keep their own pronouns; diverse names/roles in fictitious examples; no idioms that read as cultural appropriation; disability language focuses on the person, not the condition. [Bias-free communication](https://learn.microsoft.com/en-us/style-guide/bias-free-communication).

### 4. Write the Docs guide

Its principle list (general/content/sources/publications/body tiers) includes items the frame's list does not name: **ARID** ("accept (some) repetition in documentation" — DRY does not fully apply to docs), **Skimmable**, **Exemplary** (some examples, kept separate from dense reference), **Nearby** (store sources as close as possible to the code they document), **Unique** (no parallel-maintained duplicate sources), **Discoverable**, **Addressable** (deep-linkable), **Cumulative** (prerequisite concepts first), **Complete** (cover a chosen topic fully or not at all — no partial coverage), **Beautiful**, **Comprehensive** (the whole body, not any one page, must answer all likely questions). [Docs principles](https://www.writethedocs.org/guide/writing/docs-principles/).

Docs as code: git-based, plain-text markup (Markdown/reST/AsciiDoc), PR-based review, CI-published; teams can "block merging of new features if they don't include documentation." [Docs as code](https://www.writethedocs.org/guide/docs-as-code/).

The full guide's table of contents includes sections the frame's hypothesis list omits entirely: **SEO for documentation**, **DocOps**, **UX writing**, and a dedicated **accessibility guidelines** section separate from the style-guide section. [Write the Docs guide index](https://www.writethedocs.org/guide/).

### 5. The Good Docs Project

Catalogs 25 distinct template types, not four and not three: API getting started, API reference, Bug report, Changelog, Code of Conduct (+ incident record, remediation record, response plan), Concept, Contact support, Contributing guide, Glossary, How-to, Installation guide, Our team, Quickstart, README, Reference, Release notes, SDK Overview, Style guide, Terminology system, Troubleshooting, Tutorial, User personas. [Template list](https://thegooddocsproject.dev/template/). The project's own framing is deliberately unopinionated about *which* templates a given project needs ("browse our template packs… find a template that matches your use case") — it supplies the parts catalog, not the tiering logic the frame's hypothesis 3 wants. [thegooddocsproject.dev](https://thegooddocsproject.dev/).

### 6. GitLab documentation style guide + CTRT

GitLab's own type system — **CTRT**: Concept, Task, Reference, Troubleshooting — adds a type Diataxis doesn't name directly. **Troubleshooting** has its own contract: error message in the title (state the message type first, e.g. "Error:", abbreviate with `...` past 70 chars, never link in a title), then in the body a fixed error → "This issue occurs when…" (cause) → "workaround" (temporary fix) or "resolve" (permanent fix) pattern. [Topic types](https://docs.gitlab.com/development/documentation/topic_types/), [Troubleshooting topic type](https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/).

Voice: "conversational but brief, friendly but succinct"; active voice; never "allow/enable" framing; never "easily/simply"; never write about the document itself ("This page shows…" banned). [Style guide](https://docs.gitlab.com/development/documentation/styleguide/).

Exact, mechanically checkable thresholds: line wrap ~100 characters (links never split); heading depth capped at H5 — "if you need more than five heading levels, move the topics to a new page instead"; soft cap ~15 links per page; screenshots ≤1000×500px and ≤100KB; alt text ≤155 characters; acronyms spelled out once per page, never twice. Banned outright: possessive proper nouns ("Docker's CLI"), semicolons, en/em dashes, curly quotes, real usernames/emails/tokens in examples. Vale rules named directly: `British.yml`, `SelfReferential.yml`, `OxfordComma.yml`, `SentenceSpacing.yml`, `NonStandardQuotes.yml`, `SubstitutionWarning.yml`, `ReferenceLinks.yml`, `MultiLineLinks.yml`; markdownlint rule `MD029`. [Style guide](https://docs.gitlab.com/development/documentation/styleguide/).

### 7. Red Hat supplementary style guide

Layers on top of IBM Style (hierarchy: product guide → Red Hat supplementary → IBM Style). Modular-docs conventions: concept-topic titles must be noun phrases and must never start with "Understanding"/"Understand"; every module/assembly needs a short description **50–300 characters** long; a single-step procedure is written as an unnumbered bullet, not a numbered list of one; one command per code block, output in its own separate block; no admonition may open a module. Banned terms: contractions outside conversational contexts, "blacklist/whitelist" (→ allowlist/blocklist), "master/slave" (→ primary/secondary). [Red Hat supplementary style guide](https://redhat-documentation.github.io/supplementary-style-guide/).

### 8. Kubernetes documentation contribution guide

Page content types: **Concept**, **Task**, **Tutorial**, **Reference** — each with a fixed shortcode-driven section skeleton (`overview`/`prerequisites`/`steps`/`discussion`/`whatsnext` for Task; adds `objectives`/`lessoncontent`/`cleanup` for Tutorial); `whatsnext` lists cap at 5 items; the docs explicitly point to **Diataxis** as the framework behind this scheme. [Page content types](https://kubernetes.io/docs/contribute/style/page-content-types/).

Style guide: present tense, active voice, address the reader as "you," no Latin abbreviations, no "we," no future-tense promises ("avoid statements about the future" and "statements that will soon be out of date"), no unexplained jargon for non-native readers; PascalCase for API object names (`ConfigMap`, not `configMap`); angle brackets for placeholders; code blocks show no shell prompt character. [Style guide](https://kubernetes.io/docs/contribute/style/style-guide/).

### 9. Django documentation contribution guide

Implements the same four types (tutorials/topic guides/reference guides/how-to guides) as Diataxis, word-for-word close in spirit, **without ever naming Diataxis**. "Topic guides… link to reference material rather than repeat it"; "a how-to should always be result-oriented rather than focused on internal details." [Writing documentation](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/).

`versionadded`/`versionchanged` directives must be **self-contained** ("since we only keep these annotations around for two releases, it's nice to be able to remove [one]… without having to reflow, reindent, or edit the surrounding text") and placed at the bottom of a section, never the top — a structural solution to the "timeless documentation" problem rather than a ban on ever mentioning versions. Mandatory gender-neutral "they" throughout. Explicit ban on minimizing language: "easily, simply, just, merely, straightforward." Automated checks: `make spelling` (`sphinxcontrib-spelling` + a checked-in `docs/spelling_wordlist`), `make black` (all Python code blocks auto-formatted via `blacken-docs`), `make linkcheck`.

### 10. Three practitioner books

**Docs for Developers** (Bhatti, Corleissen, Lambourne, Nunez, Waterhouse) — 11 chapters running audience research → planning → drafting → editing → code samples → visuals → publishing → **feedback** → **measuring documentation quality** → organizing → maintaining/deprecating. Chapter 1 introduces the **friction log** (recording every point of confusion during a first-time walkthrough) as the audience-research method; chapter 9 is the only source in this whole survey with an explicit "documentation quality metrics" chapter. [Table of contents](https://docsfordevelopers.com/table-of-contents/).

**Every Page is Page One** (Mark Baker) — eight EPPO topic principles: self-contained, specific-and-limited purpose, conform to (subject-specific, not generic) type, establish context for any entry point, assume a qualified reader while orienting the unqualified one, maintain a single depth level per topic, link richly for bottom-up navigation, and give the "big picture" its own explicit topic. The premise: web readers "forage… seeking good-enough information that takes the least effort," so no page may assume the reader arrived from the page before it. [The book](https://everypageispageone.com/the-book/).

**Docs Like Code** (Anne Gentle) — the tagline is "Write, Review, Test, Merge, Build, Deploy, Repeat": docs live in git, ship through the same PR review developers already use, and publish via CI/CD on every merge, with no manual publish step. [docslikecode.com](https://www.docslikecode.com/).

### 11. Tooling: Vale, llms.txt, asciicast v3, lychee

**Vale**: rule files are `.yml` (not `.yaml`) under a `StylesPath`; each rule declares `extends` (the check type), `message`, optional `level` (suggestion/warning/error) and `scope`. Check types: `existence`, `substitution`, `occurrence`, `repetition`, `consistency`, `conditional`, `capitalization`, `metric` (readability formulas), `spelling` (Hunspell), `sequence` (POS-tag patterns), `script` (custom Tengo). [docs.vale.sh](https://docs.vale.sh/topics/styles/).

**llms.txt**: a markdown file at `/llms.txt` (or a subpath) with a required H1, a blockquote summary, optional prose, and H2-grouped markdown link lists — the curated, context-window-sized counterpart to a full sitemap; sites should also expose `.md` alternates of pages and can advertise them with `rel="alternate" type="text/markdown"`. [llmstxt.org](https://llmstxt.org/).

**asciicast v3**: spec published 2025-09-10 (revised 2025-10-20); shares v2's newline-delimited-JSON shape but changed the event-time encoding, making v2 and v3 mutually unreadable by each other's players. Ecosystem support (asciinema CLI v3.0, player v3.10.0, server 20250509) landed through 2025. **Fleet-specific finding**: `ocx`'s own generated `.cast` fixtures under `test/.out/casts/` are still `"version": 2` while `website/package.json` pins the player at `^3.15.1` (a v3-capable player). The ADR-mandated tested-doc mechanism is not on the current cast format. [docs.asciinema.org](https://docs.asciinema.org/manual/asciicast/v3/).

**lychee**: a Rust link checker for Markdown/HTML/reST/source, built for CI, checks URLs concurrently and can verify in-page anchor fragments — directly relevant given several fleet repos (including `ocx`) are Rust projects. [lychee.cli.rs](https://lychee.cli.rs/) (secondary-sourced via search excerpt, not directly fetched).

### 12. IA and observability methods

**Card sorting vs. tree testing**: card sorting is generative ("to generate ideas for organizing content"), tree testing is evaluative ("to evaluate an existing or proposed navigation structure") — run on a stripped, nav-free, sitemap-like text tree. NN/g recommends using both, sequentially, rather than either alone; no sample-size number was stated in the fetched source. [NN/g](https://www.nngroup.com/articles/card-sorting-tree-testing-differences/).

**Top tasks** (Gerry McGovern): a survey-based method for finding the "vital few" tasks users actually come for versus the "trivial many" a project assumes matter — the direct, named methodology for validating (or overturning) any assumed use-case tier order. The primary source returned HTTP 403 on fetch; this entry is secondary-sourced from search results and should be re-verified against the primary before being asserted as a rule.

**Zero-result search mining**: reviewing a docs site's search analytics for queries that returned nothing is a standard, concrete observability practice with Algolia DocSearch built-in support for it; the corrective pattern is a "no results" state that still offers a path (forum link, issue template) rather than a dead end.

### 13. Apple — scope gap

Two independent fetch attempts against `developer.apple.com/design/human-interface-guidelines/writing` returned only the page title with no body content (the page is client-rendered and not amenable to this tool), and the Apple Style Guide itself is distributed only as a paid Apple Books download, not a fetchable URL. Apple's specific documentation guidance is therefore **not verified** in this survey; any future rule claiming to reflect Apple's style should treat that claim as unconfirmed until read directly from the book.

## Candidate topics

| slug | label | why it matters | source | already-covered? | priority | doc type |
|---|---|---|---|---|---|---|
| tutorial-how-to-conflation | Does the docs conflate tutorials and how-to guides under one "guide" bucket? | The corpus's single most-repeated failure mode; a 3-way split makes it undetectable | [diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/) | no | high | guide |
| doc-type-frontmatter-tag | Does every page declare which of the ≥4 canonical types it is, so mixing can be linted? | Enables a mechanical check instead of an editorial opinion | [Kubernetes](https://kubernetes.io/docs/contribute/style/page-content-types/), [GitLab](https://docs.gitlab.com/development/documentation/topic_types/) | no | high | cross-cutting |
| tutorial-eliminates-choice | Do the fleet's tutorials eliminate options/alternatives instead of offering them mid-flow? | Named as a hard requirement, not a preference | [diataxis.fr/tutorials](https://diataxis.fr/tutorials/) | no | high | guide |
| tutorial-visible-result-every-step | Does every tutorial step produce a visible, checkable result before the next step? | The tutorial's whole reliability contract rests on this | [diataxis.fr/tutorials](https://diataxis.fr/tutorials/) | no | high | guide |
| reference-mirrors-code | Does reference documentation's structure mirror the actual code/API structure? | Independently stated by two frameworks; violated silently as code drifts | [diataxis.fr/reference](https://diataxis.fr/reference/), [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation) | partial | high | reference |
| reference-neutral-tone | Does reference prose stay purely descriptive — no opinion, instruction, or marketing? | Reference is the type most often quietly contaminated by tutorial prose | [diataxis.fr/reference](https://diataxis.fr/reference/) | no | medium | reference |
| autogen-reference-review-pass | Is auto-generated API reference reviewed to strip internal-only details before publishing? | Named explicitly as a failure mode of blind codegen | [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation) | no | high | reference |
| modal-verb-precision | Does the docs use "must/can/might" precisely instead of ambiguous "should"? | A named, gremlin-catching word rule with a clear grep target | [Google](https://developers.google.com/style/prescriptive-documentation) | no | medium | cross-cutting |
| timeless-language-grep | Can a grep catch stale-prone words (now, currently, soon, latest, new, existing)? | Explicit blocklist exists already — free verification | [Google](https://developers.google.com/style/timeless-documentation) | no | high | cross-cutting |
| bias-free-pronoun-grep | Can a grep catch generic he/she/his/her instead of you/they? | Mechanical, cheap, and mandated by two independent guides | [Microsoft](https://learn.microsoft.com/en-us/style-guide/bias-free-communication), [Django](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/) | no | medium | cross-cutting |
| scannable-paragraph-length | Are paragraphs kept to roughly 3-7 lines with no long unbroken blocks? | ocx's rule says "short paragraphs" with no number to check against | [Microsoft](https://learn.microsoft.com/en-us/style-guide/scannable-content/) | partial | medium | cross-cutting |
| heading-depth-cap | Is heading depth capped (no H6+) so the page never out-nests the TOC/right-rail? | Exact number given; trivial to lint | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/) | no | medium | cross-cutting |
| links-per-page-cap | Is there a soft cap on links-per-page so density doesn't defeat scanning? | ocx's rule mandates hyperlinking *everything*, which can collide with this cap | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/) | no | low | cross-cutting |
| line-length-wrap | Is doc source wrapped at a fixed column for diffability? | Three independent guides give three close numbers (80/80/100) | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/), [Django](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/), [Google](https://developers.google.com/style/code-samples) | partial | low | process |
| alt-text-length-cap | Do images carry alt text under a length cap that still says what the image shows? | Exact number given (≤155 chars); ocx's rule never mentions alt text at all | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/), [Google](https://developers.google.com/style/accessibility) | no | medium | cross-cutting |
| color-contrast-docs-site | Does the docs site/theme meet 4.5:1 text contrast and never rely on color alone? | A site-level, not a prose-level, accessibility gap | [Google](https://developers.google.com/style/accessibility) | no | medium | cross-cutting |
| table-header-semantics | Do docs tables use real header cells instead of bolded first-row text? | Cheap to check in rendered HTML; screen-reader-breaking if missed | [Google](https://developers.google.com/style/accessibility) | no | low | reference |
| vale-lint-infra | Is a Vale (or textlint/write-good) style package wired into CI so prose rules are enforced, not just written down? | This is the literal mechanism the frame's "every rule carries a verification" constraint is asking for | [docs.vale.sh](https://docs.vale.sh/topics/styles/) | no | high | process |
| code-sample-no-secrets | Are code samples scanned for hardcoded secrets/credentials before merge? | Named explicitly as a "write secure code" requirement, ignored by most style guides | [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples) | no | high | guide/reference |
| code-sample-compiles | Is every code sample in the docs actually compiled/run in CI, not eyeballed? | Directly extends the frame's asciicast hypothesis to *inline* code, which casts don't cover | [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples), [Django](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/) | partial | high | process |
| omitted-code-marker | Are omitted lines in code samples marked with a real comment, never "..."? | Concrete, easy grep; a common LLM tic in generated samples | [Google](https://developers.google.com/style/code-samples) | no | low | reference |
| asciicast-version-currency | Are recorded casts on the current asciicast v3 format, or silently stuck on v2? | Fleet-verified: ocx's own casts ARE stuck on v2 against a v3-capable player | [docs.asciinema.org](https://docs.asciinema.org/manual/asciicast/v3/) | no | high | process |
| llms-txt-presence | Does the docs site publish an llms.txt (and markdown-alternate pages) for agent readers? | Directly serves this artifact's own audience — agents reading these docs | [llmstxt.org](https://llmstxt.org/) | no | high | cross-cutting |
| zero-result-search-mining | Is the docs search's zero-result query log reviewed to find missing content? | Concrete, low-effort observability signal absent from every style guide | Algolia DocSearch practice (secondary) | no | high | process |
| task-completion-measurement | Is there any measured signal for whether a page actually let the reader finish their task? | The one gap every canonical style guide shares; only a practitioner book covers it | [Docs for Developers ch.9](https://docsfordevelopers.com/table-of-contents/) | no | high | process |
| friction-log-before-writing | Has anyone run a first-time-user friction log before drafting the guide? | The concrete, cheap version of "test with real users" | [Docs for Developers ch.1](https://docsfordevelopers.com/table-of-contents/) | no | medium | process |
| top-tasks-survey | Has the project surveyed users to find its actual top tasks, rather than assuming the tier order? | Directly tests the frame's use-case-tier hypothesis instead of asserting it | Gerry McGovern top-tasks method (secondary, primary 403'd) | no | high | process |
| tree-test-nav | Has the proposed nav structure been tree-tested for findability before shipping? | Ships a hypothesis about the nav as a testable claim, not an assertion | [NN/g](https://www.nngroup.com/articles/card-sorting-tree-testing-differences/) | no | medium | cross-cutting |
| card-sort-ia | Was the docs' category structure derived from how users group topics, or from the org chart? | Cheap, standard method the corpus's style guides never mention | [NN/g](https://www.nngroup.com/articles/card-sorting-tree-testing-differences/) | no | medium | cross-cutting |
| changelog-vs-release-notes | Does the project distinguish a terse changelog from narrative release notes as separate contracts? | A 5th/6th doc type the frame's 3-way split has no room for | [Good Docs templates](https://thegooddocsproject.dev/template/) | no | medium | reference/guide |
| troubleshooting-doc-type | Is there a dedicated troubleshooting/error-reference type with a fixed error→cause→fix pattern? | GitLab treats this as a first-class 5th type, not a how-to subtype | [GitLab troubleshooting](https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/) | no | high | reference |
| glossary-terminology-system | Is there one canonical glossary that pages link to on first use, instead of redefining terms? | Two independent sources name this as its own artifact | [Good Docs](https://thegooddocsproject.dev/template/), [Kubernetes](https://kubernetes.io/docs/contribute/style/style-guide/) | no | medium | reference |
| versionadded-sunset-rule | Do version-introduced/changed annotations carry an explicit removal point? | Solves "timeless documentation" structurally rather than by banning temporal words | Django versionadded convention | no | medium | reference |
| link-rot-ci-check | Does CI run a link checker against the published docs on a schedule? | Concrete tool exists and matches the fleet's Rust-heavy stack | [lychee.cli.rs](https://lychee.cli.rs/) | partial | medium | process |
| auto-vs-manual-tension | Where auto-generated reference and hand-authored guide overlap, which is the source of truth the other must link to? | Names a real editorial decision the corpus otherwise leaves implicit | [Write the Docs "Unique"](https://www.writethedocs.org/guide/writing/docs-principles/), [Microsoft](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation) | no | medium | cross-cutting |
| i18n-readability | Is prose written to survive translation even if the project is English-only today? | ocx's own rule directly contradicts this (mandates culture-bound analogies) | [Google](https://developers.google.com/style/tone), [Kubernetes](https://kubernetes.io/docs/contribute/style/style-guide/) | partial | low | cross-cutting |
| eppo-vs-tutorial-linearity | Does a "make every page self-contained" instinct get applied to tutorials, where it actively breaks the required linear hand-holding? | A real cross-book contradiction that a naive merge of sources would miss | [Every Page is Page One](https://everypageispageone.com/the-book/) vs [diataxis.fr/tutorials](https://diataxis.fr/tutorials/) | no | medium | guide |
| self-referential-ban | Does the docs avoid writing about itself ("this page shows…", "this guide explains…")? | A specific, named, mechanically greppable ban | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/) | no | low | cross-cutting |
| single-step-not-numbered | Is a one-step procedure written as a bullet, not a numbered list of one? | Small, specific, and commonly gotten wrong by template-following writers | [Red Hat](https://redhat-documentation.github.io/supplementary-style-guide/) | no | low | guide |

## AI-agent angle

- **Collapses tutorial and how-to into one "guide" page.** An LLM asked for "a guide to X" will default to a hybrid: it opens with a learning frame, then drops in mid-write into task-mode conditionals ("if you want Y, do Z"), producing a document that fully serves neither a first-time learner nor a competent user in a hurry. Mechanical check: grep the page for both a first-person-plural "we'll build/we're going to" opening *and* a conditional-imperative pattern ("if you want to X, run Y") later in the same file — that co-occurrence is the conflation signature.
- **Writes reference docs that drift from the reference's own justification.** Asked to document an API, a model will often narrate *why* a parameter exists or *when you'd want* a given option — explanation and how-to leaking into what should be neutral description. Mechanical check: grep reference-typed pages for first- or second-person pronouns ("you," "we") and hedging verbs ("consider," "you might want") — reference prose should read almost entirely in third person, present tense, declarative.
- **Reaches for temporal words by default.** "Currently," "now," "the new X," and "as of this writing" are extremely common LLM hedges/transition words, and they are exactly Google's timeless-documentation blocklist. Mechanical check: grep for the literal word list Google publishes; every hit is either a bug or needs a version/date anchor attached.
- **Generates plausible-looking code samples that were never run.** An LLM will produce a syntactically clean example that silently fails against the real API (wrong parameter name, deprecated flag, a version bump the model's training predates). Mechanical check: the sample must exist as an actual file the CI compiles/executes — a sample block that has no corresponding runnable fixture is the smell.
- **Defaults to "should" everywhere**, blurring requirement from recommendation from possibility. Mechanical check: grep prose for "should" outside of code/API defaults; each hit gets reclassified as must/can/might per Google's rule.
- **Produces subtly biased example content** — gendered pronouns in generic scenarios, Western-default names and locales in fictitious examples. Mechanical check: grep for "he/his/she/her" outside direct quotes or named-real-person contexts.
- **Fabricates a plausible but non-existent llms.txt-adjacent claim** (i.e., asserts agent-readability exists because the site "looks structured") rather than checking for the literal file. Mechanical check: `curl -I https://<site>/llms.txt` — a 200 or a 404, nothing else settles it.
- **Writes analogies from training-data familiarity rather than research**, exactly the failure ocx's own rule tries to prevent with "always search internet before writing comparisons" — but an agent that skips that step (or hallucinates a plausible-sounding tool name) produces a wrong, uncheckable analogy. Mechanical check: every named external tool/analogy target must resolve to a real, fetched URL in the same turn it was introduced.

## Contested / evolving

- **Big-company style guides vs. Diataxis-family frameworks, as of 2026.** Google's and Microsoft's guides remain almost entirely silent on page-type architecture even in their current (2026-updated) editions — Microsoft's `top-10-tips` page itself carries a `ms.date: 2026-07-02` stamp, so this is not a stale artifact, it's the guide's live, current position. Meanwhile every doc-heavy open-source project checked (Kubernetes, GitLab, Django) has independently adopted or credited the Diataxis four-type split. The trend as of this survey: **page-type architecture is converging on Diataxis/CTRT; word-and-sentence style is converging on the big-company guides** — treating either family as sufficient on its own is the outdated position.
- **Whether reference docs should be autogenerated or hand-authored.** Diataxis's contract ("mirror the structure of the product") is agnostic to authorship; Microsoft explicitly flags autogeneration as a *risk* needing a review pass, not a *solution*. No guide in this corpus argues for pure hand-authoring at scale — the live disagreement is over how much automated review (linting the generated prose, not just the code) is enough, and that tooling (LLM-assisted reference cleanup) is moving faster than any of these guides currently document.
- **Whether AI-assisted docs search/chat replaces classic keyword search.** The 2026 docs-platform landscape (Mintlify, Docusaurus 3, Starlight, VitePress) is now explicitly marketed and compared on "AI readiness," `llms.txt`/`llms-full.txt` support, and built-in chat — a shift from 2023-era comparisons that focused on build speed and theming. This is trending, not settled: none of the canonical style guides surveyed here have caught up to write guidance for how prose should differ (if at all) when an AI answer layer sits in front of it.
- **Repetition: ARID vs. DRY.** Write the Docs explicitly rejects strict DRY for documentation ("accept some repetition") while still demanding a single source of truth per fact ("Unique"). This is a stable, resolved position within that guide, but it is easy to over-apply "Unique" as "never repeat a sentence anywhere," which the same guide does not intend — worth stating precisely rather than "it depends."
- **Reading-level targets.** No developer-doc style guide in this corpus states a Flesch-Kincaid number; the "grade 8" figure that keeps surfacing in general web-writing advice comes from US federal plain-language/accessibility compliance for public-facing content, a different audience contract than a technically literate, possibly non-native-English developer reader. Whether a fleet like this one should adopt *any* numeric grade target, versus Kubernetes'/Google's jargon-and-idiom-avoidance approach, is unresolved in the corpus and should be decided rather than inherited by default.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [diataxis.fr](https://diataxis.fr/) | Diataxis framework home | Live, ongoing (checked 2026-09-05) | The load-bearing doc-type framework nearly every other guide here derives from or converges with |
| [diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/) | Diataxis: tutorial-vs-how-to distinction page | same | The corpus's single most emphatic, most-repeated distinction |
| [diataxis.fr/reference](https://diataxis.fr/reference/) | Diataxis reference-type contract | same | "Mirror the structure of the product" — the reference contract's load-bearing rule |
| [diataxis.fr/how-to-use-diataxis](https://diataxis.fr/how-to-use-diataxis/) | Applying Diataxis in practice | same | The iterative, no-empty-structures application method |
| [developers.google.com/style](https://developers.google.com/style) | Google developer documentation style guide | Live, continuously updated | Primary, and the reference point for "big-company style guide" |
| [developers.google.com/style/timeless-documentation](https://developers.google.com/style/timeless-documentation) | Google: timeless documentation | same | An explicit, greppable stale-word blocklist |
| [developers.google.com/style/prescriptive-documentation](https://developers.google.com/style/prescriptive-documentation) | Google: prescriptive documentation | same | The must/can/might modal-verb rule |
| [learn.microsoft.com/style-guide](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) | Microsoft Writing Style Guide, top-10 tips | Page stamped `2026-07-02` — actively maintained | Confirms the guide is current, not legacy, as of this survey's era |
| [learn.microsoft.com/style-guide/developer-content/reference-documentation](https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation) | Microsoft: reference documentation contract | same | Fixed section table + the autogen-review-pass warning |
| [writethedocs.org/guide](https://www.writethedocs.org/guide/) | Write the Docs guide, full TOC | Live | Surfaces SEO-for-docs, DocOps, UX writing — topics the frame's list omits |
| [docs.divio.com/documentation-system](https://docs.divio.com/documentation-system/) | Divio documentation system (Diataxis's predecessor write-up) | Same author (Procida) | Confirms no material divergence from diataxis.fr |
| [thegooddocsproject.dev/template](https://thegooddocsproject.dev/template/) | The Good Docs Project template catalog | Live | Empirically disproves any 3-or-4-type doc taxonomy — 25 named templates |
| [docs.gitlab.com/development/documentation/styleguide](https://docs.gitlab.com/development/documentation/styleguide/) | GitLab documentation style guide | Live | Every numeric threshold and Vale rule name cited in this report |
| [docs.gitlab.com/development/documentation/topic_types/troubleshooting](https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/) | GitLab: Troubleshooting topic type | Live | The 5th doc type (error→cause→fix) missing from the frame's 3-way split |
| [redhat-documentation.github.io/supplementary-style-guide](https://redhat-documentation.github.io/supplementary-style-guide/) | Red Hat supplementary style guide | Live | Modular-docs conventions (short-description length band, single-step-as-bullet) |
| [kubernetes.io/docs/contribute/style/page-content-types](https://kubernetes.io/docs/contribute/style/page-content-types/) | Kubernetes page content types | Live | Explicit shortcode-template contract per type, credits Diataxis by name |
| [kubernetes.io/docs/contribute/style/style-guide](https://kubernetes.io/docs/contribute/style/style-guide/) | Kubernetes style guide | Live | "Avoid statements about the future," PascalCase API-object rule |
| [docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation](https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/) | Django docs contribution guide | 5.2 release docs | The versionadded/versionchanged self-contained/sunset mechanism |
| [docsfordevelopers.com/table-of-contents](https://docsfordevelopers.com/table-of-contents/) | "Docs for Developers" book, official TOC | Book pub. 2021, site live | The only source in this survey with a dedicated documentation-quality-measurement chapter |
| [everypageispageone.com/the-book](https://everypageispageone.com/the-book/) | "Every Page is Page One" book site | Book pub. 2013, site live | The self-contained-topic model that stands in tension with Diataxis's tutorial linearity |
| [docslikecode.com](https://www.docslikecode.com/) | "Docs Like Code" official site | Site live (book 3rd ed. 2022) | The CI/CD-publish, PR-review workflow claim |
| [llmstxt.org](https://llmstxt.org/) | llms.txt specification | Live spec, actively iterated in 2026 | Directly relevant to this artifact's own reader (a coding agent) |
| [docs.vale.sh/topics/styles](https://docs.vale.sh/topics/styles/) | Vale prose-linter rule-authoring docs | Live | The concrete mechanism satisfying "every rule carries a verification" |
| [docs.asciinema.org/manual/asciicast/v3](https://docs.asciinema.org/manual/asciicast/v3/) | asciicast v3 format spec | Published 2025-09-10, revised 2025-10-20 | Directly checked against ocx's own `.cast` fixtures — found on stale v2 |
