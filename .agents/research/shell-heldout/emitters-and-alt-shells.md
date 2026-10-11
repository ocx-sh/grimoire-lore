---
title: "Held-out round: SH-EMIT harnesses and alt-shell MUST rules on tools outside the 41-repo corpus"
topic: shell-heldout/emitters-and-alt-shells
agent: wave4-heldout-emitters-and-alt-shells
model: sonnet
date_researched: 2026-10-11
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/emitters-and-alt-shells/
scope: |
  Emitters (fnm v1.39.0, vfox v1.0.12, mcfly v0.9.4, carapace-bin v1.8.0, just 1.58.0, broot v1.61.0) pushed through the 36-case SH-EMIT-04 corpus, the hook matrices and the completion read-back; alt-shell checks Z, F, N, E run on six held-out repos (pure, zsh-syntax-highlighting, fzf.fish, tide, nupm, elvish-modules).
  Interpreters: bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6.0-4.9.3, pwsh 7.4.7 / 7.6.6, Windows PowerShell 5.1.26100.9444, nu 0.100.0 / 0.105.1 / 0.116.0-1, elvish 0.18.0 / 0.21.0. No macOS host.
  Third-party injection findings are recorded only; nothing is filed and curly-quote disclosure is the owner's call (map X55, Q7).
---

# Held-out round: emitters and alt shells

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Verdict per family: SH-EMIT not clean (3 emitters fail the round-trip on the shells they target, all inside existing classes; 1 new static check C5); SH-ZSH clean on the MUST rules (Z2 = 0 hits on 330 files) with 2 check fixes; SH-FISH not clean only because no check covers `||` on fish below 4.7.0 (new check F5b); SH-NU clean after one check fix (module wrapper); SH-ELV not clean (new class E2b: legacy `a=b cmd` compiles clean on 0.21.0 and fails at run time).
- Every emitter that interpolates a value into a double-quoted or raw template fails the corpus: fnm via Rust `{value:?}` (26/33 bash/zsh/fish), vfox via `"%s"` (25/34), carapace via `"%v"`/`'%v'` snippets (26/33 bash/zsh, 21/33 fish), fnm pwsh `$env:X = "{value}"` (24/33). The tool-side fix is one quoter per shell, never Debug or `printf %q` output reused across shells.
- mcfly's pwsh init substitutes the binary path raw into `-FilePath '::MCFLY::'`: 23/34 fail on pwsh 7.4.7 and Windows PowerShell 5.1, including `u2018`, `u2019`, `u201a`, `u201b` and `inject`. A path with an apostrophe or curly quote breaks it; a U+2018 path executes attacker text.
- The PowerShell smart-quote hole is reproduced end to end: a generated completer whose help text holds `x` U+2018 `+(Set-Content ...)+` U+2018 `y` executes on pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1.26100.9444 (exit 1, 3 of 3); the ASCII twin and the U+2019-aware fix are green on the same three.
- A hook matrix that reports zero firings in every scenario is a broken harness, not a pass. mcfly's bash init returns early unless stdin is a tty, so the pipe-fed 40-scenario harness measured nothing (40/40 "failing"); a pty variant measured mcfly clean (25/25).
- vfox's bash hook is the `ocx-array` plant signature on bash 3.2-5.0: 5 of 40 scenarios fail, because `PROMPT_COMMAND=(_vfox_hook "${PROMPT_COMMAND[@]}")` pushes the user's hook to index 1 and bash <= 5.0 only runs index 0. Use append, or fall back to a string on bash < 5.1.
- vfox and mcfly zsh hooks are clean (16/16 each, 5.0.8-5.9); mcfly fish is clean (ours fires once per command, sourcing twice does not double); vfox fish is clean on every valid sample (27/27) once docker pty flakes are excluded.
- The fish judge assumes the hook rides `fish_prompt`; mcfly rides `fish_postexec` and trips "ours fired 4, handler fired 3" in 8/8 scenarios. Judge per event, not per prompt. mcfly fish also exits the shell if `MCFLY_HISTFILE` is unreadable and no-ops under `fish_private_mode`.
- fish: `nosuchcmd || rhs` skips the RHS on fish 3.6.0 and 4.0.2 and runs it from 4.7.0 (fish CHANGELOG 4.7.0, issue 12654). Measured on all four fish versions. Only a narrow grep is possible (a known function on the left is a false positive: tide `_tide_init.fish:9`).
- zsh `-fn` on 5.0.8 rejects valid code (`typeset -gA w=()` inside `if` inside a function: rc 1 on 5.0.8, 0 on 5.3.1 and 5.9); 3 of 29 pure files and 5 of 301 zsh-syntax-highlighting files "fail" only there. The parse gate floor is 5.3.1; 5.0.8 is a run-time-only target.
- elvish 0.21.0 removed `a=b cmd` (deprecated since 0.18.0); the compile gate stays silent, the command becomes a program name. zzamboni/elvish-modules `git-vcsh.elv:26` is a held-out true positive. The old gate flags it on 0.18.0 only.
- nu-gate on a module tree must go through `use DIR/` (a module wrapper); standalone files flag every module-imported command as an external. nupm: 13/25 red unwrapped on 0.100.0, wrapped clean on 0.116.1, red on 0.100.0 for `$nu.temp-dir` and `str lowercase`.
- Completion read-back: fnm, just, broot green on bash 3.2-5.3, zsh 5.0.8-5.9 and fish 3.6.0-4.9.3. carapace is a source-snippet, not an fpath file: needs bash >= 4.4 (3.2 prints "legacy bash is not supported", 4.0/4.2 print `complete: noquote: invalid option`), needs `compdef` (source-before-compinit fails on all four zsh), and registers nothing when dropped on fpath. vfox's bash completion yields 0 candidates in every bash without bash-completion (20 with it).
- broot `--install` is idempotent and newline-safe but has no marker and no uninstall (check-rc-edit: 6 FAIL lines, all about markers/remove). It honours `$ZDOTDIR`: running it with an inherited `ZDOTDIR` appended a line to the real `~/.zshrc` (reverted, see AI-agent angle).

