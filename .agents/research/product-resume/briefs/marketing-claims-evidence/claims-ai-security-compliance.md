# Commission: marketing-claims-evidence / claims-ai-security-compliance

Topic question: Which claims may product copy make, and what evidence record must exist on disk before each class of claim ships?

Question: What may copy claim about AI capability, security or compliance, and which claim classes need a named human sign-off before they ship?
Starts from: codified-law-policy.md #4, #30 and #32; services-b2b.md #22-24; developer-marketing.md #2 and #14 (Stack Overflow 2025: security and privacy are the first rejection reasons).
Investigate:
1. FTC Operation AI Comply (2024-09) and the DoNotPay and Workado orders (98% claimed, 53% measured). Fetch the press releases and the orders linked in codified-law-policy.md.
2. The AICPA SOC suite page: why SOC 2 is an attestation, not a certification. ISO/IEC 17021-1 on who may certify (the ISO catalogue page; record only what the page states).
3. Regulation (EU) 2024/1689 (the AI Act) on EUR-Lex, https://eur-lex.europa.eu/eli/reg/2024/1689/oj: does it regulate capability claims in marketing, or only Art. 50 transparency? Answer from the text, not summaries.
4. Two exemplar security or trust pages (for example Tailscale and 1Password) and their /.well-known/security.txt (RFC 9116). Record the fields, not the slogans.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- Grep fleet READMEs, landing sources and package descriptions for secure, safe, verified, signed, compliant, certified, accurate and AI-powered. Record the command.
- Classify each hit as mechanism ("pinned by digest") or outcome ("secure"), by a rubric written before scoring.
Use the evidence record from claims-evidence-record (classes security and ai-capability); add no new record.
The deliverable must decide: which claim classes are banned unless an evidence record links the proof; which need a named human sign-off (the advertiser carries liability, codified-law-policy.md #32); and the mechanism-over-outcome rewrite pattern, with two fleet examples.
