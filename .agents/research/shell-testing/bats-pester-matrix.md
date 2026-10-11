---
title: "bats, Pester and the interpreter matrix in CI"
topic: "Shell and PowerShell tests (SH-TEST): framework per dialect, watched-red assertion forms, version pins, the Pester pin for PS-GATE, the CI matrix recipe"
agent: W3-6 testing/bats-pester-matrix
model: sonnet
date_researched: 2026-10-11
sources_count: 25
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/bats-pester-matrix/
scope: |
  Covers rows M-G-01..M-G-05 (framework per dialect, vacuous passes, bats 1.14.0 changes, the interpreter matrix, installer test hatches) and M-T-04/M-T-05 (Pester 5 vs 6, the discovery/run split), measured on bats 1.11.1 / 1.13.0 / 1.14.0 (bash 3.2-5.3 images, Git Bash 5.2.15 on the Windows host) and Pester 5.7.1 / 5.9.1 / 6.2.0 (pwsh 7.4.7, 7.6.6, Windows PowerShell 5.1.26100).
  Not covered: ShellCheck/shfmt gate wiring for .bats (SH-GATE-09/-11 own it), quoting-test technique (SH-EXP-23), emitter hostile corpora (SH-EMIT-04/32), the posix matrix list itself (SH-DIAL-04), PSScriptAnalyzer settings (PS-GATE-01/-02), Import-Module on 5.1 (PS-COMPAT-08).
  No macOS host exists: every BSD/macOS statement is marked "unverified: read only". bats-core's parallel mode, junit formatter and Docker image are out of scope.
---

# bats, Pester and the interpreter matrix in CI

