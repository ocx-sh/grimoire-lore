---
title: "Shell and PowerShell tests (SH-TEST): bats, Pester and the interpreter matrix (consolidation)"
topic: shell scripting across operating systems and shells - tests (wave 3, group testing)
model: sonnet
id_family: SH-TEST
consolidates:
  - shell-testing/bats-pester-matrix.md
date: 2026-10-11
---

# Shell and PowerShell tests (SH-TEST)

One sub-artifact fed this group (`bats-pester-matrix.md`, 25 sources, 25 verification groups), so the conflicts below are against the sibling consolidations, the topic map, the audits and the dive's own text. Every number marked R-nn was re-run on 2026-10-11 for this consolidation (the runs are listed at the end of "The ruleset"); every number marked [dive] is cited to the dive and was not re-run. Fixture roots: `DV/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/bats-pester-matrix` (the dive), `ST/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/shell-testing-consolidation` (this consolidation: `e1` Pester gate, `e2` directive, `e3` census, `e4` lint, `e5` Pester lint, `e6` the verbatim cells on plant and twin, `e7` the CI recipe, `e10` signal test, `ref/` the reference scripts). Toolchain: bats-core 1.2.1, 1.6.1, 1.11.1, 1.13.0, 1.14.0 on the `bash:3.2` to `bash:5.3` images and `shellzoo:deb12`; Pester 5.7.1, 5.9.1, 6.2.0 on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1.26100; ShellCheck 0.11.0, shfmt 3.13.1. No macOS host: every BSD and macOS statement is marked "unverified: read only".

