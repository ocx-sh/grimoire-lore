---
title: Do national transpositions make MKT-POS-14 stricter
program: product
topic: marketing-positioning-record
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 9
---

# Do national transpositions of 2006/114/EC, UK BPRs 2008 and Lanham Act 43(a) make MKT-POS-14 stricter?

## Answer

No. The three regimes add no checkable obligation that MKT-POS-14 lacks. Germany (UWG s.6(2)) and the UK (BPR reg. 4) restate the Directive's Art. 4 conditions in near-identical words (differences listed in Finding 4). The third regime, Lanham Act 43(a)(1)(B), is a general misrepresentation rule with no staleness window; it supports the rule's exact-version requirement. The rule needs a rationale update and a rationale verification, not a changed MUST. This is a reading of the texts, not a legal opinion.

Repair note: this pass re-fetched the Directive and the UCPD (both missing from the first pass), re-fetched the UWG, reg. 4 and 15 USC 1125, and recorded commands and outputs below. Reg. 2, reg. 3, the reg. contents page and Lexmark were fetched in the first pass and were not re-run in the repair; they are marked as such.

## Method and recorded commands

Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/q2-repair/`. Text extraction: `python3 -I` stripping tags (output files `*.txt`). All commands run 2026-11-27.

**Fetch log** (`curl -sL -A "research-client" -m 60 -o <hash>.html -w "<hash> %{http_code} %{size_download} <url>\n" <url>`):

```
ec1771 200 90386  https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html
f5e487 200 35754  https://www.legislation.gov.uk/uksi/2008/1276/regulation/4
1eb74b 200 117710 https://www.law.cornell.edu/uscode/text/15/1125
38f54d 202 0      https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32006L0114
627cf6 202 0      https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32005L0029
```

The two EUR-Lex HTML endpoints answered HTTP 202 with an empty body (a bot challenge; WebFetch on the same URLs also returned a blank page). A retry with a browser user agent returned 202 and 2035 bytes. The Publications Office content-negotiation endpoint worked:

```
curl -sL -m 90 -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" -o cellar-<CELEX>.html -w "<CELEX> %{http_code} %{size_download} %{content_type}\n" http://publications.europa.eu/resource/celex/<CELEX>
32006L0114 200 78262  application/xhtml+xml;charset=UTF-8
32005L0029 200 180625 application/xhtml+xml;charset=UTF-8
```

Without the `Accept` header the same URL returns `400 205` bytes. This matters for the verification below.

## Findings

### 1. EU baseline: Directive 2006/114/EC (codified version)

Source: [Directive 2006/114/EC, OJ L 376, 27.12.2006, p. 21, "Done at Strasbourg, 12 December 2006"](http://publications.europa.eu/resource/celex/32006L0114), fetched 2026-11-27 via the Cellar endpoint above. Entry into force, quoted: "Article 11 This Directive shall enter into force on 12 December 2007." (Article 10 repeals Directive 84/450/EEC.)

Operative text, quoted from the fetched file (command `grep -o "Article 4 Comparative advertising.\{0,2300\}" cellar-32006L0114.txt`):

> "Article 4 Comparative advertising shall, as far as the comparison is concerned, be permitted when the following conditions are met: (a) it is not misleading within the meaning of Articles 2(b), 3 and 8(1) of this Directive or Articles 6 and 7 of Directive 2005/29/EC ... (b) it compares goods or services meeting the same needs or intended for the same purpose; (c) it objectively compares one or more material, relevant, verifiable and representative features of those goods and services, which may include price; (d) it does not discredit or denigrate the trade marks, trade names, other distinguishing marks, goods, services, activities or circumstances of a competitor; ... (h) it does not create confusion among traders ..."

Staleness check on the Directive text (`grep -ciE "stale|outdated|out-of-date|up[- ]to[- ]date|days|months" cellar-32006L0114.txt`):

```
0
```

The count of 0 matches means the Directive has no recency or staleness wording at all.

### 2. EU: UCPD 2005/29/EC Article 7 (the omission comparator)

Source: [Directive 2005/29/EC, OJ L 149, 11.6.2005, p. 22, "Done at Strasbourg, 11 May 2005"](http://publications.europa.eu/resource/celex/32005L0029), fetched 2026-11-27 via the Cellar endpoint. Command `grep -o "Article 7 Misleading omissions.\{0,1700\}" cellar-32005L0029.txt`, quoted:

> "1. A commercial practice shall be regarded as misleading if, in its factual context ... it omits material information that the average consumer needs, according to the context, to take an informed transactional decision ... 2. It shall also be regarded as a misleading omission when ... a trader hides or provides in an unclear, unintelligible, ambiguous or untimely manner such material information ..."

`grep -oiE ".{40}(outdated|up[- ]to[- ]date|stale).{40}" cellar-32005L0029.txt` returned no lines: no staleness wording here either. Art. 7 is consumer-facing ("average consumer"); the UWG s.5a reaches "consumer or other market participant" (Finding 3), which is the B2B extension relevant to a developer README.

### 3. Germany: UWG sections 6 and 5a (English translation)

Source: [gesetze-im-internet.de, English UWG](https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html), fetched 2026-11-27 (HTTP 200, 90386 bytes). The page states "12 February 2026 (Federal Law Gazette 2026 I No. 43)" as the latest amendment and "This Act serves to implement Directive 2005/29/EC ...". A translation, not the binding German text.

Command `grep -o "Section 6 Comparative advertising.\{0,1900\}" ec1771.txt`, quoted:

> "(2) Unfairness is deemed to have occurred where a person conducting comparative advertising uses a comparison which 1. does not relate to goods or services which meet the same needs or are intended for the same purpose; 2. does not objectively relate to one or more material, relevant, verifiable and representative features of the goods concerned or to the price of those goods or services; 3. leads ... to a risk of confusion ...; 5. discredits or denigrates the goods, services, activities, or personal or business circumstances of a competitor; ..."

Command `grep -o "Section 5a.\{0,1300\}" ec1771.txt`, quoted:

> "(1) Unfairness is also deemed to have occurred where a person misleads a consumer or other market participant by omitting material information 1. which the consumer or other market participant needs, according to the relevant context, to take an informed transactional decision ... (2) ... 2. the provision of material information in an unclear, unintelligible or ambiguous manner and 3. the provision of material information in an untimely manner."

Staleness check (`grep -oiE "outdated|out-of-date|up[- ]to[- ]date|stale|within [0-9]+ (days|months)|[0-9]+ days" ec1771.txt | sort | uniq -c`): empty output, no match.

Difference from the Directive: s.6(2)(2) is phrased as a negative ("does not objectively relate to"), and s.6(2) lists the conditions as deemed unfairness rather than as conditions for permission. The content is the same limbs. Added scope: s.5a covers "other market participant", so a B2B README is in scope.

### 4. UK: Business Protection from Misleading Marketing Regulations 2008, regulation 4

Source: [reg. 4, SI 2008/1276](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4), fetched 2026-11-27 (HTTP 200, 35754 bytes). Page states: "Changes to legislation: There are currently no known outstanding effects for The Business Protection from Misleading Marketing Regulations 2008, Section 4." and "Reg. 4(b) substituted (6.4.2025) by The Digital Markets, Competition and Consumers Act 2024 (Consequential Amendments) Regulations 2025 (S.I. 2025/381)".

Command `grep -o "Comparative advertising.\{0,1500\}" f5e487.txt`, quoted:

> "4. Comparative advertising shall, as far as the comparison is concerned, be permitted only when the following conditions are met— (a) it is not misleading under regulation 3; (b) it is not a misleading action under section 225(4)(a) and section 226 of the Digital Markets, Competition and Consumers Act 2024 or a misleading omission under section 225(4)(a) and section 227 of that Act; (c) it compares products meeting the same needs or intended for the same purpose; (d) it objectively compares one or more material, relevant, verifiable and representative features of those products, which may include price; ... (f) it does not discredit or denigrate the trade marks, trade names, other distinguishing marks, products, activities, or circumstances of a competitor; ..."

Staleness check (`grep -oiE "outdated|out-of-date|up[- ]to[- ]date|stale|within [0-9]+ (days|months)|[0-9]+ days" f5e487.txt | sort | uniq -c`):

```
      1 up to date
