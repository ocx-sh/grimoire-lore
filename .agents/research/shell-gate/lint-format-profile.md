---
title: "The gate of record: ShellCheck and shfmt profile, file discovery and file hygiene"
topic: shell scripting across operating systems and shells, wave 2, group gate (SH-GATE), item W2-7 gate/lint-format-profile
agent: gate-lint-format-profile
model: sonnet
date_researched: 2026-10-11
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/lint-format-profile/
scope: |
  Covers the ShellCheck profile (severity, optional checks, .shellcheckrc keys and search order, directive hygiene), the shfmt profile (dialect detection, EditorConfig, flags-override, discovery, version floors), file discovery, the missing-tool failure mode, parse-only gates for every shell family, byte-level hygiene (CRLF, BOM, ASCII, exec bit), embedded shell (actionlint), and the agent-tell grep set. Rows M-F-01..M-F-14, M-G-06, M-O-01, M-O-03.
  Does not cover: PSScriptAnalyzer rule selection (group pwsh), bats test design (group testing), checkbashisms/posh (M-F-15), pre-commit hooks (M-F-16), or the semantics of SC2310/SC2312 sites (group errexit). Windows PowerShell and macOS: no macOS host, so BSD-userland and macOS-only statements are marked "unverified: read only".
---

# The gate of record: ShellCheck and shfmt profile, file discovery and file hygiene

