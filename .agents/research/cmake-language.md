---
title: "The CMake language — quoting, lists, argument parsing, scopes and the cache (consolidation)"
topic: cmake-language
model: opus
id_family: CMK-LANG
date: 2026-09-26
verified: 2026-09-26
consolidates:
  - cmake-language/language-rules.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-versions-and-gate/gate-and-language-semantics.md (§5, §8, §9 cited for the measurements it owns, not re-measured)
  - cmake-topic-map.md rows M-C-01..M-C-10, conflicts-log entries 39, 40, 42, 68, 70, 72
---

# The CMake language — consolidated

Rules for `rules/cmake-build/language.md` (family `CMK-LANG`). Routing line
from the map: "writing any function, macro, `if()`, loop, cache variable or
option; returning a value from a function; chasing 'my `-D` did not take'".
Tested on CMake 3.31.12, 4.3.4 and 4.4.2 (the host's OCX mirror; upstream is
4.4.3), 2026-09-26. The program floor is 3.25 (map conflict 1); a rule that
needs more names its version.

**Measurements this consolidation added (2026-09-26).** Sources and a runner
are in
[`cmake-language/scratch/language-consolidation/`](cmake-language/scratch/language-consolidation/)
(`run.sh` loops over `kitware/cmake:3.31`, `:4.3`, `:4.4`; `unparsed.awk` is
the LANG-06 check). Build trees lived under
`/home/mherwig/.cache/cmake-measure-scratch/cmake-language-consolidation/` and
were deleted.

| Tag | What was run | Result on 3.31.12, 4.3.4 and 4.4.2 unless noted |
|---|---|---|
| L1 | `set(A "B")`, `set(B "x")`, then `if(${A} STREQUAL "x")` and `if("${A}" STREQUAL "x")` | Unquoted: **TRUE** (the value `B` is looked up again as a variable). Quoted: FALSE. CMP0054's removal does not touch the unquoted case |
| L2 | `set(EMPTY "")`, then `if(${EMPTY} STREQUAL "")` | **Hard error**: `if given arguments: "STREQUAL" ""`, exit 1 |
| L3 | `set(E "a;;b")`, bare `foreach(x ${E})` vs `foreach(x IN LISTS E)` | Bare: **2** iterations (the empty element is dropped). `IN LISTS`: 3 |
| L4 | A macro running `foreach(x ${ARGN})`, called as `mac(a "" b)` | **2 of 3** arguments seen |
| L5 | `message(STATUS "$<CONFIG>")` | Prints the literal `$<CONFIG>` |
| L6 | `cmake_policy(SET CMP0054 OLD)` under a 3.25 floor | 3.31.12: exit 0 with a deprecation warning. **4.3.4 and 4.4.2: exit 1**, "may not be set to OLD behavior". The error starts at 4.0, where CMP0054's OLD behaviour was removed (`CMP0054.rst` @ v4.0.0); 4.0-4.2 were not run |
| L7 | `function(fa name)` with `cmake_parse_arguments(PARSE_ARGN arg "" "VALUE" "")`, called `fa(n VALUE "a;b")` | 4.4.2: `VALUE='a;b'`. **3.31.12 and 4.3.4: exit 0, `VALUE=''`, no diagnostic.** The older binaries read `PARSE_ARGN` as the prefix of the legacy form |
| L8 | `cmake_parse_arguments(PARSE_ARGV 0 …)` inside a `macro()` | Hard error: `PARSE_ARGV called with ARGC='' that is not an unsigned integer` |
| L9 | A macro doing `set(OUT … PARENT_SCOPE)`, called inside function `wrapper()` (itself called by `caller()`), and at directory scope in a subdirectory | Inside `wrapper`: `OUT` empty. In `caller`: `OUT` set. From the subdirectory: set in the parent directory, empty in the subdirectory. The write lands one scope above **the scope that contains the call** |
| L10 | `unparsed.awk` over the 475 non-`Tests/` corpus files that call `cmake_parse_arguments` (1,015 `cmake_parse_arguments(` matches; 1,076 counts every mention of the word, comments included) | **453 calls (45 %)** never read `<prefix>_UNPARSED_ARGUMENTS` in the same function and never pass the prefix to a validator. First 10-hit sample: 3 were Qt's `_qt_internal_validate_all_args_are_parsed(arg)`, so the check now accepts a helper call on the prefix. Second 10-hit sample: 10 of 10 real. The prefix-mismatch half flagged 3: 2 real (Qt, Hunter) and 1 nested sub-parse (`UseJava.cmake:805`) |
| L11 | `cmake --help-command cmake_parse_arguments` on 4.4.2 | `PARSE_ARGV` is `versionadded:: 3.7` (the command became built in at 3.5). `PARSE_ARGN` is `versionadded:: 4.4`. `KEYWORDS_MISSING_VALUES` is 3.15 |
| L12 | `cmake --help-manual cmake-language` on 4.4.2 | "CMake reserves identifiers that begin with `CMAKE_` (upper-, lower-, or mixed-case), or begin with `_CMAKE_` …, or begin with `_` followed by the name of any CMake Command" |

Cited, not re-measured ([gate] = `cmake-versions-and-gate/gate-and-language-semantics.md`):
[gate] §5 (a non-`FORCE` cache write does not update; `CACHE INTERNAL`
implies `FORCE`; CMP0126 NEW lets a normal variable shadow the cache; the
precedence is `-D` over preset over `option()`, and a later plain `set()` wins
every read; `option()` keeps a non-boolean value under type `BOOL`), [gate] §6
(the find_ocx memo helpers reconfigure correctly), [gate] §8 (`PARENT_SCOPE`
and `return(PROPAGATE)` go one hop; `return(PROPAGATE)` in a bare top-level
`block()` warns and skips the rest of the file), [gate] §9 (unquoted `${ARGN}`
forwarding erases `""` and splits `"a;b;c"`; `PARSE_ARGV` does neither;
CMP0174).

## Verdict

1. **Quote every `${…}` operand of an `if()` comparison, and loop with
   `IN LISTS`. Both are MUST, for everyone who writes CMake.** Measured on all
   three lines (L1-L3). CMP0054 fixed the *quoted* case. The unquoted case was
   never governed by any policy, and it is still live on 4.4.2. The loop rule
   binds lines an agent writes or touches. Untouched legacy loops are a job
   for the `cmake-modernize` skill, not a gate failure: they are 40 % of all
   `foreach` calls in the corpus.
