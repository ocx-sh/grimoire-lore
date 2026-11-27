---
paths:
  - "README.md"
  - "**/README.md"
  - "CHANGELOG.md"
  - "**/CHANGELOG.md"
  - "Cargo.toml"
  - "**/Cargo.toml"
  - "package.json"
  - "**/package.json"
  - "pyproject.toml"
  - "**/pyproject.toml"
  - ".agents/positioning.toml"
  - ".agents/voice.toml"
  - "claims.toml"
  - "crawler-policy.toml"
  - "**/astro.config.*"
  - "**/mkdocs.yml"
  - "**/docusaurus.config.*"
  - "**/.vitepress/config.*"
  - "**/next.config.*"
  - "**/robots.txt"
  - "**/_headers"
  - "**/pages/index.astro"
  - "**/pages/index.tsx"
  - "**/pages/index.mdx"
  - "**/pages/index.md"
  - "**/app/page.tsx"
  - "**/cliff.toml"
  - ".github/release.yml"
summary: The marketing-surface index, holding the positioning record every pitch surface must match, the claims that need an evidence record, the first screen, voice and AI authorship, head metadata and crawler policy, and where the depth lives
keywords: marketing,positioning,messaging,tagline,value-proposition,claims,evidence,testimonials,open-source,licence,landing-page,hero,readme,seo,open-graph,canonical,robots-txt,ai-crawlers,structured-data,release-notes,analytics
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
metadata:
  grim.requires.skills.marketing-quality-reference: "./marketing-quality-reference:0"
---

# Marketing Quality

Traps, not a style guide. Every line names a mistake an agent makes by default when it writes a pitch: a fresh tagline per file, a number from memory, a quote that nobody gave. This rule governs copy surfaces: the README first screen, the pitch page, manifest and repository descriptions, the site head, and release bodies. Docs pages stay `docs-quality`'s. Where a page is read by both sets, `docs-quality` governs it, and MKT-PAGE adds requirements only on pitch surfaces.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) · [Siblings](#siblings)

**This rule loads on every manifest edit, because the measured top failure is a fresh tagline per file (61 one-liners for 17 repositories).** A manifest edit that touches neither `description` nor `keywords` needs only row 9, the licence row. Every other edit to a governed surface needs the rows below. The rule installs with the `paths:` list above, each glob its own item (MKT-POS-12), and loads on those files and on nothing else. Rules reach only some clients, so an adopter also adds the one `AGENTS.md` line MKT-POS-12 gives.

## The Gate

Run in this order after every change to a governed surface. Each step's exit status is the verdict, never its stdout. List each step in your report under `ran:` or `did not run:`, with the exit code and the tree it ran on.

```sh
CHECKS=.claude/skills/marketing-quality-reference/checks   # $CLAUDE_CONFIG_DIR/skills/... when installed globally
BASE=origin/main                                            # the branch this change merges into, rename it
HOST=example.com                                            # the production hostname, no scheme
DIST=dist                                                   # the built site directory (replace dist with the real build output)
python3 -I "$CHECKS"/claims_lint.py --base "$BASE"          # 1 MKT-CLAIM-01 to 05, 28: pattern hits against claims.toml
python3 -I "$CHECKS"/positioning_check.py drift             # 2 MKT-POS-08 to 11: record, surfaces, lists, banned terms
# 3 after the site build, on the built output:
python3 -I "$CHECKS"/head_check.py "$DIST" --host "$HOST"    # MKT-SEO-01 to 10, 21 to 25
# 4 after every deploy, against the public name:
python3 -I "$CHECKS"/live_site_check.py robots "$HOST"      # MKT-SEO-11 to 17, 26; also policy, parity, preview
```

Exit 0 is clean, 1 is findings, 2 is a bad invocation or a missing input (no record, no file). A step that exits 2 did not run. `claims_lint.py` needs a `claims.toml` at the repository root, and the positioning check needs `.agents/positioning.toml`. When the record is missing, row 1 says what to do. When `claims.toml` is missing, create it empty (no `[[claim]]` rows, a valid file) so step 1 runs, and report each hit as an owner question: never invent a record. While the record is unreviewed, step 2's `drift` exits 1 on the sentence and tagline mismatch (MKT-POS-07, MKT-POS-08) by construction: list it under `ran:` as "owner decision pending" with its exit code, and take the verdict from `fields`, `sourced`, `audience` and `alternatives`. Neither step is skipped silently. A repository with no built site has no step 3 to run: say so. Steps 1 and 2 read only the repository. Steps 3 and 4 read a build and a live host and are the owner's pipeline's to run. If you cannot run them, say so. `denigration` sees only the record's `kind = "tool"` alternatives plus each `--name`.

## Non-Negotiables

