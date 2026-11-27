---
title: pytest ecosystem delta, 2026-08-23 to 2026-11-27
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 21
---

# pytest ecosystem delta for python-quality

This is a delta update. Claims not listed as changed stay as written. All facts below were read from a changelog, a source file at a tagged release, a package-index record, or a command run on 2026-11-27. Nothing is from memory.

## Summary

- One verification can report a false pass after the window: PY-SURF-02. Since griffe 2.3.1 (2026-10-06), `griffe check <pkg> -s src` without `--against` exits 0 with no stdout when the repository has no tags. Before, it crashed with exit 1. A shallow CI checkout without tags now looks green.
- PY-SURF-03 is not affected, because it passes `--against <tag>` explicitly.
- PY-TEST-13 has a spelling gap that predates the window but is not yet in the pair: pytest 9.0.0 (2025-11-05) added the ini options `strict_markers` and `strict`. The grep for `strict-markers` misses them, so it reports a false finding on a correctly configured project. A naive widening of the grep creates a false pass (see candidate 1).
- pytest 9.2.0 (2026-10-27) is the only pytest release in the window. It changes `-m` handling under strict markers and many other things, none of which rename an option the pair relies on.
- pytest-timeout, pytest-xdist and pytest-socket shipped no usable release in the window. pytest-timeout 2.5.0 (2026-08-16) was yanked on the package index; the latest installable version is 2.4.0.
- coverage.py shipped 7.16.0 to 7.17.5 in the window. `branch` and `exclude_also` are unchanged.
- Sybil 10.2.0 (2026-11-22) is unchanged for the pair's purpose.
- The griffe line `Public object was removed` is unchanged in 2.4.1, confirmed by running it.

## Findings per claim

### 1. PY-TEST-13: `--strict-markers` in `addopts`, verified by grep for `strict-markers`

Verdict: changed (spelling alternatives exist; one in-window behavior change).

