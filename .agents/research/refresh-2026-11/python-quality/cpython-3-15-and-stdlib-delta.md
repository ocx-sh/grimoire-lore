---
title: CPython 3.15 and stdlib delta for python-quality
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 17
---

# CPython 3.15 and stdlib delta (2026-08-23 to 2026-11-27)

This is a delta update of the earlier python-quality research. Anything not listed as changed stays as it is.

## Summary

- Python 3.15.0 was released on 9 October 2026 (source: What's new in 3.15 page, which is the 3.15.2 documentation). The devguide lists 3.15 first release as 2026-10-09 and 3.14 as bugfix.
- Python 3.10 reached end of life on 2026-10-01 per the devguide version table. The devguide lists 3.13 as security-only status.
- PEP 686 is Final and landed in 3.15: UTF-8 mode is on by default. PY-PROC-01 and PY-SOLO-03 rationale must be scoped by version; the rules themselves stay.
- PEP 787 is still Deferred, with no change.
- PEP 749 schedule is unchanged and 3.15 did not touch `from __future__ import annotations`. The stated reading in typing.md remains correct, but its trigger ("after 3.13 reaches end of life") is a condition that is now not far off; see the section on typing below.
- `get_event_loop()` raising in 3.14 and `wait_for()` on top of `timeout()` since 3.12 are both confirmed unchanged.
- gh-88050 is CLOSED (closed 2022-10-05), not open. This is a pre-window error in the existing text, found now. CPython #108611 is still open.
- tarfile default filter is `data` from 3.14, confirmed. zipfile still has no `filter=` in 3.15.
- 3.15 adds several features that deserve new rules or notes: PEP 810 lazy imports, PEP 728 closed TypedDict, PEP 747 TypeForm, PEP 800 `disjoint_base`.

## Findings

### 1. Release and end-of-life dates

- 3.15.0 released on 9 October 2026: ["Python 3.15 was released on 9 October 2026."](https://docs.python.org/3.15/whatsnew/3.15.html) Confirmed, on schedule.
- Devguide table: 3.15 bugfix, first release 2026-10-09, end of life 2031-10 (scheduled); 3.14 bugfix, 2025-10-07, 2030-10 (scheduled); 3.13 security, 2029-10 (scheduled); 3.10 end-of-life, first release 2021-10-04, end of life 2026-10-01. Source: [devguide versions](https://devguide.python.org/versions/). Confirmed.
- The frame's statement "3.14 is the current release" is outdated: the current feature release is 3.15, with 3.15.2 documentation live.

### 2. Per-claim verdicts

**PY-PROC-01 (processes.md) and PY-SOLO-03 (single-file-tools.md): CHANGED (rationale only).**
- Old text: both default to `locale.getpreferredencoding(False)`, "not UTF-8", so one non-ASCII byte raises `UnicodeDecodeError` on a `LANG=C` image.
- New fact: [3.15 What's new](https://docs.python.org/3.15/whatsnew/3.15.html): "Python now uses UTF-8 as the default encoding, independent of the system's environment." [PEP 686](https://peps.python.org/pep-0686/) is Final, targets 3.15, and says UTF-8 mode is enabled by default; opt out with `PYTHONUTF8=0` or `-X utf8=0`. `locale.getencoding()` (3.11) still returns the locale encoding and ignores UTF-8 mode. Upstream change date: 2026-10-09 (3.15.0 release); PEP final resolution predates the window.
- Decision: the rules stay MUST. Every floor in this pair is below 3.15 (the examples use 3.10 to 3.13), and on those versions the locale default still applies. Even on 3.15 the explicit `encoding=` is still right, because it documents intent and survives `PYTHONUTF8=0`, and `PLW1514` stays valid. Rationale must be scoped: "below 3.15 the default is the locale encoding; from 3.15 it is UTF-8 unless `PYTHONUTF8=0` is set, so the LANG=C failure no longer reproduces on 3.15 but still does on every lower floor." The ruff `PLW1514` verification is unchanged. I did not verify whether `subprocess` text mode on 3.15 follows the same default beyond what PEP 686 states ("files, stdio, and pipes").

**PY-PROC-04 PEP 787 "Deferred to 3.15 at the earliest": UNCHANGED.**
- [PEP 787](https://peps.python.org/pep-0787/): Status Deferred, Python-Version 3.15, last modified 2025-04-27. 3.15 shipped without it (no mention in the 3.15 What's new). Suggest wording: "Deferred; 3.15 shipped without it". Version-neutral and still true.

**typing.md PEP 749 and `from __future__ import annotations`: UNCHANGED.**
- [PEP 749](https://peps.python.org/pep-0749/): Final (resolved 2025-05-05). The future import is deprecated only "sometime after" 3.13 reaches end of life, "no sooner than the first release after Python 3.13 reaches its end-of-life", then removed after at least two more releases. 3.13 end of life is scheduled for 2029-10 (devguide), so nothing fires before 3.15 and 3.15 What's new makes no mention of the future import (its only `__future__` reference is the lazy-import restriction). "Only way to get deferred annotations below 3.14" is still correct. Note: 3.13 end of life is still in the future, so the sentence "until after 3.13 reaches end of life" is accurate as written.

**PY-ASYNC-07 `get_event_loop()` raises as of 3.14: UNCHANGED.**
- [asyncio-eventloop 3.15](https://docs.python.org/3.15/library/asyncio-eventloop.html): "Changed in version 3.14: Raises a RuntimeError if there is no current event loop." No 3.15 entry. The policy system is deprecated, removal in 3.16, after which the function returns the running loop or the loop set by `set_event_loop()`. Candidate addition: `asyncio.get_event_loop_policy()` and `set_event_loop_policy()` are deprecated; use `asyncio.run(..., loop_factory=...)` or `asyncio.Runner`.

**PY-ASYNC-06 `wait_for()` on top of `timeout()` since 3.12: UNCHANGED.**
- [asyncio-task 3.15](https://docs.python.org/3.15/library/asyncio-task.html): "Changed in version 3.12: Implemented using asyncio.timeout()". No 3.14 or 3.15 change to `wait_for`. 3.15 added `TaskGroup.cancel()` and a `GeneratorExit` special case (not affecting this rule).

**PY-ASYNC-05 / PY-PROC-06 gh-88050 "is open": CHANGED (tracker status, pre-window).**
- Old text: gh-88050 (cancelling a task does not kill its subprocess) is open.
- New fact: [cpython#88050](https://github.com/python/cpython/issues/88050), titled "Cannot cleanly kill a subprocess using high-level asyncio APIs", is state closed, reason completed, closed 2022-10-05 (GitHub API). It was closed by a fix for a race when closing subprocess pipes ([PR 97978](https://github.com/python/cpython/pull/97978), 3.11 backport; present in 3.11.1 per a maintainer comment). The issue never got a milestone. A 2023-04 maintainer comment says a task wrapped in `wait_for` is cancelled before `communicate()` can call `wait()`. So the issue was not closed because cancelling a task now kills the child. The closing date is outside this window, so this error was already present in the baseline.
- Whether cancelling the awaiting task still leaves the child running on 3.15: could not determine from the primary sources fetched (docs show no change; changelog excerpt shows only gh-162217, a stdin `wait_closed()` cancel fix, in the Python next section). The behaviour claim should be kept (the practice of killing in the `CancelledError` handler is harmless and robust), but the citation "(gh-88050)" and the phrase "CPython leaves the child running" in the async.md code comment should not present the issue as open. Suggested wording: "asyncio never kills the child when the awaiting task is cancelled; see the documentation of `asyncio.subprocess.Process` and cpython#88050 (closed for an unrelated pipe race, 2022)". Needs a verification run (spawn, cancel, check `returncode` on 3.12 to 3.15) before the exact claim is rewritten.

**data-modelling.md dataclass MRO bug (CPython #108611) "real, open": UNCHANGED.**
- [cpython#108611](https://github.com/python/cpython/issues/108611): state open, no milestone, last updated 2025-01-28 (GitHub API). 3.15 What's new mentions only dataclass annotations for generated `__init__` (gh-137530), unrelated.

**PY-SEC-01 tarfile default `fully_trusted` below 3.14: UNCHANGED, with additions.**
- [tarfile 3.15](https://docs.python.org/3.15/library/tarfile.html): "Changed in version 3.14: Set the default extraction filter to data ... Previously ... fully_trusted." No change in 3.15. 3.15 adds: `tar_filter` normalizes `..` filenames; `data_filter` normalizes link targets; 3.15.2 (documented as unreleased at fetch time) refuses non-absolute drive names on Windows in `tar_filter` and `data_filter`. The [3.14 changelog](https://docs.python.org/3.14/whatsnew/changelog.html) "Python next" security section lists gh-161323 (Windows drive-relative names and link targets, CVE 2026-107784), gh-160506 (`os.path.realpath` on Windows allowed escape with `data` or `tar` filter) and CVE 2026-115791 / gh-161705 (removes `sys.path[0]` in gzip, tarfile and zipfile CLI). Those releases were not yet dated at fetch time, so this is a pending-release note.
- Consequence for the rule: since `filter='data'` explicit use is already the rule, the fixes reach it as soon as the user upgrades; add "upgrade to a patch release containing gh-161323 on Windows" as an optional note, not a rule change.

**PY-SEC-01 zipfile has no `filter=`: UNCHANGED.**
- [zipfile 3.15](https://docs.python.org/3.15/library/zipfile.html): `extract(member, path=None, pwd=None)` and `extractall(path=None, members=None, pwd=None)` have no `filter`; no 3.14 or 3.15 extraction notes; symlink entries are not discussed. No new zipfile extraction filter was added.

**single-file-tools.md `requires-python = ">=3.10"` example: SHOULD CHANGE (judgement).**
- 3.10 is end of life since 2026-10-01. The example header is illustrative only; recommend `>=3.12` or `>=3.13` in the example so a reader copying it does not pin an unsupported floor, while the floor policy itself stays with python-packaging. If the prose near line 36 states that 3.10 is the reference floor (for example because PEP 723 or `tomllib` is used), re-check that claim before changing it.

### 3. 3.15 features needing new rules or notes

1. **PEP 810 lazy imports** ([PEP 810](https://peps.python.org/pep-0810/), Final, resolved 2025-11-03; 3.15). `lazy import x` / `lazy from x import y`, module scope only, a `SyntaxError` inside `try`/`except`, and for `from __future__`. It removes the need for `if TYPE_CHECKING:` runtime-cost guards for annotation-only imports on 3.15+. Interaction with PY-SOLO-06 (module-level work is only imports, constants, regexes): a lazy import still counts as an import but the module's top-level code runs at first use, so a rule is needed saying it does not exempt side-effecting modules and must not be used where the floor is below 3.15 (syntax error). Candidate: PY-SOLO-06 gets a clause "on a 3.15+ floor, a stdlib import used only on one code path is written `lazy import`; below 3.15 it is a function-local import". Verification: `grep -nE '^lazy (import|from)'` must be absent when `requires-python` is below 3.15; a ruff or `python -m py_compile` run on the floor interpreter fails on the keyword. Keep the `TYPE_CHECKING` guidance for floors below 3.15.
2. **PEP 728 closed TypedDict / `extra_items`** ([3.15 What's new](https://docs.python.org/3.15/whatsnew/3.15.html)): `TypedDict` accepts `closed` and `extra_items` class arguments. Relevant to PY-TYP-05 (JSON boundary TypedDict): on a 3.15 floor a closed TypedDict documents "no unknown keys"; below 3.15 it needs `typing_extensions`. Verification: `grep -nE 'closed=|extra_items='` plus the floor check.
3. **PEP 747 `TypeForm`** (3.15): niche; a note in typing.md that `TypeForm[T]` replaces `type[T]` for values that are type expressions. No rule.
4. **PEP 800 `@typing.disjoint_base`** (3.15): niche; no rule.
5. **asyncio policy deprecation** (removed in 3.16): extend PY-ASYNC-07 with `get_event_loop_policy` and `set_event_loop_policy` in the grep. Verification: add them to the existing grep pattern in async.md.
6. **PEP 686** (see verdict above): a short version-scoping note, no new rule.
7. **Removals to watch**: `typing.ByteString` and `collections.abc.ByteString` removed from `__all__` (removal in 3.17); `typing.no_type_check_decorator` removed.

## Normative guidance candidates

1. Scope the PY-PROC-01 and PY-SOLO-03 rationale by version: "locale encoding below 3.15, UTF-8 on 3.15 unless `PYTHONUTF8=0`". Rationale: the current text is false on 3.15. Verification: read the rule text for the 3.15 qualifier; `ruff check --isolated --preview --select PLW1514` unchanged.
2. Correct the gh-88050 status in async.md and processes.md (closed in 2022 for a pipe race; behaviour claim needs re-verification). Rationale: citing a closed issue as open misleads the reviewer. Verification: `grep -n 'gh-88050' skills/python-quality-reference/*.md`, then confirm no line says "open" and run a cancel test on 3.12 to 3.15.
3. Change the `requires-python = ">=3.10"` example to a supported floor. Rationale: 3.10 end of life 2026-10-01. Verification: `grep -n 'requires-python = ">=3.10"' skills/python-quality-reference/single-file-tools.md` returns nothing.
4. Add PY-SOLO-06 clause for `lazy import` (floor 3.15 only). Verification above.
5. Add a PY-TYP-05 note for closed TypedDict on 3.15+. Verification above.
6. Extend the PY-ASYNC-07 grep with the deprecated policy functions. Verification: the grep itself.
7. Optional: PY-SEC-01 note that Windows tarfile filter fixes (gh-161323, gh-160506) arrive in 3.14.x and 3.15.2 patch releases. Verification: read heuristic.

## AI-agent angle

- A model trained before 2026-10 will say the default text encoding is the locale and that 3.14 is current. Mechanical check: the rule text must contain "3.15".
- A model will write `lazy import` on a 3.12 floor or fail to know the keyword at all. Check: `grep -nE '^lazy '` against `requires-python`.
- A model will cite gh-88050 as open. Check: the grep in candidate 2.
- A model will assume `zipfile.extractall(filter=...)` exists by analogy with tarfile. Check: `grep -n 'extractall(.*filter'` on zipfile objects, which raises `TypeError`.

## Contested / evolving

- Whether 3.15 `lazy import` should replace function-local imports for CLI start-up time is new (accepted 2025-11-03); practice is not yet settled. PEP 810 itself notes that auto-lazy `TYPE_CHECKING` is a deferred idea.
- The effective end of the `from __future__ import annotations` era is not before 2029-10 plus one release.
- tarfile and zipfile Windows security fixes are still landing in patch releases (changelog "Python next" at fetch time).

## Could not determine

- The exact release dates of the 3.14.x security releases carrying gh-161323 (the changelog showed them under an undated "Python next" header, and the page was truncated).
- Whether asyncio subprocess cancellation behaviour changed in 3.15 (no primary source describes it either way).
- The detailed 3.15 What's new entries for zipfile and annotations beyond the quoted excerpts: the page text was read through character 200000 of about 216000 and zipfile was absent from the parts read.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.python.org/3.15/whatsnew/3.15.html | 3.15 What's new (3.15.2 docs) | 2026-10 | release date, PEP 686, 810, 728, 747, 800 |
| https://devguide.python.org/versions/ | Version status table | 2026-11 | 3.10 EOL, 3.15 release date |
| https://peps.python.org/pep-0686/ | UTF-8 mode default | Final, 3.15 | encoding verdict |
| https://peps.python.org/pep-0787/ | Safer subprocess with t-strings | Deferred, 2025-04 | PY-PROC-04 |
| https://peps.python.org/pep-0749/ | Deferred annotation evaluation | Final 2025-05-05 | future-import schedule |
| https://peps.python.org/pep-0810/ | Explicit lazy imports | Final 2025-11-03 | new rule candidate |
| https://docs.python.org/3.15/library/zipfile.html | zipfile docs | 3.15 | no filter parameter |
| https://docs.python.org/3.15/library/tarfile.html | tarfile docs | 3.15 | filter default and 3.15 notes |
| https://docs.python.org/3.15/library/asyncio-eventloop.html | event loop docs | 3.15 | get_event_loop 3.14 change |
| https://docs.python.org/3.15/library/asyncio-task.html | asyncio task docs | 3.15 | wait_for 3.12 note |
| https://docs.python.org/3.14/whatsnew/changelog.html | 3.14 changelog | 2026-11 (truncated) | pending security entries |
| https://github.com/python/cpython/issues/88050 | issue, via GitHub API | closed 2022-10-05 | status correction |
| https://github.com/python/cpython/pull/97978 | 3.11 backport PR, via GitHub API | merged 2022-10-06 | what the fix was |
| https://github.com/python/cpython/issues/108611 | dataclass MRO issue, via GitHub API | open, updated 2025-01-28 | status |
| https://github.com/python/cpython/issues/119710 | related asyncio issue, via GitHub API | closed 2026-07-19 | cross-reference only |
