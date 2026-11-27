---
title: Claims, endorsements and proof - which testimonial, quote, logo, case study or badge an agent may place, and the evidence record behind it
program: product
sub_program: marketing
topic: marketing-claims-evidence
worker: claims-endorsements-proof
date_researched: 2026-11-27
model: sonnet
sources_fetched: 56
---

# Claims, endorsements and proof

Scope: endorsement-class proof on owned pages (testimonial, quote, review excerpt, customer logo, case study, badge, certification mark), AI-generated endorsements, material connections, and the evidence record that must sit on disk before each ships. Not covered: AI Act labelling (voice-ai-disclosure), performance and comparative claims (sibling dive), platform-specific disclosure tools (channels).

Sources fetched: 15 law, regulator, platform and brand-guideline pages, 25 exemplar home pages and 15 exemplar case-study pages (55 documents).

Failed fetches, stated plainly: EUR-Lex (Directive 2019/2161, Annex I points 23b and 23c) returned an empty body to WebFetch and an HTTP 202 empty bot challenge to curl on three URL forms. The EU rule is therefore "unverified, omitted" and gets no rule row. The AICPA SOC logo guidelines PDF is behind an account page (the download URL returned an HTML shell); its terms are unverified, omitted. Clutch Terms of Use (updated 2026-07-13 per the methodology page) were not fetched. `https://www.ecfr.gov/...` pages redirect WebFetch to a bot page; the eCFR text was read from the eCFR versioner API (`curl --compressed "https://www.ecfr.gov/api/versioner/v1/full/2026-11-20/title-16.xml?part=465"`), which is the same data.

## Table of contents

