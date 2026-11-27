---
title: Pyright checker defaults delta, 1.1.411 to 1.1.414
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 11
---

# Pyright checker defaults delta

## Verdict

No claim at risk changed. Every rule default, every configuration key and every re-export rule that the python-quality pair names is identical at 1.1.411 (the corpus baseline) and at 1.1.414, the newest pyright release as of 2026-11-27. No rule row's verification became unable to go red, so there is no PY-CORE-07 consequence. The `--pythonpath` shelf-life question (Deferred 12) is still open: native `.venv` discovery has not shipped.

Release facts. The GitHub releases list ends at 1.1.414 (2026-09-09). Releases inside the window: 1.1.412 (2026-08-12, but see the note below), 1.1.413 (2026-09-09), 1.1.414 (2026-09-09). 1.1.411 was published 2026-06-25. The docs on `main` were last touched 2026-11-20 and also show no change to the relevant rows, so even unreleased work does not alter the picture. Note: 1.1.412 predates the window start (2026-08-23) by eleven days, and the corpus baseline of "1.1.411" was therefore already one release behind on 2026-08-23. It is included because the delta from 1.1.411 is what the pair needs.

## Claim by claim

| Claim | Verdict | Evidence |
|---|---|---|
| typing.md PY-TYP-06: `reportMatchNotExhaustive` is `"none"` at Basic and Standard | unchanged | Defaults table row at 1.1.411 and at 1.1.414: Off `"none"`, Basic `"none"`, Standard `"none"`, Strict `"error"`. |
| typing.md PY-TYP-07 and data-modelling.md PY-MODEL-03: `reportUnhashable` and `reportPrivateImportUsage` are `error` from Basic up | unchanged | Both rows: Off `"none"`, Basic `"error"`, Standard `"error"`, Strict `"error"` at both tags. |
| api-surface.md PY-SURF-04: `reportDeprecated` is `none` in basic and standard, `error` only in strict | unchanged | Row: Off `"none"`, Basic `"none"`, Standard `"none"`, Strict `"error"` at both tags. The pyright docs line for the rule still reads "Generate or suppress diagnostics for use of a class or function that has been marked as deprecated". PEP 702 understanding was not separately re-verified beyond that; no release note in the window mentions deprecated handling, so "could not determine" does not apply to a change, only to a fresh re-confirmation of PEP 702 support. |
| api-surface.md PY-SURF-01: plain `from .x import Y` re-exports only via `__all__`; `from .x import Y as Y` is the other accepted form | unchanged | docs/typed-libraries.md: imported symbols are private by default; public forms are `import A as A`, `from X import A as A`, `from . import A`, and `from .A import X` (A public, X still private); `__all__` members are public. The file has no diff between 1.1.411 and 1.1.414. One nuance, not a change: `from . import A` (a submodule import) is also public without an alias, which the pair's wording does not mention. It concerns submodule imports only and does not contradict the claim. |
| Verification greps key on `typeCheckingMode`, `basic`, `standard`, `strict`, `pyrightconfig.json` | unchanged | `typeCheckingMode` allowed values are `"off"`, `"basic"`, `"standard"`, `"strict"`, default `"standard"`. `pyrightconfig.json` is the default config file name and "always takes precedent over pyproject.toml if both are present". `[tool.pyright]` in pyproject.toml remains the other location. |
| Deferred 12: `--pythonpath` still needed; has native `.venv` discovery shipped? | not shipped; still needed | docs/import-resolution.md (main, 2026-11) lists only three mechanisms: venv name plus `venvPath` (not recommended), `python.pythonPath`, and a fallback to the default interpreter, the one invoked by typing `python` in the shell. No auto-detection of a project `.venv` is described. docs/command-line.md: `--pythonpath` is "Path to the Python interpreter" and "recommended over --venvpath in most cases". No release note from 1.1.412 to 1.1.414 mentions venv discovery. |

