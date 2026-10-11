---
title: "Multi-shell emitters compared: zoxide, direnv, fzf, starship, mise, atuin, conda, oh-my-posh"
agent: shell-audit emitters subagent (workflow wf_938b7059-603)
model: claude-sonnet-5-5
scope: 8 tools that emit per-shell code. 7 axes (support matrix, escaping, hooks, init model, deactivation/PATH, tests, version churn). Source = sparse exemplar clones (see Gaps) plus released binaries run through the interpreter matrix.
date_researched: 2026-10-10
method: |
  Root F=/home/mherwig/.cache/research-lang/shell-tools/fixtures/emitters (all scripts, inputs and raw outputs live there; re-run from there).
  Corpus E=/home/mherwig/.cache/research-lang/exemplars/shell/<owner>__<repo>. Matrix = /home/mherwig/.cache/research-lang/shell-tools/matrix.sh <family> <script>.
  Commands are inlined next to each result below. Summary of the harness:
    - `python3 -I $F/gen.py <family> <func>`  generate s_<fam>_<fn>.<ext>: 20 hostile cases (base64 in script) -> escape -> eval -> compare bytes
    - `bash $F/runall.sh` / `rerun2.sh`  -> `matrix.sh {posix,bash,zsh,fish,nu,elvish,pwsh} s_*`; results in out/r_*.txt; `python3 -I $F/summarize.py <family> <func>` -> n/20 per interpreter
    - Go extracts: `$F/go/{direnv_esc.go,omp_esc.go}` (sed-extracted verbatim), built with docker golang:1.25-alpine -> out/go_escaped.tsv
    - Rust extracts: `$F/rs/` (path deps shell-escape-0.1.5, shell-words-1.1.1; src/verbatim.rs = mise elvish.rs/pwsh.rs/nushell.rs fns), `CARGO_TARGET_DIR=$F/rs/target cargo build --offline` -> out/rs_escaped.tsv
    - E2E with released binaries: `ocx --project $F/ocx/ocx.toml exec -- <tool> ...` (direnv 2.37.1, mise 2026.10.2, starship 1.25.1)
    - bash `PROMPT_COMMAND` coexistence: `bash $F/pc.sh` -> out/pc_all.txt, `python3 -I $F/pc_sum.py`
    - Parse checks: `bash $F/e2e/init/drive.sh` -> out/parse_init.txt (+ pwsh: matrix.sh pwsh e2e/init/ppwsh.ps1 -> out/parse_pwsh.txt)
    - Churn: `python3 -I $F/changelog.py`, `changelog2.py` (keyword classifier; see script for the exact regex)
    - Sizes/tests: `python3 -I $F/lines.py`, `python3 -I $F/tests.py`; startup `python3 -I $F/startup.py` (inside ocx exec)
    - Corpus rules: no /tmp, every run under `timeout 300`, grep via `bash -c`.
  Caveat on "version-specific": all claims about versions are as of the pinned corpus SHAs or the tested binary versions named. macOS claims are read-only and unverified.
---

# Multi-shell emitters compared

Verdict first. The eight tools split cleanly into three escaping strategies (shared POSIX quoter, per-shell hand-written quoters, data-not-code channels). Strategy tracks defect rate: hand-written per-shell quoters (direnv, omp) were 20/20 everywhere tested; reuse of the POSIX quoter for non-POSIX shells (mise fish/nu/elvish, starship fish/nu/elvish) failed 2-3 of 20 hostile cases, and two of those failures reproduce end to end with released binaries. The hook layer, not the escaper, is the other defect source (omp bash PROMPT_COMMAND).

## Table of contents

1. Headline numbers
2. Axis 1: support matrix
3. Axis 2: escaping (corpus, per-function results, end-to-end)
4. Axis 3: hooks (mechanism, clobbering, re-source, PROMPT_COMMAND coexistence)
5. Axis 4: init model, caching, startup cost
6. Axis 5: deactivation and PATH
7. Axis 6: tests
8. Axis 7: version churn (H9)
9. Smells (ranked)
10. Patterns worth encoding
11. Contradictions of the frame
12. Gaps
13. Prior-art patterns (convergent vs divergent)

## Headline numbers

| Measure | Value | Source section |
|---|---|---|
| Hostile escape cases | 20 | Axis 2 |
| Escape functions run verbatim | 16 (Go 11, Rust 5) across 7 interpreter families | Axis 2 |
| Per-shell hand-written quoters (direnv, omp, mise-elvish, mise-pwsh) pass | 20/20 on every interpreter version where syntax is supported | Axis 2 |
| Shared POSIX quoter reused for fish | 17/20 (fails backslash, trailing_bs, dbl_bs) on fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | Axis 2 |
| Shared POSIX quoter reused for nu | mise 17/20, starship 18/20 on nu 0.105.1 and 0.116.0 | Axis 2 |
| Shared POSIX quoter reused for elvish | mise 17/20, starship 18/20 on elvish 0.21.0 | Axis 2 |
| `$'..'` quoter on dash/yash/posh | 1/20 (unsupported syntax) vs 20/20 on bash, zsh, ksh93, mksh, busybox ash | Axis 2 |
| E2E: mise 2026.10.2 `env -s fish` with `a\\b` | value arrives as `a\b` (silent corruption), 4/4 fish versions | Axis 2 |
| E2E: mise fish with value ending `\` | whole emitted file fails to parse ("quotes are not balanced"), 4/4 fish | Axis 2 |
| E2E: starship 1.25.1 at path with `'` | `init nu` and `init elvish` fail to parse; fish/bash/pwsh stubs fine | Axis 2 |
| E2E: direnv 2.37.1 export of 10 hostile env values | 10/10 on bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6.0-4.9.3, elvish 0.21.0, pwsh 7.6.6; 9/10 on pwsh 7.4.7 (empty value) | Axis 2 |
| PROMPT_COMMAND coexistence, scenarios | 8 bash versions, 25 ordered pairs + 5 singles per preset | Axis 3 |
| omp bash hook inert (bash 3.2 to 5.0) | 16 of 50 realistic scenarios fail on 4.0/4.2/4.4/5.0, 18 of 50 on 3.2; 0 of 75 fail on 5.1/5.2/5.3 | Axis 3 |
| Non-omp emitters coexisting | zoxide, direnv, mise, starship: 0 failures in every scenario, every version | Axis 3 |
| Real init output parse check | bash -n 8 versions x 3 files, zsh -n 4x3, fish -n 4x3, nu-check 2x2, pwsh ParseFile 2x3: all OK | Axis 4 |
| Startup, median of 20 | starship init 2.5-2.7 ms; direnv hook 3.0 ms; mise activate 14.9-16.0 ms; mise hook-env 20.5 ms | Axis 4 |
| Emitter script lines | omp 4061 (9 files); fzf 2775 (9); atuin 1976 (8); zoxide 1344 (9); direnv 1205 (12 `shell_*.go`); starship 856 + 323 `mod.rs`; mise assets 195 + 2379 Rust in `src/shell/*.rs` | Axis 1 |
| Changelog bullets analysed | 15383 bullets / 1038 releases (7 repos; omp has none) | Axis 7 |
| Version-or-compat-flagged share of shell mentions | nu 21% (17/82), elvish 24% (5/21), fish 14% (18/129), bash 10% (18/176), zsh 6% (6/106), pwsh 4.5% (4/89) | Axis 7 |
| zoxide CHANGELOG nushell version-pin entries | 11 (vs 1 fish, 1 elvish) | Axis 7 |
| Test shells actually executed in CI | direnv 7 (bash zsh fish elvish tcsh pwsh murex), zoxide 9, mise 5 + Pester, omp 5, fzf 4, starship 0, atuin unknown, conda ~7 | Axis 6 |