```

The single hit is boilerplate: "Revised legislation carried on this site may not be fully up to date." It is not a duty on advertisers. So no staleness window.

Differences from the Directive: the UK text says "permitted only when" where the Directive says "permitted when"; the Directive's Art. 4(a) UCPD cross-reference became the DMCC Act 2024 sections 225 to 227 (not fetched, so their content is not stated). Reg. 2 (definition of "advertising": "any form of representation which is made in connection with a trade, business, craft or profession in order to promote the supply or transfer of a product"), reg. 3 and the contents page (criminal offence provisions, Part 2) were read in the first pass and not re-run in the repair.

Mapping used in the table below: Directive 4(c) = UWG 6(2)(2) = UK reg. 4(d); Directive 4(d) = UWG 6(2)(5) = UK reg. 4(f). Both confirmed by the quoted passages above. The UK reg. 4(b) text above also shows that its omission limb is the DMCC Act (no longer the UCPD).

### 5. US: Lanham Act section 43(a), 15 U.S.C. 1125(a)(1)(B)

Source: [Cornell LII, 15 USC 1125](https://www.law.cornell.edu/uscode/text/15/1125), fetched 2026-11-27 (HTTP 200, 117710 bytes); latest amendment note on the page, quoted: "Pub. L. 112-190, § 1(a), Oct. 5, 2012, 126 Stat. 1436", which adds subparagraphs (A) and (B). Command `grep -o "(B) in commercial advertising or promotion.\{0,300\}" 1eb74b.txt`, quoted:

> "(B) in commercial advertising or promotion, misrepresents the nature, characteristics, qualities, or geographic origin of his or her or another person's goods, services, or commercial activities, shall be liable in a civil action by any person who believes that he or she is or is likely to be damaged by such act."

Staleness check (same `grep -oiE` pattern on `1eb74b.txt`): one hit, `1 180 days`, from an unrelated 1999 statutory note about a reporting deadline ("Not later than 180 days after the date of the enactment of this ..."). It sets no advertiser duty.

Supporting case (first pass, not re-fetched in the repair): [Lexmark v. Static Control, No. 12-873, decided 2014-03-25](https://www.law.cornell.edu/supremecourt/text/12-873): plaintiff must allege "an injury to a commercial interest in reputation or sales" proximately caused by the deception.

Reading: a misrepresentation test with no comparison-specific conditions, no denigration limb and no staleness window. A table that states a competitor's feature or version wrongly is a misrepresentation of "another person's goods" if it is "commercial advertising or promotion". This supports MKT-POS-14's exact `competitor_version` and `observed` evidence. Whether a README counts as "commercial advertising or promotion" is a case-law question that was not researched.

### 6. Comparison with the current rule

| Element of MKT-POS-14 | EU Directive 2006/114 | UWG | UK BPR 2008 | Lanham 43(a)(1)(B) |
|---|---|---|---|---|
| Verifiable, representative features (version, observed, record) | Art. 4(c) | s.6(2)(2) | reg. 4(d) | "qualities" of "another person's goods" |
| Denigration ban-word scan | Art. 4(d) | s.6(2)(5) | reg. 4(f) | no limb |
| Rendered `competitor_strength` (omission) | Art. 4(a) via UCPD Art. 7 | s.5a(1),(2) | reg. 4(b) via DMCC Act 2024 s.225(4)(a), s.227 (not fetched) | no limb |
| Staleness window | none (0 grep hits) | none (no hits) | none (one boilerplate hit) | none (one unrelated hit) |

Nothing in the table is stricter than the rule. The 90-day window remains project judgement.

## Effect on the ruleset

**MKT-POS-14: change (rationale text only; the rule text and MUST are unchanged; a new rationale verification is added below).**

New rationale, replacing the first two rationale sentences. Every claim carries its source date inline:

> "EU Directive 2006/114/EC Art. 4(c) requires 'material, relevant, verifiable and representative' features and Art. 4(d) forbids denigration ([OJ L 376, 27.12.2006, in force 2007-12-12; text checked 2026-11-27](http://publications.europa.eu/resource/celex/32006L0114)). Germany states both in UWG section 6(2)(2) and (5), and extends omission rules to 'other market participant' in section 5a ([English translation reflecting the Act of 2026-02-12; checked 2026-11-27](https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html)). The UK states them in regulation 4(d) and 4(f) of SI 2008/1276 ([legislation.gov.uk, reg. 4(b) substituted 2025-04-06, no outstanding effects as of 2026-11-27](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4)). The three use the same conditions in near-identical words, and the two national texts also reach business readers. US Lanham Act 43(a)(1)(B) bars misrepresenting 'another person's goods' in 'commercial advertising or promotion' ([15 USC 1125, last amendment noted 2012-10-05; checked 2026-11-27](https://www.law.cornell.edu/uscode/text/15/1125)). None of the four texts sets a staleness window; the 90-day limit is a project choice."

Reason: records that the transpositions were checked and that one rule covers all four jurisdictions, so an agent does not add per-country variants.

**Verification of the changed rationale (new, runnable by an agent).** Check (a): each cited URL resolves with HTTP 200 and the text still contains the phrase the rationale relies on. Check (b): every link in the rationale is followed by a date. The Directive link needs the Cellar `Accept` headers; without them the endpoint answers 400 and EUR-Lex HTML answers 202, so a plain `curl` check would give a false failure.

```sh
chk(){ u="$1"; p="$2"; shift 2
  body=$(curl -sL -m 90 "$@" "$u" | sed 's/<[^>]*>/ /g; s/&nbsp;/ /g' | tr -s '[:space:]' ' ')
  code=$(curl -sL -m 90 -o /dev/null -w '%{http_code}' "$@" "$u")
  if printf '%s' "$body" | grep -qF "$p"; then r=PHRASE-OK; else r=PHRASE-MISSING; fi
  echo "$code $r $u"; }
