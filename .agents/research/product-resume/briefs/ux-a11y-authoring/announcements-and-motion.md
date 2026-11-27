# Commission: ux-a11y-authoring / announcements-and-motion

Topic question: Which accessibility properties must an agent build into interface code and page templates by default, and which ARIA and custom widgets must it refuse to write?

Investigate how agent-written UI must announce discrete state changes and handle motion. This dive owns the live-region harness; streaming output is UX-AI conversation-mechanics, and the announced words are UX-TEXT.
Primary sources to fetch:
- WCAG 2.2 Understanding for 4.1.3 Status Messages (https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), 2.3.3 Animation from Interactions (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), 2.2.2 and 2.3.1;
- the APG switch and button patterns, for pressed state;
- Primer motion and animation (https://primer.style/accessibility/design-guidance/motion-and-animation/) and Carbon motion (https://carbondesignsystem.com/elements/motion/overview/);
- MDN View Transition API (https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API);
- the Guidepup virtual screen reader (https://github.com/guidepup/virtual-screen-reader). Record its version, and what its docs say about live regions and about fidelity: its README says it augments, not replaces, real screen-reader testing.
Measure, do not cite:
- count `animation`, `transition`, `transition: all` and view-transition uses against `prefers-reduced-motion` blocks in the theme, the Grimoire docs and the webviews;
- under the cache directory, write a Vitest test that mounts the theme's copy button, theme switch and command bar markup, activates each, and records the virtual screen reader's spoken-phrase log, including double announcements;
- if the tool does not log live-region output, say so, assert the DOM contract instead (role, `aria-live`, `aria-atomic`, region present before the update), and label every spoken-output claim UNVERIFIED.
Start from M045 to M048 and scout rows AX17, AX18, PI9, CS10, CS11, CS39, RS11, PR35 and FC22.
The deliverable must decide:
- the live-region rule (which role for which event, one region per page, no `alert` for success);
- the state-exposure rule for toggles;
- the reduced-motion rule, with a Detect line;
- the autoplay and flashing limits;
- the harness, committed under the skill's `checks/` folder.