## Axis 1: support matrix

Commands:

```
bash -c 'cd $E/ajeetdsouza__zoxide/templates && wc -l *'          # zoxide: 1344 total, 9 files
bash -c 'cd $E/starship__starship/src/init && wc -l *'            # starship: 1179 total incl mod.rs 323
bash -c 'cd $E/jdx__mise/src/shell && wc -l bash.rs zsh.rs fish.rs nushell.rs pwsh.rs elvish.rs xonsh.rs'   # 2379 total
python3 -I $F/lines.py                                            # table below (out/lines.txt)
```

| Tool (SHA12) | Shells targeted | Emitter location | Script lines | Stated minimum versions |
|---|---|---|---|---|
| zoxide (86b443cffcd7) | bash, zsh, fish, nushell, elvish, powershell, xonsh, tcsh, posix | `templates/{bash,zsh,fish,nushell,elvish,powershell,xonsh,tcsh,posix}.txt` (askama), `src/shell.rs` | 1344 (9 files) | nu 0.106.0+ (`nushell.txt:107`), elvish 0.18.0+ (`elvish.txt:120`), bash 4.4+ completions, pwsh 6.1/6.2 for `cd -` / `cd +` (`powershell.txt:37-41`) |
| direnv (28a73d1df3f3) | bash, zsh, fish, elvish, pwsh, tcsh, murex; non-shell: gha, gzenv, json, systemd, vim | `internal/cmd/shell_*.go` (Go `Shell` interface) | 1205 (12 files) | pwsh 7.2+, nu 0.104+ (docs only, uses `export json`), elvish 0.12+ |
| fzf (25adb674537b) | bash, zsh, fish, nushell (key-bindings + completion) | `shell/key-bindings.{bash,zsh,fish,nu}`, `shell/completion.*`; `go:embed` in `main.go:17-41`, flags at `src/options.go:2665-2674` | 2775 (9 files) | fish 3.4.0+; nu helix bindings gated on 0.115.0 via `(version)` |
| starship (d4d0459c5c24) | bash, zsh, fish, nu, ps1 (5.1 + 7), elvish, ion, tcsh, xonsh, cmd (clink lua) | `src/init/starship.*`, `src/init/mod.rs` | 856 scripts + 323 `mod.rs` | elvish 0.18+, nu 0.96+, bash 3.2 to latest |
| mise (19e8c8f0d03d) | bash, zsh, fish, nu, pwsh (alias powershell), elvish, xonsh; `sh` maps to bash | `src/shell/*.rs` (Rust `Shell` trait), `src/assets/bash/*.sh` | 195 asset + 2379 Rust | pwsh chpwd needs 7+ |
| atuin (56525ac6a7a9) | bash, zsh, fish, nu, ps1, xonsh | `crates/atuin/src/shell/atuin.{bash,zsh,fish,nu,ps1,xsh}` | 1976 (8 files) | bash 3.1+, nu 0.93.0 (gates at `(version).minor` 103/104/106), pwsh 5.1 + PSReadLine |
| conda (66d82122dc63) | posix, ash, bash, dash, zsh, csh, tcsh, xonsh, cmd.exe, fish, powershell, json | `conda/activate.py:906-1215` (`activator_map`) plus `shell/etc/profile.d/conda.sh`, `shell/etc/fish/conf.d/conda.fish`, `shell/condabin/Conda.psm1` | not counted (Python classes) | none stated in code |
| oh-my-posh (b0a8acd4d402) | bash, zsh, fish, nu, pwsh, elvish, xonsh, yash, cmd (lua) | `src/shell/scripts/omp.*`, `src/shell/{bash,fish,nu,elvish,yash,xonsh,pwsh,cmd}.go` | 4061 (9 files) | none stated; e2e pins nu 0.113.1 |

Observations:
- Widest: conda 11 shell families (plus json), omp 9, starship 10. Narrowest: fzf 4.
- Only direnv and omp ship elvish *and* a non-bash POSIX-ish shell variant (tcsh vs yash); nobody ships ksh/mksh/dash natively except conda's `dash`/`ash` classes that reuse POSIX templates.
- Emitter architecture: static scripts (fzf, atuin, starship, omp) vs. template engine (zoxide askama) vs. code with embedded strings (direnv, mise) vs. Python `%s` templates (conda). Static scripts scale best for line count per shell; code emitters need an escaper per output shell.

## Axis 2: escaping

### Strategies (quoted with file:line)

