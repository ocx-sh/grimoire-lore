---
title: EU UCPD Annex I points 23a to 23c and Directive 98/6/EC Art. 6a, from the Publications Office Cellar copy
program: product
topic: marketing-claims-evidence
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# EU fake-review blacklist (23a-23c) and the prior-price rule (98/6/EC Art. 6a)

Question (from `product-resume/wave2/marketing-claims-evidence/q1.md`): what do EU UCPD Annex I points 23a to 23c and Directive 98/6/EC Art. 6a say, read from the Publications Office Cellar copy?

Repair note (2026-11-27): this file replaces an earlier draft. The texts were re-fetched in this pass, every quote was re-located by line in the stored copies, and every external claim below now carries its URL and fetch date in the same sentence. Two errors of the earlier draft are corrected: the plain `text/html` request returned 404 for all five documents (not "four of five"), and recital 49 of Directive 2019/2161 is the fake-review recital (the earlier draft also called it a remedies recital; the remedies recital is recital (16)).

## Answer in brief

- Points 23a to 23c exist in the current consolidated UCPD, with identical wording in the 2022-05-28 and 2026-09-27 consolidations (diff shown in section 1). 23b and 23c are the EU fake-review rules. 23a is about ticket resale and is irrelevant to this fleet.
- Art. 6a of Directive 98/6/EC is the prior-price rule: a price-reduction announcement must show the lowest price of the previous 30 days. Whether a software subscription is a "product" of 98/6 is not answered by the text. That is a documented gap.
- The Cellar's own metadata lists exactly one act amending 98/6/EC (2019/2161) and one consolidation set dated 2022-05-28. See the SPARQL output in section "How the texts were read". The earlier "unconfirmed" status for "no later amendment" is now an answered point, with the residual caveat that the metadata could lag.
- The wave-1 ruleset cites Annex I only at point 20 ("free"). 23b adds a verification duty that no wave-1 rule demands. Proposed: one new rule (MKT-CLAIM-27), a text change to MKT-CLAIM-20, a rationale change to MKT-CLAIM-03, a pattern addition to MKT-CLAIM-10 and a nuance to MKT-CLAIM-14.
- Directive (EU) 2024/825 added Annex I points 2a, 4a to 4c, 10a and 23d to 23j, applying from 2026-09-27. Point 10a reaches copy such as "GDPR-compliant" and is handled in MKT-CLAIM-14.

## What wave-1 says (read, not recalled)

Read on 2026-11-27 from `.agents/research/marketing-claims-evidence.md` (frontmatter `date: 2026-11-27`, `model: opus`):

- Source table, row "03, 13": "EU Directive 2005/29/EC Art. 6, 7, Annex I (read from the UK-hosted copy; later EU amendments unverified)", cited to https://www.legislation.gov.uk/eudr/2005/29/article/6, "fetched 2026-11-27", refresh "6 months; 2027-05-27. Re-read from the Publications Office Cellar copy".
- Open question: "What do EU UCPD Annex I points 23a to 23c (fake reviews, added by Directive 2019/2161) and the prior-price rule (Directive 98/6/EC Art. 6a) say, read from the Publications Office Cellar copy instead of EUR-Lex?"
- MKT-CLAIM-03 rationale cites "Directive 2005/29/EC Art. 6(1)(d)" and "Annex I point 20" on the UK-hosted copy.
- MKT-CLAIM-24 rationale rests on 16 CFR 465.8(b) and 465.1(h) (eCFR, read 2026-11-27). MKT-CLAIM-26 rests on 465.4 and 465.7(b). MKT-CLAIM-20 on 465.2(a). No wave-1 rule cites UCPD 23b or 23c.
- MKT-CLAIM-10 verify (quoted in full under Effect on the ruleset) lists the phrases `no (third-party )?audit|no signature|early development|pre-1\.0|unstable|no bounty|keep:absence`.

## How the texts were read