Date of all measurements: 2026-10-11. Fleet commits: `www-setup@a251c3631047`, `setup-grimoire@1259e35b2550`. Exemplar commits are in `shell-audit/scratch/exemplar-shas.md` (`bats-core@0c92eb4c418d`, `pyenv@d28b750767d4`, `rbenv@07e9b1e297a5`, `shellspec@f2d13f991885`). `FX` below means the fixture directory in the frontmatter.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 Which framework for which dialect](#f1-which-framework-for-which-dialect-m-g-01)
   - [F2 Thirteen ways a bats suite stays green on a failing assertion](#f2-thirteen-ways-a-bats-suite-stays-green-on-a-failing-assertion-m-g-02)
   - [F3 What bats 1.14.0 changed, and what it did not](#f3-what-bats-1140-changed-and-what-it-did-not-m-g-03)
   - [F4 Empty suite, missing -r, skipped tests: the census](#f4-empty-suite-missing--r-skipped-tests-the-census)
   - [F5 Version pins and what the distros ship](#f5-version-pins-and-what-the-distros-ship)
   - [F6 The interpreter matrix recipe](#f6-the-interpreter-matrix-recipe-m-g-04)
   - [F7 Installer test hatches and the fixture server](#f7-installer-test-hatches-and-the-fixture-server-m-g-05)
   - [F8 Pester 5 vs 6: the pin for PS-GATE](#f8-pester-5-vs-6-the-pin-for-ps-gate-m-t-04)
   - [F9 Pester vacuous passes and the census gate](#f9-pester-vacuous-passes-and-the-census-gate)
   - [F10 Pester's discovery/run split](#f10-pesters-discoveryrun-split-m-t-05)
   - [F11 What the fleet does today](#f11-what-the-fleet-does-today)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Use bats-core 1.14.0, vendored by tag (submodule or `git clone --branch v1.14.0`), for every bash and installer test; Debian 13 ships 1.11.1 and Ubuntu 26.04 ships 1.13.0, and both pass a suite that 1.14.0 fails ([Debian](https://packages.debian.org/trixie/bats), [Ubuntu](https://packages.ubuntu.com/resolute/bats), FX/pin-and-canary.sh).
- Start every `.bats` file with `bats_require_minimum_version 1.5.0`: `run -N` and `run !` need it, and the docs say the failure mode on older bats is "tests pass erroneously" ([writing-tests](https://bats-core.readthedocs.io/en/stable/writing-tests.html)). 4 of 10 fleet `.bats` files lack it.
- On bats 1.14.0 with bash 5.3, 10 of 13 planted failing assertions stay green (bare `!`, `&&` lists, `|| true`, `|| :`, unchecked `run`, `local v=$(...)`, empty loops, `skip`, 127-as-failure, teardown); only `[[ ]]`, `(( ))` and a function with its own `set -e` go red. On bash 3.2 only the last does (FX/results/form-matrix-plant.txt).
- Write `run ! cmd` or `run -N cmd`, never a bare `! cmd`: bash does not trip errexit on `!`, and ShellCheck 0.11.0 reports it as SC2314 (error) when mid-test. One live fleet case: `www-setup@a251c3631047:tests/install/env-knobs.bats:60`.
- `[[ ]]` and `(( ))` mid-test do not abort on bash 3.2 and 4.0, only from 4.1 (measured on bats 1.14.0): end them with `|| false` or use `[ ]` ([gotchas](https://bats-core.readthedocs.io/en/stable/gotchas.html)).
- bats 1.14.0 `run` honours a function's own `set -e` (before: ignored on bash >= 4.0, honoured on 3.2), but commands inside `run` get errexit only with the new `--errexit` flag; the changelog headline is narrower than the map's one-liner ([CHANGELOG](https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md)).
- An empty suite exits 0 with `1..0` on bats <= 1.13.0 and exits 1 on 1.14.0; `--allow-empty-suite` is unknown before 1.14.0 and the `BATS_ALLOW_EMPTY_SUITE` variable is in unreleased master only (0c92eb4), not in 1.14.0.
- Gate every green bats run with a census: static `@test` count equals the TAP plan, no `# skip`, no `not ok`; it catches a missing `-r`, lost files and silent skips that bats itself reports as exit 0 (FX/ci/bats-census.sh).
- A skip is a pass that proved nothing: 28 `skip "<shell> not installed"` call sites in the fleet's fish/nu/elvish suites turn into green if the interpreter is absent (SH-EMIT-32 applies); fail CI on any `# skip` instead.
- The CI matrix recipe is bats 1.14.0 on the `bash:3.2` and `bash:5.3` images plus a macOS leg; the images are Alpine/musl with busybox userland, so they give bash-version fidelity only, never BSD userland fidelity.
- Drive POSIX scripts with bats by naming the interpreter in a variable (`run -0 "${sut[@]}" script`); a `[[ ]]` bashism passes on busybox ash 1.35, mksh, ksh93u+m, yash 2.52 and bash and fails only on dash 0.5.12 and posh 0.14.1, so those two stay in the list (SH-DIAL-04).
- Pin Pester exactly: `Install-Module Pester -RequiredVersion 6.2.0 -SkipPublisherCheck`; the fleet's `-MinimumVersion 5.0` already resolves to 6.2.0 today (`Find-Module` output in F8) while its rule file says "Use Pester v5".
- Set `Run.Exit = $true`: the default is `False` and a failing suite then exits 0 on pwsh 7.4, 7.6 and Windows PowerShell 5.1 (measured).
- Classic `Should -Be` runs unchanged on Pester 6.2.0 on all three hosts; `Should-Be` exists only on 6.x and fails loudly (CommandNotFound) on 5.7.1, so mixing is red, not vacuous; `Should.DisableV5 = $true` turns classic assertions red.
- Pester stays vacuous in three ways on both majors: a file with no `Describe`, a file whose every `It` is `-Skip`, and (5.x only) `-ForEach @()`; Pester 6 makes the last one a discovery error (`Run.FailOnNullOrEmptyForEach`, default `True`). Gate with the census in FX/pester-gate.ps1.
- Code outside `BeforeAll`/`BeforeDiscovery` runs at discovery, including for filtered-out files and `Run.SkipRun`; file-level variables and functions are invisible inside `It` (FX/results/rerun-pester-6.2.0.txt, case c21); an AST check (FX/Test-DiscoveryCode.ps1) lists the offenders.
- pwsh 7.4 leaves support on 2026-11-10 and Pester 6 supports "Windows PowerShell 5.1 and PowerShell 7.4+" ([lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle), [6.0.0 notes](https://github.com/pester/Pester/releases/tag/6.0.0)): plan the Pester matrix as 5.1 plus 7.6.

## Findings

### F1 Which framework for which dialect (M-G-01)

Decision: three tools, split by what is under test.

| Under test | Tool | Why | Measured |
|---|---|---|---|
| A script run as a subprocess (installers, CLIs, hooks), any target interpreter | bats-core 1.14.0, which itself needs bash >= 3.2 | The test runner is bash; the script under test is whatever `run "$SUT_SH" script` launches | FX/sut-matrix.sh: dash, busybox ash, mksh, ksh93u+m, yash, posh, bash all driven from one bats run |
| Functions in a POSIX library, sourced and called in-process | ShellSpec (vendor a commit, see below) | It runs inside the interpreter under test, so one spec runs under dash, busybox ash, mksh, ksh, yash, posh and bash | FX/shellspec-demo/posix-matrix.sh: plant exit 101 on all 7, twin exit 0 on all 7 |
| Emitted shell text (SH-EMIT) | plain matrix scripts, see `matrix.sh` | There is no framework gain; the contract is bytes and final state (SH-EMIT-04, SH-EXP-23) | not re-run here |
| PowerShell | Pester (F8) | The only PowerShell test framework in the corpus (`*.Tests.ps1`: 412 in PowerShell/PowerShell, 101 in pester/Pester) | F8-F10 |

- bats-core is current: 1.14.0 was released 2026-07-21, the repository was pushed to on 2026-10-09 ([CHANGELOG](https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md), FX/src/repo-bats-core_bats-core.json). Its own support matrix lists bash 3.2.57 (macOS's), 4.0-4.4 and 5.0-5.2 ([support matrix](https://bats-core.readthedocs.io/en/stable/support-matrix.html)); the 5.3 image also passes the whole suite here (FX/results/form-matrix-twin.txt, bash 5.3.20), and the 1.14.0 changelog moves its devcontainer default to bash 5.3.
- ShellSpec is mature but quiet: the newest GitHub release is 0.28.1 from 2021-01-11, the clone in the corpus ends at `f2d13f991885` (2024-09-12) and the repository was last pushed on 2025-11-24 ([shellspec repo](https://github.com/shellspec/shellspec), FX/src/rel-shellspec_shellspec.json). The topic map's "last release 2024-09" is the last commit, not a release. Pin a commit SHA, not "latest". Its README lists support for dash >= 0.5.4, busybox ash >= 1.20, ksh93 >= 93s, mksh >= R28, posh >= 0.3.14, yash >= 2.29, zsh >= 3.1.9 and bash >= 2.03 ([README](https://github.com/shellspec/shellspec#readme)). Like bats it exits 0 on an empty suite unless told otherwise: `--fail-no-examples` makes it 101 (F4).
- shunit2 is not chosen: v2.1.8 dates from 2020-03-29 ([shunit2](https://github.com/kward/shunit2), FX/src/rel-kward_shunit2.json); it adds no capability over ShellSpec for the POSIX case and has no corpus presence in the fleet or the 41 exemplars.
- The fleet uses only bats and Pester: 10 `.bats` files (1,987 lines by `wc -l` today; the audit counted 1,997), 140 `@test` blocks, and 6 `.Tests.ps1` files; there is no ShellSpec or shunit2 anywhere (F11).
- bats can only drive other shells; it cannot run inside them. `FX/sut-matrix.sh` shows the pattern on `shellzoo:deb12` with bats 1.14.0 under bash 5.2: the test reads `SUT_SH` into an array (`read -r -a sut_cmd <<< "$SUT_SH"`) because `busybox ash` is two words; a quoted `"$SUT_SH"` fails with exit 127 for it.

### F2 Thirteen ways a bats suite stays green on a failing assertion (M-G-02)

Each form below wraps a deliberately failing assertion; "green" means the suite exits 0 and the failure is invisible. The twin is the honest rewrite; all 13 twins exit 1 on every bats/bash pair. Plant files: `FX/plant/forms/V01..V13.bats`; twins: `FX/twin/forms/`; the single-file `FX/plant/vacuous.bats` holds V01-V11 together.

| Form | Plant | Honest twin | 1.11.1 / 1.13.0 / 1.14.0 on bash 3.2 | same on bash 5.3 |
|---|---|---|---|---|
| V01 bare `! true` mid-test | `! true` | `run ! true` | green / green / green | green / green / green |
| V02 `[[ a == b ]]` mid-test | `[[ a == b ]]` | `[[ a == b ]] \|\| false` | green x3 | red x3 |
| V03 `(( 1 == 2 ))` mid-test | `(( 1 == 2 ))` | `(( 1 == 2 )) \|\| false` | green x3 | red x3 |
| V04 left side of `&&` | `[ a = b ] && echo x` | `[ a = b ]` | green x3 | green x3 |
| V05 `run` without status | `run false` | `run -0 false` | green x3 | green x3 |
| V06 `\|\| true` | `grep -q needle /dev/null \|\| true` | drop the suffix | green x3 | green x3 |
| V07 `local v=$(false)` | `local v=$(false)` | `local v; v=$(false)` | green x3 | green x3 |
| V08 empty loop asserts nothing | `for x in $(printf ''); do [ "$x" = never ]; done` | count iterations, `[ "$n" -gt 0 ]` | green x3 | green x3 |
| V09 `skip` replaces the failure | `command -v nosuch \|\| skip "..."; false` | `command -v nosuch` | green x3 | green x3 |
| V10 `run` of a function with its own `set -e` | `run check_thing; [ $status -eq 0 ]` | `run bash -c 'set -e; false; true'` | red x3 | green / green / red |
| V11 `run nosuch --bogus; [ $status -ne 0 ]` | satisfied by 127 | `run -2 nosuch --bogus` | green x3 | green x3 |
| V12 failing assertion mid-`teardown` | `[ -f /nonexistent ]` then `echo` | `... \|\| return 1` | green x3 | green x3 |
| V13 `\|\| :` | `grep -q needle /dev/null \|\| :` | drop the suffix | green (1.14.0 only measured) | green (1.14.0 only measured) |

Source: FX/results/form-matrix-plant.txt and form-matrix-twin.txt (re-run 2026-10-11, 36 runs each, plus V13 on 1.14.0). Git Bash 5.2.15 on the Windows host with bats 1.14.0 gives the same shape as Linux 5.3: `plant: V01=0 V02=1 V03=1 V04=0 V05=0 V06=0 V07=0 V08=0 V09=0 V10=1 V11=0`, `twin: all 1` (FX/winbats.sh).

- Why V01: bash does not trip errexit or the ERR trap for a `!`-negated command ([bash manual, `set -e`](https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin): "or if the command's return status is being inverted with !"); only the last statement's status propagates. The [gotchas page](https://bats-core.readthedocs.io/en/stable/gotchas.html) says "Use `run !` on Bats 1.5.0 and above" and, for older bats, `! x || false`. ShellCheck documents the same in [SC2314](https://github.com/koalaman/shellcheck/wiki/SC2314).
- Why V02/V03: bash 4.1 started applying `set -e` and the ERR trap to `[[` and `((`; the bash CHANGES file lists it under bash-4.1-alpha as "The [[ and (( commands are now subject to the setting of `set -e` and the ERR trap" ([CHANGES, bash source](https://git.savannah.gnu.org/cgit/bash.git/plain/CHANGES); the host was unreachable at write time, the fetched copy is FX/src/bash-changes.txt line 5496). Measured threshold on bats 1.14.0: bash 3.2 and 4.0 stay green, 4.1, 4.2, 4.4, 5.0, 5.3 go red (FX/dbl-bracket-threshold.sh). bash 3.2.57 is macOS `/bin/bash`, so a macOS-bound suite runs on the weaker semantics.
- Why V04: a failing left side of `&&` is "part of a `&&` list", exempt from errexit (same manual paragraph); the following `echo` then masks the status.
- Why V07: `local v=$(cmd)` reports the status of `local`, not of `cmd` (SH-ERR family); ShellCheck 0.11.0 reports SC2155 at default severity on the plant and not on the twin (F2 detection table).
- Why V10: see F3; V10 is the only form whose result depends on the bats version AND the bash version.
- Why V12: the writing-tests guide states "failing commands within teardown won't trigger failure as ERREXIT is disabled" and that only the last command's status counts ([writing-tests](https://bats-core.readthedocs.io/en/stable/writing-tests.html)).
- Why V11: `command not found` is status 127, which satisfies `-ne 0`; pin the exact status (`run -2` for the real tool's usage error).

What detects each form mechanically (all runs under FX, ShellCheck 0.11.0 via `run.sh`, `-o all`):

| Form | ShellCheck on plant | Reviewer grep (FX/grep-checks.sh) | Bats-level |
|---|---|---|---|
| V01 | SC2314 error, exit 1 | G1 | none |
| V02 V03 | nothing relevant | G3, G4 | run on bash 3.2 and compare to 5.3 |
| V04 | nothing | none (reading heuristic) | none |
| V05 V11 | nothing | G7 (candidates) | none |
| V06 V13 | nothing | G2, G2b | none |
| V07 | SC2155 (use `-i SC2155`; default run also reports SC2034 on the twin) | none | none |
| V08 | nothing | none (reading heuristic) | none |
| V09 | nothing | G5 | census `# skip` (F4) |
| V10 | nothing | G7 (candidate) | run on 1.14.0 |
| V12 | nothing | none | none |

Eleven of thirteen forms are invisible to ShellCheck: the gate (SH-GATE-11) is necessary and not sufficient. `.bats` files parse in ShellCheck without a shebang or directive (`FX/sc/noshebang.bats` still reports SC2314, exit 1).

### F3 What bats 1.14.0 changed, and what it did not (M-G-03)

From the [1.14.0 changelog](https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md) (2026-07-21), the testing-relevant items:

- "`run` now honors `set -e` in your functions (#1118). ATTENTION: In previous versions this was suppressed unintentionally." Workaround offered: `suppress_errexit() { "$@" || return $?; }`.
- "`--errexit` flag to enable errexit (set -e) behavior for commands run in `run` (#1118)".
- "exit with error when no tests are found. Use `--allow-empty-suite` to revert to old behavior. (#1211)".
- "fail with error when receiving empty string as testfile path (#1212)".
- Added in 1.13.0: `--negative-filter`, `--abort`; "unset `output`, `stderr`, `lines`, `stderr_lines` at the start of `run`" (#1105). Added in 1.12.0: `bats::on_failure`.

Measured, FX/errexit-flag.sh and FX/v10-threshold.sh:

```text
bats 1.11.1 bash 5.3 (none)    -> status=0 output=reached-after-false     # helper() { false; echo reached-after-false; }
bats 1.13.0 bash 5.3 (none)    -> status=0 output=reached-after-false
bats 1.14.0 bash 5.3 (none)    -> status=0 output=reached-after-false     # still: no --errexit, no set -e inside helper
bats 1.14.0 bash 5.3 --errexit -> status=1 output=                        # the new flag stops at `false`
bats 1.14.0 bash 3.2 --errexit -> status=1 output=
bats 1.13.0: b3.2=1 b4.0=0 b4.2=0 b4.4=0 b5.0=0 b5.2=0 b5.3=0          # V10 exit codes; 0 = vacuous
bats 1.14.0: b3.2=1 b4.0=1 b4.2=1 b4.4=1 b5.0=1 b5.2=1 b5.3=1
```

Correction to the map's one-liner "bats 1.14.0 `run` honours `set -e`": it honours a `set -e` the called function sets itself, on every bash >= 3.2; before 1.14.0 that was ignored on bash >= 4.0 and honoured on 3.2. Commands run by `run` without their own `set -e` still keep going after a failure on 1.14.0 unless `--errexit` is passed. A suite validated on bash 5.x with bats <= 1.13 can turn red on 1.14.0 where a function has `set -e` and a failing step: that is the changelog's "might uncover hidden errors".

- bats runs each test body under `set -e`; the manual says `run -0 command` "is equivalent to `command` (because bats sets `set -e` for all tests)" ([writing-tests](https://bats-core.readthedocs.io/en/stable/writing-tests.html)).
- `bats_require_minimum_version` has existed since 1.7.0 and "Code for newer versions of Bats can be incompatible with older versions ... In the worst case, the tests will pass erroneously" (same page). `run -N` / `run !` arrived in 1.5.0 (gotchas page wording). Not measured on bats < 1.11.1: no older checkout was built.

### F4 Empty suite, missing -r, skipped tests: the census

Measured on three bats versions, bash 5.3 image, FX/suite-matrix.sh:

```text
empty-dir                          bats 1.11.1 -> exit 0 | 1..0
empty-dir                          bats 1.13.0 -> exit 0 | 1..0
empty-dir                          bats 1.14.0 -> exit 1 | ERROR: Found no tests. (Try `--allow-empty-suite`?)1..0
zero.bats (no @test)               bats 1.14.0 -> exit 1 | ERROR: Found no tests. ...
empty-dir --allow-empty-suite      bats 1.11.1 -> exit 1 | Error: Bad command line option '--allow-empty-suite'
empty-dir --allow-empty-suite      bats 1.14.0 -> exit 0 | 1..0
ok-suite no -r                     bats 1.14.0 -> exit 0 | 1..1 ok 1 a        # sub/b.bats never ran
ok-suite -r                        bats 1.14.0 -> exit 0 | 1..2 ok 1 a ok 2 b
skip-suite                         bats 1.14.0 -> exit 0 | 1..1 ok 1 s # skip tool absent
bats-1.14.0  BATS_ALLOW_EMPTY_SUITE=1 -> exit 1 | ERROR: Found no tests. ...
bats-master  BATS_ALLOW_EMPTY_SUITE=1 -> exit 0 | 1..0                        # master 0c92eb4, unreleased
```

- 1.14.0 fixes only the zero-tests case. A directory of `.bats` files run without `-r` silently drops everything below the top level and still exits 0; a skipped test is `ok ... # skip` and exit 0 on every version. The `[Unreleased]` changelog adds `$BATS_ALLOW_EMPTY_SUITE` "which keeps test setups compatible with Bats versions before 1.14 that don't know the flag"; it is not in 1.14.0.
- The census, `FX/ci/bats-census.sh` (POSIX sh, no `-e`, output is the violation, exit 1 when any): static `@test` count under the test directory equals the TAP plan; no `ok N ... # skip`; no `not ok`. Run on bats 1.13.0 and 1.14.0 (FX/census-matrix.sh):

```text
PLANT ok-suite without -r          bats 1.14.0 bats-exit=0 census-exit=1 census: 2 @test on disk but TAP plan is 1
PLANT skip-suite                   bats 1.14.0 bats-exit=0 census-exit=1 ok 1 s # skip tool absent
PLANT empty-dir                    bats 1.14.0 bats-exit=0 census-exit=1 census: 0 @test on disk but TAP plan is 0
TWIN  ok-suite with -r             bats 1.14.0 bats-exit=0 census-exit=0
```

- Dynamic registration (`bats_test_function`, generated tests) makes the static count differ from the plan; such a suite adds the expected count to the census instead of dropping the check. Not measured here.
- bats-core's own CI runs the framework against a planted failing file and requires red: `bash -c "! bin/bats test/fixtures/bats/failing.bats"` ([bats-core@0c92eb4c418d:.github/workflows/tests.yml:125](https://github.com/bats-core/bats-core/blob/master/.github/workflows/tests.yml)). The same canary on three versions (FX/canary/failing.bats): suite exit 1 on 1.11.1, 1.13.0 and 1.14.0.
- ShellSpec: `shellspec --shell dash empty-spec` exits 0 with "0 examples, 0 failures"; with `--fail-no-examples` it exits 101 with "no examples found". A failing example exits 101, not 1 (FX/shellspec-demo/run.sh).

### F5 Version pins and what the distros ship

| Item | Version | Date / source |
|---|---|---|
| bats-core (pin) | v1.14.0 | 2026-07-21, [CHANGELOG](https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md) |
| Debian 13 `bats` | 1.11.1-1 | [packages.debian.org](https://packages.debian.org/trixie/bats), fetched 2026-10-11 |
| Ubuntu 26.04 `bats` | 1.13.0-1 | [packages.ubuntu.com](https://packages.ubuntu.com/resolute/bats), fetched 2026-10-11 |
| bats-assert / bats-support / bats-file | v2.2.4 (2025-10-14) / v0.3.0 (2022-03-04) / v0.4.0 (2023-08-23) | FX/src/rel-bats-core_*.json |
| www-setup vendored | bats-core v1.13.0, assert v2.2.4, support v0.3.0 | `www-setup@a251c3631047` submodule status |
| setup-grimoire vendored | bats-core v1.14.0 (`eb7f42f8d608`) | `setup-grimoire@1259e35b2550` submodule status |
| rbenv CI | `git clone --depth 1 --branch v1.10.0` | `rbenv@07e9b1e297a5:.github/workflows/ci.yml:15` |
| ShellSpec | 0.28.1 release, commit pin | [repo](https://github.com/shellspec/shellspec) |

- `apt install bats` on a current Debian or Ubuntu runner gives 1.11.1 or 1.13.0: no empty-suite error, no `run` errexit fix. Pin with `bats --version` (FX/pin-and-canary.sh): `[ "$(bats --version)" = "Bats 1.14.0" ]` is exit 1 on 1.11.1 and 1.13.0 and exit 0 on 1.14.0.
- The fleet already runs two bats versions side by side (1.13.0 in www-setup, 1.14.0 in setup-grimoire): the same `install.sh`-style test passes on one and may fail on the other (F3).
- The bats-assert assertions go red as documented (FX/assertlib/assert-red.bats, `load ../tools/bats-support/load`, `bats-assert/load`): `assert_output` mismatch, `refute_output` match, `assert_failure` on success, `assert_success` on failure and `assert_line` mismatch each give `not ok`, exit 1 on 1.14.0 with bash 5.3 and with bash 3.2.

### F6 The interpreter matrix recipe (M-G-04)

Recipe, as verified by commands (sketch: FX/ci/bats-matrix.yml, parses as YAML; every command in it was run locally through FX/run-bats.sh):

```yaml
jobs:
  bats-container:
    name: bats ${{ matrix.bats }} on bash ${{ matrix.bash }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        bash: ['3.2', '5.3']
        bats: ['1.14.0']
    steps:
      - uses: actions/checkout@v4          # fleet convention: pin by SHA with a version comment
      - run: |
          docker run --rm -v "$PWD:/w" -w /w "bash:${{ matrix.bash }}" \
            bash tools/bats-${{ matrix.bats }}/bin/bats --tap -r tests > tap.txt || rc=$?
          cat tap.txt
          exit "${rc:-0}"
      - run: sh ci/bats-census.sh tests tap.txt
  bats-macos:
    runs-on: macos-15                      # BSD userland + /bin/bash 3.2.57; unverified: read only
    steps:
      - uses: actions/checkout@v4
      - run: /bin/bash tools/bats-1.14.0/bin/bats --tap -r tests > tap.txt || true
      - run: sh ci/bats-census.sh tests tap.txt
```

- What the `bash:<ver>` images are: `docker run --rm bash:3.2 sh -c 'cat /etc/os-release'` prints `ID=alpine`; `bash --version` prints `3.2.57(1)-release (x86_64-pc-linux-musl)`; `sed --version` prints "This is not GNU sed version 4.0" (busybox). The image reproduces the bash version and nothing of macOS userland. Debian/glibc images with old bash are not offered. bats-core itself tests `['3.2', '4.0', '4.1', '4.2', '4.3', '4.4', '4', '5.0', '5.1', '5', 'rc']` the same way ([bats-core@0c92eb4c418d:.github/workflows/tests.yml:199-217](https://github.com/bats-core/bats-core/blob/master/.github/workflows/tests.yml)).
- pyenv adds a userland axis to the same idea: `TEST_BASH_VERSIONS = 3.2.57 4.1.17`, each run on plain `bash:$BASH` (busybox) and on a `-gnu-` variant that adds `apk add sed coreutils findutils`, with `TEST_BATS_VERSION = v1.10.0` checked out into the image (`pyenv@d28b750767d4:Makefile:1-2,28-30`, `test/Dockerfile:1-14`). A script that is correct only with GNU `sed`/`find`/`xargs` is then visible as a red cell on the busybox column.
- Add intermediate bash versions only where a rule has a threshold: `4.1` for `[[`/`((` errexit (F2), `4.4` for `inherit_errexit`, `5.2` for `patsub_replacement` (SH-DIAL). Otherwise the two ends (3.2, latest) bound the matrix.
- The macOS runner is the only place to see BSD `sed`, `stat`, `date`, `find`, `xargs` and `mktemp` behave; unverified: read only. GitHub's macOS images print bash 3.2.57 for `/bin/bash` ([plat] audit); the fleet states the same in `setup-grimoire@1259e35b2550:.github/workflows/test.yml:92-93` ("macOS is not redundant: it is the only leg running bash 3.2 and BSD find").
- POSIX interpreters: bats stays on bash and the script under test is launched per interpreter (F1). The list follows SH-DIAL-04 (dash, busybox ash, bash `--posix`, add posh). Measured why posh and dash cannot be dropped (FX/sut-matrix.sh, bats 1.14.0 under bash 5.2 on `shellzoo:deb12`, script `sut/plant.sh` with `[[ ... ]]` under `#!/bin/sh`):

```text
plant: dash -> exit 1 | busybox ash -> exit 0 | mksh -> exit 0 | ksh -> exit 0 | yash -> exit 0 | posh -> exit 1 | bash -> exit 0
twin : dash -> exit 0 | busybox ash -> exit 0 | mksh -> exit 0 | ksh -> exit 0 | yash -> exit 0 | posh -> exit 0 | bash -> exit 0
```

  A matrix of busybox plus bash would miss this bashism entirely; dash 0.5.12 and posh 0.14.1 catch it.
- A runner with an interpreter missing must fail, not skip (SH-EMIT-32): the fleet's per-shell suites do `command -v fish >/dev/null 2>&1 || skip "fish not installed"` (`www-setup@a251c3631047:tests/install/fish/install-fish.bats:28`, the same for nu and elvish: 28 sites). CI avoids the problem by composing the toolchain (`ocx run -g all nushell fish elvish -- external/bats-core/bin/bats -r tests/install/`, `www-setup@a251c3631047:.github/workflows/test-installers.yml:45`); nothing fails a developer run without the tools, and the census does not run in CI.
- The macOS leg in `www-setup` lists suites explicitly (`env-knobs.bats exit-codes.bats print-path.bats nu fish elvish`, `test-installers.yml:71-77`) instead of `-r`, deliberately dropping `dist.bats`. A new `.bats` file is then run on Linux and not on macOS, and nothing says so: the census turns the list into a checked contract.
- Windows: Git Bash (bash 5.2.15) runs bats 1.14.0 with the Linux 5.3 result (FX/winbats.sh above). The fleet runs no bats on Windows; it uses Pester for `install.ps1` (`www-setup@a251c3631047:.github/workflows/test-installers.yml:80-83`: "A full Bats run on Windows would need bash").

### F7 Installer test hatches and the fixture server (M-G-05)

The convention the fleet converged on, three parts:

1. A dunder-prefixed environment variable replaces the network download: `__OCX_TESTING_INSTALL_BINARY` makes `install.sh`/`install.ps1` copy a local file instead of fetching the release (`www-setup@a251c3631047:src/install.sh:593-599` "internal, UNDOCUMENTED", read at `:769-770`; `src/install.ps1:662-667`, read at `:802-803`; the same variable in `install.fish:512-518`, `install.nu:426-429`, `install.elv:443-446`). Tests cover the hatch's own failure (`exit-codes.bats:125-126`: pointing it at a missing file gives exit 2) and unset it in `setup()` (`exit-codes.bats:35`, `print-path.bats:39`) so a developer's environment cannot leak in. setup-grimoire's equivalents are `GRIM_RELEASE_BASE_URL`, `GRIM_SETUP_VERSION` and `GRIM_RELEASE_AUTH_HEADER` (`setup-grimoire@1259e35b2550:tests/install/exit-codes.bats:34-36`).
2. An offline HTTPS fixture server: `server_start` (`helpers/server.bash:28`) serves a runtime-built release tree (`server_build_fixture`) from python3 `ssl` with a vendored self-signed `127.0.0.1` certificate, and tests trust only that cert through `CURL_CA_BUNDLE`; `/flaky/<n>/<path>` answers 500 for the first n hits so retry behaviour is observable, and `server_request_count` asserts "the installer really did try 3 times" (`:44-49`, `:115-121`). TLS is kept on because the installers enforce `--proto =https`.
3. A stub binary that records argv (`server_stub_body`, `:162-176`): `OCX_STUB_ARGV` holds one line per call, so the hand-off `self setup 0.0.0 --no-modify-path` is asserted exactly (`env-knobs.bats:58`).

- The two `server.bash` copies have drifted: 411 lines in www-setup, 207 in setup-grimoire (same helper name, different feature sets); the two `.pem` files are the same size in both repos (1,476 and 3,935 bytes). A shared copy would need a vendored submodule; not decided here.
- Pester mirrors the same pattern in `Fixture.psm1` (`New-OcxFixture`, `Start-FixtureServer`; `www-setup/.claude/rules/testing-pwsh.md`), and 15 `-Skip:($env:OS -eq 'Windows_NT')` sites (`Knobs.Tests.ps1` 12, `ExitCodes.Tests.ps1` 3) mean the Windows leg reports those as skipped, which a plain `Run.Exit = $true` counts as success (F9).
- The hatch must stay invisible to production: it is read only inside the function that installs a local file. Reading heuristic only; no automated check was written.

### F8 Pester 5 vs 6: the pin for PS-GATE (M-T-04)

Release facts (all fetched 2026-10-11 from the release notes; dates from the GitHub releases API, FX/src/pester-releases.json):

| Release | Date | Fact |
|---|---|---|
| 6.0.0 | 2026-07-07 | New `Should-*` assertions merged from Assert; classic `Should -Be` still works; "Pester 6 runs on Windows PowerShell 5.1 and PowerShell 7.4+"; per-file discovery and run ([6.0.0 notes](https://github.com/pester/Pester/releases/tag/6.0.0)) |
| 5.9.0 | 2026-07-07 | Pester 5 enters maintenance mode: critical bug fixes and security only; tested on 5.1 and 7.4+ ([5.9.0 notes](https://github.com/pester/Pester/releases/tag/5.9.0)) |
| 5.9.1 | 2026-08-11 | maintenance fix |
| 6.1.0 | 2026-08-11 | `New-ShouldAssertion`, shuffle, global mocks (experimental) |
| 6.2.0 | 2026-09-09 | `Pester.BeforeContainer.ps1` cascade; multiple `BeforeAll` allowed again; `Should-BeFasterThan`/`-BeSlowerThan` stop passing on unmeasurable input ([6.2.0 notes](https://github.com/pester/Pester/releases/tag/6.2.0)) |

The 6.0.0 breaking list (verbatim headings): PowerShell 3, 4, 6 and unsupported 7 dropped; discovery and run per file; test discovery looks inside hidden folders (`Get-ChildItem -Force`); `Assert-MockCalled` and `Assert-VerifiableMock` removed; the `Pending` status and `Set-ItResult -Pending` removed; the `-Focus` switch removed; `None` is a reserved tag-filter value; profiler-based coverage is the default; `CoverageGutters` output removed; `-ForEach $null`/`@()` throws by default (`Run.FailOnNullOrEmptyForEach`); duplicate setup/teardown blocks throw (reversed in 6.2.0); only `<...>` templates are expanded in test names; Legacy parameter set removed; mock fall-through to the real command removed.

Measured, 5.7.1 against 6.2.0, identical on pwsh 7.4.7, pwsh 7.6.6 and Windows PowerShell 5.1.26100.9444 (FX/pester-matrix.ps1; FX/results/rerun-pester-5.7.1.txt and rerun-pester-6.2.0.txt; 20 cases x 3 hosts x 2 versions, zero host-specific differences in totals):

| Case | Pester 5.7.1 | Pester 6.2.0 |
|---|---|---|
| `Should -Be 2` on 1 | Failed: `Expected 2, but got 1.` | Failed: same |
| `Should-Be 2` on 1 | Failed: `The term 'Should-Be' is not recognized` | Failed: `Expected [int] 2, but got [int] 1.` |
| `Should-Be 1` on 1 | Failed (CommandNotFound) | Passed |
| `Should -Be` with `Should.DisableV5 = $true` | property does not exist (TWEAK-ERROR) | Failed: `Pester Should -Be syntax is disabled. Use Should-Be (without space), or enable it by setting ...` |
| `It -ForEach @()` | total=0, Passed, process exit 0 | container Failed: `Value can not be null or empty array. If this is expected, use -AllowNullOrEmpt...`, exit 1 |
| `-Focus` | container Failed: parameter not found | same |
| `Set-ItResult -Pending` | skipped=1, Passed | Failed: `Parameter set cannot be resolved` |
| `Assert-MockCalled` | works | pwsh 7.4: `not recognized`; pwsh 7.6.6: `found in the module 'Pester', but the module could not be loaded`; 5.1: `The Assert-MockCalled command may only be used inside a Describe block` (the inbox Pester 3.4.0 answers) |
| file with only `-Skip` tests | total=1 skipped=1, Passed, exit 0 | same |
| file with no `Describe` / no `It` | total=0, Passed, exit 0 | same |
| `Run.Path` that does not exist | exit 255 | exit 255 |
| `It 'name $(New-Item ...)'` | sentinel file not created | not created (the 6.0.0 injection note did not reproduce for this form) |

- `Run.Exit` defaults to `False`: `FX/exit-default.ps1 6.2.0 false` on a failing file prints `reached end of script (Run.Exit=False)` and exits 0 on pwsh 7.4, 7.6.6 and 5.1; with `true` the process exits 1 on all three. Configuration defaults on 6.2.0: `Run.FailOnNullOrEmptyForEach = True`, `Run.Exit = False`, `Should.DisableV5 = False` (FX/cfg-props.ps1).
- Resolution of the fleet's install line against PSGallery (FX/find-pester.ps1, pwsh 7.6.6, 2026-10-11):

```text
Find-Module Pester -MinimumVersion 5.0              -> 6.2.0
Find-Module Pester -MinimumVersion 5.0 -Max 5.99.99 -> 5.9.1
Find-Module Pester -RequiredVersion 5.7.1           -> 5.7.1
AllVersions >=5.9: 6.2.0, 6.1.0, 6.0.1, 6.0.0, 5.9.1, 5.9.0
```

  `www-setup@a251c3631047:.github/workflows/test-installers.yml:150` (`Install-Module -Name Pester -MinimumVersion 5.0 ...`, step title "Install Pester (v5)") therefore installs 6.2.0 today. The fleet's suites contain none of the 6.0.0-removed constructs (static scan of `tests/install/ps1/*.Tests.ps1` in both repos for `Assert-MockCalled`, `-Pending`, `-Focus`, `-ForEach`, `-TestCases`: no hits), so the silent jump is probably harmless; the CI result is, however, not the "Pester v5" the rule file `www-setup/.claude/rules/testing-pwsh.md` says. The local toolchain has 5.7.1 (`probe-pester.ps1` on pwsh 7.6.6: `5.7.1 /home/mherwig/.local/share/powershell/Modules/Pester/5.7.1`), so a laptop and CI already differ.
- The 5.1 host ships Pester 3.4.0 in `C:\Program Files\WindowsPowerShell\Modules\Pester\3.4.0` (probe on the real host). Any removed or missing 5/6 command can silently load 3.4.0 and answer in Pester 3 terms (the `Assert-MockCalled` row above). Import the pinned module explicitly by version; install with `-SkipPublisherCheck` (the fleet already does) because the inbox copy has a different publisher.

Decision for PS-GATE: pin Pester **6.2.0** (`-RequiredVersion`), keep `Should -Be` as the allowed classic syntax, adopt `Should-*` per file and flip `Should.DisableV5` only for a suite with no classic assertion left. Reasons: Pester 5.x is maintenance-only since 2026-07-07, Pester 6 supports exactly the fleet's two targets (5.1 and 7.4+, PS-COMPAT-01), the classic syntax works unchanged on 6.2.0 on all three hosts, and the migration risk is statically checkable (F9 rule SH-TEST-23). A repo that must stay on 5.x pins `5.9.1`, not 5.7.1.

### F9 Pester vacuous passes and the census gate

Process exit with `Run.Exit = $true`, per case (FX/exit-matrix.sh, three hosts in the order pwsh 7.4, 7.6.6, 5.1):

```text
c01_v5_should_red        pester 5.9.1  exit 1 exit 1 exit 1      # red on a failing Should
c04_foreach_empty_array  pester 5.9.1  exit 0 exit 0 exit 0      # vacuous
c04_foreach_empty_array  pester 6.2.0  exit 1 exit 1 exit 1      # discovery error
c08_skip_only            pester 6.2.0  exit 0 exit 0 exit 0      # vacuous on both majors
c10_empty_file           pester 6.2.0  exit 0 exit 0 exit 0      # vacuous on both majors
nopath                   pester 6.2.0  exit 255 exit 255 exit 255
```

Two runs in the 5.1 column of an earlier pass read `exit 1` for a vacuous case (c10, then c08); the repeat showed it was `<3>WSL ... UtilAcceptVsock:281: accept4 failed 110`, the WSL-to-Windows interop failing, not Pester (re-run clean). Do not run two Windows-host `matrix.sh` calls at once.

The census gate, FX/pester-gate.ps1 (reads the `-PassThru` result; red when `FailedCount`, failed containers or blocks, `TotalCount = 0`, `PassedCount = 0`, `SkippedCount > 0`, `NotRunCount > 0` or `InconclusiveCount > 0`), run on the vacuous files and a good file (FX/gate-matrix.sh, FX/results/pester-gate.txt):

```text
foreach-empty.Tests.ps1 pester 5.9.1  GATE RED: zero tests discovered                          -> exit 1  (all 3 hosts)
foreach-empty.Tests.ps1 pester 6.2.0  GATE RED: failed container/block; zero tests discovered  -> exit 1  (all 3 hosts)
empty.Tests.ps1         pester 6.2.0  GATE RED: zero tests discovered                          -> exit 1
skip-only.Tests.ps1     pester 6.2.0  GATE RED: zero tests passed; skipped=1                   -> exit 1
pass.Tests.ps1          pester 6.2.0  GATE GREEN                                               -> exit 0  (all 3 hosts)
```

- A flat `SkippedCount > 0` rule fails the fleet's Windows leg (15 intentional `-Skip:($env:OS -eq 'Windows_NT')` sites). Give the gate a skip budget per OS (a parameter such as `-MaxSkipped`) instead of dropping the rule; an unbudgeted skip is the vacuous form.
- A `-Skip` on every test of a file is the Pester twin of bats `skip`; both need the census.

### F10 Pester's discovery/run split (M-T-05)

The [discovery guide](https://pester.dev/docs/usage/discovery-and-run) says code outside `BeforeAll` "runs during Discovery, and its results won't be available during Run. This will lead to confusing results"; code that generates tests belongs in `BeforeDiscovery`. The [quick start](https://pester.dev/docs/quick-start) puts even the function under test in a file-level `BeforeAll`. Measured, identical on Pester 5.7.1 and 6.2.0, three hosts (cases c11-c17, c21):

```text
c11_discovery_log   log=FILE-LEVEL,BEFORE-DISCOVERY,DESCRIBE-BODY,BEFORE-ALL,IT fileVar=[],IT
c21_visibility      fileVar=[] bodyVar=[] allVar=[beforeall-var] Get-FileHelper=False Get-BodyHelper=False Get-AllHelper=True
c12_sidefx_at_discovery  sentinel=YES        # New-Item at file level ran
c15_skiprun_sidefx       sentinel=YES        # even with Run.SkipRun
c16_filter_nomatch_sidefx sentinel=YES       # even when Filter.FullName matches nothing
c17_filter_nomatch_beforeall sentinel=no     # BeforeAll respects the filter
```

- File-level and `Describe`-body variables and functions are not visible inside `It`; only what `BeforeAll` defines is. File-level side effects run once at discovery for every file, whether or not its tests run.
- Pester 6 interleaves discovery and run per file ([6.0.0 notes](https://github.com/pester/Pester/releases/tag/6.0.0): "discovery-time side effects no longer carry across files"; the [guide](https://pester.dev/docs/usage/discovery-and-run) shows `A: discovery / A: run / B: discovery / B: run`). Did not reproduce serially: `FX/pester-files/crossfile/a.Tests.ps1` imports a module with `-Global` at discovery and `b.Tests.ps1` builds `-ForEach` data from it; both 5.9.1 and 6.2.0 discover `b case <_>` twice (FX/crossfile.ps1), because a global import survives in the same session. The documented break is real under the experimental parallel runner (separate runspaces); rely on "each file is self-contained".
- The mechanical check is an AST scan, FX/Test-DiscoveryCode.ps1 (PowerShell 5.1-safe syntax): list statements at file level or directly in `Describe`/`Context` that are not `Describe`, `Context`, `BeforeAll`, `AfterAll`, `BeforeDiscovery`; output is the violation, exit 1 when any (plant: 4 findings, exit 1 on pwsh 7.4, 7.6.6 and 5.1; twin: exit 0). Runtime proof on both majors: `discovery.plant.Tests.ps1` Failed (GATE RED: failed=1), the twin Passed.
- 6.2.0 reverses one 6.0.0 rule: "A block can have as many BeforeAll, AfterAll, BeforeEach and AfterEach as you want" (6.0.0 said duplicates throw). It also adds that top-level code in `Pester.BeforeContainer.ps1` "runs during discovery only" and must be wrapped in `BeforeAll` ([6.2.0 notes](https://github.com/pester/Pester/releases/tag/6.2.0)).

### F11 What the fleet does today

Counts re-measured 2026-10-11 (read-only; paths as `<repo>@<sha12>:<path>:<line>`).

- 10 `.bats` files (1,987 lines, 140 `@test`): `www-setup` 7 files (`dist` 9, `env-knobs` 32, `exit-codes` 8, `print-path` 7, fish 23, nu 23, elvish 22 tests) and `setup-grimoire` 3 files (6, 6, 4). 6 `.Tests.ps1` files (3 per repo) plus a `Fixture.psm1` per repo.
- Vacuous forms found, with the proposed greps run against the fleet (FX/grep-checks.sh forms; output is the violation):
  - G1 bare `!`: 7 hits in `www-setup`, 0 in `setup-grimoire`. One is real: `www-setup@a251c3631047:tests/install/env-knobs.bats:60` (`! grep -q -- "--remote package install" "$OCX_STUB_ARGV"` followed by another statement; the obsolete bootstrap command could reappear and the test would pass). ShellCheck 0.11.0 reports it as SC2314 error and the other four last-statement uses (`env-knobs.bats:61,311`, `exit-codes.bats:115`, `print-path.bats:64`) as notes; `print-path.bats:70` and `env-knobs.bats:90` already use `|| false`. The audit's gate runs `**/*.sh` only, so these never run through ShellCheck (SH-GATE-09).
  - G3 `[[ ]]`: `www-setup@a251c3631047:tests/install/dist.bats:160` is mid-test and vacuous on bash 3.2/4.0. It is latent: the macOS leg deliberately skips `dist.bats` (`test-installers.yml:50-53`).
  - G5 skip: 31 call sites in `www-setup` (28 are `command -v <shell> ... || skip "<shell> not installed"` in the fish, nu and elvish suites); 0 in `setup-grimoire`.
  - G6 missing `bats_require_minimum_version`: `www-setup/tests/install/exit-codes.bats` and all three `setup-grimoire/tests/install/*.bats`.
  - G2/G2b/G4: no hits.
- Matrix: `www-setup` runs Linux and macOS-26 for bats (`test-installers.yml:34-78`) and the unpinned Pester on windows/ubuntu/macOS plus a real-5.1 smoke (`:136-185`); `setup-grimoire` runs bats on `[ubuntu-latest, macos-latest]` and Pester on `[windows-latest, ubuntu-latest]` (`setup-grimoire@1259e35b2550:.github/workflows/test.yml:87-119`). Neither runs a census, a canary, an explicit bash 3.2 container, or a POSIX-interpreter leg for the bats suites; Pester's host list is pwsh 7 plus a fixture-free 5.1 smoke because "a 5.1 host adds no real 5.1 coverage" for a suite that shells out to `pwsh` (`test-installers.yml:161-166`).
- Pester config in both repos sets `Run.Exit = $true` and `Output.Verbosity = Detailed` (`www-setup@a251c3631047:.github/workflows/test-installers.yml:153-159`, `taskfiles/test.taskfile.yml:41-46`; `setup-grimoire@1259e35b2550:Taskfile.yml:94-103`); every `.Tests.ps1` puts setup in top-level `BeforeAll` (`PrintPath.Tests.ps1:13`, `Knobs.Tests.ps1:20`, `ExitCodes.Tests.ps1:6`, and the three setup-grimoire files at line 5), which is the correct layout under F10. `Test-DiscoveryCode.ps1` has not been run over them.

## Normative guidance candidates

Rule IDs are provisional (family SH-TEST; Pester rules route to PS-GATE). "Verified" means watched red on a plant and green on its twin under FX; "no" means a reading heuristic. Check commands are written so that the output is the violation (empty output = pass), unless a row says "exit code".

**SH-TEST-01 (MUST).** Test bash and installer scripts with bats-core 1.14.0, vendored by tag (submodule or `git clone --branch v1.14.0`); never the distro package.
- Why: Debian 13 ships 1.11.1 and Ubuntu 26.04 ships 1.13.0; both exit 0 on an empty suite and ignore a function's `set -e` on bash >= 4.0.
- Verify: `[ "$(external/bats-core/bin/bats --version)" = "Bats 1.14.0" ]`, exit code (1 on 1.11.1 and 1.13.0, 0 on 1.14.0). Verified: FX/pin-and-canary.sh.

**SH-TEST-02 (MUST).** First statement of every `.bats` file is `bats_require_minimum_version 1.5.0` (or higher if it uses newer flags).
- Why: `run -N`, `run !` and `run --separate-stderr` need it; on an older runner the suite can pass erroneously.
- Verify: `grep -rL -e 'bats_require_minimum_version' --include='*.bats' tests/` (lists the files lacking it). Verified: FX/grep-checks.sh G6: `sc/directive.bats sc/noshebang.bats` listed, twin dir empty. Fleet: 4 of 10 files.

**SH-TEST-03 (MUST).** Never a bare `! cmd` statement in a test body; write `run ! cmd`, `run -N cmd`, or `! cmd || false`.
- Why: bash does not trip errexit on a negated command, so the test stays green (V01).
- Verify: `shellcheck -f gcc -i SC2314 FILE.bats` (exit 1 and an SC2314 line, error severity, ShellCheck 0.11.0); backup: `grep -rn -e '^[[:space:]]*![[:space:]]' --include='*.bats' tests/` lists every bare `!` (the `|| false` and last-statement uses are false positives to read). Verified: FX/plant/forms/V01.bats `-i SC2314` exit 1, FX/twin/forms/V01.bats exit 0 (FX/sc/directive.bats and noshebang.bats also exit 1); grep G1 prints `plant/forms/V01.bats:10`, empty on twin. Fleet: `env-knobs.bats:60` is the live violation.

**SH-TEST-04 (MUST).** End a `[[ ... ]]` or `(( ... ))` statement in a test with `|| false`, or use `[ ... ]`, unless the suite is pinned to bash >= 4.1.
- Why: bash 3.2 and 4.0 do not abort on a failing `[[`/`((` mid-function; macOS `/bin/bash` is 3.2.57 (V02, V03).
- Verify: `grep -rn -e '^[[:space:]]*\[\[.*\]\]$' -e '^[[:space:]]*((.*))$' --include='*.bats' tests/` (candidates; the statement is fine if it is the last one in the test). Behavioural proof: the same suite on `bash:3.2` and `bash:5.3` (SH-TEST-14). Verified: G3 and G4 print `V02.bats:10` and `V03.bats:10`, empty on twin; threshold run FX/dbl-bracket-threshold.sh (exit 0 on 3.2 and 4.0, exit 1 from 4.1). Fleet: `dist.bats:160`.

**SH-TEST-05 (MUST).** Every `run` carries its status: `run -N cmd` or `run ! cmd`, or an immediate `[ "$status" -eq N ]` / `assert_success` / `assert_failure`; for an expected failure pin the exact code, never `-ne 0`.
- Why: `run` always succeeds; an unchecked `run` asserts nothing (V05) and `-ne 0` is satisfied by 127 (V11).
- Verify: `grep -rn -e '^[[:space:]]*run [^-!]' --include='*.bats' tests/` lists every `run` without a leading status option; read each for a following status check. Verified (as a candidate list): FX/grep-checks.sh G7 lists `V05`, `V10`, `V11` on the plant; the twin's one hit (`run bash -c ...`) is followed by `[ "$status" -eq 0 ]`.

**SH-TEST-06 (MUST).** No `|| true` or `|| :` inside a test body; fix the command or assert its status.
- Why: it converts the assertion into a no-op (V06, V13).
- Verify: `grep -rnP -e '\x7c\x7c[ ]*true' --include='*.bats' tests/` and `grep -rnP -e '\x7c\x7c[ ]*:[ ]*$' --include='*.bats' tests/` (`\x7c` is the literal bar; `-P` takes one pattern per call). Verified: G2, G2b print `V06.bats:10` and `V13.bats:5`, empty on twin.

**SH-TEST-07 (MUST).** Declare then assign in tests: `local v; v=$(cmd)`, not `local v=$(cmd)`.
- Why: the status of `local` hides the substitution's (V07).
- Verify: `shellcheck -f gcc -i SC2155 FILE.bats` (exit 1 and an SC2155 line). Verified: plant V07 exit 1, twin V07 exit 0. A plain `shellcheck FILE.bats` also exits 1 on the twin (SC2034, unused `v` in this fixture), so `-i` is needed for the check to be admissible.

**SH-TEST-08 (MUST).** CI fails a bats run that contains any skipped test: a `skip` is permitted locally with a reason and an install hint, never as the CI outcome for a missing tool.
- Why: `ok N ... # skip` exits 0 on every version (V09); the fleet has 28 sites that turn a missing fish/nu/elvish into green (SH-EMIT-32).
- Verify: `sh ci/bats-census.sh tests/ tap.txt` (exit 1 and prints the `# skip` line). Verified: FX/census-matrix.sh `PLANT skip-suite ... census-exit=1`, twin `census-exit=0`, on bats 1.13.0 and 1.14.0. Static backup: `grep -rn -e 'skip "' -e "skip '" --include='*.bats' tests/` (G5; plant `V09.bats:10`, empty on twin).

**SH-TEST-09 (MUST).** Run bats with `-r` on the test directory (or list the files in one place checked by the census), and gate with the census: static `@test` count under the directory equals the TAP plan.
- Why: without `-r` nested files are silently dropped and the suite exits 0; an explicit list on the macOS leg lets a new file skip that leg unnoticed.
- Verify: `sh ci/bats-census.sh tests/ tap.txt`. Verified: FX/census-matrix.sh `PLANT ok-suite without -r bats-exit=0 census-exit=1 census: 2 @test on disk but TAP plan is 1`; twin with `-r` exit 0.

**SH-TEST-10 (MUST).** An empty suite is an error: pin bats >= 1.14.0 (do not rely on `--allow-empty-suite` or `BATS_ALLOW_EMPTY_SUITE` for a compatible-with-older setup) and keep SH-TEST-09's census as the guard for older runners.
- Why: <= 1.13.0 exits 0 on `1..0`; the flag is unknown before 1.14.0 (exit 1 `Bad command line option`); the env var is unreleased master only.
- Verify: `FX/suite-matrix.sh` (exit code per bats version on an empty directory). Verified: 1.11.1 exit 0, 1.13.0 exit 0, 1.14.0 exit 1; env var: 1.14.0 exit 1, master exit 0 (FX/empty-env.sh).

**SH-TEST-11 (MUST).** A function under `run` that needs errexit sets `set -e` itself or the suite passes `--errexit` (bats >= 1.14.0); do not assume either from an older bats run.
- Why: <= 1.13.0 ignores the function's `set -e` on bash >= 4.0 and honours it on 3.2; 1.14.0 honours it everywhere but does not stop plain commands without `--errexit`.
- Verify: `FX/v10-threshold.sh` and `FX/errexit-flag.sh`. Verified: table in F3 (status=0 vs status=1).

**SH-TEST-12 (SHOULD).** A teardown ends in a command whose status is the assertion, or `|| return 1` after each check; do not put assertions in the middle.
- Why: ERREXIT is off in teardown; only the final status counts (V12).
- Verify: no automated check; reading heuristic over every `teardown`/`teardown_file`. Behavioural proof (verified): FX/plant/forms/V12.bats green on 6 bats/bash pairs, twin red.

**SH-TEST-13 (SHOULD).** Keep a canary: one planted always-failing `.bats` that CI runs and requires to exit non-zero, and run it on every bats/bash pair of the matrix.
- Why: it proves the runner can still go red (bats-core does it: `bash -c "! bin/bats test/fixtures/bats/failing.bats"`).
- Verify: `! bats tests-canary/failing.bats` as an exit-code step. Verified: FX/canary/failing.bats gives suite exit 1 on 1.11.1, 1.13.0, 1.14.0 (FX/pin-and-canary.sh).

**SH-TEST-14 (MUST).** The CI matrix for a bats suite is bats 1.14.0 on the `bash:3.2` and `bash:5.3` images plus one macOS runner leg; add bash 4.1 only for a rule with a 4.1 threshold. The images prove bash-version behaviour only (Alpine/busybox userland), so BSD userland claims need the macOS leg.
- Why: the oldest and newest bash disagree on 3 of 13 forms (V02, V03, V10), 3.2 is what macOS-bound scripts run on, and the macOS leg is the only BSD-userland signal (unverified: read only).
- Verify: run the suite twice, `FX/run-bats.sh 1.14.0 3.2 tests/` and `FX/run-bats.sh 1.14.0 5.3 tests/`, both must exit 0 on a correct suite; the proof that the two legs are not redundant is FX/results/form-matrix-plant.txt (V02, V03, V10 give different exit codes on 3.2 and 5.3). The sketch FX/ci/bats-matrix.yml parses with `python3 -c 'import yaml; yaml.safe_load(open("ci/bats-matrix.yml"))'` (no error, run). macOS leg: unverified: read only.

**SH-TEST-15 (MUST).** A POSIX script under test runs under every interpreter of SH-DIAL-04 by passing the interpreter as data: `read -r -a sut <<< "$SUT_SH"; run -0 "${sut[@]}" "$SCRIPT"`; dash and posh are mandatory members.
- Why: a `[[ ]]` bashism is accepted by busybox ash 1.35, mksh, ksh93u+m, yash and bash; only dash 0.5.12 and posh 0.14.1 reject it.
- Verify: `FX/sut-matrix.sh plant` (exit 1 on dash and posh) vs `FX/sut-matrix.sh twin` (all exit 0). Verified: F6 output.

**SH-TEST-16 (SHOULD).** In-process unit tests of POSIX functions use ShellSpec pinned to a commit and run with `--fail-no-examples`; the interpreter list follows SH-DIAL-04.
- Why: it is the only framework that runs inside dash/busybox/yash/posh; it exits 0 on an empty suite by default; its last release is 0.28.1 (2021-01-11).
- Verify: `shellspec --fail-no-examples --shell dash spec/` exit codes. Verified: FX/shellspec-demo/run.sh: plant exit 101, twin exit 0, empty suite 0 by default and 101 with the flag; posix-matrix.sh gives plant 101 and twin 0 on dash, busybox ash, mksh, ksh, yash, posh, bash.

**SH-TEST-17 (SHOULD).** Use bats-support v0.3.0 and bats-assert v2.2.4 (vendored) for output assertions; `load` them by path, and keep one test per assertion helper that must go red when the library is misloaded.
- Why: `run` stores output only in `$output`; assertions give failure output and exit semantic.
- Verify: `FX/run-bats.sh 1.14.0 5.3 assertlib/assert-red.bats`: every test `not ok`, exit 1. Verified on bash 5.3 and 3.2.

**SH-TEST-18 (MUST).** Installer tests are hermetic: a dunder-prefixed hatch variable (read in one function, never documented) replaces the download, a localhost HTTPS fixture server with a vendored self-signed cert replaces the release host, a stub records argv, and each test `setup` unsets every hatch variable.
- Why: tests then run offline, assert the exact hand-off argv (`self setup 0.0.0 --no-modify-path`) and cannot be steered by the developer's environment.
- Verify: no automated check (reading heuristic): `grep -rn -e '__[A-Z_]*TESTING' --include='*.sh' src/` must list only the guarded reads; `grep -rL -e 'unset __' --include='*.bats' tests/` lists suites that never unset a hatch.

**SH-TEST-19 (MUST).** Pin Pester with `-RequiredVersion` (6.2.0), never `-MinimumVersion`, in every workflow, Taskfile and script.
- Why: `-MinimumVersion 5.0` resolves to 6.2.0 on 2026-10-11 and changes silently with every PSGallery release; the local copy is 5.7.1.
- Verify: `grep -rnP -e 'Install-Module[ ]+(-Name[ ]+)?Pester(?![^\n]*-RequiredVersion)' --include='*.yml' --include='*.yaml' --include='*.ps1' --include='*.psm1' .`. Verified: FX/pester-checks.sh P1: plant `ci.yml:7` printed (grep exit 0), twin empty (grep exit 1). Fleet: `www-setup@a251c3631047:.github/workflows/test-installers.yml:150`, `taskfiles/test.taskfile.yml:40`.

**SH-TEST-20 (MUST).** `$cfg.Run.Exit = $true` in every CI Pester invocation, and read the result with `-PassThru` through a census (SH-TEST-22).
- Why: `Run.Exit` defaults to `False`; a failing suite then exits 0 on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1.
- Verify: run a failing file both ways, `matrix.sh pwsh exit-default.ps1 6.2.0 false` prints `reached end of script` and exit 0 (red), with `true` exit 1 on all three hosts. Verified: F8.

**SH-TEST-21 (MUST).** One assertion syntax per suite, matching the pin: classic `Should -Be` is valid on 5.7.1 through 6.2.0; `Should-*` only on >= 6.0.0 (CommandNotFound, red, on 5.7.1); set `Should.DisableV5 = $true` only in a suite with no classic assertion.
- Why: DisableV5 turns every `Should -Be` red; a mixed suite on the wrong pin fails loudly, never vacuously.
- Verify: run with `$c.Should.DisableV5 = $true` and read the exit code. Verified: c14 on 6.2.0: `Pester Should -Be syntax is disabled. Use Should-Be (without space) ...`, Failed, on all three hosts; c02/c03 on 5.7.1 Failed with `The term 'Should-Be' is not recognized`.

**SH-TEST-22 (MUST).** Gate the Pester result with a census, not `Run.Exit` alone: red on `FailedCount > 0`, failed containers or blocks, `TotalCount = 0`, `PassedCount = 0`, `NotRunCount > 0`, `InconclusiveCount > 0`, and `SkippedCount` over a per-OS budget.
- Why: a file with no `Describe`, all-`-Skip`, or (5.x) `-ForEach @()` exits 0 on both majors.
- Verify: `matrix.sh pwsh pester-gate.ps1 6.2.0 skip-only.Tests.ps1` (exit 1 `GATE RED: zero tests passed; skipped=1`) vs `pass.Tests.ps1` (exit 0). Verified: F9, six cases x 3 hosts x 2 versions, no flake after the sequential re-run.

**SH-TEST-23 (MUST).** On Pester 6 do not use `Assert-MockCalled`, `Assert-VerifiableMock`, `Set-ItResult -Pending`, `-Focus`; write `Should -Invoke`, `-InvokeVerifiable`, `-Skipped`/`-Inconclusive`, tags or `Filter`. A `-ForEach` that can be empty carries `-AllowNullOrEmptyForEach` deliberately.
- Why: removed in 6.0.0; on a 5.1 host a removed command can be answered by the inbox Pester 3.4.0 with an unrelated message.
- Verify: `grep -rn -e 'Assert-MockCalled' -e 'Assert-VerifiableMock' -e 'Set-ItResult -Pending' -e 'It .* -Focus' --include='*.Tests.ps1' tests/`. Verified: FX/pester-checks.sh P2: plant prints 3 lines (grep exit 0), twin empty (exit 1); runtime errors in F8. Fleet: no hits.

**SH-TEST-24 (MUST).** Nothing at file level or directly in `Describe`/`Context` except container commands; setup is `BeforeAll`, generated cases are `BeforeDiscovery`. Each file is self-contained (own `Import-Module`, own data).
- Why: code outside runs at discovery (for filtered-out files and `Run.SkipRun` too) and is invisible inside `It`; Pester 6 does not promise cross-file discovery state.
- Verify: `matrix.sh pwsh Test-DiscoveryCode.ps1 FILE.Tests.ps1` (exit 1 and the offending lines, exit 0 clean; PowerShell 5.1-safe). Verified: FX/pester-files/discovery.plant.Tests.ps1 exit 1 with 4 findings on pwsh 7.4, 7.6.6 and 5.1; twin exit 0.

**SH-TEST-25 (SHOULD).** Pester matrix hosts: Windows PowerShell 5.1 and pwsh 7.6 (add 7.4 only while it is supported, until 2026-11-10); import the pinned module by `-RequiredVersion` and install with `-SkipPublisherCheck`.
- Why: Pester 6.2.0 behaves identically on 5.1, 7.4 and 7.6 here (20 cases, no differences), and the 5.1 host's inbox 3.4.0 otherwise answers.
- Verify: `matrix.sh pwsh pester-gate.ps1 6.2.0 pass.Tests.ps1` prints `GATE GREEN` three times; `Get-Module -ListAvailable Pester` on 5.1 shows 3.4.0 next to the pin. Verified: F8, F9.

## Verification runs

All commands were run 2026-10-11 from the fixture directory `FX` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/bats-pester-matrix`; `matrix.sh` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`. `grep` on this host is ugrep 7.8.4; only POSIX options plus `-P` (single pattern) are used.

| # | Check | Command | Exit on plant | Exit on twin | Key output |
|---|---|---|---|---|---|
| 1 | 13 vacuous forms x 3 bats x 2 bash | `FX/form-matrix.sh plant`, `FX/form-matrix.sh twin` (V13: `FX/run-bats.sh 1.14.0 5.3 plant/forms/V13.bats`) | 0 for V01,V04-V09,V11,V12,V13 on all pairs; V02,V03 0 on bash 3.2 and 1 on 5.3; V10 per F3 | 1 on every pair, all 13 forms | `V01   exit=0     exit=0 ...` (results/form-matrix-plant.txt); twin all `exit=1` |
| 2 | `[[`/`((` threshold | `FX/dbl-bracket-threshold.sh` | `bash 3.2: V02=exit0 V03=exit0`, `bash 4.0: ... exit0` | n/a | `bash 4.1: V02=exit1 V03=exit1` |
| 3 | `run` + function `set -e` | `FX/v10-threshold.sh` | 1.13.0: b3.2=1 b4.0..b5.3=0 | 1.14.0: all 1 | table in F3 |
| 4 | `--errexit` flag | `FX/errexit-flag.sh` | `status=0 output=reached-after-false` (no flag) | `status=1 output=` with `--errexit` on 1.14.0 | F3 |
| 5 | Empty suite, `-r`, skip | `FX/suite-matrix.sh <label> ...` | 1.11.1/1.13.0 exit 0; 1.14.0 exit 1 | `ok-suite -r` 2 tests exit 0 | F4 block |
| 6 | `BATS_ALLOW_EMPTY_SUITE` | `FX/empty-env.sh` | 1.14.0 exit 1 | master exit 0 | `ERROR: Found no tests.` |
| 7 | Census | `FX/census-matrix.sh` | `census-exit=1` x3 plants | `census-exit=0` | `census: 2 @test on disk but TAP plan is 1` |
| 8 | Version pin, canary | `FX/pin-and-canary.sh` | pin check exit 1 on 1.11.1, 1.13.0; canary suite exit 1 x3 | pin exit 0 on 1.14.0 | `reports "Bats 1.11.1"` |
| 9 | ShellCheck on forms | `run.sh shellcheck -f gcc -o all plant/forms/V01.bats`, `V07.bats` | exit 1 (SC2314; SC2155) | exit 0 on twin V01 | `In Bats, ! does not cause a test failure. ... [SC2314]` |
| 10 | Reviewer greps | `FX/grep-checks.sh` (G1-G7) | G1 `V01.bats:10`, G2 `V06.bats:10`, G2b `V13.bats:5`, G3 `V02.bats:10`, G4 `V03.bats:10`, G5 `V09.bats:10`, G6 `sc/directive.bats sc/noshebang.bats` | all empty (G7 one candidate, read) | results/grep-checks.txt |
| 11 | POSIX interpreter matrix | `FX/sut-matrix.sh plant`, `FX/sut-matrix.sh twin` | dash 1, posh 1, others 0 | all 0 | F6 block |
| 12 | ShellSpec | `FX/shellspec-demo/run.sh`; `FX/shellspec-demo/posix-matrix.sh spec/plant_spec.sh` and `twin_spec.sh` | 101 on 7 interpreters | 0 on 7 | `1 example, 0 failures`; empty: `0 examples, 0 failures, no examples found` exit 101 with `--fail-no-examples` |
| 13 | bats-assert | `FX/run-bats.sh 1.14.0 5.3 --tap assertlib/assert-red.bats` (and `3.2`) | 1 (5 `not ok`) | n/a (negative test of the library) | `not ok 1 A1 assert_output mismatch must go red` |
| 14 | Git Bash 5.2.15 | `matrix.sh win winbats.sh` | `plant: V01=0 V02=1 V03=1 V04=0 ... V10=1 V11=0` | `twin: all 1` | host `MINGW64_NT-10.0-26200` |
| 15 | Pester 5.7.1 vs 6.2.0, 20 cases | `matrix.sh pwsh pester-matrix.ps1 5.7.1`, `... 6.2.0` | see F8 table | n/a | zero differences between the three hosts |
| 16 | `Run.Exit` default | `matrix.sh pwsh exit-default.ps1 6.2.0 false` / `true` | `false`: exit 0 x3 | `true`: exit 1 x3 | `reached end of script (Run.Exit=False)` |
| 17 | Exit code per case | `FX/exit-matrix.sh` | c04 5.9.1 `exit 0 exit 0 exit 0`; c08, c10 0 | c04 6.2.0 `exit 1` x3 | F9 |
| 18 | Pester census gate | `FX/gate-matrix.sh` | `GATE RED` exit 1 for foreach-empty, empty, skip-only on both majors, 3 hosts | `GATE GREEN` exit 0 for pass.Tests.ps1 | F9 block |
| 19 | Discovery AST check | `matrix.sh pwsh Test-DiscoveryCode.ps1 plant` / `twin` | exit 1, 4 findings x 3 hosts | exit 0 x 3 | `discovery-only code in file level: ...` |
| 20 | Discovery runtime | `run.sh pwsh -File pester-gate.ps1 5.9.1\|6.2.0 discovery.plant.Tests.ps1` | `GATE RED: failed=1; zero tests passed` exit 1 | twin `GATE GREEN` exit 0 | |
| 21 | Cross-file discovery | `run.sh pwsh -File crossfile.ps1 5.9.1` / `6.2.0` | n/a | n/a | both `b case <_> | b case <_>` (did not reproduce) |
| 22 | Pester pin grep | `FX/pester-checks.sh` P1 | grep exit 0, `ci.yml:7` printed | grep exit 1, empty | `Install-Module -Name Pester -MinimumVersion 5.0 ...` |
| 23 | Removed-in-6 grep | `FX/pester-checks.sh` P2 | grep exit 0, 3 lines | grep exit 1, empty | |
| 24 | PSGallery resolution | `run.sh pwsh -File find-pester.ps1` | n/a | n/a | `-MinimumVersion 5.0 -> 6.2.0` |
| 25 | `DisableV5` | case c14 in pester-matrix.ps1 | Failed on 6.2.0 x3 hosts | n/a | `Pester Should -Be syntax is disabled.` |

Not watched red (and why): the macOS leg (no host; unverified: read only); SH-TEST-12 (teardown: the plant proves the vacuous behaviour but no mechanical check exists); SH-TEST-18's greps (reading heuristic); dynamic `@test` registration against the census (not built); bats <= 1.10 behaviour of `run !` (no old checkout; documentation only); bash 3.2 host-specific run of the Windows-only Git Bash 4.x (no such image).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| SH-TEST-01 vendored pin | `www-setup@a251c3631047` submodule bats-core v1.13.0; `setup-grimoire@1259e35b2550` v1.14.0; `rbenv@07e9b1e297a5:.github/workflows/ci.yml:15` `--branch v1.10.0` | the two fleet repos pin different majors; `pyenv@d28b750767d4` pins v1.10.0 for its Docker matrix (`Makefile:1`) but `test/run` calls whatever `bats` is on `PATH` and the workflow calls `bats/bin/bats` (`.github/workflows/pyenv_tests.yml`), so two entry points, two pins |
| SH-TEST-02 min-version | `pyenv@d28b750767d4:test/exec.bats:6`, `plugins/python-build/test/pyenv.bats:343`; `rbenv@07e9b1e297a5:test/which.bats:60,76`; 6 of 7 `www-setup` files | `setup-grimoire` 0 of 3, `www-setup/tests/install/exit-codes.bats` |
| SH-TEST-03 no bare `!` | pyenv 0 bare `!` in 47 `.bats`, rbenv 0 in 23 | `www-setup@a251c3631047:tests/install/env-knobs.bats:60`; `bats-core@0c92eb4c418d` itself has 11 bare `!` lines in 233 `.bats` (fixtures and tests of the quirk) |
| SH-TEST-04 `[[` mid-test | pyenv 12 `[[` lines, rbenv 3: their CI includes macOS (bash 3.2 or Homebrew) | `www-setup@a251c3631047:tests/install/dist.bats:160` (bash 3.2 vacuous; leg excludes the file) |
| SH-TEST-05 `run` status | bats-core 247 `run -N` and 7 `run !` uses; pyenv 4 `run -N` | rbenv 0 `run -N`: asserts through its own helpers instead (`rbenv@07e9b1e297a5:test/test_helper.bash:36` `assert_success`, 188 uses) |
| SH-TEST-08 skip | pyenv 22 `skip` uses for genuinely platform-bound tests | `www-setup@a251c3631047:tests/install/fish/install-fish.bats:28` and 27 siblings: a missing interpreter turns green |
| SH-TEST-13 canary | `bats-core@0c92eb4c418d:.github/workflows/tests.yml:125,167` "Check failing tests fail suite" | no fleet repo has one |
| SH-TEST-14 matrix | bats-core `bash-version` job over 3.2, 4.0-4.4, 4, 5.0, 5.1, 5, rc on `bash:<tag>` images (`tests.yml:199-217`); pyenv macos-14/15/15-intel/26 plus ubuntu 22.04/24.04 (+arm); rbenv ubuntu + macos | fleet: ubuntu + macos only; no bash 3.2 container, no census; macOS leg list is explicit |
| SH-TEST-15 interpreter as data | `www-setup@a251c3631047:.github/workflows/test-installers.yml:45` composes nu/fish/elvish into the bats run | no POSIX-interpreter leg (dash, ash, posh) for `install.sh`; the suite runs `sh` = whatever `/bin/sh` is |
| SH-TEST-16 ShellSpec | `shellspec@f2d13f991885` has 105 `*_spec.sh` files of its own | not used anywhere in the fleet or the 41 exemplars other than itself |
| SH-TEST-19 Pester pin | none in the corpus found pinned | `www-setup@a251c3631047:.github/workflows/test-installers.yml:150` `-MinimumVersion 5.0`, `taskfiles/test.taskfile.yml:40` unpinned `Install-Module` |
| SH-TEST-20 `Run.Exit` | both fleet repos set `$cfg.Run.Exit = $true` (`test-installers.yml:155-156`, `setup-grimoire@1259e35b2550:Taskfile.yml:100`) | n/a |
| SH-TEST-24 discovery | every fleet `.Tests.ps1` starts with a top-level `BeforeAll` | `Test-DiscoveryCode.ps1` never run over them (reading: top-level `BeforeAll` plus `Describe` bodies) |

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Writes `! grep -q ...` or `! [ -f x ]` as an assertion in a bats test | `shellcheck -s bats` SC2314 (default); grep G1 |
| Writes `[[ "$output" == *x* ]]` / `(( n > 0 ))` as the assertion in a suite that also runs on macOS bash 3.2 | grep G3/G4 plus the `bash:3.2` matrix leg |
| Calls `run cmd` and then asserts on `$output` only, or `[ "$status" -ne 0 ]` for an expected error | G7 candidate list; pin `run -N` |
| Appends `|| true` to make a flaky step "pass" | G2/G2b |
| Adds `skip "tool not installed"` instead of failing, or sets `BATS_ALLOW_EMPTY_SUITE=1` to silence an empty-suite error | census; `bats --version` pin |
| Assumes bats 1.14 flags (`--allow-empty-suite`, `--errexit`) exist on whatever `apt install bats` gives | `[ "$(bats --version)" = "Bats 1.14.0" ]` |
| Runs `bats tests/` without `-r` and reports "all tests pass" | census (`@test` count vs plan) |
| Treats `load file.sh` as sourcing (bats `load` appends `.bash`); expects `declare` variables in a loaded file to be visible (needs `declare -g`) | `bats` fails loudly; the [gotchas](https://bats-core.readthedocs.io/en/stable/gotchas.html) entries |
| Writes `run a \| grep b` expecting the pipe to be inside `run` | reading heuristic; use `bats_pipe` or `run bash -c '...'` ([writing-tests](https://bats-core.readthedocs.io/en/stable/writing-tests.html)) |
| Pester 4 habits: `Should Be 2` (no dash), `Assert-MockCalled`, `-Pending`, `-Focus`, top-level `$x = ...` in a `Describe` body, `Describe` data fed from a variable set in `BeforeAll` | grep P2; `Test-DiscoveryCode.ps1` AST check |
| Mixes `Should -Be` and `Should-Be` in one file, or writes `Should-Be` against a Pester 5 pin | `Should.DisableV5` run; the pin grep P1 |
| Writes `Install-Module Pester -MinimumVersion 5.0` and calls it "v5" | grep P1 |
| Runs `Invoke-Pester` without `Run.Exit` and trusts `$LASTEXITCODE` | `exit-default.ps1`-style run: exit 0 on failure |
| Reports a green Pester run that discovered 0 tests or skipped everything | the census gate `pester-gate.ps1` |
| PowerShell 7-only syntax in a test file that must run on 5.1 (`?:`, `&&`, `??`, `ForEach-Object -Parallel`) | parse on 5.1: `matrix.sh pwsh` third row (see PS-COMPAT) |
| Assumes the `bash:3.2` Docker image is macOS (BSD `sed -i ''`, `stat -f`) | it is Alpine/busybox (`ID=alpine`); only the macOS leg tells |

## Contested / evolving

- **Pester 5 vs 6.** 5.x is in maintenance since 2026-07-07 and 6.0.0-6.2.0 shipped in 9 weeks; adoption in the corpus is nil (the exemplars pin 5.x; the fleet floats). The trend is Pester 6 plus `Should-*`; classic `Should -Be` is deliberately kept ("additive"), with `Should.DisableV5` as the switch. 6.1.0 shipped `Should-BeFasterThan` that passed on anything unmeasurable and 6.2.0 made it throw: the new assertion family is itself still correcting vacuous passes. As of 2026-10-11.
- **Duplicate setup blocks.** 6.0.0 said they throw; 6.2.0 allows many `BeforeAll`/`BeforeEach`. Write one per block until the shape settles.
- **Per-file discovery.** Documented break in 6.0.0, not reproduced serially in 6.2.0 (F10); real under the experimental parallel runner (`Run.Parallel`, also on 5.1 since 6.2.0).
- **bats `run` and errexit.** 1.14.0 chose "honour the function's `set -e`" as default and put plain-command errexit behind `--errexit`; the maintainers call the first "might constitute a breaking change". Whether `--errexit` becomes default is open; do not rely on either for a multi-version matrix.
- **bats on bash 5.3.** Not in the project's support matrix (lists up to 5.2); passes here and the project moves its devcontainer to 5.3. Treat as supported in practice, unlisted on paper.
- **ShellSpec health.** One release in the last five years (0.28.1, 2021-01-11), commits up to 2025-11-24 per the repo metadata; usable, pin a SHA, do not assume new-shell support.
- **Skip policy.** Practitioners disagree on skipping for absent tools; bats-core itself uses `skip` 80 times, pyenv 22. The disagreement is resolved here only for CI (fail), not for local runs.
- **pwsh 7.4 end of life** on 2026-11-10 ([lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle)) while Pester 6 documents "7.4+" as its minimum: expect the Pester minimum to move; the matrix recipe should say 7.6 LTS.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md | bats-core CHANGELOG (primary) | 1.14.0 = 2026-07-21 plus [Unreleased] | `run` errexit, `--errexit`, empty-suite error, `BATS_ALLOW_EMPTY_SUITE` |
| https://bats-core.readthedocs.io/en/stable/gotchas.html | bats gotchas (primary) | 2026 | `!`, `[[`/`((` on bash < 4.1, `run` and pipes |
| https://bats-core.readthedocs.io/en/stable/writing-tests.html | bats writing-tests guide (primary) | 2026 | `run -N`, `run !`, teardown errexit, `bats_require_minimum_version` |
| https://bats-core.readthedocs.io/en/stable/support-matrix.html | bats support matrix (primary) | 2022 header, current text | bash 3.2.57-5.2 verified list |
| https://github.com/bats-core/bats-core/blob/master/.github/workflows/tests.yml | bats-core's own CI (primary; local clone `bats-core@0c92eb4c418d`) | 2026 | bash-version matrix, failing-suite canary |
| https://github.com/koalaman/shellcheck/wiki/SC2314 | ShellCheck SC2314 (primary) | 0.11.0 era | `!` in bats |
| https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin | Bash reference manual, `set -e` (primary) | bash 5.3 manual | `!` and `&&` lists are exempt from errexit |
| https://git.savannah.gnu.org/cgit/bash.git/plain/CHANGES | bash CHANGES file (primary; fetched earlier, host unreachable at write time) | 5.3-rc2 copy, 4.1-alpha section | `[[`/`((` subject to `set -e` from 4.1 |
| https://github.com/shellspec/shellspec | ShellSpec repository and README (primary) | 0.28.1 = 2021-01-11, pushed 2025-11-24 | supported shells, `--fail-no-examples` |
| https://github.com/kward/shunit2 | shunit2 repository (primary) | v2.1.8 = 2020-03-29 | alternative considered |
| https://github.com/pester/Pester/releases/tag/6.0.0 | Pester 6.0.0 release notes (primary) | 2026-07-07 | the breaking-changes list, Upgrading from v5 |
| https://github.com/pester/Pester/releases/tag/6.2.0 | Pester 6.2.0 release notes (primary) | 2026-09-09 | BeforeAll duplicates, `Should-BeFasterThan` fix, `BeforeContainer` |
| https://github.com/pester/Pester/releases/tag/5.9.0 | Pester 5.9.0 release notes (primary) | 2026-07-07 | Pester 5 maintenance mode, tested hosts |
| https://pester.dev/docs/usage/discovery-and-run | Pester discovery and run guide (primary) | 2026 | code outside BeforeAll, per-file diagram |
| https://pester.dev/docs/quick-start | Pester quick start (primary) | 2026 | `New-PesterConfiguration`, `Run.Exit` |
| https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle | PowerShell support lifecycle (primary) | 2026-10 | 7.4 EOL 2026-11-10, 7.6.6 LTS |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_requires?view=powershell-7.6 | about_Requires (primary) | 7.6 | `#Requires` semantics for test files |
| https://packages.debian.org/trixie/bats | Debian 13 package page | 2026-10-11 | bats 1.11.1-1 |
| https://packages.ubuntu.com/resolute/bats | Ubuntu 26.04 package page | 2026-10-11 | bats 1.13.0-1 |
| https://github.com/bats-core/bats-core/releases/tag/v1.14.0 | bats-core v1.14.0 release | 2026-07-21 | release date and tag |
| https://github.com/bats-core/bats-assert | bats-assert repository (primary) | v2.2.4 = 2025-10-14 | assertion helpers |
| https://github.com/bats-core/bats-support | bats-support repository (primary) | v0.3.0 = 2022-03-04 | helper library |
| `rbenv@07e9b1e297a5:.github/workflows/ci.yml` | exemplar CI with pinned bats | 2026 | `--branch v1.10.0`, ubuntu + macOS |
| `pyenv@d28b750767d4:.github/workflows/pyenv_tests.yml` | exemplar CI | 2026 | 8-runner matrix, `bats/bin/bats` |
| `www-setup@a251c3631047:.github/workflows/test-installers.yml`, `setup-grimoire@1259e35b2550:.github/workflows/test.yml` | fleet CI (primary evidence) | 2026-09-16 / 2026-07-26 | the unpinned Pester, the macOS leg list |