| Tool | Strategy | Function (file:line) |
|---|---|---|
| direnv bash/zsh | `$'...'`, hex-escape high bytes | `BashEscape`, `shell_bash.go:103-198` (SHA 28a73d1df3f3) |
| direnv fish | `'...'`, only `\\` and `\'` special; `'\Xhh'` for control | `shell_fish.go:107-162` |
| direnv tcsh | own escaper | `shell_tcsh.go:53-136` |
| direnv pwsh | `''` doubling; braced env key `${env:...}` with hex mapping | `shell_pwsh.go:70-204`, rationale comment `:206-242` |
| direnv elvish / murex / json | data channel: JSON, no quoting | `shell_elvish.go`, `shell_murex.go` |
| mise bash/zsh/fish | `shell_escape::unix::escape` (POSIX `'\''` splice; also `!` -> `'\!'`) | `src/shell/{bash,zsh,fish}.rs` (jdx/mise@19e8c8f0d03d) |
| mise elvish | own escaper because of the documented bug | `elvish.rs:118-141`, bug note `:118-125` |
| mise pwsh | `escape_sq` `''` doubling; `escape_env_name` | `pwsh.rs:408-414` |
| mise nu | CSV data channel for env; `r#'{v}'#` for prepend; deactivation CSV inside `'{csv}'` | `nushell.rs:30-36`, `:92` |
| starship | `shell_words::quote` (POSIX) for bash, zsh, fish, tcsh, xonsh, nu, elvish (`e:` prefix); own `sprint_pwsh`; cmd `"..."` | `src/init/mod.rs` (starship/starship@d4d0459c5c24) |
| omp | 7+ separate quoters | `src/shell/*.go`: QuotePosixStr, quoteFishStr, quoteNuStr, quoteElvishStr, quoteYashStr, quotePythonStr, quotePwshStr; yash comment: yash only understands `$'..'` since POSIX 2024 |
| conda | raw `%s` templates; escapes only PS1 in POSIX activator | `activate.py:940-943` |
| zoxide | no quoting; `{{cmd}}` interpolated raw (from CLI `--cmd`) | `src/shell.rs`, templates |
| fzf, atuin | static scripts, nothing to escape | n/a |

