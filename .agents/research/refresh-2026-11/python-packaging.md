---
title: python-packaging delta refresh, 2026-08-23 to 2026-11-27
pair: python-packaging
date: 2026-11-27
window_start: 2026-08-23
model: opus
consolidates:
  - .agents/research/refresh-2026-11/python-packaging/uv-cli-and-uv-build.md
  - .agents/research/refresh-2026-11/python-packaging/deptry-changelog.md
  - .agents/research/refresh-2026-11/python-packaging/pypi-trusted-publishing-and-attestations.md
  - .agents/research/refresh-2026-11/python-packaging/pypa-specs-and-hatchling.md
  - .agents/research/refresh-2026-11/python-packaging/cpython-lifecycle-floor-examples.md
  - .agents/research/refresh-2026-11/python-packaging/ruff-config-discovery.md
  - .agents/research/refresh-2026-11/python-packaging/recent-packaging-shifts.md
revises:
  - .agents/research/python-packaging.md
  - .agents/research/python-frame.md
  - .agents/research/python-topic-map.md
---

# python-packaging delta refresh

## Verdict

- Change three rule rows in place in `rules/python-packaging.md`: PY-PKG-01 (worked example), PY-PKG-03 (rationale), and PY-PKG-10 (verification). Rule bump: patch. No ID changes, no renumbering.
- Move the PY-PKG-01 worked example from 3.10 to 3.11. CPython 3.10 reached end of life on 2026-10-01 with 3.10.22 as its final release, and python-build-standalone stopped shipping 3.10 builds from tag 20261013. The historical sentence about the two `>=3.10` harnesses stays, because it records past evidence.
- Narrow the PY-PKG-03 rationale. uv's resolution docs say uv ignores upper bounds on a dependency's `Requires-Python`, and uv 0.13.1 (2026-10-14) aligned `uv pip check` with that. So "a resolver conflict for every consumer" overstates the case for uv consumers. The cap still hurts pip-style consumers and still makes uv refuse interpreters above it for the project itself, which was measured.
- Add a third grep to PY-PKG-10. The uv packaging guide names `UV_PUBLISH_TOKEN` and `UV_PUBLISH_PASSWORD` as the token paths for `uv publish`. A planted `UV_PUBLISH_TOKEN: ${{ secrets.PYPI_API_TOKEN }}` passed both existing greps (exit 123, no output) and was caught by the new one. This gap predates the window, but the delta fetched the primary source and the measurement proves a false pass, so the verification is corrected.
- Leave `skills/python-packaging-reference/` untouched. It carries only `context.awk`, and no finding touches it. Skill bump: none.
- Add no new rule. The PyPI archive-format rejection (2026-11-18) is real, but only hand-packed sdists or wheels hit it, and a competent model already builds with the declared backend. The PY-PKG-11 sketch is declined.
- Add no end-of-life-floor clause to PY-PKG-01. uv still installs 3.10.22 on 2026-11-27, so the collection check still runs, and whether a library keeps an end-of-life floor is a policy choice for the owner. It goes to open questions.

## Changed rules

### PY-PKG-01

- Old text (verification cell): "From the project directory: `uv python install 3.10` then `uv run --python 3.10 python -m pytest --collect-only -q .`, substituting the declared floor."
- New text: "From the project directory: `uv python install 3.11` then `uv run --python 3.11 python -m pytest --collect-only -q .`, substituting the declared floor."
- Rule sentence and severity (MUST) are unchanged. The verification mechanism is unchanged.
- Source: https://devguide.python.org/versions/ (3.10 end of life 2026-10-01; 3.11 receives security fixes until 2027-10); https://www.python.org/downloads/release/python-31022/ (final 3.10 release); https://github.com/astral-sh/python-build-standalone/releases (3.10 no longer included from 20261013 and 20261020).

### PY-PKG-03

- Old text (rule cell, after the dash): "an unexplained `<4.0` makes every future interpreter a resolver conflict for every consumer."
- New text: "an unexplained `<4.0` makes every interpreter past the cap a resolver conflict for consumers on pip-style resolvers and an install refusal for the project's own contributors; uv ignores the cap on a dependency, which hides the bound rather than removing it."
- The first clause (upper bound only with an adjacent comment naming the incompatibility), the verification and the severity (SHOULD) are unchanged.
- Source: https://docs.astral.sh/uv/concepts/resolution/ ("uv only considers lower bounds and ignores upper bounds entirely" for dependencies; the project's `requires-python` must be a subset of its dependencies'); uv 0.13.1 changelog entry (2026-10-14) in https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md; local measurement with uv 0.13.9: `requires-python = ">=3.10,<3.12"` made uv refuse interpreter 3.14.7 for the project.

### PY-PKG-10

