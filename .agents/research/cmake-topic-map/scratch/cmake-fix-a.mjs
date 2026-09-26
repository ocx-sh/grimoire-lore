export const meta = {
  name: 'cmake-fix-a',
  description: 'CMake research program phase 8: one fixer per drafted artifact applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per artifact with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
// FILES = [{ group, files, model, checker_target, findings: [{ file, line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "group": "cmake-build-a",
  "files": [
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/language.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/module-authoring.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/presets-and-ci.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/testing.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/versions-and-policies.md"
  ],
  "model": "opus",
  "checker_target": "rules/cmake-build.md",
  "findings": [
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 8,
    "severity": "nit",
    "kind": "notes-violation",
    "finding": "check-artifacts.py flags two dead globs, '**/.gersemirc' and '**/.cmake-format*'. Authoring note 1 keeps both deliberately (0 corpus files, pinned), so this is expected checker output, not a defect.",
    "fix": "No edit. Record in the publishing receipt that the two dead-glob findings are accepted under authoring note 1."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 10,
    "severity": "nit",
    "kind": "portability",
    "finding": "check-artifacts.py flags '**/.gersemirc' and '**/.cmake-format*' as dead globs. Both are deliberate per authoring note 1, and the checker is clean with --allow-absent. With --forbid ocx it also flags 'ocx' and 'ocx-sh' on line 15, the `repository:` catalog key that every house rule shares (rules/gradle-build.md:14). No other OCX name, fleet path, owner__repo name or repo@sha appears in the six files.",
    "fix": "No text change. Run the checker as: check-artifacts.py rules/cmake-build.md --root . --allow-absent '**/.gersemirc' --allow-absent '**/.cmake-format*', and record the repository key as the sanctioned exception to note 9."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 20,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test on the index. Removing these lines causes no mistake: 20-21 (a tagline that repeats the silent-pass paragraph), 73-74 (the no-linter sentence, which the CORE-04 rationale on line 137 already carries), 142-143 (author-facing meta about one level deep), and 177-179 (author guidance on writing new verifications).",
    "fix": "Delete lines 20-21, 73-74, 142-143 and 177-179."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 57,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The CORE-01 canary cannot go red on the preset hole the index cites it for (lines 29-31, non-negotiable 1, the line 134 cell, presets-and-ci failure mode 7). The canary is an AUTHOR_WARNING. A preset with warnings.deprecated=false or errors.deprecated=false lets a real dependency deprecation through -Werror=dev with rc 0 on 3.31.12 and 4.3.4, but the canary through that same preset still exits 1 (pass). Only grep (a) catches the hole. A second canary with message(DEPRECATION) through the preset measured rc 0 (red) on 3.31.12 and 4.3.4 for both deprecated-false presets, rc 1 (green) on a clean preset, rc 0 under -Werror=author below 4.4, and rc 1 on 4.4.2.",
    "fix": "After line 57 insert:\n# 1b. The deprecation canary. A preset that sets deprecated to false still passes canary 1 and fails this one on 4.3 or older. Exit 1 is the pass.\nprintf 'message(DEPRECATION \"gate canary\")\\n' > canary-dep.cmake\n\"$BIN/cmake\" --preset \"$PRESET\" --fresh -B build-canary-dep \"$GATE\" -DCMAKE_PROJECT_INCLUDE=\"$PWD/canary-dep.cmake\"\nIn the CMK-CORE-01 Verification cell (line 134), replace \"The Gate's canary on each leg's binary and preset: exit 0 is the finding.\" with \"The Gate's two canaries on each leg's binary and preset: exit 0 from either is the finding. Only the deprecation canary goes red on a preset that sets `deprecated` to `false` (measured 2026-09-26 on 3.31.12 and 4.3.4).\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 58,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "\"a build tree always fails it\" (line 58) and \"`gersemi --check .` descends into build trees and fails on generated files\" (the CORE-04 rationale, line 137) are false as stated. gersemi 0.29.1 honours .gitignore. Measured: rc 1 with an unignored in-tree build/, and rc 0 once build/ is in .gitignore. Neither of the two admissible consolidations for this row carries the claim.",
    "fix": "Line 58: replace \"Tracked listfiles only: a build tree always fails it.\" with \"Tracked listfiles only: a build tree that .gitignore does not exclude fails it.\" Line 137 rationale: replace \"`gersemi --check .` descends into build trees and fails on generated files\" with \"`gersemi --check .` descends into any build tree that `.gitignore` does not exclude and fails on its generated files\"."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 73,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: \"No maintained semantic CMake linter exists ... are the lint layer\" restates CMK-CORE-04's rationale in the same file, so removing it causes no mistake.",
    "fix": "Delete the sentence spanning lines 73-74: \"No maintained semantic CMake linter exists (as of 2026-09-26), so the gate and the named greps in each depth file are the lint layer.\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 97,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Index non-negotiable 7 allows the MSVC runtime \"only through CMAKE_MSVC_RUNTIME_LIBRARY in a preset or before the first project()\". CMK-TGT-16 (targets.md:96) also sanctions a set() inside if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY) after project() and a set() behind a default-OFF option. targets-and-abi conflict 3 explicitly rejected the \"never after project()\" reading. So the index and the depth file give different answers on whether a guarded set() after project() blocks a merge.",
    "fix": "In rules/cmake-build.md line 97 replace \"the MSVC runtime only through `CMAKE_MSVC_RUNTIME_LIBRARY` in a preset or before the first `project()`,\" with \"the MSVC runtime only through `CMAKE_MSVC_RUNTIME_LIBRARY` or its property, never a `/MD` or `/MT` flag, and never by a `set()` that runs by default after `project()` outside `if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY)`,\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 129,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The CORE-05 grep (f), for a MUST row, misses the long-option early exits: `| grep --quiet` and `| grep --max-count=1` in a pipefail script printed nothing. `grep -E -q`, `| head` and `grep -m1` are caught. The widened form below catches both long forms and still ignores `| grep -c`.",
    "fix": "Append to the xargs grep on line 129: -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--quiet' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--silent' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--max-count'. In the CMK-CORE-05 cell (line 138), replace \"It catches separated flags (`grep -E -q`), ripgrep's `-q` and `grep -m1`.\" with \"It catches separated flags (`grep -E -q`), ripgrep's `-q`, `grep -m1`, and `--quiet`, `--silent` and `--max-count`.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 155,
    "severity": "fix",
    "kind": "trigger",
    "finding": "CMK-CI-01 binds 'every file it includes', but an included presets file can have any name (presets/linux.json) and loads no rule by glob. That is a residual miss of the same kind as --presets-file, and no routing line names it. Editing only the included file is the failure mode presets-and-ci lists as failure mode 2.",
    "fix": "In the routing row, replace \"Editing a presets file, including one passed by `cmake --presets-file` (CMake \u2265 4.4), which loads no rule by glob,\" with \"Editing a presets file, including a file another presets file `include`s or one passed by `cmake --presets-file` (CMake \u2265 4.4), neither of which loads a rule by glob,\"."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 158,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: this routing row points at CMK-CORE-04 in the same file, whose rule text already says migrate and never extend.",
    "fix": "Delete line 158 (the \"Finding a `.cmake-format*` file or a `cmake-format` step\" row)."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 191,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: the Siblings bullet for the two skills repeats routing rows 159-160, and the \"repeat only the MUST rows\" clause is author-facing.",
    "fix": "Delete lines 191-192 (the `cmake-dependency-triage` and `cmake-modernize` Siblings bullet)."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build.md",
    "line": 193,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: \"C++ source code has no rule in this set\" is implied by the globs, so removing it causes no mistake.",
    "fix": "Delete lines 193-194."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/language.md",
    "line": 139,
    "severity": "nit",
    "kind": "style",
    "finding": "In the CMK-LANG-13 rationale, \"The two sanctioned hand-offs are CMK-MOD-12's `<Name>_ROOT` (module-authoring) and never `CMAKE_TOOLCHAIN_FILE`\" lists a prohibition as a sanctioned hand-off and does not parse.",
    "fix": "Replace that sentence with: \"The one sanctioned `FORCE` hand-off is CMK-MOD-12's `<Name>_ROOT` (module-authoring). `CMAKE_TOOLCHAIN_FILE` is never forced (CMK-TC-01, toolchains-and-providers).\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/language.md",
    "line": 152,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The LANG-11 lookup (a MUST row) reads invented names as documented. Rewriting leading placeholders such as <PROJECT-NAME>_VERSION and <PackageName>_ROOT to [A-Za-z0-9_]+ turns them into patterns that match any CMAKE_* name with that suffix. Measured on 4.4.2: CMAKE_MYLIB_VERSION, CMAKE_MY_ROOT and CMAKE_MY_KNOB_BINARY_DIR each count 1 (documented). CMAKE_MY_KNOB still counts 0, so the check can go red, but it misses this class. With the filter below, all three count 0 and CMAKE_CXX_FLAGS, CMAKE_CXX_FLAGS_RELEASE and CMAKE_UNITY_BUILD still count 1.",
    "fix": "Replace line 152 with these two lines:\nsed -e 's/<CONFIG>/[A-Z]+/g' -e 's/<[^>]*>/[A-Za-z0-9_]+/g' \"$D/c.txt\" \"$D/cxx.txt\" > \"$D/all.txt\"\ngrep -e '^CMAKE_' -e '^_CMAKE_' \"$D/all.txt\" > \"$D/patterns.txt\"\nAlso replace line 144 with: # CMK-LANG-11 lookup: expand <LANG> and <CONFIG> first, or CMAKE_CXX_FLAGS reads as invented. Keep only patterns that start with CMAKE_, or <PROJECT-NAME>_VERSION reads CMAKE_MYLIB_VERSION as documented."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/module-authoring.md",
    "line": 117,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "The shipped CMK-MOD-11 configure probe hard-codes `-Werror=author` on a bare `cmake` taken from PATH. On a 3.31 or 4.3 binary that gate is inert, which is the exact pattern CMK-CORE-01 forbids. Authoring notes 3.5 and 7 require shipped probes to spell the gate per binary.",
    "fix": "Replace line 117 with these two lines:\nGATE=-Werror=author # -Werror=dev on CMake 4.3 or older (CMK-CORE-01)\nMYMOD_AUTH_TOKEN=\"$DUMMY_SECRET\" cmake -S . -B \"$BUILD_DIR\" \"$GATE\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/module-authoring.md",
    "line": 155,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Two different gersemi gate commands. module-authoring gives `gersemi --check \"${MODULE_DIR:-.}\"` (line 155 and the MOD-15 cell at line 167). The index gates on tracked listfiles only (line 59) because a directory walk reaches build trees. Measured with gersemi 0.29.1: in a git tree with an unignored in-tree build directory, `gersemi --check .` exits 1 on the generated CMakeFiles/*.cmake. The same tree with build/ in .gitignore exits 0. So MOD-15's own command goes red on a compliant module project whose configured fixtures sit in an unignored build*/ directory, which the file's own preamble (lines 21-23) expects.",
    "fix": "Line 155: replace \"The gate is `gersemi --check \"${MODULE_DIR:-.}\"` (gersemi 0.29.1, released\" with \"The gate is the index's tracked-files form, `git ls-files -z -- '*CMakeLists.txt' '*.cmake' | xargs -0 -r gersemi --check` (gersemi 0.29.1, released\". Line 167 Verification cell: replace \"`gersemi --check \"${MODULE_DIR:-.}\"`. Exit 0 passes.\" with \"The gersemi gate above. Exit 0 passes.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/presets-and-ci.md",
    "line": 105,
    "severity": "fix",
    "kind": "style",
    "finding": "The cmake fence at lines 99-110 is not in gersemi 0.29.1 layout. It uses 2-space indentation, and `gersemi --check` exits 1 ('would be reformatted'). The other eight cmake fences in the set pass.",
    "fix": "Replace lines 105-108 with:\n    find_program(PROJ_LAUNCHER NAMES sccache ccache)\n    if(PROJ_LAUNCHER)\n        set(CMAKE_CXX_COMPILER_LAUNCHER \"${PROJ_LAUNCHER}\")\n    endif()"
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/presets-and-ci.md",
    "line": 120,
    "severity": "nit",
    "kind": "style",
    "finding": "\"The fix PR, #11489, closed unmerged\" is a bare issue number in shipped text, and it is ambiguous outside the runner-images context.",
    "fix": "Replace \"The fix PR, #11489, closed unmerged.\" with \"The fix PR, actions/runner-images#11489, closed unmerged.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/testing.md",
    "line": 13,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "testing.md assigns the install-and-consume job to CMK-CI in presets-and-ci.md, and names CMK-INST-18 as 'the round trip itself'. presets-and-ci.md lines 19-20 say the round trip as a CI job is CMK-INST-18 in install-and-export.md. The index (lines 78 and 99) makes CMK-INST-01 the round trip. Three files name three different owners for the same thing.",
    "fix": "Replace \"Test presets, the offline job and the install-and-consume job are `CMK-CI` in `presets-and-ci.md` (the round trip itself is `CMK-INST-18` in `install-and-export.md`).\" with \"Test presets and the offline job are `CMK-CI` in `presets-and-ci.md`. The install round trip is `CMK-INST-01`, and its CI job is `CMK-INST-18`, both in `install-and-export.md`.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/testing.md",
    "line": 105,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The TEST-09 smoke (a MUST row) passes when the consumer fails to configure. ctest -N on a failed or partial build tree still prints 'Total Tests: 0'. Measured on 3.31.12 (-Werror=dev) and 4.4.2 (-Werror=author): a library whose AUTHOR_WARNING fails the gate, and which also leaks its BUILD_TESTING tests, gave configure rc=1, yet the final grep printed 'Total Tests: 0' (pass). A leaking library that configures cleanly went red, and a compliant one went green. With the chained form below, the failing library prints nothing (the finding).",
    "fix": "Replace lines 105-106 with the single line:\ncmake -S \"$W/asub\" -B \"$W/asub-build\" -G Ninja \"$GATE\" && ctest --test-dir \"$W/asub-build\" -N > \"$W/asub-tests.txt\"\nReplace line 107 with: # Must print the line. Empty output means the library's tests leaked, or the consumer failed to configure: both are findings.\nOn line 99, change \"W: a scratch\" to \"W: a fresh, empty scratch\"."
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/versions-and-policies.md",
    "line": 67,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The CMK-VER-05 dependency-floor scan (a MUST row) misses two old-floor shapes that fail the gate. Both configured under add_subdirectory with rc 1 on 3.31.12 (-Werror=dev) and on 4.4.2 (-Werror=author): 'cmake_minimum_required (VERSION 3.8)', with a space before the paren (common in old third-party trees), and a call split across lines ('cmake_minimum_required(' then 'VERSION 3.5)'). The scan printed neither. With the widened patterns below, both are caught, the four original hits still print, and the compliant tree stays empty.",
    "fix": "In lines 67-71, replace each 'cmake_minimum_required\\(' with 'cmake_minimum_required[[:space:]]*\\(' and each 'cmake_policy\\(' with 'cmake_policy[[:space:]]*\\('. Before line 72 (the operands line), add the line:\n  -e '^[[:space:]]*cmake_minimum_required[[:space:]]*\\([[:space:]]*$' \\\nIn the paragraph at lines 75-83, after \"Commented lines do not match.\" add: \"A hit that ends in `cmake_minimum_required(` is a call split across lines, so read its next line.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/versions-and-policies.md",
    "line": 88,
    "severity": "nit",
    "kind": "notes-violation",
    "finding": "Authoring note 5.3 reduces CMK-VER-06 to a one-line citation naming its owners. The row still restates DEP-15's mechanism, its value 3.10 and its port-tool exception, and DEP-30's remedies. That duplicated text will drift from dependencies.md.",
    "fix": "Replace the CMK-VER-06 Rule cell with: \"Citation only. A stale dependency floor is CMK-DEP-15's on CMake 4.x and CMK-DEP-30's on CMake 3.x, both in `dependencies.md`. Floor: `CMAKE_POLICY_VERSION_MINIMUM` is CMake 4.0.\""
   },
   {
    "set": "rules/cmake-build.md (index) + cmake-build/{versions-and-policies,language,module-authoring,testing,presets-and-ci}.md",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/versions-and-policies.md",
    "line": 101,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "CMK-VER-04 (MUST) says to guard any variable newer than the floor, and its table lists CMAKE_CXX_SCAN_FOR_MODULES at 3.28 (confirmed versionadded 3.28 on 4.4.2). The same file's 'right' example (line 55) sets it unguarded under a 3.25 floor, as CMK-TGT-18 and non-negotiable 8 prescribe. The VER-04 grep ('CXX_MODULES') does not match it either. Two rules answer 'guard this set()?' differently. The unguarded set is harmless, because 3.25 simply never reads the variable.",
    "fix": "In the CMK-VER-04 Rule cell, after \"and guard a policy with `if(POLICY CMPxxxx)`.\" insert \"Setting a variable that an older CMake never reads, such as `CMAKE_CXX_SCAN_FOR_MODULES`, needs no guard.\""
   }
  ]
 },
 {
  "group": "cmake-build-b",
  "files": [
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/dependencies.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/install-and-export.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/targets.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/toolchains-and-providers.md"
  ],
  "model": "opus",
  "checker_target": "rules/cmake-build.md",
  "findings": [
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
    "line": 50,
    "severity": "nit",
    "kind": "verification-dishonest",
    "finding": "The simulation pipes configure through `| tee`, so the configure exit code is lost. Measured on 3.31.12 with a gate failure: the script reports only gmake's \"No rule to make target 'Makefile'\" (rc 2) from the build step, not the configure error that CMK-BZL-08 names as the finding.",
    "fix": "Replace `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DBUILD_SHARED_LIBS=OFF 2>&1 | tee wrap-configure.log` with `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DBUILD_SHARED_LIBS=OFF >wrap-configure.log 2>&1 || { cat wrap-configure.log; exit 1; }`"
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
    "line": 118,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "CMK-BZL-09 to CMK-BZL-15 carry no Floor field, and neither do the three section intros that hold them (CI and Generated Descriptions, Before Reporting Drift, Package Managers Across the Seam). Authoring note 6 requires a Floor: field on every rule. The other sections in the file state one.",
    "fix": "Append \" Floor: any CMake.\" to the paragraph ending at line 118 (after \"Set `FILE` to each file you will edit or report on.\"). Append \" Floor: any CMake.\" to the paragraph ending at line 139 (after \"catches a vendored directory (`googletest-1.16.0`).\"). Append \" Floor: Conan 2.30.0 and Bazel 7.2.0 for CMK-BZL-14, any vcpkg for CMK-BZL-15.\" to the paragraph ending at line 161 (after \"vcpkg-tool 2026-07-27.\")."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
    "line": 155,
    "severity": "nit",
    "kind": "style",
    "finding": "The CMK-BZL-13 verification names three commands but no empty-output clause (note 7).",
    "fix": "Append to the cell: \" Empty output on either side means that side has no mapping to derive: read the other side only.\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
    "line": 195,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Failure mode 12 calls it an agent mistake to spell the gate -Werror=dev on 4.4. That contradicts pinned decision 2 and CMK-CORE-01, which both require -Werror=dev when one command line serves both sides, and the file's own simulation, which hard-codes GATE=-Werror=dev. I measured -Werror=dev on 4.4.2: it fails the configure exactly as -Werror=author does (install-absolute-destination fixture, rc 1 under both spellings). The real failure mode is the reverse: -Werror=author on 3.31 or 4.3 is accepted and does nothing (rc 0 on both lines).",
    "fix": "Replace line 195 with: \"12. **Spelling the gate `-Werror=author` on the wrapper's 3.31 line,** where it is accepted and does nothing (`CMK-CORE-01`).\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/bazel-seam.md",
    "line": 199,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "The Re-check list does not name its D-items, which authoring note 6 requires (every other depth file in the set labels D1, D4, D7 and so on). Line 202 also cites a bare \"#1129\" without its repository.",
    "fix": "Replace lines 199-201 with three bullets: \"- D5: the rules_foreign_cc default CMake and version table (`CMK-BZL-08`) at every release after 0.16.0.\" / \"- D4: Conan and vcpkg-tool tags (`CMK-BZL-14`, `CMK-BZL-15`).\" / \"- D1: the simulation's gate spelling on CMake 4.5 (`CMK-CORE-01`).\". On line 202 replace \"(#1129,\" with \"(rules_foreign_cc#1129,\"."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/dependencies.md",
    "line": 100,
    "severity": "fix",
    "kind": "portability",
    "finding": "The CMK-DEP-08 (MUST) command \"target_link_libraries\\([^)]*[[:space:]]$NAME[[:space:])]\" fails under zsh, the default agent shell on macOS and on this host. zsh reads `$NAME[` as an array subscript and aborts with \"invalid subscript\", so there is no output and no hit. Measured: under bash the command lists the planted three-line `dep` call and is empty on `dep::dep`. Under zsh it errors out on both fixtures.",
    "fix": "In the CMK-DEP-08 verification cell replace `[[:space:]]$NAME[[:space:])]` with `[[:space:]]${NAME}[[:space:])]`"
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/dependencies.md",
    "line": 192,
    "severity": "nit",
    "kind": "unsupported-claim",
    "finding": "The CMP0170 claim is true only for a bare `VERSION 3.25` floor. I measured on 3.31.12 and 4.4.2: a bare-3.25 tree missing a source directory exits 0 without the flag and 1 with it. The pinned `3.25...4.4` range already exits 1 without the flag. The phrase \"floor-3.25 tree\" reads as the pinned tree.",
    "fix": "Replace \"a floor-3.25 tree missing one source directory still exits 0\" with \"a tree with a bare `VERSION 3.25` floor, no `...<max>`, missing one source directory still exits 0\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/dependencies.md",
    "line": 213,
    "severity": "nit",
    "kind": "contradiction",
    "finding": "CMK-DEP-11's rule says never set the retired CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES. Its verification then calls the gate \"legitimate only on a 4.0 to 4.2 leg\". Authoring note 4.4 says the retired experimental gates are deleted, and under the pinned stance CPS always ships beside a Config package, so a 4.0 to 4.2 consumer never needs the gate.",
    "fix": "Replace \"The gate is legitimate only on a 4.0 to 4.2 leg, with the UUID that tag documents.\" with \"A hit is the finding on every leg: the Config package CPS ships beside serves 4.0 to 4.2.\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/install-and-export.md",
    "line": 14,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The text says the round-trip script \"verifies CMK-INST-01 to -08\". CMK-INST-07 and CMK-INST-08 are reading heuristics, and their own verification cells say so. The consolidation scopes the script to -01 to -06.",
    "fix": "Replace \"One script verifies CMK-INST-01 to -08 and\" with \"One script verifies CMK-INST-01 to -06 and\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/install-and-export.md",
    "line": 184,
    "severity": "nit",
    "kind": "style",
    "finding": "The CMK-INST-23 verification grep has no empty-output clause (note 7).",
    "fix": "After \"then read each hit.\" insert \" Empty output means the row does not apply.\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/targets.md",
    "line": 103,
    "severity": "fix",
    "kind": "style",
    "finding": "This cmake fence (lines 99-112) is not in gersemi 0.29.1 layout. It indents with 2 spaces inside if() blocks, and `gersemi --check` fails with a 4-space diff. Authoring note 8 requires gersemi layout.",
    "fix": "Indent line 103 as `    set(CMAKE_CXX_STANDARD 17)`, and lines 108, 109 and 110 as `    set(CMAKE_CXX_STANDARD 17)`, `    set(CMAKE_CXX_STANDARD_REQUIRED ON)` and `    set(CMAKE_CXX_EXTENSIONS OFF)` (4 spaces each)."
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/targets.md",
    "line": 160,
    "severity": "nit",
    "kind": "style",
    "finding": "The CMK-TGT-14 verification grep has no empty-output clause (note 7).",
    "fix": "After \"a bare system name is a finding.\" insert \" Empty output = nothing to check.\""
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/toolchains-and-providers.md",
    "line": 112,
    "severity": "fix",
    "kind": "style",
    "finding": "The marker-provider cmake fence fails `gersemi --check` (0.29.1): its one-line cmake_language call exceeds the line width, and gersemi wraps it.",
    "fix": "Replace line 112 with the four lines: `cmake_language(` / `    SET_DEPENDENCY_PROVIDER marker_provide` / `    SUPPORTED_METHODS FIND_PACKAGE` / `)`"
   },
   {
    "set": "cmake-build depth set B: rules/cmake-build/targets.md, install-and-export.md, dependencies.md, toolchains-and-providers.md, bazel-seam.md (plus rules/cmake-build.md index for contradiction, glob and deletion checks)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cmake-build/toolchains-and-providers.md",
    "line": 124,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The text says \"Repeat D1 for each file\" that a chainload or user_toolchain names. The inline command carries only two of D1's four patterns (it drops `message(FATAL_ERROR` and `project(`) and searches only a `cmake` directory. A chained toolchain elsewhere, or one containing project(), reads clean.",
    "fix": "Replace the inline command with: `NAME=aarch64.cmake; grep -rniE --include=\"$NAME\" -e 'execute_process' -e 'message[[:space:]]*\\(FATAL_ERROR' -e 'project[[:space:]]*\\(' -e 'enable_language' .` Empty output = pass."
   }
  ]
 },
 {
  "group": "rules/cpp-packaging.md",
  "files": [
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/conan.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md"
  ],
  "model": "opus",
  "checker_target": "rules/cpp-packaging.md",
  "findings": [
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 60,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The authors' gate line `\"$VCPKG_ROOT/vcpkg\" install \"$PORT\" --overlay-ports=ports` fails in any repository with a top-level vcpkg.json, which is the usual overlay-port layout. Measured with vcpkg-tool 2026-09-26: \"error: In manifest mode, `vcpkg install` does not support individual package arguments.\" With `--classic` added, vcpkg computes the install plan for the overlay port.",
    "fix": "Replace line 60 with: \"$VCPKG_ROOT/vcpkg\" install \"$PORT\" --overlay-ports=ports --classic"
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 88,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Non-negotiable 3 and the gate note (line 71) key the lock obligation on `requires` ranges only. CMK-CONAN-09 keys it on `requires` or `tool_requires` ranges. A ranged tool_requires with no lock passes the index's wording.",
    "fix": "Line 88: replace \"An application whose `requires` use a version range\" with \"An application whose `requires` or `tool_requires` use a version range\". Line 71: replace \"where no `requires` uses a version range\" with \"where no `requires` or `tool_requires` uses a version range\"."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 94,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Non-negotiable 9 says every conandata.yml source entry carries a sha256, with no exception. The depth row CMK-CONAN-23 names two exceptions: googlesource +archive with a commit URL and a comment, and a git source with a full commit fetched by Git(self).fetch_commit. An agent that reads only the index would flag or \"fix\" entries the depth row clears.",
    "fix": "Replace \"| 9 | Every `conandata.yml` source entry carries a `sha256` and is fetched through `get(self, **self.conan_data[...])`.\" with \"| 9 | Every `conandata.yml` source entry carries a `sha256` and is fetched through `get(self, **self.conan_data[...])`, bar the two exceptions `CMK-CONAN-23` names.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 96,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Non-negotiable 11 says every `VCPKG_*` input is \"set by a configure preset or `-D`\". CMK-VCPKG-04 (and CMK-TC-03) instead allow a `set(VCPKG_...)` in the top-level CMakeLists.txt before the first project(), with the preset only preferred. VCPKG-04's grep passes the planted compliant fixture (set(VCPKG_TARGET_TRIPLET) on line 2, project() on line 3), which the index row forbids. So the index and the depth file give two different answers to one question.",
    "fix": "Replace the row with: | 11 | vcpkg's toolchain file comes from a configure preset or `-D`, and every `VCPKG_*` input is set before the first `project()`, preferably in that same preset. A later write is a silent no-op. | CMK-VCPKG-04, CMK-TC-03 |"
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 106,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test on the index: the sentence \"The one-manager ban itself is `CMK-TC-02` and is not restated here.\" can go without causing any mistake, because non-negotiable 1 already cites CMK-TC-02. Line 146 is the other candidate (reported above as a blocker). The Gate, silent-pass and Severity boilerplate is house-wide and stays.",
    "fix": "Delete \" The one-manager ban itself is `CMK-TC-02` and is not restated here.\" from line 105-106, leaving \"The acquisition choice, the lock of record, tool provisioning and the CI cache shape.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging.md",
    "line": 146,
    "severity": "blocker",
    "kind": "notes-violation",
    "finding": "The index emits the reserved IDs CMK-PKG-05 and CMK-PKG-07 (\"`CMK-PKG-05` to `CMK-PKG-07` are retired and not reused.\"). Authoring note 5.2 says reserved IDs are never emitted. check-artifacts also sees them as cited IDs that no rule table defines.",
    "fix": "Delete line 146 (\"`CMK-PKG-05` to `CMK-PKG-07` are retired and not reused.\") and the blank line 147 after it."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/conan.md",
    "line": 22,
    "severity": "fix",
    "kind": "style",
    "finding": "A depth file points at a sibling depth file (\"vcpkg is `CMK-VCPKG` in `cpp-packaging/vcpkg.md`\"). That breaks the no-chains rule and contradicts the index's statement on line 151, \"These files do not point at each other\".",
    "fix": "Replace \"vcpkg is `CMK-VCPKG` in `cpp-packaging/vcpkg.md`. A `conanfile.py`\" with \"vcpkg is `CMK-VCPKG`. A `conanfile.py`\"."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/conan.md",
    "line": 88,
    "severity": "fix",
    "kind": "style",
    "finding": "Several verification cells that run a command never say what empty output means (note 7): CONAN-06 (line 88), CONAN-12 (123), CONAN-17 (197) and CONAN-18 (198).",
    "fix": "Line 88: append \" Empty output means not applicable.\" to the CONAN-06 Verification cell. Line 123: append \" Empty output means no install line, not applicable.\" to the CONAN-12 cell. Line 197: append \" Empty output is the pass.\" to the CONAN-17 cell. Line 198: replace \"The block above lists candidates.\" with \"The block above lists candidates, and empty output is the pass.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/conan.md",
    "line": 144,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The CMK-CONAN-10 configure check pipes cmake into grep, so cmake's exit status is lost, and the cell says empty output is the pass. Measured on 3.31.12, 4.3.4 and 4.4.2: a tree whose hand-written CMakeUserPresets.json made Conan skip its presets (the CONAN-08 case) fails with \"No such configure preset ... conan-release\" (exit 1), grep prints nothing, and the check reads as a pass while also planting the violation (set(CMAKE_CXX_STANDARD 20) after project()).",
    "fix": "Replace line 143 with \"# CMK-CONAN-10: pass = the configure exits 0 and this prints nothing. Shown for CMake <= 4.3; use -Werror=author on CMake >= 4.4.\" In the CMK-CONAN-10 Verification cell (line 149) replace \"The block above: empty output is the pass.\" with \"The block above: empty output is the pass only when the configure itself succeeded. When grep prints nothing, rerun the configure without the pipe and require exit 0, because a missing `conan-release` preset also prints nothing.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/conan.md",
    "line": 199,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "CMK-CONAN-20 says \"Floor: current CCI policy.\", a floating era label.",
    "fix": "Replace \"Floor: current CCI policy.\" with \"Floor: CCI policy as of 2026-09-26.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 14,
    "severity": "fix",
    "kind": "style",
    "finding": "The depth file points at its sibling depth file twice: line 14-15 (\"Conan is CMK-CONAN in `conan.md`.\") and line 77 (\"belongs to CMK-CONAN-10 in `conan.md`\"). That contradicts the index's statement that these files do not point at each other.",
    "fix": "Line 14-15: replace \"Conan is CMK-CONAN in\\n`conan.md`.\" with \"Conan is CMK-CONAN.\" Line 77: replace \"A Conan leg's runtime belongs to CMK-CONAN-10 in `conan.md`.\" with \"A Conan leg's runtime belongs to CMK-CONAN-10.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 42,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "CMK-VCPKG-02 (MUST) bans overrides, registries and overlay-ports in shipped manifests, but its grep matches only \"overrides\" and \"overlay-ports\". A planted ports/foo/vcpkg-configuration.json that carries \"default-registry\" and \"registries\" gave empty output (exit 1), so the registries clause can never go red.",
    "fix": "In the Verification cell replace \"-e '\"overrides\"' -e '\"overlay-ports\"' ports\" with \"-e '\"overrides\"' -e '\"overlay-ports\"' -e '\"registries\"' -e '\"default-registry\"' ports\"."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 43,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "Eleven vcpkg rows (lines 42, 43, 82, 97, 141, 143-148) say \"Floor: current\", which floats. Note 6 requires an exact dated tool or registry version, with no floating era word.",
    "fix": "Line 42: replace \"Floor: current vcpkg-tool.\" with \"Floor: vcpkg-tool 2026-09-26 (as of 2026-09-26).\" Line 97: replace \"Floor: current, and the feature\" with \"Floor: vcpkg-tool 2026-09-26, and the feature\". Line 141: replace \"Floor: current registry.\" with \"Floor: vcpkg registry 2026.07.29 (as of 2026-09-26).\" Lines 43, 82, 143, 144, 145, 146, 147, 148: replace every \"Floor: current.\" with \"Floor: vcpkg registry 2026.07.29 (as of 2026-09-26).\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 58,
    "severity": "nit",
    "kind": "style",
    "finding": "The cmake fence carries a \"# wrong:\" and a \"# right:\" comment above code that is only the wrong form. The right form is the json fence that follows, so the block reads as if the shown code were also right.",
    "fix": "Replace lines 58-59 with the single line \"# wrong: vcpkg.cmake already ran inside project(), so this is ignored and configure exits 0. The preset below is the right form.\""
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 81,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The first CMK-VCPKG-06 grep (MUST) misses the static-CRT community triplets `x64-windows-static-release` and `arm64-windows-static-release`, which ship in the pinned registry with VCPKG_CRT_LINKAGE static, because `windows-static[^-]` excludes every `-` suffix, not only `-md`. A planted preset naming `x64-windows-static-release` with no runtime set gave empty output (exit 1), so the check passed.",
    "fix": "In the Rule cell replace \"(`*-windows-static`, or `VCPKG_CRT_LINKAGE static`)\" with \"(`*-windows-static`, `*-windows-static-release`, or `VCPKG_CRT_LINKAGE static`)\". In the Verification cell replace \"-e 'windows-static$' -e 'windows-static[^-]' -e 'VCPKG_CRT_LINKAGE static'\" with \"-e 'windows-static$' -e 'windows-static[^-]' -e 'windows-static-release' -e 'VCPKG_CRT_LINKAGE static'\"."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 81,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "CMK-VCPKG-06 (following wave-2 (e)7) marks any CMakeLists.txt hit for CMAKE_MSVC_RUNTIME_LIBRARY after the first project() as a finding. CMK-TGT-16's rule text, which wave-3 (d)9 says owns the guard, lists `inside if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY)` as an allowed placement. A planted TGT-16-style guarded set after project() on a static-triplet leg is flagged by VCPKG-06. TGT-16's own verification agrees with VCPKG-06, so the ambiguity starts in TGT-16's prose. VCPKG-06 should state the answer explicitly so the two rows cannot be read two ways.",
    "fix": "Append to the CMK-VCPKG-06 Rule cell: \"A `set()` after the first `project()`, guarded or not, does not satisfy this row, because nothing on a vcpkg leg defines the variable first.\" Hand the matching edit back to cmake-build: CMK-TGT-16's placement list should read \"a preset's `cacheVariables`, before the first `project()`, or behind a default-`OFF` option\"."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 144,
    "severity": "fix",
    "kind": "style",
    "finding": "Verification cells that run a command without an empty-output clause: VCPKG-13's third command (line 141), VCPKG-14 (144) and VCPKG-16 (145).",
    "fix": "Line 141: replace \"lists the SHOULD clause.\" with \"lists the SHOULD clause's findings, and empty output is its pass.\" Line 144: append \" Empty output means not applicable.\" to the VCPKG-14 cell. Line 145: append \" Empty output means no port declares a linkage, so read every Windows-capable port.\" to the VCPKG-16 cell."
   },
   {
    "set": "cpp-packaging (rules/cpp-packaging.md index, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/rules/cpp-packaging/vcpkg.md",
    "line": 200,
    "severity": "nit",
    "kind": "notes-violation",
    "finding": "Note 6 requires the Re-check list to name its D-items. conan.md does (D2, D4), but vcpkg.md's two bullets carry no D label (they are D3 and D4).",
    "fix": "Line 200: prefix the bullet text with \"D3: \". Line 201: prefix the bullet text with \"D4: \"."
   }
  ]
 },
 {
  "group": "skills/cmake-dependency-triage",
  "files": [
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/references/reading-the-answers.md"
  ],
  "model": "sonnet",
  "checker_target": "skills/cmake-dependency-triage",
  "findings": [
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 8,
    "severity": "nit",
    "kind": "portability",
    "finding": "The frontmatter carries `repository: https://github.com/ocx-sh/grimoire-lore`. `check-artifacts.py --forbid ocx` flags it, and authoring note 9 lists `ocx-sh`. The house skills (jvm-dependency-triage, bazel-adopt) carry no repository key. The rules do, so this is a catalog-metadata call for the owner, not a content defect. The same line appears at skills/cmake-modernize/SKILL.md:8.",
    "fix": "Delete line 8 (`  repository: https://github.com/ocx-sh/grimoire-lore`) in both skills' SKILL.md, matching the house skills, unless the catalog needs it from the file."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 120,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "'Before you start' (line 73-75) says every configure in this skill passes `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`, and authoring note 7 requires it on configure probes that touch FetchContent. The step 2 preset form (lines 120-121) and the T3 capture (line 228) omit it.",
    "fix": "Line 120-121: replace `cmake --preset \"$PRESET\" --fresh \"$GATE\"\n--debug-find-pkg=\"$NAME\"` with `cmake --preset \"$PRESET\" --fresh \"$GATE\" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW\n--debug-find-pkg=\"$NAME\"`. Line 228: replace with `cmake --preset \"$PRESET\" --fresh \"$GATE\" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW > logs/configure.log 2>&1`."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 259,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The T4 (CMK-INST-03) second grep includes only `${NAME}Targets.cmake`. An export file named `<name>-targets.cmake` (fmt's spelling) or `<name>ConfigTargets.cmake` (spdlog's) is never read, so a missing `find_dependency` reads as 'no finding'. Measured: a planted `dep2-targets.cmake` with `INTERFACE_LINK_LIBRARIES \"zlib::zlib\"` and a `dep2-config.cmake` with no find_dependency gave empty output from both greps. The proposed include found it.",
    "fix": "grep -rn --include=\"${NAME}*argets.cmake\" -e 'INTERFACE_LINK_LIBRARIES' \"$PREFIX\""
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 280,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The T5 policy-knob grep includes `*.yml` but not `*.yaml`, unlike CMK-DEP-15's own grep in dependencies.md and modernize I8. Measured: a planted `.github/workflows/ci.yaml` with `env: CMAKE_POLICY_VERSION_MINIMUM: \"3.10\"` (a CI environment variable, which DEP-15 forbids) did not print.",
    "fix": "grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' ."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 343,
    "severity": "nit",
    "kind": "style",
    "finding": "The four T8 Conan greps state no empty-output meaning for the first three (authoring note 7).",
    "fix": "A hit from the first means ranges exist, and `git ls-files conan.lock` must then be non-empty. Empty output from the first means no ranges, so the rule is not applicable. Empty output from the second means CI runs no `conan install` (not applicable). An install line from the second that is missing from the third is the finding. The fourth must be empty: an empty `--lockfile=` switches the lock off."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 397,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "The repeated CMK-DEP-15 row drops the rule's 'On CMake 4.x' scope. `CMAKE_POLICY_VERSION_MINIMUM` does not exist before 4.0. A hedge row read without the rule tells an agent to emit it on a 3.x leg, where 3.31.12 ignores it. This is failure mode 4 of the same file.",
    "fix": "| 4 | On CMake 4.x, set a third-party dependency's policy knobs with set/restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it, with `CMAKE_POLICY_VERSION_MINIMUM` at 3.10. Never use a project-wide `set()`, a committed preset `cacheVariables` entry, or a CI environment variable | CMK-DEP-15 |"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/SKILL.md",
    "line": 408,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: failure modes 1 (lines 408-410), 2 (411-412), 9 (426-427) and 11 (430-431) restate the evidence rule (lines 52-65), step 2's reused-tree bullet (127-129) and T2's trace note (203-205) almost word for word. Line 18's second sentence repeats lines 388-390. Removing them causes no mistake.",
    "fix": "Delete lines 408-412, 426-427 and 430-431, and renumber the remaining failure modes 1 to 7. Delete the sentence \"It cites their rules by ID and never restates their tables.\" on line 18."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/references/reading-the-answers.md",
    "line": 60,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "This groups FindBoost with the modules whose `QUIET` call leaves `<X>_FOUND` empty. CMK-DEP-19 and the dependency-seam consolidation say a bare `find_package(Boost)` under CMP0167 NEW falls through to the `BoostConfig.cmake` that Boost ships from 1.70, so it is found. An agent would misread a found Boost as missing.",
    "fix": "- A removed module (`FindCUDA`, `FindPythonInterp`, `FindPythonLibs`) under a `...4.4` range is policy `NEW`. A `QUIET` call is then silent and `<X>_FOUND` stays empty (CMK-DEP-19). A bare `find_package(Boost)` instead falls through to the `BoostConfig.cmake` that Boost ships from 1.70."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-dependency-triage/references/reading-the-answers.md",
    "line": 76,
    "severity": "nit",
    "kind": "portability",
    "finding": "The upstream evidence is named bare ('arrow'), without the owner/repo at a commit plus path that authoring note 9 asks for. The sentence reads fine without it.",
    "fix": "printed 0 lines for a declare kept in a `.cmake` module (4.4.2)."
   }
  ]
 },
 {
  "group": "skills/cmake-modernize",
  "files": [
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/inventory.md",
   "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md"
  ],
  "model": "opus",
  "checker_target": "skills/cmake-modernize",
  "findings": [
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 89,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The step 1 exit check says 'F1 is empty'. F1 does not exclude vendored directories: measured, `third_party/old/CMakeLists.txt:1:cmake_minimum_required(VERSION 3.7)` prints. The skill also says vendored subtrees are never entered (lines 236, 243). Lines 120-125 then tell the agent to patch a vendored floor on 3.x. On a tree with a vendored bare floor the exit can never be reached, and the two instructions conflict.",
    "fix": "Exit check cell: \"`F1` prints no line outside a vendored directory (a vendored hit is recorded `flagged-not-converted`), the canary exits 1 and the project's gated configure exits 0 on each CI binary\". Lines 120-125: replace \"On 3.x, where that variable does not exist, re-pin the dependency or patch its one `cmake_minimum_required` line (`CMK-DEP-30`).\" with \"On 3.x, where that variable does not exist, re-pin a fetched dependency or add a `PATCH_COMMAND` to its declare (`CMK-DEP-30`). A vendored subtree is never edited: record it `flagged-not-converted` with the `CMK-DEP-30` remedy named, and hand it to the owner.\""
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 92,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The step 4 exit check requires '`I12` is empty'. I12's reading (inventory.md line 164-166) and CMK-TGT-09 accept a literal `-Werror` inside a developer option that defaults OFF, so a compliant tree can never pass this exit.",
    "fix": "`I3` shows no overwrite, `I11` hits sit in a `NOT DEFINED` guard, every `I12` hit sits in a developer option that defaults `OFF`, and every new `CMAKE_*` name passes the variable check"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 93,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Step 5 tells the agent to guard tests on `PROJECT_IS_TOP_LEVEL` directly. CMK-TEST-09 (MUST, cited by the same skill at step 7) says to gate a consumed library's test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, with `include(CTest)` inside the gate. The two answer 'how do I gate the tests' differently, and following step 5 yields a tree that does not meet TEST-09's rule text: a consumer has no switch to turn the tests on.",
    "fix": "Replace the step 5 Do cell with: \"Gate the test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, with `include(CTest)` inside the gate (`CMK-TEST-09`). Guard examples, dev options, the `CMAKE_BUILD_TYPE` default and any non-test fetch on `PROJECT_IS_TOP_LEVEL`\", and replace the Cites cell with \"`CMK-DEP-07`, `CMK-TGT-17`, `CMK-TEST-09`\"."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 151,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "`CMAKE_CXX_SCAN_FOR_MODULES OFF` (CMK-TGT-18, floor 3.28) is newer than the 3.25 floor and carries no `(CMake \u2265 X.Y)` gate, which authoring note 4.1 requires.",
    "fix": "`CMAKE_CXX_SCAN_FOR_MODULES OFF` (CMake \u2265 3.28, `CMK-TGT-18`)."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 185,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "This copies the same whitespace-exact preset grep. It cannot go red on compact JSON (`\"dev\":false`). Measured.",
    "fix": "  `grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e '\"dev\"[[:space:]]*:[[:space:]]*false' -e '\"deprecated\"[[:space:]]*:[[:space:]]*false' .`"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 188,
    "severity": "nit",
    "kind": "era-unlabelled",
    "finding": "Presets schema 12 is CMake 4.4, but the line gives no version gate.",
    "fix": "- A presets file raised to schema 12 (CMake \u2265 4.4) renames `dev` to `author` in the same edit"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 267,
    "severity": "nit",
    "kind": "deletion-candidate",
    "finding": "Deletion test: 'What agents get wrong' 2 (lines 267-268), 3 (269-270), 10 (285) and 12 (288-290) restate 'What it refuses', the step 8 gersemi bullet and step 1's floor paragraph. Lines 19-22 repeat lines 296-298. Removing them causes no mistake.",
    "fix": "Delete lines 267-270, 285 and 288-290 and renumber the list 1 to 9. Replace lines 19-22 with \"This skill assumes the `cmake-build` rule set is installed and cites rules by ID.\""
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 305,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "The same CMK-DEP-15 hedge row omits the 'On CMake 4.x' scope. The variable is 4.0+, and step 1 of this skill correctly routes 3.x to CMK-DEP-30.",
    "fix": "| 4 | On CMake 4.x, set a third-party dependency's policy knobs with set and restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it, with `CMAKE_POLICY_VERSION_MINIMUM` at 3.10 | CMK-DEP-15 |"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/SKILL.md",
    "line": 322,
    "severity": "nit",
    "kind": "era-unlabelled",
    "finding": "The skill carries dated tool facts (gersemi 0.29.1, CPS on 4.3, the preset `deprecated` gap on 3.31.12, Tutorial layout at v4.4.2) but no Re-check list. The triage skill ends with one.",
    "fix": "Append after the References table: \"Re-check on each tool bump: the gate spelling split and preset `warnings` behaviour (CMake minor releases after 4.4.2), `gersemi --diff` exit code (gersemi after 0.29.1), and the `/cps/<pkg>` round-trip ending (CMake after 4.4.2), all as of 2026-09-26.\""
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/inventory.md",
    "line": 4,
    "severity": "nit",
    "kind": "unsupported-claim",
    "finding": "The claim 'Every command ... reads only ... Each one is a single `grep -r`' is false for I4, which pipes into `grep -v`, and for the variable check, which writes files.",
    "fix": "was run against a planted violating tree and a planted compliant tree on CMake 3.31.12 and 4.4.2 (2026-09-26). Each is a `grep -r` with an explicit directory operand and no early-exiting reader (I4 adds a filtering `grep -v`), so it cannot zero a count under `set -o pipefail` (`CMK-CORE-05`)."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/inventory.md",
    "line": 112,
    "severity": "fix",
    "kind": "style",
    "finding": "A depth file points at a sibling depth file ('settled by the offline probe in `proofs.md`'). SKILL.md line 317 says 'These files do not link each other', and the distillation rule is 'depth files never point at other depth files'.",
    "fix": "Any other hit is a step-5 row, settled by step 5's offline subproject probe."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/inventory.md",
    "line": 179,
    "severity": "fix",
    "kind": "duplication",
    "finding": "The variable-existence check restates the CMK-LANG-11 lookup script. Wave-3 (d)10 resolves this to 'LANG-11 adopts the placeholder-expanded check. The skills text cites LANG-11'. The copy has already diverged: it writes `varcheck/` at the repository root, while language.md uses `build/varcheck`. That also contradicts line 4's 'reads only'.",
    "fix": "Replace lines 174-194 (the section body) with: \"Run the `CMK-LANG-11` lookup block in `cmake-build/language.md` with the pinned binary for every `CMAKE_*` name a diff introduces. It expands `<LANG>` and `<CONFIG>` first, so the real `CMAKE_CXX_FLAGS` is not reported as invented. A count of 0 is an invented name, the finding. A count of 1 is a documented name. Measured on 3.31.12 and 4.4.2: `CMAKE_CXX_STANDARD_EXTENSIONS` and `CMAKE_DEBUG_PREFIX_MAP` read 0, while `CMAKE_CXX_FLAGS`, `CMAKE_CXX_EXTENSIONS`, `CMAKE_BUILD_TYPE` and `CMAKE_UNITY_BUILD` read 1.\""
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 41,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The preset canary `cmake -S \"$W/canary\" --preset \"$LEG\" --fresh` has no `-B`. Measured on 3.31.12 and 4.4.2: when the project's preset declares no `binaryDir`, the canary writes `CMakeCache.txt` and `CMakeFiles/` into the current directory, which is the repository root. There, `--fresh` also discards any existing in-source cache.",
    "fix": "cmake -S \"$W/canary\" -B \"$W/canary-build\" --preset \"$LEG\" --fresh"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 108,
    "severity": "nit",
    "kind": "style",
    "finding": "The round trip passes no dependency hint to the library's own configure, and the consumer's `-DCMAKE_PREFIX_PATH` names only the moved prefix. A library whose public dependency lives outside system paths fails both configures unless the environment `CMAKE_PREFIX_PATH` carries it. The script does not say so (reproduced while running it against a planted library with an installed dependency).",
    "fix": "#   export PKG=mylib VER=1.0 TARGETS=mylib::mylib SRC=/abs/path/to/project GATE=-Werror=dev\n# A dependency outside system paths goes in the environment: export CMAKE_PREFIX_PATH=/abs/dep/prefix"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 147,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The CI-checks comment says empty output from the workflow gate grep means 'no gate (finding)'. CMK-CORE-01's verification (b) says empty output is a finding unless the preset's `errors` carries the gate and the canary exits 1. So a preset-gated leg is misreported as ungated.",
    "fix": "# CMK-CORE-01: a gate exists in the workflows. Empty output = no gate (finding), unless the leg's preset carries \"errors\": {\"dev\": true} and the preset canary exits 1."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 151,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The CMK-CORE-01 preset gate-off grep matches only the literal `\"dev\": false` with one space. Measured: a `CMakePresets.json` written as `{\"warnings\":{\"dev\":false,\"deprecated\":false}}` gives empty output (a false pass), while the index's whitespace-tolerant spelling finds it.",
    "fix": "grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e '\"dev\"[[:space:]]*:[[:space:]]*false' -e '\"deprecated\"[[:space:]]*:[[:space:]]*false' ."
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 154,
    "severity": "nit",
    "kind": "style",
    "finding": "The CMK-CORE-05 grep names `scripts` as an operand. On a tree without that directory it prints 'No such file or directory' and exits 2, which reads as neither pass nor finding.",
    "fix": "grep -rsnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' scripts .github"
   },
   {
    "set": "cmake skills: skills/cmake-dependency-triage (SKILL.md, references/reading-the-answers.md) and skills/cmake-modernize (SKILL.md, references/inventory.md, references/proofs.md)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/skills/cmake-modernize/references/proofs.md",
    "line": 163,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "The step-8 formatting gate is prescribed as `gersemi --check .`, but CMK-CORE-04 says `gersemi --check .` descends into build trees and fails on generated files, and the index's gate line is `git ls-files -z -- '*CMakeLists.txt' '*.cmake' | xargs -0 -r gersemi --check`. Measured with gersemi 0.29.1: a correctly formatted project that has an in-tree `build/` configured by 4.4.2 exits 1 under `gersemi --check <dir>` (build/CMakeFiles/4.4.2/CMakeCCompiler.cmake and others 'would be reformatted'). The index form exits 0 on the same tree. So the skill's exit check fails on compliant trees.",
    "fix": "Replace lines 163-166 with: \"All five were run against a planted failing tree and a planted passing one. The formatting gate is the index's gate line, `git ls-files -z -- '*CMakeLists.txt' '*.cmake' | xargs -0 -r gersemi --check`, with gersemi 0.29.1: exit 1 on an unformatted file, exit 0 on a formatted one. Never `gersemi --check .`, which descends into build trees and fails on generated files, and never `gersemi --diff`, which exited 0 on both (measured 2026-09-26) (`CMK-CORE-04`).\""
   }
  ]
 }
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['group', 'applied', 'refused', 'checker_clean', 'lines_after'],
  properties: {
    group: { type: 'string' },
    applied: { type: 'array', items: { type: 'string' }, description: 'file:line of each finding applied' },
    refused: { type: 'array', items: { type: 'string' }, description: 'line: reason, only when applying the fix would contradict the authoring notes or a consolidation' },
    checker_clean: { type: 'boolean' },
    lines_after: { type: 'array', items: { type: 'string' }, description: 'file: line count, per edited file' },
  },
}

