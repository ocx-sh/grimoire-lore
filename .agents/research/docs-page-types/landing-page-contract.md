---
title: Documentation design — the landing page contract
topic: landing-page-contract
group: docs-page-types
agent: docs-page-types-landing-contract-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
scope: |
  Covers what a docs-site landing/index page must contain, in what order, and
  what a mechanical check can and cannot verify: the opening move, hero
  bounds, CTA budget vs. task-link-grid budget, the "who is this for"
  requirement, and placeholder/duplication defects. Does not cover the
  content-type set itself (tutorial/how-to/reference/explanation — owned by
  `page-type-set-and-declaration`), reference-page structure, or navigation
  depth below the first screen.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Five sites, five opening moves — the trichotomy is a false consensus](#1-five-sites-five-opening-moves--the-trichotomy-is-a-false-consensus)
  2. [The fourth move: title then caveat](#2-the-fourth-move-title-then-caveat)
  3. [The fleet's landing pages, measured](#3-the-fleets-landing-pages-measured)
  4. [GOV.UK's link-sparingly rule is real, has a rationale, and has no number](#4-govuks-link-sparingly-rule-is-real-has-a-rationale-and-has-no-number)
  5. ["Who is this for" is satisfied structurally, not by a sentence](#5-who-is-this-for-is-satisfied-structurally-not-by-a-sentence)
  6. [CTA and task-link are two different budgets, and conflating them is the actual defect](#6-cta-and-task-link-are-two-different-budgets-and-conflating-them-is-the-actual-defect)
  7. [What a repo checkout can and cannot check](#7-what-a-repo-checkout-can-and-cannot-check)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A landing page's opening move is not one shape. Five sites fetched directly show four distinct moves in current production use: value-claim hero, plain definition, command-first with no hero, and title-then-caveat.
- The requester's three-way "definition vs. value claim vs. command" trichotomy does not hold. Name the fourth move — title then stability caveat — as legitimate for pre-1.0 software, not a defect to reject.
- A caveat opening is not the defect. Having **zero** CTA anywhere on the page is the defect, and it happens on two real fleet pages that open with a caveat.
- Stripe and uv, the two sites most often cited as 2026 best-practice docs, both cut marketing-hero prose to at most one sentence before the first command or task-link group. Laravel is the fetched outlier and keeps a multi-paragraph marketing essay as its docs entry point.
- Bound the hero, do not ban it: cap any lead-in positioning prose at one sentence (≈30 words), whether it is a value claim, a definition, or a caveat — never stack two of them.
- GOV.UK's own 2013 guidance says to use top-task links "very sparingly... only where there is evidence that they're relevant," because on mobile (a third of GOV.UK's traffic) the top-task block is the only part of the homepage visible before scrolling. Verified directly against the primary post. It gives a rationale, not a number.
- Because GOV.UK gives no number, any numeric link cap this deliverable ships is fleet-informed and argued, not GOV.UK's own threshold — label it accordingly.
- CTA count and task-link-grid count are two different budgets. Collapsing them is what let the fleet's worst page reach 7 CTAs plus 10 feature tiles with no hierarchy.
- Cap primary + secondary CTA (button-style, one action each) at 2 total. Cap a task-link grid, if present, at 9 links grouped in sets of at most 4.
- "Who is this for" is required, but the fleet's only real instance satisfies it with zero prose — a task-phrased link grid ("I run an index on GitHub…") does the job structurally. Mandating a literal sentence would fail the fleet's own best example.
- A feature-tile grid labeled by product noun ("Payments," "Terminal") does not satisfy "who is this for." A grid labeled by reader intent does.
- Literal placeholder copy (Lorem Ipsum) shipped to a real published landing page in this fleet. This is the cheapest possible grep and the only landing-page check with zero false-positive risk.
- Most of this contract cannot be checked without a structural convention first: a CTA is indistinguishable from a body link in plain Markdown. The precondition is a named, parseable slot (frontmatter hero/CTA list, a designated grid component) — where that convention is absent, the rule is "adopt the convention," not a silent pass.
- Two of nine measured fleet landing pages currently ship with no CTA at all, hidden behind a stability caveat that never resolves to an action.
- One fleet page runs two overlapping tile grids restating the same claims (cross-platform, automation) back to back — a duplication defect distinct from having too many CTAs.
- "Who is this for" and duplicate-grid overlap are only partly machine-checkable; ship both as flagged reviewer heuristics, not hard gates, and say so plainly rather than pretend a grep covers them.

## Findings

### 1. Five sites, five opening moves — the trichotomy is a false consensus

Fetched directly, September 2026:

| Site | Opens with | First screen contents | CTA(s) |
|---|---|---|---|
| Stripe docs | One descriptive sentence, no tagline | CLI install line (`stripe docs` in-terminal), then 3 rows of task-phrased links grouped by use case ("Accept online payments," "Sell subscriptions," "Set up your development environment") | No button-style CTA at all — every "next step" is a task link ([docs.stripe.com](https://docs.stripe.com/)) |
| uv (Astral) | One-sentence value claim: "An extremely fast Python package and project manager, written in Rust" | Benchmark chart, then a multi-line install/init/add/run/lock example, then Guides/Concepts/Reference nav | Install command + "First steps"/"Installation"/"Project guide" links; social proof line ("backed by Astral, the creators of Ruff") ([docs.astral.sh/uv](https://docs.astral.sh/uv/)) |
| Laravel docs (12.x root, redirects to Installation) | Multi-paragraph marketing prose: "Laravel is incredibly scalable... hundreds of millions of requests per month," a "Why Laravel?" section with four sub-headed marketing paragraphs | Marketing prose interleaved with install steps, no separation between pitch and task | Install commands appear after the marketing section, not before it ([laravel.com/docs/12.x](https://laravel.com/docs/12.x)) |
| Cloudflare Workers | One-sentence value claim plus 4 value-prop bullets | 2 CTAs ("Deploy a template," "Deploy with Wrangler CLI"), then a 5-category build grid, then a 14-item integration grid | 2 button-style CTAs, clearly primary/secondary ([developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)) |
| GitLab docs home | No headline copy at all — straight to a 9-card task grid ("Use GitLab," "Learn GitLab with tutorials," "GitLab Duo"...), then a second 10-card "Get started with GitLab" row | "Get free trial" (nav) + "See them all" — 2 CTAs, but 19 grid links visible on one screen before any scroll ([docs.gitlab.com](https://docs.gitlab.com/)) |

Four distinct opening moves across five sites, not three, and no majority shape. Stripe and uv — the two names most often invoked as "docs done right" in 2026 practitioner writing — both cut hero prose to a single sentence and lead with an action, not a pitch. Laravel is the counter-example and is the fetched outlier: it is also the one site here whose docs root doubles as a first-run tutorial page, mixing the landing and tutorial content types (see `page-type-set-and-declaration` for the mixing check itself).

### 2. The fourth move: title then caveat

`docs-shape.md` measured two real fleet landing pages that open with neither a value claim, a definition, nor a command: `ocx-mcp` goes straight from a definition into "**not implemented yet**," and `ocx-sdk-python`/`ocx-mirror-sdk` go straight from an H1 title into `!!! warning "Pre-1.0 — API may change..."` with no CTA anywhere in the opening block ([docs-shape.md §7](/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/docs-shape.md)). The audit calls this out directly: "the requester's list of candidate CTA styles (definition vs. value claim vs. command) doesn't include what two real sites actually do — open with neither, going straight from an H1 title to a stability warning... its own pattern (pre-1.0 honesty over marketing), not a defect."

This deliverable names it as a fourth legitimate opening move — **title + caveat** — rather than rejecting it. The actual defect on those two pages is not the caveat. It is that neither page resolves to any CTA afterward: a reader who accepts the caveat and wants to proceed has nothing to click. The rule (see §6 below) requires an actionable element after the opening move regardless of which of the four moves is used; a caveat-only page with zero CTA fails that requirement, and it fails it today on two measured pages.

### 3. The fleet's landing pages, measured

`ux-observability-posture.md` §7 measured all 9 real fleet sites on one table. The headline numbers: 0 of 9 carry any social proof; exactly 1 of 9 (`ocx-catalog`) states who the site is for, and it does so via task-keyed cards with no prose sentence at all; `ocx` runs 7 CTAs with no single hierarchy plus two overlapping tile treatments (4 short frontmatter tiles and 6 detailed `<FeatureSection>` blocks that restate the same ground — cross-platform, automation — back to back); and `ocx-save`, a stale duplicate clone, shipped 3 of 4 landing tiles as literal, verbatim Lorem Ipsum text into a published site ([ux-observability-posture.md §7](/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/ux-observability-posture.md)).

Every numeric cap this deliverable proposes is falsified or validated against this table: a cap of 2 button-style CTAs directly rejects `ocx`'s 7; a duplicate-grid flag directly catches `ocx`'s two tile treatments; a Lorem Ipsum grep directly catches `ocx-save`'s defect; and the "who is this for" rule is written so that `ocx-catalog`'s zero-prose, task-card-only page still passes.

### 4. GOV.UK's link-sparingly rule is real, has a rationale, and has no number

Fetched directly from GOV.UK's own 2013 blog post, still the standing citation for current guidance: "use them very sparingly, and only where there is evidence that they're relevant to users," because "top tasks are the only part of your homepage visible at first to mobile users — a third of GOV.UK's audience," and "top task links should not duplicate other links on your homepage" ([insidegovuk.blog.gov.uk, 2013](https://insidegovuk.blog.gov.uk/2013/09/20/top-task-links-updated-guidance/)). The current GOV.UK content-design pages (`plan-new-govuk-content`, `organise-group-govuk-content`, `identify-user-needs`) no longer state this rationale on the specific page URLs checked directly during this research pass — it may have been consolidated or superseded on the live site since 2013 — but the underlying 2013 post is unambiguous and is the primary source the topic map's own scout cited ([design-systems.md](/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/design-systems.md)). GOV.UK's separate link-writing guidance adds a general version of the same principle with no number either: "do not swamp users with too many links," "do not link to the same place constantly throughout your page," "do not put all the links together at the bottom of the page" ([guidance.publishing.service.gov.uk, add-links](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/add-links/)).

Conclusion: the constraint is real and its rationale (mobile fold, a third of traffic, evidence of relevance, no duplication) survives as a **design note with a citable reason**. It does not survive as a GOV.UK-sourced checkable number — none is given anywhere in the sources checked. Any numeric cap this deliverable ships (§6) is therefore fleet-and-corpus-informed, not GOV.UK's own threshold, and is labelled `argued` rather than `measured` or `codified`.

### 5. "Who is this for" is satisfied structurally, not by a sentence

`ux-observability-posture.md` §7 is direct: only `ocx-catalog` states who it is for among 9 real sites, and it does so "implicitly via the use-case cards" — "I run an index on GitHub…" style task links — with no explicit "who this is for" prose anywhere on the page. This is "the fleet's only real instance of the frame's hypothesized use-case-tier landing pattern, and it exists on the docs-*tooling* site, not on any product-docs site."

Stripe's fetched landing page works the same way: no sentence anywhere says "for online sellers" or "for platforms" — the reader infers fit from the task-link labels themselves ("Accept online payments," "Sell subscriptions," "Set up your development environment"). uv comes closest to an explicit statement, but even that is indirect: "a single tool to replace `pip`, `pip-tools`, `pipx`, `poetry`, `pyenv`, `twine`, `virtualenv`" tells a Python developer they are the audience by naming the tools being replaced, not by a "this is for X" sentence.

Requiring a literal "who this is for" sentence would fail every fetched exemplar and the fleet's own best example. The requirement instead has two satisfaction paths, either is sufficient: (a) a task/need-phrased link grid (labels are verbs or first-person clauses: "Accept online payments," "I run an index on GitHub…"), or (b) one explicit sentence naming the reader segment. A feature-tile grid labeled by product noun only ("Payments," "Terminal," "Radar") — which is what `ocx`'s tiles do — satisfies neither path and should be flagged.

### 6. CTA and task-link are two different budgets, and conflating them is the actual defect

Collapsing "CTA" and "task link" into one count is what let `ocx` reach 7 CTAs plus 10 feature tiles with no hierarchy at all (`ux-observability-posture.md` §7). The fetched corpus keeps them separate and small in each category:

- **Button-style CTAs** (one action each, visually primary/secondary): Cloudflare Workers ships exactly 2 ("Deploy a template," "Deploy with Wrangler CLI"); GitLab ships 2 ("Get free trial," "See them all"). Neither site exceeds 2.
- **Task-link grids** (grouped, task-phrased, no single button treatment): Stripe ships 9 across 3 rows of 3; GitLab's homepage runs a 9-card grid plus a second 10-card row — 19 links total before any scroll, which is itself closer to `ocx`'s "too much homepage" pattern than to Stripe's tighter grouping, and is not held up here as the target to copy.

Given GOV.UK's qualitative "very sparingly" (§4) and Stripe's demonstrated 3×3 grouping, this deliverable sets the task-link budget at ≤9 total, grouped in sets of ≤4, as an `argued` default — not a GOV.UK or Stripe-stated hard limit, but the tightest defensible reading of the evidence that both matches the best fetched example and rejects the fleet's worst one.

### 7. What a repo checkout can and cannot check

Plain Markdown makes a button-style CTA structurally indistinguishable from an ordinary body link — `[Get Started](/docs)` looks identical whether it is the page's one primary action or an incidental cross-reference. Every count-based check below therefore has a **precondition**: the CTA and task-grid slots must live in a named, parseable structural location (a VitePress `hero.actions:` / `features:` frontmatter array, an MkDocs grid `:::` block, or an equivalent designated component) before any count can be machine-verified. Where a project's landing page has no such convention, the check cannot silently pass — it must fail with "no structural CTA/grid slot found, cannot verify budget," which is itself informative (it also means the page's `first-actionable-element` check in §Normative below has to fall back to a plain link/code-block scan of the whole file, which is *weaker*, not equivalent).

Fully checkable today, no precondition needed: placeholder text (a literal string match) and hero-length (a word count on whatever paragraph precedes the first heading or fenced block). Checkable only with the structural precondition: CTA count, task-grid count and grouping. Only partially checkable, shipped as a labelled reviewer heuristic rather than a hard gate: "who is this for" (path (a) requires judging whether link labels are actually task-phrased, not just present) and duplicate-grid overlap (a token-overlap heuristic will both miss real duplicates and flag legitimate re-mentions).

## Normative guidance candidates

1. **A landing page's opening move is one of four named shapes — value claim, definition, command-first, or title-then-caveat — and the rule does not mandate which one.**
   Rationale: forcing one shape fails half the fetched corpus and both real fleet pre-1.0 pages; the actual quality signal is downstream of the opening move, not the move itself.
   Verify: reading heuristic — a fresh reviewer classifies the page's first non-title content into one of the four buckets; failing to classify at all (a fifth, unnamed shape) is itself the finding to report.
   Evidence level: measured (5 primary sites + 2 fleet pages, fetched directly).

2. **Whatever the opening move, cap any lead-in positioning prose — value claim, definition, or caveat — at one sentence, ≈30 words, and never stack two of them in sequence.**
   Rationale: prevents the Laravel-pattern multi-paragraph marketing essay from becoming the docs entry point; 4 of 5 fetched sites that keep any prose lead-in hold it to one sentence.
   Verify: word-count the paragraph/frontmatter string preceding the first heading or first fenced block; fail if `words > 30` or if the block contains more than one sentence-terminating punctuation mark (reuse the plain-english check's sentence splitter rather than reinventing one — flag decimals/URLs as a known false-positive source).
   Evidence level: argued (numeric bound is this deliverable's synthesis; the *pattern* — Stripe/uv one-sentence lead-in vs. Laravel's essay — is measured).

3. **Every landing page must reach at least one actionable element — a runnable command or a CTA link inside the designated CTA/grid slot — before the first heading past the opening block, regardless of which opening move was used.**
   Rationale: the caveat opening is legitimate (finding 2); having zero next step after it is not. Two measured fleet pages fail this today.
   Verify: scan the file up to the first `##` (or first ~40 lines); assert at least one fenced code block or at least one link inside the CTA/grid slot from rule 5/6 is present. If no structural slot exists (§7 precondition), fall back to any non-nav link in that window and report the fallback explicitly rather than silently passing.
   Evidence level: measured (docs-shape.md §7 — two named fleet pages, `ocx-mcp` and `ocx-sdk-python`/`ocx-mirror-sdk`, currently fail this).

4. **Cap button-style CTAs (primary + optional secondary, one action each) at 2 total on the landing page, counted separately from any task-link grid.**
   Rationale: matches the two best-attested fetched examples with a clear hierarchy (Cloudflare Workers, GitLab, both at 2) and directly rejects the fleet's measured worst case (`ocx`, 7 CTAs with no hierarchy).
   Verify: parse the designated CTA slot (§7 precondition); assert `len(items) <= 2`. Absent the slot, this check cannot run — report "no CTA slot found" rather than a pass.
   Evidence level: argued (the cap of 2 is this deliverable's synthesis from 2 fetched primary examples plus one fleet counter-example; not a cited industry-wide standard).

5. **If a task-link grid is present, cap it at 9 links total, grouped in sets of at most 4.**
   Rationale: GOV.UK's own 2013 guidance says to use such links "very sparingly," with a mobile-fold rationale (a third of traffic sees only this block before scrolling), but gives no number; Stripe's fetched page groups 9 links in 3 rows of 3 and is one of the two sites most cited as best-practice. This is the tightest defensible number that matches the best example and still rejects GitLab's looser 19-link, two-row homepage and the fleet's `ocx` tile sprawl.
   Verify: parse the designated grid slot (§7 precondition); assert `len(items) <= 9` and `max(group_size) <= 4`.
   Evidence level: argued for the specific numbers; measured for the underlying "sparingly, mobile-fold, no duplication" rationale ([insidegovuk.blog.gov.uk, 2013](https://insidegovuk.blog.gov.uk/2013/09/20/top-task-links-updated-guidance/)).

6. **"Who is this for" is required, and is satisfied by either (a) a task/need-phrased link grid (labels read as verbs or first-person clauses, not product nouns) or (b) one explicit sentence naming the reader segment — a product-noun-labeled feature grid satisfies neither.**
   Rationale: the fleet's only real instance (`ocx-catalog`) satisfies this with zero prose, via path (a) alone; requiring a literal sentence would fail the fleet's own best example, and requiring nothing would let `ocx`'s noun-labeled tiles (which currently fail this) pass by accident.
   Verify: reading heuristic, machine-assisted only at the negative extreme — a script can assert "at least one grid slot or one sentence containing a second-person/persona marker exists" (catches the true-zero case), but distinguishing a task-phrased label from a product-noun label requires a reviewer read. Ship labelled `unverified` for the positive case.
   Evidence level: measured (ux-observability-posture.md §7 — 1 of 9 sites, `ocx-catalog`, satisfies this today; the mechanism it uses is directly observed).

7. **No placeholder text ever reaches a published landing page.**
   Rationale: it already happened in this fleet — 3 of 4 tiles on a published site were literal, verbatim Lorem Ipsum.
   Verify: `grep -rin "lorem ipsum" <landing-file-path>` (extend the pattern list to "placeholder text," "TODO: write," "coming soon" as house-style dictates) in CI on every push touching the landing page path; nonzero match fails the build.
   Evidence level: measured (ux-observability-posture.md §7 — `ocx-save/index.md:26-39`, verbatim).

8. **Flag, do not block, when two structurally distinct grid slots on one landing page share more than a rough overlap of significant label words.**
   Rationale: catches the `ocx` pattern of two tile treatments restating the same ground (cross-platform, automation) back to back, without false-failing legitimate re-mentions (a term appearing once in a task link and once in a product tile is not automatically bad).
   Verify: script — tokenize the label text of every grid slot on the page, diff token sets pairwise, warn (not fail) above a threshold (e.g. >30% shared significant words) for human review.
   Evidence level: measured for the fleet instance it targets (ux-observability-posture.md §7); argued for the specific overlap threshold.

## AI-agent angle

An LLM asked to write a docs landing page unprompted characteristically:

- **Reaches for a multi-paragraph marketing hero by default** — "Welcome to the future of X," value paragraphs, a "Why X?" section — because that shape is common in the general web corpus it trained on. This is exactly Laravel's fetched pattern, and it is the one fetched example that reads as the outlier against 2026 practitioner consensus, not the norm to imitate. Smallest check: word-count the paragraph before the first heading/fenced block (rule 2); >30 words or >1 sentence is the tell.
- **Produces CTAs with no hierarchy**, restating "Get Started" in three different phrasings across the page because each section was drafted somewhat independently. This mirrors `ocx`'s measured 7-CTA, no-hierarchy state. Smallest check: count links inside the designated CTA slot (rule 4); if the slot itself doesn't exist because the model wrote plain body links instead, that absence is itself the first finding.
- **Writes a generic "who this is for" sentence with padded persona nouns** ("for developers, teams, and enterprises of all sizes") instead of the task-phrased links that every fetched best-practice example actually uses. Smallest check: grep the "who is this for" sentence, if one exists, for stacked generic-persona nouns ("developers, teams, enterprises") as a smell — not a hard gate, but a strong prior that the model padded rather than named a real task.
- **Produces duplicate feature-tile sections that restate the same claims**, because the model re-reads its own draft outline and re-covers ground it already covered under a different heading — the exact shape of `ocx`'s two overlapping tile treatments. Smallest check: the token-overlap heuristic (rule 8).
- **Invents social proof** ("trusted by thousands of developers," "used by leading companies") with no backing data, because the shape is common in marketing copy it has seen and 0 of 9 real fleet sites carry any social proof at all to imitate instead. Smallest check: grep any sentence matching a social-proof pattern ("trusted by," "used by," a bare large number followed by "companies"/"developers"/"teams") for an adjacent citation or data link; flag unsourced instances as a hard-fail, since the true rate in this fleet is zero and any claim is therefore fabricated until shown otherwise.
- **Turns the landing page itself into a tutorial or a full reference table** — a numbered 10-step walkthrough, or an inlined API table — rather than linking out to the dedicated page type, because "be comprehensive" is a stronger default pull than "be a landing page." This is the mixing-check's job structurally (`page-type-set-and-declaration`), but the smallest catch specific to landing pages is: a numbered-list block with more than 2 steps, or a table with more than 3 rows, sitting directly on the index/landing file is a strong prior that the page has drifted into a different type.
- **Leaves scaffold placeholders in generated output when producing a page fast** — the Lorem Ipsum case is not hypothetical; it already happened from a real (if stale) generation path in this fleet. Smallest check: rule 7's grep, run on every commit touching the landing path, not just at review time.

## Contested / evolving

- **The landing-page opening move is genuinely unsettled across the fetched corpus, and is not converging on one shape.** Stripe and uv (2026's most-cited "docs done right" pair) both cut hero prose to one sentence and lead with action; Cloudflare keeps a short value-claim hero; GitLab skips prose hero entirely for a pure task grid; Laravel keeps a full marketing essay. The trend, so far as five sites can show a trend, favors cutting or bounding the hero — Stripe and uv are cited far more often as the 2026 exemplars than Laravel's pattern is — but this deliverable resolves the practical question (what must a check reject) rather than claim the debate is closed: see finding 1 and rule 1.
- **GOV.UK's own numeric silence on link caps is itself unresolved in the wider literature, not just in this deliverable's search.** No source fetched — GOV.UK's current guidance pages, the 2013 blog post, or the GOV.UK Design System's own link-styling page — gives a number. The 2026 defaults this deliverable ships (rules 4 and 5) fill that gap from fleet evidence and are labelled `argued` for exactly this reason; a future wave with access to this fleet's own search-log or click data (once `docs-observability`'s zero-result-search work exists) should supersede the argued number with a measured one.
- **Whether "who this is for" belongs on the page at all, versus being fully absorbed into task-phrased link labels, is trending toward the latter as of 2026** — Stripe's fetched page states it nowhere in prose, and it is the single most-cited "docs done right" example in the corpus surveyed by this program's other scouts. This deliverable ships both satisfaction paths (rule 6) rather than picking one, because the fleet's own best example (`ocx-catalog`) uses only the structural path and a rule requiring prose would regress it.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.stripe.com](https://docs.stripe.com/) | Stripe's live docs landing page | Fetched Sept 2026 | Most-cited 2026 "docs done right" example; cuts marketing hero entirely, opens with a CLI command and task-phrased link groups |
| [docs.astral.sh/uv](https://docs.astral.sh/uv/) | uv's live docs landing page | Fetched Sept 2026 | Second most-cited 2026 exemplar; one-sentence hero, benchmark chart, multi-tool-replacement framing that implies audience without stating it |
| [laravel.com/docs/12.x](https://laravel.com/docs/12.x) | Laravel's docs entry point (redirects to Installation) | Fetched Sept 2026, v12.x | The fetched outlier: full marketing essay as the landing/first-tutorial page; the negative example the hero-cap rule is written against |
| [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) | Cloudflare Workers product-docs landing page | Fetched Sept 2026 | Clean 2-CTA hierarchy plus a separate, capped task-category grid — the shape rule 4 generalizes from |
| [docs.gitlab.com](https://docs.gitlab.com/) | GitLab's docs home | Fetched Sept 2026 | No-hero, pure task-grid opening; also the corpus's own "too much homepage" counter-example at 19 links in two rows |
| [insidegovuk.blog.gov.uk/2013/09/20/top-task-links-updated-guidance](https://insidegovuk.blog.gov.uk/2013/09/20/top-task-links-updated-guidance/) | GDS's own 2013 guidance post on top-task links | 2013, still the standing citation in 2026 practitioner writing | Primary source for the exact "very sparingly" / mobile-fold quote used to ground rule 5; verified directly, not via secondary summary |
| [guidance.publishing.service.gov.uk/.../writing-guidelines/add-links](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/add-links/) | GOV.UK's current link-writing guidance | Current, 2026 | Confirms the same qualitative "do not swamp users with too many links" principle survives on the current site, still with no number |
| [design-system.service.gov.uk/styles/links](https://design-system.service.gov.uk/styles/links/) | GOV.UK Design System's link component page | Current, 2026 | Checked and ruled out as a source of a numeric link cap — it covers styling only, confirming the gap is real, not a fetch miss |
| [guidance.publishing.service.gov.uk/.../identify-user-needs](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/) | GOV.UK's current "identify user needs" guidance | Current, 2026 | Confirms task-based user-need framing ("As a... I need to... so that...") as GOV.UK's mechanism for the underlying "who is this for" question |
| [guidance.publishing.service.gov.uk/.../plan-new-govuk-content](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/plan-new-govuk-content/) | GOV.UK's current content-planning guidance | Current, 2026 | Checked directly for the sparingly/mobile-fold text cited by the topic map's scout; not found on the current version of this specific page, which is itself a finding (see Findings §4) |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/docs-shape.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/docs-shape.md) | Grounding-wave audit, §7 "Landing pages" | 2026-09-05 | Primary measured source for the fleet's real opening-move table and the "fourth move" (title-then-caveat) finding |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/ux-observability-posture.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/ux-observability-posture.md) | Grounding-wave audit, §7 "Landing page anatomy" | 2026-09-05 | Primary measured source for the CTA-count, tile-duplication, Lorem Ipsum, and "who is this for" fleet data used throughout this file |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/exemplar-sites.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/exemplar-sites.md) | Wave-3 scout report on exemplar sites | 2026-09-05 | Independent corroboration that Stripe and uv skip the marketing hero, cited before this deliverable's own direct fetches confirmed it |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/design-systems.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/design-systems.md) | Wave-3 scout report on design systems and GOV.UK/NN/g | 2026-09-05 | Source of the original pointer to the GOV.UK "very sparingly" quote and mobile-traffic-share framing, which this deliverable then re-verified against the primary 2013 post directly |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/canonical-guides.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/canonical-guides.md) | Wave-3 scout report on canonical style guides | 2026-09-05 | Cross-checked for any competing landing-page numeric guidance from Google/Microsoft/Kubernetes style guides; none found beyond what's already cited |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/codified-practice.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/codified-practice.md) | Wave-3 scout report on codified/lintable practice | 2026-09-05 | Checked for any existing lint rule targeting landing-page structure; none found, confirming the gap this deliverable fills |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-frame.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-frame.md) | Phase-0 frame and its wave-1 corrections | 2026-09-05 | Source of the original three-way hypothesis this deliverable's finding 1 tests and partially overturns for the landing case specifically |
| [/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map.md](file:///home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map.md) | Phase-3 topic map, `landing-page-contract` brief and the owned conflict row | 2026-09-05 | The commissioning brief this file answers verbatim |
