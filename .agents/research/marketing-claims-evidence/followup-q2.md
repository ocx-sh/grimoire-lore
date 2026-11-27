---
title: UK DMCC Act 2024 fake-review ban and CAP Code substantiation, applied to agent-written pages
program: product
topic: marketing-claims-evidence
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 13
---

# UK DMCC Act 2024 fake-review ban and CAP Code substantiation, applied to agent-written pages

Question (q2): What do the UK DMCC Act 2024 fake-review ban and the current CAP Code substantiation rule require of an agent-written page?

## Summary

1. The ban is paragraph 13 of Schedule 20 to the Digital Markets, Competition and Consumers Act 2024. It is in force since 6 April 2025. It is a per-se unfair practice: no proof of effect on a buyer is needed.
2. It bars submitting or commissioning a fake consumer review, and a consumer review that conceals that it was incentivised. "Commissioning" includes "incentivising by any means". A page an agent writes that contains a made-up quote falls under it when the page promotes a product to UK consumers.
3. Paragraph 13 breaches are excluded from the s.237 criminal offence (s.237(8)(b), read directly). They are civil, with a CMA fine of up to £300,000 or 10% of turnover (s.182).
4. It also bars publishing reviews, or information derived from reviews, "in a misleading way". "Consumer review information" includes a star average or a count built from reviews, so a rating badge is covered.
5. It adds a duty to take "reasonable and proportionate steps" to stop publication of fake or concealed-incentive reviews and to remove them. That duty needs a moderation process. No page edit can meet it.
6. The CAP Code is the second UK source. Rule 3.7 requires documentary evidence before an objective claim is published. Rules 3.44 to 3.50 restate the review ban in advertising-code form and add three duties the FTC material does not have in this form: hold documentary evidence that a testimonial is genuine plus the giver's contact details (3.47), do not feature a testimonial without permission (3.50), and display no trust mark without authorisation (3.52).
7. The test for "objective" is how the consumer reads the claim, not what the marketer meant. The ASA says puffery is not capable of substantiation, and a claim read as objective needs evidence.
8. A testimonial alone does not substantiate an objective claim, and self-reported consumer data is not enough (ASA advice, 2026-09-21).
9. The existing MKT-CLAIM rules already satisfy almost all of this. Three additions are needed: a contact-evidence pointer on endorsement rows (CAP 3.47), a ban on using an endorsement as the evidence for a performance, statistic or AI figure (CAP 3.7), and a caveat-in-place rule (CAP 3.9). All four new or changed checks were run on fixtures; output is under "Verification record".
10. Whether the UK regimes reach a given fleet page is a jurisdiction and audience question that an agent cannot settle. The rules should not branch on it: the strictest common rule is the one to run everywhere.

## Findings

### 1. DMCC Act 2024, Schedule 20, paragraph 13

