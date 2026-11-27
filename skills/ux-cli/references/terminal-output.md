---
title: What a terminal receives - colour, animation, TUIs and error text
summary: The UX-CLI rows for colour and animation per stream, the 16-slot palette, TUI parity and linear mode, accessibility claims, and the UX-TEXT rows for the rendered error shape, log lines, error codes and ASCII punctuation
---

# What a terminal receives - colour, animation, TUIs and error text

Owns the byte stream a person with a screen reader, low vision, a forced palette or a dumb terminal gets, and the shape of the text a CLI prints when something fails. Rows UX-CLI-20 to 27 and 29, and UX-TEXT-05, 07, 12 and 23. The other UX-TEXT rows (what an error says, labels, plurals, formatting) are the `ux-quality-reference` skill's `text.md`. Stream routing, TTY detection, the colour decision order and signals are the language CLI-contract rules'. Rust `Display` wording is ERR-05 and ERR-06. Machine-readable errors are `ux-agent-interfaces`.

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[Colour and animation](#colour-and-animation) · [Palette, meaning and claims](#palette-meaning-and-claims) ·
[TUIs](#tuis) · [The rendered error](#the-rendered-error) · [Examples](#examples) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and versions

No screen reader was run when these rows were written, so every statement about speech is `unverified: no screen-reader run`. A project may document mechanisms (`--progress none` prints plain lines). It may not claim compatibility or a WCAG level (UX-CLI-26).

| Fact | Source and date | Re-check |
|---|---|---|
| `NO_COLOR` scope is colour only | no-color.org, updated 2026-11-25 | every 12 months: fetch all four colour sources |
| `CLICOLOR` and `CLICOLOR_FORCE`; `FORCE_COLOR` as an alias, `NO_COLOR` winning | bixense.com/clicolors, undated, marked deprecated, re-fetched 2026-11-27 | with the row above |
| `FORCE_COLOR` forces on any non-empty value including `0`, and its example applies it after `NO_COLOR` | force-color.org, updated 2026-11-11, proposed 2023 | check whether it adds a prose tie-break or a rule for `0` |
| Node reads `FORCE_COLOR=0` as disable. gh reads `CLICOLOR_FORCE` as "a value other than 0" and ships `GH_SPINNER_DISABLED` and preview `GH_ACCESSIBLE_*` variables | nodejs.org tty docs, current; cli.github.com gh environment manual, current | every 12 months: check whether the preview variables stabilised or were renamed |
| gh moved to 4-bit colour for contrast; Copilot CLI `--screen-reader` GA February 2026 | GitHub blog 2025-05-02 and 2026-05-21 (vendor) | every 12 months |
| WCAG2ICT 2.2 Appendix B on terminals | W3C Group Note, 2025-12-11 (informative) | every 24 months, or on a new Note or WCAG 3 |
| gh CLI conformance report is a vendor self-assessment | accessibility.github.com, updated 2026-09-08 | every 12 months |
| A user reports NVDA repeating spinner lines in a TUI | a public issue, opened 2026-07-28 | on a contradicting finding |
| rustc dev guide diagnostic rules; clap `tip:` wording | rustc dev guide live, fetched 2026-11-27; clap as shipped in measured CLIs | every 12 months, and each clap major: run a typo against the new clap |
| VS Code minimum contrast ratio repairs only the 16 slot colours | VS Code terminal appearance docs, undated | every 12 months |

**Pinned defaults**, each overridable once by an adopter: the file name `decorative-colour.allow` (UX-CLI-22), the 16-slot palette, and the `error:`, `note:` and `help:` prefixes (UX-TEXT-05). The name and default of the animation opt-out (UX-CLI-29) is the owner's decision. For example, `MYTOOL_NO_ANIMATION`, with a config key beside it.

## Variables

`BIN` is the binary, `CHECKS` the `.claude/skills/ux-cli/checks` directory. `esc` prints three counts from a captured stream: bare carriage returns, cursor-control sequences and alternate-screen entries.

```sh
esc() { python3 -I -c "import re,sys;d=sys.stdin.buffer.read();print(len(re.findall(rb'\r(?!\n)',d)),len(re.findall(rb'\x1b\[[0-9;?]*[ABCDEFGHJKSTfhl]',d)),d.count(b'\x1b[?1049h'))"; }
```

## Colour and animation

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-20 | Log, warning, tracing and argument-parser output goes through the same colour decision as result output, per destination stream. In Rust, set `tracing_subscriber::fmt::layer().with_ansi(DECISION)` explicitly, where DECISION is the decision for stderr. | One measured CLI emits ANSI on piped stderr under `--color=never`, `CLICOLOR=0` and `TERM=dumb`. The language rule's grep for `env::var("NO_COLOR` cannot see a tracing default. | `cli_matrix.py --only color --log-cmd "command that logs a warning"`: 0 escape bytes under `--color=never`, `CLICOLOR=0`, `TERM=dumb` and `NO_COLOR=1`, each run separately. | MUST |
| UX-CLI-21 | Animate progress (in-place redraw, cursor movement, spinner) only when the destination stream is a TTY, `TERM` is not `dumb`, `--quiet` is off and the UX-CLI-29 opt-out is unset. The language rule's conditions also hold (`CI` unset, machine output off); they are pinned there and named here only as a pointer. In the fallback, print a start line and a completion line as whole lines. | A terminal screen reader detects redraws as updates (WCAG2ICT B.2). A user report says NVDA repeats spinner lines. | `cli_matrix.py --only anim --anim-cmd "command that shows progress" --anim-optout NAME` runs the command on a pty under `TERM=dumb`, under `--quiet` and with the opt-out set; bare CRs plus cursor sequences must be 0. Also run with stderr redirected to a file: see block UX-CLI-21. The `CI=1` capture belongs to the language rule. | MUST |
| UX-CLI-29 | Ship one documented animation opt-out, independent of `NO_COLOR`: one environment variable plus one config key, named in `--help`. | `NO_COLOR` is a colour switch only, and one measured progress bar stays animated under it. Precedent: `GH_SPINNER_DISABLED` and `gh config set spinner disabled`. | Set the variable and rerun the UX-CLI-21 capture: the count is 0. Repeat with the config key. `"$BIN" --help` names the variable (see block UX-CLI-29). | SHOULD |
| UX-CLI-27 | Treat a non-empty `FORCE_COLOR` as an alias of `CLICOLOR_FORCE`, except that `FORCE_COLOR=0` forces nothing and is treated as unset (SHOULD; this clause diverges from force-color.org, which forces colour on any non-empty value including `0`). `NO_COLOR` and the explicit `--color` flag rank above it. State the order in `--help`. | The sources disagree on the tie and on `0`: bixense lets `NO_COLOR` win and defines no `0`, force-color.org forces on `0`, Node reads `0` as disable. The rule takes the user's disable on both ties, and departs from force-color.org on `0` on purpose, so the `0` clause is a SHOULD and not a MUST: a user who writes 0 most likely means off, and Node also reads `0` as disable. Whether to honour `FORCE_COLOR` at all is an owner decision. | See block UX-CLI-27. | CONSIDER |

```sh
# UX-CLI-21 stderr to a file, on a pty (util-linux script): the three counts must be 0 0 0
script -q -c "$BIN install pkg 2>err.raw" /dev/null </dev/null >/dev/null
esc < err.raw
# UX-CLI-29
"$BIN" --help | grep -c -F -e MYTOOL_NO_ANIMATION
# UX-CLI-27: colour, none, none
FORCE_COLOR=1 "$BIN" command | cat
NO_COLOR=1 FORCE_COLOR=1 "$BIN" command | cat
FORCE_COLOR=0 "$BIN" command | cat
```

## Palette, meaning and claims

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-22 | Colour that conveys state uses only the 16 ANSI slots (SGR 30-37, 90-97, or `38;5;N` with N at most 15). Never use an index above 15, truecolor, or a hardcoded white or black foreground for state. A decorative colour outside the slots is allowed only on an owner-approved allow-list. | The terminal can repair contrast only for slot colours (VS Code minimum contrast ratio; WCAG2ICT B.3 on forced palettes). gh moved to 4-bit for this reason. | `cli_matrix.py --only palette --decorative-allow decorative-colour.allow --probe probes.txt`. The project keeps `decorative-colour.allow` (**pinned** name), one row per approved command path and index (`about`, tab, `203`); only the owner adds a row. The check runs every path's `--help` under `CLICOLOR_FORCE=1` and each probe command with `--color=always`, and expects no index above 15 and no truecolor outside the listed rows. `38;5;0` to `38;5;15` is the crossterm slot form and passes. | MUST |
| UX-CLI-23 | Colour never carries a state alone: the same line names it in a word, prefix or glyph. Output text never points at colour or position ("the red line", "see above"). | WCAG 1.4.1 and 1.3.3 "apply directly as written" to non-web software (WCAG2ICT 2.2, informative Note). No mechanical pass or fail exists. | Review step, not a gate: run with `NO_COLOR=1` and read whether each row's state is readable from its characters alone. See block UX-CLI-23 for candidate lines. | SHOULD |
| UX-CLI-26 | Never write "accessible", "screen reader compatible" or "friendly", or a WCAG level for a CLI or TUI unless a person who uses a screen reader tested it and the date, reader and version are recorded. A page that cites WCAG2ICT cites only 1.4.1, 1.3.3, 1.4.3 (noting that the terminal paints the background), 2.2.2 and 4.1.3, and labels WCAG2ICT "informative W3C Group Note, 2025-12-11". | No source verified spoken output. A vendor conformance report is a self-assessment. Agents cite 4.1.2 and 1.4.12 from memory, and neither applies to plain output. | See block UX-CLI-26: each hit links a test record. Search the page for `wcag2ict` and check the criteria list. | MUST |

```sh
# UX-CLI-23: candidate lines to read
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' \
  | xargs -0 -r grep -H -n -i -E -e '(red|green|yellow|highlighted) (text|line|message)|see (above|below)' --
# UX-CLI-26: each hit must link a test record
git ls-files -z --cached --others --exclude-standard -- ':(glob)README*' ':(glob)docs/**/*.md' \
  | xargs -0 -r grep -H -n -i -E -e 'screen[- ]reader (compatible|friendly)|WCAG (2\.[0-9] )?(A|AA|AAA)|fully accessible' --
```

## TUIs

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-24 | Every action in a TUI is reachable as a non-interactive subcommand with `--format json` or plain output. | A screen-reader user or a script then has a path that needs no TUI. A TUI-only product leaves an empty scrollback. | List the TUI's actions from its key-to-action table and match each to a command in `--help`. A TUI-only action is a finding. | MUST |
| UX-CLI-25 | A TUI offers a linear mode: no alternate screen, no animation, no banner or footer redraw, and append-only labelled lines. The mode is reachable by a flag and an environment variable and named in `--help`. | Precedents: Copilot CLI `--screen-reader` (GA February 2026) and huh's accessible mode. No terminal API detects a screen reader, so the mode is an opt-in. | Capture the TUI with the mode set and pipe it to `esc` (see Variables): the third count (alternate-screen entries) and the UX-CLI-21 counts are 0. | SHOULD |

## The rendered error

Rows for the text a failing command prints. The wording of each message (what failed, the next step, the cause) is `text.md` in `ux-quality-reference`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-TEXT-05 | A CLI's rendered diagnostic has one shape per binary. The first line is a self-contained `error: WHAT[: INPUT]`. Context lines start with `note:`. The next step is the last line and starts with `help:`. One prefix convention per binary: never `error:` from the parser and a bare path-led line from the runtime. A refusal of a T1 or T2 command ends with its `Try: ` and `Override: ` lines instead of one `help:` line (`destructive-commands.md`). | The rustc dev guide and GNU fix summary-first wording, and clig.dev puts the key line last. The self-contained first line plus a `help:` last line satisfies both. One measured CLI mixes clap's `error:` with path-led runtime errors. The wording of each Rust `Display` string (lowercase, unpunctuated, no `error:` opener) is ERR-05. | Snapshot tests over a corpus of bad invocations, `"$BIN" bad args 2>&1`, one file per case: see block UX-TEXT-05. Require 100% on new errors. Gate the existing set as a ratchet. | MUST |
| UX-TEXT-07 | Interface text is never a log record. At default verbosity, a user-facing message carries no timestamp, logger level tag, module path, source location, retry counter, raw OS or runtime parse error (`strconv.ParseInt: ...`), stack trace or full child-process command line. Those go to the log, the Output channel or `--verbose`, composed separately from the message. | clig.dev says not to treat stderr as a log file. kubectl prints five klog lines before its one human sentence, and one measured CLI prints a timestamped tracing `WARN` line as its user notice. The TypeScript half of the split is TS-ERR-05, and the ANSI half is UX-CLI-20. | See block UX-TEXT-07, run over every failing-path fixture. Both commands print nothing. | MUST |
| UX-TEXT-12 | Never invent an error code. A diagnostic code exists only together with its explain entry (`--explain CODE` or a docs page), and both ship in the same change. Mint a code only when the full explanation would not fit in the message, and only with the owner's approval. Exit codes are not a second code. | The rustc threshold ("when the explanation would give more information than the error itself") and Google's "document all codes". A code with no page is a dead end. In CLI text the code sits in the header (`error[E0382]:`, greppable). | See block UX-TEXT-12: `comm` prints nothing, and `--explain` exits 0 for each code. | MUST |
| UX-TEXT-23 | CLI output strings use ASCII punctuation only: no em or en dash, no curly quotes, no Unicode ellipsis. Use a colon, a hyphen or a new sentence. Gate changed lines only. The documentation punctuation rule does not apply to runtime strings. UX-TEXT-05 overrides this rule for the next step: the pattern `TEXT - run COMMAND` is fixed by a separate last line `help: run COMMAND`, not by swapping the dash. | A legacy or non-UTF-8 console renders these as mojibake, and the language rules already require ASCII for clap help. GUI strings may use typographic quotes, one convention per surface. | See block UX-TEXT-23: it prints nothing. | SHOULD |

```sh
# UX-TEXT-05: one finding per line. A snapshot with no help: or Try: line has no next step and is legal: the `text.md` check for a stated ground covers it.
# A snapshot that has a next step must end on it: help:, or Override: for a refusal.
git ls-files -z -- ':(glob)tests/snapshots/**/*.txt' | xargs -0 -r -n1 awk '
  FNR == 1 && ($0 !~ /^error: / || $0 ~ /\.$/) { print FILENAME ": first line is not a bare error: line" }
  NF { last = $0 }
  /^(help|Try): / { step = 1 }
  END { if (step && last !~ /^(help|Override): /) print FILENAME ": has a next step but the last line is neither help: nor Override:" }'
# UX-TEXT-07: any output is a finding
"$BIN" bad args 2>&1 | grep -E -e '^[A-Z][0-9]{4} ' -e '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+' -e '(^|[^A-Za-z_])(TRACE|DEBUG|INFO|WARN|ERROR) +[a-z_:]+' -e '[a-z_]+\.(go|rs|ts|js):[0-9]+'
"$BIN" bad args 2>&1 | grep -E -e 'strconv\.|std::|Traceback|NullPointer' -e '    at .*\.(js|ts):[0-9]+'
# UX-TEXT-12: codes in source against pages in docs
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' | xargs -0 -r grep -h -o -E -e 'E[0-9]{4}' -- | sort -u > codes.txt
git ls-files -- ':(glob)docs/errors/*.md' | sed -e 's|.*/||' -e 's|[.]md$||' | sort -u > pages.txt
comm -3 codes.txt pages.txt
# UX-TEXT-23: added lines with a typographic character inside a string
git diff -U0 --merge-base origin/HEAD -- ':(glob)src/**/*.rs' \
  | python3 -I -c 'import re,sys
for l in sys.stdin:
    if l.startswith("+") and re.search(r"\"[^\"]*[–—‘’“”…][^\"]*\"", l): print(l, end="")'
```

## Examples

An error that passes UX-TEXT-05, 07 and 23 (a self-contained first line, a `note:` for context, a last `help:` line, ASCII only, no log fields):

```text
error: cannot read config: /home/u/.mytool/config.toml
note: line 3 is not valid TOML
help: run `mytool config check` to list every problem
```

The same failure as a log record shown to the user, which fails UX-TEXT-05 and 07:

```text
2026-11-27T09:14:02Z ERROR mytool::config: Os { code: 2 } at src/config.rs:88 - retry 3/3
```

A tracing layer that ignores the colour decision, and the fix (UX-CLI-20):

```rust
// wrong: ANSI follows the library default, whatever --color or NO_COLOR says
let layer = tracing_subscriber::fmt::layer();

// right: the stderr decision made once for the whole program
let layer = tracing_subscriber::fmt::layer().with_ansi(stderr_color);
```

A state line that survives `NO_COLOR=1` (UX-CLI-23): the state is a word, and colour only repeats it.

```text
error: build failed
ok: 12 tests passed
warning: 2 files skipped
```

## What Agents Get Wrong Here

- **Assuming one switch covers another.** `NO_COLOR` does not stop animation. `--color=never` does not reach log output. A stderr bar gated on `stdout.is_terminal()` animates into a pipe. `TERM=dumb` is forgotten in the animation gate. Test each variable separately, by byte count.
- **Reading every `38;5;N` as a fixed colour.** `38;5;0` to `38;5;15` is the slot form, and "fixing" it breaks theme repair. Indexes above 15 and truecolor are the findings.
- **Claiming accessibility from memory.** "Fully accessible CLI", WCAG 4.1.2 or 1.4.12 cited for plain output. Document the mechanism, never the claim.
- **Three error prefixes in one binary,** because each file was written alone. Pick `error:`, `note:` and `help:` once and snapshot the corpus.
- **One string for two audiences.** A `logger.warn` printed as the user's notice, with a timestamp and a level. Compose the message at the boundary and send the cause to the log.
- **An invented error code** (`E0042`) with no explain page, or an exit code described as a diagnostic code.
- **An em dash written into CLI output,** or the documentation punctuation rule applied to runtime strings, or a dash swapped where the next step should be a `help:` line.
- **A TUI as the only path.** Every key binding needs a subcommand, and a linear mode is opt-in because no API detects a screen reader.
