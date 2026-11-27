---
title: Does 16 CFR Part 465 reach business-to-business testimonials?
program: product
topic: marketing-claims-evidence
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 9
---

# Does 16 CFR Part 465 reach business-to-business testimonials?

## Answer

Partly. The answer splits on who speaks, not on who buys.

1. **A quote from a named individual who used the product is in scope, even when the buyer is a company.** Part 465 has no business-to-business carve-out and no "consumer means a person buying for personal use" limit. The rule defines a consumer testimonial by what the audience believes: a message that "consumers are likely to believe reflects the opinions, beliefs, or experiences of a consumer who has purchased, used, or otherwise had experience with a product, service, or business" (16 CFR 465.1(f), [eCFR, point-in-time 2026-11-01](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), read 2026-11-27). The FTC says in the preamble: "For purposes of the rule, a consumer is a person who purchased, used, or otherwise had experience with a product, service, or business" ([Federal Register, 2024-08-22, 89 FR 68034 area](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)). A developer quoted as "Staff Engineer, Acme" has used the product. No text excludes her because she used it at work. That reading is this report's inference from the definition. The preamble does not discuss business use.
2. **A statement by an organisation is out of scope, except for 465.6.** The FTC substituted "individual" for "person" in the testimonial definitions to make this clear: "the Commission did not intend for any provision using the term 'testimonials' to apply to endorsements by entities", and "The only section of the rule that applies to endorsements by entities or purported entities is Sec. 465.6" (Federal Register, 2024-08-22). The FTC Q&A repeats it: the terms "celebrity testimonial" and "consumer testimonial" "do not include endorsements by business or other entities" ([FTC Q&A, page dated November 2024](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)). So a customer logo, an "Acme uses us" line, an ADOPTERS.md row and a quote credited to a company rather than a person are not Part 465 testimonials.
3. **Section 5 and the Endorsement Guides still reach the organisation case.** The Federal Register says entity endorsements "are addressed in the Commission's Endorsement Guides, 16 CFR 255.4". The Guides state their basis as "the application of section 5 of the FTC Act ... to the use of endorsements and testimonials in advertising" and define an endorsement to include "the name or seal of an organization" (16 CFR 255.0(a) and (b), [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), point-in-time 2026-11-01). Section 5 itself is not limited to consumers: it declares unlawful "unfair or deceptive acts or practices in or affecting commerce" and directs the FTC to "prevent persons, partnerships, or corporations" from using them; "consumers" appears only in subsection (n) ([15 U.S.C. 45, Cornell LII](https://www.law.cornell.edu/uscode/text/15/45), read 2026-11-27). An FTC staff opinion applies Section 5 to advertising by "franchisors, as well as other sellers of business arrangements" ([FTC staff opinion 06-1, 2006-01-30](https://www.ftc.gov/policy/advisory-opinions/informal-staff-advisory-opinion-06-1)). The Guides are "administrative interpretations", not binding rules: violations bring "corrective action ... under section 5" only after investigation (255.0(a)).
4. **The rule sections that name no "consumer" reach commercial buyers by their text.** 465.8(b) bars anyone from purchasing or procuring fake indicators of social media influence that "materially misrepresent their influence or importance for a commercial purpose" (16 CFR 465.8(b), [eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), point-in-time 2026-11-01, read 2026-11-27). The Guides give the same example for "potential clients, purchasers, investors, partners, or employees" (16 CFR 255.0, Example 13, [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), point-in-time 2026-11-01, read 2026-11-27: "it is a deceptive practice for users of social media platforms to purchase or create indicators of social media influence and then use them to misrepresent such influence to potential clients, purchasers, investors, partners, or employees or to anyone else for a commercial purpose"). A bought star count shown to a business buyer is inside 465.8(b).

## What is settled and what is inferred

| Question | Status | Basis |
|---|---|---|
| Entity endorsement (logo, company quote, adopter name) is outside the testimonial sections | Settled | FTC preamble and Q&A, quoted above |
| 465.6 reaches company-controlled "independent" review sites, including B2B ones | Settled by text | 16 CFR 465.6 ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), point-in-time 2026-11-01): "a website, organization, or entity that it controls ... provides independent reviews or opinions, other than consumer reviews, about a category of businesses, products, or services". The FTC Q&A ([page dated November 2024](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers), fetched 2026-11-27) says: "The scope of the provision is broader than just websites, and it’s broader than just websites that solely post reviews." |
| A named individual's quote about a product used at work is a consumer testimonial | Inferred | Definition 465.1(f) plus the preamble's "a person who purchased, used, or otherwise had experience". No FTC text on business use. |
| A review on a B2B review platform (G2-style) is a consumer review | Inferred, likely | 465.1(d): "a consumer's evaluation ... of a product, service, or business" posted to a platform "dedicated in whole or in part to receiving and displaying such evaluations". Same reasoning as the line above. |
| An FTC action under Part 465 for a B2B software testimonial | Not found | No case or Q&A entry addresses it. The search found none (see "What could not be determined"). |

