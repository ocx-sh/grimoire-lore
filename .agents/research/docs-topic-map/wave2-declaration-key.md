---
title: Documentation design, one declaration key for type, tier and operational class
topic: declaration-key-unification
group: cross-cutting
wave: 2
agent: wave2-declaration-key
model: claude-opus-5[1m]
date_researched: 2026-09-05
sources_count: 18
scope: |
  Decides the single mechanism a documentation page uses to declare its content
  type, its use-case tier and its operational class. Tests the candidate
  syntaxes by building a five-page fixture on MkDocs Material 9.7.7, mdBook
  0.5.3 and VitePress 2.0.0-alpha.20, and by compiling the same syntaxes with
  MDX 3.1.1. Reads the primary docs for Docusaurus, Astro Starlight, MkDocs and
  MyST for Sphinx. Fixes the type enum, scopes the tier key, settles runbook and
  changelog, answers whether nav position can replace a per-page tier key,
  ships the exact portable check, and prices the migration for 248 pages. Does
  NOT decide the per-type section contracts, the landing contract, or any prose
  rule.
revises:
  - docs-page-types.md
  - docs-use-case-discovery.md
  - docs-observability.md
  - docs-navigation-search.md
  - docs-plain-english.md
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What actually renders, measured on three generators](#1-what-actually-renders-measured-on-three-generators)
   2. [mdBook turns frontmatter into a searchable fake heading](#2-mdbook-turns-frontmatter-into-a-searchable-fake-heading)
   3. [Order matters: a comment above frontmatter destroys the frontmatter](#3-order-matters-a-comment-above-frontmatter-destroys-the-frontmatter)
   4. [MDX makes the HTML comment a hard build error](#4-mdx-makes-the-html-comment-a-hard-build-error)
   5. [The other three generators the shipped glob claims](#5-the-other-three-generators-the-shipped-glob-claims)
   6. [markdownlint does not object](#6-markdownlint-does-not-object)
   7. [The decision: one key set, one carrier per markup family](#7-the-decision-one-key-set-one-carrier-per-markup-family)
   8. [The type enum, and why each of the nine values earns its slot](#8-the-type-enum-and-why-each-of-the-nine-values-earns-its-slot)
   9. [runbook and changelog, settled](#9-runbook-and-changelog-settled)
   10. [Tier from nav is measured and rejected, but nav is the best seed for type](#10-tier-from-nav-is-measured-and-rejected-but-nav-is-the-best-seed-for-type)
   11. [The check, written and run against the fleet](#11-the-check-written-and-run-against-the-fleet)
   12. [Migration cost for 248 pages](#12-migration-cost-for-248-pages)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- One carrier wins for markdown: a comment line holding one key, placed in the
  first 12 lines of the file. Measured invisible on all three fleet generators.
- YAML frontmatter is disqualified. On mdBook 0.5.3 it renders as a horizontal
  rule plus a real `<h2>` heading, with its own anchor.
- The mdBook damage is worse than wave 1 reported. The fake heading also enters
  the search index as `a-frontmatter.html#doc_type-how-to-doc_tier-everyday`.
- The declaration comment must never sit above an existing frontmatter block.
  Doing so breaks that frontmatter on MkDocs, mdBook and VitePress alike.
- An HTML comment is a hard compile error in MDX 3.1.1, and Docusaurus defaults
  `markdown.format` to `mdx` for `.md` files too.
- So no single literal string works on every generator the shipped glob names.
  The rule ships one key set and one comment opener per markup family.
- The openers are `<!--` for markdown, `{/*` for MDX, `..` for reStructuredText
  and `%` for MyST. One regex alternation reads all four.
- Keys are `doc_type` and `doc_tier`. Two keys, not three. No `doc_ops` key.
- `doc_type` takes nine values: tutorial, how-to, reference, explanation,
  troubleshooting, runbook, landing, readme, changelog.
- `doc_tier` takes three values: first-steps, everyday, integration. It is
  required only on tutorial, how-to and landing pages.
- `runbook` becomes a ninth type value, not a subtype and not a third key. The
  fleet has zero runbook pages and zero `docs/runbooks/` directories.
- DOC-OBS-05's `docs/runbooks/**` path glob is deleted. It matches nothing today
  and it violates DOC-TYPE-02 outright.
- `changelog` becomes a type value, which makes DOC-PLAIN-11's exemption
  implementable for the first time. The fleet has 6 changelog pages.
- `readme` becomes a type value because 6 of 23 fleet surfaces are README-only
  and the shipped glob already claims repo-root markdown.
- Reading tier from nav is rejected on measurement. Zero of nine sites can yield
  all three tier values from their nav config.
- Nav labels encode type, not tier. Across the 7 MkDocs sites, 115 of 122 nav
  pages (94.3%) map to a type value from their top-level group label alone.
- That beats the path classifier's 68.1% and makes nav the migration seed, not
  the runtime source. The check still never reads a path.
- The check is 12 lines of POSIX shell. It reads content only, and it fails
  181 of 181 fleet pages tested today.
- Migration is 248 added lines plus 77 to 110 tier lines. 115 type values seed
  from nav config, 23 from mdBook's flat `SUMMARY.md` need a content read.
- Rollout resolves the DOC-PLAIN-18 versus DOC-TYPE-01 conflict: seed every page
  in one commit, then flip the check to error in the next.

## Findings

### 1. What actually renders, measured on three generators

Wave 1's declaration finding was reasoned from `book.toml`, not rendered. This
round built the same five pages on all three generators and read the output HTML.

Fixture root:
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/wave2-declaration-key/`.

| Fixture | Line 1 | MkDocs Material 9.7.7 | mdBook 0.5.3 | VitePress 2.0.0-alpha.20 |
|---|---|---|---|---|
| `a-frontmatter.md` | `---` YAML block | consumed, invisible | `<hr>` plus a visible `<h2>` | consumed, invisible |
| `b-comment.md` | `<!-- doc_type: how-to doc_tier: everyday -->` | passes through as a comment node, invisible | passes through as a comment node, invisible | stripped from output entirely |
| `c-both-fm-first.md` | frontmatter then comment | both handled, invisible | frontmatter visible, comment invisible | both handled, invisible |
| `d-both-comment-first.md` | comment then frontmatter | frontmatter broken, renders as text | frontmatter broken, renders as text | frontmatter broken, renders as text |
| `e-control.md` | nothing | clean | clean | clean |

Build commands, all run today:

```
.venv/bin/mkdocs build -q -d site        # mkdocs-material 9.7.7
mdbook build                             # mdbook v0.5.3
node_modules/.bin/vitepress build docs   # vitepress 2.0.0-alpha.20
```

The mdBook output for `a-frontmatter.md`, copied from `book/a-frontmatter.html`:

```html
<main>
  <hr>
  <h2 id="doc_type-how-to-doc_tier-everyday"><a class="header" href="#doc_type-how-to-doc_tier-everyday">doc_type: how-to
doc_tier: everyday</a></h2>
  <h1 id="frontmatter-only">Frontmatter only</h1>
  <p>Body text.</p>
</main>
```

The same file on MkDocs Material renders as:

```html
<article class="md-content__inner md-typeset">
  <h1 id="frontmatter-only">Frontmatter only</h1>
  <p>Body text.</p>
</article>
```

The mechanism is plain markdown, not an mdBook bug. A text line followed by a
line of dashes is a setext heading in CommonMark. The opening `---` becomes a
thematic break and the closing `---` underlines the key list into an `<h2>`.

VitePress removing the comment from built HTML is worth noting and does not
change the decision. Every check in this rule set reads the source file, never
the built page.

### 2. mdBook turns frontmatter into a searchable fake heading

The rendered damage is only half of it. mdBook's default search backend indexes
the fabricated heading and gives it a URL.

```
$ grep -o '.\{60\}doc_type.\{60\}' book/searchindex-d56cba74.js | head -1
window.search, JSON.parse('{"doc_urls":["a-frontmatter.html#doc_type-how-to-doc_tier-everyday",...
$ python3 -c "print(open('book/searchindex-d56cba74.js').read().count('doc_type'))"
9
```

Nine occurrences of `doc_type` and nine of `doc_tier` in the search index of a
nine-page fixture. A reader searching that site can land on a heading that is
metadata, not content. This upgrades wave 1's claim from "renders as visible
text" to "corrupts the page outline, the anchor namespace and the search index".

### 3. Order matters: a comment above frontmatter destroys the frontmatter

This was never tested in wave 1 and it is the failure an agent will produce.
Fixture `d-both-comment-first.md`:

Incorrect, and it breaks on all three generators:

```
<!-- doc_type: how-to -->
---
outline: deep
---
# Install a tool
```

VitePress output for that file:

```html
<div class="vp-doc"><div><hr><h2 id="doc-type-how-todoc-tier-everyday">doc_type: how-to doc_tier: everyday</h2>
```

Correct, and clean on all three (fixture `f3-vp-fm-then-comment.md`):

```
---
outline: deep
---
<!-- doc_type: reference -->
<!-- doc_tier: integration -->
# Install a tool
```

Both MkDocs and VitePress require frontmatter to start on line 1. Putting the
declaration above it makes the whole block ordinary content. The rule therefore
says "first line, or the first line after an existing frontmatter block", and
the check reads the first 12 lines rather than only line 1.

Two adjacent comment lines were also tested (`f1-two-comments.md`) and a blank
line between the comment and the H1 (`f4-comment-blank-h1.md`). Both are clean
on all three generators.

### 4. MDX makes the HTML comment a hard build error

Measured with `@mdx-js/mdx` 3.1.1, the compiler Docusaurus 3 and Astro both use:

```
$ node t.mjs
htmlComment ERROR: Unexpected character `!` (U+0021) before name, expected a
character that can start a name, such as a letter, `$`, or `_`
(note: to create a comment in MDX, use `{/* text */}`)
jsComment OK
frontmatter OK
```

MDX's own documentation states the rule: "Instead of HTML comments, you can use
JavaScript comments in braces: `{/* comment! */}`"
([mdxjs.com/docs/what-is-mdx/](https://mdxjs.com/docs/what-is-mdx/)).

This is not confined to `.mdx` files. Docusaurus's config reference gives the
default of `markdown.format` as `'mdx'`, and describes `'detect'` as the option
that "will select the appropriate format automatically based on file extensions:
`.md` vs `.mdx`"
([docusaurus.io/docs/api/docusaurus-config#markdown](https://docusaurus.io/docs/api/docusaurus-config#markdown)).
So on a default Docusaurus 3 site, an HTML comment in a plain `.md` page is a
build failure. The wave-1 critic flagged the shipped glob for claiming
Docusaurus coverage that no rule had been run against. This is the concrete cost
of that gap.

### 5. The other three generators the shipped glob claims

| Generator | Frontmatter | HTML comment | Declaration carrier to use |
|---|---|---|---|
| MkDocs (any theme) | built in, arbitrary keys allowed and passed to the template | invisible | `<!-- -->` |
| VitePress 2 | built in | stripped from output | `<!-- -->` |
| mdBook 0.5.3 | not supported, renders and indexes | invisible | `<!-- -->` |
| Docusaurus 3 | supported, permissive on unknown keys | build error at the default `format: mdx` | `{/* */}` |
| Astro Starlight | validated by a Zod schema in `src/content.config.ts` | ok in `.md`, build error in `.mdx` | `<!-- -->` in `.md`, `{/* */}` in `.mdx` |
| Sphinx MyST | supported | not documented as supported | `%` at line start |
| Sphinx reStructuredText | field lists, not YAML | renders as literal text | `..` comment |

MkDocs' primary source confirms the permissive behaviour: "The key/value pairs
are passed by MkDocs to the page template. Therefore, if a theme includes
support, the values of any keys can be displayed"
([mkdocs.org/user-guide/writing-your-docs/](https://www.mkdocs.org/user-guide/writing-your-docs/)).

Starlight is the one generator where a frontmatter key needs registering.
"Extend Starlight's schema with additional fields by setting `extend` in the
`docsSchema()` options"
([starlight.astro.build/reference/frontmatter/](https://starlight.astro.build/reference/frontmatter/)).
That is a config edit an adopter must make before frontmatter is usable, which
is one more reason not to pick frontmatter as the carrier.

MyST's comment syntax is stated verbatim in its own docs: "You may add comments
by putting the `%` character at the beginning of a line. This will prevent the
line from being parsed into the output document."
([myst-parser.readthedocs.io/en/latest/syntax/typography.html](https://myst-parser.readthedocs.io/en/latest/syntax/typography.html)).

mdBook's markdown reference documents its supported extensions and never
mentions front matter
([rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html)),
which matches the measured render.

### 6. markdownlint does not object

A leading comment line is a plausible trigger for MD041, "first line in a file
should be a top-level heading". Tested rather than assumed.

```
$ npx markdownlint-cli2 "mdlint/*.md"
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Linting: 3 files
Summary: 0 issues in 0 files
```

The three files were a single declaration comment, two stacked declaration
comments, and frontmatter followed by a declaration comment. Neither MD041 nor
MD033 fires. Tier 0 of the gate stays green after migration.

### 7. The decision: one key set, one carrier per markup family

**Keys.** Two, not three.

| Key | Values | Required on |
|---|---|---|
| `doc_type` | `tutorial`, `how-to`, `reference`, `explanation`, `troubleshooting`, `runbook`, `landing`, `readme`, `changelog` | every page in scope |
| `doc_tier` | `first-steps`, `everyday`, `integration` | pages typed `tutorial`, `how-to` or `landing` |

**Carrier.** One key per comment line, in the first 12 lines of the file, on or
after line 1 and never above an existing frontmatter block.

| File | Opener | Example |
|---|---|---|
| `.md`, `.markdown` | `<!--` | `<!-- doc_type: how-to -->` |
| `.mdx` | `{/*` | `{/* doc_type: how-to */}` |
| `.rst` | `..` | `.. doc_type: reference` |
| MyST `.md` | `%` | `% doc_type: reference` |

One key per line, not one packed line. A packed form such as
`<!-- doc: type=how-to tier=everyday -->` was built and rendered fine, and it was
rejected because two anchored greps are simpler than one parse, and because a
missing key then has no distinct error.

Correct:

```
<!-- doc_type: how-to -->
<!-- doc_tier: everyday -->
# Publish a package
```

Correct, on a page that already has frontmatter the generator needs:

```
---
outline: deep
---
<!-- doc_type: reference -->
# CLI reference
```

Incorrect, breaks the frontmatter on all three generators:

```
<!-- doc_type: reference -->
---
outline: deep
---
```

Incorrect, renders as a fake heading and enters the search index on mdBook:

```
---
doc_type: reference
---
```

### 8. The type enum, and why each of the nine values earns its slot

Each value exists because a rule already written cannot be expressed without it.
No value is speculative.

| Value | The rule that needs it | Fleet pages today |
|---|---|---|
| `tutorial` | DOC-DISC-17, DOC-DISC-18, DOC-DISC-19 | 0 |
| `how-to` | DOC-TYPE-03, and the `how-to-and-explanation-contracts` commission | 38 by path heuristic |
| `reference` | DOC-NAV-05, DOC-NAV-06, DOC-TYPE-17 to 21 | 53 |
| `explanation` | the `how-to-and-explanation-contracts` commission | 20 |
| `troubleshooting` | DOC-TYPE-08, GitLab's contract | in the 79 `other` bucket |
| `runbook` | DOC-OBS-05, DOC-OBS-06 | 0 |
| `landing` | DOC-TYPE-10 to 16 | 22 |
| `readme` | 6 of 23 surfaces are README-only, glob claims repo-root markdown | 43 repo-root READMEs |
| `changelog` | DOC-PLAIN-11's exemption | 6 in docs trees, 7 counting roots |

Page counts are from `docs-audit/docs-shape.md` §2 unless noted. The README count
is `ls -d */README.md | wc -l` over `/home/mherwig/dev` today.

`contributing` is deliberately not a value. The fleet's 10 contributing pages are
task pages and declare `doc_type: how-to`. Adding a value for them would buy no
rule.

### 9. runbook and changelog, settled

**`runbook` is a ninth type value.** Not a subtype of troubleshooting and not a
third key.

The argument against a subtype: a troubleshooting page is an error catalogue
keyed by a symptom, and GitLab's contract for it requires an error string as the
heading with a cause and a resolution. A runbook is an ordered procedure. The two
shapes do not share required sections, so inheritance would buy nothing and cost
a second lookup in every rule row.

The argument against a third key such as `doc_ops`: the fleet contains zero
runbook pages and zero `docs/runbooks/` directories today.

```
$ find . -maxdepth 5 -type d -name 'runbook*' | grep -v node_modules
$ grep -ril "runbook" --include='*.md' ocx*/docs ocx/website grimoire/docs
```

Both return nothing. Adding a key with no instances is speculative structure.

**DOC-OBS-05's path glob is deleted.** Its verification currently reads
"Classify mechanically with `type: runbook` frontmatter or a `docs/runbooks/**`
path glob" (`docs-observability.md:163`). The frontmatter half is disqualified by
Finding 1 and the path half is forbidden by DOC-TYPE-02 and matches nothing.
Both halves go, replaced by `doc_type: runbook`.

**`changelog` is a type value.** DOC-PLAIN-11 ships with "applies to: all except
changelog" (`docs-plain-english.md:100`) against an enum with no such value, so
the exemption cannot be implemented as written. With the value present the
exemption is one grep. A changelog is exactly where "latest", "now" and
"currently" are correct, because the entry is dated.

### 10. Tier from nav is measured and rejected, but nav is the best seed for type

The commission asked whether reading tier from `mkdocs.yml`, `SUMMARY.md` or a
VitePress sidebar would remove the retrofit cost on seven of nine sites. Measured
answer: no, and the premise is backwards.

Top-level nav group labels, extracted from every `mkdocs.yml` in the fleet:

```
grimoire-indexer   5 groups  ['Home','How-To','Reference','Explanation','Ops']
ocx-catalog        5 groups  ['Home','How-To','Reference','Explanation','Ops']
ocx-indexbot       5 groups  ['Home','Guide','Reference','Contributing','Changelog']
ocx-mcp            4 groups  ['Home','Getting Started','Reference','Changelog']
ocx-mirror-sdk     9 groups  ['Home','Getting started','Concepts','Guide','Recipes','API reference','Schema','Contributing','Changelog']
ocx-mirror         4 groups  ['Home','Getting Started','Reference','Changelog']
ocx-sdk-python     3 groups  ['Home','Guide','Reference']
```

Every one of those labels names a content type or a product area. The only
tier-shaped label anywhere is "Getting Started", present on 3 of 7 sites, and it
yields one tier value out of three. No site distinguishes `everyday` from
`integration` in its nav.

`grimoire/docs/src/SUMMARY.md:5-24` is a flat list of 21 chapter links with zero
groups, so mdBook contributes zero tier signal. `ocx/website/.vitepress/config.*`
lines 48-105 are flat top-level page links plus two collapsed groups, "Authoring"
and "In Depth". "In Depth" is the one tier-ish label in the fleet.

**0 of 9 sites can yield all three tier values from nav.** Deriving tier from nav
would need a per-project label-to-tier mapping table, which is the same
per-project mapping table DOC-TYPE-02 already rejected for directory names, with
the same failure on reorganisation.

The inverted finding is the useful one. Nav labels seed **type** very well:

```
grimoire-indexer   19/22  (86%)
ocx-catalog        19/23  (83%)
ocx-indexbot        9/9   (100%)
ocx-mcp             6/6   (100%)
ocx-mirror-sdk     35/35  (100%)
ocx-mirror          8/8   (100%)
ocx-sdk-python     19/19  (100%)
TOTAL              115/122 = 94.3%
```

Mapping used: Home to landing, How-To and Guide and Recipes and Getting Started
and Contributing to how-to, Reference and API reference and Schema to reference,
Explanation and Concepts to explanation, Changelog to changelog. The 7 misses are
the `Ops:` groups in ocx-catalog and grimoire-indexer, which are mixed.

94.3% beats the path classifier's 68.1% fleet-wide
(`docs-audit/docs-shape.md` §2: 79 of 248 pages classify as `other`). So nav
config is the migration seed, and it is never the runtime source. The check still
reads content only.

DOC-DISC-21 keeps reading the nav config, because its own obligation is about nav
structure. DOC-DISC-13 and DOC-DISC-21 do not collapse into one check.

### 11. The check, written and run against the fleet

Shipped as `checks/doc-declaration.sh`. POSIX shell, 12 working lines, no
dependency beyond `grep` and `head`.

```sh
#!/usr/bin/env sh
# checks/doc-declaration.sh: list every docs page with no valid declaration.
# Reads file content only. Never reads a path, a directory or a file name.
TYPES='tutorial|how-to|reference|explanation|troubleshooting|runbook|landing|readme|changelog'
TIERS='first-steps|everyday|integration'
OPEN='(<!--|\{/\*|\.\.|%)'
fail=0
for f in "$@"; do
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_type:[[:space:]]*(${TYPES})\b" || {
    echo "$f: no doc_type declaration in the first 12 lines"; fail=1; continue; }
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_type:[[:space:]]*(tutorial|how-to|landing)\b" || continue
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_tier:[[:space:]]*(${TIERS})\b" || {
    echo "$f: doc_type needs a doc_tier and none was declared"; fail=1; }
done
exit $fail
```

It satisfies DOC-TYPE-02 by construction. The script contains no `dirname`, no
`basename` and no path branch, so DOC-TYPE-02's own meta-check passes.

Positive and negative controls, all run:

| Fixture | Content | Result |
|---|---|---|
| `ok1.md` | comment `doc_type: how-to` plus `doc_tier: everyday` | pass |
| `ok2.md` | VitePress frontmatter then `doc_type: reference` | pass |
| `ok3.mdx` | `{/* doc_type: explanation */}` | pass |
| `ok4.rst` | `.. doc_type: reference` | pass |
| `ok5.md` | `% doc_type: changelog` | pass |
| `bad1.md` | `doc_type: how-to` with no tier | fail, tier message |
| `bad2.md` | `doc_type: guide`, not in the enum | fail, no-declaration message |

Against the fleet, restricted to `docs/` and `website/` trees in the 12 live
repos with the standard exclusions:

```
$ wc -l < fleet-pages.txt
181
$ ./doc-declaration.sh $(cat fleet-pages.txt) | grep -c "no doc_type"
181
```

181 of 181 fail today. That is the expected 100% violation rate and it is the
number that decides the rollout order in Finding 12.

### 12. Migration cost for 248 pages

| Work item | Volume | Who does it |
|---|---|---|
| `doc_type` line, seeded from a MkDocs nav label | 115 pages | scripted, 94.3% accurate |
| `doc_type` line, seeded from a path heuristic | about 54 more pages | scripted, needs review |
| `doc_type` line, content read required | about 79 pages, 18 of them in `grimoire` | agent or author |
| `doc_tier` line on tutorial, how-to and landing pages | 77 to 110 pages | agent or author |
| Total added lines | 325 to 358 across 248 files | one commit |

The 79-page content-read bucket is `docs-shape.md` §2's `other` count. Its worst
concentration is `grimoire`, where 18 of 23 pages carry no path signal because the
tree is flat.

Scoping the tier key to three types is what keeps this affordable. Requiring
`doc_tier` on every page, as DOC-DISC-13 does today, would add 248 tier lines
instead of about 100, and would force a tier value onto reference entries and
changelogs where the concept means nothing.

The cost per new page after migration is two lines, or one line for a reference,
explanation, troubleshooting, runbook, readme or changelog page.

## Normative guidance candidates

1. **Declare a page's content type with a `doc_type` comment line, inside the
   first 12 lines, using the comment opener of the file's markup family.**
   Rationale: an undeclared page is silently skipped by every type-scoped rule in
   the set. VERIFICATION: `checks/doc-declaration.sh <files>`, exit 1 lists every
   offender. Evidence: measured (renders on MkDocs Material 9.7.7, mdBook 0.5.3,
   VitePress 2.0.0-alpha.20; MDX 3.1.1 compile). Severity: MUST. CHANGES
   DOC-TYPE-01, which named only the `<!--` opener and a six-value enum.

2. **Never write the declaration as YAML frontmatter.**
   Rationale: on mdBook 0.5.3 the block renders as a horizontal rule plus a fake
   `<h2>`, and that heading enters the search index with its own anchor.
   VERIFICATION: `grep -lE '^doc_(type|tier):' <files>` over the docs glob returns
   nothing, run after stripping nothing. Evidence: measured (fixture
   `a-frontmatter.md`, `book/searchindex-d56cba74.js` carries 9 `doc_type`
   occurrences). Severity: MUST. CHANGES DOC-TYPE-01 and REPLACES the frontmatter
   half of DOC-DISC-13, DOC-DISC-17 and DOC-OBS-05.

3. **Never place the declaration comment above an existing frontmatter block.**
   Rationale: frontmatter must start on line 1, so a comment above it turns the
   whole block into visible content on MkDocs, mdBook and VitePress alike.
   VERIFICATION: `head -n 1 <file>` is `---` whenever the file contains a
   frontmatter block. A page whose line 1 is a declaration comment and whose line
   2 is `---` fails. Evidence: measured (fixture `d-both-comment-first.md`,
   three generators). Severity: MUST. NEW.

4. **Use `{/* doc_type: V */}` in `.mdx`, and never an HTML comment there.**
   Rationale: `@mdx-js/mdx` 3.1.1 raises "Unexpected character `!` (U+0021)
   before name" and the build fails. VERIFICATION:
   `grep -l '<!--' -- '*.mdx'` returns nothing. Evidence: measured (MDX 3.1.1
   compile of the three candidate syntaxes). Severity: MUST. NEW.

5. **On a Docusaurus site, set `markdown.format` to `detect` before adopting the
   declaration in `.md` files.**
   Rationale: the default is `'mdx'`, so a plain `.md` page with an HTML comment
   fails the build ([docusaurus.io/docs/api/docusaurus-config#markdown](https://docusaurus.io/docs/api/docusaurus-config#markdown)).
   VERIFICATION: `grep -E "format:\s*['\"](detect|md)['\"]" docusaurus.config.*`
   finds a line, or every page in the tree uses the MDX opener. Evidence:
   normative (Docusaurus config reference) plus measured (MDX 3.1.1). Severity:
   MUST when a `docusaurus.config.*` file is present. NEW.

6. **Take `doc_type` from a fixed enum of nine values: tutorial, how-to,
   reference, explanation, troubleshooting, runbook, landing, readme,
   changelog.**
   Rationale: three rules already reference values the six-value enum does not
   carry, so they are unimplementable as written. VERIFICATION: the enum in
   `checks/doc-declaration.sh` lists exactly these nine, and every `applies to`
   cell in the rule set names only values from that list. Evidence: measured
   (fleet page counts per value, `docs-shape.md` §2) plus normative (Diataxis
   four, GitLab's fifth). Severity: MUST. CHANGES DOC-TYPE-01.

7. **Declare a runbook as `doc_type: runbook`, and delete every path-glob
   classifier for it.**
   Rationale: `docs/runbooks/**` matches zero paths in the fleet and violates
   DOC-TYPE-02's ban on path inference. VERIFICATION:
   `grep -n 'runbooks/\*\*' <rule files>` returns nothing, and
   `checks/doc-declaration.sh` accepts `runbook`. Evidence: measured
   (`find -type d -name 'runbook*'` and `grep -ril runbook` over the fleet both
   return nothing). Severity: MUST. CHANGES DOC-OBS-05 and DOC-OBS-06.

8. **Exempt a page declaring `doc_type: changelog` from the time-relative word
   ban.**
   Rationale: a dated entry is the one place "latest" and "now" are correct, and
   the exemption is currently written against a value that does not exist.
   VERIFICATION: the DOC-PLAIN-11 runner skips any file whose first 12 lines match
   the `doc_type: changelog` pattern. Evidence: codified (the exemption is already
   written into DOC-PLAIN-11) plus measured (6 changelog pages in fleet docs
   trees). Severity: SHOULD, matching DOC-PLAIN-11's own severity. CHANGES
   DOC-PLAIN-11.

9. **Declare `doc_tier` only on pages typed tutorial, how-to or landing.**
   Rationale: the tier is a position in a reader's journey, and a reference entry
   or a changelog occupies no position in it. VERIFICATION: the second half of
   `checks/doc-declaration.sh`, which demands a tier only after matching one of
   those three types. Evidence: measured (scoping cuts the retrofit from 248 tier
   lines to 77-110) plus argued (which types carry a journey position). Severity:
   MUST for the three named types, silent for the rest. CHANGES DOC-DISC-13, which
   applies to all pages today.

10. **Keep `doc_tier` to `first-steps`, `everyday` and `integration`.**
    Rationale: an "edge reference" tier would re-merge the type axis into the tier
    axis, which `docs-frame.md` correction 5 rules out. VERIFICATION: the `TIERS`
    variable in `checks/doc-declaration.sh` lists exactly three values. Evidence:
    normative (`docs-frame.md` correction 5). Severity: MUST. CHANGES DOC-DISC-13
    only in its carrier, not its enum.

11. **Never derive a page's tier from its nav position.**
    Rationale: zero of nine fleet sites can produce all three tier values from
    their nav config, and a label-to-tier table would drift the same way a
    path table does. VERIFICATION: the tier check reads file content only, and
    `grep -nE 'mkdocs\.yml|SUMMARY\.md|sidebar' checks/doc-declaration.sh` returns
    nothing. Evidence: measured (nav group labels from all 7 `mkdocs.yml` files,
    `grimoire/docs/src/SUMMARY.md:5-24`, `ocx/website/.vitepress/config.*:48-105`).
    Severity: MUST. NEW, and it closes the deferred
    `tier-from-nav-versus-tier-from-frontmatter` question.

12. **Seed the migration from the nav config, then throw the seed away.**
    Rationale: 115 of 122 MkDocs nav pages (94.3%) map to a type from their group
    label, against 68.1% for the path heuristic, so the cheapest first pass is a
    one-off script. VERIFICATION: the seeding script lives outside `checks/` and
    is not wired into CI. Evidence: measured (94.3% from the nav-label mapping run
    today, 68.1% from `docs-shape.md` §2's 79-of-248 `other` count). Severity:
    CONSIDER. NEW.

13. **Land every declaration in one commit before the check runs at error.**
    Rationale: the check fails 181 of 181 pages today, and DOC-PLAIN-18 forbids
    launching a rule at error with any current violation. VERIFICATION:
    `checks/doc-declaration.sh $(git ls-files 'docs/**/*.md')` exits 0 on the
    commit that flips the gate to error. Evidence: measured (181/181 failing) plus
    codified (DOC-PLAIN-18). Severity: MUST. CHANGES DOC-TYPE-01's rollout and
    resolves the DOC-PLAIN-18 versus DOC-TYPE-01 conflict.

14. **Scope the declaration check to published documentation only.**
    Rationale: the shipped glob otherwise fires on this program's own research
    corpus and on every repo's agent notes. VERIFICATION: the file list is
    `git ls-files` under a directory holding a generator config, plus repo-root
    `README.md` and `CHANGELOG.md`. Directories named `.agents`, `.claude`,
    `.serena`, `.worktrees` and build output are excluded. Evidence: measured
    (`docs-shape.md` §0: a naive `find` loads 420 Lighthouse reports and 257 stale
    worktree files). Severity: MUST. NEW.

15. **Read the type from the declaration in every rule that scopes by type.**
    Rationale: DOC-NAV-05, DOC-NAV-06 and DOC-NAV-11 say "declares type
    reference" without naming a mechanism, so today they cannot run.
    VERIFICATION: each of those rules calls
    `checks/doc-declaration.sh --type <file>` or the equivalent inline grep, and
    no rule row contains the phrase "declares type" without a command. Evidence:
    codified (the rows exist and lack a mechanism). Severity: MUST. CHANGES
    DOC-NAV-05, DOC-NAV-06 and DOC-NAV-11.

16. **Say `unverified: reading heuristic` on any declaration row with no
    command.**
    Rationale: DOC-AGENT-16 requires the literal marker and no row in this file
    needs it, which is the point. VERIFICATION: every row above carries a runnable
    command. Evidence: asserted. Severity: pinned, this file's own contract. NEW
    beside DOC-AGENT-16.

## AI-agent angle

What an agent gets wrong, in the order it bites.

1. **It writes YAML frontmatter.** Frontmatter is overwhelmingly the shape in
   training data, so an agent told to "add metadata to the page" reaches for
   `---`. On mdBook that silently ships a fake heading into the search index.
   Smallest catch: `grep -lE '^doc_(type|tier):' <files>` over the docs glob must
   return nothing.

2. **It puts the comment above existing frontmatter.** The agent sees "first
   line" in the rule and obeys it literally, destroying the frontmatter the page
   already had. Smallest catch: a file whose line 1 matches the declaration
   pattern and whose line 2 is `---` fails.

3. **It invents an enum value.** `doc_type: guide`, `doc_type: overview` and
   `doc_type: api` are all more frequent in training data than `explanation`.
   Smallest catch: the check matches only the nine literal values, so an invented
   value reads as no declaration at all. Verified with fixture `bad2.md`.

4. **It puts a tier where a type belongs.** `doc_type: getting-started` is the
   single most likely mistake, because "getting started" is the fleet's own nav
   label on three sites. Smallest catch: same enum match, and the error message
   names the nine values.

5. **It uses an HTML comment in an `.mdx` file.** The build then fails with a
   parser error that does not mention documentation. Smallest catch:
   `grep -l '<!--' -- '*.mdx'` returns nothing.

6. **It reads the type from the directory.** Asked to check a rule scoped to
   reference pages, an agent writes `if "reference" in path`. Smallest catch:
   DOC-TYPE-02's meta-check, `grep -nE 'dirname|basename|\bpath\b' checks/doc-declaration.sh`
   returns nothing.

## Contested / evolving

**Two mutually exclusive MUSTs for the declaration mechanism.** Resolved for the
comment, against frontmatter, on rendered evidence rather than reasoning.
DOC-TYPE-01/02 were right and their evidence was weaker than it needed to be.
mdBook 0.5.3 does not merely render the block, it indexes a fabricated heading
and gives it a URL. DOC-DISC-13, DOC-DISC-17 and DOC-OBS-05 all lose their
frontmatter carrier and move to the comment.

**Is `runbook` a sixth type, a subtype, or a third key?** Resolved as a type
value. A subtype would make troubleshooting's section contract apply to a page
shape it does not describe. A third key would add structure for zero fleet
instances, measured with `find -type d -name 'runbook*'` and
`grep -ril runbook`, both empty. DOC-OBS-05's path glob is deleted in the same
move, which removes the one place the rule set contradicts DOC-TYPE-02.

**Does `changelog` need a value?** Yes. DOC-PLAIN-11 already ships an exemption
for it against an enum that lacks the value, so the rule is unimplementable
today. Six changelog pages exist in fleet docs trees and seven counting repo
roots.

**Can nav position substitute for a per-page tier key?** No, measured. Zero of
nine sites can produce all three tier values from nav. Three of seven MkDocs
sites carry one tier-shaped label, "Getting Started", and none distinguishes
everyday from integration. grimoire's `SUMMARY.md` has no groups at all. The
premise in the deferred item, that nav would remove the retrofit on seven of nine
sites, is wrong for tier and right for type: nav labels seed a type value on
115 of 122 MkDocs nav pages, 94.3%.

**Does DOC-DISC-13 collapse into DOC-DISC-21?** No. DOC-DISC-21 is about nav
structure and keeps reading the nav config. DOC-DISC-13 is about a per-page fact
and keeps reading the page. They stay two checks.

**Does the declaration rule ship at MUST on day one?** It ships at MUST and it
does not run at error until the seeding commit lands. That resolves the
DOC-PLAIN-18 versus DOC-TYPE-01 conflict without demoting either rule. The check
fails 181 of 181 pages measured today, so an error-severity launch would red the
fleet and get switched off, which is the failure DOC-PLAIN-18 exists to prevent.

**Open, and honestly so.** The Astro Starlight and Sphinx rows in Finding 5 rest
on primary documentation, not on a built fixture. No Starlight or Sphinx site
exists in the fleet to build against. The Docusaurus row is stronger, because the
MDX compile that Docusaurus uses was run directly. If the shipped glob keeps
naming `astro.config.*` and `docs/conf.py`, someone should build those two
fixtures before the rule claims them.

## Sources

| URL or path | What it is | Date / era | Why worth reading |
|---|---|---|---|
| `scratchpad/wave2/wave2-declaration-key/mkdocs/` | Built MkDocs Material 9.7.7 fixture, 9 pages, 5 declaration shapes | 2026-09-05 | The primary measurement for MkDocs render behaviour |
| `scratchpad/wave2/wave2-declaration-key/mdbook/` | Built mdBook 0.5.3 fixture, same 9 pages plus `SUMMARY.md` | 2026-09-05 | Proves the fake heading and the search-index pollution |
| `scratchpad/wave2/wave2-declaration-key/vitepress/` | Built VitePress 2.0.0-alpha.20 fixture, same 9 pages | 2026-09-05 | Shows comments stripped from output and frontmatter order |
| `scratchpad/wave2/wave2-declaration-key/mdx/t.mjs` | `@mdx-js/mdx` 3.1.1 compile of the three candidate syntaxes | 2026-09-05 | The only decisive test of the MDX branch |
| `scratchpad/wave2/wave2-declaration-key/doc-declaration.sh` | The shipped check, with 7 controls and a 181-page fleet run | 2026-09-05 | The verification every rule row above cites |
| [mdxjs.com/docs/what-is-mdx/](https://mdxjs.com/docs/what-is-mdx/) | MDX primary docs, comment syntax | 2026 | States the `{/* */}` requirement in MDX's own words |
| [docusaurus.io/docs/api/docusaurus-config#markdown](https://docusaurus.io/docs/api/docusaurus-config#markdown) | Docusaurus config reference, `markdown.format` | Docusaurus 3, 2026 | Gives the `'mdx'` default that makes `.md` an MDX file |
| [docusaurus.io/docs/markdown-features#front-matter](https://docusaurus.io/docs/markdown-features#front-matter) | Docusaurus front matter behaviour | Docusaurus 3, 2026 | Confirms permissive handling of unknown keys |
| [starlight.astro.build/reference/frontmatter/](https://starlight.astro.build/reference/frontmatter/) | Starlight frontmatter reference and `docsSchema()` `extend` | 2026 | The one generator where a custom key needs registering |
| [www.mkdocs.org/user-guide/writing-your-docs/](https://www.mkdocs.org/user-guide/writing-your-docs/) | MkDocs meta-data section | 2026 | Confirms built-in YAML parsing and arbitrary keys |
| [rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html) | mdBook markdown reference | mdBook 0.5, 2026 | Documents every supported extension and never front matter |
| [myst-parser.readthedocs.io/en/latest/syntax/typography.html](https://myst-parser.readthedocs.io/en/latest/syntax/typography.html) | MyST typography, Comments section | 2026 | Gives the `%` comment syntax for Sphinx markdown |
| `.agents/research/docs-page-types/page-type-set-and-declaration.md` §4-§5 | Wave 1 declaration sub-artifact | 2026-09-05 | The claim this round tested rather than assumed |
| `.agents/research/docs-audit/docs-shape.md` §0, §2 | Fleet inventory and path classifier | 2026-09-05 | The 248-page and 79-`other` numbers used for cost |
| `/home/mherwig/dev/*/mkdocs.yml` (7 files) | Fleet MkDocs nav blocks | 2026-09-05 | The 94.3% type-seed and 0-of-9 tier measurements |
| `/home/mherwig/dev/grimoire/docs/src/SUMMARY.md:5-24` | mdBook nav, flat 21-chapter list | 2026-09-05 | The site that supplies no nav signal of any kind |
| `/home/mherwig/dev/ocx/website/.vitepress/config.*:45-105` | VitePress sidebar | 2026-09-05 | The only tier-ish nav label in the fleet, "In Depth" |
| markdownlint-cli2 v0.23.2 / markdownlint v0.41.1 run | Lint of three declaration shapes | 2026-09-05 | Proves MD041 and MD033 stay quiet after migration |
