# Commission: ux-cli-interaction / help-structure

Topic question: Above the pinned stream, colour, prompt and exit contracts, what does a CLI owe a first-time human and an everyday user?

Investigate the shape of top-level and subcommand help.
Primary sources to fetch:
- clig.dev (https://clig.dev/);
- the GitHub CLI syntax guide (https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md);
- the Heroku CLI style guide;
- the clap documentation for help templates and `help_heading`;
- the catalog's CLI-12 text.
Measure, do not cite:
- for at least 12 exemplar CLIs (git, cargo, gh, uv, npm, docker, kubectl, terraform, deno, rustup, brew, fly or similar, installed or run from release archives under the cache directory, which discoverability-recovery reuses), record:
  - line counts of `--help` and of bare invocation;
  - examples count;
  - grouping;
  - position of the most common command;
  - whether `-h` works after other arguments;
- compare with ocx 0.6.8 and grim 0.16.0.
Start from M112 to M117 and scout rows DT1, DT2, DT19, CD32, CG35, PR43, RM9 and PI34.
The deliverable must decide:
- the help skeleton (order of sections, examples first or not, grouping, length budget);
- bare-invocation behaviour;
- the command-grammar rule;
- a check that runs the binary and asserts these.
Out of scope: description line length (CLI-12).
