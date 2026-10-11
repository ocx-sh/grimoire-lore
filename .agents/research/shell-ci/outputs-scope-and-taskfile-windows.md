---
title: "CI shells, revision: output-derived expressions, Taskfile on Windows, GitLab CI"
topic: "SH-CI revision (SH-CI-01..22 held stable; new rules SH-CI-23..30): the SH-CI-07 scope (steps/needs outputs, matrix, zizmor persona), the SH-CI-20 level (task 3.54.0 on the Windows host), GitLab CI templates, and the X7 stale citations"
agent: ci/outputs-scope-and-taskfile-windows (wave 3)
model: sonnet
date_researched: 2026-10-11
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/
scope: |
  Covers: whether `steps.*.outputs.*`, `needs.*.outputs.*` and `matrix.*` in run bodies become a MUST (act plants, zizmor 1.30.1 personas x severities over the 26 first-party workflow dirs, fleet and exemplar counts); task 3.54.0 on the Windows host (native cmd.exe and Git Bash parents: builtin coreutils, PATH resolution, `platforms:`, path separators, batch files); the GitLab CI files of the fleet (default shell, errexit and pipefail, `$CI_*` in `script:`); the X7 citation re-points.
  Not covered: the real GitHub runner and a real GitLab Runner (nothing here can run on either: GitLab behaviour is an emulation of the runner's script generator from its source), macOS and BSD userland (no host: every such claim is "unverified: read only"), the generic injection program (SH-SEC, W3-7), ShellCheck invocation (SH-GATE), PowerShell language rules (PS-*).
---

# CI shells, revision: output-derived expressions, Taskfile on Windows, GitLab CI

Read first: [shell-ci.md](../shell-ci.md) (SH-CI-01..22, held stable), the [topic map](../shell-topic-map.md) (X7, conflict 8 globs). Dated 2026-10-11. Fleet commits measured: `ocx@4ded080feed4`, `www-setup@a251c3631047`, `grimoire@4650ad830375`, `e2e-mirror@a4c9fc67afb5`, `grimoire-indexer@19fe2dcb5dc1`, `ocx-catalog@df02bfe90995`, `grimoire-components@6fd8054116af`, `ocx-indexbot@c7434553d5d8`, `mirror-pypi@c8f5cf8e53cc`, `mirror-bazelbuild@713abea9fbb8`. (shell-ci.md cites `ocx@5de9d777eb7d`; ocx has moved on since, every ocx line below is re-measured at `4ded080feed4`.)

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Q1: outputs, matrix and the zizmor persona](#1-q1-outputs-matrix-and-the-zizmor-persona)
   2. [Q2: task 3.54.0 on the Windows host](#2-q2-task-3540-on-the-windows-host)
   3. [Q3: GitLab CI in the fleet](#3-q3-gitlab-ci-in-the-fleet)
   4. [X7: stale citations re-pointed](#4-x7-stale-citations-re-pointed)
   5. [Revisions to existing rows](#5-revisions-to-existing-rows)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)
9. [Appendix: win-task-lint.py](#appendix-win-task-lintpy) and [gl-extract.py](#appendix-gl-extractpy)

## Summary

- **SH-CI-07 scope verdict: extend, as two new MUSTs.** A `steps.<id>.outputs.*` or `needs.<job>.outputs.*` expression in a `run:`/`script:` body is code, exactly like the context it was copied from: act ran the payload from an issue title through a two-job output hop (canary created) and the `env:` twin stayed inert (SH-CI-23).
- **`matrix.*` is a MUST only when the matrix is built from an expression** (`fromJSON(needs.*.outputs.*)`); a literal matrix is constants and stays out of the rule (SH-CI-24). Dotted member access on a dynamic dimension (`matrix.item.version`) executed the payload while zizmor 1.30.1 stayed at 0 findings at every severity under the regular persona.
- **zizmor stays `--persona regular --min-severity medium` (SH-CI-21 unchanged).** Pedantic and auditor add no true positive at medium (18 template-injection findings under all three personas) and 7.8x noise at low (140 against 18); outputs show only at `--min-severity informational` (severity Informational, confidence Low, persona regular, [template_injection.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/audit/template_injection.rs)), which adds 10 sites but also 125 findings of other audits. The greps of SH-CI-23/24 carry what zizmor cannot.
- **actionlint 1.7.12 is blind to all four output and matrix plants** (exit 0, no output); the grep is the complete check, as for `inputs.*` in SH-CI-07.
- **Fleet exposure is small and mostly generated:** 9 authored-or-generated `steps/needs outputs` sites in 3 repos plus the mirror family; 32 `matrix.version.version` run-body lines in 16 dynamic-matrix workflows of the mirror family (generated, "DO NOT EDIT"). Exemplars: 114 output lines in 17 of 38 repos, 35 dynamic-matrix lines in 6.
- **SH-CI-20 goes from SHOULD to a scoped MUST.** The old premise ("no grep can tell") is replaced by `win-task-lint.py`, which reads the workflow (Windows job, step shell not bash) and the Taskfile (task, deps, `task:` calls) and flags commands absent from a plain Windows PATH; watched red on cmd.exe (rc 201, `"uname": executable file not found`) and green under Git Bash and under `platforms:`. Fleet: 0 violations at the MUST scope; 84 ungated tasks in 32 Taskfiles at the advisory scope (SH-CI-25).
- **Task 3.45.3+ ships Go core utilities on Windows only** (`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`; `TASK_CORE_UTILS=0` turns them off). So `ls`, `cp`, `mkdir -p`, `rm -rf` work from a cmd.exe or pwsh parent; `uname sed grep head tail wc cut tr date env which sha256sum sh` do not (38 of 68 probed names absent). Under a Git Bash parent only 6 are absent.
- **The builtin `find` and `ls` are u-root, not GNU:** `find . -name x` prints absolute Windows paths, `ls` prints one absolute path per line, `ls -la` prints `bill gates` as owner, `echo hello | find "hello"` is parsed as a path and exits 0 with an error line.
- **`platforms:` takes GOOS or GOOS/GOARCH, never a negation:** `platforms: ['!windows']` makes the whole Taskfile fail to load (rc 102, every task). A non-matching task or cmd is skipped silently with exit 0, including a `deps:` entry.
- **Backslashes in template output are eaten by the shell:** `echo {{.FILE_PATH_SEPARATOR}}x` prints `x`, `{{fromSlash "a/b/c"}}` prints `abc`, `{{joinEnv "a" "b"}}` expands to `a;b` and the `;` splits the command (`"b": executable file not found`). `{{.ROOT_DIR}}` is already forward-slashed (`C:/Users/...`). `.\sub\x.bat` loses its backslashes; `sub\\x.bat` works.
- **GitLab Runner turns errexit on and pipefail on when the shell has it** (`set -o pipefail` guarded by a `set -o` probe, then `set -o errexit`, [bash.go:453](https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/bash.go)); GitHub's default is the opposite. The shell is bash if the image has one, else sh; `node:*-alpine` jobs run busybox ash. pipefail is on in ash 1.35/1.37 and dash 0.5.12-12 (Debian 13), off in dash 0.5.12 on Debian 12 (emulation).
- **The fleet's GitLab surface is 12 files (8 YAML, 4 script fragments), not 21:** the audit's 21 counted the GitHub templates in the same directories. All use `set -eu` blocks, none uses `$CI_COMMIT_*` in a script body except a quoted `echo` guarded by a semver `rules:` regex, and all `$CI_*` expansions in scripts are double-quoted.
- **One real defect, invisible to ShellCheck 0.11.0 (also with `-o all`):** `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28` is `apk add ... || apt-get update && apt-get install ...`; on the job's default `node:*-alpine` image `apk` succeeds, `||` skips `apt-get update`, `&&` still runs `apt-get install`, and the job dies with `apt-get: not found` (rc 127). A grep over every tracked shell/YAML file of the fleet finds only this line (SH-CI-30). Reported, not fixed.
- **GitLab needs 3 rows (SH-CI-28/29/30) and the globs `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml` join the `shell-quality` list** (fleet: 1 live file, 0 in www-setup, so `--allow-absent`); the 7 `templates/ci/gitlab-*.yml` generator inputs are not reachable by an exact-name glob and stay with the generator's own tests.
- **X7 re-points confirmed against the consolidations:** SH-GATE-27 and SH-GATE-32 do not exist (SH-GATE has IDs 01..20); SH-EXP-20 is SH-ERR-12; the pwsh native-call guard is PS-ERR-03; SH-CI-16's pointer is SH-ERR-09; BVG-02/03 are SH-DIAL-06 and SH-DIAL-25.
- **Two surprises worth their own round:** zizmor 1.30.1 misses dotted access on a dynamic matrix dimension (cause read in [matrix.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/models/workflow/matrix.rs): `expands_to_static_values` compares the whole context to the dimension path, so `matrix.item.version` never matches `matrix.item`); and Task's embedded coreutils change which commands a Windows Taskfile can use without being documented in the Taskfile schema pages.

## Findings

### 1. Q1: outputs, matrix and the zizmor persona

#### 1.1 The two-job act fixture: attacker text crosses a job boundary

Fixture `outputs/` (act 0.2.89 host mode, event `issues`, title `x"; touch .../CANARY-N1; echo "`). Job `a` copies the title to `$GITHUB_OUTPUT` through `env:` (the safe form), job `b` interpolates `needs.a.outputs.title` in a `run:` body ([needs-out.yml](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/outputs/.github/workflows/needs-out.yml)). The safe first hop is the point: the taint survives it, because the output is a string and `${{ }}` pastes it verbatim ([zizmor audits: "the expansion of a given expression appears verbatim in whatever context it was performed in"](https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/audits.md)).

```yaml
# violation (needs-out.yml, job b)
      - run: echo "got=${{ needs.a.outputs.title }}"
# compliant twin (twin/needs-out-env.yml, job b)
      - env:
          TITLE: ${{ needs.a.outputs.title }}
        run: echo "got=${TITLE}"
```

Result (act, [out/q1-act.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-act.txt)):

| plant | expression in the run body | payload | twin (via `env:`) |
|---|---|---|---|
| `steps-out.yml` | `steps.t.outputs.title` | EXECUTED (`got=x`, canary created) | inert, prints the whole title |
| `needs-out.yml` | `needs.a.outputs.title` | EXECUTED | inert |
| `matrix-dyn.yml` | `matrix.item` with `item: ${{ fromJSON(needs.a.outputs.list) }}` | EXECUTED | inert |
| `matrix-dyn-obj.yml` | `matrix.item.version`, same dimension | EXECUTED (CANARY-N3) | not separately run (same twin shape) |
| `twin/matrix-static.yml` | `matrix.item` with `item: [alpha, beta]` | n/a: two legs print `item=alpha`, `item=beta` | constants, no taint |

act host mode is not the GitHub runner, but the injection happens before the shell exists (template expansion), so the result does not depend on the runner. Real-runner confirmation: unverified.

#### 1.2 Tool coverage on the plants

actionlint 1.7.12: exit 0, no output on all four plants (V3). zizmor 1.30.1 on the same files ([out/q1-zizmor-plants.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-zizmor-plants.txt), counts are `template-injection` findings):

| plant | regular high | regular medium | regular low | regular informational | pedantic and auditor, first level that shows it |
|---|---|---|---|---|---|
| `steps.t.outputs.title` | 0 | 0 | 0 | 1 (info, confidence Low) | informational |
| `needs.a.outputs.title` | 0 | 0 | 0 | 1 (info, confidence Low) | informational |
| `matrix.item` (dynamic) | 0 | 1 (warning, Medium confidence) | 1 | 1 | medium |
| `matrix.item.version` (dynamic) | 0 | 0 | 0 | 0 | low (Low severity, High confidence, pedantic only) |
| twin `matrix.item` (static) | 0 | 0 | 0 | 0 | low (pedantic blanket smell) |
| every `env:` twin | 0 | 0 | 0 | 0 | 0 |

Why, read from the source: a context that is not in zizmor's capability table falls to the last `else` of [template_injection.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/audit/template_injection.rs) (`Severity::Informational`, `Confidence::Low`, default persona), which is where `steps.*.outputs` and `needs.*.outputs` land. `steps.*.outcome`, `steps.*.conclusion` and `needs.*.result` are skipped on purpose ("always one of success, failure, cancelled, or skipped"). A `matrix.*` context is `Medium/Medium` only when `expands_to_static_values` is false, and that function matches `context.matches(expansion.path)` against the dimension path ([matrix.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/models/workflow/matrix.rs)); `matrix.item.version` is longer than the path `matrix.item`, so it is treated as static. That is a false negative of 1.30.1, measured on the plant, not a documented limit.

Exit codes for a gate: 11 informational, 12 low, 13 medium, 14 high ([usage.md](https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/usage.md)).

#### 1.3 Persona and severity sweep over the 26 first-party workflow dirs

`zfleet/scan.sh`, `--offline --no-config --no-exit-codes --format json`, one run per dir, persona and floor (3 x 4 x 26 = 312 runs, 17 s). "TI" is `template-injection`; "all" is every audit. Repos = repos with at least one finding of any audit.

| persona | floor | TI findings | all-audit findings | repos with findings |
|---|---|---|---|---|
| regular | informational | 28 | 498 | 26 |
| regular | low | 18 | 481 | 25 |
| regular | medium | 18 | 373 | 23 |
| regular | high | 10 | 181 | 18 |
| pedantic | informational | 150 | 874 | 26 |
| pedantic | low | 140 | 763 | 26 |
| pedantic | medium | 18 | 419 | 23 |
| pedantic | high | 10 | 202 | 19 |
| auditor | informational | 150 | 932 | 26 |
| auditor | low | 140 | 821 | 26 |
| auditor | medium | 18 | 477 | 25 |
| auditor | high | 10 | 202 | 19 |

What the TI sites are (unique sites after de-duplicating locations, [out/q1-zizmor-sites.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-zizmor-sites.txt)):

- regular, medium: 18 = 6 `inputs.release_tag` (`www-setup@a251c3631047:.github/workflows/test-installers.yml:206,207,239,241,269,271`), 1 `github.event.client_payload.version` (`update-dist.yml:27`), 2 `github.ref_name` (`grimoire release.yml:79`, `ocx release.yml:79`), 1 `github.actor` (`arcana publish.yml:101`), 8 dynamic simple-name `matrix.*` in the cargo-dist `release.yml` of grimoire and ocx (`matrix.install_dist.run`, `install_cargo_auditable.run`, `packages_install`, `dist_args`).
- regular, informational adds 10: 9 `needs.*.outputs.*` (`grimoire release.yml:146,204,268,299`; `ocx release.yml:151,209,285,316`; `e2e-mirror mirror-signing.yml:196`) and 1 `steps.paths.outputs.committed` (`ocx build-windows-shims.yml:210`).
- pedantic or auditor, low, adds 114 sites that are not findings an agent should act on: 65 static-matrix `matrix.*` (Low/High), 22 `steps.*.outcome`/`conclusion`, 9 `secrets.*`, 9 `github.ref_name`-class smells, 7 other `github.*`.

Verdict: persona choice is irrelevant at medium and above (18 findings under all three), and pedantic or auditor at low is a 7.8-fold increase (140 against 18) in which every added line is a constant or a smell. Regular at `--min-severity medium` stays. `--min-severity informational` is the only floor that shows outputs, but it also admits 125 findings of other audits (101 `self-repository`, `adhoc-packages`, `superfluous-actions`) and zizmor has no audit selector (`--help`: no such flag), so a gate would have to post-filter JSON. The grep is simpler and watched red (V1).

Mirror family (not in the 26 dirs): zizmor regular informational reports 68 TI findings over 6 repos, all `github.actor` (53, High) or `needs.discover.outputs.versions` (15, Informational); it reports none of the `matrix.version.version` run-body lines ([out/q1-mirror-high.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-mirror-high.txt)).

#### 1.4 Is the tainted source real in the fleet?

- `needs.plan.outputs.tag-flag`/`tag` in the cargo-dist release workflows of grimoire and ocx: value comes from `dist plan` over a pushed tag; pushing a tag needs maintainer rights. The files are generated ("This file was autogenerated by dist", `ocx/.github/workflows/release.yml:1`), so the fix is the generator's. Not exploitable by an outsider.
- `e2e-mirror@a4c9fc67afb5:.github/workflows/mirror-signing.yml:196` (`VERSIONS='${{ needs.discover.outputs.versions }}'`) and the 32 `matrix.version.version` run-body lines of the 16 dynamic-matrix mirror workflows (e.g. `mirror-bazelbuild@713abea9fbb8:.github/workflows/mirror-bazelisk.yml:99,102` shape `--version "${{ matrix.version.version }}"`): the value is a version string the source crawl produced from `type: github_release` (6 of the specs), `pypi`, `pylock` or `url_index`. A git tag name may contain `$(id);"x"` (`git check-ref-format` accepts it, [out/q1-refname.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-refname.txt)); whether ocx-mirror's version parser rejects such a tag before it reaches the matrix is unverified (read only, not opened). Reported, not fixed.
- `ocx@4ded080feed4:.github/workflows/build-windows-shims.yml:210` (`committed='${{ steps.paths.outputs.committed }}'`): a path the same job computed; benign, but a mechanical `env:` fix.

#### 1.5 Verdict

- **SH-CI-07 scope:** extend. The attacker-reachable set now includes any output or dynamic matrix value derived from it, and an agent cannot decide cross-job taint reliably, so the rule is stated on the syntax (SH-CI-23, SH-CI-24), not on the provenance. The fix is one `env:` line, the same cost as for `github.event.*`.
- **Static `matrix.*` is exempt.** 73 fleet sites at pedantic would be false positives, and a literal matrix is a constant.
- **Severity and persona:** zizmor `regular`, `--min-severity medium` (unchanged), plus the two greps. No pedantic, no auditor, no informational floor in the gate.
- **Level:** MUST for both, with generated files out of scope (their generator carries the fix).

### 2. Q2: task 3.54.0 on the Windows host

Setup: task 3.54.0 `task.exe` from the [release zip](https://github.com/go-task/task/releases/tag/v3.54.0) staged on `C:\Users\ecom\shell-wintest\outputs-scope-and-taskfile-windows\bin354\`, Windows 10.0.26200.9457, Taskfile [win/Taskfile.yml](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/win/Taskfile.yml) (80 probe tasks), two parents: native `cmd.exe /c driver.bat` and Git Bash 5.2.15 through `matrix.sh win`. The host also has `task` 3.48.0 from winget on PATH (the version SH-CI-20 was measured on); every number below is from the 3.54.0 binary. Transcripts in `out/q2-*.txt`.

#### 2.1 Task bundles Go core utilities on Windows

[CHANGELOG v3.45.3](https://github.com/go-task/task/blob/v3.54.0/CHANGELOG.md): "Task now includes built-in core utilities to greatly improve compatibility on Windows." The [blog post](https://taskfile.dev/blog/windows-core-utils) lists them and the switch: "`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`", "`TASK_CORE_UTILS` ... By default, this is true on Windows and false on other platforms." They come from u-root, so they are not GNU:

| probe (cmd.exe parent, 3.54.0) | observed |
|---|---|
| `ls` | one absolute path per line (`C:\Users\ecom\...\Taskfile.yml`) |
| `ls -la` | `drwxrwxrwx bill gates 4096 Oct 11 02:26 C:\...` |
| `find . -name Taskfile.yml` | prints the absolute path, not `./Taskfile.yml` |
| `echo hello \| find "hello"` | u-root parses `hello` as a path: `GetFileAttributesEx ...\hello:` error, rc 0 |
| `tar --version` | `flag provided but not defined: -version`, rc 201 |
| `xargs echo X:` | `exec: "echo": executable file not found in %PATH%` (builtins are not visible to xargs) |
| `cat missing.txt` | `cat: open C:\...\missing.txt: The system cannot find the file specified.` rc 201 |
| `shasum -a 256 Taskfile.yml` | works; `sha256sum` is absent |
| `TASK_CORE_UTILS=0`, `ls`/`cp`/`mkdir` | `"ls": executable file not found in $PATH`, exit 127; `find` falls back to `C:\Windows\System32\find.exe`: `FIND: Parameter format not correct`, exit 2 |

#### 2.2 External commands resolve from the parent's PATH

Task does not add a POSIX userland; a command that is not a builtin or a coreutil is looked up on the PATH it inherited. 68 names probed per parent ([out/q2-probe-cmd.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q2-probe-cmd.txt), [q2-probe-gitbash.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q2-probe-gitbash.txt)); "absent" means `executable file not found`:

| parent | absent | present |
|---|---|---|
| cmd.exe (also what a `pwsh` or `cmd` step passes down) | 38: `uname sed grep egrep awk head tail wc cut tr uniq which env date sha256sum md5sum readlink realpath dirname basename tee diff sleep id nproc stat du ln install xxd od unzip zip make sh pwsh jq wget` | 30: `sort mktemp base64 gzip tar find xargs ls cat cp mv rm mkdir touch chmod shasum curl cmake python3 python node npm cargo bash powershell git where timeout hostname whoami` |
| Git Bash 5.2.15 | 6: `egrep jq wget zip make pwsh` | 62, including every name above that was absent from cmd.exe |

Three present-but-different names matter: `sort` is `C:\Windows\System32\sort.exe` (on an LF-only file it printed `?? ` with od showing `? ? \r \n`; GNU sort under Git Bash printed `a`, `b`), `timeout` is the Windows `timeout.exe` (waits, different arguments), and `bash` resolved on this host to `C:\Windows\System32\bash.exe`, the WSL launcher: `bash -c "uname -s"` printed `Linux`; under Git Bash it printed `MINGW64_NT-10.0-26200`. Whether a GitHub Windows runner resolves `bash` to Git Bash from a pwsh-launched `task` is unverified (needs a push and dispatch).

A `$(uname -s)` that is not found does not stop the cmd: `echo "os=$(uname -s)"` printed `os=` plus a `"uname": executable file not found` line, and the task failed only at the next absent command (`tw/bad`, V8).

#### 2.3 `platforms:`

Per the [platforms guide](https://taskfile.dev/docs/guide/platforms): OS, architecture or `OS/ARCH` in Go's GOOS and GOARCH names, checked against the machine running Task, "A command whose platform does not match is skipped without an error". Measured: `platforms: [windows]` ran, `[linux]`, `[darwin]` and `[windows/arm64]` printed nothing with rc 0, `[windows/amd64]` ran, a `deps:` entry gated to linux was skipped and the dependent task ran (`AFTER-dep-linux`), and cmd-level `platforms` gave `CMD-windows` then `CMD-always`. `{{OS}} {{ARCH}}` rendered `windows amd64`.

Negation is not supported and is not a soft failure: `platforms: ['!windows']` in a Taskfile makes Task refuse to load it (`err: invalid platform "!windows"`, `Taskfile.yml:70:24`, rc 102), so every task in the file fails ([out/q2-cmd-round2.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q2-cmd-round2.txt)). The guide "doesn't describe negation".

#### 2.4 Path separators and template output

[templating docs](https://taskfile.dev/docs/reference/templating): `FILE_PATH_SEPARATOR` is `\` on Windows, `PATH_LIST_SEPARATOR` is `;`, `joinEnv` joins "for use in environment variables", `toSlash`/`fromSlash` convert. Task substitutes the value into the command text, then mvdan/sh parses it, so a backslash is an escape and `;` is a separator ([out/q2-sep.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q2-sep.txt), cmd.exe-launched `task.exe`):

```
echo SEP=[{{.FILE_PATH_SEPARATOR}}]      -> SEP=[]            (backslash eaten)
echo 'SEP=[{{.FILE_PATH_SEPARATOR}}]'    -> SEP=[\]           (single quotes keep it)
echo {{fromSlash "a/b/c"}}               -> abc               (a\b\c with the backslashes eaten)
echo '{{fromSlash "a/b/c"}}'             -> a\b\c
echo L={{.PATH_LIST_SEPARATOR}}x         -> L=  then  "x": executable file not found in $PATH
echo 'L={{.PATH_LIST_SEPARATOR}}x'       -> L=;x
```

On Linux the same task 3.54.0 renders `SEPVAR=[/]` and `a:b` ([win/Taskfile.z.yml](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/win/Taskfile.z.yml)), so the trap is Windows-only. What does work: `{{.ROOT_DIR}}`, `{{.TASKFILE_DIR}}` and `{{toSlash .ROOT_DIR}}` all render `C:/Users/...`; `cd {{.ROOT_DIR}}/sub && pwd` prints `C:\Users\...\sub`; `dir: sub/dir` resolves; `$HOME` and `$USERPROFILE` are `C:\Users\ecom`; `$PATH` is `;`-separated Windows form (`has-semicolon=yes`, `has-colon-sep=no`); `$PATHEXT` is set. Executables: `"{{toSlash .ROOT_DIR}}/bin354/task.exe" --version` ran, the backslash form `{{.ROOT_DIR}}\bin354\task.exe` failed (`not found`).

#### 2.5 Scripts and batch files

`./sub/hello.sh` fails on Windows with `fork/exec ...hello.sh: %1 is not a valid Win32 application` (no shebang handling) under both parents; `sh ./sub/hello.sh` works only under Git Bash (`"sh": executable file not found` from cmd.exe). A batch file is run through cmd.exe: `sub/hello.bat` and `./sub/hello.bat` fail (`'sub' is not recognized`, `'.' is not recognized`), `.\sub\hello.bat` in single quotes loses its backslashes (`".subhello.bat": executable file not found`), `sub\\hello.bat` and `dir: sub` with a bare `hello.bat` work, `cmd /c sub\hello.bat` unquoted fails (`'subhello.bat'`). Windows PowerShell inline: `$PSVersionTable` inside double quotes is expanded by the Task shell (prints `.PSVersion.Major`); single-quote the PowerShell text.

#### 2.6 The SH-CI-20 level

The old row said "reading heuristic only (no grep can tell which tools exist on a Windows PATH)". Two facts change that: the set of absent tools is now measured and finite (2.2), and the trigger is mechanical (a `task NAME` call in a Windows job step whose shell is not bash). `win-task-lint.py` (appendix) joins them: parse `.github/workflows/*.y*ml`, take Windows jobs (runs-on or strategy text contains `windows`), steps whose shell is not `bash` (default on windows is pwsh) and that are not gated away from Windows by an `if:` naming Linux, macOS or `!= 'Windows'`; resolve each `task NAME` to its Taskfile entry (root, `includes:`, `deps:`, `task:` calls); report a cmd item whose command word is in the absent set and that has no `platforms:`. Watched red on a planted workflow plus Taskfile, green on a `platforms:`-gated twin, a Git-Bash-default twin and a builtin-only twin (V8), and the prediction was confirmed by running the same Taskfiles with the real `task.exe` (cmd.exe parent: rc 201, three `executable file not found`; Git Bash parent: rc 0; gated twin rc 0).

Fleet reach: 12 `task` calls in Windows jobs across 8 repos ([out/q2-fleet-win-task-shells.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q2-fleet-win-task-shells.txt)); 7 run under `shell: bash` (Git Bash PATH), 5 under the pwsh default (`setup-grimoire test:pester` runs `pwsh -Command`, `find_ocx test` runs cmake and ctest, `ocx rust:shim:build`, and two `ocx verify-deep.yml` steps gated `if: matrix.job.name == 'Linux'`). MUST-scope result over the 26 dirs: 0 lines. Advisory scope (`--all`): 84 ungated tasks in 32 Taskfiles of 11 repos use absent tools (`grep` 41, `sed` 32, `tail` 21, `dirname` 14, `cut` 11, `tee` 11, `wc` 10, `date` 9, `sha256sum` 9); they are Linux-only today and the `if:` gating keeps them off Windows.

Verdict: **SH-CI-20 becomes a scoped MUST** (reached from a Windows non-bash step) and the unscoped form becomes SH-CI-25 (SHOULD, a list). The existing row's claim "externals from the Windows PATH" stays true and is completed by 2.1.

### 3. Q3: GitLab CI in the fleet

#### 3.1 Inventory (the 21 is wrong)

`git ls-files` over every fleet repo that has a `.git` (worktrees and sibling clones excluded) finds GitLab CI definitions in four repos ([out/q3-gitlab-files.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q3-gitlab-files.txt)): `grimoire-components/.gitlab-ci.yml` (40 lines, the one live root file), `grimoire-indexer/templates/ci/gitlab-{ci,publish,stats,verify}.yml` and `gitlab-{enrich,stats-downloads,stats-ratings,stats-seed}.sh` (generator inputs with `{{placeholder}}` tokens; the `.sh` files are YAML script fragments with no shebang), `ocx-catalog/templates/ci/gitlab-{ci,verify-job}.yml`, `ocx-indexbot/src/ocx_indexbot/ci/templates/gitlab/indexbot.yml` (259 lines). That is 12 files, 722 lines. [fleet-shell-shape.md:430](../shell-audit/fleet-shell-shape.md) counted `templates/ci/*` (21 files in grimoire-indexer: 12 `github-*`, 8 `gitlab-*`, `header.txt`), 4 in ocx-catalog (2 GitHub) and 1: the 21 includes 14 GitHub templates. No exemplar of the 38 workflow-bearing corpus repos has a GitLab CI file (`find`, 0).

#### 3.2 What the runner gives a `script:` block

[bash.go](https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/bash.go) (main, fetched 2026-10-11; the commit id could not be resolved, the GitLab API refused the request). The generated script is `Finish()`:

```
#!/usr/bin/env <shell>
trap 'exit 1' TERM
case "$(set -o)" in *"pipefail"*) set -o pipefail;; esac; set -o errexit
set +o noclobber
(trap 'exit 1' TERM; eval '<all entries>') < /dev/null
exit 0
```

Each `script:` entry is written verbatim as one line of text followed by `_runner_exit_code=$?; if [ $_runner_exit_code -ne 0 ]; then exit ...; fi` ([abstract.go `writeCommands`](https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/abstract.go)); `before_script` and `script` run "together in a single shell context", `after_script` in a separate one ([variables docs](https://docs.gitlab.com/ci/variables/)). The shell: the docker entry point tries `/usr/local/bin/bash`, `/usr/bin/bash`, `/bin/bash`, then `sh` variants, then `/busybox/sh` (bash.go:21-37); the [runner docs](https://docs.gitlab.com/runner/shells/) only say "Sh/Bash is the default shell used on all Unix based systems" and "fallback for bash". So the dialect depends on the image: a `node:*-alpine` job is busybox ash, a Debian image is bash. Variables are exported into the environment (`w.Variable`), not substituted into the script text, except the `release:` step, whose lines are run through `ExpandValue` (abstract.go, `writeUserScript`).

Emulation of that generator on real shells ([gitlab/emu/](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/gitlab/emu/), [out/q3-emu-1.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q3-emu-1.txt); not a real runner, the structure is transcribed from the source above):

| entry | alpine:3.22 ash | busybox:1.37 | debian:12 bash | dash 0.5.12 (deb12) | dash 0.5.12-12 (deb13) |
|---|---|---|---|---|---|
| `false` then `echo REACHED` in one block | rc 1, not reached | rc 1 | rc 1 | rc 1 | rc 1 |
| `false \| true` then `echo REACHED` | rc 1 (pipefail on) | rc 1 | rc 1 | REACHED, rc 0 (no pipefail) | rc 1 |
| `A \|\| apt-get update && apt-get install` after a succeeding `A` | `apt-get: not found`, rc 127 | rc 127 | `E: Unable to locate package`, rc 100 | rc 100 | rc 100 |
| `if false; then :; fi; false \|\| echo recovered` | continues, rc 0 | rc 0 | rc 0 | rc 0 | rc 0 |

The [script docs](https://docs.gitlab.com/ci/yaml/script/) say of combined commands "only the last command's failure or success is reported" (a "known bug", workaround: separate items or `exit 1`). The emulation contradicts that for a `|` block (errexit stops it). Which is right on a live runner is unverified; the source says errexit, and the safe habit (one command per item, or an explicit check) satisfies both.

Contrast with GitHub: an unspecified `run:` is `bash -e {0}` without pipefail (SH-CI-01). So the SH-CI-01 trap does not exist on GitLab for bash, ash and new dash images, and exists for sh-only images whose shell lacks pipefail.

#### 3.3 `$CI_COMMIT_*` and the injection model

GitLab's variables are environment variables, so `"$CI_COMMIT_MESSAGE"` in a script is a quoted expansion, not code: there is no GitHub-style template step. The injection routes are the shell's own: an unquoted expansion (word splitting and globbing; a leading `-` becomes an option), and any use inside `eval`, `sh -c "..."` or `bash -c "..."` strings, where the value is parsed again as code. The [variables docs](https://docs.gitlab.com/ci/variables/) say "you should always put variable values in single or double quotes" and warn that `.gitlab-ci.yml` changes can compromise variables; the [predefined variables page](https://docs.gitlab.com/ci/variables/predefined_variables/) carries no per-variable warning (no list of attacker-controlled names exists there), so the list of tainted names is this program's reading: `CI_COMMIT_MESSAGE`, `CI_COMMIT_TITLE`, `CI_COMMIT_DESCRIPTION`, `CI_COMMIT_TAG_MESSAGE`, `CI_COMMIT_REF_NAME`, `CI_COMMIT_BRANCH`, `CI_MERGE_REQUEST_TITLE`, `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`, `GITLAB_USER_*` (author-supplied text; asserted, not documented).

Fleet audit of every `$CI_*` reference in the 12 files ([out/q3-ci-var-refs.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q3-ci-var-refs.txt)): 31 references; in `rules: - if:` and `include:` (not shell): `CI_PIPELINE_SOURCE`, `CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`, `CI_COMMIT_TAG =~ /^\d+\.\d+\.\d+$/`, `CI_PROJECT_NAMESPACE`, `CI_PROJECT_PATH == $CI_MERGE_REQUEST_PROJECT_PATH`; in script bodies, all double-quoted: `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-ci.yml:82,96` (`"$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"`, `"origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"`), `:117,122,123,125,126` (`$CI_MERGE_REQUEST_DIFF_BASE_SHA`, `$CI_PROJECT_DIR`), `gitlab-publish.yml:40`; the only `$CI_COMMIT_*` in a script is `grimoire-components@6fd8054116af:.gitlab-ci.yml:37` (`echo "Releasing $CI_COMMIT_TAG ..."`), guarded by `rules: - if: $CI_COMMIT_TAG =~ /^\d+\.\d+\.\d+$/` at line 35, so only a digit-dot string reaches it. Zero violations. The gate design in `gitlab-ci.yml:20-49` already documents the fork-MR residual (a fork MR's pipeline runs in the source project); that is a trust-boundary note, not a shell finding. `git check-ref-format --branch` rejects a branch named `-x`, so the target-branch argument cannot become an option.

Default shell, errexit and pipefail in the fleet files: no file sets a shell; every multi-line block begins `set -eu` (`gitlab-ci.yml:67,81,137`, `gitlab-publish.yml:32,46`) which is redundant for `-e` (the runner sets it) and adds `-u`; none sets `pipefail` (the runner does where the shell supports it); the default image is `node:{{nodeVersion}}-alpine` (ash), and the bodies are POSIX sh (`command -v`, `case`, `[ ]`, no arrays). ShellCheck 0.11.0 `-s sh` over the extracted bodies ([out/q3-shellcheck-fleet.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q3-shellcheck-fleet.txt)): 0 findings; the 3 SC2215 reports are artifacts of blanking `{{run}} --version` placeholders.

#### 3.4 The defect ShellCheck cannot see

`grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28`:

```yaml
    - apk add --no-cache curl git tar || apt-get update && apt-get install -y curl git tar   # violation
    - |                                                                                       # twin
      if command -v apk >/dev/null 2>&1; then apk add --no-cache curl git tar
      elif command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq curl git tar
      fi
```

Reproducer on a real alpine: `docker run --rm alpine:3.22 sh -c 'set -e; apk add --no-cache curl git tar >/dev/null || apt-get update && apt-get install -y curl git tar'` prints `sh: apt-get: not found` and exits non-zero; the `if` twin exits 0 and `git --version` prints 2.49.1. ShellCheck 0.11.0 reports nothing on the line, with or without `-o all` (V4). The same `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-enrich.sh:18-22` and `gitlab-stats-seed.sh:51-57` already use the `if/elif` form. Every tracked `*.sh`, `*.bash`, `*.yml`, `*.yaml`, `*.bats` file of the fleet (uv and sibling clones excluded) contains exactly one match: this line ([fleet-orand.sh](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/fleet-orand.sh), [out/q3-orand-all-fleet.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q3-orand-all-fleet.txt)). The pattern first matched `[[ a || b ]] && x` (uv `plan.yml:202-224`, 12 lines); excluding `]` from the middle class fixed it (the bracket twin is silent, V4).

#### 3.5 Verdict: rows and globs

- **Rows: yes, three** (SH-CI-28 dialect by image, SH-CI-29 quote every `$CI_*`, SH-CI-30 `A || B && C`). Nothing for errexit or pipefail: the runner provides them, so a row would only restate SH-ERR. No new family.
- **Globs: yes** for `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml` (exact names GitLab and the fleet's own generators document: `include: - local: .gitlab-ci/indexbot.yml`, `.gitlab-ci/catalog.yml`). The checker root `www-setup` has none, so both need `--allow-absent`. "Globs must not miss" argues for them: an agent editing a pipeline writes shell. Not reachable by an exact name: the 7 `templates/ci/gitlab-*.yml` generator inputs; they carry `{{...}}` placeholders that make them non-YAML, and stay covered by the generator repos' own tests.

### 4. X7: stale citations re-pointed

IDs verified by heading against the consolidations ([out/x7-ids.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/x7-ids.txt)): SH-GATE has IDs 01..20 (`grep -c` of headings: 20), so SH-GATE-27 and SH-GATE-32 do not exist.

| file:line | stale text | re-point to | why |
|---|---|---|---|
| shell-ci.md:37, :184, :201, :289 | "SH-GATE-01/27" | SH-GATE-01 (default severity) and SH-GATE-19 (actionlint profile) | SH-GATE-27 does not exist; SH-GATE-19 is "Lint workflow `run:` blocks with actionlint" |
| shell-ci.md:191 | "Consistent with SH-GATE-32 (gate commands stay one line)" | delete the clause | SH-GATE-32 does not exist |
| shell-ci.md:131, :311 | "See BVG-02/03", "BVG-02" | SH-DIAL-06 (bash 3.2.57 syntax) and SH-DIAL-25 (`# bash-floor:` guard) | BVG was the working name of the bash-version dive |
| shell-ci.md:34, :124, :203 | "PS-ERR-01 (MUST) and PS-ERR-04 (SHOULD, 7.x)" | PS-ERR-03 (MUST, run-step guard; it cites PS-ERR-01) | shell-pwsh.md:163 makes PS-ERR-04 the entry-point exit rule; per X9 SH-CI-12 becomes a pointer row |
| shell-ci.md:149 | "SH-ERR (map conflict 18, M-B-07 ...)" | SH-ERR-09 (early-exit reader under pipefail) | shell-errexit.md:100 |
| shell-expansion.md:156, :211, :264 | "SH-CI-03" as the `${{ }}` to `env:` boundary, "SH-CI-03/04" | SH-CI-07 and SH-CI-08 | SH-CI-03/04 are the `shell: sh` and container-job rules |
| shell-expansion.md:215 | "SH-EMIT-06/07" | SH-EMIT-03 | SH-EMIT-03 is PowerShell quote doubling; -06 is "prefer data over code", -07 bans `ConvertFrom-Json` as a channel |
| shell-expansion.md:178 and hand-offs naming SH-ERR-09 for empty arrays | "SH-ERR-09" | SH-ERR-12 | SH-ERR-12 is "empty array under `set -u`"; shell-errexit.md:118 |
| shell-ci.md:61, :208; shell-dialect.md:49, :294 | SH-CI-03 restating SH-DIAL-07/08 | keep; SH-DIAL-07 owns the text (shell-dialect.md:293), SH-CI-03 stays the CI trigger | SH-DIAL-08 exists (shell-dialect.md:232) |

### 5. Revisions to existing rows

- **SH-CI-07:** keep ID and text; append one sentence "The set includes any `steps.*.outputs.*`, `needs.*.outputs.*` and dynamic `matrix.*` value (SH-CI-23, SH-CI-24)". Its Limits line already names the one-line `script:` blind spot; V1/V2 keep that limit.
- **SH-CI-20:** level and text per 2.6 (scoped MUST); old "Why" kept and extended with 2.1/2.2; "Verify" replaced by `win-task-lint.py`.
- **SH-CI-21:** unchanged; its Why gains "zizmor reports `needs`/`steps` outputs only at informational and misses dotted member access on a dynamic matrix (1.30.1), so SH-CI-23/24 are greps".
- **SH-CI-12:** drops to a pointer row (X9), per the table above.
- Open subareas of shell-ci.md: "Scope of SH-CI-07", "Taskfile interpreter currency (Windows)" and "GitLab CI templates" are closed by this revision; the real-runner probe stays open.

## Normative guidance candidates

Output is the violation (empty = pass) unless marked. A pipeline ending in `xargs -r` is judged by its output (it exits 123 when the inner grep finds nothing). "RUN" means watched red on a plant and green on its twin; transcripts in [Verification runs](#verification-runs).

**SH-CI-23 (MUST) In a `run:` or `script:` body never write `${{ steps.<id>.outputs.<name> }}` or `${{ needs.<job>.outputs.<name> }}`; set it under `env:` and read `"${VAR}"` (bash) or `$env:VAR` (pwsh). Authored files only: a generated file is fixed in its generator.**
- Why: an output is a string pasted verbatim, so the taint of its source survives the hop; zizmor lists it only at informational, actionlint not at all.
- Verify: `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\b(?:steps|needs)\.[A-Za-z0-9_-]+\.outputs\b' --include='*.yml' --include='*.yaml' .github/workflows`. Limits: continuation lines of a `with:` block of a non-shell action match (`ocx release.yml:171,236`, `grimoire release.yml:166,231`, `docker-publish.yml:188`; read the context); a one-line `script: "${{ ... }}"` is out of reach, as in SH-CI-07.
- RUN: yes, V1 (plant 2 lines, exit 0; twin exit 1) and V-act (payload EXECUTED on `steps-out` and `needs-out`, inert on both twins), fixtures `outputs/`.
- Scope: every shell, every runner, composite `action.yml` too (run the same command with `--include='action.y*ml'`).

**SH-CI-24 (MUST) When a matrix dimension is built from an expression (`fromJSON(needs.*.outputs.*)`, `fromJSON(steps.*.outputs.*)`, `fromJSON(github.event.*)`, `fromJSON(inputs.*)`), never write `${{ matrix.<dimension>[.<field>] }}` in a run body; pass it through `env:`. Literal matrices are exempt.**
- Why: the dimension's elements are output strings; zizmor 1.30.1 flags `matrix.item` (Medium) but not `matrix.item.version` (executed in act).
- Verify: `grep -rliP -e 'fromjson\(\s*\(*\s*(?:needs|steps|github\.event|inputs)\b' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r grep -Pn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\bmatrix\.'`. Limits: it lists every `matrix.*` run-body line of a dynamic-matrix file, static dimensions included (the mirror family and e2e-mirror list 22 to 105 lines of which 32 are `matrix.version.version`); the reader keeps the lines whose dimension is the dynamic one.
- RUN: yes, V2 (plant: `matrix-dyn.yml:26` and `matrix-dyn-obj.yml:26`, exit 0; twin exit 123 = nothing found; the static-matrix twin is not even listed).
- Scope: all runners; generated cargo-dist and mirror workflows are the generators' fix.

**SH-CI-20 (MUST, scoped; was SHOULD) A Taskfile task named by a `task NAME` call in a Windows-runner step whose shell is not `bash` (pwsh and cmd, including the windows default) uses only mvdan/sh builtins, the Task 3.45.3+ builtin coreutils (`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`), tools on a plain Windows PATH, or carries `platforms:` per cmd or task. Never `uname sed grep awk head tail wc cut tr date env which sha256sum dirname basename tee sh` there.**
- Why: Task resolves externals from the parent's PATH; cmd.exe lacks 38 of 68 probed names, Git Bash lacks 6. `find` and `ls` are u-root, `sort` and `timeout` are Windows programs.
- Verify: `python3 win-task-lint.py .` (appendix; needs PyYAML, no `python3 -I`; one line per violating step).
- RUN: yes, V8: plant `bad` red (exit 0, 1 line naming `grep head uname`); twins `good` (platforms-gated), `good-bash` (`defaults.run.shell: bash`) and `good-builtin` silent; the real `task.exe` agrees (cmd.exe parent: `"uname": executable file not found`, rc 201; Git Bash parent: rc 0; gated twin rc 0).
- Scope: task 3.45.3 to 3.54.0 (builtins), Windows 10.0.26200 host; a GitHub Windows runner's PATH is unverified. Fleet: 0.

**SH-CI-25 (SHOULD) Taskfiles that may be run by a Windows developer gate commands absent from a plain Windows PATH with `platforms:`, or call them through a script file run by an explicit shell.**
- Why: the MUST above sees only CI; a developer on cmd.exe or pwsh hits the same `exit status 127`.
- Verify (list): `python3 win-task-lint.py --all .`
- RUN: yes, V8 `--all` (plant 2 lines; `good` and `good-builtin` silent). Fleet: 84 tasks in 32 Taskfiles of 11 repos, advisory.
- Scope: as SH-CI-20.

**SH-CI-26 (SHOULD) In Taskfile `cmds` do not interpolate `{{.FILE_PATH_SEPARATOR}}`, `{{.PATH_LIST_SEPARATOR}}`, `{{joinEnv ...}}` or `{{fromSlash ...}}` unquoted, and never write a literal backslash path; use `{{.ROOT_DIR}}`/`{{toSlash ...}}` (forward slashes) or single-quote the value.**
- Why: Task pastes the value into the command text; the shell then eats `\` and splits on `;` (`SEP=[]`, `L=` then `"x": executable file not found`).
- Verify (list, each hit needs a quote check): `grep -rnE -e '[{][{][^}]*(FILE_PATH_SEPARATOR|PATH_LIST_SEPARATOR|joinEnv|fromSlash)' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .`
- RUN: yes, V10 (plant 3 hits, exit 0; twin exit 1). Runtime behaviour: `out/q2-sep.txt`. Fleet: not run over the fleet; the 3.51.1 additions are recent.
- Scope: task 3.51.1+ for the variables; Windows only (Linux renders `/` and `:`).

**SH-CI-27 (MUST) `platforms:` lists GOOS or GOOS/GOARCH values only; never a negation (`!windows`). List the platforms that should run.**
- Why: `platforms: ['!windows']` fails the load of the entire Taskfile (rc 102, `invalid platform "!windows"`); a wrong-but-valid value silently skips with exit 0.
- Verify: `grep -rnE -e 'platforms:[^#]*!' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .`
- RUN: yes, V9 (plant exit 0 with the line; twin exit 1) and the task run (rc 102).
- Scope: task 3.54.0 (negation not documented in the [platforms guide](https://taskfile.dev/docs/guide/platforms)). Fleet: 0.

**SH-CI-28 (MUST) Write a GitLab `script:`/`before_script:`/`after_script:` body in the dialect of the image's shell: POSIX sh unless the pinned `image:` ships bash (the runner uses bash when `/usr/local/bin/bash`, `/usr/bin/bash` or `/bin/bash` exists, else sh; `node:*-alpine`, `alpine`, `busybox` are ash).**
- Why: same trap as SH-CI-04 with the default reversed; a `[[` or array passes on a Debian image and fails or misbehaves on alpine.
- Verify: `python3 gl-extract.py --sh .gitlab-ci.yml > extracted.sh` then `shellcheck -s sh -f gcc extracted.sh` (appendix extractor; needs PyYAML; for a pinned bash image use `--bash`).
- RUN: yes, V6 (plant: SC3010, SC3030, SC3054, exit 1; the same text under `-s bash` exit 0), V5.
- Scope: GitLab Runner docker executor, main as of 2026-10-11; real runner unverified. Fleet: 12 files, 0 findings.

**SH-CI-29 (MUST) In GitLab scripts double-quote every `$CI_*`, `${CI_*}` and `$GITLAB_USER_*` expansion, pass `--` before a value used as a path or ref, and never place one inside `eval`, `sh -c "..."` or `bash -c "..."` text (pass it as a positional: `sh -c 'echo "$1"' -- "${CI_COMMIT_TITLE}"`).**
- Why: the runner exports variables as environment, so only the shell can inject; `CI_COMMIT_MESSAGE`, `_TITLE`, `_REF_NAME`, `CI_MERGE_REQUEST_TITLE` carry author text.
- Verify: `gl-extract.py` + `shellcheck -s sh` (SC2086, SC2070) and `grep -rnE -e 'eval[[:space:]]+[^#]*[$][{]?(CI_|GITLAB_USER)' -e '(sh|bash) -c[[:space:]]+"[^"]*[$][{]?(CI_|GITLAB_USER)' --include='*.yml' .`
- RUN: yes, V5 (plant SC2086 x3 and SC2070, exit 1; twin exit 0), V7 (plant 2 lines exit 0; twin exit 1).
- Scope: GitLab CI; the taint list is asserted (not in GitLab's docs). Fleet: 0.

**SH-CI-30 (MUST) Never write `A || B && C` (or `A || B && C || D`) as a command list; use `if ...; then ...; elif ...; fi`, or group the alternative: `A || { B && C; }`.**
- Why: `&&` and `||` have equal precedence and are left-associative, so it parses as `(A || B) && C`; when `A` succeeds, `C` still runs (`apk add ... || apt-get update && apt-get install` runs `apt-get install` on alpine). ShellCheck 0.11.0 has no code for it (silent, also with `-o all`).
- Verify: `grep -rnP -e ' \|\| [^|&;(){}\x22\x27\x60\]]+ && ' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bash' --include='*.bats' .`
- RUN: yes, V4 (plant exit 0 with the line; twin and the `[[ a || b ]] && x` twin exit 1; ShellCheck blind, exit 0). Fleet: exactly 1 hit over every tracked shell/YAML file, `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28`.
- Scope: every shell (grammar, not a dialect issue). Candidate for SH-ERR to absorb; kept here because the only fleet hit is a CI template.

**Glob addition (not a rule): `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml` join the `shell-quality` globs**, `--allow-absent` in the liveness check (fleet: 1 live file, 0 in the checker root). Verify by reading: `git ls-files '.gitlab-ci.yml' '.gitlab-ci/*.yml'` across the fleet lists `grimoire-components/.gitlab-ci.yml` only. RUN: no (a count).

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/`. Tools: act 0.2.89, actionlint 1.7.12, zizmor 1.30.1, ShellCheck 0.11.0, task 3.54.0 (linux and `task.exe`), Git Bash 5.2.15, Windows 10.0.26200.9457, docker alpine:3.22, busybox:1.37, debian:12, shellzoo:deb12/deb13. Script: `verify-outputs-scope-and-taskfile-windows.sh`, transcript `out/verify.txt`. Exit codes: a grep is red when it exits 0 with output.

```
V1  SH-CI-23  cd outputs      && grep -rPn -e '<outputs pattern>' --include='*.yml' --include='*.yaml' .github/workflows
      .github/workflows/steps-out.yml:17:        run: echo "got=${{ steps.t.outputs.title }}"
      .github/workflows/needs-out.yml:23:        run: echo "got=${{ needs.a.outputs.title }}"        plant exit=0
    cd outputs/twin && (same command)                                                                    twin  exit=1
V2  SH-CI-24  grep -rliP -e 'fromjson\(...' ... | xargs -r grep -Pn -e '<matrix pattern>'
      .github/workflows/matrix-dyn.yml:26:        run: echo "item=${{ matrix.item }}"; echo "n=1"
      .github/workflows/matrix-dyn-obj.yml:26:        run: echo "item=${{ matrix.item.version }}"; echo "n=1"   plant exit=0
    twin (matrix-dyn-env.yml via env:, matrix-static.yml no fromJSON)                                    twin  exit=123 (empty)
V3  actionlint 1.7.12 -oneline on steps-out, needs-out, matrix-dyn, matrix-dyn-obj                      exit=0 x4 (blind)
V-act  act issues, canary files:  steps-out EXECUTED | needs-out EXECUTED | matrix-dyn EXECUTED | matrix-dyn-obj EXECUTED
       twins: steps-out-env inert (got=x"; touch ...; echo ") | needs-out-env inert | matrix-dyn-env inert | matrix-static item=alpha, item=beta
V4  SH-CI-30  grep -rnP -e ' \|\| [^|&;(){}\x22\x27\x60\]]+ && ' --include='*.yml' --include='*.yaml' plant
      plant/.gitlab-ci.yml:13:    - apk add --no-cache curl git tar || apt-get update && apt-get install -y curl git tar   plant exit=0
    twin (if/elif form) and orand/twin/ok.sh ([[ -n "$a" || -n "$b" ]] && echo ok; false || true)       twin  exit=1
    shellcheck -s sh -o all sc-or-and.sh                                                                  exit=0 (blind)
V5  SH-CI-28/29  gl-extract.py --sh plant/.gitlab-ci.yml | shellcheck -s sh -f gcc
      extracted.sh:5:15 SC2086, :7:14 SC2086, :10:9 SC2070 (error), :10:9 SC2086                         plant exit=1
    twin (quoted, positional, if/elif)                                                                    twin  exit=0
V6  SH-CI-28  alpine job with [[ ]] and an array, extracted, -s sh
      SC3010 (3:4), SC3030 (4:5), SC3054 (4:18)                                                           plant exit=1
    same extracted text, -s bash                                                                          exit=0 (green only if the image has bash)
V7  SH-CI-29  grep -rnE -e 'eval[[:space:]]+[^#]*[$][{]?(CI_|GITLAB_USER)' -e '(sh|bash) -c[[:space:]]+"[^"]*[$][{]?(CI_|GITLAB_USER)' --include='*.yml'
      evalplant/.gitlab-ci.yml:3: eval "git checkout $CI_COMMIT_REF_NAME"
      evalplant/.gitlab-ci.yml:4: sh -c "echo $CI_COMMIT_TITLE"                                           plant exit=0
    evaltwin (git checkout -- "${CI_COMMIT_REF_NAME}", sh -c 'echo "$1"' -- "${CI_COMMIT_TITLE}")         twin  exit=1
V8  SH-CI-20/25  python3 ../win-task-lint.py <dir>
      bad:  bad/.github/workflows/win.yml: job=test step#1 runs `task build` on Windows (non-bash shell); cmds use ['grep', 'head', 'uname']   exit=0, 1 line
      good (platforms-gated), good-bash (defaults.run.shell: bash), good-builtin (echo, mkdir, cp, ls)   exit=0, no output
      --all bad: 2 lines (task build, task version) | --all good, good-builtin: no output
    real task.exe 3.54.0 on the same Taskfiles (tw\bad, tw\good):
      cmd.exe parent, bad : build-step | "uname": executable file not found | os= | "grep": ... | "head": ... | task: Failed to run task "build" ... exit status 127 | rc=201
      cmd.exe parent, good: build-step | os=windows | rc=0
      Git Bash parent, bad: build-step | os=MINGW64_NT-10.0-26200 | 1 | rc=0
V9  SH-CI-27  grep -rnE -e 'platforms:[^#]*!' --include='Taskfile*.yml' ... tfneg/bad     plant: bad/Taskfile.yml:4:    platforms: ['!windows']  exit=0
    tfneg/good (platforms: [linux, darwin])                                                twin  exit=1
    task.exe 3.54.0: err:  invalid platform "!windows"  file: ...Taskfile.neg.yml:3:24   rc=102 (whole file refused)
V10 SH-CI-26  grep -rnE -e '[{][{][^}]*(FILE_PATH_SEPARATOR|PATH_LIST_SEPARATOR|joinEnv|fromSlash)' ... tfsep/bad
      bad/Taskfile.yml:5/6/7 (3 hits)  exit=0   |  tfsep/good (toSlash, ROOT_DIR)  exit=1
V11 GitLab runner emulation (gitlab/emu/run-emu.sh), see the table in Findings 3.2
V12 zizmor persona sweep: 312 runs, tables in Findings 1.3 (zfleet/scan.sh, agg2.py)
```

Not run, with reason: a real GitHub runner (needs a push and dispatch; act host mode is not the runner), a real GitLab Runner (the emulation transcribes `Finish()` and `writeCommands` from source; no runner binary or instance here), `win-task-lint.py` against a Taskfile with `includes:` of a `dir:`-style include (the fleet's included taskfiles were resolved, the corner is untested), macOS and BSD anything (no host: "unverified: read only"), the GitHub Windows runner's PATH for `bash` (unverified).

## Exemplar evidence

Counts from `exemplar-outputs.sh` over the 38 workflow-bearing corpus repos ([out/q1-exemplar-counts.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-exemplar-counts.txt); SHAs in `shell-audit/scratch/exemplar-shas.md`):

| Rule | Violates | Satisfies or contradicts |
|---|---|---|
| SH-CI-23 | 114 run-body lines in 17 of 38 repos. Real: `acmesh-official__acme.sh@807da6498377:.github/workflows/Solaris.yml:61`, `Windows.yml:76`, `Hurd.yml:49` (`echo "TestingDomain=${{steps.tunnel.outputs.server}}" >> $GITHUB_ENV`, the value is a tunnel hostname from a third-party action); `nvm-sh__nvm@b1b3a0038c06:.github/workflows/nodejs-org.yml:63,95,96` (`BRANCH="nvm-${{ steps.version.outputs.tag }}"`, `FORK_OWNER="${{ steps.fork.outputs.fork_owner }}"`); `JanDeDobbeleer__oh-my-posh@b0a8acd4d402:.github/workflows/publish-mcp.yml:36,37` and `release.yml:49` (`-X '...Version=${{ needs.changelog.outputs.ver... }}'`); cargo-dist generated `atuinsh__atuin@56525ac6a7a9:.github/workflows/release.yml:149` (`dist build ${{ needs.plan.outputs.tag-flag }}`). False positives from `with:` continuation lines: `jdx__mise@19e8c8f0d03d:.github/workflows/docker.yml:163-165`, `atuin release.yml:173` | none found passing the value through `env:` in the sampled files; counter-example for the whole rule: most of these outputs are version strings from the repo's own jobs |
| SH-CI-24 | 35 lines in 6 repos: `pyenv__pyenv@d28b750767d4:.github/workflows/modified_scripts_build.yml:92,112,119` (`python-version: ${{fromJson(needs.discover_modified_scripts.outputs.versions)}}`, then `pyenv --debug install ${{ matrix.python-version }}`; the list is derived from files changed in a PR); `nvm-sh__nvm@b1b3a0038c06:.github/workflows/nvm-install-test.yml:55,67,70` (`ref: ${{ fromJson(needs.matrix.outputs.matrix) }}`, then `REF="${{ matrix.ref }}"`); `jdx__mise@19e8c8f0d03d:.github/workflows/registry-impl.yml:190,229,234` (numeric tranche list, benign) | `rust-lang__rustup@61271d00a979` has a literal matrix and `fromJSON('[...]')` only in an `if:`: the narrowed file filter correctly leaves it out (the first draft of the filter listed 61 lines there) |
| SH-CI-20 | not applicable: no exemplar calls Task | n/a |
| SH-CI-28/29/30 | no exemplar has GitLab CI | n/a |

Fleet (`/home/mherwig/dev`, 26 first-party dirs plus the mirror family, [out/q1-fleet-counts.txt](file:///home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/out/q1-fleet-counts.txt)):

| Rule | Violates | Satisfies |
|---|---|---|
| SH-CI-23 | grimoire 6 lines (4 real: `release.yml:146,204,268,299`, cargo-dist generated), ocx 8 (`release.yml:151,209,285,316` generated; `build-windows-shims.yml:210` authored, benign path), e2e-mirror 1 (`mirror-signing.yml:196`, authored), mirror family 15 (`needs.discover.outputs.versions`, generated) | `www-setup`, `setup-ocx`, `index` and the other repos with workflows: 0 |
| SH-CI-24 | `e2e-mirror@a4c9fc67afb5:.github/workflows/mirror-signing.yml:99,102` and 15 sibling workflows (32 `matrix.version.version` lines, e.g. `mirror-bazelbuild@713abea9fbb8:.github/workflows/mirror-bazelisk.yml:99,102`; generated: "DO NOT EDIT - re-run `ocx-mirror package pipeline generate ci`") | `grimoire`/`ocx` `release.yml` matrices come from `dist plan` (simple names zizmor catches at Medium) |
| SH-CI-20 | none at the MUST scope; advisory: `ocx@4ded080feed4:test/taskfile.yml` 14 tasks, `ocx:website/schema.taskfile.yml` 6, `index/taskfile.yml` 4, `setup-grimoire/Taskfile.yml` 3 (`out/q2-lint-fleet-all.txt`) | `ocx@4ded080feed4:taskfiles/bazel.taskfile.yml` `test:unit` has `platforms: ['linux']` and `verify-deep.yml` steps carry `if: matrix.job.name == 'Linux'` (belt and braces); `setup-grimoire@...:Taskfile.yml` `test:pester` runs `pwsh -Command` and is portable |
| SH-CI-27 | none | none uses negation |
| SH-CI-28 | none | `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-enrich.sh:18-35` and `gitlab-stats-seed.sh:30-83` are POSIX sh on the alpine default (`command -v`, `case`, no arrays) |
| SH-CI-29 | none | every `$CI_*` in a script is double-quoted (`gitlab-ci.yml:82,96,117,122-126`); `grimoire-components@6fd8054116af:.gitlab-ci.yml:35,37` guards the only tag use with a semver regex |
| SH-CI-30 | `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28` | `gitlab-enrich.sh:18-22` and `gitlab-stats-seed.sh:51-57` use the if/elif form |

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Treats "I already moved the title into `env:` in job A" as the end of the fix, then interpolates `needs.a.outputs.title` in job B. | SH-CI-23 grep |
| Believes `matrix.*` is always safe because "matrices are constants"; writes `fromJSON(needs.x.outputs.y)` and then `${{ matrix.item.field }}` in `run:`. | SH-CI-24 two-step grep |
| Assumes a clean zizmor run (the default `regular` persona, `--min-severity medium`) means no injection; it hides outputs (informational) and dotted matrix access (1.30.1). | The greps; do not infer from exit 0 |
| Reaches for `--persona=auditor` to be thorough and gets 150 findings, 114 of them constants. | Gate stays `regular`/`medium` |
| Writes Taskfile `cmds` with `uname`, `sed`, `grep`, `head`, `wc`, `date` as if Task shipped a POSIX userland; works on Linux CI, dies with `exit status 127` on a Windows pwsh step. | `win-task-lint.py` |
| Assumes Task's Windows coreutils are GNU: `ls -la`, `find . -name x` with `./` output, `tar --version`, `xargs echo`. | Reading heuristic; SH-CI-25 list |
| Writes `platforms: ['!windows']` (negation exists in other tools). | SH-CI-27 grep; rc 102 |
| Writes Windows paths with backslashes in `cmds` (`.\scripts\x.bat`, `{{.FILE_PATH_SEPARATOR}}`) or `./x.bat`. | SH-CI-26 grep; `sub\\x.bat` or `dir:` |
| Calls `bash -c` from a Taskfile on Windows and gets WSL (this host) or Git Bash (runner, unverified). | SH-CI-20 text; no check |
| Adds `set -euo pipefail` to every GitLab `script:` as in GitHub tutorials; errexit is already on and `pipefail` is already on where the shell has it. Harmless but it hides the real trap, the image's shell. | SH-CI-28 extractor + `-s sh` |
| Writes bash in a GitLab job on an alpine image because "GitLab uses bash". | SH-CI-28 `shellcheck -s sh` (SC3010, SC3030) |
| Uses `$CI_COMMIT_MESSAGE` or `$CI_COMMIT_REF_NAME` unquoted, or inside `eval`/`sh -c "..."`, assuming GitLab substitutes safely. | SC2086; SH-CI-29 grep |
| Writes `A || B && C` as "try A, else B then C" (`apk ... \|\| apt-get update && apt-get install`). | SH-CI-30 grep (ShellCheck is blind) |
| Copies GitHub's `${{ }}` model into GitLab (`${{ ... }}` does not exist; `$VAR` is the shell's). | Reading heuristic |

## Contested / evolving

- **Is a syntax-based MUST for outputs too broad?** zizmor files `needs.*.outputs.*` under Informational/Low-confidence by design ("may be attacker-controlled in obscure cases"); most fleet and exemplar sites are version strings from the same repo's jobs. The program takes the syntax MUST because the cost is one `env:` line and an agent cannot decide cross-job taint. A team that prefers precision can run zizmor at `informational` and post-filter; the numbers above (28 against 18 TI) show the price. Trend: zizmor keeps adding dataflow (the `Capability` FST in 1.30.1); the outputs rule may relax when it models job outputs. As of 2026-10-11 it does not.
- **zizmor's dotted-matrix miss** is a bug-shaped behaviour in 1.30.1; unreported upstream by this program (the program files nothing). If a later release fixes it, SH-CI-24 narrows to a Limits note.
- **Task's coreutils are still growing** ("This is the start. We want to add more with time", [blog](https://taskfile.dev/blog/windows-core-utils)) and the default may become enabled on every platform ("We'll consider making this enabled by default on all platforms"). The absent set in SH-CI-20 is a measurement of 3.54.0 and shrinks with each release; re-run the 68-name probe on each task bump. If `TASK_CORE_UTILS` goes on everywhere, `ls`/`find` output differences reach Linux too.
- **GitLab's own docs and its runner source disagree** on multi-command entries (docs: "only the last command's failure ... is reported"; source: errexit on). Unresolved here (no runner); the rule set is written to hold under both.
- **GitLab docs are silent on which predefined variables carry user text.** The list in SH-CI-29 is a reading; it may be tightened if GitLab publishes one.
- **Where `A || B && C` belongs:** SH-CI row now, SH-ERR or a general shell-dialect row later; ShellCheck 0.11.0 has no check and none is announced as of this date (not searched beyond the local run).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/audit/template_injection.rs | zizmor 1.30.1 audit source | 1.30.1 | The severity/confidence/persona table per context; outputs are Informational/Low |
| https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/models/workflow/matrix.rs | zizmor matrix model | 1.30.1 | `expands_to_static_values` explains the dotted-access false negative |
| https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/usage.md | zizmor usage docs | 1.30.1 | Personas, exit codes 11-14, `--min-severity` |
| https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/audits.md | zizmor audit catalogue | 1.30.1 | `template-injection` text: verbatim expansion, `${{ env.X }}` is not a fix |
| https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md | GitHub secure-use guide | 2026 main | "Use an intermediate environment variable"; no mention of outputs as untrusted |
| https://github.com/go-task/task/blob/v3.54.0/CHANGELOG.md | Task changelog | 3.54.0, 2026-10-01 | 3.45.3 builtin coreutils, 3.45.4 Windows `rm -f`, 3.51.1 separator variables and `joinEnv` |
| https://taskfile.dev/blog/windows-core-utils | Task blog post | 2025-09 | The 14 utilities, u-root origin, `TASK_CORE_UTILS` default |
| https://taskfile.dev/docs/reference/templating | Task templating reference | 3.54 | `FILE_PATH_SEPARATOR`, `PATH_LIST_SEPARATOR`, `joinEnv`, `toSlash`, `fromSlash`, `ROOT_DIR` |
| https://taskfile.dev/docs/guide/platforms | Task platforms guide | 3.54 | `platforms:` values, skip-without-error, embedded interpreter, no negation text |
| https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/bash.go | GitLab Runner bash shell generator | main, fetched 2026-10-11 | Shell detection order, `set -o pipefail` probe, `set -o errexit`, the `eval` subshell |
| https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/abstract.go | GitLab Runner script writer | main, fetched 2026-10-11 | `writeCommands`, `writeUserScript`, `release:` variable expansion |
| https://docs.gitlab.com/ci/yaml/script/ | GitLab `script` keyword docs | 2026 | "only the last command's failure or success is reported", `|` and `>` blocks |
| https://docs.gitlab.com/runner/shells/ | GitLab Runner shells docs | 2026 | "Sh/Bash is the default shell used on all Unix based systems" |
| https://docs.gitlab.com/ci/variables/ | GitLab CI/CD variables docs | 2026 | Single shell context for before_script and script, separate after_script, quote variable values |
| https://docs.gitlab.com/ci/variables/predefined_variables/ | GitLab predefined variables | 2026 | Confirms no per-variable untrusted-input warning exists |

## Appendix: win-task-lint.py

SH-CI-20 and SH-CI-25 checker (python3, PyYAML). Usage: python3 win-task-lint.py REPO_ROOT, add --all for the advisory list.

```python
#!/usr/bin/env python3
"""SH-CI-20 / SH-CI-24 checker. Usage: win-task-lint.py [--all] <repo-root>...
Default (MUST scope): report tasks that a `task NAME` call in a Windows-runner step with a non-bash shell
reaches, whose cmds use a command ABSENT from a plain Windows PATH under task 3.54.0 (measured), and that are not
platforms-gated. --all (SHOULD scope): report every ungated task in every Taskfile. Output is the violation; empty = pass.
Needs PyYAML (no python3 -I)."""
import glob, os, re, sys, yaml
ABSENT = set("uname sed grep egrep awk head tail wc cut tr uniq which env date sha256sum md5sum readlink realpath dirname basename tee diff sleep id nproc stat du ln install xxd od unzip zip make sh jq wget".split())
DIFFERENT = set("sort timeout".split())   # exist on Windows but are a different program
SPLIT = re.compile(r'\|\||&&|[|;&\n]|\$\(|`')
def words(cmd):
    for seg in SPLIT.split(cmd):
        t = seg.strip().lstrip('({!').strip()
        t = re.sub(r'^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+', '', t)
        if not t or t.startswith('#'): continue
        w = t.split()[0].strip('\'"')
        if w in ('if', 'then', 'do', 'while', 'else', 'elif'): 
            rest = t.split(None, 1)
            if len(rest) > 1: w = rest[1].split()[0].strip('\'"')
            else: continue
        yield w
def load_tasks(root):
    out = {}
    def add(path, prefix):
        try: d = yaml.safe_load(open(path)) or {}
        except Exception: return
        for n, t in (d.get('tasks') or {}).items():
            out[prefix + n] = (t if isinstance(t, dict) else {'cmds': [t] if isinstance(t, str) else []}, path)
        for ns, inc in (d.get('includes') or {}).items():
            p = inc if isinstance(inc, str) else (inc or {}).get('taskfile')
            if p: 
                p = os.path.join(os.path.dirname(path), p)
                if os.path.isdir(p): 
                    for c in ('Taskfile.yml', 'taskfile.yml'):
                        if os.path.exists(os.path.join(p, c)): p = os.path.join(p, c); break
                if os.path.exists(p): add(p, prefix + ns + ':')
    for c in ('Taskfile.yml', 'taskfile.yml', 'Taskfile.yaml'):
        if os.path.exists(os.path.join(root, c)): add(os.path.join(root, c), ''); break
    return out
def bad_words(task, tasks, prefix_ns, seen):
    res = []
    if task.get('platforms'): return res
    for c in task.get('cmds') or []:
        if isinstance(c, str): cmd, plat, ref = c, None, None
        else: cmd, plat, ref = c.get('cmd'), c.get('platforms'), c.get('task')
        if plat: continue
        if ref:
            name = ref if ref.startswith(':') else prefix_ns + ref
            name = name.lstrip(':')
            if name in tasks and name not in seen:
                seen.add(name); res += bad_words(tasks[name][0], tasks, name.rsplit(':', 1)[0] + ':' if ':' in name else '', seen)
            continue
        for w in words(cmd or ''):
            if w in ABSENT: res.append(w)
    for d in task.get('deps') or []:
        name = d if isinstance(d, str) else (d or {}).get('task')
        if name and name in tasks and name not in seen:
            seen.add(name); res += bad_words(tasks[name][0], tasks, '', seen)
    return res
def windows_calls(root):
    calls = []
    for f in sorted(glob.glob(os.path.join(root, '.github/workflows/*.y*ml'))):
        try: doc = yaml.safe_load(open(f))
        except Exception: continue
        if not isinstance(doc, dict): continue
        wf = ((doc.get('defaults') or {}).get('run') or {}).get('shell')
        for jid, job in (doc.get('jobs') or {}).items():
            if not isinstance(job, dict): continue
            if 'windows' not in yaml.dump({'r': job.get('runs-on'), 's': job.get('strategy')}).lower(): continue
            jd = ((job.get('defaults') or {}).get('run') or {}).get('shell') or wf
            for i, st in enumerate(job.get('steps') or []):
                run = st.get('run') if isinstance(st, dict) else None
                if not run: continue
                shell = str(st.get('shell') or jd or 'pwsh')
                cond = str(st.get('if') or '')
                if re.search(r"==\s*'(?:Linux|macOS|Darwin)'|!=\s*'Windows'", cond): continue   # step gated away from Windows
                if shell.startswith('bash'): continue
                for m in re.finditer(r'(?:^|[\s;&|(])task\s+((?:-[^\s]+\s+)*)([A-Za-z0-9_:.-]+)', run):
                    calls.append((f, jid, i, m.group(2)))
    return calls
args = [a for a in sys.argv[1:] if a != '--all']; allmode = '--all' in sys.argv
for root in args:
    tasks = load_tasks(root)
    if allmode:
        for n, (t, p) in sorted(tasks.items()):
            bw = bad_words(t, tasks, n.rsplit(':', 1)[0] + ':' if ':' in n else '', {n})
            if bw: print(f'{p}: task {n} uses {sorted(set(bw))} with no platforms:')
    else:
        for f, jid, i, name in windows_calls(root):
            if name in tasks:
                bw = bad_words(tasks[name][0], tasks, name.rsplit(':', 1)[0] + ':' if ':' in name else '', {name})
                if bw: print(f'{f}: job={jid} step#{i} runs `task {name}` on Windows (non-bash shell); cmds use {sorted(set(bw))}')
```

## Appendix: gl-extract.py

SH-CI-28/29 extractor (python3, PyYAML). Usage: python3 gl-extract.py --sh FILE.yml > extracted.sh, then shellcheck -s sh -f gcc extracted.sh.

```python
#!/usr/bin/env python3
"""Extract every before_script/script/after_script entry of a GitLab CI file into one shell file for ShellCheck.
usage: gl-extract.py [--sh|--bash] FILE.yml > out.sh      ({{placeholder}} template tokens are blanked first)
Each job is wrapped in a function so SC2164-style flow noise from concatenation is limited; line numbers are not preserved
(a '# job:key' comment precedes each entry). Needs PyYAML (no python3 -I)."""
import re, sys, yaml
shell = 'bash' if '--bash' in sys.argv else 'sh'
path = [a for a in sys.argv[1:] if not a.startswith('--')][0]
text = re.sub(r'\{\{[^}]*\}\}', '', open(path).read())
doc = yaml.safe_load(text) or {}
print(f'#!/bin/{shell}')
for job, body in doc.items():
    if not isinstance(body, dict): continue
    for key in ('before_script', 'script', 'after_script'):
        v = body.get(key)
        if v is None: continue
        for entry in ([v] if isinstance(v, str) else v):
            if isinstance(entry, list): entry = '\n'.join(map(str, entry))
            print(f'# {job}:{key}')
            print(str(entry).rstrip('\n'))
```
