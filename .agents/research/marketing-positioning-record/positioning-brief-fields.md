---
title: Positioning brief fields, location, loading and review
program: product
sub_program: marketing
topic: marketing-positioning-record
worker: positioning-brief-fields
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
scope: Which fields a positioning brief needs so an agent can apply it, where the one file lives, how rules and skills load it (README edits included), when it is reviewed, and what an agent does without one. Not covered - drift detection across surfaces (sibling worker), copy craft, channel-specific messaging. Moore's own text and Schwartz's own book could not be fetched; both are marked secondary.
---

# Positioning brief fields, location, loading and review

## Contents
1. Summary
2. Findings (canon, fleet measurements, loading mechanics)
3. Normative guidance candidates
4. What an agent must not decide alone
5. Dated facts
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- A brief an agent can apply is a short file of decided fields, not a narrative. The fleet's seven product-context files are narratives; none has a "do not say" list, a category noun, or a review date.
- Required fields: audience (one segment), named alternative (what the buyer does without the product), category noun, canonical sentence, object nouns with enumerated lists, attributes with proof, "do not say" list, per-surface awareness stage, reviewed date and review_by date.
- Dunford's canon orders the decisions: alternatives, unique attributes, value with proof, target market, category, then optional trends ([Commoncog notes on Obviously Awesome](https://commoncog.com/obviously-awesome/), updated 2025-01-07). Her own site gives only the definition; the worksheet sits behind an email wall ([aprildunford.com](https://www.aprildunford.com/templates)).
- Moore's seven slots (target customer, need, product, category, key benefit, primary alternative, primary differentiation) are a completeness test for the canonical sentence. Source is a secondary summary; the book text was not retrievable.
- Schwartz's awareness stages decide where line one of a surface starts, so awareness is a per-surface field, not a per-product field. Source is reader's notes, not the book.
- JTBD four forces (push, pull, anxiety, habit) are defined on [jobstobedone.org](https://jobstobedone.org/); the Christensen Institute page does not name the four forces ([page](https://www.christenseninstitute.org/theory/jobs-to-be-done/)). Use the forces as checks on install pages, not as brief fields.
- Fleet measurement: 0 of 7 product-context files list README in their `paths`; 4 of 7 are path-scoped, none to README; 1 of 7 (devcontainer-features) sits outside `.claude/rules/` and loads for no session.
- Fleet measurement: 6 of 17 directories have a product-context file; 5 of those state an audience in a section; only 1 of 17 READMEs carries it in a sentence. Audience can be filled from existing text in 5 repos; the other 12 need a human decision.
- Single file per product: `.agents/positioning.md`, 80 lines or fewer, tool-neutral, with a thin path-scoped rule that points at it and a skill gate that refuses to draft copy without it.
- Claude Code loads a path-scoped rule when Read, Write or Edit touches a matching file ([Claude Code memory docs](https://code.claude.com/docs/en/memory)); so the pointer rule must list README globs explicitly.
- Without a brief: stop and invoke the positioning-brief skill to write a draft marked `status: unreviewed`; copy drafted from an unreviewed brief carries the same mark and cannot be published without the owner.
- Staleness is a mechanical check: `review_by` earlier than today fails. Dunford's cadence (every 6 months and after major events) gives the default interval ([Commoncog](https://commoncog.com/obviously-awesome/)).

## Findings

### 1. The canon, as far as primary pages go

**Dunford.** Her own homepage states only the definition: "Positioning defines how our product is different and better than alternatives for a particular set of customers" ([aprildunford.com](https://www.aprildunford.com/), footer 2026). Templates page: one "Workbook", 12 pages covering Obviously Awesome and Sales Pitch, free for newsletter subscribers; no fields shown ([aprildunford.com/templates](https://www.aprildunford.com/templates)). A direct fetch of a canvas post returned 404 ([aprildunford.com/post/positioning-canvas](https://www.aprildunford.com/post/positioning-canvas)). The component list therefore rests on a secondary note-taker: [Commoncog](https://commoncog.com/obviously-awesome/), published 2019-05-28, updated 2025-01-07. Components there: competitive alternatives (what customers would do if the solution did not exist, including "do nothing"), unique attributes, value with "objective proof, not internal opinions", target market characteristics, market category, relevant trends (optional, "buzzword soup" risk; "better to be boring and profitable than cool and baffling"). Step 10 of her ten-step process is "capture positioning so it can be shared", which is this brief. Three styles: Head to Head, Big Fish Small Pond, Create a New Game. Review: every 6 months and after major market events, per the same notes. A 2024 Lenny's Newsletter summary says re-evaluation is triggered by market change, with no fixed schedule ([Lenny's summary, 2024-08-13](https://lennysnewsletter.com/p/summary-april-dunford-on-product)); the 6-month figure is the notes' statement, not confirmed on Dunford's own site. Treat it as a default, not a law.

**Moore.** Seven slots, per a secondary summary: target customer, need or opportunity, product, category, key benefit, primary competitive alternative, primary differentiation ([HELIX research note](https://documentdrivendx.github.io/helix/research/geoffrey-moore-positioning/), which cites the.gt; the.gt fetch failed twice with connection reset). Wording varies across sources; one splits the sentence into a "For / who / is a / that" value half and an "Unlike / provides" differentiation half ([search results, Tessl skill page](https://tessl.io/registry/skills/github/deanpeters/Product-Manager-Skills/positioning-statement), not opened). Primary text of Crossing the Chasm was not obtained. Use the slot list as a checklist, not as quoted wording.

**Schwartz.** Reader's notes of Breakthrough Advertising ([archive.org text](https://dn721308.ca.archive.org/0/items/breakthrough-advertising-notes-1/BreakthroughAdvertisingNotes%20(1)_djvu.txt), secondary): awareness runs from most aware (lead with the selling point) through product-aware, solution-aware and problem-aware to completely unaware (headline must earn identification first). Sophistication runs stage 1 (state the claim simply) through 3 (new mechanism) to 5 (market no longer trusts claims; build identification). The notes number the awareness stages in an order that differs from the usual "most aware first" list; the scout's ordering (canonical-guides.md) matches the usual one. Implication for the brief: store the stage per surface, since a README reader and a conference-talk viewer start in different places.

**JTBD forces.** [jobstobedone.org](https://jobstobedone.org/) (© 2026, undated): push is "the problem with the current situation that drives someone to look"; pull is "the magnetism of the new solution and the progress it promises"; anxiety is "the fear and uncertainty about the new, unproven choice"; habit is "the comfortable pull of what they already know and do". The Christensen Institute page defines jobs as "the progress they're trying to make as they strive toward a goal or aspiration" and does not use the four-forces model ([page](https://www.christenseninstitute.org/theory/jobs-to-be-done/)). A web search for Moesta's materials confirmed the forces belong to the Re-Wired Group school but did not return the book text ([search](https://www.intercom.com/blog/podcasts/bob-moesta-on-unleashing-your-sales-superpower)). For the brief, the forces become a "switching" block: what pushes, what pulls, what the anxiety is, what habit (the existing script) is.

**Fletch PMM** (practitioner consultancy; vendor content selling services, no named author on the pages read).
- ICP: [You're building your ICP wrong](https://fletchpmm.com/newsletter/you-re-building-your-icp-wrong), 2026-03-18. Argues firmographics (model, geography, industry, size) are a weak start; segment by behaviour ("potential", "kinetic" and "captured" energy: blocked, doing it inefficiently, using a competitor). Pick one segment; the page suggests 60 to 80 percent of go-to-market budget on it. For a brief: audience is a behaviour plus an alternative, with firmographics layered after.
- Strategy: [There are only three positioning strategies](https://fletchpmm.com/newsletter/there-are-only-three-positioning-strategies), 2026-06-05: mature category (say why you are better), immature category (educate), new category (build your own). This is Dunford's three styles under different names, which shows the "style" field is stable across schools.
- H1: [How to write an H1](https://fletchpmm.com/newsletter/how-to-write-an-h1), 2026-04-07: an H1 names a reference point (category or job) plus differentiation. Tests: clarity, generic (could sit on any enterprise B2B site), too broad ("automate systems"), too lofty ("drive revenue"). These tests are directly checkable against the brief's category and alternative fields.
- AI: [Should you incorporate AI in your positioning](https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning), 2026-11-07: three options (pivot into an AI category, differentiate within the existing category, keep AI out of primary positioning). Supports a brief field "trend words allowed in hero: yes/no".

### 2. Fleet measurement: the seven product-context files against the canon

The audit counts 6 variants; the find below returns 7 files because `devcontainer-features` keeps its file under `.agents/`, outside `.claude/rules/`.

Commands (run from `/home/mherwig/dev`):
- Inventory: `find . -name product-context.md -not -path "*/node_modules/*" -not -path "*cargo*" -not -path "*/.cache/*"` (7 files; one more hit is a cargo registry path, excluded).
- Dates: `git -C <dir> log -1 --format=%cs -- product-context.md`.
- README scope: `awk '/^---/{n++} n==1' <file> | grep -c -i "README"` returns 0 for all 7. Files with no frontmatter were checked separately (see load column).
- Field presence: `grep -c -i` on section headings, then read-through of the matches.

| Repo | Path | Last commit | Scope / load | Audience | Named alternative | Category noun | Canonical sentence | Do-not-say | review_by |
|---|---|---|---|---|---|---|---|---|---|
| ocx | `.claude/rules/product-context.md` | 2026-11-26 | `paths:` website/**, `.claude/artifacts/**`, 8+ agent and skill files; no README | yes (Target Users incl. non-target) | yes (Competitive Positioning, "Why Not Just" rebuttals) | no section | blockquote, 1 line | no | no; "Run quarterly" in Validation |
| grimoire | `.claude/rules/product-context.md` | 2026-11-23 | `paths:` docs/**, `.agents/**`, 4+ skills; no README | yes | yes (Comparable Tools); one claim "re-verify after 2027-05-16" | no | blockquote tagline | no | partial, one dated claim only |
| grim-mirror | `.claude/rules/product-context.md` | 2026-11-26 | `paths:` docs/**, `.agents/**`, 4 skills; no README | yes | no | no | blockquote | no | no |
| grim-gui | `.claude/rules/product-context.md` | 2026-11-26 | `paths:` `.agents/**` only | yes | no | no | blockquote | no | no |
| catalog | `.claude/rules/product-context.md` | 2026-11-13 | no frontmatter: loads every session | no (Consumers section only) | yes (Comparable tools) | partial (renderer vs producer) | no | no | no |
| index | `.claude/rules/product-context.md` | 2026-07-26 | no frontmatter: loads every session | no | no | no | no | no | no |
| devcontainer-features | `.agents/product-context.md` | 2026-11-17 | not a rule; never auto-loaded; "Written 2026-11-17" in line 3 | yes ("Who it is for") | no | no | no | no | no |

Tally (7 files): audience 5; named alternative 3; category noun 0 as a decided field; canonical sentence 4 as a blockquote; do-not-say 0; review_by 0. Update-protocol sections exist in 4 (ocx, grimoire, grim-mirror, grim-gui) and state triggers ("any of these trigger an edit in the same commit") and a quarterly validation for ocx, but no date a checker can compare.

Do-not-say list: `grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md` lines 101 to 118 hold the only one (section 6, "Do not say - each of these is a factual trap"): six items. Four are claims about facts that can drift (cross-vendor skill translation, drift detection or CI gating, registry scale, adoption or social proof), one is a register rule ("Marketing register generally"). It sits in a spec under `.agents/specs/`, which no session loads (config-inventory.md smell 4). Each item carries its reason and a replacement claim, which is the right shape. The index count "12 packages" in it is a dated fact that will rot without a `review_by`.

Loading for a README edit: path-scoped rules load on Read, Write or Edit of a matching file ([Claude Code memory docs](https://code.claude.com/docs/en/memory), fetched 2026-11-27). No README glob appears in any of the seven, so a README edit loads none of the four path-scoped files; the two unscoped ones (catalog, index) load every session but carry no audience or alternative. Result: for every README edit in the fleet, 0 of 7 briefs reach the agent as a rule.

Audience fillable from existing sentences, from messaging-inventory §6 (`grep -n -i -E "is for|for (developers|teams|engineers)" ocx-sh/*/README.md grimoire-rs/*/README.md` gives 1 of 17, devcontainer-features README line 6) plus the product-context check above (loop over `ocx-sh/*/` and `grimoire-rs/*/` with `grep -l -i -E "^## (target users|who it is for|consumers)"`):

| Group | Repos | Count |
|---|---|---|
| Audience sentence exists in a product-context section, can be copied | ocx, grimoire, grim-mirror, grim-gui, devcontainer-features | 5 |
| Only a "Consumers" section (catalog), needs owner confirmation | catalog | 1 |
| Product-context exists but no audience (index) | index | 1 |
| No product-context file | conventions, e2e-index, grimoire-lore, indexbot, ocx-mirror, rules_ocx, website, www-setup, indexer, vscode | 10 |

So an agent can fill the audience field from an existing sentence in 5 of 17 directories, and in 12 it must ask or write a draft marked unreviewed. Note: the ocx file's audience is "automation tools" (GitHub Actions, Bazel rules), while the landing says engineers; the audit already found the same ambiguity (messaging-inventory.md §2). A copy step cannot resolve that; the owner chooses.

### 3. Loading mechanics that decide where the brief lives

- Rules without `paths` load at launch with the priority of `.claude/CLAUDE.md`; a rule with `paths` loads only on matching files ([memory docs](https://code.claude.com/docs/en/memory)).
- Target size is under 200 lines per instruction file; longer files reduce adherence (same page). So the brief is capped near 80 lines and the rule that points at it near 15.
- `@path` imports are documented for CLAUDE.md files, recursion up to 4 hops (same page). I did not verify imports inside rule files; do not depend on it. The pointer rule says "read `.agents/positioning.md`" in plain words and a skill gate re-reads it.
- AGENTS.md: nearest file wins, plain Markdown with no required fields, stewarded by the Agentic AI Foundation under the Linux Foundation ([agents.md](https://agents.md/), undated page). Tool-neutral location is why the brief is a plain file in `.agents/`, not inside `.claude/rules/`; other clients (Cursor, Codex, grim targets) cannot be assumed to read `.claude/rules/`.
- Where does it live? Three candidates, scored on README load, tool neutrality and one-source:
  1. `.claude/rules/product-context.md` (fleet today): fails README load unless globs are added; Claude-only; duplicates architecture content.
  2. Repo root `POSITIONING.md`: tool-neutral, visible to humans; clutters the root of a 17-repo fleet; no convention exists.
  3. `.agents/positioning.md` with a pointer rule: matches the existing `.agents/` convention (plans, adr, specs, research); one source; rule globs carry the load.
  Pick 3. The existing product-context file keeps architecture and principles and drops positioning fields, or becomes the brief itself where small (grim-gui, 3.1 KB).

### 4. Brief shape (proposal)

```yaml
---
status: reviewed        # reviewed | unreviewed
reviewed: 2026-11-27
review_by: 2027-05-27   # default: reviewed + 6 months
owner: <human name or role>
style: big-fish-small-pond   # head-to-head | big-fish-small-pond | new-game
---
```

| Field | Content | Canon source |
|---|---|---|
| audience | One segment: role or behaviour plus context. Non-target list. Evidence line (issue, quote, usage). | Dunford target market; Moore beachhead; Fletch behaviour segment |
| alternative | What they do today without the product, named (a script, apt, brew, doing nothing). | Dunford competitive alternatives; Moore primary alternative |
| category | One noun phrase, plus the style decision and one line why. | Dunford category; Fletch strategies |
| canonical_sentence | One sentence with Moore's slots filled: for whom, need, product, category, benefit, alternative, differentiation. | Moore |
| attributes | Each with proof (number, link, demo) or the marker `unproven`. | Dunford value with proof; Hopkins specificity |
| switching | Push, pull, anxiety, habit, one line each. | JTBD forces |
| objects | The product's nouns, one term each, and every enumerated list with count (e.g. artifact kinds). | fleet smell 4 (3 nouns, 4/5/8 lists) |
| awareness | Stage per surface: README, landing, release notes, docs index, talk. | Schwartz |
| status_claim | Maturity wording that must sit next to hero claims (early, pre-1.0). | audit smell 7 |
| do_not_say | Items with reason, replacement claim and the date or fact that could lift it. | design_brief_landing_page.md:101-118 |
| trends | Trend words allowed or banned in the hero. | Dunford step 9; Fletch AI article |

### 5. When the brief must be reviewed

Triggers: `review_by` passed; a release that changes the object lists or the CLI surface; a competitor named in `alternative` ships a rival claim; a do-not-say item's lift condition is met (e.g. "public index holds 12 packages" changes). Default interval 6 months from Dunford's cadence ([Commoncog](https://commoncog.com/obviously-awesome/)). Dunford's own site does not state it; Lenny's summary says change-driven ([2024-08-13](https://lennysnewsletter.com/p/summary-april-dunford-on-product)). The mechanical part is the date; the event part is a checklist in the skill.

## Normative guidance candidates

1. **MUST: One positioning brief per product at `.agents/positioning.md`, 80 lines or fewer.** Rationale: one source ends the 11 competing ocx one-liners. Verify: `test -f .agents/positioning.md && wc -l < .agents/positioning.md` is at most 80; `find . -name 'positioning*.md' -not -path './.agents/research/*' | wc -l` is 1 per product.
2. **MUST: Frontmatter carries `status`, `reviewed`, `review_by`, `owner`, `style`.** Rationale: staleness must be a date comparison. Verify: `grep -E '^(status|reviewed|review_by|owner|style):' .agents/positioning.md | wc -l` is 5; `review_by` greater than today.
3. **MUST: `audience` names exactly one segment and a non-target.** Rationale: Moore beachhead; the fleet names an audience in 1 of 17 READMEs. Verify: reading heuristic - pass "Platform engineers who pin CLI tools across CI and laptops; not for end users typing one-off installs", fail "developers and teams".
4. **MUST: `alternative` names a thing the buyer does today.** Rationale: Dunford derives every later field from it. Verify: field is non-empty and does not equal the product's own name; the README hero or first 20 lines contain the alternative word (`head -20 README.md | grep -i -F "<alternative>"`). Pass "instead of a curl-and-chmod script", fail "other tools".
5. **MUST: `category` is one noun phrase used verbatim on every surface.** Rationale: ocx today says package manager, distribution platform and toolchain pinner. Verify: `grep -r -i -F "<category>" README.md docs site website 2>/dev/null | wc -l` at least 1 per surface; and no surface uses a listed rejected synonym.
6. **MUST: `canonical_sentence` fills all seven Moore slots in one sentence.** Rationale: an empty slot predicts vague copy. Verify: reading heuristic - label each slot in the sentence; one missing slot fails. Pass "For platform engineers who keep CI and laptop tool versions in sync, ocx is a package manager that installs pinned binaries from OCI registries with no server, unlike curl scripts that break on a new release." Fail "The simple, fast way to manage tools."
7. **MUST: `objects` lists each product noun once with its counted lists.** Rationale: grimoire has three nouns and 4/5/8-item lists across surfaces. Verify: for each listed count, `grep -rn` the surfaces for the neighbouring wrong counts; any mismatch fails.
8. **MUST: `do_not_say` exists, each item with reason, replacement claim and lift condition.** Rationale: the only fleet list sits in a spec no session loads; agents invent adoption proof. Verify: `grep -c '^- ' <do_not_say block>` at least 1 for any product with no users, logos or benchmarks; `grep -r -i -E "trusted by|used by|stars" site README.md` must hit none unless a lifting source is cited.
9. **MUST: A path-scoped pointer rule loads the brief for README, landing, docs index, release notes, package metadata.** Rationale: 0 of 7 fleet briefs load for a README edit. Verify: the rule's `paths` includes `README.md`, `**/README.md`, `docs/**`, `site/**`, `website/**`, `CHANGELOG.md`, `Cargo.toml`, `package.json`; test with `awk '/^---/{n++} n==1' .claude/rules/positioning.md | grep -c README` at least 1; confirm load via the `InstructionsLoaded` hook the memory docs name.
10. **MUST: Any skill that drafts copy reads the brief first and stops if it is missing.** Rationale: Dunford: messaging follows positioning; agents draft copy first. Verify: skill text names the file, and a dry run in a repo without it ends with the unreviewed-draft step, not copy.
11. **MUST: A missing brief yields a draft marked `status: unreviewed` and copy marked unreviewed; never invent an audience.** Rationale: 12 of 17 fleet directories have no audience source. Verify: `grep -q '^status: unreviewed' .agents/positioning.md` makes the publish check fail until the owner flips it.
12. **MUST: `review_by` earlier than today fails the check.** Rationale: dated facts decay. Verify: `date +%F` compared with `grep '^review_by:'`.
13. **SHOULD: `attributes` each carry proof or the word `unproven`.** Rationale: Dunford's "objective proof, not internal opinions". Verify: any attribute without a number, link or `unproven` fails; the 12 unquantified ocx adjectives from messaging-inventory §2 are the test set.
14. **SHOULD: `awareness` set per surface; line one of each surface starts at that stage.** Rationale: Schwartz. Verify: reading heuristic - problem-aware surface names the problem in line one, product-aware surface names the product. Pass (problem-aware) "Pinning a CLI tool across CI and laptops takes a script per tool." Fail "Introducing ocx."
15. **SHOULD: `switching` has all four JTBD forces; install pages answer anxiety and habit.** Rationale: docs usually sell pull only. Verify: `grep -r -i -E "migrat|rollback|coming from|instead of" README.md docs` at least 1 hit per product.
16. **SHOULD: `trends` bans trend words in the hero until the fields above are filled.** Rationale: Dunford step 9. Verify: grep the hero for a banned list in the brief (e.g. "AI-native", "agentic") when `trends: banned`.
17. **SHOULD: `status_claim` is set and sits next to hero claims.** Rationale: 7 repos hide maturity. Verify: `grep -n -i -E "early development|pre-release|unstable|stabilizing" README.md` within the first 15 lines when status is pre-1.0.
18. **CONSIDER: Brief stores an `evidence` line per audience claim (issue link, quote, usage count).** Rationale: Dunford's pool of happy customers; agents write personas. Verify: field non-empty and a link or `none yet` stated.
19. **CONSIDER: Keep architecture, principles and storage layout in the existing product-context rule; brief holds only positioning fields.** Rationale: ocx file is 14,431 bytes; the brief must stay loadable on every README edit. Verify: `wc -c` of the pointer rule under 1,500 bytes.

## What an agent must not decide alone

- The audience segment, the beachhead and the non-target list (business decision; 12 of 17 fleet directories have none).
- The category noun and style (Head to Head vs new category): a bet on resources and a legal-adjacent naming risk.
- Any "first", "only" or "best" claim, benchmark, adoption or user count, logo or testimonial: facts the owner must supply and law may bind (separate legal worker).
- Lifting a do-not-say item.
- Flipping `status: unreviewed` to `reviewed` and setting `review_by`.
- Whether AI or other trend words enter the hero.
- Naming a competitor on a public surface.

## AI-agent angle

| Common agent mistake | Smallest check |
|---|---|
| Writes copy first, brief never (or after, to match) | Skill gate reads `.agents/positioning.md` before the first Write to a copy file; check `status` and `review_by` |
| Invents an audience such as "developers and teams" | Reject audience matching `developers|teams|everyone|anyone` without a role or behaviour: `grep -i -E "developers|everyone" <audience field>` |
| Treats a competitor as the alternative and skips "do nothing" or "a script" | Alternative field must hold a non-product behaviour for developer tools; reading heuristic |
| Fills Moore slots with adjectives ("fast", "simple") | Each benefit slot must hold a checkable fact; grep adjectives list |
| Copies a stale count from the brief into five surfaces | `objects` counts re-checked against the source (`grep -c` of the enum in code) at review |
| Quotes the 6-month cadence or a Fletch percentage as law | Dated facts carry a source and a "default" label |
| Treats an edited README as outside brief scope | Path rule includes README globs; `InstructionsLoaded` log shows the load |
| Assumes Claude-only loading | Brief in `.agents/`, pointer rules per client |

## Contested / evolving

- **Review cadence.** [Commoncog's notes](https://commoncog.com/obviously-awesome/) (updated 2025-01-07) give "every 6 months and after major events"; [Lenny's summary](https://lennysnewsletter.com/p/summary-april-dunford-on-product) (2024-08-13) gives event-driven re-evaluation with no interval; a search found no primary page stating the interval. Default 6 months with event triggers; trending to event-driven for fast markets (AI tooling).
- **Interview stance.** Dunford asks what customers would use if the product did not exist; the Mom Test school asks about problems (scout row 28). The brief's `alternative` field follows Dunford; an interview skill should ask both once.
- **Category vs job as reference point.** [Fletch H1 article](https://fletchpmm.com/newsletter/how-to-write-an-h1) accepts either; Dunford starts from alternatives and ends at category. The brief stores both and lets the owner pick the hero's frame.
- **Segmenting by behaviour vs firmographics.** [Fletch](https://fletchpmm.com/newsletter/you-re-building-your-icp-wrong) (vendor content, 2026-03-18) calls firmographics a poor start; much B2B practice and Moore's beachhead start there. For open-source CLIs with no sales team, behaviour fits; this is an inference, not a source finding.
- **Narrow vs broad.** Moore and Dunford narrow; the Ehrenberg-Bass school argues for reaching all category buyers (scout, canonical-guides.md row 21). The brief's single-segment rule follows Moore and Dunford; the owner may override with a stated reason.
- **JTBD schools.** Four-forces progress story vs measurable outcomes (Ulwick); the brief uses the forces only as a checklist.
- **Moore wording.** Variants exist; no primary text read, so the slot list is a checklist, not a quote.

## Dated facts

| Fact | Source | Date source states | Type |
|---|---|---|---|
| Positioning defined as how the product is different and better than alternatives for a particular set of customers | [aprildunford.com](https://www.aprildunford.com/) | © 2026, undated | Authority itself |
| Dunford Workbook, 12 pages, free by newsletter | [aprildunford.com/templates](https://www.aprildunford.com/templates) | © 2026 | Authority itself (vendor of own materials) |
| Five plus one components; 10-step process; review every 6 months and after major events | [Commoncog](https://commoncog.com/obviously-awesome/) | published 2019-05-28, updated 2025-01-07 | Independent notes of the book |
| Positioning re-evaluation tied to market change | [Lenny's summary](https://lennysnewsletter.com/p/summary-april-dunford-on-product) | 2024-08-13 | Independent summary |
| Moore seven slots | [HELIX note](https://documentdrivendx.github.io/helix/research/geoffrey-moore-positioning/) | undated; accessed 2026-05-12 per the page | Independent secondary |
| Four forces definitions | [jobstobedone.org](https://jobstobedone.org/) | © 2026, undated | Practitioner school itself |
| Christensen Institute page lists jobs as progress and does not name four forces; related resources dated 2026-04-20 to 2026-11-25 | [Christensen Institute](https://www.christenseninstitute.org/theory/jobs-to-be-done/) | page undated | Authority itself |
| Awareness and sophistication stage rules | [Schwartz reader's notes](https://dn721308.ca.archive.org/0/items/breakthrough-advertising-notes-1/BreakthroughAdvertisingNotes%20(1)_djvu.txt) | undated | Independent notes, not the book |
| ICP by behaviour; one segment; 60 to 80 percent budget suggestion | [Fletch ICP](https://fletchpmm.com/newsletter/you-re-building-your-icp-wrong) | 2026-03-18 | Vendor data (consultancy) |
| Three positioning strategies | [Fletch](https://fletchpmm.com/newsletter/there-are-only-three-positioning-strategies) | 2026-06-05 | Vendor data |
| H1 tests: clarity, generic, too broad, too lofty | [Fletch H1](https://fletchpmm.com/newsletter/how-to-write-an-h1) | 2026-04-07 | Vendor data |
| Three AI positioning strategies | [Fletch AI](https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning) | 2026-11-07 | Vendor data |
| Path-scoped rules load on Read, Write or Edit of a matching file; rules without paths load at launch; under 200 lines per file; AGENTS.md readable as project instructions | [Claude Code memory docs](https://code.claude.com/docs/en/memory) | fetched 2026-11-27, undated | Platform itself |
| AGENTS.md: root file, nearest wins, plain Markdown, stewarded by Agentic AI Foundation | [agents.md](https://agents.md/) | undated | Authority itself |
| Fleet product-context last commits: 2026-07-26 to 2026-11-26 | `git -C <dir> log -1 --format=%cs -- product-context.md` | measured 2026-11-27 | Measurement |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.aprildunford.com/ | Dunford homepage, positioning definition | 2026 | Primary definition |
| https://www.aprildunford.com/templates | Dunford templates page, 12-page workbook | 2026 | Primary; shows worksheet is gated |
| https://commoncog.com/obviously-awesome/ | Book notes, components, steps, cadence | 2019, updated 2025-01-07 | Fullest retrievable component list (secondary) |
| https://lennysnewsletter.com/p/summary-april-dunford-on-product | Interview summary | 2024-08-13 | Event-driven review (secondary) |
| https://documentdrivendx.github.io/helix/research/geoffrey-moore-positioning/ | Moore slot summary | undated | Seven slots (secondary) |
| https://dn721308.ca.archive.org/0/items/breakthrough-advertising-notes-1/BreakthroughAdvertisingNotes%20(1)_djvu.txt | Reader's notes of Schwartz | undated | Awareness and sophistication rules (secondary) |
| https://jobstobedone.org/ | Four forces definitions | 2026 | Primary for the forces model |
| https://www.christenseninstitute.org/theory/jobs-to-be-done/ | Christensen Institute JTBD page | 2026 | Primary for the job definition |
| https://fletchpmm.com/newsletter/you-re-building-your-icp-wrong | Fletch ICP essay | 2026-03-18 | Behaviour-based segment (vendor) |
| https://fletchpmm.com/newsletter/there-are-only-three-positioning-strategies | Fletch strategies | 2026-06-05 | Style field (vendor) |
| https://fletchpmm.com/newsletter/how-to-write-an-h1 | Fletch H1 | 2026-04-07 | Checkable H1 tests (vendor) |
| https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning | Fletch AI positioning | 2026-11-07 | Trend field (vendor) |
| https://code.claude.com/docs/en/memory | Claude Code memory and rules docs | fetched 2026-11-27 | Primary for load behaviour |
| https://agents.md/ | AGENTS.md spec site | undated | Primary for tool-neutral location |
| `/home/mherwig/dev/grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md` lines 101-118 | Fleet do-not-say list | 2026-11-23 (product-context sibling) | Only fleet list; local read |
| `/home/mherwig/dev/ocx-sh/ocx/.claude/rules/product-context.md` and 6 siblings | Fleet briefs | 2026-07-26 to 2026-11-26 | Measured subject |

Not fetched: Moore's *Crossing the Chasm* text and [the.gt](https://the.gt/geoffrey-moore-positioning-statement/) (connection reset twice); Schwartz's book; Dunford's worksheet (gated); [Cialdini](https://www.cialdini.com/) page opened but unrelated to this topic. Cross-territory notes for siblings: the legal worker owns claim law behind the do-not-say list; the drift worker owns the detection mechanics against surfaces.