chk "http://publications.europa.eu/resource/celex/32006L0114" "material, relevant, verifiable and representative" -H "Accept: application/xhtml+xml" -H "Accept-Language: eng"
chk "https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html" "does not objectively relate to one or more material, relevant, verifiable and representative features"
chk "https://www.legislation.gov.uk/uksi/2008/1276/regulation/4" "objectively compares one or more material, relevant, verifiable and representative features"
chk "https://www.law.cornell.edu/uscode/text/15/1125" "commercial advertising or promotion, misrepresents the nature, characteristics, qualities"
```

Pass condition: four lines, each `200 PHRASE-OK`; any other line fails the check and triggers a refresh of row 14. Output of this exact script run 2026-11-27:

```
200 PHRASE-OK http://publications.europa.eu/resource/celex/32006L0114
200 PHRASE-OK https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html
200 PHRASE-OK https://www.legislation.gov.uk/uksi/2008/1276/regulation/4
200 PHRASE-OK https://www.law.cornell.edu/uscode/text/15/1125
```

Check (b), dates beside links: `grep -c "checked 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]" <rationale>` must return 4 (one per link). Add the four sources to refresh-table row 14, refresh_by 2027-05-27. The existing denigration scan and exact-version verification of MKT-POS-14 are unchanged.

No new rule: a jurisdiction-specific rule would have no repository-checkable form that the existing `comparison` record, rendered `competitor_strength` and denigration scan do not already provide.

## Dated facts

| Fact | Source | Date | Refresh |
|---|---|---|---|
| Directive 2006/114/EC Art. 4(a)-(h) text; "shall enter into force on 12 December 2007"; signed 12 Dec 2006; OJ L 376, 27.12.2006 | [Cellar, CELEX 32006L0114](http://publications.europa.eu/resource/celex/32006L0114) | act 2006-12-12; fetched 2026-11-27 | stable unless amended; 2027-05-27 |
| Directive 2005/29/EC Art. 7(1),(2) text; signed 11 May 2005; OJ L 149, 11.6.2005 | [Cellar, CELEX 32005L0029](http://publications.europa.eu/resource/celex/32005L0029) | act 2005-05-11; fetched 2026-11-27 | stable unless amended; 2027-05-27 |
| UWG s.6(2), s.5a text (English translation) | [gesetze-im-internet.de](https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html) | translation reflects Act of 2026-02-12; fetched 2026-11-27 | 2027-05-27 |
| SI 2008/1276 reg. 4 text; (b) substituted 2025-04-06 by SI 2025/381; no known outstanding effects | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4) | fetched 2026-11-27 | 2027-05-27 |
| 15 USC 1125(a)(1)(B) text; last noted amendment 2012-10-05 | [law.cornell.edu](https://www.law.cornell.edu/uscode/text/15/1125) | fetched 2026-11-27 | 2027-05-27 |
| Lexmark v. Static Control, No. 12-873 (first pass, not re-fetched) | [law.cornell.edu](https://www.law.cornell.edu/supremecourt/text/12-873) | decided 2014-03-25 | stable unless overruled |

## What could not be determined

- The EUR-Lex HTML endpoints block automated clients (HTTP 202, empty body); the Directive text was read from the Publications Office Cellar endpoint instead, which is the same legal act in a machine-readable form. A human clicking the EUR-Lex ELI link is not blocked by this test, but that was not tried.
- The binding German text of UWG (only the English translation was read) and any German case law on README or developer-documentation comparisons.
- DMCC Act 2024 sections 225 to 227 (the UK omission limb) and the penalty text of BPR reg. 6 and 7.
- Whether a README is "commercial advertising or promotion" under Lanham Act case law (circuit tests); no case law fetched.
- Other Member States' transpositions beyond Germany.
- Legal advice: none of this replaces a lawyer's review for a named-competitor table in a commercial product.