Keys. **[dive]** = `shell-testing/bats-pester-matrix.md` (F# = its finding, "cand N" = its candidate SH-TEST-nn). Audits: **[fleet]** `shell-audit/fleet-shell-shape.md`, **[ex]** `exemplar-shape.md`, **[cfg]** `config-inventory.md`, **[inst]** `installers.md`, **[plat]** `platform-matrix.md`. Sibling consolidations are cited by rule ID (SH-DIAL, SH-ERR, SH-GATE, SH-EMIT, SH-CI, PS-COMPAT, PS-ERR, PS-GATE).

## Verdict

1. **Three tools, split by what is under test.** bats-core 1.14.0, vendored by tag and version-asserted, for every script that runs as a subprocess: installers, CLIs, hooks, dev tooling, CI helpers (SH-TEST-01). Pester, pinned exactly, for PowerShell (SH-TEST-18). Plain matrix scripts for emitted text, which SH-EMIT owns. ShellSpec is CONSIDER, only for in-process unit tests of a POSIX library (SH-TEST-16): the fleet and 40 of the 41 exemplars never use it, and the fleet's own `quality-bash.md:117-123` recommends it on an asserted basis.
2. **A green bats run proves nothing until it is censused.** bats 1.14.0 exits 0 on a missing `-r` (nested files silently dropped), on any `skip`, on `run` calls that saw 126 or 127 (BW01) and on a missing version directive (BW02). One census over the TAP file and the stderr file turns all four, plus `not ok` and the plan/disk mismatch, red (SH-TEST-09). It binds every CI leg; the pin makes only the empty-suite case an error.
3. **Seven authoring forms stay green on a failing assertion and are banned by name**: a bare `!`, a mid-test `[[ ]]` or `(( ))` on bash below 4.1, `|| true`, a `run` whose status is never read, `-ne 0` or a bare `assert_failure`, an assertion behind `&&` or in a possibly-empty loop or in `teardown` (SH-TEST-03 to 08). `checks/bats-lint.sh` and ShellCheck's SC2314 catch five of them mechanically; the other three are reading heuristics. ShellCheck sees only two of the thirteen forms the dive planted, so the gate is necessary and not sufficient, and it must include the `.bats` files (SH-GATE-09, SH-GATE-11).
4. **Pin every test tool exactly.** bats `--version` asserted in CI; Pester by `-RequiredVersion` (default 6.2.0; 5.9.1 for a repo that stays on Pester 5, never 5.7.1). `apt install bats` gives 1.2.1 to 1.13.0 depending on the release and every one of them is vacuous in a different way; `-MinimumVersion 5.0` resolves to 6.2.0 today and the fleet already runs 6.2.0 under a step named "Install Pester (v5)" (SH-TEST-01, SH-TEST-18).
5. **The bash matrix is the script's floor and the latest, not a fixed list.** The suite for a bash script runs on `bash:3.2` (unless the header pins higher, SH-DIAL-25), on `bash:5.3`, and on one macOS leg when macOS is claimed; the images are Alpine and prove bash-version behaviour only, never BSD userland (SH-TEST-12). A `#!/bin/sh` script runs under the interpreters of SH-DIAL-04 by passing the interpreter as data; dash is the member that catches `[[ ]]`, so posh stays conditional on a strict-POSIX claim (SH-TEST-13). A script that traps gets one signal test through the same loop (SH-TEST-14).
6. **One skip policy for bats and Pester.** CI never skips for an absent interpreter or tool the suite exists to exercise; platform-fact skips go through a per-leg budget (default zero, a reason regex per leg in bats, `-MaxSkipped` in Pester). This replaces the dive's flat "any skip fails" for bats, which the fleet's 15 intentional Windows Pester skips and 5 GNU-wget and `timeout(1)` skips would break (SH-TEST-10, SH-TEST-19).
7. **A Pester CI step is a census gate.** `Run.Exit = $true` alone exits 0 on a file with no `Describe`, a file whose every test is skipped, and (Pester 5) an empty `-ForEach`. Measured: `Run.Exit` exits only on failure, so it composes with the census, which then covers the vacuous shapes (SH-TEST-19). Code at file level or directly in `Describe` runs at discovery and is invisible in `It`; an AST check enforces it (SH-TEST-21).
8. **Installer tests are hermetic and the PowerShell host matrix is a question about the subject, not about Pester.** Hatch variable, localhost HTTPS fixture server, argv-recording stub (SH-TEST-17, SHOULD). Pester behaves identically on 5.1, 7.4 and 7.6 in 20 cases; what must vary is the host that runs the script under test, so the child host is a parameter or a 5.1 smoke (SH-TEST-22).
9. **Where the Pester half lives is an owner call, defaulted.** The IDs stay SH-TEST; the default authors them into `powershell-quality/gates.md` so the agent that edits a `*.Tests.ps1` file reaches them (Open questions, O1).
10. **Verification cells use the SH-GATE-21 dialect**: git-fed lists, `grep -H -n -E -e`, output is the violation, no `-P`, no `-r --include`. The dive's cells used `grep -r --include` and `-P`; all were rewritten and re-run (C5).
11. **Documented gaps, not closed here.** macOS and BSD userland (read only); the GitHub `windows-2025` Git Bash 5.3.15 (the host has 5.2.15); dynamic `bats_test_function` suites against the census (not measured); the 5.1 host running the fleet's fixture-server Pester suites (the fleet calls it unreliable).

### Conflicts resolved

| # | The two sides | Resolution and reason |
|---|---|---|
| C1 | [dive] cand 15: dash and posh are mandatory members of the POSIX loop. SH-DIAL-04: posh only when strict POSIX.1-2017 is claimed. | **SH-DIAL-04 owns the list** (shell-dialect.md, X12). R7 re-run: the `[[ ]]` plant is red on dash and posh, green on busybox ash, mksh, ksh93u+m, yash and bash, so dash alone carries the finding; the dive's own evidence supports dash, not posh. |
| C2 | [dive] cand 8 (MUST): CI fails any skipped test. [dive] cand 22: Pester gets a per-OS skip budget because 15 Windows skips are intentional. SH-EMIT-32 (CONSIDER): fail when a target interpreter is absent. | **One budget mechanism for both tools, default zero** (SH-TEST-10, SH-TEST-19). Absent-interpreter skips are never in the budget. SH-EMIT-32 stays CONSIDER because its check is a reading heuristic that was not watched red; SH-TEST-10 is MUST because the census was (R3). Fleet: 31 skip sites in www-setup, of which 26 are an absent shell, 4 GNU wget and 1 `timeout(1)`; the Windows Pester leg skipped 15 in CI run 35122540356 (R16). |
| C3 | [dive] cand 20 (`Run.Exit = $true`, MUST) next to cand 22 (census gate, MUST). They look redundant or conflicting if `Run.Exit` exits before the census. | **They compose; merged into SH-TEST-19.** R11 on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1: `Run.Exit` exits (code 1, no output) only when something failed; a pass or a vacuous run returns, so the census runs after it. A bare `Invoke-Pester` still needs `Run.Exit`. |
| C4 | [dive] cand 25: run Pester on 5.1 and 7.6. [dive] F8: 20 cases, zero host differences. PS-COMPAT-01: Pester scripts target 7.6. `www-setup@a251c3631047:.github/workflows/test-installers.yml:161-166`: the suite shells out to `pwsh`, so "a 5.1 host adds no real 5.1 coverage". | **The dive's conclusion contradicts its premise.** If Pester behaves identically on every host, running Pester on 5.1 adds nothing. Pester runs on pwsh 7.6; the variable is the host of the script under test (SH-TEST-22). setup-grimoire's child host `pwsh` is correct because `action.yml:64` runs `install.ps1` under `pwsh`. |
| C5 | [dive] cells use `grep -r --include` and `grep -P` with `\x7c`. SH-GATE-21, -23, -30 and cross-consolidation X1: git-fed lists, no `-r`, no `-P`, awk for more than two stages. | **Rewritten to SH-GATE-21 and re-run on plant and twin (R4).** The structural checks (statusless `run`, Pester pin by file, the census) are scripts in the SH-GATE-31 exit map (R5, R14). |
| C6 | [dive] census counts `^@test ` at column 0. bats' own parser accepts leading blanks. | **Bats wins.** An indented `@test` is run by bats (plan 1) and counted 0 by the dive's census, a false red (R3). The census uses `^[[:blank:]]*@test[[:blank:]]`. |
| C7 | [dive] recipe: macOS leg ends `bats ... > tap.txt \|\| true`, Linux leg uses `\|\| rc=$?`. SH-TEST-05 bans `\|\| true` on the command under test. | **Both legs capture the status and exit with it** (recipe in SH-TEST-12). The census would still catch `not ok`, but a bats crash before any TAP line would read as a plan mismatch instead of the real error. |
| C8 | Topic map M-G-01: "shellspec's last release is 2024-09". [dive] F1: last release 0.28.1 on 2021-01-11, last commit in the clone 2024-09-12, repository pushed 2025-11-24. grimoire `quality-bash.md:117-123` (asserted): "ShellSpec when you need mocking". | **The dive wins** (GitHub API). ShellSpec is CONSIDER, pinned by commit (SH-TEST-16). The fleet's mocking is a stub binary that records argv (`server_stub_body`), not ShellSpec; the asserted fleet rule is replaced when the shell set is installed there (map X6). |
| C9 | Topic map M-G-03: "bats 1.14.0 `run` honours `set -e`". [dive] F3: narrower. | **The dive wins, re-run (R8).** 1.14.0 honours a `set -e` the called function sets itself, on every bash from 3.2; plain commands under `run` still keep going unless `--errexit` is passed (SH-TEST-15). |
| C10 | [dive] cand 7 (`local v=$(cmd)`, MUST) duplicates SH-ERR-01. [dive] cand 10 (empty suite) duplicates cand 9 (census). [dive] cand 17 (library pins plus a misload test). | **Dropped or merged**: cand 7 becomes a pointer to SH-ERR-01 (the gate reports SC2155 and SH-GATE-06 forbids disabling it); cand 10 folds into SH-TEST-09 and SH-TEST-01; cand 17's pins fold into SH-TEST-01 and its misload test is dropped (it tests bats-assert, not the suite). 25 candidates become 22 rules. |
| C11 | Map "Explicitly not a defect": `cmd \|\| true` with a comment that says why; `[[ ]]` in a bash script. [dive] cand 4 and 6 ban `[[` and `\|\| true` in bats. | **Scope, not contradiction.** SH-TEST-04 and -05 bind assertions and the command under test. A same-line reason makes `\|\| true` in `setup`/`teardown` cleanup legal (the V16 twin is silent, R4); `[[ ]]` as a conditional or as the last statement of a test is fine. |
| C12 | [dive] cand 18 (hermetic installer tests, MUST) with no automated check and a fleet-internal origin. | **SHOULD.** A MUST needs a normative or measured source and a run check; the hatch convention is the fleet's own and `__OCX_TESTING_INSTALL_BINARY` is an environment-controlled code path in a `curl \| sh` installer, which SH-INST (unopened) must bound before it becomes a MUST (SH-TEST-17, O5). |
| C13 | [dive] cand 21: "one assertion syntax per suite". [dive] F8: classic `Should -Be` runs unchanged on 6.2.0 and the plan is to adopt `Should-*` per file. | **Per file, decided by the pin** (SH-TEST-18). Pester 6 runs files independently, so the file is the unit; `Should.DisableV5 = $true` is allowed only where no classic assertion is left. |
| C14 | Fleet rule `www-setup/.claude/rules/testing-pwsh.md` and the step title "Install Pester (v5)" against the CI log: `Pester v6.2.0` ran green (23 passed, 0 failed, 15 skipped on Windows; 38/0/0 on Ubuntu). | **Ratify and pin, do not downgrade.** The suites contain no Pester-6-removed construct (R14) and run green on 6.2.0 (R16). What is wrong is the float, not the version; the rule file text is stale. The exact pin is the MUST, the number 6.2.0 is the default (O2). |

## The ruleset

### Reading the verification cells

- **Dialect.** Every cell follows SH-GATE-21 to 26: `git ls-files -z --cached --others --exclude-standard -- PATHSPEC | xargs -0 -r grep -H -n -E -e PAT --`, output is the violation, empty stdout and empty stderr mean pass, never the exit status. `.bats` files are listed by pathspec `'*.bats'`, not by the SH-GATE-22 `shfmt -f` list: bats discovers tests by that extension only, so the extensionless blindness SH-GATE-22 guards against does not apply. `grep -L` lists the files lacking a match (its exit status is inverted on busybox, so the output is the verdict).
- **Start a block with the PREFLIGHT line** (SH-GATE-25); a missing tool otherwise reads as a pass.

  ```sh preflight
  for t in git xargs grep awk shellcheck; do command -v "$t" >/dev/null 2>&1 || echo "PREFLIGHT: $t missing"; done; git rev-parse --is-inside-work-tree >/dev/null 2>&1 || echo "PREFLIGHT: no usable git work tree" # vd-ok: xargs here is a tool name, not an invocation
  ```

- **Cells marked `# cell NAME`** were extracted from this document and run verbatim on a plant repo and a twin repo (R4). Checks that need awk are scripts in the SH-GATE-31 exit map (0 clean, 1 finding, 64 usage, 69 tool missing, 74 scan failed, 78 no usable work tree, 79 nothing in scope); they are reproduced below.
- **Severity words.** MUST needs a measured or normative source and a verification watched red on a plant and green on its twin, or a stated reason why it can only be a reading heuristic. SHOULD and CONSIDER may rest on a reading heuristic, named as one.
- **Dive IDs were renumbered**; the map is at the end of this section.
- **Not owned here, no new ID.**

  | Topic | Owner |
  |---|---|
  | `local v=$(cmd)` in a test body (vacuous, V07) | SH-ERR-01; the gate reports SC2155 and SH-GATE-06 forbids disabling it |
  | `.bats` and `.bash` helpers inside the lint and format gate | SH-GATE-09, SH-GATE-11 |
  | test code obeys the dialect floor of the script it tests (no negative subscripts, `mapfile`, `declare -A`, `${v,,}` on a 3.2 floor; `shasum -a 256` not `sha256sum`) | SH-DIAL-25 and the SH-USER rules; the fleet states it in `www-setup/.claude/rules/testing-bash.md:203-210` |
  | hostile-corpus tests for emitted code, interpreter-absent failure | SH-EMIT-04, SH-EMIT-32 |
  | the interpreter list for POSIX scripts | SH-DIAL-04 |
  | pipefail and `shell:` of the CI step that runs the tests | SH-CI |
  | the 5.1 parse and the 5.1 smoke run of an installer | PS-COMPAT-02, PS-COMPAT-05, PS-GATE-08 |
  | coverage (kcov, bash only) | deferred in the map (M-G-07: never for this set) |

### Reference scripts (all run; Test-DiscoveryCode.ps1 is the dive's, unchanged)

`bats-census.sh`, from `ST/ref/` (R3). ShellCheck `-s sh` and `shfmt -d -i 4 -ci` clean.

```sh
#!/bin/sh
# bats-census.sh TESTS_DIR TAP_FILE [STDERR_FILE] -- proves a green bats run ran what is on disk.
# Run from the repo root after the bats step. Output is the violation.
# Red when: static @test count != TAP plan; any "not ok"; a skip outside CENSUS_SKIP_OK; a BWnn warning on stderr.
# env CENSUS_SKIP_OK: ERE of skip reasons this leg allows (default none: every skip is a finding).
# Exit: 0 clean; 1 a finding; 64 usage; 69 a required tool is missing; 74 the scan failed;
#       78 not a usable git work tree; 79 no .bats files under TESTS_DIR.
set -u
[ "$#" -ge 2 ] && [ "$#" -le 3 ] || {
    echo "usage: bats-census.sh TESTS_DIR TAP_FILE [STDERR_FILE]" >&2
    exit 64
}
dir=$1
tap=$2
errfile=${3:-}
for t in git grep xargs awk sed mktemp; do
    command -v "$t" >/dev/null 2>&1 || {
        echo "bats-census: '$t' not on PATH" >&2
        exit 69
    }
done
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "bats-census: not a usable git work tree" >&2
    exit 78
}
[ -r "$tap" ] || {
    echo "bats-census: cannot read $tap" >&2
    exit 74
}
list=$(mktemp) || exit 74
out=$(mktemp) || exit 74
err=$(mktemp) || exit 74
trap 'rm -f "$list" "$out" "$err"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
git ls-files -z --cached --others --exclude-standard -- "$dir/*.bats" >"$list" || {
    echo "bats-census: git ls-files failed" >&2
    exit 74
}
[ -s "$list" ] || {
    echo "bats-census: no .bats files under $dir" >&2
    exit 79
}
xargs -0 -r grep -s -H -c -e '^[[:blank:]]*@test[[:blank:]]' -- <"$list" >"$out" 2>"$err"
st=$?
if [ -s "$err" ] || [ "$st" -gt 123 ]; then
    cat "$err" >&2
    exit 74
fi
static=$(awk -F: '{ n += $NF } END { print n + 0 }' "$out")
plan=$(sed -n 's/^1\.\.\([0-9][0-9]*\)$/\1/p' "$tap" | head -n 1)
rc=0
if [ "$static" -eq 0 ] || [ "${plan:-x}" != "$static" ]; then
    echo "census: $static @test on disk but TAP plan is ${plan:-missing}"
    rc=1
fi
skips=$(grep -e '^ok [0-9]* .* # skip' "$tap")
if [ -n "$skips" ] && [ -n "${CENSUS_SKIP_OK:-}" ]; then
    skips=$(printf '%s\n' "$skips" | grep -v -E -e "# skip.*(${CENSUS_SKIP_OK})")
fi
if [ -n "$skips" ]; then
    printf '%s\n' "$skips"
    rc=1
fi
grep -e '^not ok ' "$tap" && rc=1
# bats reports BW01 (run saw 126/127) and BW02 (flag without the version directive) on stderr and still exits 0
if [ -n "$errfile" ]; then
    grep -e '^BW[0-9][0-9]*:' "$errfile" && rc=1
fi
exit $rc
```

`bats-lint.sh`, from `ST/ref/` (R5): L1 to L5 and L7 are the cells below; L6 is the awk program, which needs a script (SH-GATE-30).

```sh
#!/bin/sh
# bats-lint.sh -- vacuous-test forms in .bats files (SH-TEST-02 to 07). Run from the repo root.
# Output is the violation, one line per finding: "Ln file:line: text" (L5 lists files).
# Exit: 0 clean; 1 a finding; 64 usage; 69 a required tool is missing; 74 the scan failed;
#       78 not a usable git work tree; 79 no .bats files.
set -u
[ "$#" -eq 0 ] || {
    echo "usage: bats-lint.sh (no arguments)" >&2
    exit 64
}
for t in git grep xargs awk sed mktemp; do
    command -v "$t" >/dev/null 2>&1 || {
        echo "bats-lint: '$t' not on PATH" >&2
        exit 69
    }
done
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "bats-lint: not a usable git work tree" >&2
    exit 78
}
list=$(mktemp) || exit 74
out=$(mktemp) || exit 74
err=$(mktemp) || exit 74
trap 'rm -f "$list" "$out" "$err"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
git ls-files -z --cached --others --exclude-standard -- '*.bats' >"$list" || {
    echo "bats-lint: git ls-files failed" >&2
    exit 74
}
[ -s "$list" ] || {
    echo "bats-lint: no .bats files" >&2
    exit 79
}
rc=0
verdict() { # any stderr, or a status above 123, means the scan is not trustworthy
    if [ -s "$err" ]; then
        cat "$err" >&2
        exit 74
    fi
    [ "$1" -le 123 ] || exit 74
    if [ -s "$out" ]; then
        sed "s/^/$2 /" "$out"
        rc=1
    fi
}
scan() { # label, grep arguments
    label=$1
    shift
    xargs -0 -r grep -s -H "$@" -- <"$list" >"$out" 2>"$err"
    verdict $? "$label"
}
scan L1 -n -E -e '^[[:space:]]*![[:space:]]'                          # bare ! statement
scan L2 -n -E -e '\|\|[[:space:]]*(true|:)[[:space:]]*($|[;&|)])'     # || true, || :
scan L3 -n -E -e '^[[:space:]]*(\[\[.*\]\]|\(\(.*\)\))[[:space:]]*$'  # [[ ]] or (( )) statement
scan L4 -n -E -e '(^|[;&|])[[:space:]]*skip([[:space:]]|$)'           # skip statement
scan L5 -L -e bats_require_minimum_version                            # file without the directive
scan L7 -n -E -e '\$\{?status\}?"?[[:space:]]+(-ne|-gt|!=)[[:space:]]+"?0' \
    -e '^[[:space:]]*assert_failure[[:space:]]*($|[;&|])' # inexact failure status
# L6: a run without -N or ! whose test body never reads $status or a bats-assert helper afterwards
# shellcheck disable=SC2016  # single quotes are deliberate: the $ is for awk
xargs -0 -r awk '
  function flush() { if (open != "") print open; open = "" }
  FNR == 1 { flush() }
  /^@test / || /^}/ { flush(); next }
  /^[[:space:]]*run[[:space:]]/ {
    flush()
    if ($0 ~ /^[[:space:]]*run[[:space:]]+(--[a-z-]+[[:space:]]+)*(-[0-9]+|!)[[:space:]]/) next
    open = FILENAME ":" FNR ": " $0; next
  }
  /\$status|\$\{status\}|assert_(success|failure|output|line)|refute_(output|line)/ { open = "" }
  END { flush() }' <"$list" >"$out" 2>"$err"
verdict $? L6
exit $rc
```

`pester-lint.sh`, from `ST/ref/` (R14): P1 and P2 are the cells below; the "file calls `Invoke-Pester` and never names a version" half needs awk.

```sh
#!/bin/sh
# pester-lint.sh -- Pester pin and removed-in-6 forms (SH-TEST-18, 20). Run from the repo root.
# P1 Pester installed or imported without -RequiredVersion, or Invoke-Pester in a file that never names a version.
# P2 constructs removed in Pester 6.0.0 (Assert-MockCalled, Assert-VerifiableMock, Set-ItResult -Pending, It -Focus).
# Output is the violation: "Px file:line: text". Exit: 0 clean; 1 a finding; 64 usage; 69 a required tool is missing;
#       74 the scan failed; 78 not a usable git work tree; 79 no PowerShell, YAML or Taskfile files.
set -u
[ "$#" -eq 0 ] || {
    echo "usage: pester-lint.sh (no arguments)" >&2
    exit 64
}
for t in git grep xargs awk sed mktemp; do
    command -v "$t" >/dev/null 2>&1 || {
        echo "pester-lint: '$t' not on PATH" >&2
        exit 69
    }
done
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "pester-lint: not a usable git work tree" >&2
    exit 78
}
list=$(mktemp) || exit 74
tlist=$(mktemp) || exit 74
out=$(mktemp) || exit 74
err=$(mktemp) || exit 74
trap 'rm -f "$list" "$tlist" "$out" "$out.v" "$err"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.ps1' '*.psm1' >"$list" || {
    echo "pester-lint: git ls-files failed" >&2
    exit 74
}
git ls-files -z --cached --others --exclude-standard -- '*.Tests.ps1' >"$tlist" || {
    echo "pester-lint: git ls-files failed" >&2
    exit 74
}
[ -s "$list" ] || {
    echo "pester-lint: no files in scope" >&2
    exit 79
}
rc=0
verdict() {
    if [ -s "$err" ]; then
        cat "$err" >&2
        exit 74
    fi
    [ "$1" -le 123 ] || exit 74
    if [ -s "$out" ]; then
        sed "s/^/$2 /" "$out"
        rc=1
    fi
}
xargs -0 -r grep -s -H -n -E -e '(Install-Module|Import-Module)[[:space:]]+(-Name[[:space:]]+)?Pester' -- <"$list" >"$out" 2>"$err"
st=$?
grep -v -e '-RequiredVersion' "$out" >"$out.v"
mv "$out.v" "$out"
verdict "$st" P1
xargs -0 -r awk '
  function flush() { if (file != "" && inv && !req) print file ":" inv ": Invoke-Pester, no RequiredVersion in this file" }
  FNR == 1 { flush(); file = FILENAME; inv = 0; req = 0 }
  /Invoke-Pester/ && !inv { inv = FNR }
  /RequiredVersion/ { req = 1 }
  END { flush() }' <"$list" >"$out" 2>"$err"
verdict $? P1
xargs -0 -r grep -s -H -n -E -e 'Assert-MockCalled|Assert-VerifiableMock|Set-ItResult[[:space:]]+-Pending|(^|[[:space:]])It[[:space:]].*-Focus' -- <"$tlist" >"$out" 2>"$err"
verdict $? P2
exit $rc
```

`Invoke-PesterGate.ps1`, from `ST/ref/` (R11, R12). PowerShell 5.1-safe syntax.

```powershell
# Invoke-PesterGate.ps1 -Path P -RequiredVersion V [-MaxSkipped N] [-ModuleBase DIR]
# CI census gate for Pester: exit 1 when anything failed OR the run proved nothing. PowerShell 5.1-safe syntax.
#   red: failed tests/containers/blocks; zero tests discovered; zero passed; skipped > MaxSkipped; not-run; inconclusive.
#   Run.Exit = $true: Invoke-Pester itself exits (code = failures) only on failure; a vacuous run returns here.
param(
  [Parameter(Mandatory)][string]$Path,
  [Parameter(Mandatory)][string]$RequiredVersion,
  [int]$MaxSkipped = 0,
  [string]$ModuleBase
)
$ErrorActionPreference = 'Stop'
if ($ModuleBase) { Import-Module (Join-Path (Join-Path $ModuleBase $RequiredVersion) 'Pester.psd1') -Force }
else { Import-Module Pester -RequiredVersion $RequiredVersion -Force }
$c = New-PesterConfiguration
$c.Run.Path = $Path
$c.Run.PassThru = $true
$c.Run.Exit = $true
$c.Output.Verbosity = 'Minimal'
$r = Invoke-Pester -Configuration $c
$why = @()
if ($r.FailedCount -gt 0 -or $r.FailedBlocksCount -gt 0 -or $r.FailedContainersCount -gt 0) { $why += 'failed' }
if ($r.TotalCount -eq 0) { $why += 'zero tests discovered' } elseif ($r.PassedCount -eq 0) { $why += 'zero tests passed' }
if ($r.SkippedCount -gt $MaxSkipped) { $why += ('skipped={0} over budget {1}' -f $r.SkippedCount, $MaxSkipped) }
if ($r.NotRunCount -gt 0) { $why += ('notrun={0}' -f $r.NotRunCount) }
if ($r.InconclusiveCount -gt 0) { $why += ('inconclusive={0}' -f $r.InconclusiveCount) }
if ($why.Count -gt 0) { 'GATE RED: ' + ($why -join '; '); exit 1 }
'GATE GREEN: total={0} passed={1} skipped={2}' -f $r.TotalCount, $r.PassedCount, $r.SkippedCount
exit 0
```

### A. Caught by a version assertion

**SH-TEST-01 · MUST.** Vendor bats-core 1.14.0, bats-support 0.3.0 and bats-assert 2.2.4 by tag (a submodule, or `git clone --branch v1.14.0`) and make the CI step assert that `bats --version` equals the pin. Never `apt install bats`, never the `bats` found on PATH.
- *Why.* Distro bats lags and each old version is vacuous in its own way. Ubuntu 22.04 ships 1.2.1, on which `run ! true` and `run -1 true` both pass (R2); Debian 12 1.8.2, Ubuntu 24.04 1.10.0, Debian 13 1.11.1 (R1), Ubuntu 26.04 1.13.0 ([dive] F5, package page). Below 1.14.0 an empty suite exits 0 (`1..0`) and a function's own `set -e` is ignored on bash 4.0 and later (R8). The two fleet repos already pin different versions (www-setup v1.13.0, setup-grimoire v1.14.0) and neither asserts the version. bats-support 0.3.0 (2022-03-04) and bats-assert 2.2.4 (2025-10-14) are the current tags ([dive] F5).
- *Verify.*
  ```sh
  # cell PIN
  [ "$(external/bats-core/bin/bats --version)" = "Bats 1.14.0" ] || echo "bats pin: not 1.14.0"
  ```
- *Watched red.* Yes (R1): the cell prints on 1.11.1 and 1.13.0 and is silent on 1.14.0.
- *Scope.* Every bats suite, any script kind. bats itself needs bash 3.2 or later.

**SH-TEST-02 · MUST.** The first statement of every `.bats` file is `bats_require_minimum_version 1.5.0` (higher when the file uses a newer flag).
- *Why.* Below 1.5.0 the flags of `run` are a command name: `run ! true` and `run -1 true` ran the commands `!` and `-1` and both tests were `ok` on bats 1.2.1 (R2). With the directive 1.2.1 and 1.6.1 fail loudly (`bats_require_minimum_version: command not found`, exit 1; the function is 1.7.0 and later). From 1.11.1 a missing directive only prints BW02 on stderr and exits 0, which SH-TEST-09 turns red. Fleet: 4 of 10 files lack it.
- *Verify.*
  ```sh
  # cell L5
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -L -e bats_require_minimum_version --
  ```
- *Watched red.* Yes (R4): prints `t/V15-nodirective.bats` on the plant, silent on the twin; fleet run in R5.
- *Scope.* Every `.bats` file.

### B. Caught by ShellCheck in the gate, by a grep, or by `bats-lint.sh`

**SH-TEST-03 · MUST.** Never a bare `! cmd` statement in a test body: write `run ! cmd`, `run -N cmd`, or `! cmd || false`.
- *Why.* bash does not trip errexit for a negated command (bash manual, `set -e`: "or if the command's return status is being inverted with `!`"); only the last statement's status counts. A mid-test `! grep -q x file` asserts nothing: planted V01 is green on every bats and bash pair ([dive] F2, R6). Fleet: `www-setup@a251c3631047:tests/install/env-knobs.bats:60` is vacuous today (the obsolete bootstrap command could reappear).
- *Verify.* The gate reports it at default severity once `.bats` is in scope (SH-GATE-09, SH-GATE-11); the focused cell and the grep that lists every bare `!` (a last-statement `!` works and is a false positive to read; use `run !` anyway):
  ```sh
  # cell SC2314
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r shellcheck -f gcc -i SC2314
  # cell L1
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -H -n -E -e '^[[:space:]]*![[:space:]]' --
  ```
- *Watched red.* Yes (R4, R15): plant V01 prints SC2314 (error, ShellCheck 0.11.0) and the L1 line, twin silent. On the fleet SC2314 reports 5 sites in www-setup (1 error at `env-knobs.bats:60`, 4 notes), 0 in setup-grimoire.
- *Scope.* Every `.bats` file. ShellCheck 0.9.0 to 0.11.0 parse `.bats` ([shell-gate.md](shell-gate.md) C6).

**SH-TEST-04 · MUST.** In a suite that runs on bash below 4.1 (the default for any script with a 3.2 floor), end a `[[ ]]` or `(( ))` assertion with `|| false`, or use `[ ]` or an assertion helper.
- *Why.* bash 3.2 and 4.0 do not abort on a failing `[[` or `((` in the middle of a function; 4.1 and later do (bash CHANGES, 4.1-alpha). Measured threshold on bats 1.14.0: 3.2 and 4.0 stay green, 4.1, 4.2, 4.4, 5.0, 5.3 go red (R8). macOS `/bin/bash` is 3.2.57. Fleet: `www-setup@a251c3631047:tests/install/dist.bats:160` is vacuous on 3.2 (latent: the macOS leg lists suites explicitly and drops `dist.bats`).
- *Verify.*
  ```sh
  # cell L3
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(\[\[.*\]\]|\(\(.*\)\))[[:space:]]*$' --
  ```
  Behavioural proof: the same suite on `bash:3.2` and `bash:5.3` (SH-TEST-12).
- *Watched red.* Yes (R4, R8): plant V02, V03 print, twin silent.
- *Scope.* Assertion statements only. `[[ ]]` as a condition or as the last statement of a test is fine (map conflict 11). A suite pinned to bash 4.1 or later is exempt.

**SH-TEST-05 · MUST.** No `|| true` or `|| :` on an assertion or on the command under test. Cleanup in `setup` or `teardown` may use it with a same-line reason.
- *Why.* It converts the statement into a no-op (V06, V13 green on every pair, [dive] F2). The reason clause keeps the map's "not a defect" case.
- *Verify.*
  ```sh
  # cell L2
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -H -n -E -e '\|\|[[:space:]]*(true|:)[[:space:]]*($|[;&|)])' --
  ```
- *Watched red.* Yes (R4): V06 and V13 print; the twin, which carries `kill "$PID" 2>/dev/null || true  # cleanup: the process may already be gone`, is silent.
- *Scope.* Every `.bats` file. Fleet: 0 hits.

**SH-TEST-06 · MUST.** Every `run` is followed, before the next `run` or the end of the test, by its status or output assertion: `run -N`, `run !`, `[ "$status" -eq N ]`, `assert_success`, `assert_failure N`, `assert_output` or `refute_output`.
- *Why.* `run` always succeeds, so a `run` whose result is never read asserts nothing (V05, green on every pair).
- *Verify.* `sh checks/bats-lint.sh` prints `L6 file:line: text` for each statusless `run` (the awk program above). A `run` inside a helper function whose callers check `$status` is a reading exemption: fleet `www-setup@a251c3631047:tests/install/dist.bats:72` (`run_gen`, checked by every caller) is the one false positive in 92 `run` statements.
- *Watched red.* Yes (R5): plant V05 prints, twin silent; on the fleet 1 candidate in www-setup (the helper), 0 in setup-grimoire.
- *Scope.* Every `.bats` file. Both fleet repos assert with `[ "$status" -eq N ]` and `assert_*` rather than `run -N`; either is accepted.

**SH-TEST-07 · SHOULD.** An expected failure pins the exact code: `run -N`, `[ "$status" -eq N ]` or `assert_failure N`. Never `-ne 0`, `-gt 0`, `!= 0` or a bare `assert_failure`.
- *Why.* 126 and 127 satisfy them: a tool that is not installed passes the test. Planted V11 and V14 are green on bats 1.11.1, 1.13.0 and 1.14.0, and bats only warns (BW01, stderr, exit 0), which SH-TEST-09 turns red (R6).
- *Verify.*
  ```sh
  # cell L7
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -H -n -E -e '\$\{?status\}?"?[[:space:]]+(-ne|-gt|!=)[[:space:]]+"?0' -e '^[[:space:]]*assert_failure[[:space:]]*($|[;&|])' --
  ```
- *Watched red.* Yes (R4, R6): V11 and V14 print, twin silent; `run -2 nosuchtool-xyz --bogus` goes red with `expected exit code 2, got 127`. Fleet: 5 `[ "$status" -ne 0 ]` negative controls (`elvish/install-elvish.bats:244`, `env-knobs.bats:321,364`, `fish/install-fish.bats:241`, `nu/install-nu.bats:247`), each paired with a passing twin, which is why this is SHOULD.
- *Scope.* Every `.bats` file. Use the documented code from the script's exit table (SH-ERR-25).

### C. Caught only by reading

**SH-TEST-08 · SHOULD.** Make every assertion unconditional: not on the left of `&&`, not inside a loop over a list that can be empty (count the iterations and assert the count is above 0), not in the middle of `teardown` (end it with the assertion or `|| return 1` after each check).
- *Why.* Planted V04 (`[ a = b ] && echo x`), V08 (empty loop) and V12 (failing command mid-`teardown`) are green on every bats and bash pair; ShellCheck sees none of them and no grep separates them from legal code ([dive] F2). The bats guide states that failing commands in `teardown` do not fail the test and only the last status counts.
- *Verify.* Reading heuristic: for each `&&`, `for`, `while` and each `teardown`, ask whether a failing assertion there changes the test's exit status. No mechanical check exists and none was watched red; the vacuity itself was ([dive] F2).
- *Scope.* Every `.bats` file.

### D. Caught by running the census and the canary

**SH-TEST-09 · MUST.** After every bats run, run the census over the test directory, the TAP file and the stderr file, and run bats with `-r` on the directory (or list the files in one place that the census checks). The census is red on: a static `@test` count that differs from the TAP plan, any `not ok`, any skip outside the leg's budget (SH-TEST-10), any `BWnn:` warning on stderr.
- *Why.* bats exits 0 on every one of these: a directory run without `-r` silently drops the nested files; `ok N ... # skip`; BW01 (a `run` that saw 126 or 127); BW02 (a flag without the directive). Before 1.14.0 an empty suite also exits 0 with `1..0`; 1.14.0 fixes only that case (R3). www-setup's macOS leg lists six suites explicitly (`test-installers.yml:71-77`), so a new `.bats` file runs on Linux and silently not on macOS.
- *Verify.*
  ```sh
  bash external/bats-core/bin/bats --tap -r tests > tap.txt 2> bats.err || rc=$?
  sh ci/bats-census.sh tests tap.txt bats.err
  ```
  The census prints the violation and exits 1.
- *Watched red.* Yes (R3), bats 1.14.0 on bash 5.3:

  ```text
  PLANT nested, no -r             bats-exit=0 census-exit=1 | census: 2 @test on disk but TAP plan is 1
  PLANT skip: tool absent         bats-exit=0 census-exit=1 | ok 1 s # skip nosuch-tool-xyz not installed
  PLANT empty suite (allow-empty) bats-exit=0 census-exit=1 | census: 0 @test on disk but TAP plan is 0
  PLANT BW01 + BW02 on stderr     bats-exit=0 census-exit=1 | BW01: `run`'s command `nosuchtool-xyz --bogus` exited with code 127 ...
  TWIN  nested with -r            bats-exit=0 census-exit=0
  TWIN  indented @test            bats-exit=0 census-exit=0
  TWIN  clean directive suite     bats-exit=0 census-exit=0
  ```

- *Scope.* Every bats leg. A suite that registers tests dynamically (`bats_test_function`) makes the static count differ from the plan: not measured here (O6); add the expected count to the census rather than dropping the check. `bats --count -r DIR` prints the discovered count (2 on the nested plant, 1 without `-r`) and is a candidate for that case.

**SH-TEST-10 · MUST.** Do not write `skip` for an absent interpreter or tool that the suite exists to exercise: the CI leg provisions it and the test fails when it is missing. `skip` is for a platform fact (OS, libc, a GNU-only flag) with its reason in the message, and the leg's `CENSUS_SKIP_OK` regex names exactly those reasons; the default budget is zero.
- *Why.* A skipped test is `ok` and exit 0 on every bats version, so a CI leg that loses fish, nu or elvish goes green. Fleet: 31 skip sites in `www-setup@a251c3631047`, 26 of them `command -v nu|fish|elvish ... || skip "<shell> not installed"` (nu 9, fish 9, elvish 8), 4 `server_have_gnu_wget || skip "GNU wget not installed (BusyBox wget lacks the flags)"` and 1 `timeout(1)`. CI avoids the hole by composing the shells (`ocx run -g all nushell fish elvish -- external/bats-core/bin/bats -r tests/install/`, `test-installers.yml:45`), but nothing fails a developer run without them and no census runs. The 5 platform skips are the legitimate budget on the Alpine leg.
- *Verify.* List every skip statement, then run the census with the leg's budget:
  ```sh
  # cell L4
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -H -n -E -e '(^|[;&|])[[:space:]]*skip([[:space:]]|$)' --
  ```
  ```sh
  CENSUS_SKIP_OK='GNU wget not installed|timeout\(1\) not available' sh ci/bats-census.sh tests tap.txt bats.err
  ```
- *Watched red.* Yes (R3, R4): a skip outside the budget exits 1 (`ok 1 s # skip nosuch-tool-xyz not installed`), a skip inside it exits 0, no budget exits 1; the L4 cell prints the plant's skip, silent on the twin. Exemplar scale: bats-core has 57 skip statements and pyenv 13 (L4 form; the dive's 80 and 22 count the word anywhere), all for platform facts.
- *Scope.* CI legs of every bats suite. Local runs may skip with an install hint. SH-EMIT-32 is the same principle for an emitter's Rust harness and stays CONSIDER (C2).

