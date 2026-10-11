---
title: "rc files, idempotent edits and hook registration per shell"
topic: "emit/rc-and-hooks (W2-12), rows M-M-06..M-M-12, M-M-16, M-M-19, M-M-20, M-K-04, M-J-03, M-I-03, M-L-02; rule family SH-EMIT"
agent: "w2-emit-rc-and-hooks"
model: sonnet
date_researched: 2026-10-11
sources_count: 32
fixtures: "/home/mherwig/.cache/research-lang/shell-tools/fixtures/rc-and-hooks/"
scope: |
  Covers where an emitter or installer writes per shell (bash, sh, zsh, fish, nushell, elvish, Windows PowerShell 5.1 and pwsh 7),
  how it edits an rc file idempotently (marker, guard, newline, symlink, mode, undo), how it registers and unregisters a prompt hook
  without clobbering the user's hooks, why `source <(...)` is never emitted, version guards for churny targets, PATH-list idioms, and launcher forwarding.
  Does not cover quoting/escaping per target (W2-11), completion registration, prompt theming, or fixing ocx (owner Q6: defects are reported with file:line and a reproducer).
  No macOS host: every macOS or BSD claim is marked "unverified: read only". Dates are 2026-10-11; versions tag every claim.
---

# rc files, idempotent edits and hook registration per shell

Paths below that start `fixtures/rc-and-hooks/` mean `/home/mherwig/.cache/research-lang/shell-tools/fixtures/rc-and-hooks/`.
`matrix.sh` means `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`. Exemplar SHAs are in `shell-audit/scratch/exemplar-shas.md`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1 Which files each shell reads (measured)
   - 2 The per-shell rc-target table (decision)
   - 3 The idempotent-edit contract
   - 4 Symlinked rc and mode: ocx reproducer
   - 5 Bash prompt hooks: PROMPT_COMMAND string vs array
   - 6 zsh, fish, nushell, elvish, PowerShell hook forms
   - 7 The undo contract
   - 8 `source <(...)` and `eval "$(...)"`
   - 9 Version guards for churny targets
   - 10 PATH-list idioms per target (M-M-19)
   - 11 Launchers: `exec "$@"` and embedded strings (M-M-12)
   - 12 Environment hazards: p10k, distro skeletons, macOS (read only), PowerShell encoding
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A login bash reads the FIRST existing of `~/.bash_profile`, `~/.bash_login`, `~/.profile` and ignores the others; a block written to `.profile` is dead when `.bash_profile` or `.bash_login` exists (measured bash 3.2 and 5.3).
- An interactive non-login bash reads only `~/.bashrc`; Git Bash 5.2.15 behaves the same (`-l` reads `.bash_profile`, `-i` reads `.bashrc`). Put env in the login file, hooks in `.bashrc`, and make sure the login file sources `.bashrc`.
- zsh order is `.zshenv`, `.zprofile` (login), `.zshrc` (interactive), `.zlogin` (login); `$ZDOTDIR` replaces `$HOME` for all four; `zsh -c` reads only `.zshenv` (measured 5.0.8 and 5.9).
- fish reads user `conf.d/*.fish`, then `vendor_conf.d`, then `config.fish`, for every fish including non-interactive ones. An emitter owns one file `conf.d/<tool>.fish` and never edits `config.fish`.
- nushell reads `env.nu`, `config.nu`, `login.nu` (login only), vendor autoload dirs, then user autoload (measured 0.105.1 and 0.116.0). `login.nu` comes BEFORE autoload; the wave-1 ocx audit said last and was wrong. `nu -c` and `nu script.nu` read no autoload at all, so nu hooks exist only in the REPL.
- elvish reads `$XDG_CONFIG_HOME/elvish/rc.elv` (else `~/.config/elvish/rc.elv`) in the interactive REPL only; `elvish -c` and `elvish file.elv` skip it. `~/.elvish` is ignored from 0.21.0.
- pwsh and Windows PowerShell load profiles for `-Command` and `-File` too unless `-NoProfile`; the profile directory differs (`WindowsPowerShell` vs `PowerShell`) and Documents can be redirected, so probe `$PROFILE.CurrentUserAllHosts` live in each edition.
- An idempotent rc edit is a marker pair with exact-line match, strip-then-write, newline repair, no write when unchanged, symlink resolved before writing, `cp -p`-preserved mode, and a matching remove. One 90-line POSIX implementation passes all of it on 11 sh implementations (dash, busybox ash x2, mksh, ksh93 x2, yash, posh, bash 3.2/5.2 `--posix`, zsh `emulate sh`).
- A grep guard on payload text is not a marker: nvm's `grep -qc '/nvm.sh'` exits 0 on a file that only contains a comment mentioning `/nvm.sh`, so the install is skipped.
- ocx@5de9d777eb7d defects reproduced against the real binary: a symlinked `~/.bashrc` is replaced by a regular file (dotfiles target untouched), every touched rc becomes 0600, `~/.bash_login` is never targeted, files for shells the user may not use are created, and there is no CLI to remove the blocks. Its edited-block protection works (exit 82).
- Bash prompt hook: extend `PROMPT_COMMAND[0]` (array) or `PROMPT_COMMAND` (string) as one string with trailing `;`/space stripped, dedupe by whole word, preserve `$?`. This passed 40/40 scenarios on bash 3.2-5.3; clobber, naive string append, `+=(...)` array append and ocx's `'declare -a'*) +=(…)` arm failed 32, 24, 23 and 5.
- On bash 3.2-5.0 only element 0 of an array `PROMPT_COMMAND` runs (measured: user hook `user_b` at index 1 fired 0/4 on 5.0, 4/4 on 5.3). Fedora's `/etc/bashrc` already declares `PROMPT_COMMAND` as an array on bash 5.3.9, so array handling is not hypothetical.
- zsh: `add-zsh-hook precmd fn` dedupes and never touches `precmd()`. fish: `function f --on-event fish_prompt`. nu: normalise to a list, drop the closure carrying your marker comment, append. elvish: marker as the closure's rest-arg name, probe `arg-names`. pwsh: probe the live `prompt` body for a marker, wrap once, never write to the output stream. All six pass a fire-count check with a pre-existing user hook, sourced once and twice, and have a tested undo.
- Never emit `source <(cmd)`: bash 3.2 silently does nothing with exit 0; bash 3.2-5.0 in POSIX mode (bash invoked as `sh`) fails at PARSE time, aborting the entire file; dash, mksh, posh reject it; yash has no `source`. bash 4.0-5.0 default mode works, so the wave-1 claim "fails on 4.0" is wrong. Use `out=$(cmd) || exit; eval "$out"`; `eval "$(cmd)"` alone returns 0 when `cmd` fails on all 11 sh implementations.
- nu 0.107 runs `env_change` hooks BEFORE `pre_prompt` (0.105.1 after); emitted nu code must not depend on their relative order. `$(version).minor` gates nu code; an unknown command in a dead branch does not break the parse of 0.105.1 (it is treated as external), but new PowerShell syntax in a dead branch is a whole-file parse error on 5.1.
- `fish_add_path` WITHOUT `--global` writes the universal `fish_user_paths` on fish 3.6.0-4.9.3 (persisted in `fish_variables`) and skips non-existent directories; emitted conf.d code uses `fish_add_path --global --path`.
- Windows PowerShell 5.1 decodes a BOM-less UTF-8 script as ANSI (`café` has 5 chars, bytes 195,169); keep emitted profile blocks ASCII or write a BOM for 5.1 targets.
- Launchers: `exec 'ROOT/bin/tool' "$@"` with the root validated (reject `'`, newline, CR) forwards argv byte-exact and keeps the exit code on alpine/busybox, dash and bash 3.2; an unquoted `$*` launcher fails on a root containing a space.

## Findings

### 1. Which files each shell reads (measured)

Probe scripts: `fixtures/rc-and-hooks/startup/{bash,zsh,fish,nu}-probe*.sh`, each planting an `echo READ <name>` in every candidate file of a throwaway HOME.

**bash** ([manual, Bash Startup Files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)): login shell reads `/etc/profile`, then the first of `~/.bash_profile`, `~/.bash_login`, `~/.profile`; interactive non-login reads `~/.bashrc`; non-interactive reads `$BASH_ENV`; invoked as `sh` or `--posix` reads `$ENV` (interactive only) and, when `sh -l`, `/etc/profile` and `~/.profile`; under sshd a non-interactive bash reads `~/.bashrc`.

```
bash-probe.sh under docker bash:3.2 and bash:5.3 (identical)       files read
bash -c                                                             (none)
bash -i -c                                                          .bashrc
bash -l -c   /  bash -l -i -c                                       .bash_profile
login, .bash_profile removed                                        .bash_login        <- .profile still present, NOT read
login, only .bash_login                                             .bash_login
login, none of the three                                            (none)
invoked as sh, -l -i                                                .profile
invoked as sh, -i, ENV=.bashrc / bash --posix -i, ENV=.bashrc       .bashrc
bash -c with BASH_ENV=.bashrc                                       .bashrc
Git Bash 5.2.15 on the Windows host (matrix.sh win): -l, -i, -l -i  .bash_profile / .bashrc / .bash_profile
```

