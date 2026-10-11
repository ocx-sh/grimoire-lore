---
title: "Held-out round: bats and Pester suites, dynamic and parallel census"
topic: "SH-TEST (rule family) held-out check on suites outside the corpus; does the census hold for bats_test_function, --jobs N and junit"
agent: "shell-heldout / test-suites"
model: sonnet
date_researched: 2026-10-11
sources_count: 25
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/heldout-test-suites/
scope: |
  bats suites asdf-vm/asdf, dokku/dokku, nodenv/nodenv, basherpm/basher, jasonkarns/bats-mock, syndbg/goenv, Bash-it/bash-it, bats-core/bats-assert, bats-core/bats-file;
  Pester suites badgerati/Pode, dataplat/dbatools (sparse tests/), RamblingCookieMonster/PSDepend, PowerShell/PSReadLine.
  Tools: bats 1.14.0 (also 1.11.1, 1.13.0, master 0c92eb4c418d) on bash 5.3.20 and 3.2.57 (Alpine images), GNU parallel; pwsh 7.6.6 with Pester 6.2.0 and 5.9.1. No macOS host: BSD/macOS claims are "unverified: read only".
---

# Held-out round: bats and Pester suites, dynamic and parallel census

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

**Verdict: SH-TEST is not clean on the held-out suites.** The census and six checks need amendments (below); the rule IDs stay stable, no rule is retired. Every claim below was run on 2026-10-11 unless marked "unverified: read only".

- The static census (`^[[:blank:]]*@test` grep against the TAP plan) false-reds every suite that registers tests with `bats_test_function` and stays green when a generator input vanishes (plan and static count both shrink to the static anchor). Fix: per-file pin `N path` for files that call `bats_test_function`, and `bats --count FILE` (not `-r`) for those files only.
- `bats --count -r DIR` cannot replace the static grep: gather executes top-level code (dokku: 4 files fail to count, `-r` over the tree fails whole), `-r` descends into vendored submodules (basher 429 vs 138 own tests) and counts fixture `.bats` files (bats-file 227 vs 212).
- A census that reads only the TAP file is false-green on a short run: with GNU parallel absent bats 1.14.0 printed `1..2`, executed 0 tests, exit 1, and the original census exited 0. Add: result-line count must equal the plan, no duplicated numbers, no `# bats warning` line, and the bats exit status must be consulted.
- Under `--tap --jobs 4` on a loaded host (load average 99 to 138 on 32 cores) 3 of 4 clean sequential Bash-it runs on bats 1.11.1 and 1.14.0 lost result lines (305, 255 and 255 of 308); every one exited 1 with `# bats warning: Executed N instead of expected 308 tests`. bats 1.14.0 on bats-assert was clean in 9 of 9 runs (`--jobs` 2, 4, 8). Treat the loss as load-dependent, always gate on the exit code.
- `--formatter junit` replaces stdout with XML: no TAP plan exists, so the TAP census cannot run. Use `--report-formatter junit --output DIR` next to stdout TAP, or the junit census (sum of `tests=` equals `bats --count` over `git ls-files`, failures and errors 0, skipped within budget).
- Static counting must be fed by `git ls-files` with `CENSUS_EXCLUDE` for `.bats` files that are inputs of tests (bats-file: 15 under `test/fixtures`), otherwise fixtures count as tests.
- Beyond the 13 planted vacuous forms the held-out trees add: 39 commented-out tests (asdf 35, nodenv 3, dokku 1), 3 unconditional first-statement skips in real tests (dokku 1, Bash-it 2), 10 mutation-proven vacuous `[[ =~ ]]` sites in bats-assert (green on bash 3.2.57, red on 5.3.20), 10 asdf files outside the Go harness that wraps bats (9 unlisted, 1 commented out), and bats-mock whose `npm test` is `echo todo`.
- L2 (`|| true`) fires 200 times on the held-out corpus and is right 0 times (cleanup, traps, guards). Revised `l2v3` anchors on an assertion-shaped statement, blanks quoted strings, requires `||` directly after it: 0 hits on the corpus, red on the plant, green on the twin.
- L5 (file without `bats_require_minimum_version`) fired on all 329 files. Helper-aware `l5v3` (flag used, no directive in the file or any `load`ed helper) fires 0 times on the corpus, red on plant, green on twin.
- The three real Pester gating forms (Pode `FailedCount+FailedBlocksCount+FailedContainersCount`, PSDepend `Result -eq`, dbatools `FailedCount -gt 0`) all stay green on a zero-test run and a skip-only run; dbatools' form also stays green on a failed container. Gate on `TotalCount` and `PassedCount` too, and pin the total for generated suites (`Invoke-PesterGate2.ps1 -ExpectedTotal N`).
- `Test-DiscoveryCode.ps1` v1 produced 116 hits on three real suites (Pode 30, dbatools 84, PSDepend 2), 1 remaining after the AST fix (`InModuleScope` transparent; only variables or functions used in run phase count). Twin flagged by v1, green on v2.
- `pester-lint.sh` P2 matches only `*.Tests.ps1` (case-sensitive pathspec) but Pester runs `*.tests.ps1` too; `:(icase)*.tests.ps1` fixes it (plant red, twin green). P1 fires on Pode and PSDepend although both pin Pester elsewhere (build file); `p1v2` looks for a pin anywhere in the repo.
- `-AllowNullOrEmptyForEach` (Pester 6 only) lets a `-ForEach` over an empty generator empty a Describe silently; on 5.9.1 the same shape passes with total=1. Both need the total pin; neither fails the exit-code gate.
- PSReadLine contains no Pester tests (0 `*.tests.ps1`, xUnit under `Invoke-Build`), so the Pester checks correctly output nothing there.
- Classification: 4 findings extend existing classes (short run, vanished input, vacuous form, zero-test gate), 7 are check fixes (L2, L3, L5, L6, P1, P2 case, Test-DiscoveryCode), 4 are new classes with plant and twin (commented-out test, unconditional skip, out-of-harness test files, `test` script that tests nothing).

## Findings

Tool tags: bats 1.14.0 unless stated; bash 5.3.20 (`bash:5.3`) and 3.2.57 (`bash:3.2`); busybox ash for the census; pwsh 7.6.6; Pester 6.2.0 / 5.9.1. Repository SHAs are 12 characters.