- Old text (verification cell): "see block PY-PKG-10 (1) and see block PY-PKG-10 (2) as two separate commands. Any hit in a publish job is the violation; empty output from both is the pass."
- New text: "see block PY-PKG-10 (1), see block PY-PKG-10 (2) and see block PY-PKG-10 (3) as three separate commands. Any hit in a publish job is the violation; empty output from all three is the pass."
- New block line added under the existing two: `# PY-PKG-10 (3)` with the same `git ls-files` pipe and `grep -H -n -E -e 'UV_PUBLISH_(TOKEN|PASSWORD)' --`. The pattern excludes `UV_PUBLISH_URL`, which carries no secret.
- Rule sentence and severity (SHOULD) are unchanged.
- Source: https://docs.astral.sh/uv/guides/package/ (`--token` / `UV_PUBLISH_TOKEN`, `UV_PUBLISH_USERNAME` / `UV_PUBLISH_PASSWORD`; Trusted Publishing on GitHub Actions needs no credentials). Red/green measured 2026-11-27 on a planted workflow: the old greps returned nothing on `UV_PUBLISH_TOKEN: ${{ secrets.PYPI_API_TOKEN }}`; block (3) reported line 2; with only `UV_PUBLISH_URL` present, block (3) returned nothing.

## New rules

None.

Declined: PY-PKG-11 sketch (distributions produced by the declared backend, never packed by hand). Rationale for declining: the fleet already builds with backends, the rule would rarely fire, and a competent model follows it unprompted. The number PY-PKG-11 stays unassigned, so a later refresh may still use it.

## Confirmed unchanged

- PY-PKG-01 command syntax: `uv python install <v>` and `uv run --python <v>` are unchanged through uv 0.13.10; uv still serves 3.10.22.
- PY-PKG-02: classifiers list reaches 3.16; no PyPI validation of Python-version classifiers; the 3.13-versus-3.12 example still names two supported releases.
- PY-PKG-04: no change confirmed. The 3.15 `MetadataNotFound` change was not confirmed to reach `importlib.metadata.version()` (open question).
- PY-PKG-05: `uv lock --check` still exists and exits 0 on a current lock; uv 0.13.10 made the check stricter, which is the intended signal.
- PY-PKG-06: deptry 0.25.1 is still the newest release; `--optional-dependencies-dev-groups`, the default `tests` exclude and `--exclude` overwriting defaults are unchanged; planted red/green reproduced.
- PY-PKG-07: PEP 735 Final with no amendment; the PyPA guide now lists `[dependency-groups]` for testing and linting, which supports the rule.
- PY-PKG-08: `uv build --wheel` still writes to `dist/`; the wheel carried `py.typed`; no hatchling release touched `py.typed` handling.
- PY-PKG-09: `uv_build` is still pure-Python only; the PyPA tutorial still defaults to Hatchling with a constrained `requires`; hatchling 1.32.3, 1.32.4 and 1.33.0 did not touch src-layout discovery. The pair quotes no `uv_build` version range, so the 0.12-to-0.13 move needs no pair edit.
- PY-PKG-10 rule sentence: OIDC tokens still last 15 minutes; `password:` is still the action's token input; no PyPI token or 2FA policy change in the window; attestations are on by default under Trusted Publishing.
- Where Tool Config Lives: Ruff 0.17.5 still uses the closest config file without merging and without a warning; a `pyproject.toml` without `[tool.ruff]` is still skipped.
- `skills/python-packaging-reference/SKILL.md` and `checks/context.awk`: no upstream change touches them.

## Open questions

1. Should a `requires-python` floor that names an end-of-life CPython (3.10 since 2026-10-01) become a finding of its own? The fleet's `<repo>/test/` harnesses still declare `>=3.10`. This is an owner policy decision; it extends the existing topic-map question about raising those floors.
2. Does `importlib.metadata.version()` on Python 3.15 still raise `PackageNotFoundError` for an absent distribution, or can `MetadataNotFound` escape instead? The 3.15 What's New page was read only in part. If `MetadataNotFound` can escape, the PY-PKG-04 verification should name both exceptions.
3. The exit code of `uv lock --check` on a stale lockfile was not measured in the window; "Non-zero is the violation" stands on the baseline measurement.
4. `unzip` was absent on the measurement machine; `python -m zipfile -l` is a portable alternative for the PY-PKG-08 verification. No upstream change prompted it, so it is not applied.
5. PEP 794 (`import-names`) and PEP 808 (static entries in `dynamic` fields): accepted, but backend support was not confirmed. No rule until it is.

## Revision log

