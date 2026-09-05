---
title: Documentation design, wave 2 calibration (worker B)
topic: check-false-positive-calibration
group: docs-plain-english, docs-navigation-search, docs-examples, docs-machine-readers-and-prior-art
wave: 2
agent: wave2-calibration-b
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 34
scope: >
  Worker B of two on the check-false-positive-calibration commission. Measures
  every DOC-PLAIN, DOC-NAV, DOC-EX and DOC-AGENT rule whose status in
  wave2-severity-ledger.md §3 is runnable-as-written or script-to-be-written,
  against the fleet's 249-file corpus (23 surfaces, docs-shape.md scope).
  Does not re-measure DOC-PLAIN-07, DOC-OBS-08, DOC-TYPE-05 or DOC-TYPE-14,
  already measured in wave2-severity-ledger.md §4. Skips circular, inert and
  reading-heuristic rows with a one-line disposition each.
revises:
  - docs-plain-english.md
  - docs-navigation-search.md
  - docs-examples.md
  - docs-machine-readers-and-prior-art.md
  - wave2-severity-ledger.md
---

# Wave 2 calibration, worker B

## Contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. Corpus and method](#1-corpus-and-method)
  - [2. DOC-PLAIN: two sentence-splitter bugs, one config bug, three dead wordlists](#2-doc-plain-two-sentence-splitter-bugs-one-config-bug-three-dead-wordlists)
  - [3. DOC-NAV: the unwritten depth script, written and fixed twice](#3-doc-nav-the-unwritten-depth-script-written-and-fixed-twice)
  - [4. DOC-EX: mechanism facts confirmed, one grep scoped wrong](#4-doc-ex-mechanism-facts-confirmed-one-grep-scoped-wrong)
  - [5. DOC-AGENT: clean today, one grep too loose to stay that way](#5-doc-agent-clean-today-one-grep-too-loose-to-stay-that-way)
  - [6. The master ledger](#6-the-master-ledger)
  - [7. Rows not measured, and why](#7-rows-not-measured-and-why)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- DOC-PLAIN-02's word counter treats every letter inside a markdown link
  target as a prose word. Measured: 121 of 4,674 flagged long-sentences
  (2.6%) flip under 25 words once the link target is excluded. Fix: strip
  `(target)` from `[text](target)` before counting, keep only `text`.
- DOC-PLAIN-03's sentence splitter reads a numbered-list marker ("1.", "2.")
  as a sentence boundary. Measured: 16 of 153 flagged paragraphs (10.5%) are
  ordinary compliant numbered lists, not long paragraphs. A 3-step how-to
  list fails a rule meant to catch run-on prose.
- DOC-PLAIN-13's MD025 (`single-h1`) collides with the fleet's own
  frontmatter-`title:` convention. Measured: 8 of 8 fleet hits (100%) are
  pages with exactly one real H1 and a matching frontmatter title, not a
  true duplicate heading. Fix: ship `{"MD025": {"front_matter_title": ""}}`.
- DOC-PLAIN-10's tell wordlist collides with ordinary technical vocabulary.
  Measured: 17 of 18 raw hits fleet-wide (94%) are the words "underscore"
  (the punctuation character), "unlock" (a config/feature term) or
  "paradigm" (plain engineering usage), not AI-tell hype. The one page that
  would fail the density-3 floor today fails on a false positive.
- DOC-PLAIN-12's marketing wordlist: 8 of 8 hits fleet-wide (100%) are
  engineering trade-off language in internal decision/research notes
  (`kate-middlechild/docs/research/**`), not marketing copy on a published
  page. Zero genuine hype instances exist in this fleet to validate the
  list against.
- DOC-PLAIN-11's time-relative-word ban catches real staleness risk and
  ordinary runtime-state description at close to the same rate. Roughly
  half of a 10-item sample ("the currently installed version", "the latest
  digest") describe a computed value, not a claim that goes stale.
- DOC-PLAIN-16's "link once" contract and its 15-link cap both fire hardest
  on reference pages, where repeat-linking the same anchor from independent
  subsections is standard practice, not a violation. 48 of 249 pages (19%)
  repeat a link; 25 of 249 (10%) exceed 15 links, concentrated in exactly
  the CLI/command reference pages the family already treats as its
  strongest content.
- DOC-NAV-02/03/04's script did not exist. It now does
  (`checks/nav_depth.py`), and confirms every depth claim in
  docs-navigation-search.md against real configs: ocx and ocx-sdk-python at
  depth 3 with the third level collapsed, grimoire flat at 20 items with 0
  real dividers, the other 5 MkDocs sites at depth 2.
- Writing that script found two more bugs a naive parse hides: `yaml.safe_load`
  hard-fails on 4 of 7 mkdocs.yml files over `!ENV` and `!!python/name:` tags
  pymdownx and mkdocs-material ship by default, and a naive `^#\s` grep
  double-counts mdBook's mandatory `# Summary` title line as a grouping
  divider, which silently marked grimoire's flat nav as "grouped."
- DOC-NAV-05 has two H5-heading pages fleet-wide, not the "exactly one" the
  family states. The second (`ocx/.../configuration.md`) is a reference page
  with real test coverage, but the carve-out's own verification text ("a
  structural test file... names that page") has no mechanical binding to
  check against.
- DOC-NAV-06, run for real: 16 pages exceed 4,000 words, not the "two
  outliers" the family names as illustrative. The other 14 are real
  candidates for the same split-or-exempt decision.
- DOC-NAV-13's reworded check ("must not flatten to 1:1:1") passes on
  grimoire's real `book.toml` and fails on a planted flattened-boost
  fixture. The ledger's correction is confirmed runnable, not just argued.
- DOC-NAV-09, unmeasured by the family's own admission: 0 of 249 page titles
  and 0 of 9 nav configs use a role noun. Ships red on day one.
- DOC-EX-08's overclaim grep, run fleet-wide instead of scoped to the
  mechanism's own docs: 709 hits, of which only 47 (6.6%) touch anything
  related to the tested-example mechanism at all. "Exactly", "identical"
  and "verbatim" are ordinary engineering words; the rule's own applies-to
  scope needs to say so on the row, not leave it implied.
- DOC-EX-05/06/13/14/15/16/17/18/19 all reproduce exactly as
  docs-examples.md states them, independently re-derived here: 151/1281
  untagged fences (11.8%), one `moved-command-ok` marker, both cast repos on
  v2 against v3-capable players, `autoPlay` defaulting false, zero
  `prefers-reduced-motion`, zero `.tape` files, zero live `<Frame>` uses.
- DOC-AGENT-14's fabricated-completion-metric grep, run against 1,089 real
  fleet agent/skill files: 1 hit, and it is a false positive (a cited
  external research statistic, not a self-graded sign-off). The fleet is
  clean of VoltAgent-shaped completion fabrication today.
- DOC-AGENT-06/07's "agent(s)" grep, run against page and heading text
  fleet-wide: 22 heading hits, all of them the word "agent" as
  grimoire-lore's own product noun (an artifact type), none an actual
  agent-directed callout. The rule's own literal pattern has no way to tell
  the two apart without the second-part imperative-verb check, which none
  of the 22 satisfy.
- Vale is not installed in this environment (`vale: command not found`),
  confirmed directly; DOC-PLAIN-14, DOC-PLAIN-20 and DOC-PLAIN-21 stay
  grep/reading-heuristic per the family's own tiered-gate design and are not
  exercised here.
- `marketing-tone-wordlist` (the open research question behind
  DOC-PLAIN-12) is answered by absence: no genuine hype-copy instance exists
  anywhere in this fleet to derive an evidence-backed list from. Ship the
  ban at CONSIDER, scoped away from `docs/research/**`-shaped internal
  design notes, and stop looking for a fleet-native wordlist that isn't there.

## Findings

### 1. Corpus and method

Fleet file list built directly from `docs-shape.md`'s own surface inventory:
the `docs/` or `website/` tree of the 16 named repos plus the `README.md` of
the 6 README-only repos, excluding `node_modules`, `.git`, `target`, `dist`,
`.worktrees`, `.lhci-bulk`, `.dev-indexes`, `external/`, `.claude`, `.agents`,
`.serena`. This produced **249 files** against `docs-shape.md`'s own count of
248; the one-file difference is not chased further; it does not change any
rate below by a visible margin. Full list, one path per line, at
`filelist.txt` (see Sources).

Preprocessing reuses the ledger's own description of `checks/strip_prose.py`:
blank frontmatter (keeping its line count), fenced code blocks, ATX heading
lines, table rows and reference-link definitions, and replace inline code
spans with a single space, all while preserving line numbers. Reimplemented
independently at `strip_prose.py` (not copied from the severity ledger's
copy, which was not read as source) and produces the same shape of output
described there. Every prose grep below runs on `strip()`'s output.

Four checks needed a real script that did not exist (`nav_depth.py` for
DOC-NAV-02/03/04) or a real tool run (`markdownlint-cli2` v0.23.2 for
DOC-PLAIN-13/15, Node v24.14.0). Vale is confirmed absent
(`vale: command not found`), so DOC-PLAIN-14/20/21 stay on their designed
grep/reading-heuristic fallback and are not run against a Vale binary here.

### 2. DOC-PLAIN: two sentence-splitter bugs, one config bug, three dead wordlists

**DOC-PLAIN-02, long sentences.** Ran `long_sentences()` (the family's own
25-word splitter) over all 249 pages: **211/249 pages fire, 4,674 sentences
flagged.** Sampling showed the word counter treats a markdown link's target
as prose:

```text
Flagged (28 raw words): [MCP servers](#mcp-servers) and [bundles](#bundles)
have no file tree of their own — their layer is a single JSON document — so
they carry no in-tree README.
Same sentence, target stripped (25 words): passes.
```

Systematic check: for every one of the 4,674 flagged sentences, strip the
`(target)` half of every `[text](target)` and recount. **121 flip from
>25 to <=25 words (2.6% of all flagged sentences).** All 10 sampled by hand
are the same mechanism: an anchor fragment (`#mcp-servers`,
`#the-optional-forceable-field`) or a relative path (`./concepts.md`) whose
letters get counted as separate words by `[A-Za-z']+`. This is the exact
failure mode the commission asked about ("the sentence splitter on prose
with code spans and URLs"), confirmed and quantified. Inline code spans
inside link text compound it: `` [`bundle-pinning`](url) `` becomes an empty
`[ ]` after code-span stripping, but the URL's words still count.
`grimoire/docs/src/commands.md:32` and `grimoire/docs/src/artifacts.md:28`
carry both compounding forms. Fix: strip the `(target)` portion of every
markdown link (and bare autolinks) in `strip_prose.py` itself, so every
downstream word-count and sentence-length rule inherits the fix once.

**DOC-PLAIN-03, paragraphs over 5 sentences.** Ran the paragraph splitter
over all 249 pages: **69/249 pages fire, 153 paragraphs flagged.** A
deliberately planted 3-step ordered list (`fixture_clean.md`, three
one-line items, no blank lines between them, the normal way Markdown lists
are written) reproduces a real bug: the splitter treats "1.", "2." and "3."
as sentence-ending punctuation followed by a new sentence, so a 3-item list
becomes **six** "sentences": `['1.', 'Check the version.', '2.', 'Run the
install command.', '3.', 'Confirm the result.']`. Measured fleet-wide:
**16 of 153 flagged paragraphs (10.5%) are driven by two or more bare
`N.` tokens counted as sentences**, not by genuinely long prose blocks.
Samples: `bob/docs/design/decisions.md` (9 "sentences", 3 bare markers),
`ocx-mirror-sdk/docs/contributing/workflows.md` (10 "sentences", 5 bare
markers — a 4-step release checklist). Fix: in the sentence splitter,
drop any "sentence" that is exactly `\d{1,2}\.` before counting.

**DOC-PLAIN-04, stripping fixture.** Built the fixture the rule asks for: a
page with real prose plus a large fenced block of nonsense tokens
(`fixture_dirty.md`). Flesch on the **raw** file: 59.6 (passes the 50
floor). Flesch on the **stripped** file: 48.8 (fails it). The all-one-syllable
filler ("zzz zzz zzz...") inflates the raw score enough to hide a genuinely
hard sentence in the same page. Confirms the rule's own rationale with a
number, not an assertion.

**DOC-PLAIN-05, Flesch Reading Ease.** Formula, exact: `206.835 - 1.015 *
(words / sentences) - 84.6 * (syllables / words)`, syllables counted as
vowel-group runs per word with a trailing silent-e correction
(`count_syllables()` in `plain_checks.py`, ported from `docs_shape.py`'s
own implementation). Stripping steps: exactly the six-step
`strip_prose.py` pass in §1, run once per page before scoring; the
severity ledger's own preprocessing note is reproduced independently, not
copied. Measured over all 249 pages: **median 49.0, mean 48.1** (the fleet
audit's own 186-page, 9-real-site subset measured 51.6; the wider 249-page
run, including README-only pages and repos with no generator, comes out
2.6 points lower). **132/249 pages (53.0%) sit below the floor of 50.**
Lowest scores are self-inflicted structural noise, not hard prose: negative
Flesch scores on `ocx/website/src/roadmap.md` (-24.5) and
`grimoire/docs/src/SUMMARY.md` (-16.4) come from short, list-heavy,
low-word-count pages where the formula's own sentence-length term
dominates on tiny denominators, not from genuinely dense writing. This is
a distinct, narrower defect from DOC-PLAIN-10's stub-page instability
below: any per-page floor needs the same short-page guard both checks are
missing.

**DOC-PLAIN-06, reference-page Flesch drop.** Diff-based; nothing to run
against a snapshot corpus, so planted a before/after pair
(`ref_before.md` / `ref_after.md`): rewriting four short, plain sentences
into one jargon-dense sentence drops Flesch from 92.7 to -29.3, a 122-point
drop against the rule's 10-point trigger. Goes red correctly.

**DOC-PLAIN-08, chatbot artifacts.** 0/249 pages fire. Ships red on day one
with zero current violations, confirming the family's own (smaller-corpus)
finding at the wider 249-page scope.

**DOC-PLAIN-10, tell density.** Ran the family's own density wordlist
(`delve`, `tapestry`, `testament`, `boasts`, `leverage(s/ing)`, `robust`,
`seamless(ly)`, `holistic`, `paradigm`, `synerg*`, `unlock*`, `elevate*`,
`foster*`, `underscore*`) over all 249 pages: **14/249 pages have >=1 hit,
18 raw hits total, 1/249 pages exceed density 3** (the shipped, admittedly
uncalibrated default). Every one of the 18 hits was read in context:

| Match | Count | Verdict |
|---|---:|---|
| "underscore(s/d)" meaning the `_` character | 9 | false positive |
| "unlock(s)" meaning a config flag or capability | 3 | false positive |
| "robust" describing code style or a library feature | 2 | false positive |
| "paradigm" in its plain engineering sense | 3 | false positive |
| "seamless" describing routing behaviour | 1 | true positive (weak) |

**17 of 18 (94%) are false positives.** The one page that would fail the
density-3 floor today, `ocx-sdk-python/docs/reference/api.md` (118 prose
words, 1 hit), fails on the "underscore" false positive alone, and the
density arithmetic itself is unstable on short pages: one hit on a
118-word stub yields density 8.47, nearly 3x the floor, purely from a small
denominator. Fix: delete "underscore*" and "unlock*" outright (both have a
common, unrelated technical meaning with no rewrite needed), reconsider
"paradigm", and add a minimum word-count precondition (300 words, matching
the stub-page floor already used elsewhere in the family) before the
density gate applies at all.

**DOC-PLAIN-11, time-relative words.** 104/249 pages fire, 398 raw hits.
Sampled 10 with 60-character context on each side. Roughly half describe a
computed or runtime value rather than a documentation claim that goes
stale: "resolving the **latest** digest", "the **currently** installed
version", "**newer** than the one already cached" are technical
descriptions of behaviour (always true, regardless of when read), not
assertions like "we currently only support Windows" that the rule's own
rationale targets. The clearer true positives are migration-note language
("Config moved... is **now**...") and roadmap language ("Add a plugin
**now**"). No fix is forced (evidence stays `normative`, Google's own list),
but the verification cell should note the exemption for a noun phrase like
"currently installed", "latest digest/tag/version" describing a resolved
value rather than a documentation-staleness claim.

**DOC-PLAIN-12, marketing wordlist.** 6/249 pages, 8 raw hits — small
enough to read every one, not sample:

| File:line | Word | Context | Verdict |
|---|---|---|---|
| `grimoire/docs/src/json-interface.md:701` | robust | "A robust consumer therefore branches on..." | false positive (engineering advice) |
| `grimoire-vscode/docs/manual-testing.md:128` | unlock | "carries an unlock mark beside its alias" | false positive (literal config term) |
| `kate-middlechild/.../research-05...md:17` | unlocks | "The migration that unlocks everything else" | false positive (research note) |
| `kate-middlechild/.../research-05...md:58` | powerful | "powerful, but it's a Postgres-coupled..." | false positive (trade-off weighing) |
| `kate-middlechild/.../research-05...md:108` | powerful | "(powerful but a distinct skill)" | false positive (trade-off weighing) |
| `kate-middlechild/.../research-03...md:64` | robust | "a robust token/theming system" | false positive (feature comparison) |
| `kate-middlechild/.../research-04...md:85` | powerful | "Sanity is powerful but abandons..." | false positive (trade-off weighing) |
| `ocx/.../command-line.md:1099` | unlocks | "for what that unlocks" | false positive (literal capability) |

**8 of 8 (100%) are false positives.** Five of the eight sit in
`kate-middlechild/docs/research/**`, internal engineering decision records
that weigh library trade-offs, not published user-facing docs. Zero
genuine marketing-hype instances exist anywhere in the fleet. See
[Contested / evolving](#contested--evolving) for what this means for the
`marketing-tone-wordlist` open question.

**DOC-PLAIN-13, structural markdownlint.** Ran `markdownlint-cli2 v0.23.2`
with only `MD001`, `MD025`, `MD036` enabled, over all 249 files:

- `MD001` (heading-increment): **0 hits.** Clean.
- `MD025` (`single-title/single-h1`): **8 hits, 8 pages.** Read every one:
  all 8 are pages that declare a frontmatter `title:` key AND carry exactly
  one body `# H1` whose text matches or nearly matches the title (e.g.
  `ocx-sdk-python/docs/index.md`: `title: ocx-sdk` / `# ocx-sdk`;
  `ocx/website/src/docs/reference/dependencies.md`: `title: Dependencies` /
  `# Dependencies {#dependencies}`). MD025 ships with a default
  `front_matter_title` regex that treats the frontmatter `title:` field
  itself as an implicit top-level heading, so a page with one real H1 and
  one matching frontmatter title reads as "two." Confirmed the mechanism:
  of 14 fleet pages that declare a frontmatter `title:` key, exactly the 8
  whose H1 text matches the title fire. **8 of 8 (100%) are false
  positives** relative to the rule's real intent ("no page has two H1s").
  Fix: ship `{"MD025": {"front_matter_title": ""}}` in the config, which
  disables the frontmatter-awareness this fleet's convention collides with.
- `MD036` (emphasis-as-heading): **324 hits, 204 pages**, concentrated in
  `ocx` (264), `ocx-save` (41), `rules_ocx` (11), `kate-middlechild` (8).
  Sampled across all four surfaces: `ocx/.../command-line.md`'s
  "**Usage**"/"**Options**"/"**Exit codes**" per-command sub-labels and
  `rules_ocx/docs/defs.md`'s "**PARAMETERS**"/"**RETURNS**" are genuine
  structural sub-headings standing in for real ones (true positives,
  matching the rule's intent at volume). One sampled hit is a false
  positive of a different shape: `kate-middlechild/docs/design-source/
  design-chat.md:3`, "**Started 2026-06-13 19:47 UTC**", a bolded
  timestamp metadata line in a chat transcript, not a heading substitute.
  Estimated FP rate on this rule: low (roughly 1 in 8 sampled), unlike
  MD025's 100%.

**DOC-PLAIN-15, link syntax.** Ran `markdownlint-cli2` with MD054's real
per-style boolean shape (`{"inline": true, "full": false, "collapsed":
false, "shortcut": false, "autolink": true}`, confirming the fix the
family's own consolidation already made to the fabricated `{"style":
"inline"}` shape): **3,595 hits fleet-wide**, concentrated in `ocx` (2,757)
and `grimoire` (499). The config runs with no error under the corrected
per-style shape; a re-check with the invalid `{"style": "inline"}` shape
throws a schema error immediately (confirmed separately), which is exactly
why the family's own fix matters. No sampling needed: this is a pure
syntax check (reference-style vs. inline is unambiguous), so every hit is a
true positive by construction.

**DOC-PLAIN-16, link-once and 15-link cap.** Two checks, one script:

- **15-link cap**: 25/249 pages (10%) exceed 15 non-footer links. All 10 of
  the highest are the fleet's own CLI/command/config reference pages
  (`ocx/.../command-line.md`: 274 links; `grimoire/docs/src/commands.md`:
  186; `grimoire/docs/src/publishing.md`: 94). These are exactly the
  reference-page shape DOC-TYPE-18 calls "the strongest rule in the whole
  set" for its own reasons (exhaustive, generated-shaped cross-referencing).
- **Link-once**: 48/249 pages (19%) link the identical (text, target) pair
  two or more times. Sampled: `grimoire/docs/src/commands.md` links
  `` `grim add` `` to `#add` four times, `` `grim lock` `` to `#lock` three
  times — each from a different, independently-readable subsection of one
  large reference page, the same shape Wikipedia's own style guide
  (`MOS:REPEATLINK`) treats as correct practice on a long page with
  self-contained sections, distinct from over-linking a short narrative
  page.

Both numbers say the same thing: DOC-PLAIN-16 as written ("applies to:
all") is calibrated for narrative prose and misfires on reference pages,
where GitLab's own 15-link cap and "link once" guidance were never meant to
apply to an auto-cross-referenced command table. Recommend an explicit
`reference` exemption, matching the pattern DOC-PLAIN-05 already uses.

### 3. DOC-NAV: the unwritten depth script, written and fixed twice

The severity ledger marks DOC-NAV-02/03/04 `script` ("`checks/nav_depth.py`
does not exist"). Wrote it (`nav_depth.py`): MkDocs Material via PyYAML,
VitePress via a bracket-balanced slice of the `sidebar:` object plus a
regex count of `items: [` nesting, mdBook via `SUMMARY.md` indent depth.

**Bug 1, found writing it.** `yaml.safe_load` hard-fails on 4 of 7 fleet
`mkdocs.yml` files:

```text
could not determine a constructor for the tag
'tag:yaml.org,2002:python/name:material.extensions.emoji.twemoji'
could not determine a constructor for the tag '!ENV'
```

`ocx-catalog`, `grimoire-indexer` (the `!!python/name:...` emoji-index tag
pymdownx ships by default) and `ocx-mirror-sdk`, `ocx-sdk-python`,
`ocx-indexbot` (the `!ENV [CI, false]` tag mkdocs-material's own docs
recommend for CI-conditional config) all break a naive parse. Fixed with a
permissive multi-constructor that passes any unknown tag through as its
raw scalar/sequence, since a depth check never needs to resolve either tag.
After the fix, all 7 MkDocs configs parse and match `docs-navigation-
search.md`'s own claims exactly: `ocx-catalog`, `grimoire-indexer`,
`ocx-mirror`, `ocx-mcp` at depth 2; `ocx-mirror-sdk`, `ocx-indexbot` at
depth 2; `ocx-sdk-python` at depth 3 (the nested Concepts subsection the
family names).

**Bug 2, found writing the mdBook side.** A naive `^#\s` grep for
"Part Title dividers" counts mdBook's own mandatory first line
(`# Summary`, required by the SUMMARY.md format spec) as a grouping
divider. Before the fix: `grimoire/docs/src/SUMMARY.md` reports 1 divider
and 20 top-level bullets, so `flat_at_8plus_with_no_dividers` reads
`False` — a 20-item flat list marked "grouped" because of the file's own
required title line. Fixed by skipping the first `# ` heading encountered.
After the fix: `part_title_dividers=0`, `flat_at_8plus_with_no_dividers=
True`, matching the family's claim.

**VitePress depth**, once the `sidebar:` block is isolated: `ocx` reports
`max_depth=3, groups_with_items=3, collapsed_group_count=3,
third_level_all_collapsed=True` — the top nav bar (level 1), the sidebar's
own flat entry list (level 2, "Authoring"/"In Depth" among its bare
entries), and each group's `items:` array (level 3), matching the family's
claim exactly and confirming both nested groups are `collapsed: true`.

**Planted violations, both directions.** A synthetic depth-4 VitePress
config (`fixture_depth4`, a group nested inside another group's `items:`)
reports `max_depth=4` and goes red. A synthetic 9-page flat MkDocs nav
(`fixture_flat9`) reports `flat_at_8plus=True` and goes red. DOC-NAV-01's
precondition also confirmed clean: `creeptd-ng`, `kate-middlechild`,
`grimoire-lore` (no generator config) all correctly report "not
applicable," never "failed."

**DOC-NAV-05, heading depth.** `grep -c '^#{5,6} '` over all 249 pages:
**2 pages carry H5+**, not the family's "exactly one." The second is
`ocx/website/src/docs/reference/configuration.md` (4 H5 headings), a
reference page with real test coverage (`test/tests/test_config*.py`, six
files). The carve-out's own wording ("a structural test file... names that
page") has no mechanical way to check that a *specific* test file names a
*specific* page; a project with six `test_config*.py` files and no
per-page naming convention cannot be told apart from one with none. This is
a second instance of the family's own DOC-AGENT-16 problem: the carve-out
reads as verified but isn't.

**DOC-NAV-06, 4000-word split.** Ran the prose-word counter (post-strip)
over all 249 pages: **16 pages exceed 4,000 words**, not the "two
outliers" (`command-line.md` at 32,790 words here vs. the family's cited
34,298 — the ~1,500-word gap is `strip_prose.py`'s table- and code-fence
stripping removing content the family's own counter may have included
differently; not chased further) the family names as illustrative. The
other 14 (`grimoire/docs/src/commands.md`: 12,504; `ocx/.../user-
guide.md`: 12,142; `ocx-mirror/docs/reference/mirror-yml.md`: 10,306;
eleven more) are real candidates for the same split-or-exempt decision the
family already flags as an open question for the two it names.

**DOC-NAV-09, role-noun labels.** The family's own consolidation admits
"Not measured this wave." Measured here: grepped every page's H1 and every
generator's nav labels (`ocx`'s top nav bar plus every MkDocs site's
top-level `nav:` entries) for `developer|admin|beginner|advanced|
professional|workforce`. **0 hits, 0/249 pages, 0/9 nav configs.** Ships
red on day one.

**DOC-NAV-10 / DOC-NAV-11, zero-result capture.** Grepped every site's
generator config for `zero-result|search-analytics|docs:zero-result-
search` and for the five Algolia-only remediation keys
(`synonyms|removeWordsIfNoResults|optionalWords|ignorePlurals|
removeStopWords`): **0/9 sites carry either.** Confirms the family's claim
at the config level directly, not only by absence-of-mention.

**DOC-NAV-12, stub/empty-state contract (current, pre-split shape).** Ran
the current rule as written (any page under 150 words with a placeholder
string, or with zero links): **22/249 pages hit.** Concentrated in the
already-known stub clusters: `ocx-mirror-sdk` (7 of the 15 sampled),
`ocx-mcp`, `ocx-sdk-python`. This is the object the
`landing-and-short-page-link-budget` commission is already splitting three
ways; the number here is the "before" baseline for that split, not a
verdict on the current shape.

**DOC-NAV-13, mdBook search boost.** The critique and the severity ledger
both already re-fetched mdBook's renderer reference and read grimoire's
`book.toml` directly; not repeated here. What was added: a working,
plantable check. `grep -c 'output.html.search' grimoire/docs/book.toml`
returns **0** (no section at all, so the 2/1/1 defaults apply and the
rule's real requirement — title ranked above body text — already holds).
A planted fixture with `boost-title = 1` / `boost-paragraph = 1`
(flattened) fails the same check. `ocx`'s VitePress config carries no
`boost` key at all (`grep -c boost config.mts` returns 0), confirming it
also inherits the unflattened `{title: 4, text: 2, titles: 1}` default.
The ledger's rewording ("must not flatten to 1:1:1") is now a script, not
only an argument.

**DOC-NAV-14, stale zero-result query.** Blocked behind DOC-NAV-10 by
design: no site logs a zero-result query at all (§ above), so the check
has nothing to act on anywhere in the fleet. Confirmed vacuous, not run
further; this matches the ledger's own disposition (CONSIDER, gated behind
NAV-10).

**DOC-NAV-15, bare cadence word.** Grepped all 249 pages for a cadence
word (`regularly|frequently|periodically|often`) within 60 characters of
"review": **0 hits.** Clean; ships red on day one.

### 4. DOC-EX: mechanism facts confirmed, one grep scoped wrong

Most DOC-EX rules govern a specific fleet mechanism (ocx's 66-script
harness, its Vue player, two repos' cast pipelines) already measured with
file:line precision in `docs-examples.md`'s own "Applied to the fleet"
section. Re-running those as fleet-wide text greps rather than re-reading
the cited evidence was the useful test; six rules reproduced exactly and
one did not scope the way its "applies to" column implies.

**DOC-EX-05, fence language tags.** `grep -c '^```\S*$'`-equivalent over
all 249 pages, pairing opening/closing fences: **151 of 1,281 fences
(11.8%) untagged**, `ocx` carrying the most (71). Same direction, smaller
absolute count than `docs-shape.md`'s 343/3,065 (that scan covered a wider,
non-deduplicated file set); the rate (roughly 1 in 9 fences) is consistent
across both.

**DOC-EX-06, moved-command marker.** `grep -rn 'moved-command-ok'`:
**1 hit fleet-wide**, `ocx/website/src/docs/user-guide.md`, matching the
family's claim exactly.

**DOC-EX-08, overclaim words.** Ran the rule's literal pattern
(`exactly|identical|verbatim|byte-for-byte`) over all 249 pages as if
"applies to: explanation, reference" meant "run everywhere": **709 hits.**
Cross-checked how many sit anywhere near mechanism content (a page also
mentioning `doc_scripts|Terminal.vue|cast_recorder|# doc:`): **47 of 709
(6.6%).** The other 93.4% are ordinary technical prose in an internal
design document (`bob/docs/design/graph-ir.md`: "exactly one:
`FileSet`...", "two structurally identical graphs", "exactly two
premises"), nothing to do with a displayed example's fidelity to what
executed. The rule's own verification cell says to grep "the mechanism's
own docs," which the family's own text confirms as the intended scope; the
row itself does not say to exclude everything else, and a naive read of
"applies to: explanation, reference" invites exactly this fleet-wide
misfire. Recommend the verification cell name the scope explicitly
(a path glob under the tested-examples doc tree, not a page-type filter).

**DOC-EX-13, cast commit branching.** `git ls-files` on `ocx`'s recordings
directory returns **0** tracked `.cast` files (105 exist on disk under
`test/.out/` and `.vitepress/dist/`, both build output); `git ls-files` on
`grimoire` returns **1** (`docs/src/demo.cast`). Matches the family's claim
exactly for both branches of the rule.

**DOC-EX-14, cast version.** Both recording repos' generated casts open
`{"version": 2, ...}`; `ocx/website/package.json` pins
`"asciinema-player": "^3.15.1"`. Matches the family's claim.

**DOC-EX-15/16/17, player defaults.** `ocx/website/.vitepress/theme/
components/Terminal.vue:149`: `const autoPlay = props.autoPlay ??
!props.src` — defaults false whenever a cast source is set, matching
EX-15. `grep -rl 'prefers-reduced-motion' ocx grimoire`: **0 hits**,
matching EX-17's stated gap exactly.

**DOC-EX-18, VHS.** `find -iname '*.tape'` across every fleet repo: **0
hits.** Matches.

**DOC-EX-19, unused Frame mode.** `Frame.vue` exists at
`ocx/website/.vitepress/theme/components/Frame.vue`;
`grep -c '<Frame' ocx/website/src`: **0.** Matches the family's "0 of 36
live embeds" claim. (This rule is dropped from the portable set per the
severity ledger; confirmed here only for completeness, not to argue
against the drop.)

### 5. DOC-AGENT: clean today, one grep too loose to stay that way

**DOC-AGENT-14, fabricated completion metric.** Enumerated every
`.claude/*.md` file across 13 fleet repos with agent/skill config
(`ocx`, `ocx-catalog`, `grimoire`, `grimoire-indexer`, `bob`, `rules_ocx`,
`ocx-mirror`, `ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot`,
`ocx-mcp`, `kate-middlechild`, `ocx-save`): **1,089 files.** Grepped for a
first-person completion phrase carrying a percentage
(`\b(I have|I've|Successfully|Completed|Achieved|Delivered|Resulted in)
\b[^.\n]{0,120}?\d+%`): **1 hit**,
`ocx/.claude/artifacts/research_comment_best_practices.md`: "Google's
internal AutoCommenter achieved only 54% 'useful' rate." Read in context:
this is a cited third-party research statistic in a bullet list of prior
findings, not a self-graded sign-off about the session's own work — a
false positive relative to the rule's real target (VoltAgent's own
subagents fabricating "92% satisfaction"). **The fleet is clean: 0 true
positives across 1,089 files.** Ships red on day one once the pattern
requires first-person self-reference, not any percentage near those verbs.

**DOC-AGENT-06 / DOC-AGENT-07, agent-directed callouts.** Ran the rule's
own literal pattern (`\b(for |note (for|to) )?agents?\b`, case-insensitive)
against every page's headings fleet-wide: **22 heading hits.** All 22 are
the word "agent(s)" as grimoire-lore's own product noun — an artifact
type its package manager installs (`## Agents`, `### Example — minimal
agent`) or a client-support-matrix row (`### Kiro: agents declined`) — not
an instructional callout aimed at a reading agent. None of the 22 would
pass the rule's own second-part check (the following paragraph must
contain an imperative from `use|run|prefer|install|follow|call|fetch`),
because none of them are followed by an instruction at all; they are
ordinary reference-doc section headers. **22 of 22 (100%) are false
positives** relative to the rule's real target, confirming
`docs-machine-readers-and-prior-art.md`'s own "0 fleet pages carry
agent-directed prose" claim from the opposite direction: there is nothing
real here yet, but the moment this fleet's own catalog docs (which use
"agent" as a first-class noun constantly) are scanned, the bare-word half
of the pattern alone produces 22 false alarms with zero true positives
behind them. The optional prefix group in the rule's own regex
(`(for |note (for|to) )?`) is exactly what makes the match fire on the bare
noun; making the prefix mandatory removes all 22 without losing anything,
since a real "for agents:" callout would still match.

**DOC-AGENT-04, llms.txt.** Checked `llms.txt` at repo root,
`website/public/llms.txt` and `docs/llms.txt` for all 9 real sites:
**0/9.** Matches.

**DOC-AGENT-02, twin-copy precondition.** Confirmed structurally rather
than re-measured: every one of the 9 real sites builds from a Markdown
source tree (§1's generator identification), so the precondition ("the
generator already builds from Markdown") holds vacuously everywhere; no
site currently copies that source into a build-output `.md` twin, matching
DOC-AGENT-01's "violated on all 9" finding.

**DOC-AGENT-08, static-file-only precondition.** Checked every real site
for a `_headers` file or an edge-function directory: **0/9 carry either.**
Matches the family's claim; the static-only requirement holds vacuously
and stays held.

### 6. The master ledger

`command as run` is abbreviated; the literal command lives in
[Sources](#sources) or inline above. `files scanned` is 249 unless noted.
`FP rate` is the sampled or exhaustive false-positive rate found above (n
given where the full population was read rather than a 10-item sample).
`Red on plant?` records whether a deliberately planted violation was
confirmed to trip the check in this pass (`y`), was already trivially true
by construction (`n/a`, a pure-syntax check with no ambiguity to plant
against), or was not attempted (`—`).

| ID | Command as run | Hits | FP rate | Red on plant? | Recommendation |
|---|---|---|---|---|---|
| DOC-PLAIN-01 | `strip.py \| grep -nE '[—–;""'"''"']'` | 229/249 pages, 8,462 hits | n/a (literal char match) | y | Ship as-is, SHOULD, diff-scoped |
| DOC-PLAIN-02 | `long_sentences()` on stripped prose | 211/249, 4,674 sentences | 2.6% (121/4,674, exhaustive) | y | Strip link targets before counting words |
| DOC-PLAIN-03 | paragraph splitter on stripped prose | 69/249, 153 paragraphs | 10.5% (16/153, exhaustive) | y | Exclude bare `\d{1,2}\.` tokens from the sentence count |
| DOC-PLAIN-04 | Flesch on raw vs. stripped fixture | 1 fixture, 10.8-point gap | n/a | y | Ship as-is, MUST |
| DOC-PLAIN-05 | Flesch Reading Ease, all pages | 132/249 below floor 50 (53.0%) | n/a (measurement, not a lint) | — | Ship SHOULD; note the same short-page instability as PLAIN-10 |
| DOC-PLAIN-06 | Flesch diff, before/after fixture | 1 fixture, 122-point drop | n/a | y | Ship as-is, CONSIDER |
| DOC-PLAIN-08 | chatbot-artifact grep | 0/249 | n/a | — (already 0) | Ship red today, MUST |
| DOC-PLAIN-10 | tell-density wordlist | 14/249, 18 raw hits | 94% (17/18, exhaustive) | — | Delete `underscore*`, `unlock*`; add a 300-word floor before the density gate |
| DOC-PLAIN-11 | time-relative-word grep | 104/249, 398 hits | ~50% (5/10 sampled, runtime-state phrases) | — | Exempt "currently/latest installed/resolved X" noun phrases |
| DOC-PLAIN-12 | marketing wordlist | 6/249, 8 hits | 100% (8/8, exhaustive) | — | Keep at CONSIDER; scope away from `docs/research/**` |
| DOC-PLAIN-13 | markdownlint MD001/025/036 | MD001 0; MD025 8/249; MD036 324/204 pages | MD025 100% (8/8, exhaustive); MD036 ~12% (1/8 sampled) | — | Ship `{"MD025":{"front_matter_title":""}}` |
| DOC-PLAIN-15 | markdownlint MD054, real per-style shape | 3,595/249 | 0% (pure syntax) | n/a | Ship as-is, SHOULD |
| DOC-PLAIN-16 | link-budget + link-dedup script | 25/249 over 15 links; 48/249 repeat a link | high on reference pages (both concentrated there) | — | Exempt `reference` pages, per DOC-PLAIN-05's own pattern |
| DOC-NAV-01 | `ls` generator-config precondition | 3/249 repos not applicable | n/a | — (already correct) | Ship as-is, MUST |
| DOC-NAV-02 | `nav_depth.py`, all 9 sites | 0 sites over depth 3 | n/a | y (depth-4 fixture) | Ship the script; MUST |
| DOC-NAV-03 | `nav_depth.py`, all 9 sites | 1/9 flat at 8+ (grimoire) | n/a | y (flat-9 fixture) | Ship the script; MUST |
| DOC-NAV-04 | `nav_depth.py`, breadcrumb check | 1/9 at depth 3 with no breadcrumb (ocx) | n/a | y | Ship the script; MUST |
| DOC-NAV-05 | `grep -c '^#{5,6} '` | 2/249 (not 1) | n/a | — | Fix the "exactly one" claim; tighten the carve-out's verification |
| DOC-NAV-06 | prose-word counter | 16/249 over 4000 | n/a | — | Fix the "two outliers" framing; 14 more candidates exist |
| DOC-NAV-07 | anchor resolver | already exhaustively measured by the family | — | — | Not re-derived; cite `docs-shape.md` §5 |
| DOC-NAV-09 | role-noun grep, titles + nav configs | 0/249, 0/9 | n/a | — | Ship red today; closes the family's own "not measured" gap |
| DOC-NAV-10 | zero-result-string grep, 9 configs | 0/9 | n/a | — | Ship as-is pending the ownership commission |
| DOC-NAV-11 | synonym-key grep, 9 configs | 0/9 | n/a | — | Ship red today, MUST |
| DOC-NAV-12 | stub/placeholder script (pre-split shape) | 22/249 | — (superseded by the split commission) | — | Baseline number for the 3-way split |
| DOC-NAV-13 | `grep -c output.html.search`, planted fixture | 0/1 real (grimoire); 1/1 planted | n/a | y | Ship the reworded check; CONSIDER |
| DOC-NAV-14 | (blocked behind NAV-10) | vacuous, 0/9 | n/a | — | Leave gated |
| DOC-NAV-15 | cadence-word-near-review grep | 0/249 | n/a | — | Ship red today, CONSIDER |
| DOC-EX-05 | fence-language pairing | 151/1,281 fences | n/a (structural) | — | Ship as-is, SHOULD |
| DOC-EX-06 | `grep moved-command-ok` | 1/249 | n/a | — | Ship as-is, MUST |
| DOC-EX-08 | overclaim-word grep, fleet-wide | 709/249 pages | 93.4% off-target (662/709) | — | Scope the verification to the mechanism's own doc tree |
| DOC-EX-13 | `git ls-files` on cast dirs | ocx 0, grimoire 1 | n/a | — | Ship as-is, MUST |
| DOC-EX-14 | cast header + package pin | both repos v2 vs. `^3.15.1` player | n/a | — | Ship as-is, SHOULD |
| DOC-EX-15/16/17 | player-init greps | autoPlay false by default; 0 reduced-motion | n/a | — | Ship as-is |
| DOC-EX-18 | `find -iname '*.tape'` | 0 fleet-wide | n/a | — | Ship as-is, SHOULD |
| DOC-EX-19 | `grep -c '<Frame'` | 0/36 embeds | n/a | — | Confirmed; rule already dropped by the ledger |
| DOC-AGENT-02 | generator-source precondition | 9/9 vacuous | n/a | — | Ship as-is, SHOULD |
| DOC-AGENT-04 | `llms.txt` existence check | 0/9 | n/a | — | Ship as-is, SHOULD |
| DOC-AGENT-06/07 | `agent(s)` heading grep | 22/249 headings | 100% (22/22, exhaustive) | — | Make the "for/note for/to" prefix mandatory, not optional |
| DOC-AGENT-08 | `_headers`/edge-config check | 0/9 | n/a | — | Ship as-is, MUST |
| DOC-AGENT-14 | first-person completion-metric grep | 1/1,089 agent/skill files | 100% (1/1) | — | Require first-person self-reference in the pattern |

### 7. Rows not measured, and why

**Circular, inert or reading-heuristic per the severity ledger (skipped,
one line each, per the commission's scope trim):**

- **DOC-PLAIN-14** (chatbot-tell reading heuristic under Vale's own
  taxonomy) and **DOC-PLAIN-20** (per-construct linter-collision reviewer
  pass) — both `heuristic` in the ledger; no grep to run.
- **DOC-NAV-16** (bind the beacon to a public API, never an internal file)
  — `heuristic`; a reviewer-judgment check with no fixture-checkable shape.
- **DOC-EX-04** (the one-file harness floor) — `heuristic`; the fix is a
  shipped file under `checks/`, not a grep.
- **DOC-AGENT-05** (name the specific consumer), **DOC-AGENT-09** (keep
  AGENTS.md/skill.md/MCP out of the required list), **DOC-AGENT-13** (never
  self-grade) — all `heuristic`; reviewer-judgment checks.

**Already measured by the severity ledger, not re-measured per the
commission's instruction:** DOC-PLAIN-07 (184/186 pages, 9,618 hits,
matches ordinary hyphenated English — see `wave2-severity-ledger.md` §4).

**Already resolved as an overlap, not re-measured:** DOC-NAV-08 (merged
into DOC-OBS-02 per the ledger's overlap #1; its three-resolution
requirement is now DOC-OBS-02's verification, not a standalone check).

**Meta-rules that govern the shipped rule file's own text, not fleet docs
pages, so "run over 248 pages" does not apply** (their obligation is on
`RULEFILE`, which does not exist yet as a shipped artifact):
DOC-PLAIN-09, DOC-PLAIN-17, DOC-PLAIN-18, DOC-PLAIN-19, DOC-PLAIN-21 (also
blocked: no Vale binary in this environment to test package resolution
against), DOC-AGENT-10, DOC-AGENT-11, DOC-AGENT-12 (this is the exact
audit the severity ledger's own §6 already ran across all 132 rows),
DOC-AGENT-15, DOC-AGENT-16 (the ledger's own count: zero of 132 rows carry
the marker). Their disposition is unchanged from the ledger; verifying
them again here would be running the same grep against a file the ledger
already ran it against.

**Held pending a cost measurement, out of this dive's scope by the
ledger's own disposition:** DOC-AGENT-01 (script, no known twin-generation
implementation on any of the 3 fleet generators — confirmed structurally
via DOC-AGENT-02's precondition above, not re-derived further),
DOC-AGENT-03 (CONSIDER, argued, low blast radius), DOC-AGENT-17,
DOC-AGENT-18 (both CONSIDER/held, procedural pressure-test and
reader-simulation methods that run against *this rule set*, not against
fleet docs pages, and the ledger already defers both on cost).

## Normative guidance candidates

1. **Strip a markdown link's target, not only its own reference-style
   definition, before any word or sentence count runs.**
   Rationale: a link target's letters count as prose words today, and
   2.6% of DOC-PLAIN-02's flagged sentences are false positives caused by
   nothing else.
   VERIFICATION: `python3 checks/strip_prose.py PAGE` then
   `grep -c '\](#\|\](\.\/'` on the output returns 0 (no bracket-paren link
   syntax survives the strip).
   Evidence level: measured (121/4,674 sentences, this dive).
   Severity: SHOULD (a preprocessing fix, not a new obligation).
   CHANGES: `checks/strip_prose.py`'s own contract, which DOC-PLAIN-02,
   DOC-PLAIN-03, DOC-PLAIN-05, DOC-PLAIN-06 all inherit.

2. **Exclude a bare `\d{1,2}\.` token from a paragraph's sentence count.**
   Rationale: a compliant 3-item numbered list currently counts as six
   sentences, failing DOC-PLAIN-03 on the exact shape a how-to page is
   expected to use.
   VERIFICATION: feed the splitter a 3-item ordered list with no other
   prose; assert the reported sentence count is 3, not 6.
   Evidence level: measured (16/153 paragraphs, exhaustive, this dive).
   Severity: SHOULD.
   CHANGES: DOC-PLAIN-03's verification cell.

3. **Ship `MD025` with `front_matter_title` disabled.**
   Rationale: every current MD025 hit fleet-wide (8/8) is a page with one
   real H1 and a matching frontmatter title, not two headings.
   VERIFICATION: `npx markdownlint-cli2 --config
   '{"config":{"MD025":{"front_matter_title":""}}}' PAGE` returns clean on
   all 8 currently-flagged pages.
   Evidence level: measured (8/8, exhaustive, this dive).
   Severity: MUST (the check as shipped is actively wrong, not merely
   uncalibrated).
   CHANGES: DOC-PLAIN-13's verification cell.

4. **Delete `underscore*` and `unlock*` from the tell-density wordlist; add
   a 300-word floor before the density gate applies.**
   Rationale: both words carry an unrelated, common technical meaning in
   this domain (a punctuation character, a config/feature term); 17 of 18
   raw hits fleet-wide are false positives on that basis, and the one page
   that would fail today does so on a single false-positive hit inflated
   by a tiny word-count denominator.
   VERIFICATION: `python3 checks/tell_density.py PAGE` on
   `ocx-sdk-python/docs/reference/api.md` reports 0 hits after the wordlist
   fix, versus 1 hit today.
   Evidence level: measured (17/18, exhaustive, this dive).
   Severity: CONSIDER (already at the evidence-level cap; the fix does not
   change the severity, only the false-positive rate).
   CHANGES: DOC-PLAIN-10's wordlist and verification cell.

5. **Exempt a noun phrase naming a resolved runtime value (`the currently
   installed X`, `the latest Y`) from the time-relative-word ban.**
   Rationale: roughly half of a 10-item sample describes a computed value
   that cannot go stale, not a documentation claim that can.
   VERIFICATION: unverified: reading heuristic. A reviewer checks that a
   flagged "currently"/"latest"/"newer" sits in a sentence making a claim
   about product status ("X currently only supports Y"), not describing a
   value the reader's own environment determines at read time.
   Evidence level: argued (from a 10-item sample, not exhaustive).
   Severity: CONSIDER (argued evidence caps here per the family's own G4
   gate).
   CHANGES: DOC-PLAIN-11's verification cell (adds the exemption note).

6. **Scope the marketing wordlist away from `docs/research/**`-shaped
   internal design and decision records.**
   Rationale: 8 of 8 fleet-wide hits sit in exactly this kind of file, and
   every one is trade-off language ("powerful but X"), not marketing copy.
   VERIFICATION: `grep -rl 'docs/research/\|docs/decisions/'
   <matched-file-list>` — a matched file under either path is excluded
   before the finding is reported.
   Evidence level: measured (8/8, exhaustive, this dive).
   Severity: CONSIDER (already at the evidence-level cap).
   CHANGES: DOC-PLAIN-12's `applies to` column.

7. **Exempt `reference`-typed pages from DOC-PLAIN-16's 15-link cap and
   link-once rule.**
   Rationale: 25/249 pages exceed 15 links and 48/249 repeat a link, and
   every one of the highest-volume cases is a reference page repeating an
   internal cross-reference from independent subsections, the documented
   correct practice for long reference material.
   VERIFICATION: re-run the existing script with a `doc_type == reference`
   exclusion; assert the 10 highest-volume pages sampled above no longer
   fire.
   Evidence level: measured (this dive) + normative (Wikipedia's
   `MOS:REPEATLINK` distinction between narrative and sectioned pages).
   Severity: SHOULD (matches DOC-PLAIN-16's current severity; only the
   `applies to` column changes).
   CHANGES: DOC-PLAIN-16's `applies to` column.

8. **Ship `checks/nav_depth.py` with a permissive YAML loader for `!ENV`
   and `!!python/name:...` tags.**
   Rationale: a naive `yaml.safe_load` hard-fails on 4 of 7 real fleet
   `mkdocs.yml` files over tags mkdocs-material and pymdownx ship by
   default; a script that cannot parse most of its target configs is not
   a script.
   VERIFICATION: `python3 checks/nav_depth.py ocx-catalog` (and the other
   3 affected repos) returns a depth reading, not a `YAML parse failed`
   error.
   Evidence level: measured (4/7 configs, this dive).
   Severity: MUST (the script does not work at all without this).
   NEW beside: DOC-NAV-02, DOC-NAV-03, DOC-NAV-04 (all three call the same
   script; this is the fix that makes any of them runnable).

9. **In the mdBook side of the same script, exclude the file's own
   mandatory `# Summary` title line from the Part Title divider count.**
   Rationale: a naive grep counts that required line as a grouping
   divider, which silently marks a fully flat 20-item nav as "grouped."
   VERIFICATION: `python3 checks/nav_depth.py grimoire` reports
   `part_title_dividers: 0`, not 1.
   Evidence level: measured (this dive).
   Severity: MUST (the same class of defect as candidate 8: the check is
   wrong on its own primary target without the fix).
   NEW beside: DOC-NAV-03.

10. **Correct DOC-NAV-05's fleet claim from "exactly one H5 page" to "two,"
    and tighten the reference carve-out's verification to a checkable
    binding, not a reading opinion.**
    Rationale: a second page (`configuration.md`) does carry H5 headings
    and does carry test coverage, but the carve-out's own wording ("a
    structural test file... names that page") has no mechanical way to
    confirm which test file, if any, is bound to which page.
    VERIFICATION: unverified: reading heuristic, until DOC-EX-02's
    declared-key binding (already the family's own recommended owner for
    "a page bound to a test") is reused here to make the carve-out
    checkable the same way.
    Evidence level: measured (2/249, this dive) for the count; argued for
    the fix.
    Severity: SHOULD (matches the rule's current severity).
    CHANGES: DOC-NAV-05's fleet-application text and verification cell.

11. **Correct DOC-NAV-06's framing from "two outliers" to "16 pages,"
    and carry the full list into the split-or-exempt decision the family
    already defers as an open question.**
    Rationale: the two named pages are illustrative, not exhaustive; 14
    more real pages already exceed the threshold today.
    VERIFICATION: `python3 checks/nav_length.py` (the family's own prose
    counter) over all 249 pages, non-reference only, reports the full
    over-4000 list.
    Evidence level: measured (16/249, this dive).
    Severity: SHOULD (unchanged; only the stated scope of the finding
    changes).
    CHANGES: DOC-NAV-06's fleet-application text.

12. **Scope DOC-EX-08's verification to the tested-example mechanism's own
    documentation tree, not every explanation/reference page.**
    Rationale: run fleet-wide, the rule's own literal pattern produces 709
    hits, 93.4% of them ordinary technical prose about equality, precision
    or determinism with nothing to do with a displayed example's fidelity.
    VERIFICATION: `grep -rlE 'exactly|identical|verbatim|byte-for-byte'
    <path-glob-under-the-mechanism-doc-tree>`, not a bare page-type filter.
    Evidence level: measured (47/709 = 6.6% on-target, this dive).
    Severity: SHOULD (unchanged; only the verification cell's scope
    changes).
    CHANGES: DOC-EX-08's verification cell.

13. **Make the `for `/`note (for|to) ` prefix mandatory, not optional, in
    DOC-AGENT-06/07's heading-and-callout pattern.**
    Rationale: the optional-prefix form matches the bare noun "agent(s)"
    anywhere, and this program's own catalog docs use "agent" constantly
    as a first-class product noun; the optional group is exactly what
    turns 22 ordinary section headers into false alarms with zero true
    positives behind any of them.
    VERIFICATION: `grep -nE '\b(for |note (for|to) )agents?\b' PAGE`
    (prefix required) over the 22 pages sampled here returns 0 hits, while
    still matching a real "For agents:" callout in a fixture.
    Evidence level: measured (22/22, exhaustive, this dive).
    Severity: MUST (the current pattern is wrong on every fleet hit it
    produces, the same class of defect as MD025's false-positive rate).
    CHANGES: DOC-AGENT-06 and DOC-AGENT-07's shared verification pattern.

14. **Require first-person self-reference in DOC-AGENT-14's
    fabricated-completion-metric pattern, not any percentage near a
    completion verb.**
    Rationale: the one fleet hit is a cited third-party research statistic
    in a bullet list, not a self-graded sign-off; the current pattern
    cannot tell the two apart.
    VERIFICATION: the matched sentence's subject must be `I`, `this
    session`, or the agent's own first-person voice, confirmed by requiring
    the match window to open with `I have|I've|Successfully completed|
    This session`, not a bare verb.
    Evidence level: measured (1/1, this dive).
    Severity: MUST (unchanged; the fix narrows a false-positive path, not
    the obligation).
    CHANGES: DOC-AGENT-14's verification cell.

15. **Add a minimum-page-length precondition to every per-page density or
    percentage-based prose gate.**
    Rationale: DOC-PLAIN-05's lowest scores and DOC-PLAIN-10's one
    over-threshold page are both driven by a small word-count denominator,
    not by genuinely dense or hype-heavy writing; a stub page of 100-150
    words fails a rate-based check on noise.
    VERIFICATION: unverified: reading heuristic, until a specific floor
    (300 words, matching DOC-DISC-09's stub definition already used
    elsewhere in this program) is written into each affected script.
    Evidence level: argued (from two independent instances, this dive).
    Severity: CONSIDER (argued evidence caps here).
    NEW beside: DOC-PLAIN-05, DOC-PLAIN-10 (a shared precondition, not a
    new rule).

## AI-agent angle

1. **It writes a word/sentence counter that treats markup as content.** A
   markdown link's target, once split into letters, reads as prose words
   to a naive `[A-Za-z']+` regex. The smallest check: feed the counter one
   fixture sentence containing a link with a multi-segment anchor and
   confirm the reported word count matches a human reading only the link
   text.
2. **It reuses a stem-matched wordlist across two rules without checking
   for domain overlap.** "Robust" and "unlock" appear in both
   DOC-PLAIN-10's tell list and DOC-PLAIN-12's marketing list, and both
   collide with this fleet's own literal technical vocabulary
   ("underscore" the character, "unlock" the config flag). Smallest check:
   run every wordlist against the fleet's own glossary/config-key list
   before shipping it; any overlap is a probable false-positive source.
3. **It ships a markdownlint config option it never ran.** MD025's default
   `front_matter_title` behavior is undocumented in the family's own text
   and produces a 100% false-positive rate the moment a page uses the
   fleet's own frontmatter-title convention. Smallest check: run the
   exact shipped config against one page from each convention the fleet
   actually uses (with and without a frontmatter title) before trusting
   "zero-config."
4. **It writes a YAML-based script against one fixture and calls it done.**
   `mkdocs.yml`'s custom tags (`!ENV`, `!!python/name:...`) are common,
   default-shipped extensions that `yaml.safe_load` cannot resolve;
   4 of 7 real configs broke a first-draft parser. Smallest check: run any
   new config-parsing script against every real instance of that config
   type in the fleet, not one representative sample, before calling the
   script written.
5. **It counts a required boilerplate line as evidence of the thing it's
   checking for.** mdBook's mandatory `# Summary` title line looks
   identical to a real Part Title divider to a naive heading grep,
   silently marking a flat nav as grouped. Smallest check: any structural
   grep on a generator's convention file should skip its own mandated
   preamble before counting anything.
6. **It writes an "applies to: X, Y" scope and never enforces it in the
   verification cell.** DOC-EX-08 says "explanation, reference" but its
   grep, run without a scope, fires on ordinary technical prose fleet-wide
   at a 93% false-positive rate. Smallest check: every verification cell
   whose grep is not inherently page-type-scoped (unlike a frontmatter
   check) must name the scoping mechanism in the same cell, not leave it
   to the applies-to column alone.
7. **It writes a regex with an optional group that swallows the very thing
   the group was there to require.** DOC-AGENT-06's `(for |note (for|to)
   )?agents?` makes its own qualifying prefix optional, so it matches the
   bare noun it was meant to distinguish from a directive. Smallest check:
   for any pattern meant to catch "X used in a specific framing," make the
   framing non-optional and confirm the pattern misses a fixture using X
   in an unrelated sense.
8. **It grades its own greps by running them once, on a fixture it wrote
   itself, and calls that calibration.** Every finding in this dive came
   from running a check against the real fleet, not a hand-picked example.
   Smallest check: before shipping a MUST or SHOULD grep, run it against
   every real page in the adopting fleet and report the false-positive
   count, not just a confirmation that the pattern compiles.

## Contested / evolving

**`marketing-tone-wordlist`, the open question behind DOC-PLAIN-12.
Resolved by absence.** The map named this as an unfinished wave-1 topic:
"what is the evidence-backed banned-word list?" This dive found the
answer is that no such list can be derived from this fleet, because no
genuine marketing-hype instance exists anywhere in it to derive one from.
All 8 fleet-wide hits of the asserted starting list are either literal
technical usage ("unlock" a config flag) or engineering trade-off
language in internal decision records. The honest resolution: ship the
ban at CONSIDER (already at the evidence-level cap for an asserted list),
scope it away from `docs/research/**`-shaped internal design notes per
candidate 6 above, and stop treating the absence of a validated fleet-native
wordlist as a gap to fill later — the gap is that the fleet has nothing to
validate against, not that nobody looked.

**DOC-PLAIN-10 and DOC-PLAIN-12's wordlists overlap on two words
("robust," "unlock"), and both misfire on the same underlying cause.**
Neither family document flags this as a shared defect; each treats its
own wordlist as independent. Resolved here: both need the same fix
(remove the words with an unrelated common technical meaning in this
domain), and a future revision should maintain one shared "words that
double as ordinary technical vocabulary" exclusion list rather than
letting two rules independently rediscover the same false positives.

**DOC-NAV-05's fleet-violation count. Corrected.** The family states
"fleet max is H5 on exactly one page." Measured: two. The second carries a
plausible but mechanically unverifiable carve-out justification (test
coverage exists, but no naming convention binds a specific test file to
`configuration.md` the way DOC-EX-02's `# doc:` key binds a script to a
page). Not a contradiction to arbitrate, a correction to the count plus an
open gap in how the carve-out itself is checked.

**DOC-NAV-06's "two outliers" framing. Corrected to a complete count.**
Illustrative examples in the family's prose read, on a full run, as if
they were the entire violation set. They are not: 16 pages exceed the
threshold, not 2. This changes the shape of the open question the family
already poses (does the rule apply retroactively) from "two pre-existing
exceptions" to "sixteen," which is a materially different rollout cost.

## Sources

This is a measurement dive. Commands and the files scanned, not URLs.

| Path / command | What it is | Why worth reading |
|---|---|---|
| `.agents/research/docs-frame.md` | The frame, its Corrections, and the ten orchestrator decisions | Fleet generator identities, glob exclusions, era |
| `.agents/research/docs-topic-map/wave1-critique.md` | The commission source, Verdict through Commissions table | The exact brief this dive follows |
| `.agents/research/docs-topic-map/wave2-severity-ledger.md` §§1-6 | The per-rule status ledger (`runnable`/`script`/`circular`/`inert`/`heuristic`) this dive's scope trim is built from | Which rows to measure, skip, or cite rather than re-run |
| `.agents/research/docs-plain-english.md` | DOC-PLAIN-01..21, full ruleset and evidence | The rules measured in §2 |
| `.agents/research/docs-navigation-search.md` | DOC-NAV-01..16, full ruleset and evidence | The rules measured in §3 |
| `.agents/research/docs-examples.md` | DOC-EX-01..19, full ruleset and evidence | The rules measured in §4 |
| `.agents/research/docs-machine-readers-and-prior-art.md` | DOC-AGENT-01..18, full ruleset and evidence | The rules measured in §5 |
| `.agents/research/docs-audit/docs-shape.md` | The fleet inventory: 23 surfaces, 248 pages, per-repo generator/prose/structure/link tables | The corpus this dive's 249-file list is built to match |
| `filelist.txt` (scratch, path below) | The exact 249-path file list scanned | Reproduces every count in this file |
| `strip_prose.py` (scratch) | Independent reimplementation of the shared prose-stripping pass | The preprocessing every DOC-PLAIN grep in §2 ran against |
| `plain_checks.py` (scratch) | DOC-PLAIN-01/02/03/05/08/10/11/12 in one script | `python3 plain_checks.py filelist.txt` |
| `plain02_analysis.py` (scratch) | The URL/link-target word-count bug isolation | `python3 plain02_analysis.py filelist.txt` |
| `plain11_12_sample.py` (scratch) | Contextual sampling for DOC-PLAIN-11/12 | `python3 plain11_12_sample.py filelist.txt time\|mkt` |
| `nav_depth.py` (scratch) | DOC-NAV-02/03/04 script, all three generators, with the YAML and mdBook-title fixes | `python3 nav_depth.py <repo>` |
| `nav_checks.py` (scratch) | DOC-NAV-05/06/09/10/11/12/15 | `python3 nav_checks.py filelist.txt` |
| `fixture_clean.md` / `fixture_dirty.md` / `ref_before.md` / `ref_after.md` / `fixture_depth4/` / `fixture_flat9/` / `book_flattened.toml` (scratch) | Every planted-violation fixture used in §2-3 | Confirms each check goes red, not only that it parses |
| `mdl-plain13.jsonc` / `mdl-plain15.jsonc` (scratch) | The exact markdownlint-cli2 configs run | `npx --yes markdownlint-cli2 --config <file> -- <files>` |
| `npx --yes markdownlint-cli2 --version` | Tool identity | v0.23.2 (markdownlint v0.41.1), Node v24.14.0 |
| `which vale; vale --version` | Confirms Vale's absence in this environment | Bounds what DOC-PLAIN-14/20/21 could be tested against here |
| `find <repo>/.claude -iname '*.md'` across 13 fleet repos | 1,089 real agent/skill config files | The corpus DOC-AGENT-14 ran against |
| `git ls-files <recordings-dir>` in `ocx` and `grimoire` | DOC-EX-13's real branching evidence | Confirms the family's cast-commit claim directly |

All scratch files live under
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/wave2-calibration-b/`.