### F1. Dynamic tests defeat the static census in both directions (existing class: census mismatch; check fix)

The shell-testing.md census counts `@test` lines. A file that registers tests with `bats_test_function` has none, so the count is wrong in both directions.

Plant (`dyn/repo/tests/a_gen/dyn.bats`, 1 static + 3 dynamic):

```bash
for n in a b c; do
  eval "t_$n() { check $n; }"
  bats_test_function --description "dynamic $n" -- "t_$n"
done
@test "static one" { run -0 true; }
```

| fixture | original census | amended census (census2) |
|---|---|---|
| a_gen (1 static + 3 dynamic, plan 4) | `1 @test on disk but TAP plan is 4` (false red) | green with pin `4`, red without a pin line |
| b_only (0 static + 2 dynamic) | `0 @test on disk but TAP plan is 2` (false red) | green with pin `2` |
| f_gen_twin (generator intact, 3 cases) | `1 @test on disk but TAP plan is 3` (false red on the twin) | green |
| c_empty (generator input dir emptied, plan 1) | **green (exit 0, no output)** | `registers 1 tests, pin says 3` red |
| d_fail (dynamic test fails) | red via `not ok` | red via `not ok` |

Correct (census2, `bats-census2.sh` lines 52-74): files that call `bats_test_function` take their count from `"$BATS" --count "$f"` and from a pin file line `N path`:

```sh
xargs -0 -r grep -s -l -e '^[[:blank:]]*bats_test_function' -- <"$list" >"$dyn"
...
got=$("$BATS" --count "$f" 2>/dev/null) || { echo "census: '$BATS --count $f' failed (gather error?)"; rc=1; continue; }
want=$(awk -v f="$f" '$2 == f { print $1 }' "$expect" 2>/dev/null)
```

