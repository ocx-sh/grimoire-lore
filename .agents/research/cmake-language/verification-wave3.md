---
title: "Verification wave 3 — cmake-language.md (CMK-LANG)"
verifies: .agents/research/cmake-language.md
model: opus
date: 2026-09-26
---

# Verification wave 3 — CMK-LANG

Binaries: CMake 3.31.12, 4.3.4 and 4.4.2 (`ocx package exec kitware/cmake:<3.31|4.3|4.4>`),
GNU Awk 5.3.2, on 2026-09-26. The upstream primary sources are CMake `Help/*.rst` at the
named tag (gitlab.kitware.com raw) and `cmake --help-*` on 4.4.2. Scratch sources, the lint
fixtures and the corpus outputs are in
`/home/mherwig/.cache/cmake-measure-scratch/verify-language/`: `src/extra`, `src/propagate`,
`src/cmp0174`, `src/argn`, `lint/{bad,good}`, `git02` (planted), `git02c` (clean),
`doc-lang01.sh` and `doc-lang02.sh` (the corrected blocks, extracted verbatim from the
consolidation). This wave re-ran the consolidation's own runner
(`cmake-language/scratch/language-consolidation/run.sh`) with
`SCRATCH=…/verify-language/rerun`. The build trees could not be deleted, because the
permission system refused `rm -rf`. They use `LANGUAGES NONE` and take 4.1 MB with the
sources.

