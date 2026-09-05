---
title: Documentation design — page-type contracts (consolidated)
topic: docs-page-types
family: DOC-TYPE
model: claude-opus-5
consolidates:
  - docs-page-types/page-type-set-and-declaration.md
  - docs-page-types/landing-page-contract.md
  - docs-page-types/reference-page-contract.md
  - docs-page-types/how-to-and-explanation-contracts.md
  - docs-page-types/readme-and-changelog-contracts.md
  - docs-topic-map/wave2-declaration-key.md
  - docs-topic-map/wave2-landing-check-portability.md
  - docs-topic-map/wave2-severity-ledger.md
  - docs-topic-map/wave2-calibration-a.md
grounding:
  - docs-audit/config-inventory.md
  - docs-audit/docs-shape.md
  - docs-audit/tested-examples-mechanism.md
  - docs-audit/ux-observability-posture.md
  - docs-frame.md
date: 2026-09-05
revised: 2026-09-05
wave: 2
---

# Page-type contracts

## Verdict

This program ships **nine declared page types**: tutorial, how-to, reference,
explanation, troubleshooting, runbook, landing, readme, changelog. Wave 1 shipped
six. Wave 2 added three, each because a rule already written could not be
expressed without it (`wave2-declaration-key.md` §8). The frame's three-way split
is dead (`docs-frame.md` correction 5).

A page **declares** its type in a comment line inside its first 12 lines, not in
YAML frontmatter. Wave 2 built the fixture and read the rendered HTML on all
three fleet generators. On mdBook 0.5.3 a frontmatter block renders as a
horizontal rule plus a real `<h2>`, and that fake heading enters the search index
with its own anchor. Wave 1 reasoned this from `book.toml`. Wave 2 measured it.

No single comment string works everywhere. The rule ships one key set and one
comment opener per markup family: `<!--` for markdown, `{/*` for MDX, `..` for
reStructuredText, `%` for MyST. An HTML comment is a hard build error in MDX
3.1.1, which Docusaurus 3 applies to plain `.md` by default.

The declaration is never inferred from the directory path. The same content
path-classifies at 0/35 "other" in one repo and 18/23 in another
(`docs-shape.md` §2). Nav labels classify better, at 115 of 122 MkDocs nav pages
(94.3 percent), and they are still only the migration seed. The runtime check
reads file content and nothing else.

Diataxis has no controlled-study basis and its flagship adopter says its first
effect is making docs look worse. We ship it as an enforced contract anyway.
That is a deliberate bet, disclosed rather than smoothed over: the fleet already
carries ~92 prose rules with 2 runnable checks (`config-inventory.md` axis 5),
and one more unenforced opinion changes nothing.

A landing page is not a tenth type. Its opening move stays free (value claim,
definition, command, or title-then-caveat, all four measured in production), and
everything downstream of that move is contracted. Wave 2 replaced the
VitePress-only frontmatter parse with one markdown-structure scan that resolves
on all nine real landing pages with no "cannot verify" case.

A README is not a landing page. Wave 1's path classifier filed all 6 README-only
repos as `landing`, which would have handed them the landing contract by
accident. `readme` is its own type value with its own looser contract, because a
README renders on a forge, not on a site with a hero slot.

Reference converges on **one page per item**. The 2026 evidence moved: Stripe's
resource page is now an index of per-endpoint pages, matching Rust's `std`. The
fleet's 34,298-word single-file CLI reference is the failure mode the split
trigger exists to prevent, not a live alternative.

The tutorial slot is not empty and never was. It lives in another family.
DOC-DISC-17 through DOC-DISC-22 contract the tutorial's branching ban, its
visible-result requirement, its classification test, its walk-through review gate
and its scope caveat. DOC-TYPE-03 adds the shared mixing ban. This file
cross-references them and adds no seventh tutorial rule.

Where the sub-artifacts disagreed, the mechanical formulation won. Where a
number had no source, it ships labelled `argued` and at SHOULD or CONSIDER, never
MUST.

### Documented gaps

These are settled as gaps, not as answers.

1. **The Starlight and Sphinx carriers are unbuilt.** The declaration dive read
   the primary docs for both and built no fixture, because the fleet has neither
   generator. The shipped glob still names `astro.config.*` and `docs/conf.py`.
   Someone builds those two fixtures before the rule claims them
   (`wave2-declaration-key.md`, Contested).
2. **DOC-TYPE-05 was never calibrated by either wave-2 dive.** The calibration
   worker skipped it believing the severity ledger had measured it. The ledger
   measured DOC-PLAIN-07 instead. The rule ships at CONSIDER and its
   false-positive rate against fleet prose is still unknown.
3. **The 9-task-link cap did not survive its own exemplars.** Re-fetched today,
   uv carries 12, GitLab 18, Stripe 30 or more. What survives is grouping, not a
   total. The replacement trigger of roughly 8 is argued, not measured.
4. **Zero fleet pages are tutorials or runbooks.** Both enum values are earned by
   rules that reference them, not by content that exists. Nothing in either
   contract has been run against real content of that type.

## The ruleset

Forty-three IDs. Two are retired in place, so forty-one rules ship. Severity gate:
no rule resting only on `argued` or `asserted` evidence ships above CONSIDER
unless a normative or measured source carries the obligation itself, or the row
says `pinned`.

Rollout, for every rule in this family: enforce at error on changed files from
the first commit, and warn whole-tree until the backfill lands
(`wave2-severity-ledger.md` finding 7). That resolves the DOC-PLAIN-18 conflict
without demoting either rule.

### Declaration

**DOC-TYPE-01 — MUST — applies to: all**
Declare a page's type with a `doc_type` comment line inside the file's first 12
lines, using the comment opener of its markup family.
*Rationale*: an undeclared page cannot be scoped by any other rule in this
family, so every downstream check silently skips it.
*Verify*: `checks/doc-declaration.sh <files>`. It accepts `<!--` for markdown,
`{/*` for MDX, `..` for reStructuredText and `%` for MyST, and exactly nine
type values. Measured 181 of 181 fleet pages failing today, 100 percent
(`wave2-declaration-key.md` §11).
*Evidence*: measured (three generators built and read, plus an MDX 3.1.1
compile) plus normative (Diataxis, GitLab).
*Wave 2*: replaces wave 1's line-1 HTML-comment-only form and its six-value enum.

**DOC-TYPE-02 — MUST — applies to: all**
Read a page's type from its declaration comment only, never from its directory
or file name.
*Rationale*: a path classifier reads one repo cleanly and misses 78 percent of
another with the same kind of content.
*Verify*: `grep -nE 'dirname|basename|\bpath\b' checks/doc-declaration.sh`
returns nothing. The shipped script satisfies this by construction.
*Evidence*: measured (`docs-shape.md` §2, 0/35 versus 18/23 "other"). Nav labels
classify 115 of 122 at 94.3 percent and are still only a one-off seed.

**DOC-TYPE-28 — MUST — applies to: all**
Never write the declaration as YAML frontmatter.
*Rationale*: on mdBook 0.5.3 the block renders as a horizontal rule plus a fake
`<h2>`, and that heading enters the search index with its own anchor.
*Verify*: `grep -lE '^doc_(type|tier):' <docs glob>` returns nothing. Measured on
the built fixture, whose search index carries 9 `doc_type` occurrences across 9
pages (`wave2-declaration-key.md` §2).
*Evidence*: measured (fixture `a-frontmatter.md`, three generators built today).

**DOC-TYPE-29 — MUST — applies to: all**
Never place the declaration comment above an existing frontmatter block.
*Rationale*: frontmatter must start on line 1, so a comment above it turns the
whole block into visible content on all three fleet generators.
*Verify*: a file whose line 1 matches the declaration pattern and whose line 2
is `---` fails.
*Evidence*: measured (fixture `d-both-comment-first.md`, MkDocs, mdBook and
VitePress all broken).

