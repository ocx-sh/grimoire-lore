---
title: Pitch surfaces and first-screen copy
summary: The MKT-PAGE family, owning which pages count as pitch surfaces, the doc_surface declaration, and what a hero or README opening must contain beyond what docs-quality already enforces
---

# Pitch surfaces and first-screen copy

Owns which pages are pitch surfaces and what their first screen contains: the
category noun, the differentiator, the maturity line, the grade-word ban and the
offer-page elements. Sentence identity is `MKT-POS`, claims `MKT-CLAIM`, voice
`MKT-VOICE`. Length, calls to action and adoption links on a `doc_type: landing`
page are docs-quality's `DOC-TYPE-10` to `DOC-TYPE-15`; README structure is
`DOC-TYPE-32` to `DOC-TYPE-36`; built `<h1>` count and markup are `ux-quality`'s.

Set `CHECKS=.claude/skills/marketing-quality-reference/checks`
(`$CLAUDE_CONFIG_DIR/skills/marketing-quality-reference/checks` when installed
globally). `DOCS=.claude/skills/docs-quality-reference/checks` is the docs-quality
`checks/` directory, which owns the `doc_surface` key. Run from the repository root. `PAGE` is a built page (`dist/index.html`).

Contents: [Dates and Versions](#dates-and-versions) · [Scope and the doc_surface Declaration](#scope-and-the-doc_surface-declaration) ·
[First Screen Defined](#first-screen-defined) · [Scope and Declaration Rules](#scope-and-declaration-rules) ·
[Hero Content Rules](#hero-content-rules) · [Maturity and Status Rules](#maturity-and-status-rules) ·
[Docs Home Rule](#docs-home-rule) · [Offer Page Rules](#offer-page-rules) · [Check Blocks](#check-blocks) ·
[Maturity Vocabulary](#maturity-vocabulary) · [Precedence Over docs-quality](#precedence-over-docs-quality) ·
[Where the README Sits](#where-the-readme-sits) · [Ask the Owner](#ask-the-owner) · [Not Studied](#not-studied) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Fetched 2026-11-27 unless a date says otherwise.

| Fact | Source and date | Re-check |
|---|---|---|
| 22 of 25 exemplar heroes name a category in the H1 or the subhead. **LLM-rated**: two blind model raters from two vendors agreed on 23 of 25 H1 labels (kappa 0.88). No human rated the set | Exemplar corpus fetched 2026-11-27 | 12 months |
| The homepage should be "an elevator pitch to prospective customers", with "a concise tagline" unless the name makes the purpose obvious. NN/g names no H1, subhead or category noun: placing the recorded noun there is this ruleset's way to make it checkable | [NN/g, 2024-03-15](https://www.nngroup.com/articles/homepage-design-principles/) | 12 months |
| H1 constructions and failure classes (practitioner, B2B scope) | [Fletch, 2026-04-07](https://fletchpmm.com/newsletter/how-to-write-an-h1) | 12 months |
| Leading with AI backfires when it is weak or not tied to a job | [Fletch, 2026-11-07](https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning) | 6 months |
| SemVer 2.0.0 section 4: "Major version zero (0.y.z) is for initial development. Anything MAY change at any time." Section 5 defines 1.0.0 | [semver.org](https://semver.org/), undated | 24 months |
| Project status vocabulary: [repostatus.org](https://www.repostatus.org/), undated; [Kubernetes deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/), undated | As linked | 24 months |
| GitHub "Get a repository" returns `archived` as a required boolean | [GitHub REST docs](https://docs.github.com/en/rest/repos/repos#get-a-repository), API version 2026-03-10 | 12 months, or on a new REST API version |
| Price is the top information need of business customers ([NN/g, 2013-12-01](https://www.nngroup.com/articles/show-price/)). Complex offers may keep prices private, analyst opinion ([Forrester, 2019-12-04](http://www.forrester.com/blogs/prices-public-on-website/)). 25% of 451 buyers rank transparent cost first, vendor survey ([Clutch, 2020-02-26](https://clutch.co/press-releases/b2b-buyers-most-concerned-about-transparent-costs-b2b-companies-websites)). SaaS form fills 2.8% with transparent pricing against 4.6% without, vendor data, SaaS only ([HockeyStack, 2025-12-15](https://hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages)) | As linked | 12 months. A productized fixed-price exemplar set is the trigger to reconsider MKT-PAGE-12 as MUST |
| 21 software-service pages: 14 to 16 of 21 heroes name the service type, 1 names the buyer, 2 give an engagement signal, 0 print a price, 0 say what happens after the click | Server HTML, one rater plus scripts, 2026-11-27 | 12 months |
| Astro drops JavaScript comments from the build; HTML-style comments stay in the DOM. Starlight's per-page `head` field renders a `<meta>`. An Astro 7.4.13 and Starlight 0.43.1 build kept the meta and a template HTML comment | [Astro docs](https://docs.astro.build/en/basics/astro-syntax/), undated. [Starlight frontmatter reference](https://starlight.astro.build/reference/frontmatter/), "Last updated: May 7, 2026" | On every Astro or Starlight major bump: rebuild, re-run the meta check |
| MKT-PAGE-06 label arm: gawk's `IGNORECASE` is silently ignored by `mawk`, so the awk uses `tolower()` | GNU awk 5.2.1 and `mawk`, 2026-11-27 | 24 months, or when the `STAGE` list changes |

## Scope and the doc_surface Declaration

Scope is a declaration, never the `doc_type: landing` tag. Of 12 measured pages
tagged `landing`, 1 was a pitch, 5 were docs homes and 6 were section hubs. A
README is `doc_type: readme` and also a pitch surface, so type and surface are two
axes: the key is `doc_surface`.

| Value | Page | First-screen rules that apply |
|---|---|---|
| `pitch` | The product site root that renders a hero | MKT-PAGE-02 to 09, 14 |
| `home` | The docs entry page of a product, no hero | MKT-PAGE-11, 14 |
| `offer` | A page that sells a service engagement | MKT-PAGE-12, 13, 14 |
| none | A section hub, and every other page | none |

The pitch surfaces are: a page declared `pitch`, the first screen of the
repository-root README of every repository that publishes a release or a package
(a stranger reaches it without passing the site), and a page declared `offer`.

**Who owns the key.** `docs-quality` owns `doc_surface`: its enum (`pitch`, `home`, `offer`), its carriers (a source comment of the first 12 lines after any front matter, and the built `<meta name="doc-surface" content="V">` for any source, which is the only carrier an `.astro` page has), and its parsing. See the declaration section of docs-quality's page-types depth file, `DOC-TYPE-01` and `$DOCS/doc_declaration.py`. This file keeps only which first-screen rules each value brings. Starlight declares the meta in the page's `head:` field. A `//` comment in an `.astro` frontmatter fence is dropped by the build.

**Why a declaration, and why built HTML.**

- A README counts as a pitch whether or not a site exists. A stranger reaches the repository page from search, from a registry and from links without passing the site, and GitHub shows the README under the repository name with no other page in front of it. One strong exemplar redirects its pitch URL to the repository.
- The declaration is the scope. The implicit test (the built `/` route renders a hero `<h1>`) is only the audit that finds an undeclared pitch, never the scope itself, because `DOC-TYPE-02` forbids reading a page's role from its path.
- First-screen checks read the built HTML, not the source. A pitch keeps its words in a component: a source scan returned 0 findings on the one real pitch and 6 false findings on 5 hubs and docs homes. The declaration follows the same logic: a `//` comment in an `.astro` frontmatter fence never reaches the build, so a component-rendered pitch declares itself with the built meta.

## First Screen Defined

Every rule reads the same two extractions, both in `positioning_check.py`, from built HTML, not source.

| Surface | First screen, as a check reads it |
|---|---|
| `pitch` or `offer` page | The hero segment of the **built** HTML: it starts at the first `<section>` whose class contains `hero`, or at `<main>`, and runs from the first `<h1>` after that point to the next `<h2>`. "Subhead" is the first `<p>` of 4 or more words after that `<h1>`. A Starlight page puts a site-title `<h1>` inside `<main>`, hence the hero section first. `python3 -I "$CHECKS"/positioning_check.py hero "$PAGE"` prints the H1, the subhead and the hero text, one per line. A page with no `<h1>` exits 1: a failed first screen |
| Repository-root README | The first 15 non-blank source lines after removing HTML wrapper lines (`<div>`, `<p align>`, `<img>`, `<picture>`, `<source>`, `<br>`) and badge lines (`[![`), stopping at the first `## ` heading. A proxy, not a rendered measurement. `python3 -I "$CHECKS"/positioning_check.py readme-window README.md` prints `path:line:text` |

## Scope and Declaration Rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-PAGE-01 | Apply marketing first-screen rules only to a page declared `doc_surface: pitch`, to a page declared `doc_surface: offer`, and to the first screen of the repository-root README of a repository that publishes a release or a package. Never scope such a rule to `doc_type: landing`. On an `offer` page MKT-PAGE-03 and MKT-PAGE-06 to 10 do not apply: MKT-PAGE-12 and 13 take their place. | 1 of 12 measured `landing`-tagged pages is a pitch, because the tag fires on hubs. | `git grep -n -F -e 'doc_type: landing' -- "$RULE"` prints nothing for a marketing rule file `RULE`. A rule for offer pages names the value: `git grep -c -E -e 'doc_surface: *offer' -- "$RULE"` prints at least 1. README scope: block MKT-PAGE-01. Skip count: `python3 -I "$DOCS"/doc_declaration.py --built dist` prints `pitch=N home=M offer=K skipped_no_doc_surface=S`. | MUST |
| MKT-PAGE-02 | Declare the page that renders a product site's `/` route with a hero as a pitch, with `<meta name="doc-surface" content="pitch">` in its built `<head>`, whatever its source. When its source is Markdown or MDX, also put `doc_surface: pitch` as a source comment in the first 12 lines after any front matter. Never put the declaration in an `.astro` frontmatter fence. Declare `home` on the docs entry page of every product the same way. Give a section hub no declaration. | Agents and checks cannot tell a pitch from a hub without a declaration. Astro drops JavaScript comments from the build; a meta added through `head` rendered in a real build. | After the build, `python3 -I "$DOCS"/doc_declaration.py --built dist --need index.html` exits 0. It fails a `/` page that has an `<h1>` and no meta, a doubled meta, and a value outside `pitch`, `home`, `offer`. It does not decide which value is right: MKT-PAGE-11 and the owner do. Source side: `python3 -I "$DOCS"/doc_declaration.py --root .` fails a source comment whose value is outside the enum (`DOC-TYPE-01`, Markdown and MDX only). Grep arm: block MKT-PAGE-02. | MUST |
| MKT-PAGE-14 | Make the built `<meta name="doc-surface">` and the source comment of the same route name the same value. Never edit one without the other. | Two declarations of one fact drift: a measured page's source said `pitch` and its built meta said `home`. Markdown and MDX only: an `.astro` page has no source declaration. | `python3 -I "$DOCS"/doc_declaration.py --pair "$BUILT" "$SOURCE"` exits 0 when the values are equal or the source has none, and 1 on a mismatch. | SHOULD |

## Hero Content Rules

- **The noun is a literal match.** A synonym fails, because a generic category lexicon passes a slogan hero on the word "tools". With no record the check stops with exit 2 rather than guess. MKT-POS-08 lets the `<title>` carry the noun when the h1 is a slogan. MKT-PAGE-03 is stricter on the hero and accepts only the H1 or the subhead, so a hero that passes MKT-PAGE-03 also passes MKT-POS-08. A test that asks for the noun on "at least 3 of 4 surfaces" was rejected, because it lets the hero be the surface that drops the noun.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-PAGE-03 | Put the product's recorded category noun (`category` in `.agents/positioning.toml`, MKT-POS-02) in the hero H1 or in the subhead. A slogan H1 is allowed only when the subhead carries the noun. A synonym does not count: change the hero, or ask the owner to change the record. When no record exists, stop and ask (MKT-POS-03): do not pick a noun. | A reader who cannot name the kind of thing cannot decide to try it. 22 of 25 exemplar heroes name a category (LLM-rated). The literal match is deliberate: MKT-POS-09's `forbidden` list stops variant nouns. On a `home` page the requirement is SHOULD: 4 of 6 exemplar docs homes repeat the noun. | `python3 -I "$CHECKS"/positioning_check.py hero-noun "$PAGE"` exits 0. Exit 2 means no record: a stop, never a pass. No lexicon fallback: a generic lexicon passes a slogan hero on the word "tools". Pass "The web framework for content-driven websites". Fail "Same tools. Every machine." with a subhead that holds no category noun. | MUST |
| MKT-PAGE-04 | Build the hero H1 and subhead, and the README description paragraph, as category or job plus one differentiator: a clause that the reader's current alternative could not print unchanged. Do not write an outcome that no software delivers alone ("drive revenue"), one that draws "but what does that mean?" ("automate systems"), or a list of three or more audiences or outcomes. | Only the Fletch constructions are sourced. Only 6 of 18 measured READMEs state a differentiator. Tests 1 and 2 are judgement: advice, not a gate. | `unverified: reading heuristic`, three tests. (1) Name removal: delete the product name and version, and the remainder still names a category or a job. (2) Competitor swap: could a team using the first `alternatives` entry (MKT-POS-06) print the sentence unchanged? With the alternative "a curl-and-chmod script per tool": fail "Same tools. Every machine."; pass "Pins each tool to a digest in a lockfile". (3) Count: at most two items in any list of audiences or outcomes. | CONSIDER |
| MKT-PAGE-05 | Put no "AI", "AI-powered", "AI-driven", "AI-native" or "agentic" in the hero H1, the subhead or the README tagline, unless the word sits inside the recorded `category` or `object`, or the record has `status = "reviewed"` and `trend_words.hero` is not `"banned"`. Treat "agent" or "agents" the same way only when the copy presents the product itself as the agent. An agent the product serves or installs into is not AI framing. | Agents add AI framing by default. It backfires when the AI is weak, not tied to a job or not backed by reputation. | Block MKT-PAGE-05. Each mechanical hit must be a substring of `category` or `object`, or the `trend_words` exception must hold. With no record, report the hit to the owner (MKT-POS-03). The "agent" arm is `unverified: reading heuristic`. Pass an object noun like "AI-agent config". Fail "The agentic package manager". | SHOULD |

## Maturity and Status Rules

- **SHOULD, not MUST.** Upstream practice is silence: 0 of 25 landing pages and 1 of 39 READMEs with a release tag state a status. SemVer section 4 describes the API, not the page, and repostatus.org only suggests a badge. The line is still recommended, because the readers of this copy include coding agents that run README commands with no human present. That reason is argued, not measured, and no conversion data exists for it or against it. A SHOULD warns, and the warning needs a recorded reason to pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-PAGE-06 | When the manifest version or the latest release tag has major 0, or the product is labelled concept, skeleton, alpha, beta, preview, experimental, unmaintained or moved, state that stage in one plain-text sentence inside the first screen. The sentence makes the product its subject ("mytool is in early development") or opens its line with a stage label followed by `:` or `.` ("Status: skeleton.", "Pre-1.0:"). A stage word that qualifies a feature ("hooks are experimental") does not count. In a README put the line before any install block. In a hero put it in the hero segment. A footer note, a `## Status` section further down or an image-only badge does not count. | SemVer section 4: anything MAY change below 1.0. An agent that reads only text cannot see a badge image. SHOULD: no primary source requires a status line, and upstream practice is silence (0 of 25 landing pages, 1 of 39 READMEs with a release tag). Coding agents run README commands with no human present. | Block MKT-PAGE-06: read the version, then the README window and line 3 of the hero must each print at least 1. A label-arm hit counts only when the physical line before it is blank, a heading or the file start. | SHOULD |
| MKT-PAGE-07 | Write the maturity sentence with the stage word first and then what may change, with no adjectives: "Pre-1.0: the CLI works, and commands or the config format may change between minor releases." Take the stage word from the vocabulary table. When the record has a `maturity` field (MKT-POS-02), use its word. | A reader needs the stage and the consequence. "We are just getting started" gives neither. | `unverified: reading heuristic`. The sentence contains one vocabulary word and names one thing that may change (command, flag, format, API, config). Fail "Exciting early days!". | SHOULD |
| MKT-PAGE-08 | Back every maturity line with a `[[claim]]` row of class `maturity` in the repository-root `claims.toml`, using the MKT-CLAIM-04 schema (`definition`, `subject_version`, `caveat`, `approved_by`). Set `subject_version` to the current manifest version and `refresh_by` to the next release. | A status line written once turns false when the product ships 1.0 or stops. SHOULD until the MKT-CLAIM-01 lint is in force, MUST once it is. | `git grep -n -E -e 'class *= *"maturity"' -- claims.toml` prints a row, and the version comparison in block MKT-PAGE-08 exits 0. When the MKT-CLAIM-01 lint is in force, its check D replaces the comparison. | SHOULD (MUST once the MKT-CLAIM-01 lint ships) |
| MKT-PAGE-09 | Never write "stable", "production-ready", "battle-tested", "enterprise-grade" or "mature" as a claim on a first screen while the version major is 0, or while the `maturity` value is concept, skeleton, alpha, beta or pre-1.0. This holds even when a claims record exists. A negated form ("not stable yet", "isn't production-ready") is a maturity statement and is allowed. A word that names a release channel ("the stable channel", "latest-stable") is not a grade claim. | SemVer section 4 says the public API "SHOULD NOT be considered stable" below 1.0. The ban is this ruleset's policy built on that clause. At 1.0 and above the words need a record and a named human sign-off (MKT-CLAIM-02, MKT-CLAIM-16). | Block MKT-PAGE-09. A grade-pattern line fails when the version starts with `0.`, unless it matches the negation pattern (exempt) or the channel pattern (a reader decides). Self-test: "not yet stable" is exempt, "A stable package manager" fails. | MUST |
| MKT-PAGE-10 | (MUST) When the repository is archived, make the first content line of the README say so. (SHOULD) Do the same when the record's `maturity` is unmaintained or moved, or when the owner says work has stopped, and also make the same statement the first line of the hero segment. | One upstream README (1 of 39) opens on "no longer actively maintained". Only the `archived` flag is machine-readable, so "the maintainer has stopped" is SHOULD. | Block MKT-PAGE-10. MUST half: when `archived` prints `true`, the first README window line matches the pattern. SHOULD half: a reading check of line 3 of the hero against the same pattern. | MUST (archived README line); SHOULD (rest) |

## Docs Home Rule

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-PAGE-11 | Write no hero on a `doc_surface: home` page or on a hub: no tagline stack, no differentiator band, no proof section. In a product with no pitch page, the README is the pitch and the docs home stays `home`. Promote a docs home to a pitch only on the owner's decision. | Agents read "home page" as "marketing page". 8 of 10 measured docs sites have no pitch page, and their docs homes open on a plain description and a command, which works. | Block MKT-PAGE-11: no hero markup in the home source, and no `class="...hero..."` in any built page that declares `home`. The tagline stack is `DOC-TYPE-10`'s second-lead-in test: `python3 -I "$DOCS"/landing_check.py "$HOME_SOURCE"` reports it as a `DOC-TYPE-10` finding, and a list or a caution box no longer counts toward it. | SHOULD |

## Offer Page Rules

- **The market norm is the failure.** Of 21 measured software-service pages, 14 to 16 heroes name the service type, 1 names the buyer, 2 give an engagement signal, 0 print a price and 0 say what happens after the click. An agent that copies the norm leaves three of the four questions open, so the rule is normative, not descriptive.
- **Why SHOULD.** Business customers rank price as their top information need (2013 usability report), and analyst opinion says complex offers may keep prices private, which is why an engagement model with a time box and "price on request" are accepted. No conversion data exists for service pages, and prices behind JavaScript are invisible to the server-HTML count. A productized fixed-price exemplar set is the trigger to reconsider MUST.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-PAGE-12 | On the first screen of a `doc_surface: offer` page, state in text, in this order: (1) the service delivered, as a noun phrase naming what the client receives; (2) the buyer, as a noun for who hires the service; (3) a price or engagement signal: a price range, the price of typical engagements, a package list, or an engagement model with a time box; (4) one next step, as a verb phrase that says what happens after the click (a response time, a call length, a free first step or the first deliverable). When the owner has not approved a price figure, state the engagement model and time box and write "price on request". Never choose a price figure: that is an ask-first item. | 0 of 21 measured service heroes print a price, 1 names the buyer and 0 say what the next step is. SHOULD: the basis is a 2013 usability report, a 2020 vendor survey and opinion, and no conversion data on service pages exists. | Block MKT-PAGE-12: four filters over line 3 of the hero, each must print at least 1, and a reviewer reads every match. Element 3 pass: "Small expert teams shipping production software in weeks". Fail: a hero that ends on "Let's talk" with no time box, price or response time. | SHOULD |
| MKT-PAGE-13 | On an `offer` page, put a proof point about the deliverer in the hero only when a `[[claim]]` row in `claims.toml` backs it (MKT-CLAIM-04: the number, its date and its source). Never write "decades of experience", "world-class", "best-in-class", "deepest bench", "leading" or "trusted by the best" without a number backed that way. | 5 of 21 measured service heroes carry an unquantified boast. No evidence shows that proof moves a buyer's decision: CONSIDER. Grade words on product pages stay with MKT-CLAIM-02 and 16. | Block MKT-PAGE-13 prints nothing unless a matching `[[claim]]` row exists. Pass "Trusted by 400+ companies worldwide ... since 2010" with a claims row. Fail "the deepest bench of expertise". | CONSIDER |

## Check Blocks

Variables the reader supplies: `SLUG` (`owner/repo`), `PKG` and `CRATE`
(published package names), `NAME` (the repository name), `BUILT` and `SOURCE`
(the two files of one route), `V` (the manifest version), `HOME_SOURCE`. Run the
awk and pipeline blocks under bash or zsh.

```sh
# MKT-PAGE-01: a repository publishes when a release exists or a manifest publishes. Any output row means in scope.
gh release list -R "$SLUG" --limit 1; npm view "$PKG" version; cargo search "$CRATE" --limit 1
# MKT-PAGE-02: a built / with an h1 and no declaration fails (first count 1 or more and second 0)
grep -c -e '<h1' dist/index.html
grep -c -E -e '<meta[^>]*name="doc-surface"[^>]*content="(pitch|home)"' dist/index.html
# MKT-PAGE-05: pass an object noun like "AI-agent config", fail "The agentic package manager".
# MKT-PAGE-05: AI framing in the hero (lines 1, 2) and the README tagline; each hit must sit inside category or object
AI='(^|[^[:alnum:]_])AI([^[:alnum:]_]|$)'
python3 -I "$CHECKS"/positioning_check.py hero "$PAGE" | head -2 | grep -n -i -E -e "$AI" -e 'AI-(powered|driven|native)' -e 'agentic'
python3 -I "$CHECKS"/positioning_check.py readme-window README.md | grep -n -i -E -e "$AI" -e 'AI-(powered|driven|native)' -e 'agentic'
# MKT-PAGE-05, reading arm: judge each hit against the second sentence of the rule
python3 -I "$CHECKS"/positioning_check.py hero "$PAGE" | head -2 | grep -n -i -E -e '(^|[^[:alnum:]_])agents?([^[:alnum:]_]|$)'
# MKT-PAGE-06: version; the stage test below runs when it starts with 0
git grep -n -E -e '^version[[:space:]]*=' -- Cargo.toml pyproject.toml; jq -r .version package.json
# MKT-PAGE-06 and 07: product-attached stage test. Both counts must print 1 or more.
STAGE='alpha|beta|pre-?1\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz[[:alnum:]_]*'
SENT="(^|[^[:alnum:]_])(this (project|tool|crate|package|extension|app|library|repository)|it|$NAME) (is|are) (still |currently |now )?(in )?(an? )?($STAGE)"
label_arm() { S="$STAGE" awk '(tolower($0) ~ "^[>[:space:]*_]*(status|" ENVIRON["S"] ")[*_]*[[:space:]]*[:.]") && (FNR==1 || prev ~ /^[[:space:]>]*$/ || prev ~ /^#/) {print FILENAME":"FNR":"$0} {prev=$0}' "$1"; }
python3 -I "$CHECKS"/positioning_check.py readme-window README.md > window.txt
{ label_arm README.md | grep -F -x -f window.txt; grep -i -E -e "$SENT" window.txt; } | grep -c .
python3 -I "$CHECKS"/positioning_check.py hero "$PAGE" | sed -n 3p | grep -i -c -E -e "$SENT"
# MKT-PAGE-08: a maturity record for the current version exists (exit 0 is the pass)
python3 -I -c "import tomllib,sys;r=[c for c in tomllib.load(open('claims.toml','rb')).get('claim',[]) if c.get('class')=='maturity'];sys.exit(0 if any(c.get('subject_version')==sys.argv[1] for c in r) else 1)" "$V"
# MKT-PAGE-09 self-test: "not yet stable" is exempt, "A stable package manager" fails, "the newest of stable and prerelease" goes to the reading line.
# MKT-PAGE-09: grade words while the version starts with 0. First pipeline: failures. Second: lines for a reader to judge.
G='(^|[^-[:alnum:]_])(stable|production-ready|battle-tested|enterprise-grade|mature)([^-[:alnum:]_]|$)'
N='(^|[^[:alnum:]_])(not|isn.t|aren.t|never|no longer)[^[:alnum:]_]+(yet[^[:alnum:]_]+)?([[:alnum:]_]+[^[:alnum:]_]+){0,2}(stable|production-ready|battle-tested|enterprise-grade|mature)([^[:alnum:]_]|$)'
C='(^|[^[:alnum:]_])(channels?|latest|next|nightly|prerelease|pre-release)([^[:alnum:]_]|$)'
{ python3 -I "$CHECKS"/positioning_check.py readme-window README.md; python3 -I "$CHECKS"/positioning_check.py hero "$PAGE" | sed -n 3p; } > first-screen.txt
grep -i -E -e "$G" first-screen.txt | grep -v -i -E -e "$N" | grep -v -i -E -e "$C"
grep -i -E -e "$G" first-screen.txt | grep -v -i -E -e "$N" | grep -i -E -e "$C"
# MKT-PAGE-10: when archived prints true, the first README window line must match the pattern
gh api "repos/$SLUG" --jq .archived
python3 -I "$CHECKS"/positioning_check.py readme-window README.md | head -1 | grep -i -c -E -e 'no longer (actively )?maintained' -e 'unmaintained' -e 'archived' -e 'moved to'
# MKT-PAGE-11: no hero markup in the home source, then in every built page that declares home. All counts print 0.
git grep -c -E -e '^hero:' -e 'template: *splash' -e '<(Hero|Landing)([^[:alnum:]_]|$)' -e 'class="[^"]*hero' -- "$HOME_SOURCE"
python3 -I "$DOCS"/doc_declaration.py --built dist --list home | xargs -r grep -c -e 'class="[^"]*hero'
# MKT-PAGE-12: line 3 of the offer hero, four filters. Each must print 1 or more.
python3 -I "$CHECKS"/positioning_check.py hero "$PAGE" | sed -n 3p > offer-hero.txt
grep -i -c -E -e '(^|[^[:alnum:]_])(consult[[:alnum:]_]*|implementation|migration|engineering|development|support|training|audit|review|design)([^[:alnum:]_]|$)' offer-hero.txt
grep -i -c -E -e '(^|[^[:alnum:]_])(enterprises?|founders?|startups?|scale-ups?|platform teams?|CTOs?|engineering leaders?)([^[:alnum:]_]|$)' offer-hero.txt
grep -i -c -E -e '[$€£][0-9]+([.,][0-9]+)?[kK]?( |$|/)' -e '(^|[^[:alnum:]_])from [$€£]' -e '(^|[^[:alnum:]_])packages?([^[:alnum:]_]|$)' -e 'fixed[- ](price|fee|scope)' -e 'per (hour|day|week|month)' -e 'in ([0-9]+ )?(days|weeks|months)' -e 'price on request' offer-hero.txt
grep -i -c -E -e 'within [0-9]+' -e '[0-9]+[- ]minute' -e '(^|[^[:alnum:]_])free([^[:alnum:]_]|$)' -e 'we (reply|respond)' -e 'first (call|workshop|assessment|deliverable)' offer-hero.txt
# MKT-PAGE-13: prints nothing unless a matching [[claim]] row exists.
grep -i -o -E -e '(^|[^[:alnum:]_])(world-class|best-in-class|deepest|leading|trusted by the best|decades)([^[:alnum:]_]|$)' offer-hero.txt
```

MKT-PAGE-12 filter 2 (the buyer) hits inside a contact form's job-function list do
not count. A `STAGE` label-arm hit on a wrapped line does not count: the awk keeps
a hit only when the line before it is blank, a heading or the file start.

## Maturity Vocabulary

For MKT-PAGE-07. Every word maps to a source or is named as a house word.

| Word | Source | Mapping |
|---|---|---|
| concept | [repostatus.org](https://www.repostatus.org/) Concept | "Minimal or no implementation has been done yet" |
| skeleton | House word | Nearest is repostatus Concept or WIP |
| alpha, beta | Kubernetes alpha and beta API tracks | Alpha APIs "may be removed in any release without prior deprecation notice". Nearest repostatus status is WIP |
| pre-1.0 | [SemVer 2.0.0 section 4](https://semver.org/) | repostatus WIP: "there has not yet been a stable, usable release suitable for the public" |
| stable | SemVer section 5 | repostatus Active: "reached a stable, usable state and is being actively developed" |
| inactive, moved | repostatus Inactive, Moved | Same status |
| unmaintained | House word ("no longer actively maintained") | repostatus Unsupported ("ceased all work") or Abandoned (before a stable release) |

## Precedence Over docs-quality

- **docs-quality keeps gating every `doc_type: landing` page** with `DOC-TYPE-10` to `DOC-TYPE-15`. No MKT-PAGE rule suspends a DOC-TYPE finding. MKT-PAGE-01 only bars **marketing** rules from those pages.
- **Where both sets apply to one page, docs-quality governs the page.** MKT-PAGE adds requirements only on the pitch surfaces and on `offer` pages.
- **Two families never share the first sentence.** docs-quality keeps length, calls to action, placeholders and adoption links. `MKT-POS` keeps sentence identity. MKT-PAGE keeps what the hero and the README opening must contain: the noun, the differentiator, the maturity status and the grade-word contradiction.
- **docs-quality owns `doc_surface` and reads the built route.** `DOC-TYPE-10` to `DOC-TYPE-12` skip a `pitch` page's source and run on its built route (`landing_check.py --built dist`), so a component-rendered pitch is checked. MKT-PAGE-11's tagline-stack test is `DOC-TYPE-10`'s lead-in test.

Who owns what on a README, first to last. The built `<h1>` count belongs to `ux-quality`, and About text, social card and registry listing pages to the channel skills.

| README element | Owner |
|---|---|
| Section structure | `DOC-TYPE-32` to `DOC-TYPE-36` |
| Tagline equal to the recorded sentence, audience in the first 10 lines, the alternative named bare | `MKT-POS-08`, `MKT-POS-17` |
| Category noun, differentiator and AI framing in the opening | MKT-PAGE-03 to 05 |
| Status line, grade-word ban, archived notice | MKT-PAGE-06 to 10 |
| A grade word at 1.0 or above, or any claim | `MKT-CLAIM-02` and `16`, with a named human sign-off |

## Where the README Sits

Headless Chromium, one unauthenticated run per case, 2026-11-27, indicative (no fonts installed). On GitHub 0 README lines sit above the fold on 4 of 4 repositories at 1440x900 and at 390x844. The README starts 993 to 2182 px down on desktop and 1266 to 1348 px on mobile, below the repository name, About text, topics and file list, so the sign of the result is robust. At 1920x1080 one repository showed 2 README lines and another 0. What shows above the fold is the About description, which MKT-POS-08 governs. No platform documents a fold, so the 15-line window stays a source-line proxy.

"Repository-root README" is the file GitHub shows only when no `.github/README.md` exists (display order `.github`, root, `docs`; 500 KiB truncation; [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), no page date, source last committed 2026-09-03). On crates.io (one crate measured) the manifest `description` sits in the header card and the README opening is above the fold: about 16 lines at 1440x900 and 13 at 390x844. npmjs.com answered HTTP 403 with a challenge page, so its fold is unmeasured. npm and crates.io update the rendered README only on publish ([npm Docs](https://docs.npmjs.com/about-package-readme-files), last edited 2025-11-04; [Cargo manifest reference](https://doc.rust-lang.org/cargo/reference/manifest.html), no page date). A rule that a published registry README must carry the same noun and maturity line was not adopted, because it rests on one crate and no npm page.

## Ask the Owner

- The category and object noun of each product. Without a record, MKT-PAGE-03 stops the agent (exit 2).
- The differentiator, when the record names none (the agent may propose 2 or 3, never choose), and AI in the headline when AI is not in the recorded noun.
- The stage when the version and the maintainer's statement disagree, any decision to declare 1.0 or "stable", and removing or softening a maturity line the owner wrote.
- Whether a product gets a pitch page or a docs home is promoted to one (MKT-PAGE-11), which page is the pitch, which page is an offer page, and whether a public README with no release and no package is a pitch surface (today no).
- Adding `doc_surface` declarations in bulk: changed files first.
- Any price figure, range or package price on an offer page, the engagement model and time box to state instead, the buyer noun, and any proof number about the team (MKT-PAGE-12, 13). The agent may propose a number from a source it can cite. The owner approves the claims row.

## Not Studied

- Whether a human rater agrees with the two model raters (the basis of MKT-PAGE-03). No differentiator check is mechanical, so MKT-PAGE-04 is CONSIDER.
- No conversion data exists for service pages, prices behind JavaScript are invisible to the server-HTML count, and the status label arm's false-fire rate is untested (English-only convenience sample).
- Whether a registry README (crates.io, npm) shows the opening above the fold beyond the one crate measured, and what npmjs.com shows (a browser session that passes its challenge page is needed, which an unattended agent must not create).
- Dropped for want of a source: an H1 word band, a banned vague-verb list, an audience-in-hero rule (DOC-TYPE-36 holds it at CONSIDER) and a superlatives grep on hubs (DOC-PLAIN-12).

## What Agents Get Wrong Here

Measured failures first, then expected ones.

| What the agent does | Caught by | Basis |
|---|---|---|
| Treats `doc_type: landing`, or the words "home page", as "write marketing copy here" | MKT-PAGE-01, 11 | Measured: 11 of 12 `landing`-tagged pages are not pitches |
| Hands over a component-rendered pitch with no declaration, or puts it in a `//` comment of an `.astro` frontmatter fence, so no check reads it | MKT-PAGE-02 (built-meta check) | Measured |
| Moves the status to a footer, a `## Status` section or an image-only badge, or leaves it out because 0 of 25 exemplar heroes state it | MKT-PAGE-06 | Measured: 7 of 10 in-scope pre-1.0 READMEs |
| Reads a feature-level "experimental" as the product status | MKT-PAGE-06 (product-attached pattern) | Measured: an earlier pattern counted it as a pass |
| Writes a new tagline per surface so the hero drops the noun, a slogan H1 with a subhead that names no category, or a synonym of the recorded noun | MKT-PAGE-03 here, `MKT-POS` for the other surfaces | Measured: 11 distinct one-liners for one product |
| Checks the `.mdx` or `.astro` source and misses words a component renders | MKT-PAGE-03 and 06 (built-HTML clauses) | Measured |
| Writes "stable" or "production-ready" for a 0.x tool because the code works, or prepends "AI-powered" or "agentic" to the H1 | MKT-PAGE-09, 05 | Expected |
| Reads the wrong text as the hero or the label: the site-title `<h1>` of a Starlight page, or a wrapped line that starts with "unstable." | The hero-section-first rule and the wrap guard in MKT-PAGE-06 | Measured |
| Writes a service hero with a slogan and a "Let's talk" button, invents a price figure, or boasts "world-class" with no number | MKT-PAGE-12 (price is ask-first, "price on request" is accepted), MKT-PAGE-13 | Expected |
