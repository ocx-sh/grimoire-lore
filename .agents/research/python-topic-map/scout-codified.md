---
title: Codified Python Practice — Landscape Sweep
corpus: ruff rule index, ruff settings/preview/formatter docs, pylint message index, pyright configuration reference, bandit check index, Google Python style guide, pytest conventions
agent: scout-codified
model: sonnet
date_researched: 2026-08-22
sources_count: 18
---

# Codified Python Practice — Landscape Sweep

Full enumeration of the *codified* end of the Python quality landscape: linter rule
indexes, type-checker diagnostic catalogues, and style-guide tables of contents,
fetched from each tool's own index (ruff's index fetched via its own CLI —
`ruff rule --all --output-format json`, 969 rules, 59 rule-family prefixes — which
is more authoritative than the rendered docs page and was cross-checked against it).
This is a coverage instrument, not a curated pick list: the `no` rows are the point.

## Table of contents

1. [Complete ruff rule family index](#1-complete-ruff-rule-family-index) (58 rows)
2. [Highest-yield individual rules in unselected families](#2-highest-yield-individual-rules-in-unselected-families) (41 rows)
3. [Ruff's own settings surface](#3-ruffs-own-settings-surface)
4. [pylint's message index and the ruff gap](#4-pylints-message-index-and-the-ruff-gap)
5. [pyright's configuration reference](#5-pyrights-configuration-reference)
6. [bandit's full check index](#6-bandits-full-check-index)
7. [Google Python style guide](#7-google-python-style-guide)
8. [pytest's own conventions](#8-pytests-own-conventions)
- [Candidate topics](#candidate-topics)
- [Whole sections nobody's rules touch](#whole-sections-nobodys-rules-touch)
- [Sources](#sources)

---

## 1. Complete ruff rule family index

Ruff's own CLI reports **969 rules across 59 code-prefixes** (verified via
`ruff rule --all --output-format json`, ruff 0.16.4, and cross-checked against
the family list on https://docs.astral.sh/ruff/rules/, which independently states
"over 900 lint rules"). E and W share one linter (pycodestyle) and are merged into
one row below, giving **58 table rows**. Of these, **13 are selected** in the
strictest project config, **2 more are partially selected** (only in the secondary
config), and **43 are not selected anywhere today**.

"Selected today" is checked against the two configs given as ground truth: the
strictest selects `F, E, W, I, UP, B, SIM, RET, PTH, PL, RUF, S, ISC, FURB`; the
other selects `E, W, F, I, B, UP, ANN, RUF, D` (pydocstyle convention=google).

**Attribution, added 2026-08-23**: the "strictest" config is
`/home/mherwig/dev/grimoire-lore/ruff.toml` — this catalog's own internal-tooling
config (the artifact validator and index scripts under `.claude/skills/research-lang/`
and `scripts/`), not any of the four researched codebase shapes. Neither this file nor
`codified-reconciled.md` named the path when the term was first used; a reader
following "strictest" as a citation had no way to find it. None of ocx/test,
grimoire/test, ocx-sdk-python, or index/bot select these 14 families as a set today —
this is a fifth, separate config, useful as an existence proof that the selection is
livable, not as a claim about what the four researched shapes already do.

| Prefix | Family | What it catches | Selected today? | Worth adopting? |
|---|---|---|---|---|
| AIR | Airflow | Airflow-specific operator/task issues (task-id/variable mismatch, deprecated API use) | no | no — no Airflow anywhere in these four shapes |
| ANN | flake8-annotations | Missing/incomplete type annotations on args, returns, `self`/`cls` | partial — selected only in the D+ANN config, not the strictest | yes — shape2 (typed SDK) needs annotation coverage enforced at lint time, not just wherever pyright happens to infer |
| ARG | flake8-unused-arguments | Unused parameters in functions, methods, classmethods, staticmethods, lambdas | no | yes — shape1/shape2 both lean on Protocol/fixture/callback signatures where a dead parameter signals interface drift |
| ASYNC | flake8-async | Blocking calls (sleep, subprocess, file I/O, HTTP) inside `async def` that stall the event loop | no | yes — shape2 is an asyncio SDK; this is the one family that catches "awaited nothing, blocked the loop" |
| A | flake8-builtins | Shadowing Python builtins via variable, argument, class attribute, or import names | no | partial — cheap to add for shape2/shape3, but pyright/pylint already catch some of this indirectly |
| B | flake8-bugbear | General correctness bugs: mutable default args, loop-variable capture in closures, broad excepts, misuse of `assert` | yes | already selected |
| BLE | flake8-blind-except | `except:`/`except Exception:` with no re-raise or handling | no | yes — shape1's subprocess/pexpect/docker calls are exactly where a bare except silently eats a CLI failure |
| COM | flake8-commas | Trailing-comma consistency in multi-line collections/calls | no | no — ruff's own formatter docs list COM812/COM819 as formatter conflicts; the right answer is "don't select," not a gap |
| C4 | flake8-comprehensions | Inefficient or needless comprehension/collection-construction patterns (`list(x for x in y)`, `dict([...])`, etc.) | no | yes — pure efficiency/readability win, no tradeoff identified, applies to all four shapes |
| CPY | flake8-copyright | Missing copyright header at top of file | no | no — no stated licensing/header requirement in this catalogue |
| DTZ | flake8-datetimez | Naive `datetime`/`date` construction (`.now()`, `.today()`, `.utcnow()`, `strptime` without tz) | no | yes — shape2's timestamps cross a network boundary; naive-vs-aware bugs stay silent until a DST/UTC edge case |
| D | pydocstyle | Docstring presence and formatting (missing docstring, blank-line placement, quote style) | partial — selected in the D+ANN config only | already partial |
| DJ | flake8-django | Django ORM/model-definition issues | no | no — no Django in any of the four shapes |
| DOC | pydoclint | Docstring-to-signature mismatches: undocumented/extraneous params, missing `Raises`/`Returns`/`Yields` | no | yes — D checks docstring *presence*, not that it matches the *signature*; on a coverage=100 typed SDK a stale `Raises:` is exactly the kind of drift D can't see |
| E/W | pycodestyle | PEP 8 whitespace/indentation errors (E) and stylistic warnings (W) | yes | already selected |
| EM | flake8-errmsg | Raw string/f-string/`.format()` literals passed directly to `raise` | no | partial — worth it for shape2's public exception surface, low yield elsewhere |
| ERA | eradicate | Commented-out code left in a file | no | partial — broadly useful but noisy against fixtures/data files with example payloads in comments; needs per-file-ignores first |
| EXE | flake8-executable | Shebang correctness and executable-bit/shebang mismatches | no | yes for shape4 — the stdlib-only single-file tools are literally distributed as `chmod +x` scripts; this is exactly their failure mode |
| F | Pyflakes | Undefined names, unused imports, unused variables, redefinitions | yes | already selected |
| FA | flake8-future-annotations | Missing `from __future__ import annotations` | no | no — both shapes are py>=3.10/3.12; UP (pyupgrade, already selected) already drives modernization the other direction |
| FAST | FastAPI | FastAPI-specific issues (redundant response models, missing annotations) | no | no — no FastAPI dependency stated |
| FBT | flake8-boolean-trap | Boolean positional parameters and boolean positional call-site literals | no | yes — shape2's public API is exactly where a boolean positional argument is a permanent footgun once shipped |
| FIX | flake8-fixme | Presence of TODO/FIXME/XXX/HACK comments (treated as a lint violation) | no | no — too blunt for agent-authored code with no ticket system behind it; better as an explicit non-rule than a false gap |
| FLY | flynt | Old-style string formatting (`%`, `.format()`) that could be an f-string | no | partial — UP already covers most of this via pyupgrade; marginal extra yield |
| FURB | refurb | Idiomatic/algorithmic modernizations (refurb-ported checks) | yes | already selected |
| G | flake8-logging-format | Logging call antipatterns: %-args vs string interpolation, f-strings in log calls, `+` concatenation | no | yes — shape3 (index/bot) is a logging-heavy automation codebase; G004 (f-string in logging) is a real perf/injection footgun there |
| I | isort | Import sorting/grouping | yes | already selected |
| ICN | flake8-import-conventions | Non-conventional import aliases (e.g. `np` for numpy) | no | no — the convention list is data-science-specific (numpy/pandas/matplotlib); none of these are dependencies here |
| INP | flake8-no-pep420 | Missing `__init__.py` causing an implicit namespace package | no | yes — shape3's 93-file tree is exactly where an accidental namespace package silently breaks pytest collection or packaging |
| INT | flake8-gettext | Format-string issues in gettext/i18n calls | no | no — no i18n/gettext usage in any shape |
| ISC | flake8-implicit-str-concat | Implicit string concatenation (accidental adjacent string literals) | yes | already selected |
| LOG | flake8-logging | Logger instantiation/configuration correctness (root-logger calls, `getLogger(__name__)`) | no | yes — pairs with G; shape3's automation bot needs a correct logger hierarchy for its structured logs |
| N | pep8-naming | PEP 8 naming convention violations (class/function/arg case, `self`/`cls` naming, exception-name suffix) | no | yes — zero-cost, high-signal, currently absent from *both* configs despite catching real mistakes (e.g. `self` misnamed in a method) |
| NPY | NumPy-specific rules | NumPy API misuse and deprecated NumPy patterns | no | no — no NumPy dependency |
| PD | pandas-vet | Inefficient/problematic pandas patterns | no | no — no pandas dependency |
| PERF | Perflint | Performance-degrading patterns (list-cast before iterating, try/except inside a loop, manual list/dict comprehension rewrites) | no | partial — the 95k-LOC acceptance harness is large enough for these patterns to matter, but yield is modest next to what PL/RUF (already selected) already catch |
| PGH | pygrep-hooks | Pattern-matched mistakes: blanket `noqa`/`type: ignore`, bare `eval()`, deprecated `log.warn` | no | yes — directly enforces "verification only, no blanket suppression," which matters *more* in a no-human-in-loop workflow where an agent could silently blanket-ignore a failing lint instead of fixing it |
| PIE | flake8-pie | Misc anti-patterns: unnecessary `pass`, duplicate enum values, multiple `.startswith()` calls that should be one | no | partial — grab-bag family, individually low yield but cheap as a whole |
| PL | Pylint (ported subset: PLC/PLE/PLR/PLW) | Convention, error, refactor, and warning checks ported from pylint | yes | already selected |
| PT | flake8-pytest-style | Pytest fixture/parametrize/raises/mark style and correctness conventions | no | YES, highest priority — the single highest-value unselected family for shape1: 190+76 files of pytest replicated across ~8 repos, and it is not selected in *either* config today |
| PTH | flake8-use-pathlib | `os.path`/`os` calls that should be `pathlib` equivalents | yes | already selected |
| PYI | flake8-pyi | Type stub (`.pyi`) file syntax/semantics correctness | no | no — no `.pyi` stub files are shipped separately from the inline-annotated SDK source |
| Q | flake8-quotes | Quote-style consistency (single vs double) | no | no — formatter-owned; ruff's own docs say disable Q when using the ruff formatter |
| RET | flake8-return | Return-statement patterns: unnecessary `else` after return, inconsistent implicit/explicit returns | yes | already selected |
| RSE | flake8-raise | Unnecessary parentheses on a raised exception | no | no — single-rule family, negligible yield |
| RUF | Ruff-specific rules | Ruff's own checks (mutable class defaults, noqa hygiene, ambiguous unicode, etc.) | yes | already selected |
| S | flake8-bandit | Security issues: hardcoded credentials, unsafe deserialization, SQL injection, weak crypto, `shell=True` | yes | already selected |
| SIM | flake8-simplify | Code simplification opportunities (collapsible ifs, redundant boolean logic) | yes | already selected |
| SLF | flake8-self | Access to `_private`/`__dunder` members from outside the owning class | no | yes — shape1's acceptance harness is meant to be *black-box*; SLF001 catches a test reaching into the CLI wrapper's private attributes instead of its public surface |
| SLOT | flake8-slots | Missing `__slots__` on subclasses of `str`/`tuple`/`NamedTuple` | no | partial — relevant for shape2's typed value objects if any subclass builtins directly; narrow applicability |
| T10 | flake8-debugger | `pdb`/`breakpoint()`/debugger traces left in code | no | yes — cheap universal safety net; a stray breakpoint in an agent-authored commit is a real failure mode with zero cost to check for |
| T20 | flake8-print | `print()`/`pprint()` calls | no | yes, with carve-out — shape2's shipped SDK must never print as a side effect; shape4's stdlib CLIs are the one place print *is* the output channel, so this needs a per-file-ignore, not a blanket ban |
| TC | flake8-type-checking | Typing-only imports that should move into an `if TYPE_CHECKING:` block (and the inverse mistake) | no | yes — shape2 is exactly a pyright-strict, asyncio typed SDK; keeping typing-only imports out of the runtime import graph avoids import cycles and needless startup cost |
| TD | flake8-todos | TODO comment metadata (author, ticket link) formatting | no | no — same concern as FIX; process-heavy without a ticket system behind it |
| TID | flake8-tidy-imports | Banned imports/modules, relative-import policy, lazy-import mismatches | no | yes — shape2's shipped package should ban relative imports across its own package boundary and deep-private cross-module imports |
| TRY | tryceratops | Exception-handling antipatterns: vanilla `Exception`, verbose re-raise, missing `raise ... from`, `logging.error` instead of `.exception` | no | YES, high priority — directly serves shape1's subprocess/pexpect error handling and shape2's typed exception surface; textbook CLI-wrapper bugs |
| UP | pyupgrade | Outdated syntax for the target Python version | yes | already selected |
| YTT | flake8-2020 | `sys.version` string-comparison antipatterns | no | no — low yield, this antipattern is rare in these codebases |

---

## 2. Highest-yield individual rules in unselected families

Picked for the two shapes that most need them — the pytest/subprocess/pexpect/docker
acceptance harness (shape 1) and the pyright-strict asyncio typed SDK (shape 2) —
pulled directly from ruff's rule catalogue, not guessed. 41 rules named (some rows
bundle 2–3 closely related codes).

| Rule code(s) | Name | Family | What it prevents |
|---|---|---|---|
| PT011 | pytest-raises-too-broad | flake8-pytest-style | `pytest.raises(Exception)` with no `match=` swallows unrelated failures as a false pass |
| PT012 | pytest-raises-with-multiple-statements | flake8-pytest-style | forces a `pytest.raises()` block to the single statement that actually raises, so the assertion can't accidentally pass on a different line |
| PT017 | pytest-assert-in-except | flake8-pytest-style | catches `assert` inside an `except:` block, which silently no-ops if the exception never fires |
| PT018 | pytest-composite-assertion | flake8-pytest-style | splits multi-condition `assert a and b` so a failure names which condition actually failed |
| PT006/PT007 | pytest-parametrize-names/values-wrong-type | flake8-pytest-style | malformed `@pytest.mark.parametrize` args silently drop test cases instead of erroring |
| PT028 | pytest-parameter-with-default-argument | flake8-pytest-style | a default value on a test function's parameter usually means a missing `@parametrize`, hiding un-run cases |
| TC001/002/003 | typing-only-*-import | flake8-type-checking | typing-only imports left at runtime cost startup time and can create import cycles in a package |
| TC004 | runtime-import-in-type-checking-block | flake8-type-checking | the inverse mistake — an import actually needed at runtime was hidden behind `TYPE_CHECKING`, causing a `NameError` |
| TC006 | runtime-cast-value | flake8-type-checking | an unquoted type expression inside `typing.cast()` is evaluated eagerly instead of treated as a forward reference |
| ARG001/002 | unused-function-argument / unused-method-argument | flake8-unused-arguments | a parameter that's never read usually means an interface (Protocol, abstract method, fixture) drifted out of sync with its implementation |
| ARG005 | unused-lambda-argument | flake8-unused-arguments | same drift, in a callback passed to a higher-order function |
| ASYNC210/212 | blocking-http-call-in-async-function (+ httpx variant) | flake8-async | a synchronous HTTP call inside `async def` blocks the whole event loop, not just the current coroutine |
| ASYNC220/221/222 | *-process-in-async-function | flake8-async | blocking subprocess creation/run/wait inside async code — the same footgun the harness itself is built to avoid, but inside the SDK |
| ASYNC230 | blocking-open-call-in-async-function | flake8-async | synchronous file I/O inside `async def` stalls the loop |
| ASYNC251 | blocking-sleep-in-async-function | flake8-async | `time.sleep()` instead of `asyncio.sleep()` blocks the entire loop, not just the caller |
| TRY002 | raise-vanilla-class | tryceratops | raising bare `Exception()` gives callers nothing to catch selectively |
| TRY003 | raise-vanilla-args | tryceratops | a long message built inline at the raise site belongs on the exception class instead, so every raise site stays consistent |
| TRY004 | type-check-without-type-error | tryceratops | a manual `isinstance` check that fails should raise `TypeError`, not a generic exception |
| TRY200/TRY201 | reraise-no-cause / verbose-raise | tryceratops | re-raising without `raise ... from` (or over-specifying the exception name) discards the original traceback context |
| TRY400 | error-instead-of-exception | tryceratops | `logging.error()` inside an `except` block drops the traceback that `logging.exception()` would capture — a real debugging-time loss |
| BLE001 | blind-except | flake8-blind-except | a bare/overly-broad `except` is exactly how a subprocess/pexpect/docker failure gets silently swallowed in the acceptance harness |
| SLF001 | private-member-access | flake8-self | a test reaching into a `_private` attribute breaks the harness's black-box contract with the CLI under test |
| DTZ001/DTZ005 | call-datetime-without-tzinfo / call-datetime-now-without-tzinfo | flake8-datetimez | naive datetimes crossing the SDK's network boundary silently misbehave at DST/UTC edges |
| DTZ007 | call-datetime-strptime-without-zone | flake8-datetimez | parsing a timestamp string without attaching a timezone reproduces the same naive-datetime bug at the parsing boundary |
| PGH001 | eval | pygrep-hooks | bare `eval()` is banned outright — same class of risk bandit's B307 flags, but pattern-matched instead of AST-based |
| PGH003 | blanket-type-ignore | pygrep-hooks | a bare `# type: ignore` suppresses *every* pyright error on the line, not just the one intended — directly relevant on a pyright-strict SDK |
| PGH004 | blanket-noqa | pygrep-hooks | a bare `# noqa` suppresses every ruff rule on the line; in a no-human-in-loop workflow this is exactly how an agent could hide a real violation instead of fixing it |
| N801/N802 | invalid-class-name / invalid-function-name | pep8-naming | catches a class that isn't CapWords or a function that isn't lowercase — cheap, zero-tradeoff signal |
| N806 | non-lowercase-variable-in-function | pep8-naming | a local variable that isn't lowercase, often a copy-paste from a different naming convention |
| N818 | error-suffix-on-exception-name | pep8-naming | a custom exception class not ending in `Error` breaks the convention callers rely on to `except *Error` |
| T100 | debugger | flake8-debugger | catches a stray `pdb`/`ipdb`/`breakpoint()` call left in committed code |
| T201 | print | flake8-print | a `print()` call in library code becomes stdout noise for every caller of the shipped SDK |
| FBT001/FBT002 | boolean-type-hint-positional-argument / boolean-default-value-positional-argument | flake8-boolean-trap | a boolean positional parameter on a public API is unreadable at every call site (`connect(True)`) and a permanent footgun once shipped |
| C408 | unnecessary-collection-call | flake8-comprehensions | `dict()`/`list()` calls that should be literals — pure efficiency/readability, no downside |
| C416/C419 | unnecessary-comprehension / unnecessary-comprehension-in-call | flake8-comprehensions | a comprehension that just rebuilds its input, wasting a full iteration |
| DOC501 | docstring-missing-exception | pydoclint | an exception the function actually raises isn't documented in its `Raises:` section — a real gap D (pydocstyle) can't see since it only checks docstring presence |
| DOC201 | docstring-missing-returns | pydoclint | a function that returns a value has no `Returns:` section — same presence-vs-content gap as DOC501 |
| TID252 | relative-imports | flake8-tidy-imports | relative imports across the shipped package's own module boundary make refactors harder to trace |
| INP001 | implicit-namespace-package | flake8-no-pep420 | a directory missing `__init__.py` becomes an implicit namespace package, which silently breaks pytest collection or packaging for index/bot's 93-file tree |
| G004 | logging-f-string | flake8-logging-format | an f-string in a logging call always formats eagerly even when the log level would suppress it — a real perf cost in a logging-heavy automation bot |
| LOG002 | invalid-get-logger-argument | flake8-logging | `getLogger()` not called with `__name__` breaks the logger hierarchy automation tooling relies on for per-module log control |

---

## 3. Ruff's own settings surface

**Preview rules** (`docs.astral.sh/ruff/preview/`): `preview = true` (or `--preview`)
unlocks unstable rules, fixes, and formatter style changes, but does **not** auto-enable
them — they still need explicit `select`/`extend-select`. Preview rules carry no
stability guarantee: "warnings about deprecated features may turn into errors when
using preview mode." The docs don't explicitly warn against CI use, but the instability
contract argues against it for an unattended pipeline.

**Fix safety tiers** (`docs.astral.sh/ruff/linter/`): fixes are **safe** (preserve
runtime behavior; may only remove comments when deleting a whole statement/expression)
or **unsafe** (may change runtime behavior and/or drop comments — e.g. `RUF015`
rewriting `list(...)[0]` to `next(iter(...))` changes the exception type from
`IndexError` to `StopIteration` on an empty collection). `ruff check --fix` applies
only safe fixes by default; `--unsafe-fixes` previews unsafe ones, `--fix --unsafe-fixes`
applies them. Per-rule overrides: `extend-safe-fixes` / `extend-unsafe-fixes`. Rule
resolution order: CLI flags > working-directory config file > inherited parent
config files, applied as `lint.select` → `lint.extend-select` → `lint.ignore`. Exit
codes: `0` clean/all-fixed, `1` violations found, `2` abnormal termination (bad
config/CLI/internal error); `--exit-zero` and `--exit-non-zero-on-fix` change this.

**Per-plugin settings** (`docs.astral.sh/ruff/settings/`) exist for essentially every
family with configurable behavior — the ones most relevant to the four shapes:
`lint.flake8-pytest-style` (fixture/parametrize/mark formatting preferences),
`lint.flake8-type-checking` (strict mode forcing *all* typing-only imports behind
`TYPE_CHECKING`, not just some), `lint.flake8-tidy-imports` (banned-api, relative-import
policy), `lint.flake8-annotations` (suppress-untyped / allow-star-args toggles),
`lint.pydocstyle` (convention + decorator handling — already set to `google`),
`lint.mccabe` (max-complexity threshold), `lint.pylint` (max-args/branches/nesting/
statements thresholds), `lint.isort`, `lint.flake8-bandit` (markup-function allowlist,
temp-dir detection). `per-file-ignores` / `extend-per-file-ignores` map a glob to a
list of rule codes/prefixes to drop for matching files — the standard mechanism for
carving out `tests/**` (e.g. dropping `S101` for `assert`, `ARG001` for unused fixture
params) or `__init__.py` (`F401`, `E402`) without weakening the rule everywhere else.

**Formatter/linter conflicts** (`docs.astral.sh/ruff/formatter/`): ruff's own docs
name these rules as producing output the formatter would immediately re-break, i.e.
the correct answer is "don't select," not a gap: `W191`, `E111`, `E114`, `E117`
(indentation), `D203`, `D206`, `D300` (docstring formatting), `Q000`–`Q004` (quote
style), `COM812`, `COM819` (trailing commas), `ISC002` (multi-line implicit
concatenation, under specific isort settings). `E501` is a softer conflict — the
formatter only best-effort wraps lines.

---

## 4. pylint's message index and the ruff gap

**Categories**: `C` convention, `R` refactor, `W` warning, `E` error, `F` fatal, plus
`I` informational (about the lint run itself, e.g. `I0011` locally-disabled). Message
IDs are `<letter><digit-block>`, with the digit-block identifying the originating
checker (examples pulled from pylint's own docs: `E0401` import-error, `E1101`
no-member, `E1102` not-callable; `W0102` dangerous-default-value, `W0212`
protected-access, `W0611` unused-import; `C0103` invalid-name, `C0301` line-too-long;
`R0901` too-many-ancestors, `R0913` too-many-arguments).

**The gap** (`docs.astral.sh/ruff/faq/`): pylint implements ~409 rules with ~209
overlapping ruff's 900+; parity is explicitly tracked in
[astral-sh/ruff#970](https://github.com/astral-sh/ruff/issues/970). Ruff's own FAQ
names the structural reason pylint still isn't fully subsumable: **"Pylint does more
type inference than Ruff (e.g., Pylint can validate the number of arguments in a
function call)."** Pylint also supports third-party plugin checkers; ruff does not.
For this catalogue's shapes, the practical gap is pylint's call-site argument-count
and type-inference checks (`E1120` no-value-for-parameter, `E1121`
too-many-function-args, `E1123` unexpected-keyword-arg) — none of ruff's `PL*` rules
or pyright strict replicate call-site arity checking against a function's actual
signature the way pylint's type inference does.

---

## 5. pyright's configuration reference

Full diagnostic-rule table fetched from pyright's own config reference
(`microsoft/pyright/docs/configuration.md`), 82 diagnostic rules total.

**`basic` vs `standard` vs `strict` deltas** — rules that turn on partway up the
ladder rather than all being present from `basic`:
- **off → basic**: everything except a small "always-on regardless of mode" core
  (`reportMissingModuleSource` is `warning` even at `off`).
- **basic → standard** (5 rules go from `none`/absent to `error`):
  `reportFunctionMemberAccess`, `reportIncompatibleMethodOverride`,
  `reportIncompatibleVariableOverride`, `reportOverlappingOverload`,
  `reportPossiblyUnboundVariable`.
- **standard → strict** (the largest jump — roughly 30 rules go from `none` to
  `error`), including every "Unknown-type" rule (`reportUnknownArgumentType`,
  `reportUnknownLambdaType`, `reportUnknownMemberType`, `reportUnknownParameterType`,
  `reportUnknownVariableType`), every "Unused-*" rule
  (`reportUnusedClass/Import/Function/Variable`), `reportMissingParameterType`,
  `reportMissingTypeArgument`, `reportPrivateUsage`, `reportUntypedBaseClass`,
  `reportUntypedClassDecorator`, `reportUntypedFunctionDecorator`,
  `reportUntypedNamedTuple`, `reportConstantRedefinition`, `reportDeprecated`,
  `reportDuplicateImport`, `reportInconsistentConstructor`,
  `reportInvalidStubStatement`, `reportMatchNotExhaustive`,
  `reportTypeCommentUsage`, `reportUnnecessaryCast/Comparison/Contains/IsInstance`.
- **`reportMissingTypeStubs`** is the one rule that's `none` through `basic` and
  `standard` and only turns on at `strict` — meaning `ocx-sdk-python`'s
  `pyright strict on src` setting is the *only* mode in this catalogue's stack that
  would flag an untyped third-party dependency at all.

**Ten rules stay `none` even at `strict`** — the genuine gap list, each an explicit
decision pyright leaves to the project: `reportCallInDefaultInitializer`,
`reportImplicitOverride`, `reportImplicitStringConcatenation`, `reportImportCycles`,
`reportMissingSuperCall`, `reportPropertyTypeMismatch`,
`reportUninitializedInstanceVariable`, `reportUnnecessaryTypeIgnoreComment`,
`reportUnreachable`, `reportUnusedCallResult`.

**Practical consequences of the two headline "reportUnknown*"-adjacent rules**:
`reportMissingTypeStubs` (`strict`-only) fires whenever an imported third-party
module has no stub and no inline types — on a typed SDK depending on other
libraries, this either forces a `py.typed`-carrying dependency set or a
per-import suppression, and is worth surfacing explicitly rather than discovering
it as CI noise. `reportUnknownMemberType` (`strict`-only) fires on any attribute
access whose type pyright can't determine — the most common source of strict-mode
noise against a partially-typed or `Any`-leaking dependency, and the rule most
likely to need a scoped `# pyright: ignore[reportUnknownMemberType]` rather than a
blanket suppression (which `PGH003` — see §2 — would itself flag).

---

## 6. bandit's full check index

Full B1xx–B7xx index fetched from `bandit.readthedocs.io` (plugins index page plus
the two blacklist sub-pages for B3xx/B4xx, which are not on the main plugins page).

| Range | Category | Checks | Ruff `S` coverage |
|---|---|---|---|
| B1xx | Misc (assert/exec/hardcoded secrets/temp files) | B101–B113 | Ported (`S101` assert, `S102` exec, `S104` bind-all-interfaces, `S105`–`S107` hardcoded passwords, `S108` hardcoded temp dir, `S110`/`S112` try-except-pass/continue, `S113` request-without-timeout) |
| B2xx | Framework misconfiguration | B201 flask_debug_true, B202 tarfile_unsafe_members, B324 hashlib | `S201`/`S202` ported; **B324 (weak hashlib algorithm) is ported, as `S324` `hashlib-insecure-hash-function`** — corrected 2026-08-23, see below |
| B3xx | Blacklisted calls | B301 pickle … **B325 tempnam** (pickle, marshal, md5, weak ciphers, `mktemp`, `eval`, `mark_safe`, `urlopen`, `random`, `telnetlib`, XML parsers B313–B320, `ftplib`, py2 `input`, unverified SSL context) | Ported as `S301`–`S324`. **`B325` (`os.tempnam`/`tmpnam`, symlink-attack-vulnerable) is NOT ported** — verified against ruff's real 969-rule catalogue, which has no `S325`; grepped the fleet (`ocx/test`, `grimoire/test`, `ocx-sdk-python`, `index/bot`, `ocx/.claude/hooks`) for `tempnam`/`tmpnam` — **0 hits everywhere**, so this gap has zero current exposure in this fleet |
| B4xx | Blacklisted imports | B401 telnetlib … B415 pyghmi (insecure modules: pickle, subprocess, XML parsers, `xmlrpc`, `pycrypto`) | Ported as `S401`–`S415` |
| B5xx | Cryptography/TLS | B501–B509 (no-cert-validation, bad SSL version/defaults, weak keys, `yaml.load`, no host-key verification, weak SNMP) | Ported as `S501`–`S509` |
| B6xx | Injection | B601–B615 (paramiko, `shell=True` variants, hardcoded SQL, wildcard injection, django rawsql, B613 trojansource, **B614 pytorch_load, B615 huggingface_unsafe_download**) | B601–B612 ported as `S601`–`S612`; **B613 is ported, but not as an `S` code** — it's `PLE2502` `bidirectional-unicode` (a Pylint-family rule, not flake8-bandit's), so a naive B-number→S-number search misses it. **`B614`/`B615` are genuinely NOT ported** — ruff avoids third-party-library-specific rules (pytorch/Hugging Face) by policy |
| B7xx | XSS | B701 jinja2_autoescape_false, B702 mako templates, B703 django_mark_safe, B704 markupsafe_markup_xss | B701/B702/B704 ported; **B703 is ported, but as `S308` `suspicious-mark-safe-usage`, not `S703`** — same naive-numbering trap as B613 |

**The gap, by name — corrected 2026-08-23**: this table originally claimed **5 unported
checks** (`B324`, `B613`, `B614`, `B615`, `B703`), cited from
[astral-sh/ruff#20129](https://github.com/astral-sh/ruff/issues/20129) at face value.
Two things were wrong with that: the range this table stated for B3xx (`S301`–`S325`)
was itself fabricated — ruff's real ceiling there is `S324`, one short of what was
claimed, which is how the *actual* 6th gap (`B325`, never listed) went unnoticed while
the *wrong* one (`B324`) was listed as missing. Second, re-reading the issue's own
comment thread (it is closed, not open, as of 2025-08-28) shows the maintainers already
addressed 3 of the 5 the day it was filed: `B324`→`S324`, `B613`→`PLE2502`,
`B703`→`S308` — none under the B-number-shaped `S` code a naive search expects, which is
exactly why a code-existence check alone (rather than reading the issue's actual
resolution) missed it. **The real, current gap is 3 checks**: `B325` (`os.tempnam`/
`tmpnam`, zero fleet hits — see table), `B614` (`torch.load` unsafe deserialization),
`B615` (unsafe Hugging Face model download) — the latter two deliberately excluded by
ruff's own maintainers as out-of-scope for a general-purpose linter (third-party-library-
specific). This correction also invalidates the "5 unported" framing repeated in
`codified-reconciled.md` §4 — see that file for the matching fix.

---

## 7. Google Python style guide

Full section list from `google.github.io/styleguide/pyguide.html`:

**Python Language Rules (§2)**: 2.1 Lint · 2.2 Imports · 2.3 Packages · 2.4
Exceptions · 2.5 Mutable Global State · 2.6 Nested/Local/Inner Classes and Functions
· 2.7 Comprehensions & Generator Expressions · 2.8 Default Iterators and Operators
· 2.9 Generators · 2.10 Lambda Functions · 2.11 Conditional Expressions · 2.12
Default Argument Values · 2.13 Properties · 2.14 True/False Evaluations · 2.16
Lexical Scoping · 2.17 Function and Method Decorators · 2.18 Threading · 2.19 Power
Features · 2.20 Modern Python: `from __future__` imports · 2.21 Type Annotated Code.

**Python Style Rules (§3)**: 3.1 Semicolons · 3.2 Line length · 3.3 Parentheses ·
3.4 Indentation (3.4.1 Trailing commas) · 3.5 Blank Lines · 3.6 Whitespace · 3.7
Shebang Line · 3.8 Comments and Docstrings (3.8.1 Docstrings, 3.8.2 Modules incl.
3.8.2.1 Test modules, 3.8.3 Functions and Methods incl. 3.8.3.1 Overridden Methods,
3.8.4 Classes, 3.8.5 Block/Inline Comments, 3.8.6 Punctuation/Spelling/Grammar) ·
3.10 Strings (3.10.1 Logging, 3.10.2 Error Messages) · 3.11 Files/Sockets/Stateful
Resources · 3.12 TODO Comments · 3.13 Imports formatting · 3.14 Statements · 3.15
Accessors · 3.16 Naming (3.16.1 Names to Avoid, 3.16.2 Conventions, 3.16.3 File
Naming, 3.16.4 Guido's Recommendations) · 3.17 Main · 3.18 Function length · 3.19
Type Annotations (13 sub-sections: General Rules, Line Breaking, Forward
Declarations, Default Values, NoneType, Type Aliases, Ignoring Types, Typing
Variables, Tuples vs Lists, Type Variables, String Types, Imports For Typing,
Conditional Imports, Circular Dependencies, Generics, Build Dependencies).

**Contradicts ruff/PEP 8 defaults**:
1. **Line length 80, not 88** — ruff's default is 88 (this catalogue's actual
   `line-length` setting wasn't given, so check it against 80 explicitly rather
   than assuming ruff's default).
2. **`staticmethod` discouraged** — "Never use `staticmethod` unless forced to...
   in order to integrate with an existing library" — no ruff rule enforces or even
   flags this; it's judgment-only.
3. **Type annotations not mandatory everywhere** — Google explicitly does not
   require annotating every function, which is in tension with `ANN` (already
   selected in the secondary config) if `ANN` is applied unconditionally.
4. **§2.19 Power Features** ("metaclasses, bytecode access, dynamic inheritance,
   `__slots__` overrides") — discouraged wholesale by the guide; ruff has no
   family that flags "uses a power feature," only specific instances (`SLOT`,
   parts of `B`).
5. **§3.10.2 Error Messages** explicitly requires messages that "precisely
   identify the relevant error condition" and follow project conventions — this
   is exactly what `EM` + `TRY003`/`TRY004` are mechanically checking; the style
   guide states it as prose, ruff can enforce the letter of it.

---

## 8. pytest's own conventions

**`flake8-pytest-style` (ruff's `PT` family)**: 31 rules total, `PT001`–`PT031`
(minus a few retired numbers) — see §2 for the highest-yield subset. Covers fixture
decoration style, `parametrize` correctness, `raises`/`warns` scoping and specificity,
and unittest-style-assertion migration. This is the family flagged **not selected**
anywhere in either given config (§1) despite pytest being the acceptance-harness
backbone across ~8 repos.

**pytest's documented good practices** (`docs.pytest.org/en/stable/explanation/goodpractices.html`):
prefer `src/mypkg/` layout over flat layout; use `--import-mode=importlib` for new
projects (avoids `sys.path` mutation); set `pythonpath = ["src"]` if not using an
editable install; install with `pip install -e .` via a real `pyproject.toml`
(not bare `setup.py test`); follow `test_*.py`/`*_test.py` + `Test*` + `test_*`
discovery conventions, and avoid non-unique test module basenames unless using
importlib mode or adding `__init__.py`; run against the *installed* package via
`tox`, not the working tree, to catch packaging bugs; enable `strict = true` (or the
individual strict options) only against a pinned pytest version. None of these are
ruff-enforceable — they're structural/CI decisions, not lint rules (see
"Whole sections nobody's rules touch" below).

**pytest test anatomy** (`docs.pytest.org/en/stable/explanation/anatomy.html`):
the documented shape is Arrange → Act → Assert → Cleanup, with the guidance that
the actual test is the Act→Assert transition and Arrange/Cleanup exist only to
support it — relevant as a code-review heuristic for the acceptance harness's
subprocess/pexpect/docker setup-and-teardown-heavy tests, not something any rule
checks mechanically.

---

## Candidate topics

| # | Topic (as a question) | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|---|
| 1 | Should `PT` (flake8-pytest-style) be selected given it's absent from *both* configs while pytest is the harness backbone across ~8 repos? | Highest-yield unselected family for shape 1 | §1, §2, §8 | no | highest |
| 2 | Should `TRY` (tryceratops) be selected to standardize exception-handling idioms across CLI wrappers and the SDK's exception surface? | Textbook CLI-wrapper bugs (vanilla exceptions, lost tracebacks) | §1, §2 | no | highest |
| 3 | Should `ASYNC` be selected on `ocx-sdk-python` to catch blocking calls inside `async def`? | The one family that catches "awaited nothing, blocked the loop" on the only asyncio codebase | §1, §2 | no | high |
| 4 | Should `BLE` (blind-except) be selected to stop subprocess/pexpect/docker failures being swallowed silently? | Shape 1's exact failure mode | §1, §2 | no | high |
| 5 | Should `TC` (flake8-type-checking) be selected, and should `lint.flake8-type-checking` be set to `strict`, on the typed SDK? | Keeps typing-only imports out of the runtime import graph on a pyright-strict package | §1, §3 | no | high |
| 6 | Should `ARG` (unused-arguments) be selected to catch Protocol/fixture/callback interface drift? | Both shape 1 and shape 2 lean on signature-matching contracts | §1, §2 | no | high |
| 7 | Should `SLF` (flake8-self) be selected to keep the acceptance harness black-box? | Catches a test reaching into a CLI wrapper's private attributes | §1, §2 | no | high |
| 8 | Should `DTZ` (flake8-datetimez) be selected for the SDK's network-facing timestamps? | Naive-vs-aware datetime bugs are silent until a DST/UTC edge | §1, §2 | no | high |
| 9 | Should `PGH003`/`PGH004` (blanket type:ignore / blanket noqa) be selected specifically because an unattended agent could suppress instead of fix? | Matters *more* in a no-human-in-loop workflow than in a human-reviewed one | §2 | no | high |
| 10 | Should `DOC` (pydoclint) be added alongside the already-selected `D` (pydocstyle), since `D` checks presence/format but not signature match? | Closes an exact gap on a coverage=100 typed SDK: stale `Raises:`/`Returns:` | §1, §2 | no | high |
| 11 | Should `N` (pep8-naming) be selected given it's zero-cost and currently absent from both configs? | Catches e.g. a misnamed `self`/`cls` at negligible cost | §1, §2 | no | medium |
| 12 | Should `T10` (flake8-debugger) block merges on a stray `pdb`/`breakpoint()` call? | Cheap universal safety net for agent-authored commits | §1, §2 | no | medium |
| 13 | Should `T20` (flake8-print) be selected with a `per-file-ignores` carve-out for the stdlib-only CLI tools where `print()` is the actual output channel? | Needs the per-file-ignores mechanism, not a blanket rule | §1, §2, §3 | no | medium |
| 14 | Should `FBT` (boolean-trap) be selected on the SDK's public API surface? | Boolean positional args are a permanent footgun once a library ships | §1, §2 | no | medium |
| 15 | Should `C4` (flake8-comprehensions) be selected given it's a pure win with no tradeoff found? | Applies across all four shapes at zero cost | §1, §2 | no | medium |
| 16 | Should `TID` (flake8-tidy-imports) be configured with `banned-api` to forbid deep-private cross-package imports on the shipped SDK? | Package-boundary hygiene for a shipped library | §1, §3 | no | medium |
| 17 | Should `INP` (flake8-no-pep420) be selected on `index/bot`'s 93-file tree? | Implicit namespace packages silently break collection/packaging at that scale | §1, §2 | no | medium |
| 18 | Should `G`/`LOG` (logging format/logging) be selected on `index/bot`, the one shape that's actually logging-heavy automation? | `G004` (f-string in logging) is a real perf cost there | §1, §2 | no | medium |
| 19 | Should `SLOT` be selected for any frozen dataclass/`NamedTuple` subclasses in the typed SDK? | Narrow but real applicability on shape 2 | §1 | no | low-medium |
| 20 | Should `PERF` be selected given the 95k-LOC acceptance harness is large? | Modest incremental yield over already-selected `PL`/`RUF` | §1 | no | low-medium |
| 21 | Should `EM` be selected on the SDK's public exception classes? | Keeps messages off call sites; low yield elsewhere | §1 | no | low |
| 22 | Should `COM812`/`COM819`/`Q000`–`Q004`/etc. be documented as an explicit "formatter owns this" decision rather than left silently absent? | Prevents future confusion about whether they were considered | §3 | no (explicit non-gap) | medium |
| 23 | Should CI ever run with `--unsafe-fixes` in an unattended `--fix` pass? | `RUF015` and friends can change exception types/runtime behavior | §3 | no | high (safety) |
| 24 | Should ruff `preview = true` ever be enabled given preview rules can change/disappear without ruff's normal deprecation warning? | Direct stability-contract risk for CI | §3 | no | medium |
| 25 | What `per-file-ignores` convention should `tests/**` carry so `PT`/`ARG`/`S` can be selected without drowning tests in false positives (`S101` assert, `ARG001` fixtures)? | Prerequisite for adopting items 1, 6, and the already-selected `S` on test files | §3, §8 | no | high (enabling) |
| 26 | Does pyright strict leave any of its 10 always-`none` rules that the typed SDK actually wants turned on (`reportUnreachable`, `reportImplicitOverride`, `reportUnnecessaryTypeIgnoreComment`)? | Strict mode is not the ceiling — it's a floor with a documented gap list | §5 | no | high |
| 27 | Should `reportMissingSuperCall` or `reportUninitializedInstanceVariable` be turned on explicitly for the SDK's class hierarchies? | Both stay `none` even at strict; real correctness value for a typed library | §5 | no | medium |
| 28 | What does pylint's type inference catch (call-site arg-count/type validation) that neither ruff `PL` nor pyright strict replicates? | Documented structural gap (astral-sh/ruff#970); may justify running pylint narrowly | §4 | no | medium |
| 29 | Which of the 3 bandit checks ruff's `S`/`PL` families still don't port (`B325`, `B614`, `B615` — corrected 2026-08-23, was wrongly `B324`/`B613`/`B614`/`B615`/`B703`) are actually reachable in these codebases? | `B614`/`B615` (unsafe model loading) plausible if any repo touches ML; `B325` (`tempnam`/`tmpnam`) has zero fleet hits, checked live | §6 | no | medium |
| 30 | Should bandit itself run as a secondary scanner for the 3 remaining unported checks, or is the gap acceptable? | Explicit decision needed, not a silent gap | §6 | no | medium |
| 31 | Do any B3xx/B4xx-class risks (pickle, `eval`, insecure XML, `shell=True`) matter specifically for the acceptance harness's subprocess/pexpect/docker invocation of Rust CLIs? | Already-selected `S` covers these numerically, but worth an explicit audit of the harness's actual subprocess call sites | §6 | partial (S selected, not audited) | medium |
| 32 | Should Google's stance against `staticmethod` (§2.13/§2.19) become a project convention even though no ruff rule enforces it? | No mechanical check exists; would be a documented-only convention | §7 | no (no rule exists) | low |
| 33 | Does the google pydocstyle convention (already selected) fully match Google's own §3.8.1 docstring guidance, or are there gaps `DOC` would catch instead? | Cross-check between the two Google-derived surfaces | §7, §1 | partial | low-medium |
| 34 | Should `--import-mode=importlib` + `src/` layout be made a required CI/structure check for new pytest suites, given pytest's own good-practices doc recommends it? | Not lint-enforceable; needs a structural/CI rule instead | §8 | no | medium |
| 35 | Should `EXE` (flake8-executable) be selected specifically for the stdlib-only single-file tools that ship as executables? | Exactly shape 4's failure mode (shebang/chmod mismatches) | §1 | no | medium |
| 36 | Should `FIX`/`TD` (todo/fixme presence and metadata) be adopted, or is it explicitly the wrong tool without a ticket system behind it? | Risk of being a false-positive "gap" if adopted reflexively | §1 | no (explicit non-gap candidate) | low |
| 37 | Should `ICN`/`NPY`/`PD`/`DJ`/`FAST`/`AIR` be documented as "explicitly not applicable" rather than silently absent? | Prevents re-litigating domain-specific families that plainly don't apply | §1 | no (explicit non-gap) | low |
| 38 | Should `lint.pylint` complexity thresholds (max-args/branches/nesting/statements) be tuned tighter than ruff's defaults, now that `PL` is already selected? | Settings-level tuning question distinct from rule *selection* | §3 | partial (PL selected, thresholds unaudited) | medium |

## Whole sections nobody's rules touch

- **Bandit B325/B614/B615** — corrected 2026-08-23 (was wrongly listed as
  B324/B613/B614/B615/B703, 5 checks): `B324`→`S324` and `B703`→`S308` are already
  ported under non-obvious `S` codes, and `B613`→`PLE2502` is ported under Pylint's
  family, not flake8-bandit's — see §6 for the full correction. The real gap is 3
  checks ([astral-sh/ruff#20129](https://github.com/astral-sh/ruff/issues/20129),
  closed 2025-08-28): `B325` (`tempnam`/`tmpnam`, zero fleet hits, checked live),
  `B614`, `B615` (pytorch/Hugging Face unsafe loading, deliberately excluded by ruff's
  maintainers as third-party-library-specific). The right answer is still an explicit
  decision — accept the gap as low-probability, or run bandit itself as a narrow
  secondary scanner for these 3 — not silence.
- **pyright's 10 always-`none` rules** (`reportCallInDefaultInitializer`,
  `reportImplicitOverride`, `reportImplicitStringConcatenation`, `reportImportCycles`,
  `reportMissingSuperCall`, `reportPropertyTypeMismatch`,
  `reportUninitializedInstanceVariable`, `reportUnnecessaryTypeIgnoreComment`,
  `reportUnreachable`, `reportUnusedCallResult`) — strict mode is not the ceiling.
  For a shipped, coverage=100 typed SDK, at least `reportUnreachable`,
  `reportUnnecessaryTypeIgnoreComment`, and `reportMissingSuperCall` look like they
  should be explicit `error` overrides rather than left at pyright's own default.
- **pylint's type-inference / call-site checks** (`E1120`–`E1125`-class:
  no-value-for-parameter, too-many-function-args, unexpected-keyword-arg) — ruff's
  `PL*` rules don't reach these because ruff doesn't do the type inference pylint
  does (ruff's own FAQ says so). Zero coverage from the ruff+pyright stack. Decision:
  accept the gap (pyright strict's `reportCallIssue` covers a good chunk of the same
  ground for typed call sites) or add narrow pylint for untyped/dynamic call sites.
- **Data-science/web-framework families** (`ICN`, `NPY`, `PD`, `DJ`, `FAST`, `AIR`) —
  correctly zero coverage; the right answer here genuinely is "no rule," not a gap,
  since none of numpy/pandas/Django/FastAPI/Airflow are dependencies in any of the
  four shapes. Worth one line in the actual ruff config comment saying so, so a
  future reader doesn't wonder why they're absent.
- **Google style guide's non-mechanical sections** (§2.6 nested classes, §2.9
  generators, §2.10 lambdas, §2.13 properties, §2.18 threading, §2.19 power
  features) — these are design-review judgment calls with no corresponding ruff
  family at all. Explicit decision: they stay code-review guidance, not lint rules,
  because nothing in the ruff/pyright/bandit/pylint stack can mechanically check
  "did this really need to be a metaclass."
- **pytest structural conventions** (`src/` layout, `--import-mode=importlib`,
  installed-package testing via `tox`) — no lint rule enforces project layout; this
  is a CI/structure decision, not a rule gap. Explicit decision: enforce via
  `pyproject.toml`/CI scaffolding, not via ruff.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `ruff rule --all --output-format json` (ruff 0.16.4 via `uvx ruff`) | Ruff's own machine-readable rule catalogue — 969 rules, 59 families, summaries, fix-safety, preview status | current (Aug 2026 toolchain) | Ground truth for §1/§2; more complete and reliable than the rendered docs page, which truncates on fetch for long alphabetical sections (TRY, N, PERF, C90, PGH) |
| https://docs.astral.sh/ruff/rules/ | Ruff rule index (rendered docs) | current | Cross-check for the family list and per-family one-line summaries; confirms "over 900 lint rules" and the 59-family structure |
| https://docs.astral.sh/ruff/preview/ | Preview-mode docs | current | Stability contract for preview rules — needed for §3 and candidate #24 |
| https://docs.astral.sh/ruff/linter/ | Linter reference | current | Fix safety tiers, rule-resolution order, exit codes — §3 |
| https://docs.astral.sh/ruff/settings/ | Full settings reference | current | Per-plugin settings sections, `per-file-ignores` semantics — §3 |
| https://docs.astral.sh/ruff/formatter/ | Formatter docs | current | The exact rule codes ruff says conflict with its own formatter — §3, candidate #22 |
| https://docs.astral.sh/ruff/faq/ | Ruff FAQ | current | Direct statement of the pylint-parity gap and the type-inference reason for it, plus the tracking issue link — §4 |
| https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md | Pyright configuration reference (markdown source, since the rendered SPA doesn't serve static content to a fetcher) | current | Full 82-rule diagnostic table with off/basic/standard/strict defaults — §5, the single most load-bearing fetch for that section |
| https://bandit.readthedocs.io/en/latest/plugins/index.html | Bandit plugin index | current | B1xx, B2xx, B5xx, B6xx, B7xx check listing — §6 |
| https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html | Bandit blacklisted-calls reference | current | B3xx range, not present on the main plugins page — §6 |
| https://bandit.readthedocs.io/en/latest/blacklists/blacklist_imports.html | Bandit blacklisted-imports reference | current | B4xx range, not present on the main plugins page — §6 |
| [astral-sh/ruff#20129](https://github.com/astral-sh/ruff/issues/20129) | GitHub issue: "Achieve parity with Bandit's test plugins" | open, current | Names the exact 5 bandit checks ruff's `S` family has never ported (B324/B613/B614/B615/B703) — the only place this gap is documented explicitly |
| [astral-sh/ruff#970](https://github.com/astral-sh/ruff/issues/970) | GitHub issue: pylint parity tracking | open, current | The canonical tracker for what pylint has that ruff still doesn't — §4 |
| https://pylint.readthedocs.io/en/latest/user_guide/messages/messages_overview.html | pylint message categories overview | current | C/R/W/E/F/I category definitions and ID-range structure — §4 |
| https://pylint.readthedocs.io/en/latest/user_guide/checkers/features.html | pylint checkers/features reference | current | Concrete example message IDs per checker area (typecheck, design, basic, etc.) — §4 |
| https://google.github.io/styleguide/pyguide.html | Google Python Style Guide | current | Full §2/§3 table of contents and the specific points that contradict ruff/PEP 8 defaults — §7 |
| https://docs.pytest.org/en/stable/explanation/goodpractices.html | pytest good integration practices | current | Layout, import-mode, and packaging conventions pytest itself recommends — §8 |
| https://docs.pytest.org/en/stable/explanation/anatomy.html | pytest anatomy of a test | current | Arrange/Act/Assert/Cleanup framing used as a non-mechanical review heuristic — §8 |
