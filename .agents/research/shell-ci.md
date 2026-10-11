---
title: "CI shells: run steps, container jobs, runner files, Taskfile cmds and GitLab scripts"
topic: "CI shells (family SH-CI), wave 2 of the shell-scripting-across-OS/shells research program, revised in wave 3 (outputs and matrix scope, Taskfile on Windows, GitLab CI)"
model: sonnet
id_family: SH-CI
consolidates:
  - shell-ci/run-steps-and-taskfiles.md
  - shell-ci/outputs-scope-and-taskfile-windows.md
reads_for_cross_references:
  - shell-frame.md
  - shell-topic-map.md
  - shell-audit/ (seven audits)
  - shell-gate.md
  - shell-gate/lint-format-profile.md
  - shell-dialect.md
  - shell-dialect/floors-and-shebangs.md
  - shell-dialect/bash-version-gate.md
  - shell-errexit.md
  - shell-pwsh.md
  - shell-pwsh/errors-and-native.md
date: 2026-10-11
revised: 2026-10-11
---

# CI shells: run steps, container jobs, runner files, Taskfile cmds and GitLab scripts

Scope: the shell that runs inside a GitHub Actions `run:` step (Linux, macOS, Windows, container jobs, composite actions), the files the runner reads back (`$GITHUB_ENV`, `$GITHUB_OUTPUT`, `$GITHUB_PATH`), the shell that runs a Taskfile `cmds` item (including on Windows), and the shell a GitLab CI `script:` block runs under. Out of scope and owned elsewhere: the ShellCheck/shfmt invocation (SH-GATE), `#!/bin/sh` and bash-floor rules for script files (SH-DIAL), PowerShell language rules (PS-*), pipefail semantics outside CI (SH-ERR), the generic injection program (SH-SEC).

