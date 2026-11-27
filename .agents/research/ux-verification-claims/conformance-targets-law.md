---
title: Conformance targets and law for interface claims
program: product
sub_program: ux
topic: ux-verification-claims
worker: conformance-targets-law
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
scope: Which accessibility conformance target a rule should state, which legal regimes (ADA Title II, EAA with BFSG, EN 301 549, Section 508) bind whom, what a conformance statement may say, and the overlay ban. Not covered - performance budgets and usability claims (sibling workers), US ADA Title III litigation, state laws, other national EAA transpositions.
---

# Conformance targets and law for interface claims

## Contents

1. Summary
2. Findings (1 target string, 2 regime table, 3 EN 301 549 diff, 4 conformance statements, 5 overlays, 6 reach for free open-source tools)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Rule target string: "WCAG 2.2 Level AA". W3C says WCAG 2.2 is a Recommendation (12 Dec 2024) that extends 2.1 and does not supersede it ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- WCAG 3 is an incomplete Working Draft (Sept 2026); W3C says it will not supersede WCAG 2 and recommends meeting WCAG 2.2 now ([WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/), page updated 16 Nov 2026). Never state a WCAG 3 target.
- ADA Title II binds state and local governments only, at WCAG 2.1 AA, with compliance dates moved by a DOJ interim final rule to 26 Apr 2027 (population 50,000 or more) and 26 Apr 2028 (smaller, special districts) ([FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm)).
- The EAA (Directive 2019/882) applies to products placed on the market and services provided to consumers after 28 Jun 2025; microenterprise service providers are exempt ([Directive text, Art. 2, 4(5)](https://publications.europa.eu/resource/celex/32019L0882)).
- A free open-source developer tool is not named in the EAA scope list. This is an inference from Article 2 text, not a legal opinion; the agent must not assert exemption.
- EN 301 549 V4.1.1 (2026-09) aligns web, document and software clauses with WCAG 2.2, but its own text says presumption of conformity starts only once it is cited in the Official Journal ([EN 301 549 V4.1.1](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf)). I did not find that citation (UNVERIFIED).
- Section 508 (federal agencies and their contractors) still incorporates WCAG 2.0 A and AA ([Access Board](https://www.access-board.gov/ict/)).
- WCAG conformance is defined only for web pages; a claim must carry date, version, level, page scope and relied-upon technologies ([WCAG 2.2 5.3.1](https://www.w3.org/TR/WCAG22/)).
- Automated tools cannot establish conformance; the FTC order against accessiBe bars unsupported claims that automated products make any site WCAG compliant ([FTC, 22 Apr 2025](https://ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million)).
- The agent may write "tested against WCAG 2.2 AA with tool X on date Y, known gaps Z". It may not write "fully compliant", "accessible" without scope, or a legal-compliance statement.

## Findings

### 1. The target string

WCAG 2.2 is a W3C Recommendation published 12 December 2024. It adds nine success criteria: 2.4.11 Focus Not Obscured (Minimum) AA, 2.4.12 (AAA), 2.4.13 Focus Appearance (AAA), 2.5.7 Dragging Movements AA, 2.5.8 Target Size (Minimum) AA, 3.2.6 Consistent Help A, 3.3.7 Redundant Entry A, 3.3.8 Accessible Authentication (Minimum) AA, 3.3.9 (AAA). It removes 4.1.1 Parsing ("Obsolete and removed") ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Count at AA/A: six new criteria (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8).

Consequence: WCAG 2.2 AA is the highest target that every regime below either requires or is moving toward. A 2.2 AA pass covers the 2.1 AA criteria except 4.1.1 Parsing; the W3C page says authors bound to 2.0 or 2.1 by policy may still need to test and report 4.1.1. Section 508 names WCAG 2.0 A/AA, so a page built for a federal buyer keeps a 4.1.1 check.

The W3C policy listing (updated 13 Jan 2025) shows the EAA as WCAG 2.2, ADA Title II 2024 as WCAG 2.1, Section 508 as WCAG 2.0 ([W3C policies](https://www.w3.org/WAI/policies/)). That listing is a W3C summary; the EAA row conflicts with the Directive text, which contains no WCAG version (Directive Annex I says only "perceivable, operable, understandable and robust"). The version enters through the harmonised standard (section 3).

WCAG 3: working draft September 2026; "not expected to be a completed W3C standard for a few more years"; WCAG 2 will not be deprecated for several years after WCAG 3 is final ([WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/)).

### 2. Regime table

| Regime | Date (primary) | Binds | Free open-source dev tool reached? | Re-check |
|---|---|---|---|---|
| ADA Title II web rule | Final rule published 24 Apr 2024, effective 24 Jun 2024. IFR effective 20 Apr 2026 moves compliance to 26 Apr 2027 (pop. 50,000+) and 26 Apr 2028 (under 50,000, special districts). Standard WCAG 2.1 AA ([FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm); [ada.gov](https://www.ada.gov/resources/2024-03-08-web-rule/)) | State and local governments and special districts, plus contractors providing public services; third-party-arrangement content included | Only if a government entity uses or hosts it. The tool maker is not bound directly. The ada.gov page says contractors providing public services for those entities must follow Title II | 2026-12-31. FR comment period closed 22 Jun 2026; the rule may change, and legal challenges are possible |
| EAA, Directive (EU) 2019/882 | Applies to products placed on the market and services provided to consumers after 28 Jun 2025 (Art. 2). Transitional: service contracts agreed before 28 Jun 2025 run at most to 28 Jun 2030 (Art. 32) ([Directive](https://publications.europa.eu/resource/celex/32019L0882)) | Manufacturers, importers, distributors, service providers for listed products and services: consumer OS and hardware, e-books and dedicated software, e-commerce services, electronic communications, consumer banking, passenger transport elements, audiovisual access. Microenterprise service providers exempt from the service requirements (Art. 4(5)); disproportionate-burden assessment allowed and must be documented (Art. 14) | Not named in the scope list. A developer CLI or docs site is not an e-commerce service unless it sells to consumers. An OS or e-book reader is in scope; an extension is not. Treat as "probably not, ask a lawyer" | 2027-03-01, and when EN 301 549 V4.1.1 is cited |
| BFSG (German EAA transposition) | Scope text mirrors Art. 2: products after 28 Jun 2025, services to consumers after 28 Jun 2025 ([BFSG § 1](https://www.gesetze-im-internet.de/bfsg/__1.html)). § 3(3): the duty does not apply to microenterprises offering services ([BFSG § 3](https://www.gesetze-im-internet.de/bfsg/__3.html)). § 3(2) leaves concrete requirements to an ordinance following Annex I | Economic operators in Germany | Same as EAA: only if a consumer-facing service in scope | 2027-03-01 |
| EN 301 549 | V3.2.1 (2021-03) harmonised for Directive 2016/2102 by Implementing Decision (EU) 2021/1339 per the [Commission page](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation) (updated 23 Nov 2026; no mention of 2019/882 or V4.1.1). V4.1.1 published 2026-09-02 ([ETSI directory](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/)) | It is a voluntary standard; it binds through the law that cites it | n/a (standard, not a statute) | 2026-12-31: look for the Official Journal citation of V4.1.1 |
| Section 508 (Revised, 2017) | Final rule effective 20/21 Mar 2017, compliance from 18 Jan 2018. WCAG 2.0 A and AA at E205.4 and E207.2 ([Access Board](https://www.access-board.gov/ict/)) | Federal agencies, USPS; contractors when the contract requires it | Not directly. A federal buyer asks the vendor for an accessibility conformance report. Software (non-web) is covered through E207 | 2027-06-01. The page text I read shows no update after 2018; I read 200,000 of 411,835 characters |

Note on the reading limit: the Access Board page was read for 200,000 characters of 411,835. No WCAG 2.1 or 2.2 proposal appeared in what I read; absence in the unread part is not proven.

### 3. EN 301 549 v3.2.1 vs v4.1.1: measured diff

Method: both PDFs downloaded from the ETSI directory, text extracted with pypdf, clause headings matched by regex `^(9|10|11|12)(\.\d+)+ Title` and compared by number. The count is an approximation of the heading set (tables of contents and body headings merged), not an official change list.

```
curl -sL https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf -o v321.pdf
curl -sL https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf -o v411.pdf
uv run --with pypdf python -I  # extract text, regex clause headings, set difference per clause group
```

| Clause group | V3.2.1 headings | V4.1.1 headings | Added | Removed | Title changed |
|---|---|---|---|---|---|
| 9 Web | 75 | 90 | 15 | 0 | 4 |
| 10 Non-web documents | 75 | 90 | 15 | 0 | 10 |
| 11 Software | 138 | 111 | 14 | 41 | 16 |
| 12 Documentation and support | 8 | 5 | 3 | 6 | 2 |

The 15 added web headings map to the new WCAG 2.2 criteria and related Level AAA/informative entries (9.2.4.8 to 9.2.4.11, 9.2.5.5 to 9.2.5.8, 9.3.2.5, 9.3.2.6, 9.3.3.5 to 9.3.3.8, and 9.7). 9.4.1.1 Parsing becomes "Void". The software removals (41) are mostly the V3.2.1 split clauses such as 11.1.1.1.1 and 11.1.1.1.2 that V4.1.1 restructures; treat 11 as restructured, not as fewer requirements. Document 12 is renamed "Accessible information about products" and "Accessible information about services".

V4.1.1 states its own changes: clauses 9, 10 and 11 "updated to align with the WCAG 2.2 recommendation", new Annex ZA (Directive 2016/2102), new Annex ZB and clause A.2 (Directive 2019/882), and RTT clause 6.2 extended. It states: "Once the present document is cited in the Official Journal of the European Union under that Directive, compliance with the normative clauses... confers... a presumption of conformity" ([V4.1.1 introduction](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf)). The Directive's presumption-of-conformity article confirms that presumption attaches to harmonised standards "the references of which have been published in the Official Journal" ([Directive](https://publications.europa.eu/resource/celex/32019L0882)).

Official Journal route: I tried Cellar CELEX 32026D2003 (found by search); it is a radio-equipment decision, not EN 301 549. I did not find a Commission decision citing V4.1.1 (UNVERIFIED, failed route above, re-check 2026-12-31).

### 4. What a conformance statement may say

WCAG 2.2 section 5.3: "Conformance claims are not required." If made, it must include date, guideline title/version/URI, conformance level, a concise description of the pages covered including subdomains, and a list of web content technologies relied upon. A conformance logo counts as a claim and needs the same components. Conformance is "defined only for web pages". Optional: user agents and assistive technologies used for testing, success criteria met beyond the level, machine-readable metadata ([WCAG 2.2 5.3](https://www.w3.org/TR/WCAG22/)). Partial-conformance statements exist for third-party content and for unsupported languages.

The five conformance requirements (5.2.1 level, full pages, complete processes, accessibility-supported technologies, non-interference) are listed in the table of contents I read; their text I did not read in this session. The rule may name them but must not paraphrase their content.

Directive Article 13(2) and Annex V require service providers in scope to publish information on how the service meets requirements; Article 14(3) requires a written, five-year-kept disproportionate-burden assessment ([Directive](https://publications.europa.eu/resource/celex/32019L0882)). These are legal documents; the agent drafts none.

### 5. Overlay ban

The primary legal fact: FTC final order (22 Apr 2025) bars accessiBe from representing that its automated products can make any website WCAG compliant or keep it compliant over time without evidence, from presenting paid endorsements as independent, and orders USD 1 million ([FTC](https://ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million)). It is a vendor-specific consent order. It does not ban overlays. The ban in the rule is therefore a catalog policy choice, supported by two primary facts: WCAG conformance is a property of the page and its technologies (5.2.5 Non-Interference and 5.3 claim components), and the FTC treats "automated product makes you compliant" as a claim needing evidence. I did not fetch the advocacy overlay fact sheet or the W3C statement on overlays; the policy rests on the two facts above only.

### 6. Reach for free open-source tools (inference)

The EAA scope list in Art. 2(2) names e-commerce services, e-books and dedicated software, consumer banking, electronic communications, audiovisual access and passenger transport elements; Art. 3(15) counts "free of charge" supply as making available for products, but the service list is still closed. A docs site for a free CLI does not appear in either list. This reading is mine; the Directive has recitals and national guidance I did not read. Marked as inference throughout.

## Dated facts

| Fact | Value | Source | Source date | Source type |
|---|---|---|---|---|
| WCAG 2.2 status | W3C Recommendation, does not supersede 2.0/2.1 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 12 Dec 2024 | Authority |
| WCAG 2.2 new A/AA criteria | 6: 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8; 4.1.1 removed | same | 12 Dec 2024 | Authority |
| WCAG 3 | Working Draft Sept 2026, incomplete, not superseding WCAG 2 | [WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/) | page updated 16 Nov 2026 | Authority |
| ADA Title II final rule | WCAG 2.1 AA; published 24 Apr 2024, effective 24 Jun 2024 | [FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm) | 20 Apr 2026 | Authority |
| ADA Title II dates | 26 Apr 2027 (pop. 50,000+), 26 Apr 2028 (under 50,000, special districts), from 24 Apr 2026 and 26 Apr 2027; IFR effective 20 Apr 2026; comments closed 22 Jun 2026 | same | 20 Apr 2026 | Authority |
| ada.gov page | Cites the IFR; page dated 8 Apr 2024 with 2026 notice | [ada.gov](https://www.ada.gov/resources/2024-03-08-web-rule/) | 2024, notice 2026 | Authority |
| EAA scope date | 28 Jun 2025 for products and services; transitional 28 Jun 2030 for service use of products; contracts before 28 Jun 2025 up to 5 years | [Directive](https://publications.europa.eu/resource/celex/32019L0882) | OJ L 151, 7 Jun 2019 | Authority |
| EAA microenterprise | fewer than 10 persons and turnover or balance sheet not above EUR 2 million (Art. 3(23)); exempt from service requirements (Art. 4(5)) | same | 2019 | Authority |
| BFSG | scope after 28 Jun 2025; services duty excludes microenterprises (§ 3(3)) | [§ 1](https://www.gesetze-im-internet.de/bfsg/__1.html), [§ 3](https://www.gesetze-im-internet.de/bfsg/__3.html) | current gazette text, undated on page | Authority |
| EN 301 549 V3.2.1 | harmonised under 2016/2102 by Decision (EU) 2021/1339; "latest harmonised version" | [Commission page](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation) | updated 23 Nov 2026 | Authority |
| EN 301 549 V4.1.1 | published 2026-09-02 (ETSI directory timestamp, document dated 2026-09); WCAG 2.2 aligned; presumption only after OJ citation | [ETSI PDF](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf) | 2026-09 | Authority |
| EN 301 549 V4.1.1 OJ citation under 2019/882 | UNVERIFIED. Failed route: Commission page silent; Cellar 32026D2003 is a radio decision. Search summaries claimed a citation date around 30 Nov 2026; not primary. Re-check 2026-12-31 | n/a | n/a | n/a |
| Section 508 | WCAG 2.0 A and AA; compliance from 18 Jan 2018 | [Access Board](https://www.access-board.gov/ict/) | rule 18 Jan 2017 | Authority |
| W3C policy listing | US 508 WCAG 2.0; ADA T2 2.1; EAA listed as WCAG 2.2 | [W3C policies](https://www.w3.org/WAI/policies/) | updated 13 Jan 2025 | Authority (summary, conflicts with Directive text on EAA) |
| FTC accessiBe | Final order 22 Apr 2025; USD 1 million; evidence required for WCAG-compliance claims | [FTC](https://ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million) | 22 Apr 2025 | Authority |
| HHS Section 504 web rule IFR | 11 May 2026 FR interim final rule extending dates (seen only in search results; not read) UNVERIFIED | none read | 2026-05-11 | n/a |

## Normative guidance candidates

1. MUST state the target as the exact string "WCAG 2.2 Level AA" in any rule, README accessibility section or conformance note. Rationale: it is the current Recommendation and the level all regimes converge on. VERIFY: `grep -rEn "WCAG ?(2\.[01]|3)" docs README*` returns no target claims other than a documented legal-binding exception; every hit names "2.2" and "AA".
2. MUST NOT state WCAG 3 or "WCAG 3.0 compliant" as a target. Rationale: Working Draft only. VERIFY: `grep -rEin "wcag ?3" .` hits only text that says draft.
3. MUST run an automated WCAG check and a keyboard pass on every interface change and report them as "checked", not "conforms". Rationale: automation does not establish conformance; the FTC order requires evidence. VERIFY: the change summary lists tool name and version, pages covered and date; reading heuristic - pass "axe-core 4.x on /, /docs/install, 2026-11-27, 0 violations, keyboard pass on both"; fail "site is WCAG 2.2 AA compliant".
4. MUST NOT write "fully accessible", "compliant", "certified", "WCAG compliant" or a legal-compliance sentence without a conformance claim carrying every WCAG 5.3.1 component. Rationale: an incomplete claim is not a WCAG claim. VERIFY: `grep -rEin "(fully|100%|completely) (accessible|compliant)|ADA[- ]compliant|EAA[- ]compliant" .` returns nothing; each remaining "conform" hit sits next to date, version, level, URI scope, technologies.
5. MUST, when a claim is made, include date, "Web Content Accessibility Guidelines 2.2 at https://www.w3.org/TR/WCAG22/", level, page scope (including subdomains) and relied-upon technologies. Rationale: WCAG 5.3.1. VERIFY: five-item checklist against the statement.
6. MUST NOT apply WCAG conformance wording to a CLI, TUI, or VS Code native UI. Rationale: WCAG conformance is defined only for web pages; software is covered by EN 301 549 clause 11 and Section 508 E207. VERIFY: statement scope lists URIs only; a claim about a non-web surface cites EN 301 549 clause 11 and states it is not a WCAG claim.
7. MUST NOT add, recommend or install an accessibility overlay or auto-fix widget (accessiBe, UserWay, EqualWeb style) as a conformance measure. Rationale: the FTC order shows automated products cannot be claimed to deliver compliance; the page's own markup is what conformance rates. VERIFY: `grep -rEin "accessibe|userway|equalweb|audioeye|accessibility (overlay|widget)" package.json src docs` returns nothing, except text that warns against them.
8. MUST NOT write a legal-regime sentence ("complies with ADA", "EAA-ready", "meets Section 508") in a repo. Rationale: scope, dates and exemptions depend on facts the agent cannot know; the IFR shows dates move. VERIFY: the grep in item 4 plus `grep -rEin "section 508|european accessibility act|BFSG" docs README*` hits flagged for human review.
9. SHOULD give a regime date only with source URL and date read, and re-check yearly. Rationale: ADA Title II dates changed on 20 Apr 2026. VERIFY: every legal date in a doc has an adjacent link to a primary text.
10. SHOULD test the six new 2.2 A/AA criteria explicitly in every UI review: 2.4.11 focus not obscured by sticky headers; 2.5.7 a non-drag alternative; 2.5.8 target at least 24 by 24 CSS px or spacing; 3.2.6 help in the same place; 3.3.7 no re-entry of data; 3.3.8 no cognitive test at sign-in. Rationale: these are what training data misses. VERIFY: review checklist has six lines with pass/fail.
11. SHOULD keep a 4.1.1 Parsing check out of 2.2 claims but in 508-bound deliverables. Rationale: 4.1.1 removed in 2.2, still in 2.0 (508) and in 2.1 policies. VERIFY: a federal-buyer deliverable names WCAG 2.0 A/AA.
12. CONSIDER publishing an accessibility statement for each site naming known gaps and a contact route. Rationale: lets users report; supports the Art. 13(2) style of information if scope applies. VERIFY: statement page exists, dated, lists gaps.

## What an agent must not decide alone

- Whether the product is in EAA, BFSG, ADA Title II or Section 508 scope (legal, depends on customers, revenue, headcount, government use).
- A disproportionate-burden or fundamental-alteration assessment (Directive Art. 14; owner must sign and keep it five years).
- Publishing or changing a conformance claim, accessibility statement or a "VPAT/ACR"; the owner approves wording.
- Choosing a conformance level other than AA, or a target version other than 2.2.
- Accepting a vendor accessibility widget at a customer's request.
- Telling a customer or regulator about a non-conformity (Directive Art. 13(4) requires reporting to authorities for in-scope services).

## AI-agent angle

| Mistake | Cause | Check |
|---|---|---|
| Writes "WCAG 2.1 AA" as default | Training predates 2.2; ADA Title II names 2.1 | grep item 1 |
| Claims "ADA compliant" or "EAA compliant" on a landing page | Marketing habit | grep item 4 and 8 |
| Adds a 4.1.1 Parsing task to a 2.2 audit | Old checklists | Compare to the 2.2 criteria list |
| Reports a clean axe run as "accessible" | Tools check a fraction of criteria | Heuristic in item 3 |
| Suggests an overlay for quick compliance | Vendor content dominates search | grep item 7 |
| Dates the EAA 2019 or 2025 inconsistently | Directive adopted 2019, applies from 28 Jun 2025 | Dated facts table |
| Calls WCAG 3 final | Hype | grep item 2 |

## Contested / evolving

- WCAG 2.1 versus 2.2 as legal baseline: ADA Title II states 2.1 AA ([FR](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm)); EN 301 549 V4.1.1 states 2.2 ([ETSI](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf)); W3C lists the EAA as 2.2 ([policies](https://www.w3.org/WAI/policies/)) although the Directive text names no version and the Commission page I read still lists V3.2.1 (WCAG 2.1) as latest harmonised for 2016/2102. Trend: 2.2.
- ADA Title II timing: the IFR extended dates; commenters and a secondary source (UNC School of Government, seen only in search results, not read) say further change or challenge is possible. Not settled as of 2026-11-27.
- Overlays: one side (FTC order, accessibility practitioners) says claims of automatic compliance are deceptive; vendors state their products help. I read only the FTC side; the vendor side was not fetched.
- Whether free, open-source developer tools fall in EAA scope: not addressed in the Directive text I read; owner and counsel decide.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 (read parts, conformance section) | 12 Dec 2024 | Target, claim components |
| https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ | WCAG 3 status | 16 Nov 2026 | Not a target |
| https://www.ada.gov/resources/2024-03-08-web-rule/ | ADA Title II page | 2024, notice 2026 | Scope, standard |
| https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm | DOJ interim final rule | 20 Apr 2026 | Current dates |
| https://publications.europa.eu/resource/celex/32019L0882 | Directive 2019/882 (Arts 2, 3, 4, 13, 14, presumption article, 32) | OJ 7 Jun 2019 | EAA text |
| https://www.gesetze-im-internet.de/bfsg/__1.html | BFSG § 1 | current | German scope |
| https://www.gesetze-im-internet.de/bfsg/__3.html | BFSG § 3 | current | Microenterprise exemption |
| https://www.etsi.org/deliver/etsi_en/301500_301599/301549/ | ETSI directory listing | listing 2026-09-02 | Version dates |
| https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf | EN 301 549 V3.2.1 | 2021-03 | Diff base |
| https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf | EN 301 549 V4.1.1 | 2026-09 | Diff target |
| https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation | Commission harmonisation page | 23 Nov 2026 | Harmonised versions |
| https://www.access-board.gov/ict/ | Section 508 standards | rule 2017 | WCAG 2.0 baseline |
| https://www.w3.org/WAI/policies/ | W3C policy listing | 13 Jan 2025 | Cross-check |
| https://ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million | FTC accessiBe order | 22 Apr 2025 | Overlay claims |
| https://publications.europa.eu/resource/celex/32026D2003 | Decision 2026/2003 (radio equipment; irrelevant, ruled out) | 7 Sep 2026 | Failed route |
