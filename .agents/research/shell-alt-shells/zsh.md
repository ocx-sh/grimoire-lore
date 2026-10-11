---
title: zsh scripts and bash code sourced in zsh — what breaks, what to declare, what to gate
topic: shell scripting across shells and operating systems (family SH-ZSH; wave 3, W3-3 revised)
agent: alt-shells/zsh
model: sonnet
date_researched: 2026-10-11
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/zsh/
scope: |
  Covered: native zsh 5.0.8 / 5.3.1 / 5.8 / 5.9 (docker zshusers/zsh), plus 5.5.1, 5.7.1, 5.9.2 and master "5.9.999.3-test" (the 5.10 draft, built from tags and git at fixtures/zsh/build/) for splitting, arrays, nomatch, path/status ties, ERR_EXIT and ERR_RETURN, emulate -L sh / emulate -L zsh / emulate sh -c, trap EXIT in functions, startup files, shfmt -ln zsh, zsh -n, ShellCheck SC1071, zshellcheck 1.8.0; the expansion zsh-semantics follow-up, SH-ERR-27 and M-X-02.
  Not covered: macOS-only behaviour (no macOS host: every macOS and BSD-userland claim is marked "unverified: read only"), zsh completion/ZLE authoring, fish/nushell/elvish (sibling files), and the SH-EMIT-25 hook and the zsh rc writing, which are cited, not restated.
---

# zsh scripts and bash code sourced in zsh

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. What the fleet actually has
   - 2. The prologue: `emulate -L zsh` and what it silently undoes
   - 3. Broken bash habits, measured (splitting, arrays, names, tests, read)
   - 4. Special names: `path`, `status`, `pipestatus`, `argv`
   - 5. `nomatch`: unmatched globs, the five M-X-02 sites and the larger set
   - 6. `set -e`, `! pipeline`, `ERR_EXIT`, `ERR_RETURN` and the 5.10 draft
   - 7. `trap ... EXIT` in functions (SH-ERR-27 decision)
   - 8. The `emulate` bridge for bash and POSIX code sourced in zsh
   - 9. Startup files and where each thing goes
   - 10. Version pins: what a script may assume
   - 11. The gate: `zsh -n`, shfmt, ShellCheck, zshellcheck, the grep gate
   - 12. Is zsh a CI shell
   - 13. Mapping of SH-EXP-01..23 onto native zsh
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

