---
title: Positioning record and drift check - one canonical sentence, one category noun, one object noun, one source per list
program: product
sub_program: marketing
topic: marketing-positioning-record
worker: positioning-canonical-sentence
date_researched: 2026-11-27
model: sonnet
sources_fetched: 50
scope: Which surfaces must carry the canonical sentence verbatim, which may paraphrase, where the source of truth lives, how enumerated lists are generated, the minimum home meta description, and a runnable drift check. Covers README line 1, GitHub About description, manifest description, home title and meta and og:description, hero h1, docs-home lead. Does not cover the other GitHub About fields (topics, homepage, social preview), which belong to channels, nor the quality of the positioning itself (category choice, differentiation), which is a business decision.
---

# Positioning record and drift check

## Table of contents

1. Summary
2. Findings (1 practitioner sources, 2 how the fleet single-sources today, 3 enumerated lists, 4 measurements, 5 platform facts about each surface, 6 the decision)
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- One record must exist before copy: a data file holding one canonical sentence, one category noun, one object noun, the forbidden variants, and one source per enumerated list. Practitioners call the human version a messaging document that references the positioning inputs ([Dunford, 2019-10-17](https://www.aprildunford.com/post/a-product-positioning-exercise), practitioner source).
- The record is not the positioning work. Dunford says positioning is not a tagline and calls fill-in-the-blank statements "not only pointless but potentially dangerous" ([Lenny's Newsletter, 2021-01-26](https://www.lennysnewsletter.com/p/positioning), practitioner source). The agent's input is the finished decision, written by a human, not a statement it invents.
- Measured: of 22 exemplar dev-tool products with a GitHub repo, only 3 carry one category noun on all four of README first sentence, GitHub About, meta description and hero h1; 11 carry it on at least 3 of 4. Category noun reach by surface: About 18 of 22, meta description 15, README first sentence 13, hero h1 7.
- Measured: only 5 of 22 exemplars reuse one sentence verbatim across About, README and meta description (uv, ruff, vite, vercel, svelte). The best exemplars agree on the noun, not on the string.
- Measured on the fleet: 3 of 17 repos have two surfaces with the same sentence; Grimoire's main product reuses one sentence in 5 places but names its object "AI-agent config", "AI artifacts" and "AI-config packages" across the family and lists 4, 5 or 8 artifact kinds. The authoritative list, `ArtifactKind::ALL`, has 8.
- Verbatim (after whitespace and trailing-period normalisation): README tagline line, manifest description, home meta description and og:description. Same text on all four, one generated value.
- Paraphrase allowed, noun required: GitHub About (sentence first, extension after), `<title>`, hero h1, docs-home lead sentence. Each must contain the category noun or the object noun.
- Minimum home meta description: the category noun and the object noun in one sentence, nothing else required. Google states no length limit and truncates by device width, so the noun pair goes first ([Google, undated page](https://developers.google.com/search/docs/appearance/snippet)).
- Enumerated list rule: generate from one source (the code enum, the schema, the manifest array) or cut to "N kinds" plus a link. Never hand-type a list on a surface.
- Drift check: a script reads the record, extracts each surface, and fails when a required noun is missing, a forbidden variant appears, or a list or count differs from its source. A prototype ran against Grimoire and found two real gaps (section 4.5).
- The fleet's existing checks do not cover this: `landing_check.py` pins router-card hrefs and pain strings; `landing.test.ts` pins the ocx h1 literal. Neither compares the tagline to the head, README or manifest.

## Findings

### 1. Message-house and hierarchy practice (practitioner sources, not authorities)

- Dunford's method orders the work competitive alternatives, differentiated attributes, value, target customer, market category, with category last because it is the context that makes the value obvious ([Lenny's Newsletter, 2021-01-26](https://www.lennysnewsletter.com/p/positioning), practitioner source). It names no rule for reusing a sentence.
- Dunford separates positioning from messaging: "I usually build a messaging document that references the positioning template"; the messaging document holds "approved messaging for value statements for different buyer personas" and "boilerplate messaging that can be used as a starting point for marketing and sales materials" ([Dunford, 2019-10-17](https://www.aprildunford.com/post/a-product-positioning-exercise), practitioner source). This is the nearest practitioner basis for a single reusable record.
- Fletch PMM's H1 guidance: name the product category then the differentiation, or name the customer's job then the differentiation; the goal of a headline is "to establish a point of reference", "the most important 5-10 words of your entire business" ([Fletch PMM, 2026-04-07](https://www.fletchpmm.com/newsletter/how-to-write-an-h1), practitioner source). It does not say the H1 must match other surfaces. Their sprint deliverable is an internal deck defining "the exact words to describe what your product is, who it's for, the problem it solves, and the value it delivers", and they list "Our teams use different language to explain what we do" as the common problem ([Fletch PMM home, undated](https://www.fletchpmm.com)).
- Wynter's messaging hierarchy post (2023-01-26, vendor, practitioner source): clarity is the top layer ahead of relevance, value, differentiation; the framework should "establish a shared terminology"; the example of a headline that never said what the product was ([Wynter](https://wynter.com/post/messaging-hierarchy)). It does not address reusing one sentence or an owner of the source of truth.
- Wynter's grader reports (vendor data, AI-simulated personas, directional by Wynter's own disclaimer) suggest saying the category in the first five words of the H1; one test found 4 of 15 simulated buyers could say what the product solves. Treat as vendor data, not evidence from buyers ([search summary of grader.wynter.com reports, 2026](https://grader.wynter.com/)). Wynter's real panel is described as 86,000+ identity-verified B2B professionals, but its guide is qualitative with no failure-rate statistic ([Wynter, 2025-04-24](https://wynter.com/post/message-testing)).
- Gap: none of the three sources states a rule that one sentence is reused verbatim. The rule here is an engineering inference from their shared-terminology and single-story language, not a practitioner claim. See Contested.

### 2. How the fleet single-sources copy today

Commands run from `/home/mherwig/dev`.

- Grimoire `grimoire-rs/grimoire/docs/src/data/landing.ts` opens with "Single source of truth for the landing page's entry-path tiles and pain-router cards". It holds `entryPaths` (3) and `routerCards` (8). `landing.test.ts` asserts the counts (8, 3), that every href ends `.html`, that hrefs resolve under `docs/dist`, and that pain strings are non-empty and unique.
- `grimoire-rs/grimoire/docs/landing_check.py` (247 lines) asserts: anchors equal `routerCards` hrefs; no nested anchors; footer hrefs inside `.site-links`; and check 5: each `pain` string appears 0 times in `docs/src/components/*.astro`. It is a single-source check for cards, not for the tagline.
- The tagline is not in `landing.ts`. The same sentence is hand-copied: `grep -n "Package manager for AI-agent config" grimoire-rs/grimoire/Cargo.toml grimoire-rs/grimoire/README.md grimoire-rs/grimoire/docs/src/pages/index.astro` hits `Cargo.toml:21`, `README.md:7-8` ("A package manager..." with a leading "A") and `index.astro:37-38`. Reuse is by hand and by luck of discipline; nothing fails if one copy changes.
- ocx `ocx-sh/website/site/src/landing.test.ts` (read lines 1-80) pins the h1 by regex (`Same tools.<br><em>Every machine.</em>`), counts install bars (4), problem cards (6), pillar rows (4), and asserts "ocx is in early development". `landing-content.ts` holds the dated comparison data. This is snapshot-pinning of one surface, not a link between h1, meta description and README. The meta description lives in `index.mdx:3`, the h1 in `Landing.astro:39-41`; the audit already measured them disagreeing (category "binary distribution platform" vs "package manager").
- Conclusion: the fleet single-sources structured tiles, never the sentence, the noun or the list.

### 3. Generating an enumerated list from one source

- Authoritative list: `ArtifactKind::ALL: [Self; 8]` at `grimoire-rs/grimoire/src/oci/artifact_kind.rs:82`, with the module comment "`ArtifactKind::ALL` is the authoritative list" (line 6). Variants: Skill, Rule, Agent, Bundle, Mcp, Hook, Settings, Mod. Command: `awk '/pub enum ArtifactKind/,/^}/' src/oci/artifact_kind.rs | grep -E "^    [A-Z][a-z]+,?$"` prints 8.
- The indexer default hand-types 8 kinds in `grimoire-rs/indexer/src/config.ts:187-190` (`description` and `tagline`), and `grimoire-rs/vscode/package.json:4` hand-types 8. Both are correct today and both are hand copies.
- Surfaces that are wrong against the enum: GitHub About of grimoire (5) and grimoire-vscode (5); site meta description, README and Cargo.toml (4); live `https://index.grimoire.rs/` meta (5) even though `config.ts` default now says 8 (the deployed index disagrees with the source default; whether it is stale or overridden was not determined).
- Mechanism choices, cheapest first: (a) a count plus a link ("8 artifact kinds, listed at <url>") with the count generated from the enum in CI; (b) a generated string: a small script prints the list from the enum and the build writes it into `package.json`, `config.ts` and the site; (c) a test that parses the surface and asserts set equality with the source. For short fields (About, meta) prefer (a): a list in 150 characters is always a truncation of the truth.

### 4. Measurements

#### 4.1 Corpus

The `exemplar-landing-pages` corpus was absent on 2026-11-27 and rebuilt: `~/.cache/research-lang/exemplars/product/exemplar-landing-pages/` holds `html/` (25 home pages by `curl -sL -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) research"`, all HTTP 200), `meta/` (`gh repo view <repo> --json description,homepageUrl` and `gh api repos/<repo>/readme -H "Accept: application/vnd.github.raw"`), and `scripts/` (`map.txt`, `surf.py`, `agree.py`). URL list and repo mapping come from `product-audit/exemplar-landing-pages.md`. Three of 25 have no public repo (astral company page, linear, stripe) and are excluded: n = 22. Run `python3 -I scripts/surf.py` then `python3 -I scripts/agree.py`.

Limits of the measurement, stated plainly:
- The category noun per product was chosen by me (reading the About and title) and is listed in the table. A different choice changes individual rows, not the shape of the result.
- "README" is the first descriptive sentence of at least 5 words, not literal line 1, because most READMEs start with a name, logo or nav links.
- The hero h1 is the first `<h1>` in raw HTML; no JavaScript executed. Several exemplars use a brand name or a tagline slogan as the h1 (uv, ruff, svelte, tauri), which counts as a miss for the noun.
- Not tested: whether a synonym of the noun appears ("toolkit" for "framework").

#### 4.2 Exemplar agreement (22 products)

Columns: README first sentence, About, meta description, hero h1 (Y = category noun present).

| Product | Noun | R A M H | Hits |
|---|---|---|---|
| posthog | platform | N Y N N | 1 |
| supabase | postgres | Y Y Y N | 3 |
| astro | framework | N Y N Y | 2 |
| tailwind | framework | Y Y Y N | 3 |
| bun | runtime | N Y Y Y | 3 |
| deno | runtime | N Y Y N | 2 |
| uv | manager | Y Y Y N | 3 |
| ruff | linter | Y Y Y N | 3 |
| mise | tools | Y Y N N | 2 |
| zed | editor | Y Y Y N | 3 |
| tauri | framework | Y N N N | 1 |
| biome | toolchain | N Y N Y | 2 |
| vite | tool | N Y Y Y | 3 |
| turso | database | Y Y Y Y | 4 |
| calcom | scheduling | N Y Y N | 2 |
| plausible | analytics | Y Y Y Y | 4 |
| sentry | monitoring | N Y Y N | 2 |
| vercel | platform | Y N N N | 1 |
| flyio | vm | N N Y N | 1 |
| tailscale | network | Y N N N | 1 |
| svelte | web | Y Y Y N | 3 |
| neon | postgres | Y Y Y Y | 4 |

Totals (from `agree.py`): README 13 of 22, About 18, meta 15, h1 7; all four 3 (turso, plausible, neon); 3 or more 11; verbatim pair among About, README, meta (after normalisation) 5 of 22 (uv, ruff, vite, vercel, svelte). The README counts for vite and a few others use a first line outside the strict "line 1". Meta description and og:description were equal on every page where both were read (not separately counted), so no exemplar was seen with an independent social description. Reading: exemplars agree on the noun in About and meta, and treat the h1 as brand or slogan space.

#### 4.3 Fleet, 17 repos

Command (`fleet.py`, scratchpad, same logic as the inventory): for each directory under `ocx-sh/` and `grimoire-rs/`, `gh repo view <slug> --json description`, first prose line of `README.md` of at least 4 words, the manifest `description` from `Cargo.toml`, `package.json` or `pyproject.toml`; compare after normalising case and punctuation, counting prefix matches.

- 15 of 17 repos have at least 2 of those surfaces; 3 of 17 have a matching pair: ocx (README tagline equals Cargo description, "The Simple Package Manager"), indexbot (About equals pyproject), ocx-mirror (About equals Cargo). grimoire's three surfaces differ only by a leading "A " and an article and fail a prefix test; they are one sentence in practice.
- ocx, four-surface category check for "package manager": README Y, About Y, meta description N ("binary distribution platform"), hero h1 N ("Same tools. Every machine."). 2 of 4. The ocx.sh head is source-derived; the live site failed TLS on 2026-11-27 per the inventory.
- grimoire.rs, live (`curl -sL -A Mozilla/5.0 https://grimoire.rs/`): meta and og:description carry "Package manager for AI-agent config" (Y); title and hero h1 say "a lockfile for your AI-agent config" (category N, object Y). Also, the HTML has two `<h1>`: a Starlight shell `<h1 id="_top">Grimoire</h1>` and the hero `<h1>A lockfile for your AI-agent config.</h1>`. The exemplar pattern "exactly one h1" is broken on the live Grimoire home (`curl -sL https://grimoire.rs/ | grep -o '<h1' | wc -l` gives 2).
- Total distinct one-liners in the audit: 61 for 17 repos; ocx 11; Grimoire 8.

#### 4.4 Per Grimoire surface: object noun and number of listed types

Command: `grep -n -i -o -E "ai[- ](agent )?(config(uration)?|artifacts?|config packages?)" <file>` per surface; type count from the listed items in the same line; live pages by `curl -sL`. Authoritative count: 8.

| Surface | Object noun | Kinds listed | Matches enum (8)? |
|---|---|---|---|
| `Cargo.toml:21` | AI-agent config | 4 | no |
| `README.md:7` | AI-agent config | 4 | no |
| `docs/src/pages/index.astro:37-38` and live meta | AI-agent config | 4 | no |
| `docs/src/content/docs/introduction.md:3` | AI-agent configuration | 0 | no list |
| GitHub About, grimoire | AI-agent config | 5 | no |
| GitHub About, grimoire-vscode | AI artifacts | 5 | no |
| `vscode/package.json:4` | AI artifacts | 8 | yes |
| `vscode/README.md:8` | AI artifacts | 0 | no list |
| live `index.grimoire.rs` meta | AI-config packages | 5 | no |
| `indexer/src/config.ts:187-190` | AI-config packages / "AI coding agents" | 8 | yes |
| live `lore.ocx.sh` meta ("OCX lore, a Grimoire package index.", 35 characters) | none | 0 | names no contents |

Result: 4 object nouns ("AI-agent config", "AI-agent configuration", "AI artifacts", "AI-config packages"), 4 distinct list lengths (4, 5, 8, 0), 2 of 8 listing surfaces correct against the enum.

#### 4.5 Prototype drift check run

`check.py` (scratchpad; the logic is the command in rule P-1 below) with a four-line record (`category = "package manager"`, `object = "AI-agent config"`, forbidden `AI artifacts`, `AI-config packages`, `AI-agent configuration`) against `grimoire-rs/grimoire` and `https://grimoire.rs/`: About, README, Cargo, meta, og pass; title and first h1 fail the category noun ("lockfile" selling); first h1 also fails the object noun because it is the Starlight shell `Grimoire`. The prototype tested the first `<h1>`, which is the two-h1 defect; it correctly flags it. It did not test enumerations.

### 5. Platform facts that shape the decision

- Google builds title links automatically from `<title>`, main visible title, heading elements, `og:title` and `WebSite` structured data, and may rewrite when the title is inaccurate or boilerplate; it advises putting the title text in the first visible `<h1>` ([Google title links, undated](https://developers.google.com/search/docs/appearance/title-link)). A title and an h1 that disagree give the search engine a reason to choose for you.
- Google may use the meta description for the snippet when it is more accurate than page content; "There's no limit on how long a meta description can be"; snippets are truncated to device width ([Google snippets, undated](https://developers.google.com/search/docs/appearance/snippet)).
- Open Graph: `og:description` is optional, "A one to two sentence description of your object"; required are title, type, image, url; it never says `og:description` must equal the meta description ([ogp.me, fetched 2026-11-27](https://ogp.me/)).
- Cargo: `description` is plain text (not Markdown), a "short blurb", required to publish to crates.io, no stated maximum ([Cargo Book, undated](https://doc.rust-lang.org/cargo/reference/manifest.html#the-description-field)). npm: the description "helps people discover your package, as it's listed in `npm search`" ([npm docs, undated](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#description)). Python core metadata `Summary` is "A one-line summary of what the distribution does", no maximum stated ([PyPA, undated](https://packaging.python.org/en/latest/specifications/core-metadata/#summary)). VS Code: `description` is "A short description of what your extension is and does", used for Marketplace text search, so keywords help ([VS Code manifest, undated](https://code.visualstudio.com/api/references/extension-manifest)).
- GitHub About: the REST `description` is "A short description of the repository", no numeric limit stated ([GitHub REST docs, undated](https://docs.github.com/en/rest/repos/repos#update-a-repository)). A 350-character cap is stated only by one third-party blog post, [SlateGit, published 2026-08-03](https://slategit.com/blog/github-repo-description-character-limit-what-fits) (independent blog, not the platform; fetched 2026-11-27); no GitHub page states it and it is unverified. The [dead-claudia/github-limits](https://github.com/dead-claudia/github-limits) list gives no description maximum. Grimoire's About is 299 characters (inventory).

### 6. The decision

Surface match table.

| Surface | Match rule | Required content |
|---|---|---|
| README first sentence or tagline line | exact (normalised) copy of the canonical sentence | sentence |
| Manifest `description` (Cargo.toml, package.json, pyproject.toml, VS Code `description`) | exact copy; plain text, one line | sentence |
| Home `<meta name="description">` and `og:description` | exact copy of the sentence, may be followed by one more sentence; the two tags hold one value | category noun and object noun |
| GitHub About | sentence first, verbatim; may append proof or clients | sentence |
| Home `<title>` | paraphrase | category noun, product name; if the h1 is a slogan the title carries the category |
| Hero h1 | paraphrase | category noun or object noun; a slogan h1 is allowed only when the subhead carries both nouns |
| Docs-home lead sentence | paraphrase | category noun and object noun, same list source |
| Any surface that lists items | generated | items from the list source, or "N kinds" plus link |

The source of truth: a file in the product repo, `positioning.toml` at the repo root (name is a recommendation), with `sentence`, `category`, `object`, `forbidden` variants, `[lists.<name>]` entries pointing at a code or schema source, and a `reviewed` date. The human positioning brief (Dunford's canvas output) sits above it and is not parsed.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER.

P-1 (MUST). Before writing or editing any public copy, read `positioning.toml` (or the named brief) and refuse to write if it has no `sentence`, `category` and `object`; ask the owner. Rationale: copy written without a record is what produced 61 one-liners for 17 repos. Verify: `test -s positioning.toml && python3 -I -c "import tomllib;d=tomllib.load(open('positioning.toml','rb'));assert all(d.get(k) for k in ('sentence','category','object'))"` exits 0.

P-2 (MUST). Use one category noun phrase for the product on README first sentence, manifest description, home meta description, og:description and About. Rationale: measured, only 3 of 22 exemplars and 0 of the fleet's two main products achieve it on four surfaces. Verify: for each surface `grep -i -c -F "$(category)"` is at least 1; the drift check in P-9 returns exit 0.

P-3 (MUST). Use one object noun (what the product acts on). Never use a listed forbidden variant. Rationale: Grimoire uses four nouns across one family (section 4.4). Verify: `grep -rniF -e "AI artifacts" -e "AI-config packages" <surfaces>` returns nothing, with the forbidden list taken from `positioning.toml`.

P-4 (MUST). The README tagline line, the manifest description, and the home meta description and og:description are byte-equal to `sentence` after whitespace and trailing-period normalisation. Rationale: three hand copies of one string drift silently (grimoire Cargo.toml:21, README.md:7, index.astro:37). Verify: script compares normalised strings; pass example: all three read "Package manager for AI-agent config"; fail example: one reads "A fast, cross-platform binary package manager..." and another "The Simple Package Manager" (ocx today).

P-5 (MUST). Generate the manifest description and the meta description from the record, not by hand: build step reads `sentence`. Rationale: a generated value cannot drift; a check only detects. Verify: `grep -n "sentence" <build config>` shows the read; the check in P-9 passes after a change to `positioning.toml` with no other edit.

P-6 (MUST). Never type an enumerated list of the product's kinds, clients or modules into a surface. Generate it from its source or write "N kinds" with N generated and a link. Rationale: 6 of 8 Grimoire surfaces that list kinds disagree with the 8-member enum (section 4.4). Verify: per `[lists.*]` entry, the script extracts the items on each surface and asserts set equality with the source (or, for a count, equality of N); fail example: About lists 5 of 8.

P-7 (SHOULD). The GitHub About begins with the full canonical sentence; extensions follow after the sentence. Rationale: About is the text GitHub search and listings show; a verbatim opening keeps the noun first. Verify: `gh repo view <repo> --json description -q .description | grep -F -q "$(sentence)"`; a prefix check is `case`/`startswith` on the normalised string. Do not rely on the unverified third-party 350-character figure ([SlateGit, 2026-08-03](https://slategit.com/blog/github-repo-description-character-limit-what-fits)); count against the repo's actual field.

P-8 (MUST). A home meta description contains the category noun and the object noun before any other claim, in the first sentence. Rationale: Google may use it as the snippet and imposes no limit but truncates by width; the noun pair is the minimum that tells a searcher what the product is. Verify: first sentence of `<meta name="description">` matches both nouns; pass: "Package manager for AI-agent config — skills, rules, agents, and MCP servers, installed into every coding agent you use"; fail: "OCX lore, a Grimoire package index." (35 characters, names no contents) and "Install a project" (mise, an exemplar meta description that names no category).

P-9 (MUST). A CI step runs a drift check on every change that touches a surface or the record, and fails when a required noun is missing, a forbidden variant appears, or a list differs. Verify: the step exits 1 on a seeded failure. Reference implementation: read the record; get About with `gh repo view <slug> --json description -q .description`; README first prose line of 5 or more words; manifest description by regex; from the built `dist/index.html` (not live), `<title>`, `name="description"`, `og:description`, and every `<h1>`; compare as in P-2 to P-6; exit 1 on any finding. Run from the repo root after the site build.

P-10 (SHOULD). Check that the built home has exactly one `<h1>`. Rationale: live grimoire.rs has two (Starlight shell plus hero), and 23 of 25 exemplars have one. Verify: `grep -o '<h1[ >]' dist/index.html | wc -l` equals 1.

P-11 (SHOULD). When the hero h1 is a slogan with no category noun, the subhead or the `<title>` carries the category noun. Rationale: 7 of 22 exemplars carry the noun in the h1; the others carry it in About or meta; the page must name the category somewhere above the fold. Verify: category noun appears in `<title>` or in the first paragraph after the hero h1 (word-count of at most 30).

P-12 (SHOULD). Every product in a family (CLI, extension, index site, plugin) uses the family's category and object nouns, or names its own record. Rationale: grim-gui is "application", "front end" and "shell"; the vscode listing calls the object "AI artifacts". Verify: run P-9 per repo against the family record; a repo with its own noun has its own `positioning.toml`.

P-13 (CONSIDER). Add the `reviewed` date to the record and fail the check when it is older than the newest tag or release by more than one release. Rationale: positioning rots when the product ships new kinds or clients. Verify: `git log -1 --format=%cs -- positioning.toml` compared to `git describe --tags`.

P-14 (CONSIDER). Add a Vale `substitution` rule generated from `forbidden` for prose in docs and READMEs: `extends: substitution`, `level: warning`, `swap: {"AI artifacts": "AI-agent config"}` ([Vale](https://docs.vale.sh/checks/substitution)). Rationale: catches the forbidden variant in body copy, not only in the surfaces the check script knows. Verify: `vale --minAlertLevel=warning docs README.md` reports 0.

## What an agent must not decide alone

- The category noun and the object noun. Choosing the category is the positioning decision itself (Dunford orders it last because it depends on alternatives and value); an agent proposes, a human decides. Ask when `positioning.toml` is missing or when the surfaces already disagree (ocx: "package manager" vs "binary distribution platform").
- Whether to rename an existing noun across a family. It changes search terms, docs URLs and a product's public name.
- The wording of a differentiation claim ("fast", "simple", "every coding agent you use") that is not backed by a measurement in the repo. The audit counted 12 unproven ocx claims.
- Whether an enumerated list is shown in full, trimmed or replaced by a count when the count would reveal an unstable, experimental surface (hooks, mods).
- Changing GitHub About, homepage or topics on a live repository: it publishes immediately and affects search; flag it as an action for the owner (the permission model may not allow the write).

## AI-agent angle

| Mistake an agent makes | Smallest mechanical check |
|---|---|
| Invents a fresh tagline per file, each plausible | P-4 string equality against `sentence`; reject any README first line, manifest description or meta description not equal |
| Writes the benefit adjectives ("fast", "simple", "seamless") into the manifest description | `grep -i -w -E "fast|simple|seamless|blazing|powerful" <surface>` zero hits unless a measurement link is within the same page |
| Types the type list from its own memory (it knows 4 or 5 kinds, not 8) | P-6 set equality with the enum |
| Reuses the About text as the meta description because it is nearby, and so copies a 299-character client list into og:description | P-8 first-sentence check; meta description only the sentence plus at most one clause |
| Edits the README tagline and leaves `Cargo.toml`, `package.json`, `index.astro` untouched | P-9 in CI; or generate (P-5) |
| Treats the `<h1>` as the thing to keep identical to the meta description | Paraphrase allowed; check nouns only (P-2, P-11) |
| Writes a fill-in-the-blank positioning statement and calls it the positioning | P-1: record comes from the owner |
| Counts `<h1>` in a Starlight page without noticing the shell title | P-10 counts all `<h1` occurrences |

## Contested / evolving

- Dunford against the canonical statement. Dunford calls the fill-in-the-blank positioning statement "not only pointless but potentially dangerous" and says positioning is not a tagline ([Lenny's Newsletter, 2021-01-26](https://www.lennysnewsletter.com/p/positioning)); Fletch and Wynter both centre on one clear set of words for what the product is ([Fletch PMM](https://www.fletchpmm.com), [Wynter, 2023-01-26](https://wynter.com/post/messaging-hierarchy)). Reconciliation here: the record holds the output of positioning (nouns, one sentence) as a derived artifact; it does not hold the positioning itself. Open question: whether the sentence should be verbatim on the README and meta (this dive) or only the nouns (the exemplars). The exemplars favour nouns: 5 of 22 reuse a sentence verbatim.
- Category-first versus job-first headlines. Fletch lists both a category H1 and a job-to-be-done H1 as valid ([Fletch PMM, 2026-04-07](https://www.fletchpmm.com/newsletter/how-to-write-an-h1)). A job-first hero (ocx "Same tools. Every machine.") makes the category rule on the h1 weaker; P-11 moves the noun to the subhead or title. Corpus (audit): 14 of 25 headlines name a category, 9 state an outcome.
- Whether og:description should equal the meta description. ogp.me is silent; the corpus never differs. A separate social description is an option; no measurement supports it, so the rule keeps one value.
- Wynter data is vendor data on simulated buyers; no independent study of homepage clarity was found. Treat "category in the first five words" as a heuristic, not a measured threshold.
- GitHub About length: a third-party blog ([SlateGit, 2026-08-03](https://slategit.com/blog/github-repo-description-character-limit-what-fits)) reports a 350-character cap; no GitHub page states it. Verify in the repo settings before relying on it.

## Dated facts

| Fact | Source | Date stated | Kind |
|---|---|---|---|
| Positioning components ordered alternatives, attributes, value, customer, category; fill-in-the-blank statement "pointless but potentially dangerous" | [Lenny's Newsletter](https://www.lennysnewsletter.com/p/positioning) | 2021-01-26 | practitioner |
| "I usually build a messaging document that references the positioning template" | [Dunford](https://www.aprildunford.com/post/a-product-positioning-exercise) | 2019-10-17 | practitioner |
| H1 names category or job, then differentiation; "most important 5-10 words" | [Fletch PMM](https://www.fletchpmm.com/newsletter/how-to-write-an-h1) | 2026-04-07 | practitioner |
| Clarity is top layer; shared terminology | [Wynter](https://wynter.com/post/messaging-hierarchy) | 2023-01-26 | vendor |
| Wynter panel "86,000+ identity-verified B2B professionals"; guide is qualitative | [Wynter](https://wynter.com/post/message-testing) | 2025-04-24 | vendor |
| Meta description: no length limit; truncated to device width; may be used as snippet | [Google](https://developers.google.com/search/docs/appearance/snippet) | undated page, fetched 2026-11-27 | platform |
| Title links built from title, headings, og:title, WebSite data; may be rewritten | [Google](https://developers.google.com/search/docs/appearance/title-link) | undated page, fetched 2026-11-27 | platform |
| `og:description` optional, "one to two sentence description" | [ogp.me](https://ogp.me/) | fetched 2026-11-27 | standard |
| Cargo `description` plain text, required for crates.io, no maximum | [Cargo Book](https://doc.rust-lang.org/cargo/reference/manifest.html#the-description-field) | undated, fetched 2026-11-27 | platform |
| npm `description` listed in `npm search` | [npm docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#description) | undated, fetched 2026-11-27 | platform |
| Core metadata `Summary` is one line, no stated maximum | [PyPA](https://packaging.python.org/en/latest/specifications/core-metadata/#summary) | undated, fetched 2026-11-27 | standard |
| VS Code `description` used for Marketplace text search | [VS Code](https://code.visualstudio.com/api/references/extension-manifest) | undated, fetched 2026-11-27 | platform |
| GitHub repo `description` "short", no numeric limit stated | [GitHub REST](https://docs.github.com/en/rest/repos/repos#update-a-repository) | undated, fetched 2026-11-27 | platform |
| Vale `substitution` swap map, level | [Vale](https://docs.vale.sh/checks/substitution) | undated, fetched 2026-11-27 | tool docs |
| `ArtifactKind::ALL` has 8 members | `grimoire-rs/grimoire/src/oci/artifact_kind.rs:82` | local read 2026-11-27 | first-party |
| Exemplar agreement (22 products) | `~/.cache/research-lang/exemplars/product/exemplar-landing-pages/scripts/agree.py` | measured 2026-11-27 | own measurement |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.aprildunford.com/post/a-product-positioning-exercise | Dunford on positioning template vs messaging document | 2019-10-17 | The only source that names a separate messaging document that references positioning |
| https://www.lennysnewsletter.com/p/positioning | Dunford quickstart, component order | 2021-01-26 | Category last; against statement templates |
| https://www.fletchpmm.com | Fletch PMM home | 2026 | One-story deliverable, "teams use different language" |
| https://www.fletchpmm.com/newsletter/how-to-write-an-h1 | Fletch H1 guidance | 2026-04-07 | Category or JTBD first |
| https://www.fletchpmm.com/blog | Fletch post list | 2026 | Dates of the H1, positioning-strategy and AI-positioning posts |
| https://wynter.com/post/messaging-hierarchy | Wynter hierarchy post | 2023-01-26 | Clarity layer, shared terminology |
| https://wynter.com/post/message-testing | Wynter message testing guide | 2025-04-24 | Method and panel; no failure-rate number |
| https://grader.wynter.com/ | Wynter AI grader (search result, not opened in full) | 2026 | AI-simulated; directional only |
| https://developers.google.com/search/docs/appearance/snippet | Google snippet guidance | undated | No description length limit |
| https://developers.google.com/search/docs/appearance/title-link | Google title link guidance | undated | Title/h1 consistency, rewriting |
| https://ogp.me/ | Open Graph protocol | fetched 2026-11-27 | og:description optional |
| https://doc.rust-lang.org/cargo/reference/manifest.html#the-description-field | Cargo manifest | undated | Plain text, required to publish |
| https://docs.npmjs.com/cli/v10/configuring-npm/package-json#description | npm package.json | undated | Search use |
| https://packaging.python.org/en/latest/specifications/core-metadata/#summary | Python core metadata | undated | One-line summary |
| https://code.visualstudio.com/api/references/extension-manifest | VS Code manifest | undated | Marketplace search use |
| https://docs.github.com/en/rest/repos/repos#update-a-repository | GitHub REST, description | undated | No numeric limit stated |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | GitHub topics docs | undated | Confirms About location; no description limit |
| https://docs.vale.sh/checks/substitution | Vale substitution | undated | Enforcing a preferred term |
| `grimoire-rs/grimoire/docs/src/data/landing.ts`, `landing.test.ts`, `docs/landing_check.py` | Fleet single-sourcing for cards | local, 2026-11-27 | What is and is not single-sourced |
| `ocx-sh/website/site/src/landing.test.ts` | Fleet ocx landing test | local, 2026-11-27 | Pins h1 by regex |
| `grimoire-rs/grimoire/src/oci/artifact_kind.rs` | Authoritative kind list | local, 2026-11-27 | Count of 8 |
| `grimoire-rs/indexer/src/config.ts:187-190`, `grimoire-rs/vscode/package.json:4` | Hand-typed lists | local, 2026-11-27 | The two lists that agree |
| `product-audit/messaging-inventory.md`, `product-audit/exemplar-landing-pages.md` | Fleet and exemplar audits | 2026-11-27 | Starting measurements |
| https://grimoire.rs/, https://index.grimoire.rs/, https://lore.ocx.sh/ | Live pages, curl 2026-11-27 | 2026-11-27 | Observed meta, titles, h1 count |
| 25 exemplar home pages and 22 GitHub repos (`map.txt`) | Rebuilt corpus | 2026-11-27 | Agreement measurement |

Fetch notes: `https://www.nngroup.com/articles/tagline-guidelines/` and `/articles/taglines-brand-slogans/` returned HTTP 404; `https://www.aprildunford.com/post/positioning-vs-messaging` returned 404. Fletch's and Wynter's own pages did not state a rule that a sentence is reused verbatim. The central question was sourced (measurements and platform docs); the verbatim-reuse rule rests on measurement and engineering inference, not on a practitioner quote.
