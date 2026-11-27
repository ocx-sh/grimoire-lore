---
title: Is there an independent study of how accurate HDYHAU is, and select list versus free text
program: product
topic: marketing-measurement
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
---

# Follow-up q0: independent evidence on "how did you hear about us" (HDYHAU)

## Question

Is there any independent (non-vendor) study of how accurate self-reported attribution (HDYHAU) is, and whether a select list or free text works better? MKT-MEAS-12 stays low confidence until one is found.

## Contents

1. Answer
2. Searches run and pages fetched
3. Findings
4. Effect on the ruleset
5. Measurements (verification checks, executed)
6. Dated facts
7. What could not be determined
8. Sources

## Answer

No study of HDYHAU accuracy against a known true source was found. No independent study compares a select list with free text for that question. The gap stands, and MKT-MEAS-12 stays low confidence.

Three independent sources bear on halves of the question. None tests HDYHAU:

- Open text versus drop-down, two experiments with opposite signs. Reja et al. (2003) found open formats give more missing and inadequate answers. A 2010 split-ballot with 12,825 respondents found the open text box got a higher response rate than the drop-down (about 97% against 86%). The answer depends on the question, so no direction can be assumed for HDYHAU.
- Pew (2021) states closed-ended questions give lower item nonresponse than open-ended ones.
- Self-reported recall of a named, shown ad campaign tracks logged exposure (Romberg et al. 2020, odds ratio 2.52). That is prompted recall of one campaign. It does not test an unprompted "where did you first hear" question.

Every HDYHAU-specific source in the searches was a vendor.

## Searches run and pages fetched

All six searches ran with WebSearch on 2026-11-27, mode "standard". The query strings are exact. The tool returns a link list plus its own summary; the link lists and the decisive lines of each summary are given.

| # | Exact query string | Returned (links, in order) and verdict |
|---|---|---|
| 1 | `"how did you hear about us" self-reported attribution accuracy study peer-reviewed` | LinkedIn profile, three RevenueCat copies of "how did you hear about us surveys", HockeyStack "self reported attribution report 2024", Outbrain "Self-Reported Attribution ... A Practical Guide", Ruler Analytics "Do You Need a 'How Did You Hear About Us?' Form Field?", two Outfunnel pages, Usermaven. Tool verdict: "didn't turn up any peer-reviewed study ... Every result is a vendor or marketing blog". |
| 2 | `"how did you hear about us" open-ended versus dropdown response quality experiment` | Survey Practice 3003 (two URLs), two PMC articles, a Konstanz survey-research-methods article, Pew (three pages), Squarespace Engineering "checkout surveys a data science approach", ARF. Tool verdict: "didn't find a published experiment that tests the exact 'how did you hear about us' question as open-ended versus dropdown". |
| 3 | `patient "referral source" self-report accuracy compared with records "how did you hear about"` | Four escholarship.org records, RAND concordance paper, AJMC, a Psychiatric Services Medicaid comparison, PMC2962564, PMC4865457 table T3. Tool verdict: nothing tests a "how did you hear" question against records. A gastroenterology table with a "Provider Accuracy (%)" column surfaced; its definition could not be read (PMC blocked, see below), so it is not used. |
| 4 | `source monitoring Johnson Hashtroudi Lindsay 1993 Psychological Bulletin` | Bibliographic records, PMC2859897, Yale memlab PDFs, encyclopedia.com, DOI links. Confirms the citation: Psychol Bull 114(1), 3-28, July 1993. |
| 5 | `Vandeberg 2015 ad recall recognition validity self-reported exposure; Singh Rothschild 1988 recognition recall measures` | MDPI, IDEAS, EconPapers and PMC records of Romberg et al. 2020, plus PMC4133105 and a PMC record by PMID 12455763. Tool verdict: "I found no Vandeberg 2015 paper, and the Singh & Rothschild 1988 citation appears only secondhand." |
| 6 | `self-reported attribution Ruler Analytics 72% Refine Labs 90% HockeyStack 36 points` | HockeyStack (4 pages), Refine Labs (4 pages), Ruler Analytics (3 pages), SegmentStream, Improvado, growthspreeofficial, Blend B2B, echai.ventures. All vendors or agencies. |

The vendors Recast, Airbridge and Hyros named in the earlier draft did not come back in these re-run searches, so they are dropped from the table and from the text. RevenueCat, Outbrain, Outfunnel, Usermaven, HockeyStack, Refine Labs and Ruler Analytics did come back.

