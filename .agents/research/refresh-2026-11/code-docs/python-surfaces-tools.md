---
title: code-docs delta - Python surfaces and tools, 2026-09-27 to 2026-11-27
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 17
---

# Delta verdicts

Scope: only changes inside the window 2026-09-27 to 2026-11-27 count. Anything not listed as "changed" stays as written. No normative candidate here adds a new rule; every "changed" item is a wording or version refresh.

Constraint note: the GitHub API was rate limited during the run, so releases were read from PyPI, npm, project changelog pages and raw changelog files instead. Pyright's GitHub releases page is a possibly stale snapshot, so the npm registry was used as the second source.

## guards.md - pyright version, GRD-09 row, `npx pyright`

- "pyright 1.1.414": unchanged. The npm registry (https://registry.npmjs.org/pyright) shows dist-tag latest 1.1.414, published 2026-09-09, with no later version. The GitHub releases page (https://github.com/microsoft/pyright/releases) also lists 1.1.414 as latest.
- "`assert_never` raises `AssertionError` at runtime" and "a bare `case _: raise` passes pyright": unchanged. No pyright release exists in the window, and no Python release note in the window touches `typing.assert_never`.
- Owner command `npx pyright`: unchanged, the npm package still resolves to 1.1.414.

## surfaces.md - hover claim

"pyright render the whole doc block on hover": unchanged (no pyright release in the window). Not re-read against the LSP spec; no evidence of change.

## surfaces.md SRF-03 argparse walk

Verdict: unchanged for the walk, with one new hazard to document.

- `format_help()` and colour. Python 3.14 added colour to argparse help (https://docs.python.org/3.14/whatsnew/3.14.html, 3.14 released before the window, so this is not a window change but was not covered by the baseline claim). `format_help()` builds the formatter with `color=True`, and `_set_color` colours only if `_colorize.can_colorize()` is true (CPython 3.14 `Lib/argparse.py`, `Lib/_colorize.py`). `can_colorize()` checks `sys.stdout`: `PYTHON_COLORS=1` or a non-empty `FORCE_COLOR` forces colour on even when piped; `NO_COLOR`, `PYTHON_COLORS=0`, `TERM=dumb`, or a non-TTY stdout turn it off. Consequence: a scanner test run under a piped stdout is plain. Under `FORCE_COLOR` or `PYTHON_COLORS=1` (some CI setups export `FORCE_COLOR=1`), `format_help()` returns ANSI escapes and the scanner sees them.
- Python 3.15 (https://docs.python.org/3.15/whatsnew/3.15.html) adds backtick markup in description, epilog and `help` text; with colour on, backticks are highlighted, with colour off "backticks are preserved as-is". Also `suggest_on_error` now defaults to `True`. Neither changes the scanner's input when colour is off.
- `_SubParsersAction`: unchanged in the parts the example uses. In 3.14 `choices` is a plain attribute set to `_name_parser_map`, populated by `add_parser()`; the class still exists. Python docs call `add_subparsers()` the public path; no public iterator for subparsers was added.
- Replacement wording (new sentence for SRF-03, after the walk): "Pass `color=False` to the parser, or run the test with `NO_COLOR=1` and `FORCE_COLOR` unset, so `format_help()` carries no ANSI escapes into the scanner (Python 3.14 and later). On Python 3.15, backticks in help text are kept as written when colour is off." Verification: `FORCE_COLOR=1 python3 -c "import argparse;print('\x1b[' in argparse.ArgumentParser(description='x').format_help())"` prints True on 3.14+, and False with `color=False`.
- checks/ code affected: checks/interface_leak.py reads text from stdin; ANSI escapes there could split a token the scanner looks for. Not edited. Could not determine whether interface_leak.py strips escapes; not read in full.

## surfaces.md - "argparse, click and commander print what they are given"; click/typer row

Verdict: changed for click (additive, the claim still holds), unchanged for typer.

- click 8.5.1, released 2026-11-06 (https://click.palletsprojects.com/en/stable/changes/): `Argument` and `Parameter` accept a `help` argument; the help screen lists every argument under a "Positional arguments" section, with an empty description when `help` is absent (also 8.5.0, 2026-08-24, before the window, added `Argument(help=)`). A command's short help no longer stops at `vs.` or `e.g.` inside the first sentence (a docstring's first sentence now renders longer in command lists). Deprecated commands translate only the `(DEPRECATED)` label.
- Replacement wording for the click/typer row: "help=, description=, epilog=, command docstrings; click 8.5 also `Argument(help=)`, which renders in a Positional arguments section."
- typer 0.28.0 (2026-11-06) and 0.29.0 (2026-11-09) (https://typer.tiangolo.com/release-notes/): 0.29.0 switched parameter validation to Pydantic and changed "some validation error messages, help text, and usage output". Docstring and `help=` rendering are not listed as changed. The first 100000 characters of the page were read; versions 0.29.1 to 0.29.3 fall in that range and list nothing on help.
- "commander prints what it is given": not in this commission, not checked.

## surfaces.md Python API row - griffe and mkdocstrings

Verdict: unchanged; no rename.

- griffe 2.4.1 is latest (2026-10-22); releases in the window 2.3.1, 2.3.2, 2.4.0, 2.4.1 (https://mkdocstrings.github.io/griffe/changelog/). None renames or removes `griffe.load`, `resolve_aliases` or `AliasResolutionError`. The 2.x API reference lists `load(objspec, /, *, ..., resolve_aliases=False, ...)` and `griffe.AliasResolutionError` (https://mkdocstrings.github.io/griffe/reference/api/loaders/, .../exceptions/). Only 2.0.0 removed deprecated APIs (`ExportedName`, the `options` parameters of the docstring parsers, Git helpers); none are used by checks/interface_leak.py as quoted in surfaces.md.
- 2.4.0 propagates `public` values to inherited members (aliases), which can change which inherited members an alias walk sees. Could not determine whether this alters the checked output; flag for the owner to run the interface-leak fixture once under griffe 2.4.1.
- 2.3.1 and 2.3.2 dropped Python 3.10 support for griffe.
- mkdocstrings 1.0.7 and 1.0.8 (https://mkdocstrings.github.io/changelog/): Python 3.10 dropped, code anchor and span IDs prefixed. No change to `filters` or `show_source`. The grep-of-built-HTML warning still stands; the prefixed anchor IDs do not alter it.

## length.md LEN-08 - pydantic

Verdict: unchanged. Pydantic 2.14.0 (2026-10-08) handles `TypeError` gracefully during docstring extraction; 2.14.2 (2026-10-29) stops extracting attribute docstrings from nested classes and functions (https://pydantic.dev/docs/validation/latest/get-started/changelog/). Both concern `use_attribute_docstrings`. Model docstrings becoming the schema `description` is not reported as changed. 2.14.4 changes JSON Schema output for subclasses of `@deprecated` classes, not descriptions. The first 100000 characters of the page were read; the release entries 2.14.x all fall in that range.

## linkage.md - Python-Markdown slugs

Verdict: unchanged for the sentence "lowercase, punctuation dropped, underscores kept". Python-Markdown 3.11 (2026-09-25, before the window) and 3.11.1 to 3.11.4 (2026-10-13, 10-19, 11-05, 11-25) (https://python-markdown.github.io/changelog/): 3.11.2 reverted the enforcement of CommonMark-style punctuation rules for backwards compatibility, so the baseline slug behaviour is the current one. 3.11.3 fixes quadratic id generation when headers share text and strips complete HTML tags from TOC labels and generated ids. 3.11.4 stops `TypeError` on an empty `id` or `data-toc-label`. Optional addition: "Duplicate headings get a numeric suffix (`-1`, `-2`)" is unchanged and not claimed today.

## routing.md - full_match and mutmut

- `PurePath.full_match` (https://docs.python.org/3.15/library/pathlib.html): added in 3.13, no `versionchanged` in 3.14 or 3.15. `PurePath('a/b.py').full_match('*.py')` is False, as the rule needs. Unchanged. The `fnmatch` half ("needs a `/` before `*.rs` in `**/*.rs`") is unchanged: the fnmatch page (https://docs.python.org/3.15/library/fnmatch.html) still says the separator "is not special to this module"; 3.14 added only `filterfalse`.
- mutmut: 3.8.1 released 2026-10-28 (https://github.com/boxed/mutmut/blob/main/HISTORY.rst, PyPI). Its changelog lists pytest 9.2 stats crash, `# pragma: no mutate` in multi-line statements, string-escape case mutants, enums with a custom `__init__`, huge float literals, and a mypy crash. Nothing mentions `src/` layout or the sandbox, so the failure claim is not shown fixed, but it was not re-tested. Verdict: version changed, claim could not be disproved.
- Replacement wording: "mutmut 3.8.1 (its latest, 2026-10-28) lists no fix for `src/`-layout packages failing inside its sandbox as of 2026-11-27; re-test on the target repo before relying on either." Also update the dated line routing.md:24 "mutmut 3.8.0" to 3.8.1 if it states the current version.

## Candidates

1. SRF-03 colour sentence (above). Rationale: a CI environment with `FORCE_COLOR` puts ANSI escapes into `format_help()`. Verification: the one-line python command given above.
2. click row addition. Rationale: `Argument(help=)` is a new user surface under click 8.5. Verification: `grep -rn "click.argument(.*help=" --include=*.py .` (read each for internal references).
