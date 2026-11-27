---
title: python-quality delta refresh, 2026-08-23 to 2026-11-27
pair: python-quality
date: 2026-11-27
window_start: 2026-08-23
model: opus
consolidates:
  - .agents/research/refresh-2026-11/python-quality/ruff-rule-surface-delta.md
  - .agents/research/refresh-2026-11/python-quality/pyright-checker-defaults-delta.md
  - .agents/research/refresh-2026-11/python-quality/cpython-3-15-and-stdlib-delta.md
  - .agents/research/refresh-2026-11/python-quality/uv-audit-and-script-runner-delta.md
  - .agents/research/refresh-2026-11/python-quality/pytest-ecosystem-delta.md
  - .agents/research/refresh-2026-11/python-quality/ci-platform-and-hook-contract-delta.md
  - .agents/research/refresh-2026-11/python-quality/httpx-urllib3-behaviour-delta.md
  - .agents/research/refresh-2026-11/python-quality/recent-shifts-python-quality.md
revises:
  - .agents/research/python-frame.md
  - .agents/research/python-topic-map/scout-shifts.md
  - .agents/research/python-subprocess/process-control.md
  - .agents/research/python-single-file-tools/stdlib-only.md
  - .agents/research/python-data-modelling/types-and-idioms.md
  - .agents/research/python-testing/suite-architecture.md
  - .agents/research/python-api-design/sdk-public-surface.md
  - .agents/research/python-security/untrusted-input.md
---

# python-quality delta refresh

## Verdict

- Change eight rule rows in place, keeping every ID and meaning: PY-PROC-01, PY-PROC-04, PY-PROC-07, PY-SOLO-03, PY-MODEL-05, PY-TEST-13, PY-SURF-02 and PY-SEC-01. Also correct the index summary of PY-PROC-01 in `rules/python-quality.md`.
- Scope the encoding rationale by version. Python 3.15.0 shipped on 2026-10-09 with PEP 686, so UTF-8 mode is on by default there. The rules PY-PROC-01 and PY-SOLO-03 stay MUST and SHOULD as written, because every floor in this pair is below 3.15 and `PYTHONUTF8=0` restores the locale default. Only the "default is the locale" wording becomes "below 3.15".
- Correct PY-MODEL-05. Since ruff 0.17.0 (2026-10-09) `DTZ002`, `DTZ003` and `DTZ004` are in the default selection, so "`DTZ` is not in ruff's default selection" is false. The verification `ruff check --select DTZ .` is unchanged.
- Close a false pass in PY-SURF-02. Since griffe 2.3.2 (2026-10-06), `griffe check` without `--against` on a tagless checkout exits 0 with empty stdout. The verification now always passes `--against` and treats the `no tags found` stderr line as the finding.
- Widen the PY-TEST-13 spellings. pytest 9.0 added the ini options `strict_markers` and `strict`, pytest 9.1.0 fixed `--strict-markers` in `addopts` being ignored on 9.0.x, and pytest 9.2.0 (2026-10-27) extended strict markers to `-m` expressions. The old grep reported a false finding on the spelling pytest now prefers. The widened grep was watched on planted configs before it was written here.
- Amend PY-SEC-01. The `data` and `tar` filters were bypassed by crafted link members (CVE-2026-82049, published 2026-09-14, and CVE-2026-11940), so the filter is defence in depth and a batch `tarfile` extract also rejects link members first.
- Refresh two stale facts: PEP 787 is still Deferred and 3.15 shipped without it (PY-PROC-04), and the PLW1510 "no timeout rule" claim is re-dated against the ruff 0.17.6 docs (PY-PROC-07). Move the illustrative PEP 723 header from `>=3.10`, which reached end of life on 2026-10-01, to `>=3.12`.
- Add no new rule. The PY-GATE-09 and PY-GATE-10 candidates rest on vendor and trade-press reports, which their own research brief says are not primary advisories. They go to open questions, and PY-GATE-10 is spillover to python-packaging.
- Bump the rule by patch, because only a summary fact changed. Bump the reference skill by minor, because PY-SEC-01 and PY-SURF-02 now require something they did not require before.

## Changed rules

### PY-PROC-01 (processes.md, and index row 5 in rules/python-quality.md)

