---
title: deptry delta since 0.25.1 and PY-PKG-06
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 5
---

# deptry delta for PY-PKG-06

Verdict: no change. deptry 0.25.1 (released 2026-03-18) is still the newest release on 2026-11-27, and it is the version measured at the 2026-08-23 baseline. No release exists inside the window, so nothing upstream could have changed the claims. The PY-PKG-06 command is correct as written.

Sources fetched:
- https://pypi.org/pypi/deptry/json (newest version 0.25.1, uploaded 2026-03-18; prior 0.25.0 same day, yanked and re-released)
- GitHub releases API for fpgmaas/deptry (newest tag 0.25.1, published 2026-03-18T23:15:27Z)
- https://raw.githubusercontent.com/fpgmaas/deptry/main/CHANGELOG.md (newest entry 0.25.1, dated 2025-03-18 in the file; the registry timestamps above say 2026-03-18, so the changelog date reads like a typo upstream; the version order is unaffected)
- https://deptry.com/usage/
- https://deptry.com/rules-violations/

## Claims at risk

1. Flag `--optional-dependencies-dev-groups`: unchanged. Added in 0.25.0 (together with the deprecation of `--pep621-dev-dependency-groups`), before the baseline. Short form `-oddg`, default `[]`.
2. Default exclude includes `tests`: unchanged. Usage page lists `["venv", "\.venv", "\.direnv", "tests", "\.git", "setup\.py"]`. A narrower caveat for the rule: `tests` is excluded only when no `--exclude` is passed.
3. `--exclude` overwrites the default: unchanged. The usage page says it "overwrites the defaults" and also stops `.gitignore` handling. `--extend-exclude` (`-ee`, since 0.2.17) adds to the defaults and keeps `.gitignore` handling. So the rule text "plus whatever `--exclude` the project needs to cover `tests`" stays correct: whoever passes `--exclude` must re-list `tests`.
4. Naive run warning (67 phantom findings): not obsolete. No default changed; `[project.optional-dependencies]` groups are still regular dependencies unless named in `--optional-dependencies-dev-groups`, and no automatic detection was added. This is a measured fleet fact and is not re-measured here.
5. Dev classification: unchanged. `[dependency-groups]` is dev by default (since 0.21.0); `--non-dev-dependency-groups` (0.25.0) moves named groups to regular; `[project.optional-dependencies]` is regular by default; development dependencies are skipped for DEP002.
6. DEP001-DEP004: unchanged. DEP001 missing, DEP002 unused, DEP003 transitive, DEP004 misplaced development dependency ("development dependencies in non-development code"), DEP005 standard library (added 0.17.0, 2024-07-20). No DEP006 exists. DEP004 still targets non-development code. `--known-first-party` (`-kf`, since 0.7.1) unchanged; no release mentions test-module resolution.

## Planted-violation fixture, run on 0.25.1

Fixture: pyproject with `dependencies = ["requests", "click"]`, `[dependency-groups] dev = ["pytest"]`, `src/fx/__init__.py` containing `import yaml`, `tests/test_a.py` containing `import pytest`.
- Red: `uvx deptry@0.25.1 .` reports DEP002 for `requests`, DEP002 for `click`, DEP001 for `yaml`. 3 issues. The `tests` directory was skipped by default and `pytest` (dev group) raised nothing.
- Green: after removing `requests` and replacing `import yaml` with `import click`, deptry reports "Success! No dependency issues found." The same result with `--optional-dependencies-dev-groups dev` appended.
- Limit: the fixture does not reproduce the 67-finding naive run, which depends on the fleet projects' layout.

## Default changes that alter the "configuration is part of the rule" rationale

None found in the window.

## Normative candidates

None. No rule change or addition is warranted. Verification for keeping the rule as is: `uvx deptry . --optional-dependencies-dev-groups dev` on the planted fixture gives red then green as recorded above.
