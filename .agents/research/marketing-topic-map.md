---
title: Marketing topic map, wave 1
program: product
sub_program: marketing
date: 2026-11-27
model: opus
revision: 2 (answers the completeness critic; see "Critic responses")
---

# Marketing topic map, wave 1

This map is Phase 3 of the product program for the marketing sub-program. It reads the 13 marketing scouts in `.agents/research/marketing-topic-map/` and the ten grounding audits in `.agents/research/product-audit/`. The `channel-*.md` files in the scout directory belong to the channels sub-program. This map reads `channel-github-as-channel.md` only to draw the ownership line, and maps none of its rows.

Every fleet number below comes from an audit or a scout. Each one cites the file, and that file's Method section holds the command that produced it. Commands ran from `/home/mherwig/dev` against the fleet roots `ocx-sh/` and `grimoire-rs/`. Every external claim links its source. Where a scout gave a date, the date is shown. Vendor data is labelled as vendor data.

One measurement made for this revision: the exemplar cache that the exemplar audits used is gone. `ls ~/.cache/research-lang/exemplars/` printed "No such file or directory" on 2026-11-27. Every brief that measures the exemplar corpus therefore tells its worker to rebuild the corpus first, from the sample list and scripts in the audit that built it.

## Contents

- [Territory and exclusions](#territory-and-exclusions)
- [The map](#the-map)
- [Selected for this wave](#selected-for-this-wave)
- [Deferred](#deferred)
- [Artifact set](#artifact-set)
- [Frame corrections](#frame-corrections)
- [Critic responses](#critic-responses)

## Territory and exclusions

The map covers these areas:

- positioning and messaging
- copy on landing pages, READMEs, service pages, pricing pages and release notes
- search and answer-engine discoverability of a built site
- pricing and packaging, as far as an agent writes or builds it
- owned-audience communication: email, newsletters, changelogs, release bodies
- measurement and attribution
- law and platform policy on claims
- brand voice, naming, and visual and demo assets

Some rows that look like marketing are already owned by existing lore artifacts. The map marks those rows "covered" and does not restate them:

- css-theming
- docs-quality:
  - landing rows DOC-TYPE-10..15, which run on every page declared `doc_type: landing`, docs hubs included
  - README rows DOC-TYPE-32..36
  - changelog rows DOC-TYPE-37..41
  - superlative list DOC-PLAIN-12, one top-level heading DOC-PLAIN-13, inline links DOC-PLAIN-15
  - AI-assistance PR key DOC-PLAIN-22
  - llms.txt optional DOC-AGENT-04
  - docs metrics DOC-OBS-08 and DOC-OBS-16
- code-docs
- CLI stream and exit contracts
- TUI rows
- installer-script
- shell-integration

Two sibling sub-programs own nearby ground. A row that belongs to one of them gets one line, under "Cross-territory pointers", and is left there:

- **ux**: the interface itself, including accessibility, page structure, forms, states, navigation, onboarding, CLI interaction and AI-feature UI.
- **channels**: anything specific to one platform or venue, including LinkedIn, YouTube, video, microblogs, communities, HN, Product Hunt, GitHub and registries used as channels, audio, events and blogs.

## The map

Coverage values:

- **covered**: an existing lore rule or skill already decides the row.
- **partial**: something in the catalog or the fleet touches the row, but nothing decides it.
- **uncovered**: nothing touches it.

The catalog was measured in `product-audit/config-inventory.md`: 25 rules, 50 skill directories, 13 bundles.

Priority values:

- **P1**: decide this wave. "inside X" names the selected dive that carries it.
- **P2**: next wave.
- **P3**: backlog.
- **hand-off**: another sub-program or artifact owns it. The row names the owner.

Each row's "why" names the reason for this fleet first, then the reason for software teams in general.

### Positioning and messaging

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| positioning-record | What single positioning record must exist before any copy is written? | partial | P1 | Fleet: `product-context.md` exists in 6 variants, path-scoped to `website/**` and `.agents/**`, so README edits never load it (config-inventory.md smell 4). Teams: Dunford's brief ([aprildunford.com](https://www.aprildunford.com/)) comes before copy; canonical-guides #2. |
| canonical-sentence-drift | Must one canonical sentence and one category noun be reused verbatim on every surface? | uncovered | P1 | Fleet: 61 distinct one-liners across 17 repos; ocx alone has 11, which disagree on category, benefit and direction (messaging-inventory.md §2, smell 1). Teams: Moore's 7-slot sentence (canonical-guides #6). |
| vocabulary-list-drift | Must the object noun and every enumerated list (artifact types, supported clients) come from one source? | uncovered | P1 (inside positioning-canonical-sentence) | Fleet: Grimoire calls one thing "AI-agent config", "AI artifacts" and "AI-config packages", and lists 4, 5 or 8 artifact types by surface (`Cargo.toml:21`, `package.json:4`, `config.ts:187-190`; messaging-inventory.md §3, smell 4). Teams: the same drift recurs whenever a list is retyped per surface. |
| audience-statement | Must every product surface name who it is for? | uncovered | P1 (inside positioning-brief-fields) | Fleet: only 1 of 17 repos names its audience (`devcontainer-features/README.md:6`, messaging-inventory.md §6, smell 3). Teams: the "everyone" smell (canonical-guides #7). |
| named-alternative | Must copy name the alternative the buyer uses today, and say when not to use the product? | uncovered | P1 | Fleet: 0 of 18 fleet READMEs have a "why" or comparison heading, against 11 of 40 upstream (exemplar-readmes.md); developer-marketing.md #1. Teams: Stack Overflow 2025 lists alternatives as a top rejection reason ([survey.stackoverflow.co/2025](https://survey.stackoverflow.co/2025/)). |
| positioning-style | Which of Dunford's three positioning styles does each product take? | uncovered | P2 | Fleet: ocx alternates between "package manager", "binary distribution platform" and "toolchain pinning". Teams: [Fletch, three strategies](https://fletchpmm.com/newsletter/there-are-only-three-positioning-strategies). |
| awareness-stage | Which Schwartz awareness stage does each surface address? | uncovered | P2 | Fleet: a README and a landing page reach readers at different stages. Teams: canonical-guides #11–12. |
| switching-forces | Must copy answer anxiety and habit, through migration, rollback and coexistence? | uncovered | P2 | Fleet: ocx replaces apt, brew and nvm habits. Teams: JTBD four forces (canonical-guides #25). |
| voc-corpus | Where must customer language come from? | uncovered | P2 | Fleet: no voice-of-customer corpus; Discord has 5 members (distribution-posture.md). Teams: landing-conversion #8; Mom Test scripts, canonical-guides #26–27. |
| brief-review-date | Must the brief carry a review-by date? | uncovered | P1 (inside positioning-brief-fields) | Teams: Dunford recommends a review every 6 months (canonical-guides #31). |
| trend-word-hero | May a trend word ("AI") lead the hero? | uncovered | P2 | Teams: [Fletch on AI in positioning](https://fletchpmm.com/newsletter/should-you-incorporate-ai-in-your-positioning); landing-conversion #24; canonical-guides #32. |
| multi-product-page | How should one site present several products? | uncovered | P3 | Fleet: ocx.sh and grimoire.rs are separate, and grim's install page starts with the ocx installer (site-shape.md smell 2). Teams: landing-conversion #38. |

### Claims, evidence and proof

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| objective-claim-test | Which words make a claim objective, and therefore in need of proof? | uncovered | P1 (inside claims-evidence-record) | Teams: codified-law-policy #29. |
| performance-claims | What evidence must sit beside a speed or "Nx faster" claim? | partial (DOC-PLAIN-12 lists words, not claims) | P1 (inside claims-evidence-record) | Fleet: 193 lines of speed or superlative claims, 55 of them in product repos (codified-law-policy.md #3); ocx has 12 unquantified claims and 0 with proof (messaging-inventory.md smell 2). Teams: [FTC substantiation policy, 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation); rebuttals by [ClickHouse](https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse) (2026-06-30) and [MariaDB](https://mariadb.org/why-sysbench%E2%80%91tpcc-results-on-outdated-hardware-should-not-be-presented-as-a-valid-oltp-vendor-comparison/) (2026-01-27). |
| statistic-provenance | Must every statistic carry its source, date and a refresh-by date? | uncovered | P1 (inside claims-evidence-record) | Fleet: 0 dated claims outside `landing-content.ts:3-18` (messaging-inventory.md §6). Teams: canonical-guides #17–18 and #33; practitioner #29, #33, #35. |
| never-invent-numbers | May an agent ever write a price, limit, plan name or count with no source? | uncovered | P1 (inside claims-evidence-record) | Fleet: no prices exist, so any price an agent writes is invented (pricing-plg.md #1, marked DECISION). Teams: the same failure on any pricing or quota page. |
| licence-wording | When may copy say "open source", and what must match the LICENSE file? | uncovered | P1 | Fleet: 177 files say "open source"; 15 repos have a LICENSE, 14 of them Apache (codified-law-policy.md #1). Teams: [OSD](https://opensource.org/osd), [OSI trademark guidelines](https://opensource.org/trademark-guidelines), [OSAID](https://opensource.org/ai/open-source-ai-definition). |
| ai-capability-claims | What may copy claim about AI accuracy or capability? | uncovered | P1 | Fleet: grimoire ships config for AI agents. Teams: [FTC Operation AI Comply, 2024-09](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes); [Workado order, 2025-04](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims) (claimed 98%, measured 53%). |
| security-compliance-claims | May copy say "secure", "SOC 2 certified" or "ISO compliant"? | uncovered | P1 | Fleet: "pinned by digest" is a mechanism, not a security claim. Teams: SOC 2 is an attestation, not a certification ([AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)); services-b2b #22–24; codified-law-policy #30. |
| legal-claim-signoff | Which claim classes need a human sign-off? | uncovered | P1 (inside claims-ai-security-compliance) | Teams: codified-law-policy #32. |
| testimonials-reviews | What testimonial, review or endorsement may an agent place on a page? | uncovered | P1 | Fleet: no testimonials exist and no proof section sits on either landing (site-shape.md smell 3), so an agent would have to invent them. Teams: [16 CFR 465 rule](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials), effective 2024-10-21; [Endorsement Guides FAQ](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking). |
| material-connection | When must a relationship with the person giving an endorsement be disclosed? | uncovered | P1 (inside claims-endorsements-proof) | Teams: [FTC Disclosures 101](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers); codified-law-policy #7. |
| case-study-contract | Which fields must a case study carry? | uncovered | P1 (inside claims-endorsements-proof) | Teams: services-b2b #20; landing-conversion #21–22. |
| popularity-proof | May stars, downloads or "used by" logos be shown on a page, and in what form? | uncovered | P1 (inside measure-metric-validity) | Fleet: ocx has 20 stars and grimoire 17 (distribution-posture.md). Teams: the [fake-stars study, arXiv 2412.13459](https://arxiv.org/abs/2412.13459) found 6M suspected fake stars, with campaigns on up to 16.66% of popular repos (failure-corpus.md). |
| comparison-fairness | How must a comparison table with competitors be built and dated? | uncovered | P1 (inside positioning-alternatives-comparison) | Fleet: the only dated comparison is ocx's "drift" table (messaging-inventory.md §2). Teams: developer-marketing #21–22; codified-law-policy #23–24. |
| review-platform-rules | What do G2 and Clutch allow for incentives and AI-drafted reviews? | uncovered | P2 | Fleet: no review-platform presence. Teams: [G2 guidelines](https://legal.g2.com/community-guidelines): a $100 incentive cap and AI drafting rules from 2026-11-04 (services-b2b #2–10); [Clutch methodology](https://clutch.co/methodology). |
| oss-support-claims | What may copy promise about support or an SLA for an OSS product? | uncovered | P3 | Teams: services-b2b #33. |

### Page and first-screen copy

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| pitch-surface-scope | How does a rule tell a pitch page from a docs hub, so that landing copy rules fire only on pitches? | partial (docs-quality runs DOC-TYPE-10..13 on every `doc_type: landing` page) | P1 | Fleet: 11 pages across 6 sites declare `doc_type: landing`, and only 2 are pitch pages (site-shape.md §6); doc hubs carry the tag (exemplar-landing-pages.md smell 9). A rule keyed on the tag fires on task routers. Teams: any docs generator with a "landing" layout has the same ambiguity. |
| docs-home-positioning | What must a product's docs home say when the product has no pitch page? | uncovered | P1 (inside page-surface-scope) | Fleet: 8 of 10 docs sites open on a docs page with no positioning, no proof and no single CTA; rules_ocx, devcontainer-features and ocx-mirror open on a snippet (site-shape.md smell 1). Teams: most OSS tools have only a docs site. |
| hero-construction | How is a hero H1 and subhead built, beyond the DOC-TYPE-10..15 counts? | partial | P1 | Fleet: subheads run 29 and 33 words, against an exemplar median of 11 (exemplar-landing-pages.md smell 5). Teams: [Fletch, H1 of 5–10 words](https://fletchpmm.com/newsletter/how-to-write-an-h1); [Stripe Atlas rule of one](https://stripe.com/au/atlas/guides/landing-page-copy). |
| status-line | Must the maturity status be visible in the hero and the README opening? | uncovered | P1 (inside page-hero-status) | Fleet: ocx says "early development" only in a closing footnote; the grimoire hero is silent on 1.0; grim-gui is "skeleton" (messaging-inventory.md smell 7). Teams: developer-marketing #11 lists status among first-screen needs. |
| h1-count | Must a built page carry exactly one `<h1>`? | covered for markdown (DOC-PLAIN-13) | hand-off: ux | Fleet: grimoire.rs renders 2 `<h1>` elements, because the Starlight site title renders as one (exemplar-landing-pages.md smell 3; site-shape.md smell 7). This is page structure and accessibility, not copy. |
| repo-card | Must the GitHub About fields (description, topics, homepage, social preview) be filled? | uncovered | hand-off: channels, except the description string | Fleet: 3 empty descriptions, 14 of 17 repos with no topics, 8 of 17 with no homepage (messaging-inventory.md §1, smell 6). Owner: `channel-github-as-channel.md` #1–3 and #9. The description text joins the canonical-sentence drift check. |
| landing-element-order | Is there a required section order? | uncovered | P3 | Fleet: exemplars disagree on order and NN/g prescribes none (site-shape.md §8). Not decidable as a rule. |
| cta-count-labels | How many CTAs, and with what labels? | covered for counts (DOC-TYPE-12) | P2 | Fleet: ocx.sh has 12 body CTAs and grimoire.rs 14; 24 of 25 exemplars have at most 2 hero CTAs (site-shape.md, exemplar-landing-pages.md smell 8). Labels are still open. |
| install-in-hero | Must the install command appear on the first screen? | partial (DOC-TYPE-11, DOC-TYPE-32..36) | P2 | Fleet: grimoire.rs has no install command on its landing (exemplar-landing-pages.md smell 7). |
| demo-shot | Must the first screen show a real product shot or terminal demo? | uncovered | P2 | Fleet: 0 of 18 fleet READMEs have a demo on the first screen, against 16 of 40 upstream (exemplar-readmes.md); there are 35 `.cast` files (brand-voice-assets.md). The README-above-the-fold mechanics are channels ground (`channel-github-as-channel.md` #4). |
| reading-level | Is there a target reading level? | partial (DOC-PLAIN readability arm) | P3 | Teams: the only source is Unbounce vendor data ([Unbounce](https://unbounce.com/conversion-benchmark-report/saas-conversion-rate/)); weak evidence. |
| pricing-page-copy | What must a pricing page show? | uncovered | P2 | Fleet: no pricing page and no paid tier (pricing-plg.md). Teams: [NN/G](https://www.nngroup.com/); [Copyhackers pricing checklist](https://copyhackers.com/2025/03/saas-pricing-page-checklist/). |
| offer-terms-law | Which price and trial terms must sit next to a CTA (EU prior price, tax-inclusive display, cancellation)? | uncovered | P2 | Fleet: no offer exists to apply it to. Teams: [Omnibus Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L2161); [PAngV §1](https://www.gesetze-im-internet.de/pangv_2022/__1.html); [§312k BGB](https://www.gesetze-im-internet.de/bgb/__312k.html). |
| service-page | What must a services page say (scope, buying group, proof)? | uncovered | P3 | Fleet: no services offering. Teams: Forrester counts 13 people per buying decision ([Forrester 2024](https://www.forrester.com/blogs/state-of-business-buying-2024/)). |
| ai-tells-copy | Which features make agent-written copy read as AI slop to a developer reader? | partial (DOC-PLAIN prose lint gives warnings only) | P1 | Fleet: the fleet's copy is agent-written. Teams: an AI-authorship accusation appears in 66 of 100 popular 2026 Show HN threads, an upper bound; the phrase "AI slop" counts 385 in 2024, 3,215 in 2025 and 7,262 in 2026 YTD (failure-corpus.md, via [HN Algolia API](https://hn.algolia.com/api)). |

### Discoverability

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| head-metadata-set | Which canonical, description, sitemap, robots and Open Graph tags must every built page emit? | uncovered | P1 | Fleet: 3 of 7 Astro sites set `site:`; 1 of 7 has robots.txt (seo-geo.md); og:image on 0 of 298 ocx.sh pages; index.grimoire.rs has no canonical (distribution-posture.md smells 1, 5). Teams: [Google canonical docs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls); [ogp.me](https://ogp.me/). |
| description-presence | Must every published page carry a meta description, and must the home page's say what the product is? | partial (no docs-quality row requires one) | P1 (presence inside seo-head-metadata-set; home text inside positioning-canonical-sentence) | Fleet: 4 of 10 docs sites have 0 page descriptions (catalog, rules_ocx, ocx-mirror, indexbot) and indexer has 1 of 23 (messaging-inventory.md §5, smell 9). The live lore.ocx.sh description is "OCX lore, a Grimoire package index.", 35 characters that name no contents (smell 8). Teams: the description is both the result snippet and the share text. |
| description-length-wording | Is there a length band or formula for titles and descriptions? | partial (DOC-OBS) | P3 | Teams: Google states no length limit ([snippet docs](https://developers.google.com/search/docs/appearance/snippet)); seo-geo #17. No source supports a band, so no rule. |
| robots-sitemap | Must robots.txt name every sitemap? | uncovered | P1 (inside seo-head-metadata-set) | Fleet: ocx.sh robots.txt reaches 4 of 298 URLs (distribution-posture.md smell 5). Teams: [robots spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec). |
| share-card | Must a page that declares a large-image card carry a working absolute og:image? | uncovered | P1 (inside seo-head-metadata-set; per-platform dimensions hand-off: channels) | Fleet: ocx.sh declares `summary_large_image` on 128 pages with no image; grimoire has a card on 48 of 48 pages at 1280x640 (distribution-posture.md smell 1). |
| ai-crawler-policy | Which AI crawler tokens to allow or block, and where is the policy written down? | uncovered | P1 | Fleet: the live grimoire.rs robots.txt is a Cloudflare-managed file that blocks 31 agents and sets Content-Signal `ai-train=no`, and it differs from the repo file (distribution-posture.md smell 6). Teams: [OpenAI bots](https://platform.openai.com/docs/bots); [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler); [Perplexity bots](https://docs.perplexity.ai/guides/bots); [Cloudflare Content Signals](https://blog.cloudflare.com/content-signals-policy/). |
| llms-txt-purpose | What is llms.txt for, if search ignores it? | covered (DOC-AGENT-04 makes it optional); the marketing angle is partial | P1 (inside seo-ai-crawler-policy) | Fleet: 0 of 7 sites have one; 17 of 25 exemplars do (seo-geo.md, exemplar-landing-pages.md smell 6). Teams: Google's [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (2026-05-15) says it is ignored; [Ahrefs llms.txt study](https://ahrefs.com/blog/llmstxt-study/), vendor data. |
| structured-data | Which structured data still pays? | uncovered | P1 (inside seo-retired-tactics-scaled-pages) | Fleet: 0 JSON-LD across 413 pages (distribution-posture.md smell 7). Teams: FAQ rich results ended 2026-05-07; SoftwareApplication needs a rating ([software-app](https://developers.google.com/search/docs/appearance/structured-data/software-app)). |
| geo-claims | Which "GEO/AEO" tactics have evidence, and which are retired? | uncovered | P1 (inside seo-retired-tactics-scaled-pages) | Teams: the [GEO paper](https://arxiv.org/abs/2311.09735) tested a GPT-3.5 engine only; Google says AI optimization is SEO (guide above); 50–83% of citations are gone the next day ([Ahrefs, vendor data](https://ahrefs.com/blog/how-stable-are-ai-citations/)). |
| scaled-pages | May the agent generate catalog or programmatic pages? | uncovered | P1 (inside seo-retired-tactics-scaled-pages) | Fleet: index.grimoire.rs and catalog generate a page per artifact. Teams: [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) on scaled content abuse. |
| initial-html-content | Must pricing and docs be readable without JavaScript? | uncovered | P2 | Fleet: Astro renders static HTML, so the risk is low. Teams: practitioner #1; [JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). |
| content-decay | Must pages carry update dates and a refresh cadence? | uncovered | P2 | Teams: practitioner #24–25; codified-law-policy #31. |
| indexnow | Should sites ping IndexNow? | uncovered | P3 | Teams: Bing and Yandex only ([indexnow.org](https://www.indexnow.org/documentation)). |
| soft-404-links | Crawlable links and soft 404s | uncovered | P3 | Teams: seo-geo #12–13. |
| ai-traffic-claims | May copy or reports claim an "AI search" traffic share? | partial (DOC-AGENT-05) | P1 (inside measure-metric-validity) | Teams: AI referrals are 0.12–0.73% of traffic ([Ahrefs, vendor data](https://ahrefs.com/blog/ai-traffic-study/)). |

### Release and owned communication

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| release-body-contract | How do generated release notes become a readable announcement? | partial (DOC-TYPE-37..41 covers the CHANGELOG file, not the release body) | P1 | Fleet: ocx has 45 BREAKING bullets and 0 Migration lines; 7 of 10 indexbot bodies are only a compare link; 26 ocx bullets use internal scopes (distribution-posture.md smell 2); the median body is 595 characters, against 3,166 upstream (exemplar-readmes.md). |
| release-hash-words | May a release body carry bare commit hashes as content? | uncovered | P1 (inside release-body-contract) | Fleet: 9 of 10 www-setup release bodies carry 2 to 26 hash-shaped words each (distribution-posture.md smell 8; command at its line 84). Teams: a hash tells a reader nothing a link would not. |
| release-note-model | Which of the three conflicting release-note models wins? | partial | P1 (inside release-body-contract) | Fleet: grimoire curates "problem, capability, example, link"; ocx `AGENTS.md:33` makes the commit subject the entry; vscode forbids hand edits (config-inventory.md). |
| release-coverage | Must every tag have a release? | uncovered | P1 | Fleet: tags without releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2 (distribution-posture.md smell 8); only 9 of 18 repos publish releases (exemplar-readmes.md). |
| deprecation-notice | How are deprecations and breaking changes announced, and over what window? | uncovered | P1 | Teams: [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html), RFC 9745; [Kubernetes deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/). |
| licence-change-notice | How is a licence change announced? | uncovered | P1 (inside release-deprecation-breaking) | Teams: [HashiCorp BSL](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license); [Percona](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/): 9 of 24 contributors left. |
| release-mechanics | release.yml categories, the Latest flag, immutable releases | uncovered | hand-off: channels | Owner: `channel-github-as-channel.md` #12–15. |
| announcement-order | In what order do the release, docs, feed and post go out? | uncovered | hand-off: channels | Ordering across venues is channel sequencing (lifecycle-email.md #34). |
| pricing-change-notice | How is a pricing change announced? | uncovered | P3 | Fleet: no prices. Teams: [Cursor 2025](https://cursor.com/blog/june-2025-pricing). |
| security-advisory-comms | How are security advisories announced? | partial | P3 | Teams: [GitHub advisories](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/about-repository-security-advisories); lifecycle-email #31–32. |
| machine-feeds | Must releases be published as machine-readable feeds? | uncovered | P3 | Teams: lifecycle-email #40. |
| changelog-format | Keep a Changelog or Common Changelog? | covered (DOC-TYPE-37..41) | n/a | [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Common Changelog](https://common-changelog.org/). |

### Email

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| sender-auth | Which SPF, DKIM, DMARC and RFC 8058 one-click settings are required? | uncovered | P3 | Fleet: no email is sent (lifecycle-email.md). Teams: [Gmail sender guidelines](https://support.google.com/a/answer/81126); [Yahoo](https://senders.yahooinc.com/best-practices/); [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058). |
| consent-lists | Where may a list come from, and is git-harvesting allowed? | uncovered | P2 | Fleet: an agent could harvest commit emails. Teams: [CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business); [PECR reg 22](https://www.legislation.gov.uk/uksi/2003/2426/regulation/22); [UWG §7](https://www.gesetze-im-internet.de/uwg_2004/__7.html). |
| email-rendering | Preheader, 102 KB clipping, dark mode, accessibility | uncovered | P3 | Teams: [Litmus](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers); [caniemail](https://www.caniemail.com/). |
| open-rate-validity | Are open rates still meaningful? | uncovered | P3 | Teams: Apple Mail Privacy Protection inflates opens (lifecycle-email #15). |
| onboarding-sequence | What onboarding email sequence? | uncovered | P3 | Fleet: no sign-up. |

### Measurement and attribution

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| consent-free-analytics | What may be measured without consent, and with which configuration? | uncovered | P1 | Fleet: 0 analytics across 413 pages, by documented choice (grimoire `privacy.html`, distribution-posture.md smell 3). Teams: [CNIL sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications); [EDPB 2/2023](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en); [Plausible](https://plausible.io/data-policy); [PostHog](https://posthog.com/docs/privacy/data-collection); [Matomo](https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/). |
| privacy-statement-match | Must the privacy statement match the script inventory? | uncovered | P1 (inside measure-consent-free-config) | Fleet: distribution-posture.md pattern 7. |
| utm-convention | What UTM convention, and none on internal links? | uncovered | P1 | Fleet: one UTM reference, in a test file (analytics-attribution.md). Teams: [GA4 UTM docs](https://support.google.com/analytics/answer/10596866); UTM values are case sensitive. |
| self-reported-attribution | Must there be a "how did you hear about us" (HDYHAU) field? | uncovered | P1 (inside measure-attribution-tagging) | Teams: analytics-attribution #15. |
| metric-validity | What may a report or a page claim from stars, downloads, traffic or A/B tests? | uncovered | P1 | Teams: the [star API](https://docs.github.com/en/rest/activity/starring) became restricted in 2026-07; the [traffic API](https://docs.github.com/en/rest/metrics/traffic) keeps 14 days; [Evan Miller on peeking](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) (5% becomes 26.1%). |
| cli-activation | How is CLI activation measured without telemetry? | uncovered | P2 | Fleet: the CLI is the primary surface (cli-first-run.md). Teams: [Lenny on activation](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate) (dated 2020–2023). |
| omtm | One metric that matters per stage | uncovered | P3 | Teams: canonical-guides #29. |
| ai-citation-tracking | Should AI-answer citations be tracked, and over what window? | uncovered | P2 | Teams: recent-shifts citation reporting windows; [Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way). |
| dashboard-spec | What does each dashboard tile need (definition, window, source)? | uncovered | P3 | Teams: analytics-attribution #31. The record schema chosen this wave covers the fields. |

### Pricing and packaging

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| open-core-boundary | Where is the free/paid line, and how is it worded? | uncovered | P2 | Fleet: no paid tier. Teams: pricing-plg #31; developer-marketing #27. |
| pricing-model | Hybrid, credit or seat pricing? | uncovered | P3 | Teams: [Poyar 2026](https://growthunhinged.com/p/the-state-of-b2b-monetization-in-2026) (vendor survey): hybrid 37%, credits 29%. |
| credit-disclosure | How are credits and surprise bills disclosed? | uncovered | P3 | Teams: pricing-plg #12–13. |
| stripe-mechanics | How are price changes and tax behaviour handled in Stripe? | uncovered | P3 | Teams: [Stripe change-price](https://docs.stripe.com/billing/subscriptions/change-price); [tax_behavior](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior). |
| cancel-law | Which cancellation and withdrawal laws apply? | uncovered | P3 | Teams: [§312k BGB](https://www.gesetze-im-internet.de/bgb/__312k.html); the scouts report an Art. 11a withdrawal button from 2026-06-19 and the US click-to-cancel rule vacated 2025-07-08 ([negative option rule](https://www.ftc.gov/legal-library/browse/rules/negative-option-rule)). Re-fetch before any use. |
| plg-benchmarks | Which free-to-paid benchmarks may be cited? | uncovered | P3 | Teams: [Lenny free-to-paid](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion) (dated). |

### Brand, voice and assets

| slug | question | coverage | priority | why (this fleet / teams in general) |
|---|---|---|---|---|
| voice-encoding | How is a voice guide encoded so an agent can apply it (banned words with exceptions, error tone)? | partial (DOC-PLAIN-12) | P1 | Fleet: the catalog has 0 tone-of-voice guidance (config-inventory.md). Teams: [Mailchimp](https://styleguide.mailchimp.com/voice-and-tone/), [Atlassian](https://atlassian.design/foundations/content/voice-tone), [Monzo](https://monzo.com/tone-of-voice/), [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/). |
| ai-content-disclosure | When must AI-generated content be disclosed? | uncovered | P1 | Teams: EU AI Act Art. 50 applies from 2026-08-02 ([regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)); [Code of Practice](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content) (2026-06-10); the scout reports a transition to 2026-12-02 for systems already on the market (codified-law-policy.md #13). |
| no-detector-gates | May an AI-text detector gate copy? | uncovered | P1 (inside voice-ai-tells-baseline) | Teams: detectors are unreliable ([arXiv 2303.11156](https://arxiv.org/abs/2303.11156), [arXiv 2304.02819](https://arxiv.org/abs/2304.02819)). |
| message-hierarchy | Must the README first line and og:description agree? | uncovered | P1 (inside positioning-canonical-sentence) | Teams: brand-voice-assets #30. |
| distinctive-assets | Are distinctive assets used identically everywhere? | uncovered | P3 | Teams: canonical-guides #20. |
| demo-format | VHS, agg or cast; size limits | partial (DOC-EX-11..16 cover recording and players) | P2 | Fleet: 35 `.cast` files totalling 417,597 B; 0 GIF, MP4 or tape files (brand-voice-assets.md). Teams: [VHS](https://github.com/charmbracelet/vhs), [agg](https://docs.asciinema.org/manual/agg/). |
| motion-captions | GIF pause control and demo captions | uncovered | hand-off: ux | Teams: WCAG 2.2.2 and 1.2.2. |
| alt-text-screens | Alt text for screenshots; no images of terminal output | partial (docs) | P3 | Teams: [Google style, images](https://developers.google.com/style/images). |
| naming-screens | Which name collision checks run before a product is named? | uncovered | P2 | Fleet: the crates.io names `grim` and `grimoire` are held by other projects (distribution-posture.md smell 9). Teams: [npm disputes](https://docs.npmjs.com/policies/disputes), [PEP 541](https://peps.python.org/pep-0541/), [Cargo publishing](https://doc.rust-lang.org/cargo/reference/publishing.html). |
| favicons-lightdark | Favicons and README light/dark images | uncovered | P3 | Teams: [GitHub theme images](https://github.blog/changelog/2022-05-19-specify-theme-context-for-images-in-markdown-beta/). |

### Research methods

| slug | question | coverage | priority | why |
|---|---|---|---|---|
| mom-test-scripts | How should customer interviews be run? | uncovered | P3 | Human work; no rule can check it (canonical-guides #26–27). |
| message-test | Wynter-style message tests | uncovered | P3 | Vendor method; costs money; practitioner #12–13. |
| cheap-channel-test | A cheap channel test before investing | uncovered | P3 | Channels territory overlap; canonical-guides #30. |
| 95-5-rule | Does the 95:5 rule justify brand spend? | uncovered | P3 | Contested ([IPA B2B principles](https://ipa.co.uk/effworks/marketing-marketing-v2/five-principles-of-growth-in-b2b-marketing/)); no spend in the fleet. |

### Cross-territory pointers

Each pointer is one line and is left to its owner.

**channels**:

- Show HN and Product Hunt (practitioner #17–18).
- AI disclosure in community posts (developer-marketing #28).
- Platform metric definitions (analytics-attribution #19–22).
- The YouTube @ocx-sh Shorts (exemplar-youtube-channels.md).
- Automated posting (failure-corpus.md).
- GitHub About topics, homepage and social preview, and package-manifest discovery fields (`channel-github-as-channel.md` #1–3, #9–10). Marketing keeps only the About description string, inside the canonical-sentence drift check.
- README rendering across registries and above-the-fold mechanics (`channel-github-as-channel.md` #4–8).
- GitHub Release mechanics: release.yml categories, the Latest flag, immutability (`channel-github-as-channel.md` #12–15).
- Fake stars, star-for-star and GitHub acceptable use (`channel-github-as-channel.md` #23–25).
- Share-image dimensions per platform (LinkedIn, Meta, X, GitHub). Marketing requires an image that exists; channels states the size.
- Announcement order across release, docs, feed and posts (lifecycle-email #34).

**ux**:

- CLI first-run (cli-first-run.md).
- WCAG motion and caption checks.
- Forms on sign-up and pricing pages.
- The ocx-theme skills (config-inventory.md smell 1).
- One `<h1>` per built page: grimoire.rs renders 2 (exemplar-landing-pages.md smell 3).
- The nav advertises pages that do not exist: 8 of 17 shared nav entries are `planned: true` (site-shape.md smell 10, `nav.json`).

**docs-quality** (an existing artifact, not a sibling):

- If page-surface-scope concludes that a docs home owes a canonical sentence, the change lands as a request against DOC-TYPE-10 and DOC-TYPE-13, not as a marketing row.

## Selected for this wave

Selection order, per wave-plan Phase 3:

1. Uncovered first.
2. Then leverage for adopters.
3. Then areas where agents demonstrably get it wrong.
4. Then whether a rule or skill step could check the result.

Seven topics, 21 dives. All seven are uncovered or only partly covered in the catalog, and each decides how an agent writes or ships a surface the fleet already publishes. The first map's proof topic is folded into claims, and its offer-terms and repo-card dives are cut (see "Critic responses").

### Two shared contracts

Several dives touch the same two objects. Each object has one owner, and the other dives reference it.

**The evidence record.** Owner: claims-evidence-record. It fixes the storage location and the lint. The other dives use these fields and add none of their own without a stated reason:

| field | meaning |
|---|---|
| claim | the verbatim claim text |
| surface | file:line or URL where it appears |
| class | performance, statistic, count, price-or-limit, comparison, licence, security, ai-capability, endorsement or maturity |
| value, unit | for a number-bearing claim |
| source | URL or repository path |
| source_type | own-measurement, vendor-data, third-party-study, primary-law or platform-doc |
| method | the command or method link; required for own-measurement |
| observed | the date the fact was measured or fetched |
| refresh_by | the date it must be re-checked |
| definition, window | for a metric; filled per metric by measure-metric-validity |
| subject_version | for a comparison; filled by positioning-alternatives-comparison |

**The law protocol.** Every brief that names a law, a regulation or a platform policy carries the same two-line clause. A worker fetches each provision from its primary URL and records the fetch date, the in-force or commencement date and the provision number. A fact it cannot confirm from the primary text or an official government page is written "unverified, omitted" and gets no rule row. Every law row carries a refresh_by of six months from the fetch, or the next scheduled change if that comes first.

### 1. marketing-claims-evidence (MKT-CLAIM)

Question: Which claims may product copy make, and what evidence record must exist on disk before each class of claim ships?

#### claims-evidence-record

```
Question: Which words make a claim objective, and what evidence record must back a performance claim, a statistic, a count, a price or a limit before it ships?
Starts from: codified-law-policy.md #3 and #29; canonical-guides.md #17-18 and #33; practitioner.md #29, #33, #35; pricing-plg.md #1 (never invent prices, DECISION); messaging-inventory.md §2 and smell 2 (12 unquantified ocx claims, 0 with proof); exemplar-landing-pages.md pattern 6 (2 of 25 link a method: bun, uv); failure-corpus.md "unreproducible benchmark".
Start from this record schema and change a field only with a stated reason: claim, surface, class (performance | statistic | count | price-or-limit | comparison | licence | security | ai-capability | endorsement | maturity), value, unit, source, source_type (own-measurement | vendor-data | third-party-study | primary-law | platform-doc), method, observed, refresh_by, definition, window, subject_version. Other dives reuse it, so you own its storage and lint.
Investigate:
1. FTC Policy Statement Regarding Advertising Substantiation (1984), https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation, and the FTC Policy Statement on Deception (1983), https://www.ftc.gov/legal-library/browse/ftc-policy-statement-deception. Extract the reasonable-basis and establishment-claim tests, and the puffery line.
2. EU Directive 2005/29/EC Art. 6-7 on EUR-Lex, for the misleading-action test in the EU.
3. Benchmark method fields on the bun and uv benchmark pages, and the SPEC run and reporting rules (https://www.spec.org/). Record hardware, version, command, date and raw-data fields.
4. The fleet's only dated record: ocx-sh/website/site/src/components/landing-content.ts:3-18 and its test landing.test.ts. Decide whether that data-file pattern generalises.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- Re-run the messaging-inventory.md adjective grep and the codified-law-policy.md claim grep over ocx-sh/ and grimoire-rs/. Split product-surface lines from rule-text lines.
- Classify each product hit as objective, puffery or mechanism, by a rubric written before scoring. Record the command and the counts.
- Count number-bearing claims on headline surfaces that carry a source and a date beside them.
Ownership: DOC-PLAIN-12 keeps word choice, DOC-TYPE-15 keeps adoption-claim links, DOC-OBS-08 keeps docs metrics. Reference them; do not restate them.
The deliverable must decide: the objective-claim test as a word and pattern list; where the record lives (a data file beside the copy, or an inline comment); the required fields per class; the default refresh_by per class; that an agent never writes a price, limit, plan name or count with no record (block, not warn); and the grep the rule runs.
```

#### claims-licence-openness

```
Question: When may copy say "open source", "free" or "source-available", and what must agree with the LICENSE file?
Starts from: codified-law-policy.md #1 (177 files say "open source"; 15 LICENSE files, 14 Apache); pricing-plg.md #3-5; failure-corpus.md "licence-change announcements".
Investigate:
1. The OSI Open Source Definition and the OSI trademark guidelines: https://opensource.org/osd and https://opensource.org/trademark-guidelines. Record the version and date shown on each page.
2. The OSAID, for "open-source AI" wording: https://opensource.org/ai/open-source-ai-definition.
3. The SPDX licence list JSON (https://spdx.org/licenses/licenses.json). Use its isOsiApproved and isDeprecatedLicenseId fields; do not hand-maintain a list.
4. Wording failures around licence changes: HashiCorp BSL (2023), Elastic's return to an OSI licence (2024), and the Percona contributor study. All are linked in the scouts.
Measure, not cite:
- For each of the 17 fleet repos, read the LICENSE SPDX id and the Cargo.toml, package.json or pyproject.toml licence field. Note any disagreement between the two.
- Diff those against every "open source", "free" and "source-available" hit in that repo's README and site sources.
- Record the command and each mismatch with file:line.
Out of scope: how a licence change is announced (release-deprecation-breaking owns it).
The deliverable must decide: a mapping from licence class to the wording allowed; the check that compares the SPDX id with the claim words; whether "free" needs a qualifier (free of charge vs libre); and which evidence-record class (licence) fields apply.
```

#### claims-ai-security-compliance

```
Question: What may copy claim about AI capability, security or compliance, and which claim classes need a named human sign-off before they ship?
Starts from: codified-law-policy.md #4, #30 and #32; services-b2b.md #22-24; developer-marketing.md #2 and #14 (Stack Overflow 2025: security and privacy are the first rejection reasons).
Investigate:
1. FTC Operation AI Comply (2024-09) and the DoNotPay and Workado orders (98% claimed, 53% measured). Fetch the press releases and the orders linked in codified-law-policy.md.
2. The AICPA SOC suite page: why SOC 2 is an attestation, not a certification. ISO/IEC 17021-1 on who may certify (the ISO catalogue page; record only what the page states).
3. Regulation (EU) 2024/1689 (the AI Act) on EUR-Lex, https://eur-lex.europa.eu/eli/reg/2024/1689/oj: does it regulate capability claims in marketing, or only Art. 50 transparency? Answer from the text, not summaries.
4. Two exemplar security or trust pages (for example Tailscale and 1Password) and their /.well-known/security.txt (RFC 9116). Record the fields, not the slogans.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- Grep fleet READMEs, landing sources and package descriptions for secure, safe, verified, signed, compliant, certified, accurate and AI-powered. Record the command.
- Classify each hit as mechanism ("pinned by digest") or outcome ("secure"), by a rubric written before scoring.
Use the evidence record from claims-evidence-record (classes security and ai-capability); add no new record.
The deliverable must decide: which claim classes are banned unless an evidence record links the proof; which need a named human sign-off (the advertiser carries liability, codified-law-policy.md #32); and the mechanism-over-outcome rewrite pattern, with two fleet examples.
```

#### claims-endorsements-proof

```
Question: Which testimonial, review, quote, customer logo, case study or badge may an agent place on a page, what must back it, and how are AI-generated endorsements and material connections handled?
Starts from: codified-law-policy.md #5 and #7; services-b2b.md #1-10, #20, #26; landing-conversion.md #13-15 and #21-22; developer-marketing.md #40-41; site-shape.md smell 3 (no proof on either fleet landing); exemplar-landing-pages.md smell 4 (16 of 25 exemplars have a proof section).
This dive owns AI-generated testimonials, AI avatars and personas in endorsements. voice-ai-disclosure owns AI Act labelling and does not cover endorsements.
Investigate:
1. 16 CFR Part 465 at eCFR (https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465) and its 2024-08-22 Federal Register notice: fake, AI-generated and insider reviews and testimonials.
2. 16 CFR Part 255 (Endorsement Guides) at eCFR, the FTC "What people are asking" FAQ and Disclosures 101: material connection, virtual influencers, placement of the disclosure.
3. EU Directive 2005/29/EC Annex I points 23b and 23c as inserted by Directive 2019/2161, on EUR-Lex.
4. The G2 community guidelines (incentive cap; AI-drafting rules dated 2026-11-04 by the scout) and the Clutch methodology, only for what a page may quote from them.
5. Logo and badge terms: the AICPA SOC logo terms, and the brand-guideline pages of two companies that appear as customer logos on exemplar sites.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Corpus: ~/.cache/research-lang/exemplars/product/ was absent on 2026-11-27. Rebuild the 25 landing pages from the corpus list and scripts in product-audit/exemplar-landing-pages.md first.
Measure, not cite:
- On the 25 landing exemplars: count testimonial, quote, logo, case-study and badge sections, and how many name a person and role, show a date and link a source.
- Field coverage across at least 12 exemplar case studies (customer, problem, before metric, after metric, date, quote owner, link), as a presence table.
The deliverable must decide: the endorsement source-file contract (who, role, where said, date, permission record, connection), as evidence-record class endorsement; the ban on any quote, logo or badge with no source entry; the material-connection disclosure wording and placement; what a story with no before/after metric is called (story, not proof); and whether OSS adopters may be named, and with what consent record.
```

### 2. marketing-positioning-record (MKT-POS)

Question: What single positioning record must exist before copy is written, and how does an agent detect when a surface has drifted from it?

#### positioning-brief-fields

```
Question: Which fields make a positioning brief an agent can apply, where does the one brief live, and when must it be reviewed?
Starts from: canonical-guides.md #1-3, #6-7, #11-12, #25 and #31; config-inventory.md smell 4 (product-context.md in 6 variants, path-scoped to website/** and .agents/**; the only "do not say" list sits in a spec no session loads); messaging-inventory.md smell 3 (audience named in 1 of 17 repos).
Investigate:
1. Dunford's components (alternatives, attributes, value, market category, relevant trends), from her own site and published worksheets.
2. Moore's 7-slot positioning statement, Schwartz's awareness and sophistication stages, and JTBD four forces. Use primary texts or the authors' own pages; mark any secondary summary as such.
3. Fletch's ICP and positioning newsletters, linked in canonical-guides.md.
4. Read all 6 fleet product-context.md variants and the design_brief_landing_page.md:101-118 "do not say" list. Tabulate their fields against the canon.
Measure, not cite:
- For each fleet brief variant: which canon fields are present, its date, its path scope.
- Whether each loads for a README edit. Grep the frontmatter paths and record the command.
- How many fleet repos could fill an audience field today from an existing sentence (start from messaging-inventory.md §6).
The deliverable must decide: the brief's required fields (audience, named alternative, category noun, canonical sentence, object noun and enumerated lists, "do not say" list, review_by); its single file path per product; how rules and skills load it, including on README edits; and what an agent does when no brief exists (stop and invoke positioning-brief, or write a draft marked unreviewed).
```

#### positioning-canonical-sentence

```
Question: Must one canonical sentence, one category noun, one object noun and one source for every enumerated list be reused verbatim across a product's surfaces, and what check catches drift?
This dive owns the drift check for every surface below. It does not own the other GitHub About fields (topics, homepage, social preview), which belong to channels.
Surfaces: README line 1 and tagline; GitHub About description; Cargo.toml, package.json or pyproject.toml description; the home page <title>, meta description and og:description; the docs-home lead sentence.
Starts from: messaging-inventory.md §1-5 and smells 1, 4, 8 (61 distinct one-liners; ocx 11; Grimoire reuses its canonical sentence in 5 places; Grimoire's object is "AI-agent config", "AI artifacts" and "AI-config packages", with 4, 5 or 8 types listed; lore.ocx.sh describes itself in 35 characters that name no contents); exemplar-landing-pages.md smell 1 and pattern 7; brand-voice-assets.md #30.
Investigate:
1. Message-house and messaging-hierarchy practice from primary practitioner sources (Fletch, Dunford, Wynter). Label them as practitioner sources.
2. How the fleet already single-sources copy: grimoire docs/src/data/landing.ts with landing_check.py, and ocx landing-content.ts with landing.test.ts (site-shape.md pattern 2).
3. How an enumerated list can be generated from one source: grimoire-rs/indexer/src/config.ts:187-190 and the vscode package.json:4 type list.
Corpus: ~/.cache/research-lang/exemplars/product/ was absent on 2026-11-27. Rebuild the landing corpus from product-audit/exemplar-landing-pages.md before measuring.
Measure, not cite:
- Exemplar agreement: for the 25 landing exemplars, does one category noun appear on README line 1, GitHub About, meta description and the hero <h1>? Script it; use `gh repo view --json description` for About.
- The same count for the 17 fleet repos, re-running the messaging-inventory.md commands.
- Per Grimoire surface: the object noun used and the number of listed types. Record the commands.
The deliverable must decide: which surfaces must match exactly and which may paraphrase while keeping the category noun; the source-of-truth file (the positioning brief or a data file it names); the rule for enumerated lists (generated from one source, or cut to a count plus a link); the minimum content of a home meta description (category noun plus what it acts on); and a drift check a rule or CI step can run, with its command.
```

#### positioning-alternatives-comparison

```
Question: How must copy name the alternative the reader uses today, say when not to use the product, and keep a comparison fair and dated?
Starts from: developer-marketing.md #1 and #21-22; exemplar-readmes.md (a "why" or comparison heading in 11 of 40 upstream READMEs, 0 of 18 fleet); codified-law-policy.md #23-24; messaging-inventory.md §2 and smell 10 (the ocx "drift" table at landing-content.ts:14-18 is the only dated, sourced comparison; Grimoire names no alternative).
Investigate:
1. Comparative advertising law: Directive 2006/114/EC Art. 4 on EUR-Lex; the FTC Statement of Policy Regarding Comparative Advertising (1979) at ftc.gov.
2. Exemplar "vs", "alternatives" and "when not to use" pages: uv, Bun, Deno and Ruff docs. Record whether each comparison is dated, names competitor versions and links a method.
3. Stack Overflow Developer Survey 2025 (and 2026 if published) on reasons to reject a tool.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- For each upstream exemplar comparison: date shown (yes or no), versions named, method linked.
- How many are older than 12 months at fetch time.
- Rebuild the exemplar-readmes corpus first if ~/.cache/research-lang/exemplars/product/exemplar-readmes is absent; it was absent on 2026-11-27.
Use the evidence record from claims-evidence-record with class comparison; you own the subject_version field and nothing else.
The deliverable must decide: the comparison row fields; the "when not to use" requirement and where it sits (README, docs, landing); the staleness window after which a comparison is pulled or re-run; and whether naming an alternative is required on a README or only on a comparison page.
```

### 3. marketing-first-screen-copy (MKT-PAGE)

Question: Which pages are pitch surfaces that marketing copy rules govern, and what must their first screen say beyond what docs-quality already enforces?

#### page-surface-scope

```
Question: How does a rule tell a pitch page from a docs hub, and what does a product's docs home owe marketing when the product has no pitch page?
Starts from: site-shape.md smell 1 (8 of 10 docs sites open on a docs page with no positioning, proof or single CTA) and §6 (11 pages across 6 sites declare doc_type: landing; 2 are pitches); exemplar-landing-pages.md smell 9 (doc hubs carry doc_type: landing, so a landing-page rule keyed to that tag fires on task routers); messaging-inventory.md §5 (description coverage per site).
Investigate:
1. Read rules/docs-quality.md and skills/docs-quality-reference/page-types.md in full. List what DOC-TYPE-10..15 already require of a doc_type: landing page, and what DOC-TYPE-32..36 require of a README.
2. Read skills/docs-quality-reference/checks/doc_declaration.py and landing_check.py: how the doc_type enum is parsed and extended, and what it would cost to add a value or a second key.
3. Read all 11 landing-tagged fleet pages. Classify each as pitch, docs hub or snippet, by a rubric written before reading.
4. On 6 exemplars that have both a pitch page and a docs home (for example uv, Bun, Deno), record what the docs home's first sentence says and whether it repeats the pitch's category noun.
Measure, not cite:
- The classification table with file paths and the rubric.
- Per fleet docs home: does its first sentence carry the product's category noun? Record the command.
The deliverable must decide: the scoping key for the marketing-copy rule (a new doc_type value, a separate declaration comment, or a path list), with the rule that it never fires on doc_type: landing alone; what a docs home owes marketing (for example the canonical sentence in DOC-TYPE-10's one-sentence slot) and what stays with docs-quality; and whether that becomes a named change request against DOC-TYPE-10 or DOC-TYPE-13 rather than a marketing row.
Out of scope: the built <h1> count and page structure (ux); nav entries marked planned: true (ux).
```

#### page-hero-status

```
Question: What must a pitch-page hero and a README opening say (category or job, differentiator, audience, maturity status), and which failures can a review step flag?
Starts from: landing-conversion.md #1-5 and #23-24; exemplar-landing-pages.md (H1 median 6 words; subhead median 11, fleet 29 and 33; category in the H1 14 of 25) and smells 1 and 5; messaging-inventory.md smell 7 and pattern 5 (ocx "early development" only in a closing footnote; the grimoire hero is silent on 1.0; grim-gui "skeleton"); developer-marketing.md #11 (status on the first screen).
Investigate:
1. Fletch's H1 guidance and the Stripe Atlas rule of one, linked in landing-conversion.md.
2. The Demand Curve above-the-fold playbook and Copyhackers formulas. These are practitioner sources: label them.
3. Unbounce and Baymard benchmarks. Label them vendor data, with sample and date.
4. docs-quality DOC-TYPE-10..15 and DOC-TYPE-32..36, so this dive adds only what they do not decide.
Corpus: ~/.cache/research-lang/exemplars/product/ was absent on 2026-11-27. Rebuild the landing and README corpora from product-audit/exemplar-landing-pages.md and product-audit/exemplar-readmes.md first.
Measure, not cite:
- Re-run the exemplar-landing-pages.md word counts on the rebuilt corpus.
- Score each H1 and subhead as category, outcome or audience, by a rubric written before scoring. Report the agreement between two independent passes.
- On the 40 upstream READMEs and 25 landings: count those that state maturity in the hero segment or the first 15 README lines, split by pre-1.0 and post-1.0 projects.
The deliverable must decide: the hero contract (fields, and a word band only where the corpus supports one); the maturity-status requirement, its wording as an evidence-record class maturity claim, and its placement; and which rubric failures a review step flags.
Out of scope: the built <h1> count (ux) and CTA counts (DOC-TYPE-12).
```

### 4. marketing-discoverability (MKT-SEO)

Question: Which crawl, index, share and answer-engine signals must every built site emit, and which AI-era search tactics are banned as retired or spam?

#### seo-head-metadata-set

```
Question: Which head tags, page descriptions, sitemap and robots facts must every built page emit, and how is the live site checked against the repository?
Starts from: seo-geo.md #1-3 and #17; distribution-posture.md smells 1 and 5 (og:image on 0 of 298 ocx.sh pages while 128 declare summary_large_image; robots.txt reaches 4 of 298 URLs; index.grimoire.rs has no canonical on 25 of 25 pages and a relative SVG og:image) and patterns 1-3; messaging-inventory.md §5 and smell 9 (4 of 10 docs sites have 0 page descriptions; indexer 1 of 23; og:type=article on the ocx.sh home).
Investigate:
1. Google Search Central: canonicalization, sitemaps, the robots spec, title links, snippets and site names. URLs are in seo-geo.md.
2. ogp.me, for required properties and URL form.
3. Astro `site:`, @astrojs/sitemap and Starlight head config, via Context7; the MkDocs `site_url` and `site_description` settings.
Platform share-image dimensions belong to channels. Require only that og:image is absolute https, returns 200 and is PNG or JPEG.
Measure, not cite:
- `curl -s` each fleet site's robots.txt, sitemap index and home head; diff robots.txt against the repository's public/robots.txt.
- Walk each built sitemap. Count pages missing canonical, description, og:image, or with a relative og:image. Reuse distribution-posture.md A8 crawl.py and record the command.
- Count source pages with no description per docs site, re-running the messaging-inventory.md §5 command.
The home page's description text belongs to positioning-canonical-sentence. This dive owns presence and form.
The deliverable must decide: the required head set per page; the absolute-URL rule; the description-presence rule and its source check (frontmatter or config); the sitemap-in-robots rule; and a post-deploy check that compares the live site with the repository (the CDN case).
```

#### seo-ai-crawler-policy

```
Question: Which AI crawler tokens should a project allow or block, where is the decision recorded, and what is llms.txt for if search ignores it?
Starts from: seo-geo.md #6-9 and #34; recent-shifts.md (llms.txt purpose; Google says do nothing extra); distribution-posture.md smell 6 (the Cloudflare-managed robots.txt blocks 31 agents with ai-train=no, recorded in no repository); exemplar-landing-pages.md smell 6 and pattern 8 (llms.txt on 17 of 25 exemplars; agent onboarding on 3).
Investigate:
1. Each vendor's crawler docs: OpenAI bots, the Anthropic crawler, Perplexity bots, and Google common crawlers (Google-Extended is a robots token, not a crawler). Separate search, training and user-fetch tokens. Record each page's date.
2. Cloudflare's Content Signals policy and its managed robots.txt; Cloudflare's report on Perplexity's undeclared crawlers.
3. llmstxt.org; Google's AI optimization guide (2026-05-15 per the scout) and its llms.txt note; the Ahrefs llms.txt study, labelled vendor data.
4. docs-quality DOC-AGENT-04, -05 and -08, so this dive does not restate "llms.txt optional".
Measure, not cite:
- Fetch the live robots.txt of the 25 landing exemplars (URLs in product-audit/exemplar-landing-pages.md).
- Tabulate which AI tokens each allows or blocks, and whether a search token is blocked by mistake.
- Record the command.
The deliverable must decide: a default policy split by token class; the repository file that records it; the live-versus-repository check; and whether llms.txt is framed as agent onboarding rather than SEO.
```

#### seo-retired-tactics-scaled-pages

```
Question: Which structured data and "GEO/AEO" tactics still have evidence, which are retired, and when do generated catalog pages become scaled content abuse?
Starts from: seo-geo.md #18-25, #31 and #35-37; recent-shifts.md retired-advice table; practitioner.md #3-8; distribution-posture.md smell 7 (0 JSON-LD across 413 pages).
Investigate:
1. Google structured-data docs: FAQ and HowTo changes, the FAQ rich-result end (2026-05-07 per the scout), SoftwareApplication requirements, and the structured-data policies. Record each page's last-updated date.
2. Google spam policies (scaled content abuse, site reputation abuse, and the back-button hijacking entry the scout dates 2026-04-13) and the guidance on generative-AI content.
3. The GEO paper (arXiv 2311.09735; KDD 2024; GPT-3.5 engine only) and follow-ups (arXiv 2509.08919, 2505.24801). Judge whether the effects hold on current engines.
4. Ahrefs citation-volatility and click-through studies, and Pew 2025-07-22. Label vendor data.
Measure, not cite:
- For index.grimoire.rs and the ocx catalog: count pages and unique words per page.
- Compute the share of near-duplicate template text (shingle similarity).
- Record the commands.
The deliverable must decide: which structured data types to emit, if any; a banned-tactic list with a source per entry; and a uniqueness floor or noindex rule for generated catalog pages.
```

### 5. marketing-release-announcements (MKT-REL)

Question: Release notes in this fleet are generated by git-cliff and cargo-dist. What contract on commit subjects, templates and release bodies turns them into announcements a user can act on, and how are breaking changes and deprecations announced?

#### release-body-contract

```
Question: What must a generated release body contain (summary sentence, user-facing scopes only, Migration under each BREAKING, docs link, no bare hashes), and which of the three fleet release-note models wins?
Starts from: distribution-posture.md smells 2 and 8 and patterns 4-5 (ocx 45 BREAKING, 0 Migration; 7 of 10 indexbot bodies are compare-link-only; 26 internal-scope bullets; 0 summary sentences; 0 docs links; 9 of 10 www-setup bodies carry 2 to 26 hash-shaped words, command at its line 84); exemplar-readmes.md (median body 3,166 characters upstream vs 595); config-inventory.md (three conflicting models); lifecycle-email.md #21-23 and #27-28.
Investigate:
1. git-cliff template and commit-parser docs, and the cargo-dist release-body hooks, via Context7. Find where hashes enter the www-setup bodies (template field or commit text).
2. Exemplar release bodies: 5 upstream CLIs with curated bodies (for example uv, ruff, deno) and the Linear and Vercel changelogs. Record the sections and whether hashes appear as text or as links.
3. docs-quality DOC-TYPE-37..41, so this dive owns the release body, not the CHANGELOG file format.
GitHub release mechanics (release.yml categories, the Latest flag, immutability) belong to channels. Do not decide them here.
Measure, not cite:
- `gh release view` over the last 10 releases of each fleet repo that publishes releases. Reuse distribution-posture.md A2-A4.
- Count: summary sentence present, BREAKING with Migration, internal scopes, docs link, hash-shaped words. Record the commands.
The deliverable must decide: the release-body sections; the commit-subject rules that feed them; the cliff.toml template changes; the ban on compare-link-only bodies; the rule on hashes (link or drop); and which release-note model the fleet adopts.
```

#### release-deprecation-breaking

```
Question: How long is a deprecation window, where is it announced, and what must a breaking-change or licence-change notice contain?
Starts from: lifecycle-email.md #24-25 and #31-32; failure-corpus.md (licence-change announcements); pricing-plg.md #14.
Investigate:
1. RFC 8594 (Sunset header) and RFC 9745 (Deprecation header) at rfc-editor.org; the Kubernetes deprecation policy; SemVer 2.0.0 on deprecation; the GitHub REST API versioning policy.
2. Rust/Cargo and Python (PEP 387) deprecation policies as exemplars for a CLI or toolchain.
3. Licence-change announcements: HashiCorp 2023, Redis 2024, Elastic 2024 (back to an OSI licence). Record the timing, the FAQ shape and the community reaction (Percona data).
Measure, not cite:
- In the ocx and grimoire CHANGELOGs, count removals that had a prior deprecation entry, and the median number of releases between the two.
- Record the command.
The deliverable must decide: the default deprecation window for pre-1.0 and post-1.0 projects; the notice fields (what, why, replacement, date, migration link); where the notice must appear (release body, docs, CLI warning); and the licence-change notice shape.
```

#### release-coverage

```
Question: Which repository classes must publish a GitHub Release for every tag, and what check flags a tag with no release?
Starts from: distribution-posture.md smell 8 and pattern 6 (tags without releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2; grim-gui and grim-mirror publish nothing); exemplar-readmes.md (9 of 18 repos publish releases).
Investigate:
1. GitHub docs on releases and on linking to the latest release, only as far as coverage needs (mechanics belong to channels).
2. How 10 upstream projects treat non-product repos (templates, presets, internal tools): releases per tag, or tags only. Use the GitHub API.
3. Whether a repo that is not a product (conventions, catalog) needs releases at all, judged by who consumes its tags (Renovate, copier, install scripts).
Measure, not cite:
- `gh api repos/<r>/tags` against `gh api repos/<r>/releases` for all fleet repos. Reuse distribution-posture.md A7 and report the gaps.
- For each repo with gaps: who consumes its tags. Grep the fleet for references.
- Record the commands.
Cross-channel announcement order is channels territory. Do not decide it here.
The deliverable must decide: the repository classes that must release every tag; the classes exempt, with the reason; and the check that flags a tag without a release.
```

### 6. marketing-measurement (MKT-MEAS)

Question: Given the fleet's stance of "measure without cookies or do not measure", what may a project measure, how is attribution tagged, and what may a report or a page claim from the numbers?

#### measure-consent-free-config

```
Question: Which analytics configurations are lawful without a consent banner in the EU, UK and Germany, and must the privacy statement match the script inventory?
Starts from: analytics-attribution.md #1-6 and #13; distribution-posture.md smell 3 and pattern 7 (0 analytics across 413 pages; grimoire privacy.html says no cookies, no analytics, no third-party resources).
Investigate, each from its primary source:
1. CNIL sheet 16 and its exemption conditions: https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications.
2. EDPB Guidelines 2/2023 on Art. 5(3) ePrivacy, final adopted version, from edpb.europa.eu.
3. TDDDG §25, from gesetze-im-internet.de.
4. UK PECR regulation 6, https://www.legislation.gov.uk/uksi/2003/2426/regulation/6, and the Data (Use and Access) Act 2025 analytics exemption on legislation.gov.uk. Its commencement date must come from a commencement regulation on legislation.gov.uk.
5. The Digital Omnibus proposal, from Commission pages only. analytics-attribution.md left its status unverified.
6. Vendor configurations: Plausible and Fathom daily salt, PostHog cookieless_mode, Matomo without consent. These are vendor claims: label them.
Law protocol: record for each item the fetch date, the provision number and whether it is in force, commenced or proposed. Anything not confirmed from the primary page is written "unverified, omitted" and gets no rule row. Every law row carries refresh_by = fetch + 6 months, or the next scheduled change if sooner.
Measure, not cite:
- Run each candidate tool in its cookieless mode locally; record requests and storage writes with a Playwright HAR.
- Check each against the CNIL conditions.
The deliverable must decide: the allowed tools and configurations per jurisdiction that passed the law protocol; the privacy-statement match check; and what "unique visitors" may mean under a daily salt.
```

#### measure-attribution-tagging

```
Question: What UTM convention applies, where are UTMs banned, and is a self-reported "how did you hear about us" (HDYHAU) field required?
Starts from: analytics-attribution.md #9-10 and #15; canonical-guides.md #13 (keying); recent-shifts.md (Safari 26 parameter stripping, unresolved).
Investigate:
1. GA4 docs on UTM parameters, case sensitivity, default channel grouping and attribution models. URLs are in analytics-attribution.md.
2. WebKit's Safari 26 notes on link tracking protection: which parameters are stripped, and in which modes. https://webkit.org/blog/17333/webkit-features-in-safari-26-0/. Record what the page states, and nothing beyond it.
3. Self-reported attribution in practitioner sources (Growth Unhinged and others). Note bias and response rates, labelled by source type.
4. Hopkins-style keyed offers, as the pre-digital method.
Measure, not cite:
- Grep fleet sites and READMEs for links with tracking parameters, and for internal links carrying UTMs.
- Record the command.
The deliverable must decide: the UTM vocabulary (lower-case source, medium and campaign values); the internal-link ban; and whether attribution uses UTMs, HDYHAU or both, given the fleet has no sign-up form today.
```

#### measure-metric-validity

```
Question: What may a report, dashboard or page claim from stars, downloads, traffic, AI citations and A/B tests, which definition and window must travel with each number, and in what form may a count appear on a page?
This dive owns metric semantics and the page display rule for popularity counts. Fake stars and GitHub acceptable use belong to channels.
Starts from: analytics-attribution.md #18, #23-28 and #31; recent-shifts.md (citation windows; metric definition dates); practitioner.md #4-8; codified-law-policy.md #6; distribution-posture.md (ocx 20 stars, grimoire 17); docs-quality DOC-TYPE-15 (adoption claims need a source link) and DOC-OBS-08.
Investigate:
1. Evan Miller on sample size and peeking (5% becomes 26.1%); the Convert sample-size figure, labelled vendor data.
2. Download semantics from each registry's own docs: npm downloads API, PyPI (pypistats and the BigQuery dataset), crates.io. GitHub traffic API retention (14 days) and the stargazer API change the scout dates 2026-07.
3. AI-citation measurement: Ahrefs volatility and the Growth Unhinged method. Label vendor data.
4. Lean Analytics OMTM; how the PostHog handbook defines activation.
Measure, not cite:
- For ocx and grimoire: pull 14 days of GitHub traffic and the registry download counts.
- Show which share of downloads a CI-heavy package would see, from a registry that splits it, if any.
- Compute the sample size per variation for a 10% relative lift at the fleet's measured traffic.
- Record every command.
Use the evidence record from claims-evidence-record; you own the definition and window fields per metric. Do not invent a minimum count below which a number is hidden: no named source sets one.
The deliverable must decide: the definition and window per metric; which metrics may never be claimed as adoption; the page form for a count (live badge, or a dated number with its record); and when an A/B test is not worth running.
```

### 7. marketing-voice-ai-authorship (MKT-VOICE)

Question: How does an agent write copy in a project's voice that readers do not reject as AI slop, and when must AI involvement be disclosed?

#### voice-ai-tells-baseline

```
Question: Which observable style markers separate post-2023 agent-written copy from human-written copy of the same kind, at a false-positive rate low enough for a warning, given that detectors cannot gate?
Starts from: failure-corpus.md (an AI-authorship accusation in 66 of 100 popular 2026 Show HN threads, an upper bound; "AI slop" counts 385, 3,215 and 7,262 for 2024, 2025 and 2026 YTD); landing-conversion.md #35; brand-voice-assets.md #23-24; config-inventory.md smell 6 (2,378 grimoire and 670 ocx prose findings, warnings only).
Investigate:
1. Detector unreliability: arXiv 2303.11156 and 2304.02819, and any 2025-2026 follow-up on false positives for non-native writers.
2. Primary studies that publish LLM style markers with frequency data. Ignore blog lists that give no counts.
3. HN comments as reader-reported tells only. Use the failure-corpus.md method, and keep only comments that quote or describe the linked README or site copy. This is evidence about copy, not about the venue.
Measure, not cite (the core of this dive):
- Baseline corpus: clone into ~/.cache/research-lang/exemplars/product/ the 40 upstream repos from product-audit/exemplar-readmes.md. Extract each README at its last commit before 2022-11-30 and at HEAD. Exclude repos with no pre-2022 README.
- For each candidate marker (for example em-dash rate, "not X but Y", triads, the DOC-PLAIN-12 words), compute rate per 1,000 words in pre-2022 READMEs, HEAD READMEs and the 18 fleet READMEs.
- A marker qualifies only if its pre-2022 rate is low enough to bound false positives, and it is clearly higher in the fleet. State both thresholds before computing.
- Record every command.
Do not ship an "author-only fact per section" requirement as MUST or SHOULD. No named source tests it; it may appear only as CONSIDER, marked unverified: reading heuristic.
The deliverable must decide: the warning marker list with measured rates; the "never gate on a detector" rule; and which markers duplicate DOC-PLAIN rows and stay there.
```

#### voice-guide-encoding

```
Question: How is a voice and tone guide encoded so an agent applies it (banned words with exceptions, preferred terms, error tone), and who owns which word list?
Starts from: brand-voice-assets.md #20-22; config-inventory.md (0 tone-of-voice guidance in the catalog; docs-style says "No sales pitch or marketing open"; the DOC-PLAIN-12 superlative list); messaging-inventory.md pattern 8 (grimoire headline surfaces use 0 of the 20-adjective list).
Investigate:
1. The Mailchimp, Atlassian and Monzo voice guides and the GOV.UK A to Z. Record their structure: principles, word lists, examples, exceptions.
2. Vale rule formats (existence, substitution, exceptions) via Context7, as an encoding target. docs-quality keeps Vale at tier 1, optional; no marketing rule may rest on Vale alone.
3. docs-quality DOC-PLAIN-12 and the fleet docs-style files, to draw the line between the docs register and the marketing register.
Measure, not cite:
- Run skills/docs-quality-reference/checks/prose.py over the fleet README and landing source files.
- Classify the findings that fall on marketing surfaces against those on docs pages.
- Record the command.
The deliverable must decide: the encoding (a word table with exceptions in the reference skill, checkable by a tier-0 script); how docs-style's "no marketing open" coexists with pitch-page copy, using the scoping key from page-surface-scope; and which list docs-quality keeps.
```

#### voice-ai-disclosure

```
Question: When must AI-generated text, images or demo media on a marketing surface be disclosed, and in what form?
Endorsements, testimonials and AI avatars belong to claims-endorsements-proof. Do not decide them here.
Starts from: codified-law-policy.md #11-13 (the scout reports Art. 50 applying from 2026-08-02 and a transition to 2026-12-02 for systems already on the market); recent-shifts.md (Art. 50; C2PA metadata kept); brand-voice-assets.md #25-26; developer-marketing.md #40-41.
Investigate:
1. Regulation (EU) 2024/1689 Art. 50 on EUR-Lex, https://eur-lex.europa.eu/eli/reg/2024/1689/oj: deployer versus provider duties; "text published with the purpose of informing the public"; the human-review and editorial-responsibility exception.
2. The Commission Code of Practice on marking and labelling (2026-06-10 per the scout) and its FAQ, from digital-strategy.ec.europa.eu only.
3. C2PA content credentials (c2pa.org specification) and whether c2patool can write them into PNG and asciinema-derived media.
4. docs-quality DOC-PLAIN-08, -09 and -22, so this dive covers marketing surfaces only.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row. The transition date falls 5 days after this brief, so set refresh_by to the earliest date the Commission names for a change.
Measure, not cite:
- Check whether fleet images and demo casts carry any provenance metadata (exiftool, c2patool). Record the commands.
The deliverable must decide: which marketing artefacts need a disclosure; the wording and placement; whether human editorial review removes the duty for text; and how that interacts with DOC-PLAIN-08's ban on AI-authorship badges in docs.
```

## Deferred

Backlog, grouped. Each group names the reason it waits. Hand-offs to ux, channels and docs-quality are listed under "Cross-territory pointers" and are not counted here.

**Email and sender rules (MKT-MAIL). Waits until a fleet product sends email.**

1. sender-auth: SPF, DKIM, DMARC, RFC 8058, and the Gmail, Yahoo and Outlook thresholds.
2. consent-lists, including the ban on harvesting git commit emails. Cheap to fold into a rule later.
3. email-rendering: preheader, 102 KB clipping, dark mode.
4. open-rate-validity under Apple Mail Privacy Protection.
5. onboarding-sequence.

**Pricing and packaging (MKT-PRICE). Waits for a paid tier.** The fleet has no pricing page and no offer (pricing-plg.md). The one rule that applies today, never invent a price, limit or plan name, is carried by claims-evidence-record.

6. pricing-page-copy.
7. offer-terms-law: EU prior-price rule, tax-inclusive display, cancellation and withdrawal buttons. Each needs the law protocol when it is picked up.
8. open-core-boundary.
9. pricing-model (hybrid or credits).
10. credit-disclosure and surprise bills.
11. stripe-mechanics.
12. cancel-law in full.
13. plg-benchmarks.
14. pricing-change-notice.

**Services B2B (MKT-SVC). Waits for a services offering.**

15. service-page and buying group.
16. value pricing.
17. SoW structure.
18. specialisation (Enns, and Baker and Morgan, were not read).
19. webinar consent.
20. oss-support-claims and SLA wording.
21. review-platform-rules beyond what claims-endorsements-proof quotes.

**Brand assets (MKT-ASSET). Lower leverage than claims and positioning; DOC-EX covers recording mechanics.**

22. demo-format: VHS, agg or cast.
23. naming-screens: USPTO, npm, PEP 541, Cargo.
24. favicons and light/dark images.
25. distinctive-assets.
26. alt text for screenshots.
27. demo-shot on the first screen. It depends on demo-format and on channels' README rows.

**Positioning depth (MKT-POS wave 2). Needs the brief from this wave first.**

28. positioning-style choice.
29. awareness-stage per surface.
30. switching-forces copy.
31. voc-corpus sourcing. The fleet has no customer corpus yet.
32. trend-word in the hero.
33. multi-product page.

**Page and discoverability depth. Partly covered by docs-quality, or no source supports a rule.**

34. cta-count-labels beyond DOC-TYPE-12.
35. install-in-hero beyond DOC-TYPE-11 and DOC-TYPE-32..36.
36. reading level (vendor evidence only).
37. landing-element-order. No source prescribes an order.
38. initial-html-content. Astro renders static HTML, so the fleet risk is low.
39. description-length-wording. Google states no limit, so no band can be sourced. Description presence and home-page description content are selected.
40. content-decay cadence.
41. IndexNow.
42. soft-404s and crawlable links.

**Measurement depth. Waits until the fleet measures anything.**

43. cli-activation without telemetry.
44. OMTM.
45. dashboard tile spec. The evidence record covers its fields.
46. ai-citation-tracking tooling.

**Research methods. Human work; no rule can check it.**

47. Mom Test scripts.
48. Message tests.
49. Cheap channel test.
50. 95:5 and Binet and Field (contested).

**Release depth.**

51. security-advisory comms.
52. machine-readable feeds.

Deferred count: 52.

## Artifact set

This revises the frame's hypothesis (`product-frame.md`). The frame proposed:

- a `marketing-copy` rule plus reference skill
- `positioning-brief`
- `landing-page`
- `linkedin-post`
- `youtube-video`
- `launch-plan`

The audits move the marketing load from channels to claims, positioning, head metadata and generated release notes:

| artifact | kind | what loads it | owns |
|---|---|---|---|
| `marketing-copy` | rule | Paths: `**/README.md`, landing data files (`**/landing*.ts`, `**/landing-content.ts`, `**/components/Landing*.astro`, `**/pages/index.*`), site meta config (`**/astro.config.*`, `**/mkdocs.yml`), package description fields (`Cargo.toml`, `package.json`, `pyproject.toml`), and pages carrying the pitch-surface key that page-surface-scope decides. Never keyed on `doc_type: landing` alone. | Checkable rows from MKT-CLAIM, MKT-POS drift, MKT-PAGE hero and status, and the MKT-VOICE marker warnings. It references DOC-TYPE-10..15, DOC-TYPE-32..36, DOC-PLAIN-12 and DOC-TYPE-15 and does not restate them. |
| `marketing-copy-reference` | reference skill | Loaded on demand by `marketing-copy` and `marketing-review`; description triggers on "claim", "testimonial", "open source wording", "comparison", "pricing" | The evidence-record schema and its lint; law and policy facts, each with fetch date and refresh_by (FTC, EU, OSI); the voice word table with exceptions; the AI-tell marker table with measured rates. A `checks/` directory holds the tier-0 scripts: claim grep, canonical-sentence drift, record staleness. This mirrors `docs-quality-reference/checks/`. |
| `positioning-brief` | skill | Invoked by the user, or by `marketing-copy` when no positioning record exists | Writes the single positioning record (fields from MKT-POS). That record replaces the 6 `product-context.md` variants, and its path scope must include README edits. |
| `site-discoverability` | rule | Paths: `**/astro.config.*`, `**/mkdocs.yml`, `**/public/robots.txt`, `**/public/llms.txt`, `**/*Head*.astro`, `**/BaseLayout*.astro`, `**/_headers`, sitemap config | The MKT-SEO head set and description presence, robots, sitemap and AI-crawler policy, the banned-tactics list, generated-page uniqueness, and the privacy-statement-matches-scripts row from MKT-MEAS. Its verification includes a live-site check. |
| `release-announcement` | skill, plus rows in `marketing-copy` loaded by `**/cliff.toml`, `**/dist-workspace.toml`, `.github/release.yml` | Invoked at release time | The MKT-REL release-body contract, commit-subject rules, deprecation notice and release coverage. The CHANGELOG file format stays with docs-quality DOC-TYPE-37..41; release mechanics stay with channels. |
| `marketing-review` | skill (short checklist, not a tutorial) | Invoked by the user on a PR touching a marketing surface | Replaces the frame's `landing-page` tutorial skill. It runs the hero, status, claims, endorsements and drift checklist and the AI-marker pass, and leaves UX rows to `ux-review`. |
| `marketing-measurement` | skill | Invoked when someone proposes analytics, UTMs or a metrics report | The MKT-MEAS consent-free configurations, UTM vocabulary and metric definitions. No always-on rule, because the fleet runs no analytics. |
| `product-essentials` | bundle | Installed by the adopter | `marketing-copy`, `marketing-copy-reference`, `positioning-brief`, `site-discoverability`, `release-announcement`, `marketing-review`, `marketing-measurement`, plus the ux artifacts. The channel skills ship in a separate channels bundle. |

Moved out of this sub-program:

- `linkedin-post`, `youtube-video` and `launch-plan` go to channels.
- GitHub repository-card fields other than the description go to channels.
- `ux-quality` and `ux-review` stay with ux.

## Frame corrections

1. The "no marketing surface beyond READMEs" falsifier is half true. Only 2 true landings exist (ocx.sh and grimoire.rs), and 8 sites open on docs pages. The marketing surface is mostly READMEs, head metadata, package descriptions and release bodies, not landing pages. Sources: `product-audit/site-shape.md`, `product-audit/messaging-inventory.md`.
2. The channel skills in the frame (`linkedin-post`, `youtube-video`, `launch-plan`) have no adopted channel to serve. The fleet has a Discord with 5 members, 2 unlinked YouTube Shorts with 12 and 7 views, and 0 references to LinkedIn, PH or HN on fleet surfaces. They move to channels and drop out of the marketing artifact set. Sources: `product-audit/distribution-posture.md`, `product-audit/messaging-inventory.md`.
3. Release notes are generated (git-cliff, cargo-dist), so the lever is commit-subject quality and the template, not a writing skill. Three release-note models conflict across the fleet. Sources: `product-audit/distribution-posture.md`, `product-audit/config-inventory.md`.
4. Only 9 of 18 repos publish releases, and catalog, conventions and indexer have 16, 16 and 29 tags without releases. Release coverage is a gap of its own. Sources: `product-audit/exemplar-readmes.md`, `product-audit/distribution-posture.md`.
5. The measurement stance is "measure without cookies or do not measure", and 0 analytics run on 413 pages by documented choice. Any measurement artifact is a skill invoked on demand, not an always-on rule. Sources: `product-audit/distribution-posture.md`, `marketing-topic-map/analytics-attribution.md`.
6. Positioning guidance already exists but does not load where copy is written. The 6 `product-context.md` variants are path-scoped to `website/**` and `.agents/**`, and the only "do not say" list sits in a spec that loads nowhere. `positioning-brief` must consolidate these, not create a seventh. Source: `product-audit/config-inventory.md`.
7. A new `marketing-copy` rule collides with docs-quality (DOC-PLAIN-12, DOC-PLAIN-14, DOC-TYPE-10..15 and 32..36) and with docs-style ("No sales pitch or marketing open"). It must declare ownership and reference those rows, not restate them. Source: `product-audit/config-inventory.md`.
8. The `landing-page` skill should be a short checklist inside `marketing-review`, not a tutorial. Fleet pages are already at or past the exemplar median on most counts, and exemplars disagree on section order. Sources: `product-audit/exemplar-landing-pages.md`, `product-audit/site-shape.md`.
9. The audience is named in only 1 of 17 repos, and ocx carries 11 conflicting one-liners. The highest-leverage marketing artifact is the positioning record and its drift check, which the frame did not rank first. Source: `product-audit/messaging-inventory.md`.
10. Claims substantiation is missing from the frame and is the largest measured risk. The fleet has 193 speed or superlative lines, 177 "open source" mentions and 12 unquantified ocx claims with 0 proof. Sources: `marketing-topic-map/codified-law-policy.md`, `product-audit/messaging-inventory.md`.
11. The top observed objection in the developer audience is AI-authored copy (up to 66 of 100 popular Show HN threads), and the fleet's copy is agent-written. Voice and AI authorship is a first-wave topic, and detector gates are excluded. Source: `marketing-topic-map/failure-corpus.md`.
12. Agents are an audience: llms.txt appears on 17 of 25 exemplars. Its search value is nil (Google AI optimization guide, 2026-05-15), so it belongs under agent onboarding, not SEO. Sources: `product-audit/exemplar-landing-pages.md`, `marketing-topic-map/recent-shifts.md`, `marketing-topic-map/seo-geo.md`.
13. The live site can differ from the repository. The Cloudflare-managed robots.txt on grimoire.rs blocks 31 agents and is not the repository file. Discoverability checks must run against the deployed site, not only the source. Source: `product-audit/distribution-posture.md`.
14. The GitHub repository card matters, but it is channels ground. Repo search matches name, description and topics, and 14 of 17 fleet repos have no topics. Marketing keeps only the description string, as one surface of the canonical-sentence drift check. Sources: `marketing-topic-map/channel-github-as-channel.md` #1–3, `product-audit/messaging-inventory.md`.
15. The `youtube-video` skill is only partly checkable, and the channel has no traction. This confirms moving it to channels. Source: `product-audit/exemplar-youtube-channels.md`.
16. "Landing page" means two things in this catalog. docs-quality's `doc_type: landing` marks docs hubs, and 11 pages in 6 sites carry it, but only 2 are pitch pages. The frame's `landing-page` skill and the `marketing-copy` rule must key on a pitch-surface marker, never on that tag. Sources: `product-audit/site-shape.md` §6 and smell 1, `product-audit/exemplar-landing-pages.md` smell 9.
17. The frame's territory includes pricing pages, but the fleet has no pricing page and no paid tier. The only pricing rule this wave ships is "never write a price, limit or plan name without an evidence record". Source: `marketing-topic-map/pricing-plg.md`.
18. The frame's third falsifier, about decay faster than a refresh, also fires for law and platform policy. Several marketing laws changed or start inside the refresh window, for example the AI Act Art. 50 transition the scout dates to 2026-12-02. Every law fact in the reference skill therefore carries a fetch date and a refresh_by date. Sources: `marketing-topic-map/codified-law-policy.md` #13, `marketing-topic-map/recent-shifts.md`.

## Critic responses

Each criticism from the completeness critic, and what this revision did.

**Missing items**

1. *site-shape.md smell 10, 8 of 17 nav entries `planned: true`.* Accepted. Handed to ux in one line under "Cross-territory pointers". The nav is information architecture, not copy.
2. *messaging-inventory.md smells 8 and 9; title-description deferred with no reason.* Accepted. The row is split. Description presence is P1 inside seo-head-metadata-set, which cites 4 of 10 sites with 0 descriptions and indexer at 1 of 23. Home-page description content is P1 inside positioning-canonical-sentence, which cites lore.ocx.sh's 35 characters. Only length and wording bands stay deferred, with the reason: Google states no limit.
3. *8 of 10 docs homes with no positioning; doc hubs tagged `doc_type: landing`.* Accepted. A new dive, page-surface-scope, decides the scoping key and what a docs home owes marketing. Frame correction 16 records the ambiguity. Any docs-home requirement goes to docs-quality as a change request.
4. *Grimoire's 3 nouns and 4/5/8-item type lists.* Accepted. positioning-canonical-sentence now covers the object noun and every enumerated list, and a map row (vocabulary-list-drift) records it.
5. *grimoire.rs 2 h1 elements; 9 of 10 www-setup bodies with hash-shaped words.* Accepted. The h1 count goes to ux (map row h1-count). The hash words are measured and decided inside release-body-contract (map row release-hash-words).

**Weak briefs**

6. *page-offer-terms asks for rules on a surface that does not exist.* Accepted. The dive is cut. Never-invent-prices moves into claims-evidence-record as a block. Offer terms join the deferred pricing group.
7. *Statutory detail with no fetch-or-omit instruction or refresh-by field.* Accepted. Every brief that names a law carries the law protocol: fetch from the primary URL, record the provision and dates, write "unverified, omitted" for anything unconfirmed, and give every row a refresh_by date. measure-consent-free-config names the primary source for each law, including the commencement regulation for the Data (Use and Access) Act.
8. *The author-only-fact hypothesis has no measurement; the HN coding is channels evidence.* Accepted in part. The dive is now voice-ai-tells-baseline. Its core measurement compares marker rates in pre-2022-11-30 upstream READMEs, current upstream READMEs and fleet READMEs, which bounds false positives. The author-only-fact requirement may ship only as an unverified CONSIDER. HN comments stay as secondary evidence, limited to comments that quote the product's own copy. That makes them evidence about copy, which is marketing ground.
9. *The "threshold below which a count is left out" cannot be derived.* Accepted. The brief now forbids inventing one.

**Overlaps**

10. *proof-popularity-metrics vs measure-metric-validity.* Accepted. Merged into measure-metric-validity, which owns metric semantics and the page display form. The fake-star policy goes to channels.
11. *claims-statistic-provenance vs measure-metric-validity, two record definitions.* Accepted. The map defines one evidence record under "Two shared contracts". claims-evidence-record owns its storage and lint; measure-metric-validity fills only the definition and window fields.
12. *positioning-canonical-sentence vs page-repo-card.* Accepted. page-repo-card is cut. Canonical-sentence owns the drift check, including the About description. The other card fields go to channels.
13. *seo-head-metadata-set vs page-repo-card on share images.* Accepted. With repo-card cut, only seo-head-metadata-set covers og:image, and it requires presence and form only. Per-platform dimensions go to channels.
14. *proof-testimonials-reviews vs voice-ai-disclosure on AI endorsements.* Accepted. claims-endorsements-proof owns AI testimonials and avatars. voice-ai-disclosure says so in its brief and covers AI Act labelling only.
15. *proof-testimonials-reviews vs proof-case-study-contract.* Accepted. Folded into claims-endorsements-proof, with one exemplar sample.
16. *claims-performance-benchmarks vs claims-statistic-provenance.* Accepted. Merged into claims-evidence-record: the objective-claim test and the evidence record are one deliverable.
17. *Channels territory in five dives.* Accepted. Repo-card fields, fake stars, share-image sizes, release mechanics and announcement order are each one line under "Cross-territory pointers". The HN sampling is answered in item 8.
18. *UX territory: the h1 count and the landing mis-tag.* Accepted for the h1 count, which goes to ux. Answered for the mis-tag: it decides which pages marketing rules fire on, so it stays here as the scope dive. Its structural side (page outline, headings) goes to ux.