- Old text (processes.md): "Both default to `locale.getpreferredencoding(False)`, not UTF-8, so one non-ASCII byte raises `UnicodeDecodeError` on a `LANG=C` image and nowhere else — a failure indistinguishable from flake, reproducing on one CI runner and not the next."
- New text: "Below Python 3.15 both default to `locale.getpreferredencoding(False)`, not UTF-8, so one non-ASCII byte raises `UnicodeDecodeError` on a `LANG=C` image and nowhere else — a failure indistinguishable from flake, reproducing on one CI runner and not the next. Python 3.15 turns UTF-8 mode on by default (PEP 686), which removes that failure there but on no floor below it, and `PYTHONUTF8=0` brings it back, so the rule does not relax on 3.15."
- Old index text: "`text=True` alone rides the locale."
- New index text: "`text=True` alone rides the locale on every floor below Python 3.15."
- Verification: unchanged, `ruff check --isolated --preview --select PLW1514 --output-format concise .` plus the subprocess block. PLW1514 is still preview, and ruff 0.16.6 made it recognise `builtins.open`, which widens detection and breaks nothing the verification relies on.
- Source: What's New in Python 3.15 ("Python now uses UTF-8 as the default encoding, independent of the system's environment"), PEP 686 (Final, opt-out `PYTHONUTF8=0`), devguide version table (3.15.0 on 2026-10-09).

### PY-PROC-04 (processes.md)

- Old text: "PEP 787, the t-string-safe `subprocess`/`shlex.sh()` proposal, is **Deferred** to 3.15 at the earliest, so do not soften the rule in anticipation of it."
- New text: "PEP 787, the t-string-safe `subprocess`/`shlex.sh()` proposal, is **Deferred**, and 3.15 shipped without it, so do not soften the rule in anticipation of it."
- Verification: unchanged, `ruff check --isolated --select S602,S604,S605`.
- Source: PEP 787 (Status Deferred), What's New in Python 3.15 (no mention).

### PY-PROC-07 (processes.md)

- Old text: "verified against 0.16.1, not assumed."
- New text: "verified against 0.16.1 and re-read in the 0.17.6 rule docs, not assumed."
- Verification: unchanged, `ruff check --isolated --select PLW1510`.
- Source: ruff PLW1510 rule page; ruff changelogs 0.16.3 to 0.17.6 (no subprocess-timeout rule added).

### PY-SOLO-03 (single-file-tools.md)

- Old text: "The platform default is locale-dependent, so the same file round-trips correctly on the developer's machine and corrupts on a runner whose locale is not UTF-8"
- New text: "Below Python 3.15 the platform default is locale-dependent (3.15 defaults to UTF-8 unless `PYTHONUTF8=0`, per PEP 686, and every floor here is lower), so the same file round-trips correctly on the developer's machine and corrupts on a runner whose locale is not UTF-8"
- Verification: unchanged, see block PY-SOLO-03.
- Source: as for PY-PROC-01.

### PY-MODEL-05 (data-modelling.md)

- Old text: "`DTZ` is not in ruff's default selection, so a gate that omits the family reports nothing and looks identical to a clean run."
- New text: "Since ruff 0.17.0 only `DTZ002`, `DTZ003` and `DTZ004` are in the default selection, so a gate that does not select the whole family misses a naive `datetime(...)`, `datetime.now()` or `strptime()` and looks identical to a clean run."
- Verification: unchanged, `ruff check --select DTZ .`, empty output is the pass.
- Source: ruff default-rules page (lists DTZ002, DTZ003, DTZ004); ruff 0.17.0 changelog (2026-10-09): DTZ001, DTZ005, DTZ006, DTZ007, DTZ011, DTZ012 and DTZ901 "are no longer enabled by default".

### PY-TEST-13 (testing.md)