Result: 44 claims checked. 27 are confirmed, 10 are corrected in place, and 7 could not be
verified. Every MUST rule's check goes red on a planted violation and stays empty on clean
input. For LANG-01 and LANG-02 this holds only after the correction.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | L1: an unquoted `${A}` in `if()` is looked up again | CONFIRMED | `run.sh`, all three lines: `M1 unquoted: TRUE (double dereference)`, `M1 quoted: FALSE` | |
| 2 | L2: an empty unquoted operand is a hard error | CONFIRMED | `M6 empty unquoted operand exit=1` on all three lines | Also `if(${N} GREATER 0)` with `N` empty exits 1 on all three lines (`src/extra`, `-DEMPTYN=1`) |
| 3 | L3: bare `foreach` drops the empty element | CONFIRMED | `M3 bare foreach iterations=2 IN LISTS iterations=3` on all three lines | |
| 4 | L4: `foreach(${ARGN})` in a macro sees 2 of 3 arguments | CONFIRMED | `M4 … iterations=2 of 3 passed` on all three lines | |
| 5 | L5: `$<CONFIG>` is literal at configure time | CONFIRMED | `M5 genex at configure: $<CONFIG>` on all three lines | |
| 6 | L6 and Verdict 6: `SET CMP0054 OLD` becomes a hard error at "4.3+" | CORRECTED | 3.31.12 exit 0 with a deprecation warning. 4.3.4 and 4.4.2 exit 1 with "may not be set to OLD behavior … no longer supports it". `CMP0054.rst` @ v4.0.0 sets `REMOVED_IN_CMAKE_VERSION` to 4.0, and `REMOVED_PROLOGUE.txt` says "must be set to NEW" | The error starts at 4.0. It was measured only on 4.3.4 and 4.4.2 (see Unverifiable 7). Fixed in L6, Verdict 6, Conflict 6 and failure mode 10 |
| 7 | CMP0054 was removed in 4.0 and only ever covered quoted operands | CONFIRMED | `cmake --help-policy CMP0054` on 4.4.2: "Only interpret if() arguments as variables or keywords when unquoted", "Prior to removal in CMake version 4.0" | |
| 8 | L7: `PARSE_ARGN` parses on 4.4.2, and parses nothing silently on 3.31.12 and 4.3.4 | CONFIRMED | 4.4.2 `VALUE='a;b'`. 3.31.12 and 4.3.4 `VALUE=''` with exit 0. The only warning on 3.31.12 is the unused `-DFORCE_ARGN` | |
| 9 | L8: `PARSE_ARGV` inside a macro is a hard error | CONFIRMED | All three lines print "PARSE_ARGV called with ARGC='' that is not an unsigned integer" and exit 1 | |
| 10 | L9: `PARENT_SCOPE` in a macro lands one scope above the scope that holds the call | CONFIRMED | All three lines: wrapper `''`, caller `'from-macro'`, subdirectory `''`, parent directory `'from-macro'` | |
| 11 | L11: `PARSE_ARGV` 3.7, `PARSE_ARGN` 4.4, `KEYWORDS_MISSING_VALUES` 3.15, native 3.5 | CONFIRMED | `--help-command cmake_parse_arguments` on 4.4.2: `versionadded:: 3.5` ("implemented natively"), 3.7, 4.4 and 3.15. The 4.3.4 help has 0 `PARSE_ARGN` matches | |
| 12 | L12: the reserved-identifier text | CONFIRMED | `--help-manual cmake-language` on 4.4.2: "CMake reserves identifiers that: begin with CMAKE_ … _CMAKE_ … _ followed by the name of any CMake Command" | |
| 13 | Upstream's newest release is 4.4.3 | CONFIRMED | `api.github.com/repos/Kitware/CMake/releases/latest`: `v4.4.3`, published 2026-08-25 | |
| 14 | LANG-01 (MUST): quote every `${…}` comparison operand | CONFIRMED | L1 and L2. Also measured on all three lines: `if("x" STREQUAL ${A})` is TRUE and `if(${G} GREATER 3)` is TRUE, both through a second lookup (`src/extra` V1 and V2) | The rule text stands. Its check is row 15 |
| 15 | LANG-01 verification grep | CORRECTED | The published grep, run on `lint/bad`, printed line 5 only. It missed `if(${N} GREATER 0)` (line 7) and `elseif("x" STREQUAL ${A})` (line 9) | Widened with `LESS`, `GREATER`, `STRLESS`, `STRGREATER` and `PATH_EQUAL` for the left operand, plus a `W` pattern for right operands. On the whole corpus it prints 904 lines, against 767 before. Sampling every 9th of the 137 extra lines gave 16 of 16 real |
| 16 | LANG-02 floor: `IN LISTS` and `IN ITEMS` exist since 3.0 | CONFIRMED | `Help/command/foreach.rst` @ v3.0.0 line 40: `foreach(loop_var IN [LISTS [list1 [...]]] …` | |
| 17 | LANG-02 diff-scoped check | CORRECTED | The published command in `git02` missed the untracked `sub/new.cmake` (`foreach(y ${ARGN})`, `foreach(z ${A} ${B})`) and printed `grep: gone.cmake: No such file or directory` for the deleted file | Adds `git ls-files --others --exclude-standard` and `--diff-filter=d`, and loosens the pattern to any bare `${` after the loop variable. It prints all 3 planted lines and stays empty on `git02c` (`RANGE ${N}`, `IN LISTS`, `IN ITEMS ${A}`, `ZIP_LISTS`) |
| 18 | LANG-03 (SHOULD) grep | CONFIRMED | On `lint/bad` it prints `message(STATUS "$<CONFIG>")`. On `lint/good` it prints nothing | |
| 19 | LANG-04 (MUST): `PARSE_ARGV` in a function, floor 3.7 | CONFIRMED | Floor from row 11. The grep prints the planted `cmake_parse_arguments(arg "" "VALUE" "" ${ARGN})` and nothing on `lint/good`. find_ocx's 6 legacy parses are at `ocx.cmake:442,692,872,1072,1296,1327`, and its floor is `cmake_minimum_required(VERSION 3.19)` | `:1327` forwards `${args}`, which is a copy of the unquoted `${ARGN}` and has the same loss |
| 20 | LANG-04 rationale: through `${ARGN}`, `VALUE ""` looks like an omitted keyword, and `PARSE_ARGV` avoids both problems | CORRECTED | `src/argn` on 3.31.12 and 4.4.2, CMP0174 OLD and NEW. The legacy form gives `VALUE ""` → `missing='VALUE'`, the same as a bare `VALUE`, while an omitted keyword gives `missing=''`. `PARSE_ARGV` with CMP0174 unset gives `VALUE ""` → unset and `missing=''`, the same as omitted | The `;` split half stands. The empty value is kept apart only where CMP0174 is NEW, which makes it LANG-07's case |
| 21 | LANG-05 (MUST): no `PARSE_ARGN` below a 4.4 floor | CONFIRMED | Row 8. The grep prints the planted line and the floor line. Outside `Tests/` the corpus has 0 `PARSE_ARGN` hits | |
| 22 | LANG-05 rationale: the `latest` docs show `PARSE_ARGN` without its floor | CORRECTED | The 4.4.2 help carries `.. versionadded:: 4.4` on the `PARSE_ARGN` paragraph | The trap is that older binaries raise no error, not that the docs omit the version |
| 23 | LANG-06 (MUST): the `_UNPARSED_ARGUMENTS` awk, plus the Qt, Hunter and find_ocx findings | CONFIRMED | On `lint/bad` it prints "never read" at lines 15 and 25 and "message reads y_UNPARSED_ARGUMENTS, parse prefix is x" at line 21. On `lint/good` it prints nothing. On find_ocx it prints `ocx.cmake:442` and `:692`. `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3786` prints `${arg_UNPARSED_ARGUMENTS}` after parsing `__qt_sps_arg`. `cpp-pm__hunter@997fab148b:…/hunter_patch_unrelocatable_text_files.cmake:21` prints `${hunter_UNPARSED_ARGUMENTS}` after parsing `x` | The corpus re-run reproduces 475 files, 453 "never read" and 3 "message reads" |
| 24 | L10 and LANG-06: "1,076 calls", "42 %" | CORRECTED | `grep -hoE 'cmake_parse_arguments[[:space:]]*\('` over the 475 files gives 1,015. `grep -ho 'cmake_parse_arguments'` gives 1,076, which counts every mention of the word, comments included | 453 of 1,015 is 45 % |
| 25 | LANG-06 floor: "any", because `UNPARSED_ARGUMENTS` is as old as the command | CONFIRMED | `Modules/CMakeParseArguments.cmake` @ v3.0.0 line 115: `set(${prefix}_UNPARSED_ARGUMENTS)` | |
| 26 | LANG-07 floors: CMP0174 3.31, `KEYWORDS_MISSING_VALUES` 3.15 | CONFIRMED | `--help-policy CMP0174`: "introduced in CMake version 3.31". Row 11 gives 3.15 | |
| 27 | LANG-07 advice: below CMP0174 NEW, read `KEYWORDS_MISSING_VALUES` to separate `""` from an omitted keyword | CORRECTED | `src/cmp0174` on 3.31.12 and 4.4.2. Unset: `empty: defined=0 missing=''` and `omitted: defined=0 missing=''`. NEW: `empty: defined=1 missing=''` and `bare: defined=1 missing='VALUE'` | Below NEW the two cases cannot be told apart. Under NEW, `DEFINED` also fires for a bare keyword, so the list is what rejects it |
| 28 | LANG-08: functions outnumber macros "about 4 to 1" | CORRECTED | Re-count with `^\s*function\(` and `^\s*macro\(` over the corpus: 4,739 to 1,563 (3.0 to 1). The shape audit's own table gives 4,704 to 1,577, and 3,050 to 754 without `Kitware__CMake` | About 3 to 1 corpus-wide, 4 to 1 only without Kitware |
| 29 | LANG-09 (SHOULD) awk | CONFIRMED | It prints `helpers.cmake:2` for a planted `macro(set_out)` holding `PARENT_SCOPE`, and nothing on `lint/good` | |
| 30 | LANG-10 (MUST): `return(PROPAGATE)` in a top-level `block()` skips the rest of the file; floor 3.25 | CONFIRMED | `src/propagate` on all three lines: "Cannot set "R": current scope has no parent" (`(dev)` on 3.31.12 and 4.3.4, `(author)` on 4.4.2), exit 0, and the `message` after `endblock()` never prints. The awk prints `CMakeLists.txt:29` on `lint/bad` and nothing on `lint/good`, where the call sits in a `function()`. `return.rst` and `block.rst` carry `versionadded:: 3.25`, and CMP0140 was introduced in 3.25 | The rationale now names all three lines |
| 31 | LANG-10 and the find_ocx table: "0 non-test uses" in the corpus | CORRECTED | Outside `Tests/` there are 35 non-comment `return(PROPAGATE` lines, all in `Kitware__CMake/Modules`. The depth-0 awk flags only 2 comment lines (`FindPython/Support.cmake:17`, `UseJava.cmake:580`) | The forbidden shape still has 0 uses. The rule now warns that the awk also matches comments |
| 32 | LANG-11 (MUST): reserved names, and its grep and variable-list check | CONFIRMED | Row 12. The grep prints `option(CMAKE_MY_KNOB` and `option(_cmake_private`, and nothing for `GOOD_KNOB`. `cmake --help-variable-list` gives 1 for `CMAKE_VERBOSE_MAKEFILE`, 0 for `CMAKE_MY_KNOB` and 0 for `CMAKE_CXX_FLAGS`, which is listed as `CMAKE_<LANG>_FLAGS`, as the rule warns. The corpus hits outside Kitware are exactly `microsoft__vcpkg@c4ee5a52d7:ports/duktape/CMakeLists.txt:3` and `ports/usockets/CMakeLists.txt:7` | |
| 33 | LANG-11 rationale: `option()` on a built-in name "can silently override a consumer's `-D` or preset" | CORRECTED | `src/extra` on all three lines: `-DCMAKE_VERBOSE_MAKEFILE=ON` with `option(CMAKE_VERBOSE_MAKEFILE "v" OFF)` gives `'ON'`. A child's `option(CMAKE_UNITY_BUILD … ON)` gives the parent `CMAKE_UNITY_BUILD='ON'` | The harm is a global leak into the consumer, not an override. The MUST stands on the normative reservation |
| 34 | LANG-13: `CACHE INTERNAL` implies `FORCE` | CONFIRMED | `--help-command set` on 4.4.2 line 87: "Use of this type implies FORCE". The grep prints the planted `CACHE STRING … FORCE` and passes over `CACHE INTERNAL` | |
| 35 | LANG-14 floors: `$CACHE{}` 3.13, CMP0126 3.21 | CONFIRMED | `cmake-language.7.rst` has 0 `CACHE{` at v3.12.0 and 2 at v3.13.0. `--help-policy CMP0126`: `versionadded:: 3.21`, "does not remove any normal variable of the same name". The loop prints a planted `set(CMAKE_MY_KNOB ON)` and nothing on clean input | |
| 36 | LANG-15: `option()` never coerces the value | CONFIRMED | `-DXOPT=yes` on all three lines gives `XOPT='yes'`, `STREQUAL "ON"` FALSE and truthy TRUE. The grep prints the planted `if(XOPT STREQUAL "ON")` | |
| 37 | Citations: `CMakeFindDependencyMacro.cmake:93`, `:122`, and `CheckIPOSupported.cmake:125-133` at `Kitware__CMake@e8befb989b` | CONFIRMED | `:93` is `find_package(${dep} ${ARGN}`, `:122` is `macro(find_dependency dep)`, and `:125-133` is `macro(_ipo_not_supported output)` with its two `PARENT_SCOPE` writes | |
| 38 | LANG-01 corpus: 557 hits in 43,962 `if`-family calls, with 0 false positives in 30 | UNVERIFIABLE | Comes from language-rules' multi-line parser, which was not re-run | See Unverifiable |
| 39 | Conflict 2: 524 of 986 `${ARGN}`-form calls (53 %) | UNVERIFIABLE | The parser's core and scaffold split was not re-run | |
| 40 | LANG-02 corpus: 1,650 bare `foreach` hits, 40 % of all calls | UNVERIFIABLE | Not re-counted. A line grep found 5,368 `foreach(` lines in the whole corpus, but its scope differs from the parser's | |
| 41 | LANG-08: 11 of 15 sampled macros need caller scope | UNVERIFIABLE | A hand sample that was not re-read | |
| 42 | LANG-12: 66 % of LLVM's and CMake's options unprefixed; 7 of 11 repos ≥ 75 % prefixed | UNVERIFIABLE | Not re-counted | |
| 43 | LANG-11: 1,502 of 1,504 corpus options are clean | UNVERIFIABLE | The 2 violations reproduce (row 32). The denominator was not re-derived: a line grep finds 1,720 `option(` lines corpus-wide, including Kitware and `Tests/` | |
| 44 | `CMP0054 OLD` errors on 4.0, 4.1 and 4.2 | UNVERIFIABLE | Rests on normative text only (row 6). No 4.0-4.2 binary is on the host | |

