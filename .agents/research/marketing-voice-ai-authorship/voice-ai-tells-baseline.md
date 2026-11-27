---
title: AI-authorship style markers against a pre-LLM baseline, and why no detector may gate
program: product
sub_program: marketing
topic: marketing-voice-ai-authorship
worker: voice-ai-tells-baseline
date_researched: 2026-11-27
model: sonnet
sources_fetched: 22
scope: >
  Covers which observable style markers separate fleet README copy from pre-ChatGPT README copy at a
  false-positive rate fit for a warning, detector reliability, published marker frequency studies, and
  reader-reported tells from 2026 Hacker News comments. Does not cover legal AI-disclosure duties (EU AI Act,
  FTC, platform labelling), which belong to the sibling disclosure and law dives, nor venue rules beyond one
  line each. Measurement unit is README prose only, not landing pages, email or release notes.
---

# AI-authorship style markers against a pre-LLM baseline

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Method and the pre-registered thresholds](#1-method-and-the-pre-registered-thresholds)
   2. [Measured marker table](#2-measured-marker-table)
   3. [The one qualifying marker: em dash density](#3-the-one-qualifying-marker-em-dash-density)
   4. [Markers that look like tells and fail the baseline](#4-markers-that-look-like-tells-and-fail-the-baseline)
   5. [Exploratory, post hoc features](#5-exploratory-post-hoc-features)
   6. [Detectors: what the primary studies show](#6-detectors-what-the-primary-studies-show)
   7. [Published marker frequency studies](#7-published-marker-frequency-studies)
   8. [Reader-reported tells in 2026 Hacker News comments](#8-reader-reported-tells-in-2026-hacker-news-comments)
   9. [Which markers duplicate DOC-PLAIN rows](#9-which-markers-duplicate-doc-plain-rows)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)
9. [Appendix: commands and scripts](#appendix-commands-and-scripts)

## Summary

- Only one of 35 candidate markers passed the pre-registered baseline test on README prose: em dash density. Pre-ChatGPT upstream READMEs carry 0.19 em dashes per 1,000 words; the 18 fleet READMEs carry 13.51, 71 times higher.
- The em dash marker is already owned. DOC-PLAIN-01 bans em dashes in documentation prose as house style. Extend it to marketing copy only as a density warning, at 3.0 per 1,000 words in a document of 300 or more prose words.
- At that density threshold the warning flagged 0 of 26 pre-2022 READMEs, 1 of 29 current upstream READMEs and 8 of 10 fleet READMEs. The threshold sits just above the pre-2022 maximum of 2.26, so it is tuned to a 36-document sample: treat it as a starting point, not a calibrated limit.
- Every other classic tell failed or showed nothing: triads (1.34 per 1,000 pre-2022, failing the 0.30 bound), emoji (3.47), bold-lead bullets (0.45, 2 of 26 documents trigger), "navigate" and "ensure" (documented human words). The AI-vocabulary lists (DOC-PLAIN-10, DOC-PLAIN-12) and "not just X but Y" patterns pass the baseline but score zero in the fleet, so this sample gives them no discriminating evidence.
- The fleet READMEs do not read like the stock "AI slop" lexicon. They are terse and impersonal: 0.42 contractions per 1,000 words against 4.25 pre-2022, 7.7 uses of "you" against 24.4. A lexicon warning list would miss the fleet's actual style.
- Fleet authorship is unlabelled. Across 177 fleet commits touching a README, only 2 trailer lines name an AI tool, so a higher fleet rate shows a different style from the 2022 baseline, not machine authorship.
- Never gate on a detector. OpenAI withdrew its own classifier on 2023-07-20 at 26 percent true positives and 9 percent false positives; seven detectors flagged 61.22 percent of non-native English essays; thirteen detectors gave false-positive rates from 0.0 to 100.0 percent on edited human text (preprint, 2026-08-27).
- Detectors have improved on long, plain prose: Epoch AI (2026-07-15) measured 0 of 495 false positives for Pangram and GPTZero on 500-word pre-2022 passages. Those passages were blogs, fiction and science papers, not READMEs or marketing copy, and style imitation still evaded 10 percent. The evidence supports "advisory only", not "gate".
- The reader complaints in 284 2026 HN comments about AI-looking READMEs and sites are about content and care, not punctuation: 57 infer carelessness, 21 ask for the author's own words, 18 object to vague or "so what" claims, 13 to length or flowery prose, and 6 name the em dash.
- Published marker studies measure vocabulary and grammar drift in scientific prose (excess words, present participial clauses at 5.3 times the human rate in GPT-4o). None measures README or landing-page copy, so none transfers without a local baseline.
- Every tell list drifts with model era. The Wikipedia guide now labels the em dash "historical" (2022 to September 2026), and Claude Opus 4.6 drops from 9.09 to 0.19 em dashes per 1,000 words when told to avoid markdown (Freeburg, 2026-03-27).
- Measure the project's own pre-AI prose before enabling any marker: human em dash rates run from 0.33 to 17.12 per 1,000 words across eight published essays (Freeburg), so a human author can sit inside the fleet's range.
- Do not run humanizer or paraphrase tools to pass a detector. Recursive paraphrasing defeats detectors (Sadasivan et al.), and the Wikipedia guide warns that fixing surface signs hides underlying problems.
- "An author-only fact per section" has no named source. It appears below only as CONSIDER, marked unverified: reading heuristic.

## Findings

### 1. Method and the pre-registered thresholds

Working directory for every command: `~/.cache/research-lang/exemplars/product/voice-baseline` (the scripts are reproduced in the appendix, because the sibling cache directories were cleared during this run).

- Corpus. The 40 upstream repositories from the exemplar-readmes audit (`repos.txt`, 40 lines) were cloned as bare blobless mirrors: `git clone -q --bare --filter=blob:none https://github.com/$r.git` via `xargs -P 8 -n1 ./clone.sh`. `./extract.sh` took, per repository, `git rev-list -1 --before=2022-11-30T00:00:00Z HEAD` and the root README at that commit (`pre/`), plus the root README at HEAD (`head/`). 36 repositories have a pre-2022-11-30 README; four have none and were excluded from the pre-2022 corpus: `astral-sh/uv`, `jdx/mise`, `ollama/ollama`, `prefix-dev/pixi` (`grep NOPRE extract.log`). The 36 pre-2022 commits fall between 2022-05-26 (`jqlang/jq`) and 2022-11-29.
- Fleet. The 18 fleet READMEs were copied from the local checkouts under `/home/mherwig/dev` (`grimoire-rs/{grim-gui,grim-mirror,grimoire,indexer,vscode}`, `michael-herwig/arcana`, `ocx-sh/{catalog,conventions,devcontainer-features,e2e-index,grimoire-lore,index,indexbot,ocx,ocx-mirror,rules_ocx,website,www-setup}`). The list matches the 18 repositories of the exemplar-readmes audit. The last README commit dates run from 2026-07-29 to 2026-11-26.
- Prose extraction. Every count uses `strip()` from `skills/docs-quality-reference/checks/strip_prose.py` (DOC-PLAIN-04), which removes front matter, code fences, inline code, link targets and HTML blocks. Words are whitespace tokens of that stripped prose. Corpus sizes: pre-2022 48,480 words (36 documents, 26 of 300 words or more); upstream HEAD 56,055 words (40 documents, 29 of 300 or more); fleet 9,622 words (18 documents, 10 of 300 or more). Known limit: a README that is mostly an HTML block strips to almost nothing (`biomejs/biome` pre-2022 strips to 1 word); the rate denominators for such files are tiny, which is why the document-level trigger requires 300 words.

The thresholds were written to `PREREG.txt` before any marker rate was computed:

| Criterion | Threshold |
|---|---|
| Document-level trigger T | 3 or more hits and a rate of 1.0 or more per 1,000 words, in a document of 300 or more prose words |
| Q1 (false-positive bound, pooled) | pre-2022 pooled rate at most 0.30 per 1,000 words |
| Q2 (false-positive bound, per document) | at most 1 of the pre-2022 documents of 300 or more words meets T |
| Q3 (separation) | fleet pooled rate at least max(1.0, 3 times the pre-2022 rate) and at least 3 fleet documents meet T |
| Verdict | QUALIFIES passes Q1, Q2 and Q3. WATCH passes Q1 and Q2 only. REJECTED fails Q1 or Q2 |

Fixed caveat: the fleet is not labelled by authorship. Q3 shows a marker separates the fleet's style from a pre-LLM baseline; it does not show the fleet text is machine-written. Two further confounds apply and cannot be removed: genre (the fleet READMEs describe OCI package and agent tooling, the upstream sample describes general developer tools) and the fleet's own lint (DOC-PLAIN-10 and DOC-PLAIN-12 already steer the fleet away from the tell words).

Labelling check: `git -C <repo> log --format='%H%n%B' -- README.md | grep -ciE 'co-authored-by:.*(claude|anthropic|copilot|codex)|generated with'` over the 18 fleet repositories returned 0 for 16, and 1 matching line each for `ocx-sh/index` and `ocx-sh/website`. The README histories total 177 commits (sum of `git log --format=%H -- README.md | wc -l`). Trailers are not a usable label.

### 2. Measured marker table

Command: `python3 -I measure.py | tee summary.txt`. Hits are raw counts, rates are per 1,000 stripped-prose words, and "trig" is documents meeting T out of documents of 300 or more words.

| Marker (definition in appendix) | Pre-2022: hits, rate, trig | Upstream HEAD: hits, rate, trig | Fleet: hits, rate, trig | Verdict |
|---|---|---|---|---|
| Em dash (U+2014), all lines | 9, 0.19, 1/26 | 15, 0.27, 0/29 | 130, 13.51, 8/10 | QUALIFIES |
| Em dash outside list items | 3, 0.06, 1/26 | 4, 0.07, 0/29 | 96, 9.98, 7/10 | QUALIFIES |
| "not just/only/merely X but Y" | 0, 0.00, 0/26 | 0, 0.00, 0/29 | 0, 0.00, 0/10 | WATCH (no signal) |
| "isn't X, it's Y" family | 8, 0.17, 0/26 | 3, 0.05, 0/29 | 3, 0.31, 0/10 | WATCH |
| "not X but Y" short form | 0, 0.00, 0/26 | 2, 0.04, 0/29 | 0, 0.00, 0/10 | WATCH (no signal) |
| Anaphoric "No X. No Y." | 0, 0.00, 0/26 | 0, 0.00, 0/29 | 0, 0.00, 0/10 | WATCH (no signal) |
| One-word triad "fast, simple, and reliable" | 65, 1.34, 8/26 | 94, 1.68, 11/29 | 25, 2.60, 3/10 | REJECTED (humans use it) |
| DOC-PLAIN-12 superlative list | 11, 0.23, 0/26 | 15, 0.27, 0/29 | 0, 0.00, 0/10 | WATCH (no signal) |
| DOC-PLAIN-10 tell words | 1, 0.02, 0/26 | 3, 0.05, 0/29 | 0, 0.00, 0/10 | WATCH (no signal) |
| Emoji outside code fences | 168, 3.47, 4/26 | 70, 1.25, 4/29 | 0, 0.00, 0/10 | REJECTED (humans use it, fleet does not) |
| Bold-lead bullet "- **Term**: text" | 22, 0.45, 2/26 | 40, 0.71, 3/29 | 23, 2.39, 2/10 | REJECTED |
| `leverag*` | 7, 0.14, 1/26 | 7, 0.12, 0/29 | 0, 0.00, 0/10 | WATCH |
| `navigat*` | 11, 0.23, 2/26 | 10, 0.18, 1/29 | 1, 0.10, 0/10 | REJECTED |
| `ensur*` | 16, 0.33, 1/26 | 13, 0.23, 1/29 | 0, 0.00, 0/10 | REJECTED |
| `robust*`, `powerful`, `seamless*`, `unlock*`, `empower*`, `effortless*`, `game-chang*` | 0 to 9 each, at most 0.19 | 0 to 12 each, at most 0.21 | 0 each | WATCH (no signal) |
| Combined lexicon (leverag, streamlin, elevat, tailored, holistic, comprehensive, "whether you", "in today's", "worth noting", "at its core", "dive into", navigat, landscape, journey, crafted) | 24, 0.50, 3/26 | 29, 0.52, 3/29 | 1, 0.10, 0/10 | REJECTED |

The full 35-row output is `summary.txt`; the rows not shown (`streamlin*`, `elevat*`, `tailored`, `holistic`, `comprehensive`, "whether you", "in today's", "worth noting", "at its core", "dive into", `landscape`, `journey`, `crafted`) each have 0 to 11 hits in pre-2022 and upstream HEAD and 0 in the fleet.

### 3. The one qualifying marker: em dash density

- Pre-2022: 9 em dashes in 48,480 words (0.19 per 1,000). Two READMEs contain any: `casey/just` (6, rate 0.87 in 6,878 words) and `eza-community/eza` (3, rate 2.26 in 1,327 words). `grep -c "—" pre/*.txt | grep -v ":0"` confirms the files.
- Upstream HEAD: 15 em dashes in 56,055 words (0.27). The one document at or above 3.0 per 1,000 is `astral-sh/uv` (2 in 591 words, 3.38). `casey/just` has 11 in 15,870 words (0.69).
- Fleet: 130 in 9,622 words (13.51). Documents of 300 or more words have rates of 0.0, 0.0, 6.5, 9.4, 10.4, 17.1, 18.4, 19.8, 22.4 and 22.8. Shorter fleet READMEs reach 29.3 (`arcana`, 8 in 273 words) and 26.1 (`ocx`, 3 in 115 words), so the 300-word floor hides the strongest cases.
- Outside list items the fleet rate is still 9.98, so the effect is not just "link: description" bullets.
- Sensitivity, computed after the fact (`python3 -I post.py`): documents of 300 or more words with a rate of 3.0 or more are 0 of 26 pre-2022, 1 of 29 upstream HEAD and 8 of 10 fleet. The pre-registered trigger (1.0 per 1,000) would have flagged one pre-2022 document (`eza`). The recommended 3.0 is above the pre-2022 maximum of 2.26, which is a fit to this sample, not a calibrated limit.
- Cross-check against the literature. Freeburg (2026-03-27) measured twelve instruction-tuned models at 0.00 to 10.62 em dashes per 1,000 words unconstrained: GPT-4.1 10.62, Claude Opus 4.6 9.09, Claude Sonnet 4 8.29, Claude Haiku 3.5 7.51, DeepSeek V3 6.95, GPT-4o 4.12, Gemini 2.5 Pro 3.53, GPT-5.4 1.43, Llama 3.1 and 3.3 0.00. The fleet rate (13.51) is above every model's unconstrained rate; the fleet is edited text, so this shows the fleet is in the range of model output, not that it is model output. The same paper's human baseline over eight published essays (57,232 words) is a weighted mean of 3.23, median 3.83, range 0.33 to 17.12, and it states human use "varies substantially by genre and author". The upstream README baseline (0.19) is far below the essay baseline (3.23), which is why a README-specific baseline matters.
- The marker is brittle. Freeburg: Claude Opus 4.6 falls from 9.09 to 0.19 when told to avoid markdown, and to 0.00 when em dashes are also prohibited; GPT-4.1 only falls to 3.86. A newer model or one prompted away from the dash will not trip the warning, so absence proves nothing.

### 4. Markers that look like tells and fail the baseline

- Triads. One-word triads ("fast, simple, and reliable") occur at 1.34 per 1,000 in 2022 READMEs and 8 of 26 documents meet T. Humans write them.
- Emoji. 3.47 per 1,000 pre-2022 READMEs, concentrated in a few (4 of 26 documents meet T). Emoji in READMEs was a 2022 human habit; the fleet has none. A reader may still treat emoji bullets as a bot tell (one HN comment below does), so keep it as a reader-reported tell, not a measured one.
- Bold-lead bullets. 0.45 per 1,000 pre-2022 (22 hits), 2 of 26 documents meet T. Rejected as a discriminator.
- `navigat*` and `ensur*`. 0.23 and 0.33 per 1,000 pre-2022: ordinary technical words ("navigate to", "ensure that").
- The combined lexicon. 0.50 per 1,000 pre-2022 with 3 of 26 documents meeting T: false-positive rate about 12 percent per document, too high for a warning, and it scores 0.10 in the fleet.
- Tell words and superlatives. Pre-2022 rates are 0.02 (DOC-PLAIN-10 words) and 0.23 (DOC-PLAIN-12 words), so false positives are bounded, but the fleet scores 0 for both. The fleet already passes both rows, so this sample cannot show they separate anything. The 11 pre-2022 superlative hits are mostly `powerful` (9), an ordinary marketing word humans used in 2022.

### 5. Exploratory, post hoc features

These were not pre-registered. They were found by comparing feature rates after the main table, so treat them as hypotheses. Command: `python3 -I explore.py` and `python3 -I post.py`.

| Feature | Pre-2022 per 1,000 | Upstream HEAD | Fleet | Reading |
|---|---|---|---|---|
| Semicolon | 1.26 | 1.41 | 6.03 | Pre-2022 trig 3/26, so it fails Q2. Rejected. |
| "X, not Y" tail ("a tool, not a service") | 0.12 | 0.12 | 1.56 | Passes Q1 and Q2, but only 2 fleet documents meet T. WATCH, not qualified. |
| "rather than" | 0.14 | 0.16 | 1.25 | Same: 2 fleet documents. WATCH. |
| `never` | 0.19 | 0.23 | 3.01 | Passes all three tests, but the fleet READMEs state rules ("never edit"), so it measures genre. Not a voice tell. |
| `every` | 0.52 | 0.48 | 4.36 | Fails Q1. |
| Contractions | 4.25 | 3.14 | 0.42 | Fleet far below baseline. |
| "you", "your" | 24.36 | 21.30 | 7.69 | Fleet far below baseline. |
| "we" | 1.98 | 1.71 | 0.00 | Fleet has none. |
| Mean sentence length (words) | 10.8 | 11.3 | 16.9 | Fleet sentences are longer. |

The inverse signals are the larger effect: the fleet's missing contractions, second person and first person plural. Those indicate an impersonal, spec-like register, which is the opposite of the "friendly marketing" voice a landing page needs. This is a voice mismatch for marketing surfaces, and it is checkable as a rate (below, VAI-08), but it does not show authorship.

### 6. Detectors: what the primary studies show

- Sadasivan et al., TMLR, arXiv 2303.11156 (v1 2023-03-17, v4 2025-01-17): a recursive paraphrasing attack lowers detection across watermarking, neural, zero-shot and retrieval detectors; watermarked models can be spoofed so human text is flagged; the paper links the best achievable AUROC to the total variation distance between human and AI text ([arXiv](https://arxiv.org/abs/2303.11156)).
- Liang et al., arXiv 2304.02819 (v1 2023-04-06, v3 2023-07-10; published in Patterns): detectors "consistently misclassify non-native English writing samples as AI-generated"; the authors caution against evaluative use ([arXiv](https://arxiv.org/abs/2304.02819)). The Stanford HAI write-up (2023-05-15) reports 91 TOEFL essays, 61.22 percent of them flagged on average, 97 percent (89 of 91) flagged by at least one of seven detectors and 19 percent (18 of 91) flagged by all seven ([Stanford HAI](https://hai.stanford.edu/news/ai-detectors-biased-against-non-native-english-writers)).
- OpenAI stopped offering its own classifier on 2023-07-20 "due to its low rate of accuracy", with 26 percent of AI text caught and 9 percent of human text mislabelled ([OpenAI](https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/)).
- Dugan et al., RAID, ACL 2024 (arXiv 2405.07940, v2 2024-06-10): over 6 million generations, 11 models, 8 domains, 11 adversarial attacks; the 12 detectors tested are "easily fooled" by adversarial attacks, sampling changes, repetition penalties and unseen models ([arXiv](https://arxiv.org/abs/2405.07940)).
- Park, Jeong and Kim, arXiv 2608.26710 (2026-08-27, EMNLP 2026): 135,389 document pairs of non-native manuscripts and their native-edited versions; across 13 detectors the false-positive rate on human text runs from 0.0 to 100.0 percent, and the same edits raise some detectors' scores and lower others ([arXiv](https://arxiv.org/abs/2608.26710)). This is the 2026 follow-up on the non-native false-positive problem; it is a preprint.
- Counter-evidence. Jabarian and Imas, NBER Working Paper 34223 (September 2025), find commercial detectors (Pangram, OriginalityAI, GPTZero) far better than an open-source one and report near-zero false-positive rates for Pangram, with accuracy dropping on passages of 50 words or fewer ([NBER](https://www.nber.org/papers/w34223)). Epoch AI (2026-07-15), 495 human passages of about 500 words by 99 authors, all published before ChatGPT: Pangram 0 of 495 false positives, GPTZero 0 of 495, Originality.ai 19 of 495 (3.8 percent); under five-shot style imitation, 10.1 percent of AI passages evaded Pangram and 10.8 percent GPTZero; detector versions were pinned to June 2026 and the makers can update them without notice ([Epoch AI](https://epoch.ai/data-insights/ai-detectors-false-negatives)).
- The decision. The 2026 evidence narrows the case against detectors on long English prose, and it does not reach the surfaces this program governs: READMEs and landing pages are short, list-heavy, often written by non-native authors and edited by tools. No study fetched here tests them. Vendors update silently, so a CI result is not reproducible next quarter. A warning that a human reads is safe; a gate is not.

### 7. Published marker frequency studies

| Study | What it measured | Marker and number |
|---|---|---|
| Kobak et al., Science Advances 11(27), 2025-07-02 (arXiv 2406.07016) | Over 15 million PubMed abstracts 2010 to 2024, excess vocabulary after 2022 | At least 13.5 percent of 2024 abstracts processed with LLMs, up to about 40 percent in some subcorpora ([arXiv](https://arxiv.org/abs/2406.07016)) |
| Liang et al., arXiv 2404.01268 (2024-04-01) | 950,965 papers, corpus-level mixture estimate | LLM-modified text up to 17.5 percent in computer science, up to 6.3 percent in mathematics and Nature portfolio ([arXiv](https://arxiv.org/abs/2404.01268)) |
| Juzek and Ward, COLING 2025 (arXiv 2412.11385, 2024-12-16) | 21 focal words rising in scientific abstracts | Evidence consistent with RLHF causing the over-use; no support for architecture or training data as the cause ([arXiv](https://arxiv.org/abs/2412.11385)) |
| Reinhart et al., PNAS 122 (2025), arXiv 2410.16107 (v2 2025-08-21) | Biber grammatical and rhetorical features, Llama 3 and GPT-4o against human text from shared prompts | Present participial clauses 2 to 5 times the human rate (GPT-4o 5.3 times, d=1.38); nominalizations 1.5 to 2 times (GPT-4o 2.1 times); agentless passive about half the human rate; differences larger in instruction-tuned models; "camaraderie" over 100 times the human rate (162 for GPT-4o) ([arXiv HTML](https://arxiv.org/html/2410.16107v2)) |
| Freeburg, arXiv 2603.27006 (2026-03-27) | Em dashes per 1,000 words in 12 models, about 240,000 words | 0.00 to 10.62 unconstrained; human essays 0.33 to 17.12, weighted mean 3.23 ([arXiv HTML](https://arxiv.org/html/2603.27006)) |
| Wikipedia, "Signs of AI writing" (data as of October 2026) | Editor-compiled taxonomy | Lists "not just X but Y", rule of three, inflated significance, vague attribution, era-grouped vocabulary; states the signs "are descriptive, not prescriptive"; lists the em dash under "historical indicators (2022 to September 2026)" ([Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)) |

Gaps. None of these studies covers READMEs, landing pages or marketing copy. Kobak and Liang measure whole-corpus drift, not a per-document test. Wikipedia's page is an advice page by WikiProject AI Cleanup that "has not been reviewed by the community as policy", and the fetch truncated before the body of the em dash section, so its stated reason for the "historical" label was not read. The same page reports two human-detection figures; both were traced to primary sources on 2026-11-27. (a) 57 percent recognition of AI text and 64 percent of human text is Fiedler and Doepke, "Do humans identify AI-generated text better than machines? Evidence based on excerpts from German theses", International Review of Economics Education vol. 49, 2025 (month not stated on the page), 63 lecturers, excerpts of 200 to 300 words, humans and detectors only slightly above chance ([IDEAS/RePEc](https://ideas.repec.org/a/eee/ireced/v49y2025ics1477388025000131.html), DOI 10.1016/j.iree.2025.100321); independent study. (b) The expert-annotator figure is Russell, Karpinska and Iyyer, ACL 2025, arXiv 2501.15654 (v1 2025-01-26, v2 2025-05-19) ([arXiv](https://arxiv.org/abs/2501.15654)): the 3.3 percent false-positive rate is confirmed in the v2 text for the five experts in experiment 1 ([arXiv HTML](https://arxiv.org/html/2501.15654v2); its Table 1 lists 4.0, so the paper is internally inconsistent), but the paper's prose gives no 90 percent figure for experts (the only 90.0 values are single-annotator table cells), and its headline is that a five-expert majority vote misclassified 1 of 300 articles. Treat Wikipedia's 90 percent as unconfirmed and do not cite it. Both studies concern human readers, not detector tools, and neither covers READMEs or marketing copy.

### 8. Reader-reported tells in 2026 Hacker News comments

Method (failure-corpus.md method, adapted): the Algolia endpoint `https://hn.algolia.com/api/v1/search_by_date` with `tags=comment`, `numericFilters=created_at_i>1767225600` (2026-01-01), `hitsPerPage=100`, over eight phrase queries ("README AI generated", "README LLM written", "README slop", "landing page AI slop", "website copy LLM", "README reads like", "readme claude", "copy written by AI"). `hnq/filter.py` kept 494 comments that mention README, landing page, website or docs together with AI and a perception verb; `hnq/count.py` kept the 284 that name a README, landing page or site as the thing they read and call it AI-written or sloppy (dates 2026-01-16 to 2026-11-27). The sample is a convenience sample of the 800 newest hits, not a census, every comment is an accusation and not a verified fact about authorship, and the regex counts below are lower bounds. Two earlier attempts failed and were rerun: an unencoded `>` returned HTTP 400, and Algolia returned HTTP 403 for roughly ten minutes during the session (undiagnosed, probably rate limiting); the figures here come from the successful rerun of all eight queries.

Tells named in the 284 (a comment can name several):

| Reader-reported theme | Comments | Example (short quote, item id) |
|---|---|---|
| Inference that the author did not care | 57 | "AI-generated README means that the person doesn't care about the audience" ([50235801](https://news.ycombinator.com/item?id=50235801)) |
| Plea for the author's own words, or a human-written README | 21 | "please spend the hour or two it takes to explain what you did ... using your own words" ([50487915](https://news.ycombinator.com/item?id=50487915)) |
| Vague, unmotivated, "so what" or hallucinated claims | 18 | "Almost every paragraph makes me want to ask: so what?" ([50452674](https://news.ycombinator.com/item?id=50452674)) |
| Length, verbosity, "flowery" prose | 13 | "overly verbose and flowery AI slop prose" ([50236923](https://news.ycombinator.com/item?id=50236923)); "as long as a novel" ([49919390](https://news.ycombinator.com/item?id=49919390)) |
| Formatting (bullets, headings, bold) | 12 | emoji-led bullets are "the only place I have ever seen that emoji list style" ([50572645](https://news.ycombinator.com/item?id=50572645)) |
| Emoji | 9 | same item |
| "Not just X, it's Y" shapes | 7 | |
| Em dash named in words ("em dash", "emdash") | 6 | 14 comments contain the character itself, mostly in quoted README text |

Specific copy tells quoted by readers: eyebrow-style section titles "Python, four ways" and "Rust: the web platform, natively" ([50393276](https://news.ycombinator.com/item?id=50393276), 2026-11-06, whose author says the model "has no idea how to write copy"); a paradox line "The caller proves where; the implementation proves ensures" ([50367750](https://news.ycombinator.com/item?id=50367750)); the phrase "load-bearing ground truths" ([50235801](https://news.ycombinator.com/item?id=50235801)); a bare statistic with no comparator, "the campaign runs at 51-60 frames per second", answered with "So what?" ([50452674](https://news.ycombinator.com/item?id=50452674)); a mock-up image that does not match the product ([50383243](https://news.ycombinator.com/item?id=50383243)).

Counter-voices exist: "I care whether the readme is any good, not who wrote it" ([50236676](https://news.ycombinator.com/item?id=50236676)); an author who generated the README "with some extra efforts to avoid the awful ai generated readme" ([49858486](https://news.ycombinator.com/item?id=49858486)); a readme note "this README was written by a human" welcomed as "a pleasure" ([50587192](https://news.ycombinator.com/item?id=50587192)); and one reader citing Pangram's 100 percent score as evidence ([50057564](https://news.ycombinator.com/item?id=50057564)), which is how a detector number enters a thread even where a gate would be wrong. The venue's own rule, in the live [HN guidelines](https://news.ycombinator.com/newsguidelines.html) (fetched 2026-11-27; the page states no date), says "Please don't put generated text in HN posts.", "Write your text yourself" and "Don't post generated text or AI-edited text. HN is for conversation between humans."; a commenter paraphrases the practical line as "Whatever level of AI involvement in your project is fine. But we expect a human summary here, and ideally a human-written README" ([50445243](https://news.ycombinator.com/item?id=50445243)). Venue rules belong to the channels sub-program; noted here only because it bounds what an agent may draft.

Reading: readers react to unspecific claims, length and visible lack of care far more than to punctuation. A lexical warning list therefore targets what authors can fix cheaply, not what readers punish.

### 9. Which markers duplicate DOC-PLAIN rows

| Marker | Owner | Decision |
|---|---|---|
| Em dash, en dash, semicolon, curly quote | DOC-PLAIN-01 (SHOULD, pinned; ban in documentation prose, house style) | Stays there for documentation. Marketing copy gets a density warning (VAI-03) because a landing page is not documentation prose. DOC-PLAIN-01's own measured count (8,462 hits over 229 of 249 pages) shows the fleet docs are saturated, which matches the fleet READMEs here. |
| Tell words (delve, tapestry, testament, myriad, pivotal ...) | DOC-PLAIN-10 (density per 1,000, CONSIDER) | Stays. Pre-2022 rate 0.02 and fleet 0: nothing here argues for change. |
| Superlatives (powerful, seamless, robust ...) | DOC-PLAIN-12 (CONSIDER) | Stays. `powerful` is a 2022 human word (9 hits), so keep it advisory. |
| Chatbot artifacts, AI badges | DOC-PLAIN-08 (MUST) | Stays. |
| Authorship wording in findings | DOC-PLAIN-09 (MUST) | Stays. Note the figure it cites ("a human author at 10.13 em dashes per 1,000 words", Freeburg 2026) was not found in the fetched paper, which reports the human baseline as a weighted mean of 3.23 and a range of 0.33 to 17.12 over eight essays and no per-essay figure; correct the citation or confirm the figure from the paper's text before relying on it. |
| Per-change AI disclosure | DOC-PLAIN-22 (MUST, pinned) | Stays. |
| Time-relative words | DOC-PLAIN-11 | Not a tell; out of scope. |

New, not duplicates: per-document em dash density on marketing surfaces (VAI-03); the baseline-before-warning process rule (VAI-04); the impersonal-register rate (VAI-08).

## Normative guidance candidates

1. VAI-01 (MUST). Never fail a build, block a merge or refuse a publish on an AI-detector score or a style-marker count; style markers exit 0 and print findings. Rationale: detector false-positive rates range from 0 to 100 percent depending on writer and edit (Park et al. 2026), OpenAI withdrew its own classifier, and vendors update silently. Verification: `grep -rniE 'pangram|gptzero|originality|zerogpt|copyleaks|ai[-_ ]?detect' .github/ taskfile.yml Taskfile.yml package.json .pre-commit-config.yaml` returns no hit that sits in a failing step, and `python3 checks/prose.py --root . PATH; echo $?` prints 0 for a file whose only findings are tell-density warnings.
2. VAI-02 (MUST). A marker finding states a count, a rate and the baseline ("4 em dashes in 700 words, 5.7 per 1,000; 2022 READMEs median 0; a human should read this") and never a claim about who wrote the text. Rationale: single-instance accuracy is near chance and the claim is false for human writers. Verification: `grep -nEi '(written|generated|authored|produced|drafted) by (an? )?(ai|llm|chatgpt|gpt|claude|model|machine|bot)|looks? (like )?ai[- ](written|generated)|[0-9]+ ?% (likely |probably )?(ai|machine|human)\b' FINDINGS_FILE` must exit 1 (no match). Tested 2026-11-27: the pass example above exits 1; "This page was written by an LLM. Detector says 87% AI." and "Looks like AI-generated copy." both match. DOC-PLAIN-09 owns the wider check; this line is the local one.
3. VAI-03 (SHOULD, warning only). For a marketing surface that is not documentation prose (landing page, pricing page, email, release notes, social post draft), warn when a document of 300 or more prose words has 3 or more em dashes and a rate of 3.0 or more per 1,000 words. Rationale: pre-2022 README maximum 2.26 and 0 of 26 documents at or above 3.0; the fleet reaches 22.8 and 8 of 10 documents exceed 3.0. Verification: `python3 checks/strip_prose.py PATH | python3 -c 'import sys;t=sys.stdin.read();n=t.count("—");w=len(t.split());print(n,w,round(n/max(w,1)*1000,2))'` and compare against 3.0 when `w >= 300`. Unverified limit: threshold fitted to 36 documents.
4. VAI-04 (SHOULD). Admit a marker to any tell list only with a measured pre-2022 baseline: pooled rate at most 0.30 per 1,000 words and at most 1 triggering document among 26 or more; record the baseline command beside the rule. Rationale: five of the six classic README tells measured here failed or showed nothing, so an unmeasured list produces false positives. Verification: the rule row cites `measure.py` output; reject any row without a baseline figure.
5. VAI-05 (SHOULD). Before enabling VAI-03 for a project that has hand-written marketing text, measure that text and turn the warning off if the project's own human baseline is at or above 3.0 per 1,000 words. Rationale: human essay rates run from 0.33 to 17.12 (Freeburg), so an author with a dash habit would be warned on every page. Verification: `git log --diff-filter=A --before=2022-11-30 --name-only -- '*.md'` lists the project's pre-ChatGPT prose; run the density command over those files.
6. VAI-06 (SHOULD). Do not add emoji, bold-lead bullets, triads, "navigate" or "ensure" to an AI-tell list. Rationale: 2022 human READMEs carry them at 3.47, 0.45, 1.34, 0.23 and 0.33 per 1,000 words. Verification: `grep -nE '(emoji|bold.lead|triad|navigat|ensur)' <tell-list-file>` returns nothing on a list that is advertised as an AI-authorship check.
7. VAI-07 (MUST). Never run text through a humanizer, paraphraser or detector-evasion step, and never record such a step as a fix. Rationale: it is the attack Sadasivan et al. use against detectors, and the Wikipedia guide warns that fixing surface signs hides deeper problems instead of repairing them. Verification: `grep -rniE 'humaniz|undetectab|bypass.{0,12}(detect|gpt)|evade.{0,12}detect' skills rules agents` returns nothing.
8. VAI-08 (CONSIDER). For first-person or second-person surfaces (landing page, email, launch post) warn when contractions plus "you" and "your" together fall below 10 per 1,000 words in a document of 300 or more words. Rationale: pre-2022 READMEs run 28.6 combined and the fleet 8.1; an impersonal register reads as machine output on a surface that talks to a reader. Unverified: the 10 per 1,000 limit is a rounded midpoint between two corpora, not a validated threshold, and genre confounds it. Verification: `python3 checks/strip_prose.py PATH | grep -oiE "\b(you|your|yours|\w+n't|\w+'(re|ve|ll|d|s))\b" | wc -l` divided by prose words.
9. VAI-09 (CONSIDER, unverified: reading heuristic). Reject any numeric claim in a hero or opening paragraph that names no comparator, baseline or consequence. Pass: "starts in 40 ms against 600 ms for the previous version (`hyperfine`, repo `bench/`)". Fail: "the campaign runs at 51 to 60 frames per second" with nothing to compare. Rationale: the "so what" objection (18 of 284 HN comments). No named source tests this rule's effect. Verification (mechanical proxy, tested 2026-11-27; the reading judgement stays with a human): save as `v09.py` and run `python3 -I v09.py PAGE.md`. It takes the first 600 characters after the H1, finds numbers with a unit (`ms`, `s`, `x`, `%`, `fps`, `frames per second`, `MB`, `GB`, ranges such as `51 to 60 fps`) and exits 1 when none of `than|vs|versus|against|compared|baseline|before|previous|faster|slower|fewer|more|less|instead of|from <digit>` appears there; script in the appendix. Run on the pass example it prints `PASS ['40 ms', '600 ms']`; on the fail example it prints `FAIL ['51 to 60 frames per second']` and exits 1. Limit: a comparator word without a real comparator passes.
10. VAI-10 (CONSIDER, unverified: reading heuristic). Check that each section of launch copy contains one fact only the author could supply, such as a measurement with its command, an output pasted from a real run or a stated decision with its reason. Pass: "ran `ocx install` on 14 machines; two failed on musl". Fail: a section made only of generalities that any project in the category could print. No named source tests this rule; it is a reader-side heuristic drawn from the HN complaints and it must not be raised above CONSIDER. Verification (mechanical proxy, tested 2026-11-27): save as `v10.py` and run `python3 -I v10.py LAUNCH.md`. It splits on `## ` headings and exits 1 for every section whose body has no backtick span, no digit and none of `because|decided|chose|so that|instead of`; script in the appendix. On a two-section test file the section "Ran `ocx install` on 14 machines; two failed on musl." passed and "A powerful flexible tool for every team." was listed and exit code 1. The proxy shows a section has a checkable detail; whether the detail is the author's own stays a human reading.
11. VAI-11 (SHOULD). Let a human state in their own words what the project is for, and why it exists, in the first screen of any launch copy; the agent drafts around that sentence and does not write it. Rationale: the top reader demand (21 of 284 comments plus the HN guideline text). Verification: PR body carries a `Human-written lead: yes|no` line, same shape as DOC-PLAIN-22's `AI assistance:` key.

Drop from any candidate list: "the text sounds like AI, therefore rewrite it". The content defects (no comparator, no author fact, length) are the fixable ones; the sound is not.

## Dated facts

| Fact | Source and URL | Date the source states | Source type |
|---|---|---|---|
| Recursive paraphrasing lowers detection across four detector families; watermark spoofing flags human text | [arXiv 2303.11156](https://arxiv.org/abs/2303.11156), TMLR | v1 2023-03-17, v4 2025-01-17 | Peer-reviewed study |
| Detectors misclassify non-native English writing as AI-generated | [arXiv 2304.02819](https://arxiv.org/abs/2304.02819), Patterns | v1 2023-04-06, v3 2023-07-10 | Peer-reviewed study |
| 91 TOEFL essays, 61.22 percent flagged on average, 97 percent by at least one of seven detectors, 19 percent by all seven | [Stanford HAI](https://hai.stanford.edu/news/ai-detectors-biased-against-non-native-english-writers) | 2023-05-15 | University write-up of the study above |
| OpenAI AI Text Classifier: 26 percent of AI text caught, 9 percent of human text flagged; discontinued | [OpenAI](https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/) | Discontinued 2023-07-20 | Vendor (platform itself) |
| 12 detectors easily fooled by attacks, sampling changes and unseen models; 6 million generations | [arXiv 2405.07940](https://arxiv.org/abs/2405.07940), ACL 2024 | v2 2024-06-10 | Peer-reviewed benchmark |
| False-positive rate of 13 detectors on human text: 0.0 to 100.0 percent; 135,389 document pairs | [arXiv 2608.26710](https://arxiv.org/abs/2608.26710) | 2026-08-27 | Independent preprint, EMNLP 2026 |
| Pangram, OriginalityAI, GPTZero near-zero false positives; Pangram only tool meeting an FPR cap of 0.005 | [NBER w34223](https://www.nber.org/papers/w34223) | September 2025 | Independent working paper |
| 0 of 495 false positives for Pangram and GPTZero, 19 of 495 for Originality.ai; style imitation evades 10.1 and 10.8 percent | [Epoch AI](https://epoch.ai/data-insights/ai-detectors-false-negatives) | 2026-07-15 | Independent evaluation |
| At least 13.5 percent of 2024 PubMed abstracts processed with LLMs | [arXiv 2406.07016](https://arxiv.org/abs/2406.07016), Science Advances | 2025-07-02 | Peer-reviewed study |
| LLM-modified text up to 17.5 percent in CS papers, 6.3 percent in mathematics | [arXiv 2404.01268](https://arxiv.org/abs/2404.01268) | 2024-04-01 | Preprint |
| Present participial clauses 5.3 times and nominalizations 2.1 times the human rate in GPT-4o | [arXiv 2410.16107](https://arxiv.org/html/2410.16107v2), PNAS | v2 2025-08-21 | Peer-reviewed study |
| Em dashes per 1,000 words: 0.00 to 10.62 across 12 models; human essays 0.33 to 17.12, mean 3.23 | [arXiv 2603.27006](https://arxiv.org/html/2603.27006) | 2026-03-27 | Independent preprint |
| Wikipedia lists the em dash as a historical indicator (2022 to September 2026) and sentence length of 8 to 20 words for the mid-2026 era | [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | Data as of October 2026 | Community advice page, not policy |
| HN guidelines: "Don't post generated text or AI-edited text. HN is for conversation between humans." | [HN guidelines](https://news.ycombinator.com/newsguidelines.html), live page fetched 2026-11-27 | The page states no date; retrieved 2026-11-27 | Platform itself |
| Human raters 57 percent on AI text, 64 percent on human text; 63 lecturers, 200 to 300 word excerpts | [Fiedler and Doepke, IREE vol. 49](https://ideas.repec.org/a/eee/ireced/v49y2025ics1477388025000131.html) | 2025 (month not stated) | Independent peer-reviewed study |
| Five frequent-LLM-user annotators: false-positive rate 3.3 percent (Table 1 says 4.0); majority vote missed 1 of 300 articles | [arXiv 2501.15654](https://arxiv.org/abs/2501.15654), ACL 2025 | v2 2025-05-19 | Peer-reviewed study |
| Fleet rate 13.51 against pre-2022 0.19 em dashes per 1,000 words | Measured, section 2 | 2026-11-27 | This study |

No vendor data is used for a headline figure except OpenAI's own classifier numbers (platform) and the detector vendors' results inside the independent NBER and Epoch studies.

## What an agent must not decide alone

- Whether to disclose AI involvement on a published surface, and where. This is a brand and legal decision with law that moved in the last 24 months, covered by the sibling disclosure dives. Ask. The agent may state the fact in a pull request body (DOC-PLAIN-22), which is a repository convention and not a public claim.
- Whether to post agent-drafted text on a venue that forbids it (HN: "Don't post generated text"). Ask; the channels sub-program owns the venue rule.
- Whether the project's brand voice is personal or impersonal. VAI-08 only reports a register; the owner decides the voice.
- Whether to enable VAI-03 for a project whose owner writes with dashes by habit. Ask or measure (VAI-05) and report the number.
- Whether to rewrite a non-native author's text to remove "tells". Detectors penalise such writers (Liang et al.), so a rewrite can erase a person's voice. Ask the author.
- Whether to keep or drop a human-written lead (VAI-11). The agent never invents the author's motive or experience.

## AI-agent angle

| Characteristic mistake | Smallest mechanical check |
|---|---|
| Writes spaced em dashes by default in marketing copy (all 12 models tested emit them at 0.00 to 10.62 per 1,000 words unconstrained) | VAI-03 density command; or `grep -c "—" FILE` and divide by prose words |
| Hides the tell by pasting through a "humanizer" and reports the text as clean | VAI-07 grep over agent config |
| Reports a detector percentage as proof of authorship | VAI-02: DOC-PLAIN-09 grep block |
| Treats a lexicon list as a verdict and strips "ensure", "navigate", emoji from human README text | VAI-06 grep over the list file |
| Produces impersonal, rule-voiced copy ("never", "every", no "you") on a landing page | VAI-08 rate |
| States a bare number with no comparator ("51 to 60 frames per second") | VAI-09 reading heuristic |
| Keeps a clean-looking page after the model era changes (em dashes suppressed, new tells appear) | Re-run `measure.py` on fresh pre-2022 and recent corpora each quarter; do not rely on the 2026-11-27 numbers after the next model generation |
| Writes the "why" of the project in the author's voice without the author's facts | VAI-10 reading heuristic; PR body `Human-written lead:` line (VAI-11) |

## Contested / evolving

- Are detectors good enough? Against: Sadasivan et al. (2025-01-17), Liang et al. (2023-07-10), OpenAI (2023-07-20), Park et al. (2026-08-27; 0 to 100 percent false positives under editing), RAID (2024-06-10). For: Jabarian and Imas (NBER, September 2025) and Epoch AI (2026-07-15; 0 of 495 false positives, with 10 percent evasion by style imitation and silent version drift). Resolution here: advisory only, because none of the favourable studies tested short, structured, non-native or tool-edited README and marketing copy. Trend: detector accuracy on plain long prose is rising; the policy answer (never gate) holds until a study on this genre exists.
- Is the em dash still a tell? Wikipedia (data as of October 2026) files it under "historical indicators (2022 to September 2026)". Freeburg (2026-03-27) shows it persists in most instruction-tuned models, can be prompted away in some (Claude Opus 4.6: 9.09 to 0.19 with markdown suppression) and not in others (GPT-4.1: 10.62 to 3.86 even when prohibited), and that human rates span 0.33 to 17.12. This study: the fleet's 13.51 against a 0.19 README baseline is a strong stylistic separation today, so the warning is worth a cheap check, but the marker will decay as models change. Trend: decaying as a discriminator, as of 2026-11.
- Does AI authorship matter to readers at all? "I care whether the readme is any good, not who wrote it" ([50236676](https://news.ycombinator.com/item?id=50236676)) against "I refuse to take a repo with an AI-generated readme seriously" ([50235595](https://news.ycombinator.com/item?id=50235595)). The measured complaints (care, so-what, length) favour judging the content; the HN guideline favours a human voice regardless. Both are 2026 positions.
- Should surface tells be removed at all? Wikipedia warns that "fixing surface features can hide deeper problems", and Reinhart et al. show the differences go deeper than vocabulary (grammatical structure, 2 to 5 times participial clauses). Removing words does not make the text human. Counter: a cheap warning still prompts a reread.
- Disclosure norms: a Show HN reader says "whatever level of AI involvement ... is fine" if a human summary exists ([50445243](https://news.ycombinator.com/item?id=50445243)); another author argues for a README disclaimer; legal duties are out of scope here.

## Sources

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| https://arxiv.org/abs/2303.11156 | Sadasivan et al., "Can AI-Generated Text be Reliably Detected?" (TMLR) | 2023-03-17, v4 2025-01-17 | Theory and attacks that rule out detector gates (primary) |
| https://arxiv.org/abs/2304.02819 | Liang et al., "GPT detectors are biased against non-native English writers" (Patterns) | 2023-04-06, v3 2023-07-10 | Non-native false positives (primary) |
| https://hai.stanford.edu/news/ai-detectors-biased-against-non-native-english-writers | Stanford HAI summary with the 91-essay numbers | 2023-05-15 | Exact counts (secondary to the paper) |
| https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/ | OpenAI classifier page with discontinuation note | 2023-07-20 | The platform's own accuracy figures (primary) |
| https://arxiv.org/abs/2405.07940 | RAID benchmark, ACL 2024 | 2024-06-10 | Adversarial robustness of 12 detectors (primary) |
| https://arxiv.org/abs/2608.26710 | Park, Jeong, Kim, "Style as a Confound" | 2026-08-27 | 2026 false positives under editing (primary, preprint) |
| https://www.nber.org/papers/w34223 | Jabarian and Imas, "Artificial Writing and Automated Detection" | September 2025 | Strongest counter-evidence on detectors (primary) |
| https://epoch.ai/data-insights/ai-detectors-false-negatives | Epoch AI detector evaluation | 2026-07-15 | Current false-positive and evasion rates (primary measurement) |
| https://arxiv.org/abs/2406.07016 | Kobak et al., excess vocabulary (Science Advances) | 2025-07-02 | Largest marker-frequency study (primary) |
| https://arxiv.org/abs/2404.01268 | Liang et al., mapping LLM use in papers | 2024-04-01 | Corpus-level LLM share (primary, preprint) |
| https://arxiv.org/abs/2412.11385 | Juzek and Ward, "Why does ChatGPT delve so much?" (COLING 2025) | 2024-12-16 | RLHF as the likely cause of word over-use (primary) |
| https://arxiv.org/html/2410.16107v2 | Reinhart et al., "Do LLMs write like humans?" (PNAS) | 2025-08-21 | Grammatical feature multipliers (primary) |
| https://arxiv.org/html/2603.27006 | Freeburg, "The Last Fingerprint" | 2026-03-27 | Em dash rates by model and human baseline (primary, preprint) |
| https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing | WikiProject AI Cleanup taxonomy | Data as of October 2026 | The only broad published ancestor of the tell lists; not policy |
| https://news.ycombinator.com/newsguidelines.html | HN guidelines (live fetch) | Undated; retrieved 2026-11-27 | Platform rule on generated text (primary) |
| https://hn.algolia.com/api/v1/search_by_date | HN comment search used for the reader-reported tells | Queried 2026-11-27 | Method in section 8 (primary data, convenience sample) |
| `product-audit/exemplar-readmes.md`, `marketing-topic-map/failure-corpus.md` | Local grounding audits | 2026-11-27 | Sample list, 66-of-100 method |

Could not be sourced: the body of Wikipedia's em dash section (the fetch truncated before it), and the 90 percent expert true-positive figure (the primary paper's prose does not contain it; the 57/64 and 3.3 percent figures were traced). Central question was sourced; blocked = false.

## Appendix: commands and scripts

All commands run from `~/.cache/research-lang/exemplars/product/voice-baseline`.

```sh
# corpus
cat repos.txt | xargs -P 8 -n1 ./clone.sh                       # bare blobless clones, 40 repos
cat repos.txt | xargs -P6 -n1 ./extract.sh | sort > extract.log  # pre/ (36 files) and head/ (40 files)
grep NOPRE extract.log                                          # 4 repos with no pre-2022 README
# measurement
python3 -I measure.py | tee summary.txt                         # section 2 table
python3 -I explore.py                                           # section 5 feature rates
python3 -I post.py                                              # post hoc density sensitivity
python3 -I len.py                                               # corpus word counts
# fleet label check (per repo)
git -C $p log --format='%H%n%B' -- README.md | grep -ciE 'co-authored-by:.*(claude|anthropic|copilot|codex)|generated with'
# HN reader-reported tells
curl -sG -A "research-lang/1.0" "https://hn.algolia.com/api/v1/search_by_date" --data-urlencode "query=README AI generated" \
  --data-urlencode "tags=comment" --data-urlencode "numericFilters=created_at_i>1767225600" --data-urlencode "hitsPerPage=100"
python3 -I hnq/count.py
```

`clone.sh`:

```sh
#!/bin/bash
r=$1; d=clones/$(echo $r | tr / _)
[ -d $d ] || git clone -q --bare --filter=blob:none https://github.com/$r.git $d 2>&1 | tail -1
```

`extract.sh`:

```sh
#!/bin/bash
# per repo: README at HEAD, and at the last commit (on HEAD history) before 2022-11-30
r=$1; n=$(echo $r | tr / _); g=clones/$n
c=$(git -C $g rev-list -1 --before=2022-11-30T00:00:00Z HEAD)
h=$(git -C $g rev-parse HEAD)
pick(){ git -C $g ls-tree --name-only $1 | grep -iE '^readme(\.(md|markdown|rst|txt))?$' | head -1; }
hn=$(pick $h); [ -n "$hn" ] && git -C $g show $h:"$hn" > head/$n.txt
if [ -n "$c" ]; then pn=$(pick $c); [ -n "$pn" ] && git -C $g show $c:"$pn" > pre/$n.txt && echo "$r $c $(git -C $g log -1 --format=%cs $c) $pn"; else echo "$r NOPRE"; fi
```

`PREREG.txt` (written before computing):

```text
PRE-REGISTRATION, written before any marker rate was computed (2026-11-27).
Corpora: PRE = last-commit-before-2022-11-30 README of upstream repos that have one (36 of 40);
HEAD = upstream HEAD READMEs (40); FLEET = the 18 fleet READMEs. Words = whitespace tokens of
prose stripped by skills/docs-quality-reference/checks/strip_prose.py (DOC-PLAIN-04). Rate = hits per 1,000 words.
Document-level trigger T: >= 3 hits AND rate >= 1.0 per 1,000 words, only for documents with >= 300 prose words.
Marker QUALIFIES for the warning list iff all three hold:
  Q1 PRE pooled rate <= 0.30 per 1,000 words;
  Q2 at most 1 of the PRE documents (>= 300 words) meets trigger T (false-positive bound, about 3-5 percent);
  Q3 FLEET pooled rate >= max(1.0, 3 x PRE pooled rate) per 1,000 words AND >= 3 FLEET documents meet T.
A marker passing Q1 and Q2 but failing Q3 is WATCH (safe but not discriminating here). Failing Q1 or Q2 is REJECTED.
Caveat fixed in advance: FLEET is not labelled by authorship. Q3 shows a marker separates the fleet style from a
pre-LLM baseline, not that the fleet text is machine-written.
```

`measure.py`:

```python
import importlib.util, re, glob, json, os, sys
s=importlib.util.spec_from_file_location("sp","/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/docs-quality-reference/checks/strip_prose.py")
sp=importlib.util.module_from_spec(s); s.loader.exec_module(sp)
EMOJI=re.compile("[\U0001F300-\U0001FAFF☀-➿⭐✅❌✨]")
def outside_fences(t):
    out=[];f=None
    for l in t.split("\n"):
        m=re.match(r"^\s*(`{3,}|~{3,})",l)
        if m:
            f=None if f else m.group(1); continue
        if not f: out.append(l)
    return "\n".join(out)
SUPER="powerful|seamless\w*|revolutionary|game-chang\w*|supercharg\w*|unlock\w*|empower\w*|cutting-edge|robust\w*|effortless\w*"
TELL="delves?|delving|tapestry|testament|boast\w*|myriad|plethora|furthermore|moreover|paramount|pivotal|invaluable|intricate"
LEX={"leverag*":r"leverag\w*","streamlin*":r"streamlin\w*","elevat*":r"elevat\w*","tailored":r"tailored","holistic":r"holistic\w*","comprehensive":r"comprehensive\w*",
 "whether you":r"whether you(?:'re| are)?\b","in today's":r"in today's","worth noting":r"worth noting|it'?s important to note","at its core":r"at its core","dive into":r"dive into|deep dive","navigat*":r"navigat\w*","landscape":r"landscape","journey":r"journey","crafted":r"crafted|meticulous\w*","ensur*":r"ensur(?:e|es|ed|ing)\b","seamless*":r"seamless\w*","robust*":r"robust\w*","powerful":r"powerful","unlock*":r"unlock\w*","empower*":r"empower\w*","effortless*":r"effortless\w*","game-chang*":r"game-chang\w*"}
MARK={
 "em_dash":lambda raw,pr: len(re.findall("—",pr)),
 "em_dash_nonlist":lambda raw,pr: sum(l.count("—") for l in pr.split("\n") if not re.match(r"^\s*(?:[-*+]|\d+[.)])\s",l)),
 "contrast_not_just_but":lambda raw,pr: len(re.findall(r"\bnot (?:just|only|merely|simply)\b[^.!?\n]{1,80}?\bbut\b",pr,re.I)),
 "contrast_isnt_its":lambda raw,pr: len(re.findall(r"\b(?:isn't|is not|aren't|are not|doesn't|does not|don't|not)\b[^.!?\n]{1,60}?(?:[.;,:]|—|--) ?(?:it's|it is|they're|they are|rather|instead|this is)\b",pr,re.I)),
 "contrast_not_x_but_y":lambda raw,pr: len(re.findall(r"\bnot (?!just|only|merely|simply)[^,.;!?\n]{1,40} but (?!also)\w",pr,re.I)),
 "triad_1word":lambda raw,pr: len(re.findall(r"\b[A-Za-z-]{3,}, [A-Za-z-]{3,},? (?:and|or) [A-Za-z-]{3,}\b",pr)),
 "anaphoric_no":lambda raw,pr: len(re.findall(r"(?:^|[.!?] |\n)(?:No|Zero|Never) [^.!?\n]{1,40}[.!?] (?:No|Zero|Never) ",pr)),
 "doc_plain_12_superl":lambda raw,pr: len(re.findall(r"\b(?:%s)\b"%SUPER,pr,re.I)),
 "doc_plain_10_tells":lambda raw,pr: len(re.findall(r"\b(?:%s)\b"%TELL,pr,re.I)),
 "emoji":lambda raw,pr: len(EMOJI.findall(outside_fences(raw))),
 "bold_lead_bullet":lambda raw,pr: len(re.findall(r"^\s*(?:[-*+]|\d+[.)]) \*\*[^*\n]+?\*\*\s*(?::|—|–| -)",outside_fences(raw),re.M)),
}
for k,v in LEX.items(): MARK["lex:"+k]=(lambda v: lambda raw,pr: len(re.findall(r"\b(?:%s)"%v,pr,re.I)))(v)
MARK["lex_combined(no ensur/robust/seamless/powerful/unlock/empower/effortless/gamechang)"]=lambda raw,pr: sum(len(re.findall(r"\b(?:%s)"%LEX[k],pr,re.I)) for k in ["leverag*","streamlin*","elevat*","tailored","holistic","comprehensive","whether you","in today's","worth noting","at its core","dive into","navigat*","landscape","journey","crafted"])
def doc(path):
    raw=open(path,errors="replace").read(); pr=sp.strip(raw)
    words=len(pr.split())
    return {k:f(raw,pr) for k,f in MARK.items()}, words
corp={"PRE":sorted(glob.glob("pre/*.txt")),"HEAD":sorted(glob.glob("head/*.txt")),"FLEET":sorted(glob.glob("fleet/*.txt"))}
res={}
for c,fs in corp.items():
    res[c]={os.path.basename(f):doc(f) for f in fs}
json.dump(res,open("results.json","w"))
def summ(c,k):
    d=res[c]; W=sum(w for _,w in d.values()); H=sum(h[k] for h,_ in d.values())
    big=[(h[k],w) for h,w in d.values() if w>=300]
    trig=sum(1 for h,w in big if h>=3 and h/w*1000>=1.0)
    return H,W,(H/W*1000 if W else 0),trig,len(big)
print("corpus docs/words:",{c:(len(res[c]),sum(w for _,w in res[c].values()),sum(1 for _,w in res[c].values() if w>=300)) for c in res})
print("%-60s | %s"%("marker","PRE hits rate trig | HEAD hits rate trig | FLEET hits rate trig | verdict"))
for k in MARK:
    p=summ("PRE",k);h=summ("HEAD",k);f=summ("FLEET",k)
    q1=p[2]<=0.30; q2=p[3]<=1; q3=f[2]>=max(1.0,3*p[2]) and f[3]>=3
    v="QUALIFIES" if q1 and q2 and q3 else ("WATCH" if q1 and q2 else "REJECTED")
    print("%-60s | %4d %5.2f %2d/%d | %4d %5.2f %2d/%d | %4d %5.2f %2d/%d | %s"%(k[:60],p[0],p[2],p[3],p[4],h[0],h[2],h[3],h[4],f[0],f[2],f[3],f[4],v))
```

`post.py`:

```python
import importlib.util,re,glob
s=importlib.util.spec_from_file_location("sp","/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/docs-quality-reference/checks/strip_prose.py")
sp=importlib.util.module_from_spec(s); s.loader.exec_module(sp)
F={"semicolon":(r";",0),"x_comma_not_y":(r"\b\w+, not \w+\b",re.I),"never":(r"\bnever\b",re.I),"every":(r"\bevery\b",re.I),"rather_than":(r"\brather than\b",re.I),"arrow":("[→←⇒]",0),"em_dash":("—",0),"em_dash_or_semicolon":("[—;]",0)}
def load(g): return [sp.strip(open(f,errors="replace").read()) for f in sorted(glob.glob(g))]
C={"PRE":load("pre/*.txt"),"HEAD":load("head/*.txt"),"FLEET":load("fleet/*.txt")}
for k,(r,fl) in F.items():
    row=[]
    for c,v in C.items():
        W=sum(len(p.split()) for p in v); H=sum(len(re.findall(r,p,fl)) for p in v)
        big=[p for p in v if len(p.split())>=300]
        trig=sum(1 for p in big if (n:=len(re.findall(r,p,fl)))>=3 and n/len(p.split())*1000>=1.0)
        mx=max((len(re.findall(r,p,fl))/len(p.split())*1000 for p in big),default=0)
        row.append("%s %d hits %.2f/1k trig %d/%d maxdoc %.1f"%(c,H,H/W*1000,trig,len(big),mx))
    print("%-22s | "%k+" | ".join(row))
# em dash doc-level at rate>=3.0 (post hoc)
for c,v in C.items():
    big=[p for p in v if len(p.split())>=300]
    print(c,"docs>=300w with em dash rate>=3.0:",sum(1 for p in big if p.count("—")/len(p.split())*1000>=3.0),"/",len(big))
```

`v09.py` (VAI-09 proxy):

```python
import re,sys
t=open(sys.argv[1]).read()
t=re.sub(r"^---.*?---\n","",t,flags=re.S)
m=re.search(r"^# .*?\n",t,re.M)
first=" ".join(t[m.end():].split())[:600] if m else " ".join(t.split())[:600]
num=re.findall(r"\b\d[\d,.]*\s?(?:ms|s|x|×|%|fps|frames per second|MB|GB|k|times)\b|\b\d[\d,.]*\s?(?:to|-)\s?\d[\d,.]*\s?(?:ms|s|fps|frames per second|%)",first)
cmp=re.search(r"\b(than|vs\.?|versus|against|compared|baseline|before|previous|faster|slower|fewer|more|less|instead of|from \d)",first,re.I)
print(("FAIL" if num and not cmp else "PASS"),num)
sys.exit(1 if num and not cmp else 0)
```

`v10.py` (VAI-10 proxy):

```python
import re,sys
t=open(sys.argv[1]).read()
bad=[]
for s in re.split(r"^## ",t,flags=re.M)[1:]:
    h,_,b=s.partition("\n")
    if not re.search(r"`[^`\n]+`|\b\d+\b|\b(because|decided|chose|so that|instead of)\b",b,re.I): bad.append(h)
print("sections without author-fact proxy:",bad); sys.exit(1 if bad else 0)
```
