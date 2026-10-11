---
title: "Completion registration, directory-change and pre-exec hooks, and the cmd.exe Batch corpus"
topic: "emit/completions-and-dir-hooks (wave 3 of shell-emit.md), topic-map rows M-M-17, W2-11, W2-12; rule family SH-EMIT, new rules SH-EMIT-33 onward (SH-EMIT-01..32 unchanged)"
agent: "w3-emit-completions-and-dir-hooks"
model: sonnet
date_researched: 2026-10-11
sources_count: 28
fixtures: "/home/mherwig/.cache/research-lang/shell-tools/fixtures/completions-and-dir-hooks/"
scope: |
  Covers (Q1) where a completion script can be installed per shell without editing the user's rc and how "registered" is proven in a real interpreter (bash, zsh, fish, nu, elvish,
  PowerShell including -NativeFallback from 7.6), plus two properties of generated completion scripts that Q1 exposed (help-text injection, non-ASCII bytes);
  (Q2) which directory-change and pre-exec hook points an emitter can use without breaking bash-preexec 0.5 / 0.7, ble.sh or a user's own hooks, each run through the
  SH-EMIT-24..29 harness (user hook present, sourced once and twice); (Q3) the cmd.exe Batch arm: the minimum hostile corpus for SET "K=v" and the refusal predicate.
  Does not cover quoting per target (quoting-contract.md), rc-file editing (rc-and-hooks.md), prompt theming, or fixing ocx or grim: defects are reported with file:line and a reproducer.
  No macOS host: every macOS or BSD claim is "unverified: read only". All dates are 2026-10-11 and every claim carries a version.
---

# Completion registration, directory-change and pre-exec hooks, and the cmd.exe Batch corpus

Notation. `FC` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/completions-and-dir-hooks/`. `matrix.sh` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`.
A matrix.sh run prints one `== <interpreter>` block per version and ends with its own wrapper `-> exit 0`; the exit code that counts is the one inside each block.
`ocx@5de9d777eb7d` and `grim@4650ad830375` are the read-only exemplar trees. Rule numbers continue shell-emit.md (SH-EMIT-01..32 stay as they are).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1 Completion install locations per shell (Q1)
   - 2 Proving "registered" in a real interpreter (Q1)
   - 3 A completion script is code: injection and encoding (Q1)
   - 4 Directory-change hooks per shell (Q2)
   - 5 Pre-exec hooks per shell (Q2)
   - 6 Bash coexistence: DEBUG trap, PS0, bash-preexec, ble.sh (Q2)
   - 7 The cmd.exe Batch arm (Q3)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **bash**: a completion file at `${BASH_COMPLETION_USER_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion}/completions/<cmd>` is lazy-loaded on first TAB with no rc edit, measured on bash-completion 2.11 (Ubuntu 24.04) and 2.16.0 (Debian 13); `~/.bash_completion.d/` and a plural `bash-completions/` are never read (red). It needs bash-completion itself to be loaded by the user's skeleton.