## Effect on the ruleset

Common verification script for the `organisation` kind, saved as `check_org.py` and run as `python3 -I check_org.py claims.toml` (exit 0 pass, exit 1 fail). It reads the `endorsement` rows of `claims.toml` (field names from the consolidation's record table: `kind`, `who`, `permission`, `permission_ref`, `connection`, `disclosure_text`). Tested on a scratch fixture in `~/.cache/research-lang/exemplars/product/wave2/q3r/fx`:

```
import sys,tomllib,re
rows=[r for r in tomllib.load(open(sys.argv[1],'rb'))['row'] if r.get('class')=='endorsement']
bad=[]
for r in rows:
    k=r.get('kind')
    if k not in('individual','organisation'): bad.append((r['id'],'kind'))
    if k=='organisation':
        if r.get('permission',{}).get('type') not in('written','public-statement'): bad.append((r['id'],'permission.type'))
        if not r.get('permission_ref'): bad.append((r['id'],'permission_ref'))
        if not re.match(r'^[^,]+, \S.*$',r.get('who','')): bad.append((r['id'],'who needs "Name, Role"'))
    if any(r.get('connection',{}).values()) and not r.get('disclosure_text'): bad.append((r['id'],'disclosure_text'))
for b in bad: print('FAIL',*b)
sys.exit(1 if bad else 0)
```

Measured run (fixture row `e2` is an organisation quote with an inferred permission, empty `permission_ref`, `who = "Acme"`, paid connection and no disclosure; row `e1` is a valid individual):

```
$ python3 -I check_org.py claims.toml
FAIL e2 permission.type
FAIL e2 permission_ref
FAIL e2 who needs "Name, Role"
FAIL e2 disclosure_text
exit 1
(after fixing e2: permission written, permission_ref set, who = "Bo Kim, CTO", disclosure_text = "Paid testimonial")
$ python3 -I check_org.py claims.toml
exit 0
```

**MKT-CLAIM-20: change (rationale, plus a second verify line; the rule stays MUST).** The rationale cites 465.2(a) alone. For a company quote, a logo or an adopter name, 465.2(a) does not apply, and Section 5 plus 255.1 and 255.4 carry the duty. Replace the rationale's first sentence with:

> 465.2(a) bars writing or creating a consumer testimonial that misrepresents the individual's existence or experience ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), in force 2024-10-21). It reaches quotes from individuals, including individuals who use the product at work. It does not reach quotes, logos or adopter names credited to an organisation. The FTC places those under the Endorsement Guides ([Federal Register, 2024-08-22](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)) and Section 5 (255.0(a)). The agent must not invent either kind, and the existing grep cannot tell them apart.

Keep the existing verify, and add as a second verify line: "Every `endorsement` row has `kind` set to `individual` or `organisation`. For `organisation`, `permission.type` is `written` or `public-statement`, `permission_ref` is non-empty and `who` is `Name, Role` of a person. Run `python3 -I check_org.py claims.toml`; any `FAIL` line or exit 1 fails the lint." Do not split the rule by speaker type: the agent cannot decide which regime applies, and the same record fields serve both.

**MKT-CLAIM-22: change (one sentence, plus a verify arm).** 465.1(c)(4) governs clear and conspicuous disclosure under Part 465 only: "A disclosure is not clear and conspicuous if a consumer must take any action, such as clicking on a hyperlink or hovering over an icon, to see it" ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), point-in-time 2026-11-01). For an organisation's endorsement the Guides apply 255.5(a): a connection "that might materially affect the weight or credibility of the endorsement, and that ... is not reasonably expected by the audience, must be disclosed clearly and conspicuously" ([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), point-in-time 2026-11-01, fetched 2026-11-27). The standard is the same phrase. Append to the rationale: "For an organisation-credited endorsement the basis is 255.5(a) and Section 5, not Part 465; the visible-without-a-click requirement is kept for both." Add to the verify: "Rows with any `connection` field true and `kind = "organisation"` also need a non-empty `disclosure_text`; `check_org.py` (see above) enforces it, and the existing DOM check then finds that text in the element."