1. Summary
2. Findings (1 law, 2 platforms and marks, 3 measurements, 4 decisions)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- An agent that writes a quote, name, role or "customer" that does not map to a real person who said it is writing a fake testimonial; 16 CFR 465.2(a) names writing, creating or selling such a testimonial an unfair or deceptive act ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), in force 2024-10-21).
- The FTC says the rule reaches AI-generated reviews: "AI-generated reviews are covered by the final rule" ([Federal Register 2024-08-22, fn 35](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)).
- A stock avatar or virtual influencer is not banned as such; the rule limits itself to material misrepresentation of existence, use or experience ([FTC Q&A, Nov 2024](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers); [FR 2024-08-22, discussion of 465.2](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)). A persona presented as a real customer is the violation.
- Correction to the scout row codified-law-policy #5: the Rytr consent order was set aside on 2025-12-22, 2-0, so "Rytr was barred" no longer holds; the FTC still says it "will continue to hold accountable actors that use AI to violate the law" ([FTC press release 2025-12-22](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan)). The rule itself (Part 465) is untouched by that release.
- An excerpt from a review or a quoted third party on your page is an endorsement under 16 CFR 255.0(b); "the name or seal of an organization can be endorsements", which brings customer logos into the same duties ([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Whether a bare logo wall is an endorsement is an inference; treat it as one for the record contract.
- Quotation marks promise exact words: [255.1(b)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) lets copy shorten an endorsement only if it does not "distort in any way" the opinion, and quotation marks represent the endorser's exact words.
- Featuring a review turns it into a testimonial and drops the review-hosting exemption ([FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)).
- A result figure on a key attribute implies it is representative; without substantiation the page must state generally expected performance ([255.2(b)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)).
- A material connection (pay, free product, discount, employment, family, early access, equity) must be disclosed clearly and conspicuously when a significant minority of the audience would not expect it ([255.5(a)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)); on interactive media the disclosure must be "unavoidable" and "not clear and conspicuous if a consumer must take any action, such as clicking" ([465.1(c)(4)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)).
- G2 allows AI drafting of a review only for LinkedIn-verified reviewers, sellers' lists or in-app submissions, from 2026-11-04 ([G2](https://legal.g2.com/community-guidelines)). An agent must not draft review text for a customer.
- Measured on 25 exemplar home pages: 8 carry attributed quotes; 0 of those 8 show a date; 3 of 8 link to a source. Measured on 15 exemplar case studies: 2 show a visible date, 2 show a before-and-after pair, 9 show no outcome metric a reader can check. Exemplars are not a standard; they are the base rate agents imitate.
- OSS adopters: no fetched source (CNCF FAQ included) requires or forbids consent for an ADOPTERS.md entry; the contract below makes a consent record mandatory for any named organization on a marketing page, which is a design decision, not a legal finding.

## Findings

### 1. What the law says, from the primary text

**1.1 16 CFR Part 465, Consumer Reviews and Testimonials Rule.** Final rule published 2024-08-22 as 89 FR 68034, effective 2024-10-21 ([Federal Register API record](https://www.federalregister.gov/api/v1/documents/2024-18519.json); `curl -s .../2024-18519.json` field `dates`). eCFR content versions list every section at 2024-10-21 (`https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=465`). Fetch date 2026-11-27, in force. refresh_by 2027-05-27.

| Section | What it binds on an owned page | Quote |
|---|---|---|
| 465.2(a) | A business may not write, create or sell a consumer review, consumer testimonial or celebrity testimonial that materially misrepresents that the reviewer "exists", "used or otherwise had experience" with the product, or their experience | "write, create, or sell a consumer review, consumer testimonial, or celebrity testimonial that materially misrepresents" |
| 465.2(b) | Same for buying a review or disseminating a testimonial the business "knew or should have known" was false | |
| 465.2(d)(1) | Exempt: results of "generalized solicitations to purchasers" | |
| 465.4 | No incentive "conditioned expressly or by implication" on a particular sentiment | |
| 465.5 | Officers, managers, employees, agents: testimonial needs clear and conspicuous disclosure of material relationship unless "otherwise clear to the audience" | |
| 465.6 | Do not claim an entity you control provides independent reviews | |
| 465.7(b) | Do not claim displayed reviews are most or all submitted when reviews are suppressed by rating or sentiment | |
| 465.8 | No buying or procuring fake social-media indicators (followers, views, likes) | |

Definitions that decide edge cases (465.1): a "consumer testimonial" is a promotional message including "depictions of the name, signature, likeness, or other identifying personal characteristics of an individual" that consumers are likely to believe reflects the experience of a consumer who purchased or used the product; a "consumer review" must be published on a site "dedicated in whole or in part to receiving and displaying such evaluations", so a quote on your own landing page is a testimonial, not a review. "Clear and conspicuous" (465.1(c)): same medium as the representation; size, contrast, location and duration "stand out"; on social media or the internet it "must be unavoidable"; in each language of the representation.

Penalty: the Federal Register notice states "The maximum civil penalty is currently $51,744 per violation" (as of 2024-08-22, preamble); the figure is adjusted yearly and the current amount was not fetched, unverified, omitted from any rule.

**1.2 What the FTC says about AI, avatars and B2B.** From the FTC Q&A (page dated "November 2024", fetched 2026-11-27, the FTC itself): "The rule has no blanket prohibition on the use of AI-generated avatars in marketing"; AI stock avatars "would not be giving 'consumer reviews'"; a testimonial delivered by an avatar is covered when the underlying testimonial is fake or false; an unauthorised celebrity avatar can violate the rule. The Q&A "doesn't directly address testimonials attributed to people who don't exist", but the rule text (465.2(a)(1)) does. The Federal Register preamble says the Commission narrowed 465.2 to material misrepresentations "to avoid this unintended consequence" for "virtual influencers" (preamble, discussion of 465.2, fn 220 defines a virtual influencer as "a computer-generated fictional character"). Reading: a labelled mascot is lawful; a persona with a name, a role and a quote that readers will take as a customer is the offence. A business-to-business scope statement is absent from the Q&A and the rule text; 465.1 defines consumer reviews by "consumer", and the Q&A says its only entity-endorsement section is 465.6. B2B reach of Part 465 is unresolved (see Contested). Section 5 of the FTC Act and the Endorsement Guides apply to advertising generally, and 255.0(d) defines "product" to include "service, brand, company".

**1.3 [16 CFR Part 255, Endorsement Guides](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255).** Source line: 88 FR 48102, 2023-07-26 (read from eCFR API, data as of 2026-11-20). These are guides: "Practices inconsistent with these Guides may result in corrective action" under section 5, not a statute. refresh_by 2027-05-27.

- [255.0(b)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): an endorsement is any message consumers are "likely to believe reflects the opinions, beliefs, findings, or experiences of a party other than the sponsoring advertiser"; "tags in social media posts ... and the name or seal of an organization can be endorsements." A film critic's excerpt in the producer's ad "becomes an endorsement" (255.0(g) example 1).
- [255.1(a)-(c)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): endorsements must reflect honest opinion; quotation marks mean exact words; no distortion by context or rewording; for expert or celebrity endorsements the advertiser needs "good reason to believe that the endorser continues to subscribe to the views presented", satisfiable by "securing the endorser's views at reasonable intervals"; a "bona fide user" at the time given and while the ad runs.
- [255.1(d)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): advertiser liable even when the endorser is not; should guide, monitor and remedy endorsers.
- [255.1(f)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): agencies, PR firms and "review brokers" may be liable for creating deceptive endorsements; by the same logic an agent that drafts one is an instrument of the business, not a shield.
- [255.1(g)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): an image of a person other than the actual endorser is deceptive if it misrepresents a material attribute; examples 6 and 7 apply to stock photos beside real testimonials.
- [255.2(b)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): results representative of what consumers "will generally achieve" or disclose generally expected performance; 255.2(c): ads "represented ... to be 'actual consumers'" should use actual consumers "in both the audio and video, or clearly and conspicuously disclose that the persons ... are not actual consumers"; 255.2(d): do not distort what consumers think when "procuring, suppressing, boosting, organizing, publishing, upvoting, downvoting, reporting, or editing consumer reviews".
- [255.5(a)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255): connection "that might materially affect the weight or credibility" and "not reasonably expected by the audience" must be disclosed clearly and conspicuously. Connections include payment, free or discounted products "including products unrelated", "early access to a product", "the possibility of being paid, of winning a prize, or of appearing on ... media promotions", and business, family or personal relationships. Test: disclose "when a significant minority of the audience ... does not understand or expect the connection"; the disclosure "must clearly communicate the nature of the connection".

**1.4 FTC staff guidance on placement and wording** (staff guidance, not binding per the 255.0 footnote). "The closer the disclosure is to your recommendation, the better"; "A hyperlinked disclosure like that is easily avoidable"; employees: "Listing your employer on your profile page isn't enough"; platform tools: "just because a platform offers this feature is no guarantee that it's an effective way" ([FTC, What People Are Asking, undated page, fetched 2026-11-27](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking); only characters 0-100,000 of 108,469 read; virtual-influencer and B2B topics were not found in the part read). Disclosures 101 (page dated November 2019, [FTC](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)): "advertisement", "ad" and "sponsored" are acceptable; avoid "sp", "spon", "collab", standalone "thanks" or "ambassador"; put it "with the endorsement message itself"; do not bury it in a hashtag group; in video "in the video and not just in the description"; same language as the endorsement. This staff page states no per-post repetition rule except for live streams, so the scout wording "in each post" is narrower evidence than claimed.

**1.5 Selection and solicitation.** The FTC says only soliciting happy customers "does not" violate a specific rule prohibition but "could still violate the FTC Act"; the Federal Register preamble (discussion of 465.2(d)(1)) says "solicitations made only to customers whom the business believes to be happy customers would not be 'generalized solicitations'". The first is Q&A, the second is the preamble; the conservative reading for an agent is to treat a happy-customer-only request list as outside the exemption. Selectively featuring positive reviews is not a 465.7 violation, but "using non-representative reviews in marketing could be deceptive" (Q&A).

**1.6 Rytr correction.** The 2024 order barring Rytr from marketing a service "dedicated to - or promoted as - generating consumer reviews or testimonials" was reopened and set aside on 2025-12-22 by a 2-0 vote because "the complaint failed to satisfy the legal requirements" and "the order unduly burdens artificial intelligence (AI) innovation" ([FTC, 2025-12-22](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan)). The release does not mention Part 465. Effect for agents: do not cite Rytr as a live precedent; cite 465.2.

**1.7 EU.** Directive 2005/29/EC Annex I points 23b and 23c (inserted by Directive 2019/2161) could not be fetched from EUR-Lex. A search result confirms only that the Modernisation Directive added the fake-review blacklist items ([search result summary, secondary](https://webgate.ec.europa.eu/e-justice/595/EN/unfair_commercial_practices_directive_200529)); wording unverified, omitted. No rule row cites it. For EU-facing pages the contract below is stricter than the US text anyway.

### 2. Platform and mark terms

**G2** ([community guidelines](https://legal.g2.com/community-guidelines), no last-updated date; AI rules apply "beginning November 4, 2026"; platform itself): incentives capped at $100 in any form, eligibility "never based on the opinions"; incentivised reviews are labelled; AI drafting only if LinkedIn Verified, on a seller-provided list, or in-app; "Allowing AI to fabricate experiences, results, or product claims" prohibited; vendors may not use "any method that segments out potentially negative reviews or exclusively targets positive reviews"; review-landing links belong in closed channels; reviews must come from experience "within the past two years"; employees and direct-competitor employees may not review. Republishing a G2 review needs a Professional plan or above, a backlink, and "The customer must opt in"; star ratings need the citation "Source: G2.com, Inc." and a backlink; badges may not be altered; report positions need a content subscription and backlink.

**Clutch** ([methodology](https://clutch.co/methodology), "Last updated in October 2026"; platform itself): verified reviews only count toward Ability to Deliver (40 points, reviews 20); incentives capped at $100 per review, up to $500 per provider, disclosed on the review; awards "None of them are for sale"; Clutch Verified is a paid subscription. The page does not say how a vendor may quote Clutch; the Terms of Use (updated 2026-07-13) were not read. So a badge claim cites the listing and year, and the quoting terms are unknown.

**SOC logo.** AICPA says its service-organization logo is for organizations that "received at least one" SOC 1, SOC 2 or SOC 3 report "from a licensed CPA or a non-U.S. equivalent"; the full guidelines PDF and the required legends were not obtainable ([AICPA download page, dated 2026-04-22](https://aicpa-cima.com/resources/download/soc-for-service-organizations-logo-guidelines-for-service-organization)). Registration, unqualified-opinion requirement and prohibited wording are unverified, omitted. Safe agent behaviour needs no more: a SOC logo appears only when the audit record (report period, auditor, type) is on disk, and the word "certified" is never used (the scout services-b2b #22 sourced "attestation, not certification" from Wikipedia only; a primary for that wording was not obtained here).

**Customer-logo brand terms.** OpenAI ([brand page, copyright 2015-2026, no effective date](https://openai.com/brand/)): "Misrepresent your relationship with OpenAI, imply endorsement, or confuse users about sponsorship" is prohibited; logos only "when it directly relates to OpenAI services"; "Do not feature our Marks more prominently than your own"; permission is "non-exclusive and non-transferable" and OpenAI "can end permission at any time"; requests go to partnercomms@openai.com; the page does not address customer logos. Stripe ([brand assets, copyright 2026](https://stripe.com/newsroom/brand-assets)): marks are "subject to Stripe's Marks Usage Agreement" (not read); only wordmark colours are constrained on the page; the "Powered by Stripe" badge is for "Businesses who use Stripe ... on their checkout pages", so it is a use-case licence, not a customer-endorsement licence. Neither page grants a right to display the company as a customer of the page owner. Both exemplars appear as customer logos on exemplar sites (Stripe on the Ruff quote wall; OpenAI on Linear's customer quote and Supabase). The logo right is therefore a separate record from the quote right.

### 3. Measurements

Corpus rebuilt on 2026-11-27: `D=~/.cache/research-lang/exemplars/product/exemplar-landing-pages`; 25 URLs from the audit table fetched with `curl -sL --compressed -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) research" -o html/$n.html "$u"`; wire sizes match the audit's `gz.txt` figures (for example bun 29,081, vite 9,929 against 9,908 audited). Static HTML only: client-rendered proof is invisible. Scripts: `$D/scripts/proof.py` and the inline extractors below. Case studies: `~/.cache/research-lang/exemplars/product/case-studies/` (15 pages, `urls.txt` there).

**3.1 Landing pages (n = 25).**

| Measure | Result | Command |
|---|---|---|
| Pages with attributed quotes (blockquote or testimonial markup, with names) | 8: astral, ruff, calcom, linear, flyio, neon, turso, stripe | `python3 -I $D/scripts/proof.py` columns blockquote and testimonial-class, then hand check of each |
| Quote count per page (distinct) | astral 3, ruff 5, calcom 17, linear 3, flyio 2, neon 1, turso 1, stripe several | `python3 -I` extractor over `<blockquote>`, dedup on first 50 characters |
| Quotes naming a person and a role | astral 3 of 3, ruff 5 of 5, flyio 1 of 2 (the other: name and company only), turso 1 of 1, stripe: name and title on the sampled card (Mindbody), neon 0 of 1 (name only in the extract), linear 0 of 3 (company only), calcom mixed (handle-style entries) | read from the extract above |
| Pages where any quote shows a date | 0 of 8 | regex for month or year within 700 characters after each block: 0 hits for all 7 pages scanned; stripe cards carry none |
| Quotes linking a source | ruff 4 of 5 (tweet and pull-request links, for example `https://twitter.com/schrockn/status/1612615862904827904`), flyio 2 of 2 ("Read the story"), stripe cards "Read the story", calcom 1 of 17, astral 0 of 3, linear 0 of 3, neon 0 of 1, turso 0 of 1 | `href` presence in the 700 characters after each block |
| Pages linking customer or case-study pages | 12: astro, calcom, flyio, linear, neon, posthog, sentry, stripe, supabase, tailscale, turso, vercel | `grep -o 'href="[^"]*\(customers\?\|case-stud\|stories\)[^"]*"'` |
| Customer-logo walls by `alt` containing "logo" | tailscale 20, biome 15 (sponsors), svelte 10 (sponsors), astro 5, stripe 4, deno 2, plus counts of 1 | `grep -o '<img[^>]*alt="[^"]*logo' ` |
| Dedicated proof section (audit definition) | 16 of 25, reproduced from the audit, not re-derived | [exemplar-landing-pages.md](../product-audit/exemplar-landing-pages.md) |
| Certification or review badges | not countable from static HTML: calcom and others mention G2, Trustpilot and Product Hunt only inside JSON-LD `sameAs`, not as badges | `grep -o 'g2.com\|trustpilot'` yields links, not badges |

Reading: where exemplars show quotes they usually give a name and often a role, never a date, and rarely a source link. An agent copying the exemplar shape will produce undated, unlinked, unfalsifiable quotes. The fleet's own landing pages carry none of these (site-shape smell 3, from the audit).

**3.2 Case-study field coverage (n = 15 pages, 6 vendors).** Presence in the fetched HTML, hand-read from the extracts (`python3 -I` sentence extractor on `%`, `x`, minutes, days; date regex for `Published`, `Month d, yyyy`, ISO dates; `datePublished` in markup).

| Case study | Customer | Problem narrative | Before value | After value | Visible date | Quote owner name and role | Source link or back-link |
|---|---|---|---|---|---|---|---|
| fly.io Mocha | yes | yes | no | no | yes (2024-09-14) | name, company only | no |
| fly.io Steel.dev | yes | yes | no | no | yes (2024-09-25) | name and role | no |
| linear Ramp | yes | yes | no | yes ("75% of Ramp's merged PRs", no base) | no | company named | no |
| linear OpenAI | yes | yes | no | no | no | no | no |
| posthog ElevenLabs | yes | yes | no | no | no | yes | no |
| posthog Exa | yes | yes | no | no | no | yes | no |
| posthog Hasura | yes | yes | no | delta ("10-20% improvement in conversion", no base) | no | yes | no |
| stripe Browserbase | yes | yes | no | delta (17% increase, no base) | no | yes | no |
| stripe Decagon | yes | yes | no | delta (65%, 167%, no base) | no | partial | no |
| supabase Chatbase | yes | yes | yes ("zero" ARR) | yes ("10 million" ARR, no date) | no (markup only) | yes | no |
| supabase Lovable | yes | yes | no | no (usage share only) | no | yes | no |
| supabase Rally | yes | yes | no | no | no | yes | no |
| tailscale Cribl | yes | yes | no | no | no | yes | no |
| tailscale Instacart | yes | yes | yes ("lost up to 20 minutes a day", "10 a week") | yes ("nearly zero") | no | yes | no |
| tailscale Mercury | yes | yes | no | no | no | yes | no |

Totals: customer 15 of 15; problem narrative 15 of 15; before and after both present 2 of 15 (Chatbase, Instacart); after only, usually as a percentage delta with no base or window 4 of 15 (Ramp, Hasura, Browserbase, Decagon); no outcome number 9 of 15; visible publication date 2 of 15 (both fly.io); quote owner with name and role 13 of 15; source link 0 of 15; measurement method and period 0 of 15. Vendor-authored pages: every one is vendor data. Hand-read, one reader; expect two or three cells to flip.

Reading: a case study on these sites is a story. The metrics that exist are vendor-reported deltas without base, window or method. The scout services-b2b #20 proposal (client, consent, period, metric, method, approver) is stricter than all 15 exemplars; none would pass it.

### 4. The decisions

**4.1 The endorsement source file (evidence-record class `endorsement`).** One file per endorsement, under `proof/endorsements/<id>.yml` (proposed path; the project may rename). Every quote, logo, badge and named adopter on a page references an `id`. This is a design derived from 255.1, 255.5 and 465.2, not a sourced standard.

```yaml
id: acme-cto-2026-11
kind: quote            # quote | logo | badge | case-study | review-excerpt | adopter-name | rating
subject: product       # the product or service the statement is about
who:
  name: Jane Doe
  role: CTO
  organization: Acme Ltd
  is_real_person_verified_by: "reply from jane@acme.example, saved at proof/raw/acme-2026-11-03.eml"
said_where:
  url: https://github.com/example/repo/issues/123   # or a mail, call-note or survey file
  captured: 2026-11-03
  original_text_file: proof/raw/acme-2026-11-03.txt  # exact words
published_text: "…"    # byte-equal to the page unless edits are listed
edits: []              # each: what was cut; ellipsis shown on page
experience_period: 2026-06..2026-11
permission:
  type: written        # written | public-statement | none
  scope: [website, readme]
  granted_by: Jane Doe
  granted_on: 2026-11-04
  record: proof/raw/acme-permission-2026-11-04.eml
  expires_or_recheck: 2027-11-04
connection:            # every item that applies; "none" is a value, not a blank
  paid: false
  free_product_or_discount: false
  employee_or_agent_or_relative: false
  equity_or_investor: false
  early_access_or_prize: false
  partner_or_referral_programme: false
  disclosure_text: null   # required when any value above is true
typical_result: true    # false requires typical_result_statement
result_figure: null     # see 4.4
approved_by: owner-handle
```

Rules that follow: the file must exist before the page ships; `published_text` must match the page; a missing `permission.record` blocks the quote; any `connection` value true blocks until `disclosure_text` is set and placed per 4.3; `recheck` date past blocks the build (255.1(b) "reasonable intervals").

**4.2 Ban on quotes, logos and badges with no source entry.** A build step greps the rendered HTML and markdown for quotation marks followed by an attribution pattern, `<blockquote>`, `<img alt="... logo">` in a proof section, and known badge image names; each must carry `data-proof="<id>"` or an equivalent marker that resolves to a file. Anything without it fails. Image and wording are separate: a logo needs its own `kind: logo` entry with `permission` that names logo display (see Findings 2: OpenAI's page grants no customer-logo right).

**4.3 Material-connection disclosure: wording and placement.** Placement: immediately adjacent to the endorsement, in the same element, visible without click or hover (465.1(c)(4); FTC staff: "closer ... the better"; "hyperlinked disclosure ... easily avoidable"). Not in a footer, a tooltip, a separate page, or a collapsed region. Language: the page language of the quote. Wording, taken from FTC staff-accepted terms plus 255.5(a) "the nature of the connection":

| Connection | Wording beside the quote |
|---|---|
| Paid for the quote | "Paid testimonial" or "Ad: paid by {Company}" |
| Free or discounted product or service | "{Name} received {product} free of charge" |
| Employee, contractor or agent | "{Name} works for {Company}" |
| Family or personal relationship | "{Name} is {relationship} of the {Company} founder" |
| Investor or equity holder | "{Name} is an investor in {Company}" |
| Partner or referral fee | "{Name} earns a referral fee from {Company}" |
| Early access or prize | "{Name} had early access to {product}" |
| Customer, incentivised review | "Reviewer received {incentive}" |

Avoid "sp", "spon", "collab", standalone "thanks" or "ambassador", and "partner" alone (Disclosures 101). Whether a given connection is "reasonably expected by the audience" is a legal judgement for the owner; the safe default is to disclose every non-empty `connection` field.

**4.4 What a story with no before and after metric is called.** Label it "customer story" in headings and URLs, never "case study", "results" or "proof". A page may be titled "case study" only when the record has: baseline value, outcome value, period, method, unit and base (a rate needs its denominator), and a `typical_result` field (255.2(b)). A relative delta without base (the 4 of 15 above) is a story with a claim, and the claim goes through the performance-claims substantiation file, not the endorsement file. The headline of a story may not state an outcome number that the record lacks. This distinction is a definition proposed here; the FTC texts require substantiation and typicality disclosure but do not define "case study".

**4.5 OSS adopters: may they be named, and with what consent record.** Facts: the CNCF TOC FAQ lists adopters of a project as organisations that "currently and actively, successfully" use it, and excludes transitive adopters; it "does not address whether an organization must give permission or consent before being listed" (read 2026-11-27 at [cncf/toc FAQ](https://github.com/cncf/toc/blob/main/FAQ.md)). No fetched source forbids listing public users, and none grants a right to use their marks (logos) on marketing pages; OpenAI's and Stripe's brand pages restrict use of marks without granting customer-display permission. Decision: a project README or docs `ADOPTERS.md` may list a name as text only when the record shows either (a) the organisation added itself by pull request or issue, with the link stored, or (b) a written reply granting permission; no logo, no quote, and no "trusted by" count unless a `kind: logo` or `kind: quote` record exists. A name taken from `package.json` dependents, a lockfile or a public repository is not consent; it is evidence of use and may be stated factually as "{N} public repositories depend on X (GitHub dependency graph, retrieved {date})", never as a customer or endorsement. Inference, flagged for owner decision: whether a bare name list is an endorsement under 255.0(b) is not settled by the sources read.

## Normative guidance candidates

Law rows carry fetch date 2026-11-27 and refresh_by 2027-05-27.

Each rule has an explicit **Severity** field (MUST, SHOULD or CONSIDER), a **Rationale** with an inline source link and the date the source states, and a **Verify**. Link set used below: [465]: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 (in force 2024-10-21); [255]: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255 (88 FR 48102, 2023-07-26); [FR]: https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials (2024-08-22); [QA]: https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers (Nov 2024); [G2]: https://legal.g2.com/community-guidelines (no update date; AI clause from 2026-11-04); [Clutch]: https://clutch.co/methodology (last updated October 2026).

1. **Severity: MUST.** Do not write a quote, name, role, company, rating, review or testimonial that is not tied to an existing `endorsement` record. Rationale: 465.2(a) bars creating a testimonial that misrepresents the testimonialist's existence or experience ([16 CFR 465.2, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); AI-generated reviews are covered ([FR 2024-08-22, fn 35](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)). Verify: `grep -rnE '[“"][^”"]{20,}[”"]\s*[-—–]\s*[A-Z]' site/ docs/` and `grep -rn '<blockquote' site/`; every hit has a `data-proof` id resolving to `proof/endorsements/<id>.yml` (script exits 1 otherwise). Pass: record exists. Fail: agent-written "Sarah, CTO at a fintech startup".
2. **Severity: MUST.** Do not use an AI-generated avatar, stock photo or illustrated persona beside a real endorser's words unless it is labelled and does not misrepresent a material attribute. Rationale: 255.1(g) examples 6-7 ([16 CFR 255.1, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)); avatars are not banned but a false testimonial from one is covered ([FTC Q&A, Nov 2024](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)). Verify: image `alt` and caption of each endorsement image names the real endorser or says "illustration"; record field `image_is_endorser: true|false`. Fail: stock headshot above a real quote.
3. **Severity: MUST.** Do not present a persona (name, role, quote) as a customer. A labelled persona may appear only in a "who this is for" block, with no quotation marks and the label "Persona" in the heading. Rationale: 465.2(a)(1) ([16 CFR 465.2, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)) and 255.2(c) "actual consumers" ([16 CFR 255.2, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify reading heuristic: "Could a reader believe this person said this about the product?" Pass: heading "Persona: a platform engineer". Fail: `“Saved us two sprints” — Dana, Platform Lead`.
4. **Severity: MUST.** Do not draft a review, rating or testimonial text for a customer to sign or post; MAY provide a blank prompt of questions. Rationale: 465.2(a) ([16 CFR 465.2](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), in force 2024-10-21) and G2's AI-drafting limits that apply from 2026-11-04 ([G2 community guidelines](https://legal.g2.com/community-guidelines)). Verify: `grep -rniE 'dear customer.*review|copy and paste|suggested review'` in `emails/` and `docs/` returns nothing; request templates contain only questions.
5. **Severity: MUST.** Keep quotation marks for exact words only; list edits to a quote in `edits`. Rationale: 255.1(b) ([16 CFR 255.1, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: diff `published_text` against `original_text_file`; any difference outside listed ellipses fails.
6. **Severity: MUST.** Carry for every endorsement: name, role, organisation, where said (URL or file), capture date, permission record, connection status, recheck date. Rationale: 255.1(b)-(c) and 255.5(a) ([16 CFR Part 255, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: yaml schema check on `proof/endorsements/*.yml`, missing key fails.
7. **Severity: MUST.** Display the capture date or "as of" date next to each quote and number on the page. Rationale: 255.1 example 1(ii) ties old endorsements to a clear and conspicuous date ([16 CFR 255.1, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)); exemplars show 0 of 8 dated (Findings 3.1, measured 2026-11-27). Verify: rendered HTML has `<time datetime>` within the endorsement element.
8. **Severity: MUST.** Disclose a connection beside the endorsement, in the same element, visible without interaction, in the endorsement's language, using a term from the table in Findings 4.3. Rationale: 255.5(a) ([16 CFR 255.5, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)); 465.1(c)(4) "unavoidable" ([16 CFR 465.1, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); FTC staff "the closer the disclosure ... the better" ([FTC, What People Are Asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking), undated, fetched 2026-11-27). Verify: DOM check that `.disclosure` is a sibling inside the endorsement container and is not `hidden`, `details`, `title=` or `aria-describedby` only; wording matches the table or fails.
9. **Severity: MUST.** Do not rely on a footer note, a link to a disclosure page, or a platform tool as the only disclosure. Rationale: 465.1(c)(4) "not clear and conspicuous if a consumer must take any action" ([16 CFR 465.1, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); platform tool "no guarantee" ([FTC, What People Are Asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking), undated). Verify: `grep` that every disclosure string appears inside the element, not only in footer.
10. **Severity: MUST.** Ask the owner before any quote from an employee, contractor, founder, investor, family member or paid person ships. Rationale: 465.5 ([16 CFR 465.5, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)) and 255.5(a) ([2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: records with `connection` any true have `approved_by` set to a human handle.
11. **Severity: MUST.** Do not put a customer, partner or adopter logo on a page without a `kind: logo` record whose permission names logo display. Rationale: 255.0(b) "name or seal of an organization can be endorsements" ([16 CFR 255.0, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)); "imply endorsement" prohibited with no customer-logo grant ([OpenAI brand page, (c) 2015-2026, no effective date](https://openai.com/brand/)). Verify: every `<img alt*=logo>` in a proof block has `data-proof`; missing fails.
12. **Severity: MUST.** Do not use a logo larger or more prominent than the page owner's mark; use it as provided, without recolouring beyond the owner's published rule. Rationale: "Do not feature our Marks more prominently than your own" ([OpenAI brand page, (c) 2015-2026](https://openai.com/brand/)); wordmark colour rule ([Stripe brand assets, (c) 2026](https://stripe.com/newsroom/brand-assets)). Verify: image height not above the product wordmark in CSS; file hash equals the downloaded asset hash recorded in the record.
13. **Severity: MUST.** Do not display a review-site badge ("G2 Leader", "Clutch Verified") without a record holding the listing URL, the issue year and the plan tier; do not modify the badge. Rationale: G2 badges may not be altered and republishing needs a plan, backlink and opt-in ([G2 community guidelines](https://legal.g2.com/community-guidelines), no update date; fetched 2026-11-27); Clutch's quoting terms are unread ([Clutch methodology, last updated October 2026](https://clutch.co/methodology)). Verify: badge link target equals `listing_url`; alt text contains the year.
14. **Severity: MUST.** Do not quote a G2 review unless the record shows the reviewer's opt-in and a backlink; put "Source: G2.com, Inc." next to the star rating. Rationale: the guidelines state "The customer must opt in to using the product review" and the star rating "Must cite as follows: 'Source: G2.com, Inc.'" plus a backlink ([G2 community guidelines](https://legal.g2.com/community-guidelines); the page shows no update date, its AI clause applies "beginning November 4, 2026"; platform itself, fetched 2026-11-27). Verify: grep the citation string `Source: G2.com, Inc.` next to every rating; record `optin_record` exists.
15. **Severity: MUST.** Do not write "SOC 2 certified" or "ISO 27001 certified" without a record; write "SOC 2 Type {1|2} report" with the period and auditor on file. Rationale: the SOC logo goes to organisations with a report from a licensed CPA ([AICPA logo page, dated 2026-04-22](https://aicpa-cima.com/resources/download/soc-for-service-organizations-logo-guidelines-for-service-organization)). Verify: `grep -rniE 'soc ?2 (certified|compliant)|iso ?27001 certified'` must match a record id; the record has `report_type`, `period_end`, `auditor`. Logo-guideline terms are unverified; ask the owner.
16. **Severity: MUST.** Do not send review requests only to customers likely to be happy; do not offer an incentive tied to a rating. Rationale: 465.4 ([16 CFR 465.4, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); happy-only requests are not "generalized solicitations" ([FR 2024-08-22, discussion of 465.2(d)(1)](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)); G2: "limits the value of any incentive ... to $100 USD" ([G2 community guidelines](https://legal.g2.com/community-guidelines), no update date); Clutch: "limits the value of any individual incentive to $100, with a cap of up to $500 per service provider" ([Clutch methodology, last updated October 2026](https://clutch.co/methodology)). Verify: review-request automation has no filter on score, NPS or sentiment; incentive text contains no rating word; G2 incentive at most 100 USD; Clutch at most 100 USD per review and 500 USD per provider.
17. **Severity: MUST.** Do not hide or reorder reviews by rating while claiming the displayed set is most or all of them. Rationale: 465.7(b) ([16 CFR 465.7, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)). Verify: reviews widget has no `sentiment` filter in code; heading "All reviews" is not used over a curated set; curated sets are titled "Selected reviews".
18. **Severity: MUST.** State generally expected results next to any result figure unless `typical_result: true` is substantiated. Rationale: 255.2(b) ([16 CFR 255.2, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: every numeric result in a story has a sibling sentence "Typical result: ..." or a record link; absence fails.
19. **Severity: MUST.** Call a page "customer story" unless its record has baseline, outcome, period, method, unit and denominator; do not use "case study", "proof", "results" in heading or URL otherwise. Rationale: only 2 of 15 exemplars give before and after, 0 give method (Findings 3.2, measured 2026-11-27); 255.2(b) requires typicality ([16 CFR 255.2, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: `grep -riE 'case study|case-study'` in path or `<h1>` must resolve to a record with the six fields.
20. **Severity: MUST.** Do not list an organisation as an adopter, user or customer from dependency data, a lockfile or a download count alone; MAY state the count with its source and date. Rationale: no consent in those sources; the CNCF FAQ is silent on consent ([cncf/toc FAQ, undated, read 2026-11-27](https://github.com/cncf/toc/blob/main/FAQ.md)). Verify: every named entry in `ADOPTERS.md` or a "used by" block resolves to a record with `permission.type` of `written` or `public-statement` (self-added PR link).
21. **Severity: MUST.** Do not state follower, star, download or "trusted by {N}" counts without the number, the source URL and the retrieval date on the page; do not buy, trade or request them. Rationale: 465.8 bars buying fake social-media indicators ([16 CFR 465.8, in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); proof claims must be real and dated, per [NN/g, Social Proof in UX, 2014-10-19](https://www.nngroup.com/articles/social-proof-ux/) (independent usability research; the article does not state a rule, the date-and-source requirement is this contract's design). Verify: numeral next to `<a href>` to the source and `<time>`; grep launch plans for "buy stars", "upvote ring".
22. **Severity: MUST.** Re-run the proof audit before each release and fail the build for any record whose `recheck` date has passed or whose expert or celebrity endorser has not reconfirmed within 12 months. Rationale: 255.1(b) "reasonable intervals" and 255.1(c) bona fide use ([16 CFR 255.1, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: CI script compares `expires_or_recheck` to the release date; the 12-month default is a design choice, not a sourced figure.
23. **Severity: SHOULD.** Give a source link from each quote to the original (issue, tweet, talk, mail archive) where public. Rationale: lets readers falsify; exemplars link 3 of 8 (Findings 3.1, measured 2026-11-27), and 255.1(b) requires the quote to be the endorser's words ([16 CFR 255.1, 2023-07-26](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Verify: `href` inside endorsement element, HTTP status 200.
24. **Severity: SHOULD.** Do not put a low count in proof copy ("trusted by 3 teams"); show the named, dated proof instead. Rationale: NN/g reports a study participant who "wasn't impressed" by a low share count and names "the perception that too few people approve" as a social-proof risk ([NN/g, Social Proof in UX, 2014-10-19](https://www.nngroup.com/articles/social-proof-ux/); independent usability research, qualitative, no threshold stated, so "backfire" is the scout's wording, not NN/g's). Verify: reading heuristic; pass: "Used in 3 public repos (GitHub, 2026-11-27)" with the link; fail: "Trusted by teams worldwide".
25. **Severity: CONSIDER.** Keep a `proof/rejected.md` listing quotes withheld for missing permission. Rationale: an agent that finds a withheld quote in a draft, an old branch or its own context will re-add it, and 465.2(b) reaches disseminating a testimonial the business "knew or should have known" was false or unpermitted ([16 CFR 465.2(b), in force 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)); the file is a design choice, not a sourced requirement. Verify: grep that no rejected text appears in rendered output, e.g. `grep -rnFf <(sed -n 's/^- "\(.*\)"$/\1/p' proof/rejected.md) site/` returns nothing.

## Dated facts

| Fact | Source | Date stated | Kind |
|---|---|---|---|
| Part 465 final rule published 2024-08-22 as 89 FR 68034; effective 2024-10-21 | [Federal Register API](https://www.federalregister.gov/api/v1/documents/2024-18519.json), [eCFR versions](https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=465) | 2024-08-22; 2024-10-21 | authority itself |
| 465.2(a) bars writing or creating a testimonial that misrepresents existence, use or experience | [eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465) | in force 2024-10-21; fetched 2026-11-27 | authority itself |
| Maximum civil penalty $51,744 per violation | [FR 2024-08-22 preamble](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials) | 2024-08-22 (figure adjusted annually; current not fetched) | authority itself |
| "AI-generated reviews are covered by the final rule" | same, footnote 35 | 2024-08-22 | authority itself |
| Q&A: no blanket ban on AI avatars; Part 465 in effect 2024-10-21 | [FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers) | "November 2024" | authority itself (staff guidance) |
| Endorsement Guides, 16 CFR 255, source 88 FR 48102 | [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) | 2023-07-26 | authority itself (guides, not law) |
| Staff material-connection Q&A | [FTC What People Are Asking](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) | undated page; nav shows 2026-11-25 items | authority itself (staff) |
| Disclosures 101 wording and placement | [FTC](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) | November 2019 | authority itself (staff) |
| Rytr order set aside, 2-0 | [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan) | 2025-12-22 | authority itself |
| G2: $100 incentive cap; AI drafting rules apply from 2026-11-04; reviews within 2 years | [G2](https://legal.g2.com/community-guidelines) | 2026-11-04 (no update date) | platform itself |
| Clutch: $100 per review, $500 per provider; "Last updated in October 2026"; Terms updated 2026-07-13 | [Clutch methodology](https://clutch.co/methodology) | 2026-10 | platform itself |
| AICPA SOC logo for orgs with a SOC 1, 2 or 3 report from a licensed CPA | [AICPA](https://aicpa-cima.com/resources/download/soc-for-service-organizations-logo-guidelines-for-service-organization) | 2026-04-22 | authority itself |
| OpenAI marks: no implied endorsement; no more prominent than your own | [OpenAI brand](https://openai.com/brand/) | no date; (c) 2015-2026 | company itself |
| Stripe marks subject to Marks Usage Agreement; "Powered by Stripe" for checkout pages | [Stripe brand assets](https://stripe.com/newsroom/brand-assets) | no date; (c) 2026 | company itself |
| CNCF FAQ: adopter definition; no consent statement | [cncf/toc FAQ](https://github.com/cncf/toc/blob/main/FAQ.md) | no date | project governance body |
| Measurements 3.1 and 3.2 | own corpus fetch | 2026-11-27 | independent measurement, vendor-authored pages |
| NN/g: participant "wasn't impressed" by a low share count; no threshold | [NN/g Social Proof in UX](https://www.nngroup.com/articles/social-proof-ux/) | 2014-10-19 | independent usability research |
| Customer-story outcome numbers (Ramp 75%, Hasura 10-20%, Browserbase 17%, Decagon 65% and 167%) | pages in 3.2 | undated | vendor data |

## What an agent must not decide alone

- Whether a given connection is "reasonably expected by the audience" and so needs no disclosure: owner or counsel.
- Whether B2B testimonials fall under Part 465 or only under section 5 and the Guides: counsel. Default to treating them as covered.
- Asking a person or company for permission, and the wording of that ask: owner sends it; an agent may draft questions only.
- Displaying any third-party mark (logo, badge, SOC logo): owner confirms the licence terms the agent could not read (OpenAI, Stripe Marks Usage Agreement, AICPA guidelines PDF, Clutch Terms).
- Anything touching EU consumer pages: the EU blacklist text was not verified here.
- Whether an incentive for a review is offered, and its amount.
- Accepting a quote from an employee, founder, investor or relative.
- Publishing a number as a "result" in a story: owner confirms base, window and method.
- Naming an adopter found only in public data.

## AI-agent angle

| Typical agent mistake | Smallest mechanical check |
|---|---|
| Invents a plausible testimonial, name and role to fill a proof section | Rule 1 grep and record resolver; build fails with no `data-proof` |
| Writes "Trusted by teams at Google, Stripe, OpenAI" from model memory or from dependency lists | Rule 11 and 20; every logo and name must resolve to a record |
| Paraphrases a customer's words inside quotation marks | Rule 5 diff of `published_text` against the original file |
| Adds a stock face or generated avatar next to a real quote | Rule 2 `alt` and record field check |
| Copies an exemplar's quote wall shape: undated, unlinked | Rules 7 and 23 DOM checks |
| Adds a "Source: G2" star rating or Leader badge from memory | Rules 13-14 record and listing URL check |
| Writes "SOC 2 certified" | Rule 15 grep |
| Writes a disclosure in a footer or in a collapsed "details" | Rules 8-9 DOM check |
| Labels a quote-plus-percent page "case study" | Rule 19 grep for the label and the six fields |
| Drafts review-request mail with pre-written five-star copy, or sends only to NPS promoters | Rules 4 and 16 grep and automation filter check |
| Cites Rytr as a live bar on AI testimonial tools | Citation lint: `grep -rn "Rytr"` flags; replace with 16 CFR 465.2 |
| Writes "typical" results from a single story | Rule 18 sibling-sentence check |

## Contested / evolving

- **Does Part 465 reach business customers?** For a narrow reading: 465.1 defines reviews and testimonials by "consumer", and the Q&A is silent on B2B ([FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)); the scout services-b2b #2 also reads the definitions as excluding businesses. For a wide reading: "business" is defined as any commercial entity and section 5 and the Guides cover deception of any buyer; 255.0(d) defines "product" to include "service, brand, company". Status: unresolved in the sources read; the rules above adopt the wide reading by default. Not settled by a court in anything read.
- **AI enforcement direction.** The FTC set aside Rytr as burdening AI innovation (2025-12-22, [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan)) while saying it will pursue actors who use AI to violate the law; a commentator argues enforcement may move to states ([Mintz, 2026-02-13](https://www.mintz.com/insights-center/viewpoints/54731/2026-02-13-emerging-federal-ai-strategy-ftc-sets-aside-rytr), secondary, snippet only). Trend: tool-maker liability retreating, publisher liability under 465.2 unchanged.
- **Are customer logo walls endorsements?** Under 255.0(b), "the name or seal of an organization can be endorsements" supports yes; no fetched source says a logo wall needs disclosure or permission, and both brand pages read are silent on customer display. Both sides unconfirmed; the contract treats them as endorsements.
- **Generalised solicitation scope.** Part 465.2(d)(1) exempts "generalized solicitations", yet the preamble says happy-customer-only solicitations are outside the exemption while the Q&A says there is no specific prohibition (FTC Act risk only). Differing instruments, one direction: avoid selective solicitation.
- **Exemplar practice versus the contract.** The 25 exemplar pages and 15 case studies show undated, unlinked, method-free proof as the norm; a contract that fails these builds is stricter than industry practice. Trend unknown; this corpus is vendor-authored and survivorship-biased.
- **G2 AI policy.** New from 2026-11-04 and "moving" per the scout; the page has no revision date. Re-fetch before relying on the LinkedIn-verified exception.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 (read via eCFR API, data 2026-11-20) | 16 CFR Part 465 text (primary) | in force 2024-10-21 | The rule |
| https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials (full text HTML) | Statement of Basis and Purpose (primary) | 2024-08-22 | AI, virtual influencers, generalised solicitation, penalty |
| https://www.federalregister.gov/api/v1/documents/2024-18519.json | Federal Register metadata (primary) | 2024-08-22 | Effective date |
| https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255 (via eCFR API) | 16 CFR Part 255 Endorsement Guides (primary) | 88 FR 48102, 2023-07-26 | Endorsement, material connection, typicality |
| https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | FTC staff Q&A on the rule (primary, staff) | Nov 2024 | AI avatars, featured reviews, happy-customer solicitation |
| https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | FTC staff Q&A on the Guides (primary, staff) | undated | Placement, employees, platform tools, typicality |
| https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | FTC staff disclosures page (primary, staff) | Nov 2019 | Wording and position |
| https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan | FTC press release (primary) | 2025-12-22 | Rytr set aside |
| https://www.parkerpoe.com/news/2025/12/ftc-reopens-and-vacates-prior-order-against-ai | Law-firm alert (secondary) | 2025-12-30 | Reasons summary |
| https://www.nngroup.com/articles/social-proof-ux/ | NN/g social proof (independent research) | 2014-10-19 | Low-count risk, qualitative |
| https://legal.g2.com/community-guidelines | G2 community guidelines (platform) | AI clause 2026-11-04 | Incentive cap, AI drafting, republishing terms |
| https://clutch.co/methodology | Clutch methodology (platform) | Oct 2026 | Verification, incentives, badges |
| https://aicpa-cima.com/resources/download/soc-for-service-organizations-logo-guidelines-for-service-organization | AICPA SOC logo page (authority) | 2026-04-22 | Logo eligibility; terms PDF not obtained |
| https://openai.com/brand/ | OpenAI brand guidelines (company) | (c) 2015-2026 | Implied endorsement bar |
| https://stripe.com/newsroom/brand-assets | Stripe brand assets (company) | (c) 2026 | Marks Usage Agreement, Powered by badge |
| https://github.com/cncf/toc/blob/main/FAQ.md | CNCF TOC FAQ (governance body) | undated | Adopter definition, no consent rule |
| https://webgate.ec.europa.eu/e-justice/595/EN/unfair_commercial_practices_directive_200529 | EU e-Justice UCPD overview, search result only, not read in full | undated | EU context; EUR-Lex text blocked |
| https://www.mintz.com/insights-center/viewpoints/54731/2026-02-13-emerging-federal-ai-strategy-ftc-sets-aside-rytr | Law-firm commentary (secondary, snippet) | 2026-02-13 | Enforcement outlook |
| https://posthog.com/, https://supabase.com/, https://astro.build/, https://tailwindcss.com/, https://bun.sh/, https://deno.com/, https://docs.astral.sh/uv/, https://docs.astral.sh/ruff/, https://astral.sh/, https://mise.jdx.dev/, https://zed.dev/, https://tauri.app/, https://biomejs.dev/, https://vite.dev/, https://turso.tech/, https://cal.com/, https://plausible.io/, https://sentry.io/welcome/, https://linear.app/, https://vercel.com/, https://stripe.com/, https://fly.io/, https://tailscale.com/, https://svelte.dev/, https://neon.com/ | 25 exemplar home pages, fetched 2026-11-27 (vendor-authored) | 2026-11-27 | Measurement 3.1 |
| Case-study URLs in `~/.cache/research-lang/exemplars/product/case-studies/urls.txt` (tailscale Cribl, Instacart, Mercury; supabase Chatbase, Lovable, Rally; posthog ElevenLabs, Hasura, Exa; fly.io Mocha, Steel.dev; linear Ramp, OpenAI; stripe Browserbase, Decagon) | 15 vendor case studies (vendor data) | 2026-11-27 | Measurement 3.2 |