Conventions: "zsh 5.9" etc. are `zshusers/zsh:<v>` images; "5.9.2" and "5.10-dev" are builds from `zsh-5.9.2` and git master (`zsh 5.9.999.3-test [zsh-5.9.0.3-test-489-gfc3cff4]`), 5.10 is unreleased. Fixture paths are under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/zsh/`; `zall.sh SCRIPT` runs one script on those six builds. SH-DIAL, SH-ERR, SH-EXP, SH-EMIT, SH-GATE, SH-CI IDs refer to the sibling consolidations.

## Summary

- zsh does not word-split unquoted parameters: `list="a b c"; for w in $list` runs once (`n=1`) on 5.0.8 through 5.10-dev; split with an array, `${=list}` or `${(z)list}`, and never `setopt sh_word_split` globally ([FAQ 3.1](https://zsh.sourceforge.io/FAQ/zshfaq03.html), fixtures `idioms.sh` row `split-var`).
- Arrays are 1-based: `${a[0]}` is empty, `${a[-1]}` is the last element, and `unset 'a[1]'` leaves a hole (`count=3 elems=[|y|z]`); remove with `a[1]=()` (`count=2`) on 5.0.8 and 5.9 (`probes/arr-unset.zsh`).
- `emulate -L zsh` inside a function silently turns the caller's `set -e` off: `set -e; f() { emulate -L zsh; false; echo X }` prints `X` on all six builds; restate `-o err_return` (functions) or `-o err_exit` (script top) after it (`errexit/prologue-plant.zsh` exit 0 on 6/6, `prologue-twin.zsh` exit 1 on 6/6).
- `path`, `fpath`, `cdpath`, `manpath` are tied to their upper-case twins and `status` is the read-only twin of `$?`: `local path=/z` makes `ls` vanish (rc 127) on 5.3.1-5.10-dev and is a hard error on 5.0.8; `status=1` is a read-only error on every build.
- Replace the bash spellings: `pipestatus` (not `PIPESTATUS`), `read -A` (not `-a`; `read -p` means coprocess), `${(P)n}` (not `${!n}`), `${(k)h}` (not `${!h[@]}`), `${(U)x}` (not `${x^^}`), `${(%):-%x}` / `${0:A:h}` (not `BASH_SOURCE`), `setopt` (not `shopt`), no `mapfile`, no `export -f`; a two-tier grep catches 12 + 6 lines on the 17-defect plant, 0 on the twin, 0 false positives on a valid-zsh guard.
- An unmatched glob is an error, not a literal: external command `ls *.zzz` is skipped (status 1, script continues), but `echo *.zzz`, `for f in *.zzz` and any function body abort the whole script; use `*.zzz(N)` (and then guard the empty list: `ls *.zzz(N)` lists the cwd) or `setopt local_options null_glob`.
- M-X-02 is bigger than 5 sites: all six sampled catalog blocks die under zsh on 6/6 builds, and a grep finds at least 18 command-position unquoted-glob sites in 15 catalog files (`.bazelrc*`, `WORKSPACE*`, `*.md`, `*.bzl`).
- `set -e; ! false | true` exits 1 on zsh 5.0.8 only (5.3.1+ continue); `set -e; f() { true }; ! f` exits 1 on 5.0.8-5.9.2 and continues on 5.10-dev ([README, Incompatibilities since 5.9](https://raw.githubusercontent.com/zsh-users/zsh/master/README)); `if ! cmd; then` behaves the same on all six builds.
- ERR_EXIT/ERR_RETURN changed in the 5.10 draft in four ways (negated function calls, `always`, function calls no longer inherit the complex-command exemption, `&&`/`||` ignore ERR_RETURN in the left operand); a script that must run on 5.9 and 5.10 writes `cmd || return` and `if ! cmd`, nothing cleverer.
- SH-ERR-27 moves from CONSIDER to SHOULD for zsh-only code and MUST for any library sourced by both bash and zsh: a function-scoped `trap ... EXIT` fires at function return on every zsh build, so `mk_work() { work=$(mktemp -d); trap 'rm -rf "$work"' EXIT; }` deletes the directory it just made (`work-dir-GONE-after-helper` on 6/6 builds, `alive` on bash 3.2-5.3).
- The bridge `emulate sh -c '. lib.sh'` (or a wrapper function that sources and calls under `emulate -L sh`) repairs splitting, 0-based arrays, nomatch and `[ == ]` on 5.3.1+ (`all-ok` on 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev); it cannot repair `PIPESTATUS`, `read -a`, `local path`, `status`, `${x^^}`, `BASH_REMATCH`, `FUNCNAME`, `mapfile` or `export -f`; on 5.0.8 even `local arr=(x y z)` fails.
- Define the floor: authored zsh scripts target 5.8 (macOS 12 `/bin/zsh`; 5.9 from macOS 14, per the platform audit); emitted rc code keeps 5.0.8. 5.0.8 lacks `local a=(...)` (NEWS 5.1), `printf -v`, `typeset -A h=([k]=v)` (NEWS 5.5), the `--emulate` flag, and its `zsh -n` rejects `${a[1]}`.
- `.zshenv` is read by every zsh including `zsh -c` and scripts; `zsh -f` skips every rc file; `zsh -l -c` reads `.zprofile` and `.zlogin` but not `.zshrc`; keep `.zshenv` to silent exports.
- ShellCheck is not a zsh gate: SC1071 is exit 1 on the plant and on the compliant twin; `-s bash` returns 12+ false positives on the twin. `shfmt -ln zsh` (3.13.0+) parses 498 of 572 exemplar zsh files on 3.13.1 and 518 on 3.14.1 and misses `always`, `foreach`, `repeat`, `for k v in`.
- The gate for `*.zsh` is: `zsh -n` on 5.3.1+ (never 5.0.8), the two-tier grep, one runtime fixture run on the floor and ceiling builds, and `shfmt -ln zsh -i 2 -l` on an explicit file list as advisory; zshellcheck 1.8.0 is not adopted (it discriminates 7 of 17 plants).
- zsh is not a CI shell: GitHub Actions has no built-in `shell: zsh`; zsh appears in the fleet only as a tested target shell (`www-setup/.github/workflows/test-docker-matrix.yml:92`), so zsh files are exercised by `zsh -f script` inside a bash step.

## Findings

### 1. What the fleet actually has

- The fleet census counts 1 `.zsh` file, and it is vendored, not authored: `ocx-contrib/mirror-pdm-project/.ocx-mirror/home/.local/share/pyapp/pdm/.../pdm/cli/completions/pdm.zsh` (a pdm-generated completion inside a pyapp venv). There are 0 authored zsh scripts and 0 `.zshrc` ([config-inventory §6.4](../shell-audit/config-inventory.md), re-found with `find` under the fleet exclusions on 2026-10-11).
- zsh enters the fleet in three other ways: (1) ocx and the grimoire/ocx installers emit code that zsh sources (`ocx@d0cdf8838:crates/ocx_shell/src/shell/hook.rs:237-256`, `zsh_registration` with `add-zsh-hook`; 0 failures on zsh 5.0.8-5.9 plain and under `set -eu`, [ocx-emitter §3](../shell-audit/ocx-emitter.md)); (2) the catalog's own command blocks are pasted into a developer's zsh (macOS default login shell since 10.15, [Apple](https://support.apple.com/en-us/102360)); (3) zsh is a tested target login shell (`www-setup@a251c36:.github/workflows/test-docker-matrix.yml:92` `shell: [bash, dash, zsh, ksh, fish, nu, elvish]`; `ocx@795719f6b:.github/workflows/shell-activation.yml:4`).
- Consequence for the set: SH-ZSH is mostly a **review-and-port** family (bash code that reaches zsh, emitted code, pasted commands), with a small **authoring** half. The `**/*.zsh` glob is live in no fleet root (the checker needs `--allow-absent`, [map Artifact set decision](../shell-topic-map.md)).

### 2. The prologue: `emulate -L zsh` and what it silently undoes

Primary text: `emulate -L` sets `LOCAL_OPTIONS`, `LOCAL_PATTERNS` and `LOCAL_TRAPS` so the emulation and every `setopt`/`trap` is local to the enclosing function ([zsh manual, emulate](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html)); the Options manual recommends it as the way a function "guarantee[s] itself a known shell configuration" ([Options, LOCAL_OPTIONS](https://zsh.sourceforge.io/Doc/Release/Options.html)). Without `-R` only options "likely to cause portability problems" are reset. Measured consequence:

```zsh
# RED (errexit/prologue-plant.zsh): exit 0 on 5.0.8, 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev
emulate -L zsh -o err_exit -o no_unset -o pipe_fail
helper() { emulate -L zsh; false; print -r -- "NOTREACHED-in-helper"; }
helper
print -r -- "AFTER-helper"          # prints: NOTREACHED-in-helper / AFTER-helper

# GREEN (errexit/prologue-twin.zsh): exit 1 on all six, nothing printed
emulate -L zsh -o err_exit -o no_unset -o pipe_fail
helper() { emulate -L zsh -o err_return -o no_unset -o pipe_fail; false; print -r -- "NOTREACHED-in-helper"; }
```

- So `emulate -L zsh` resets `ERR_EXIT`: after it, a function that depends on the caller's `set -e` runs on. The same holds for `set -e` (outer) with `emulate -L sh` (`errexit.zsh` cases `emulate-L-zsh`, `emulate-L-sh`: `0:after-false~after` on 6/6).
- `setopt err_return` without `local_options` leaks: the function returns at the first failure, and the option stays on in the caller, which then exits at its next non-zero status (`errret-nolocal` exit 1, `errret-local` prints `after-f rc=1` and `g-continues`, 6/6).
- A script top-level `emulate -L zsh` with no `setopt err_exit` leaves errexit off (`top-emu-noset`: exit 0, prints `X`); with it, exit 1 (`top-emu`).
- Script start-up files differ by invocation, so a script is also exposed to the user's `.zshenv` (see 9); `emulate -L zsh -o ...` at the top resets the options a user's `.zshenv` set, but not the environment variables it exported.
- **Library prologue (sourced into an unknown user shell):** fzf shows the full pattern: quote every builtin until `emulate`, then `'builtin' 'emulate' 'zsh' && 'builtin' 'setopt' 'no_aliases'`, wrap the body in `{ ... } always { restore options }` (`junegunn/fzf@25adb674537b:shell/completion.zsh:18-24,71-73`). Local, scoped contrast for one function: `setopt localoptions ksh_arrays` (`completion.zsh:223`).
- **Decision (zsh.md row "prologue"):** (a) executable script: shebang `#!/usr/bin/env zsh`, then `emulate -L zsh -o err_exit -o no_unset -o pipe_fail` as the first statement; (b) every function that opens with `emulate -L zsh` restates `-o err_return -o no_unset -o pipe_fail`; (c) a library sourced into a user shell follows fzf (`emulate zsh`, `no_aliases`, `always` restore) because it cannot own the caller's options. `pipe_fail` and `set -o pipefail` both work (errexit.zsh `pipefail`: exit 1 on 6/6).

### 3. Broken bash habits, measured

All rows from `idioms.sh` (each idiom in its own child zsh; `out-zsh-all.txt`; bash twin `out-bash.txt`). Unless two builds are named, 5.0.8 through 5.10-dev agree.

| Idiom (bash meaning) | zsh result | zsh form | Version note |
|---|---|---|---|
| `x="a b  c"; for i in $x` (3 iterations) | `n=1` | `for i in ${=x}` / `${(z)x}` / an array | all builds |
| `f $e` with `e=""` (bash: 0 args after unquoted split) | `0` args for `f $e`, `1` for `f "$e"` | quote anyway: empty unquoted elides | all builds |
| `x="*.txt"; echo $x` (bash globs) | `*.txt` literal | `echo $~x` for GLOB_SUBST | all builds |
| `${a[0]}` | empty | `${a[1]}` | all builds |
| `${a[-1]}`, `${#a[@]}` | `z`, `3` | same | all builds |
| `$a` on an array | all elements `x y z` (bash: first) | `${a[1]}` | all builds |
| `unset 'a[1]'` | `3  y z` (hole stays) | `a[1]=()` removes | 5.0.8, 5.9 |
| `read -a arr` | `bad option: -a` | `read -A arr` | all builds |
| `read -p "prompt> " v` | `-p: no coprocess` | `read -r '?prompt> ' v` | all builds |
| `read -n1` / `read -k1` | `[]` / `not interactive and can't open terminal` | `read -k 1` interactive only | all builds |
| `${PIPESTATUS[0]}` | empty | `${pipestatus[1]}` (`[1 0 1]` for `false\|true\|false`) | all builds |
| `${!n}` | `bad substitution` | `${(P)n}` | all builds |
| `${!h[@]}` | `bad substitution` | `${(k)h}` | all builds |
| `${x^^}`, `${x,,}` | `bad substitution` | `${(U)x}`, `${(L)x}` | all builds |
| `declare -A h=([a]=1 [b]=2)` | 5.0.8: `unknown file attribute`; 5.3.1: `no matches found: [a]=1`; 5.5.1+: `2` | `typeset -A h; h=(a 1 b 2)` | NEWS 5.5 |
| `mapfile`, `readarray` | `command not found` | `lines=("${(@f)$(<file)}")` | all builds |
| `shopt -s nullglob` | `command not found` (127) | `setopt null_glob` | all builds |
| `export -f g` | 5.0.8 prints the function; 5.3.1+: `invalid option(s)` | none | 5.1+ |
| `typeset -n` / `declare -n` | `bad option: -n` | named references exist only in 5.10-dev (zsh/ksh93 module) | NEWS "Changes since 5.9" |
| `wait -n` | `job not found: -n` | none | 5.0.8-5.10-dev |
| `printf -v var` | 5.0.8: prints `-v`; 5.3.1+: works | | 5.3+ |
| `[ a == b ]` | `= not found` (exit 1) | `[ a = b ]` or `[[ a == b ]]` | all builds |
| `${BASH_REMATCH[1]}` after `[[ =~ ]]` | empty | `$match[1]` / `$MATCH`, or `setopt BASH_REMATCH` (works on 5.0.8) | all builds |
| `${FUNCNAME[0]}`, `${BASH_SOURCE[0]}` | empty | `${funcstack[1]}`, `${(%):-%x}`, `${0:A:h}` | all builds |
| `echo "a\tb"` | tab (BSD_ECHO off); `echo -e` also works | `print -r -- 'a\tb'`, `printf` (SH-EXP-09) | all builds |
| `local x=$(false)` | status masked, `rc=0` (SH-ERR-01 holds) | `local x; x=$(false)` | 6/6 |
| `set -o pipefail` | works | `setopt pipe_fail` | 6/6 |

Why `[ a == b ]` fails: the EQUALS option does `=cmd` filename expansion, so the word `==` is looked up as the command `=` ([Options, EQUALS](https://zsh.sourceforge.io/Doc/Release/Options.html), [Expansion](https://zsh.sourceforge.io/Doc/Release/Expansion.html)); the manual states that `=` is "the only one generally used with the test and [ builtins" ([Conditional Expressions](https://zsh.sourceforge.io/Doc/Release/Conditional-Expressions.html)). `zsh -n` on 5.9 does not flag it; the runtime does (`bz_eq: = not found`).

The option names that make zsh behave like bash exist and were each pinned on 5.0.8-5.10-dev (`opts-compat.zsh`): `BASH_REMATCH` (`bc b`), `KSH_ARRAYS` (0-based), `SH_WORD_SPLIT` (3 words), `GLOB_SUBST`, `NO_NOMATCH`, `PIPE_FAIL`. Setting them globally changes every function the user sourced after you, so use them only inside a function with `local_options`, as autosuggestions does (`zsh-users/zsh-autosuggestions@85919cd1ffa7:src/util.zsh:7` `setopt localoptions EXTENDED_GLOB`) and fzf does for `ksh_arrays` (`completion.zsh:223`).

Interactive-only hazards matter for pasted catalog blocks (zsh 5.0.8 and 5.9, `interactive.sh`): a `# comment` line is run as a command (`zsh: command not found: #`) unless `INTERACTIVE_COMMENTS` is set; `echo "wow!x"` is `zsh: event not found: x` (history expansion in double quotes); `local x` redeclared in a function prints `x=1` (5.0.8 and 5.9; silenced by `typeset_silent`, `probes/typeset-redecl.zsh`).

### 4. Special names: `path`, `status`, `pipestatus`, `argv`

- [Parameters](https://zsh.sourceforge.io/Doc/Release/Parameters.html) documents `path <S> <Z> (PATH <S>)`, `fpath (FPATH)`, `cdpath (CDPATH)`, `status` ("Same as ?") and `pipestatus`. The tie is two-way: `path=(/opt/x $path)` is the idiom and is correct (`asdf.plugin.zsh:6` in ohmyzsh); `typeset -U path` de-duplicates.
- The defects are *local* and *scalar* uses: `f() { local path=/z; command -v ls; }` prints `NOT-FOUND` on 5.3.1-5.10-dev (the tied PATH is now `/z`) and errors on 5.0.8 (`local: path: can't assign initial value for array`); `status=1` and `local status` are `read-only variable: status` on all builds. Under `zsh --emulate sh` (5.8+) `status` and `path` become ordinary names (`init-sh.sh`: `status=3` prints, `PATH` unchanged), which is why SH-EXP-18's grep must scan native zsh files only.
- SH-EXP-18 already owns the rule for libraries; SH-ZSH-08 repeats it with the full list (`path fpath cdpath manpath status pipestatus argv`) and the grep.

### 5. `nomatch`: unmatched globs, the five M-X-02 sites and the larger set

[Options, NOMATCH](https://zsh.sourceforge.io/Doc/Release/Options.html): "If a pattern for filename generation has no matches, print an error, instead of leaving it unchanged in the argument list." Behaviour in a **script** (non-interactive), 5.0.8 through 5.10-dev identical (`nomatch/nm-*.zsh`):

| Code | Result |
|---|---|
| `ls *.zzz` / `grep ... .bazelrc*` (external command) | `no matches found: *.zzz`, command not run, status 1, **script continues** (`after rc=1`) |
| `echo *.zzz`, `for f in *.zzz`, `[[ -e *.zzz ]]`, any glob in a function body | message, **script aborts** with exit 1 (`nm-echo`, `nm-for`, `nm-func`) |
| `set -e; ls *.zzz` | exit 1 |
| `*.zzz(N)` or `setopt null_glob` | empty list, no error |
| `ls *.zzz(N)` | `ls` runs with no operand and lists the cwd (`nm-N-ls.zsh` prints `secret-file`) |
| `setopt local_options null_glob` in a function | local; the caller's `echo *.zzz` still aborts (`nm-local.zsh`) |
| `grep -r --include='*.zzz' .` (quoted) | no glob, rc 1, no abort (`nm-ok-cmdarg.zsh`) |

**M-X-02 reproduction (d).** The six blocks quoted from the catalog, run in a directory where only `MODULE.bazel` exists (`mx02/mx02.sh plant`, eval of each block):

- zsh 5.0.8, 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev: `b1..b6 rc=1`, every block prints `(eval):N: no matches found: ...` and does no work; `b5` (`for f in build/publications/*/pom-default.xml`) never runs its loop.
- bash 5.2 with GNU userland (`shellzoo:deb12`): the pattern stays literal; `b1` passes 3 args including the literal `rules/docs-quality/*.md`, `b2/b3/b6` print `grep: ...: No such file or directory` (rc 2), `b5` prints three false `MISSING name/description/url` lines. So the same block is *loud and inert* in zsh and *wrong-but-running* in bash; neither is the intended empty-output pass.
- The fixed twin (`-r --include='...' .`, `find ... -name`) returns rc 0/1 with empty output on all six zsh builds and the same on bash (`mx02.sh fixed`).
- Catalog sites ([config-inventory §3.3](../shell-audit/config-inventory.md) lists five): `rules/docs-quality.md:128`, `skills/docs-plan/SKILL.md:197` (and `:200`), `rules/bazel-quality/rust.md:62` (and `:63`, `:164`), `skills/jvm-release/SKILL.md:182`, `skills/bazel-adopt/SKILL.md:277`. A fresh grep for unquoted-glob command operands adds at least 10 more in `main@88d5e14`: `rules/bazel-quality/ci.md:145`, `flags.md:139`, `cpp.md:133`, `python.md:160`, `caching.md:146`, `hermeticity.md:98`, `skills/bazel-diagnose/SKILL.md:92`, `skills/bazel-diagnose/references/cache-miss.md:158`, `skills/docs-instrument/SKILL.md:272`, `skills/bazel-adopt/references/branch-rust.md:74` (`*.bzl`). That is 18 sites in 15 files; the count is a lower bound, not an exhaustive census. `flags.md:139` and `hermeticity.md:98` also carry an angle-bracket placeholder operand (`<CI directories>`, `<ci-dir>`), a separate paste failure.
- Per owner Q6 these are reported, not fixed. Reproducer: `bash fixtures/zsh/zall.sh fixtures/zsh/mx02/mx02.sh plant` (stdlib+docker only).
- Stderr discarded (`2>/dev/null`) turns the zsh failure into a silent false pass. Of the six blocks only `b5` discards stderr, and only on its `find` twin, but the pattern "empty output is the pass" makes any swallowed `no matches found` a green.

### 6. `set -e`, `! pipeline`, `ERR_EXIT`, `ERR_RETURN` and the 5.10 draft

Brief item (b), `errexit/bang-pipe.zsh` = `set -e; ! false | true; echo after`:

| Build | exit | prints |
|---|---|---|
| zsh 5.0.8 | **1** | nothing |
| zsh 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev | 0 | `after` |
| bash 3.2-5.3, dash, busybox ash x2, mksh, ksh93u+m x2, yash, posh, bash --posix x2, zsh 5.9 `--emulate sh` | 0 | `after` |

What may a zsh script assume? Table `errexit.zsh` (29 cases x 6 builds; only differing rows):

| Case | 5.0.8 | 5.3.1 / 5.8 / 5.9 / 5.9.2 | 5.10-dev |
|---|---|---|---|
| `set -e; ! true; echo after` | exit 1 | `after` | `after` |
| `set -e; f() { true }; ! f; echo after` | exit 1 | exit 1 | `after` |
| `setopt err_exit; { false && true } always { echo always }; echo after` | exit 1, `always` | exit 1, `always` | `always`, `after` |
| `set -e; f() { if true; then false && true; fi }; f; echo after` | `after` | `after` | exit 1 |
| `setopt err_return; f() { { false; echo reached } || true }; if f; then true; fi` | `reached` | 5.3.1 `reached`; 5.8/5.9/5.9.2 **no `reached`** | `reached` |

- The 5.10 draft text, verbatim ([README, Incompatibilities since 5.9](https://raw.githubusercontent.com/zsh-users/zsh/master/README), [NEWS](https://raw.githubusercontent.com/zsh-users/zsh/master/NEWS)): "The ERR_EXIT and ERR_RETURN options were refined to be more self-consistent and better aligned with the POSIX-2017 specification of `set -e`": negated function calls never trigger exit; `always` ignores the options when its status comes from an ignored command; function calls, anonymous functions, `eval`, `.` and `source` no longer ignore the options on their own; `&&`/`||` always ignore ERR_RETURN in their left operand. All four examples in that README reproduce on the 5.10-dev build and on 5.9.2 in the "before" direction, so the text is accurate; 5.10 is unreleased (draft as of 2026-10-11).
- Stable on all six builds: `set -e; false && true` continues; `callee-off` (`set -e; f() { false; echo still; }; if f; then :; fi`) prints `still` (SH-ERR-06 holds in zsh); `x=$(false)` aborts; `local x=$(false)` masks (`in-f rc=0`); `(( i = 0 ))` and `(( i++ ))` from 0 abort (SH-ERR-14 holds); `trap ... ZERR` and `trap ... ERR` both fire before exit; `pipe-last` aborts, `pipe-nonlast` does not without `pipe_fail`.
- Decision: a zsh script may assume `set -e` aborts on a plain failing command, `x=$(f)` and `(( ))` zero; it must not assume anything about `! f`, `! pipeline` (5.0.8), `{ ... } always { ... }`, or a function whose last command is a compound `&&`/`||` under errexit. Write `if ! cmd; then`, `cmd || return`/`|| die`. `if ! f; then :; fi` and `set -e; ... if ! f` are `reached` on 6/6 (`probes/bang-func.zsh`).
- `ERR_EXIT` is "disabled while running initialization scripts" ([Options, ERR_EXIT](https://zsh.sourceforge.io/Doc/Release/Options.html)): an rc file is not a place to rely on it.
- `ERR_RETURN`, unlike `ERR_EXIT`, is function-scoped by design: a function that is itself called in a `||` context may still return early from inside (Options, ERR_RETURN note).

### 7. `trap ... EXIT` in functions (SH-ERR-27 decision)

[Options, POSIX_TRAPS](https://zsh.sourceforge.io/Doc/Release/Options.html): zsh normally runs an EXIT trap "on exit from shell functions"; `POSIX_TRAPS` suppresses it. Measured (`trap/exit-trap-posix.zsh`, same output on 5.0.8, 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev unless noted):

| Setup | EXIT trap fires |
|---|---|
| function sets `trap ... EXIT` natively | at function return, before `after f` |
| `setopt posix_traps` first | at shell exit (all builds) |
| `emulate sh -c '...'` around definition and call | at shell exit (all builds) |
| `emulate -L sh` inside the function | shell exit on 5.3.1+; **function return on 5.0.8** |
| `setopt local_traps` | restores the previous trap at function return (`inner`, then `outer`) |
| `{ body } always { cleanup }` | cleanup runs on return/error (`cleanup-ran`, rc 3 preserved) |
| top-level `trap ... EXIT` | at shell exit |

Consequence (fixtures `trap/tmpdir-lib.sh`, a bash-style helper): `mk_work() { work=$(mktemp -d); trap 'rm -rf "$work"' EXIT; }; mk_work; [ -d "$work" ]` prints `work-dir-GONE-after-helper` on zsh 5.0.8, 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev and `work-dir-alive-after-helper` on bash 3.2-5.3. The twin (`mk_work() { work=$(mktemp -d); }` then a top-level `trap`) is `alive` on all. The native zsh idiom is the `always` block (`tmpdir-always.zsh`: `work-dir-alive-in-body`, `work-dir-removed-on-return` on 6/6).

**Level decision.** SH-ERR-27 CONSIDER -> **MUST for any file that bash also sources** (silent data loss, not a style issue; verified red/green on 6 builds) and **SHOULD for zsh-only files** (function-scoped traps are the documented zsh behaviour; ohmyzsh uses them on purpose, `archlinux.plugin.zsh:37`). The strictness half of SH-ERR-27 (`setopt local_options err_return`) is subsumed by SH-ZSH-02/17.

### 8. The `emulate` bridge for bash and POSIX code sourced in zsh

Brief item (a): `bridge/bash-in-zsh.sh` (six bash-3.2-style helpers, no shebang) sourced from zsh, asserting the values bash 3.2-5.3 produce (`bridge/assert.sh`, exit 1 on any mismatch):

| Run | zsh 5.0.8 | zsh 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev |
|---|---|---|
| native `source bash-in-zsh.sh` (`assert-native.zsh`) | exit 1; `bz_split` 1 (want 3), `bz_args` 1 (want 2), `bz_first` / `bz_last` / `bz_glob` `unknown file attribute`, `bz_eq` `= not found` | exit 1; same six mismatches (`bz_first` empty, `bz_last` `y`, `bz_glob` `no matches found: *.zzz`) |
| `emulate sh -c ". lib; . assert"` (`assert-bridge.zsh`) | exit 1; `bz_split`, `bz_args`, `bz_eq` fixed; `bz_first/last/glob` `local: not valid in this context: (x y z)` | `all-ok`, exit 0 |
| `main() { emulate -L sh; . lib; . assert; bz_all; }` (`assert-wrapL.zsh`) | same as bridge | `all-ok`, exit 0 |
| bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (`assert-bash.sh`) | | `all-ok` on 8/8 |

- Sticky emulation is documented: with `emulate sh -c '...'` each function defined inside "is associated thereafter with" the emulation mode and runs with it ([emulate](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html)). Measured corollary (`bridge/table.txt`, column `wrapL-late`): functions *defined natively* and then *called* under `emulate -L sh` are **not** repaired; the definition must be inside the emulation. The caller stays native zsh.
- Residue the bridge never repairs, same on every build (`bridge/table.txt`, 23 helpers): `PIPESTATUS` (empty), `read -r -a` (`bad option`), `local path=...` (command lookup lost), `local status` (read-only), `${x^^}`, `BASH_REMATCH`, `FUNCNAME`, `mapfile`, `export -f`. `emulate ksh -c` additionally repairs `${!n}` and `${!h[@]}` (`sticky-ksh` column: `v`, `k`) because ksh mode turns on the ksh parameter forms; it still leaves the rest.
- 5.0.8 limit: `local arr=(x y z)` is itself a syntax error there ("unknown file attribute"), under every emulation: NEWS 5.1 "The builtins declare, export, local, readonly and typeset now have corresponding reserved words" ([NEWS](https://raw.githubusercontent.com/zsh-users/zsh/master/NEWS)). Probe: `probes/localarr.zsh` prints `f1: unknown file attribute:` and exit 1 on 5.0.8, `f1 3` ... on 5.3.1+. Use `local -a arr; arr=(...)` in code that must run there.
- The `--emulate` invocation flag is absent on 5.0.8 and 5.3.1 (`zsh: no such option: emulate`) and present from 5.5.1 (`probes/emulate-flag.sh`); in-shell `emulate sh -c` works on every build. `matrix.sh posix` uses `--emulate sh` on 5.9 only, so it says nothing about 5.0.8.
- The `.profile` bridge from SH-EMIT (`emulate sh -c '. ~/.profile'` in `.zprofile`; native 1 iteration, bridge 2 on 5.0.8 and 5.9) is the same mechanism, cited not restated ([shell-emit §rc targets](../shell-emit.md)); this section adds that the bridge fixes splitting, 0-based arrays, nomatch and `[ == ]` but not the residue list.
- Decision (zsh.md row "emulate bridge"): source POSIX-sh code through `emulate sh -c`; source bash-3.2 code only after the residue list is grepped clean; write a zsh sibling (or `if [ -n "${ZSH_VERSION-}" ]`) when the residue appears. Do not `setopt sh_word_split ksh_arrays` globally.

### 9. Startup files and where each thing goes

[zsh manual, Files](https://zsh.sourceforge.io/Doc/Release/Files.html): `/etc/zshenv`, `$ZDOTDIR/.zshenv` always; `.zprofile` for login shells; `.zshrc` for interactive; `.zlogin` last for login shells; `.zlogout`. "As /etc/zshenv is run for all instances of zsh, it is important that it be kept as small as possible"; guard with `[[ -o rcs ]]`. Measured with a `ZDOTDIR` of markers (`startup/startup.zsh`, 5.0.8 and 5.9 identical):

| Invocation | files read |
|---|---|
| `zsh script`, `zsh -c cmd` | `.zshenv` |
| `zsh -l -c cmd`, `zsh -l script` | `.zshenv`, `.zprofile`, `.zlogin` (not `.zshrc`) |
| `zsh -i -c cmd` | `.zshenv`, `.zshrc` |
| `zsh -i -l -c cmd` | `.zshenv`, `.zprofile`, `.zshrc`, `.zlogin`, then `.zlogout` |
| `zsh -f script`, `zsh --no-rcs script` | none |

- Placement rules: `.zshenv`: only silent exports that every invocation needs (no `setopt`, no output, no stdin); `.zprofile`: login environment and PATH (SH-EMIT-23 owns idempotent PATH edits); `.zshrc`: everything interactive (prompt, completion, bindkey, `add-zsh-hook`), guarded with `[[ -o interactive ]]` when a file may also be sourced elsewhere (5 exemplar files do). Reuse a POSIX `.profile` through the bridge in `.zprofile`.
- Hooks: `autoload -Uz add-zsh-hook; add-zsh-hook precmd fn`, never `precmd()` and never `precmd_functions=(...)` (SH-EMIT-25; ohmyzsh does exactly this at `lib/async_prompt.zsh:40-41,144-145`, `lib/termsupport.zsh:111`).
- p10k instant prompt: console input (password prompts, `[y/n]`) must go above the preamble; everything else may go below; during init stdin is `/dev/null` and stdout/stderr go to a temp file, so any init output is suspect ([powerlevel10k README, "How do I configure instant prompt?"](https://github.com/romkatv/powerlevel10k), `romkatv/powerlevel10k@d05a1b00f9a6:README.md:1035-1067`). Emitted blocks are silent by SH-EMIT-22.
- macOS: Terminal.app starts a login shell, so both `.zprofile` and `.zshrc` run for every window, and `/etc/zprofile` runs `path_helper`; unverified: read only (no macOS host). Apple states zsh is the default login and interactive shell from macOS 10.15 ([Apple](https://support.apple.com/en-us/102360)).
- Decision (zsh.md row "startup placement"): the table above plus "CI and agents run `zsh -f script`", which removes `.zshenv` from the picture (a user's `.zshenv` that exports `ZDOTDIR` or `setopt`s is otherwise executed for every `zsh -c`).

### 10. Version pins: what a script may assume

Platform: macOS `/bin/zsh` is 5.8 on macOS 12.x and 5.9 on 14.0-26.5 (13.x unverified), zsh is on none of the 19 audited GitHub runner readmes ([platform-matrix](../shell-audit/platform-matrix.md)). 5.9.1 and 5.9.2 exist; 5.10 is unreleased ([frame corrections](../shell-frame.md)).

| Construct | 5.0.8 | 5.3.1 | 5.5.1 / 5.7.1 | 5.8+ | Source |
|---|---|---|---|---|---|
| `local a=(x y z)` | error | ok | ok | ok | NEWS 5.1; `probes/localarr.zsh` |
| `printf -v v ...` | prints `-v` | ok | ok | ok | `idioms.sh` |
| `declare -A h=([a]=1)` | error | `no matches found` | ok | ok | NEWS 5.5; `idioms.sh` |
| `zsh --emulate sh` flag | no | no | ok | ok | `probes/emulate-flag.sh` |
| `zsh -n` on `${a[1]}` | **false error `bad substitution`** | ok | ok | ok | `probes/n-subscript.sh` |
| `set -e; ! false\|true` | exit 1 | ok | ok | ok | V5 |
| `local path=` | error | silent breakage | same | same | `idioms.sh` |
| `emulate -L sh` EXIT trap timing | function return | shell exit | | | `trap/` |
| `typeset -n` named references | no | no | no | no (5.10-dev yes) | NEWS |
| `${(w)}` out-of-range | | | | 5.10: now empty | README |
| `is-at-least 5.9.0.3 5.9` | | | | wrong true before 5.10 | README |

- **Floor decision.** Authored zsh scripts: floor **5.8** (the oldest macOS `/bin/zsh` still in support), tested on 5.8 and 5.9; emitted rc/hook code keeps **5.0.8** (ocx's tested floor, SH-EMIT, 0 failures 5.0.8-5.9). Version-gate with `autoload -Uz is-at-least; is-at-least 5.8 $ZSH_VERSION` (README: `is-at-least` compares segments with non-digits numerically from 5.10; prefer simple `major.minor`).
- 5.10 will change ERR_EXIT/ERR_RETURN, default keymap (emacs), remove restricted mode, make `ZSH_EXEPATH`, `nameref`, `${ ... }` non-forking substitutions and `SRANDOM` available ([NEWS](https://raw.githubusercontent.com/zsh-users/zsh/master/NEWS)); none may appear in code that must run on 5.9.

### 11. The gate

Candidates measured on the 17-defect plant `lint/plant.zsh` and its twin `lint/twin.zsh` (single-defect files in `lint/each/`):

| Tool | Result | Verdict |
|---|---|---|
| `zsh -n` (5.9) | plant exit 1 (`plant.zsh:13: bad substitution`), twin exit 0; sees only syntax-level defects (4 of 17: `${!n}`, `${!h[@]}`, `${x^^}`, `[ == ]` as run-time) | keep; **never on 5.0.8**: twin exit 1 `twin.zsh:8: bad substitution` on `${arr[1]}` |
| ShellCheck 0.11.0 | `SC1071` exit 1 on plant **and twin**; `-s bash` (or `# shellcheck shell=bash`) gives 12+ false positives on the twin (`SC2296`, `SC2082`, `SC2168`, `SC2034`, `SC2154`) and on the corpus exits 0 for only 200 of 572 files | not a gate (SH-GATE/SH-EXP already say reading-only) |
| `shfmt -ln zsh` 3.13.1 / 3.14.1 | parses 498 / 518 of 572 exemplar files (shellcheck/`-ln bash` 300); fails on `always`, `foreach`, `repeat`, `if [[ ]] { }`, `for k v in`, `for ((;;)) cmd`, `f g() {}` (7 of 60 constructs on 3.14.1, 13 of 60 on 3.13.1); formats `(*.zip) ...` to `*.zip) ...`; adds `;` to one-line functions; default indent is tabs (use `-i 2`) | advisory formatter only |
| shfmt file discovery | `shfmt -f DIR` lists `*.zsh` and zsh shebangs, **not** `.zshrc`, `zshrc` or `*.zsh-theme`; `-ln auto` on an explicit path detects `.zshrc`/`zshrc` but not `.zsh-theme` | pass an explicit file list |
| zshellcheck 1.8.0 ([afadesigns/zshellcheck](https://github.com/afadesigns/zshellcheck)) | rule ids appear only on the plant for 7 of 17 plants (03, 07, 11, 12, 13, 14, 15); misses word splitting, `[0]`, `PIPESTATUS`, `local path`, `status=`, `BASH_SOURCE`, nomatch, trap EXIT, FUNCNAME; `ZC1037` fires on every `echo` in plant and twin; `ZC1873` flags `setopt err_return` | not adopted; single-maintainer third party |
| two-tier grep (`lint/gate2.sh`) | hard tier 12 lines on plant, 0 on twin, 0 on the valid-zsh guard; triage tier 6 lines / 0 / 0; on 571 exemplar zsh files: hard tier 3 lines in 1 file (a user variable named `PIPESTATUS`), triage tier 102 `echo -e/-n`, 2 `${x[0]}` (1 legitimate: fzf under `ksh_arrays`), 6 `trap .* EXIT` | adopt |

shfmt's own record: zsh support arrived in 3.13.0 ("far enough for many use cases"), `.zshrc` name detection and `[[zsh]]` EditorConfig in 3.13.1, `${=name}`/`${~name}`/`${^name}` and `;|` in 3.14.1 ([shfmt CHANGELOG](https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md)); ShellCheck states it supports "bash, ksh, dash and POSIX sh" only ([SC1071](https://github.com/koalaman/shellcheck/wiki/SC1071)).

**Decision (brief: does zsh get a gate beyond `zsh -n` plus shfmt).** Yes, one: the grep gate. Final gate block for `*.zsh`: (1) `zsh -n FILE` on 5.9 (floor-independent, never 5.0.8); (2) `lint/gate2.sh DIR hard` must be empty and `triage` must be read; (3) one runtime run of the script's fixture on the floor (5.8) and ceiling (5.9) builds; (4) `shfmt -ln zsh -i 2 -l FILES` advisory with `-ln bash` forbidden. No ShellCheck, no zshellcheck. Residual gap: word splitting (item 01) and unmatched-glob aborts (item 10) have no static check; they need the runtime run on a fixture dir with no matches.

### 12. Is zsh a CI shell

M-I-06: no. The GitHub Actions `shell:` table lists `bash`, `pwsh`, `python`, `sh`, `cmd`, `powershell`; custom shells use a `command [options] {0}` template ([workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)); a hallucinated `shell: zsh` is the actionlint "shell name is invalid" row in SH-CI. `/bin/zsh` exists on macOS runners as an OS component but is not advertised; 0 of 19 runner readmes list zsh ([platform-matrix](../shell-audit/platform-matrix.md)). A custom `shell: zsh {0}` template is documented but not run here: unverified. In the fleet zsh only appears as a target in a test matrix (see 1). Rule: run zsh scripts from a `bash` step with `zsh -f script`; test a zsh-targeted emit with `matrix.sh zsh`.

### 13. Mapping of SH-EXP-01..23 onto native zsh

(The expansion follow-up "zsh semantics": which SH-EXP rules hold in native zsh and which need zsh forms. ShellCheck cannot parse zsh, so each is a grep or a run.)

| SH-EXP | native zsh |
|---|---|
| 01 quote every expansion | still needed for empty elision (`f $e` passes 0 args) and for `$~x`/`${=x}`; splitting and globbing of unquoted `$x` do not happen |
| 02 argv as array | native: `args=(--n "$n"); cmd $args` and `"${args[@]}"` both work (`$a` expands all) |
| 03 hostile file names | `./*` and `--` unchanged; unmatched glob aborts (SH-ZSH-09) |
| 06 `while read` subshell | zsh runs the last pipeline stage in the current shell (SH-ERR `lastpipe` note): counter survives |
| 08 test operators | `[ a == b ]` is an error; `[[ ]]` fine; `=~` sets `$match`, quote the regex in a variable |
| 09 echo | zsh `echo` interprets backslashes; use `print -r --` |
| 12 brace ranges | `{1..3}` works natively; literal under `--emulate sh` (7 of 11) |
| 15 `.*` glob | not special-cased by zsh dotglob rules; `*(D)` selects dotfiles |
| 18 special names | SH-ZSH-08 |
| 20 empty arrays under `set -u` | `"${a[@]}"` on an empty array is `argc=0`, no error (SH-EXP-20 says zsh passes) |
| 21 unmatched globs | SH-ZSH-09 |
| 22 `$(<file)`, `$'..'` | native zsh |

## Normative guidance candidates

Family SH-ZSH (the depth file `zsh.md`). Verification vocabulary: "RUN yes" = watched red on a planted violation and green on a twin on 2026-10-11, fixture under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/zsh/`. All grep checks print the violation; empty output is the pass, and `DIR` is `.` or a repo directory.

**Prologue and floor**

1. **SH-ZSH-01 (MUST).** An executable zsh script starts `#!/usr/bin/env zsh` and its first statement is `emulate -L zsh -o err_exit -o no_unset -o pipe_fail`; a library sourced into a user shell uses the fzf shape (`'builtin' 'emulate' 'zsh' && 'builtin' 'setopt' 'no_aliases'`, body in `{ } always { restore }`).
   - Rationale: a user's `.zshenv` and options otherwise change the script's meaning; `emulate -L zsh` is the documented known-configuration call.
   - Verify: `grep -rL -e 'emulate -L zsh' --include='*.zsh' DIR` lists scripts without it (judge by the listed files, GNU grep's `-L` exit status differs by version). RUN yes: `g-prologue/plant` lists `tool.zsh`, `g-prologue/twin` lists nothing.
2. **SH-ZSH-02 (MUST).** Every function that calls `emulate -L zsh` restates its strictness in the same call: `emulate -L zsh -o err_return -o no_unset -o pipe_fail`.
   - Rationale: `emulate -L zsh` alone resets `ERR_EXIT`, so the caller's `set -e` stops protecting the function (exit 0 on 6/6 builds).
   - Verify: `grep -rn -e 'emulate -L zsh[[:space:]]*$' -e 'emulate -L zsh[[:space:]]*;' --include='*.zsh' DIR` (bare emulate calls to review); runtime `zall.sh errexit/prologue-plant.zsh` exit 0 vs `prologue-twin.zsh` exit 1. RUN yes (plant 1 line, twin 0; runtime 6/6).
3. **SH-ZSH-03 (SHOULD).** State the floor in the header (`# zsh >= 5.8`) and keep to it: authored scripts 5.8; emitted rc code 5.0.8 (no `local a=(...)`, `printf -v`, `typeset -A h=(...)`, `--emulate`, `wait -n`, named references).
   - Rationale: macOS 12 ships 5.8, 5.9 from macOS 14; 5.0.8 fails five constructs listed in Findings 10.
   - Verify: `zall.sh SCRIPT` (or `matrix.sh zsh SCRIPT`) must exit 0 on the floor and ceiling builds; `autoload -Uz is-at-least` gate for newer syntax. RUN yes (`localarr.zsh`, `emulate-flag.sh`).
4. **SH-ZSH-04 (SHOULD).** CI, agents and test harnesses run `zsh -f script` (or `zsh -f -c '...'`); never rely on the invoking user's `.zshenv`.
   - Rationale: `.zshenv` is read by every non-interactive zsh, scripts and `-c` included; `-f` reads no rc file.
   - Verify: `startup/startup.zsh` (`zsh script` reads `.zshenv`, `zsh -f script` reads nothing). RUN yes.

**Broken bash habits**

5. **SH-ZSH-05 (MUST).** Never rely on word splitting of an unquoted parameter: hold lists in arrays, split deliberately with `${=v}` or `${(z)v}`/`${(s: :)v}`, and never `setopt sh_word_split` outside a `local_options` function; still quote `"$v"` for the empty-argument case.
   - Rationale: `for w in $list` runs once (`n=1`), `set -- $opts` gives 1 argument; the FAQ states splitting is by design only for arrays.
   - Verify: no static check exists (ShellCheck cannot parse zsh). Runtime: `bridge/assert-native.zsh` (`bz_split want [3] got [1]`, exit 1) vs the bridge (exit 0) on 5.3.1+. RUN yes (runtime). Reading heuristic: an unquoted `$name` that holds a list in a `for`, `set --` or command position.
6. **SH-ZSH-06 (MUST).** Index arrays from 1: `${a[1]}`, `${a[-1]}`, `$#a`; remove an element with `a[1]=()`, never `unset 'a[1]'`; keep `KSH_ARRAYS` to a `local_options` function.
   - Rationale: `${a[0]}` is empty; `unset 'a[1]'` leaves a hole (`count=3 elems=[|y|z]`).
   - Verify: `lint/gate2.sh DIR triage` prints `${name[0]}` (reading: fzf `completion.zsh:247` is legitimate under `ksh_arrays`). RUN yes (plant line 8, twin 0).
7. **SH-ZSH-07 (MUST).** Use the zsh spelling: `pipestatus`, `read -A`, `read -r '?prompt'`, `${(P)n}`, `${(k)h}`, `${(U)x}`/`${(L)x}`, `${(%):-%x}` / `${0:A:h}`, `funcstack`, `$match`/`MATCH`, `setopt`, `lines=("${(@f)$(<f)}")`; never `PIPESTATUS`, `read -a`, `read -p`, `${!n}`, `${!h[@]}`, `${x^^}`, `BASH_SOURCE`, `FUNCNAME`, `shopt`, `mapfile`, `readarray`, `export -f`, `[ a == b ]`.
   - Rationale: each is empty, `bad substitution`, `bad option` or `command not found` on 5.0.8-5.10-dev (table in Findings 3).
   - Verify: `grep -rnE -e 'read -[a-zA-Z]*a( |$)' -e '\<PIPESTATUS\>' -e '\<BASH_SOURCE\>' -e '\<FUNCNAME\>' -e '\$\{!' -e '\$\{[A-Za-z_0-9]+(\^\^|,,|\^|,)\}' -e '(^|[[:space:];])(mapfile|readarray)[[:space:]]' -e '(^|[[:space:];])shopt[[:space:]]' -e 'export -f[[:space:]]' -e '(^|[^[])\[ [^]]* == ' --include='*.zsh' --include='*.zsh-theme' DIR` (the hard tier of `lint/gate2.sh DIR hard`). RUN yes: plant 12 lines, twin 0, valid-zsh guard 0; exemplar corpus 3 lines (a user variable named `PIPESTATUS`, `gallois.zsh-theme:30,32,39`).
8. **SH-ZSH-08 (MUST).** Never declare, `local` or scalar-assign `path`, `fpath`, `cdpath`, `manpath`, `status`, `pipestatus`, `argv`; arrays through them (`path=(~/bin $path)`, `typeset -U path`) are the idiom.
   - Rationale: `local path=/z` breaks command lookup (`NOT-FOUND`) or errors (5.0.8); `status=` is read-only.
   - Verify: the same hard-tier gate (patterns `(local|typeset|declare) +(-[a-zA-Z]+ +)?(path|fpath|cdpath|manpath|status|pipestatus|argv)(=|$|[[:space:]])` and `^[[:space:]]*(path|...|argv)=[^(]`). RUN yes (plant lines 11, 12; twin 0; the array forms `asdf.plugin.zsh:6`, `z.plugin.zsh:1682` do not match).
9. **SH-ZSH-09 (MUST).** Give every glob an explicit no-match policy: `(N)` or `setopt local_options null_glob` for an optional glob, quote it when it is an argument to another tool; never `ls *.x(N)` (empty list lists the cwd) and never `unsetopt nomatch` file-wide.
   - Rationale: external command: skipped, status 1; builtin/`for`/function body: the script aborts; (N) with a bare command runs it with no operand.
   - Verify: no lint exists; runtime run of the script in an empty directory, expecting no `no matches found`. RUN yes (`nomatch/nm-*.zsh`: red `nm-echo`, `nm-for`, `nm-func`, `nm-ls`, `nm-N-ls`; green `nm-N`, `nm-local`, `nm-ok-cmdarg`; 6/6 builds).
10. **SH-ZSH-10 (MUST).** A command block that an agent or a human pastes (rules, skills, READMEs) quotes every glob it hands to a tool and prefers `grep -r --include='*.ext' .` or `find . -name '*.ext'` to shell globs; a block is tested in a directory where no glob matches. (M-X-02: owner files issues; `.bazelrc*`, `WORKSPACE*`, `*.md`, `*.bzl` operands.)
    - Rationale: 6 of 6 sampled catalog blocks abort or skip on 6/6 zsh builds; bash silently runs them with a literal operand.
    - Verify: `grep -rn -e 'docs-quality/\*\.md' -e 'friction-logs/\*\.md' -e 'WORKSPACE\*' -e '\.bazelrc\*' -e 'build/publications/\*/' --include='b?.txt' mx02` (plant 8 lines, exit 0) vs `--include='b?-twin.txt'` (4 lines that are quoted `--include` forms: the twin only matches because the patterns also occur inside `--include=`; read it as the fixed text); runtime `zall.sh mx02/mx02.sh plant` rc=1 x6 vs `fixed`. RUN yes.