All five texts were fetched on 2026-11-27 (about 13:07 to 13:13 UTC, run from this machine) from the Publications Office through the CELEX resource URL (http://publications.europa.eu/resource/celex/<celex>) with content negotiation. Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/mce-q1r/`.

Command and output, exactly as run (the `Accept-Language: en` header is required: without it the server answered HTTP 400 for 01998L0006-20220528, tested):

```
for c in 32019L2161 02005L0029-20220528 02005L0029-20260927 01998L0006-20220528 32024L0825; do
 curl -sL -H "Accept: application/xhtml+xml" -H 'Accept-Language: en' -o $c.xhtml -w "$c %{http_code} %{size_download} %{url_effective}\n" "http://publications.europa.eu/resource/celex/$c"; done
32019L2161 200 260992 http://publications.europa.eu/resource/cellar/eefb17ee-2173-11ea-95ab-01aa75ed71a1.0006.03/DOC_1
02005L0029-20220528 200 125390 http://publications.europa.eu/resource/cellar/bf9a3433-702b-11ea-a07e-01aa75ed71a1.0006.03/DOC_1
02005L0029-20260927 200 146637 http://publications.europa.eu/resource/cellar/16caab8e-3e51-11f1-814f-01aa75ed71a1.0005.03/DOC_1
01998L0006-20220528 200 25743 http://publications.europa.eu/resource/cellar/6c0a5cd1-ec06-11ec-a534-01aa75ed71a1.0002.02/DOC_1
32024L0825 200 161248 http://publications.europa.eu/resource/cellar/1391c6b2-db63-11ee-b9d9-01aa75ed71a1.0006.03/DOC_1
```

Plain `text/html` request, same URLs, same day:

```
for c in 32019L2161 02005L0029-20220528 02005L0029-20260927 01998L0006-20220528 32024L0825; do
 curl -sL -H "Accept: text/html" -H 'Accept-Language: en' -o /dev/null -w "$c %{http_code} %{size_download}\n" "http://publications.europa.eu/resource/celex/$c"; done
32019L2161 404 214
02005L0029-20220528 404 214
02005L0029-20260927 404 214
01998L0006-20220528 404 214
32024L0825 404 214
```

Five of five returned 404, so `application/xhtml+xml` is the working representation. Stored files (`sha256sum *.xhtml`, in the scratch directory):

```
9e4086ee569e8744eab99cbc9f10119a41cb0ae7114fc3759e2a22a2e4c23e2c  01998L0006-20220528.xhtml
4fdd501a787024632469709772d833a200c2d9de9b9fe1d9973a519f3750c5bf  02005L0029-20220528.xhtml
1ebbb7b9f2c7c7712b0c3bd19f4319cb5a52ac9514dc008bd34084c550f77138  02005L0029-20260927.xhtml
4f2987a941a32c9fae499098554b206e93b26365fea60353e2f886084174b1ac  32019L2161.xhtml
0aa54793ab2480487badde2506e8675cd49d08c28b3a4e2d0e47488c570d6549  32024L0825.xhtml
```

Text copies were made by stripping tags with a 9-line Python script (`python3 -I /tmp/tx.py in.xhtml out.txt`; line counts and bytes of the `.txt` copies: 32019L2161 547 lines / 91264 bytes; 02005L0029-20220528 638 / 47501; 02005L0029-20260927 730 / 55150; 01998L0006-20220528 133 / 9725; 32024L0825 324 / 63127). Line numbers cited below are lines in these `.txt` copies.

Document headers as read (head of `02005L0029-20260927.txt`): "Consolidated TEXT: 32005L0029 — EN — 27.09.2026" and "02005L0029 — EN — 27.09.2026 — 002.001", followed by the notice "This text is meant purely as a documentation tool and has no legal effect. ... The authentic versions of the relevant acts ... are those published in the Official Journal of the European Union and available in EUR-Lex." The 98/6 copy header reads "Consolidated TEXT: 31998L0006 — EN — 28.05.2022" and "01998L0006 — EN — 28.05.2022 — 001.001". Quotes are from the consolidations and cross-checked against the amending acts where both print the passage.

Is there a later consolidation or amendment of 98/6/EC? Two probes, both run on 2026-11-27.

Probe 1, guessed consolidation dates (with the language header):

```
for d in 20260927 20261001 20261127; do curl -s -H "Accept: application/xhtml+xml" -H 'Accept-Language: en' -o /dev/null -w "01998L0006-$d %{http_code}\n" http://publications.europa.eu/resource/celex/01998L0006-$d; done
01998L0006-20260927 404
01998L0006-20261001 404
01998L0006-20261127 404
```

A 404 on a guessed date is weak evidence. Probe 2 asks the Publications Office's SPARQL endpoint (http://publications.europa.eu/webapi/rdf/sparql, queried 2026-11-27) for the consolidated versions of CELEX 31998L0006 and for the acts that amend it:

```
q.rq:  PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
       SELECT ?c ?d WHERE { ?w cdm:resource_legal_id_celex "31998L0006"^^<http://www.w3.org/2001/XMLSchema#string> . ?c cdm:act_consolidated_consolidates_resource_legal ?w . OPTIONAL{?c cdm:work_date_document ?d} } ORDER BY ?d
curl -s -G "http://publications.europa.eu/webapi/rdf/sparql" --data-urlencode "query@q.rq" -H "Accept: text/csv"
"c","d"
"http://publications.europa.eu/resource/cellar/33cf64d0-a4ef-11ea-bb7a-01aa75ed71a1",1998-03-18
"http://publications.europa.eu/resource/cellar/3fa61834-a4ef-11ea-bb7a-01aa75ed71a1",1998-03-18
"http://publications.europa.eu/resource/cellar/6813ce40-ec06-11ec-a534-01aa75ed71a1",2022-05-28
"http://publications.europa.eu/resource/cellar/6c0a5cd1-ec06-11ec-a534-01aa75ed71a1",2022-05-28
"http://publications.europa.eu/resource/cellar/0ca3cb33-b110-11f1-b9e5-01aa75ed71a1",2022-05-28

q2.rq: ... SELECT ?cel ?p WHERE { ?w cdm:resource_legal_id_celex "31998L0006"^^... . ?a cdm:resource_legal_amends_resource_legal ?w . ?a cdm:resource_legal_id_celex ?cel . OPTIONAL{?a cdm:work_date_document ?p} } ORDER BY ?p
"cel","p"
"32019L2161",2019-11-27
```

The newest consolidation is dated 2022-05-28 (the last row has a 2026-era Cellar id but the date 2022-05-28, so it is a re-publication of the same consolidation) and the only amending act is Directive (EU) 2019/2161. The same query for CELEX 32005L0029 (the UCPD) returned `"32019L2161",2019-11-27` and `"32024L0825",2024-02-28`. The query files `q.rq`, `q2.rq`, `q3.rq` and the CSV outputs `consolidations-98-6.csv` and `amenders-98-6.csv` are in the scratch directory.

## Findings

### 1. Annex I points 23a, 23b, 23c

Source: consolidated UCPD of 27.09.2026, http://publications.europa.eu/resource/celex/02005L0029-20260927 (Cellar `16caab8e-3e51-11f1-814f-01aa75ed71a1.0005.03`), fetched 2026-11-27, lines 556 to 561 of the text copy, after the marker `▼M1`:

> 23a. Reselling events tickets to consumers if the trader acquired them by using automated means to circumvent any limit imposed on the number of tickets that a person can buy or any other rules applicable to the purchase of tickets.
>
> 23b. Stating that reviews of a product are submitted by consumers who have actually used or purchased the product without taking reasonable and proportionate steps to check that they originate from such consumers.
>
> 23c. Submitting or commissioning another legal or natural person to submit false consumer reviews or endorsements, or misrepresenting consumer reviews or social endorsements, in order to promote products.

Identical wording in the earlier consolidation, http://publications.europa.eu/resource/celex/02005L0029-20220528 (fetched 2026-11-27):

```
diff <(grep -A1 "^ *23[abc]\. *$" 02005L0029-20220528.txt) <(grep -A1 "^ *23[abc]\. *$" 02005L0029-20260927.txt) && echo IDENTICAL_23abc
IDENTICAL_23abc
```

Legal status of the list. Art. 5(5) of the UCPD, consolidated 2026-09-27, line 161 (http://publications.europa.eu/resource/celex/02005L0029-20260927, fetched 2026-11-27): "Annex I contains the list of those commercial practices which shall in all circumstances be regarded as unfair. The same single list shall apply in all Member States and may only be modified by revision of this Directive." The Annex heading at line 476 reads "COMMERCIAL PRACTICES WHICH ARE IN ALL CIRCUMSTANCES CONSIDERED UNFAIR". In plain terms, no case-by-case test of consumer effect applies to a listed practice.

Scope. Art. 3(1), line 114 of the same file (fetched 2026-11-27): "This Directive shall apply to unfair business-to-consumer commercial practices, as laid down in Article 5, before, during and after a commercial transaction in relation to a product." Art. 2(c), line 49: "'product' means any good or service including immovable property, digital service and digital content, as well as rights and obligations". So 23b and 23c reach consumer-facing copy for software and services. A business-to-business page is outside the UCPD (this is the EU side of wave-1 open question 3; the US side, 16 CFR Part 465, is a separate question).

What 23b adds. A duty of verification attached to a statement. Recital 47 of Directive (EU) 2019/2161 of 27 November 2019, OJ L 328, 18.12.2019, http://publications.europa.eu/resource/celex/32019L2161 (fetched 2026-11-27, line 111): "Moreover, it should therefore be considered to be an unfair commercial practice to mislead consumers by stating that reviews of a product were submitted by consumers who actually used or purchased that product when no reasonable and proportionate steps were taken to ensure that they originate from such consumers. Such steps could include technical means to verify the reliability of the person posting a review, for example by requesting information to verify that the consumer has actually used or purchased the product." The same recital also says that where checks exist, traders "should provide information on how the checks are made and provide clear information to consumers on how reviews are processed, for example, if all reviews, either positive or negative, are posted or whether those reviews have been sponsored or influenced by a contractual relationship with a trader."

What 23c covers. Recital 49 of the same Directive (http://publications.europa.eu/resource/celex/32019L2161, fetched 2026-11-27, line 115): "Traders should also be prohibited from submitting fake consumer reviews and endorsements, such as 'likes' on social media, or commissioning others to do so in order to promote their products, as well as from manipulating consumer reviews and endorsements, such as publishing only positive reviews and deleting the negative ones." So the EU text reaches review curation as well as fabrication, and fake social "likes". This lines up with wave-1 MKT-CLAIM-24 (popularity counts) and MKT-CLAIM-26 (curated sets).

Puffery. Recital 48 of the same Directive (http://publications.europa.eu/resource/celex/32019L2161, fetched 2026-11-27, line 113): "The provisions of this Directive addressing consumer reviews and endorsements are without prejudice to the common and legitimate advertising practice of making exaggerated statements or statements which are not meant to be taken literally."

Duty outside Annex I. Directive 2019/2161 Art. 3, point (4)(c), line 232 (http://publications.europa.eu/resource/celex/32019L2161, fetched 2026-11-27) adds a paragraph 6 to UCPD Art. 7. Its text in the consolidated UCPD of 2026-09-27, line 240 (http://publications.europa.eu/resource/celex/02005L0029-20260927, fetched 2026-11-27): "Where a trader provides access to consumer reviews of products, information about whether and how the trader ensures that the published reviews originate from consumers who have actually used or purchased the product shall be regarded as material." A material omission is misleading under Art. 7, so a page that shows reviews must say whether and how it checks them.

Transposition. Directive 2019/2161 Art. 7(1), lines 511 to 512 (http://publications.europa.eu/resource/celex/32019L2161, fetched 2026-11-27): "By 28 November 2021, Member States shall adopt and publish the measures necessary to comply with this Directive. They shall immediately inform the Commission thereof. They shall apply those measures from 28 May 2022."

Penalties. UCPD Art. 13(3) as replaced by Directive 2019/2161 Art. 3(5), line 257 (same URL and date): "Member States shall ensure that when penalties are to be imposed in accordance with Article 21 of Regulation (EU) 2017/2394, they include the possibility either to impose fines through administrative procedures or to initiate legal proceedings for the imposition of fines, or both, the maximum amount of such fines being at least 4 % of the trader's annual turnover in the Member State or Member States concerned." Art. 13(4), line 262: where turnover is unavailable, "the maximum amount of which shall be at least EUR 2 million". These are minimums for coordinated cross-border cases. National wording and enforcer vary, and this research read the Directive, not any national act.

### 2. Directive 98/6/EC Art. 6a (prior-price rule)

Source: consolidated 98/6/EC of 28.05.2022, http://publications.europa.eu/resource/celex/01998L0006-20220528 (Cellar `6c0a5cd1-ec06-11ec-a534-01aa75ed71a1.0002.02`), fetched 2026-11-27. The article is marked as inserted by "M1" (Directive 2019/2161). The same text is printed in the amending act, http://publications.europa.eu/resource/celex/32019L2161, fetched 2026-11-27, lines 167 to 171, so the consolidation and the authentic amending text agree.

> Article 6a
> 1. Any announcement of a price reduction shall indicate the prior price applied by the trader for a determined period of time prior to the application of the price reduction.
> 2. The prior price means the lowest price applied by the trader during a period of time not shorter than 30 days prior to the application of the price reduction.
> 3. Member States may provide for different rules for goods which are liable to deteriorate or expire rapidly.
> 4. Where the product has been on the market for less than 30 days, Member States may also provide for a shorter period of time than the period specified in paragraph 2.
> 5. Member States may provide that, when the price reduction is progressively increased, the prior price is the price without the price reduction before the first application of the price reduction.

Dates: the same as 2019/2161 (Art. 7(1) quoted above: applies from 28 May 2022).

Scope check, against the same consolidation (http://publications.europa.eu/resource/celex/01998L0006-20220528, fetched 2026-11-27). Art. 1: "The purpose of this Directive is to stipulate indication of the selling price and the price per unit of measurement of products offered by traders to consumers in order to improve consumer information and to facilitate comparison of prices." Art. 2(d): "trader shall mean any natural or legal person who sells or offers for sale products which fall within his commercial or professional activity". Art. 2(e): "consumer shall mean any natural person who buys a product for purposes that do not fall within the sphere of his commercial or professional activity". Art. 2(b) defines the unit price as the price "for one kilogramme, one litre, one metre, one square metre or one cubic metre of the product or a different single unit of quantity". Art. 3(2): "Member States may decide not to apply paragraph 1 to: products supplied in the course of the provision of a service". That exemption refers to Art. 3(1), the selling-price and unit-price duty. It does not name Art. 6a.

The Directive has no definition of "product" in Art. 2. So the text does not settle whether Art. 6a reaches a SaaS "was 20 EUR, now 15 EUR" banner. By contrast the UCPD defines "product" to include "digital service and digital content" (Art. 2(c), http://publications.europa.eu/resource/celex/02005L0029-20260927, line 49, fetched 2026-11-27) and lists "the price or the manner in which the price is calculated, or the existence of a specific price advantage" as a matter on which a statement can deceive (Art. 6(1)(d), line 177, same URL and date). So a false "was" price on a subscription is attackable under the UCPD regardless of 98/6.

The wording that matters for an agent: the rule keys on an "announcement of a price reduction", and the reference price is fixed by the trader's own history ("lowest price applied ... not shorter than 30 days"). It is not a list price, a competitor price or a "recommended" price.

### 3. What changed after the wave-1 read (Directive 2024/825)

The wave-1 source table says "later EU amendments unverified" (quoted above). The Cellar consolidation of 2026-09-27 (http://publications.europa.eu/resource/celex/02005L0029-20260927, fetched 2026-11-27) carries markers M1 (2019/2161) and M2, and the SPARQL query for amenders of CELEX 32005L0029 (above) returns 32019L2161 and 32024L0825. M2 is Directive (EU) 2024/825 of 28 February 2024, http://publications.europa.eu/resource/celex/32024L0825 (fetched 2026-11-27). Its Art. 4(1), lines 254 to 255: "By 27 March 2026, Member States shall adopt and publish the measures necessary to comply with this Directive. ... They shall apply those measures from 27 September 2026." As of 2026-11-27 it applies. It leaves 23a to 23c untouched, and adds 23d to 23j (software updates, durability, repairability, consumables). The points below are quoted from the consolidated UCPD of 2026-09-27 (same URL, same fetch date), lines 483 to 520:

- 2a: "Displaying a sustainability label that is not based on a certification scheme or not established by public authorities."
- 4a: "Making a generic environmental claim for which the trader is not able to demonstrate recognised excellent environmental performance relevant to the claim."
- 4b: "Making an environmental claim about the entire product or the trader's entire business when it concerns only a certain aspect of the product or a specific activity of the trader's business."
- 4c: "Claiming, based on the offsetting of greenhouse gas emissions, that a product has a neutral, reduced or positive impact on the environment in terms of greenhouse gas emissions."
- 10a: "Presenting requirements imposed by law on all products within the relevant product category on the Union market as a distinctive feature of the trader's offer."

The recital that explains 10a is recital (15) of Directive 2024/825 (http://publications.europa.eu/resource/celex/32024L0825, fetched 2026-11-27, line 49 of the text copy): the prohibition applies "where a trader advertises a given product as not including a specific chemical substance when that substance is already forbidden by law for all products within that product category in the Union". It adds: "the prohibition should not cover commercial practices promoting traders' or products' compliance with legal requirements that only apply to some products but not to other competing products of the same category on the Union market, such as products of non-Union origin." So the test is whether the legal requirement binds every competitor in the category. For "GDPR-compliant" that depends on the category and the product, and this research does not decide it. It follows that MKT-CLAIM-14 should keep banning "compliant with <law>" (already unverifiable by an agent) and add a sentence-level reading check with the recital's test.

The same Directive's recital for 4a (line 37) gives examples of generic environmental claims: "'environmentally friendly', 'eco-friendly', 'green', ... 'climate friendly', ... 'energy efficient', 'biodegradable'". Recital for 4c (line 43) gives "'climate neutral', 'CO2 neutral certified', 'carbon positive', 'climate net zero'". The fleet writes no such copy today (wave-1 corpus), so these patterns are advisory.

## Effect on the ruleset

| Rule | Effect | Detail |
|---|---|---|
| MKT-CLAIM-03 | change (rationale) | New citation target and text below, with Verify. |
| MKT-CLAIM-04 | change (one field) | Add `verification_method` to the `endorsement` class. |
| MKT-CLAIM-10 | change (verify pattern) | Add the review-checking limitation line to the protected phrases. |
| MKT-CLAIM-14 | change (text, rationale, verify) | Add the 10a reading check. |
| MKT-CLAIM-20 | change (text, rationale, verify) | Add the 23b review-checking statement. |
| MKT-CLAIM-24 | confirm | Recital 49 of 2019/2161 names fake social "likes". |
| MKT-CLAIM-26 | confirm | Recital 49 names "publishing only positive reviews and deleting the negative ones". |
| MKT-CLAIM-27 | NEW (SHOULD) | Prior price in a reduction announcement. |
| Source table, row "03, 13" | change | Cellar consolidation as source, caveat lifted for 2024/825, with Verify. |

### MKT-CLAIM-03, rationale replacement (change)

Replace the rationale's citation with: "price is a listed element of the EU misleading-action test, and 'free' while the reader pays more than the unavoidable cost is always unfair ([Directive 2005/29/EC Art. 6(1)(d) and Annex I point 20](http://publications.europa.eu/resource/celex/02005L0029-20260927), Publications Office consolidated text of 2026-09-27, fetched 2026-11-27, refresh_by 2027-05-27; Annex I is the list of practices that 'shall in all circumstances be regarded as unfair', Art. 5(5)). The fleet has no prices, so any price an agent writes is invented." The rule text and the existing check-E verify stay as in wave-1.

Verify (added): the cited passages exist at the cited URL. Run on 2026-11-27, output as shown:

```
U=http://publications.europa.eu/resource/celex/02005L0029-20260927
for q in 'Describing a product as .gratis., .free., .without charge. or similar' 'the price or the manner in which the price is calculated' 'shall in all circumstances be regarded as unfair'; do
  echo -n "$q => "; curl -sL -H "Accept: application/xhtml+xml" -H 'Accept-Language: en' "$U" | tr '\n' ' ' | sed 's/<[^>]*>//g' | tr -s ' ' | grep -c "$q"; done
```

Output of the run on 2026-11-27:

```
Describing a product as .gratis., .free., .without charge. or similar => 1
the price or the manner in which the price is calculated => 1
shall in all circumstances be regarded as unfair => 1
```

Pass condition: each line ends in `1` or more. A `0` means the page changed and the rationale is re-read before the next publish.

### Source table, row "03, 13" (change)

Replace the row with: "EU Directive 2005/29/EC Art. 5(5), 6, 7, Annex I, consolidated 2026-09-27 ([Publications Office Cellar](http://publications.europa.eu/resource/celex/02005L0029-20260927), fetched 2026-11-27); Directive 98/6/EC Art. 6a ([Cellar consolidation 2022-05-28](http://publications.europa.eu/resource/celex/01998L0006-20220528), fetched 2026-11-27) | refresh 2027-05-27. Fetch with `Accept: application/xhtml+xml` and `Accept-Language: en`; `text/html` returns 404." The caveat "later EU amendments unverified" is lifted for the UCPD (2024/825 read) and for 98/6 (single amending act, SPARQL, 2026-11-27).

Verify: `grep -c 'publications.europa.eu/resource/celex/02005L0029-20260927' .agents/research/marketing-claims-evidence.md` prints at least 1 (the row cites the Cellar text), and the three commands under "MKT-CLAIM-03, rationale replacement" and the 98/6 command below print `1` or more:

```
curl -sL -H "Accept: application/xhtml+xml" -H 'Accept-Language: en' http://publications.europa.eu/resource/celex/01998L0006-20220528 | tr '\n' ' ' | sed 's/<[^>]*>//g' | tr -s ' ' | grep -c "lowest price applied by the trader during a period of time not shorter than 30 days"
1
```

(Output from 2026-11-27. The xhtml wraps lines mid-sentence, hence the `tr` and `sed`; a plain `grep` on the raw response printed 0 for this passage.)

### MKT-CLAIM-20, exact new text (change)

Append to the rule: "If the page states or implies that reviews come from customers who used the product ('verified', 'real customers', 'from users'), the same page also states whether and how that is checked. The `endorsement` record then holds `verification_method`. Never write that reviews are from real customers without a `verification_method`."

Rationale to append: "EU Annex I point 23b makes it unfair 'in all circumstances' to state that reviews are submitted by consumers who used or bought the product 'without taking reasonable and proportionate steps to check'; point 23c bars submitting or commissioning false reviews or endorsements and 'misrepresenting consumer reviews or social endorsements' ([Directive 2005/29/EC Annex I, consolidated 2026-09-27](http://publications.europa.eu/resource/celex/02005L0029-20260927), fetched 2026-11-27). Art. 7(6), added by [Directive 2019/2161](http://publications.europa.eu/resource/celex/32019L2161) (fetched 2026-11-27), makes the 'whether and how' of review checking a material fact. B2C only (Art. 3(1))."

Verify to append: `grep -rniE 'verified (review|customer|purchase)|real (customers|users)|from (our )?(customers|users)' <review-bearing surfaces>`: every hit resolves to an `endorsement` row with a non-empty `verification_method`, and the same page carries a sentence matching `checked|verified by|we (confirm|verify)`. The lint rejects a hit with no such row. Pattern tested on 2026-11-27 against the line `Verified customer reviews from real customers`, output `Verified customer` and `real customers`.

### MKT-CLAIM-04, field addition (change)

Add to the `endorsement` row of the class table: `verification_method`, required when the page uses a "real customer" word; free text naming the check ("purchase record matched by order id", "none, reviews are not checked"). Verify: check A (schema) fails an `endorsement` row whose `claim` matches the MKT-CLAIM-20 grep pattern and whose `verification_method` is missing or empty.

### MKT-CLAIM-10, verify pattern (change)

Add `reviews (are )?not (checked|verified)` to the protected-phrase alternation of the verify, so an edit cannot delete the limitation line that Art. 7(6) turns into a material fact. New verify: `git diff -U0 origin/main -- <surfaces> | grep '^-' | grep -v '^---' | grep -i -E 'no (third-party )?audit|no signature|early development|pre-1\.0|unstable|no bounty|keep:absence|reviews (are )?not (checked|verified)'` prints nothing, unless the same commit changes the matching record. Tested on 2026-11-27: the input line `-reviews are not checked` printed `-reviews are not checked` (the pattern matches, so the verify would fail the edit).

### MKT-CLAIM-14, added reading check (change)

Append to the rule: "Never present a legal obligation as a distinguishing feature of the product ('GDPR-compliant', 'we encrypt personal data as required by law', 'meets the legal minimum, unlike others')."

Rationale to append: "UCPD Annex I point 10a (applies from 2026-09-27 under [Directive 2024/825 Art. 4](http://publications.europa.eu/resource/celex/32024L0825), fetched 2026-11-27): 'Presenting requirements imposed by law on all products within the relevant product category on the Union market as a distinctive feature of the trader's offer' ([consolidated 2026-09-27](http://publications.europa.eu/resource/celex/02005L0029-20260927), fetched 2026-11-27). Recital (15) of that Directive limits the ban to requirements that bind every competitor in the category."

Verify: the existing grep in MKT-CLAIM-14 already catches `(GDPR|HIPAA|CCPA|AI Act)[- ](compliant|certified)`. Add the reading check: a sentence naming a law next to "we" or "our" and a mechanism word (`encrypt|delete|consent`) is read by the agent against the question "does every competitor in the category have to do this too?". The agent never decides. If yes or unsure, it lists the sentence for the owner.

### MKT-CLAIM-27 (NEW), prior price in a reduction announcement

- *Rule (SHOULD, MUST once the owner publishes any consumer price):* Never announce a price reduction ("was X, now Y", "N% off", "save N", a struck-through price) unless a `price-or-limit` record holds `prior_price`, the lowest price the trader applied in the 30 days before the reduction, and `prior_price_window` (start and end dates). The copy shows that prior price. A list price, a competitor price or a recommended price is not a prior price.
- *Rationale:* Directive 98/6/EC Art. 6a(1) and (2): "Any announcement of a price reduction shall indicate the prior price", and "The prior price means the lowest price applied by the trader during a period of time not shorter than 30 days prior to the application of the price reduction" ([Cellar consolidation 2022-05-28](http://publications.europa.eu/resource/celex/01998L0006-20220528), fetched 2026-11-27). Applies in the EU from 2022-05-28 ([Directive 2019/2161 Art. 7(1)](http://publications.europa.eu/resource/celex/32019L2161), fetched 2026-11-27). Whether a software subscription is a "product" of 98/6 is not settled by the text (see gaps), so the severity stays SHOULD until the owner or counsel decides. MKT-CLAIM-03 already blocks any agent-written price, so this rule matters only after the owner provides a price.
- *Verify:* `grep -rniE 'was [$€£][0-9]|[0-9]+ ?% off|save [$€£]?[0-9]|~~[$€£][0-9]|<(s|del)>[^<]*[$€£][0-9]' <surfaces>`: every hit resolves to a live `price-or-limit` row with `prior_price`, `prior_price_window` of at least 30 days ending the day before the reduction, and `check` that re-reads the price history. A hit with no such row fails check E. Pattern tested on 2026-11-27 against `<s>$20</s> now $15; was $20; 30% off; save $5; ~~$20~~`: it matched `<s>$2`, `was $2`, `30% off`, `save $5` and `~~$2` (`grep -o` stops each match at the first digit class, which is enough to flag the line).

## AI-agent angle

| Typical agent mistake | Why it breaks Annex I or Art. 6a | Smallest mechanical check |
|---|---|---|
| Writes "Loved by thousands of verified users" on a page whose reviews are unchecked. | 23b: the statement needs "reasonable and proportionate steps to check". | The `verified (review|customer)` grep above, joined to a `verification_method` field. |
| Drafts three example testimonials "as placeholders". | 23c: submitting false consumer reviews; also MKT-CLAIM-20. | MKT-CLAIM-20 verify, already in place. |
| Adds a strike-through "was $20" next to a new price to make an offer look good. | Art. 6a: the prior price must be the lowest price of the previous 30 days. | MKT-CLAIM-27 grep. |
| Trims a limitation line ("reviews not checked") because it reads badly. | Art. 7(6) makes "whether and how" a material fact. | MKT-CLAIM-10 pattern, extended above. |
| Writes "carbon neutral" or "eco-friendly" on a page. | 4a to 4c, from 2026-09-27. | Add `carbon[- ]neutral|climate[- ]neutral|eco[- ]friendly|green` to MKT-CLAIM-14's blocked grep when the owner confirms the product has such copy. |

## Contested and evolving

- Whether Art. 6a of 98/6 reaches digital services is not decided by the Directive text read here. No national implementation was read.
- Whether "GDPR-compliant" falls under 10a depends on the recital (15) test (does the requirement bind every competitor in the category). This research did not decide it.
- The UCPD Annex I reaches B2C only. Whether a B2B developer-tool page with fake logos is reached depends on national law, and the US question (Part 465) is separate.
- The Digital Fairness Act proposal (announced for the EU consumer rules) was not researched. If it changes Annex I, the 6-month refresh on the rule rows will find it.

## What could not be determined

- Whether 98/6/EC Art. 6a applies to a software subscription or licence. Missing: a definition of "product" in 98/6 (Art. 2 has none), a CJEU ruling, and the national implementing acts or authority guidance of the Member State where the owner sells. The owner's seller country is unknown to this research. The owner or counsel decides.
- National penalty amounts for the owner's country. Only the Directive minimum (4 % of annual turnover in coordinated cross-border cases; EUR 2 million where turnover is unknown) was read.
- The wording of Member States' transposition of 23b (the "reasonable and proportionate steps" threshold). Recital 47's example is the only guidance read.
- The Cellar SPARQL metadata could lag a very recent amendment (days to weeks). The amender list for 98/6 is as of 2026-11-27 only.

## Dated facts

| Fact | Date | Refresh |
|---|---|---|
| UCPD Annex I points 23a to 23c text as quoted, identical in consolidations 2022-05-28 and 2026-09-27 ([Cellar](http://publications.europa.eu/resource/celex/02005L0029-20260927)). | fetched 2026-11-27 | 2027-05-27 |
| Directive 2019/2161 transposition by 2021-11-28, applied from 2022-05-28 ([Cellar](http://publications.europa.eu/resource/celex/32019L2161)). | OJ 2019-12-18, fetched 2026-11-27 | stable |
| 98/6/EC Art. 6a text, consolidation 2022-05-28 ([Cellar](http://publications.europa.eu/resource/celex/01998L0006-20220528)). Only amender: 2019/2161 (SPARQL). | fetched 2026-11-27 | 2027-05-27 |
| Directive (EU) 2024/825 ([Cellar](http://publications.europa.eu/resource/celex/32024L0825)): transposition by 2026-03-27, applies from 2026-09-27; adds points 2a, 4a to 4c, 10a, 23d to 23j. | fetched 2026-11-27 | 2027-05-27 |
| Cellar retrieval pattern: `Accept: application/xhtml+xml` plus `Accept-Language: en` on `publications.europa.eu/resource/celex/<celex>`; `text/html` returned 404 for five of five numbers tried; omitting the language header returned 400 for 01998L0006-20220528. | 2026-11-27 | re-test before reuse |

## Sources

All fetched 2026-11-27 (UTC 13:07 to 13:13), vendor-neutral primary law. Consolidated texts are the Publications Office's documentation tool and carry no legal effect; the Official Journal is authentic.

| URL | What | Date | Why |
|---|---|---|---|
| http://publications.europa.eu/resource/celex/02005L0029-20260927 | UCPD consolidated text | 2026-09-27 | Annex I (2a, 4a to 4c, 10a, 20, 23a to 23j), Art. 2(c), 3(1), 5(5), 6(1)(d), 7(6) |
| http://publications.europa.eu/resource/celex/02005L0029-20220528 | UCPD consolidated text | 2022-05-28 | Check that 23a to 23c did not change; Art. 7(6) at line 191 |
| http://publications.europa.eu/resource/celex/32019L2161 | Directive (EU) 2019/2161 | 2019-11-27, OJ 2019-12-18 | Recitals 47 to 49, Art. 3(4)(c), 3(5), 7(1), the Art. 6a text |
| http://publications.europa.eu/resource/celex/01998L0006-20220528 | Directive 98/6/EC consolidated | 2022-05-28 | Art. 1, 2, 3(2), 6a |
| http://publications.europa.eu/resource/celex/32024L0825 | Directive (EU) 2024/825 | 2024-02-28 | Art. 4(1), recital (15), points 2a, 4a to 4c, 10a, 23d to 23j |
| http://publications.europa.eu/webapi/rdf/sparql | Publications Office SPARQL endpoint | queried 2026-11-27 | Consolidated versions of 31998L0006 and the amenders of 31998L0006 and 32005L0029 |
