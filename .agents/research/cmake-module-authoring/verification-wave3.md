---
title: "Verification wave 3: cmake-module-authoring"
verifies: ../cmake-module-authoring.md
model: opus
date: 2026-09-26
---

# Verification wave 3: cmake-module-authoring

This pass re-checked every MUST rule and every version claim in
[`cmake-module-authoring.md`](../cmake-module-authoring.md) on 2026-09-26. It
concentrates on what the wave-3 revision added: CMK-MOD-17 to -20 and
measurements C15 to C21.

- **Binaries:** CMake 3.31.12, 4.3.4 and 4.4.2 from the host's ocx mirror,
  and ninja 1.13.2.
- **Normative text:** the `Help/*.rst` and `Modules/` files shipped inside
  the 4.4.2 package, which match tag v4.4.2.
- **Other sources:** the GitLab issues API, the GitHub releases API and the
  PyPI JSON API.
- **Wave-2 runners:** re-run unchanged as a regression check (`m/run-m1.sh`,
  `-m3`, `-m4`, `-m5`, `-m6`, `-m7`, `-m8`, `-m10`, `-m11`, `run-g.sh`,
  `run-g2.sh`). Every result matched wave 2.

Fixtures and runners are under
`/home/mherwig/.cache/cmake-measure-scratch/verify-module-authoring/w3/`:

| File | What it does |
|---|---|
| `stall.py` | A server that accepts every connection and never sends a byte |
| `run.sh` | C15 to C21, run concurrently on all three lines |
| `run-gitenv.sh` | C18 with `set(ENV{…})` inside `CMakeLists.txt` |
| `fx/run_doc_cmds.py` | Pulls each `sh` block out of the consolidation's ruleset and runs it verbatim on `fx/bad`, `fx/good` and `fx/edge` |

Build trees are deleted after each run. The brief limits writes to this
ledger, the consolidation and that scratch directory, so the sources were not
copied into the repository.