11. **SH-ZSH-11 (SHOULD).** Print with `print -r --` or `printf`, not `echo -e` / `echo "...\t"`, in any file that may also be emulated or sourced into sh (defers to SH-EXP-09).
    - Rationale: native zsh `echo` interprets backslashes; `emulate sh` and bash do not.
    - Verify: `lint/gate2.sh DIR triage` (pattern `echo -[a-zA-Z]*[en]`); not a defect in native zsh-only code. RUN yes (plant line 20, 102 exemplar hits, mostly ohmyzsh `echo -e`).
12. **SH-ZSH-12 (MUST).** Locate yourself with `${0:A:h}` at file top level and `${(%):-%x}` inside functions; `$0` inside a function is the function name.
    - Rationale: `BASH_SOURCE` is empty (`[]`); in a function `$0` is `libf`, only `%x` and `funcsourcetrace` give the file (zsh 5.0.8 and 5.9).
    - Verify: hard tier (`BASH_SOURCE`); runtime `selfpath/main.zsh` from another cwd. RUN yes.
13. **SH-ZSH-13 (SHOULD).** Scope option changes: `setopt local_options ...` (or `emulate -L`) inside functions; a bare `setopt err_return` in a function leaks to the caller.
    - Rationale: `errret-nolocal` exits 1 where `errret-local` continues (6/6).
    - Verify: reading heuristic (`setopt` in a function body without `local_options`/`emulate -L`). RUN yes (`errexit.zsh` cases).