2. **Parse with `PARSE_ARGV` in a function, never with forwarded `${ARGN}`
   (MUST for a public command). Check `_UNPARSED_ARGUMENTS` with the same
   prefix (MUST). Never write `PARSE_ARGN` below a 4.4 floor (MUST).** The
   `PARSE_ARGN` trap is this consolidation's new finding. 3.31.12 and 4.3.4
   accept it silently and parse nothing (L7). This binds CMake module authors
   and libraries shipping a package. CMK-MOD-16 keeps the *shape* of the parse
   (one top-level parse, so gersemi can read it). LANG-04 owns the *signature*,
   because the signature is what makes the parse correct.
3. **Default to `function()`. A `macro()` is right only for a caller-scope
   `return()` or a caller-named output, and says so in a comment (SHOULD).**
   The sub-dive left this a pure reading heuristic. This consolidation adds
   two measured costs of a macro: `PARSE_ARGV` is a hard error inside one (L8),
   so a macro is stuck with the lossy `${ARGN}` form, and a macro's
   `foreach(${ARGN})` drops empty arguments (L4). That lifts it to SHOULD.
4. **Names beginning `CMAKE_`, `_CMAKE_` or `_<command>` are reserved (MUST,
   normative, L12).** The sub-dive rested this rule on a corpus count of 2.
   `cmake-language(7)` makes it normative. Prefixing options with the
   project's name stays SHOULD and is checked per sub-project, because a
   repo-wide check "fails" 66 % of LLVM's options for the wrong reason.
5. **The cache is sticky by design. Never `FORCE` a knob a user sets; write
   computed results as `CACHE INTERNAL` or as normal variables (SHOULD).**
   The find_ocx audit's headline defect was an agent-shaped mistake: it
   claimed `CACHE INTERNAL` needs `FORCE`. That defect is refuted ([gate] §6,
   map conflict 16) and is recorded here as failure mode 5, not as a rule.
6. **Dropped:** hand-joined `"a;b"` lists (M-C-08). About two-thirds of
   sampled hits are prose or MIME strings, no measured failure stands behind
   the rule, and all 8 sampled `separate_arguments` uses are already correct.
   Also dropped: a `CMP0054 OLD` rule. CMK-VER-07 already forbids `SET … OLD`,
   and L6 only adds that it is a hard error from 4.0 on, the release that
   removed CMP0054's OLD behaviour (measured on 4.3.4 and 4.4.2).

### Conflicts resolved

1. **The `PARSE_ARGV` floor: 3.5 or 3.7?** [gate] §Summary and the shape audit
   §7 say 3.5+. language-rules and CMK-MOD-16 say 3.7. **3.7**, by L11: 3.5 is
   when `cmake_parse_arguments` became a built-in command, and `PARSE_ARGV`
   arrived at 3.7.
2. **Is `PARSE_ARGV` already the majority form?** The shape audit says 480
   against 322, "outnumbers". language-rules' summary says "already the
   majority form (462/986, 47 %)", which contradicts its own number.
   **No.** In core and scaffold code the `${ARGN}` form is still the
   majority: 524 of 986 calls, 53 %. The shape audit counted single lines
   across the whole corpus, Kitware's `Tests/` included. The fixed multi-line
   parser (language-rules §1) supersedes it.
3. **Bare `foreach`: MUST or SHOULD?** language-rules proposes "MUST for new
   code; SHOULD-fix on modernisation". **MUST on written or touched lines**,
   and the verification is scoped to the diff. The empty-element drop is
   measured (L3), so the correctness case is a MUST. The 1,650 existing
   corpus hits make a repo-wide gate a migration task, and that belongs to the
   skill.
4. **Function or macro: "the default is function" (map M-C-04) or "a reading
   heuristic, not MUST" (language-rules)?** **SHOULD function**, with a
   mechanical check: every `macro(` carries a comment naming its caller-scope
   need. The reasons are measured (L4, L8). The boundary cases are not
   (11 of 15 sampled macros need caller scope), so it cannot be MUST.
5. **`PARENT_SCOPE` inside a macro.** language-rules' rule 5 says "never,
   unless every call site sits at the same depth", reasoned from the docs.
   L9 measures the mechanism. `Kitware__CMake@e8befb989b:Modules/CheckIPOSupported.cmake:125-133`
   shows the sanctioned shape: a private macro, called only from inside
   functions, that writes the calling function's outputs. **Resolved as
   LANG-09:** allowed only for a private macro whose every call site is
   inside a function. Mixed call depths are the finding.
6. **"Setting CMP0054 at all on 4.0+ is a hard configure error"**
   (language-rules, AI-agent angle). **Refuted by L6.** Only `SET … OLD`
   fails, and only from 4.0 on (the removal release; measured on 4.3.4 and
   4.4.2). 3.31.12 warns and continues. The rule
   is CMK-VER-07's, so it is cited, not restated.