**SH-TEST-11 · SHOULD.** Keep one canary: a planted always-failing `.bats` outside the censused directory that CI runs through the same wrapper step and requires to exit non-zero.
- *Why.* It proves that the whole path (runner, `shell:` flags, a trailing `| tee`, `continue-on-error`) can still go red. Measured: `bats failing.bats | tee` under GitHub's default `bash -e {0}` exits 0 and under `bash -eo pipefail` exits 1 (R9). bats-core does this for itself (`bats-core@0c92eb4c418d:.github/workflows/tests.yml:124-125`, `bash -c "! bin/bats test/fixtures/bats/failing.bats"`). No fleet repo has one.
- *Verify.*
  ```sh
  ! bash external/bats-core/bin/bats tests-canary/failing.bats
  ```
  The step is green only when the canary fails; the recipe in SH-TEST-12 shows it in place.
- *Watched red.* Yes (R1, R10): the canary exits 1 on bats 1.11.1, 1.13.0, 1.14.0 and on `bash:3.2` and `bash:5.3`, so the `!` step is green.
- *Scope.* Every CI job that runs a bats suite.

### E. Caught by running the suite on a matrix or against the subject

**SH-TEST-12 · MUST.** Run the suite for a bash script on the script's floor image (`bash:3.2` unless its header pins higher, SH-DIAL-25) and on `bash:5.3`, plus one macOS runner leg when the script claims macOS. Capture the bats status and exit with it, then run the census. Add `bash:4.1` only for a rule with a 4.1 threshold, and the `-gnu-` userland variant (pyenv) when the subject needs GNU tools.
- *Why.* The oldest and newest bash disagree on 3 of the 13 vacuous forms (V02, V03, and V10 on bats 1.13.0 and earlier, [dive] F2, R8). The `bash:<ver>` images are Alpine (`ID=alpine`, `sed --version` prints "This is not GNU sed version 4.0"): they give bash-version fidelity and nothing of macOS userland, so BSD claims need the macOS leg (unverified: read only). A bash-4-only script pinned to a CI image needs only the latest. Both fleet repos run a macOS leg (`macos-26`, `macos-latest`) and neither a bash 3.2 or 5.3 container.
- *Verify.* The recipe's commands, run on both images against a correct suite (R10):
  ```yaml
  jobs:
    bats-container:
      name: bats on bash ${{ matrix.bash }}
      runs-on: ubuntu-latest
      strategy:
        fail-fast: false
        matrix:
          bash: ['3.2', '5.3']
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            submodules: recursive
        - name: Assert the pinned bats
          shell: bash
          run: '[ "$(docker run --rm -v "$PWD:/w" -w /w "bash:${{ matrix.bash }}" bash external/bats-core/bin/bats --version)" = "Bats 1.14.0" ]'
        - name: Run the suite in the bash image
          shell: bash
          run: |
            docker run --rm -v "$PWD:/w" -w /w "bash:${{ matrix.bash }}" \
              bash external/bats-core/bin/bats --tap -r tests > tap.txt 2> bats.err || rc=$?
            cat tap.txt bats.err
            exit "${rc:-0}"
        - name: Canary (a planted failing suite must be red through the same wrapper)
          shell: bash
          run: '! docker run --rm -v "$PWD:/w" -w /w "bash:${{ matrix.bash }}" bash external/bats-core/bin/bats tests-canary/failing.bats'
        - name: Census
          shell: bash
          run: sh ci/bats-census.sh tests tap.txt bats.err
    bats-macos:
      name: bats on macOS /bin/bash 3.2     # unverified: read only (no macOS host)
      runs-on: macos-26
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            submodules: recursive
        - name: Run the suite under the stock bash
          shell: bash
          run: |
            /bin/bash external/bats-core/bin/bats --tap -r tests > tap.txt 2> bats.err || rc=$?
            cat tap.txt bats.err
            exit "${rc:-0}"
        - name: Census (BSD-userland skips are listed here, not in the tests)
          shell: bash
          env:
            CENSUS_SKIP_OK: 'only on Linux'
          run: sh ci/bats-census.sh tests tap.txt bats.err
  ```