## Findings

### 1. Emitter quoting classes (SH-EMIT-04 corpus, 36 cases, real emitter per case)

`egen.py` runs the real emitter per corpus case and executes the emitted code in each interpreter; the case passes only if the received bytes equal the corpus bytes. Cases an emitter refuses or the OS cannot carry are `REJECTED` and not counted. Counts below are pass/total on the oldest and newest interpreter of the family (identical across the intermediate versions in `out/runall.txt`).

| Arm | Oldest | Newest | Failing cases |
|---|---|---|---|
| fnm bash | bash 3.2 26/33 | bash 5.3 26/33 | dollar, backtick, newline, cr_crlf, space_tab, pwsh_special, esc_bell |
| fnm zsh | 5.0.8 26/33 | 5.9 26/33 | same seven |
| fnm fish | 3.6.0 26/33 | 4.9.3 26/33 | dollar, newline, cr_crlf, bang, space_tab, pwsh_special, esc_bell |
| fnm pwsh | pwsh 7.4 24/33 | WinPS 5.1 24/33 | dollar, backtick, dquote, pwsh_special, u201c, u201d, u201e, curly_dq_inject, curly_mixed |
| vfox bash (EXE) | 3.2 25/34 | 5.3 25/34 | dollar, backtick, backslash, trailing_bs, dbl_bs, empty, dquote, pwsh_special, curly_mixed |
| vfox zsh (EXE) | 5.0.8 25/34 | 5.9 25/34 | same nine |
| vfox fish (EXE) | 3.6.0 25/34 | 4.9.3 25/34 | dollar, backslash, trailing_bs, dbl_bs, empty, dquote, bang, pwsh_special, curly_mixed |
| vfox pwsh (EXE) | 7.4 21/34 | WinPS 5.1 21/34 | adds u201c, u201d, u201e, curly_dq_inject |
| mcfly pwsh (EXE) | 7.4 23/34 | WinPS 5.1 23/34 | squote, empty, inject, u2018, u2019, u201a, u201b, curly_inject, curly_mixed, nu_hash, trail_sq |
| carapace bash (HOME) | 3.2 26/33 | 5.3 26/33 | dollar, backtick, backslash, dbl_bs, dquote, pwsh_special, curly_mixed |
| carapace zsh (HOME) | 5.0.8 26/33 | 5.9 26/33 | same seven |
| carapace fish (HOME) | 3.6.0 21/33 | 4.9.3 21/33 | squote, backslash, trailing_bs, dbl_bs, newline, cr_crlf, inject, pwsh_special, curly_mixed, nu_hash, trail_sq, datelike |
| carapace pwsh (HOME) | 7.4 22/33 | WinPS 5.1 21/33 | dollar, backtick, dquote, curly double quotes; WinPS adds inject, operators, curly_inject |
| carapace nu (HOME) | 0.105.1 32/33 | 0.116.0 32/33 | curly_mixed only |
| carapace elvish (HOME) | 0.21.0 25/33 | 0.21.0 25/33 | squote, trailing_bs, inject, pwsh_special, curly_mixed, nu_hash, trail_sq, datelike |

Source of each failure class (repo@sha12:path:line):

- fnm Debug-formatted double quotes. `Schniz/fnm@d2555b46362a:src/shell/bash.rs:25` is `format!("export {name}={value:?}")`; `zsh.rs:25` the same; `fish.rs:25` is `format!("set -gx {name} {value:?};")`; PATH lines at `bash.rs:21`, `zsh.rs:21`, `fish.rs:21`. Rust `{:?}` produces a Rust string literal (`\n`, `\t`, `\u{1b}`, `\"`) inside shell double quotes: `$`, backtick and `${x}` still expand, and `\n` stays two characters. Incorrect (as emitted) versus correct per shell:

  ```
  # incorrect: Debug string in double quotes (fnm bash/zsh)
  export FNM_DIR="/root$X"        # $X expands
  # correct: single-quote with '\'' for embedded quotes (reference quoter: value passes all 33 cases)
  export FNM_DIR='/root$X'
  ```
- fnm pwsh: `powershell.rs:25` is `format!(r#"$env:{name} = "{value}""#)`: raw double quotes, so `$`, backtick, `"` and U+201C-U+201E (PowerShell treats them as delimiters) escape the string. Correct: `$env:NAME = 'value'` with `'` and U+2018-U+201B doubled.
- fnm cmd: `windows_cmd/mod.rs:27` is `format!("SET {name}={value}")`: unquoted, so `&`, `|` and `%` in a value are command syntax. Confirmed on real `cmd.exe` earlier in this run (output was not re-captured after a context compaction; re-run before citing the transcript).
- vfox: `version-fox/vfox@af83c4f7c3e9:internal/shell/bash.go:41` and `zsh.go:47` interpolate `{{.SelfPath}}` raw into `eval "$("{{.SelfPath}}" env -s bash)"`; `powershell.go:49` is `&"{{.SelfPath}}"` (double-quoted, expands `$`); `bash.go:78` and `zsh.go:81` emit `export %s=\"%s\";`; `bash.go:203` builds `$'...'` for a few values. `powershell.go:82` uses `PowerShellEscape` (direnv lineage, `powershell.go:93`) for values but still the raw double-quoted `SelfPath`. The EXE channel (binary copied into a hostile directory) is the one measured; the PATH channel was excluded because a hostile PATH breaks `od`/`tr` and vfox dedupes PATH by state (a harness artifact, not an emitter result).
- mcfly: `cantino/mcfly@17f03db47b5b:src/init.rs:37-38` does `include_str!("../mcfly.ps1").replace("::MCFLY::", env::current_exe()...)`; `mcfly.ps1:86` is `Start-Process -FilePath '::MCFLY::' ...`. The path is dropped into a single-quoted literal with no doubling.
- carapace: `carapace-sh/carapace-bin@00e8827bf664:cmd/carapace/cmd/snippet/path.go:23` `export PATH="%v%v$PATH"`; `:26` `set paths = ['%v' $@paths]`; `:29` `fish_add_path '%v'`; `:34-36` nu `"%v"` with only backslashes doubled. Values here are the user's own bin dir, so the exposure is local (a `HOME` with `$`, quote or newline), not remote.