**errexit and traps**

14. **SH-ZSH-14 (MUST).** Do not use `! cmd` as a statement under `set -e`/`err_exit`; write `if ! cmd; then ...; fi` or `cmd || ...`.
    - Rationale: `set -e; ! false | true` exits 1 on 5.0.8; `set -e; f() { true }; ! f` exits 1 on 5.0.8-5.9.2 and continues on 5.10-dev; `if ! f` is `reached` on all six.
    - Verify: runtime `zall.sh errexit/bang-pipe.zsh` (5.0.8 exit 1, 5.3.1+ `after`), `probes/bang-func-red.zsh` (exit 1 x5, `after-bang-f` on 5.10-dev) vs `probes/bang-func.zsh` (`reached` x6). RUN yes.
15. **SH-ZSH-15 (SHOULD).** Do not rely on ERR_EXIT/ERR_RETURN exemptions that the 5.10 draft changes: `{ false && true } always { }`, a function whose last statement is a compound `&&`/`||`, `{ cmd; ... } || true` under `err_return`; make failure handling explicit.
    - Rationale: the four README-listed changes alter exit status between 5.9.2 and 5.10-dev (Findings 6 table).
    - Verify: `zall.sh errexit/errexit.zsh` diff 5.9.2 vs 5.10-dev; re-run on the 5.10 release. RUN yes.
