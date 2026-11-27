# Commission: ux-a11y-authoring / native-widgets-and-keyboard

Topic question: Which accessibility properties must an agent build into interface code and page templates by default, and which ARIA and custom widgets must it refuse to write?

Investigate when an agent must use a native element, and the exact keyboard and name contract when it cannot.
Primary sources to fetch:
- the WAI-ARIA APG patterns, read-me-first and each pattern the fleet uses: dialog, tabs, combobox, listbox, menu button, disclosure, switch, toolbar (https://www.w3.org/WAI/ARIA/apg/patterns/);
- ARIA in HTML (https://www.w3.org/TR/html-aria/);
- MDN for the Popover API and Invoker Commands (https://developer.mozilla.org/en-US/docs/Web/API/Popover_API, https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API);
- Primer on links and buttons (https://primer.style/accessibility/design-guidance/links-and-buttons/);
- the VS Code webview UX guidelines (locate them on code.visualstudio.com);
- WebAIM Million 2026 (https://webaim.org/projects/million/), as the ranking input: missing labels, empty links and empty buttons are three of the six categories that make up 96 percent of detected errors (RS17).
Measure, do not cite:
- inventory every interactive custom widget in `ocx-sh/website/packages/theme` and `grimoire-rs/vscode/src/views`;
- for each, record its element, role, name source and keyboard handling;
- count click handlers on non-interactive elements, redundant roles, unlabelled inputs, empty links and empty buttons.
Start from M017, M028 to M037 and M049, and scout rows AX9 to AX13, AX30, CG1, CG2, CG24, CS14, CS15, CS22, FC2 to FC4, FCf2, FCf8, PI25, RS8, RS13, RS17, RS18 and PR33.
The deliverable must decide:
- the native-first list ("use X, never hand-build Y"), ordered by the RS17 ranking;
- the ARIA never-write list, with a Detect line for each;
- the keyboard contract per pattern;
- the accessible-name rule for icon controls, and links versus buttons;
- which `ocx-theme-*` rows are absorbed into the catalog.
Out of scope: the wording of names (UX-TEXT), focus styling (next dive) and page landmarks and headings (page-structure-and-consistency).