- Old rule text: "`--strict-markers` is in `addopts`, and every marker used in the tree is registered in `markers`."
- New rule text: "Strict markers are on — `--strict-markers` in `addopts`, or, on pytest 9.0 or newer, `strict_markers = true` or `strict = true` with no `strict_markers = false` override — and every marker used in the tree is registered in `markers`. On pytest 9.0.x the `addopts` flag was silently ignored (fixed in 9.1.0), so a project on 9.0.x uses an ini spelling."
- Old verification: "see block PY-TEST-13 — empty output is the finding." with a grep for `strict-markers` only.
- New verification: the block greps `strict-markers`, `strict_markers` and a bare `strict =` line. Each hit is read: the flag in `addopts`, `strict_markers = true`, or `strict = true` with no `strict_markers = false` line is the pass; empty output, or only `false` values, is the finding. On pytest 9.2 or newer, `pytest --collect-only -q -m "not zz_probe"` exiting 4 with `Unknown marker(s) in '-m' expression` proves strictness whatever the spelling. The quoted collection error gains the backticks the real message carries.
- Watched: on 2026-11-27 the widened grep printed nothing against a config holding only `strict_config = true` (exit 123), one line each for `strict_markers = true` and `addopts = "--strict-markers"`, and both lines for `strict = true` overridden by `strict_markers = false`, which the reader then rejects. The `-m` probe was watched in the pytest delta: exit 4 on 9.2.0, exit 0 on 9.1.1.
- Source: pytest changelog (9.0.0 issue 13823, 9.1.0 issue 14442, 9.2.0 issue 2781); `reference.rst` and `src/_pytest/mark/structures.py` at tag 9.2.0.

### PY-SURF-02 (api-surface.md)

- Old verification: "`griffe check <pkg> -s src -f verbose` — any output, and a non-zero exit, is the finding; silence is the pass."
- New verification: "`griffe check <pkg> -s src --against <last tag> -f verbose` — any output, and a non-zero exit, is the finding; silence is the pass. Never drop `--against`: since griffe 2.3.2 a checkout with no tags, such as a shallow CI clone, prints only `griffe: info: 'against' ref not specified and no tags found` to stderr and exits 0, a pass that compared nothing (watched on 2.4.1; 2.2.0 crashed with exit 1). The CI job fetches tags (`fetch-depth: 0`), and that stderr line in a job log is the finding."
- Rule text: unchanged. PY-SURF-03 already passes `--against` and is unaffected.
- Source: griffe changelog 2.3.1 ("Exit gracefully when checking API and no tags are found", commit 7c898a9), `cli.py` at tag 2.4.1, and a local run of griffe 2.2.0 and 2.4.1 on a tagless repository.

### PY-SEC-01 (security.md)

- Old text: the row ends its rule cell with "so `stat.S_ISLNK(info.external_attr >> 16)` rejection is what replaces the filter there." and opens its verification with "one without an explicit `filter=` is the violation."
- New text: append "The filter is defence in depth, not the boundary: crafted link members bypassed both `data` and `tar` until 3.12.15 and 3.13.16 (CVE-2026-11940, CVE-2026-82049; the 3.14 fix level is unconfirmed), so a batch `tarfile` extract also rejects every member where `member.issym() or member.islnk()` before the call." The verification becomes "one without an explicit `filter=`, or without a link-member rejection ahead of it, is the violation."
- Verification: see block PY-SEC-01, then a read of each hit. The fleet's two shipped extraction sites already reject links, so this stays a do-not-regress check.
- Source: OSV CVE-2026-82049 (published 2026-09-14, fixed 3.12.15 and 3.13.16) and OSV CVE-2026-11940 (fixed 3.12.14, 3.13.15, 3.14.7).

## New rules

None. The candidates PY-GATE-09 (workflow `permissions:` and no `toJSON(secrets)`) and PY-GATE-10 (no install step in a job holding a credential) are declined for this refresh; see open questions. The 3.15 additions (PEP 810 `lazy import`, PEP 728 closed `TypedDict`, PEP 747, PEP 800) do not become rules, because every fleet floor is 3.12 or 3.13 and none of them is usable there without `typing_extensions`.

## Confirmed unchanged

