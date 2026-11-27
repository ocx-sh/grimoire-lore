---
title: Pitch-page hero and README opening - contract, maturity status, review flags
program: product
sub_program: marketing
topic: marketing-first-screen-copy
worker: page-hero-status
date_researched: 2026-11-27
model: sonnet
sources_fetched: 78
scope: What a pitch-page hero and a README opening must say (category or job, differentiator, audience, maturity), which pages count as pitch surfaces, and which failures a review step can flag. Excludes built-h1 count (ux), CTA counts (DOC-TYPE-12), pricing, claims evidence beyond the maturity class, and platform-specific surfaces (channels).
---

# Pitch-page hero and README opening

Sources fetched: 13 web pages (listed under Sources), 25 landing-page HTML files, 40 upstream READMEs plus their repository metadata and latest release tag. Two further fetches failed and are named in "Limits". Working directory for every command below: `B=~/.cache/research-lang/exemplars/product/page-hero-status`. The corpus directory `~/.cache/research-lang/exemplars/product/` held no exemplar corpus on 2026-11-27, so it was rebuilt here from `product-audit/exemplar-landing-pages.md` (URL list) and `product-audit/exemplar-readmes.md` (repo list and fetch script).

## Table of contents

1. Summary
2. Findings (pitch surfaces; what docs-quality already decides; what the corpus shows; hero contract; maturity status; review flags; practitioner and vendor sources)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Limits
9. Sources

## Summary

