---
title: Shell scripting across operating systems and shells — phase 0 frame
program: shell
date: 2026-10-10
method: research-lang (POSIX sh and its implementations, bash across versions, zsh, ksh family, fish, nushell, elvish, PowerShell 5.1 and 7, the userland underneath them, and code that emits shell code for many shells)
status: active
branch: shell worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell); research lands on branch `shell`, not `main`
---

# Shell — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn. Corrections are appended at the bottom, never
edited into the body.

## The brief, as given

> Bash, or shell scripting generally, with a focus on compatibility across
> operating systems, including each OS's default shell and which features
> work in which version (for example the default bash on different distros
> or on macOS). Include fish, elvish, nushell, PowerShell (including Core),
> and variants such as ksh, dash and zsh. Bash in particular has a lot of
> online resources, including pitfalls.

The brief is the seed. The scout wave decides the scope.

## The domain and its era

Four layers:

- **The POSIX layer**: the POSIX.1-2024 XCU shell command language and
  utilities. The implementations and where each is the default: dash
  (Debian/Ubuntu `/bin/sh`), busybox ash (Alpine, embedded, initramfs), bash
  in POSIX mode (RHEL/Fedora/Arch `/bin/sh`, macOS `/bin/sh`), FreeBSD sh,
  mksh (Android), ksh93u+m, yash, and posh (the Debian strict-POSIX test
  shell). The userland underneath matters as much as the shell: GNU
  coreutils, BSD/macOS utilities, busybox applets, and uutils (Ubuntu 25.10+
  ships Rust coreutils by default; verify). Typical traps: `sed -i`,
  `readlink -f`, `date -d`, `mktemp`, `grep -P`, `stat`, `sha256sum` vs
  `shasum -a 256`, `xargs -r`, and `find -printf`.
- **The bash/zsh/ksh layer**: bash 3.2.57 (macOS `/bin/bash`, frozen by
  GPLv3) through 5.3 (current, 2025). Each line added features scripts lean
  on: assoc arrays, `mapfile`, `${x,,}`, `[[ -v ]]`, `local -n`, `wait -n`,
  `${var@Q}`, `EPOCHREALTIME`, and in 5.3 `${ cmd; }` funsubs. Behaviour
  changed too: `set -e` semantics, `inherit_errexit`, `[[`/`=~` quoting,
  `shopt` compat levels. zsh 5.x is the macOS login shell since Catalina,
  with its own non-splitting, 1-based arrays and `emulate`. ksh93 and mksh
  form the Korn family.
- **The non-POSIX shells**: fish (4.x is the Rust rewrite; distros still
  carry 3.x), nushell (pre-1.0, syntax churn every release; 0.114 deprecated
  `str upcase`, measured), elvish (pre-1.0), and PowerShell: Windows
  PowerShell 5.1 (preinstalled on every Windows, frozen) vs PowerShell 7.x
  (`pwsh`, cross-platform, not preinstalled). The 5.1/7 split covers
  encoding defaults (BOM, UTF-16), `$IsWindows` (null in 5.1, measured),
  `&&`/`||` and the ternary operator (7+ only), `-Parallel`, native-argument
  passing (`$PSNativeCommandArgumentPassing`), and
  `$ErrorActionPreference` vs native exit codes
  (`$PSNativeCommandUseErrorActionPreference`).
- **Shell as a target, not a language**: code that *generates* shell code for
  many shells. That covers activation scripts, prompt hooks, rc-file
  blocks, completions, shims and installers (`curl | sh` plus
  `irm | iex`). Each target shell needs its own escaping, its own
  rc/profile location, and a hook model (bash `PROMPT_COMMAND`, zsh
  `precmd`/`chpwd`, fish events, nu `env_change` hooks, elvish
  `after-chdir`, PowerShell prompt wrapping). Plus CI shells: GitHub Actions
  `run:` defaults differ per OS (`bash -e {0}` vs `pwsh`), and taskfile
  `cmds` run under mvdan/sh, not the system shell.

Era, to **verify, not assume** (the recent-shifts scout owns this). Current
releases measured 2026-10-10 from the ocx index and Docker Hub: fish 4.9.3,
nushell 0.116.0, elvish 0.21.0, pwsh 7.6.6 (7.4 LTS still served), bash
5.3.20, zsh 5.9, dash 0.5.12, busybox 1.37, ksh93u+m 1.0.10, mksh R59c,
shellcheck 0.11.0, shfmt 3.13.1. Debian 12 carries fish 3.6.0; Debian 13
carries fish 4.0.2 and drops yash and posh. Windows host: Windows PowerShell
5.1.26100, Git Bash 5.2.15.