- Pyright 1.1.414 (newest, 2026-09-09): `reportMatchNotExhaustive` is off below Strict, `reportUnhashable` and `reportPrivateImportUsage` are `error` from Basic, `reportDeprecated` is `error` only in Strict, the re-export rules match PY-SURF-01, and `--pythonpath` is still needed because no `.venv` discovery shipped.
- Ruff preview status: B909, PLW1514, DOC201 and DOC502 still require `--preview`. Only TID254, TID255 and RUF071 were stabilized in the window, and the pair names none of them. LOG002, ASYNC115 (trio and anyio only), EXE001 (not enforced on Windows or WSL), PGH003 and PGH004 are as described.
- UP042 is still inert below `target-version = "py311"`. Ruff 0.17.0 now assumes py311 when nothing is configured, which makes the rule active there and does not contradict the PY-MODEL-04 text.
- CPython: `get_event_loop()` raising since 3.14, `wait_for()` built on `timeout()` since 3.12, the tarfile `data` default from 3.14, zipfile still without `filter=`, PEP 749 and the `from __future__ import annotations` reading, and cpython#108611 still open.
- uv 0.13.10: `uv audit` and the malware check are still preview, so pip-audit stays the gate; pip-audit had no release in the window. `uv run` still enforces the PEP 723 floor, a header without `dependencies` still runs, and `#!/usr/bin/env -S uv run --script` is still the documented shebang.
- pytest-timeout (no installable release; 2.5.0 is yanked), pytest-xdist (no release since 3.8.0), pytest-socket (no flag rename), coverage.py 7.16.0 to 7.17.5 (`branch` and `exclude_also` unchanged) and Sybil 10.2.0 leave PY-TEST-01, -03, -06, -11, -12 and PY-HTTP-09 as written.
- httpx 0.29.0 and urllib3 2.8.0: the 5 s default timeout, `follow_redirects=False`, cross-origin `Authorization` stripping, the exception taxonomy, `iter_bytes`, `response.links` and both credential-logging leaks behind PY-OBS-06 are unchanged.
- GitHub Actions `timeout-minutes` still defaults to 360, the rules endpoint and `required_status_checks` are unchanged, zizmor `--format plain`, `template-injection` and `unpinned-uses` are current, and the Claude Code hooks contract still blocks only on exit `2`.

## Open questions

- PY-GATE-09 and PY-GATE-10 candidates. The "wfx" Actions credential-theft campaign (2026-11-10 to 2026-11-12) and the `agent-framework` `.pth` payload (2026-11-17) are sourced to Endor Labs and Help Net Security, not to a GitHub or PyPI advisory. The owner decides whether a workflow `permissions:` rule joins ci-gate.md; the install-versus-credential job split belongs to python-packaging.
- Whether zizmor replaces the hand-written greps behind PY-GATE-05 and PY-GATE-06, and whether a workflow onboarded to a GitHub workflow lockfile (GA 2026-10-28) is a stated exception to PY-GATE-06. Both are owner decisions.
- PY-TEST-08: whether a job stopped by `timeout-minutes` reports as cancelled is not stated in any GitHub doc read. Only a deliberate hanging-job test settles the wording.
- cpython#88050, cited by PY-ASYNC-05 and PY-PROC-06, was closed in 2022 by a pipe-race fix, not by making cancellation kill the child. The behaviour claim is kept. A spawn-cancel-check test on 3.12 to 3.15 is needed before the citation is reworded.
- PY-TEST-06: the `--timeout` grep misses the ini spellings `timeout = <n>` and `timeout_method = ...`. That is a false finding, not a false pass, and pytest-timeout did not change in the window, so it is left for an author pass.
- PY-ASYNC-07: the deprecated `get_event_loop_policy` and `set_event_loop_policy` (removal in 3.16) are not in the grep. The deprecation predates the window.
- The 3.14 patch level that fixes CVE-2026-82049, and the fixed versions for CVE-2026-115791 (the tarfile, zipfile and gzip command-line `sys.path[0]` issue).
- Measured ruff behaviours the docs neither confirm nor deny: the S202 zipfile quirk (PY-SEC-01), the G-family logger names (PY-OBS-03), and the fully-qualified requirement of `raises-extend-require-match-for` (PY-TEST-05). The earlier measurements stand until a re-run.
- Watch triggers: ty 1.0 or a stable statement from Astral; pyrefly publishing a parity table against pyright Standard; a fleet floor reaching 3.15 (lazy imports, closed `TypedDict`, `TaskGroup.cancel()`); httpx 1.0 final, whose rewrite removes every API http.md names; a free-threaded default-build PEP.
- Claude Code hooks: `"onFailure": "block"` (2.1.328) lets a failing hook block. The cli-contract Exit-Code Table is not reworded, and changelog entries from 2026-08-23 to 2026-11-11 were not read.

