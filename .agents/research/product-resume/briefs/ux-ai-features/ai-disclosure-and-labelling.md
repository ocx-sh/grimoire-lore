# Commission: ux-ai-features / ai-disclosure-and-labelling

Topic question: What must a human-facing LLM interface disclose, show and refuse to render, and which of those duties are now law?

Investigate disclosure and labelling duties for AI interaction and for AI-generated content shown inside a product.
Primary sources to fetch:
- Regulation (EU) 2024/1689 through the Publications Office Cellar: `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32024R1689` (HTTP 200 with Article 50 present when tested for this map on 2026-11-27). Read Article 50, Article 113 on application dates, and the definitions in Article 3;
- the AI omnibus amending act: find its CELEX number from the omnibus notice (https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force, dated 2026-07-27 per AI10), fetch it by the same Cellar route, and record every change to Article 50 or its dates;
- the Commission code of practice on AI-generated content (https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content, dated 2026-06-10 per AI10) and the guidelines page (https://digital-strategy.ec.europa.eu/en/news/supporting-implementation-ai-act-clear-guidelines);
- Carbon for AI (https://carbondesignsystem.com/guidelines/carbon-for-ai/).
Measure, do not cite: survey 10 developer-product AI features (editor assistants, docs chat, CLI assistants), and record where and when each discloses AI, whether the label is accessible, and whether generated output is marked.
Start from M157 to M160 and scout rows AI8 to AI10, AI16 and RS19.
The deliverable must decide:
- the disclosure rule (when, where, in what form);
- the marking rule for content generated inside the product;
- the accessible-label rule;
- the dated legal facts, each with its Official Journal source and a re-check date.
Hard limit: a legal date or obligation not read in the Official Journal text this session must not become a rule row. It goes only into the dated-facts table, marked UNVERIFIED.
Cross-territory: disclosure in marketing posts and videos, and the marking of generated release notes, belong to marketing; generated docs fall under docs-quality DOC-PLAIN-22. Named, not covered.