just 1.58.0 and broot v1.61.0 emit no value-bearing arm in this corpus (just emits static clap completions; broot's `--install` writes a `source` line). Static check C5 (below) finds 0 hits in just, mcfly and broot, 7 in fnm, 7 in vfox (4 are false positives: fish `%self`, two test files, a Go error format), 5 in carapace.

### 2. PowerShell smart quotes (inject.ps1, u2018)

Microsoft documents it: "PowerShell treats smart quotation marks, also called typographic or curly quotes, as normal quotation marks for strings" and gives the escape rule "Single 'smart quotation marks' must be escaped in a single-quoted string" (about_Quoting_Rules, ms.date 2024-09-09, git f835d0e7aa7c). `matrix.sh pwsh inject.ps1 VARIANT` loads `hostile-VARIANT.ps1` as UTF-8 and calls `TabExpansion2`:

| Variant | pwsh 7.4.7 | pwsh 7.6.6 | WinPS 5.1.26100.9444 |
|---|---|---|---|
| `u2018` (clap-style single-quoted help text, plant) | pwned=True, exit 1 | pwned=True, exit 1 | pwned=True, exit 1 |
| `ascii` (twin) | pwned=False, exit 0 | pwned=False, exit 0 | pwned=False, exit 0 |
| `fixed-u2018` (U+2018-U+201B doubled) | pwned=False, exit 0 | pwned=False, exit 0 | pwned=False, exit 0 |

Incorrect and correct emission of the same help text:

```
# incorrect: doubles only the ASCII apostrophe
[CompletionResult]::new('--opt','--opt',[CompletionResultType]::ParameterName,'x‘+(Set-Content -LiteralPath pwned.txt -Value PWNED)+‘y')
# correct: also double U+2018..U+201B
[CompletionResult]::new('--opt','--opt',[CompletionResultType]::ParameterName,'x‘‘+(Set-Content -LiteralPath pwned.txt -Value PWNED)+‘‘y')
```

Static check C1 (single-quote doubling in a file that never mentions `2019`) finds `casey/just@7f4ef81bd6a9:src/function.rs` (POSIX quoter at `:593`, not a pwsh sink: false positive for the pwsh class), `Canop/broot@41cb4c78d9d7:src/shell_install/powershell.rs:76` (`link_path...replace('\'', "''")`: real class hit, not exercised at run time because `--install` for pwsh needs a Windows profile) and `src/verb/execution_builder.rs:482` (POSIX `'"'"'` form, not pwsh). Recorded only.

### 3. Hook matrices

Bash 40-scenario matrix (`hooks/bash`, versions 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3, presets unset / string / string-semi / array2 / twice):

- vfox (`internal/shell/bash.go:46-50` at `af83c4f7c3e9`): 5 of 40 fail, all `array2` on 3.2 / 4.0 / 4.2 / 4.4 / 5.0: "user_a fired 0/4 times (baseline 4); status lost". Source: `PROMPT_COMMAND=(_vfox_hook "${PROMPT_COMMAND[@]}")` (`bash.go:47`). bash 5.1 added array `PROMPT_COMMAND` ("PROMPT_COMMAND: can now be an array variable", bash NEWS bash-5.1 section, line 470), so on <= 5.0 the array's other elements never run. The status contract is kept (`return $previous_exit_status`, user_a sees rc=1 on 5.1+).
- mcfly (`mcfly.bash` via `mcfly init bash`): pipe-fed run invalid (init does `[[ -t 0 ]] || return 0`). Pty run (`hooks/bash/case-pty.sh`, `bash --rcfile` under `docker run -it`, versions 3.2 4.4 5.0 5.1 5.3 x 5 presets): 25 scenarios, 0 failing; baseline `out-none-pty.txt`. mcfly does not clobber the array and is idempotent when sourced twice.
- zsh (`hooks/zsh`, 5.0.8 5.3.1 5.8 5.9 x none/func/array/twice, 3 prompts): vfox 16/16 clean, mcfly 16/16 clean (vfox and mcfly use `precmd_functions` / `add-zsh-hook`; vfox prepends, harmlessly in zsh).
- fish (`hooks/fish`, pty, 3.6.0 4.0.2 4.7.0 4.9.3 x once/twice): vfox clean 27/27 valid samples; mcfly clean after two harness fixes (below).
- nu (`hooks/nu`, 0.105.1 and 0.116.0, default/list/string/twice) and elvish (`hooks/elvish`, 0.21.0): no held-out emitter ships a nu or elvish hook (carapace's nu/elvish output is completion, vfox's nu template `nushell.go:23-57` activates through a config-dir hook that was not driven here). Harness re-validated on its own plant/twin only.

Harness defects found (each is a check fix, not a tool defect):

1. Pipe-fed `bash -i` cannot drive a tty-gated emitter. Correct: allocate a pty (`ptydrive.py` + `docker run -it`). Incorrect signature: every scenario shows zero `ours` tokens.
2. fish judge assumes `fish_prompt`: `ours fired 4, handler fired 3` for a `fish_postexec` hook. Correct expectation: `ours` equals the number of commands run after the marker (4), once and twice.
3. mcfly fish calls `exit 1` when `MCFLY_HISTFILE` is unreadable, and returns early under `fish_private_mode` (set to 1 inside the pty driver). The impl wrapper must `set -e fish_private_mode` and point `MCFLY_HISTFILE` at an existing file.
4. docker `-it` pty runs on fish 3.6.0 / 4.0.2 intermittently return an empty row (10 empty rows in 3 reruns of vfox fish). An empty row is INVALID, never a pass; the judge was fed only non-empty rows and `cut -d'|' -f1,3 | sort | uniq -c` shows every (version, preset) has at least one valid sample.
5. elvish case rows vary by one in prompt count between runs (twin `twice` row has `ours` 4 and `user_h` 4 where none has 3); compare ours to user_h, not to a constant.

### 4. Completion read-back (FC)

- bash `register2.sh` (source the file, `complete -p`, call the registered function as readline does): fnm, just, broot 8/8 bash versions; carapace 5/8 (see Summary; 984 candidates on >= 4.4); vfox bash 0 candidates on all 8 docker bash versions (no bash-completion), 20 on host bash 5.3.0 with bash-completion loaded (`vfox-rb.sh`).
- zsh `reg.zsh`: fnm, just, broot, vfox 4/4 autoload (`comps[CMD]` set). carapace: autoload 0/4 (the file is a snippet, not `#compdef`), source-after-compinit 4/4, source-before-compinit 0/4 with `command not found: compdef` (`carapace.zsh:50`).
- fish `loc2.fish`: fnm (2 candidates starting `i`), just (68 starting `--`), broot (46), carapace (65 starting `c`, real binary on PATH) on 3.6.0, 4.0.2, 4.7.0, 4.9.3, all identical.

### 5. rc-edit (check-rc-edit.sh)

- twin `rc-edit.sh`: exit 0 on 11/11 posix interpreters (dash, busybox ash x2, mksh, ksh93 x2, yash, posh, bash 3.2/5.2 --posix, zsh emulate sh). plant: exit 1 on 11/11 with 11 FAIL lines (two markers, second apply changes file, user line joined, stacking, marker survives remove).
- Held-out adapter `rc/broot-adapter.sh` (`env -i`, `ZDOTDIR=HOME=` private dir): broot `--install` run twice over `alias ll=ls\n` and `alias ll=ls` (no newline): the second apply is byte-identical, exactly one `launcher/bash/br` line, and the no-newline case is not joined (`alias ll=ls$` then the `source` line). The check exits 1 with 6 FAIL lines because broot writes no `# >>>` marker and has no remove (`broot has no uninstall`): a "removable" finding, correct under the rule.

### 6. Alt-shell checks on held-out repos

zsh (sindresorhus/pure@cac55d0b531a, 29 files; zsh-users/zsh-syntax-highlighting@e6683f20e5c3, 301 files):
- Z1 `zsh -fn`: 5.0.8 fails 3 pure files and 5 zsh-syntax-highlighting files; 5.3.1, 5.8, 5.9 fail none. Cause bisected: `typeset -gA w=()` inside `if` inside a function (`zsh-parse/t1.zsh`: 5.0.8 rc 1, 5.3.1 rc 0, 5.9 rc 0; `t2`/`t3` without the combination are 0 on all). A second construct, `${A[x]:=y}`, also false-positives on 5.0.8.
- Z2 hard tier 0 lines in both; Z5 (`.zshenv`) 0; Z3 triage: 11 pure `trap "zf_rm -rf -- ${(q)x}" EXIT` lines (quoted with `${(q)}`: reviewed, compliant). Z4 (no `emulate -L zsh`): 26 pure and 300 zsh-syntax-highlighting files listed, mostly tests and `test-data` fixtures; the signal is only in files that define functions loaded into a user's shell. Judge by the shebang/test-data exclusion (candidate rule 9).
- Z8 CI: none run.

fish (PatrickF1/fzf.fish@6a6136998879, 45 files; IlanCosman/tide@fcda500d2c29, 117 files):
- F1 `fish --no-config --no-execute`: 0 failures on 3.6.0, 4.0.2, 4.7.0, 4.9.3 for both. F2 (bash habits), F3 (version ledger) 0 lines.
- F4 universal state: tide 8 lines (`set -U` in `conf.d/_tide_init.fish:2,37,42`, `functions/_tide_remove_unusable_items.fish:19,22`, `fish_prompt.fish:11`): by design for a prompt theme with configuration, existing class.
- F5: fzf.fish `functions/fzf_configure_bindings.fish:5` `status is-interactive || test "$CI" = true; or return` mixes `||` and `; or` (works, hard to read); `:33-37` unquoted `test -n $key_sequences[N] && bind ...` (a one-element list; with an empty list `test -n` returns true on fish 3.6.0, the documented footgun). tide has 38 `||` lines, all on builtins or functions.
- F5b narrow check: tide `conf.d/_tide_init.fish:9` `tide bug-report --check || sleep 4` is the single hit and a false positive (the left side is a function); fzf.fish 0.
- F6: tide 17 test files use `mktemp -d` with no cleanup handler (tests only). 

nu (nushell/nupm@9a28419bf91a, 25 files), via `nu-gate.nu --strict`:
- Raw, per file: 0.100.0 13/25 red ("Module not found", "unknown command treated as external: throw-error / git"), 0.105.1 13/25 red (`Cannot find column 'temp-dir'`), 0.116.1 11/25 red (module-imported `nupm`, `log`, `throw-error` seen as externals). Default (non-strict) mode on 0.116.1: 9 red.
- Wrapped (`nu-mod/wrap-nupm.nu`: `use .../nupm/`): 0.116.1 rc 0; 0.100.0 rc 1 (column_not_found on `$nu.temp-dir`, `nupm/utils/dirs.nu:11`; `str lowercase` at `dirs.nu:65,71`). N2 (no `# nu-range:` header) 25 of 25 files. N3a 2 lines (comments), N3b 3 lines (the floor-raising names above), N6 2 lines (`try { open $path }` at `nupm/publish.nu:231,251`).

elvish (zzamboni/elvish-modules@6226805b3def, 25 files):
- E1 gate: 0.18.0 plain 8/25 red, tolerate 3/25; 0.21.0 plain 7/25 red, tolerate 2/25 (`atlas.elv:20` uses `eawk`, removed in 0.21.0 per the release notes; `spinners-examples.elv`). `$edit:` variables (`bang-bang`, `dir`, `iterm2`, `prompt-hooks`, `util-edit`) fail in non-interactive `use`, expected.
- E3 load (`elvrt.sh`): 0.18.0 10 ok / 12 fail, 0.21.0 11 ok / 11 fail.
- E2b: `git-vcsh.elv:26` `pwd=~ { set _ = ?(...) }` is the legacy temporary assignment. On 0.18.0 the gate reports the deprecation; on 0.21.0 the file compiles clean and the command line becomes an attempt to run a program named `pwd=~`.

## Normative guidance candidates

Each rule below carries its verification in checker shape (output is the violation, empty is pass). "RUN" means the command was executed against a planted violation and its twin in this round; `$S` stands for the held-out source directory and each command takes an explicit directory operand.

1. **Build shell values with one per-shell quoter and never reuse Rust `{:?}`, Go `%q` or a bare `"%s"` template.** Rationale: fnm, vfox and carapace fail 21-26 of 33-34 corpus cases. Verify: `grep -rnE --include='*.rs' -e '(export|set -gx|set -x|\$env:|setenv)[^"]*\{(value|val|path|v|s|str)(:[?#]+)?\}' -e '= "\{(value|val|path|v|s|str)\}"' DIR` and `grep -rnE --include='*.go' --include='*.py' -e '(export |set -x -g|fish_add_path|\$env[.:]|set paths|setenv).*%[sv]' DIR`. RUN: `c5/plant` 5 hits, `c5/twin` 0 lines; fnm 7, vfox 7 (4 false positives), carapace 5, just/mcfly/broot 0. Ceiling: placeholder names are enumerated, so a hit needs a human reader.
2. **A PowerShell single-quote quoter doubles U+2018, U+2019, U+201A and U+201B as well as `'`.** Rationale: all four are string delimiters (about_Quoting_Rules); reproduced exit 1 on pwsh 7.4.7, 7.6.6, WinPS 5.1. Verify: `grep -rlF --include='*.rs' -e "replace('\\''" DIR | xargs -r grep -L -e '2019'` (and the `.go` variant with `ReplaceAll`). RUN: `pwsh_ocx` 28/35 red on pwsh 7.6.6 and WinPS 5.1, `pwsh_sq` 35/35 green; `inject.ps1 u2018` red 3/3, `fixed-u2018` and `ascii` green 3/3. On held-out repos it lists broot `powershell.rs:76` (real class) and two POSIX quoters (false positives).
3. **Emit the executable path into pwsh with `& '<doubled-quote path>'`, never inside `"..."` and never undoubled in `'...'`.** Rationale: vfox `powershell.go:49` (double quotes, expands `$`) and mcfly `mcfly.ps1:86` (single quotes, no doubling) both fail (21/34, 23/34). Verify: rule 1 and rule 2 commands plus `grep -rnF --include='*.ps1' -e "-FilePath '::" DIR`. Not RUN as a standalone command beyond rules 1 and 2.
4. **Bash hooks that write `PROMPT_COMMAND` must append to an existing array, or use the string form when `BASH_VERSINFO` < 5.1.** Rationale: only index 0 runs on <= 5.0; vfox prepends and loses the user hook on 5 of 40 scenarios. Verify: `grep -rnE --include='*.go' --include='*.sh' --include='*.rs' -e 'PROMPT_COMMAND=\([_a-z]+ ' DIR`. RUN: vfox `bash.go:47` hit; `hooks/bash/plant-ocx-array.sh` red (5 failing of 40 under `judge.py`), `plant-array` 23, `plant-clobber` 32, `plant-naive-string` 24, `twin.sh` 0; mcfly and carapace 0 hits.
5. **A hook matrix result of zero firings is invalid; a tty-gated emitter must be driven on a pty.** Rationale: mcfly's init returns unless stdin is a tty. Verify: `grep -rnF --include='*.sh' -e '[[ -t 0 ]] || return' DIR` flags emitters that need the pty variant, and the judge must require `ours == prompts`. RUN: pipe-fed `out-mcfly-bash.txt` 40/40 failing (harness blind), pty `out-mcfly-bash-pty.txt` 0/25 failing.
6. **Prompt hooks judged per event.** fish `fish_postexec` hooks are checked against commands run, `fish_prompt` hooks against prompts. Verify: `grep -rnE --include='*.fish' -e '--on-event fish_postexec' -e '-e fish_postexec' DIR` lists hooks that need the postexec expectation. RUN: mcfly-fish judged by prompt shows 8/8 false failures; by command count it shows ours = 4 in 8/8 (`out4-mcfly-fish.2.txt`).
7. **fish files that must run on fish < 4.7.0 never put an unknown-command on the left of `||`.** Rationale: 3.6.0 and 4.0.2 skip the RHS; 4.7.0 runs it (CHANGELOG 4.7.0, issue 12654; measured with `orbar.fish`). Verify: `grep -rnP --include='*.fish' -e '^\s*(?!(?:if|and|or|not|while|command|test|set|string|status|functions|contains|count|builtin|type|math|path|echo|return|true|false|read|begin|_)\b)[a-z][a-z0-9_.-]*\s[^|#]*\|\|' DIR`. RUN: `f5/plant` 2 hits, `f5/twin` 0; tide 1 hit (false positive: left side is a function), fzf.fish 0.
8. **Gate the zsh parse at 5.3.1 and above; treat 5.0.8 as a run-time target only.** Rationale: `typeset -gA w=()` in `if` in a function is rejected by 5.0.8 `-fn` only. Verify: `grep -rnE --include='*.zsh' -e 'typeset -gA [a-z_]+=\(\)' DIR` finds the construct; the parse itself is verified by `zsh -fn` on 5.3.1. RUN: `zsh-parse/t1.zsh` rc 1 on 5.0.8, 0 on 5.3.1 and 5.9; `t2` and `t3` rc 0 on all three.
9. **Z4 `emulate -L zsh` is judged per file role, not by count.** Test files, `test-data` and plugin entry points that only source are exempt; functions loaded into user shells are not. Verify: `grep -rL --include='*.zsh' -e 'emulate -L zsh' DIR` then drop paths matching `test` and `test-data`. Output was 26 pure and 300 zsh-syntax-highlighting files, 1 genuine bare `emulate` line: the raw list is not a violation list. RUN as a listing only; no plant.
10. **Completion generators must be version-guarded and silent on unsupported shells.** Rationale: carapace prints `legacy bash is not supported` (3.2) and `complete: noquote: invalid option` (4.0, 4.2); vfox's bash script gives 0 candidates without bash-completion. Verify: `grep -rnF --include='*.bash' -e 'complete -o noquote' DIR | xargs -r grep -L -e 'BASH_VERSINFO'` in a generated file set. RUN as read-back, not as a grep: `register2.sh` carapace 3 red (3.2, 4.0, 4.2) of 8, fnm/just/broot 8/8 green; `vfox-rb.sh bare` 0 candidates on 8/8, 20 with bash-completion.
11. **zsh completion snippets that call `compdef` are sourced after `compinit`, or define a guard.** Verify: `grep -rnF --include='*.zsh' -e 'compdef ' DIR | xargs -r grep -L -e 'functions[compdef]'`. RUN: `reg.zsh source-before carapace` exit 1 on 5.0.8, 5.3.1, 5.8, 5.9; `source-after` exit 0 on all four.
12. **Run nu gates on modules through `use DIR/`.** Rationale: standalone files flag every module command as an external (nupm 13/25 red unwrapped, 0 wrapped on 0.116.1). Verify: `grep -rLF --include='*.nu' -e 'export ' DIR` is not enough, so the rule is checked by the wrapper run: `nuv.sh 0.116.1 nu-gate.nu --strict wrap.nu`. RUN: `nu-mod/plant/wrap.nu` rc 1 on 0.100.0 and 0.116.1, `nu-mod/twin/wrap.nu` rc 0 on both.
13. **Declare a nu floor and keep `$nu.temp-dir`, `str lowercase`, `str uppercase` behind it.** Rationale: nupm is red on 0.100.0 and 0.105.1 (`column_not_found temp-dir`) and green on 0.116.1. Verify: `grep -rnF --include='*.nu' -e '$nu.temp-dir' -e 'str lowercase' -e 'str uppercase' DIR | xargs -r grep -L -e '# nu-range:'`. RUN: nupm hits `dirs.nu:11,65,71`; 25 of 25 files lack the header.
14. **elvish: never write `NAME=value cmd`; use `tmp` (0.18.0+) or `with` (0.21.0+).** Rationale: removed in 0.21.0, deprecated since 0.18.0; the compile gate does not catch it on 0.21.0. Verify: `grep -rnE --include='*.elv' -e '(^|[[:space:]({;|])[A-Za-z_][A-Za-z_0-9]*=[^[:space:]=]+[[:space:]]+[{(A-Za-z]' DIR`. RUN: `e2b/plant` 1 hit, `e2b/twin` 0; elvish-modules 1 hit (`git-vcsh.elv:26`, true positive).
15. **Installers that edit rc files write an owned marker, are idempotent, join-safe and removable, and honour `$ZDOTDIR` and `$HOME` explicitly.** Verify: `check-rc-edit.sh IMPL`. RUN: twin 11/11 interpreters exit 0, plant 11/11 exit 1; broot adapter exit 1 (6 FAIL lines: no marker, no remove).
16. **Any harness that executes a third-party installer scrubs the environment (`env -i` with HOME, ZDOTDIR, XDG_*, PATH only).** Rationale: see AI-agent angle. Verify: `grep -rnE --include='*.sh' -e '--install' DIR | xargs -r grep -L -e 'env -i'`. RUN: the adapter now passes through `env -i`; a re-run left `/home/mherwig/.zshrc` at 2106 bytes.

## Verification runs

All under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/emitters-and-alt-shells/`. Exit codes are those of the harness or script named; "red" means it failed on a planted violation. 15 verifications were watched going red this round (count in the receipt); 2 more (elvish hook plants) were judged by eye and are not counted.

| # | Fixture / command | Violation (plant) | Twin | Result |
|---|---|---|---|---|
| 1 | `c5/check.sh c5/plant` | 5 lines (rs x3, go x2) | `c5/twin`: 0 lines | red (last grep exit 0 on plant, 1 on twin; the lines are the signal) |
| 2 | `f5/check.sh f5/plant` | 2 lines (`a.fish:2`, `:3`) | `f5/twin`: 0 | red |
| 3 | `e2b/check.sh e2b/plant` | 1 line (`a.elv:1`) | `e2b/twin`: 0 | red |
| 4 | `nuv.sh V nu-gate.nu --strict nu-mod/plant/wrap.nu`, V = 0.100.0, 0.116.1 | rc 1 both | `nu-mod/twin`: rc 0 both | red |
| 5 | `matrix.sh posix ../rc-and-hooks/matrix-rc-edit-plant.sh` | exit 1 on 11/11 | `matrix-rc-edit.sh` exit 0 on 11/11 | red |
| 6 | `hooks/zsh/run-all.sh plant-precmd.zsh` + `judge-simple.py none plant 3` | 8 of 16 failing | `twin.zsh` 0 failing | red |
| 7 | `hooks/fish/run-all.sh plant-prompt-clobber.fish` + `judge.py` | 7 of 8 failing | `twin.fish` 0 failing | red |
| 8 | `hooks/nu/run-all.sh plant-clobber.nu` + `judge.py none` | 7 of 8 failing | `twin.nu` 0 of 8 | red |
| 9 | same, `plant-append-twice.nu` | 4 of 8 failing (ours 4-6 where 3 wanted) | `twin.nu` 0 | red |
| 10-13 | `hooks/bash/judge.py out-none.txt out-plant-*.txt` | ocx-array 5/40, array 23/40, clobber 32/40, naive-string 24/40 | `out-twin.txt` 0/40 | red x4 |
| 14 | `matrix.sh pwsh inject.ps1 u2018` | exit 1 on pwsh 7.4.7, 7.6.6, WinPS 5.1 | `ascii` exit 0, `fixed-u2018` exit 0 on all three | red |
| 15 | `quoting-contract/check.sh pwsh_ocx pwsh` | 28/35 on pwsh 7.6.6 and WinPS 5.1 (u2018..u201b, curly_inject, curly_mixed, big4k) | `pwsh_sq pwsh` 35/35 | red |

Held-out measurements (real tools, not plants): corpus arms in Finding 1 (`out/runall.txt`, `digest.py`); vfox bash hook 5/40 red; mcfly bash pty 0/25; vfox/mcfly zsh 0/16 each; vfox fish 0/27 valid; mcfly fish judged per command 0 real failures; completion read-back (`runcomp.sh`, `runcomp-fish.sh`); `alt-zsh.sh`, `alt-fish.sh`, `alt-nu.sh`, `alt-elv.sh` outputs in `out/`.

Not red, reported as such:
- `check-rc-edit.sh` on broot: the exit 1 is a valid finding on a real tool, not a plant.
- The static C5 hit on `version-fox__vfox` (4 of 7) is a false positive; the check is a triage aid.
- `f5/check.sh` on tide is a false positive (function on the left).
- mcfly bash hook under the pipe-fed harness was not red or green: invalid (see Finding 3).
- Static `c5` is not a gate by itself: its last-grep exit status (0 on plant, 1 on twin) is an accident of script structure; consumers must read the output.
- fnm `cmd.exe` injection was confirmed on a real `cmd.exe` before the context compaction; the transcript was not re-captured.

Fixture-only corrections made this round: `c5/twin/shell.go` changed to `fish_add_path --global ` so the R7 grep (`fish_add_path [^-]`) is silent on the twin (it previously matched `"fish_add_path " + fishQuote(...)`). Re-run: plant 1 hit, twin 0.

## Exemplar evidence

Held-out repositories and their SHAs:

| Repo | SHA12 | Used for |
|---|---|---|
| Schniz/fnm | d2555b46362a (v1.39.0) | quoting classes, cmd SET |
| version-fox/vfox | af83c4f7c3e9 (v1.0.12) | quoting, bash array hook |
| cantino/mcfly | 17f03db47b5b (v0.9.4) | pwsh path, tty-gated hooks |
| carapace-sh/carapace-bin | 00e8827bf664 (v1.8.0) | snippets, completion |
| casey/just | 7f4ef81bd6a9 (1.58.0) | completion read-back |
| Canop/broot | 41cb4c78d9d7 (v1.61.0) | `--install`, completion |
| sindresorhus/pure | cac55d0b531a (v1.28.4) | zsh Z checks |
| zsh-users/zsh-syntax-highlighting | e6683f20e5c3 | zsh Z checks |
| PatrickF1/fzf.fish | 6a6136998879 | fish F checks |
| IlanCosman/tide | fcda500d2c29 | fish F checks |
| nushell/nupm | 9a28419bf91a | nu N checks |
| zzamboni/elvish-modules | 6226805b3def | elvish E checks |

Good patterns observed: mcfly guards double-sourcing and keeps user `PROMPT_COMMAND` entries across all five bash versions; vfox preserves the exit status (`return $previous_exit_status`, `bash.go:49`) and survives double-sourcing; vfox's pwsh values use a direnv-lineage escaper (`powershell.go:93`); carapace's nu snippet passes 32/33; just and broot completions are clean on every tested shell; fzf.fish and tide parse on all four fish versions; pure and zsh-syntax-highlighting parse clean on zsh >= 5.3.1 with 0 hard-tier hits.

## AI-agent angle

- An agent that scripts a third-party installer in a throwaway HOME can still write to the real home: `broot --install` honours `$ZDOTDIR`, the Bash tool's environment had `ZDOTDIR=/home/mherwig`, and one line was appended to the real `~/.zshrc`. The line was removed the same minute by a byte-exact tail revert (`rc/revert-zshrc.py`: asserted the tail, size 2237 to 2106; mtime changed). Rule 16 and the `env -i` adapter exist because of this.
- A harness can pass by measuring nothing: the pipe-fed mcfly run reported 40/40 failing, the opposite error would have reported clean. An agent reading a hook matrix must check that the baseline and the impl both fired the hooks at all.
- Agents copy a platform's example without checking the quoting layer: all three double-quote offenders interpolate a string into a template written for the author's own path. A grep for `{value:?}` and `%s` in emission code is the cheapest first review step.
- Docker `-it` pty runs flake; an agent must treat an empty row as invalid and rerun before judging, otherwise a flake becomes a false rule.
- `Bash` tool login shell is zsh: loops that rely on word splitting silently run once. Use `bash -c` or script files.

## Contested / evolving

- fish `fish_add_path`: by default it writes the universal variable `fish_user_paths` and skips nonexistent directories, so carapace's one-line snippet (`path.go:29`) persists across sessions. That is the documented purpose (persistent) and also state pollution; treat `--global` as a style choice, not a MUST. Check kept as advisory: `grep -rnE --include='*.go' -e 'fish_add_path [^-]' DIR` (plant 1 hit, twin 0).
- fish `||` on an unknown command: the behavior regressed in 3.2 and was fixed in 4.7.0; whether to keep the F5b check after 4.0.x ages out is a floor decision, not a rule.
- zsh 5.0.8 as a floor: macOS ships 5.9 today, but a 5.0.8 `-fn` false positive is only relevant to teams that still gate there; kept as a run-time target.
- bash array `PROMPT_COMMAND`: appending preserves the user's hooks on <= 5.0 but runs after them; prepending (vfox) preserves status ordering on 5.1+. There is no form that is both order-preserving and <= 5.0 safe; the string fallback is the only safe one.
- The U+2018 disclosure: the generated-completer injection is recorded only. No upstream report was drafted or filed (map X55, Q7).
- nu monthly breaking minors: the floor claims here are tied to 0.100.0 / 0.105.1 / 0.116.x; re-run the wrapper gate on the next minor.
- elvish `with` exists from 0.21.0 only; `tmp` from 0.18.0 is the portable choice.
- Not tested: macOS bash 3.2 as shipped by Apple (the `bash:3.2` image stands in), vfox's nushell activation, just/carapace dynamic completion payloads under pwsh, broot pwsh `--install` on Windows.

## Sources

| URL | What | Date / era | Why |
|---|---|---|---|
| https://github.com/Schniz/fnm (d2555b46362a, src/shell/{bash,zsh,fish,powershell}.rs, windows_cmd/mod.rs) | fnm emitters | v1.39.0, 2026 | primary: quoting classes |
| https://github.com/version-fox/vfox (af83c4f7c3e9, internal/shell/*.go) | vfox hooks and emitters | v1.0.12, 2026 | primary: quoting, array hook |
| https://github.com/cantino/mcfly (17f03db47b5b, src/init.rs, mcfly.ps1, mcfly.fish) | mcfly init scripts | v0.9.4, 2026 | primary: pwsh path, tty gating |
| https://github.com/carapace-sh/carapace-bin (00e8827bf664, cmd/carapace/cmd/snippet/) | completion snippets | v1.8.0, 2026 | primary: snippet quoting |
| https://github.com/casey/just (7f4ef81bd6a9) | static completions | 1.58.0, 2026 | primary: read-back |
| https://github.com/Canop/broot (41cb4c78d9d7, src/shell_install/powershell.rs) | installer | v1.61.0, 2026 | primary: rc-edit, C1 hit |
| https://github.com/sindresorhus/pure (cac55d0b531a) | zsh prompt | v1.28.4 | primary: Z checks |
| https://github.com/zsh-users/zsh-syntax-highlighting (e6683f20e5c3) | zsh plugin | 2026 | primary: Z checks |
| https://github.com/PatrickF1/fzf.fish (6a6136998879) | fish plugin | 2026 | primary: F checks |
| https://github.com/IlanCosman/tide (fcda500d2c29) | fish prompt | 2026 | primary: F checks |
| https://github.com/nushell/nupm (9a28419bf91a) | nu package manager | 2026 | primary: N checks |
| https://github.com/zzamboni/elvish-modules (6226805b3def) | elvish modules | 2026 | primary: E checks |
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst (line 193, 4.7.0 section; `src/fish-CHANGELOG.rst`) | `nosuchcommand \|\| echo` fix, issue 12654 | released May 05, 2026 | primary: version ledger |
| https://tiswww.case.edu/php/chet/bash/NEWS (line 470; `src/bash-NEWS`) | bash-5.1 array PROMPT_COMMAND | bash 5.1, 2020 | primary: hook floor |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules | smart quotes are delimiters, verbatim single quotes | ms.date 2024-09-09, 7.6 | primary: pwsh quoting |
| https://elv.sh/blog/0.21.0-release-notes.html | removal of `a=b command` and `eawk` | 0.21.0, Aug (year not shown) | primary: elvish |
| https://fishshell.com/docs/current/language.html | double-quote expansion, single-quote escapes | current | primary: fish quoting |
