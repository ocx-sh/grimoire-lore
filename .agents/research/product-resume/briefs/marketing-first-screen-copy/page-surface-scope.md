# Commission: marketing-first-screen-copy / page-surface-scope

Topic question: Which pages are pitch surfaces that marketing copy rules govern, and what must their first screen say beyond what docs-quality already enforces?

Question: How does a rule tell a pitch page from a docs hub, and what does a product's docs home owe marketing when the product has no pitch page?
Starts from: site-shape.md smell 1 (8 of 10 docs sites open on a docs page with no positioning, proof or single CTA) and §6 (11 pages across 6 sites declare doc_type: landing; 2 are pitches); exemplar-landing-pages.md smell 9 (doc hubs carry doc_type: landing, so a landing-page rule keyed to that tag fires on task routers); messaging-inventory.md §5 (description coverage per site).
Investigate:
1. Read rules/docs-quality.md and skills/docs-quality-reference/page-types.md in full. List what DOC-TYPE-10..15 already require of a doc_type: landing page, and what DOC-TYPE-32..36 require of a README.
2. Read skills/docs-quality-reference/checks/doc_declaration.py and landing_check.py: how the doc_type enum is parsed and extended, and what it would cost to add a value or a second key.
3. Read all 11 landing-tagged fleet pages. Classify each as pitch, docs hub or snippet, by a rubric written before reading.
4. On 6 exemplars that have both a pitch page and a docs home (for example uv, Bun, Deno), record what the docs home's first sentence says and whether it repeats the pitch's category noun.
Measure, not cite:
- The classification table with file paths and the rubric.
- Per fleet docs home: does its first sentence carry the product's category noun? Record the command.
The deliverable must decide: the scoping key for the marketing-copy rule (a new doc_type value, a separate declaration comment, or a path list), with the rule that it never fires on doc_type: landing alone; what a docs home owes marketing (for example the canonical sentence in DOC-TYPE-10's one-sentence slot) and what stays with docs-quality; and whether that becomes a named change request against DOC-TYPE-10 or DOC-TYPE-13 rather than a marketing row.
Out of scope: the built <h1> count and page structure (ux); nav entries marked planned: true (ux).
