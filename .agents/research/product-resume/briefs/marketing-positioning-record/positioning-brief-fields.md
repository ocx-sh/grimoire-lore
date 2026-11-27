# Commission: marketing-positioning-record / positioning-brief-fields

Topic question: What single positioning record must exist before copy is written, and how does an agent detect when a surface has drifted from it?

Question: Which fields make a positioning brief an agent can apply, where does the one brief live, and when must it be reviewed?
Starts from: canonical-guides.md #1-3, #6-7, #11-12, #25 and #31; config-inventory.md smell 4 (product-context.md in 6 variants, path-scoped to website/** and .agents/**; the only "do not say" list sits in a spec no session loads); messaging-inventory.md smell 3 (audience named in 1 of 17 repos).
Investigate:
1. Dunford's components (alternatives, attributes, value, market category, relevant trends), from her own site and published worksheets.
2. Moore's 7-slot positioning statement, Schwartz's awareness and sophistication stages, and JTBD four forces. Use primary texts or the authors' own pages; mark any secondary summary as such.
3. Fletch's ICP and positioning newsletters, linked in canonical-guides.md.
4. Read all 6 fleet product-context.md variants and the design_brief_landing_page.md:101-118 "do not say" list. Tabulate their fields against the canon.
Measure, not cite:
- For each fleet brief variant: which canon fields are present, its date, its path scope.
- Whether each loads for a README edit. Grep the frontmatter paths and record the command.
- How many fleet repos could fill an audience field today from an existing sentence (start from messaging-inventory.md §6).
The deliverable must decide: the brief's required fields (audience, named alternative, category noun, canonical sentence, object noun and enumerated lists, "do not say" list, review_by); its single file path per product; how rules and skills load it, including on README edits; and what an agent does when no brief exists (stop and invoke positioning-brief, or write a draft marked unreviewed).