- Old text: "`--strict-markers` is in `addopts`", grep `strict-markers`.
- New fact A (before the window, not yet in the pair): pytest 9.0.0 (2025-11-05) added the ini option `strict_markers` as an alias of the flag, and the ini option `strict = true` which enables `strict_config`, `strict_markers`, `strict_parametrization_ids` and `strict_xfail`. An individual option set explicitly overrides `strict`. Source: [pytest changelog](https://raw.githubusercontent.com/pytest-dev/pytest/main/doc/en/changelog.rst), entry for issue 13823 under 9.0.0, and [reference.rst at 9.2.0](https://raw.githubusercontent.com/pytest-dev/pytest/9.2.0/doc/en/reference/reference.rst), where `strict_markers` has `:default: false`.
- New fact B (in the window): pytest 9.2.0 (2026-10-27), issue 2781. When `strict_markers` is enabled, marker names inside `-m` expressions are validated against registered markers. An unknown name raises `UsageError`: `Unknown marker(s) in '-m' expression: <names>. Use 'pytest --markers' to see available markers.` Source: pytest changelog 9.2.0 and `src/_pytest/mark/__init__.py` at tag 9.2.0. The check reads `strict_markers`, and falls back to `strict` when `strict_markers` is unset.
- Unchanged: the collection-time message for a misspelled marker on a test. It reads ``'requires_dokcer' not found in `markers` configuration option`` and is identical in `src/_pytest/mark/structures.py` at 8.4.0, 9.0.0, 9.1.1 and 9.2.0. The pair's text quotes it without the backticks around `markers`. That is a pre-existing inexactness, not a window change. A reviewer who greps the message should match it with the backticks.
- Related pre-window defect: in pytest 9.0.x, `--strict-markers` and `--strict-config` given through `addopts` were silently ignored. It was fixed in 9.1.0 (2026-06-13), issue 14442. On 9.0.x the grep passes while enforcement is off. The same changelog entry says that when targeting pytest 9.0 or newer, `strict_markers` or `strict` is the preferred spelling.
- Direction of the verification error: the current grep is a false RED for a project using `strict_markers = true` or `strict = true`. It is not a false pass. The false pass appears only if someone widens the grep carelessly, because `strict_markers = false` also matches `strict[-_]markers`.

### 2. PY-TEST-06: pytest-timeout `signal` and `thread`

Verdict: unchanged.

- No usable release in the window. 2.5.0 was uploaded 2026-08-16 and is yanked with the reason "accidental breaking change (probably)". The latest installable version is 2.4.0 (2025-05-05). Source: package-index JSON for pytest-timeout.
- The README still says the `signal` method is used by default "if the system supports the SIGALRM signal", and that `thread` terminates the entire process. The README was fetched from the main branch. Source: [pytest-timeout README](https://raw.githubusercontent.com/pytest-dev/pytest-timeout/main/README.rst).
- Unreleased changes on main: 2026-11-06 "preserve capture fixture output on thread timeouts" (pull 212), 2026-10-31 a docs fix that spells the command-line option `--timeout-method` with a hyphen (pull 214). The hyphenated spelling was already the working one; only the README text was wrong. Source: pytest-timeout commit list and pull 214 diff.
- The "POSIX-only" phrasing is a gloss on "if the system supports SIGALRM". It remains correct.
- Pre-existing verification gap, unchanged: the grep `--timeout` in `pyproject.toml` misses the ini option `timeout = 60` and `timeout_method = "thread"`. That is a false RED, not a false pass.

### 3. PY-TEST-03 and PY-TEST-01: xdist `--dist load`, `xdist_group`, hooks before fork

Verdict: unchanged.

- pytest-xdist has had no release since 3.8.0 (2025-06-30). Source: [xdist changelog](https://raw.githubusercontent.com/pytest-dev/pytest-xdist/master/CHANGELOG.rst) and package-index JSON.
- Commits on master in November 2026 are Python 3.15 support (2026-11-26), a pre-commit bump, and "Schedule only loadscope nodes with a collection" (2026-11-21), which concerns `loadscope` and not `load`.
- pytest 9.2.0 notes that `-p`, `pytest_plugins` and `PYTEST_PLUGINS` now accept entry point names such as `xdist`. This does not change any spelling the pair uses.
- pytest 9.2.0 applies configured warning filters to warnings emitted by `pytest_configure` hooks (issue 10128). No change to hook ordering was found in the changelog.
- Limit: the hook-ordering statement (hooks run before workers fork) was checked only by looking for changelog entries that would change it. I did not re-read the xdist how-it-works page, because my fetch of it returned nothing. Treat as "unchanged by absence of any changelog entry".

### 4. PY-HTTP-09: `pytest --disable-socket --allow-hosts=127.0.0.1`, `SocketConnectBlockedError`

Verdict: unchanged.

- pytest-socket 0.8.1 was released 2026-08-19, four days before the window, so it is baseline. For completeness: it closes the socket before raising on a blocked connect and makes `SocketConnectBlockedError` pickleable so it survives xdist and Django `--parallel`. 0.8.0 is 2026-05-21. Source: [pytest-socket changelog](https://raw.githubusercontent.com/miketheman/pytest-socket/main/CHANGELOG.md).
- No flag was renamed in any release listed there. I did not open the README option table, so the flag spellings are verified only by the absence of a rename in the changelog.

### 5. PY-TEST-11: coverage.py `branch = true` and `exclude_also`

Verdict: unchanged.

- Releases in the window: 7.16.0 (2026-08-28), 7.16.1, 7.16.2, 7.17.0 (2026-10-22), 7.17.1 to 7.17.5 (2026-11-23). Source: [coverage CHANGES.rst](https://raw.githubusercontent.com/nedbat/coveragepy/main/CHANGES.rst).
- I read the entries for these versions and searched them for branch, exclude, pragma, config and default. No option was renamed or removed and no default changed. `exclude_also` is not mentioned.
- Related but harmless to the grep: the error "Can't combine statement coverage data with branch data" now names the two data files. `coverage run` rejects `--branch` combined with `--concurrency=multiprocessing`, including comma lists such as `multiprocessing,thread`. TOML config now gives a configuration error instead of a traceback for non-string values in list settings. Several fixes make phantom branches (for example around `while True:`) report correctly under the sys.monitoring core. These can shift branch percentages slightly; they do not change what the grep for `branch = true` proves.

### 6. PY-TEST-12: Sybil and `--doctest-modules`

Verdict: unchanged.

- Sybil 10.2.0 (2026-11-22) added `NamespacePackageDocument` for PEP 420 namespace packages and fixed an `IndexError` when reporting chained exceptions. 10.1.0 (2026-06-13, before the window) ignores trailing whitespace in doctest output by default, so a doctest whose only difference is trailing whitespace no longer goes red unless `KEEP_TRAILING_WHITESPACE` is set. Source: [Sybil changelog](https://raw.githubusercontent.com/simplistix/sybil/main/CHANGELOG.rst).
- pytest 9.2.0 changed nothing about `--doctest-modules` that I found. A 9.1.1 fix (2026-06-19, before the window) restored conftest visibility for doctests collected from outside the rootdir.
- Consequence for the pair's confirm step ("delete one character from an expected value and watch the run fail"): still valid. A deleted character is not trailing whitespace.

### 7. PY-SURF-02 and PY-SURF-03: `griffe check ... -f verbose`, "Public object was removed"

Verdict: changed for PY-SURF-02 (false-pass risk), unchanged for PY-SURF-03 and for the message text.

- Release: griffe 2.3.1 (2026-10-06) added "Exit gracefully when checking API and no tags are found" (commit 7c898a9). 2.3.1 is yanked on the package index; 2.3.2 followed the same day and carries the change. Latest is 2.4.1 (2026-10-22). Source: [griffe CHANGELOG](https://raw.githubusercontent.com/mkdocstrings/griffe/main/CHANGELOG.md), [commit diff](https://github.com/mkdocstrings/griffe/commit/7c898a9685c8ac29e1a4fd7767e85bf830b75a58.diff), and `cli.py` at tag 2.4.1.
- Observed behavior, run on 2026-11-27 in a throwaway repository with one commit and no tags, command `griffe check pkg -s src -f verbose`:
  - griffe 2.2.0: Python traceback ending `RuntimeError: Could not create git worktree: fatal: invalid reference:`, exit 1. Red.
  - griffe 2.4.1: stderr only, `griffe: info: 'against' ref not specified and no tags found`, empty stdout, exit 0. Green.
- The pair's PY-SURF-02 says "any output, and a non-zero exit, is the finding; silence is the pass". On griffe 2.3.2 or newer, a tagless checkout produces no stdout and exit 0. A reviewer who reads stdout, or a CI step that checks only the exit code, sees a pass although nothing was compared. The `GitError` path (exit 2) remains only for a failing `git tag -l`.
- PY-SURF-03 passes `--against <last tag>` explicitly, so the new branch is never reached. With a tag present, run on 2.4.1 against a repository where `g` was deleted: `--against v2` printed `src/pkg/__init__.py:0: g:` then `Public object was removed`, exit 1. `--against v1`, where nothing was removed, printed nothing and exited 0. So "Public object was removed" and the verbose layout are unchanged.
- The `--against` flag is documented in `griffe check --help` as "Older Git reference (commit, branch, tag) to check against. Default: load latest tag." The `-f` choices are `oneline,verbose,markdown,github,azdo`.
- Other griffe changes in the window do not touch `check`: 2.3.0 docstring precedence option, performance work, 2.3.1 `StrEnum` values, 2.3.2 and 2.4.0 drop Python 3.10 for the `griffelib` and `griffecli` packages, 2.4.0 adds `reference_path` and propagates `public` to inherited aliases (a possible source of changed reachability for re-exported names, not verified further), 2.4.1 stops checking attribute values (commit 0670d03, issue 506). Item 2.4.1 means a change to a module-level attribute's value is no longer reported as a breakage.

## Normative guidance candidates

1. Rule: PY-TEST-13 accepts any one of three spellings, each set to true: `--strict-markers` in `addopts`, `strict_markers = true`, or `strict = true` without a `strict_markers = false` override. Rationale: pytest 9.0.0 added the ini spellings and the pair's grep sees only one. Verification: a reviewer greps `strict-markers|strict_markers|^[[:space:]]*strict[[:space:]]*=` in `pyproject.toml`, `pytest.ini`, `tox.ini`, then reads each hit and requires the value `true` (or the flag form). A hit on `strict_markers = false` is a finding. Do not publish this as one bare grep: the widened pattern also matches `= false` and would reproduce a false pass. Stronger mechanical check, run on 2026-11-27 with `strict_markers = true` in `pytest.ini`: `pytest --collect-only -q -m "not zz_probe"` exited 4 on pytest 9.2.0 with `ERROR: Unknown marker(s) in '-m' expression: zz_probe.` and exited 0 on 9.1.1. Exit 4 therefore proves strictness regardless of spelling, but only on pytest 9.2 or newer; gate it on `pytest --version`.
2. Rule: PY-SURF-02 requires at least one tag to be visible to the job, and treats the line `griffe: info: 'against' ref not specified and no tags found` as a finding. Rationale: griffe 2.3.2 and newer exit 0 on a tagless checkout. Verification: `git tag -l | head -1` must be non-empty before the griffe step, or the step must pass `--against <ref>` explicitly; grep the job log for `no tags found`. CI checkouts need full history and tags (`fetch-depth: 0`).
3. Rule: PY-SURF-02 and PY-SURF-03 always pass `--against`. Rationale: removes the implicit latest-tag lookup and with it the silent exit. Verification: `grep -n -E 'griffe check' <workflow files>` and require `--against` on every hit.
4. Rule: PY-TEST-13 notes pytest 9.0.x ignored `--strict-markers` in `addopts` (fixed 9.1.0). Rationale: the grep passes while enforcement is off. Verification: `pytest --version` shows 9.1.0 or newer, or the spelling is `strict_markers`.
5. Rule: PY-TEST-06 accepts `timeout = <n>` and `timeout_method = ...` in ini as well as `--timeout`. Rationale: both are documented; the current grep is a false red on the ini spelling. Verification: grep `-e --timeout -e '^[[:space:]]*timeout[[:space:]]*='` in the pytest config files. Use the hyphenated `--timeout-method`.
6. Rule: pin pytest-timeout below the yanked 2.5.0 or at `2.4.0` until a fixed release exists. Rationale: 2.5.0 is yanked as an "accidental breaking change". Verification: the lock file lists pytest-timeout 2.4.0, not 2.5.0.
7. Rule: the PY-TEST-13 quoted failure message includes backticks around `markers`. Rationale: the real text is ``'<name>' not found in `markers` configuration option``. Verification: run the pair's own watched-red example and compare the text.

## AI-agent angle

- A model trained before 2025-11 writes only `addopts = "--strict-markers"` and will tell a reviewer that `strict_markers = true` is invalid. It is valid on pytest 9.0.0 and newer. Mechanical check: `pytest --version`, then the probe from candidate 1.
- A model asked to widen the grep adds `strict_markers` to the pattern and declares victory, which also accepts `strict_markers = false`. Check: require the literal `true` on the matching line.
- A model running `griffe check` in a clean CI container will see exit 0 and report that the API is compatible. Check: grep the log for `no tags found`, or require `--against`.
- A model recalls that pytest-timeout's newest release is 2.5.0 and recommends it. It is yanked. Check: the lock file.
- A model writes `--timeout_method` with an underscore, copied from the old README text. The documented option is `--timeout-method`. Check: grep for `timeout_method` outside ini files.

## Contested / evolving

- pytest is moving all strictness into `strict` and the individual `strict_*` options. 9.2.0 extended strict markers to `-m` expressions. Expect more checks to appear under `strict`, so a project that sets `strict = true` may start failing on upgrade. Trend as of 2026-10-27.
- griffe is in a 2.x series with a split package layout and frequent releases; behavior of `check` changed twice since 2.0 in ways that affect exit codes. Treat the exit-code contract as unstable and pin the version.
- pytest-timeout is in flux: 2.5.0 was yanked and main has unreleased fixes. Status as of 2026-11-27.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/pytest-dev/pytest/main/doc/en/changelog.rst | pytest changelog, 9.0.0 to 9.2.0 | 9.2.0 on 2026-10-27 | primary: strict mode, `-m` validation, addopts regression |
| https://raw.githubusercontent.com/pytest-dev/pytest/9.2.0/doc/en/reference/reference.rst | configuration reference at tag 9.2.0 | 2026-10-27 | primary: `strict`, `strict_markers` definitions and defaults |
| https://raw.githubusercontent.com/pytest-dev/pytest/9.2.0/src/_pytest/mark/__init__.py | source, `-m` validation | 2026-10-27 | primary: exact new error text |
| https://raw.githubusercontent.com/pytest-dev/pytest/9.2.0/src/_pytest/mark/structures.py | source, unregistered marker message | 2026-10-27 | primary: message text at 8.4.0, 9.0.0, 9.1.1, 9.2.0 |
| https://pypi.org/pypi/pytest/json | release dates | 2026-11-27 | primary: 9.1.0, 9.1.1, 9.2.0 dates |
| https://pypi.org/pypi/pytest-timeout/json | release record | 2026-11-27 | primary: 2.5.0 yank and reason |
| https://raw.githubusercontent.com/pytest-dev/pytest-timeout/main/README.rst | README with changelog | 2026-11 | primary: signal and thread semantics, option spelling |
| https://github.com/pytest-dev/pytest-timeout/pull/214.diff | docs fix for option spelling | 2026-10-31 | primary |
| https://raw.githubusercontent.com/pytest-dev/pytest-xdist/master/CHANGELOG.rst | xdist changelog | 3.8.0 on 2025-06-30 | primary: no release in window |
| https://pypi.org/pypi/pytest-xdist/json | release record | 2026-11-27 | primary |
| https://raw.githubusercontent.com/miketheman/pytest-socket/main/CHANGELOG.md | pytest-socket changelog | 0.8.1 on 2026-08-19 | primary: pickleable error, fd leak |
| https://pypi.org/pypi/pytest-socket/json | release record | 2026-11-27 | primary |
| https://raw.githubusercontent.com/nedbat/coveragepy/main/CHANGES.rst | coverage changelog | 7.17.5 on 2026-11-23 | primary: 7.16.0 to 7.17.5 |
| https://pypi.org/pypi/coverage/json | release dates | 2026-11-27 | primary |
| https://raw.githubusercontent.com/simplistix/sybil/main/CHANGELOG.rst | Sybil changelog | 10.2.0 on 2026-11-22 | primary |
| https://pypi.org/pypi/sybil/json | release record | 2026-11-27 | primary |
| https://raw.githubusercontent.com/mkdocstrings/griffe/main/CHANGELOG.md | griffe changelog | 2.4.1 on 2026-10-22 | primary: no-tags exit change |
| https://github.com/mkdocstrings/griffe/commit/7c898a9685c8ac29e1a4fd7767e85bf830b75a58.diff | the no-tags commit | 2026-10 | primary: exact code |
| https://raw.githubusercontent.com/mkdocstrings/griffe/2.4.1/packages/griffecli/src/griffecli/_internal/cli.py | `check` implementation at 2.4.1 | 2026-10-22 | primary |
| https://pypi.org/pypi/griffe/json | release record | 2026-11-27 | primary: 2.3.1 yank, dates |
| Local run of `uvx --from griffe==2.2.0` and `==2.4.1` on a throwaway repository | observed behavior | 2026-11-27 | primary: old exit 1 versus new exit 0, removed-object message |