16. **SH-ZSH-16 (MUST in files that bash also sources; SHOULD in zsh-only files; this resolves SH-ERR-27).** Do not set `trap ... EXIT` inside a function; arm it once at top level, or in zsh use `{ body } always { cleanup }`, or `setopt local_traps`; shared code may rely on `emulate sh -c`/`setopt posix_traps`.
    - Rationale: the function-scoped trap fires at function return on every zsh build (temp dir deleted before use) and at shell exit in bash.
    - Verify: `grep -rn -e 'trap .* EXIT' --include='*.zsh' DIR` (the triage tier; judge function vs top level); runtime `zall.sh trap/tmpdir-lib.sh` (`GONE` x6) vs `trap/tmpdir-twin.sh` (`alive` x6) vs `matrix.sh bash trap/tmpdir-lib.sh` (`alive` x8). RUN yes.

**Startup placement**

17. **SH-ZSH-17 (MUST).** Keep `.zshenv` silent and tiny (exports only, no `setopt`, no stdin, guarded by `[[ -o rcs ]]`); put login environment and PATH in `.zprofile`, interactive setup in `.zshrc`, and guard shared interactive code with `[[ -o interactive ]]`.
    - Rationale: `.zshenv` runs for every `zsh`, scripts and `-c` included; `.zshrc` only for interactive.
    - Verify: `startup/startup.zsh` table; reading check of a `.zshenv` for `setopt`/`print`/`read`. RUN yes (behaviour table).
