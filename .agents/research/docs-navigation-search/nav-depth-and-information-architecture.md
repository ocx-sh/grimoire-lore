---
title: Nav depth and information architecture
topic: nav-depth-and-information-architecture
group: docs-navigation-search
agent: research-subagent
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 13
scope: |
  Covers: how deep a docs sidebar/TOC may nest before findability drops, what
  each of the fleet's three generators (MkDocs Material, VitePress, mdBook)
  actually lets a rule check from a repo checkout (nav config depth, heading
  depth, page length, anchor stability), and the breadcrumb/flat-nav
  consequences of that depth. Does not cover: search UX, zero-result
  handling, or empty states (owned by `search-contract-and-zero-result-loop`
  in the same group); page-type declaration or the reference-page section
  contract (owned by `docs-page-types`); accessibility of nav components
  beyond what the depth/anchor checks touch.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- NN/g's progressive-disclosure ceiling is 2 levels, tested across 46 web applications; past that, users get lost moving between levels ([NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)).
- Docusaurus's own sidebar docs demonstrate 4 levels deep with no stated maximum, and VitePress mechanically permits nesting to 6 levels before silently dropping anything deeper ([Docusaurus Sidebar](https://docusaurus.io/docs/sidebar), [VitePress Sidebar](https://vitepress.dev/reference/default-theme-sidebar)).
- The two claims are not actually about the same thing: NN/g's ceiling is about levels a reader must hold open and expanded at once, and both Docusaurus's and VitePress's deep examples rely on collapsed-by-default groups — collapse is the mechanism that reconciles the conflict, not a workaround to it.
- The fleet's own real nav depth tops out at 3 (`ocx`, `ocx-sdk-python`); no site in the fleet actually reaches 4, so the "generators demonstrate 4+" side of the conflict is a tooling capability the fleet has never exercised (`ux-observability-posture.md` §1).
- `grimoire`'s 20-item flat mdBook sidebar (zero grouping, depth 1) is not evidence for shallow nav — it is the fleet's only nav failure, and it produces the exact same defect as an unclassifiable-page problem measured independently: 18 of 23 grimoire pages file as "other" under a path-based type classifier, against 0-3 "other" for Diataxis-shaped MkDocs trees (`docs-shape.md` §2).
- mdBook has a native, zero-depth-cost fix for a flat list: a level-1 `# Part Title` header renders as an unclickable divider between chapter groups without adding nesting ([mdBook SUMMARY.md format](https://rust-lang.github.io/mdbook/format/summary.html)) — grimoire's `SUMMARY.md` uses none.
- Breadcrumbs are recommended once a hierarchy passes 1-2 levels, placed just below global nav, using a real ancestor-chain separator, never replacing primary nav ([NN/g Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/)).
- Material for MkDocs ships breadcrumbs as a one-line config flag, `navigation.path`, since v9.7.0 ([Material for MkDocs navigation setup](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/)) — every one of the fleet's 7 MkDocs sites runs 9.7.7, so it is available everywhere and enabled on only 2 of 9 sites fleet-wide (`ux-observability-posture.md` §1).
- VitePress ships no breadcrumb feature at all, at any config ("No — VitePress ships none, at any config", `ux-observability-posture.md` §1) — `ocx`, the fleet's one VitePress site, is also the fleet's deepest real nav (3 levels) and has no path back to its own third level without a hand-built component.
- Information scent (nav labels using the reader's words, not internal jargon) has no fleet-checkable verification beyond a maintained jargon denylist; it ships as a review heuristic, not a lint ([NN/g Information Scent](https://www.nngroup.com/articles/information-scent/)).
- A 34,298-word reference page in a single file (`ocx/website/src/docs/reference/command-line.md`) is longer than the entire docs surface of 12 of the fleet's 23 measured repos, and is the direct alternative a hard depth cap forces: fewer nav levels pushes content into fewer, longer files unless a length trigger exists alongside the depth cap (`docs-shape.md` §4).
- Custom heading anchors are load-bearing, not cosmetic: a link checker that ignores explicit `{#id}` anchors and slugs visible text instead inflates a real 68-link dead-link count to 2,087 false positives, a 30x error (`docs-shape.md` §5).
- Root-relative internal links (`/docs/installation`) must resolve against the site's source root (`website/src` for VitePress, `docs/` for MkDocs/mdBook), not the linking file's directory — unfixed, this alone reports 89% of one site's internal links as dead (`docs-shape.md` §5).
- Every nav-depth and breadcrumb rule below has a stated precondition: it fires only when a generator config exists (`mkdocs.yml`, `.vitepress/config.*`, `book.toml`) — 3 of the fleet's repos have a `docs/` tree with no site at all and none of these rules should touch them (map's own "Rule and depth files" recommendation, `docs-topic-map.md`).
- One script, not three, can check nav depth across the fleet: parse `mkdocs.yml`'s `nav:` YAML mapping depth, VitePress's `sidebar` array's `items` nesting depth, and mdBook's `SUMMARY.md` indentation depth, each with a five-line generator-specific branch feeding one shared depth-and-report function.

## Findings

### 1. The NN/g ceiling and the generator affordance are not measuring the same thing

NN/g's progressive-disclosure article states plainly: "In practice, designs that go beyond 2 disclosure levels typically have low usability because users often get lost when moving between the levels," and traces this to usability testing across 46 web applications ([NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Docusaurus's sidebar reference demonstrates a working example nested 4 levels deep (root → category → nested category → nested category → doc) with no depth ceiling stated at all, and separately ships `autoCollapseCategories` (collapses sibling sections when one opens) and a `hideable` sidebar for tablet widths ([Docusaurus Sidebar](https://docusaurus.io/docs/sidebar)). VitePress's own sidebar reference is more explicit still: "You may further nest the sidebar items up to 6 level deep counting up from the root level. Note that deeper than 6 level of nested items gets ignored" — and by default "all sections are 'open'" unless a group sets `collapsed: true` ([VitePress Sidebar](https://vitepress.dev/reference/default-theme-sidebar)).

Read together, the two sources disagree about depth in the abstract but agree in the specific: every deep worked example both frameworks ship relies on collapse. A category a reader has not opened is not a level the reader is "moving between" in NN/g's sense — it is inventory the reader has not yet decided to look at. NN/g's own progressive-disclosure article defines the pattern's benefit as exactly this: "Show users only a few of the most important options... Offer a larger set of specialized options upon request." A 3rd or 4th sidebar level that stays collapsed until clicked is the progressive-disclosure pattern working as designed, not a violation of the 2-level ceiling measured against always-expanded menus.

### 2. The fleet's own numbers settle the conflict without averaging

`ux-observability-posture.md` §1 measured every site's real nav depth: 7 of 9 sites sit at 2 levels, `ocx` and `ocx-sdk-python` reach 3 (the third level collapsed by default in both — `ocx`'s "In Depth" section is `collapsed: true` in `config.mts:93-115`; `ocx-sdk-python`'s third level is a `Concepts` subsection under `Guide`). No fleet site reaches 4. The generator capability the conflict cites (Docusaurus's 4-level worked example) is not a need this fleet has ever expressed — the fleet's largest real docs surface, `ocx` at 44 pages, fits inside 3 levels today.

`grimoire`'s 20-item flat `SUMMARY.md` (depth 1, zero grouping — `docs-audit/ux-observability-posture.md` §1) is the opposite failure and belongs to a different rule (§6 below), not evidence that shallow nav is safe by default: at 20 ungrouped items it is also the fleet's only zero-hierarchy nav and its pages are the ones a path-based type classifier cannot read (`docs-shape.md` §2, finding 3 below).

### 3. Directory-as-IA and nav depth are the same measurement seen twice

`docs-shape.md` §2 classified all 248 fleet pages by a path/filename heuristic and found `other` (unclassifiable) sits at 31.9% fleet-wide, concentrated almost entirely in `grimoire`: its flat single-directory mdBook tree (`grimoire/docs/src/*.md`, no `how-to/`, `reference/` subdirectories) puts 18 of 23 pages in `other`, because filenames like `commands.md` or `upgrading.md` carry no type-signalling path segment. MkDocs-Material sites with a Diataxis-shaped directory split (`how-to/`, `reference/`, `explanation/`) classify at 0-3 `other` out of far larger page counts. The report states the implication directly: "The directory-IA pattern, where present, is what makes a path-based classifier — and a human skimming the sidebar — work at all" (`docs-shape.md` §2). A nav that groups by directory is therefore not a nice-to-have on top of type declaration (owned by `docs-page-types`) — it is the same structural move, and a flat nav guarantees the classifier gap regardless of what the page-type rule requires elsewhere.

### 4. Breadcrumbs: a real threshold, and a real asymmetry between the fleet's two frameworks

NN/g's breadcrumbs article gives a concrete threshold: breadcrumbs are unnecessary for "sites with flat hierarchies that are only 1 or 2 levels deep, or sites that are linear in structure," which by construction recommends them once a hierarchy passes 2 levels. Placement is equally concrete: "at the top of the page, usually just below the global navigation," and breadcrumbs "should not replace the global navigation bar or the local navigation within a section" ([NN/g Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/)).

The fleet's own generators do not offer this symmetrically. Material for MkDocs ships `navigation.path` as a one-line theme feature flag, live since v9.7.0: "When navigation paths are activated, a breadcrumb navigation is rendered above the title of each page" ([Material for MkDocs navigation setup](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/)). Every MkDocs site in this fleet runs Material 9.7.7 (`docs-frame.md`), so the feature is available fleet-wide at zero engineering cost — yet only 2 of 9 sites enable it, both configured within a week of each other and both the fleet's only sites with any breadcrumb at all (`ux-observability-posture.md` §1, `navigation.path` at `mkdocs.yml:259` and `mkdocs.yml:439`). VitePress ships nothing comparable — the audit states it flatly: "No — VitePress ships none, at any config" (`ux-observability-posture.md` §1). `ocx`, the fleet's one VitePress site, is also its deepest real nav (3 levels), meaning the one site that would benefit most from a breadcrumb per NN/g's own threshold is the one site structurally unable to get one without a hand-built Vue component.

### 5. Page length is the depth cap's real trade partner

`docs-shape.md` §4 measured `ocx/website/src/docs/reference/command-line.md` at 34,298 prose words in a single file — longer than the entire docs surface of 12 of the fleet's 23 distinct repos combined — and `ocx/website/src/docs/user-guide.md` at 13,789 words, also a single file. Both are the visible cost of *not* splitting content into more, deeper nav entries: a hard depth cap without a paired length trigger just pushes the same content sideways into fewer, longer pages, which is worse for search relevance, in-page findability, and diff review than the nav-depth problem it avoided. A page-splitting rule has to travel with the depth cap, not stand alone (per the brief's own framing — see rule DOC-NAV-05 below).

### 6. Anchor stability is measured, not assumed, and it is a 30x error if skipped

`ocx`'s convention is `{#custom-anchor}` on every heading (`ocx/.claude/rules/docs-style.md:40`, pattern `{#parent-subsection}` for nesting), which VitePress's underlying `markdown-it-anchor` honors as the real anchor id rather than slugging the visible heading text. `docs-shape.md` §5 measured what happens when a checker ignores this: before accounting for explicit ids, `ocx` reported 2,087 of 2,337 internal links dead (89%); after preferring the explicit `{#id}`, that number drops to 68 (2.9%) — a 30x difference from one fix. A second, independent fix was needed for root-relative links (`/docs/installation`), which must resolve against the site's source root (`website/src` for VitePress) rather than the linking file's own directory — unfixed, this alone produces the 89% false-dead reading. The residual 68 real dead links include genuine rot: `command-line.md:361` links `../user-guide.md#path-resolution`, but that anchor is actually defined in `command-line.md` itself, not in `user-guide.md` — a heading that moved without its inbound cross-references following it (`docs-shape.md` §5).

### 7. What is checkable from a repo checkout, and what is not

Checkable without rendering the site: nav depth (parse the generator's own config file), heading depth per page (count ATX heading levels in the Markdown source), page length (prose word count, excluding fenced code and tables), and anchor presence/stability (grep for `{#id}` against inbound link targets). Not checkable from a checkout: whether a reader's information scent actually predicts page content (NN/g's own framing is perceptual, not structural — "the user's imperfect estimate of the value that the source will deliver," [NN/g Information Scent](https://www.nngroup.com/articles/information-scent/)), whether a breadcrumb renders correctly, and the mobile-fold consequences of a given nav depth. These ship as review heuristics, explicitly labelled unverified, not as lint rules (see DOC-NAV-09 below).

## Normative guidance candidates

1. **Cap sidebar/TOC nesting at 2 levels expanded-by-default; a 3rd level is allowed only if it renders collapsed by default; 4+ levels of any kind is a hard fail.**
   Rationale: prevents the always-visible depth NN/g measured directly (46 web applications, users lost past 2 open levels); the fleet's own deepest working sites (`ocx`, `ocx-sdk-python`) already rely on a collapsed 3rd level, so the rule matches practice that already works rather than forcing a rewrite.
   Verify: `checks/nav_depth.py` (below) reports max structural depth and, per level ≥3, whether the corresponding config node sets `collapsed: true` (VitePress), is not under `navigation.expand` (MkDocs Material), or is a nested `SUMMARY.md` indent under a part title (mdBook); fails the build if any level-3 node is expanded-by-default, or any node reaches level 4.
   Evidence: measured (fleet) + normative (NN/g).

2. **A generator-backed site with 8 or more chapters/pages must not ship a flat, ungrouped top-level nav.**
   Rationale: `grimoire`'s 20-item flat `SUMMARY.md` is the fleet's only zero-hierarchy nav and independently produces 18 of 23 unclassifiable pages under a path-based type check — flat nav and unclassifiable content are the same defect measured twice, not two problems needing two fixes.
   Verify: count top-level nav entries with no children (MkDocs: top-level `nav:` list items that are bare strings/files, not mappings; VitePress: top-level `sidebar` array items with no `items` key; mdBook: `SUMMARY.md` bullet lines at indent 0 with no `# Part Title` line above them in the file). Fail if count ≥ 8 with zero grouping mechanism present.
   Evidence: measured (fleet).

3. **mdBook sites use `# Part Title` divider headers in `SUMMARY.md` to break a flat chapter list into named groups; do not simulate grouping with indentation alone.**
   Rationale: mdBook's own format gives a zero-depth-cost grouping primitive — "Level 1 headers can be used as a title for the following numbered chapters... rendered as unclickable text" — that `grimoire` does not use anywhere in its 20-chapter `SUMMARY.md`, despite needing exactly this fix.
   Verify: grep `SUMMARY.md` for level-1 (`^# `) lines other than the file's own opening title; require at least `ceil(chapters / 8)` of them once chapter count passes the rule-2 threshold.
   Evidence: codified (mdBook's own documented mechanism) + measured (fleet).

4. **Turn on breadcrumbs the moment a site's real nav depth reaches 3: `navigation.path` for every MkDocs Material site (available since v9.7.0, the fleet runs 9.7.7 everywhere); a minimal custom breadcrumb component for VitePress, since none ships natively.**
   Rationale: NN/g's threshold is hierarchies deeper than 1-2 levels; MkDocs sites get the feature for free and 5 of 7 leave it off despite running a version that supports it; VitePress structurally cannot comply without custom code, which is a real cost the rule must name rather than silently assume away.
   Verify: for MkDocs sites at measured depth ≥3, grep `mkdocs.yml` `theme.features` for `navigation.path`; fail if depth ≥3 and the flag is absent. For VitePress sites at depth ≥3 with no breadcrumb component present, flag as a known gap requiring either a custom component or a depth reduction — do not silently pass.
   Evidence: normative (NN/g) + measured (fleet) + codified (MkDocs Material's own feature flag).

5. **Cap a VitePress site's nav depth at 2, one level stricter than the general cap, unless a breadcrumb component exists.**
   Rationale: VitePress ships no breadcrumb feature at any config; without one, a 3rd level is depth with no way back per NN/g's own placement rule (breadcrumb use is the standard mitigation for depth past 2). `ocx` is both the fleet's only VitePress site and its deepest real nav today.
   Verify: same script as rule 1, generator-specific branch: if generator is VitePress and no known breadcrumb component path exists in the repo (e.g. no component importing route-derived ancestry), depth 3 fails rather than warns.
   Evidence: argued (fleet-specific asymmetry) + measured.

6. **Cap heading depth inside a single page at H4; a page needing H5+ splits into a new page instead of nesting deeper — except a reference page already carrying a structural drift test, which may reach H5.**
   Rationale: heading depth is the in-page analogue of nav depth and trades against the same page-splitting decision; the carve-out matches the fleet's own working example (`ocx`'s `command-line.md` reaches H5 and is the one page in the fleet with a dedicated 479-line structural test, `test_doc_command_reference.py`, covered under `docs-page-types` / `docs-examples`, not re-derived here).
   Verify: count max ATX heading level (`^#{1,6}\s`) per file; fail at H5+ unless the page is frontmatter-tagged `reference` and a corresponding structural test file exists in the repo.
   Evidence: measured (fleet) + argued (carve-out reasoning).

7. **A non-reference page over 4,000 prose words (code fences, tables, and frontmatter excluded) must split into multiple pages under one nav group, not stay as one file.**
   Rationale: this is the depth cap's real trade partner — `command-line.md` at 34,298 words and `user-guide.md` at 13,789 words are what a hard depth cap buys you if nothing also caps length; no source in this research supplies a canonical number, so the threshold is set from the fleet's own distribution (its longest non-outlier pages sit in the hundreds to low thousands of words per `docs-shape.md` §3-4) rather than an external study.
   Verify: reuse `docs_shape.py`'s prose-word counter (strips frontmatter, code fences, inline code) per page; fail non-reference pages over 4,000 words.
   Evidence: argued (no external threshold found) + measured (fleet distribution).

8. **Every heading that receives an inbound cross-file link must carry an explicit, stable anchor id (`{#kebab-case-id}`), and the link checker must resolve against that id before falling back to a slug of the visible heading text.**
   Rationale: skipping this measured a 30x error rate in this fleet alone (68 real dead links read as 2,087) — the convention is load-bearing, not cosmetic, and a rule that doesn't check for it will pass a page whose real cross-references are silently broken.
   Verify: the anchor/link script's `heading_anchor()` step (already built and proven in `docs-shape.md` §5) prefers the `{#...}` group when present; CI fails when a link target resolves to neither an explicit id nor a slugged heading, after also resolving root-relative links against the site's declared source root (`website/src`, `docs/`, or the mdBook `src/` directory) rather than the linking file's own directory.
   Evidence: measured (fleet, 30x).

9. **Nav labels use the reader's own task words; a maintained denylist of internal-only terms (product codenames, internal component class names, unreleased feature names) is grepped against top-level nav labels, and anything else is a review heuristic, not a lint.**
   Rationale: NN/g frames unmet information scent as costing trust faster than a single click, but the underlying judgment (does this label predict its destination for *this* audience) has no structural signal a repo checkout can see — a denylist catches the worst, mechanical case only.
   Verify: grep nav config text values against a project-maintained `docs/nav-jargon-denylist.txt`; this is explicitly a partial check — label it "review required" in the rule text, not "passing" when the denylist is empty.
   Evidence: normative (NN/g) for the underlying principle; asserted for the grep's coverage — it catches a named-term violation, not a scent failure in general.

10. **A nav-depth rule and its breadcrumb/length/anchor companions fire only when a generator config is present (`mkdocs.yml`, `.vitepress/config.*`, `book.toml`); a bare `docs/` directory with no such file is out of scope.**
    Rationale: 3 of the fleet's repos have a `docs/` tree with no site, nav, or search at all (`creeptd-ng`, `kate-middlechild`, `grimoire-lore`) — firing site-UX rules on content that structurally cannot carry a sidebar, a collapse state, or a breadcrumb produces false failures on repos that were never asked to be a docs site.
    Verify: the script's first step is config-file detection; absence of all three means the entire rule file is a no-op for that repo, reported as "not applicable" rather than "failed."
    Evidence: normative (the map's own artifact-split decision, `docs-topic-map.md` "Rule and depth files").

11. **Ship one script, not three, that reads all three generator config shapes and reports depth, flatness, heading depth, page length, and anchor coverage in one pass.**
    Rationale: the fleet runs exactly three shapes (`mkdocs.yml` YAML `nav:`, VitePress `sidebar` array with nested `items`, mdBook `SUMMARY.md` indentation) — a single script with a five-line per-generator branch avoids maintaining three separate tools for one concept, and is the concrete deliverable the brief asks for.
    Verify: the script itself is the verification — see the sketch below; a passing run against all 9 fleet sites with 0 unexpected failures is the acceptance test before shipping it as `checks/nav_depth.py`.
    Evidence: codified (this is the tool, not a claim about one).

```python
# checks/nav_depth.py -- sketch, not the full implementation
import re, yaml

def mkdocs_depth(nav, level=1):
    if isinstance(nav, list):
        return max((mkdocs_depth(v, level) for v in nav), default=level)
    if isinstance(nav, dict):
        return max((mkdocs_depth(v, level + 1) for v in nav.values()), default=level)
    return level  # a bare "page.md" string leaf

def vitepress_depth(items, level=1):
    if not items:
        return level
    return max(vitepress_depth(i.get("items"), level + 1) for i in items)

def mdbook_depth(summary_md_text):
    max_indent = 0
    for line in summary_md_text.splitlines():
        m = re.match(r"^(\s*)-\s+\[", line)
        if m:
            max_indent = max(max_indent, len(m.group(1)) // 2)  # 2-space indent unit
    return max_indent + 1

# Dispatch on which config file exists: mkdocs.yml -> mkdocs_depth(yaml["nav"]);
# .vitepress/config.* -> parse the `sidebar` array (regex-extract `items:` blocks,
# since it's TS/JS, not JSON -- a bracket-depth scan on `items:` tokens is enough);
# book.toml + SUMMARY.md -> mdbook_depth(open("SUMMARY.md").read()).
# No config file found -> report "not applicable", exit 0.
```

## AI-agent angle

- **Nests sidebars as deep as the framework allows.** Told to "add navigation" for a growing doc set, a model happily emits 4-5 levels because neither Docusaurus nor VitePress errors on it — VitePress silently drops anything past 6 rather than warning, which hides the mistake instead of catching it. Check: run `checks/nav_depth.py`; flag any config past the level-2/collapsed-level-3 rule.
- **Generates a flat file list when scaffolding a new docs tree from scratch**, because grouping requires a judgment call (what belongs with what) that appending to a flat list avoids. This is exactly `grimoire`'s shape: 20 items, one commit at a time, never revisited. Check: rule 2's flat-nav-floor script, run on every PR that adds a page.
- **Keeps growing a single reference page indefinitely rather than splitting it**, because splitting requires deciding a new page boundary and updating cross-links, while appending a new `##` section to an existing file requires neither. `command-line.md`'s 34,298 words did not arrive in one commit. Check: rule 7's per-page word-count gate, which catches the file crossing 4,000 words long before it reaches 34,000.
- **Slugs a heading from its visible text when generating a cross-file link, instead of checking for or adding an explicit anchor**, because the slug is free to compute and the explicit-id convention is a project-specific fact the model has to look up rather than assume. Check: rule 8's `heading_anchor()` preference, plus a pre-commit grep that a newly added heading with any inbound reference from another file has a `{#id}`.
- **Writes "breadcrumb" as prose instead of using the platform's structural feature** — a sentence like "as discussed in the previous section" standing in for an actual ancestor-chain link, because writing a sentence needs no config file lookup while enabling `navigation.path` does. Check: grep for self-referential nav phrases ("as mentioned above/earlier/previously", "in the previous section") on pages the depth script flags as needing a real breadcrumb; a hit is a tell that the feature was faked in prose instead of turned on.
- **Treats "For Developers" / "For Admins" top-level nav sections as neutral organization**, when GOV.UK's evidence-based practice organizes by task, not audience — an easy default because audience labels require no research while task labels require knowing what readers actually do. Check: grep top-level nav/section titles for role nouns ("developer", "admin", "beginner", "advanced") as a smell, not a hard fail — a prompt to check whether a task split serves readers better.

## Contested / evolving

**NN/g's 2-level disclosure ceiling vs. the 4+ levels generators demonstrate for large sites** (the conflict named for this topic). Resolved above, not split down the middle: the two claims describe different things — NN/g measures levels a reader holds open and expanded simultaneously; Docusaurus's and VitePress's deep worked examples are collapsed by default, which is progressive disclosure operating as NN/g's own article defines the pattern, not a violation of it. The fleet's actual practice already reflects this reconciliation without anyone deciding it on purpose: both sites that reach a 3rd level (`ocx`, `ocx-sdk-python`) keep it collapsed. The rule this research ships (candidate 1) makes that accidental practice explicit and adds the one place the fleet is actually exposed — VitePress, which has no breadcrumb fallback if a 3rd level is ever expanded by default (candidate 5).

As of September 2026, the trend is one-directional and unresolved from the research side: tooling vendors (Docusaurus, VitePress, Material for MkDocs) keep adding depth-management affordances (auto-collapse, hideable sidebars, `navigation.expand`) that treat depth as a UI problem to manage rather than a number to cap, while NN/g's foundational number is unchanged since 2006 and the article shows no revision date past its original publication (unlike the breadcrumbs and F-pattern articles, both explicitly reviewed in 2018/2026). This means the tooling side keeps getting more permissive while the research side has not re-tested its ceiling against modern collapse-by-default UI patterns — the reconciliation above is this document's own argument, not a settled position in the literature.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nngroup.com/articles/progressive-disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | NN/g, progressive disclosure | 2006, no later revision noted | Primary source for the 2-level ceiling and its 46-application testing basis |
| [nngroup.com/articles/breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/) | NN/g, breadcrumbs | 2018, reviewed Sept 2026 | Primary source for the depth threshold, placement, and "never replaces primary nav" rule |
| [nngroup.com/articles/information-scent](https://www.nngroup.com/articles/information-scent/) | NN/g, information scent | 2020 | Primary source for why jargon nav labels fail, and why the check cannot be fully mechanized |
| [docusaurus.io/docs/sidebar](https://docusaurus.io/docs/sidebar) | Docusaurus sidebar reference | Current as of fetch, 2026 | Primary source for the "4+ levels, no stated ceiling" side of the named conflict, plus `autoCollapseCategories`/`hideable` |
| [vitepress.dev/reference/default-theme-sidebar](https://vitepress.dev/reference/default-theme-sidebar) | VitePress sidebar reference | Current as of fetch, 2026 | Primary source for the fleet's actual VitePress site's depth mechanics: 6-level silent cap, `collapsed` default-open behavior |
| [squidfunk.github.io/mkdocs-material/setup/setting-up-navigation](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) | Material for MkDocs navigation setup | Current as of fetch, 2026; `navigation.path` since v9.7.0 | Primary source proving the fleet's own pinned version (9.7.7) already ships one-line breadcrumbs, unused on 5 of 7 sites |
| [rust-lang.github.io/mdbook/format/summary.html](https://rust-lang.github.io/mdbook/format/summary.html) | mdBook SUMMARY.md format reference | Current as of fetch, 2026 | Primary source for the zero-depth-cost `# Part Title` grouping mechanism `grimoire` does not use |
| `docs-audit/ux-observability-posture.md` §1 | Internal fleet audit, navigation table | 2026-09-05 | Measured per-site depth, breadcrumb presence, and the flat-nav outlier, across all 9 real sites |
| `docs-audit/docs-shape.md` §2 | Internal fleet audit, page-type classification | 2026-09-05 | Ties flat nav to the same "other"/unclassifiable defect independently, via a path-based classifier |
| `docs-audit/docs-shape.md` §4 | Internal fleet audit, structure metrics | 2026-09-05 | Measured the 34,298-word and 13,789-word single-file outliers that motivate the page-length trigger |
| `docs-audit/docs-shape.md` §5 | Internal fleet audit, link metrics | 2026-09-05 | Measured the 30x anchor-checking error and the root-relative-link resolution fix |
| `docs-topic-map/design-systems.md` §2, §4 | Scout research file | 2026-09-05 | Already-synthesized version of the NN/g-vs-Docusaurus conflict and the AI-agent nesting failure mode, cross-checked against direct fetches here |
| `ocx/.claude/rules/docs-style.md:40` | Existing fleet rule, in production | Current, 2026 | The `{#custom-anchor}` convention this research proves is load-bearing, in the one repo that already enforces it |
