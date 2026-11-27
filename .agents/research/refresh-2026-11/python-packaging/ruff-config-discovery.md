---
title: Ruff configuration file discovery delta, 2026-08-23 to 2026-11-27
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 4
---

# Verdict

The "Where Tool Config Lives" section still holds. No wording change is needed.
All three claims at risk are unchanged. "Silently" is still accurate: Ruff
0.17.5 prints no warning when two config files sit in one directory.

# Claims at risk

1. "a project with both files silently resolves one and ignores the other."
   Unchanged. The fixture below shows one file wins and no warning appears. The
   docs page (https://docs.astral.sh/ruff/configuration/) still says Ruff "does
   not merge settings across configuration files" and does not mention any
   warning.

2. "`[tool.ruff]` belongs in `pyproject.toml` wherever a `pyproject.toml`
   exists ... A standalone `ruff.toml` is correct only where there is no
   `[project]` table". Unchanged. This is the repository's own policy, and the
   behaviour it relies on is the same. The docs still state "Ruff ignores any
   `pyproject.toml` files that lack a `[tool.ruff]` section", and the fixture
   confirms it: a `pyproject.toml` without `[tool.ruff]` is skipped.

3. Corpus quote ".ruff.toml ... will take precedence over the ruff.toml file,
   and the ruff.toml file will take precedence over the pyproject.toml file".
   Unchanged. The docs page still carries this sentence verbatim, and the
   fixture confirms the order.

# Checks requested

- Merging: no. Docs: "the 'closest' configuration file is used". The `extend`
  field is the only inheritance route.
- Warning when both exist: no (docs silent, fixture shows none).
- pyproject.toml without `[tool.ruff]`: unchanged, ignored.
- Hierarchical or `extend` discovery: unchanged in the docs. The only related
  changelog entries in the window are 0.16.7 (2026-09-10) "Speed up inherited
  configuration resolution", a performance change, and 0.16.1 (2026-07-30)
  "Fix indexing of excluded nested Ruff workspaces", which predates the window
  and concerns the language server. Neither changes precedence.
- 0.17.0 (2026-10-09) changed the default Python version when neither
  `target-version` nor `requires-python` is set. That affects settings values,
  not file discovery.

# Fixture (Ruff 0.17.5, `ruff check --show-settings a.py`)

| Files in directory | Settings path reported | line_length |
|---|---|---|
| pyproject.toml (111), ruff.toml (222), .ruff.toml (333) | .ruff.toml | 333 |
| pyproject.toml (111), ruff.toml (222) | ruff.toml | 222 |
| pyproject.toml with no `[tool.ruff]` | none (defaults, width 88) | default |
| same pyproject.toml plus ruff.toml (222) | ruff.toml | 222 |

No `warning:` line appeared in any run.

# Normative candidates

None. No rule to change or add.

# Limits

The changelog fetch covered 0.16.x (through 0.16.10, 2026-10-01) in full and
only the 0.17.x entries returned by the changelog summary. Entries for 0.17.1
to 0.17.5 were not read line by line; the live fixture and the current docs
page cover that gap for behaviour.

# Sources

- https://docs.astral.sh/ruff/configuration/
- https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md
- https://raw.githubusercontent.com/astral-sh/ruff/main/changelogs/0.16.x.md
- https://github.com/astral-sh/ruff/tree/main/changelogs
- Local run: ruff 0.17.5
