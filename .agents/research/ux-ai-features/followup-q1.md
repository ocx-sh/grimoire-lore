---
title: "Follow-up q1: is a chat model's stated confidence calibrated (UX-AI-15)?"
program: product
topic: ux-ai-features
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Follow-up q1: is a chat model's stated confidence calibrated?

## Answer

Yes, there are fetched studies, and they do not agree. Verbalized confidence from chat models is sometimes better calibrated than token probabilities, is usually overconfident in absolute terms, and moves with the elicitation protocol, the model and the tuning. No fetched study shows that a number a product displays is calibrated for that product's own answers. The evidence does not support returning UX-AI-15 to MUST. It supports keeping SHOULD and replacing the rationale and verification with a checkable condition: show a number only after the owner has measured calibration on the product's own data, and re-measure after every model or prompt change.

Scope of the reading: the five arXiv abstract pages were fetched in full with curl and the abstract text extracted from the page's own `citation_abstract` meta tag. The PDFs were not read. Every claim below is limited to the abstract text, which is quoted in the trace.

## Measurement trace

Fetch, command and output (scratch directory `~/.cache/research-lang/exemplars/product/wave2/ux-ai-q1/`, raw HTML kept there as `<id>.html`):

```
for id in 2305.14975 2306.13063 2606.03437 2605.27752 2607.20526; do curl -sL -A "research-client" -o $id.html "https://arxiv.org/abs/$id"; echo "$id $(wc -c < $id.html)"; done
2305.14975 42273
2306.13063 43863
2606.03437 40587
2605.27752 41660
2607.20526 41736
```

Extraction (python3 -I, regex on `citation_title`, `citation_date`, `citation_online_date`, `citation_abstract` and the "Submitted on" line). Raw output, abstracts verbatim, per paper:

**2305.14975** (title "Just Ask for Calibration: Strategies for Eliciting Calibrated Confidence Scores from Language Models Fine-Tuned with Human Feedback"; citation_date 2023/05/24; online 2023/10/24; "[Submitted on 24 May 2023 (v1), last revised 24 Oct 2023 (this version, v2)]"; page contains the string "EMNLP 2023 Camera Ready"):
"...For RLHF-LMs such as ChatGPT, GPT-4, and Claude, we find that verbalized confidences emitted as output tokens are typically better-calibrated than the model's conditional probabilities on the TriviaQA, SciQ, and TruthfulQA benchmarks, often reducing the expected calibration error by a relative 50%."

**2306.13063** (title "Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs"; 2023/06/22; online 2024/03/17; "[Submitted on 22 Jun 2023 (v1), last revised 17 Mar 2024 (this version, v2)]"; page contains "ICLR 2024. The code is publicly available at"):
"...five widely-used LLMs including GPT-4 and LLaMA 2 Chat. ... 1) LLMs, when verbalizing their confidence, tend to be overconfident, potentially imitating human patterns of expressing confidence. 2) As model capability scales up, both calibration and failure prediction performance improve. ... 4) Comparisons with white-box methods indicate that while white-box methods perform better, the gap is narrow, e.g., 0.522 to 0.605 in AUROC. Despite these advancements, none of these techniques consistently outperform others, and all investigated methods struggle in challenging tasks, such as those requiring professional knowledge..."

**2606.03437** (title "Large Language Models Are Overconfident in Their Own Responses"; 2026/06/02; "[Submitted on 2 Jun 2026]"; page contains "ACL 2026 Findings"):
"...while instruction tuning fundamentally harms calibration, the chat template aggravates the issue through an 'ownership bias' -- models are significantly more confident in their own answers than in identical answers provided by a user. Extensive experiments across six recent open-weight LLMs, three benchmarks, and three confidence elicitation methods show that models assign up to 26% higher confidence to their own responses. ... framing the model's answer as user input during confidence elicitation. This approach significantly reduces overconfidence and improves calibration by up to 26%..."

