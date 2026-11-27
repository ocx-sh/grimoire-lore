# Commission: ux-verification-claims / rendered-interaction-matrix

Topic question: What must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Investigate the minimum rendered and interactive pass an agent must run after a UI change, beyond static checks.
Primary sources to fetch:
- WCAG 2.2 Understanding pages for 1.4.10 Reflow, 1.4.4 Resize Text, 2.4.7, 2.4.11 and 2.1.2 (https://www.w3.org/WAI/WCAG22/Understanding/);
- GOV.UK testing with assistive technologies (https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies);
- the WebAIM screen reader survey (https://webaim.org/projects/screenreadersurvey10/);
- Playwright docs for keyboard, emulated media and forced colours.
Measure, do not cite:
- write and run one Playwright script against the theme's dev build that covers 320 CSS px width, zoom at 200 and 400 percent, light and dark, forced colours, reduced motion, and a Tab walk;
- the Tab walk records each focused element's name and whether its focus ring is visible and unobscured;
- report what it finds on three real pages, and time the run.
Start from M008 to M010, M049 and scout rows RS16, RS28, FC21, CS15, CS17 and AX16.
The deliverable must decide:
- the matrix of conditions and the pass condition for each;
- which conditions run in CI and which run in the review skill;
- which screen reader and browser pairs a human pass uses, and when;
- the script, committed under the skill's `checks/` folder.
Out of scope: token contrast values (css-theming), the axe configuration (the automated-a11y-coverage dive) and page landmarks (UX-A11Y page-structure-and-consistency).