Tallies: 44 claims checked. 36 confirmed (row 44 only in part), 5 corrected
(rows 14, 15, 20, 21 and 25) and 3 unverifiable (rows 41 to 43). Every
correction was applied to the consolidation in place and logged under
"verify wave 3" in its Revision log. No rule ID was renumbered, retired or
changed in severity.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-MOD-01 (MUST): a failed `file(DOWNLOAD)` without `STATUS` exits 0 and prints nothing | CONFIRMED | `run-m1.sh` `dl_nostatus`: `rc=0 :: -- reached end` on 3.31.12, 4.3.4 and 4.4.2; `dl_status`: `code=37` | — |
| 2 | CMK-MOD-02 (MUST): `EXPECTED_HASH` is the in-download integrity check | CONFIRMED | `dl_badhash`: `file DOWNLOAD HASH mismatch`, rc=1 on all three lines | — |
| 3 | CMK-MOD-03 (MUST): TLS verification is on by default from 3.31; `CMAKE_TLS_VERIFY=0` (env, 3.30) turns it off; explicit `TLS_VERIFY ON` overrides the env | CONFIRMED | `CMAKE_TLS_VERIFY.rst`: "versionchanged 3.31 The default is on. Previously, the default was off."; envvar rst "versionadded 3.30"; `release/3.31.rst:239` "made without a policy"; `run-m3.sh` on all three lines: default `st=60`, default + env 0 `st=0`, ON + env 0 `st=60` | The half about behaviour before 3.31 is normative only (row 42) |
| 4 | `CMAKE_TLS_VERSION` defaults to 1.2 from 3.31; the `TLS_VERSION` option needs 3.30 | CONFIRMED | `CMAKE_TLS_VERSION.rst`: "versionadded 3.30" and "versionchanged 3.31 The default is TLS 1.2. Previously, no minimum version was enforced"; `file.rst:821-822` `TLS_VERSION` "versionadded 3.30" | — |
| 5 | CMK-MOD-04 (MUST): an unchecked `execute_process(COMMAND false)` does not stop the configure; on 4.x an includer's `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL ANY` halts a bare probe, and 3.31.12 ignores that variable | CONFIRMED | `exec_false` rc=0 on all three lines; `exec_probe_var` rc=0 on 3.31.12, and on 4.3.4 and 4.4.2 rc=1 with `execute_process failed command indexes` | — |
| 6 | `COMMAND_ERROR_IS_FATAL` needs 3.19; its `NONE` value and the variable need 4.0 | CONFIRMED | `execute_process.rst`: "versionadded 3.19"; `NONE` "versionadded 4.0"; `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL.rst` "versionadded 4.0" | — |
| 7 | CMK-MOD-05 (MUST) and C11: a function captures policies at definition; `block(SCOPE_FOR POLICIES)` (3.25) pins like PUSH/POP; variables leak out of the block | CONFIRMED | `run-m4.sh`: `f_in_push CMP0140=[]`, `f_after_pop =[NEW]`, `f_in_block =[]`, `f_after_block =[NEW]`, `LEAKED_FROM_BLOCK=[yes]` on all three lines; `block.rst` "versionadded 3.25" | — |
| 8 | CMK-MOD-08 (MUST): `include_guard(GLOBAL)` in a Find module makes a second `find_package` silently not find the package | CONFIRMED | `run-m5.sh` GLOBAL: `b: Foo_FOUND=[]`, no target, rc=0 on all three lines; NONE and PLAIN run the body twice | — |
| 9 | CMK-MOD-10 (MUST), C7 to C10: only the directory property re-runs CMake; the variable form, an unregistered file and a path created later do not | CONFIRMED | `run-m6.sh` under Ninja: `none rerun=no`, `property rerun=yes`, `variable rerun=no`, `later rerun=no` on all three lines | — |
| 10 | CMK-MOD-11 (MUST): a namespace snapshot writes a credential into `CMakeCache.txt` | CONFIRMED | `run-m7.sh`: `MYMOD_AUTH_TOKEN:STRING=sk-dummy-4b1d` in the cache; the allow-list case prints nothing; on all three lines | — |
| 11 | CMK-MOD-12 (MUST): `Foo_ROOT` outranks the prefix path; `FOO_ROOT` is ignored unless CMP0144 is NEW; a write without `FORCE` keeps the existing entry. CMP0074 is 3.12, CMP0144 is 3.27 | CONFIRMED | `run-m8.sh`: `WHERE=[A]`, `[B]` plus a CMP0144 warning, `[A]`, and `[B]` with `Foo_ROOT=[m8/pb]`, on all three lines; `CMP0074.rst` "versionadded 3.12", `CMP0144.rst` "versionadded 3.27" | — |
| 12 | CMK-MOD-13 (MUST): `CMAKE_HOST_SYSTEM_PROCESSOR` is empty under `cmake -P`; the `OS_PLATFORM` query is set | CONFIRMED | `host_vars`: `HOST_PROC=[]`; `host_query`: `OS_PLATFORM=[x86_64]`; on all three lines | — |
| 13 | CMK-MOD-17 (MUST) and C15: a download with no timeout blocks on a stalled server; `TIMEOUT` or `INACTIVITY_TIMEOUT` returns status 28 and the script exits 0 | CONFIRMED | `run.sh` `dl-none-*`: rc=124 at the 25 s ceiling; `dl-timeout-*` and `dl-inact-*` with T=4: rc=0 after 4 s, `status=28;"Timeout was reached"`, `reached end`; on all three lines | — |
| 14 | CMK-MOD-17 bullet: "a timed-out attempt is retried up to six times" | CORRECTED | `download.cmake.in:96,106`: `set(retry_number 5)` and `foreach(i RANGE ${retry_number})`, so 6 attempts. `fc-url-*` with `INACTIVITY_TIMEOUT 3`: 6 `error: downloading` lines, rc=1 after 103 s on all three lines, and 6 × 3 + 85 = 103 | Now "attempted up to six times (one try plus five retries)". C16 and the formula were already right |
| 15 | CMK-MOD-17 verification: the `FetchContent_Declare` and `ExternalProject_Add` lookaheads use `(?=[^)]*\bURL\b)` | CORRECTED | `fx/edge/edge_urlvar.cmake`: `FetchContent_Declare(k GIT_REPOSITORY ${URL} GIT_TAG v1)` was printed as a finding, because `{URL}` has word boundaries on both sides | Changed to `\sURL\s`. It keeps every planted red (`bad/net.cmake` a and b, `bad/FindBar.cmake`, `edge` m) and drops the false one |
| 16 | CMK-MOD-17 floors: `file(DOWNLOAD)` `TIMEOUT` and `INACTIVITY_TIMEOUT` carry no `versionadded`; `ExternalProject_Add` `INACTIVITY_TIMEOUT` needs 3.19 | CONFIRMED | `file.rst:755,772` have no marker; `ExternalProject.cmake:216-217` (4.4.2) "versionadded 3.19" | — |
| 17 | Corpus: 2 calls set `TIMEOUT` (`grpc__grpc@0f8d72ed71:cmake/download_archive.cmake:31,41`), none sets `INACTIVITY_TIMEOUT` | CONFIRMED | Lookahead over the corpus with Kitware excluded: only the two grpc `file(DOWNLOAD)` calls carry `TIMEOUT`; no `FetchContent_Declare`, `ExternalProject_Add` or `CPMAddPackage` does; no `INACTIVITY_TIMEOUT` anywhere outside Kitware | The denominator of 52 was not recounted (row 44) |
| 18 | CMK-MOD-18 and C17: `TIMEOUT` and `INACTIVITY_TIMEOUT` do not reach a `GIT_REPOSITORY` fetch; `gitclone.cmake.in` reads neither | CONFIRMED | `fc-git-*` (`TIMEOUT 3 INACTIVITY_TIMEOUT 3`): rc=124 at the 45 s ceiling on all three lines; the shipped `gitclone.cmake.in` has 0 case-insensitive `timeout` matches on 3.31, 4.3 and 4.4 | — |
| 19 | C18: `GIT_HTTP_LOW_SPEED_LIMIT` and `_TIME` bound the clone, set from the shell or by a guarded `set(ENV{…})` in `CMakeLists.txt` | CONFIRMED | `fc-genv-*` (shell, TIME=4) and `run-gitenv.sh` (`set(ENV)` under `if(NOT DEFINED ENV{…})`): rc=1 after 12 s with 3 `Operation too slow` lines on all three lines | The `set(ENV)` form is now measured on 4.3.4 too |
| 20 | CMK-MOD-18: "CMake issue 23443 reports the same hang in CI and closed with no change" | CORRECTED | GitLab API issue 23443 ("FetchContent stuck in gitlab-runner pipeline", 3.23.1, opened 2022-04-21, closed 2022-04-23): the stuck log ends `Cloning into 'common-src'... HEAD is now at ced8b31`, so the clone had finished; the reporter suspects the container and no cause is diagnosed | Citation dropped from the rule and from the applied-table row |
| 21 | Key source 15: `download.cmake.in` and `gitclone.cmake.in` are "identical on 3.31.12 and 4.4.2" | CORRECTED | Checked with `/usr/bin/diff` on the shipped files. `download.cmake.in` differs only in the license line (CONFIRMED in substance). `gitclone.cmake.in` 4.4 replaces `LESS 3` with `1 + @git_clone_retries@` and an optional delay; `ExternalProject.cmake:452-470` @ 4.4.2 documents `CMAKE_EP_GIT_CLONE_RETRY_COUNT` (default 2) and `_DELAY` (default 0), both "versionadded 4.4" | Default attempt count is still 3, so C18 holds. CMK-MOD-18 now states the 4.4 knob and the (1 + retries) × T worst case |
| 22 | CMK-MOD-19 (MUST) and C19: CMP0176 is NEW at project scope and unset inside a function pinned below 3.31, on every line | CONFIRMED | `enc-*` (`3.25...4.4` project): `project-scope CMP0176=[NEW]`, `pinned-fn (PUSH, VERSION 3.25) =[]`, `block-3.30-fn =[]`, `block-3.31-fn =[NEW]`, on 3.31.12, 4.3.4 and 4.4.2 | A pin at 3.31 or later gives NEW, which matches the rule's scope |
| 23 | CMP0176 does not warn | CONFIRMED | `CMP0176.rst` @ 4.4.2: "does *not* warn"; `enc-*` ran with `-Werror=dev` and a capturing `execute_process` under a 3.25 pin: rc=0 on all three lines | — |
| 24 | `ENCODING` needs 3.8, its `UTF-8` value 3.11; it is ignored off Windows; `AUTO` was the default from 3.15 to 3.30 | CONFIRMED | `execute_process.rst:154-183`: "versionadded 3.8", "On Windows, … Ignored on other platforms", `AUTO` "the default in CMake 3.15 through 3.30", `UTF-8` "versionadded 3.11" | — |
| 25 | CMK-MOD-19: "0 of the other 45 corpus repos" pass `ENCODING` | CORRECTED | `qt__qtbase@0ef5a8e9ca:src/testinternal/3rdparty/cmake/RunCMake.cmake:168` passes `ENCODING UTF8` to `execute_process`, in a vendored copy of Kitware's test driver; [net] §4 searched only the hyphenated `UTF-8` | Still no shipped module. The rule and severity are unchanged |
| 26 | CMK-MOD-19: Kitware's `shared_internal_commands.cmake:68-76` passes `ENCODING UTF-8`; issue 26262 is the accidental-`AUTO` report | CONFIRMED | Shipped 4.4.2 file, line 75: `ENCODING UTF-8   # Needed to handle non-ascii characters…`; API: issue 26262 "execute_process: Default ENCODING is AUTO instead of documented default NONE", opened 2024-09-04, closed 2024-09-17 | The Windows effect itself is row 41 |
| 27 | CMK-MOD-20 and C20: `add_library` under `-P` prints `add_library command is not scriptable`; `cmake_language(DEFER)` in a file the script `include()`s errors | CONFIRMED | `p-projcmd-*`: that text, rc=1; `p-deferinc-*`: `CMake Error at defer_body.cmake:1 … DEFER CALL may not be scheduled in directory`, rc=1; on all three lines | — |
| 28 | C21: `cmake_language(EXIT)` errors in a project configure and works under `-P` | CONFIRMED | `exitproj-*`: `cmake_language EXIT can be used only in SCRIPT mode`, rc=1; `p-exit-*`: rc=3; on all three lines | — |
| 29 | CMK-MOD-20 floors: `DEFER` 3.19, `EXIT` 3.29 | CONFIRMED | `cmake_language.rst:107` "versionadded 3.19" (Deferring Calls), `:517` "versionadded 3.29" (Terminating Scripts), `:524` "works only in script mode" | — |
| 30 | Verdict 12: C16 to C18 ran FetchContent in direct mode (CMP0168 NEW from the `3.25...4.4` range) | CONFIRMED | Each `fc-*` log prints `CMP0168=NEW`; `CMP0168.rst` "versionadded 3.30" | Sub-build mode was not run (row 43) |
| 31 | CMK-MOD-16 floor: `PARSE_ARGV` 3.7, native command 3.5 | CONFIRMED | `cmake_parse_arguments.rst:17` "versionadded 3.5 … implemented natively", `:29` "versionadded 3.7 The PARSE_ARGV signature" | 4.4 also adds a `PARSE_ARGN` signature (`:36`); gersemi 0.29.1 support for it is untested |
| 32 | CMK-TEST-01 (MUST): `-Werror=author` does nothing in configure mode on 4.3 and earlier | CONFIRMED | `run-m10.sh` configure: `-Werror=author` rc=0 on 3.31.12 and 4.3.4, rc=1 on 4.4.2; `-Werror=dev` rc=1 on all three | — |
| 33 | CMK-TEST-02 (MUST) and C5: no gate spelling fails `-P` on 3.31/4.3; every spelling does on 4.4; 4.4 accepts `-Werror=dev` with a deprecation notice | CONFIRMED | `run-m10.sh` `-P`: five flag sets rc=0 on 3.31.12 and 4.3.4; rc=1 on 4.4.2 with "The error=dev option is deprecated.  Use -Werror=author instead." | — |
| 34 | C6: `FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning"` fails on a warning and passes a clean script | CONFIRMED | `run-m11.sh`: `c6_failre_authorwarn` "Error regular expression found", `c6_failre_clean` Passed, on all three lines | — |
| 35 | CMK-TEST-03 (MUST) and C1 to C4 | CONFIRMED | `run-m11.sh` on all three lines: C1 Passed; C2 Passed; C3 both "Required regular expression found"; C4 fatal Passed, warning Failed | — |
| 36 | gersemi 0.29.1 released 2026-09-14 and still latest; cmakelang 0.6.13 released 2020-08-19 | CONFIRMED | PyPI JSON: gersemi latest `0.29.1 2026-09-14T17:07:27`; cmakelang `0.6.13 2020-08-19T17:15:23` | — |
| 37 | C14: `.gersemirc` `definitions` removes the warnings; `--diff` exits 0, `--check` exits 1 | CONFIRMED | `run-g.sh`: no-defs `--diff` rc=0; `.gersemirc` `--check` "would be reformatted" rc=1 with no warnings; `gersemi.yaml` ignored (warnings back, rc=0) | — |
| 38 | C12 and C13 as corrected by wave 2: a nested parse defeats gersemi; a top-level parse is read | CONFIRMED | `run-g2.sh`: `argn_in_if` and `reassigned_in_if` split one token per line; `parseargv_positional` keeps keyword groups | — |
| 39 | find_ocx wave-3 rows: 5 downloads with no timeout (`ocx.cmake:738,765,1413,1434,1467`); MOD-19 hits `:449`, `:556` under the 3.19 pin at `:180` and `Findocx.cmake:62` (floor 3.15); DEFER guarded at `:641-643` | CONFIRMED | The rule commands on the dirty tree: the MOD-17 lookahead prints 5; the MOD-19 lookahead prints those three module calls (plus 3 in `tests/`); `sed` shows `if(OCX_REFRESH AND NOT CMAKE_SCRIPT_MODE_FILE)` at 641; `Findocx.cmake:36` "works standalone on CMake 3.15+" | — |
| 40 | Header: the mirror serves 3.31.12, 4.3.4 and 4.4.2; upstream is at 4.4.3 | CONFIRMED | `cmake --version` via `ocx package exec`; GitHub releases API: `v4.4.3 2026-08-25`, and also `v4.3.5 2026-09-04` | Results hold for the mirror's patch levels |
| 41 | CMK-MOD-19's premise: under CMP0176 OLD, captured output on Windows is decoded with the console or ANSI code page | UNVERIFIABLE | No Windows host. Normative text only: `CMP0176.rst`, issue 26262 | The consolidation already records it as a gap (Verdict 12); a MUST resting on normative text is allowed |
| 42 | TLS verification was off by default before 3.31 | UNVERIFIABLE | The host has no CMake binary older than 3.31.12; the only evidence is `CMAKE_TLS_VERIFY.rst` | Same gap as wave 2 |
| 43 | Verdict 12: `GIT_HTTP_LOW_SPEED_*` bounds HTTP(S) only, and `ssh://` and `git://` fetches stay unbounded; the sub-build mode uses the same templates | UNVERIFIABLE | Not run: no ssh or git-daemon stall server was set up, and CMP0168 OLD was not measured. git's documentation ties the variables to `http.lowSpeedLimit` | Documented gaps, not rules |
| 44 | [net]'s denominator "52 module download calls" | CONFIRMED in part | The 2 calls with `TIMEOUT` and the 0 with `INACTIVITY_TIMEOUT` hold corpus-wide (row 17). The 52 depends on [net]'s "module-like file" filter and was not recounted: the corpus has 57 `file(DOWNLOAD` calls in total and 18 outside Kitware | Counted under row 17 |

