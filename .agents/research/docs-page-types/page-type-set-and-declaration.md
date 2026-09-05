---
title: Documentation design — the page-type set and its declaration
topic: page-type-set-and-declaration
group: docs-page-types
agent: docs-page-types-set-declaration-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
scope: |
  Decides the exact content-type set a shipped docs-quality rule enforces, the
  mechanism a page uses to declare which type it is, and one tested mixing
  check with a measured false-positive rate. Covers Diataxis's four types,
  GitLab's fifth (troubleshooting), The Good Docs Project's 25 templates, the
  declaration key/value/syntax and its portability across MkDocs Material,
  VitePress and mdBook, and the culture-bound-analogy conflict. Does NOT cover
  the landing page's own required contents (landing-page-contract.md), the
  reference page's fixed sections (reference-page-contract.md), readability
  thresholds, or the em-dash/AI-tell list (owned by docs-plain-english).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The type set: five, not three, not four alone, not 25](#1-the-type-set-five-not-three-not-four-alone-not-25)
   2. [A landing page is a navigation layer, not a type](#2-a-landing-page-is-a-navigation-layer-not-a-type)
   3. [Diataxis's evidentiary status: contract or diagnostic](#3-diataxiss-evidentiary-status-contract-or-diagnostic)
   4. [The declaration mechanism: a comment, not frontmatter](#4-the-declaration-mechanism-a-comment-not-frontmatter)
   5. [Directory position, measured](#5-directory-position-measured)
   6. [The mixing check, tested against real pages](#6-the-mixing-check-tested-against-real-pages)
   7. [Culture-bound analogies vs a global audience](#7-culture-bound-analogies-vs-a-global-audience)
   8. [GitLab's troubleshooting contract, and the Good Docs corroboration](#8-gitlabs-troubleshooting-contract-and-the-good-docs-corroboration)
   9. [Reference mirrors the product; autogeneration needs a review pass](#9-reference-mirrors-the-product-autogeneration-needs-a-review-pass)
   10. [Complex hierarchies: still unreachable](#10-complex-hierarchies-still-unreachable)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Ship **five** declared content types — tutorial, how-to, reference, explanation, troubleshooting — never the frame's three, never Diataxis's bare four alone, never The Good Docs Project's 25 templates as a rival scheme. A landing page sits above all five as a navigation layer, never a sixth type.
- The Good Docs Project's own recommended starting bundle, the **Core Pack**, is Concept + How-to + README + Reference + Release notes + Troubleshooting + Tutorial — Diataxis's four, plus troubleshooting, plus a landing artifact, plus a reference sub-variant. It **corroborates** the five-type decision; it is not a rival system to reconcile. [The Good Docs Project template list](https://thegooddocsproject.dev/template/).
- Declare a page's type with an HTML comment, `<!-- doc_type: VALUE -->`, on line 1 — **not YAML frontmatter**. Verified directly: `grimoire`'s mdBook site has no frontmatter preprocessor configured (`grimoire/docs/book.toml`), so a `---\ndoc_type: x\n---` block would render as literal visible text on every page of the one repo in this fleet that doesn't already use frontmatter. An HTML comment is invisible in rendered HTML on all three measured generators (MkDocs Material, VitePress, mdBook) and needs no new dependency.
- An untyped page **fails**, it does not warn. A warning-severity rule on a fleet that already carries ~92 prose rules with 2 citing a check is empirically a rule nobody fixes; the `docs-plan` skill's inventory step backfills every existing page's declaration before the check is turned on, so day-one enforcement never blocks day-one adoption.
- Directory position is a convention for humans, never a substitute for the declared comment. Measured directly: MkDocs-Material sites with Diataxis-shaped directories path-classify at 0/35 "other" (`ocx-mirror-sdk`) to 3/23 "other" (`ocx-catalog`), while `grimoire`'s flat mdBook tree path-classifies 18/23 pages (78%) as unclassifiable "other" — same kind of content, a worse directory shape. A lint that infers type from path silently breaks on exactly the one repo whose layout doesn't already match.
- Tested both literal mixing-check candidate signatures named in the research brief — a "we'll build X" learning-oriented opener co-occurring with a later conditional-imperative sentence, and a reference-tagged page whose first paragraph carries a "problem" framing — against ocx's real, measured 44-page docs surface (`user-guide.md` at 14,130 words, `getting-started.md`, `installation.md`, `faq.md`, `authoring/index.md`, `in-depth/storage.md`, all nine `reference/*.md` pages). **Zero hits fleet-wide for either signature as originally worded.** This is a clean-baseline result, not proof the check is broken: the fleet's existing, human-edited prose never uses "we'll"/"let's" framing at all (0/44 files), so the check has nothing to fire on today — ship it to gate new, agent-authored pages going forward, not to find existing violations.
- The conditional-imperative half, run **without** scoping it to `how-to`/`tutorial`-declared pages, produces false positives: two real sentences in `reference/command-line.md` ("Use `status` if you want the same map…", "Use `ocx package create` if you need to bundle a directory…") match a loose "if you (want|need)" grep, and both are correct reference-page cross-references, not conflation. Requiring a nearby directive verb (`run|use|pass|do` within ~40 characters) already drops this to zero without scoping; scoping to declared type is still the defense-in-depth recommendation because it is cheap and the loose pattern's failure mode is a real, measured one.
- Reference-page neutrality (no "problem" framing in a reference page's first paragraph) tested clean: **0/9** false positives across every real `reference/*.md` page in `ocx`. Safe to ship as written once at least one page carries `doc_type: reference`.
- Culture-bound analogies (`ocx`'s mandated Nix store / APT / SDKMAN / Homebrew Cellar comparisons, `docs-style.md:54-64`) are a real, named conflict against Google's ban on "current pop-culture references" and figurative language for readers "from many different cultures" ([Google](https://developers.google.com/style/tone)), and Kubernetes' explicit jargon/idiom ban with a Do/Don't table aimed at non-native English readers ([Kubernetes](https://kubernetes.io/docs/contribute/style/style-guide/)). Resolve by confining analogies to `explanation`-typed content or a skippable admonition callout, each carrying a cited, dated source link, and requiring the same section to also state the concept in plain language that does not depend on the analogy.
- Diataxis has **no controlled-study basis** — its own community critic (Tom Johnson) says so directly, and its flagship enterprise adopter (Canonical) frames its main proven effect as making existing docs "look worse, not better" by surfacing problems, not fixing them. Ship it as an enforced contract anyway: "surfaces problems" is exactly what a mechanical mixing check is for, and every doc-heavy open-source project checked (Kubernetes, GitLab, Django) has independently converged on it or a renamed variant.
- Reference documentation's structure must mirror the actual product/API structure, stated independently by Diataxis ("the structure of the documentation should mirror the structure of the product") and Microsoft (a fixed reference-section table) — never an author's preferred topical grouping.
- Explanation is the **only** declared type allowed opinion, comparison, or a judgment sentence ("w is better than z, because…"); tutorial, how-to, and reference content fail if they contain one.
- GitLab's troubleshooting contract is exact and copy-ready: title states the message type first (`Error:`/`Warning:`), truncated with `...` past 70 characters, never a link in the title; body is message → "This issue occurs when…" (cause) → "workaround" (temporary) or "resolve"/"resolution" (permanent); troubleshooting topics sit last on a page; five or more items get their own page.
- GitLab's own CTRT model does **not** forbid mixing types within one page — it explicitly expects a page to open with a Concept topic before a Task or Reference topic. This is a real tension with Diataxis's implicit one-type-per-page assumption. Resolve it by keeping the declared `doc_type` at file granularity (matches this fleet's file-based tooling) while permitting one short, bounded concept preamble — capped at roughly 100 words / one paragraph — ahead of a how-to or reference page's main content. That cap is asserted by this deliverable, not sourced; no corpus source gives a number for how short "short" must be.
- `diataxis.fr/complex-hierarchies/` returned HTTP 404 on two independent direct fetches today (2026-09-05), confirming the earlier scout's finding. Its nesting doctrine (one tutorial/how-to/reference/explanation split per product variant, rather than one shared set) is carried into this deliverable only as a cached, scout-sourced claim — flagged unverified-by-primary-fetch, not silently asserted as read.
- Auto-generated reference content needs one mandatory human review pass before merge to strip implementation/internal-only detail the generator included (Microsoft, explicit) — the fleet's own `ocx-sdk-python/docs/api.md` (a 4-line mkdocstrings stub whose anchors exist only post-build) shows the opposite failure mode, invisible to a naive link check.

## Findings

### 1. The type set: five, not three, not four alone, not 25

Diataxis positions documentation on two axes — action vs. cognition, acquisition vs. application — yielding four types: **tutorial** (action + acquisition, "Can you teach me to…?"), **how-to guide** (action + application, "How do I…?"), **reference** (cognition + application, "What is…?"), and **explanation** (cognition + acquisition, "Why…?"). [diataxis.fr/map](https://diataxis.fr/map/), [diataxis.fr/compass](https://diataxis.fr/compass/).

GitLab's CTRT model names the same first three and adds a fifth as a first-class type: **Troubleshooting**, with its own title-format and error→cause→fix contract (Finding 8). [docs.gitlab.com/development/documentation/topic_types](https://docs.gitlab.com/development/documentation/topic_types/).

The Good Docs Project catalogs 25 template types — not a sixth scheme to reconcile, but a parts catalog built around the same core. Fetched directly: its **Core Pack** ("If you download one template pack for your project, it should be this one") is exactly **Concept, How-to, README, Reference, Release notes, Troubleshooting, Tutorial** — Diataxis's four (Concept = explanation), GitLab's fifth (Troubleshooting), a landing artifact (README), and a reference sub-variant (Release notes). The remaining 18 templates (Community Pack: Bug report, Changelog, Code of Conduct + its three sub-documents, Contributing guide, Our team; Miscellaneous Pack: API getting started, API reference, Contact support, Glossary, Installation guide, Quickstart, SDK Overview, Style guide, Terminology system, User personas) are all either a variant of one of the five content types, an artifact this program's other topics already own (glossary, style guide), or process documentation (Code of Conduct) outside a docs-quality rule's scope. The project's own framing is "browse our template packs… find a template that matches your use case" — deliberately unopinionated about which templates a project needs, a catalog to pick from, not a tiering scheme to adopt wholesale. [thegooddocsproject.dev/template](https://thegooddocsproject.dev/template/).

**Decision: ship five types — tutorial, how-to, reference, explanation, troubleshooting.** This matches Diataxis's four plus GitLab's fifth, and is independently corroborated by the Good Docs Project's own recommended starting bundle. The frame's three-way split (landing / guide / reference) is overturned: it collapses how-to and reference together and omits explanation as its own category entirely — every canonical source that names types uses at least four.

Ground truth for shipping troubleshooting as a real fifth type, not a hypothetical: the fleet already has uncontracted troubleshooting prose (`ocx-catalog/docs/ops/troubleshooting.md`, per `docs-audit/docs-shape.md` §1) with no rule governing its shape.

### 2. A landing page is a navigation layer, not a type

None of the five types above is "landing." A landing/index page is the entry point that routes a reader into one of the five — its own contract (ordered elements, CTA budget, "who is this for") is a different topic (`landing-page-contract`) in this same group, but it still needs a declared value so tooling can exempt it from the five-type mixing check while still counting it for nav-depth and CTA-budget checks owned elsewhere. Declaration value: `landing` (Finding 4).

### 3. Diataxis's evidentiary status: contract or diagnostic

Fetched Tom Johnson's assessment directly. He does not treat Diataxis as validated by research: he was "concerned about the separation of content into distinct groups," asked Procida directly "what research was this information model based on?", and got a philosophical answer (the four types "naturally form" from user needs) rather than a citation to a controlled study. His own verdict: "This model may oversimplify things, but the 4 Diataxis types are still useful as an abstract approach for thinking about docs" — a pragmatic heuristic, not a proven methodology. [idratherbewriting.com](https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework).

Fetched Canonical's own adoption post directly. Its framing of the first effect of adopting Diataxis: "Naturally this means that the first thing Diátaxis does is make existing documentation look worse, not better: problems are harder to hide and ignore, things in the wrong place stand out inescapably… But this is how it should be, because no problem can be addressed without being able to see it clearly first." [ubuntu.com/blog](https://ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation).

**Decision: ship it as an enforced contract, with the evidentiary gap disclosed, not hidden.** The framework's own strongest enterprise adopter says its value is exposing problems mechanically — which is precisely what a lint-time mixing check needs a type system to do. Treat "no controlled-study basis" as a disclosed limitation of the underlying model, not a reason to keep the type set as an unenforced opinion; the fleet's existing ~92 unenforced prose rules are the failure mode this program exists to fix (see R4, R13).

### 4. The declaration mechanism: a comment, not frontmatter

Tested the two portability paths directly against real fleet files rather than assuming either works everywhere.

**YAML frontmatter fails on mdBook.** `grimoire/docs/book.toml` (the sole mdBook site in the fleet) configures no `[preprocessor]` for frontmatter stripping — plain mdBook has no built-in YAML-frontmatter parser. Confirmed no page in `grimoire/docs/src/` currently opens with a `---` block (`ci.md`, `installation.md` open directly with `# Heading`). Adding `---\ndoc_type: reference\n---` to the top of a `grimoire` page would render as literal visible text (and the bare `---` itself commonly renders as an `<hr>`), breaking every page of the one repo that would receive it.

**An HTML comment is safe everywhere measured.** `<!-- doc_type: VALUE -->` on line 1 passes through MkDocs' python-markdown, VitePress' markdown-it, and mdBook's pulldown-cmark unmodified as raw HTML — browsers do not render comment nodes, so it is invisible in the rendered page on all three generators without adding any plugin or preprocessor. It is also uniform: MkDocs Material and VitePress *could* technically hide an unused YAML-frontmatter key (neither currently uses one for this in the fleet — confirmed no `reference/*.md` in `ocx-catalog` carries frontmatter), but shipping two syntaxes (comment for mdBook, frontmatter for the other two) for the same fact is needless split complexity when one syntax works on all three.

**Decision.**

| Field | Value |
|---|---|
| Syntax | HTML comment, first line of the file (or immediately after any pre-existing frontmatter block the generator already requires, e.g. VitePress' `---\noutline: deep\n---`) |
| Key | `doc_type` |
| Allowed values | `tutorial`, `how-to`, `reference`, `explanation`, `troubleshooting`, `landing` |
| Missing or malformed | Hard fail (Finding "untyped page," R13) |

```
<!-- doc_type: how-to -->
---
outline: deep
---
# Install a tool
```

Correct (matches the fleet's real `ocx/website/src/docs/user-guide.md` — a task-oriented, self-contained "everyday tasks" page):

```
<!-- doc_type: how-to -->
```

Incorrect — YAML frontmatter key, silently breaks on the fleet's one mdBook site:

```
---
doc_type: how-to
---
```

### 5. Directory position, measured

`docs-audit/docs-shape.md` §2's path-heuristic classifier files 79/248 pages (31.9%) fleet-wide as `other`, and that number is not evenly spread. Per-repo, from the same audit: `ocx-mirror-sdk` (MkDocs Material, Diataxis-shaped `how-to/`, `reference/` directories) classifies **0/35 other**; `ocx-catalog` (same generator, same directory shape) classifies **3/23 other**; `grimoire` (mdBook, a **flat** `docs/src/*.md` tree with no `how-to/`/`reference/`/`explanation/` subdirectories) classifies **18/23 other (78%)** — filenames like `commands.md`, `publishing.md`, `hosting-an-index.md`, `upgrading.md` carry no directory or filename signal a path classifier can use, even though a reader would immediately call `commands.md` a reference page.

This is the direct, measured argument against "directory position is sufficient evidence of type": the same kind of content (a reference-shaped command list) is machine-classifiable in one repo and invisible in another, purely because of directory layout, not content. A declared comment (Finding 4) is invariant to that difference; a lint that trusts directory position would need a per-project directory-name mapping table to work at all, and would still silently fail the moment a project reorganizes.

### 6. The mixing check, tested against real pages

The research brief names two candidate mixing-check signatures verbatim and asks that both be run against `ocx/website/src/docs/user-guide.md` with a reported false-positive rate. Ran both, then widened the test to the rest of `ocx`'s measured 44-page docs surface to get a real base rate rather than a single-file anecdote.

**Signature A** (`canonical-guides.md`): a first-person-plural learning-oriented opener ("we'll build…", "we're going to…", "let's build/create/set up/walk…") co-occurring, in the same file, with a later conditional-imperative sentence ("if you want X, do Y") — the signature for tutorial/how-to conflation.

**Signature B** (`codified-practice.md`): a page tagged `reference` whose first paragraph carries a "problem"-framing sentence (problem, pain point, frustrat-, annoying, wasteful, struggle, challenge, tedious) — the signature for narrative idea→problem→solution structure leaking into reference prose.

Commands run (`sh`/`grep -P`, no new tooling):

```sh
# Signature A, opener half
grep -ciP "\b(we'll|we're going to|let's (build|create|set up|walk))\b" user-guide.md
# Signature A, conditional-imperative half
grep -ciP "if you (want|need|plan|are|prefer)\b" user-guide.md
# Signature B
sed -n '1,10p' user-guide.md | grep -niE "problem|pain point|frustrat|annoying|wasteful|struggle|challenge|tedious"
```

**Results on `user-guide.md`** (14,130 words, 92 headings): opener half 0 hits, conditional-imperative half 1 hit (line 99, "If you plan to manage your own PATH…, pass `--no-modify-path`" — a legitimate how-to conditional, not conflation, and moot since the opener half never fired), Signature B 0 hits. **Zero false positives, and zero true-positive tests possible — the file simply never uses the trigger phrasing.**

**Widened to the rest of the measured surface**, to check whether that null result was a fluke of one file or a property of the fleet's prose:

| File | opener hits | conditional-imperative hits |
|---|---:|---:|
| `user-guide.md` | 0 | 1 |
| `getting-started.md` | 0 | 0 |
| `installation.md` | 0 | 0 |
| `faq.md` | 0 | 0 |
| `authoring/index.md` | 0 | 0 |
| `in-depth/storage.md` | 0 | 1 |
| `reference/command-line.md` | 0 | 2 |
| (7 remaining `reference/*.md`) | 0 | 0 |

Fleet-wide grep for the opener pattern across the whole `ocx/website/src/docs` tree: **0 hits in all 44 pages.** The house style (`docs-style.md` bans a "sales pitch or marketing open") already avoids this phrasing entirely, so **Signature A, as literally worded, has zero recall on this fleet** — it cannot currently be validated as a working detector here, only as a clean baseline. That is a real, useful result, not a failure: it means the check is safe to turn on at `error` severity for every future how-to/tutorial page an agent writes, since it is exactly the phrasing an LLM defaults to when asked for "a guide" (see [AI-agent angle](#ai-agent-angle)), and it will not retroactively flag any of today's 44 pages.

**Signature B tested clean**: 0/9 false positives across every real `reference/*.md` page in `ocx`. Safe to ship once at least one page carries `doc_type: reference`.

**The conditional-imperative half alone, unscoped, is where the false positives actually are.** `reference/command-line.md`'s two hits are both legitimate reference cross-references inside admonitions:

```
Use `status` if you want the same map keyed by platform.
Use `ocx package create` if you need to bundle a directory — that command produces a stable archive once…
```

Neither is tutorial/how-to conflation; both are correct, terse reference-page pointer sentences. Tightening the regex to require a directive verb within ~40 characters (`if you (want|need|prefer)\b.{0,40}?\b(run|use|pass|do)\b`) already drops this to 0/9 without any type-scoping — but type-scoping (running the check only on `doc_type: how-to` or `doc_type: tutorial` pages) is still the recommended defense-in-depth, because it is nearly free and the loose pattern's failure mode is real and measured, not hypothetical.

**Decision: ship the co-occurrence check (Signature A), scoped to `how-to`/`tutorial`-declared pages, at `error` severity for new and changed pages.** It is the corpus's single most emphatic named failure mode ([diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/): "conflation… risks getting in the way of those newcomers whom we hope to turn into committed users"), it tested at zero false positives on every real page checked, and its zero-recall result on today's prose is a clean baseline to gate future contributions against, not evidence to discard it.

### 7. Culture-bound analogies vs a global audience

`ocx/.claude/rules/docs-style.md:54-64` mandates specific cross-tool analogies in every design-concept introduction — "Object store → Nix store, Git objects"; "Index snapshot → APT package lists"; "Candidate/current symlinks → SDKMAN, Homebrew Cellar + opt, Linux `update-alternatives`"; "Rolling tags → Docker official images, Semantic Versioning" — placed in a `:::info` callout, kept out of main prose.

Fetched Google's tone page directly: "Consider that readers come from many different cultures and may have varying levels of ability reading English"; explicit bans on "Current pop-culture references," "Internet slang," and figurative language including metaphors. [developers.google.com/style/tone](https://developers.google.com/style/tone).

Fetched Kubernetes' style guide directly: "Avoid jargon and idioms. Jargon is unnecessary specialized terminology. Idioms are words, phrases, or ways of writing that are natural to a native speaker of English, but may be confusing to someone for whom English is a second language." A Do/Don't table follows (e.g., "Some versions of Linux do not include a package…" over "Some Linux distros do not ship with…"). [kubernetes.io/style-guide](https://kubernetes.io/docs/contribute/style/style-guide/).

Diataxis independently confines comparison to one type only: explanation "can and must consider alternatives, counter-examples or multiple different approaches," with examples like "w is better than z, because…" — no equivalent license is given to tutorial, how-to, or reference. [diataxis.fr/explanation](https://diataxis.fr/explanation/).

**Resolution.** Analogies may appear only inside `explanation`-typed content, or inside a skippable admonition callout (`:::info`, matching `docs-style.md`'s own existing placement) within any type — never as the *only* explanation of a concept in required prose. Every analogy must carry an inline citation link to a freshly fetched, dated source for the compared tool (already partially required by `docs-style.md`'s "always search internet" rule; add the citation-link requirement explicitly). The same section must also state the concept in plain language that does not depend on the reader recognizing the compared tool — the analogy supplements, it never substitutes. This satisfies Diataxis's confinement-to-explanation and Google/Kubernetes' global-audience requirement simultaneously, without deleting the analogies `docs-style.md` already invested in researching.

Bad (analogy stands alone as the explanation, in required prose, no citation):

> The object store works like the Nix store — content-addressed, immutable.

Good (analogy is a supplementary, cited, skippable aside; the plain sentence stands on its own):

> Every installed package is stored by the hash of its contents, so two builds with identical output share one copy on disk regardless of the name or version used to install them.
>
> ::: info Familiar from other ecosystems
> This is the same content-addressing idea as the [Nix store](https://nixos.org/manual/nix/stable/store/store-object.html) (2024 manual, fetched 2026-09-05) or a Git object database — if you know either, the mental model transfers directly.
> :::

### 8. GitLab's troubleshooting contract, and the Good Docs corroboration

Fetched directly. Title: "State the type of message at the start of the title" (`Error:`, `Warning:`), include at least partial error output where possible, truncate past 70 characters with `...`, never a link in a title. Body follows a fixed template:

```
### The message or a description of it

You might get an error that states <error message>.

This issue occurs when...

The workaround is...
```

Wording is prescribed: "workaround" for a temporary fix, "resolution"/"resolve" for a permanent one. Exact error text goes in backticks. Structural placement: "Troubleshooting topics should be the final topics on a page," and once a page accumulates five or more troubleshooting items, they move to their own page. [docs.gitlab.com/…/topic_types/troubleshooting](https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/).

GitLab's own top-level topic-types page, fetched directly, states pages routinely combine types rather than staying single-purpose: "Even if a page is short, the page usually starts with a concept and then includes a task or reference topic" — CTRT does not forbid in-page mixing; it expects a bounded, ordered one (Finding 4 of the [Contested / evolving](#contested--evolving) section resolves how this interacts with the five-type set). [docs.gitlab.com/…/topic_types](https://docs.gitlab.com/development/documentation/topic_types/).

### 9. Reference mirrors the product; autogeneration needs a review pass

Diataxis, fetched directly: "the structure of the documentation should mirror the structure of the product, so that the user can work their way through them at the same time"; tone is "austere and uncompromising," aiming for "neutrality, objectivity, factuality," with instruction, explanation and opinion explicitly named as things to link out to rather than include: "You will certainly not expect to find for example recipes or marketing claims mixed up with this information; that could be literally dangerous." [diataxis.fr/reference](https://diataxis.fr/reference/).

Microsoft's developer-content reference-documentation page independently states the same structural rule via a fixed section table (title+description, declaration/syntax, parameters, return value, remarks, example, requirements, see-also) and names the autogeneration risk directly: reviewers must "review the quality and appropriateness of the comments… Remove any implementation or internal details that aren't suitable for documentation" (already noted in `canonical-guides.md`, corroborated by the primary Diataxis fetch above rather than re-fetched in this session, since this exact page is `reference-page-contract`'s primary source, not this topic's).

Fleet evidence for the opposite failure mode (under-generation, not over-exposure): `ocx-sdk-python/docs/api.md` is a 4-line mkdocstrings stub whose real anchors exist only after a Sphinx/mkdocstrings build runs, which is why a naive link check manufactures 65 false positives from that one repo alone (`tested-examples-mechanism.md` §3). A review-pass requirement has to check for *both* directions of drift — leaked internals, and missing content a build step is silently expected to supply.

### 10. Complex hierarchies: still unreachable

`diataxis.fr/complex-hierarchies/` returned `HTTP 404 Not Found` on a direct fetch today (2026-09-05), and again on a second attempt via a different path. This matches the prior scout's finding exactly (two prior 404s, content read from a search cache). The page's content — Diataxis explicitly allows nesting a nation/cloud/product-variant split inside the four-type arrangement, "as long as the arrangement does not muddle up its different forms and purposes" — is therefore carried into this deliverable as a **scout-sourced, cache-read claim**, not as something this session verified by loading the page itself. Anyone shipping a rule that cites this specific page's content should re-attempt the fetch before asserting it as directly read.

## Normative guidance candidates

1. **Every page under the docs glob declares exactly one `doc_type` via `<!-- doc_type: VALUE -->` on its first content line**, `VALUE` ∈ `{tutorial, how-to, reference, explanation, troubleshooting, landing}`.
   Rationale: prevents the silent misclassification the fleet already exhibits (31.9% "other" fleet-wide, concentrated at 78% in one flat mdBook tree) and gives every other prose/nav/example rule a scoping key.
   Verify: `grep -L -m1 -E '<!-- doc_type: (tutorial|how-to|reference|explanation|troubleshooting|landing) -->' <glob-matched files>` — any filename in the output fails.
   Evidence: measured (docs-shape.md) + normative.

2. **The `doc_type` comment is read from file content only, never inferred from directory path.**
   Rationale: identical content is machine-classifiable at 0-3% "other" in a Diataxis-shaped MkDocs tree and 78% "other" in a flat mdBook tree — a path-based classifier is invisible to exactly the repo whose layout doesn't already match, and breaks silently the moment any project reorganizes.
   Verify: the Rule 1 script never reads a file's path or directory name, only its content; a code-review heuristic flags any PR that adds path-based branching to the check script.
   Evidence: measured.

3. **Ship exactly five content types — tutorial, how-to, reference, explanation, troubleshooting — never a three-way landing/guide/reference split, never The Good Docs Project's 25 templates as a rival scheme.**
   Rationale: every canonical source names at least four; a three-way split provably erases the how-to/reference/explanation distinctions the corpus is most emphatic about; the 25-template catalog's own recommended Core Pack collapses to this same five plus a landing artifact, corroborating rather than contesting it.
   Verify: a reviewer confirms the shipped type-set section lists exactly these five values plus `landing` as an exempt navigation-layer declaration, never a sixth content type.
   Evidence: normative, corroborated (Good Docs Core Pack, Kubernetes, Django, GitLab all converge on ≥4; GitLab explicitly 5).

4. **Treat Diataxis's per-type contracts as enforced obligation text — quote the checkable sentences directly into the per-type contract file — despite its disclosed lack of controlled-study basis.**
   Rationale: Diataxis has no controlled-study basis (Tom Johnson) and its own flagship adopter frames its proven effect as surfacing existing problems, not validating a model (Canonical) — adopting it as a contract anyway is a deliberate bet that a checkable heuristic beats an unenforced style opinion, which is this whole program's premise.
   Verify: a reviewer confirms every obligation in the per-type contract file is phrased as a testable "must/must not," never a bare adjective ("clear," "friendly").
   Evidence: argued (the evidentiary gap is disclosed; the adoption decision is a judgment call, not a measurement).

5. **A page declared `how-to` or `tutorial` fails if its first paragraph matches a learning-oriented opener pattern and a later paragraph matches a conditional-imperative pattern, in the same file.**
   Rationale: the corpus's single most-repeated named failure mode ("conflation… risks getting in the way of those newcomers whom we hope to turn into committed users," diataxis.fr/tutorials-how-to) and exactly the shape an LLM defaults to when asked for "a guide."
   Verify: `checks/doc-type-conflation.sh <file>` — regexes given in [Findings §6](#6-the-mixing-check-tested-against-real-pages); tested at 0/9 false positives against every real `reference/*.md` page and 0/44 across ocx's whole measured docs surface (a clean baseline today; the check's job is future pages).
   Evidence: measured.

6. **Scope Rule 5's check to `doc_type: how-to`/`tutorial` pages only; never run the conditional-imperative half file-wide.**
   Rationale: measured directly — the conditional-imperative half alone, unscoped, matches two legitimate cross-reference sentences in the fleet's real `reference/command-line.md` ("Use `status` if you want…", "Use `ocx package create` if you need…"), which are correct reference prose, not conflation.
   Verify: the same script run with a `--unscoped` debug flag reproduces exactly those two known false positives on `reference/command-line.md` lines 62 and 1488 — used only to prove the scope guard does real work, never run unscoped in CI.
   Evidence: measured.

7. **A page declared `reference` fails if its first paragraph contains a problem/pain-framing sentence** (wordlist: problem, pain point, frustrat-, annoying, wasteful, struggle, challenge, tedious).
   Rationale: catches the idea→problem→solution narrative rhythm (the fleet's own `docs-style.md` mandates it for narrative pages) leaking into reference prose, which Diataxis and Microsoft both require to stay purely descriptive.
   Verify: tested directly against every one of `ocx`'s 9 real `reference/*.md` pages — 0 false positives; ship at `error` severity once ≥1 page is declared `reference`.
   Evidence: measured.

8. **Reference documentation's top-level section order mirrors the actual code/API's own declared order, never an author's preferred topical grouping.**
   Rationale: independently stated by Diataxis ("mirror the structure of the product") and Microsoft's fixed reference-section table; violated silently as code drifts out from under a hand-grouped page.
   Verify: no fleet-generic mechanical check found in this survey; the closest real enforcement is the fleet's own build-time table-parity test (`grimoire`'s `client_target.rs`, ALREADY COVERED) — generalize that shape rather than inventing a new one; until generalized, a named reviewer heuristic (diff the page's heading order against the CLI/API's own symbol order) is the fallback.
   Evidence: normative + codified precedent.

9. **A PR that touches a generator-fed reference file requires a human-authored review note in the same PR** (a changelog line or PR-description sentence naming what was checked).
   Rationale: Microsoft names leaked internal detail as the generator-side risk; the fleet's own `ocx-sdk-python/docs/api.md` shows the opposite risk (a 4-line stub whose anchors exist only post-build, producing 65 false link-check positives) — a review pass has to check both directions.
   Verify: no runnable script found or written in this session; flagged as the one candidate here with no mechanical check — a process gate (a required PR-template field), not a lint, until someone builds one.
   Evidence: argued (Microsoft) + measured (ocx-sdk-python's gap, tested-examples-mechanism.md).

10. **Only `explanation`-typed content may contain an opinion, comparison, or judgment sentence** (pattern: `\b(is|are) (better|worse|preferable) (than|to)\b`, `\bwe recommend\b` outside explanation); tutorial, how-to, and reference content fail if they contain one.
    Rationale: Diataxis's most literal, quotable obligation — explanation is "the only kind of documentation that it might make sense to read in the bath" precisely because it alone may render judgment; the other three types are defined by explicitly *not* doing this.
    Verify: not tested against fleet content in this session (this topic's test budget went to Rule 5); flagged as the next concrete test for the `reference-page-contract`/`explanation` contract owners before shipping at `error` severity.
    Evidence: normative (untested extension of a directly-fetched, quoted source).

11. **Culture-bound analogies may appear only inside `explanation`-typed content or a skippable admonition callout, never as a required prose's only explanation, and every analogy must carry an inline citation link to a freshly fetched, dated source.**
    Rationale: resolves a real, named fleet conflict (`docs-style.md:54-64` mandates exactly these analogies inline; Google and Kubernetes both forbid relying on culture-specific comparisons for a global, possibly non-native-English audience; Diataxis independently confines comparison to explanation).
    Verify: grep every named external-tool comparison for (a) an adjacent markdown link (partially covered elsewhere already), (b) containment inside an `explanation`-typed file or an admonition block, and (c) a plain-language sentence in the same section that does not name the compared tool.
    Evidence: measured (the ocx rule text, fetched conflict sources) + argued (the resolution balances two real, sourced constraints; it is a judgment call, not a discovered fact).

12. **Troubleshooting-typed pages open their title with `Error:`/`Warning:` (truncated with `...` past 70 characters, never a link) and their body with the literal phrase "This issue occurs when"; five or more items move to a dedicated page.**
    Rationale: GitLab's is the only contract in this corpus with an exact, quotable shape for this content, and the fleet already has real, uncontracted troubleshooting prose to retrofit it onto (`ocx-catalog/docs/ops/troubleshooting.md`).
    Verify: `grep -c '^### \(Error\|Warning\):' <file>` for title shape, `grep -c 'This issue occurs when'` for body shape — not yet run against `ocx-catalog`'s real file in this session (out of this topic's scope/budget); flagged as the next concrete test for whoever owns the troubleshooting contract.
    Evidence: codified (GitLab's own shipped, production style guide) + untested-locally.

13. **An untyped page (missing or malformed `doc_type` comment) is a hard failure once the check ships, never a permanent warning.**
    Rationale: the fleet already carries ~92 prose rules with only 2 citing a runnable check — a "warning"-severity rule is empirically a rule nobody fixes on this evidence; the `docs-plan` skill's inventory-and-classify step is responsible for backfilling every existing page's declaration before the check flips to enforced, so day-one adoption is never blocked by day-one enforcement.
    Verify: CI config shows the Rule 1 check at `error` severity, not `warning`/`suggestion`; the backfill step's own completion is verified by Rule 1's script returning zero misses immediately before the check is turned on.
    Evidence: argued (a rollout decision informed by the fleet's own measured rule-rot pattern, `config-inventory.md`).

## AI-agent angle

- **Skips the declaration entirely, or invents a near-miss key.** An agent not explicitly shown the exact syntax is at least as likely to reach for the far more common convention in its training data — YAML frontmatter (`---\ntype: how-to\n---` or `docType:`/`page_type:`) — as for this program's `<!-- doc_type: … -->` comment. Check: Rule 1's grep is exact-string, so any variant fails closed as "untyped" — correct behavior, but a reviewer seeing a page flagged "untyped" should specifically check for a near-miss frontmatter key before assuming the page was never classified at all, since that specific near-miss silently breaks rendering on the fleet's one mdBook site.
- **Collapses tutorial and how-to into one "guide" page.** Asked for "a guide to X," a model defaults to a hybrid: a learning-oriented opening ("We'll build a…", "By the end of this guide you'll…") that drops mid-write into task-mode conditionals ("if you want Y, do Z"). Check: Rule 5/6's scoped co-occurrence grep — tested clean on today's fleet precisely because a human editor already avoided this phrasing; it exists to catch the agent-authored version going forward.
- **Over-explains inside task- or fact-oriented content.** A model's default voice tends to contextualize and justify even when asked for terse steps or neutral facts, leaking explanation-type opinion/comparison language ("this approach is better because…") into how-to or reference prose. Check: Rule 10's judgment-comparison grep, scoped to non-`explanation` pages.
- **Defaults to a generic numbered-steps shape for troubleshooting content**, because "numbered steps" is the model's generic template for any problem-solving prose, rather than GitLab's specific error→cause→fix shape. Check: Rule 12's title/cause-string grep — a troubleshooting page with no "This issue occurs when" anywhere in its body is the smell.
- **Writes a landing page that also tries to be a getting-started tutorial** ("marketing hero + numbered quickstart steps" is an extremely common training-data pattern for a product homepage), blurring the navigation-layer/content-type boundary this finding establishes. Check: a `doc_type: landing` page containing an ordered list of three or more numbered steps is the symptom — the actual contract for what a landing page should contain instead belongs to `landing-page-contract`, but the mixing starts here, at declaration.
- **Fabricates the nesting/complex-hierarchy allowance from memory rather than checking it resolves.** This session confirmed `diataxis.fr/complex-hierarchies/` 404s directly; an agent citing it without attempting the fetch (or without checking a fetch attempt actually returned content) would silently assert a page it never read. Check: any rule citation to that specific URL must be flagged unverified unless the citing session's own fetch returned a 200.

## Contested / evolving

- **Four types (Diataxis) vs three (frame) vs five (GitLab) vs 25 (Good Docs Project) — resolved.** Ship five (Diataxis's four plus GitLab's troubleshooting); the frame's three is overturned by its own correction; the 25-template catalog is a parts catalog, not a rival scheme — its own Core Pack collapses to the same five plus a landing artifact. As of September 2026, practice is not still contested here: Kubernetes, GitLab, and Django have each independently converged on the Diataxis split or a renamed variant, and this deliverable found no counter-current source proposing a different scheme.
- **Diataxis as a proven contract vs a diagnostic with no controlled-study basis — resolved as a deliberate bet, not a factual resolution.** Ship it as an enforced contract; the disclosed gap (no controlled study, its own community critic and its flagship adopter both frame it as a heuristic that surfaces rather than proves) is real and stays disclosed in the rule's own citation, not smoothed over. What stays genuinely open: whether a future controlled study vindicates or undercuts the four-way split itself. That is not this program's question to answer and is flagged as such rather than guessed at.
- **Culture-bound analogies mandated (ocx) vs banned for a global audience (Google, Kubernetes) — resolved.** Confine analogies to `explanation`-typed content or a skippable, cited callout, paired with a plain-language sentence that doesn't depend on the analogy. Not resolved by this finding: whether *any* analogy survives a genuine future translation effort for a non-English-first docs site — that is `i18n-readability`'s question (out of this topic's scope, flagged rather than silently assumed away).
- **GitLab's CTRT tolerates in-page type mixing vs Diataxis/Kubernetes's implicit one-type-per-page — partially resolved.** Keep `doc_type` at file granularity (matches this fleet's existing file-based tooling, e.g. the `# doc:` script-binding convention), and explicitly permit one short concept preamble — capped at roughly 100 words / one paragraph — ahead of a how-to or reference page's main content. That specific number is **asserted by this deliverable**, not sourced from any fetched guide; no corpus source gives a number for how short such a preamble must stay. State this plainly rather than leaving it as an unstated "keep it brief."
- **`diataxis.fr/complex-hierarchies/` reachability — resolved procedurally, not by reading the page.** Confirmed 404 on two independent direct-fetch attempts today (2026-09-05), matching the prior scout's finding exactly. Its content is carried forward only as a scout-sourced, cache-read claim, explicitly flagged as unverified-by-primary-fetch in this deliverable — not asserted as directly read, and not silently dropped either.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [diataxis.fr/map/](https://diataxis.fr/map/) | Primary — framework's own canonical page | Live, checked 2026-09-05 | Defines the four types and the compass in the author's own words |
| [diataxis.fr/compass/](https://diataxis.fr/compass/) | Primary — framework's own page | Live, checked 2026-09-05 | The two-axis diagnostic mechanism, used at any granularity from sentence to section |
| [diataxis.fr/tutorials-how-to/](https://diataxis.fr/tutorials-how-to/) | Primary — framework's own page | Live, checked 2026-09-05 | The single most-repeated named failure mode in the whole corpus (tutorial/how-to conflation), source of the mixing check |
| [diataxis.fr/reference/](https://diataxis.fr/reference/) | Primary — framework's own page | Live, checked 2026-09-05 | The neutrality contract and mirror-the-product rule, quoted verbatim |
| [diataxis.fr/explanation/](https://diataxis.fr/explanation/) | Primary — framework's own page | Live, checked 2026-09-05 | The one type allowed opinion/comparison/judgment — the boundary the analogy resolution depends on |
| [diataxis.fr/complex-hierarchies/](https://diataxis.fr/complex-hierarchies/) | Primary — framework's own page | Confirmed 404 on 2026-09-05 (two direct attempts) | The nesting/large-hierarchy doctrine; unreachable this session, flagged unverified |
| [docs.gitlab.com/development/documentation/topic_types/](https://docs.gitlab.com/development/documentation/topic_types/) | Primary — production style guide of a real, large open-source project | Live, checked 2026-09-05 | CTRT's fifth type, and the direct statement that in-page type mixing is expected, not forbidden |
| [docs.gitlab.com/development/documentation/topic_types/troubleshooting/](https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/) | Primary — same guide, troubleshooting child page | Live, checked 2026-09-05 | The exact, copy-ready error→cause→fix contract this deliverable ships as Rule 12 |
| [kubernetes.io/docs/contribute/style/page-content-types/](https://kubernetes.io/docs/contribute/style/page-content-types/) | Primary — production style guide of a real, large open-source project | Live, checked 2026-09-05 | Working per-type section skeletons, explicit Diataxis credit, the `whatsnext` 5-item cap |
| [kubernetes.io/docs/contribute/style/style-guide/](https://kubernetes.io/docs/contribute/style/style-guide/) | Primary — same project's style guide | Live, checked 2026-09-05 | The explicit jargon/idiom ban with a Do/Don't table, the other half of the analogy conflict |
| [thegooddocsproject.dev/template/](https://thegooddocsproject.dev/template/) | Primary — a maintained open-source template catalog | Live, checked 2026-09-05 | The 25-template list and its own Core Pack framing, which corroborates the five-type decision |
| [idratherbewriting.com/blog/what-is-diataxis-documentation-framework](https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework) | Primary — a named practitioner's own critique | Live, checked 2026-09-05 | The direct source for "Diataxis has no controlled-study basis," quoted from the critic himself |
| [ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation](https://ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation) | Primary — a real enterprise adopter's own account | Live, checked 2026-09-05 | The "surfaces problems rather than fixing them" framing that this deliverable's adoption decision leans on directly |
| [developers.google.com/style/tone](https://developers.google.com/style/tone) | Primary — a maintained, large-scale style guide | Live, checked 2026-09-05 | The global-audience/pop-culture-reference ban, the other half of the analogy conflict |
| `ocx/.claude/rules/docs-style.md` (local repo, `/home/mherwig/dev/ocx/.claude/rules/docs-style.md`) | Primary — a real, currently-enforced rule file in the adopting fleet | Read 2026-09-05 | The mandated-analogy rule (lines 54-64) that creates the conflict this deliverable resolves |
| `ocx/website/src/docs/{user-guide.md, getting-started.md, installation.md, faq.md, authoring/index.md, in-depth/storage.md, reference/*.md}` (local repo) | Primary — the real test corpus | Read 2026-09-05 | The empirical basis for every false-positive-rate claim in Finding 6 |
| `grimoire/docs/book.toml` (local repo, `/home/mherwig/dev/grimoire/docs/book.toml`) | Primary — a real generator config | Read 2026-09-05 | Proves no frontmatter preprocessor is configured, the direct evidence behind the HTML-comment declaration decision |
| `docs-audit/docs-shape.md` (program-internal, `/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/docs-shape.md`) | Secondary — prior grounding-wave measurement of this same fleet | Written 2026-09-05 | The per-repo path-classification numbers (31.9% "other," 0-78% per repo) underlying Findings 1 and 5 |
