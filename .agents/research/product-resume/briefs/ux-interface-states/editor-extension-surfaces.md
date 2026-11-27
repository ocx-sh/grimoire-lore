# Commission: ux-interface-states / editor-extension-surfaces

Topic question: Which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

Investigate which native VS Code surface an extension should use for which message and state.
Primary sources to fetch:
- the VS Code UX guidelines pages for notifications, quick picks, status bar, views, webviews and progress (locate them under code.visualstudio.com/api/ux-guidelines);
- the VS Code API reference for `window.withProgress`, the message functions and `WebviewView`;
- `grimoire-rs/vscode/CLAUDE.md`.
Measure, do not cite:
- reproduce the counts in "Measurements made for this map";
- classify each of the 183 message calls by severity, whether it offers actions, and whether a native surface (status bar, progress notification, inline view state) fits better;
- list each long-running extension-host operation and whether it reports native progress;
- check whether the webviews follow the VS Code theme tokens and keyboard model.
Start from M066 and the measurements table; this dive has no scout rows, because no scout covered editor extensions.
The deliverable must decide:
- the surface decision table for an editor extension;
- the notification budget;
- the native progress rule, taking the wait thresholds from the NN/g response-time page so the consolidator can align it with loading-and-progress;
- which rules apply to webviews as web UI (UX-A11Y and UX-STATE) and which to native surfaces;
- how the rule loads on extension sources.
Out of scope: the 6 modal sites and destructive confirmations (UX-ACT confirmations-and-modals) and indicators inside webview HTML (loading-and-progress).
