---
title: Terminal accessibility for CLI and TUI output (colour precedence, spinner fallback, palette, WCAG2ICT citations, TUI screen-reader stance)
program: product
sub_program: ux
topic: ux-cli-interaction
worker: terminal-accessibility
date_researched: 2026-11-27
model: sonnet
sources_fetched: 17
scope: >
  Covers what a command-line tool owes a person using a screen reader, low vision, colour-vision difference or a
  forced terminal palette, above the pinned stream/exit/prompt contracts: colour variable precedence, animated
  progress fallback, palette, meaning without colour, which WCAG2ICT criteria to cite, and the TUI stance. Measured
  on ocx 0.6.8 and grim 0.16.0 on Linux (WSL2 host, `script` from util-linux, a Python pty). Does not cover
  accessibility law (legal scope is a human decision), web docs accessibility (docs-quality owns it), or what any
  real screen reader speaks (no screen reader could run here; every such statement is cited or marked UNVERIFIED).
---

# Terminal accessibility for CLI and TUI output

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What a terminal screen reader receives](#1-what-a-terminal-screen-reader-receives)
   2. [WCAG2ICT: what it does and does not say about terminals](#2-wcag2ict-what-it-does-and-does-not-say-about-terminals)
   3. [Colour variables: the specs and where they disagree](#3-colour-variables-the-specs-and-where-they-disagree)
   4. [Measured colour precedence of ocx and grim](#4-measured-colour-precedence-of-ocx-and-grim)
   5. [Measured spinner and progress byte streams](#5-measured-spinner-and-progress-byte-streams)
   6. [Palette: base 16 slots versus fixed indices](#6-palette-base-16-slots-versus-fixed-indices)
   7. [Meaning without colour](#7-meaning-without-colour)
   8. [What GitHub CLI shipped, as the reference implementation](#8-what-github-cli-shipped-as-the-reference-implementation)
   9. [TUI screen-reader stance](#9-tui-screen-reader-stance)
   10. [Catalog text, CLI-07 and TUI-22](#10-catalog-text-cli-07-and-tui-22)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Unfetched and unverified](#unfetched-and-unverified)
9. [Sources](#sources)

## Summary

- A terminal screen reader receives the character stream the terminal renders, not the program's intent. WCAG2ICT Appendix B says assistive technology "scan[s] for screen refreshes and updates and then apply[s] heuristics to what had changed" ([WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/), W3C Group Note 11 Dec 2025). A redraw in place is therefore noise to it.
- The decision on colour order is: explicit `--color` flag, then `NO_COLOR` (non-empty), then `CLICOLOR_FORCE` or `FORCE_COLOR`, then `CLICOLOR=0`, then `TERM=dumb`, then a per-stream TTY check. This matches the CLI-07 text and what ocx and grim do except for three measured gaps (items below).
- Measured on grim 0.16.0: log lines on piped stderr carry ANSI escapes. Only `NO_COLOR` removes them. `--color=never`, `CLICOLOR=0` and `TERM=dumb` do not. This breaks CLI-07's "decided per destination stream".
- Measured on ocx 0.6.8 and grim 0.16.0: neither honours `FORCE_COLOR` (piped output stays plain). Two specs ask for it ([force-color.org](https://force-color.org/), [bixense CLICOLOR](https://bixense.com/clicolors/)); a third (GitHub CLI manual) does not list it.
- Measured: ocx draws its download bar at 22 to 44 bare carriage returns and 50 to 104 cursor-control sequences per second on a TTY, and `NO_COLOR=1`, `--color=never` and `CI=1` do not stop it. Only `TERM=dumb`, `--quiet` and a non-TTY stderr do. Colour policy and animation policy are separate switches today.
- Measured: grim's bar is a one-line `[####] 1/1` bar redrawn on count change (2 bare CRs in a 0.5 s run). `TERM=dumb` and `NO_COLOR` do not stop it; `--progress none` and `--progress json` do.
- Spinner fallback rule: animate only when stderr is a TTY and `TERM` is not `dumb` and an accessibility opt-out is not set; otherwise print append-only lines at phase boundaries. Check by capturing with `script` and asserting zero bare CR and zero cursor CSI in the fallback mode.
- Palette rule: take colour from the 16 ANSI slots (SGR 30-37, 90-97, or `38;5;0..15`), never from fixed indices 16-255 or truecolor for meaning. Measured: ocx `about` emits `38;5;203` (21 sequences); everything else in ocx, grim and `grim tui` stays on slots.
- Meaning-without-colour rule: every colour-coded state also carries a text label or glyph. Measured: ocx and grim errors read `error: ...` in text; grim tables carry a `State` column of words. Under `NO_COLOR=1` the meaning survives.
- Cite these WCAG2ICT criteria in a CLI reference, as informative mappings only: 1.4.1 Use of Color, 1.3.3 Sensory Characteristics, 1.4.3 Contrast (Minimum, with the terminal-controls-background caveat), 2.2.2 Pause, Stop, Hide (for auto-updating output), 4.1.3 Status Messages. WCAG2ICT is a Note, not a standard; no source names a CLI conformance level.
- GitHub CLI is the shipped reference: `gh a11y` (v2.72.0, 1 May 2025) adds an accessible prompter (numbered lists), a 4-bit accessible palette, and a text progress indicator in place of the braille spinner, each behind its own setting.
- TUI stance: a screen-reader path exists or the TUI is not the only path. Every TUI feature stays reachable as a plain subcommand, and the TUI offers a linear mode with no alternate screen, no animation, no soft highlight bars. Measured: `grim tui` enters the alternate screen (`ESC[?1049h`) and has no accessibility flag in `--help`.
- No source in this round gives a verified spoken-output result for any of these tools. Anything about "what NVDA says" below is cited or flagged UNVERIFIED.

## Findings

### 1. What a terminal screen reader receives

WCAG2ICT Appendix B (W3C Group Note, 11 December 2025; [source](https://www.w3.org/TR/wcag2ict-22/)):

- A terminal emulator "acts as the user agent for text-based applications" (B.3).
- Two tasks make a text application accessible to assistive technology: capture all displayed text, and analyse it to detect updates and infer structure. A reader may infer layout and input fields from spacing, indentation, inverse video, brackets and graphics characters (B.2).
- Soft cursors and highlight bars can break techniques that depend on finding the text input cursor and can cause failures (B.3).
- Many terminals let the user force one foreground and background colour for all text, overriding the application's colours (B.3).

What this means for output: the contract with an assistive-technology user is the stream of characters and the position of the real cursor. In-place redraws, cursor-up sequences and decorative characters are part of that stream.

Independent evidence of the failure (user reports, not measurements of speech):

- An open issue on opencode, filed 28 July 2026, reports that in-place spinners "rewrite the same terminal line, so NVDA reports duplicated content", that a startup ASCII banner is announced on every refresh, and that the alternate screen buffer leaves scrollback empty so the review cursor reads only what is currently painted ([anomalyco/opencode#39368](https://github.com/anomalyco/opencode/issues/39368); a user report, state open at fetch time).
- A screen-reader user guide from Nathan Tech (page last updated 12 April 2025) advises turning NVDA's "Report dynamic content changes" off while a build runs and reviewing the output afterwards with the review cursor ([Nathan Tech](https://www.nathantech.net/products/developer/screen-reader-command-line.php); an individual vendor's guide).
- A search snippet, not a fetched page, cites an ACM CHI 2021 paper "Accessibility of Command Line Interfaces" as finding that status and progress indication may not be screen-reader friendly. The ACM page returned HTTP 403, so this is UNVERIFIED here; see [Unfetched and unverified](#unfetched-and-unverified).

WebAIM's screen reader survey #10 (December 2023 to January 2024, 1,539 valid responses, results updated 22 Feb 2024) gives the reader population: NVDA used by 65.6% and JAWS by 60.5% of respondents on desktop (multiple answers allowed), VoiceOver 43.9%, Narrator 37.3%, Orca 8.3% ([WebAIM](https://webaim.org/projects/screenreadersurvey10/); independent study, not terminal-specific; the page has no question on command-line use). Use it only to say that the windows readers (NVDA, JAWS, Narrator) outnumber Orca by a wide margin among respondents; do not use it to size terminal users.

### 2. WCAG2ICT: what it does and does not say about terminals

Source status: "informative guidance (guidance that is not normative and does not set requirements)", endorsed by the Accessibility Guidelines Working Group but not by W3C itself ([WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/), Group Note, 11 Dec 2025). The only terminal-specific text is Appendix B; the per-criterion notes for the criteria below contain no terminal text.

| Criterion | WCAG2ICT says (non-web software) | Use in a CLI reference |
|---|---|---|
| 1.4.1 Use of Color | "applies directly as written"; no software note | Cite. The rule maps to: colour is never the only channel for meaning. |
| 1.3.3 Sensory Characteristics | "applies directly as written"; no software note | Cite. Instructions must not rely on colour, position ("the red line above") or shape alone. |
| 1.4.3 Contrast (Minimum) | Note: see Comments on Closed Functionality | Cite with the caveat that the terminal, not the CLI, paints the background (B.3). The CLI controls only which slot it asks for. |
| 2.2.2 Pause, Stop, Hide | no software note; general Note 5: "Any content, even if just decorative, that is updated automatically, blinks, or moves may create an accessibility barrier." | Cite for animated progress. The mapping of a spinner onto this criterion is this artifact's inference; WCAG2ICT does not name spinners. |
| 4.1.3 Status Messages | Note 1: "there is still a user need to have status messages be programmatically exposed"; Note 9 covers closed functionality | Cite for progress and completion messages: a status must end up as readable text in the stream. |
| 4.1.2 Name, Role, Value | Note 2: "primarily for software developers who develop or use custom user interface components"; Note 3 prefers platform accessibility services | Do not cite for plain CLI output. Relevant to a TUI only if it builds custom widgets. |
| 1.4.10 Reflow, 1.4.12 Text Spacing | non-web software "needs to implement their own mechanisms" for spacing; reflow is "encouraged" | Do not cite. The terminal owns font size, spacing and wrapping. |
| 2.3.1 Three Flashes | applies to flashing "caused by the ICT" | Cite only for anything that blinks. Do not blink. |

GitHub's own conformance report for its CLI claims WCAG 2.2 Level A and AA and lists 1.4.1, 1.4.3, 2.2.2, 4.1.2, 1.3.1 and 2.1.1 as "Supports", with an empty remarks column and a last-updated date of 8 September 2026 ([GitHub conformance report](https://accessibility.github.com/conformance/cli/); vendor self-assessment, and it does not mention WCAG2ICT). It shows that a vendor claims criteria conformance for a CLI; it is not evidence that the claim holds.

### 3. Colour variables: the specs and where they disagree

| Variable | Rule as stated | Source (date) | Authority |
|---|---|---|---|
| `NO_COLOR` | "Command-line software which adds ANSI color to its output by default should check for a `NO_COLOR` environment variable that, when present and not an empty string (regardless of its value), prevents the addition of ANSI color." | [no-color.org](https://no-color.org/) (page updated 2026-11-25; proposed 2017) | community spec |
| `CLICOLOR` | When set and `NO_COLOR` and `CLICOLOR_FORCE` are unset, colour "should be used when the program is writing to a terminal" | [bixense.com/clicolors](https://bixense.com/clicolors/) (page marked deprecated, no date) | community spec |
| `CLICOLOR_FORCE` | If set and `NO_COLOR` unset, "ANSI colors should be enabled no matter what", terminal or not | same page | community spec |
| `FORCE_COLOR` | "When this variable is present and not an empty string (regardless of its value), it should force the addition of ANSI color." | [force-color.org](https://force-color.org/) (no date) | community spec |
| `FORCE_COLOR` (Node) | 0 disables, 1 gives 16, 2 gives 256, 3 gives 16,777,216 colours; `NO_COLOR` and `NODE_DISABLE_COLORS` also disable | [Node.js tty docs](https://nodejs.org/api/tty.html) (current docs) | runtime vendor docs |
| `TERM=dumb` | disable colour | [clig.dev](https://clig.dev/) (no date on page) | community guide |

Where they disagree:

- bixense says `NO_COLOR` outranks `CLICOLOR_FORCE` and says to treat `FORCE_COLOR` as an alias of `CLICOLOR_FORCE`, so `NO_COLOR` wins over `FORCE_COLOR`. force-color.org's example implementation sets colour off for `NO_COLOR` first and then back on for `FORCE_COLOR`, so `FORCE_COLOR` wins. This is an unresolved split; see [Contested](#contested--evolving).
- The GitHub CLI manual defines `NO_COLOR` as "set to any value" (no empty-string carve-out), `CLICOLOR=0` as disable and `CLICOLOR_FORCE` "set to a value other than 0" as keep colour when piped ([gh environment help](https://cli.github.com/manual/gh_help_environment)). It does not list `FORCE_COLOR`. The empty-value rule for `NO_COLOR` therefore differs between the spec and gh.
- clig.dev says to check each stream individually ("It's best to individually check") and not to animate when stdout is not an interactive terminal ([clig.dev](https://clig.dev/)).

### 4. Measured colour precedence of ocx and grim

Commands: each cell is the count of lines carrying an SGR escape (`ESC[...m`) after running the command with the shown environment. "pipe" is `env <vars> <cmd> 2>&1 </dev/null | cat`. "tty" is `script -q -c 'env <vars> <cmd>' <file>` (util-linux), which gives the child a pseudo-terminal. Driver: `/tmp/ta/m.sh` (bash, scratch). ocx 0.6.8, command `ocx about`; grim 0.16.0, command `grim --help`. Run 2026-11-27.

| Environment | ocx pipe | ocx tty | grim pipe | grim tty |
|---|---|---|---|---|
| none | 0 | 22 | 0 | 49 |
| `NO_COLOR=1` | 0 | 0 | 0 | 0 |
| `NO_COLOR=` (empty) | 0 | 22 | 0 | 49 |
| `CLICOLOR=0` | 0 | 0 | 0 | 0 |
| `CLICOLOR=1` | 0 | 22 | 0 | 49 |
| `CLICOLOR_FORCE=1` | 22 | 22 | 49 | 49 |
| `FORCE_COLOR=1` | 0 | 22 | 0 | 49 |
| `NO_COLOR=1 CLICOLOR_FORCE=1` | 0 | 0 | 0 | 0 |
| `NO_COLOR=1 FORCE_COLOR=1` | 0 | 0 | 0 | 0 |
| `CLICOLOR=0 CLICOLOR_FORCE=1` | 22 | 22 | 49 | 49 |
| `TERM=dumb` | 0 | 0 | 0 | 0 |
| `TERM=dumb CLICOLOR_FORCE=1` | 22 | 22 | 49 | 49 |
| `NO_COLOR=1` plus flag `--color=always` | colour (flag wins) | colour | colour | colour |
| `CLICOLOR_FORCE=1` plus flag `--color=never` | 0 | 0 | 0 | 0 |

Effective precedence observed, highest first, for both tools: explicit `--color` flag; `NO_COLOR` non-empty; `CLICOLOR_FORCE`; `CLICOLOR=0`; `TERM=dumb`; TTY check. `--help` text of both says the flag outranks the variables (`ocx --help`: "An explicit `--color` outranks `NO_COLOR`, `CLICOLOR` and `CLICOLOR_FORCE`"; `grim --help`: "honoring `NO_COLOR` / `CLICOLOR*` / `TERM=dumb`"). Measurement matches both. Observed `FORCE_COLOR` has no effect on either tool.

(The "NO_COLOR=1 plus --color=always" row for ocx was re-measured with the flag before the subcommand: `ocx --color=always about` gave 60 SGR sequences on 22 lines. See the flag-position defect below.)

Measured defects against that table:

1. **grim log lines ignore the colour flag and most variables.** Command: `grim install 2>&1 >/dev/null </dev/null | <count ESC>` with stdout discarded and stderr piped. Results, ESC bytes on piped stderr: none = 8; `NO_COLOR=1` = 0; `CLICOLOR=0` = 8; `TERM=dumb` = 8; `FORCE_COLOR=1` = 8; `--color=never` = 8. A tracing `WARN` line carries `ESC[2m`, `ESC[33m` while stderr is a pipe. Only `NO_COLOR` turns it off. That makes the colour decision not per destination stream and not governed by `--color`, which CLI-07 requires.
2. **`FORCE_COLOR` is ignored by both tools** (rows above). Low severity; the spec is not unanimous (see Contested).
3. **ocx `--color` is accepted only before the subcommand.** `ocx about --color=always` fails: `error: unexpected argument '--color' found`, and that error is itself coloured (14 SGR sequences, red and green) even with `NO_COLOR=1` in the environment and a pipe on stderr. Because the flag was parsed into the argument list, treating it as an explicit request is defensible; the user-visible fact is that the flag position matters and the usage error path does not follow the same resolver. The `--help` text says only "An explicit `--color`".

### 5. Measured spinner and progress byte streams

Method (task command): capture with `script -q -c '<command>' <file>`; count bare carriage returns (`\r` not followed by `\n`) and CSI sequences whose final byte is one of `A B C D G H J K l h s u` (cursor movement, erase, mode). Driver: `/tmp/ta/var.sh` and `/tmp/ta/bytes.py` (scratch). Workload for ocx: `ocx --remote package pull ocx.sh/anchore/grype` into a fresh `OCX_HOME`, a 24.37 MiB layer. Wall time varies with the network, so rates are given with the wall time; counts are the stable number. grim workload: `grim install` of a one-skill project (cache-fast, so the redraw count is tiny).

ocx 0.6.8 (run 2026-11-27):

| Variant | Wall | Bytes | Bare CR (per s) | Cursor CSI (per s) | SGR |
|---|---|---|---|---|---|
| default, pty | 5.93 s | 14,024 | 147 (24.8) | 343 (57.8) | 13 |
| `NO_COLOR=1` | 3.61 s | 13,430 | 141 (39.0) | 329 (91.0) | 0 |
| `TERM=dumb` | 5.28 s | 693 | 0 | 0 | 0 |
| `CI=1` | 6.91 s | 14,295 | 150 (21.7) | 350 (50.6) | 13 |
| `--quiet` | 3.91 s | 525 | 0 | 0 | 4 |
| `--color=never` | 3.73 s | 13,986 | 147 (39.5) | 343 (92.1) | 0 |
| first capture, pty | 3.92 s | 16,463 | 174 (44.4) | 406 (103.6) | 13 |
| piped stdout and stderr | n/a | 492 | 0 | 0 ESC | 0 |

Sample of the raw stream: a `Downloading '...' [>    ] 16.00 KiB/24.37 MiB` bar line is followed by `ESC[2A`, `\r`, `ESC[2K`, `ESC[1B`, `\r`, `ESC[2K`, `ESC[1B`, `\r`, `ESC[2K`, `ESC[2A` before the next draw, so every redraw moves the cursor up two lines and erases three. That is what a terminal screen reader's update detection receives (WCAG2ICT B.2 describes the heuristic; what it speaks is UNVERIFIED here).

Reading of the ocx table:

- Animation is gated on TTY, `TERM=dumb` and `--quiet`, not on `NO_COLOR` or `CI`. Source: `ocx/crates/ocx_console/src/progress.rs` lines 34, 43, 57, 89, 160 select `ProgressDrawTarget::stderr`, `hidden` or `term_like`, with a comment "`TERM=dumb` gets no escape-sequence bar". Spinner steady tick at 100 ms (`enable_steady_tick(Duration::from_millis(100))`, line 109), which is 10 redraws per second per active spinner.
- A user who sets `NO_COLOR` for accessibility reasons still gets the animated bar. `NO_COLOR` is a colour switch only; the spec says nothing about animation.

grim 0.16.0 (run 2026-11-27, `grim install`, pty):

| Variant | Bytes | Bare CR | Cursor CSI | SGR |
|---|---|---|---|---|
| default | 651 | 2 | 2 | 8 |
| `NO_COLOR=1` | 618 | 2 | 2 | 0 |
| `TERM=dumb` | 651 | 2 | 2 | 8 |
| `--progress none` | 604 | 0 | 0 | 8 |
| `--progress json` | 725 | 0 | 0 | 8 |

The grim bar is `\r[####################] 1/1 ESC[K`: one line, redrawn on a count change, so the rate is low for a fast job but is bounded by the number of items, not by a clock. `grim install --help` says `auto` is "a stderr bar when stderr is a terminal, silent otherwise (and always silent for `update`/`add`)". `TERM=dumb` and `NO_COLOR` do not remove it. The residual SGR in the `--progress none` rows is the coloured `WARN` log line (defect 1 above), not the bar.

The tools' own `--help` documents both mechanisms: ocx `-q, --quiet` ("no transfer progress is rendered on stderr"), grim `--progress <auto|json|none>`.

### 6. Palette: base 16 slots versus fixed indices

Why it matters: WCAG2ICT B.3 says contrast depends on terminal capabilities and user settings, and that many terminals force one foreground and background. A program that asks for one of the 16 slots lets the user's theme own contrast; a program that asks for index 203 or an RGB value overrides it. VS Code's integrated terminal adjusts text "until a 4.5:1 contrast ratio is met" by default (`terminal.integrated.minimumContrastRatio`, set to `1` to disable; [VS Code terminal appearance docs](https://code.visualstudio.com/docs/terminal/appearance)), and the same page says ANSI colours "are set by the active color theme". So 16-slot colour is the only colour the terminal can repair.

GitHub CLI chose the same boundary: its accessible palette "uses the 16 ANSI 4-bit colors so users can customize them in their terminal" because the legacy palette "ignored the terminal background color, which caused low contrast" ([GitHub blog, 2 May 2025, updated 12 May 2025](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/); vendor engineering post).

Measured, with all SGR sequences extracted per command under `--color=always` (Python regex `ESC\[([0-9;]*)m`; driver `/tmp/ta/cnt.py`):

| Command | Fixed index or truecolor | Slots used |
|---|---|---|
| `ocx --color=always about` | `38;5;203` ×21 (index 203, outside the 16) | bold, dim, reset |
| `ocx --color=always --help` | none | 32 green, 36 cyan, 33 yellow, 1 bold |
| `ocx --color=always status` (error) | none | 31 red, 1 bold |
| `grim --color=always --help` | none | 32, 36, 33, 1 |
| `grim tui` in a pty (80x30 by 100) | `38;5;2`, `3`, `4`, `5`, `6` (indexed form, but values 2-6, so base slots) | slots 2-6, reverse (SGR 7) ×1, bold |
| `NO_COLOR=1 grim tui` | none | bold, dim, underline, reverse kept |

Source confirmation: `ocx/crates/ocx_console/src/styles.rs` lines 12-18 and `grimoire-rs/grimoire/src/cli/color.rs` lines 186-190 use `AnsiColor::Yellow/Green/Cyan/Red` (named slots). So the heuristic "does the sequence start with `38;5;` or `38;2;`" would over-report `grim tui`: crossterm writes slots 0-15 as `38;5;N`. The check must test whether N is below 16.

Result: only `ocx about` (the 203-index brand colour) leaves the 16 slots. It is a branded header, not a status colour, so it carries no meaning, but it also ignores any user palette.

### 7. Meaning without colour

Measured with `NO_COLOR=1`: ocx and grim errors print `error: <message>` (text label plus bold red when colour is on); `grim status` prints a `State` column with the words `installed`; `grim search` prints a `Status` column with `not-installed`; the `grim install` log line reads `WARN ... no AI client detected`. Meaning survives with colour off, which is the 1.4.1 test.

Common failure shape, as correct and incorrect output:

```text
INCORRECT (colour only; with colour off the two lines are identical)
  <green>my-skill  0.4.1</green>
  <red>other-skill  0.2.0</red>

CORRECT (state in text; colour only reinforces)
  my-skill      0.4.1  installed
  other-skill   0.2.0  outdated (latest 0.3.0)
```

The TUI case is the same rule; see TUI-22 in section 10.

### 8. What GitHub CLI shipped as the reference implementation

All below is from the platform's own pages.

- Release: `gh a11y` in GitHub CLI 2.72.0, public preview, 1 May 2025 ([changelog](https://github.blog/changelog/2025-05-01-improved-accessibility-features-in-github-cli)). The changelog says enhanced prompting and progress indicators "provide better context and clarity for users relying on screen readers" and gives no spoken-output detail.
- Prompts: legacy prompter replaced by one built on `charmbracelet/huh`; the accessible prompter "replaces these with numbered lists where you type a number to select an option" ([engineering post](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/); [accessibility guide](https://accessibility.github.com/documentation/guide/cli/), no page date, footer 2026).
- Progress: "The braille spinner, which redrew the screen, was replaced with a static text indicator", with an action-specific message where possible, otherwise "Working…" (engineering post).
- Colour: 4-bit palette, `gh config set accessible_colors enabled` or `GH_ACCESSIBLE_COLORS` (accessibility guide; [gh environment help](https://cli.github.com/manual/gh_help_environment) marks it preview).
- Settings and variables: `gh config set accessible_prompter enabled` / `GH_ACCESSIBLE_PROMPTER`; `gh config set spinner disabled` / `GH_SPINNER_DISABLED` ("replace the spinner animation with a textual progress indicator"); `GH_FORCE_TTY`.
- Copilot CLI (generally available February 2026 per [GitHub blog, 21 May 2026](https://github.blog/open-source/building-githubs-next-chapter-in-accessibility/)): `copilot --screen-reader` adjusts the interface for assistive technology and the guide suggests `--no-banner`; persistent `"screenReader": true` in `~/.copilot/settings.json`.
- Charm's `huh` README: accessible mode "will drop TUIs in favor of standard prompts"; the README recommends letting users control it through an environment variable (its example reads `ACCESSIBLE`) ([charmbracelet/huh](https://github.com/charmbracelet/huh)).

The GitHub pattern is: three independent opt-ins (prompt, colour, spinner), plus a umbrella for the agentic TUI. It is opt-in, not auto-detected, because no terminal API tells a program a screen reader is running. That is a design position of the sources, not a measured fact; no source here measured detection.

### 9. TUI screen-reader stance

Measured on grim 0.16.0 (`grim tui`, driven by `/tmp/ta/pty.py` with a cursor-position reply to `ESC[6n`): the TUI sets `ESC[?1049h` (alternate screen) and `ESC[?1049l` on exit, hides the cursor (`ESC[?25l`), does not enable mouse capture, and its `--help` options are `--format --refresh --color --show-deprecated --progress --sort --offline --theme --locked --log-level --config --registry`: no accessibility or linear-mode flag. Under `NO_COLOR=1` the colours vanish (SGR 38;5;N count goes to 0) while bold, dim, underline and reverse remain, so status is not colour-only at the SGR level. The TUI refuses to start without a cursor-position reply (`The cursor position could not be read within a normal duration`), an environment dependency worth knowing for test harnesses.

Stance, from the sources:

1. **A TUI is never the only path.** Every action the TUI offers exists as a plain subcommand with `--format json|plain` (grim already has `search`, `status`, `install`). Reason: the opencode report shows what happens otherwise: empty scrollback, banner re-announced, footer unremovable ([opencode#39368](https://github.com/anomalyco/opencode/issues/39368)).
2. **Provide a linear mode for assistive technology** that turns off animation, banner and footer, skips the alternate screen, and prints append-only labelled lines. Models: Copilot CLI `--screen-reader`, `huh` accessible mode, `gh` accessible prompter. The opencode proposal (PR #64350, opened 19 Oct 2026, open) uses a flat append-only interface with labelled lines and a terminal bell on completion; it is a proposal, not a shipped behaviour.
3. **Do not paint soft cursors or highlight bars as the only focus indication**; keep the real terminal cursor on the focused element (WCAG2ICT B.3 on soft cursors).
4. **Do not claim the TUI is screen-reader compatible.** No real screen reader ran in this round; a claim needs a test by a person who uses one. Until then the documented statement is "use the plain subcommands".

### 10. Catalog text, CLI-07 and TUI-22

CLI-07 (`skills/rust-quality-reference/cli-contract.md`, line 129): "Colour comes from `anstream`/`colorchoice` plus an explicit `--color` taking `auto`, `always` or `never`, decided per destination stream. Never hand-roll the env check." Verification: grep for `env::var("NO_COLOR` or `env::var("CLICOLOR`; discard hits inside the one colour module. Severity MUST.

TUI-22 (`skills/rust-quality-reference/tui.md`, line 123): "Colour is never the only channel for meaning: every colour-coded state also carries a glyph, prefix or label ... Semantic colours use terminal ANSI slots, never invented truecolor or hardcoded `Color::White`/`Color::Black`. Non-empty `NO_COLOR` degrades the TUI to an uncoloured render, overridable by an explicit `--color`." Verification: grep `Color::White|Color::Black|Color::Rgb` under `tui/`. Severity MUST.

Alignment: this artifact's precedence table agrees with CLI-07 and TUI-22 except that it adds the position of `CLICOLOR`, `CLICOLOR_FORCE`, `FORCE_COLOR` and `TERM=dumb`, which CLI-07 leaves to the `colorchoice` crate. The grim stderr defect (finding 4.1) is a violation of CLI-07's per-stream clause that its grep verification cannot see, because the log path uses a tracing subscriber, not `env::var`. TUI-22's grep misses `Color::Indexed(n)` with n over 15 and `Color::Rgb`-free fixed indices; add `Indexed` to the pattern (see rule A-10).

## Normative guidance candidates

Each rule has a severity and a VERIFICATION an agent can run. Commands assume bash and util-linux `script`.

**A-01 (MUST)** Resolve colour in this order, highest first, one resolver for every output path, per destination stream: (1) explicit `--color=always|never|auto`; (2) `NO_COLOR` non-empty means off; (3) `CLICOLOR_FORCE` set and not `0` means on; (4) `CLICOLOR=0` means off; (5) `TERM=dumb` means off; (6) on only if that stream is a terminal. Rationale: the order matches the specs and what ocx and grim already do. Verification: run the 14-row matrix in section 4 against `<cmd>` piped (`env <vars> <cmd> 2>&1 </dev/null | cat`) and under `script -q -c`; count lines matching `ESC\[[0-9;]*m`; the expected cells are in the table; any deviation is a finding.

**A-02 (MUST)** Apply the same resolver to log, warning and error output, including output from a tracing or logging library and from the argument parser's usage errors. Rationale: grim 0.16.0 emits ANSI on piped stderr under `--color=never`. Verification: `env <vars> <cmd> 2>&1 >/dev/null </dev/null | python3 -I -c "import sys;print(sys.stdin.buffer.read().count(b'\x1b'))"` must print 0 for `--color=never`, `CLICOLOR=0`, `TERM=dumb`, `NO_COLOR=1` on a command that logs a warning.

**A-03 (SHOULD)** Treat `FORCE_COLOR` as an alias of `CLICOLOR_FORCE` and decide explicitly whether `NO_COLOR` outranks it; document the choice in `--help`. Rationale: two specs list it, one tool manual does not, and the specs disagree on the tie (see Contested). Verification: row `FORCE_COLOR=1` of the section 4 matrix; expected cell is the same as `CLICOLOR_FORCE=1` for the chosen alias, and the `NO_COLOR=1 FORCE_COLOR=1` row matches the documented choice.

**A-04 (MUST)** Animated progress (cursor movement, in-place redraw, spinner glyph rotation) runs only when the destination stream is a TTY, `TERM` is not `dumb`, no accessibility opt-out is set, and `--quiet` is not set. Otherwise print append-only text lines at phase boundaries. Rationale: a terminal screen reader detects redraws as updates (WCAG2ICT B.2), and user reports describe duplicated speech (opencode#39368). Verification (byte-stream check): `script -q -c '<cmd>' out.raw </dev/null`, then count bare CR and cursor CSI:

```sh
python3 -I - out.raw <<'PY'
import sys,re
b=open(sys.argv[1],'rb').read()
crlf=b.count(b'\r\n'); bare=b.count(b'\r')-crlf
cur=sum(1 for f in re.findall(rb'\x1b\[[0-9;?]*([A-Za-z])',b) if f in b'ABCDGHJKlhsu')
print('bareCR',bare,'cursorCSI',cur)
PY
```

Run it on the fallback mode (non-TTY, `TERM=dumb`, the accessibility opt-out, `--quiet`). Pass: both numbers are 0. Fail: either is above 0. In the section 5 measurement ocx passes for `TERM=dumb`, `--quiet` and a pipe, and fails (147 and 343) for `NO_COLOR=1` and `CI=1`; grim fails for `TERM=dumb`.

**A-05 (SHOULD)** Provide one documented opt-out for animation that a person with a screen reader can set once (an environment variable and a config setting, for example `<TOOL>_NO_ANIMATION=1`), independent of colour. Rationale: `NO_COLOR` is a colour spec only; measured, it leaves the ocx bar animated. GitHub CLI ships `GH_SPINNER_DISABLED` and `gh config set spinner disabled`. Verification: set the variable, rerun the A-04 capture, bareCR and cursorCSI are 0, and `<cmd> --help` or the reference page names the variable.

**A-06 (SHOULD)** In fallback mode print a start line, a completion line, and, for operations longer than a few seconds, a heartbeat line at a low fixed interval, each a complete line ending in `\n`. A house heuristic: at most one heartbeat line per 5 seconds; no source gives a number, and the effect on speech is UNVERIFIED. Rationale: no output for a long operation is a status-message gap (WCAG2ICT 4.1.3 Note 1); one line per tick floods the reader. Verification: from the capture, `grep -c` lines starting with the heartbeat prefix divided by the wall time is at most 0.2 per second and the last line states success or failure.

**A-07 (MUST)** Choose colour from the 16 ANSI slots only; never a fixed index above 15 or an RGB value for anything that conveys state, and never a hardcoded white or black foreground. Rationale: the terminal can repair only slot colours (VS Code minimum contrast, B.3 forced palette). Verification:

```sh
env <cmd-with-all-states> --color=always 2>&1 </dev/null | python3 -I -c "
import sys,re
b=sys.stdin.buffer.read()
bad=[m for m in re.findall(rb'\x1b\[(?:38|48);5;(\d+)',b) if int(m)>15]
rgb=re.findall(rb'\x1b\[(?:38|48);2;',b)
print('indices>15:',sorted(set(bad)),'truecolor:',len(rgb))"
```

Pass: `indices>15: []` and `truecolor: 0`. Fail example from this round: `ocx about` prints `[b'203']`. Index 0-15 written as `38;5;N` is allowed (crossterm form).

**A-08 (MUST)** Every state that colour distinguishes also carries a word, prefix or glyph in the same line, so the output is unambiguous with colour removed. Rationale: WCAG 1.4.1 "applies directly as written" (WCAG2ICT). Verification (reading heuristic): run the command with `NO_COLOR=1`, then read the output without the colour: can each row's status be read from characters alone? Pass: `error: no ocx.toml found ...`, a `State` column of `installed`. Fail: two rows differing only by colour.

**A-09 (MUST)** Instructions in output never refer to colour, position or shape alone ("the red text", "the line above"). Rationale: WCAG 1.3.3 "applies directly as written". Verification: `grep -rniE "(the )?(red|green|yellow|blue|bold|highlighted) (text|line|word|message)|see (above|below)" <message-sources>`; each hit is reviewed and fixed unless a named label also appears.

**A-10 (MUST)** A TUI never uses `Color::White`, `Color::Black`, `Color::Rgb` or `Color::Indexed(n)` with n above 15, and uses a non-empty `NO_COLOR` to remove colour while keeping bold, dim, underline or reverse as the non-colour channel. Rationale: TUI-22 plus this round's `Indexed` gap. Verification: `git ls-files -z -- '**/tui/**' | xargs -0 grep -n -E 'Color::(White|Black|Rgb|Indexed)'`; and run the section 9 pty capture with `NO_COLOR=1`: fixed-index SGR count must be 0 and reverse or bold count above 0.

**A-11 (MUST)** Every action in a TUI is reachable as a non-interactive subcommand with `--format json` or plain output. Rationale: a person using a screen reader or a script has a path that does not need the TUI; the opencode report shows the failure of a TUI-only product. Verification: list the TUI's commands (menu or key help) and check each against `<tool> --help`; a TUI-only action is a finding.

**A-12 (SHOULD)** A TUI offers a linear mode: no alternate screen, no animation, no banner, no footer redraw, append-only labelled lines, reachable by flag and environment variable and stated in `--help`. Rationale: Copilot CLI `--screen-reader`, `huh` accessible mode and the opencode proposal; a screen reader reads only what is painted on the alternate screen. Verification: capture with the linear mode set; `ESC[?1049h` count is 0, A-04 numbers are 0.

**A-13 (MUST)** Do not write "screen reader compatible", "accessible", or a WCAG conformance level for a CLI or TUI unless a person who uses a screen reader tested it and the date and tool are recorded. Rationale: this round could not run one, and GitHub's own CLI report is a vendor self-assessment. Verification: `grep -rniE "screen[- ]reader (compatible|friendly)|WCAG (2\.[0-9] )?(A|AA|AAA)|fully accessible" docs README*`; each hit needs a linked test record, otherwise reword to describe the mechanism ("`--no-animation` prints plain lines").

**A-14 (SHOULD)** When a CLI reference page cites WCAG2ICT, cite only these criteria: 1.4.1, 1.3.3, 1.4.3 (with the terminal-owns-background caveat), 2.2.2, 4.1.3; label WCAG2ICT "informative Group Note, 11 December 2025" and link it. Rationale: it is the only source in this round that maps the criteria to non-web text interfaces and its own notes carry no terminal text for those criteria. Verification: `grep -n "wcag2ict" <page>` shows the link and the Note status; no criterion outside the list appears without a stated reason.

**A-15 (SHOULD)** Do not print a decorative banner, ASCII art or emoji on a default human path. Where a banner exists, give it a `--no-banner` or environment switch, and print it never when stdout is not a TTY. Rationale: a banner is re-announced on every refresh in the opencode report and GitHub documents `--no-banner` for the same reason. Verification: capture `<cmd>` under `script` with the switch and without; the banner bytes appear only in the second. This is a house judgement; the rule is not required by a standard.

## Dated facts

| Fact | Source (stated date) | Type |
|---|---|---|
| WCAG2ICT 2.2 is an "informative" Group Note, 11 December 2025; "not endorsed by W3C itself" | [W3C WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/) (note dated 2025-12-11) | authority |
| WCAG2ICT B.3: "A terminal emulator acts as the user agent for text-based applications" | same | authority |
| `NO_COLOR`: non-empty value prevents ANSI colour; page updated 2026-11-25; proposed 2017 | [no-color.org](https://no-color.org/) | community authority |
| `CLICOLOR` and `CLICOLOR_FORCE` precedence: `NO_COLOR` over `CLICOLOR_FORCE` over `CLICOLOR`; the page is marked deprecated in favour of aliasing `FORCE_COLOR` | [bixense.com/clicolors](https://bixense.com/clicolors/) (no date) | community authority |
| `FORCE_COLOR`: any non-empty value forces ANSI colour | [force-color.org](https://force-color.org/) (no date) | community authority |
| Node: `FORCE_COLOR` 0/1/2/3 gives 2/16/256/16,777,216 colours; `getColorDepth` returns 1/4/8/24 | [nodejs.org/api/tty.html](https://nodejs.org/api/tty.html) (current docs) | platform |
| WebAIM survey 10: Dec 2023 to Jan 2024, 1,539 valid responses, updated 2024-02-22; NVDA 65.6%, JAWS 60.5%, VoiceOver 43.9%, Narrator 37.3%, Orca 8.3% (commonly use, multiple answers); primary desktop reader JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7% | [webaim.org](https://webaim.org/projects/screenreadersurvey10/) | independent study (accessibility consultancy survey, self-selected respondents) |
| GitHub CLI 2.72.0 `gh a11y`, public preview, 2025-05-01 | [GitHub changelog](https://github.blog/changelog/2025-05-01-improved-accessibility-features-in-github-cli) | platform |
| GitHub blog: spinner replaced by static text, palette on the 16 ANSI colours, published 2025-05-02, updated 2025-05-12 | [GitHub blog](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/) | platform |
| GitHub CLI env vars: `GH_ACCESSIBLE_COLORS` and `GH_ACCESSIBLE_PROMPTER` (preview), `GH_SPINNER_DISABLED`, `GH_FORCE_TTY`, `NO_COLOR` "any value", `CLICOLOR=0`, `CLICOLOR_FORCE` non-0 | [cli.github.com env help](https://cli.github.com/manual/gh_help_environment) (current manual, no date) | platform |
| Copilot CLI GA February 2026 with `--screen-reader`; post dated 2026-05-21 | [GitHub blog](https://github.blog/open-source/building-githubs-next-chapter-in-accessibility/) | platform |
| GitHub CLI conformance report: WCAG 2.2 A and AA, all six sampled criteria "Supports", updated 2026-09-08 | [accessibility.github.com](https://accessibility.github.com/conformance/cli/) | vendor self-assessment |
| VS Code terminal adjusts foreground to a 4.5:1 ratio by default; `terminal.integrated.minimumContrastRatio: 1` disables | [VS Code docs](https://code.visualstudio.com/docs/terminal/appearance) (current docs; the page does not state the default value outright and implies it) | platform |
| Charm `huh` accessible mode drops TUI prompts for standard prompts; env var example `ACCESSIBLE` | [GitHub README](https://github.com/charmbracelet/huh) (current README) | platform (library) |
| opencode issue #39368 opened 2026-07-28 (open); PR #64350 opened 2026-10-19 (open) | [issue](https://github.com/anomalyco/opencode/issues/39368) | user report |
| NVDA "Report dynamic content changes" can be toggled off during builds, per a screen-reader user guide updated 2025-04-12 | [Nathan Tech](https://www.nathantech.net/products/developer/screen-reader-command-line.php) | individual vendor guide |

## What an agent must not decide alone

- **A conformance claim.** Whether the product states WCAG, EN 301 549 or Section 508 conformance, or publishes an accessibility conformance report, is a legal and brand decision. Ask. (Legal scope for accessibility law is the marketing sub-program's territory; named, not researched.)
- **Whether to ship `FORCE_COLOR` over `NO_COLOR`, or the reverse.** The specs disagree (Contested); the choice affects people who set `NO_COLOR` for accessibility and CI log readers. Ask which wins, then document it.
- **Brand colours.** A fixed-index or RGB brand colour (ocx `38;5;203`) is a brand decision against an accessibility rule. Ask before removing it, and ask before adding one.
- **Deleting or reducing a TUI.** Moving a feature to subcommand-only or adding a linear mode costs scope. Ask for priority.
- **The default for animation.** Whether animation is on by default for new human users is a product decision; the rule is only that opt-outs exist and non-TTY output is plain.
- **A statement that a screen reader works.** Needs a real test by a person who uses one; ask for a tester and a record.
- **The heartbeat interval** in A-06 is a house number with no source; ask a screen-reader user before treating it as a standard.

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Adds `colored`, `chalk` or `owo-colors` calls with its own `env::var("NO_COLOR")` check, and only on stdout, so log and error paths stay coloured | A-02 stderr ESC count; CLI-07 grep (`env::var("NO_COLOR`) outside the colour module |
| Reads only `NO_COLOR` and treats an empty value as set (the spec says "not an empty string") | Matrix row `NO_COLOR=` (empty) must keep colour on a TTY |
| Assumes `NO_COLOR` also turns off animation | A-04 capture under `NO_COLOR=1`: bareCR must be 0 only if the animation opt-out is also wired; measured not in ocx |
| Gates animation on `stdout.is_terminal()` while the bar writes to stderr (wrong stream) | A-04 capture with stdout redirected and stderr a TTY: bar still draws; with stderr redirected: no ESC bytes |
| Colours a status and prints nothing else (a green dot, a red dot) | A-08 read with `NO_COLOR=1` |
| Writes `38;5;N` indices for a "nicer" shade or hex RGB via a style crate default theme | A-07 script (indices above 15, truecolor) |
| Treats "accessible" as a feature to claim ("fully accessible CLI") | A-13 grep |
| Uses a braille or dot spinner, then `\r` redraws in a loop with a timer, even outside a TTY | A-04 on the pipe; `grep -c $'\r'` on piped output |
| Writes a startup banner with box-drawing or ASCII art on the default path | A-15 capture diff |
| Cites WCAG success criteria for terminals from memory, including 4.1.2 or 1.4.12 which do not apply to plain output | A-14 list and grep |
| Assumes crossterm `38;5;N` is "256-colour, fixed" and flags every TUI colour | A-07 note: N at most 15 is a slot |

## Contested / evolving

- **`NO_COLOR` against `FORCE_COLOR`, as of 2026-11-27.** [bixense](https://bixense.com/clicolors/) says `NO_COLOR` wins and `FORCE_COLOR` is an alias of `CLICOLOR_FORCE`; [force-color.org](https://force-color.org/) shows `FORCE_COLOR` re-enabling colour after `NO_COLOR` (example code, not prose). Node documents both as ways to set colour and gives no tie-break ([Node tty docs](https://nodejs.org/api/tty.html)). ocx and grim: `NO_COLOR` wins over `CLICOLOR_FORCE` (measured) and `FORCE_COLOR` is ignored. Trend: the accessibility-leaning reading (user's disable wins) is the older and more common one; no source declares a winner. Decision in this artifact: `NO_COLOR` wins, flag overrides both, marked an ask for the owner.
- **Empty `NO_COLOR`.** The spec ignores an empty value; the GitHub CLI manual says "set to any value". Both ocx and grim follow the spec (measured row `NO_COLOR=`).
- **Opt-in versus auto-detect for a screen-reader mode.** GitHub, `huh` and Copilot CLI use explicit opt-ins (`gh a11y`, `ACCESSIBLE`, `--screen-reader`); no source offers a reliable detection mechanism, and none argues for one. Trend, as of 2026: more tools adding a single umbrella flag (Copilot CLI GA February 2026; opencode proposal July to October 2026; a Claude Code feature request is also referenced in a search result and was not fetched).
- **Static text progress versus a coarse heartbeat.** GitHub chose a static "Working…" style indicator; `huh`'s accessible mode is prompts only; no source gives a heartbeat interval or measures reader comprehension. A-06 is a house heuristic.
- **Whether WCAG applies to CLI output at all.** WCAG2ICT treats terminals as text applications with the terminal emulator as the user agent and maps criteria to them as informative guidance. GitHub's report claims WCAG 2.2 AA directly for its CLI. Neither is a legal determination; EN 301 549 and the US Section 508 refresh were not researched here.
- **Does a cursor-position probe belong in a TUI?** Measured: `grim tui` aborts without an `ESC[6n` reply. Not an accessibility finding in itself; noted because screen-reader and braille terminal setups vary and a hard dependency on that reply can block start. UNVERIFIED for any real assistive-technology terminal.

## Unfetched and unverified

- ACM CHI 2021 "Accessibility of Command Line Interfaces" ([DOI 10.1145/3411764.3445544](https://dl.acm.org/doi/10.1145/3411764.3445544), full text at the `fullHtml` path): both URLs returned HTTP 403. Its findings appear here only as a search-result summary and are not relied on by any rule. A later round should fetch it from another host (author copy) and quantify participants and findings on progress indication.
- Spoken output of NVDA, JAWS, Narrator, Orca, VoiceOver on any of ocx, grim, `gh` or a spinner: not run, not claimed. The `script` captures prove what bytes are sent, not what is spoken.
- The Windows Terminal and Windows Console Host behaviour for `ESC[2A` redraws and for `NO_COLOR`: not measured (Linux only in this round).
- The `FORCE_COLOR` and `CLICOLOR_FORCE` handling on Windows builds of ocx and grim: not measured.
- Rate figures in section 5 depend on network speed during the download; compare counts per redraw, not per second, across runs.
- Whether the WCAG2ICT criterion text for 1.4.1 and 1.3.3 differs from WCAG 2.2 itself: the Note says "applies directly as written"; the WCAG 2.2 text was not fetched.

## Sources

Primary (platform or authority) are marked P; independent study I; vendor data V; user report U.

| # | URL | What it is | Date/era | Why worth reading |
|---|---|---|---|---|
| 1 | https://www.w3.org/TR/wcag2ict-22/ (P) | W3C Group Note, WCAG 2.2 for non-web ICT | 2025-12-11 | Only source mapping criteria to text interfaces; Appendix B on terminals |
| 2 | https://no-color.org/ (P) | `NO_COLOR` spec | page updated 2026-11-25 | Exact empty-string rule |
| 3 | https://bixense.com/clicolors/ (P) | `CLICOLOR` and `CLICOLOR_FORCE` spec, deprecated notice | undated | Precedence over `NO_COLOR` |
| 4 | https://force-color.org/ (P) | `FORCE_COLOR` spec | undated | The tie with `NO_COLOR` in its example code |
| 5 | https://nodejs.org/api/tty.html (P) | Node.js `FORCE_COLOR` levels and `NO_COLOR` | current docs | Widest-used implementation of the levels |
| 6 | https://cli.github.com/manual/gh_help_environment (P) | gh environment variables | current manual | Shipped names: `GH_SPINNER_DISABLED`, `GH_ACCESSIBLE_*` |
| 7 | https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/ (P, V) | GitHub engineering post | 2025-05-02, updated 2025-05-12 | The spinner, prompter and palette decisions with reasons |
| 8 | https://github.blog/changelog/2025-05-01-improved-accessibility-features-in-github-cli (P) | gh 2.72.0 changelog | 2025-05-01 | Release version and date |
| 9 | https://accessibility.github.com/documentation/guide/cli/ (P) | GitHub CLI screen reader guide | undated, footer 2026 | Exact settings and Copilot CLI flag |
| 10 | https://github.blog/open-source/building-githubs-next-chapter-in-accessibility/ (P) | GitHub accessibility post | 2026-05-21 | Copilot CLI GA date and `--screen-reader` |
| 11 | https://accessibility.github.com/conformance/cli/ (V) | gh conformance report | updated 2026-09-08 | How a vendor claims criteria for a CLI |
| 12 | https://webaim.org/projects/screenreadersurvey10/ (I) | WebAIM screen reader survey 10 | Dec 2023 to Jan 2024, 2024-02-22 | Reader population figures |
| 13 | https://clig.dev/ (P-community) | Command Line Interface Guidelines | undated | Per-stream colour check, no animation off-TTY |
| 14 | https://github.com/charmbracelet/huh (P) | Charm huh README | current | Accessible mode that drops TUI for standard prompts |
| 15 | https://code.visualstudio.com/docs/terminal/appearance (P) | VS Code terminal appearance | current | Minimum contrast adjustment and ANSI theme ownership |
| 16 | https://github.com/anomalyco/opencode/issues/39368 (U) | opencode screen-reader issue | opened 2026-07-28 | Concrete list of TUI failures with NVDA |
| 17 | https://www.nathantech.net/products/developer/screen-reader-command-line.php (V) | Screen-reader command-line user guide | updated 2025-04-12 | How a user copes with dynamic output |
| 18 | skills/rust-quality-reference/cli-contract.md, line 129 (CLI-07), and skills/rust-quality-reference/tui.md, line 123 (TUI-22) (P, catalog) | Catalog rule text | repo HEAD 6344379 | The rules this artifact aligns with |
| 19 | ocx/crates/ocx_console/src/progress.rs, styles.rs; grimoire-rs/grimoire/src/cli/color.rs (P, source) | Source of the measured tools | repo HEAD at read time 2026-11-27 | Confirms gating and slot palette |

Commands used for every measurement are given inline above; scratch drivers are under `/tmp/ta/` (outside the repository) and are not part of the deliverable.