- A pitch surface is a page whose job is to make a first-time visitor decide to try or adopt. In the fleet that is two pages (ocx.sh `/`, grimoire.rs `/`) plus the first 15 lines of every product README. Docs start pages and hubs are not pitch surfaces, although three carry `doc_type: landing`.
- docs-quality already decides lead-in length (DOC-TYPE-10), action before word 150 (DOC-TYPE-11), two buttons (DOC-TYPE-12), reader-naming links (DOC-TYPE-13), placeholders (DOC-TYPE-14), linked adoption claims (DOC-TYPE-15), README description before tables (DOC-TYPE-32) and reader-role at CONSIDER with no rate (DOC-TYPE-36). It decides nothing about what the headline must be about, nothing about status, and nothing about agreement between the surfaces.
- Re-measured on 25 landings: H1 median 6 words (range 1 to 12), subhead median 11 (0 to 32; 4 pages have none). The hero names a category in the H1 or the subhead on 22 of 25 pages; the three that do not are Tauri, Cal.com and Svelte.
- H1 primary type by a rubric written before scoring: category 14, outcome 5, audience 1, name or slogan only 5. Two independent blind passes (Claude Haiku via `claude -p`, and Codex CLI 0.172.0, a different vendor's model; each given only the rubric and the verbatim texts) agreed on 23 of 25 H1s (kappa 0.88) and 23 of 25 subheads (kappa 0.87); see section 3.
- Maturity is stated in the hero or the first 15 README lines by 0 of 25 landings and 1 of 39 READMEs with a release tag (Earthly, "no longer actively maintained", which is a support state, not immaturity). Pre-1.0 projects: 1 of 17 within 15 lines, 2 of 17 within 40 non-blank lines (Earthly, Nushell). Post-1.0: 0 of 22.
- The upstream norm is therefore silence, including for pre-1.0 tools with large adoption (ruff, uv, fzf, hugo, lazygit, ollama). A maturity requirement cannot be justified by imitation; it rests on the SemVer clause that 0.y.z means anything may change, and on the cost of an agent following a README for an unmaintained or skeleton project.
- Decision: require a one-line maturity statement on the first screen of a pitch surface when the product is below 1.0.0, labelled alpha, beta, preview, skeleton or experimental, or unmaintained. Do not require one for a maintained 1.0+ product. Record it as an evidence-record claim of class `maturity`.
- Fletch's H1 article gives two constructions (category plus differentiation; job-to-be-done plus differentiation), two failure names (too broad, too lofty) and 5 to 10 words only as the article's subtitle. It lists no banned verbs. The scout row that proposed a banned-vague-verb list over-read it.
- Stripe Atlas's "rule of one" (one reader, one idea, one promise, one offer) is checkable only as a reading heuristic, not by count.
- Neither [Unbounce](https://unbounce.com/average-conversion-rates-landing-pages/) (41,000 pages, Q4 2024, vendor data) nor [Baymard](https://baymard.com/research-articles/ecommerce-homepage-ux) (e-commerce, 2021) measures headline wording. No benchmark in either source supports any word band or formula. The [Demand Curve playbook](https://www.demandcurve.com/playbooks/above-the-fold) states a 10 to 30 percent conversion lift with no method (practitioner assertion).
- Fleet drift (messaging-inventory smell 1) is the largest measured first-screen failure: ocx and grim each define themselves with different nouns in README, title, meta description and hero. A cross-surface check is mechanical.

## Findings

### 1. Which pages are pitch surfaces

Definition (decision): a pitch surface is a page or page segment whose primary reader is someone who does not yet use the product and whose job is to produce a try-or-leave decision. Everything else is a docs surface and stays under docs-quality.

| Surface | Pitch? | Evidence |
|---|---|---|
| Product site root `/` that mounts a hero (ocx.sh, grimoire.rs) | Yes | `product-audit/exemplar-landing-pages.md` "The fleet, measured the same way": `Landing.astro` and `index.astro` |
| First 15 non-blank lines of a product README | Yes | GitHub renders the README under the repository name; there is no other page (`product-audit/exemplar-readmes.md`) |
| Service or offer page for a service business | Yes (outside the fleet, not measured here) | none in fleet |
| Docs start page ("Get started with OCX") | No | `ocx/website/.../index.mdx:2-8,32-40` per the audit: install, run once, job list |
| Task-routing hub of `LinkCard`s (catalog docs) | No | `catalog/docs/.../index.mdx:27-55` |
| Install how-to (setup.ocx.sh) | No | `doc_type: how-to` |
| Pricing, release notes, email | Owned by sibling dives | not decided here |
| GitHub About text, social card, registry listing | Channels | one-line handoff, not decided here |

Smell 9 in the audit matters for detection: three hubs carry `doc_type: landing` though they are not pitches. A rule keyed on `doc_type: landing` alone would fire on them. Detection that works on the fleet today: a page is a pitch surface when it is the site root of a product site and its hero component renders an `<h1>`, or when it is the repository-root `README.md` of a package or application that has a release. Whether to add an explicit front-matter marker (for example `surface: pitch`) is a catalog decision; see "What an agent must not decide alone".

### 2. What docs-quality already decides (so this dive adds only the rest)

Source: `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/docs-quality-reference/page-types.md` lines 128 to 133 and 143 to 147, read 2026-11-27.

| ID | Decides | Severity there |
|---|---|---|
| DOC-TYPE-10 | One sentence of lead-in prose before the first heading; warn over 30 words | SHOULD |
| DOC-TYPE-11 | Runnable command or link menu before word 150 | MUST |
| DOC-TYPE-12 | At most two button-style calls to action | SHOULD |
| DOC-TYPE-13 | Task-phrased link labels or one reader-naming sentence | SHOULD |
| DOC-TYPE-14 | No placeholder text | MUST |
| DOC-TYPE-15 | Adoption or trust claim carries a link to its source | MUST |
| DOC-TYPE-32 | README plain-language description before any non-metadata content (tables) | MUST |
| DOC-TYPE-33 | README names or links the install action | SHOULD |
| DOC-TYPE-36 | State who the project is for; reading heuristic, never scored | CONSIDER |

Gaps this dive fills: (a) DOC-TYPE-10 limits length but never says what the sentence must be about; (b) DOC-TYPE-32 says "a description" but not that it names a category or job; (c) no rule requires status; (d) no rule requires the README tagline, the site title, the meta description and the hero to name the product the same way; (e) DOC-TYPE-36 has no measured rate. A rate is supplied below.

### 3. What the exemplar corpus shows (re-measured)

Commands (scripts are in `$B/scripts`, fetched HTML in `$B/html`, READMEs in `$B/readme`):

```sh
cd $B
while read n u; do curl -sL -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) research" -o html/$n.html -w "$n %{http_code} %{size_download}\n" "$u" & done < urls.txt; wait
while read -r r; do f=$(echo $r | tr / _); gh api repos/$r/readme -H 'Accept: application/vnd.github.raw' > readme/$f.md; gh api repos/$r/releases/latest --jq .tag_name > meta/$f.tag; done < repos.txt
python3 -I scripts/ext.py html landing.json      # raw-DOM extractor
python3 -I scripts/passA.py                      # rubric pass A, reads texts.py and manual_labels.json
python3 -I scripts/mat.py                        # README maturity scan and pre/post-1.0 split
```

All 25 URLs returned HTTP 200 on 2026-11-27. The raw-DOM extractor (first `<h1>` to the next `<h2>`; subhead = first `<p>` of 4 or more words) failed to find an `<h1>` on three pages (neon, ruff, uv, where the heading is wrapped in a way the parser skipped) and duplicated animated text on Cal.com, Linear and Stripe (H1 words 15, 24, 24). The raw run gave H1 median 6 over the 22 parsed pages, subhead median 11.5. Because the raw run is distorted for 6 of 25 pages, all scoring below uses the verbatim, hand-resolved H1 and subhead texts printed in `exemplar-landing-pages.md`, kept in `$B/scripts/texts.py`. On those texts: H1 median 6, range 1 to 12; subhead median 11, range 0 to 32, 4 pages with none (`python3 -I` one-liner over `texts.py`). This reproduces the audit's numbers exactly.

**Scoring rubric (written before scoring, stored here verbatim).** Each text gets one primary label:

- `CAT`: the text contains a noun phrase a reader could type into a search box to find the thing-type (framework, runtime, toolchain, database, analytics, platform, manager, linter, formatter, editor, build tool, infrastructure, backend, system, tooling, tools).
- `OUT`: no such noun, but the text states a result or quality the reader gets (faster, scale, find time, fix it, build in a weekend).
- `AUD`: neither of the above, but it names the person or team it is for.
- `OTHER`: a product name, version, slogan or claim that does none of the three.
- `NONE`: no text (subhead only).
- Precedence when a text qualifies for several: CAT, then OUT, then AUD.

Two scoring methods were used. The first pass was a manual reading by the author plus a keyword classifier (`passA.py`) tuned on the same pages; it is not independent and is kept only as a tally cross-check. The agreement figures below come from a repair pass in which two independent raters scored the same 25 verbatim H1 and subhead texts blind: rater 1 is `claude -p --model haiku`, rater 2 is `codex exec -s read-only` (OpenAI model, different vendor). Each ran in a fresh process with no file access to the earlier labels and received only the rubric above plus the texts as JSON (Vercel's subhead given in the audit's cleaned reading). Inputs, raw replies and the kappa script are in `~/.cache/research-lang/exemplars/product/page-hero-status/independent-pass/` (`prompt.txt`, `rA.txt`, `rB.txt`, `kappa.py`).

| Measure | Result | Command |
|---|---|---|
| H1 primary label, first-pass manual (not independent) | CAT 14, OUT 5, AUD 1, OTHER 5 | `python3 -I scripts/passA.py` (manual tally line; script dir no longer on disk, see Limits) |
| Subhead primary label, first-pass manual (not independent) | CAT 12, OUT 5, OTHER 4, NONE 4 | same |
| Agreement between the two independent raters, H1 | 23 of 25, Cohen kappa 0.88; disagreements posthog (rater 1 OTHER, rater 2 CAT) and flyio (AUD, CAT) | `python3 -I kappa.py` in `independent-pass/` |
| Agreement between the two independent raters, subhead | 23 of 25, kappa 0.87; disagreements linear (OTHER, OUT) and flyio (OUT, CAT) | same |
| Independent rater tallies, H1 | rater 1 CAT 12, OUT 5, OTHER 6, AUD 2; rater 2 CAT 14, OUT 5, OTHER 5, AUD 1 (rater 2 equals the first-pass manual tally exactly) | same |
| Independent rater tallies, subhead | rater 1 CAT 13, OUT 6, NONE 4, OTHER 2; rater 2 CAT 14, OUT 6, NONE 4, OTHER 1 (first-pass manual tally CAT 12, OUT 5, OTHER 4, NONE 4) | same |
| Category named in H1 by either independent rater (CAT) | 12 to 14 of 25, the same band as the audit's 14 | same |
| Pages naming a category in H1 or subhead | 22 of 25; missing: tauri, calcom, svelte | inline `python3 -I` over `manual_labels.json` |
| H1 length inside 5 to 10 words | 15 of 25; the other 10 are 1 to 4 words (7 name-only or short slogans) or 11 and 12 words | same |
| H1 at or under 12 words | 25 of 25 | same |
| Subheads at or under 30 words | 20 of 21 that have one; the exception is Bun at 32 | same |
| Pages whose H1 plus subhead contain an audience lexeme (teams, developers, engineers, agents, users, people, tenants, apps, "the rest of us") | 10 of 25; an upper bound, because "agents" and "apps" are often the object of the product, not the reader | regex in the same script |

The audit's hand counts (category 14, audience 4, outcome 9 of 25 as non-exclusive features) agree with the single-label tally on category (14). The single-label tally gives outcome 5 because a category noun takes precedence.

Reading: the corpus supports "name a category in the H1 or subhead" (22 of 25) and "H1 at most 12 words" (25 of 25). It does not support a narrower band: 10 of 25 are outside 5 to 10, and the outside group includes Vercel (2 words, "Agentic Infrastructure") and Tauri (2 words), both well known. It supports no audience rule (10 of 25 at best, and DOC-TYPE-36 stays CONSIDER). Fame bias applies: these are the products people already know, not a measure of what converts.

### 4. The hero contract (decision)

Fields, in the order a reader needs them, for a pitch-surface hero or the first screen of a README:

| # | Field | Where | Corpus support |
|---|---|---|---|
| 1 | Category noun or job, naming the thing a reader would search for | H1 or subhead | 22 of 25 |
| 2 | One differentiator: what makes it different from the alternative a reader uses today | H1 or subhead | not measurable by rubric; reading heuristic |
| 3 | Audience or situation, as a reader role, a prerequisite or a problem | first two sentences | at most 10 of 25 (lexeme upper bound) |
| 4 | Maturity status when required (section 5) | within the first 15 non-blank README lines or the hero segment | 0 of 25 landings, 1 of 39 READMEs |
| 5 | The next action (install command or link menu) | DOC-TYPE-11, not restated | covered |

Word bands: H1 at most 12 words (corpus maximum; 25 of 25). A 5 to 10 word target is Fletch's subtitle, practitioner guidance, and the corpus has 15 of 25 inside it; treat it as a SHOULD, not a gate. Subhead length is DOC-TYPE-10's job (30-word warning); the corpus agrees (20 of 21 at or under 30).

Construction. Fletch's two forms are the only sourced constructions: (a) category plus differentiation; (b) job-to-be-done plus differentiation ([Fletch, 2026-04-07](https://fletchpmm.com/newsletter/how-to-write-an-h1)). Fletch scopes this to B2B software. Fletch's failure classes: too broad ("automate systems": a reader asks "but what does that mean?") and too lofty ("drive revenue": "no software drives revenue"). Fletch adds that the bigger the job, the more senior the reader must be. Airtable's "Connect everything. Achieve anything." is named as an example of headlines that "don't say anything".

Stripe Atlas's rule of one: identify "Your One Reader", "Your One Big Idea", "Your One Promise" and "Your One Offer" before writing, with the reader the most important ([Stripe Atlas landing page copy guide](https://stripe.com/au/atlas/guides/landing-page-copy), undated, footer 2026). It says the hero headline and subheadline should clarify who the page is for, and to lead with "you" or a verb. It gives no word counts. The rule is checkable by a reading heuristic only.

Harry Dry (practitioner, undated, no data): title is the value, subtitle is how, then visual, proof, CTA; "In five seconds customers try to establish whether or not you can help them" ([marketingexamples.com guide](https://marketingexamples.com/landing-page/guide)). It does not contain the "remove the logo" test the scout map attributes to it; its nearest test is "Would this help me sell if I met the customer in person?". Use the logo-removal heuristic as ours, not as a citation.

NN/g (2002-05-11): "Start the page with a tagline that summarizes what the site or company does", one sentence ([NN/g](https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/)). Historical-only age; it agrees with the corpus (22 of 25).

### 5. Maturity status

**Corpus.** Maturity wording scan: regex `alpha|beta|pre-release|preview|early (access|development|stage)|experimental|unstable|work in progress|stable|production ready|v0.x|1.0|deprecated|no longer (actively )?maintained|unmaintained|archived|stabilizing|under development` over the 15 first non-blank README lines (HTML wrapper lines and badge images removed) and over the hero segment (first `<h1>` to next `<h2>`; for pages without a clean split, 9,000 characters after the first `<h1>`).

| Population | n | States maturity in hero or first 15 lines | Command |
|---|---|---|---|
| Landing pages | 25 | 0 (Deno "more stable than Bun" is a comparison claim; Tauri "Tauri 2.0" is a product label) | hero-segment regex script, 2026-11-27 |
| Of those, pre-1.0 by latest release tag: uv 0.13.10, ruff 0.17.6, turso v0.8.4 | 3 | 0 | `gh api repos/<r>/releases/latest --jq .tag_name` |
| READMEs, pre-1.0 (latest tag major 0) | 17 | 1 (Earthly, line 1: "Earthly is no longer actively maintained") | `python3 -I scripts/mat.py` |
| READMEs, post-1.0 | 22 | 0 | same |
| READMEs, within 40 non-blank lines, wider regex, manually read | 39 | 2 pre-1.0: Earthly; Nushell line 25 "This project has reached a minimum-viable-product level of quality ... it may be unstable for some" | same, then read the 5 raw hits; Bazelisk's line is about a legacy install path, Traefik's and pnpm's lines are migration and a feature, none is a status |

Version split uses the major number of the latest GitHub release tag (`jdx/mise` is calendar-versioned and counted post; `NixOS/nix` has no release and is excluded; `tauri-apps/tauri` and `withastro/astro` returned a sub-package tag and were counted post-1.0 on the cli and node tags, a limit). 17 pre-1.0 plus 22 post-1.0 plus 1 excluded is 40.

Reading: even large pre-1.0 tools do not announce it (esbuild 0.28, fzf 0.75, hugo 0.170, ollama 0.40, lazygit 0.66, bat 0.26). Their readers learn it from the version number. So silence is the upstream norm, and a reader of a fleet README is no worse off than a reader of ruff's.

**Why require it anyway.** Three reasons, none from imitation.

1. SemVer 2.0.0 §4: "Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable." §5: "Version 1.0.0 defines the public API." ([semver.org](https://semver.org/), spec 2.0.0, no date on the page). A reader or agent that cannot see "0.x" in the prose gets no signal that a pinned command may change.
2. The fleet's own audit found status hidden on the first screen for grim-gui ("Status: skeleton" at `README.md:9` but the app window shows a version string only), grim-mirror ("Unstable. Source only"), indexbot ("Pre-release") and ocx ("early development" only in a closing footnote, `Landing.astro:157`); grimoire's hero is silent on 1.0 although its README says "stabilizing toward 1.0" at lines 27 to 28 (`messaging-inventory.md` smell 7, pattern 5).
3. The reader here includes coding agents that execute README commands without a human; a README for a skeleton project read as production guidance is a first-screen failure the upstream sample never had to price in. This is argued, not measured.

**Vocabulary.** Do not invent a status scale. Two sourced vocabularies exist. repostatus.org defines eight project statuses: Concept ("little or no implementation exists yet"), WIP ("initial development is underway, but no stable, public-ready release exists yet"), Suspended, Abandoned, Active ("stable and usable, and it is being actively developed"), Inactive, Unsupported, Moved ([repostatus.org](https://www.repostatus.org/), page states no spec date). Kubernetes labels API tracks alpha (experimental, "may be removed in any release without prior deprecation notice"), beta (pre-release, deprecated within 9 months or 3 minor releases) and GA ([Kubernetes deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/), page has no date). The `maturity` claim value takes one of: `concept`, `skeleton`, `alpha`, `beta`, `pre-1.0`, `stable`, `inactive`, `unmaintained`, `moved`. `skeleton` and `pre-1.0` are fleet words with no external definition; `pre-1.0` is defined by SemVer §4.

**Evidence-record class `maturity`.** Use the schema owned by claims-evidence-record (fields claim, surface, class, value, unit, source, source_type, method, observed, refresh_by, definition, window, subject_version). Filled example for ocx:

```yaml
claim: "ocx is in early development: the CLI works, and commands or the config format may change between minor releases."
surface: "README.md first 15 lines; site hero (Landing.astro)"
class: maturity
value: "pre-1.0"
unit: "release stage"
source: "Cargo.toml [package] version"
source_type: own-measurement
method: "grep -m1 '^version' Cargo.toml"
observed: "2026-11-27"
refresh_by: "next release tag, or 90 days"
definition: "SemVer 2.0.0 section 4: major version zero, anything may change"
window: "n/a"
subject_version: "0.6.5"
```

Placement. First screen: for a README, within the first 15 non-blank lines and before any install block (one line or one banner under the tagline); for a hero, in the hero segment as plain text near the subhead, not in a footer notice. The wording states the stage and what may change, in that order, in one sentence, with no marketing adjectives ("early development: commands and config may change between minor releases"). It must not be an image-only badge; an agent reading text does not see it. A machine-readable form is allowed in addition (repostatus.org supports a README badge or a `.repostatus.org` file).

**The opposite claim.** A hero or README that says "stable", "production-ready", "battle-tested" or "enterprise-grade" is an objective claim that needs a record (FTC: "The reasonable basis doctrine requires that firms have substantiation before disseminating a claim", [FTC Policy Statement Regarding Advertising Substantiation, 1984-11-23](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)). The check is the contradiction: such a word with a version below 1.0.0 or a status of skeleton, alpha or beta is a failure.

### 6. Review flags (what a review step can raise)

Ordered by how mechanical the check is.

| Flag | Failure | Check |
|---|---|---|
| F1 | Hero H1 over 12 words (the built `<h1>` count is owned by ux and is not checked here) | word count of the hero H1 text, as in FSC-2 |
| F2 | Name-only first screen: removing the product name and version from H1 and subhead leaves no category noun or job | reading heuristic with an example pair, below |
| F3 | Category drift: the README tagline, `<title>`, meta description and hero H1 do not share one category noun (fleet smell 1) | extract the four strings, require one noun in at least three |
| F4 | Pre-1.0 or labelled-immature product with no status within the first 15 non-blank README lines or in the hero segment | regex scan, then compare with the version field |
| F5 | "stable", "production-ready", "enterprise-grade" in a first screen while version is below 1.0.0 or status is skeleton, alpha or beta | same regex, applied in the other direction |
| F6 | Unmaintained or archived project with no first-line notice | `gh api repos/<r> --jq .archived`; compare with the first line |
| F7 | "AI" or "agent" in the H1 with no declared justification | grep the H1; look for a justification field naming one of Fletch's conditions |
| F8 | H1 or subhead stacks two or more of: category list, outcome list, audience list (violates one reader, one idea) | reading heuristic |
| F9 | Too broad or too lofty: the outcome in the H1 could be attached to any product in any category | reading heuristic with Fletch's two examples |

F2 pass and fail pair (written for this dive, mechanism from the corpus): pass "The web framework for content-driven websites" (remove "Astro": still names a category and a job). Fail "Tauri 2.0" or "mise-en-place" (removing the name leaves a version number or a slogan). In the corpus the F2 fail class in the H1 is 5 of 25 (uv, ruff, mise, tauri, tailscale "Maybe don't put it on the public internet."), and 3 of those 5 are rescued by a subhead that names the category (uv, ruff, mise), which is why F2 tests H1 plus subhead together.

F9 pass and fail pair: pass "Code breaks, fix it faster" (Sentry; names the job and the improvement, one reader implied). Fail "Connect everything. Achieve anything." (Fletch's named example; no category, no job).

### 7. Practitioner and vendor sources, labelled

| Source | Class | What it supports | What it does not |
|---|---|---|---|
| [Demand Curve above-the-fold playbook](https://www.demandcurve.com/playbooks/above-the-fold), Oct 30, 2020, Julian Shapiro | practitioner, vendor of growth services | Header names a specific benefit; subheader "one or two sentences": sentence one what the product is, sentence two how the claim is achieved; 2 to 4 nav links plus a CTA | Its only number ("can increase conversion by 10-30%") has no method or source; "several hundred" sections written, no dataset |
| [Copyhackers, Joanna Wiebe, formula catalogue](https://copyhackers.com/2015/10/copywriting-formula/), URL dated 2015-10, page states no date | practitioner | Lists AIDA, PAS, 4 Ps and others; says formulas "work best when you use them with copy research"; warns an early hero button may bring "unqualified" trials | Gives no data; no formula is tied to developer tools or to an outcome |
| [Unbounce, Q4 2024 conversion benchmark](https://unbounce.com/average-conversion-rates-landing-pages/), updated 2025-03-04 | vendor data | 41,000 landing pages, 464 million visitors, 57 million conversions; median 6.6 percent across industries | No data on headline, copy, reading level or message match; no readable SaaS rate; sample selection not described |
| [Baymard, state of homepage UX](https://baymard.com/research-articles/ecommerce-homepage-ux), 2021-07-13 | vendor data (paid research firm) | E-commerce only: 32 percent of 60 top-grossing sites perform mediocre or poorly on homepage UX; 59 percent show "ad-looking" content | Does not test taglines; participant count not stated; the article's own site counts are inconsistent (60 and 80) |

Consequence: there is no benchmark in these sources that licenses a conversion-based rule. The hero contract rests on the corpus counts, SemVer, and logic, and the review flags state their basis.

## Normative guidance candidates

Provisional IDs `FSC-n` (first-screen copy). All SHOULD or MUST rules below are claimed against a measurement or a named authority; the rest are CONSIDER.

| # | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| FSC-1 | State the product's category noun or its job within the H1 or the subhead of every pitch-surface hero, and in the first sentence of a product README. | A reader who cannot name the thing-type cannot decide to try it. 22 of 25 exemplar heroes do. | MUST | Reading heuristic F2: delete the product name and version from H1 plus subhead; the remainder must contain a noun phrase one would type into a search box. Pass "The web framework for content-driven websites"; fail "mise-en-place". The corpus checker is `scripts/passA.py` (CAT lexicon) for a first filter. |
| FSC-2 | Keep the hero H1 to at most 12 words; aim for 5 to 10. | Corpus maximum is 12 (25 of 25); 15 of 25 sit in 5 to 10; Fletch's subtitle names 5 to 10 words. The band is practitioner guidance. | MUST (12), SHOULD (5 to 10) | `python3 -c "import sys;print(len(sys.argv[1].split()))" "<h1 text>"` |
| FSC-3 | Build the H1 as category plus differentiation, or job plus differentiation. | The only sourced constructions (Fletch, 2026-04-07; practitioner, B2B scope). | SHOULD | Reading heuristic: the H1 contains one of the two parts and a clause a competitor could not copy unchanged. Fail: "Connect everything. Achieve anything." |
| FSC-4 | Do not write an outcome the product cannot plausibly deliver alone ("drive revenue") or one so vague that "but what does that mean?" is the reaction ("automate systems"). | Fletch names both as failures (too lofty, too broad). He gives no banned-word list; this rule is a heuristic, not a lint. | SHOULD | Reading heuristic F9 with Fletch's two examples as the fail cases and "Code breaks, fix it faster" as the pass case. |
| FSC-5 | Keep one reader, one idea, one promise, one offer in the hero. | Stripe Atlas's rule of one; generated pages serve several audiences by accident. | CONSIDER | Reading heuristic F8: if the hero lists three audiences or three outcomes, split or cut. |
| FSC-6 | Use one category noun for the product in the README tagline, the site `<title>`, the meta description and the hero H1, in at least three of the four. | Both fleet products drift today (ocx: package manager, binary distribution platform, "Same tools. Every machine."; grim: package manager versus lockfile). | SHOULD | Extract the four strings (`grep -m1 '^#' README.md`; `grep -o '<title>[^<]*' dist/index.html`; `grep -o 'name="description" content="[^"]*' dist/index.html`; hero H1) and check one shared noun. |
| FSC-7 | State maturity in one plain sentence on the first screen when the product is below 1.0.0, labelled alpha, beta, preview, skeleton or experimental, or is unmaintained or archived. Place it within the first 15 non-blank README lines and before any install block, or in the hero segment as text. | SemVer §4: 0.y.z means anything may change; the upstream sample is silent (0 of 25 landings, 1 of 39 READMEs), so the fleet standard must be stated as a rule, not inferred. | MUST | `grep -n -i -E 'alpha|beta|pre-?release|preview|early (access|development)|experimental|unstable|skeleton|work in progress|under development|no longer (actively )?maintained|unmaintained' README.md \| head -15` finds a hit on the stated lines when the version field starts with `0.` or status is skeleton, alpha, beta; page version from `grep -m1 '^version' Cargo.toml` or the manifest's equivalent. |
| FSC-8 | Write the maturity sentence as stage first, then what may change, with no adjectives. Example: "Pre-1.0: the CLI works, and commands or the config format may change between minor releases." | A reader needs the stage and the consequence; "exciting early-stage" and "blazing early development" carry neither. | SHOULD | Reading heuristic: the sentence names a stage word from the vocabulary and a thing that may change; fail "We are just getting started" |
| FSC-9 | Record each maturity statement as an evidence record of class `maturity` with value from {concept, skeleton, alpha, beta, pre-1.0, stable, inactive, unmaintained, moved}, `source` the version manifest, `definition` SemVer §4 or repostatus.org, `subject_version`, and a `refresh_by` of the next release tag or 90 days. | A status line written once and never revised becomes a false claim when the project ships 1.0 or stops. | MUST | The record exists beside the copy; lint compares `subject_version` with the current manifest version and fails when they differ. |
| FSC-10 | Do not write "stable", "production-ready", "battle-tested" or "enterprise-grade" on a first screen unless a `maturity` record has value `stable` and the version is 1.0.0 or above. | [FTC reasonable-basis doctrine](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) (1984-11-23); the claim contradicts [SemVer §4](https://semver.org/) below 1.0. | MUST | Grep the first screen for the four words; if present, the version must start with `1.` or higher and a record must exist. |
| FSC-11 | Put an unmaintained, archived or moved notice on line 1 of the README when the repository is archived or the maintainer has stopped. | Earthly (line 1) is the only upstream example and the clearest. repostatus.org defines the statuses. | MUST | `gh api repos/<o>/<r> --jq .archived` is `true` implies the first non-blank line contains one of the status words. |
| FSC-12 | Do not put "AI" or "agent" in the H1 unless a declared justification names one of Fletch's conditions that holds. | Agents add AI claims by default; [Fletch, 2026-11-07](https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning), says leading with AI backfires when weak, untied to a job, or unsupported by reputation. | SHOULD | Grep `-i -E '\bAI\b|agent'` over the H1; require a justification field. |
| FSC-13 | State who the product is for as a reader role, prerequisite or problem within the first two sentences. | DOC-TYPE-36 holds this at CONSIDER with no rate; the measured upper bound is 10 of 25 heroes, so it stays CONSIDER. | CONSIDER | Reading heuristic: the first two sentences contain a reader role or a stated problem. |
| FSC-14 | Treat only site roots with a hero and repository-root READMEs as pitch surfaces; do not apply FSC-1 to FSC-13 to docs start pages or hubs even when they carry `doc_type: landing`. | Smell 9: three hubs carry the tag without being pitches. | SHOULD | The rule engine keys on the page being the site root with a hero component, or on `README.md` at the repository root. |

## AI-agent angle

| What an agent gets wrong | Smallest mechanical check |
|---|---|
| Writes a slogan or a brand-only H1 ("Meet X", "The future of Y") that fails the logo-removal test | FSC-1 heuristic on the H1 plus subhead; F2 |
| Writes "the fastest", "the most secure", "production-ready" into a README of a 0.x tool | FSC-10 grep with the version field |
| Omits status altogether, copying the upstream norm | FSC-7 grep on the first 15 lines against the version field |
| Writes a status badge as an image only | FSC-8: require one text sentence; an agent reading the README sees alt text at best |
| Rewrites the hero and leaves the README tagline and `<title>` with the old noun | FSC-6 four-string extraction |
| Adds "AI-powered" to the H1 | FSC-12 grep |
| Stacks three audiences or three promises in the subhead | F8 heuristic; DOC-TYPE-10's 30-word warning catches the length |
| Invents a status ("battle-tested", "stable") because the code works | FSC-9: no record, no claim |

## Dated facts

| Fact | URL | Date the source states | Source class |
|---|---|---|---|
| H1 guide: category plus differentiation, or JTBD plus differentiation; failures too broad, too lofty; subtitle "5-10 words" | https://fletchpmm.com/newsletter/how-to-write-an-h1 | 2026-04-07 | practitioner (PMM newsletter) |
| Conditions when leading with AI works or backfires | https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning | 2026-11-07 | practitioner |
| Rule of one: one reader, one big idea, one promise, one offer | https://stripe.com/au/atlas/guides/landing-page-copy | undated; footer "2026" | vendor guide (Stripe) |
| Above-the-fold: header, hook, persona; subheader of one or two sentences; 2 to 4 nav links plus a CTA; "can increase conversion by 10-30%" with no method | https://www.demandcurve.com/playbooks/above-the-fold | 2020-10-30 | practitioner, no data |
| Hero order: title, subtitle, visual, social proof, CTA; no word limits; no test data | https://marketingexamples.com/landing-page/guide | undated | practitioner, no data |
| Copywriting formula catalogue; warns early hero CTA draws unqualified trials | https://copyhackers.com/2015/10/copywriting-formula/ | undated (URL path 2015/10) | practitioner, no data |
| 41,000 landing pages, 464 million visitors, 57 million conversions, median conversion 6.6 percent, no headline data | https://unbounce.com/average-conversion-rates-landing-pages/ | Q4 2024 data, updated 2025-03-04 | vendor data |
| E-commerce homepage UX: 32 percent mediocre or poor (up from 25 percent in 2018), 59 percent "ad-looking" content; no tagline test | https://baymard.com/research-articles/ecommerce-homepage-ux | 2021-07-13 | vendor data (research firm) |
| "Start the page with a tagline that summarizes what the site or company does"; one sentence | https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/ | 2002-05-11 | independent research firm; historical |
| SemVer §4 major version zero; §5 1.0.0 defines the public API; spec 2.0.0 | https://semver.org/ | no date on page | authority (specification) |
| Eight project statuses (Concept, WIP, Suspended, Abandoned, Active, Inactive, Unsupported, Moved) | https://www.repostatus.org/ | no spec date; 2017-04 in a usage count only | community specification |
| Alpha, beta, GA API tracks and removal rules | https://kubernetes.io/docs/reference/using-api/deprecation-policy/ | undated | platform authority |
| "The reasonable basis doctrine requires that firms have substantiation before disseminating a claim" | https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | 1984-11-23 | law authority (FTC) |
| Corpus counts in this file (25 landings, 40 READMEs, tags) | gh API and the 25 URLs in `$B/urls.txt` | fetched 2026-11-27 | own measurement |

## What an agent must not decide alone

- Which category a product is in, and which differentiator to claim. That is positioning; the agent may propose two or three candidates from the manifest and README and must ask.
- Whether a product is pre-1.0, beta or stable when the version field and the maintainer's statement disagree, and whether to declare 1.0 or stable. A status word is a business and support commitment.
- Whether to remove or soften a maturity statement the owner wrote. Ask first; never delete one to make a hero cleaner.
- Whether leading with AI is right for a product (Fletch's conditions are reputation and strategy facts the agent cannot see).
- Whether a surface is a pitch surface when the catalog has no explicit marker; propose, then ask.
- Any "production-ready", "stable", customer count or adoption statement. Needs a record and an owner's sign-off.
- Which audience to prioritize when the product has several (Stripe's rule says the reader is the most important of the four).

## Contested / evolving

- **Category-first or outcome-first H1.** Fletch and the Harry Dry guide (title is the value; three approaches including "own your niche in one line") both allow either; corpus split is 14 category, 5 outcome. The top six repository-star products lead with an outcome in 4 of 6 and a category in 2 of 6, the other 16 reverse that (`exemplar-landing-pages.md` "What the top quartile does differently"); the audit notes a plausible age confound (Tailwind, Bun and Deno need no category) and a sample of 6 against 16. Position: require the category or job to appear in H1 or subhead (22 of 25), and leave the H1's lead to the author.
- **Status on the first screen versus silence.** Upstream norm is silence (above). The opposing view is that a status line lowers conversion; no data was found for or against, and neither Unbounce nor Baymard measures it. Position here: required below 1.0 for fleet products on the grounds of SemVer and agent readers; this is a policy choice, not a measured effect.
- **Hero CTA at all.** Copyhackers (2015-10 URL date): an early button may attract unqualified trials and the ask should come at the end; Demand Curve and the corpus (24 of 25 with at most 2 hero CTAs, Stripe, Linear) put a CTA in the hero. CTA counts belong to DOC-TYPE-12; recorded only so the two dives do not diverge.
- **Rule-of-one strictness.** Stripe Atlas wants one reader per page; the corpus has 10 of 25 heroes with audience lexemes and some (Turso: "every user, agent, and tenant") name several. Position: CONSIDER only.
- **AI in the headline.** Fletch's 2026-11-07 conditions are practitioner judgement from named cases; the corpus has 4 of 25 H1s that name agents (linear, vercel, flyio, neon) and 7 of 25 hero texts. The trend since early 2026 in the corpus is toward naming agents; no source measures whether it helps.

## Limits

- Scoring independence. The commissioned agreement (23 of 25 H1, 23 of 25 subhead, kappa 0.88 and 0.87) is between two blind model raters from different vendors, not between humans; both are LLMs and may share biases a human rater would not. The earlier 25 of 25 and 21 of 25 figures came from a keyword classifier tuned on the same pages by the author and are withdrawn as agreement evidence. The original `$B` working directory (scripts, per-page manual labels) was no longer on disk at repair time, so the first-pass per-page labels could not be re-compared page by page; only its tallies survive, and rater 2's H1 tally matches them exactly. Disagreements concentrate on pages whose H1 mixes a category noun with a slogan (posthog, flyio, linear). No human second rater was available.
- No browser; "first screen" is the hero-segment proxy for landings and the first 15 non-blank lines for READMEs. A client-side hero is invisible to `curl`.
- The raw-DOM extractor misparsed 6 of 25 pages (see section 3); scoring uses the audit's hand-resolved verbatim texts (`$B/scripts/texts.py`).
- Pre/post-1.0 for landings uses the repository's latest release tag; hosted or closed products (posthog, supabase, linear, vercel, stripe, flyio, neon, calcom, sentry, plausible) have no meaningful product version, so only uv, ruff and turso are classed pre-1.0 and n is 3. For READMEs, `tauri-apps/tauri` and `withastro/astro` returned a sub-package tag (`tauri-cli-v2.12.6`, `@astrojs/node@11.1.14`) and were counted post-1.0; `NixOS/nix` has no GitHub release and is excluded.
- The README wider-window scan (40 lines) was read by hand for 5 hits; hits are not guaranteed exhaustive.
- Two fetches failed: `https://baymard.com/blog/homepage-and-category-usability` returned only a one-line teaser, and Google Cloud's launch-stages page (`https://cloud.google.com/products/launch-stages`) returned 404, so no Google launch-stage vocabulary is cited. The Baymard source above was found by a search and then fetched; the search snippet was not used as a source.
- The scout candidate "banned-vague verb list" (`landing-conversion.md` #23) is not in Fletch's article and is dropped.
- Fletch's guidance is scoped to B2B software; fleet products are open-source developer tools. Fit is plausible but unproven.
- The central question could be sourced; blocked=false.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://fletchpmm.com/newsletter/how-to-write-an-h1 | Fletch H1 guide (practitioner) | 2026-04-07 | The only sourced H1 constructions and failure classes |
| https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning | Fletch on AI in positioning (practitioner) | 2026-11-07 | Conditions for AI in the H1 |
| https://stripe.com/au/atlas/guides/landing-page-copy | Stripe Atlas landing-page copy guide (vendor guide) | undated, 2026 footer | Rule of one |
| https://www.demandcurve.com/playbooks/above-the-fold | Demand Curve above-the-fold playbook (practitioner) | 2020-10-30 | Header and subheader formula; unsourced lift claim |
| https://copyhackers.com/2015/10/copywriting-formula/ | Copyhackers formula catalogue (practitioner) | undated | PAS, AIDA, 4 Ps; hero-CTA caution |
| https://marketingexamples.com/landing-page/guide | Harry Dry landing-page guide (practitioner) | undated | Hero order; no logo-removal test, contrary to the scout |
| https://unbounce.com/average-conversion-rates-landing-pages/ | Unbounce benchmark (vendor data) | 2025-03-04, Q4 2024 data | Sample size; no headline data |
| https://baymard.com/research-articles/ecommerce-homepage-ux | Baymard homepage UX (vendor data) | 2021-07-13 | E-commerce first-impression stats; limited transfer |
| https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/ | NN/g homepage guidelines (independent research firm) | 2002-05-11 | One-sentence tagline rule; historical |
| https://semver.org/ | Semantic Versioning 2.0.0 (primary specification) | no date | 0.y.z and 1.0.0 meaning |
| https://www.repostatus.org/ | Project Status Badge specification (primary, community) | no spec date | Status vocabulary and badge placement |
| https://kubernetes.io/docs/reference/using-api/deprecation-policy/ | Kubernetes deprecation policy (primary, platform) | undated | Alpha, beta, GA vocabulary with removal rules |
| https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | FTC substantiation policy (primary, law) | 1984-11-23 | Reasonable-basis rule for "stable" and "production-ready" |
| GitHub REST API, `gh api repos/<r>/readme`, `.../releases/latest` | 40 upstream READMEs and release tags (primary, platform) | fetched 2026-11-27 | The README maturity counts |
| The 25 landing URLs in `$B/urls.txt` | exemplar landing pages (primary) | fetched 2026-11-27 | The hero counts |
| `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/docs-quality-reference/page-types.md` lines 128-133, 143-147 | DOC-TYPE-10..15, 32..36 as shipped | read 2026-11-27 | What this dive must not repeat |
