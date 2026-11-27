---
title: "Follow-up q1: independent evidence on AI-answer citation churn and prompt-set method (MKT-MEAS-19)"
program: product
topic: marketing-measurement
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Follow-up q1: independent evidence on AI-answer citation churn and prompt-set method

Question (from `product-resume/wave2/marketing-measurement/q1.md`): is there an independent, non-Ahrefs measurement of AI-answer citation churn and of a prompt-set method that would confirm or replace the MKT-MEAS-19 defaults (frozen list of 20 to 50 prompts, at least 4 weeks, days cited out of 7)?

This is a repair pass. Every figure below was re-read from the raw page in this pass, with the command and its output inline (section "Measurements"). Two things in the first draft were wrong and are corrected: the Sielinski page does state an affiliation (IQRush), and the Schulte study was opened in full instead of being relayed through a survey.

## Answer

Partly.

- Churn: yes. Three non-Ahrefs preprints (Sielinski, Chen and Koudas, Schulte et al.) measured it on their own data and agree with the direction of the Ahrefs finding. None of the three is vendor-free: all three authors are linked to GEO-monitoring businesses or run their own monitoring platform (table "Independence"). "Independent" here means independent of Ahrefs, not independent of the tooling market.
- Prompt-set method: partly. Two preprints give numbers that bear on it (Sielinski: queries needed for a 5-point interval; Schulte: runs per prompt). No source tests the exact MKT-MEAS-19 defaults "20 to 50 frozen prompts, 4 weeks, days cited out of 7". Those defaults trace to two vendor-sponsored practitioner pieces (Growth Unhinged, sponsored by Profound; Ahrefs), not to a measurement.

## Measurements

All commands ran on 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/mm-q1/`. Pages were downloaded with curl and stripped to text with a small script (`python3 -I t.py <file>`, removes script/style tags and HTML tags, collapses whitespace). Every quoted line is output of the `grep -o` shown.

### M1. Fetch of the five pages (plus Schulte)

```
for u in arxiv.org/html/2603.08924v2 arxiv.org/html/2610.15033 arxiv.org/html/2607.14035 ahrefs.com/blog/how-stable-are-ai-citations/ www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way; do
  curl -sL -m 60 -A "Mozilla/5.0" -o $f -w "$u %{http_code} %{size_download}\n" https://$u; done
```
Output:
```
arxiv.org/html/2603.08924v2 200 336367
arxiv.org/html/2610.15033 200 263711
arxiv.org/html/2607.14035 200 376214
ahrefs.com/blog/how-stable-are-ai-citations/ 200 1175676
www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way 200 679688
```
Schulte: `curl -sL ... https://arxiv.org/html/2604.07585` gave `200 247716`. Text lengths after stripping: Sielinski 96,832 characters, Chen and Koudas 69,506, Martinez 81,071, Ahrefs 30,984, Growth Unhinged 6,366 (paywalled after the first section, see "What could not be determined"), Schulte 59,945.

### M2. Sielinski (arXiv 2603.08924v2): Jaccard table, affiliation, sample sizes

