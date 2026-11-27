# Commission: ux-ai-features / output-trust-and-safety

Topic question: What must a human-facing LLM interface disclose, show and refuse to render, and which of those duties are now law?

Investigate what an interface must do with model output before showing it.
Primary sources to fetch:
- OWASP LLM01 and LLM05 (https://genai.owasp.org/llmrisk/llm01-prompt-injection/ and the LLM05 page on the same site);
- arXiv 2304.09848 on citation verifiability (https://arxiv.org/abs/2304.09848);
- arXiv 2006.14779 on explanations and overreliance (https://arxiv.org/abs/2006.14779);
- arXiv 2405.00623 on uncertainty wording (https://arxiv.org/abs/2405.00623);
- PAIR on explainability and trust (https://pair.withgoogle.com/chapter/explainability-trust/).
Measure, do not cite:
- build a minimal markdown renderer test page;
- feed it model-style output with remote images, auto-linked URLs carrying query data, and HTML;
- record what three common renderers (marked, markdown-it, react-markdown or similar) do by default.
Start from M161 to M166 and scout rows AI5, AI7 and AI12 to AI15.
The deliverable must decide:
- the untrusted-content separation and labelling rule;
- the image and link restriction rule, with a Detect line;
- the citation display rule;
- when and how confidence is shown;
- the explanation stance, citing the effect sizes the papers report.
Out of scope: approval of actions (UX-ACT) and the security of the model pipeline (security territory, named only).
