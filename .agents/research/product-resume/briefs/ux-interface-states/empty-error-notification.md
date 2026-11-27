# Commission: ux-interface-states / empty-error-notification

Topic question: Which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

Investigate the required states of a data view and the choice of non-modal message channel.
Primary sources to fetch:
- NN/g empty states (https://www.nngroup.com/articles/empty-state-interface-design/);
- Primer empty states and notification messaging (https://primer.style/product/ui-patterns/empty-states/, https://primer.style/product/ui-patterns/notification-messaging/);
- the Vercel guidelines on all states;
- the GOV.UK notification banner component (https://design-system.service.gov.uk/components/notification-banner/).
Measure, do not cite:
- list every data view in the theme (search, package lists, catalog renderers) and in the webviews (sidebar, details, settings);
- for each, record which of loading, empty, error, partial, offline and overflow it renders;
- force each missing state and screenshot the result.
Start from M062 to M064 and scout rows CG14, CD13, CS29, CS30, FC16, OC7, PI12, PI13 and PI29.
The deliverable must decide:
- the state matrix every data view must satisfy;
- the empty-state contents, separated from loading;
- the banner, inline or toast decision table, with persistence and timeout rules;
- how a review detects a missing state.
Out of scope: error wording (UX-TEXT), VS Code native surfaces (editor-extension-surfaces) and when a modal is justified (UX-ACT confirmations-and-modals).