## Sources (first round)

| Change | Source | Kind | What it supports |
|---|---|---|---|
| PY-PROC-01, PY-SOLO-03 | https://peps.python.org/pep-0686/ | Primary, PEP | Status Final; UTF-8 mode on by default in 3.15, opt-out `PYTHONUTF8=0` |
| PY-PROC-01, PY-SOLO-03 | https://docs.python.org/3.15/whatsnew/3.15.html | Primary, release notes | "Python now uses UTF-8 as the default encoding, independent of the system's environment"; no mention of PEP 787 |
| PY-PROC-04 | https://peps.python.org/pep-0787/ | Primary, PEP | Status Deferred |
| PY-PROC-07 | https://docs.astral.sh/ruff/rules/subprocess-run-without-check/ | Primary, vendor documentation | PLW1510 rule page, re-read at ruff 0.17.6; no subprocess-timeout rule |
| PY-MODEL-05 | https://docs.astral.sh/ruff/default-rules/ | Primary, vendor documentation | DTZ002, DTZ003 and DTZ004 in the default selection |
| PY-MODEL-05 | https://github.com/astral-sh/ruff/releases/tag/0.17.0 | Primary, vendor release notes | 0.17.0 (2026-10-09): other DTZ rules "no longer enabled by default" |
| PY-TEST-13 | https://docs.pytest.org/en/stable/changelog.html | Primary, vendor changelog | 9.0.0 issue 13823, 9.1.0 issue 14442, 9.2.0 issue 2781 |
| PY-SURF-02 | https://github.com/mkdocstrings/griffe/blob/main/CHANGELOG.md | Primary, vendor changelog | Griffe 2.3.1 "Exit gracefully when checking API and no tags are found" |
| PY-SEC-01 | https://osv.dev/vulnerability/CVE-2026-82049 and https://osv.dev/vulnerability/CVE-2026-11940 | Primary, advisory database | Link-member bypasses of the `data` and `tar` filters, fixed versions |

## Revision log

- rules/python-quality.md, index row 5: "rides the locale" scoped to floors below Python 3.15.
- PY-PROC-01: rationale scoped by version; 3.15 UTF-8 mode and `PYTHONUTF8=0` named.
- PY-PROC-04: PEP 787 "Deferred to 3.15 at the earliest" becomes "Deferred, and 3.15 shipped without it".
- PY-PROC-07: PLW1510 claim re-dated against the ruff 0.17.6 docs.
- processes.md, What Agents Get Wrong item 4: locale decoding scoped to below 3.15.
- PY-SOLO-03: locale default scoped to below Python 3.15.
- single-file-tools.md example header: `requires-python` moved from `>=3.10` (end of life) to `>=3.12`.
- PY-MODEL-05: default-selection claim corrected to DTZ002 to DTZ004 since ruff 0.17.0.
- data-modelling.md, What Agents Get Wrong item 8: opt-in claim corrected to match.
- PY-TEST-13: three accepted spellings, the 9.0.x `addopts` regression, the `-m` probe, and the exact collection error text.
- PY-TEST-13 block: grep widened to `strict_markers` and a bare `strict =` line.
- PY-SURF-02: verification always passes `--against`; the griffe 2.3.2 tagless exit 0 named as the finding.
- PY-SEC-01: filter named as defence in depth with the two bypass CVEs; link-member rejection required before a batch extract.
- security.md Sources: OSV entries for CVE-2026-82049 and CVE-2026-11940 added.
- Spillover round, PY-GATE-04: uv itself pinned to an exact version in CI, because uv 0.13.10 validates `uv.lock` more strictly; verification gains a read of every uv install step.

## Edit list

1. File: `rules/python-quality.md`
   Find (verbatim):
   ```
   | 5 | Every text `open()` and every captured subprocess names its `encoding=` — `text=True` alone rides the locale. | PY-PROC-01 |
   ```
   Replace with:
   ```
   | 5 | Every text `open()` and every captured subprocess names its `encoding=` — `text=True` alone rides the locale on every floor below Python 3.15. | PY-PROC-01 |
   ```

