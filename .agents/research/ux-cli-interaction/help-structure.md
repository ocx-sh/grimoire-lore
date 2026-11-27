---
title: Help structure of CLIs (top-level help, subcommand help, bare invocation, command grammar)
program: product
sub_program: ux
topic: ux-cli-interaction
worker: help-structure
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
scope: Shape of top-level and subcommand help, bare-invocation behaviour, the command-grammar rule, and a check that runs a binary and asserts them. Measured on 12 exemplar CLIs plus ocx 0.6.8 and grim 0.16.0. Out of scope are description line length (CLI-12), stream and exit-code values, colour and prompts (pinned elsewhere). Scout rows DT1, DT2, DT19, CD32, CG35, PR43, RM9 and PI34 could not be located by those IDs in `ux-topic-map/*.md` (`grep -n "DT19\|CD32\|CG35\|PR43\|RM9\|PI34" ux-topic-map/*.md` printed nothing); the commission and `product-audit/cli-first-run.md` were used instead.
---

# Help structure of CLIs

## Contents

1. Summary
2. Findings (method, measurements, what the guides say, clap mechanics, decisions)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Bare `ocx` and bare `grim` already print the same short help as `-h` (44 and 46 lines, exit 0, stdout). That is the majority behaviour (cargo, gh, kubectl, helm, flyctl do the same). Keep it.
- Only 1 of 14 CLIs measured (deno) does something other than help on bare invocation: it starts a REPL. 3 of 14 (git, npm, terraform) print help on stdout but exit nonzero (1, 1, 127). uv, rustup and docker print it on stderr.
- `-h` and `--help` print help on every CLI. `-h` is the short form (ocx 44 lines vs 126, grim 45 vs 86) in ocx and grim only; 11 of the other 12 print the same text for both (root line counts equal; docker differs by one line, 88 vs 89).
- Root `-h` length: median of the 14 is 62 lines, range 35 to 126. ocx (44) and grim (45) are already inside the better half. A 60-line budget for the root `-h` is derived from that median, not from a source (judgment).
- Examples are rare. Root help carries an Examples block in 1 of 14 (gh, 3 lines) plus short "Common commands" blocks in rustup and helm. A leaf (`<cmd> --help`) with an Examples heading appears in gh (every one of 3 leaves probed), kubectl `get`, and git (man page only, not `-h`). ocx and grim have none, anywhere (confirmed by `product-audit/cli-first-run.md` and re-measured here).
- [clig.dev](https://clig.dev/#help) says to lead with examples. No measured CLI puts them first at the root; kubectl puts them first at the leaf (line 9 of 125). gh puts them near the end (line 63 of 73). So "examples first" is a guide's position, not a measured norm.
- The most common command is in the first 6 rows in 9 of 12 exemplars (docker 1, cargo 1, deno 1, npm first line, uv 2, terraform 3, flyctl 4, rustup 6, kubectl 6). It is row 8 of 12 in gh and row 14 of 22 in git, but both group the list under headings. ocx `exec` is row 18 of 22 and grim `add` row 11 of 27, in flat lists.
- 6 of 14 group the command list under task headings (git, gh, docker, kubectl, terraform, flyctl). ocx and grim are flat.
- `-h` after other arguments works in 12 of 14 when the arguments before it are valid (exceptions: docker run, uv run and deno run pass it on, see below). It fails where an earlier token is a parse error (clap, cobra: the error comes first), where `-h` means something else (`docker run -h` is `--hostname`), and where trailing arguments belong to a child program (`uv run script -h`, `deno run file -h`). `git commit -h` fails outside a repository (`fatal: not a git repository`, exit 128 on git 2.43.0).
- Top-level typo suggestions are printed by 8 of 14 (git, cargo, gh, kubectl, terraform, flyctl, helm, grim). ocx does not: its plugin dispatcher answers first.
- Fleet defects found by running the binaries: `ocx package` (a group, no subcommand) exits 2, while `ocx add` with no argument exits 64 and bare `ocx` exits 0; `ocx` lists both `update` and `upgrade` ([clig.dev](https://clig.dev/#subcommands) calls that pair confusing); `ocx exec --offline` is rejected ("unexpected argument") because that flag is accepted only before the subcommand, yet it is listed as a global option.
- The command-grammar decision: top level is verbs for the product's headline workflow; `noun verb` groups only where a noun has 3 or more operations; one verb per meaning in the whole tree. Both fleet CLIs already mix the two; the rule names what to keep.
- One script (31 lines, in section 3) runs a binary and asserts six of the rules below; it was run against ocx, grim, gh, cargo and git and fails ocx and grim on HELP-04, HELP-05 (and HELP-06 for ocx), as expected.

## Findings

### 1. Method

Measurement date 2026-11-27, Linux x86_64 (WSL2), stdin `/dev/null`, `NO_COLOR=1`, `PAGER=cat`, a fresh empty scratch directory (git initialised for the git probe), `HOME` pointed at an empty directory (`RUSTUP_HOME` and `CARGO_HOME` kept so the cargo shim works). Installed: git 2.43.0, cargo 1.96.0 (2026-05-25), gh 2.105.0 (2026-11-17), uv 0.13.9, npm 11.20.0, docker 29.10.0, rustup 1.29.3 (2026-11-02), ocx 0.6.8 (`ocx version`), grim 0.16.0 (`grim --version`). Fetched from release archives into `~/.cache/research-lang/exemplars/product/ux-cli-help-structure/bin/` (the earlier directory name was removed by something else during the run; this one is the copy used): kubectl v1.37.3 (`https://dl.k8s.io/release/stable.txt`), terraform 1.17.2 (`https://checkpoint-api.hashicorp.com/v1/check/terraform`, `https://releases.hashicorp.com/terraform/1.17.2/`), deno 2.9.8 (`https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip`), flyctl v0.5.19 (`https://github.com/superfly/flyctl/releases/tag/v0.5.19`), helm v4.3.2 (`https://get.helm.sh/helm-latest-version`). brew was not measured (the container pull did not complete in the time used). The 14 CLIs are 12 exemplars plus ocx and grim.

Per CLI the measurement script ran, with `<sub>` the CLI's most common command (git commit, cargo build, gh pr, uv run, npm install, docker run, kubectl get, terraform plan, deno run, rustup update, flyctl deploy, helm install, ocx exec, grim add):

```
<cli>                      # bare: exit code, lines on stdout and on stderr
<cli> --help ; <cli> -h    # root: line counts (cat stdout stderr | wc -l)
<cli> <sub> --help ; <cli> <sub> -h
<cli> <sub> <valid-flag> -h ; <cli> <sub> somearg -h ; <cli> <sub> --nosuchflag -h
<cli> <typo> ; grep -ciE '^(EXAMPLES?:?|Examples?:?)\s*$' on each help text
```

Limits: the "most common command" is a judgment per CLI (the one its own README or getting-started leads with). Example counting looks for an `Examples` heading; helm's inline numbered usage list and rustup's "Common commands" block are counted separately. git `--help` opens a man page on a terminal; with `PAGER=cat` and no terminal it printed the 44-line usage (same as bare), so the git leaf `--help` number (648 lines) is the man page and `-h` (64 lines) is used for comparison.

### 2. Bare invocation, `--help`, `-h` (root)

| CLI | Bare: exit, lines, stream | `--help` lines | `-h` lines | Root examples block |
|---|---|---|---|---|
| git 2.43.0 | 1, 44, stdout | 44 | 44 | no ("common commands" list only) |
| cargo 1.96.0 | 0, 41, stdout | 41 | 41 | no |
| gh 2.105.0 | 0, 73, stdout | 73 | 73 | yes, `EXAMPLES` 3 lines at line 63 of 73 |
| uv 0.13.9 | 2, 70, stderr | 70 | 70 | no |
| npm 11.20.0 | 1, 35, stdout | 35 | 35 | no (5 usage lines at the top) |
| docker 29.10.0 | 0, 88, stderr | 88 | 89 | no ("Common Commands" group first) |
| kubectl v1.37.3 | 0, 70, stdout | 70 | 70 | no |
| terraform 1.17.2 | 127, 42, stdout | 42 | 42 | no |
| deno 2.9.8 | 0, 4, stdout: starts a REPL | 126 | 126 | no |
| rustup 1.29.3 | 1, 63, stderr | 54 | 54 | "Common commands" with 3 `$ rustup ...` lines |
| flyctl v0.5.19 | 0, 25, stdout | 76 | 76 | no |
| helm v4.3.2 | 0, 109, stdout | 109 | 109 | "Common actions" 3 lines |
| ocx 0.6.8 | 0, 44, stdout | 126 | 44 | no |
| grim 0.16.0 | 0, 46, stdout | 86 | 45 | no |

Reading it.

- Bare invocation of the root prints help in 13 of 14. Exit 0 in 8 (cargo, gh, docker, kubectl, flyctl, helm, ocx, grim), nonzero in 5 (git 1, npm 1, uv 2, rustup 1, terraform 127); deno exits 0 but is the REPL. 127 is the "command not found" code in shells; terraform returns it for bare invocation (reproduce: `terraform; echo $?`). Stream: stdout in 10, stderr in 3 (uv, docker, rustup; docker prints to stderr and exits 0, which makes `docker | less` show nothing).
- Root `-h` lines, sorted: 35, 41, 42, 44 (ocx), 44 (git), 45 (grim), 54, 70, 70, 73, 76, 89, 109, 126. Median (54 + 70) / 2 = 62.
- Only ocx and grim (clap with `-h` short, `--help` long) keep two lengths. `ocx --help` is 126 lines of which about 25 are the Commands block and the rest 13 global options (`product-audit/cli-first-run.md` section 2).
- deno bare starts a REPL; with stdin at `/dev/null` it exits 0 after 4 lines. In a CI or agent shell with a pty the same call blocks waiting for input. This is the case an agent must not reproduce.

### 3. Leaf help (the most common subcommand)

| CLI and leaf | `--help` lines | `-h` lines | Examples heading in help | `<leaf> -h` after a valid flag |
|---|---|---|---|---|
| git commit | 648 (man) | 64 | man page: yes (13 lines match "example"); `-h`: no | works in a repo; outside one: `fatal: not a git repository`, exit 128 |
| cargo build | 59 | 59 | no | works (exit 0) |
| gh pr (group) / gh pr list | 54 / 72 | 54 | yes / yes (`gh pr list --help` has `EXAMPLES`, 6+ examples) | works |
| uv run | 225 | 225 | no | works with a flag; `uv run somearg -h` exits 2 ("Failed to spawn: somearg": `-h` belongs to the child) |
| npm install | 133 | 133 | no | works |
| docker run | 178 | 5 lines of error | no | `docker run -h` exits 125 ("flag needs an argument: 'h' in -h"): `-h` is `--hostname`; only `--help` works |
| kubectl get | 125 | 125 | yes, `Examples:` at line 9 | works |
| terraform plan | 95 | 95 | no | works |
| deno run | 110 | 110 | no | works with a flag; `deno run somearg -h` runs the file argument ("Module not found") |
| rustup update | 31 | 31 | no | works |
| flyctl deploy | 236 | 236 | no | works |
| helm install | 159 | 159 | inline "usage" list of 5 forms, no heading | works |
| ocx exec | 102 | 35 | no | works (`ocx exec somearg -h`: exit 0, 35 lines); `ocx exec --offline -h` exits 64 |
| grim add | 88 | 26 | no | works (`grim add --offline -h`: exit 0, 26 lines) |

Reading it.

- A leaf `-h` is below 40 lines only for rustup (31), ocx (35) and grim (26). The others print 54 to 236 lines. So a leaf budget would be set by the fleet, not by the ecosystem; this file therefore makes it CONSIDER, not SHOULD.
- Examples at the leaf are as rare as at the root: 2 of 14 (gh, kubectl) carry a heading in the leaf help text itself.
- The "hostile" probes (`--nosuchflag -h`) print an error first in clap and cobra CLIs (cargo, gh, kubectl, ocx, grim, helm, deno, uv), so `-h` is not a universal escape. Putting `-h` last after a wrong flag teaches the user the error, which is the right order; [clig.dev](https://clig.dev/#help)'s sentence ("you should be able to add `-h` to the end of anything and it should show help") holds only for valid input.
- Useful trick for a check: because the parse error comes before `-h`, appending `-h` to an example line runs the parser on it without side effects. A wrong example fails with exit 64 (ocx, grim) or 1/2 (others). This is HELP-05's verification.

### 4. Position of the most common command, grouping

| CLI | Command | Position | Grouping of the list |
|---|---|---|---|
| docker | run | row 1 of 55 | "Common Commands", "Management Commands", "Swarm Commands", "Commands" |
| cargo | build | row 1 of 16 (+ "... See all commands with --list") | flat, curated 16 |
| deno | run | row 1 of 54 | flat |
| npm | install | first usage line (`npm install  install all the dependencies in your project`) | usage lines, then a comma-separated list of all commands |
| uv | run | row 2 of 24 | flat, plus option groups (Cache, Python, Global) |
| terraform | plan | row 3 of 28 | "Main commands" (5) then "All other commands" |
| flyctl | deploy | row 4 of 50 | 6 task headings ("Deploying apps & machines", "Configuration & scaling", ...) |
| rustup | update | row 6 of 23 | flat; "Common commands" block with 3 examples below |
| kubectl | get | row 6 of 44 | 8 headings: Basic (Beginner), Basic (Intermediate), Deploy, ... |
| gh | pr | row 8 of 12 in CORE COMMANDS | headings: CORE, GITHUB ACTIONS, ALIAS, ADDITIONAL, HELP TOPICS; alphabetical inside |
| helm | install | row 9 of 27 | "Common actions" block first (3 example lines), then alphabetical "Available Commands" |
| git | commit | row 14 of 22 | headings by task ("start a working area", "work on the current change", ...) |
| grim | add | row 11 of 27 | flat; `help` row included |
| ocx | exec | row 18 of 23 | flat |

Method: line number of the command's row in the `-h` output, counting rows of the command lists; hand-checked for git, gh, kubectl, deno, rustup. The totals come from `awk '/^  +[a-z][a-z0-9-]*[ ,*]/{n++}END{print n}'` over each help text and may count a few non-command rows.

Reading it: a flat list longer than about 20 is a fleet-only pattern among the grouped tools (ocx 23, grim 27, uv 24, helm 27, deno 54, rustup 23). The three that bury their headline verb (git 14, ocx 18, grim 11) only git compensates with task headings.

### 5. Context help: suggestions, error to help links, footers

- Top-level unknown subcommand, first lines of output (`<cli> <typo>`): suggestion in git (`The most similar command is`), cargo (`help: a command with a similar name exists: build`), gh, kubectl, terraform (`Did you mean "plan"?`), flyctl, helm (`Did you mean this?`), grim (`tip: some similar subcommands exist`). None in uv (`unrecognized subcommand` plus Usage in the first 3 lines), docker (`Run 'docker --help' for more information`), rustup (reads `updat` as a toolchain), ocx. npm runs `install` for `instal` (prefix match; here it opened `package.json` and failed with ENOENT, exit 254). deno treats the word as a file.
- Missing required argument: ocx and grim print the clap `error: the following required arguments were not provided:` block, 6 lines, exit 64, stream stderr. kubectl: `You must specify the type of resource to get. Use "kubectl api-resources" for a complete list` (names the next command). docker: `requires at least 1 argument` plus a usage line. gh repo clone: `cannot clone: repository argument required` followed by the full 57-line help.
- Group node with no subcommand (`<cli> <group>`): `gh pr` exit 0 on stdout (52 lines); `docker image` exit 0 on stderr (19); `kubectl config` exit 1 on stderr (30); `terraform state` exit 1 on stdout (21); `uv pip` exit 2 on stderr (57); `ocx package` exit 2 on stderr (32); `grim config` exit 64 on stderr (23). Seven different combinations. For the fleet: `ocx add` (usage error) exits 64 but `ocx package` exits 2; 2 is clap's own default, not in the sysexits family the CLIs otherwise use (`product-audit/cli-first-run.md` section 3).
- Footers: a URL appears in the root help of 5 of 14 (gh, docker, kubectl, deno, ocx). GNU Coding Standards ask for a bug-report address and home page in `--help` output ([GNU, section 4.8.2](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html)); the last-line pattern "Use `<cli> <command> --help` for more information" is in cargo, uv, flyctl, helm, gh.

### 6. What the guides say

- clig.dev (page carries no date): show concise help when a command that needs arguments gets none; full help on `-h` and `--help` ("you should be able to add `-h` to the end of anything and it should show help"); "Users tend to use examples over other forms of documentation, so show them first in the help page"; link to web docs from help; suggest a correction when you can guess ("but don't force it on them"); `-h` "should only mean help"; "Either `noun verb` or `verb noun` ordering works, but `noun verb` seems to be more common"; do not ship "update" and "upgrade" both. [clig.dev](https://clig.dev/)
- GitHub CLI notation: literal text for fixed words, `<angle-brackets>` for a value the user supplies, `[square brackets]` for optional, `{a | b}` for required alternatives, `...` for repeatable, dash-case for multi-word placeholders. [gh docs](https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md) (no date on the page). POSIX uses the same bracket, bar and ellipsis notation: "Arguments separated by the `|` bar notation are mutually-exclusive"; "Ellipses are used to denote that one or more occurrences of an operand are allowed" ([POSIX.1-2024, ch. 12](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html)).
- Heroku CLI style guide (last updated 2025-01-31): "Generally topics are plural nouns and commands are verbs"; the root of a topic lists the nouns ("Never create a `*:list` command"); "Topic and command descriptions should be provided for all topics and commands"; "Flags are preferred to args". It has no section on examples or help layout. [Heroku](https://devcenter.heroku.com/articles/cli-style-guide)
- Azure CLI command guidelines (no date): "Commands must follow a `[noun] [noun] [verb]` pattern"; "All command names should contain a verb"; units belong in help text. [Azure CLI](https://github.com/Azure/azure-cli/blob/dev/doc/command_guidelines.md)
- Microsoft System.CommandLine (page `ms.date` 2022-05-24, `updated_at` 2025-12-23): the library gives `RootCommand` a Help option, a `--version` option and a suggest directive by default; recommends minimising aliases; its sample help option is `--help` with aliases `-h`, `/h`, `-?`, `/?`. [Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/commandline/syntax)
- Atlassian (2020-07-23): "Build `--help` into the CLI"; help after any specific command; suggest the next step. No example guidance. [Atlassian](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis)
- Nielsen's heuristics (published 1994-04-24, reviewed 2024-01-30): "Recognition rather than recall" (options visible; help in context) and "Help and documentation" ("searchable, concise, task-focused, and ideally shown in context"); "Consistency and standards" ("Users should not have to wonder whether different words ... mean the same thing"). These map to HELP-04, HELP-05 and HELP-06. [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/) A heuristic list for GUIs; the carry-over to a CLI is this file's judgment (scout row M117).
- GNU Coding Standards: `--help` "should output brief documentation for how to invoke the program, on standard output, then exit successfully"; other arguments are ignored once it is seen. [GNU](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html)
- kubectl conventions (page modified 2026-05-15): states stable-output rules for scripts (`-o json`, fully qualified versions), nothing on help layout. [Kubernetes](https://kubernetes.io/docs/reference/kubectl/conventions/)

### 7. Mechanics in clap (the fleet's framework; clap 4.6.10, crates.io `updated_at` 2026-11-24)

From the clap source doc comments (`clap_builder/src/builder/command.rs` and `arg.rs`, master, fetched 2026-11-27):

- `help_template` takes tags `{name}`, `{version}`, `{author-with-newline}`, `{about-with-newline}`, `{usage-heading}`, `{usage}`, `{all-args}`, `{options}`, `{positionals}`, `{subcommands}`, `{tab}`, `{before-help}`, `{after-help}` ([source](https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs), lines ~2270-2312). A template that omits `{after-help}` drops the examples text.
- `after_help` is shown for `-h`; `after_long_help` for `--help` only, and `after_help` is the fallback in both (`command.rs:2025`, `:2049`). Examples therefore go in `after_help` when they must appear in short help, and in `after_long_help` when only in long help. `before_help` and `before_long_help` mirror them.
- `Command::next_help_heading` sets the default section heading for later args; `Arg::help_heading` overrides it per arg (`command.rs:2376`, `arg.rs:2428`). Heading text replaces "Options" or "Arguments".
- `Command::subcommand_help_heading` renames the "Commands:" block (`command.rs:3703`). Clap offers one subcommand block per command; there is no per-subcommand heading, so grouped command lists (gh, kubectl, docker style) need a custom `help_template` or the unstable `Command::help_heading` flags; this was not tested here.
- Subcommands list in definition order unless `display_order` is set (`arg.rs:2417`; measured: ocx and grim lists are neither alphabetical nor by frequency, they follow the order of definition).
- `arg_required_else_help(true)` prints help and exits when no argument is given; "subcommands count as arguments" (`command.rs:2411`). Exit code and stream are clap's default (2, stderr), which is the source of `ocx package` exit 2. The derive docs add: a required (non-`Option`) subcommand field implies `.subcommand_required(true).arg_required_else_help(true)` ([derive docs](https://docs.rs/clap/latest/clap/_derive/index.html)). `ocx` and `grim` make the subcommand optional (`Usage: ocx [OPTIONS] [COMMAND]`) and print help themselves, which is why their bare root exits 0.
- `help_expected(true)` panics in debug builds if any arg lacks help (`command.rs:1727`): a free test that every flag has text.
- Short and long variants: a single-paragraph doc comment produces only the short form; a blank line produces `about` and `long_about` (derive docs). `-h` shows the short, `--help` the long.

### 8. Decisions

1. Help skeleton, in order: (a) one-line description; (b) `Usage:` line in the gh/POSIX notation; (c) examples, 2 to 5 runnable lines, first the headline task; (d) commands grouped by task, headline group first; (e) options, command-local before global; (f) footer: next-step line and docs URL. Leaf help: description, usage, examples, arguments, options. Judgment: the guide ([clig.dev](https://clig.dev/#help)) says examples first; measured practice is split (kubectl first, gh near the end, 12 of 14 none), so this is a rule from the guide, applied to ocx and grim where it costs 3 lines.
2. Length budget: root `-h` at or under 60 lines (median of 14 is 62; ocx 44 and grim 45 already meet it); `--help` is unbounded but the examples block stays inside the first 30 lines. Leaf `-h`: CONSIDER 40 lines, since only 3 of 14 meet it.
3. Bare invocation: bare root prints the `-h` text on stdout and exits 0, never opens an interactive session, never reads stdin, never touches the network or the project. A bare group or a missing required argument is a usage error: help on stderr, and the exit code the pinned exit contract gives usage errors (64 for the fleet). One convention per tree.
4. Command grammar: the headline workflow gets top-level verbs (`add`, `install`, `exec`); a noun gets a group (`package install`, `config get`) only when it has 3 or more operations; one verb per meaning across the whole tree (no update/upgrade, remove/delete/rm pair at the same level unless they mean different things and say so in the description); topic nouns are singular or plural consistently; flags over positional arguments beyond one.
5. The check (below) runs the binary and asserts the checkable parts.

## Normative guidance candidates

IDs are proposals for the catalog (prefix `UX-CLI-HELP-`); severity in the second column.

| ID | Sev | Rule | Rationale | Verification |
|---|---|---|---|---|
| HELP-01 | MUST | Bare invocation of the root prints the same short help as `-h` to stdout and exits 0. It never starts a REPL, wizard or prompt, and never reads stdin. | 13 of 14 measured print help; deno's REPL blocks an agent or CI shell. [clig.dev](https://clig.dev/#help): show concise help when run with no arguments. | Run `timeout 10 <bin> </dev/null`; expect exit 0, stdout starting with `Usage:` or a description plus `Usage`, and equal to `<bin> -h` stdout. Pass: `ocx` (44 lines, exit 0). Fail: `deno` (4 lines, REPL banner), `terraform` (exit 127). |
| HELP-02 | MUST | `-h` and `--help` work on the root and on every command and subcommand: exit 0, stdout, non-empty. No command uses `-h` for another meaning. They need no config file, network, credentials or project directory. | `-h` as hostname breaks every user's reflex; git's `commit -h` dies outside a repo. [clig.dev](https://clig.dev/#arguments-and-flags): `-h` "should only mean help". | Walk the command tree (rows of `<bin> help` or `-h`); for each path run `<bin> <path> -h` and `--help` with `HOME` and cwd empty; assert exit 0 and a `Usage` line. Fail: `docker run -h` (exit 125), `git commit -h` outside a repo (128). |
| HELP-03 | MUST | A help flag after valid arguments shows that command's help. A parse error before it names the next step (`For more information, try '--help'`). A command that forwards trailing arguments to a child program says so in its usage line and still accepts `--help` before the first positional. | `-h` at the end is how people ask; the exception must be visible. | For each leaf: `<bin> <path> <valid-flag> -h` exit 0 and contains `Usage`. For forwarding commands (`exec`, `run`): usage line contains `--` or `<ARGV>`. Pass: `ocx exec somearg -h` (exit 0, 35 lines). Fail: `docker run -h`. |
| HELP-04 | SHOULD | The product's headline command is within the first 5 rows of the command list or under a heading named Common, Main, Basic or Core. Lists above 12 rows are grouped under task headings. | 9 of 12 exemplars put it in the first 6 rows; the ones that do not (git, gh, helm) group or open with a common-actions block. ocx `exec` is row 18 of 23, flat. Nielsen: recognition over recall. | `<bin> -h \| awk` row index of the headline command (the check takes it as an argument) is at most 5, or its heading matches `common\|main\|basic\|core`. Fail today: ocx (row 18), grim (row 11). |
| HELP-05 | SHOULD | The root help has a 2 to 5 line examples block; every leaf of the 5 most used commands has an `Examples` block in `--help` (and the first example in `-h`). Every example is runnable as written, uses real placeholders in `<angle>` form, and shows the headline task first. | [clig.dev](https://clig.dev/#help): users prefer examples over other documentation. Measured: examples present in 2 of 14 leaves, 0 in ocx and grim. | Extract lines under `Examples` that start with the binary name; append `-h` to each and run: exit 0 means the flags and arguments parse (the parse error precedes `-h`). In clap: put text in `after_help` (short) or `after_long_help` (long). Fail: ocx, grim (no block). |
| HELP-06 | SHOULD | One verb per meaning across the tree, at the same level: no `update` and `upgrade`, no `remove` and `delete` together. Groups are nouns; leaves are verbs. | [clig.dev](https://clig.dev/#subcommands) flags update/upgrade as confusing; [Heroku](https://devcenter.heroku.com/articles/cli-style-guide): topics are nouns, commands verbs; [Azure](https://github.com/Azure/azure-cli/blob/dev/doc/command_guidelines.md): all command names contain a verb. | Parse the command names at each level; fail on any pair in {update, upgrade}, {remove, delete, rm}, {create, new}, {list, ls} that both exist at the same level without differing descriptions. Fail today: ocx (`update` and `upgrade`). |
| HELP-07 | SHOULD | Root `-h` is at most 60 lines; if `--help` is longer, `-h` is a complete, usable summary (usage, examples, command list). | Median of 14 is 62; ocx 44 and grim 45 are fine, but `ocx --help` is 126 lines with 13 global options before any example. | `<bin> -h \| wc -l` is at most 60. Pass: ocx 44, grim 45, git 44, cargo 41. Fail: gh 73, deno 126, helm 109. |
| HELP-08 | SHOULD | A group with no subcommand and a missing required argument behave alike across the tree: help on stderr, the project's usage exit code, and no other code. Root (HELP-01) is the only success case. | 7 different group behaviours among 7 CLIs; the fleet has 64 and 2. | For each group `g`: `<bin> g; echo $?` is the usage code; `<bin> g 2>&1 >/dev/null \| head` shows Usage. Fail today: `ocx package` exits 2 (pinned code is 64). |
| HELP-09 | SHOULD | An unknown top-level command or subcommand prints a close-match suggestion (edit distance), exits with the usage code, and never runs a different command on a prefix. | 8 of 14 suggest; npm ran `install` for `instal`. [clig.dev](https://clig.dev/#help): suggest, "but don't force it on them". | `<bin> <typo-of-a-real-command>`: output contains `similar`, `Did you mean` or `tip:`; the exit equals the usage code. Fail today: ocx (plugin message first). |
| HELP-10 | SHOULD | Usage lines use one notation: `<placeholder>`, `[optional]`, `{a\|b}`, `...`; no raw uppercase placeholders in prose. Multi-word placeholders are dash-case. | gh docs and POSIX agree; clap emits `<ARG>` and `[OPTIONS]` by default. | `grep -E '^(Usage\|  [a-z]+ .*)' <help>` must match the notation; flag bare `ARG_NAME` outside `<>`. |
| HELP-11 | SHOULD | The command list is ordered by the user's workflow (headline first) or grouped by task, not by definition accident. In clap, set `display_order`, `subcommand_help_heading`, or `help_template` explicitly. | ocx and grim lists follow definition order (clap default). | Compare `<bin> -h` row order against the README's order of verbs; the check in HELP-04 covers the headline. |
| HELP-12 | CONSIDER | Root help ends with the next-step line (`Run '<bin> <command> --help' ...`) and the docs URL. | Only 5 of 14 root helps contain a URL; [clig.dev](https://clig.dev/#help) ("link to the web version of the documentation") and [GNU](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html) (home page in `--help` output) both ask for it. | `<bin> -h \| tail -3 \| grep -E 'https?://'`. |
| HELP-13 | CONSIDER | Leaf `-h` at most 40 lines. | Only rustup, ocx and grim meet it (31, 35, 26). | `<bin> <leaf> -h \| wc -l`. |
| HELP-14 | CONSIDER | Command grammar: top-level verbs for the headline workflow; a `noun verb` group when a noun has 3 or more operations; the same noun never appears both as a top-level verb target and as a group doing the same job. | Fleet: ocx has `add`, `pull`, `exec` at the top and `package install` below; two models for a new reader. | List top-level names and groups; for each group, ask whether a top-level verb duplicates one of its leaves (manual, decision in section "must not decide alone"). |

### The check

`help-check.sh <bin> <headline-command> [root-budget]` (31 lines, bash; run from any directory; exits 1 on any failure). It asserts HELP-01, HELP-02 (root `--help` and `-h` on every top-level command), HELP-04, HELP-05, HELP-06 and HELP-07 (root budget). Save as `scripts/help-check.sh` in a CLI repo and run it in CI after the binary builds.

```bash
#!/usr/bin/env bash
# help-check.sh <bin> <headline-command> [root-budget=60]
bin=$1; head=$2; budget=${3:-60}; fail=0
export NO_COLOR=1 PAGER=cat; cd "$(mktemp -d)"
ng(){ echo "FAIL $1: $2"; fail=1; }
run(){ timeout 20 "$@" </dev/null; }
out=$(run $bin 2>/dev/null); ec=$?
{ [ $ec -eq 0 ] && grep -qi '^usage' <<<"$out"; } || ng HELP-01 "bare '$bin' exit=$ec, stdout lacks Usage"
n=$(run $bin -h 2>/dev/null | wc -l); [ "$n" -gt 0 ] && [ "$n" -le "$budget" ] || ng HELP-07 "'$bin -h' is $n lines (budget $budget)"
run $bin --help >/dev/null 2>&1 || ng HELP-02 "'$bin --help' exit != 0"
cmds=$(run $bin -h 2>/dev/null | awk '/^[A-Za-z ]*[Cc]ommands?[^:]*:$|^[A-Z ]+COMMANDS$/{f=1;next} /^$/{f=0} f&&$1~/^[a-z][a-z0-9-]*[:,]?$/{sub("[:,]$","",$1);print $1}' | grep -vx help)
for c in $cmds; do
  run $bin $c -h 2>/dev/null | grep -qi 'usage' || ng HELP-02 "'$bin $c -h' has no Usage on stdout / nonzero exit"
done
row=$(echo "$cmds" | grep -nx "$head" | cut -d: -f1)
grp=$(run $bin -h 2>/dev/null | awk -v h="$head" '/^[A-Za-z ()]+:$|^[A-Z ]+COMMANDS$/{g=$0} $1==h||$1==h":"{print g;exit}')
{ [ -n "$row" ] && [ "$row" -le 5 ]; } || grep -qiE 'common|main|basic|core' <<<"$grp" || ng HELP-04 "'$head' is row ${row:-none}, group '${grp}'"
ex=$(run $bin $head --help 2>/dev/null | awk '/^(EXAMPLES|Examples):?$/{f=1;next} /^[A-Za-z]/{f=0} f&&/^ +(\$ )?'"$(basename $bin)"' /{sub(/^ +(\$ )?/,"");print}')
[ -n "$ex" ] || ng HELP-05 "'$bin $head --help' has no Examples block"
while IFS= read -r l; do [ -n "$l" ] && { run bash -c "$l -h" >/dev/null 2>&1 || ng HELP-05 "example does not parse: $l"; }; done <<<"$ex"
for p in update:upgrade remove:delete create:new list:ls; do a=${p%:*}; b=${p#*:}
  grep -qx "$a" <<<"$cmds" && grep -qx "$b" <<<"$cmds" && ng HELP-06 "both '$a' and '$b' are top-level commands"; done
exit $fail
```

Measured output on 2026-11-27 (the binaries must be on PATH): `ocx exec` prints `FAIL HELP-04: 'exec' is row 18, group 'Commands:'`, `FAIL HELP-05: 'ocx exec --help' has no Examples block`, `FAIL HELP-06: both 'update' and 'upgrade' are top-level commands`; `grim add` prints HELP-04 (row 11) and HELP-05; `gh pr` fails only HELP-07 (`'gh -h' is 73 lines`); `cargo build` fails HELP-05 only. Limits: it parses the clap/cobra block layout (heading ending in `Commands:` or `COMMANDS`, two-space indent); it does not walk below the top level, does not check HELP-08 or HELP-09, and the example extractor expects example lines to start with the binary name. For a different layout, a project passes a command list in a file; not built.

## Dated facts

| Fact | Value | Source | Date stated by source | Type |
|---|---|---|---|---|
| clap current stable | 4.6.10, updated 2026-11-24 | https://crates.io/api/v1/crates/clap | 2026-11-24 | authority (registry API) |
| clap `help_template` tags, `after_help` vs `after_long_help`, `next_help_heading`, `Arg::help_heading`, `subcommand_help_heading`, `arg_required_else_help` | as in section 7 | https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs and `arg.rs` | master on 2026-11-27 (no per-line date) | platform (source) |
| clap `-h` short and `--help` long | "`long_*` variants are used when user calls the program with `--help`" | https://docs.rs/clap/latest/clap/_derive/index.html | clap 4.6.10 page | platform |
| POSIX utility syntax: bracket, bar, ellipsis notation | IEEE Std 1003.1-2024 ch. 12 | https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html | 2024 (Issue 8) | authority |
| GNU `--help`: stdout, exit 0, bug address and home page | section 4.8.2 | https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html | no date on page | authority |
| Heroku CLI style guide | topics plural nouns, commands verbs; last updated | https://devcenter.heroku.com/articles/cli-style-guide | 2025-01-31 | vendor |
| System.CommandLine syntax page | `ms.date` 2022-05-24, `updated_at` 2025-12-23 | https://learn.microsoft.com/en-us/dotnet/standard/commandline/syntax | as given | vendor |
| Nielsen's ten heuristics | published 1994-04-24, last reviewed 2024-01-30 | https://www.nngroup.com/articles/ten-usability-heuristics/ | as given | vendor (consultancy, independent of any CLI) |
| Atlassian CLI principles | 10 principles | https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis | 2020-07-23 | vendor |
| kubectl conventions | last modified | https://kubernetes.io/docs/reference/kubectl/conventions/ | 2026-05-15 | authority (project docs) |
| clig.dev | no date or version on the page | https://clig.dev/ | none | community guide |
| gh syntax guide | no date on the page | https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md | none | vendor (gh project) |
| Azure CLI command guidelines | no date; `dev` branch | https://github.com/Azure/azure-cli/blob/dev/doc/command_guidelines.md | none | vendor |
| Exemplar CLI versions | git 2.43.0, cargo 1.96.0, gh 2.105.0 (2026-11-17), uv 0.13.9, npm 11.20.0, docker 29.10.0, kubectl 1.37.3, terraform 1.17.2, deno 2.9.8, rustup 1.29.3 (2026-11-02), flyctl 0.5.19 (build 2026-11-26), helm 4.3.2, ocx 0.6.8, grim 0.16.0 | each binary's `--version` or `version`, run 2026-11-27 | as listed | measurement |
| CLI-12 text | "A `///` on a clap-facing surface states the user contract and nothing else: ASCII only, short help <= ~70 chars, no ADR/section/code-path references, no dates." (MUST) | `skills/rust-quality-reference/cli-contract.md:134` in this repo | repo HEAD 2026-11-27 | catalog |

Help latency (extra): `--help` took 1 to 136 ms per call (mean of 5 warm runs; npm 136, gh 96, docker 64, others at or under 50). It is not a rule input.

## What an agent must not decide alone

- Which command is the product's headline workflow, and the order of the command list (HELP-04, HELP-11). That is a product decision; the agent proposes from the README's first command and asks.
- Renaming or removing a command, flag or alias to meet HELP-06 or HELP-14 (`update` vs `upgrade`, `ocx package install` vs a top-level verb). A rename is a breaking change for users and scripts; ocx already carries a deprecation (`ocx package info` renamed, removed in 0.7). Ask, and propose a deprecation window.
- Changing a bare-invocation or group exit code that scripts may already depend on (`ocx package` 2 to 64). Ask for the release note.
- The wording of the one-line description and the example tasks shown first (brand voice, claims about what the tool is for). Draft, then ask.
- Whether to ship a pager or a man page; whether `-h` stays shorter than `--help`.

## AI-agent angle

| Typical mistake | Why | Smallest check |
|---|---|---|
| Writes `#[command(arg_required_else_help = true)]` and believes bare invocation exits 0 | clap prints help to stderr and exits 2 with that setting | `<bin>; echo $?` and `<bin> 2>/dev/null \| wc -l` in HELP-01/08 |
| Puts examples in the doc comment of a field, not in `after_help` | the doc comment is the flag description; examples render under the flag, not as a block | HELP-05 extraction finds no `Examples` heading |
| Defines `-h` for `--host` or `--hostname` on a subcommand | collides with help (docker run) | HELP-02: `<bin> <path> -h` exit 0 |
| Adds a custom `help_template` without `{after-help}` | examples silently disappear | HELP-05 |
| Writes example commands that do not parse (stale flag, wrong placeholder) | examples are text, nothing runs them | HELP-05 appends `-h` to each and runs it |
| Treats `-h` as always working after a typo | clap and cobra print the parse error first | HELP-03 tests a valid flag, not a wrong one |
| Adds a new verb that duplicates an existing one (`upgrade` next to `update`) | no list of existing verbs in context | HELP-06 synonym scan |
| Starts a prompt or REPL when no arguments are given | copies the deno pattern | HELP-01: `timeout 10 <bin> </dev/null` returns 0 with Usage |

## Contested / evolving

- Examples first or last. Position for: [clig.dev](https://clig.dev/#help) ("show them first in the help page"). Position in practice: kubectl `get` has `Examples:` at line 9 of 125 and gh at line 63 of 73 of the root help; helm and rustup open with a short common-actions block. A tool with a long options table is better served by examples first; a tool with a three-line help is not. Decision above follows [clig.dev](https://clig.dev/#help) for leaves; for the root, a 3-to-5 line block is enough.
- Exit code and stream of bare invocation. [clig.dev](https://clig.dev/#help) says concise help; nothing says the code. Measured: 0 (cargo, gh, kubectl, helm, flyctl, docker, ocx, grim), 1 (git, npm, rustup), 2 (uv), 127 (terraform). [GNU](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html) requires exit 0 and stdout only for explicit `--help`. The recommendation here (root 0 stdout, group usage code stderr) is a judgment; the opposite view (bare invocation is always a usage error, so nonzero) is what git, npm and uv do. Both are testable; the fleet already picked 0 for the root.
- `noun verb` vs `verb noun`. [clig.dev](https://clig.dev/#subcommands): `noun verb` "seems to be more common"; [Azure CLI](https://github.com/Azure/azure-cli/blob/dev/doc/command_guidelines.md) mandates `[noun] [noun] [verb]`; [Heroku](https://devcenter.heroku.com/articles/cli-style-guide) `topic:command` (noun then verb); gh and docker use noun-verb (`gh pr list`, `docker image ls`); kubectl is verb-noun (`kubectl get pods`); cargo, npm, deno, fly are verb-first. No source claims one is better for novices; none of the fetched sources measures it (no study found). The rule here avoids the question: verbs for the headline workflow, nouns for groups of three or more.
- Whether `-h` should differ from `--help`. Only ocx and grim do it among the 14; clap and cobra tools mostly print the same text. [Microsoft's library](https://learn.microsoft.com/en-us/dotnet/standard/commandline/syntax) and [clig.dev](https://clig.dev/#help) list both and say nothing on length. Judgment: keep the short form (a 44-line summary beats a 126-line one), and ensure the short form has the examples.
- Grouped command lists in clap. Native clap has one "Commands" block; gh, kubectl and docker are cobra or hand-rolled. Whether clap's heading features reach grouping was not tested (only the source comments were read); treat HELP-04's group clause as satisfiable by ordering alone for clap CLIs.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://clig.dev/ | Command Line Interface Guidelines (community) | no date | help, examples, `-h`, suggestions, noun verb |
| https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md | gh usage notation | no date | the notation HELP-10 uses |
| https://devcenter.heroku.com/articles/cli-style-guide | Heroku CLI style guide | 2025-01-31 | topic and command naming, flags over args |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs | clap `Command` source and docs | master, 2026-11-27 | `help_template`, `after_help`, headings |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/arg.rs | clap `Arg` source and docs | master, 2026-11-27 | `help_heading`, `display_order` |
| https://docs.rs/clap/latest/clap/_derive/index.html | clap derive reference | clap 4.6.10 | short vs long help, `next_help_heading` |
| https://docs.rs/clap/latest/clap/struct.Command.html | clap `Command` (rustdoc) | clap 4.6.10; truncated at 100000 characters, not read in full | cross-check only |
| https://docs.rs/clap/latest/clap/struct.Arg.html | clap `Arg` (rustdoc) | clap 4.6.10; truncated | cross-check only |
| https://crates.io/api/v1/crates/clap | registry API | 2026-11-24 | current version |
| https://www.nngroup.com/articles/ten-usability-heuristics/ | Nielsen heuristics | 1994, reviewed 2024-01-30 | recognition, consistency, help in context |
| https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html | GNU `--help` standard | undated | stdout, exit 0, footer |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html | POSIX utility conventions | 2024 | notation, `--`, option order |
| https://learn.microsoft.com/en-us/dotnet/standard/commandline/syntax | System.CommandLine | 2022 / updated 2025-12-23 | default help and version options, aliases |
| https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis | Atlassian CLI principles | 2020-07-23 | `--help` after any command |
| https://github.com/Azure/azure-cli/blob/dev/doc/command_guidelines.md | Azure CLI command guidelines | undated | `[noun] [noun] [verb]` |
| https://kubernetes.io/docs/reference/kubectl/conventions/ | kubectl conventions | 2026-05-15 | scripting conventions; no help guidance |
| `skills/rust-quality-reference/cli-contract.md` (repo) | catalog CLI-12 row | HEAD | the out-of-scope boundary |
| `.agents/research/product-audit/cli-first-run.md` (repo) | fleet grounding audit | 2026-11-27 | ocx and grim baselines |

Primary (platform, standards body or project itself): clap source, clap docs, POSIX, GNU, Microsoft, kubectl conventions, gh syntax, Heroku, Azure, crates.io. Not fetchable: none of the commissioned sources failed; the Heroku guide has no help-layout section and the Atlassian page has no example guidance, both stated above.
