# The inventory commands

Read this when running step 0, or when re-running one command as the exit check
of steps 1 to 4. Every command runs from the repository root and
was run against a planted violating tree and a planted compliant tree on CMake
3.31.12 and 4.4.2 (2026-09-26). Each of `I1` to `I12` is a `grep -r` with an explicit directory
operand and no early-exiting reader (I4 adds a filtering `grep -v`), so it
cannot zero a count under `set -o pipefail` (`CMK-CORE-05`).

Contents: [How to read the output](#how-to-read-the-output) ·
[Links, scope and flags](#links-scope-and-flags) ·
[Parses and reserved names](#parses-and-reserved-names) ·
[Build type, fetches and policy knobs](#build-type-fetches-and-policy-knobs) ·
[Floors and hand-off tokens](#floors-and-hand-off-tokens) ·
[Standards and warnings-as-errors](#standards-and-warnings-as-errors) ·
[The flag-set check](#the-flag-set-check) ·
[The variable-existence check](#the-variable-existence-check)

## How to read the output

Own-code commands exclude `_deps` and `build*` trees. They do not exclude a
vendored directory such as `third_party/`: a hit there goes into the plan file
as `flagged-not-converted` and is never edited. Each command below says whether
empty output is the pass, or whether the output is a list to read.

The commands match upper-case spellings (`INCLUDE_DIRECTORIES(`) and a space
before the paren (`target_link_libraries (`), because CMake command names are
case-insensitive and legacy trees use both. A call split so that its name and
paren sit on different lines is not seen, so read those by hand.

## Links, scope and flags

`I1`, bare links (`CMK-TGT-01`). The output is a list to read, not a pass or
fail. A call whose token after the target name is not `PUBLIC`, `PRIVATE` or
`INTERFACE` is the finding. `-A2` shows the continuation of a split call.

```sh
grep -rni -A2 --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'target_link_libraries[[:space:]]*(' .
```

`I2`, directory scope (`CMK-TGT-03`, SHOULD, flag and never auto-rewrite).
Empty output = pass. Each hit is a step-2 row. A call inside an
`if(CMAKE_VERSION VERSION_LESS ...)` branch is usually a dead twin of the live
call, so record both (jsoncpp at `3347a4b8` pairs three `add_compile_definitions`
calls with dead `add_definitions` twins).

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e '^[[:space:]]*include_directories[[:space:]]*\(' -e '^[[:space:]]*add_definitions[[:space:]]*\(' \
  -e '^[[:space:]]*add_compile_options[[:space:]]*\(' -e '^[[:space:]]*link_directories[[:space:]]*\(' \
  -e '^[[:space:]]*link_libraries[[:space:]]*\(' -e '^[[:space:]]*add_compile_definitions[[:space:]]*\(' .
```

`I3`, global flag writes (`CMK-TGT-04`). Empty output = pass. Read each hit: a
value that does not start with the same variable's own `${...}` is an overwrite,
MUST, because it drops a toolchain's `_INIT` `-fPIC` and the shared link fails.
A `string(APPEND ...)` or a `set()` that starts with its own value is an
append, SHOULD. A `..._FLAGS_INIT` hit inside a toolchain file is the correct
channel and not a finding.

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'set[[:space:]]*\([[:space:]]*CMAKE_C_FLAGS' -e 'set[[:space:]]*\([[:space:]]*CMAKE_CXX_FLAGS' \
  -e 'set[[:space:]]*\([[:space:]]*CMAKE_EXE_LINKER_FLAGS' -e 'set[[:space:]]*\([[:space:]]*CMAKE_SHARED_LINKER_FLAGS' \
  -e 'set[[:space:]]*\([[:space:]]*CMAKE_STATIC_LINKER_FLAGS' -e 'set[[:space:]]*\([[:space:]]*CMAKE_MODULE_LINKER_FLAGS' \
  -e 'string[[:space:]]*\([[:space:]]*APPEND[[:space:]]+CMAKE_C_FLAGS' \
  -e 'string[[:space:]]*\([[:space:]]*APPEND[[:space:]]+CMAKE_CXX_FLAGS' .
```

## Parses and reserved names

`I4`, legacy parses (`CMK-LANG-04`). Empty output = pass. Every printed line is
a parse that forwards `${ARGN}`: a finding inside a `function()`, and
`CMK-LANG-08`'s inside a `macro()`. A call with `PARSE_ARGV` on its next line
also prints, so read it. The `grep -v` filters lines and never exits early.

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'cmake_parse_arguments[[:space:]]*\(' . | grep -v -e 'PARSE_ARGV' -e 'PARSE_ARGN'
```

Each hit's plan-file row names the command, whether it is public (another
project calls it) or private, and each multi-value keyword that takes lists of
files, targets or paths. The fix for a public command carries the flatten line
from SKILL.md's "Legacy parses", or a changelog entry naming the change.

`I5`, reserved option names (`CMK-LANG-11`). Empty output = pass. A hit is the
finding: an `option()` on a built-in name does not override a consumer's `-D`,
it leaks into the parent that pulled this tree in with `add_subdirectory`.

```sh
grep -rnE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e '^[[:space:]]*option[[:space:]]*\([[:space:]]*"?[Cc][Mm][Aa][Kk][Ee]_' \
  -e '^[[:space:]]*option[[:space:]]*\([[:space:]]*"?_[Cc][Mm][Aa][Kk][Ee]_' .
```

For a `set(<name> ... CACHE ...)` whose name starts with `CMAKE_`, run
[the variable-existence check](#the-variable-existence-check).

## Build type, fetches and policy knobs

`I6`, build-type writes (`CMK-TGT-17`). Empty output = nothing to check. Each of
these is a finding: a hit in a library's files outside a `PROJECT_IS_TOP_LEVEL`
guard, a `CACHE` hit after `project()` without `FORCE` (a no-op), and a hit
before `project()` whose only multi-config test is `CMAKE_CONFIGURATION_TYPES`.

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'set[[:space:]]*\([[:space:]]*CMAKE_BUILD_TYPE' .
```

`I7`, forced acquisition (`CMK-DEP-07`). Empty output = not applicable. A hit
under a test, example, benchmark, docs or tool directory, or behind
`PROJECT_IS_TOP_LEVEL`, `NOT <dep>_FOUND` or `NOT TARGET`, is not a finding.
Any other hit is a step-5 row, settled by step 5's offline subproject probe.

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'FetchContent_MakeAvailable' -e 'CPMAddPackage' .
```

`I8`, policy knobs (`CMK-DEP-15`). Empty output = pass. A hit in a preset's
`cacheVariables`, a workflow `env`, or at file scope with no restore after
exactly one add is the finding. So is the value 3.5 in an application build.

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' \
  -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' .
```

## Floors and hand-off tokens

`I9`, dependency floors (`CMK-VER-05`). This scan must include fetched and
vendored trees. Name the directories that exist in this tree as operands (a
missing one prints "No such file or directory" and exits 2, which is not a
pass). Empty output = pass. A live line with no `...<max>` of 3.10 or above is
the finding: below 3.5 it is a hard error on CMake 4.x, and 3.5 to 3.9 fails the
gate on 3.31 and 4.4.

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' \
  -e 'cmake_policy[[:space:]]*\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' build/_deps third_party
```

When neither a fetched nor a vendored CMake tree exists, `I9` is not
applicable: record it `vacuous` and do not run it.

`I10`, Conan 1 tokens. Empty output = continue. Any hit stops the skill and
hands off to `cpp-packaging`: the tree needs a manager migration first.

```sh
grep -rni --include='CMakeLists.txt' --include='*.cmake' -e 'conan_basic_setup' -e 'conanbuildinfo' .
```

`F1`, the own-code floor, and `F1b`, floors through a variable and own-code
policy pins, are in SKILL.md step 1.

## Standards and warnings-as-errors

`I11`, standard setters (`CMK-TGT-05`). Empty output = nothing to check. A hit
whose enclosing `if()` lacks `NOT DEFINED CMAKE_CXX_STANDARD` is the finding.
In the same guard there must be `CMAKE_CXX_STANDARD_REQUIRED ON`
(`CMK-TGT-06`) and `CMAKE_CXX_EXTENSIONS OFF` (`CMK-TGT-07`).

```sh
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'set[[:space:]]*\([[:space:]]*CMAKE_CXX_STANDARD[[:space:]]' .
```

`I12`, literal warnings-as-errors (`CMK-TGT-09`). Empty output = pass. A hit
outside a developer option that defaults OFF is the finding. Report
`-Werror=<category>` separately.

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' -e '-Werror' -e '/WX' .
```

## The flag-set check

The second half of the exit check of steps 2 and 4. `I2` and `I3` prove the
old command is gone, not that the conversion kept the build: a deleted
`include_directories` with nothing added passes `I2`. Record the flag set of
one source per target at the step-1 commit, then again after each diff. Pass
the plan file's configure options too.

```sh
# SRCFILE = one source of the converted target. Writes flags-before.txt at the
# step-1 commit (rename the output), flags-after.txt after the diff.
SRCFILE=src/core.c
cmake -S . -B build-flags --fresh "$GATE" -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
jq -r --arg f "$SRCFILE" '[.[] | select(.file | endswith($f)) | .command | split(" ")[] | select(startswith("-"))] | sort | unique | .[]' \
  build-flags/compile_commands.json > flags-after.txt
diff flags-before.txt flags-after.txt
```

Empty `diff` output = pass. A line starting `<` is a flag the diff lost, the
finding. A line starting `>` is a flag it added, which the plan file must name.
A `<` and a `>` line for two `-I` spellings of one directory are not a loss:
compare the two paths with `realpath` first (jsoncpp: `-I.../include` against
`-I.../src/lib_json/../../include`, both lines).
Measured on Chipmunk2D (3.31.12 and 4.4.2, gcc 15.2.1, 2026-09-26): the step-2
and the corrected step-4 diffs print nothing, and a step 4 that replaced
`-std=gnu99` with `target_compile_features(... c_std_99)` alone prints
`< -std=gnu99`.

## The variable-existence check

Run the `CMK-LANG-11` lookup block in `cmake-build/language.md` with the pinned
binary for every `CMAKE_*` name a diff introduces. It expands `<LANG>` and
`<CONFIG>` first, so the real `CMAKE_CXX_FLAGS` is not reported as invented. A
count of 0 is an invented name, the finding. A count of 1 is a documented name.
Measured on 3.31.12 and 4.4.2: `CMAKE_CXX_STANDARD_EXTENSIONS` and
`CMAKE_DEBUG_PREFIX_MAP` read 0, while `CMAKE_CXX_FLAGS`, `CMAKE_CXX_EXTENSIONS`,
`CMAKE_BUILD_TYPE` and `CMAKE_UNITY_BUILD` read 1.