Answer to the brief: the census input **does** need an expected-count file, but only per dynamic file (`N path`), not per suite. Without it a vanished generator input (CI step dropped, glob matches nothing) stays green because the plan shrinks with the disk count. Source for the feature: [bats writing-tests, dynamic registration](https://bats-core.readthedocs.io/en/stable/writing-tests.html) (`writing-tests-1.14.0.md:124-148`), changelog entry `bats_test_function` (#349) at `changelog.md:155`.

### F2. `bats --count -r DIR` cannot replace the static grep (check fix: keep static; new limit)

Measured on bash:5.3 with bats 1.14.0 (`drive-*.log`, `dokku-count-vs-static.txt`):

| suite | static `@test` | `bats --count -r` | why they differ |
|---|---|---|---|
| nodenv@76e9ae5087c2 `test/` | 187 | 187 | equal |
| goenv@368cbb1d6fcf `test/` | 337 | 308 | `$0`-derived `base_dir` (`test/goenv--version.bats:5`) breaks gather for the whole run; I deleted the three affected files from the run copy, and 337 - 308 = 29 is consistent with the tests in them |
| Bash-it@81929690975f `test/` | 308 | `-r test` exited 1 with no count; 308 with the project's own invocation | gather runs top-level code |
| basher@7c3d238ce263 `tests/` | 138 | **429** | `-r` descends into the submodule `tests/vendor/bats-core` (`.gitmodules`) |
| bats-file@6bee58bec7c2 `test/` | 212 | **227** | counts the `.bats` files in `test/fixtures` |
| dokku@5eaab7cc1a14 `tests/unit` | 1012 | per-file `FAILED` for `nginx-vhosts_{1,3,4,5}.bats` | top-level code needs a live dokku |

The static grep over `git ls-files` is the only counter that is independent of execution, hides submodules (gitlinks are not files in `git ls-files`, [gitglossary](https://git-scm.com/docs/gitglossary)), and honours an exclude pathspec. `bats --count FILE` is right for the single files that register dynamically.

### F3. A census that only reads the TAP file is false-green on a short run (existing class: short run; check fix)

`bats-census.sh` compares plan to the static count and greps `not ok`. If the run stops early, both stay consistent.

```text
$ bats --jobs 2 -r tests/e_twin        # bats 1.14.0, GNU parallel NOT on PATH
1..2
.../bats-exec-suite: line 323: parallel: command not found
# bats warning: Executed 0 instead of expected 2 tests
exit=1
```

Original census: exit 0 (static 2 = plan 2, no `not ok`). census2: `census: TAP plan 2, 0 result lines, 0 duplicated test numbers`, exit 1. bats master 0c92eb4c418d aborts earlier (`Error: Cannot execute "2" jobs without GNU parallel`, exit 1, no plan), matching the changelog entry "`--jobs` now aborts when GNU parallel is unavailable" (`changelog.md:25`, Unreleased). On the real Bash-it run with 255 of 308 results the original census exited 0 (with the 3 skip reasons whitelisted); census2 exited 1.

Correct: result lines (`^ok N` / `^not ok N`) equal the plan, no duplicate N, no `^# bats warning` line (`bats-census2.sh:80-86`), and the CI step runs bats and the census as `bats ... | tee tap; rc=$?` and fails on either (the census reads a file, so it cannot see bats' exit status).

### F4. Parallel runs: the census holds when bats is healthy, and the loss is visible when it is not (existing class: short run)

`--jobs N` needs GNU parallel and is used by Bash-it (`test/run:47` `exec bats ${CI:+--tap} --jobs "$n"`). Results on one host under heavy unrelated load:

| suite / bats | flags | runs | outcome |
|---|---|---|---|
| bats-assert, 1.14.0 | `--tap --jobs 2/4/8` | 9 | 9 clean: plan 254, 254 result lines, 0 duplicates, exit 0 |
| bats-assert, 1.13.0 | `--tap --jobs 2` | 2 (third interrupted) | 2 clean |
| Bash-it, 1.11.1 | `--tap --jobs 4 --no-parallelize-within-files` | rep 1 / rep 2 | 305 of 308 / 255 of 308 (exit 1, one `not ok`), both with `# bats warning` |
| Bash-it, 1.13.0 | same | rep 1 | 308 of 308, exit 0 |
| Bash-it, 1.14.0 | same | rep 1 | 255 of 308, exit 1, `# bats warning: Executed 255 instead of expected 308 tests` |

Reps 2-3 for 1.13.0 and 1.14.0 were not completed (job stopped by me). An earlier sweep with two overlapping jobs wrote the same output files and showed duplicated numbers; it is contaminated and is **not** used as evidence. The 255 appearing twice is unexplained; I did not find a root cause and do not claim one. Conclusion that survives: bats can lose result lines under `--jobs`; the exit code and the warning line always reported it; a census that checks them is sufficient, a plan-only census is not.

### F5. junit formatters remove the plan (new limit for the census; existing class: census input)

bats 1.14.0 (`junit-runs.txt`):

- `bats --formatter junit -r DIR`: stdout is XML, zero TAP plan lines, so `bats-census.sh` exits 74 (cannot find a plan).
- `bats --report-formatter junit --output D -r DIR`: stdout stays TAP (`1..2`), the XML goes to `D/report.xml`; both are usable.
- `--formatter tap --report-formatter junit` also keeps the plan.

The junit report has one `<testsuite name="x.bats" tests=".." failures=".." errors=".." skipped="..">` per file. `bats-census-junit.sh` sums those and compares with `bats --count` over `git ls-files`. Plants: `h_skip` (1 skipped) -> `census: skipped=1 over budget 0`, exit 1; `i_nested` (a `sub/` directory, report from a non-recursive run) -> `census: 3 tests on disk (bats --count) but the report has tests=2`, exit 1; `e_twin` -> exit 0. Docs: [bats usage, formatters](https://bats-core.readthedocs.io/en/stable/usage.html) (`usage-1.14.0.md:47-71`), changelog `changelog.md:498-500` (the meaning of `--formatter junit` changed at 1.0).

### F6. Vacuous `[[ ]]` mid-test is real on bash < 4.1 (existing class: vacuous form; check fix for L3)

bats-assert `test/assert_line.bats:340` (and 9 sibling files) at 697471b7a89d:

```bash
if (( BASH_VERSINFO[0] > 5 || (BASH_VERSINFO[0] == 5 && BASH_VERSINFO[1] >=3) )); then
  [[ "$output" =~ "invalid regular expression "([^$'\n']+) ]]      # statement, then more statements
  cat <<ERR_MSG
```

Mutation proof (`mutate-l3.txt`): flipping each of the 10 sites to a pattern that cannot match gives exit 0 and `notok=0` on **bash 3.2.57**, exit 1 and `notok=1` on **bash 5.3.20**: the assertion is silent on old bash because bats' `set -e` does not trip on a failing `[[ ]]` that is not the last statement. Correct: end the test with the `[[ ]]`, or `[[ ... ]] || return 1`, or use `assert_regex`. Original L3 flags a `[[ ]]` statement anywhere (52 hits asdf, 34 dokku, 6 Bash-it, 10 bats-assert, 3 nodenv); `l3v2` flags only a `[[ ]]`/`(( ))` followed by another statement in the same test and so reduces the real set to the 10 mutation-proven ones in bats-assert (others in the corpus are final statements). Unverified: read only: macOS ships bash 3.2.57 as `/bin/bash`; the same mid-test behaviour is documented in the [bats gotchas page](https://bats-core.readthedocs.io/en/stable/gotchas.html) (`gotchas-1.14.0.rst`, `[[ ]]` section).

### F7. L2 (`|| true`) is wrong 200 of 200 times on the held-out corpus (check fix)

Original L2 hits: asdf 1, Bash-it 4, dokku 171, goenv 24. Classified (`l2ctx-*`): cleanup (`rm`, `kill`, `popd`, `trap`, `destroy`) or a guard in a helper, e.g. dokku `tests/unit/plugin.bats:18` `[[ -e ... ]] || plugn enable enter || true` inside `restore_enter_plugin`. None swallows an assertion.

Defect found in my own first revision: `l2v2` used `[^"']*` between the assertion and `||`, so `[ "$status" -eq 1 ] || true` (quotes) was **missed**. `l2v3` blanks quoted strings first and allows no `|` between the assertion and `||`.

```bash
# plant (tests/l2_plant/p.bats)             # twin (tests/l2_twin/t.bats)
[ "$status" -eq 1 ] || true                  rm -rf "$BATS_TEST_TMPDIR/x" || true      # teardown
grep -q nothing /dev/null || :               run echo 'a || true'; trap '... || true' INT
```

l2v3: plant 2 lines, twin 0, corpus 0 (before the `[^|]*` tightening it flagged dokku `plugin.bats:18-19`).

### F8. L5 flags every file; the right question is "flag used, no directive anywhere it could come from" (check fix)

L5 (`scan L5 -L -e bats_require_minimum_version`) returned one hit per file: asdf 32, basher 21, Bash-it 28, bats-assert 10, bats-file 54, dokku 131, nodenv 23, goenv 30 = 329 of 329. Real risk is a test file that uses `run -N`, `run !`, `run --separate-stderr` (>= 1.5.0) with no directive in itself or a `load`ed helper. `l5v3.sh` follows `load NAME` to `NAME` / `NAME.bash` in the same directory. Plant `l5_plant/x.bats` (flag, no directive) red; twin `l5_twin/y.bats` (directive in `helper.bash` loaded via `load helper`) green; the earlier `l5v2` flagged the twin. Corpus: 0 hits (all suites pin via helper or use no flags).

### F9. L6 (`run` whose status is never read) needs the assertion-helper vocabulary (check fix)

Original L6: asdf 140, Bash-it 164, bats-assert 448, dokku 21, goenv 11, nodenv 1. bats-assert is the library that defines `assert_success` and friends, so its `run assert true` lines are the subject under test (`test/assert.bats:6`), not consumers. `l6v2.awk` accepts `assert*`/`refute*`/`$status`/`$output` reads and excludes `run assert*` / `run refute*`: asdf 101, Bash-it 12, bats-assert 204, dokku 21, goenv 0, nodenv 0, basher 0, bats-file 0 (suite-stats). The 204 in bats-assert are `run false`-style setup lines whose result is asserted by the *following* helper under test; I did not classify further and leave L6 as advisory, not a gate, on assertion-library suites.

### F10. Disabled tests are a new class: commented-out `# @test` (new class, plant and twin)

`l8l9.sh` L8 `^[[:space:]]*#[[:space:]]*@test[[:space:]]+["'].*\{[[:space:]]*$`:

- asdf-vm/asdf@cb72590e9f96 `test/asdf_nu.bats:118,133,149` (35 hits in all), dokku `tests/unit/client.bats:302`, nodenv 3. Total 39.
- Plant `k_comment_plant/p.bats:7` `# @test "disabled because flaky" {` -> `L8 ...:7`; twin `k_comment_twin/x.bats` (a comment that mentions `@test` mid-sentence) -> no output.

A commented-out test lowers both the static count and the plan, so the census stays green; only a diff against history or this check sees it.

### F11. Unconditional skip is a new class: `skip` as first statement (new class, plant and twin)

L9 awk (`l8l9.sh`): `skip` is the first statement of its `@test`, so the remainder is dead.

- dokku `tests/unit/apps_2.bats:110` `skip "this test always failed and requires changes in dokku ..."`; Bash-it `test/plugins/go.plugin.bats:44,68` `skip 'huh?'` (2 of the 8 skips in a clean run); bats-file `test/fixtures/temp/temp_del-skip.bats:6` is a fixture that tests skip handling (legitimate, excluded by `CENSUS_EXCLUDE`).
- Plant `h_skip/skip.bats:8` and `k_comment_plant/skipfirst.bats:4` -> `L9`; twin `k_comment_twin/cond.bats` (`command -v true || skip "no true"`) -> no output.
- The census catches the *reported* skip only when `CENSUS_SKIP_OK` is empty. In the clean Bash-it run 8 of 308 report `# skip` (6 `golang not found` / `ruby not installed`, 2 `huh?`); the reason regex whitelist must not contain `huh`.

### F12. Tests that no harness runs: asdf (new class: out-of-census file, plant and twin)

asdf-vm/asdf@cb72590e9f96 wraps legacy bats in a Go test: `cmd/asdf/main_test.go:24-` calls `runBatsFile(t, dir, "x.bats")` per file (23 call lines). Of 32 `test/*.bats` files, 9 are listed nowhere (`asdf_elvish`, `asdf_fish`, `asdf_nu`, `asdf_pwsh`, `asdf_sh`, `banned_commands`, `get_asdf_config_value`, `update_command`, `utils`) and one is commented out (`main_test.go:99-105` `//t.Run("version_commands"...)`, 63 tests). I ran every file on its own: `update_command.bats` plans `1..0`, `utils.bats` 51 of 53 not ok and 49 BW warnings, `version_commands.bats` 63 of 63 not ok (they need the bash `asdf`), `asdf_sh.bats` 5 of 6 not ok. `asdf_elvish/fish/nu/pwsh` skip 100% (`Elvish not installed`). A directory census over `test/` (360 tests) therefore does not describe what CI executes. Plant: add a `.bats` file under the test dir not named by the runner list; twin: the same file named in it. The census needs `CENSUS_EXCLUDE` or a runner-list cross-check; I recommend the cross-check only for hand-listed wrappers.

### F13. A `test` script that tests nothing (new class)

jasonkarns/bats-mock@eacf0fecb9f4: `package.json:43` `"test": "echo todo"`; no `.bats` file is tracked at that SHA (`bats-lint.sh` exit with `no .bats files`; census exits 79). The suite is exercised through consumers. Plant: package with `"test": "echo todo"` and no tests; twin: `"test": "bats test"` with a test. Check: `rg -n -e '"test": *"(echo|true|exit 0)' --glob 'package.json' DIR` (output is the violation).

### F14. Skip-reason hygiene and fixture inputs (existing classes, census parameters)

nodenv `test/` and goenv `test/` pass fully on bash 5.3 (187/187, 308/308) and on bash 3.2.57 for nodenv and bats-assert (187/187, 254/254); asdf and basher run mostly failed in a sandbox (no network, no root-owned paths): that is environment, reported as such. goenv needed three files removed from the run copy (`$0` hack) — a documented deviation.

### F15. Pester: all three real gating forms miss the zero-test and skip-only run (existing class: vacuous gate; check fix)

Gate forms in the wild: Pode@89797a301afe `pode.build.ps1:962` `if (($results.FailedCount + $results.FailedBlocksCount + $results.FailedContainersCount) -gt 0) { throw }`; PSDepend@a7ab90cf716f `psakeFile.ps1:48-50` `Invoke-Pester -Configuration`, `throw` on `Result`; dbatools@e273a4164bdf `tests/appveyor.pester.ps1:520` `if ($PesterRun.FailedCount -gt 0)`.

`gate-forms.txt` (both Pester 5.9.1 and 6.2.0, same results):

| case | Pode form | PSDepend form | dbatools form | `Invoke-PesterGate.ps1` census |
|---|---|---|---|---|
| pass | green | green | green | green |
| container-fail (a Describe body throws) | red | red | **green** | red |
| zero tests (empty dir) | **green** | **green** | **green** | red |
| skip-only | **green** | **green** | **green** | red |

Correct: `Invoke-PesterGate.ps1` fails on `TotalCount -eq 0`, `SkippedCount` over budget, any of the three failed counters, and `Result`. For generated suites add the pin.

### F16. Generated suites need a total pin; `-AllowNullOrEmptyForEach` is 6.0+ only (existing class: vanished input; check fix)

`gen5/plant` (`-ForEach @()`-style empty generator in a Describe): Pester 5.9.1 `total=1` GATE GREEN; with `-ExpectedTotal 3` GATE RED `total=1 but the pin says 3`; the twin (3 cases) green with and without the pin. Pester 6.2.0 fails discovery by default for an empty `-ForEach` (`Value can not be null or empty`), which is the safe default; passing `-AllowNullOrEmptyForEach` (new in [Pester 6.0.0](https://github.com/pester/Pester/releases/tag/6.0.0)) re-creates the 5.9.1 behaviour. `-AllowNullOrEmptyForEach` on 5.9.1 is an unknown-parameter error. Rule: pin the total per generated file or per suite, and never pass `-AllowNullOrEmptyForEach` in a gating run.

### F17. `Test-DiscoveryCode.ps1` v1 is wrong 114 of 116 times (check fix)

Held-out Pester files (`tfiles-*.txt`: Pode 40, dbatools 752, PSDepend 28 `*.Tests.ps1` files): v1 flags `InModuleScope X {` at file level (it is a wrapper, not discovery code) and flags discovery data used only by `-ForEach`/`-TestCases`. Counts v1/v2: Pode 30/0, dbatools 84/1, PSDepend 2/0. `Test-DiscoveryCode2.ps1` treats `InModuleScope` as transparent and reports an assignment or function only when the same file uses its name inside `It`/`BeforeEach`/`AfterEach`/`BeforeAll`/`AfterAll`. The 1 remaining hit, dbatools `tests/New-DbaFirewallRule.Tests.ps1:151` `$browserExpected = ...`, is used at `-Skip` (discovery) at lines 203-226 *and* the variable is computed in the Describe body, so it is a discovery value, i.e. **probably also a false positive**; left unclassified.

```powershell
# plant (ims.plant.Tests.ps1)                    # twin (ims.twin.Tests.ps1)
InModuleScope Microsoft.PowerShell.Utility {     BeforeAll { Get-Module Microsoft.PowerShell.Utility | Out-Null }
  Describe 'ims' {                               InModuleScope Microsoft.PowerShell.Utility {
    $v = 1                                         Describe 'ims' {
    It 'sees the value' { $v | Should -Be 1 }        BeforeAll { $script:v = 1 }
  }                                                  It 'sees the value' { $script:v | Should -Be 1 }
}                                                  } }
```

v1: plant flagged at `file level: InModuleScope`, twin flagged too (false positive). v2: plant `discovery-only code at body: assignment to $v`, twin no output. Background: [Pester discovery and run](https://pester.dev/docs/usage/discovery-and-run).

### F18. P1/P2 fixes (check fix)

- **P1** (`Invoke-Pester` in a file with no version): Pode `src/Public/Routes.ps1:1960` (matched the *word* in a string) and PSDepend `psakeFile.ps1:48` were flagged although both pin Pester elsewhere (Pode `pode.build.ps1:389` `-RequiredVersion "$($Versions[$name])"`, `1532` `Import-Module Pester -Force -RequiredVersion`; PSDepend `requirements.psd1:8` `'Pester' = @{ Version ...}` and `build.ps1:66`). `p1v2.sh`: pin evidence anywhere in the repo; call sites outside comments only. Plant `p1plant` (`Install-Module Pester -Force`, `run.ps1: Invoke-Pester -Path tests`, no pin) -> `run.ps1:1: Invoke-Pester -Path tests`; twin `p1twin` (`requirements.psd1` pin, example calls in `<# #>` and `#` comments) -> no output.
- **P2** (removed-in-6 constructs): `git ls-files -- '*.Tests.ps1'` is case-sensitive, so a test file named `*.tests.ps1` is never scanned, yet Pester finds it (`Run.TestExtension` default `.Tests.ps1`, matched case-insensitively; [Pester configuration](https://pester.dev/docs/usage/configuration)). Plant `tests/plant.tests.ps1` (`Assert-MockCalled`): original output lists only `tests/upper.Tests.ps1`; `:(icase)*.tests.ps1` lists both; twin (`Should -Invoke`) clean. Removed constructs: [breaking changes in v6](https://pester.dev/docs/migrations/breaking-changes-in-v6).
- `pester-lint.sh` exits 74 on a sparse checkout (dbatools index lists files absent from disk); materialise the tree first (`pester-run/dbatools-tests`). The script needs a reading `git ls-files` plus `test -e`, which I recommend as an amendment.

### F19. Pester `-Parallel` with ForEach-Object is out of scope but harmless to the gate

`Run.Parallel` is not in Pester 5.9.1 (error); in 6.2.0 `par` (7 files, 19 tests): `parallel=False` total 19, `parallel=True` total 19, both passed; `par-fail`: failed 1, containers 1 in both. Counters agree serial vs parallel (`pester-parallel.txt`). Background: [ForEach-Object -Parallel](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/foreach-object?view=powershell-7.6).

### F20. Classification of every finding

| finding | class | action |
|---|---|---|
| F1 dynamic vs static | extends *census mismatch* | check fix: per-file pin + `--count FILE` |
| F2 `--count -r` | new limit, no new rule class | document; keep static |
| F3 short run | extends *short run* | check fix: result lines, exit status |
| F4 parallel loss | extends *short run* | same fix |
| F5 junit | extends *census input* | junit census |
| F6 mid-test `[[ ]]` | extends *vacuous form* (V-class) | L3v2 + mutation recipe |
| F7 L2 | check fix | l2v3 (plant, twin) |
| F8 L5 | check fix | l5v3 (plant, twin) |
| F9 L6 | check fix | l6v2, advisory |
| F10 commented-out test | **new class** | L8 (plant, twin) |
| F11 unconditional skip | **new class** | L9 (plant, twin) |
| F12 out-of-harness files | **new class** | runner-list cross-check (plant, twin) |
| F13 `echo todo` test script | **new class** | package.json grep (plant, twin) |
| F15 zero-test gates | extends *vacuous gate* | gate check |
| F16 empty generator | extends *vanished input* | `-ExpectedTotal` |
| F17 Test-DiscoveryCode | check fix | v2 |
| F18 P1/P2 | check fix | p1v2, icase |

## Normative guidance candidates

Each: rule; rationale; how a reviewer VERIFIES; RAN against a plant (yes/no). Verification commands print the violation; empty output means pass. Replace `DIR` with the test directory.

1. **The CI step must pass the bats exit status and the TAP file to the census, and fail on either.** Rationale: F3/F4, the original census read only the file. Verify: `rg -n -e 'bats-census' --glob '*.yml' --glob 'Taskfile*' --glob '*.sh' .` then read that the step records `rc=$?` of bats. RAN: yes (original census green on a 0-of-2 run, census2 red).
2. **Census result-line check: `^ok N` plus `^not ok N` lines must equal the TAP plan, with no duplicated N and no `# bats warning` line.** Rationale: F3/F4. Verify: `grep -c -e '^ok [0-9]' -e '^not ok [0-9]' TAP` equals `sed -n 's/^1\.\.\([0-9]*\)$/\1/p' TAP`. RAN: yes (255 of 308 red; no-GNU-parallel run red; original green).
3. **Every file that calls `bats_test_function` has a pin line `N path` and `bats --count FILE` equals N.** Rationale: F1. Verify: `rg -l -e '^[[:blank:]]*bats_test_function' --glob '*.bats' DIR` and compare each hit with `.bats-expected`. RAN: yes (c_empty red, a_gen no-pin red, pinned green).
4. **Use `bats --count` only on single files, never `-r DIR`, to count tests.** Rationale: F2. Verify: `rg -n -e 'bats[^|]* --count[^|]* -r' --glob '*.yml' --glob '*.sh' --glob 'Taskfile*' .`. RAN: no (the numbers are measured in F2; the grep is a style check).
5. **Never gate on `--formatter junit` stdout; use `--report-formatter junit --output DIR` beside TAP, or the junit census.** Rationale: F5. Verify: `rg -n -e '--formatter[ =]junit' --glob '*.yml' --glob '*.sh' --glob 'Taskfile*' .`. RAN: yes (junit census: skip budget and nested plants red, twin green).
6. **Exclude `.bats` files that are test inputs from the census with `CENSUS_EXCLUDE`, and never count `tests/vendor` submodules.** Rationale: F2. Verify: `git ls-files -- ':(glob)**/fixtures/**/*.bats'` must be matched by an exclude entry. RAN: yes (bats-file 227 vs 212; basher 429 vs 138).
7. **A `|| true` or `|| :` directly after an assertion statement is a defect; run `l2v3`.** Rationale: F7. Verify: `sh l2v3.sh` (empty). RAN: yes (plant 2, twin 0, corpus 0).
8. **A test file that uses `run -N`, `run !` or `run --separate-stderr` must name `bats_require_minimum_version` itself or in a `load`ed helper.** Rationale: F8. Verify: `sh l5v3.sh`. RAN: yes.
9. **No `[[ ]]` or `(( ))` statement may be followed by another statement in a test unless it ends with `|| return 1`.** Rationale: F6, bash < 4.1. Verify: `L3AWK=l3v2.awk sh l3v2.sh`. RAN: yes (mutation: 10 sites green on 3.2.57, red on 5.3.20).
10. **No commented-out test: remove it or `skip` it with a reason.** Rationale: F10. Verify: `rg -n -e '^[[:space:]]*#[[:space:]]*@test' --glob '*.bats' DIR`. RAN: yes.
11. **No `skip` as the first statement of a test.** Rationale: F11. Verify: `sh l8l9.sh | rg -e '^L9'`. RAN: yes (plant red, twin green).
12. **Every `.bats` under the test tree is run by the gate; a hand-listed runner (Go, make) must list them all or the tree must be an explicit exclude.** Rationale: F12. Verify: compare `git ls-files -- 'DIR/*.bats'` with the runner list (`rg -o -e 'runBatsFile\(t, dir, "[a-z_.]+"\)' --glob '*.go' .`). RAN: yes (asdf: 9 files unlisted, 1 commented).
13. **A package `test` script must not be `echo todo`/`true`/`exit 0`.** Rationale: F13. Verify: `rg -n -e '"test": *"(echo|true|exit 0)' --glob 'package.json' .`. RAN: yes on bats-mock; no plant file built.
14. **Gate every Pester run on `TotalCount > 0`, skipped within budget, and all three failed counters; also require `Result`.** Rationale: F15. Verify: read the gate: `rg -n -e 'TotalCount' --glob '*.ps1' .` must hit the gate script. RAN: yes (zero and skip-only red; three real forms green).
15. **A generated Pester suite pins its total (`-ExpectedTotal N`); never pass `-AllowNullOrEmptyForEach` in a gating run.** Rationale: F16. Verify: `rg -n -e 'AllowNullOrEmptyForEach' --glob '*.ps1' --glob '*.yml' .`. RAN: yes (5.9.1 plant red with pin, green without).
16. **Match test files case-insensitively (`:(icase)*.tests.ps1`) in every scan of Pester files.** Rationale: F18. Verify: `rg -n -e "'\*\.Tests\.ps1'" --glob '*.sh' --glob '*.yml' .`. RAN: yes.
17. **Treat `InModuleScope` as transparent when judging discovery-only code.** Rationale: F17. Verify: run `Test-DiscoveryCode2.ps1` on changed `*.Tests.ps1`. RAN: yes.
18. **Pin Pester with `-RequiredVersion` or a `requirements.psd1` entry once per repo; `Invoke-Pester` without a pin anywhere in the repo is the violation.** Rationale: F18. Verify: `sh p1v2.sh`. RAN: yes.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/heldout-test-suites/` (`$F`). "Plant" is the violating fixture, "twin" the compliant one. Exit codes are the command's; checks that always exit 0 by contract print the violation.

| # | check | fixture | command (short) | plant | twin | output lines |
|---|---|---|---|---|---|---|
| 1 | census2 pin | `dyn/repo/tests/c_empty` / `f_gen_twin` | `census2.sh dyn tests/c_empty ... tests/pins` | exit 1 | exit 0 | `census: tests/c_empty/gen.bats registers 1 tests, pin says 3` |
| 2 | census2 no pin | `tests/a_gen` | same, no pin file | exit 1 | exit 0 (pinned) | `registers tests dynamically and has no pin` |
| 3 | census2 short run | `tests/e_twin` run without GNU parallel | `census2.sh dyn tests/e_twin 5.3 -noparallel` | exit 1 | exit 0 (`e_twin` normal) | `census: TAP plan 2, 0 result lines, 0 duplicated test numbers` |
| 3b | original census, same tap | same | `dash bats-census.sh ...` | **exit 0 (not red)** | exit 0 | none |
| 4 | census2 dynamic failure | `tests/d_fail` | census2 | exit 1 | | `not ok 1 dynamic failing` |
| 4b | original census on dynamic twin | `tests/f_gen_twin` | `bats-census.sh` | **false red** | | `1 @test on disk but TAP plan is 3` |
| 4c | original on emptied generator | `tests/c_empty` | `bats-census.sh` | **exit 0 (not red)** | | none |
| 5 | junit census skip budget | `tests/h_skip` | `census-junit.sh` | exit 1 | `e_twin` exit 0 | `census: skipped=1 over budget 0` |
| 6 | junit census nested | `tests/i_nested` | `census-junit.sh` | exit 1 | | `census: 3 tests on disk (bats --count) but the report has tests=2` |
| 7 | l5v3 | `tests/l5_plant`, `l5_twin` | `sh ref/l5v3.sh` | `tests/l5_plant/x.bats` | none | (l5v2 flagged both) |
| 8 | l2v3 | `tests/l2_plant`, `l2_twin` | `sh ref/l2v3.sh` | 2 lines (`p.bats:3`, `:4`) | none | l2v2 missed line 3 (quotes) |
| 9 | L8 | `k_comment_plant`, `k_comment_twin` | `sh ref/l8l9.sh` | `L8 tests/k_comment_plant/p.bats:7` | none | |
| 10 | L9 | `h_skip`, `k_comment_plant/skipfirst`, `cond` | `sh ref/l8l9.sh` | `L9 ...h_skip/skip.bats:8`, `...skipfirst.bats:4` | none | |
| 11 | p1v2 | `pester-fx/p1plant`, `p1twin` | `sh ref/p1v2.sh` | `run.ps1:1: Invoke-Pester -Path tests` | none | |
| 12 | P2 icase | `pester-fx/repo` | `sh ref/pester-lint2.sh` vs `pester-lint.sh` | icase lists `plant.tests.ps1` and `upper.Tests.ps1`; original only `upper.Tests.ps1` | twin clean | |
| 13 | Test-DiscoveryCode2 | `pester-fx/ims.plant|twin.Tests.ps1` | `pwsh -File Test-DiscoveryCode2.ps1` | `...:4: ... assignment to $v` | none (v1 flagged twin) | |
| 14 | L3v2 mutation | 10 bats-assert files | `mutate-l3.sh` on `bash:3.2` / `bash:5.3` | 3.2.57: exit 0 notok=0 (x10); 5.3.20: exit 1 notok=1 (x10) | | |
| 15 | Pester gate, container-fail | `pester-fx/cases/container-fail` | `gate-forms.ps1` 6.2.0 and 5.9.1 | Pode/PSDepend red, dbatools **green**, census red | | |
| 16 | Pester gate, zero | `cases/zero` | same | Pode/PSDepend/dbatools **green**, census red | | |
| 17 | Pester gate, skip-only | `cases/skip-only` | same | all three real forms **green**, census red | | |
| 18 | `-ExpectedTotal` | `pester-fx/gen5/plant`, `twin` | `Invoke-PesterGate2.ps1 -ExpectedTotal 3` on 5.9.1 | GATE RED `total=1 but the pin says 3` | GATE GREEN | pin -1: plant GREEN |
| 19 | census2 on real short run | Bash-it 1.14.0 `--tap --jobs 4` | `census2.sh Bash-it__bash-it test 5.3 ...` | exit 1: `TAP plan 308, 255 result lines`, `# bats warning` | original exit 0 with reasons whitelisted | |
| 20 | Pester total gate | `cases/zero` | `Invoke-PesterGate.ps1` | red `total=0` | `cases/pass` green | |

Verifications watched going red on a planted fixture: **20** (rows 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20). Not red (reported as such): rows 3b, 4c, and the three real Pester gating forms on zero/skip-only/container-fail (dbatools) in rows 15-17; also `p1v2`/`l2v3` on the corpus (0 hits, by design); jobs 2/4/8 on bats-assert (clean).

Bounds: every run under `timeout 300`; hosts: WSL2, load average 99 to 138 while the parallel runs ran.

## Exemplar evidence

- asdf-vm/asdf@cb72590e9f96: `cmd/asdf/main_test.go:24-` (hand-listed wrapper, 23 call lines; `:99-105` commented-out `version_commands`); `test/asdf_nu.bats:118,133,149` (commented-out tests).
- dokku/dokku@5eaab7cc1a14: `tests/unit/apps_2.bats:110` unconditional skip; `tests/unit/client.bats:302` commented-out test; `tests/ci/unit_test_runner.sh:28` `bats $test`; `tests/unit/plugin.bats:18` guard idiom with `|| true`.
- Bash-it/bash-it@81929690975f: `test/run:47` `bats ${CI:+--tap} --jobs N`; `test/plugins/go.plugin.bats:44,68` `skip 'huh?'`.
- bats-core/bats-assert@697471b7a89d: `test/assert_line.bats:340` (and 9 siblings) vacuous `[[ =~ ]]` on bash < 4.1; `.github/workflows/test.yml:9` reusable workflow.
- bats-core/bats-file@6bee58bec7c2: `.github/workflows/tests.yml:26` `./script/install-bats.sh`, `:38` `BATS_LIB_PATH=$PWD bats --print-output-on-failure test`; `test/fixtures/temp/temp_del-skip.bats:6`.
- basherpm/basher@7c3d238ce263: `.gitmodules` vendors `tests/vendor/bats-core`; `.github/workflows/ci.yml:24` fetches bats v1.1.0 with `--no-check-certificate`.
- syndbg/goenv@368cbb1d6fcf: `test/goenv--version.bats:5` `$0`-derived `base_dir`; `Makefile:28` `exec bats`.
- nodenv/nodenv@76e9ae5087c2: `package.json:40` `bats ${CI:+--tap} test`.
- jasonkarns/bats-mock@eacf0fecb9f4: `package.json:43` `"test": "echo todo"`.
- Pode@89797a301afe `pode.build.ps1:962` three-counter gate, `:389` pinned installs; PSDepend@a7ab90cf716f `psakeFile.ps1:48`; dbatools@e273a4164bdf `tests/appveyor.pester.ps1:66` (`PesterRequiredVersion = "6.0.0"`), `:520` `FailedCount -gt 0`; PSReadLine@2984546f62da `PSReadLine.build.ps1:50-65` xUnit, no Pester.

## AI-agent angle

- An agent that reads "the census passed" must read the bats exit status too: in F3 the original census was green on a run that executed zero tests.
- Agents add `bats_test_function` loops and `eval`-generated tests because the docs show them; the plan and static count then disagree, and the tempting fix is to delete the census. The pin file is the stated alternative.
- Agents "fix" a red test by adding `|| true`, `skip`, or commenting the test out (F7, F10, F11). These three are the diff patterns to grep in agent PRs: added `|| true` after `[`/`[[`/`assert_*`, added `skip` as first line, added `# @test`.
- Agents on bash 5 write mid-test `[[ ]]` that passes locally and is vacuous on bash 3.2 (F6); only a bash:3.2 leg or the mutation recipe shows it.
- For Pester, agents copy `if ($r.FailedCount -gt 0)` (the dbatools form), which ignores container failures, zero tests and skips (F15).
- Agents pass `-AllowNullOrEmptyForEach` to make a 6.x discovery error go away; that turns a loud failure into an empty Describe (F16).
- Every agent-facing check output here is the violation; an empty output with exit 0 is pass. That is cheap to read and does not need judgment.

## Contested / evolving

- **Pin for dynamic files: per-file `N path` versus a golden TAP.** A golden plan file is more general but churns with every added test; I measured only the pin file. Open.
- **Whether bats loses result lines under `--jobs` is version-dependent or only load-dependent.** Measured: 1.11.1 and 1.14.0 lost lines on a loaded host, 1.13.0 did not in 1 run, 1.14.0 did not in 9 bats-assert runs. n is too small for a rate; no root cause; the two 255s are unexplained. Unverified: read only: upstream bats-core issue tracker was not searched.
- **L6 (unchecked `run`).** On assertion-library suites 204 hits are by construction; L6 stays advisory. Whether to keep it as a gate for application suites is a policy choice.
- **Hand-listed runner cross-check (F12).** For a wrapper that deliberately runs a subset (asdf's Go harness) the right answer may be an exclude list, not "run everything". Left to the owner.
- **Dynamic suites and `--count`.** `bats --count FILE` runs top-level code, so a generator that needs the environment fails to count. The census then reports `gather error`; Bash-it and dokku show this is common for application suites.
- **Pester 6.2.0 vs 5.9.1.** Default behaviour on an empty `-ForEach` differs (6.x fails discovery); `Run.Exit`/`PassThru`/`Throw` behaved the same in my runs. 6.x release date 2026-07-07.
- **macOS and BSD.** bash 3.2.57 is emulated by an Alpine image; macOS-specific `sed`/`grep`/`xargs -r` behaviour is unverified: read only.

## Sources

| URL | what | date / era | why |
|---|---|---|---|
| https://bats-core.readthedocs.io/en/stable/usage.html | `bats` usage, formatters, `--count`, `--jobs` | stable docs, bats 1.14.0 | primary; junit and plan behaviour |
| https://bats-core.readthedocs.io/en/stable/writing-tests.html | `bats_test_function`, `run` flags, `bats_require_minimum_version` | bats 1.14.0 | primary; F1, F8 |
| https://bats-core.readthedocs.io/en/stable/gotchas.html | `[[ ]]` and `set -e` gotcha | bats 1.14.0 | primary; F6 |
| https://github.com/bats-core/bats-core/blob/master/man/bats.1.ronn | man page | master 0c92eb4c418d | primary; option set |
| https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md | changelog (`--jobs` abort, junit meaning, `bats_test_function`) | through Unreleased, 2026 | primary; F3, F5 |
| https://pester.dev/docs/migrations/breaking-changes-in-v6 | removed constructs in v6 | 2026 | primary; P2 |
| https://pester.dev/docs/usage/configuration | `Run.*` options, `TestExtension` | Pester 6 | primary; F18 |
| https://pester.dev/docs/usage/discovery-and-run | discovery vs run phase | Pester 5/6 | primary; F17 |
| https://github.com/pester/Pester/releases/tag/6.0.0 | 6.0.0 release notes (`-AllowNullOrEmptyForEach`), published 2026-07-07 | 2026 | primary; F16 |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/foreach-object?view=powershell-7.6 | `ForEach-Object -Parallel` | PowerShell 7.6 | primary; F19 |
| https://testanything.org/tap-version-13-specification.html | TAP 13: plan line, result lines | spec | primary; census plan semantics |
| https://git-scm.com/docs/gitglossary | pathspec magic (`:(exclude)`, `:(icase)`), gitlinks | git docs | primary; F2, F18 |
| https://github.com/asdf-vm/asdf/blob/cb72590e9f96/cmd/asdf/main_test.go | Go harness for bats | cb72590e9f96 | primary tree; F12 |
| https://github.com/dokku/dokku/tree/5eaab7cc1a14/tests | dokku bats suite | 5eaab7cc1a14 | primary tree; F2, F11 |
| https://github.com/Bash-it/bash-it/blob/81929690975f/test/run | Bash-it parallel runner | 81929690975f | primary tree; F4 |
| https://github.com/bats-core/bats-assert/tree/697471b7a89d/test | bats-assert tests | 697471b7a89d | primary tree; F6 |
| https://github.com/bats-core/bats-file/tree/6bee58bec7c2 | bats-file tests and fixtures | 6bee58bec7c2 | primary tree; F2 |
| https://github.com/basherpm/basher/tree/7c3d238ce263 | basher with vendored submodules | 7c3d238ce263 | primary tree; F2 |
| https://github.com/syndbg/goenv/tree/368cbb1d6fcf/test | goenv suite | 368cbb1d6fcf | primary tree; F2 |
| https://github.com/nodenv/nodenv/tree/76e9ae5087c2 | nodenv suite | 76e9ae5087c2 | primary tree; clean control |
| https://github.com/jasonkarns/bats-mock/blob/eacf0fecb9f4/package.json | `"test": "echo todo"` | eacf0fecb9f4 | primary tree; F13 |
| https://github.com/badgerati/Pode/blob/89797a301afe/pode.build.ps1 | Pode Pester gate | 89797a301afe | primary tree; F15, F18 |
| https://github.com/RamblingCookieMonster/PSDepend/blob/a7ab90cf716f/psakeFile.ps1 | PSDepend gate | a7ab90cf716f | primary tree; F15 |
| https://github.com/dataplat/dbatools/blob/e273a4164bdf/tests/appveyor.pester.ps1 | dbatools gate | e273a4164bdf | primary tree; F15 |
| https://github.com/PowerShell/PSReadLine/blob/2984546f62da/PSReadLine.build.ps1 | PSReadLine (xUnit, no Pester) | 2984546f62da | primary tree; scope note |

Honest caveats: provisioning deviations (goenv three files removed from the run copy; asdf per-file runs with a fresh `BASE_DIR`; dbatools `tests/` materialised from a sparse index); the host load while the parallel sweeps ran; the first Bash-it sweep is contaminated and not used; second and third reps of the Bash-it parallel sweep were not completed.