7. **The `_UNPARSED_ARGUMENTS` check: SHOULD (language-rules, "the scope
   boundary needs an AST") or MUST?** **MUST for a full parse in a public
   command.** Loss is measured ([gate] §9: a mis-split value lands in
   `UNPARSED_ARGUMENTS`), and a function-bounded awk (L10) makes the check
   mechanical with a measured residual false-positive rate. How hard a rule is
   to verify does not set its severity.
8. **M-C-07 (generator expressions at configure time): drop or keep?** The
   map re-prioritised it to P3 (0 real instances in 46 repos). The mechanism
   is now measured (L5). **Kept as SHOULD, with a one-line grep**, because it
   is a known agent failure (failure mode 7) and costs one line in the index.
9. **Citation fix.** language-rules gives `CMakeFindDependencyMacro.cmake:79`
   as the unquoted `${ARGN}` forward. Line 79 is the `macro(` line. The
   forward is at **:93** (`find_package(${dep} ${ARGN}`).
10. **find_ocx and `cmake_parse_arguments`.** language-rules reports "6
    `${ARGN}`-form calls, all 6 unmet" for the `PARSE_ARGV` rule, and the map
    lists find_ocx's quoting as "explicitly not a defect". Both hold. The map
    covered quoting only, never parsing. The new finding is that 2 of the 6
    parses never read `_UNPARSED_ARGUMENTS` (L10: `ocx.cmake:442`, `:692`).
    `ocx_bootstrap` at `:692` is public.
11. **Option prefixes.** The shape audit reads "7 of 11 sampled repos are at
    least 75 % prefixed". language-rules reads "66 % unprefixed in LLVM and
    CMake". **Both are right.** The second number is the single-prefix
    check misfiring on a monorepo, so LANG-12 is checked per sub-project.

## The ruleset

Consumer kinds: **all** means every author of `CMakeLists.txt` or `*.cmake`;
**MOD** means a CMake module author (Find module, helper module, copy-and-own
bootstrapper); **LIB** means a library shipping a package whose commands
other projects call. Every `grep` below runs from the repository root. In a
tree that holds build directories, add `--exclude-dir='build*'
--exclude-dir='_deps'` to each `grep -r`. find_ocx's `build/fixtures/` holds
four copied `ocx.cmake` files that otherwise repeat every hit (measured
2026-09-26).

### CMK-LANG — caught by a grep over `if()` and `foreach()`

**CMK-LANG-01 — Quote every `${…}` operand of an `if()`, `elseif()` or
`while()` comparison: write `if("${X}" STREQUAL "y")`. For truthiness, name
the variable bare: `if(X)`.**
- Rationale: `if()` looks an unquoted operand's value up *again* as a variable
  name (L1, `if.rst` §Variable Expansion). This holds for the right-hand
  operand too (`if("x" STREQUAL ${A})`) and for the numeric operators
  (`if(${G} GREATER 3)`): both measured TRUE through a second lookup on
  3.31.12, 4.3.4 and 4.4.2 (verify wave 3). An empty value turns into a hard
  syntax error (L2; `if(${N} GREATER 0)` with `N` empty also exits 1). CMP0054,
  removed in 4.0, only ever covered quoted operands.
- Verification: empty output passes. It is single-line, so a condition split
  across lines needs a read. `if(${pkg}_FOUND)` (a composed variable name)
  does not match, by design. `V` catches a bare left operand, `W` a bare right
  operand of the `EQUAL`, `LESS` and `GREATER` families.

  ```sh
  V='\$\{[A-Za-z_][A-Za-z0-9_]*\}[[:space:]]+'
  W='[[:space:]]+\$\{[A-Za-z_][A-Za-z0-9_]*\}[[:space:])]'
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e "[( ]${V}STREQUAL" -e "[( ]${V}MATCHES" -e "[( ]${V}EQUAL" -e "[( ]${V}VERSION_" -e "[( ]${V}IN_LIST" -e "[( ]${V}LESS" -e "[( ]${V}GREATER" -e "[( ]${V}STRLESS" -e "[( ]${V}STRGREATER" -e "[( ]${V}PATH_EQUAL" -e "EQUAL${W}" -e "LESS${W}" -e "GREATER${W}" . | grep -e 'if[[:space:]]*(' -e 'while[[:space:]]*('
  ```

- Severity: **MUST**. Consumer: all. Floor: any CMake; measured on 3.31.12,
  4.3.4 and 4.4.2. Corpus: 557 hits in 43,962 `if`-family calls, with 0 false
  positives in 30 read (language-rules §3). Over the whole corpus (`Tests/`
  included) this grep prints 904 lines, 137 more than the earlier
  left-operand-only form; 16 of 16 sampled extra lines are real bare
  operands.

**CMK-LANG-02 — Iterate a list with `foreach(x IN LISTS var)` or
`foreach(x IN ITEMS …)`, never bare `foreach(x ${var})`. In a macro, copy
`ARGN` first: `set(args "${ARGN}")`, then `foreach(x IN LISTS args)`.**
- Rationale: an unquoted list expansion drops empty elements. Measured 2 of
  3 iterations for `a;;b` (L3), and 2 of 3 arguments through a macro's
  `${ARGN}` (L4). `macro.rst` gives the same two-line fix.
- Verification: run it from the repository root on the files a change
  touches, new untracked files included. Empty output passes. A deleted file
  is skipped. The pattern also catches `foreach(x ${A} ${B})`.

  ```sh
  { git diff --name-only --diff-filter=d origin/main -- '*.cmake' '*CMakeLists.txt'; git ls-files --others --exclude-standard -- '*.cmake' '*CMakeLists.txt'; } | xargs -r grep -nE -e 'foreach[[:space:]]*\([[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]+\$\{'
  ```

- Severity: **MUST** on lines written or touched. Untouched lines are a
  modernisation step (`cmake-modernize`). Consumer: all. Floor: `IN LISTS`
  and `IN ITEMS` exist on any supported CMake (3.0+).

**CMK-LANG-03 — Pass configuration-dependent text only to a consumer that
evaluates generator expressions: target properties, `add_custom_command`,
`install()` or `file(GENERATE)`. Never pass it to `message()`, `if()`,
`string()` or `file(WRITE)`.**
- Rationale: `$<…>` is evaluated at generate time. At configure time it is
  still literal text (L5).
- Verification: a hit is the finding unless the literal text is meant to
  reach a later `file(GENERATE)` input. Empty output passes.

  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'message[[:space:]]*\(.*\$<' -e 'string[[:space:]]*\(.*\$<' -e 'file[[:space:]]*\([[:space:]]*WRITE.*\$<' -e '^[[:space:]]*(else)?if[[:space:]]*\(.*\$<' .
  ```

- Severity: SHOULD. The mechanism is measured, but 0 of 46 repos contain it
  (map conflicts log entry 68). Consumer: all. Floor: any.

### CMK-LANG — caught by reading each `cmake_parse_arguments`

**CMK-LANG-04 — In a `function()`, parse with
`cmake_parse_arguments(PARSE_ARGV <N> <prefix> …)`, where `<N>` is the number
of named parameters. Never forward an unquoted `${ARGN}` into the parse.**
- Rationale: through unquoted `${ARGN}`, `VALUE "a;b;c"` splits into `a`
  plus unparsed `b;c`, and `VALUE ""` loses its empty string before the parse
  sees it, so it reads exactly like a bare `VALUE` with no value
  (`KEYWORDS_MISSING_VALUES` names `VALUE` in both). `PARSE_ARGV` keeps both
  values intact ([gate] §9; re-measured on 3.31.12 and 4.4.2, verify wave 3).
  Under the 3.25 floor, where CMP0174 is not NEW, `PARSE_ARGV` still leaves
  `VALUE ""` unset, so the empty case is LANG-07's. CMake's own
  `find_dependency()` forwards `${ARGN}` unquoted
  (`Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:93`).
  CMK-MOD-16 covers the parse's shape (one top-level parse per function).
  This rule covers its signature.
- Verification: each printed line is a legacy-form parse, and the finding is
  one inside a `function()`; a macro falls under LANG-08. A call with
  `PARSE_ARGV` on its next line prints too, so read it. Empty output passes.

  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'cmake_parse_arguments[[:space:]]*\(' . | grep -v -e 'PARSE_ARGV' -e 'PARSE_ARGN'
  ```

- Severity: **MUST** for a public command (LIB, MOD), where the caller
  controls the values. SHOULD for a private helper. Floor: CMake ≥ 3.7 (L11).

**CMK-LANG-05 — Never write `cmake_parse_arguments(PARSE_ARGN …)` unless
`cmake_minimum_required` is 4.4 or higher. Below 4.4, write
`PARSE_ARGV <number of named parameters>`.**
- Rationale: on 3.31.12 and 4.3.4 the call is read as the legacy form with
  prefix `PARSE_ARGN`. It exits 0, leaves every keyword variable unset and
  prints nothing (L7). The `latest` documentation does mark it
  `versionadded:: 4.4`, but an agent that copies the signature never sees
  an error on an older CMake, only an empty parse.
- Verification: a hit in a tree whose floor is below 4.4 is the finding.
  Empty first output passes.

  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'PARSE_ARGN' .
  grep -rn --include='CMakeLists.txt' -e 'cmake_minimum_required' .
  ```

- Severity: **MUST**. Consumer: all. Floor: the rule exists because of
  CMake 4.4. Corpus: 0 uses outside `Kitware__CMake/Tests/RunCMake/cmake_parse_arguments/`.

**CMK-LANG-06 — After a full parse in a public command, read
`<prefix>_UNPARSED_ARGUMENTS` and stop with `FATAL_ERROR` naming them. Use
the same prefix in the parse, the condition and the message.**
- Rationale: a misspelled keyword, or a value that the `${ARGN}` form split,
  is absorbed without a word ([gate] §9). 45 % of corpus parses never check
  (L10). Two shipped modules print the wrong variable:
  `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3786`
  (parses `__qt_sps_arg`, prints `${arg_UNPARSED_ARGUMENTS}`) and
  `cpp-pm__hunter@997fab148b:cmake/modules/hunter_patch_unrelocatable_text_files.cmake:21`
  (parses `x`, prints `${hunter_UNPARSED_ARGUMENTS}`). The guard fires and
  the message comes out empty.
- Verification: `unparsed.awk` (the copy in
  `cmake-language/scratch/language-consolidation/`, inlined here). Empty
  output passes. A "never read" line is the finding unless the function
  deliberately parses one keyword and forwards the rest to another parser. A
  "message reads" line is the finding unless it is a nested sub-parse
  (`UseJava.cmake:805`).

  ```sh
  grep -rl --include='*.cmake' --include='CMakeLists.txt' -e 'cmake_parse_arguments' . | xargs -r awk '
  function flush() { if (p != "") print f ":" ln ": " p "_UNPARSED_ARGUMENTS never read"; p = "" }
  function prefix(s,   t) { split(s, t, /[[:space:]()"]+/); if (t[1] == "") return ""; if (t[1] == "PARSE_ARGV") return t[3]; if (t[1] == "PARSE_ARGN") return t[2]; return t[1] }
  FNR == 1 { flush(); q = ""; want = 0 }
  /^[[:space:]]*(end)?(function|macro)[[:space:]]*\(/ { flush(); q = ""; want = 0 }
  want && NF { p = prefix($0); q = p; want = 0; next }
  /cmake_parse_arguments[[:space:]]*\(/ { flush(); s = $0; sub(/.*cmake_parse_arguments[[:space:]]*\([[:space:]]*/, "", s); f = FILENAME; ln = FNR; p = prefix(s); q = p; if (p == "") want = 1; next }
  p != "" && (index($0, p "_UNPARSED_ARGUMENTS") || index($0, "(" p ")")) { p = "" }
  q != "" && match($0, /\$\{[A-Za-z0-9_]+_UNPARSED_ARGUMENTS\}/) { u = substr($0, RSTART + 2, RLENGTH - 3); if (u != q "_UNPARSED_ARGUMENTS") print FILENAME ":" FNR ": message reads " u ", parse prefix is " q }
  END { flush() }'
  ```

- Severity: **MUST** for a public command (LIB, MOD); SHOULD for a private
  helper. Floor: any (`UNPARSED_ARGUMENTS` is as old as the command).

**CMK-LANG-07 — When an optional one-value keyword may legitimately be
empty, test it with `if(DEFINED <prefix>_<KW>)` only where CMP0174 is NEW,
and there also check that `<prefix>_KEYWORDS_MISSING_VALUES` does not name
`<KW>`. Below that, `""` and an omitted keyword cannot be told apart, so
treat an empty value as absent.**
- Rationale: CMP0174 NEW makes `VALUE ""` defined and empty. Without it the
  variable is left unset ([gate] §9, both lines). Measured with `PARSE_ARGV`
  on 3.31.12 and 4.4.2 (verify wave 3): with CMP0174 unset, `VALUE ""` and an
  omitted `VALUE` both give an unset variable and an empty
  `KEYWORDS_MISSING_VALUES`, so reading that list cannot separate them.
  Under NEW, a bare `VALUE` with no argument is *also* defined and empty, and
  only `KEYWORDS_MISSING_VALUES` (`VALUE`) tells it from `VALUE ""`. With
  CMP0174 unset, both calls also print a CMP0174 warning. The program floor,
  3.25, predates CMP0174.
- Verification: reading heuristic. For each
  `grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'DEFINED[[:space:]]+[A-Za-z_]+_[A-Z][A-Z0-9_]*[[:space:]]*\)' .`
  hit that tests a parse result, confirm the floor is 3.31 or later, or that
  `cmake_policy(SET CMP0174 NEW)` sits in the pin. Empty output passes.
- Severity: SHOULD. Consumer: MOD, LIB. Floor: CMP0174 needs 3.31;
  `KEYWORDS_MISSING_VALUES` needs 3.15.

### CMK-LANG — caught by reading each `macro(`

**CMK-LANG-08 — Define commands with `function()`. Use `macro()` only when
the body must act in the caller's scope, either `return()` from the
including file (the `find_dependency()` idiom) or writing a caller-named
variable, and put a comment above the `macro(` line that says which.**
- Rationale: a macro cannot use `PARSE_ARGV` (L8: hard error), so it is
  stuck with the lossy `${ARGN}` parse. Its `foreach(${ARGN})` drops empty
  arguments (L4), and its `return()` leaves the caller (`return.rst`).
  Functions outnumber macros about 3 to 1 corpus-wide (4,739 to 1,563,
  re-counted 2026-09-26) and about 4 to 1 outside `Kitware__CMake`
  (shape audit §7). In a 15-macro
  sample, 11 needed caller scope and 1 did not (language-rules §4).
- Verification: reading heuristic. Every line printed needs a comment on the
  line above that names the caller-scope need. Empty output passes.

  ```sh
  grep -rnE -B1 --include='*.cmake' --include='CMakeLists.txt' -e '^[[:space:]]*macro[[:space:]]*\(' .
  ```

- Severity: SHOULD. The boundary depends on the caller's intent, which rests
  on argued evidence. Consumer: all. Floor: any.

**CMK-LANG-09 — Write `set(… PARENT_SCOPE)` inside a `macro()` only in a
private macro whose every call site sits inside a function. It then writes
that function's outputs. Never call such a macro from directory scope and
from a function both.**
- Rationale: a macro has no scope of its own, so `PARENT_SCOPE` lands one
  scope above whatever contains the call. Inside a function it skips that
  function and lands in its caller; at directory scope it lands in the
  parent directory (L9). The sanctioned shape is
  `Kitware__CMake@e8befb989b:Modules/CheckIPOSupported.cmake:125-133`. The
  fragile shape is `ClickHouse__ClickHouse@0995a518a8:cmake/dbms_glob_sources.cmake:16-23`,
  safe today only because all 11 of its call sites are at directory scope.
- Verification: each hit is a macro line that writes `PARENT_SCOPE`. Read
  every call site of that macro. Mixed depths are the finding. Empty output
  passes.

  ```sh
  grep -rl --include='*.cmake' --include='CMakeLists.txt' -e 'PARENT_SCOPE' . | xargs -r awk 'FNR==1{m=0} /^[[:space:]]*macro[[:space:]]*\(/{m=1} /^[[:space:]]*endmacro[[:space:]]*\(/{m=0} m && /PARENT_SCOPE/{print FILENAME":"FNR}'
  ```

- Severity: SHOULD. The mechanism is measured, but 0 live defects were found
  in the corpus. Consumer: MOD. Floor: any.

### CMK-LANG — caught by reading a `return()` or a result hand-off

**CMK-LANG-10 — Call `return(PROPAGATE …)` only inside a `function()`, or in
a listfile that has a parent scope. Never call it inside a bare `block()` in
a project's top-level `CMakeLists.txt`. In a chain of helpers, each function
relays its own hop.**
- Rationale: in a top-level `block()` the propagate fails with only a
  warning ("current scope has no parent"; `(dev)` on 3.31.12 and 4.3.4,
  `(author)` on 4.4.2), configure exits 0, and the `return()` still exits the
  file, so **the rest of the top-level listfile is silently skipped**
  ([gate] §8; re-measured on all three lines, verify wave 3). `PARENT_SCOPE` and `return(PROPAGATE)` each move a
  value one hop only ([gate] §8).
- Verification: run it on the top-level `CMakeLists.txt`. Each line printed
  is the finding. Empty output passes.

  ```sh
  awk '/^[[:space:]]*function[[:space:]]*\(/{d++} /^[[:space:]]*endfunction[[:space:]]*\(/{d--} d==0 && /return[[:space:]]*\([[:space:]]*PROPAGATE/{print FILENAME":"FNR}' CMakeLists.txt
  ```

- Severity: **MUST**. Consumer: all. Floor: `return(PROPAGATE)` and
  `block()` need 3.25 (and CMP0140 NEW, which a 3.25 floor sets); measured on
  3.31.12, 4.3.4 and 4.4.2. Corpus: 35 non-test uses, all in
  `Kitware__CMake/Modules` and all inside a `function()`; 0 in the forbidden
  shape, so the ban is a new commitment. The awk also prints a commented-out
  `return(PROPAGATE` at depth 0; skip comment lines.

### CMK-LANG — caught by a grep over `option()` and cache writes

**CMK-LANG-11 — Never declare an option, cache entry or variable of your own
whose name begins with `CMAKE_` or `_CMAKE_` (in any case), or with `_`
followed by a CMake command name. Setting a variable that CMake documents
(`CMAKE_CXX_STANDARD`) is fine. Inventing one in that namespace is not.**
- Rationale: these names are reserved (L12, `cmake-language(7)`).
  `option()` on a built-in name does not override a consumer's `-D` or preset:
  `-DCMAKE_VERBOSE_MAKEFILE=ON` survives `option(CMAKE_VERBOSE_MAKEFILE … OFF)`.
  It leaks instead: the cache entry is global, so a subproject's
  `option(CMAKE_UNITY_BUILD … ON)` switches the setting on for the parent
  project that pulled it in with `add_subdirectory()` (both measured on
  3.31.12, 4.3.4 and 4.4.2, verify wave 3). Examples:
  `microsoft__vcpkg@c4ee5a52d7:ports/duktape/CMakeLists.txt:3`
  (`option(CMAKE_VERBOSE_MAKEFILE …)`) and `ports/usockets/CMakeLists.txt:7`
  (`option(CMAKE_UNITY_BUILD …)`).
- Verification: empty output passes. CMake's own repository is the one
  exception; exclude it by name, never by pattern. For a
  `set(<CMAKE_name> … CACHE …)`, set `NAME=` to the name and run
  `cmake --help-variable-list | grep -c -x -e "$NAME"`. A result of 0 is an
  invented reserved name (the finding); names like `CMAKE_<LANG>_FLAGS`
  appear there in placeholder form, so read them.

  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e '^[[:space:]]*option[[:space:]]*\([[:space:]]*"?[Cc][Mm][Aa][Kk][Ee]_' -e '^[[:space:]]*option[[:space:]]*\([[:space:]]*"?_[Cc][Mm][Aa][Kk][Ee]_' .
  ```

- Severity: **MUST**. Consumer: all. Floor: any.

**CMK-LANG-12 — Prefix every `option()` and user-facing cache entry with
the project's name. In a monorepo, use each sub-project's own prefix, and
check per sub-project.**
- Rationale: the cache is global. An unprefixed `BUILD_TESTS` collides with
  every project that pulls this one in with `add_subdirectory()` or
  FetchContent. A repo-wide single-prefix check reports 66 % of LLVM's and
  CMake's options as unprefixed, purely from legitimate sub-project prefixes
  (language-rules §9).
- Verification: reading heuristic. Run
  `grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e '^[[:space:]]*option[[:space:]]*\(' "$SUBPROJECT_DIR"`
  per sub-project. A name without that sub-project's prefix is the finding;
  a generic verb prefix like `ENABLE_` counts as unprefixed. Empty output
  passes.
- Severity: SHOULD. Consumer: LIB, and any project others consume as a
  subproject. Floor: any.

**CMK-LANG-13 — Never add `FORCE` to a cache entry a user is meant to set
(an `option()`, a documented knob). Write computed results as
`CACHE INTERNAL`, which already implies `FORCE`, or as normal variables. To
make a changed default reach an existing build tree, say "reconfigure with
`--fresh`". Do not force it.**
- Rationale: without `FORCE`, a cache write never updates an existing entry.
  `CACHE INTERNAL` overwrites on every configure ([gate] §5, both lines). A
  `FORCE` on a knob silently discards the user's `-D` on every configure
  (`set.rst`). The two sanctioned `FORCE`s elsewhere are computed hand-offs,
  not knobs: CMK-MOD-12 `<Name>_ROOT`, and never `CMAKE_TOOLCHAIN_FILE`
  (CMK-BZL-02).
- Verification: reading heuristic. Each hit whose name is a documented
  option or knob is the finding. The grep is single-line. Empty output
  passes.

  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'CACHE[[:space:]]+[A-Z]+[^)]*FORCE' .
  ```

- Severity: SHOULD. Consumer: all. Floor: any.

**CMK-LANG-14 — In the project that declares an `option()` or cache knob,
never `set()` a normal variable of the same name. Read the cache explicitly
with `$CACHE{X}` when a normal variable may shadow it.**
- Rationale: a later plain `set()` wins every read in that scope and leaves
  the cache entry untouched, which is the classic "my `-D` did not take".
  Under CMP0126 NEW, a normal variable also survives a `set(… CACHE)` of the
  same name ([gate] §5, both lines). The one sanctioned exception is a parent
  project pre-setting a child's option before `add_subdirectory` under
  CMP0077, with set/restore (CMK-DEP-15).
- Verification: each printed line is the finding unless it is that
  parent-to-child pre-seed. Empty output passes.

  ```sh
  grep -rhoE --include='*.cmake' --include='CMakeLists.txt' -e '^[[:space:]]*option[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+' . | sed -E 's/.*\([[:space:]]*//' | sort -u | while read -r NAME; do grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e "^[[:space:]]*set[[:space:]]*\([[:space:]]*${NAME}[[:space:]]" . | grep -v -e 'CACHE' -e 'PARENT_SCOPE'; done
  ```

- Severity: SHOULD. Consumer: all. Floor: `$CACHE{}` needs 3.13; CMP0126 is
  3.21 (both below the program floor).

**CMK-LANG-15 — Test an `option()` variable by truthiness, `if(X)`. Never
compare it to `"ON"` or `"OFF"`.**
- Rationale: `option()` claims the `BOOL` type but never coerces the value.
  After `-DX=yes` or a preset string, `X:BOOL=from-cli` is stored as written
  ([gate] §5, 3.31.12 and 4.4.2). `STREQUAL "ON"` then misreads a true value.
- Verification: a hit on an `option()`-declared name is the finding. Empty
  output passes.

  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'STREQUAL[[:space:]]*"ON"' -e 'STREQUAL[[:space:]]*"OFF"' -e 'STREQUAL[[:space:]]+ON[[:space:])]' -e 'STREQUAL[[:space:]]+OFF[[:space:])]' .
  ```

- Severity: SHOULD. Consumer: all. Floor: any.

**MUST count: 7** (LANG-01, -02, -04, -05, -06, -10, -11). Each rests on a
measurement (L1-L3, L7, [gate] §8-9) or on normative text (L12). The
index's non-negotiables line should carry LANG-01, LANG-02 and LANG-05. They
are one grep each and silent when violated.

## Applied to find_ocx and the exemplars

find_ocx was read on 2026-09-26 in the **dirty working tree** on top of
`9094f87b55`. The line numbers below are the working tree's. The corpus copy
at HEAD runs about one line lower (`ocx_bootstrap`'s parse is `:691` there).

| Rule | find_ocx | Satisfied by | Violated by |
|---|---|---|---|
| LANG-01 | **satisfied**: 0 of 240 `if()` sites (the grep above prints nothing; [ocx] §4) | 43,405 of 43,962 corpus `if`-family calls | `llvm__llvm-project@e0316c1b47` (151), `Kitware__CMake@e8befb989b` (127), `qt__qtbase@0ef5a8e9ca` (47); for example `KDE__extra-cmake-modules@b4c4ec9997:toolchain/specifydependencies.cmake:36` `if(${extralibname} STREQUAL ${name})` |
| LANG-02 | **satisfied**: 13 loops, all `IN LISTS`, `IN ITEMS`, `RANGE` or `ZIP_LISTS` ([ocx] §4) | small modern repos | `llvm__llvm-project` 454 of 730, `cpp-pm__hunter@997fab148b` 158 of 185; `ClickHouse__ClickHouse@0995a518a8:cmake/sanitize_targets.cmake:4` |
| LANG-04 | **violated**: 6 of 6 parses use `${ARGN}` (`ocx.cmake:442,692,872,1072,1296,1327`), 5 of them in public commands, under a 3.19 floor that has `PARSE_ARGV` | `microsoft__vcpkg@c4ee5a52d7` (137 of 144 calls use `PARSE_ARGV`) | `llvm__llvm-project` (141 of 143 use `${ARGN}`), `cpp-pm__hunter` (50 of 50); `Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:93` |
| LANG-05 | satisfied (no `PARSE_ARGN`) | whole corpus | none. **New commitment** |
| LANG-06 | **violated, partly**: 4 of 6 check. `ocx_bootstrap` (`ocx.cmake:692`, public) and `__ocx_run` (`:442`, private) do not. This is a new finding; no audit reported it | `KDE__extra-cmake-modules@b4c4ec9997:modules/ECMFindModuleHelpers.cmake:124`; Qt's `_qt_internal_validate_all_args_are_parsed(arg)` helper | `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3786` and `cpp-pm__hunter@997fab148b:cmake/modules/hunter_patch_unrelocatable_text_files.cmake:21` (prefix mismatch); `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:541` (never read) |
| LANG-08 | reading finding: `__ocx_require_cli` (`ocx.cmake:579-597`) is the file's one macro and has no comment naming a caller-scope need. Its writes go to the cache, which a function reaches too. Not measured, so it is not called a defect | `Kitware__CMake@e8befb989b:Modules/CMakeFindDependencyMacro.cmake:122` (`return()` from the includer) | `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:16` `_qt_internal_make_output_file` (could be a function; language-rules §4) |
| LANG-09 | n/a: its macro has no `PARENT_SCOPE` | `Kitware__CMake@e8befb989b:Modules/CheckIPOSupported.cmake:125-133` | fragile, not broken: `ClickHouse__ClickHouse@0995a518a8:cmake/dbms_glob_sources.cmake:16-23` |
| LANG-10 | satisfied (no `return(PROPAGATE)`) | 35 non-test uses, all inside a `function()` (for example `Kitware__CMake@e8befb989b:Modules/GNUInstallDirs.cmake:347`) | none. **New commitment** |
| LANG-11 | satisfied (declares no options) | 1,502 of 1,504 corpus options | `microsoft__vcpkg@c4ee5a52d7:ports/duktape/CMakeLists.txt:3`, `ports/usockets/CMakeLists.txt:7` |
| LANG-12 | n/a | `gabime__spdlog` 100 %, `qt__qtbase` 89 % ([shape] §6) | the `ENABLE_` verb prefix in `ClickHouse__ClickHouse` (77 %, not a namespace) |
| LANG-13 | **satisfied**, and the audit's contrary claim is refuted: `__ocx_set_result` (`:609-611`) writes `CACHE INTERNAL`, which implies `FORCE` ([gate] §6); `__ocx_snapshot_env`'s non-`FORCE` `CACHE STRING` is the documented first-configure-wins contract | — | none measured |

New commitments with no corpus precedent: LANG-05 and LANG-10 (their traps
have no users yet), and the diff-scoped form of LANG-02. For the find_ocx
handoff note (map: "Owner decisions outstanding" 5; no issue filed): add
LANG-04 (migrate the 5 public parses to `PARSE_ARGV`; `ocx_index` becomes
`PARSE_ARGV 1`, and its `UPDATE_COMMAND` branch `PARSE_ARGV 2` once
`out_var` is a named position) and LANG-06 (`ocx_bootstrap` at `:692`).

## AI-agent failure modes

Ranked by how often each would bite, judged by corpus frequency and by how
directly the agent's training text leads to it.

1. **Writing `if(${X} STREQUAL "y")` and defending it with "CMP0054 made this
   safe".** CMP0054 covered quoted operands only. L1 shows a double
   dereference on 4.4.2. *Check:* the LANG-01 grep.
2. **Writing bare `foreach(x ${list})`**, the majority idiom in llvm and
   Hunter, so it is what training text shows. It drops empty elements (L3).
   *Check:* the LANG-02 grep on the diff.
3. **Copying the `${ARGN}` form of `cmake_parse_arguments`** (53 % of corpus
   calls; `find_dependency` itself forwards `${ARGN}`), and so losing `""`
   and splitting `;` values. *Check:* the LANG-04 grep.
4. **Writing `PARSE_ARGN` from the `latest` docs into a project with a floor
   below 4.4.** It parses nothing on 3.31 and 4.3, silently (L7). *Check:*
   the LANG-05 grep against the floor.
5. **"The cache write needs `FORCE`."** Either `FORCE` is added to a user
   knob, which breaks `-D`, or a missing `FORCE` is claimed on
   `CACHE INTERNAL`. find_ocx's audit made exactly that claim and ranked it
   the top defect. It is refuted ([gate] §6). *Check:* the LANG-13 grep,
   plus the rule that `INTERNAL` implies `FORCE`.
6. **Not checking `_UNPARSED_ARGUMENTS`, or checking it and then printing
   another prefix's variable** (Qt, Hunter). *Check:* the LANG-06 awk.
7. **Printing or comparing a generator expression at configure time**
   (`message("$<CONFIG>")`, `if("$<CONFIG>" STREQUAL …)`). The text stays
   literal (L5). *Check:* the LANG-03 grep.
8. **Putting `PARENT_SCOPE` in a macro "to return a value"**, then calling it
   from a function, so the value skips that function (L9). *Check:* the
   LANG-09 awk plus a read of the call sites.
9. **Using `return(PROPAGATE)` for a "clean early exit" at the top level**,
   which truncates the rest of the file ([gate] §8). *Check:* the LANG-10
   awk.
10. **Writing `cmake_policy(SET CMP0054 OLD)`, or any removed policy set to
    OLD.** It is a hard error from 4.0 on (measured on 4.3.4 and 4.4.2),
    and only a warning on 3.31.12 (L6). *Check:* CMK-VER-07's grep.
11. **Inventing a `CMAKE_*` option, or comparing an option to `"ON"`.**
    *Check:* the LANG-11 and LANG-15 greps.

## Open questions

**For the owner**

1. Should the find_ocx handoff note carry LANG-04 and LANG-06 (listed above),
   or does the "no issue filed" default mean these stay in this file only?
   Default: add them to the note, like the CMK-DEP and CMK-MOD items.
2. Should the Qt (`Qt6CoreMacros.cmake:3786`) and Hunter (`:21`) prefix
   mismatches go upstream? They are one-line fixes. This program's constraint
   is read-only, so the default is no.

**Another research round**

1. **cmake-language / `return(PROPAGATE)` outside the measured case.** Does
   it also truncate when it appears in a file that the top level
   `include()`s at directory scope, or in a `cmake -P` script? LANG-10's awk
   checks only the top-level `CMakeLists.txt`.
2. **cmake-language / migrating `${ARGN}` to `PARSE_ARGV`.** Before the
   `cmake-modernize` skill rewrites parses mechanically, measure a
   multi-value keyword given a quoted `"a;b"` and a list variable passed
   unquoted, under both forms, on 3.31.12 and 4.4.2. The skill needs to know
   which callers change behaviour.
3. **cmake-language / the false-positive rate of the LANG-06 awk across the
   whole corpus.** Two 10-hit samples are thin, and the partial-parse class
   (Qt `Qt6CoreMacros.cmake:190`, `:421`) was seen but never counted. Read 30
   hits.
4. **cmake-language / CMP0174 under a 3.25 floor.** Should LANG-07 become
   "set CMP0174 NEW inside the module's policy pin when running on ≥ 3.31"
   (the `if(POLICY CMP0174)` form)? Measure whether that interacts with
   CMK-MOD-05's `cmake_policy(VERSION)` pin.

## Sub-artifacts

- [cmake-language/language-rules.md](cmake-language/language-rules.md): the
  wave-3 dive. It fixes the corpus parser (bracket comments, quoted
  parentheses; 3 fixtures), and counts M-C-03, -04, -06, -08 and -09 with
  hand-read false-positive samples. It found the Qt prefix mismatch and
  folded [gate] §5, §8 and §9. Its script and data are in
  [cmake-language/scratch/language-parser/](cmake-language/scratch/language-parser/).
- [cmake-language/scratch/language-consolidation/](cmake-language/scratch/language-consolidation/):
  this consolidation's L1-L9 fixtures (`src/`), `run.sh` for all three CMake
  lines, and `unparsed.awk` (L10).

## Key sources

1. [Help/command/if.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/if.rst): the §Variable Expansion text behind LANG-01.
2. [Help/manual/cmake-language.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-language.7.rst): reserved identifiers (LANG-11), and the argument grammar behind the parser fix.
3. [Help/command/cmake_parse_arguments.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_parse_arguments.rst): `PARSE_ARGV` 3.7, `PARSE_ARGN` 4.4, `KEYWORDS_MISSING_VALUES` 3.15, function-only signatures.
4. [Help/command/macro.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/macro.rst): the `ARGN` substitution caveats and the `foreach` fix (LANG-02, LANG-08).
5. [Help/command/return.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/return.rst): `PROPAGATE`, and `return()` from a macro (LANG-08, LANG-10).
6. [Help/command/set.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/set.rst): "Use of this type implies `FORCE`" (LANG-13).
7. [Help/policy/CMP0054.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0054.rst): removed in 4.0; covers quoted operands only.
8. [Help/policy/CMP0126.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0126.rst) and [CMP0174.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0174.rst) @ v4.4.2: cache shadowing (LANG-14) and empty one-value keywords (LANG-07).
9. Measurement L1-L9: `cmake-language/scratch/language-consolidation/run.sh` on 3.31.12, 4.3.4 and 4.4.2 (2026-09-26).
10. Measurement L10: `unparsed.awk` over 1,015 non-test corpus parses in 475 files (2026-09-26 SHAs).
11. [gate] §5, §8, §9: `cmake-versions-and-gate/gate-and-language-semantics.md`, which measured the cache, scope and `${ARGN}` behaviour on 3.31.12 and 4.4.2.
12. `cmake-language/language-rules.md` §3, §4, §6, §9: the corpus counts, the 30-hit and 15-macro hand samples, and the monorepo prefix table.
13. `cmake-audit/find-ocx-cmake-shape-and-contracts.md` §2-§4, §7: find_ocx's quoting census and parse sites, and its refuted memo claim.

## Revision log

- 2026-09-26, verify wave 3: L6, Verdict 6, Conflict 6 and failure mode 10 said the `CMP0054 OLD` hard error starts at 4.3; it starts at 4.0, the release that removed the OLD behaviour (`CMP0054.rst` @ v4.0.0), and was measured on 4.3.4 and 4.4.2.
- 2026-09-26, verify wave 3: LANG-01's grep missed bare operands of `LESS`, `GREATER`, `STRLESS`, `STRGREATER` and `PATH_EQUAL`, and every bare right-hand operand; both are measured double lookups on all three lines. The grep is widened and was run against a planted violation.
- 2026-09-26, verify wave 3: LANG-02's diff-scoped check skipped new untracked files, failed on deleted ones, and missed `foreach(x ${A} ${B})`; it now lists untracked files, filters out deletions and matches any bare `${` after the loop variable.
- 2026-09-26, verify wave 3: LANG-04's rationale said `${ARGN}` makes `VALUE ""` look like an omitted keyword and that `PARSE_ARGV` fixes that. It looks like a bare `VALUE`, and `PARSE_ARGV` keeps `""` apart only where CMP0174 is NEW (re-measured on 3.31.12 and 4.4.2).
- 2026-09-26, verify wave 3: LANG-05's rationale said the `latest` docs show `PARSE_ARGN` without its floor; they carry `versionadded:: 4.4`, and the trap is that older binaries accept the call silently.
- 2026-09-26, verify wave 3: LANG-07 told readers to use `KEYWORDS_MISSING_VALUES` to separate `""` from an omitted keyword below CMP0174 NEW; that list is empty in both cases (measured). The rule now says to treat empty as absent there, and to use the list under NEW to reject a bare keyword.
- 2026-09-26, verify wave 3: LANG-08 said functions outnumber macros about 4 to 1; it is about 3 to 1 corpus-wide (4,739 to 1,563) and 4 to 1 only without `Kitware__CMake`.
- 2026-09-26, verify wave 3: L10 and LANG-06 said 42 % of 1,076 calls; 1,076 counts every mention of the word. There are 1,015 call matches, so 453 is 45 %.
- 2026-09-26, verify wave 3: LANG-10 and the find_ocx table said the corpus has 0 non-test `return(PROPAGATE)` uses; it has 35, all inside a `function()` in `Kitware__CMake/Modules`, with 0 in the forbidden shape. The rationale is re-measured on all three lines, with the warning category per line.
- 2026-09-26, verify wave 3: LANG-11's rationale said `option()` on a `CMAKE_` name can override a consumer's `-D` or preset; measured, `-D` survives, and the harm is that the global cache entry leaks into the parent project.
