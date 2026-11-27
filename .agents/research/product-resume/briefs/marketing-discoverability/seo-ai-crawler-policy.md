# Commission: marketing-discoverability / seo-ai-crawler-policy

Topic question: Which crawl, index, share and answer-engine signals must every built site emit, and which AI-era search tactics are banned as retired or spam?

Question: Which AI crawler tokens should a project allow or block, where is the decision recorded, and what is llms.txt for if search ignores it?
Starts from: seo-geo.md #6-9 and #34; recent-shifts.md (llms.txt purpose; Google says do nothing extra); distribution-posture.md smell 6 (the Cloudflare-managed robots.txt blocks 31 agents with ai-train=no, recorded in no repository); exemplar-landing-pages.md smell 6 and pattern 8 (llms.txt on 17 of 25 exemplars; agent onboarding on 3).
Investigate:
1. Each vendor's crawler docs: OpenAI bots, the Anthropic crawler, Perplexity bots, and Google common crawlers (Google-Extended is a robots token, not a crawler). Separate search, training and user-fetch tokens. Record each page's date.
2. Cloudflare's Content Signals policy and its managed robots.txt; Cloudflare's report on Perplexity's undeclared crawlers.
3. llmstxt.org; Google's AI optimization guide (2026-05-15 per the scout) and its llms.txt note; the Ahrefs llms.txt study, labelled vendor data.
4. docs-quality DOC-AGENT-04, -05 and -08, so this dive does not restate "llms.txt optional".
Measure, not cite:
- Fetch the live robots.txt of the 25 landing exemplars (URLs in product-audit/exemplar-landing-pages.md).
- Tabulate which AI tokens each allows or blocks, and whether a search token is blocked by mistake.
- Record the command.
The deliverable must decide: a default policy split by token class; the repository file that records it; the live-versus-repository check; and whether llms.txt is framed as agent onboarding rather than SEO.
