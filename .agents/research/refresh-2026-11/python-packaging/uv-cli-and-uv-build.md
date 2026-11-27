---
title: uv CLI and uv_build delta, 2026-08-23 to 2026-11-27
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 7
---

# uv CLI and uv_build delta

## Contents

Summary, Findings (per claim at risk), Normative guidance candidates, AI-agent angle, Contested / evolving, Sources.

Scope: delta only. Covers uv releases 0.12.6 (2026-08-25) through 0.13.10 (2026-11-24). Local measurements used uv 0.13.9 (x86_64 Linux) on 2026-11-27. The corpus baseline was uv 0.12.1 measured locally, with docs referencing `uv_build>=0.12.5,<0.13` (2026-08-14).

## Summary

- All six quoted commands are unchanged in syntax and semantics. No rename and no deprecation was found for any of them.
- The uv series moved from 0.12 to 0.13 on 2026-10-09 (0.13.0). `uv init` now writes `uv_build>=0.13.9,<0.14.0` (measured with uv 0.13.9). The docs now recommend `uv_build>=0.13.10,<0.14`.
- `uv_build` still supports only pure Python code.
- `uv lock --check` still exists, still exits 0 when current. Local help text: "Check if the lockfile is up-to-date".
- uv still serves CPython 3.10 (3.10.22 installed locally on 2026-11-27, after 3.10 end of life).
- The PY-PKG-03 consequence claim ("resolver conflict for every consumer") is accurate for pip-style resolvers but not for uv consumers, which ignore upper bounds on dependencies' Requires-Python.
- pylock.toml is now installable and syncable by uv, not only exportable.

## Findings

### 1. PY-PKG-01: `uv python install 3.10` and `uv run --python 3.10 python -m pytest --collect-only -q .` — unchanged