- PY-PKG-01: worked example moves from 3.10 to 3.11, because 3.10 reached end of life on 2026-10-01.
- PY-PKG-03: rationale names pip-style consumers and the project's own contributors, and says uv ignores a dependency's cap.
- PY-PKG-10: verification gains block (3), `UV_PUBLISH_(TOKEN|PASSWORD)`, which closes a measured false pass for `uv publish`.
- Feeding consolidations, not edited here: `.agents/research/python-packaging.md` quotes `uv_build>=0.12.5,<0.13` (now `>=0.13.10,<0.14` in the uv docs) and pins `pypa/gh-action-pypi-publish` v1.14.2 (v1.14.3, commit `7245906fb61fa33a13554f9d5fb856fe61758086`, released 2026-10-20 as a security fix); its attestations open question is resolved (on by default). `.agents/research/python-frame.md` says the current release is 3.14 (now 3.15) and lists `>=3.10` as a live floor (now end of life).
- Spillover round (2026-11-27): no change to the rule or the skill; all five items were declined or confirmed as already correct (see "Spillover round" below).

## Edit list

1. File: `rules/python-packaging.md`
   Find (verbatim):
   ```
   From the project directory: `uv python install 3.10` then `uv run --python 3.10 python -m pytest --collect-only -q .`, substituting the declared floor.
   ```
   Replace with:
   ```
   From the project directory: `uv python install 3.11` then `uv run --python 3.11 python -m pytest --collect-only -q .`, substituting the declared floor.
   ```

2. File: `rules/python-packaging.md`
   Find (verbatim):
   ```
   an unexplained `<4.0` makes every future interpreter a resolver conflict for every consumer. |
   ```
   Replace with:
   ```
   an unexplained `<4.0` makes every interpreter past the cap a resolver conflict for consumers on pip-style resolvers and an install refusal for the project's own contributors; uv ignores the cap on a dependency, which hides the bound rather than removing it. |
   ```

3. File: `rules/python-packaging.md`
   Find (verbatim):
   ```
   see block PY-PKG-10 (1) and see block PY-PKG-10 (2) as two separate commands. Any hit in a publish job is the violation; empty output from both is the pass. |
   ```
   Replace with:
   ```
   see block PY-PKG-10 (1), see block PY-PKG-10 (2) and see block PY-PKG-10 (3) as three separate commands. Any hit in a publish job is the violation; empty output from all three is the pass. |
   ```

4. File: `rules/python-packaging.md`
   Anchor (verbatim, the last line of the PY-PKG-10 block):
   ```
   git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -H -n -E -e password: --
   ```
   Insert after it (new lines, before the closing fence):
   ```
   # PY-PKG-10 (3)
   git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -H -n -E -e 'UV_PUBLISH_(TOKEN|PASSWORD)' --
   ```

## Spillover round

Input: `.agents/research/refresh-2026-11/python-packaging/spillover-check.md` (2 confirmed, 2 unconfirmed, 1 already correct).

### Verdict

- No edit to `rules/python-packaging.md` or to `skills/python-packaging-reference/`. Rule bump: none. Skill bump: none.
- The two primary-confirmed facts (pytest-timeout 2.5.0 yanked; ruff 0.17.0 defaults to Python 3.11) touch no statement in the target. The rule never names pytest-timeout, and every packaged project declares `requires-python` under PY-PKG-01, so ruff's fallback default never applies to a project this rule governs.
- The httpx cap is unconfirmed for this target and belongs to python-quality's HTTP rule if anywhere. The install-versus-credential job split for PY-PKG-10 rests on trade press only, with no PyPI or GitHub advisory.
- The first round's changes (PY-PKG-01, PY-PKG-03, PY-PKG-10) stand as written; nothing here contradicts them, and each already carries a source row.

### Changed rules

None.

### New rules

None. PY-PKG-11 stays unassigned.

### Declined

1. Cap httpx below 1 in bot dependency specs. Not confirmed by a primary source for this target: the PyPI JSON fetch was truncated, and the 1.0.devN API removals rest on the originating pair's own wheel inspection, not repeated here. No text in the target concerns httpx or library upper bounds. If adopted, it belongs to python-quality's HTTP rule.
2. Hold pytest-timeout at 2.4.0 because 2.5.0 is yanked. Confirmed by https://pypi.org/pypi/pytest-timeout/json (2.5.0 uploaded 2026-08-16, yanked, reason "accidental breaking change (probably)"), but no target text is affected. Resolvers skip yanked releases unless pinned exactly, so PY-PKG-05's committed lock already covers it. The claim belongs to python-quality's testing rules.
3. PY-PKG-10 clause: the job holding `id-token: write` installs no dependencies. Secondary source only (Help Net Security, 2026-11-19, citing no advisory or CVE, and reporting OIDC token requests as attempts only). Stays an owner decision, as the originating pair also left it.
4. Ruff 0.17.0 defaults to py311 when no Python version is configured. Confirmed by https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md (0.17.0, 2026-10-09), and the target is already correct: "Where Tool Config Lives" states no default, and PY-PKG-01 requires `requires-python`, which ruff reads first.

### Sources

No change was made, so no change carries a source row. The primary sources behind the declined-but-confirmed items are listed under Declined items 2 and 4.

### Edit list (spillover round)

Empty. No file changes.
