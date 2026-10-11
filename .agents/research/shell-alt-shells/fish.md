---
title: fish 3.6 to 4.9 for scripts and emitted config
topic: shell
agent: W3-4 alt-shells/fish
model: sonnet
date_researched: 2026-10-11
sources_count: 31
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/fish/
scope: >
  Covers rows M-J-01..M-J-07 and the fish cleanup model (the errexit follow-up; rule family SH-FISH): fish 3.6.0 (Debian 12), 4.0.2 (Debian 13, Alpine 3.22/3.23, Fedora 43),
  4.7.0 and 4.9.3 (latest release, 2026-09-08) were run as real binaries; the supported range, the construct ledger, the failure model without errexit, the cleanup idiom,
  hooks, config placement, version detection, the gate and the test harness. Cites SH-EMIT-02, SH-EMIT-17, SH-EMIT-26, SH-ERR-15/16/17/18 and SH-GATE-09/11 and does not restate them.
  Not covered: fish as an interactive shell (prompts, completions, bindings), fish on Windows (not supported by the fleet installer), and any macOS behaviour (no host: marked "unverified: read only").
---

# fish 3.6 to 4.9 for scripts and emitted config

Date of all runs: 2026-10-11. Fixture root: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/fish/` (written `FX/` below).
fish versions are real binaries: 3.6.0 (`shellzoo:deb12`), 4.0.2 (`shellzoo:deb13`), 4.7.0 and 4.9.3 (ocx toolchain, `RUN_GROUP=old` selects 4.7.0), driven by `matrix.sh fish <script>`.
"parse" means `fish --no-config --no-execute FILE`; "run" means `fish --no-config FILE`.
Cited, not restated: [SH-EMIT-02, SH-EMIT-17, SH-EMIT-26](../shell-emit.md), [SH-ERR-15..18](../shell-errexit.md), [SH-GATE-09, SH-GATE-11](../shell-gate.md).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - F1. The window: which fish ships where, and the supported range (M-J-01)
   - F2. The change ledger 3.6.0 to 4.9.3, one construct per case (M-J-01)
   - F3. Failure without errexit: `$status`, `and`/`or`, `&&`/`||`, and where `exit` is demoted (M-J-04)
   - F4. The cleanup model: what replaces `trap EXIT` and `set -e` (errexit follow-up)
   - F5. Hooks: which events fire in a script (M-J-06)
   - F6. Where emitted and installed config lives (M-J-03)
   - F7. Quoting a value for fish (M-J-02)
   - F8. Version detection and feature flags (M-J-05)
   - F9. The gate and the test harness (M-J-01, M-J-07)
   - F10. Scripts that must not read the user's config
   - F11. An empty directory variable in a glob
   - F12. Fleet and exemplar evidence, defects reported not fixed
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Range:** write fish for **3.6.0 (floor, Debian 12, security support to 2028-06-30 under LTS) through 4.9.3 (ceiling)**. Debian 13, Alpine 3.22/3.23 and Fedora 43 ship **4.0.2**, so a 4.1+ construct breaks a mainstream target. Raise the floor to 4.0.2 when Debian 12 LTS ends (F1).
- **Five constructs change meaning silently, not loudly:** `?` globs on 3.6.0 only; a `for` body keeps locals from the previous iteration on 3.6.0 only; `cmd-not-found || rhs` skips `rhs` on 3.6.0 and 4.0.2; `string repeat 3 ab` returns 1 silently on 3.6.0; `status=123 cmd` is ignored until 4.9.0 and an error from 4.9.0. A sixth is constant: `test -n $empty` is true on all four (F2).
- **Five constructs parse but fail at run time on the older fish:** `{ a; b }` (4.1+), `string pad -C` (4.1+) and `status language` (4.3+) fail on 3.6.0 and 4.0.2; `path basename -E` and `string match --max-matches` (4.0+) fail on 3.6.0. `fish --no-execute` reports none of them, and on 3.6.0 `fish -c` with a parse error exits 0 (F2, F9).
- **fish has no errexit.** `set -euo pipefail` is a run-time error (`set: -euo: unknown option`, status 2) and the script keeps running; `set -e` means *erase*. Failure is `$status`, `if not`, `; or`, `return`/`exit`, written explicitly (F3).
- **The `or ... and ...` chain is a trap:** `test -e $f \n or echo missing \n and return 1` returns 1 when the file exists. Use `if not`. (F3, language docs agree.)
- **`exit` is demoted to a plain stop with status 0** when the function that calls it runs inside `if not`, `while`, a pipeline, or a command substitution in a condition, inside a function (measured 7 of 16 placements, all four versions). Call exit-ing helpers in statement position only (F3; same shape as SH-ERR-17).
- **Cleanup = a `fish_exit` handler plus `--on-signal` handlers for INT, TERM and HUP.** `fish_exit` alone leaks the temp dir on TERM, INT and HUP (the default signal death skips it); signal handlers that do not exit leave the script running; a `set -l` directory variable is invisible to the handlers. KILL always leaks (F4).
- **A signal handler that calls `exit 143` never gives the parent 143/130/129** when the signal went to the fish pid (parent sees 0 for a script waiting on an external child, 2 for a builtin-only loop); re-raising (`rm`, `functions -e` the handler, then `kill -s TERM $fish_pid`) gives 143 on every version and 129 for HUP on 4.7.0+ only. A terminal Ctrl-C (whole process group) gives 130 either way (F4).
- **Events:** `fish_prompt` and `fish_postexec` never fire in a script or `fish -c`; `--on-variable PWD`, `fish_exit` and custom `emit` events do. A named handler is idempotent when re-sourced; an `eval`-generated name, `set -U`, or `set -gxa PATH` is not (F5, F6).
- **Placement:** one `conf.d/<tool>.fish`, rewritten whole (SH-EMIT-17); conf.d loads in natural sort order (`2-a` before `10-b`), a user file shadows a same-named vendor file, and `config.fish` runs last. fish 4.3+ migrates theme variables into `conf.d/fish_frozen_theme.fish`; 4.8+ no longer creates `__fish_initialized`. Never write theme or `fish_variables` (F6).
- **`exit` inside a conf.d file ends that file only**, not the shell (measured, all four versions), so a guard `set -q X; or exit` is safe there (F6).
- **Quoting:** fish single quotes treat only `\\` and `\'` as escapes. The POSIX quoter loses `a\\b`, fails to parse a trailing backslash, and loses `x\'y` on all four versions (3 of 8 hostile values here, 3 of 20 in the audit corpus); escape `\` first, then `'` (F7).
- **Version detection:** `status test-feature NAME` returns 0 on, 1 off, 2 unknown; `$version` is read-only and needs a numeric `major.minor` compare. The `string sub -s 1 -l 1 $FISH_VERSION` first-digit idiom (uv, virtualenv) answers "old" for fish 10 (F8).
- **Gate:** `fish --no-execute` (exit 127 on a parse error) is the parse gate, but it is blind to 9 of the 21 planted bash-isms and to every version-skew construct; add `fish_indent --check`, ten greps, and a run on 3.6.0 and 4.9.3. Never point ShellCheck (SC1071/SC2148) or shfmt at a `.fish` file, and note `shfmt -f` never lists one (F9).
- **Test with littlecheck:** `#RUN: %fish --no-config %s` plus `# CHECK:` lines, driven by the vendored `littlecheck.py`; a wrong `CHECK` exits 1, a right one exits 0 (F9).
- **fish reads the user's config for scripts too** (`fish script.fish` and `#!/usr/bin/env fish` both load conf.d and config.fish); `#!/usr/bin/env -S fish --no-config` fixes it on GNU/uutils env but busybox env 1.37 has no `-S` (F10).
- **Persistence:** a bare `fish_add_path DIR` in a conf.d file writes the universal `fish_user_paths` into `fish_variables` on all four versions; `fish_add_path --path DIR` does not (F6).
- **Fleet:** `www-setup/src/install.fish` parses clean on all four versions and works around the exit demotion correctly, but registers no cleanup for its three `mktemp` results; ocx's `conf.d/ocx.fish` treats an empty `OCX_HOME` as set and sources `/env.fish`; ocx's fish stamp file leaks on TERM/INT/HUP (F12).

## Findings

### F1. The window: which fish ships where, and the supported range (M-J-01)

Package versions measured 2026-10-11 with `FX/distros.sh` (apt-cache policy / apk policy / dnf repoquery in the stock images; output `FX/distros.out`):

| Target | fish | Source |
|---|---|---|
| Debian 12 bookworm | 3.6.0-3.1+deb12u1 | `docker run debian:bookworm apt-cache policy fish` |
| Ubuntu 24.04 | 3.7.0-1 | `FX/ubuntu2404.out` |
| Debian 13 trixie | 4.0.2-1 | `FX/distros.out` |
| Alpine 3.22, 3.23 | 4.0.2-r0 | `docker run alpine:3.22 apk policy fish` |
| Fedora 43 | 4.0.2, 4.2.0 (updates) | `dnf repoquery fish` |
| Ubuntu 26.04 | 4.2.1-3.2 | `FX/distros.out` |
| upstream latest | 4.9.3, released 2026-09-08 | [CHANGELOG.rst](https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst) line 28 |
| macOS (Homebrew) | unverified: read only | no host |