2. File: `skills/python-quality-reference/processes.md`
   Find (verbatim):
   ```
   Both default to `locale.getpreferredencoding(False)`, not UTF-8, so one non-ASCII byte raises `UnicodeDecodeError` on a `LANG=C` image and nowhere else — a failure indistinguishable from flake, reproducing on one CI runner and not the next.
   ```
   Replace with:
   ```
   Below Python 3.15 both default to `locale.getpreferredencoding(False)`, not UTF-8, so one non-ASCII byte raises `UnicodeDecodeError` on a `LANG=C` image and nowhere else — a failure indistinguishable from flake, reproducing on one CI runner and not the next. Python 3.15 turns UTF-8 mode on by default (PEP 686), which removes that failure there but on no floor below it, and `PYTHONUTF8=0` brings it back, so the rule does not relax on 3.15.
   ```

3. File: `skills/python-quality-reference/processes.md`
   Find (verbatim):
   ```
   is **Deferred** to 3.15 at the earliest, so do not soften the rule in anticipation of it.
   ```
   Replace with:
   ```
   is **Deferred**, and 3.15 shipped without it, so do not soften the rule in anticipation of it.
   ```

4. File: `skills/python-quality-reference/processes.md`
   Find (verbatim):
   ```
   verified against 0.16.1, not assumed.
   ```
   Replace with:
   ```
   verified against 0.16.1 and re-read in the 0.17.6 rule docs, not assumed.
   ```

5. File: `skills/python-quality-reference/processes.md`
   Find (verbatim, two lines):
   ```
   4. Reading `text=True` as "decode UTF-8." It is "decode with whatever the
      locale says," which is why the failure is CI-image-specific.
   ```
   Replace with:
   ```
   4. Reading `text=True` as "decode UTF-8." Below 3.15 it is "decode with
      whatever the locale says," which is why the failure is CI-image-specific.
   ```

6. File: `skills/python-quality-reference/single-file-tools.md`
   Find (verbatim):
   ```
   # requires-python = ">=3.10"
   ```
   Replace with:
   ```
   # requires-python = ">=3.12"
   ```

7. File: `skills/python-quality-reference/single-file-tools.md`
   Find (verbatim):
   ```
   The platform default is locale-dependent, so the same file round-trips correctly
   ```
   Replace with:
   ```
   Below Python 3.15 the platform default is locale-dependent (3.15 defaults to UTF-8 unless `PYTHONUTF8=0`, per PEP 686, and every floor here is lower), so the same file round-trips correctly
   ```

8. File: `skills/python-quality-reference/data-modelling.md`
   Find (verbatim):
   ```
   `DTZ` is not in ruff's default selection, so a gate that omits the family reports nothing and looks identical to a clean run.
   ```
   Replace with:
   ```
   Since ruff 0.17.0 only `DTZ002`, `DTZ003` and `DTZ004` are in the default selection, so a gate that does not select the whole family misses a naive `datetime(...)`, `datetime.now()` or `strptime()` and looks identical to a clean run.
   ```

9. File: `skills/python-quality-reference/data-modelling.md`
   Find (verbatim, two lines):
   ```
   8. Assuming a clean `ruff check` covers this file. `DTZ` and `B909` are opt-in;
      with neither selected the command exits 0 over code that violates both.
   ```
   Replace with:
   ```
   8. Assuming a clean `ruff check` covers this file. `B909` and every `DTZ` rule
      except `DTZ002`–`DTZ004` are opt-in; with neither family selected the command
      exits 0 over code that violates both.
   ```