- *Watched red.* Yes for the Linux commands (R10: pin check exit 0, suite and census exit 0 on `bash:3.2` and `bash:5.3`; YAML parses; the `!` canary step is green); the redundancy proof is R8 (V02, V03, V10 differ between 3.2 and 5.3). The macOS leg was not run: unverified: read only. bats-core tests `bash:{3.2, 4.0 to 4.4, 5.0, 5.1, rc}` the same way (`bats-core@0c92eb4c418d:.github/workflows/tests.yml:199-217`), pyenv `3.2.57` and `4.1.17` with and without GNU tools (`pyenv@d28b750767d4:Makefile:1-2`).
- *Scope.* Bash scripts that may run on macOS or on a 3.2 floor (installer, bootstrap, dev tooling, sourced libraries driven through a script). bats on 5.3 is outside the project's support matrix (lists up to 5.2) and passed here ([dive] F1).

**SH-TEST-13 · MUST.** Run a `#!/bin/sh` script under test under every interpreter of SH-DIAL-04 by passing the interpreter as data: `read -r -a sut <<<"$SUT_SH"` then `run -0 "${sut[@]}" "$SCRIPT" ...`. A distro-container matrix is an accepted equivalent when each container's `/bin/sh` is a SH-DIAL-04 member and the leg's name records which (Alpine 3.22 is busybox ash 1.37, Ubuntu is dash, Fedora and macOS are bash in POSIX mode).
- *Why.* A `[[ ]]` under `#!/bin/sh` is accepted by busybox ash, mksh, ksh93u+m, yash and bash and rejected only by dash 0.5.12 and posh 0.14.1 (R7); a matrix of busybox plus bash misses it. A quoted `"$SUT_SH"` fails with exit 127 for `busybox ash` (two words). Fleet: www-setup's `verify-distros.yml` runs the bats suite inside `alpine:3.20`, `fedora:41` and `ubuntu:24.04`, which exercises ash, bash-posix and dash implicitly; setup-grimoire has none.
- *Verify.* The subject-under-test pattern, run per interpreter:
  ```bash
  @test "script under ${SUT_SH:?set SUT_SH}" {
      read -r -a sut <<<"$SUT_SH"
      run -0 "${sut[@]}" "${SUT_SCRIPT:?set SUT_SCRIPT}" x
      [ "$output" = "hit" ]
  }
  ```
