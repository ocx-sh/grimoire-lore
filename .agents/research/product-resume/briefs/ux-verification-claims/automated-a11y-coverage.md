# Commission: ux-verification-claims / automated-a11y-coverage

Topic question: What must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Investigate which of the 55 WCAG 2.2 A and AA success criteria an automated engine can decide, and set the fleet's automated configuration.
Primary sources to fetch:
- the axe-core rule descriptions and API docs (https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md, https://github.com/dequelabs/axe-core/blob/develop/doc/API.md);
- the axe-core release notes for the current version (https://github.com/dequelabs/axe-core/releases);
- the W3C ACT rules list (https://www.w3.org/WAI/standards-guidelines/act/rules/);
- Playwright accessibility testing (https://playwright.dev/docs/accessibility-testing);
- the Deque coverage report, labelled vendor data (https://www.deque.com/automated-accessibility-coverage-report/).
Measure, do not cite:
- run axe with default tags and with `wcag22aa` plus `target-size` on the built ocx.sh, grimoire.rs and one MkDocs site;
- record violations, `incomplete` and `inapplicable` counts per criterion;
- run Lighthouse on the same pages and list every axe violation a score of 100 still hides;
- map each of the six WebAIM Million 2026 categories (RS17) to the axe rule that detects it, so the UX-A11Y preempt list has a check per item;
- check whether eslint-plugin-jsx-a11y, an Astro lint plugin or anything else lints `.astro` files and HTML template strings in the VS Code webviews.
Start from M001 to M007 and M017, and scout rows AX1 to AX5, AX14, AX15, AX33, CS27, RM31, RS17 and FC17.
The deliverable must decide:
- the exact axe tag and rule set, and the CI tier it runs in;
- which criteria the gate covers, which it covers partly and which are human-only, as one table of 55 rows;
- whether a Lighthouse score may appear in a claim at all;
- which coverage figure, if any, the skill may quote, with its source and date.
Out of scope: authoring defaults (UX-A11Y) and the claims wording (the evidence-and-claims dive).