Debian 12 is oldstable: end of life 2026-07-11, LTS until 2028-06-30 ([debian.org/releases](https://www.debian.org/releases/), index of releases table). The brief's range "3.6 to 4.9 until Debian 12 EOL" therefore runs to **2028-06-30**, not to this month.

**Decision:** supported range is **3.6.0 through 4.9.3**; CI matrix is 3.6.0, 4.0.2, 4.9.3 (4.7.0 adds the `||` fix and `string pad -C`). Anything in F2 with a "since" above 3.6.0 is banned in portable scripts and emitted config unless guarded by F8. After 2028-06-30 the floor becomes 4.0.2 (Debian 13, Alpine, Fedora 43 floor). Unreleased `master` features (the CHANGELOG head after 4.9.3: `$(cmd)` in command position, `command --`, `functions -q` returning 0 if any name exists) are never used: all three were run on 4.9.3 and fail (cases 08, 09, 28).

### F2. The change ledger 3.6.0 to 4.9.3, one construct per case (M-J-01)

`FX/breaks.fish` runs the 30 files in `FX/cases/` (one construct per function) under `matrix.sh fish`. Every row below is a measured cell (`FX/breaks.out`, re-run today, byte-identical to the first run); the CHANGELOG column names the release note that explains it.

| # | Construct | 3.6.0 | 4.0.2 | 4.7.0 | 4.9.3 | Release note |
|---|---|---|---|---|---|---|
| 01 | `echo a?` in a dir with `a1 a2` | `a1 a2` | `a?` | `a?` | `a?` | 4.0.0: `qmark-noglob` default on ([CHANGELOG](https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst) l.800) |
| 02 | `{ echo one; echo two }` | parse 0, run 127 | parse 0, run 127 | `one two` | `one two` | 4.1.0 l.510 |
| 03 | `echo {a,b}c` | `ac bc` | `ac bc` | `ac bc` | `ac bc` | unchanged |
| 04 | `for` body reads `$seen` set by `set -l` in the previous iteration | `iter 2 sees seen=from1` | empty | empty | empty | 4.0.0 l.882 |
| 05 | `test -n` / `test -n $empty` (unquoted, empty) | status 0 (true) | 0 | 0 | 0 | flag `test-require-arg` stays off through 4.9.3 |
| 06 | `status=123 echo "got $status"` | `got 0` | `got 0` | `got 0` | **error** `Tried to modify the special variable 'status' with the wrong scope` | 4.9.0 l.66 |
| 07 | `nosuch \|\| echo RHS` | RHS skipped | RHS skipped | RHS runs | RHS runs | 4.7.0 l.193 (regression "from 3.2") |
| 08 | `$(echo echo) hello` | parse 127 | parse 127 | parse 127 | parse 127 | master only (CHANGELOG head) |
| 09 | `command -- echo hi` | prints help, run 2 | same | same | same | master only |
| 10 | `bind -k nul ...` | rc 0 | rc 0 | rc 2 `the -k/--key syntax is no longer supported` | rc 2 | 4.1.0 l.525 |
| 11 | `string pad -C -w 7 ab` | `unknown option` | `unknown option` | `" ab  "` | same | 4.1.0 l.543 |
| 12 | `string match --max-matches=1 -r a aa ba` | `unknown option` | `a` | `a` | `a` | 4.0.0 l.897 |
| 13 | `string repeat 3 ab` (no `-n`) | rc 1, no output | `ababab` | `ababab` | `ababab` | 4.0.0 l.896 |
| 14 | `path basename -E /x/y/file.tar.gz` | `unknown option` | `file.tar` | `file.tar` | `file.tar` | 4.0.0 l.902 |
| 15 | `status language` | `invalid subcommand` | `invalid subcommand` | works | works | 4.3.0 l.354 |
| 16 | `cat <<EOT` | parse 127 `Expected a string, but found a redirection` | same | same | same | no heredocs in any version |
| 17 | `set -euo pipefail` | `set: -euo: unknown option`, rc 2, **script continues** | same | same | same | no errexit |
| 18 | `echo ${x}` | parse 127 `Variables cannot be bracketed. In fish, please use {$x}.` | same | same | same | |
| 19 | `echo $((1 + 2))` | parse 127 | parse 127 | parse 127 | parse 127 | |
| 20 | `if [[ -n x ]]` | **parse 0**, run: `Unknown command: '[[ -n x ]]'` | same | same | same | |
| 21 | ``echo `date` `` | **parse 0**, prints the literal text | same | same | same | |
| 22 | exit-ing helper in an `if` condition | see F3 | | | | |
| 24 | `set -q fish_color_normal` in a script | 1 (unset) | 1 | 1 | 1 | 4.7.0 l.161 |
| 25 | `echo "a\nb"` | literal `a\nb` | same | same | same | no escapes in double quotes |
| 26 | `set b "$(printf 'x\ny\n')"` vs `set a (printf ...)` | `2 1` | `2 1` | `2 1` | `2 1` | `"$(...)"` keeps one element |
| 27 | `set version 1` | read-only error | same | same | same | |
| 28 | `functions -q existing missing` | 1 | 1 | 1 | 1 | master changes it to 0 |
| 29 | `local x=1` | `Unknown command: local`, 127 | same | same | same | |
| 30 | `fish -c 'echo ('` (parse error) | **rc 0** (and `fish -n -c` rc 0) | 127 | 127 | 127 | 3.6.0 re-run directly: `c-rc=0`, `n-c-rc=0`, and `fish -c 'echo ('` printed the error and exited 0 |

Three more measured cells (`FX/orrhs.fish`, `FX/orrhs.out`): the `||` RHS rule of row 07 holds at top level and inside a function; `unknown; or echo rhs` runs the RHS on every version, which is why a probe is written `command -q foo; or ...`, not `foo || ...`.

Behaviour that changed **silently** (no error, different result) and so is the dangerous set: rows 01, 04, 05, 07, 13 and 06 (before 4.9.0). Behaviour that **fails loudly at run time only** (parse gate green): rows 02, 11, 12, 14, 15, 20, 21, 29. Behaviour that **fails at parse time on every version** (the gate catches it): rows 08, 16, 18, 19.

`test-require-arg` in detail (`FX/flags.fish`, `FX/flags.out`): the feature is off by default through 4.9.3, `status features` lists `test-require-arg off 4.0` (`FX/features.out`). With `fish --features test-require-arg` on 4.0.2/4.7.0/4.9.3: `test -n` returns 1, `test -n $empty` returns 1 (correct), `test foo` becomes an error `test: Missing argument at index 2`. On 3.6.0 the flag does not exist and is silently ignored (`status test-feature test-require-arg` returns 2). The release note: [CHANGELOG 4.0.0 l.859-868](https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst) says the flag will "be enabled by default in future". Find the calls that would change with `fish --debug=deprecated-test` (4.0.2+): on `FX/dep/offending.fish` it prints `test: called with one argument. This will return false in future.` four times; on `FX/dep/clean.fish` it prints nothing (`FX/deptest.out`). On 3.6.0 the category does not exist (`Failed to match debug category`).

### F3. Failure without errexit: `$status`, `and`/`or`, `&&`/`||`, and where `exit` is demoted (M-J-04)

**fish has no errexit.** Evidence: row 17 of F2 (`set -euo pipefail` is an error, status 2, and the script prints `still running after false`); `set -e VAR` is the erase form ([`set` docs](https://fishshell.com/docs/current/cmds/set.html)); the fish docs give "The fish exit status is generally the exit status of the last foreground command" ([fish(1)](https://fishshell.com/docs/current/cmds/fish.html)). There is no option to change it on any of the four versions. Failure handling is explicit.

`FX/errorflow.fish` (`FX/errorflow.out`), identical on all four unless noted:

| Probe | Result |
|---|---|
| `false` | status 1 |
| `set -l x (false)` | **status 1**: a command substitution's status becomes the status of `set`. Unlike bash `local x=$(false)`, the failure is visible (contrast SH-ERR-01) |
| `set -l y (true)` | status 0 |
| `false \| true` | status 0, `$pipestatus` = `1 0` (there is no pipefail; read `$pipestatus`) |
| `true \| false` | status 1, `$pipestatus` = `0 1` |
| unknown command | status 127 |
| expansion to an empty command (`$empty`) | status 123 |
| `echo /nonexistent/*` (no match) | status 124, command not run; 3.6.0 prints the warning even under `2>/dev/null`, 4.0.2+ shows none |
| `false` then another line | the script keeps running |
| `&&` and `\|\|` | same as `; and` / `; or` (rows 14-15) |
| `set -l` inside `if` or a function | not visible after the block ends |

Those internal statuses (122 for a command substitution over the read limit per the [language docs](https://fishshell.com/docs/current/language.html); 123, 124 and 127 measured above) are fish's own. They are why SH-ERR-18 forbids a script to `exit` 123 or 124.

**The and-after-or trap.** The language docs state it ([language docs](https://fishshell.com/docs/current/language.html), "Combiners"): `test -e F; or echo missing; and return 1` runs `return 1` when the file exists, because `or` is skipped, `$status` stays 0, and `and` then fires. Measured: `chain /etc/hostname` returns **1** on all four ("want 0"), the `if not test -e` form returns 0. Write:

```fish
# WRONG: returns 1 when the file exists
function chain --argument-names f
    test -e $f
    or echo "missing $f" >&2
    and return 1
    return 0
end

# RIGHT
function chain --argument-names f
    if not test -e $f
        echo "missing $f" >&2
        return 1
    end
    return 0
end
```

**`exit` is demoted to a plain stop with status 0 in some positions.** www-setup's installer documents the symptom in comments ([install.fish:209-216, 316-324, 536-541](https://github.com/ocx-sh/www-setup), `www-setup@a251c3631047:src/install.fish`) and works around it. `FX/exitsem.fish` measures it (16 placements, one file each in `FX/exitsem/`; `die` is `function die; echo "in die" >&2; exit 4; end`). Result, identical on 3.6.0, 4.0.2, 4.7.0 and 4.9.3:

| Placement of the call to `die` | Parent sees |
|---|---|
| statement at top level (`die`), `if die` at top level, `die; and echo then`, `begin; die; end`, `set v (die)`, `false; or begin; exit 7; end` | **4** (7), correct |
| statement inside a function, `die; and ...` inside a function | **4**, correct |
| `while die` at top level | **0**, loop and script stop |
| `if not die` at top level | **0** |
| `die \| cat` | **0** |
| `if test (die) = x` | **0** |
| `if die` **inside a function** | **0**, script stops, "reached after main" never prints |
| `if die; echo y; end` inside a function, then reading `$status` | **0**, script stops |

An exit-ing helper must therefore be called in statement position (a bare line, or the right side of `; or`/`; and`), the same rule as SH-ERR-17 for `die`. A helper whose caller wants to branch returns a status instead, and the caller exits. A `fish_exit` handler cannot recover the status: `$status` inside it is 0 (case `e16`, rc 0, `handler: status=0`).

**Idiom for "run, check, abort"** (every line measured above):

```fish
set -l out (some-tool --flag)        # status of some-tool is now $status
set -l rc $status
if test $rc -ne 0
    echo "some-tool failed: $rc" >&2
    exit 1                            # statement position: honoured
end
command -q jq; or __die "jq required" 2    # `; or`, not `||` (row 07)
```

### F4. The cleanup model: what replaces `trap EXIT` and `set -e` (errexit follow-up)

What fish has instead of `trap ... EXIT INT TERM HUP`:

- `function F --on-event fish_exit`: runs "right before fish exits" ([language docs](https://fishshell.com/docs/current/language.html), event handlers; upstream test [`tests/checks/fish_exit.fish`](https://raw.githubusercontent.com/fish-shell/fish-shell/master/tests/checks/fish_exit.fish)).
- `function F --on-signal SIG`: "Observing a signal will prevent fish from exiting in response to that signal"; the signal "must have been delivered to fish" ([function docs](https://fishshell.com/docs/current/cmds/function.html)).
- `function F --on-process-exit $fish_pid` (the documented replacement for the old `%self`; the older spelling `--on-job-exit $fish_pid` is answered in the [CHANGELOG l.2058](https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst) with "these functions should use `--on-event fish_exit` instead").
- `trap ARG REASON...`, a wrapper that defines `__trap_handler_<SIG>` functions: `EXIT` becomes `--on-event fish_exit` ([trap docs](https://fishshell.com/docs/current/cmds/trap.html); upstream `tests/checks/trap_print.fish` shows the generated `function __trap_handler_EXIT --on-event fish_exit`).

`FX/cleanup.fish` drives `FX/cleanup/v*.fish`. Each victim creates `mktemp -d` with `TMPDIR` pointed at a sandbox, signals the driver, then sleeps 3 s. `FX/cleanup-drive.sh` runs it in seven modes, as `setsid env --default-signal=INT,QUIT fish --no-config VICTIM`: `none` (runs to the end), `exit3` (the script calls `exit 3`), `TERM`/`INT`/`HUP` (`kill -s SIG pid`), `INTgrp` (`kill -s INT -- -pgid`, what a terminal Ctrl-C does), `KILL`. It records the parent's exit status and whether the temp dir survived. (Two harness facts: a signal-driving harness must not be a background job of a fish script, because fish blocks SIGINT/SIGQUIT in non-interactive background jobs; and `env --default-signal` resets the ignored dispositions a background job of a non-interactive `sh` inherits.)

Result on **fish 4.9.3** (rc = parent's status, leak = temp dir still exists); `FX/cleanup-final.out`, `FX/cleanup.out`:

| Victim | none | exit 3 | TERM | INT | HUP | INTgrp | KILL |
|---|---|---|---|---|---|---|---|
| v0 plain, no handler (**violation**) | 0, ok | 3, **leak** | 143, **leak** | 0, **leak** | 129, **leak** | 130, **leak** | 137, leak |
| v1 `fish_exit` handler only | 0, ok | 3, ok | 143, **leak** | 0, **leak** | 129, **leak** | 130, **leak** | 137, leak |
| v2 `--on-signal` handlers that `rm` but do not `exit` | 0, **leak** | 3, **leak** | 0, ok | 0, ok | 0, ok | 0, ok | 137, leak |
| v3 `fish_exit` + signal handlers that `exit 143/130/129` (**twin**) | 0, ok | 3, ok | **0**, ok | **0**, ok | **0**, ok | 130, ok | 137, leak |
| v4 `trap 'rm' EXIT; trap 'exit N' INT/TERM/HUP` (wrapper) | 0, ok | 3, ok | 0, ok | 0, ok | 0, ok | 130, ok | 137, leak |
| v5 as v3 but `set -l tmp` (local) | 0, **leak** | 3, **leak** | 0, **leak** | 0, **leak** | 129, **leak** | 130, **leak** | 137, leak |
| v6 `--on-process-exit $fish_pid` + TERM/INT handlers | 0, ok | 3, ok | 0, ok | 0, ok | 129, **leak** | 130, ok | 137, leak |
| v7 `fish_exit` only, no signal handlers | 0, ok | 3, ok | 143, **leak** | 0, **leak** | 129, **leak** | 130, **leak** | 137, leak |
| v8 `fish_exit` + handlers that `rm`, remove themselves, re-raise on `$fish_pid` (**recommended**) | 0, ok | 3, ok | **143**, ok | 0, ok | **129**, ok | 130, ok | 137, leak |

Identical on 3.6.0, 4.0.2 and 4.7.0 except the cells below (`FX/cleanup.out`, `FX/cleanup-v8.out`):

| Cell | 3.6.0 | 4.0.2 | 4.7.0 | 4.9.3 |
|---|---|---|---|---|
| v8 HUP, parent's rc | 0 | 0 | 129 | 129 |
| v0 exit3 leak | yes | yes | yes | yes |

Readings:

1. **`fish_exit` is not run when a signal kills the shell**: v1 and v7 leak on TERM, INT, HUP and Ctrl-C. It is run on `exit N` and on normal end (v1: exit 3 and none are clean). Do not rely on `fish_exit` alone.
2. **Observing a signal means fish no longer exits** (v2): the handlers removed the directory and the script ran on to its end with status 0. A signal handler must itself `exit` or re-raise.
3. **The directory variable must be global** (v5 vs v3): `set -l tmp` is invisible to the handler functions, so every row leaks. `set -g` (or `set -gx`).
4. **`exit N` in a handler loses N** (v3, v4): the parent sees 0 for TERM, INT and HUP delivered to the fish pid; only the group-wide Ctrl-C (INTgrp) comes out as 130. v8's re-raise keeps 143 for TERM on every version and 129 for HUP on 4.7.0+. A lone INT sent with `kill -s INT pid` ends with 0 under either idiom (fish treats it as a cancel); that is not the Ctrl-C path.
5. **KILL cannot be handled**: every row leaks, rc 137. Mitigation is a unique, `TMPDIR`-rooted prefix and a stale-dir sweep at start (not measured).
6. **`--on-process-exit $fish_pid`** (v6) is no better than `fish_exit` and leaks on HUP; do not use it for cleanup.
7. **`trap` works** on 3.6.0 and later (v4 ran on all four) and equals v3, so it inherits the lost-status defect. Acceptable where the exit status of an interrupted run does not matter; otherwise v8.

The cleanup idiom (v8; `FX/cleanup/v8_reraise.fish`):

```fish
set -g __tmp (mktemp -d)                     # global, not local
function __cleanup --on-event fish_exit
    test -n "$__tmp"; and command rm -rf -- $__tmp
end
function __on_term --on-signal TERM
    test -n "$__tmp"; and command rm -rf -- $__tmp
    functions -e __on_term                     # remove self, else kill re-enters
    kill -s TERM $fish_pid                     # default disposition: parent sees 143
end
# same for INT (130) and HUP (129)
```

Order matters: the signal handler must `rm` **before** the re-raise, because the re-raised signal kills the shell without running `fish_exit` (a first draft of v8 without the `rm` leaked on TERM, INT and HUP on all four versions). The sh-side contract it mirrors is SH-ERR-15 (one handler bound before the resource exists) and SH-ERR-16 (INT/TERM/HUP re-raise); fish needs four functions because `fish_exit` is a separate event from the signals and each signal wants its own re-raise (one function may carry several `--on-signal` flags, as v2 does, but then it cannot re-raise the right one).

A second status experiment, `FX/cleanup-status-drive.sh` (`FX/cleanup-status.out`; three bodies: `sleep 3`, a loop of short external children, a builtin `read -t` loop), agrees. With `exit 143` in all three handlers (victim `s1`), a signal delivered to the pid gave the parent rc 0 in the six sleep/loop cells and rc 2 in the three builtin-loop cells, on every version, never 143/130/129; only the group-wide Ctrl-C gave 130 (sleep, loop) and 2 (builtin loop). With the re-raise of v8 (victim `s2`), TERM gave 143 in all nine body-by-version cells, HUP gave 129 on 4.7.0 and 4.9.3 and 0 or 2 on 3.6.0 and 4.0.2, and a lone INT gave 0 (sleep, loop) or 2 (builtin loop). Take away: a script cannot promise a status for a lone INT or, before 4.7.0, for HUP; it can promise cleanup (all rows) and 143 for TERM (re-raise).

### F5. Hooks: which events fire in a script (M-J-06)

`FX/events.fish` registers handlers for `fish_prompt`, `--on-variable PWD`, `fish_exit`, `fish_postexec` and a custom event, then runs `cd /`, `emit my_event a b`. In a script (and `fish -c`), identical on all four versions:

```
interactive? no
PWD handler fired argv=[VARIABLE SET PWD]
my_event fired argv=[a b]
-- end of script
fish_exit fired
```

`fish_prompt` and `fish_postexec` never fired. So `function __x_hook --on-event fish_prompt` (SH-EMIT-26) is inert in non-interactive shells, which is what an emitter wants: conf.d is read by `fish -c` and `fish script.fish` too (F6), and the hook costs nothing there. A handler that must also work in scripts uses `--on-variable PWD` (zoxide registers both, `ajeetdsouza/zoxide@86b443cffcd7:templates/fish.txt:61,63`). Defining a function under an existing name replaces the handler, which is why a fixed name is idempotent under re-source (F6, plant 3 shows the failing alternative). ocx's hook preserves `$status` across the handler (`set -l __ocx_status $status ... return $__ocx_status`, `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:342-346`), which is the right shape because the prompt shows `$status`.

### F6. Where emitted and installed config lives (M-J-03)

**Load order** (`FX/confd-order.fish`, one throwaway root with `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_DATA_DIRS` redirected; `FX/confd-order.out`), identical on all four:

```
load user/conf.d/2-a.fish
load user/conf.d/10-b.fish          # natural sort: 2-a before 10-b
load user/conf.d/a.fish
load user/conf.d/z.fish             # shadows vendor z.fish (same name: only the first runs)
zz-interactive=no                   # `status is-interactive` is false under `fish -c`
load vendor-XDG_DATA_HOME/v.fish
load vendor-XDG_DATA_DIRS/w.fish
load config.fish                    # last
body
```

`fish --no-config -c ...` loads none of it. A script file (`fish script.fish`) loads all of it too. The [language docs](https://fishshell.com/docs/current/language.html) ("Configuration files") list the same directories and state "If there are multiple files with the same name in these directories, only the first will be executed"; the sort order and the vendor-after-user order are measured here, not documented. `/etc/fish/conf.d` was not exercised.

**Idempotence plants** (`FX/placement.fish`, verdict and exit code per version; `FX/placement.out`). It sources a file twice in one shell (A) and loads it from `conf.d` in three successive shell starts (B), then counts handler firings per `emit fish_prompt`, copies in `$PATH`, in a universal variable and in `fish_user_paths`:

| File under test | A: sourced twice | B: three starts | exit |
|---|---|---|---|
| twin: named handler, `fish_add_path --path --prepend $BIN`, no universals | fired=1 path=1 uvar=0 | fired=1 path=1 | **0** on 3.6.0, 4.0.2, 4.7.0, 4.9.3 |
| plant 1: `set -gxa PATH $BIN` | **path=2** | path=1 (PATH is rebuilt each start) | **1** on all four |
| plant 2: `set -Ua __registry $BIN` (universal append) | **uvar=2** | **uvar=3**, grows by one per shell start and persists in `fish_variables` | **1** on all four |
| plant 3: `eval "function __hook_$n ..."` (counter-named handler) | **fired=2** | fired=1 | **1** on all four |

`fish_add_path` is idempotent ("If a directory is already included, it is not added again", [fish_add_path docs](https://fishshell.com/docs/current/cmds/fish_add_path.html)); without `--path` or `--global` it writes the **universal** `fish_user_paths` ("this is the default if it doesn't already exist"), which persists into every later shell and into `fish_variables`. An emitter writing a conf.d file uses `--path` (affects `$PATH` of this shell only, re-applied every start). Measured (`FX/persist.fish`, `FX/persist.out`): after two shell starts with `conf.d/demo.fish` = `fish_add_path $DEMO_BIN` (bare), `fish_variables` holds a `SETUVAR fish_user_paths` line on 3.6.0, 4.0.2, 4.7.0 and 4.9.3 (exit 1); with `fish_add_path --path --prepend $DEMO_BIN` (the twin) it holds none (exit 0).

**`exit` in a conf.d file** (`FX/confd-exit.fish`, `FX/confd-exit.out`): `conf.d/a.fish` = `echo A-before; exit 3; echo A-after-UNREACHABLE`, `conf.d/b.fish` = `echo B-runs`; `fish -c 'echo body'` printed `A-before`, `B-runs`, `body`, and the shell exited 0, on all four versions. `exit` ends the sourced file and nothing else, as the [exit docs](https://fishshell.com/docs/current/cmds/exit.html) say.

**Themes and `fish_variables`** (`FX/theme-pty.sh` drives a real pty with a customised `fish_variables`; `FX/theme-pty.out`):

```
3.6.0   custom   conf.d=[]                                           colors_in_fish_variables=2
4.0.2   custom   conf.d=[]                                           colors_in_fish_variables=2
4.7.0   custom   conf.d=[fish_frozen_key_bindings.fish fish_frozen_theme.fish ]  colors_in_fish_variables=0
4.9.3   custom   conf.d=[fish_frozen_key_bindings.fish fish_frozen_theme.fish ]  colors_in_fish_variables=0
```

On 4.3.0+, the first interactive start moves the customised `fish_color_*`, `fish_pager_color_*` and `fish_key_bindings` universals into `conf.d/fish_frozen_theme.fish` and `conf.d/fish_frozen_key_bindings.fish` ([CHANGELOG 4.3.0 l.337-345](https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst): "migrate these universals to globals set at startup"); 4.8.0 skips the file when the theme equals a historical default (l.113-114). Consequences: an installer that expects colours in `fish_variables` is wrong on 4.3+; a conf.d file named `fish_frozen_*` is fish's; and a tool-owned `conf.d/<tool>.fish` sorts after `fish_frozen_theme.fish`. `__fish_initialized` (the old first-run marker): 4.7.0 creates it on a fresh interactive start, 4.9.3 does not (CHANGELOG 4.8.0 l.126: "fish no longer creates the `__fish_initialized` universal variable"); the "fresh" rows for 3.6.0 and 4.0.2 were timing-dependent in a pty (two runs disagreed) and are not claimed. Never test `__fish_initialized`.

fish 4.0 also makes a theme variable unset in scripts: `fish_color_*` are not set in non-interactive shells on any of the four (row 24); 4.7.0 made that official (l.161).

**ocx's placement** is conformant: `${XDG_CONFIG_HOME:-$HOME/.config}/fish/conf.d/ocx.fish` ([`ocx@c001637dd3ce:crates/ocx_setup/src/profiles.rs:112`](https://github.com/ocx-sh/ocx)), body at `crates/ocx_setup/src/shims.rs:277-283`, one fixed handler name `__ocx_prompt_hook` with the registration guarded by `if not functions -q __ocx_prompt_hook` (`hook.rs:328`). One defect (F12-3).

### F7. Quoting a value for fish (M-J-02)

Rule cited: SH-EMIT-02 (single quotes; escape `\` first, then `'`). Measured (`FX/quote.fish`, 8 hostile values: `a\b`, `a\\b`, `trail\`, `it's`, `x\'y`, `plain`, `dollar $HOME`, ``a`b``; the code is built by the quoter and `eval`ed back, `ok`/`LOST` per value):

| Quoter | 3.6.0 | 4.0.2 | 4.7.0 | 4.9.3 | exit |
|---|---|---|---|---|---|
| POSIX `'` + `'\''` (`posix`) | LOST `a\\b` (comes back `a\b`), LOST `trail\` (`quotes are not balanced`), LOST `x\'y` | same | same | same | **1** |
| SH-EMIT-02 fish quoter (`fish`) | 8/8 | 8/8 | 8/8 | 8/8 | **0** |
| `string escape --style=script` (`escape`) | 8/8 | 8/8 | 8/8 | 8/8 | **0** |

The apostrophe alone survives the POSIX splice because an unquoted `\'` is a literal quote in fish. The failures are exactly the backslash cases, on every version. The audit measured the same split with real tools ([emitters-compared.md:51, 142-143, 175-176](../shell-audit/emitters-compared.md)): mise's fish output with `BS_DBL='a\\b'` arrives as `a\b` and a value ending `\` makes the whole file fail to parse, on 3.6.0, 4.0.2, 4.7.0 and 4.9.3 (`jdx/mise@19e8c8f0d03d:src/shell/fish.rs:182,207` call `shell_escape::unix::escape`); starship passes fish through `shell_words::quote` (`starship/starship@d4d0459c5c24:src/init/mod.rs:44,60,100`). The correct implementations are direnv (`direnv@28a73d1df3f3:internal/cmd/shell_fish.go:107`), oh-my-posh (`quoteFishStr`: `strings.NewReplacer("\\", "\\\\", "'", "\\'")`, `JanDeDobbeleer/oh-my-posh@b0a8acd4d402:src/shell/fish.go:46`) and ocx (`ocx@c001637dd3ce:crates/ocx_shell/src/shell/escape.rs:19-21`: `value.replace('\\', "\\\\").replace('\'', "\\'")`). Doubled backslashes are right only in that order: `\` first, then `'`.

### F8. Version detection and feature flags (M-J-05)

`FX/versions.fish` (`FX/versions.out`), identical shape on all four:

```
version=4.0.2 FISH_VERSION=4.0.2
major=4 minor=0
ge 4.0=yes   ge 4.1=no   ge 4.3=no
parse '4.0b1'                   -> major=4  minor=0
parse '4.9.3-12-gabcdef0-dirty' -> major=4  minor=9
parse '10.0.1'                  -> major=10 minor=0
parse '4.10.0'                  -> major=4  minor=10
```

- `$version` and `$FISH_VERSION` hold the same string; both are read-only (`set version 1` fails with `Tried to change the read-only variable 'version'`, row 27). Parse with `string match -r '^(\d+)\.(\d+)' -- $version` and compare numerically: a string compare puts 4.10 before 4.9. Pre-releases (`4.0b1`) and distro suffixes (`-12-g...-dirty`) parse.
- **Feature flags:** `status test-feature NAME` returns 0 when enabled, 1 when disabled, 2 when unrecognised ([status docs](https://fishshell.com/docs/current/cmds/status.html)). Measured: `qmark-noglob` returns 1 on 3.6.0 and 0 on 4.0.2, 4.7.0, 4.9.3; `test-require-arg` returns 2 on 3.6.0 and 1 on the others; `no-such-flag` returns 2 everywhere. `status features` lists them (`FX/features.out`; 3.6.0 knows four flags, 4.0.2 seven, 4.7.0 and 4.9.3 nine). A flag can be forced in a script with `fish --features NAME` (see [fish(1)](https://fishshell.com/docs/current/cmds/fish.html), `-f`/`--features`); `--features test-require-arg` is silently ignored on 3.6.0.
- **The first-digit idiom is wrong:** `test (string sub -s 1 -l 1 $FISH_VERSION) -lt 3` (uv, virtualenv: `uv@72e1fc88f354:crates/uv-virtualenv/src/activator/activate.fish:42,88`) answers "old" for `10.0.1` (measured: `wrongly-old`). It is harmless on every released fish today (first digit 3 or 4) and wrong at fish 10.
- **API presence is not a flag.** Use the version compare for `{ }` (4.1), `string pad -C` (4.1), `status language` (4.3), `|&` (4.6; `echo hi |& cat` parses on 4.7.0 and 4.9.3, fails on 3.6.0 and 4.0.2, `FX/gate/b24_pipe_stderr.fish`).

### F9. The gate and the test harness (M-J-01, M-J-07)

**Parse gate.** `fish --no-config --no-execute FILE` (`-n`, "Do not execute any commands, only perform syntax checking", [fish(1)](https://fishshell.com/docs/current/cmds/fish.html)); it executes nothing, reads no config (a `config.fish` marker did not print under `fish -n`), exits **127** on a parse error and 0 otherwise. `FX/gate.fish` runs 27 one-construct files in `FX/gate/`:

- **Red (exit 127) on all four versions, 11 files:** unterminated `begin`, `then`/`fi`, `for ... do ... done`, `$?`, `$@`, `$$`, `${x}`, `$((..))`, bare `x=1`, `function f() { }`, heredoc.
- **Red on 3.6.0 and 4.0.2 only:** `echo hi |& cat` (valid from 4.6.0).
- **Green (exit 0), 15 files:** nine bash-isms that fail or mislead at run time (`if [[ -n "$HOME" ]]`, backticks, `set -euo pipefail` and `local x=1` are the run-time-measured ones, F2 rows 20, 21, 17, 29; `diff <(a) <(b)`, `declare -x`, `export -f`, `read -p`, `unset FOO` were not run), and six forms that are valid fish and only suspicious (`true && echo yes || echo no`, `command -v`, `&>`, `. file`, `string split0`, unquoted `test -n $e`). The gate is a syntax check, not a dialect check.
- The ok file passes on all four.

`fish -n` is therefore necessary and not sufficient. It also cannot see version skew: `{ echo one; echo two }` parses on 3.6.0 and 4.0.2 and fails at run time (row 02); `$(cmd)` in command position parses nowhere (row 08). The matrix is the second half of the gate: run the file's tests on 3.6.0 and 4.9.3 (F9 littlecheck below).

**Format gate.** `fish_indent --check FILE` exits 1 on a mis-indented file, 0 on a clean one, and 1 on a file that does not parse (`FX/indent-check.sh`, `FX/ind_*.fish`). On 3.6.0: `ind_bad` check=1 and `fish --no-execute`=0, `ind_ok` 0/0, `ind_broken` 1/127; 4.0.2 and 4.9.3 identical. `fish_indent` is a separate binary of the same release; use the one matching the interpreter you gate with.

**Never shellcheck/shfmt a fish file** (`FX/sc/`, ShellCheck 0.11.0, shfmt 3.13.1 from `run.sh`): `shellcheck sc/shebang.fish` (`#!/usr/bin/env fish`) → `SC1071 (error): ShellCheck only supports sh/bash/dash/ksh/'busybox sh' scripts. Sorry!`, exit 1 ([SC1071](https://www.shellcheck.net/wiki/SC1071)); `shellcheck sc/noshebang.fish` → `SC2148 (error): Tips depend on target shell and yours is unknown`; `shfmt -l sc/fn.fish` → `sc/fn.fish:4:1: if <cond> must be followed by then`, exit 1 (it parses fish as bash); `shfmt -l sc/` over the directory exits 0 and lists nothing, and `shfmt -f sc` lists nothing. So SH-GATE-09's `shfmt -f` discovery never reaches a `.fish` file, and SH-GATE-11's "every family present has a parse-only check" needs a separate fish discovery (`git ls-files -z -- '*.fish'`).

**Test harness (littlecheck).** fish's own tests are `tests/checks/*.fish`, run by `tests/test_driver.py` and `tests/littlecheck.py`. A test starts `#RUN: %fish %s`, lists expected stdout as `# CHECK:` lines and stderr as `# CHECKERR:`. The upstream tree has 215 files (`fish-shell/fish-shell@ac50fe526f74:tests/checks`). `test_driver.py` runs each in a scratch `HOME` and `XDG_*` set (`test_driver.py:79-86`). The vendored `littlecheck.py` runs standalone (`python3 -I littlecheck.py -s fish=PATH file.fish`). Measured (`FX/lc/good.fish`, `FX/lc/bad.fish`): the good file (`ABC`, `rc=3`, a `CHECKERR`, `ac bc`) exits **0**; the bad file whose `CHECK` expects `rc=0` for a function that returns 3 exits **1** with `The CHECK on line 5 wants: rc=0 ... failed to match line stdout:1: rc=3` — on 3.6.0, 4.0.2 and 4.9.3.

**`-c` is not a gate on 3.6.0:** `fish -c 'echo ('` and `fish -n -c 'echo ('` both exit **0** on 3.6.0 and **127** on 4.0.2+ (row 30), so the gate always parses a *file* (`fish -n FILE`), never a `-c` string.

**Parse is not the end.** Upstream's own HEAD files fail `fish -n` on 4.9.3 when they use master syntax: 5 files use `$(...)` in command position ([exemplar-shape.md:602](../shell-audit/exemplar-shape.md)). A gate on 4.9.3 rejects them and a gate on master accepts them: pin the gate to a released version.

### F10. Scripts that must not read the user's config

`FX/confd-order.fish` shows a script file loads conf.d and `config.fish`. `FX/shebang/` (`config.fish` echoes `USER-CONFIG-LOADED`; 4.9.3 under `XDG_CONFIG_HOME=FX/shebang/cfg`):

```
== plain      (#!/usr/bin/env fish)               USER-CONFIG-LOADED  / body / exit=0
== noconfig   (#!/usr/bin/env -S fish --no-config)                       body / exit=0
```

`env -S` exists in GNU coreutils 9.7 (measured) but **not in busybox env**: `docker run alpine:3.22 env -S 'echo a b'` and `busybox:1.37` both print the usage text and exit 1. Therefore a portable fish script cannot rely on a `--no-config` shebang on Alpine; either the caller runs `fish --no-config script.fish`, or the script is written to be correct under any user config (use `command NAME` for externals, `builtin`, and test for functions it calls with `functions -q`). uutils and macOS `env -S` are unverified: read only.

### F11. An empty directory variable in a glob

`FX/emptyvar.fish` (`FX/emptyvar.out` rows, identical shape on all four versions; the first entry of the glob differs by host: `/bin` on the Debian images, `/afs` on the host):

```
unquoted $tmp/*       -> 0 args        # $tmp is an EMPTY LIST: list x '/*' = nothing
quoted "$tmp"/*       -> first=/bin    # one empty string: "/*"
set-but-empty $t2/*   -> first=/bin    # set t2 '' : a list of one empty string
```

So `rm -rf "$tmp"/*` and `rm -rf $tmp/*` with `set tmp ''` both reach `/`. A destructive path variable is validated (`test -n "$tmp"; and test -d "$tmp"`) before use; `command rm -rf -- $tmp` with a bare variable is safe against the empty-list case and harmless against the empty-string case (`rm: cannot remove ''`).

### F12. Fleet and exemplar evidence, defects reported not fixed

Per owner Q6, none of the following was changed.

1. **`www-setup/src/install.fish` (`www-setup@a251c3631047`, 650 lines)**: parses clean on 3.6.0, 4.0.2, 4.7.0, 4.9.3 ([fleet-shell-shape.md:512](../shell-audit/fleet-shell-shape.md)). Its exit-demotion work-arounds (`__ocx_require_downloader` called in statement position, `__ocx_fetch_dist` kept out of command substitutions, lines 209-216, 316-324, 536-541) are exactly the F3 rule and the comments are accurate. **Defect (cleanup):** three temp resources are created with no handler of any kind (`grep` for `fish_exit`, `on-signal`, `trap` returns nothing): `set -l ca_tmp (mktemp)` (line 474), `set -l dist_tmp (mktemp)` (542), `set -l tmpdir (mktemp -d)` (599), and all three are `set -l`. Between line 599 and the `rm -rf $tmpdir` at 643, `__ocx_verify_checksum` (612), `__ocx_safe_extract` (615, which calls `__ocx_err` at 331 and 337) and `__ocx_err` (131-133, `exit`) all leave the directory, with the downloaded archive in it, behind. Reproducer: F4 victim v0 (`matrix.sh fish cleanup.fish v0_plain` shows `exit3:rc=3,leak=yes TERM:rc=143,leak=yes INTgrp:rc=130,leak=yes` on all four); fix pattern: v8.
2. **ocx fish stamp file** (`ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:324-336`): `set -g __ocx_stamp (command mktemp -t ocx-env-stamp.XXXXXXXX)` is removed by `function __ocx_stamp_cleanup --on-event fish_exit`, which is v1 of F4: removed on `exit` and on normal end, **leaked on TERM, INT, HUP and Ctrl-C**. Impact is one empty file in `$TMPDIR` per killed interactive shell; reproducer `matrix.sh fish cleanup.fish v1_exit_event` (leak=yes in the TERM/INT/HUP/INTgrp cells). Fix pattern: add the three `--on-signal` handlers of v8.
3. **ocx `conf.d/ocx.fish`** (`ocx@c001637dd3ce:crates/ocx_setup/src/shims.rs:279`): `set -l _ocx_env (string join '' (set -q OCX_HOME; and echo $OCX_HOME; or echo $HOME/.ocx) '/env.fish')`. `set -q OCX_HOME` is true for a variable that is set to the empty string, so `OCX_HOME= fish` sources **`/env.fish`**. Reproducer `FX/ocxconf.fish`, all four versions: `env -u OCX_HOME HOME=/h` → `/h/.ocx/env.fish`; `env OCX_HOME= HOME=/h` → **`/env.fish`**; `env OCX_HOME=/opt/o` → `/opt/o/env.fish`. The POSIX shims use `${OCX_HOME:-...}`, which treats empty as unset. Fix pattern: `set -q OCX_HOME; and test -n "$OCX_HOME"`.
4. **uv, virtualenv, pdm `activate.fish`** are clean on all four ([fleet-shell-shape.md:515-517](../shell-audit/fleet-shell-shape.md)); uv and virtualenv carry the first-digit version idiom of F8 (`activate.fish:42,88`).
5. **Corpus (fish-shell `share/`, 1,387 `.fish` files)**: `set -l/-g/-U/-x` 2,524 lines in 497 files, `string` 1,629 lines in 411 files, `set -q` 607 in 156 ([exemplar-shape.md:573](../shell-audit/exemplar-shape.md)); fish version drift is the smallest of the alt shells: 0.6% of fish lines change between 3.6 and 4.9 against 4.5% for nu ([shell-topic-map.md](../shell-topic-map.md) H9, row 210).

## Normative guidance candidates

Notation: `FX` is `/home/mherwig/.cache/research-lang/shell-tools/fixtures/fish`; `matrix.sh` is `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`. Every grep **prints the violation**: empty output means pass. The ShellCheck-code verifications of the sh rules do not apply to fish (SC1071 and SC2148 fire on any fish file, F9); the gate for fish is the parse, format and grep set below. IDs continue the SH-FISH family; wave-2 rules are cited, not restated.

**SH-FISH-01 (MUST). Gate every `.fish` file, and every fish script an emitter writes, with `fish --no-config --no-execute FILE` on the floor (3.6.0) and the newest released fish (4.9.3). Exit 127 fails. Parse a file, never a `-c` string.**
- Why: `-n` is the only parse check fish has; `fish -c 'echo ('` exits 0 on 3.6.0 (row 30), and master-only syntax parses on master and not on a release.
- Verify: `matrix.sh fish FILE` is not a parse gate; the gate is `fish --no-config --no-execute FILE; echo $?` on each interpreter (the matrix runs the command in each: `FX/gate.fish`). Reading heuristic for emitters: write the emitted text to a file first.
- Run: yes. `FX/gate/b01_unterminated_begin.fish` exit 127, `FX/gate/ok.fish` exit 0, on 3.6.0, 4.0.2, 4.7.0, 4.9.3 (`FX/gate.out`); `FX/greps/violation/master_only.fish` exit 127 on 4.9.3.

**SH-FISH-02 (MUST). Gate-blind bash-isms are caught by a grep that returns nothing: `set -euo pipefail`, `set -e`/`set -u`, `[[ ... ]]`, backticks, `local`, `declare`.**
- Why: the parser accepts all of them and they fail or mislead at run time (F2 rows 17, 20, 21, 29; F9).
- Verify: `grep -rn --include='*.fish' -e 'set -[a-z]* pipefail' -e '\[\[ .* \]\]' -e '`[^`]*`' -e '^[[:space:]]*local ' -e '^[[:space:]]*declare ' .` (C1). Backticks inside a comment or a string are false positives; each hit is read.
- Run: yes. `FX/greps/violation/bashisms.fish` 5 lines, exit 0; `FX/greps/compliant` empty, exit 1.

**SH-FISH-03 (MUST). ShellCheck and shfmt are never given a `.fish` file; a separate, fish-only discovery feeds the fish gate: `git ls-files -z -- '*.fish' | xargs -0 -r -n1 fish --no-config --no-execute`.**
- Why: `shellcheck` answers SC1071/SC2148 (error, exit 1); `shfmt -l FILE` parses fish as bash and fails (`must be followed by then`); `shfmt -f` and `shfmt -l DIR` skip `.fish` silently with exit 0, so SH-GATE-09 discovery never reaches fish (F9).
- Verify: `grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' -e 'shellcheck.*\.fish' -e 'shfmt.*\.fish' .` (C12) returns nothing.
- Run: yes. `FX/greps/violation/Taskfile.yml` 2 lines; compliant twin empty. The tool behaviours: `FX/sc/` (SC1071, SC2148, shfmt exit 1 on `fn.fish`).

**SH-FISH-04 (MUST). Supported range is fish 3.6.0 to 4.9.3. Scripts and emitted config use only constructs valid and equal on both ends; CI runs the file on 3.6.0, 4.0.2 and 4.9.3. Raise the floor to 4.0.2 after 2028-06-30.**
- Why: Debian 12 (3.6.0, LTS to 2028-06-30) and Debian 13/Alpine/Fedora 43 (4.0.2) are mainstream (F1).
- Verify: `matrix.sh fish FILE` exits equal and prints equal output on all four interpreters for a test file (e.g. `FX/breaks.fish` style); plus SH-FISH-14 and SH-FISH-25 greps.
- Run: yes. `FX/breaks.fish` through `matrix.sh fish`: 30 cases, each row of F2 differs on at least one pair of versions or documents that it does not.

**SH-FISH-05 (MUST). There is no errexit: read the status immediately (`set -l rc $status` on the next line), read `$pipestatus` for pipelines, branch with `if`/`if not`, and `exit` or `return` explicitly. Never emulate `set -e` and never `exit` 123, 124 or 125 (fish's own statuses; SH-ERR-18).**
- Why: `set -euo pipefail` errors and the script runs on; a pipeline's status is its last stage; `false` mid-script does nothing (F3).
- Verify: SH-FISH-02 grep for the emulation; reading heuristic for the status capture (a `$status` read not on the line right after the command); `matrix.sh fish FX/errorflow.fish` shows the statuses.
- Run: yes for the statuses and the `set -euo` plant (`FX/cases/17_set_e_cargo_cult.fish`, rc 2, "still running after false"); no, reading heuristic only, for "status captured immediately".

**SH-FISH-06 (MUST). Do not chain `or` and `and` after a failing test (`test -e F` / `or echo` / `and return 1`); use `if not`.**
- Why: the chain returns 1 when the test succeeded (F3, language docs).
- Verify: `grep -rlPz --include='*.fish' '\n[ \t]*or [^\n]*\n[ \t]*and ' .` (C11) returns nothing. It sees only the two-line shape; `a; or b; and c` on one line needs a read.
- Run: yes. `FX/greps/violation/or_and_chain.fish` listed, exit 0; `FX/greps/compliant/if_not.fish` not listed, exit 1; behaviour in `FX/errorflow.fish` row 10 (`returns 1 (want 0)`).

**SH-FISH-07 (MUST). Probe a dependency with `command -q NAME; or ...` (or `if not command -q NAME`), never `NAME || ...` or `NAME && ...`, while the floor is 4.0.2 or older.**
- Why: `nosuch || echo RHS` does not run RHS on 3.6.0 and 4.0.2 (a regression from 3.2 fixed in 4.7.0); `nosuch; or echo RHS` runs it on all four (row 07, `FX/orrhs.out`).
- Verify: reading heuristic: a `||` whose left side can be a missing external command. `matrix.sh fish FX/orrhs.fish` and compare lines `A..E`.
- Run: yes for the behaviour (3.6.0/4.0.2 print only `E in function, ; or: rhs ran`; 4.7.0/4.9.3 print A-E); no, reading heuristic only, for the review.

**SH-FISH-08 (MUST). A function that calls `exit` is called in statement position only: a bare line, or the right side of `; or` / `; and`. Never as an `if`/`while` condition, after `not`, as a pipeline stage, or inside `test (...)`. A helper that a caller branches on returns a status; the caller exits.**
- Why: in those positions inside a function the shell stops with status 0 (7 of 16 placements, all four versions, F3); same shape as SH-ERR-17.
- Verify: name exit-ing helpers `die`/`__die*`/`fatal` and run `grep -rn --include='*.fish' -e 'if not [a-z_]*die' -e 'if [a-z_]*die' -e 'while [a-z_]*die' .` (C9). Helpers with other names need a read.
- Run: yes. `FX/greps/violation/exit_in_cond.fish` 2 lines, exit 0; `FX/greps/compliant/exit_stmt.fish` empty, exit 1. Behaviour: `matrix.sh fish FX/exitsem.fish`, `e12_if_cond_in_function rc=0` against `e13_stmt_in_function rc=4`.

**SH-FISH-09 (MUST). A script that creates a temp file or directory registers, before creating it: a `--on-event fish_exit` handler that removes it, and `--on-signal` handlers for INT, TERM and HUP that remove it, remove themselves with `functions -e`, and re-raise with `kill -s SIG $fish_pid`. `fish_exit` alone is not enough; `trap` (3.6.0+) is acceptable where the status of an interrupted run does not matter.**
- Why: `fish_exit` does not run when a signal kills the shell; observing a signal stops fish from exiting; KILL is unhandleable (F4).
- Verify (static): `grep -rl --include='*.fish' -e 'mktemp' . | xargs -r grep -L -e 'fish_exit' -e '--on-signal' -e 'trap '` (C8) returns nothing. Verify (dynamic): `matrix.sh fish FX/cleanup.fish VICTIM` exits 0 only when no catchable mode leaks.
- Run: yes. `matrix.sh fish FX/cleanup.fish v0_plain` exit 1, `v3_twin` exit 0, `v8_reraise` exit 0, on all four (`FX/cleanup-final.out`); C8: `FX/greps/violation/mktemp_plain.fish` listed (exit 123 from xargs), compliant empty.

**SH-FISH-10 (MUST). The signal handlers `rm` before they re-raise, and no script promises a status for a lone INT or, before 4.7.0, for HUP. TERM re-raised is 143; the terminal Ctrl-C is 130; `exit 143` inside a handler is not 143.**
- Why: the re-raise kills the shell without `fish_exit`, so a handler without its own `rm` leaks (first draft of v8: leak on TERM/INT/HUP, all four); `exit N` in a handler gave the parent 0 (v3, v4: TERM/INT/HUP rc 0) (F4).
- Verify: `matrix.sh fish FX/cleanup.fish v8_reraise` (rc column: TERM 143; HUP 129 on 4.7.0 and 4.9.3, 0 on 3.6.0 and 4.0.2) against `v3_twin` (TERM 0). Reading heuristic: every `--on-signal` body contains an `rm`/cleanup call before `kill`.
- Run: yes (`FX/cleanup-final.out`, `FX/cleanup-v8.out`, `FX/cleanup-status.out`).

**SH-FISH-11 (MUST). The variable a handler cleans is global (`set -g`), not `set -l`.**
- Why: `set -l tmp` is invisible to the handler functions; every mode leaks (v5, F4).
- Verify: `grep -rn --include='*.fish' -e 'set -l [A-Za-z_]* (mktemp' .` (C13) returns nothing for files that register handlers; a hit in a file whose cleanup is one inline `rm` with no `exit` path between is read and may stand (F12 shows the other case).
- Run: yes. `FX/greps/violation/mktemp_plain.fish`, `rm_glob.fish` listed; `compliant` empty. Behaviour: `v5_local_tmp` leaks on none/exit3/TERM/INT/HUP/INTgrp.

**SH-FISH-12 (MUST). Quote every variable and command substitution given to `test`/`[`: `test -n "$x"`. Today `test -n $x` is true when `$x` is empty on 3.6.0 through 4.9.3, and `test foo` is the one-argument form that `test-require-arg` removes.**
- Why: `test -n $empty` returned 0 (true) on all four (row 05); the project is preparing to flip the default (CHANGELOG 4.0.0 l.859-868).
- Verify: `grep -rn --include='*.fish' -e 'test -[nz] \$[A-Za-z_]' -e '\[ -[nz] \$[A-Za-z_]' .` (C4); and `fish --no-config --debug=deprecated-test FILE 2>&1 >/dev/null` prints nothing on 4.0.2+ for a test run that exercises the file.
- Run: yes. C4 on `FX/greps/violation/unquoted_test.fish` 2 lines; compliant empty. `FX/dep/offending.fish` → 4 `test: called with one argument` lines on 4.0.2, 4.7.0, 4.9.3; `FX/dep/clean.fish` → 0 (`FX/deptest.out`).

**SH-FISH-13 (MUST). Do not use `?` as a glob, `%self`, `bind -k`, or a `NAME=value` prefix on the special variable `status`.**
- Why: `?` globs on 3.6.0 and not on 4.0+; `%self` is off behind a flag and slated for removal; `bind -k` errors from 4.1; `status=123 cmd` errors on 4.9.0+ and is ignored before (rows 01, 06, 10).
- Verify: `grep -rn --include='*.fish' -e '%self' -e 'bind -k' -e 'string sub -s 1 -l 1.*FISH_VERSION' -e 'on-job-exit \$fish_pid' .` (C2); the `?` glob is a reading heuristic (an unquoted `?` in a word used as a path pattern) and a run on both 3.6.0 and 4.9.3.
- Run: yes for C2 (`FX/greps/violation/removed.fish` 3 lines; compliant empty); the `?` behaviour in `FX/cases/01_qmark_glob.fish`; no, reading heuristic only, for the review of `?`.

**SH-FISH-14 (MUST). Use no 4.1+ syntax unless the floor is 4.1+: no `{ a; b }` compound command, no `|&`, no `string pad -C`, no `status language`; no 4.0+-only options (`string match --max-matches`, `string repeat` without `-n`, `path basename -E`) while the floor is 3.6.0.**
- Why: all are loud failures on the older fish and none is a parse error on 3.6.0/4.0.2 (rows 02, 11, 12, 13, 14, 15, `|&`).
- Verify: `grep -rn --include='*.fish' -e '^[[:space:]]*{[[:space:]]' .` (C3) returns nothing; the others by `matrix.sh fish FILE` on 3.6.0 and 4.0.2 (non-zero exit or `unknown option` text).
- Run: yes. C3 on `FX/greps/violation/brace_compound.fish` 1 line; compliant empty. `FX/cases/02,11,12,14,15` under `matrix.sh fish FX/breaks.fish` show the failures per version.

**SH-FISH-15 (MUST). Detect a version with `string match -r '^(\d+)\.(\d+)' -- $version` and a numeric compare, a feature flag with `status test-feature NAME` (0 on, 1 off, 2 unknown). Never take the first character of the version.**
- Why: a string or first-digit compare breaks at 4.10 and 10.0 (F8).
- Verify: C2 pattern `string sub -s 1 -l 1.*FISH_VERSION`; `matrix.sh fish FX/versions.fish` shows `uv/virtualenv idiom ... -> wrongly-old` for `10.0.1`.
- Run: yes (`FX/versions.out`; `FX/greps/violation/removed.fish` line 5).

**SH-FISH-16 (MUST). Emitted fish config is one `conf.d/<tool>.fish` rewritten whole (SH-EMIT-17), idempotent under re-source and under repeated shell starts: a fixed-name handler function, `fish_add_path --path`, no `set -Ua`, no `set -gxa PATH`, no `eval`-generated handler names.**
- Why: sourced twice, `set -gxa PATH` gives 2 copies, a counter-named handler fires twice, a universal append grows by one per shell start and persists; a bare `fish_add_path` writes a universal `fish_user_paths` (F6).
- Verify: greps C5 `set -[a-zA-Z]*U`, C6 `set -[a-zA-Z]*a[a-zA-Z]* PATH`, C7 `eval "function`, C15 `fish_add_path [^-]`: `grep -rn --include='*.fish' -e 'set -[a-zA-Z]*U' -e 'set --universal' -e 'set -[a-zA-Z]*a[a-zA-Z]* PATH' -e 'set -[gx]* PATH \$PATH' -e 'eval "function' -e "eval 'function" -e 'fish_add_path [^-]' .`; dynamic `matrix.sh fish FX/placement.fish FILE` (exit 1 on duplicates) and `matrix.sh fish FX/persist.fish FILE` (exit 1 when `fish_variables` gains a universal).
- Run: yes. `placement.fish` exit 0 for `twin_confd.fish`, exit 1 for the three plants, on all four (`FX/placement.out`); `persist.fish` exit 1 for `plant_bare_add_path.fish`, exit 0 for the twin, on all four (`FX/persist.out`); C5/C6/C7/C15 each red on the plant and empty on the twin (`FX/greps.out`).

**SH-FISH-17 (MUST). Emitted code and installers never write theme or key-binding variables, never edit `fish_variables`, and never use `__fish_initialized` as a first-run marker.**
- Why: 4.3+ moves customised theme universals into `conf.d/fish_frozen_theme.fish` and `fish_frozen_key_bindings.fish`; 4.8+ no longer creates `__fish_initialized` (F6).
- Verify: `grep -rn --include='*.fish' -e '__fish_initialized' -e 'fish_frozen_' -e 'SETUVAR' .` (C14) returns nothing outside fish's own files.
- Run: yes. `FX/greps/violation/theme_write.fish` 2 lines; compliant empty. Behaviour: `FX/theme-pty.out` (4.7.0, 4.9.3 create the frozen files from a customised `fish_variables`; 3.6.0, 4.0.2 do not).

**SH-FISH-18 (MUST). Quote a value for fish with the SH-EMIT-02 form: escape `\` first, then `'`, inside single quotes (or `string escape --style=script` when the code runs in fish). Never reuse the POSIX `'\''` quoter for fish.**
- Why: 3 of 8 hostile values are lost or break the parse with the POSIX quoter on every version (F7).
- Verify: `matrix.sh fish FX/quote.fish fish` exit 0 and `... quote.fish posix` exit 1; real-tool corpus in the emit audit.
- Run: yes. `quote.fish fish` 8/8 and exit 0, `quote.fish posix` LOST ×3 and exit 1, on 3.6.0, 4.0.2, 4.7.0, 4.9.3 (`FX/quote-fish.out`, `FX/quote-posix.out`).

**SH-FISH-19 (MUST). A hook is a fixed-name function with `--on-event fish_prompt` (SH-EMIT-26) and the emitter assumes it never fires in a script. Code that must run in scripts uses `--on-variable PWD` or `fish_exit`.**
- Why: `fish_prompt` and `fish_postexec` do not fire non-interactively; `PWD`, `fish_exit` and custom events do (F5).
- Verify: `matrix.sh fish FX/events.fish` prints no `fish_prompt fired` line and prints `PWD handler fired`, `my_event fired`, `fish_exit fired`.
- Run: yes (all four versions).

**SH-FISH-20 (SHOULD). A script that must not read the user's configuration is run as `fish --no-config script.fish`; a script that is executed directly is written so it is correct under any user config. `#!/usr/bin/env -S fish --no-config` is for GNU/uutils/macOS-style `env` only, never for a script that must run on Alpine/busybox.**
- Why: `fish script.fish` and the plain `env fish` shebang load conf.d and config.fish; busybox env 1.37 has no `-S` (F10).
- Verify: reading heuristic for shebang lines: `grep -rn --include='*.fish' -e '^#!.*env -S' .` hits are checked against the target list. Behaviour: `FX/shebang/plain.fish` prints `USER-CONFIG-LOADED`, `noconfig.fish` does not; `docker run alpine:3.22 env -S 'echo a b'` exits 1.
- Run: yes for the behaviour; no, reading heuristic only, for the target-list review.

**SH-FISH-21 (MUST). Validate a path variable before a destructive command, and quote it as one word: `test -n "$tmp"; and test -d "$tmp"; or exit 1`, then `command rm -rf -- $tmp`. Never `rm -rf "$tmp"/*` or `rm -rf $tmp/*` with a variable that can be an empty string.**
- Why: `"$tmp"/*` with `tmp=''` is `/*`; the unquoted spelling is safe only for an empty list (F11).
- Verify: `grep -rn --include='*.fish' -e 'rm -[a-z]* "\$[A-Za-z_]*"/' -e 'rm -[a-z]* \$[A-Za-z_]*/\*' .` (C10) returns nothing.
- Run: yes. `FX/greps/violation/rm_glob.fish` 2 lines; `FX/greps/compliant/rm_guarded.fish` empty. Behaviour: `FX/emptyvar.out`.

**SH-FISH-22 (SHOULD). Format with `fish_indent --check FILE` (exit 1 = needs formatting or does not parse), the `fish_indent` of the same release as the gating interpreter.**
- Why: it is the only fish formatter and it fails on unparseable input too (F9).
- Verify: `fish_indent --check FILE; echo $?`.
- Run: yes. `FX/ind_bad.fish` 1, `ind_ok.fish` 0, `ind_broken.fish` 1 on 3.6.0, 4.0.2, 4.7.0 and 4.9.3 (`FX/indent-check.sh` for 3.6.0 and 4.0.2; the ocx `fish_indent` binaries for 4.7.0 and 4.9.3).

**SH-FISH-23 (SHOULD). Test fish code with littlecheck files (`#RUN: %fish --no-config %s`, `# CHECK:` and `# CHECKERR:` lines), run on 3.6.0 and the newest release.**
- Why: it is upstream's own harness, runs standalone, and fails with the line that disagreed (F9).
- Verify: `python3 -I littlecheck.py -s fish=PATH FILE`; exit 1 on a failed `CHECK`.
- Run: yes. `FX/lc/good.fish` exit 0, `FX/lc/bad.fish` exit 1 on 3.6.0, 4.0.2, 4.9.3.

**SH-FISH-24 (SHOULD). The suite is clean under `fish --debug=deprecated-test` on 4.0.2+ (prints no `test: called with one argument`).**
- Why: it is the dynamic detector for the one-argument `test` form that `test-require-arg` will remove (F2).
- Verify: `fish --no-config --debug=deprecated-test FILE 2>&1 >/dev/null`: output empty = pass; the category does not exist on 3.6.0.
- Run: yes. `FX/dep/offending.fish` 4 lines; `FX/dep/clean.fish` 0 lines on 4.0.2, 4.7.0, 4.9.3 (`FX/deptest.out`).

**SH-FISH-25 (MUST). Only released syntax: no `$(cmd)` in command position, no `command --`, `builtin --`, and the gate is pinned to a released fish.**
- Why: they parse or run on master and fail on 4.9.3 (rows 08, 09); upstream's own HEAD files fail `fish -n` on 4.9.3 for this reason (F9).
- Verify: `grep -rn --include='*.fish' -e '^[[:space:]]*\$(' -e 'command -- ' -e 'builtin -- ' .` (C16) returns nothing.
- Run: yes. `FX/greps/violation/master_only.fish` 2 lines, parse exit 127 on 4.9.3; compliant empty.

**SH-FISH-26 (SHOULD). Do not put `\n` or `\t` inside a double-quoted `echo` string; use `printf 'a\nb\n'` or `echo -e`.**
- Why: fish double quotes do not process escapes, so `echo "a\nb"` prints the literal `a\nb` on all four versions (row 25), the commonest bash-to-fish slip.
- Verify: `grep -rn --include='*.fish' -e 'echo "[^"]*\\[nt]' .` (C17) returns nothing.
- Run: yes. `FX/greps/violation/echo_escape.fish` 2 lines, exit 0; `FX/greps/compliant/printf_ok.fish` empty, exit 1.

## Verification runs

All commands below were run on 2026-10-11. `FX` and `matrix.sh` as above. "Red" is a non-zero exit on the planted violation, "green" is exit 0 (or empty output with grep exit 1) on the compliant twin. Raw outputs sit next to the fixtures.

**V1. Parse gate**, `FX/gate.fish` through `matrix.sh fish` (it reports each file's `fish --no-config --no-execute` status; the script itself exits 0):

```
== fish 3.6.0 (deb12)   b01_unterminated_begin parse=127 ... b05_then_fi parse=127 ... b15_heredoc parse=127  b24_pipe_stderr parse=127   ok parse=0
== fish 4.0.2 (deb13)   same as 3.6.0
== fish 4.7.0           same except b24_pipe_stderr parse=0
== fish 4.9.3           same as 4.7.0
```

12 of 27 plants red on 3.6.0 and 4.0.2 (11 on 4.7.0 and 4.9.3), the ok file green on all four. **The 15 green plants are the documented blind spot**, not a failed verification (F9): `b02_dbracket`, `b03_backtick`, `b04_set_euo`, `b14_process_subst`, `b16_local`, `b17_declare`, `b18_export_f`, `b22_read_p`, `b25_unset` (bash-isms), and `b19`, `b20`, `b21`, `b23`, `b26`, `b27` (valid fish). SH-FISH-02 exists because of them. File: `FX/gate.out`.

**V2. Format gate**, `FX/indent-check.sh` (3.6.0, 4.0.2 in Docker) and the ocx binaries for 4.7.0 and 4.9.3:

```
3.6.0   ind_bad     fish_indent --check=1  fish --no-execute=0
3.6.0   ind_ok      fish_indent --check=0  fish --no-execute=0
3.6.0   ind_broken  fish_indent --check=1  fish --no-execute=127
4.0.2   (same three rows)      4.9.3   ind_bad 1/0, ind_ok 0/0, ind_broken 1/127
```

**V3. ShellCheck and shfmt on fish files**, `FX/sc/`, ShellCheck 0.11.0, shfmt 3.13.1:

```
shellcheck sc/shebang.fish   -> SC1071 (error): ShellCheck only supports sh/bash/dash/ksh/'busybox sh' scripts. Sorry!   exit 1
shellcheck sc/noshebang.fish -> SC2148 (error): Tips depend on target shell and yours is unknown.
shfmt -l sc/fn.fish          -> sc/fn.fish:4:1: `if <cond>` must be followed by `then`   exit 1
shfmt -l sc   /  shfmt -f sc -> (no output)   exit 0
```

**V4. Grep checks**, `FX/greps/run.sh` (output `FX/greps.out`); each check run on `violation/` then `compliant/`; the output of the check is the violation:

| Check | Patterns (each `-e`) | violation tree | compliant tree |
|---|---|---|---|
| C1 bash-isms | `set -[a-z]* pipefail`, `\[\[ .* \]\]`, backtick pair, `^[[:space:]]*local `, `declare ` | exit 0, 5 lines (`bashisms.fish:1,2,3,10,12`) | exit 1, empty |
| C2 removed | `%self`, `bind -k`, `string sub -s 1 -l 1.*FISH_VERSION`, `on-job-exit \$fish_pid` | exit 0, 3 lines (`removed.fish:1,4,5`) | exit 1, empty |
| C3 brace compound | `^[[:space:]]*{[[:space:]]` | exit 0, 1 line | exit 1, empty |
| C4 unquoted test | `test -[nz] \$[A-Za-z_]`, `\[ -[nz] \$[A-Za-z_]` | exit 0, 2 lines | exit 1, empty |
| C5 universal | `set -[a-zA-Z]*U`, `set --universal` | exit 0, 4 lines (`universal.fish:1,2,3`, `confd/plant_uvar_append.fish:6`) | exit 1, empty |
| C6 PATH append | `set -[a-zA-Z]*a[a-zA-Z]* PATH`, `set -[gx]* PATH \$PATH` | exit 0, 1 line (`confd/plant_path_append.fish:5`) | exit 1, empty |
| C7 eval handler | `eval "function`, `eval 'function` | exit 0, 1 line (`confd/plant_handler_counter.fish:3`) | exit 1, empty |
| C8 mktemp, no handler | `grep -rl ... -e 'mktemp' . \| xargs -r grep -L -e 'fish_exit' -e '--on-signal' -e 'trap '` | exit 123 (xargs), 2 files listed | exit 0, empty |
| C9 exit in condition | `if not [a-z_]*die`, `if [a-z_]*die`, `while [a-z_]*die` | exit 0, 2 lines | exit 1, empty |
| C10 destructive glob | `rm -[a-z]* "\$[A-Za-z_]*"/`, `rm -[a-z]* \$[A-Za-z_]*/\*` | exit 0, 2 lines | exit 1, empty |
| C11 or-and chain | `grep -rlPz ... '\n[ \t]*or [^\n]*\n[ \t]*and '` | exit 0, 1 file | exit 1, empty |
| C12 lint config | `shellcheck.*\.fish`, `shfmt.*\.fish` (`*.yml`, `*.yaml`, `*.sh`) | exit 0, 2 lines | exit 1, empty |
| C13 local temp | `set -l [A-Za-z_]* (mktemp` | exit 0, 2 lines | exit 1, empty |
| C14 theme/first-run | `__fish_initialized`, `fish_frozen_`, `SETUVAR` | exit 0, 2 lines | exit 1, empty |
| C15 bare add_path | `fish_add_path [^-]` | exit 0, 1 line | exit 1, empty |
| C16 master-only | `^[[:space:]]*\$(`, `command -- `, `builtin -- ` | exit 0, 2 lines | exit 1, empty |
| C17 echo escapes | `echo "[^"]*\\[nt]` | exit 0, 2 lines | exit 1, empty |

All 17 went red on the plant and stayed empty on the twin. Every command carries an explicit directory operand, one `-e` per alternative, quoted `--include` globs, and no command substitution.

**V5. Cleanup**, `matrix.sh fish FX/cleanup.fish VICTIM` (the driver exits 1 if the victim leaks in any catchable mode, KILL excluded). `FX/cleanup-final.out`:

```
#### v0_plain     == fish 3.6.0  ...exit3:rc=3,leak=yes TERM:rc=143,leak=yes INT:rc=0,leak=yes HUP:rc=129,leak=yes INTgrp:rc=130,leak=yes KILL:rc=137,leak=yes   -> exit 1
                  == fish 4.0.2  / 4.7.0 / 4.9.3  identical, -> exit 1 each
#### v3_twin      == fish 3.6.0  none:rc=0,leak=no exit3:rc=3,leak=no TERM:rc=0,leak=no INT:rc=0,leak=no HUP:rc=0,leak=no INTgrp:rc=130,leak=no KILL:rc=137,leak=yes   -> exit 0 (x4)
#### v8_reraise   == fish 3.6.0  none:rc=0 exit3:rc=3 TERM:rc=143 INT:rc=0 HUP:rc=0   INTgrp:rc=130 (all leak=no) KILL:rc=137,leak=yes   -> exit 0
                  == fish 4.0.2  same as 3.6.0
                  == fish 4.7.0 / 4.9.3   same with HUP:rc=129                                                                          -> exit 0
```

Red on the no-handler plant on all four, green on the twin and on the recommended idiom on all four. The full eight-victim table is `FX/cleanup.out` (re-run today, same cells). The `status` drivers (`FX/cleanup-status.out`) are measurements, not a pass/fail verification.

**V6. Placement idempotence**, `matrix.sh fish FX/placement.fish FILE` (exit 1 on any duplicate), `FX/placement.out`, and universal persistence, `FX/persist.fish`, `FX/persist.out`:

```
twin_confd              -> exit 0 on 3.6.0, 4.0.2, 4.7.0, 4.9.3   (verdict: clean; fired=1 path=1 uvar=0)
plant_path_append       -> exit 1 on all four                     (A: path=2)
plant_uvar_append       -> exit 1 on all four                     (A: uvar=2   B: uvar=3)
plant_handler_counter   -> exit 1 on all four                     (A: fired=2)
persist.fish plant_bare_add_path -> "universal fish_user_paths lines in fish_variables = 1"  exit 1 on all four
persist.fish twin_confd          -> "... = 0"                                                  exit 0 on all four
```

**V7. Quoting round trip**, `matrix.sh fish FX/quote.fish posix|fish|escape` (`FX/quote-posix.out`, `FX/quote-fish.out`): `posix` → `LOST want=a\\\\b got=a\\b`, `LOST want=trail\\ ... Unexpected end of string, quotes are not balanced`, `LOST want=x\\\'y`, exit **1** on 3.6.0, 4.0.2, 4.7.0, 4.9.3; `fish` and `escape` → 8 `ok` lines, exit **0** on all four.

**V8. littlecheck**, `python3 -I FX/raw/littlecheck.py -s fish=<fish-or-wrapper> FX/lc/good.fish|bad.fish`: `good.fish` exit 0, `bad.fish` exit 1 with `The CHECK on line 5 wants: rc=0 ... failed to match line stdout:1: rc=3`, on 4.9.3 (ocx fish), 3.6.0 and 4.0.2 (`FX/tools/fish-3.6.0`, `fish-4.0.2` Docker wrappers).

**V9. `deprecated-test`**, `matrix.sh fish FX/deptest.fish` (`FX/deptest.out`): `offending: stderr lines mentioning test = 4` and clean `= 0` on 4.0.2, 4.7.0, 4.9.3; on 3.6.0 both print `1` (the unknown-category message) and the check is not applicable.

**V10. Measurements that are not pass/fail** (cited in F2-F11): `FX/breaks.out` (30 cases ×4), `FX/errorflow.out`, `FX/exitsem` run (`matrix.sh fish FX/exitsem.fish`; printed in F3), `FX/orrhs.out`, `FX/flags.out`, `FX/versions.out`, `FX/features.out`, `FX/events` (printed in F5), `FX/confd-order.out`, `FX/confd-exit.out`, `FX/theme-pty.out`, `FX/emptyvar.out`, `FX/ocxconf` (printed in F12), `FX/shebang`, `FX/distros.out`.

**What did not go red, and why:** the parse gate on the 15 blind plants (V1; by design, syntax is not dialect); `fish_indent --check` on `ind_ok` (green by design); the `exitsem` and `cleanup-status` drivers report numbers, they do not assert; `theme.fish` (non-interactive) never triggered the 4.3 migration because the migration needs a real interactive start, so the evidence is the pty driver `theme-pty.sh`, whose "fresh" rows on 3.6.0 and 4.0.2 disagreed between two runs (pty timing) and are not claimed.

Fixture hygiene: `FX/runs/` and `FX/run/` hold throwaway config roots and driver sandboxes (some owned by root from a Docker run; leave them); nothing was written outside `FX/` and this file.

## Exemplar evidence

Format `repo@sha12:path:line`. "Satisfies" / "violates" / "contradicts" are against the SH-FISH rule named.

| Rule | Exemplar | Verdict |
|---|---|---|
| 01 parse gate | `www-setup@a251c3631047:src/install.fish` (650 lines), uv `activate.fish`, pdm `activate.fish`/`pdm.fish`, virtualenv `activate.fish`: all clean on 3.6.0, 4.0.2, 4.7.0, 4.9.3 ([fleet-shell-shape.md:512-517](../shell-audit/fleet-shell-shape.md)) | satisfy |
| 01 / 25 released-only | `fish-shell@ac50fe526f74` HEAD files `share/functions/help.fish:231`, `__fish_apropos.fish:38`, `fish_git_prompt.fish:183`, `fish_update_completions.fish:29`, `tests/checks/cmdsub.fish:82` fail `fish -n` on 4.9.3 because they use `$(...)` in command position ([exemplar-shape.md:602](../shell-audit/exemplar-shape.md)) | violate (upstream tracks master; a downstream gate must not) |
| 03 no ShellCheck on fish | `www-setup@a251c3631047` gates its fish installer with `fish --no-execute` only ([fleet-shell-shape.md:512](../shell-audit/fleet-shell-shape.md)) | satisfies |
| 08 exit in statement position | `www-setup@a251c3631047:src/install.fish:209-216` (`__ocx_require_downloader` "asserted once in statement position"), `:316-324` (`__ocx_fetch_dist` kept out of command substitutions), `:536-541` (called "in STATEMENT position, not as an `if` condition") | satisfies, and the comments name the same defect F3 measures |
| 09 cleanup | `www-setup@a251c3631047:src/install.fish:474, 542, 599` (three `mktemp`, no handler, all `set -l`) | violates (F12-1) |
| 09 cleanup | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:328-336` (`fish_exit` handler for the stamp file, global var, no signal handlers) | partially satisfies (exit and normal end clean; TERM/INT/HUP leak, F12-2) |
| 09 cleanup | `jorgebucaran/fisher@791da644d33d:functions/fisher.fish:85, 207` (`set --local source (command mktemp -d)`, removed by one `command rm -rf $source_plugins` at the end) | violates (v0 pattern: an interrupted install leaves the directory) |
| 11 global var | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:329` (`set -g __ocx_stamp`) | satisfies |
| 15 version detection | `uv@72e1fc88f354:crates/uv-virtualenv/src/activator/activate.fish:42, 88` (`test (string sub -s 1 -l 1 $FISH_VERSION) -lt 3`); same lines in the virtualenv-generated copies in the fleet's `.venv` trees | violates (wrong at fish 10) |
| 16 idempotent conf.d | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:328` (`if not functions -q __ocx_prompt_hook`, fixed name) and `crates/ocx_setup/src/profiles.rs:112` (`conf.d/ocx.fish`) | satisfy |
| 16 idempotent conf.d | `ajeetdsouza/zoxide@86b443cffcd7:templates/fish.txt:61,63` (`function __zoxide_hook --on-event fish_prompt` / `--on-variable PWD`) | satisfies (fixed names, both events) |
| 16 conf.d placement | conda ships `shell/etc/fish/conf.d/conda.fish`, direnv installs into `$(SHAREDIR)/fish/vendor_conf.d` (`GNUmakefile:176-177`) ([emitters-compared.md:241](../shell-audit/emitters-compared.md)) | satisfy (conf.d / vendor_conf.d) |
| 18 quoter | direnv `28a73d1df3f3:internal/cmd/shell_fish.go:107`, oh-my-posh `b0a8acd4d402:src/shell/fish.go:41-47`, ocx `c001637dd3ce:crates/ocx_shell/src/shell/escape.rs:19-21`: 20/20 on all four ([emitters-compared.md:140-141](../shell-audit/emitters-compared.md)) | satisfy |
| 18 quoter | mise `19e8c8f0d03d:src/shell/fish.rs:182, 207` (`shell_escape::unix::escape`), starship `d4d0459c5c24:src/init/mod.rs:44, 60, 100` (`shell_words::quote`): 17/20 on all four; mise end to end: `a\\b` arrives as `a\b`, a trailing `\` makes the file unparsable ([emitters-compared.md:142-143, 175-176](../shell-audit/emitters-compared.md)) | violate |
| 18 quoter | ocx `conf.d` body and hook use `fish_single_quoted` for every path (`hook.rs:325, 376`) | satisfies |
| 20 hermetic | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:1986-2010` test harness sets `XDG_CONFIG_HOME` to an empty temp dir "because `fish -c` reads `~/.config/fish/conf.d/*`" and rejects `--no-config` as per-shell and silently skippable | satisfies (same finding as F10, arrived at independently) |
| 23 tests | `fish-shell@ac50fe526f74:tests/checks` (215 files) `#RUN: %fish %s` / `# CHECK:`; `fish_exit.fish`, `trap_print.fish`, `functions.fish:250-262` (three `--on-signal TERM` handlers) | satisfy |
| 26 echo escapes | the audit counted no `echo "...\n"` in authored fleet fish (1 authored file) | n/a |
| 12 quoted test | fish's own `share/` (1,387 files) is written against `test -n "$x"`; the docs "recommend you don't use the one-argument form and quote all variables" ([test docs](https://fishshell.com/docs/current/cmds/test.html)) | satisfy |
| 05/07 | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:342-346` saves `set -l __ocx_status $status` on entry and `return $__ocx_status` at the end of the prompt hook | satisfies |
| 21 destructive path | `www-setup@a251c3631047:src/install.fish:603, 623, 643` use `rm -rf $tmpdir` (a bare variable: safe for an empty list) | satisfies, with no empty-string guard |

Defects found are listed in F12 with a reproducer each and are not fixed (owner Q6).

## AI-agent angle

What an LLM characteristically gets wrong in fish, and the smallest mechanical check. "Gate" = `fish --no-config --no-execute FILE` (SH-FISH-01); Cn = the grep of that number (SH-FISH-02..26); all runs are in "Verification runs".

| Characteristic mistake | What it looks like | Smallest check that catches it |
|---|---|---|
| bash syntax in a `.fish` file | `$(( ))`, `${x}`, `$?`, `$@`, `$$`, heredoc, `then`/`fi`, `do`/`done`, `function f() { }`, bare `x=1` | Gate, exit 127 (11 forms, all four versions) |
| bash syntax the parser accepts | `if [[ -n "$x" ]]`, backticks, `local x=1`, `declare -x`, `export -f` | C1 (parse is green; run time: unknown command, literal text) |
| `set -euo pipefail` copied into fish | `set -euo pipefail` at the top of the file | C1; run: `set: -euo: unknown option`, rc 2, script continues |
| believing fish has errexit | no status checks after `curl`, `tar` | reading heuristic (SH-FISH-05); the run shows `false` mid-script does nothing |
| `A \|\| B` for a missing-command probe | `curl --version \|\| echo missing` on a host without curl | reading heuristic (SH-FISH-07); `FX/orrhs.fish` (RHS skipped on 3.6.0 and 4.0.2) |
| `or`/`and` chain after a test | `test -e f; or echo missing; and return 1` | C11 |
| `exit` in a helper used as a condition | `if not die_unless_root` inside a function | C9; `FX/exitsem` (rc 0 where 4 expected) |
| `trap cleanup EXIT` with bash expectations | `trap 'rm -rf $tmp' EXIT` with `set -l tmp` | C13; V5 (`v4`/`v5`: works only with a global var, loses the status) |
| `fish_exit` alone as the cleanup | one `--on-event fish_exit` handler, no signal handlers | C8; V5 `v1` leaks on TERM/INT/HUP |
| `set -l tmp (mktemp -d)` then a handler | handler cannot see the variable | C13 |
| `exit 143` in an `--on-signal` handler | expects the parent to see 143 | V5 `v3` (parent sees 0) |
| unquoted `test -n $x` | empty variable tests true | C4; `--debug=deprecated-test` |
| `?` as a glob, from 3.x training data | `ls file?.txt` | reading heuristic; `FX/cases/01` |
| 4.1+ syntax in a portable script | `{ cmd1; cmd2 }`, `string pad -C`, `\|&`, `status language` | C3; run on 3.6.0 and 4.0.2 |
| master-only syntax | `$(cmd)` in command position, `command --` | C16; gate on 4.9.3 |
| universal variables in an installer | `set -U fish_user_paths ...`, `set -Ua`, bare `fish_add_path` | C5, C15; V6 |
| appending to `$PATH` in conf.d | `set -gxa PATH $dir` | C6; V6 (path=2 when sourced twice) |
| `eval`-generated hook names | `eval "function __hook_$n ..."` | C7; V6 (fires twice) |
| writing theme or `__fish_initialized` | `set -q __fish_initialized` as first-run test, `fish_color_*` in an installer | C14; `FX/theme-pty.out` |
| first-digit fish version | `test (string sub -s 1 -l 1 $FISH_VERSION) -lt 3` | C2; `FX/versions.out` |
| POSIX quoter for fish | `'it'\''s'` splice for every value | V7 (`quote.fish posix` exit 1); SH-EMIT-02 |
| `echo "a\nb"` | expects a newline | C17 |
| expecting `fish_prompt` in a script | hook registered in `conf.d` and tested with `fish -c` | V10 `events.fish` (no `fish_prompt fired`) |
| `rm -rf "$tmp"/*` | empty variable reaches `/*` | C10; `FX/emptyvar.out` |
| ShellCheck/shfmt on `.fish` | CI `shellcheck **/*.fish` | C12; SC1071 |
| `#!/usr/bin/env -S fish --no-config` on Alpine | busybox env has no `-S` | reading heuristic (SH-FISH-20); `env -S` exit 1 on `alpine:3.22` |
| matching error text across versions | grep for `command substitutions not allowed here` | reading heuristic: the wording changed between 3.6.0 and 4.0.2 (row 08) and again for `status language` output in 4.9; assert on exit status |
| `fish -c 'CODE'` as a parse gate | exit 0 on 3.6.0 for a parse error | F9; gate parses a file |

Hallucinated names to expect (none measured as accepted): `set -o errexit`, `fish --errexit`, `trap ... ERR`, `function --on-exit`, `$FISH_PID` (the variable is `$fish_pid`), `string trim -c`. The fish builtins are small and documented; any name not in `fish --help` or `help` for the target version is suspect (reading heuristic).

## Contested / evolving

- **The floor.** 3.6.0 (Debian 12) is the floor until 2028-06-30; Ubuntu 24.04 ships 3.7.0 and Debian 13, Alpine and Fedora 43 ship 4.0.2. Not contested today; it moves to 4.0.2 in mid-2028, and to 4.2.1 when Ubuntu 26.04 is the oldest supported LTS in the fleet. Trend: upward in 2028.
- **Default flips announced and not made.** `test-require-arg` and `remove-percent-self` are "off 4.0" in `status features` through 4.9.3, and the CHANGELOG says "We intend to enable them by default in future, and after that eventually make them read-only" (4.0.0 l.870). The 4.0.0 `qmark-noglob` flip took 5 years from its 3.0 introduction. Trend: `test -n $x` becomes false for empty `$x` and `test foo` an error; the rules (SH-FISH-12, SH-FISH-24) are written to be correct before and after. As of 2026-10-11 no release has flipped either.
- **Unreleased master changes** (CHANGELOG head after 4.9.3, all run and failing on 4.9.3): `$(cmd)` accepted in command position; `command`/`builtin`/`exec`/`time` accept `--`; `functions --query` returns 0 if any named function exists (today: the count of missing names, row 28). Trend: they land in the next minor. Until a release with them is the floor, SH-FISH-25 bans them; `functions -q` with several names is not used (use one name per call).
- **The `||` fix (4.7.0).** `nosuch || rhs` ignoring `rhs` was a regression "from 3.2" fixed in 4.7.0. Practice splits: write `; or` forever (portable, no cost) or `||` once the floor is 4.7.0. This file takes the first.
- **Signal-handler exit status.** Whether `exit N` inside an `--on-signal` handler should produce N is not documented, and 4.9.3 still gives 0 for a signal sent to the pid. HUP re-raise gained 129 in 4.7.0 (not in the CHANGELOG entries read here; observed). Practice: do not promise a status other than 143 for TERM and 130 for a terminal Ctrl-C.
- **Retreat from universal variables.** 4.3.0 stopped setting theme universals and froze them into conf.d files; 4.8.0 stopped creating `__fish_initialized`; the CHANGELOG states "fish now only creates universal variables if instructed by the user." This supports SH-EMIT-17 and SH-FISH-16/17; trend: further.
- **Messages are localised and rewritten.** Error wording changed between 3.6.0 and 4.0.2 (the Rust port) and 4.8/4.9 moved messages to Fluent (`status language` prints `Fluent: en` on 4.9.3). Tests assert on status and on stdout, not on fish's error text.
- **`trap` versus events.** The docs call `trap` "a wrapper around the fish event delivery framework ... for backwards compatibility", recommending event handlers. This file uses events for the idiom and accepts `trap` where status loss does not matter.
- **Shebang `env -S`.** GNU, uutils (unverified) and macOS (unverified: read only) support it; busybox 1.37 does not. Practice: do not depend on it in scripts that run in Alpine.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst (also https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst) | fish release notes 3.0 to 4.9.3 and the unreleased head | read 2026-10-11; 4.9.3 is 2026-09-08 | primary; every "since" in F2 and the master-only list |
| https://fishshell.com/docs/current/language.html | the fish language reference (combiners, config files, events, feature flags, glob rules) | docs for 4.9.3 | primary; and/or trap, conf.d order and shadowing, feature-flag table |
| https://fishshell.com/docs/current/cmds/function.html | `function` and its `--on-event/--on-signal/--on-process-exit` | 4.9.3 | primary; "Observing a signal will prevent fish from exiting" |
| https://fishshell.com/docs/current/cmds/trap.html | `trap` as a wrapper around event delivery | 4.9.3 | primary; trap works on 3.6+, maps EXIT to `fish_exit` |
| https://fishshell.com/docs/current/cmds/status.html | `status features`, `test-feature`, `is-interactive` | 4.9.3 | primary; 0/1/2 return values |
| https://fishshell.com/docs/current/cmds/test.html | `test` and the one-argument form | 4.9.3 | primary; why to quote, `test-require-arg` |
| https://fishshell.com/docs/current/cmds/fish.html | `fish` invocation: `--no-execute`, `--no-config`, `--features`, `--debug` | 4.9.3 | primary; the gate flags |
| https://fishshell.com/docs/current/cmds/exit.html | `exit` | 4.9.3 | primary; "If exit is called while sourcing a file ... the rest of the file will be skipped" |
| https://fishshell.com/docs/current/cmds/begin.html | `begin ... end` and the `{ }` form | 4.9.3 | primary; compound command syntax |
| https://fishshell.com/docs/current/cmds/set.html | `set` scopes and erase | 4.9.3 | primary; `set -e` is erase |
| https://fishshell.com/docs/current/cmds/fish_add_path.html | `fish_add_path` | 4.9.3 | primary; universal default, `--path`, idempotence |
| https://fishshell.com/docs/current/fish_for_bash_users.html | fish for bash users | 4.9.3 | primary; no heredocs, `$?` is `$status` |
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/tests/checks/fish_exit.fish | upstream littlecheck test for `fish_exit` | master | primary; the event is tested upstream |
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/tests/test_driver.py | the test driver (scratch HOME, XDG) | master | primary; isolation model for SH-FISH-23 |
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/tests/littlecheck.py | the standalone littlecheck harness | master | primary; runs outside fish's build |
| https://github.com/fish-shell/fish-shell/tree/master/tests/checks (clone `fish-shell@ac50fe526f74`) | 215 littlecheck files | master 2026-10 | primary; `trap_print.fish`, `functions.fish:250-262`, `features-*.fish` |
| https://www.debian.org/releases/ | Debian release table (bookworm EOL 2026-07-11, LTS 2028-06-30) | 2026-10 | primary; fixes the end of the 3.6.0 floor |
| https://wiki.debian.org/LTS | Debian LTS schedule (12 bookworm, 2026-06-11 to 2028-06-30) | 2026-10 | primary; confirms the LTS window |
| https://www.shellcheck.net/wiki/SC1071 | SC1071: ShellCheck supports only sh/bash/dash/ksh | 0.11.0 era | primary; why ShellCheck is not a fish gate |
| `docker run debian:bookworm|debian:trixie|ubuntu:24.04|ubuntu:26.04 apt-cache policy fish`, `alpine:3.22|3.23 apk policy fish`, `fedora:43 dnf repoquery fish` | distro package indexes | queried 2026-10-11 | measured; the version window (F1) |
| https://github.com/ocx-sh/ocx (`ocx@c001637dd3ce`: `crates/ocx_shell/src/shell/hook.rs`, `escape.rs`; `crates/ocx_setup/src/shims.rs`, `profiles.rs`) | the fleet's multi-shell emitter | 2026-10 | fleet; hook idempotence, quoter, two defects |
| https://github.com/ocx-sh/www-setup (`www-setup@a251c3631047:src/install.fish`) | the fleet's fish installer, 650 lines | 2026-10 | fleet; exit-demotion work-arounds and the missing cleanup |
| https://github.com/astral-sh/uv (`uv@72e1fc88f354:crates/uv-virtualenv/src/activator/activate.fish`) | uv's activation script | 2026-10 | exemplar; the first-digit version idiom |
| https://github.com/jdx/mise (`jdx/mise@19e8c8f0d03d:src/shell/fish.rs`) | mise fish emitter | 2026-10 | exemplar; POSIX quoter reused for fish |
| https://github.com/direnv/direnv (`direnv@28a73d1df3f3:internal/cmd/shell_fish.go`) | direnv fish emitter | 2026-10 | exemplar; correct fish quoter |
| https://github.com/JanDeDobbeleer/oh-my-posh (`b0a8acd4d402:src/shell/fish.go`) | oh-my-posh fish quoter | 2026-10 | exemplar; `quoteFishStr` |
| https://github.com/starship/starship (`d4d0459c5c24:src/init/mod.rs`) | starship init | 2026-10 | exemplar; `shell_words::quote` for fish |
| https://github.com/ajeetdsouza/zoxide (`86b443cffcd7:templates/fish.txt`) | zoxide fish hook | 2026-10 | exemplar; named handlers on `fish_prompt` and PWD |
| https://github.com/jorgebucaran/fisher (`791da644d33d:functions/fisher.fish`) | fisher plugin manager | 2026-10 | exemplar; `mktemp -d` cleanup pattern and `emit` conventions |
| `shell-audit/emitters-compared.md`, `shell-audit/fleet-shell-shape.md`, `shell-audit/exemplar-shape.md` (this tree) | wave-1 audits | 2026-10-10 | the measured emitter, fleet and exemplar corpora cited by line |
| `shell-topic-map.md`, `shell-frame.md` (this tree) | the frame and topic map (rows M-J-01..07, W3-4) | 2026-10-10/11 | binding decisions and H9 |
| `shell-emit.md`, `shell-errexit.md`, `shell-gate.md` (this tree) | wave-2 consolidations | 2026-10-11 | SH-EMIT-02/17/26, SH-ERR-15..18, SH-GATE-09/11 cited, not restated |