- *Watched red.* Yes (R7), bats 1.14.0 under bash 5.2 on `shellzoo:deb12`: plant (`[[ ]]` under `#!/bin/sh`) exits 1 on dash and posh and 0 on busybox ash, mksh, ksh, yash and bash; the twin exits 0 on all seven.
- *Scope.* `#!/bin/sh` scripts (installers, bootstrap, hooks). The list is SH-DIAL-04's: dash 0.5.12-2, busybox ash 1.37, bash 3.2 `--posix`, plus posh when strict POSIX.1-2017 is claimed (C1). macOS `/bin/sh` is bash 3.2 in POSIX mode (unverified: read only).

**SH-TEST-14 · SHOULD.** A script that installs a trap has one signal test in its suite: start it in the background, send TERM, require that it stops within 4 seconds with a non-zero status and that its temp state is gone. Run it through the interpreter loop of SH-TEST-13, on Linux legs.
- *Why.* The static forms (SH-ERR-02, SH-ERR-16) are greps; only a signal proves that the handler ends the shell. `trap cleanup EXIT INT TERM` without an `exit` survives the signal and exits 0 on all 11 interpreters (shell-errexit.md, hand-off in its Verdict item 7: "SH-TEST owns where it runs").
- *Verify.* The `sigprobe.sh` shape (SH-ERR consolidation, `errexit-consolidation/sigprobe.sh`) wrapped in the same test as SH-TEST-13:
  ```bash
  @test "TERM: cleanup runs and the status is not 0 under ${SUT_SH:?set SUT_SH}" {
      read -r -a sut <<<"$SUT_SH"
      run -0 sh "$BATS_TEST_DIRNAME/sigprobe.sh" TERM "${SUT_SCRIPT:?set SUT_SCRIPT}" "${sut[@]}"
  }
  ```
- *Watched red.* Yes (R17), bats 1.14.0 on `shellzoo:deb12`: the handler without `exit` is red (exit 1) under dash, busybox ash, mksh, bash, yash and posh; the canonical `on_exit` plus `trap 'exit 143' TERM` twin is green on all six.
- *Scope.* Installers, CLIs and dev tooling that create temp state. Not on Git Bash: signal statuses differ there (143, 271, 399 variance in the fleet CLI contract; unverified here). macOS: unverified: read only.

**SH-TEST-15 · SHOULD.** A function that is sourced into a test and called under `run` and that needs errexit sets `set -e` itself, or the suite passes `--errexit` (bats 1.14.0 and later). Do not assume either from an older bats run.
- *Why.* bats up to 1.13.0 ignores the function's `set -e` on bash 4.0 and later and honours it on 3.2; 1.14.0 honours it on every bash but still does not stop plain commands under `run` without `--errexit` (R8). A suite validated on bash 5 with bats 1.13 can turn red on 1.14.0: the changelog's "might uncover hidden errors".
- *Verify.* Run the plant on the pinned bats and read the exit codes:

  ```text
  bats 1.13.0: b3.2=1 b4.0=0 b4.2=0 b4.4=0 b5.0=0 b5.2=0 b5.3=0     # 0 = vacuous
  bats 1.14.0: b3.2=1 b4.0=1 b4.2=1 b4.4=1 b5.0=1 b5.2=1 b5.3=1
  ```

- *Watched red.* Yes (R8, re-run today).
- *Scope.* Suites that source a library and call its functions under `run`; a script run as `run script.sh` has its own `set -e` and is unaffected. Whether `--errexit` becomes the default is open upstream: do not rely on either default across a multi-version matrix.

**SH-TEST-16 · CONSIDER.** In-process unit tests of a POSIX library use ShellSpec pinned to a commit and run with `--fail-no-examples` under the SH-DIAL-04 list. Do this only when a subprocess test cannot reach the logic.
- *Why.* It is the only framework that runs inside dash, busybox ash, yash and posh, and it exits 0 on an empty suite by default; a failing example exits 101, not 1. The fleet has no such library and no ShellSpec anywhere, 40 of the 41 exemplars do not use it, its last release is 0.28.1 (2021-01-11), and the dive's measured plant exits 101 on all seven interpreters ([dive] F1, F4; not re-run). shunit2 (v2.1.8, 2020-03-29) adds nothing over it and has no corpus presence.
- *Verify.* `shellspec --fail-no-examples --shell dash spec/` exit codes: plant 101, twin 0, empty suite 101 only with the flag ([dive] verification run 12, not re-run).
- *Watched red.* Yes in the dive, not re-run here.
- *Scope.* POSIX libraries sourced by others. Pin a commit, not "latest".

**SH-TEST-17 · SHOULD.** Installer tests are hermetic: a dunder-prefixed hatch variable, read in one function and undocumented, replaces the download; a localhost HTTPS fixture server with a vendored self-signed certificate replaces the release host; a stub binary records its argv; and each test's `setup` unsets every hatch variable.
- *Why.* The tests then run offline, assert the exact hand-off (`self setup 0.0.0 --no-modify-path`) and cannot be steered by the developer's environment. TLS stays on because the installers enforce `--proto =https`. `/flaky/<n>/` answers 500 for the first n hits so retry behaviour is observable ([dive] F7).
- *Verify.* Reading heuristic. `grep -L` the suites that never unset a hatch:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- '*.bats' | xargs -0 -r grep -L -e 'unset __' --
  ```
  and list the hatch reads in the installer (`grep -H -n -e '__[A-Z_]*TESTING' --` over the installer) to confirm each is read in one function. Not watched red as a check.
- *Watched red.* No (reading heuristic; the convention itself runs green in both fleet repos).
- *Scope.* Installer and bootstrap tests. Fleet evidence: `www-setup@a251c3631047:src/install.sh:593-599` and `install.ps1:662-667`; `tests/install/helpers/server.bash:28,44-49,115-121,162-176`. The two `server.bash` copies have drifted (411 and 207 lines): O5. A hatch that accepts a URL or runs a script would be an injection path in a `curl | sh` installer; the fleet's copies a local file only. SH-INST must bound it.

### F. Pester (caught by the pin grep, the census gate and the AST check)

**SH-TEST-18 · MUST.** Pin Pester with `-RequiredVersion` in every workflow, Taskfile and script that installs or imports it, and name the version in every file that calls `Invoke-Pester`: `Install-Module Pester -RequiredVersion 6.2.0 -SkipPublisherCheck` and `Import-Module Pester -RequiredVersion 6.2.0`. A repo that stays on Pester 5 pins 5.9.1, never 5.7.1. The pin decides the assertion syntax, per file: classic `Should -Be` is valid on 5.7.1 through 6.2.0, `Should-*` only on 6.0.0 and later, and `Should.DisableV5 = $true` only where no classic assertion is left.
- *Why.* `Install-Module Pester -MinimumVersion 5.0` resolves to 6.2.0 today (`-Max 5.99.99` gives 5.9.1, [dive] F8); Pester 5 has been maintenance-only since 2026-07-07 and Pester 6 supports exactly the fleet's two targets (5.1 and 7.4 or later). Windows PowerShell 5.1 ships Pester 3.4.0 in the inbox: an unversioned import can load it and answer a removed command in Pester 3 terms. `Should-Be` on 5.7.1 is `CommandNotFound` (red), and `Should -Be` with `DisableV5` on 6.2.0 is red (`Pester Should -Be syntax is disabled`): the mismatch fails loudly. The fleet's CI log shows `Pester v6.2.0` under the step title "Install Pester (v5)" (R16), and setup-grimoire installs nothing and takes whatever the runner image ships.
- *Verify.* P1: unpinned install or import lines, then files that run Pester without naming a version:
  ```sh
  # cell P1
  git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.ps1' '*.psm1' | xargs -0 -r grep -H -n -E -e '(Install-Module|Import-Module)[[:space:]]+(-Name[[:space:]]+)?Pester' -- | grep -v -e '-RequiredVersion'
  ```
  the second half is `pester-lint.sh` (awk).
- *Watched red.* Yes (R4, R14): plant `ci.yml:7` and a Taskfile that runs `Invoke-Pester` print, twin silent. Fleet: `www-setup@a251c3631047:.github/workflows/test-installers.yml:150` (`-MinimumVersion 5.0`), `:154` (`Import-Module Pester -MinimumVersion 5.0`), `:159` (`Invoke-Pester`, no version in the file), `taskfiles/test.taskfile.yml:40,46`; `setup-grimoire@1259e35b2550:Taskfile.yml:103`.
- *Scope.* All Pester users. Default version 6.2.0 (O2). `#Requires -Modules @{ModuleName='Pester';ModuleVersion='5.0.0'}` in the fleet's six test files is a floor and floats; it is not a pin.