Section 225(1) says "Unfair commercial practices are prohibited." Section 225(4)(c) makes a practice unfair if "it is listed in Schedule 20 (commercial practices which are in all circumstances considered unfair)" ([legislation.gov.uk, DMCC Act s.225](https://www.legislation.gov.uk/ukpga/2024/13/section/225), current revised text, read 2026-11-27). Section 225(3) defines "consumer" as "an individual acting for purposes that are wholly or mainly outside the individual's business", and "trader" as a person acting for purposes relating to their business.

Paragraph 13 of Schedule 20 ([legislation.gov.uk, Schedule 20](https://www.legislation.gov.uk/ukpga/2024/13/schedule/20), latest revised version, read 2026-11-27; the page records no outstanding effects and says the paragraph came into force on 6 April 2025 under S.I. 2025/272, reg. 2(1)(11)) reads:

- (1) "Submitting, or commissioning another person to submit or write" (a) "a fake consumer review, or" (b) "a consumer review that conceals the fact it has been incentivised."
- (2) "Publishing consumer reviews, or consumer review information, in a misleading way."
- (3) "Publishing consumer reviews, or consumer review information, without taking such reasonable and proportionate steps" as are necessary to prevent publication of fake reviews, concealed-incentive reviews and false or misleading consumer review information, "and removing any such reviews or information from publication."
- (4) "Offering services to traders" for doing or facilitating anything in (1) or (2).
- (5) definitions: "'fake consumer review' means a consumer review that purports to be, but is not, based on a person's genuine experience"; "'consumer review' means a review of a product, a trader or any other matter relevant to a transactional decision"; "'consumer review information' means information that is derived from, or is influenced by, consumer reviews"; "'commissioning' includes incentivising by any means".

Four consequences for agent-written pages:

| Sub-paragraph | What an agent could do | Caught by |
|---|---|---|
| 13(1)(a) | Write a testimonial, a "review", a persona quote in quotation marks, a star rating from nothing | MKT-CLAIM-20 (never write one without an `endorsement` record) |
| 13(1)(b) | Show an incentivised review with no disclosure | MKT-CLAIM-22 (visible disclosure in the same element) |
| 13(2) | Show "4.8 stars from 200 reviews" with the figure unchecked, or show only the positive ones as if representative | MKT-CLAIM-24 (counts with source and date), MKT-CLAIM-26 ("Selected reviews", never "All reviews") |
| 13(3) | Publish a reviews widget with no process to catch fakes | Not a page edit. A moderation duty on whoever runs the review feed. Human decision |

"Commissioning includes incentivising by any means" matters for the second ban: an incentive tied to a positive review is both a concealed-incentive problem and, in the CMA's reading, forbidden outright (section 2).

Scope limits visible in the text itself:

- The practice must be a "commercial practice" relating to the promotion or supply of a product "to a consumer" (s.225(3)). A tool sold only to developers acting for their businesses is outside the definition of consumer. A free CLI or extension that hobbyists install is arguably inside it. That is an inference from the definition, not a ruling.
- The page does not show any territorial-extent text for s.225 (the fetched page had no extent notes in the extracted text). Whether a non-UK trader's page directed at UK users is reached is not settled here (section "What could not be determined").

Penalty. Section 182 (final infringement notice) lets the CMA impose "a fixed amount not exceeding £300,000 or, if higher, 10% of the total value of the turnover (if any) of the respondent" ([DMCC Act s.182](https://www.legislation.gov.uk/ukpga/2024/13/section/182), read 2026-11-27). The text read does not say "global" turnover. The CMA's guidance says a breach "can lead to a fine of up to 10% of global turnover, and potentially be a criminal offence" ([CMA, Reviews: guidance for businesses and agencies, updated 2025-08-28](https://www.gov.uk/government/publications/reviews-and-social-media-endorsements-guidance-for-businesses-and-brands/online-reviews-giving-consumers-the-full-picture)). The CMA's criminal-offence line is generic. Section 237 settles it for paragraph 13. Read directly from the legislation.gov.uk section page (revised text, "no known outstanding effects", in force 2025-04-06 by S.I. 2025/272 reg. 2(1)(3); the enacted version is word-for-word the same, fetched with `curl https://www.legislation.gov.uk/ukpga/2024/13/section/237/data.htm` and `.../section/237/enacted/data.htm`, 2026-11-27): "(7) A trader commits an offence if, in breach of section 225(1), the trader engages in a commercial practice which is unfair by virtue of it being of a description listed in Schedule 20 (see section 225(4)(c)) other than an excluded description. (8) The following are excluded descriptions for the purposes of subsection (7) — (a) the description of practice mentioned in paragraph 12 of Schedule 20; (b) the descriptions of practices mentioned in paragraph 13 of that Schedule; (c) the description of practice mentioned in paragraph 30 of that Schedule." ([DMCC Act s.237](https://www.legislation.gov.uk/ukpga/2024/13/section/237)). So a paragraph 13 breach is not a s.237 criminal offence. It is a civil, CMA-enforced matter with the s.182 fine. The CMA sentence that a breach of its guidance "can lead to a fine of up to 10% of global turnover, and potentially be a criminal offence" covers all the practices the guidance spans, and its "criminal action" line ("Writing or commissioning fake reviews could lead to a substantial penalty or criminal action", re-read 2026-11-27) does not fit the text of s.237(8)(b) for paragraph 13 alone. This report does not resolve that tension beyond stating the statute. Another route to criminal liability for fake reviews (for example the Fraud Act) was not examined.

### 2. CMA guidance for businesses

The CMA page (updated 2025-08-28, no original date shown) tells traders:

- Do not pretend to be a customer to write reviews of your own products or others'.
- Do not commission third parties to write fake reviews. You "may be liable for their actions."
- Do not offer money or gifts to customers in exchange for positive reviews.
- If you use a PR, marketing or SEO agency, make sure it follows the same rules.

"Product" there covers "goods, services and digital content". The page says nothing on AI-generated reviews, on firms outside the UK, or on "reasonable and proportionate steps". An agent that writes copy for a business is, for this guidance, the closest thing to the "agency" role: the business remains liable for what the agent commissions or publishes.

### 3. CAP Code section 3

The current rules, read from the ASA's rule pages (section page carries no edition date; read 2026-11-27: [CAP Code section 3](https://www.asa.org.uk/type/non_broadcast/code_section/03.html)):

| Rule | Text (quoted as extracted, truncated by the tool) | Effect on a page |
|---|---|---|
| 3.1 | "Marketing communications must not materially mislead or be likely to do so." | Base test |
| 3.2 | "Obvious exaggerations ('puffery')" and claims consumers are unlikely to take literally "are allowed provided they do not materially mislead." | Puffery allowed if not read literally |
| 3.3 | Must not omit material information | Omissions count |
| 3.7 | "marketers must hold documentary evidence to prove claims that consumers are likely to regard as objective." "The ASA may regard claims as misleading in the absence of adequate substantiation." | Evidence record before publication |
| 3.9 | "must not mislead by omitting significant limitations and qualifications"; qualifications "must not mislead by contradicting the claims that they qualify" | Caveats must be present and consistent |
| 3.11 | "must not mislead consumers by exaggerating the capability or performance of a product" | Capability copy |
| 3.12 | "must not present rights given to consumers in law as a distinctive feature of the marketer's offer" | Do not sell a statutory right as a perk |
| 3.33 | compare "products meeting the same needs or intended for the same purpose" | Comparison tables |
| 3.44 | "must not contain fake consumer reviews"; fake means one that "purports to be, but is not, based on a person's genuine experience" | Same definition as DMCC |
| 3.45 | "must make clear where consumer reviews have been incentivised" | Disclosure |
| 3.46 | must not publish reviews or review information "in a misleading way"; examples include publishing only positive reviews and omitting that a reviewer was commissioned | Curated sets |
| 3.47 | "must hold documentary evidence that a testimonial or endorsement ... is genuine," unless obviously fictitious, "and ... the giver's contact details" | Proof on file |
| 3.48 | testimonials "must relate to the advertised product" | Wrong-product quotes |
| 3.49 | factual claims inside a testimonial "must not mislead" | A quote does not launder a claim |
| 3.50 | no testimonial "without permission"; exceptions "normally" for accurate statements from a published source | Permission |
| 3.52 | no "trust mark, quality mark or equivalent without the necessary authorisation" | Badges |

Evidence timing and quality, from the ASA substantiation advice (dated 2026-09-21, [ASA advice online, Substantiation](https://www.asa.org.uk/advice-online/substantiation.html)): evidence must be held "before distributing or submitting a marketing communication for publication"; "self-reported consumer data or other subjective data will not be sufficient" for objective claims; testimonials "alone are unlikely to be considered sufficient to substantiate objective claims". The page does not define "documentary evidence"; what is needed depends on the product, the level of claim and the context.

Objective versus puffery, from the ASA advice dated 2026-03-12 ([ASA, Types of claims: puffery and expressions of opinion](https://www.asa.org.uk/advice-online/types-of-claims-puffery-and-expressions-of-opinion.html)): "The ASA will consider a consumer's likely interpretation of a claim, rather than the marketer's intention." Examples: "THE BEST SINCE 2004" was read as subjective (2020 ruling); "superfast in the kitchen" was not read as a speed guarantee (2019 ruling); "the perfect network" was read as objective and needed evidence (2022 ruling). So "best" and "fast" can fall either side. An agent cannot predict the side. A mechanical word list over-captures, which is the safe direction.

Reach of the Code, from [ASA, Remit: Own websites](https://www.asa.org.uk/advice-online/remit-own-websites.html) (dated 2026-02-26): the Code covers claims on a marketer's "own website or in other non-paid-for space online under their control", including social media feeds, since 2011. For cross-border marketers the page names one extension since September 2025: non-paid-for online communications targeted at UK consumers by advertisers subject to UK licensing conditions that require CAP Code compliance. The page does not state how an ordinary overseas advertiser is brought in, and does not address business-to-business material. Rule 1.8 on the Code's section 1 page says "Primary responsibility for observing the Code falls on marketers" and that agencies and service suppliers "also accept an obligation to abide by the Code" ([CAP Code section 1](https://www.asa.org.uk/type/non_broadcast/code_section/01.html), read 2026-11-27).

### 4. How the UK text compares with what MKT-CLAIM already requires

| UK requirement | Existing rule | Gap |
|---|---|---|
| Evidence before an objective claim (CAP 3.7) | MKT-CLAIM-01 to 05 (record before publication, lint) | None. FTC and ASA agree on timing |
| Fake review definition (DMCC 13(5), CAP 3.44) | MKT-CLAIM-20 | None. Same meaning as 16 CFR 465.2(a) |
| Incentivised disclosure (13(1)(b), CAP 3.45) | MKT-CLAIM-22 | None |
| Misleading publication of reviews (13(2), CAP 3.46) | MKT-CLAIM-24, 26, 25 | None for page copy |
| Moderation duty (13(3)) | none | Not a copy rule. Owner decision if a review feed is ever added |
| Contact details of the giver held (CAP 3.47) | `permission_ref` exists. No contact pointer | Gap: add field |
| Permission to feature a testimonial (CAP 3.50) | `permission` and `permission_ref` | None |
| Trust mark needs authorisation (CAP 3.52) | MKT-CLAIM-20 requires a record for every badge | Gap: the record need not name who authorised the badge. Change MKT-CLAIM-20 |
| Testimonial alone does not substantiate an objective claim (ASA advice) | The record's `source_type` list has no endorsement value, but nothing forbids pointing `source` at an endorsement row | Gap: add MKT-CLAIM-27 |
| Qualifications must accompany the claim and not contradict it (CAP 3.9) | `caveat` field exists on the record. No rule puts it on the page | Gap: add MKT-CLAIM-28 |

## Effect on the ruleset

**MKT-CLAIM-20: change.** Keep the existing text. Add one sentence: "Every `endorsement` row with `kind = "badge"` has a `permission_ref` of the form `<authorising party>: <pointer>`, where the pointer is a URL or a repository path that exists." Rationale to add: DMCC Act 2024 Schedule 20 paragraph 13(1)(a) and CAP Code 3.44 define a fake review as one that "purports to be, but is not, based on a person's genuine experience" ([Schedule 20, revised text, read 2026-11-27](https://www.legislation.gov.uk/ukpga/2024/13/schedule/20)); 16 CFR 465.2(a) reaches the same writing by a different test, a review that "materially misrepresents ... (1) That the reviewer or testimonialist exists; (2) ... used or otherwise had experience ... or (3) ... experience" ([eCFR Part 465, current text via the eCFR API, read 2026-11-27, last amended 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)). The wording differs, the effect on an invented quote is the same. CAP 3.52 bars a "trust mark, quality mark or equivalent without the necessary authorisation" ([CAP Code s.3, no edition date, read 2026-11-27](https://www.asa.org.uk/type/non_broadcast/code_section/03.html)), so a badge record must say who authorised it. Verify (addition to the existing verify): `python3 -I lint_q2.py 20 claims.toml` fails a badge row whose `permission_ref` is not `<party>: <pointer>` or whose non-URL pointer fails `test -e`. Tested on fixtures, see "Verification record": the good file prints `OK` (exit 0); the bad file reports `g2-leader` (no party prefix) and `g2-missing` (pointer does not exist) and exits 1. The check reads the `kind` and `permission_ref` fields of MKT-CLAIM-04's endorsement row. It checks that a party is named, not that the party really authorised the badge.

**MKT-CLAIM-21: change.** Add `contact_ref` to the endorsement `extra fields` list in MKT-CLAIM-04: a pointer to where the owner keeps the giver's contact details, never the details themselves (same reasoning as C2). New last sentence of MKT-CLAIM-21: "Every `endorsement` row has a non-empty `contact_ref` and a `permission_ref`; `contact_ref` is a pointer, never an email address or phone number." Rationale to add: CAP 3.47 requires the marketer to "hold documentary evidence that a testimonial or endorsement ... is genuine" and "the giver's contact details", and 3.50 requires permission ([CAP Code s.3, read 2026-11-27](https://www.asa.org.uk/type/non_broadcast/code_section/03.html)). Verify: `python3 -I lint_q2.py 21 claims.toml`, an addition to check A. Output on the fixtures:

```
$ python3 -I lint_q2.py 21 good/claims.toml
OK
exit=0
$ python3 -I lint_q2.py 21 bad/claims.toml
[('quote-anna', 'missing contact_ref or permission_ref'), ('quote-bob', 'contact_ref holds contact details, not a pointer')]
exit=1
```

The bad fixture's `quote-anna` has no `contact_ref`; `quote-bob` has `contact_ref = "bob@example.com"`. The check cannot tell whether a pointer resolves to a real record in the owner's store.

**MKT-CLAIM-22: confirm.** Matches DMCC 13(1)(b) and CAP 3.45. Add both to the rationale.

**MKT-CLAIM-24: confirm.** Rating averages and review counts are "consumer review information" under 13(5), so a misleading figure falls under 13(2). The existing rule (number, source link, retrieval date) is the page-level control.

**MKT-CLAIM-25: confirm SHOULD, no change.** The UK text read does not settle the question of requesting reviews only from satisfied customers. 13(2) and CAP 3.46 concern what is published. Leave as the conservative reading.

**MKT-CLAIM-26: confirm.** Add to rationale: CAP 3.46 names publishing only positive reviews as misleading, and DMCC 13(2) covers misleading publication. The CMA says "do not offer inducements (money or gifts) to customers to write positive reviews about your business" ([CMA, updated 2025-08-28](https://www.gov.uk/government/publications/reviews-and-social-media-endorsements-guidance-for-businesses-and-brands/online-reviews-giving-consumers-the-full-picture), re-read 2026-11-27). 16 CFR 465.4 bars a business to "provide compensation or other incentives in exchange for, or conditioned expressly or by implication on, the writing or creation of consumer reviews expressing a particular sentiment" ([eCFR Part 465, current text, last amended 2024-10-21](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)). The two agree: an incentive tied to positive sentiment is out. This is not a page-copy check; it belongs to the existing human-ask list.

**MKT-CLAIM-06, 07, 19: confirm.** CAP 3.7 and 3.11 require evidence before publication of objective performance and capability claims, the same order as MKT-CLAIM-01.

**NEW MKT-CLAIM-27 (MUST).** Never use an endorsement, testimonial, review or customer statement as the `source` of a `performance`, `comparison`, `statistic`, `count` or `ai-capability` claim, and never give such a row a `claim` string that is text from an endorsement quote. A customer quote may appear beside such a claim only as a quote, with its own `endorsement` row, and the objective claim keeps its own measurement record.
- *Rationale:* the ASA says testimonials "alone are unlikely to be considered sufficient to substantiate objective claims" and that self-reported consumer data is not sufficient ([ASA, 2026-09-21](https://www.asa.org.uk/advice-online/substantiation.html)); CAP 3.49 says a factual claim in a testimonial must not mislead ([CAP Code s.3, read 2026-11-27](https://www.asa.org.uk/type/non_broadcast/code_section/03.html)). An agent asked to "back up" a number will reach for a quote.
- *Verify:* `python3 -I lint_q2.py 27 claims.toml`, an addition to check E. For each row of the five classes it fails when `source` equals the `id`, the `original_ref` or the `permission_ref` of an endorsement row, when `source_type` is `endorsement`, or when the row's `claim` string is contained in an endorsement row's `claim` (the quote). Output on the fixtures:

```
$ python3 -I lint_q2.py 27 good/claims.toml
OK
exit=0
$ python3 -I lint_q2.py 27 bad/claims.toml
[('install-time', 'source is an endorsement'), ('love', 'claim string is text of an endorsement quote')]
exit=1
```

`install-time` fails on its `source`; `love` fails because its claim text is the first words of the quote in `quote-anna`. Limit: a substring test misses a paraphrase of a quote.

**NEW MKT-CLAIM-28 (SHOULD).** When a record has a non-empty `caveat`, show that caveat string in the same element as the claim or in the element directly after it, not in a footer, tooltip, `<details>` or linked page. A caveat may not contradict the headline claim.
- *Rationale:* CAP 3.9: marketing "must not mislead by omitting significant limitations and qualifications", and a qualification must not contradict the claim it qualifies ([CAP Code s.3, read 2026-11-27](https://www.asa.org.uk/type/non_broadcast/code_section/03.html)). This is the UK form of the "clear and conspicuous" test the FTC applies to "free" (MKT-CLAIM-13). `window` and `subject_version` limits stay under MKT-CLAIM-04 and its siblings; this rule covers the `caveat` field only.
- *Verify:* `python3 -I lint_q2.py 28 claims.toml` on the built HTML named in each row's `surface`. It finds the element whose own text holds the `claim` string outside any `<details>`, then requires the `caveat` string in that element or its next sibling, ignoring text in `<details>` and in elements with a `title=` attribute. A row with an empty `caveat`, an `endorsement` row, and a non-`.html` surface are skipped. Output on the fixtures:

```
$ python3 -I lint_q2.py 28 good/claims.toml
OK
exit=0
$ python3 -I lint_q2.py 28 bad/claims.toml
[('install-time', 'caveat not in same element or next sibling')]
exit=1
$ python3 -I lint_q2.py 28 bad/claims2.toml
[('install-time', 'caveat not in same element or next sibling')]
exit=1
```

`bad/index.html` puts the caveat inside `<details>`; `bad/index2.html` puts it in `title=`. Both fail. Limits: it does not check `aria-describedby` targets, tooltips from a script library, or CSS-hidden text; it does not judge contradiction, which stays a reading check. SHOULD because the caveat string is owner-written and not every caveat belongs inline.

**Preamble to the ruleset (scope sentence): change.** Add: "The rules run unchanged for every surface. Whether the UK DMCC Act or the CAP Code reaches a surface depends on who the page is aimed at; an agent never decides that. It applies the strictest common form." Reason: the rules above are already the union of FTC, EU and UK text, and no UK rule here is looser than an existing one.

**What an agent must ask a human: add one line.** "Whether a surface is aimed at UK consumers (as distinct from developers acting for their business), and, if a review or rating feed is ever added, who runs the 'reasonable and proportionate steps' process of DMCC Schedule 20 paragraph 13(3)."

**Decay table: add a row.** Rules 20 to 28: DMCC Schedule 20 para 13 (in force 2025-04-06), CAP Code s.3 rules 3.7, 3.9, 3.44 to 3.52, ASA substantiation advice (2026-09-21), CMA reviews guidance (2025-08-28). Refresh 6 months; next due 2027-05-27.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| DMCC Sch. 20 para 13 text and definitions, in force 2025-04-06 under S.I. 2025/272 reg. 2(1)(11) | [Schedule 20](https://www.legislation.gov.uk/ukpga/2024/13/schedule/20) | revised text, read 2026-11-27 |
| Consumer, trader, commercial practice definitions | [s.225](https://www.legislation.gov.uk/ukpga/2024/13/section/225) | read 2026-11-27 |
| Penalty cap £300,000 or, if higher, 10% of turnover (text does not say global) | [s.182](https://www.legislation.gov.uk/ukpga/2024/13/section/182) | read 2026-11-27 |
| s.237(7) offence excludes paragraph 13 practices (s.237(8)(b)); in force 2025-04-06 | [s.237](https://www.legislation.gov.uk/ukpga/2024/13/section/237) | revised and enacted text identical, read directly 2026-11-27 |
| 16 CFR 465.2(a) and 465.4 text | [eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465) | read via the eCFR API `versions` and `full/2026-11-20` endpoints 2026-11-27; sections last amended 2024-10-21 |
| CMA reviews guidance: no fake reviews, no commissioning, no incentives for positive reviews, agencies bound; fine up to 10% of global turnover | [gov.uk](https://www.gov.uk/government/publications/reviews-and-social-media-endorsements-guidance-for-businesses-and-brands/online-reviews-giving-consumers-the-full-picture) | updated 2025-08-28 (vendor label: regulator guidance, states it is not legal advice) |
| CAP Code rules 3.1 to 3.12, 3.33, 3.44 to 3.54 | [CAP Code s.3](https://www.asa.org.uk/type/non_broadcast/code_section/03.html) | page has no edition date; read 2026-11-27 |
| ASA substantiation advice: evidence before publication; testimonials alone not enough | [ASA](https://www.asa.org.uk/advice-online/substantiation.html) | 2026-09-21 |
| ASA puffery advice: consumer's likely interpretation | [ASA](https://www.asa.org.uk/advice-online/types-of-claims-puffery-and-expressions-of-opinion.html) | 2026-03-12 |
| ASA own-website remit; cross-border extension since 2025-09 for licensed advertisers | [ASA](https://www.asa.org.uk/advice-online/remit-own-websites.html) | 2026-02-26 |
| CAP rule 1.8: primary responsibility on marketers; agencies also bound | [CAP Code s.1](https://www.asa.org.uk/type/non_broadcast/code_section/01.html) | no date; read 2026-11-27 |

## What could not be determined

1. Territorial reach of DMCC Part 3 (unfair practices) over an overseas trader. The fetched s.225 page showed no extent text. Missing: the Act's extent and application provisions, or CMA guidance on non-UK traders. A lawyer or the CMA's own statement would settle it.
2. Whether "turnover" in s.182 is global. The subsection says "the total value of the turnover (if any) of the respondent". Missing: the interpretation provision or the CMA's penalty guidance. The CMA guidance page says "global turnover".
3. Whether any other UK offence (for example under the Fraud Act 2006) reaches a fake review. s.237 does not for paragraph 13; no other statute was examined. Missing: a lawyer's view or CMA/CPS guidance.
4. Whether the CAP Code covers business-to-business claims on a developer-tool page. Rule 3.7 speaks of what "consumers" regard as objective. The ASA own-website page does not address B2B, and the Code's scope pages (section 1 and the introduction) did not return scope text. Missing: the CAP Code introduction and scope rules (the introduction URL guessed returned 404) or an ASA ruling on a B2B software advertiser.
5. How an ordinary overseas advertiser with no UK licence is brought into CAP scope. The 2026-02-26 page names only the licensed-advertiser extension. A search snippet mentioned a ".uk domain" and paid-targeting criteria, but the page read did not contain them, so they are not used here.
6. Whether DMCC covers AI-generated reviews expressly. The paragraph 13 text speaks of a review that "purports to be, but is not, based on a person's genuine experience", which an agent-written quote meets on its face, but no UK source read states that AI authorship is covered. The FTC source in the existing ruleset does.
7. What the CMA means by "reasonable and proportionate steps". The CMA page read does not mention them.

## Sources

| URL | What | Date | Primary |
|---|---|---|---|
| https://www.legislation.gov.uk/ukpga/2024/13/schedule/20 | DMCC Act Schedule 20, para 13 | revised, read 2026-11-27 | yes |
| https://www.legislation.gov.uk/ukpga/2024/13/section/225 | s.225 prohibition, definitions | read 2026-11-27 | yes |
| https://www.legislation.gov.uk/ukpga/2024/13/section/182 | s.182 penalty cap | read 2026-11-27 | yes |
| https://www.legislation.gov.uk/ukpga/2024/13/section/237 | s.237 offences, revised text, read directly | read 2026-11-27 | yes |
| https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 | 16 CFR 465.2, 465.4 (text from the eCFR API) | amended 2024-10-21, read 2026-11-27 | yes |
| https://www.asa.org.uk/type/non_broadcast/code_section/03.html | CAP Code section 3 | no edition date | yes |
| https://www.asa.org.uk/type/non_broadcast/code_section/01.html | CAP Code section 1 (rule 1.8) | no edition date | yes |
| https://www.asa.org.uk/type/non_broadcast/code_index/substantiation.html | CAP rule 3.7 text | no date | yes |
| https://www.asa.org.uk/advice-online/substantiation.html | ASA substantiation advice | 2026-09-21 | regulator advice |
| https://www.asa.org.uk/advice-online/types-of-claims-puffery-and-expressions-of-opinion.html | ASA puffery advice | 2026-03-12 | regulator advice |
| https://www.asa.org.uk/advice-online/remit-own-websites.html | ASA own-website remit | 2026-02-26 | regulator advice |
| https://www.gov.uk/government/publications/reviews-and-social-media-endorsements-guidance-for-businesses-and-brands/online-reviews-giving-consumers-the-full-picture | CMA reviews guidance | 2025-08-28 | regulator guidance |

Law-firm summaries surfaced in search (CMS, Taylor Wessing, BCLP, Davis Polk) were not opened and are not cited as support.

## Verification record

All of this ran on 2026-11-27 in the scratch directory `~/.cache/research-lang/exemplars/product/wave2/q2repair/` (Python 3.14.10). No `claims.toml` exists yet in the fleet: the lint is a commitment of MKT-CLAIM-01. The fixtures were therefore written from the field table in MKT-CLAIM-04 of `marketing-claims-evidence.md`, which the commands are checked against: `id`, `class`, `claim`, `surface`, `source`, `source_type`, `window`, `subject_version`, `caveat` are common fields; `kind`, `original_ref`, `permission`, `permission_ref` are endorsement extra fields; `contact_ref` is the new field of MKT-CLAIM-21. An endorsement's quote is its `claim` string. What is not proven: that the fixtures match the real file once it exists. Rewrite the fixtures from the real file when it appears.

The first draft of the check for rule 28 passed the bad fixture because `<details>` children were not excluded. The run above is the corrected script.

### Script `lint_q2.py`

```python
#!/usr/bin/env python3
"""Checks for MKT-CLAIM-20, 21, 27, 28. Usage: lint_q2.py <check> <claims.toml>  (exit 1 on any failure)"""
import sys, re, tomllib, os
from html.parser import HTMLParser
chk, path = sys.argv[1], sys.argv[2]
base = os.path.dirname(os.path.abspath(path))
rows = tomllib.load(open(path, 'rb')).get('claim', [])
OBJ = ('performance', 'comparison', 'statistic', 'count', 'ai-capability')
endo = [r for r in rows if r.get('class') == 'endorsement']
bad = []
def has(r, k): return bool(str(r.get(k, '')).strip())

if chk == '21':   # contact_ref + permission_ref on every endorsement; contact_ref is a pointer, not the details
    for r in endo:
        c = str(r.get('contact_ref', ''))
        if not (has(r, 'contact_ref') and has(r, 'permission_ref')): bad.append((r['id'], 'missing contact_ref or permission_ref'))
        elif '@' in c or len(re.sub(r'\D', '', c)) >= 7: bad.append((r['id'], 'contact_ref holds contact details, not a pointer'))
elif chk == '20':  # badge rows: permission_ref = "<authorising party>: <pointer>"; a non-URL pointer must exist
    for r in endo:
        if r.get('kind') != 'badge': continue
        m = re.fullmatch(r'([^:]{2,}): (\S+)', str(r.get('permission_ref', '')))
        if not m: bad.append((r['id'], 'permission_ref is not "<party>: <pointer>"')); continue
        p = m.group(2)
        if not re.match(r'https?://', p) and not os.path.exists(os.path.join(base, p)): bad.append((r['id'], 'pointer ' + p + ' does not exist'))
elif chk == '27':  # no objective row is sourced from, or restates, an endorsement
    ids = {r['id'] for r in endo}
    refs = {str(r[k]) for r in endo for k in ('original_ref', 'permission_ref') if r.get(k)}
    quotes = [str(r.get('claim', '')) for r in endo if r.get('claim')]
    for r in rows:
        if r.get('class') not in OBJ: continue
        s, cl = r.get('source'), str(r.get('claim', ''))
        if s in ids or s in refs or r.get('source_type') == 'endorsement': bad.append((r['id'], 'source is an endorsement'))
        elif any(cl and cl in q for q in quotes): bad.append((r['id'], 'claim string is text of an endorsement quote'))
elif chk == '28':  # the limit sits in the same element or its next sibling; not in details or a title= attribute
    class N:
        def __init__(s, tag, attrs, parent): s.tag, s.attrs, s.parent, s.kids, s.txt = tag, dict(attrs), parent, [], []
    class T(HTMLParser):
        def __init__(s): super().__init__(); s.root = s.cur = N('root', [], None)
        def handle_starttag(s, t, a):
            n = N(t, a, s.cur); s.cur.kids.append(n); s.cur = n
            if t in ('br', 'img', 'meta', 'link', 'hr', 'input'): s.cur = n.parent
        def handle_endtag(s, t):
            if s.cur.parent: s.cur = s.cur.parent
        def handle_data(s, d): s.cur.txt.append(d)
    walk = lambda n: [n] + [x for k in n.kids for x in walk(k)]
    own = lambda n: ' '.join(n.txt)
    def inside_details(n):
        while n:
            if n.tag == 'details': return True
            n = n.parent
        return False
    for r in rows:
        if r.get('class') == 'endorsement' or not str(r.get('caveat', '')).strip(): continue
        for f in r.get('surface', []):
            if not f.endswith('.html'): continue
            t = T(); t.feed(open(os.path.join(base, f)).read())
            host = [n for n in walk(t.root) if str(r['claim']) in own(n) and not inside_details(n)]
            if not host: bad.append((r['id'], 'claim not found outside details')); continue
            n = host[-1]; sib = n.parent.kids; k = sib.index(n)
            zone = [n] + ([sib[k + 1]] if k + 1 < len(sib) else [])
            ok = any(str(r['caveat']) in ' '.join(own(x) for x in walk(z) if not inside_details(x) and 'title' not in x.attrs) for z in zone)
            if not ok: bad.append((r['id'], 'caveat not in same element or next sibling'))
print(bad if bad else 'OK'); sys.exit(1 if bad else 0)
```

### Fixture `good/claims.toml`

```toml
[[claim]]
id = "install-time"
class = "performance"
claim = "Installs in 4.2 s"
surface = ["index.html"]
value = 4.2
unit = "s"
source = "bench/install.csv"
source_type = "own-measurement"
window = "10 runs"
subject_version = "grim 0.16.0"
caveat = "Warm cache, Linux x86-64."
observed = 2026-11-27
refresh_by = "next-release"

[[claim]]
id = "quote-anna"
class = "endorsement"
kind = "quote"
claim = "Best tool we adopted this year"
surface = ["index.html"]
original_ref = "https://example.test/post/1"
permission = { type = "written" }
permission_ref = "proof/g2-badge.pdf"
contact_ref = "vault://contacts/anna"

[[claim]]
id = "g2-leader"
class = "endorsement"
kind = "badge"
claim = "G2 Leader 2026"
surface = ["index.html"]
permission = { type = "public-statement" }
permission_ref = "G2 Inc: proof/g2-badge.pdf"
contact_ref = "vault://contacts/g2"
```

### Fixture `bad/claims.toml`

```toml
[[claim]]
id = "install-time"
class = "performance"
claim = "Installs in 4.2 s"
surface = ["index.html"]
source = "quote-anna"
source_type = "own-measurement"
caveat = "Warm cache, Linux x86-64."

[[claim]]
id = "love"
class = "statistic"
claim = "Best tool we adopted this year"
surface = ["index.html"]
source = "bench/x.csv"

[[claim]]
id = "quote-anna"
class = "endorsement"
kind = "quote"
claim = "Best tool we adopted this year, 3x faster"
original_ref = "https://example.test/post/1"
permission_ref = "proof/g2-badge.pdf"

[[claim]]
id = "quote-bob"
class = "endorsement"
kind = "quote"
claim = "Great"
permission_ref = "proof/g2-badge.pdf"
contact_ref = "bob@example.com"

[[claim]]
id = "g2-leader"
class = "endorsement"
kind = "badge"
claim = "G2 Leader 2026"
permission_ref = "proof/g2-badge.pdf"
contact_ref = "vault://c"

[[claim]]
id = "g2-missing"
class = "endorsement"
kind = "badge"
claim = "Clutch Verified"
permission_ref = "Clutch: proof/nope.pdf"
contact_ref = "vault://c"
```

HTML fixtures: `good/index.html` is `<html><body><p>Installs in 4.2 s <span>Warm cache, Linux x86-64.</span></p></body></html>`; `bad/index.html` is `<html><body><p>Installs in 4.2 s</p><details><p>Warm cache, Linux x86-64.</p></details></body></html>`; `bad/index2.html` is `<p title="Warm cache, Linux x86-64.">Installs in 4.2 s</p><p>Other.</p>`. `good/proof/g2-badge.pdf` and `bad/proof/g2-badge.pdf` are one-byte files; `bad/proof/nope.pdf` does not exist. `bad/claims2.toml` is `bad/claims.toml` with `index.html` replaced by `index2.html`.

### Rule 20 output

```
$ python3 -I lint_q2.py 20 good/claims.toml
OK
exit=0
$ python3 -I lint_q2.py 20 bad/claims.toml
[('g2-leader', 'permission_ref is not "<party>: <pointer>"'), ('g2-missing', 'pointer proof/nope.pdf does not exist')]
exit=1
```