10. File: `skills/python-quality-reference/testing.md`
    Find (verbatim, one table row):
    ```
    | PY-TEST-13 | `--strict-markers` is in `addopts`, and every marker used in the tree is registered in `markers`. Without it a mistyped marker emits a warning and nothing else: the test stays in whatever tier the typo put it in, the selection the developer wrote silently does not apply, and the run exits 0. One line of config; there is no prose substitute. | see block PY-TEST-13 — empty output is the finding. Watched red: with a marker misspelled by two letters, `pytest -m "not requires_docker"` reported `2 passed, 1 warning` and exit 0 — the excluded test ran. The same invocation with `--strict-markers` hard-failed at collection with `'requires_dokcer' not found in markers configuration option`. | MUST |
    ```
    Replace with:
    ```
    | PY-TEST-13 | Strict markers are on — `--strict-markers` in `addopts`, or, on pytest 9.0 or newer, `strict_markers = true` or `strict = true` with no `strict_markers = false` override — and every marker used in the tree is registered in `markers`. On pytest 9.0.x the `addopts` flag was silently ignored (fixed in 9.1.0), so a project on 9.0.x uses an ini spelling. Without it a mistyped marker emits a warning and nothing else: the test stays in whatever tier the typo put it in, the selection the developer wrote silently does not apply, and the run exits 0. One line of config; there is no prose substitute. | see block PY-TEST-13 and read each hit — the flag in `addopts`, `strict_markers = true`, or `strict = true` with no `strict_markers = false` line is the pass; empty output, or only `false` values, is the finding. Watched on planted configs: empty against `strict_config = true` alone, one hit per accepted spelling, both lines shown for `strict = true` overridden by `strict_markers = false`. On pytest 9.2 or newer, `pytest --collect-only -q -m "not zz_probe"` exiting 4 with `Unknown marker(s) in '-m' expression` proves strictness whatever the spelling. Watched red: with a marker misspelled by two letters, `pytest -m "not requires_docker"` reported `2 passed, 1 warning` and exit 0 — the excluded test ran. The same invocation with `--strict-markers` hard-failed at collection with `` 'requires_dokcer' not found in `markers` configuration option ``. | MUST |
    ```

11. File: `skills/python-quality-reference/testing.md`
    Find (verbatim):
    ```
    xargs -0 -r grep -H -n -E -e strict-markers --
    ```
    Replace with:
    ```
    xargs -0 -r grep -H -n -E -e strict-markers -e strict_markers -e '^[[:space:]]*strict[[:space:]]*=' --
    ```

12. File: `skills/python-quality-reference/api-surface.md`
    Find (verbatim):
    ```
    `griffe check <pkg> -s src -f verbose` — any output, and a non-zero exit, is the finding; silence is the pass.
    ```
    Replace with:
    ```
    `griffe check <pkg> -s src --against <last tag> -f verbose` — any output, and a non-zero exit, is the finding; silence is the pass. Never drop `--against`: since griffe 2.3.2 a checkout with no tags, such as a shallow CI clone, prints only `griffe: info: 'against' ref not specified and no tags found` to stderr and exits 0, a pass that compared nothing (watched on 2.4.1; 2.2.0 crashed with exit 1). The CI job fetches tags (`fetch-depth: 0`), and that stderr line in a job log is the finding.
    ```

13. File: `skills/python-quality-reference/security.md`
    Find (verbatim):
    ```
    so `stat.S_ISLNK(info.external_attr >> 16)` rejection is what replaces the filter there. | see block PY-SEC-01 — every hit needs a read; one without an explicit `filter=` is the violation.
    ```
    Replace with:
    ```
    so `stat.S_ISLNK(info.external_attr >> 16)` rejection is what replaces the filter there. The filter is defence in depth, not the boundary: crafted link members bypassed both `data` and `tar` until 3.12.15 and 3.13.16 (CVE-2026-11940, CVE-2026-82049; the 3.14 fix level is unconfirmed), so a batch `tarfile` extract also rejects every member where `member.issym() or member.islnk()` before the call. | see block PY-SEC-01 — every hit needs a read; one without an explicit `filter=`, or without a link-member rejection ahead of it, is the violation.
    ```

14. File: `skills/python-quality-reference/security.md`
    Anchor (verbatim):
    ```
    - [CVE-2007-4559](https://nvd.nist.gov/vuln/detail/CVE-2007-4559) — the traversal that sat unfixed at the language level for 17 years, re-scored 9.8 Critical
    ```
    Insert after it (new line):
    ```
    - [CVE-2026-82049](https://osv.dev/vulnerability/CVE-2026-82049) and [CVE-2026-11940](https://osv.dev/vulnerability/CVE-2026-11940) — link-member bypasses of the `data` and `tar` filters, and the patch levels that fix them
    ```

## Spillover round

### Verdict