POSIX [XCU `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) defines only `ENV` (interactive shells; value subjected to parameter expansion; ignored if real and effective IDs differ) and says nothing about `~/.profile`; `.profile` is a convention every login-capable POSIX shell follows (dash, ksh, busybox ash login shells, bash as `sh`).

**zsh** ([Startup/Shutdown Files, 5.9.2](https://zsh.sourceforge.io/Doc/Release/Files.html), [Intro, Startup Files](https://zsh.sourceforge.io/Intro/intro_3.html)): `/etc/zshenv`, `$ZDOTDIR/.zshenv`; login: `/etc/zprofile`, `.zprofile`; interactive: `/etc/zshrc`, `.zshrc`; login: `/etc/zlogin`, `.zlogin`. `ZDOTDIR` unset means `HOME`. `-f` (NO_RCS) skips all user files.

```
zsh-probe.sh, zsh 5.0.8 and 5.9 (identical)                    files read
zsh -c                                    .zshenv
zsh -i -c                                 .zshenv .zshrc
zsh -l -c                                 .zshenv .zprofile .zlogin
zsh -l -i -c                              .zshenv .zprofile .zshrc .zlogin
zsh -f -l -i -c                           (none)
ZDOTDIR=$H/zd zsh -l -i -c                zd/.zshenv zd/.zprofile zd/.zshrc   <- $HOME/.zlogin NOT read when ZDOTDIR is set (the probe put no .zlogin in zd)
```

**fish** ([Configuration files](https://fishshell.com/docs/current/language.html), measured by `fish-probe.sh`, fish 3.6.0, 4.0.2, 4.9.3 identical): for `fish -c`, `-i`, `-l` alike the order is user `conf.d/*.fish`, then `vendor_conf.d` (under `$XDG_DATA_HOME/fish`, then `$XDG_DATA_DIRS`), then `config.fish`. The ordering is by directory first: `conf.d/z.fish` was read before `vendor_conf.d/v.fish` (`fish-order.sh`, fish 4.9.3 and 3.6.0). Same-named files in later directories are skipped. Because every file runs for every fish, guard interactive-only work with `status is-interactive`.

**nushell** ([Configuration](https://www.nushell.sh/book/configuration.html) stages 20-25; measured by `nu-probe-pty.sh`, nu 0.105.1 and 0.116.0 identical):

```
nu (interactive REPL, pty)        env.nu config.nu <vendor: XDG_DATA_DIRS entry> <vendor: $nu.data-dir> <user autoload>
nu -l (login, pty)                env.nu config.nu login.nu <vendor ...> <user autoload>
nu -c / nu script.nu / nu -i -c   (nothing read; no autoload)
nu -l -c                          env.nu config.nu login.nu   (autoload NOT read)
```

Vendor autoload is processed in `$nu.vendor-autoload-dirs` order and `$nu.data-dir/vendor/autoload` comes last of the vendor dirs, so it overrides system vendor files; user autoload (`$nu.default-config-dir/autoload`, added in [0.102](https://github.com/nushell/nushell.github.io/blob/main/blog/2025-02-04-nushell_0_102_0.md)) runs after all vendor files and overrides them. Directory order beat file-name order in the probe (`k_xdgdirs`, `n_datadir`, `m_user`). Docs: "env.nu ... historically used to override environment variables; the current best-practice recommendation is to set all environment variables using config.nu and the autoload directories". [Hooks](https://www.nushell.sh/book/hooks.html) "are only available in the interactive mode (REPL), they do not work if you run Nushell with a script or command".

**elvish** ([ref/command, RC file](https://elv.sh/ref/command.html)): legacy `~/.elvish/rc.elv` (ignored from 0.21.0), else `$XDG_CONFIG_HOME/elvish/rc.elv`, else `~/.config/elvish/rc.elv` (`%AppData%\elvish\rc.elv` on Windows). Measured (elvish 0.21.0): `elvish -c 'echo x'` and `elvish s.elv` print no `READ rc.elv`; the pty REPL does.

**PowerShell** ([about_Profiles 7.6](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.6), [5.1](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-5.1)): order AllUsersAllHosts, AllUsersCurrentHost, CurrentUserAllHosts, CurrentUserCurrentHost. "In Windows, the location of the Documents folder can be changed by folder redirection or OneDrive." Measured `profile-paths.ps1`:

```
pwsh 7.4.7 (Linux)    CurrentUserAllHosts /root/.config/powershell/profile.ps1
pwsh 7.6.6 (Linux)    CurrentUserAllHosts /home/mherwig/.config/powershell/profile.ps1
WinPS 5.1.26100.9444  CurrentUserAllHosts C:\Users\ecom\Documents\WindowsPowerShell\profile.ps1   (7.x on Windows: ...\Documents\PowerShell\...)
```

With a throwaway `HOME`, pwsh 7.6.6 printed `READ profile.ps1 (AllHosts)` then `READ Microsoft.PowerShell_profile.ps1` for `-Command 1`, `-File s.ps1` and `-NonInteractive -Command 1`, and neither with `-NoProfile`. The live probe `pwsh -NoProfile -Command '$PROFILE.CurrentUserAllHosts'` costs about 0.64 s wall through ocx exec.

### 2. The per-shell rc-target table (decision)

| Shell / context | Write here | Never here | Evidence |
|---|---|---|---|
| POSIX sh, dash, ash, ksh login | `~/.profile` | `$ENV` unless the user set it | [XCU sh](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html); bash-probe `sh -l -i` |
| bash login env (PATH, exports) | the FIRST existing of `~/.bash_profile`, `~/.bash_login`, `~/.profile`; if none exists create `~/.profile` (read by bash and dash/ksh) | a lower-precedence file while a higher one exists | bash-probe; cargo-dist@d1055f48071e:cargo-dist/templates/installer/installer.sh.j2:772 lists `.profile .bashrc .bash_profile .bash_login`; ocx profiles.rs:138-152 omits `.bash_login` |
| bash interactive (hooks, completions) | `~/.bashrc` (end of file) | before an early-return guard when the block must run non-interactively | Ubuntu 24.04 `/etc/skel/.bashrc` lines 5-9 `case $- in *i*) ;; *) return;; esac`; Arch skel the same |
| bash on macOS (Terminal.app) | `~/.bash_profile` (Terminal runs login shells) | `~/.bashrc` alone | unverified: read only. [scriptingosx 2017](https://scriptingosx.com/2017/04/about-bash_profile-and-bashrc-on-macos/); Homebrew__install@8ab1549dfa11:install.sh:1143-1145 picks `.bash_profile` off Linux |
| Git Bash (Windows) | same as bash | | measured Git Bash 5.2.15 |
| zsh login env | `${ZDOTDIR:-$HOME}/.zprofile`; validate `ZDOTDIR` absolute, no `..` (ocx profiles.rs:88-92) | `.zshenv` for anything non-trivial (every invocation incl. scripts) | [zsh Files](https://zsh.sourceforge.io/Doc/Release/Files.html): "keep it as small as possible" |
| zsh interactive | `${ZDOTDIR:-$HOME}/.zshrc`, appended at the END, silent, no stdin reads | above a powerlevel10k instant-prompt preamble | [p10k README:1035-1060](https://github.com/romkatv/powerlevel10k) (corpus d05a1b00f9a6): preamble "should stay close to the top"; output after it is deferred, console reads break |
| zsh reusing a POSIX `.profile` | `emulate sh -c '. ~/.profile'` in `.zprofile` | plain `. ~/.profile` (no word splitting) | `zsh-bridge.sh`: native 1 iteration, bridge 2, zsh 5.0.8 and 5.9 |
| fish | own file `${XDG_CONFIG_HOME:-~/.config}/fish/conf.d/<tool>.fish`, rewritten whole when content differs | `config.fish` (user-owned); `fish_variables` | fish-probe; ocx profiles.rs:112-121 |
| nushell | own file `$nu.data-dir/vendor/autoload/<tool>.nu` (= `$XDG_DATA_HOME/nushell/vendor/autoload`; user autoload overrides it) | `env.nu`/`config.nu` (user-owned) | nu-probe-pty; ocx profiles.rs:122-131 |
| elvish | fenced block in `$XDG_CONFIG_HOME/elvish/rc.elv` (else `~/.config/elvish/rc.elv`) containing one `use` or `eval` line | `~/.elvish/rc.elv` (ignored from 0.21.0) | [elvish ref](https://elv.sh/ref/command.html) |
| Windows PowerShell 5.1 and pwsh 7 | `$PROFILE.CurrentUserAllHosts` asked from EACH installed edition (`powershell.exe -NoProfile` and `pwsh -NoProfile`): two files | a hard-coded `Documents\WindowsPowerShell` path | about_Profiles; profile-paths.ps1; ocx profiles.rs:176-213 |

Create only the primary file of the detected login shell; edit others only if they already exist. ocx creates `.zprofile`, `.zshrc` and a PowerShell profile for a bash user (see 4); cargo-dist writes only to existing files of its shotgun list and creates the first one if none exists (installer.sh.j2:1088-1112).

### 3. The idempotent-edit contract

Reference implementation: `fixtures/rc-and-hooks/twin/rc-edit.sh` (POSIX sh + awk, cp, mv, cmp, mktemp, readlink). Check driver: `check-rc-edit.sh`.

```sh
# Contract, in the order the implementation applies it
BEGIN='# >>> demo managed block >>>'   # exact full-line markers, unique per tool, comment syntax of the target
END='# <<< demo managed block <<<'
target=$(resolve "$rc")                # follow symlink chain with readlink (not readlink -f: macOS <12.3, read only)
tmp=$(mktemp "$dir/.rc-edit.XXXXXX"); cp -p "$target" "$tmp"      # same mode and owner
awk -v b="$BEGIN" -v e="$END" '$0 == b {skip=1; next} skip && $0 == e {skip=0; next} !skip {print}' "$target" > "$tmp.body"
{ cat "$tmp.body"; printf '%s\n' "$BEGIN"; cat "$blk"; printf '%s\n' "$END"; } > "$tmp"   # awk newline-terminates the last line = repair
cmp -s "$tmp" "$target" && exit 0      # unchanged: no write
mv -f "$tmp" "$target"                 # rename onto the RESOLVED target
```

Incorrect (the plant `plant/rc-edit.sh`, the shape every "just append" installer has):

```sh
{ echo '# >>> demo >>>'; cat "$blk"; echo '# <<< demo <<<'; } >> "$rc"      # twice = two blocks; no trailing newline = joined line; no undo
```

Measured on `check-rc-edit.sh` (apply twice, with and without trailing newline, update, remove): plant fails 11 checks (`2 begin markers after two applies`, `user line 'alias ll=ls' was joined or lost`, `3 'export A=' lines after an update`, `marker survives remove`); twin passes on all 11 sh implementations through `matrix.sh posix`.

Existing practice:

- nvm guards by payload substring and repairs the newline only before its second append: `nvm-sh__nvm@b1b3a0038c06:install.sh:484` `grep -qc '/nvm.sh' "$NVM_PROFILE"`, `:493` `[ -n "$(command tail -c 1 "$NVM_PROFILE")" ] && nvm_echo >> ...`; the first block starts with `\n` (`:460`). Measured (`exemplar-guards/rc-comment-only`): `grep -qc '/nvm.sh'` exits 0 on a file holding only `# removed on purpose: ... nvm.sh`, so the install is skipped. nvm honours `PROFILE=/dev/null` as opt-out (`:311`).
- cargo-dist guards with `grep -F` of the exact managed line and prepends an empty line on every append: `installer.sh.j2:1058-1059` and `:1077-1078`. Its comment explains why `-q` is avoided: `grep -q` makes "no match" and "error" look the same. Append (`>>`) writes through a symlink and keeps the mode, which is why it never needed symlink code.
- Homebrew does not edit at all: it prints `echo 'eval "$(brew shellenv)"' >> rc` after a `grep -qs` check (`Homebrew__install@8ab1549dfa11:install.sh:1138-1186`), choosing the rc by shell and OS (`.bashrc` on Linux, `.bash_profile` on macOS, `.zshrc`/`.zprofile`, fish `config.fish`, else `${ENV:-~/.profile}`).
- ocx's `rc_block.rs` is the strongest design: a versioned, content-hashed opener `# >>> ocx v1 <hash8> >>>` / `# <<< ocx <<<` (rc_block.rs:9-13), `BlockState::Dirty` when the on-disk body differs from its own hash (:192), refusal to overwrite unless `--force` (:205-211), collapse of duplicate fences (:235), CRLF-preserving writes (:255-262), removal by label (:341). Measured: editing the body of the fence in `.profile` and re-running `ocx self setup` exits 82 and writes nothing.

### 4. Symlinked rc and mode: ocx reproducer (owner Q6: report, not fixed)

`fixtures/rc-and-hooks/symlink-rc/check-symlink.sh` and `check-mode.sh` run any implementation; `ocx-repro.sh` runs the real ocx debug binary built from ocx@5de9d777eb7d against an isolated HOME and a copy of the bootstrapped OCX_HOME.

```
$ symlink-rc/check-symlink.sh plant-rename.sh                       # rename-based rewrite, the fs.rs shape
FAIL: ~/.bashrc is no longer a symlink (replaced by a regular file)
FAIL: block missing from the dotfiles target
state: home/.bashrc=-rw------- dotfiles/bashrc=-rw-r--r-- (before -rw-r--r--)       -> exit 1
$ symlink-rc/check-symlink.sh ../twin/rc-edit.sh
OK: symlink kept, mode kept, block written through the link                         -> exit 0
$ symlink-rc/check-mode.sh plant-rename.sh   -> FAIL: mode -rw-r--r-- became -rw-------   exit 1
$ symlink-rc/check-mode.sh ../twin/rc-edit.sh -> OK: mode kept (-rw-r--r--)               exit 0
```

Real ocx (`symlink-rc/ocx-repro.sh`, `ocx --offline self setup`, `SHELL=/bin/bash`, `~/.bashrc -> ../dotfiles/bashrc` 0644, `~/.profile` 0644):

```
-rw------- ... home/.bashrc          (the symlink is gone)
readlink .bashrc: ''
dotfiles/bashrc:  export A=1          (unchanged; no fence)
600 home/.bashrc   600 home/.profile  (both were 644)
Profiles: .profile .bashrc .zprofile .zshrc .config/powershell/profile.ps1   (a bash user got zsh and PowerShell files)
```

Cause: `ocx_util::fs::write_bytes_atomic` (crates/ocx_util/src/fs.rs:236-251) creates a `0o600` temp file in the target's parent (`:244-249`) and `persist_temp_file` renames it onto the path as given; `rename(2)` replaces the symlink itself. `grep -c symlink` is 0 in rc_block.rs and lib.rs. The same primitive is right for trust-root and cache files, wrong for rc files. The installers in www-setup delegate every rc edit to this command (www-setup@a251c3631047:src/install.sh:12-15, :553-566), so the defect reaches every ocx install.

`.bash_login` (`symlink-rc/ocx-bash-login.sh`): with only `~/.bash_login` present, ocx writes `.profile` (fence count 1) and leaves `.bash_login` unfenced (0). `bash --login -x -c :` read `.bash_login` (`LOGIN_FILE_READ`) and never read `.profile`: the activation never runs. crates/ocx_setup/src/profiles.rs:138-152 targets `.profile` always and `.bash_profile` only if it exists.

No uninstall: `ocx self` has `activate`, `setup`, `update` only. `strip_block`/`remove_block` exist (lib.rs:632, :760) but are reachable only through setup's re-apply paths. The only undo is hand-deleting the fence.

### 5. Bash prompt hooks: PROMPT_COMMAND string vs array

Manual ([Bash Variables](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html)): "If this variable is set, and is an array, the value of each set element is interpreted as a command to execute before printing the primary prompt. If this is set but not an array variable, its value is used as a command". The array form arrived in bash 5.1 (NEWS item `ee` in the bash-5.1 section of [bash-5.3 NEWS](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz), lines 374-470).

Measured baseline (`hooks/bash/out-none.txt`, user hooks `user_a`, `user_b` and a failing command before the third prompt):

```
bash 3.2 / 5.0  PROMPT_COMMAND=(user_a user_b)   -> user_a fires 4x, user_b 0x       (only element 0 runs)
bash 5.3        PROMPT_COMMAND=(user_a user_b)   -> user_a 4x, user_b 4x
```

Harness: `hooks/bash/case.sh` feeds `bash -i` over stdin under docker `bash:<ver>` for 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 and 5 presets (unset, string, string with trailing `;`, 2-element array, impl sourced twice); `judge.py` fails a scenario when a baseline hook stops firing, the hook fires other than once per prompt, a syntax error appears, or the user hook stops seeing the failing `$?`.

| Implementation | Result (8 versions x 5 presets) | Failure |
|---|---|---|
| `PROMPT_COMMAND=__x_hook` (clobber) | 32/40 fail | every user hook dies |
| `PROMPT_COMMAND="$PROMPT_COMMAND;__x_hook"` | 24/40 fail | unset: leading `;` syntax error; trailing `;` gives `;;` syntax error; sourced twice fires 8x |
| `PROMPT_COMMAND+=(__x_hook)` (omp.bash:189-215 shape) | 23/40 fail | inert on 3.2-5.0 in all four non-array presets and for the array preset; two copies on 5.1+ when sourced twice |
| ocx shape (hook.rs:224 `'declare -a'*) PROMPT_COMMAND+=(…)`) | 5/40 fail | array preset on 3.2-5.0 only: ours never fires |
| twin below | 0/40 fail | |

```bash
# correct, bash 3.2-5.3 (hooks/bash/twin.sh)
__x_hook() { local s=$?; echo "FIRED:ours"; return "$s"; }          # local s=$? FIRST; return it so the next hook sees the user's status
__x_install_prompt_hook() {
  local cur pc=" ${PROMPT_COMMAND[*]-} "
  pc=${pc//;/ }; pc=${pc//$'\n'/ }
  case $pc in *" __x_hook "*) return 0 ;; esac                      # dedupe by whole word, any element
  if [[ "$(declare -p PROMPT_COMMAND 2>/dev/null)" == "declare -a"* ]]; then
    cur=${PROMPT_COMMAND[0]-}                                       # element 0 is the only one that runs on <=5.0
    PROMPT_COMMAND[0]="${cur:+${cur%"${cur##*[![:space:];]}"};}__x_hook"
  else
    cur=${PROMPT_COMMAND-}
    PROMPT_COMMAND="${cur:+${cur%"${cur##*[![:space:];]}"};}__x_hook"   # strip trailing ; and spaces, or ';;' is a syntax error
  fi
}
__x_install_prompt_hook
```

Incorrect (each measured red): `PROMPT_COMMAND=__x_hook`; `PROMPT_COMMAND="$PROMPT_COMMAND;__x_hook"`; `PROMPT_COMMAND+=(__x_hook)` without a version gate.

The zoxide form (zoxide@86b443cffcd7:templates/bash.txt:64-74) is the same idea (strip, then `${PROMPT_COMMAND:+${PROMPT_COMMAND};}`), but its array arm appends a new element, inert on <=5.0 if another tool made the variable an array. direnv prepends (direnv@28a73d1df3f3:internal/cmd/shell_bash.go:13-33) and mise prepends in the array arm (jdx__mise@19e8c8f0d03d:src/assets/bash/activate.sh:65-76), which on <=5.0 makes the user's later elements inert instead of ours. Element-0 extension has neither problem.

Real-world array: Fedora 44 (bash 5.3.9) `/etc/bashrc` runs `declare -a PROMPT_COMMAND` and then assigns the title command; Ubuntu 24.04 and Arch skeletons set none. bash-preexec ([README](https://github.com/rcaloras/bash-preexec)) states it "must be the last thing imported in your bash profile", so a hook that must run after it needs the `BLE_VERSION`/preexec path; starship, mise and zoxide special-case ble.sh and bash-preexec.

### 6. zsh, fish, nushell, elvish, PowerShell hook forms

**zsh** ([add-zsh-hook](https://zsh.sourceforge.io/Doc/Release/User-Contributions.html), [Functions: precmd](https://zsh.sourceforge.io/Doc/Release/Functions.html)). Correct (`hooks/zsh/twin.zsh`): `autoload -Uz add-zsh-hook; add-zsh-hook precmd __x_hook`. Incorrect: `precmd() { ... }` (user's `precmd` lost: `user_precmd fired 0/3` on 5.0.8, 5.3.1, 5.8, 5.9) and `precmd_functions+=(__x_hook)` (sourced twice fires 6x, want 3). Twin: 16/16 scenarios pass on four zsh versions with `precmd()` defined, `precmd_functions=(user_b)` and sourced twice. Undo: `add-zsh-hook -d precmd __x_hook; unfunction __x_hook` (tested). ocx's zsh arm is this form (hook.rs:237-256).

**fish** ([function --on-event](https://fishshell.com/docs/current/cmds/function.html)). Correct (`hooks/fish/twin.fish`): `function __x_hook --on-event fish_prompt; ...; end` in `conf.d/<tool>.fish`; redefinition replaces it, the user's `fish_prompt` and handlers are untouched. Incorrect: `function fish_prompt; ...; end` as a hook (user prompt lost, `user_prompt` never rendered). Driven in a pty on fish 3.6.0, 4.0.2, 4.7.0, 4.9.3: twin 8/8, clobber 8/8 fail. Undo: `functions -e __x_hook`. fish 4 waits for a primary device-attributes reply (`ESC [ c`) when started on a pty, which the harness answers. fish 4.3 stopped setting theme variables as universals and writes `conf.d/fish_frozen_theme.fish` and `fish_frozen_key_bindings.fish` on upgrade ([CHANGELOG 4.3.0](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst)); 4.8.0 stopped creating `__fish_initialized` and avoids the frozen theme file when the theme matches an old default. An emitter must not rely on `__fish_initialized` to detect first run.

**nushell** ([hooks](https://www.nushell.sh/book/hooks.html)). Correct (`hooks/nu/twin.nu`):

```nu
def __x_hooks_without_ours [cur: any] {
    let l = if (($cur | describe) starts-with 'list') { $cur } else if $cur == null { [] } else { [$cur] }
    $l | where {|h| not (($h | describe) == 'closure' and ((view source $h) | str contains '__x_hook_marker')) }
}
$env.config.hooks.pre_prompt = (__x_hooks_without_ours ($env.config.hooks.pre_prompt? | default []) | append {|| # __x_hook_marker
    print "FIRED:ours_pp" })
$env.config.hooks.env_change.PWD = (__x_hooks_without_ours ($env.config.hooks.env_change.PWD? | default []) | append {|b, a| # __x_hook_marker
    print "FIRED:ours_pwd" })
```

`view source` on a closure returns its text including the comment on nu 0.105.1 and 0.116.0, which is what makes a marker possible; ocx has "no append-safe hook point" for nu and inlines its hook into its own `env.nu` shim (audit ocx-emitter.md, shims.rs). Incorrect: `$env.config.hooks.pre_prompt = [ {...} ]` (user hooks lost: `user_pp fired 0/3`) and an unguarded `append` (two copies when two autoload files or one sourced file run twice: ours_pp 6, want 3). Measured with nu in a pty, user hooks as a list or a string (`"print FIRED:user_pp"`): twin 8/8 pass on 0.105.1 and 0.116.0. A single closure assigned (not a list) as `pre_prompt` did not fire at all in 0.116.0 even in the baseline, so a user config in that shape needs no special care. Order: [0.107](https://github.com/nushell/nushell.github.io/blob/main/blog/2025-09-02-nushell_0_107_0.md) "Execution Order of Hooks Changed: `env_change` before `pre_prompt`"; measured after `cd ..`: 0.105.1 `user_pp ... user_pwd`, 0.116.0 `user_pwd ... user_pp`. [0.103](https://github.com/nushell/nushell.github.io/blob/main/blog/2025-03-18-nushell_0_103_0.md): `PROMPT_*` variables are no longer inherited, which avoids a POSIX `PROMPT_COMMAND` leaking into nu. Undo: assign `__x_hooks_without_ours` back to both lists (tested: user hooks only).

**elvish** (`hooks/elvish/twin.elv`, the ocx hook.rs:555-591 shape):

```elvish
if (not (has-value [(all $edit:before-readline | each {|c| if (==s (kind-of $c) fn) { all $c[arg-names] } })] '__x_hook_marker')) {
  set edit:before-readline = [ $@edit:before-readline {|@__x_hook_marker| echo FIRED:ours } ]
}
```

Incorrect: `set edit:before-readline = [ { ... } ]` (user hook lost) and an unguarded append (6 fires, want 3; the wave-1 audit found direnv and mise unguarded). The marker lives in the hook list, not in the environment, because `exec elvish` keeps the environment and would skip re-registration (ocx hook.rs:580). Inside `elvish -c` or a script, `$edit:` does not exist ("variable $edit:before-readline not found" at compile time), so wrap it in `eval` when the code may also run non-interactively (ocx does). Twin passes 2/2 on elvish 0.21.0; undo filters the list the same way (tested).

**PowerShell** (`hooks/pwsh/hook-case.ps1`, run by `matrix.sh pwsh` on 7.4.7, 7.6.6 and Windows PowerShell 5.1.26100.9444; the harness calls `prompt` three times; a pty run of pwsh 7.6.6 confirmed the real host invokes the wrapper per prompt):

```powershell
if ("$($function:prompt)" -notmatch '__xHookMarker') {            # probe the LIVE body: a clobber that left a variable behind is re-wrapped
  $global:__xPrevPrompt = $function:prompt
  function global:prompt {
    $__xLast = $global:LASTEXITCODE                                # first statements: capture state (and $? where needed)
    $global:__xFired++; $null = '__xHookMarker'                    # side effects only; NOTHING on the output stream
    $__xOut = if ($global:__xPrevPrompt) { & $global:__xPrevPrompt } else { "PS $($PWD.Path)> " }
    $global:LASTEXITCODE = $__xLast
    $__xOut
  }
}
```

Incorrect, all red on 3 interpreters: redefine `prompt` (user prompt ran 0x, want 3); save-and-wrap with no guard (second registration saves its own wrapper and recurses; capped at 40 in the fixture, uncapped it recurses until the host dies); a hook that writes `'hook ran'` before calling the previous prompt (the function returns 2 objects, want 1; in a pty run of pwsh 7.6.6 the host showed only the hook's text and not the user's prompt). Undo: `$function:prompt = $global:__xPrevPrompt` (tested). ocx's PowerShell arm probes the live body for `__ocxReconcile` and restores `$?` and `$LASTEXITCODE` (hook.rs:384-428), which is this design. The twin file contains `$global:` variables, so PSScriptAnalyzer `PSAvoidGlobalVars` fires (4 findings on `pty-twin.ps1`); a prompt wrapper needs global state, suppress with a justification. Profile text must parse on 5.1: PSScriptAnalyzer `PSUseCompatibleSyntax` with `TargetVersions = @('5.1')` reports `?:` and `&&` as errors (`hooks/pwsh/pssa-check.ps1 modern-hook.ps1` exit 1; the twin exit 0).

### 7. The undo contract

Every emitted change ships its removal, tested in the same harness as the install:

| Surface | Install | Undo (tested) |
|---|---|---|
| rc fence | strip-then-write marker pair | `rc-edit.sh remove`: deletes exactly the marker pair; other bytes identical (one added trailing newline stays when the original lacked it) |
| own file (fish conf.d, nu autoload) | write the file | delete the file; delete the now-empty directory only if you created it |
| bash hook | element-0 extension | remove the whole word (and its `;`) from each element, `unset PROMPT_COMMAND` if empty, `unset -f __x_hook` (`hooks/bash/twin-undo.sh`, bash 3.2, 5.0, 5.3: user hook only) |
| zsh hook | `add-zsh-hook` | `add-zsh-hook -d precmd fn; unfunction fn` (5.0.8, 5.9) |
| fish hook | `--on-event` function | `functions -e fn` (3.6.0, 4.9.3) |
| nu hook | marker closure | filter by marker (0.105.1, 0.116.0) |
| elvish hook | marker closure | filter by `arg-names` (0.21.0) |
| pwsh hook | wrap | restore the saved `prompt` body (7.4.7, 7.6.6, 5.1) |
| universal state | `fish_add_path` without `--global` | `set -e fish_user_paths` entry; avoid by using `--global` |

ocx has the library function but no CLI for the blocks, and its prompt hooks are removed only by ending the shell (audit ocx-emitter.md hook table). The undo is a P2 contract item for the shell-integration skill: "a skill that adds a hook must show the line that removes it".

### 8. `source <(...)` and `eval "$(...)"`

Measured (`source-subst/check-source.sh` through `matrix.sh bash`, which runs the script in default and `--posix` mode under bash 3.2-5.3):

```
bash 3.2       default: FAIL no SOURCED_OK (output: <empty>), exit 0     posix: FAIL parse error
bash 4.0-5.0   default: ok                                               posix: FAIL  syntax error near unexpected token `('
bash 5.1-5.3   default: ok                                               posix: ok     (bash-5.1 NEWS item u: "Process substitution is now available in posix mode")
```

Also (`matrix.sh posix plant-source.sh`): dash 0.5.12 `Syntax error: "(" unexpected`, mksh R59c and posh parse errors, yash 2.52 `no such command 'source'` (rc 127), busybox ash 1.35/1.37, ksh93u+m (both) and zsh `emulate sh` run it. A parse error aborts the whole file: `bash --posix` on a file whose line 2 holds `f() { source <(...); }` runs nothing, so a `~/.profile` sourced by `sh` stops at that point. The bash 3.2 failure is silent: no output and exit 0, so `||` fallbacks never fire. The wave-1 note "fails on bash 3.2, 4.0" is half right: 4.0 through 4.4/5.0 work in default mode (`forms.sh`, top-level, in a function, and `.` form on 4.0, 4.1, 4.2, 4.4, 5.0, 5.1); starship's own comment names only 3.2 and POSIX mode (starship__starship@d4d0459c5c24:src/init/mod.rs:123-132).

Correct:

```sh
out=$(tool init bash) || { echo "tool init failed" >&2; return 1 2>/dev/null || exit 1; }
eval "$out"
```

`eval "$(tool init bash)"` is portable but hides the generator's failure: measured on all 11 sh implementations `eval "$(sh -c 'exit 3')"` returns 0 while `out=$(sh -c 'exit 3') || echo "noticed rc=$?"` sees 3 (`source-subst/eval-status.sh`). Starship's answer for bash <4.4/POSIX mode is a stub that prints a second-phase command, `--print-full-init` (mod.rs:123-132).

ShellCheck: `shellcheck -s sh` reports SC3001 (process substitution undefined in POSIX sh), SC3046 and SC1090 on the plant (exit 1) and nothing on the twin; `-s bash` reports only SC1090, which does not identify the construct. So a `grep` is the dialect-independent check.

### 9. Version guards for churny targets

Guards compare numeric fields, never parse text, and are measured (`version-guards/g.*` through `matrix.sh`):

| Shell | Guard | Measured |
|---|---|---|
| bash | `[ "${BASH_VERSINFO[0]}" -gt 5 ] \|\| { [ "${BASH_VERSINFO[0]}" -eq 5 ] && [ "${BASH_VERSINFO[1]}" -ge 1 ]; }` | 3.2-5.0 no, 5.1-5.3 yes |
| zsh | `autoload -Uz is-at-least; is-at-least 5.3 $ZSH_VERSION` | 5.0.8 no, 5.3.1-5.9 yes |
| fish | `string match -rq '^[4-9]\.' -- $version` (`$FISH_VERSION` also set on 3.6.0) | 3.6.0-4.9.3 |
| nu | `(version).minor >= 107` | 0.105.1 `minor=105`, 0.116.0 `minor=116` |
| elvish | `$buildinfo[version]` is `0.21.0+official`: strip the suffix before comparing | 0.21.0 |
| pwsh | `$PSVersionTable.PSVersion.Major -ge 7`, `PSEdition` `Desktop`/`Core` | 5.1 `Desktop`, 7.4.7 and 7.6.6 `Core` |

A guard protects against a missing command or a changed behavior, not against changed SYNTAX: a dead branch containing `$true ? 'a' : 'b'` makes Windows PowerShell 5.1 fail to parse the whole file (`dead-branch.ps1`: `Unexpected token '?'`), while pwsh 7 prints `REACHED_END`. nu treats an unknown command in a dead branch as an external call and still parses (`dead-branch.nu` on 0.105.1 printed `REACHED_END`). So put newer syntax in a separate file or a string run through `Invoke-Expression`/`eval`, selected by the guard.

Pattern: (1) emit per-target code; (2) gate behavior by a numeric version or a feature probe (`typeset -f`, `Get-Command`, `declare -p`, `has-value`); (3) test on the oldest and newest interpreter of each family in the matrix: bash 3.2 and 5.3, zsh 5.0.8 and 5.9, fish 3.6.0 and 4.9.3, nu 0.105.1 and 0.116.0, elvish 0.21.0, pwsh 5.1 and 7.6.6, plus dash 0.5.12 and busybox ash for sh. A dash package version does not identify its features (wave-1 correction), so probe. Churn is worst in nu: zoxide pins nu 0.106+ (`ajeetdsouza__zoxide@86b443cffcd7:templates/nushell.txt:107`), fzf gates on `(version)` for 0.115.0 (audit emitters-compared.md). ocx's guarded nu output passes 0.105.1 and 0.116.0.

### 10. PATH-list idioms per target (M-M-19)

Measured idempotent on repeated application (`pathlist/p.*` through `matrix.sh`):

| Target | Idiom | Result |
|---|---|---|
| sh/bash/zsh/ksh | `case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH" ;; esac` | copies=1 on all 11 sh implementations |
| fish 3.6.0-4.9.3 | `fish_add_path --global --path $d` (needs fish 3.2.0+, [CHANGELOG](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst)) | copies=1; a non-existent directory is NOT added; default scope (`fish_add_path $d`) sets the universal `fish_user_paths` on all four versions (`p2.fish`) |
| nu 0.105.1, 0.116.0 | `use std/util "path add"; path add $d` | copies=1; `$env.PATH` is `list<string>` |
| elvish 0.21.0 | `if (not (has-value $paths $d)) { set paths = [$d $@paths] }` | copies=1; `$paths` is a list, separator is the platform's |
| pwsh 5.1, 7.4, 7.6 | `$sep = [IO.Path]::PathSeparator` and `-split [regex]::Escape($sep)` | `;` on 5.1, `:` on Linux 7.x; copies=1 |

Never join with a hard-coded `:` for pwsh or nu, never use a shell's string PATH with a Windows-style `;` in bash on Git Bash without conversion (the Git Bash `PATH` is POSIX-style).

### 11. Launchers: `exec "$@"` and embedded strings (M-M-12)

`launcher/gen-plant.sh` vs `gen-twin.sh`, `check.sh` builds a launcher for a root containing a space, runs it with `'a b' '' '*' -n '$HOME' 'x"y' "it's"` against a stub that prints `[arg]` per element and exits 7, and a second root containing `'`.

```
gen-plant.sh (unquoted $*, root unvalidated):  FAIL argv ... /pkg: No such file or directory; FAIL exit code: got 127 want 7; FAIL quote-in-root   -> exit 1
gen-twin.sh  (validate, single-quote, exec "$@"): OK: argv exact, rc 7 kept, hostile root refused or safe -> exit 0  (alpine:3.22 busybox, bash:3.2, dash 0.5.12)
```

ocx's `LauncherSafeString` rejects `'`, `"`, newline, CR, NUL (safety.rs; crates/ocx_package_manager/src/launcher/body.rs:15 and :74) and the audit measured a 19-element hostile argv byte-exact on dash, ash, bash 3.2/5.3/posix, mksh, ksh93, posh, zsh `emulate sh` with exit 7 propagated through `exec`.

### 12. Environment hazards: p10k, distro skeletons, macOS (read only), PowerShell encoding

- **Instant prompt**: append at the end of `.zshrc`, emit no output and read no stdin; code that needs the console must precede the preamble, which an emitter cannot know. Source: p10k README lines 1035-1075 (powerlevel10k@d05a1b00f9a6).
- **Ubuntu/Debian** skeleton `.bashrc` returns early when not interactive (lines 5-9) and `.profile` sources `.bashrc` for bash; **Fedora**/**Arch** skeleton `.bash_profile` sources `.bashrc`. A block that must reach non-interactive ssh commands cannot live in `.bashrc` after the guard.
- **macOS** (unverified: read only): Terminal.app starts login shells, so `.bash_profile` and `.zprofile` are read; `/etc/profile` and `/etc/zprofile` run `path_helper`, which can reorder a PATH set earlier ([scriptingosx](https://scriptingosx.com/2017/04/about-bash_profile-and-bashrc-on-macos/); no Apple primary source was reachable). `/bin/bash` is 3.2.57 and `/bin/sh` is bash 3.2 in POSIX mode (frame H7).
- **PowerShell 5.1 encoding** (`startup/nonascii.ps1`): a BOM-less UTF-8 file containing `café` has Length 4 on 7.4.7 and 7.6.6 and Length 5 (codes 99,97,102,195,169) on 5.1.26100.9444. Emit ASCII or a BOM for 5.1 targets.
- **Execution policy**: Restricted (the default on client Windows) stops profiles from running ([about_Profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.6)); an emitted profile needs a note, not a policy change.

## Normative guidance candidates

Fixture root `FR` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/rc-and-hooks`. A grep line prints the VIOLATION: empty output means pass (grep exit 1 = green, exit 0 = red). "Ran" means watched red on a planted violation and green on its compliant twin.

1. **SH-EMIT-01 Target by the shell's own order.** Bash login env goes in the first existing of `~/.bash_profile`, `~/.bash_login`, `~/.profile`; interactive hooks in `~/.bashrc`; zsh login env in `${ZDOTDIR:-$HOME}/.zprofile`, interactive in `.zshrc`. Rationale: a lower-precedence file is never read. Verify: `FR/startup/bash-probe.sh` under `matrix.sh bash`-style docker runs (measurement); reading heuristic for hard-coded lists: `grep -rn -e '\.bash_profile' --include='*.rs' --include='*.sh' --include='*.go' --include='*.py' .` then check each hit also handles `.bash_login`. Ran: measurement yes; the ocx omission reproduced by `FR/symlink-rc/ocx-bash-login.sh` (red against ocx).
2. **SH-EMIT-02 fish and nushell get a file of their own.** fish: `conf.d/<tool>.fish`; nushell: `$nu.data-dir/vendor/autoload/<tool>.nu`. Never edit `config.fish`, `env.nu` or `config.nu`. Rationale: those are user-owned and a whole-file rewrite needs no edit contract; user autoload overrides vendor. Verify: reading heuristic: `grep -rn -e 'config.fish' -e 'env.nu' -e 'config.nu' --include='*.rs' --include='*.go' --include='*.py' --include='*.sh' .` and inspect each write; `FR/startup/fish-probe.sh`, `nu-probe-pty.sh` for the read order. Ran: read order yes (measurement); the grep is a reading heuristic.
3. **SH-EMIT-03 PowerShell profile path comes from the edition itself.** Run `powershell.exe -NoProfile -Command '$PROFILE.CurrentUserAllHosts'` and `pwsh -NoProfile -Command '$PROFILE.CurrentUserAllHosts'`; edit each result; never build `Documents\WindowsPowerShell` by hand. Rationale: 5.1 and 7 use different directories and Documents may be redirected. Verify: reading heuristic: `grep -rn -e 'WindowsPowerShell' -e 'Documents' --include='*.rs' --include='*.go' --include='*.ps1' --include='*.sh' .` hits must come from a probe, not a literal. Ran: `FR/startup/profile-paths.ps1` via `matrix.sh pwsh` (measurement, 3 editions); grep is a reading heuristic.
4. **SH-EMIT-04 A managed block is a marker pair matched as whole lines.** `# >>> <tool> [vN hash] >>>` / `# <<< <tool> <<<`, matched with `$0 == marker` (awk) or `grep -x -F`. Guard on the marker, never on a payload substring or comment text. Rationale: nvm's `grep -qc '/nvm.sh'` exits 0 on a comment. Verify: `sh FR/check-rc-edit.sh FR/twin/rc-edit.sh` (green exit 0) vs `.../plant/rc-edit.sh` (red exit 1); payload-substring guards: `grep -rn -e "grep -q" -e "grep -qc" --include='*.sh' --include='*.bash' .` then inspect whether the pattern is a marker. Ran: yes (plant exit 1 on 11 checks, twin exit 0; matrix posix 11/11 green, plant 11/11 red).
5. **SH-EMIT-05 Re-applying changes nothing; a changed body replaces in place.** Strip existing blocks then write; `cmp -s` and skip the write when equal; duplicate fences collapse to one. Rationale: stacking blocks and mtime churn. Verify: `check-rc-edit.sh` asserts one begin marker after two applies, byte-identical file after the second, one `export A=` line after an update. Ran: yes.
6. **SH-EMIT-06 Repair a missing trailing newline before appending.** `awk` newline-terminates the last line, or `[ -n "$(tail -c 1 "$f")" ] && echo >> "$f"` (nvm install.sh:493). Rationale: otherwise the first marker joins the user's last line. Verify: `check-rc-edit.sh` variant `nonl` (`user line 'alias ll=ls' was joined or lost` on the plant). Ran: yes.
7. **SH-EMIT-07 Resolve a symlinked rc and write the target.** Loop `readlink` (handle relative links with `dirname`); do not use `mv tmp "$rc"` onto the link and do not require `readlink -f` (macOS before 12.3: unverified, read only). Rationale: `rename(2)` replaces the symlink and strands the dotfiles target (ocx fs.rs:236). Verify: `sh FR/symlink-rc/check-symlink.sh <impl>`; static: `grep -rn -e 'NamedTempFile' -e 'tempfile_in' -e 'persist' --include='*.rs' .` then check a symlink resolve precedes it. Ran: yes (plant-rename.sh exit 1, twin exit 0; twin also green on alpine 3.22 busybox, bash 3.2, dash).
8. **SH-EMIT-08 Preserve the mode; never hard-code 0600 for a user rc.** `cp -p "$target" "$tmp"` then rewrite the copy, or append in place with `>>`. Rationale: ocx turns 0644 into 0600 silently. Verify: `sh FR/symlink-rc/check-mode.sh <impl>`; static: `grep -rn -e 'from_mode(0o600)' -e 'chmod 600' -e 'umask 077' --include='*.rs' --include='*.sh' .` hits near an rc write need a reason. Ran: yes (plant exit 1 `mode -rw-r--r-- became -rw-------`, twin exit 0).
9. **SH-EMIT-09 Edited blocks are protected.** Store a hash of the body in the opener; a body that differs from its hash is "dirty"; refuse (distinct exit code) unless `--force`. Rationale: users edit blocks; silently overwriting loses work. Verify: edit the fence body, re-run the installer, expect the dirty exit (ocx: 82) and an unchanged file. Ran: yes against ocx (`exit 82`); no planted shell fixture.
10. **SH-EMIT-10 Create only the detected shell's primary file.** Edit other rc files only when they exist. Rationale: ocx created `.zprofile`, `.zshrc` and a PowerShell profile for a bash user. Verify: run the installer against an empty HOME with `SHELL=/bin/bash` and `find "$HOME" -type f`; the list is the violation. Ran: yes against ocx (`FR/symlink-rc/ocx-repro.sh` lists five profiles).
11. **SH-EMIT-11 Every install ships a removal and a flag to skip.** Remove by marker; honour a `NO_MODIFY_PATH`-style variable or `--no-modify-path`, and `--dry-run`; nvm's `PROFILE=/dev/null` is the minimal form. Rationale: rc edits are the one change users cannot easily audit. Verify: `check-rc-edit.sh` `remove` leg (marker gone, user line kept). Ran: yes for remove; flags are a reading heuristic (`grep -rn -e 'NO_MODIFY' -e 'no-modify' --include='*.sh' --include='*.ps1' .` must be non-empty for an installer).
12. **SH-EMIT-12 Emitted rc text is silent and non-interactive-safe.** No output, no stdin reads, interactive-only work behind `case $- in *i*)`, `status is-interactive`, or the REPL-only hook points. Rationale: p10k instant prompt breaks on console reads; `nu -c`/`elvish -c` read no rc; fish and pwsh load for every invocation. Verify: reading heuristic: `grep -rn -e 'read ' -e 'echo ' -e 'Write-Host' --include='*.fish' --include='*.zsh' --include='*.ps1' --include='*.nu' --include='*.elv' .` on emitted templates. Ran: no (reading heuristic only).
13. **SH-EMIT-13 Never emit `source <(cmd)` or `. <(cmd)`.** Capture, check, then `eval`. Rationale: bash 3.2 silently skips it (exit 0), bash 3.2-5.0 POSIX mode and dash/mksh/posh fail at parse time, killing the file. Verify: `grep -rn -e 'source <(' -e '\. <(' --include='*.sh' --include='*.bash' --include='*.tmpl' --include='*.j2' --include='*.txt' .`; plus `shellcheck -s sh` (SC3001 on the plant) and `matrix.sh bash FR/source-subst/check-source.sh <impl>`. Ran: yes (grep G1 red/green, SC3001 exit 1/0, check-source plant exit 1 on 3.2 and 4.0-5.0 posix, twin exit 0 on all 8).
14. **SH-EMIT-14 Do not rely on `eval "$(cmd)"` to surface the generator's failure.** Use `out=$(cmd) || handle; eval "$out"`. Rationale: `eval "$(false)"` returns 0 on dash, busybox ash, mksh, ksh93, yash, posh, bash, zsh. Verify: `matrix.sh posix FR/source-subst/eval-status.sh` shows `eval-of-substitution rc=0`; static: `grep -rn -e 'eval "\$(' --include='*.sh' --include='*.bash' .` hits need the capture form when the result gates startup. Ran: yes (11/11 interpreters).
15. **SH-EMIT-15 bash prompt hook: extend element 0 as a string, dedupe by whole word, preserve `$?`.** Rationale: arrays are inert beyond element 0 on 3.2-5.0 and `PROMPT_COMMAND` can be an array on any version (Fedora 5.3.9). Verify: `FR/hooks/bash/run-all.sh <impl>` then `judge.py out-none.txt out-<impl>.txt` (exit 0 required, 40 scenarios on bash 3.2-5.3); static: `grep -rn -e 'PROMPT_COMMAND+=(' -e 'PROMPT_COMMAND=(' --include='*.sh' --include='*.bash' --include='*.tmpl' --include='*.txt' .` flags the array appends for review. Ran: yes (clobber 32 fail, naive string 24, `+=(` 23, ocx shape 5, twin 0).
16. **SH-EMIT-16 zsh hooks go through `add-zsh-hook`.** Never define `precmd()` or assign/append `precmd_functions`. Rationale: `precmd()` clobbers the user's; `+=` duplicates on re-source. Verify: `grep -rn -e '^precmd()' -e 'precmd_functions=(' -e 'precmd_functions+=(' --include='*.zsh' --include='*.txt' --include='*.tmpl' .`; harness `FR/hooks/zsh/run-all.sh`, `judge-simple.py ... 3` over zsh 5.0.8, 5.3.1, 5.8, 5.9. Ran: yes (plants 8 and 4 failing of 16, twin 0).
17. **SH-EMIT-17 fish hooks are `--on-event` functions with a unique name.** Never define `fish_prompt` to hook. Verify: `grep -rn -e 'function fish_prompt' --include='*.fish' --include='*.txt' --include='*.tmpl' .`; harness `FR/hooks/fish/run-all.sh` + `judge.py` over fish 3.6.0, 4.0.2, 4.7.0, 4.9.3. Ran: yes (clobber 8/8 fail, twin 0).
18. **SH-EMIT-18 nushell hooks: normalise, remove-by-marker, append.** Closures carry a marker comment; never assign a list literal to `$env.config.hooks.*`; never rely on `env_change` vs `pre_prompt` order (flipped in 0.107). Verify: `grep -rn -e 'hooks\.pre_prompt = \[' -e 'env_change\.PWD = \[' -e 'hooks\.pre_execution = \[' --include='*.nu' --include='*.txt' --include='*.tmpl' .`; harness `FR/hooks/nu/run-all.sh` + `judge.py` on 0.105.1 and 0.116.0. Ran: yes (clobber 6/8 fail, unguarded append 2/8 fail, twin 0).
19. **SH-EMIT-19 elvish hooks are probed by the closure's rest-arg name.** Marker `{|@__tool_marker| ...}`; probe `$c[arg-names]` with `has-value`; no `edit:` reference outside an interactive-only eval. Verify: `grep -rn -e 'before-readline = \[ {' -e 'before-readline = \[{' --include='*.elv' --include='*.txt' --include='*.tmpl' .`; harness `FR/hooks/elvish/run-all.sh` + `judge-simple.py ... 3` (0.21.0). Ran: yes (clobber 2/2 fail, unguarded append 1/2 fail, twin 0).
20. **SH-EMIT-20 PowerShell prompt wrapper: live-body probe, one wrap, no output, restore state.** Capture `$?`/`$LASTEXITCODE` first, write nothing to the output stream, restore, return exactly one object. Verify: `matrix.sh pwsh FR/hooks/pwsh/hook-case.ps1 twin` (and `-Twice`, `-Undo`) green on 7.4, 7.6.6, 5.1; plants `plant-clobber`, `plant-wrap-unguarded -Twice`, `plant-wrap-leaky` red. Ran: yes (3 plants x 3 editions red, twin green; PSAvoidGlobalVars needs a justified suppression).
21. **SH-EMIT-21 Emitted PowerShell must parse on 5.1 and be ASCII.** Run PSScriptAnalyzer `PSUseCompatibleSyntax` with `TargetVersions = @('5.1')` on emitted profile text; write ASCII or a BOM. Verify: `run.sh pwsh -NoProfile -File FR/hooks/pwsh/pssa-check.ps1 <file>` (exit 1 on `?:`/`&&`); encoding: `matrix.sh pwsh FR/startup/nonascii.ps1` (5.1 Length 5). Ran: yes (modern-hook.ps1 exit 1, twin exit 0; encoding measured).
22. **SH-EMIT-22 Guard by numeric fields or a feature probe; test the oldest and newest interpreter of each family.** `BASH_VERSINFO`, `is-at-least`, `$version`, `(version).minor`, `$PSVersionTable.PSVersion.Major`, `typeset -f`/`declare -p`/`Get-Command`; newer SYNTAX goes in a separate file or an `eval`/`Invoke-Expression` string. Rationale: PowerShell 5.1 fails the whole file on a dead-branch `?:`; a dash package version does not identify features. Verify: `matrix.sh <family> FR/version-guards/g.<ext>` and `dead-branch.ps1` (5.1 exit 1). Ran: yes.
23. **SH-EMIT-23 fish PATH edits use `fish_add_path --global --path`.** Never the default scope in emitted code. Rationale: default scope writes universal `fish_user_paths` (persists in `fish_variables`, survives uninstall) on 3.6.0-4.9.3, and non-existent directories are skipped. Verify: `grep -rn -e 'fish_add_path' --include='*.fish' --include='*.txt' --include='*.tmpl' --include='*.sh' .` then require `--global` on each hit; `matrix.sh fish FR/pathlist/p2.fish` shows `universal_fish_user_paths=yes`. Ran: yes (p.fish vs p2.fish measurement on 4 versions).
24. **SH-EMIT-24 PATH separators come from the platform.** pwsh `[IO.Path]::PathSeparator`; nu lists (`path add`); elvish `$paths`; sh `case ":$PATH:"`. Verify: `grep -rn -e "':'" -e '";"' --include='*.ps1' --include='*.nu' --include='*.elv' .` on emitted PATH code. Ran: idempotence yes (`FR/pathlist`), the grep is a reading heuristic.
25. **SH-EMIT-25 Launchers: validate the embedded string, single-quote it, `exec "$@"`.** Reject `'`, `"`, newline, CR, NUL in anything baked in. Rationale: unquoted `$*` splits arguments and an unescaped `'` breaks the file. Verify: `sh FR/launcher/check.sh gen-twin.sh` (exit 0) vs `gen-plant.sh` (exit 1); static: `grep -rn -e 'exec \$' -e '\$\*' --include='*.sh' --include='*.tmpl' --include='*.j2' .`. Ran: yes (alpine busybox, bash 3.2, dash).
26. **SH-EMIT-26 Sourcing a POSIX `.profile` from zsh goes through `emulate sh -c`.** `emulate sh -c '. ~/.profile'` in `.zprofile`. Rationale: zsh does not word-split by default. Verify: `FR/startup/zsh-bridge.sh` (native `iterations=1`, bridge `iterations=2` on 5.0.8 and 5.9). Ran: yes (measurement).
27. **SH-EMIT-27 rc content that is `sh`-sourced must parse on dash, posh and bash `--posix` 3.2.** Rationale: a parse error loses the rest of the file. Verify: `matrix.sh posix <snippet>` all interpreters exit 0 (posh is the strictest). Ran: yes for the rc-edit helper (11/11); for emitted snippets use the same command.
28. **SH-EMIT-28 macOS and BSD claims are labelled "unverified: read only" until a macOS host runs them.** Includes Terminal.app login shells, `path_helper`, `readlink -f` availability. Verify: reading heuristic: every macOS claim in a produced rule carries the label. Ran: no.

## Verification runs

All run 2026-10-11. `FR` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/rc-and-hooks`. "red" = non-zero on the plant, "green" = zero on the twin.

| # | Fixture / command | Plant exit | Twin exit | Key output |
|---|---|---|---|---|
| V1 | `sh FR/check-rc-edit.sh FR/plant/rc-edit.sh` / `.../twin/rc-edit.sh` | 1 | 0 | plant: `FAIL[nl]: 2 begin markers after two applies (want 1)`, `FAIL[nonl]: user line 'alias ll=ls' was joined or lost`, `FAIL[nl]: marker survives remove`; twin: `OK: idempotent, newline-safe, replaceable, removable` |
| V2 | `matrix.sh posix FR/matrix-rc-edit.sh` (twin) and `FR/matrix-rc-edit-plant.sh` (plant) | 1 x11 | 0 x11 | dash 0.5.12, busybox ash 1.35/1.37, mksh R59c, ksh93u+m x2, yash 2.52, posh 0.14.1, bash 3.2/5.2 `--posix`, zsh 5.9 `emulate sh`; shellcheck `-s sh` is clean on both (0 findings on the plant: the defect is not lintable) |
| V3 | `sh FR/symlink-rc/check-symlink.sh plant-rename.sh` / `../twin/rc-edit.sh` | 1 | 0 | `FAIL: ~/.bashrc is no longer a symlink`, `FAIL: block missing from the dotfiles target`; twin `OK: symlink kept, mode kept, block written through the link` (also in docker alpine:3.22, bash:3.2, shellzoo:deb12: exit 0) |
| V4 | `sh FR/symlink-rc/check-mode.sh plant-rename.sh` / twin | 1 | 0 | `FAIL: mode -rw-r--r-- became -rw-------` / `OK: mode kept (-rw-r--r--)` |
| V5 | `FR/symlink-rc/ocx-repro.sh` (ocx debug binary, ocx@5de9d777eb7d) | n/a (defect demo) | n/a | `-rw------- ... home/.bashrc`, `readlink .bashrc: ''`, `dotfiles/bashrc: export A=1`, `600 .profile`, five profile targets |
| V6 | `FR/symlink-rc/ocx-bash-login.sh` | n/a | n/a | `fence in .bash_login: 0  fence in .profile: 1`; `bash --login -x -c :` trace shows `+ echo LOGIN_FILE_READ` and no `env.sh` |
| V7 | edit an ocx fence body in `.profile`, re-run `ocx --offline self setup` | n/a | n/a | exit 82 (dirty block refused) |
| V8 | `FR/hooks/bash/run-all.sh <impl>.sh` over docker `bash:{3.2,4.0,4.2,4.4,5.0,5.1,5.2,5.3}` then `judge.py out-none.txt out-<impl>.txt`; summary `FR/judge-all.sh` | clobber 1 (32/40 fail), naive string 1 (24/40), `+=(` array 1 (23/40), ocx shape 1 (5/40) | 0 (0/40) | e.g. `FAIL bash 3.2 string-semi syntax error in PROMPT_COMMAND; user_a fired 0/4 times`, `FAIL bash 5.0 array2 ours fired 0 times (want 4)`, `FAIL bash 5.3 twice ours fired 8 times (want 4)` |
| V9 | `FR/hooks/zsh/run-all.sh <impl>` over zshusers/zsh 5.0.8, 5.3.1, 5.8, 5.9 + `judge-simple.py ... 3` | `precmd()` 1 (8/16), `precmd_functions+=` 1 (4/16) | 0 (0/16) | `FAIL 5.9 func user_precmd fired 0/3`, `FAIL 5.9 twice ours fired 6 (want 3)` |
| V10 | `FR/hooks/fish/run-all.sh <impl>.fish` (pty, fish 3.6.0, 4.0.2, 4.7.0, 4.9.3) + `judge.py` | 1 (8/8) | 0 (0/8) | `FAIL fish 4.9.3 once user's fish_prompt no longer rendered` |
| V11 | `FR/hooks/nu/run-all.sh <impl>.nu` (pty, nu 0.105.1, 0.116.0) + `judge.py` | clobber 1 (6/8), unguarded append 1 (2/8) | 0 (0/8) | `FAIL nu 0.116.0 list user_pp fired 0/3; user_pwd fired 0/1`, `FAIL nu 0.116.0 twice ours_pp fired 6 (want 3); ours_pwd fired 2 (want 1)` |
| V12 | `FR/hooks/elvish/run-all.sh <impl>.elv` (pty, 0.21.0) + `judge-simple.py ... 3` | clobber 1 (2/2), unguarded append 1 (1/2) | 0 (0/2) | `FAIL 0.21.0 user user_h fired 0/3`, `FAIL 0.21.0 twice ours fired 6 (want 3)` |
| V13 | `matrix.sh pwsh FR/hooks/pwsh/hook-case.ps1 plant-clobber` / `plant-wrap-leaky` / `plant-wrap-unguarded -Twice` / `twin` / `twin -Twice` / `twin -Undo` | 1 x3 editions each | 0 x3 editions | `FAIL: user prompt ran 0x (want 3)`; `FAIL: prompt returned 2 objects, want 1: [hook ran\|USERP> ]`; `FAIL: ERROR:prompt recursion`; twin `OK` on 7.4.7, 7.6.6, 5.1.26100.9444 |
| V14 | `matrix.sh bash FR/source-subst/check-source.sh plant-source.sh` / `twin-eval.sh` | 1 on 3.2 and 4.0-5.0 (posix leg); 0 on 5.1-5.3 | 0 on all 8 | 3.2: `FAIL default: no SOURCED_OK line (output: <empty>)`; 4.0-5.0 posix: parse error; plain `bash 3.2` exit status of the plant script itself is 0 |
| V15 | `shellcheck -s sh FR/source-subst/plant-source.sh` / `twin-eval.sh` (shellcheck 0.11.0) | 1 | 0 | SC3046, SC1090, SC3001; `-s bash` on the plant reports only SC1090 (so SC3001 needs `-s sh`) |
| V16 | `sh FR/greps.sh` (G1-G7 on `FR/greps/violation` vs `FR/greps/compliant`) | grep-exit 0 on all 7 (red) | grep-exit 1 on all 7 (green) | G1 `source <(` 2 lines; G2 blind rc append 3; G3 `PROMPT_COMMAND+=(` 2; G4 zsh `precmd()` 2; G5 `function fish_prompt` 1; G6 nu list assign 2; G7 elvish clobber 1 |
| V17 | `run.sh pwsh -NoProfile -File FR/hooks/pwsh/pssa-check.ps1 FR/hooks/pwsh/modern-hook.ps1` (PSScriptAnalyzer 1.25.0, `PSUseCompatibleSyntax`, `TargetVersions=@('5.1')`) / `pty-twin.ps1` | 1 | 0 | `PSUseCompatibleSyntax:2 The ternary expression syntax ... is not available by default in PowerShell versions 3,4,5,6`; same for `&&` |
| V18 | `sh FR/launcher/check.sh gen-plant.sh` / `gen-twin.sh` | 1 | 0 | plant `FAIL exit code: got 127 want 7`; twin `OK: argv exact, rc 7 kept, hostile root refused or safe` (alpine 3.22, bash 3.2, dash 0.5.12: 0) |
| V19 | `grep -qc '/nvm.sh' FR/exemplar-guards/rc-comment-only` | exit 0 (guard says "installed") | n/a | demonstrates the substring-guard false positive |
| V20 | `matrix.sh posix FR/source-subst/eval-status.sh` | n/a | n/a | `eval-of-substitution rc=0 capture-first noticed rc=3` on all 11 |
| Measurements (no red/green) | `startup/{bash,zsh,fish,nu}-probe*.sh`, `fish-order.sh`, `gitbash-probe.sh`, `profile-paths.ps1`, `nonascii.ps1`, `zsh-bridge.sh`, `version-guards/*`, `pathlist/*`, `source-subst/forms.sh` | | | tables in Findings 1, 9, 10, 8 |

Not run: any macOS/BSD claim (no host); the 4.0 Starship comment against a real macOS 3.2.57 `/bin/bash` (docker bash:3.2 stands in); OneDrive-redirected Documents (this host is not redirected; the claim rests on about_Profiles and the live-probe design).

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| 01 target order | cargo-dist@d1055f48071e:cargo-dist/templates/installer/installer.sh.j2:772 (`.profile .bashrc .bash_profile .bash_login`); Homebrew__install@8ab1549dfa11:install.sh:1138-1163 (picks per shell and OS) | ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:138-152 (`.bash_login` never); nvm-sh__nvm@b1b3a0038c06:install.sh:324-329 prefers `.bashrc` then `.bash_profile`, never `.bash_login` or `.profile` for bash |
| 02 own file | ocx profiles.rs:112-131 (`conf.d/ocx.fish`, `vendor/autoload/ocx.nu`); conda `shell/etc/fish/conf.d/conda.fish` (audit); fzf writes `$nu.user-autoload-dirs \| first` (audit, install:445-453) | omp writes its init into the autoload dir and caches it (audit) |
| 04/05 marker, idempotent | ocx rc_block.rs:9-13, :205-235 (versioned hashed fence, collapse duplicates); cargo-dist installer.sh.j2:1058-1059 (`grep -F` of the managed line) | nvm install.sh:484 substring guard; nvm install.sh:460 no marker, so no removal |
| 06 newline | nvm install.sh:493; cargo-dist installer.sh.j2:1077 (always prepends an empty line); ocx `apply_line_ending` (rc_block.rs:255-262) | Homebrew prints `echo >> rc` instructions (install.sh:1173) leaving repair to the user |
| 07/08 symlink, mode | cargo-dist and nvm append with `>>` in place (inode, mode, symlink survive) | ocx_util/src/fs.rs:236-251 rename of a 0600 temp file; `grep -c symlink` is 0 in rc_block.rs and lib.rs; www-setup@a251c3631047:src/install.sh:12-15 delegates the edit to it |
| 09 dirty | ocx rc_block.rs:192, exit 82 (measured) | nvm, cargo-dist overwrite nothing but cannot tell an edited block from none |
| 10 only primary | cargo-dist shotgun writes only existing files (installer.sh.j2:1088-1112) | ocx wrote `.zprofile`, `.zshrc`, `.config/powershell/profile.ps1` for a bash user |
| 11 undo | ocx `strip_block`/`remove_block` exist (rc_block.rs:280, :341) | no CLI; ocx prompt hooks have no removal until the shell ends (audit); nvm prints manual uninstall text (install.sh:391-396); cargo-dist has none |
| 13/14 `source <(` | starship@d4d0459c5c24:src/init/mod.rs:123-132 stub avoiding it; every emitter in the audit uses `eval "$(...)"` | none of the eight emits `source <(` in current templates (audit emitters-compared.md Axis 4); mise docs historically did |
| 15 bash hook | zoxide@86b443cffcd7 templates/bash.txt:64-74 (strip + `;`), direnv@28a73d1df3f3 shell_bash.go:13-33 (saves `$?`, returns it), ocx hook.rs:204-235 (strip, `declare -p`, status) | omp b0a8acd4d402 src/shell/scripts/omp.bash:189-215 (array append, inert on 3.2-5.0, 16-18 of 50 scenarios); ocx hook.rs:224 array arm (5/40); mise activate.sh:65-76 and direnv prepend into arrays (user element 1+ inert on <=5.0) |
| 16 zsh | ocx hook.rs:237-256, mise (`add-zsh-hook`), direnv shell_zsh.go:15-34 | none measured |
| 17 fish | zoxide, direnv, mise, ocx hook.rs:320-345 (`--on-event`) | conda wraps `fish_prompt` with `functions -c` plus a guard (works, but clobber-detection is on the user) |
| 18 nu | ocx: no append-safe hook point, inlines in its own `env.nu` shim; zoxide/mise append hooks with version pins (`nushell.txt:107`) | no exemplar uses a marker-closure removal; the twin is new |
| 19 elvish | ocx hook.rs:555-591 (marker as rest-arg name) | direnv and mise elvish appends unguarded (audit); zoxide `before-chdir` appended unconditionally |
| 20/21 pwsh | ocx hook.rs:384-428; mise `Test-Path variable:global:__mise_pwsh_chpwd` (audit); zoxide `$global:__zoxide_hooked` (audit) | starship replaces the global prompt without wrapping (audit) |
| 22 version guard | zoxide nu 0.106+ (nushell.txt:107), fzf `(version)` gate (audit), starship `bash 3.2 to latest` (audit) | fleet: 0 bash version guards in 166 files (fleet audit #10) |
| 25 launcher | ocx body.rs:15-74, safety.rs (`LauncherSafeString`) | none |

## AI-agent angle

| What an LLM characteristically gets wrong here | Smallest mechanical check |
|---|---|
| Appends to `~/.bashrc` with `echo ... >> ~/.bashrc` and no guard; runs it twice | G2 grep (`>> "$HOME/.bashrc"`), `check-rc-edit.sh` |
| Puts `export PATH` in `~/.bashrc` for a login-shell tool, or in `~/.profile` when `.bash_profile` exists | `bash-probe.sh`; reading check for `.bash_login` |
| Treats `~/.bash_profile` as the file everyone reads; forgets macOS/Git Bash are login-only and Debian `.bashrc` returns early | probe table in Finding 1 |
| Uses `source <(tool init bash)` (bash 4+ habit) in a macOS-bound or `sh` file | G1 grep; `shellcheck -s sh` SC3001 |
| Writes `PROMPT_COMMAND="$PROMPT_COMMAND;hook"` (syntax error when unset or trailing `;`) or `PROMPT_COMMAND=(...)`/`+=(...)` (bash 5.1+ only) | G3 grep; `FR/hooks/bash` harness on 3.2 |
| Defines `precmd()` or `function fish_prompt` or assigns the nu hook list literal to "register a hook" | G4/G5/G6 greps |
| Assumes a zsh `.profile` bridge needs no `emulate sh` and that zsh splits `$LIST` | `zsh-bridge.sh` |
| Uses `fish_add_path` with no scope in a `conf.d` file, or `set -U fish_user_paths` | G-style grep for `fish_add_path`, require `--global` |
| Assumes nu `env.nu` is the place for env/hooks, or that `login.nu` runs last, or that `nu -c` reads autoload | `nu-probe-pty.sh` |
| Writes `$PROFILE` as `~/Documents/PowerShell/...` for all editions; uses `?:`/`&&` in a profile destined for 5.1; non-ASCII text without BOM | `profile-paths.ps1`, V17, `nonascii.ps1` |
| Wraps `prompt` and prints to the output stream, or wraps twice (infinite recursion) | `hook-case.ps1` plants |
| Replaces a symlinked dotfile with `mv tmp rc` and `mktemp` mode 0600 | `check-symlink.sh`, `check-mode.sh` |
| Believes `readlink -f`, `sed -i`, `mktemp -p` are portable to macOS/BSD | unverified: read only; avoid or probe |
| `eval "$(cmd)"` assumed to propagate failure | `eval-status.sh` |
| Hallucinated flags/commands: `fish_add_path -U`/`--global` ordering, `nu config reset`, `Set-Content -Encoding utf8NoBOM` on 5.1 (7+ only), `PROMPT_COMMAND` as array on 3.2 | version-guards fixtures, shell `--help`/`Get-Command` probe |

## Contested / evolving

- **Array vs string `PROMPT_COMMAND`.** Bash 5.1 (2020) made the array a documented form; Fedora ships one, omp always writes one. Element-0 extension is robust to all; tools that append elements are right only on 5.1+. Trend: more arrays, but macOS `/bin/bash` stays 3.2.57, so the 3.2 constraint persists (as of 2026-10-11; unverified: read only for macOS 26 contents).
- **Edit the user's rc vs print instructions.** Homebrew prints, nvm and cargo-dist append, ocx owns a hashed fence and has `--no-modify-path`. The consensus for tools that must work unattended is an opt-out plus a reversible fence; print-only is the conservative alternative and is what an agent should do when it cannot ask.
- **nu autoload vs `config.nu`/`env.nu`.** Docs now call `env.nu` historical and recommend `config.nu` plus autoload; user autoload dirs came in 0.102 and `PROMPT_*` stopped being inherited in 0.103, hook order flipped in 0.107 (2025-09). nu churn is the highest of the targets; the trend is more files, fewer edits to the user's two.
- **fish and universals.** 4.3 (2025-12) stopped defaulting theme/key-binding universals and 4.8 (2026-06) dropped `__fish_initialized`; fish is moving away from `fish_variables`, but `fish_add_path`'s default scope is still universal on 4.9.3.
- **PowerShell floor.** 7.4 and 7.5 reach end of support 2026-11-10 (frame correction), so the "pwsh 7.4+" floor becomes 7.6 LTS while installers still target 5.1 until Windows ships something newer; emitted profile text therefore stays 5.1-syntax.
- **Hook count vs startup cost.** `eval "$(tool init)"` at every shell start costs 2.5-3 ms for starship/direnv/zoxide and 15-20 ms for mise (audit Axis 4); a cached init file is faster but needs invalidation (omp uses version+config hash). No consensus; measure.
- **wave-1 claims overturned by this wave.** (a) `source <(` fails on bash 4.0: measured false. (b) nu `login.nu` loads last: measured false (it precedes autoload). Both come from the audits, not the primary docs.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html | GNU Bash manual, startup files (primary) | bash 5.3 manual | the exact login/interactive/non-interactive file order, `BASH_ENV`, `sh`/POSIX-mode behaviour |
| https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html | GNU Bash manual, `PROMPT_COMMAND` (primary) | bash 5.3 | array vs string semantics |
| https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz (`NEWS`, lines 374-470, items `u`, `ee`) | bash release notes (primary) | 2025 | 5.1 added array `PROMPT_COMMAND` and process substitution in POSIX mode |
| https://zsh.sourceforge.io/Doc/Release/Files.html | zsh manual, Startup/Shutdown Files (primary) | zsh 5.9.2, 2026-07-12 | `.zshenv`/`.zprofile`/`.zshrc`/`.zlogin` order, `ZDOTDIR`, `RCS` |
| https://zsh.sourceforge.io/Intro/intro_3.html | zsh Introduction, startup files (primary) | classic | what belongs in each file |
| https://zsh.sourceforge.io/Doc/Release/User-Contributions.html | zsh contributions, `add-zsh-hook` (primary) | 5.9.2 | the dedupe-safe hook API |
| https://zsh.sourceforge.io/Doc/Release/Functions.html | zsh manual, special functions `precmd` (primary) | 5.9.2 | `precmd` and `precmd_functions` |
| https://raw.githubusercontent.com/fish-shell/fish-shell/master/CHANGELOG.rst | fish changelog (primary) | through 4.9.3, 2026-09-08 | 3.2.0 `fish_add_path`, 4.3 frozen theme files, 4.8 `__fish_initialized` removal |
| https://fishshell.com/docs/current/language.html | fish language reference, configuration files (primary) | 4.x | `conf.d`, `vendor_conf.d`, `config.fish` order and the interactive guard |
| https://fishshell.com/docs/current/cmds/function.html | fish `function` docs (primary) | 4.x | `--on-event` handlers |
| https://www.nushell.sh/book/configuration.html | Nushell book, configuration and launch stages (primary) | 0.116-era | stages 13-29, autoload dirs, `login.nu` position |
| https://www.nushell.sh/book/hooks.html | Nushell book, hooks (primary) | 0.116-era | hook types, REPL-only, append example |
| https://github.com/nushell/nushell.github.io/blob/main/blog/2025-09-02-nushell_0_107_0.md | Nushell 0.107 release notes (primary) | 2025-09-02 | `env_change` now before `pre_prompt` |
| https://github.com/nushell/nushell.github.io/blob/main/blog/2025-02-04-nushell_0_102_0.md | Nushell 0.102 release notes (primary) | 2025-02-04 | user autoload directories |
| https://github.com/nushell/nushell.github.io/blob/main/blog/2025-03-18-nushell_0_103_0.md | Nushell 0.103 release notes (primary) | 2025-03-18 | `PROMPT_*` no longer inherited |
| https://elv.sh/ref/command.html | Elvish reference, RC file (primary) | 0.21.0 | `rc.elv` lookup, legacy path ignored |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.6 | about_Profiles, pwsh 7.6 (primary) | updated 2026-05-01 | profile paths, order, OneDrive note, MSIX note |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-5.1 | about_Profiles, Windows PowerShell 5.1 (primary) | 5.1 | `WindowsPowerShell` directory |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html | POSIX.1-2024 XCU `sh` (primary) | 2024 | `ENV` is the only standardised rc hook |
| https://github.com/koalaman/shellcheck/wiki/SC3001 (local clone koalaman__shellcheck.wiki@0b4dfe7bf9dc) | ShellCheck: process substitution in POSIX sh (primary) | 0.11.0 | the lint that catches `source <(` under `-s sh` |
| https://github.com/koalaman/shellcheck/wiki/SC2178 (same clone) | ShellCheck: array assigned a string | 0.11.0 | why `PROMPT_COMMAND` string-vs-array code needs a justified disable |
| https://github.com/koalaman/shellcheck/wiki/SC1090 (same clone) | ShellCheck: non-constant source | 0.11.0 | the only finding `-s bash` gives on `source <(...)` |
| https://github.com/rcaloras/bash-preexec | bash-preexec README | current | "must be the last thing imported"; coexistence rule |
| https://scriptingosx.com/2017/04/about-bash_profile-and-bashrc-on-macos/ | practitioner article | 2017-04-12 | Terminal.app runs `.bash_profile`; `path_helper` (secondary; macOS claims unverified: read only) |
| https://github.com/romkatv/powerlevel10k (corpus romkatv__powerlevel10k@d05a1b00f9a6, README:1035-1075) | powerlevel10k docs | current | instant-prompt rules for `.zshrc` appends |
| nvm-sh__nvm@b1b3a0038c06:install.sh:311, :324-329, :460, :484, :493 | nvm installer | 2026 corpus | grep guard, newline repair, opt-out, target detection |
| Homebrew__install@8ab1549dfa11:install.sh:1138-1186 | Homebrew installer | 2026 corpus | per-shell, per-OS rc selection and print-don't-edit |
| axodotdev__cargo-dist@d1055f48071e:cargo-dist/templates/installer/installer.sh.j2:768-775, :1040-1115 | cargo-dist shell installer template | 2026 corpus | shotgun targets incl. `.bash_login`, exact-line guard, append |
| starship__starship@d4d0459c5c24:src/init/mod.rs:123-132 | starship init stub | 2026 corpus | why `source <(...)` is avoided |
| ajeetdsouza__zoxide@86b443cffcd7 templates/bash.txt:64-74; direnv__direnv@28a73d1df3f3 internal/cmd/shell_bash.go:13-33; jdx__mise@19e8c8f0d03d src/assets/bash/activate.sh:65-76; JanDeDobbeleer__oh-my-posh@b0a8acd4d402 src/shell/scripts/omp.bash:189-215 | four emitters' bash hooks | 2026 corpus | real PROMPT_COMMAND registration forms and their array behavior |
| ocx@5de9d777eb7d crates/ocx_setup/src/{profiles.rs,rc_block.rs,lib.rs}, crates/ocx_util/src/fs.rs, crates/ocx_shell/src/shell/hook.rs | the multi-shell emitter under test | 2026-10 | targets, fence state machine, atomic write, hook arms |
| www-setup@a251c3631047 src/install.sh:12-15, :553-566 | ocx installer | 2026-10 | installers delegate the rc edit to `ocx self setup` |
| Fedora 44 container (`fedora:latest`, bash 5.3.9) `/etc/bashrc`, `/etc/skel/.bash_profile`; ubuntu:24.04 `/etc/skel/.{profile,bashrc}`; archlinux `/etc/skel` | distro skeletons (measured, no URL) | 2026-10-11 | real PROMPT_COMMAND array; login files sourcing `.bashrc`; interactive guard |