**DOC-TYPE-30 — MUST — applies to: all**
Use `{/* doc_type: V */}` in an `.mdx` file, and set a Docusaurus site's
`markdown.format` to `detect` before putting an HTML comment in any `.md` file.
*Rationale*: `@mdx-js/mdx` 3.1.1 raises "Unexpected character `!` (U+0021)" and
fails the build. Docusaurus 3 defaults `markdown.format` to `mdx` for `.md` too.
*Verify*: `grep -l '<!--' -- '*.mdx'` returns nothing, and
`grep -E "format:\s*['\"](detect|md)['\"]" docusaurus.config.*` finds a line
whenever that config file is present.
*Evidence*: measured (MDX 3.1.1 compile) plus normative (Docusaurus config
reference).

**DOC-TYPE-31 — MUST — applies to: all**
Run this family only over published documentation. Never run it over an agent's
research directory or build output.
*Rationale*: DOC-NAV-01 gates the nav family on a generator config file. This
family had no equivalent gate, so it fires today on this program's own artifacts.
*Verify*: the file list is `git ls-files` under a directory holding a generator
config, plus repo-root `README.md` and `CHANGELOG.md`. Assert the list excludes
`.agents`, `.claude`, `.serena`, `.worktrees` and build output.
*Evidence*: measured (`docs-shape.md` §0, a naive `find` loads 420 Lighthouse
reports and 257 stale worktree files) plus normative (the frame's glob decision).

### Type boundaries

**DOC-TYPE-03 — MUST — applies to: all declared types**
Never let a page declare one type and carry another type's content. A learning
opener that switches to conditional task instructions is the commonest instance.
A walkthrough or a reference table on a landing page is another.
*Rationale*: tutorial and how-to conflation is the failure mode the corpus names
most often. It is also the default shape a model produces for "a guide".
*Verify*: `checks/doc-type-conflation.sh`. On `doc_type: how-to|tutorial` pages,
fail when `grep -ciP "\b(we'll|we're going to|let's (build|create|set up|walk))\b"`
and `grep -ciP "if you (want|need|prefer)\b.{0,40}?\b(run|use|pass|do)\b"` are both
non-zero. On `doc_type: landing` pages, fail on an ordered list over 2 items
(argued) or a table over 3 rows (argued). Measured 0 hits on 248 fleet pages and
0 on ocx's 44 wave-1 pages, and the landing arm hits 12 of 22 landing-classified
pages (`wave2-calibration-a.md` §1).
*Evidence*: measured (`page-type-set-and-declaration.md` §6,
`wave2-calibration-a.md` §1).
*Wave 2*: absorbs DOC-TYPE-16 as its landing clause.

**DOC-TYPE-04 — MUST — applies to: reference**
Write reference prose as description only, with no first person, no narrative
opener, and no problem framing.
*Rationale*: instructional or narrative reference prose is the type-mixing
defect a reader cannot detect until the facts turn out to be wrong.
*Verify*: on `doc_type: reference` pages, outside fences and tables, fail on
`grep -niE "\blet's\b|\bnow that we\b|\byou'll want to\b|\b(we|our)\b"`, and on
`problem|pain point|frustrat|annoying|wasteful|struggle|tedious` in the first
paragraph. Measured 1 hit across 53 reference-classified pages of 248, 0 of 1
false positive (`wave2-calibration-a.md` §1).
*Evidence*: normative (Diataxis) plus measured.

**DOC-TYPE-05 — CONSIDER — applies to: all**
Put opinions, comparisons, and recommendations only in explanation content.
*Rationale*: explanation is the one type licensed to judge, and judgement inside
a how-to or reference page reads as fact.
*Verify*: on non-explanation pages, `grep -niE '\b(is|are) (better|worse|preferable) (than|to)\b|\bwe recommend\b'`.
Never calibrated against fleet prose by either wave-2 dive, so the rate is
unknown.
*Evidence*: normative (Diataxis explanation page) plus asserted pattern.
*Wave 2*: demoted from SHOULD per the severity ledger, because the rule's own
text admits the pattern is uncalibrated.

**DOC-TYPE-06 — CONSIDER — applies to: all**
Keep culture-bound analogies inside explanation content or a skippable callout,
and state the same idea plainly without the analogy.
*Rationale*: an analogy that carries the only explanation locks out a reader who
does not know the compared tool.
*Verify*: require an analogy verb next to the tool name, not a bare mention.
`grep -niE '\b(Nix|APT|Homebrew|SDKMAN)\b.{0,25}\b(like|similar to|think of it as|the way)\b'`
and the mirrored form. Then assert a dated link and a plain sentence in the same
section. The plain-sentence half is `unverified: reading heuristic`, because no
script judges whether two sentences say the same thing. Measured 249 hits over
248 files under the wave-1 bare-mention pattern, 12 of 12 sampled false positives,
all literal install commands (`wave2-calibration-a.md` §1).
*Evidence*: measured conflict sources (Google tone page, Kubernetes style guide,
`ocx/.claude/rules/docs-style.md:54-64`) plus argued resolution.
*Wave 2*: demoted from SHOULD, and the pattern now requires an analogy verb.

**DOC-TYPE-07 — CONSIDER — applies to: how-to, reference**
Allow at most one concept paragraph of 150 words before a how-to or reference
page's own content.
*Rationale*: GitLab expects a bounded concept opener, and an unbounded one turns
every page into an explanation.
*Verify*: word-count the text between the H1 and the first H2 on those pages and
fail over 150 words (measured, 12 of 13 real ocx how-to preambles pass at 150 and
only 9 of 13 pass at 100). Measured 26 hits over the how-to and reference subset
of 248 pages (`wave2-calibration-a.md` §1).
*Evidence*: codified for the allowance (GitLab CTRT), measured for the number
(13 real preambles at 0 to 216 words, median 78,
`how-to-and-explanation-contracts.md` §6).
*Wave 2*: the cap moves from 100 to 150 and stops being asserted.

### Troubleshooting

**DOC-TYPE-08 — SHOULD — applies to: troubleshooting**
Open every troubleshooting entry's title with `Error:` or `Warning:` and its
cause paragraph with "This issue occurs when".
*Rationale*: a generic numbered-steps block is what a model writes instead, and
it buries the message a reader is searching for.
*Verify*: count every entry heading, then assert each one carries the prefix.
`total=$(grep -c '^#\{2,4\} ' p.md); tagged=$(grep -c '^#\{2,4\} \(Error\|Warning\):' p.md); [ "$total" -eq "$tagged" ]`.
Titles over 70 characters (asserted, no source states it) must end in an ellipsis
and carry no link. Measured on all 3 real fleet troubleshooting pages: 3 of 3
show zero tagged entries and zero "This issue occurs when"
(`wave2-calibration-a.md` §1).
*Evidence*: codified (GitLab troubleshooting topic type, re-fetched 2026-09-05)
plus measured for the defect.
*Wave 2*: the wave-1 assertion compared a count to itself and could never fail.
Demoted to SHOULD until the repaired check reports a false-positive rate.

**DOC-TYPE-09 — SHOULD — applies to: troubleshooting, how-to, reference**
Put troubleshooting entries last on a page and move them to their own page at
five or more.
*Rationale*: troubleshooting content in the middle of a page displaces the task
a reader actually came for.
*Verify*: count `^#\{2,4\} \(Error\|Warning\):` headings per page and fail over
four (GitLab states the five-item trigger). Assert the first such heading's line
number exceeds every non-troubleshooting H2's line number. Measured 0 hits over
248 pages, expected because no fleet page carries a tagged entry yet.
*Evidence*: codified (GitLab, same page).

### Landing

**DOC-TYPE-10 — SHOULD — applies to: landing**
Hold a landing page's lead-in positioning prose to one sentence and never stack
two of them.
*Rationale*: a multi-paragraph marketing hero is the default a model writes and
the outlier among fetched exemplars.
*Verify*: word-count the block before the first heading or fenced block. Fail on
more than one sentence terminator (SHOULD, measured across 5 fetched exemplars).
Warn over 30 words (CONSIDER, argued from those same 5 pages). Measured 21 hits
across 22 landing-classified pages of 248 (`wave2-calibration-a.md` §1).
*Evidence*: measured pattern (Stripe, uv, Cloudflare, GitLab versus Laravel),
argued number.

**DOC-TYPE-11 — MUST — applies to: landing**
Give every landing page a runnable command or a link menu before word 150.
*Rationale*: a page that opens with a stability caveat and never resolves to an
action leaves the reader nothing to click.
*Verify*: `checks/landing-cta.py`. Walk the body and take the first of three
shapes. A fenced block, a menu, or a block-level `<a href>` outside a list. A menu
is a run of sibling list items where every item carries a link. Fail past 150 words (reused from
DOC-NAV-06, DOC-DISC-09 and DOC-DISC-16 rather than invented). Exclude
`SUMMARY.md` and point mdBook at its first chapter. Measured on 9 real fleet
landing pages plus 2 controls, 3 fail, 0 report "cannot verify"
(`wave2-landing-check-portability.md` §1).
*Evidence*: measured (`ocx-mcp` at word 186, `ocx-mirror` at word 176,
`grimoire/docs/src/introduction.md` at word 215).
*Wave 2*: the severity ledger says demote to SHOULD because the wave-1 check was
inert on 8 of 9 sites. Kept at MUST, because the portability dive replaced that
check and it now resolves on 9 of 9. The ledger's reason no longer holds.

**DOC-TYPE-12 — SHOULD — applies to: landing**
Cap a landing page at two button-style calls to action.
*Rationale*: an ungrouped stack of seven calls to action gives a reader no
hierarchy to read.
*Verify*: `checks/landing-cta.py`, the same script as DOC-TYPE-11. Count every
frontmatter CTA-array entry and every raw `<a href>` button. Fail over 2 (SHOULD,
re-measured today: uv 2, GitLab 1, Stripe about 3, ocx 7). Separately warn when
ungrouped task links pass roughly 8 without a labelled group (CONSIDER, argued
from uv's smallest grouped section).
*Evidence*: measured failure case (`ocx/website/src/index.md` at 7 CTAs, 3 hero
actions plus 4 footer cards) plus re-fetched exemplars.
*Wave 2*: the fixed 9-task-link cap and the "groups of at most four" clause are
dropped. Re-fetching their own exemplars found 12, 18 and 30-plus task links.

**DOC-TYPE-13 — SHOULD — applies to: landing**
State who the docs are for, either through task-phrased link labels or one
sentence naming the reader.
*Rationale*: a grid labelled with product nouns tells a reader nothing about
whether they are in the right place.
*Verify*: `unverified: reading heuristic` for the classification clause. A
reviewer classifies every grid label as task-phrased or product-noun. A script
asserts only the true-zero case, that at least one grid or one reader-naming
sentence exists. Measured 22 of 22 landing pages reaching the script's true-zero
case (`wave2-calibration-a.md` §1).
*Evidence*: measured (`ux-observability-posture.md` §7, 1 of 9 sites satisfies
the reviewer half).

**DOC-TYPE-14 — MUST — applies to: all**
Never publish placeholder text.
*Rationale*: scaffold copy already reached a published site in this fleet.
*Verify*: `grep -rinE "lorem ipsum|placeholder text|TODO: write|coming soon"` on
every commit touching a docs path. Any match fails the build. Measured 0 hits
across 186 pages today, and the one historical violation is verbatim in a stale
clone (`wave2-calibration-a.md` §1).
*Evidence*: measured (`ocx-save/website/src/index.md:26-39`, verbatim, three
tiles).

**DOC-TYPE-15 — MUST — applies to: all**
Never state an adoption, popularity, or trust claim without a link to its source.
*Rationale*: no site in this fleet carries social proof, so any such claim a model
writes is invented.
*Verify*: `grep -niE 'trusted by (thousands|millions|leading|[0-9,]+\+? (companies|developers|teams))|used by (thousands|leading)|[0-9,]+\+? (companies|developers|teams)'`
and require an adjacent link on every hit. Measured 3 hits over 248 pages under
the wave-1 bare `trusted by` arm, 3 of 3 false positives, all security-trust-model
prose (`wave2-calibration-a.md` §1). The tightened pattern returns 0 on those 3.
*Evidence*: measured (`ux-observability-posture.md` §7, 0 of 9 sites).
*Wave 2*: `trusted by` now requires a following count noun.

**DOC-TYPE-16 — RETIRED, merged into DOC-TYPE-03**
Wave 1 banned walkthrough steps and reference tables on a landing page. That is
the same object as DOC-TYPE-03, a declared type carrying another type's content.
The thresholds move into DOC-TYPE-03's landing arm unchanged. The ID is not
reused.

### Reference

**DOC-TYPE-17 — CONSIDER — applies to: reference**
Give every reference entry a description sentence, a syntax block, a parameter
table, behavioural remarks, error conditions, and one example.
*Rationale*: an entry missing a section is the fleet's own stub pattern, and
sibling entries drift apart across one long authoring pass.
*Verify*: a schema script per top-level entry heading, not per file, asserting a
syntax fence and a multi-row parameter table. The remarks, errors and example
arms are dropped, because they were vocabulary proxies rather than structure
detectors. Measured 649 hits over 658 entries on 53 reference pages, 98.6 percent,
with 10 of 10 sampled hits carrying the missing content in ordinary prose
(`wave2-calibration-a.md` §1).
*Evidence*: codified (Microsoft reference-article table, re-fetched 2026-09-05,
and independently reinvented in `ocx/.claude/agents/worker-doc-writer.md`) plus
measured for the false-positive rate.
*Wave 2*: demoted from MUST past the ledger's SHOULD to CONSIDER, on the measured
98.6 percent rate. A check that fails almost every real reference page cannot gate.

**DOC-TYPE-18 — MUST — applies to: reference**
Derive a reference page's item set and its order from the code's own enumeration,
proven by a test that reads the page.
*Rationale*: an invented or dropped entry is the most damaging reference defect
and the cheapest one to catch mechanically.
*Verify*: a run-time test that parses the page, derives the real list from
`--help` or an enum's `ALL`, and asserts set equality plus per-entry section
presence. Two working implementations, both passing in CI today:
`grimoire/src/install/client_target.rs:748-758` and
`ocx/test/tests/test_doc_command_reference.py`.
*Evidence*: codified (two independent fleet implementations, read in full and
confirmed passing) plus normative (Diataxis, Microsoft).
*Wave 2*: the OpenAPI arm is dropped. No research backed it.

**DOC-TYPE-19 — CONSIDER — applies to: reference**
Split a reference page into one page per item once it passes roughly fifteen
items.
*Rationale*: an agent appends each new command to the existing file, which is how
one page reached 34,298 words.
*Verify*: count top-level entry headings, warn past 15 and fail past 20 (argued,
calibrated on `command-line.md` at 30 commands). Measured 6 hits across 53
reference-classified pages (`wave2-calibration-a.md` §1).
*Evidence*: argued for the item count, calibrated on one measured fleet page.
*Wave 2*: the `#####` heading-depth arm moves to DOC-NAV-05, which owns the
heading cap. What remains is argued only, so the severity drops from SHOULD.

**DOC-TYPE-20 — MUST — applies to: reference**
Surround every generated-reference directive with hand-written framing prose.
*Rationale*: a bare directive is a stub, and generators leak internal detail that
only a human pass removes.
*Verify*: for each file containing a generation directive, word-count the prose
outside it. Fail at 0 words (measured, the real failure case is literally zero).
Warn under 100 words (argued, calibrated on `ocx-sdk-python/docs/reference/api.md`
at 109 words against `ocx-mirror-sdk/docs/api/text.md` at zero). Measured 7 hits
over 248 pages (`wave2-calibration-a.md` §1).
*Evidence*: codified requirement (Microsoft), measured calibration points,
argued warning floor.
*Wave 2*: MUST now attaches to the zero-word floor, not to the argued 100.

**DOC-TYPE-21 — RETIRED, merged into DOC-OBS-01**
Wave 1 required link checking against built output. DOC-OBS-01 states the same
obligation at MUST and holds the measured evidence, the real lychee flags and a
pinned action version. The ID is not reused.

### How-to

**DOC-TYPE-22 — MUST — applies to: how-to**
State the page's goal or scope in prose before its first `##` heading.
*Rationale*: a reader with no framing cannot tell whether the page solves their
problem before reading every step.
*Verify*: word-count the text between the H1 and the first `##`. Fail on zero
words outside inline code and links. Measured 1 violation across 13 real ocx
how-to pages (`how-to-and-explanation-contracts.md` §1).
*Evidence*: measured plus normative (Kubernetes overview section, Good Docs
overview section, GitLab's "Do this task when" intro).

**DOC-TYPE-23 — CONSIDER — applies to: how-to**
State a hard prerequisite before the first step. Use a heading only when three or
more prerequisites apply.
*Rationale*: a step that silently assumes prior setup strands a reader who
skipped it.
*Verify*: `unverified: reading heuristic`. A script cannot tell a true
prerequisite from ordinary context without understanding the task. Measured 0 of
13 pages carry the heading and 1 of 13 states one inline.
*Evidence*: measured plus argued (two of four sources mark the section optional).

**DOC-TYPE-24 — SHOULD — applies to: how-to**
Phrase a fixed-order procedure as numbered reader actions. Use one heading per
choice when the choices are independent, and one fenced command when the task is
a single action.
*Rationale*: forcing every page into one flat numbered list breaks the 8 of 13
fleet pages that correctly describe several independent choices.
*Verify*: `unverified: reading heuristic`. Telling a reader instruction from
third-person system narration is not reliably regexable. Measured 5 of 13 pages
carry a real step sequence and 4 phrase it as reader action, with
`authoring/entry-points.md:129-131` the one narrated exception.
*Evidence*: measured plus codified (GitLab: imperative voice for steps, a single
step is a bullet not a number).

**DOC-TYPE-25 — SHOULD — applies to: how-to**
Close a how-to page with a heading linking to related or next reading.
*Rationale*: a page that solves one task and stops leaves a reader with no path
to the next task.
*Verify*: `grep -niE '^#{2,4} (see also|next steps?|what.?s next|related)'`.
Absence fails. Measured 9 of 13 real ocx how-to pages already comply.
*Evidence*: measured plus codified (Kubernetes "whatsnext", Good Docs "See also").

### Explanation

**DOC-TYPE-26 — SHOULD — applies to: explanation**
Open with a sentence stating what the page explains and, where it applies, why it
matters.
*Rationale*: a reader who does not know what question the page answers cannot
judge whether to keep reading.
*Verify*: `grep -niE 'this (page|guide|section) (explains|covers|describes|states|is (the|exactly))'`
in the text before the first `##`. Absence warns rather than fails, because the
check catches one phrasing of a broader requirement. Measured 12 of 14 real ocx
explanation pages comply, with `in-depth/ci.md` and `in-depth/lazy-loading.md`
the two named exceptions.
*Evidence*: measured plus normative (GitLab's two-question test, Good Docs
definition section, Kubernetes overview section).

**DOC-TYPE-27 — SHOULD — applies to: explanation**
Do not write a numbered sequence of dependent reader actions as explanation
content. Narrate the mechanism in third person, or link the how-to that owns the
procedure.
*Rationale*: order-dependent instructions belong in a how-to a reader can follow
on their own.
*Verify*: `unverified: reading heuristic`. A blanket ban on numbered lists is
wrong on 3 of 5 real fleet instances, because mechanism narration and order-free
tip lists are legitimate. Measured 2 of 14 pages violate
(`in-depth/indices.md:230-241`, `in-depth/cosign-parity.md:183-188`) and 3 of 14
carry a numbered list that must not be flagged.
*Evidence*: measured plus normative (GitLab bans procedural steps in Concept
pages, Diataxis says steps interfere with the explanation).

### README

**DOC-TYPE-32 — MUST — applies to: readme**
Put the project's plain-language description before any content that is not
descriptive metadata. A logo, a badge row and a table of contents may precede it.
A sponsor table, a funding appeal or a feature list may not.
*Rationale*: a reader who cannot find out what the project is has no reason to
read the rest.
*Verify*: strip a leading centered-image block, a contiguous run of badge-only
lines, and a table of contents. The next non-blank line must be prose of at least
one sentence, and it must precede the file's first table.
*Evidence*: measured (axios's README opens with two sponsor tables, fetched
2026-09-05) plus codified (Good Docs Core Pack README template).

**DOC-TYPE-33 — SHOULD — applies to: readme**
Name or link the one action that takes a new reader from zero to using the
project.
*Rationale*: this is a README's version of the landing page's reachable-action
contract. It is widened because the fleet ships CLI installs, Bazel snippets,
Action `uses:` lines and marketplace links.
*Verify*: a fenced code block under a heading matching
`/install|quick.?start|usage|get(ting)? started/i`, or a markdown link whose
visible text matches the same pattern.
*Evidence*: measured (15 of 15 fleet READMEs over 100 lines and 7 of 7 fetched
external READMEs already satisfy it).

**DOC-TYPE-34 — SHOULD — applies to: readme**
Link the project's own documentation site when one exists, instead of growing a
second copy of it.
*Rationale*: duplicated content forks into two answers the first time one side is
edited alone.
*Verify*: for a repo whose tree carries `mkdocs.yml`, `.vitepress` or
`book.toml`, the README must contain a link whose host matches that generator's
deploy target.
*Evidence*: measured (9 of 9 generator-having fleet repos already satisfy it,
confirmed directly, not sampled).

**DOC-TYPE-35 — SHOULD — applies to: readme**
State or link a license.
*Rationale*: Good Docs, Make a README and GitHub's community-profile checklist
all name it, and it is already the fleet's near-universal norm.
*Verify*: a `## License` heading, or a `LICENSE` file in the repo root plus a
mention of it in the README.
*Evidence*: measured (14 of 15 fleet READMEs satisfy it, and the one gap is this
program's own repository).

**DOC-TYPE-36 — CONSIDER — applies to: readme**
State who the project is for, in one sentence or through task-labelled links,
separately from stating what it does.
*Rationale*: a reader can know exactly what a tool does and still not know
whether they are the intended user.
*Verify*: `unverified: reading heuristic`. A reviewer checks whether the first
paragraph or the next one names a reader role, a prerequisite or a problem the
reader has.
*Evidence*: argued. The 15 fleet READMEs were never re-read against this specific
sentence, so no rate exists.

### CHANGELOG

**DOC-TYPE-37 — SHOULD — applies to: changelog**
Spell every category heading exactly as Keep a Changelog states it: `Added`,
`Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Never require all six.
*Rationale*: training data carries many changelog dialects, and a rule demanding
all six would fail every changelog in this fleet.
*Verify*: every `###`-level heading inside a version section matches the fixed
list case for case, or is `Unreleased` or a bare version heading.
*Evidence*: normative for the spelling (Keep a Changelog 1.1.0, re-fetched
2026-09-05). Measured for the ceiling: 0 of 11 fleet files ever produce the other
three, traced to a `cliff.toml` commit-parser gap.

**DOC-TYPE-38 — SHOULD — applies to: changelog**
Never let a version section be a re-rendered commit log.
*Rationale*: Keep a Changelog states this as an explicit don't, and its founding
principle is that changelogs are for humans.
*Verify*: `unverified: reading heuristic`. Flag a version section where every
line matches a Conventional Commits prefix verbatim with no rewrite.
*Evidence*: normative for the obligation, argued for the check.

**DOC-TYPE-39 — SHOULD — applies to: changelog**
State a migration path in every entry marked breaking. Inline prose, an explicit
"no migration needed", or a link to a separate guide all satisfy it. A file path
named inside that statement must be a real markdown link.
*Rationale*: inline migration prose beside the entry beats a separate page. There
is no extra click, no second file to keep in sync and no dead-link risk.
*Verify*: for every line matching `\*\*BREAKING\*\*`, the next 1 to 3 lines must
contain migration prose of at least one sentence, an explicit "no migration"
statement, or a markdown link. Resolve any link with DOC-OBS-02's checker rather
than a second one. A bare filename inside the statement fails.
*Evidence*: measured (23 of 23 breaking entries in `grimoire/CHANGELOG.md` and
`grimoire-indexer/CHANGELOG.md` carry inline migration prose, 0 carry a link, 2
carry a bare filename).
*Wave 2*: this closes `changelog-migration-link`. The map asked whether each
breaking entry links a migration guide. The measured answer is that it should not
have to.

**DOC-TYPE-40 — MUST — applies to: changelog**
Never gate a build on the presence of an `## [Unreleased]` heading.
*Rationale*: a `git-cliff` generator correctly omits it between a release and the
next merged commit, so the check would misfire on a compliant repo.
*Verify*: no script in `checks/` fails a build for a missing `Unreleased`
heading. If the signal is wanted, it belongs to a release-preparation step.
*Evidence*: measured (10 of 11 fleet changelogs carry none right now and every one
of them is compliant).

**DOC-TYPE-41 — SHOULD — applies to: changelog**
Credit Keep a Changelog when the file uses its template sentence.
*Rationale*: borrowing a template sentence and dropping its citation is the same
defect as DOC-TYPE-06's uncited analogy.
*Verify*: `grep -l "All notable changes to this project"` matching with
`grep -L 'keepachangelog.com'` also matching is a failure.
*Evidence*: measured (9 of 11 fleet files cite it, 2 use the sentence uncredited).

### CONTRIBUTING

CONTRIBUTING pages declare `doc_type: how-to`. The fleet's 10 contributing pages
are task pages, and a separate enum value would buy no rule
(`wave2-declaration-key.md` §8). These two rules scope by filename intent, not by
a new type value.

**DOC-TYPE-42 — CONSIDER — applies to: how-to**
On a CONTRIBUTING file, state prerequisites, setup, how to run the tests, the
commit convention, and a before-you-submit checklist, in that order.
*Rationale*: three fleet files converge on exactly this order, independently
authored.
*Verify*: `unverified: reading heuristic` for the ordering judgement. A script
reports which of five heading patterns are missing rather than one pass or fail,
because a thin project may legitimately skip one.
*Evidence*: measured on 3 of the fleet's 20 CONTRIBUTING files, read in full. The
other 17 were not read.

**DOC-TYPE-43 — CONSIDER — applies to: how-to**
Never open a CONTRIBUTING file with marketing or onboarding-sell content.
*Rationale*: its reader has already decided to contribute, so re-selling the
project wastes the one thing they came for.
*Verify*: the first heading-level element must be a setup step, never an image or
a badge line.
*Evidence*: measured on the same 3 of 20 files, all of which open exactly this way.

## Applied to the fleet

Every hit count below is from `wave2-calibration-a.md` §1 unless noted, run over
the 248-page fleet corpus.

### Measured, calibrated, keep as written

| Rule | Files scanned | Hits | Sampled FP rate |
|---|---|---|---|
| DOC-TYPE-01 | 248 (181 in the restricted glob) | 248 (181/181 restricted) | 0/10, a real gap, no page declares anything |
| DOC-TYPE-03 | 248 | 0 conflation, 12 landing-mix | 0/0, no sample to draw |
| DOC-TYPE-04 | 248 (53 reference) | 1 | 0/1 |
| DOC-TYPE-09 | 248 | 0 | 0/0 |
| DOC-TYPE-10 | 248 (22 landing) | 21 | count is unambiguous |
| DOC-TYPE-14 | 186 | 0 | n/a |
| DOC-TYPE-18 | 2 implementations | both pass in CI | verified by reading |
| DOC-TYPE-19 | 248 (53 reference) | 6 | count is unambiguous |
| DOC-TYPE-20 | 248 | 7 | count is unambiguous |

### Measured, and the check changed as a result

| Rule | Files scanned | Hits | Sampled FP rate | What changed |
|---|---|---|---|---|
| DOC-TYPE-06 | 248 | 249 | 12/12 | Requires an analogy verb next to the tool name. Demoted to CONSIDER |
| DOC-TYPE-07 | 248 (how-to plus reference) | 26 | count is unambiguous | Cap moved from 100 to 150 words on 13 measured preambles |
| DOC-TYPE-08 | 3 real troubleshooting pages | 3 of 3 non-compliant | n/a | Assertion made non-circular. Demoted to SHOULD |
| DOC-TYPE-11 | 9 landing pages plus 2 controls | 3 fail | 0 "cannot verify" | Frontmatter parse replaced by a markdown scan. MUST kept |
| DOC-TYPE-12 | same 11 | 1 fails the CTA cap | n/a | 9-link cap and groups-of-4 dropped |
| DOC-TYPE-15 | 248 | 3 | 3/3 | `trusted by` now needs a count noun |
| DOC-TYPE-17 | 248 (658 entries on 53 pages) | 649 (98.6%) | 10/10 | Keyword arms dropped. Demoted to CONSIDER |

### Violated today

| Rule | Violation |
|---|---|
| DOC-TYPE-01, 02, 28 to 31 | 181 of 181 pages in the restricted glob carry no declaration. Migration is 325 to 358 added lines across 248 files, one commit (`wave2-declaration-key.md` §12) |
| DOC-TYPE-06 | `ocx/.claude/rules/docs-style.md:54-64` mandates Nix store, APT, SDKMAN and Homebrew Cellar analogies. It satisfies the callout half and fails the citation and plain-language halves |
| DOC-TYPE-11 | `ocx-mcp/docs/index.md` reaches its first action at word 186, `ocx-mirror/docs/index.md` at 176, `grimoire/docs/src/introduction.md` at 215 |
| DOC-TYPE-12 | `ocx/website/src/index.md` runs 7 calls to action, 3 hero actions plus 4 footer cards |
| DOC-TYPE-17 | 649 of 658 real reference entries miss at least one required section under the wave-1 check |
| DOC-TYPE-19 | `ocx/website/src/docs/reference/command-line.md` is 30 commands and 34,298 words in one file |
| DOC-TYPE-20 | `ocx-mirror-sdk/docs/api/text.md` is one heading plus one directive with zero framing words |
| DOC-TYPE-22 | `ocx/website/src/docs/authoring/testing.md` opens with zero words before its first `##` |
| DOC-TYPE-25 | 4 of 13 how-to pages carry no closing link heading, all under `user-guide/` plus `docker.md` |
| DOC-TYPE-26 | `in-depth/ci.md` and `in-depth/lazy-loading.md` never state what they explain |
| DOC-TYPE-27 | `in-depth/indices.md:230-241` and `in-depth/cosign-parity.md:183-188` are how-to content inside explanation pages |
| DOC-TYPE-35 | `grimoire-lore`, this program's own repository, has neither a License section nor a LICENSE file |
| DOC-TYPE-41 | `www-setup` and `setup-ocx` use Keep a Changelog's template sentence with no citation |

### Already satisfied

| Rule | Evidence |
|---|---|
| DOC-TYPE-03 | 0 hits for the conflation opener across 248 fleet pages and ocx's 44 wave-1 pages |
| DOC-TYPE-04 | 1 hit across 53 reference pages, and reading it confirms a true positive |
| DOC-TYPE-13 | `ocx-catalog/docs/index.md:19-30` states its audience through task-keyed cards |
| DOC-TYPE-15 | 0 of 9 sites carry any real social proof |
| DOC-TYPE-18 | `grimoire/src/install/client_target.rs:748-758` and `ocx/test/tests/test_doc_command_reference.py`, both passing in CI |
| DOC-TYPE-32 | 15 of 15 fleet READMEs over 100 lines state their description in the first paragraph |
| DOC-TYPE-33 | 15 of 15 fleet READMEs and 7 of 7 fetched external READMEs carry an install path |
| DOC-TYPE-34 | 9 of 9 generator-having fleet repos link their docs site |
| DOC-TYPE-37 | 11 of 11 fleet changelogs spell their category headings exactly |
| DOC-TYPE-39 | 23 of 23 breaking entries already carry inline migration prose |
| DOC-TYPE-40 | 10 of 11 fleet changelogs carry no `Unreleased` heading and every one is compliant |
| DOC-TYPE-42, 43 | 3 of 3 CONTRIBUTING files read in full match the shape |

### New commitments, nothing in the fleet does these

DOC-TYPE-01, 02, 05, 07, 08, 09, 10, 16, 23, 28 to 31, 36, 38.
`config-inventory.md` axis 4 confirms no repo has AI config for landing-page
anatomy, a named reference-page contract, or a page-type rule of any kind.

## AI-agent failure modes

Ranked by how often it bites, merged across the five sub-artifacts.

1. **Writes YAML frontmatter.** Frontmatter is overwhelmingly the shape in
   training data. On mdBook it ships a fake heading into the search index.
   Caught by DOC-TYPE-28.
2. **Puts the declaration comment above existing frontmatter.** The agent obeys
   "first line" literally and destroys the frontmatter the page already had.
   Caught by DOC-TYPE-29.
3. **Invents an enum value.** `doc_type: guide`, `overview` and `api` are all
   commoner in training data than `explanation`. Caught by DOC-TYPE-01, whose
   check reads an invented value as no declaration at all.
4. **Puts a tier where a type belongs.** `doc_type: getting-started` is the most
   likely single mistake, because it is the fleet's own nav label on three sites.
   Caught by DOC-TYPE-01.
5. **Collapses tutorial and how-to into one "guide".** A learning opening that
   drops into task conditionals mid-page. Caught by DOC-TYPE-03.
6. **Over-explains inside task or fact content.** Contextualizing leaks
   explanation-type judgement into how-to and reference prose. Caught by
   DOC-TYPE-04 and DOC-TYPE-05.
7. **Writes a marketing hero landing page.** Caught by DOC-TYPE-10 and the
   landing arm of DOC-TYPE-03.
8. **Invents flags, parameters, and exit codes.** Reference is the type most
   exposed to interpolation from memory. Caught by DOC-TYPE-18.
9. **Ships the raw generation directive as a finished page.** Caught by
   DOC-TYPE-20.
10. **Copies a changelog category name from memory.** `Bugfixes` for `Fixed`, or
    `Breaking Changes` as a heading instead of a per-entry marker. Caught by
    DOC-TYPE-37.
11. **States a migration as a vague forward pointer.** "See the docs for
    migration steps" instead of the concrete before and after this fleet already
    writes. Caught by DOC-TYPE-39.
12. **Writes the README last, from memory of what the project should say.** It
    produces a generic pitch instead of the real install command and the real
    docs URL. Caught by DOC-TYPE-32 and DOC-TYPE-33.
13. **Skips the citation when borrowing a template sentence.** Keep a Changelog's
    header reads like public-domain boilerplate. Two fleet repos already did it.
    Caught by DOC-TYPE-41.
14. **Fabricates social proof.** Caught by DOC-TYPE-15.
15. **Opens a how-to straight into steps.** No framing sentence, so the reader
    cannot tell whether the page is theirs. Caught by DOC-TYPE-22.
16. **Numbers a procedure that narrates the system instead of instructing the
    reader.** One fleet page in six with real steps does this. Caught by
    DOC-TYPE-24.
17. **Folds a how-to into an explanation page** as a numbered walkthrough. Two
    fleet pages do it today. Caught by DOC-TYPE-27.
18. **Writes generic numbered steps for troubleshooting** instead of the message,
    cause, fix shape. Caught by DOC-TYPE-08.
19. **Appends forever to one reference file.** Caught by DOC-TYPE-19.
20. **Reads the type from the directory.** Asked to check a reference-scoped rule,
    it writes `if "reference" in path`. Caught by DOC-TYPE-02's meta-check.
21. **Re-explains the whole project inside CONTRIBUTING**, because "be thorough"
    reads as "restate the pitch". Caught by DOC-TYPE-43.
22. **Drifts section coverage between sibling entries** in one authoring pass.
    Caught by DOC-TYPE-17 run per entry.
23. **Leaves scaffold placeholders.** Caught by DOC-TYPE-14.
24. **Uses an HTML comment in an `.mdx` file**, and the build fails with a parser
    error that never mentions documentation. Caught by DOC-TYPE-30.
25. **Cites a source it never loaded.** `diataxis.fr/complex-hierarchies/` 404s
    and was confirmed 404 twice again on 2026-09-05, yet its content circulates
    from cache. DOC-TYPE-06's citation requirement is the only rule here that
    touches this, and it is not enough on its own.

## Open questions

### Needs a human decision

1. **Does this supersede `ocx/.claude/rules/docs-style.md:54-64`?** Already
   flagged as the owner's in `docs-frame.md` decision 2. DOC-TYPE-06 keeps the
   analogies and adds two obligations, so adoption is cheap. It still edits a
   rule this program said it would not touch.
2. **Is troubleshooting a page type or a section shape?** GitLab treats it as a
   topic type that sits inside other pages until it grows past five items. This
   ruleset promotes it to a declared page type, which is a stronger claim than
   the source makes.
3. **Does `grimoire-lore` add a LICENSE file?** It is the one measured gap under
   DOC-TYPE-35, in the repository generating this rule set.
4. **Does CONTRIBUTING get a full contract or the thin one shipped here?** Only
   3 of the fleet's 20 CONTRIBUTING files were read in full. DOC-TYPE-42 and 43
   ship at CONSIDER because of that, not because the shape is doubted.
5. **Who adds the `## See also` heading to `user-guide/*.md` and `docker.md`?**
   That takes how-to compliance with DOC-TYPE-25 from 9 of 13 to 13 of 13 in an
   afternoon, using a convention `authoring/*.md` already carries.

### Deserves another research round

- **`explanation-boundary-calibration`** — DOC-TYPE-05's opinion grep has still
  never been run against real prose. Both wave-2 calibration workers skipped it
  in the belief the other had measured it. What is its false-positive rate on 248
  pages, especially against "we recommend" inside legitimate how-to guidance?
- **`starlight-and-sphinx-declaration-fixtures`** — the `%` and `..` carriers rest
  on primary documentation, not on a built site. Build both before the glob keeps
  claiming those generators.
- **`imperative-versus-narrated-classifier`** — DOC-TYPE-24 and DOC-TYPE-27 are
  both reading heuristics for the same distinction. A small classifier reading
  subject pronoun and verb person, rather than a verb allowlist, might make them
  mechanical.
- **`readme-audience-sentence-measurement`** — DOC-TYPE-36 ships at CONSIDER
  because nobody scored the 15 fleet READMEs against "does it name who this is
  for". That measurement moves the rule honestly.
- **`readme-vs-landing-cross-link-contract`** — 17 of 23 fleet repos carry both a
  README and a separate landing page. Nothing states whether one must link the
  other, or what happens when they disagree about the same project.
- **`snippet-include-aware-command-detection`** — every "first fenced block" check
  in this family misreads VitePress `<<<` and MkDocs `--8<--` includes. On
  `ocx/website/src/docs/getting-started.md` a naive scan reads 2019 words against a
  confirmed 185. DOC-TYPE-07, 10 and 11 all inherit this blind spot.
- **`landing-budget-measurement`** — supersede DOC-TYPE-12's remaining argued
  grouping trigger with click or search data once `docs-observability`'s
  instrumentation exists. The fleet has zero analytics today.

## Conflicts resolved

1. **Four types versus three versus five versus twenty-five versus nine.** Ship
   nine. The four canonical types, GitLab's fifth, and four more that existing
   rules already reference by name. No value is speculative, and each row in
   `wave2-declaration-key.md` §8 names the rule that needs it.
2. **Diataxis as a proven contract versus an unvalidated diagnostic.** Ship it as
   an enforced contract with the gap disclosed.
3. **Culture-bound analogies mandated versus banned.** Confine them to explanation
   or a skippable callout, require a dated citation, and require a plain sentence
   that does not depend on the analogy.
4. **Landing opens with a hero, a command, or a caveat.** All four measured moves
   stay legal. The contract binds what comes after the move, not the move.
5. **Reference as one long page versus one page per item.** Per item. Stripe moved
   to standalone per-endpoint pages by this era, matching Rust's `std`.
6. **GitLab's CTRT tolerates in-page mixing, Diataxis implies one type per page.**
   Keep the declaration at file granularity and permit one bounded concept
   preamble, now capped at a measured 150 words.
7. **Which declaration carrier.** Resolved to the comment, on rendered evidence
   rather than reasoning. mdBook does not merely render the frontmatter block, it
   indexes a fabricated heading and gives it a URL. DOC-DISC-13, DOC-DISC-17 and
   DOC-OBS-05 all move to the same carrier.
8. **How to enforce the generated-reference review.** The word-count floor wins
   over a PR-description field, because every rule here carries a verification and
   a PR-template field is a process gate nothing checks.
9. **Whether a landing rule may mandate a shape.** The opening move is free and
   everything downstream is contracted.
10. **Rollout: DOC-PLAIN-18 versus DOC-TYPE-01.** Resolved by scope, not severity.
    Both keep MUST. Every rule enforces on changed files from day one and warns
    whole-tree until backfill lands.
11. **Is `runbook` a type, a subtype, or a third key?** A type value. A
    troubleshooting page is an error catalogue keyed by a symptom, and a runbook
    is an ordered procedure. They share no required sections. DOC-OBS-05's
    `docs/runbooks/**` path glob is deleted, because it matches nothing and
    violates DOC-TYPE-02.
12. **Is a README a landing page?** No. A README renders on a forge, not on a site
    with a hero slot, and 17 of 23 repos carry both saying different things. The
    landing family's `applies to` column never grows to include `readme`.
13. **Does each breaking changelog entry link a migration guide?** No. The fleet's
    23 measured breaking entries all state migration inline, which is the better
    shape. The rule requires a stated migration path, not a link.
14. **Can nav position replace a per-page tier key?** No. Zero of nine fleet sites
    can produce all three tier values from nav config. Nav labels do seed the type
    value on 115 of 122 pages, so nav is the migration seed and never the runtime
    source.

## Revision log

Wave 2, 2026-09-05. One line per change.

- **DOC-TYPE-01** rewritten. The carrier is now a comment line in the first 12
  lines with one opener per markup family, and the enum grows from six values to
  nine. Reason: `wave2-declaration-key.md` built and read the fixture on three
  generators and compiled the same syntaxes with MDX 3.1.1.
- **DOC-TYPE-01** verification replaced with `checks/doc-declaration.sh` and the
  measured 181 of 181 failure rate. Reason: the wave-1 `grep -L` was written, not
  run.
- **DOC-TYPE-02** verification retargeted at `checks/doc-declaration.sh` and given
  the 94.3 percent nav-seed figure. Reason: the named script changed.
- **DOC-TYPE-03** generalised to any declared type and given DOC-TYPE-16's landing
  thresholds. Reason: severity-ledger overlap 4, three rules with one object.
- **DOC-TYPE-05** demoted SHOULD to CONSIDER. Reason: the severity ledger's G1
  gate, and the rule's own text admits the pattern is uncalibrated.
- **DOC-TYPE-06** demoted SHOULD to CONSIDER, and the pattern now requires an
  analogy verb adjacent to the tool name. Reason: measured 249 hits over 248
  files with 12 of 12 sampled false positives, all literal install commands.
- **DOC-TYPE-07** cap moved from 100 to 150 words and relabelled measured. Reason:
  13 real how-to preambles run 0 to 216 words with a median of 78, and 100 failed
  4 pages carrying real motivation. This closes `concept-preamble-cap`.
- **DOC-TYPE-08** demoted MUST to SHOULD and its assertion made non-circular.
  Reason: the wave-1 check compared a count to itself and could never fail.
- **DOC-TYPE-08** given the measured 3 of 3 fleet troubleshooting pages. Reason:
  this closes `troubleshooting-retrofit-cost`, which asked for exactly that run.
- **DOC-TYPE-10** split by evidence. The one-sentence arm stays SHOULD, the
  30-word arm ships CONSIDER and labelled argued. Reason: severity ledger.
- **DOC-TYPE-11** verification replaced with a generator-neutral markdown scan,
  and MUST kept against the ledger's demotion. Reason: the ledger demoted it for
  being inert on 8 of 9 sites, and the portability dive removed that condition.
  Recorded as a deliberate disagreement.
- **DOC-TYPE-11** rationale example narrowed to `ocx-mcp`. Reason: wave 1 claimed
  `ocx-sdk-python` reaches no action, and reading the primary source shows a
  linked menu at word 79.
- **DOC-TYPE-12** keeps the 2-CTA cap at SHOULD and drops the 9-task-link number
  and the groups-of-four clause. Reason: re-fetching its own exemplars found uv at
  12 links, GitLab at 18 and Stripe past 30.
- **DOC-TYPE-13** given the literal `unverified: reading heuristic` marker.
  Reason: DOC-AGENT-16, which the wave-1 row violated.
- **DOC-TYPE-15** pattern tightened so `trusted by` needs a following count noun.
  Reason: 3 of 3 real fleet hits were security-trust-model prose.
- **DOC-TYPE-16** RETIRED, merged into DOC-TYPE-03. Row kept, number not reused.
- **DOC-TYPE-17** demoted MUST to CONSIDER and its keyword arms dropped. Reason:
  the wave-1 check fires on 649 of 658 real entries, and 10 of 10 sampled hits
  carry the content in prose. The ledger said SHOULD before this rate was known.
- **DOC-TYPE-18** OpenAPI arm dropped, and the two implementations cited by line.
  Reason: no research backed the OpenAPI arm, and both fleet tests were confirmed
  passing.
- **DOC-TYPE-19** demoted SHOULD to CONSIDER and its `#####` arm moved to
  DOC-NAV-05. Reason: severity-ledger overlap 7. What remains is argued only.
- **DOC-TYPE-20** MUST now attaches to the zero-word floor, with the 100-word
  floor warning. Reason: the measured failure case is literally zero words, and
  the 100 was argued.
- **DOC-TYPE-21** RETIRED, merged into DOC-OBS-01. Row kept, number not reused.
- **DOC-TYPE-22 to 27 NEW.** The how-to and explanation contracts, severities set
  by rates measured on 13 how-to and 14 explanation pages.
- **DOC-TYPE-28 to 31 NEW.** The declaration mechanics that wave 1 never tested:
  no frontmatter, never above frontmatter, the MDX and Docusaurus carriers, and
  the published-docs-only scope gate.
- **DOC-TYPE-32 to 36 NEW.** The README contract, which the shipped glob already
  claimed and no rule governed.
- **DOC-TYPE-37 to 41 NEW.** The CHANGELOG contract, including the negative rule
  banning an `Unreleased` presence gate.
- **DOC-TYPE-42, 43 NEW.** The CONTRIBUTING shape, at CONSIDER because only 3 of
  20 fleet files were read.
- **Verdict** rewritten for nine types, the measured carrier, the closed tutorial
  slot, and four documented gaps.
- **Open questions** lost `tutorial-contract`, `concept-preamble-cap`,
  `troubleshooting-retrofit-cost`, `declaration-portability-beyond-markdown`, the
  day-one adoption question and the argued-landing-numbers question. Each is
  answered above or moved into the gap list.
- **Applied to the fleet** now carries calibration hit counts and sampled
  false-positive rates on every measured row.

## Sub-artifacts

- [page-type-set-and-declaration.md](docs-page-types/page-type-set-and-declaration.md)
  — wave 1. The five-type set, the `doc_type` comment and why not frontmatter, the
  mixing check tested at 0 false positives across 44 real pages, and the analogy
  conflict.
- [landing-page-contract.md](docs-page-types/landing-page-contract.md) — wave 1.
  Five fetched landing pages, four opening moves, the split CTA and task-link
  budgets, and the placeholder grep.
- [reference-page-contract.md](docs-page-types/reference-page-contract.md) — wave
  1. The fixed section set, the mirror-the-code parity gate, the split threshold,
  and the generated-reference review floor.
- [how-to-and-explanation-contracts.md](docs-page-types/how-to-and-explanation-contracts.md)
  — wave 2. Six new rules from four primary sources, every check run against 27
  real ocx pages. Measures the 150-word preamble cap and closes the tutorial slot.
- [readme-and-changelog-contracts.md](docs-page-types/readme-and-changelog-contracts.md)
  — wave 2. The README, CHANGELOG and CONTRIBUTING contracts, measured on 15
  READMEs, 11 changelogs and 20 contributing files. Proves README is not landing.
- [wave2-declaration-key.md](docs-topic-map/wave2-declaration-key.md) — wave 2,
  cross-cutting. The rendered fixture on three generators, the MDX compile, the
  nine-value enum, and the 248-page migration price.
- [wave2-landing-check-portability.md](docs-topic-map/wave2-landing-check-portability.md)
  — wave 2, cross-cutting. The generator-neutral landing scan, the re-derived CTA
  and link numbers, and the correction to wave 1's `ocx-sdk-python` claim.
- [wave2-severity-ledger.md](docs-topic-map/wave2-severity-ledger.md) — wave 2,
  cross-cutting. Every DOC-TYPE row passed through the program's own six gates.
- [wave2-calibration-a.md](docs-topic-map/wave2-calibration-a.md) — wave 2,
  cross-cutting. Every runnable DOC-TYPE check run over 248 pages with sampled
  false-positive rates and a planted-violation proof.

## Key sources

| URL | Why |
|---|---|
| https://diataxis.fr/map/ | The four types and the two-axis compass, in the framework's own words |
| https://diataxis.fr/tutorials-how-to/ | The conflation failure mode DOC-TYPE-03 checks for |
| https://diataxis.fr/how-to-guides/ | The title-states-the-goal rule behind DOC-TYPE-22 |
| https://diataxis.fr/reference/ | "Mirror the structure of the product" and the austere-tone contract |
| https://diataxis.fr/explanation/ | The why-question framing and the "steps interfere" line behind DOC-TYPE-26 and 27 |
| https://docs.gitlab.com/development/documentation/topic_types/ | The fifth type, and the explicit statement that in-page mixing is expected |
| https://docs.gitlab.com/development/documentation/topic_types/task/ | The imperative-steps requirement behind DOC-TYPE-24 |
| https://docs.gitlab.com/development/documentation/topic_types/concept/ | The two-question test and the ban on numbered instructions in concept pages |
| https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/ | The error, cause, fix contract behind DOC-TYPE-08 and 09, re-fetched 2026-09-05 |
| https://learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation | The reference-article section table and the autogeneration review warning |
| https://kubernetes.io/docs/contribute/style/page-content-types/ | Per-type section skeletons with explicit Diataxis credit |
| https://kubernetes.io/docs/contribute/style/style-guide/ | The jargon and idiom ban for non-native readers |
| https://developers.google.com/style/tone | The global-audience and pop-culture-reference ban |
| https://thegooddocsproject.dev/template/how-to/ | The "See also" closing section behind DOC-TYPE-25 |
| https://thegooddocsproject.dev/template/concept/ | The definition-first structure behind DOC-TYPE-26 |
| https://www.thegooddocsproject.dev/template/readme | The canonical README structure behind DOC-TYPE-32 to 36 |
| https://www.makeareadme.com/ | A second independently worded README template converging on the same core |
| https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories | The seven health files GitHub itself checks for |
| https://keepachangelog.com/en/1.1.0/ | The six categories, the Unreleased convention and the explicit don'ts, verbatim |
| https://github.com/axios/axios | The fetched counter-example behind DOC-TYPE-32, two sponsor tables before the description |
| https://mdxjs.com/docs/what-is-mdx/ | States the `{/* */}` requirement that makes DOC-TYPE-30 necessary |
| https://docusaurus.io/docs/api/docusaurus-config#markdown | The `format: 'mdx'` default that turns a plain `.md` page into an MDX file |
| https://myst-parser.readthedocs.io/en/latest/syntax/typography.html | The `%` comment syntax for Sphinx markdown |
| https://rust-lang.github.io/mdBook/format/mdbook.html | Documents every supported extension and never front matter |
| https://docs.stripe.com/api/charges/create | Primary evidence that Stripe's reference is now per-endpoint |
| https://doc.rust-lang.org/std/index.html | Machine-generated per-item reference at standard-library scale |
| https://docs.astral.sh/uv/ | One-sentence hero, action before pitch, and the re-counted 2 CTAs against 12 task links |
| https://atlassian.design/foundations/content/designing-messages/empty-state | Re-fetched twice. It gives a CTA label length and no button count |
| https://insidegovuk.blog.gov.uk/2013/09/20/top-task-links-updated-guidance/ | The "very sparingly" rationale with no number |
| https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework | The direct source for Diataxis having no controlled-study basis |
| https://ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation | "Makes existing documentation look worse, not better" |