function fix(item) {
  const isOpus = item.model === 'opus'
  return agent(`Model rationale: ${isOpus ? 'opus — at least one finding is a blocker on an enforced rule, so applying it is a judgement about what the rule says' : 'sonnet — mechanical edits from exact fix text a reviewer already decided'}.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a fixer in phase 8 (Validate) of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILES against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/cmake-topic-map.md (section "## Authoring notes (binding on the drafters)") and returned findings with exact fix text. Apply them.
- YOUR FILES (the only files you may edit): ${item.files.join(' ; ')}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content.
- Where a fix changes a verification command, re-run the command against the reviewer's planted fixtures under /home/mherwig/.cache/cmake-measure-scratch/review/ (or a two-line fixture of your own there) and confirm it goes red on the violation and green on the clean case; CMake binaries: 'ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake' from the repository root. Keep every command in the verification shape: explicit directory operand with -r, --include globs quoted, one -e per alternative, no \\| in a pattern, no unescaped | in a table cell, no <placeholder> in a pattern, no $(...) operands, xargs -r, and an explicit empty-output clause.
- After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py ${item.checker_target}  and fix any finding it reports in YOUR FILES (a finding in another file is not yours; report it in refused with the path). Then report each edited file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. ${f.file.replace(ROOT + '/', '')}:${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.group}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
