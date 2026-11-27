---
title: "Follow-up q1: pre-LLM baseline for landing pages, release notes and email, and the markers left in late-2026 model output"
program: product
topic: marketing-voice-ai-authorship
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 54
---

# Follow-up q1: pre-LLM baseline beyond READMEs, and which markers remain

Question (from `marketing-voice-ai-authorship.md`, Open questions): does a pre-LLM baseline for landing pages, release notes and email, not only READMEs, support the em dash and register thresholds (MKT-VOICE-03, -04, -09), and which markers still separate late-2026 model output now that some models drop the em dash on instruction?

`sources_fetched` counts 8 web documents read in full or in part (6 in the first pass, plus the arXiv abstract page and the arXiv HTML for Persuaficial in the repair pass; Graphite was fetched a second time and counted once), 34 Wayback Machine snapshots (18 from 2022, 16 from 2026) and 12 shallow repository clones. The Inc. article ([Inc., Chris Morris](https://www.inc.com/chris-morris/wondering-if-ai-wrote-that-document-these-are-the-surprising-new-clues/91413963), undated in the search result) returned HTTP 403 twice and was not read; a search summary of it is the only trace and nothing here rests on it. The numbers it would have carried come from the primary Graphite page. The repair pass (2026-11-27) added the scripts, the fleet runs and the per-rule verification below; its scratch directory is `~/.cache/research-lang/exemplars/product/wave2/mva-q1-repair/`.

## Summary

1. Landing pages: 2 of 18 pre-LLM home pages (Figma 4.34 and Notion 5.29 em dashes per 1,000 words, 3 dashes each) meet MKT-VOICE-04's warning rule. The README baseline said 0 of 26. So the rule's own premise, "a human writer does not reach 3.0", fails on landing pages, and the rule's false-positive rate there is about 11 percent.
2. The same rule fires on 2 of 16 live 2026 home pages (Cloudflare 6.99 with 8 dashes, Stripe 6.76 with 13). The rule does not separate the two eras on landing pages. It also does not need to, because it is a report and not a gate, but its rationale must stop claiming a human ceiling.
3. A count floor of 6 em dashes separates better in this sample: the pre-LLM maximum is 5 (GitHub), and the two 2026 pages that meet 3.0 have 8 and 13. This is 2 and 2 pages, so it is a hypothesis, not a calibrated limit.
4. Release notes: in 5 repositories' dated changelogs, pre-2022-12 entries hold 0 em dashes in 62,481 words and 2025+ entries hold 1 in 61,323. A changelog written as commit titles is silent on this marker in both eras. The baseline neither supports nor contradicts the rule for it.
5. Register: pre-LLM changelogs carry 2.66 contractions plus "you" per 1,000 words (166 hits in 62,481 words), against 24.69 on pre-LLM landing pages and 28.61 on pre-2022 READMEs. MKT-VOICE-09's 10-per-1,000 floor would flag essentially every human-written changelog. It must not apply to release notes.
6. Landing-page register is bimodal: 2 of 18 pre-LLM pages fall below 10 (Mailchimp 2.46, Stripe 7.97), and so do 3 of 16 live 2026 pages (Datadog 8.93, Linear 9.05, Notion 9.37). A floor of 10 flags about 11 to 19 percent of human-run pages. The floor stays a CONSIDER-level report.
7. Email: no pre-LLM marketing-email corpus could be fetched without an account, a credential or a download of an unlabeled private dump. This is a documented gap. Nothing in this file supports or refutes any threshold for email.
8. The em dash is falling out as a tell. Graphite (2026-10-01) measures Opus 5.5 at 0.015 em dashes per 1,000 words against 2.92 for Opus 5, and says OpenAI's Astra uses them about one-eighth as often as the human baseline. Wikipedia's AI-writing guide files "Overuse of em dashes" under historical indicators with the dates "2022 to September 2026".
9. What remains, per the one study that measures it against a pre-LLM human baseline, is phrase and frame level: corrective framing ("is more than a X, it"), importance flags ("this matters", "why X matters") and evaluative adjectives ("dependable"). Graphite counts 2,548 tells for Opus 5.5 against 2,666 for Opus 5, "just 4% fewer" (Graphite page, 2026-10-01). The remark that new tells replace removed ones is the secondary report's (AI Insider, 2026-10-05), not the study's own words.
10. Those phrase tells are rare on landing pages. Two measurements, kept apart. The 6 patterns of `corrective.re` (the file MKT-VOICE-19 would ship) hit 0 lines in 16,243 pre-LLM landing words and 2 lines in 21,009 words of 2026 pages (section 7, commands shown). A separate 8-pattern exploratory script (`ph.py`, section 6) gave the same 0 and 2. Both 2026 hits are customer testimonials quoted on the page (PlanetScale, Supabase), so the check has a false-positive class: a quoted human sentence. The phrases churn by model version, and the source is a marketing firm's own study of articles, not landing copy.
11. Verdict on a gate: nothing here changes MKT-VOICE-01. A marker count never gates. Phrase tells may become an agent's house style rule (new MKT-VOICE-19, CONSIDER), checked on lines the agent adds, with no claim about who wrote any existing text.

## Findings

### 1. Method and its limits

Landing pages: for 21 developer-tool and SaaS sites, the Wayback Machine's closest snapshot to 2022-09-01 and to 2026-11-01 of the home page was fetched as raw HTML (`id_` URLs), gunzipped where needed, and reduced to visible text with a stdlib parser that drops `script`, `style`, `noscript`, `svg`, `template` and `head`. Curly apostrophes were mapped to straight ones before counting, because the baseline in `marketing-voice-ai-authorship.md` counted straight apostrophes only and modern pages use curly ones. Metrics are the ones of MKT-VOICE-04 and -09 (em dash U+2014 per 1,000 words; contractions in `n't 're 've 'll 'd` plus `you`, `your`, `yours` per 1,000 words).

Excluded after fetching, because the snapshot date did not match: GitLab (2023 and 2025 snapshots), Sentry (2016 snapshot, none in 2026), HashiCorp 2026 (2025-02 snapshot), Railway 2026 (2024-12 snapshot), Prisma 2026 (fetch failed). Postman 2022 was a JavaScript shell with 0 visible words and was dropped. That leaves 18 pre-LLM pages and 16 pages from November 2026.

Limits that bind every number below: home pages only, which are the surface most likely to be human-edited by a marketing team; the 2026 pages are of unknown authorship (they are live commercial sites, not model output); Wayback snapshots can lack JavaScript-rendered text; 34 pages is a small sample. The pre-LLM column is the point of the exercise. The 2026 column is context, not a model-output baseline.

Release notes: 12 repositories were cloned with `--depth 1` into the scratch directory. Dated version headings in the changelog files were sectioned by date. Pre-LLM is 2019-01-01 to 2022-11-29, late is 2025-01-01 onward. Code spans, fences, links, PR numbers, commit hashes and handles were stripped before counting. Five changelogs gave usable sections in both windows. Ruff, Prettier and Black carry no per-entry dates in the file, Docusaurus has no pre-2022 sections in the file, and Vite's pre-2022 entries live elsewhere, so none of those carry a baseline. The `cli/cli` and `svelte` clones held no changelog file.

### 2. Landing pages, pre-LLM (snapshot closest to 2022-09-01)

Commands (script `bin/lpm.py` in `~/.cache/research-lang/exemplars/product/wave2/mva-q1/`, not committed to any repository):

```sh
cd ~/.cache/research-lang/exemplars/product/wave2/mva-q1/lp
python3 -I ../bin/lpm.py *.20220901.html     # postman, gitlab, sentry removed beforehand
```

Output (the postman line read 0 words and is excluded from the pooled figures below by hand; its 0 words add nothing):

```
file words em em/1k contr you (contr+you)/1k
cloudflare.com 976 2 2.05 1 24 25.61
datadoghq.com 868 0 0.00 0 10 11.52
docker.com 766 0 0.00 0 23 30.03
figma.com 692 3 4.34 1 12 18.79
fly.io 388 0 0.00 1 17 46.39
github.com 2193 5 2.28 3 61 29.18
hashicorp.com 739 0 0.00 2 10 16.24
linear.app 1156 2 1.73 14 26 34.60
mailchimp.com 406 0 0.00 0 1 2.46
netlify.com 1074 2 1.86 1 21 20.48
notion.so 567 3 5.29 3 19 38.80
planetscale.com 322 0 0.00 1 15 49.69
prisma.io 520 0 0.00 2 21 44.23
railway.app 801 0 0.00 2 21 28.71
slack.com 656 1 1.52 2 14 24.39
stripe.com 1381 4 2.90 1 10 7.97
supabase.com 2126 0 0.00 15 32 22.11
vercel.com 612 0 0.00 1 14 24.51
POOLED words=16243 em=22 em/1k=1.35 contr=50 you=351 (c+y)/1k=24.69
```

Reading against MKT-VOICE-04 (300 or more prose words, 3 or more dashes, 3.0 or more per 1,000): Figma (692 words, 3 dashes, 4.34) and Notion (567 words, 3 dashes, 5.29) both meet it. Stripe (2.90) misses by 0.10. That is 2 of 18 pages, 11 percent, on text written before any public LLM. Eight of 18 pages hold at least one em dash. The pooled rate of 1.35 is about seven times the README baseline of 0.19, so "human prose has almost no em dashes" is a README fact, not a general one.

Reading against MKT-VOICE-09 (floor 10 per 1,000): Mailchimp (2.46) and Stripe (7.97) are below it. That is 2 of 18, 11 percent. The pooled 24.69 is close to the README figure of 28.61.

### 3. Landing pages, November 2026 (context only)

```sh
python3 -I ../bin/lpm.py *.20261101.html     # hashicorp, railway, prisma 2026 not fetched or dated off
```

```
cloudflare.com 1144 8 6.99 2 19 18.36
datadoghq.com 1904 2 1.05 1 16 8.93
docker.com 1013 0 0.00 2 16 17.77
figma.com 619 2 3.23 0 15 24.23
fly.io 849 0 0.00 4 26 35.34
github.com 1144 2 1.75 5 17 19.23
linear.app 1657 0 0.00 5 10 9.05
mailchimp.com 1824 1 0.55 1 31 17.54
netlify.com 1567 0 0.00 1 21 14.04
notion.so 427 2 4.68 0 4 9.37
planetscale.com 1932 4 2.07 1 19 10.35
postman.com 1239 0 0.00 0 22 17.76
slack.com 1874 0 0.00 4 42 24.55
stripe.com 1924 13 6.76 2 38 20.79
supabase.com 1350 2 1.48 6 13 14.07
vercel.com 542 0 0.00 1 7 14.76
POOLED words=21009 em=36 em/1k=1.71 contr=35 you=316 (c+y)/1k=16.71
```

The pooled em dash rate went from 1.35 to 1.71 and the pooled register rate from 24.69 to 16.71. Both movements are small against the page-to-page spread (0.00 to 6.99, and 8.93 to 35.34). Under MKT-VOICE-04's full rule (3 dashes and 3.0), Cloudflare and Stripe fire, and Figma and Notion do not (2 dashes each). So 2 of 16 fire, the same share as in 2022. With a floor of 6 dashes added, 0 of 18 pre-LLM pages fire (maximum 5, GitHub) and the same 2 of 16 of 2026 pages fire. We do not know who wrote those 2026 pages, so this is a count of rule behaviour, not of authorship.

### 4. Release notes and changelogs

```sh
cd ~/.cache/research-lang/exemplars/product/wave2/mva-q1/rn
python3 -I ../bin/rnm.py pytest-dev_pytest/doc/en/changelog.rst denoland_deno/Releases.md \
  BurntSushi_ripgrep/CHANGELOG.md eslint_eslint/CHANGELOG.md tokio-rs_tokio/tokio/CHANGELOG.md
```

```
pytest-dev_pytest pre sections=64  words=4386  em=0 contr=7   you=6
pytest-dev_pytest 2025+ sections=11 words=10701 em=0 contr=6   you=21
denoland_deno pre sections=182 words=27686 em=0 contr=111 you=1
denoland_deno 2025+ sections=81 words=32825 em=1 contr=148 you=0
BurntSushi_ripgrep pre sections=8  words=2391  em=0 contr=7   you=2
BurntSushi_ripgrep 2025+ sections=4 words=1212  em=0 contr=9   you=3
eslint_eslint pre sections=106 words=20899 em=0 contr=23  you=1
eslint_eslint 2025+ sections=59 words=11963 em=0 contr=7   you=0
tokio-rs_tokio pre sections=91 words=7119  em=0 contr=8   you=0
tokio-rs_tokio 2025+ sections=39 words=4622  em=0 contr=4   you=1
```

Pooled by script, not by hand (repair pass, same inputs):

```sh
python3 -I ../bin/rnm.py <the five files> | awk '{p=$2; split($4,a,"=");w[p]+=a[2]; split($5,b,"=");em[p]+=b[2]; split($7,c,"=");cn[p]+=c[2]; split($8,d,"=");y[p]+=d[2]} END{for(k in w) printf "%s words=%d em=%d hits=%d per1k=%.2f\n",k,w[k],em[k],cn[k]+y[k],(cn[k]+y[k])/w[k]*1000}'
```

```
pre words=62481 em=0 hits=166 per1k=2.66
2025+ words=61323 em=1 hits=199 per1k=3.25
```

That is pre-LLM 62,481 words, 0 em dashes, 166 contractions and "you" (2.66 per 1,000), and 2025 and later 61,323 words, 1 em dash (0.016 per 1,000), 199 hits (3.25 per 1,000; the first pass printed 3.24 by truncating). These are maintainer-curated bullet lists made largely of commit titles. Two consequences. First, the em dash marker is silent in both eras, so a changelog diff has nothing to measure and MKT-VOICE-03 passes trivially. Second, the register marker is nowhere near the 10 floor in human changelogs of 2019 to 2022, and has not moved since.

Not measured: prose-style release announcements (blog posts, GitHub release bodies written as paragraphs). Reading GitHub release bodies needs the API with a token, which this task may not use, and no pre-2022 blog archive was sampled. The result above is for the changelog form only.

### 4b. Fleet and baseline runs of the proposed MKT-VOICE-04 and -09 commands (repair pass)

The first pass proposed the new thresholds without running them. These runs use the stored baseline corpora of `voice-ai-tells-baseline.md` (`~/.cache/research-lang/exemplars/product/voice-baseline/{pre,fleet}`, 36 pre-2022 READMEs and 18 fleet READMEs, prose extracted by `skills/docs-quality-reference/checks/strip_prose.py`). Scripts `v04.sh` and `v09.sh` are in the appendix.

MKT-VOICE-04 with the 6-dash floor, per document of 300 or more prose words (`WARN` = 300 words, 6 or more dashes, 3.0 or more per 1,000; `old-rule` = fires under the old 3-dash rule only):

```sh
export DQ=<repo>/skills/docs-quality-reference/checks; cd ~/.cache/research-lang/exemplars/product/voice-baseline
for f in fleet/*.txt; do printf '%s ' "$f"; bash ../wave2/mva-q1-repair/v04.sh "$f"; done | awk '$3>=300'
```

```
fleet/grimoire-rs_grimoire.txt 7 307 22.8 WARN
fleet/ocx-sh_index.txt 7 312 22.44 WARN
fleet/grimoire-rs_indexer.txt 21 1060 19.81 WARN
fleet/ocx-sh_rules_ocx.txt 31 1688 18.36 WARN
fleet/grimoire-rs_vscode.txt 33 1932 17.08 WARN
fleet/ocx-sh_catalog.txt 4 384 10.42 old-rule
fleet/ocx-sh_ocx-mirror.txt 8 854 9.37 WARN
fleet/ocx-sh_www-setup.txt 3 463 6.48 old-rule
fleet/ocx-sh_grimoire-lore.txt 0 668 0.0 ok
fleet/ocx-sh_conventions.txt 0 305 0.0 ok
```

Fleet: 6 of 10 documents of 300 or more words fire with the floor, against 8 of 10 under the old rule; the floor drops `ocx-sh/catalog` (4 dashes) and `ocx-sh/www-setup` (3 dashes). On the 36 pre-2022 READMEs, the same loop prints no `WARN` and no `old-rule` line for any document (the highest are `eza-community/eza` 3 dashes at 2.26, and `casey/just` 6 dashes at 0.87, a rate far under 3.0): 0 of 26 documents of 300 or more words fire. On landing pages (section 2 counts): the full rule with the floor fires on 0 of 18 pre-LLM pages (maximum 5 dashes, GitHub) and 2 of 16 pages of 2026 (Cloudflare 8, Stripe 13).

MKT-VOICE-09 with the floor of 5 and the surface exemption (`v09.sh SURFACE PATH`; `WARN` = 300 words or more and rate below 5):

```
pre-2022 READMEs, pooled (same block, no floor): 1387 48480 28.61        (reproduces the parent file)
pre-2022 READMEs, surface readme, 26 documents of 300+ words: 0 WARN at 5 (0 of 26 below 10 either)
landing pages 2022-09: 1 of 18 below 5 (mailchimp.com 2.46); 2 of 18 below 10 (+ stripe.com 7.97)
landing pages 2026-11: 0 of 16 below 5; 3 of 16 below 10 (datadoghq.com 8.93, linear.app 9.05, notion.so 9.37)
fleet READMEs, surface readme (documents of 300+ words, WARN at 5):
  grimoire-rs_grimoire 8 307 26.06 ok       grimoire-rs_indexer 6 1060 5.66 ok
  grimoire-rs_vscode 31 1932 16.05 ok       ocx-sh_catalog 2 384 5.21 ok
  ocx-sh_conventions 0 305 0.0 WARN         ocx-sh_grimoire-lore 11 668 16.47 ok
  ocx-sh_index 0 312 0.0 WARN               ocx-sh_ocx-mirror 0 854 0.0 WARN
  ocx-sh_rules_ocx 10 1688 5.92 ok          ocx-sh_www-setup 2 463 4.32 WARN
```

The landing-page lines come from `v09html.py` (appendix). The floor of 5 flags 1 of 18 human pre-LLM home pages (6 percent, against 11 percent at 10) and 0 of 26 human READMEs, while 4 of 10 fleet READMEs of 300 or more words still fall below it (3 of them at 0.0). The floor of 5 is a hypothesis fitted to this baseline, same as the 10 was.

The changelog exemption, run on whole changelog files of the 5 repositories (surface passed as `readme`, then as `release-note`):

```
pytest changelog.rst       as readme: 211 63385 3.33 WARN   | as release-note: skip surface=release-note
deno Releases.md           as readme: 375 87476 4.29 WARN   | as release-note: skip surface=release-note
ripgrep CHANGELOG.md       as readme: 58 9973 5.82 ok       | as release-note: skip surface=release-note
eslint CHANGELOG.md        as readme: 137 102960 1.33 WARN  | as release-note: skip surface=release-note
tokio CHANGELOG.md         as readme: 19 14240 1.33 WARN    | as release-note: skip surface=release-note
```

4 of 5 human changelogs fall below even the floor of 5 when treated as a README, so the exemption is needed, and it works: the check prints `skip` for `release-note` and `notice` before reading the file. (These whole-file rates differ from the dated-window rates in section 4, which cover only 2019 to 2022 and 2025 onward sections.)

### 5. Email

No public pre-2022 corpus of marketing or product email, labelled by sender and date, could be read here. The candidates found were either security datasets of phishing and spam (arXiv 2511.21448, which labels human and LLM provenance but whose genre is not product marketing) or newsletter archives that need a login. Using a spam or phishing corpus as a baseline for product email would put a different genre under the same number. The question stays open for email, and MKT-VOICE-03, -04 and -09 keep their README-and-landing-page basis only.

### 6. Which markers separate late-2026 output

The em dash. Graphite's update (Druck, Paredes and Smith, 2026-10-01, [Graphite](https://graphite.io/five-percent/research/ai-tells-opus-5-5-update), fetched 2026-11-27) reports, per 1,000 words, 0.015 for Opus 5.5 and 2.92 for Opus 5 (a 99 percent drop), and says of OpenAI's Astra, quoted from the page, "Astra uses them about one-eighth as often, while Opus 5.5 has nearly stopped using them", and also that Astra uses them "95% less often than GPT-5" (vendor-adjacent: Graphite is a content-marketing firm). VentureBeat (2026-09-30, [article](https://venturebeat.com/ai/claude-opus-5-5-uses-em-dashes-99-less-often-and-sounds-more-human-but-still-exhibits-2-548-ai-writing-tells), fetched 2026-11-27) adds that the human baseline is 10,000 web articles published before ChatGPT's launch, and that the human articles are older than the generated ones, so web-writing drift since 2022 may account for some differences. This is consistent with Freeburg's Table 2 ([arXiv 2603.27006](https://arxiv.org/html/2603.27006), 2026-03-27; prompted prohibition takes some models to 0.00), but it goes further: it measures a fixed prompt that does not mention the dash. Wikipedia's guide lists "Overuse of em dashes (2022 to September 2026)" under Historical indicators ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), fetched 2026-11-27, page text for that section was truncated in the fetch, so only the heading and dates are quoted).

What Graphite finds instead. A tell is a word, phrase or frame (a pattern with gaps of up to three words) that appears at least twice as often as in human text, with minimum counts of 500 (words), 250 (two-word phrases), 100 (three-word phrases) and 120 (frames). Tell counts are 3,746 (Opus 4), 3,059 (Opus 4.6), 2,666 (Opus 5) and 2,548 (Opus 5.5). Multipliers over the human rate, as printed in the page's tables (Graphite, 2026-10-01, re-fetched 2026-11-27 and extracted with `gmult.py`, section 7): "this matters" 116x, "why _ matters" 92x, "is more than a _ it" 98x, "looking ahead the" 40x, "rather than simply" 32x, "adds another layer" 27x, "what comes next" 24x, "dependable" 23x, "not only about" 13x, "just as important" 13x, "matters most" 12x, "steady" 11x. The overall count falls only slightly: 2,548 tells in Opus 5.5, "just 4% fewer than the 2,666 we find in Opus 5" (Graphite). A secondary report ([AI Insider](https://theaiinsider.tech/2026/10/05/graphite-study-finds-ai-models-still-leave-thousands-of-writing-tells/), 2026-10-05, fetched 2026-11-27) attributes to the company's chief AI officer the remark that new tells appear as old ones are removed; that is not on the Graphite page. The study's own limit, quoted from the update: "A model can therefore reduce well-known tells without bringing its overall word use closer to human writing". The study does not address landing pages, release notes or email, and uses a fixed generation prompt that does not ask the model to imitate a human or to suppress tells.

Independent grammar-level evidence, older models only. Rallapalli et al. (CMU, arXiv 2604.14111v1, 2026-04-15, [paper](https://arxiv.org/html/2604.14111v1), fetched 2026-11-27) analyse 67 Biber features across 8 genres on the RAID dataset (GPT-2 through GPT-4 and ChatGPT, Mistral, MPT, LLaMA 2, Cohere). LLMs overuse that-subject clauses, contractions, past-participle "whiz" deletions, nominalizations and sentence relatives, and underuse "though", discourse particles, wh-object clauses and downtoners. None of the genres is marketing copy, the data predates late-2025 models, and the paper's claim that features hold under prompting is not tested with a "write like a human" prompt. Em dashes are not measured. Persuaficial (arXiv 2601.04925v2, revised 2026-04-21, accepted to the ACL 2026 Main Conference per the arXiv record, [paper](https://arxiv.org/html/2601.04925v2), fetched 2026-11-27) uses news, diplomat posts on X and Reddit debates and 196 StyloMetrix features. It states in section 4.2: "The opposite pattern emerges for Rewriting (Subtle persuasion), where F1 scores drop substantially, by 20.42% on average." This supports MKT-VOICE-01 on those genres (news, X posts, Reddit debates), not on marketing copy: a style marker loses power the moment a prompt targets it.

Exploratory measurement of 8 patterns from Graphite's list (not `corrective.re`; section 7 measures that file). Command, run in `~/.cache/research-lang/exemplars/product/wave2/mva-q1/lp` on 2026-11-27 (source of `ph.py` and `lpm.py` in the appendix):

```sh
python3 -I ../bin/ph.py $(ls *.20220901.html | grep -v postman) *.20261101.html
```

```
20220901 pages 18 words 16243
  dependable             hits=  0 per1k=0.00 pages_with=0
  this/why matters       hits=  0 per1k=0.00 pages_with=0
  is more than a         hits=  0 per1k=0.00 pages_with=0
  rather than simply     hits=  0 per1k=0.00 pages_with=0
  not only/just X but    hits=  0 per1k=0.00 pages_with=0
  looking ahead          hits=  0 per1k=0.00 pages_with=0
  adds another layer     hits=  0 per1k=0.00 pages_with=0
  genuinely              hits=  0 per1k=0.00 pages_with=0
  em dash                hits= 22 per1k=1.35 pages_with=8
20261101 pages 16 words 21009
  is more than a         hits=  1 per1k=0.05 pages_with=1
  not only/just X but    hits=  1 per1k=0.05 pages_with=1
  (dependable, this/why matters, rather than simply, looking ahead, adds another layer, genuinely: 0)
  em dash                hits= 36 per1k=1.71 pages_with=9
```

So these 8 patterns hold the property MKT-VOICE-05's retired admission criterion asked for on landing pages: 0 hits in 16k pre-LLM words. (The patterns include "dependable" and "genuinely", which `corrective.re` does not; the two files overlap on 4 patterns.) They also show almost no occurrence in 2026 human-run pages, which is the expected pattern if those pages are mostly not model-written. The cost is that a fixed phrase list is a moving target: the same study's tell count shifts per model version.

### 7. A runnable check for the phrase tells

`corrective.re` (6 patterns, the file MKT-VOICE-19 ships; the patterns are adaptations of Graphite's phrases, looser than its frames: "is more than a _ it" requires "it" after a gap, ours does not; Graphite's "not only about" is ours "not only ... but"; so Graphite's multipliers describe its phrases, not these regexes exactly):

```
\bis more than (a|an|just|simply)\b
\brather than (simply|just|merely)\b
\bnot (only|just|simply|merely)\b[^.]{0,60}\bbut\b
\b(this matters|why [a-z ]{1,20} matters)\b
\bjust as important\b
\badds? another layer\b
```

Line test (6 fail lines, 5 pass lines; ugrep 7.8.4 as `grep`, 2026-11-27, `cd ~/.cache/research-lang/exemplars/product/wave2/mva-q1`):

```
grep -ciE -f corrective.re fail.txt   -> 6 (of 6)
grep -ciE -f corrective.re pass.txt   -> 0 (of 5)
```

The rule's own pipeline, run in a scratch git repository (`mva-q1-repair/scratch`, `origin/main` ref set to the base commit, the 6 fail and 5 pass lines added to `copy.md`):

```
git diff -U0 origin/main -- copy.md | grep '^+' | grep -v '^+++' | grep -ciE -f ../../mva-q1/corrective.re   -> 6
(pass lines only added)                                                                                       -> 0
```

Page measurement with `corrective.re` itself (the repair pass). The page text is the `lpm.py` extraction dumped one file per page by `dump.py` (appendix), then `grep` is applied line by line, the way the rule applies it to a diff:

```sh
cd ~/.cache/research-lang/exemplars/product/wave2/mva-q1-repair
python3 -I dump.py $PWD/txt ../mva-q1/lp/*.html
for t in 20220901 20261101; do for f in txt/*.$t.txt; do grep -noiE -f ../mva-q1/corrective.re $f /dev/null; done; done
```

```
== 20220901 (18 pages, 16,243 words; postman excluded)   total matching lines: 0
== 20261101 (16 pages, 21,009 words)                     total matching lines: 2
txt/planetscale.com.20261101.txt:257:is more than just
txt/supabase.com.20261101.txt:854:not only plan what data we should save but
```

The two 2026 hits, read in context: PlanetScale, a customer quote, "Our migration to Vitess is more than just a technological upgrade; it's a strategic move..." attributed to a named person at Intercom; Supabase, a customer tweet, "Claude Code would not only plan what data we should save but also figure out a migration script". Both are third-party testimonials, so the 2026 hits do not show who wrote the page copy, and they show that a quoted human sentence trips the check. That is why MKT-VOICE-19 needs the quotation exemption below and stays CONSIDER.

Decay check (re-extracts the multipliers; `gmult.py` in the appendix; run 2026-11-27 on `curl -sL https://graphite.io/five-percent/research/ai-tells-opus-5-5-update -o g.html`):

```
python3 -I gmult.py g.html
this matters           116x
why _ matters          92x
is more than a _ it    98x
rather than simply     32x
not only about         13x
just as important      13x
adds another layer     27x
```

## Effect on the ruleset

| Rule | Effect | Exact new text or note |
|---|---|---|
| MKT-VOICE-01 | confirm | Persuaficial (arXiv 2601.04925v2, 2026-04-21): "F1 scores drop substantially, by 20.42% on average" under subtle rewriting (news, X, Reddit, not marketing copy), and Graphite's 4 percent drop in tell count between Opus 5 and Opus 5.5 with the dash gone, both support "no marker ever gates". Add the two sources to the rationale; no text change. Verification unchanged. |
| MKT-VOICE-03 | confirm, rationale edit | Keep rule and severity. Replace the rationale sentence "All 12 models measured emit 0.00 to 10.62 em dashes per 1,000 words unconstrained" with: "All 12 models in Freeburg Table 1 ([arXiv 2603.27006](https://arxiv.org/html/2603.27006), 2026-03-27) emit 0.00 to 10.62 unconstrained, and Graphite ([2026-10-01](https://graphite.io/five-percent/research/ai-tells-opus-5-5-update)) measures Opus 5.5 at 0.015 and Astra at about one-eighth of the human rate, so the dash is no longer a reliable sign of model output. The rule stays because the diff grep is free and the dash is house style, not a claim about authorship." Verification unchanged (the grep in the parent file). |
| MKT-VOICE-04 | change | **New text:** "For existing copy that DOC-PLAIN-01 does not govern, report em dash density as a warning only when a document of 300 or more prose words has 6 or more em dashes and 3.0 or more per 1,000 words. Never rewrite existing text to clear the warning without the owner's yes. Turn the warning off for a project whose own pre-2022 prose on the same surface is at or above 3.0. Where DOC-PLAIN-01 governs a file, its whole-tree warning and backfill decide instead." **Rationale** replaces "0 of 26 pre-2022 READMEs reach 3.0" with: "0 of 26 pre-2022 READMEs reach 3.0, but 2 of 18 pre-2022 landing pages do (Figma 4.34 and Notion 5.29, 3 dashes each; section 2 of `followup-q1.md`). The pre-2022 maximum count is 5 (GitHub home page), so a floor of 6 dashes clears all 44 baseline documents. Run on the 10 fleet READMEs of 300 or more words, the rule with the floor fires on 6 and the old rule on 8 (section 4b). The floor is fitted to 44 documents and is a starting point, not a calibrated limit." **Verification (full command, run 2026-11-27; `$DQ` is `skills/docs-quality-reference/checks`):** `python3 -I "$DQ/strip_prose.py" PATH \| python3 -I -c 'import sys;t=sys.stdin.read();n=t.count("\u2014");w=len(t.split());r=round(n/max(w,1)*1000,2);print(n,w,r,"WARN" if (w>=300 and n>=6 and r>=3.0) else "ok")'`. Output over the 10 fleet READMEs of 300+ words: 6 `WARN` (grimoire 7 dashes, index 7, indexer 21, rules_ocx 31, vscode 33, ocx-mirror 8), 2 documents that the old rule flagged and the new one does not (catalog 4, www-setup 3), 2 `ok`; over the 26 pre-2022 READMEs of 300+ words: 0 `WARN` (section 4b has the full lines). For a built landing page, extract visible text first with the MKT-VOICE-11 command and pipe it to the same python body. Project baseline command unchanged. |
| MKT-VOICE-09 | change | **New text:** "On a pitch, home, readme or email surface whose voice row says `person = "second"`, warn when contractions plus 'you' and 'your' fall below 5 per 1,000 words in a document of 300 or more prose words. Never apply it to a `release-note` or `notice` surface or to any changelog. Report the rate, and leave the register to the owner." **Rationale adds:** "Pre-2022 changelogs carry 2.66 per 1,000 (5 repositories, 62,481 words in 2019 to 2022 sections), pre-2022 landing pages 24.69 pooled but 2 of 18 below 10 (Mailchimp 2.46, Stripe 7.97) and 1 of 18 below 5; 0 of 26 pre-2022 READMEs fall below 10. The earlier floor of 10 flagged 11 percent of human home pages and every human changelog (`followup-q1.md` sections 2, 4, 4b)." **Severity** stays CONSIDER. **Verification (full command, run 2026-11-27; `$1` is the surface name from the voice row, `$2` the path):** `case "$1" in release-note\|notice) echo "skip surface=$1"; exit 0;; esac; python3 -I "$DQ/strip_prose.py" "$2" \| python3 -I -c 'import re,sys;t=sys.stdin.read();w=len(t.split());n=len(re.findall(r"\b\w+(?:n\x27t\|\x27re\|\x27ve\|\x27ll\|\x27d)\b",t,re.I))+len(re.findall(r"\byou(?:r\|rs)?\b",t,re.I));r=round(n/max(w,1)*1000,2);print(n,w,r,"WARN" if (w>=300 and r<5) else "ok")'`. Measured: 26 of 26 pre-2022 READMEs `ok`; pooled pre-2022 READMEs `1387 48480 28.61` (the parent file's number, reproduced); 1 of 18 pre-LLM landing pages `WARN` (Mailchimp); 0 of 16 pages of 2026; fleet READMEs: 4 of 10 `WARN` (conventions, index, ocx-mirror at 0.0 and www-setup at 4.32). All 5 changelogs print `skip surface=release-note`, whereas 4 of 5 print `WARN` if wrongly treated as a README (section 4b). |
| MKT-VOICE-05 | confirm (stay retired) | The new rule below does not revive a tell-list admission criterion. The baseline measured here (0 of 8 exploratory phrase patterns in 16,243 landing words, and 0 lines of `corrective.re`) is recorded in the catalog-maintenance note as one further data point. Verification: none new (the rule is retired). |
| NEW MKT-VOICE-19 | new | **Rule:** Write no corrective-framing or importance-flag construction in copy you add to a copy surface: "is more than a X", "rather than simply", "not only X but", "this matters", "why X matters", "just as important", "adds another layer". State the plain fact or the evidence instead. A verbatim, attributed customer quotation is exempt: leave it unedited and mention the hit in your report. **Rationale:** Graphite's study (2026-10-01, fetched 2026-11-27, a content-marketing firm's study of articles, vendor data) prints these multipliers over the pre-ChatGPT human rate for its phrases: "is more than a _ it" 98x, "rather than simply" 32x, "not only about" 13x, "this matters" 116x, "why _ matters" 92x, "just as important" 13x, "adds another layer" 27x; the regexes in `corrective.re` are looser adaptations of those phrases, so the multipliers describe the phrases, not the regexes. The phrases remain after the em dash is gone (2,548 tells in Opus 5.5 against 2,666 in Opus 5), and they claim an importance the page does not show, the "so what" complaint behind MKT-VOICE-07. 0 of 18 pre-2022 landing pages hold a hit. This is house style for agent output, not a claim about authorship, and a hit in existing text never triggers a rewrite. **Verification:** `git diff -U0 origin/main -- <copy paths> \| grep '^+' \| grep -v '^+++' \| grep -ciE -f corrective.re` prints 0, with `corrective.re` as in section 7. Run 2026-11-27 in a scratch git repository: 6 fail and 5 pass lines added, prints 6; pass lines only, prints 0. Run with `corrective.re` itself over page text: 0 matching lines in 16,243 pre-LLM landing-page words, 2 lines in 21,009 words of 2026, both customer testimonials (PlanetScale, Supabase; section 7). **Severity:** CONSIDER, because the list is from one vendor study, tells change by model version, and a quoted human sentence trips the check. |
| Decay table | change | Add the row: "MKT-VOICE-19: Graphite's tell list and multipliers \| Graphite 2026-10-01 \| every new frontier-model generation or 6 months: re-fetch the page and compare." Verification (run 2026-11-27, output in section 7): `curl -sL https://graphite.io/five-percent/research/ai-tells-opus-5-5-update -o g.html && python3 -I gmult.py g.html` prints seven lines, each `NAME NNx`, and `\| grep -c MISSING` prints 0; a MISSING line or a multiplier below 2x means the list needs a revision. Re-run section 7's page measurement with `corrective.re` and record the counts. Extend the MKT-VOICE-03, -04, -09 row with: "landing-page and changelog baseline re-measured in `followup-q1.md` (18 pre-LLM landing pages, 5 changelogs); re-run `v04.sh`, `v09.sh` and `lpm.py` from its appendix". Check that the parent file carries both edits: `grep -c 'MKT-VOICE-19: Graphite' marketing-voice-ai-authorship.md` prints 1 and `grep -c 'followup-q1.md' marketing-voice-ai-authorship.md` prints at least 1. |
| Open questions | change | Replace the baseline question with: "A pre-LLM baseline for marketing email and for prose release announcements (blog posts, GitHub release bodies) is still missing (`followup-q1.md` section 5 and the gaps list)." Check: `grep -c 'prose release announcements' marketing-voice-ai-authorship.md` prints 1 and `grep -c 'A pre-LLM baseline for marketing email' marketing-voice-ai-authorship.md` prints 1. These two greps return 0 today because the parent file has not been edited; this follow-up does not edit it. |

## Dated facts

| Fact | Value | Source and date |
|---|---|---|
| Opus 5.5 em dash rate | 0.015 per 1,000 words, against 2.92 for Opus 5 | Graphite update, 2026-10-01, fetched 2026-11-27: https://graphite.io/five-percent/research/ai-tells-opus-5-5-update (vendor, a content-marketing firm) |
| Astra em dash rate | "about one-eighth as often" as human articles before ChatGPT; "95% less often than GPT-5" | same page, quoted 2026-11-27 |
| Graphite human baseline | 10,000 web articles published before ChatGPT's launch; 9,974 aligned topics in the update | VentureBeat, 2026-09-30, fetched 2026-11-27: https://venturebeat.com/ai/claude-opus-5-5-uses-em-dashes-99-less-often-and-sounds-more-human-but-still-exhibits-2-548-ai-writing-tells |
| Tell counts | 3,746 (Opus 4), 3,059 (Opus 4.6), 2,666 (Opus 5), 2,548 (Opus 5.5, "just 4% fewer" than Opus 5) | Graphite update, 2026-10-01 |
| Tell definition | at least twice the human rate, with minimum counts of 500, 250, 100 and 120 by type | Graphite update, 2026-10-01 |
| Tell multipliers (vendor) | "this matters" 116x, "is more than a _ it" 98x, "why _ matters" 92x, "looking ahead the" 40x, "rather than simply" 32x, "adds another layer" 27x, "dependable" 23x, "not only about" 13x, "just as important" 13x | Graphite update, 2026-10-01, re-extracted 2026-11-27 with `gmult.py` |
| Wikipedia status of the em dash | listed under Historical indicators as "Overuse of em dashes (2022 to September 2026)" | https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing, fetched 2026-11-27; body text of the section truncated in the fetch |
| Grammar-level LLM markers, older models | overuse of that-subject clauses, contractions, nominalizations; underuse of downtoners and discourse particles | Rallapalli et al., arXiv 2604.14111v1, 2026-04-15: https://arxiv.org/html/2604.14111v1 |
| Subtle persuasive rewriting | "F1 scores drop substantially, by 20.42% on average" (section 4.2); accepted to the ACL 2026 Main Conference | Persuaficial, arXiv 2601.04925v2, v1 2026-01-08, v2 2026-04-21: https://arxiv.org/html/2601.04925v2 |
| Pre-LLM landing page em dash rate | pooled 1.35 per 1,000 (18 pages, 16,243 words), maximum 5.29, 2 of 18 at 3.0 or more with 3 or more dashes | measured 2026-11-27 on Wayback snapshots of 2022-09 (section 2) |
| 2026 landing page em dash rate | pooled 1.71 per 1,000 (16 pages, 21,009 words), 2 of 16 fire the full rule | measured 2026-11-27 on Wayback snapshots of 2026-11 (section 3) |
| Pre-LLM changelog register | 2.66 contractions plus "you" per 1,000 (62,481 words, 5 repositories) | measured 2026-11-27 (section 4) |
| Pre-LLM landing register | pooled 24.69 per 1,000, 2 of 18 below 10 | measured 2026-11-27 (section 2) |
| Phrase tells on pre-LLM landing pages | `corrective.re`: 0 matching lines in 16,243 words, 2 in 21,009 words of 2026 (both customer testimonials); exploratory 8 patterns: same counts | measured 2026-11-27 (sections 6 and 7) |
| Fleet README effect of the 6-dash floor | 6 of 10 documents of 300+ words fire, against 8 of 10 under the old rule | measured 2026-11-27 (section 4b) |
| MKT-VOICE-09 floor of 5 | 0 of 26 pre-2022 READMEs, 1 of 18 pre-LLM landing pages, 0 of 16 pages of 2026 fall below; 4 of 10 fleet READMEs do | measured 2026-11-27 (section 4b) |

## What could not be determined

- Pre-LLM marketing email and prose release announcements: no labelled, dated, openly readable corpus was reachable. Missing: a corpus of product-marketing email from 2019 to 2022 with sender and date, or read access to a mail archive. GitHub release bodies were skipped because reading them needs the GitHub API with a token, which this task may not use.
- Whether the two 2026 landing pages that fire MKT-VOICE-04 (Cloudflare, Stripe) were model-written. Missing: authorship statements or an audit trail from those sites. The count is a rule-behaviour count only.
- The full text of Wikipedia's "Overuse of em dashes (2022 to September 2026)" section and its reasoning for the end date. The fetch truncated that section; only the heading was read.
- Graphite's original generation prompt, per-model sample counts and the full 13,000-phrase list. The update page links the original study, which was not fetched. The Inc. article (HTTP 403 twice, [URL](https://www.inc.com/chris-morris/wondering-if-ai-wrote-that-document-these-are-the-surprising-new-clues/91413963)) could not be read and nothing here rests on it.
- Whether phrase tells survive a prompt that asks the model to avoid them. No source tests the Graphite tells under a suppression prompt, so "they remain after the dash is prompted away" is inferred from the fixed-prompt result and from Graphite's remark about churn.
- Whether `corrective.re` flags legitimate human sentences beyond the two testimonials read. Those two were read and are quoted human text; the check was not run on a larger human corpus of recent copy.
- Reader response: whether copy that avoids these frames is rejected less often. That is the third open question of the parent file and stays open.

## Sources

| URL | What it is | Date | Why it matters |
|---|---|---|---|
| https://graphite.io/five-percent/research/ai-tells-opus-5-5-update | Graphite's AI-tells update with per-model em dash rates and tell multipliers (vendor) | 2026-10-01 | Primary source for the late-2026 marker shift |
| https://venturebeat.com/ai/claude-opus-5-5-uses-em-dashes-99-less-often-and-sounds-more-human-but-still-exhibits-2-548-ai-writing-tells | News report with method and the pre-LLM baseline caveat | 2026-09-30 | Independent description of the baseline and its limits |
| https://theaiinsider.tech/2026/10/05/graphite-study-finds-ai-models-still-leave-thousands-of-writing-tells/ | Secondary report; the "tells hold steady" remark | 2026-10-05 | Churn argument |
| https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing | WikiProject AI Cleanup guide (advice, not policy) | read 2026-11-27 | Lists the em dash as historical, lists the current markers |
| https://arxiv.org/html/2604.14111v1 | Rallapalli et al., 67 Biber features across 8 genres | 2026-04-15 | Grammar-level markers; not marketing text |
| https://arxiv.org/html/2601.04925v2 | Persuaficial benchmark, 196 StyloMetrix features; abstract page https://arxiv.org/abs/2601.04925 | 2026-04-21 (v2) | Subtle rewriting defeats detection; ACL 2026 Main |
| https://arxiv.org/html/2603.27006 | Freeburg, em dash by model (already in the parent file) | 2026-03-27 | Table 2 prohibition results |
| http://archive.org/wayback/available | 34 Wayback Machine home-page snapshots, 21 sites, listed in `fetch.log` in the scratch directory | 2022-09 and 2026-11 | Landing-page baseline |
| https://github.com/BurntSushi/ripgrep, eslint/eslint, pytest-dev/pytest, denoland/deno, tokio-rs/tokio | Changelog files, `--depth 1` clones | HEAD at 2026-11-27 | Release-note baseline |

## Appendix: scripts (source as run)

Directory: `~/.cache/research-lang/exemplars/product/wave2/mva-q1/bin` for `lpm.py`, `ph.py`, `rnm.py`; `~/.cache/research-lang/exemplars/product/wave2/mva-q1-repair` for the rest. None is in a repository. Run each with `python3 -I`.

`lpm.py` (landing-page text and metrics; used by every landing-page number):

```python
import re,sys,html
from html.parser import HTMLParser
SKIP={'script','style','noscript','svg','template','head'}
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.d=0; s.out=[]; s.title=False
    def handle_starttag(s,t,a):
        if t in SKIP: s.d+=1
        if t in('p','div','li','h1','h2','h3','h4','br','section','a','button','span'): s.out.append('\n')
    def handle_endtag(s,t):
        if t in SKIP and s.d: s.d-=1
    def handle_data(s,x):
        if not s.d: s.out.append(x)
def text(path):
    raw=open(path,errors='replace').read()
    p=P(); p.feed(raw)
    t=' '.join(p.out)
    t=t.replace('’',"'").replace('‘',"'")
    return re.sub(r'[ \t\r]+',' ',t)
CON=re.compile(r"\b\w+(?:n't|'re|'ve|'ll|'d)\b",re.I)
YOU=re.compile(r"\byou(?:r|rs)?\b",re.I)
def m(t):
    w=len(t.split()); em=t.count('—'); c=len(CON.findall(t)); y=len(YOU.findall(t))
    return w,em,c,y
if __name__=='__main__':
    tot=[0,0,0,0]
    print("file words em em/1k contr you (contr+you)/1k")
    for f in sys.argv[1:]:
        t=text(f); w,em,c,y=m(t)
        for i,v in enumerate((w,em,c,y)): tot[i]+=v
        print(f"{f.split('/')[-1]} {w} {em} {em/max(w,1)*1000:.2f} {c} {y} {(c+y)/max(w,1)*1000:.2f}")
    w,em,c,y=tot
    print(f"POOLED words={w} em={em} em/1k={em/max(w,1)*1000:.2f} contr={c} you={y} (c+y)/1k={(c+y)/max(w,1)*1000:.2f}")
```

`ph.py` (the 8-pattern exploratory run of section 6):

```python
import sys,re
sys.path.insert(0,'/home/mherwig/.cache/research-lang/exemplars/product/wave2/mva-q1/bin')
import lpm
P={'dependable':r'\bdependabl\w*','this/why matters':r'\b(this matters|why [\w ]{1,20} matters)\b','is more than a':r'\bis (more|about more) than (a|an|just)\b','rather than simply':r'\brather than (simply|just|merely)\b','not only/just X but':r"\b(not (only|just|simply)\b[^.]{0,60}\bbut\b)",'looking ahead':r'\blooking ahead\b','adds another layer':r'\badds? (another|an extra) layer\b','genuinely':r'\bgenuine(ly)?\b','em dash':'—'}
for tag in ('20220901','20261101'):
    fs=[f for f in sys.argv[1:] if tag in f]; ts=[lpm.text(f) for f in fs]
    W=sum(len(t.split()) for t in ts)
    print(tag,'pages',len(fs),'words',W)
    for k,r in P.items():
        n=[len(re.findall(r,t,re.I)) for t in ts]
        print(f"  {k:22s} hits={sum(n):3d} per1k={sum(n)/W*1000:.2f} pages_with={sum(1 for x in n if x)}")
```

`rnm.py` (changelog sections by date, section 4):

```python
import re,sys,datetime
MON={m:i+1 for i,m in enumerate(['january','february','march','april','may','june','july','august','september','october','november','december'])}
def pdate(line):
    m=re.search(r'(20\d\d)[-.](\d\d)[-.](\d\d)',line)
    if m: return datetime.date(*map(int,m.groups()))
    m=re.search(r'([A-Z][a-z]+) (\d{1,2})(?:st|nd|rd|th)?,? (20\d\d)',line)
    if m and m.group(1).lower() in MON: return datetime.date(int(m.group(3)),MON[m.group(1).lower()],int(m.group(2)))
    return None
def strip(t):
    t=re.sub(r'(?s)```.*?```','',t); t=re.sub(r'`[^`]*`','',t)
    t=re.sub(r'\[([^\]]*)\]\([^)]*\)',r'\1',t); t=re.sub(r'https?://\S+','',t)
    t=re.sub(r'(?m)^\.\. .*$','',t)
    t=re.sub(r'#\d+|@[\w-]+|\b[0-9a-f]{7,40}\b','',t)
    return t.replace('’',"'")
CON=re.compile(r"\b\w+(?:n't|'re|'ve|'ll|'d)\b",re.I); YOU=re.compile(r"\byou(?:r|rs)?\b",re.I)
def sections(path):
    cur=None;buf=[];out=[]
    for ln in open(path,errors='replace'):
        if re.match(r'^(#{1,4} |[A-Za-z0-9].*\n?$)',ln) and (ln.startswith('#') or re.match(r'^\S.*20\d\d',ln)) :
            d=pdate(ln)
            if d and (ln.startswith('#') or re.search(r'\d+\.\d+',ln)):
                if cur: out.append((cur,''.join(buf)))
                cur=d;buf=[];continue
        buf.append(ln)
    if cur: out.append((cur,''.join(buf)))
    return out
lo,hi=datetime.date(2019,1,1),datetime.date(2022,11,30)
late=datetime.date(2025,1,1)
for f in sys.argv[1:]:
    s=sections(f)
    for name,sel in (('pre',lambda d:lo<=d<hi),('2025+',lambda d:d>=late)):
        t=strip('\n'.join(b for d,b in s if sel(d)));w=len(t.split());em=t.count('—');c=len(CON.findall(t));y=len(YOU.findall(t))
        n=sum(1 for d,b in s if sel(d))
        print(f"{f.split('/')[0]} {name} sections={n} words={w} em={em} em/1k={em/max(w,1)*1000:.2f} contr={c} you={y}")
```

`v04.sh`, `v09.sh` (proposed check blocks), `v09html.py`, `dump.py`, `gmult.py` (repair pass):

```sh
# MKT-VOICE-04 proposed command: prints n w rate and WARN/ok per file
f=$1
python3 -I "$DQ/strip_prose.py" "$f" | python3 -I -c 'import sys;t=sys.stdin.read();n=t.count("—");w=len(t.split());r=round(n/max(w,1)*1000,2);print(n,w,r,"WARN" if (w>=300 and n>=6 and r>=3.0) else ("old-rule" if (w>=300 and n>=3 and r>=3.0) else "ok"))'
# MKT-VOICE-09 proposed check. usage: v09.sh SURFACE PATH   (stdin text via strip_prose.py)
case "$1" in release-note|notice) echo "skip surface=$1"; exit 0;; esac
python3 -I "$DQ/strip_prose.py" "$2" | python3 -I -c 'import re,sys;t=sys.stdin.read();w=len(t.split());n=len(re.findall(r"\b\w+(?:n\x27t|\x27re|\x27ve|\x27ll|\x27d)\b",t,re.I))+len(re.findall(r"\byou(?:r|rs)?\b",t,re.I));r=round(n/max(w,1)*1000,2);print(n,w,r,"WARN" if (w>=300 and r<5) else "ok")'
```

```python
import sys,re
sys.path.insert(0,'/home/mherwig/.cache/research-lang/exemplars/product/wave2/mva-q1/bin')
import lpm
for f in sys.argv[1:]:
    w,em,c,y=lpm.m(lpm.text(f)); r=round((c+y)/max(w,1)*1000,2)
    print(f.split('/')[-1],c+y,w,r,'WARN5' if w>=300 and r<5 else 'ok5','WARN10' if w>=300 and r<10 else 'ok10')

import sys,os
sys.path.insert(0,'/home/mherwig/.cache/research-lang/exemplars/product/wave2/mva-q1/bin')
import lpm
out=sys.argv[1]
for f in sys.argv[2:]:
    t=lpm.text(f); open(os.path.join(out,os.path.basename(f)[:-5]+'.txt'),'w').write(t)

# Decay check for MKT-VOICE-19: print Graphite multipliers for the rule's phrases. usage: gmult.py page.html
import re,html,sys
t=open(sys.argv[1],errors='replace').read()
t=re.sub(r'(?s)<(script|style)\b.*?</\1>','',t); t=html.unescape(re.sub(r'<[^>]+>','\n',t))
t=re.sub(r'\s*\n\s*','|',t)
for k in ('this matters','why _ matters','is more than a _ it','rather than simply','not only about','just as important','adds another layer'):
    m=re.search(re.escape(k)+r'\|(\d+)x',t); print(f"{k:22s} {m.group(1)+'x' if m else 'MISSING'}")
```