**MKT-CLAIM-24: confirm.** 465.8(b) says "for a commercial purpose" and the Guides name "potential clients, purchasers, investors" (both quoted above). It reaches B2B copy. No change.

**MKT-CLAIM-25: change (scope note, plus a verify arm).** Add to the rationale: "Part 465 applies to consumer reviews as defined in 465.1(d). The FTC has not said whether a review of business software by an employee is one. Treat it as one." The conservative reading costs nothing, because the rule restricts only the agent's own request filtering. Verify, extended to B2B request sets: the recipient set names every buyer and every user seat of the period, and `grep -rn -i -E 'score|nps|rating|sentiment' <request automation and templates>` prints nothing. Measured on a fixture (`$ grep -n -i -E 'score|nps|rating|sentiment' req_bad.yml` printed `2:filter: nps >= 9`, exit 0 = fail; the same grep on `req_ok.yml` ("send_to: all customers in 2026-Q3") and on `req_b2b.yml` ("send_to: all customers in 2026-Q3 (buyer and user seats)") printed nothing, exit 1 = pass).

**MKT-CLAIM-26: change (scope note, plus a verify arm).** Add the same sentence to the rationale. The incentive check applies to incentives offered for a review on a B2B review platform. Verify: `grep -n -i -E 'rating|stars|positive|5-star|five-star|good review' <incentive and request copy>` prints nothing. Measured on a fixture: `inc_bad.md` ("Get $50 for a 5-star review on G2") printed `1:Get $50 for a 5-star review on G2`, exit 0 = fail; `inc_ok.md` ("Get $50 for an honest review on G2, whatever you write") printed nothing, exit 1 = pass. The word "rating" in copy such as "any rating" would be a false positive; the author rewrites it.

**NEW MKT-CLAIM-27 (MUST).** Never write an organisation-credited endorsement (a company quote, a customer logo, an "X uses us" line, an adopter row) from a dependency graph, a download count or memory. The record's `kind` is `organisation`, and `permission.type` must be `written` or `public-statement` from a person authorised to speak for that organisation.
- *Rationale:* Part 465 does not cover these (above), so no rule text bars an agent from inventing them. 255.4(a): "an organization's endorsement must be reached by a process sufficient to ensure that the endorsement fairly reflects the collective judgment of the organization". 255.1(a): "Endorsements must reflect the honest opinions, findings, beliefs, or experience of the endorser" (both [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), point-in-time 2026-11-01, fetched 2026-11-27). Without this row the agent could read "Part 465 does not apply" as "allowed".
- *Severity:* MUST. It is already implied by MKT-CLAIM-20's "an adopter name needs a self-added pull request or a written permission", so this row only names the `organisation` kind and its authority test.
- *Verify:* `python3 -I check_org.py claims.toml` exits 0 (checks `kind`, `permission.type`, `permission_ref` and a named person with a role for every `organisation` row), and `grep -rn -i -E 'trusted by|used by|customers include|our customers' <surfaces>` hits each resolve to such a row. The lint fails when `<surfaces>` is an empty list.

**Verdict 9 and the Decay table: change (wording).** Verdict 9 says "16 CFR 465.2(a) names writing or creating a fake testimonial an unfair or deceptive act". Make it "for an individual's testimonial; an organisation's endorsement falls under Section 5 and the Endorsement Guides". The Decay row for 20-26 gains "FTC Q&A, November 2024".

## Dated facts

