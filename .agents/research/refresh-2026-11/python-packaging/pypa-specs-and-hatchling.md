---
title: PyPA specs and hatchling delta, 2026-08-23 to 2026-11-27
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 14
---

# PyPA specs and hatchling delta

Scope: a delta update of the python-packaging research dated 2026-08-23. Only upstream changes inside the window are reported. Anything not listed below is unchanged. Sources were fetched on 2026-11-27 and are listed at the end.

## Summary

- PY-PKG-07: unchanged. PEP 735 is Final with no amendment. The spec page still has no history entry after approval. Support matrix is broader but the rule text stays true.
- PY-PKG-09: unchanged. The tutorial still defaults to Hatchling with `requires = ["hatchling >= 1.26"]` and a `src/` layout. A version constraint is written.
- PY-PKG-08 and PY-PKG-09 verification commands: no change needed. No hatchling release in the window touched src-layout discovery or `py.typed` handling.
- PY-PKG-03: unchanged in substance. The install-requires-vs-requirements page had no commit in the window. Note the page covers dependency specifiers, not `requires-python` caps.
- PY-PKG-02: unchanged. No PyPI policy change on Python-version classifiers. The classifier list now reaches 3.16.

## Findings

### 1. PY-PKG-07 (dependency groups): unchanged

- PEP 735 status is Final, resolution dated 2024-10-10, no amendment listed, source page last modified 2025-01-18. The PEP defers to the PyPA spec page ([PEP 735](https://peps.python.org/pep-0735/)).
- The spec still says "Build backends MUST NOT include Dependency Group data in built distributions as package metadata." The spec page lists no history entry after the 2024 approval ([spec](https://packaging.python.org/en/latest/specifications/dependency-groups/)). The page has no commit in the window ([commit list](https://github.com/pypa/packaging.python.org/commits/main)).
- Changed (guide only, not the rule): on 2026-11-05 the writing-pyproject-toml guide gained a `[dependency-groups]` bullet, "four possible TOML tables" instead of three, described as dependencies "for development tasks such as testing and linting" ([commit 7fb23eb](https://github.com/pypa/packaging.python.org/commit/7fb23eb)). The pyproject.toml specification page also gained a dependency-groups section on 2026-09-26 ([commit 62956b0](https://github.com/pypa/packaging.python.org/commit/62956b0)). Both support the rule and can be cited as official PyPA guidance.
- Support matrix as fetched:
  - pip: `--group` since 25.1; latest 26.3 (2026-11-02) lets `--group` select groups from local pylock files, for example `--group pylock.toml:docs` ([pip news](https://pip.pypa.io/en/stable/news/)).
  - uv: `[dependency-groups]` are local-only and not published; `dev` is synced by default ([uv docs](https://docs.astral.sh/uv/concepts/projects/dependencies/)).
  - PDM: supports the table, groups stay out of PKG-INFO and METADATA ([PDM docs](https://pdm-project.org/latest/usage/dependency/)).
  - Poetry: supports `[dependency-groups]` as an alternative to `tool.poetry.group.<name>`; the page does not say since which version ([Poetry docs](https://python-poetry.org/docs/managing-dependencies/)).
  - hatch: no release note in the window mentions groups ([hatchling history](https://hatch.pypa.io/latest/history/hatchling/)). Hatch support was not independently confirmed; could not determine.
  - Hatchling the backend: no note in the window about group handling; the MUST NOT in the spec applies to it.
- Open question, both tables in one manifest: the answer is yes, with one constraint. Using both is the intended design (extras published, groups local). PDM states "The same group name MUST NOT appear in both `[dependency-groups]` and `[project.optional-dependencies]`", and the spec advises avoiding overlapping names, noting tools may error. uv and Poetry docs give no combined rule. Verdict: uniformly supported if names do not overlap; do not claim "uniformly supported" without that qualifier.

### 2. PY-PKG-09 and PY-PKG-08 (layout, backend, py.typed): unchanged

- Tutorial backend tabs, current: Hatchling `hatchling >= 1.26`, setuptools `setuptools >= 77.0.3`, Flit `flit_core >= 3.12.0, <5`, PDM `pdm-backend >= 2.4.0`, uv-build `uv_build >= 0.13, <0.14`. The tutorial uses `src/example_package_YOUR_USERNAME_HERE/` ([tutorial](https://packaging.python.org/en/latest/tutorials/packaging-projects/)). Hatchling remains the default tab and carries a lower-bound constraint.
- Changed (tutorial, not the rule): on 2026-11-12 the uv_build pin moved from a full patch version (`>= 0.13.6, <0.14.0`) to minor bounds (`>= 0.13, <0.14`) ([commit 7832853](https://github.com/pypa/packaging.python.org/commit/7832853)). The pattern the rule asks for, a declared backend with a version constraint, is reinforced.
- The src-layout discussion page had no commit in the window and recommends neither layout explicitly; it describes trade-offs. The rule's stance ("src/") is still supported by the tutorial, not by this discussion page; do not cite the discussion page as a recommendation ([page](https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/)).
- Hatchling releases in the window: 1.32.3 (2026-09-17, core metadata keeps version string as written, for example CalVer `2026.08.10`), 1.32.4 (2026-09-20, reverts a `BuildHookInterface` type parameter, CalVer fix), 1.33.0 (2026-10-28, Python 3.15 support). None touches auto-discovery of `src/<name>/__init__.py` or `py.typed` inclusion ([1.32.3](https://github.com/pypa/hatch/releases/tag/hatchling-v1.32.3), [1.32.4](https://github.com/pypa/hatch/releases/tag/hatchling-v1.32.4), [1.33.0](https://github.com/pypa/hatch/releases/tag/hatchling-v1.33.0), [history](https://hatch.pypa.io/latest/history/hatchling/)). Hatch 1.18.1 and 1.18.2 are CLI releases and also not relevant.
- Verification commands: no change. `uv build --wheel` then `unzip -l dist/*.whl` still checks `<package>/py.typed`; the PY-PKG-09 grep for a constrained `requires` still works. Do not rely on the tutorial's pin style for uv_build: either `>= 0.13, <0.14` or a patch pin passes "version-constrained".

### 3. PY-PKG-03 (requires-python upper bound): unchanged

- The install-requires-vs-requirements page had no commit in the window. It still says "it's best practice to indicate any known lower or upper bounds", gives `'A>=1,<2'` for a known break, and warns against pinning to exact versions ([page](https://packaging.python.org/en/latest/discussions/install-requires-vs-requirements/)).
- Wording note: the page is about dependency specifiers and does not say "floors not caps". The rule's own text (cap only with a comment naming the incompatibility) is the project's stance, consistent with the page but stricter. Do not attribute "floors not caps" to the PyPA page.

### 4. PY-PKG-02 (classifiers): unchanged

- pypi.org/classifiers lists `Programming Language :: Python :: 3.13` through `3.16`. No Python-version validation or deprecation. The only deprecation noted is `License ::` classifiers in favour of PEP 639 license expressions, and `Private ::` classifiers are rejected ([classifiers](https://pypi.org/classifiers/)). Note: the last 11,298 characters of the page were not read; the Python-version section is in the part read.
- Adjacent: core metadata `License` field moved to "Deprecated Fields" ([commit fca2876](https://github.com/pypa/packaging.python.org/commit/fca2876), merged 2026-11-10). Not a rule claim, but any manifest advice on licenses should use `license = "<SPDX>"` and `license-files`.
- Matrix implication: Hatchling and hatch now support Python 3.15 (hatchling 1.33.0, hatch 1.18.2), and 3.15 final is available, so a 3.15 classifier is legal and valid when 3.15 is in the CI matrix.

## Normative guidance candidates

1. Keep PY-PKG-07 as written. Optional addition: when a project uses both tables, no name appears in both. Rationale: PDM treats overlap as an error and the spec warns tools may. Verification: a script comparing `[dependency-groups]` keys to `[project.optional-dependencies]` keys; any intersection is the violation.
2. Optional new citation for PY-PKG-07: the PyPA writing-pyproject-toml guide now lists `[dependency-groups]` for "development tasks such as testing and linting". Verification: read the guide page.
3. Keep PY-PKG-08 and PY-PKG-09 unchanged, including verification commands. Rationale: no upstream behaviour change. Verification: the existing wheel listing.
4. PY-PKG-02: no change. Optional note that 3.15 and 3.16 classifiers exist. Verification: compare classifiers to `matrix.python-version`.

## AI-agent angle

- An agent may write a `dev` extra because older guides do; check the dependency-groups intersection and extras names.
- An agent may pin `uv_build` to a full patch version from old tutorial text. Mechanical check: the PY-PKG-09 grep for the `requires` line.
- An agent may claim the PyPA page says "floors not caps". Check: quote the page.

## Contested / evolving

- Whether `[dependency-groups]` and `[tool.poetry.group]` can be mixed: Poetry's docs do not say. Trend: unresolved as of 2026-11-27.
- The tutorial's backend tab set may keep changing; hatchling stays the default as of 2026-11-27.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://peps.python.org/pep-0735/ | PEP 735 | Final, last modified 2025-01-18 | status, MUST NOT clause |
| https://packaging.python.org/en/latest/specifications/dependency-groups/ | spec | no change in window | normative |
| https://packaging.python.org/en/latest/tutorials/packaging-projects/ | tutorial | 2026-11-27 | backend default |
| https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/ | src discussion | unchanged | layout |
| https://packaging.python.org/en/latest/discussions/install-requires-vs-requirements/ | bounds discussion | unchanged | PY-PKG-03 |
| https://pypi.org/classifiers/ | classifiers | 2026-11-27 | PY-PKG-02 |
| https://github.com/pypa/packaging.python.org/commits/main | commit history since 2026-08-23 (API) | 2026-11-27 | change dates |
| https://github.com/pypa/packaging.python.org/commit/7fb23eb | guide dependency-groups bullet | 2026-11-05 | PY-PKG-07 |
| https://github.com/pypa/packaging.python.org/commit/7832853 | uv_build minor bounds | 2026-11-12 | PY-PKG-09 |
| https://github.com/pypa/hatch/releases | hatchling 1.32.3, 1.32.4, 1.33.0; hatch 1.18.1, 1.18.2 | 2026-09 to 2026-10 | hatchling delta |
| https://hatch.pypa.io/latest/history/hatchling/ | hatchling changelog | 2026-11-27 | no discovery/py.typed change |
| https://pip.pypa.io/en/stable/news/ | pip changelog | 26.3 on 2026-11-02 | `--group` |
| https://docs.astral.sh/uv/concepts/projects/dependencies/ | uv docs | 2026-11-27 | support |
| https://pdm-project.org/latest/usage/dependency/ and https://python-poetry.org/docs/managing-dependencies/ | PDM and Poetry docs | 2026-11-27 | support, overlap rule |