**2605.27752** (title "Same Answer, Different Confidence: Protocol Sensitivity in LLM Confidence Calibration"; 2026/05/26; online 2026/10/23; "[Submitted on 26 May 2026 (v1), last revised 23 Oct 2026 (this version, v4)]"; no venue string found on the page, so treat as preprint):
"Across five open LLMs and four question-answering datasets, we fix each answer, its verbalized confidence, and its correctness label, and vary how each score is measured. The scores themselves change with the protocol, and so does the comparison between them. Changing the context in which the token probability is read shifts the gap between the two scores by about the size of the gap itself (.287 vs. .304 in expected calibration error, ECE; .189 vs. .145 in AUROC). ... The better score flips in 8 settings under each metric... Most of the shift appears with changes to the instruction, not to the position of the answer. ... stated confidence depends on how a supplied answer is written. We turn these results into a reporting checklist for LLM confidence and its comparisons."

**2607.20526** (title "ConfidenceBench: Evaluating Confidence Calibration in Large Language Models"; 2026/07/10; "[Submitted on 10 Jul 2026]"; no venue string found, preprint):
"...evaluates verbalized confidence estimates in 15 frontier LLMs using the Brier score... The benchmark comprises 200 private multiple-choice questions across four categories: spatial reasoning, high-precision mathematics, word lookup, and unknowable questions. Across three independent runs, Claude Opus 4.6 and Gemini 3.1 Pro Preview achieve the lowest Brier scores, both reported as 0.103. Both substantially outperform the calibrated-random baseline of 0.1875, while Gemini 3.1 Flash-Lite scores 0.367, indicating severe miscalibration. ... the most accurate model is not the best-calibrated, and several models perform worse than the calibrated-random Brier baseline despite reasonable accuracy."

One correction to the first version: the "about 50%" is Tian's own words, "often reducing ... by a relative 50%". The AUROC 0.522 to 0.605 is quoted from the abstract as the size of the white-box gap, and the abstract does not say which comparison each end of the range is. Treat it as the abstract's wording only.

## Findings

