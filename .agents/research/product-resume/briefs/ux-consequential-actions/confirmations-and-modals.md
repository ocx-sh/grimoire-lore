# Commission: ux-consequential-actions / confirmations-and-modals

Topic question: When does an action need confirmation, undo, a dry run, typed confirmation, human approval or nothing, whether it is clicked, typed or called by an agent?

Investigate confirmation versus undo in graphical UI, and when a modal dialog is justified at all. This dive owns the extension's 6 `modal: true` sites.
Primary sources to fetch:
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/) and NN/g on modal and nonmodal dialogs (https://www.nngroup.com/articles/modal-nonmodal-dialog/);
- the APG alertdialog pattern (https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/);
- the GOV.UK button guidance on warning buttons;
- the Vercel guidelines on destructive actions;
- the FCC Public Safety and Homeland Security Bureau report on the 2018 Hawaii false alert (locate it on fcc.gov; the scouts had only the Wikipedia summary);
- the VS Code API reference for the `modal` message option.
Measure, do not cite:
- read the 6 `modal: true` sites and every delete, uninstall, overwrite or reset action in the extension and the theme;
- for each, record reversibility, frequency, whether it needs a modal by the NN/g criteria, confirmation wording, default button and whether undo exists.
Start from M065 and M144 to M147, and scout rows CG11, CG19, CG26, CS21, CD11, CD37, PI11, PR42, FC5, FC6 and FCf6.
The deliverable must decide:
- the severity tiers and the required treatment for each;
- when a modal is allowed, for GUI and for VS Code;
- the confirmation wording rule (name the object and outcome; verb labels) and the default-button rule;
- live and test mode separation;
- the way-out rule.
Out of scope: CLI and agent actions (next dives) and non-modal channels (UX-STATE empty-error-notification).