- **bash, eager fallback**: the clap_complete bash script is self-contained; `complete -p` plus calling the registered function gave 36 candidates on all eight bash versions 3.2.57 to 5.3.20, and a truncated script fails on all eight.
- **zsh has no zero-rc user location.** A file `_<cmd>` works only in a directory already on `$fpath` before `compinit` (Ubuntu 24.04 zsh 5.9-6ubuntu2: `/usr/local/share/zsh/site-functions`, needs root). `fpath` set after `compinit`, no `fpath`, and sourcing before `compinit` (`compdef: command not found`) are red on zsh 5.0.8, 5.3.1, 5.8 and 5.9.
- **zsh, rc-sourced form**: ocx's guard prefix (`(( ! $+functions[compdef] )) && autoload -Uz compinit && compinit -C`, ocx@5de9d777eb7d:crates/ocx_cli/src/command/shell_completion.rs:81-88) registers on all four zsh versions, also when the user's own `compinit` runs afterwards.
- **fish**: `~/.config/fish/completions/<cmd>.fish` and `~/.local/share/fish/vendor_completions.d/<cmd>.fish` work; the singular `completion/` never does (0 candidates on 3.6.0, 4.0.2, 4.7.0, 4.9.3). Fish 3.6.0 and 4.0.2 load a completion only when the command resolves on `PATH`; 4.7.0 and 4.9.3 load it regardless.
- **nu has no completion directory.** Two forms register: an `export extern` module in an `autoload` dir (`scope externs` shows it on 0.105.1 and 0.116.0), or a closure that chains the single `$env.config.completions.external.completer` slot. Assigning the slot drops the user's completer (red on both versions). clap_complete has no nushell backend.
- **elvish**: only `rc.elv` registers (`eval (slurp < file)`); `lib/` is not autoloaded (0 candidates). **PowerShell**: `Register-ArgumentCompleter -Native -CommandName` on every version; `-NativeFallback` exists on 7.6.6 only, is one session-wide slot (a tool registering it displaced the user's), and throws on 7.4.7 and Windows PowerShell 5.1.
- **clap_complete 4.6.8 (ocx) and 4.6.9 (grim) execute attacker-shaped help text in PowerShell.** `escape_string` (clap_complete@715b812f3b72:clap_complete/src/aot/shells/powershell.rs:64-67) doubles `'` and U+2019 but not U+2018, U+201A or U+201B; a help string `x‘+(Set-Content ...)+‘y` created a file on pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1. Escaping all four closes it. fish, elvish and zsh scripts held against the same payloads; their unescaped plants ran.
- **grim's `completions powershell` output is not ASCII** (66 em dashes, one U+2192, two U+21D2); on Windows PowerShell 5.1 `Get-Content -Raw | Invoke-Expression` fails to load it (UTF-8 byte 0x92 of U+21D2 decodes as U+2019). ocx's PowerShell and zsh scripts are ASCII and load.
- **Directory-change hooks**: zsh `add-zsh-hook chpwd`, fish `--on-variable PWD`, nu `env_change.PWD` (list append with a marker), elvish `$after-chdir`, PowerShell 7.x `LocationChangedAction` through `[Delegate]::Combine/Remove` (`+=` throws), and a prompt wrap on 5.1 (no such property). Each passes the user-hook-present, once-and-twice harness; each wholesale assignment, `precmd_functions=(...)` style plant, and every `cd` wrapper (sees 2 of 4 changes: `pushd`/`popd` bypass) fails.
- **bash has no directory event.** A `PROMPT_COMMAND` string compare passed 60 of 60 pty scenarios (bash 3.2 to 5.3 with bash-preexec 0.5.0 and 0.7.0) and 27 of 27 non-pty ones, but it is **lost under ble.sh 0.4.0-nightly+d81fd54 when sourced after `ble-attach`** (4 of 6 runs, ble.sh@d81fd54:ble.sh:22002-22027 moves `PROMPT_COMMAND` aside); `blehook CHPWD+=` passed 6 of 6.
- **bash pre-exec**: a `DEBUG` trap chained in front of the existing one, passing `"$_"` and restoring it, passes everywhere except (a) a later plain `trap ... DEBUG` by the user (unfixable), (b) bash 5.3 + bash-preexec 0.7.0 (fires twice: 0.7.0 moves to `PS0` on 5.3, bp-0.7.0.sh:465-469) and (c) ble.sh (30 firings against 6). Loaded by `. file` instead of `eval`, `trap -p DEBUG` is blind and the user's trap is dropped. The registries (`preexec_functions`, `blehook PREEXEC`) avoid (b) and (c).
- **Neither `PS0` before 4.4 nor `PreCommandLookupAction` is a per-line hook**: `PS0` is absent on bash 3.2 and 4.2; `PreCommandLookupAction` fired 5 times for one typed line on pwsh 7.4.7, 7.6.6 and 5.1. nu's `env_change.PWD` fires at the next REPL cycle (order `inside ours_dir after`), not between statements of one line.
- **cmd.exe**: ocx's refusal set (`% " LF CR`, shell.rs:610-612) leaves 62 of 186 admitted runs wrong on the real host (`!` under delayed expansion, NUL, Ctrl-Z, non-ASCII at the default OEM code page, a statement past about 8191 characters, empty value). Adding `! NUL Ctrl-Z`, empty, non-ASCII and over-length to the predicate gave 0 of 102 failing. Doubling `%` is correct only inside a batch file and corrupts `stdin` and `FOR /F` input.
- 26 verifications were watched red on a plant and green on a twin (list under Verification runs). Open or unverified: macOS, nu on Windows, the full ble.sh release (nightly measured), Windows 11 "UTF-8 system locale" for cmd.

## Findings

### 1. Completion install locations per shell (Q1)

All 2026-10-11. "Zero-rc" means the install writes only files in a directory the shell already searches.

| Shell (versions measured) | Zero-rc location that works | Needs | Does not work (measured) |
|---|---|---|---|
| bash 3.2 to 5.3 | `<userdir>/completions/<cmd>` with `<userdir>` = `${BASH_COMPLETION_USER_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion}`, lazy on first TAB; or the eager file `~/.bash_completion` ([bash-completion README](https://github.com/scop/bash-completion/blob/main/README.md) lines 150-156, 172-176; bash_completion main@2.18.0:3676, 3773) | bash-completion 2.x loaded by the user's rc or the distro skeleton (2.11 and 2.16.0 measured) | `~/.bash_completion.d/<cmd>`, `.local/share/bash-completions/<cmd>` (plural) |
| zsh 5.0.8, 5.3.1, 5.8, 5.9 | none under `$HOME`. System dirs already on `$fpath`: Ubuntu 24.04 zsh 5.9-6ubuntu2 has `/usr/local/share/zsh/site-functions` first and `/etc/zsh/zshrc:106-112` runs `compinit` | root; or an rc line | a user dir that is on no `fpath`; `fpath` extended after `compinit`; script sourced before `compinit` |
| fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | `~/.config/fish/completions/<cmd>.fish`, `~/.local/share/fish/vendor_completions.d/<cmd>.fish` ([fish 4.9 completions](https://fishshell.com/docs/4.9/completions.html)); lazy by command name | on 3.6.0 and 4.0.2 the command must resolve on `PATH` | `~/.config/fish/completion/` (singular) |
| nu 0.105.1, 0.116.0 | `export extern` module in a `vendor/autoload` or `autoload` directory (`scope externs` lists it); or chain the `external.completer` slot ([Custom Completions](https://www.nushell.sh/book/custom_completions.html)) | for the chain: normalise the user's value, then wrap | assigning `$env.config.completions.external.completer` |
| elvish 0.21.0 | none. `rc.elv` must `eval (slurp < file)` ([command ref](https://elv.sh/ref/command.html)) | an rc line | `~/.config/elvish/lib/<cmd>.elv` (not loaded: 0 candidates) |
| PowerShell 7.4.7, 7.6.6, Windows PowerShell 5.1 | none. A profile line runs `Register-ArgumentCompleter -Native -CommandName <cmd>` ([cmdlet doc](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter)) | a profile line | `-NativeFallback` on 7.4.7 and 5.1 (throws "Parameter set cannot be resolved") |

Notes that change what an emitter does.

- **bash**: the clap_complete bash script (`grim completions bash`, 97.8 KB) is self-contained. Sourcing it alone, without bash-completion, registers `_grim` (`complete -p` shows `-F _grim`) on every bash from 3.2.57 to 5.3.20, so the eager rc form works where the lazy dir does not.
- **zsh**: a zero-rc user location does not exist. The two honest options are a root-owned site dir (Debian/Ubuntu default `fpath`; Homebrew `$(brew --prefix)/share/zsh/site-functions` is unverified: read only) or an rc/`eval` form carrying the guard prefix. Measured on all four versions: guard prefix then the file registers; guard prefix then the user's later `compinit` keeps it; `compdef` after `compinit` keeps it through a second `compinit`.
- **fish**: "regardless of PATH" changed between 4.0.2 and 4.7.0 on this host (cause not traced). An emitter that installs while the binary is not yet on `PATH` must expect no completion on 3.6.0 and 4.0.2 until the next shell.
- **nu**: the two forms do not conflict. The `extern` form is per command, owns no slot, and survives a user's completer. The completer form is only needed when dynamic candidates are required; then it must wrap the user's closure and fall through to it (twin: `ours=sub,help` and `user=user-cand` both answered; plant: the user's answer gone).
- **elvish**: `$edit:completion:arg-completer` is only defined in an interactive session. `edit:` is absent without a TTY, so the same rc line must be guarded (`try { eval ... } catch e { }` registered 36 candidates, as did the bare `eval`).
- **PowerShell**: `-NativeFallback` is one slot per session. On 7.6.6 a tool that registered it after the user's fallback replaced it (`userFallbackServes=[toolfb]`). `-Native -CommandName` is per command and stable when the script is evaluated twice (36 matches once and twice on pwsh 7.6.6 and Windows PowerShell 5.1; fish 24 and 24).

### 2. Proving "registered" in a real interpreter (Q1)

File existence proves nothing: every plant above has the file on disk. The proof is a read-back from the live engine, plus at least one candidate.

| Shell | Read-back | Candidate proof |
|---|---|---|
| bash | `complete -p <cmd>` is non-empty and names `-F fn` | call `fn` with `COMP_WORDS=(cmd "")`, `COMP_CWORD=1`, expect `COMPREPLY` non-empty (`FC/comp/bash/register.sh`); and a real TAB TAB in a pty (`FC/comp/bash-loc/loc.sh`) for the lazy dir |
| zsh | `${_comps[<cmd>]}` is non-empty after the startup files ran | real TAB in a pty for the system dir (`FC/comp/zsh/loc.sh`) |
| fish | `complete -C '<cmd> '` from a fresh `fish -c`, cwd an empty dir, offers the subcommand | real TAB in a pty (`FC/comp/fish/loc-pty.sh`) |
| nu | `scope externs \| where name == <cmd>` has a row; or `do $env.config.completions.external.completer [<cmd> ""]` returns the candidates | read inside an interactive pty (config and autoload are read only there) |
| elvish | `has-key $edit:completion:arg-completer <cmd>` and calling it | read inside an interactive pty |
| PowerShell | `TabExpansion2 -inputScript '<cmd> ' -cursorColumn N` returns `CompletionMatches` | the same call; `Get-Command` alone is not enough |

The harness is differential: each check has a plant (the location or form that must not count) that exits 1 and a twin that exits 0, run in a throwaway `HOME` (SH-EMIT rc tests).

### 3. A completion script is code: injection and encoding (Q1)

Every completion script is evaluated by the user's shell at each start (`eval`, `source`, `Invoke-Expression`). Its text is generated from help strings, so the help strings are an input to an emitter.

**Injection through help text.** `FC/clapgen/` builds scripts from a clap `Command` whose help text carries a hostile string, using the same `clap_complete =4.6.9` as grim (grim's `Cargo.lock` pins 4.6.9; ocx@5de9d777eb7d pins 4.6.8 with the identical `escape_string`).

- PowerShell (`FC/comp/pwsh/inject.ps1`): `escape_string` is `string.replace('\'', "''").replace('’', "'’")` (clap_complete@715b812f3b72:clap_complete/src/aot/shells/powershell.rs:64-67). PowerShell treats U+2018, U+2019, U+201A and U+201B as single quotes. Only U+2019 is handled. With a help string of the form `x‘+(Set-Content -LiteralPath pwned.txt -Value PWNED)+‘y`, `pwned=True` on pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1 for U+2018, U+201A and U+201B; `pwned=False` for the ASCII control and for U+2019; `pwned=False` for all three on the `fixed-*` scripts that escape every quote character.
- fish, elvish, zsh: the `sq` and `nested` corpora (single quote, nested quoting, backtick, `$(...)`, backslash, bracket, double quote variants exist under `FC/comp/inject/gen-*-*.txt`) did not run on fish 3.6.0 to 4.9.3, elvish 0.21.0 or zsh 5.0.8 to 5.9. Their hand-built unescaped `PLANT` variants did, so the harness has teeth.
- Reach: the exploit needs an attacker-influenced help string. For a CLI whose strings are all compiled in, the exposure is a contributor-supplied doc comment. For any `clap::Command` built at run time from external data (names or descriptions from a registry, a plugin, a manifest), it is a supply-chain surface.

**Encoding.** `grim completions powershell` contains 66 U+2014, one U+2192 and two U+21D2 (counted from `FC/comp/gen/grim.powershell`; sources grimoire@4650ad830375:src/cli/options.rs:96 and :213, src/command/add.rs:76). Windows PowerShell 5.1 decodes a BOM-less file as the ANSI code page (cp1252): U+21D2 is `E2 87 92`, byte `0x92` becomes U+2019, a string terminator. Result on 5.1.26100.9444: `Get-Content -Raw | Invoke-Expression` gives `loaded=False`; the README route (native command piped to `Out-String`) loads but leaves a mojibake tooltip (`non-ascii-tooltips=1`). `FC/comp/gen/ocx.powershell` and `ocx.zsh` are ASCII-only and load (47 tooltips, 0 non-ASCII). `grim.zsh` and `grim.fish` and `grim.elvish` also hold non-ASCII; only PowerShell 5.1 was shown to break.

### 4. Directory-change hooks per shell (Q2)

Harness (SH-EMIT-24..29): a user hook is installed first; the impl is applied once or twice; a scripted session changes directory; the judge compares every user token's count with the baseline run without the impl and requires the impl's own token to fire exactly once per directory change. The scripts are under `FC/hooks/<shell>/` and judged by `FC/hooks/judge-gen.py`, `judge-bash.py`, `judge-dir4.py`, `judge-ble.py` and `nu/judge.py`.

| Shell | Twin (passes) | Plants (fail) | Result |
|---|---|---|---|
| zsh 5.0.8, 5.3.1, 5.8, 5.9 | `autoload -Uz add-zsh-hook; add-zsh-hook chpwd fn` ([zsh Functions](https://zsh.sourceforge.io/Doc/Release/Functions.html#Hook-Functions)) | define `chpwd()`; `chpwd_functions=(fn)`; `chpwd_functions+=(fn)` sourced twice; a `cd` wrapper | twin 16 of 16 green; def 8 failing, assign 4, append 4 (doubles), cd wrapper 16 of 16 (`ours_dir` 2, want 4) |
| fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | `function __x_dir --on-variable PWD` ([fish language](https://fishshell.com/docs/4.9/language.html)) | `function cd` wrapper; `fish_prompt` compare | twin 12 of 12 green; cd wrapper 12 of 12 failing (2 of 4); prompt compare misses one change on 3.6.0 and 4.0.2 (3, want 4) |
| nu 0.105.1, 0.116.0 | normalise `$env.config.hooks.env_change.PWD` to a list, drop closures whose source holds the marker (`view source $h`), append ([Hooks](https://www.nushell.sh/book/hooks.html)) | assign a list; append with no marker | twin 6 of 6 green; clobber 4 failing (user hooks 0); append 2 failing (doubles when two autoload files carry it) |
| elvish 0.21.0 | append to `$after-chdir` a closure with a marker rest-arg name `{\|@__x_marker ...}` ([builtin](https://elv.sh/ref/builtin.html)) | assign; append without marker | twin 3 of 3 green; clobber 2 failing; append 1 failing |
| PowerShell 7.4.7, 7.6.6 | `LocationChangedAction`: `[Delegate]::Remove` our previous delegate, then `[Delegate]::Combine` | assign; `+=` | twin green with `-Twice`; assign: user handler ran 0 times (want 4); `+=` throws "Method invocation failed ... op_Addition" |
| Windows PowerShell 5.1 | prompt wrap with a `$PWD` compare and a marker in the body | n/a | `LocationChangedAction` absent; prompt twin `ours=4`, also with `-Twice` |
| bash 3.2 to 5.3 | `PROMPT_COMMAND` string (or `[0]`) extended by one string, `$PWD` compared with the last value, `$?` preserved | `PROMPT_COMMAND=fn`; `cd` wrapper | pty: twin 60 of 60 green, clobber 22 of 60 failing; non-pty `bash -i`: twin 27 of 27, clobber 19 failing, cd wrapper 27 failing (2 of 4: `pushd`/`popd`) |
| bash under ble.sh | `blehook CHPWD-=fn; blehook CHPWD+=fn` when `BLE_VERSION` is set | `PROMPT_COMMAND` extended after `ble-attach` | blehook 6 of 6 green; `PROMPT_COMMAND` form 4 of 6 failing (`ours_dir` 0) |

Why the bash form is lost under ble.sh: `ble-edit/adjust-PS1` copies `PROMPT_COMMAND` into `_ble_edit_PROMPT_COMMAND` and runs `unset -v PROMPT_COMMAND` (ble.sh@d81fd54:ble.sh:22002-22016); `ble-edit/restore-PS1` writes the copy back (22023-22027), discarding anything appended in between. Sourced before `ble-attach` the append is inside the copy and survives (2 of 2 green).

One cost no bash twin avoids: a user's `DEBUG` trap fires for every command inside `PROMPT_COMMAND`, so any prompt hook doubles it (`user_dbg` x10 against x5 in the baseline). This is why the judge excludes the `userdebug` environment for the directory kind, and why a hook body must be one function call.

nu timing (observation, `FC/hooks/nu/timing.sh`, nu 0.105.1 and 0.116.0): typing `cd /tmp; print inside` gives `inside ours_dir after`, so `env_change.PWD` fires at the next REPL cycle. Code later on the same line sees the old hook state.

### 5. Pre-exec hooks per shell (Q2)

| Shell | Pre-exec point | Twin | Notes (measured) |
|---|---|---|---|
| zsh | `preexec` | `add-zsh-hook preexec fn` | same results as the directory row: 16 of 16 green, plants fail |
| fish | `fish_preexec` event ("right before executing an interactive command", [fish language](https://fishshell.com/docs/4.9/language.html)) | `function __x_pre --on-event fish_preexec` | twin 12 of 12; a `fish_prompt` plant has no pre-exec point (`ours_pre` 0, want 7) |
| nu | `$env.config.hooks.pre_execution` | list append with marker | twin 6 of 6; same plants as the directory row |
| elvish | `$edit:after-readline` (interactive only) | append with marker rest-arg | twin 3 of 3 |
| PowerShell | none per line | prompt wrap for pre-prompt; no pre-exec | `PreCommandLookupAction` fired 5 times for one typed line (`Invoke-Expression,Get-Date,Out-Null,Write-Output,Out-Null`) on 7.4.7, 7.6.6 and 5.1: per command lookup, not per line |
| bash | `PS0` (4.4+), `DEBUG` trap, or the registries | see section 6 | the only shell where the safe form depends on what else is loaded |

### 6. Bash coexistence: DEBUG trap, PS0, bash-preexec, ble.sh (Q2)

Setup: a real pty (`FC/hooks/run-pty.sh`, docker `bash:3.2 4.2 4.4 5.0 5.3`), five environments (none; a user `trap 'echo ...' DEBUG`; a user `PS0`; bash-preexec 0.5.0 with user hooks; bash-preexec 0.7.0 with user hooks), three orders (impl before the user's setup, after it, sourced twice), session `cd /`, `cd /tmp`, `: argA`, `echo "$_"`. 75 scenarios per impl. Pass = every baseline token fires as often as without the impl, `$_` seen by the user is unchanged (`US=argA`), and `ours_pre` fires once per typed line.

| Impl (loaded by `eval "$(cat file)"`) | Failing cells | What those cells are |
|---|---|---|
| DEBUG chain: `trap "__x_pre \"\$_\"${old:+; $old}" DEBUG`, `__x_pre` ends with `: "$saved_underscore"` | 8 of 75: user-DEBUG + ours-first on 5 versions; bash 5.3 + bash-preexec 0.7.0 on 3 orders | ours-first: the user's later plain `trap` replaces ours (not fixable); 5.3 + 0.7.0: `ours_pre` x10, want 5 |
| DEBUG chain, bash-preexec aware (use `preexec_functions` when `bash_preexec_imported` is set) | 6 of 75: user-DEBUG + ours-first on 5 versions; 5.3 + 0.7.0 ours-first | the same two classes minus the ours-last 0.7.0 cells |
| DEBUG append (`old; ours`) and prepend without `"$_"` | 48 and 38 of 75 | `$_` seen by the user's later commands is `FIRED` instead of `argA` (`US=argA x0`), on every environment |
| `PS0` append (`PS0=${PS0-}'$(: marker; ours >&2)'`) | 4.4, 5.0, 5.3: only user-PS0 + ours-first (3 cells); 3.2 and 4.2: all (no `PS0`) | a later plain `PS0=` by the user; `PS0` was added in bash 4.4 (NEWS) |
| `DEBUG` assigned (`trap fn DEBUG`) | 48 of 75 | user trap lost; `$_` lost |
| `PS0` assigned (`PS0='...'`) | 39 of 75 | user `PS0` lost when ours comes last (`user_ps0` x0) |

Three causes recur.

1. **`$_`.** A trap function runs commands, and `$_` after the trap is the last argument of the last of them. bash-preexec passes `"$_"` in and restores it. Without that the user's `echo "$_"` printed `FIRED`.
2. **Where the file is loaded.** `trap -p DEBUG` returns an empty string inside a file loaded with `.` (verified by a `FC` micro-test: `a=[] b=[] c=[]` inside the dotted file against `o1="echo FIRED:user_dbg"` at the rc's top level), because bash clears the DEBUG trap while a nested sourced file runs unless `functrace` is on. A twin that reads the old trap with `trap -p` therefore saw nothing and installed itself over the user's. Loaded as `eval "$(...)"` at the rc's top level (how an emitter's output is normally consumed) the same text kept the user's trap: bash 4.4, user DEBUG trap, ours last: dotted `ours_pre ours_pre ours_pre ours_pre US=argA ours_pre` (user trap gone); eval `ours_pre user_dbg ours_pre user_dbg ... US=FIRED ours_pre user_dbg` (both fire; `US=FIRED` is the baseline's own value).
3. **bash 5.3 changes bash-preexec.** bash-preexec 0.7.0 uses `PS0` (a `${ ...; }` funsub) when `BASH_VERSINFO >= 5.3` and the `DEBUG` trap otherwise (bp-0.7.0.sh:465-469, installing the trap at :429-441, saving a prior trap as `__bp_original_debug_trap`). On 5.3 the `DEBUG` trap also fires for the commands inside that funsub, so an emitter's own `DEBUG` trap fires twice per command.

Under **ble.sh 0.4.0-nightly+d81fd54** (bash 5.2.21, `FC/hooks/bash/case-ble.sh`, 2 repeats x 3 orders): baseline `user_pre` x6, `user_dir` x1 (the container starts in `/`, so `cd /` is a no-op and `cd /tmp` is the one change). `blehook PREEXEC+=`/`CHPWD+=`: `ours_pre` x6, `ours_dir` x1 in all 6 runs. The DEBUG chain: `ours_pre` x30 (ble.sh runs its own `DEBUG` machinery) in 6 of 6. The `PS0` form: x6, 6 of 6 (ble.sh leaves `PS0` alone). The `PROMPT_COMMAND` directory form: see section 4.

Net bash recommendation: do not own a pre-exec hook unless the feature needs it. If it does: `blehook` under ble.sh; `preexec_functions` under bash-preexec; else a `DEBUG` chain loaded by `eval`, ours first, `"$_"` restored; `PS0` only on bash 4.4 or later.

### 7. The cmd.exe Batch arm (Q3)

Method. `FC/batch/matrix.py` writes a probe for each corpus value in each of four **channels** and four **modes**, runs it with `cmd.exe /c` from a `C:` working directory on the Windows host (WSL2, Windows 11 build 26100), reads the variable back byte-exact, and classifies the run as `.` (exact), `x` (corrupt), `P` (a planted `copy nul pwned.txt` ran) or `-` (variable unset). Channels: `file` (a `.bat` file), `stdin` (lines piped to `cmd`), `forf-file` and `forf-stdin` (`FOR /F` over a file or over stdin, which is how ocx applies `ocx --global env`, see shell.rs:608). Modes: delayed expansion off/on x code page 437/65001. A value is attempted as `SET "XCDHK=<value>"`. 43 values (`CASES` in `matrix.py`). Retries only `NOVAR` (a `cmd.exe` launch through WSL interop sometimes yields no output file under load), up to 3.

Selected rows of `FC/batch/matrix-table.txt` (the `ocx` rows double `%` as `batch_set_value` does; the `raw` rows do not). Each cell is four characters, one per mode in the order (off,437)(off,65001)(on,437)(on,65001):

```
columns: file | stdin | forf-file | forf-stdin ; . ok  x corrupt  P executes  - unset/dropped
raw  pct-var     xxxx xxxx .... ....
ocx  pct-var     .... xxxx xxxx xxxx
raw  bang-var    ..xx ..xx ..xx ..xx
raw  caret-bang  ..xx ..xx ..xx ..xx
raw  dq-inject   PPPP PPPP .... ....
raw  lf          PPPP PPPP PPPP PPPP
raw  cr          xxxx xxxx .... ....
raw  nul         xxxx xxxx ---- ----
raw  ctrlz       xxxx xxxx .... ....
raw  cjk         x.x. xxxx x.x. x.x.
raw  len-7900    .... .... .... ....
raw  len-8300    ---- ---- ---- ----
raw  empty       ---- ---- ---- ----
```

Reading it.

- **`%`**: doubling (`%%`) is right only in a batch file; on `stdin` and `FOR /F` input `%` is not special and the doubled form is stored literally (`ocx pct-var` is `xxxx` in 12 of 12 non-file cells). Undoubled it is right in the other three channels and wrong in the file. A value with `%` therefore has no single correct form; refusing it (as ocx does) is correct unless the channel is fixed. The percent-doubling reason is a batch-parser rule ([SS64](https://ss64.com/nt/syntax-percent.html)).
- **`!`**: corrupt in every channel whenever delayed expansion is on (`bang`, `bang-var`, `bang-pair`, `bang-path`, `caret-bang`). Delayed expansion can be on by `cmd /v:on` ([cmd](https://learn.microsoft.com/windows-server/administration/windows-commands/cmd)) or the user's registry default (unverified: not exercised), so an emitter cannot know. `^!x` does not help (still corrupt with delayed expansion on). Refuse.
- **`"`**: in the `file` and `stdin` channels `x" & copy nul pwned.txt & echo "` ran the planted command (`P`). `dq-only` (a lone `"`) survives, but a value that closes its own quote cannot be expressed.
- **LF** ran the injected command in all 16 cells; **CR** truncates in `file` and `stdin`. Refuse both.
- **NUL** corrupts `file` and `stdin` (the readback of `a` + NUL + `b` was `achcp 65001>nul`, apparently the harness's next line) and drops the variable in `FOR /F`. **Ctrl-Z (U+001A)** truncates in `file` and `stdin`. Refuse both.
- **Non-ASCII** (`café`, CJK, an emoji, curly quotes, NBSP): corrupt at the default OEM code page 437 in `file`, `forf-file`, `forf-stdin`; correct only after `chcp 65001` (mode 2 and 4) and corrupt in `stdin` at every code page. ocx emits no `chcp` (`git grep -e chcp -e 65001` over `crates/` at ocx@5de9d777eb7d: no match). A statement that changes the console code page is a side effect on the user's session ([SS64 CHCP](https://ss64.com/nt/chcp.html)); refusing non-ASCII is the conservative choice.
- **Length**: 7900 characters survive; 8300 are dropped (the variable ends unset) in all 16 cells. cmd's documented limit is 8191 characters per command line and per environment variable ([Microsoft](https://learn.microsoft.com/troubleshoot/windows-client/shell-experience/command-line-string-limitation)); the twin refuses a statement over 8000.
- **Empty**: `SET "K="` unsets the variable (`-` everywhere). Not corrupt, but not "set to empty"; refuse or document "empty means unset", as for PowerShell (shell-emit.md owner decision 2).
- **Inert in quotes**: `a&b|c<d>e(f)g`, a trailing `)`, `;`, `,`, `*`, `?`, tab, trailing spaces, leading `=`, `/?`, DEL and backslash-final are exact in all 16 cells. `a^b`, `a^`, `a^^b` are exact too: caret is literal inside the quoted `SET`, matching escape.rs:49.

The **minimum hostile corpus** that separates the predicates above is 18 values: `plain`, `eq` (`a=b=c`), `pct-var` (`%PATH%`), `bang-var` (`!PATH!`), `caret-bang` (`^!x`), `dq-inject`, `lf`, `cr`, `nul`, `ctrlz`, `latin` (`café`), `cjk`, `meta` (`a&b|c<d>e(f)g`), `paren-end`, `trail-ws`, `len-7900`, `len-8300`, `empty`. The other 25 are variants that did not separate anything new.

**Refuse list** (value cannot be expressed by `SET "K=v"` on this host): `%`, `"`, LF, CR (ocx's current set), plus `!`, NUL, U+001A, the empty string, any non-ASCII byte (unless the emitter also emits a restoring `chcp 65001` and the channel is not `stdin`), and a statement longer than 8000 characters.

Verification (`FC/batch/check.py`): for every value the predicate admits, attempt it raw in `file`, `forf-file` and `forf-stdin` x delayed expansion off/on at code page 437, require a byte-exact round trip. Plant = ocx's predicate: 31 of 43 values admitted, 186 runs, **62 failing** (bang 12, nul 6, ctrlz 2, latin/cjk/emoji/curly/nbsp 30, len-8300 6, empty 6). Twin = the refuse list: 17 of 43 admitted, 102 runs, **0 failing**.

## Normative guidance candidates

Format: rule, rationale, how verified, red or green. IDs `Vnn` refer to the Verification runs section. "Red" = the plant exits non-zero (or prints a violation); "green" = the twin exits 0.

**SH-EMIT-33 (MUST). Prove a completion is registered by reading it back from the live engine, never by file existence.** Per shell: bash `complete -p <cmd>` plus a call of the named function; zsh `${_comps[<cmd>]}`; fish `complete -C '<cmd> '` from a fresh `fish -c`; nu `scope externs` or a call of the completer; elvish `has-key $edit:completion:arg-completer <cmd>` and a call; PowerShell `TabExpansion2`. Rationale: every plant location (`.bash_completion.d`, a zsh dir on no `fpath`, `fish/completion/`, `elvish/lib/`) had the file on disk and registered nothing. Verified: V01 to V06. Red: plants exit 1 on every row; green: twins exit 0.

**SH-EMIT-34 (MUST). Install bash completions at `${BASH_COMPLETION_USER_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion}/completions/<cmd>`; fall back to an eager `source`/`eval` line when bash-completion is not loaded.** Rationale: lazy per-command load needs no rc edit but needs bash-completion 2.x loaded; the generated script is self-contained and registers alone on bash 3.2.57 to 5.3.20. Verified: V01 (2.11, 2.16.0, plants red) and V02 (8 versions, truncated script red). Never use `~/.bash_completion.d/` or a plural directory.

**SH-EMIT-35 (MUST). For zsh install `_<cmd>` only into a directory that is on `$fpath` before `compinit`, or emit the guard form; never extend `fpath` after `compinit` and never call `compdef` before it.** Guard form: `(( ! $+functions[compdef] )) && autoload -Uz compinit && compinit -C` ahead of the script. Rationale: `fpath-late`, `nofpath` and `source-before` registered nothing on 5.0.8 to 5.9; the guard prefix, with or without the user's later `compinit`, registered on all four. A zero-rc user-scope zsh location does not exist: say so and print the rc line instead. Verified: V03.

**SH-EMIT-36 (MUST). Install fish completions as `<dir>/completions/<cmd>.fish` (user) or `vendor_completions.d/<cmd>.fish`; the file name is the command name, the directory name is plural.** Expect nothing on fish 3.6.0 and 4.0.2 until the command resolves on `PATH`. Rationale: `completion/` loaded 0 of 8 times; 3.6.0 and 4.0.2 returned 0 without a `PATH` stub and 1 with. Verified: V04 (real TAB on 4.7.0 and 4.9.3 green; 3.6.0 and 4.0.2 red as predicted).

**SH-EMIT-37 (SHOULD). For nu register per-command completions as an `export extern` module in an `autoload` directory; when a dynamic completer is required, normalise and wrap the existing `external.completer` and fall through to it, never assign.** Rationale: the slot is single; assigning it dropped the user's completer on 0.105.1 and 0.116.0. clap_complete has no nushell backend (the generation attempt for ocx with `--shell nushell` was rejected: "possible values: bash, elvish, fish, powershell, zsh", `FC/comp/gen/ocx.nushell.err`), so the extern text is the emitter's own. Verified: V05.

**SH-EMIT-38 (SHOULD). For elvish register only through `rc.elv` (`eval (slurp < file)` wrapped in `try`), because `lib/` is not loaded and `edit:` does not exist without a TTY.** Rationale: `lib-only` and `noop` gave 0 candidates, `rc-eval` and `rc-eval-try` gave 36. Verified: V06.

**SH-EMIT-39 (MUST). For PowerShell register with `Register-ArgumentCompleter -Native -CommandName <cmd>`; use `-NativeFallback` only behind a version probe and only if no fallback is set.** Rationale: one slot per session; on 7.6.6 the tool's registration displaced the user's; on 7.4.7 and 5.1 the parameter throws. Evaluating the script twice leaves the match count unchanged. Verified: V07 (plant red on 7.4.7, 7.6.6, 5.1; twin green) and V10 (twice, no plant).

**SH-EMIT-40 (MUST). Generated completion scripts are ASCII-only.** Rationale: Windows PowerShell 5.1 reads a BOM-less UTF-8 file as cp1252; grim's output (U+2014, U+2192, U+21D2) fails to load via `Get-Content -Raw | Invoke-Expression` and shows a mojibake tooltip via the native pipe. Verified: `LC_ALL=C grep -rlP -e '[^\x00-\x7F]' --include='*.powershell' --include='*.zsh' DIR` prints the file names of violations, nothing when clean (V09a); the 5.1 load test (V09b). Red: grim files; green: ocx files. Fix in the generator: replace non-ASCII in help strings before `clap_complete::generate`, or emit a BOM and say 5.1 reads it.

**SH-EMIT-41 (MUST). Treat help text as untrusted input to the emitter: run a hostile-help corpus through every generated script in the real interpreter; for PowerShell, escape or reject U+2018, U+2019, U+201A and U+201B (and `'`) in help strings.** Rationale: clap_complete 4.6.8 and 4.6.9 escape `'` and U+2019 only; three other quote characters execute code on pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1. Verified: V08a (pwsh), V08b to V08d (fish, elvish, zsh). Red: unescaped U+2018, U+201A, U+201B and every `PLANT`; green: ASCII, U+2019, `fixed-*`, fish/elvish/zsh `sq` and `nested`.

**SH-EMIT-42 (MUST). Register a directory-change hook through the shell's append-safe point; never wrap `cd`.** zsh `add-zsh-hook chpwd`; fish `function __x_dir --on-variable PWD` (unique name); nu `env_change.PWD` normalised to a list, own closure dropped by marker, then appended; elvish `$after-chdir` with a marker rest-arg; PowerShell 7.x `LocationChangedAction` via `[Delegate]::Remove` then `[Delegate]::Combine` (`+=` throws, assignment drops the user's handler); Windows PowerShell 5.1 has no such property, so wrap `prompt` once with a marker and compare `$PWD`. Rationale: `cd` wrappers saw 2 of 4 changes (`pushd`/`popd` bypass); wholesale assignment dropped the user's hook; unmarked append doubled when sourced twice. Verified: V12 to V15, V21. Red: all plants; green: all twins, once and twice.

**SH-EMIT-43 (MUST). On bash, the directory hook is a `PROMPT_COMMAND` compare (one string appended, `$?` preserved), and under ble.sh (`BLE_VERSION` set) it is `blehook CHPWD-=fn; blehook CHPWD+=fn`.** Rationale: bash has no directory event; a `PROMPT_COMMAND` append after `ble-attach` is discarded by ble.sh's save/restore (ble.sh@d81fd54:ble.sh:22002-22027). Cost to state: a user's `DEBUG` trap fires for each command inside the hook (x10 against x5). Verified: V16 (pty, 60 of 60 green, plant 22 failing), V17 (8 versions, 27 of 27), V20 (ble: blehook 6 of 6 green, `PROMPT_COMMAND` form 4 of 6 red).

**SH-EMIT-44 (SHOULD). Avoid owning a bash pre-exec hook. If one is required, in this order: `blehook PREEXEC+=` (ble.sh), `preexec_functions` (bash-preexec, detected by `bash_preexec_imported`), a `DEBUG` chain loaded by `eval` at the rc's top level, `PS0` on bash 4.4 or later.** The `DEBUG` chain: read the old trap with `trap -p DEBUG`, install `"__x_pre \"\$_\"; <old>"` unless the old string already names `__x_pre`, and have `__x_pre` end with `: "$saved_underscore"`. Never use a plain `trap fn DEBUG`, a `DEBUG` append, or a prepend without `"$_"`; never load the chain with `.` or inside a function. Rationale: sections 5 and 6. Verified: V18 (naive chain 48 of 75 red, assign 48, chain 8 failing in only the unfixable cells), V19 (`PS0`), V20 (ble.sh), V23 (dot against eval). Open: a lazy install at the first prompt (what bash-preexec does) would remove the bash 5.3 + 0.7.0 double fire for the ours-first order; not measured.

**SH-EMIT-45 (SHOULD). Do not use `PreCommandLookupAction` or a `DEBUG`/`PS0` trap as a "once per typed line" point on PowerShell; there is none.** Rationale: `PreCommandLookupAction` fired 5 times for one line on 7.4.7, 7.6.6 and 5.1. Verified: V22 (red = the per-line assumption is false). Use the prompt wrap for pre-prompt work.

**SH-EMIT-46 (SHOULD). Do not rely on a hook having run for later statements of the same line.** nu `env_change.PWD` fires at the next REPL cycle (`inside ours_dir after`). Verified: V24 (observation, no plant).

**SH-EMIT-47 (MUST). Hook bodies are one cheap, silent function call; the registration text carries a marker so sourcing twice installs once.** Rationale: user `DEBUG` traps and `PS0` print on the hook's own commands; `PS0` bodies write to stderr, which a captured session shows. Verified: V12 to V15 (once and twice), V20.

**SH-EMIT-48 (MUST). For `SET "K=v"` in cmd.exe, refuse `%`, `"`, LF, CR (current), and also `!`, NUL, U+001A, the empty string, any non-ASCII byte unless a restoring `chcp 65001` is emitted and the channel is not `stdin`, and any statement longer than 8000 characters.** Rationale: section 7; ocx's four-class predicate left 62 of 186 admitted runs wrong on the real host. Verified: V11 (plant exit 1 with `62 failing`; twin exit 0 with `0 failing`).

**SH-EMIT-49 (MUST). Never "fix" a `%` by doubling unless the channel is a batch file.** Rationale: doubling is right in a `.bat` and wrong on `stdin` and `FOR /F` input (12 of 12 non-file cells corrupt). Verified by `matrix-table.txt` rows `ocx pct-*` (measurement; the check.py predicate refuses `%`, which sidesteps the question).

**SH-EMIT-50 (SHOULD). Run the Batch corpus on the real Windows host through `cmd.exe /c` from a `C:` working directory, in all four channels and four modes, and retry only a `NOVAR` launch failure (at most 3).** Rationale: WSL interop drops launches under load; a legitimate `NOVAR` repeats. Verified: V11.

## Verification runs

All commands were run on 2026-10-11 on a WSL2 Linux 6.18 host with Docker, the ocx toolchain (fish 4.9.3 and 4.7.0, nu 0.116.0 and 0.105.1, elvish 0.21.0, pwsh 7.6.6), pwsh 7.4.7 in a container, and Windows PowerShell 5.1.26100.9444 and `cmd.exe` on the Windows host. Re-run everything with `bash FC/verify-completions.sh` (log `FC/out/verify/completions.log`), `bash FC/hooks/verify-hooks.sh` (log `FC/out/verify/hooks.log`) and `python3 -I FC/batch/check.py plant|twin` (logs `FC/out/verify/batch-plant.log`, `batch-twin.log`). Collected hook data are in `FC/hooks/out/*.txt`; their producers are `FC/hooks/<shell>/run-all.sh`, `run-dir.sh`, `run-pty.sh` (with `SRCMODE=eval OUTSUF=-eval` for the `pty-eval-*` files).

### Summary table

"Plant exit" and "twin exit" are the exit codes inside the matrix block or the judge. A verification is counted as watched red when the plant exits non-zero (or prints a violation) and the twin exits 0 in the same session.

| Id | Fixture | Command (run from `FC/comp` unless noted) | Plant exit | Twin exit | Red? |
|---|---|---|---|---|---|
| V01 | bash user dir | `bash bash-loc/loc.sh <image> <relpath>` | 1, 1 | 0, 0, 0 | yes |
| V02 | bash read-back | `bash matrix.sh bash bash/register.sh <file> grim` | 1 x8 | 0 x8 | yes |
| V03 | zsh registration | `bash matrix.sh zsh zsh/reg.zsh <mode> grim.zsh grim`; `zsh/loc.sh` | 1 x4 (3 modes), 1 | 0 x4 (5 modes), 0 | yes |
| V04 | fish dir | `bash matrix.sh fish fish/loc.fish <rel> grim.fish grim [stub]`; `fish/loc-pty.sh` | 1 x4 (`completion/`), 1 x2 (no stub) | 0 | yes |
| V05 | nu extern and completer | `bash nu/reg.sh <impl> extern\|completer -- <nu>` | 1, 1 | 0 x4 | yes |
| V06 | elvish | `bash elvish/reg.sh <mode>` | 1, 1 | 0, 0 | yes |
| V07 | pwsh -NativeFallback | `bash matrix.sh pwsh pwsh-fallback/nativefallback.ps1 plant\|twin` | 1 x3 | 0 x3 | yes |
| V08a | pwsh help-text injection | `pwsh -File pwsh/inject.ps1 <variant>` | 1 (u2018, u201a, u201b) | 0 (ascii, u2019, fixed-*) | yes |
| V08b | fish injection | `bash matrix.sh fish inject/inject.fish <id>` | 1 x4 (PLANT) | 0 x4 (sq, nested) | yes |
| V08c | elvish injection | `bash inject/inject-elvish.sh <id>` | 1 (PLANT) | 0 (sq, nested) | yes |
| V08d | zsh injection | `bash matrix.sh zsh inject/inject-zsh.zsh <id>` | 1 x4 (PLANT) | 0 x4 (sq, nested) | yes |
| V09a | ASCII grep | `LC_ALL=C grep -rlP -e '[^\x00-\x7F]' --include=... DIR` | 0 (prints 2 names) | 1 (empty) | yes |
| V09b | WinPS 5.1 load | `bash FC/win51.sh pwsh-moji/mojibake.ps1 <file> <cmd>`; `pipe51.ps1` | 1, 1 | 0, 0 | yes |
| V10 | sourced twice | `fish-twice.fish`, `pwsh-twice.ps1` | none | 0 x4 | no plant |
| V11 | Batch refusal predicate | `python3 -I FC/batch/check.py plant\|twin` | 1 (62 failing) | 0 (0 failing) | yes |
| V12 | fish hooks | `python3 -I judge-gen.py out/fish-none.txt out/fish-<impl>.txt both` (from `FC/hooks`) | 1, 1 | 0 | yes |
| V13 | zsh hooks | same, `zsh-` | 1 x4 | 0 | yes |
| V14 | nu hooks | `python3 -I nu/judge.py out/nu-none.txt out/nu-<impl>.txt` | 1, 1 | 0 | yes |
| V15 | elvish hooks | `judge-gen.py out/elvish-none.txt ...` | 1, 1 | 0 | yes |
| V16 | bash dir hook, pty | `python3 -I judge-bash.py out/pty-eval-none.txt out/pty-eval-<impl>.txt dir` | 1 | 0 | yes |
| V17 | bash dir hook, 8 versions | `python3 -I judge-dir4.py out/dir-none.txt out/dir-<impl>.txt` | 1, 1 | 0 | yes |
| V18 | bash DEBUG chain | `judge-bash.py ... pre` on `pty-eval-*` | 1 (naive chain, assign) | 1 (8 unfixable cells; see below) | yes (differential) |
| V19 | bash PS0 | `judge-bash.py ... pre` on `pty-eval-*ps0*` | 1 | 1 (3 unfixable cells) | yes (differential) |
| V20 | ble.sh | `python3 -I judge-ble.py out/ble.txt <impl> pre\|dir` | 1 | 0 | yes |
| V21 | pwsh LocationChangedAction | `bash matrix.sh pwsh pwsh/dir-case.ps1 <impl> [-Twice]` | 1 | 0 (7.x) | yes |
| V22 | pwsh PreCommandLookupAction | `bash matrix.sh pwsh pwsh/pre-lookup.ps1` | 1 x3 (claim false) | n/a | yes (claim) |
| V23 | bash load by `.` against `eval` | evidence lines in `hooks.log` | user trap lost | both fire | yes |
| V24 | nu timing | `bash nu/timing.sh <nu>` | n/a | 0 | observation |

V18 and V19: the twin still fails the cells in which a *later plain assignment by the user* replaces ours (not an emitter defect); every other cell is green. The differential is the cells the plants fail and the twin passes.

### V01 bash user dir (bash-completion 2.11 on Ubuntu 24.04, 2.16.0 on Debian 13; `FC/out/verify/completions.log`)

```
### V01 twin  bash-completion user dir, debian-13 (attempt 1)
$ bash bash-loc/loc.sh cdh-bc:shellzoo-deb13 .local/share/bash-completion/completions/grim
-h           --log-level  config       status       uninstall    completions
-> exit 0
### V01 twin  ~/.bash_completion (eager user file, sourced last by bash-completion) (attempt 1)
-h           --log-level  config       status       uninstall    completions
-> exit 0
### V01 plant ~/.bash_completion.d/grim (nothing reads it) (attempt 1)
root@06d275e84ba3:/# grim echo "--- END"
-> exit 1
```

The Ubuntu 24.04 twin raced once under load (`attempt 1` exit 1) and passed on 3 of 3 immediate re-runs (`exit 0`); the log records the first run of the final pass as exit 0.

### V02 bash read-back, eight bash versions

```
== bash 3.2
file=grim.bash bash=3.2.57 fn=[_grim] candidates=36 err=[]
-> exit 0
...
== bash 5.3
file=grim.bash bash=5.3.20 fn=[_grim] candidates=36 err=[]
-> exit 0
$ ... bash/register.sh grim-trunc.bash grim
== bash 5.3
file=grim-trunc.bash bash=5.3.20 fn=[] candidates=0 err=[.../grim-trunc.bash: line 106: syntax error: unexpected end of fi
-> exit 1
```

### V03 zsh (zsh 5.0.8, 5.3.1, 5.8, 5.9)

```
mode=autoload zsh=5.9 comps[grim]=[_grim] err=[]                      -> exit 0   (all 4 versions)
mode=source-after zsh=5.9 comps[grim]=[_grim] err=[]                  -> exit 0
mode=fpath-late zsh=5.9 comps[grim]=[] err=[]                         -> exit 1   (all 4)
mode=nofpath zsh=5.9 comps[grim]=[] err=[]                            -> exit 1   (all 4)
mode=source-before zsh=5.9 comps[grim]=[] err=[.../grim.zsh:1772: command not found: compdef]   -> exit 1   (all 4)
mode=guard-only zsh=5.9 comps[grim]=[_grim] err=[]                    -> exit 0   (all 4)
mode=guard-then-compinit zsh=5.9 comps[grim]=[_grim] err=[]           -> exit 0   (all 4)
mode=compdef-then-compinit zsh=5.9 comps[grim]=[_grim] err=[]         -> exit 0   (all 4)
```

Real TAB (Ubuntu 24.04, zsh 5.9-6ubuntu2, `/etc/zsh/zshrc:110-112` runs `compinit`): vendor dir attempt 1 `-> exit 1`, attempt 2 `completions  -- Print a shell completion script (bash, zsh, fish, elvish, po` `-> exit 0` (the pty raced once); user dir on no `fpath`: `etc/ mnt/ sbin@ var/` file candidates only, `-> exit 1`.

### V04 fish

```
== fish 3.6.0 (deb12)   fish=3.6.0 rel=.config/fish/completions/grim.fish stub= found-completions=0    -> exit 1
== fish 4.0.2 (deb13)   fish=4.0.2 ... stub= found-completions=0                                       -> exit 1
== fish 4.7.0          fish=4.7.0 ... stub= found-completions=1                                       -> exit 0
== fish 4.9.3          fish=4.9.3 ... stub= found-completions=1                                       -> exit 0
(same four with stub=stub: found-completions=1, exit 0 x4)
rel=.config/fish/completion/grim.fish, stub and no stub: found-completions=0, exit 1 x4 each
loc-pty.sh 4.7.0 and 4.9.3: completions  (Print a shell completion script (bash, zsh, fish, elvish, powers…)   -> exit 0
loc-pty.sh 3.6.0 and 4.0.2 (no stub): -> exit 1
```

### V05 nu, V06 elvish, V07 pwsh -NativeFallback

```
impl=hostile-externs.nu kind=extern RESULT:externs=1                  -> exit 0   (0.116.0 and 0.105.1)
impl=twin-completer.nu kind=completer RESULT:ours=sub,help RESULT:user=user-cand   -> exit 0   (both)
impl=plant-completer.nu kind=completer RESULT:ours=sub,help           -> exit 1   (both)
STATE candidates=36 STATE registered=yes mode=rc-eval                 -> exit 0
STATE candidates=36 STATE registered=yes mode=rc-eval-try             -> exit 0
STATE candidates=0 STATE registered=no mode=lib-only                  -> exit 1
STATE candidates=0 STATE registered=no mode=noop                      -> exit 1
twin  : v=7.6.6 hasNativeFallback=True toolThrew=[] userFallbackServes=[userfb] toolCompletes=[sub]     -> exit 0
plant : v=7.6.6 hasNativeFallback=True toolThrew=[] userFallbackServes=[toolfb] toolCompletes=[toolfb]  -> exit 1
plant : v=7.4.7 hasNativeFallback=False toolThrew=[Parameter set cannot be resolved using the specified named parameters. ...   -> exit 1
plant : v=5.1.26100.9444 ... toolThrew=[Parameter set cannot be resolved using the specified named parameters.]               -> exit 1
```

### V08 injection

```
pwsh 7.4.7 / 7.6.6 / 5.1.26100.9444:
variant=ascii pwned=False        -> exit 0     variant=u2019 pwned=False       -> exit 0
variant=u2018 pwned=True         -> exit 1     variant=u201a pwned=True        -> exit 1     variant=u201b pwned=True -> exit 1
variant=fixed-u2018 pwned=False  -> exit 0     (fixed-u201a, fixed-u201b: pwned=False, exit 0)
fish=3.6.0 id=sq pwned=no errors=0 -> exit 0 ; ... id=PLANT pwned=yes errors=0 -> exit 1   (3.6.0, 4.0.2, 4.7.0 shown; 4.9.3 same)
elvish id=sq pwned=no errors=0 STATE m=5 STATE n=5 STATE s=2 -> exit 0 ; id=PLANT pwned=yes errors=0 STATE m=1 STATE n=1 STATE s=1 -> exit 1
zsh=5.9 id=sq registered=[_hostile] pwned=no -> exit 0 ; zsh=5.9 id=PLANT registered=[_hostile] pwned=yes -> exit 1   (5.0.8, 5.3.1, 5.8, 5.9)
```

The Windows PowerShell 5.1 `u2019` run hit a WSL interop drop (`UtilAcceptVsock ... accept4 failed 110`) on the first pass and is retried by the script; the log keeps both attempts.

### V09 ASCII and Windows PowerShell 5.1

```
$ env LC_ALL=C grep -rlP -e [^\x00-\x7F] --include=*.powershell --include=*.zsh ascii/plant
ascii/plant/grim.powershell
ascii/plant/grim.zsh
-> exit 0
$ env LC_ALL=C grep -rlP -e [^\x00-\x7F] --include=*.powershell --include=*.zsh ascii/twin
-> exit 1
file=grim.powershell loaded=False tooltips=4 non-ascii-tooltips=0 5.1.26100.9444 ...   -> exit 1   (Get-Content -Raw | iex)
file=ocx.powershell loaded=True tooltips=47 non-ascii-tooltips=0 5.1.26100.9444        -> exit 0
file=grim.powershell loaded=True tooltips=36 non-ascii-tooltips=1 5.1.26100.9444       -> exit 1   (native pipe | Out-String | iex)
file=ocx.powershell loaded=True tooltips=47 non-ascii-tooltips=0 5.1.26100.9444        -> exit 0
```

### V10 sourced twice (green only, no plant)

```
fish=3.6.0 once=24 twice=24   fish=4.0.2 once=24 twice=24   fish=4.7.0 once=24 twice=24   fish=4.9.3 once=24 twice=24   (exit 0)
v=5.1.26100.9444 once=36 twice=36 (exit 0)   v=7.6.6 once=36 twice=36 (exit 0)
```

### V11 Batch (`FC/out/verify/batch-plant.log`, `batch-twin.log`; host Windows 11 build 26100, cmd.exe from a C: cwd)

```
$ python3 -I check.py plant         -> exit 1
FAIL raw.bang.file.on.437 CORRUPT 'XCDHK=hi\\r\\n'
FAIL raw.bang-var.forf-stdin.on.437 CORRUPT 'XCDHK=C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\java8path;C:\\Pr
FAIL raw.caret-bang.file.on.437 CORRUPT 'XCDHK=!x\\r\\n'
FAIL raw.nul.file.off.437 CORRUPT 'XCDHK=achcp 65001>nul\\r\\n'
FAIL raw.ctrlz.file.off.437 CORRUPT 'XCDHK=a\\r\\n'
FAIL raw.latin.file.off.437 CORRUPT 'XCDHK=caf├⌐\\r\\n'
FAIL raw.cjk.forf-stdin.off.437 CORRUPT 'XCDHK=µùÑµ£¼Φ¬₧\\r\\n'
FAIL raw.len-8300.file.off.437 NOVAR ''
FAIL raw.empty.file.off.437 NOVAR ''
plant: admitted 31 of 43 values, 186 runs, 62 failing
$ python3 -I check.py twin          -> exit 0
twin: admitted 17 of 43 values, 102 runs, 0 failing
```

The full 4 x 4 matrix (`matrix-table.txt`, 43 values x raw/ocx) was produced earlier the same day by `python3 FC/batch/matrix.py`; `check.py` re-ran a subset in the final pass. An earlier plant run showed three spurious `raw.plain ... NOVAR` lines (WSL launch failures); the final run has none.

### V12 to V15 shell hooks (`FC/out/verify/hooks.log`)

```
fish   judge-gen.py fish-none fish-twin both                 12 scenarios, 0 failing   -> exit 0
fish   ... plant-cd-wrapper both                              FAIL 4.9.3 none ours_dir fired 2 (want 4); ours_pre fired 0 (want 7) ... 12 scenarios, 12 failing -> exit 1
fish   ... plant-prompt-hook pre                              FAIL 4.9.3 none ours_pre fired 0 (want 7) ... 12 scenarios, 12 failing -> exit 1
fish   ... plant-prompt-hook dir                              FAIL 4.0.2 none ours_dir fired 3 (want 4) ... 12 scenarios, 6 failing -> exit 1
zsh    zsh-twin both                                          16 scenarios, 0 failing   -> exit 0
zsh    plant-def                                              FAIL 5.9 func user_preexec fired 0, baseline 6; user_chpwd fired 0, baseline 4 ... 16 scenarios, 8 failing  -> exit 1
zsh    plant-array-append                                     FAIL 5.9 twice ours_dir fired 8 (want 4); ours_pre fired 12 (want 6) ... 16 scenarios, 4 failing -> exit 1
zsh    plant-array-assign                                     FAIL 5.9 array user_preexec fired 0, baseline 6; user_chpwd fired 0, baseline 4 ... 16 scenarios, 4 failing -> exit 1
zsh    plant-cd-wrapper dir                                   FAIL 5.9 none ours_dir fired 2 (want 4) ... 16 scenarios, 16 failing -> exit 1
nu     nu/judge.py nu-twin                                    6 scenarios, 0 failing    -> exit 0
nu     plant-clobber                                          FAIL nu 0.116.0 list user_pre fired 0, baseline 6; user_pwd fired 0, baseline 3 ... 6 scenarios, 4 failing -> exit 1
nu     plant-append                                           FAIL nu 0.116.0 twice ours_dir fired 6 (want 3); ours_pre fired 12 (want 6) ... 6 scenarios, 2 failing -> exit 1
elvish elvish-twin both                                       3 scenarios, 0 failing    -> exit 0
elvish plant-clobber                                          FAIL 0.21.0 user user_pre fired 0, baseline 5; user_dir fired 0, baseline 3 ... 3 scenarios, 2 failing -> exit 1
elvish plant-append                                           FAIL 0.21.0 twice ours_dir fired 6 (want 3); ours_pre fired 10 (want 5) ... 3 scenarios, 1 failing -> exit 1
nu     bash nu/timing.sh run.sh nu                            order: inside ours_dir after    -> exit 0
```

The three lines per judge in the log are its last three; the count line is exact.

### V16, V17 bash directory hook; V18 to V20, V23 bash pre-exec and ble.sh

```
pty   judge-bash.py pty-eval-none pty-eval-twin-pwd dir               60 scenarios, 0 failing    -> exit 0
pty   ... pty-eval-plant-pwd-clobber dir                              FAIL bash 4.4 bp050 ours-last: user_prec x0 (baseline x5); user_pre x0 (baseline x5) ... 60 scenarios, 22 failing -> exit 1
bash -i judge-dir4.py dir-none dir-twin-pwd                           27 scenarios, 0 failing    -> exit 0
bash -i ... dir-plant-pwd-clobber                                     FAIL bash 5.3 userpc user_pc x0 (baseline x6) ... 27 scenarios, 19 failing -> exit 1
bash -i ... dir-plant-cd-wrapper                                      FAIL bash 5.3 userpc ours_dir x2 (want 4) ... 27 scenarios, 27 failing -> exit 1
pty-eval-twin-debug-chain pre                                         FAIL bash 5.3 bp070 ours-last: ours_pre x10 (want 5) ... FAIL bash 5.3 userdebug ours-first: ours_pre x0 (want 5) ... 75 scenarios, 8 failing
pty-eval-twin-bp-aware pre                                            FAIL bash 5.3 bp070 ours-first: ours_pre x10 (want 5) ... 75 scenarios, 6 failing
pty-eval-plant-debug-chain-naive pre                                  FAIL bash 4.2 none ours-first: US=argA x0 (baseline x1) ... 75 scenarios, 48 failing -> exit 1
pty-eval-plant-debug-clobber pre                                      ... 75 scenarios, 48 failing -> exit 1
pty-eval-twin-ps0-append pre                                          3.2/4.2 all cells (no PS0); 4.4/5.0/5.3: FAIL ... userps0 ours-first: ours_pre x0 (want 5)
pty-eval-plant-ps0-clobber pre                                        ... 75 scenarios, 39 failing -> exit 1
ble   judge-ble.py twin-ble-aware pre / dir                           6 scenarios, 0 failing (both)   -> exit 0
ble   twin-debug-chain pre                                            FAIL ble ours-last repeat 2 ours_pre x30 (want 6) ... 6 scenarios, 6 failing -> exit 1
ble   twin-pwd dir                                                    FAIL ble ours-last repeat 2 ours_dir x0 (want 1) ... 6 scenarios, 4 failing -> exit 1
ble   twin-ps0-append pre                                             6 scenarios, 0 failing    -> exit 0
V23   4.4|none.sh|userdebug|ours-last|user_dbg user_dbg user_dbg user_dbg US=FIRED user_dbg
      4.4|twin-debug-chain.sh|userdebug|ours-last|ours_pre ours_pre ours_pre ours_pre US=argA ours_pre                                  (loaded by `.`: user trap gone)
      4.4|twin-debug-chain.sh|userdebug|ours-last|ours_pre user_dbg ours_pre user_dbg ours_pre user_dbg ours_pre user_dbg US=FIRED ours_pre user_dbg   (by eval)
```

The `twin-debug-chain` failing cells are exactly: user-DEBUG + ours-first on bash 3.2, 4.2, 4.4, 5.0, 5.3 (the user's later `trap` replaces ours) and bash 5.3 + bash-preexec 0.7.0 for the three orders. `twin-bp-aware` removes the second group for ours-last and twice. The judge for the directory kind skips the `userdebug` environment (the x10 against x5 cost above).

### V21, V22 PowerShell

```
$ matrix.sh pwsh pwsh/dir-case.ps1 twin            7.4.7: user=4 ours=4 OK -> exit 0 ; 7.6.6: user=4 ours=4 OK -> exit 0 ; 5.1: LocationChangedAction=absent -> exit 1
$ ... twin -Twice                                  7.4.7 and 7.6.6: user=4 ours=4 OK -> exit 0
$ ... plant-assign                                 user=0 ours=4  FAIL: user handler ran 0x (want 4)  -> exit 1 (7.4.7, 7.6.6)
$ ... plant-append                                 FAIL: ERROR:Method invocation failed because [System.EventHandler`1[[System.Management.Automation.LocationChangedEventArgs ...   -> exit 1
$ ... twin-prompt                                  7.4.7, 7.6.6, 5.1: ours=4 OK -> exit 0 (5.1: hasLocationChangedAction=False user=0 ours=4)
$ ... twin-prompt -Twice                           same, OK -> exit 0
$ matrix.sh pwsh pwsh/pre-lookup.ps1               hasPreCommandLookupAction=True fires=5 names=Invoke-Expression,Get-Date,Out-Null,Write-Output,Out-Null -> exit 1 (7.4.7, 7.6.6, 5.1)
```

The `twin` (delegate) exits 1 on Windows PowerShell 5.1 by design: the property does not exist there, and `twin-prompt` is the 5.1 answer. Tested on 5.1 through the `pwsh` matrix family, which stages the script as a single file.

## Exemplar evidence

- **ocx zsh completion prefix, good.** ocx@5de9d777eb7d:crates/ocx_cli/src/command/shell_completion.rs:81-88 prepends `if (( ! $+functions[compdef] )); then autoload -Uz compinit && compinit -C; fi` to the clap_complete zsh script, with the comment that sourcing from `.zprofile` otherwise leaves `compdef` undefined. Measured V03 `guard-only` and `guard-then-compinit`: registered on 5.0.8, 5.3.1, 5.8, 5.9. One cost not measured: the early `compinit -C` skips the dump check, so a user's later `compinit` is still needed to pick up `fpath` changes made after it (the later call kept the registration).
- **ocx Batch predicate, too narrow (defect, reported not fixed).** ocx@5de9d777eb7d:crates/ocx_shell/src/shell.rs:610-612 `batch_cannot_express` is `value.contains(['%', '"', '\n', '\r'])`; escape.rs:52 doubles `%` as defence in depth; shell.rs:543 emits `SET "{key}={}"`. Reproducer: `python3 -I FC/batch/check.py plant` (62 of 186 runs wrong on the real host: `!`, NUL, U+001A, non-ASCII at code page 437, over 8191 characters, empty). No `chcp` or `65001` appears in `crates/` at that commit. Severity depends on how a caller gets a value with those bytes into a Batch entry; the shell.rs comment at :608 names the `FOR /F` channel, where only the `!` (delayed expansion on), NUL, non-ASCII, length and empty rows apply.
- **ocx bash prompt hook, same mechanism as the lost-under-ble case (unverified against the real binary).** ocx@5de9d777eb7d:crates/ocx_shell/src/shell/hook.rs:204-233 appends `__ocx_prompt_hook` to `PROMPT_COMMAND` (array element or string, trailing `;` stripped). The twin-pwd measurement shows that exact append is discarded when run after `ble-attach` (ble.sh@d81fd54). Reproducer for the mechanism: `bash FC/hooks/bash/case-ble.sh twin-pwd.sh ours-last` gives no `ours_dir`. Not run on `ocx self activate` itself.
- **ocx zsh hook, good.** hook.rs:238-252 uses `autoload -Uz add-zsh-hook; add-zsh-hook precmd ...` (duplicate-safe, SH-EMIT-25 form). Same family as the twin in section 4.
- **ocx nu directory hook, nearly the twin.** ocx@5de9d777eb7d:crates/ocx_setup/src/shims.rs:229-234 defaults every level of `$env.config.hooks`, wraps a non-list `.PWD` in a list and appends with `++`, inside `try`. It carries no marker, so an autoload file read from two autoload directories appends twice (the `plant-append` red, `ours_dir` 6 want 3). Single autoload copy: no defect.
- **ocx elvish shim.** shims.rs:239-243 says "No double-source guard" and relies on idempotent move-to-front activation; consistent with the marker finding for completions (the arg-completer assignment is idempotent by key).
- **grim completions, PowerShell encoding (defect, reported not fixed).** grimoire@4650ad830375:src/command/completions.rs:47 calls `clap_complete::generate(args.shell, &mut crate::Cli::command(), "grim", &mut buf)`; the help strings carry U+2014 (src/cli/options.rs:96, :213), U+21D2 (src/command/add.rs:76) and U+2192, so `grim completions powershell` is not ASCII. Reproducer: `bash FC/win51.sh FC/comp/pwsh-moji/mojibake.ps1 grim.powershell grim` exits 1 with `loaded=False` on Windows PowerShell 5.1.26100.9444. grim and ocx both emit through `clap_complete` 4.6.9 and 4.6.8 respectively, so both carry the U+2018/U+201A/U+201B gap: reproducer `pwsh -File FC/comp/pwsh/inject.ps1 u2018` exits 1 (`pwned=True`) on pwsh 7.4.7 and 7.6.6; practical exposure needs an attacker-influenced help string.
- **Upstream.** clap_complete@715b812f3b72:clap_complete/src/aot/shells/powershell.rs:64-67 is the `escape_string` that misses three quote characters; the scripts under `FC/comp/gen/` were produced with the pinned crate (`FC/clapgen/Cargo.toml`). Not filed (owner decision 1 default: the program files nothing).

## AI-agent angle

- **Hooks are inert for agents.** A coding agent's shell tool is typically non-interactive or has no prompt cycle: `PROMPT_COMMAND`, `precmd`, `fish_prompt` and nu's `env_change` never fire between its commands (inference from how these hooks are defined; not measured against a specific agent product). An environment that must follow the working directory has to be applied explicitly per command (`eval "$(tool env)"`), not through a hook. Section 4's hooks serve human sessions.
- **Hook noise reaches captured output.** The `PS0` twin writes to stderr; a `DEBUG` hook prints into the same terminal an agent reads. Rule SH-EMIT-47 (silent, one cheap call) matters more when output is parsed.
- **Completion scripts are executed text.** An agent that installs a CLI and wires completions with `eval`, `source` or `Invoke-Expression` runs whatever the help text produced. Section 3 shows the PowerShell gap; any agent-facing tool that builds subcommands from external metadata should run SH-EMIT-41's corpus.
- **Agents verify by exit code and text.** Every check above prints the violation and exits non-zero; an agent can run `verify-completions.sh` and read the first `-> exit 1` of a twin instead of reasoning about shells. Read-back (SH-EMIT-33) is the only proof an agent can obtain without a TTY for a human to press TAB; fish, nu and elvish need a pty harness for it, bash and PowerShell do not.
- **Do not trust "file exists" in an install log.** A stored completion that registers nothing is silent; an agent reporting "completions installed" without a read-back claims more than was done.

## Contested / evolving

- **`PS0` against `DEBUG`.** bash-preexec 0.7.0 switched to `PS0` funsub on 5.3 (bp-0.7.0.sh:465-469) while 0.5.0 stays on `DEBUG`; a `DEBUG`-based emitter fires twice on 5.3 + 0.7.0 (measured), and whether a lazy first-prompt install resolves it for the ours-first order is untested.
- **ble.sh release against nightly.** Measured on `0.4.0-nightly+d81fd54`; the `PROMPT_COMMAND` save/restore may differ in a tagged release. Unverified.
- **fish lazy loading without `PATH`.** 3.6.0 and 4.0.2 require the command; 4.7.0 and 4.9.3 do not. No changelog entry was read for the change.
- **nu.** `export extern` against a chained external completer: the book describes both; carapace-style external completers are common, so the chain form matters more than the extern form in practice. The slot is single in every version measured.
- **`-NativeFallback`.** New in 7.6; whether a later version makes it a list is unknown. The twin avoids it entirely.
- **cmd.exe and UTF-8.** Windows 11's "Beta: Use Unicode UTF-8 for worldwide language support" system option changes the OEM code page; not exercised. The refuse-non-ASCII default holds either way.
- **Delayed expansion default.** The registry default for cmd's delayed expansion was not exercised; the refusal of `!` is justified by `cmd /v:on` alone.
- **macOS and BSD.** zsh site-functions under Homebrew, `/bin/bash` 3.2.57 behaviour of the DEBUG chain, fish and nu paths: unverified: read only.
- **Dedupe markers for pwsh delegates.** The twin removes its previous delegate by holding it in a global variable; a session that clears globals would double-register. Not measured.

## Sources

Primary (tool documentation and source, version-tagged):

1. bash-completion README, main@2.18.0: https://github.com/scop/bash-completion/blob/main/README.md (user dir, lines 150-156; user file, 172-176; saved `FC/src/bashcompl-readme.md`)
2. bash-completion `bash_completion`, main@2.18.0: https://github.com/scop/bash-completion/blob/main/bash_completion (lines 3676 user dir, 3773 user file; `FC/src/bashcompl-main.sh`)
3. bash-preexec 0.7.0 source (`__bp_hook_preexec_into_debug` :429-441, `_into_ps0` :459, version switch :465-469): https://github.com/rcaloras/bash-preexec (`FC/src/bp-0.7.0.sh`); 0.5.0 and 0.6.0 copies alongside
4. bash-preexec README (preexec_functions, `bash_preexec_imported`, `DEBUG` trap and `functrace` note, lines 52-95): https://github.com/rcaloras/bash-preexec/blob/master/README.md
5. ble.sh 0.4.0-nightly+d81fd54, `ble.sh` (`blehook/declare` :1936-1939, `ble-edit/adjust-PS1` :22002-22016, restore :22023-22027): https://github.com/akinomyoga/ble.sh (`FC/src/ble/ble-nightly/`)
6. GNU Bash 5.3 NEWS (`PS0` item, funsub item, `FC/src/bash-NEWS.txt` :860, :57): https://git.savannah.gnu.org/cgit/bash.git/tree/NEWS?h=bash-5.3
7. zsh manual, Functions (hook functions `chpwd`, `preexec`, `$chpwd_functions`): https://zsh.sourceforge.io/Doc/Release/Functions.html#Hook-Functions
8. zsh manual, Completion System (`compinit`, `compdef`, `-C`): https://zsh.sourceforge.io/Doc/Release/Completion-System.html
9. fish 4.9.3, Writing your own completions (user and vendor completion directories): https://fishshell.com/docs/4.9/completions.html
10. fish 4.9.3, The fish language (event handlers, `--on-variable`, `fish_preexec`): https://fishshell.com/docs/4.9/language.html
11. Nushell book, Hooks (`pre_execution`, `env_change`): https://www.nushell.sh/book/hooks.html
12. Nushell book, Custom Completions and externs: https://www.nushell.sh/book/custom_completions.html
13. Elvish reference, command (rc.elv location): https://elv.sh/ref/command.html
14. Elvish reference, builtin (`$after-chdir`, `$before-chdir`): https://elv.sh/ref/builtin.html
15. Elvish reference, edit (`$edit:completion:arg-completer`, `$edit:after-readline`): https://elv.sh/ref/edit.html
16. PowerShell docs, Register-ArgumentCompleter (`-Native`, `-NativeFallback`): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter
17. clap_complete 4.6.9 `powershell.rs` @715b812f3b72 (`escape_string` :64-67): https://github.com/clap-rs/clap/blob/715b812f3b72/clap_complete/src/aot/shells/powershell.rs
18. Microsoft Learn, cmd (`/v:on`, `/v:off`): https://learn.microsoft.com/windows-server/administration/windows-commands/cmd
19. Microsoft Learn, Command prompt line string limitation (8191): https://learn.microsoft.com/troubleshoot/windows-client/shell-experience/command-line-string-limitation
20. ocx@5de9d777eb7d: `crates/ocx_shell/src/shell/escape.rs:47-54`, `shell.rs:508-545, 603-612`, `shell/hook.rs:204-252`, `crates/ocx_cli/src/command/shell_completion.rs:79-91`, `crates/ocx_setup/src/shims.rs:200-243` (local clone `/home/mherwig/dev/ocx`)
21. grimoire@4650ad830375: `src/command/completions.rs:47`, `src/cli/options.rs:96, 213`, `src/command/add.rs:76`, `Cargo.lock` clap_complete 4.6.9 (local clone `/home/mherwig/dev/grimoire`)

Secondary (explanatory, used for behaviour descriptions only):

22. SS64, SET: https://ss64.com/nt/set.html
23. SS64, EnableDelayedExpansion: https://ss64.com/nt/delayedexpansion.html
24. SS64, Quotes, escape characters, delimiters: https://ss64.com/nt/syntax-esc.html
25. SS64, Percent symbols in a batch file: https://ss64.com/nt/syntax-percent.html
26. SS64, CHCP: https://ss64.com/nt/chcp.html

Program files:

27. `.agents/research/shell-emit.md` (SH-EMIT-01..32, open questions 1 to 3 of "Subareas that deserve another research round")
28. `.agents/research/shell-emit/rc-and-hooks.md` (SH-EMIT-24..29 harness origin: user hook present, sourced once and twice)
