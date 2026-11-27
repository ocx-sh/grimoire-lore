# Commission: ux-cli-interaction / terminal-accessibility

Topic question: Above the pinned stream, colour, prompt and exit contracts, what does a CLI owe a first-time human and an everyday user?

Investigate accessibility duties for terminal output.
Primary sources to fetch:
- WCAG2ICT for WCAG 2.2 (https://www.w3.org/TR/wcag2ict-22/);
- the no-color spec (https://no-color.org/) and the FORCE_COLOR and CLICOLOR conventions (locate their primary pages);
- GitHub CLI accessibility notes and its accessibility settings docs (locate them on cli.github.com or github.blog);
- the WebAIM screen reader survey;
- the catalog's CLI-07 and TUI-22 text.
Measure, do not cite:
- run ocx and grim with each colour variable combination, piped and on a TTY, and record escape-code presence and the effective precedence;
- capture a spinner's raw byte stream with `script -q -c '<command>' <file>` (util-linux), and count carriage-return redraws and cursor-control sequences per second; this is what a terminal screen reader receives;
- check whether the output uses the 16 base colours or fixed indices.
No real terminal screen reader can run here. Any statement about what is spoken comes from a cited source or is labelled UNVERIFIED.
Start from M057 and M127 to M131 and scout rows DT10 to DT13, DT24, AX19 to AX23, CD31 and RS29.
The deliverable must decide:
- the colour precedence table, aligned with CLI-07;
- the spinner fallback rule, with a byte-stream check;
- the palette rule, and the meaning-without-colour rule for CLI output;
- which WCAG2ICT criteria the CLI reference cites;
- the TUI screen-reader stance.
