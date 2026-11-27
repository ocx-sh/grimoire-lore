# Commission: ux-consequential-actions / cli-destructive-commands

Topic question: When does an action need confirmation, undo, a dry run, typed confirmation, human approval or nothing, whether it is clicked, typed or called by an agent?

Investigate mutating and destructive commands in a CLI, including what happens when an agent runs one twice. This dive owns the mutating-command inventory.
Primary sources to fetch:
- clig.dev on robustness and confirmation;
- the terraform plan and apply, kubectl `--dry-run`, git `clean -n`, and gh repo delete confirmation docs;
- the catalog's CLI-09 text.
Measure, do not cite:
- for three exemplars and for ocx and grim, list every mutating command; use a throwaway `HOME` and project directory under the cache directory, never a real config;
- run each with stdin closed and with no TTY, and record whether it prompts, fails or proceeds;
- record whether it offers `--dry-run`, requires typed confirmation for severe actions, and prints what changed;
- run each a second time, and record whether it reports "already done", repeats the change, or fails, with the exit code, and whether a status command can confirm the end state.
Start from M148 and M156, and scout rows DT5, DT31, CD12 and FC28.
The deliverable must decide:
- the CLI severity tiers (mild, moderate, severe), with the required flag and prompt behaviour for each;
- the dry-run rule and the typed-confirmation rule;
- the "print what changed" rule;
- the idempotency and "already done" rule, with its exit code;
- a binary test using closed stdin and a repeat run.
Out of scope: error classes and machine-readable errors (UX-AGENT correctable-errors-and-retries).
