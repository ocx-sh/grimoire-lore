---
title: Pitch surfaces and first-screen copy, page-surface scope
program: product
sub_program: marketing
topic: marketing-first-screen-copy
worker: page-surface-scope
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
scope: Which pages a marketing-copy rule may govern, how a rule tells a pitch page from a docs hub from a docs home, the cost of a scoping key in the doc_type machinery, and what a docs home owes marketing. Out of scope: built h1 count and page structure (ux), planned nav entries (ux), the content of the hero copy itself (other workers of this topic).
---

# Pitch surfaces and first-screen copy: page-surface scope

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. What docs-quality already requires](#1-what-docs-quality-already-requires)
  - [2. How the declaration is parsed, and the cost of a new key](#2-how-the-declaration-is-parsed-and-the-cost-of-a-new-key)
  - [3. Classification of the 12 landing-tagged fleet pages](#3-classification-of-the-12-landing-tagged-fleet-pages)
  - [4. Fleet docs homes: category noun in the first sentence](#4-fleet-docs-homes-category-noun-in-the-first-sentence)
  - [5. Six exemplars: pitch versus docs home](#5-six-exemplars-pitch-versus-docs-home)
  - [6. The decision](#6-the-decision)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Dated facts](#dated-facts)
- [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A marketing-copy rule must never key on `doc_type: landing`. Measured: 12 pages carry the tag, 1 is a pitch, 6 are section hubs, 5 are docs homes (section 3).
- `landing_check.py` already misfires on hubs. Run over the 12 pages it raises DOC-TYPE-10 on 5 of them, all hubs or a docs home, and DOC-TYPE-11 on 1 (section 3 command).
- The scoping key is a second declaration key, `doc_surface`, with values `pitch` and `home`. A new `doc_type` value is the wrong axis: a README is `readme` and can also be a pitch.
- The cost of the key is two regex edits (`doc_declaration.py` line 50, `strip_prose.py` line 61), one enum plus one validation block, and a re-vendor of about 12 copies in the fleet (section 2).
- The rule fires only on `doc_surface: pitch`. A page with no `doc_surface` is skipped and counted, the same posture `page_type.py` takes for a page with no `doc_type`.
- 4 of 6 exemplar docs homes repeat the pitch's category noun in their first sentence (uv, Bun, Deno, Vite). 2 of 6 do not (mise, Astro). Practice splits, so the owed sentence is a SHOULD, not a MUST.
- A docs home owes marketing one thing: the product's canonical one-sentence description, in the slot DOC-TYPE-10 already limits to one sentence. No new slot is needed.
- Fleet docs homes with that sentence carrying the category noun: 3 of 9 name "package manager" or "index" the way the pitch does (section 4).
- The category noun drifts inside the fleet already. ocx says "package manager" in the title and README and "binary distribution platform" in the meta description. Grimoire says "package manager" in meta and README and "lockfile" in the hero (messaging-inventory.md smell 1).
- When a product has no pitch page, the docs home is the pitch surface by default. 8 of the 10 fleet docs sites are in that state (site-shape.md smell 1).
- Do not make this a marketing row that restates DOC-TYPE-10 or DOC-TYPE-13. File a change request against docs-quality: the lead-in check must stop firing on hubs, and DOC-TYPE-10 gains a canonical-sentence clause.
- NN/g states the homepage must convey what the organization does and that visitors do not know the brand (15 Mar 2024). That is the independent basis for the home-sentence rule.
- uv has no separate pitch page. `https://astral.sh/uv` returns 301 to the GitHub repository, and the repo About text equals the docs home's first sentence word for word.

## Findings

### 1. What docs-quality already requires

Source files read in full: `rules/docs-quality.md`, `skills/docs-quality-reference/page-types.md` (landing and README rows).

For a page declared `doc_type: landing` ([page-types.md rows 128-133](../../../skills/docs-quality-reference/page-types.md)):

| ID | Requires | Check | Severity |
|---|---|---|---|
| DOC-TYPE-10 | Lead-in positioning prose of one sentence, never two stacked. Warn over 30 words. | `landing_check.py`, sentence terminators before the first heading or fence | SHOULD |
| DOC-TYPE-11 | A runnable command or link menu before word 150. | `landing_check.py` | MUST |
| DOC-TYPE-12 | At most 2 button-style calls to action. | `landing_check.py` | SHOULD |
| DOC-TYPE-13 | Say who the docs are for: task-phrased link labels or one sentence naming the reader. | reading heuristic, true-zero case only | SHOULD |
| DOC-TYPE-14 | No placeholder text. Runs on every type. | `landing_check.py` | MUST |
| DOC-TYPE-15 | No adoption or trust claim without a link to its source. Runs on every type. | `landing_check.py` | MUST |

For a README (DOC-TYPE-32..36): plain-language description before any non-descriptive content (MUST, 32); one action from zero to using (SHOULD, 33); link the docs site (SHOULD, 34); state a license (SHOULD, 35); state who it is for, separately from what it does (CONSIDER, 36, no rate measured).

What none of these rows requires, and so what marketing could add on a pitch surface: that the one sentence carries the category noun, that it is the same sentence the title, meta description and README carry, that it states a benefit or differentiator, and that the primary action label is specific. DOC-TYPE-10 limits the length of the sentence and never says what it must say. The audit confirms this is the gap: the two fleet docs homes the audit read open with plain descriptions and "none states a differentiator" ([site-shape.md section 5.3](../product-audit/site-shape.md)).

Where the rule is silent on pitch versus hub: the rule's own text calls the tag `landing` for "hero shape, placeholders, claims" in the gate list, so the checker was written as a pitch check but the enum value is applied to hubs.

### 2. How the declaration is parsed, and the cost of a new key

Files read in full: `checks/doc_declaration.py`, `checks/landing_check.py`; grepped: `strip_prose.py`, `page_type.py`.

- `doc_declaration.py` holds the enum as a tuple, `DOC_TYPES` (9 values), `DOC_TIERS` (3), `TIER_REQUIRED = ("tutorial", "how-to", "landing")`. The comment regex is `DECL_RE = ^\s*(<!--|\{/\*|\.\.|%|//)\s*(doc_type|doc_tier)\s*:\s*([A-Za-z][\w-]*)`. `read_declaration()` scans the first 12 lines after front matter and keeps the first hit per key.
- `strip_prose.py` line 61 holds a second, independent regex: `DECL = ^\s*(?:<!--|\{/\*|\.\.|%)\s*doc_(type|tier)\s*:\s*([\w-]+)`. It reads `doc_type` and `doc_tier` into a dict keyed `"doc_" + group(1)`. Every other check uses this one. Drift found: it lacks the `//` AsciiDoc opener that `doc_declaration.py` accepts, so an AsciiDoc declaration passes the declaration check and is invisible to `landing_check.py`.
- `landing_check.py` gates on `sp.declaration(text).get("doc_type") != "landing"` and returns after DOC-TYPE-14 and 15. DOC-TYPE-10..13 therefore run on the tag alone.
- `page_type.py` skips a page with no `doc_type` and prints the skip count (line 395). `page_type.py` has 11 branches on `doc_type` values. A new `doc_type` value would need a branch or an explicit "no contract" decision there.

Cost of each option, counted from the files:

| Option | Edits | Verdict |
|---|---|---|
| New `doc_type` value, for example `pitch` | `DOC_TYPES` tuple, `TIER_REQUIRED`, enum prose in the rule and in `page_type.py` branches, README rows DOC-TYPE-32..36 are keyed `readme` and cannot also be `pitch`. | Rejected. A README is a pitch surface for registries and package pages, so type and surface are two axes. One value cannot carry both. |
| Second key `doc_surface` | Extend `DECL_RE` alternation, extend `strip_prose.DECL` to `doc_(type\|tier\|surface)`, add `DOC_SURFACES = ("pitch", "home")` and one validation block (about 12 lines) in `doc_declaration.py`, one pinned-decision row in the rule. `sp.declaration()` needs no change because it already builds the dict key from the group. | Chosen. |
| Path list in config | A config file with globs. | Rejected. DOC-TYPE-02 states "read a page's type from its declaration comment, never from its directory or file name". A path list reintroduces the error DOC-TYPE-02 removed, and pitch pages are `.astro` components and data modules whose paths do not look like docs paths (`ocx-sh/website/site/src/components/Landing.astro`, `grimoire-rs/grimoire/docs/src/pages/index.astro`). |

Fleet propagation: 12 vendored copies of `landing_check.py` exist under `.claude/` and `.opencode/` in the fleet repos (command in section 3). Each needs the same two-regex update through the normal grim re-vendor, not by hand.

Open placement fact, unverified: the pitch pages in the fleet are an `.mdx` file that mounts `<Landing />` (`ocx-sh/website/site/src/content/docs/index.mdx`, which declares `landing` in line 14 inside a `{/* */}` opener) and an `.astro` page with no declaration at all (`grimoire-rs/grimoire/docs/src/pages/index.astro` has 0 `doc_type` matches, command in section 3). Whether an HTML comment placed in an `.astro` template survives to the built HTML was not tested. A declaration in an `.astro` file belongs in the frontmatter fence as a `//` comment, which `doc_declaration.py` accepts but `strip_prose.py` does not (the drift above). That has to be settled before the key is required on `.astro` pages.

### 3. Classification of the 12 landing-tagged fleet pages

Rubric, written before reading any page. A page is scored on four tests. P1: it is the entry for a reader who has not decided to use the product (the root path of a site, or a page a search result or share link lands on). P2: its first block tells a stranger what the product is, in category terms, without assuming the product's vocabulary. P3: its first screen offers one primary action toward trying or installing. P4: persuasion content is present (differentiator, proof, or a problem statement). Classes: **pitch** = P1 and P2 and P3 and P4. **docs home** = P1 within the docs section (the docs entry) and P2 or P3 present, P4 absent or thin. **section hub** = not an entry; the body is mostly a link list to sibling pages; none of P2..P4 is the page's job. **snippet** = the first block is a code fence with no preceding category sentence. A page is assigned the class with the most tests passed; ties go to the less promotional class.

Measurement commands, run from `/home/mherwig/dev`:

```bash
grep -rlE 'doc_type: landing' ocx-sh grimoire-rs --exclude-dir=node_modules --exclude-dir=dist \
  --exclude-dir=.git --exclude-dir=.astro --exclude-dir=target --exclude-dir=worktrees \
  --exclude-dir=.agents --exclude-dir=.claude --exclude-dir=.opencode --exclude-dir=grimoire-lore | wc -l
# prints 12
python3 -I <worktree>/skills/docs-quality-reference/checks/landing_check.py <the 12 paths>
# prints 6 findings on 5 pages; exit status of the pipe was shown as 0 because of the cut
```

The audit counts 11 across 6 sites; this count is 12 because `ocx-sh/rules_ocx/docs/index.md` is included. Per-site split: catalog 5, ocx/website 3, website/site 1, devcontainer-features 1, rules_ocx 1, grimoire 1.

| # | Path (under `/home/mherwig/dev`) | Words | First block | P1 | P2 | P3 | P4 | Class | `landing_check.py` result |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ocx-sh/website/site/src/content/docs/index.mdx` (mounts `components/Landing.astro`) | 69 in mdx | `<Landing />`, hero h1 "Same tools. Every machine." | yes | partly (category noun is in the tag and meta, not in the h1) | yes (InstallBar) | yes (drift table) | **pitch** | not flagged |
| 2 | `grimoire-rs/grimoire/docs/src/content/docs/introduction.md` | 281 | "Grimoire is a package manager for AI-agent config: ..." | yes (docs entry) | yes | yes (`grim add` fence) | thin ("Why it exists") | docs home with pitch content | not flagged |
| 3 | `ocx-sh/ocx/website/src/content/docs/index.mdx` | 234 | "OCX fetches pre-built tools from any OCI registry and runs them in a clean, reproducible environment." | yes (docs entry) | partly (no category noun) | yes (InstallCommand) | no | docs home | not flagged |
| 4 | `ocx-sh/catalog/docs/src/content/docs/index.mdx` | 438 | "`@ocx-sh/catalog` renders one or more **OCX package indices** into a browsable static site ..." | yes (docs entry) | yes | no (first link menu at word 374) | no (caution box) | docs home | DOC-TYPE-10 (10 sentences, a false hit: it counts the caution box), DOC-TYPE-11 (word 374 over 150) |
| 5 | `ocx-sh/devcontainer-features/site/src/content/docs/index.md` | 391 | "The ocx Dev Container Feature installs the `ocx` command-line tool in a dev container and restores ..." | yes | yes | yes (config fence) | no | docs home, snippet-first, no pitch page exists | not flagged |
| 6 | `ocx-sh/rules_ocx/docs/index.md` | 224 | "Bazel module extension that provisions pinned CLI tools ... through the OCX package manager." | yes | yes | yes (MODULE.bazel fence) | no | docs home, snippet-first | not flagged |
| 7 | `ocx-sh/ocx/website/src/content/docs/publishing/index.mdx` | 1062 | "Build an archive, attach metadata ... push both to any OCI registry." | no | no | no | no | section hub | not flagged |
| 8 | `ocx-sh/ocx/website/src/content/docs/integration/index.md` | 302 | "Pick the system you want to connect to OCX ..." | no | no | no | no | section hub | not flagged |
| 9 | `ocx-sh/catalog/docs/src/content/docs/how-to/index.md` | 127 | "Task-shaped guides. ..." then 7 links | no | no | no | no | section hub | DOC-TYPE-10 (12 sentences, false hit: counts the list items) |
| 10 | `ocx-sh/catalog/docs/src/content/docs/ops/index.md` | 71 | "What to know before and after you deploy." then 3 links | no | no | no | no | section hub | DOC-TYPE-10 (4 sentences, false hit) |
| 11 | `ocx-sh/catalog/docs/src/content/docs/explanation/index.md` | 102 | "Background for decisions that look arbitrary until you know why." then 4 links | no | no | no | no | section hub | DOC-TYPE-10 (6 sentences, false hit) |
| 12 | `ocx-sh/catalog/docs/src/content/docs/reference/index.md` | 98 | "Exact surfaces, transcribed from the implementation." then 4 links | no | no | no | no | section hub | DOC-TYPE-10 (8 sentences, false hit) |

Totals: pitch 1, docs home 5, section hub 6, snippet-only 0 (two docs homes, rows 5 and 6, are snippet-first but each opens with a category sentence, so the "snippet" class stays empty under the rubric).

Result against the audit's claim: exemplar-landing-pages.md smell 9 predicted the tag fires on task routers. It does: `landing_check.py` raised 6 findings on 5 pages, and every one of the 5 pages is a hub or a docs home. The only true pitch (row 1) produces 0 findings because its words live in `Landing.astro`, which the markdown scan cannot see. The check is blind to the one page it was written for and noisy on the five hub pages. The two audit-named true pitches are ocx.sh and grimoire.rs; the grimoire.rs pitch (`grimoire-rs/grimoire/docs/src/pages/index.astro`) carries no declaration (`grep -n doc_type grimoire-rs/grimoire/docs/src/pages/index.astro ocx-sh/website/site/src/components/Landing.astro` printed nothing), so one of the two pitches is not tagged at all.

Where the audit and this measurement disagree: site-shape.md section 6 says "only 2 are true landings (5.1, 5.2)" among the 11 tagged pages. Only 1 of the 12 tagged pages is a pitch. The second true landing (grimoire.rs) is not tagged. The audit statement is corrected here; the audit wins on counts everywhere else.

### 4. Fleet docs homes: category noun in the first sentence

Command per home: strip front matter, comments, imports and fences, take the first prose block, cut at the first sentence terminator (`python3 -I` snippet over each path), then `grep -oiE "package manager|lockfile|binary distribution|package index|index"` over the first 40 non-import lines. First sentence verbatim from the files, with the pitch's category noun beside it:

| Docs home (first sentence) | Words | Pitch category noun | Docs home carries it? |
|---|---|---|---|
| `ocx/website` index.mdx: "OCX fetches pre-built tools from any OCI registry and runs them in a clean, reproducible environment." | 16 | "package manager" (title, README), "binary distribution platform" (meta) | No. 0 matches in the first 40 lines. |
| `catalog` index.mdx: "`@ocx-sh/catalog` renders one or more OCX package indices into a browsable static site: ..." | 28 | none (no pitch page) | Names "package indices", a component noun, not a product category. |
| `devcontainer-features` index.md: "The ocx Dev Container Feature installs the `ocx` command-line tool in a dev container and ..." | 23 | none | "Dev Container Feature": yes, it is its own category noun. |
| `rules_ocx` index.md: "Bazel module extension that provisions pinned CLI tools ... through the OCX package manager." | 21 | none | "Bazel module extension": yes. Also names "package manager" for ocx. |
| `grimoire` introduction.md: "Grimoire is a package manager for AI-agent config: the skills, rules, agents, and MCP servers you install into every coding agent you use." | 29 | "package manager" (meta, README), "A lockfile for your AI-agent config" (hero h1) | Yes, matches meta and README, not the hero. |
| `www-setup` index.mdx: "Install `ocx` on Linux, macOS or Windows with one command in the shell you already use." | 16 | "package manager" | No category noun. It is task-phrased. |
| `ocx-mirror` index.md: "Upstream projects publish their releases as loose archives on GitHub Releases or ad-hoc download pages." | 15 | none | No. Opens on a problem. |
| `indexbot` index.md: "The write path for an OCX package index." | 9 | none | Component noun "write path". |
| `indexer` index.md: "`@grimoire-rs/indexer` runs your own Grimoire package index: a static site listing the skills, rules, ..." | 19 | none | Component noun "package index". |

Count: 9 docs homes. First sentence states what the thing is in some noun: 7 of 9 (catalog, devcontainer, rules_ocx, grimoire, indexbot, indexer, plus www-setup is task-phrased and counts as no). Carries the same category noun as a pitch in the same product family: 1 of 2 products that have both (Grimoire yes; OCX no). Sentence lengths 9 to 29 words, median 19.

The consequence the audit already found: for OCX, the meta description says "binary distribution platform", the title says "package manager", the hero says "Same tools. Every machine.", and the docs home says "fetches pre-built tools ... and runs them" (messaging-inventory.md section 2 and smell 1). Four surfaces, four category phrases.

### 5. Six exemplars: pitch versus docs home

Fetched 2026-11-27. Each row quotes the page text the fetch returned. Fetch summaries are produced by a model reading the page, so quotes are indicative; the first-sentence wording was returned in quotation marks by the fetch.

| Product | Pitch page: category noun and tagline | Docs home: first sentence | Repeats the category noun? |
|---|---|---|---|
| uv | None separate. [astral.sh/uv](https://astral.sh/uv) answers 301 to the [GitHub repo](https://github.com/astral-sh/uv), whose README tagline and About text read "An extremely fast Python package and project manager, written in Rust." | [docs.astral.sh/uv](https://docs.astral.sh/uv/): "An extremely fast Python package and project manager, written in Rust." | Yes, identical string. Pitch and docs home are one sentence on one canonical text. |
| Bun | [bun.sh](https://bun.sh/): h1 "Bun is a fast JavaScript runtime & toolkit. All in one." Sub: "Runtime, package manager, test runner, bundler, type checker and formatter in a single binary." Two CTAs plus install commands. | [bun.sh/docs](https://bun.sh/docs): h1 "Welcome to Bun", first sentence "Bun is an all-in-one toolkit for developing modern JavaScript/TypeScript applications." | Partly. "toolkit" repeats. "runtime" does not. |
| Deno | [deno.com](https://deno.com/): h1 "Better, faster JavaScript". Sub: "Deno is a fast, open-source, fully Node-compatible JS runtime with TypeScript and everything else you need baked right in." | [docs.deno.com](https://docs.deno.com/): h1 "Get started with Deno", first sentence "Deno ... is an open source JavaScript, TypeScript, and WebAssembly runtime with secure defaults and a great developer experience." | Yes, "runtime". The adjectives differ ("fast, Node-compatible" against "secure defaults"). |
| Vite | [vite.dev](https://vite.dev/): h1 "The Build Tool for the Web". Sub: "Vite is a blazing fast frontend build tool powering the next generation of web applications." | [vite.dev/guide](https://vite.dev/guide/): h1 "Getting Started", first sentence "Vite (French word for "quick", pronounced /viːt/, like "veet") is a build tool that aims to provide a faster and leaner development experience for modern web projects." | Yes, "build tool". |
| mise | [mise.jdx.dev](https://mise.jdx.dev/): h1 "mise-en-place". Sub: "Dev tools, env vars, and tasks in one CLI". CTAs: "Get started", "Watch the demo". | [getting-started](https://mise.jdx.dev/getting-started.html): "Install mise, then give a project its own Node.js version, an environment variable and a task." | No. The docs page is task-phrased. The pitch and the docs are on the same site, so the docs entry is the second page a visitor sees. |
| Astro | [astro.build](https://astro.build/): h1 "The web framework for content-driven websites". Sub: "Astro powers the world's fastest marketing sites, blogs, e-commerce websites, and more." CTAs: "Get Started" and the command `npm create astro@latest`. | [docs.astro.build](https://docs.astro.build/en/getting-started/): h1 "Astro Docs", first sentence "Guides, resources, and API references to help you build with Astro." | No. Hub-style routing sentence. |

Result: 4 of 6 docs homes repeat the pitch's category noun (uv, Bun, Deno, Vite). 2 of 6 route instead (mise, Astro). 6 of 6 pitches state a category noun or a CLI/framework noun in the h1 or sub. In 5 of 6 the docs home's h1 is a generic label ("Welcome to Bun", "Get started with Deno", "Getting Started", "Astro Docs", "Getting started"), so the category noun sits in the first sentence, not the h1. That is the shape DOC-TYPE-10 already measures (a one-sentence lead-in). It supports putting the owed sentence in that slot.

Independent support for why the home owes the sentence: NN/g states the homepage must quickly and clearly convey "what your organization does and what users can accomplish on your site" and warns "Do not assume visitors to your site know your brand" ([NN/g, 15 Mar 2024](https://www.nngroup.com/articles/homepage-design-principles/)). The same article says content above the fold "serves as a gatekeeper". NN/g's eyetracking study found users spent about 57 percent of page-viewing time above the fold on 1920x1080 screens, against 80 percent in a 2010 study on smaller screens ([NN/g, 15 Apr 2018](https://www.nngroup.com/articles/scrolling-and-attention/), 120 participants, 130,000 fixations). Vendor-neutral, independent research, not a measure of developer-tool sites.

Google's own guidance places site-level descriptions on the home page and wants unique descriptions per page, and says the home page `<title>` can carry extra information about the site and should not be the vague label "Home" ([Google Search Central: snippets](https://developers.google.com/search/docs/appearance/snippet), [title links](https://developers.google.com/search/docs/appearance/title-link), no update date shown in either fetch). So the canonical sentence has a second home as the home page's meta description, which the fleet covers on 160 of 273 pages (59 percent) (messaging-inventory.md section 5, `grep` counts of `description:` per site).

Diataxis ([diataxis.fr](https://diataxis.fr/), [how to use](https://diataxis.fr/how-to-use-diataxis/)) was fetched for a statement on home or landing pages and says nothing about them in the fetched text. A `complex-hierarchies` page returned HTTP 404. So no source in this artifact backs a claim of the form "Diataxis says a docs home is X"; the split between hub and pitch is this artifact's own rubric, measured on the fleet.

### 6. The decision

1. **Scoping key: a second declaration key, `doc_surface`, values `pitch` and `home`.** Never `doc_type: landing` alone. The marketing-copy rows fire only on `doc_surface: pitch`. The `home` value marks a docs entry page that owes the canonical sentence (below) and nothing more. A page with no `doc_surface` is skipped and counted.
2. **What the docs home owes marketing.** One canonical product sentence in the slot DOC-TYPE-10 already reserves, the same text as the repo About field, the README's first line and the site meta description, with the category noun in it. It states what the product is and, in the same sentence or the next one, for whom. Verified by string equality against the README and meta description where the product is the subject of the site, and by a reading heuristic where it is a component.
3. **What stays with docs-quality.** Sentence length, command-before-word-150, button cap, placeholder text, unsourced adoption claims, and the hub contract (task-phrased link labels). Marketing adds no row that restates any of them.
4. **Change request, not a marketing row.** Two named changes against `docs-quality`: (a) CR-1: `landing_check.py` must not run DOC-TYPE-10 on a page with 3 or more list items in its lead-in block, and the lead-in must end at the first list or the first admonition. This removes the 5 false positives measured above (4 hubs and the caution box on the catalog index). (b) CR-2: DOC-TYPE-13 and DOC-TYPE-10 gain a `doc_surface: home` clause so the canonical sentence has an owner. Reason for a change request over a marketing row: the checker and the enum belong to docs-quality, the failing behaviour is in that checker, and two rule families that each half-own the first sentence will disagree the first time one edits it alone.

## Normative guidance candidates

IDs are working labels for the topic consolidator.

| # | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PS-01 | Never scope a marketing-copy rule to `doc_type: landing`. Scope it to `doc_surface: pitch`. | The tag marks hubs and docs homes. Measured: 1 of 12 tagged pages is a pitch. | `grep -rlE 'doc_type: landing' <site> \| xargs grep -L 'doc_surface: pitch'` lists every tagged page the rule will skip. A rule definition that names `landing` as its scope fails review. | MUST |
| PS-02 | Declare a pitch page with a comment `doc_surface: pitch` inside the first 12 lines, in the same opener family as `doc_type`. | A declaration read from content, not from a directory, is the DOC-TYPE-02 contract. | `python3 checks/doc_declaration.py --root .` after CR-3 (the extension below) rejects a `doc_surface` value outside `pitch`, `home`. | MUST |
| PS-03 | Treat the home page of a site, the root README and a registry package page as pitch surfaces only when the product has no separate page that does the job. A product with no pitch page declares its docs entry `doc_surface: home`. | 8 of 10 fleet docs sites have no pitch page, so the docs home is the first page a stranger sees. | List `doc_surface: pitch` and `doc_surface: home` pages per product. Fail when a product has neither. | SHOULD |
| PS-04 | Open a `doc_surface: pitch` or `home` page with one sentence that names the product's category noun and what it does. | NN/g: the homepage must say what the organization does and cannot assume the brand is known. 6 of 6 exemplar pitches carry a category noun in the h1 or sub. | Reading heuristic. Pass: "An extremely fast Python package and project manager, written in Rust." Fail: "Same tools. Every machine." as the only product statement on the page. `unverified: reading heuristic`. | SHOULD |
| PS-05 | Use one canonical product sentence, and repeat it verbatim as the repo About field, the README first line, and the site meta description. | The fleet has 4 category phrases for OCX across 4 surfaces. uv uses one string on both the repo and the docs home. | Extract the three strings and compare: `grep -m1 -A1 '^# ' README.md`, `gh repo view --json description -q .description`, `grep -m1 '^description:' <home>`. Equal after trim. | SHOULD |
| PS-06 | Keep the category noun of the canonical sentence in every other first-screen surface of the product, or state a tagline and the category noun together. | A hero line that drops the noun leaves the category with the meta description alone. Bun's h1 and sub name 2 nouns plus the list of tools. | Grep each surface's first 60 words for the canonical noun. The tagline-plus-noun form passes. | CONSIDER |
| PS-07 | Never run a lead-in sentence count on a page whose first block is a list or an admonition. | `landing_check.py` counts list items and admonition text as sentences, which raised 5 false DOC-TYPE-10 findings. | Run `landing_check.py` over `doc_surface: pitch` and `doc_surface: home` pages only after CR-1. Before CR-1, ignore DOC-TYPE-10 on a page with a list in its lead-in. | MUST |
| PS-08 | Give a section hub no marketing copy and no category sentence. Keep its first line a task or scope statement. | Hubs are task routers (DOC-TYPE-13). Persuasion on a hub is noise. | A hub (no `doc_surface`) has no reader-facing adjective from the docs-quality marketing wordlist in its first line. `grep -iE 'fast|simple|powerful|blazing' <hub>` returns nothing. | SHOULD |
| PS-09 | Declare the repository README of a product that has no site `doc_surface: pitch` and apply PS-04 to it. | uv's repo README is the pitch because the pitch URL redirects to it. | `curl -sI <product-url>` shows a 301 to the repo, or no site exists: the README is the pitch. | SHOULD |
| PS-10 | Do not add a new `doc_type` value for a pitch. | `readme` and `landing` can both be pitches. The axis is surface, not type. | `git diff` of `DOC_TYPES` in `doc_declaration.py` adds nothing. | MUST |
| PS-11 | Extend both declaration regexes together: `doc_declaration.DECL_RE` and `strip_prose.DECL`. Add the `//` opener to `strip_prose.DECL` in the same change. | They are independent copies and have already drifted on `//`. | `grep -n "doc_(type" checks/*.py` returns the same alternation in both files. `python3 checks/doc_declaration.py --self-test` with a `//` fixture passes in `landing_check.py` too. | MUST |
| PS-12 | When an agent is asked to "write the home page" and the product has no `doc_surface: pitch` page, ask whether the docs home is the pitch before writing hero copy. | Agents default to a multi-paragraph hero (DOC-TYPE-10's rationale) and the fleet has 8 counterexamples. | The task's diff touches a `doc_surface: pitch` or `home` page, or the response records the question. | SHOULD |

Requested change requests (not rules):

- CR-1 (docs-quality, `landing_check.py`): end the lead-in block at the first list item or admonition marker. Measured effect: 5 false findings removed.
- CR-2 (docs-quality, DOC-TYPE-10 and DOC-TYPE-13): add the `doc_surface: home` clause that the one sentence is the canonical product sentence.
- CR-3 (docs-quality, `doc_declaration.py` and `strip_prose.py`): add the `doc_surface` key as described in section 2.

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| Homepage should convey what the organization does and what users can accomplish. "Do not assume visitors to your site know your brand." Content above the fold "serves as a gatekeeper". | [NN/g, Homepage Design: 5 Fundamental Principles](https://www.nngroup.com/articles/homepage-design-principles/) | 15 Mar 2024 | Independent research body |
| Users spent about 57 percent of page-viewing time above the fold (2018 study, 120 participants, over 130,000 fixations, 1920x1080), against 80 percent in 2010 on smaller screens. | [NN/g, Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) | 15 Apr 2018 | Independent research body |
| Google "sometimes uses" the meta description when it describes the page better than page text. No length limit, truncated "as needed". Site-level descriptions suit the home page, per-page descriptions elsewhere. | [Google Search Central, snippets](https://developers.google.com/search/docs/appearance/snippet) | No date in the fetched text | The platform itself |
| The home page `<title>` may carry extra site information and should be descriptive and concise, and not the vague label "Home". | [Google Search Central, title links](https://developers.google.com/search/docs/appearance/title-link) | No date in the fetched text | The platform itself |
| `og:title`, `og:type`, `og:image`, `og:url` are the four required Open Graph properties. `og:type: website` takes "No additional properties" and any non-marked page "should be treated as" website. `og:description` is one to two sentences. | [ogp.me](https://ogp.me/) | No date in the fetched text | The protocol's own site |
| astral.sh/uv redirects 301 to github.com/astral-sh/uv. The repo About and README tagline are the same string as the docs home's first sentence. | fetch of [astral.sh/uv](https://astral.sh/uv) and [GitHub](https://github.com/astral-sh/uv) | fetched 2026-11-27 | The product itself |
| Bun, Deno, Vite, mise and Astro pitch pages and docs homes as quoted in section 5. | the six docs and pitch URLs in Sources | fetched 2026-11-27 | The products themselves |
| 12 pages across 6 sites carry `doc_type: landing`. 1 is a pitch. | Local command in section 3 | measured 2026-11-27 | Measurement |
| Description coverage 160 of 273 pages (59 percent) across 10 fleet docs sites. | [messaging-inventory.md section 5](../product-audit/messaging-inventory.md) | 2026-11-27 | Local audit |
| Page-viewing figures from NN/g are an old study (2018). The fold share changed from 80 to 57 percent in 8 years, so no fixed fold share should be written into a rule. | NN/g scrolling article above | 15 Apr 2018 | Independent research body |

No vendor data is used as evidence in this artifact.

## What an agent must not decide alone

- The product's category noun and the canonical one-sentence description. It is a positioning decision, and the fleet shows three live variants for OCX (package manager, binary distribution platform, "same tools, every machine"). Ask the owner which one wins before editing the title, README, meta description and docs home.
- Whether a product with no pitch page should get one. That is a business and brand decision. The agent applies PS-12 and asks.
- Whether a docs home may carry a differentiator or proof. Adoption and trust claims need the owner's evidence and a link (DOC-TYPE-15).
- Which page is the pitch when two exist (ocx.sh `/` and the docs home). The agent reports both and asks.
- Adding the `doc_surface` key to a repo's declarations in bulk. It changes the gate for every open pull request, so it follows the docs-instrument rollout rule (changed files first), and the owner approves the enum.

## AI-agent angle

| Typical agent error | Smallest mechanical check |
|---|---|
| Keys a "landing page" rule to `doc_type: landing` and rewrites hub pages into hero copy. | PS-01: grep the rule's scope text for the string `doc_type: landing`. |
| Writes a multi-paragraph hero for a docs home, because "home page" means marketing page. | `landing_check.py` DOC-TYPE-10 on the page, after CR-1 removes the false hits. |
| Adds a differentiator ("blazing fast") to a section hub to "improve" it. | PS-08 grep over hub first lines. |
| Writes a fresh tagline for each surface, producing the four phrases the fleet has for OCX. | PS-05: compare the three canonical strings. |
| Treats a docs home as a pitch and a hub as a docs home, because every page carries `landing`. | PS-02: require `doc_surface` and report the pages that lack it. |
| Edits only one of the two declaration regexes, so one check sees the key and the other does not. | PS-11: grep both files for the same alternation. |
| Hands over an `.astro` pitch page with no declaration, so no check reads it. | `grep -L doc_surface` over pitch candidates, including `.astro` pages (grimoire.rs `index.astro` is the live example). |

## Contested / evolving

- **Is the docs home a pitch surface?** For: uv's pitch is the GitHub README and docs home on one string, and 8 of 10 fleet sites have only a docs home. Against: Astro, mise and Vite keep a separate pitch and let the docs home route. The artifact takes a middle position (`home` owes one sentence, not a hero) because neither side measured conversion. NN/g's homepage article speaks for the first side only for the site's home page; it does not discuss a docs section.
- **Does proof belong on the first screen?** 2 of 4 exemplars the audit fetched (uv, mise) have no proof section, 2 (Vite, Bun) do (site-shape.md section 8). No source fetched here states a rule. Left to other workers of this topic.
- **How much does the fold matter?** NN/g's 2018 study puts 57 percent of viewing time above the fold, down from 80 percent in 2010. It argues for a clear first screen, and it also says people scroll. Both are one research body; no second independent study was fetched.
- **Whether a declaration comment survives in an `.astro` template.** Not tested. Section 2 names it as open.
- **Diataxis on landing pages.** The method's own pages fetched say nothing; a tool built on it cannot cite it for the hub-versus-pitch split. Trend: unknown.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/homepage-design-principles/ | NN/g homepage principles | 15 Mar 2024 | Independent basis for what the first screen must say |
| https://www.nngroup.com/articles/scrolling-and-attention/ | NN/g eyetracking study | 15 Apr 2018 | Fold share, with design and sample size |
| https://developers.google.com/search/docs/appearance/snippet | Google Search Central, snippets | no date in fetch | Platform statement on meta description use and uniqueness |
| https://developers.google.com/search/docs/appearance/title-link | Google Search Central, title links | no date in fetch | Platform statement on the home page title |
| https://ogp.me/ | Open Graph protocol | no date in fetch | Required properties, `website` versus `article` |
| https://astral.sh/uv | uv pitch URL, redirects | fetched 2026-11-27 | Shows a product with no separate pitch page |
| https://github.com/astral-sh/uv | uv repo README and About | fetched 2026-11-27 | The pitch text, equal to the docs home sentence |
| https://docs.astral.sh/uv/ | uv docs home | fetched 2026-11-27 | First sentence repeats the pitch string |
| https://bun.sh/ | Bun pitch | fetched 2026-11-27 | Category nouns plus install in hero |
| https://bun.sh/docs | Bun docs home | fetched 2026-11-27 | First sentence repeats "toolkit" |
| https://deno.com/ | Deno pitch | fetched 2026-11-27 | "runtime" noun in the sub |
| https://docs.deno.com/ | Deno docs home | fetched 2026-11-27 | Repeats "runtime" with different adjectives |
| https://vite.dev/ | Vite pitch | fetched 2026-11-27 | "build tool" in h1 and sub |
| https://vite.dev/guide/ | Vite docs home | fetched 2026-11-27 | Repeats "build tool" |
| https://astro.build/ | Astro pitch | fetched 2026-11-27 | "web framework" in the h1 |
| https://docs.astro.build/en/getting-started/ | Astro docs home | fetched 2026-11-27 | Routing sentence, no category noun |
| https://mise.jdx.dev/ | mise pitch | fetched 2026-11-27 | "CLI" noun in the sub |
| https://mise.jdx.dev/getting-started.html | mise getting started | fetched 2026-11-27 | Task-phrased first sentence |
| https://diataxis.fr/ and https://diataxis.fr/how-to-use-diataxis/ | Diataxis framework pages | fetched 2026-11-27 | Checked, silent on home pages. `/complex-hierarchies/` returned 404. |
| Local: `rules/docs-quality.md`, `skills/docs-quality-reference/page-types.md`, `checks/doc_declaration.py`, `checks/landing_check.py`, `checks/strip_prose.py`, `checks/page_type.py` | The rule set under study | worktree, 2026-11-27 | Primary for the cost and behaviour findings |
| Local: `.agents/research/product-audit/site-shape.md`, `exemplar-landing-pages.md`, `messaging-inventory.md` | Fleet grounding audits | 2026-11-27 | Starting claims, re-measured |

Primary sources (platform, protocol, product or the rule set itself): Google snippets, Google title links, ogp.me, uv, Bun, Deno, Vite, Astro, mise, the local rule set. Count 10 primary of 19 distinct external URLs plus the local files. Scout artifacts in `marketing-topic-map/` were not opened beyond a grep for first-screen rows; the brief's named audit files carried the starting claims.