18. **SH-ZSH-18 (MUST).** In `.zshrc`, code that may read the console runs above a p10k instant-prompt block; nothing prints during init when instant prompt is on.
    - Rationale: p10k redirects stdin to `/dev/null` and output to a temp file during init (README).
    - Verify: reading heuristic against the p10k README example. RUN no.
19. **SH-ZSH-19 (MUST, cite SH-EMIT-25).** Register hooks with `autoload -Uz add-zsh-hook; add-zsh-hook precmd fn`; never define `precmd()` or touch `precmd_functions`. Reuse a POSIX `.profile` with `emulate sh -c '. ~/.profile'` in `.zprofile` (SH-EMIT rc targets).
    - Rationale: owned by SH-EMIT; not restated beyond the pointer.
    - Verify: SH-EMIT-25's check. RUN yes there; this file adds ohmyzsh `lib/async_prompt.zsh:40-41`.

**The emulate bridge**

20. **SH-ZSH-20 (MUST).** Source POSIX-sh code into zsh only inside the emulation: `emulate sh -c '. lib.sh'` (sticky for the functions it defines) or a wrapper `w() { emulate -L sh; . lib.sh; call; }` that sources and calls; defining natively and calling under `emulate -L sh` does not repair anything.
    - Rationale: 5.3.1-5.10-dev go from 6 mismatches (native) to `all-ok` (bridge, wrapper); `wrapL-late` equals native.
    - Verify: `zall.sh bridge/assert-native.zsh` (exit 1) vs `assert-bridge.zsh` and `assert-wrapL.zsh` (exit 0 on 5.3.1+) and `matrix.sh bash bridge/assert-bash.sh` (8/8 `all-ok`). RUN yes.
21. **SH-ZSH-21 (MUST).** Before a bash library is sourced into zsh, grep it for the bridge residue (`PIPESTATUS`, `read -a`, `local path|status`, `${x^^}`, `BASH_REMATCH`, `FUNCNAME`, `mapfile`, `export -f`); any hit means a zsh sibling or an `${ZSH_VERSION-}` branch, not a bridge.
    - Rationale: these stay broken under `emulate sh` and `emulate ksh` on every build; `emulate ksh -c` only adds `${!n}` / `${!h[@]}`.
    - Verify: the hard-tier gate run against the library with `--include='*.sh'` added. RUN yes (the plant covers each; `bridge/table.txt`).
22. **SH-ZSH-22 (SHOULD).** On 5.0.8, write `local -a arr; arr=(...)`, not `local arr=(...)`, and do not use `--emulate sh` in a launcher; use `emulate sh -c` inside the shell.
    - Rationale: `unknown file attribute` (NEWS 5.1) and `no such option: emulate` (5.0.8, 5.3.1).
    - Verify: `zall.sh probes/localarr.zsh`, `probes/emulate-flag.sh`. RUN yes.

**Gates and CI**

23. **SH-ZSH-23 (MUST).** The `*.zsh` gate is `zsh -n` on 5.9 (never 5.0.8, whose `-n` rejects `${a[1]}`), the two-tier grep, one runtime fixture run on the floor and ceiling builds, and advisory `shfmt -ln zsh -i 2 -l` over an explicit file list.
    - Rationale: the other tools cannot discriminate zsh defects; shfmt cannot parse `always`, `foreach`, `repeat`, `for k v in`.
    - Verify: `docker run --rm -v "$PWD:$PWD" -w "$PWD" zshusers/zsh:5.9 zsh -n FILE`; plant exit 1, twin 0; 5.0.8 twin exit 1 (`probes/n-subscript.sh`). RUN yes.
24. **SH-ZSH-24 (MUST NOT).** Do not run ShellCheck on zsh files and do not paste `# shellcheck shell=bash` into one.
    - Rationale: SC1071 is an error; `-s bash` produces `SC2296`/`SC2082`/`SC2168` false positives on valid zsh and exits 0 on 200 of 572 corpus files.
    - Verify: `/home/mherwig/.cache/research-lang/shell-tools/run.sh shellcheck FILE` exits 1 on plant and twin, which is why it is inadmissible as a check. RUN yes (red on both).
25. **SH-ZSH-25 (CONSIDER).** Do not adopt zshellcheck 1.8.0 as a gate.
    - Rationale: 7 of 17 plants discriminated; `ZC1037` on every echo; third-party single maintainer.
    - Verify: `lint/zc-each.sh` prints `discriminating plants: 7 of 17`. RUN yes.