Four families: (A) shared POSIX quoter reused outside POSIX (mise, starship), (B) per-shell hand-written quoter (direnv, omp, mise's elvish/pwsh), (C) data-not-code channel (direnv elvish/murex/json, mise nu CSV), (D) none (zoxide, conda, fzf, atuin).

### Corpus

`$F/corpus.tsv`, 20 cases: squote, dollar, backtick, backslash, trailing_bs, dbl_bs, newline, cr_crlf, percent, unicode, lead_dash, lead_dashes, empty, inject, dquote, bang, glob_tilde, space_tab, operators, pwsh_special. Each case embedded as hex/base64, escaped by the extracted function, evaluated in the shell, bytes compared.

Commands (per family; each prints `n/20` per interpreter plus failing case names):

```
python3 -I $F/gen.py posix omp.posix && bash $M posix $F/s_posix_omp.posix.sh      # $'..' form
python3 -I $F/summarize.py fish mise.shell_escape_unix                              # etc.
bash $F/runall.sh ; bash $F/rerun2.sh                                               # results out/r_{posix,bash,zsh,fish,nu,elvish,pwsh}.txt
```

### Results (pass/fail, 20 cases)

| Function | Interpreters | Result |
|---|---|---|
| direnv.bash / omp.posix (`$'..'`) | bash 3.2-5.3, zsh 5.0.8-5.9, busybox ash 1.35/1.37, mksh R59c, ksh93u+m, bash --posix, zsh emulate sh | 20/20 |
| direnv.bash / omp.posix (`$'..'`) | dash 0.5.12, yash 2.52, posh 0.14.1 | 1/20 (`$'` unsupported) |
| omp.yash (`'\''`) | all POSIX shells | 20/20; yash 19/20 only on `unicode` (C-locale yash cannot read non-ASCII; passes with `LC_ALL=C.UTF-8`) |
| mise.shell_escape_unix, starship.shell_words (bash/zsh/posix) | bash, zsh, posix | all pass; yash fails only `unicode` (same C-locale cause) |
| direnv.fish | fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | 20/20 |
| omp.fish | same 4 | 20/20 |
| mise.shell_escape_unix used for mise's fish | same 4 | **17/20**: fails backslash, trailing_bs, dbl_bs |
| starship.shell_words used for fish | same 4 | **17/20**: same three |
| omp.nu, omp.nu/echo | nu 0.105.1, 0.116.0 | 20/20 |
| starship.shell_words (nu path) | nu 0.105.1, 0.116.0 | **18/20**: fails squote, inject |
| mise.shell_escape_unix on nu | nu | **17/20**: fails squote, inject, bang |
| omp.elvish | elvish 0.21.0 | 20/20 |
| mise.elvish | elvish 0.21.0 | 20/20 |
| starship.shell_words (elvish `e:` path) | elvish 0.21.0 | **18/20**: fails squote, inject |
| mise.shell_escape_unix on elvish | elvish 0.21.0 | **17/20**: fails squote, inject, bang; reproduces the bug documented at `elvish.rs:118-125` |
| direnv.pwsh, omp.pwsh, mise.pwsh_sq | pwsh 7.4, 7.6.6, Windows PowerShell 5.1 | 20/20 |

Reading: the shared quoter fails exactly where the target shell's single-quote semantic differs: fish treats `\` inside `'..'` as an escape, nu and elvish single-quoted strings cannot contain `'` at all. Failure set is predictable from the target shell's grammar, not random. 0 hand-written per-shell quoter x interpreter-family pairs failed (direnv bash/fish/pwsh, omp posix/fish/nu/elvish/pwsh, mise elvish/pwsh) on the shells where their syntax is supported.

False-positive note: the E2E rows below independently reproduce the fish backslash and the nu/elvish apostrophe failures with real released binaries, so those harness failures are not artifacts. The yash `unicode` failure was a harness artifact (locale) and is reported separately, not counted. A per-case spot-read of every failing cell was not repeated in this pass.

### Windows PowerShell 5.1 native-pipe encoding

```
bash $M pwsh $F/s_pwsh_native_pipe.ps1     # out/pwsh_native_pipe.txt
```

Windows PowerShell 5.1 `[Console]::OutputEncoding` = IBM437, so non-ASCII literals passed through a native process's stdout are mangled: direnv.pwsh and mise.pwsh_sq fail the `'héllo...'` round trip on 5.1. omp.pwsh passes because it emits ASCII-only `[char]0xE9`-style expressions (`pwsh.go:46-101`, cites the OEM code page). pwsh 7.4/7.6.6: pass (UTF-8). Stand-in native emitter was `cmd /c type`; direnv itself refuses pwsh below 7.2, so the direnv 5.1 case is theoretical.

### End-to-end with released binaries

```
ocx --project $F/ocx/ocx.toml exec -- mise env -s fish   # in $F/e2e/mise, mise.toml [env] BS_DBL='a\\b'
fish -c 'source env.fish; ...'                           # chk.fish compares bytes
ocx ... exec -- direnv export <shell>                    # $F/e2e/direnv/.envrc (10 hostile values), chk.* scripts
```

| Case | Result | Raw |
|---|---|---|
| mise 2026.10.2 fish, `BS_DBL='a\\b'` | emitted file loads; value is `a\b` (hex 615c62, expected 615c5c62) on fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | `out/e2e_mise_fish2.txt` |
| mise fish, value `C:\dir\` (trailing backslash) | fish: "quotes are not balanced", no variable from that output set, 4/4 | `out/e2e_mise_fish.txt` |
| mise bash, zsh, elvish, pwsh | correct by inspection | `e2e/init/mise.*` |
| starship 1.25.1 installed at `.../o'brien/starship` | `init nu` sourced in nu 0.116.0: "Unclosed delimiter"; `init elvish` in elvish 0.21.0: "string not terminated"; fish/bash/pwsh OK | `e2e/sq/` |
| direnv 2.37.1 export, 10 values | 10/10 bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6.0-4.9.3, elvish 0.21.0 (JSON), pwsh 7.6.6 | `summ_e2e.py` |
| direnv 2.37.1 export on pwsh 7.4.7 | 9/10: `${env:H_EMPTY}=''` removes the variable | `e2e/direnv/pe.ps1` |

pwsh empty-value semantics (`pe.ps1`): `$env:X=''` removes the variable in pwsh 7.4.7 and Windows PowerShell 5.1.26100.9444, keeps it empty in 7.6.6. Version-dependent; any emitter that sets an empty env var through `$env:` is version-sensitive. (The 5.1 run of `chk.ps1` showing 0/10 is a staging artefact: only the script, not `.envrc` data, was copied. Disregard.)

Released binaries (direnv 2.37.1, mise 2026.10.2, starship 1.25.1) are older than the corpus HEADs (e.g. direnv changelog already reads "fix: escape the direnv path in bash code (#1626)" in 2.38.x). Corpus-HEAD source defects were demonstrated by running the verbatim extracted functions; the E2E rows prove the released-binary behaviour.

## Axis 3: hooks

| Shell | Mechanisms seen | Who uses what |
|---|---|---|
| bash | `PROMPT_COMMAND` (string, array from 5.1), DEBUG trap, `PS0` (4.4+), bash-preexec (vendored), blehook, `cd`/`pushd`/`popd` wrapping | zoxide: PROMPT_COMMAND (`bash.txt:64-74`); direnv: PROMPT_COMMAND (`shell_bash.go:13-32`); mise: PROMPT_COMMAND + optional chpwd wrapper (`assets/bash/activate.sh:65-76`); starship: PROMPT_COMMAND + DEBUG trap for <4.4, PS0 for 4.4+ (`starship.bash:129-138`); atuin: bash-preexec/ble.sh; omp: array PROMPT_COMMAND (`omp.bash:189-215`) |
| zsh | `precmd_functions`, `chpwd_functions`, `add-zsh-hook` | direnv `shell_zsh.go:15-34`, mise via add-zsh-hook |
| fish | `--on-event fish_prompt`, `--on-variable PWD`, `fish_preexec/postexec`, `functions -c` wrapping of `fish_prompt` | zoxide, direnv, mise; conda wraps `fish_prompt` with a guard |
| nu | `hooks.pre_prompt`, `hooks.env_change.PWD`, `pre_execution`, PROMPT_COMMAND closures, autoload dirs | zoxide, mise, atuin, fzf, starship, omp |
| elvish | `edit:before-readline`, `after-chdir`, `edit:after-command` | direnv, mise, zoxide, starship |
| pwsh | prompt function wrapping, `LocationChangedAction` with `[Delegate]::Combine`, PSReadLine handlers | mise (`pwsh.rs`), zoxide, starship (replaces global prompt, exposes `Invoke-Starship-PreCommand`), conda module renames `prompt` to `CondaPromptBackup` |
| xonsh | `@events.on_precommand`, `on_post_prompt` | zoxide, mise, atuin, starship |
| tcsh | `alias precmd` | zoxide, starship, direnv |

Re-source guards (idempotence on a second `eval`):

| Tool | bash | zsh | fish | other |
|---|---|---|---|---|
| zoxide | PROMPT_COMMAND pattern check | removes then appends | function redefinition | pwsh `$global:__zoxide_hooked`; nu `__zoxide_hook` marker; elvish `$E:__zoxide_shlvl` vs SHLVL (but `before-chdir` appended unconditionally); tcsh pattern check |
| direnv | pattern check | `(I)` index check | function redefinition | elvish and murex: **no guard** (elvish hook appended every time) |
| mise | pattern check, array-aware | `add-zsh-hook` dedupes | n/a | elvish `conj` **no guard**; pwsh `Test-Path variable:global:__mise_pwsh_chpwd` |
| starship | overwrites PS1; old PROMPT_COMMAND saved to `STARSHIP_PROMPT_COMMAND` | overwrite | overwrite | pwsh replaces global prompt without wrapping |
| atuin | `__atuin_initialized` include guard (`atuin.bash.d/include-guard.bash`), interactive only | same | same | |
| omp | dedupes `_omp_hook`, skips `source*` entries | | | |
| conda | | | wraps `fish_prompt` with `functions -c` plus guard | pwsh module renames prompt |

Guard presence: 5 of 8 tools guard against double init in bash; 2 of the guarded pairs leave elvish unguarded (direnv, mise) — elvish is the shell with the thinnest guard coverage.

### PROMPT_COMMAND coexistence (measured)

```
bash $F/pc.sh              # snippets verbatim: zoxide bash.txt:65-74; direnv shell_bash.go:23-31; mise activate.sh:65-76; starship starship.bash:129-138; omp omp.bash:189-215
python3 -I $F/pc_sum.py    # summarises out/pc_all.txt, out/pc_single.txt
```

Each emitter's hook snippet is sourced in all 25 ordered pairs plus 5 singles, under three presets (PROMPT_COMMAND unset, string, array), in an interactive `bash -i` fed three prompts; pass = every hook fired on each prompt.

| bash | Scenarios (realistic: unset + string, plus array on 5.1+) | Failing | Notes |
|---|---|---|---|
| 3.2 | 50 | 18 | all involve omp |
| 4.0, 4.2, 4.4, 5.0 | 50 each | 16 each | all involve omp |
| 5.1, 5.2, 5.3 | 75 each | 0 | |

- The four non-omp emitters (zoxide, direnv, mise, starship) coexist in every scenario on every version. 0 failures.
- Cause (omp): `omp.bash` always assigns `PROMPT_COMMAND` as an array. In bash 3.2 to 5.0 only element 0 of an array `PROMPT_COMMAND` runs, so `_omp_hook` at index 1+ never fires if anything is already set. On bash 3.2, `"${PROMPT_COMMAND[@]}"` on an unset variable even yields an empty first element.
- Caveat: snippet in isolation; the full omp script needs the oh-my-posh binary (not available). omp may compensate elsewhere in the script; this was not verified. Severity therefore: "plausible live defect on bash <= 5.0, e.g. macOS /bin/bash 3.2, unconfirmed with the real binary".
- Spot-read of failing scenarios was done on the trace output in `out/pc_all.txt` during the run; no false positive was found there, but the sample size was small (not tabulated).

## Axis 4: init model

| Model | Tools |
|---|---|
| `eval "$(tool init X)"` (every shell start) | zoxide, direnv, starship, mise, atuin (bash/zsh/fish) |
| Stub + second phase (`--print-full-init`) | starship (stub runs `init X --print-full-init` for bash 3.2 / POSIX-mode safety, because `source <(...)` fails on bash 3.2, 4.0 and POSIX mode <= 5.0; fish `| psub`; pwsh `Out-String`; zsh and nu print the full script directly) |
| Generated file sourced | zoxide tcsh, nu via `save` |
| Nu autoload dir | fzf (`$nu.user-autoload-dirs | first`, `install:445-453`), starship docs (`$nu.data-dir/vendor/autoload`, `README:266-275`), omp (`initNu` writes to the autoload dir; `NUAUTOLOADDIR` cached; `filesystem.go`) |
| fish conf.d | conda (`shell/etc/fish/conf.d/conda.fish`), direnv `install -d $(SHAREDIR)/fish/vendor_conf.d` (`GNUmakefile:176-177`) |
| Disk-cached init script | omp only |
| Embedded in binary (no file to install) | fzf (`go:embed`, `main.go:17-41`) |
| Hook runs binary each prompt | direnv (`direnv export`), mise (`hook-env`), starship (prompt) |

omp disk cache (`filesystem.go`): filename `init.<fnv64a(configPath)>.<ext>`; invalidation key `INITVERSION<SHELL>[STRICT]` with value `ConfigHash + build.Version` stored in `cache.Device`; atomic temp-file + rename, skipped if bytes equal, Windows retry, in-place fallback. pwsh and elvish use `--eval` / `--print` and are not cached. Only tool in the set with explicit invalidation by version+config hash; everyone else re-runs the generator every shell start (cheap, see below).

mise: the `activate` output embeds the absolute exe path; moving the binary needs a new `eval`.

### Real-output parse checks (synthesised files in `$F/e2e/init/`)

```
bash $F/e2e/init/drive.sh > $F/out/parse_init.txt     # bash -n x8, zsh -n x4, fish -n x4, nu-check x2, elvish -compileonly
bash $M pwsh $F/e2e/init/ppwsh.ps1                    # Parser::ParseFile, pwsh 7.4 + 7.6.6
```

Files: `mise.{bash,zsh,fish,nu,elvish,pwsh,xonsh}` (mise 2026.10.2 `activate`), `starship.{bash,zsh,fish,nu,elvish,powershell,xonsh,ion,tcsh}` (1.25.1 `init`), `direnv.{bash,zsh,fish,pwsh,elvish,tcsh,murex}` (2.37.1 `hook`).

| Shell | Interpreters | Files | Result |
|---|---|---|---|
| bash `-n` | 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 | mise, starship, direnv | 24/24 OK |
| zsh `-n` | 5.0.8, 5.3.1, 5.8, 5.9 | 3 | 12/12 OK |
| fish `-n` | 3.6.0, 4.0.2, 4.7.0, 4.9.3 | 3 | 12/12 OK |
| nu `nu-check` | 0.105.1, 0.116.0 | mise.nu, starship.nu | 4/4 OK |
| pwsh ParseFile | 7.4, 7.6.6 | 3 | 6/6 OK |
| elvish `-compileonly` | 0.21.0 | 3 | harness limitation: errors are only `$edit:...` unbound variables (non-interactive elvish has no `edit:` namespace); 0 non-`edit:` errors in all 3 files, so syntax is fine but not verified |
| pwsh 5.1 | | | not run (staging copy missing the files; see Gaps) |

Note: `starship init nu --print-full-init` prints "Shell name detection failed on phase two init" (179 bytes): nu has no phase two; plain `starship init nu` prints the full 2571-byte script. Not a defect, but the stub-vs-full asymmetry is a trap for anyone calling `--print-full-init` uniformly.

Verdict on H3-adjacent claim "version drift breaks emitted code": 0 parse failures across 8 bash + 4 zsh + 4 fish + 2 nu + 2 pwsh versions for default (non-hostile) output. Breakage comes from hostile input (Axis 2), not from the interpreter version window tested.

### Startup cost

```
ocx --project $F/ocx/ocx.toml exec -- env WORK=$F/work python3 -I $F/startup.py     # 21 runs each, first discarded, subprocess wall time
```

| Command | median ms | min | max |
|---|---|---|---|
| starship init bash | 2.7 | 1.9 | 5.8 |
| starship init zsh | 2.7 | 1.7 | 4.1 |
| starship init fish | 2.5 | 1.7 | 3.3 |
| starship init nu | 2.6 | 2.2 | 3.3 |
| mise activate bash | 16.0 | 11.6 | 22.5 |
| mise activate fish | 14.9 | 11.5 | 19.8 |
| mise hook-env -s bash (empty dir) | 20.5 | 16.0 | 32.2 |
| direnv hook bash | 3.0 | 2.0 | 3.9 |
| direnv export bash (no .envrc) | 2.7 | 1.9 | 3.4 |

Extreme: mise is 5-6x the others on activate, and its per-prompt `hook-env` (20.5 ms) is the largest recurring prompt tax of the three. Measured on WSL2 with warm cache; the absolute numbers are machine-specific, the ratios are the finding. Not measured: omp (binary unavailable), atuin, zoxide (no released binaries in the ocx pin).

## Axis 5: deactivation and PATH

| Tool | State model | Deactivate | PATH handling (file:line) |
|---|---|---|---|
| direnv | `DIRENV_DIFF` = zlib+base64 JSON `EnvDiff{Prev,Next}` (gzenv); `IgnoredKeys` include PS1, PWD, others (`env_diff.go`) | revert by applying inverse diff on leaving the dir | fish/tcsh `export` splits PATH on `:`; nu docs re-convert via `(env-conversions).path.from_string` |
| mise | `__MISE_DIFF`, `__MISE_ORIG_PATH`, `__MISE_SESSION` | `build_deactivation_script`: clears old env, aliases, completions, then shell-specific deactivate (`assets/bash/deactivate.sh` removes PROMPT_COMMAND entries, chpwd functions, `mise` function) | fish: `fish_add_path --global --path` (`--move` for reorder); nu: `(char esep)` + `split row`; pwsh: `[IO.Path]::PathSeparator` (`pwsh.rs:382`); elvish: separator inserted inside quoted value (`elvish.rs:92-101`) |
| conda | `CONDA_SHLVL` stack, `CONDA_PREFIX_N` | `deactivate` pops stack | `pathsep_join` per activator; cygpath on Windows; `unset_var_tmpl = "export %s=''"` avoids `unset` under `set -u` (`activate.py:914-917`) |
| starship | none (no env mutation) | n/a | n/a |
| zoxide, fzf, atuin | none | n/a | fzf nu installs via autoload dir |
| omp | none | n/a | n/a |

conda PATH logic read (`activate.py:677-745`, SHA 66d82122dc63):
- `_add_prefix_to_path` prepends the env dirs unconditionally: no dedupe. Re-activating the same env without deactivating stacks duplicates only if the caller bypasses `CONDA_SHLVL` bookkeeping.
- `_replace_prefix_in_path` deletes the *contiguous range* `first_idx..last_idx` between the first and last prefix dirs, i.e. it removes any foreign entries a user interleaved (`path_list[first_idx:last_idx+1]`). On Linux the prefix has one dir so this is a no-op risk; with multi-dir prefixes (Windows `Library\bin` etc.) it matters.
- `path_list[last_idx + 1]` is read unguarded (line ~735): if the env bin dir is the last PATH element, IndexError.

```
python3 -I $F/conda_path.py     # verbatim logic extracted from activate.py:712-737, out/conda_path.txt
['/a','/p/bin','/b']              -> ['/a','/b']
['/a','/p/bin']                   -> IndexError list index out of range
['/p/bin','/x','/q/bin','/y']     -> ['/y']       # prefix dirs [/p/bin,/q/bin]: interleaved /x also deleted
```

Reproduced on the verbatim logic in isolation, not through conda itself (conda is not installed; `paths_equal` replaced by `==`). Practical likelihood low on Linux (env `bin` is rarely the last PATH entry).

Not run: nu `$env.PATH` list typing (documented, not executed); mise `nushell.rs:92` single-quoted CSV embedding with a value containing `'` (reasoned about only, see Gaps).

## Axis 6: tests

Commands: `python3 -I $F/tests.py` (out/tests.txt), reading CI under `.github/workflows/`, `GNUmakefile`, `flake.nix`.

| Tool | Real interpreters in test? | Counts (measured) | CI platforms | Notes |
|---|---|---|---|---|
| zoxide | yes: bash, dash, elvish, fish, nu, pwsh, tcsh, xonsh, zsh, plus shellcheck, shfmt, fish_indent, black, mypy, pylint | 2 `#[test]` in `src` (1 file) — one big feature-gated (`nix-dev`) test over a 24-combination matrix (cmd x hook x echo x resolve_symlinks) | ubuntu-latest + nix (`ci.yml`) | fish test asserts `!source.contains("builtin abbr")`; no Windows, no macOS |
| direnv | yes: `test/direnv-test.{bash,zsh,fish,elv,tcsh,ps1,mx}` via `GNUmakefile:104-161`, `flake.nix:142-145` | 55 Go `func Test*` in 14 files; 32 in 12 shell-related files | go.yml: macOS, ubuntu, windows; only macOS runs `make test-bash` | `shell_hook_test.go` SIGINT test covers bash and zsh; `direnv-test.ps1` uses `:` separator (Linux-only) |
| fzf | yes: Ruby tmux integration | 443 `def test_` in 9 files; 42 in `test_shell_integration.rb` (bash, zsh, fish, nushell) | linux.yml installs zsh, fish, tmux, shfmt, pinned nushell 0.114.1-0; macOS via brew | CI pins nu because 0.115.0 runs external completers on a background thread (`linux.yml:42-43`, nushell/nushell#18771) |
| starship | **no** | 4 `#[test]` in `src/init/mod.rs`, all path-escape unit tests | CI shellchecks/shfmts install scripts only | the two E2E failures in Axis 2 (nu, elvish apostrophe path) are the class these tests do not cover |
| mise | yes | 81 `#[test]` in `src/shell/*.rs` (8 files), 72 snapshot blocks in 36 insta files, 23 files in `e2e/shell` (bash, fish, nushell, xonsh, zsh; **no elvish**), 339 Pester `It` in 103 `e2e-win/*.ps1` | `test-impl.yml` Linux + Windows | elvish escaper has a documented bug and no e2e run |
| atuin | unknown (sparse clone) | n/a | `.buildkite/scripts/install-blesh.sh` (ble.sh e2e), `shellcheck.sh` referenced | |
| conda | yes (in CI) | tests not in sparse checkout | `tests.yml:164-185` pwsh stable + preview on Windows; `:305-330` ash csh fish tcsh zsh + xonsh via conda, then `conda init --all` for `tests/shell` | |
| oh-my-posh | yes | 25 Go `func Test*` in 11 files in `src/shell` (e.g. `TestQuoteFishStr` with `omp's` and backslash cases, `TestQuotePwshStr`) | `e2e.yml`: bash, zsh, fish, pwsh, nu on Linux; pwsh + nu on Windows; `NU_VERSION 0.113.1` | only tool besides fzf with pinned nu in e2e |

Takeaway: the only tools that run hostile quoting through the real target shell are direnv (Go tests + bash/zsh/fish/elvish/tcsh/pwsh/murex scripts) and, partially, omp. mise has the most test volume (81 + 72 + 339) but nothing for elvish or hostile fish values, and that is exactly where the measured defects are.

## Axis 7: version churn (H9)

```
python3 -I $F/changelog.py      # bullets per repo, per-shell mention counts, VC/M
python3 -I $F/changelog2.py     # version-or-compat flag: keyword classifier over bullets that mention the shell (exact regex in the script)
```

Entries: zoxide 234 bullets / 38 releases; direnv 548/72; fzf 628/156; starship 351/37; mise 7810/423; atuin 1229/57; conda 4583/327; total 15383 bullets / 1038 releases. oh-my-posh: no CHANGELOG in the corpus.

"VC/M" = version-or-compat-flagged entries / total entries mentioning the shell:

| Shell | VC/M | Flagged share | zoxide | fzf | atuin | mise |
|---|---|---|---|---|---|---|
| nushell | 17/82 | 21% | 8/25 | 3/5 | 4/23 | 2/14 |
| fish | 18/129 | 14% | | | | |
| bash | 18/176 | 10% | | | | |
| zsh | 6/106 | 6% | | | | |
| pwsh | 4/89 | 4.5% | | | | |
| elvish | 5/21 | 24% (small n) | | | | |
| xonsh | 1/19 | 5% | | | | |
| tcsh | 0/15 | 0% | | | | |

False-positive spot-read (3 hits per pattern, enlarged where cheap): nu ~1 in 9 (a merged multi-line fzf bullet); fish ~3 in 14; bash ~3 in 15 (mostly fzf merged bullets and the word "break"). So the flagged percentages carry roughly 10-20% noise; the *ordering* nu/elvish > fish > bash > zsh > pwsh is stable under that noise, the exact percentages are not.

zoxide CHANGELOG nushell version-pin entries: 11 (lines 34, 94, 116, 150, 167, 190, 235, 303, 318, 341, 361; minimum 0.32 up to 0.106) versus 1 each for fish and elvish.

Other nu breakages: fzf `str downcase` deprecation on nu 0.114.0, helix bindings on 0.115.0, CI pinned `nushell=0.114.1-0` because 0.115.0 runs external completers on a background thread (`linux.yml:42-43`); mise `str upcase` and `get -i` deprecations; atuin Nushell 0.111 and 0.112 entries; omp e2e pins NU_VERSION 0.113.1.

Fish also churns: starship fish <3.4.0 support restore, atuin fish 4.0 up-binding, zoxide fish 4.1.0+, fzf fish 4.3.3+, direnv fish completions fix.

Live check: `def run` is accepted by nu 0.105.1 and rejected by 0.116.0 (keyword collision), so a one-line identifier can break across the two tested versions. Counter-evidence: rendered zoxide `nushell.txt` (via `$F/render_zoxide.py`, `zo/chk.nu`) sources fine on both nu 0.105.1 and 0.116.0 and mise.nu/starship.nu parse on both: 0 emitted-code breakages in that window for the default output.

Verdict H9: directionally supported (nu has the highest flagged share and the most per-tool version pins, zoxide alone 11), but not "riskiest by volume" — bash and fish have more total mentions and fish is close behind in flagged share. Hypothesis survives as "nu is the shell most often version-pinned", not "nu emitters break most often".

## Smells (ranked)

1. **Shared POSIX quoter reused for fish/nu/elvish.** mise (fish: 17/20, nu 17/20, elvish 17/20 documented) and starship (fish 17/20, nu 18/20, elvish 18/20). Two reproduce E2E with released binaries: mise fish `a\\b` corrupted, `C:\dir\` makes the whole file unparseable; starship nu/elvish unparseable at an apostrophe install path. Cause: fish treats `\` in `'..'` as escape; nu/elvish single quotes cannot hold `'`.
2. **Hook array assignment on old bash.** omp.bash always assigns PROMPT_COMMAND as an array; inert for any other hook on bash 3.2-5.0 (18/50, 16/50 scenarios fail; 0/75 on 5.1+). Isolated-snippet measurement.
3. **Silent corruption, not failure.** mise fish `BS_DBL` arrives modified with exit 0; the user never sees an error. Worse than the parse failure.
4. **No hostile-input test per target shell.** starship 4 unit tests, zero interpreters; mise no elvish e2e; zoxide no Windows. Each measured defect sits in an untested cell.
5. **`$'..'` quoter used where the target may be dash/yash/posh.** 1/20 on those shells. Safe only because bash/zsh targeting is explicit; breaks if `sh` is mapped to dash (mise maps `sh` to bash, fine). omp's yash path correctly uses `'\''` with a comment.
6. **Unguarded re-source in elvish.** direnv and mise append hooks every eval; zoxide appends `before-chdir` unconditionally.
7. **pwsh empty env value semantics differ by version** (`$env:X=''` removes in 7.4.7 and 5.1, keeps in 7.6.6). direnv 2.37.1 loses `H_EMPTY` on 7.4.7.
8. **pwsh 5.1 OEM code page mangles non-ASCII literals** passed through native stdout; only omp avoids it (ASCII `[char]0x..` expressions).
9. **conda `_replace_prefix_in_path`:** contiguous-range delete and unguarded `path_list[last_idx+1]` (IndexError on isolated logic). Low likelihood.
10. **Raw template interpolation:** zoxide `{{cmd}}` and conda's raw `%s` (only PS1 escaped). Input is trusted CLI/config, so low risk but unquoted.
11. **mise startup cost:** 15-21 ms activate/hook-env vs 2.5-3 ms for the others.

## Patterns worth encoding

1. **One quoter per target shell, derived from that shell's grammar.** direnv, omp, mise-elvish, mise-pwsh: 0 failures where their syntax is supported. Encode as: never reuse `'\''` for fish (backslash), nu or elvish (no `'` in single quotes).
2. **Data channel over code channel when the shell has a data format.** direnv elvish/murex/json, mise nu CSV: nothing to escape.
3. **Quoter pass criteria = a 20-case hostile corpus** (squote, backslash, trailing backslash, dbl backslash, newline, CR, unicode, leading dash, empty, `$()`, backtick, `!`, glob, tab) run via a real interpreter and compared byte-for-byte; every tool's defect on this list was found by exactly these cases.
4. **Stub + `--print-full-init` two-phase init** (starship) to survive bash 3.2 / POSIX-mode where `source <(...)` fails.
5. **Idempotence guards, per shell, declared once.** bash pattern check on PROMPT_COMMAND (array-aware), zsh `add-zsh-hook`, fish function redefinition, pwsh `$global:` flag, atuin include guard. Elvish is the gap.
6. **Append-safe PROMPT_COMMAND.** Preserve the old value (starship `STARSHIP_PROMPT_COMMAND`), check string vs array, never assign a bare array when bash may be < 5.1.
7. **Version gates in the script, not in the emitter** where possible: atuin and fzf use `(version).minor` in nu; zoxide pins in the template header; omp/fzf pin nu in CI.
8. **omp-style init cache with `ConfigHash + build.Version` key and atomic rename** for tools whose init is expensive.
9. **`unset_var_tmpl = "export %s=''"`-type care for `set -u`** and a documented reason (conda).
10. **ASCII-only emission on pwsh 5.1** (`[char]0xE9`) to dodge the OEM code page; check native-pipe round trip.
11. **Nu autoload dir** for installation: no edit of config.nu (fzf, starship docs, omp).
12. **Per-shell test scripts executed by real interpreters in CI** (direnv's `test/direnv-test.*`, fzf's tmux Ruby tests, omp e2e).

## Contradictions of the frame

- **H3 (escaping edge cases found by running emitted code through the matrix): confirmed, with a sharper form.** Defects are not diffuse; they sit in a single, predictable class: the POSIX quoter applied to a shell whose single-quote semantics differ. 0 hand-written per-shell quoters failed where their syntax is supported, so "escape bugs everywhere" is wrong: escape bugs are where a quoter is *shared*.
- **H9 (nu emitters riskiest): partly contradicted.** Nu has the highest flagged-share of shell-mentions (21%) and zoxide has 11 nu pins, but (a) nu has fewer total entries than bash and fish; (b) default emitted nu code from zoxide, mise, starship parsed on both nu 0.105.1 and 0.116.0 with 0 failures; (c) elvish has the higher flagged share (24%, n=21) and the thinnest guards and tests; (d) the live failure found in nu was escaping (shared quoter), not version churn. Changelog noise is 10-20%.
- **"Bash has lots of online pitfalls" (relayed request): the measured bash defects are small in number and concentrated.** 0 failures across zoxide/direnv/mise/starship on 8 bash versions; one tool (omp array hook) fails on <= 5.0; `$'..'` is unsupported on dash/yash/posh. The relevant bash pitfalls are PROMPT_COMMAND array semantics (<5.1) and `source <(...)` on 3.2/4.0/POSIX<=5.0 (starship's stub exists for it), not escaping.
- **"Version drift breaks emitted code":** over the version windows tested (8 bash, 4 zsh, 4 fish, 2 nu, 2 pwsh) default output parsed everywhere. The only version-dependent *behaviour* found was the pwsh empty-env-var semantics (7.4.7/5.1 vs 7.6.6) and nu keyword `run`.
- **Test volume does not predict defects:** mise has the most tests and the most measured shell defects; direnv has fewer and none.
- **Startup cost is not a shell-portability issue:** the cost sits in mise's per-prompt `hook-env`, independent of target shell.

## Gaps

- **Sparse clones:** starship, mise, atuin, conda test directories absent from the corpus; atuin test count unknown; conda `tests/shell` unread.
- **oh-my-posh has no CHANGELOG** in the corpus, so Axis 7 excludes it. omp.bash was measured as an isolated snippet only (the full script needs the oh-my-posh binary, which is not in the ocx index pin).
- **Not run in real shells:** tcsh (direnv.tcsh), xonsh, ion, murex, omp python/xonsh quoter (`omp.python`); no tcsh in the matrix.
- **Binary vs source drift:** E2E used direnv 2.37.1, mise 2026.10.2, starship 1.25.1; corpus HEADs are newer (direnv 2.38.x already has an "escape the direnv path in bash code" fix, #1626). Source-defect claims for mise/starship rest on the verbatim function extraction plus the released binary; neither is proven on HEAD.
- **elvish parse check** uses `-compileonly`, which cannot resolve `edit:`; syntax-level only.
- **Windows PowerShell 5.1:** direnv e2e (staging copied only the script) and the 5.1 parse check are invalid and omitted; the pwsh native-pipe encoding test (`s_pwsh_native_pipe.ps1`) is valid. Native emitter was `cmd /c type`, not direnv.
- **macOS:** all claims read-only and unverified. The bash 3.2 runs use the docker `bash:3.2` image, not Apple's BSD userland or its patched /bin/bash.
- **mise nu `'{csv}'` at `nushell.rs:92`** and the `r#'..'#` prepend: reasoned about as a hazard, not executed.
- **Changelog heuristic:** keyword-regex classifier, 10-20% false positives; merged multi-line fzf bullets inflate bash/nu counts.
- **Startup:** subprocess wall time on one WSL2 host; omp, atuin, zoxide not measured.
- **Line counts:** earlier ad-hoc counts (zoxide 1722, starship 1179 as "scripts") differ from the python-measured numbers used here (zoxide 1344, starship 856 + 323 `mod.rs`). The earlier values included extra files; the numbers above come from `lines.py` and `wc -l`.

## Prior-art patterns

### Convergent (nearly all tools do it)

| Strategy | Who |
|---|---|
| Print code to stdout, caller evals it (`eval "$(tool init X)"`) | zoxide, direnv, starship, mise, atuin (omp for pwsh/elvish) |
| One independent emitter per target shell, no shared IR | all except conda's shared Activator base and zoxide's askama |
| Prompt hook as the primary trigger (`PROMPT_COMMAND`, `precmd`, `fish_prompt`, `pre_prompt`) | direnv, mise, zoxide, starship, omp |
| Nu autoload directory over editing `config.nu` | fzf, starship, omp |
| Pin the nu version in CI after breakage | fzf (0.114.1-0), omp (0.113.1) |
| Idempotence guard on bash and fish | zoxide, direnv, mise, atuin, omp |
| Snapshot or golden tests for emitted text | mise (72 insta blocks), zoxide (matrix test), omp, direnv Go unit tests |

### Divergent (real design split)

| Question | Option A | Option B | Option C |
|---|---|---|---|
| Quoting | one POSIX quoter reused (mise, starship): 17-18/20 on non-POSIX | per-shell quoter (direnv, omp): 20/20 | data channel (direnv JSON, mise nu CSV): n/a |
| Where does shell code live | static script files, embedded (fzf, atuin, starship, omp) | template engine (zoxide) | string-building in code (direnv, mise, conda) |
| Env restoration | recorded diff in an env var (direnv `DIRENV_DIFF`, mise `__MISE_DIFF`) | shell-level stack (conda `CONDA_SHLVL`) | none, because nothing is mutated (starship, zoxide, fzf, atuin, omp) |
| Init freshness | regenerate each shell start (most) | disk cache with version+config key (omp) | build-time embedding (fzf) |
| Hook cost model | binary runs per prompt (direnv 2.7 ms, mise 20.5 ms) | shell-only precmd, binary only on demand (zoxide, atuin) | |
| Bash hook install | string PROMPT_COMMAND, array-aware (zoxide, direnv, mise, starship) | unconditional array assignment (omp) | bash-preexec / ble.sh (atuin) |
| Windows PowerShell 5.1 | support with OEM-safe output (omp), PSReadLine (atuin 5.1+) | require pwsh 7+ (direnv 7.2+, mise chpwd 7+) | |
| Tests | real interpreters (direnv, fzf, omp, mise, zoxide) | unit/snapshot only (starship) | |
