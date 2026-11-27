---
title: "UX-VERIFY: evidence classes, forbidden claims and findings-report shape"
program: product
sub_program: ux
topic: ux-verification-claims
worker: evidence-and-claims
date_researched: 2026-11-27
model: sonnet
sources_fetched: 29
scope: "What an agent may assert after reviewing an interface change (accessibility, usability, performance), how it labels evidence, and what a findings report carries. Not covered: which commands to run per change type (sibling workers of ux-verification-claims), marketing-copy statistics (named to marketing), legal accessibility statements (named as human decisions)."
---

# UX-VERIFY: evidence classes, forbidden claims and findings-report shape

Contents: [Summary](#summary) · [Measurement: seeded answer key](#1-measurement-seeded-answer-key-n20-defects-in-2-files) · [Findings](#findings) · [Normative guidance candidates](#normative-guidance-candidates) · [Dated facts](#dated-facts) · [What an agent must not decide alone](#what-an-agent-must-not-decide-alone) · [AI-agent angle](#ai-agent-angle) · [Contested / evolving](#contested--evolving) · [Sources](#sources)

## Summary

- An agent's review output has four evidence classes, and the class fixes the verb it may use: measured ("axe 4.14.1 reported N violations"), rendered-checked ("in Chromium at 320 px the control is 22x22 px"), code-read ("the source shows"), inferred ("likely", "predicted").
- "Accessible", "WCAG compliant", "AA conformant", "passes accessibility" and "users will/found" are forbidden in agent output. W3C says a conformance claim needs scope, date, WCAG version, level and the accessibility-supported technologies, and WCAG-EM 2 says a sampled evaluation alone usually does not allow a claim ([WCAG-EM 2](https://www.w3.org/TR/wcag-em-2/), 2026-07-23).
- Automated rules catch only part of the problem. Independent GDS audit, 2018-04-13: best of 13 tools found 40% of 142 seeded barriers ([GDS audit](https://alphagov.github.io/accessibility-tool-audit/)). Vendor data (Deque, 2021-03-10): 57% of issues by volume ([Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/)). Both numbers count different things; neither is a coverage claim for a given page.
- Measured here (n=20 seeded defects in 2 files, labelled as such): axe 4.14.1 in Chromium found 10 of 10 defects chosen as axe-detectable and 0 of the 10 chosen as not detectable, identically in 3 runs. An unaided LLM code-read found 58 of 60 defect instances across 6 runs, including 30 of 30 of the non-axe class, but also emitted 44 findings outside the key (128 findings in total), of which 30 were unsupported by the source (5 to 7 in each of 5 runs, 1 in the sixth).
- So an LLM review adds recall on judgement-class defects and adds noise. Both facts shape the report: every finding quotes the source verbatim, carries an evidence class and one criterion ID checked against the WCAG 2.2 list, and speculative items go to a separate review queue.
- WCAG 2.2 has 86 success criteria; 4.1.1 Parsing is removed ([WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2024-12-12). An ID not in that list is rejected mechanically. In 6 LLM runs no ID failed this check, but 3 findings used an SC different from the key's (defensible), so the whitelist is necessary and not sufficient.
- A "needs human review" item carries: criterion ID, element locator, what the agent saw, what it could not test and why, the exact manual steps and the tool/AT combination, the expected result, and who decides.
- Heuristic findings are predictions. NN/g: three to five independent evaluators; a violation "does not necessarily mean it's a problem"; heuristic evaluation "cannot replace user research" ([NN/g, 2023-06-25](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)). An agent review is one evaluator and says so.
- Two studies of LLM heuristic evaluation disagree (21.2% overlap with experts per [arXiv 2506.16345](https://arxiv.org/abs/2506.16345), 2025-06-19, versus 73-77% issue coverage per [arXiv 2507.02306](https://arxiv.org/html/2507.02306v1), 2025-07-03), and the second built its ground truth partly from the model's own output. The report must carry model, prompt basis and "single evaluator" instead of a coverage claim.
- Synthetic users: hypotheses, desk research, piloting a guide. Never validation, never presented as real-user findings ([NN/g, 2024-06-21](https://www.nngroup.com/articles/synthetic-users/)). Output collapsed from 50+ labels (604 humans) to about a dozen (120 synthetic) ([NN/g, 2026-10-16](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/)).
- A Lighthouse accessibility score is a weighted average of pass/fail automated audits; manual and best-practice audits do not count ([Chrome](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)). Report it as "Lighthouse accessibility audits: score X", never as accessibility.
- Performance claims name lab or field. Core Web Vitals "good" is LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1 at the 75th percentile of field loads; "lab measurement ... is not a substitute for field measurement" ([web.dev, updated 2024-10-31](https://web.dev/articles/vitals)).
- A UX statistic inside a finding carries five fields: figure, sample (n and who), date, source URL, and a label (platform/authority, independent study, vendor data). A number without sample and definition is not quoted.
- Report scoring should be deterministic from recorded findings. Spectrum's audit skill does this (weights 10/5/2/1, `categoryScore = 100 - min(100, sum)`; [rubric](https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/scoring-rubric.md), fetched 2026-11-27) and requires every finding to cite a location the auditor read or grepped.
- Legal accessibility statements, VPATs, conformance claims and any "we are compliant" sentence are human or legal decisions; the agent drafts findings, not claims.

## 1. Measurement: seeded answer key (n=20 defects in 2 files)

Label for every number below: **n=20 seeded defects in 2 files, one model family, defects written by the same research session; it can set report fields and phrasing bans and does not set a coverage percentage.**

Setup (all paths under `~/.cache/research-lang/exemplars/product/seeded/`):

| Item | Value | Command or path |
|---|---|---|
| Theme page | copy of the built `/apps/` page of the OCX site, `website` at commit `a9dd6af`, 35.6 KB, with its `_astro` CSS | `theme/orig/apps/index.html`; seeded copy `theme/seeded/apps/index.html` |
| Webview template | hand-assembled static page reusing the real `settings.css` and real class names of the VS Code extension (`grimoire-rs/vscode` at `9230dcd`, `src/views/html.ts` shell, `src/webview/settings/render.ts` markup), 5.2 KB. It is not a render of the extension; `vscode-*` web components were replaced by native elements | `webview/orig/settings.html`, `webview/seeded/settings.html` |
| Seeding | `python3 seed.py` writes both seeded copies and `answer-key.json` (kept separate; the LLM never saw it) | `seed.py`, `answer-key.json` |
| SC whitelist | W3C `wcag.json` fetched 2026-11-27, 86 IDs, 4.1.1 excluded | `curl -sSfL https://www.w3.org/WAI/WCAG22/wcag.json -o wcag22.json`; `wcag22-ids.txt` |
| axe | axe-core 4.14.1, Chromium (playwright 1255 headless shell), tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`, 3 runs | `LD_LIBRARY_PATH=$PWD/libs/root/usr/lib/x86_64-linux-gnu node run/axe-run.mjs`; results `axe-run1.json` to `axe-run3.json` |
| LLM code-read | `claude -p --model sonnet --tools "" --disable-slash-commands --setting-sources "" --no-session-persistence --system-prompt "You are a careful accessibility code reviewer."`, whole file on stdin, prompt asks for JSON findings with quote, WCAG 2.2 criterion, description; 3 runs per file, no key, no hint about seeding | `llm/task.txt`, `llm/out-<file>-<n>.txt`, `llm/score.py`, `llm-score.json` |

The 20 seeded defects (full key in `answer-key.json`; SC is the key's assignment):

| ID | Defect | SC | Chosen class |
|---|---|---|---|
| T1 | `<img>` without alt | 1.1.1 | axe |
| T2 | button holding only a decorative svg, no name | 4.1.2 | axe |
| T3 | text input with no label, placeholder or title | 1.3.1 | axe |
| T4 | `#8a8a8a` text on white (3.45:1, computed) | 1.4.3 | axe |
| T5 | `<html>` without `lang` | 3.1.1 | axe |
| T6 | two "Learn more" links to different pages | 2.4.4 | non-axe |
| T7 | "entries in red are deprecated", colour only | 1.4.1 | non-axe |
| T8 | filter result revealed without live region | 4.1.3 | non-axe |
| T9 | `flex-direction: row-reverse`, visual order differs from focus order | 2.4.3 | non-axe |
| T10 | `div onclick`, not focusable, no role | 2.1.1 | non-axe |
| W1 | `select` with no label | 4.1.2 | axe |
| W2 | `role=button` span, empty, no name | 4.1.2 | axe |
| W3 | focusable button inside `aria-hidden` | 4.1.2 | axe |
| W4 | invalid role `toggle` | 4.1.2 | axe |
| W5 | viewport meta `user-scalable=no` | 1.4.4 | axe |
| W6 | toggle whose state is colour only, `aria-pressed` removed | 4.1.2 | non-axe |
| W7 | invalid value shown by red border only | 3.3.1 | non-axe |
| W8 | icon button named "Close" that removes a registry | 2.5.3 | non-axe |
| W9 | `outline:none` on button, input, select focus | 2.4.7 | non-axe |
| W10 | visual heading "Advanced" is a `div` | 1.3.1 | non-axe |

### axe result (3 runs, byte-identical output)

| File | Axe-class defects found | Non-axe-class defects found | Violations on unseeded nodes | Baseline (unseeded copy) |
|---|---|---|---|---|
| Theme page | 5 of 5 (`image-alt`, `button-name`, `label`, `color-contrast`, `html-has-lang`) | 0 of 5 | 0 | 1 (`label-content-name-mismatch`, SC 2.5.3, on the site's search button) |
| Webview | 5 of 5 (`select-name`, `aria-command-name`, `aria-hidden-focus`, `aria-roles`, `meta-viewport`) | 0 of 5 | 0 | 3 page-level best-practice hits (`landmark-one-main`, `page-has-heading-one`, `region` x12) |

Observations: (a) `color-contrast` in the theme page flagged two nodes, T4 and the T7 `red` span, and the T7 hit is SC 1.4.3, not the seeded 1.4.1; T7 counts as not found. (b) In a first pass under jsdom, `color-contrast` threw (no canvas) and silently reported nothing for T4, and a placeholder-only input was not flagged by `label`; the Chromium run replaced it. A tool run that cannot execute a rule must say so; the agent cannot read it off a clean result. (c) The webview fragment drew page-level best-practice hits (`region` on 12 nodes, no `main`, no `h1`) with no seeded cause; baseline subtraction against the unseeded copy is needed on a fragment page. (d) After the first session the cache directory holding these files was wiped by another process; the seeded set, key, axe runs and LLM outputs were rebuilt the same day from the same scripts, and the 3 axe runs reproduced the earlier output byte for byte (md5 `112a76e3e9dd19f44f235f83ff5c16dc`).

### LLM code-read result (3 runs per file)

| Run | Seeded defects found (of 10) | Axe-class / non-axe-class found | Total findings | Outside the key: supported / unsupported | Nonexistent SC IDs | SC differs from key |
|---|---|---|---|---|---|---|
| theme 1 | 10 | 5 / 5 | 13 | 0 / 1 | 0 | 0 |
| theme 2 | 9 (missed T5) | 4 / 5 | 22 | 3 / 6 | 0 | 2 (T3: 3.3.2 and 4.1.2 instead of 1.3.1; T9: 1.3.2 instead of 2.4.3) |
| theme 3 | 9 (missed T5) | 4 / 5 | 18 | 2 / 7 | 0 | 1 (T9: 1.3.2) |
| webview 1 | 10 | 5 / 5 | 26 | 3 / 5 | 0 | 0 |
| webview 2 | 10 | 5 / 5 | 24 | 3 / 6 | 0 | 0 |
| webview 3 | 10 | 5 / 5 | 25 | 3 / 5 | 0 | 0 |

How "outside the key" was judged (by hand, one reviewer): supported = confirmed by an axe baseline hit (landmark uniqueness, `label-content-name-mismatch`) or by a number I computed from the source (22x22 px `.iconbtn` against SC 2.5.8's 24x24 CSS px ([W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), page updated 2026-11-02, re-fetched 2026-11-27); `#3c3c3c` border on `#1f1f1f` is 1.49:1; the orig template's `#st` status span has no live region). Unsupported = speculative ("may", "potentially"), contradicted by the source, or an opinion that is not a criterion failure. Examples of unsupported: "`aria-hidden` ... describedby target is hidden" (allowed by ARIA), "planned cards distinguished by dashed border only" (the cards also carry a visible "planned" text tag), `#9d9d9d` on `#1f1f1f` "may be inadequate" (computed 6.08:1), a 22 px icon's "target size" judged from an SVG's 16 px.

Reading of the result, limited to what it can set:

1. Code-read recall on judgement-class defects was complete in this sample (30 of 30) where axe found 0 of 10. This is the reason a review pass is worth running; it is not a coverage figure.
2. Position matters: T5 (`<html lang>` missing) sat at the top of a 37 KB prompt and was missed in 2 of 3 theme runs while the contiguous inserted blocks were all found. Absence of a finding is not evidence of absence; "none found" must be scoped.
3. Findings outside the key ran 8 to 9 per run in 5 of 6 runs (1 in the sixth), with 5 to 7 unsupported in each of those 5 runs. The report must separate verified findings from speculative ones and let a reviewer reject the second group cheaply.
4. One defect was often reported under 2 to 3 SCs (webview 1: `outline:none` as 2.4.7 and 2.4.13; T3 under 1.3.1, 3.3.2, 4.1.2). Counts of "findings" inflate unless findings are deduplicated by quoted snippet.
5. Every one of the 128 quotes in the 6 outputs was a verbatim substring of the file (checked with a Python `in` test, 0 misses). That makes "quote must `grep -F` in the file" a workable mechanical check.
6. Limits that cannot be removed from this design: defects are conspicuous and contiguous, the model was told it was doing a WCAG 2.2 review, a single model and prompt were used, the key is incomplete (the supported extras are real defects the key does not list), and no rendering was available to the LLM. The numbers say nothing about real pages at scale.

## Findings

### 2. Evidence classes and what each permits

The distinction the commission asks for maps onto what each source says can and cannot be established.

| Class | Meaning | How produced | Claim it permits (template) | Claim it does not permit |
|---|---|---|---|---|
| measured | a tool or script returned a value for a named state | `axe` run, Lighthouse run, computed contrast ratio, `getBoundingClientRect`, a test run id | "axe-core 4.14.1, tags wcag2a..wcag22aa, found 3 violations on /apps/ in the default state" | "the page has no accessibility problems"; any statement about states not run |
| rendered-checked | the agent opened the page in a real browser and read the effect | Playwright screenshot, accessibility-tree snapshot, keyboard tab-order trace, 320 px reflow check | "At 320 px wide, `.iconbtn` measures 22x22 CSS px (Playwright, Chromium 1255)" | statements about screen readers, voice control, other browsers |
| code-read | the agent read source and reasoned | LLM or human reading of HTML/CSS/JS | "The source at `file:line` shows `outline:none` on button focus with no replacement" | that the user-visible result is bad (cascade, JS and overrides not run) |
| inferred | prediction from a pattern, heuristic or analogy | heuristic review, synthetic user, analogy | "Likely to violate heuristic 1 (visibility of system status); predicted severity 2; single evaluator" | any sentence about what users did, felt or will do |

An optional fifth class, `simulated`, covers synthetic-user output and always carries the banner in rule UXV-EV-12.

Support from the sources: WCAG-EM 2 requires an evaluation to define scope, sample structured and random pages (10% random added to the structured set) and keep records; it says "most accessibility checks are not fully automatable" ([WCAG-EM 2](https://www.w3.org/TR/wcag-em-2/), Note, 2026-07-23). The "Understanding Conformance" page, updated 2026-09-20, says testing "would involve a combination of automated testing and human evaluation" ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/conformance)). GOV.UK expects assistive-technology testing on six named combinations before public beta ([GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies), updated 2022-05-24). An agent in a sandbox cannot run JAWS, NVDA, VoiceOver, TalkBack or Dragon; the highest class it can reach for screen-reader behaviour is rendered-checked on the accessibility tree, and any claim about spoken output is code-read or inferred, flagged UNVERIFIED.

### 3. What automated tools establish, and the numbers that circulate

- axe measured here: reliable on the structural, name-and-role class; silent on the semantic class (misleading names, visual order, unannounced state, colour-only meaning, missing headings, keyboard operability of non-semantic elements). Zero false positives on seeded nodes in 3 runs; baseline noise on fragments.
- GDS audit, last updated 2018-04-13 (independent, UK government): 13 tools, 142 deliberately introduced barriers; best tool found 40% pass/fail (50% when "potential" barriers are counted); worst 13%. Only individual-tool results are published, so "all tools combined" is not stated ([audit](https://alphagov.github.io/accessibility-tool-audit/)). Old, and tools have moved.
- Deque, 2021-03-10 (vendor data; Deque makes axe): 57% of issues by volume across more than 2,000 audits and 13,000 pages, nearly 300,000 issues, on its own client audits, and measured by issue volume, not by share of success criteria. The release itself contrasts this with a "widely-accepted belief" of 20-30% ([Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/)).
- Lighthouse: "The Lighthouse Accessibility score is a weighted average of all accessibility audits"; each audit is pass or fail with weights 3, 7 or 10 from axe user-impact; manual and best-practice audits do not affect the score ([Chrome DevRel](https://developer.chrome.com/docs/lighthouse/accessibility/scoring), page shows no date; source file front matter: published 2019-09-19, updated 2023-08-03, per [GoogleChrome/developer.chrome.com](https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/docs/lighthouse/accessibility/scoring/index.md) fetched 2026-11-27). A fleet gate on a Lighthouse score (`ui-code-posture.md`, per the topic map) therefore measures the weighted automated subset.
- LLM-assisted auditing papers, opened in full: López-Gil and Pereira, published 2024-03-16 in *Universal Access in the Information Society* 24:837-852 (2025): GPT-3.5, Claude and GPT-4 for SC 1.1.1, 2.4.4 and 3.1.2 on 39 HTML WCAG-ACT test cases, 34 of 39 correct (87.18%), against six rule-based tools scoring 0% on the intentionally failing cases; the authors call it a pilot, three criteria only, five cases needing ad hoc prompt changes, "need more systematic evaluation on a larger sample" ([paper](https://link.springer.com/article/10.1007/s10209-024-01108-z)). ScreenAudit (Zhong et al., CHI '25, arXiv 2025-04-02): TalkBack transcript plus GPT-4o; 14 Android screens, 306 elements, 163 expert-identified errors; precision .713, recall .622, F1 .664 (averaged over prompts) against Accessibility Scanner recall .313 and axe recall .171; the abstract and body disagree on recall (69.2% versus .622); hallucination and wrong-criterion rates are not reported; the authors present it as complementing rule checkers ([arXiv](https://arxiv.org/html/2504.02110v1)). Neither paper reports wrong or invented WCAG criterion IDs, so the scout's phrase "invented criteria" (RM32) is not sourced there; that claim stays unsupported and the whitelist check below tests it locally instead. The whole ScreenAudit page was read (first 100,000 characters, then the remaining 49,069 from offset 100000, fetched 2026-11-27): the remainder is references and appendices (assignment text, qualitative-analysis procedure, the prompt). It reports no WCAG criterion field, so there is nothing in it to check for invented criteria; its error themes are improper labels and content descriptions, inappropriate feedback, unclear structure or navigation order, and unexpected TalkBack behavior. Hallucination and wrong-criterion rates remain unreported.

### 4. What a heuristic or usability review can claim

- Ten heuristics: published 1994-04-24, last reviewed 2024-01-30; "broad rules of thumb and not specific usability guidelines" ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- Evaluators: "Ideally, three to five people should independently evaluate the same interface"; "just because a design choice violates a heuristic, that does not necessarily mean it's a problem"; "heuristic evaluations cannot replace user research" ([NN/g, 2023-06-25](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)). That page gives no severity scale or percent found.
- Severity: Nielsen's 0-4 scale and three factors (frequency, impact, persistence) are in the 1994-11-01 article, which also says each evaluator rates severity independently and that the mean of three evaluators' ratings is "satisfactory for many practical purposes" ([NN/g](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/)). One agent's rating is therefore a predicted severity from one rater.
- Five users: 31% of problems found per user, 85% with five, valid "only for comparable users", several small rounds beat one large study, more users for distinct groups (2000-03-18; [NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)). An agent may not extrapolate "five users" from an agent run.
- LLM heuristic evaluation, two studies in 2025 that disagree: Guerino et al., INTERACT 2025 (arXiv 2025-06-19): only 21.2% of expert-identified issues also found by GPT-4o, 27 new issues, "several false positives due to hallucinations" with no count in the abstract ([arXiv](https://arxiv.org/abs/2506.16345)). Zhong, McDonald and Hsieh (arXiv 2025-07-03): GPT-4 found 73% of 133 and 77% of 113 violations against 57% and 63% for five aggregated experts, but the master set was built partly from GPT-4's own output, severity was coded by the first author, only two apps, and GPT-4 produced 43 and 52 severity-0 (not-a-problem) items that practitioners must filter ([arXiv](https://arxiv.org/html/2507.02306v1)). The remainder (offset 100000 to the end) was also fetched 2026-11-27 and holds only the reference list and page boilerplate, so the limitations quoted above come from the body already read; no further result or caveat sits in the tail.

### 5. Synthetic users: what they may be used for

- NN/g (Rosala and Moran, 2024-06-21): acceptable for desk-research synthesis, starting points in new domains, preparing real studies (piloting a guide), and as "hypotheses that need testing". Not acceptable: replacing real-user research; presenting findings as real-user findings; niche or specialised populations; "a litmus test for ideas". Failure examples: a real participant finished 3 of 7 courses while synthetic users claimed all they mentioned; forums that real users avoided were viewed favourably; "Since AI loves to please, every idea is often seen as a good one" ([NN/g](https://www.nngroup.com/articles/synthetic-users/)).
- NN/g (2026-10-16, synthetic responses collected February 2026): 604 human tech and design professionals versus 120 synthetic respondents; humans used more than 50 distinct labels, synthetic collapsed to about a dozen; 93% of synthetic product managers used UX terms against 44% of humans; "If you need only the most common response, synthetic data may be sufficient"; not for uncommon terms, emerging themes or subgroup differences ([NN/g](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/)). One platform (Synthetic Users), one topic.
- NN/g (Budiu, 2025-08-15): interview-based digital twins reached 0.85 on General Social Survey items versus 0.70 and 0.71 for persona and demographic models, but captured trends rather than effect magnitude, with less variation than humans; treat as directional, "complement, not replace" ([NN/g](https://www.nngroup.com/articles/ai-simulations-studies/)). The 0.85 figure needs a two-hour interview per person; an agent's persona prompt is the lower-scoring kind.

### 6. Performance claims

web.dev (published 2020-05-04, updated 2024-10-31; platform guidance): LCP within 2.5 s, INP at most 200 ms, CLS at most 0.1, measured at the 75th percentile of page loads split by mobile and desktop; "first and foremost, field metrics"; lab measurement "is not a substitute for field measurement" ([web.dev](https://web.dev/articles/vitals)). An agent running Lighthouse or a local trace has lab data; the permitted sentence is "lab LCP 1.9 s on this machine and profile", not "the page meets Core Web Vitals". Thresholds are fetched facts with a date; re-fetch before quoting them in published config because the page was last updated in 2024.

### 7. Shape of a findings report a human can act on

Spectrum's agent audit (Adobe react-spectrum, `packages/dev/s2-docs/skills/spectrum-audit/`, fetched 2026-11-27, platform source) is the corpus's one rule set with detection recipes: three fields per check (Rule, Detect, Severity), weights Critical 10, High 5, Medium 2, Low 1, `categoryScore = 100 - min(100, sum of weights)`, score "computed deterministically ... never from a subjective sense of overall quality", every finding cites a location the auditor "actually read or grepped", and the report is report-only with fixes handed to another skill ([rubric](https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/scoring-rubric.md), [template](https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/report-template.md), measured in `product-audit/exemplar-design-systems.md`: 259 lines across six check files). Its template groups findings by severity with a clickable `file:line`, a bold rule name, a one-line why, a Fix and a Check reference, then action items (Fix now / Improve / Polish / Follow-ups) and "What looks good". It has no field for evidence class, no "single evaluator" label and no review queue. UXV-EV-4, -5 and -11 add those.

The WCAG-EM 2 report skeleton (Step 5.1) is the reference for a conformance-grade report and is out of reach of an agent working from a diff: evaluator and commissioner, dates, scope, conformance target, accessibility-support baseline, structured and random sample sets, results per sample, at least one example per unmet criterion. An agent report borrows its honesty, not its claim: scope, date, version, what was and was not sampled.

## Normative guidance candidates

Severities: MUST, SHOULD, CONSIDER. IDs are candidates for the consolidator.

**UXV-EV-1 (MUST) Tag every finding with one evidence class.** Classes: measured, rendered-checked, code-read, inferred (and simulated for synthetic output). Rationale: the reader cannot otherwise tell a tool result from a guess (scout RM36). Verify: every finding line matches `evidence: (measured|rendered-checked|code-read|inferred|simulated)`; `grep -c 'evidence:'` equals finding count; a finding with class `measured` names a tool, version and run state, one with `rendered-checked` names a browser and viewport.

**UXV-EV-2 (MUST) Use the verb the class allows.** measured: "reported", "measured"; rendered-checked: "observed in <browser> at <viewport>"; code-read: "the source shows"; inferred: "likely", "predicted". Rationale: the sources say tools and heuristics establish different things. Verify: a `code-read` or `inferred` finding containing "is", "fails" or "violates" without a hedge is a review defect; reading heuristic. Pass: "code-read: `outline:none` at `a.css:12` removes the default focus ring; no replacement style found by `grep -n ':focus' a.css`". Fail: "Keyboard users cannot see focus."

**UXV-EV-3 (MUST) Never write a forbidden phrasing about accessibility, compliance or users.** Banned in findings, summaries, commit messages and PR text unless the sentence is quoting a human's decision or a cited source:
`accessible`, `fully accessible`, `WCAG compliant`, `WCAG conformant`, `conforms to WCAG`, `meets WCAG`, `meets AA`, `AA compliant`, `Section 508 compliant`, `ADA compliant`, `passes accessibility`, `no accessibility issues`, `zero accessibility issues`, `screen-reader friendly`, `keyboard accessible` (unqualified), `users will`, `users found`, `users prefer`, `users struggle`, `users expect`, `intuitive`, `user-friendly`, `usability issues: none`, `validated with users`, `Lighthouse 100 so accessible`. Rationale: W3C: a claim requires scope, date, WCAG version and level, technologies relied upon; sampled evaluation alone "usually does not allow" a claim; USWDS's own agent skill says "Do not claim "508 compliant" or "WCAG conformant" for a whole product based only on using USWDS or passing Axe in this repo" ([SKILL.md](https://raw.githubusercontent.com/uswds/uswds/develop/.agents/skills/uswds-accessibility/SKILL.md), file at `develop`, undated, fetched 2026-11-27; vendor-neutral platform source). Verify: `grep -nEi "wcag (2\.[0-9] )?(aa? )?(compliant|conformant)|\bfully accessible\b|\bis accessible\b|users (will|found|prefer|struggle|expect)|no accessibility (issues|problems)|screen[- ]reader friendly|\bintuitive\b" <report-or-diff>` returns nothing. Allowed rewrites: "axe-core 4.14.1 reported 0 violations in rules run X on state Y; manual checks listed below were not run"; "predicted friction (heuristic 1), not observed with users".

**UXV-EV-4 (MUST) Every finding quotes the source and cites one valid criterion.** Rationale: a verbatim quote makes a hallucinated finding detectable by `grep` (all 128 quotes in the 6 runs passed), and a whitelisted ID stops removed or invented criteria (4.1.1 is removed in [WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2024-12-12); the sources report no wrong-ID rate, so the check is cheap insurance, not a response to a measured failure. Required fields: `file:line`, verbatim quote (max 120 chars), one primary WCAG 2.2 SC ID or heuristic number, evidence class, severity (rule UXV-EV-9), one-line fix. Verify, quote: `grep -qF -- "$quote" "$file"` must succeed. Verify, ID whitelist: extract IDs with `grep -oE '\b[1-4]\.[0-9]{1,2}\.[0-9]{1,2}\b' report.md | sort -u > used.txt; comm -23 used.txt <(sort wcag22-ids.txt)` must print nothing, where `wcag22-ids.txt` is built from W3C `https://www.w3.org/WAI/WCAG22/wcag.json` (86 IDs, 4.1.1 excluded; 4.1.1 appearing in a finding is always rejected, it is removed in 2.2). Measured: 0 nonexistent IDs in 6 LLM runs; SC choice still differed from the key in 3 findings, so the whitelist is a floor, and a finding that cites an SC also states the failing condition in the SC's own terms.

**UXV-EV-5 (MUST) Deduplicate by snippet, keep one primary criterion.** Secondary criteria go in a `also:` field. Rationale: in this sample one defect appeared under 2 to 3 SCs and inflated counts. Verify: no two findings share the same `file:line` and quote.

**UXV-EV-6 (MUST) Split the report into Findings and Needs human review.** Anything the agent's rationale hedges ("may", "might", "potentially", "could") or cannot test goes to Needs human review, not Findings. Rationale: 5 to 7 of 8 to 9 out-of-key items per run were unsupported in 5 of 6 runs. Verify: `grep -nEi "\b(may|might|potentially|could|possibly)\b"` inside the Findings section returns nothing.

**UXV-EV-7 (MUST) A "needs human review" item carries these fields:** (1) criterion ID from the whitelist or heuristic number; (2) element locator (selector or `file:line`); (3) what the agent observed, with class; (4) what it could not test and why ("no screen reader in sandbox"); (5) manual steps, numbered, each naming the tool and platform (for example NVDA latest with Firefox, VoiceOver iOS with Safari, 400% zoom or 320 CSS px width, keyboard only); (6) expected result in one sentence; (7) who decides (design, accessibility owner, legal); (8) blocking or not. Rationale: the agent cannot run assistive technology but can emit a precise checklist (scout AX34; GOV.UK AT set). Verify: a reviewer script checks the 8 field labels exist per item; reading heuristic: a stranger can execute the steps without opening the code. Pass: "SC 4.1.3 status message; `#st` at `settings.html:94`; observed: text injected without live region (code-read); not tested: announcement; steps: 1. NVDA + Firefox, activate Save, 2. expect 'Saved' spoken without moving focus; decides: accessibility owner; blocking: yes". Fail: "Check screen reader compatibility."

**UXV-EV-8 (MUST) Scope every negative result.** "None found" is allowed only as "<tool/class> found no <rule set> violations in <files/states>; not covered: <list>". Rationale: absence was misreported by a reviewer in 2 of 3 theme runs (T5) and by axe on states it never ran. Verify: grep for `no (issues|violations|problems)` requires a `not covered:` clause within 3 lines.

**UXV-EV-9 (SHOULD) Label heuristic severity as predicted from a single evaluator.** Use Nielsen's 0-4 scale; every heuristic finding names the heuristic and states "single evaluator, predicted". Rationale: NN/g asks for 3-5 independent evaluators and says a violation is not always a problem. Verify: each heuristic finding has `heuristic: <1-10 name>`, `severity: 0-4 (predicted)` and the report header contains `single evaluator`.

**UXV-EV-10 (SHOULD) Report automated scores as scores of what they measure.** "Lighthouse accessibility audits: 96 (weighted axe audits, automated subset)" and the audits that failed, never "accessibility score 96" as a pass. Rationale: Chrome documents the weighting and exclusion of manual audits. Verify: grep `lighthouse` lines contain "audits" and the report lists the manual-review items; a gate configured on a Lighthouse score is paired with the needs-review list.

**UXV-EV-11 (SHOULD) Compute any report score deterministically and publish no coverage percentage.** Use Spectrum-style weights from recorded findings; do not emit "92% accessible", "covers 57% of WCAG" or a percentage of defects found by an agent run. Rationale: n=20 and one model cannot support a coverage figure; vendor and independent tool-coverage numbers measure different things. Verify: no `%` next to words accessible/covered/compliant (`grep -nEi "[0-9]+ ?% (accessible|compliant|covered|conform)"`); if a score is shown, the weights table is in the report.

**UXV-EV-12 (MUST) Mark simulated output and keep it out of validation.** Rationale: NN/g ([2024-06-21](https://www.nngroup.com/articles/synthetic-users/)) found synthetic users agree and over-report ("AI loves to please"), and NN/g ([2026-10-16](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/)) found 50+ human labels collapse to about a dozen, so synthetic output can mislead a reader who takes it for evidence. Any output from a synthetic user, persona prompt or LLM "user test" carries the banner `SIMULATED (synthetic user), hypothesis only, not user evidence` and cannot feed a status of validated, passed, tested or approved. Allowed uses: desk-research synthesis, drafting and piloting an interview or survey guide, generating hypotheses and edge-case scenarios to test with people, rehearsing a script; each result lists the question a human study must answer. Not allowed: choosing between designs, predicting adoption, concept validation, niche populations, replacing a planned study, being cited as "users said". Also report a diversity check when a run has many synthetic respondents: distinct answers divided by respondent count; a collapse like 50+ labels to about 12 flags mode collapse. Verify: grep for banner on any `simulated` block; grep `validated|confirmed by users` near a simulated block returns nothing.

**UXV-EV-13 (MUST) A sentence about users needs a record.** "Users found/struggled/preferred X" requires a session, log query or test run id and sample size in the same sentence; otherwise write "hypothesis:" or "predicted:". Rationale: scout RM1; NN/g bans presenting synthetic findings as real. Verify: `grep -nE "users (found|struggled|preferred|abandon|drop)"` lines must contain `(session|query|run|n=)`.

**UXV-EV-14 (MUST) Label a UX statistic quoted in a finding with five fields.** Format: `<figure> (<n and who>, <date the source states>, <URL>, <platform|independent study|vendor data>; definition: <how the metric is defined>)`. A figure missing sample or definition is not quoted as a target or norm. Rationale: fetched examples show how much hides inside a number. Deque's 57% is vendor data, by issue volume, over its own audit corpus; GDS's 40% is an independent pass/fail count on 142 seeded barriers across 13 tools in 2018; Userpilot and Appcues onboarding figures (scout OC27, OC48) are vendor data without definitions and are named to marketing's claim policy, not covered here. Verify: regex per statistic `[0-9.]+ ?%` in a UX finding has an adjacent `n=`, a four-digit year, a URL and one of the three labels.

**UXV-EV-15 (MUST) Name lab versus field for performance and give the limit.** Rationale: web.dev ([2024-10-31](https://web.dev/articles/vitals)) calls field metrics primary and says lab data "is not a substitute for field measurement", so a lab number cannot support a pass claim. Threshold statements use the dated source (LCP 2.5 s, INP 200 ms, CLS 0.1 at the 75th percentile, field) and say whether the agent's number is lab. Verify: every Core Web Vitals sentence contains `lab` or `field`; the literal "meets Core Web Vitals" is accepted only with a field data source (CrUX or RUM) named.

**UXV-EV-16 (SHOULD) Run the cheapest class first and report which ran.** Rationale: in this file's measurement a jsdom run silently skipped `color-contrast` and a clean result looked like a pass, and axe found 0 of the 10 non-axe defects, so the reader must see which checks ran; cheap deterministic checks go first because they are repeatable (3 byte-identical axe runs) while the LLM pass added 30 unsupported findings. Order: automated rules in a real browser (axe via Playwright, not jsdom), then rendered checks (viewport 320 px reflow, 400% zoom, keyboard tab trace, target sizes), then code-read review, then the needs-review list. State the rules or tools that could not run (for example `color-contrast` under jsdom). Verify: report header lists `ran:` and `did not run:`; if axe is run under jsdom, `color-contrast` appears under `did not run`.

**UXV-EV-17 (MUST) The agent never issues a conformance claim, statement or VPAT.** It reports findings against criteria and states what a conformance evaluation would still need (scope, sample, accessibility-support baseline, date). Rationale: Understanding Conformance and WCAG-EM 2 define the claim components and make it the owner's commitment. Verify: grep for banned phrases (UXV-EV-3) plus `conformance statement|VPAT|accessibility statement` appearing only in "human decision" sections.

**UXV-EV-18 (CONSIDER) Add a per-class recall note, not a number, to the report header.** "axe-class defects catch structural problems; semantic defects (names, order, state, colour-only meaning) need review." Rationale: measured here and in the GDS audit. Verify: header contains the sentence.

## Dated facts

| Fact | Value | Source (URL) | Date the source states | Source type |
|---|---|---|---|---|
| WCAG 2.2 success criteria | 86 active; 4.1.1 Parsing removed; new in 2.2: 2.4.11, 2.4.12, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8, 3.3.9 | https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/wcag.json | 2024-12-12 (Recommendation); wcag.json fetched 2026-11-27 | authority |
| SC 2.5.8 Target Size (Minimum) | AA; 24 by 24 CSS px, with exceptions | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (re-fetched 2026-11-27; normative text "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:"; exceptions spacing, equivalent, inline, user agent control, essential; does not change with zoom) | page updated 2026-11-02 | authority |
| WCAG-EM 2 | W3C Group Note, published 2026-07-23; random sample = 10% of structured sample; report must include one example per unmet SC; "most accessibility checks are not fully automatable"; sampled evaluation alone usually does not allow a conformance claim | https://www.w3.org/TR/wcag-em-2/ | 2026-07-23 | authority (AG Working Group endorsed, not endorsed by W3C itself) |
| WCAG-EM overview page | WCAG-EM 2 applies to apps and other digital products; page updated 2026-08-12 | https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/ | 2026-08-12 | authority |
| Conformance requirements | five requirements; claim optional; if made, required components must be given; partial conformance only for third-party content or language-support reasons | https://www.w3.org/WAI/WCAG22/Understanding/conformance | updated 2026-09-20 | authority |
| axe-core version used | 4.14.1 | npm `axe-core@4.14.1` (installed in `seeded/run`) | measured 2026-11-27 | tool |
| Automated coverage, independent | best of 13 tools found 40% of 142 seeded barriers (pass/fail); best 50% with potential barriers; worst 13% | https://alphagov.github.io/accessibility-tool-audit/ | last updated 2018-04-13 | independent (UK government) |
| Automated coverage, vendor | 57% of issues by volume; over 2,000 audits, over 13,000 pages, nearly 300,000 issues | https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ | 2021-03-10 | vendor data |
| Lighthouse accessibility score | weighted average of pass/fail audits; weights 3, 7, 10; manual and best-practice audits excluded | https://developer.chrome.com/docs/lighthouse/accessibility/scoring (dates from source file https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/docs/lighthouse/accessibility/scoring/index.md) | page shows no date; source front matter published 2019-09-19, updated 2023-08-03 | platform |
| GOV.UK AT set | JAWS 2019 or later, NVDA latest, VoiceOver iOS, TalkBack, a magnifier up to at least 4x, Dragon 15 or later, before public beta | https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies | 2017-10-26, updated 2022-05-24 | authority (UK government guidance) |
| Core Web Vitals "good" | LCP at most 2.5 s; INP at most 200 ms; CLS at most 0.1; 75th percentile | https://web.dev/articles/vitals | 2020-05-04, updated 2024-10-31 | platform |
| NN/g ten heuristics | published 1994-04-24, reviewed 2024-01-30 | https://www.nngroup.com/articles/ten-usability-heuristics/ | 2024-01-30 | authority (consultancy of record) |
| Heuristic evaluation | 3 to 5 independent evaluators; violation is not always a problem; cannot replace user research | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ | 2023-06-25 | authority |
| Severity scale | 0-4; frequency, impact, persistence; mean of 3 evaluators acceptable | https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/ | 1994-11-01 | authority (historical) |
| Five users | 31% per user, 85% with 5, qualitative, comparable users | https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ | 2000-03-18 | authority (historical) |
| Synthetic users guidance | hypotheses and prep only; do not present as real-user findings | https://www.nngroup.com/articles/synthetic-users/ | 2024-06-21 | authority |
| Synthetic vs human | 604 humans vs 120 synthetic (collected 2026-02); 50+ labels vs about a dozen; 93% vs 44% of product managers using UX terms | https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/ | 2026-10-16 | authority; one platform, one topic |
| AI simulation studies | GSS 0.85 interview twins vs 0.70 persona vs 0.71 demographic; purchase intent 1.66 vs 1.58 | https://www.nngroup.com/articles/ai-simulations-studies/ | 2025-08-15 | authority summarising academic studies |
| LLM WCAG pilot | 34 of 39 correct (87.18%) on 3 criteria | https://link.springer.com/article/10.1007/s10209-024-01108-z | 2024-03-16 | independent peer-reviewed pilot |
| ScreenAudit | 14 screens, 306 elements, 163 errors; precision .713, recall .622; axe recall .171 on the same set | https://arxiv.org/html/2504.02110v1 | 2025-04-02 (CHI '25) | independent peer-reviewed |
| GPT-4o vs experts | 21.2% overlap with expert-found issues; 27 new issues | https://arxiv.org/abs/2506.16345 | 2025-06-19 | independent peer-reviewed |
| GPT-4 synthetic heuristic evaluation | 73% and 77% of issues vs 57% and 63% for 5 aggregated experts; master set includes GPT-4's own findings | https://arxiv.org/html/2507.02306v1 | 2025-07-03 (preprint) | independent preprint |
| Spectrum audit weights | Critical 10, High 5, Medium 2, Low 1 | https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/scoring-rubric.md | fetched 2026-11-27 (file at `main`) | platform (Adobe) |

## What an agent must not decide alone

| Decision | Why the agent asks | Who |
|---|---|---|
| Publishing any accessibility conformance claim, statement, VPAT or "compliant" sentence on a page, README, release note or store listing | needs scope, date, WCAG version and level, accessibility-support baseline, owner commitment; legal exposure | product owner and legal |
| Which conformance target (A, AA, AAA, WCAG 2.1 versus 2.2) applies to the product, and which jurisdiction's law applies | depends on contracts and law (EU Accessibility Act, ADA, Section 508); the EUR-Lex fetch for Directive 2019/882 returned no text, so no legal date is stated here | owner and legal |
| Accepting a documented exception or "essential" or "equivalent" exemption for a failed criterion | trade-off with product and cost | design and accessibility owner |
| Rating a heuristic finding as a blocker for release | severity depends on frequency, impact and persistence in real use | design lead |
| Whether synthetic output is acceptable for a particular decision | NN/g: stakeholders may take it as a replacement for research | research lead |
| Which assistive-technology and browser set is the project's support baseline | cost and audience | owner |
| Quoting a vendor statistic in user-facing copy | marketing claim policy, not UX findings | marketing owner |
| Choosing between two designs where the only evidence is a simulated run or a heuristic | no observed behaviour | design lead with a real study |

## AI-agent angle

| What an LLM characteristically gets wrong | Evidence | Smallest mechanical check |
|---|---|---|
| Calls a page "accessible" or "WCAG AA compliant" after a clean tool run | tool coverage 40% ([GDS](https://alphagov.github.io/accessibility-tool-audit/), 2018-04-13) to 57% ([Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/), 2021-03-10, vendor data) depending on source and metric; [USWDS skill](https://raw.githubusercontent.com/uswds/uswds/develop/.agents/skills/uswds-accessibility/SKILL.md) bans the phrase | UXV-EV-3 grep |
| Treats a clean axe or Lighthouse result as a pass, including when a rule could not run | jsdom run silently skipped `color-contrast`; Lighthouse excludes manual audits | UXV-EV-16 `ran:`/`did not run:` header; run in a real browser |
| Misses the single defect that is not near the other defects | T5 missed in 2 of 3 theme runs | list "not covered"; a deterministic `lang` check (`grep -L '<html[^>]*lang=' *.html`) |
| Emits speculative findings phrased as defects | 5 to 7 unsupported extras per run in 5 of 6 runs; GPT-4 produced 43 and 52 severity-0 items ([arXiv 2507.02306](https://arxiv.org/html/2507.02306v1), 2025-07-03) | UXV-EV-6 hedge grep; verbatim quote check |
| Reports one defect under several SCs | 2.4.7 plus 2.4.13; 1.3.1, 3.3.2 and 4.1.2 for one input | UXV-EV-5 dedupe |
| Computes contrast from a variable name rather than a measured value | "may be inadequate" on `#9d9d9d` on `#1f1f1f`, which is 6.08:1 | compute the ratio in the report (`python3` formula) or mark inferred |
| Invents user findings from a screenshot or code read | scout RM1; NN/g | UXV-EV-13 grep |
| Treats a synthetic persona's agreement as validation ("AI loves to please") | NN/g 2024-06-21 | UXV-EV-12 banner and status ban |
| Quotes a benchmark without sample or definition | Appcues and Userpilot examples in scout rows OC27, OC48 | UXV-EV-14 five-field format |
| Reasons "Core Web Vitals pass" from a Lighthouse lab run | web.dev: field is primary | UXV-EV-15 |
| Wrong or removed WCAG IDs (4.1.1, 2.4.7 renumbered, SC from WCAG 3 drafts) | whitelist check; 0 failures in this sample, so the risk is from training data older than 2.2 | UXV-EV-4 `comm` check against `wcag22-ids.txt` |

## Contested / evolving

- **How much automation can do.** 20-30% (older belief cited by Deque), 40% (GDS audit, 2018, seeded barriers, best tool), 57% (Deque, 2021, by issue volume, vendor data). The numbers measure different things (barrier count, issue volume, criteria count) and no source gives a current figure for agents. Trend: LLM-assisted checks raise recall in papers (ScreenAudit recall .622 versus axe .171 on 14 Android screens; López-Gil 87.18% on 39 cases) but both are small, and both authors present them as complements.
- **Can an LLM do heuristic evaluation?** Guerino et al. 2025: 21.2% overlap with experts; Zhong et al. 2025: 73-77% coverage beating 5 aggregated experts, but the benchmark includes the model's own findings and many severity-0 items. Resolution for config: neither supports a coverage claim; both support "single evaluator, needs a human filter".
- **Five users versus more.** NN/g's 2000 article remains the citation; its assumptions (comparable users, qualitative, iterated) are limits, not a general rule. Not relevant to agent runs beyond "do not extrapolate".
- **Interview-grounded digital twins versus persona prompts.** 0.85 versus 0.70 on GSS items, with continuing bias concerns (NN/g, 2025-08-15). The advantage needs interview data an agent normally lacks; the fleet has no such data.
- **WCAG 2.2 versus 3.0.** WCAG 3 was not fetched here; an agent writing "WCAG 3" scores or levels is out of scope and unsourced. Trend for evaluation methodology: WCAG-EM 2 (2026-07-23) extends from websites to apps.
- **Whether UX review is a pass/fail gate.** NN/g's heuristic guidance says a violation is not always a problem, while design systems such as Spectrum score numerically. Resolution used: scores are fine when deterministic and labelled as adherence to a ruleset, not as usability.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/ten-usability-heuristics/ | NN/g, the ten heuristics | 1994, reviewed 2024-01-30 | primary; names and the "rules of thumb" limit |
| https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ | NN/g, how to run a heuristic evaluation | 2023-06-25 | primary; 3-5 evaluators, violation vs problem |
| https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/ | NN/g, severity rating | 1994-11-01 | primary; scale and independent ratings |
| https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ | NN/g, five users | 2000-03-18 | primary; assumptions behind the number |
| https://www.nngroup.com/articles/synthetic-users/ | NN/g, synthetic users | 2024-06-21 | primary; allowed and forbidden uses |
| https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/ | NN/g, 604 humans vs 120 synthetic | 2026-10-16 | primary; mode collapse numbers |
| https://www.nngroup.com/articles/ai-simulations-studies/ | NN/g, digital twin and synthetic user studies | 2025-08-15 | primary summary of academic studies |
| https://link.springer.com/article/10.1007/s10209-024-01108-z | López-Gil and Pereira, LLM for manual WCAG criteria | 2024-03-16 | primary; small pilot, LLM versus rule engines |
| https://arxiv.org/html/2504.02110v1 | ScreenAudit, CHI '25 | 2025-04-02 | primary; precision, recall, limits |
| https://arxiv.org/abs/2506.16345 | Guerino et al., GPT-4o heuristic evaluation | 2025-06-19 | primary; 21.2% overlap |
| https://arxiv.org/html/2507.02306v1 | Zhong, McDonald, Hsieh, synthetic heuristic evaluation | 2025-07-03 | primary; contrasting result and benchmark caveat |
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 Recommendation | 2024-12-12 | primary; SC list, 4.1.1 removed |
| https://www.w3.org/WAI/WCAG22/wcag.json | machine-readable WCAG 2.2 | fetched 2026-11-27 | primary; builds the ID whitelist |
| https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/ | WCAG-EM overview | updated 2026-08-12 | primary; five steps, WCAG-EM 2 pointer |
| https://www.w3.org/TR/wcag-em-2/ | WCAG-EM 2 Group Note | 2026-07-23 | primary; report contents, sampling, claim limits |
| https://www.w3.org/WAI/WCAG22/Understanding/conformance | Understanding Conformance | updated 2026-09-20 | primary; claim components |
| https://alphagov.github.io/accessibility-tool-audit/ | GDS accessibility tool audit | 2018-04-13 | independent measurement; old |
| https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ | Deque automation coverage study | 2021-03-10 | vendor data; the number to label |
| https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies | GOV.UK AT test set | 2022-05-24 | primary guidance; manual checklist basis |
| https://developer.chrome.com/docs/lighthouse/accessibility/scoring | Lighthouse accessibility scoring | updated 2023-08-03 (source front matter) | platform; what the score is |
| https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | Understanding SC 2.5.8 | updated 2026-11-02 | primary; 24 CSS px and exceptions |
| https://raw.githubusercontent.com/uswds/uswds/develop/.agents/skills/uswds-accessibility/SKILL.md | USWDS accessibility agent skill | fetched 2026-11-27 (undated file) | scope firewall against "508 compliant" |
| https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/docs/lighthouse/accessibility/scoring/index.md | source of the Lighthouse scoring page | front matter 2019-09-19, updated 2023-08-03 | supplies the page's dates |
| https://developer.chrome.com/docs/lighthouse/accessibility/ | Lighthouse accessibility overview | undated | fetched; states only that manual audits do not affect score |
| https://web.dev/articles/vitals | Core Web Vitals | updated 2024-10-31 | platform; thresholds, field vs lab |
| https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/report-template.md | Spectrum audit report template | fetched 2026-11-27 | agent-audit report shape |
| https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/scoring-rubric.md | Spectrum audit scoring rubric | fetched 2026-11-27 | deterministic scoring |
| https://github.com/adobe/react-spectrum/tree/main/packages/dev/s2-docs/skills/spectrum-audit | directory listing (`checks/`, report-template, rubric) | fetched 2026-11-27 | confirms file set |

Not fetched or not usable: EUR-Lex Directive 2019/882 (page returned no text; no European Accessibility Act date is stated here); WCAG 3 drafts; Axe rule-description pages beyond the installed library; nothing else from the ScreenAudit and arXiv 2507.02306 pages (both read to the end). The scout rows RM1, RM8, RM25-27, RM32, RM36, AX34, CG39, PI30, PR48, PR50 were read from `ux-topic-map/*.md` and `ux-topic-map.md` (M011-M016); the audit measurement used is `product-audit/exemplar-design-systems.md`.