## Verification commands exercised

Fixtures: `lint/bad/CMakeLists.txt` (one planted violation per rule), `lint/bad/helpers.cmake`
(a macro with `PARENT_SCOPE`, plus a `set()` that shadows an option), `lint/good/CMakeLists.txt`
(the clean counterpart), `git02` (a planted diff with a modified, an untracked and a deleted
file) and `git02c` (a clean diff). Each command was run with `sh` exactly as published. The
LANG-01 and LANG-02 blocks were extracted verbatim from the edited consolidation.

| Rule | Command | Planted violation | Clean input |
|---|---|---|---|
| LANG-01 (published) | `grep` with `V`, 5 operators | **Missed 2 of 3.** Printed `:5` only, not `if(${N} GREATER 0)` or `elseif("x" STREQUAL ${A})` | empty |
| LANG-01 (corrected) | `grep` with `V` and `W`, 13 alternatives | Printed `:5`, `:7` and `:9`, all 3 | empty (`"${A}"`, `if(GOOD_KNOB)`, `${pkg}_FOUND`, `"${N}" GREATER 0`) |
| LANG-02 (published) | `git diff --name-only` piped to `xargs grep` | **Missed the untracked file** (2 violations). Printed `CMakeLists.txt:3` plus a grep error for the deleted file | empty |
| LANG-02 (corrected) | `{ git diff --diff-filter=d …; git ls-files -o …; }` piped to `xargs grep` | Printed all 3 lines (`CMakeLists.txt:3`, `sub/new.cmake:1`, `:3`) | empty |
| LANG-03 | `grep` for `$<` in `message`, `string`, `file(WRITE)` and `if` | Printed `:31` | empty |
| LANG-04 | `grep cmake_parse_arguments(` minus the `PARSE_ARGV` and `PARSE_ARGN` lines | Printed `:15` | empty |
| LANG-05 | `grep PARSE_ARGN`, plus the floor grep | Printed `:25` and the floor line `VERSION 3.25` | first grep empty |
| LANG-06 | the `unparsed.awk` block | Printed "never read" at `:15` and `:25`, and a mismatch at `:21` | empty |
| LANG-09 | the macro and `PARENT_SCOPE` awk | Printed `helpers.cmake:2` | empty |
| LANG-10 | the depth-0 `return(PROPAGATE` awk | Printed `CMakeLists.txt:29` | empty (the call sits in a `function`) |
| LANG-11 | `option(` with a `CMAKE_` or `_CMAKE_` prefix, in any case | Printed `:3` and `:4` | empty (`GOOD_KNOB`, `set(CMAKE_CXX_STANDARD 20)`) |
| LANG-11 lookup | `cmake --help-variable-list` piped to `grep -c -x -e "$NAME"` | `CMAKE_MY_KNOB` gave 0, which is the finding | `CMAKE_VERBOSE_MAKEFILE` gave 1 |
| LANG-13 | `CACHE <TYPE> … FORCE` | Printed `:34` | empty (`CACHE INTERNAL` without `FORCE`) |
| LANG-14 | the `option()` name to `set()` loop | Printed `helpers.cmake:4` | empty |
| LANG-15 | `STREQUAL "ON"` or `"OFF"` | Printed `:32` | empty |

LANG-07, LANG-08 and LANG-12 rely on reading, so their commands only produce candidate
lines. They were not run against fixtures.

## Unverifiable

1. **Corpus figures from the language-rules parser** (rows 38, 39 and 40) were not
   re-derived. They come from `cmake-language/scratch/language-parser/parse_fixed.py`, which
   this wave did not re-run. Re-running it and reading a fresh 30-hit sample would settle
   them.
2. **Hand samples** (row 41, the 15 macros; row 42, the prefix tables) were not re-read.
3. **LANG-11's denominator** (row 43). The numerator's 2 violations reproduce. The
   1,504-option base was not re-derived.
4. **4.0-4.2 behaviour for `CMP0054 OLD`** (row 44). The claim rests on `CMP0054.rst` @
   v4.0.0 and `REMOVED_PROLOGUE.txt`, because no 4.0, 4.1 or 4.2 binary is on the host.
5. **Open questions 1-4** of the consolidation (`return(PROPAGATE)` in an `include()`d file
   or under `cmake -P`, migration behaviour, a 30-hit sample of LANG-06's false positives,
   and whether CMP0174 interacts with CMK-MOD-05) were left open. They are research, not
   claims.