## The codebases that will adopt the output

1. **The fleet** (measured 2026-10-10 under `/home/mherwig/dev`, excluding
   worktrees, `.tmp-*`, sibling clones and caches): ~1450 `*.sh`, 132
   `*.bash`, 49 `*.ps1`, 22 `*.fish`, 21 `*.nu` and 1 `*.elv`, plus ~1100
   extensionless `#!/bin/sh` files (origin unknown, possibly generated
   shims; the audit must explain them). Per-repo counts are inflated by
   `.tmp/` trees (ocx: 791 raw, ~180 real). Inline shell sits in
   `taskfile.yml` `cmds` and GitHub workflow `run:` blocks.
2. **ocx's multi-shell emitter**: `crates/ocx_shell` (`shell.rs`,
   `escape.rs`, `hook.rs`, `reconcile/`), `crates/ocx_setup` (`rc_block.rs`,
   `profiles.rs`, `shims.rs`), and `ocx_cli` `self activate`. It emits
   activation and hook code for several shells, including elvish and
   nushell. This is the strongest pull on the program: a real emitter whose
   escaping can be run through every target interpreter.
3. **Installers and setup actions**: ocx/grimoire install scripts
   (`install.sh` / `install.ps1` pairs), `setup-ocx` and `setup-grimoire`
   GitHub actions, `www-setup`.
4. **External consumers** of the published lore set.
5. **The exemplar corpus**: 41 upstream repos fetched 2026-10-10 as blob-less
   depth-1 clones under `~/.cache/research-lang/exemplars/shell/<owner>__<repo>`
   (shell-only sparse checkouts for the large ones). It covers POSIX
   installers (rustup, nvm, Homebrew, deno, docker, acme.sh, cargo-dist,
   dotnet-install, k3s, vcpkg), bash tools (pyenv, rbenv, pure-bash-bible,
   bats-core, shellspec, git's `t/`), cross-shell spec tests (oils
   `spec/`), zsh (ohmyzsh, powerlevel10k, zsh-autosuggestions), multi-shell
   emitters (zoxide, direnv, fzf, starship, mise, atuin, conda, oh-my-posh),
   fish/nu/elvish (fish-shell `share/`, fisher, nu_scripts, nu-std, elvish
   mods), PowerShell (PowerShell `tools/`, PSScriptAnalyzer, Pester, Scoop
   and its installer, posh-git), runner-images (CI shell facts), and the
   ShellCheck wiki. Recreate with
   `shell-audit/scratch/fetch-exemplars.sh <dir>`. SHAs:
   `shell-audit/scratch/exemplar-shas.md`.

## Measurement toolchain

`~/.cache/research-lang/shell-tools/` (copies in `shell-audit/scratch/`):

- `run.sh <cmd>`: ocx toolchain with fish 4.9.3, nu 0.116.0, elvish
  0.21.0, pwsh 7.6.6, shellcheck 0.11.0 and shfmt 3.13.1 on PATH.
  `RUN_GROUP=old` swaps in fish 4.7.0 and nu 0.105.1.
- `matrix.sh <family> <script> [args]`: runs one script under every
  interpreter in a family and prints `== <interp>`, the output, and
  `-> exit N`. Families:
  - `posix`: dash, busybox ash 1.35/1.37, mksh, ksh93u+m x2, yash, posh,
    bash 3.2/5.2 `--posix`, zsh `--emulate sh`
  - `bash`: 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3
  - `zsh`: 5.0.8, 5.3.1, 5.8, 5.9
  - `fish`: 3.6.0, 4.0.2, 4.7.0, 4.9.3
  - `nu`: 0.105.1, 0.116.0
  - `elvish`
  - `pwsh`: 7.4 LTS, 7.6.6, Windows PowerShell 5.1
  - `win`: Git Bash, Windows PowerShell 5.1, run on the WSL Windows host from
    `C:\Users\ecom\shell-wintest`

  Scripts must live under `~/.cache/research-lang/`. Fixtures go in
  `~/.cache/research-lang/shell-tools/fixtures/<worker>/`, never in `/tmp`
  (tmpfs is 88% full) or in an exemplar clone.
- Images: official `bash:*`, `zshusers/zsh:*`, local `shellzoo:deb12` and
  `shellzoo:deb13` (Debian shell packages), `alpine:3.22`, `busybox:1.37`,
  `ubuntu:24.04`, `mcr.microsoft.com/powershell:lts-7.4-ubuntu-22.04`.
