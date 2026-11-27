# Commission: ux-cli-interaction / first-run-and-handoff

Topic question: Above the pinned stream, colour, prompt and exit contracts, what does a CLI owe a first-time human and an everyday user?

Investigate what a CLI and its installer owe a new user from install to first success.
Primary sources to fetch:
- clig.dev;
- the installer pages and first-run output of uv, rustup, deno, bun and gh;
- the fleet's `installer-script` skill text;
- `site-shape.md` on how grim's install page starts with ocx's installer.
Measure, do not cite:
- in a clean container, time from the documented install command to the first useful output for ocx, grim and four exemplars;
- record each installer's final lines and each CLI's output with no config present;
- count copy-paste steps.
Start from M124 to M126 and scout rows DT35, DT36, OC2, OC38 and PR44.
The deliverable must decide:
- the installer's final-line rule (name the first command);
- the empty-config output rule;
- a time-to-first-success budget and how it is measured;
- which half belongs in `installer-script` and which in the new CLI reference.
Out of scope: docs quickstarts (docs-quality) and marketing install pages (marketing).