- Extend PY-GATE-04 in place, keeping its ID, number and meaning. The rule already says tools resolve through the project pin; uv is the tool that does the resolving, and nothing pinned it. The one spillover item from python-packaging is confirmed by the uv 0.13.10 release page (2026-11-24): uv now validates that the requirements in `uv.lock` match the locked package versions and reports dependencies missing from the lock, so a lock an earlier uv accepted can fail `--locked` or `--check` the day an unpinned runner picks up the newer uv.
- The pin itself is a judgement, not a sourced fact, and nothing in the target was false. It is added because an agent writing a workflow routinely omits the uv version, and `astral-sh/setup-uv` then installs the newest release unless the project sets `required-version`; that default is quoted from the setup-uv README.
- No new rule, and nothing in `rules/python-quality.md` changes. The rule bump stays patch and the reference skill bump stays minor, as in the first round; this round adds a requirement inside a skill already bumped minor.

### Changed rules

#### PY-GATE-04 (ci-gate.md)

- Old rule text ends: "two different linters, same machine, same moment, and the contributor sees a clean tree CI rejects."
- New rule text appends: "The same holds for uv itself: CI installs an exact uv version, because uv 0.13.10 (2026-11-24) validates `uv.lock` more strictly under `--locked` and `--check`, so a lock an earlier uv accepted can fail the day an unpinned runner picks up a newer one."
- Old verification ends: "two different numbers is the violation."
- New verification appends: "For uv itself, run `grep -rn -A4 -e setup-uv -e astral.sh/uv .github/workflows` and read each hit: a uv install that names no exact version (a `version:` input, a versioned installer URL), in a project whose `uv.toml` or `pyproject.toml` sets no exact `required-version`, is the violation. Without either, `setup-uv` installs the latest release."
- Watched on 2026-11-27: the grep against two planted workflows printed a `setup-uv` step with no `with:` block, which is the violation, and a `setup-uv` step whose `version: "0.13.10"` input appears inside the four context lines, which is the pass. Exit 0 in both cases, so the reading of the hits decides, not the exit code.
- Severity: unchanged, MUST.

### New rules

None.

### Declined

- Nothing declined. The single item was confirmed by a primary source. The spillover check's note that the exit code of `uv lock --check` on a stale lock was never measured does not affect this change, because the added text names no exit code.

### Sources (spillover round)

| Change | Source | Kind | What it supports |
|---|---|---|---|
| PY-GATE-04 rule text | https://github.com/astral-sh/uv/releases/tag/0.13.10 | Primary, vendor release notes | Release date 2026-11-24; uv now validates that `uv.lock` requirements match locked versions, explains why `--locked` rejects a lock, and reports dependencies missing from the lock |
| PY-GATE-04 verification | https://github.com/astral-sh/setup-uv (README, fetched 2026-11-27) | Primary, vendor documentation | The `version` input installs a given uv; when it is unset the action reads `required-version` from `uv.toml` or `pyproject.toml` in the repository root, and otherwise "the latest version will be installed" |

### Edit list (spillover round)

1. File: `skills/python-quality-reference/ci-gate.md`
   Find (verbatim):
   ```
   two different linters, same machine, same moment, and the contributor sees a clean tree CI rejects. | see block PY-GATE-04 — every hit invokes a bare tool name and is the violation; the pinned forms are `uv run …` or the task. Then run `ruff --version` and `uv run ruff --version` in the project directory: two different numbers is the violation. | MUST |
   ```
   Replace with:
   ```
   two different linters, same machine, same moment, and the contributor sees a clean tree CI rejects. The same holds for uv itself: CI installs an exact uv version, because uv 0.13.10 (2026-11-24) validates `uv.lock` more strictly under `--locked` and `--check`, so a lock an earlier uv accepted can fail the day an unpinned runner picks up a newer one. | see block PY-GATE-04 — every hit invokes a bare tool name and is the violation; the pinned forms are `uv run …` or the task. Then run `ruff --version` and `uv run ruff --version` in the project directory: two different numbers is the violation. For uv itself, run `grep -rn -A4 -e setup-uv -e astral.sh/uv .github/workflows` and read each hit: a uv install that names no exact version (a `version:` input, a versioned installer URL), in a project whose `uv.toml` or `pyproject.toml` sets no exact `required-version`, is the violation. Without either, `setup-uv` installs the latest release. | MUST |
   ```