- **No macOS host.** `bash:3.2` reproduces macOS `/bin/bash` 3.2.57
  semantics. BSD userland differences (`sed -i ''`, `date -v`, `stat -f`)
  are read-only research and must say so. FreeBSD sh: read-only.

## Existing AI config that already touches this domain

No shell set exists in the catalog. Shell appears incidentally: `checks/*.sh`
in the swift-quality and code-docs rules, CI notes in bazel-quality and
swift-package, and the Rust set's `cli-contract` depth file (exit codes,
streams), which shell scripts should mirror. The config-inventory audit
must list every such touchpoint and say which a shell set must not
duplicate.

## Orchestrator's hypotheses (to test, not to assume)

- **H1** Most fleet `#!/bin/sh` scripts contain bashisms that pass only
  because the author's `/bin/sh` was bash. `shellcheck -s sh` finds SC3xxx
  in a large share of them.
- **H2** `set -euo pipefail` is cargo-culted: present in most bash scripts,
  but with patterns it silently fails on (`local x=$(cmd)`, `cmd || true`
  inside functions called from conditionals, pipelines into `while read`).
- **H3** ocx's per-shell escaping has edge cases (single quote, `$`,
  backtick, backslash, newline, `%`, non-ASCII, a leading `-`) in at least
  one of fish, nu, elvish or pwsh, found by running emitted code through
  the matrix.
- **H4** Installers assume GNU userland or bash 4+ somewhere (`readlink -f`,
  `sed -i`, `mapfile`), breaking on macOS or Alpine. The upstream installers
  (rustup, deno, cargo-dist) are strictly POSIX for this reason.
- **H5** GitHub Actions `run:` steps rely on the default shell without
  knowing it: `bash -e {0}` (no pipefail) unless `shell: bash`; pwsh on
  Windows; `$ErrorActionPreference = 'stop'` is prepended for pwsh, but
  native exit codes only fail the step on the last command.
- **H6** Agents fail most on: bashisms under `#!/bin/sh`, unquoted
  expansions, `echo -e`/`echo -n`, `which`, `function f()` in sh, `local`
  in strict POSIX (posh), bash-4 features in macOS-targeted scripts, GNU-only
  flags, `[[` in sh, and arrays in sh. In PowerShell: 5.1/7 differences,
  ternary and `&&` in 5.1, `Invoke-WebRequest` without `-UseBasicParsing`
  on 5.1, BOM and encoding, `Write-Host` vs output streams. In nushell:
  deprecated or renamed commands from older training data. In fish 3 vs 4:
  removed features. In zsh: assuming word splitting.
- **H7** macOS still ships `/bin/bash` 3.2.57 and `/bin/zsh` 5.9 in macOS 26.
  `/bin/sh` is bash 3.2 in POSIX mode, selectable to dash via
  `/private/var/select/sh`. Homebrew's bash is 5.x but not first on PATH
  in non-login contexts.
- **H8** PowerShell 7.6 is the current LTS line and 7.4 LTS reaches end of
  support in Nov 2026. Windows still ships only 5.1, so installers must
  target 5.1.
- **H9** nushell's churn makes long-lived generated nu code the riskiest
  target. Nu emitters break across 0.10x releases more often than any other
  shell.

## Artifact set (what this program must converge to)

Hypothesis, revised by the map:

| Artifact | Kind | Scope |
|---|---|---|
| `shell-quality` | rule, globs `**/*.sh`, `**/*.bash`, `**/*.zsh`, `**/*.ksh`, `**/.shellcheckrc`; index + depth files | POSIX vs bash dialect choice, quoting/expansion, errexit semantics, portability matrix (versions x OS x userland), traps and cleanup, argument parsing, temp files, CI shells, gates (shellcheck/shfmt/bats) |
| `powershell-quality` | rule, globs `**/*.ps1`, `**/*.psm1`, `**/*.psd1` | 5.1 vs 7 compatibility, error model, native commands, encoding, modules, PSScriptAnalyzer, Pester |
| fish / nushell / elvish coverage | depth files (or a small `alt-shells` rule; the map decides) | idioms, version churn, integration-code patterns |
| `shell-integration` | skill | emit shell code for N shells: escaping per shell, rc/profile locations, hooks, activation and deactivation, completion registration, verified through the matrix |
| `installer-script` | skill | `install.sh` + `install.ps1` pair: platform detection, download and verify, PATH and profile edits, idempotency, no-root installs |
| `shell-port` / `shell-diagnose` | skill(s), if the map justifies them | port a script to a target matrix; error catalog across shells |
| `shell-essentials` | bundle, untagged members | |

## Owner-question defaults (applied; the owner may overturn)