| Fact | Source | Date | Refresh |
|---|---|---|---|
| Part 465 in force; 465.1(a), (d), (f), 465.2, 465.8 text unchanged at point-in-time 2026-11-01 (latest section version 2024-10-21) | [eCFR versioner, `versions/title-16.json?part=465`](https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=465) | read 2026-11-27 | 6 months |
| Entity endorsements outside the testimonial definitions; only 465.6 reaches entities | [Federal Register 2024-18519](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials), preamble on "Celebrity Testimonial" | 2024-08-22 | 6 months |
| "a consumer is a person who purchased, used, or otherwise had experience" | same, preamble on "Consumer Review" | 2024-08-22 | 6 months |
| FTC Q&A repeats the entity exclusion | [FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers) | November 2024 | 6 months |
| Endorsement Guides apply Section 5; organisations' names can be endorsements | [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) | point-in-time 2026-11-01 | 6 months |
| Section 5 text: "persons, partnerships, or corporations" | [15 U.S.C. 45](https://www.law.cornell.edu/uscode/text/15/45) | read 2026-11-27 (statute page lists amendments to 2020) | 12 months |
| Staff opinion applying Section 5 to sellers of business arrangements | [FTC 06-1](https://www.ftc.gov/policy/advisory-opinions/informal-staff-advisory-opinion-06-1) | 2006-01-30 | historical, not a rule |

Commands run, in `~/.cache/research-lang/exemplars/product/wave2/q3r` (strip helper `strip.py` removes tags and unescapes entities; every output below was captured on 2026-11-27):

```
$ curl -sL --compressed "https://www.ecfr.gov/api/versioner/v1/full/2026-11-01/title-16.xml?part=255" -o p255.xml; wc -c p255.xml; head -c 300 p255.xml
77017 p255.xml
<?xml version="1.0"?>
<DIV5 N="255" TYPE="PART" VOLUME="1" hierarchy_metadata="...">
<HEAD>PART 255&#x2014;GUIDES CONCERNING USE OF ENDORSEMENTS AND TES
$ curl -sL --compressed "https://www.ecfr.gov/api/versioner/v1/full/2026-11-01/title-16.xml?part=465" -o p465.xml; wc -c p465.xml
17346 p465.xml
$ curl -sL --compressed "https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=465" -o v465.json; wc -c v465.json
2393 v465.json
$ python3 -I -c 'import json; d=json.load(open("v465.json")); ...print latest amendment_date per section identifier'
9 versions
465.1 2024-10-21
465.2 2024-10-21
465.3 2024-10-21
465.4 2024-10-21
465.5 2024-10-21
465.6 2024-10-21
465.7 2024-10-21
465.8 2024-10-21
465.9 2024-10-21
$ python3 -I strip.py p465.xml p465.txt; python3 -I strip.py p255.xml p255.txt
$ grep -o -i -E 'B2B|business-to-business|business to business' p465.txt | wc -l
0
$ curl -sL "https://www.federalregister.gov/documents/full_text/text/2024/08/22/2024-18519.txt" -o fr.txt; wc -c fr.txt
400590 fr.txt
$ grep -a -n -i -E 'business-to-business|business to business|B2B' fr.txt | head; echo "(exit $?)"
(exit 0)      # no match lines: the 400,590-byte preamble never says B2B
```

The latest amendment date of every Part 465 section is 2024-10-21, so the point-in-time 2026-11-01 text is the 2024-10-21 text. The passages quoted in this file were extracted from `p465.txt`, `p255.txt` and `fr.txt` with Python `str.find` on the quoted phrase; the tool output was:

```
465.1(f)  "(f) Consumer testimonial means an advertising or promotional message (including verbal statements, demonstrations, or depictions of the name, signature, likeness, or other identifying personal characteristics of an individual) that consumers are likely to believe reflects the opinions, beliefs, or experiences of a consumer who has purchased, used, or otherwise had experience with a product, service, or business."
465.6     "...for a business to materially misrepresent, expressly or by implication, that a website, organization, or entity that it controls, owns, or operates provides independent reviews or opinions, other than consumer reviews, about a category of businesses, products, or services including the business or one or more of the products or services it sells."
465.8     "(b) Purchase or procure fake indicators of social media influence that they knew or should have known to be fake and that materially misrepresent their influence or importance for a commercial purpose."
465.1(d)  "Consumer review means a consumer's evaluation, or a purported consumer's evaluation, of a product, service, or business that is submitted by the consumer or purported consumer and that is published to a website or platform dedicated in whole or in part to receiving and displaying such evaluations."
255.0 Ex.13 "A motivational speaker buys fake social media followers to impress potential clients. ... it is a deceptive practice for users of social media platforms to purchase or create indicators of social media influence and then use them to misrepresent such influence to potential clients, purchasers, investors, partners, or employees or to anyone else for a commercial purpose."
255.4(a)  "...an organization's endorsement must be reached by a process sufficient to ensure that the endorsement fairly reflects the collective judgment of the organization."
255.1(a)  "Endorsements must reflect the honest opinions, findings, beliefs, or experience of the endorser."
255.5(a)  "When there exists a connection between the endorser and the seller of the advertised product that might materially affect the weight or credibility of the endorsement, and that connection is not reasonably expected by the audience, such connection must be disclosed clearly and conspicuously."
FR 69522  "Although endorsements by such organizations are addressed in the Commission's Endorsement Guides, the Commission did not intend for any provision using the term ``testimonials'' to apply to endorsements by entities."
FR 69984  "The only section of the rule that applies to endorsements by entities or purported entities is Sec. 465.6 ... However, Sec. 465.6 does not apply to consumer or celebrity testimonials."
FR 92114  "The Commission disagrees that a ``consumer'' is necessarily a purchaser. For purposes of the rule, a consumer is a person who purchased, used, or otherwise had experience with a product, service, or business."
```

(Numbers after "FR" are character offsets in `fr.txt`.) The rule text also says, at 465.1(c)(4): "In any communication using an interactive electronic medium, such as social media or the internet, the disclosure must be unavoidable. A disclosure is not clear and conspicuous if a consumer must take any action, such as clicking on a hyperlink or hovering over an icon, to see it."

## What could not be determined

- **Whether the FTC treats a work-context quote from an individual as a consumer testimonial.** The preamble and the Q&A never mention business-to-business use. The reading above rests on the definition text only. Missing: an FTC staff statement, a Q&A entry or an enforcement action on a B2B testimonial. No FTC statement was found. The search was run on 2026-11-27 with the WebSearch tool, three times, and found none:
  1. Query `FTC consumer reviews and testimonials rule business-to-business testimonials B2B applies` (no domain filter). Result: the FTC Q&A, the final rule, law-firm summaries. The tool's summary: "The rule largely does not reach business-to-business endorsements, based on the FTC's own FAQ" and "I didn't find a source that settles how the rule treats a testimonial written by an individual at a client company." No case or Q&A entry on B2B.
  2. Query `site:ftc.gov "consumer reviews and testimonials" rule "business-to-business" OR "B2B" OR "business customers"` restricted to `ftc.gov`. Result: "The search didn't turn up any FTC text saying the Consumer Reviews and Testimonials Rule expressly covers business-to-business transactions. The only B2B language came from a different rule" (the Unfair or Deceptive Fees rule, not Part 465).
  3. A fetch of the FTC blog post [A warning letter (or ten) for businesses: comply with the FTC's Consumer Review Rule](https://www.ftc.gov/business-guidance/blog/2025/12/warning-letter-or-ten-businesses-comply-ftcs-consumer-review-rule) (dated 2025-12-22, the only post-rule FTC enforcement-style item the searches surfaced). It does not mention B2B, software or business customers, and does not say what kinds of business got letters.
  4. The FTC Q&A page ([November 2024](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)) was fetched on 2026-11-27 with a prompt asking for B2B, business customers or software. Result: "The page does not mention business-to-business, B2B, business customers, or software."
  The "no B2B case or Q&A" finding is therefore: absent from the rule text (0 grep hits), the preamble (0 grep hits), the Q&A page (fetch result above), and two web searches. A search engine cannot prove absence; an FTC staff letter not indexed by it would be missed.
- **Whether a court would read "consumer" in 465.1 as excluding a purchaser acting for a business.** No case law on Part 465 was found, and none was searched in a legal database (needs a Westlaw or Lexis login).
- **The FTC Q&A was read through WebFetch, not raw HTML.** A `curl` of the page returned an "abusive automated request" block. The Q&A quotes come from the fetch tool's extraction and should be re-read in a browser before anyone cites them in a legal document.
- **State law and non-US law.** Not in scope. The EU and UK question sits in the other open questions of the consolidation.