Evidence tags: **normative** (runner source or vendor docs), **measured** (a run in this program, 2026-10-11), **emulated** (a transcription of a source into a script, not the real program), **codified** (a fleet/exemplar convention), **argued**, **asserted**. Run labels: `V1..V23` are the runs in [the first sub-artifact](shell-ci/run-steps-and-taskfiles.md) (section "Verification runs"); `N1..N12` and `N-act` are the runs in [the second sub-artifact](shell-ci/outputs-scope-and-taskfile-windows.md) (its own `V1..V12`, renamed here so the two series do not collide); `C1..C13` are the first consolidation's runs and `C14..C18` this revision's, both listed under [Verification runs](#verification-runs) below. No macOS host exists here, so every macOS or BSD claim is marked "unverified: read only". Nothing here ran on a real GitHub or GitLab runner; where a claim rests on runner source, it says so.

## Verdict

Decisions. Each names the script kind it binds.

1. **Workflow `run:` steps (Linux, macOS):** an unspecified shell is `bash -e {0}` with no pipefail. A step that contains a pipeline runs with pipefail on (SH-CI-01, MUST). Declaring the shell once per workflow or job is the way to get there and is a SHOULD (SH-CI-02), because 482 fleet steps would otherwise be flagged for one-line glue.
2. **Steps in `container:` jobs:** the unspecified shell is `sh -e {0}` inside the image, which is dash on Debian/Ubuntu images. Set `shell: bash` or write POSIX (SH-CI-04, MUST). New finding; it was not in the map.
3. **Steps with `shell: sh`:** bash syntax is forbidden and `pipefail` only through the SH-DIAL-07 probe, never bare (SH-CI-03, MUST). The probe silently leaves pipefail off on dash 0.5.12-6ubuntu5, so a step that needs pipefail uses `shell: bash`.
4. **Untrusted `${{ }}` in `run:`/`script:` bodies (all shells):** the attacker-reachable set goes through `env:` (SH-CI-07, MUST). The set includes every `steps.*.outputs.*` and `needs.*.outputs.*` value (SH-CI-23, MUST) and every `matrix.*` value of a matrix built from an expression (SH-CI-24, MUST); settled by the second round: act executed the payload through a two-job output hop whose first hop was the safe `env:` form (N-act), so the taint survives it, and a literal matrix stays out because it is constants. `${{ env.X }}` is the same expansion and is never a fix (SH-CI-08, MUST). The default beyond that set is to route every value through `env:`; it stays a default, not a MUST, so literal-matrix, sha and runner values are not findings. Generated files are fixed in their generator. This does not relax python-quality PY-GATE-05, which stays a blanket MUST for Python trees (`rules/python-quality/ci-gate.md:118`).
5. **Runner files:** no `::set-output`/`::set-env`/`::add-path`/`::save-state` (SH-CI-09, MUST); a random delimiter for multiline values (SH-CI-10, MUST); Windows PowerShell 5.1 writes env files only with `Out-File -Encoding utf8 -Append`, never mixed with `>>`, never bare `Add-Content` (SH-CI-11, MUST). The "runner cannot parse UTF-16" rationale in the sub-artifact was refuted (C7): a lone `>>` decodes, mixing and `Add-Content` corrupt.
6. **PowerShell steps:** the native-call guard is owned by PS-ERR-03 (MUST, run-step guard; it cites PS-ERR-01 for the per-call check); SH-CI keeps a pointer row (SH-CI-12, no level of its own, map X9) and the sub-artifact's MUST is dropped.
7. **macOS legs:** bodies use bash 3.2.57 syntax (SH-CI-13, MUST). Git Bash on Windows (SH-CI-14) and the `ubuntu-latest` to 26.04 rollout (SH-CI-15, dated, expires 2026-11-19) are SHOULDs.
8. **Taskfile `cmds`:** the interpreter is mvdan/sh, not bash. Pipefail only through `set: [pipefail]` or inline in the same cmd item (SH-CI-17, MUST); four constructs are banned (SH-CI-18, MUST); `read -p` is fine and is not a Taskfile rule. `platforms:` takes GOOS or GOOS/GOARCH values and never a negation: `['!windows']` makes the whole Taskfile fail to load, rc 102 (SH-CI-27, MUST). On Windows, Task 3.45.3+ ships Go core utilities (`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`; u-root, not GNU) and resolves every other command from the parent's PATH; template output is pasted into the command text, so a backslash is eaten and `;` splits (SH-CI-26, SHOULD). A task that needs POSIX tools carries `platforms:` or a Windows alternative (SH-CI-20 for tasks a Windows non-bash CI step reaches, SH-CI-25 for any Taskfile; both SHOULD, see decision 12 for why SH-CI-20 is not a MUST).
9. **The CI gate:** actionlint runs at default severity under SH-GATE-01 and SH-GATE-19 (not `--severity=warning`; ocx's current floor is overturned). SH-CI owns only what actionlint cannot see: zizmor in its default persona `regular` at `--min-severity medium`, plus the `${{ env.X }}`, outputs and dynamic-matrix greps (SH-CI-21, MUST). Settled by the second round: pedantic and auditor add no true positive at medium (18 template-injection findings under all three personas over the 26 first-party dirs) and 7.8 times the noise at low (140 against 18); only `--min-severity informational` shows outputs, and it adds 115 findings of other audits (125 in all) that zizmor cannot filter out (no audit selector). Persona and floor stay as they were.
10. **Long inline blocks:** 10 or more lines, or any function, trap or `case`, move to a script file (SH-CI-22, SHOULD).
11. **GitLab CI `script:` blocks (new):** the runner writes errexit on and pipefail on where the shell has it, so the GitHub trap of SH-CI-01 does not exist there, and the dialect is the image's shell: bash when the image has one, else sh, so a `node:*-alpine` job is busybox ash (SH-CI-28, MUST). GitLab variables are environment variables, not template text, so the injection routes are the shell's own: double-quote every `$CI_*` and never place one inside `eval` or `sh -c "..."` text (SH-CI-29, MUST). The one fleet defect is shell grammar, not GitLab: `apk add ... || apt-get update && apt-get install` runs `apt-get install` on alpine and ShellCheck 0.11.0 is silent (SH-CI-30, MUST, any shell). The globs `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml` join the `shell-quality` globs (`--allow-absent`; fleet: 1 live file). No row for errexit or pipefail on GitLab: the runner provides both.
12. **Windows task runs and the hosted-runner PATH (new, a correction):** the second round raised SH-CI-20 to a MUST on the premise that a Windows pwsh or cmd step cannot find `uname sed grep head ...` (38 of 68 probed names absent from a plain Windows PATH, measured with task 3.54.0 on the Windows host: rc 201, `"uname": executable file not found`). The premise holds for a developer machine and for a self-hosted runner without Git's Unix directories; it does not hold as a statement about GitHub-hosted images. Their `Install-Git.ps1` passes `/o:PathOption=CmdTools`, and the Git for Windows installer (`install.iss`) answers that option by appending `\cmd`, `\mingw64\bin` and `\usr\bin` to the machine PATH; `Add-MachinePathItem` then prepends `C:\Program Files\Git\bin`; and runner-images issue 1525 (2020-12-28) records the runner team's decision to keep Git for Windows' bash on the PATH, after the Git for Windows maintainer conceded that its tools stay there too (C14; source read on main, not run on a runner). With those directories appended after `System32` the same failing Taskfile passes from a Windows PowerShell parent (rc 201 to rc 0, `uname` resolves to `Git\usr\bin\uname.exe`), while `find`, `sort`, `timeout` and `tar` stay the Windows programs. The audit sentence "only `git` on PATH, not the Unix tools" (`shell-audit/platform-matrix.md:267`) is therefore wrong. SH-CI-20 is held at SHOULD with the checker kept; promote it to MUST when the real-runner probe shows the tools absent, and for self-hosted Windows runners. SH-CI-14's clause about MSYS tools in pwsh and cmd steps is corrected the same way.
13. **Documented gaps (no answer exists yet, each is a boundary of the rules above):**
    - **No real runner was probed.** Open on a GitHub-hosted runner: the default shell inside a `container:` job, whether workflow and job `defaults.run.shell` merge, whether the ubuntu-26.04 runner image (not the container) ships uutils, Git Bash 5.3.15 path conversion, the 5.1 env-file mixing, and the Windows hosted PATH of decision 12. Nothing here can push or dispatch.
    - **No real GitLab Runner was probed.** The GitLab claims transcribe `Finish()` and `writeCommands` from `shells/bash.go` and `abstract.go` on main (commit id unresolved) and run them on real shells. GitLab's docs ("only the last command's failure or success is reported" for a combined block) and the source (errexit on) disagree; the rules hold under both. Which `CI_*` variables carry author text is a reading, not a GitLab list.
    - **zizmor 1.30.1 has a false negative this program did not report upstream:** dotted member access on a dynamic matrix dimension (`matrix.item.version`) stays at 0 findings at every severity under the regular persona while the payload executes (N-act); the cause is read in `matrix.rs` (`expands_to_static_values` compares the whole context to the dimension path). The SH-CI-24 grep carries it; if a later release fixes it, SH-CI-24 narrows to a Limits note. It reports `steps.*.outputs` and `needs.*.outputs` only at informational (severity Informational, confidence Low).
    - **The one-line `script: "${{ ... }}"` blind spot** of SH-CI-07 is shared by SH-CI-23 and SH-CI-24: the greps skip every `key: value` line except `run:` by construction, and zizmor is the second check.
    - **`win-task-lint.py` was not run against a dir-style `includes:` taskfile**; the fleet's included taskfiles resolved, the corner is untested.

## The ruleset

30 rules: 20 MUST, 9 SHOULD, 1 pointer row (SH-CI-12). SH-CI-01..22 are the first consolidation's rules, kept at their IDs; SH-CI-23..30 are new. Grouped by the check that catches them, so the IDs are not in numeric order within a section: sections B, E and G carry the new IDs. Every verification names a directory operand and prints the violation (empty output means pass); a pipeline ending in `xargs -r` is judged by its output, not its exit status (it exits 123 when the inner grep finds nothing). "Watched red" means the check was run against a planted violation and its good twin (plant red, twin green); the transcripts are under [Verification runs](#verification-runs).

### A. Which shell a step gets (catcher: the narrow grep, the broad grep, the sh grep, job-shell-lint.py)

**SH-CI-01 (MUST) A `run:` step that contains a pipeline runs with pipefail on: give it `shell: bash`, inherit `defaults.run.shell: bash`, or start the body with `set -o pipefail`.**
- Why: an unspecified shell is `bash -e {0}` (errexit, no pipefail); `shell: bash` is `bash --noprofile --norc -e -o pipefail {0}` ([ScriptHandlerHelpers.cs](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs), [supported-shells.md](https://github.com/github/docs/blob/main/data/reusables/actions/supported-shells.md)). `a | b` then hides a failing `a`: under act the default-shell step printed REACHED and exited 0, the `shell: bash` twin exited 1 (V2).
- Verify (output is the violating step):
  `grep -rLZ -Pz -e '\n[ ]*defaults:[ ]*\n[ ]*run:[ ]*\n[ ]*shell:' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r -0 grep -Pzo -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\brun:)(?!(?:(?!\n[ ]*-[ ]).)*?\bshell:)(?=(?:(?!\n[ ]*-[ ]).)*?\n(?![ ]*(?:-[ ]+)?name:)[^\n]*[^\x7c\n] \x7c [^\x7c\n])(?!(?:(?!\n[ ]*-[ ]).)*?pipefail)(?:(?!\n[ ]*-[ ]).)*'`
- Limits: a file with any `defaults.run.shell` is skipped whole (a `defaults` of `sh` or `pwsh` hides violations); a pipeline in a default-`pwsh` Windows step is a false positive (PowerShell pipelines are not bash pipelines).
- Evidence: normative (runner source) and measured. Watched red: yes, V1 + V2 (`check-shell.sh`, plants red, twins green) and C1 (plant 1 hit, twin 0). Fleet: 22 steps.
- Scope: bash on Linux and macOS runners, all versions. Windows default is pwsh and is not covered.

**SH-CI-02 (SHOULD) Declare the shell once: `defaults.run.shell: bash` at workflow level, at job level when the job has Windows legs, and an explicit `shell: pwsh` on PowerShell steps.**
- Why: with no declaration the same `run:` is `bash -e` on Linux/macOS, `pwsh` on Windows and `sh -e` in a container; one declaration makes the dialect reviewable once. Defaults do not reach composite steps (see SH-CI-06). Homebrew sets `defaults.run.shell: bash -xeuo pipefail {0}`.
- Verify: the SH-CI-01 command without the pipeline and pipefail lookaheads: `grep -rLZ -Pz -e '\n[ ]*defaults:[ ]*\n[ ]*run:[ ]*\n[ ]*shell:' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r -0 grep -Pzo -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\brun:)(?!(?:(?!\n[ ]*-[ ]).)*?\bshell:)(?:(?!\n[ ]*-[ ]).)*'`
- Evidence: normative (ScriptHandler.cs: `defaults.run.shell` shares the step code path) and codified. Watched red: yes, V1 (`plants/bad` any-step mode: 4 lines; `good` empty). Fleet: 482 steps, so advisory.
- Scope: all runners.

**SH-CI-03 (MUST) A step's body is written in the dialect of its shell. Under `shell: sh` use no bash syntax, and enable `pipefail` only with the one-line probe `(set -o pipefail) 2>/dev/null && set -o pipefail`, never bare. A step that depends on pipefail uses `shell: bash`.**
- Why: `sh` is dash on the Ubuntu runners; dash 0.5.12-6ubuntu5 (ubuntu-24.04) exits 2 on `set -o pipefail`, 0.5.12-12ubuntu3 (ubuntu-26.04) accepts it (V13). Bare pipefail aborts dash and posh with nothing after; the probe is reached on all 11 interpreters tested but leaves pipefail off on dash and posh (C3: `false | true` then REACHED, exit 0). See SH-DIAL-07 for the probe and SH-DIAL-08 for the SC3040 suppression.
- Verify: `grep -rn -e 'shell: sh$' --include='*.yml' --include='*.yaml' .github/workflows` lists each `sh` step (a matrix key named `shell: sh` is a false positive: the 17 hits in the mirror workflow family and e2e-mirror are `matrix.include` values); then lint the bodies with actionlint at default severity, which reports SC3010, SC3030 and SC3040 under the `sh` dialect (V23; SC3040 on 0.11.0 per floors-and-shebangs.md section 5.3).
- Evidence: measured on 11 shells and two Ubuntu images, normative (POSIX special-builtin error rule cited in floors-and-shebangs.md). Watched red: yes, V13 (grep plant/twin + `run-m04.sh` on ubuntu:24.04 and 26.04), V23 (`lint-bad.yml` exit 1, `lint-good.yml` exit 0), C3.
- Scope: `shell: sh`; dash 0.5.12-6ubuntu5 versus -12ubuntu3; posh 0.14.1. Fleet: 0 step-level `shell: sh`.

**SH-CI-04 (MUST) In a job with `container:`, set `shell: bash` on every step whose body uses bash syntax (the image must then contain bash), or write the body in POSIX sh.**
- Why: the runner picks `sh -e {0}` inside the image when no shell is given ([ScriptHandler.cs:303](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs); [actions/runner#1533](https://github.com/actions/runner/issues/1533), closed with "specify shell: bash"). On debian:12 an `if [[ ... ]]` prints `[[: not found` and the branch is skipped silently while the step still passes (the failing test sits in an `if` condition, so errexit never trips); alpine's busybox ash accepts `[[`, so the same body behaves differently per image (C4).
- Verify (output is one line per violating step): `python3 job-shell-lint.py .github/workflows` (source in the appendix; needs PyYAML, so no `python3 -I`). It reports a container job, step with no `shell:` (step, job or workflow default) and a bash construct in the body (`[[`, `pipefail`, `declare`, `mapfile`, `$'`, `<(`, `source`, `((`, `${x,,}`, `${x^^}`, `${x/`).
- Limits: a regex heuristic; false positives accepted, a bash construct hidden behind `eval` is missed.
- Evidence: normative (runner source) and measured. Watched red: yes, C4 (`jobs/bad` red, `jobs/good` silent; container-body.sh on debian:12 and alpine:3.22). Fleet: 6 container sites listed in `out/containers.txt`, 0 hits.
- Scope: GitHub-hosted and self-hosted Linux `container:` jobs; Debian and Ubuntu images (dash).

**SH-CI-05 (MUST NOT) Write a custom shell template with a bare interpreter name and `{0}`: `bash -euo pipefail {0}`. Never a path (`/bin/bash -eo pipefail {0}`), never without `{0}`, never without `-o pipefail`.**
- Why: actionlint 1.7.12 silently skips ShellCheck for a path-qualified template (V14: `lint-custom-path.yml` exit 0 no output, `lint-custom.yml` exit 1 with SC2086). The runner throws when `{0}` is missing (ScriptHandler.cs). A custom template replaces the whole argument list: `--noprofile --norc` and `-e -o pipefail` are gone unless written. `-u` is the only thing `shell: bash` lacks, and a template `bash -euo pipefail {0}` fails on an unset variable (act, `nounset.yml`, partial).
- Verify: `grep -rnE -e 'shell: */' --include='*.yml' --include='*.yaml' .github/workflows` (output is the violation). Reading aid, not run red: `grep -rnE -e 'shell: [^#]*[{]0[}]' --include='*.yml' --include='*.yaml' .github/workflows` lists every template to check for `-o pipefail`.
- Evidence: measured (V14), normative (runner `{0}` check). Watched red: yes, V14 (plant red, twin green; actionlint skip shown).
- Scope: actionlint 1.7.12; all runners.

**SH-CI-06 (MUST) Every `run:` step in a composite `action.yml` carries its own `shell:` (default `bash`) and takes `inputs.*` through `env:`.**
- Why: composite run steps require `shell` ([metadata-syntax.md](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/metadata-syntax.md)); job and workflow defaults are skipped inside composites (ScriptHandler.cs:75/173); actionlint does not lint `action.yml` (it exits 1 with `"jobs" section is missing`, V10).
- Verify: `grep -rPzo --include='action.yml' --include='action.yaml' -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\brun:)(?!(?:(?!\n[ ]*-[ ]).)*?\bshell:)(?:(?!\n[ ]*-[ ]).)*' .` for the missing shell, and the SH-CI-07 command run against `action.yml` files for the inputs.
- Evidence: normative and measured. Watched red: yes, V10 (`bad` and `mixed` red, `good` green). Fleet: 16 composites, 0 violations.
- Scope: all runners.

### B. Untrusted data in a run body (catcher: the injection greps, zizmor)

**SH-CI-07 (MUST) Never put an attacker-reachable `${{ }}` expression in a `run:` or `script:` body. Set it under `env:` and read `"${VAR}"` (bash) or `$env:VAR` (pwsh).**
- Why: the expansion happens before the script exists, so the value is code. Canary files were created for `github.event.issue.title`, `inputs.release_tag` (bash and pwsh) and not for the `env:` twins (V6). The set: `github.event.*.{title,body,message,name,email,ref,label,default_branch}`, `github.event.pages.*`, `github.event.client_payload.*`, `github.head_ref`, `github.ref_name`, `inputs.*`, `github.event.inputs.*` ([secure-use.md](https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md), [Security Lab](https://securitylab.github.com/resources/github-actions-untrusted-input/)). The set also includes any `steps.*.outputs.*`, `needs.*.outputs.*` and dynamic `matrix.*` value: SH-CI-23 and SH-CI-24 carry those two checks. Default beyond the set: route every `${{ }}` value through `env:`; literal-matrix, sha and runner values are not findings.
- Tool coverage differs, so the grep is the complete check: actionlint 1.7.12 flags only the `github.event.*` group (V4); zizmor 1.30.1 flags `inputs.*` at `--min-severity high` (V5, 14 findings per plant). Outputs and dynamic-matrix values: SH-CI-23, SH-CI-24.
- Verify (one command, output is the violation):
  `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*(\binputs\.|github\.head_ref\b|github\.ref_name\b|github\.event\.(?:pages|client_payload)\.|github\.event\.[A-Za-z0-9_.*]*\.(?:title|body|message|name|email|ref|label|default_branch)\b)' --include='*.yml' --include='*.yaml' .github/workflows`
- Limits: the prefix skips every `key: value` line other than `run:`, so a one-line `script: "${{ inputs.x }}"` is out of reach by construction (zizmor is the second check); continuation lines of a `with:` block of a non-shell action match and are reviewed (ocx `notify-discord.yml:62,77,95,96` are such false positives, C11).
- Evidence: normative (GitHub docs) and measured. Watched red: yes, V3 (13 single-pattern greps), V5, V6, C11 (plants `inject`, `inject-input`, `inject-pwsh` red; `-env` twins silent).
- Scope: every shell on every runner; also composite `action.yml`.

**SH-CI-08 (MUST) Never write `${{ env.X }}` in a run body; write `${X}` (bash) or `$env:X` (pwsh).**
- Why: `${{ env.X }}` is still a template expansion, so a value placed under `env:` is not sanitised by being read through the `env` context (V6: `inject-envctx` created the canary). actionlint 1.7.12 is silent; zizmor 1.30.1 reports it only as `help[template-injection]` at `--min-severity low` or `informational`, not at `medium` or `high` (C10: 0, 0, 1, 1).
- Verify: `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{\s*env\.' --include='*.yml' --include='*.yaml' .github/workflows` (a hit inside a `with:` block of a non-shell action is not a violation; the fleet has 4 such in generated `release.yml` files).
- Evidence: normative (zizmor docs name the trap) and measured. Watched red: yes, V7 (plant red, twin green), C10. Fleet: 0 in run bodies.
- Scope: every shell, every runner.

**SH-CI-23 (MUST) Never write `${{ steps.<id>.outputs.<name> }}` or `${{ needs.<job>.outputs.<name> }}` in a `run:` or `script:` body. Set it under `env:` and read `"${VAR}"` (bash) or `$env:VAR` (pwsh). Authored files only: a generated file is fixed in its generator.**
- Why: an output is a string pasted verbatim, so the taint of its source survives the hop, including a first hop that was written the safe way (`env:` in job `a`, then `${{ needs.a.outputs.title }}` in job `b`: act executed the payload, N-act). actionlint 1.7.12 is silent on all four output and matrix plants (N3); zizmor 1.30.1 lists outputs only at `--min-severity informational` (severity Informational, confidence Low, [template_injection.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/audit/template_injection.rs)), so the gate's `medium` floor never shows them. The rule is stated on the syntax, not on the provenance, because an agent cannot decide cross-job taint reliably and the fix is one `env:` line.
- Verify (output is the violation): `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\b(?:steps|needs)\.[A-Za-z0-9_-]+\.outputs\b' --include='*.yml' --include='*.yaml' .github/workflows`
- Limits: continuation lines of a `with:` block of a non-shell action match and are read in context (`ocx release.yml:171,236`, `grimoire release.yml:166,231`, `docker-publish.yml:188`); a one-line `script: "${{ ... }}"` is out of reach by construction, as in SH-CI-07.
- Evidence: measured. Watched red: yes, N1 (plant `steps-out.yml:17`, `needs-out.yml:23`, exit 0; twin exit 1) and N-act (payload EXECUTED on both plants, inert on both `env:` twins), re-run in C15 (same lines, twin exit 1). Fleet: 2 authored sites (`ocx@4ded080feed4:.github/workflows/build-windows-shims.yml:210`, a benign path; `e2e-mirror@a4c9fc67afb5:.github/workflows/mirror-signing.yml:196`, `VERSIONS='${{ needs.discover.outputs.versions }}'`), 8 cargo-dist generated lines (`grimoire release.yml:146,204,268,299`, `ocx release.yml:151,209,285,316`) and 15 mirror-family generated lines.
- Scope: every shell, every runner, composite `action.yml` too (run the same command with `--include='action.y*ml'`). act host mode is not the GitHub runner, but the expansion happens before any shell exists, so the result does not depend on it; real-runner confirmation is unverified.

**SH-CI-24 (MUST) When a matrix dimension is built from an expression (`fromJSON(needs.*.outputs.*)`, `fromJSON(steps.*.outputs.*)`, `fromJSON(github.event.*)`, `fromJSON(inputs.*)`), never write `${{ matrix.<dimension>[.<field>] }}` in a run body; pass it through `env:`. Literal matrices are exempt.**
- Why: the dimension's elements are output strings. zizmor 1.30.1 flags the bare `matrix.item` (warning, Medium confidence) but not the dotted `matrix.item.version`, which act executed (N-act, CANARY-N3); the miss is in `expands_to_static_values` of [matrix.rs](https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/models/workflow/matrix.rs). A literal `item: [alpha, beta]` is constants and is exempt (73 fleet sites would otherwise be false positives under the pedantic persona).
- Verify (two commands, output is the violation): `grep -rliP -e 'fromjson\(\s*\(*\s*(?:needs|steps|github\.event|inputs)\b' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r grep -Pn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\bmatrix\.'`
- Limits: it lists every `matrix.*` run-body line of a dynamic-matrix file, static dimensions included (the mirror family and e2e-mirror list 22 to 105 lines of which 32 are `matrix.version.version`); the reader keeps the lines whose dimension is the dynamic one. The pipeline ends in `xargs -r`, so it is judged by its output.
- Evidence: measured. Watched red: yes, N2 (plant `matrix-dyn.yml:26` and `matrix-dyn-obj.yml:26`, output; twin exit 123 with no output, and the static-matrix twin is not even listed), N-act, re-run in C15.
- Scope: all runners; generated cargo-dist and mirror workflows are the generators' fix. Fleet: 32 `matrix.version.version` lines in 16 generated mirror workflows (DO NOT EDIT); exemplars `pyenv` and `nvm`.

### C. The runner's file protocol (catcher: the greps for commands, delimiters and PowerShell writers)

**SH-CI-09 (MUST) Do not emit `::set-output`, `::set-env`, `::add-path` or `::save-state`; write to `$GITHUB_OUTPUT`, `$GITHUB_ENV`, `$GITHUB_PATH` and the state file.**
- Why: `::set-env` and `::add-path` throw unless `ACTIONS_ALLOW_UNSECURE_COMMANDS` is set; `::set-output` and `::save-state` are deprecated behind the server flag `DistributedTask.DeprecateStepOutputCommands` ([ActionCommandManager.cs](https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs), [workflow-commands.md](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-commands.md)). No removal date is published.
- Verify: `grep -rnE -e '::(set-output|set-env|add-path|save-state)( |::)' --include='*.yml' --include='*.yaml' .github/workflows`
- Evidence: normative. Watched red: yes, C5 (4 hits on the plant, exit 0; twin exit 1 empty). Fleet: 0.
- Scope: all shells and runners.

**SH-CI-10 (MUST) Write a multiline value to `$GITHUB_ENV`/`$GITHUB_OUTPUT` with a random delimiter, and never put a value that may contain a newline into a one-line `name=value`; arbitrary data goes to a file.**
- Why: the runner ends the block at the first line equal to the delimiter ([FileCommandManager.cs](https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs)); with a fixed `EOF` and attacker text, extra variables are set (parser port: `INJECTED='pwned'`, V8). Safe form: `delim="ghadelim_$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"`, and end the value with a newline before the closing delimiter.
- Verify: `grep -rnE -e "echo ['\"][A-Za-z_][A-Za-z0-9_]*<<[A-Za-z0-9_-]+['\"]" --include='*.yml' --include='*.yaml' .github/workflows` lists every fixed delimiter; a fixed delimiter around constant text is not a finding (the generated cargo-dist files), so read the value's source.
- Evidence: normative and measured. Watched red: yes, C6 (plant: `notes<<EOF` and `body<<DELIM`, exit 0; twin exit 1), V8 (parser port: fixed `EOF` injected, random delimiter intact).
- Scope: bash, sh and pwsh steps; all runners.

**SH-CI-11 (MUST) Code that can run under Windows PowerShell 5.1 writes `$GITHUB_ENV`, `$GITHUB_PATH` and `$GITHUB_OUTPUT` only with `Out-File -Encoding utf8 -Append`. Never mix it with `>>` on the same file, never use bare `Add-Content`.**
- Why: on 5.1 `>>` writes UTF-16LE with a BOM; the runner's .NET reader decodes a lone `>>` (C7: `ReadAllLines(UTF8)` returns `MY_VAR=hello` on 5.1, 7.4 and 7.6.6), so the sub-artifact's claim that the runner cannot parse UTF-16 is refuted. What breaks is mixing: `>>` then `Out-File -Append` leaves `[A=1][B?=?2?]` garbage on 5.1, and the reverse leaves a corrupt second line. `Add-Content` writes the ANSI code page, so a non-ASCII path (`C:\Users\Jürgen\bin`) reads back with U+FFFD on 5.1 (C9). pwsh 7.x writes UTF-8 without BOM for all three and is safe.
- Verify: step-scoped `grep -rPzo --include='*.yml' -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\bshell:[ ]*powershell\b)(?:(?!\n[ ]*-[ ]).)*?>>[ ]*[$]env:GITHUB_(?:ENV|PATH|OUTPUT)(?:(?!\n[ ]*-[ ]).)*' .`; and for installer scripts that may run on powershell.exe: `grep -rnE -e 'Add-Content[^|]*GITHUB_(PATH|ENV|OUTPUT)' -e 'Set-Content[^|]*GITHUB_(PATH|ENV|OUTPUT)' -e '>>[[:space:]]*[$]env:GITHUB_(PATH|ENV|OUTPUT)' --include='*.ps1' --include='*.psm1' .`
- Evidence: measured on three PowerShell versions; normative (workflow-commands.md names the PS 5.1 versus 6 encoding difference). Watched red: yes, C7 (step grep plant red, twin green; reader and mixing runs), C9 (`.ps1` grep plant red, twin green; Add-Content run).
- Scope: Windows PowerShell 5.1 (`shell: powershell`, or a `.ps1` started by `powershell.exe`). Not pwsh 7.x.

### D. Per-OS and per-version runner traps (catcher: job-shell-lint.py, greps, PS-ERR checker)

**SH-CI-12 (pointer row, no level of its own) In `shell: pwsh`/`powershell` blocks with two or more native commands, check each native call (`$LASTEXITCODE`) or, on pwsh 7.x, set `$PSNativeCommandUseErrorActionPreference = $true`. The rule text is owned by PS-ERR-03 (MUST, run-step guard; it cites PS-ERR-01 for the per-call check); PS-ERR-04 is the entry-point exit rule and is not this one.**
- Why: `$ErrorActionPreference = 'Stop'`, which the runner prepends, does not cover native exit codes on 5.1, 7.4.7 or 7.6.6 (V22); the preference variable works on 7.x and is a no-op on 5.1 (PS-ERR-02, PS-ERR-03 own the version floor). The runner appends a `$LASTEXITCODE` check only for the last command.
- Verify: `python3 pwsh-run-lint.py <repo-root>` (pwsh dive, `shell-pwsh/errors-and-native.md`; the check belongs to PS-ERR-03 per map X9; output is each pwsh step with two or more native lines and no guard; needs PyYAML, no `-I`).
- Evidence: measured. Watched red: yes, pwsh dive run W1 (`checks/wf-red` red, `wf-twin` empty) and V22 for the behaviour. This row is a pointer here so the MUST is not stated twice (map X9; was a routing SHOULD).
- Scope: pwsh 5.1 and 7.x, Windows and Linux runners.

**SH-CI-13 (MUST) A `run:` body on a `macos-*` runner (bash default or `shell: bash`) uses bash 3.2.57 syntax: no `declare -A`, `mapfile`, `readarray`, `${x,,}`, `${x^^}`, `&>>`, `wait -n`, `$EPOCHREALTIME`, `local -n`. Alternatively the job installs a newer bash and calls it by absolute path.**
- Why: macOS runners ship bash 3.2.57 and no newer bash on PATH ([macos-26-arm64 README](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)); Linux CI cannot see the failure. On a bash 3.2 binary 20 constructs fail (V12 `b32/feat.sh`); an associative array on 3.2 is silently wrong (`assoc32.sh`, exit 0). See SH-DIAL-06 (bash 3.2.57 syntax) and SH-DIAL-25 (the `# bash-floor:` guard) for script files. BSD userland on the macOS runner: unverified, read only.
- Verify (output is one line per violating step): `python3 job-shell-lint.py .github/workflows` (the `macos` test is applied to the job's `runs-on` and `strategy` text, so a matrix leg counts).
- Evidence: normative (runner-images README) and measured (bash 3.2 binary from `matrix.sh`; not Apple's patched build). Watched red: yes, C4 (`jobs/bad` step on a macos leg red, `jobs/good` silent), V12 (grep plant/twin). Fleet: 0.
- Scope: macos-* runners with bash; bash 3.2.57.

**SH-CI-14 (SHOULD) In `shell: bash` steps on `windows-*` runners call Windows tools as `cmd //c` (conversion on) or `MSYS_NO_PATHCONV=1 cmd /c` (conversion off), never both; pass native tools `cygpath -w` paths; and do not rely on Git's bundled Unix tools from pwsh or cmd steps.**
- Why: Git Bash rewrites Unix-looking arguments: `cmd /c` loses its flag, `/tmp/x` and `--prefix=/usr/local` are converted ([MSYS2 filesystem paths](https://www.msys2.org/docs/filesystem-paths/); V19, measured on Git Bash 5.2.15; the runner has 5.3.15 and Git 2.56 per the [Windows2025 README](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md), unverified there). With `MSYS_NO_PATHCONV=1` the `//c` form prints the cmd banner, so the two pairs are not mixed (shell-dialect.md SH-USER-15 gives the host facts and names this rule the CI owner). The last clause is corrected by this revision's source read (C14): the hosted images are built to put Git's `mingw64\bin` and `usr\bin` on the machine PATH (`/o:PathOption=CmdTools`), so `grep`, `sed`, `uname` and `date` should resolve in pwsh and cmd steps (source-read, unverified on a runner), but after `System32` by the installer's append order, so `find`, `sort`, `timeout` and `tar` are the Windows programs, and the Git for Windows maintainer does not guarantee the tools stay. The first sub-artifact's sentence "GNU userland is on PATH only inside a `shell: bash` step" (its section 5) rested on `shell-audit/platform-matrix.md:267` ("only `git` on PATH, not the Unix tools") and is withdrawn.
- Verify: `grep -rnE -e '(^|[ ;(])cmd /[cCkK] ' --include='*.yml' --include='*.yaml' .github/workflows`, then keep hits inside a bash step.
- Evidence: measured on the local host only. Watched red: yes for the grep (V20 plant/twin), fact V19 on 5.2.15; the PATH clause is source-read plus a host measurement (C14). SHOULD because the runner version differs and the fleet has 0 hits.
- Scope: Git Bash 5.2.15 measured, 5.3.15 expected.

**SH-CI-15 (SHOULD, dated 2026-10-11, expires 2026-11-19) Until the `ubuntu-latest` migration completes, a workflow on `ubuntu-latest` is correct on both ubuntu-24.04 and ubuntu-26.04. Pin `ubuntu-24.04` or add an `ubuntu-26.04` leg for shell-heavy jobs; detect features, never `--version | grep GNU`.**
- Why: [runner-images#14748](https://github.com/actions/runner-images/issues/14748) schedules the rollout 2026-10-19 to 2026-11-19. 24.04 has bash 5.2.21, dash 0.5.12-6ubuntu5 (no pipefail), ShellCheck 0.9.0; [26.04](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md) has bash 5.3.9, dash 0.5.12-12ubuntu3 (pipefail), ShellCheck 0.11.0. The plain `ubuntu:26.04` image ships uutils coreutils 0.10.0 (V21: "GNU NOT detected"); whether the runner image does is unverified.
- Verify (lists exposed jobs): `grep -rn -e 'ubuntu-latest' --include='*.yml' --include='*.yaml' .github/workflows`; GNU sniffing: `grep -rn -e '--version | grep' --include='*.sh' --include='*.yml' .`.
- Evidence: normative (README, announcement) and measured on the docker images (V13, V21). The greps are lists, not watched red.
- Scope: ubuntu-latest, 2026-10-19 to 2026-11-19. Remove this rule after the window and re-check the image READMEs.

**SH-CI-16 (SHOULD) When a step gains pipefail (SH-CI-01/02), rewrite `producer | grep -q` and `producer | head -n` as capture-then-test.**
- Why: the early-exit reader closes the pipe, the producer gets SIGPIPE and the pipeline status is 141 on bash 3.2 to 5.3 under pipefail (V11 `sigpipe.sh`), so `if producer | grep -q X; then exit 1; fi` silently stops firing (`failopen.sh`). The general rule is owned by SH-ERR-09 (early-exit reader under pipefail; map conflict 18, M-B-07; CMK-CORE-05 for CMake trees); this row is the CI trigger. ShellCheck SC2337 covers it only on unreleased master.
- Verify: `grep -rPn -e ' \x7c +(?:grep -[A-Za-z]*q|head)\b' --include='*.yml' --include='*.yaml' .github/workflows` (output is each early-exit reader after a pipe).
- Evidence: measured (8 bash versions). Watched red: yes, C8 (plant 2 hits, twin silent), V11.
- Scope: bash 3.2 to 5.3 with pipefail.

### E. Taskfile `cmds` (catcher: the Taskfile greps and the task run)

Task runs `cmds` and `status:` in mvdan/sh with errexit on and pipefail off. Measured on task 3.45.4, 3.51.1, 3.53.1 and 3.54.0 (V16, C12).

**SH-CI-17 (MUST) In Taskfile `cmds`, enable pipefail with `set: [pipefail]` (Taskfile, task or cmd level) or `set -o pipefail;` inside the same cmd item. Never as a separate cmd item, never as `shopt: [pipefail]`. Repeat it inline inside `status:` commands.**
- Why: each cmd item is its own interpreter, so `- set -o pipefail` as its own item does not carry over (C12: `SURVIVED`, rc 0); `shopt: [pipefail]` panics (`index out of range [-1]`) on 3.45.4 and errors on 3.51.1 and later; `status:` ignores `set:` ([go-task/task#2469](https://github.com/go-task/task/issues/2469), open; V16 `pipefail-status` "up to date" on 3.54.0). Inline in `status:` the status fails and the task runs (C12 `good/inline-status` prints `run`).
- Verify (two commands, output is the violation): `grep -rn -A3 -e 'shopt:' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' . | grep pipefail`; `grep -rnE -e '^[[:space:]]*-[[:space:]]+set[[:space:]]+-[A-Za-z]*o[[:space:]]+pipefail[[:space:]]*$' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .`
- Evidence: measured on four task versions, normative (task docs). Watched red: yes, C12 (greps plant red, twin empty; task 3.54.0 behaviour of each), V16.
- Scope: task 3.45.4 to 3.54.0 (mvdan/sh 3.14.1 in 3.54.0). Fleet: 0 violations; models `index/taskfile.yml:57,221` and `ocx-indexbot/taskfile.yml:28,123` (`set: [e, u, pipefail]`).

**SH-CI-18 (MUST) In Taskfile `cmds` use no `printf -v`, `PIPESTATUS`, `BASH_VERSION`/`BASH_SOURCE`, and no `-` in an associative-array subscript in a compound assignment (use a `case`).**
- Why: mvdan/sh returns silently wrong values for the first three (`printf-v` writes `-vprintf-v=[]`, `PIPESTATUS` and `BASH_VERSION` are unset, rc 0) and panics on a dashed associative subscript (V16, 3.45.4 to 3.54.0). Quoting helps a literal assignment and a read (`lit-dash-q`, `read-dash-dq` ok) but not a compound assignment (`compound-q` PANIC), so the rule text says `case`. Plain keys, arrays, `[[`, `declare -A` and `mapfile` work. `read -p` also works (V16 `read-p-data` v=abc, `read-p-eof` rc 1 like bash) and is not a Taskfile rule; the map and fleet audit said otherwise (M-H-07).
- Verify: `grep -rnE -e 'printf[[:space:]]+-v' -e PIPESTATUS -e BASH_VERSION -e BASH_SOURCE --include='Taskfile*.yml' --include='*.taskfile.yml' .` and `grep -rnE -e '[A-Za-z_]+\[[A-Za-z0-9_]*-[A-Za-z0-9_-]*\]' --include='Taskfile*.yml' --include='*.taskfile.yml' .` (known false positives: regex character classes, and a function task never runs).
- Evidence: measured. Watched red: yes, V17 (`Taskfile.bad.yml` 3 hits, assoc plant 1 hit; twins empty), V16.
- Scope: task 3.45.4 to 3.54.0. Fleet: 0; model `ocx-mirror/taskfiles/release.taskfile.yml:196-197` (`case` with the panic named). Re-run `Taskfile.assoc.yml` on each task bump; no upstream fix as of 3.54.0.

**SH-CI-19 (SHOULD) Lint Taskfile `cmds` bodies through an extractor into ShellCheck (bash dialect, default severity, the actionlint exclusion list), because the shell gate sees only `*.sh`.**
- Why: nothing else reads YAML-embedded task bodies; ShellCheck cannot see the three mvdan/sh divergences of SH-CI-18, so it complements and does not replace that rule.
- Verify: `bash tflint/run-tflint.sh Taskfile.yml` (sub-artifact fixture; exit 1 means findings). V18 ran at the warning floor; default severity (SH-GATE-01) is a superset and was not re-run.
- Evidence: measured. Watched red: yes, V18 (plant SC2045 exit 1, twin 0; the fleet shows 4 SC2046). SHOULD: the extractor is a fixture, not a shipped gate.
- Scope: task files with bash-style `cmds`.

**SH-CI-20 (SHOULD; promote to MUST for a Windows host whose PATH lacks Git's Unix directories) A Taskfile task that a `task NAME` call in a Windows-runner step whose shell is not `bash` (pwsh, cmd, the Windows default) reaches uses only mvdan/sh builtins, the Task 3.45.3+ builtin coreutils (`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`), tools on that host's PATH, or carries `platforms:` per cmd or task. On a plain Windows PATH never `uname sed grep awk head tail wc cut tr date env which sha256sum dirname basename tee sh`.**
- Why: Task resolves every command that is not a builtin or a core utility from the PATH it inherited, so a task's tools must exist on the PATH of the host that runs it. Measured on the Windows host (task 3.54.0, Windows 10.0.26200): from a cmd.exe parent 38 of 68 probed names are absent (`"uname": executable file not found`, rc 201), from a Git Bash parent 6 (the second round's 68-name probe, section 2.2). The builtin `find` and `ls` are u-root, not GNU (`find . -name x` prints absolute paths, `ls -la` prints `bill gates` as owner), `sort` and `timeout` are Windows programs, and a missing `$(uname -s)` does not stop the cmd (`os=` plus an error line). The first consolidation had demoted this rule to a SHOULD for want of a check; `win-task-lint.py` (appendix) is that check. The second round then raised it to a MUST on the premise that a Windows pwsh or cmd step on a hosted runner lacks those tools. C14 refutes the premise for GitHub-hosted images (decision 12 of the Verdict): Git is installed with `PathOption=CmdTools`, which appends `mingw64\bin` and `usr\bin`, so with those directories appended the failing plant passes (rc 201 to rc 0). The absent set is therefore the PATH of a developer machine and of a self-hosted runner without Git's Unix directories, not the hosted image; the level is SHOULD until a runner probe shows otherwise.
- Verify: `python3 win-task-lint.py .` (appendix; needs PyYAML, no `python3 -I`; one line per Taskfile task that a Windows non-bash step reaches and whose cmds use an absent tool with no `platforms:`; on a hosted runner a hit is advisory for `grep sed awk head tail wc cut tr date uname`, and real for `find`, `sort`, `timeout` and `tar` semantics, which the checker does not model).
- Evidence: measured (N8) and source-read (C14). Watched red: yes, N8 (plant `bad` red, 1 line naming `grep head uname`; twins `good` (platforms-gated), `good-bash` and `good-builtin` silent; the real `task.exe` agrees: cmd.exe parent rc 201, Git Bash parent rc 0, gated twin rc 0), re-run in C18; C14 shows the same plant going green when Git's directories are on the PATH. Fleet: 0 lines at this scope (12 `task` calls in Windows jobs across 8 repos: 7 under `shell: bash`, 5 under the pwsh default).
- Scope: task 3.45.3 to 3.54.0 (builtins), Windows 10.0.26200 host; the GitHub Windows runner's PATH is read from source (`Install-Git.ps1`, `install.iss`) and unmeasured on a runner.

**SH-CI-25 (SHOULD) A Taskfile that a Windows developer may run gates commands absent from a plain Windows PATH with `platforms:`, or calls them through a script file run by an explicit shell.**
- Why: SH-CI-20 sees only tasks a CI step reaches; a developer on cmd.exe or pwsh without Git's Unix directories hits the same `exit status 127`. Task's embedded coreutils change which commands a Windows Taskfile can use without being documented on the Taskfile schema pages; they shrink the absent set with each release and are not GNU.
- Verify (a list; each hit is read): `python3 win-task-lint.py --all .`
- Evidence: measured. Watched red: yes, N8 `--all` (plant 2 lines; `good` and `good-builtin` silent; `good-bash` lists 2 because `--all` ignores the step shell), re-run in C18. Fleet: 84 ungated tasks in 32 Taskfiles of 11 repos (`ocx@4ded080feed4:test/taskfile.yml` 14, `ocx:website/schema.taskfile.yml` 6, `index/taskfile.yml` 4, `setup-grimoire/Taskfile.yml` 3), advisory.
- Scope: as SH-CI-20; the absent names are the 3.54.0 measurement, so re-run the 68-name probe on each task bump.

**SH-CI-26 (SHOULD) In Taskfile `cmds` do not interpolate `{{.FILE_PATH_SEPARATOR}}`, `{{.PATH_LIST_SEPARATOR}}`, `{{joinEnv ...}}` or `{{fromSlash ...}}` unquoted, and never write a literal backslash path; use `{{.ROOT_DIR}}`/`{{toSlash ...}}` (forward slashes) or single-quote the value.**
- Why: Task pastes the value into the command text and mvdan/sh then parses it, so the backslash is an escape and `;` a separator: on Windows `echo SEP=[{{.FILE_PATH_SEPARATOR}}]` prints `SEP=[]`, `{{fromSlash "a/b/c"}}` prints `abc`, and `echo L={{.PATH_LIST_SEPARATOR}}x` prints `L=` then `"x": executable file not found`. `.\sub\x.bat` loses its backslashes; `sub\\x.bat` works; `./x.sh` has no shebang handling (`%1 is not a valid Win32 application`). `{{.ROOT_DIR}}` is already forward-slashed (`C:/Users/...`). Linux renders `/` and `:`, so the trap is Windows-only.
- Verify (a list, each hit needs a quote check): `grep -rnE -e '[{][{][^}]*(FILE_PATH_SEPARATOR|PATH_LIST_SEPARATOR|joinEnv|fromSlash)' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .`
- Evidence: measured. Watched red: yes, N10 (plant 3 hits, exit 0; twin exit 1); runtime behaviour on task.exe 3.54.0 (second round §2.4). Fleet: not run over the fleet; the variables are 3.51.1 additions.
- Scope: task 3.51.1+ for the variables; Windows only.

**SH-CI-27 (MUST) `platforms:` lists GOOS or GOOS/GOARCH values only; never a negation (`!windows`). List the platforms that should run.**
- Why: `platforms: ['!windows']` makes Task refuse to load the whole Taskfile (rc 102, `invalid platform "!windows"`, every task fails); a valid but wrong value skips silently with exit 0, including a `deps:` entry (the dependent task still runs). [Platforms guide](https://taskfile.dev/docs/guide/platforms): "A command whose platform does not match is skipped without an error"; it does not describe negation.
- Verify: `grep -rnE -e 'platforms:[^#]*!' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .`
- Evidence: measured. Watched red: yes, N9 (plant `bad/Taskfile.yml:4`, exit 0; twin exit 1) and the task run (rc 102). Fleet: 0.
- Scope: task 3.54.0 (other versions not run).

### F. The gate (catcher: presence of the checks)

**SH-CI-21 (MUST) The workflow gate runs a template-injection check that covers `inputs.*`, `${{ env.X }}`, `steps.*.outputs.*` / `needs.*.outputs.*` and dynamic-matrix values: zizmor in its default `regular` persona at `--min-severity medium`, plus the SH-CI-08, SH-CI-23 and SH-CI-24 greps. actionlint runs per SH-GATE-01 and SH-GATE-19 (default severity, no `-S`).**
- Why: actionlint 1.7.12 misses `inputs.*`, `${{ env.X }}`, outputs, matrix values, pwsh bodies and composite actions (V4, N3); zizmor 1.30.1 at medium covers `inputs.*` and misses the env context (C10), shows outputs only at informational, and misses dotted member access on a dynamic matrix at every severity (N-act; documented gap in the Verdict). The pair of tools plus the three greps closes the classes. Persona and floor were swept over the 26 first-party workflow dirs (N12, 312 runs): template-injection findings are 18 at medium under regular, pedantic and auditor alike, 18 at low under regular but 140 under pedantic and auditor (every added line a static-matrix constant, a `steps.*.outcome`, a `secrets.*` or another smell), 28 at informational under regular; informational adds 125 findings in all, 10 of them template-injection and 115 of other audits, and zizmor has no audit selector. So the gate stays `regular` at `medium`; no pedantic, no auditor, no informational floor. zizmor is already the fleet standard in index, ocx-indexbot, ocx-catalog, ocx-website and grimoire-indexer, and the python-quality binding check (PY-GATE-05 uses the same intermediate-variable rule).
- Verify (presence): `grep -rls -e 'zizmor' --include='*.yml' --include='*.yaml' .github taskfile.yml taskfiles` lists the repos that run it; the component checks are SH-CI-07/08/23/24.
- Evidence: normative ([secure-use.md](https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md), [zizmor audits](https://docs.zizmor.sh/audits/), [usage.md](https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/usage.md): exit codes 11 informational to 14 high) and measured (V4, V5, C10, N3, N12). The component checks are watched red; the presence grep is a list.
- Scope: every repo with `.github/workflows`.

**SH-CI-22 (SHOULD) Move a `run:` block into a script file at 10 or more lines, or on any function, trap, `case`, multi-command loop, `mapfile` or `declare -A`; keep 1 to 9 lines of glue inline.**
- Why: ShellCheck and shfmt see script files, local reproduction needs one, and `run:` has a 21,000-character ceiling ([workflow-syntax.md](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md)).
- Verify (output is each long block): `grep -rPzo --include='*.yml' --include='*.yaml' -e '(?m)^([ ]*)(?:-[ ]+)?run:[ ]*[|>][-+]?[ ]*\n(?:\1[ ]{2,}[^\n]*\n){10,}' .github/workflows`
- Evidence: asserted plus codified; the ceiling is normative. Watched red: yes, V15 (plant 12 lines, twin empty). Fleet: 40 blocks.
- Scope: all workflows.

### G. GitLab CI scripts and one grammar trap (catcher: the extractor into ShellCheck, the greps)

GitLab Runner (docker executor, `shells/bash.go` and `abstract.go` on main, read 2026-10-11) writes a script whose preamble is `case "$(set -o)" in *"pipefail"*) set -o pipefail;; esac; set -o errexit`, then evals every entry in a subshell; so errexit is on and pipefail is on where the shell has it, the opposite of GitHub's default. The shell is the first of `/usr/local/bin/bash`, `/usr/bin/bash`, `/bin/bash`, then `sh` variants, then `/busybox/sh`. Variables are exported into the environment and are not substituted into the script text. All of this is **emulated** (N11: the structure transcribed from source and run on alpine:3.22, busybox:1.37, debian:12 bash and dash 0.5.12 on both Debian releases); no real runner ran.

**SH-CI-28 (MUST) Write a GitLab `script:`/`before_script:`/`after_script:` body in the dialect of the image's shell: POSIX sh unless the pinned `image:` ships bash (the runner uses bash when `/usr/local/bin/bash`, `/usr/bin/bash` or `/bin/bash` exists, else sh; `node:*-alpine`, `alpine` and `busybox` are ash).**
- Why: the same trap as SH-CI-04 with the default reversed: a `[[` or an array passes on a Debian image and fails or misbehaves on alpine. The unspecified-shell pipefail trap of SH-CI-01 does not exist here for bash, ash and new dash images (pipefail is on in ash 1.35/1.37 and dash 0.5.12-12 on Debian 13) and does exist for sh-only images whose shell lacks pipefail (dash 0.5.12 on Debian 12: `false | true` then REACHED, rc 0; N11). A leading `set -euo pipefail` is harmless (errexit is already on) but hides the real question, which shell the image has.
- Verify: `python3 gl-extract.py --sh .gitlab-ci.yml > extracted.sh` then `shellcheck -s sh -f gcc extracted.sh` at default severity (appendix extractor; needs PyYAML; for a pinned bash image use `--bash`). Output is the violation. The extractor blanks `{{placeholder}}` template tokens, which leaves a few SC2215 artifacts on `{{run}} --version` lines.
- Evidence: normative (runner source) and emulated. Watched red: yes, N6 (plant: SC3010, SC3030, SC3054, exit 1; the same text under `-s bash` exit 0), N5; re-run in C18 (extractor appendix is byte-identical to the fixture). Fleet: 12 files, 0 findings; `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-enrich.sh:18-35` and `gitlab-stats-seed.sh:30-83` are POSIX sh on the alpine default.
- Scope: GitLab Runner docker executor, main as of 2026-10-11; the real runner is unverified. The runner docs only say "Sh/Bash is the default shell used on all Unix based systems".

**SH-CI-29 (MUST) In GitLab scripts double-quote every `$CI_*`, `${CI_*}` and `$GITLAB_USER_*` expansion, never place one inside `eval`, `sh -c "..."` or `bash -c "..."` text (pass it as a positional: `sh -c 'echo "$1"' -- "${CI_COMMIT_TITLE}"`), and put `--` before a value used as a path operand (`rm -- "${path}"`). For a git ref write `git checkout "${CI_COMMIT_REF_NAME}" --` or `git switch -- "${CI_COMMIT_REF_NAME}"`, never `git checkout -- "${ref}"`.**
- Why: the runner exports variables as environment, so only the shell can inject; `CI_COMMIT_MESSAGE`, `CI_COMMIT_TITLE`, `CI_COMMIT_REF_NAME`, `CI_MERGE_REQUEST_TITLE` and `GITLAB_USER_*` carry author text (this list is a reading: GitLab's predefined-variables page carries no per-variable warning). An unquoted expansion splits and globs and a leading `-` becomes an option; inside `eval` or `sh -c "..."` the value is parsed again as code. The second round's `--` advice was wrong for refs: `git checkout -- feat` reads `feat` as a pathspec (`error: pathspec 'feat' did not match any file(s) known to git`, git 2.54.0, C17), while `git checkout feat --`, `git switch -- feat` and `git rev-parse --verify --end-of-options feat` work; git itself rejects a branch or tag name that starts with `-` (`fatal: '-x' is not a valid branch name`, `'-dash' is not a valid tag name`), so the option risk is for titles, messages and paths.
- Verify (three commands, output is the violation): `python3 gl-extract.py --sh FILE | shellcheck -s sh -f gcc -` (SC2086, SC2070); `grep -rnE -e 'eval[[:space:]]+[^#]*[$][{]?(CI_|GITLAB_USER)' -e '(sh|bash) -c[[:space:]]+"[^"]*[$][{]?(CI_|GITLAB_USER)' --include='*.yml' .`; and the list `grep -rnE -e 'git checkout[[:space:]]+--[[:space:]]+[^[:space:]]*[$]' --include='*.yml' --include='*.yaml' --include='*.sh' .` (each hit: is the operand a path or a ref? `git checkout -- "${file}"` restoring a file is correct).
- Evidence: measured and emulated. Watched red: yes, N5 (plant SC2086 x3 and SC2070, exit 1; twin exit 0), N7 (plant 2 lines exit 0; twin exit 1), C17 (the pathspec grep: plant 1 line, corrected twin silent, fleet 0; the corrected twin is green under ShellCheck and the eval grep). Fleet: 0; every `$CI_*` in a script body is double-quoted (`grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-ci.yml:82,96,117,122-126`, `gitlab-publish.yml:40`), and `grimoire-components@6fd8054116af:.gitlab-ci.yml:35,37` guards the only `$CI_COMMIT_TAG` use with a semver `rules:` regex.
- Scope: GitLab CI; the taint list is asserted. A fork MR's pipeline runs in the source project (documented in `gitlab-ci.yml:20-49`); that is a trust-boundary note, not a shell finding.

**SH-CI-30 (MUST) Never write an ungrouped `A || B && C` (or `A || B && C || D`). Write the grouping you mean: `A || { B && C; }` (A, else B then C), `{ A || B; } && C` (A or B, then C), or `if ...; then ...; elif ...; fi`.**
- Why: `&&` and `||` have equal precedence and are left-associative, so it parses as `(A || B) && C`; when `A` succeeds, `C` still runs (`apk add ... || apt-get update && apt-get install` runs `apt-get install` on alpine and dies with `apt-get: not found`, rc 127; the `if/elif` twin exits 0). ShellCheck 0.11.0 has no code for it (silent, also with `-o all`). Expert code writes the left-associative form on purpose (`shellspec__shellspec@f2d13f991885:lib/libexec.sh:181`, `dylanaraps__pure-bash-bible@8c19d0b482b0:test.sh:248`), so the rule asks for the grouping, not for a different meaning.
- Verify (output is the violation): `grep -rnP -e ' \|\| (?:[^|&;(){}`\]]|\$\([^)]*\)|[0-9]?>&[0-9])+ && ' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bash' --include='*.bats' .`
- Limits: a `||` inside a quoted string or a heredoc line matches (the 10 exemplar lines include oils spec tests and an ohmyzsh multi-line `|| [[ ... && ... ]]`); the middle class excludes `]` so `[[ a || b ]] && x` is silent, and excludes `;`, `|`, `(`, `)`, `{`, `}` so a grouped form is silent.
- Evidence: measured. Watched red: yes, C16: the pattern as written catches 6 of 6 planted variants (unquoted, double-quoted, `$(...)`, `>&2`, `test || mkdir "$d" && cd "$d"`) and is silent on the grouped, `if/elif` and `[[ ]]` twins. The second round's narrower pattern (`[^|&;(){}"'`]`, N4) caught 1 of those 6 because it excluded every quote; it stays valid as a precision-first form and is superseded here. Fleet: exactly 1 hit over every tracked shell/YAML file, `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28`, unchanged under the wider pattern (C16); `gitlab-enrich.sh:18-22` and `gitlab-stats-seed.sh:51-57` use the `if/elif` form.
- Scope: every shell (grammar, not a dialect issue). A candidate for SH-ERR to absorb; kept here because the only fleet hit is a CI template.

**Glob additions (not a rule): `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml` join the `shell-quality` globs**, checked with `--allow-absent` (fleet: 1 live file, `grimoire-components/.gitlab-ci.yml`; 0 in the checker root `www-setup`). "Globs must not miss" argues for them: an agent editing a pipeline writes shell. The 7 `templates/ci/gitlab-*.yml` generator inputs carry `{{...}}` placeholders that make them non-YAML, are not reachable by an exact name, and stay with the generator repos' own tests. Verify by reading: `git ls-files '.gitlab-ci.yml' '.gitlab-ci/*.yml'` across the fleet. Watched red: no (a count).

### Source conflicts and how they were resolved

| # | Sources disagreed on | Resolution and reason |
|---|---|---|
| 1 | Sub-artifact: MUST an explicit `shell:` on every step. Map: P0 check is "pipeline without pipefail". | Narrow check is the MUST (SH-CI-01, 22 hits); declaring the shell is a SHOULD (SH-CI-02). The broad check flags 482 steps, mostly one-line glue. |
| 2 | Sub-artifact MUST SH-CI-15 and ocx practice: actionlint with `SHELLCHECK_OPTS='--severity=warning'`. Map conflict 4, SH-GATE-01 and SH-GATE-19: default severity. | Default severity wins. C2: SC2086 is visible at default (exit 1) and hidden at warning (exit 0). C13: 18 findings at default across 6 of 26 first-party repos (8 SC2086, 5 SC2129, 4 SC2035, 1 SC2116), 0 ShellCheck findings at warning. The invocation belongs to SH-GATE; SH-CI keeps what actionlint cannot see (SH-CI-21). |
| 3 | Sub-artifact: Windows PowerShell 5.1 `>>` is wrong because the runner cannot parse UTF-16. | Refuted by the reader run (C7). A lone `>>` decodes; mixing with `Out-File -Append` and `Add-Content` corrupt. SH-CI-11 stays a MUST with the corrected rationale and a 5.1 scope. |
| 4 | Sub-artifact: MUST on the pwsh native-call guard. pwsh consolidation: PS-ERR-03 MUST (run-step guard; cites the per-call PS-ERR-01), PS-ERR-04 is the entry-point exit rule. | The pwsh owner is adopted (map X7, X9); SH-CI-12 is a pointer row with no level. One owner for the rule text. |
| 5 | Map M-H-07 and the fleet audit: `read -p` "breaks in Taskfile cmds". | Measured on task 3.53.1 (V16): works, returns rc 1 at EOF like bash. Not a rule. |
| 6 | Sub-artifact: "quote the subscript" avoids the associative-array panic. | A quoted dash key still panics in a compound assignment (`compound-q`). Rule text narrowed to "use a `case`" (SH-CI-18). |
| 7 | Sub-artifact: "the fleet runs actionlint only". | zizmor already gates five repos at `--min-severity medium`. It is silent on `${{ env.X }}` at medium (C10), so the SH-CI-08 grep stays required. |
| 8 | Sub-artifact SH-CI-19: do not stack `set -euo pipefail` in a `shell: bash` step. | Dropped as cosmetic; the fleet model `ocx@5de9d777eb7d:.github/actions/bazel-cache-rc/action.yml:68-76` and grimoire-indexer stack it deliberately. The `-u` fact moved into SH-CI-05. |
| 9 | Sub-artifact: never write `set -o pipefail` under `shell: sh`. Map conflict 3: the probe form is allowed. | Probe allowed, bare forbidden (SH-CI-03, citing SH-DIAL-07); C3 shows the probe is a no-op on dash 0.5.12-6ubuntu5, so a pipefail-dependent step uses `shell: bash`. |
| 10 | Sub-artifact MUST for `platforms:` (SH-CI-20) and Git Bash path conversion (SH-CI-14). | Both SHOULD: no mechanical check for the first; the second was measured on Git Bash 5.2.15 rather than the runner's 5.3.15 and has 0 fleet hits. |
| 11 | Map Q7 names `test-installers.yml:206-207` as the injection site. | Re-grep (C11) finds 6 sites: 206, 207, 239, 241, 269, 271, plus `update-dist.yml:27` (low). |
| 12 | Sub-artifact and map did not cover container jobs. | New rule SH-CI-04, from the runner source (ScriptHandler.cs:303) and C4. SH-CI-09 (deprecated commands) is new from the AI-agent angle and was run red/green (C5). |
| 13 | python-quality PY-GATE-05: blanket MUST on `${{ }}` in `run:`. | The shell set keeps a MUST for the attacker-reachable set (greppable, tool-confirmed) and a default for the rest; it does not relax PY-GATE-05. |
| 14 | SIGPIPE under pipefail appears in cmake-build (CMK-CORE-05), SH-ERR (map conflict 18) and the sub-artifact. | One owner: SH-ERR-09 for the general rule. SH-CI-16 is the CI trigger and carries the CI grep, with a sibling pointer. |
| 15 | Second round: SH-CI-20 rises from SHOULD to a scoped MUST because a Windows-runner pwsh or cmd step cannot find `uname sed grep head ...` (measured on the Windows host). `shell-audit/platform-matrix.md:267` and the first sub-artifact agree: Git is installed with `PathOption=CmdTools`, "only `git` on PATH, not the Unix tools". | Held at SHOULD. The `CmdTools` option is the one that adds the Unix tools: the installer (`install.iss:3395-3415`) appends `\cmd`, `\mingw64\bin` and `\usr\bin`, `Add-MachinePathItem` prepends `Git\bin` (`PathHelpers.ps1`), and runner-images issue 1525 ends with Git's tools staying on the PATH. With those directories appended the failing plant passes (C14: rc 201 to rc 0). The host measurement stays true for a plain Windows PATH. MUST returns on a runner probe or for self-hosted Windows. The audit sentence is reported, not edited. |
| 16 | First consolidation (Verdict 4, SH-CI-07): "matrix, sha and runner values are not findings". Second round: a dynamic `matrix.*` value is (SH-CI-24). | Text changed in place: literal-matrix, sha and runner values are not findings. A matrix built from an expression is untrusted data; a literal one is constants (73 fleet sites at the pedantic persona would be false positives). |
| 17 | Second round summary: "9 authored-or-generated outputs sites" and "125 findings of other audits" at the informational floor. | Its own sweep table is authoritative: 9 `needs` plus 1 `steps` output site, so 10 added template-injection findings (28 against 18); informational adds 125 findings in all, 115 of them from other audits. The gate (`regular`, `medium`) is unchanged by either count. |
| 18 | Second round: SH-CI-29 "pass `--` before a value used as a path or ref", with the twin `git checkout -- "${CI_COMMIT_REF_NAME}"`. | Wrong for a ref: `git checkout -- feat` reads `feat` as a pathspec and fails (C17, git 2.54.0). Text changed in place: `--` before path operands; `git checkout "$ref" --` or `git switch -- "$ref"` for refs; a list grep catches the pathspec misuse. |
| 19 | Second round: SH-CI-30 "Never write `A || B && C`", fix only by `if/elif` or `A || { B && C; }`, and a verification that excludes every quote. | The form is also a deliberate idiom in expert code (shellspec, pure-bash-bible), and the recorded grep missed 5 of 6 planted variants that contain a quote, `$(...)` or `>&2` (C16). Text changed in place to require explicit grouping of whichever meaning is intended; the grep is widened (fleet count unchanged at 1). |
| 20 | Audit `fleet-shell-shape.md:430` and this file's open question: 21 GitLab CI files. | The second round counted 12 files (8 YAML, 4 script fragments) in 4 repos with `git ls-files`; the 21 included 14 GitHub templates in the same `templates/ci/` directories. 12 is used. |
| 21 | GitLab docs ("only the last command's failure or success is reported" for a combined block) against the runner source (errexit on, entries eval'd in a subshell). | Unresolved without a real runner. SH-CI-28..30 hold under both; no row on errexit or pipefail is written, and one command per item satisfies both readings. |
| 22 | Map X7 (stale cross-references): SH-GATE-27/32, BVG-02/03, PS-ERR-01/04 and SH-ERR conflict 18 in this file; SH-CI-03/04, SH-EMIT-06/07 and SH-ERR-09 in shell-expansion.md. | Applied here, each checked against its consolidation by heading: SH-GATE-01 and SH-GATE-19 (SH-GATE has IDs 01..20), the SH-GATE-32 clause deleted, SH-DIAL-06 and SH-DIAL-25, PS-ERR-03, SH-ERR-09. The shell-expansion.md items (SH-CI-03/04 to SH-CI-07/08, SH-EMIT-06/07 to SH-EMIT-03, SH-ERR-09 to SH-ERR-12) belong to that file and are not edited here. |
| 23 | shell-dialect.md (item 11, SH-USER-15): SH-CI-14's "`cmd //c` (or set `MSYS_NO_PATHCONV=1`)" can be read as mixing the two; `MSYS_NO_PATHCONV=1 cmd //c` prints the cmd banner. | SH-CI-14 now names the two pairs and forbids mixing, as shell-dialect.md resolved and assigned to SH-CI-14. |

### Verification runs

Fixtures: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/ci-consolidation/` (run script `verify-ci-consolidation.sh`, transcript `out/verify-ci-consolidation.txt`). Tools: actionlint 1.7.12, ShellCheck 0.11.0, zizmor 1.30.1, pwsh 7.4 LTS and 7.6.6, Windows PowerShell 5.1.26100, task 3.54.0 and 3.45.4, 11 POSIX shells, docker debian:12 and alpine:3.22. Red means exit 0 with output on a plant; green means exit 1 and empty (or a silent checker) on its twin. The V1..V23 runs of the sub-artifact are reused unchanged.

```
C1  SH-CI-01 narrow check             plant 1 hit | twin 0
C2  SH-CI-01/21 actionlint, SC2086 in a run body
      default  sev-bad exit=1 "...SC2086:info:2:4: Double quote to prevent globbing..." | sev-good exit=0
      warning  sev-bad exit=0 (finding hidden)                                         | sev-good exit=0
C3  SH-CI-03 'sh -e' step body on 11 shells
      bare : dash 0.5.12 "set: Illegal option -o pipefail" (aborts) ; posh "set: pipefail: bad option" ; the other 9 exit 1 (pipefail on)
      probe: dash 0.5.12 and posh 0.14.1 REACHED-after-pipeline rc=0 exit 0 (pipefail silently off) ; the other 9 exit 1
C4  SH-CI-04/13 job-shell-lint.py
      jobs/bad: "job=in-container step#0 SH-CI-04 ..." and "job=mac step#0 SH-CI-13 ..."   jobs/good: silent
      container-body.sh: debian:12 "[[: not found" then REACHED-after-pipeline ; alpine:3.22 "bash-test-ok" then REACHED-after-pipeline
C5  SH-CI-09 deprecated commands      plant 4 hits (set-output, set-env, add-path, save-state) exit 0 | twin exit 1
C6  SH-CI-10 fixed delimiter          plant 2 hits (notes<<EOF, body<<DELIM) exit 0 | twin exit 1
C7  SH-CI-11 '>>' in a shell: powershell step    plant exit 0 | twin exit 1
      reader: ReadAllLines(UTF8) on 5.1, 7.4, 7.6.6 -> count=2 line0=[MY_VAR=hello]; forced UTF-16LE file also decodes
      mixing, Windows PowerShell 5.1: utf8-then-redirect lines=4 [A=1][B?=?2?][?][?] ; redirect-then-utf8 lines=2 [A=1][??] ; utf8-then-utf8 lines=2 ok
      mixing, pwsh 7.4 and 7.6.6: all three orders [A=1][B=2]
C8  SH-CI-16 early-exit reader        plant 2 hits (grep -q, head -1) exit 0 | twin exit 1
C9  SH-CI-11 .ps1 writers             plant install.ps1:3 (Add-Content), :4 (>>) exit 0 | twin exit 1
      Add-Content with C:\Users\Jürgen\bin: 7.4 and 7.6.6 round-trip True ; Windows PowerShell 5.1 reads C:\Users\J?rgen\bin, round-trips False
C10 SH-CI-08/21 zizmor on the env-context plant, template-injection findings: high 0 | medium 0 | low 1 | informational 1
C11 SH-CI-07 combined grep           sub-artifact plants: inject.yml:11, inject-input.yml:16-17, inject-pwsh.yml:16 (twins silent)
      www-setup: update-dist.yml:27 ; test-installers.yml:206,207,239,241,269,271      ocx: notify-discord.yml:62,77,95,96 (with: block, false positives)
C12 SH-CI-17 Taskfile on task 3.54.0
      grep shopt-pipefail  bad: taskfile.yml:8 | good: empty ; grep separate set -o pipefail item  bad: taskfile.yml:5 | good: empty
      bad/sep-item rc=0 "SURVIVED" (pipefail not carried) ; bad/shopt-item rc=201 'invalid option name: "pipefail"' ; bad/inline-status rc=0 (status passes, task skipped)
      good/set-item rc=201 ; good/inline-item rc=201 ; good/inline-status rc=0 and prints "run" (status failed, task ran)
C13 fleet actionlint 1.7.12 over the 26 first-party workflow dirs
      default : 18 ShellCheck findings (SC2086 x8, SC2129 x5, SC2035 x4, SC2116 x1) in arcana 2, e2e-mirror 6, grimoire 5, grimoire-vscode 2, oras-www 1, vscode-ocx 2
      warning : 0 ShellCheck findings ; both runs also report grimoire release.yml:230:59 [expression] property "output" is not defined
```

#### Revision runs C14..C18 (this revision, 2026-10-11)

Run ad hoc with the commands inline: this revision may write only this file, so the scratch plants (session scratchpad) and the source downloads were not kept as a fixture directory. Red and green mean the same as above. Tools added: git 2.54.0, `task.exe` 3.54.0 and Windows PowerShell 5.1 on the Windows host (Windows 10.0.26200), `gh`/`curl` for read-only source fetches.

```
C14 SH-CI-20/14 the hosted-runner PATH (settles the second round's "unverified" item for the mechanism; not a runner run)
      sources read: runner-images main  images/windows/scripts/build/Install-Git.ps1  '/o:PathOption=CmdTools' and Add-MachinePathItem "C:\Program Files\Git\bin"
                    runner-images main  images/windows/scripts/helpers/PathHelpers.ps1  Add-MachinePathItem: $newPath = $PathItem + ';' + $currentPath   (prepends)
                    git-for-windows/build-extra  installer/install.iss:3395-3415  Cmd or CmdTools appends AppDir\cmd; CmdTools also appends AppDir\mingw64\bin and AppDir\usr\bin
                    install.iss:2214 radio text "Warning: This will override Windows tools like find and sort"
                    actions/runner-images#1525 (closed 2021-02-24)  2020-12-28 "decided to keep Git For Windows Bash in PATH for existing Windows images"; 2020-12-01 the Git for Windows maintainer: "we simply have to add Git's internal tools to the PATH for eternity"
      host run, Windows PowerShell 5.1 parent, task.exe 3.54.0, tw\bad (cmds: uname, grep, head):
        baseline PATH (no Git unix dirs)                     build-step | "uname": executable file not found in $PATH | os= | "head" and "grep" not found | exit status 127 | rc=201
        PATH + C:\Program Files\Git\mingw64\bin;...\usr\bin  Get-Command uname -> C:\Program Files\Git\usr\bin\uname.exe | build-step | os=MSYS_NT-10.0-26200 | 1 | rc=0
        resolution with those dirs appended (CmdTools order) find, sort, timeout, tar -> C:\Windows\system32\*.exe ; grep, sed, uname, date -> C:\Program Files\Git\usr\bin\ ; bash -> C:\Windows\system32\bash.exe on this host
                                                             (on the runner Git\bin is prepended, so bash would be Git Bash: source-read, unverified)
C15 SH-CI-23/24 re-run on the second round's outputs/ fixtures
      SH-CI-23  plant .github/workflows/steps-out.yml:17 and needs-out.yml:23, exit 0 | twin exit 1
      SH-CI-24  plant matrix-dyn.yml:26 and matrix-dyn-obj.yml:26 (pipeline statuses 0 0) | twin 123, no output
C16 SH-CI-30 recall (6 planted variants: unquoted; || echo "failed" && exit 1; || log "x $y" && next; || echo x >&2 && next; test -d "$d" || mkdir "$d" && cd "$d"; || b $(c) && d)
      N4 pattern  ' \|\| [^|&;(){}"'"'"'`\]]+ && '                                            plant 1 of 6 (the unquoted line) | twin silent
      this pattern ' \|\| (?:[^|&;(){}`\]]|\$\([^)]*\)|[0-9]?>&[0-9])+ && ' (run as written)   plant 6 of 6 | twin (grouped, if/elif, [[ a || b ]] && x, false || true) exit 1
      fleet, every tracked *.sh *.bash *.yml *.yaml *.bats, the fleet-orand.sh exclusions: 1 hit, grimoire-indexer/templates/ci/gitlab-publish.yml:28 (same as the narrow pattern)
      exemplar corpus: 10 lines in 4 repos: oils 7 (spec tests and docs of the syntax), shellspec lib/libexec.sh:181 and pure-bash-bible test.sh:248 (deliberate left-associative chains), ohmyzsh tools/check_for_upgrade.sh:28 (a multi-line false positive)
C17 SH-CI-29 git semantics, git 2.54.0, scratch repo with branch feat
      git checkout -- feat                              error: pathspec 'feat' did not match any file(s) known to git
      git checkout feat -- ; git switch -- feat ; git rev-parse --verify --end-of-options feat      ok (Switched to branch / Already on / 40-hex)
      git tag -- -dash ; git check-ref-format --branch -x    fatal: '-dash' is not a valid tag name ; fatal: '-x' is not a valid branch name (rc 128)
      pathspec grep 'git checkout[[:space:]]+--[[:space:]]+[^[:space:]]*[$]'   plant gitlab/evaltwin/.gitlab-ci.yml:3 exit 0 | corrected twin exit 1 | fleet (sh, yml, yaml) 0 hits
      corrected twin (git checkout "${CI_COMMIT_REF_NAME}" --): gl-extract.py --sh | shellcheck -s sh -f gcc exit 0 ; eval / sh -c grep exit 1
C18 re-runs of the second round's checkers (their fixtures untouched)
      win-task-lint.py   taskwin/bad 1 line (grep head uname) | good, good-bash, good-builtin silent ; --all: bad 2 lines, good-bash 2 lines (ignores the step shell), good and good-builtin silent
      gl-extract.py --sh + shellcheck -s sh -f gcc   plant: SC2086 x3, SC2070 exit 1 | twin exit 0 ; the stdin form 'shellcheck -s sh -f gcc -' gives the same
      eval and sh -c grep   plant 2 lines exit 0 | twin exit 1
      appendix copies of win-task-lint.py and gl-extract.py were diffed against the fixture files: identical (the docstring edit to win-task-lint.py came after, see the Revision log)
```

#### The second sub-artifact's runs N1..N12 (its V1..V12, relabelled; trimmed)

Fixture root `/home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/`, transcript `out/verify.txt`, script `verify-outputs-scope-and-taskfile-windows.sh`. Tools: act 0.2.89 (host mode), actionlint 1.7.12, zizmor 1.30.1, ShellCheck 0.11.0, task 3.54.0 (linux and `task.exe`), Git Bash 5.2.15, Windows 10.0.26200.9457, docker alpine:3.22, busybox:1.37, debian:12, shellzoo:deb12/deb13.

```
N1   SH-CI-23  outputs pattern on outputs/.github/workflows: steps-out.yml:17, needs-out.yml:23 exit 0 | twin exit 1
N2   SH-CI-24  grep -rliP 'fromjson(...' | xargs grep -Pn matrix pattern: matrix-dyn.yml:26, matrix-dyn-obj.yml:26 | twin exit 123 (empty)
N3   actionlint 1.7.12 -oneline on steps-out, needs-out, matrix-dyn, matrix-dyn-obj: exit 0 x4 (blind)
N-act act, event issues, canary files: steps-out EXECUTED | needs-out EXECUTED | matrix-dyn EXECUTED | matrix-dyn-obj EXECUTED ; twins inert (steps-out-env, needs-out-env, matrix-dyn-env), matrix-static prints item=alpha, item=beta
N4   SH-CI-30  ' \|\| [^|&;(){}"'"'"'`\]]+ && ' on plant/.gitlab-ci.yml:13 exit 0 | twin and orand/twin/ok.sh exit 1 ; shellcheck -s sh -o all: exit 0 (blind)
N5   SH-CI-28/29 gl-extract.py --sh | shellcheck -s sh -f gcc: SC2086 (5:15, 7:14), SC2070 (10:9) exit 1 | twin exit 0
N6   SH-CI-28  alpine job with [[ ]] and an array, -s sh: SC3010, SC3030, SC3054 exit 1 ; same text -s bash exit 0
N7   SH-CI-29  eval / sh -c grep: evalplant/.gitlab-ci.yml:3,4 exit 0 | evaltwin exit 1
N8   SH-CI-20/25 win-task-lint.py: bad 1 line | good (platforms:), good-bash (defaults.run.shell: bash), good-builtin silent ; --all bad 2 lines
       real task.exe 3.54.0: cmd.exe parent bad  "uname": executable file not found | "grep" | "head" | exit status 127 | rc=201 ; good rc=0 ; Git Bash parent bad os=MINGW64_NT-10.0-26200 rc=0
N9   SH-CI-27  platforms:[^#]*! grep: tfneg/bad/Taskfile.yml:4 exit 0 | good exit 1 ; task.exe 3.54.0 err: invalid platform "!windows" rc=102 (whole file refused)
N10  SH-CI-26  separator-template grep: tfsep/bad Taskfile.yml:5,6,7 exit 0 | good exit 1 ; task.exe: SEP=[] ; abc ; L= then "x": executable file not found ; single-quoted forms print \ , a\b\c , ;
N11  GitLab runner emulation (gitlab/emu): the four-entry by five-shell table in the second sub-artifact section 3.2
N12  zizmor persona sweep, 312 runs (zfleet/scan.sh): the table in the second sub-artifact section 1.3
N-probe  68-name PATH probe under task.exe 3.54.0: cmd.exe parent 38 absent, Git Bash parent 6 absent (second sub-artifact section 2.2)
```

Not run, with reason: the runner itself (act host mode is not the GitHub runner; argv comes from runner source); Git Bash 5.3.15 and uutils on the real runner image (needs a push and dispatch); the Windows hosted-runner PATH on a real runner (C14 is a source read plus a host measurement with the same directories appended); a real GitLab Runner (N11 transcribes `Finish()` and `writeCommands` from source; no runner binary or instance here); `win-task-lint.py` against a Taskfile with a dir-style `includes:`; any macOS host (none; BSD claims are "unverified: read only").

## Applied to the fleet and exemplars

### Satisfied

| Rule | Site | Evidence |
|---|---|---|
| SH-CI-06 | 16 composite actions with no missing `shell:`; model `ocx@5de9d777eb7d:.github/actions/bazel-cache-rc/action.yml:68-76` (`shell: bash`, `set -euo pipefail`, inputs through `env:`); the `ocx-mirror` copy | V10 fleet run |
| SH-CI-04 | `ocx@5de9d777eb7d:.github/workflows/deploy-dev.yml:135` and `ocx-mcp/.github/workflows/build-matrix.yml:79` set `shell: bash`; the other 4 container sites are single-line glue; checker output is empty | C4, `out/containers.txt` |
| SH-CI-13 | 0 `macos-*` legs with a bash 4+ construct; exemplars with macOS legs were not audited | V12 fleet run |
| SH-CI-09, SH-CI-14 | 0 deprecated workflow commands, 0 `cmd /c` hits | C5 grep over the fleet, V20 |
| SH-CI-17, SH-CI-18 | 0 violations across 99 taskfiles / 954 cmds; `set: [e, u, pipefail]` at `index/taskfile.yml:57,221` and `ocx-indexbot/taskfile.yml:28,123`; `ocx@5de9d777eb7d:taskfiles/rust.taskfile.yml:388-395` (`set -o pipefail;` before `cargo nextest ... \| tee`, with the reason in a comment); `ocx-mirror@71bb1c2953ba:taskfiles/release.taskfile.yml:40,117` and `:196-197` (`case` instead of `declare -A`, panic named) | V16, V17 |
| SH-CI-21 (partial) | zizmor at `--min-severity medium` in index, ocx-indexbot, ocx-catalog, ocx-website, grimoire-indexer | `grep -l zizmor` over `.github` |
| SH-CI-02 | exemplar `Homebrew__install@8ab1549dfa11:.github/workflows/actionlint.yml:11-13` and `stale-issues-and-prs.yml:17-19` (`defaults.run.shell: bash -xeuo pipefail {0}`); `actions__runner-images@8197087fc536:.github/workflows/ubuntu2404.yml:10-12` (`defaults.run.shell: pwsh`) | sub-artifact "Exemplar evidence" |
| SH-CI-07 | exemplar `pyenv@d28b75076714:.github/workflows/publish_binary.yml:27` passes `VERSION: ${{ inputs.version }}` through `env:`; `jdx__mise@19e8c8f0d03d:.github/workflows/zizmor.yml:1-17` runs zizmor in CI | sub-artifact |
| SH-CI-10 | the GitHub docs' pwsh example uses a GUID delimiter (satisfies) | sub-artifact |
| SH-CI-23, SH-CI-24 | `www-setup`, `setup-ocx`, `index` and every other repo with workflows: 0 output or dynamic-matrix run-body sites outside the list under Violated; `grimoire`/`ocx` `release.yml` matrices come from `dist plan` as simple names (zizmor catches 8 of those at Medium); exemplar `rust-lang__rustup@61271d00a979` has a literal matrix and `fromJSON('[...]')` only in an `if:` | second sub-artifact, "Exemplar evidence" and fleet counts; N1, N2, C15 |
| SH-CI-27 | none of the 99 taskfiles uses a negated `platforms:` value | N9 grep |
| SH-CI-20 | 0 lines at the CI scope (12 `task` calls in Windows jobs across 8 repos, 7 under `shell: bash`); `ocx@4ded080feed4:taskfiles/bazel.taskfile.yml` `test:unit` has `platforms: ['linux']` and `ocx verify-deep.yml` steps carry `if: matrix.job.name == 'Linux'` (belt and braces); `setup-grimoire@...:Taskfile.yml` `test:pester` runs `pwsh -Command` and is portable | N8, `out/q2-fleet-win-task-shells.txt` |
| SH-CI-28, SH-CI-29 | `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-enrich.sh:18-35` and `gitlab-stats-seed.sh:30-83` are POSIX sh on the alpine default; every `$CI_*` in a script body is double-quoted (`gitlab-ci.yml:82,96,117,122-126`); `grimoire-components@6fd8054116af:.gitlab-ci.yml:35,37` guards the only tag use with a semver regex; ShellCheck 0.11.0 `-s sh` over the extracted bodies of the 12 files: 0 findings | N5, N6 and the second sub-artifact §3.3 |

### Violated

| Rule | Site | Notes |
|---|---|---|
| SH-CI-01 | 22 default-shell pipeline steps in 11 repos: ocx 6, e2e-mirror 4, arcana 2, creeptd-ng 2, rules_ocx 2, and 1 each in ocx-indexbot, grimoire, ocx-sdk-python, www-setup, ocx-mcp, ocx-website (`out/ci01-fleet.txt`) | C1 command |
| SH-CI-01 | 770 pipelines in the mirror workflow family; generated: `mirror-bazelbuild/.github/workflows/mirror-bazelisk.yml:1-2` ("DO NOT EDIT - re-run `ocx-mirror package pipeline generate ci`") | count from `shell-audit/fleet-shell-shape.md:526`; the fix is one `defaults.run.shell: bash` in the generator (owner's call) |
| SH-CI-01 (exemplars) | pipelines without pipefail: `jdx__mise@19e8c8f0d03d` 23, `rust-lang__rustup@61271d00a979` 10, `k3s-io__k3s@82a6ddcd820b` 9, `acmesh-official__acme.sh@807da6498377` 9, `nvm-sh__nvm@b1b3a0038c06` 7, `starship__starship@d4d0459c5c24` 4 | default shell is the norm even in expert shell projects; Homebrew is the counter-example |
| SH-CI-07 | `www-setup@a251c3631047:.github/workflows/test-installers.yml:206,207,239,241,269,271` (`inputs.release_tag` in bash and pwsh bodies); `www-setup@a251c3631047:.github/workflows/update-dist.yml:27` (`client_payload.version` in an echo, low) | C11; the six sites are what zizmor reports as `error[template-injection]` (V5); actionlint is silent (V4). The map's Q7 named two lines |
| SH-CI-07 (exemplars) | `direnv@28a73d1df3f3:.github/workflows/update-gomod2nix.yml:29` (`HEAD:${{ github.head_ref }}`); `actions__runner-images@8197087fc536:.github/workflows/create_pull_request.yml:19-21` and `merge_pull_request.yml:21-23` (`client_payload.ReleaseBranchName`); `nvm@b1b3a0038c06:.github/workflows/nvm-install-test.yml:29-30`; `fzf@25adb674537b:.github/workflows/release.yml:36`; `k3s@82a6ddcd820b:.github/workflows/release.yml:173,279`; `conda@66d82122dc63:.github/workflows/build.yml:48` (`github.event.label.name` in a script) ; `pyenv@d28b75076714:.github/workflows/publish_binary.yml:42` | sub-artifact "Exemplar evidence" |
| SH-CI-10 | `setup-ocx@25fa771f8572:.github/workflows/release.yml:30-36` (fixed `EOF` with commit-derived text); exemplar: the GitHub docs' own example | V8 parser port reproduces `INJECTED=pwned` |
| SH-CI-11 | `www-setup/src/install.ps1:721` (`Add-Content -Path $env:GITHUB_PATH -Value $ghBinPath`, an installer that can run under 5.1; non-ASCII paths read back as U+FFFD, C9) | the C9 `.ps1` grep over the 26 first-party dirs has 3 hits: this one; `setup-grimoire/.github/scripts/install.ps1:70` (satisfies: `action.yml:64` runs it as `pwsh -NoProfile -File`, 7.x); `ocx-mcp/external/ocx/website/src/public/install.ps1:492` (a submodule copy of ocx's installer, same shape as this one) |
| SH-CI-16 | `grimoire-indexer@19fe2dcb5dc1:.github/workflows/release.yml:48-55` (`npm publish ... \| grep -q` guard; the sub-artifact cites :51) | SIGPIPE fail-open if the step gains pipefail (V11 `failopen.sh`) |
| SH-CI-12 (pointer; PS-ERR-03 owns it) | `ocx@5de9d777eb7d:.github/workflows/shell-activation-deep.yml` job `windows`, step "env.ps1 gate - PowerShell 7 (ocx-installed Core)", lines 158-169 | the only hit of `pwsh-run-lint.py` over the fleet (pwsh dive) |
| SH-CI-23 | authored: `ocx@4ded080feed4:.github/workflows/build-windows-shims.yml:210` (`committed='${{ steps.paths.outputs.committed }}'`, a path the same job computed, benign) and `e2e-mirror@a4c9fc67afb5:.github/workflows/mirror-signing.yml:196` (`VERSIONS='${{ needs.discover.outputs.versions }}'`); generated, fixed in the generator: `grimoire@4650ad830375:.github/workflows/release.yml:146,204,268,299` and `ocx release.yml:151,209,285,316` (`needs.plan.outputs.tag-flag`, from `dist plan` over a pushed tag, maintainer rights needed) and 15 lines in the mirror family (`needs.discover.outputs.versions`) | N1, C15; the `with:` lines `ocx release.yml:171,236`, `grimoire release.yml:166,231`, `docker-publish.yml:188` are false positives. Not exploitable by an outsider today; the rule is stated on the syntax |
| SH-CI-23 (exemplars) | 114 run-body lines in 17 of 38 repos: `acmesh-official__acme.sh@807da6498377:.github/workflows/Solaris.yml:61`, `Windows.yml:76`, `Hurd.yml:49` (a tunnel hostname from a third-party action into `$GITHUB_ENV`); `nvm-sh__nvm@b1b3a0038c06:.github/workflows/nodejs-org.yml:63,95,96`; `JanDeDobbeleer__oh-my-posh@b0a8acd4d402:.github/workflows/publish-mcp.yml:36,37` and `release.yml:49`; generated `atuinsh__atuin@56525ac6a7a9:.github/workflows/release.yml:149` | second sub-artifact "Exemplar evidence"; none passes the value through `env:` in the sampled files; most are version strings from the repo's own jobs |
| SH-CI-24 | `e2e-mirror@a4c9fc67afb5:.github/workflows/mirror-signing.yml:99,102` and 15 sibling workflows: 32 `matrix.version.version` run-body lines (shape `--version "${{ matrix.version.version }}"`, e.g. `mirror-bazelbuild@713abea9fbb8:.github/workflows/mirror-bazelisk.yml:99,102`), generated ("DO NOT EDIT - re-run `ocx-mirror package pipeline generate ci`"); the value is a version string the source crawl produced from `github_release`, `pypi`, `pylock` or `url_index`, and a git tag name may contain `$(id);"x"` (`git check-ref-format` accepts it); whether ocx-mirror rejects such a tag first is unverified (not opened) | N2; the fix is the generator's. Exemplars: `pyenv__pyenv@d28b750767d4:.github/workflows/modified_scripts_build.yml:92,112,119` (the list is derived from files changed in a PR), `nvm-sh__nvm@b1b3a0038c06:.github/workflows/nvm-install-test.yml:55,67,70` |
| SH-CI-25 | 84 ungated tasks in 32 Taskfiles of 11 repos use tools absent from a plain Windows PATH (`grep` 41, `sed` 32, `tail` 21, `dirname` 14, `cut` 11, `tee` 11, `wc` 10, `date` 9, `sha256sum` 9) | N8 `--all`; Linux-only today, kept off Windows by `if:` gating; advisory |
| SH-CI-30 | `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28` (`apk add --no-cache curl git tar \|\| apt-get update && apt-get install -y curl git tar`; on the job's default `node:*-alpine` image `apk` succeeds, `\|\|` skips `apt-get update`, `&&` still runs `apt-get install`, rc 127) | the only hit over every tracked shell/YAML file of the fleet (C16); invisible to ShellCheck 0.11.0 (also `-o all`); reported, not fixed |
| SH-CI-21 / SH-GATE-01 | `ocx@5de9d777eb7d:taskfiles/ci.taskfile.yml:17-25` (`SHELLCHECK_OPTS: '--severity=warning'`) and the rule text at `ocx@5de9d777eb7d:.claude/rules/subsystem-ci.md:130-132` (severity floor); `www-setup@a251c3631047:.github/workflows/verify.yml:103-109` runs actionlint but misses `inputs.*`; zizmor is absent in ocx, grimoire, www-setup, setup-ocx and setup-grimoire | C2, C13 |
| SH-CI-21 (exemplar) | `k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:19-20` runs actionlint with `shellcheck: false` | run bodies are unlinted |
| sibling defect (M-X-04) | `skills/nix-flake-adopt/references/ci-and-readme.md:4` calls `bash --noprofile --norc -eo pipefail` "the shell GHA uses"; true only for an explicit `shell: bash` | reported, not fixed |
| sibling defect (audit) | `shell-audit/platform-matrix.md:267` says the hosted Windows images put "only `git` on PATH, not the Unix tools"; the installer source says `CmdTools` adds `mingw64\bin` and `usr\bin` | C14; reported, not fixed (decision 12, conflict 15) |
| sibling defect (audit) | `shell-audit/fleet-shell-shape.md:430` counts 21 GitLab CI files; the fleet has 12 (8 YAML, 4 script fragments), the 21 included 14 GitHub templates | second sub-artifact §3.1; reported, not fixed |
| unrelated finding | `grimoire@4650ad830375:.github/workflows/release.yml:230:59` actionlint `[expression]` "property output is not defined" (likely `outputs`) | C13; reported, not fixed |

### New commitments

1. A `lint:workflows` gate per repo with workflows: actionlint at default severity (SH-GATE-01 and SH-GATE-19), zizmor in the `regular` persona at `--min-severity medium`, and the SH-CI-07/08/09/10/11/23/24 greps.
2. The narrow SH-CI-01 check and `job-shell-lint.py` (SH-CI-04, SH-CI-13) run in the same task. A repo with Taskfiles adds the SH-CI-17/18/26/27 greps and `win-task-lint.py` (SH-CI-20, advisory); a repo with GitLab CI adds the `gl-extract.py` + ShellCheck pair, the SH-CI-29 greps and the SH-CI-30 grep.
3. Any edit to a step that has a pipeline sets its shell (SH-CI-01); the fleet-wide `defaults.run.shell: bash` and the mirror generator change are the owner's call (open question 1).
4. Windows installers that may run under 5.1 write env files with `Out-File -Encoding utf8 -Append` (SH-CI-11).
5. The program files nothing: no issues or PRs for the findings above (owner Q6/Q7).

## AI-agent failure modes

Ranked by how often each bites, using fleet counts where they exist and the exemplar corpus otherwise. Each has a mechanical check.

| Rank | Failure mode | Bite evidence | Mechanical check |
|---|---|---|---|
| 1 | Writes `cmd1 \| cmd2` in a `run:` with no `shell:` and assumes pipefail. | 22 fleet steps, 770 generated pipelines, 6 exemplars with 4 to 23 each | SH-CI-01 command |
| 2 | Interpolates `${{ github.event.* }}` / `${{ inputs.* }}` into `run:`, or believes `${{ env.X }}` is the safe form. | 6 fleet sites, 7 exemplar repos, every tutorial | SH-CI-07 and SH-CI-08 greps, zizmor |
| 3 | Writes bash (`[[`, arrays, `pipefail`) in a container job that runs under `sh -e`. | silent skip on debian images (C4) | `job-shell-lint.py` (SH-CI-04) |
| 4 | Puts bare `set -o pipefail` under `shell: sh`. | aborts dash 0.5.12-6ubuntu5 with exit 2 (V13) | SH-CI-03 list and actionlint SC3040 |
| 5 | Emits 2020-era `::set-output` / `::set-env` / `::add-path`. | training-data pattern; `::set-env` is refused | SH-CI-09 grep |
| 6 | Writes a fixed `EOF` delimiter for a multiline output or env value. | 1 fleet site, the docs' own example | SH-CI-10 grep |
| 7 | Enables pipefail (or copies `set -euo pipefail`) and leaves `\| grep -q` / `\| head` in the same step. | 1 fleet site; 141 on 8 bash versions | SH-CI-16 grep |
| 8 | Writes Taskfile `cmds` as if they ran under bash (`printf -v`, `PIPESTATUS`, `shopt: [pipefail]`, `declare -A m; m[x-y]=v`, `set -o pipefail` as its own item). | 0 fleet hits today; four measured traps | SH-CI-17 and SH-CI-18 greps |
| 9 | Writes `>>`, `Add-Content` or a mixed pair into `$GITHUB_ENV` under `shell: powershell`. | 1 fleet `.ps1` site | SH-CI-11 greps |
| 10 | Runs several native commands in a `shell: pwsh` block and trusts `$ErrorActionPreference`. | 1 fleet step | `pwsh-run-lint.py` (PS-ERR-03; SH-CI-12 points at it) |
| 11 | Puts bash 4 code (`declare -A`, `mapfile`, `${x,,}`) in a `macos-*` job. | 0 fleet hits; 20 failing constructs on bash 3.2 | `job-shell-lint.py` (SH-CI-13), SH-DIAL-06 |
| 12 | Uses `cmd /c` or `/tmp` paths under Git Bash. | 0 fleet hits | SH-CI-14 grep |
| 13 | Sniffs GNU with `--version \| grep GNU`. | breaks on uutils in the 26.04 image (V21) | SH-CI-15 grep |
| 14 | Hallucinates `shell: dash`, `shell: zsh`, `shell: fish`, `shell: nu` (the runner needs a template with `{0}`). | actionlint: "shell name is invalid" | actionlint at default severity |
| 15 | Assumes `export`, `cd` or a shell variable persists between steps (use `$GITHUB_ENV`/`$GITHUB_PATH`). | common prior; no fleet count | reading heuristic only: a variable assigned in one step and read in another in the same job |
| 16 | Treats "I moved the title into `env:` in job A" as the end of the fix, then writes `${{ needs.a.outputs.title }}` or `${{ steps.x.outputs.y }}` in a later run body. | 10 fleet sites (2 authored), 114 exemplar lines in 17 of 38 repos | SH-CI-23 grep |
| 17 | Believes `matrix.*` is always a constant: writes `fromJSON(needs.x.outputs.y)` and then `${{ matrix.item.field }}` in `run:`. | 32 generated fleet lines, 35 exemplar lines in 6 repos | SH-CI-24 two-step grep |
| 18 | Reads a clean zizmor run (`regular`, `medium`) as "no injection", or reaches for `--persona=auditor` to be thorough and gets 140 findings against 18, every added line a constant or a smell. | zizmor hides outputs below informational and dotted matrix access at every level (1.30.1) | the greps; the gate stays `regular`/`medium` |
| 19 | Writes `uname`, `sed`, `grep`, `head`, `wc`, `date` in a Taskfile as if Task shipped a POSIX userland (it ships 14 u-root utilities on Windows, not GNU), or assumes `ls -la` and `find . -name x` behave like GNU. | 84 ungated fleet tasks, advisory | `win-task-lint.py` (SH-CI-20, SH-CI-25) |
| 20 | Writes `platforms: ['!windows']` (negation exists in other tools) or backslash paths and `{{.FILE_PATH_SEPARATOR}}` in `cmds`. | 0 fleet hits; rc 102 on the whole file | SH-CI-27 and SH-CI-26 greps |
| 21 | Adds `set -euo pipefail` to every GitLab `script:` as in GitHub tutorials, or writes bash (`[[`, arrays) in a job on an alpine image because "GitLab uses bash". | 0 fleet findings; the runner already sets errexit and pipefail | SH-CI-28 extractor + `shellcheck -s sh` |
| 22 | Uses `$CI_COMMIT_MESSAGE`, `$CI_COMMIT_REF_NAME` unquoted or inside `eval` / `sh -c "..."`, assumes GitLab substitutes safely; or writes `git checkout -- "$ref"` as the safe form (a pathspec). | 0 fleet hits | SH-CI-29 greps and extractor |
| 23 | Writes `A \|\| B && C` as "try A, else B then C" (`apk add ... \|\| apt-get update && apt-get install`). | 1 fleet defect; ShellCheck is blind | SH-CI-30 grep |
| 24 | Copies GitHub's `${{ }}` model into GitLab (`${{ ... }}` does not exist there; `$VAR` is the shell's). | no count | reading heuristic only |
| 25 | Calls `bash -c` from a Taskfile on Windows and gets WSL (the local host) or Git Bash (the runner image prepends `Git\bin`: source-read, unverified). | no count | SH-CI-20 text; no check |

Ranks 1 to 15 are the first consolidation's order and are unchanged; ranks 16 to 25 come from the second round and the C14 correction, ordered by how often each bites.

## Open questions

Owner decisions, each with the default the program applies until told otherwise:

1. **Set `defaults.run.shell: bash` fleet-wide (482 default-shell steps) and fix the mirror generator (770 pipelines)?** Default: no. SH-CI-01 applies to every step the program touches; SH-CI-02 stays a SHOULD; the generator change is the owner's call and the program files nothing (Q6/Q7).
2. **Add zizmor to ocx, grimoire, www-setup, setup-ocx and setup-grimoire?** Default: SH-CI-21 requires a template-injection check and names zizmor; the SH-CI-07/08/23/24 greps are the MUST fallback where zizmor is absent.
3. **Drop ocx's `--severity=warning` actionlint floor?** Default: yes, adopt SH-GATE-01 and SH-GATE-19. C13 shows what appears: 18 ShellCheck findings in 6 of 26 repos (mostly info level, 8 of them SC2086). ocx's `ci.taskfile.yml:17-25` and `subsystem-ci.md:130-132` change with it.
4. **Pin `ubuntu-24.04` until 2026-11-19?** Default: no pin; SH-CI-15 asks for a leg on both versions in shell-heavy jobs only.
5. **File issues for the injection, `EOF`, 5.1 and SIGPIPE findings?** Default: no; the findings are listed in "Violated" for the owner to action.
6. **Change the two generators whose output violates SH-CI-01/23/24: cargo-dist (`needs.plan.outputs.*` in `release.yml`) and `ocx-mirror package pipeline generate ci` (`matrix.version.version`, `needs.discover.outputs.versions`, 770 default-shell pipelines)?** Default: no; generated files are exempt from SH-CI-23/24, the fix belongs to the generator, and the program files nothing. Whether ocx-mirror rejects a tag such as `v1$(id)` before it reaches the matrix is the first thing to check.
7. **Fix `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28` (`apk ... || apt-get update && apt-get install`) and add the two GitLab globs to the `shell-quality` list?** Default: the globs yes (index owner, `--allow-absent`); the defect is reported, not fixed.

Subareas needing another research round:

- **Real GitHub runner probe.** Question: on a GitHub-hosted runner, what is the default shell inside a `container:` job, does a workflow-level `defaults.run.shell` merge with job-level, are the 26.04 runner image's coreutils uutils, does Git Bash 5.3.15 convert paths as 5.2.15 does, does the 5.1 env-file mixing reproduce there, and on a Windows image does a pwsh-launched `task` resolve `grep`, `uname` and `bash` from Git's directories as the C14 source read says (this alone decides whether SH-CI-20 can return to MUST)? The owner must push and dispatch it; nothing here can run on a runner.
- **Real GitLab Runner probe.** Question: does a combined `script:` block stop at the first failing line (the source) or report only the last command (the docs), and which shell does a `node:*-alpine` job get? Needs a runner or its binary; the emulation (N11) cannot settle it.
- **Currency re-runs (scheduled, not research).** On each task bump re-run `Taskfile.assoc.yml`, C12, the `platforms:` negation plant and the 68-name probe; on each zizmor bump re-run the dotted-matrix plant (N-act); on the next ShellCheck release re-check SC2337, the SC3040 acceptance of `pipefail` (SH-CI-03) and whether any code covers `A || B && C` (SH-CI-30).
- **Map resolutions not folded here.** X6 (SH-CI-19 points at the SH-GATE-07 allow table), X8 (SH-CI-11 against PS-ENC-03: `AppendAllText` in `.ps1` files) and X10 (SH-CI-05 scoped to bash templates) were not part of this revision's brief and are not applied; they are edits, not research.

## Revision log

Revision of 2026-10-11 (the follow-up round the first consolidation commissioned). IDs SH-CI-01..22 keep their numbers and meanings; SH-CI-23..30 are new. One line per change: what, which IDs, why.

- Added SH-CI-23 and SH-CI-24 (section B). The `steps/needs` outputs and dynamic-matrix values are code in a run body; act executed the payload through a safe first hop, actionlint is blind, zizmor shows outputs only at informational and misses dotted matrix access (N1..N3, N-act).
- Extended SH-CI-07 and Verdict 4 in place: the attacker-reachable set now includes outputs and dynamic `matrix.*`, and "matrix, sha and runner values are not findings" became "literal-matrix, sha and runner values". Why: the old sentence contradicted SH-CI-24.
- Extended SH-CI-21 in place: the gate adds the SH-CI-23 and SH-CI-24 greps and names the `regular` persona. Why: the presence rule would otherwise pass a gate that misses outputs. The persona sweep (N12) settled that pedantic, auditor and the informational floor add noise, not true positives; Open question "Scope of SH-CI-07" is answered and removed.
- Rewrote SH-CI-20 and held it at SHOULD. The first consolidation had it as a SHOULD with no check; the second round supplied `win-task-lint.py` (N8) and raised it to a scoped MUST on the premise that a Windows pwsh or cmd step lacks `uname sed grep ...`. C14 refutes that premise for hosted images (Git installed with `PathOption=CmdTools`, whose installer appends `mingw64\bin` and `usr\bin`; the failing plant passes with those directories on the PATH), so the level stays SHOULD, with a promotion condition. Verdict 12, conflict 15.
- Corrected SH-CI-14 in place: the clause "do not rely on MSYS tools from pwsh or cmd steps" rested on an audit sentence that C14 refutes, and the `cmd //c` / `MSYS_NO_PATHCONV=1 cmd /c` pairs are now stated as never mixed (shell-dialect.md SH-USER-15 assigned the CI step to this rule).
- Added SH-CI-25, SH-CI-26, SH-CI-27 (section E). Windows developer runs of a Taskfile, template output with backslashes and `;`, and `platforms:` negation (rc 102): all measured with task 3.54.0 on the Windows host (N8..N10).
- Added SH-CI-28, SH-CI-29, SH-CI-30 and the two GitLab globs (new section G). GitLab's runner sets errexit and pipefail, so the dialect follows the image; the quoting rules differ from GitHub's; `A || B && C` is the one fleet defect (N4..N7, N11). The audit's "21 GitLab CI files" is 12.
- Changed SH-CI-29 in place from the second round's text: "`--` before a value used as a path or ref" is wrong for refs (`git checkout -- feat` is a pathspec error, C17); the text now separates path operands from refs and adds a list grep for the misuse.
- Changed SH-CI-30 in place from the second round's text: the left-associative form is a deliberate idiom in expert code, and the recorded grep missed 5 of 6 quoted variants (C16); the rule now demands explicit grouping and the grep is widened (fleet count unchanged at 1).
- Turned SH-CI-12 into a pointer row (map X9; PS-ERR-03 owns the text and the check) and re-pointed the stale references (map X7): SH-GATE-01/27 to SH-GATE-01 and SH-GATE-19 (SH-GATE has IDs 01..20) in Verdict 9, SH-CI-21, conflict rows 2, and New commitments; the SH-GATE-32 clause deleted from SH-CI-22; BVG-02/03 to SH-DIAL-06 and SH-DIAL-25 in SH-CI-13 and the agent table; PS-ERR-01/04 to PS-ERR-03 in Verdict 6, SH-CI-12 and conflict row 4; SH-ERR conflict 18 to SH-ERR-09 in SH-CI-16 and row 14. The shell-expansion.md items of X7 belong to that file and are not edited here.
- Added Verdict items 11 (GitLab), 12 (the Windows PATH correction) and 13 (documented gaps: no real GitHub runner, no real GitLab Runner, the zizmor dotted-matrix miss, the one-line `script:` blind spot, the untested `includes:` corner); extended Verdict 8 and 9.
- Open questions: removed the answered subareas (SH-CI-07 scope, GitLab CI templates, the Windows half of Taskfile currency), turned the rest into the real-runner probe, a GitLab Runner probe, scheduled currency re-runs and the map resolutions not folded; added owner questions 6 and 7.
- Fixed two arithmetic slips of the second round against its own tables: outputs sites are 10 (9 `needs` plus 1 `steps`), not 9, and the informational floor adds 125 findings in all, 115 of them from other audits (conflict 17).
- Relabelled the second sub-artifact's runs V1..V12 as N1..N12 (they collided with V1..V23) and added this revision's runs C14..C18.
- Appendix: `win-task-lint.py` docstring corrected (it named SH-CI-24 for the advisory scope, which is SH-CI-25) and given a PATH note; `gl-extract.py` docstring corrected (it claimed a per-job function wrapper the code does not write). Logic of both unchanged.
- Counts: 22 rules (14 MUST, 8 SHOULD) became 30 (20 MUST, 9 SHOULD, 1 pointer row). Frontmatter: `consolidates` lists the second sub-artifact, `revised: 2026-10-11`.
- Not applied: map X6, X8 and X10 (see Open questions); the cross-file X7 items in shell-expansion.md; fixes to the sibling audit sentences (`platform-matrix.md:267`, `fleet-shell-shape.md:430`), which are reported under "Violated".

## Sub-artifacts

- [shell-ci/run-steps-and-taskfiles.md](shell-ci/run-steps-and-taskfiles.md): the research dive. Source of the 20 original rule candidates, runs V1..V23, the exemplar evidence table and the full source table (30+ URLs).
- [shell-ci/outputs-scope-and-taskfile-windows.md](shell-ci/outputs-scope-and-taskfile-windows.md): the follow-up round. Source of SH-CI-23..30, the SH-CI-20 and SH-CI-25 checker, the GitLab extractor, runs N1..N12 and N-act (its V1..V12), the zizmor persona sweep, the 68-name Windows PATH probe, the exemplar and fleet counts for outputs and matrix, and 15 sources.
- Consolidation fixtures and transcript: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/ci-consolidation/` (outside the repo; `out/verify-ci-consolidation.txt` has runs C1..C13). Runs C14..C18 are inline in [Verification runs](#verification-runs).
- Second-round fixtures and transcript: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/outputs-scope-and-taskfile-windows/` (`out/verify.txt`).
- Checker source: [Appendix: job-shell-lint.py](#appendix-job-shell-lintpy), [Appendix: win-task-lint.py](#appendix-win-task-lintpy), [Appendix: gl-extract.py](#appendix-gl-extractpy).

## Key sources

1. https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md (`defaults.run.shell`, exit codes, the 21,000-character limit)
2. https://github.com/github/docs/blob/main/data/reusables/actions/supported-shells.md (the command run per `shell:` value and OS)
3. https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md (script injection, intermediate environment variable)
4. https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-commands.md (environment files, multiline delimiter, PS 5.1 versus 6 encoding)
5. https://securitylab.github.com/resources/github-actions-untrusted-input/ (the untrusted-context list, 2021)
6. https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs (shell selection, container default, composite guard, `{0}` check)
7. https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs (argument formats, pwsh prepend and append)
8. https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs (GITHUB_ENV/OUTPUT/PATH parsing)
9. https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs (`::set-env`, `::set-output`, `::add-path` handling)
10. https://github.com/actions/runner-images/issues/14748 (ubuntu-latest to 26.04, 2026-10-19 to 2026-11-19)
11. https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md (bash 3.2.57)
12. https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md (Git Bash 5.3.15, Git 2.56.0)
13. https://github.com/go-task/task/issues/2469 (`status:` ignores `set:`, open)
14. https://github.com/rhysd/actionlint/blob/main/docs/checks.md (ShellCheck integration, untrusted-input list, shell-name check)
15. https://docs.zizmor.sh/audits/ (template-injection audit and its remediation)
16. https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/audit/template_injection.rs (severity, confidence and persona per context; outputs are Informational/Low)
17. https://github.com/zizmorcore/zizmor/blob/v1.30.1/crates/zizmor/src/models/workflow/matrix.rs (`expands_to_static_values`, the dotted-access false negative)
18. https://github.com/zizmorcore/zizmor/blob/v1.30.1/docs/usage.md (personas, `--min-severity`, exit codes 11 to 14)
19. https://taskfile.dev/blog/windows-core-utils and https://taskfile.dev/docs/guide/platforms and https://taskfile.dev/docs/reference/templating (Task's Windows core utilities and `TASK_CORE_UTILS`, `platforms:` values, `FILE_PATH_SEPARATOR` and `joinEnv`)
20. https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/bash.go and https://gitlab.com/gitlab-org/gitlab-runner/-/blob/main/shells/abstract.go (shell detection order, the errexit and pipefail preamble, `writeCommands`), with https://docs.gitlab.com/ci/yaml/script/, https://docs.gitlab.com/runner/shells/ and https://docs.gitlab.com/ci/variables/
21. https://github.com/actions/runner-images/blob/main/images/windows/scripts/build/Install-Git.ps1 and https://github.com/actions/runner-images/blob/main/images/windows/scripts/helpers/PathHelpers.ps1 (`PathOption=CmdTools`, `Add-MachinePathItem` prepends), https://github.com/actions/runner-images/issues/1525 (Git's tools stay on the PATH)
22. https://github.com/git-for-windows/build-extra/blob/main/installer/install.iss (what `PathOption=CmdTools` adds to the PATH, lines 3395-3415)

Also used inline: [Ubuntu2604 README](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md), [metadata-syntax.md](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/metadata-syntax.md), [MSYS2 filesystem paths](https://www.msys2.org/docs/filesystem-paths/), [actions/runner#1533](https://github.com/actions/runner/issues/1533), and the sub-artifact's source table.

## Appendix: job-shell-lint.py

Checker for SH-CI-04 and SH-CI-13. Usage: `python3 job-shell-lint.py <workflows-dir>...` (needs PyYAML; do not use `python3 -I`). One line per violating step; empty output means pass.

```python
#!/usr/bin/env python3
import os, re, sys, yaml
BASH4 = re.compile(r'declare\s+-A|\bmapfile\b|\breadarray\b|\$\{[A-Za-z_]+(?:,,|\^\^)\}|&>>|\bwait\s+-n\b|\$EPOCHREALTIME|\blocal\s+-[nA]\b')
BASHISM = re.compile(r'\[\[|\bpipefail\b|\bdeclare\b|\bmapfile\b|\$\'|<\(|\bsource\b|\(\(|\$\{[A-Za-z_]+(?:,,|\^\^|/)')
def dget(d, *ks):
    for k in ks:
        d = d.get(k) if isinstance(d, dict) else None
    return d
for root in sys.argv[1:]:
    for dp, _, fns in os.walk(root):
        for fn in sorted(fns):
            if not fn.endswith(('.yml', '.yaml')): continue
            p = os.path.join(dp, fn)
            try: doc = yaml.safe_load(open(p))
            except Exception as e: print(f'{p}: unparsable: {e}'); continue
            if not isinstance(doc, dict): continue
            wf_shell = dget(doc, 'defaults', 'run', 'shell')
            for jid, job in (doc.get('jobs') or {}).items():
                if not isinstance(job, dict): continue
                shell_default = dget(job, 'defaults', 'run', 'shell') or wf_shell
                blob = yaml.dump({'r': job.get('runs-on'), 's': job.get('strategy')})
                for i, st in enumerate(job.get('steps') or []):
                    run = st.get('run') if isinstance(st, dict) else None
                    if not run: continue
                    shell = st.get('shell') or shell_default
                    if job.get('container') and not shell and BASHISM.search(run):
                        print(f'{p}: job={jid} step#{i} SH-CI-04 container job, no shell:, bash syntax in body')
                    if 'macos' in blob and BASH4.search(run) and (not shell or str(shell).startswith('bash')):
                        print(f'{p}: job={jid} step#{i} SH-CI-13 macos leg, bash 4+ construct in body')
```

## Appendix: win-task-lint.py

Checker for SH-CI-20 (tasks a Windows non-bash CI step reaches) and SH-CI-25 (`--all`, every ungated task). Usage: `python3 win-task-lint.py [--all] <repo-root>...` (needs PyYAML; do not use `python3 -I`). One line per violating task; empty output means pass; the exit status is always 0, so judge by the output. The `ABSENT` set is the 3.54.0 measurement on a plain Windows PATH (`cmd.exe` parent, Windows 10.0.26200); on a GitHub-hosted image most of these names resolve from Git's `usr\bin` (C14), so a hit there is advisory for the GNU names. Source: the second sub-artifact's appendix; only the docstring differs (it named SH-CI-24 for the advisory scope and had no PATH note).

```python
#!/usr/bin/env python3
"""SH-CI-20 / SH-CI-25 checker. Usage: win-task-lint.py [--all] <repo-root>...
Default (SH-CI-20 scope): report tasks that a `task NAME` call in a Windows-runner step with a non-bash shell reaches,
whose cmds use a command ABSENT from a plain Windows PATH under task 3.54.0 (measured on a host without Git's
mingw64/bin and usr/bin; a GitHub-hosted image has those directories on PATH, so a hit there is advisory for the GNU
names), and that are not platforms-gated. --all (SH-CI-25 scope): report every ungated task in every Taskfile.
Output is the violation; empty = pass. Needs PyYAML (no python3 -I)."""
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

Extractor for SH-CI-28 and SH-CI-29. Usage: `python3 gl-extract.py [--sh|--bash] FILE.yml > extracted.sh`, then `shellcheck -s sh -f gcc extracted.sh` (or pipe to `shellcheck -s sh -f gcc -`). Needs PyYAML; do not use `python3 -I`. Line numbers are not preserved (a `# job:key` comment precedes each entry). Source: the second sub-artifact's appendix; only the docstring differs (it claimed each job is wrapped in a function, and the code does not).

```python
#!/usr/bin/env python3
"""Extract every before_script/script/after_script entry of a GitLab CI file into one shell file for ShellCheck.
usage: gl-extract.py [--sh|--bash] FILE.yml > out.sh      ({{placeholder}} template tokens are blanked first)
Entries are concatenated in file order with no function wrapper, so ShellCheck sees one flat script; line numbers are
not preserved (a '# job:key' comment precedes each entry). Needs PyYAML (no python3 -I)."""
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
