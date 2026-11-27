---
title: CLI interaction above the pinned contracts
topic: ux-cli-interaction
program: product
sub_program: ux
date: 2026-11-27
revised: 2026-11-27 (adversarial review, then wave-2 follow-ups q0 to q2; see Revision log)
model: opus
id_family: UX-CLI
consolidates:
  - ux-cli-interaction/help-structure.md
  - ux-cli-interaction/discoverability-recovery.md
  - ux-cli-interaction/first-run-and-handoff.md
  - ux-cli-interaction/terminal-accessibility.md
  - ux-cli-interaction/followup-q0.md
  - ux-cli-interaction/followup-q1.md
  - ux-cli-interaction/followup-q2.md
revision_inputs:
  - wave-2 follow-ups, 2026-11-27: q0 (UX-CLI-08 network check off Linux, answered partly), q1 (help-layout parser without the depth cap, answered yes), q2 (cargo-dist final line, answered yes)
  - revised check scripts re-run on 2026-11-27 against ocx 0.6.8, grim 0.16.0 and gh 2.105.0 (section "Check scripts")
  - skeptic review of this file, 2026-11-27 (22 findings)
  - re-fetched bixense.com/clicolors and force-color.org, 2026-11-27
  - fleet source reads at ocx HEAD 02b8434e (0.6.8) and grim HEAD 72d3fce1 (0.17.0)
  - five check scripts run against ocx 0.6.8, grim 0.16.0 and gh 2.105.0 (section "Check scripts")
---

# CLI interaction above the pinned contracts

The question: above the pinned stream, colour, prompt and exit-code contracts (CLI-01 to CLI-16 in `skills/rust-quality-reference/cli-contract.md`, and the TUI rows in `tui.md`), what does a CLI owe a first-time human and an everyday user?

The answer covers six things: help and bare invocation, the version flag, typo recovery, global-flag position, completion, and the path from the installer to the first success. It also covers what a person with a screen reader, low vision or a forced palette receives in the byte stream. Measurements come from the four dives, which ran on 2026-11-27 against ocx 0.6.8, grim 0.16.0 (0.17.0 for the installer runs) and 12 exemplar CLIs. The revision added five check scripts and ran them on 2026-11-27. Three wave-2 follow-ups (q0 to q2, 2026-11-27) then tested the network check off Linux, replaced the scripts' depth cap with a stricter parser, and measured what a cargo-dist installer can print last. Each dive, follow-up and script gives its commands inline.

## Verdict

