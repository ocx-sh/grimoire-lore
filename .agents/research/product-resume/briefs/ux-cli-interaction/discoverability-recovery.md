# Commission: ux-cli-interaction / discoverability-recovery

Topic question: Above the pinned stream, colour, prompt and exit contracts, what does a CLI owe a first-time human and an everyday user?

Investigate how a CLI helps a user who mistypes, cannot remember, or asks which version they have.
Primary sources to fetch:
- clig.dev;
- the clap docs for suggestions and `version` flags;
- the git `help.autocorrect` documentation;
- the cargo and gh behaviour on unknown commands;
- shell completion docs for clap_complete.
Measure, do not cite:
- for the same exemplar CLIs as the help-structure dive (reuse its install directory), run a typo at the top level, a typo at the subcommand level and a typo in a flag;
- run `--version` and `-V`, with the exit code and stdout;
- run a global flag before and after the subcommand;
- check whether completions install and are offered;
- record the outputs verbatim.
Start from M118 to M123 and scout rows DT3, DT4, DT8, CG34 and CG36, and the `cli-first-run.md` findings on `ocx --version` and `plugin_dispatch.rs:92`.
The deliverable must decide:
- the version rule;
- the typo rule (suggest at every layer; never auto-run without opt-in);
- the global-flag position rule;
- the completion offer;
- a binary test for each.
Out of scope: error wording (UX-TEXT).