Every line below blocks a merge within the scope it names. IDs resolve through [Where the Depth Is](#where-the-depth-is), where each rule carries its rationale and verification. MKT-MEAS, MKT-REL and the channel rules live in the skills named in the last two rows.

| # | Rule | ID |
|---|---|---|
| 1 | Read `.agents/positioning.toml` before editing a governed surface. When it is missing, draft it through `positioning-brief` with `status = "unreviewed"` and `ASK-OWNER` in every field no repository text supports, and report those fields. Never invent an audience, a category or an alternative. | MKT-POS-03, MKT-POS-01 |
| 2 | While the record is unreviewed or past its `review_by`, never change the product sentence, the category noun or the object noun on any surface. Never set `status = "reviewed"` or move `review_by` yourself. | MKT-POS-04 |
| 3 | The manifest `description`, the README tagline line, the home meta description and `og:description` equal the record's `sentence`. The drift check runs in CI. | MKT-POS-08, MKT-POS-11 |
| 4 | Never type an enumerated list of the product's kinds, clients or platforms: render it from its source or write a generated count. Never use a `forbidden` variant or a `do_not_say` entry. | MKT-POS-10, MKT-POS-07, MKT-POS-09, MKT-POS-13 |
| 5 | A sentence that matches the claim pattern set needs a live evidence record in `claims.toml`, through a `claim:<id>` marker or the record's `surface` binding. An expired record counts as absent. | MKT-CLAIM-01, MKT-CLAIM-02, MKT-CLAIM-05 |
| 6 | Never write a price, limit, quota, plan or tier name, discount or count without a record sourced from the system of record. An `[[allow]]` entry never covers these. Ask the owner. | MKT-CLAIM-03 |
| 7 | Never write a statistic from memory. A performance or comparison figure links its method page in the same paragraph or caption. | MKT-CLAIM-07, MKT-CLAIM-06 |
| 8 | When a claim has no record, rewrite it as a mechanism a reader can check, never a softer adjective. Never delete or soften a statement of absence or limitation ("no third-party audit", "early development"). | MKT-CLAIM-08, MKT-CLAIM-10 |
| 9 | Write "open source" only for a licence whose every SPDX option is OSI-approved. Keep one licence id identical in the LICENSE file, manifests, README and artifact frontmatter. Write "free" only with its meaning in the same sentence. | MKT-CLAIM-11, MKT-CLAIM-12, MKT-CLAIM-13 |
| 10 | Never write "SOC 2 certified" or "compliant with" a law. A security attestation or commitment, a maturity grade or a commercial comparison needs a named human sign-off from a second identity. | MKT-CLAIM-14, MKT-CLAIM-16 |
| 11 | Write "AI-powered", "AI-driven", "agentic" or "intelligent" only when the shipped artefact calls a model at runtime for that function. An AI accuracy figure needs an `ai-capability` record. | MKT-CLAIM-18, MKT-CLAIM-19 |
| 12 | Never invent a quote, a name with a role, a rating, a logo or an adopter. Quote exact words with a capture date, and state any connection in the same element. Never use a quote as the source of a measured claim. | MKT-CLAIM-20, MKT-CLAIM-21, MKT-CLAIM-22, MKT-CLAIM-28 |
| 13 | Never set a third party against the product except through a `comparison` record with a source and a date. Never state a competitor's limitation from memory: no script detects that clause, so read for it. Add or remove no compared party yourself. | MKT-CLAIM-30, MKT-CLAIM-16 |
| 14 | A popularity count is a dated number with a link, never a customer list. Tie no review incentive to a rating or sentiment. | MKT-CLAIM-24, MKT-CLAIM-26 |
| 15 | First-screen rules apply only to a page that declares `doc_surface: pitch` or `offer` and to a releasing repository's README. Write no "stable" or "production-ready" claim at major 0. An archived repository's README says so first. | MKT-PAGE-01, MKT-PAGE-09, MKT-PAGE-10 |
| 16 | Never gate on an AI-detector score, never run a humanizer, never state who or what wrote a page, and never invent the author's past: write `ASK-OWNER`. | MKT-VOICE-01, MKT-VOICE-02, MKT-VOICE-14, MKT-VOICE-06 |
| 17 | Publish a recording or screenshot only from a real run of the shipped binary. Label generated media that could pass as a real person, product or event. | MKT-VOICE-17, MKT-VOICE-16 |
| 18 | The production origin is an absolute https URL. Every indexable page has one canonical, a unique title, its own description and the Open Graph set on the built page. Never enforce a title or description length that Google never set. | MKT-SEO-01, MKT-SEO-02, MKT-SEO-03, MKT-SEO-04, MKT-SEO-05, MKT-SEO-06 |
| 19 | Record the crawler policy in `crawler-policy.toml` and check it live after every deploy. Never overstate a crawler control. Emit no misleading structured data. Never bump a date without a content change. | MKT-SEO-15, MKT-SEO-16, MKT-SEO-17, MKT-SEO-18, MKT-SEO-21, MKT-SEO-23 |
| 20 | Add no analytics script, pixel or beacon without an owner-approved decision record. Put no campaign tag on a link to a host the project owns. Route to `marketing-measurement`. | MKT-MEAS-01, MKT-MEAS-09 |
| 21 | Editing `cliff.toml` or `.github/release.yml`: change the template in the file that owns it, render a breaking change as `**BREAKING:**` with a migration line, and never let a breaking commit be skipped. Route to `release-notes`. | MKT-REL-01, MKT-REL-03, MKT-REL-04 |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed under. One level deep: these files do not point at each other.
Depth files and checks scripts ship in the `marketing-quality-reference` skill this rule requires. Load it, or read `.claude/skills/marketing-quality-reference/<file>` (`~/.claude/skills/` when installed globally).

| Doing… | Read |
|---|---|
| Writing a number, a price, a limit, "fast" or another outcome word, a performance figure or chart, a comparison table, a price reduction, an AI accuracy claim, or editing `claims.toml` or the claims lint | [marketing-quality-reference/claims.md](../skills/marketing-quality-reference/claims.md) |
| Writing "open source", "free" or a licence line, a security, SOC, ISO or compliance sentence, `security.txt`, "verified", a quote, logo, badge, rating, adopter name or review, a star or download count, an award or analyst placement, or an owner sign-off | [marketing-quality-reference/trust-claims.md](../skills/marketing-quality-reference/trust-claims.md) |
| Writing or changing a tagline, product sentence, manifest or repository description, the About text, the category or object noun, a list of kinds or clients, or the positioning record | [marketing-quality-reference/positioning.md](../skills/marketing-quality-reference/positioning.md) |
| Writing a hero, a README opening, a maturity or archived line, or declaring `doc_surface` on a page | [marketing-quality-reference/first-screen.md](../skills/marketing-quality-reference/first-screen.md) |
| Writing copy in a project's voice, adding or removing an AI badge or authorship line, using a humanizer or detector, labelling generated media, publishing a recording, or drafting an advisory, outage or breach notice | [marketing-quality-reference/voice.md](../skills/marketing-quality-reference/voice.md) |
| Editing a page's `<head>`, title, description, canonical or Open Graph tags, a sitemap, `robots.txt` or `_headers`, an AI-crawler policy, structured data, a preview host, or a generated page set | [marketing-quality-reference/discoverability.md](../skills/marketing-quality-reference/discoverability.md) |
| No positioning record exists, or the owner asks for positioning, a value proposition or messaging | `positioning-brief` skill |
| Adding analytics, a UTM tag, a metrics report, a funnel, an A/B test or an AI-citation count | `marketing-measurement` skill (MKT-MEAS) |
| Writing release notes, a GitHub Release body, a deprecation or a licence change notice, or editing `cliff.toml` or `.github/release.yml` | `release-notes` skill (MKT-REL) |
| Grading an existing README or pitch page against this set | `marketing-review` skill |
| Editing the repository About text, topics or community files on GitHub | `github-presence` skill |
| Writing a Markdown docs page, `llms.txt`, or a docs-site home page | `docs-quality` (sibling set) |
| Writing alt text, focus, contrast or states on a rendered page | `ux-quality` (sibling set) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline. A row whose severity waits on an owner decision says so in its own row.

Rules marked **pinned** in the depth files encode an agreed decision rather than a derivable fact. Pinned here: the record locations and schemas (`.agents/positioning.toml` at most 80 lines, `.agents/voice.toml`, `claims.toml` and `crawler-policy.toml` at the repository root), the `doc_surface` values (`pitch`, `offer`, `home`), the `claim:<id>` marker, the `ASK-OWNER` token, and the default `refresh_by` intervals of MKT-CLAIM-05. Each is a default an adopter may override once, in the record or the script's options, never per page and never per call site. Overriding one is a decision recorded with its reason, and re-arguing one in a pull request is not a review comment.

Not studied: pricing pages and paid tiers, the layout of service-offer pages beyond MKT-PAGE-12 and 13, and pre-registered A/B results of any copy pattern. Where a surface is outside this rule, ask the owner rather than infer.

Keep the Block list short enough that a blocked change is unusual. A rule set where everything blocks teaches the reader to negotiate with all of it.

## Siblings

- **`docs-quality`**: co-loads on README, CHANGELOG, `mkdocs.yml` and the generator configs. It governs a page both sets read. It owns DOC-TYPE-10 to 15 (landing and adoption claims), DOC-PLAIN-01 (punctuation), DOC-PLAIN-08 (authorship badges), DOC-PLAIN-12 (marketing words) and DOC-AGENT-04 (`llms.txt`, which this rule ships nothing for).
- **`ux-quality`**: co-loads with `css-theming` on `pages/index.astro`. It owns the rendered page: accessibility, states, text and AI-feature disclosure.
- **The packaging rules** (`rust-cargo`, `python-packaging`, `typescript-packaging`): co-load on manifests. They own what a manifest declares and what fails its build, and this rule owns what its `description` and `keywords` say.
- **`positioning-brief`, `release-notes`, `marketing-review`, `marketing-measurement`, `github-presence`, `channel-publishing`**: procedures that cite these IDs by number and never restate them. The `product-essentials` bundle ships them with this rule.