- Both subcommands and the `--python` flag exist. The CLI reference describes `uv run --python` (`-p`) as "The Python interpreter to use for the run environment", also settable via `UV_PYTHON` ([CLI reference](https://docs.astral.sh/uv/reference/cli/)). The 0.12.x changelog has no `uv run --python` entry in the window ([0.12.x changelog](https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md)).
- Measured: `uv python install 3.10` printed "Installed Python 3.10.22" on 2026-11-27, so a 3.10 build is still served after 3.10 end of life. uv 0.12.22 (2026-10-01) added CPython 3.10.22 ([0.12.x changelog](https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md)).
- Behaviour to know: when the project declares a floor above the requested interpreter, `uv run --python 3.10` refuses: "The requested interpreter resolved to Python 3.10.22, which is incompatible with the project's Python requirement". This is a normal consequence of the rule's "substituting the declared floor" clause, not a change.
- 0.13.0 (2026-10-09) made Python 3.15 the default stable version for a bare `uv python install` ([0.13 changelog](https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md)). The rule always passes an explicit version, so it is unaffected.
- uv 0.13.5 stopped publishing Docker images based on Python 3.9 and 3.10 images (same changelog). This concerns uv's images only, not managed Python downloads.
- Status: unchanged.

### 2. PY-PKG-05: `uv lock --check` — unchanged

- Measured with uv 0.13.9: `uv lock --help` lists `--check  Check if the lockfile is up-to-date`; `uv lock --check` on a current lockfile exits 0 (output "Resolved 1 package"); `uv lock --locked` also exits 0. The failing (non-zero) path was not triggered locally.
- No rename or deprecation. Changelog entries in the window are bug fixes and strictness only: 0.12.9 (2026-09-01) gives `--locked`, `--frozen`, `--check`, `--check-exists` precedence over `UV_LOCKED`/`UV_FROZEN`; 0.12.10 (2026-09-04) lets `--check` reuse a lockfile when an absolute `exclude-newer` is moved later; 0.13.9 (2026-11-17) fixes `--locked` rejecting equivalent platform markers; 0.13.10 (2026-11-24) validates requirement-to-lock consistency more strictly and reports missing package entries ([0.12.x](https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md), [CHANGELOG](https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md)).
- Consequence: a lockfile that passed on 0.12.x can fail on 0.13.10 because the check got stricter. That is the intended violation signal, so the rule text stays valid. CI should pin or note the uv version.
- Not verified: the exit code on a stale lockfile was not measured; the corpus text "Non-zero is the violation" is consistent with the 0.13.10 changelog wording ("Explains why the lockfile must be updated when `--locked` rejects it") but the exit-code contract of `--check` on stale input was not read in the CLI reference (page truncated at 100000 of 727638 characters).
- Status: unchanged.

### 3. PY-PKG-06: `uvx deptry . ...` — unchanged

- Measured: `uvx --version` prints `uvx 0.13.9`. Changelog entries in the window only improve it (0.13.7 local-identifier CPython builds; 0.13.8 duplicate-environment avoidance). No rename ([CHANGELOG](https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md)).
- The CLI reference page fetch did not mention `uvx` in the read portion; the local binary is the evidence.
- deptry itself was not re-checked (out of this commission).
- Status: unchanged.

### 4. PY-PKG-08: `uv build --wheel` then `unzip -l dist/*.whl` — unchanged

- Measured: `uv build --wheel` printed "Successfully built dist/demo-0.1.0-py3-none-any.whl"; the default output directory is still `dist/`. `uv build --help` lists `-o, --out-dir`, `--wheel`, `--sdist`.
- The wheel contained `demo/py.typed` (checked with Python `zipfile`, because `unzip` is not installed on this machine; the rule's `unzip -l` needs `unzip` or equivalent, which is a tooling note for the rule text, not a uv change).
- 0.13.0 breaking change: `uv build --clear` now rejects output directories that contain a build source. The rule does not use `--clear`.
- 0.13.0 also changed the tar backend (`tar-codec`), so `uv_build` source distributions may have different bytes and hashes. Wheel check is unaffected.
- Status: unchanged.

### 5. PY-PKG-03: upper bound on `requires-python` — command-free, rationale needs a nuance

- uv resolution docs: for dependencies, "uv only considers lower bounds and ignores upper bounds entirely", so `>=3.8, <4` is treated as `>=3.8` ([resolution concepts](https://docs.astral.sh/uv/concepts/resolution/)). 0.13.1 (2026-10-14) made `uv pip check` and `uv pip install --strict` ignore `Requires-Python` upper bounds too, matching resolution ([CHANGELOG](https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md)).
- The project's own bound is not ignored locally. Measured: with `requires-python = ">=3.10,<4.0"` uv wrote it verbatim into `uv.lock`; with `">=3.10,<3.12"` uv refused the default interpreter 3.14.7 ("incompatible with the project's Python requirement"). The docs state the project's `requires-python` "must be a subset of the `requires-python` of all its dependencies" ([resolution concepts](https://docs.astral.sh/uv/concepts/resolution/)).
- Does the PY-PKG-03 rationale hold under uv? Partly. An upper bound still pins the project itself and every interpreter selection for contributors, and still breaks pip-style and other resolvers for consumers. For consumers using uv, an unexplained `<4.0` on a dependency is silently ignored rather than a "resolver conflict". Suggested replacement wording: "an unexplained `<4.0` makes every future interpreter a resolver conflict for consumers on pip-style resolvers and for contributors on the project itself; uv consumers ignore it for dependencies, which hides the bound but does not remove the risk."
- Date of upstream change: the ignore-upper-bounds behaviour predates the window; the `uv pip check` alignment is 2026-10-14.

### 6. PY-PKG-09: build backend declared and version-constrained — unchanged, version example needs update

- Current limitation (one sentence): "`uv_build` currently only supports pure Python code" ([build backend docs](https://docs.astral.sh/uv/concepts/build-backend/)).
- Docs recommend `requires = ["uv_build>=0.13.10,<0.14"]`, `build-backend = "uv_build"` ([build backend docs](https://docs.astral.sh/uv/concepts/build-backend/)). Measured `uv init --lib` with uv 0.13.9 writes `uv_build>=0.13.9,<0.14.0`.
- The 0.13.0 notes say no breaking config changes to the backend, but a cap of `<0.13` must be raised to allow 0.13. Any corpus example showing `uv_build>=0.12.5,<0.13` is stale and fails to build once uv 0.13 resolves. Changelog: 0.12.6 (2026-08-25) limited unbounded-`uv_build` warnings to sdist builds; 0.12.16 (2026-09-17) uses the bundled backend only when it matches active version pins; 0.13.2 accepts direct URLs in `[build-system].requires` validation.
- Status: rule unchanged; examples must move to the `<0.14` range.

### 7. Open question: pylock.toml readable or installable by uv — yes

- 0.13.2 (2026-10-19) honours PEP 751 environment restrictions "when installing or syncing from `pylock.toml`". 0.12.20 (2026-09-28) honours synthetic default groups when "installing or syncing from `pylock.toml`". 0.12.17 rejects pylock files with mismatched wheel filenames. 0.12.11 warns on empty artifact hash tables, to be rejected in a future release. The CLI reference lists `pylock.toml` as a supported format for `uv run --with-requirements`, and `uv sync --help` locally references `pylock.toml` for dependency groups ([0.12.x](https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md), [CLI reference](https://docs.astral.sh/uv/reference/cli/)).
- Could not determine: the exact exit semantics and full command form (`uv pip install -r pylock.toml` versus `uv sync --pylock`) were not measured.

## Normative guidance candidates

1. Rule: Examples of the build backend constraint use `uv_build>=0.13.10,<0.14` (or the current docs range). Rationale: 0.12-era `<0.13` caps break on uv 0.13. Verification: `grep -rn 'uv_build>=0.12' rules skills` returns nothing.
2. Rule: PY-PKG-03 rationale names the pip-style consumer and the project's own interpreter selection, and notes uv ignores dependency upper bounds. Rationale: under uv, "resolver conflict for every consumer" is overstated. Verification: read the PY-PKG-03 row for the uv caveat.
3. Rule: PY-PKG-05 notes that the lockfile check tightens across uv releases, so CI pins a uv version. Rationale: 0.13.10 added stricter lock validation. Verification: CI config has an explicit uv version.
4. Rule: PY-PKG-08 verification uses an archive lister available on the runner, for example `python -m zipfile -l dist/*.whl`. Rationale: `unzip` is absent on this machine. Verification: command runs on a clean runner.

## AI-agent angle

- Agents trained before 0.13 write `uv_build>=0.12.x,<0.13`, which fails on current uv. Check: the grep in candidate 1.
- Agents assume `--check` was replaced by `--locked`; both exist and both work. Check: `uv lock --help | grep -E -- '--check|--locked'`.
- Agents claim uv honours `<4.0` on dependencies; it ignores it. Check: the resolution docs quote above.

## Contested / evolving

- 3.10 end of life (October 2026): uv still serves 3.10.22 as of 2026-11-27; whether uv eventually drops 3.10 downloads is unknown. The 0.13.10 changelog states managed builds updated for 3.11 through 3.16.0a2, with no 3.10 mention, which hints 3.10 builds are no longer refreshed. Trend: 3.10 still installable but unmaintained.
- Empty pylock.toml hash tables will be rejected in a future uv release (warning since 0.12.11, 2026-09-08).

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md | uv 0.13.x changelog (primary) | 0.13.0 2026-10-09 to 0.13.10 2026-11-24 | breaking changes, lock/pylock/uvx entries |
| https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md | uv 0.12.x changelog (primary) | 0.12.6 2026-08-25 onward | in-window entries |
| https://docs.astral.sh/uv/concepts/build-backend/ | uv_build docs (primary) | read 2026-11-27 | pure-Python limit, version range |
| https://docs.astral.sh/uv/concepts/resolution/ | resolution docs (primary) | read 2026-11-27 | upper-bound handling |
| https://docs.astral.sh/uv/reference/cli/ | CLI reference (primary, first 100000 of 727638 chars read) | read 2026-11-27 | `--python`, pylock.toml |
| https://docs.astral.sh/uv/concepts/projects/config/ | project config docs (primary) | read 2026-11-27 | `uv init` backend, requires-python |
| https://docs.astral.sh/uv/concepts/projects/layout/ | project layout docs (primary) | read 2026-11-27 | no `--check` or requires-python content found |

Local measurements: uv 0.13.9, Linux x86_64, 2026-11-27.

Source count note: this is a delta file; the standard 12-source minimum was not met because the commission is one bounded question. Seven sources were fetched, all primary.
