---
title: Tier model and the first-steps contract
topic: tier-model-and-first-steps-contract
group: docs-use-case-discovery
agent: docs-research-tier-model
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 15
scope: |
  Covers: the use-case tier axis (first steps / everyday / integration) as
  distinct from the content-type axis, the tier-by-type matrix, what a
  first-steps page or tutorial owes a reader, step/word budgets, and the
  tutorial-vs-quickstart-vs-EPPO tension. Does not cover: how a project
  discovers its top tasks in the first place (owner: use-case-discovery-
  procedure), page-type declaration mechanics or the mixing check (owner:
  page-type-set-and-declaration), or landing-page contract details (owner:
  landing-page-contract).
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Tier and type are independent axes, confirmed against live nav](#1-tier-and-type-are-independent-axes-confirmed-against-live-nav)
  2. ["Edge reference" is not a fourth tier](#2-edge-reference-is-not-a-fourth-tier)
  3. [Quickstart and tutorial are different templates with different jobs, not a spectrum](#3-quickstart-and-tutorial-are-different-templates-with-different-jobs-not-a-spectrum)
  4. [First-steps step count scales with external-system count, it is not a fixed number](#4-first-steps-step-count-scales-with-external-system-count-it-is-not-a-fixed-number)
  5. [The fleet's own first-steps pages are the tightest examples measured](#5-the-fleets-own-first-steps-pages-are-the-tightest-examples-measured)
  6. [The tutorial contract is a hard, quotable set of obligations](#6-the-tutorial-contract-is-a-hard-quotable-set-of-obligations)
  7. [EPPO's self-contained-topic principle does not actually forbid tutorials](#7-eppos-self-contained-topic-principle-does-not-actually-forbid-tutorials)
  8. [Tier boundaries are nav-structural, not just narrative, in both exemplars](#8-tier-boundaries-are-nav-structural-not-just-narrative-in-both-exemplars)
  9. [A live fetch corrects the audit's own "uv has no hero" claim](#9-a-live-fetch-corrects-the-audits-own-uv-has-no-hero-claim)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Tier (first steps → everyday → integration) and content type (tutorial, how-to, reference, explanation, troubleshooting) are two independent axes. Neither the shipped rule nor a project's IA may compute one from the other. [uv](https://docs.astral.sh/uv/), [Astro getting-started](https://docs.astro.build/en/getting-started/)
- uv's own top nav runs five sections — Introduction, **Getting started**, **Guides**, Concepts, Reference — with Getting started structurally separate from Guides, which is itself internally staged (installation → scripts → tools → projects → publishing → migration → integrations). That staging inside one nav section is the clearest live proof that a tier is a reading-order decision across many pages, not a page-type label. [docs.astral.sh/uv](https://docs.astral.sh/uv/)
- "Edge reference" is not a fourth tier. Reference-typed pages are addressable from every tier as lookup material and never gate a tier's entry or exit condition; the frame's own hypothesis 3 mis-names this and should be corrected in the shipped rule.
- Quickstart and Tutorial are two different, official templates with different jobs, not a spectrum: a quickstart is "the primary feature... as quickly as possible"; a tutorial is "hands-on learning" via "an example project." [thegooddocsproject.dev/template](https://thegooddocsproject.dev/template/)
- Diataxis's tutorial contract is hard and quotable: no unexplained action, "every step... should produce a comprehensible result," a single non-branching path ("doesn't offer choices or alternatives"), and reliability tested by real users, not asserted. [diataxis.fr/tutorials](https://diataxis.fr/tutorials/)
- The fleet has zero pages classified as tutorial across 248 pages; the getting-started tier (17 pages, 6.9%) is the entire first-steps tier everywhere it exists. This is not evidence the fleet is failing at tutorials — it is evidence that a bounded quickstart is the correct terminal form for CLI-shaped tools, which is exactly what the corpus's own CLI tools (uv, Bun) also ship. [docs-shape.md §2](../docs-audit/docs-shape.md)
- A fixed step-count budget for first-steps is wrong. Twilio's SMS quickstart (8 steps) and Supabase's React quickstart (9 steps) both wire ≥2 external systems and land at 5–9; uv's and ocx's own installation pages wire zero external systems and correctly land at exactly 1 command. The rule should state a result condition, not a universal number. [twilio.com/docs/messaging/quickstart](https://www.twilio.com/docs/messaging/quickstart), [supabase.com quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- ocx's own first-steps pages are, by the numbers, close to best-in-corpus: `installation.md` reaches a working command in 20 words with zero preamble headings; `getting-started.md` reaches one in 185 words, inflated mostly by one deferrable `::: tip` callout. [ux-observability-posture.md §8](../docs-audit/ux-observability-posture.md)
- Supabase's quickstart states its production-readiness scope explicitly ("optimizes for getting you to a working app, not for production") immediately followed by three concrete before-you-ship items — a pattern the shipped rule should require whenever a first-steps page's own commands are dev-only. [supabase.com quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- Every Page is Page One's self-contained-topic principle does not actually forbid a linear tutorial. EPPO's own resolution is a "workflow topic" — a page that explicitly declares itself sequential and links its constituent task topics — as the legitimate exception to the every-page-stands-alone default. Diataxis's tutorial type is functionally the same exception under a different name. This tension is resolved, not merely noted. [everypageispageone.com/the-book](https://everypageispageone.com/the-book/)
- Whether a project needs a canonical Tutorial type at all is contingent, not universal: Astro (a framework the reader builds multi-file artifacts with, across more than one sitting) ships a full 6-unit tutorial; uv (a single CLI invoked once per task) ships none and is not worse off for it. The criterion is "does the reader have to assemble more than one interacting concept before the tool is useful," not "is this the getting-started page."
- A quickstart's terminal step MUST be a single command wherever the tool's actual complexity allows it: Astro's own front door defers its 6-unit tutorial and instead leads with exactly one command, `npm create astro@latest`. [docs.astro.build/en/getting-started/](https://docs.astro.build/en/getting-started/)
- Tier boundaries should be nav-structural, not merely narrative: both uv and Astro put a hard nav or homepage-section break between the first-steps entry point and the next tier, which is what stops tier 1 growing into tier 3 by construction rather than by editorial discipline alone.
- The tutorial contract forbids mid-procedure branching (package-manager tabs, OS tabs) inside a tutorial's steps; that branching belongs on an installation or how-to page instead, per Diataxis's "doesn't offer choices" rule, quoted directly. [diataxis.fr/tutorials-how-to/](https://diataxis.fr/tutorials-how-to/)
- No row in the topic map's "Conflicts to resolve" table names `tier-model-and-first-steps-contract` as an owner topic; every conflict this topic must resolve is the one stated inline in its own research brief, and all of them are resolved above.

## Findings

### 1. Tier and type are independent axes, confirmed against live nav

Fetching `docs.astral.sh/uv` directly (2026-09-05) shows five top-level sections: Introduction, **Getting started** (Installation, first steps, features, help), **Guides** (a practical how-to hub), Concepts, and Reference. Guides is itself internally staged from foundational to advanced: Installing Python → Running scripts → Using tools → Working on projects → Publishing packages → Migration (pip to uv projects) → Integrations (15+ platforms including Docker, Jupyter, GitHub Actions, PyTorch, FastAPI) ([docs.astral.sh/uv](https://docs.astral.sh/uv/)). Fetching `docs.astro.build/en/getting-started/` shows the same shape under different labels: the homepage stages three named entry paths at once — a guided, linear Tutorial ("Build a Blog"), a one-command Quickstart (`npm create astro@latest`), and topic Guides under "Learn"/"Extend" for depth, with Reference material reached only via the sidebar ([docs.astro.build/en/getting-started/](https://docs.astro.build/en/getting-started/)). In both sites, "Getting started" is a distinct nav-level or homepage-level grouping from "Guides"/"Learn", and "Reference" sits outside either. A rule that tried to map "first steps" onto "tutorial type" and "everyday tasks" onto "how-to type" would still be correct about half the time — but it would leave uv's staged Guides section, which is itself first-steps-to-integration progression entirely inside the how-to type, unrepresentable. `docs-frame.md`'s own correction 5 states this must not be a mapping; this fetch confirms it directly rather than only by inference.

### 2. "Edge reference" is not a fourth tier

The frame's original hypothesis named four tiers: first steps, everyday tasks, elaborate integration, edge reference. Neither uv nor Astro treats reference this way. uv's Reference section sits outside the Getting-started → Guides progression entirely, not after it — a reader consults it from any tier, including the first one, whenever a first-steps command's flag needs a lookup. Astro's sidebar reference is likewise reached independently of the Tutorial/Quickstart/Guides path. Reference is a content type, addressable at any point in the reader's journey, not a fourth and final tier a reader "graduates" into. The shipped tier model should name three narrative tiers — first steps, everyday tasks, elaborate integration — and treat reference (along with troubleshooting and explanation) as content types that appear *within* each tier rather than as a tier of their own. This directly corrects the frame's hypothesis 3 as investigated in this topic's brief.

### 3. Quickstart and tutorial are different templates with different jobs, not a spectrum

Fetching `thegooddocsproject.dev/template/` directly confirms Quickstart and Tutorial are shipped as two distinct templates, not one template with a "short" and "long" mode. The project's own definitions: a Quickstart "introduces your users to your application for the first time. It focuses on the primary feature of the application and helps your users to start using the application as quickly as possible" — speed to first use of the core feature is the whole point. A Tutorial is "instructions for setting up an example project using the product, intended for the purpose of hands-on learning" — an example artifact built end to end is the whole point ([thegooddocsproject.dev/template](https://thegooddocsproject.dev/template/)). This maps cleanly onto the corpus evidence: uv (whose "primary feature" is one CLI invocation) has a Quickstart-shaped first-steps page and no Tutorial; Astro (whose product is "a site you build") has both, because reaching the primary feature (`npm create astro@latest`) and learning to build with it (the 6-unit blog tutorial) are genuinely different jobs for that kind of tool.

### 4. First-steps step count scales with external-system count, it is not a fixed number

Fetching `twilio.com/docs/messaging/quickstart` (Python path) counts 8 discrete actions from creating the script to seeing a received SMS: create file, set two credential fields, set environment variables, set the `from` number, set the `to` number, save, run, verify receipt — each one touching a different external system (Twilio account, phone carrier, local shell) ([twilio.com/docs/messaging/quickstart](https://www.twilio.com/docs/messaging/quickstart)). Fetching `supabase.com/docs/guides/getting-started/quickstarts/reactjs` counts 9 steps (8 required, 1 optional) from creating a hosted Supabase project through querying data in a running React app — again spanning several systems: a hosted database, a local frontend toolchain, environment variables, a client library ([supabase.com quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)). Both land at 5–9, which matches the number `exemplar-sites.md` §4 already recorded. But uv's own installation (`curl ... | sh`) and Astro's own quickstart (`npm create astro@latest`) each wire zero external systems and correctly compress to exactly 1 command. The step count is a function of how many distinct systems must be wired before a verifiable result exists, not a fixed target every first-steps page should hit. A rule requiring "5–9 steps" would be wrong for uv, Bun, and ocx; a rule requiring "1 command" would be wrong for Twilio and Supabase.

### 5. The fleet's own first-steps pages are the tightest examples measured

ocx's `installation.md` reaches a runnable, successful command in 20 words and one heading (the H1); `getting-started.md` reaches one in 185 words behind two headings, and that runway is inflated less by preamble prose than by a single `::: tip` callout the page could defer ([ux-observability-posture.md §8](../docs-audit/ux-observability-posture.md)). Both pages wire zero external systems (`ocx package exec` runs against a package the CLI itself resolves) and both correctly compress to a single command, consistent with finding 4. This is the fleet's strongest existing first-steps evidence and should be cited in the shipped rule as the worked example, not invented from scratch.

### 6. The tutorial contract is a hard, quotable set of obligations

Fetching `diataxis.fr/tutorials/` directly yields three separable, checkable obligations. On results: "Every step the learner follows should produce a comprehensible result, however small" — no step may exist whose only visible effect is "no error." On choice: "Your guidance needs to remain focused on what's required to reach the conclusion, and everything else can be left for another time" — alternatives are excluded, not offered as options. Fetching `diataxis.fr/tutorials-how-to/` sharpens the same point structurally: "A tutorial's path follows a single line. It doesn't offer choices or alternatives," contrasted directly with how-to guides, which "typically fork and branch." On reliability: "A learner who follows your directions and doesn't get the expected results will quickly lose confidence... your tutorial ought to be so well constructed that things can't go wrong, that your tutorial works for every user, every time" — and testing against real users is named as mandatory, not optional, because "you won't discover them all by yourself" ([diataxis.fr/tutorials](https://diataxis.fr/tutorials/), [diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/)). These three obligations (every step visible, no branching, tested reliability) are concrete enough to check mechanically and are listed as such in Normative guidance candidates below.

### 7. EPPO's self-contained-topic principle does not actually forbid tutorials

Fetching `everypageispageone.com/the-book/` directly resolves the conflict the brief names between "eliminate options, force a single linear path" (Diataxis's tutorial contract) and "make every page self-contained, assume no prior page was read" (Every Page is Page One). EPPO's own text acknowledges "EPPO topics have no sequential dependencies" as its default, but explicitly carves out an exception: a project may author a "workflow topic" that itself declares its sequential nature and links its constituent task topics in order — sequential information becomes "optional navigation paths," reachable from a page that says so, rather than a silent assumption baked into ordinary topics. Diataxis's tutorial type is functionally identical: it is a page (or page set) that declares itself a managed, linear path, and a reader who lands on tutorial step 4 directly (via search) is expected to see it is part of a numbered sequence and back up, exactly as EPPO's workflow-topic convention expects. The two frameworks do not disagree about whether linear content may exist; they agree that *most* pages should be self-contained and that a sequential page must say so structurally (a numbered title, a "part 3 of 6" marker, prev/next navigation) rather than assume the reader arrived from part 1. The shipped rule should require that any tutorial-typed page carry this self-declaration (title numbering or explicit prev/next), which satisfies both contracts simultaneously.

### 8. Tier boundaries are nav-structural, not just narrative, in both exemplars

In uv, "Getting started" and "Guides" are separate top-level nav sections; nothing in the site's navigation lets an integration-tier page (Docker, GitHub Actions) live inside the Getting-started group without looking structurally out of place. In Astro, the homepage names three separate entry paths in three separate headed sections ("Take a guided tour," "Start a new project," "Learn") rather than one long scrolling list. This structural separation is what stops a first-steps page from slowly absorbing everyday-task or integration content over time — the nav itself resists it, not just editorial discipline. ocx's own `getting-started.md` is the live counter-example in miniature: it already carries one deferrable aside (the `::: tip` callout) that has nothing to do with reaching the first command, which is exactly the kind of creep a nav-structural boundary alone does not prevent — a word-budget check is also needed (see Normative guidance candidate 11).

### 9. A live fetch corrects the audit's own "uv has no hero" claim

`exemplar-sites.md` §1 (an earlier scout's synthesis) states uv's landing page has "no separate marketing section." Fetching `docs.astral.sh/uv/` directly today shows this is not quite accurate: the page includes a benchmark chart ("Installing Trio's dependencies with a warm cache") and a highlights section stating "10-100x faster than pip." This is a genuine hero element by any structural definition — a visual centerpiece before the nav proper. The distinction worth keeping is *what kind* of hero: uv's is a data-substantiated performance claim with a real chart, not adjective-driven marketing prose ("seamless," "effortless," "revolutionary"). This matters for the AI-agent-angle check below: a mechanical check that flags any visual element before the first command would misfire on uv; a check for superlative adjectives with no accompanying data is the more defensible target. This finding belongs primarily to the sibling `landing-page-contract` topic but is recorded here because it was produced investigating this topic's own step-1 fetch instruction.

## Normative guidance candidates

1. **Rule:** A docs set MUST declare tier and type as two separate keys (e.g. frontmatter `tier: first-steps|everyday|integration` and `type: landing|tutorial|how-to|reference|explanation|troubleshooting`); no rule or script may compute one from the other.
   **Rationale:** prevents the exact mis-filing the frame's own hypothesis 3 committed (naming reference as a tier) and that uv's and Astro's live nav structure disproves.
   **Verify:** grep frontmatter across the docs tree for any single field trying to encode both axes (e.g. `category: advanced-reference`); flag any page missing one of the two keys once the fleet adopts frontmatter typing.
   **Evidence level:** normative (direct correction of `docs-frame.md` correction 5, confirmed against [uv](https://docs.astral.sh/uv/) and [Astro](https://docs.astro.build/en/getting-started/) live nav).

2. **Rule:** Reference-typed pages are never a tier. No tier's exit condition may require reading a reference page to be satisfied.
   **Rationale:** corrects "edge reference" as a fourth tier; reference is a lookup type addressable from any tier, per finding 2.
   **Verify:** named reading heuristic — for each tier's stated exit condition, check whether satisfying it requires the reader to have read a page typed `reference`. If yes, that page is doing how-to work under a reference label and should be re-typed or split.
   **Evidence level:** argued (derived from measured axis independence in finding 1; no single source states this negatively, it follows from uv's and Astro's structure).

3. **Rule:** A first-steps tier's step or word budget is not a fixed number. State it as a result condition ("ends at one verified, observable outcome from real commands") with a smell threshold, not a target: at most 9 discrete numbered actions or shell blocks before that outcome when the tool requires 0–1 external systems, unbounded (but justified) when it requires 2 or more.
   **Rationale:** a fixed 5–9 budget is wrong for single-binary CLIs (uv, Bun, ocx: correctly 1 command) and a fixed "1 command" rule is wrong for multi-system quickstarts (Twilio: 8, Supabase: 9), per finding 4.
   **Verify:** script counts ordered-list items matching `^\s*\d+\.\s` plus distinct shell/bash fenced code blocks from the H1 to the first success marker (a comment, `>>>`, or a sentence containing "you should see"/"successfully"); if the count exceeds 9, the page must name (in frontmatter or a preceding sentence) which external systems require setup, or it is flagged for review.
   **Evidence level:** measured ([twilio.com/docs/messaging/quickstart](https://www.twilio.com/docs/messaging/quickstart), [supabase.com](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [ux-observability-posture.md §8](../docs-audit/ux-observability-posture.md)) for the numbers; argued for the threshold choice.

4. **Rule:** A first-steps page's runway to its first fenced command must stay under roughly 100 words; any callout, tip, or aside positioned before that point must be deferred past it.
   **Rationale:** ocx's own `installation.md` (20 words) and `getting-started.md` (185 words, inflated by one deferrable `::: tip`) are the fleet's own proof that the shorter number is achievable and the longer one is creep, not necessity.
   **Verify:** script counts words from the H1 to the first fenced code block; flag any callout/admonition syntax (`::: tip`, `> [!NOTE]`, `<Aside>`) appearing before that block.
   **Evidence level:** measured ([ux-observability-posture.md §8](../docs-audit/ux-observability-posture.md)).

5. **Rule:** A canonical Tutorial type is not required of every project. It is required only when the reader must assemble more than one interacting concept, across more than one sitting, before the tool is useful (a framework, a language, a multi-file system); a single-purpose CLI whose whole surface is invoked in one command may terminate its first-steps tier at a bounded Quickstart with no Tutorial at all.
   **Rationale:** Astro (multi-file site builder) ships a real 6-unit tutorial; uv (single CLI) ships none and is not worse for it; the fleet has 0/248 tutorial pages and 17/248 getting-started pages, consistent with a fleet of mostly CLI/library tools.
   **Verify:** named reading heuristic applied at planning time, not a lint: does reaching the tool's core value require assembling ≥2 concepts the reader must hold at once (routing + components + islands, for a framework) versus one invocation (install + run, for a CLI)? Label this candidate explicitly as un-lintable after the fact, per the fleet's own `rule-without-a-lint-labelling` convention.
   **Evidence level:** argued (2-site comparison: [docs.astral.sh/uv](https://docs.astral.sh/uv/) vs [docs.astro.build/en/getting-started](https://docs.astro.build/en/getting-started/)).

6. **Rule:** A Quickstart and a Tutorial are not the same template and must not be merged into one page. A Quickstart's job is fastest path to the primary feature; a Tutorial's job is hands-on learning via a built example. A page cannot do both without violating the tutorial's no-branching rule (a quickstart's job is often to show install-method tabs, which a tutorial must not contain).
   **Rationale:** The Good Docs Project ships these as two distinct templates with stated, different purposes; conflating them produces a page that both branches (quickstart's job) and promises a single safe path (tutorial's job) at once.
   **Verify:** grep a page typed `tutorial` for tabbed/branching syntax (`::: code-group`, `<Tabs>`, sibling fenced blocks under one step labelled by OS/package-manager); presence fails the check. The same syntax on a page typed `quickstart` or `how-to` is expected and passes.
   **Evidence level:** normative ([thegooddocsproject.dev/template](https://thegooddocsproject.dev/template/), direct quotes).

7. **Rule:** A tutorial-typed page must not offer branching choices inside its steps. Defer package-manager/OS/language choice to a preceding installation or quickstart page.
   **Rationale:** Diataxis states directly, "A tutorial's path follows a single line. It doesn't offer choices or alternatives," in contrast to how-to guides, which "fork and branch."
   **Verify:** same grep as rule 6, scoped specifically to pages declared `type: tutorial`.
   **Evidence level:** normative ([diataxis.fr/tutorials-how-to](https://diataxis.fr/tutorials-how-to/), direct quote).

8. **Rule:** Every step of a first-steps or tutorial page must produce a comprehensible, observable result; no step's only effect may be "no error was printed."
   **Rationale:** Diataxis: "Every step the learner follows should produce a comprehensible result, however small." A silent step breaks the confidence chain the whole tier exists to build.
   **Verify:** for each numbered step or command block in a page typed `tutorial` or in the first-steps tier, confirm a stated or shown output/effect follows within the same step (a printed value, a file that now exists, a page that now renders) — cross-reference the fleet's already-covered tested-example gate, which proves the command runs; this rule additionally requires the *page* to show what running it produced.
   **Evidence level:** normative ([diataxis.fr/tutorials](https://diataxis.fr/tutorials/), direct quote) + codified (cross-references the already-covered tested-example mechanism rather than re-specifying it).

9. **Rule:** A tutorial-typed page must be tested against a reader who did not write it before shipping, not merely executed as a script.
   **Rationale:** Diataxis: "you won't discover them all by yourself, you will have to rely on users to discover them for you" — a passing automated script proves the commands run, not that an unfamiliar human can follow the prose between them.
   **Verify:** named reading heuristic, not a lint — record who reviewed the page and whether that person is someone other than its author, alongside the existing (already-covered) doc-review-by-non-author question; this candidate scopes that existing question specifically to tutorial-typed pages, where the cost of failure is highest.
   **Evidence level:** normative (direct quote) — explicitly labelled un-lintable.

10. **Rule:** A tier boundary must be structural in the nav (a distinct top-level nav entry or homepage section for the next tier), not only a suggestion in prose.
    **Rationale:** uv and Astro both make it structurally awkward to slip integration-tier content into the first-steps group; this is what prevents tier-1 sprawl by construction rather than relying on an author's discipline.
    **Verify:** for the site's generator config (`mkdocs.yml` nav:, `.vitepress` config sidebar, `book.toml`), confirm the first-steps page(s) and the everyday-tasks hub occupy different top-level nav groups.
    **Evidence level:** measured/argued mix ([docs.astral.sh/uv](https://docs.astral.sh/uv/), [docs.astro.build/en/getting-started](https://docs.astro.build/en/getting-started/)).

11. **Rule:** The first-steps page's closing section must link the everyday-tasks tier's index by name.
    **Rationale:** stops a reader stalling after their first success; both exemplars make the next step discoverable rather than implicit.
    **Verify:** grep the last ~15 lines of the first-steps page for a markdown link whose target matches the everyday-tier nav path (e.g. `/guides/`, `/how-to/`); fail if absent.
    **Evidence level:** argued.

12. **Rule:** If a quickstart's own commands are not production-safe (hardcoded keys, no auth, dev-only flags), the page must state that scope explicitly, near the point where it becomes true, with concrete before-you-ship items.
    **Rationale:** Supabase states this directly and specifically ("optimizes for getting you to a working app, not for production") immediately followed by three named considerations (RLS policies, credential handling, custom domains) — silently shipping insecure defaults without the caveat teaches a bad habit as if it were best practice.
    **Verify:** grep the page for a scope/caveat sentence containing "production" when the page's own code contains a trigger pattern list (hardcoded API key literal, `--dev`, disabled auth) defined per language.
    **Evidence level:** measured ([supabase.com quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), direct quote) — argued generalization to other stacks.

## AI-agent angle

- **Defaults to "Tutorial" as the label for any onboarding content**, because "tutorial" is the highest-frequency word for onboarding docs in training data, regardless of whether the project needs one. Check: before typing a page `tutorial`, apply candidate 5's heuristic (≥2 interacting concepts assembled across >1 sitting); the fleet's own 0/248 tutorial count is the base rate to compare against, not a target to fill.
- **Invents a step-count or time claim** ("5 easy steps," "under 5 minutes") for a quickstart without counting the actual steps against the tool's real external-system count, because it has no completion-rate data of its own. Check: run candidate 3's script and compare the printed count against any claimed number in the prose; a mismatch is the mistake, not the count itself.
- **Collapses tier and type into one field** (`category: advanced` doing duty for both "this is the integration tier" and "this is reference material"), because a single enum is simpler to generate than two orthogonal ones. Check: candidate 1's frontmatter grep.
- **Adds package-manager or OS tabs inside a page it also calls a tutorial**, because that branching pattern is the dominant getting-started shape in its training data (Vite, Tailwind) and it does not distinguish "tutorial" from "quickstart" as different jobs. Check: candidate 6/7's grep for tab syntax on a `type: tutorial` page.
- **Pads the first-steps runway with a "why this matters" paragraph before the first command**, optimizing for "helpful and complete" rather than for the reader's fastest path to a result. Check: candidate 4's word-count-to-first-fence script.
- **Ships a quickstart's insecure defaults without Supabase's disclaimer pattern**, because dev-mode snippets are what most training-data examples show and a caveat sentence is easy to omit under time pressure. Check: candidate 12's grep for a production-scope caveat paired with a trigger-pattern hit.
- **Asserts a specific competitor's practice from memory** ("most CLIs quickstart in 3 steps") without a fetched, dated source. This topic's own draft avoided this only by fetching Twilio, Supabase, uv, Astro, Diataxis, The Good Docs Project, and Every Page is Page One directly rather than recalling them; the check for a reviewer is the same one `exemplar-sites.md`'s own AI-agent-angle names: no non-obvious claim without a link to a page actually fetched this session.

## Contested / evolving

- **Tier ≠ type mapping.** Resolved, not contested: `docs-frame.md` correction 5 already forbids the mapping and this topic's direct fetches of uv and Astro confirm it structurally rather than only by earlier scout synthesis (finding 1). No further ambiguity remains to track.
- **"Edge reference" as a fourth tier.** Resolved: it is a type, not a tier (finding 2). This is a correction to the frame's own hypothesis, not an open industry disagreement — no source in this wave defends reference-as-a-tier.
- **Tutorial contract vs EPPO's self-contained-topic principle.** Resolved via EPPO's own text: a "workflow topic" is EPPO's named exception for sequential content, and Diataxis's tutorial type functionally satisfies it once a tutorial page structurally declares its sequence (numbering, prev/next) rather than assuming silent arrival from part 1 (finding 7). Not an open conflict; both frameworks converge on the same requirement stated in different vocabulary.
- **Whether every project needs a Tutorial type.** Genuinely contingent, not resolved to a single universal answer, and the brief does not ask for one — it asks whether the rule *requires* it. Decision: no, conditioned on artifact complexity (candidate 5). Trend as of 2026-09: frameworks and languages (Astro, Rust's Book) keep investing in full tutorials while single-purpose CLIs (uv, Bun) do not, and neither side is moving toward the other — this looks like a stable split by tool shape, not a converging trend.
- **Fixed step-count quickstart budgets.** The industry does not converge on one number; "5–9" is a real, repeated pattern in *multi-system* quickstarts specifically (Twilio, Supabase — also `exemplar-sites.md` §4's independent corpus), while single-system tools cluster at exactly 1. Trending: DX literature (search-aggregated in `exemplar-sites.md` §4, not independently re-verified this wave) is moving toward "time/steps to verified result" as the named metric rather than a fixed step count, which matches what this wave's direct fetches show.
- **Hero-or-no-hero on a first-steps-adjacent landing page.** `exemplar-sites.md`'s claim that uv has "no hero" does not survive a direct 2026-09-05 fetch, which shows a benchmark chart and a performance-claim section (finding 9). This is a correction of a sibling topic's synthesis, recorded here because it surfaced from this topic's own step-1 instruction to fetch uv directly; the `landing-page-contract` topic should treat "hero" as split into adjective-driven marketing prose (rare, arguably absent) versus data-substantiated highlight sections (present on uv), not as a single banned/allowed category.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.astral.sh/uv](https://docs.astral.sh/uv/) | uv (Astral) docs home and nav | fetched 2026-09-05 | Primary evidence for tier/type nav separation, staged Guides section, and the corrected hero finding |
| [docs.astro.build/en/getting-started/](https://docs.astro.build/en/getting-started/) | Astro getting-started hub | fetched 2026-09-05 | Primary evidence for three coexisting tiers (Tutorial/Quickstart/Guides) and a 1-command terminal quickstart |
| [twilio.com/docs/messaging/quickstart](https://www.twilio.com/docs/messaging/quickstart) | Twilio SMS quickstart | fetched 2026-09-05 | Primary step count (8) for a multi-system quickstart, and its choice-not-eliminated (language tabs) pattern |
| [supabase.com/docs/guides/getting-started/quickstarts/reactjs](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) | Supabase React quickstart | fetched 2026-09-05 | Primary step count (9) plus the explicit production-scope caveat pattern |
| [diataxis.fr/tutorials/](https://diataxis.fr/tutorials/) | Diataxis tutorial page | fetched 2026-09-05 | Primary source for the tutorial's hard obligations (visible result per step, reliability, testing) |
| [diataxis.fr/tutorials-how-to/](https://diataxis.fr/tutorials-how-to/) | Diataxis tutorial-vs-how-to comparison | fetched 2026-09-05 | Primary source for the no-branching, single-path rule quoted directly |
| [thegooddocsproject.dev/template/](https://thegooddocsproject.dev/template/) | The Good Docs Project template catalogue | fetched 2026-09-05 | Primary confirmation that Quickstart and Tutorial are distinct templates with distinct stated jobs |
| [everypageispageone.com/the-book/](https://everypageispageone.com/the-book/) | Mark Baker's EPPO book page | fetched 2026-09-05 | Primary source resolving the EPPO-vs-tutorial-linearity conflict via the "workflow topic" exception |
| [docs-topic-map/exemplar-sites.md §3–4](../docs-topic-map/exemplar-sites.md) | Sibling scout's synthesis across 20 exemplar sites | dated 2026-09-05 | Independent corpus confirming the 5–9 step convergence and the tier/type axis distinction; also the source this topic's finding 9 corrects |
| [docs-audit/docs-shape.md §2](../docs-audit/docs-shape.md) | Fleet page-type classification (248 pages, 23 repos) | dated 2026-09-05 | The fleet's own tutorial count (0) and getting-started count (17), the base rate candidate 1 in AI-agent angle compares against |
| [docs-audit/ux-observability-posture.md §8](../docs-audit/ux-observability-posture.md) | Fleet time-to-first-command measurement | dated 2026-09-05 | ocx's own first-steps word counts (20, 185), the fleet's tightest measured example |
| [docs-frame.md, Corrections, item 5](../docs-frame.md) | Program frame document with wave-1 corrections | dated 2026-09-05 | States the tier-must-not-map-to-type correction this topic is required to confirm and apply |
| [docs-topic-map.md, tier-model-and-first-steps-contract brief](../docs-topic-map.md) | This topic's own research brief | dated 2026-09-05 | The commissioning document: names every source to fetch and every decision to make |
| [docs-topic-map/canonical-guides.md](../docs-topic-map/canonical-guides.md) | Sibling scout's canonical-guide survey | dated 2026-09-05 | Records The Good Docs Project's 25-template catalogue as a parts list, context for finding 3 |
| [docs-topic-map/codified-practice.md](../docs-topic-map/codified-practice.md) | Sibling scout's codified-practice survey | dated 2026-09-05 | Cross-checks that no developer-docs style guide states a universal tutorial requirement, supporting candidate 5 |