Pages fetched and read (WebFetch, 2026-11-27): Refine Labs news post; HockeyStack blog page; HockeyStack "state of revenue"; Ruler Analytics post; Survey Practice 3003; Pew decoded post; Squarespace Engineering post; Europe PMC full-text XML of Romberg et al. (PMC7177256); Europe PMC record for Johnson et al.; Europe PMC search for Vandeberg; WhatConverts post; Ljubljana repository record of Reja et al.; IDEAS record of Romberg et al. The last three were read in the first pass and are not repeated here.

Fetches that failed, so their claims are not used: pmc.ncbi.nlm.nih.gov article and table pages (reCAPTCHA, three times), MDPI full text (HTTP 403), PubMed (cookie wall), the Reja PDF host (expired certificate), SSOAR (bot wall). The Europe PMC XML endpoint worked for Romberg and is the workaround.

## Findings

### 1. No independent HDYHAU accuracy study

The vendor sources that came back all measure HDYHAU against the vendor's own software attribution. None uses a ground truth, and none is independent. Each figure below is labelled vendor data and is not used as evidence for any rule.

| Vendor claim | Source and date | What the page says | Label |
|---|---|---|---|
| 72% of inbound demos gave vague or no detail | [Ruler Analytics, 2022-07-11](https://www.ruleranalytics.com/?p=23066) | Ruler's own test of over 350 leads on its own demo form, compared with first-click data. No external study cited. The page cautions the result may differ between businesses. | vendor, own data |
| 90% measurement gap | [Refine Labs, 2023-04-07](https://www.refinelabs.com/news/hybrid-attribution-framework) | "A Refine Labs data study", 12 months, 620 declared-intent conversions, $21.5MM closed-won ARR. Method not on the page ("The Vault"). Names no independent party. | vendor, own data |
| "36 points" | [HockeyStack State of Revenue, page dated 2025-12-15](https://hockeystack.com/lab-blog-posts/state-of-revenue) | The earlier draft's "36 points" was a misreading. The page says "a 36% discrepancy between the traditional attribution model data and the self-reported attribution answers", from over 8,500 answers from 36 B2B SaaS companies, 2023-02-01 to 2023-12-31. The separate 2024 report page ([HockeyStack](https://hockeystack.com/blog/self-reported-attribution-report-2024/)) states no sample size and no date. | vendor, own data |

The WhatConverts post (vendor blog, 2025-12-09) argues HDYHAU is unreliable and cites no independent HDYHAU study ([WhatConverts](https://www.whatconverts.com/blog/why-how-did-you-hear-about-us-is-a-useless-question/)). Squarespace Engineering describes randomizing menu order in its own checkout survey "to prevent bias from the order of menu options" and reports no validation of an order effect ([Squarespace Engineering, 2019-11-20](https://engineering.squarespace.com/blog/2019/checkout-surveys-a-data-science-approach)). That is an in-house design choice, not a measured effect.

### 2. Select list versus free text: general survey evidence, signs differ by question

- Reja, Manfreda, Hlebec and Vehovar (2003), "Open-ended vs. close-ended questions in Web questionnaires", split-ballot inside a web survey, one open and two closed versions of one question. Distributions differed between formats, rankings did not. Closed formats gave higher percentages for answers present in both. Open answers were more varied and produced more missing and inadequate answers ([Ljubljana repository record](https://repozitorij.uni-lj.si/IzpisGradiva.php?id=6266), 2003, abstract only; full text unreachable).
- Survey Practice, 2010-07-31, Vol. 3 Issue 4: 12,825 online respondents split between an open text box (6,374) and a drop-down forced choice (6,441) for the primary employment setting. About 97% answered the open version and about 86% the drop-down; "participants who received the open text question format were significantly more likely to provide employment setting data" ([Survey Practice 3003](https://www.surveypractice.org/article/3003)). The paper reports a total of 12,815 in Table 1 against 12,825 in the text. It measures response rate, not accuracy.
- Pew Research Center, 2021-10-14: closed-ended questions "result in lower nonresponse rates than open-ended questions" across survey modes ([Pew](https://www.pewresearch.org/decoded/2021/10/14/why-do-some-open-ended-survey-questions-result-in-higher-item-nonresponse-rates-than-others/markdown)).

What this supports for HDYHAU: a shown list raises the share of listed options (Reja); the effect on blanks goes either way depending on the question (Reja and Pew against Survey Practice). No source measured accuracy against a known source, and none measured a list-order effect. So the wave-1 claim that free text "avoids the order and missing-option biases" is supported only in part: suggested options, yes; order bias, unmeasured; and free text may cost blanks.

### 3. Recall accuracy: valid for named, prompted exposure only

Romberg, Bennett, Tulsiani, Simard, Kreslake, Favatas, Vallone and Hair (2020, IJERPH 17(7), 2185): digital exposure group n = 458, control n = 506. Exposed participants had higher odds of ad recall, OR 2.52, 95% CI 1.87-3.40. Each additional logged impression raised the odds of a higher self-reported frequency, OR 1.08, 95% CI 1.01-1.16. Limitations quoted by the full text: opt-in panel, mostly female sample, exposed and control groups differed in current e-cigarette use (possibly inflating control recall), and Snapchat and Facebook exposure could not be tracked ([Europe PMC full text of PMC7177256](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7177256/fullTextXML), 2020, first 100,000 of 117,424 characters read). It tests recall of one named campaign. It does not validate an unprompted "where did you first hear" question.

Source monitoring (Johnson, Hashtroudi and Lindsay, Psychological Bulletin 114(1), 1993): the Europe PMC record confirms the citation and summarises a framework in which source attribution rests on "qualities of experience resulting from combinations of perceptual and reflective processes", with misattributed familiarity and cryptomnesia among the phenomena ([Europe PMC search record](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1037/0033-2909.114.1.3&resultType=core&format=json), 1993; abstract summarised by the fetch tool, not quoted). It is a theory of why source errors happen. It is not a measurement of HDYHAU and makes no rule here.

Not found: Vandeberg 2015 (a Europe PMC search returned only Hoek 2020 and van Reijmersdal 2016, which list Vandeberg as a co-author; no 2015 paper) and the Singh and Rothschild 1988 text. Neither is cited anywhere in this artifact as evidence.

## Effect on the ruleset

**MKT-MEAS-12: change (wording and verification; severity SHOULD and low confidence unchanged).** Exact new text:

> **MKT-MEAS-12 (SHOULD; low confidence, no independent HDYHAU study found as of 2026-11-27).** Build no sign-up, trial or contact form in order to collect "how did you hear about us" (HDYHAU). Where such a form exists for another reason, add one optional free-text HDYHAU field and store the raw string. Report the answers apart from tagged-click numbers: never sum the two, never rank channels by HDYHAU alone, and print `n_shown`, `n_answered` and `n_blank` as columns of every HDYHAU table, with `n_answered + n_blank = n_shown`.
> - Why: HDYHAU records perception and recall. Every HDYHAU-specific source read is a vendor. The independent evidence is adjacent: Reja et al. 2003 find closed lists raise the share of listed options and open fields raise missing and inadequate answers; a 2010 split-ballot (Survey Practice) found the opposite sign for blanks on another question; recall of a named campaign tracks logged exposure (Romberg et al. 2020). None tests HDYHAU accuracy. Free text is the default because it suggests no options, at the price of unmeasured-direction blanks and manual coding.
> - Verify (form half, unchanged): `rg -n -i -A6 'how did you hear|heard about us|hdyhau' -g '*.{html,astro,jsx,tsx,vue,svelte}' <site src> | rg -i '<select|\brequired\b'` prints nothing, unless the decision record makes the field required.
> - Verify (report half, replaces the earlier `rg -c` pattern, which passed a table whose counts do not add up; see Measurements 1): `python3 -I hdyhau_check.py <report.md>` exits 0. The script is printed in full in Measurements. It finds every table whose header, or the three lines above it, contains `hdyhau|how did you hear|heard about us`, requires integer columns `n_shown`, `n_answered`, `n_blank`, and checks `n_answered + n_blank = n_shown` on each row. Exit 1 names the failing line. A report with no such table exits 0 and prints "no HDYHAU table found"; HDYHAU figures in prose, outside a table, are not seen by this check.

**MKT-MEAS-12 decay row: confirm.** Keep 12 months, next re-check 2027-11-27. Search terms already used, so the next round does not repeat them: the six query strings above. Not yet tried: database-only terms ("referral source" validity in Marketing Science, Journal of Advertising Research), which need library access.

**Conflict C7: change.** Replace the last sentence of C7's Why, "Free text avoids the order and missing-option biases.", with: "Free text avoids suggesting options; independent survey methodology (Reja et al. 2003) shows the cost is more missing and inadequate answers, and no independent source measures an order effect."
Verification (executed, Measurements 2): `rg -c 'avoids the order and missing-option biases' marketing-measurement.md` must exit 1 (no match) and `rg -c 'Reja et al\. 2003\) shows the cost is more missing and inadequate answers' marketing-measurement.md` must print 1 and exit 0.

No other rule is touched. No new rule: the count columns are folded into MKT-MEAS-12.

## Measurements

All run 2026-11-27 in the throwaway directory `~/.cache/research-lang/exemplars/product/wave2/marketing-measurement-q0/` (scripts in `bin/`, fixtures in `fx/`). No existing repository was changed.

### 1. The report check, and the old rg pattern it replaces

`bin/hdyhau_check.py`, the full script:

```python
import re,sys
K=re.compile(r'hdyhau|how did you hear|heard about us',re.I)
bad=0;n=0
L=open(sys.argv[1],encoding='utf-8').read().split('\n')
i=0
while i<len(L):
    if L[i].lstrip().startswith('|'):
        j=i
        while j<len(L) and L[j].lstrip().startswith('|'): j+=1
        T=L[i:j]; ctx=' '.join(L[max(0,i-3):i])+' '+T[0]
        if K.search(ctx):
            n+=1
            h=[c.strip().lower() for c in T[0].strip().strip('|').split('|')]
            if not all(c in h for c in('n_shown','n_answered','n_blank')):
                print(f'FAIL line {i+1}: missing n_shown/n_answered/n_blank column');bad+=1
            else:
                ix=[h.index(c) for c in('n_shown','n_answered','n_blank')]
                for k,r in enumerate(T[2:],start=i+3):
                    v=[c.strip() for c in r.strip().strip('|').split('|')]
                    try: s,a,b=(int(v[x]) for x in ix)
                    except (ValueError,IndexError): print(f'FAIL line {k}: non-integer count');bad+=1;continue
                    if a+b!=s: print(f'FAIL line {k}: {a}+{b}!={s}');bad+=1
        i=j
    else: i+=1
if n==0: print('no HDYHAU table found')
sys.exit(1 if bad else 0)
```

Four fixtures: `good.md` (heading with "HDYHAU", row 100 / 62 / 38), `bad_sum.md` (caption "Table: HDYHAU answers", row 100 / 62 / 30), `bad_cols.md` (heading "How did you hear about us results", columns channel and answers only), `unrelated.md` (a downloads table). Command and output, verbatim:

```
for f in good bad_sum bad_cols unrelated; do echo "== $f"; python3 -I bin/hdyhau_check.py fx/$f.md; echo "exit=$?"; done
== good
exit=0
== bad_sum
FAIL line 5: 62+30!=100
exit=1
== bad_cols
FAIL line 3: missing n_shown/n_answered/n_blank column
exit=1
== unrelated
no HDYHAU table found
exit=0
```

The old pattern from the first draft, run on `bad_sum.md`, whose counts do not add up:

```
rg -n -i -A12 'hdyhau|how did you hear|heard about us' fx/bad_sum.md | rg -c 'n_shown.*n_answered.*n_blank'
1
exit=0
```

It passes the bad table (count 1, "at least 1 per table" was the pass rule). That confirms the earlier criticism, and the Python check replaces it.

### 2. The C7 text change, applied to a scratch copy

The wave-1 file was copied to `fx/c7_before.md`; the one-sentence replacement was applied by a Python script that asserts the old sentence occurs exactly once, giving `fx/c7_after.md`. The original file was not touched. Verification commands:

```
for f in c7_before c7_after; do echo "== $f"; rg -c 'avoids the order and missing-option biases' fx/$f.md; echo "old-text exit=$?"; rg -c 'Reja et al\. 2003\) shows the cost is more missing and inadequate answers' fx/$f.md; echo "new-text exit=$?"; done
== c7_before
1
old-text exit=0
new-text exit=1
== c7_after
old-text exit=1
1
new-text exit=0
```

Before: old text found, new text absent. After: old text absent, new text found. The check discriminates.

### 3. Fleet form files

```
rg -l -i 'how did you hear|heard about us|hdyhau' -g '*.{html,astro,jsx,tsx,vue,svelte}' -g '!node_modules' -g '!.git' -g '!.agents' -g '!target' -g '!dist' /home/mherwig/dev | wc -l
0
```

Zero form files contain the phrase, so the MKT-MEAS-12 form check has nothing to flag and the report check has no real table to run on yet.

The earlier draft also quoted star counts (20 and 17) and weekly repo uniques (19 and 35) from the wave-1 file. They are not needed to answer this question and were not re-measured: the GitHub traffic API needs an authenticated token, and the commission forbids using a credential found on this machine. They are removed from this artifact.

## Dated facts

| Fact | Source | Date | Label |
|---|---|---|---|
| Reja et al.: closed gives higher % for shared answers, open gives more missing and inadequate answers, rankings unchanged | [Ljubljana repository](https://repozitorij.uni-lj.si/IzpisGradiva.php?id=6266) | 2003, fetched 2026-11-27 | independent academic, abstract only |
| Open text 97% vs drop-down 86% response, n = 12,825 | [Survey Practice 3003](https://www.surveypractice.org/article/3003) | 2010-07-31 | independent, different question |
| Closed-ended questions give lower item nonresponse than open-ended | [Pew](https://www.pewresearch.org/decoded/2021/10/14/why-do-some-open-ended-survey-questions-result-in-higher-item-nonresponse-rates-than-others/markdown) | 2021-10-14 | independent, general |
| Romberg et al.: OR 2.52 (1.87-3.40) recall exposed vs control; OR 1.08 per impression; n = 458 and 506 | [Europe PMC XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7177256/fullTextXML) | 2020, fetched 2026-11-27 | independent academic, full text |
| Source-monitoring framework, Psychol Bull 114(1) | [Europe PMC record](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1037/0033-2909.114.1.3&resultType=core&format=json) | 1993 | independent academic, theory only |
| 72% of 350+ demo leads vague or blank | [Ruler Analytics](https://www.ruleranalytics.com/?p=23066) | 2022-07-11 | vendor, own data |
| 90% gap, 620 conversions, $21.5MM ARR | [Refine Labs](https://www.refinelabs.com/news/hybrid-attribution-framework) | 2023-04-07 | vendor, own data |
| 36% discrepancy, 8,500+ answers, 36 companies | [HockeyStack](https://hockeystack.com/lab-blog-posts/state-of-revenue) | 2025-12-15 | vendor, own data |
| Squarespace randomizes menu order, reports no order-effect validation | [Squarespace Engineering](https://engineering.squarespace.com/blog/2019/checkout-surveys-a-data-science-approach) | 2019-11-20 | company blog |
| WhatConverts HDYHAU post cites no independent HDYHAU study | [WhatConverts](https://www.whatconverts.com/blog/why-how-did-you-hear-about-us-is-a-useless-question/) | 2025-12-09 | vendor |

## What could not be determined

- Whether a peer-reviewed paper on referral-source or "where did you hear" accuracy exists in a database the tools cannot reach (Google Scholar, JSTOR, Web of Science, Marketing Science, Journal of Advertising Research). Missing: a human with library access or a logged-in database.
- The full text of Reja et al. (expired certificate, SSOAR bot wall), the gastroenterology referral-accuracy table (PMC reCAPTCHA), and the last 17,424 characters of the Romberg full text. Sample sizes and distributions for Reja are unknown.
- Vandeberg 2015 and Singh and Rothschild 1988: not found in any fetched source, not used.
- Any ground-truth comparison of HDYHAU against tracked first touch. It needs a live form and real traffic, and the commission forbids collecting data from users. The fleet has 0 form files (Measurements 3).
- Whether the direction of the open-versus-closed blank rate holds for HDYHAU. Reja and Pew point one way, Survey Practice the other, all on other questions.

## Sources

| URL | What it is | Date |
|---|---|---|
| https://repozitorij.uni-lj.si/IzpisGradiva.php?id=6266 | Reja et al., open vs closed in web questionnaires (record) | 2003 |
| https://www.surveypractice.org/article/3003 | Survey Practice split-ballot, open text vs drop-down | 2010-07-31 |
| https://www.pewresearch.org/decoded/2021/10/14/why-do-some-open-ended-survey-questions-result-in-higher-item-nonresponse-rates-than-others/markdown | Pew on item nonresponse | 2021-10-14 |
| https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7177256/fullTextXML | Romberg et al., recall vs tracked exposure (full text) | 2020 |
| https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1037/0033-2909.114.1.3&resultType=core&format=json | Johnson et al., source monitoring (record) | 1993 |
| https://www.ruleranalytics.com/?p=23066 | Ruler Analytics HDYHAU post (vendor) | 2022-07-11 |
| https://www.refinelabs.com/news/hybrid-attribution-framework | Refine Labs study announcement (vendor) | 2023-04-07 |
| https://hockeystack.com/lab-blog-posts/state-of-revenue | HockeyStack State of Revenue (vendor) | 2025-12-15 |
| https://hockeystack.com/blog/self-reported-attribution-report-2024/ | HockeyStack 2024 report page (vendor, undated) | undated |
| https://engineering.squarespace.com/blog/2019/checkout-surveys-a-data-science-approach | Squarespace checkout survey design | 2019-11-20 |
| https://www.whatconverts.com/blog/why-how-did-you-hear-about-us-is-a-useless-question/ | WhatConverts HDYHAU post (vendor) | 2025-12-09 |
