# Commission: marketing-first-screen-copy / page-hero-status

Topic question: Which pages are pitch surfaces that marketing copy rules govern, and what must their first screen say beyond what docs-quality already enforces?

Question: What must a pitch-page hero and a README opening say (category or job, differentiator, audience, maturity status), and which failures can a review step flag?
Starts from: landing-conversion.md #1-5 and #23-24; exemplar-landing-pages.md (H1 median 6 words; subhead median 11, fleet 29 and 33; category in the H1 14 of 25) and smells 1 and 5; messaging-inventory.md smell 7 and pattern 5 (ocx "early development" only in a closing footnote; the grimoire hero is silent on 1.0; grim-gui "skeleton"); developer-marketing.md #11 (status on the first screen).
Investigate:
1. Fletch's H1 guidance and the Stripe Atlas rule of one, linked in landing-conversion.md.
2. The Demand Curve above-the-fold playbook and Copyhackers formulas. These are practitioner sources: label them.
3. Unbounce and Baymard benchmarks. Label them vendor data, with sample and date.
4. docs-quality DOC-TYPE-10..15 and DOC-TYPE-32..36, so this dive adds only what they do not decide.
Corpus: ~/.cache/research-lang/exemplars/product/ was absent on 2026-11-27. Rebuild the landing and README corpora from product-audit/exemplar-landing-pages.md and product-audit/exemplar-readmes.md first.
Measure, not cite:
- Re-run the exemplar-landing-pages.md word counts on the rebuilt corpus.
- Score each H1 and subhead as category, outcome or audience, by a rubric written before scoring. Report the agreement between two independent passes.
- On the 40 upstream READMEs and 25 landings: count those that state maturity in the hero segment or the first 15 README lines, split by pre-1.0 and post-1.0 projects.
The deliverable must decide: the hero contract (fields, and a word band only where the corpus supports one); the maturity-status requirement, its wording as an evidence-record class maturity claim, and its placement; and which rubric failures a review step flags.
Out of scope: the built <h1> count (ux) and CTA counts (DOC-TYPE-12).
