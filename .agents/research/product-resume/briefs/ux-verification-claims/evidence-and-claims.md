# Commission: ux-verification-claims / evidence-and-claims

Topic question: What must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Investigate what an agent may assert about usability and accessibility after a review, and the shape of a findings report a human can act on.
Primary sources to fetch:
- NN/g, the ten usability heuristics (https://www.nngroup.com/articles/ten-usability-heuristics/) and how to conduct a heuristic evaluation (https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/);
- NN/g on synthetic users, 2024-06-21 (https://www.nngroup.com/articles/synthetic-users/), synthetic users versus human respondents, 2026-10-16 (https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/), and AI simulation studies (https://www.nngroup.com/articles/ai-simulations-studies/);
- the LLM accessibility-audit papers in RM32, opened in full, because the scout saw them only as search results (https://link.springer.com/10.1007/s10209-024-01108-z, https://arxiv.org/html/2504.02110v1);
- W3C WCAG-EM, the evaluation methodology (https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/; locate it on w3.org if moved), and the WCAG 2.2 success-criterion list as the ID whitelist;
- the Spectrum agent audit format named in `product-audit/exemplar-design-systems.md`.
Measure against a seeded answer key, not an impression:
- copy one theme page and one webview template under `~/.cache/research-lang/exemplars/product/seeded/`, and seed 20 known defects: 10 that axe detects and 10 it cannot (focus order, misleading name, unannounced state, colour-only cue, among others). Keep the answer key in a separate file;
- run axe and an unaided LLM code-read review over the seeded copies, three runs each;
- per run, count seeded defects found and missed, false findings, and criterion IDs that are wrong or do not exist in WCAG 2.2;
- label the result as n=20 defects in 2 files. It may set report fields and phrasing bans; it may not set a coverage percentage.
Start from M011 to M016 and scout rows RM1, RM8, RM25 to RM27, RM32, RM36, AX34, CG39, PI30, PR48 and PR50.
The deliverable must decide:
- the evidence classes (measured, rendered-checked, code-read, inferred) and the claim each one permits;
- the forbidden phrasings, for example "accessible", "WCAG compliant" and "users will";
- the fields a "needs human review" item must carry, and the criterion-ID whitelist check;
- the labelling rule for a UX statistic quoted inside a UX finding (sample, date, source, vendor label);
- what a synthetic-user run may be used for.
Cross-territory: statistics and claims in marketing copy, including onboarding benchmarks (OC27, OC48), belong to marketing's claim policy and are named, not covered.
