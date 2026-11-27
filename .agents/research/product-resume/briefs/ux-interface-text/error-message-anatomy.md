# Commission: ux-interface-text / error-message-anatomy

Topic question: What must runtime interface text contain, and which words and string constructions must an agent never ship?

Investigate the required parts of an error, warning or diagnostic message, for GUI and CLI alike.
Primary sources to fetch:
- NN/g error message guidelines (https://www.nngroup.com/articles/error-message-guidelines/);
- the rustc diagnostics guide (https://rustc-dev-guide.rust-lang.org/diagnostics.html);
- the Heroku CLI style guide (https://devcenter.heroku.com/articles/cli-style-guide);
- clig.dev (https://clig.dev/);
- the GOV.UK error message component;
- the Primer content guidelines (https://primer.style/foundations/content);
- the O'Reilly piece behind FC27 (https://www.oreilly.com/radar/?p=19843), for the plain-language limit on errors and confirmations.
Measure, do not cite:
- score 20 error outputs from each of six exemplar CLIs (cargo, gh, uv, kubectl, terraform, deno or similar; clone or unpack under `~/.cache/research-lang/exemplars/product/`) with the four-part legend of `cli-first-run.md` (what, why, next step, input echoed);
- score the extension's 5 production `showErrorMessage` sites the same way;
- report the distributions.
Start from M084 to M089 and scout rows CD1, CD3, CD5 to CD7, CD33, CG9, DT7, DT21, DT22 and FC27.
The deliverable must decide:
- the mandatory parts and their order;
- the diagnostic shape for CLIs;
- when an error code and explain page are required;
- suggestion wording, and the rule that a suggested command must exist;
- the boundary between log lines and interface messages;
- the warning policy.
Out of scope: word deny-lists (next dive) and machine-readable errors (UX-AGENT).