26. **SH-ZSH-26 (SHOULD).** zsh code is exercised from a `bash` step with `zsh -f ...`; no `shell: zsh` in workflows.
    - Rationale: no built-in zsh `shell:`; runner readmes list none.
    - Verify: actionlint at default severity (SH-CI row 14 "shell name is invalid"); `grep -rn -e 'shell: *zsh' --include='*.yml' --include='*.yaml' .`. RUN no (reading; actionlint run is SH-CI's).

## Verification runs

All run on 2026-10-11. Fixture root `/home/mherwig/.cache/research-lang/shell-tools/fixtures/zsh/`; full logs `verify.out` (V1-V10), `verify-tail.out` (V11-V16), `verify-extra.out`, `verify-gate2.out`. A twin that was also red is reported as such.

**V1 two-tier grep gate** (`lint/gate2.sh DIR hard|triage`, `lint/verify-gate2.sh`)
```text
hard    gate-plant lines=12 grep-exit=0     # red
hard    gate-twin  lines=0  grep-exit=1     # green
hard    gate-fp    lines=0  grep-exit=1     # valid-zsh guard: [[ a == b ]], arr[1], (a|b)* all pass
triage  gate-plant lines=6  grep-exit=0     # red
triage  gate-twin  lines=0  grep-exit=1
gate-plant/plant.zsh:9:read -a parts <<< "a b c"
gate-plant/plant.zsh:11:local path=/tmp
gate-plant/plant.zsh:12:status=$?
gate-plant/plant.zsh:13:n=v; echo "${!n}"
gate-plant/plant.zsh:18:mapfile -t lines < /etc/hostname
gate-plant/plant.zsh:22:f() { trap 'echo bye' EXIT; }        # triage tier
```
Exemplar corpus, hard tier: 3 lines in 1 file (`ohmyzsh@42a4ccb1b14d:themes/gallois.zsh-theme:30,32,39`, a user variable named `PIPESTATUS`); triage: 102 `echo -e/-n`, 6 `trap .* EXIT`, 2 `${x[0]}`.

**V2 `zsh -n`** (`zshusers/zsh:5.9`, `5.0.8`)
```text
zsh 5.9   -n plant.zsh -> plant.zsh:13: bad substitution   exit 1     # red
zsh 5.9   -n twin.zsh  ->                                  exit 0     # green
zsh 5.0.8 -n twin.zsh  -> twin.zsh:8: bad substitution     exit 1     # FALSE POSITIVE on the twin
zsh 5.0.8 -n -c 'a=(x y); echo "${a[1]}"' -> exit=1 zsh:1: bad substitution ; run without -n -> [x]
zsh 5.3.1, 5.8, 5.9 -n same code -> exit=0
```

**V3 ShellCheck 0.11.0** (`run.sh shellcheck`)
```text
plant.zsh: SC1071 (error): ShellCheck only supports sh/bash/dash/ksh/'busybox sh' scripts.   exit 1
twin.zsh : SC1071 ...                                                                         exit 1   # twin ALSO red: inadmissible
shellcheck -s bash twin.zsh: twin.zsh:13:14: error: Parameter expansions can't start with (. [SC2296] ; 14:7 [SC2082] ; 11:1 [SC2168] ; exit 1
```

**V4 (a) bash-in-zsh, with the `emulate -L sh` twin** (`bridge/`, `zall.sh`)
```text
assert-native.zsh  zsh 5.0.8 .. 5.10-dev : MISMATCH bz_split: want [3] got [1] ... bz_eq: want [ok] got [bz_eq: = not found]  -> exit 1 (x6)
assert-wrapL.zsh   zsh 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev : all-ok -> exit 0 ;  zsh 5.0.8 : MISMATCH bz_first ... local: not valid in this context: (x y z) -> exit 1
assert-bridge.zsh  same as wrapL
assert-bash.sh     bash 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3 : all-ok -> exit 0 (x8)
```

**V5 (b) `errexit.zsh`** (`zall.sh errexit/bang-pipe.zsh`; `errexit/errexit.zsh` table in `verify.out`)
```text
zsh 5.0.8: -> exit 1        zsh 5.3.1 / 5.8 / 5.9 / 5.9.2 / 5.10-dev: after -> exit 0
bash 3.2..5.3 (8), dash, busybox ash x2, mksh, ksh93u+m x2, yash, posh, bash --posix x2, zsh 5.9 emulate sh: after -> exit 0 (all)
bang-func  5.0.8..5.9.2: 1: ; 5.10-dev: 0:after        func-complex 5.0.8..5.9.2: 0:after ; 5.10-dev: 1:
probes/bang-func-red.zsh: exit 1 x5, "after-bang-f" on 5.10-dev      probes/bang-func.zsh (if ! f): "reached" x6
```

**V6 (c) `shfmt -ln zsh`** (`shfmt/real/zshrc-full.zsh` = 68-line `.zshrc` + `for k v in ${(kv)h}`; `zshrc-nokv.zsh` = same without it)
```text
v3.13.1 parse zshrc-full.zsh  exit 1  zshrc-full.zsh:68:1: `for foo` must be followed by `in`, `do`, `;`, or a newline   # red
v3.13.1 parse zshrc-nokv.zsh  exit 0                                                                              # green
v3.14.1 parse zshrc-full.zsh  exit 1 (same message)       v3.14.1 parse zshrc-nokv.zsh exit 0
corpus (572 exemplar zsh files): shfmt-3.13.1 -ln zsh ok=498 ; shfmt-3.14.1 -ln zsh ok=518 ; shfmt-3.14.1 -ln bash ok=300 ; zsh -n 5.9 ok=572
3.14.1 fails 7 of 60 constructs: always, foreach, for-kv, repeat, short-if, arith-for-short, multi-func
shfmt -f d2: d2/a.zsh d2/c.plugin.zsh d2/noext d2/noext2   (not .zshrc, zshrc, b.zsh-theme) ; -ln auto -l d2/b.zsh-theme -> exit 1 array element values must be words
```
A formatting run (`-d`) on the parsable file rewrites `(*.tar.gz|*.tgz)` to `*.tar.gz | *.tgz)`, adds `;` to one-line functions and re-indents with tabs: pass `-i 2`.

**V7 (d) M-X-02 blocks** (`mx02/mx02.sh plant|fixed`, six blocks, `eval` of the catalog text)
```text
zall plant  5.0.8 .. 5.10-dev : b1 rc=1 out=[(eval):1: no matches found: rules/docs-quality/*.md]
                                b3 rc=1 ... no matches found: WORKSPACE* ; b5 rc=1 ... no matches found: build/publications/*/pom-default.xml   (b1..b6 rc=1 on 6/6)
zall fixed  b1 rc=0 (py-stub got 2 args) ; b2 rc=1 out=[] ; b3 rc=1 [./MODULE.bazel:1:...] ; b4 rc=1 [] ; b5 rc=0 [] ; b6 rc=1 []   (6/6, empty or the real hit)
bash 5.2 (deb12): b1 rc=0 py-stub got 3 args ... rules/docs-quality/*.md ; b2 rc=2 grep: ...: No such file or directory ; b5 rc=0 MISSING name/description/url (false)
```
Site grep (X4): `grep -rn -e 'docs-quality/\*\.md' -e 'friction-logs/\*\.md' -e 'WORKSPACE\*' -e '\.bazelrc\*' -e 'build/publications/\*/' --include='b?.txt' mx02` prints 8 lines, exit 0; on `b?-twin.txt` the `--include='.bazelrc*'` forms still match textually, so the check is only meaningful as a list to read. Live catalog (read-only, X5 and a wider census): 18 command sites in 15 files.

**V8 trap EXIT** (`trap/`)
```text
tmpdir-lib.sh   zsh 5.0.8 / 5.3.1 / 5.8 / 5.9 / 5.9.2 / 5.10-dev : work-dir-GONE-after-helper ; bash 3.2 .. 5.3 : work-dir-alive-after-helper
tmpdir-twin.sh  all : work-dir-alive-after-helper      tmpdir-always.zsh : work-dir-alive-in-body / work-dir-removed-on-return (6/6)
exit-trap-posix.zsh: native -> "EXIT-trap fired" before "after f"; posix_traps / emulate sh -c -> after ; emulate -L sh in fn: 5.0.8 before "after h", 5.3.1+ after
```

**V9 prologue** (`errexit/prologue-*.zsh`, `zall.sh`): plant `NOTREACHED-in-helper / AFTER-helper -> exit 0` x6; twin `-> exit 1` x6. Grep triage (X2): plant `prologue-plant.zsh:4:helper() { emulate -L zsh; false; ...` (exit 0), twin empty (exit 1). Missing-prologue (X1): `grep -rL -e 'emulate -L zsh'` lists `g-prologue/plant/tool.zsh` and nothing for the twin.

**V10 nomatch** (`nomatch/nm-*.zsh`): `nm-ls`: `no matches found: *.zzz` then `after rc=1`, exit 0; `nm-echo`, `nm-for`, `nm-func`, `nm-seterr`: exit 1 with no `after`; `nm-N-ls`: prints `secret-file`; `nm-N`, `nm-local` (outer `echo *.zzz` still `exit 1`), `nm-ok-cmdarg`: as in Findings 5; identical on 5.0.8, 5.9 and 5.10-dev (stderr ordering differs only).

**V11 startup** (`startup/startup.zsh`, 5.0.8 and 5.9 identical): `zsh script: read .zshenv | script-body`; `zsh -l -c: .zshenv, .zprofile, .zlogin`; `zsh -i -c: .zshenv, .zshrc`; `zsh -f script: script-body`.

**V12 self-path** (`selfpath/`, 5.9 and 5.0.8): `lib-top: 0=lib.zsh x=lib.zsh BASH_SOURCE=[]`; `lib-func: 0=libf x=lib.zsh funcsourcetrace=lib.zsh:2`.

**V13 zshellcheck 1.8.0** (`lint/zc-each.sh`): `03 plant-only=[ZC1172 ZC1356]`, `07 [ZC1640]`, `11 [ZC1288 ZC1640]`, `12 [ZC1168]`, `13 [ZC1611]`, `14 [ZC1037 ZC1171]`, `15 [ZC1296]`; `01, 02, 04, 05, 06, 08, 09, 10, 16, 17` plant-only empty; `discriminating plants: 7 of 17`.

**V14 misc pins**: `probes/arr-unset.zsh` (5.0.8 and 5.9): `unset-form: count=3 elems=[|y|z]`, `assign-form: count=2 elems=[y|z]`; `probes/emulate-flag.sh`: 5.0.8, 5.3.1 `zsh: no such option: emulate`, 5.5.1, 5.7.1, 5.8, 5.9 `ok`; `probes/localarr.zsh`: 5.0.8 `f1: unknown file attribute:` exit 1, 5.3.1+ `f1 3 ... f6 EMPTY`; `interactive.sh 5.9`: `zsh: command not found: #`, `zsh: event not found: x`, `x=1` on a redeclared `local x`.

Verifications that did not go as hoped: V3 (red on plant **and** twin, therefore inadmissible, and reported as the reason ShellCheck is excluded); V13 (zshellcheck red on only 7/17); the X4 twin grep (matches the fixed text too, so it is a reading list, not a pass/fail gate); `verify.sh`'s first end-to-end run stopped after V10 because the background shell was torn down, so V11 onward was re-run as `verify-tail.sh` (its V17/V18 tail hit the 560 s timeout; those two probes are quoted from their own direct runs above).

## Exemplar evidence

| Candidate | Exemplar | Evidence | Verdict |
|---|---|---|---|
| SH-ZSH-01 prologue | `junegunn/fzf@25adb674537b:shell/completion.zsh:18-24,71-73` | quoted builtins until `emulate zsh`, `no_aliases`, `always` restore | satisfies (model) |
| SH-ZSH-01 | `romkatv/powerlevel10k@d05a1b00f9a6:internal/worker.zsh:93,100`, `gitstatus/gitstatus.plugin.zsh:146,243,513` | `emulate -L zsh -o no_aliases -o extended_glob -o typeset_silent` in each function | satisfies |
| SH-ZSH-01 | ohmyzsh@42a4ccb1b14d: 42 of 571 zsh files use `emulate -L zsh` (`lib/functions.zsh:177,256`, `lib/clipboard.zsh:52`); 39 use `setopt local_options` | scoped options present in ~7% of files | partial |
| SH-ZSH-02 | all 6 `ohmyzsh/lib` `emulate -L zsh` calls are bare; 0 of 571 files pair it with `err_return`/`err_exit` | exemplars are interactive libraries and do not use errexit; the hazard does not arise | not applicable |
| SH-ZSH-05 | `zsh-users/zsh-autosuggestions@85919cd1ffa7:src/fetch.zsh:15` `strategies=(${=ZSH_AUTOSUGGEST_STRATEGY})`; `fzf completion.zsh:418` `d_cmds=(${=FZF_COMPLETION_DIR_COMMANDS-cd pushd rmdir})`; `p10k.zsh:5378,6414` | deliberate `${=v}` splitting | satisfies; 23 files use `${=` or SH_WORD_SPLIT |
| SH-ZSH-06 | `fzf completion.zsh:223,247` `setopt localoptions ksh_arrays` then `lbuf=${rest[0]}` | 0-based index legitimately scoped by `local_options` | satisfies; the triage gate flags it (documented false positive) |
| SH-ZSH-07 | hard tier over 571 files: only `ohmyzsh/themes/gallois.zsh-theme:30,32,39` | a variable named `PIPESTATUS` copied from `$pipestatus` | no true violation |
| SH-ZSH-08 | `ohmyzsh/plugins/asdf/asdf.plugin.zsh:6`, `lib/cli.zsh:516`, `plugins/z/z.plugin.zsh:1682` | `path=(...)`, `fpath=(...)` array forms | satisfies (idiom) |
| SH-ZSH-09 | `ohmyzsh/lib/diagnostics.zsh:242` `dumpfiles=( $zdotdir/.zcompdump*(N) )`; `lib/cli.zsh:470-471,521`; p10k `p10k.zsh:6663`; 9 files use `(N)`, 4 files `nonomatch` (`zsh-syntax-highlighting/.../main-highlighter.zsh:1819` `setopt localoptions nonomatch`) | explicit policy | satisfies |
| SH-ZSH-10 | `rules/docs-quality.md:128`, `rules/bazel-quality/rust.md:62,63,164`, `skills/docs-plan/SKILL.md:197,200`, `skills/jvm-release/SKILL.md:182`, `skills/bazel-adopt/SKILL.md:277` and 10 more (`main@88d5e14`) | unquoted glob operands | violates (fleet, report only) |
| SH-ZSH-11 | ohmyzsh `plugins/sublime/sublime.plugin.zsh:114-122`, `plugins/timer/timer.plugin.zsh:30`, `plugins/pip/pip.plugin.zsh:64,79`, `plugins/kube-ps1/kube-ps1.plugin.zsh:407,423` | `echo -e` (works in native zsh) | contradicts SH-EXP-09 only for sh-bound code; fine natively |
| SH-ZSH-12 | `autosuggestions zsh-autosuggestions.plugin.zsh:1` `source ${0:A:h}/zsh-autosuggestions.zsh`; `p10k powerlevel10k.zsh-theme:20` `${${(%):-%x}:A:h}`; 34 files | idiomatic self-path | satisfies |
| SH-ZSH-16 | `ohmyzsh/plugins/archlinux/archlinux.plugin.zsh:37` `trap "rm -rf $tmp_dir" EXIT` (inside a function); `p10k.zsh:6392`; `powerlevel10k.zsh-theme:26` `local -i __p9k_trapped; trap ... EXIT`; 20 files use `} always {` (`lib/cli.zsh:693`, `p10k wizard.zsh:363`) | function-scoped EXIT traps used on purpose; `always` also common | satisfies SHOULD (zsh-only); would break if sourced by bash |
| SH-ZSH-19 | `ohmyzsh/lib/async_prompt.zsh:40-41,144-145`, `lib/termsupport.zsh:111`, `lib/git.zsh:207`; 59 files use `add-zsh-hook`; 10 files define `precmd()`/`precmd_functions` | the idiom is the majority | mostly satisfies |
| SH-ZSH-14/15 | 0 of 571 files use `set -e`/`err_exit` (1 file `err_return`: `p10k.zsh:4837`) | interactive libs avoid errexit | not exercised |
| SH-ZSH-23 | shfmt 3.14.1 rejects 54 of 572: ohmyzsh 41, p10k 7, fzf 2, autosuggestions 2, oh-my-posh 1, starship 1 | `always`/`foreach`/`for k v in` families | confirms the advisory-only decision |
| SH-ZSH startup | `romkatv/powerlevel10k@d05a1b00f9a6:README.md:1035-1067` | instant prompt preamble first, console input above it | satisfies |
| fleet | `ocx@d0cdf8838:crates/ocx_shell/src/shell/hook.rs:237-256` | `add-zsh-hook precmd`/`zshexit`, silent, `case $- in *r*`; 0 failures 5.0.8-5.9 | satisfies |
| fleet | `www-setup@a251c36:.github/workflows/test-docker-matrix.yml:92` | zsh as a matrix target shell | satisfies SH-ZSH-26 |

## AI-agent angle

What an LLM characteristically gets wrong with zsh, with the smallest mechanical check:

| Mistake | Why it happens | Check |
|---|---|---|
| Assumes `for x in $var` splits (and writes `IFS=` games) | bash training mass | runtime assert (V4 `bz_split`); reading |
| `${arr[0]}`, `${#arr[@]}-1` last-element math | bash habit | triage gate `${name[0]}` |
| `read -a`, `read -p "..."`, `PIPESTATUS`, `${!var}`, `${var^^}`, `mapfile`, `shopt`, `declare -n` | bash/ksh training | hard-tier gate (12 lines on the plant) |
| `local path=...`, `status=$?` | harmless names in bash | hard-tier gate |
| `[ "$a" == "$b" ]` | bash accepts it | hard-tier gate; `zsh` run (`= not found`) |
| Bare glob operands: `grep x .bazelrc*`, `ls *.log`, `for f in *.md` | bash leaves them literal | empty-directory run; M-X-02 fixture |
| `ls *.x(N)` as the "safe" fix | half-remembered `(N)` | `nm-N-ls.zsh` run (lists the cwd) |
| `set -euo pipefail` copied into zsh and `emulate -L zsh` added "for safety" | cargo cult | prologue-plant/twin runs (errexit silently off) |
| Function-local `trap ... EXIT` in a helper shared with bash | works in bash | V8 `tmpdir-lib.sh` |
| `BASH_SOURCE`/`$0` self-location in a zsh function | bash idiom | hard-tier gate; `selfpath` run |
| `#!/bin/sh` header on zsh code, or no header on an executable | habit | reading; `zsh -n` |
| Treating `sh` emulation as bash: `emulate sh -c` then `[[ =~ ]]`/`local -a` | assumes sh = bash | `bridge/table.txt` residue list |
| `zsh --emulate sh` in a launcher for old macOS or RHEL | works on 5.9 | `probes/emulate-flag.sh` (5.0.8/5.3.1 fail) |
| `typeset -n`, `declare -A h=([k]=v)`, `local a=(...)` assumed on old zsh | newer syntax | `zall.sh` on 5.0.8; `probes/localarr.zsh` |
| ShellCheck on a `.zsh` file, `# shellcheck shell=bash` to silence SC1071 | wants a green gate | V3: red on twin too |
| Hallucinated `shell: zsh` in GitHub Actions | assumes parity with bash | actionlint (SH-CI) |
| Pasting a commented multi-line block into macOS Terminal | assumes comments are free | `interactive.sh` (`command not found: #`) |
| `precmd() { ... }` or `precmd_functions=(...)` in an emitted rc | simplest hook | SH-EMIT-25 grep |
| Relies on `! pipeline` under `set -e` | portable in bash | `bang-pipe.zsh` on 5.0.8 |

## Contested / evolving

- **ERR_EXIT/ERR_RETURN (as of 2026-10-11, 5.10 unreleased).** The 5.10 draft aligns zsh with POSIX-2017 `set -e` in four ways. Direction: toward bash/dash behaviour. Until it ships and macOS adopts it, write `if ! cmd`/`|| return`. Re-run `errexit.zsh` on the release.
- **zsh as a scripting shell.** Scripts for macOS-only tools are increasingly zsh, yet portability guides keep recommending POSIX sh/bash for anything cross-platform; the fleet has 0 authored zsh files, so this set's position is "zsh for interactive and macOS-native glue, POSIX sh or bash for shared scripts" (map Artifact set decision). Direction: stable.
- **shfmt zsh support.** 3.13.0 (2026-03) introduced it, 3.14.1 (2026-09-06) closed several gaps (`${=}`, `;|`); `always`, `foreach`, `repeat`, `for k v in` remain unsupported. Direction: improving; re-run the 572-file corpus per release (498 -> 518 between 3.13.1 and 3.14.1).
- **Linters.** ShellCheck still refuses zsh (SC1071, wiki unchanged); zshellcheck is new (v1.8.0, 2026-09-20) and moves fast. Revisit if it reaches the semantic items (word splitting, `local path`, nomatch).
- **`.zshenv` vs `.zprofile` for PATH.** Practitioners disagree: `.zshenv` for non-interactive `ssh host cmd`, `.zprofile` for login. This file follows the manual and SH-EMIT (env in `.zprofile`, `.zshenv` minimal); macOS `path_helper` interaction is unverified: read only.
- **`emulate -L zsh` as the standard prologue.** Many zsh authors treat it as free hygiene; the measured side effect on errexit (dropped) is not in the manual's description of `emulate`. Direction: unchanged; possible doc fix upstream.
- **Nameref.** 5.10 adds named references (zsh/ksh93 module); bash `declare -n` code still fails on every released zsh.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/zsh-users/zsh/master/NEWS | zsh NEWS, "Changes since 5.9" (the 5.10 draft) and per-release history to 5.0.0 | master @ 2026-10-11 (5.9.999.3-test) | ERR_EXIT/ERR_RETURN refinement, nameref, 5.1 reserved-word builtins, 5.5 `typeset -A h=([k]=v)` |
| https://raw.githubusercontent.com/zsh-users/zsh/master/README | "Incompatibilities since 5.9" with executable examples | master @ 2026-10-11 | the four errexit changes, `is-at-least`, `(w)` subscript |
| https://zsh.sourceforge.io/Doc/Release/Options.html | zsh options manual: NOMATCH, ERR_EXIT, ERR_RETURN, LOCAL_OPTIONS, LOCAL_TRAPS, POSIX_TRAPS, SH_WORD_SPLIT, EQUALS | 5.9 | authoritative option semantics |
| https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html | `emulate`, sticky emulation, `-L` | 5.9 | the bridge contract |
| https://zsh.sourceforge.io/Doc/Release/Files.html | startup/shutdown file order, `.zshenv` guidance | 5.9 | startup placement |
| https://zsh.sourceforge.io/Doc/Release/Parameters.html | `path`/`PATH`, `fpath`, `status`, `pipestatus` ties | 5.9 | special names |
| https://zsh.sourceforge.io/Doc/Release/Invocation.html | `--emulate`, invoked-as-sh/ksh, `-f` | 5.9 | invocation flags |
| https://zsh.sourceforge.io/Doc/Release/Expansion.html | `${=spec}`, `(P)`, filename expansion `=cmd` | 5.9 | zsh parameter-expansion forms |
| https://zsh.sourceforge.io/Doc/Release/Conditional-Expressions.html | `=` / `==` in `[[ ]]` and `[` | 5.9 | why `[ a == b ]` fails |
| https://zsh.sourceforge.io/FAQ/zshfaq03.html | zsh FAQ 3.1 on word splitting and `SH_WORD_SPLIT` | FAQ, long-lived | the maintainers' rationale and `${=x}` |
| https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md | shfmt changelog: Zsh support 3.13.0, 3.13.1, 3.14.1 | 3.14.1 = 2026-09-06 | what `-ln zsh` supports |
| https://github.com/koalaman/shellcheck/wiki/SC1071 | ShellCheck SC1071 "only supports sh/bash/dash/ksh" | wiki clone, 0.11.0 era | why zsh files cannot be ShellChecked |
| https://github.com/afadesigns/zshellcheck | zshellcheck 1.8.0 README, CHANGELOG, binary | 2026-09-20 | the only zsh-specific linter measured |
| https://github.com/romkatv/powerlevel10k | README "How do I configure instant prompt?" and source (`@d05a1b00f9a6`) | corpus fetched 2026-10-10 | startup constraints; `emulate -L zsh -o ...` idiom |
| https://github.com/junegunn/fzf | `shell/completion.zsh` (`@25adb674537b`) | corpus fetched 2026-10-10 | model prologue for sourced libraries |
| https://github.com/ohmyzsh/ohmyzsh | 388 `.zsh` files (`@42a4ccb1b14d`) | corpus fetched 2026-10-10 | the largest zsh corpus; hook, `(N)`, `always`, `echo -e` usage |
| https://github.com/zsh-users/zsh-autosuggestions | `src/*.zsh` (`@85919cd1ffa7`) | corpus fetched 2026-10-10 | `${=var}`, `localoptions`, `${0:A:h}` |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | GitHub Actions `shell:` values and custom-shell template | docs, 2026-10 | zsh is not a built-in CI shell |
| https://support.apple.com/en-us/102360 | "Use zsh as the default shell on Mac" | Apple support | default login/interactive shell since macOS 10.15 |
