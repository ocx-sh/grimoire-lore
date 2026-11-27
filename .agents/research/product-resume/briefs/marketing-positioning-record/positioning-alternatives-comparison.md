# Commission: marketing-positioning-record / positioning-alternatives-comparison

Topic question: What single positioning record must exist before copy is written, and how does an agent detect when a surface has drifted from it?

Question: How must copy name the alternative the reader uses today, say when not to use the product, and keep a comparison fair and dated?
Starts from: developer-marketing.md #1 and #21-22; exemplar-readmes.md (a "why" or comparison heading in 11 of 40 upstream READMEs, 0 of 18 fleet); codified-law-policy.md #23-24; messaging-inventory.md §2 and smell 10 (the ocx "drift" table at landing-content.ts:14-18 is the only dated, sourced comparison; Grimoire names no alternative).
Investigate:
1. Comparative advertising law: Directive 2006/114/EC Art. 4 on EUR-Lex; the FTC Statement of Policy Regarding Comparative Advertising (1979) at ftc.gov.
2. Exemplar "vs", "alternatives" and "when not to use" pages: uv, Bun, Deno and Ruff docs. Record whether each comparison is dated, names competitor versions and links a method.
3. Stack Overflow Developer Survey 2025 (and 2026 if published) on reasons to reject a tool.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- For each upstream exemplar comparison: date shown (yes or no), versions named, method linked.
- How many are older than 12 months at fetch time.
- Rebuild the exemplar-readmes corpus first if ~/.cache/research-lang/exemplars/product/exemplar-readmes is absent; it was absent on 2026-11-27.
Use the evidence record from claims-evidence-record with class comparison; you own the subject_version field and nothing else.
The deliverable must decide: the comparison row fields; the "when not to use" requirement and where it sits (README, docs, landing); the staleness window after which a comparison is pulled or re-run; and whether naming an alternative is required on a README or only on a comparison page.