| # | Study | Date | What it says (abstract text) | Direction |
|---|---|---|---|---|
| 1 | Tian et al., [arXiv 2305.14975](https://arxiv.org/abs/2305.14975), EMNLP 2023 (camera-ready string on page) | v1 24 May 2023, v2 24 Oct 2023 | ChatGPT, GPT-4, Claude: verbalized confidence typically better calibrated than conditional probabilities; ECE often cut by a relative 50% on TriviaQA, SciQ, TruthfulQA. No absolute ECE on the page. | For, relative to token probabilities only |
| 2 | Xiong et al., [arXiv 2306.13063](https://arxiv.org/abs/2306.13063), ICLR 2024 (string on page) | v1 22 Jun 2023, v2 17 Mar 2024 | Verbalized confidence tends to be overconfident; improves with scale; no technique wins consistently; all struggle on professional-knowledge tasks. | Against, absolute |
| 3 | Sanz-Guerrero et al., [arXiv 2606.03437](https://arxiv.org/abs/2606.03437), ACL 2026 Findings (string on page) | 2 Jun 2026 | Six open-weight LLMs: instruction tuning harms calibration; chat template adds ownership bias, up to 26% higher confidence in own answers; reframing fix improves calibration by up to 26%. | Against, specific to chat-tuned models |
| 4 | Kim and Kang, [arXiv 2605.27752](https://arxiv.org/abs/2605.27752), preprint | v1 26 May 2026, v4 23 Oct 2026 | Five open LLMs, four QA datasets: scores and the comparison between them change with protocol (ECE gap .287 vs .304); stated confidence depends on how the answer is written. | Protocol sensitivity |
| 5 | ffrench-Constant et al., [arXiv 2607.20526](https://arxiv.org/abs/2607.20526), preprint | 10 Jul 2026 | 15 frontier LLMs, 200 private multiple-choice questions: Brier 0.103 (Claude Opus 4.6, Gemini 3.1 Pro Preview) vs 0.367 (Gemini 3.1 Flash-Lite); baseline 0.1875; several models worse than baseline. | Mixed, depends on model |
| 6 | PAIR Guidebook, Explainability + Trust, section "Determine if you should show confidence" ([page](https://pair.withgoogle.com/chapter/explainability-trust/), Google, vendor guidance, page carries no date; retrieved 2026-11-27) | undated | See quote below. Guidance, not a measurement. | For gating display on user testing |

Study 6 raw trace (command: `curl -sL --compressed -A "research-client" "https://pair.withgoogle.com/chapter/explainability-trust/" -o pair-et.html -w "%{http_code} %{size_download}\n"` returned `200 65845`; text extracted after stripping script and style):
"It's not easy to make model confidence intuitive. ... There's always a risk that confidence displays will be distracting, or worse, misinterpreted. Be sure to set aside lots of time to test if showing model confidence is beneficial for your users and your product or feature. You might choose not to indicate model confidence if: The confidence level isn't impactful. ... Counterintuitively, showing more granular confidence can be confusing if the impact isn't clear — what should I do when the system is 85.8% certain vs. 87% certain? Showing confidence could create mistrust. ... A misleadingly high confidence, for example, may cause users to blindly accept a result." And for categorical displays: "Clearly indicate what action a user should take under each category of confidence."

This replaces the first version's unsourced sentence "numbers mislead without context", which was not in any fetched source and is withdrawn. What PAIR does say is narrower: confidence can be misinterpreted, granular numbers can confuse when the action is unclear, test before showing, and attach an action to each category.

What this means for a product:

- Calibration belongs to one model, one prompt protocol and one task distribution (studies 1 to 5).
- Rewording the instruction moves the score (study 4), so a silent prompt or model change changes what the displayed number means.
- Every study uses question-answering benchmarks with a gold label. None measures open-ended chat, coding-agent or retrieval-augmented answers.
- None tests whether showing the number improves user decisions. PAIR says to test that.

## Effect on the ruleset

### UX-AI-15: change (stays SHOULD, no return to MUST)

Reason: the MUST rested on "no evidence of calibration". Evidence exists, it is mixed, and it is model- and protocol-specific, so a MUST cannot rest on it.

New text:

> Do not display an LLM's self-reported certainty as a number, percentage or probability, unless the owner has a recorded calibration measurement for this exact model, prompt and task type (reliability diagram, ECE or Brier score on at least the product's own labelled sample), re-run on every model or prompt change. Show a categorical confidence label only if it maps to a defined action ("Check the source before using this") and the owner has a recorded user test showing it improves decisions. Otherwise show none.

Rationale: DESIGN. Fetched studies disagree (studies 1 to 5 above). No study measured confidence on product answers or its effect on user decisions. Vendor guidance ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/), undated) says to test before showing and to attach an action to each category.

Severity: SHOULD.

Verification (run on the repository under review; every command below was run on a scratch repository, trace follows):

1. Display check: `grep -rnE "confidence|certainty|probability" src | grep -E "%|toFixed|percent|\* ?100|Math\.round"`. No output means pass. Any hit goes to step 2.
2. Record exists: `git grep -il "calibration" -- docs adr .agents` must list a file, and `git grep -nE "model:.*prompt:.*n=[0-9]+.*(Brier|ECE)=" -- docs adr .agents` must match a line naming model id, prompt, sample size and metric. (The record format `model: ...; prompt: ...; n=...; Brier=...` is part of the rule's convention.)
3. Record is fresh: `git merge-base --is-ancestor <last commit touching the model id or prompt file> <last commit touching the record>`, exit 0 means the record is newer than the last model or prompt change, exit 1 means stale and the hit fails.
4. Categorical label: `git grep -il "confidence label" -- docs adr .agents` must list a user-test record.

Scratch-repository run (`~/.cache/research-lang/exemplars/product/wave2/ux-ai-q1/fixture`, `git init` there only; one file `src/Answer.tsx` renders `Math.round(a.confidence * 100)`):

```
--- run 1: no calibration record
src/Answer.tsx:1:export const Answer = ({a}) => <p>{a.text} <span>Confidence: {Math.round(a.confidence * 100)}%</span></p>;
exit=0                      # step 1 hits
record-grep exit=1          # step 2: no record -> FAIL

--- run 2: record docs/calibration-2026-11-27.md committed
src/Answer.tsx:1:... (same hit)
docs/calibration-2026-11-27.md
record-grep exit=0          # step 2a passes
docs/calibration-2026-11-27.md:2:model: claude-opus-4-6; prompt: src/prompts/answer.txt sha256 ab12; n=300 labelled; Brier=0.11; date 2026-11-27
fields-grep exit=0          # step 2b passes

--- run 3: model config changed after the record (commit swap2)
stale case exit=1 (1=stale) # step 3: FAIL
--- fresh case (model commit older than record)
model-commit-ancestor-of-record exit=0 (0=record fresh, 1=stale)
```

A defect found by running it: the first draft of the record contained no word "calibration" in its body (the filename does not count for `git grep -l`), and step 2a returned exit 1 although a record existed. The record format therefore must carry a heading `# Calibration record`, as in run 2. The check verifies that an owner-written record exists, names the fields and is newer than the last model or prompt change. It cannot verify that the measurement is honest or that the sample is representative; that stays a reviewer judgement.

### UX-AI-15 promotion trigger (review note, not a rule)

Not a new rule. Recorded as a review trigger in the Decay table. Check: re-run `WebSearch` for peer-reviewed studies of verbalized confidence on open-ended or retrieval-augmented answers from current frontier chat models, and fetch each hit's abstract as above. Promote to MUST only if such a study shows miscalibration across current frontier chat models. Today studies 2 and 3 point that way for older or open-weight models, and study 5 (preprint) contradicts it for the two best models.

### C8 and Decay rows (edits to the consolidation document, not rules)

- C8: append "Wave 2 (2026-11-27): five arXiv abstracts and the PAIR confidence guidance fetched, direction mixed; SHOULD confirmed."
- Decay, UX-AI-14/-16/-17 row: add UX-AI-15, sources studies 1 to 6, refresh when a study covers open-ended chat or after a new frontier model generation.
- Check after editing: `grep -nE "UX-AI-15" .agents/research/ux-ai-features.md | grep -E "Wave 2|Decay"` returns the two lines.

### NEW rule: none

A "never feed model self-reports into an automated decision" rule belongs to a different topic and has no fetched basis here.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Verbalized confidence ECE often reduced by a relative 50% vs conditional probabilities (ChatGPT, GPT-4, Claude) | [arXiv 2305.14975](https://arxiv.org/abs/2305.14975), EMNLP 2023 | 24 May 2023, revised 24 Oct 2023 |
| Verbalized confidence tends to be overconfident; white-box gap "0.522 to 0.605 in AUROC" | [arXiv 2306.13063](https://arxiv.org/abs/2306.13063), ICLR 2024 | 22 Jun 2023, revised 17 Mar 2024 |
| Up to 26% higher confidence in own answers; instruction tuning harms calibration | [arXiv 2606.03437](https://arxiv.org/abs/2606.03437), ACL 2026 Findings | 2 Jun 2026 |
| Scores depend on protocol and on how the answer is written; ECE gap .287 vs .304 | [arXiv 2605.27752](https://arxiv.org/abs/2605.27752), preprint | 26 May 2026, v4 23 Oct 2026 |
| Brier 0.103 (Claude Opus 4.6, Gemini 3.1 Pro Preview) vs 0.367 (Gemini 3.1 Flash-Lite); baseline 0.1875 | [arXiv 2607.20526](https://arxiv.org/abs/2607.20526), preprint | 10 Jul 2026 |
| Test whether showing confidence helps; attach an action to each category; granular numbers can confuse (vendor guidance) | [PAIR Guidebook](https://pair.withgoogle.com/chapter/explainability-trust/) | undated, retrieved 2026-11-27 |

## What could not be determined

- Full-text methods and absolute ECE values for studies 1, 3 and 4: only abstract pages were fetched. Missing: the PDFs read in full.
- Venue status for studies 4 and 5: no venue string on the pages, so they are treated as preprints. The venues of studies 1 to 3 rest on strings found on the arXiv pages, not on the proceedings sites.
- Model names in studies 2, 3 and 4, and the Claude versions in study 1: not on the abstract pages.
- Whether any peer-reviewed study measures verbalized confidence on open-ended, retrieval-augmented or coding answers, or whether showing the number changes user decisions. One search round earlier found none; this repair pass ran no new search.
- The PAIR page carries no publication date, so its currency cannot be stated.
