# Commission: ux-interface-states / loading-and-progress

Topic question: Which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

Investigate the feedback ladder for web and webview UI: response-time budgets, the choice of indicator, click acknowledgement and double-submit protection.
Primary sources to fetch:
- NN/g response times (https://www.nngroup.com/articles/response-times-3-important-limits/) and skeleton screens (https://www.nngroup.com/articles/skeleton-screens/);
- Primer loading (https://primer.style/product/ui-patterns/loading/);
- web.dev INP (https://web.dev/articles/inp);
- the Vercel web interface guidelines (https://github.com/vercel-labs/web-interface-guidelines);
- the catalog's own CLI-08, CLI-16 and TUI-23 text, for alignment.
Measure, do not cite:
- in the theme and inside the webviews' HTML, find every async action (fetch, `postMessage` round-trip, command);
- record whether each shows an in-page indicator, when it appears, and whether repeat activation is blocked;
- time three real actions with throttled network.
Start from M058 to M061 and scout rows CG12, CG13, CG22, CG23, CS8, CS20, PI1, PI2 and AI26.
The deliverable must decide:
- the indicator ladder by expected wait, aligned with TUI-23 so the web and terminal ladders do not contradict each other;
- the acknowledgement deadline;
- the double-submit rule;
- a Detect line for each.
Out of scope: empty and error content (next dive), CLI progress (covered by CLI-08), and native VS Code progress through `window.withProgress` (editor-extension-surfaces).