- **Q1 Dialect floor**: POSIX sh for installers and anything that runs
  before a toolchain exists. Bash only where bash features are needed, and
  then bash 3.2-compatible if the script can run on macOS. Bash 4+/5 only
  where the interpreter is pinned (CI images, containers).
- **Q2 PowerShell floor**: Windows PowerShell 5.1-compatible for installers
  and bootstrap. pwsh 7.4+ elsewhere.
- **Q3 fish/nu/elvish depth**: integration code (activation, hooks,
  completions, generated code) first, then scripting idioms. No full style
  guides for these shells.
- **Q4 Windows verification**: workers may run read-only probe scripts on
  the WSL Windows host through `matrix.sh win|pwsh` (staged only under
  `C:\Users\ecom\shell-wintest`), per the owner's standing "Windows checks
  run locally" instruction.
- **Q5 macOS**: no host. bash 3.2 via Docker stands in for `/bin/bash`; BSD
  userland and macOS-only claims are read-only and labelled unverified.
- **Q6 ocx findings**: emitter defects found by measurement are reported as
  evidence (file:line plus a reproducer) in the audit, not fixed in this
  program.

## Corrections

(appended by later phases)

### From the map (2026-10-11, `shell-topic-map.md` › Frame corrections)

- .sh count is 647 raw / 187 authored, not ~1450 [fleet], [cfg] s6.4
- Extensionless #!/bin/sh files are 389-393, not ~1100; 313-376 are gitignored ocx trampolines and only 6 are authored [fleet] #3, [cfg] s6.4
- .bash 5 not 132; .ps1 23-25 not 49; .fish 6 not 22; .nu 3 not 21 [fleet]
- H1 refuted: 0/190 sh-shebang scripts carry SC3xxx (exemplars 3.5%) [fleet] #6, [ex]
- H2 split: errexit present in 77% of non-snippet bash; the hazard is SC2310 x69 / SC2312 x150 suppression [fleet] #9
- H3 confirmed and sharpened: pwsh curly quotes U+2018-201B escape the literal (ocx escape.rs:35 plus four upstreams); a shared POSIX quoter fails 17-18/20 on fish/nu/elvish [ocx], [emit]
- H4 refuted for installers; GNU-isms only in test/manual and Swift checks; but www-setup's installer crashes on busybox wget [fleet] Axis 5, [inst]
- H5 confirmed and extended: a mid-script native failure in a pwsh step is invisible on 5.1 and 7.6.6 [plat]
- H9 split: nu churns most (4.5% vs fish 0.6%), but ocx's guarded nu passes 0.105.1 and 0.116.0 [ex], [ocx]
- ocx ships no installer pair; the installers live in www-setup/src, and grimoire uses a cargo-dist 0.33.0 front door [ocx], [inst]
- The code-docs rule globs shell extensions but carries no shell checks [cfg]
- nushell current is 0.116.1 (2026-10-04) [canon], [shift] s9
- zsh 5.9.1 and 5.9.2 exist; 5.10 is unreleased [shift] s6
- elvish -compileonly exists and works on 0.21.0 (55/55); [ocx] was wrong [inst], [ex]
- Debian 13 drops yash but keeps posh 0.14.1 [shift] s5
- A dash version string does not identify features: Debian 0.5.12-12 accepts pipefail, -2 and -6ubuntu5 reject it [shift] s3, [plat]
- ubuntu-latest moves to 26.04 between 2026-10-19 and 2026-11-19 (bash 5.3.9, uutils, ShellCheck 0.11.0) [shift] s13
- Ubuntu 25.10+ ships uutils coreutils, not GNU [shift] s12
- Rule frontmatter has no description/metadata: paths, summary, keywords, license, repository [cfg] s1.2
- The depth-file never-glob is adopted by only 19/155 depth files, and the checker does not enforce it [cfg] s1.6
- .shellcheckrc matches 0 fleet files; the only PSSA settings file is www-setup's [cfg] s6
- No glob form reaches shebang-only scripts on any client or the checker [cfg] s2.4
- GHA windows-2025 shell: bash is Git Bash 5.3.15; the host's is 5.2.15 [plat], [shift] s13
- PowerShell 7.4 is no longer a floor to write: 7.4 and 7.5 reach EOS 2026-11-10, so Q2 becomes 7.6 LTS [shift] s11
- macOS /bin/sh is bash 3.2 in POSIX mode, not dash as fleet quality-bash.md claims [plat], [frame] H7

### Owner-question defaults applied by the map

See `shell-topic-map.md` › Questions for the owner (Q1-Q8); defaults applied.