## Verification commands exercised

`fx/run_doc_cmds.py` extracts each `sh` block from the consolidation's ruleset
at run time and runs it with `bash -c`. `MODULE_DIR` and the other variables
point at `fx/bad`, `fx/good` or `fx/edge`. For the awk checks, `MODULE_FILE`
is looped over each `*.cmake` file. `fx/bad` and `fx/good` are wave 2's
fixtures plus a new `net.cmake`; `fx/edge/edge_urlvar.cmake` holds the
adversarial cases.

| Rule | Planted violation | Outcome on bad | Outcome on clean | Reads as |
|---|---|---|---|---|
| CMK-MOD-01 | `file(DOWNLOAD)` with no `STATUS`, one-line and multi-line | red: both printed | green: empty | empty = pass |
| CMK-MOD-02 | downloads with no hash | red: both printed | green: empty | empty = pass |
| CMK-MOD-03 | download with no `TLS_VERIFY` | red: printed | green: empty | empty = pass (floor below 3.31) |
| CMK-MOD-04 | `execute_process` with only `OUTPUT_VARIABLE` | red: printed | green: empty | empty = pass |
| CMK-MOD-05 | definition after the pin, before the pin, and with no pin | red: all 4 files printed | green: empty on the PUSH/POP, block and indented-block forms | empty = pass |
| CMK-MOD-08 | Find module without FPHSA; `include_guard(GLOBAL)`; target not namespaced | red: file listed; guard and `bar_lib` listed for reading | green: first empty; second lists `Bar::Bar` for reading | first: empty = pass; second: read each hit |
| CMK-MOD-10 | `list(APPEND CMAKE_CONFIGURE_DEPENDS …)` | red: printed | green: empty | empty = pass |
| CMK-MOD-11 | namespace loop with `MYMOD_AUTH_TOKEN` set (`run-m7.sh`) | red: cache line printed on all three lines | green: empty | empty = pass |
| CMK-MOD-12 | upper-case `FOO_ROOT` without `FORCE` | listed for reading | lists `Foo_ROOT … FORCE` | read each hit |
| CMK-MOD-13 | `CMAKE_SYSTEM_PROCESSOR`; `CMAKE_HOST_SYSTEM_PROCESSOR` in a `-P` path | red: both greps print | green: both empty | empty = pass |
| CMK-MOD-17 (file) | `file(DOWNLOAD)` with no timeout (`bad/net.cmake:1`, `bad/dl.cmake`) | red: 3 calls printed | green: the `INACTIVITY_TIMEOUT` call in `good/net.cmake` not printed; `good/dl.cmake` (a wave-2 fixture with no timeout) printed, which is correct | empty = pass |
| CMK-MOD-17 (FetchContent, EP), original `\bURL\b` | URL fetches with no timeout | red: `a`, `bar` and `b` printed | green on `good/`; **false red** on `edge` `GIT_REPOSITORY ${URL}` | replaced |
| CMK-MOD-17 (FetchContent, EP), corrected `\sURL\s` | same | red: `a`, `bar` and `b` printed; `edge` `m` (URL, no timeout) printed | green on `good/`; `edge` `k` no longer printed | empty = pass |
| CMK-MOD-18 (first) | `GIT_REPOSITORY … TIMEOUT 10` | red: printed | green: empty (git fetches with no timeout keyword) | empty = pass |
| CMK-MOD-18 (second) | — | lists the git fetch for the bound read | lists the two git fetches for the bound read | read each hit |
| CMK-MOD-19 | `OUTPUT_VARIABLE` and `ERROR_VARIABLE` captures with no `ENCODING`, one-line and multi-line | red: both printed, plus `bad/dl.cmake` | green: the `ENCODING UTF-8` call, the `RESULT_VARIABLE`-only call and the `RESULTS_VARIABLE`-only call are not printed | empty = pass (floor or pin below 3.31) |
| CMK-MOD-20 | unguarded `cmake_language(DEFER CALL foo)` | red: printed | green: empty | a hit must sit under a guard |
| CMK-TEST-01 | CI with no version axis | empty, which is the finding | prints the `cmake_version` line | empty = finding |
| CMK-TEST-02 | `-P`, `-S` and `--build-and-test` with no gate | lists all three for reading | lists the gated `-S` and the `-P` case | read each hit |
| CMK-TEST-03 | `WILL_FAIL TRUE`; a regex that matches only the message | red: both printed | prints only the regex pinned to the severity header | every `WILL_FAIL` or header-less regex is a finding |

The wave-3 checks were also run on find_ocx, read-only. The MOD-17 file
lookahead printed 5 blocks. The MOD-19 lookahead printed `ocx.cmake:449`,
`:556` and `Findocx.cmake:62`. The MOD-20 grep printed `ocx.cmake:642`, which
is guarded.

## Unverifiable

- **Windows decoding under CMP0176 OLD (row 41).** There is no Windows host.
  The evidence is normative only: `CMP0176.rst` and issue 26262. CMK-MOD-19
  stays MUST because `ENCODING` is ignored on every other platform.
- **TLS default before 3.31 (row 42).** The host has no binary older than
  3.31.12. The evidence is `CMAKE_TLS_VERIFY.rst` only.
- **`ssh://` and `git://` transports, and the FetchContent sub-build mode
  (row 43).** Neither was run. Both are documented gaps in the consolidation,
  not rules.
