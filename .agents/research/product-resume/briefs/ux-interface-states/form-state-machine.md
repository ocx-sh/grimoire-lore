# Commission: ux-interface-states / form-state-machine

Topic question: Which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

Investigate the behaviour of forms: labels, validation timing, error placement and focus, preserved input and submit state.
Primary sources to fetch:
- the GOV.UK validation pattern, error message and error summary pages (https://design-system.service.gov.uk/patterns/validation/, https://design-system.service.gov.uk/components/error-message/, https://design-system.service.gov.uk/components/error-summary/);
- NN/g on form errors (https://www.nngroup.com/articles/errors-forms-design-guidelines/);
- Smashing on inline validation (https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/);
- the Baymard inline-validation article cited in PR36;
- WCAG 2.2 Understanding for 3.3.1, 3.3.3 and 1.3.5.
Measure, do not cite:
- inventory every form and input in the theme and the extension (settings, rating, vote, input boxes);
- record label source, validation trigger, error placement, `aria-describedby`, focus after a failed submit, preserved input and the submit `disabled` logic.
Start from M067 and M073 to M078 and scout rows CG5, CG8, CG18, CD15 to CD17, CS19, CS20, PI3, PI4, FC15, OC12 and PR36 to PR39.
The deliverable must decide:
- one default validation timing, and the exceptions;
- the error placement and focus rule;
- the never-pre-disable rule;
- the required and optional marking;
- a Detect line for each.
Out of scope: error message wording (UX-TEXT error-message-anatomy) and long-form or wizard design (deferred).