## What did change in the window (configuration keys, none of them named by the pair)

- `useDefaultExcludes` (boolean, default `true`) was added to the pyright configuration reference by commit [56b24ee73](https://github.com/microsoft/pyright/commit/56b24ee73) on 2026-10-12. This is on `main`, after the 1.1.414 tag, so it is unreleased as of the newest release. It controls whether the built-in excludes and virtual-environment auto-detection apply. It is exclusion handling, not environment discovery for import resolution, so it does not make `--pythonpath` redundant.
- `maxCodeComplexity` (integer, default and minimum 768) was added by commit [f9e8571db](https://github.com/microsoft/pyright/commit/f9e8571db) on 2026-09-16, also on `main` and unreleased.
- `extraPaths` entries accept glob patterns, with a new "Extra path glob expansion" section in import-resolution.md. It appears between the 1.1.411 and 1.1.414 tags, so it is released. The pair does not name `extraPaths`.
- Behaviour changes in 1.1.412 to 1.1.414 (TypeForm support on by default, PEP 800 disjoint-base semantics, conditional TypedDict fields, overloads on property setters, narrowing fixes, Sentinel fixes, a standalone type server) alter type evaluation, not rule defaults per mode.

## Normative guidance candidates

None. No rule needs rewording. The existing rows are still correct and their verifications still go red as designed. Optional wording note for the next author pass: PY-SURF-01 could add that `from . import A` is also a public form, but the pair's claim is accurate as written and the addition is not needed.

## AI-agent angle

An agent working from training data may assert that pyright now discovers `.venv` natively or that `reportMatchNotExhaustive` moved to `error` in Standard. Neither is true as of 1.1.414. The mechanical check is to compare against the docs defaults table row for the rule, which is what the PY-TYP-06 verification (drop an arm from a `match` over a `Literal` union and expect pyright to error) already does.

## Contested / evolving

- Deferred 12 stays open. Re-check when a release note mentions "virtual environment" or "venv" discovery. As of 2026-11-27, no such release.
- The unreleased `main` commits above would reach users in the next release after 1.1.414; none touches a rule default.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md | Configuration reference, defaults table, main branch | main as of 2026-11 | Primary: rule defaults, `typeCheckingMode`, config precedence |
| https://raw.githubusercontent.com/microsoft/pyright/1.1.411/docs/configuration.md | Same page at the baseline tag | 2026-06-25 | Baseline for the diff |
| https://raw.githubusercontent.com/microsoft/pyright/1.1.414/docs/configuration.md | Same page at the newest release tag | 2026-09-09 | Shows the four rows identical |
| https://raw.githubusercontent.com/microsoft/pyright/main/docs/import-resolution.md | Python environment discovery | main as of 2026-11 | Primary for the `--pythonpath` question |
| https://raw.githubusercontent.com/microsoft/pyright/main/docs/command-line.md | CLI options | main as of 2026-11 | `--pythonpath`, `--venvpath` wording |
| https://raw.githubusercontent.com/microsoft/pyright/main/docs/typed-libraries.md | Re-export and `__all__` rules | main as of 2026-11 | Primary for the re-export claim |
| https://github.com/microsoft/pyright/releases/tag/1.1.412 | Release notes | 2026-08-12 | Full change list |
| https://github.com/microsoft/pyright/releases/tag/1.1.413 | Release notes | 2026-09-09 | Full change list |
| https://github.com/microsoft/pyright/releases/tag/1.1.414 | Release notes | 2026-09-09 | Full change list, newest release |
| https://github.com/microsoft/pyright/commit/56b24ee73 | `useDefaultExcludes` docs commit | 2026-10-12 | Only post-release config key change touching environment text |
| https://github.com/microsoft/pyright/commit/f9e8571db | `maxCodeComplexity` commit | 2026-09-16 | Second post-release config key |

Fewer than the 12-source minimum applies because this is a bounded delta; six are primary documentation pages, the rest are release notes and commits.