**SH-TEST-19 · MUST.** The CI Pester step is a census gate: `Run.PassThru` and `Run.Exit = $true` with a post-run check that is red on failed tests, containers or blocks, zero tests discovered, zero tests passed, skipped above the leg's budget (`-MaxSkipped`, default 0), not-run, or inconclusive. A bare `Invoke-Pester` elsewhere sets `Run.Exit = $true`.
- *Why.* `Run.Exit` defaults to `False`, so a failing suite exits 0 on pwsh 7.4, 7.6 and Windows PowerShell 5.1; even with it `$true`, a file with no `Describe`, a file whose every `It` is `-Skip`, and on Pester 5 an `-ForEach @()` all exit 0 ([dive] F9; Pester 6 makes the last a discovery error by default). The two compose (R11): `Run.Exit` exits only when something failed, and a pass or a vacuous run returns to the gate. The budget is the same mechanism as SH-TEST-10: www-setup's Windows leg legitimately skips 15 tests (`-Skip:($env:OS -eq 'Windows_NT')`; CI log: `Tests Passed: 23 ... Skipped: 15` on Windows, `38 ... 0` on Ubuntu).
- *Verify.* `Invoke-PesterGate.ps1 -Path tests/install/ps1 -RequiredVersion 6.2.0 -MaxSkipped 15` (Windows) and `-MaxSkipped 0` elsewhere; exit code 1 is red.
- *Watched red.* Yes (R11, R12): on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1 a failing file exits 1 with `Run.Exit`, the skip-only file reaches the census and is red; with the budget on pwsh 7.4 and 7.6.6:

  ```text
  pass-and-skip.Tests.ps1   budget=0 exit=1  GATE RED: skipped=1 over budget 0
  pass-and-skip.Tests.ps1   budget=1 exit=0  GATE GREEN: total=2 passed=1 skipped=1
  skip-only.Tests.ps1       budget=1 exit=1  GATE RED: zero tests passed
  empty.Tests.ps1           budget=0 exit=1  GATE RED: zero tests discovered
  pass.Tests.ps1            budget=0 exit=0  GATE GREEN: total=1 passed=1 skipped=0
  ```

- *Scope.* Every CI Pester run, pwsh 7.6 and Windows PowerShell 5.1 (the script is 5.1-safe). Fleet: both repos set `Run.Exit = $true` (`test-installers.yml:156`; `setup-grimoire@1259e35b2550:Taskfile.yml:100`) and neither runs a census.

**SH-TEST-20 · MUST.** Write no construct that Pester 6.0.0 removed: `Assert-MockCalled`, `Assert-VerifiableMock`, `Set-ItResult -Pending`, `It ... -Focus`. Use `Should -Invoke`, `-InvokeVerifiable`, `-Skipped` or `-Inconclusive`, tags and `Filter`. A `-ForEach` that can be empty carries `-AllowNullOrEmptyForEach` on purpose.
- *Why.* These are the Pester 4 habits that training data is full of. On 6.2.0 they fail loudly (`Assert-MockCalled`: "not recognized" on pwsh 7.4, "could not be loaded" on 7.6.6; `-Pending` and `-Focus`: parameter errors), but on a 5.1 host without an explicit import the inbox Pester 3.4.0 answers `Assert-MockCalled` with an unrelated message ([dive] F8, not re-run).
- *Verify.*
  ```sh
  # cell P2
  git ls-files -z --cached --others --exclude-standard -- '*.Tests.ps1' | xargs -0 -r grep -H -n -E -e 'Assert-MockCalled|Assert-VerifiableMock|Set-ItResult[[:space:]]+-Pending|(^|[[:space:]])It[[:space:]].*-Focus' --
  ```
- *Watched red.* Yes (R4, R14): plant prints 3 lines, twin silent; fleet 0 hits in both repos.
- *Scope.* All `*.Tests.ps1`, any Pester pin of 6.0.0 or later; on a 5.x pin the forms still work, which is why SH-TEST-18 decides the pin first.