Source: [arXiv 2603.08924v2](https://arxiv.org/html/2603.08924v2) (v1 2026-03-09, v2 2026-06-09 per the arXiv listing; v3 2026-08-26 not re-fetched here). Preprint, one author.

`grep -o -E 'Platform Topic Queries Pairs Median Jaccard.{1500}' arxiv_org_html_2603_08924v2.txt` printed Table 4 (columns: platform, topic, queries, pairs, median Jaccard, identical rate %, zero-overlap rate %, mean intersection, mean unique domains), matching is at domain level:

```
Gemini bird feeders 189 6,804 0.31 0.07 0.35 4.90 10.54
Gemini multivitamins 192 6,912 0.29 0.01 0.80 4.49 10.55
Gemini running gear 192 6,912 0.29 0.10 1.62 4.73 10.88
SearchGPT bird feeders 180 6,480 0.40 7.25 6.08 2.50 4.38
SearchGPT multivitamins 180 6,480 0.38 8.02 7.19 2.03 3.76
SearchGPT running gear 169 6,084 0.33 5.34 8.93 2.04 4.04
Perplexity bird feeders 198 7,128 0.50 3.93 2.40 3.32 5.24
Perplexity multivitamins 199 7,164 0.50 4.65 1.05 3.34 5.11
Perplexity running gear 198 7,128 0.50 3.25 1.07 3.49 5.31
Platform-level Jaccard medians are 0.29-0.31 for Gemini, 0.33-0.40 for SearchGPT, and 0.50 for Perplexity across all three topics.
```

Affiliation (correcting the first draft): `grep -o -E '.{200}(IQRush|iqrush|affiliat).{150}'` printed the paper header `Ronald Sielinski Affiliation: IQRush Email: ron@iqrush.ai`. The author is affiliated with a vendor.

Sample size for a 5-point interval, from the text under Figure 11 (`grep -o -E 'Figure 11: CI width.{1800}'`): "The Gemini CI width crosses the 0.05 target at approximately n ≈ 30 for bird feeders and n ≈ 40-50 for multivitamins and running gear." "Perplexity ... CI widths cross the target at roughly n ≈ 90-100 across topics." For SearchGPT: "Although the curves begin to smooth after n ≈ 120, this should not be interpreted as evidence that collecting 120 or more queries resolves the instability." The paper does not give SearchGPT a crossing point. So the first draft's "at least 150 for SearchGPT" is not in the text and is withdrawn; the faithful statement is "not reached or not reliable within 200 queries". The paper's section 7 also says: "A follow-up study will provide principled guidance on how many queries are needed", so these counts are read off curves, not derived.

Gemini and the high-frequency run (the contradiction the first draft left open). Two passages, both from the same page:
- `grep` for "exclu" printed the limitations bullet: "Gemini exclusion from high-frequency regime. Google Gemini was excluded from the ten-minute interval experiment due to API rate limits. The high-frequency findings therefore cover only Perplexity Search and OpenAI SearchGPT."
- `grep` for "ten-minute" printed Table 3 ("summary statistics for the high-frequency sampling regime"), which has the row `Gemini running gear 198.8 47.1 42.0 23.9 1 213`, and the sentence "queries were submitted to Gemini, SearchGPT, and Perplexity at ten-minute intervals over approximately four hours, yielding 25 samples per platform."
The paper contradicts itself and I cannot resolve it from the page. It does not affect the nine-day daily data behind Table 4 and the Figure 11 counts, which include Gemini. I read the whole page; the last part is appendix tables (per-sample statistics), with no further text on the point.

### M3. Chen and Koudas (arXiv 2610.15033): decay figures and vendor link

Source: [arXiv 2610.15033 HTML](https://arxiv.org/html/2610.15033) (submitted 2026-10-10 per the abstract page). Preprint.

`grep -o -E '.{200}still shared.{250}' arxiv_org_html_2610_15033.txt` printed:
```
... Within a window, 63–67% is repeatable. Two weeks later, 40% (ChatGPT), 47% (Gemini) and 22% (Perplexity) is still shared, and ten weeks later only 14%, 29% and 0%. The cited set changes steadily, because the engines regenerate their searches for every answer and their search results change over weeks
```
Vendor link, from `grep -o -E '.{200}(affiliat|Competing|monitoring platform).{200}'`: "The answers were collected by an academic monitoring platform for generative search engines, operated by the authors (not named here for anonymity)." and "written for the organizations that use our monitoring platform rather than sampled from user logs." Data: public API, one query per day, web search on, English, US only (same page, section 3.1 and limitations).

### M4. Schulte, Bleeker, Kaufmann (arXiv 2604.07585): primary study behind the "7 to 8 repetitions" figure

Source: [arXiv 2604.07585 HTML](https://arxiv.org/html/2604.07585), header `arXiv:2604.07585v1 [cs.IR] 08 Apr 2026`. Preprint. This is the study the Martinez survey calls "Schulte et al. (2026)"; the survey says it is not peer reviewed (`grep -o -E '.{200}(Schulte).{400}'` on the Martinez page: "Several prominent measurement studies have not been peer-reviewed ( Schulte et al., 2026 ; ...)").

Design (`grep -o -E '.{250}(seven|eight|repetitions).{300}'`): "For each campaign, eight prompts were entered into four engines: ChatGPT, Gemini, Google AI Mode, and Perplexity." Four campaigns, so 32 prompts, German-language Swiss queries from "People Also Ask", servers in Switzerland.
Churn: "Across all four campaigns over the 45–46-day observation window (Jan 24 – Mar 20, 2026), the day-to-day Jaccard similarity for cited sources averages between 0.34 and 0.42".
Runs per prompt (Appendix J, `grep -o -E '.{200}(runs are sufficient|per prompt|starting point).{300}'`): "The full dataset contains 128 engine–prompt groups (4 engines × 8 prompts × 4 campaigns) with all 10 runs available." and "Practitioners should therefore use at least 7 runs per prompt per day for brand visibility monitoring, and at least 8 runs when source-level coverage matters." The criterion is standard error below 0.10 by subsampling the 10-run mean.
Affiliation (`grep -o -i -E '.{100}(Affiliation|University).{100}'`): first author "Affiliated with Aurora Intelligence" and University of St. Gallen. The page does not say what Aurora Intelligence sells; treat as possible vendor link, unconfirmed.

### M5. Martinez survey (arXiv 2607.14035): protocol and the Kirsten claim

Source: [arXiv 2607.14035 HTML](https://arxiv.org/html/2607.14035) (submitted 2026-07-15). Survey of 45 studies, secondary. `grep -o -E '.{100}(three to five paraphrases|at least four dimensions|sufficiently narrow).{300}'` printed: "three to five paraphrases per information need; • closely spaced repetitions and multiple time windows" and "A GEO measurement must therefore vary along at least four dimensions: run, paraphrase, date, and engine." and "repeat the measurement until the interval around the estimand is sufficiently narrow for the decision at hand." It also says of the 7 to 8 figure: "This number is not a universal standard: it derives from a small universe of Swiss queries and at most ten repetitions."
Kirsten et al. (2026): the survey states "Page overlap across two months is 18% for AI Overviews, compared with 45% for organic Google; on the surfaces for which temperature could be controlled, repeated runs at temperature zero change 9–28% of decisions." I searched for the primary (WebSearch, "Kirsten 2026 AI Overviews page overlap two months 4,706 queries ...") and an arXiv search page fetch; neither located it. This figure is therefore reported only as the survey's claim, not as verified.

### M6. Ahrefs and Growth Unhinged: the origin of the MKT-MEAS-19 defaults

Ahrefs, [How stable are AI citations](https://ahrefs.com/blog/how-stable-are-ai-citations/) (vendor blog, dated October 29, 2026 on the page). `grep -o -E '.{200}(50|83)%.{250}'` printed:
"Don't judge AI visibility from one check. 50–83% of citations are gone the next day, but about 75% of those come back within 20 days. Count how many of the last seven days you were cited."
Its table "Gone by day two": Google AI Overviews 50%, AI Mode 58%, ChatGPT 59%, Gemini 81%, Copilot 83%. Method: "My colleague Xibeijia Guan asked five AI tools the same questions every day for 20 days", questions tracked 1,996 (AI Mode), 3,173 (ChatGPT), 563 (AI Overviews), 1,276 (Gemini), 823 (Copilot). Ahrefs itself notes Gemini and Copilot "looked less consistent, partly because their next answer often cited nobody" and that excluding empty answers gives about 50 to 60% for all five. So "days cited out of 7" is Ahrefs's own advice from its own tool, with no validation of the 7-day window.

Growth Unhinged, Kevin Indig, [How to measure the impact of AI search the right way](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way) (newsletter, Jul 15, 2026; page header says "Growth Unhinged is proudly supported by Profound", an AI-visibility vendor). `grep -o -E 'Freeze 20 to 50.{250}'` printed: "Freeze 20 to 50 high-intent prompts across personas, use cases, and buying stages for at least four weeks, so you measure real change instead of prompt drift. Log every run: prompt, model, location, answer, cited URLs, brands mentioned, and shortlist position." The same page cites "40-60% of cited domains change month to month ( via Profound )" and "Only 2.2% are cited consistently after three runs ( via Growth Memo )", both secondhand and not checked here. So the 20 to 50 prompts and 4 weeks defaults are a practitioner recommendation with no measurement behind them on that page. The rest of the page is behind a subscribe wall.

### M7. Regex test for MKT-MEAS-21

Script `check21.py` (in the same directory) applies the proposed rule: a line matching the trigger regex must also contain an engine name, a `20xx-xx` date and the word `vendor` or `preprint`. Test file `sample.txt`:
```
50% of citations are gone the next day.
Across engines, 70% of cited pages change weekly.
50% of citations on ChatGPT were gone the next day (Ahrefs, vendor, 2026-10-29).
Two weeks later 47% of Gemini citations are still shared (Chen and Koudas, preprint, 2026-10).
Citations are volatile.
```
Command and output (`python3 -I check21.py sample.txt`):
```
FAIL sample.txt:1: 50% of citations are gone the next day.
FAIL sample.txt:2: Across engines, 70% of cited pages change weekly.
PASS sample.txt:3: 50% of citations on ChatGPT were gone the next day (Ahrefs, vendor, 2026-10-29).
PASS sample.txt:4: Two weeks later 47% of Gemini citations are still shared (Chen and Koudas, preprint, 2026-10).
```
The first run of the regex missed line 4 (verb "still shared" was not in the list); the verb list was extended with `still (shared|cited)|lost|shared|overlap\w*` and the run above is the second. Line 5 correctly does not trigger. On real text, the same script over the sentence-split Ahrefs page printed 9 FAIL lines and no PASS (for example `FAIL ahrefs_sent.txt:22: 50–83% of citations are gone the next day, but about 75% of those come back within 20 days.`), as expected for a source page that has no `vendor`/date labelling in the line; on the Chen and Koudas page it printed one FAIL (a table row about "Cited at rank 1 / 2 ...", a false positive of the trigger). Limits of the check: line-based (a claim and its labels split over two lines fail), English only, and the trigger needs "%" before the word "citation(s)/cited" in one sentence, so a claim phrased "citations fell by half" is not caught.

## Independence

| Source | Peer reviewed | Vendor link | Opened in this pass |
|---|---|---|---|
| Sielinski 2603.08924 | no (preprint) | affiliation stated on the page: IQRush (`ron@iqrush.ai`) | full text v2 |
| Chen and Koudas 2610.15033 | no (preprint) | authors operate the monitoring platform that collected the data | full HTML |
| Schulte et al. 2604.07585 | no (preprint, per the Martinez survey) | first author affiliated with Aurora Intelligence (business not stated on the page); University of St. Gallen | full HTML |
| Martinez 2607.14035 | no (survey preprint) | not checked | relevant sections |
| Kirsten et al. | claimed ACL Findings 2026 by the survey | not checked | not found (gap) |
| Ahrefs blog | no (vendor) | is a vendor | full page |
| Growth Unhinged | no (newsletter) | sponsor Profound is a vendor | free part only |

Jiang et al. (arXiv 2610.15382), used in the first draft, was not re-opened in this pass and is dropped from the evidence.

## What the evidence says about MKT-MEAS-19

1. Churn is real on engines and data other than Ahrefs's: Sielinski median Jaccard 0.29 to 0.50 between samples (M2), Chen and Koudas 22 to 47% still shared after two weeks (M3), Schulte 0.34 to 0.42 day-to-day over 45 days (M4). Three non-Ahrefs preprints, all vendor-linked, agree on direction. This confirms the MUST core (per engine, no conclusion from one run).
2. The rate is not pinned. The four sources measure different quantities (next-day loss, pairwise overlap, persistence after N weeks, day-to-day Jaccard) on different engines and topics. A rule must not quote one number as "the" churn.
3. Engines differ: Perplexity Jaccard 0.50 against Gemini 0.29 to 0.31 (M2); Perplexity 0% still shared at ten weeks against Gemini 29% (M3); Ahrefs next-day loss 50% (AI Overviews) to 83% (Copilot) (M6). Per-engine reporting is supported.
4. Prompt count: Sielinski needs about 30 to 50 queries (Gemini) and 90 to 100 (Perplexity) for a 5-point interval on citation share, and does not reach it reliably for SearchGPT within 200. The 20 to 50 default is therefore too low for Perplexity and SearchGPT if a share is reported at 5-point precision, and about right for Gemini. Schulte's design (32 prompts, 4 engines) sits inside 20 to 50 but is not a test of it.
5. Runs per prompt: Schulte, 7 runs per prompt per day for brand detection and 8 for source coverage, to SE below 0.10, from one Swiss German-language set. A single-set result; the survey itself warns it is not a standard.
6. A frozen list alone understates variance. Martinez recommends 3 to 5 paraphrases per information need and variation in run, date and engine. A frozen set remains right for comparing periods, so the two are compatible.
7. "At least 4 weeks" and "days cited out of 7": no independent measurement supports either number. Chen and Koudas show decay still going at 2 and 10 weeks, which says 4 weeks is inside the decay range, nothing more. Both defaults trace to the Growth Unhinged and Ahrefs pieces (M6).

## Effect on the ruleset

### MKT-MEAS-19: change (MUST core confirmed, SHOULD defaults relabelled and extended)

Exact new text:

**MKT-MEAS-19 (MUST core, SHOULD defaults).** MUST: report AI-answer citations per engine, and record engine, model or product version, location and run dates. Keep mentions and links in separate columns. Draw no conclusion from a single run. Report every share or rate with an interval and the number of prompts and runs behind it, and call a difference between two periods or two domains real only when the intervals do not overlap. SHOULD, as defaults, each labelled "practitioner default, no independent test": freeze 20 to 50 prompts between compared periods, run at least 4 weeks before comparing periods, and repeat each prompt at least 7 times per period (8 when the claim is about cited sources). When a citation share is reported with a 5-point interval, SHOULD use at least 50 prompts per engine for Gemini-like and about 100 for Perplexity-like engines (one preprint, three consumer topics) and say so when SearchGPT-like engines are measured with fewer than 200. SHOULD add 3 to 5 paraphrases per information need. "Days cited out of 7" is a convenience figure from one vendor, never a visibility rate.

- Why, MUST part: three non-Ahrefs preprints (Sielinski 2026, Chen and Koudas 2026, Schulte et al. 2026) and one vendor study (Ahrefs, 2026-10-29) all find citations vary between runs and over days to weeks, and they disagree on the rate.
- Why, SHOULD part: the 20 to 50 prompts and 4 weeks come from a vendor-sponsored newsletter (Growth Unhinged, 2026-07-15); the 7 to 8 runs from one Swiss preprint (Schulte, 2026-04-08); the prompt counts from one preprint's convergence curves (Sielinski). All three are untested across topics.
- Verify, MUST part: the report has the columns `engine`, `engine_version`, `location`, `run_date`, `mentions`, `links`, `n_prompts`, `n_runs`, `ci_low`, `ci_high`. A claim that a number "rose" or "fell" with overlapping intervals fails. A "visibility changed" claim built on one run per engine fails.
- Verify, SHOULD part: `prompt_set_hash` is identical across compared periods; `n_prompts`, `n_runs` and the period length meet the defaults or the report states in one sentence which default it misses; the report states the paraphrase count.
- Rests on: [Sielinski, arXiv 2603.08924](https://arxiv.org/abs/2603.08924) (preprint, IQRush-affiliated, v2 2026-06-09); [Chen and Koudas, arXiv 2610.15033](https://arxiv.org/abs/2610.15033) (preprint, 2026-10-10); [Schulte et al., arXiv 2604.07585](https://arxiv.org/abs/2604.07585) (preprint, 2026-04-08); [Martinez survey, arXiv 2607.14035](https://arxiv.org/abs/2607.14035) (2026-07-15); [Ahrefs](https://ahrefs.com/blog/how-stable-are-ai-citations/) (vendor, 2026-10-29); [Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way) (newsletter, Profound-sponsored, 2026-07-15).

### MKT-MEAS-13: confirm

The field rule covers a citation figure already; the interval and count requirements are in MKT-MEAS-19.

### NEW rule, MKT-MEAS-21 (SHOULD): never state one churn rate as a fact

**MKT-MEAS-21 (SHOULD).** When a page, report or skill states how fast AI-answer citations change, name the engine, the quantity (next-day loss, share still cited after N weeks, or pairwise overlap between samples), the source and its date, and label vendor and preprint sources as `vendor` or `preprint`. Never pool engines into one rate.
- Why: the sources measure different quantities and engines differ widely (M2, M3, M6), so one number is wrong for most readers.
- Verify: run `python3 -I check21.py <pages>` (script body = the trigger regex `\b[0-9]{1,3}\s?%[^.\n]*\b(citations?|cited)\b[^.\n]*\b(gone|drop(ped)?|churn|change[sd]?|disappear\w*|stable|retain\w*|still (shared|cited)|lost|shared|overlap\w*)\b` on each line, case-insensitive; a hit passes only if the same line also matches an engine name (ChatGPT, Gemini, Perplexity, AI Overviews, SearchGPT, Copilot, AI Mode), `20[0-9]{2}-[0-9]{2}` and `vendor|preprint`). Tested in M7: it fails the unlabelled sample lines and passes the two labelled ones. Known limit: line-based and phrasing-based, so a reviewer still reads claims phrased without a percentage.

### Decay row for MKT-MEAS-19

Keep the 6-month interval (next 2027-05-27). Triggers: any of Sielinski, Chen and Koudas, Schulte et al. appears peer reviewed; a Kirsten et al. primary is found; Sielinski's promised sample-size follow-up appears. Chen and Koudas state "The engines change continuously, so the findings describe 2026".

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Sielinski v1 2026-03-09, v2 2026-06-09; nine daily samples 2026-02-03 to 2026-02-11 | [arXiv 2603.08924](https://arxiv.org/abs/2603.08924) | fetched 2026-11-27 |
| Median Jaccard 0.29-0.31 Gemini, 0.33-0.40 SearchGPT, 0.50 Perplexity | [arXiv 2603.08924v2](https://arxiv.org/html/2603.08924v2) Table 4 | fetched 2026-11-27 |
| 5-point interval at n about 30 to 50 (Gemini), 90 to 100 (Perplexity) | same, Figure 11 text | fetched 2026-11-27 |
| 40/47/22% still shared after two weeks, 14/29/0% after ten (ChatGPT/Gemini/Perplexity) | [arXiv 2610.15033](https://arxiv.org/html/2610.15033), submitted 2026-10-10 | fetched 2026-11-27 |
| Day-to-day Jaccard 0.34 to 0.42 over 45 days; 7 runs (brand) and 8 runs (sources) per prompt | [arXiv 2604.07585](https://arxiv.org/html/2604.07585), 2026-04-08 | fetched 2026-11-27 |
| 50 to 83% of citations gone the next day, 20-day study (vendor data) | [Ahrefs](https://ahrefs.com/blog/how-stable-are-ai-citations/), 2026-10-29 | fetched 2026-11-27 |
| "Freeze 20 to 50 high-intent prompts ... for at least four weeks" | [Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way), 2026-07-15 | fetched 2026-11-27 |
| Kirsten et al.: 18% (AI Overviews) vs 45% (organic) page overlap over two months, as stated by the survey; primary not located | [arXiv 2607.14035](https://arxiv.org/html/2607.14035), 2026-07-15 | fetched 2026-11-27 |

## What could not be determined

- Kirsten et al. (2026) primary: not found by one WebSearch and one arXiv search-page fetch. Missing: its title or ACL Anthology entry. Its figures stay "per the Martinez survey".
- Growth Unhinged beyond the free part: the page is cut at "Subscribe to keep reading". The "40-60% of cited domains change month to month (via Profound)" and "2.2% ... after three runs (via Growth Memo)" figures are not verified; they are not used in any rule.
- Whether Gemini was in Sielinski's ten-minute run: the page contradicts itself (limitations bullet versus Table 3 and section 4.3). Unresolvable from the page; it does not touch the nine-day figures used above. Only the author (v3 may differ) could settle it; v3 was not re-fetched.
- What Aurora Intelligence (Schulte) and IQRush (Sielinski) sell: the pages state affiliations only.
- Data-collection locations in Sielinski and Chen and Koudas: not stated, so the `location` column cannot be tied to a tested value (Schulte used Swiss servers).
- A direct test of "20 to 50 frozen prompts for 4 weeks" and of "days cited out of 7": no source ran one. Only a first-hand run against live engines would settle it, which needs paid API keys and is out of scope.
- Yotpo "weekly turnover 70 to 81%" and other vendor pieces (SparkToro, Position.digital, BrightEdge, SearchAtlas) were not opened and are not used.
