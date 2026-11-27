# Commission: ux-a11y-authoring / focus-contrast-target-size

Topic question: Which accessibility properties must an agent build into interface code and page templates by default, and which ARIA and custom widgets must it refuse to write?

Investigate the visual accessibility floors an agent must meet in CSS and components: focus indicators, contrast, target size and colour-only cues.
Primary sources to fetch:
- WCAG 2.2 Understanding for 2.4.7, 2.4.11, 2.4.13, 1.4.3, 1.4.11, 1.4.1, 2.5.8 and 2.5.5 (https://www.w3.org/WAI/WCAG22/Understanding/);
- the GOV.UK focus states page (https://design-system.service.gov.uk/get-started/focus-states/);
- Primer size primitives (https://primer.style/product/primitives/size/);
- the APCA repository, as non-normative (https://github.com/Myndex/apca-w3);
- Roselli on WCAG 3 contrast (https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html);
- WebAIM Million 2026 (https://webaim.org/projects/million/): low contrast is the most common detected failure, on 83.9 percent of home pages (RS17).
Measure, do not cite:
- rerun the `ui-code-posture.md` contrast script on both themes of the theme package and of the Grimoire docs, including borders and focus rings;
- compute the rendered size of every control token, applying the 24 px spacing exception;
- trace `command-bar.css:141-143`;
- grep for colour-only status in the theme and webviews.
Start from M039 to M044 and scout rows CS1 to CS3, CS12 to CS14, AX6, AX7, AX21, AX31, CG3, CG4, CG17, PI8, PI10, RS4, RS5, RS17, RS25, RS34, PR28, PR29, PR31, FC1, FC21 and FCf1.
The deliverable must decide:
- the focus rule, with a Detect line that does not flag `outline:none` when a replacement exists;
- the contrast pairs to check and their thresholds;
- the target-size floor per surface (web, touch, editor webview), with the exceptions stated;
- the colour-plus-second-cue rule.
Out of scope: token architecture (css-theming).