1. **One declared headline command per CLI drives four rules.** The dives defined "the most common command" in three different ways. help-structure took the README's first command (`exec` for ocx). first-run-and-handoff took the quickstart verbs (`init`). The grounding audit took the README's headline verb (`package`). We resolve this with one value per CLI: the headline command, which the owner declares once. That value is checked in the help command list (UX-CLI-04), as the first example (UX-CLI-05) and as the installer's last line (UX-CLI-14). Without one value, the three surfaces drift apart. The audit measured exactly that: the ocx README and site teach two different first runs ([cli-first-run.md §1](product-audit/cli-first-run.md#1-steps-and-reading-time-to-a-first-success)).
2. **Text that the CLI tells a user to run must parse, and a test proves it.** Help examples, error hints, next-step lines and the installer's last line are all text that nothing executes. The single highest-yield check in this topic is to append `-h` to each such command and run it. The parse error comes before help, so a stale example fails without side effects ([help-structure.md §3](ux-cli-interaction/help-structure.md#3-leaf-help-the-most-common-subcommand)). This check catches `ocx install`, a command that does not exist but that an ocx error recommends (`ocx_package_manager/src/error.rs:357`). UX-TEXT owns the wording of these messages. This topic owns the parse check (UX-CLI-16).
3. **Typos get a suggestion at every layer, and nothing ever runs one by default.** A plugin dispatcher must not turn a typo into an install instruction. `ocx instal` prints `install it with ocx --global add ocx.sh/ocx/instal` (`crates/ocx_cli/src/app/plugin_dispatch.rs:90-96`). That is a supply-chain instruction built from unvalidated input, and an agent may follow it. This is the most severe defect in the topic (UX-CLI-10). Measured by `typo-check.sh`: all 23 top-level ocx typos produce this hint.
4. **The installer's last non-blank line is the headline command, not a verify command and not an uninstall command.** The dives disagreed here. deno and bun document `--version` or `--help` as "get started", and first-run-and-handoff argued for a job command. The job command wins. A verify command proves the install. Only a job command proves the value, and the last line is the only line a skimming reader or a tail-grepping agent reads. Measured: the ocx installer's last non-blank line is `rm -rf $_ocx_home` (`ocx-sh/www-setup/src/install.sh:902`). The last command an agent extracts from a successful install of ocx is the one that deletes it. For the same reason, the check for UX-CLI-14 never runs the installer's last line through a shell. It matches the line's shape and runs only the product binary with `-h` appended.
5. **Bare root invocation must end without a REPL, prompt, stdin read or network call (MUST). Exit 0 with the `-h` text on stdout is the fleet's convention (SHOULD).** The MUST rests on a measured harm: deno's bare REPL blocks an agent or CI shell that has a pty. The exit code and stream rest on no source. [GNU `--help`](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html) asks for exit 0 and stdout only for the explicit flag. clig.dev asks for concise help but names no code. The exemplars split: git, npm, uv, rustup and terraform exit nonzero, and uv, docker and rustup print to stderr. The revision therefore split the exit-and-stream clause out of UX-CLI-01 into the SHOULD UX-CLI-28. A group with no subcommand exits with the pinned usage code (64). clap's default exit 2 leaks through the derive's required subcommand and is a defect (`ocx package` exits 2).
6. **Examples live in a dedicated block, not first and not in flag docs.** clig.dev says "show them first". Measured practice is split: kubectl puts them first, gh last, and 12 of 14 CLIs have none. Examples go in clap's `after_help` or `after_long_help`. The rule asserts that the block exists and that every example parses, not where it sits. No fetched measurement ties position to any outcome. The counts (2 to 5 root lines, at most 5 per leaf in `--help`, at most 2 in `-h`) are house heuristics. The root range follows the dive's HELP-05, and the `-h` cap follows the fleet's own `quality-cli-help.md:101` warning on "> 2 inline examples".
7. **A flag documented as global works in both positions, and no flag changes meaning by position.** CLI-10 already pins the mechanism (one flattened `Args` struct), but ocx still rejects `--format`, `--offline`, `--color` and `--log-level` after every one of its 23 top-level subcommands (92 of 92 runs of `global-pos.sh`). Its `-g` means `--global` at the root and `--group` in 10 command paths (`short-scan.sh`). CLI-10's grep cannot see either failure, so UX-CLI-12 adds two binary tests.
8. **Animation has its own opt-out, separate from colour.** CLI-08 already gates progress on a TTY, `CI` and machine output. UX-CLI-21 adds only what CLI-08 lacks: `TERM=dumb`, `--quiet` and an animation opt-out. It names `CI` and machine output as pointers to CLI-08, not as new content. `NO_COLOR` does not stop animation: [no-color.org](https://no-color.org/) (updated 2026-11-25) scopes it to colour, and GitHub CLI ships a separate `GH_SPINNER_DISABLED` ([gh environment](https://cli.github.com/manual/gh_help_environment)). The opt-out itself is a SHOULD (UX-CLI-29), as the dive rated it. ocx with `CI=1` still draws 150 bare carriage returns. That is a violation of CLI-08, not of a UX-CLI rule, and it is recorded as change request CR-4.
9. **`NO_COLOR` outranks `FORCE_COLOR`, and `FORCE_COLOR=0` forces nothing.** [bixense](https://bixense.com/clicolors/) (undated, marked deprecated) says, re-fetched 2026-11-27: "treat `FORCE_COLOR` as an alias for `CLICOLOR_FORCE`, enabling color whenever either is set, unless `NO_COLOR` is also set". It mentions no special value 0 and treats empty variables as unset. [force-color.org](https://force-color.org/) (last updated 2026-11-11) forces colour on any non-empty value "regardless of its value", which includes `0`, and its example code applies `FORCE_COLOR` after `NO_COLOR`, so `FORCE_COLOR` wins there. [Node.js](https://nodejs.org/api/tty.html) reads `FORCE_COLOR=0` as "disable". The `0` rule for `CLICOLOR_FORCE` ("a value other than 0") comes from the [gh manual](https://cli.github.com/manual/gh_help_environment), not from bixense. We take the user's disable as the winner on both points: `NO_COLOR` beats `FORCE_COLOR`, and `FORCE_COLOR=0` never forces colour. That departs from force-color.org on `0` on purpose. A user who writes 0 most likely means off, and forced colour is the harmful outcome for that user. Whether to honour `FORCE_COLOR` at all stays CONSIDER and is an owner decision.
10. **State colour comes from the 16 ANSI slots only, and meaning never rides on colour alone.** Only the 16 slots are colours the user's terminal theme can repair ([VS Code terminal appearance](https://code.visualstudio.com/docs/terminal/appearance); [WCAG2ICT 2.2 Appendix B](https://www.w3.org/TR/wcag2ict-22/), Group Note 2025-12-11). A decorative colour outside the slots (ocx `about`, `38;5;203`) passes only through an owner-approved allow-list (UX-CLI-22).
11. **A TUI is never the only path, and nobody claims accessibility without a test.** No screen reader ran in this round, so every statement about speech is unverified. The fleet may document mechanisms ("`--progress none` prints plain lines"). It may not claim compatibility or a WCAG level.
12. **Completion registration belongs to `shell-integration`, not to this topic.** The first version made eval-at-startup a MUST for install docs. That contradicted the pinned `shell-integration` Step 6, which accepts a stored file in the bash-completion user directory and bans `source <(...)` for bash (SH-EMIT-34). It also rested on clap_complete's stale-script warning, which applies to the dynamic mode behind `unstable-dynamic` ([docs.rs clap_complete](https://docs.rs/clap_complete/latest/clap_complete/), 4.6.12, fetched 2026-11-27). UX-CLI-13 keeps the generator contract, and UX-CLI-30 (SHOULD) points registration at `shell-integration`.
13. **Dropped or handed off, with reasons.**
    - The full colour precedence order (A-01) is pinned by CLI-07 and `colorchoice`.
    - The prompt bypass (CLI-FR-13) is pinned by CLI-09.
    - Shell-profile edits for completion (DISC-18) belong to `installer-script` step 9 and `shell-integration`.
    - Usage notation (HELP-10) and the five native shells (DISC-16) come free with clap defaults.
    - The 1-to-3 candidate cap (DISC-11) is clap's behaviour and is folded into UX-CLI-09.
    - The footer URL (HELP-12), `propagate_version` (DISC-19), `--print-next` (CLI-FR-16) and the banner switch (A-15) are low yield.
    - The heartbeat interval (A-06) has no source; its number is an open question.
    - The leaf `-h` budget (HELP-13) cannot fail as written and was removed from UX-CLI-06.
    - The "noun group only for 3 or more operations" clause (HELP-14) has no source and no check and was removed from UX-CLI-07.
    - The TUI `Indexed` gap (A-10) becomes change request CR-1 against TUI-22.
    - The installer stream rule (CLI-FR-5) is already satisfied by ocx (`install.sh:27-29`) and is handed to `installer-script`.
14. **A cargo-dist installer cannot end on a custom line, so the project's wrapper prints it.** The only installer-output setting is `install-success-msg` (since 0.15.0, [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html), undated, fetched 2026-11-27). The [changelog](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md) lists no post-install hook through 0.34.0 (2026-11-01). That message prints before the PATH block in both generated installers: the shell installer was run, and the powershell installer was read from its dist 0.33.0 generated source, not run. Measured on grim's published 0.17.0 shell installer with the message line swapped in: the last non-blank line is still `source $HOME/.cargo/env.fish (fish)`. The custom line comes last only under `--no-modify-path`. A line appended to the wrapper after `sh "$tmp" "$@"` was measured as the last line, both for the default directory and for a custom `GRIMOIRE_INSTALL_DIR` ([followup-q2.md §5-6](ux-cli-interaction/followup-q2.md#5-runs-of-the-real-installer-default-and-custom-both-with-a-temporary-home)). UX-CLI-14 now says so, and UX-CLI-31 (SHOULD) sets the message for people who run the generated installer directly.
15. **Documented gap: UX-CLI-08's no-network clause is gated on Linux only.** The follow-up answered partly. The Linux `strace` gate now has a control run: `curl` to 192.0.2.1 counts 1 connect, and `grim --version` and `ocx version` count 0 ([followup-q0.md](ux-cli-interaction/followup-q0.md#the-linux-gate-has-teeth-control-run-and-passes-on-grim-and-ocx)). Both other platforms have a sourced way to record an attempted connection, but neither was run, because this host has no Mac, no `sandbox-exec` and no `/mnt/c`. On macOS, a sandbox denial reaches the unified log under `com.apple.sandbox.reporting` ([Apple](https://developer.apple.com/tutorials/data/documentation/security/discovering-and-diagnosing-app-sandbox-violations.md), undated, page copyright 2026; it is written for App Sandbox). `sandbox-exec` is deprecated (man page, 2017), and its profile format is "not documented for third party use" ([Apple DTS, forum thread 124284](https://developer.apple.com/forums/thread/124284), October 2019). On Windows, event 5157 records a blocked connection with the executable path and its direction ([Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-5157), updated 2026-04-27, archived page). The audit-enable and event-read commands were not fetched. The severity stays MUST for the behaviour and the Linux gate. The macOS and Windows forms are evidence only: each records a result or `not run`, and a Linux pass is never reported as a macOS or Windows pass. The follow-up also proposed a SHOULD that the `--version` path builds no network client, tested by pointing `HTTPS_PROXY` at a dead port. That was not adopted. Its test was run only on grim, a known-good binary, and a client that ignores proxy variables passes it too, so the test cannot yet tell a pass from a fail.
16. **The check scripts parse by layout, not by depth.** The old shared pattern read the prose word `its` in `gh attestation download -h` as a subcommand. cobra gives a leaf the same help for any extra argument ([cobra args.go](https://raw.githubusercontent.com/spf13/cobra/main/args.go), fetched 2026-11-27: "subcommands will always accept arbitrary arguments"), so the walk recursed without end. The 4-level cap hid that loop. It did not fix it. The new `subs` accepts a heading only when the whole line is title-case words ending in `Commands:` or all-caps ending in `COMMANDS`, and a row only when it is indented by 2 or more spaces. With it, no measured walk needs a cap: the deepest real path in gh, ocx, grim and docker is three words, and the capped and uncapped walks agree (gh 244, ocx 75, grim 44, docker 163 paths) ([followup-q1.md](ux-cli-interaction/followup-q1.md#measurements)). The scripts now end a branch at a child whose help equals its parent's, and raise an alarm at 8 words.

## The ruleset

Severity applies to new work. An existing violation that would break users or scripts goes through "What an agent must ask a human". `<bin>` is the binary under test, and `<usage>` is the pinned usage exit code (64 in the fleet). Unless a rule says otherwise, run each check from an empty temporary directory with `HOME` set to an empty directory, stdin from `/dev/null`, `NO_COLOR=1` and `PAGER=cat`. The script `help-check.sh` ([help-structure.md, "The check"](ux-cli-interaction/help-structure.md#the-check), 31 lines) asserts the top-level parts of UX-CLI-01, 02, 04, 05, 06, 07 and 28. The scripts `help-walk.sh`, `typo-check.sh`, `global-pos.sh`, `short-scan.sh` and `dup-scan.sh` are in [Check scripts](#check-scripts). Where a rule's check is a review step and not a pass/fail gate, the rule says so.

### Help and invocation

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| UX-CLI-01 | Bare invocation of the root ends on its own with a usage text. It never starts a REPL, wizard or prompt, never reads stdin, and never touches the network or the project. Exit code and stream: UX-CLI-28. | deno's bare REPL blocks an agent or CI shell that has a pty (measured: 13 of 14 CLIs print help instead). | `timeout 10 <bin> </dev/null >out 2>&1; echo $?` is not 124, and `grep -ci usage out` is at least 1. On Linux, `strace -f -qq -e trace=connect -o t.txt <bin> </dev/null; grep -cE 'AF_INET6?' t.txt` prints `0`. | MUST |
| UX-CLI-02 | Help on every command path needs no config, credentials, network or project. `-h` never names another flag. `<path> <valid-flag> -h` still shows help. A command that forwards trailing arguments to a child shows `--` or `<ARGS>...` in its usage line. | `docker run -h` is `--hostname` (exit 125). `git commit -h` dies outside a repository (exit 128). | `help-walk.sh <bin>`: for every path in the tree, `-h`, `--help` and `<first no-value flag> -h` each exit 0 with a `Usage` line on stdout. For each forwarding command `f` (exec, run), `<bin> f -h \| grep -cE '^Usage:.*(--\|\.\.\.)'` is at least 1. | MUST |
| UX-CLI-03 | A group node with no subcommand and a missing required argument behave alike: help on stderr and the pinned usage exit code. Override clap's default exit 2 for a missing subcommand. | 7 group behaviours across 7 CLIs. The fleet mixes 64 and 2. | For each group `g`: `<bin> g; echo $?` prints `<usage>`, and `<bin> g 2>&1 >/dev/null \| grep -c Usage` is at least 1. | SHOULD |
| UX-CLI-04 | The declared headline command is within the first 5 rows of the root command list, or under a heading named Common, Main, Basic or Core. A list longer than 12 rows is ordered by workflow through an explicit `display_order`, `subcommand_help_heading` or `help_template`, never by definition order. | 9 of 12 exemplars put it in the first 6 rows. The two fleet CLIs list in clap definition order. | `help-check.sh <bin> <headline>` assertion HELP-04. | SHOULD |
| UX-CLI-05 | Root `-h` carries an Examples block of 2 to 5 lines, headline task first. Each of the 5 most-used leaves carries an Examples block in `--help` (at most 5 examples) and shows its first example in `-h` (at most 2). All counts are house heuristics. Examples go in `after_help` or `after_long_help`, never in a flag's doc comment. A custom `help_template` keeps `{after-help}`. | Users reach for examples first ([clig.dev](https://clig.dev/#help)). 0 of 14 measured root helps lead with them, and ocx and grim have none at all. The counts have no source: the root range is the dive's HELP-05, and the `-h` cap follows the fleet's `quality-cli-help.md:101`. | Root count: `<bin> -h \| awk '/^(EXAMPLES\|Examples):?$/{f=1;next} /^[A-Za-z]/{f=0} f&&NF' \| wc -l` is 2 to 5. Leaves: `help-check.sh` assertion HELP-05, run once per leaf as the `<headline>` argument; it appends `-h` to each example and expects exit 0. Also `grep -rn 'help_template' src/` and confirm `{after-help}` in each hit. | SHOULD |
| UX-CLI-06 | Root `-h` is at most 60 lines and still holds usage, examples and commands. `--help` may be longer. The 60 is a house heuristic. | The median of 14 measured CLIs is 62 lines, and 60 rounds it down. The 14 were chosen by hand, so the number is a measured judgment, not a standard. ocx `--help` is 126 lines, with 13 global options before any command. | `<bin> -h \| wc -l` is at most 60. | SHOULD |
| UX-CLI-07 | Use one verb per meaning at each level. Never ship `update` next to `upgrade`, or two of `remove`, `delete` and `rm`, `create` and `new`, `list` and `ls`, unless their descriptions state the difference. Groups are nouns and leaves are verbs. A group leaf that reuses a top-level name states the difference in its description. | [clig.dev](https://clig.dev/#subcommands) names update/upgrade as confusing. [Heroku](https://devcenter.heroku.com/articles/cli-style-guide) (updated 2025-01-31): topics are nouns, commands are verbs. [NN/g heuristic 4](https://www.nngroup.com/articles/ten-usability-heuristics/) (reviewed 2024-01-30): users "should not have to wonder whether different words ... mean the same thing". | Gate: `help-check.sh` assertion HELP-06 (synonym pairs at the top level); run the same pair scan on each group's `-h`. Review step, not a gate: `dup-scan.sh <bin>` lists each leaf name that also exists at the top level, and a reviewer reads both descriptions. | SHOULD |
| UX-CLI-28 | Bare invocation of the root prints the same text as `<bin> -h` on stdout and exits 0. A trailing blank line is tolerated. | The fleet's existing choice (ocx and grim both do it). 8 of 14 measured CLIs exit 0 and 10 of 14 use stdout. No source states the code: [GNU](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html) covers only the explicit `--help` flag. | `timeout 10 <bin> </dev/null >bare; echo $?` prints `0`, and `<bin> -h >h; diff -B bare h` prints nothing. | SHOULD |

### Version, typos, global flags, completion

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| UX-CLI-08 | `<bin> --version` prints exactly one line, `<name> <semver>[ extra]`, on stdout and exits 0. It writes nothing on stderr and makes no network call or update check. `-V` is the same (SHOULD). A `version` subcommand may exist only in addition to the flag. In clap, put `version` in the root `#[command(...)]`. | Scripts and package managers probe the flag first. [GNU 4.8.1](https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html) (updated 2026-04-27) wants the name and version on stdout and a successful exit. clap adds `-V/--version` only when a version is set. | `out=$(<bin> --version); echo $?` prints `0`. `printf '%s\n' "$out" \| wc -l` prints `1`. `printf '%s\n' "$out" \| grep -cE '^[A-Za-z][A-Za-z0-9._ -]* v?[0-9]+\.[0-9]+\.[0-9]+'` prints `1`. `<bin> --version 2>&1 >/dev/null \| wc -c` prints `0`. Network, Linux (the gate): `strace -f -qq -e trace=connect -o t.txt <bin> --version; grep -cE 'AF_INET6?' t.txt` prints `0`. Prove the grep can fail once per environment: `strace -f -qq -e trace=connect -o c.txt curl -s -m 2 http://192.0.2.1/; grep -cE 'AF_INET6?' c.txt` prints a number above `0` (measured: `1`). Repeat with `-V`. macOS and Windows (evidence only, never a pass by default): record the result or `not run`, and never report the Linux pass for them (Verdict 15). macOS, unrun form: in one shell `log stream --style compact --predicate '((processID == 0) AND (senderImagePath CONTAINS "/Sandbox")) OR (subsystem == "com.apple.sandbox.reporting")' > deny.log`; in another `sandbox-exec -p '(version 1)(allow default)(deny network*)' <bin> --version` exits 0 with the same one line, and `grep -c 'deny(1) network' deny.log` prints `0`. Record the macOS version and the date. Windows: no command here is verified. Use event 5157 (outbound, `Application` equal to the binary path) as the attempt record, and record the result or `not run`. With neither run, record instead that the `--version` path has no platform branch: `grep -rnE 'cfg\((windows\|target_os\|unix)' <modules on the --version path>` prints nothing. | MUST |
| UX-CLI-09 | An unknown command, at the top level and under every group, prints 1 to 3 nearest-name candidates and exits with `<usage>`. An unknown flag prints the nearest flag where the framework supports it (SHOULD; cobra has no flag suggester). | [clig.dev](https://clig.dev/): "If the user did something wrong and you can guess what they meant, suggest it." docker and ocx give no top-level suggestion. | `typo-check.sh <bin> <usage>`. For each built-in name at each level, it builds a one-edit typo: drop the last letter, or double the last letter when the shortened word is under 2 characters or is itself a name at that level (`ls` becomes `lss`, never `l`). Each run must match `grep -iE 'similar\|did you mean'` and exit `<usage>`. The pattern covers git (`The most similar command is`), clap (`tip: a similar subcommand exists`) and cobra (`Did you mean this?`). | MUST |
| UX-CLI-10 | A plugin or external-subcommand dispatcher runs the nearest-name check against the built-ins before it prints any install hint. It never prints an install command built from raw user input unless that name resolves in the plugin index. | clap's `external_subcommand` swallows clap's suggester. A built-in typo then becomes `ocx --global add ocx.sh/ocx/<typo>`, which a user or agent may run. | `typo-check.sh` passes, and over the same typos `grep -c -- '--global add'` prints `0`. Pin this as an integration test. | MUST |
| UX-CLI-11 | Never run a corrected, guessed or prefix-matched command or flag by default. Keep clap's `infer_subcommands` and `infer_long_args` off. Auto-run may exist only as a documented opt-in. Even then it runs only when exactly one candidate exists, and it prints a stderr warning that names both words. | "Assuming what they meant can be dangerous, especially if the resulting action modifies state" ([clig.dev](https://clig.dev/)). git's default is to show the suggestion ([help.adoc](https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc)). npm ran `install` for `instal` and resolved `--sav` to `--version`. | `grep -rnE 'infer_subcommands\|infer_long_args' src/` prints nothing. Side effects: in a scratch directory that holds the fixture the command needs (npm side-effected only with a `package.json` present), run `snap(){ find . "$HOME" -exec stat -c '%n %s %Y' {} + \| sort; }` (GNU stat; on macOS use `stat -f '%N %z %m'`), then `snap >"$b"`, a typo of each state-changing command, `snap >"$a"`, with `$a` and `$b` outside both trees. The typo exits nonzero and `diff "$b" "$a"` prints nothing. | MUST |
| UX-CLI-12 | Every flag documented as global works before and after the subcommand, with the same meaning. No short flag names a different long flag below the root. This is the behavioural test for CLI-10. | "If possible, make arguments, flags and subcommands order-independent" ([clig.dev](https://clig.dev/)). Agents copy command lines from docs in either order. | Position: the project keeps `flag-values.tsv`, one row per documented global flag with one real value it accepts (`--format<TAB>json`, `--color<TAB>never`, `--offline<TAB>`). `global-pos.sh <bin> flag-values.tsv` runs `<bin> F v s --help` and `<bin> s F v --help` for every row and every top-level subcommand `s`; each exits 0. Meaning: `short-scan.sh <bin>` prints nothing. | MUST |
| UX-CLI-13 | Ship one completion generator. It is listed in root `--help` under a name that resolves, and it prints only the script on stdout with exit 0. An unknown shell exits with `<usage>`. Registration in the user's shell: UX-CLI-30. | The output is eval'd or stored, so any extra byte corrupts the shell. All six measured generators write 0 bytes on stderr. docker and uv do not list theirs, and ocx points to the wrong group. | `<bin> --help \| grep -i complet` names a command `c`. `<bin> c bash 2>&1 >/dev/null \| wc -c` prints `0`. `<bin> c nosuchshell; echo $?` prints `<usage>`. | MUST |
| UX-CLI-30 | The install docs register completions in the form `shell-integration` Step 6 gives per shell (SH-EMIT-33 to 39). A stored script is regenerated on upgrade, or the docs tell the user to re-run the generator after an upgrade. | `shell-integration` is the pinned home for registration. It accepts a stored bash file or an eager `eval` of a captured string, and bans `source <(...)` for bash (SH-EMIT-34). clap_complete warns that a dynamic-mode script mismatches the binary after an upgrade ([env/mod.rs](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/env/mod.rs)). That mode sits behind `unstable-dynamic` (clap_complete 4.6.12), so for static scripts the only measured risk is that new commands go missing. | Run the `shell-integration` read-back kit (`skills/shell-integration/references/completions/readback-*.sh`) on each documented form. Review step: `grep -niE 'upgrade\|regenerat\|re-run' <install docs>` has a hit in the completion section. | SHOULD |

### First run and handoff

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| UX-CLI-14 | The installer's last non-blank success line is the headline command, in a form that runs in the user's current shell. Either the activation is prefixed (`. "$HOME/.ocx/env.sh" && ocx ...`) or the binary is given by absolute path. An activation line, if any, comes before it. No `warn:`, `error:`, uninstall or community line comes after it. A re-run prints the same block, not only "already installed". For a cargo-dist installer, `install-success-msg` is not enough, because the generated script prints its PATH block after that message. A wrapper script or post-install step that the project owns prints the last line. It names the headline command by absolute path, built from the install-dir variable, not by a PATH lookup or a sourced helper. Home: the `installer-script` skill. | No measured installer ends on a command that does the product's job. Only deno's printed command works before PATH is live. ocx's last line is `rm -rf`. cargo-dist 0.33.0 prints its PATH block after the success message in both installers, so the shell installer's last line is `source $HOME/.cargo/env.fish (fish)` even with a custom message. The location of its `env` helper depends on the layout and the dist version ([followup-q2.md](ux-cli-interaction/followup-q2.md), Verdict 14). | Never pass the installer's line to a shell. (1) In a clean container with a temporary `HOME`, capture the combined output of the documented install command with the installer's default PATH handling (not `--no-modify-path`). Repeat with the install-dir variable set to a second temporary directory; the binary path in the last line must start with that directory. (2) The last non-blank line matches `^ *(\. "[^"]+" && )?(/[^ ]+/)?<bin> [a-z]`. (3) In the same container, run only the installed binary by absolute path with the words after `<bin>` and `-h` appended; it exits 0. This proves the line parses. Whether the headline succeeds (network, project, prompt) is not checked. (4) The last 3 lines have 0 lines matching `^(warn\|error\|warning)`. (5) Run the installer twice and compare the last 3 lines. | MUST |
| UX-CLI-15 | A command that needs a missing project or config file states what was not found, where it looked, and the exact command that creates it, then exits with the pinned not-found code. | 3 of 8 measured tools name the fix. gh's `gh auth login` and ocx's `run ocx init` are the shape to copy. | In an empty directory, run each project-scoped verb as `<bin> <verb> </dev/null 2>&1`. Each output contains `<bin> init` (or the documented creating command). | MUST |
| UX-CLI-16 | Every command line that the CLI or its installer prints for a user to run is pinned by a test that appends `-h` and expects exit 0. That covers help examples, error and warning hints, next-step lines, the installer's last line, and pointers in help text ("completions live under ..."). | Text that nothing executes goes stale. The parse error comes before help, so the test has no side effects. The audit found one of 11 next-step hints pointing at a nonexistent command. | Test 1: extract backtick spans that start with the binary name from the message sources (`grep -rhoE '\`<bin> [^\`]+\`' src/`), replace `<placeholders>` with fixtures, append `-h` and run. Each must exit 0. Test 2: run the same check on the UX-CLI-05 examples and on step 3 of UX-CLI-14. | MUST |
| UX-CLI-17 | A state-changing command with one dominant next step ends with one line that names it (for example, `grim init`, then `next: grim add <ref>`). With no dominant next step, it prints nothing extra, and the repository lists that verb as having none. | Both lines come from [clig.dev](https://clig.dev/): "Suggest commands the user should run" and "err on the side of less". One line, only when one step dominates, satisfies both. | The repository keeps `no-next-step.txt`, one verb per line. In a clean directory, run each state-changing verb. Its last stderr line matches `^next: <bin> ` and the named command passes UX-CLI-16, or the verb is in `no-next-step.txt`. A verb that is neither is a finding. | SHOULD |
| UX-CLI-18 | A condition the user must act on, reported on a success path, prints as a result row or as a `warning:`-prefixed human line. It prints once per run, with no timestamp or log formatting at default verbosity. A security-relevant statement, such as an install without signature verification, is a `warning:` line. | grim's no-client notice is a timestamped `WARN` log line. ocx's unsigned-install line is unprefixed `log::info!` on every install, which trains users to skip the one security line. | `<bin> <cmd> 2>&1 \| grep -cE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'` prints `0` at default verbosity. `grep -n 'without signature verification'` in the output starts with `warning:`. | SHOULD |
| UX-CLI-19 | Each CLI repository ships a first-run script that runs the documented install line in a clean container. It records three numbers: commands from the install line to the first headline output, installer seconds, and first-result seconds. CI runs it per release and reports two house-heuristic budgets: at most 3 commands (install, a required activation, the headline), and seconds at most 2x the previous release's median of three runs. A breach is a finding. It fails the build only if the owner has made the gate blocking. | No independent time-to-first-success benchmark exists. The only numbers found are unsourced vendor figures (vendor data: [Fern](https://buildwithfern.com/post/reduce-time-to-hello-world-enterprise-partners.md), July 2026). Both budgets are this project's own. Seconds from one host vary by network, while command counts and ratios are stable. | The script exists (`ls scripts/first-run*`), the CI step runs, and its output has the three numbers and the two budget results. | SHOULD |
| UX-CLI-31 | A project that ships a cargo-dist installer sets `install-success-msg` to its headline-command line, so the success line is useful when the generated installer runs directly. This does not satisfy UX-CLI-14 on its own. | The setting is cargo-dist's only installer-output setting (since 0.15.0, [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html), undated, fetched 2026-11-27). The [changelog](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md) shows no other through 0.34.0 (2026-11-01). It costs one config line. Measured with dist 0.33.0: the setting replaces `everything's installed!` in both the shell and powershell installers. The owner sets the text together with the headline command. | `grep -n 'install-success-msg' dist-workspace.toml dist.toml` has a hit. After `dist build --artifacts=global`, `grep -c "everything's installed" target/distrib/*-installer.sh target/distrib/*-installer.ps1` prints `0` for each file. | SHOULD |

### Terminal accessibility

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| UX-CLI-20 | Log, warning, tracing and argument-parser output goes through the same colour decision as result output, per destination stream. In Rust, set `tracing_subscriber::fmt::layer().with_ansi(<decision for stderr>)` explicitly. | grim emits ANSI on piped stderr under `--color=never`, `CLICOLOR=0` and `TERM=dumb`. CLI-07's grep for `env::var("NO_COLOR` cannot see a tracing default. | Pick a command that logs a warning, and define `esc(){ python3 -I -c "import sys;print(sys.stdin.buffer.read().count(b'\x1b'))"; }`. Flag run: `<bin> --color=never <cmd> 2>&1 >/dev/null </dev/null \| esc`. Environment runs: `for v in CLICOLOR=0 TERM=dumb NO_COLOR=1; do env "$v" <bin> <cmd> 2>&1 >/dev/null </dev/null \| esc; done`. Every run prints `0`. | MUST |
| UX-CLI-21 | Animate progress (in-place redraw, cursor movement, spinner) only when the destination stream is a TTY, `TERM` is not `dumb`, `--quiet` is off and the UX-CLI-29 opt-out is unset. CLI-08's conditions also hold (`CI` unset, machine output off); they are pinned there and named here only as a pointer. In the fallback, print a start line and a completion line as whole lines. | A terminal screen reader detects redraws as updates (WCAG2ICT B.2). A user report says NVDA repeats spinner lines ([opencode#39368](https://github.com/anomalyco/opencode/issues/39368), opened 2026-07-28). | Capture with `script -q -c '<cmd>' out.raw` under `TERM=dumb`, under `--quiet` and with the opt-out set. Also run with stderr redirected to a file. Count bare CRs and cursor CSI with the 7-line Python counter in [terminal-accessibility.md A-04](ux-cli-interaction/terminal-accessibility.md#normative-guidance-candidates). Both counts are 0. The `CI=1` capture belongs to CLI-08 (CR-4). | MUST |
| UX-CLI-29 | Ship one documented animation opt-out, independent of `NO_COLOR`: one environment variable plus one config key, named in `--help`. | `NO_COLOR` is a colour switch only ([no-color.org](https://no-color.org/)), and measured, it leaves the ocx bar animated. Precedent: `GH_SPINNER_DISABLED` and `gh config set spinner disabled` ([gh environment](https://cli.github.com/manual/gh_help_environment)). The dive rated this SHOULD (A-05). | Set the variable and rerun the UX-CLI-21 capture: both counts are 0. Repeat with the config key. `<bin> --help \| grep -c <VAR>` is at least 1. | SHOULD |
| UX-CLI-22 | Colour that conveys state uses only the 16 ANSI slots (SGR 30-37, 90-97, or `38;5;N` with N at most 15). Never use an index above 15, truecolor, or a hardcoded white or black foreground for state. A decorative colour outside the slots is allowed only on an owner-approved allow-list. | The terminal can repair contrast only for slot colours (VS Code minimum contrast ratio. WCAG2ICT B.3 on forced palettes). gh moved to 4-bit for this reason ([GitHub blog](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/), 2025-05-02). | The repository keeps `decorative-colour.allow`, one row per approved command path and index (`about<TAB>203`); only the owner adds a row. Run every command path with `--color=always` and pipe the output to the counter in [terminal-accessibility.md A-07](ux-cli-interaction/terminal-accessibility.md#normative-guidance-candidates). Expect `indices>15: []` and `truecolor: 0`, except the indices listed for that path. `38;5;0` to `38;5;15` is the crossterm slot form and passes. | MUST |
| UX-CLI-23 | Colour never carries a state alone: the same line names it in a word, prefix or glyph. Output text never points at colour or position ("the red line", "see above"). | WCAG 1.4.1 and 1.3.3 "apply directly as written" to non-web software ([WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/), informative Note). No mechanical pass/fail exists, so this is SHOULD. | Review step, not a gate: run with `NO_COLOR=1` and read whether each row's state is readable from its characters alone. `grep -rniE '(red\|green\|yellow\|highlighted) (text\|line\|message)\|see (above\|below)' <message sources>` lists hits to review. | SHOULD |
| UX-CLI-24 | Every action in a TUI is reachable as a non-interactive subcommand with `--format json` or plain output. | A screen-reader user or a script then has a path that needs no TUI. A TUI-only product leaves an empty scrollback (opencode#39368). | List the TUI's actions from its key-to-action table and match each to a `<bin> --help` command. A TUI-only action is a finding. | MUST |
| UX-CLI-25 | A TUI offers a linear mode: no alternate screen, no animation, no banner or footer redraw, and append-only labelled lines. The mode is reachable by a flag and an environment variable and named in `--help`. | Shipped precedents: Copilot CLI `--screen-reader` (GA February 2026, [GitHub blog](https://github.blog/open-source/building-githubs-next-chapter-in-accessibility/), 2026-05-21) and huh's accessible mode ([charmbracelet/huh](https://github.com/charmbracelet/huh)). No terminal API detects a screen reader, so the mode is an opt-in. | Capture under `script` with the mode set. The count of `ESC[?1049h` is 0, and the UX-CLI-21 counts are 0. | SHOULD |
| UX-CLI-26 | Never write "accessible", "screen reader compatible/friendly" or a WCAG level for a CLI or TUI unless a person who uses a screen reader tested it and the date, reader and version are recorded. A page that cites WCAG2ICT cites only 1.4.1, 1.3.3, 1.4.3 (noting that the terminal paints the background), 2.2.2 and 4.1.3, and labels WCAG2ICT "informative W3C Group Note, 2025-12-11". | No source in this round verified spoken output. GitHub's CLI conformance report is a vendor self-assessment ([accessibility.github.com](https://accessibility.github.com/conformance/cli/), updated 2026-09-08). Agents cite 4.1.2 and 1.4.12 from memory, and neither applies to plain output. | `grep -rniE 'screen[- ]reader (compatible\|friendly)\|WCAG (2\.[0-9] )?(A\|AA\|AAA)\b\|fully accessible' README* docs/` returns hits that each link a test record. Run `grep -n wcag2ict` on the page and check the criteria list. | MUST |
| UX-CLI-27 | Treat a non-empty `FORCE_COLOR` as an alias of `CLICOLOR_FORCE`, except that `FORCE_COLOR=0` forces nothing and is treated as unset. `NO_COLOR` and the explicit `--color` flag rank above it. State the order in `--help`. | bixense (undated, deprecated) defines the alias with `NO_COLOR` winning. force-color.org (updated 2026-11-11) forces on any non-empty value, including `0`. Node reads `0` as disable. The rule takes the user's disable on both ties (Verdict 9). gh does not list `FORCE_COLOR`. | `FORCE_COLOR=1 <bin> <cmd> \| cat` has colour. `NO_COLOR=1 FORCE_COLOR=1 <bin> <cmd> \| cat` and `FORCE_COLOR=0 <bin> <cmd> \| cat` have none. | CONSIDER |

Rule count: 31 rules (16 MUST, 14 SHOULD, 1 CONSIDER). The parser contract in "Check scripts" binds this project's own scripts and carries no UX-CLI ID.

### Check scripts

Each script was first run on 2026-11-27 with the binaries on PATH, and the revised versions below were re-run the same day (results per script). They parse the clap and cobra help layout through one shared function, `subs`, given in each script. A line is a command row only inside a heading block whose whole line is title-case words ending in `Commands:` or all-caps ending in `COMMANDS`. The row is indented by 2 or more spaces, starts with a lowercase name (optionally `, alias`), and is followed by `: `, 2 or more spaces, or the end of the line. Prose is never read as a command. Recursion has no depth cap. Each recursive script skips a child whose `-h` output is byte-identical to its parent's, and reports `RUNAWAY` at 8 words as an alarm. Each script exits 1 on any finding, and `dup-scan.sh` is a review list, not a gate.

**Parser contract (this project's check scripts, MUST, no UX-CLI ID).** A help-walking script uses the `subs` pattern above, never a depth cap, as its guard against prose. It ends a branch when a child's `-h` output equals its parent's. A changed parser passes only if all four hold: `subs` on `gh attestation download` prints nothing; `subs` on `gh pr` contains `update-branch`; `subs` on `cargo` lists 16 names; and the capped and uncapped walks agree on the path count. Measured on 2026-11-27 for the revised scripts: empty, `1` match and `16` names, from `bin=gh; subs attestation download`, `subs pr | grep -cx update-branch` and `bin=cargo; subs | wc -l` (with `subs` taken from `typo-check.sh`). The path-count agreement was measured in [followup-q1.md](ux-cli-interaction/followup-q1.md#measurements). A stricter first draft dropped `gh pr update-branch`, `gh project mark-template` and all of cargo. The parser does not read a lowercase `commands:` heading, a one-space indent or a heading-less list (npm, git). Those CLIs were not walked.

The revised scripts were re-run from `~/.cache/research-lang/exemplars/product/wave2/ux-cli-rev/` with this loop (output in `run-fleet.log`):

```bash
for b in ocx grim; do for s in help-walk short-scan dup-scan; do out=$(./$s.sh $b); echo "$s $b: exit=$? lines=$(printf '%s\n' "$out" | grep -c .) fails=$(printf '%s\n' "$out" | grep -cE '^(FAIL|SHORT|DUP|RUNAWAY)') last=[$(printf '%s\n' "$out" | tail -1)]"; done
out=$(./typo-check.sh $b 64); echo "typo-check $b 64: exit=$? fails=$(printf '%s\n' "$out" | grep -cE '^(FAIL|RUNAWAY)') last=[$(printf '%s\n' "$out" | tail -1)]"
out=$(./global-pos.sh $b fv_$b.tsv); echo "global-pos $b fv_$b.tsv: exit=$? fails=$(printf '%s\n' "$out" | grep -cE '^FAIL')"; done
```

```
help-walk ocx: exit=0 lines=1 fails=0 last=[walked 75 paths]
short-scan ocx: exit=1 lines=10 fails=10 last=[SHORT -g: '--global' at the root, '--group' in 'ocx inspect']
dup-scan ocx: exit=1 lines=8 fails=8 last=[DUP 'ocx update' and 'ocx self update']
typo-check ocx 64: exit=1 fails=23 last=[typos run: 74]
global-pos ocx fv_ocx.tsv: exit=1 fails=92
help-walk grim: exit=0 lines=1 fails=0 last=[walked 44 paths]
short-scan grim: exit=0 lines=0 fails=0 last=[]
dup-scan grim: exit=0 lines=0 fails=0 last=[]
typo-check grim 64: exit=0 fails=0 last=[typos run: 43]
global-pos grim fv_grim.tsv: exit=0 fails=0
```

Every wave-1 number reproduces. No script printed `RUNAWAY`.

`help-walk.sh <bin>` (UX-CLI-02). Measured: ocx 0.6.8 walked 75 paths and grim 0.16.0 walked 44 paths, with 0 failures each. As a known-bad control, gh 2.105.0 walked 244 paths in 82 s with 14 `FAIL` lines. Twelve are paths where another flag owns `-h`, in `gh auth`, `gh config` and two `gh repo` leaves (`-h, --hostname` in `gh auth login --help`, `-h, --homepage` in `gh repo create --help`, which exits 1 on `-h` with `flag needs an argument: 'h' in -h`). The other two are `gh extension exec -h` and `--help`, which forward to an extension.

```bash
#!/usr/bin/env bash
# help-walk.sh <bin>: UX-CLI-02 on every command path (clap/cobra help layout)
bin=$1; fail=0; n=0; export NO_COLOR=1 PAGER=cat HOME=$(mktemp -d); cd "$(mktemp -d)"
run(){ timeout 20 "$bin" "$@" </dev/null 2>/dev/null; }
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
hh(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>&1 | md5sum; }   # same-help guard: a child whose help equals its parent's is not a command
flag(){ run "$@" -h | grep -oE '^ +(-[A-Za-z], )?--[a-z][a-z0-9-]*  ' | grep -oE -- '--[a-z][a-z0-9-]*' | grep -vxE -- '--(help|version)' | head -1; }
ok(){ local out; out=$(run "$@") && grep -qi '^usage' <<<"$out" || { echo "FAIL '$bin $*'"; fail=1; }; }
walk(){ local f c ph; n=$((n+1)); ok "$@" -h; ok "$@" --help; f=$(flag "$@"); [ -n "$f" ] && ok "$@" "$f" -h
  [ $# -ge 8 ] && { echo "RUNAWAY '$bin $*'"; fail=1; return; }   # alarm, not a cap: no real path measured is deeper than 3 words
  ph=$(hh "$@"); for c in $(subs "$@"); do [ "$(hh "$@" "$c")" = "$ph" ] && continue; walk "$@" "$c"; done; }
walk; echo "walked $n paths"; exit $fail
```

`typo-check.sh <bin> <usage>` (UX-CLI-09, 10). Measured: ocx 74 typos, 23 failures, all 23 at the top level, each printing the plugin install hint; every group typo passes. grim 43 typos, 0 failures.

```bash
#!/usr/bin/env bash
# typo-check.sh <bin> <usage-code>: UX-CLI-09 one-edit typo of every built-in name, root and each group
bin=$1; usage=$2; fail=0; n=0; export NO_COLOR=1 PAGER=cat HOME=$(mktemp -d); cd "$(mktemp -d)"
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
hh(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>&1 | md5sum; }   # same-help guard: a child whose help equals its parent's is not a command
level(){ local names c t out ec ph; [ $# -ge 8 ] && { echo "RUNAWAY '$bin $*'"; fail=1; return; }
  names=$(subs "$@"); ph=$(hh "$@"); for c in $names; do
  [ "$(hh "$@" "$c")" = "$ph" ] && continue
  t=${c%?}   # drop the last letter; if that is short or itself a name, double the last letter instead (ls -> lss)
  { [ ${#t} -lt 2 ] || grep -qx "$t" <<<"$names"; } && t=$c${c: -1}
  out=$(timeout 20 "$bin" "$@" "$t" </dev/null 2>&1); ec=$?; n=$((n+1))
  grep -qiE 'similar|did you mean' <<<"$out" && [ $ec -eq "$usage" ] || { echo "FAIL '$bin${*:+ $*} $t' exit=$ec: $(head -1 <<<"$out")"; fail=1; }
  [ -n "$(subs "$@" "$c")" ] && level "$@" "$c"; done; }
level; echo "typos run: $n"; exit $fail
```

`global-pos.sh <bin> <flag-values.tsv>` (UX-CLI-12, position). Measured with `--format json`, `--color never`, `--offline` and `--log-level warn` (ocx) or `--progress none` (grim): ocx 92 failures, every one of them a flag after one of the 23 top-level subcommands, and 0 failures before. grim 0 failures. The first version read the table after `cd` into a temporary directory, so a relative table path failed to open and the script still exited 0. Measured: `bash orig_global-pos.sh ocx fv_ocx.tsv` printed `line 10: fv_ocx.tsv: No such file or directory` and `exit=0`. The revised script resolves the path with `realpath` before the `cd`.

```bash
#!/usr/bin/env bash
# global-pos.sh <bin> <flag-values.tsv>: UX-CLI-12 each global flag before and after each top-level subcommand
# tsv rows: <flag><TAB><value or empty>, one per flag the help documents as global
bin=$1; tsv=$(realpath "$2"); fail=0; export NO_COLOR=1 PAGER=cat; cd "$(mktemp -d)"
run(){ timeout 20 "$bin" "$@" </dev/null >/dev/null 2>&1; }
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
top=$(subs)
while IFS=$'\t' read -r f v; do for s in $top; do
  run $f $v $s --help || { echo "FAIL before: $f $v $s"; fail=1; }
  run $s $f $v --help || { echo "FAIL after:  $s $f $v"; fail=1; }
done; done < "$tsv"; exit $fail
```

`short-scan.sh <bin>` (UX-CLI-12, meaning). Measured: ocx prints 10 lines, `-g` is `--global` at the root and `--group` in `env`, `add`, `direnv export`, `update`, `upgrade`, `pull`, `remove`, `exec`, `shell` and `inspect`. grim prints nothing.

```bash
#!/usr/bin/env bash
# short-scan.sh <bin>: UX-CLI-12 a short flag that names a different long flag below the root
bin=$1; hit=0; export NO_COLOR=1 PAGER=cat; cd "$(mktemp -d)"
run(){ timeout 20 "$bin" "$@" --help </dev/null 2>/dev/null; }
pairs(){ run "$@" | grep -oE '^ +-[A-Za-z], --[a-z][a-z0-9-]*' | sed -E 's/^ +-(.), --/\1 /'; }
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
hh(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>&1 | md5sum; }   # same-help guard: a child whose help equals its parent's is not a command
root=$(pairs)
walk(){ local c ph; [ $# -ge 8 ] && { echo "RUNAWAY '$bin $*'"; hit=1; return; }
  while read -r s l; do r=$(awk -v s="$s" '$1==s{print $2}' <<<"$root"); [ -n "$r" ] && [ "$r" != "$l" ] && { echo "SHORT -$s: '--$r' at the root, '--$l' in '$bin $*'"; hit=1; }; done < <(pairs "$@")
  ph=$(hh "$@"); for c in $(subs "$@"); do [ "$(hh "$@" "$c")" = "$ph" ] && continue; walk "$@" "$c"; done; }
for c in $(subs); do walk "$c"; done; exit $hit
```

`dup-scan.sh <bin>` (UX-CLI-07 review step). Measured: ocx lists 8 pairs (`update` with `config update`, `index update` and `self update`; `init` with `direnv init`; `env`, `inspect`, `pull` and `exec` with their `package` leaves). grim lists none.

```bash
#!/usr/bin/env bash
# dup-scan.sh <bin>: UX-CLI-07 leaf names that also exist at the top level
bin=$1; export NO_COLOR=1 PAGER=cat; cd "$(mktemp -d)"
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
top=$(subs); hit=0
for g in $top; do for l in $(subs "$g"); do grep -qx "$l" <<<"$top" && { echo "DUP '$bin $l' and '$bin $g $l'"; hit=1; }; done; done
exit $hit
```

Cross-check on a cobra CLI: `typo-check.sh gh 1` against gh 2.105.0 (revised script, 44 s) ran 243 typos with 5 failures, none at the top level. The other 238 matched cobra's `Did you mean this?`, which the first version's case-sensitive pattern missed. All 5 are real cobra gaps. Either a runnable parent rejects the typo as an argument (`gh codespace ports forwar`: `the command accepts no arguments`), or an auth check answers first (`gh agent-task lis`: `this command requires an OAuth token`). Wave 1 counted 246 typos and 8 failures. The 3 extra were parse artifacts from the prose word `its`, and the new parser removes them (Verdict 16).

### Change requests against pinned rules

These are not UX-CLI rules. The owners of the pinned sets apply them.

- **CR-1, TUI-22** (`tui.md:123`): extend the verification grep to `Color::Indexed`. Today it misses fixed indices above 15.
- **CR-2, CLI-07** (`cli-contract.md:129`): add UX-CLI-20's runtime ESC count as a second verification, because a grep cannot see a tracing subscriber's ANSI default.
- **CR-3, installer-script**: add UX-CLI-14 as new SH-INST rows and add its parse-only check to the test kit. Today the skill has no row on final output: `grep -n -iE "final|last line|next|first command" skills/installer-script/SKILL.md` finds only the template's `restart your shell` line. Add to that row: a cargo-dist-generated installer cannot end on a custom line, because its PATH block prints after the success message, so the project's wrapper or post-install step prints the last line (Verdict 14). Its check runs the installer under a temporary `HOME` with default PATH handling and asserts that `... 2>&1 | grep -v '^$' | tail -1` is the project's line. On a cargo-dist installer that sets only `install-success-msg`, that command prints a `source $HOME/.cargo/env...` line and the row fails.
- **CR-4, CLI-08** (`cli-contract.md:130`): ocx under `CI=1` still animates (150 bare CRs and 350 cursor CSI, [terminal-accessibility.md §5](ux-cli-interaction/terminal-accessibility.md#5-measured-spinner-and-progress-byte-streams)). CLI-08's grep block did not catch it. Add the `script` capture with `CI=1` as a behavioural verification. UX-CLI-21 does not restate this condition.

## Applied to the fleet

Evidence comes from the four dives, from [product-audit/cli-first-run.md](product-audit/cli-first-run.md) and from the check scripts above. Source paths are relative to `/home/mherwig/dev/ocx-sh/ocx` (ocx, read at HEAD 02b8434e, version 0.6.8), `/home/mherwig/dev/grimoire-rs/grimoire` (grim, read at HEAD 72d3fce1, version 0.17.0, while the binary measured is 0.16.0) and `/home/mherwig/dev/ocx-sh/www-setup` (ocx installer). "Measured by command, no source location" marks a row whose evidence is a run, not a line of source.

| Rule | ocx 0.6.8 | grim 0.16.0 / 0.17.0 | Evidence |
|---|---|---|---|
| UX-CLI-01 | satisfied | satisfied | Bare root: exit 0, 44 and 46 lines (help-structure §2). Help printed when the subcommand is absent: ocx `crates/ocx_cli/src/app.rs:148` (`Cli.command` is an `Option`, `app.rs:64`); grim `src/app.rs:38`. Network on bare invocation not measured. |
| UX-CLI-02 | satisfied: 75 paths | satisfied: 44 paths | `help-walk.sh`, 0 failures each. Measured by command, no source location. |
| UX-CLI-03 | **violated**: `ocx package`, `config`, `index`, `patch` and `self` exit 2. `ocx direnv` exits 0 and `ocx shell` exits 64, both with no `Usage` on stderr (one run each; whether either is deliberate was not examined) | satisfied: `grim config`, `export` and `hook` exit 64 with a `Usage` line | ocx `crates/ocx_cli/src/command.rs:328-329` (a required subcommand, which the clap derive turns into help-on-missing) and `crates/ocx_cli/src/clap_parse.rs:20-26` (passes `DisplayHelpOnMissingArgumentOrSubcommand` to `err.exit()`, clap's code 2). The group loop over every path with children: [followup-q1.md](ux-cli-interaction/followup-q1.md#does-the-unchanged-rule-set-still-pass-on-the-new-parser). grim: measured by command, no source location (help-structure §5). |
| UX-CLI-04 | **violated**: `exec` is row 18 of 23, `package` row 14, flat list | **violated**: `add` is row 11 of 27, flat list | Definition order: ocx enum `crates/ocx_cli/src/command.rs:115` (`Env`, first) to `:404` (`Exec`), no `display_order`; grim enum `src/main.rs:94-95`. `help-check.sh` output; cli-first-run.md §2. |
| UX-CLI-05 | **violated**: no Examples block. The only hit is an inline one in a flag doc (`crates/ocx_cli/src/command/package_push.rs:262`) | **violated**: no examples anywhere | `grep -rn 'after_help\|after_long_help'`: ocx hits only `crates/ocx_cli/src/app.rs:692-694`, a test that reads them; grim 0 hits in `src/`. Run for this revision. |
| UX-CLI-06 | satisfied: 44 lines | satisfied: 45 lines | help-structure §2. Measured by command, no source location. |
| UX-CLI-07 | **violated**: `update` and `upgrade` are both top-level. `dup-scan.sh` lists 8 pairs for review | satisfied: no pair, no duplicate | ocx `crates/ocx_cli/src/command.rs:295` (`Update`), `:323` (`Upgrade`); `help-check.sh` HELP-06; `dup-scan.sh`. |
| UX-CLI-08 | **violated**: `ocx --version` and `-V` exit 64. Only `ocx version` works, and it prints a bare `0.6.8` | satisfied: `grim 0.16.0` | `crates/ocx_cli/src/app.rs:54-58` (no `version` in the root `#[command]`); discoverability-recovery §1a. Re-measured 2026-11-27: `ocx --version` and `-V` exit 64; Linux `strace` counts 0 connects for `ocx version` and `grim --version` against 1 for the `curl` control ([followup-q0.md](ux-cli-interaction/followup-q0.md)). macOS and Windows: not run for either product. |
| UX-CLI-09 | **violated** at the top level: 23 of 23 top-level typos fail. Satisfied for groups (`ocx package instal`) and flags (`--selct`) | satisfied: 43 of 43 | `typo-check.sh`; ocx cause `crates/ocx_cli/src/command.rs:484` (`external_subcommand`) and `crates/ocx_cli/src/app/plugin_dispatch.rs:90-96`; discoverability-recovery §1b |
| UX-CLI-10 | **violated**: the install hint is built from the typo | n/a (no plugin dispatch) | `crates/ocx_cli/src/command.rs:484`, `crates/ocx_cli/src/app/plugin_dispatch.rs:90-96` |
| UX-CLI-11 | satisfied: typos exit 64 and run nothing | satisfied | discoverability-recovery §1b. The `infer_*` grep found no hit in `crates/ocx_cli/src` or `src/`. The snapshot diff was not run in this revision. |
| UX-CLI-12 | **violated**: 92 of 92 after-position runs exit nonzero, although help says `--format` "Applies to every command". `-g` means `--global` at the root and `--group` in 10 paths | satisfied: 0 failures in both scripts | ocx: no `global = true` anywhere in `crates/ocx_cli/src` (grep, 0 hits); globals in `crates/ocx_cli/src/app/context_options.rs:46` (`-g, --global`), `:87` (`format`), `:145` (`--log-level`), `:153` (`--color`); `-g` as `--group` at `command/add.rs:26`, `command/update.rs:59`, `command/upgrade.rs:58`, `command/remove.rs:37`, `options/group_selection.rs:21`. grim: `global = true` on every global at `src/cli/options.rs:63-106`. `global-pos.sh`, `short-scan.sh`. |
| UX-CLI-13 | **violated**: `ocx self --help` says completions live under `self`, but they live under `ocx shell completion --shell <s>` (`crates/ocx_cli/src/command/shell_completion.rs:13-48`). `ocx completion bash` prints the plugin hint. Clean stdout is satisfied | satisfied: listed at `grim --help` line 26, 0 bytes on stderr, unknown shell exits 64 | discoverability-recovery §1e |
| UX-CLI-14 | **violated**: the block ends `ocx about` (a verify command, not the headline), then `rm -rf $_ocx_home` as the last line. The re-run prints only `already installed ... OCX_INSTALL_FORCE=1` | **violated**: ends on `source $HOME/.cargo/env.fish (fish)` with no first command. The generated installer cannot end on a custom line: `install-success-msg` replaces the success line, which prints before the PATH block in both the shell installer (line 966 of the 0.17.0 installer) and the powershell installer (line 510 of a 0.33.0-generated one). The wrapper must print the line after `sh "$tmp" "$@"` at `docs/public/install.sh:35`, for example `printf '%s/bin/grim init\n' "${GRIMOIRE_INSTALL_DIR:-$HOME/.cargo}"` | `www-setup/src/install.sh:885-902` (`ocx about` :898, `rm -rf` :902), `:1080`; cli-first-run.md §5 (`grim-dist:966,1009-1012`); [followup-q2.md §4-6](ux-cli-interaction/followup-q2.md#4-order-in-grims-published-0170-shell-installer). The follow-up's appended line was measured as the last line for the default and a custom directory. It carried a `next: ` prefix, which step (2)'s pattern rejects, so the line above drops it. That exact text was not run. |
| UX-CLI-15 | satisfied: `no ocx.toml found in /tmp/e or any parent; run ocx init to create one` | **violated**: `/home/u: no grimoire.toml found by walking up from the working directory`, exit 79, from 5 commands | `crates/ocx_cli/src/app/project_context.rs:35`; grim `src/config/config_error.rs:148` |
| UX-CLI-16 | **violated**: `run ocx install ocx.sh/nodejs/node:24` routes into the plugin error. The `self --help` completions pointer also fails | not measured beyond the 9 grim rows in the audit (none names a missing command) | `crates/ocx_package_manager/src/error.rs:357`; cli-first-run.md §4 row 4 |
| UX-CLI-17 | **violated**: `ocx add` and `pull` print tables with no next line, and no `no-next-step.txt` exists | **violated**: `grim init` prints one `created` row, and `grim add` names no next verb | ocx: measured by command, no source location (first-run-and-handoff §2.7). grim: `src/command/init.rs:65` builds the `Created` report, with no next line. |
| UX-CLI-18 | **violated**: the trust-policy line is `log::info!`, unprefixed, on every unsigned install | **violated**: the no-client notice is a timestamped ANSI `WARN` log line | `crates/ocx_package_manager/src/tasks/auto_verify.rs:430-431`; grim `src/install/installer.rs:800` |
| UX-CLI-19 | new commitment: no first-run script in either repository | new commitment | Baseline: ocx 3 commands, about 11 s; grim 3 commands, about 4 s (first-run-and-handoff §2.4, §2.9) |
| UX-CLI-20 | partly violated: a rejected `--color=always` after the subcommand still colours clap's usage error (14 SGR) on a pipe under `NO_COLOR=1` | **violated**: tracing layer built without `with_ansi`, so ANSI goes to piped stderr under `--color=never` | ocx: `crates/ocx_cli/src/app.rs:83` and `crates/ocx_console/src/options/color_mode.rs:19-40` pre-scan argv for `--color` in any position, and `app.rs:97` builds clap's styles from the stdout decision while the error goes to stderr. grim `src/main.rs:458-462`. terminal-accessibility §4 defects 1 and 3. |
| UX-CLI-21 | satisfied for this rule's conditions: `TERM=dumb`, `--quiet` and a pipe give 0 and 0. The `CI=1` animation is a CLI-08 violation (CR-4). The steady tick is 100 ms | **violated**: the bar still draws under `TERM=dumb` | `crates/ocx_console/src/progress.rs:34,43,57,89,109,160`; terminal-accessibility §5 |
| UX-CLI-22 | satisfied for state colours (`crates/ocx_console/src/styles.rs:12-18`). `ocx about` emits `38;5;203` ×21 and fails the check until the owner lists it or removes it | satisfied, including `grim tui` (slots 2-6) | grim `src/cli/color.rs:186-190`; terminal-accessibility §6 |
| UX-CLI-23 | satisfied: `error:` text labels | satisfied: `State` and `Status` columns in words | terminal-accessibility §7. Measured by command, no source location. |
| UX-CLI-24 | n/a (no TUI) | probably satisfied (`search`, `status` and `install` exist). Unverified against the full key-to-action table | grim key table `src/tui/app.rs:1372` (`map_key`); terminal-accessibility §9 |
| UX-CLI-25 | n/a | **violated**: `grim tui` enters the alternate screen (`ESC[?1049h`), and its `--help` has no linear-mode flag | grim `src/tui/terminal_guard.rs:26` (`EnterAlternateScreen`); terminal-accessibility §9 |
| UX-CLI-26 | satisfied: no claim found | satisfied: no claim found | `grep -rniE` per the rule over both READMEs and both docs trees: 0 hits |
| UX-CLI-27 | not adopted: `FORCE_COLOR` is ignored | not adopted | terminal-accessibility §4 matrix. Measured by command, no source location. |
| UX-CLI-28 | satisfied: bare output is byte-identical to `-h` | satisfied: identical except one trailing blank line, which `diff -B` tolerates | `cd "$(mktemp -d)"; NO_COLOR=1 ocx </dev/null >bare; ocx -h >h; diff -B bare h`, and the same for grim (both exit 0, 0 bytes on stderr), run for this revision. grim's extra newline: `src/app.rs:38-39`. |
| UX-CLI-29 | **violated**: no animation opt-out except `--quiet`, which also drops the report | **violated**: `--progress none` is a flag only, with no environment variable or config key | terminal-accessibility §5; `ocx --help`; `grim install --help` |
| UX-CLI-30 | satisfied: `env.sh` evals `ocx shell completion --shell=... --if-enabled` on every interactive source, so it regenerates on upgrade | not measured | discoverability-recovery §1e. The `shell-integration` read-back kit was not run on either product. |
| UX-CLI-31 | n/a (the ocx installer is hand-written, `www-setup/src/install.sh`) | **violated**: `dist-workspace.toml` on main sets `cargo-dist-version = "0.33.0"` and `installers = ["shell", "powershell"]` with no `install-success-msg` | grim `dist-workspace.toml:5,9`, fetched from main 2026-11-27 ([followup-q2.md §1](ux-cli-interaction/followup-q2.md#1-grims-dist-config-and-wrapper-fetched-not-recalled)) |

Tally: of 31 rules, ocx violates 15 (one of them partly) and has 1 n/a (UX-CLI-31), grim violates 11, 1 rule is a new commitment for both, and 1 (UX-CLI-22 for ocx `about`) waits for an owner decision.

## AI-agent failure modes

The ranking is a judgment. It orders failure modes by how many measured fleet defects each mechanism produced, and by how often an agent meets the trigger in ordinary work.

**1. Trusting a framework default (bites most often: 7 fleet defects).**
- An agent writes `#[command(about)]` without `version` and believes `--version` works (UX-CLI-08).
- It makes a group's subcommand required and believes the group exits with the usage code; it exits 2 (UX-CLI-03).
- It adds `external_subcommand` for plugins and loses clap's suggester (UX-CLI-09, 10).
- It declares a flag on the root, documents it as global, and forgets `global = true` (UX-CLI-12).
- It builds a tracing `fmt::layer()` without `with_ansi`, so logs are coloured on a pipe (UX-CLI-20).
- It writes a custom `help_template` without `{after-help}`, which silently deletes the examples (UX-CLI-05).
- It sets cargo-dist's `install-success-msg` and believes the installer now ends on that line. The PATH block prints after it (UX-CLI-14, 31).
- The common check: run the binary, not the source.

**2. Writing text that nothing executes (5 defects).**
- Help examples, error hints (`ocx install`), help pointers (`self` for completions) and installer last lines all go stale with no failing test.
- Docs show `--format json` after the subcommand.
- The common check: UX-CLI-16's append-`-h` runner.

**3. Assuming one switch covers another (3 defects).**
- An agent assumes `NO_COLOR` stops animation.
- It gates a stderr bar on `stdout.is_terminal()`.
- It forgets `TERM=dumb` in the animation gate.
- It assumes `--color=never` reaches log output.
- The common check: UX-CLI-20 and 21 byte counts under each variable separately.

**4. Adding a name without an inventory of existing names (2 defects).**
- An agent adds `upgrade` next to `update`, or `-h` for `--host`.
- It gives a short flag a second meaning below the root.
- The common check: the UX-CLI-07 synonym scan, `short-scan.sh` and the `help-walk.sh` tree walk.

**5. Acting on CLI output as an instruction (the most dangerous, but less frequent).**
- An agent runs the hint `ocx --global add ocx.sh/ocx/<typo>`.
- It runs the last line of an installer, which for ocx is `rm -rf $_ocx_home`.
- It writes a test that pipes the installer's last line into `bash -c`. UX-CLI-14's check runs only the product binary with `-h`.
- An agent may treat any suggestion line as a candidate name and never as a command to run unconfirmed (UX-CLI-10, 14).

**6. Copying exemplar anti-patterns.**
- An agent starts a REPL on bare invocation (deno).
- It resolves prefixes (npm).
- It ends an installer with `Installation complete!` or a Discord link.
- It hard-codes seconds from one CI run as a budget (UX-CLI-01, 11, 14, 19).

**7. Claiming accessibility from memory.**
- An agent writes "fully accessible CLI".
- It cites WCAG 4.1.2 or 1.4.12 for plain output.
- It reads every `38;5;N` as a fixed colour and "fixes" crossterm's slot form (UX-CLI-22, 26).

**8. Writing a check that cannot fail (found in the first version of this file).**
- A case-sensitive `grep 'did you mean'` fails cobra's `Did you mean this?`.
- A `git status` side-effect check runs in a directory that is not a git repository.
- `env --color=never` passes a flag where an environment variable belongs.
- `grep -c` counts matching lines, so a multi-line `--version` still passes.
- A depth cap hides a parser loop instead of fixing the parse. The cap stopped the `its` recursion in gh, and the fake paths still counted as typos (found in wave 2, Verdict 16).
- A script reads its input after `cd` into a temporary directory. A relative path then fails to open, and the script exits 0 (`global-pos.sh`, found in wave 2).
- A network gate has no control run, so `0` connects cannot be told apart from a broken grep. A Linux pass is reported for macOS or Windows (UX-CLI-08, Verdict 15).
- The common check: run each verification once against a known-good and a known-bad binary before shipping it.

## What an agent must ask a human

- **The headline command for each CLI** (ocx: `exec`, `package exec` or `init`; grim: `add` or `init`). It is also the installer's last line, so it states the product's promise. Propose the README Quick Start's first command and ask. For grim, the same decision sets the wrapper's last line and the `install-success-msg` text (UX-CLI-14, 31).
- **Running the UX-CLI-08 network check on macOS or Windows.** No Mac and no Windows host was reachable from this round. On Windows the check needs an audit-policy change and a firewall rule, which change host state. Ask for a host and for permission, and record the result.
- **Any rename or removal for UX-CLI-07 or UX-CLI-12**: `update` versus `upgrade`, the position-dependent `-g`, a top-level verb that duplicates a `package` leaf. Each one breaks scripts. Propose a deprecation window. ocx already has a precedent: `package info` is removed in 0.7.
- **Changing an exit code that scripts may depend on** (`ocx package` from 2 to 64). Ask for the release note.
- **The format of the version string** (`ocx version` prints a bare `0.6.8`, plus JSON fields). Package managers may parse it.
- **Plugin-hint wording and whether it advertises a registry** (UX-CLI-10). It carries a supply-chain stance.
- **Installer policy**: profile edits, systemd session files, `-y` defaults, and whether grim's install page leads with the direct installer or with ocx (measured 7.2 s and 2 commands for the ocx route against 0.7 to 1.3 s and 1 command direct).
- **Security and trust wording** in the unsigned-install warning (UX-CLI-18).
- **Colour policy**: whether to honour `FORCE_COLOR` and how to treat `FORCE_COLOR=0` (UX-CLI-27), and each row of `decorative-colour.allow`, starting with the ocx `about` brand colour `38;5;203` (UX-CLI-22).
- **The name and default of the animation opt-out** (UX-CLI-29), and whether animation is on by default for new users.
- **Whether `grim tui` gets a linear mode or is documented as "use the plain subcommands"** (UX-CLI-25). It costs scope.
- **Any accessibility statement** (UX-CLI-26). It needs a human tester who uses a screen reader. A conformance claim is a legal and brand decision; legal scope belongs to the UX-A11Y law dive.
- **Whether a first-run CI gate may block a release** (UX-CLI-19). Until the owner says so, it reports only.

## Decay

| Rule | Moving fact | Source and date | Refresh | How to re-check |
|---|---|---|---|---|
| UX-CLI-03, 08, 09, 12, 13, 20 | clap behaviour: `version`, `Arg::global`, the `suggestions` feature, `external_subcommand`, the derive's required subcommand, `after_help`, `with_ansi` in tracing-subscriber | clap 4.6.10, 2026-11-24 ([CHANGELOG](https://raw.githubusercontent.com/clap-rs/clap/master/CHANGELOG.md)) | on each clap minor release, at most every 6 months | Re-run `help-check.sh` and the check scripts against the fleet binaries after a bump. The binary tests are the re-check. |
| UX-CLI-09 | Suggestion wording of git, clap and cobra (`most similar`, `tip: a similar`, `Did you mean this?`) | measured 2026-11-27: git 2.43.0, clap 4.6.x, gh 2.105.0 | on a framework major release | Run `typo-check.sh` against a known-good CLI of each framework. A drop to 0 matches means the pattern needs a new alternative. |
| UX-CLI-13, 30 | clap_complete dynamic mode sits behind `unstable-dynamic`; `aot` replaces `generator`. `shell-integration` Step 6 registration forms | clap_complete 4.6.12, [docs.rs](https://docs.rs/clap_complete/latest/clap_complete/), fetched 2026-11-27; `skills/shell-integration/SKILL.md` Step 6, measured 2026-10-11 | 6 months | Open docs.rs and check whether `unstable-dynamic` is still required. Re-read Step 6 for changed SH-EMIT rows. |
| UX-CLI-04, 06 | Exemplar medians: root `-h` median 62 lines, headline in the first 6 rows in 9 of 12 | measured 2026-11-27 against the versions listed in help-structure §1 | 12 months | Re-run the help-structure measurement loop on the same 12 exemplars. |
| UX-CLI-11 | git `help.autoCorrect` values, including `prompt` | git master help.adoc, undated; manual 2.56.1 | 24 months | Fetch help.adoc again. |
| UX-CLI-21, 25, 29 | gh's names: `GH_SPINNER_DISABLED`, `GH_ACCESSIBLE_*` (preview); Copilot CLI `--screen-reader` | [gh environment](https://cli.github.com/manual/gh_help_environment), current manual; GitHub blog 2025-05-02 and 2026-05-21 | 12 months | Fetch the gh environment page and check whether the preview variables have stabilised or been renamed. |
| UX-CLI-22, 27 | `NO_COLOR`, `CLICOLOR` and `FORCE_COLOR` spec text, including the value `0` | no-color.org updated 2026-11-25; bixense undated, deprecated in favour of force-color.org and no-color.org; force-color.org updated 2026-11-11, proposed 2023 (both re-fetched 2026-11-27); Node tty docs current | 12 months | Fetch all four. Check whether force-color.org adds a prose tie-break or a rule for `0`. |
| UX-CLI-23, 26 | WCAG2ICT 2.2 status and Appendix B | W3C Group Note, 2025-12-11 | 24 months, or on a new Note or WCAG 3 | Open https://www.w3.org/TR/wcag2ict-22/ and check for a newer dated version. |
| UX-CLI-14, 31 | cargo-dist: `install-success-msg` is the only installer-output setting, and it prints before the PATH block; the `env` helper's path depends on the layout | dist config reference, undated; CHANGELOG through 0.34.0 (2026-11-01); dist 0.33.0 measured 2026-11-27 ([followup-q2.md](ux-cli-interaction/followup-q2.md)) | on each cargo-dist minor release, at most every 6 months | Grep the changelog for `post-install`, `hook` and `success-msg`. Regenerate a scratch installer with the setting and check whether the PATH block still prints after it. |
| UX-CLI-08 | macOS `sandbox-exec` deprecated, profile language undocumented; sandbox denials logged under `com.apple.sandbox.reporting`; Windows event 5157 fields | man page 2017; Apple DTS October 2019; Apple App Sandbox page undated (copyright 2026); Microsoft Learn event 5157 updated 2026-04-27 ([followup-q0.md](ux-cli-interaction/followup-q0.md)) | 12 months, or on the first real Mac or Windows run | Re-fetch the four pages. After a run, replace the "unrun form" text with the recorded command and output. |
| Check scripts | cobra's arbitrary-argument rule for leaves, and its `Available Commands:` heading; gh's all-caps `COMMANDS` skin | cobra args.go fetched 2026-11-27; cobra v1.10.2 (2025-12-04) `command.go`; gh 2.105.0 measured 2026-11-27 | on a cobra or gh minor release | Re-run the parser contract's four checks. A stock-cobra binary with `Available Commands:` has not yet been run. |
| UX-CLI-19 | Time-to-first-success has no independent benchmark | vendor posts only (Instruqt undated; Fern July 2026) | 12 months | Search for a peer-reviewed or independent CLI first-run study. If one exists, revisit both house budgets. |
| UX-CLI-01, 02, 05, 07, 10, 14 (apart from its cargo-dist clause), 15 to 18, 24, 28 | None (behaviour derived from guides plus measurement) | n/a | on a contradicting finding | n/a |

## Open questions

**Subareas that deserve another round:**

1. What do NVDA, JAWS and Orca actually speak for ocx's progress bar, grim's bar and `grim tui`, with and without the fallback modes? Can a real user complete `grim install` and a TUI search? This needs a human tester. It is the only way to lift UX-CLI-26 from "no claim" to a recorded test, and to set the heartbeat interval left open by A-06.
2. On Windows Terminal and conhost, do `ESC[2A` redraws, `NO_COLOR` and `CLICOLOR_FORCE` behave as on Linux for the Windows builds of ocx and grim? Which line does grim's powershell installer print last when it runs? Run this with the local Windows harness under `/mnt/c/Users/ecom/`. This round measured Linux only, and the wave-2 host had no `/mnt/c`. (The UX-CLI-08 network part is now a documented gap, Verdict 15.)
3. What does ACM CHI 2021 "Accessibility of Command Line Interfaces" ([DOI 10.1145/3411764.3445544](https://dl.acm.org/doi/10.1145/3411764.3445544)) find on progress and status output, with how many participants? Fetch an author copy; the ACM page returned 403.
4. Can clap group the command list under task headings natively (`Command::help_heading` on subcommands, or a `help_template`) without hand-rolled help? This decides whether UX-CLI-04's heading clause is cheap for clap CLIs or whether ordering is the only lever.
5. How do the fleet's installer and first-command paths behave from a human's interactive shell, with prompts and without `-y`? The UX-CLI-19 script should model this. The dive measured only the unattended path.

**Owner decisions (summary of the ask list):** the headline command per CLI. The `update`/`upgrade` and `-g` deprecations. The `ocx package` exit code. `FORCE_COLOR` and its `0` value. The rows of `decorative-colour.allow`, starting with ocx `about`. The name of the animation opt-out. A linear mode for `grim tui`. Direct-first or ocx-first on grim's install page. Whether the UX-CLI-19 gate blocks a release. A Mac or Windows host, and permission for the Windows audit and firewall changes, for the UX-CLI-08 network check.

**Cross-territory findings, named and left:**
- grim reports a nonexistent repository as `registry authentication failed` (cli-first-run.md §4 row 19). This belongs to UX-TEXT error wording.
- An ocx parse error prints a JSON error envelope on stdout after the user's `--format` flag was itself rejected. This belongs to the CLI-02 and CLI-04 stream contract.
- The ocx README and site teach two first-run models. This belongs to docs-quality and marketing first-screen copy.

## Sub-artifacts and key sources

Sub-artifacts:

- [ux-cli-interaction/help-structure.md](ux-cli-interaction/help-structure.md): help skeleton, bare invocation, command grammar, and `help-check.sh`, measured on 14 CLIs.
- [ux-cli-interaction/discoverability-recovery.md](ux-cli-interaction/discoverability-recovery.md): version flag, typo suggestions at three layers, auto-correct policy, global-flag position, and the completion offer.
- [ux-cli-interaction/first-run-and-handoff.md](ux-cli-interaction/first-run-and-handoff.md): installers' final lines, timings in clean containers, empty-config output, and the time-to-first-success definition.
- [ux-cli-interaction/terminal-accessibility.md](ux-cli-interaction/terminal-accessibility.md): colour-variable matrix, spinner byte streams, palette, meaning without colour, WCAG2ICT mapping, and the TUI stance.
- [ux-cli-interaction/followup-q0.md](ux-cli-interaction/followup-q0.md) (wave 2, answered partly): UX-CLI-08's network check on Linux with a control, and the unrun macOS and Windows mechanisms.
- [ux-cli-interaction/followup-q1.md](ux-cli-interaction/followup-q1.md) (wave 2, answered yes): the help-layout parser without the depth cap, measured on gh, ocx, grim, docker, cargo and uv.
- [ux-cli-interaction/followup-q2.md](ux-cli-interaction/followup-q2.md) (wave 2, answered yes): what a cargo-dist installer can print last, measured with dist 0.33.0 and grim's 0.17.0 installer.
- Grounding: [product-audit/cli-first-run.md](product-audit/cli-first-run.md) and [product-audit/config-inventory.md](product-audit/config-inventory.md) (the pinned CLI and TUI rows and the fleet's `quality-cli-help.md`).
- Pinned neighbour: `skills/shell-integration/SKILL.md` Step 6 (completion registration, SH-EMIT-33 to 41).

Key sources:

1. https://clig.dev/: Command Line Interface Guidelines. Undated community guide covering help, suggestions, order-independence and "suggest commands".
2. https://www.w3.org/TR/wcag2ict-22/: WCAG2ICT 2.2, W3C Group Note, 2025-12-11 (informative). Appendix B covers terminals.
3. https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html: GNU `--version`, updated 2026-04-27.
4. https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html: GNU `--help` (explicit flag only; says nothing on bare invocation).
5. https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs: clap `Command` (version, `after_help`, `arg_required_else_help`, `infer_subcommands`), 4.6.x.
6. https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/arg.rs: clap `Arg::global`, `display_order`.
7. https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/env/mod.rs: clap_complete warning to re-source dynamic completions on upgrade.
8. https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc: git `help.autoCorrect` modes.
9. https://no-color.org/: `NO_COLOR` spec, updated 2026-11-25.
10. https://bixense.com/clicolors/ (undated, deprecated) and https://force-color.org/ (updated 2026-11-11): `CLICOLOR`/`CLICOLOR_FORCE` and `FORCE_COLOR` specs (the disputed tie and the value `0`), both re-fetched 2026-11-27.
11. https://cli.github.com/manual/gh_help_environment: gh environment variables (`GH_SPINNER_DISABLED`, `GH_PROMPT_DISABLED`, `CLICOLOR_FORCE` "other than 0", accessibility previews).
12. https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/: the gh accessibility decisions, 2025-05-02 (vendor engineering post).
13. https://devcenter.heroku.com/articles/cli-style-guide: Heroku CLI style guide, updated 2025-01-31 (vendor).
14. https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md: gh usage notation.
15. https://github.com/anomalyco/opencode/issues/39368: user report of TUI screen-reader failures, opened 2026-07-28.
16. https://www.nngroup.com/articles/ten-usability-heuristics/: Nielsen's heuristics, reviewed 2024-01-30 (consistency, for UX-CLI-07).
17. https://nodejs.org/api/tty.html: Node `FORCE_COLOR` levels, `0` disables (current docs).
18. https://axodotdev.github.io/cargo-dist/book/reference/config.html: cargo-dist config reference, `install-success-msg` (undated, fetched 2026-11-27, vendor).
19. https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md: cargo-dist changelog, newest entry 0.34.0 dated 2026-11-01 (vendor).
20. https://raw.githubusercontent.com/spf13/cobra/main/args.go: cobra argument rules ("subcommands will always accept arbitrary arguments"), fetched 2026-11-27.
21. https://developer.apple.com/tutorials/data/documentation/security/discovering-and-diagnosing-app-sandbox-violations.md: Apple sandbox violation logging (undated, copyright 2026, vendor; written for App Sandbox).
22. https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-5157: Windows Filtering Platform event 5157 (updated 2026-04-27, archived, vendor).

## Revision log

Revision of 2026-11-27, from an adversarial review. IDs kept their numbers; three new IDs continue the sequence.

- UX-CLI-01: narrowed to the sourced MUST (no REPL, prompt, stdin read or network; ends with a usage text). Moved exit 0, stdout and byte-identity to new UX-CLI-28 (SHOULD), because no source states the code. Verdict 5 rewritten.
- UX-CLI-28 (new, SHOULD): bare root equals `-h` on stdout with exit 0; `diff -B` tolerates grim's trailing blank line (measured).
- UX-CLI-02: rule text shrunk to the non-obvious clauses. The check is now `help-walk.sh`, which walks the full tree and checks exit codes (ocx 75 paths, grim 44, 0 failures).
- UX-CLI-03: wording now names the derive's required subcommand as the exit-2 source; the Applied row cites `command.rs:328-329` and `clap_parse.rs:20-26`.
- UX-CLI-05: root block aligned with the dive's HELP-05 (2 to 5 lines, was 2 or 3). All counts labelled house heuristics. Added a root-count command; the leaf check runs once per leaf.
- UX-CLI-06: dropped the leaf clause, which could not fail; labelled 60 a house heuristic.
- UX-CLI-07: dropped the unsourced "3 or more operations" clause. The duplicate-name clause is now a review step backed by `dup-scan.sh` (ocx 8 pairs), and the rationale cites NN/g heuristic 4.
- UX-CLI-08: added the `wc -l` equals 1 assertion. Scoped the strace check to Linux and AF_INET, and added a macOS sandbox-exec form (not run) and the Windows gap.
- UX-CLI-09: case-insensitive pattern that names the git, clap and cobra forms. Typo construction now avoids names whose shortened form is a valid name (`ls` becomes `lss`). Shipped `typo-check.sh` (ocx 23 of 74 fail, grim 0 of 43, gh 238 of 246 pass with 0 top-level failures). Added a 4-level recursion cap to the three recursive scripts after a gh help page sent the first run into a loop.
- UX-CLI-10: verification reuses `typo-check.sh`.
- UX-CLI-11: replaced `git status --porcelain` (scratch directory was not a repository) with a before-and-after `find`/`stat` snapshot of the working tree and `HOME`.
- UX-CLI-12: replaced the weak `(before|after) the subcommand` grep with `short-scan.sh` (a short flag that names a different long flag; ocx 10 paths). Added `global-pos.sh` with a per-flag real-value table (ocx 92 of 92 after-position runs fail, grim 0).
- UX-CLI-13: removed the eval-at-startup MUST, which conflicted with `shell-integration` SH-EMIT-34 and rested on the dynamic-mode warning. Moved registration to new UX-CLI-30. Verdict 12 added.
- UX-CLI-30 (new, SHOULD): registration per `shell-integration` Step 6, plus regeneration on upgrade.
- UX-CLI-14: the check no longer runs installer output in a shell. It matches the line's shape and runs only the product binary with `-h`, and it states that the headline's success is not checked. The grim row cites `docs/public/install.sh:35`.
- UX-CLI-16: rule text shrunk to the append-`-h` test and what it covers.
- UX-CLI-17: replaced "absent for a documented reason" with a mechanical form: a `next:` line, or the verb listed in `no-next-step.txt`.
- UX-CLI-19: both numbers labelled house heuristics. The gate reports by default and blocks only when the owner decides.
- UX-CLI-20: split the loop into one flag run and three environment runs (`env --color=never` was invalid). The ocx Applied row cites `app.rs:83`, `app.rs:97` and `color_mode.rs:19-40`.
- UX-CLI-21: removed the opt-out clause, now UX-CLI-29. `CI` and machine output are named as pointers to CLI-08, not new content. The Verdict 8 and CR-4 wording was aligned, and the ocx Applied row moved its `CI=1` finding to CLI-08.
- UX-CLI-29 (new, SHOULD): the animation opt-out (environment variable and config key), as the dive rated it (A-05).
- UX-CLI-22: added the owner-approved `decorative-colour.allow`, and the check now runs over every command path except the listed indices. The ocx `about` row now fails until the owner decides.
- UX-CLI-23: demoted MUST to SHOULD, because the dive calls its check a reading heuristic and no mechanical pass/fail exists. Text shrunk, and the check labelled a review step.
- UX-CLI-27 and Verdict 9: `FORCE_COLOR=0` forces nothing. Re-fetching bixense showed it does not define a `0` value (the "other than 0" wording is gh's), so that premise of the review was corrected. force-color.org's date (updated 2026-11-11) was added and the Decay row updated.
- Applied table: added a source file:line or "measured by command, no source location" to every row the review named (01 to 07, 09, 12, 17, 20, 23, 24, 25). Added rows 28 to 30. Tally recomputed.
- Rule count: 27 to 30 (MUST 17 to 16, SHOULD 9 to 13, CONSIDER 1).
- Failure modes: added mode 8 (verifications that cannot fail) from this review.

Revision of 2026-11-27, from the wave-2 follow-ups. IDs kept their numbers and meanings; one new ID continues the sequence.

- 2026-11-27, UX-CLI-08, [followup-q0.md](ux-cli-interaction/followup-q0.md) (answered partly): added a control run to the Linux `strace` gate (`curl` to 192.0.2.1 counts 1). The macOS and Windows forms are now evidence only: each records a result or `not run`, and a Linux pass is never reported for them. The macOS form now pairs `sandbox-exec` with a `log stream` of sandbox denials. The Windows form names event 5157, and its commands were not fetched. Severity unchanged (MUST). The cross-platform part moved into the Verdict as documented gap 15.
- 2026-11-27, not adopted, followup-q0.md: the proposed SHOULD that the `--version` path builds no network client. Its dead-proxy test ran only on a known-good binary, and a client that ignores proxy variables passes it. Recorded in Verdict 15. The follow-up's proposed number 31 was given to the cargo-dist rule below.
- 2026-11-27, Applied UX-CLI-08, followup-q0.md: added the measured exit 64 for `ocx --version` and `-V`, the 0-connect results with the control, and "not run" for macOS and Windows.
- 2026-11-27, Check scripts (verification of UX-CLI-02, 07, 09, 10 and 12; rule text unchanged), [followup-q1.md](ux-cli-interaction/followup-q1.md) (answered yes): replaced the shared `subs` pattern in all five scripts, removed the 4-level depth cap, and added a same-help skip and an 8-word `RUNAWAY` alarm. Added the parser contract (MUST for this project's scripts, no UX-CLI ID). The revised scripts were re-run on ocx, grim and gh, and every wave-1 number reproduces. The gh cross-check is now 243 typos and 5 failures (was 246 and 8). Verdict 16 added.
- 2026-11-27, Check scripts, `global-pos.sh`, found while re-running for followup-q1.md: the script opened its table after `cd` into a temporary directory, so a relative path silently passed (measured `exit=0`). It now resolves the path with `realpath` first. Failure mode 8 extended.
- 2026-11-27, Applied UX-CLI-03, followup-q1.md: added the group-exit loop over every path with children. ocx `config`, `index`, `patch` and `self` also exit 2, and `ocx direnv` (exit 0) and `ocx shell` (exit 64) print no `Usage`. grim `export` and `hook` pass.
- 2026-11-27, UX-CLI-14, [followup-q2.md](ux-cli-interaction/followup-q2.md) (answered yes): the rule adds that `install-success-msg` is not enough for cargo-dist, and that the project's wrapper prints the last line by absolute path. Verification step (1) now runs with default PATH handling and repeats with the install-dir variable set. The follow-up's proposal to execute the printed command was not adopted, because it conflicts with this rule's parse-only principle (Verdict 4). Severity unchanged (MUST). Verdict 14 added.
- 2026-11-27, UX-CLI-31 (new, SHOULD), followup-q2.md: set `install-success-msg` to the headline-command line in every cargo-dist project.
- 2026-11-27, Applied UX-CLI-14 (grim) and new row UX-CLI-31, followup-q2.md: the grim row names the wrapper fix. The follow-up measured its appended line with a `next: ` prefix; the suggested line drops it to match step (2), and that exact text was not run. grim violates UX-CLI-31. Tally: grim 10 to 11 violations.
- 2026-11-27, CR-3, followup-q2.md: added the cargo-dist sentence and its last-line check to the installer-script change request.
- 2026-11-27, Open questions, followup-q2.md and followup-q0.md: removed question 5 (cargo-dist final line, answered). Question 2 dropped its UX-CLI-08 network part, now a gap, and gained the powershell installer's runtime last line. Questions renumbered (6 became 5).
- 2026-11-27, Decay, followup-q0.md to q2.md: added rows for cargo-dist, for the macOS and Windows network mechanisms, and for the cobra layout the parser depends on. UX-CLI-14 left the "no moving fact" row for its cargo-dist clause.
- 2026-11-27, failure modes 1 and 8 and the human ask list, followup-q0.md and q2.md: added the cargo-dist success-message trap, the depth cap that hides a loop, the relative-path pass, the uncontrolled network gate, and the ask for a Mac or Windows host.
- Rule count: 30 to 31 (MUST 16, SHOULD 13 to 14, CONSIDER 1).