**SH-TEST-21 · MUST.** Put nothing at file level or directly inside `Describe` or `Context` except container commands (`Describe`, `Context`, `BeforeAll`, `AfterAll`, `BeforeDiscovery`, and inside bodies `It`, `BeforeEach`, `AfterEach`): setup is `BeforeAll`, generated cases are `BeforeDiscovery`. Each file is self-contained (its own `Import-Module`, its own data).
- *Why.* Code outside `BeforeAll` runs at discovery, for filtered-out files and under `Run.SkipRun` too, and its variables and functions are invisible inside `It` (identical on Pester 5.7.1 and 6.2.0, three hosts, [dive] F10). Pester 6 does not promise cross-file discovery state; the documented break did not reproduce serially.
- *Verify.* `Test-DiscoveryCode.ps1 FILE...` (`ST/ref/`; the dive's AST script, PowerShell 5.1-safe): the output is the violation, exit 1 when any.
- *Watched red.* Yes (R13): the plant prints 4 findings (file-level assignment, `New-Item`, function, `$expected` in a `Describe` body) and exits 1 on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1; the twin exits 0. Run over the fleet's six `.Tests.ps1` files: 0 findings (every file opens with a top-level `BeforeAll`).
- *Scope.* All `*.Tests.ps1`. A path that does not exist exits 1 as a parse error (fails closed).

**SH-TEST-22 · SHOULD.** The host that runs the script under test must be the host it runs on in production. Run Pester itself on pwsh 7.6 (PS-COMPAT-01); when the script under test is 5.1-bound, pass the child host as a parameter (`powershell.exe` or `pwsh`) or keep a fixture-free 5.1 smoke (PS-COMPAT-05, PS-GATE-08). Import the pinned Pester by `-RequiredVersion` wherever Pester does run on 5.1.
- *Why.* Pester 6.2.0 behaved identically in 20 cases on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1 ([dive] F8), so a Pester host matrix tests Pester, not the installer. Both fleet suites hard-code `& pwsh -NoProfile -File $InstallPs1`; www-setup adds a real `powershell.exe` smoke (`test-installers.yml:166-188`) because install.ps1 is 5.1-bound, and setup-grimoire's `action.yml:64` runs install.ps1 under `pwsh`, so its child host is already right.
- *Verify.* Reading heuristic: `grep -H -n -e '& pwsh' -e 'powershell.exe' --` over `*.Tests.ps1` and the workflow, then compare each hit with the host named by the script's `#Requires` line or its caller. Not watched red.
- *Watched red.* No (reading heuristic).
- *Scope.* PowerShell scripts under test whose production host differs from 7.6.

### Dive ID map

The dive numbered its candidates 01 to 25; this document has 22 rules.

| This document | Dive candidates |
|---|---|
| 01 | 01, 10 (empty suite), 17 (library pins) |
| 02 | 02 |
| 03, 04, 05 | 03, 04, 06 |
| 06, 07 | 05 (split: status read; exact code) |
| 08 | 12, and V04, V08 from F2 |
| 09 | 09, 10, 08 (census half) |
| 10 | 08 (skip policy) |
| 11 | 13 |
| 12, 13 | 14, 15 |
| 14 | new (SH-ERR hand-off) |
| 15 | 11 |
| 16 | 16 |
| 17 | 18 |
| 18 | 19, 21 |
| 19 | 20, 22 |
| 20 | 23 |
| 21 | 24 |
| 22 | 25 |
| dropped | 07 (pointer to SH-ERR-01) |

### Verification runs of this consolidation (trimmed)

```text
## R1 pin, canary, distro packages (DV/pin-and-canary.sh, apt-cache policy bats)
pin Bats 1.14.0 bats-1.11.1  reports "Bats 1.11.1" -> check exit 1
pin Bats 1.14.0 bats-1.13.0  reports "Bats 1.13.0" -> check exit 1
pin Bats 1.14.0 bats-1.14.0  reports "Bats 1.14.0" -> check exit 0
canary bats-1.11.1 / 1.13.0 / 1.14.0 failing.bats -> suite exit 1
apt candidate: ubuntu:22.04 1.2.1-3build1 | shellzoo:deb12 1.8.2-1 | ubuntu:24.04 1.10.0-1 | shellzoo:deb13 1.11.1-1

## R2 the version directive (ST/e2: run ! true and run -1 true, asserted command succeeds so both must go red)
bats 1.2.1  no directive -> exit 0  ok 1 / ok 2                               # vacuous
bats 1.2.1  directive    -> exit 1  bats_require_minimum_version: command not found
bats 1.6.1  no directive -> exit 1  not ok 1 / not ok 2                        # flags work from 1.5.0
bats 1.6.1  directive    -> exit 1  failed with status 127                     # function is 1.7.0+
bats 1.11.1 / 1.13.0 / 1.14.0 no directive, passing tests -> exit 0 + stderr "BW02: Using flags on `run` requires at least BATS_VERSION=1.5.0"

## R3 census (ST/e3, bats 1.14.0 on bash:5.3)  see SH-TEST-09 and SH-TEST-10
PLANT skip outside budget    census-exit=1   PLANT platform skip, no budget census-exit=1   TWIN skip allowed by budget census-exit=0
indented @test: bats plan 1; DV census (^@test ) -> "0 @test on disk but TAP plan is 1" exit 1; ST census exit 0
bats --count -r plant-nested -> 2 ; bats --count plant-nested -> 1

## R4 the cells exactly as written here (ST/e6), plant repo then twin repo
L1 1 hit (V01)  L2 2 (V06 V13)  L3 2 (V02 V03)  L4 1 (V09)  L5 1 (V15)  L7 2 (V11 V14)  P1 1  P2 3      # twin: every cell 0 hits (twin carries "|| true  # cleanup: ..." and run -127)
SC2314 focused cell: plant t/V01.bats:10:5: error: In Bats, ! does not cause a test failure. [SC2314]; twin silent

## R5 bats-lint.sh (ST/ref): plant L1=1 L2=2 L3=2 L4=1 L5=1 L6=1 L7=2 exit 1; twin exit 0
faults: not a repo 78, no .bats files 79, an argument 64, no tools on PATH 69
fleet (read-only): www-setup L1=7 L3=1 L4=31 L5=1 L6=1 L7=5 | setup-grimoire L5=3

## R6 bare assert_failure (ST/e4/rt): bats 1.11.1 / 1.13.0 / 1.14.0, run nosuchtool-xyz --bogus; assert_failure
exit 0, stdout "ok 1", stderr "BW01: `run`'s command ... exited with code 127, indicating 'Command not found'"
twin run -2 nosuchtool-xyz --bogus -> exit 1 "expected exit code 2, got 127"

## R7 POSIX loop (DV/sut-matrix.sh, re-run): plant [[ ]] under #!/bin/sh
dash exit 1 | busybox ash 0 | mksh 0 | ksh 0 | yash 0 | posh exit 1 | bash 0        twin: all 0

## R8 thresholds (re-run)
bash 3.2: V02=exit0 V03=exit0 | 4.0: exit0 exit0 | 4.1 4.2 4.4 5.0 5.3: exit1 exit1
bats 1.13.0 V10: b3.2=1 b4.0=0 ... b5.3=0 | bats 1.14.0 V10: all 1

## R9 CI plumbing (bats-1.14.0 canary/failing.bats | tee, bash:5.3)
bash -e            -> step exit 0       bash -eo pipefail -> step exit 1

## R10 recipe (ST/e7, ST/ref/bats-matrix.yml): on bash:3.2 and bash:5.3
pin check exit 0 | suite exit 0 | census exit 0 | YAML parses (jobs bats-container, bats-macos) | canary: suite exit 1, "! cmd" step exit 0

## R11 Run.Exit with the census (ST/e1/gate-exit.ps1, Pester 6.2.0), pwsh 7.4 / 7.6.6 / Windows PowerShell 5.1
pester5.Tests.ps1 (fails), Run.Exit=true -> exit 1, nothing after Invoke-Pester runs (all three)
skip-only.Tests.ps1, Run.Exit=true -> REACHED, "GATE RED: zero passed; skipped/notrun/inconclusive" exit 1 (all three)
pass.Tests.ps1, Run.Exit=true -> REACHED, GATE GREEN exit 0 (all three)

## R12 Invoke-PesterGate.ps1 with a skip budget (pwsh 7.4 and 7.6.6): see SH-TEST-19

## R13 Test-DiscoveryCode.ps1 (DV, re-run): plant 4 findings exit 1 on 7.4 / 7.6.6 / 5.1; twin exit 0; fleet 6 .Tests.ps1 files: no findings

## R14 pester-lint.sh (ST/ref): plant P1 x2 + P2 x3 exit 1; twin exit 0
fleet: www-setup P1 x5 (test-installers.yml:150,154,159; test.taskfile.yml:40,46) | setup-grimoire P1 x1 (Taskfile.yml:103)

## R15 ShellCheck 0.11.0 over the fleet's .bats files (git ls-files '*.bats')
www-setup: SC2314 x5 (env-knobs.bats:60 error; :61 :311, exit-codes.bats:115, print-path.bats:64 notes) | setup-grimoire: SC2030 x2, SC2031 x2

## R16 fleet CI log (gh run view 35122540356, www-setup@a251c3631047, 2026-09-16, read-only)
Pester (windows-latest / pwsh)  Pester v6.2.0 ... Tests Passed: 23, Failed: 0, Skipped: 15
Pester (ubuntu-latest / pwsh)   Pester v6.2.0 ... Tests Passed: 38, Failed: 0, Skipped: 0
step title in test-installers.yml: "Install Pester (v5)"

## R17 signal test through the bats interpreter loop (ST/e10, bats 1.14.0, shellzoo:deb12, sigprobe.sh TERM)
plant (trap cleanup EXIT INT TERM, no exit): dash 1, busybox ash 1, mksh 1, bash 1, yash 1, posh 1
twin (on_exit + trap 'exit 143' TERM):        dash 0, busybox ash 0, mksh 0, bash 0, yash 0, posh 0

## R18 exemplar counts (read-only, shell-audit/scratch/exemplar-shas.md SHAs)
bare "!" lines: pyenv 0 (47 .bats), rbenv 0 (23), bats-core 11 (233; fixtures of the quirk)
run -N: pyenv 4, rbenv 0, bats-core 247 | run !: bats-core 7 | skip statements (L4 form): pyenv 13, rbenv 0, bats-core 57
```

Not watched red, and why: the macOS leg (no host; unverified: read only); SH-TEST-08 and SH-TEST-17's hatch read and SH-TEST-22 (reading heuristics); SH-TEST-16 (not re-run, dive only); dynamic `bats_test_function` against the census (a first probe errored on a duplicate-name error in the fixture, so it is not a measurement); the Windows Git Bash 5.3.15 of the GitHub runner (the host has 5.2.15); `Invoke-PesterGate.ps1` with a budget on Windows PowerShell 5.1 (the composition without a budget ran there, R11).

## Applied to the fleet and exemplars

The fleet's tested surface is small and concentrated: 10 `.bats` files (1,987 lines by `wc -l`, 140 `@test`; www-setup 7 files, setup-grimoire 3) and 6 `.Tests.ps1` files, all for `install.sh` and `install.ps1` ([dive] F11; [fleet] puts the count at 1,997 lines). ocx has no bats or Pester suite: its multi-shell emitter is tested by Rust tests that run the target interpreters (SH-EMIT-04, SH-EMIT-32). No ShellSpec, shunit2 or kcov anywhere.

### Satisfied today

| Rule | Evidence |
|---|---|
| SH-TEST-05 | 0 `\|\| true` in 10 files (R5) |
| SH-TEST-06 | 1 candidate in 92 `run` statements, a helper whose callers check (`www-setup@a251c3631047:tests/install/dist.bats:72`); setup-grimoire asserts with `assert_output` and `assert_success` on every `run` |
| SH-TEST-10 (partly) | setup-grimoire has 0 skips; www-setup composes nu, fish and elvish in CI so the 26 interpreter skips are dead there |
| SH-TEST-12 (partly) | macOS leg in both (`www-setup@a251c3631047:.github/workflows/test-installers.yml:57-78` on `macos-26`, `setup-grimoire@1259e35b2550:.github/workflows/test.yml:87-103` on `macos-latest`), commented as the only leg that runs bash 3.2 and BSD `find`; `www-setup/.claude/rules/testing-bash.md:203-210` states the 3.2 denylist |
| SH-TEST-13 (equivalent) | `www-setup@a251c3631047:.github/workflows/verify-distros.yml:33-60` runs the suite inside alpine:3.20, fedora:41 and ubuntu:24.04, so `run sh install.sh` meets busybox ash, bash in POSIX mode and dash |
| SH-TEST-17 | both repos: `__OCX_TESTING_INSTALL_BINARY` (`www-setup@a251c3631047:src/install.sh:593-599`, `install.ps1:662-667`), `GRIM_RELEASE_BASE_URL` family (`setup-grimoire@1259e35b2550:tests/install/exit-codes.bats:34-36`), HTTPS fixture server, argv-recording stub |
| SH-TEST-19 (half) | both repos set `Run.Exit = $true` |
| SH-TEST-20 | 0 removed constructs in both repos (R14) |
| SH-TEST-21 | 0 findings over 6 files (R13) |
| SH-TEST-22 | www-setup: `powershell.exe` smoke (`test-installers.yml:166-188`); setup-grimoire: `action.yml:64` runs install.ps1 under `pwsh`, the child host the Pester suite uses |
| exemplars | bats-core: failing-suite canary (`bats-core@0c92eb4c418d:.github/workflows/tests.yml:124-125`), bash `3.2` to `rc` matrix on `bash:<tag>` images (`:199-217`), 247 `run -N` and 7 `run !`; pyenv: bash 3.2.57 and 4.1.17 with and without GNU tools (`pyenv@d28b750767d4:Makefile:1-2`), 0 bare `!` in 47 files; rbenv: 0 bare `!` in 23 files, pins v1.10.0 (`rbenv@07e9b1e297a5:.github/workflows/ci.yml:15`) |

### Violated

| Rule | Where | Evidence |
|---|---|---|
| SH-TEST-01 | `www-setup@a251c3631047` external/bats-core v1.13.0 (`3bca150ec861`); `setup-grimoire@1259e35b2550` v1.14.0 (`eb7f42f8d608`) | two pins; neither CI step asserts `bats --version`. pyenv has two entry points with two pins too (`Makefile:1` v1.10.0, workflow `bats/bin/bats`) |
| SH-TEST-02 | www-setup `tests/install/exit-codes.bats`; setup-grimoire `tests/install/install.bats`, `exit-codes.bats`, `regressions.bats` | 4 of 10 files (R5) |
| SH-TEST-03 | `www-setup@a251c3631047:tests/install/env-knobs.bats:60` (vacuous), `:61`, `:311`, `exit-codes.bats:115`, `print-path.bats:64` | SC2314: 1 error and 4 notes (R15); the audit's gate runs `git ls-files '*.sh'`, so none of it ever ran through ShellCheck ([fleet] gate gaps) |
| SH-TEST-04 | `www-setup@a251c3631047:tests/install/dist.bats:160` | `[[ "$output" != *"0.11.0"* ]]` mid-test, vacuous on 3.2 and 4.0; latent because the macOS leg drops `dist.bats` (`test-installers.yml:71-77`) |
| SH-TEST-07 | `www-setup@a251c3631047:tests/install/elvish/install-elvish.bats:244`, `env-knobs.bats:321,364`, `fish/install-fish.bats:241`, `nu/install-nu.bats:247` | five `-ne 0` negative controls (SHOULD; each has a passing twin) |
| SH-TEST-09 | both repos | no census, no stderr capture; www-setup's macOS leg lists suites by hand (`test-installers.yml:71-77`); `bats ... -r tests/install/` is the only `-r` |
| SH-TEST-10 | `www-setup@a251c3631047:tests/install/{fish,nu,elvish}/*.bats` | 26 `command -v <shell> ... \|\| skip "<shell> not installed"`, plus 4 GNU wget and 1 `timeout(1)` skips with no budget |
| SH-TEST-11 | both repos | no canary |
| SH-TEST-12 | both repos | no `bash:3.2` or `bash:5.3` container leg; Linux legs run ubuntu's own bash (5.2.21 on 24.04, 5.3.9 on 26.04) and macOS is the only 3.2 signal |
| SH-TEST-13 | setup-grimoire; posh and bash 3.2 `--posix` on Linux in both | no interpreter loop (www-setup has the distro equivalent) |
| SH-TEST-14 | both repos | no signal test, though 6 fleet files install a `trap` ([shell-errexit.md](shell-errexit.md) fleet table) |
| SH-TEST-18 | `www-setup@a251c3631047:.github/workflows/test-installers.yml:150,154,159`, `taskfiles/test.taskfile.yml:40,46`; `setup-grimoire@1259e35b2550:Taskfile.yml:103`; rule file `www-setup/.claude/rules/testing-pwsh.md` says "Use Pester v5" | CI runs 6.2.0 (R16); the laptop toolchain has 5.7.1; setup-grimoire takes the runner image's copy |
| SH-TEST-19 | both repos | `Run.Exit` without a census; the Windows leg's 15 skips need a `-MaxSkipped 15` budget |
| exemplars | bats-core `11` bare `!` lines in 233 files (fixtures of the quirk itself); rbenv 0 `run -N` (asserts through its own `assert_success`, 188 uses); no exemplar pins Pester; pyenv's two bats pins | none of these is a rule violation in context |

### New commitments once the rules ship (reported here, not fixed: owner Q6)

- **www-setup and setup-grimoire (installer tests).** One bats pin (1.14.0) and a `bats --version` assertion; `bats_require_minimum_version 1.5.0` in four files; add the `.bats` files to the gate; fix `env-knobs.bats:60` with `run ! grep -q ...`; the census, the canary and a stderr capture in `test-installers.yml` and `test.yml`; replace the 26 absent-shell skips by failure and move the 5 platform skips into a `CENSUS_SKIP_OK` regex on the Alpine leg; one Pester pin (`-RequiredVersion 6.2.0`) everywhere, `Invoke-PesterGate.ps1` with `-MaxSkipped 15` on Windows and 0 elsewhere, and the rule file's "Pester v5" sentence corrected; a signal test for every installer that installs a `trap`.
- **ocx (emitter).** None from this family: the emitter's tests are SH-EMIT's. SH-TEST-10's principle is already met by `assert_every_present_interpreter_ran` (`ocx` `shell.rs:1574-1624`, cited in SH-EMIT-32).
- **grimoire and the fleet `quality-bash.md` copies.** The asserted "ShellSpec when you need mocking" (`quality-bash.md:117-123`) is replaced by SH-TEST-16 when the shell set is installed (map X6).
- **External adopters.** The shell set ships `checks/bats-lint.sh`, `checks/bats-census.sh`, `checks/pester-lint.sh`, `checks/Invoke-PesterGate.ps1` and `checks/Test-DiscoveryCode.ps1` under the SH-GATE-31 exit map (default yes, O4), and the CI recipe as a reference file.

## AI-agent failure modes

Ranked by how often it bites, from fleet counts first and exemplar and measured priors second. Each row names its mechanical check.

| Rank | Failure | Bite evidence | Mechanical check |
|---|---|---|---|
| 1 | Writes `command -v tool \|\| skip "tool not installed"` (or sets `BATS_ALLOW_EMPTY_SUITE=1`) instead of failing; the suite is green with the tool missing | 26 absent-interpreter skips in www-setup | cell L4 plus the census budget (SH-TEST-10, 09) |
| 2 | Asserts with a bare `! grep -q ...` or `! [ -f x ]` | 7 bare `!` lines in 3 of 7 www-setup suites, 1 vacuous | SC2314 in the gate, cell L1 (SH-TEST-03) |
| 3 | `run cmd` then `[ "$status" -ne 0 ]` or a bare `assert_failure` for an expected error; a missing tool passes | 5 sites; V11 and V14 green on 1.11.1 to 1.14.0 | cell L7 and the BW01 check in the census (SH-TEST-07, 09) |
| 4 | Floats the tool: `apt install bats`, `Install-Module Pester -MinimumVersion 5.0`, or no install at all | 6 sites in 2 repos; Ubuntu 22.04's 1.2.1 passes `run ! true` | cell PIN, cell P1, `pester-lint.sh` (SH-TEST-01, 18) |
| 5 | Leaves out `bats_require_minimum_version`, or assumes `--allow-empty-suite` and `--errexit` exist on the distro's bats | 4 of 10 files | cell L5, cell PIN (SH-TEST-02, 01) |
| 6 | Runs `bats tests/` without `-r`, or hand-lists suites per leg, and reports "all tests pass" | www-setup's macOS leg; nested plant exits 0 | the census plan/disk comparison (SH-TEST-09) |
| 7 | Writes `[[ ... ]]` or `(( ... ))` as the assertion in a suite that also runs on macOS bash 3.2 | 1 site, latent | cell L3 plus the `bash:3.2` leg (SH-TEST-04, 12) |
| 8 | Pester: trusts `Run.Exit` or `$LASTEXITCODE`, and reports green for a run that discovered nothing or skipped everything | 0 today (both repos set `Run.Exit`); 3 vacuous shapes measured | `Invoke-PesterGate.ps1` (SH-TEST-19) |
| 9 | Pester 4 habits: `Assert-MockCalled`, `-Pending`, `-Focus`, top-level `$x = ...` in a `Describe`, generated cases from a `BeforeAll` variable | 0 fleet hits; high prior in training data | cell P2, `Test-DiscoveryCode.ps1` (SH-TEST-20, 21) |
| 10 | Pipes the runner (`bats ... \| tee log`) under GitHub's default `bash -e`, or ends the step with `\|\| true` | 0 hits; measured exit 0 on a failing suite | canary (SH-TEST-11), cell L2 for the test files |
| 11 | Puts `run a \| grep b` expecting the pipe inside `run` (`$status` and `$output` are lost); `load file.sh` instead of `load file` | 0 hits | reading heuristic; bats fails loudly on `load` |
| 12 | Treats the `bash:3.2` image as macOS (BSD `sed -i ''`, `stat -f`), or runs the Pester suite on 5.1 and believes the installer was tested there | the image is Alpine; both fleet suites call `pwsh` | reading: SH-TEST-12 scope, SH-TEST-22 |

## Open questions

### Owner decisions (default the program applies)

- **O1. Where the Pester half is authored.** The map's M-T-04 and M-T-05 are PS-GATE rows; the brief names SH-TEST. *Default:* the IDs stay SH-TEST-18 to 22 and the rules are authored into `powershell-quality/gates.md`, where an agent editing a `*.Tests.ps1` file (rule glob `**/*.ps1`) reaches them; `shell-quality/testing.md` carries SH-TEST-01 to 17 and a pointer. The PS-CORE index adds cell P1, cell P2 and the census script to its tell grep set. *Risk:* if the catalog checker ties a family to one depth file, renumber to PS-GATE-11 to 15 (a mechanical map).
- **O2. The Pester version.** Pester 6 is three months old with four releases in nine weeks, and 6.1.0 shipped `Should-BeFasterThan` passing on unmeasurable input (fixed in 6.2.0). *Default:* the exact pin is the MUST; the number is 6.2.0, because the fleet already runs it green and Pester 5 is maintenance-only; a repo that must stay on Pester 5 pins 5.9.1. Re-date when 6.3 ships.
- **O3. The skip budget.** *Default:* zero, with a per-leg reason regex (bats) or `-MaxSkipped` (Pester) living in the CI step, not in the test, so a test author cannot widen it. The alternative is a repo-wide allow-list file; rejected because it moves the budget into the author's hands.
- **O4. Shipping the checks.** *Default:* yes, `rules/shell-quality/checks/` (precedent: nine `checks/*.sh` in swift-quality) and `powershell-quality/checks/`, under the SH-GATE-31 exit map; the index tells adopters to copy them to `scripts/`.
- **O5. The hatch and the fixture server.** www-setup's and setup-grimoire's `server.bash` drifted (411 and 207 lines, same helper name). *Default:* no shared copy decided here; SH-INST (W3-1, unopened) owns the minimal safe hatch contract (copy a local file only, never a URL, read in one function) and whether the helper becomes a vendored submodule.
- **O6. Dynamic test registration and parallel mode.** *Default:* the census applies as written to static suites; a suite that uses `bats_test_function`, `-j` or a junit formatter adds its expected count to the census input and is out of this set's measured scope.
- **O7. SH-TEST-14 as MUST.** The signal test is SHOULD because SH-ERR-16 already carries the static MUST. *Default:* SHOULD; raise it if the SH-ERR owner wants the behavioural proof to be the contract.

### Subareas that deserve another research round

1. **`testing/census-under-dynamic-and-parallel-bats`.** Does the census (static count against the TAP plan, stderr BW lines) hold for `bats_test_function`, `-j N` and `--formatter junit`? A first probe with `bats_test_function` hit a duplicate-name error in its fixture, so nothing is measured. The question decides whether `bats --count -r DIR` can replace the static grep.
2. **`testing/macos-and-git-bash-legs`.** Blocked on a macOS host: do `bats-lint.sh` and `bats-census.sh` run unchanged on BSD `grep`, `xargs -r` and `awk`, and does the stock `/bin/bash` 3.2.57 give the V02, V03 results of the `bash:3.2` image? Separately, on `windows-2025` Git Bash 5.3.15 (the host has 5.2.15) does a bats leg add signal beyond the Pester leg?
3. **`testing/pester-fleet-suites-under-5.1-child-host`.** What does a `$env:SUT_PWSH` child-host parameter cost the fleet's Pester suites that use the Python fixture server (the fleet calls it unreliable under a 5.1 host)? The question decides whether SH-TEST-22 stays SHOULD or the 5.1 smoke is the permanent answer.
4. **`testing/hatch-security`** (with SH-INST). Which hatch shapes survive an adversarial reading of a `curl | sh` installer, and does any fleet hatch accept more than a local file path?
5. **The program-wide held-out round for this family.** Only one dive fed SH-TEST and no sample outside the 41-repo corpus has been checked: take 10 bats-using repos not in the corpus and run `bats-lint.sh` and the census over them, to see which vacuous forms occur that the 13 planted ones do not cover.

## Sub-artifacts

- [shell-testing/bats-pester-matrix.md](shell-testing/bats-pester-matrix.md): bats 1.11.1, 1.13.0 and 1.14.0 and Pester 5.7.1 and 6.2.0 measured on bash 3.2 to 5.3, the Windows host and three PowerShell hosts: the 13 vacuous bats forms, the empty-suite and `run`/`set -e` changes of 1.14.0, the census and canary, the interpreter-matrix recipe, the installer test hatches, the Pester 5 versus 6 pin, the Pester vacuous shapes and discovery/run split, and the fleet's suites.

## Key sources

1. https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md : bats-core CHANGELOG (1.14.0 on 2026-07-21: `run` and `set -e`, `--errexit`, empty-suite error, `[Unreleased]` `BATS_ALLOW_EMPTY_SUITE`)
2. https://bats-core.readthedocs.io/en/stable/gotchas.html : `!`, `[[`/`((` on bash below 4.1, `run` and pipes
3. https://bats-core.readthedocs.io/en/stable/writing-tests.html : `run -N`, `run !`, teardown errexit, `bats_require_minimum_version`
4. https://bats-core.readthedocs.io/en/stable/support-matrix.html : the verified bash list (3.2.57 to 5.2)
5. https://github.com/bats-core/bats-core/blob/master/.github/workflows/tests.yml : bats-core's own CI (bash-version matrix, failing-suite canary)
6. https://github.com/koalaman/shellcheck/wiki/SC2314 : ShellCheck SC2314, `!` in bats
7. https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin : `set -e` exemptions (`!`, `&&` lists)
8. https://git.savannah.gnu.org/cgit/bash.git/plain/CHANGES : bash CHANGES, `[[` and `((` subject to `set -e` from 4.1-alpha
9. https://github.com/shellspec/shellspec : ShellSpec repository and README (supported shells, `--fail-no-examples`)
10. https://github.com/pester/Pester/releases/tag/6.0.0 : Pester 6.0.0 notes (breaking list, per-file discovery)
11. https://github.com/pester/Pester/releases/tag/6.2.0 : Pester 6.2.0 notes (duplicate `BeforeAll`, `BeforeContainer`)
12. https://github.com/pester/Pester/releases/tag/5.9.0 : Pester 5.9.0 notes (maintenance mode)
13. https://pester.dev/docs/usage/discovery-and-run : Pester discovery and run guide
14. https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle : PowerShell support lifecycle (7.4 ends 2026-11-10, 7.6.6 LTS)
15. https://packages.ubuntu.com/resolute/bats : Ubuntu 26.04 bats 1.13.0 (Debian 13: https://packages.debian.org/trixie/bats, 1.11.1)
