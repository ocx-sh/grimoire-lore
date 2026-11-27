# Commission: ux-interface-text / labels-and-wordlists

Topic question: What must runtime interface text contain, and which words and string constructions must an agent never ship?

Investigate the word-level rules for labels, buttons, links, toggles, alt text and short strings, and how precise a deny-list check can be.
Primary sources to fetch:
- GOV.UK A to Z style guide (https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) and button component (https://design-system.service.gov.uk/components/button/);
- Primer content guidelines;
- NN/g on "learn more" links (https://www.nngroup.com/articles/learn-more-links/);
- the W3C alt decision tree (https://www.w3.org/WAI/tutorials/images/decision-tree/);
- the VS Code command naming conventions;
- the catalog's DOC-PLAIN-01 and DOC-PLAIN-15 text, to resolve collisions.
Measure, do not cite:
- build a candidate deny-list (for example "please", "oops", "invalid", "click here", "OK" as a lone label), run it over the strings in the theme, the extension and both CLIs, and report true and false positives and precision per term;
- sample 50 images across the theme and the ocx and grimoire docs trees, and classify each alt text as missing, empty-and-decorative, redundant or informative;
- check the extension's `package.json` titles against the README and docs for drift.
Start from M090 to M099 and scout rows CD2, CD4, CD8, CD10, CD19, CD26, CD29, CD38, CD40, CG32, CS37, PI23 and PR45.
The deliverable must decide:
- the deny-list that survives a precision threshold;
- the label grammar, and case per surface, with the VS Code exception;
- the emoji and exclamation rule;
- the alt-text rule for UI and docs images, written so docs-quality can point to it;
- the docs-to-UI drift check;
- how the UI typography rule coexists with DOC-PLAIN-01.
Out of scope: whether a control has a name at all (UX-A11Y).