Everything below was measured on 2026-10-11 against ShellCheck 0.9.0, 0.10.0 and 0.11.0, shfmt 3.12.0, 3.13.0, 3.13.1 and 3.14.1, actionlint 1.7.12 and Task 3.53.1, unless a line says otherwise. Fixture paths are relative to `/home/mherwig/.cache/research-lang/shell-tools/fixtures/lint-format-profile/` (written `FX/`). Every command shown with an exit code was run.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [ShellCheck severities: what `-S warning` hides](#1-shellcheck-severities-what--s-warning-hides)
   2. [The shipped `.shellcheckrc`](#2-the-shipped-shellcheckrc)
   3. [Directive hygiene and the relaxation list](#3-directive-hygiene-and-the-relaxation-list)
   4. [ShellCheck and shfmt version floors](#4-shellcheck-and-shfmt-version-floors)
   5. [shfmt: dialect, EditorConfig, flags-override, style of record](#5-shfmt-dialect-editorconfig-flags-override-style-of-record)
   6. [File discovery](#6-file-discovery)
   7. [The gate: missing tools, empty lists, the verbatim script](#7-the-gate-missing-tools-empty-lists-the-verbatim-script)
   8. [Parse-only gates per shell family](#8-parse-only-gates-per-shell-family)
   9. [File hygiene: CRLF, BOM, ASCII, exec bit, libraries](#9-file-hygiene-crlf-bom-ascii-exec-bit-libraries)
   10. [Bats, zsh and other dialects inside the gate](#10-bats-zsh-and-other-dialects-inside-the-gate)
   11. [Embedded shell: workflows, Taskfiles, docs](#11-embedded-shell-workflows-taskfiles-docs)
   12. [Chase: what the fleet's `-S warning` gate misses](#12-chase-what-the-fleets--s-warning-gate-misses)
   13. [Fleet and exemplar defects (reported, not fixed)](#13-fleet-and-exemplar-defects-reported-not-fixed)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Ship ShellCheck at default severity, with the profile in `.shellcheckrc` and no `-S`.** The gate command for ShellCheck is `shellcheck FILES` and nothing else; style lives in the rc, never in flags. Every `-S`/`--severity`/`SHELLCHECK_OPTS=...severity` is a defect (SH-GATE-01).
- **The map's severity list needs correcting, and conflict 4 still stands.** Measured on 0.9.0, 0.10.0 and 0.11.0: SC2086 info, SC2162 info, SC2046 warning, SC2155 warning, SC2164 warning, SC2068 error, SC2310 info, SC2312 info. So `-S warning` hides SC2086 and SC2162 but not SC2046 or SC2068 (`FX/sev/`).
- **The worst effect of `-S warning` is on the optional checks.** SC2310 and SC2312 are info-level, so `enable=check-set-e-suppressed` plus `-S warning` is dead config: 0 of 260 findings those checks add on the 197 authored fleet files are visible at `-S warning` (`FX/quant/quant.out`).
- **On the fleet today the damage is smaller than feared.** `-S warning` hides 57 of 65 default-severity findings on the 197 authored files (88%), but in the four gated repos it hides only 8 SC1091 (all ocx) and 0 SC2086. The 30 SC2086 sit in `oras-www`, which has no gate.
- **The shipped `.shellcheckrc` is five lines:** `external-sources=true`, `source-path=SCRIPTDIR`, and `enable=` for `check-set-e-suppressed`, `check-extra-masked-returns`, `deprecate-which`. It works unchanged on 0.9.0, 0.10.0 and 0.11.0. It carries no `severity=` (not an rc key, silently ignored) and no `shell=` (overrides every shebang repo-wide).
- **ShellCheck reads only the nearest `.shellcheckrc`; it never merges.** A nested rc silently drops `external-sources`, `source-path` and every `enable=` of the root rc (SC1091 and the optional checks vanish). Forbid nested rcs, or require them to repeat the profile (SH-GATE-04).
- **A typo in `enable=` is silent.** `-o no-such-check` is accepted on all three versions; the gate must prove each optional check fires on a plant (SH-GATE-03).
- **Every `# shellcheck disable=` needs a same-line `# reason`; SC2155, SC2164, SC2162, SC2115, SC2068 are never disabled; SC2086 and SC2046 never in the rc.** Retired or default-off codes (SC2039, SC2230, SC3013) in a `disable=` are stale; ShellCheck does not report stale suppressions, so grep does (SH-GATE-05..07, 31).
- **Missing tools must fail the gate.** grimoire's gate prints "skipping" and exits 0 under Task 3.53.1; actionlint exits 0 without shellcheck even when given a nonexistent `-shellcheck=` path. The proposed gate exits 69 for a missing tool, 78 for a missing profile file, 66 for an empty file list.
- **Discovery is `git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f`, never `git ls-files '*.sh'` and never a `**` glob.** On the discovery fixture the `'*.sh'` list finds 5 of 14 shell files; the proposed command finds 12 on shfmt 3.13.1 and 13 on 3.14.1. Two exemplars (starship, docker-install) skip their own top-level installer because `**/*.sh` without globstar behaves as `*/*.sh`.
- **shfmt 3.13.1 `-f=0 FILE...` does not filter explicit file arguments** (it echoes `.editorconfig`, `.gitattributes`); 3.13.0 and 3.14.1 do. Use plain `-f` (`FX/fdrive.sh`).
- **The shfmt style lives in `.editorconfig` (`indent_style = space`, `indent_size = 4`, `switch_case_indent = true`), and the gate passes no style flag.** Any parser or printer flag disables EditorConfig. 161 of 197 authored files are clean under it; 2 spaces gives 80, tabs 77. Use the older key spelling `switch_case_indent`: `case_indent` is documented on master but ignored by 3.14.1.
- **shfmt `-l` exits 0 on 3.12.0 and earlier**; the gate uses `-d`, which exits 1 on every version tested. Ubuntu 24.04 ships shfmt 3.8.0 and Ubuntu 26.04 ships 3.12.0, so pin the tool from the toolchain, not apt.
- **`bash -n` is not a parse gate below bash 5.2.** An unterminated `arr=(1 2` exits 0 on bash 3.2, 4.0, 4.2, 4.4, 5.0 and 5.1 and exits 1 on 5.2 and 5.3. Use `shellcheck` or `shfmt` as the parser; `fish --no-execute` exits 127 on a syntax error and a `nu` check needs a wrapper because `--ide-check` exits 0.
- **Hygiene is four byte-level checks:** CR bytes, BOM, non-ASCII in `#!/bin/sh` scripts, and mode versus shebang. Each went red on a plant and green on its twin. `rg` did not go red for BOM (it strips the BOM); use `grep -e $'\xEF\xBB\xBF'` or SC1082.
- **actionlint ignores `.shellcheckrc`** and runs shellcheck at default severity; pass the profile through `SHELLCHECK_OPTS='-o check-set-e-suppressed,check-extra-masked-returns,deprecate-which'`.
- **A comment that starts with `# shellcheck ` followed by prose is parsed as a directive** and breaks the file (SC1073, SC1072, SC1061). Write `# note: shellcheck ...`.

## Findings

### 1. ShellCheck severities: what `-S warning` hides

ShellCheck has four levels, `error`, `warning`, `info`, `style`; `-S` keeps only findings at or above the named level ([shellcheck.1.md](https://raw.githubusercontent.com/koalaman/shellcheck/master/shellcheck.1.md) `--severity`). The wiki pages do not state a severity per code; the source does. Severities set in the checker source ([Analytics.hs](https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Analytics.hs) lines 825 `warn 2046`, 952 `err 2068`, 2229 `infoWithFix 2086`, 3261 `info 2162`, 3326 `warnWithFix 2164`, 4921 `info 2310`, 5014 `info 2312`; [Commands.hs](https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Checks/Commands.hs) line 1427 `warn 2155`, line 1264 `info 2230`). Measured with `-f json1` on `FX/sev/sev.sh` and `FX/sev/sev-e.sh`, identical on 0.9.0, 0.10.0 and 0.11.0:

| Code | Level | Visible at `-S warning` | Needs |
|---|---|---|---|
| SC2086 | info | no | |
| SC2162 | info | no | |
| SC2046 | warning | yes | |
| SC2155 | warning | yes | |
| SC2164 | warning | yes | no `set -e` in effect |
| SC2068 | **error** | yes | |
| SC2310 | info | no | `enable=check-set-e-suppressed` |
| SC2312 | info | no | `enable=check-extra-masked-returns` |
| SC2230 | info | no | `enable=deprecate-which` |
| SC1091 | info | no | |
| SC1082 (BOM), SC1017 (CR) | error | yes | |

```text
$ shellcheck -f json1 sev.sh                       (default)         $ shellcheck -S warning ... sev.sh
4 SC2086 info                                                          5 SC2046 warning
5 SC2046 warning                                                       6 SC2068 error
6 SC2068 error                                                         7 SC2155 warning
7 SC2155 warning                                                       9 SC2164 warning
8 SC2162 info                                      <- gone: SC2086, SC2162
9 SC2164 warning
$ shellcheck -S error ... sev.sh        ->  6 SC2068 error
```

Consequences:

- Conflict 4 in the topic map says "SC2086, SC2046, SC2068 and SC2162 are info-level". Measured: only SC2086 and SC2162 are. The conclusion (do not use `-S warning`) stands; the rationale changes: `-S warning` hides the top bug class (SC2086) and every optional check, not SC2046 or SC2068.
- **SC2164 is silent whenever `set -e` is in effect.** `checkUncheckedCdPushdPopd` returns `[]` when `hasErrexit params` ([Analytics.hs:3317-3319](https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Analytics.hs)). Measured: `sev-e.sh` (`set -euo pipefail` then `cd /tmp`) gives no SC2164; `sev.sh` (no `-e`) gives it. "Never disable SC2164" is therefore free in `set -e` scripts and a real finding elsewhere.
- **ShellCheck exits 1 on any finding of any severity**, including info (`FX/sev/` default run: exit 1 with SC2086 only). Default severity therefore gates on SC2086; `-S warning` turns the same script green.
- The optional checks added by the profile are all info. With `-S warning` they are dead config (see §12).

### 2. The shipped `.shellcheckrc`

Keys the rc accepts (from [the Directive wiki](https://github.com/koalaman/shellcheck/wiki/Directive), [shellcheck.1.md](https://raw.githubusercontent.com/koalaman/shellcheck/master/shellcheck.1.md) and measurement): `disable=`, `enable=`, `source=`, `source-path=`, `shell=`, `external-sources=`, `extended-analysis=`. Version of introduction: `source-path` 0.7.0, `enable` 0.7.0, range `disable=SC3000-SC4000` 0.7.2 ([CHANGELOG 0.7.2](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md)), `external-sources` and `disable=all` 0.8.0, quoted values 0.9.0, `extended-analysis` and `--rcfile` 0.10.0.

**Search order** (Directive wiki, `.shellcheckrc` section; man page "RC FILES"): `.shellcheckrc` or `shellcheckrc` in the script's directory and each parent directory, then `~/.shellcheckrc`, then `$XDG_CONFIG_HOME/shellcheckrc` (`%APPDATA%/shellcheckrc` on Windows). "Only the first file found will be used." Measured on 0.11.0:

| Experiment (`FX/rc/`, `FX/rcdrive2.sh`, `FX/home-drive.sh`) | Result |
|---|---|
| `rc/nested/.shellcheckrc` (`disable=SC2034`) under a root rc with the profile | root keys lost: no SC2310, SC1091 returns; only SC2034 off |
| `severity=warning` in an rc | **silently ignored**: SC2086 (info) still reported |
| `shell=bash` in an rc, file has `#!/bin/sh` | **overrides the shebang**: SC3030 (arrays) and SC3010 (`[[`) vanish; same file with `--norc` reports both |
| `[*.sh] shellcheck.disable=SC2086` in `.editorconfig` | **ignored on 0.11.0**; the man page on master documents it and the CHANGELOG lists it under unreleased "Git" |
| no repo rc, `~/.shellcheckrc` with `disable=SC2086` | home rc applies (SC2086 gone); `--norc` restores it |
| `enable=no-such-check` / `-o no-such-check` | accepted silently on 0.9.0, 0.10.0, 0.11.0 |
| trailing `# comment` after `key=value` | accepted for every key on 0.9.0 and 0.11.0 |
| `--files-from` | **unreleased**: `unrecognized option` on 0.11.0 (CHANGELOG "Git") |

Proof that `source-path=SCRIPTDIR` resolves a sourced library (`FX/rcdrive.sh`, `FX/rc/`):

```text
== A proposed rc :: shellcheck bin/tool.sh            -> exit 0
== B --norc       :: bin/tool.sh:4:3: note: Not following: ./../lib/common.sh was not specified as input (see shellcheck -x). [SC1091]   -> exit 1
== C --norc -x    :: ... openBinaryFile: does not exist [SC1091]   -> exit 1      (-x alone resolves against cwd, not the script)
== D tool-sp.sh with rc (. common.sh, # shellcheck source-path=SCRIPTDIR/../lib)  -> exit 0
== F dynamic ${LIBDIR}/missing.sh with rc            -> SC1091  exit 1      (genuinely unresolvable: needs a per-site directive)
== G absolute path from cwd /                        -> exit 0              (SCRIPTDIR, not cwd)
```

`bin/tool.sh` uses `. "$here/../lib/common.sh"`; ShellCheck strips one leading dynamic section (`$here/`) and looks for `../lib/common.sh` relative to the script ([Directive wiki, source-path](https://github.com/koalaman/shellcheck/wiki/Directive)), which is why the common `here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)` idiom resolves.

**The shipped file** (verbatim; works on 0.9.0, 0.10.0, 0.11.0, `FX/rc2/drive.sh`; `FX/rc2/bin/tool.sh` clean, `FX/rc2/bin/sev-e.sh` yields SC2310, SC2312, SC2230 on all three):

```text
# shell-quality gate profile. Severity is a command-line concept, not an rc key: never pass -S.
# Only the nearest .shellcheckrc is read (no merging): a nested one must repeat every line below.
external-sources=true                      # follow `source` without -x
source-path=SCRIPTDIR                      # resolve `. "$here/../lib/x.sh"` and `. x.sh` from the script's directory
enable=check-set-e-suppressed              # SC2310 / SC2311: set -e silently off inside `if f`, `f &&`, `f ||`
enable=check-extra-masked-returns          # SC2312: a failing command inside $(...) or a pipeline is masked
enable=deprecate-which                     # SC2230: `which` is not POSIX; use `command -v`
```

Not in the file, on purpose: `severity=` (no such key), `shell=` (overrides shebangs), `disable=` of any code (relaxations are per-site with a reason, §3), `enable=all` (the [Optional wiki](https://github.com/koalaman/shellcheck/wiki/Optional): optional checks "are more subjective rather than more comprehensive, and may conflict with each other"), `extended-analysis=false` (turns off the dataflow engine that SC2086 uses since [0.9.0](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md)).

Optional checks available on 0.9.0 and 0.10.0: `add-default-case`, `avoid-nullary-conditions`, `check-extra-masked-returns`, `check-set-e-suppressed`, `check-unassigned-uppercase`, `deprecate-which`, `quote-safe-variables`, `require-double-brackets`, `require-variable-braces`; 0.11.0 adds `avoid-negated-conditions` and `useless-use-of-cat` (`shellcheck --list-optional`, `FX/vdrive2.sh`). SC2002 (useless cat) became opt-in in 0.11.0.

### 3. Directive hygiene and the relaxation list

Placement rules ([Directive wiki](https://github.com/koalaman/shellcheck/wiki/Directive)): a directive directly after the shebang applies to the whole file; elsewhere it applies to the next complete command (a whole `case`/`if`/function, never one `case` branch). `# shellcheck disable=SC1234 # reason` on one line is the wiki's recommended short form. A comment that begins `shellcheck` followed by prose is parsed as a directive:

```sh
# shellcheck cannot parse zsh, so skip it       # SC1073 Couldn't parse this shellcheck directive; SC1072 Expected '=' after directive key
# note: shellcheck cannot parse zsh, so skip it # clean
```

(`FX/misc/red/prose.sh` exit 1; `FX/misc/green/prose.sh` exit 0.) The same bug broke the first draft of this research's gate script (a trailing `# shellcheck cannot parse zsh` produced SC1073, SC1061, SC1141, SC1072 on a `while` loop).

Staleness: ShellCheck never reports an unused, retired or mistyped suppression. `# shellcheck disable=SC2039 # local is non-POSIX` on a `#!/bin/sh` file is silent while the real finding SC3043 appears; `disable=SC20865` is silently ignored and the original finding reappears (`FX/dis/`, `FX/dis-drive.sh`). SC2039 was split into individual SC3xxx codes in 0.7.2 ([CHANGELOG 0.7.2](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md): "POSIX/dash unsupported feature warnings now have individual SC3xxx codes"); SC2230 went opt-in in 0.7.1; SC3013 was removed in 0.11.0 because `-ot/-nt/-ef` are in POSIX.1-2024. rustup-init.sh still carries `disable=SC2039` at line 3 (rust-lang/rustup@61271d00a979:rustup-init.sh:3).

**Relaxation list** (confirms conflict 4 with two refinements; every directive is `# shellcheck disable=SCnnnn # <reason>` on one line):

| Code | When allowed | Required reason text (template) | Measured basis |
|---|---|---|---|
| SC2317 | indirect dispatch the analyzer cannot see (functions found by name at runtime, `eval`, DSL) on 0.9.0 and 0.10.0; real unreachable code on 0.11.0 is a finding | `# reached only through <the dispatch table / name lookup> below` | 0.9.0/0.10.0 flag never-called function bodies as SC2317; 0.11.0 moves that to SC2329 (`FX/relax/dsl.bash`) |
| SC2329 (0.11.0+) | same, for functions | same | `trap cleanup EXIT`, `"cmd_${1}"` dispatch and a sourced library are **not** flagged (`FX/relax/trap.sh`, `lib.sh`), so a central rc entry is unnecessary |
| SC1091 | only a dynamic path `source-path` cannot resolve (`"${LIBDIR}/x.sh"`) | `# path is computed at runtime from <var>; checked as <file> in its own run` | `FX/rc` case F |
| SC2016 | single-quoted `$` that is meant literally (emitted code, test strings) | `# single quotes are deliberate: the $ is for the target shell` | 14 of 39 exemplar repos disable it ([exemplar-shape.md:366-380](../shell-audit/exemplar-shape.md)) |
| SC3040 | probed `pipefail` in a `#!/bin/sh` script only | `# probed in a subshell first: dash 0.5.12-2 and posh abort on an unknown set -o` | the probe line still raises SC3040 twice on 0.9.0, 0.10.0, 0.11.0; with the directive it is clean and runs on 11 interpreters (`FX/relax/pf-ok.sh`, `matrix.sh posix` exit 0 everywhere) |
| SC3043 | `local` in `#!/bin/sh` when ksh93 is not a target | `# local is accepted by every sh target in the floor table` | `# shellcheck shell=dash` makes `local` clean, `shell=sh` raises SC3043 (`FX/relax/dia_*.sh`) |

**Never disabled, anywhere:** SC2155, SC2164, SC2162, SC2115, SC2068 (the last is an error-level finding). **Never in `.shellcheckrc` or file-wide:** SC2086, SC2046. A per-site SC2086/SC2046 directive for deliberate splitting is an owner decision (see Contested). Detector: SH-GATE-06.

Dialect for libraries: `# shellcheck shell=bash|sh|dash|ksh|busybox` as the first line. `shell=zsh` is rejected (SC1103); a `.zsh` or `#!/bin/zsh` file gives SC1071 "ShellCheck only supports sh/bash/dash/ksh/'busybox sh' scripts". A `.sh` file without shebang or directive is SC2148 (error); `.bash` and `.ksh` and `.bats` files without a shebang are accepted by extension (`FX/noshebang/`, `FX/ns-drive.sh`).

POSIX.1-2024 false positives (M-F-04), same script on three versions (`FX/posix2024/p.sh`): SC3013 (`-nt`, `-ef`) fires on 0.9.0 and 0.10.0 and is gone on 0.11.0; SC3040 (`pipefail`), SC3003 (`$'..'`), SC3045 (`read -d`) still fire on 0.11.0; SC3012 (`\<` in `[ ]`) still fires on 0.11.0 although its CHANGELOG entry says it should not. SC3003 is removed and SC3040 changed in unreleased master. The dash and posh targets in the floor table do not implement pipefail, `$'..'` or `read -d`, so SC3003 and SC3045 stay on.

### 4. ShellCheck and shfmt version floors

Distribution versions, measured with `apt-cache policy` / `apk policy` in containers on 2026-10-11 (`FX/distro-drive.sh`) and cross-checked against [actions/runner-images](https://github.com/actions/runner-images) readmes (actions/runner-images@8197087fc536:images/ubuntu/Ubuntu2404-Readme.md:311, Ubuntu2604-Readme.md:295, Ubuntu2204-Readme.md:356):

| Platform | ShellCheck | shfmt |
|---|---|---|
| GitHub ubuntu-22.04 runner | 0.8.0 | not preinstalled |
| ubuntu:24.04 / GitHub ubuntu-24.04 | **0.9.0** | 3.8.0 (apt) |
| debian:12 | 0.9.0 | 3.6.0 |
| debian:13 | **0.10.0** | 3.8.0 |
| ubuntu:26.04 / GitHub ubuntu-26.04 | **0.11.0** | 3.12.0 |
| alpine:3.22 | 0.10.0 | 3.11.0 |
| upstream latest (releases API, 2026-10-11) | 0.11.0 (2025-08-04), master active (last commit 2026-10-09) | 3.14.1 (2026-09-06) |

**ShellCheck floor.** The shipped rc and the three optional checks work on 0.9.0, 0.10.0 and 0.11.0 (measured). 0.8.0 (ubuntu-22.04 runner) has `external-sources` and `check-extra-masked-returns` per the CHANGELOG but was not run: unverified. The gate pins one version for CI and laptops (the toolchain's, currently `ocx.sh/shellcheck/shellcheck:0.11`, ocx@5de9d777eb7d `ocx.toml`) because the findings differ between versions: SC2329 exists only from 0.11.0, SC3013 only until 0.10.0, SC2002 is on by default only until 0.10.0. Never use the distro package as the gate on a matrix of images. The floor for "can read the rc" is 0.9.0; the floor for "same findings as the gate" is the pin.

**shfmt floor** (measured on 3.12.0, 3.13.0, 3.13.1, 3.14.1 where noted):

| Need | Version | Evidence |
|---|---|---|
| `shfmt -d` exits 1 on a diff | all tested | `FX/vendortest.sh` |
| `shfmt -l` exits non-zero when it lists a file | **3.13.0+** (3.12.0 exits 0) | [CHANGELOG 3.13.0](https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md), `FX/vendortest.sh` |
| zsh dialect (`-ln zsh`, `[[zsh]]`) | 3.13.0 / 3.13.1 | CHANGELOG |
| `#!/bin/dash` shebang detected as POSIX under `-ln auto` | **3.14.0+** (3.13.x parses it as bash) | CHANGELOG; `FX/ln-drive.sh` |
| `--detect=default\|exec\|all` | 3.14.0 | CHANGELOG; man page |
| `-f=0` filters explicit file arguments | 3.13.0 and 3.14.1 yes, **3.13.1 no** | `FX/fdrive.sh` |
| `--apply-ignore` applies `ignore = true` to explicit args | 3.8.0 (flag); worked on 3.13.0, 3.13.1, 3.14.1 | CHANGELOG 3.8.0; `FX/vendortest.sh` |
| `[[shell]]` EditorConfig section | 3.8.0 (changelog only; measured from 3.12.0) | CHANGELOG 3.8.0 |
| `case_indent` / `language_dialect` key names | **not in 3.14.1** (master only) | `FX/ecdrive.sh` `case_indent` run lists the file as dirty on 3.13.0, 3.13.1, 3.14.1; [main.go on master](https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/main.go) lines 428-442 accept both spellings |

Decision: **pin shfmt 3.13.1 or newer from the toolchain (current line 3.14.x), gate with `-d`, discover with plain `-f`, spell the keys `switch_case_indent` and `shell_variant`.** A repo that must also run on an Ubuntu 24.04 apt shfmt (3.8.0) can use the same gate only if it has no `.zsh` files (unverified: 3.8.0 was not run).

### 5. shfmt: dialect, EditorConfig, flags-override, style of record

**Dialect (`-ln auto`)** per the [man page](https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd): detected from the extension, else from a shell shebang, else bash; "`.sh` is a special case: it implies posix, but may be overridden by a valid shell shebang". Measured (`FX/ln-drive.sh`, 3.13.0, 3.13.1, 3.14.1):

| File | Result |
|---|---|
| `x.sh`, no shebang, `x=(1 2)` | **parses OK as bash** (contradicts the man page's "implies posix") |
| `#!/bin/sh` or `#!/usr/bin/env sh`, any extension or none | POSIX: `arrays are a bash/mksh/zsh feature` |
| `#!/bin/bash` | bash |
| `#!/bin/dash` | bash on 3.13.0/3.13.1, POSIX on 3.14.1 |
| `[[ a ]]` in a `#!/bin/sh` file | **parses fine** (shfmt's POSIX mode accepts `[[`) |
| `function g { :; }` in `#!/bin/sh` | rejected: `the "function" builtin is a bash feature` |

So shfmt is a partial bashism detector (arrays, `function`) and a poor one for `[[`; ShellCheck `-s sh` (SC3010) is the real check. `-ln bats` is not needed: `.bats` is detected by extension and parsed (`FX/discovery`, `t/z2.bats`).

**EditorConfig** (man page): "If any parser or printer flags are given to the tool, no EditorConfig formatting options will be used. A default like `-i=0` can be used for this purpose." Source: `useEditorConfig` is set false in a `flag.Visit` over every flag except the generic and utility ones ([main.go:100-101, 196-219](https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/main.go)). Measured on 3.13.0, 3.13.1, 3.14.1 (`FX/ec/`, `FX/ecdrive.sh`):

```text
shfmt -l a.sh bin/tool                 -> (clean)        exit 0   .editorconfig: indent_style=space, indent_size=4, switch_case_indent=true
shfmt -l -i 4 a.sh bin/tool            -> a.sh bin/tool  exit 1   a flag was given: EditorConfig ignored, -ci off, the 4-space+case-indent files are "dirty"
shfmt -l -i 4 -ci a.sh bin/tool        -> (clean)        exit 0
shfmt -l two.sh                        -> two.sh         exit 1   2-space file vs 4-space config
```

Other EditorConfig facts, measured: `indent_style` must be `space` (anything else means tabs; main.go lines 432-437); `[[shell]]` matches extensionless shebang scripts (`bin/tool` clean under the `[[shell]]` section); `[vendor/**] ignore = true` is honored when walking a directory (`shfmt -l .`) but **skipped for explicit file arguments unless `--apply-ignore` is given** (`shfmt -l vendor/bad.sh` lists it, exit 1 on 3.13.0+; with `--apply-ignore` exit 0). A gate that feeds `git ls-files` output as explicit arguments therefore needs `--apply-ignore`. Always set `root = true` ([EditorConfig spec](https://spec.editorconfig.org/): without it the search continues into parent directories).

**Style of record (owner Q3, M-F-08).** Re-measured on the 197 authored shell-family files with explicit flags (`FX/quant/fmt.py`, `fmt.out`):

| Style | Clean | Dirty |
|---|---|---|
| `-i 4 -ci` | **161** | 36 |
| `-i 4 -ci -bn` | 140 | 57 |
| `-i 4` | 135 | 62 |
| `-i 4 -ci -s` | 130 | 67 |
| `-i 2 -ci` | 81 | 116 |
| `-i 2` | 80 | 117 |
| tabs | 77 | 120 |

Confirmed: `indent_size = 4` plus `switch_case_indent = true`, written to `.editorconfig`, no flags in the gate. Corpus majority is 2 spaces 54% ([exemplar-shape.md:48](../shell-audit/exemplar-shape.md)); an adopter that pins 2 in its own `.editorconfig` is compliant. Drift guard: bats-core pins shfmt 3.5.1 and 3.13.1 would reformat 48 files, acme.sh pins 3.1.2 and stays clean ([exemplar-shape.md:434, 636](../shell-audit/exemplar-shape.md)); pin the version.

Shipped `.editorconfig` (verbatim, `FX/gate/.editorconfig`):

```ini
root = true

[*]
end_of_line = lf
insert_final_newline = true

[*.{sh,bash,bats,ksh}]
indent_style = space
indent_size = 4
switch_case_indent = true

[[shell]]
indent_style = space
indent_size = 4
switch_case_indent = true
```

### 6. File discovery

Four candidate lists on one tree (`FX/discovery/`, `FX/disc-final.sh`; 20 tracked files; hand-labelled truth = 14 shell files: `x.sh`, `y.bash`, `t/z.bats`, `t/z2.bats`, `bin/tool` (`#!/bin/sh`, no ext), `hooks/pre-commit` (`#!/usr/bin/env bash`), `scripts/run` (`#!/bin/bash`), `scripts/z.zsh`, `scripts/dashy` (`#!/bin/dash`), `lib/lib.sh` (no shebang, `shell=bash` directive), `.hidden/h.sh`, `vendor/third.sh`, `newfile.sh` (untracked), `scripts/deploy.cgi` (`#!/bin/sh`, exec); plus `scripts/notes.txt` (shebang, not exec) and `lib/helpers` (no shebang, no extension) that no tool can find):

| Command | Finds | Misses |
|---|---|---|
| `git ls-files '*.sh'` (the fleet gate, ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:21) | 5 of 14 | `y.bash`, both `.bats`, `bin/tool`, `hooks/pre-commit`, `scripts/run`, `scripts/z.zsh`, `scripts/dashy`, `deploy.cgi` |
| `shfmt -f .` (3.13.1) | 12, **plus `node_modules/pkg/postinstall.sh`** | walks the disk: includes gitignored trees, includes `.hidden/` |
| `git ls-files -z --cached --others --exclude-standard \| xargs -0 -r shfmt -f` (3.13.1) | **12** | `scripts/dashy` (dash shebang), `deploy.cgi` (non-shell extension) |
| the same with shfmt 3.14.1 | **13** | `deploy.cgi` |
| the same, 3.14.1 `--detect=exec` / `--detect=all` | 13 / 14 (+`notes.txt`) | |

`--detect` ([man page](https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd), 3.14.0): default reads extensions and shebangs of extensionless files; `exec` also reads shebangs of executable files with other extensions; `all` reads every regular file. Measured on `scripts/deploy.cgi` (exec) and `scripts/notes.txt` (not exec).

**Decision: the discovery command is the third row.** It reads git, not the disk (so `node_modules`, `target` and untracked build output are out, new unstaged files are in), finds extensionless hooks by shebang, and never uses a glob. Exclusions are git pathspecs appended to the `git ls-files` call: `-- . ':(exclude)vendor' ':(exclude)external'`. Measured: a violation under `vendor/` is red without the pathspec and green with it (`FX/plant-final.sh`). A file with no extension and no shebang is unreachable by any tool; it must be named `.sh`/`.bash` or carry a shebang (SH-GATE-24). An extension on authored scripts remains the owner-Q8 default.

Fleet gap with the real repos (read-only, `FX/gap-drive.sh`, vendored `external/` excluded): `git ls-files '*.sh'` versus the proposed list over tracked files: ocx 129 vs 129, grimoire 17 vs 17, **www-setup 12 vs 21 (9 missed: 7 `.bats`, 2 `.bash`), setup-grimoire 2 vs 8 (6 missed: 3 `.bats`, 2 `.bash`, `site/sh`)**. setup-grimoire lints `site/sh` and the helpers through a hand-written file list (setup-grimoire@1259e35b2550:Taskfile.yml:25-27), which drifts silently. Ten `.bats` files across the fleet are outside every gate (find over `/home/mherwig/dev` with the fleet exclusions: 10; `FX/quant/hyg.out`).

### 7. The gate: missing tools, empty lists, the verbatim script

**Missing tool.** grimoire's gate is `shellcheck not installed - skipping` plus exit 0 (grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10-21). Task 3.53.1 enables errexit by default, which is why it does fail on findings, but a missing tool is still a pass (`FX/task-drive.sh`, the file copied verbatim to `FX/plants/grimoire-task/Taskfile.yml`):

```text
verify, both tools, planted SC2086 (info)   -> "task: Failed to run task "verify": exit status 123"   exit 201
verify, shellcheck missing                  -> "shellcheck not installed - skipping ..."             exit 0   <- the red the map asks for
verify, both missing                        -> two "skipping" lines                                  exit 0
```

actionlint has the same flaw: with no `shellcheck` on PATH, and even with `-shellcheck=/nonexistent/shellcheck`, a workflow with an unquoted `$FOO` exits 0 (`FX/wf-drive2.sh`).

The proposed gate (below) checks `command -v` for `git`, `shellcheck`, `shfmt` first and exits 69 (BSD `EX_UNAVAILABLE`, which the [Rust CLI contract](../../../../rules/rust-quality/cli-contract.md) table maps to `Unavailable`); it exits 78 (`ConfigError`) when `.shellcheckrc` or `.editorconfig` is missing at the root (ShellCheck falls back to `~/.shellcheckrc`, so a missing rc means the laptop and CI disagree; measured), and 66 when discovery returns nothing.

```text
PATH=base+shfmt-only        bash shell-gate.sh   -> shell-gate: 'shellcheck' not on PATH   exit 69
PATH=base+shellcheck-only   bash shell-gate.sh   -> shell-gate: 'shfmt' not on PATH        exit 69
PATH=base only                                   -> exit 69
PATH=base+both                                   -> exit 0           (green twin)
repo without .shellcheckrc                       -> missing .shellcheckrc at the repo root  exit 78
repo with no shell files                         -> no shell files found                    exit 66
```

**The gate script** (verbatim from `FX/gate/shell-gate.sh`; passes its own `shellcheck` with the shipped rc and its own `shfmt -d`; parses and runs its array, here-string and `$'..'` parts on bash 3.2 in a container, `FX/bash32-drive.sh`):

```bash
#!/usr/bin/env bash
# shell-gate: the gate of record. Run from the repo root. Any non-zero exit fails the build.
# Never append '|| true'; never pass -S/--severity; style lives in .editorconfig and .shellcheckrc.
set -euo pipefail

for tool in git shellcheck shfmt; do
    command -v "$tool" >/dev/null 2>&1 || {
        echo "shell-gate: '$tool' not on PATH" >&2
        exit 69
    }
done

# 0. The profile must live in the repo: ShellCheck falls back to ~/.shellcheckrc, so a missing file means CI and laptop disagree.
for cfg in .shellcheckrc .editorconfig; do
    [ -f "$cfg" ] || {
        echo "shell-gate: missing $cfg at the repo root" >&2
        exit 78
    }
done

# 1. Discover: tracked or new-and-unignored files that shfmt recognises by extension or shebang.
#    Plain -f, never -f=0: shfmt 3.13.1 -f=0 stops filtering explicit file arguments.
list=$(git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f)
[ -n "$list" ] || {
    echo "shell-gate: no shell files found" >&2
    exit 66
}
all=() sc=() fail=0
while IFS= read -r f; do
    all+=("$f")
    IFS= read -r line1 <"$f" || line1=''
    case "$f $line1" in *.zsh\ * | *\ '#!'*zsh*) ;; *) sc+=("$f") ;; esac # zsh is not a shellcheck dialect
done <<<"$list"

# 2. Format and lint at default severity.
shfmt -d --apply-ignore "${all[@]}" || fail=1
[ "${#sc[@]}" -eq 0 ] || shellcheck "${sc[@]}" || fail=1

# 3. Hygiene: each check prints the offending file; empty output means pass.
LC_ALL=C grep -l -e $'\r' "${all[@]}" && {
    echo "shell-gate: CR bytes (CRLF) in the files above" >&2
    fail=1
}
LC_ALL=C grep -l -e $'\xEF\xBB\xBF' "${all[@]}" && {
    echo "shell-gate: UTF-8 BOM in the files above" >&2
    fail=1
}
for f in "${all[@]}"; do
    IFS= read -r line1 <"$f" || line1=''
    mode=$(git ls-files -s -- "$f" | cut -c1-6)
    case "$mode:$line1" in
        100644:'#!'*)
            echo "shell-gate: shebang but mode 100644: $f" >&2
            fail=1
            ;;
        100755:'#!'*) ;;
        100755:*)
            echo "shell-gate: mode 100755 but no shebang: $f" >&2
            fail=1
            ;;
    esac
    case "$line1" in '#!/bin/sh'* | '#!/usr/bin/env sh'*)
        LC_ALL=C grep -n -e '[^ -~[:space:]]' "$f" && {
            echo "shell-gate: non-ASCII in sh script $f" >&2
            fail=1
        }
        ;;
    esac
done
exit "$fail"
```

Design notes, each measured: the list is held in a variable and read with a here-string, because `done < <(git ... | xargs ...)` triggers SC2312 under the shipped profile (the gate failed its own lint until rewritten); `read -r` per line (not `-d ''`) because of the `-f=0` regression; `${#sc[@]}` guards the empty-array `"${sc[@]}"` that bash < 4.4 rejects under `set -u`; paths with spaces work (`my script.sh` plant is green); a path that begins with `-` is not handled (unverified, pathological). Exclusions: add `-- . ':(exclude)vendor'` after `--exclude-standard`.

Thirteen plants against fresh copies of the green twin (`FX/plant-final.sh`), all red as expected: SC2086 (exit 1), bad indent (1), CRLF (1, SC1017 and the CR grep), BOM (1, SC1082 and the BOM grep), non-ASCII in `#!/bin/sh` (1), shebang with mode 100644 (1), mode 100755 without shebang (1), parse error (1, SC1046/SC1073), vendor violation not excluded (1), no shell files (66), missing rc (78); twins green: non-ASCII in a bash script, a `.zsh` file, vendor excluded by pathspec, a file with a space in its name.

### 8. Parse-only gates per shell family

Each command run on a broken file and a good twin (`FX/parse-errors/`, `FX/pe-drive.sh`, `FX/pe-drive2.sh`, `FX/bashn-drive.sh`):

| Family | Command | Broken | Good |
|---|---|---|---|
| POSIX sh | `dash -n FILE` (also `busybox ash -n`, `bash --posix -n`, `mksh -n`) | 2 (mksh 1, bash --posix 2) | 0 |
| bash | `bash -n FILE` | **0 on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1; 1 on 5.2, 5.3** for an unterminated `arr=(1 2`; 2 for a missing `fi` on all | 0 |
| any sh/bash/ksh/bats | `shellcheck FILE` (parse errors are SC1xxx errors) | 1 | 0 |
| any sh/bash/bats | `shfmt FILE >/dev/null` | 1 (`reached EOF without matching ( with )`) | 0 |
| zsh | `zsh -fn FILE` (5.0.8 and 5.9) | 1 | 0 |
| fish | `fish --no-execute FILE` (3.6.0, 4.0.2, 4.9.3) | **127** | 0 |
| nushell | `nu -c 'if not (nu-check FILE) { exit 1 }'` (0.105.1, 0.116.0) | 1 | 0 |
| nushell | `nu --ide-check 10 FILE` | **0**, prints `{"type":"diagnostic","severity":"Error",...}` | 0 |
| nushell | `nu -c 'nu-check FILE'` alone | **0**, prints `false` | 0, prints `true` |
| elvish | `elvish -compileonly FILE` (0.21.0) | 2 | 0 |
| PowerShell | `pwsh -NoProfile -Command '$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile($f,[ref]$t,[ref]$e); if ($e.Count) { $e \| % Message; exit 1 }'` (7.4 LTS, 7.6.6) | 1 (`Missing closing '}' in statement block`) | 0 |

[`Parser.ParseFile`](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parsefile) returns the errors through its `ParseError[]` out-parameter and does not throw; the wrapper must test `Count`. Windows PowerShell 5.1 was not run for this item (group pwsh owns it). [fish](https://fishshell.com/docs/current/cmds/fish.html): `-n/--no-execute` "only perform syntax checking". [elvish](https://elv.sh/ref/command.html): `-compileonly` "Parse and compile Elvish code without executing it". [nu-check](https://www.nushell.sh/commands/docs/nu-check.html) returns a boolean. `bash -n` is "read commands but do not execute them" and, as measured, is incomplete before bash 5.2: the primary gate for sh, bash, ksh and bats is therefore ShellCheck plus shfmt, with `dash -n` as the cheap independent POSIX parse.

### 9. File hygiene: CRLF, BOM, ASCII, exec bit, libraries

**CRLF.** Measured behaviours (`FX/hygiene/`, `FX/hyg-run.sh`, `FX/yash-run.sh`):

- `#!/bin/sh` + CR: the kernel looks for the interpreter `/bin/sh\r`. `./crlf.sh` from bash: `bad interpreter: No such file or directory`, **exit 126**; `dash -c ./crlf.sh`: `not found`, **exit 127**; `zsh -fc`: `bad interpreter`; Python `subprocess` raises `FileNotFoundError`. The map's "exit 127" is right for dash and wrong for bash (126).
- CR only in the body: bash 3.2 through 5.3 run the prefix, then die: `crlf-body` printed, then `line 7: syntax error: unexpected end of file`, **exit 2** (`matrix.sh bash`, all 8 versions). **Git Bash 5.2.15 on the Windows host runs the same file to completion, exit 0** (`matrix.sh win`): a Windows checkout with `core.autocrlf` works locally and fails in the Linux container.
- Git defaults: with `text` set and no `eol`, Windows checks out CRLF ([gitattributes](https://git-scm.com/docs/gitattributes): "the default is eol=crlf on Windows and eol=lf on all other platforms"). `*.sh text eol=lf` is therefore required, not cosmetic. Measured (`FX/gattr`, `FX/ga-drive.sh`): without attributes a CRLF file is indexed as `i/crlf`; with `*.sh text eol=lf`, `git add` normalizes it to `i/lf` while the working-tree copy stays `w/crlf` (so a worktree grep still catches it); an extensionless hook is untouched without `* text=auto eol=lf`.
- shfmt treats CRLF as a diff (`shfmt -d` exit 1); ShellCheck reports SC1017 (error) per line.

**BOM.** `./bom.sh` (`\xEF\xBB\xBF#!/bin/sh`): the kernel ignores the shebang, the invoking shell reports `line 1: <BOM>#!/bin/sh: No such file or directory`, the rest runs, **exit 0**. ShellCheck: SC1082 (error). `rg -l -a --no-unicode '\xEF\xBB\xBF'` **did not go red** (ripgrep removes a leading BOM when reading); `grep -e $'\xEF\xBB\xBF'` and `head -c3 | od` did.

**ASCII.** yash 2.52 in the container's POSIX locale cannot read a script with any non-ASCII byte, even in a comment: `yash: cannot read input: Invalid or incomplete multibyte or wide character`, exit 2; `LC_ALL=C.UTF-8` makes it pass; `LC_ALL=C` still fails (`FX/yash-run.sh`). dash, busybox ash 1.35/1.37, mksh, ksh93u+m, posh and bash accept it. Fleet: 21 of 31 `#!/bin/sh` authored scripts contain non-ASCII; **24 of those bytes-lines are not comments** (user-visible strings such as `warn "no checksums for $tag at $sha_path — skipping"`, www-setup@a251c3631047:scripts/gen-dist.sh:247), so the audit's "comments only" is wrong; the output prints an em dash and mojibakes on a C locale (`FX/quant/hyg.out`, `na.py`). Rule scope: `#!/bin/sh` scripts only (installers and login-shell snippets); bash scripts may carry UTF-8 comments (the gate's twin is green).

**Exec bit** (M-F-11). Fleet: of 186 authored scripts with a shebang, 93 are `100644` (ocx 80, grimoire 4, setup-grimoire 3, www-setup 3, find_ocx, ocx-sdk-python, rules_ocx 1 each); 11 have no shebang and 1 of those is executable on disk (`FX/quant/hyg.out`). The mode is read from the index, so it is stable on Windows checkouts. Fix: `git update-index --chmod=+x FILE`.

**Libraries** (M-F-14). Shape: extension `.sh` or `.bash`, no shebang, `# shellcheck shell=bash` (or `sh`/`dash`) as line 1, mode 100644, found through `source-path=SCRIPTDIR`. Without the directive ShellCheck raises SC2148 (error, survives `-S error`). Measured green: `FX/rc/lib/common.sh` and `FX/gate/lib/common.sh`; the gate's mode check flags a library committed 100755 (`FX/plants2/exec2`).

### 10. Bats, zsh and other dialects inside the gate

- **Bats (M-G-06).** ShellCheck parses `.bats` files and `#!/usr/bin/env bats` shebangs (`@test` blocks are understood: `run echo $FOO` inside `@test` gives SC2086; `setup() { cd "$DIR" ; }` gives SC2164 and a shfmt diff). shfmt detects `.bats` by extension and formats it with the bats dialect. `shfmt -ln posix` on the same file fails (`} can only be used to close a block`), so never force `-ln` in the gate. Both tools returned exit 0 on the clean `t/z.bats`. Fleet: the 10 `.bats` files are outside `git ls-files '*.sh'` (§6); the proposed list includes them.
- **zsh.** `shellcheck` rejects it (SC1071, error); `shfmt` parses it from 3.13.0 (`-ln zsh` is auto-detected from `.zsh` and `#!/bin/zsh`; the gate included `scripts/z.zsh` in the shfmt list and excluded it from ShellCheck). Syntax check: `zsh -fn`.
- **ksh/dash/busybox.** ShellCheck knows `sh`, `bash`, `dash`, `ksh`, `busybox` (SC1103 for anything else, `FX/relax/dia_*.sh`); `# shellcheck shell=dash` accepts `local`, `shell=busybox` accepts `local` and `[[`.

### 11. Embedded shell: workflows, Taskfiles, docs

- **Workflow `run:` blocks.** [actionlint](https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-shellcheck-integ) runs ShellCheck on `run:` scripts when the shell is `bash` or `sh` (default shell on Linux/macOS is bash, on Windows pwsh, so Windows steps are skipped) and disables SC1091, SC2050, SC2194, SC2154, SC2157, SC2043 because of `${{ }}` substitution. Measured on 1.7.12 with ShellCheck 0.11.0 (`FX/wf-drive.sh`, `wf-drive2.sh`): it reports SC2086 at default severity (`SC2086:info:1:6`); it **ignores the repo's `.shellcheckrc`** (SC2310/SC2312 only appear with `SHELLCHECK_OPTS='-o ...'`); `SHELLCHECK_OPTS=--severity=warning` hides SC2086; with no shellcheck on PATH or a nonexistent `-shellcheck=` it exits 0. Proposed step: `command -v shellcheck >/dev/null || exit 69` before `SHELLCHECK_OPTS='-o check-set-e-suppressed,check-extra-masked-returns,deprecate-which' actionlint` (measured: exit 69 without the tool; with the tool and the options it reports SC2310 and SC2312; clean workflow exit 0). ocx's own rule text embeds `SHELLCHECK_OPTS --severity=warning` (ocx `.claude/rules/subsystem-ci.md:130-132`, per [config-inventory.md](../shell-audit/config-inventory.md)); that is the `-S warning` defect again, one layer down.
- **Taskfile `cmds:`.** Task runs commands in its own interpreter with `set`/`shopt` options declared in the Taskfile ([schema](https://taskfile.dev/docs/reference/schema): `set: [errexit, nounset, pipefail]`, `shopt: [globstar]`); measured errexit is on by default (a failing `xargs shellcheck` aborted the task). ShellCheck cannot read YAML. Heuristic (not run): keep any command longer than one line out of YAML and in `scripts/*.sh`, which the gate covers; a Taskfile `cmds:` pipeline using `**` depends on the Taskfile's `shopt: [globstar]`.
- **Fenced docs blocks.** Not covered by this gate (the `code-docs` rule globs shell extensions but carries no shell checks, per the map). Heuristic only.

### 12. Chase: what the fleet's `-S warning` gate misses

Method: `FX/quant/quant.py` re-runs ShellCheck 0.11.0 with `--norc -s <dialect from shebang>` over the 197 authored shell-family files of the fleet classification (`fleet-shape/classified.json`: 166 bash, 31 sh), default severity, then with the three optional checks (`quant.out`):

```text
default findings 65  {'info': 44, 'style': 13, 'warning': 8}
hidden by -S warning 57 of 65 = 88%
hidden info codes: SC2086 x30, SC1091 x8, SC2162 x2, SC2012 x1, SC2016 x1, SC2019 x1, SC2018 x1
SC2086: 30 findings in 6 files:  oras-www 29, rules_ocx 1
warning+error by repo: oras-www 5, grimoire-indexer 2, creeptd-ng 1
added by the three optional checks: 260 (SC2312 191, SC2310 69) in 57 files, ocx 120, www-setup 83, setup-grimoire 14, oras-www 13
  ... visible at -S warning: 0
```

And restricted to the four repos that gate (ocx, grimoire, www-setup, setup-grimoire; `quant/ocxhid.py`): the only hidden finding is **8 SC1091 in ocx**; grimoire, www-setup and setup-grimoire have 0 findings at default severity; **0 SC2086**. Conclusion: `-S warning` currently costs the gated repos almost nothing at default severity, but (a) it makes the optional-check profile unusable (0 of 260), (b) it hides SC1091 (a real "your sources are not resolvable" signal that `source-path` fixes), and (c) the 30 SC2086 findings and 42 of the 57 hidden ones live in an ungated repo; the gate that would catch them is the missing one, not the severity. Adoption cost of the profile on the authored fleet: 65 default findings plus 260 from the optional checks (SC2312 191, SC2310 69; the map recorded 150/69 on a different file scope), concentrated in ocx (128), www-setup (83), oras-www (55).

Exemplar side: 4,387 SC2086 findings is 32% of all findings in the corpus ([exemplar-shape.md:42, 627](../shell-audit/exemplar-shape.md)); starship gates at `--severity=warning` (starship@d4d0459c5c24:.github/workflows/install-script.yml:19) and so cannot see them.

### 13. Fleet and exemplar defects (reported, not fixed)

Per owner Q6, no file was changed.

| Where | Defect | Reproducer |
|---|---|---|
| ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:38 | `shellcheck -S warning` hides SC2086/SC2162/SC1091 and kills any optional check | `FX/sev/drive.sh`-style run; `FX/sevflag-drive.sh` finds the line |
| same :21, :23-28 | `git ls-files '*.sh'` only; `FILES` built with `tr '\n' ' '` (breaks on spaces) | `FX/disc-final.sh` row 1 |
| same :48 | `shfmt -d -i 4 -ci` bypasses EditorConfig (no `.editorconfig` shell section exists) | `FX/ecdrive.sh` |
| grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10-21 | `shellcheck not installed - skipping`, exit 0; `echo "$files" \| xargs` splits on spaces; no `.bats` | `FX/task-drive.sh`: exit 0 with the tool absent |
| setup-grimoire@1259e35b2550:Taskfile.yml:25-27 | hand-maintained file list, `-S warning`, `.bats` and any new helper outside | `FX/gap-drive.sh`: 6 of 8 tracked shell files unlisted by glob |
| www-setup@a251c3631047:taskfiles/ocx.taskfile.yml (GLOB `*.sh`) | 7 `.bats` and 2 `.bash` unlinted | `FX/gap-drive.sh` |
| starship@d4d0459c5c24:.github/workflows/install-script.yml:19, :34 | `install/**/*.sh` under bash without globstar = `install/*/*.sh`: **`install/install.sh`, the product's installer, is never linted** | in the clone: `bash -c 'echo install/**/*.sh'` omits `install/install.sh` |
| docker-install@2b32480025b2:.github/workflows/ci.yml:29 | `shellcheck ... **/*.sh` skips `install.sh`, `rootless-install.sh`, `diff.sh` | `bash -c 'echo **/*.sh'` prints only `scripts/get-version.sh` |

## Normative guidance candidates

Verification shape: every grep names a directory operand, `-r` where recursive, quoted `--include='*.sh'`, one `-e` per alternative, no command substitution. The **output is the violation; empty output means pass**. When a pipeline ends in `xargs -0 -r grep`, a clean run exits 123 (xargs maps grep's exit 1), so read the output, not the status. "RUN" states whether the check was watched red on a plant and green on its twin (details under Verification runs).

| ID | Rule | Rationale | How a reviewer verifies | RUN |
|---|---|---|---|---|
| SH-GATE-01 | The gate runs `shellcheck FILES` at default severity. No `-S`, `--severity`, or `SHELLCHECK_OPTS` carrying severity, in any task, workflow, Makefile or script. | SC2086 and SC2162 are info; every optional check is info; `-S warning` makes them invisible (0 of 260). | `grep -rn --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --include='*.mk' -e 'shellcheck.* -S' -e 'shellcheck.*--severity' -e 'SHELLCHECK_OPTS.*severity' .` | yes, `FX/sevflag/` |
| SH-GATE-02 | The repo root has the shipped `.shellcheckrc` (§2); it has no `severity=`, no `shell=`, no `disable=all`. | `severity=` is silently ignored; `shell=` overrides every shebang repo-wide. | `grep -rn --include='.shellcheckrc' --include='shellcheckrc' -e '^severity' -e '^shell=' -e '^disable=all' .` | yes |
| SH-GATE-03 | Every `enable=` name exists in `shellcheck --list-optional` of the pinned version, and a plant proves each fires. | A typo is accepted silently on 0.9.0, 0.10.0, 0.11.0. | `shellcheck --norc -o check-set-e-suppressed,check-extra-masked-returns,deprecate-which -f gcc PLANT` must print SC2310, SC2312 and SC2230 (the gate repo carries the plant `checks/optional-plant.sh`); a missing code means a dead or mistyped name | yes (accepted-silently observed; plant fires) |
| SH-GATE-04 | No nested `.shellcheckrc`. If one is unavoidable it repeats every line of the root profile. | ShellCheck reads the nearest rc only; a nested rc dropped `external-sources`, `source-path` and all `enable=`. | `find . -mindepth 2 -name '.shellcheckrc' -not -path './.git/*'` prints the nested files; each must contain all five profile lines | yes, `FX/rc/nested/` |
| SH-GATE-05 | Every `# shellcheck disable=CODE` has a same-line `# reason` (rc lines too). | 1,185 exemplar directives, 12.5% justified; stale ones are invisible. | `grep -rn --include='*.sh' --include='*.bash' --include='*.bats' -e 'shellcheck disable=[A-Za-z0-9,-]*[[:space:]]*$' .` | yes, `FX/dis/` (a preceding-line comment is also flagged: same-line is the rule) |
| SH-GATE-06 | SC2155, SC2164, SC2162, SC2115, SC2068 are never disabled; SC2086 and SC2046 never in an rc or file-wide. | They are the bug classes the gate exists for. | `grep -rn --include='*.sh' --include='.shellcheckrc' -e 'disable=.*SC2155' -e 'disable=.*SC2164' -e 'disable=.*SC2162' -e 'disable=.*SC2115' -e 'disable=.*SC2068' -e 'disable=SC2086' -e 'disable=SC2046' .` | yes, `FX/misc/` |
| SH-GATE-07 | Allowed relaxations are exactly the table in §3, each with the stated reason pattern. | Central relaxations in mise/shellspec/docker are SC2317/SC1091/SC2016; the rest of the 1,185 are noise. | review each `disable=` against the §3 table; `shellcheck` stays clean | no, reading heuristic |
| SH-GATE-08 | The gate exits non-zero when `git`, `shellcheck` or `shfmt` is missing (69), when the rc/editorconfig is missing (78), and when no shell files are found (66). | A skipped gate is a passed gate (grimoire, actionlint). | run the gate with `PATH` stripped of the tool: non-zero | yes, `FX/missing-tool-drive.sh` |
| SH-GATE-09 | No gate command is followed by `\|\| true`, `;` plus `exit 0`, or `-` (ignore) prefixes. | silences the failure. | `grep -rnF --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' -e '\|\| true' .` scoped to gate files | yes |
| SH-GATE-10 | File discovery is `git ls-files -z --cached --others --exclude-standard \| xargs -0 -r shfmt -f` (plus pathspec excludes). | `'*.sh'` finds 5 of 14 on the discovery fixture; `shfmt -f .` walks gitignored trees. | `grep -rn --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' -e "ls-files '\*\.sh'" -e 'find \. -name' .` in gate files prints violations | yes, `FX/discovery/` |
| SH-GATE-11 | Use `shfmt -f`, never `-f=0`, on shfmt 3.13.1. | 3.13.1 passes non-shell explicit files through `-f=0`. | `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' -e 'shfmt -f=0' -e 'shfmt.* -f=0' .` | yes, `FX/fdrive.sh` |
| SH-GATE-12 | Exclusions are git pathspecs in the discovery command; shfmt `ignore = true` additionally needs `--apply-ignore` in the gate. | explicit file arguments bypass `ignore = true`. | plant a violation under the excluded dir: green; remove the pathspec: red | yes, `FX/plant-final.sh` |
| SH-GATE-13 | The gate passes no shfmt parser/printer flag (`-i`, `-ci`, `-bn`, `-s`, `-ln`, `-sr`, `-kp`, `-fn`, `-bl`, `-mn`, `-p`). | any such flag disables EditorConfig. | `grep -rnE --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' -e 'shfmt[^#]* -(i\|ci\|bn\|s\|ln\|sr\|kp\|fn\|bl\|mn\|p)( \|=)' .` (in practice one `-e` per flag: `-e 'shfmt.* -i '`, `-e 'shfmt.* -ci'`, ...) | yes, `FX/ecdrive.sh` |
| SH-GATE-14 | `.editorconfig` carries `root = true`, the `[*.{sh,bash,bats,ksh}]` and `[[shell]]` sections of §5, key spelling `switch_case_indent`. | `case_indent` is ignored by 3.14.1; `[[shell]]` is how extensionless scripts get the style. | `shfmt -d` over a compliant 4-space+case-indent plant is clean and over a 2-space plant lists the file | yes |
| SH-GATE-15 | shfmt is pinned from the toolchain at 3.13.1 or newer; the gate uses `-d`, not `-l`, unless the pin is >= 3.13.0. | 24.04 apt 3.8.0 and 26.04 apt 3.12.0 exit 0 from `-l`. | `grep -rn --include='ocx.toml' --include='*.toml' -e 'shfmt' .` shows a pinned ref | yes (exit codes by version) |
| SH-GATE-16 | ShellCheck is pinned from the toolchain (one version in CI and on laptops); never the distro package across an image matrix. | 0.9.0 / 0.10.0 / 0.11.0 produce different findings (SC2329 new, SC3013 gone). | `grep -rn --include='ocx.toml' --include='*.toml' -e 'shellcheck' .` shows a pinned ref | yes (version diff observed) |
| SH-GATE-17 | Every shell family in the repo has a parse-only gate: sh/bash/ksh/bats `shellcheck` + `shfmt FILE >/dev/null`; zsh `zsh -fn`; fish `fish --no-execute`; nu `nu -c 'if not (nu-check F) { exit 1 }'`; elvish `elvish -compileonly`; pwsh `Parser::ParseFile` with the `Count` test. | each went red on a planted parse error. | the seven commands of §8 on a broken file exit non-zero | yes, `FX/parse-errors/` |
| SH-GATE-18 | Never rely on `bash -n` as the parse gate; never rely on `nu --ide-check` or bare `nu-check` exit codes. | `bash -n` exit 0 on a broken array literal for bash 3.2-5.1; nu exits 0. | `bash -n` on `arr=(1 2` under bash 5.1: exit 0 | yes, `FX/bashn-drive.sh` |
| SH-GATE-19 | `.gitattributes` has `* text=auto eol=lf` or at least `*.sh text eol=lf`, `*.bash`, `*.bats`, `*.ksh`, `*.zsh`. | Windows checkouts default to CRLF; Linux bash dies on the body. | `git ls-files --eol -- '*.sh'` shows no `i/crlf`; `git ls-files --eol` over the repo shows no `w/crlf` for shell files after checkout | yes, `FX/gattr` |
| SH-GATE-20 | No CR bytes in any shell file. | exit 126/127 on a CR after the shebang; syntax error mid-file. | `grep -rlI --include='*.sh' --include='*.bash' --include='*.bats' -e $'\r' .` (or `rg -l --glob '*.sh' '\r' .`; or SC1017) | yes |
| SH-GATE-21 | No UTF-8 BOM in any shell file. | line 1 becomes "not found"; the rest runs. | `grep -rlI --include='*.sh' -e $'\xEF\xBB\xBF' .`; or SC1082. **Not** `rg` (strips the BOM). | yes (rg did not go red) |
| SH-GATE-22 | `#!/bin/sh` scripts are ASCII only (comments too). | yash 2.52 in a POSIX locale refuses any non-ASCII byte; installers run there. | `grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . \| xargs -0 -r grep -Hn -e '[^ -~[:space:]]'` with `LC_ALL=C` in the environment | yes, `FX/hygiene/` |
| SH-GATE-23 | Git mode matches line 1: shebang => 100755; no shebang => 100644. | 93 of 186 fleet scripts are 100644; libraries must not be directly runnable. | the gate's mode loop; one-liner: `git ls-files -s -- '*.sh'` lists modes, then check line 1 | yes, `FX/plants2/exec1`, `exec2` |
| SH-GATE-24 | A sourced library has an extension (`.sh`/`.bash`), no shebang, `# shellcheck shell=...` on line 1, mode 100644. | no tool finds an extensionless, shebang-less file; SC2148 otherwise. | `shellcheck FILE` clean; `shfmt -f` lists it | yes, `FX/rc/lib`, `FX/discovery/lib/helpers` (unreachable) |
| SH-GATE-25 | Bats files are in the gate (`.bats` extension or `#!/usr/bin/env bats`); no `-ln` flag. | 10 fleet `.bats` files are linted by nothing. | `shfmt -f` list contains every `*.bats` | yes |
| SH-GATE-26 | zsh files get `shfmt` and `zsh -fn` but are excluded from `shellcheck`. | SC1071 error on zsh. | gate with a `.zsh` file stays green | yes |
| SH-GATE-27 | Workflow `run:` blocks are linted by `actionlint` with `SHELLCHECK_OPTS='-o check-set-e-suppressed,check-extra-masked-returns,deprecate-which'` and a `command -v shellcheck` precheck. | actionlint ignores the rc and exits 0 without shellcheck. | run with `PATH` lacking shellcheck: non-zero | yes, `FX/wf-drive2.sh` |
| SH-GATE-28 | No `**` in a gate glob; no `*.sh` glob in a gate at all. | without globstar `install/**/*.sh` skips `install/install.sh` (starship), `**/*.sh` skips root scripts (docker-install). | `grep -rn --include='*.yml' --include='*.yaml' --include='Makefile' -e 'shellcheck.*\*\*' -e 'shfmt.*\*\*' .` | yes, `FX/misc/` |
| SH-GATE-29 | Comments never begin `# shellcheck ` followed by prose. | parsed as a directive: SC1072/SC1073 break the file. | `shellcheck FILE` exit 1 with SC1073 | yes |
| SH-GATE-30 | No `disable=` of SC2039, SC2230, SC3013 (retired or opt-in). | ShellCheck never reports stale suppressions; SC2039 was split into SC3xxx in 0.7.2. | `grep -rn --include='*.sh' -e 'shellcheck disable=.*SC2039' -e 'shellcheck disable=.*SC2230' -e 'shellcheck disable=.*SC3013' .` | yes |
| SH-GATE-31 | The agent-tell set (below) returns no output over authored scripts. | the set is what agents write that ShellCheck does not flag. | the twelve greps, SH-GATE-31a..l | yes, `FX/tells/` |
| SH-GATE-32 | Gate commands in a Taskfile or workflow stay one line per tool; anything longer lives in a `scripts/*.sh` file. | YAML-embedded bash is unlintable by shellcheck. | named reading heuristic: `grep -rn -c` of lines in a `cmds:` block | no |
| SH-GATE-33 | A new rc is never authored in `.editorconfig` with `shellcheck.*` keys until a released ShellCheck supports them. | master-only; ignored by 0.11.0. | `grep -rn --include='.editorconfig' -e 'shellcheck\.' .` | yes (key ignored on 0.11.0) |

**Gate block for the index (M-O-01), verbatim:** copy the 70-line script of §7 to `scripts/shell-gate.sh`; the index carries only the invocation `bash scripts/shell-gate.sh`, the rule "no new disable without a same-line reason, no `|| true` to silence a failure, no `-S`", and the exits 69 / 78 / 66.

**Agent-tell grep set (M-O-03), each watched red on `FX/tells/red/` and empty on `FX/tells/green/`.** Run from the directory under review; output is the violation:

```sh
grep -rn  --include='*.sh' -e 'echo -[neE]' .                                           # a. echo -e / -n / -E
grep -rnw --include='*.sh' -e which .                                                   # b. which   (also SC2230 via deprecate-which)
grep -rn  --include='*.sh' -e 'readlink -f' .                                           # c. readlink -f (Linux only)
grep -rn  --include='*.sh' -e 'sed -i[[:space:]]' -e 'sed --in-place' .                 # d. sed -i without suffix (BSD needs one; portable is -i.bak)
grep -rn  --include='*.sh' -e '[ "=]/tmp/' .                                            # e. literal /tmp/
grep -rnw --include='*.sh' -e eval .                                                    # f. eval
grep -rn  --include='*.sh' -e 'source <(' -e '\. <(' .                                  # g. source <( / . <(
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | xargs -0 -r grep -Hn -e '^[[:space:]]*function '        # h. function keyword in sh
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | xargs -0 -r grep -Hn -e '\[\['                           # i. [[ in sh
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | xargs -0 -r grep -Hn -e "[$]'"                          # j. $'..' in sh
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | xargs -0 -r grep -Hn -e '[A-Za-z_]=('                    # k. arrays in sh
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | xargs -0 -r grep -Hn -e '^[[:space:]]*set .*pipefail'    # l. unguarded pipefail in sh
```

ShellCheck covers h-l for sh files (SC2113 `function`, SC3010, SC3003, SC3030, SC3040, SC3046 `source`, SC3001 process substitution) but does **not** flag a-g in bash: `echo -e`, `readlink -f`, `sed -i`, `eval` and `/tmp/` all passed ShellCheck 0.11.0 clean on `FX/tells/red/tells_any.sh`, and `which` appears only with `deprecate-which` (SC2230).

## Verification runs

Each entry: fixture, command, exit on the violation, exit on the compliant twin. "FX" is `/home/mherwig/.cache/research-lang/shell-tools/fixtures/lint-format-profile`. Not-red items are marked.

**V01 Severity table (a).** `FX/sev/drive.sh` -> `FX/sev/sevrun.sh sev.sh [opts]`. Default: SC2086 info, SC2046 warning, SC2068 error, SC2155 warning, SC2162 info, SC2164 warning (exit 1). `-S warning`: SC2086 and SC2162 disappear; `-S error`: only SC2068. `sev-e.sh -o check-set-e-suppressed,check-extra-masked-returns,deprecate-which`: SC2310 info, SC2312 info, SC2230 info; with `-S warning` the same file prints nothing. Red/green: severity filter removes the planted info findings (red -> green).

**V02 Severity flags in gate files.** `FX/sevflag-drive.sh`.
```text
grep -rn --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --include='*.mk' -e 'shellcheck.* -S' -e 'shellcheck.*--severity' -e 'SHELLCHECK_OPTS.*severity' .
red  (copy of ocx shell.taskfile.yml, starship line, env.yml): exit 0  ./shell.taskfile.yml:38:    cmd: shellcheck -S warning {{.FILES}}
                                                                       ./install-script.yml:1:  run: shellcheck --severity=warning install/**/*.sh
                                                                       ./env.yml:2:      SHELLCHECK_OPTS: "--severity=warning"
green: exit 1, no output
grep -rn --include='.shellcheckrc' --include='shellcheckrc' -e '^severity' -e '^shell=' -e '^disable=all' .
red: exit 0  ./.shellcheckrc:1:severity=warning        green: exit 1, no output
```

**V03 rc resolves SC1091.** `FX/rcdrive.sh` (see §2): `--norc` exit 1 with SC1091; proposed rc exit 0; from cwd `/` exit 0; dynamic `${LIBDIR}` path exit 1 (needs a directive).

**V04 Nested rc replaces the root rc; `severity=`, `shell=` and EditorConfig keys.** `FX/rcdrive2.sh`: nested -> SC1091 returns, no SC2310 (exit 1); `severity=warning` in rc -> all six findings still printed; `shell=bash` -> SC3030/SC3010 vanish (without rc: 3 findings); `.editorconfig shellcheck.disable=SC2086` -> SC2086 still printed. All as described in §2: red = the rc did not do what a reader expects.

**V05 Unknown optional name accepted (did NOT go red).** `FX/vdrive2.sh`: `shellcheck --norc -o no-such-check sev-e.sh` prints only SC2005, exit 1, no error, on 0.9.0, 0.10.0, 0.11.0. A typo cannot be caught by the exit code; SH-GATE-03 uses a plant instead.

**V06 Discovery.** `FX/disc-final.sh`, `FX/disc-drive.sh`, `FX/disc-drive2.sh` (§6 table). Fleet read-only comparison `FX/gap-drive.sh`.

**V07 Missing tool.** `FX/missing-tool-drive.sh` (proposed gate: 69, 69, 69, green 0) and `FX/task-drive.sh` (grimoire gate verbatim under Task 3.53.1: exit 0 with shellcheck missing, 0 with both missing, 201 with a finding). Red for the *old* gate = exit 0 with the tool absent: observed. Also: no rc -> 78; no files -> 66 (`FX/plant-final.sh`).

**V08 Gate plants.** `FX/plant-final.sh` (13 reds, 4 green twins; list in §7).

**V09 Hygiene detectors.** `FX/hyg-detect.sh` (dirs `red/`, `green/` under `FX/hygiene/`):
```text
grep -rlI --include='*.sh' -e $'\r' .                      red: exit 0 ./crlfbody.sh ./crlf.sh        green: exit 1
rg -l --glob '*.sh' -e '\r' .                              red: exit 0 ./crlf.sh ./crlfbody.sh        green: exit 1
shellcheck --norc -f gcc -- *.sh   (SC1017 per CR line)    red: exit 1 crlf.sh:1:10: error: Literal carriage return [SC1017]   green: exit 0
grep -rlI --include='*.sh' -e $'\xEF\xBB\xBF' .            red: exit 0 ./bom.sh                       green: exit 1
head -c3 FILE | od -An -tx1  (= ef bb bf)                 red: bom.sh                                 green: empty
shellcheck ... bom.sh   (SC1082 error)                     red: exit 1                                 green: exit 0
rg -l -a --no-unicode --glob '*.sh' -e '\xEF\xBB\xBF' .    red: exit 1, EMPTY output  <- did NOT go red (ripgrep strips the BOM)
LC_ALL=C grep -rnI --include='*.sh' -e '[^ -~[:space:]]' . red: exit 0 (bom.sh, nonascii.sh, nonascii-comment.sh)   green dir: flags bash-nonascii.sh (a bash comment) -> restrict to sh-shebang files:
grep -rlZ --include='*.sh' -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' . | LC_ALL=C xargs -0 -r grep -n -e '[^ -~[:space:]]'
                                                           red: output nonascii-comment.sh:2, nonascii.sh:2,3   green: empty (exit 123 from xargs)
rg -n --glob '*.sh' -e '[^\x00-\x7F]' .                    red: exit 0 (lists)                          green: flags the bash comment (same scope caveat)
```

**V10 Runtime behaviour of CRLF/BOM/non-ASCII** (support for the rules): `FX/hyg-run.sh`, `FX/yash-run.sh`, `matrix.sh bash red/crlfbody.sh` (8 versions, exit 2), `matrix.sh win winbody.sh` (Git Bash 5.2: exit 0), `matrix.sh posix hygiene/nonascii.sh` (yash 2.52: exit 2, others 0).

**V11 Parse errors.** `FX/pe-drive.sh`, `FX/pe-drive2.sh`, `FX/bashn-drive.sh`; table in §8. Not-red items reported: `bash -n` on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1 (exit 0 on an unterminated array literal), `nu --ide-check` and bare `nu-check` (exit 0). `fish --no-execute` is red with exit 127.

**V12 shfmt behaviours.** `FX/ecdrive.sh` (flags-override and `[[shell]]` on 3.13.0, 3.13.1, 3.14.1), `FX/vendortest.sh` (`-l` exit by version: 3.12.0 -> 0, 3.13.0 -> 1, 3.14.1 -> 1; `-d` -> 1 on all; `--apply-ignore`), `FX/fdrive.sh` (`-f=0`: 3.13.0 `a.sh`, **3.13.1 `.editorconfig .gitattributes a.sh`**, 3.14.1 `a.sh`), `FX/ln-drive.sh` (dialect table).

**V13 Directive hygiene.** `FX/dis-drive.sh`:
```text
grep -rn --include='*.sh' -e 'shellcheck disable=[A-Za-z0-9,-]*[[:space:]]*$' .
  red: ./noreason.sh:3:# shellcheck disable=SC2086         green (reason on the line): exit 1, empty
  (preceding-line reason, green/preceding.sh, is flagged too: same-line is the rule)
grep -rn --include='*.sh' -e 'shellcheck disable=.*SC2039' -e 'shellcheck disable=.*SC2230' -e 'shellcheck disable=.*SC3013' .
  red: ./stale.sh:2:# shellcheck disable=SC2039 # local is non-POSIX       green: exit 1, empty
grep -rn --include='*.sh' -e 'shellcheck disable=SC[0-9]\{5,\}' -e 'shellcheck disable=SC[0-9]\{1,3\}[^0-9]' .
  red: ./typo.sh:3:# shellcheck disable=SC20865 ...                         green: exit 1, empty
```
`FX/misc-drive.sh`: never-list grep red on `never.sh`/`.shellcheckrc`, empty on `green`; `grep -rnF ... -e '|| true' .` red `ci.yml:1-2`, green empty; `-e 'shellcheck.*\*\*' -e 'shfmt.*\*\*'` red `ci.yml:3-4`, green empty; `# shellcheck cannot parse zsh` red exit 1 (SC1073, SC1072), `# note: ...` exit 0.

**V14 Agent-tell greps.** `FX/tells-drive.sh`: twelve checks, 12 red on `red/` (exit 0 with the matching line), 12 empty on `green/` (exit 1, or 123 through xargs).

**V15 actionlint.** `FX/wf-drive.sh`, `FX/wf-drive2.sh`: default run reports SC2086 info; repo rc ignored; `SHELLCHECK_OPTS=--severity=warning` hides SC2086; `SHELLCHECK_OPTS='-o ...'` shows SC2310/SC2312; no shellcheck or `-shellcheck=/nonexistent` -> **exit 0 on a workflow with SC2086** (red for the old gate); wrapper `command -v shellcheck` -> 69; clean workflow -> 0.

**V16 Fleet measurements.** `FX/quant/quant.out`, `fmt.out`, `hyg.out`, `ocxhid.py` (re-runnable with `bash -c 'python3 -I FILE'`).

**V17 Git attributes.** `FX/ga-drive.sh`: CRLF file indexed `i/crlf` with no attributes; with `*.sh text eol=lf`, `i/lf w/crlf attr/text eol=lf`; hooks need `* text=auto eol=lf`.

**Count.** Distinct verifications watched red on a plant with a green twin (or a documented not-red): V01 (2), V02 (2), V03 (1), V04 (4), V06 (4 lists), V07 (3), V08 (11 reds), V09 (7 red, 1 not-red), V11 (7 families + 2 not-red), V12 (4), V13 (6), V14 (12), V15 (4), V17 (1). Counted in the receipt as the number of command-lines that ended red on a plant: 65.

## Exemplar evidence

| Candidate | Satisfy | Violate or contradict |
|---|---|---|
| SH-GATE-01 (no `-S`) | acme.sh gates at default severity; its shfmt step is `-l -w -i 2` + `git diff --exit-code` (acmesh-official/acme.sh@807da6498377:.github/workflows/shellcheck.yml:36-38); docker-install runs `shellcheck -e SC2181 -e SC2089` (docker-install@2b32480025b2:.github/workflows/ci.yml:29) | starship `shellcheck --severity=warning` (starship@d4d0459c5c24:.github/workflows/install-script.yml:19); atuin passes severity through `SHELLCHECK_OPTS` (atuinsh/atuin@56525ac6a7a9:.buildkite/scripts/shellcheck.sh:5) |
| SH-GATE-02/04 (central rc) | mise `.shellcheckrc` six `disable=` lines and no profile keys (jdx/mise@19e8c8f0d03d:.shellcheckrc:1-7); shellspec one line (shellspec/shellspec@f2d13f991885:.shellcheckrc:1) | neither carries `external-sources` or `source-path`; neither has a reason on its disables; 2 of 39 repos have an rc ([exemplar-shape.md:43](../shell-audit/exemplar-shape.md)) |
| SH-GATE-05 (reasoned directives) | rustup-init.sh:3 `disable=SC2039  # local is non-POSIX`; atuin `bash-preexec.sh:555` SC2178 with explanation ([exemplar-shape.md:366](../shell-audit/exemplar-shape.md)) | 1,185 directives, 148 justified (12.5%); rustup-init.sh:3 is the stale-code case (SC2039 retired in 0.7.2) |
| SH-GATE-10/28 (no globs) | atuin's script reproduces action-shellcheck's discovery with `find ... -print0` including extensionless shebang files (atuinsh/atuin@56525ac6a7a9:.buildkite/scripts/shellcheck.sh:1-27) | starship `install/**/*.sh` skips `install/install.sh`; docker-install `**/*.sh` skips `install.sh`, `rootless-install.sh`, `diff.sh` (measured above) |
| SH-GATE-13/14 (EditorConfig style) | mise `.editorconfig` `[{*.sh,.mise/tasks/**/*,e2e/**/*,*.pkl}]` indent 2 + `switch_case_indent` + `simplify`, 0 dirty of 1,396 files; fzf `[*.{sh,bash,fish}]` ([exemplar-shape.md:440-444](../shell-audit/exemplar-shape.md)) | zoxide, direnv, acme.sh pass flags (`--indent=4 --language-dialect=posix --simplify`, `-i 2`) so their EditorConfig is bypassed; acme.sh pins shfmt 3.1.2 by URL, bats-core 3.5.1 (3.13.1 reformats 48 files) |
| SH-GATE-15 (pinned shfmt) | acme.sh and bats-core pin by URL | starship installs `curl -sS https://webi.sh/shfmt \| sh` (unpinned, starship@d4d0459c5c24:.github/workflows/install-script.yml:30) |
| SH-GATE-17 (parse each family) | zoxide pipes emitted code through bash, dash, shellcheck, shfmt, fish, elvish, nu, pwsh in cargo tests (ajeetdsouza/zoxide@86b443cffcd7:src/shell.rs:57-229, [exemplar-shape.md:437, 612](../shell-audit/exemplar-shape.md)) | |
| SH-GATE-22 (ASCII) | acme.sh and deno_install avoid non-ASCII (not re-measured) | the fleet's 21 of 31 `#!/bin/sh` scripts (www-setup 11, grimoire 5) |
| SH-GATE-27 (embedded) | k3s sets `shellcheck: false` for actionlint explicitly (k3s-io/k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:20) | |
| Runner shellcheck | GitHub images: ubuntu-22.04 0.8.0, 24.04 0.9.0, 26.04 0.11.0 (actions/runner-images@8197087fc536:images/ubuntu/Ubuntu2204-Readme.md:356, Ubuntu2404-Readme.md:311, Ubuntu2604-Readme.md:295) | no shfmt on any image |

## AI-agent angle

| Characteristic mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Adds `shellcheck -S warning` (or `--severity=warning`) "to reduce noise" | the pattern is in training data (ocx's own gate, starship) | SH-GATE-01 grep |
| Puts `severity=warning` or `shell=bash` into `.shellcheckrc` | both look like rc keys; the first is ignored, the second overrides shebangs | SH-GATE-02 grep |
| Writes `shfmt -i 2 -ci -d` in the gate "to match Google style" | flags override the repo's `.editorconfig` | SH-GATE-13 grep; `shfmt -d` with no flags |
| Lints with `git ls-files '*.sh'` or `shellcheck **/*.sh` | globs feel complete | SH-GATE-10/28 greps; compare with `shfmt -f` |
| Adds `|| true` or an "if not installed, skip" branch so the gate "works everywhere" | local convenience | SH-GATE-08/09; run with the tool off PATH |
| Writes `# shellcheck disable=SC2086` with no reason, or on SC2155/SC2164 "to silence" | silences the finding that was the point | SH-GATE-05/06 greps |
| Comments `# shellcheck is happy here` (prose starting with `shellcheck`) | natural language | `shellcheck FILE` exit 1 (SC1072/SC1073) |
| Keeps `disable=SC2039` for `local` | pre-2021 training data | SH-GATE-30 grep |
| Types `enable=check-set-e-suppresed` | silent no-op | SH-GATE-03 plant |
| Uses `shfmt -f=0` with `xargs -0` "for safety" | correct in theory | `FX/fdrive.sh`; fails on exactly 3.13.1 |
| Expects `case_indent = true` / `language_dialect` in EditorConfig (from master docs) | newest man page | key ignored by 3.14.1; `shfmt -d` on a case-indented file |
| Uses `bash -n` as the syntax gate | the folk answer | SH-GATE-18 plant on bash <= 5.1 |
| Uses `nu --ide-check` or `nu-check` exit code as the gate | assumes non-zero on error | wrapper in §8 |
| Uses `fish --no-execute` result as 0/1 | fish returns 127 | any non-zero is a failure |
| Writes a script in CRLF (Windows editor, `\r\n` in a heredoc) | agents on Windows, templates | SH-GATE-19/20 |
| Pastes a BOM'd file from PowerShell `Out-File` or `Set-Content -Encoding UTF8` | Windows PowerShell 5.1 emits a BOM with `-Encoding UTF8` | SH-GATE-21 grep/SC1082 |
| Uses em dashes in `#!/bin/sh` comments and messages | typographic habit | SH-GATE-22 grep |
| Commits a script `100644` with a shebang (created by `cat > file`) | no chmod in the tool call | SH-GATE-23 |
| Creates `bin/tool` or `hooks/pre-commit` extensionless "so it is on PATH" | convention | rules cannot load on it (owner Q8); `shfmt -f` still finds it by shebang |
| Writes `echo -e`, `which`, `readlink -f`, `sed -i`, `source <(...)`, `eval`, `/tmp/x` (and `function f`, `[[`, arrays, `$'..'`, `pipefail` under `#!/bin/sh`) | bash-on-Linux habits | SH-GATE-31 greps a-l; ShellCheck catches only h-l |
| In zsh (the owner's login shell), runs `shellcheck $opts` unquoted and gets one argument | zsh does not word-split (this research hit it twice while building fixtures) | quote nothing: use a `bash` driver script (`FX/*-drive.sh`) |

## Contested / evolving

- **`-S warning` versus default severity.** ocx's rule text, starship and setup-grimoire use `-S warning`; the wiki and this work say default plus a curated rc. The noise argument is real (65 default findings on 197 files is 0.33 per file); the rebuttal is that 8 of them are SC1091, which `source-path` removes, and the rest are single-digit counts in four repos. Trend: ShellCheck 0.11.0 already demoted SC2002 and split SC2329 out of SC2317 to cut noise rather than push users to `-S`.
- **Per-site SC2086/SC2046 directives.** The map says never. 64 SC2086 and 11 repos with a SC2086 disable in the corpus show practice disagrees; a deliberate split (`set -- $flags`) is a valid reason when stated. Candidate: allow per-site with a reason containing the word "split"; not decided here (owner call).
- **Same-line reasons versus preceding-line reasons.** The [Directive wiki](https://github.com/koalaman/shellcheck/wiki/Directive) recommends the preceding comment for long reasons. SH-GATE-05 requires the same line because it is the only form a grep can check; a long reason can still be one long line.
- **How much of SC2310/SC2312 to mandate.** 260 findings on the authored fleet (191 + 69; the map recorded 150 + 69). Group errexit may demote them; this item only ships the keys. As of 2026-10-11 the check descriptions are marked "subjective" in the wiki.
- **shfmt `.sh` implies POSIX.** The man page says so; 3.13.0, 3.13.1 and 3.14.1 parse a shebang-less `.sh` file with an array as bash. Unreported upstream here; treat the doc as aspirational.
- **EditorConfig key names.** Master documents `case_indent` and `language_dialect`; 3.14.1 only honors `switch_case_indent` and `shell_variant`. A future 3.15 will probably accept both (main.go keeps the old spellings with a `TODO(v4)`); revisit when released.
- **ShellCheck release stall.** Last release 0.11.0 on 2025-08-04, master has unreleased changes (EditorConfig `shellcheck.*` keys, `--files-from`, SC3040 following POSIX.1-2024, SC3003 removed, SC2337/SC2338) and a commit on 2026-10-09. Pin to 0.11.x; do not write rc that needs master.
- **`bash -n`.** Behaviour changed in 5.2 for at least one construct; the contributing change was not located in a changelog (searched bash NEWS and COMPAT in the audit scratch); treated as "measured, cause unknown".
- **ubuntu-latest and the 26.04 runner image.** If the runner label moves to 26.04, apt ShellCheck goes from 0.9.0 to 0.11.0 and shfmt from 3.8.0 to 3.12.0 with it; a gate that uses the runner apt tools changes behaviour on that date (migration date unverified: not read from a primary source).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md | ShellCheck CHANGELOG (git master, 2026-10-11 read) | 0.7.0 - unreleased | version of every code, optional check, directive; unreleased EditorConfig and `--files-from` |
| https://github.com/koalaman/shellcheck/wiki/Directive | ShellCheck wiki: directives and `.shellcheckrc` (local clone koalaman/shellcheck.wiki@0b4dfe7bf9dc) | 0.11.0 | search order, keys, `SCRIPTDIR`, placement rules |
| https://github.com/koalaman/shellcheck/wiki/Optional | ShellCheck wiki: optional checks | 0.11.0 | the list, "not `-o all`" warning |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/shellcheck.1.md | ShellCheck man page source | master | `-S`, `-o`, exit codes, RC FILES, EDITORCONFIG, `SHELLCHECK_OPTS` |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Analytics.hs | ShellCheck checker source | master | per-code severity (`warn`/`err`/`info`), SC2164 `hasErrexit` |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Checks/Commands.hs | ShellCheck command checks source | master | SC2155, SC2230, SC2115 severity |
| https://github.com/koalaman/shellcheck/wiki/SC2086 (and SC2046, SC2068, SC2155, SC2162, SC2164, SC2310, SC2312, SC1091, SC1017, SC1082, SC2039, SC2230) | per-code wiki pages (local clone) | 0.11.0 | correct/incorrect examples; optional-check enabling text |
| https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd | shfmt man page source | master (post 3.14.1) | `-ln auto`, EditorConfig, `--detect`, `--apply-ignore`, flags-override |
| https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md | shfmt/mvdan-sh CHANGELOG | 3.8.0 - 3.14.1 | `-l` exit code (3.13.0), zsh (3.13.0), `--detect` (3.14.0), dash shebang (3.14.0) |
| https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/main.go | shfmt CLI source | master | `useEditorConfig`, `propsOptions`, key spellings, ignore handling |
| https://git-scm.com/docs/gitattributes | git attributes reference | git 2.5x | `text`, `eol`, `text=auto`, Windows default `eol=crlf`, `--renormalize` |
| https://spec.editorconfig.org/ | EditorConfig specification | 0.17+ | `root`, `end_of_line`, no inline comments |
| https://github.com/rhysd/actionlint/blob/main/docs/checks.md | actionlint check docs, "shellcheck integration for run:" | 1.7.12 | which shells are linted, which SC codes are disabled |
| https://raw.githubusercontent.com/rhysd/actionlint/main/docs/usage.md | actionlint usage | 1.7.12 | `-shellcheck=`, `-ignore`, installation notes |
| https://taskfile.dev/docs/reference/schema | Task schema reference | Task 3.53 | `set`, `shopt` options for Taskfile commands |
| https://github.com/actions/runner-images (clone @8197087fc536: images/ubuntu/Ubuntu2204/2404/2604-Readme.md) | GitHub-hosted runner software lists | 2026-10 | ShellCheck version per runner image |
| https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parsefile | `Parser.ParseFile` API | PowerShell 5.1 - 7.6 | `ParseError[]` out-parameter, no exception |
| https://fishshell.com/docs/current/cmds/fish.html | fish command-line options | fish 4.x | `-n/--no-execute` |
| https://elv.sh/ref/command.html | elvish command reference | 0.21 | `-compileonly` |
| https://www.nushell.sh/commands/docs/nu-check.html | nushell `nu-check` | 0.116 | boolean result, flags |
| https://api.github.com/repos/koalaman/shellcheck/releases, .../mvdan/sh/releases, .../rhysd/actionlint/releases | release lists | read 2026-10-11 | latest versions and dates (0.11.0 2025-08-04; shfmt 3.14.1 2026-09-06; actionlint 1.7.12 2026-03-30) |
| apt-cache policy / apk policy in ubuntu:24.04, ubuntu:26.04, debian:12, debian:13, alpine:3.22 containers | distro package versions (measured, `FX/distro-drive.sh`) | 2026-10-11 | ShellCheck/shfmt versions by platform |
| ../shell-audit/exemplar-shape.md, fleet-shell-shape.md, config-inventory.md, installers.md (this repository) | wave-1 audits | 2026-10-10 | disable census, shfmt styles, gate inventory, fleet counts |
| rust-lang/rustup@61271d00a979, jdx/mise@19e8c8f0d03d, shellspec/shellspec@f2d13f991885, starship/starship@d4d0459c5c24, docker/docker-install@2b32480025b2, acmesh-official/acme.sh@807da6498377, atuinsh/atuin@56525ac6a7a9, k3s-io/k3s@82a6ddcd820b (exemplar clones) | exemplar gate files | 2026-10 | real gate, rc and directive practice |
| /home/mherwig/dev/ocx@5de9d777eb7d, grimoire@4650ad830375, www-setup@a251c3631047, setup-grimoire@1259e35b2550 (read only) | fleet gate files | 2026-10-11 | fleet defects with file:line |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/shell/rules/rust-quality/cli-contract.md | fleet CLI contract | 2026-10 | exit-code table the gate mirrors (69, 78, 66 vs 79) |
| ShellCheck 0.9.0 and 0.10.0 release binaries, shfmt 3.12.0/3.13.0/3.14.1 release binaries, actionlint 1.7.12 (GitHub releases, downloaded into `FX/bin/`) | tools under test | 2023-2026 | version-by-version measurements |
